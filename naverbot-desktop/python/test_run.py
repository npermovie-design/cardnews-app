"""1회 테스트 실행.

사용:
    set NAVERBOT_TEST_NAVER_ID=your_id
    python test_run.py
"""

import os

from config_loader import load_password
from naver_blog import publish_to_naver_blog

NAVER_ID = os.environ.get("NAVERBOT_TEST_NAVER_ID", "")
NAVER_PW = load_password("NaverBotSaaS", NAVER_ID) if NAVER_ID else ""

if not NAVER_ID or not NAVER_PW:
    raise SystemExit("NAVERBOT_TEST_NAVER_ID 환경변수와 Windows Credential Manager 비밀번호가 필요합니다.")

result = publish_to_naver_blog(
    user_id="test_user",
    naver_id=NAVER_ID,
    naver_pw=NAVER_PW,
    title="[테스트] 자동포스팅",
    body="이건 자동 포스팅 테스트입니다.\n등록되면 삭제해주세요.",
    tags=["테스트"],
    headless=False,  # 첫 실행은 반드시 False (캡차/2차인증 통과용)
)

print("=" * 50)
print("결과:")
print(result)
print("=" * 50)
