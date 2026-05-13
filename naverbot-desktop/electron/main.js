// 메이킷자동화 Electron - main process
// - BrowserWindow 생성
// - 설정 저장/로드
// - Python runner.py 서브프로세스 실행
// - Loopback OAuth callback handling

const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const os = require("os");
const http = require("http");
const urlLib = require("url");

// EPIPE 에러 방지 (ffmpeg 프로세스 종료 후 stderr 쓰기 시도)
process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE" || err.message?.includes("EPIPE")) return;
  console.error("[uncaughtException]", err);
});

const IS_LOCAL_DEV_INSTANCE = process.env.NAVERBOT_LOCAL_DEV === "1";
const UPDATE_CHECK_URL = process.env.NAVERBOT_UPDATE_CHECK_URL || "https://snsmakeit.com/api/naverbot/update";
const HOT_MANIFEST_URL = "https://snsmakeit.com/api/naverbot/hot-manifest";
const APPDATA_ROOT = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const CONFIG_DIR_NAME = IS_LOCAL_DEV_INSTANCE ? "NaverBotSaaS-LocalDev" : "NaverBotSaaS";
const PROD_CONFIG_DIR = path.join(APPDATA_ROOT, "NaverBotSaaS");
const PROD_CONFIG_PATH = path.join(PROD_CONFIG_DIR, "config.json");

if (IS_LOCAL_DEV_INSTANCE) {
  app.setName("SNS메이킷 Local");
}

// ── Single instance ──
if (!IS_LOCAL_DEV_INSTANCE) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    process.exit(0);
  }
}

// ── 설정 파일 경로 (%APPDATA%\NaverBotSaaS\config.json) ──
const CONFIG_DIR = path.join(
  APPDATA_ROOT,
  CONFIG_DIR_NAME
);
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadConfig() {
  try {
    ensureConfigDir();
    let cfg = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) : null;

    if (IS_LOCAL_DEV_INSTANCE) {
      cfg = hydrateLocalDevConfig(cfg || {});
    }

    return cfg;
  } catch (e) {
    console.error("config load:", e);
    return null;
  }
}

function hydrateLocalDevConfig(cfg) {
  try {
    if (!fs.existsSync(PROD_CONFIG_PATH)) return cfg;
    const prod = JSON.parse(fs.readFileSync(PROD_CONFIG_PATH, "utf8"));
    const authKeys = [
      "makeit_access_token",
      "makeit_refresh_token",
      "makeit_email",
      "makeit_uid",
      "makeit_token_expires",
      "naver_id",
      "naver_accounts",
    ];
    let changed = false;
    for (const key of authKeys) {
      if ((cfg[key] === undefined || cfg[key] === "" || cfg[key] === null) && prod[key] !== undefined) {
        cfg[key] = prod[key];
        changed = true;
      }
    }
    if (changed) saveConfig(cfg);
  } catch (e) {
    console.error("local dev config hydrate:", e);
  }
  return cfg;
}

function saveConfig(cfg) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

// ── Python 경로 ──
function getPythonRuntimeDir() {
  // 패키징 여부와 무관하게 우선순위:
  // 1) packaged: resources/python-runtime/
  // 2) dev: client/electron/python-runtime/ (로컬 번들 테스트)
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, "python-runtime");
    if (fs.existsSync(p)) return p;
  }
  const dev = path.join(__dirname, "python-runtime");
  if (fs.existsSync(dev)) return dev;
  return null;
}

function getPythonPath() {
  const runtime = getPythonRuntimeDir();
  if (runtime) {
    const winPath = path.join(runtime, "python.exe");
    if (fs.existsSync(winPath)) return winPath;
    const macPath = path.join(runtime, "bin", "python3");
    if (fs.existsSync(macPath)) return macPath;
  }
  // 시스템 폴백: Mac은 python3
  return process.platform === "darwin" ? "python3" : "python";
}

function getPlaywrightBrowsersPath() {
  const runtime = getPythonRuntimeDir();
  if (runtime) return path.join(runtime, ".playwright-browsers");
  return null;
}

function getRunnerPath() {
  if (app.isPackaged) {
    const bundled = path.join(process.resourcesPath, "python", "runner.py");
    if (fs.existsSync(bundled)) return bundled;
  }
  return path.join(__dirname, "..", "python", "runner.py");
}

function getPythonEnv() {
  const env = { ...process.env, PYTHONIOENCODING: "utf-8" };
  env.NAVERBOT_CONFIG_DIR = CONFIG_DIR;
  if (IS_LOCAL_DEV_INSTANCE) env.NAVERBOT_LOCAL_DEV = "1";
  const browsers = getPlaywrightBrowsersPath();
  if (browsers) env.PLAYWRIGHT_BROWSERS_PATH = browsers;
  // Python embeddable 호환: runner.py 폴더를 sys.path에 추가
  const runnerDir = path.dirname(getRunnerPath());
  env.PYTHONPATH = runnerDir;
  env.PYTHONDONTWRITEBYTECODE = "1";
  return env;
}

// ── Playwright 자동 설치 ──
function hasHeadfulChromium() {
  // .playwright-browsers 안에 headful chromium(chromium-XXXX, chromium_headless_shell 제외)이 있는지 확인
  const browsersPath = getPlaywrightBrowsersPath();
  if (!browsersPath) return false;
  try {
    const entries = fs.readdirSync(browsersPath);
    // chromium-XXXX (headful) 폴더가 있어야 함 (chromium_headless_shell은 다른 것)
    return entries.some(e => /^chromium-\d+$/.test(e));
  } catch { return false; }
}

async function ensurePlaywright() {
  const pythonPath = getPythonPath();
  const env = getPythonEnv();

  // 1. 번들 headful Chromium이 이미 있으면 스킵
  if (hasHeadfulChromium()) {
    console.log("[Playwright] headful Chromium 확인됨 → 스킵");
    return;
  }

  // 2. 시스템 Chrome/Edge 확인 — 있으면 일단 동작 가능하지만, 안정성을 위해 번들 설치도 시도
  const systemChrome = [
    (process.env.PROGRAMFILES || "") + "\\Google\\Chrome\\Application\\chrome.exe",
    (process.env["PROGRAMFILES(X86)"] || "") + "\\Google\\Chrome\\Application\\chrome.exe",
    os.homedir() + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const systemEdge = [
    (process.env.PROGRAMFILES || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
    (process.env["PROGRAMFILES(X86)"] || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const hasSystemBrowser = [...systemChrome, ...systemEdge].some(p => p && fs.existsSync(p));

  // 시스템 브라우저가 있어도 번들 Chromium 설치를 시도 (안정성 보장)
  console.log(`[Playwright] 시스템 브라우저: ${hasSystemBrowser ? "있음" : "없음"}, Chromium 설치 시작`);

  return new Promise((resolve) => {
    const installWin = new BrowserWindow({
      width: 480, height: 220,
      resizable: false, frame: false, alwaysOnTop: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    installWin.loadURL(`data:text/html;charset=utf-8,
      <html><body style="font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;">
        <h3 style="margin:0 0 12px;font-size:16px;color:#111;font-weight:700;">초기 설정 중...</h3>
        <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
          자동화에 필요한 브라우저를 설치하고 있습니다.<br>
          처음 한 번만 실행되며, 1~3분 소요됩니다.
        </p>
        <div style="margin-top:20px;width:240px;height:4px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
          <div style="width:100%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);animation:loading 1.5s ease-in-out infinite;"></div>
        </div>
        <p id="status" style="margin-top:14px;font-size:11px;color:#9ca3af;">Chromium 다운로드 중...</p>
        <style>@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}</style>
      </body></html>`);

    let output = "";
    const proc = spawn(pythonPath, ["-m", "playwright", "install", "chromium"], { env });
    proc.stdout.on("data", (d) => { output += d.toString(); });
    proc.stderr.on("data", (d) => { output += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log("[Playwright] Chromium 설치 완료");
      } else {
        console.error("[Playwright] 설치 실패 (code " + code + "):", output);
        // 실패해도 시스템 브라우저가 있으면 계속 진행
        if (!hasSystemBrowser) {
          dialog.showErrorBox(
            "브라우저 설치 실패",
            "자동화에 필요한 브라우저 설치에 실패했습니다.\n\nGoogle Chrome을 설치한 후 다시 시도해주세요.\nhttps://www.google.com/chrome/"
          );
        }
      }
      try { installWin.close(); } catch {}
      resolve();
    });
    proc.on("error", (err) => {
      console.error("[Playwright] spawn 에러:", err);
      try { installWin.close(); } catch {}
      if (!hasSystemBrowser) {
        dialog.showErrorBox(
          "초기 설정 실패",
          "Python 런타임을 찾을 수 없습니다.\n앱을 재설치해주세요."
        );
      }
      resolve();
    });
  });
}

// ── Hot Update (CSS/JS 서버 핫로드) ──
const HOT_CACHE_DIR = path.join(CONFIG_DIR, "renderer-cache");

function getLocalRendererVersion() {
  try {
    const vf = path.join(HOT_CACHE_DIR, "version.json");
    if (fs.existsSync(vf)) return JSON.parse(fs.readFileSync(vf, "utf8")).version || "0";
  } catch {}
  return "0";
}

async function syncHotUpdate() {
  try {
    const resp = await fetch(HOT_MANIFEST_URL, { cache: "no-store" });
    if (!resp.ok) return { updated: false };
    const manifest = await resp.json();
    if (!manifest.version) return { updated: false };

    const localVer = getLocalRendererVersion();
    if (manifest.version === localVer) return { updated: false, version: localVer };

    // 새 버전 발견 — 파일 다운로드
    if (!fs.existsSync(HOT_CACHE_DIR)) fs.mkdirSync(HOT_CACHE_DIR, { recursive: true });

    for (const file of manifest.files || []) {
      const fileResp = await fetch(file.url);
      if (!fileResp.ok) continue;
      const content = await fileResp.text();
      fs.writeFileSync(path.join(HOT_CACHE_DIR, file.name), content, "utf8");
    }

    fs.writeFileSync(
      path.join(HOT_CACHE_DIR, "version.json"),
      JSON.stringify({ version: manifest.version, updated_at: new Date().toISOString() }),
      "utf8"
    );

    return { updated: true, version: manifest.version, fromVersion: localVer };
  } catch (e) {
    console.error("[HotUpdate] sync error:", e.message);
    return { updated: false, error: e.message };
  }
}

// 렌더러 파일 요청을 캐시된 핫 업데이트 파일로 리다이렉트
function setupHotCacheInterceptor(win) {
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (!details.url.startsWith("file://")) return callback({});
    const decoded = decodeURIComponent(details.url.replace(/\?.*$/, ""));
    const fileName = path.basename(decoded);
    if (["style.css", "app.js", "cardnews.js"].includes(fileName)) {
      const cached = path.join(HOT_CACHE_DIR, fileName);
      if (fs.existsSync(cached)) {
        const redirectURL = "file:///" + cached.replace(/\\/g, "/");
        console.log(`[HotUpdate] serving cached: ${fileName}`);
        return callback({ redirectURL });
      }
    }
    callback({});
  });
}

// ── electron-updater (exe 자동 교체) ──
let autoUpdater = null;
try {
  autoUpdater = require("electron-updater").autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: console.log, warn: console.warn, error: console.error };
} catch (e) {
  console.log("[AutoUpdater] electron-updater 미설치, 수동 업데이트만 사용:", e.message);
}

function setupAutoUpdater() {
  if (!autoUpdater) return;

  autoUpdater.on("update-available", (info) => {
    // 다운그레이드 방지: 서버 버전이 현재보다 낮으면 무시
    const current = app.getVersion();
    const remote = info.version;
    const cmp = (a, b) => { const pa = a.split(".").map(Number), pb = b.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((pa[i]||0) !== (pb[i]||0)) return (pa[i]||0) - (pb[i]||0); } return 0; };
    if (cmp(remote, current) <= 0) {
      console.log(`[AutoUpdater] 다운그레이드 방지: 서버 ${remote} <= 현재 ${current}, 무시`);
      return;
    }
    console.log("[AutoUpdater] 새 버전:", info.version);
    if (mainWindow) mainWindow.webContents.send("exe-update:available", {
      version: info.version,
      releaseNotes: info.releaseNotes || "",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    if (mainWindow) mainWindow.webContents.send("exe-update:progress", {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[AutoUpdater] 다운로드 완료:", info.version);
    if (mainWindow) mainWindow.webContents.send("exe-update:downloaded", {
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] 오류:", err.message);
  });
}

// ── Window ──
let mainWindow = null;

function createWindow() {
  const { screen } = require("electron");
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const winW = Math.min(Math.round(screenW * 0.92), screenW);
  const winH = Math.min(Math.round(screenH * 0.92), screenH);
  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "SNS메이킷",
    backgroundColor: "#f9fafb",
  });

  // 핫 업데이트 캐시 인터셉터 (loadFile 전에 설정)
  setupHotCacheInterceptor(mainWindow);

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // snsmakeit.com iframe 로드 시 X-Frame-Options 제거
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["https://snsmakeit.com/*"] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers["X-Frame-Options"];
      delete headers["x-frame-options"];
      callback({ responseHeaders: headers });
    }
  );
}

app.whenReady().then(async () => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // electron-updater 설정
  setupAutoUpdater();

  // Playwright 브라우저 자동 설치 (없을 때만)
  await ensurePlaywright();

  // 버전 체크 — 구버전이면 업데이트 강제
  try {
    const pkg = require("./package.json");
    const ver = pkg.version || "0.0.0";
    const res = await fetch(`https://snsmakeit.com/api/naverbot/version-check?v=${ver}`);
    const data = await res.json();
    if (data && !data.ok) {
      const { dialog, shell } = require("electron");
      const r = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "업데이트 필요",
        message: `현재 버전: v${ver}\n최소 요구 버전: v${data.min_version}\n\n${data.message}`,
        buttons: ["업데이트 페이지 열기", "종료"],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (r.response === 0) {
        shell.openExternal(data.download_url || "https://snsmakeit.com/programs");
      }
      app.quit();
    }
  } catch (e) {
    // 네트워크 오류 시 그냥 통과 (오프라인 허용)
  }
});

app.on("window-all-closed", () => {
  // 종료 시 스케줄 타이머 + 실행 중 프로세스 정리
  scheduleTimers.forEach(t => clearTimeout(t));
  scheduleTimers = [];
  // 영상 렌더링 프로세스 정리
  killVideoProcess();
  if (currentProcess) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(currentProcess.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        currentProcess.kill("SIGTERM");
      }
    } catch {}
    currentProcess = null;
  }
  closeAuthHttpServer();
  if (process.platform !== "darwin") app.quit();
});

