// 메이킷 SNS 자동 발행 서버 v4
// Render.com 배포용 - Stealth + 영구 쿠키 + 캡차 대화형

const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 10000;
const PROFILES_DIR = path.join(__dirname, "profiles");
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });

// 활성 브라우저 세션
const activeSessions = {};

function profileDir(id) {
  const dir = path.join(PROFILES_DIR, (id || "").replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanId(id) { return (id || "").replace(/@.*$/, "").trim(); }

function shot(page) { return page.screenshot({ type: "jpeg", quality: 55 }).then(b => b.toString("base64")); }

function cookiePath(id) { return path.join(profileDir(id), "cookies.json"); }

function loadCookies(id) {
  const p = cookiePath(id);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function saveCookies(id, cookies) {
  fs.writeFileSync(cookiePath(id), JSON.stringify(cookies), "utf8");
}

// Stealth 브라우저 생성
async function createBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1280,900",
    ],
  });
}

async function createContext(browser, naverId) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });

  // Stealth: webdriver 감지 우회
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko", "en-US", "en"] });
    window.chrome = { runtime: {} };
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (params) =>
      params.name === "notifications" ? Promise.resolve({ state: Notification.permission }) : origQuery(params);
  });

  // 쿠키 복원
  const cookies = loadCookies(naverId);
  if (cookies) {
    try { await ctx.addCookies(cookies); } catch {}
  }

  return ctx;
}

// 세션 정리 (3분 타임아웃)
function scheduleCleanup(sid, ms = 180000) {
  if (activeSessions[sid]?.timer) clearTimeout(activeSessions[sid].timer);
  activeSessions[sid].timer = setTimeout(async () => {
    try { await activeSessions[sid]?.browser?.close(); } catch {}
    delete activeSessions[sid];
  }, ms);
}

app.get("/", (req, res) => res.json({ ok: true, v: "4" }));
app.get("/health", (req, res) => res.json({ ok: true }));

