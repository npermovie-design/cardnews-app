// NaverBot Electron - main process
// - BrowserWindow 생성
// - 설정 저장/로드
// - Python runner.py 서브프로세스 실행
// - Custom protocol makeit-sns:// 핸들링 (브라우저 OAuth 콜백)

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
  app.setName("메이킷 SNS자동화 Local");
}

// ── Custom protocol 등록 ──
const PROTOCOL = "makeit-sns";
if (!IS_LOCAL_DEV_INSTANCE && process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else if (!IS_LOCAL_DEV_INSTANCE) {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ── Single instance ── (protocol deep link 처리)
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
    if (["style.css", "app.js"].includes(fileName)) {
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
  mainWindow = new BrowserWindow({
    width: Math.min(1200, screenW),
    height: screenH,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "메이킷 SNS 자동화",
    backgroundColor: "#f9fafb",
  });

  // 핫 업데이트 캐시 인터셉터 (loadFile 전에 설정)
  setupHotCacheInterceptor(mainWindow);

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(async () => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // 초기 실행 시 process.argv에 protocol URL이 있으면 처리
  handleProtocolArgs(process.argv);

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
        shell.openExternal(data.download_url || "https://snsmakeit.com/automation");
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

// ── Protocol URL 파싱 + 렌더러에 전달 ──
function parseProtocolUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== `${PROTOCOL}:`) return null;
    const params = {};
    u.searchParams.forEach((v, k) => (params[k] = v));
    return params;
  } catch {
    return null;
  }
}

function handleAuthCallback(params) {
  if (!params) return;
  // URL params에 email/uid가 없으면 access_token JWT 디코드로 추출
  if (params.access_token && (!params.email || !params.uid)) {
    try {
      const parts = params.access_token.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        if (!params.email) params.email = payload.email || "";
        if (!params.uid) params.uid = payload.sub || "";
      }
    } catch (e) {
      console.error("[auth] JWT decode 실패:", e);
    }
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send("auth:callback", params);
  }
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
  }
}

function handleProtocolArgs(argv) {
  const url = (argv || []).find((a) => typeof a === "string" && a.startsWith(`${PROTOCOL}://`));
  if (url) handleAuthCallback(parseProtocolUrl(url));
}

app.on("second-instance", (event, argv) => {
  // Windows: protocol 클릭 시 두 번째 인스턴스가 argv에 URL 갖고 시작됨
  handleProtocolArgs(argv);
});

