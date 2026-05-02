# 네이버 블로그 글쓰기 기능 강화 점검 메모

작성일: 2026-05-02

## 참고 자료

- `C:\Users\엔퍼그로스\Desktop\공톰프롬프트.txt`
- `D:\홈페이지\SNS메이킷\src\BlogUtils.jsx`
- `D:\홈페이지\SNS메이킷\lib\naverbot\prompts.js`
- `D:\홈페이지\SNS메이킷\api\naverbot.js`
- `D:\홈페이지\NaverBot SaaS\client\python\runner.py`
- `D:\홈페이지\NaverBot SaaS\server\lib\anthropic.ts`

## 현재 구조 요약

메이킷 웹 글쓰기와 NaverBot 자동발행은 모두 네이버 블로그 글 생성을 다루지만, 실제 프롬프트 규칙은 여러 곳에 분산되어 있다.

- 메이킷 웹 글쓰기: `src/BlogUtils.jsx`의 `PLATFORMS.blog_naver.buildPrompt`
- NaverBot 서버 API: `lib/naverbot/prompts.js`의 `buildBlogPrompt`
- NaverBot 데스크톱 자동발행 보강 프롬프트: `client/python/runner.py`의 `_build_seo_prompt`, `_build_visual_blog_prompt`, `_build_source_guard_prompt`
- 구형/별도 서버 생성 로직: `server/lib/anthropic.ts`

## 통일이 필요한 부분

### 1. 제목 규칙 충돌

공통 프롬프트는 제목을 `30~40자`, `핵심 키워드`, `경험·시점`, `연월` 포함으로 요구한다.

반면 NaverBot 러너는 제목을 `30자 이내`, `연도 넣지 말 것`으로 지시하고 있어 직접 충돌한다.

정리 방향:

- 기본 제목 길이: 30~40자
- 작성 시점 또는 연월은 정보성/경제/사회/IT/건강 글에서 자연스럽게 반영
- 과거 연도 고정 금지. 현재 시점은 실제 날짜 기준으로만 사용

### 2. 본문 구조 차이

공통 프롬프트는 다음 구조를 요구한다.

- 제목
- 도입부
- AEO 질문-답변 3개
- 핵심 정보 박스
- 본문 5섹션
- 솔직 평가
- 결론 및 추천 대상

현재 메이킷/NaverBot 프롬프트는 소제목 3~6개, 인용구, 이미지 중심이라 AEO 질문 블록과 핵심 정보 박스가 약하다.

정리 방향:

- 생성 기본 구조에 AEO 질문 3개를 추가
- 핵심 정보 박스는 표 마커 또는 텍스트 블록으로 안정적으로 생성
- 본문은 5~7섹션 기준으로 확장

### 3. 이미지 규칙 차이

공통 프롬프트는 사진 위치 12~18곳을 요구한다.

현재 자동발행은 `[image:]` 4~6개 기준이며, 실제 네이버 자동발행 안정성까지 고려하면 12~18장은 실패 가능성이 커진다.

정리 방향:

- 웹 미리보기: 8~12개까지 가능
- 자동발행 기본: 4~8개
- 구글 드라이브 이미지 사용 시 외부 이미지 생성 금지

### 4. 출력 마커 차이

현재 사용 중인 마커가 서로 다르다.

- 웹 글쓰기: `[quote]문장[/quote]`
- NaverBot API/자동발행: `[QUOTE]`, `[SUBTITLE]`, `[image:]`
- 공통 프롬프트: `[사진: 설명]`, `[표: 설명]`, `Q.`, `A.`

정리 방향:

- 자동발행 표준 마커: `[TITLE]`, `[SUBTITLE]`, `[QUOTE]`, `[QA]`, `[TABLE]`, `[image:]`, `[TAGS]`
- 웹 미리보기는 기존 렌더러와 호환되도록 `[quote]`도 계속 허용
- 서버 파서는 `[QA]`, `[TABLE]`을 일반 텍스트로라도 안전하게 유지

### 5. 카테고리별 입력 부족

공통 프롬프트는 경제/사회/여행/쇼핑/IT/건강 등 카테고리별 추가 입력을 요구한다.

현재 코드의 글 타입은 `info`, `visit`, `travel`, `product`, `column`, `article` 중심이라 경제·사회·건강·IT의 출처, 수치, 주의사항 입력이 약하다.

정리 방향:

- 당장 UI 대공사는 하지 않고 `extra`와 자동발행 카테고리 지시 안에 카테고리별 요구사항을 주입
- 이후 UI에서 카테고리별 필드 추가 가능

## 글감 브리프 설계

글쓰기 품질을 높이려면 바로 본문 생성으로 가지 않고, 내부적으로 다음 브리프를 만든 뒤 글을 생성하는 방향이 좋다.

- 카테고리
- 글 목적
- 핵심 키워드 1~2개
- 타겟 독자
- 경험 기반 여부
- 작성 시점
- 카테고리별 핵심 정보
- AEO 질문 3개
- 핵심 정보 박스 항목 5~7개
- 본문 섹션 5~7개
- 필요한 시각자료 위치
- 장점 3개, 단점 2개 또는 긍정/우려
- 추천 대상, 비추천 대상

## 1차 적용 순서

1. `lib/naverbot/prompts.js`에 공통 네이버 블로그 품질 규칙 추가
2. NaverBot API 생성 프롬프트가 AEO 질문, 핵심 정보 박스, 솔직 평가를 포함하도록 조정
3. `client/python/runner.py`의 제목/연도/분량/이미지 규칙 충돌 제거
4. `src/BlogUtils.jsx`의 웹 글쓰기 프롬프트도 같은 방향으로 정리
5. 파서가 새 마커를 깨지 않고 처리하는지 확인

## 2026-05-02 1차 반영 완료

- `SNS메이킷/lib/naverbot/prompts.js`: NaverBot API 공통 품질 규칙 추가
- `SNS메이킷/src/BlogUtils.jsx`: 웹 글쓰기 프롬프트에 AEO 질문, 핵심 정보 표, 장단점/추천·비추천 기준 추가
- `NaverBot SaaS/client/python/runner.py`: 자동발행 보강 프롬프트의 제목/연도/분량/이미지 수 충돌 제거
- `NaverBot SaaS/server/lib/anthropic.ts`: 구형 생성 경로에도 최소 품질 규칙 반영
- 검증: `npm run build`, `node --check lib\naverbot\prompts.js`, `python -m py_compile client\python\runner.py`

## 2026-05-02 2차 반영 완료

- `SNS메이킷/src/BlogGenerator.jsx`: 네이버 블로그 글쓰기 설정에 `글감 브리프` UI 추가
- 브리프 항목: 카테고리, 글 목적, 경험 기반, 타겟 독자, 작성 시점, 핵심 검색 키워드, 출처, 핵심 수치, 교통/구매처/사용기간/비교대상/자격/주의사항
- 생성 시 브리프를 `[글감 브리프]` 블록으로 합쳐 AEO 질문, 핵심 정보 박스, 본문 섹션에 우선 반영하도록 연결
- 검증: `npm run build`

## 주의점

- 출처 없는 수치, 기관명, 통계는 만들지 않도록 유지해야 한다.
- 네이버 자동발행은 이미지 수가 많을수록 실패 가능성이 커지므로 기본값은 보수적으로 둔다.
- 공통 프롬프트의 사진 12~18개 규칙은 자동발행에는 그대로 적용하지 않는다.
- 구형 `server/lib/anthropic.ts`는 실제 사용 여부 확인 후 정리하거나 최소한 규칙 불일치를 줄인다.
