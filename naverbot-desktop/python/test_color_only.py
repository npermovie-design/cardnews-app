"""색상 적용 정밀 테스트

1) SE API로 볼드+색상 적용한 글 발행
2) 발행 글에서 실제 적용된 색상 추출
3) #2DB400(초록)이 유지되는지 검증
"""

import sys, os, time, json, logging

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from pathlib import Path
from playwright.sync_api import sync_playwright
from naver_blog import (
    get_profile_dir, launch_browser, _is_logged_in, _login,
    _enter_write_page, _dismiss_popups, _input_title,
    _try_selectors, _se_api, _apply_bold, _set_font_color,
    _set_font_size, _fast_input, _publish, _select_category,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("color-test")

NAVER_ID = "npermovie"
TEST_COLOR = "#2DB400"  # 네이버 초록
TEST_COLOR2 = "#FF6B35"  # 주황
TEST_CATEGORY = "일상"   # 테스트 카테고리

def run_test():
    try:
        import keyring
        naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
    except Exception:
        naver_pw = ""
    if not naver_pw:
        print("[FAIL] keyring에서 비밀번호 불러올 수 없음")
        return

    profile = get_profile_dir(NAVER_ID)
    debug_dir = Path(__file__).parent / "debug"
    debug_dir.mkdir(exist_ok=True)

    with sync_playwright() as p:
        ctx = launch_browser(p, profile, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        try:
            # 로그인
            page.goto("https://blog.naver.com", wait_until="domcontentloaded")
            page.wait_for_timeout(800)
            if not _is_logged_in(page):
                _login(page, NAVER_ID, naver_pw)

            # 글쓰기 페이지
            target = _enter_write_page(page)
            kb = page.keyboard

            # 제목
            _input_title(target, "[색상테스트] SE API 색상 유지 검증", page=page)
            page.wait_for_timeout(500)

            # 본문 에디터 포커스
            el = _try_selectors(target, [
                ".se-component.se-text .se-text-paragraph",
                ".se-text-paragraph",
                '[contenteditable="true"]',
            ], timeout=10000)
            if el:
                el.click()
                page.wait_for_timeout(300)
                kb.press("Control+a")
                kb.press("Backspace")
                page.wait_for_timeout(200)

            # 글씨 크기 17pt
            _set_font_size(page, target, "17")

            # ── 테스트 1: 일반 텍스트 ──
            log.info("--- 일반 텍스트 입력 ---")
            _fast_input(page, kb, "이것은 색상 없는 일반 텍스트입니다.", target=target)
            kb.press("Enter")
            kb.press("Enter")

            # ── 테스트 2: 초록색 볼드 (볼드만 적용, 색상은 나중에 일괄) ──
            log.info(f"--- 초록색 볼드 테스트 ---")
            emphasis = "초록색 볼드 텍스트"
            _fast_input(page, kb, emphasis, target=target)
            page.wait_for_timeout(150)
            for _ in range(len(emphasis)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(150)
            _apply_bold(page, target, kb)
            page.wait_for_timeout(100)
            kb.press("ArrowRight")
            kb.press("Enter")
            kb.press("Enter")

            # ── 테스트 3: 또 다른 볼드 텍스트 ──
            log.info("--- 두번째 볼드 테스트 ---")
            emphasis2 = "두번째 강조 텍스트"
            _fast_input(page, kb, emphasis2, target=target)
            page.wait_for_timeout(150)
            for _ in range(len(emphasis2)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(150)
            _apply_bold(page, target, kb)
            page.wait_for_timeout(100)
            kb.press("ArrowRight")
            kb.press("Enter")
            kb.press("Enter")

            _fast_input(page, kb, "마지막 일반 텍스트입니다.", target=target)
            kb.press("Enter")

            # ── 핵심: SE 툴바 컬러피커로 볼드 텍스트에 색상 적용 ──
            log.info(f"--- SE 툴바 컬러피커: 볼드에 {TEST_COLOR} 적용 ---")
            from naver_blog import _apply_color_to_bold_texts
            colored = _apply_color_to_bold_texts(page, target, TEST_COLOR)
            log.info(f"  볼드 색상 적용: {colored}개")

            # 발행 전 에디터 스크린샷
            page.screenshot(path=str(debug_dir / "color_before_publish.png"), full_page=True)

            # 발행 전 에디터 DOM에서 색상 확인
            editor_colors = target.evaluate("""() => {
                const result = [];
                document.querySelectorAll('.se-text-paragraph span, .se-text-paragraph b').forEach(el => {
                    const s = getComputedStyle(el);
                    const text = (el.textContent || '').trim();
                    if (text) {
                        result.push({
                            text: text.slice(0, 40),
                            color: s.color,
                            inlineColor: el.style.color || '',
                            className: (el.className || '').slice(0, 60),
                            fontWeight: s.fontWeight,
                        });
                    }
                });
                return result;
            }""")
            log.info("=== 발행 전 에디터 내 색상 ===")
            for item in editor_colors:
                log.info(f"  [{item.get('fontWeight','')}] color={item.get('color','')} inline={item.get('inlineColor','')} text='{item.get('text','')}'")

            # 카테고리 선택 테스트
            log.info(f"--- 카테고리 '{TEST_CATEGORY}' 선택 테스트 ---")
            try:
                cat_ok = _select_category(page, target, TEST_CATEGORY)
                log.info(f"카테고리 선택 결과: {'성공' if cat_ok else '실패 (글쓰기 페이지)'}")
            except Exception as e:
                log.info(f"카테고리 선택 오류: {e}")

            # 발행 (카테고리 포함)
            log.info("--- 발행 중 ---")
            if not _publish(page, target=target, category=TEST_CATEGORY):
                print("[FAIL] 발행 실패")
                return

            post_url = page.url
            log.info(f"발행 URL: {post_url}")

            # 5초 대기
            time.sleep(5)

            # 발행된 글 열기
            log.info("=== 발행 글 검증 ===")
            page.goto(post_url, wait_until="domcontentloaded")
            page.wait_for_timeout(4000)

            # iframe 내 본문 찾기
            analyze_target = page
            for frame in page.frames:
                try:
                    n = frame.evaluate(
                        "() => document.querySelectorAll('.se-text-paragraph').length"
                    )
                    if n and n > 0:
                        analyze_target = frame
                        break
                except Exception:
                    continue

            # 카테고리 검증
            published_category = analyze_target.evaluate("""() => {
                // 카테고리 표시 영역 탐색
                const cats = document.querySelectorAll(
                    '[class*="category"], [class*="cate_"], .blog_category a, .post_info a'
                );
                for (const el of cats) {
                    const t = (el.textContent || '').trim();
                    if (t && t.length < 20 && t.length > 1) return t;
                }
                return '';
            }""")
            log.info(f"발행 글 카테고리: '{published_category}'")

            # 발행된 글에서 모든 텍스트의 색상 추출
            published_colors = analyze_target.evaluate("""() => {
                const result = [];
                document.querySelectorAll('.se-text-paragraph span, .se-text-paragraph b, .se-text-paragraph strong').forEach(el => {
                    const s = getComputedStyle(el);
                    const text = (el.textContent || '').trim();
                    if (text && text.length > 1) {
                        result.push({
                            text: text.slice(0, 40),
                            color: s.color,
                            inlineStyle: el.getAttribute('style') || '',
                            className: (el.className || '').slice(0, 80),
                            tagName: el.tagName,
                            fontWeight: s.fontWeight,
                        });
                    }
                });
                return result;
            }""")

            page.screenshot(path=str(debug_dir / "color_after_publish.png"), full_page=True)

            # 결과 출력
            print("\n" + "=" * 70)
            print("  색상 적용 검증 결과")
            print("=" * 70)
            print(f"  발행 URL: {post_url}")
            print()

            green_found = False
            orange_found = False
            for item in published_colors:
                color = item.get("color", "")
                text = item.get("text", "")
                inline = item.get("inlineStyle", "")
                weight = item.get("fontWeight", "")
                tag = item.get("tagName", "")
                cls = item.get("className", "")

                marker = ""
                # rgb(45, 180, 0) = #2DB400
                if "45, 180, 0" in color or "2db400" in inline.lower() or "2DB400" in inline:
                    marker = " ★ 초록색 유지!"
                    green_found = True
                # rgb(255, 107, 53) = #FF6B35
                if "255, 107, 53" in color or "ff6b35" in inline.lower() or "FF6B35" in inline:
                    marker = " ★ 주황색 유지!"
                    orange_found = True
                # 기본 검정이 아닌 색상
                if color not in ("rgb(0, 0, 0)", "rgb(51, 51, 51)", "rgb(102, 102, 102)"):
                    if not marker:
                        marker = f" (비기본색)"

                bold = "B" if weight in ("700", "bold") else " "
                print(f"  [{bold}] {tag:6s} color={color:25s} inline={inline[:30]:30s} '{text}'{marker}")

            print()
            if green_found:
                print(f"  [PASS] 초록색({TEST_COLOR}) 발행 후 유지됨!")
            else:
                print(f"  [FAIL] 초록색({TEST_COLOR}) 발행 후 사라짐")
            if orange_found:
                print(f"  [PASS] 주황색({TEST_COLOR2}) 발행 후 유지됨!")
            else:
                print(f"  [FAIL] 주황색({TEST_COLOR2}) 발행 후 사라짐")

            print()
            if published_category and TEST_CATEGORY in published_category:
                print(f"  [PASS] 카테고리 '{published_category}' 정상 반영!")
            elif published_category:
                print(f"  [WARN] 카테고리 '{published_category}' (기대: '{TEST_CATEGORY}')")
            else:
                print(f"  [INFO] 카테고리 감지 안 됨 (발행 패널에서 반영됐을 수 있음)")

            # JSON 저장
            report = {
                "url": post_url,
                "green_preserved": green_found,
                "orange_preserved": orange_found,
                "category_set": TEST_CATEGORY,
                "category_found": published_category,
                "editor_colors": editor_colors,
                "published_colors": published_colors,
            }
            with open(debug_dir / "color_test_report.json", "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"\n  리포트: {debug_dir / 'color_test_report.json'}")
            print(f"  발행 전: {debug_dir / 'color_before_publish.png'}")
            print(f"  발행 후: {debug_dir / 'color_after_publish.png'}")

        except Exception as e:
            log.exception(f"테스트 오류: {e}")
        finally:
            ctx.close()


if __name__ == "__main__":
    run_test()
