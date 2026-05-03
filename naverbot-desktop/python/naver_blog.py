"""네이버 블로그 자동 발행 모듈 (Playwright sync, 사용자별 세션 유지)

메이킷 shorts-factory/naver_publisher.py 베이스로 다음을 보강:
- launch_persistent_context로 사용자별 세션 영속화 (캡차 회피)
- async -> sync 변환 (Electron subprocess 호환)
- 셀렉터 폴백 강화
"""

import os
import re
import time
import logging
import tempfile
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, BrowserContext, TimeoutError as PWTimeout

logger = logging.getLogger("naver-blog")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def get_profile_dir(user_id: str) -> Path:
    """사용자별 browser_profile 경로 (%APPDATA%\\NaverBotSaaS\\profiles\\{user_id})"""
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "NaverBotSaaS" / "profiles" / user_id
    base.mkdir(parents=True, exist_ok=True)
    return base


def _detect_browser_channel():
    """시스템에 설치된 Chrome/Edge를 감지하여 channel 반환.
    번들 Chromium이 없어도 시스템 브라우저로 동작하도록."""
    # 1. PLAYWRIGHT_BROWSERS_PATH 환경변수로 번들 Chromium 확인
    browsers_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if browsers_path and os.path.isdir(browsers_path):
        for entry in os.listdir(browsers_path):
            # chromium-XXXX (headful) 폴더 확인
            if entry.startswith("chromium-") and not "headless" in entry:
                chrome_win = os.path.join(browsers_path, entry, "chrome-win", "chrome.exe")
                chrome_win64 = os.path.join(browsers_path, entry, "chrome-win64", "chrome.exe")
                if os.path.isfile(chrome_win) or os.path.isfile(chrome_win64):
                    logger.info(f"번들 Chromium 감지: {entry}")
                    return None
    # 2. Playwright 기본 경로 확인
    try:
        from playwright._impl._driver import compute_driver_executable
        driver_dir = Path(compute_driver_executable()).parent
        browser_dir = driver_dir / ".." / ".." / ".playwright-browsers"
        if browser_dir.exists():
            for entry in browser_dir.iterdir():
                if entry.name.startswith("chromium-") and "headless" not in entry.name:
                    if any(entry.rglob("chrome.exe")):
                        logger.info(f"Playwright 기본 Chromium 감지: {entry.name}")
                        return None
    except Exception:
        pass
    # 3. 시스템 Chrome
    chrome_paths = [
        os.environ.get("PROGRAMFILES", "") + "\\Google\\Chrome\\Application\\chrome.exe",
        os.environ.get("PROGRAMFILES(X86)", "") + "\\Google\\Chrome\\Application\\chrome.exe",
        os.path.expanduser("~") + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    ]
    for p in chrome_paths:
        if p and os.path.isfile(p):
            logger.info(f"시스템 Chrome 감지: {p}")
            return "chrome"
    # 4. 시스템 Edge
    edge_paths = [
        os.environ.get("PROGRAMFILES", "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
        os.environ.get("PROGRAMFILES(X86)", "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
    ]
    for p in edge_paths:
        if p and os.path.isfile(p):
            logger.info(f"시스템 Edge 감지: {p}")
            return "msedge"
    # 5. macOS
    if os.path.isfile("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        return "chrome"
    # 6. 못 찾으면 None (번들 Chromium 시도, 없으면 에러)
    logger.warning("사용 가능한 브라우저를 찾지 못했습니다")
    return None


def launch_browser(pw, profile_dir, headless=True, **extra):
    """Playwright 브라우저 launch 헬퍼. 번들 Chromium 없으면 시스템 Chrome/Edge 사용.
    여러 전략으로 시도하여 최대한 실행되도록 함.

    ★ headless=False 강제: 인용구/스티커 등 UI 요소가 headless에서 작동 안 함.
       대신 창을 화면 밖에 위치시켜 사용자에게 안 보이게 처리.
    """
    # 이전 브라우저 프로세스의 lock 파일 제거 (충돌 방지)
    profile_path = Path(profile_dir)
    for lock_file in ["SingletonLock", "SingletonSocket", "SingletonCookie"]:
        lf = profile_path / lock_file
        if lf.exists():
            try:
                lf.unlink()
            except Exception:
                pass

    channel = _detect_browser_channel()
    kwargs = dict(
        user_data_dir=str(profile_dir),
        headless=False,  # 항상 headful (UI 요소 필요)
        viewport={"width": 1280, "height": 900},
        user_agent=USER_AGENT,
        locale="ko-KR",
        args=[
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--window-position=0,0",  # 크롬 창 표시 (SmartEditor가 렌더링 필요)
        ],
    )
    if channel:
        kwargs["channel"] = channel
    kwargs.update(extra)

    # 1차 시도: 감지된 channel로 실행
    try:
        return pw.chromium.launch_persistent_context(**kwargs)
    except Exception as e:
        logger.warning(f"1차 브라우저 실행 실패 (channel={channel}): {e}")

    # 2차 시도: channel 없이 기본 Chromium으로
    if channel:
        kwargs.pop("channel", None)
        try:
            return pw.chromium.launch_persistent_context(**kwargs)
        except Exception as e:
            logger.warning(f"2차 브라우저 실행 실패 (기본 Chromium): {e}")

    # 3차 시도: 시스템 Chrome으로 강제
    for ch in ["chrome", "msedge"]:
        kwargs["channel"] = ch
        try:
            return pw.chromium.launch_persistent_context(**kwargs)
        except Exception:
            continue

    # 4차 시도: persistent context 없이 일반 launch
    logger.warning("persistent context 실패 → 일반 launch 시도")
    kwargs.pop("user_data_dir", None)
    kwargs.pop("channel", None)
    browser = pw.chromium.launch(headless=headless, args=kwargs.get("args", []))
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent=USER_AGENT,
        locale="ko-KR",
    )
    return ctx


def _try_selectors(page_or_frame, selectors: list[str], timeout: int = 5000):
    """여러 셀렉터를 순차 시도. 첫 매칭 요소 반환, 없으면 None."""
    for sel in selectors:
        try:
            el = page_or_frame.wait_for_selector(sel, timeout=timeout, state="visible")
            if el:
                return el
        except PWTimeout:
            continue
        except Exception:
            continue
    return None


def _iter_contexts(page: Page = None, target=None):
    """Page와 frame/target을 중복 없이 순회."""
    contexts = []
    for ctx in [target, page]:
        if ctx is not None:
            contexts.append(ctx)
    if page is not None:
        try:
            contexts.extend(list(page.frames))
        except Exception:
            pass

    seen = set()
    for ctx in contexts:
        key = id(ctx)
        if key in seen:
            continue
        seen.add(key)
        yield ctx


def _normalize_template_name(template_name: str) -> str:
    """사용자가 탭/안내 문구를 템플릿명으로 넣은 경우 템플릿 적용을 건너뛴다."""
    name = (template_name or "").strip()
    if name in {"내 템플릿", "템플릿", "없음", "사용 안함", "사용안함", "no", "none", "-"}:
        return ""
    return name


def _refresh_editor_target(page: Page, fallback=None):
    """현재 페이지에서 SmartEditor가 들어있는 frame을 다시 찾는다."""
    try:
        for frame in page.frames:
            name = frame.name or ""
            url = frame.url or ""
            if name == "mainFrame" or "PostWriteForm" in url or "editor" in url.lower():
                return frame
    except Exception:
        pass
    return fallback or page


def _find_body_editor(page: Page = None, target=None, timeout: int = 6000):
    """SmartEditor 본문 입력 영역과 실제 context를 넓게 탐색한다."""
    selectors = [
        ".se-component.se-text .se-text-paragraph",
        ".se-main-container .se-text-paragraph",
        ".se-component-content .se-text-paragraph",
        ".se-section-text .se-text-paragraph",
        ".se-module-text .se-text-paragraph",
        ".se-main-container [contenteditable='true']",
        ".se-content [contenteditable='true']",
        '[contenteditable="true"]',
        ".se-main-container",
    ]

    contexts = list(_iter_contexts(page, target))
    for ctx in contexts:
        el = _try_selectors(ctx, selectors, timeout=timeout)
        if el:
            return ctx, el

    # SmartEditor API는 살아있는데 첫 텍스트 블록이 안 잡히는 경우 새 text 컴포넌트를 만든다.
    for ctx in contexts:
        try:
            ok = ctx.evaluate("""() => {
                if (!window.SmartEditor || !SmartEditor._editors) return false;
                const keys = Object.keys(SmartEditor._editors);
                if (!keys.length) return false;
                const ed = SmartEditor._editors[keys[0]];
                if (!ed || !ed._editingService) return false;
                ed._editingService.insertComponentsWithData([{ctype:"text"}]);
                return true;
            }""")
            if ok and page:
                page.wait_for_timeout(500)
                el = _try_selectors(ctx, selectors, timeout=3000)
                if el:
                    return ctx, el
        except Exception:
            continue

    return None, None


def _is_logged_in(page: Page) -> bool:
    """현재 페이지가 로그인 상태인지 확인.

    URL 기반 + blog.naver.com에서는 글쓰기 버튼 존재 여부로 이중 확인.
    """
    url = page.url
    if "nidlogin" in url or "nid.naver.com/nidlogin" in url:
        return False
    # blog.naver.com 홈은 비로그인도 접근 가능 → 글쓰기 링크로 추가 확인
    if "blog.naver.com" in url and "Write" not in url and "PostView" not in url:
        try:
            logged = page.evaluate("""() => {
                // 로그인 상태면 프로필/글쓰기 관련 요소가 존재
                const write = document.querySelector('a[href*="Write"], .buddy_name, .area_my, #gnb_my_namebox');
                return !!write;
            }""")
            if not logged:
                logger.info("blog.naver.com 로그인 상태 미확인 — 비로그인 의심")
                return False
        except Exception:
            pass
    return True


def check_naver_session(user_id: str) -> dict:
    """네이버 세션이 유효한지 사전 체크.

    persistent_context 방식이므로 프로필 디렉토리 내 Chromium 데이터 존재 여부로 판단.
    Returns:
        {"valid": bool, "message": str}
    """
    profile_dir = get_profile_dir(user_id)

    # persistent_context는 프로필 디렉토리에 Chromium 데이터를 저장
    # Default/Cookies 또는 Default/Network/Cookies 파일이 있으면 세션 존재
    indicators = [
        profile_dir / "Default" / "Cookies",
        profile_dir / "Default" / "Network" / "Cookies",
        profile_dir / "Default" / "Local Storage",
        profile_dir / "Local State",
    ]
    has_profile = any(p.exists() for p in indicators)

    if not has_profile:
        # 프로필 디렉토리 자체가 비어있으면 로그인 안 된 것
        contents = list(profile_dir.iterdir()) if profile_dir.exists() else []
        if len(contents) < 3:
            return {"valid": False, "message": "저장된 로그인 세션이 없습니다. 네이버 계정 설정에서 로그인해주세요."}

    # 프로필 디렉토리에 충분한 데이터가 있으면 세션 유효로 판단
    # (실제 만료 여부는 발행 시도 시 자동 확인됨)
    return {"valid": True, "message": "네이버 세션 유효"}


def _login(page: Page, naver_id: str, naver_pw: str) -> bool:
    """네이버 로그인. JS 주입 방식으로 봇 탐지 우회.

    Returns:
        True: 로그인 성공
        False: 캡차/2차인증 등으로 실패 (사용자 개입 필요)
    """
    page.goto("https://nid.naver.com/nidlogin.login", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)

    if _is_logged_in(page):
        logger.info("이미 로그인 상태")
        return True

    # JS로 직접 주입
    page.evaluate(
        """([id, pw]) => {
            const idEl = document.querySelector('#id');
            const pwEl = document.querySelector('#pw');
            if (idEl) { idEl.value = id; idEl.dispatchEvent(new Event('input', {bubbles: true})); }
            if (pwEl) { pwEl.value = pw; pwEl.dispatchEvent(new Event('input', {bubbles: true})); }
        }""",
        [naver_id, naver_pw],
    )
    page.wait_for_timeout(500)

    # 로그인 버튼 클릭
    btn = _try_selectors(page, [".btn_login", "#log\\.login", "button[type='submit']"], timeout=3000)
    if btn:
        btn.click()

    # 최대 30초 로그인 대기
    for _ in range(30):
        page.wait_for_timeout(1000)
        if _is_logged_in(page):
            logger.info("로그인 성공")
            return True

    # 캡차/2차인증
    if "captcha" in page.url.lower() or "deviceConfirm" in page.url:
        logger.warning("캡차/2차인증 감지 - 사용자 개입 필요")
        return False

    logger.warning(f"로그인 실패. URL={page.url}")
    return False


_POPUP_CLOSE_JS = """
() => {
  let closed = 0;
  // 취소 버튼 강제 클릭
  document.querySelectorAll(
    '.se-popup-button-cancel, .se-popup-alert button.se-popup-button-cancel, ' +
    'button.se-popup-button[data-name="cancel"], .se-popup-alert-confirm button'
  ).forEach(btn => {
    try {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('취소') || txt.includes('닫기') || txt.includes('나가기') || btn.classList.contains('se-popup-button-cancel')) {
        btn.click();
        closed++;
      }
    } catch(e) {}
  });
  // 팝업 요소 자체를 DOM에서 제거 (마지막 수단)
  document.querySelectorAll('.se-popup, .se-popup-dim, [class*="se-popup-alert"]').forEach(el => {
    try { el.remove(); closed++; } catch(e) {}
  });
  return closed;
}
"""


def _select_naver_template(page: Page, target, template_name: str) -> bool:
    """네이버 블로그 글쓰기 페이지에서 '내 템플릿' 선택.

    전략: 모든 frame을 순회하며 Playwright :has-text + JS 폴백으로
    1) 템플릿 버튼 클릭 → 2) 내 템플릿 탭 → 3) 이름 매칭 클릭
    """
    template_name = _normalize_template_name(template_name)
    if not template_name:
        return False

    logger.info(f"템플릿 선택 시도: {template_name}")

    # 에디터 툴바 로딩 대기
    page.wait_for_timeout(2000)

    # 디버그 스크린샷 (before)
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "template_before.png"), full_page=True)
    except Exception:
        pass

    # 전체 프로세스를 단일 JS로 실행 (frame 경계 문제 해결)
    def _find_and_click_text(text, exact=True):
        """page의 모든 frame에서 텍스트가 포함된 클릭 가능 요소를 찾아 클릭"""
        for frame in page.frames:
            try:
                if exact:
                    el = frame.query_selector(f"button:has-text('{text}'), a:has-text('{text}'), span:has-text('{text}'), [role='button']:has-text('{text}')")
                else:
                    el = frame.query_selector(f":has-text('{text}')")
                if el and el.is_visible():
                    el.scroll_into_view_if_needed()
                    page.wait_for_timeout(300)
                    try:
                        el.click(timeout=5000)
                    except Exception:
                        el.evaluate("el => el.click()")
                    logger.info(f"클릭 성공: '{text}' (frame: {frame.name or 'main'})")
                    return True
            except Exception:
                continue
        return False

    # 1. 팝업/배너 제거
    for frame in page.frames:
        try:
            frame.evaluate("""
                () => document.querySelectorAll('.se-help-header, .se-popup-alert-confirm, .se-guide-popup').forEach(el => el.remove())
            """)
        except Exception:
            pass

    # 2. 템플릿 버튼 클릭 (data-name="template" — DOM에서 확인됨)
    tmpl_clicked = False
    for ctx in _iter_contexts(page, target):
        try:
            result = ctx.evaluate("""() => {
                const visible = (el) => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                };
                const click = (el) => {
                    if (!el) return false;
                    const target = el.closest('button, a, [role="button"]') || el;
                    if (!visible(target)) return false;
                    target.scrollIntoView({block: 'center', inline: 'center'});
                    target.click();
                    return true;
                };

                const selectors = [
                    'button[data-name="template"]',
                    '[data-name="template"] button',
                    '.se-template-toolbar-button',
                    '.se-toolbar-item-template button',
                    'button[aria-label*="템플릿"]',
                    '[role="button"][aria-label*="템플릿"]'
                ];
                for (const sel of selectors) {
                    const btn = document.querySelector(sel);
                    if (click(btn)) return true;
                }

                const candidates = document.querySelectorAll('button, a, [role="button"], li, span, div');
                for (const el of candidates) {
                    const txt = (el.innerText || el.textContent || '').trim();
                    const aria = el.getAttribute('aria-label') || '';
                    const title = el.getAttribute('title') || '';
                    if ((txt.includes('템플릿') || aria.includes('템플릿') || title.includes('템플릿')) && click(el)) {
                        return true;
                    }
                }
                return false;
            }""")
            if result:
                tmpl_clicked = True
                logger.info("템플릿 버튼 클릭 (data-name)")
                break
        except Exception:
            continue

    if not tmpl_clicked:
        # 텍스트 폴백
        tmpl_clicked = _find_and_click_text("템플릿")

    if not tmpl_clicked:
        logger.warning("템플릿 버튼을 찾을 수 없음 — 스킵")
        try:
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(debug_dir / "template_not_found.png"), full_page=True)
        except Exception:
            pass
        _dismiss_popups(page, target)
        return False

    page.wait_for_timeout(1500)

    # 3. '내 템플릿' 탭 클릭
    # 디버그 스크린샷에서 확인: 탭이 mainFrame(target) 안에 있음
    # "추천 템플릿 | 부분 템플릿 | 내 템플릿" 순서
    tab_clicked = False

    # 방법 1: target(mainFrame)에서 직접 클릭 — 가장 확실
    try:
        el = target.query_selector(':text-is("내 템플릿")')
        if el and el.is_visible():
            el.click()
            tab_clicked = True
            logger.info("'내 템플릿' 탭 클릭 (target selector)")
    except Exception as e:
        logger.info(f"내 템플릿 target selector 실패: {e}")

    # 방법 2: page에서 시도
    if not tab_clicked:
        try:
            page.click(':text-is("내 템플릿")', timeout=3000)
            tab_clicked = True
            logger.info("'내 템플릿' 탭 클릭 (page.click)")
        except Exception:
            pass

    # 방법 3: JS로 모든 frame에서 "내 템플릿" 정확 매치
    if not tab_clicked:
        for ctx in _iter_contexts(page, target):
            try:
                result = ctx.evaluate("""() => {
                    // 탭 영역의 모든 요소에서 "내 템플릿" 찾기
                    const els = document.querySelectorAll('a, button, span, div, li');
                    for (const el of els) {
                        // 자식 없는(leaf) 요소의 textContent가 정확히 "내 템플릿"
                        if (el.children.length === 0 || el.childElementCount === 0) {
                            const t = (el.textContent || '').trim();
                            if (t === '내 템플릿') {
                                el.click();
                                return true;
                            }
                        }
                    }
                    // 좀 더 넓게: textContent에 "내 템플릿"만 포함
                    for (const el of els) {
                        const t = (el.textContent || '').trim();
                        if (t === '내 템플릿') {
                            el.click();
                            return true;
                        }
                    }
                    return false;
                }""")
                if result:
                    tab_clicked = True
                    logger.info(f"'내 템플릿' 탭 클릭 (JS, ctx={getattr(ctx, 'name', 'page')})")
                    break
            except Exception:
                continue

    if not tab_clicked:
        logger.warning("'내 템플릿' 탭 클릭 실패")

    page.wait_for_timeout(1500)

    # 디버그: 탭 클릭 후 상태
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "template_tab_clicked.png"))
    except Exception:
        pass

    # 디버그 스크린샷 (탭 클릭 후)
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "template_tab_clicked.png"))
    except Exception:
        pass

    # 4. 템플릿 이름 클릭 — Playwright 네이티브 텍스트 셀렉터 (좌표 무관, 해상도 무관)
    found = False

    # 방법 1: Playwright의 :has-text 셀렉터 (가장 확실)
    try:
        # 템플릿 아이템 내에서 이름 매칭
        el = target.query_selector(f':text("{template_name}")')
        if el and el.is_visible():
            el.click()
            found = True
            logger.info(f"템플릿 '{template_name}' 클릭 (target :text)")
    except Exception:
        pass

    if not found:
        try:
            page.click(f':text("{template_name}")', timeout=3000)
            found = True
            logger.info(f"템플릿 '{template_name}' 클릭 (page.click)")
        except Exception:
            pass

    # 방법 2: 모든 frame에서 JS 텍스트 매칭 (부분 매치)
    if not found:
        for ctx in _iter_contexts(page, target):
            try:
                result = ctx.evaluate("""(name) => {
                    // 템플릿 리스트 아이템에서 이름 찾기
                    const items = document.querySelectorAll('[class*="template"], [class*="item"], li, div');
                    for (const el of items) {
                        const t = (el.innerText || el.textContent || '').trim();
                        // 정확히 이름으로 시작하는 요소 (날짜 등 부가 텍스트 포함 가능)
                        if (t && t.startsWith(name)) {
                            el.click();
                            return t.slice(0, 50);
                        }
                    }
                    return '';
                }""", template_name)
                if result:
                    found = True
                    logger.info(f"템플릿 '{result}' 클릭 (JS)")
                    break
            except Exception:
                continue

    if not found:
        logger.warning(f"템플릿 '{template_name}' 이름 매칭 실패 — 스킵")
        try:
            page.screenshot(path=str(debug_dir / "template_item_not_found.png"))
        except Exception:
            pass
        page.keyboard.press("Escape")
        return False

    page.wait_for_timeout(2000)

    # 템플릿 적용 확인 팝업 처리 ("적용", "확인", "사용" 등)
    for ctx in _iter_contexts(page, target):
        try:
            ctx.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    const t = (btn.textContent || '').trim();
                    if (t === '적용' || t === '확인' || t === '사용' || t === '적용하기') {
                        const r = btn.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }""")
        except Exception:
            continue

    page.wait_for_timeout(1500)

    # 템플릿 패널 닫기 (X 버튼 또는 ESC)
    try:
        page.keyboard.press("Escape")
    except Exception:
        pass
    page.wait_for_timeout(500)

    logger.info(f"템플릿 '{template_name}' 적용 완료")
    return True


def _find_toolbar_button(target, data_name: str, aria_hints: list[str] = None):
    """SmartEditor 툴바 버튼을 여러 전략으로 찾음.

    1차: data-name 속성
    2차: aria-label에 힌트 텍스트 포함
    3차: JS로 툴바 전체 검색
    """
    # 1) data-name
    try:
        btn = target.query_selector(f'button[data-name="{data_name}"]')
        if btn and btn.is_visible():
            return btn
        btn = target.query_selector(f'[data-name="{data_name}"] button')
        if btn and btn.is_visible():
            return btn
    except Exception:
        pass

    # 2) aria-label 힌트
    if aria_hints:
        for hint in aria_hints:
            try:
                btn = target.query_selector(f'button[aria-label*="{hint}"]')
                if btn and btn.is_visible():
                    return btn
            except Exception:
                continue

    # 3) JS 폴백: data-name 포함 검색 (부분 매치)
    try:
        handle = target.evaluate_handle("""
            (name) => {
                const btns = document.querySelectorAll('button[data-name], [data-name] button');
                for (const btn of btns) {
                    const dn = btn.getAttribute('data-name') || btn.closest('[data-name]')?.getAttribute('data-name') || '';
                    if (dn.includes(name)) {
                        const r = btn.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) return btn;
                    }
                }
                return null;
            }
        """, data_name)
        if handle:
            el = handle.as_element()
            if el:
                return el
    except Exception:
        pass

    return None


def _se_click(target, data_name: str, timeout=500, aria_hints=None):
    """SmartEditor 툴바 버튼 클릭."""
    btn = _find_toolbar_button(target, data_name, aria_hints)
    if btn:
        try:
            btn.click()
            if hasattr(target, "wait_for_timeout"):
                target.wait_for_timeout(timeout)
            return True
        except Exception:
            pass
    return False


def _se_click_dropdown(target, data_name: str, option_text: str, page=None, timeout=500, aria_hints=None):
    """SmartEditor 드롭다운 버튼 클릭 후 옵션 선택."""
    try:
        btn = _find_toolbar_button(target, data_name, aria_hints)
        if not btn:
            logger.info(f"  드롭다운 버튼 못 찾음: {data_name}")
            return False

        btn.click()
        if hasattr(target, "wait_for_timeout"):
            target.wait_for_timeout(800)

        # 드롭다운 옵션 찾기 (여러 방법 시도)
        # 1) CSS 셀렉터
        for sel in [
            f'button:has-text("{option_text}")',
            f'li:has-text("{option_text}")',
            f'a:has-text("{option_text}")',
            f'div:has-text("{option_text}")',
            f'span:has-text("{option_text}")',
        ]:
            try:
                opt = target.query_selector(sel)
                if opt and opt.is_visible():
                    opt.click()
                    if hasattr(target, "wait_for_timeout"):
                        target.wait_for_timeout(timeout)
                    return True
            except Exception:
                continue

        # 2) JS 폴백: 텍스트로 검색 (부분 매치 포함)
        try:
            handle = target.evaluate_handle("""
                (text) => {
                    const els = document.querySelectorAll('button, li, a, div, span, label');
                    for (const el of els) {
                        const t = (el.textContent || '').trim();
                        if (t === text || t.includes(text)) {
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0 && r.height < 100) {
                                return el;
                            }
                        }
                    }
                    return null;
                }
            """, option_text)
            if handle:
                el = handle.as_element()
                if el:
                    el.click()
                    if hasattr(target, "wait_for_timeout"):
                        target.wait_for_timeout(timeout)
                    return True
        except Exception:
            pass

        # 못 찾으면 ESC로 닫기
        logger.info(f"  드롭다운 옵션 못 찾음: {option_text}")
        if page:
            page.keyboard.press("Escape")
    except Exception as e:
        logger.info(f"  드롭다운 오류: {e}")
    return False


def _insert_separator(page: Page, target) -> bool:
    """에디터에 구분선(수평선) 삽입."""
    selectors = [
        "button[data-name='horizontal-line']",
        "button.se-insert-horizontal-line-default-toolbar-button",
        "button[data-name='horizontalRule']",
        "button[aria-label*='구분선']",
        "button[aria-label*='수평선']",
        "button.se-hr-toolbar-button",
        "button:has-text('구분선')",
        "button:has-text('수평선')",
    ]
    for ctx in [target, page]:
        for sel in selectors:
            try:
                btn = ctx.query_selector(sel) if hasattr(ctx, "query_selector") else None
                if btn and btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(400)
                    return True
            except Exception:
                continue
        if hasattr(ctx, "child_frames"):
            for cf in ctx.child_frames:
                for sel in selectors:
                    try:
                        btn = cf.query_selector(sel)
                        if btn and btn.is_visible():
                            btn.click()
                            page.wait_for_timeout(400)
                            return True
                    except Exception:
                        continue
    # 구분선 버튼 못 찾으면 무시 (볼드 소제목만으로도 구분됨)
    return False


QUOTE_STYLE_NAMES = {
    "vertical": "버티컬 라인",
    "line": "버티컬 라인",        # se-l-quotation_line = vertical
    "underline": "라인&따옴표",   # se-l-quotation_underline
    "bubble": "말풍선",
    "quotemark": "라인&따옴표",
    "postit": "포스트잇",
    "frame": "프레임",
    "따옴표": "따옴표",
}

# 드롭다운 내 실제 옵션 순서 (인덱스로 폴백 시 사용)
# 네이버 SE CSS: quotation_line=vertical, quotation_underline=라인&따옴표
QUOTE_STYLE_INDEX = {
    "따옴표": 0,
    "vertical": 1, "버티컬 라인": 1, "line": 1,
    "bubble": 2, "말풍선": 2,
    "quotemark": 3, "라인&따옴표": 3, "underline": 3,
    "postit": 4, "포스트잇": 4,
    "frame": 5, "프레임": 5,
}


def _click_quote_button(page: Page, target, quote_style: str = "vertical") -> bool:
    """에디터 툴바의 인용구 드롭다운으로 스타일 선택 후 삽입.

    ★ Playwright의 실제 좌표 클릭 사용 (JS evaluate click은 팝업이 안 열림)

    팝업 옵션 순서 (위→아래):
    따옴표(0) / 버티컬 라인(1) / 말풍선(2) / 라인&따옴표(3) / 포스트잇(4) / 프레임(5)
    """
    style_name = QUOTE_STYLE_NAMES.get(quote_style, "버티컬 라인")
    style_idx = QUOTE_STYLE_INDEX.get(quote_style, QUOTE_STYLE_INDEX.get(style_name, 1))

    # ★ 드롭다운 ▼ 클릭 → 고정 좌표 오프셋으로 스타일 옵션 클릭
    # 팝업 옵션 순서 (위→아래, 각 ~50px 간격):
    # 0:따옴표, 1:버티컬 라인, 2:말풍선, 3:라인&따옴표, 4:포스트잇, 5:프레임
    OPTION_OFFSETS = {
        0: 55,   # 따옴표
        1: 110,  # 버티컬 라인
        2: 160,  # 말풍선
        3: 215,  # 라인&따옴표
        4: 265,  # 포스트잇
        5: 315,  # 프레임
    }
    try:
        drop_btn = target.query_selector(
            'button.se-document-toolbar-select-option-button[data-name="quotation"]'
        )
        if not drop_btn:
            # 기본 버튼 폴백
            default_btn = target.query_selector('button[data-name="quotation"]')
            if default_btn:
                default_btn.click()
                page.wait_for_timeout(300)
                logger.info("  인용구: 기본 버튼 (드롭다운 없음)")
                return True
            return False

        # 드롭다운 버튼 위치 파악
        box = drop_btn.bounding_box()
        if not box:
            return False
        btn_x = box['x'] + box['width'] / 2
        btn_y = box['y'] + box['height'] / 2

        # 드롭다운 ▼ 클릭 → 팝업 열기
        drop_btn.click()
        page.wait_for_timeout(1200)

        # 스타일 인덱스에 해당하는 y 오프셋 계산
        dy = OPTION_OFFSETS.get(style_idx, 110)  # 기본: 버티컬 라인
        click_x = btn_x + 50  # 팝업 중앙 (드롭다운 버튼 기준 오른쪽)
        click_y = btn_y + dy   # 팝업 내 옵션 위치

        # 좌표로 직접 클릭
        page.mouse.click(click_x, click_y)
        page.wait_for_timeout(500)

        logger.info(f"  인용구 스타일: {style_name} (idx={style_idx}, y_offset={dy})")
        return True

    except Exception as e:
        logger.info(f"  인용구 드롭다운 실패: {e}")
        # 기본 버튼 폴백
        try:
            default_btn = target.query_selector('button[data-name="quotation"]')
            if default_btn:
                default_btn.click()
                page.wait_for_timeout(300)
                logger.info("  인용구: 기본 버튼 (폴백)")
                return True
        except Exception:
            pass
        return False


def _set_font_size(page: Page, target, font_size: str) -> bool:
    """에디터의 글씨 크기 변경."""
    if not font_size or font_size == "15":
        return True

    # 0) SE API로 직접 변경 (가장 확실)
    try:
        _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"fontSize", value:"fs{font_size}"}});')
        logger.info(f"글씨 크기 변경 (SE API): {font_size}")
        return True
    except Exception:
        pass

    aria = ["글씨 크기", "글자 크기", "font size", "폰트"]

    # 1) data-name 드롭다운 시도
    for name in ["font-size", "fontSize", "title-font-size", "font-size-code"]:
        if _se_click_dropdown(target, name, font_size, page, timeout=300, aria_hints=aria):
            logger.info(f"글씨 크기 변경: {font_size}")
            return True

    # 3) JS 폴백: 글씨 크기 버튼을 aria-label/title로 직접 찾아서 클릭
    try:
        clicked = target.evaluate("""() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                const title = (btn.getAttribute('title') || '').toLowerCase();
                if (label.includes('글씨') || label.includes('폰트') || label.includes('font size') ||
                    title.includes('글씨') || title.includes('폰트') || title.includes('font')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        }""")
        if clicked:
            if hasattr(target, "wait_for_timeout"):
                target.wait_for_timeout(800)
            # 드롭다운 열렸으면 크기 선택
            try:
                handle = target.evaluate_handle("""
                    (size) => {
                        const els = document.querySelectorAll('button, li, a, div, span');
                        for (const el of els) {
                            const t = (el.textContent || '').trim();
                            if (t === size || t === size + 'pt' || t === size + 'px') {
                                const r = el.getBoundingClientRect();
                                if (r.width > 0 && r.height > 0 && r.height < 60) return el;
                            }
                        }
                        return null;
                    }
                """, font_size)
                if handle:
                    el = handle.as_element()
                    if el:
                        el.click()
                        if hasattr(target, "wait_for_timeout"):
                            target.wait_for_timeout(300)
                        logger.info(f"글씨 크기 변경 (JS): {font_size}")
                        return True
            except Exception:
                pass
            # 드롭다운 닫기
            if page:
                page.keyboard.press("Escape")
    except Exception:
        pass

    logger.info("글씨 크기 변경 실패 — 기본값 사용")
    return False


def _set_font_color(page: Page, target, color_hex: str) -> bool:
    """에디터 툴바에서 글씨 색상 변경. color_hex: '#FF0000' 등."""
    if not color_hex:
        return False
    color_hex = color_hex.lstrip("#").upper()

    # 0) SE API + DOM 직접 보강
    # SE API는 내부 모델만 업데이트하고 DOM style에 반영 안 되는 경우가 있음
    # → SE API 호출 후, 선택 영역의 span/b에 inline style도 직접 설정
    try:
        _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"color", value:"#{color_hex}"}});')
        logger.info(f"글씨 색상 SE API 호출: #{color_hex}")
    except Exception:
        pass

    # DOM 직접 보강: 선택 영역의 모든 텍스트 요소에 inline style.color 적용
    # ★ 선택 영역이 없으면(커서만 있으면) DOM 보강 건너뜀 — 이전 요소를 덮어쓰지 않도록
    try:
        applied_count = target.evaluate("""(colorHex) => {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return 0;

            const range = sel.getRangeAt(0);
            // ★ 선택 영역이 없으면(collapsed = 커서만) DOM 보강 안 함
            // SE API만으로 다음 입력 색상을 설정 (내부 모델용)
            if (range.collapsed) return -1;

            let count = 0;
            const container = range.commonAncestorContainer;
            let el = container.nodeType === 3 ? container.parentElement : container;

            const applyColor = (node) => {
                if (!node || node.nodeType !== 1) return;
                node.style.color = '#' + colorHex;
                count++;
            };

            if (el.tagName === 'B' || el.tagName === 'STRONG') {
                applyColor(el);
                if (el.parentElement && el.parentElement.tagName === 'SPAN') {
                    applyColor(el.parentElement);
                }
            } else if (el.tagName === 'SPAN') {
                applyColor(el);
                el.querySelectorAll('b, strong').forEach(b => applyColor(b));
            } else {
                const paragraph = el.closest('.se-text-paragraph') || el;
                paragraph.querySelectorAll('span, b, strong').forEach(node => {
                    if (sel.containsNode(node, true)) {
                        applyColor(node);
                    }
                });
            }

            return count;
        }""", color_hex)
        if applied_count and applied_count > 0:
            logger.info(f"글씨 색상 DOM 보강: #{color_hex} ({applied_count}개 요소)")
            return True
        elif applied_count == -1:
            logger.info(f"글씨 색상 SE API만 (커서 위치, DOM 보강 스킵): #{color_hex}")
            return True
    except Exception as e:
        logger.info(f"글씨 색상 DOM 보강 실패: {e}")

    aria = ["글씨 색", "글자 색", "font color", "색상"]

    # 1) 색상 버튼 클릭하여 컬러 피커 열기
    color_btn_selectors = [
        "button[data-name='font-color']",
        "button[data-name='fontColor']",
        "button[data-name='color']",
    ]
    btn = None
    for sel in color_btn_selectors:
        try:
            btn = target.query_selector(sel)
            if btn and btn.is_visible():
                break
            btn = None
        except Exception:
            continue

    # aria-label 폴백
    if not btn:
        try:
            btn = target.evaluate_handle("""() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    const label = (b.getAttribute('aria-label') || '').toLowerCase();
                    const title = (b.getAttribute('title') || '').toLowerCase();
                    if (label.includes('글씨 색') || label.includes('글자 색') ||
                        label.includes('font color') || label.includes('색상') ||
                        title.includes('글씨 색') || title.includes('색상')) {
                        return b;
                    }
                }
                return null;
            }""")
            if btn:
                btn = btn.as_element()
        except Exception:
            btn = None

    if not btn:
        logger.info("글씨 색상 버튼 못 찾음")
        return False

    try:
        btn.click()
        page.wait_for_timeout(800)

        # 컬러 피커에서 hex 입력 필드 찾기 or 프리셋 색상 클릭
        applied = target.evaluate("""(hex) => {
            // 1) hex 입력 필드 찾기
            const inputs = document.querySelectorAll('input[type="text"]');
            for (const inp of inputs) {
                const val = (inp.value || '').replace('#', '');
                // hex 입력 가능한 필드 (6자리 hex나 빈 필드)
                if (val.length <= 7) {
                    inp.focus();
                    inp.value = hex;
                    inp.dispatchEvent(new Event('input', {bubbles: true}));
                    inp.dispatchEvent(new Event('change', {bubbles: true}));
                    // 확인/적용 버튼 클릭
                    const okBtns = document.querySelectorAll('button');
                    for (const b of okBtns) {
                        const t = (b.textContent || '').trim();
                        if (t === '확인' || t === '적용' || t === 'OK') {
                            b.click();
                            return true;
                        }
                    }
                    // Enter로 적용 시도
                    inp.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
                    return true;
                }
            }
            // 2) 프리셋 색상 버튼 매치
            const allBtns = document.querySelectorAll('button, [role="button"], div[data-color]');
            for (const el of allBtns) {
                const bg = (el.style.backgroundColor || '').toLowerCase();
                const dataColor = (el.getAttribute('data-color') || '').replace('#', '').toUpperCase();
                if (dataColor === hex) {
                    el.click();
                    return true;
                }
            }
            return false;
        }""", color_hex)

        if applied:
            page.wait_for_timeout(300)
            logger.info(f"글씨 색상 변경: #{color_hex}")
            return True
        else:
            page.keyboard.press("Escape")
    except Exception as e:
        logger.info(f"글씨 색상 변경 실패: {e}")
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

    return False


def _set_bg_color(page: Page, target, color_hex: str) -> bool:
    """에디터에서 선택된 텍스트에 배경색(형광펜) 적용.
    네이버 SE API의 bgColor 속성 사용."""
    if not color_hex:
        return False
    color_hex = color_hex.lstrip("#").upper()
    try:
        _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"bgColor", value:"#{color_hex}"}});')
        logger.info(f"배경색 SE API 적용: #{color_hex}")
        return True
    except Exception:
        pass

    # 폴백: 배경색 버튼 UI 클릭
    try:
        target.evaluate(f"""() => {{
            var sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            var range = sel.getRangeAt(0);
            if (range.collapsed) return;
            // 선택된 텍스트를 span으로 감싸서 배경색 적용
            var span = document.createElement('span');
            span.style.backgroundColor = '#{color_hex}';
            range.surroundContents(span);
        }}""")
        return True
    except Exception as e:
        logger.info(f"배경색 적용 실패: {e}")
    return False


def _apply_bg_color_to_keywords(page: Page, target, keyword: str, bg_color: str) -> int:
    """본문에서 특정 키워드를 찾아 배경색(형광펜) 적용.

    방법: 키워드 위치를 JS로 찾고, 물리적 마우스 선택 → SE API bgColor 적용.
    DOM 직접 조작은 발행 시 SE 내부 모델 재생성으로 사라지므로 SE API를 사용한다.
    """
    if not keyword or not bg_color:
        return 0
    hex_val = bg_color.lstrip("#").upper()

    # iframe 오프셋 계산
    ix, iy = 0, 0
    try:
        if target != page:
            off = page.evaluate("""() => {
                const f = document.querySelector('iframe[name="mainFrame"]');
                return f ? {x: f.getBoundingClientRect().x, y: f.getBoundingClientRect().y} : {x:0,y:0};
            }""")
            ix, iy = off.get("x", 0), off.get("y", 0)
    except Exception:
        pass

    # 1) 키워드 위치 목록 수집 (최대 20개)
    try:
        positions = target.evaluate("""(kw) => {
            const container = document.querySelector('.se-main-container');
            if (!container) return [];
            const results = [];
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            while (walker.nextNode()) {
                const node = walker.currentNode;
                const idx = node.textContent.indexOf(kw);
                if (idx < 0) continue;
                // 이미 배경색 있으면 건너뛰기
                const parent = node.parentElement;
                if (parent && parent.style && parent.style.backgroundColor) continue;
                // Range로 좌표 계산
                try {
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + kw.length);
                    const rect = range.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        results.push({x: rect.x, y: rect.y, w: rect.width, h: rect.height});
                    }
                } catch(e) {}
                if (results.length >= 20) break;
            }
            return results;
        }""", keyword)
    except Exception as e:
        logger.info(f"배경색 키워드 위치 수집 실패: {e}")
        return 0

    if not positions:
        logger.info(f"배경색 적용 대상 없음: '{keyword}'")
        return 0

    count = 0
    for pos in positions:
        try:
            # scrollIntoView + 좌표 갱신
            fresh = target.evaluate("""(args) => {
                const kw = args[0];
                const idx = args[1];
                const container = document.querySelector('.se-main-container');
                if (!container) return null;
                const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                let found = 0;
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const i = node.textContent.indexOf(kw);
                    if (i < 0) continue;
                    const parent = node.parentElement;
                    if (parent && parent.style && parent.style.backgroundColor) continue;
                    if (found === idx) {
                        const range = document.createRange();
                        range.setStart(node, i);
                        range.setEnd(node, i + kw.length);
                        const el = node.parentElement;
                        if (el) el.scrollIntoView({block: 'center', behavior: 'instant'});
                        const rect = range.getBoundingClientRect();
                        return {x: rect.x, y: rect.y, w: rect.width, h: rect.height};
                    }
                    found++;
                }
                return null;
            }""", [keyword, count])

            if not fresh:
                continue
            page.wait_for_timeout(300)

            # 물리적 마우스로 키워드 드래그 선택
            sx = fresh['x'] + ix
            sy = fresh['y'] + fresh['h'] / 2 + iy
            ex = fresh['x'] + fresh['w'] + ix
            ey = sy

            page.mouse.click(sx, sy)
            page.wait_for_timeout(100)
            page.keyboard.down("Shift")
            page.mouse.click(ex, ey)
            page.keyboard.up("Shift")
            page.wait_for_timeout(200)

            # SE API로 배경색 적용
            try:
                _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"bgColor", value:"#{hex_val}"}});')
            except Exception:
                # SE API 실패 시 DOM 폴백
                target.evaluate("""(color) => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return;
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.backgroundColor = '#' + color;
                    try { range.surroundContents(span); } catch(e) {}
                }""", hex_val)

            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(100)
            count += 1
        except Exception as e:
            logger.debug(f"배경색 키워드 개별 적용 실패: {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    if count:
        logger.info(f"배경색 적용: '{keyword}' {count}개 → #{hex_val}")
    return count


def _apply_text_color_to_keywords(page: Page, target, keyword: str, color_hex: str) -> int:
    """본문에서 특정 키워드를 찾아 텍스트 색상(포인트 글색) 적용.

    방법: 키워드 위치를 JS로 찾고, 물리적 마우스 선택 → SE API color 적용.
    소제목/인용구 내부의 키워드는 건너뛴다 (별도 색상 적용됨).
    """
    if not keyword or not color_hex:
        return 0
    hex_val = color_hex.lstrip("#").upper()

    # iframe 오프셋 계산
    ix, iy = 0, 0
    try:
        if target != page:
            off = page.evaluate("""() => {
                const f = document.querySelector('iframe[name="mainFrame"]');
                return f ? {x: f.getBoundingClientRect().x, y: f.getBoundingClientRect().y} : {x:0,y:0};
            }""")
            ix, iy = off.get("x", 0), off.get("y", 0)
    except Exception:
        pass

    # 키워드 위치 수집 (소제목/인용구 제외, 본문 텍스트만)
    try:
        total = target.evaluate("""(kw) => {
            const container = document.querySelector('.se-main-container');
            if (!container) return 0;
            let count = 0;
            // 본문 텍스트 + 인용구 내부에서도 키워드 찾기
            const comps = container.querySelectorAll('.se-component.se-text, .se-component.se-quotation');
            for (const comp of comps) {
                const walker = document.createTreeWalker(comp, NodeFilter.SHOW_TEXT, null, false);
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    let startIdx = 0;
                    while (true) {
                        const idx = node.textContent.indexOf(kw, startIdx);
                        if (idx < 0) break;
                        count++;
                        startIdx = idx + kw.length;
                    }
                }
            }
            return count;
        }""", keyword)
    except Exception:
        total = 0

    if not total:
        return 0

    logger.info(f"  키워드 포인트 글색: '{keyword}' {total}개 발견, #{hex_val} 적용 시작")

    count = 0
    max_attempts = min(total + 5, 40)  # 안전 상한

    for attempt_idx in range(max_attempts):
        if count >= total:
            break
        try:
            # 다음 미처리 키워드 위치를 찾아 scrollIntoView + 좌표 반환
            pos = target.evaluate("""(args) => {
                const kw = args[0];
                const color = args[1];
                const container = document.querySelector('.se-main-container');
                if (!container) return null;
                const comps = container.querySelectorAll('.se-component.se-text, .se-component.se-quotation');
                for (const comp of comps) {
                    const walker = document.createTreeWalker(comp, NodeFilter.SHOW_TEXT, null, false);
                    while (walker.nextNode()) {
                        const node = walker.currentNode;
                        let startIdx = 0;
                        while (true) {
                            const idx = node.textContent.indexOf(kw, startIdx);
                            if (idx < 0) break;
                            // 이미 색상 적용된 건 건너뛰기
                            const parent = node.parentElement;
                            if (parent && parent.style && parent.style.color) {
                                const c = parent.style.color.toLowerCase();
                                if (c && c !== 'rgb(0, 0, 0)' && c !== '#000000' && c !== 'black') {
                                    startIdx = idx + kw.length;
                                    continue;
                                }
                            }
                            try {
                                const range = document.createRange();
                                range.setStart(node, idx);
                                range.setEnd(node, idx + kw.length);
                                const el = node.parentElement;
                                if (el) el.scrollIntoView({block: 'center', behavior: 'instant'});
                                const rect = range.getBoundingClientRect();
                                if (rect.width > 0 && rect.height > 0) {
                                    return {x: rect.x, y: rect.y, w: rect.width, h: rect.height};
                                }
                            } catch(e) {}
                            startIdx = idx + kw.length;
                        }
                    }
                }
                return null;
            }""", [keyword, hex_val])

            if not pos:
                break  # 더 이상 미처리 키워드 없음

            page.wait_for_timeout(300)

            # 물리적 마우스로 키워드 드래그 선택
            sx = pos['x'] + ix
            sy = pos['y'] + pos['h'] / 2 + iy
            ex = pos['x'] + pos['w'] + ix
            ey = sy

            page.mouse.click(sx, sy)
            page.wait_for_timeout(100)
            page.keyboard.down("Shift")
            page.mouse.click(ex, ey)
            page.keyboard.up("Shift")
            page.wait_for_timeout(200)

            # SE API로 텍스트 색상 적용
            try:
                _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"color", value:"#{hex_val}"}});')
            except Exception:
                # SE API 실패 시 DOM 직접 보강
                target.evaluate("""(hex) => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return;
                    const range = sel.getRangeAt(0);
                    // 선택 영역 내 모든 텍스트 요소에 색상 적용
                    const container = range.commonAncestorContainer;
                    const el = container.nodeType === 3 ? container.parentElement : container;
                    if (el) {
                        el.style.color = '#' + hex;
                        el.querySelectorAll('span, b, strong').forEach(n => { n.style.color = '#' + hex; });
                    }
                }""", hex_val)

            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(100)
            count += 1
        except Exception as e:
            logger.debug(f"키워드 글색 개별 적용 실패: {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    logger.info(f"  키워드 포인트 글색 완료: '{keyword}' {count}/{total}개 → #{hex_val}")
    return count


def _apply_color_to_subtitles(page: Page, target, color_hex: str) -> int:
    """소제목(sectionTitle) 컴포넌트의 텍스트에 색상 적용.

    물리적 선택 + 컬러피커로 적용하여 발행 후에도 유지.
    """
    hex_val = color_hex.lstrip("#").upper()
    color_btn = target.query_selector('button[data-name="font-color"]')
    if not color_btn:
        logger.info("  소제목 색상: 컬러피커 버튼 없음")
        return 0

    # 플로팅 메뉴 닫기
    try:
        target.evaluate("""() => {
            document.querySelectorAll('.se-floating-material-menu, .se-floating-menu')
                .forEach(el => { el.style.display = 'none'; });
        }""")
    except Exception:
        pass

    # iframe 오프셋 계산
    ix, iy = 0, 0
    try:
        if target != page:
            off = page.evaluate("""() => {
                const f = document.querySelector('iframe[name="mainFrame"]');
                return f ? {x: f.getBoundingClientRect().x, y: f.getBoundingClientRect().y} : {x:0,y:0};
            }""")
            ix, iy = off.get("x", 0), off.get("y", 0)
    except Exception:
        pass

    # 맨 위로 스크롤
    try:
        target.evaluate("() => { const c = document.querySelector('.se-main-container'); if(c) c.scrollTop = 0; }")
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(500)
    except Exception:
        pass

    # 소제목 요소 수집 + scrollIntoView로 좌표 갱신
    subtitle_count = target.evaluate("""() => document.querySelectorAll('.se-component.se-sectionTitle').length""") or 0

    colored = 0
    for idx in range(subtitle_count):
        try:
            # 각 소제목을 scrollIntoView 후 좌표 가져오기
            sub = target.evaluate("""(i) => {
                const els = document.querySelectorAll('.se-component.se-sectionTitle');
                if (i >= els.length) return null;
                const el = els[i];
                const p = el.querySelector('.se-text-paragraph');
                if (!p) return null;
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
                const text = (p.textContent || '').trim();
                if (!text) return null;
                const r = p.getBoundingClientRect();
                return { text: text.slice(0, 40), x: r.x, y: r.y, w: r.width, h: r.height };
            }""", idx)
            if not sub:
                continue
            page.wait_for_timeout(500)

            # 좌표 재확인 (scrollIntoView 안정화 후)
            sub2 = target.evaluate("""(i) => {
                const els = document.querySelectorAll('.se-component.se-sectionTitle');
                if (i >= els.length) return null;
                const p = els[i].querySelector('.se-text-paragraph');
                if (!p) return null;
                const r = p.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
            }""", idx)
            if sub2:
                sub = {**sub, **sub2}

            # 소제목 클릭 → Home → Shift+End 전체 선택
            cx = sub['x'] + sub['w'] / 2 + ix
            cy = sub['y'] + sub['h'] / 2 + iy
            page.mouse.click(cx, cy)
            page.wait_for_timeout(150)
            page.keyboard.press("Home")
            page.keyboard.down("Shift")
            page.keyboard.press("End")
            page.keyboard.up("Shift")
            page.wait_for_timeout(200)

            # 컬러피커로 색상 적용 (버튼 재탐색 — 스크롤 후 DOM 분리 대응)
            cbtn = target.query_selector('button[data-name="font-color"]')
            if cbtn:
                cbtn.click()
                page.wait_for_timeout(800)
                target.evaluate("""(hex) => {
                    const hexToRgb = (h) => [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
                    const t = hexToRgb(hex);
                    let best = null, bestD = Infinity;
                    document.querySelectorAll('.se-palette-item, [data-color]').forEach(el => {
                        const dc = (el.getAttribute('data-color') || '').replace('#', '');
                        if (dc.length !== 6) return;
                        const r = hexToRgb(dc);
                        const d = Math.sqrt(Math.pow(t[0]-r[0],2)+Math.pow(t[1]-r[1],2)+Math.pow(t[2]-r[2],2));
                        if (d < bestD) { bestD = d; best = el; }
                    });
                    if (best && bestD < 120) best.click();
                }""", hex_val)
                page.wait_for_timeout(300)
            page.keyboard.press("ArrowRight")
            colored += 1
            logger.info(f"  소제목 색상 적용: '{sub['text']}'")
        except Exception as e:
            logger.info(f"  소제목 색상 오류: {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    logger.info(f"  소제목 색상 완료: {colored}/{subtitle_count}개")
    return colored


def _apply_color_to_quotes(page: Page, target, color_hex: str) -> int:
    """인용구(quotation) 컴포넌트의 텍스트에 색상 적용.

    인용구는 줄바꿈/강조 span 분리 때문에 UI 선택 방식(Home+Shift+End)이
    일부 글자에만 색을 적용할 수 있다. 저장 시 유지되는 inline style로
    컴포넌트 내부 텍스트 전체에 직접 적용한다.
    """
    color = color_hex if color_hex.startswith("#") else f"#{color_hex}"
    try:
        result = target.evaluate("""(color) => {
            const quotes = [...document.querySelectorAll('.se-component.se-quotation')];
            let colored = 0;
            for (const quote of quotes) {
                const paragraphs = [...quote.querySelectorAll('.se-text-paragraph')];
                let hasText = false;
                for (const p of paragraphs) {
                    const text = (p.textContent || '').trim();
                    if (!text) continue;
                    hasText = true;
                    p.style.color = color;
                    const textEls = p.querySelectorAll('span, b, strong, em, i, u, a');
                    textEls.forEach((el) => {
                        el.style.color = color;
                    });
                }
                const textModules = quote.querySelectorAll('.se-module-text, .se-quote');
                textModules.forEach((el) => { el.style.color = color; });
                if (hasText) colored += 1;
            }
            return { colored, total: quotes.length };
        }""", color)
        colored = int((result or {}).get("colored", 0))
        total = int((result or {}).get("total", 0))
        logger.info(f"  인용구 색상 완료: {colored}/{total}개")
        return colored
    except Exception as e:
        logger.info(f"  인용구 색상 오류: {e}")
        return 0


def _apply_auto_emphasis(page: Page, target, color_hex: str) -> int:
    """본문에서 숫자 포함 구문/핵심어를 자동 감지하여 볼드+색상 적용.

    감지 패턴: 숫자+단위 (예: 3개월, 2시간, 100만원, 60%)
    """
    hex_val = color_hex.lstrip("#").upper()
    color_btn = target.query_selector('button[data-name="font-color"]')

    # iframe 오프셋 계산
    iframe_offset_x, iframe_offset_y = 0, 0
    ix, iy = 0, 0  # alias
    try:
        if target != page:
            offset = page.evaluate("""() => {
                const iframe = document.querySelector('iframe[name="mainFrame"]');
                if (!iframe) return {x:0, y:0};
                const r = iframe.getBoundingClientRect();
                return {x: r.x, y: r.y};
            }""")
            iframe_offset_x = offset.get("x", 0)
            iframe_offset_y = offset.get("y", 0)
            logger.info(f"  iframe 오프셋: ({iframe_offset_x}, {iframe_offset_y})")
    except Exception:
        pass

    # 맨 위로 스크롤
    try:
        target.evaluate("() => { const c = document.querySelector('.se-main-container'); if(c) c.scrollTop = 0; }")
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(300)
    except Exception:
        pass

    # JS로 본문에서 강조할 구문 추출 (숫자+단위, 핵심 명사구 등)
    targets = target.evaluate(r"""() => {
        const result = [];
        const seen = new Set();
        // 패턴 1: 숫자+단위 (3개월, 100만원, 60% 등)
        const numPattern = /(\d+[\d,.]*\s*(?:개|개월|년|년간|시간|분|초|만원|억원|원|%|배|가지|단계|종|회|번|일|주|개월간|만|천|조))/g;
        // 패턴 2: 핵심 구문 (4~15자의 명사형 구문)
        const phrasePattern = /(?:가장\s+\S{2,6}|핵심\s+\S{2,6}|중요한\s+\S{2,6}|실제로\s+\S{2,8}|특히\s+\S{2,8}|약\s+\d+\S{1,4}|매일\s+\S{2,6}|완전히\s+\S{2,6})/g;
        const patterns = [numPattern, phrasePattern];

        const paragraphs = document.querySelectorAll('.se-component.se-text .se-text-paragraph');
        for (const pat of patterns) {
            for (const p of paragraphs) {
                const text = p.textContent || '';
                pat.lastIndex = 0;
                let match;
                while ((match = pat.exec(text)) !== null) {
                    const phrase = match[0].trim();
                    if (phrase.length < 2 || phrase.length > 20) continue;
                    if (seen.has(phrase)) continue;
                    seen.add(phrase);
                    result.push({ text: phrase, paraText: text.slice(0, 30) });
                    if (result.length >= 12) break;
                }
                if (result.length >= 12) break;
            }
        }
        return result;
    }""")

    if not targets:
        logger.info("  자동 강조: 대상 없음")
        return 0

    applied = 0
    for ti, t in enumerate(targets[:12]):
        try:
            phrase = t["text"]

            # 해당 구문이 있는 paragraph를 찾고 scrollIntoView + 좌표 반환
            para_pos = target.evaluate("""(text) => {
                const paragraphs = document.querySelectorAll('.se-component.se-text .se-text-paragraph');
                for (const p of paragraphs) {
                    const content = p.textContent || '';
                    if (!content.includes(text)) continue;
                    p.scrollIntoView({ block: 'center', behavior: 'instant' });
                    const r = p.getBoundingClientRect();
                    // 구문의 시작 위치 (문자 오프셋)
                    const idx = content.indexOf(text);
                    return { px: r.x + 10, py: r.y + r.height / 2, offset: idx, len: text.length, plen: content.length, ok: true };
                }
                return { ok: false };
            }""", phrase)

            if not para_pos or not para_pos.get("ok"):
                continue

            page.wait_for_timeout(200)

            # paragraph 클릭 (SE가 커서를 인식)
            px = para_pos["px"] + ix
            py = para_pos["py"] + iy
            page.mouse.click(px, py)
            page.wait_for_timeout(150)

            # Home으로 줄 시작점 이동
            page.keyboard.press("Home")
            page.wait_for_timeout(50)

            # offset만큼 ArrowRight로 구문 시작점까지 이동
            for _ in range(para_pos["offset"]):
                page.keyboard.press("ArrowRight")

            # Shift+ArrowRight로 구문 길이만큼 선택
            for _ in range(para_pos["len"]):
                page.keyboard.press("Shift+ArrowRight")
            page.wait_for_timeout(150)

            # 선택 검증
            sel = target.evaluate("() => (window.getSelection().toString() || '').trim()")
            if not sel or phrase not in sel:
                logger.info(f"  자동 강조 스킵: '{phrase}' (선택='{sel[:20]}')")
                page.keyboard.press("ArrowRight")
                continue

            # Ctrl+B 볼드
            page.keyboard.press("Control+b")
            page.wait_for_timeout(100)

            # 컬러피커 색상 적용
            if hex_val:
                cbtn = target.query_selector('button[data-name="font-color"]')
                if cbtn:
                    cbtn.click()
                    page.wait_for_timeout(700)
                    target.evaluate("""(hex) => {
                        const hexToRgb = (h) => [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
                        const t = hexToRgb(hex);
                        let best = null, bestD = Infinity;
                        document.querySelectorAll('.se-palette-item, [data-color]').forEach(el => {
                            const dc = (el.getAttribute('data-color') || '').replace('#', '');
                            if (dc.length !== 6) return;
                            const r = hexToRgb(dc);
                            const d = Math.sqrt(Math.pow(t[0]-r[0],2)+Math.pow(t[1]-r[1],2)+Math.pow(t[2]-r[2],2));
                            if (d < bestD) { bestD = d; best = el; }
                        });
                        if (best && bestD < 120) best.click();
                    }""", hex_val)
                    page.wait_for_timeout(300)

            page.keyboard.press("ArrowRight")
            applied += 1
            logger.info(f"  자동 강조: '{phrase}'")
        except Exception as e:
            logger.info(f"  자동 강조 오류: '{phrase}' — {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    logger.info(f"  자동 강조 완료: {applied}/{len(targets)}개")
    return applied


def _apply_emphasis_post(page: Page, target, phrases: list[str], color_hex: str = "") -> int:
    """모든 텍스트 입력 후, 강조 구문에 볼드+색상 일괄 적용.

    1) JS로 에디터 DOM에서 강조 구문 텍스트 위치(좌표) 탐색
    2) 물리적 mouse click + Shift+click으로 선택 (SE 내부 선택 추적 반영)
    3) Ctrl+B로 볼드
    4) 색상이 있으면 SE 컬러피커로 적용
    """
    color_hex = color_hex.lstrip("#").upper() if color_hex else ""
    applied = 0

    # 플로팅 메뉴 닫기
    try:
        target.evaluate("""() => {
            document.querySelectorAll('.se-floating-material-menu, .se-floating-menu')
                .forEach(el => { el.style.display = 'none'; el.classList.remove('se-is-expanded'); });
        }""")
    except Exception:
        pass

    # 컬러피커 버튼 미리 찾기
    color_btn = None
    if color_hex:
        color_btn = target.query_selector('button[data-name="font-color"]')

    # 중복 제거 (같은 구문 여러번 나올 수 있음)
    seen = set()
    unique_phrases = []
    for p in phrases:
        if p not in seen:
            seen.add(p)
            unique_phrases.append(p)

    for phrase in unique_phrases[:15]:  # 최대 15개 (시간 제한)
        try:
            # JS로 해당 텍스트의 좌표 찾기
            pos = target.evaluate("""(text) => {
                // 인용구/소제목 내부는 제외하고 본문 텍스트에서만 검색
                const paragraphs = document.querySelectorAll('.se-component.se-text .se-text-paragraph');
                for (const p of paragraphs) {
                    const content = p.textContent || '';
                    const idx = content.indexOf(text);
                    if (idx === -1) continue;

                    // 텍스트 노드에서 정확한 위치 찾기
                    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                    let charCount = 0;
                    while (walker.nextNode()) {
                        const node = walker.currentNode;
                        const nodeLen = node.textContent.length;
                        if (charCount + nodeLen > idx) {
                            // 이 노드에 시작점이 있음
                            const range = document.createRange();
                            range.setStart(node, idx - charCount);

                            // 끝점 찾기
                            let endCharCount = charCount;
                            let endNode = node;
                            const targetEnd = idx + text.length;
                            const treeWalker2 = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                            let ec = 0;
                            while (treeWalker2.nextNode()) {
                                const n2 = treeWalker2.currentNode;
                                if (ec + n2.textContent.length >= targetEnd) {
                                    range.setEnd(n2, targetEnd - ec);
                                    break;
                                }
                                ec += n2.textContent.length;
                            }

                            const rects = range.getClientRects();
                            if (rects.length > 0) {
                                const r = rects[0];
                                const lastR = rects[rects.length - 1];
                                return {
                                    startX: r.x + 2,
                                    startY: r.y + r.height / 2,
                                    endX: lastR.x + lastR.width - 2,
                                    endY: lastR.y + lastR.height / 2,
                                    found: true
                                };
                            }
                        }
                        charCount += nodeLen;
                    }
                }
                return { found: false };
            }""", phrase)

            if not pos or not pos.get("found"):
                logger.info(f"  강조 구문 못 찾음: '{phrase[:20]}'")
                continue

            # 물리적 마우스 선택
            page.mouse.click(pos["startX"], pos["startY"])
            page.wait_for_timeout(150)
            page.keyboard.down("Shift")
            page.mouse.click(pos["endX"], pos["endY"])
            page.keyboard.up("Shift")
            page.wait_for_timeout(200)

            # Ctrl+B 볼드 적용
            page.keyboard.press("Control+b")
            page.wait_for_timeout(150)

            # 색상 적용 (컬러피커)
            if color_hex and color_btn:
                color_btn.click()
                page.wait_for_timeout(800)
                # 프리셋 팔레트에서 가장 가까운 색 선택
                color_result = target.evaluate("""(hex) => {
                    const hexToRgb = (h) => {
                        h = h.replace('#', '');
                        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
                    };
                    const target = hexToRgb(hex);
                    let bestEl = null, bestDist = Infinity;
                    document.querySelectorAll('.se-palette-item, [data-color]').forEach(el => {
                        const dc = (el.getAttribute('data-color') || '').replace('#', '');
                        if (dc.length !== 6) return;
                        const rgb = hexToRgb(dc);
                        const dist = Math.sqrt(
                            Math.pow(target[0]-rgb[0], 2) +
                            Math.pow(target[1]-rgb[1], 2) +
                            Math.pow(target[2]-rgb[2], 2)
                        );
                        if (dist < bestDist) { bestDist = dist; bestEl = el; }
                    });
                    if (bestEl && bestDist < 120) { bestEl.click(); return true; }
                    return false;
                }""", color_hex)
                if not color_result:
                    page.keyboard.press("Escape")
                page.wait_for_timeout(300)

            # 선택 해제
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(100)

            applied += 1
            logger.info(f"  강조 적용: '{phrase[:20]}' (볼드{'+색상' if color_hex else ''})")

        except Exception as e:
            logger.info(f"  강조 적용 오류: '{phrase[:20]}' — {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    logger.info(f"  강조 post-processing 완료: {applied}/{len(unique_phrases)}개")
    return applied


def _apply_color_to_bold_texts(page: Page, target, color_hex: str) -> int:
    """본문의 모든 볼드(<b>/<strong>) 텍스트를 찾아 SE 툴바 컬러피커로 색상 적용.

    방법: 각 볼드 요소를 JS로 클릭+선택 → 글자색 버튼 Playwright 클릭 →
    컬러피커에서 hex 입력 → 적용. SE 내부 모델에 반영됨.
    """
    color_hex = color_hex.lstrip("#").upper()
    colored = 0

    # 1) 볼드 요소 목록 수집 (인용구 제외)
    bold_infos = target.evaluate("""() => {
        const result = [];
        const quoteEls = new Set();
        document.querySelectorAll('.se-component.se-quotation b, .se-component.se-quotation strong')
            .forEach(b => quoteEls.add(b));

        document.querySelectorAll('.se-component.se-text b, .se-component.se-text strong')
            .forEach((el, idx) => {
                if (quoteEls.has(el)) return;
                const text = (el.textContent || '').trim();
                if (text.length < 2) return;
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    result.push({ idx, text: text.slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height });
                }
            });
        return result;
    }""")

    if not bold_infos:
        logger.info("  볼드 텍스트 없음 — 색상 적용 스킵")
        return 0

    logger.info(f"  볼드 텍스트 {len(bold_infos)}개 발견, 색상 적용 시작: #{color_hex}")

    # 글자색 버튼 위치 확인
    color_btn = target.query_selector('button[data-name="font-color"]')
    if not color_btn:
        color_btn = target.query_selector('.se-font-color-toolbar-button')
    if not color_btn:
        logger.info("  글자색 버튼 못 찾음 — 스킵")
        return 0

    for info in bold_infos:
        try:
            # 0) 플로팅 메뉴 닫기 (글감 추천 등)
            target.evaluate("""() => {
                document.querySelectorAll('.se-floating-material-menu, .se-floating-menu').forEach(el => {
                    el.style.display = 'none';
                    el.classList.remove('se-is-expanded');
                });
            }""")
            page.wait_for_timeout(200)

            # 1) 물리적 마우스 클릭으로 볼드 텍스트 선택 (SE 내부 선택 추적 반영)
            # 볼드 요소의 시작점 클릭 → Shift+End로 줄 끝까지 선택
            x_start = info['x'] + 2
            y_center = info['y'] + info['h'] / 2
            x_end = info['x'] + info['w'] - 2

            # 시작점 클릭
            page.mouse.click(x_start, y_center)
            page.wait_for_timeout(200)
            # Shift+클릭으로 끝점까지 선택
            page.keyboard.down("Shift")
            page.mouse.click(x_end, y_center)
            page.keyboard.up("Shift")
            page.wait_for_timeout(300)

            # 2) 글자색 버튼 클릭 → 팔레트 열기
            color_btn.click()
            page.wait_for_timeout(1000)

            # 3) 팔레트에서 색상 선택 (프리셋 또는 가장 가까운 색)
            applied = target.evaluate("""(hex) => {
                // data-color 속성으로 프리셋 검색
                const els = document.querySelectorAll(
                    '.se-palette-item, [data-color], .se-color-picker button, ' +
                    '.se-popup button[style*="background"]'
                );

                // 정확 매치
                for (const el of els) {
                    const dc = (el.getAttribute('data-color') || '').replace('#', '').toUpperCase();
                    const bg = (el.style.backgroundColor || '');
                    if (dc === hex) {
                        el.click();
                        return 'exact:' + dc;
                    }
                }

                // 가장 가까운 색 찾기 (RGB 거리)
                const hexToRgb = (h) => {
                    h = h.replace('#', '');
                    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
                };
                const target = hexToRgb(hex);
                let bestEl = null, bestDist = Infinity, bestColor = '';

                for (const el of els) {
                    const dc = (el.getAttribute('data-color') || '').replace('#', '');
                    if (dc.length !== 6) continue;
                    const rgb = hexToRgb(dc);
                    const dist = Math.sqrt(
                        Math.pow(target[0]-rgb[0], 2) +
                        Math.pow(target[1]-rgb[1], 2) +
                        Math.pow(target[2]-rgb[2], 2)
                    );
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestEl = el;
                        bestColor = dc;
                    }
                }

                if (bestEl && bestDist < 100) {
                    bestEl.click();
                    return 'nearest:' + bestColor + '(dist=' + Math.round(bestDist) + ')';
                }

                return '';
            }""", color_hex)

            if applied:
                page.wait_for_timeout(500)
                colored += 1
                logger.info(f"  볼드 색상 적용: '{info['text']}' → {applied}")
            else:
                page.keyboard.press("Escape")
                page.wait_for_timeout(200)
                logger.info(f"  볼드 색상 실패: '{info['text']}' (프리셋에 매칭 색상 없음)")

        except Exception as e:
            logger.info(f"  볼드 색상 오류: {e}")
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass

    # 선택 해제
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)

    logger.info(f"  볼드 색상 일괄 적용 완료: {colored}/{len(bold_infos)}개")
    return colored


def _insert_sticker(page: Page, target) -> bool:
    """에디터에 네이버 스티커 1개 삽입.

    스티커 버튼은 toggle-button → 오른쪽에 사이드 패널이 열림.
    패널 내 스티커팩 목록 → 스티커 아이템 클릭 → 본문에 삽입 → 패널 닫기.
    """
    # 1) 스티커 버튼 클릭 (사이드 패널 열기)
    try:
        clicked = target.evaluate("""() => {
            const btn = document.querySelector(
                'button[data-name="sticker"], button.se-sticker-toolbar-button'
            );
            if (btn) { btn.click(); return true; }
            return false;
        }""")
        if not clicked:
            logger.info("스티커 버튼 못 찾음")
            return False
    except Exception:
        return False

    # 2) 사이드 패널 로딩 대기 (스티커 아이템이 나타날 때까지)
    page.wait_for_timeout(2500)

    # 디버그: 스티커 패널 스크린샷
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "sticker_panel.png"))
    except Exception:
        pass

    # 3) 스티커 아이템 클릭 — button.se-sidebar-element-sticker
    inserted = False
    for ctx in [target, page] + list(page.frames):
        try:
            result = ctx.evaluate("""() => {
                // 스티커 패널의 실제 구조:
                // li.se-sidebar-item > button.se-sidebar-element-sticker > span.se-sidebar-sticker (background-image 스프라이트)
                const stickerBtns = document.querySelectorAll('button.se-sidebar-element-sticker, button.se-sidebar-element');
                const candidates = [];
                for (const btn of stickerBtns) {
                    const r = btn.getBoundingClientRect();
                    if (r.width >= 30 && r.width <= 200 && r.height >= 30 && r.height <= 200) {
                        candidates.push(btn);
                    }
                }

                // 폴백: img 기반 스티커 (구버전 에디터)
                if (candidates.length === 0) {
                    const imgs = document.querySelectorAll('.se-sticker-item img, [class*="sticker"] img');
                    for (const img of imgs) {
                        const r = img.getBoundingClientRect();
                        if (r.width >= 30 && r.width <= 200) candidates.push(img);
                    }
                }

                if (candidates.length > 0) {
                    const idx = Math.floor(Math.random() * Math.min(candidates.length, 20));
                    candidates[idx].click();
                    return candidates.length;
                }
                return 0;
            }""")

            if result and result > 0:
                page.wait_for_timeout(1000)
                logger.info(f"스티커 삽입 완료 ({result}개 중 랜덤 선택)")
                inserted = True
                break
        except Exception:
            continue

    # 4) 패널 닫기 (토글이므로 다시 클릭)
    try:
        target.evaluate("""() => {
            const btn = document.querySelector(
                'button[data-name="sticker"], button.se-sticker-toolbar-button'
            );
            if (btn) btn.click();
        }""")
    except Exception:
        page.keyboard.press("Escape")

    page.wait_for_timeout(300)
    return inserted


def _dismiss_popups(page: Page, target=None) -> int:
    """SmartEditor의 임시저장/알림 팝업을 강제로 모두 닫음.

    여러 방법 시도:
    1. 모든 frame에서 취소/닫기 버튼 찾아 클릭
    2. page.evaluate로 직접 DOM 조작 (overlay 우회)
    3. ESC 키
    Returns: 닫은 팝업 개수
    """
    closed = 0
    cancel_selectors = [
        ".se-popup-button-cancel",
        ".se-popup-alert button.se-popup-button-cancel",
        ".se-popup-alert-confirm button.se-popup-button-cancel",
        "button.se-popup-button[data-name='cancel']",
        "button.se-popup-button:has-text('취소')",
        ".se-popup button:has-text('취소')",
        ".se-popup button:has-text('닫기')",
        ".se-popup button:has-text('나가기')",
        "button:has-text('취소')",
    ]

    contexts = [page] + list(page.frames)
    if target and target not in contexts:
        contexts.insert(0, target)

    for ctx in contexts:
        for sel in cancel_selectors:
            try:
                btns = ctx.query_selector_all(sel) if hasattr(ctx, "query_selector_all") else []
                for btn in btns:
                    try:
                        if btn.is_visible():
                            btn.click()
                            page.wait_for_timeout(300)
                            closed += 1
                    except Exception:
                        continue
            except Exception:
                continue

    # JavaScript 강제 닫기 (DOM 직접 제거, overlay 우회)
    try:
        for ctx in contexts:
            if hasattr(ctx, "evaluate"):
                try:
                    n = ctx.evaluate(_POPUP_CLOSE_JS)
                    closed += int(n or 0)
                except Exception:
                    continue
    except Exception:
        pass

    # ESC 키 폴백
    try:
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
        page.keyboard.press("Escape")
    except Exception:
        pass

    return closed


def _enter_write_page(page: Page) -> Page | object | None:
    """블로그 글쓰기 페이지로 이동, 에디터 frame 또는 page 반환.

    네이버 블로그 글쓰기는 보통 mainFrame iframe 안에 SmartEditor가 들어있음.
    구조: page → iframe[name=mainFrame] → SmartEditor
    세션 만료 시 로그인 페이지로 리다이렉트되면 None 반환.
    """
    page.goto("https://blog.naver.com/GoBlogWrite.naver", wait_until="domcontentloaded")
    # SmartEditor 로딩 대기 — 에디터 요소가 나타날 때까지 (최대 15초)
    try:
        page.wait_for_selector(
            ".se-text-paragraph, [contenteditable='true'], .se-main-container",
            timeout=15000, state="visible"
        )
        page.wait_for_timeout(1500)  # 에디터 초기화 안정화
    except PWTimeout:
        page.wait_for_timeout(5000)  # 폴백: 고정 대기

    # 세션 만료로 로그인 페이지로 리다이렉트됐는지 확인
    current_url = page.url
    if "nidlogin" in current_url or "nid.naver.com" in current_url or "login" in current_url.lower():
        logger.warning(f"세션 만료 — 로그인 페이지로 리다이렉트됨: {current_url[:80]}")
        return None

    # mainFrame iframe 우선 탐색
    main_frame = None
    for frame in page.frames:
        name = frame.name or ""
        url = frame.url or ""
        if name == "mainFrame" or "PostWriteForm" in url or "editor" in url.lower():
            main_frame = frame
            break

    if main_frame:
        # mainFrame도 로그인 페이지로 리다이렉트됐을 수 있음
        frame_url = main_frame.url or ""
        if "nidlogin" in frame_url or "nid.naver.com" in frame_url:
            logger.warning(f"세션 만료 — mainFrame이 로그인 페이지: {frame_url[:80]}")
            return None
        logger.info(f"에디터 frame 발견: {main_frame.name} ({main_frame.url[:60]})")
        try:
            main_frame.wait_for_load_state("domcontentloaded", timeout=10000)
        except Exception:
            pass
        page.wait_for_timeout(2000)

    # 팝업 닫기 (최대 3회 시도)
    for attempt in range(3):
        n = _dismiss_popups(page, main_frame)
        if n == 0:
            break
        logger.info(f"팝업 {n}개 닫음 (attempt {attempt+1})")
        page.wait_for_timeout(500)

    # ── 디버그: 에디터 툴바 HTML 구조 덤프 ──
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "editor_loaded.png"), full_page=True)
        with open(str(debug_dir / "editor_dom.txt"), "w", encoding="utf-8") as f:
            for fr in page.frames:
                f.write(f"\n{'='*60}\nFRAME: name={fr.name!r} url={fr.url[:100]}\n{'='*60}\n")
                try:
                    # 툴바 영역 HTML (상단 200px 이내 요소들)
                    toolbar_html = fr.evaluate("""
                        () => {
                            const els = document.querySelectorAll('*');
                            let result = '';
                            for (const el of els) {
                                const r = el.getBoundingClientRect();
                                if (r.y < 200 && r.height > 0 && r.height < 100) {
                                    const tag = el.tagName.toLowerCase();
                                    const cls = el.className ? (' class="' + (typeof el.className === 'string' ? el.className : '') + '"') : '';
                                    const aria = el.getAttribute('aria-label') ? (' aria-label="' + el.getAttribute('aria-label') + '"') : '';
                                    const name = el.getAttribute('data-name') ? (' data-name="' + el.getAttribute('data-name') + '"') : '';
                                    const text = (el.textContent || '').trim().slice(0, 30);
                                    if (text || cls || aria || name) {
                                        result += `<${tag}${cls}${aria}${name}> text="${text}" [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]\\n`;
                                    }
                                }
                            }
                            return result;
                        }
                    """)
                    f.write(toolbar_html or "(empty)")
                except Exception as e:
                    f.write(f"(접근 불가: {e})\n")
        logger.info("디버그: editor_dom.txt, editor_loaded.png 저장됨")
    except Exception:
        pass

    return main_frame if main_frame else page


def _input_title(target, title: str, page: Page = None) -> bool:
    """제목 입력. target은 page 또는 frame, page는 keyboard 폴백용."""
    # 클릭 전 팝업 재확인 (동적으로 뜰 수 있음)
    if page:
        _dismiss_popups(page, target)

    selectors = [
        ".se-title-text [contenteditable='true']",
        ".se-title-text",
        ".se-title-text [contenteditable]",
        ".se_editArea .se-title-text",
        '[placeholder*="제목"]',
        ".title__input",
        ".se_title input",
        'textarea[placeholder*="제목"]',
        "textarea.se-title-text",
        "span.se-placeholder",
        # 2026 신규 에디터 셀렉터
        "[data-testid='title']",
        ".editor_title [contenteditable]",
        ".blog_editor_title",
        "[class*='title'] [contenteditable='true']",
    ]

    el = None
    actual_target = target

    for st in _iter_contexts(page, target):
        el = _try_selectors(st, selectors, timeout=1800)
        if el:
            actual_target = st
            break

    kb = page.keyboard if page else None

    if el:
        # 팝업이 클릭을 가로챌 수 있으니 재시도 루프
        for attempt in range(5):
            try:
                el.click(timeout=5000)
                if page:
                    page.wait_for_timeout(300)
                # 기존 텍스트 전체 선택 후 삭제 (템플릿 기본 제목 제거)
                if kb:
                    kb.press("Control+a")
                    kb.press("Backspace")
                    page.wait_for_timeout(200)
                try:
                    el.fill(title)
                    return True
                except Exception:
                    if kb:
                        kb.type(title, delay=20)
                        return True
            except Exception as e:
                logger.warning(f"제목 클릭 실패 (attempt {attempt+1}): {e}")
                # 팝업 다시 닫고 재시도
                if page:
                    _dismiss_popups(page, actual_target)
                    page.wait_for_timeout(1000)
                # 셀렉터 재탐색 (DOM이 변경됐을 수 있음)
                el = _try_selectors(actual_target, selectors, timeout=1800)
                if not el:
                    break

    # JS 폴백: 셀렉터로 못 찾으면 JS로 직접 제목 요소 찾아 입력
    if page:
        logger.info("셀렉터 실패, JS 폴백으로 제목 입력 시도")
        for jt in _iter_contexts(page, target):
            try:
                handle = jt.evaluate_handle("""() => {
                    const visible = (el) => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0;
                    };
                    const preferred = [
                        '.se-title-text [contenteditable="true"]',
                        '.se-title-text',
                        '[placeholder*="제목"]',
                        '[data-testid="title"]',
                        '[class*="title"] [contenteditable="true"]'
                    ];
                    for (const sel of preferred) {
                        const el = document.querySelector(sel);
                        if (el && visible(el)) return el;
                    }
                    const candidates = document.querySelectorAll('[contenteditable="true"], textarea, input');
                    for (const el of candidates) {
                        const rect = el.getBoundingClientRect();
                        const txt = (el.getAttribute('placeholder') || el.textContent || '').trim();
                        if (visible(el) && rect.y < 360 && rect.width > 200 && rect.height < 140) {
                            if (!txt || txt.includes('제목') || el.closest('[class*="title"]')) return el;
                        }
                    }
                    return null;
                }""")
                cand = handle.as_element() if handle else None
                if cand:
                    cand.click(timeout=5000)
                    page.wait_for_timeout(200)
                    page.keyboard.press("Control+a")
                    page.keyboard.press("Backspace")
                    page.keyboard.type(title, delay=20)
                    logger.info("JS 폴백 요소 클릭 후 제목 입력 성공")
                    return True
            except Exception as e:
                logger.warning(f"JS 폴백 실패: {e}")

    # 디버그 저장
    if page:
        try:
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(debug_dir / "title_not_found.png"), full_page=True)
            with open(debug_dir / "title_not_found.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            with open(debug_dir / "frames.txt", "w", encoding="utf-8") as f:
                for fr in page.frames:
                    f.write(f"name={fr.name} url={fr.url}\n")
            logger.info(f"디버그 파일 저장: {debug_dir}")
        except Exception as e:
            logger.warning(f"디버그 저장 실패: {e}")
    return False


def _escape_quote_block(page: Page, target, kb):
    """인용구 블록 바로 뒤로 커서를 이동시킨다.

    인용구 컴포넌트의 바로 다음 형제 텍스트 영역을 클릭.
    문서 끝이면 안 됨 — 반드시 인용구 바로 다음 위치여야 함.
    """
    page.wait_for_timeout(200)

    # 방법: 인용구 컴포넌트의 nextSibling 찾아서 클릭
    try:
        escaped = target.evaluate("""() => {
            const sel = window.getSelection();
            if (!sel || !sel.anchorNode) return 'no_sel';

            // 현재 위치에서 se-component 레벨까지 올라가기
            let comp = null;
            let node = sel.anchorNode;
            while (node && node !== document.body) {
                if (node.nodeType === 1) {
                    const cls = node.className || '';
                    if (cls.includes('se-component') && !cls.includes('se-component-content')
                        && !cls.includes('se-component-container')) {
                        comp = node;
                        break;
                    }
                }
                node = node.parentElement;
            }
            if (!comp) return 'no_comp';

            // 다음 형제가 텍스트 컴포넌트이면 거기에 포커스
            let next = comp.nextElementSibling;
            if (next) {
                const p = next.querySelector('.se-text-paragraph');
                if (p) {
                    p.click();
                    const range = document.createRange();
                    range.selectNodeContents(p);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return 'next_sibling';
                }
            }

            // 다음 형제가 없으면 (인용구가 마지막 컴포넌트) → 안전한 방법 없음
            return 'no_next';
        }""")
        logger.info(f"  인용구 탈출: {escaped}")
        if escaped == 'next_sibling':
            page.wait_for_timeout(200)
            return
    except Exception as e:
        logger.info(f"  인용구 탈출 JS 실패: {e}")

    # 폴백: + 버튼 클릭 또는 ArrowDown
    try:
        plus_clicked = target.evaluate("""() => {
            // 에디터 왼쪽 + 버튼 (새 컴포넌트 추가)
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
                const cls = b.className || '';
                if (cls.includes('add') && !cls.includes('toolbar')) {
                    const r = b.getBoundingClientRect();
                    if (r.x < 100 && r.width < 50 && r.height < 50 && r.width > 10) {
                        b.click();
                        return true;
                    }
                }
            }
            return false;
        }""")
        if plus_clicked:
            page.wait_for_timeout(500)
            kb.press("Escape")
            page.wait_for_timeout(200)
            logger.info("  인용구 탈출: + 버튼")
            return
    except Exception:
        pass

    kb.press("End")
    for _ in range(5):
        kb.press("ArrowDown")
    page.wait_for_timeout(200)
    logger.info("  인용구 탈출: ArrowDown 폴백")


def _insert_quote_html(page: Page, target, text: str, style: str = "underline", color: str = "", font_size: str = "17") -> bool:
    """인용구를 JS로 직접 HTML 삽입 (버튼 클릭 방식 대체).

    SmartEditor의 se-quotation 컴포넌트 HTML을 직접 생성하여
    현재 커서 위치에 삽입. 버튼 클릭+탈출 문제를 완전히 우회.
    스타일 class를 직접 지정하므로 인용구 스타일이 확실히 적용됨.
    """
    style_class = f"se-l-quotation_{style}"
    escaped_text = text.replace("'", "\\'").replace('"', '\\"').replace("\n", " ")
    fs_class = f"se-fs-fs{font_size}"

    try:
        result = target.evaluate("""(args) => {
            const [text, styleClass, colorHex, fsClass] = args;
            const uid = 'SE-' + Math.random().toString(36).slice(2, 14);
            const colorStyle = colorHex ? ` style="color:${colorHex}"` : '';

            // 인용구 컴포넌트 HTML — 스타일 class 직접 적용
            const quoteHtml = `
<div class="se-component se-quotation ${styleClass}" id="${uid}">
  <div class="se-component-content">
    <div class="se-section se-section-quotation ${styleClass}">
      <blockquote class="se-quotation-container">
        <div class="se-module se-module-text se-quote">
          <p class="se-text-paragraph se-text-paragraph-align-center">
            <span class="${fsClass} se-ff-"${colorStyle}><b>${text}</b></span>
          </p>
        </div>
      </blockquote>
    </div>
  </div>
</div>`;

            // 현재 커서 위치의 컴포넌트 찾기
            const sel = window.getSelection();
            let currentComp = null;
            if (sel && sel.anchorNode) {
                let node = sel.anchorNode;
                while (node && node.parentElement) {
                    if ((node.className || '').includes('se-component') &&
                        !(node.className || '').includes('se-component-content')) {
                        currentComp = node;
                        break;
                    }
                    node = node.parentElement;
                }
            }

            // 메인 컨테이너 찾기
            const container = document.querySelector('.se-main-container');
            if (!container) return false;

            // 임시 div로 파싱
            const temp = document.createElement('div');
            temp.innerHTML = quoteHtml.trim();
            const quoteEl = temp.firstElementChild;

            // 현재 컴포넌트 뒤에 삽입 (없으면 맨 끝에)
            if (currentComp && currentComp.parentElement === container) {
                container.insertBefore(quoteEl, currentComp.nextSibling);
            } else {
                container.appendChild(quoteEl);
            }

            // 인용구 뒤에 빈 텍스트 컴포넌트 생성 (커서 이동용)
            const textComp = document.createElement('div');
            textComp.className = 'se-component se-text';
            textComp.innerHTML = '<div class="se-component-content"><div class="se-section se-section-text"><div class="se-module se-module-text"><p class="se-text-paragraph se-text-paragraph-align-"><span class="se-fs-fs15 se-ff-"><br></span></p></div></div></div>';
            container.insertBefore(textComp, quoteEl.nextSibling);

            // 커서를 새 텍스트 컴포넌트로 이동
            const newP = textComp.querySelector('.se-text-paragraph');
            if (newP && sel) {
                const range = document.createRange();
                range.selectNodeContents(newP);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }

            return true;
        }""", [escaped_text, style_class, color, fs_class])

        if result:
            page.wait_for_timeout(200)
            logger.info(f"  인용구 HTML 삽입: {text[:30]}... (color={color})")
            return True
    except Exception as e:
        logger.info(f"  인용구 HTML 삽입 실패: {e}")
    return False


def _se_api(target, js_code: str):
    """SmartEditor 내부 API 호출 헬퍼."""
    return target.evaluate(f"""() => {{
        const ed = SmartEditor._editors[Object.keys(SmartEditor._editors)[0]];
        {js_code}
    }}""")


def _se_insert_text(target, page: Page, text: str):
    """SE API로 텍스트 컴포넌트 삽입 + 내용 입력."""
    try:
        _se_api(target, 'ed._editingService.insertComponentsWithData([{ctype:"text"}]);')
        page.wait_for_timeout(200)
        page.keyboard.type(text, delay=2)
        return True
    except Exception:
        return False


def _se_insert_quotation(target, page: Page, text: str, layout: str = "quotation_underline"):
    """SE API로 인용구 컴포넌트 삽입 + 텍스트 입력."""
    try:
        _se_api(target, f'ed._editingService.insertComponentsWithData([{{ctype:"quotation", data:{{layout:"{layout}"}}}}]);')
        page.wait_for_timeout(300)
        page.keyboard.type(text, delay=2)
        return True
    except Exception:
        return False


def _patch_last_quote_style(target, page: Page, style: str, color: str = "", font_size: str = "17"):
    """방금 삽입된 마지막 인용구의 스타일 class를 강제 변경.

    SE API가 layout을 무시하므로, 삽입 후 DOM을 직접 수정하여
    se-l-quotation_{style} class를 추가한다.
    SE 내부 모델은 이미 quotation으로 등록되어 있으므로 저장 시 유지됨.
    """
    style_class = f"se-l-quotation_{style}"
    fs_class = f"se-fs-fs{font_size}"
    try:
        result = target.evaluate("""(args) => {
            const [styleClass, colorHex, fsClass] = args;

            // 마지막 인용구 컴포넌트 찾기
            const allQuotes = document.querySelectorAll('.se-component.se-quotation');
            if (allQuotes.length === 0) return 'no_quotes';
            const lastQuote = allQuotes[allQuotes.length - 1];

            // 기존 quotation 스타일 class 제거
            const classes = lastQuote.className.split(' ');
            const cleaned = classes.filter(c => !c.startsWith('se-l-quotation_'));
            cleaned.push(styleClass);
            lastQuote.className = cleaned.join(' ');

            // section 레벨에도 적용
            const section = lastQuote.querySelector('.se-section-quotation');
            if (section) {
                const sCls = section.className.split(' ').filter(c => !c.startsWith('se-l-quotation_'));
                sCls.push(styleClass);
                section.className = sCls.join(' ');
            }

            // 색상 적용
            if (colorHex) {
                const spans = lastQuote.querySelectorAll('.se-text-paragraph span');
                spans.forEach(s => { s.style.color = colorHex; });
                // b/strong 태그에도
                const bolds = lastQuote.querySelectorAll('.se-text-paragraph b, .se-text-paragraph strong');
                bolds.forEach(b => { b.style.color = colorHex; });
            }

            // 글씨 크기 class 변경
            const spans = lastQuote.querySelectorAll('.se-text-paragraph span');
            spans.forEach(s => {
                const cls = s.className.split(' ').filter(c => !c.startsWith('se-fs-'));
                cls.push(fsClass);
                s.className = cls.join(' ');
            });

            return 'patched:' + styleClass;
        }""", [style_class, color, fs_class])
        if result and result.startswith('patched'):
            logger.info(f"  인용구 스타일 패치: {result}")
            return True
    except Exception as e:
        logger.info(f"  인용구 스타일 패치 실패: {e}")
    return False


def _se_insert_section_title(target, page: Page, text: str):
    """SE API로 소제목 컴포넌트 삽입 + 텍스트 입력."""
    try:
        _se_api(target, 'ed._editingService.insertComponentsWithData([{ctype:"sectionTitle"}]);')
        page.wait_for_timeout(200)
        page.keyboard.type(text, delay=2)
        return True
    except Exception:
        return False


def _se_insert_hr(target, page: Page):
    """SE API로 구분선 삽입."""
    try:
        _se_api(target, 'ed._editingService.insertComponentsWithData([{ctype:"horizontalLine"}]);')
        page.wait_for_timeout(200)
        return True
    except Exception:
        return False


def _se_set_style(target, name: str, value: str):
    """SE API로 텍스트 스타일 변경 (선택 영역에 적용)."""
    try:
        _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"{name}", value:"{value}"}});')
        return True
    except Exception:
        return False


def _se_toggle_bold(target):
    """SE API로 볼드 토글."""
    try:
        _se_api(target, 'ed._propertyChangeService.toggleStyle("bold");')
        return True
    except Exception:
        return False


def _clear_strikethrough(page: Page = None, target=None):
    """SmartEditor에 남아있는 취소선/밑줄 토글/스타일을 해제한다.

    일부 PC에서 이전 템플릿/툴바 상태가 이어져 본문 전체가 취소선/밑줄로
    입력되는 현상이 있어 입력 전후로 방어적으로 호출한다.
    """
    contexts = list(_iter_contexts(page, target))

    for ctx in contexts:
        try:
            ctx.evaluate("""() => {
                try {
                    if (document.queryCommandState && document.queryCommandState('strikeThrough')) {
                        document.execCommand('strikeThrough', false, null);
                    }
                } catch(e) {}
                try {
                    if (document.queryCommandState && document.queryCommandState('underline')) {
                        document.execCommand('underline', false, null);
                    }
                } catch(e) {}

                const isActive = (btn) => {
                    const cls = btn.className || '';
                    const pressed = btn.getAttribute('aria-pressed');
                    const selected = btn.getAttribute('aria-selected');
                    return pressed === 'true' || selected === 'true' ||
                        String(cls).includes('active') ||
                        String(cls).includes('selected') ||
                        String(cls).includes('is-active') ||
                        String(cls).includes('se-is-selected');
                };

                const selectors = [
                    'button[data-name="strike"]',
                    'button[data-name="strikethrough"]',
                    'button[data-name="strikeThrough"]',
                    'button[aria-label*="취소선"]',
                    'button[title*="취소선"]',
                    'button[data-name="underline"]',
                    'button[aria-label*="밑줄"]',
                    'button[title*="밑줄"]'
                ];
                for (const sel of selectors) {
                    document.querySelectorAll(sel).forEach(btn => {
                        try { if (isActive(btn)) btn.click(); } catch(e) {}
                    });
                }

                document.querySelectorAll('[style*="line-through"], s, strike, del').forEach(el => {
                    try {
                        if (el.style) {
                            el.style.textDecoration = '';
                            el.style.textDecorationLine = '';
                        }
                        if (['S', 'STRIKE', 'DEL'].includes(el.tagName)) {
                            const parent = el.parentNode;
                            while (el.firstChild) parent.insertBefore(el.firstChild, el);
                            parent.removeChild(el);
                        }
                    } catch(e) {}
                });

                // 밑줄 DOM 요소 제거
                document.querySelectorAll('[style*="underline"], u').forEach(el => {
                    try {
                        if (el.style && el.style.textDecoration && el.style.textDecoration.includes('underline')) {
                            el.style.textDecoration = '';
                            el.style.textDecorationLine = '';
                        }
                        if (el.tagName === 'U') {
                            const parent = el.parentNode;
                            while (el.firstChild) parent.insertBefore(el.firstChild, el);
                            parent.removeChild(el);
                        }
                    } catch(e) {}
                });
            }""")
        except Exception:
            continue


def _dismiss_blocking_popups(page: Page, target=None):
    """발행 버튼 클릭을 가로막는 네이버 에디터 팝업/오버레이를 닫는다."""
    try:
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)
    except Exception:
        pass

    for ctx in _iter_contexts(page, target):
        try:
            ctx.evaluate("""() => {
                const clickClose = (root) => {
                    const selectors = [
                        'button[aria-label*="닫"]',
                        'button[title*="닫"]',
                        'button[class*="close"]',
                        'a[class*="close"]',
                        '.btn_close',
                        '.close'
                    ];
                    for (const sel of selectors) {
                        root.querySelectorAll(sel).forEach(el => {
                            try {
                                const r = el.getBoundingClientRect();
                                if (r.width > 0 && r.height > 0) el.click();
                            } catch(e) {}
                        });
                    }
                };

                document.querySelectorAll('.layer_popup, [class*="LayerPopup"], [class*="layer_popup"]').forEach(layer => {
                    try {
                        const text = (layer.textContent || '').trim();
                        if (text.includes('발행') && text.includes('공개')) return;
                        clickClose(layer);
                        layer.style.pointerEvents = 'none';
                        layer.style.display = 'none';
                    } catch(e) {}
                });
            }""")
        except Exception:
            continue


def _click_publish_confirm_button(page: Page, target=None, attempts: int = 8) -> bool:
    """발행 사이드패널의 최종 발행 버튼을 현재 DOM에서 찾아 클릭한다.

    네이버 에디터는 패널 애니메이션/카테고리 변경 뒤 버튼 DOM을 자주 갈아끼운다.
    ElementHandle을 잡아둔 뒤 클릭하면 "not attached"가 나기 쉬워서, 클릭 시점에
    JS 안에서 visible 버튼을 다시 찾고 바로 클릭한다.
    """
    script = """() => {
        const visible = (el) => {
            if (!el || !el.isConnected) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
        };
        const textOf = (el) => (el.innerText || el.textContent || '').trim().replace(/\\s+/g, '');
        const enabled = (btn) => !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';
        const isFinalPublish = (btn) => {
            const t = textOf(btn);
            return enabled(btn) && (t === '발행' || t === '발행하기' || t === '확인' || t === '공개발행');
        };
        const click = (btn, prefix) => {
            btn.scrollIntoView({ block: 'center', inline: 'center' });
            btn.focus && btn.focus();
            const r = btn.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
                btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
            }
            try { btn.click(); } catch(e) {}
            return prefix + ':' + textOf(btn);
        };

        const panelSelector = [
            '[class*="publish_layer"]',
            '[class*="PublishLayer"]',
            '[class*="publish_setting"]',
            '[class*="PublishSetting"]',
            '[class*="layer_publish"]',
            '[class*="Publish"]',
            '[class*="sidebar"]',
            '[class*="Side"]',
            '[role="dialog"]',
            '[aria-modal="true"]'
        ].join(',');
        const panels = [...document.querySelectorAll(panelSelector)].filter(visible);
        for (const panel of panels.reverse()) {
            const panelText = textOf(panel);
            if (!/(발행|공개|카테고리|예약|설정)/.test(panelText)) continue;
            const buttons = [...panel.querySelectorAll('button')].filter((b) => visible(b) && isFinalPublish(b));
            if (buttons.length) return click(buttons[buttons.length - 1], 'panel');
        }

        const buttons = [...document.querySelectorAll('button')].filter((b) => visible(b) && isFinalPublish(b));
        const nonHeaderButtons = buttons.filter((b) => !b.closest('header, [class*="Header"], [class*="gnb"], [class*="toolbar"]'));
        const candidates = nonHeaderButtons.length ? nonHeaderButtons : buttons;
        if (candidates.length >= 2) return click(candidates[candidates.length - 1], 'last');
        if (candidates.length === 1) return click(candidates[0], 'single');
        return '';
    }"""

    contexts = list(_iter_contexts(page, target))
    for attempt in range(attempts):
        for ctx in contexts:
            try:
                clicked = ctx.evaluate(script)
                if clicked:
                    logger.info(f"2단계 발행 버튼 DOM 재탐색 클릭 성공: {clicked}")
                    return True
            except Exception as e:
                logger.debug(f"2단계 발행 버튼 DOM 재탐색 실패: {e}")
                continue
        page.wait_for_timeout(500 + (attempt * 200))
    return False


def _apply_bold(page: Page, target, kb) -> bool:
    """볼드 토글 — SE API 우선, Ctrl+B 폴백."""
    if _se_toggle_bold(target):
        return True
    try:
        kb.press("Control+b")
        return True
    except Exception:
        return False


def _fast_input(page: Page, kb, text: str, target=None):
    """텍스트 입력 — kb.type 사용. delay=2로 글자 누락 방지."""
    if not text:
        return
    kb.type(text, delay=2)


def _split_sentences(text: str) -> str:
    """문장 끝(. ! ?)과 접속사 앞에서 줄바꿈 삽입. 가독성 향상용."""
    if not text or "\n" in text:
        return text  # 이미 줄바꿈이 있으면 건드리지 않음
    # 1단계: 문장 끝 뒤에 줄바꿈 (단, 숫자.숫자, URL 등은 제외)
    result = re.sub(
        r'([.!?])(\s+)(?=[가-힣A-Z"\'(])',
        r'\1\n',
        text
    )
    # 2단계: 접속사 앞에서 줄바꿈 (단, 문장 시작이 아닐 때만)
    conjunctions = r'(?:그리고|그래서|하지만|그런데|또한|게다가|반면에|따라서|결국|그렇지만|한편|더불어|이처럼|특히|물론|다만|즉|예를 들어|뿐만 아니라)'
    result = re.sub(
        rf'([.!?])\n({conjunctions})',
        r'\1\n\n\2',
        result
    )
    # 3단계: 너무 긴 줄(150자 이상)이 남아있으면 쉼표 뒤에서 줄바꿈
    final_lines = []
    for line in result.split("\n"):
        if len(line) > 150:
            # 80~120자 근처의 쉼표에서 분리
            parts = []
            current = ""
            for segment in re.split(r'(,\s*)', line):
                current += segment
                if len(current) >= 80 and segment.strip().startswith(","):
                    parts.append(current.rstrip())
                    current = ""
            if current:
                parts.append(current)
            final_lines.extend(parts)
        else:
            final_lines.append(line)
    return "\n".join(final_lines)


def _input_body_blocks(target, blocks: list[dict], page: Page = None,
                       quote_style: str = "vertical", font_size: str = "15",
                       use_sticker: bool = False, template_applied: bool = False,
                       ref_format: dict = None, keyword: str = "",
                       bg_color: str = "", color_mode: str = "text",
                       use_underline: bool = False) -> bool:
    """blocks(text/image/subtitle/quote 순서) 그대로 에디터에 입력.

    blocks 예:
        [{"type":"text","content":"첫 단락..."},
         {"type":"subtitle","content":"소제목"},
         {"type":"quote","content":"핵심 요약"},
         {"type":"image","local_path":"C:/.../img.jpg"},
         {"type":"text","content":"다음 단락..."}, ...]
    """
    # ★ 툴바는 항상 mainFrame(=target)에 있음. child frame으로 재할당돼도 툴바 조작은 여기서.
    toolbar = target

    # 에디터 클릭 전 팝업 한 번 더 닫기
    if page:
        _dismiss_popups(page, target)

    # 에디터 포커스
    actual_target, el = _find_body_editor(page, target, timeout=10000)
    if actual_target:
        target = actual_target

    if not el:
        logger.error("본문 에디터를 찾을 수 없음")
        if page:
            try:
                debug_dir = Path(__file__).parent / "debug"
                debug_dir.mkdir(exist_ok=True)
                page.screenshot(path=str(debug_dir / "body_not_found.png"), full_page=True)
            except Exception:
                pass
        return False

    try:
        el.click()
        page.wait_for_timeout(300)
        kb = page.keyboard if page else target.keyboard
        if template_applied:
            # 템플릿 유지: Ctrl+End로 끝으로 이동하고 거기서부터 작성
            kb.press("Control+End")
            page.wait_for_timeout(200)
            kb.press("Enter")
            kb.press("Enter")
        else:
            # 템플릿 없으면 기존 내용 전체 삭제
            kb.press("Control+a")
            kb.press("Backspace")
            page.wait_for_timeout(200)

        _clear_strikethrough(page, toolbar)

        # 소제목 서식 사용 가능 여부 (첫 시도에서 판단)
        subtitle_format_ok = None
        section_count = 0

        # ref_format에서 스타일 값 추출 → Playwright 툴바 UI로 적용
        ref_font_size = None
        ref_color = None
        if ref_format:
            sizes = ref_format.get("font_sizes", [])
            colors = ref_format.get("text_colors", [])
            if sizes:
                ref_font_size = str(sizes[0]).replace("fs", "")
            if colors:
                ref_color = colors[0]
            # 참고 글의 인용구 스타일 우선 적용
            ref_quote = ref_format.get("quote_style", "")
            if ref_quote:
                quote_style = ref_quote
            logger.info(f"  참고 글 스타일: 크기={ref_font_size}, 색상={ref_color}, 인용구={quote_style}")

        # Playwright 툴바 UI로 스타일 사전 적용
        # 참고 글 크기가 있으면 그대로, 없으면 기본 17pt (가독성 향상)
        target_font = ref_font_size or font_size
        if not target_font or target_font == "15":
            target_font = "17"
        try:
            _set_font_size(page, toolbar, target_font)
            logger.info(f"  글씨 크기 적용: {target_font}")
        except Exception as e:
            logger.info(f"  글씨 크기 적용 실패: {e}")
        _clear_strikethrough(page, toolbar)

        # 강조 색상 결정 (ref_format의 bold_colors > text_colors 순)
        accent_color = None
        if ref_format:
            bold_colors = ref_format.get("bold_colors", [])
            text_colors = ref_format.get("text_colors", [])
            accent_color = (bold_colors[0] if bold_colors else text_colors[0] if text_colors else None)

        import re as _re
        emphasis_phrases = []  # post-processing용: 볼드+색상 적용할 텍스트 수집

        first_block = True
        for i, blk in enumerate(blocks):
            btype = blk.get("type")
            logger.info(f"블록 {i+1}/{len(blocks)}: {btype}")

            if btype == "text":
                _clear_strikethrough(page, toolbar)
                content = blk.get("content", "").strip()
                if not content:
                    continue
                if first_block:
                    first_block = False
                # ** 마커에서 강조 텍스트 수집 (나중에 post-processing)
                for m in _re.finditer(r'\*\*([^*]+)\*\*', content):
                    phrase = m.group(1).strip()
                    if phrase and len(phrase) >= 2:
                        emphasis_phrases.append(phrase)
                # 마커 제거하고 일반 텍스트로 입력
                clean = _re.sub(r'\*\*([^*]+)\*\*', r'\1', content)
                # 문장 단위 줄바꿈: 마침표/물음표/느낌표 뒤 + 접속사 앞에서 줄바꿈
                clean = _split_sentences(clean)
                lines = [line.strip() for line in clean.split("\n") if line.strip()]
                for line in lines:
                    _fast_input(page, kb, line, target=target)
                    kb.press("Enter")
                kb.press("Enter")

            elif btype == "subtitle":
                _clear_strikethrough(page, toolbar)
                content = blk.get("content", "").strip()
                if not content:
                    continue
                if first_block:
                    first_block = False
                section_count += 1

                # SE API로 소제목 컴포넌트 삽입
                if _se_insert_section_title(toolbar, page, content):
                    logger.info("  소제목: SE API 성공")
                    kb.press("Enter")
                else:
                    logger.info("  소제목: SE API 실패 → 일반 텍스트 폴백")
                    kb.press("Enter")
                    _fast_input(page, kb, f"■ {content}", target=target)
                    kb.press("Enter")
                    kb.press("Enter")

            elif btype == "quote":
                _clear_strikethrough(page, toolbar)
                content = blk.get("content", "").strip()
                if not content:
                    continue
                # SE API의 layout 값 매핑 (가장 정확한 방식)
                # 네이버 SE 내부 layout 값: quotation_line, quotation_underline 등
                SE_LAYOUT_MAP = {
                    "따옴표": "quotation_quotemark",
                    "vertical": "quotation_line",
                    "line": "quotation_line",
                    "bubble": "quotation_bubble",
                    "underline": "quotation_underline",
                    "quotemark": "quotation_quotemark",
                    "postit": "quotation_postit",
                    "frame": "quotation_frame",
                }
                layout = SE_LAYOUT_MAP.get(quote_style, f"quotation_{quote_style}")

                # ★ 1순위: 툴바 드롭다운 UI 클릭 (발행 후 스타일 유지 확인됨)
                inserted = False
                try:
                    if _click_quote_button(page, toolbar, quote_style):
                        page.wait_for_timeout(300)
                        _fast_input(page, kb, content, target=toolbar)
                        # 인용구 탈출
                        try:
                            _se_api(toolbar, 'ed._editingService.insertComponentsWithData([{ctype:"text"}]);')
                            page.wait_for_timeout(300)
                        except Exception:
                            _escape_quote_block(page, toolbar, kb)
                        logger.info(f"  인용구: UI 드롭다운 ({quote_style})")
                        inserted = True
                except Exception as e:
                    logger.info(f"  인용구 UI 클릭 실패: {e}")

                # 최종 폴백: 볼드 텍스트
                if not inserted:
                    logger.info("  인용구: 전체 실패 → 볼드 폴백")
                    if accent_color:
                        try: _set_font_color(page, toolbar, accent_color)
                        except: pass
                    _apply_bold(page, toolbar, kb)
                    _fast_input(page, kb, content, target=toolbar)
                    _apply_bold(page, toolbar, kb)
                    if accent_color:
                        try: _set_font_color(page, toolbar, "#000000")
                        except: pass
                    kb.press("Enter")
                    kb.press("Enter")

            elif btype == "image":
                _clear_strikethrough(page, toolbar)
                local = blk.get("local_path")
                if not local:
                    continue
                is_gif = blk.get("isGif") or (local and local.lower().endswith(".gif"))
                uploaded = False
                if is_gif:
                    uploaded = _upload_gif_to_editor(page, toolbar, local)
                else:
                    uploaded = _upload_image_to_editor(page, toolbar, local)
                if uploaded:
                    kb.press("End")
                    kb.press("Enter")
                else:
                    logger.warning(f"이미지/GIF 삽입 실패로 블록 건너뜀: {local}")

        # ★ post-processing: 소제목 밑줄 적용
        if use_underline:
            logger.info("  post-processing: 소제목 밑줄 적용")
            try:
                toolbar.evaluate("""() => {
                    document.querySelectorAll('.se-section-title .se-text-paragraph, .se-component-content.se-section-title span').forEach(el => {
                        el.style.textDecoration = 'underline';
                    });
                }""")
            except Exception as e:
                logger.info(f"  소제목 밑줄 적용 실패: {e}")

        # ★ post-processing: 소제목 + 인용구 색상 적용
        if accent_color:
            logger.info(f"  post-processing: 색상={accent_color}")
            _apply_color_to_subtitles(page, toolbar, accent_color)
            _apply_color_to_quotes(page, toolbar, accent_color)
        _clear_strikethrough(page, toolbar)

        # ★ post-processing: 키워드 강조색 적용 (color_mode에 따라 글색/배경색/둘다)
        if keyword and bg_color:
            if color_mode in ("text", "both"):
                logger.info(f"  post-processing: 키워드 포인트 글색 '{keyword}' → {bg_color}")
                _apply_text_color_to_keywords(page, toolbar, keyword, bg_color)
                page.wait_for_timeout(300)
            if color_mode in ("bg", "both"):
                logger.info(f"  post-processing: 키워드 배경색 '{keyword}' → {bg_color}")
                _apply_bg_color_to_keywords(page, toolbar, keyword, bg_color)
                page.wait_for_timeout(300)

        # 템플릿 적용 시 남은 잔여 콘텐츠 전부 삭제
        if template_applied:
            try:
                # 1단계: 키보드로 끝까지 선택 → 삭제 (반복)
                for attempt in range(10):
                    kb.press("Shift+Control+End")
                    page.wait_for_timeout(100)
                    kb.press("Backspace")
                    page.wait_for_timeout(100)

                # 2단계: JS로 현재 커서 위치 이후 모든 컴포넌트 삭제
                removed = target.evaluate("""() => {
                    const sel = window.getSelection();
                    if (!sel || !sel.anchorNode) return 0;
                    let comp = sel.anchorNode;
                    while (comp && comp.parentElement) {
                        if ((comp.className || '').includes('se-component') &&
                            !(comp.className || '').includes('se-component-content')) break;
                        comp = comp.parentElement;
                    }
                    let count = 0;
                    if (comp) {
                        while (comp.nextElementSibling) {
                            comp.nextElementSibling.remove();
                            count++;
                        }
                    }
                    return count;
                }""")

                # 3단계: 컨테이너 끝의 빈/템플릿 잔여 컴포넌트도 정리
                extra_removed = target.evaluate("""() => {
                    const container = document.querySelector('.se-main-container');
                    if (!container) return 0;
                    let count = 0;
                    // 뒤에서부터 빈 텍스트 컴포넌트 또는 템플릿 잔여 삭제
                    while (container.lastElementChild) {
                        const last = container.lastElementChild;
                        const text = (last.textContent || '').trim();
                        const isText = (last.className || '').includes('se-text');
                        // 빈 텍스트 컴포넌트만 삭제 (내용 있는 건 보존)
                        if (isText && text === '') {
                            last.remove();
                            count++;
                        } else {
                            break;
                        }
                    }
                    return count;
                }""")

                total = (removed or 0) + (extra_removed or 0)
                logger.info(f"  템플릿 잔여 콘텐츠 삭제: JS {removed or 0}개 + 빈블록 {extra_removed or 0}개")
            except Exception as e:
                logger.warning(f"  템플릿 잔여 삭제 실패: {e}")

        # 스티커 삽입 (use_sticker=True일 때, 글 마지막에 1개)
        if use_sticker:
            try:
                # 확실하게 글 마지막으로 이동
                # 1) Ctrl+End
                kb.press("Control+End")
                page.wait_for_timeout(300)
                # 2) 마지막 텍스트 문단을 실제 클릭해서 커서 위치를 문서 끝으로 고정
                try:
                    pos = toolbar.evaluate("""() => {
                        const container = document.querySelector('.se-main-container');
                        if (!container) return null;
                        const components = [...container.querySelectorAll('.se-component')].filter((el) => {
                            const text = (el.textContent || '').trim();
                            return text && !el.className.includes('se-sticker');
                        });
                        const last = components[components.length - 1] || container.lastElementChild;
                        if (!last) return null;
                        last.scrollIntoView({ block: 'center', behavior: 'instant' });
                        const paras = [...last.querySelectorAll('.se-text-paragraph, [contenteditable="true"], p')];
                        const textParas = paras.filter((p) => (p.textContent || '').trim());
                        const p = textParas[textParas.length - 1] || paras[paras.length - 1] || last;
                        const r = p.getBoundingClientRect();
                        return { x: r.right - 4, y: r.top + Math.max(8, r.height / 2), w: r.width, h: r.height };
                    }""")
                    page.wait_for_timeout(200)
                    if pos:
                        ix, iy = 0, 0
                        if toolbar != page:
                            try:
                                off = page.evaluate("""() => {
                                    const f = document.querySelector('iframe[name="mainFrame"]');
                                    return f ? {x: f.getBoundingClientRect().x, y: f.getBoundingClientRect().y} : {x:0,y:0};
                                }""")
                                ix, iy = off.get("x", 0), off.get("y", 0)
                            except Exception:
                                pass
                        page.mouse.click(pos["x"] + ix, pos["y"] + iy)
                        page.wait_for_timeout(150)
                        kb.press("End")
                except Exception:
                    pass
                # 3) 빈 줄 추가 후 스티커 삽입
                kb.press("Enter")
                page.wait_for_timeout(300)
                if _insert_sticker(page, toolbar):
                    logger.info("  스티커 삽입 완료 (글 마지막)")
                    page.wait_for_timeout(1500)
            except Exception as e:
                logger.info(f"  스티커 삽입 실패: {e}")

        return True
    except Exception as e:
        logger.error(f"본문 입력 실패: {e}")
        return False


def _input_body(target, body_text: str, page: Page = None, image_paths: list[str] = None) -> bool:
    """[Legacy] 평문 본문 입력. blocks 미사용 시 폴백."""
    # SmartEditor ONE 본문 영역 셀렉터 (우선순위 순)
    selectors = [
        ".se-component.se-text .se-text-paragraph",
        ".se-text-paragraph",
        ".se-main-container .se-text-paragraph",
        ".se-component-content .se-text-paragraph",
        ".se-main-container .se-section-text",
        ".se-content [contenteditable='true']",
        '[contenteditable="true"]',
        ".se_component_wrap [contenteditable]",
        "div.se-text",
    ]

    actual_target, el = _find_body_editor(page, target, timeout=10000)
    if actual_target:
        target = actual_target

    if not el:
        logger.error("본문 에디터를 찾을 수 없음")
        # 디버그용 스크린샷 + HTML 저장
        if page:
            try:
                debug_dir = Path(__file__).parent / "debug"
                debug_dir.mkdir(exist_ok=True)
                page.screenshot(path=str(debug_dir / "body_not_found.png"), full_page=True)
                with open(debug_dir / "body_not_found.html", "w", encoding="utf-8") as f:
                    f.write(page.content())
                # frame 정보도 저장
                with open(debug_dir / "frames.txt", "w", encoding="utf-8") as f:
                    for fr in page.frames:
                        f.write(f"name={fr.name} url={fr.url}\n")
                logger.info(f"디버그 파일 저장: {debug_dir}")
            except Exception as e:
                logger.warning(f"디버그 저장 실패: {e}")
        return False

    try:
        el.click()
        target.wait_for_timeout(500) if hasattr(target, "wait_for_timeout") else None
        kb = page.keyboard if page else target.keyboard
        kb.press("End")

        # 본문을 단락 단위로 분할
        paragraphs = [p for p in body_text.split("\n") if p.strip()]
        n_imgs = len(image_paths or [])

        if n_imgs == 0:
            # 이미지 없음 — 그냥 전체 입력
            for line in paragraphs:
                kb.type(line, delay=3)
                kb.press("Enter")
                kb.press("Enter")
            return True

        # 이미지 균등 배치: 본문을 n_imgs+1 등분
        chunk_size = max(1, len(paragraphs) // (n_imgs + 1))
        img_idx = 0

        for i, line in enumerate(paragraphs):
            kb.type(line, delay=3)
            kb.press("Enter")
            kb.press("Enter")
            # chunk 경계 + 아직 삽입할 이미지 남았으면
            if img_idx < n_imgs and (i + 1) % chunk_size == 0 and i < len(paragraphs) - 1:
                _upload_image_to_editor(page, target, image_paths[img_idx])
                img_idx += 1
                kb.press("End")
                kb.press("Enter")

        # 남은 이미지가 있으면 마지막에 추가
        while img_idx < n_imgs:
            _upload_image_to_editor(page, target, image_paths[img_idx])
            img_idx += 1
            kb.press("End")
            kb.press("Enter")

        return True
    except Exception as e:
        logger.error(f"본문 입력 실패: {e}")
        return False


def _download_image(url: str, idx: int) -> str | None:
    """이미지 URL 1개 다운로드, 로컬 경로 반환. GIF는 .gif 확장자 유지."""
    if not url:
        return None
    tmp_dir = Path(tempfile.gettempdir()) / "naverbot_images"
    tmp_dir.mkdir(exist_ok=True)
    try:
        # URL에서 확장자 추출
        ext = ".jpg"
        url_lower = url.lower().split("?")[0]
        if url_lower.endswith(".gif") or "/gif/" in url_lower or ".gif?" in url_lower or ".gif/" in url_lower or "giphy" in url_lower:
            ext = ".gif"
        elif url_lower.endswith(".png"):
            ext = ".png"
        elif url_lower.endswith(".webp"):
            ext = ".webp"
        local = tmp_dir / f"img_{int(time.time())}_{idx}{ext}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as r, open(local, "wb") as f:
            data = r.read()
            ct = (r.headers.get("Content-Type", "") or "").lower()
            if "image" not in ct and not data.startswith((b"\xff\xd8", b"\x89PNG", b"GIF87a", b"GIF89a", b"RIFF")):
                logger.warning(f"이미지 다운로드 응답이 이미지가 아님: content-type={ct}, url={url[:80]}")
                return None
            if len(data) < 1024:
                logger.warning(f"이미지 다운로드 용량이 너무 작음: {len(data)} bytes, url={url[:80]}")
                return None
            f.write(data)
            # Content-Type 기반 확장자 보정
            if "gif" in ct and ext != ".gif":
                gif_path = local.with_suffix(".gif")
                local.rename(gif_path)
                local = gif_path
        logger.info(f"이미지 다운로드: {local.name}")
        return str(local)
    except Exception as e:
        logger.warning(f"이미지 다운로드 실패 ({url[:50]}): {e}")
        return None


def _download_blocks_images(blocks: list[dict]) -> list[dict]:
    """blocks 안의 image 블록들 미리 다운로드해서 local_path 추가.
    중복 URL은 자동으로 건너뛴다 (같은 이미지 반복 방지)."""
    out = []
    seen_urls: set[str] = set()
    for i, blk in enumerate(blocks):
        if blk.get("type") == "image":
            url = blk.get("url", "")
            if url in seen_urls:
                logger.info(f"중복 이미지 건너뜀: {url[:60]}")
                continue
            seen_urls.add(url)
            local = _download_image(url, i)
            if local:
                out.append({**blk, "local_path": local})
            # 다운로드 실패 시 그 블록은 스킵
        else:
            out.append(blk)
    return out


def _editor_component_count(target, selector: str) -> int:
    try:
        return int(target.evaluate("""(selector) => document.querySelectorAll(selector).length""", selector) or 0)
    except Exception:
        return 0


def _wait_for_new_editor_component(page: Page, target, selector: str, before: int, timeout_ms: int = 20000) -> bool:
    deadline = time.time() + (timeout_ms / 1000)
    while time.time() < deadline:
        try:
            count = _editor_component_count(target, selector)
            if count > before:
                page.wait_for_timeout(800)
                return True
        except Exception:
            pass
        page.wait_for_timeout(500)
    return False


def _move_cursor_after_last_component(page: Page, target) -> bool:
    """이미지/GIF 업로드 뒤 다음 입력이 미디어 위쪽에 끼지 않도록 커서를 끝으로 이동."""
    try:
        pos = target.evaluate("""() => {
            const container = document.querySelector('.se-main-container');
            if (!container || !container.lastElementChild) return null;
            const last = container.lastElementChild;
            last.scrollIntoView({ block: 'center', behavior: 'instant' });
            const p = last.querySelector('.se-text-paragraph, [contenteditable="true"], p') || last;
            const r = p.getBoundingClientRect();
            return { x: Math.max(r.left + 5, r.right - 5), y: r.top + Math.max(8, r.height / 2) };
        }""")
        if not pos:
            return False
        ix, iy = 0, 0
        if target != page:
            try:
                off = page.evaluate("""() => {
                    const f = document.querySelector('iframe[name="mainFrame"]');
                    return f ? {x: f.getBoundingClientRect().x, y: f.getBoundingClientRect().y} : {x:0,y:0};
                }""")
                ix, iy = off.get("x", 0), off.get("y", 0)
            except Exception:
                pass
        page.mouse.click(pos["x"] + ix, pos["y"] + iy)
        page.wait_for_timeout(200)
        page.keyboard.press("End")
        return True
    except Exception:
        return False


def _upload_image_to_editor(page: Page, target, image_path: str) -> bool:
    """네이버 블로그 에디터에 이미지 1장 업로드."""
    if not os.path.exists(image_path):
        return False

    # 사진 버튼 셀렉터 (toolbar)
    photo_selectors = [
        "button.se-image-toolbar-button",
        "button[data-name='image']",
        "button[aria-label*='사진']",
        ".se-toolbar button[data-type='image']",
        ".se-toolbar button.se-document-toolbar-basic-button",
    ]

    btn = None
    for sel in photo_selectors:
        try:
            elements = (target if hasattr(target, "query_selector_all") else page).query_selector_all(sel)
            for el in elements:
                label = el.get_attribute("aria-label") or ""
                if "사진" in label or "image" in label.lower() or sel != ".se-toolbar button.se-document-toolbar-basic-button":
                    btn = el
                    break
            if btn:
                break
        except Exception:
            continue

    if not btn:
        logger.warning("사진 버튼 못 찾음")
        return False

    try:
        # GIF/이미지 모두 감지할 수 있도록 넓은 셀렉터 사용
        media_sel = ".se-component.se-image, .se-component.se-video, .se-component[class*='image'], .se-component[class*='gif']"
        before_images = _editor_component_count(target, media_sel)
        try:
            with page.expect_file_chooser(timeout=8000) as fc_info:
                btn.click()
            chooser = fc_info.value
            chooser.set_files(image_path)
        except Exception as fc_err:
            # file_chooser 미발생 시 (MYBOX 팝업 등) — hidden input 폴백
            logger.info(f"file_chooser 미발생, hidden input 폴백 시도: {fc_err}")
            try:
                file_input = page.query_selector('input[type="file"][accept*="image"]') or \
                             page.query_selector('input[type="file"]')
                if not file_input and target != page:
                    file_input = target.query_selector('input[type="file"][accept*="image"]') or \
                                 target.query_selector('input[type="file"]')
                if file_input:
                    file_input.set_input_files(image_path)
                else:
                    logger.warning(f"hidden file input도 못 찾음: {os.path.basename(image_path)}")
                    return False
            except Exception as e2:
                logger.warning(f"이미지 업로드 폴백 실패: {e2}")
                return False
        if not _wait_for_new_editor_component(page, target, media_sel, before_images, timeout_ms=25000):
            logger.warning(f"이미지 업로드 확인 실패: {os.path.basename(image_path)}")
            return False
        # 업로드 후 원본 사이즈 다이얼로그 처리
        try:
            for sel in ['button:has-text("원본")', 'button:has-text("적용")']:
                b = page.query_selector(sel)
                if b and b.is_visible():
                    b.click()
                    page.wait_for_timeout(500)
                    break
        except Exception:
            pass
        _move_cursor_after_last_component(page, target)
        logger.info(f"이미지 삽입 완료: {os.path.basename(image_path)}")
        return True
    except Exception as e:
        logger.warning(f"이미지 업로드 실패: {e}")
        return False


def _upload_gif_to_editor(page: Page, target, gif_path: str) -> bool:
    """네이버 블로그 에디터에 GIF 1개 삽입.
    로컬 GIF 파일은 네이버 '사진' 업로드 경로가 가장 안정적이다.
    에디터의 GIF 버튼은 검색 패널을 여는 경우가 많아 위치가 꼬일 수 있다."""
    if not os.path.exists(gif_path):
        logger.warning(f"GIF 파일 없음: {gif_path}")
        return False
    logger.info(f"GIF 업로드 시작: {os.path.basename(gif_path)}")
    # GIF도 일반 이미지 업로드와 동일 경로 사용 (네이버 에디터가 GIF를 지원)
    ok = _upload_image_to_editor(page, target, gif_path)
    if not ok:
        # 폴백: input[type=file] 직접 탐색하여 파일 설정
        logger.info("GIF 폴백: hidden file input 직접 탐색")
        try:
            file_input = page.query_selector('input[type="file"][accept*="image"]') or \
                         page.query_selector('input[type="file"]')
            if not file_input and target != page:
                file_input = target.query_selector('input[type="file"][accept*="image"]') or \
                             target.query_selector('input[type="file"]')
            if file_input:
                before = _editor_component_count(target, ".se-component.se-image, .se-component.se-video, .se-component[class*='image'], .se-component[class*='gif']")
                file_input.set_input_files(gif_path)
                ok = _wait_for_new_editor_component(page, target,
                    ".se-component.se-image, .se-component.se-video, .se-component[class*='image'], .se-component[class*='gif']",
                    before, timeout_ms=25000)
                if ok:
                    _move_cursor_after_last_component(page, target)
                    logger.info(f"GIF 삽입 완료 (폴백): {os.path.basename(gif_path)}")
                    return True
        except Exception as e:
            logger.warning(f"GIF 폴백 실패: {e}")
    return ok


def _input_tags(target, tags: list[str], page: Page = None) -> None:
    if not tags:
        return
    selectors = [
        '.tag__input',
        '[placeholder*="태그"]',
        'input[class*="tag"]',
        '.se-tag-input input',
        '.se-tag-input [contenteditable]',
        '[class*="tag_input"]',
        '[class*="tagInput"]',
        'input[id*="tag"]',
        '.post_tag input',
        # 2026 신규 에디터
        '[data-testid="tag-input"]',
        '[class*="Tag"] input',
        '.se-section-tag input',
    ]
    # 스크롤 먼저 (태그 영역이 뷰포트 밖에 있을 수 있음)
    try:
        if page:
            page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1000)
    except Exception:
        pass

    # target(frame) → page 순서, 타임아웃 짧게 (셀렉터 많으므로)
    el = _try_selectors(target, selectors, timeout=800)
    actual_target = target
    if not el and page and page != target:
        el = _try_selectors(page, selectors, timeout=800)
        if el:
            actual_target = page
    if not el and hasattr(target, "child_frames"):
        for cf in target.child_frames:
            el = _try_selectors(cf, selectors, timeout=800)
            if el:
                actual_target = cf
                break

    # JS 폴백: 직접 태그 영역 클릭
    if not el and page:
        try:
            found = page.evaluate("""() => {
                // 태그 라벨("태그") 근처 input/contenteditable 찾기
                const labels = document.querySelectorAll('*');
                for (const l of labels) {
                    const t = (l.textContent || '').trim();
                    if (t === '태그' || t === '태그 입력') {
                        const r = l.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) {
                            // 같은 부모 안 input 찾기
                            const parent = l.closest('.se-section-tag, [class*="tag"], [class*="Tag"]') || l.parentElement;
                            if (parent) {
                                const inp = parent.querySelector('input, [contenteditable="true"]');
                                if (inp) { inp.click(); inp.focus(); return true; }
                            }
                        }
                    }
                }
                return false;
            }""")
            if found:
                page.wait_for_timeout(500)
                el = _try_selectors(page, selectors, timeout=1000)
                if el:
                    actual_target = page
        except Exception:
            pass

    if not el:
        logger.warning("태그 입력란 못 찾음 - 스킵")
        return

    try:
        el.click()
        kb = page.keyboard if page else actual_target.keyboard
        if hasattr(actual_target, "wait_for_timeout"):
            actual_target.wait_for_timeout(300)
        for tag in tags[:10]:
            tag = tag.strip()
            if not tag:
                continue
            # fill()은 contenteditable에서 실패할 수 있으므로 type() 우선
            try:
                el.fill("")  # 기존 값 초기화
                el.fill(tag)
            except Exception:
                # contenteditable인 경우 keyboard로 입력
                kb.press("Control+a")
                kb.press("Backspace")
                kb.type(tag, delay=10)
            kb.press("Enter")
            if hasattr(actual_target, "wait_for_timeout"):
                actual_target.wait_for_timeout(300)
        logger.info(f"태그 {len(tags)}개 입력 완료")
    except Exception as e:
        logger.warning(f"태그 입력 부분 실패: {e}")


def _publish(page: Page, target=None, category: str = "") -> bool:
    """발행 버튼 2단계 클릭 처리.

    1단계: 우상단 "발행" 버튼 → 사이드 패널 열림
    1.5단계: 사이드패널에서 카테고리 선택 (있으면)
    2단계: 사이드 패널 안 "발행" 버튼 → 실제 발행
    """
    search_in = target if target else page

    # 1단계: 우상단 발행 버튼 (사이드패널 열기)
    step1_selectors = [
        "button[class*='publish_btn']",  # publish_btn__XXXXX (해시 무관)
        "button[class*='PublishBtn']",
        "button.btn_publish",
        ".header button[class*='publish']",
        "button[class*='publish']:has-text('발행')",
        ".btn_area button:has-text('발행')",
        "button:has-text('발행')",
    ]
    step1 = _try_selectors(search_in, step1_selectors, timeout=5000)
    if not step1:
        # frame 재탐색
        if hasattr(search_in, "child_frames"):
            for cf in search_in.child_frames:
                step1 = _try_selectors(cf, step1_selectors, timeout=2000)
                if step1:
                    search_in = cf
                    break
    if not step1:
        logger.error("1단계 발행 버튼 못 찾음")
        return False

    try:
        _dismiss_blocking_popups(page, target)
        step1.click()
        logger.info("1단계 발행 버튼 클릭 → 사이드패널 대기")
    except Exception as e:
        logger.warning(f"1단계 일반 클릭 실패, DOM 재탐색 후 재시도: {e}")
        try:
            _dismiss_blocking_popups(page, target)
            # DOM detached 대응: 셀렉터로 다시 찾아서 클릭
            step1 = _try_selectors(search_in, step1_selectors, timeout=3000)
            if step1:
                step1.click(force=True)
                logger.info("1단계 발행 버튼 재탐색+강제 클릭 → 사이드패널 대기")
            else:
                logger.error("1단계 발행 버튼 재탐색 실패")
                return False
        except Exception as e2:
            logger.error(f"1단계 클릭 실패: {e2}")
            return False

    page.wait_for_timeout(1500)  # 사이드패널 애니메이션 대기

    # 디버그: 사이드패널 스크린샷
    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        page.screenshot(path=str(debug_dir / "publish_panel.png"))
    except Exception:
        pass

    # 1.5단계: 사이드패널에서 카테고리 선택 (Playwright 네이티브 방식)
    logger.info(f"[카테고리] category='{category}'")

    if category:
        logger.info(f"발행 패널에서 카테고리 선택 시도: {category}")
        cat_done = False

        # 모든 프레임에서 시도 (사이드패널은 보통 mainFrame에 있음)
        contexts = [target, page] + list(page.frames) if target else [page] + list(page.frames)
        for ctx in contexts:
            if cat_done:
                break
            try:
                # 방법 1: Playwright locator로 카테고리 selectbox 버튼 직접 찾기
                cat_btn = None
                for sel in [
                    'button[class*="selectbox_button"]',
                    'button[class*="selectbox"]',
                    'button[aria-label*="카테고리"]',
                ]:
                    try:
                        els = ctx.query_selector_all(sel)
                        for el in els:
                            try:
                                box = el.bounding_box()
                                if box and box["x"] > 500 and box["width"] > 50:
                                    cat_btn = el
                                    break
                            except Exception:
                                continue
                        if cat_btn:
                            break
                    except Exception:
                        continue

                if not cat_btn:
                    logger.info(f"[카테고리] selectbox 버튼 못 찾음 (ctx={getattr(ctx, 'name', type(ctx).__name__)})")
                    continue

                # 드롭다운 열기
                logger.info("[카테고리] selectbox 버튼 발견, 클릭")
                cat_btn.click()
                page.wait_for_timeout(1000)

                # 디버그: 드롭다운 스크린샷
                try:
                    debug_dir = Path(__file__).parent / "debug"
                    debug_dir.mkdir(exist_ok=True)
                    page.screenshot(path=str(debug_dir / "category_dropdown_opened.png"))
                except Exception:
                    pass

                # 디버그: 드롭다운 DOM 구조 덤프
                try:
                    debug_dir = Path(__file__).parent / "debug"
                    debug_dir.mkdir(exist_ok=True)
                    for dctx in contexts:
                        try:
                            dom_dump = dctx.evaluate("""() => {
                                var result = [];
                                var els = document.querySelectorAll('*');
                                for (var i = 0; i < els.length; i++) {
                                    var el = els[i];
                                    var r = el.getBoundingClientRect();
                                    var t = (el.textContent || '').trim();
                                    if (r.x > 500 && r.x < 1300 && r.y > 60 && r.y < 200 && r.width > 20 && r.height > 10 && r.height < 50 && t.length < 30 && t.length > 0) {
                                        result.push(el.tagName + '.' + (el.className || '').toString().slice(0,60) + ' | text="' + t + '" | pos=' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
                                    }
                                }
                                return result.join('\\n');
                            }""")
                            if dom_dump:
                                with open(str(debug_dir / "category_dom.txt"), "w", encoding="utf-8") as f:
                                    f.write(dom_dump)
                                break
                        except Exception:
                            continue
                except Exception:
                    pass

                # 방법 2: 드롭다운에서 카테고리 이름으로 항목 찾아 클릭
                import re as _re
                cat_clean = category.strip()

                # 2-1) 모든 visible 항목을 수집하여 매칭
                found_item = None
                for item_ctx in contexts:
                    try:
                        items = item_ctx.query_selector_all('li, button, a, div[role="option"], [role="menuitem"]')
                        for item in items:
                            try:
                                box = item.bounding_box()
                                if not box or box["x"] < 500 or box["width"] < 20 or box["height"] < 8 or box["height"] > 80:
                                    continue
                                text = (item.text_content() or "").strip()
                                # "ㄴ" 접두사 + "(숫자)" 제거
                                cleaned = _re.sub(r'^[ㄴ└├│\s]+', '', text)
                                cleaned = _re.sub(r'\s*\(\d+\)\s*$', '', cleaned).strip()
                                if cleaned.lower() == cat_clean.lower():
                                    found_item = item
                                    break
                                # 부분 매치
                                if not found_item and cat_clean.lower() in cleaned.lower():
                                    found_item = item
                            except Exception:
                                continue
                        if found_item:
                            break
                    except Exception:
                        continue

                if found_item:
                    try:
                        found_item.scroll_into_view_if_needed()
                        page.wait_for_timeout(200)
                        found_item.click()
                        cat_done = True
                        logger.info(f"[카테고리] '{category}' 선택 완료 (Playwright 클릭)")
                        page.wait_for_timeout(500)
                    except Exception as click_err:
                        logger.warning(f"[카테고리] 항목 클릭 실패: {click_err}")
                        # force click 시도
                        try:
                            found_item.click(force=True)
                            cat_done = True
                            logger.info(f"[카테고리] '{category}' 강제 클릭 성공")
                            page.wait_for_timeout(500)
                        except Exception:
                            pass
                else:
                    logger.warning(f"[카테고리] 드롭다운에서 '{category}' 항목 못 찾음")

                # 드롭다운 확실히 닫기
                try:
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                except Exception:
                    pass

            except Exception as e:
                logger.debug(f"[카테고리] ctx 시도 실패: {e}")
                continue

        if not cat_done:
            logger.warning(f"카테고리 '{category}' 선택 실패 — 기본 카테고리로 발행 진행")

        # 카테고리 선택 후 사이드패널 상태 안정화:
        # 드롭다운이 남아있으면 발행 버튼을 못 찾으므로, 패널을 닫았다가 다시 열기
        try:
            page.keyboard.press("Escape")  # 사이드패널 닫기
            page.wait_for_timeout(800)
            # 발행 버튼 다시 클릭하여 사이드패널 재오픈
            step1_re = _try_selectors(search_in, step1_selectors, timeout=3000)
            if step1_re:
                step1_re.click()
                page.wait_for_timeout(1500)
                logger.info("[카테고리] 사이드패널 재오픈 완료")
        except Exception as e:
            logger.debug(f"[카테고리] 사이드패널 재오픈 실패: {e}")

    # 2단계: 사이드패널 안 진짜 발행 버튼
    # ElementHandle은 패널 DOM 갱신 시 detached 되므로 클릭 순간마다 현재 DOM에서 재탐색한다.
    if not _click_publish_confirm_button(page, target=search_in):
        logger.error("2단계 발행 버튼 못 찾음 (사이드패널)")
        try:
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(debug_dir / "publish_step2.png"), full_page=True)
        except Exception:
            pass
        return False

    # 발행 처리 대기 — URL이 에디터에서 벗어날 때까지 (최대 15초)
    for _ in range(15):
        page.wait_for_timeout(1000)
        cur = page.url
        if not any(s in cur for s in ["GoBlogWrite", "PostWriteForm", "Redirect=Write"]):
            break

    final_url = page.url
    logger.info(f"발행 후 URL: {final_url}")
    if any(s in final_url for s in ["GoBlogWrite", "PostWriteForm", "Redirect=Write"]):
        return False
    return True


def _select_category(page: Page, target, category_name: str) -> bool:
    """블로그 글쓰기에서 카테고리 선택.

    1단계: 카테고리 드롭다운 열기
    2단계: 목록에서 이름 매칭 클릭
    """
    if not category_name:
        return False

    logger.info(f"카테고리 선택 시도: {category_name}")

    # 카테고리 버튼 찾기 (여러 셀렉터 시도)
    cat_selectors = [
        ".se-category-button",
        "button[class*='category']",
        "[class*='category'] button",
        "button:has-text('카테고리')",
        ".post_category button",
        # 2026 신규 에디터
        "button.selectbox_button__jb1Dt",
        "button[aria-label*='카테고리']",
        "[class*='CategoryArea'] button",
        "[class*='category_area'] button",
    ]

    btn = None
    search_in = target
    for ctx in [target, page]:
        btn = _try_selectors(ctx, cat_selectors, timeout=3000)
        if btn:
            search_in = ctx
            break

    if not btn:
        logger.warning("카테고리 버튼 못 찾음 — 스킵")
        return False

    try:
        btn.click()
        page.wait_for_timeout(800)

        # 디버그: 카테고리 드롭다운 스크린샷
        try:
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(debug_dir / "category_dropdown.png"))
        except Exception:
            pass

        # 카테고리 목록에서 이름으로 찾아 클릭 — 스크롤하면서 탐색
        found = False
        for ctx in [page, target, search_in] + list(page.frames):
            try:
                result = ctx.evaluate("""(name) => {
                    // 카테고리 드롭다운/리스트 컨테이너 찾기
                    const containers = document.querySelectorAll(
                        'ul, [role="listbox"], [class*="dropdown"], [class*="category"] ul, [class*="selectbox"] ul, [class*="list"], .se-popup'
                    );
                    let scrollContainer = null;
                    for (const c of containers) {
                        const r = c.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0 && c.scrollHeight > c.clientHeight) {
                            scrollContainer = c;
                            break;
                        }
                    }

                    // 스크롤하면서 카테고리 항목 탐색
                    function findAndClick() {
                        const allEls = document.querySelectorAll('li, a, button, div, span');
                        for (const el of allEls) {
                            const t = (el.textContent || '').trim();
                            if (t && (t === name || t.startsWith(name))) {
                                const r = el.getBoundingClientRect();
                                if (r.width > 0 && r.height > 0 && r.height < 60) {
                                    // 요소가 보이도록 스크롤
                                    el.scrollIntoView({ block: 'center', behavior: 'instant' });
                                    el.click();
                                    return true;
                                }
                            }
                        }
                        return false;
                    }

                    // 1차: 현재 보이는 영역에서 찾기
                    if (findAndClick()) return true;

                    // 2차: 스크롤 컨테이너가 있으면 위에서부터 스크롤하며 찾기
                    if (scrollContainer) {
                        scrollContainer.scrollTop = 0;
                        const step = scrollContainer.clientHeight * 0.8;
                        for (let i = 0; i < 20; i++) {
                            scrollContainer.scrollTop += step;
                            if (findAndClick()) return true;
                        }
                    }
                    return false;
                }""", category_name)
                if result:
                    found = True
                    break
            except Exception:
                continue

        if found:
            page.wait_for_timeout(500)
            logger.info(f"카테고리 '{category_name}' 선택 완료")
            return True
        else:
            logger.warning(f"카테고리 '{category_name}' 목록에서 못 찾음")
            page.keyboard.press("Escape")
            return False
    except Exception as e:
        logger.warning(f"카테고리 선택 실패: {e}")
        return False


def publish_to_naver_blog(
    user_id: str,
    naver_id: str,
    naver_pw: str,
    title: str,
    body: str = "",
    tags: list[str] | None = None,
    images: list[dict] | None = None,
    blocks: list[dict] | None = None,
    template_name: str = "",
    font_size: str = "15",
    quote_style: str = "vertical",
    use_sticker: str = "off",
    category: str = "",
    headless: bool = True,
    ref_url: str = "",
    ref_format: dict = None,
    keyword: str = "",
    bg_color: str = "",
    color_mode: str = "text",
    use_underline: bool = False,
) -> dict:
    """네이버 블로그에 글 발행.

    Args:
        user_id: SaaS 내부 사용자 ID (browser_profile 폴더명)
        naver_id, naver_pw: 네이버 로그인 정보
        title: 글 제목
        body: 본문 (텍스트, 줄바꿈 유지)
        ref_url: 참고 글 URL (Playwright로 분석)
        tags: 태그 리스트 (최대 10개)
        headless: 헤드리스 모드 (캡차 발생 시 False로 재실행 권장)

    Returns:
        {"success": bool, "post_url": str | None, "error": str | None}
    """
    profile_dir = get_profile_dir(user_id)

    # blocks 우선, 없으면 legacy 방식
    use_blocks = bool(blocks)
    if use_blocks:
        prepared_blocks = _download_blocks_images(blocks)
    else:
        prepared_blocks = None
        image_paths = []  # legacy 폴백 (사용 안함)

    with sync_playwright() as p:
        context: BrowserContext = launch_browser(p, profile_dir, headless=headless)
        page = context.pages[0] if context.pages else context.new_page()

        try:
            # 1. 로그인 (세션 살아있으면 즉시 통과)
            page.goto("https://blog.naver.com", wait_until="domcontentloaded")
            page.wait_for_timeout(800)

            if not _is_logged_in(page):
                ok = _login(page, naver_id, naver_pw)
                if not ok:
                    return {
                        "success": False,
                        "post_url": None,
                        "error": "로그인 실패 - 캡차/2차인증 의심. headless=False로 수동 로그인 1회 필요.",
                    }

            # 2. 글쓰기 페이지
            target = _enter_write_page(page)

            # 세션 만료 감지 → 재로그인 후 재시도 (1회)
            if target is None:
                logger.info("세션 만료 감지 — 재로그인 시도")
                ok = _login(page, naver_id, naver_pw)
                if not ok:
                    return {
                        "success": False,
                        "post_url": None,
                        "error": "세션 만료 후 재로그인 실패 - headless=False로 수동 로그인 1회 필요.",
                    }
                target = _enter_write_page(page)
                if target is None:
                    return {
                        "success": False,
                        "post_url": None,
                        "error": "재로그인 후에도 글쓰기 페이지 진입 실패",
                    }

            # 임시저장 팝업 닫기 (있으면)
            try:
                cancel = page.query_selector('button:has-text("취소")')
                if cancel and cancel.is_visible():
                    cancel.click()
                    page.wait_for_timeout(500)
            except Exception:
                pass

            # 2.5. 템플릿 선택 (설정된 경우, 1회 재시도)
            template_name = _normalize_template_name(template_name)
            tmpl_ok = False
            if template_name:
                for tmpl_attempt in range(2):
                    try:
                        tmpl_ok = _select_naver_template(page, target, template_name)
                        if tmpl_ok:
                            logger.info(f"템플릿 '{template_name}' 적용 성공")
                            break
                        else:
                            logger.warning(f"템플릿 '{template_name}' 적용 실패 (시도 {tmpl_attempt+1}/2)")
                            if tmpl_attempt == 0:
                                page.wait_for_timeout(1000)
                    except Exception as e:
                        logger.warning(f"템플릿 선택 예외 (시도 {tmpl_attempt+1}/2): {e}")
                _dismiss_popups(page, target)
                page.wait_for_timeout(500)
                target = _refresh_editor_target(page, target)

            # 2.6. 카테고리는 발행 패널에서만 선택 (글쓰기 에디터 내 셀렉터 불안정)

            # 2.7. 글씨 크기 변경 (에디터 로딩 후 바로 적용)
            if font_size and font_size != "15":
                try:
                    _set_font_size(page, target, font_size)
                except Exception as e:
                    logger.info(f"글씨 크기 변경 실패 (무시): {e}")

            # 3. 제목
            if not _input_title(target, title, page=page):
                return {"success": False, "post_url": None, "error": "제목 입력 실패"}

            page.wait_for_timeout(500)

            # 4. 본문 (+ 이미지 자동 삽입)
            if use_blocks:
                if not _input_body_blocks(target, prepared_blocks, page=page, quote_style=quote_style, font_size=font_size, use_sticker=(use_sticker == "on"), template_applied=tmpl_ok, ref_format=ref_format, keyword=keyword, bg_color=bg_color, color_mode=color_mode, use_underline=use_underline):
                    return {"success": False, "post_url": None, "error": "본문 입력 실패"}
            else:
                if not _input_body(target, body, page=page, image_paths=[]):
                    return {"success": False, "post_url": None, "error": "본문 입력 실패"}

            # 5. 태그 — 본문 하단 해시태그로 자동등록되므로 별도 입력 불필요
            _clear_strikethrough(page, target)

            # 6. 발행 (카테고리는 발행 패널에서 선택)
            if not _publish(page, target=target, category=category):
                return {"success": False, "post_url": None, "error": "발행 실패 (사이드패널/2단계 버튼 확인 필요)"}

            post_url = page.url
            logger.info(f"발행 성공: {post_url}")
            return {"success": True, "post_url": post_url, "error": None}

        except Exception as e:
            logger.exception("발행 중 예외")
            return {"success": False, "post_url": None, "error": str(e)[:300]}
        finally:
            context.close()


if __name__ == "__main__":
    # 단독 테스트
    import sys
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) < 4:
        print("Usage: python naver_blog.py <user_id> <naver_id> <naver_pw>")
        sys.exit(1)
    result = publish_to_naver_blog(
        user_id=sys.argv[1],
        naver_id=sys.argv[2],
        naver_pw=sys.argv[3],
        title="[테스트] 자동 포스팅",
        body="이 글은 자동 포스팅 테스트입니다.\n정상 등록 시 삭제해주세요.",
        tags=["테스트"],
        headless=False,
    )
    print(result)