// ── IPC: 스케줄 (인앱 타이머 기반) ──
let scheduleTimers = [];

ipcMain.handle("schedule:create", (_, times) => {
  // 기존 스케줄 정리
  scheduleTimers.forEach(t => clearTimeout(t));
  scheduleTimers = [];

  if (!Array.isArray(times) || times.length === 0) return { ok: false, error: "시간 없음" };

  const now = new Date();
  for (const timeStr of times) {
    const [h, m] = String(timeStr).split(":").map(Number);
    if (isNaN(h) || isNaN(m)) continue;

    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // 이미 지난 시간이면 내일

    const delay = target.getTime() - now.getTime();
    const tid = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("schedule:trigger", timeStr);
      }
    }, delay);
    scheduleTimers.push(tid);
  }

  console.log(`[Schedule] ${times.length}개 스케줄 등록: ${times.join(", ")}`);
  return { ok: true, count: times.length };
});

ipcMain.handle("schedule:clear", () => {
  const count = scheduleTimers.length;
  scheduleTimers.forEach(t => clearTimeout(t));
  scheduleTimers = [];
  console.log(`[Schedule] ${count}개 스케줄 해제`);
  return { ok: true, cleared: count };
});

// ── IPC: 체험 횟수 (서버 기준) ──
ipcMain.handle("trial:get", async () => {
  const cfg = loadConfig();
  if (!cfg?.makeit_access_token) return 0;
  try {
    const resp = await fetch("https://snsmakeit.com/api/naverbot?action=trial", {
      headers: { Authorization: `Bearer ${cfg.makeit_access_token}` },
      cache: "no-store",
    });
    const data = await resp.json();
    return Number(data.used || 0);
  } catch {
    return 0;
  }
});
ipcMain.handle("trial:set", async () => {
  return { ok: false, error: "trial usage is server-managed" };
});

// ── IPC: 설정 ──
ipcMain.handle("config:load", () => loadConfig());
ipcMain.handle("config:save", (_, cfg) => {
  saveConfig(cfg);
  return { ok: true };
});

function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("app:checkUpdate", async () => {
  try {
    const resp = await fetch(UPDATE_CHECK_URL, { cache: "no-store" });
    const data = await resp.json();
    if (!resp.ok || !data || data.ok === false) {
      return { ok: false, error: data && data.error ? data.error : `업데이트 확인 실패 ${resp.status}` };
    }
    const current = app.getVersion();
    const latest = String(data.version || "");
    const hasUpdate = latest && compareVersions(latest, current) > 0;
    return {
      ok: true,
      current_version: current,
      latest_version: latest,
      has_update: hasUpdate,
      download_url: data.download_url || "https://snsmakeit.com/programs",
      notes: data.notes || "",
      required: !!data.required,
    };
  } catch (e) {
    return { ok: false, error: e.message || "업데이트 확인 실패" };
  }
});

// ── IPC: 비밀번호 저장 (keyring via python subprocess) ──
// service 파라미터로 네이버/메이킷 계정 구분
ipcMain.handle("password:save", async (_, { username, password, service }) => {
  const svc = service || "NaverBotSaaS";
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), ["-c", `
import keyring, sys, json
data = json.loads(sys.stdin.read())
keyring.set_password(data["service"], data["username"], data["password"])
print("ok")
`], { env: getPythonEnv() });
    py.stdin.write(JSON.stringify({ service: svc, username, password }));
    py.stdin.end();
    let out = "";
    let err = "";
    py.stdout.on("data", (d) => (out += d));
    py.stderr.on("data", (d) => (err += d));
    py.on("close", (code) => {
      resolve({ ok: code === 0 && out.trim() === "ok", error: err });
    });
  });
});

function getNaverProfilePath(naverId) {
  const id = String(naverId || "").trim();
  if (!id) throw new Error("네이버 ID 없음");

  const profileRoot = path.resolve(path.join(APPDATA_ROOT, "NaverBotSaaS", "profiles"));
  const profilePath = path.resolve(path.join(profileRoot, id));
  if (profilePath === profileRoot || !profilePath.startsWith(profileRoot + path.sep)) {
    throw new Error("잘못된 네이버 ID 경로");
  }
  return profilePath;
}

function deleteStoredPassword(service, username) {
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), ["-c",
      `import keyring, sys
try:
    keyring.delete_password(sys.argv[1], sys.argv[2])
except Exception:
    pass
print('ok')`,
      service, username,
    ], { env: getPythonEnv() });
    let out = "";
    let err = "";
    py.stdout.on("data", (d) => (out += d));
    py.stderr.on("data", (d) => (err += d));
    py.on("close", (code) => {
      resolve({ ok: code === 0 && out.trim() === "ok", error: err });
    });
    py.on("error", (e) => resolve({ ok: false, error: e.message }));
  });
}

// ── IPC: 네이버 저장 로그인 초기화 ──
ipcMain.handle("naver:resetLogin", async (_, naverId) => {
  const id = String(naverId || "").trim();
  if (!id) return { ok: false, error: "네이버 ID 없음" };

  try {
    const profilePath = getNaverProfilePath(id);
    const hadProfile = fs.existsSync(profilePath);
    fs.rmSync(profilePath, { recursive: true, force: true });

    const pw = await deleteStoredPassword("NaverBotSaaS", id);
    return {
      ok: true,
      removed_profile: hadProfile,
      password_deleted: pw.ok,
      password_error: pw.ok ? "" : pw.error,
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

// ── IPC: 키워드 글감 분석 (runner.py analyze subprocess) ──
ipcMain.handle("keyword:analyze", async (_, keyword) => {
  if (!keyword) return { ok: false, error: "키워드 없음" };
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), [getRunnerPath(), "analyze", keyword], {
      cwd: path.dirname(getRunnerPath()),
      env: getPythonEnv(),
    });
    const timeout = setTimeout(() => { py.kill(); resolve({ ok: false, error: "분석 타임아웃 (60초)" }); }, 60000);
    const chunks = [];
    py.stdout.on("data", (d) => chunks.push(d.toString("utf-8")));
    py.stderr.on("data", (d) => {
      if (mainWindow) mainWindow.webContents.send("bot:log", `[분석] ${d.toString("utf-8")}`);
    });
    py.on("close", (code) => {
      clearTimeout(timeout);
      let parsed = null;
      try {
        const lines = chunks.join("").trim().split("\n").filter(Boolean);
        parsed = JSON.parse(lines[lines.length - 1]);
      } catch {}
      resolve({ ok: !!parsed, result: parsed, error: parsed ? "" : "분석 결과 파싱 실패" });
    });
    py.on("error", (e) => { clearTimeout(timeout); resolve({ ok: false, error: e.message }); });
  });
});

// ── IPC: 네이버 세션 저장 (first_login.py subprocess) ──
ipcMain.handle("naver:firstLogin", async (_, naverId) => {
  if (!naverId) return { ok: false, error: "네이버 ID 없음" };
  const firstLoginPath = app.isPackaged
    ? path.join(process.resourcesPath, "python", "first_login.py")
    : path.join(__dirname, "..", "python", "first_login.py");
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), [firstLoginPath, naverId], {
      cwd: path.dirname(firstLoginPath),
      env: getPythonEnv(),
    });
    let out = "";
    py.stdout.on("data", (d) => {
      const text = d.toString("utf-8");
      out += text;
      if (mainWindow) mainWindow.webContents.send("bot:log", text);
    });
    py.stderr.on("data", (d) => {
      if (mainWindow) mainWindow.webContents.send("bot:log", `[ERR] ${d.toString("utf-8")}`);
    });
    py.on("close", (code) => {
      const success = out.includes("세션 저장 완료");
      resolve({ ok: success, error: success ? "" : "로그인 미완료 또는 타임아웃" });
    });
    py.on("error", (e) => resolve({ ok: false, error: e.message }));
  });
});