// ═══════════════════════════════════
// 네이버 로그인
// ═══════════════════════════════════
app.post("/api/naver-login", async (req, res) => {
  const { naver_id, naver_pw } = req.body;
  if (!naver_id || !naver_pw) return res.status(400).json({ ok: false, error: "아이디/비밀번호 필수" });

  let browser;
  try {
    browser = await createBrowser();
    const ctx = await createContext(browser, naver_id);
    const page = await ctx.newPage();
    const steps = [];

    await page.goto("https://nid.naver.com/nidlogin.login", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    steps.push({ step: "로그인 페이지 접속", screenshot: await shot(page) });

    // 이미 로그인됨
    if (!page.url().includes("nidlogin")) {
      saveCookies(naver_id, await ctx.cookies());
      steps.push({ step: "이미 로그인되어 있습니다", screenshot: await shot(page) });
      await browser.close();
      return res.json({ ok: true, loggedIn: true, steps });
    }

    // 아이디/비밀번호 JS 주입
    await page.evaluate(([id, pw]) => {
      const idEl = document.querySelector("#id");
      const pwEl = document.querySelector("#pw");
      if (idEl) { idEl.focus(); idEl.value = id; idEl.dispatchEvent(new Event("input", { bubbles: true })); }
      if (pwEl) { pwEl.focus(); pwEl.value = pw; pwEl.dispatchEvent(new Event("input", { bubbles: true })); }
    }, [naver_id, naver_pw]);
    await page.waitForTimeout(800);
    steps.push({ step: "계정 정보 입력", screenshot: await shot(page) });

    // 로그인 클릭
    const btn = await page.$(".btn_login, #log\\.login, button[type='submit']");
    if (btn) await btn.click();
    await page.waitForTimeout(4000);
    steps.push({ step: "로그인 시도 중...", screenshot: await shot(page) });

    // 결과 확인
    for (let i = 0; i < 8; i++) {
      const url = page.url();
      if (!url.includes("nidlogin") && !url.includes("captcha") && !url.includes("deviceConfirm") && !url.includes("nid.naver.com")) {
        saveCookies(naver_id, await ctx.cookies());
        steps.push({ step: "로그인 성공!", screenshot: await shot(page) });
        await browser.close();
        return res.json({ ok: true, loggedIn: true, steps });
      }
      await page.waitForTimeout(1000);
    }

    // 캡차/2차인증 → 세션 유지
    const sid = crypto.randomUUID();
    activeSessions[sid] = { browser, ctx, page, naverId: naver_id, naverPw: naver_pw };
    scheduleCleanup(sid);
    steps.push({ step: "추가 인증이 필요합니다", screenshot: await shot(page) });

    return res.json({
      ok: false, loggedIn: false, needInput: true, sessionId: sid,
      inputHint: "화면에 보이는 정답/인증코드를 입력해주세요",
      steps,
    });

  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══════════════════════════════════
// 캡차/2차인증 입력
// ═══════════════════════════════════
app.post("/api/naver-input", async (req, res) => {
  const { sessionId, value } = req.body;
  const s = activeSessions[sessionId];
  if (!s) return res.status(400).json({ ok: false, error: "세션 만료" });

  const { browser, ctx, page, naverId, naverPw } = s;
  const steps = [];

  try {
    if (value) {
      // 캡차 전용 입력 필드 찾기 (ID/PW 제외)
      const filled = await page.evaluate((val) => {
        // 캡차 입력란 후보
        const selectors = [
          "input[id*='captcha']", "input[name*='captcha']",
          "input[placeholder*='정답']", "input[placeholder*='입력']",
          "#deviceConfirmCode", "input[name='code']",
          "input[placeholder*='인증']", "input[placeholder*='코드']",
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.focus(); el.value = val;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
        }
        // 폴백: ID/PW가 아닌 visible input
        const inputs = document.querySelectorAll("input");
        for (const inp of inputs) {
          if (inp.offsetParent === null) continue;
          const id = inp.id || "", name = inp.name || "", type = inp.type || "";
          if (id === "id" || id === "pw" || name === "id" || name === "pw" || type === "password" || type === "hidden") continue;
          inp.focus(); inp.value = val;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      }, value);

      // 비밀번호 비어있으면 다시 채우기
      await page.evaluate((pw) => {
        const pwEl = document.querySelector("#pw");
        if (pwEl && !pwEl.value) {
          pwEl.value = pw;
          pwEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, naverPw);

      await page.waitForTimeout(500);
      steps.push({ step: "정답 입력 완료", screenshot: await shot(page) });

      // 제출 버튼 클릭
      const clicked = await page.evaluate(() => {
        const btns = document.querySelectorAll("button[type='submit'], .btn_login, button");
        for (const btn of btns) {
          const txt = (btn.textContent || "").trim();
          if (btn.offsetParent !== null && (txt.includes("로그인") || txt.includes("확인") || btn.type === "submit")) {
            btn.click(); return true;
          }
        }
        return false;
      });
      await page.waitForTimeout(4000);
      steps.push({ step: "제출 완료", screenshot: await shot(page) });
    }

    // 로그인 확인
    for (let i = 0; i < 8; i++) {
      const url = page.url();
      if (!url.includes("nidlogin") && !url.includes("captcha") && !url.includes("deviceConfirm") && !url.includes("nid.naver.com")) {
        saveCookies(naverId, await ctx.cookies());
        steps.push({ step: "로그인 성공!", screenshot: await shot(page) });
        await browser.close();
        delete activeSessions[sessionId];
        return res.json({ ok: true, loggedIn: true, steps });
      }
      await page.waitForTimeout(1000);
    }

    // 아직 인증 필요
    scheduleCleanup(sessionId);
    steps.push({ step: "추가 입력이 필요합니다", screenshot: await shot(page) });
    return res.json({ ok: false, loggedIn: false, needInput: true, sessionId, steps });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, steps });
  }
});

// ═══════════════════════════════════
// 블로그 글 발행
// ═══════════════════════════════════
app.post("/api/publish", async (req, res) => {
  const { naver_id, naver_pw, title, body, tags, category } = req.body;
  if (!naver_id || !title || !body) return res.status(400).json({ ok: false, error: "필수 항목 누락" });

  const blogId = cleanId(naver_id);
  let browser;

  try {
    browser = await createBrowser();
    const ctx = await createContext(browser, naver_id);
    const page = await ctx.newPage();
    const steps = [];

    // 1. 로그인 확인
    await page.goto("https://nid.naver.com/nidlogin.login", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    if (page.url().includes("nidlogin")) {
      if (!naver_pw) {
        await browser.close();
        return res.json({ ok: false, error: "먼저 '로그인 확인'을 진행해주세요.", needLogin: true });
      }
      await page.evaluate(([id, pw]) => {
        const i = document.querySelector("#id"), p = document.querySelector("#pw");
        if (i) { i.focus(); i.value = id; i.dispatchEvent(new Event("input", { bubbles: true })); }
        if (p) { p.focus(); p.value = pw; p.dispatchEvent(new Event("input", { bubbles: true })); }
      }, [naver_id, naver_pw]);
      await page.waitForTimeout(500);
      const btn = await page.$(".btn_login, button[type='submit']");
      if (btn) await btn.click();

      let loggedIn = false;
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(1000);
        if (!page.url().includes("nidlogin")) { loggedIn = true; break; }
      }
      if (!loggedIn) {
        steps.push({ step: "로그인 실패", screenshot: await shot(page) });
        await browser.close();
        return res.json({ ok: false, error: "로그인 실패. 먼저 '로그인 확인'으로 인증해주세요.", steps });
      }
      saveCookies(naver_id, await ctx.cookies());
    }
    steps.push({ step: "로그인 완료", screenshot: await shot(page) });

    // 2. 글쓰기 페이지
    await page.goto(`https://blog.naver.com/${blogId}/postwrite`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(5000);

    // 리다이렉트 확인
    if (page.url().includes("nidlogin")) {
      steps.push({ step: "글쓰기 접근 실패 (로그인 필요)", screenshot: await shot(page) });
      await browser.close();
      return res.json({ ok: false, error: "블로그 글쓰기 접근 실패. 다시 로그인해주세요.", steps });
    }

    // 팝업 닫기
    await page.evaluate(() => {
      document.querySelectorAll(".se-popup-button-cancel,.se-popup-alert button").forEach(b => { try { b.click(); } catch {} });
      document.querySelectorAll(".se-popup,.se-popup-dim").forEach(el => { try { el.remove(); } catch {} });
    }).catch(() => {});
    await page.waitForTimeout(1500);
    steps.push({ step: "글쓰기 페이지 열림", screenshot: await shot(page) });

    // 3. 카테고리 선택
    if (category) {
      try {
        const catBtn = await page.$(".se-category-button, button[class*='category']");
        if (catBtn) {
          await catBtn.click();
          await page.waitForTimeout(1000);
          await page.evaluate((cat) => {
            const items = document.querySelectorAll("li[data-category-no], .se-category-list li, ul[class*='category'] li");
            for (const el of items) {
              if ((el.textContent || "").trim().includes(cat)) { el.click(); return; }
            }
          }, category);
          await page.waitForTimeout(500);
          steps.push({ step: `카테고리: ${category}`, screenshot: await shot(page) });
        }
      } catch {}
    }

    // 4. 제목 입력
    const titleEl = await page.$(".se-documentTitle .se-text-paragraph");
    if (titleEl) {
      await titleEl.click();
      await page.waitForTimeout(300);
      await page.keyboard.type(title, { delay: 15 });
      steps.push({ step: "제목 입력 완료", screenshot: await shot(page) });
    } else {
      steps.push({ step: "제목 필드를 찾지 못했습니다", screenshot: await shot(page) });
    }

    // 5. 본문 입력
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    const paras = body.split("\n\n");
    for (const p of paras) {
      const t = p.trim();
      if (!t) continue;
      await page.keyboard.type(t, { delay: 2 });
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(30);
    }
    steps.push({ step: "본문 입력 완료", screenshot: await shot(page) });

    // 6. 태그
    if (tags) {
      try {
        const tagArea = await page.$(".se-tag-label, button[class*='tag'], .se-section-tag");
        if (tagArea) {
          await tagArea.click();
          await page.waitForTimeout(500);
          for (const t of tags.split(",")) {
            const tag = t.trim().replace("#", "");
            if (!tag) continue;
            const inp = await page.$(".se-tag-input input, input[placeholder*='태그']");
            if (inp) { await inp.fill(tag); await page.keyboard.press("Enter"); await page.waitForTimeout(150); }
          }
          steps.push({ step: "태그 입력 완료", screenshot: await shot(page) });
        }
      } catch {}
    }

    // 7. 발행 버튼
    let published = false;
    try {
      // 발행 버튼 찾기
      const pubBtn = await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const b of btns) {
          const txt = (b.textContent || "").trim();
          if (b.offsetParent !== null && (txt === "발행" || txt.includes("공개발행"))) {
            b.click(); return true;
          }
        }
        return false;
      });
      if (pubBtn) {
        await page.waitForTimeout(2000);
        // 발행 확인 팝업
        await page.evaluate(() => {
          const btns = document.querySelectorAll("button");
          for (const b of btns) {
            const txt = (b.textContent || "").trim();
            if (b.offsetParent !== null && (txt === "발행" || txt === "확인")) { b.click(); return; }
          }
        });
        await page.waitForTimeout(3000);
        published = true;
      }
    } catch {}

    const finalUrl = page.url();
    steps.push({ step: published ? "발행 완료!" : "글 작성 완료", screenshot: await shot(page) });

    saveCookies(naver_id, await ctx.cookies());
    const blogUrl = finalUrl.includes("postwrite") ? `https://blog.naver.com/${blogId}` : finalUrl;

    await browser.close();
    return res.json({ ok: true, published, message: published ? "네이버 블로그에 발행 완료!" : "글 작성 완료. 블로그에서 확인해주세요.", url: blogUrl, steps });

  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══════════════════════════════════
// 블로그 카테고리 목록
// ═══════════════════════════════════
app.post("/api/blog-categories", async (req, res) => {
  const { naver_id } = req.body;
  if (!naver_id) return res.json({ ok: true, categories: [] });

  let browser;
  try {
    browser = await createBrowser();
    const ctx = await createContext(browser, naver_id);
    const page = await ctx.newPage();
    const blogId = cleanId(naver_id);

    await page.goto(`https://blog.naver.com/${blogId}/postwrite`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(5000);

    if (page.url().includes("nidlogin")) {
      await browser.close();
      return res.json({ ok: true, categories: [] });
    }

    // 팝업 닫기
    await page.evaluate(() => {
      document.querySelectorAll(".se-popup-button-cancel,.se-popup-alert button").forEach(b => { try { b.click(); } catch {} });
      document.querySelectorAll(".se-popup,.se-popup-dim").forEach(el => { try { el.remove(); } catch {} });
    }).catch(() => {});
    await page.waitForTimeout(1000);

    const catBtn = await page.$(".se-category-button, button[class*='category']");
    if (catBtn) await catBtn.click();
    await page.waitForTimeout(1000);

    const categories = await page.evaluate(() => {
      const items = document.querySelectorAll("li[data-category-no], .se-category-list li, ul[class*='category'] li");
      return Array.from(items).map(el => ({
        name: (el.textContent || "").trim(),
        value: el.getAttribute("data-category-no") || "",
      })).filter(c => c.name && !c.name.includes("카테고리") && c.name.length < 30);
    });

    await browser.close();
    return res.json({ ok: true, categories });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    return res.json({ ok: true, categories: [] });
  }
});

app.listen(PORT, () => console.log(`[메이킷 발행 서버 v4] http://localhost:${PORT}`));
