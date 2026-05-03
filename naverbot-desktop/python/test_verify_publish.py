"""Playwright 발행 검증 테스트

1) 색상/인용구/볼드 포함 테스트 글 발행
2) 발행된 글을 다시 열어서 스타일 유지 여부 검증
3) 결과 리포트 출력

사용법: python test_verify_publish.py
"""

import sys, os, time, json, re, logging

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from pathlib import Path
from playwright.sync_api import sync_playwright
from naver_blog import (
    publish_to_naver_blog, get_profile_dir, launch_browser, _is_logged_in
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("verify")

NAVER_ID = "npermovie"

# ── 테스트용 블록: 인용구 2개 + 볼드 강조 + 이미지 ──
TEST_BLOCKS = [
    {
        "type": "text",
        "content": (
            "이것은 **색상 유지 검증**을 위한 테스트 글입니다.\n\n"
            "발행 후에도 **볼드 강조**와 색상이 유지되는지 확인합니다."
        ),
    },
    {
        "type": "quote",
        "content": "변화는 준비된 자에게 기회다",
    },
    {
        "type": "subtitle",
        "content": "검증 항목 정리",
    },
    {
        "type": "text",
        "content": (
            "첫째, **인용구 스타일**이 저장 후에도 유지되는지.\n"
            "둘째, **글씨 색상**이 발행된 글에서도 보이는지.\n"
            "셋째, **볼드 처리**가 정상 적용되었는지."
        ),
    },
    {
        "type": "quote",
        "content": "작은 차이가 큰 결과를 만든다",
    },
    {
        "type": "text",
        "content": "테스트 글 마지막 단락입니다. 발행 후 자동으로 검증됩니다.",
    },
]

TEST_TAGS = ["테스트", "색상검증", "인용구검증", "자동화"]


def step1_publish() -> str | None:
    """테스트 글 발행, 성공 시 URL 반환."""
    log.info("=== Step 1: 테스트 글 발행 ===")

    # keyring에서 비밀번호 로드
    try:
        import keyring
        naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
    except Exception:
        naver_pw = ""

    if not naver_pw:
        log.error("네이버 비밀번호를 keyring에서 불러올 수 없음")
        return None

    result = publish_to_naver_blog(
        user_id=NAVER_ID,
        naver_id=NAVER_ID,
        naver_pw=naver_pw,
        title="[검증] 색상/인용구 유지 테스트",
        blocks=TEST_BLOCKS,
        tags=TEST_TAGS,
        quote_style="vertical",
        font_size="17",
        use_sticker="off",
        headless=False,
        ref_format={"text_colors": ["#2DB400"], "bold_colors": ["#2DB400"]},
    )

    if result["success"]:
        log.info(f"발행 성공: {result['post_url']}")
        return result["post_url"]
    else:
        log.error(f"발행 실패: {result['error']}")
        return None


def step2_verify(post_url: str) -> dict:
    """발행된 글을 Playwright로 열어 스타일 유지 여부 검증."""
    log.info(f"=== Step 2: 발행 글 검증 — {post_url} ===")

    profile = get_profile_dir(f"{NAVER_ID}_verify")
    report = {
        "url": post_url,
        "quote_styles_found": [],
        "quote_count": 0,
        "bold_count": 0,
        "colored_text_count": 0,
        "text_colors": [],
        "font_sizes": [],
        "total_text_length": 0,
        "issues": [],
        "pass": True,
    }

    with sync_playwright() as p:
        ctx = launch_browser(p, profile, headless=False)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        try:
            page.goto(post_url, wait_until="domcontentloaded")
            page.wait_for_timeout(4000)

            # 천천히 스크롤 (lazy-load 대응)
            total_h = page.evaluate("() => document.body.scrollHeight")
            cur = 0
            while cur < total_h:
                cur += 400
                page.evaluate(f"() => window.scrollBy(0, 400)")
                page.wait_for_timeout(500)
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(1000)

            # iframe 안에 본문이 있을 수 있음
            analyze_target = page
            for frame in page.frames:
                try:
                    n = frame.evaluate(
                        "() => document.querySelectorAll('.se-text-paragraph, .se-component').length"
                    )
                    if n and n > 0:
                        analyze_target = frame
                        log.info(f"본문 프레임 발견 ({n}개 요소)")
                        break
                except Exception:
                    continue

            # 분석 JS
            analysis = analyze_target.evaluate("""() => {
                const r = {
                    quoteStyles: [],
                    quoteCount: 0,
                    boldCount: 0,
                    coloredCount: 0,
                    textColors: [],
                    fontSizes: [],
                    totalTextLen: 0,
                    quoteTexts: [],
                };

                // 인용구 스타일 검출
                document.querySelectorAll('[class*="se-quotation"], .se-component.se-quotation').forEach(el => {
                    const cls = el.className || '';
                    const m = cls.match(/se-l-quotation_(\\w+)/);
                    if (m) r.quoteStyles.push(m[1]);
                    r.quoteCount++;
                    const text = (el.textContent || '').trim().slice(0, 80);
                    if (text) r.quoteTexts.push(text);
                });
                // se-section 레벨도
                document.querySelectorAll('[class*="se-section-quotation"]').forEach(el => {
                    const cls = el.className || '';
                    const m = cls.match(/se-l-quotation_(\\w+)/);
                    if (m && !r.quoteStyles.includes(m[1] + '_section')) {
                        r.quoteStyles.push(m[1]);
                    }
                });

                // 볼드 텍스트 수
                r.boldCount = document.querySelectorAll(
                    '.se-text-paragraph b, .se-text-paragraph strong'
                ).length;

                // 색상 있는 텍스트
                const colorMap = {};
                const sizeMap = {};
                document.querySelectorAll('.se-text-paragraph span, .se-text-paragraph b').forEach(el => {
                    const s = getComputedStyle(el);
                    const c = s.color;
                    if (c && c !== 'rgb(0, 0, 0)' && c !== 'rgb(51, 51, 51)') {
                        colorMap[c] = (colorMap[c] || 0) + 1;
                        r.coloredCount++;
                    }
                    const fs = s.fontSize;
                    if (fs) sizeMap[fs] = (sizeMap[fs] || 0) + 1;
                });
                r.textColors = Object.entries(colorMap).map(([c, n]) => c + '(' + n + ')');
                r.fontSizes = Object.entries(sizeMap).map(([s, n]) => s + '(' + n + ')');

                // 전체 텍스트 길이
                document.querySelectorAll('.se-text-paragraph').forEach(p => {
                    r.totalTextLen += (p.textContent || '').trim().length;
                });

                return r;
            }""")

            # 리포트 매핑
            report["quote_styles_found"] = analysis.get("quoteStyles", [])
            report["quote_count"] = analysis.get("quoteCount", 0)
            report["bold_count"] = analysis.get("boldCount", 0)
            report["colored_text_count"] = analysis.get("coloredCount", 0)
            report["text_colors"] = analysis.get("textColors", [])
            report["font_sizes"] = analysis.get("fontSizes", [])
            report["total_text_length"] = analysis.get("totalTextLen", 0)
            report["quote_texts"] = analysis.get("quoteTexts", [])

            # 검증 판정
            if report["quote_count"] < 2:
                report["issues"].append(f"인용구 {report['quote_count']}개 (기대: 2개)")
                report["pass"] = False
            if report["bold_count"] < 2:
                report["issues"].append(f"볼드 {report['bold_count']}개 (기대: 2개 이상)")
                report["pass"] = False
            if report["colored_text_count"] == 0:
                report["issues"].append("색상 적용된 텍스트 없음 (SE API 색상 유지 실패)")
                report["pass"] = False
            if not report["quote_styles_found"]:
                report["issues"].append("인용구 스타일 class 미감지")

            # 스크린샷 저장
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(debug_dir / "verify_result.png"), full_page=True)

        except Exception as e:
            report["issues"].append(f"검증 중 오류: {e}")
            report["pass"] = False
        finally:
            ctx.close()

    return report