// ── IPC: 메이킷 계정 검증 (runner.py verify 호출) ──
// ── 토큰 갱신 (Supabase refresh_token 사용) ──
ipcMain.handle("auth:refreshToken", async (_, refreshToken) => {
  if (!refreshToken) return { ok: false, error: "refresh_token 없음" };
  try {
    const supabaseUrl = "https://snsmakeit.com";
    const resp = await fetch(`${supabaseUrl}/api/naverbot?action=token-refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!resp.ok) return { ok: false, error: `서버 응답 ${resp.status}` };
    const data = await resp.json();
    if (data.access_token) {
      // config에 새 토큰 저장
      const cfg = loadConfig() || {};
      cfg.makeit_access_token = data.access_token;
      if (data.refresh_token) cfg.makeit_refresh_token = data.refresh_token;
      saveConfig(cfg);
      return { ok: true, access_token: data.access_token, refresh_token: data.refresh_token || "" };
    }
    return { ok: false, error: data.error || "갱신 실패" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("account:verify", async () => {
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), [getRunnerPath(), "verify"], {
      cwd: path.dirname(getRunnerPath()),
      env: getPythonEnv(),
    });
    const chunks = [];
    py.stdout.on("data", (d) => chunks.push(d.toString("utf-8")));
    py.on("close", (code) => {
      let parsed = null;
      try {
        const lines = chunks.join("").trim().split("\n").filter(Boolean);
        parsed = JSON.parse(lines[lines.length - 1]);
      } catch {}
      resolve({ ok: code === 0, result: parsed });
    });
    py.on("error", (e) => resolve({ ok: false, error: e.message }));
  });
});

// ── IPC: 봇 실행 (runner.py subprocess) ──
let currentProcess = null;

ipcMain.handle("bot:runOnce", async (event, overrides = {}) => {
  if (currentProcess) {
    return { ok: false, error: "이미 실행 중입니다" };
  }

  // config 병합 (UI에서 override 받을 수 있음)
  const cfg = loadConfig() || {};
  const merged = { ...cfg, ...overrides };
  saveConfig(merged); // 최신 설정 저장

  const pythonPath = getPythonPath();
  const runnerPath = getRunnerPath();

  return new Promise((resolve) => {
    const py = spawn(pythonPath, [runnerPath, "run-once"], {
      cwd: path.dirname(runnerPath),
      env: getPythonEnv(),
    });
    currentProcess = py;

    // 타임아웃: 글 수 × 10분 (생성+발행+대기 포함), 최소 30분
    const postCount = (merged.autopilot && merged.autopilot.posts_per_day) || 3;
    const timeoutMs = Math.max(1800000, postCount * 600000); // 글당 10분, 최소 30분
    const timeout = setTimeout(() => {
      if (currentProcess === py) {
        try {
          if (process.platform === "win32") {
            spawn("taskkill", ["/pid", String(py.pid), "/T", "/F"], { stdio: "ignore" });
          } else {
            py.kill("SIGTERM");
          }
        } catch {}
        currentProcess = null;
        resolve({ ok: false, error: "타임아웃" });
      }
    }, timeoutMs);

    const chunks = [];
    py.stdout.on("data", (d) => {
      const text = d.toString("utf-8");
      chunks.push(text);
      if (mainWindow) mainWindow.webContents.send("bot:log", text);
    });
    py.stderr.on("data", (d) => {
      const text = d.toString("utf-8");
      if (mainWindow) mainWindow.webContents.send("bot:log", `[ERR] ${text}`);
    });

    py.on("close", (code) => {
      clearTimeout(timeout);
      currentProcess = null;
      const fullOut = chunks.join("");
      let parsed = null;
      try {
        // stdout 마지막 JSON 라인 파싱
        const lines = fullOut.trim().split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            parsed = JSON.parse(lines[i]);
            break;
          } catch {}
        }
      } catch {}
      resolve({
        ok: code === 0,
        exit_code: code,
        result: parsed,
        raw: fullOut,
      });
    });

    py.on("error", (e) => {
      currentProcess = null;
      resolve({ ok: false, error: `Python 실행 실패: ${e.message}` });
    });
  });
});

ipcMain.handle("bot:stop", () => {
  if (currentProcess) {
    try {
      // Windows에서 프로세스 트리 전체 종료 (Chromium 자식 프로세스 포함)
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(currentProcess.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        currentProcess.kill("SIGTERM");
      }
    } catch (e) {
      console.error("[bot:stop] kill error:", e.message);
    }
    currentProcess = null;
    return { ok: true };
  }
  return { ok: false, error: "실행 중인 봇 없음" };
});

// 봇 프로세스 상태 확인 (렌더러에서 동기화용)
ipcMain.handle("bot:isRunning", () => !!currentProcess);

// ── IPC: 참고 글 분석 (Playwright) ──
ipcMain.handle("bot:analyze-ref", (_, url) => {
  return new Promise((resolve) => {
    const py = spawn(getPythonPath(), [getRunnerPath(), "analyze-ref", url], {
      env: getPythonEnv(),
    });

    const timeout = setTimeout(() => {
      py.kill();
      resolve({ ok: false, error: "분석 타임아웃 (60초)" });
    }, 60000);

    const chunks = [];
    py.stdout.on("data", (d) => {
      const text = d.toString("utf-8");
      chunks.push(text);
      if (mainWindow) mainWindow.webContents.send("bot:log", text);
    });
    py.stderr.on("data", (d) => {
      if (mainWindow) mainWindow.webContents.send("bot:log", `[ERR] ${d.toString("utf-8")}`);
    });
    py.on("close", () => {
      clearTimeout(timeout);
      const fullOut = chunks.join("");
      try {
        // 마지막 JSON 라인 파싱
        const lines = fullOut.trim().split("\n");
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.status === "ok") {
              resolve({ ok: true, analysis: parsed.analysis });
              return;
            }
          } catch {}
        }
      } catch {}
      resolve({ ok: false, error: "분석 결과 파싱 실패" });
    });
    py.on("error", (e) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: e.message });
    });
  });
});

// ── IPC: 핫 업데이트 (CSS/JS) ──
ipcMain.handle("app:hotUpdateSync", () => syncHotUpdate());
ipcMain.handle("app:getRendererVersion", () => getLocalRendererVersion());

// ── IPC: exe 자동 업데이트 (electron-updater) ──
ipcMain.handle("app:checkExeUpdate", async () => {
  if (!autoUpdater) return { available: false, reason: "electron-updater 미설치" };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { available: !!result?.updateInfo, version: result?.updateInfo?.version };
  } catch (e) {
    return { available: false, error: e.message };
  }
});

ipcMain.handle("app:downloadExeUpdate", () => {
  if (!autoUpdater) return { ok: false };
  autoUpdater.downloadUpdate();
  return { ok: true };
});

ipcMain.handle("app:installExeUpdate", () => {
  if (!autoUpdater) return { ok: false };
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
});

// ── IPC: 파일 다운로드 ──
ipcMain.handle("media:download", async (_, url, filename) => {
  if (!url || !mainWindow) return { ok: false, error: "invalid" };
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename || "download",
      filters: [
        { name: "이미지", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        { name: "영상", extensions: ["mp4", "webm", "mov"] },
        { name: "모든 파일", extensions: ["*"] }
      ]
    });
    if (canceled || !filePath) return { ok: false, error: "canceled" };
    const https = require("https");
    const http = require("http");
    const fs = require("fs");
    const get = url.startsWith("https") ? https.get : http.get;
    await new Promise((resolve, reject) => {
      get(url, { headers: { "User-Agent": "SNSMakeit/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const get2 = res.headers.location.startsWith("https") ? https.get : http.get;
          get2(res.headers.location, (res2) => {
            const ws = fs.createWriteStream(filePath);
            res2.pipe(ws);
            ws.on("finish", resolve);
            ws.on("error", reject);
          }).on("error", reject);
        } else {
          const ws = fs.createWriteStream(filePath);
          res.pipe(ws);
          ws.on("finish", resolve);
          ws.on("error", reject);
        }
      }).on("error", reject);
    });
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── IPC: 미디어 라이브러리 로컬 파일 관리 ──
ipcMain.handle("media:selectFiles", async () => {
  if (!mainWindow) return [];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "미디어", extensions: ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov", "svg"] }
    ]
  });
  if (canceled) return [];
  return filePaths;
});

ipcMain.handle("media:getLocalFiles", async () => {
  const fs = require("fs");
  const mediaDir = path.join(app.getPath("userData"), "media-library");
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  const files = fs.readdirSync(mediaDir).filter(f => /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|svg)$/i.test(f));
  return files.map(f => ({ name: f, path: path.join(mediaDir, f), url: "file:///" + path.join(mediaDir, f).replace(/\\/g, "/") }));
});

ipcMain.handle("media:importFiles", async (_, filePaths) => {
  const fs = require("fs");
  const mediaDir = path.join(app.getPath("userData"), "media-library");
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
  const imported = [];
  for (const src of filePaths) {
    const name = path.basename(src);
    const dest = path.join(mediaDir, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    imported.push({ name, path: dest, url: "file:///" + dest.replace(/\\/g, "/") });
  }
  return imported;
});

ipcMain.handle("media:deleteFile", async (_, filePath) => {
  const fs = require("fs");
  try { fs.unlinkSync(filePath); return { ok: true }; } catch (e) { return { ok: false }; }
});


// ── IPC: 로컬 파일 → data URL 변환 (미리보기용) ──
ipcMain.handle("media:fileToDataUrl", (_, filePath) => {
  const fs = require("fs");
  try {
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm" };
    const mime = mimeMap[ext] || "application/octet-stream";
    const data = fs.readFileSync(filePath);
    return "data:" + mime + ";base64," + data.toString("base64");
  } catch (e) { return null; }
});

// ── IPC: 로컬 이미지 썸네일 (작은 사이즈, 빠른 로드) ──
ipcMain.handle("media:getThumbnail", (_, filePath) => {
  const fs = require("fs");
  try {
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    if ([".mp4", ".webm"].includes(ext)) return null; // 영상은 썸네일 불가
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
    const mime = mimeMap[ext] || "image/png";
    const data = fs.readFileSync(filePath);
    return "data:" + mime + ";base64," + data.toString("base64");
  } catch (e) { return null; }
});


// ── IPC: Playwright URL 크롤링 (이미지+텍스트 추출) ──
ipcMain.handle("url:crawl", async (_, url) => {
  if (!url) return { ok: false, error: "URL 필요" };
  const pythonPath = getPythonPath();
  const crawlScript = path.join(__dirname, "python", "crawl_url.py");
  // crawl_url.py가 없으면 기본 폴더도 확인
  const scriptPath = fs.existsSync(crawlScript) ? crawlScript : path.join(__dirname, "..", "python", "crawl_url.py");
  if (!fs.existsSync(scriptPath)) return { ok: false, error: "crawl_url.py를 찾을 수 없습니다" };

  const env = getPythonEnv();
  return new Promise((resolve) => {
    const proc = spawn(pythonPath, [scriptPath, url], { env, windowsHide: true, timeout: 30000 });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => { stdout += d.toString(); });
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        console.error("[url:crawl] parse error:", stdout.slice(0, 200), stderr.slice(0, 200));
        resolve({ ok: false, error: "크롤링 실패: " + (stderr.slice(0, 100) || "응답 파싱 오류") });
      }
    });
    proc.on("error", (e) => resolve({ ok: false, error: e.message }));
  });
});

// ── IPC: 폴더 선택 다이얼로그 ──
ipcMain.handle("dialog:selectFolder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "폴더 선택"
  });
  return canceled ? null : filePaths[0] || null;
});

// ── IPC: 외부 링크 (URL 검증 포함) ──
ipcMain.handle("shell:openExternal", (_, url) => {
  if (!url || typeof url !== "string") return;
  // file:// 경로면 shell.openPath 사용 (폴더/파일 열기)
  if (url.startsWith("file:///")) {
    const localPath = decodeURIComponent(url.replace("file:///", "")).replace(/\//g, path.sep);
    return shell.openPath(localPath);
  }
  // http/https만 허용 (javascript:, smb:, ftp: 등 차단)
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;
  return shell.openExternal(url);
});

// ── 로그인 창 (인앱 login.html — 이메일/Google) ──
let authWindow = null;

function openLoginWindow() {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    return;
  }
  authWindow = new BrowserWindow({
    width: 460,
    height: 640,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: false,
    title: "메이킷 로그인",
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: path.join(__dirname, "auth-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  authWindow.setMenuBarVisibility(false);
  authWindow.loadFile(path.join(__dirname, "renderer", "login.html"));
  authWindow.on("closed", () => {
    authWindow = null;
    // 로그인 창이 닫히면 renderer에 알림 (버튼 상태 복원용)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:windowClosed");
    }
  });
}

ipcMain.handle("auth:openLoginWindow", () => {
  openLoginWindow();
  return { ok: true };
});

// 로그인 창에서 sendResult → 메인 창에 forward
ipcMain.on("auth:result", (_, result) => {
  console.log("[auth:result] 수신:", result ? `email=${result.email}, token=${(result.access_token||"").slice(0,20)}...` : "null");
  if (mainWindow) {
    mainWindow.webContents.send("auth:callback", result);
    mainWindow.focus();
    console.log("[auth:result] 메인 창에 전달 완료");
  } else {
    console.error("[auth:result] mainWindow 없음!");
  }
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
  }
});

// ── Google OAuth via 로컬 HTTP 서버 (Loopback IP address flow) ──
// 표준 OAuth desktop 플로우: app → localhost HTTP server → browser → supabase → localhost callback
const AUTH_PORT = 54321;
let authHttpServer = null;

function closeAuthHttpServer() {
  if (authHttpServer) {
    try {
      authHttpServer.close();
      authHttpServer.unref();
    } catch {}
    authHttpServer = null;
  }
}

function startAuthHttpServer() {
  return new Promise((resolve, reject) => {
    if (authHttpServer) return resolve(AUTH_PORT);

    const server = http.createServer((req, res) => {
      const parsed = urlLib.parse(req.url || "", true);

      if (parsed.pathname === "/callback") {
        // 브라우저가 redirect 후 도달 — 토큰은 URL fragment(#)에 있음 → JS로 추출 후 POST
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>메이킷 로그인 완료</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Segoe UI","Malgun Gothic",sans-serif;
  background:#fafafa; display:flex; align-items:center; justify-content:center;
  min-height:100vh; padding:20px; -webkit-font-smoothing:antialiased; }
.card { max-width:420px; width:100%; padding:40px 32px; background:#fff;
  border-radius:18px; box-shadow:0 4px 24px rgba(0,0,0,.06); text-align:center; border:1px solid #f0f1f4; }
.check { width:64px; height:64px; border-radius:50%; background:#d1fae5; color:#10b981;
  display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 16px; }
h1 { font-size:20px; font-weight:700; margin-bottom:8px; color:#111827; }
p { color:#6b7280; font-size:13px; line-height:1.6; }
.err { color:#b91c1c; }
</style></head><body>
<div class="card" id="card">
  <h1>로그인 처리 중...</h1>
  <p>잠시만 기다려주세요</p>
</div>
<script>
(async () => {
  try {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token") || "";
    const expires_at = params.get("expires_at") || "";

    if (!access_token) {
      const q = new URLSearchParams(window.location.search);
      const err = q.get("error_description") || q.get("error") || "토큰 없음";
      document.getElementById("card").innerHTML =
        '<h1 class="err">로그인 실패</h1><p>' + err + '</p>';
      return;
    }

    const resp = await fetch("/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token, expires_at }),
    });

    if (resp.ok) {
      document.getElementById("card").innerHTML =
        '<div class="check">&#10003;</div>' +
        '<h1>로그인 완료!</h1>' +
        '<p>앱으로 돌아가세요.<br>이 창은 닫아도 됩니다.</p>';
    } else {
      document.getElementById("card").innerHTML =
        '<h1 class="err">서버 오류</h1><p>' + resp.status + '</p>';
    }
  } catch (e) {
    document.getElementById("card").innerHTML =
      '<h1 class="err">오류</h1><p>' + (e.message || e) + '</p>';
  }
})();
</script></body></html>`);
        return;
      }

      if (parsed.pathname === "/token" && req.method === "POST") {
        const origin = req.headers.origin || "";
        const referer = req.headers.referer || "";
        const allowedOrigin = `http://127.0.0.1:${AUTH_PORT}`;
        if (origin !== allowedOrigin && !referer.startsWith(allowedOrigin + "/")) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Origin not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            // JWT 디코드 해서 email/uid 추출
            let email = "", uid = "";
            try {
              const payload = JSON.parse(
                Buffer.from(data.access_token.split(".")[1], "base64").toString("utf8")
              );
              email = payload.email || "";
              uid = payload.sub || "";
            } catch {}

            if (mainWindow) {
              mainWindow.webContents.send("auth:callback", {
                access_token: data.access_token,
                refresh_token: data.refresh_token || "",
                email,
                uid,
                expires_at: data.expires_at || 0,
              });
              mainWindow.focus();
            }
            if (authWindow && !authWindow.isDestroyed()) authWindow.close();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));

            // 2초 후 서버 종료
            setTimeout(closeAuthHttpServer, 2000);
          } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end("not found");
    });

    server.listen(AUTH_PORT, "127.0.0.1", () => {
      authHttpServer = server;
      resolve(AUTH_PORT);
    });
    server.on("error", (e) => {
      // 포트 점유 등 — 이미 서버 있으면 무시
      if (e.code === "EADDRINUSE") resolve(AUTH_PORT);
      else reject(e);
    });
  });
}

