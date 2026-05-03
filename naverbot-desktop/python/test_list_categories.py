"""블로그 카테고리 목록 확인"""
import sys, os, logging
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from playwright.sync_api import sync_playwright
from naver_blog import get_profile_dir, launch_browser, _is_logged_in, _login, _enter_write_page, _dismiss_popups

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
NAVER_ID = "npermovie"

try:
    import keyring
    naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
except Exception:
    naver_pw = ""

with sync_playwright() as p:
    ctx = launch_browser(p, get_profile_dir(NAVER_ID), headless=False)
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto("https://blog.naver.com", wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    if not _is_logged_in(page):
        _login(page, NAVER_ID, naver_pw)

    target = _enter_write_page(page)

    # 발행 버튼 클릭하여 사이드패널 열기
    from naver_blog import _try_selectors
    btn = _try_selectors(target, ['button.publish_btn__m9KHH', 'button:has-text("발행")'], timeout=5000)
    if not btn:
        btn = _try_selectors(page, ['button.publish_btn__m9KHH', 'button:has-text("발행")'], timeout=5000)
    if btn:
        btn.click()
    page.wait_for_timeout(2000)

    # 카테고리 드롭다운 열기
    for ctx_frame in [target, page] + list(page.frames):
        try:
            opened = ctx_frame.evaluate("""() => {
                const btn = document.querySelector('button[aria-label*="카테고리"]') ||
                            document.querySelector('button.selectbox_button__jb1Dt');
                if (btn) { btn.click(); return btn.textContent.trim(); }
                return '';
            }""")
            if opened:
                print(f"카테고리 버튼 텍스트: '{opened}'")
                break
        except Exception:
            continue

    page.wait_for_timeout(1000)

    # 모든 카테고리 옵션 수집
    for ctx_frame in [target, page] + list(page.frames):
        try:
            cats = ctx_frame.evaluate("""() => {
                const result = [];
                document.querySelectorAll('button, li, a, div[role="option"], [role="menuitem"]').forEach(el => {
                    const r = el.getBoundingClientRect();
                    const t = (el.textContent || '').trim();
                    if (r.width > 50 && r.height > 20 && r.height < 60 && t && t.length < 30 && r.x > 800) {
                        result.push({ text: t, x: Math.round(r.x), y: Math.round(r.y) });
                    }
                });
                return result;
            }""")
            if cats:
                print(f"\n카테고리 목록 ({len(cats)}개):")
                for c in cats:
                    print(f"  - {c['text']} (pos: {c['x']},{c['y']})")
                break
        except Exception:
            continue

    page.screenshot(path=str(os.path.join(_SCRIPT_DIR, "debug", "categories.png")))
    ctx.close()
