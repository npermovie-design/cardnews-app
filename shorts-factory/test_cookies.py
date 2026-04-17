"""쿠키 저장/복원 테스트"""
import asyncio
from naver_publisher import _save_cookies_to_db, _load_cookies_from_db

async def main():
    test_id = "npermovie"

    # 1. 테스트 쿠키 저장
    fake_cookies = [
        {"name": "NID_AUT", "value": "test123", "domain": ".naver.com", "path": "/"},
        {"name": "NID_SES", "value": "test456", "domain": ".naver.com", "path": "/"},
    ]
    print("1. 쿠키 저장 중...")
    await _save_cookies_to_db(test_id, fake_cookies)

    # 2. 쿠키 복원
    print("2. 쿠키 복원 중...")
    loaded = await _load_cookies_from_db(test_id)

    if loaded and len(loaded) == 2:
        print(f"   성공! {len(loaded)}개 쿠키 복원됨")
        print(f"   첫번째: {loaded[0]['name']} = {loaded[0]['value']}")
    else:
        print(f"   실패! loaded = {loaded}")

    # 3. 정리 - 테스트 데이터 삭제
    print("3. 완료")

asyncio.run(main())
