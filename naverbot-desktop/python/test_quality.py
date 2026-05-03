"""참고 글 수준 품질 테스트 — Playwright로 발행+검증 반복"""

import sys, os, time, json, logging

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from naver_blog import publish_to_naver_blog

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("quality")

NAVER_ID = "npermovie"

# 참고 글(goldnlbo) 스타일을 재현하는 테스트 블록
TEST_BLOCKS = [
    {"type": "text", "content": "2026년 들어 AI 도구를 업무에 활용하는 사람이 급격히 늘었어요. 그런데 막상 써보면 생각보다 결과가 안 나와서 포기하는 분들이 많더라고요. 오늘은 제가 직접 3개월간 테스트하며 알게 된 핵심 노하우를 공유합니다."},
    {"type": "quote", "content": "AI는 도구일 뿐, 활용법을 아는 사람이 진짜 경쟁력이다"},
    {"type": "subtitle", "content": "ChatGPT 프롬프트 작성의 핵심 원칙"},
    {"type": "text", "content": "가장 많이 하는 실수가 바로 모호한 질문이에요. AI에게 구체적인 맥락과 역할, 출력 형식을 지정해주면 결과가 완전히 달라집니다. 예를 들어 단순히 블로그 글 써줘 대신 30대 직장인 대상, 재테크 초보를 위한 2000자 정보성 블로그 글이라고 지시하면 훨씬 좋은 결과가 나와요."},
    {"type": "image", "url": "https://images.pexels.com/photos/7014337/pexels-photo-7014337.jpeg?auto=compress&cs=tinysrgb&w=800", "keyword": "person typing laptop AI"},
    {"type": "subtitle", "content": "이미지 생성 AI 실전 활용 가이드"},
    {"type": "text", "content": "미드저니나 달리3 같은 이미지 생성 AI를 블로그에 활용하면 저작권 걱정 없는 고퀄리티 이미지를 만들 수 있어요. 실무에서는 블로그 썸네일, SNS 콘텐츠, 제품 목업 이미지 제작에 많이 활용합니다."},
    {"type": "image", "url": "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800", "keyword": "AI generated art digital"},
    {"type": "quote", "content": "시작이 반이다, AI 활용도 마찬가지"},
    {"type": "subtitle", "content": "업무 자동화로 하루 2시간 절약하는 법"},
    {"type": "text", "content": "저는 AI 자동화 도구를 도입한 뒤 매일 약 2시간의 반복 업무를 줄였어요. 이메일 정리, 회의록 요약, 데이터 분석 같은 작업을 AI가 대신해주니까 정말 편해졌습니다. 특히 Zapier와 ChatGPT를 연동하면 놀라운 자동화가 가능해요."},
    {"type": "image", "url": "https://images.pexels.com/photos/5926382/pexels-photo-5926382.jpeg?auto=compress&cs=tinysrgb&w=800", "keyword": "business automation workflow"},
    {"type": "text", "content": "AI는 완벽하지 않지만, 잘 활용하면 개인의 생산성을 비약적으로 높일 수 있어요. 중요한 건 꾸준히 시도하고 나만의 활용법을 찾는 것입니다. 궁금한 점 있으면 댓글로 편하게 남겨주세요."},
]

TEST_TAGS = ["AI활용법", "ChatGPT사용법", "AI자동화", "미드저니", "AI업무효율", "인공지능트렌드", "AI부업", "2026년AI", "AI생산성", "AI도구추천"]


def main():
    try:
        import keyring
        naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
    except Exception:
        naver_pw = ""

    if not naver_pw:
        print("[FAIL] keyring에서 비밀번호 불러올 수 없음")
        return

    print("=" * 60)
    print("  품질 테스트 — 참고 글 수준 재현")
    print("=" * 60)

    # headless=False + 발행 전 스크린샷 확인을 위해 직접 제어
    from pathlib import Path
    from playwright.sync_api import sync_playwright
    from naver_blog import (
        get_profile_dir, launch_browser, _is_logged_in, _login,
        _enter_write_page, _dismiss_popups, _input_title,
        _input_body_blocks, _input_tags, _publish, _download_blocks_images,
        _set_font_size, _select_category,
    )

    profile = get_profile_dir(NAVER_ID)
    debug_dir = Path(__file__).parent / "debug"
    debug_dir.mkdir(exist_ok=True)
    prepared = _download_blocks_images(TEST_BLOCKS)

    with sync_playwright() as p:
        ctx = launch_browser(p, profile, headless=False)
        pg = ctx.pages[0] if ctx.pages else ctx.new_page()

        pg.goto("https://blog.naver.com", wait_until="domcontentloaded")
        pg.wait_for_timeout(800)
        if not _is_logged_in(pg):
            _login(pg, NAVER_ID, naver_pw)

        target = _enter_write_page(pg)

        _input_title(target, "[품질테스트] 2026년 AI 활용법 완전정복 가이드", page=pg)
        pg.wait_for_timeout(500)

        _input_body_blocks(
            target, prepared, page=pg,
            quote_style="vertical", font_size="17",
            use_sticker=False, template_applied=False,
            ref_format={"bold_colors": ["#2DB400"], "text_colors": ["#2DB400"]},
        )

        # ★ 발행 전 에디터 상태 확인
        pg.screenshot(path=str(debug_dir / "quality_before_publish.png"), full_page=True)
        editor_check = target.evaluate("""() => {
            const bold = document.querySelectorAll('.se-component.se-text b, .se-component.se-text strong');
            const colored = [];
            document.querySelectorAll('.se-text-paragraph span, .se-text-paragraph b').forEach(el => {
                const c = getComputedStyle(el).color;
                if (c !== 'rgb(0, 0, 0)' && c !== 'rgb(51, 51, 51)') {
                    colored.push({text: (el.textContent||'').trim().slice(0,20), color: c});
                }
            });
            return {boldCount: bold.length, coloredCount: colored.length, colored: colored.slice(0,10)};
        }""")
        log.info(f"발행 전 체크: 볼드={editor_check.get('boldCount',0)}개, 색상={editor_check.get('coloredCount',0)}개")
        for c in editor_check.get('colored', []):
            log.info(f"  색상 요소: color={c['color']} '{c['text']}'")

        _input_tags(target, TEST_TAGS, page=pg)

        if _publish(pg, target=target, category="마케팅"):
            post_url = pg.url
            log.info(f"발행 성공: {post_url}")
        else:
            log.error("발행 실패")
            post_url = None

        ctx.close()

    if post_url:
        print(f"\n[OK] {post_url}")
    else:
        print("\n[FAIL]")
    return

    result = publish_to_naver_blog(
        user_id=NAVER_ID,
        naver_id=NAVER_ID,
        naver_pw=naver_pw,
        title="[품질테스트] 2026년 AI 활용법 완전정복 가이드",
        blocks=TEST_BLOCKS,
        tags=TEST_TAGS,
        quote_style="vertical",
        font_size="17",
        use_sticker="off",
        category="마케팅",
        headless=False,
        ref_format={"bold_colors": ["#2DB400"], "text_colors": ["#2DB400"]},
    )

    if result["success"]:
        print(f"\n[OK] 발행 성공: {result['post_url']}")
    else:
        print(f"\n[FAIL] 발행 실패: {result['error']}")


if __name__ == "__main__":
    main()
