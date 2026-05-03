---
name: project_makeit_0502
description: 2026-05-02 메이킷 대규모 업데이트 - 블로그 강화, 횟수제 완전 전환, 구독 시스템, 보안, 번들 최적화, UX 개선
type: project
---

## 2026-05-02 메이킷 대규모 업데이트

### 1. 블로그 글쓰기 강화 (13개 항목)
- 카테고리별 브리프 UI (여행/쇼핑/경제/사회/IT/건강별 다른 필드)
- AEO Q&A / 장단점 토글 체크박스 (포함 여부 선택)
- [TABLE] 정보 박스, Q./A. AEO 카드, 장단점/추천 태그, 해시태그 칩 렌더링
- 프롬프트 통일 ([TABLE] 마커, 장단점 형식 웹/API/자동발행 동기화)
- cleanBlogText 마커 잔여 제거
- 카테고리→글유형 자동연동, 작성시점 기본값, 브리프 접기/펼치기, 모바일 반응형
- 참고 글 모드에서도 AEO/TABLE 삽입, 이미지 8장 초과 경고

### 2. NaverBot SaaS 동기화
- Electron UI: AEO/장단점 토글 + 콘텐츠 분야 칩 추가
- runner.py: 자동운영/빠른시작 두 경로에 토글 + 분야별 힌트
- 서버 API: includeAEO/includeProsCons 파라미터
- exe v0.1.8 재빌드 완료

### 3. 순수 횟수제 전환 (USE_UNIT=30 → 1)
- POINTS 상수 전부 1단위 (가입 5, 로그인 1, AI -1)
- 15개 파일에서 하드코딩 포인트 차감 -30/-50/-60 → -1로 통일
- 웹훅 ONE_OFF_POINTS/SUB_TIERS 직접 횟수값
- DB 마이그레이션: 79명 사용자 points÷30 완료
- point_history 기존 기록: 2026-05-03 이전은 ÷30 보정 표시
- AdminPage 횟수 지급/차감/설정에서 30배 제거
- "150P 보너스" → "5회 보너스" 등 레거시 문구 수정

### 4. 구독 기반 월간 한도 시스템
- DB: monthly_used, monthly_used_write, monthly_used_video, monthly_reset_at, monthly_limit
- RPC: use_monthly_quota (feature별 한도 체크+차감), reset_monthly_usage (리셋)
- PLAN_LIMITS: Basic 50/5, Pro 200/20, Business 500/50 (write/video)
- 구독자: monthly_used 기반, 비구독자: 기존 포인트 방식
- 웹훅 갱신 시 포인트 대량 적립 → monthly_used 리셋으로 전환
- MyPage: 플랜명 + 월간 사용량/한도 표시
- AiSidebar: 구독자 잔여 횟수 + 플랜명 뱃지 + 프로그레스 바

### 5. 보안 수정
- P0: CORS * → snsmakeit.com+localhost, Admin 인증 VERCEL 환경변수 제한, API uid Bearer 교차 검증, 결제 30초 폴링+미확인 안내
- P1: YouTube rate limit 30회/10분 + 클라이언트 API 키 전달 제거, BoardPage XSS DOMPurify
- P2: OAuth state HMAC 서명 (Meta/Google/Tistory), noindex 경로 확장 (/login/auth/profile/payment)

### 6. 성능 최적화
- 메인 번들: 551KB → 280KB (49% 감소)
- manualChunks: i18n(221KB), vendor, leaflet, purify 분리
- HomePage lazy import

### 7. UX/UI 개선
- 다운로드 팝업 비활성화 (모든 페이지에서 뜨던 이탈 원인 제거)
- FadeIn IntersectionObserver 미지원 환경 fallback (SEO 크롤러 대응)
- 푸터 B/IG/YT 텍스트 → SVG 아이콘
- 클래스 페이지: 관리자/강사만 접근 (네비/URL 모두 제한)
- 클래스 빈 상태: "준비 중" + AI 도구 유도 버튼
- 가격 페이지 모바일: 무료 체험 안내 배너 상단 표시
- 글쓰기 자동 임시 저장: localStorage draft + 24시간 복원 배너

### 8. DB 실행 완료
- supabase_subscription_upgrade.sql (monthly_used, monthly_limit, RPC 2개)
- 20260502160000_split_monthly_usage.sql (monthly_used_write/video 분리, RPC 확장)
- 사용자 points÷30 마이그레이션 (79명)

### 핫픽스
- BlogGenerator draft 변수 초기화 순서 에러 수정 (result 선언 전 참조)

### 미완료/향후 작업
- 기능별 횟수 한도: 인프라 준비됨, 영상 기능에 useAiOnce(..., "video") 호출 추가 필요
- 홈페이지 "실제 사용자의 이야기" 섹션 후기 데이터 부족
- 다운로드 프로그램 홍보를 홈 하단 배너로 대체 가능