app.on("open-url", (event, url) => {
  // macOS
  event.preventDefault();
  handleAuthCallback(parseProtocolUrl(url));
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

// ── IPC: 체험 횟수 (별도 파일) ──
const TRIAL_PATH = path.join(CONFIG_DIR, "trial_used.txt");
ipcMain.handle("trial:get", () => {
  try {
    if (fs.existsSync(TRIAL_PATH)) return parseInt(fs.readFileSync(TRIAL_PATH, "utf8").trim()) || 0;
  } catch {}
  return 0;
});
ipcMain.handle("trial:set", (_, n) => {
  try {
    ensureConfigDir();
    fs.writeFileSync(TRIAL_PATH, String(n), "utf8");
  } catch {}
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
      download_url: data.download_url || "https://snsmakeit.com/pricing",
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
    const py = spawn(getPythonPath(), ["-c",
      `import keyring, sys; keyring.set_password(sys.argv[1], sys.argv[2], sys.argv[3]); print('ok')`,
      svc, username, password,
    ], { env: getPythonEnv() });
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

// ── IPC: 외부 링크 ──
ipcMain.handle("shell:openExternal", (_, url) => {
  // file:// 경로면 shell.openPath 사용 (폴더/파일 열기)
  if (url && url.startsWith("file:///")) {
    const localPath = decodeURIComponent(url.replace("file:///", "")).replace(/\//g, path.sep);
    return shell.openPath(localPath);
  }
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
    const params = new URLSearchParams(hash);
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
ipcMain.on("auth:google", () => {
  const SUPABASE_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
  const redirectTo = "https://snsmakeit.com/naverbot-callback";
  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  shell.openExternal(authUrl);
});

ipcMain.on("auth:openExternal", (_, url) => shell.openExternal(url));

// ═══════════════════════════════════════════════════════════
// 영상 편집 — 로컬 ffmpeg 처리
// ═══════════════════════════════════════════════════════════

function getFfmpegPath() {
  try { const p = require("ffmpeg-static"); if (p && fs.existsSync(p)) return p; } catch {}
  return "ffmpeg";
}
function getFfprobePath() {
  try { const p = require("ffprobe-static"); if (p?.path && fs.existsSync(p.path)) return p.path; } catch {}
  return "ffprobe";
}

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
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) resolve();
        else reject(new Error("오디오 추출 실패"));
      });
      proc.on("error", (e) => reject(e));
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
        "--max-time", "180",
      ], { windowsHide: true, maxBuffer: 50 * 1024 * 1024 });
      const chunks = [];
      proc.stdout.on("data", d => chunks.push(d.toString()));
      proc.on("close", code => {
        try { fs.unlinkSync(tmpReq); } catch {}
        const raw = chunks.join("");
        console.log("[video:whisper] exit:", code, "len:", raw.length);
        try {
          const lines = raw.trim().split("\n");
          const httpCode = parseInt(lines[lines.length - 1]);
          const body = lines.slice(0, -1).join("\n");
          const data = JSON.parse(body);
          resolve({ ok: httpCode >= 200 && httpCode < 300, data, httpCode });
        } catch { resolve({ ok: false, error: "음성 인식 응답 파싱 실패" }); }
      });
      proc.on("error", (e) => resolve({ ok: false, error: e.message }));
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
    properties: ["openFile"],
    filters: [{ name: "영상", extensions: ["mp4", "mov", "avi", "mkv", "webm"] }],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false };
  return { ok: true, filePath: r.filePaths[0] };
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

// ffprobe 영상 정보
ipcMain.handle("video:probe", async (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return { ok: false, error: "파일 없음" };
  return new Promise((resolve) => {
    const proc = spawn(getFfprobePath(), ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath], { windowsHide: true });
    const chunks = [];
    proc.stdout.on("data", d => chunks.push(d.toString()));
    proc.on("close", () => {
      try {
        const data = JSON.parse(chunks.join(""));
        const vs = (data.streams || []).find(s => s.codec_type === "video");
        resolve({ ok: true, duration: parseFloat(data.format?.duration || 0), width: vs?.width || 0, height: vs?.height || 0, size: parseInt(data.format?.size || 0) });
      } catch (e) { resolve({ ok: false, error: e.message }); }
    });
    proc.on("error", e => resolve({ ok: false, error: e.message }));
  });
});

// SRT 파일 생성 헬퍼
function writeSrt(srtPath, subs, offset = 0) {
  const fmt = (s) => { s = Math.max(0, s); const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); const ms = Math.round((s%1)*1000); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`; };
  let content = "";
  subs.forEach((sub, i) => {
    const start = (sub.start_seconds ?? sub.start ?? 0) - offset;
    const end = (sub.end_seconds ?? sub.end ?? start + 2) - offset;
    content += `${i+1}\n${fmt(Math.max(0,start))} --> ${fmt(Math.max(0.1,end))}\n${sub.text || ""}\n\n`;
  });
  fs.writeFileSync(srtPath, content, "utf8");
}

// ffmpeg 자막 필터 생성 헬퍼
function buildSubFilter(srtPath, fontSize, fontColor) {
  const fc = (fontColor || "#FFFFFF").replace("#", "");
  const assColor = `&H00${fc.slice(4,6)}${fc.slice(2,4)}${fc.slice(0,2)}`;
  const escaped = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  return `subtitles='${escaped}':force_style='FontSize=${fontSize},PrimaryColour=${assColor},Bold=1,FontName=Malgun Gothic,BackColour=&H99000000,BorderStyle=4,MarginV=30,Shadow=2'`;
}

// 숏폼 렌더링 (로컬 ffmpeg)
let videoProcess = null;

ipcMain.handle("video:renderShorts", async (_, opts) => {
  if (videoProcess) return { ok: false, error: "이미 렌더링 중" };
  const { inputPath, clips, outputDir, template, subtitlesEnabled } = opts;
  if (!inputPath || !fs.existsSync(inputPath)) return { ok: false, error: "입력 파일 없음" };

  const saveDir = outputDir || path.dirname(inputPath);
  const results = [];

  for (let ci = 0; ci < clips.length; ci++) {
    const clip = clips[ci];
    const ss = clip.start_seconds || 0;
    const se = clip.end_seconds || 30;
    const duration = se - ss;
    const outName = `short_${ci + 1}_${Date.now()}.mp4`;
    const outPath = path.join(saveDir, outName);

    // SRT
    const srtPath = path.join(os.tmpdir(), `makeit_short_${ci}.srt`);
    if (subtitlesEnabled && clip.subtitles?.length) {
      writeSrt(srtPath, clip.subtitles, ss);
    }

    // ffmpeg 필터
    const filters = [];
    filters.push("scale=1080:-2:force_original_aspect_ratio=decrease");
    filters.push("pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x000000");

    // 제목
    if (clip.title) {
      const safeTitle = clip.title.replace(/'/g, "\\'").replace(/:/g, "\\:");
      filters.push(`drawtext=text='${safeTitle}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=80:shadowcolor=black:shadowx=2:shadowy=2:box=1:boxcolor=black@0.6:boxborderw=12`);
    }

    // 자막
    if (subtitlesEnabled && clip.subtitles?.length) {
      filters.push(buildSubFilter(srtPath, 38, "#FFFFFF"));
    }

    filters.push(`fade=t=in:st=0:d=0.5,fade=t=out:st=${Math.max(0, duration - 0.5).toFixed(2)}:d=0.5`);

    const args = ["-ss", String(Math.max(0, ss)), "-to", String(se + 0.3), "-i", inputPath,
      "-vf", filters.join(","), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", outPath];

    // 실행
    const ok = await new Promise((resolve) => {
      const proc = spawn(getFfmpegPath(), args, { windowsHide: true });
      videoProcess = proc;
      let totalDur = duration;
      proc.stderr.on("data", d => {
        const text = d.toString();
        const tm = text.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
        if (tm && totalDur > 0) {
          const cur = parseInt(tm[1])*3600 + parseInt(tm[2])*60 + parseInt(tm[3]) + parseInt(tm[4])/100;
          const clipPct = Math.min(100, Math.round(cur / totalDur * 100));
          const overallPct = Math.round(((ci + clipPct / 100) / clips.length) * 100);
          if (mainWindow) mainWindow.webContents.send("video:progress", { percent: overallPct, clip: ci + 1, total: clips.length });
        }
      });
      proc.on("close", code => { videoProcess = null; resolve(code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000); });
      proc.on("error", () => { videoProcess = null; resolve(false); });
    });

    try { fs.unlinkSync(srtPath); } catch {}
    if (ok) results.push({ index: ci, path: outPath, filename: outName });
  }

  if (mainWindow) mainWindow.webContents.send("video:progress", { percent: 100 });
  return { ok: true, results };
});

