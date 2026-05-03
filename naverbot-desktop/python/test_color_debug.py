"""색상 적용 디버그 — SE API vs 다른 방법 비교

에디터에서 직접 색상 적용 방법을 모두 테스트하고
각 방법이 DOM에 실제 반영되는지 확인
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
    _set_font_size, _fast_input, _publish,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("color-debug")

NAVER_ID = "npermovie"
COLOR = "#2DB400"


def run():
    try:
        import keyring
        naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
    except Exception:
        naver_pw = ""

    profile = get_profile_dir(NAVER_ID)
    debug_dir = Path(__file__).parent / "debug"
    debug_dir.mkdir(exist_ok=True)

    with sync_playwright() as p:
        ctx = launch_browser(p, profile, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        try:
            page.goto("https://blog.naver.com", wait_until="domcontentloaded")
            page.wait_for_timeout(800)
            if not _is_logged_in(page):
                _login(page, NAVER_ID, naver_pw)

            target = _enter_write_page(page)
            kb = page.keyboard

            _input_title(target, "[디버그] 색상 방법 비교 테스트", page=page)
            page.wait_for_timeout(500)

            el = _try_selectors(target, [".se-text-paragraph", '[contenteditable="true"]'], timeout=10000)
            if el:
                el.click()
                page.wait_for_timeout(300)
                kb.press("Control+a")
                kb.press("Backspace")

            _set_font_size(page, target, "17")

            # ===========================
            # 방법 1: SE API updateStyle (기존 방식)
            # ===========================
            log.info("=== 방법 1: SE API updateStyle ===")
            text1 = "방법1 SE API 색상"
            _fast_input(page, kb, text1, target=target)
            page.wait_for_timeout(100)
            for _ in range(len(text1)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(100)
            _apply_bold(page, target, kb)
            try:
                _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"color", value:"{COLOR}"}});')
                log.info("SE API updateStyle 호출 완료")
            except Exception as e:
                log.error(f"SE API 실패: {e}")
            page.wait_for_timeout(200)

            # DOM 확인
            dom1 = target.evaluate("""() => {
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return 'no selection';
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const el = container.nodeType === 3 ? container.parentElement : container;
                return {
                    tag: el.tagName,
                    className: el.className,
                    style: el.getAttribute('style') || '',
                    computedColor: getComputedStyle(el).color,
                    outerHTML: el.outerHTML.slice(0, 300),
                };
            }""")
            log.info(f"방법1 DOM: {json.dumps(dom1, ensure_ascii=False)}")

            kb.press("ArrowRight")
            kb.press("Enter")
            kb.press("Enter")

            # ===========================
            # 방법 2: DOM 직접 조작 (span style)
            # ===========================
            log.info("=== 방법 2: DOM span style 직접 조작 ===")
            text2 = "방법2 DOM직접색상"
            _fast_input(page, kb, text2, target=target)
            page.wait_for_timeout(100)
            for _ in range(len(text2)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(100)
            _apply_bold(page, target, kb)
            # 선택 영역의 span에 직접 style.color 적용
            dom2_result = target.evaluate(f"""() => {{
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return 'no selection';

                // 선택 영역의 모든 텍스트 노드에 색상 적용
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;

                // 가장 가까운 span 찾기
                let el = container.nodeType === 3 ? container.parentElement : container;
                // se-text-paragraph 아래의 span까지 거슬러 올라가기
                while (el && el.tagName !== 'SPAN' && !el.classList.contains('se-text-paragraph')) {{
                    el = el.parentElement;
                }}

                if (el && el.tagName === 'SPAN') {{
                    el.style.color = '{COLOR}';
                    return {{ tag: el.tagName, style: el.getAttribute('style'), html: el.outerHTML.slice(0, 300) }};
                }}

                // b/strong 태그인 경우
                el = container.nodeType === 3 ? container.parentElement : container;
                if (el && (el.tagName === 'B' || el.tagName === 'STRONG')) {{
                    el.style.color = '{COLOR}';
                    // 부모 span에도
                    if (el.parentElement && el.parentElement.tagName === 'SPAN') {{
                        el.parentElement.style.color = '{COLOR}';
                    }}
                    return {{ tag: el.tagName, style: el.getAttribute('style'), html: el.outerHTML.slice(0, 300) }};
                }}

                return {{ error: 'span not found', tag: el?.tagName, cls: el?.className }};
            }}""")
            log.info(f"방법2 DOM: {json.dumps(dom2_result, ensure_ascii=False)}")

            kb.press("ArrowRight")
            kb.press("Enter")
            kb.press("Enter")

            # ===========================
            # 방법 3: SE API + DOM 직접 보강
            # ===========================
            log.info("=== 방법 3: SE API + DOM 보강 ===")
            text3 = "방법3 API플러스DOM"
            _fast_input(page, kb, text3, target=target)
            page.wait_for_timeout(100)
            for _ in range(len(text3)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(100)
            _apply_bold(page, target, kb)
            # SE API 먼저
            try:
                _se_api(target, f'ed._propertyChangeService.updateStyle({{name:"color", value:"{COLOR}"}});')
            except Exception:
                pass
            page.wait_for_timeout(100)
            # DOM에도 직접 적용
            dom3_result = target.evaluate(f"""() => {{
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return 'no selection';
                const range = sel.getRangeAt(0);
                let el = range.commonAncestorContainer;
                if (el.nodeType === 3) el = el.parentElement;

                // 선택 영역 내 모든 텍스트 관련 요소에 색상 적용
                const targets = [];
                const walk = el.closest('.se-text-paragraph') || el;
                walk.querySelectorAll('span, b, strong').forEach(node => {{
                    if (sel.containsNode(node, true)) {{
                        node.style.color = '{COLOR}';
                        targets.push(node.tagName);
                    }}
                }});

                return {{ applied: targets, html: walk.outerHTML.slice(0, 500) }};
            }}""")
            log.info(f"방법3 DOM: {json.dumps(dom3_result, ensure_ascii=False)}")

            kb.press("ArrowRight")
            kb.press("Enter")
            kb.press("Enter")

            # ===========================
            # 방법 4: SE class 기반 색상 (se-color 클래스)
            # ===========================
            log.info("=== 방법 4: SE 내부 class 기반 ===")
            text4 = "방법4 class기반색상"
            _fast_input(page, kb, text4, target=target)
            page.wait_for_timeout(100)
            for _ in range(len(text4)):
                kb.press("Shift+ArrowLeft")
            page.wait_for_timeout(100)
            _apply_bold(page, target, kb)

            # SE 에디터의 색상 class 체계 확인
            class_info = target.evaluate(f"""() => {{
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) return 'no selection';
                const range = sel.getRangeAt(0);
                let el = range.commonAncestorContainer;
                if (el.nodeType === 3) el = el.parentElement;

                // span 찾기
                let span = el.closest('span') || el;
                if (span.tagName === 'B' || span.tagName === 'STRONG') span = span.parentElement;

                // 기존 color class 제거하고 새 class 추가
                const oldClasses = span.className;
                // SE 색상 class 패턴: se-color-XXXXXX
                span.className = span.className.replace(/se-color-\\S+/g, '') + ' se-color-2DB400';
                span.style.color = '{COLOR}';

                return {{
                    oldClasses: oldClasses,
                    newClasses: span.className,
                    style: span.getAttribute('style'),
                    html: span.outerHTML.slice(0, 300),
                }};
            }}""")
            log.info(f"방법4 Class: {json.dumps(class_info, ensure_ascii=False)}")

            kb.press("ArrowRight")
            kb.press("Enter")

            # 에디터 스크린샷
            page.screenshot(path=str(debug_dir / "color_debug_editor.png"), full_page=True)

            # 모든 텍스트의 최종 DOM 상태
            all_elements = target.evaluate("""() => {
                const result = [];
                document.querySelectorAll('.se-text-paragraph').forEach((p, pi) => {
                    p.querySelectorAll('span, b, strong').forEach(el => {
                        const text = (el.textContent || '').trim();
                        if (text && text.length > 3) {
                            const cs = getComputedStyle(el);
                            result.push({
                                para: pi,
                                tag: el.tagName,
                                text: text.slice(0, 30),
                                computedColor: cs.color,
                                inlineStyle: el.getAttribute('style') || '',
                                className: (el.className || '').slice(0, 100),
                                fontWeight: cs.fontWeight,
                            });
                        }
                    });
                });
                return result;
            }""")

            log.info("=== 발행 전 전체 DOM 색상 상태 ===")
            for item in all_elements:
                has_color = item['computedColor'] != 'rgb(0, 0, 0)' or item['inlineStyle']
                marker = " ★" if has_color else ""
                log.info(
                    f"  p{item['para']} [{item['tag']}] computed={item['computedColor']} "
                    f"inline='{item['inlineStyle']}' class='{item['className'][:40]}' "
                    f"text='{item['text']}'{marker}"
                )

            # 카테고리 목록 확인
            log.info("=== 카테고리 목록 확인 ===")
            categories = target.evaluate("""() => {
                const cats = [];
                // 글쓰기 페이지의 카테고리 셀렉터들
                document.querySelectorAll(
                    '[class*="category"] option, [class*="category"] li, ' +
                    'select option, [class*="selectbox"] li, [role="option"]'
                ).forEach(el => {
                    const t = (el.textContent || '').trim();
                    if (t && t !== '카테고리 선택') cats.push(t);
                });
                return cats;
            }""")
            if categories:
                log.info(f"  카테고리 목록: {categories}")
            else:
                log.info("  카테고리 목록을 DOM에서 찾지 못함 (드롭다운 열어야 보일 수 있음)")

            # 발행
            log.info("=== 발행 ===")
            if _publish(page, target=target):
                post_url = page.url
                log.info(f"발행 URL: {post_url}")
                time.sleep(5)

                # 발행 글 검증
                page.goto(post_url, wait_until="domcontentloaded")
                page.wait_for_timeout(4000)

                analyze_target = page
                for frame in page.frames:
                    try:
                        n = frame.evaluate("() => document.querySelectorAll('.se-text-paragraph').length")
                        if n and n > 0:
                            analyze_target = frame
                            break
                    except Exception:
                        continue

                published = analyze_target.evaluate("""() => {
                    const result = [];
                    document.querySelectorAll('.se-text-paragraph').forEach((p, pi) => {
                        p.querySelectorAll('span, b, strong').forEach(el => {
                            const text = (el.textContent || '').trim();
                            if (text && text.length > 3) {
                                result.push({
                                    para: pi,
                                    tag: el.tagName,
                                    text: text.slice(0, 30),
                                    computedColor: getComputedStyle(el).color,
                                    inlineStyle: el.getAttribute('style') || '',
                                    className: (el.className || '').slice(0, 100),
                                });
                            }
                        });
                    });
                    return result;
                }""")

                page.screenshot(path=str(debug_dir / "color_debug_published.png"), full_page=True)

                print("\n" + "=" * 70)
                print("  발행 후 색상 비교")
                print("=" * 70)
                for item in published:
                    color = item['computedColor']
                    inline = item['inlineStyle']
                    cls = item['className']
                    has_green = '45, 180, 0' in color or '2db400' in inline.lower() or '2DB400' in cls
                    marker = " ★ 초록색!" if has_green else ""
                    non_black = color not in ('rgb(0, 0, 0)', 'rgb(51, 51, 51)', 'rgb(102, 102, 102)')
                    if non_black and not marker:
                        marker = f" (비기본색)"
                    print(f"  p{item['para']} [{item['tag']:6s}] color={color:25s} inline={inline[:35]:35s} cls={cls[:30]:30s} '{item['text']}'{marker}")

                # 저장
                with open(debug_dir / "color_debug_report.json", "w", encoding="utf-8") as f:
                    json.dump({"editor": all_elements, "published": published, "url": post_url}, f, ensure_ascii=False, indent=2)
            else:
                print("[FAIL] 발행 실패")

        except Exception as e:
            log.exception(f"테스트 오류: {e}")
        finally:
            ctx.close()


if __name__ == "__main__":
    run()