def main():
    print("=" * 60)
    print("  NaverBot 발행 검증 테스트")
    print("=" * 60)

    # Step 1: 발행
    url = step1_publish()
    if not url:
        print("\n[FAIL] 발행 실패 — 검증 불가")
        return 1

    # 5초 대기 (발행 반영 시간)
    log.info("발행 반영 대기 5초...")
    time.sleep(5)

    # Step 2: 검증
    report = step2_verify(url)

    # 결과 출력
    print("\n" + "=" * 60)
    print("  검증 결과")
    print("=" * 60)
    print(f"  URL: {report['url']}")
    print(f"  인용구 수: {report['quote_count']}")
    print(f"  인용구 스타일: {report['quote_styles_found']}")
    print(f"  인용구 텍스트: {report.get('quote_texts', [])}")
    print(f"  볼드 텍스트 수: {report['bold_count']}")
    print(f"  색상 텍스트 수: {report['colored_text_count']}")
    print(f"  감지된 색상: {report['text_colors']}")
    print(f"  글씨 크기: {report['font_sizes']}")
    print(f"  전체 텍스트 길이: {report['total_text_length']}자")
    print()

    if report["pass"]:
        print("  [PASS] 모든 검증 통과!")
    else:
        print("  [FAIL] 검증 실패:")
        for issue in report["issues"]:
            print(f"    - {issue}")

    # JSON 저장
    debug_dir = Path(__file__).parent / "debug"
    debug_dir.mkdir(exist_ok=True)
    with open(debug_dir / "verify_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n  리포트 저장: {debug_dir / 'verify_report.json'}")

    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
