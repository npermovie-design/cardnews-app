"""실제 네이버 로그인 + 쿠키 저장 테스트 (headless=False, 캡차 수동 해결)"""
import asyncio
from playwright.async_api import async_playwright
from naver_publisher import _save_cookies_to_db, _load_cookies_from_db, STEALTH_SCRIPT

NAVER_ID = "npermovie"
NAVER_PW = "dlsdud12!@"

async def main():
    print("=== 네이버 로그인 + 쿠키 저장 테스트 ===\n")

    # 1. Supabase에서 기존 쿠키 로드
    saved = await _load_cookies_from_db(NAVER_ID)
    print(f"[1] 저장된 쿠키: {len(saved) if saved else 0}개")

    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=False, args=["--no-sandbox", "--disable-blink-features=AutomationControlled"])
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 900},
        locale="ko-KR",
        timezone_id="Asia/Seoul",
    )
    await context.add_init_script(STEALTH_SCRIPT)

    # 쿠키 복원
    if saved:
        try:
            await context.add_cookies(saved)
            print("[2] 쿠키 복원 완료")
        except Exception as e:
            print(f"[2] 쿠키 복원 실패: {e}")

    page = await context.new_page()

    # 2. 로그인 페이지
    await page.goto("https://nid.naver.com/nidlogin.login", timeout=15000)
    await page.wait_for_timeout(2000)

    if "nidlogin" not in page.url:
        print("[3] 쿠키로 자동 로그인 성공!")
    else:
        print("[3] 로그인 필요 - 아이디/비밀번호 입력...")
        await page.evaluate("""([id, pw]) => {
            const i = document.querySelector('#id'), p = document.querySelector('#pw');
            if (i) { i.focus(); i.value = id; i.dispatchEvent(new Event('input', {bubbles:true})); }
            if (p) { p.focus(); p.value = pw; p.dispatchEvent(new Event('input', {bubbles:true})); }
        }""", [NAVER_ID, NAVER_PW])
        await page.wait_for_timeout(500)

        try:
            await page.click(".btn_login, button[type='submit']", timeout=3000)
        except:
            pass

        print("[3] 캡차가 나오면 브라우저에서 직접 해결해주세요...")
        print("    (최대 60초 대기)")
        for i in range(60):
            await page.wait_for_timeout(1000)
            if "nidlogin" not in page.url and "captcha" not in page.url.lower():
                print(f"[3] 로그인 성공! ({i+1}초)")
                break
            if i % 10 == 0 and i > 0:
                print(f"    {i}초 대기... URL: {page.url[:60]}")
        else:
            print("[3] 로그인 타임아웃")
            await browser.close()
            return

    # 3. 쿠키 Supabase에 저장
    cookies = await context.cookies()
    print(f"\n[4] 쿠키 {len(cookies)}개 Supabase에 저장 중...")
    await _save_cookies_to_db(NAVER_ID, cookies)
    print("[4] 저장 완료!")

    # 4. 검증: 블로그 글쓰기 페이지 접근
    print(f"\n[5] 블로그 글쓰기 페이지 접근...")
    await page.goto(f"https://blog.naver.com/{NAVER_ID}/postwrite", timeout=15000)
    await page.wait_for_timeout(3000)

    if "nidlogin" in page.url:
        print("[5] 실패 - 글쓰기 접근 불가")
    else:
        print(f"[5] 성공! URL: {page.url[:60]}")

    print("\n[완료] 브라우저 열어둠. 30초 후 자동 종료...")
    await page.wait_for_timeout(30000)
    await browser.close()

asyncio.run(main())
