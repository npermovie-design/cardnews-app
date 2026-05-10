"""최초 1회: 네이버에 직접 로그인해서 세션 저장

사용:
    python first_login.py [user_id]
    (user_id 생략 시 test_user)

브라우저가 열리면 직접 손으로 ID/PW 입력 + 캡차/2차인증 통과해주세요.
로그인 완료되면 자동으로 감지 후 종료합니다. (최대 5분 대기)
"""

import sys
import os
import time

# Python embeddable 호환
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from playwright.sync_api import sync_playwright
from naver_blog import _detect_browser_channel, USER_AGENT
from secure_cookie_storage import save_naver_cookies

USER_ID = sys.argv[1] if len(sys.argv) > 1 else "test_user"
MAX_WAIT_SEC = 300  # 5분

print("세션 저장 위치: OS keyring (DPAPI)", flush=True)

with sync_playwright() as p:
    channel = _detect_browser_channel()
    launch_kwargs = {
        "headless": False,
        "args": [
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--window-position=0,0",
            "--disable-infobars",
            "--excludeSwitches=enable-automation",
        ],
    }
    if channel:
        launch_kwargs["channel"] = channel

    browser = p.chromium.launch(**launch_kwargs)
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent=USER_AGENT,
        locale="ko-KR",
    )
    # 봇 감지 우회: navigator.webdriver 숨기기
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
    """)
    page = context.new_page()
    page.goto("https://nid.naver.com/nidlogin.login")

    print("", flush=True)
    print("=" * 60, flush=True)
    print(" 브라우저 창에서 직접 네이버 로그인 해주세요", flush=True)
    print(" 로그인 성공하면 자동 감지 후 종료됩니다 (최대 5분)", flush=True)
    print("=" * 60, flush=True)

    # 로그인 완료 자동 감지 (URL 변화 + 쿠키 폴링)
    start = time.time()
    success = False
    while time.time() - start < MAX_WAIT_SEC:
        try:
            cur_url = page.url
            # 1) URL로 감지 — 로그인 페이지를 벗어났으면 성공
            left_login = (
                "nid.naver.com/nidlogin" not in cur_url
                and "nid.naver.com/user2" not in cur_url
                and "nid.naver.com/login" not in cur_url
            )
            on_naver = "naver.com" in cur_url and left_login
            if on_naver:
                # 쿠키 수집 후 저장
                try:
                    all_cookies = context.cookies()
                    naver_cookies = [c for c in all_cookies if "naver.com" in (c.get("domain",""))]
                    save_naver_cookies(USER_ID, naver_cookies if naver_cookies else all_cookies)
                except Exception:
                    pass
                print(f"\n로그인 감지됨! 현재 URL: {cur_url}", flush=True)
                success = True
                break
            # 2) 쿠키로 감지 (URL이 아직 로그인 페이지지만 쿠키가 생겼으면)
            try:
                all_cookies = context.cookies()
                cookie_names = {c["name"] for c in all_cookies}
                if "NID_AUT" in cookie_names or "NID_SES" in cookie_names:
                    naver_cookies = [c for c in all_cookies if "naver.com" in (c.get("domain",""))]
                    save_naver_cookies(USER_ID, naver_cookies if naver_cookies else all_cookies)
                    print(f"\n로그인 감지됨 (쿠키)! 현재 URL: {cur_url}", flush=True)
                    success = True
                    break
            except Exception:
                pass
        except Exception:
            pass
        time.sleep(2)

    if success:
        # 안전하게 몇 초 더 대기 (쿠키 완전 저장)
        try:
            page.wait_for_timeout(3000)
        except Exception:
            time.sleep(3)
        save_naver_cookies(USER_ID, context.cookies())
        print("세션 저장 완료. 다음부터는 자동 로그인됩니다.", flush=True)
    else:
        print("5분 타임아웃. 로그인 안 됐거나 페이지 이동 안 됨.", flush=True)

    try:
        context.close()
    except Exception:
        pass
    try:
        browser.close()
    except Exception:
        pass
