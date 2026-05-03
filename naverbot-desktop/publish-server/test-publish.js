const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("=== 메이킷 자동 발행 테스트 ===\n");

  const browser = await chromium.launch({ headless: false, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "ko-KR",
  });

  // 저장된 쿠키 복원
  const cookiePath = path.join(__dirname, "profiles", "npermovie", "cookies.json");
  if (fs.existsSync(cookiePath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf8"));
      await context.addCookies(cookies);
      console.log("[쿠키] 저장된 쿠키 복원:", cookies.length + "개");
    } catch {}
  }

  const page = await context.newPage();

  // 1. 네이버 로그인 확인
  console.log("[1] 네이버 로그인 페이지 접속...");
  await page.goto("https://nid.naver.com/nidlogin.login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("nidlogin")) {
    console.log("[2] 로그인 필요 - 아이디/비밀번호 입력...");
    await page.evaluate(() => {
      const i = document.querySelector("#id");
      const p = document.querySelector("#pw");
      if (i) { i.value = "npermovie"; i.dispatchEvent(new Event("input", { bubbles: true })); }
      if (p) { p.value = "dlsdud12!@"; p.dispatchEvent(new Event("input", { bubbles: true })); }
    });
    await page.waitForTimeout(500);

    const loginBtn = await page.$(".btn_login, button[type='submit']");
    if (loginBtn) await loginBtn.click();
    console.log("[2] 로그인 버튼 클릭");

    // 로그인 대기 (캡차 나오면 수동 해결)
    console.log("[3] 로그인 대기 중... (캡차가 나오면 브라우저에서 직접 해결해주세요)");
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000);
      const url = page.url();
      if (!url.includes("nidlogin") && !url.includes("captcha") && !url.includes("deviceConfirm")) {
        console.log("[3] 로그인 성공!");
        break;
      }
      if (i % 10 === 0 && i > 0) console.log("    " + i + "초 대기... URL: " + url.slice(0, 60));
    }
  } else {
    console.log("[1] 이미 로그인됨!");
  }

  // 쿠키 저장
  const cookies = await context.cookies();
  fs.mkdirSync(path.dirname(cookiePath), { recursive: true });
  fs.writeFileSync(cookiePath, JSON.stringify(cookies));
  console.log("[쿠키] 저장 완료:", cookies.length + "개");

  // 2. 글쓰기 페이지
  console.log("\n[4] 글쓰기 페이지 열기...");
  await page.goto("https://blog.naver.com/npermovie/postwrite", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  console.log("[4] URL:", page.url());

  // 팝업 닫기
  try {
    await page.evaluate(() => {
      document.querySelectorAll(".se-popup-button-cancel, .se-popup-alert button").forEach(b => { try { b.click(); } catch {} });
      document.querySelectorAll(".se-popup, .se-popup-dim").forEach(el => { try { el.remove(); } catch {} });
    });
  } catch {}
  await page.waitForTimeout(1000);

  // 카테고리 확인
  console.log("[5] 카테고리 확인...");
  const catBtn = await page.$(".se-category-button, button[class*='category']");
  if (catBtn) {
    const catText = await catBtn.textContent();
    console.log("    현재 카테고리:", catText);
  } else {
    console.log("    카테고리 버튼 못 찾음");
  }

  // 3. 제목 입력
  console.log("[6] 제목 입력...");
  const titleEl = await page.$(".se-documentTitle .se-text-paragraph");
  if (titleEl) {
    await titleEl.click();
    await page.waitForTimeout(300);
    await page.keyboard.type("자동화 테스트 - 메이킷 SNS 자동화", { delay: 20 });
    console.log("    제목 입력 완료!");
  } else {
    console.log("    제목 필드 못 찾음!");
    await page.screenshot({ path: "debug_no_title.png" });
  }

  // 4. 본문 입력
  console.log("[7] 본문 입력...");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  const paragraphs = [
    "안녕하세요! 이 글은 메이킷 SNS 자동화 테스트로 작성된 글이에요.",
    "자동화 시스템이 정상적으로 동작하는지 확인하기 위한 테스트 글입니다.",
    "이 글은 확인 후 삭제할 예정이에요.",
  ];

  for (const p of paragraphs) {
    await page.keyboard.type(p, { delay: 5 });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
  }
  console.log("    본문 입력 완료!");

  await page.screenshot({ path: "test_written.png" });
  console.log("[8] 스크린샷 저장: test_written.png");

  console.log("\n=== 테스트 완료! ===");
  console.log("브라우저에서 결과를 확인하세요.");
  console.log("발행하지 않았습니다. 수동으로 확인 후 발행/삭제해주세요.");
  console.log("60초 후 자동 종료...");

  await page.waitForTimeout(60000);
  await browser.close();
})().catch(e => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