// Google OAuth: 시스템 브라우저에서 Google 로그인
ipcMain.on("auth:google", async () => {
  await startAuthHttpServer();
  const SUPABASE_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
  const redirectTo = `http://127.0.0.1:${AUTH_PORT}/callback`;
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  shell.openExternal(authUrl);
});

ipcMain.on("auth:openExternal", (_, url) => {
  if (url && typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

// ═══════════════════════════════════════════════════════════
// 영상 편집 — 로컬 ffmpeg 처리
// ═══════════════════════════════════════════════════════════

function asarUnpack(p) {
  if (p && p.includes("app.asar") && !p.includes("app.asar.unpacked")) {
    return p.replace("app.asar", "app.asar.unpacked");
  }
  return p;
}
function getFfmpegPath() {
  try {
    let p = require("ffmpeg-static");
    p = asarUnpack(p);
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return "ffmpeg";
}
function getFfprobePath() {
  try {
    let p = require("ffprobe-static")?.path;
    p = asarUnpack(p);
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return "ffprobe";
}

// ═══════════════════════════════════════════════════════════
// 슬라이드 영상 생성기
// ═══════════════════════════════════════════════════════════

ipcMain.handle("slideshow:bgmDuration", async (_, filePath) => {
  return new Promise((resolve) => {
    const proc = spawn(getFfprobePath(), [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", filePath
    ], { windowsHide: true });
    let out = "";
    proc.stdout.on("data", (d) => { out += d; });
    proc.on("close", () => resolve(parseFloat(out) || 0));
    proc.on("error", () => resolve(0));
  });
});

// 음원에서 Whisper STT로 가사/보컬 인식
ipcMain.handle("slideshow:extractLyrics", async (_, filePath) => {
  const API = "https://shorts-factory-r33o.onrender.com";
  try {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };

    const sendProg = (pct, label) => {
      if (mainWindow) mainWindow.webContents.send("slideshow:progress", { percent: pct, label });
    };

    sendProg(10, "오디오 변환 중...");
    const audioPath = path.join(os.tmpdir(), `makeit_lyrics_${Date.now()}.mp3`);
    await new Promise((resolve, reject) => {
      const proc = spawn(getFfmpegPath(), [
        "-i", filePath, "-vn", "-acodec", "libmp3lame",
        "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", audioPath
      ], { windowsHide: true });
      const timeout = setTimeout(() => { try { proc.kill(); } catch {} reject(new Error("시간 초과")); }, 120000);
      proc.on("close", (code) => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error("오디오 변환 실패")); });
      proc.on("error", (e) => { clearTimeout(timeout); reject(e); });
    });

    // 25MB 초과 시 앞 3분만
    if (fs.statSync(audioPath).size > 24 * 1024 * 1024) {
      const trimPath = audioPath + ".trim.mp3";
      await new Promise((resolve) => {
        const proc = spawn(getFfmpegPath(), ["-i", audioPath, "-t", "180", "-acodec", "libmp3lame", "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", trimPath], { windowsHide: true });
        proc.on("close", () => { if (fs.existsSync(trimPath)) { fs.unlinkSync(audioPath); fs.renameSync(trimPath, audioPath); } resolve(); });
      });
    }

    sendProg(30, "AI 음성 인식 중...");
    const audioB64 = fs.readFileSync(audioPath).toString("base64");
    fs.unlinkSync(audioPath);

    const reqBody = JSON.stringify({ audio_base64: audioB64, file_name: "audio.mp3", lang: "ko" });
    const tmpReq = path.join(os.tmpdir(), `makeit_lyrics_req_${Date.now()}.json`);
    fs.writeFileSync(tmpReq, reqBody);

    const result = await new Promise((resolve) => {
      const proc = spawn("curl", [
        "-s", "-w", "\n%{http_code}", "-X", "POST",
        `${API}/whisper`, "-H", "Content-Type: application/json",
        "-d", `@${tmpReq}`, "--max-time", "300", "--connect-timeout", "15",
      ], { windowsHide: true, maxBuffer: 50 * 1024 * 1024 });
      const chunks = [];
      proc.stdout.on("data", d => chunks.push(d.toString()));
      proc.on("close", code => {
        try { fs.unlinkSync(tmpReq); } catch {}
        const raw = chunks.join("");
        const lines = raw.trim().split("\n");
        const httpCode = parseInt(lines.pop()) || 0;
        const body = lines.join("\n");
        try {
          const data = JSON.parse(body);
          resolve({ ok: httpCode >= 200 && httpCode < 300, data });
        } catch {
          resolve({ ok: false, error: "응답 파싱 실패" });
        }
      });
      proc.on("error", () => resolve({ ok: false, error: "curl 실행 실패" }));
    });

    sendProg(90, "가사 정리 중...");
    if (result.ok && result.data) {
      // segments or text
      const rawSegments = result.data.segments || [];
      if (rawSegments.length) {
        // 무음/반주 구간 필터링: no_speech_prob > 0.5 또는 텍스트가 너무 짧은 구간 제거
        const segments = rawSegments.filter(s => {
          if (!s.text || s.text.trim().length < 2) return false;
          if (s.no_speech_prob != null && s.no_speech_prob > 0.5) return false;
          // 반복 노이즈 제거 (같은 문자 반복, 의미없는 소리)
          const t = s.text.trim();
          if (/^[.\s\-~…]+$/.test(t)) return false;
          if (/^(.)\1{3,}/.test(t)) return false; // aaaa 같은 반복
          return true;
        });
        if (segments.length) {
          const lyrics = segments.map(s => s.text.trim()).join("\n");
          return { ok: true, lyrics, segments };
        }
      }
      if (result.data.text) {
        return { ok: true, lyrics: result.data.text };
      }
    }
    return { ok: false, error: result.error || "인식된 가사가 없습니다" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("slideshow:generate", async (event, params) => {
  const { photos, subtitles, bgmPath, bgmVolume, perPhoto, resolution, transition, motion, colorGrade, vignette, fadeInOut, subFont, subAnim, subBg, subBgStyle, subLines, segments } = params;
  const [w, h] = resolution.split("x").map(Number);
  const tmpDir = path.join(os.tmpdir(), "makeit_slideshow_" + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  const fps = 30;
  const frames = Math.ceil(perPhoto * fps);

  const sendProg = (pct, label) => {
    if (mainWindow) mainWindow.webContents.send("slideshow:progress", { percent: pct, label });
  };

  sendProg(5, "사진 준비 중...");

  // 1. 각 사진을 확대된 해상도로 리사이즈 (모션용 여백 확보)
  // 모션 있으면 1.3x 크기로 만들고 zoompan으로 크롭
  const scaleW = motion !== "none" ? Math.ceil(w * 1.3) : w;
  const scaleH = motion !== "none" ? Math.ceil(h * 1.3) : h;

  for (let i = 0; i < photos.length; i++) {
    sendProg(5 + Math.floor((i / photos.length) * 20), `사진 ${i + 1}/${photos.length} 변환 중...`);
    const outImg = path.join(tmpDir, `img_${String(i).padStart(4, "0")}.png`);
    await new Promise((resolve, reject) => {
      const args = [
        "-y", "-i", photos[i],
        "-vf", `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=decrease,pad=${scaleW}:${scaleH}:(ow-iw)/2:(oh-ih)/2:black`,
        "-frames:v", "1", outImg
      ];
      const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
      proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("이미지 변환 실패: " + photos[i])));
      proc.on("error", reject);
    });
  }

  sendProg(30, "영상 클립 생성 중...");

  // 2. 각 사진을 개별 영상 클립으로 (모션 + 자막 적용)
  const clips = [];
  for (let i = 0; i < photos.length; i++) {
    sendProg(30 + Math.floor((i / photos.length) * 35), `클립 ${i + 1}/${photos.length} 렌더링...`);
    const imgPath = path.join(tmpDir, `img_${String(i).padStart(4, "0")}.png`);
    const clipPath = path.join(tmpDir, `clip_${String(i).padStart(4, "0")}.mp4`);
    clips.push(clipPath);

    // 모션 필터
    let vf = "";
    const even = (n) => Math.floor(n / 2) * 2; // FFmpeg는 짝수 해상도 필요
    if (motion === "zoom") {
      // 짝수 사진 zoom in, 홀수 zoom out
      const zStart = i % 2 === 0 ? 1.0 : 1.3;
      const zEnd   = i % 2 === 0 ? 1.3 : 1.0;
      vf = `zoompan=z='${zStart}+(${zEnd}-${zStart})*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
    } else if (motion === "pan") {
      // 좌→우, 우→좌 교대
      const dir = i % 2 === 0;
      const maxPan = scaleW - w;
      vf = dir
        ? `zoompan=z=1:x='${maxPan}*on/${frames}':y='(ih-oh)/2':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`
        : `zoompan=z=1:x='${maxPan}-${maxPan}*on/${frames}':y='(ih-oh)/2':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
    } else if (motion === "kenburns") {
      // 줌 + 패닝 조합 (4가지 패턴 순환)
      const pattern = i % 4;
      const maxPan = Math.floor((scaleW - w) * 0.7);
      if (pattern === 0) {
        vf = `zoompan=z='1.0+0.3*on/${frames}':x='${maxPan}*on/${frames}':y='(ih-ih/zoom)/2':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
      } else if (pattern === 1) {
        vf = `zoompan=z='1.3-0.3*on/${frames}':x='${maxPan}-${maxPan}*on/${frames}':y='(ih-ih/zoom)/2':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
      } else if (pattern === 2) {
        vf = `zoompan=z='1.0+0.25*on/${frames}':x='(iw-iw/zoom)/2':y='${Math.floor((scaleH-h)*0.5)}*on/${frames}':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
      } else {
        vf = `zoompan=z='1.25-0.25*on/${frames}':x='(iw-iw/zoom)/2':y='${Math.floor((scaleH-h)*0.5)}-${Math.floor((scaleH-h)*0.5)}*on/${frames}':d=${frames}:s=${even(w)}x${even(h)}:fps=${fps}`;
      }
    } else {
      // 정지 (모션 없음)
      vf = `scale=${even(w)}:${even(h)},setsar=1`;
    }

    // 색감 보정
    if (colorGrade === "warm") vf += `,colorbalance=rs=0.1:gs=0.05:bs=-0.1`;
    else if (colorGrade === "cool") vf += `,colorbalance=rs=-0.1:gs=0:bs=0.15`;
    else if (colorGrade === "vintage") vf += `,curves=vintage,eq=saturation=0.8:contrast=1.1`;
    else if (colorGrade === "bw") vf += `,hue=s=0`;

    // 클립 페이드 인/아웃 (첫/마지막 사진)
    if (fadeInOut && i === 0) vf += `,fade=t=in:st=0:d=1`;
    if (fadeInOut && i === photos.length - 1) vf += `,fade=t=out:st=${Math.max(0, perPhoto - 1.5)}:d=1.5`;

    // ── 자막 drawtext ──
    const fontSize = Math.floor(h / 18);
    const yPos = h - fontSize - Math.floor(h / 10);

    // 폰트 선택
    const fontMap = {
      pretendard: [path.join(__dirname, "build", "fonts", "Pretendard-Bold.otf"), path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Windows", "Fonts", "Pretendard-Bold.otf")],
      round: [path.join(__dirname, "build", "fonts", "NanumSquareRoundB.ttf"), path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Windows", "Fonts", "NanumSquareRoundB.ttf")],
      malgun: ["C:/Windows/Fonts/malgunbd.ttf"],
    };
    const fontCands = [...(fontMap[subFont || "pretendard"] || []), "C:/Windows/Fonts/malgunbd.ttf"];
    let fontFile = fontCands.find(f => { try { return fs.existsSync(f); } catch { return false; } }) || fontCands[fontCands.length - 1];
    fontFile = fontFile.replace(/\\/g, "/").replace(":", "\\:");

    function mkDt(text, enableExpr) {
      const esc = text.replace(/'/g, "\u2019").replace(/\\/g, "\\\\").replace(/:/g, "\\:");
      let d = `drawtext=text='${esc}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=white`;
      if (subBgStyle === "box" || subBg) d += `:box=1:boxcolor=black@0.4:boxborderw=10`;
      else if (subBgStyle === "outline") d += `:borderw=3:bordercolor=black@0.6`;
      // "none" → 테두리/배경 없음
      d += `:x=(w-text_w)/2:y=${yPos}`;
      if (enableExpr) d += `:enable='${enableExpr}'`;
      return d;
    }

    // 타임스탬프 기반 자막 (segments 있을 때 → 노래 타이밍 동기화)
    const clipStart = i * perPhoto;
    const clipEnd = (i + 1) * perPhoto;

    if (segments && segments.length > 0) {
      const overlapping = segments.filter(s => s.end > clipStart && s.start < clipEnd);
      overlapping.forEach(seg => {
        const ls = Math.max(0, seg.start - clipStart);
        const le = Math.min(perPhoto, seg.end - clipStart);
        if (le - ls < 0.2) return;
        vf += `,${mkDt(seg.text, `between(t\\,${ls.toFixed(2)}\\,${le.toFixed(2)})`)}`;
      });
    } else {
      // segments 없으면 기존 subtitles 배열 사용
      const sub = (subtitles && subtitles[i]) ? subtitles[i].trim() : "";
      if (sub) {
        if (subAnim === "fade") {
          const fo = Math.max(0, perPhoto - 0.4);
          vf += `,${mkDt(sub, null)}`;
          // alpha 는 enable 과 별도로 - 간단하게 전체 표시
        } else {
          vf += `,${mkDt(sub, null)}`;
        }
      }
    }

    await new Promise((resolve, reject) => {
      const args = [
        "-y", "-loop", "1", "-i", imgPath,
        "-vf", vf,
        "-t", String(perPhoto),
        "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
        "-r", String(fps), "-an", clipPath
      ];
      const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
      let stderr = "";
      proc.stderr.on("data", d => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(clipPath)) resolve();
        else reject(new Error(`클립 ${i+1} 렌더링 실패\n` + stderr.slice(-300)));
      });
      proc.on("error", reject);
    });
  }

  sendProg(70, "클립 합치는 중...");

  // 3. concat 파일
  const concatFile = path.join(tmpDir, "concat.txt");
  const concatContent = clips.map(c => `file '${c.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatFile, concatContent);

  // 4. 최종 인코딩 (클립 합치기 + BGM)
  const outFile = path.join(tmpDir, "slideshow_output.mp4");
  const ffArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];

  if (bgmPath && fs.existsSync(bgmPath)) {
    ffArgs.push("-i", bgmPath);
    ffArgs.push("-c:v", "copy");
    ffArgs.push("-c:a", "aac", "-b:a", "192k");
    const vol = bgmVolume != null ? bgmVolume : 0.5;
    const totalDur = perPhoto * photos.length;
    // 음악 끝 1.5초 페이드아웃 + 볼륨 조절
    const fadeStart = Math.max(0, totalDur - 1.5);
    ffArgs.push("-filter:a", `volume=${vol},afade=t=out:st=${fadeStart.toFixed(1)}:d=1.5`);
    ffArgs.push("-shortest");
  } else {
    ffArgs.push("-c:v", "copy", "-an");
  }
  ffArgs.push("-movflags", "+faststart", outFile);

  await new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), ffArgs, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      // 진행률 파싱 (time=)
      const match = d.toString().match(/time=(\d+):(\d+):(\d+)/);
      if (match) {
        const sec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
        const total = perPhoto * photos.length;
        const pct = Math.min(95, 55 + Math.floor((sec / total) * 40));
        sendProg(pct, `인코딩 중... ${Math.floor(sec)}초 / ${Math.floor(total)}초`);
      }
    });
    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outFile)) resolve();
      else reject(new Error("FFmpeg 인코딩 실패\n" + stderr.slice(-500)));
    });
    proc.on("error", reject);
  });

  sendProg(100, "완료!");
  return outFile;
});

ipcMain.handle("slideshow:saveAs", async (_, currentPath) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: "슬라이드영상.mp4",
    filters: [{ name: "MP4 영상", extensions: ["mp4"] }]
  });
  if (!canceled && filePath) {
    fs.copyFileSync(currentPath, filePath);
    return filePath;
  }
  return null;
});

ipcMain.handle("slideshow:openFolder", async (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// 로컬 ffmpeg 오디오 추출 → /whisper API → 자막+하이라이트 생성
// /analyze가 서버 메모리 부족으로 크래시하므로, /whisper만 사용
ipcMain.handle("video:uploadAndAnalyze", async (_, filePath, maxSegments) => {
  const API = "https://shorts-factory-r33o.onrender.com";
  try {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };

    const sendProg = (pct, label) => {
      if (mainWindow) mainWindow.webContents.send("video:progress", { percent: pct, label });
    };

    // 1. 로컬 ffmpeg로 오디오 추출
    sendProg(10, "오디오 추출 중...");
    const audioPath = path.join(os.tmpdir(), `makeit_audio_${Date.now()}.mp3`);
    console.log("[video] Extracting audio:", filePath);

    await new Promise((resolve, reject) => {
      const proc = spawn(getFfmpegPath(), [
        "-i", filePath, "-vn", "-acodec", "libmp3lame",
        "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", audioPath
      ], { windowsHide: true });
      let stderrLog = "";
      // 5분 타임아웃 (대용량 영상)
      const timeout = setTimeout(() => {
        try { proc.kill("SIGTERM"); } catch {}
        reject(new Error("오디오 추출 시간 초과 (5분)"));
      }, 300000);
      proc.stderr.on("data", d => { stderrLog += d.toString(); });
      proc.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) resolve();
        else {
          const errMatch = stderrLog.match(/Error[^\n]*/i);
          reject(new Error(errMatch ? errMatch[0].slice(0, 200) : "오디오 추출 실패"));
        }
      });
      proc.on("error", (e) => { clearTimeout(timeout); reject(e); });
    });

    // 25MB 초과 시 앞 3분만 사용
    if (fs.statSync(audioPath).size > 24 * 1024 * 1024) {
      const trimPath = audioPath + ".trim.mp3";
      await new Promise((resolve) => {
        const proc = spawn(getFfmpegPath(), ["-i", audioPath, "-t", "180", "-acodec", "libmp3lame", "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", trimPath], { windowsHide: true });
        proc.on("close", () => { if (fs.existsSync(trimPath)) { fs.unlinkSync(audioPath); fs.renameSync(trimPath, audioPath); } resolve(); });
      });
    }

    // 2. /whisper API 호출 (base64)
    sendProg(30, "AI 음성 인식 중...");
    const audioB64 = fs.readFileSync(audioPath).toString("base64");
    const audioSize = fs.statSync(audioPath).size;
    fs.unlinkSync(audioPath);
    console.log("[video] Audio:", (audioSize / 1024).toFixed(0), "KB → calling /whisper");

    const reqBody = JSON.stringify({ audio_base64: audioB64, file_name: "audio.mp3", lang: "ko" });
    const tmpReq = path.join(os.tmpdir(), `makeit_whisper_${Date.now()}.json`);
    fs.writeFileSync(tmpReq, reqBody);

    const whisperResult = await new Promise((resolve) => {
      const proc = spawn("curl", [
        "-s", "-w", "\n%{http_code}",
        "-X", "POST",
        `${API}/whisper`,
        "-H", "Content-Type: application/json",
        "-d", `@${tmpReq}`,
        "--max-time", "300",
        "--connect-timeout", "15",
      ], { windowsHide: true, maxBuffer: 50 * 1024 * 1024 });
      const chunks = [];
      let stderrMsg = "";
      proc.stdout.on("data", d => chunks.push(d.toString()));
      proc.stderr.on("data", d => { stderrMsg += d.toString(); });
      proc.on("close", code => {
        try { fs.unlinkSync(tmpReq); } catch {}
        const raw = chunks.join("");
        console.log("[video:whisper] exit:", code, "len:", raw.length);
        if (code !== 0) {
          const errReason = code === 28 ? "서버 응답 시간 초과 (5분)" : code === 7 ? "서버 연결 실패" : `curl 오류 (code=${code})`;
          console.error("[video:whisper] curl failed:", errReason, stderrMsg.slice(0, 200));
          return resolve({ ok: false, error: errReason });
        }
        if (!raw.trim()) {
          return resolve({ ok: false, error: "서버에서 빈 응답을 받았습니다" });
        }
        try {
          const lines = raw.trim().split("\n");
          const httpCode = parseInt(lines[lines.length - 1]);
          const body = lines.slice(0, -1).join("\n");
          if (!body.trim()) {
            return resolve({ ok: false, error: `서버 오류 (HTTP ${httpCode})` });
          }
          const data = JSON.parse(body);
          if (httpCode >= 200 && httpCode < 300) {
            resolve({ ok: true, data, httpCode });
          } else {
            resolve({ ok: false, error: data.detail || data.error || `서버 오류 (HTTP ${httpCode})`, data, httpCode });
          }
        } catch (parseErr) {
          console.error("[video:whisper] parse error:", parseErr.message, "raw:", raw.slice(0, 300));
          resolve({ ok: false, error: "음성 인식 응답 파싱 실패: " + parseErr.message });
        }
      });
      proc.on("error", (e) => {
        try { fs.unlinkSync(tmpReq); } catch {}
        resolve({ ok: false, error: "curl 실행 실패: " + e.message });
      });
    });

    if (!whisperResult.ok) {
      return { ok: false, error: whisperResult.data?.detail || whisperResult.error || "음성 인식 실패" };
    }

    sendProg(70, "자막 생성 중...");
    const wd = whisperResult.data;

    // 3. word-level 자막 생성
    const words = wd.words || [];
    const segments = wd.segments || [];
    let subtitles = [];

    if (words.length > 0) {
      let chunk = "", chunkStart = null, chunkEnd = 0;
      for (const w of words) {
        const t = (w.word || "").trim();
        if (!t) continue;
        if (chunkStart === null) chunkStart = w.start || 0;
        const test = chunk ? chunk + " " + t : t;
        if (test.length > 15 && chunk) {
          subtitles.push({ start: chunkStart, end: chunkEnd, text: chunk.trim() });
          chunk = t; chunkStart = w.start || 0;
        } else { chunk = test; }
        chunkEnd = w.end || 0;
      }
      if (chunk && chunkStart !== null) subtitles.push({ start: chunkStart, end: chunkEnd, text: chunk.trim() });
    } else if (segments && segments.length) {
      subtitles = segments.map(s => ({ start: s.start || 0, end: s.end || 0, text: (s.text || "").trim() })).filter(s => s.text);
    }

    // 4. 하이라이트 구간
    const totalDur = subtitles.length ? subtitles[subtitles.length - 1].end : wd.duration || 0;
    const segCount = Math.min(maxSegments || 5, Math.max(1, Math.floor(totalDur / 30)));
    const segDur = totalDur / Math.max(1, segCount);
    const hlSegments = [];
    for (let i = 0; i < segCount; i++) {
      const ss = i * segDur, se = Math.min((i + 1) * segDur, totalDur);
      const segSubs = subtitles.filter(s => s.start >= ss - 0.5 && s.end <= se + 0.5);
      hlSegments.push({
        start_seconds: Math.round(ss * 100) / 100,
        end_seconds: Math.round(se * 100) / 100,
        hook: segSubs.length ? segSubs[0].text.slice(0, 30) : `구간 ${i + 1}`,
        score: Math.floor(70 + Math.random() * 20),
        subtitles: segSubs,
      });
    }

    sendProg(100, "분석 완료!");
    console.log("[video] Done! subtitles:", subtitles.length, "segments:", hlSegments.length);

    return { ok: true, fileId: "local_" + Date.now(), analyzeData: { segments: hlSegments, all_subs: subtitles } };
  } catch (e) {
    console.error("[video:uploadAndAnalyze] ERROR:", e);
    return { ok: false, error: e.message || "알 수 없는 오류" };
  }
});

// 파일 선택
ipcMain.handle("video:selectFile", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "영상", extensions: ["mp4", "mov", "avi", "mkv", "webm"] }],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  // 하위 호환: filePath(단일) + filePaths(다중) 모두 반환
  return { ok: true, filePath: r.filePaths[0], filePaths: r.filePaths };
});

// 다중 영상을 하나로 합치기 (concat → 단일 파일)
ipcMain.handle("video:concat", async (_, filePaths) => {
  if (!filePaths || filePaths.length < 2) return { ok: false, error: "2개 이상의 영상이 필요합니다" };
  try {
    const tmpDir = path.join(os.tmpdir(), "makeit_concat_" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    const sendProg = (pct, label) => {
      if (mainWindow) mainWindow.webContents.send("video:progress", { percent: pct, label });
    };

    // 1. 모든 영상을 같은 코덱/해상도로 변환
    sendProg(5, "영상 규격 통일 중...");
    const normalized = [];
    for (let i = 0; i < filePaths.length; i++) {
      sendProg(5 + Math.floor((i / filePaths.length) * 50), `영상 ${i + 1}/${filePaths.length} 변환 중...`);
      const outPath = path.join(tmpDir, `part_${i}.mp4`);
      await new Promise((resolve, reject) => {
        const proc = spawn(getFfmpegPath(), [
          "-y", "-i", filePaths[i],
          "-c:v", "libx264", "-preset", "fast", "-crf", "23",
          "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
          "-r", "30", "-pix_fmt", "yuv420p",
          "-movflags", "+faststart", outPath
        ], { windowsHide: true });
        proc.on("close", code => code === 0 ? resolve() : reject(new Error("변환 실패: " + filePaths[i])));
        proc.on("error", reject);
      });
      normalized.push(outPath);
    }

    // 2. concat 파일 생성
    sendProg(60, "영상 합치는 중...");
    const concatFile = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatFile, normalized.map(f => `file '${f.replace(/\\/g, "/")}'`).join("\n"));

    const outFile = path.join(tmpDir, "merged.mp4");
    await new Promise((resolve, reject) => {
      const proc = spawn(getFfmpegPath(), [
        "-y", "-f", "concat", "-safe", "0", "-i", concatFile,
        "-c", "copy", "-movflags", "+faststart", outFile
      ], { windowsHide: true });
      proc.on("close", code => code === 0 ? resolve() : reject(new Error("합치기 실패")));
      proc.on("error", reject);
    });

    sendProg(90, "완료!");
    return { ok: true, filePath: outFile };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// 이미지/GIF 선택 (짤 삽입용)
ipcMain.handle("video:selectImage", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  return { ok: true, filePath: r.filePaths[0] };
});

// 저장 폴더 선택
ipcMain.handle("video:selectSaveDir", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  return { ok: true, dirPath: r.filePaths[0] };
});

ipcMain.handle("video:selectSaveFile", async (_, { defaultName }) => {
  const r = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "영상.mp4",
    filters: [{ name: "MP4 영상", extensions: ["mp4"] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };
  return { ok: true, filePath: r.filePath, dirPath: path.dirname(r.filePath), fileName: path.basename(r.filePath) };
});

// ── 프로젝트 저장/불러오기 ──
const PROJECTS_DIR = path.join(app.getPath("userData"), "projects");
try { fs.mkdirSync(PROJECTS_DIR, { recursive: true }); } catch {}

ipcMain.handle("project:save", async (_, data) => {
  try {
    const id = data.id || ("proj_" + Date.now());
    const filePath = path.join(PROJECTS_DIR, id + ".json");
    fs.writeFileSync(filePath, JSON.stringify({ ...data, id, savedAt: new Date().toISOString() }, null, 2), "utf8");
    return { ok: true, id };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle("project:list", async () => {
  try {
    const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith(".json")).sort().reverse();
    const projects = [];
    for (const f of files.slice(0, 50)) {
      try {
        const raw = fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8");
        const p = JSON.parse(raw);
        projects.push({ id: p.id, name: p.name || p.fileName || "프로젝트", fileName: p.fileName, filePath: p.filePath, savedAt: p.savedAt, duration: p.duration, type: p.type, subtitleCount: p.subtitles?.length || 0 });
      } catch {}
    }
    return { ok: true, projects };
  } catch (e) { return { ok: false, projects: [], error: e.message }; }
});

ipcMain.handle("project:load", async (_, id) => {
  try {
    const filePath = path.join(PROJECTS_DIR, id + ".json");
    if (!fs.existsSync(filePath)) return { ok: false, error: "프로젝트 파일 없음" };
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    // 원본 영상 파일 존재 확인
    if (data.filePath && !fs.existsSync(data.filePath)) {
      return { ok: false, error: "원본 영상 파일을 찾을 수 없습니다:\n" + data.filePath };
    }
    return { ok: true, data };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle("project:delete", async (_, id) => {
  try {
    const filePath = path.join(PROJECTS_DIR, id + ".json");
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ffmpeg 무음 감지
ipcMain.handle("video:detectSilence", async (_, { filePath, threshold, minDuration }) => {
  if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };
  const th = threshold || -30; // dB
  const dur = minDuration || 0.5; // 초
  return new Promise((resolve) => {
    const args = ["-i", filePath, "-af", `silencedetect=noise=${th}dB:d=${dur}`, "-f", "null", "-"];
    const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code !== 0 && !stderr.includes("silence_start")) {
        const errMatch = stderr.match(/Error[^\n]*/i);
        console.error("[video:detectSilence] failed:", errMatch ? errMatch[0] : stderr.slice(-300));
        return resolve({ ok: false, error: errMatch ? errMatch[0].slice(0, 200) : "무음 감지 실패" });
      }
      const silences = [];
      const starts = stderr.match(/silence_start: ([\d.]+)/g) || [];
      const ends = stderr.match(/silence_end: ([\d.]+)/g) || [];
      for (let i = 0; i < starts.length; i++) {
        const s = parseFloat(starts[i].replace("silence_start: ", ""));
        const e = ends[i] ? parseFloat(ends[i].replace("silence_end: ", "")) : s + dur;
        if (e > s) silences.push({ start: s, end: e });
      }
      // 겹치는 구간 병합
      silences.sort((a, b) => a.start - b.start);
      const merged = [];
      for (const si of silences) {
        if (merged.length && si.start <= merged[merged.length - 1].end) {
          merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, si.end);
        } else {
          merged.push({ ...si });
        }
      }
      resolve({ ok: true, silences: merged });
    });
    proc.on("error", e => resolve({ ok: false, error: e.message }));
  });
});

// ffmpeg 무음 구간 제거 (segment split + concat demuxer = 재인코딩 없이 초고속)
ipcMain.handle("video:removeSilence", async (_, { filePath, silences, outputDir }) => {
  if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };
  if (!silences || !silences.length) return { ok: false, error: "무음 구간 없음" };

  const dir = outputDir || path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  // 임시 폴더는 os.tmpdir()에 생성 (원본 폴더 오염 방지)
  const tmpDir = path.join(os.tmpdir(), "_makeit_silence_" + Date.now());
  const outPath = path.join(dir, base + "_nosilence" + ext);

  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {
    return { ok: false, error: "임시 폴더 생성 실패: " + e.message };
  }

  function cleanupTmp() {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {
      console.warn("[video:removeSilence] 임시 폴더 정리 실패:", tmpDir, e.message);
    }
  }

  try {
    // 무음이 아닌 구간 추출
    const keeps = [];
    let cursor = 0;
    // silences는 이미 병합 정렬된 상태 (detectSilence에서 처리)
    for (const s of silences) {
      if (s.start > cursor + 0.05) keeps.push({ start: cursor, end: s.start });
      cursor = s.end;
    }
    // probe로 실제 영상 길이
    let totalDur = 9999;
    try {
      const probeResult = await new Promise(r => {
        const p = spawn(getFfprobePath(), ["-v", "quiet", "-print_format", "json", "-show_format", filePath], { windowsHide: true });
        let out = ""; p.stdout.on("data", d => out += d); p.on("close", () => { try { r(JSON.parse(out)); } catch { r(null); } });
        p.on("error", () => r(null));
      });
      if (probeResult?.format?.duration) totalDur = parseFloat(probeResult.format.duration);
    } catch {}
    if (cursor < totalDur - 0.1) keeps.push({ start: cursor, end: totalDur });

    if (!keeps.length) { cleanupTmp(); return { ok: false, error: "유지할 구간 없음" }; }

    // 각 구간을 -c copy로 빠르게 추출
    // 말 반복 방지: 각 구간 시작에 0.08초 패딩 추가 (키프레임 겹침으로 인한 반복 제거)
    const segFiles = [];
    for (let i = 0; i < keeps.length; i++) {
      const k = keeps[i];
      const segPath = path.join(tmpDir, `seg_${String(i).padStart(3, "0")}${ext}`);
      // 첫 번째 구간은 패딩 없이, 나머지는 시작점을 0.08초 뒤로 밀어 말 겹침 방지
      const pad = i === 0 ? 0 : 0.08;
      const start = k.start + pad;
      const dur = k.end - start;
      if (dur < 0.05) continue; // 너무 짧은 구간 스킵

      const segOk = await new Promise((resolve) => {
        const args = ["-y", "-ss", String(start), "-i", filePath, "-t", String(dur), "-c", "copy", "-avoid_negative_ts", "make_zero", segPath];
        const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
        let segErr = "";
        proc.stderr.on("data", d => { segErr += d.toString(); });
        proc.on("close", (code) => {
          if (code !== 0) console.warn(`[removeSilence] seg ${i} failed (code=${code}):`, segErr.slice(-200));
          resolve(code === 0);
        });
        proc.on("error", (e) => { console.warn(`[removeSilence] seg ${i} error:`, e.message); resolve(false); });
      });
      if (segOk && fs.existsSync(segPath) && fs.statSync(segPath).size > 100) segFiles.push(segPath);
    }

    if (!segFiles.length) {
      cleanupTmp();
      return { ok: false, error: "구간 추출 실패 - 모든 세그먼트 처리에 실패했습니다" };
    }

    // concat demuxer로 합치기 (재인코딩 없음)
    const listPath = path.join(tmpDir, "list.txt");
    fs.writeFileSync(listPath, segFiles.map(f => `file '${f.replace(/\\/g, "/")}'`).join("\n"));

    return new Promise((resolve) => {
      const args = ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath];
      const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
      let concatErr = "";
      proc.stderr.on("data", d => { concatErr += d.toString(); });
      proc.on("close", code => {
        cleanupTmp();
        if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
          resolve({ ok: true, outputPath: outPath, keeps });
        } else {
          const errMatch = concatErr.match(/Error[^\n]*/i);
          console.error("[removeSilence] concat failed:", errMatch ? errMatch[0] : concatErr.slice(-300));
          resolve({ ok: false, error: "합치기 실패: " + (errMatch ? errMatch[0].slice(0, 100) : "알 수 없는 오류") });
        }
      });
      proc.on("error", e => { cleanupTmp(); resolve({ ok: false, error: e.message }); });
    });
  } catch (e) {
    cleanupTmp();
    return { ok: false, error: e.message || "무음 제거 중 오류 발생" };
  }
});

// ffprobe 영상 정보
ipcMain.handle("video:probe", async (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };
  return new Promise((resolve) => {
    const proc = spawn(getFfprobePath(), ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath], { windowsHide: true });
    const chunks = [];
    let stderrMsg = "";
    // 30초 타임아웃 (손상 파일/대용량 대비)
    const timeout = setTimeout(() => {
      try { proc.kill("SIGTERM"); } catch {}
      resolve({ ok: false, error: "파일 분석 시간 초과" });
    }, 30000);
    proc.stdout.on("data", d => chunks.push(d.toString()));
    proc.stderr.on("data", d => { stderrMsg += d.toString(); });
    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(chunks.join(""));
        const vs = (data.streams || []).find(s => s.codec_type === "video");
        resolve({ ok: true, duration: parseFloat(data.format?.duration || 0), width: vs?.width || 0, height: vs?.height || 0, size: parseInt(data.format?.size || 0) });
      } catch (e) { resolve({ ok: false, error: "파일 분석 실패: " + e.message }); }
    });
    proc.on("error", e => { clearTimeout(timeout); resolve({ ok: false, error: e.message }); });
  });
});

// SRT 파일 생성 헬퍼
function wrapCaptionText(text, maxChars = 15, maxLines = 2) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const limit = Math.max(5, Math.min(40, Number(maxChars || 15)));
  const lines = [];
  let rest = raw;
  while (rest.length > limit && lines.length < maxLines - 1) {
    let cut = rest.lastIndexOf(" ", limit);
    if (cut < Math.floor(limit * 0.55)) cut = limit;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) lines.push(rest);
  return lines.join("\n");
}

function writeSrt(srtPath, subs, offset = 0, captionStyle = {}) {
  const fmt = (s) => { s = Math.max(0, s); const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); const ms = Math.round((s%1)*1000); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`; };
  let content = "";
  subs.forEach((sub, i) => {
    const start = (sub.start_seconds ?? sub.start ?? 0) - offset;
    const end = (sub.end_seconds ?? sub.end ?? start + 2) - offset;
    let text = wrapCaptionText(sub.text || "", captionStyle.maxChars || 15, captionStyle.lines || 2);
    if (sub._translated) text += "\n" + wrapCaptionText(sub._translated, captionStyle.maxChars || 15, 1);
    content += `${i+1}\n${fmt(Math.max(0,start))} --> ${fmt(Math.max(0.1,end))}\n${text}\n\n`;
  });
  fs.writeFileSync(srtPath, content, "utf8");
}

// ffmpeg 자막 필터 생성 헬퍼
function buildSubFilter(srtPath, fontSize, fontColor, captionStyle = {}) {
  const fc = (fontColor || "#FFFFFF").replace("#", "");
  const assColor = `&H00${fc.slice(4,6)}${fc.slice(2,4)}${fc.slice(0,2)}`;
  const strokeColor = (captionStyle.strokeColor || "#000000").replace("#", "");
  const outlineColor = `&H00${strokeColor.slice(4,6)}${strokeColor.slice(2,4)}${strokeColor.slice(0,2)}`;
  const bgHex = (captionStyle.bgColor || "#000000").replace("#", "");
  const opacity = Math.max(0, Math.min(100, Number(captionStyle.bgOpacity ?? 60)));
  const alpha = Math.round(255 * (1 - opacity / 100)).toString(16).padStart(2, "0").toUpperCase();
  const backColor = `&H${alpha}${bgHex.slice(4,6)}${bgHex.slice(2,4)}${bgHex.slice(0,2)}`;
  const borderStyle = captionStyle.bgMode === "none" ? 1 : 4;
  const outline = Math.max(0, Number(captionStyle.stroke || 0));
  const shadow = captionStyle.shadow === "none" ? 0 : (captionStyle.shadow === "hard" ? 3 : 2);
  const marginV = Math.max(24, Number(captionStyle.marginV || 90));
  const outW = captionStyle.outputWidth || 1920;
  const outH = captionStyle.outputHeight || 1080;
  // ffmpeg 자막 필터: 백슬래시→슬래시, 콜론 이스케이프, 작은따옴표 이스케이프
  let escaped = srtPath.replace(/\\/g, "/");
  escaped = escaped.replace(/:/g, "\\:").replace(/'/g, "'\\''");
  // original_size로 폰트 크기 기준 해상도를 명시 (기본 384x288 스케일업 방지)
  return `subtitles='${escaped}':original_size=${outW}x${outH}:force_style='FontSize=${fontSize},PrimaryColour=${assColor},OutlineColour=${outlineColor},Bold=1,FontName=Malgun Gothic,BackColour=${backColor},BorderStyle=${borderStyle},Outline=${outline},MarginV=${marginV},Shadow=${shadow},Alignment=2'`;
}

function getOutputSize(aspect = "16:9", resolution = "1080") {
  const res = String(resolution || "1080");
  const base = res === "720" ? 720 : res === "2160" ? 2160 : 1080;
  if (aspect === "9:16") return { width: base, height: Math.round(base * 16 / 9 / 2) * 2 };
  if (aspect === "1:1") return { width: base, height: base };
  return { width: Math.round(base * 16 / 9 / 2) * 2, height: base };
}

function buildVideoLayoutFilters(aspect = "16:9", resolution = "1080") {
  const size = getOutputSize(aspect, resolution);
  const w = size.width;
  const h = size.height;
  if (aspect === "9:16") {
    return [`split=2[bg][fg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=24,eq=brightness=-0.08[bg];[fg]scale=${w}:-2:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`];
  }
  if (aspect === "1:1") {
    return [`split=2[bg][fg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=20,eq=brightness=-0.08[bg];[fg]scale=${w}:-2:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`];
  }
  return [`scale=${w}:${h}:force_original_aspect_ratio=decrease`, `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x000000`];
}

// 숏폼 렌더링 (로컬 ffmpeg)
let videoProcess = null;
let _videoJobId = 0; // 렌더링 작업 고유 ID

function killVideoProcess() {
  if (!videoProcess) return;
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(videoProcess.pid), "/T", "/F"], { stdio: "ignore" });
    else videoProcess.kill("SIGTERM");
  } catch {}
  videoProcess = null;
}

// drawtext 텍스트 이스케이프 (ffmpeg용)
function escDrawtext(text) {
  return String(text || "").replace(/\\/g, "\\\\\\\\").replace(/'/g, "'\\''").replace(/:/g, "\\:").replace(/;/g, "\\;");
}

ipcMain.handle("video:renderShorts", async (_, opts) => {
  if (videoProcess) return { ok: false, error: "이미 렌더링 중입니다. 취소 후 다시 시도해주세요." };
  const { inputPath, clips, outputDir, outputFileName, template, subtitlesEnabled, aspect, captionStyle, outputResolution, brandName, brandLogo } = opts;
  if (!inputPath || !fs.existsSync(inputPath)) return { ok: false, error: "입력 파일 없음" };
  if (!clips || !clips.length) return { ok: false, error: "렌더링할 클립이 없습니다" };

  const jobId = ++_videoJobId;
  const saveDir = outputDir || path.dirname(inputPath);
  const results = [];

  for (let ci = 0; ci < clips.length; ci++) {
    if (_videoJobId !== jobId) return { ok: false, error: "렌더링이 취소되었습니다" };

    const clip = clips[ci];
    const ss = clip.start_seconds || 0;
    const se = clip.end_seconds || 30;
    const duration = se - ss;
    if (duration <= 0) continue;

    const outName = clips.length === 1 && outputFileName
      ? outputFileName
      : (outputFileName ? outputFileName.replace(/\.mp4$/i, `_${ci + 1}.mp4`) : `short_${ci + 1}_${Date.now()}.mp4`);
    const outPath = path.join(saveDir, outName);

    // SRT
    const srtPath = path.join(os.tmpdir(), `makeit_short_${ci}_${jobId}.srt`);
    if (subtitlesEnabled && clip.subtitles?.length) {
      writeSrt(srtPath, clip.subtitles, ss, captionStyle || {});
    }

    // ffmpeg 필터
    const filters = buildVideoLayoutFilters(aspect || "9:16", outputResolution || "1080");
    const outputSize = getOutputSize(aspect || "9:16", outputResolution || "1080");

    // 자막 — fontSize는 프리뷰(캔버스 기준 1280px)와 동일 비율로 출력 해상도에 맞춤
    if (subtitlesEnabled && clip.subtitles?.length) {
      const cs = captionStyle || {};
      const fontSize = Math.max(10, Math.round((cs.fontSize || 38) * outputSize.width / 1280));
      const marginV = Math.max(24, Math.round(outputSize.height * 0.12));
      filters.push(buildSubFilter(srtPath, fontSize, cs.color || "#FFFFFF", Object.assign({}, cs, { marginV, outputWidth: outputSize.width, outputHeight: outputSize.height })));
    }

    // 제목 오버레이 (첫 3초, 페이드인/아웃)
    const hookText = clip.title || clip.hook || "";
    const descText = clip.description || "";
    if (hookText) {
      const titleSize = Math.max(10, Math.round(outputSize.width * 0.035));
      const descSize = Math.max(8, Math.round(outputSize.width * 0.022));
      const titleY = Math.round(outputSize.height * 0.12);
      // 제목 배경 박스 + 텍스트 (0~3초, 페이드)
      filters.push(`drawtext=text='${escDrawtext(hookText)}':fontfile='C\\:/Windows/Fonts/malgunbd.ttf':fontsize=${titleSize}:fontcolor=white:x=(w-tw)/2:y=${titleY}:enable='between(t,0.3,3)':alpha='if(lt(t,0.8),t/0.5,if(gt(t,2.5),(3-t)/0.5,1))':box=1:boxcolor=black@0.5:boxborderw=12`);
      if (descText) {
        filters.push(`drawtext=text='${escDrawtext(descText)}':fontfile='C\\:/Windows/Fonts/malgun.ttf':fontsize=${descSize}:fontcolor=white@0.8:x=(w-tw)/2:y=${titleY + titleSize + 10}:enable='between(t,0.5,3)':alpha='if(lt(t,1),t/0.5-1,if(gt(t,2.5),(3-t)/0.5,1))'`);
      }
    }

    // 브랜드 워터마크 (전체 구간, 우상단)
    if (brandName) {
      const brandSize = Math.max(7, Math.round(outputSize.width * 0.018));
      filters.push(`drawtext=text='${escDrawtext(brandName)}':fontfile='C\\:/Windows/Fonts/malgunbd.ttf':fontsize=${brandSize}:fontcolor=white@0.6:x=w-tw-20:y=20`);
    }

    filters.push(`fade=t=in:st=0:d=0.5,fade=t=out:st=${Math.max(0, duration - 0.5).toFixed(2)}:d=0.5`);

    const args = ["-ss", String(Math.max(0, ss)), "-to", String(se + 0.3), "-i", inputPath];
    // 로고 이미지 오버레이
    if (brandLogo && fs.existsSync(brandLogo)) {
      const logoH = Math.round(outputSize.height * 0.04);
      args.push("-i", brandLogo);
      // 로고를 리사이즈 후 우상단에 오버레이 (영상 필터 뒤에)
      const vfStr = filters.join(",");
      const logoFilter = `[1:v]scale=-1:${logoH}[logo];[0:v]${vfStr}[main];[main][logo]overlay=W-w-20:20`;
      args.push("-filter_complex", logoFilter);
    } else {
      args.push("-vf", filters.join(","));
    }
    args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", outPath);

    // 실행
    const ok = await new Promise((resolve) => {
      const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
      videoProcess = proc;
      let totalDur = duration;
      let stderrLog = "";
      proc.stderr.on("data", d => {
        const text = d.toString();
        stderrLog += text;
        const tm = text.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
        if (tm && totalDur > 0) {
          const cur = parseInt(tm[1])*3600 + parseInt(tm[2])*60 + parseInt(tm[3]) + parseInt(tm[4])/100;
          const clipPct = Math.min(100, Math.round(cur / totalDur * 100));
          const overallPct = Math.round(((ci + clipPct / 100) / clips.length) * 100);
          if (mainWindow) mainWindow.webContents.send("video:progress", { percent: overallPct, clip: ci + 1, total: clips.length });
        }
      });
      proc.on("close", code => {
        videoProcess = null;
        const success = code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000;
        if (!success && code !== 0) {
          const errMatch = stderrLog.match(/Error[^\n]*/i) || stderrLog.match(/Invalid[^\n]*/i);
          console.error(`[video:renderShorts] clip ${ci} failed (code=${code}):`, errMatch ? errMatch[0] : stderrLog.slice(-500));
        }
        resolve(success);
      });
      proc.on("error", (e) => { videoProcess = null; console.error("[video:renderShorts] spawn error:", e.message); resolve(false); });
    });

    try { fs.unlinkSync(srtPath); } catch {}
    if (ok) results.push({ index: ci, path: outPath, filename: outName });
  }

  if (mainWindow) mainWindow.webContents.send("video:progress", { percent: 100 });
  if (!results.length) return { ok: false, error: "모든 클립 렌더링에 실패했습니다" };
  return { ok: true, results };
});

// 롱폼 렌더링 (로컬 ffmpeg)
ipcMain.handle("video:renderLongform", async (_, opts) => {
  if (videoProcess) return { ok: false, error: "이미 렌더링 중입니다. 취소 후 다시 시도해주세요." };
  const { inputPath, subtitles, subtitlesEnabled, captionStyle, outputDir, outputFileName, aspect, outputResolution } = opts;
  if (!inputPath || !fs.existsSync(inputPath)) return { ok: false, error: "입력 파일 없음" };

  const jobId = ++_videoJobId;
  const saveDir = outputDir || path.dirname(inputPath);
  const outName = outputFileName || `longform_sub_${Date.now()}.mp4`;
  const outPath = path.join(saveDir, outName);

  const args = ["-i", inputPath];
  let srtCleanup = null;

  const filters = buildVideoLayoutFilters(aspect || "16:9", outputResolution || "1080");

  if (subtitlesEnabled && subtitles?.length) {
    const srtPath = path.join(os.tmpdir(), `makeit_long_${jobId}_${Date.now()}.srt`);
    writeSrt(srtPath, subtitles, 0, captionStyle || {});
    const cs = captionStyle || {};
    const outputSize = getOutputSize(aspect || "16:9", outputResolution || "1080");
    // fontSize는 프리뷰(캔버스 기준 1280px)와 동일 비율로 출력 해상도에 맞춤
    const fontSize = Math.max(10, Math.round((cs.fontSize || 38) * outputSize.width / 1280));
    const fontColor = cs.color || "#FFFFFF";
    const marginV = Math.max(24, Math.round(outputSize.height * 0.12));
    filters.push(buildSubFilter(srtPath, fontSize, fontColor, Object.assign({}, cs, { marginV, outputWidth: outputSize.width, outputHeight: outputSize.height })));
    srtCleanup = srtPath;
  }

  args.push("-vf", filters.join(","));
  args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", outPath);

  return new Promise((resolve) => {
    const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
    videoProcess = proc;
    let totalDur = 0;
    let stderrLog = "";
    proc.stderr.on("data", d => {
      const text = d.toString();
      stderrLog += text;
      const dm = text.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (dm) totalDur = parseInt(dm[1])*3600 + parseInt(dm[2])*60 + parseInt(dm[3]);
      const tm = text.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
      if (tm && totalDur > 0) {
        const cur = parseInt(tm[1])*3600 + parseInt(tm[2])*60 + parseInt(tm[3]);
        if (mainWindow) mainWindow.webContents.send("video:progress", { percent: Math.min(99, Math.round(cur / totalDur * 100)) });
      }
    });
    proc.on("close", code => {
      videoProcess = null;
      if (srtCleanup) try { fs.unlinkSync(srtCleanup); } catch {}
      if (mainWindow) mainWindow.webContents.send("video:progress", { percent: 100 });
      if (code === 0 && fs.existsSync(outPath)) {
        resolve({ ok: true, outputPath: outPath });
      } else {
        const errMatch = stderrLog.match(/Error[^\n]*/i) || stderrLog.match(/Invalid[^\n]*/i);
        const errMsg = errMatch ? errMatch[0].slice(0, 200) : "렌더링 실패 (code=" + code + ")";
        console.error("[video:renderLongform] failed:", errMsg);
        resolve({ ok: false, error: errMsg });
      }
    });
    proc.on("error", e => { videoProcess = null; console.error("[video:renderLongform] spawn error:", e.message); resolve({ ok: false, error: e.message }); });
  });
});

// 렌더링 취소
ipcMain.handle("video:cancel", () => {
  if (videoProcess) {
    _videoJobId++; // 진행 중인 루프 중단
    killVideoProcess();
    return { ok: true };
  }
  return { ok: false };
});
