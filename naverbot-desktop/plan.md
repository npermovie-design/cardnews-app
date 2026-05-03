# NaverBot SaaS - 작업 계획

## 확정 사항
- **MVP**: 블로그 자동 발행만 (카페는 v1.1)
- **클라이언트**: Electron + Python subprocess
- **글 생성**: 서버에서 Claude API 호출 (개발자 키)
- **결제**: 토스페이먼츠 정기결제 (메이킷 인프라 재활용)
- **비번 저장**: Windows keyring (DPAPI)
- **세션 저장**: `%APPDATA%\NaverBotSaaS\profiles\{user_id}\`

## 폴더 구조
```
NaverBot SaaS\
├── client\
│   ├── python\           # 봇 코어
│   │   ├── naver_blog.py       [완료] 블로그 발행 (세션 유지)
│   │   ├── config_loader.py    [완료] 설정 + keyring 비번
│   │   ├── license.py          [완료] 라이선스 검증 (서버 URL TODO)
│   │   ├── content_fetcher.py  [완료] 서버에서 글 받기 (URL TODO)
│   │   ├── runner.py           [완료] CLI 진입점
│   │   └── requirements.txt    [완료]
│   └── electron\         # GUI (TODO 1주차 후반)
└── server\               # API (TODO 2주차)
    ├── api\license\verify.ts
    ├── api\content\generate.ts
    └── api\webhook\toss.ts
```

## 1주차 진행 (완료 / 진행중 / 대기)
- [x] 폴더 구조 생성
- [x] naver_blog.py — 세션 유지 + sync 변환 + 셀렉터 폴백
- [x] config_loader.py — UserConfig dataclass + keyring
- [x] license.py — 검증 스텁
- [x] content_fetcher.py — 글 요청 스텁
- [x] runner.py — CLI 진입점 (verify / run-once / run-batch)
- [ ] 로컬 테스트 (사용자가 본인 네이버 계정으로 1회 실행 검증)
- [ ] Electron 스켈레톤 + GUI
- [ ] subprocess 통신 테스트

## 2주차 진행
- [ ] 서버 API: license verify, content generate, toss webhook
- [ ] Supabase 스키마: users, licenses, posts_log
- [ ] 토스 정기결제 셋업
- [ ] 스케줄러 (Windows Task Scheduler 등록 자동화)
- [ ] PyInstaller 패키징
- [ ] Electron Builder 패키징
- [ ] 베타 1~2명 무료 테스트

## 다음 액션 (사용자 확인 필요)
1. 위 4개 Python 파일을 본인 네이버 계정으로 1회 테스트
   ```
   cd "D:\홈페이지\NaverBot SaaS\client\python"
   pip install -r requirements.txt
   playwright install chromium
   python naver_blog.py test_user [네이버ID] [네이버PW]
   ```
2. 캡차 떴는지 / 발행 성공했는지 확인
3. 성공하면 → Electron GUI 작업 시작
4. 실패하면 → 셀렉터/플로우 수정 후 재시도