// 롱폼 렌더링 (로컬 ffmpeg)
ipcMain.handle("video:renderLongform", async (_, opts) => {
  if (videoProcess) return { ok: false, error: "이미 렌더링 중" };
  const { inputPath, subtitles, subtitlesEnabled, captionStyle, outputDir } = opts;
  if (!inputPath || !fs.existsSync(inputPath)) return { ok: false, error: "입력 파일 없음" };

  const saveDir = outputDir || path.dirname(inputPath);
  const outPath = path.join(saveDir, `longform_sub_${Date.now()}.mp4`);

  const args = ["-i", inputPath];

  if (subtitlesEnabled && subtitles?.length) {
    const srtPath = path.join(os.tmpdir(), `makeit_long_${Date.now()}.srt`);
    writeSrt(srtPath, subtitles, 0);
    const cs = captionStyle || {};
    const fontSize = cs.fontSize || 18;
    const fontColor = cs.color || "#FFFFFF";
    args.push("-vf", buildSubFilter(srtPath, fontSize, fontColor));
    // 렌더 후 SRT 정리
    args._srtPath = srtPath;
  }

  args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-y", outPath);

  return new Promise((resolve) => {
    const proc = spawn(getFfmpegPath(), args.filter(a => typeof a === "string"), { windowsHide: true });
    videoProcess = proc;
    let totalDur = 0;
    proc.stderr.on("data", d => {
      const text = d.toString();
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
      if (args._srtPath) try { fs.unlinkSync(args._srtPath); } catch {}
      if (mainWindow) mainWindow.webContents.send("video:progress", { percent: 100 });
      if (code === 0 && fs.existsSync(outPath)) resolve({ ok: true, outputPath: outPath });
      else resolve({ ok: false, error: "렌더링 실패" });
    });
    proc.on("error", e => { videoProcess = null; resolve({ ok: false, error: e.message }); });
  });
});

// 렌더링 취소
ipcMain.handle("video:cancel", () => {
  if (videoProcess) {
    try { if (process.platform === "win32") spawn("taskkill", ["/pid", String(videoProcess.pid), "/T", "/F"], { stdio: "ignore" }); else videoProcess.kill("SIGTERM"); } catch {}
    videoProcess = null;
    return { ok: true };
  }
  return { ok: false };
});
