"""수동 로그인 후 쿠키 저장 - 별도 브라우저 프로필 사용
브라우저가 열리면 직접 네이버에 로그인해주세요.
로그인 완료 후 Enter를 누르면 쿠키가 Supabase에 저장됩니다.
"""
import asyncio
from playwright.async_api import async_playwright
from naver_publisher import _save_cookies_to_db
import os

NAVER_ID = "npermovie"

async def main():
    print("=== 수동 로그인 → 쿠키 Supabase 저장 ===\n")

    profile_dir = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "MakeitBot", "naver_profile")
    os.makedirs(profile_dir, exist_ok=True)

    pw = await async_playwright().start()
    browser = await pw.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        headless=False,
        viewport={"width": 1280, "height": 900},
        locale="ko-KR",
        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
    )

    page = browser.pages[0] if browser.pages else await browser.new_page()
    print("[1] 네이버 로그인 페이지를 엽니다...")
    await page.goto("https://nid.naver.com/nidlogin.login")
    await page.wait_for_timeout(1000)

    print()
    print("=" * 50)
    print("  브라우저에서 직접 네이버에 로그인해주세요!")
    print("  (캡차가 나오면 직접 풀어주세요)")
    print("  120초 대기합니다...")
    print("=" * 50)

    # 로그인 될 때까지 대기 (최대 120초)
    for i in range(120):
        await page.wait_for_timeout(1000)
        url = page.url
        if "nidlogin" not in url and "captcha" not in url.lower() and "naver.com" in url:
            print(f"\n  로그인 감지! ({i+1}초)")
            break
        if i % 15 == 0 and i > 0:
            print(f"  {i}초 대기 중... (로그인해주세요)")
    else:
        print("\n  타임아웃. 로그인 상태를 확인합니다...")

    # 쿠키 추출
    cookies = await browser.cookies()
    naver_cookies = [c for c in cookies if "naver.com" in c.get("domain", "")]
    print(f"\n[2] 네이버 쿠키 {len(naver_cookies)}개 추출")

    if naver_cookies:
        await _save_cookies_to_db(NAVER_ID, naver_cookies)
        print(f"[3] Supabase에 {len(naver_cookies)}개 쿠키 저장 완료!")
        print(f"    → Render 서버에서 이 쿠키로 자동 로그인됩니다.")
    else:
        print("[3] 네이버 쿠키가 없습니다. 로그인이 안 된 것 같습니다.")

    await browser.close()

asyncio.run(main())
