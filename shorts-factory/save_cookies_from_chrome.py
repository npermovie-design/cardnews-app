"""이미 로그인된 Chrome에서 네이버 쿠키를 추출하여 Supabase에 저장
실행 전 Chrome을 완전히 종료해주세요.
"""
import asyncio
from playwright.async_api import async_playwright
from naver_publisher import _save_cookies_to_db
import os

NAVER_ID = "npermovie"

async def main():
    print("=== Chrome 쿠키 추출 → Supabase 저장 ===\n")
    print("Chrome을 완전히 종료한 상태에서 실행해주세요.\n")

    # Chrome 사용자 데이터 경로
    chrome_user_data = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "User Data")
    if not os.path.exists(chrome_user_data):
        print(f"Chrome 프로필을 찾을 수 없습니다: {chrome_user_data}")
        return

    pw = await async_playwright().start()
    browser = await pw.chromium.launch_persistent_context(
        user_data_dir=chrome_user_data,
        channel="chrome",
        headless=False,
        viewport={"width": 1280, "height": 900},
        args=["--profile-directory=Default"],
    )

    page = browser.pages[0] if browser.pages else await browser.new_page()
    print("[1] Chrome 프로필로 네이버 접속 중...")
    await page.goto("https://naver.com", timeout=15000)
    await page.wait_for_timeout(2000)

    # 쿠키 추출
    cookies = await browser.cookies()
    naver_cookies = [c for c in cookies if "naver.com" in c.get("domain", "")]
    print(f"[2] 네이버 쿠키 {len(naver_cookies)}개 발견")

    if naver_cookies:
        await _save_cookies_to_db(NAVER_ID, naver_cookies)
        print(f"[3] Supabase에 저장 완료!")
    else:
        print("[3] 네이버 쿠키가 없습니다. Chrome에서 네이버에 로그인되어 있는지 확인해주세요.")

    await browser.close()

asyncio.run(main())
