"""전체 기능 테스트 — 짤/GIF + 스티커 + 색상 + 인용구 + 소제목"""

import sys, os, logging

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from naver_blog import publish_to_naver_blog

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("full-test")

NAVER_ID = "npermovie"

# GIF 이미지 포함 블록
TEST_BLOCKS = [
    {"type": "text", "content": "AI 도구를 제대로 활용하면 하루에 2시간 이상 절약할 수 있어요. 오늘은 실전에서 검증된 5가지 방법을 공유합니다."},
    {"type": "quote", "content": "시작이 반이다, AI도 마찬가지"},
    {"type": "subtitle", "content": "ChatGPT 프롬프트 작성 꿀팁"},
    {"type": "text", "content": "구체적으로 역할과 형식을 지정하면 결과가 완전히 달라져요. 예를 들어 30대 직장인 대상 2000자 정보성 글처럼 구체적으로 요청하세요."},
    # 일반 이미지
    {"type": "image", "url": "https://images.pexels.com/photos/7014337/pexels-photo-7014337.jpeg?auto=compress&cs=tinysrgb&w=800", "keyword": "person using AI laptop"},
    {"type": "subtitle", "content": "업무 자동화 실전 가이드"},
    {"type": "text", "content": "Zapier와 ChatGPT를 연동하면 이메일 정리부터 회의록 요약까지 자동화됩니다. 매일 반복하던 3시간의 작업을 10분으로 줄일 수 있어요."},
    # GIF 이미지 (짤)
    {"type": "image", "url": "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif", "keyword": "robot typing gif"},
    {"type": "quote", "content": "기술을 따라가는 게 아니라 활용하는 사람이 되자"},
    {"type": "subtitle", "content": "AI 시대 생존 전략"},
    {"type": "text", "content": "AI는 완벽하지 않지만 올바르게 활용하면 생산성이 비약적으로 높아집니다. 중요한 건 꾸준히 시도하고 나만의 활용법을 찾는 것입니다. 궁금한 점 있으면 댓글로 남겨주세요."},
    {"type": "image", "url": "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800", "keyword": "AI future"},
]

TEST_TAGS = ["AI활용법", "ChatGPT", "업무자동화", "AI생산성", "AI도구", "2026년AI", "인공지능", "AI트렌드", "프롬프트", "자동화도구"]


def main():
    try:
        import keyring
        naver_pw = keyring.get_password("NaverBotSaaS", NAVER_ID)
    except Exception:
        naver_pw = ""

    if not naver_pw:
        print("[FAIL] keyring 비밀번호 없음")
        return

    print("=" * 60)
    print("  전체 기능 테스트 (짤+스티커+색상+인용구)")
    print("=" * 60)

    result = publish_to_naver_blog(
        user_id=NAVER_ID,
        naver_id=NAVER_ID,
        naver_pw=naver_pw,
        title="[전체테스트] AI 활용 실전 가이드 — 짤+스티커+색상",
        blocks=TEST_BLOCKS,
        tags=TEST_TAGS,
        quote_style="vertical",
        font_size="17",
        use_sticker="on",          # ★ 스티커 삽입
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
