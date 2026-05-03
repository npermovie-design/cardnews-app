## 메이킷 시스템 아키텍처 (2026-05-02 기준)

### 요금 체계: 순수 횟수제
- 1회 = 1 (USE_UNIT=1, 내부 30배 단위 완전 제거)
- 모든 AI 기능 1회 = 1 차감 (글쓰기, 이미지, 영상, 채팅 동일)
- DB `points` 컬럼 = 실제 이용 횟수 (1:1 매핑)

### 구독 플랜
- Free: 가입 5회, 출석 +1회/일
- Basic $9.9/월: 글쓰기 50회/월, 영상 5회/월
- Pro $19.9/월: 글쓰기 200회/월, 영상 20회/월, NaverBot 3회/일
- Business $69.9/월: 글쓰기 500회/월, 영상 50회/월, NaverBot 10회/일

### 월간 한도 시스템
- 구독자: `users.monthly_used_write` / `monthly_used_video` 추적
- RPC `use_monthly_quota(uid, cost, reason, feature)` — 한도 체크 + 차감
- RPC `reset_monthly_usage(uid, reason)` — 구독 갱신 시 리셋
- 비구독자: `users.points` 누적 방식 (출석/가입 보너스)

### 결제 흐름
- LemonSqueezy checkout → webhook → api/sns.js
- subscription_created: monthly_used 리셋 + 보너스 5회 적립
- subscription_payment_success: monthly_used 리셋
- subscription_cancelled/expired: status 업데이트

### 보안
- CORS: snsmakeit.com + localhost만 허용
- Admin API: JWT + role 검증 (로컬만 uid 폴백)
- OAuth state: HMAC 서명
- XSS: DOMPurify 적용
- rate limit: ai-proxy 20회/10분, youtube-search 30회/10분

### 번들 구조
- index.js: ~280KB (gzip 77KB)
- i18n.js: ~221KB (별도 chunk)
- vendor.js: ~142KB, fabric.js: ~280KB, leaflet.js: ~150KB

### 주요 파일 경로
- 프론트엔드: D:\홈페이지\SNS메이킷\src\
- API: D:\홈페이지\SNS메이킷\api\
- NaverBot SaaS: D:\홈페이지\NaverBot SaaS\
- 프롬프트: D:\홈페이지\SNS메이킷\lib\naverbot\prompts.js
- DB 마이그레이션: D:\홈페이지\SNS메이킷\supabase\migrations\
