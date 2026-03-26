# SNS 자동 발행 & SEO 키워드 분석 — API 연동 가이드

## 1. Supabase 테이블 생성

Supabase Dashboard > SQL Editor에서 `supabase_setup.sql` 하단의 `sns_connections`, `publish_history` 테이블 생성 SQL을 실행하세요.

---

## 2. 티스토리 API 연동

### 2-1. 앱 등록
1. https://www.tistory.com/guide/api/manage/register 접속
2. "앱 등록" 클릭
3. 정보 입력:
   - **서비스 명**: SNS메이킷
   - **서비스 URL**: `https://www.snsmakeit.com`
   - **CallBack**: `https://www.snsmakeit.com/api/sns-auth-tistory`
4. 등록 완료 후 **App ID**(Client ID)와 **Secret Key** 확인

### 2-2. Vercel 환경변수 설정
Vercel Dashboard > Settings > Environment Variables:
```
TISTORY_CLIENT_ID=발급받은_App_ID
TISTORY_CLIENT_SECRET=발급받은_Secret_Key
TISTORY_REDIRECT_URI=https://www.snsmakeit.com/api/sns-auth-tistory
```

### 2-3. 동작 흐름
1. 사용자가 프로필 > "티스토리 연결하기" 클릭
2. 티스토리 로그인 & 권한 승인 페이지로 이동
3. 승인 후 콜백 → 토큰이 Supabase `sns_connections`에 저장
4. 글 생성 후 "티스토리 발행" 버튼 클릭 → 자동 발행

---

## 3. Meta(스레드/인스타) API 연동

### 3-1. Facebook 앱 등록
1. https://developers.facebook.com 접속 > "내 앱" > "앱 만들기"
2. 앱 유형: **비즈니스**
3. 제품 추가:
   - Threads API (스레드용)
   - Instagram Graph API (인스타용)
4. 설정 > 기본 설정에서 **앱 ID**, **앱 시크릿 코드** 확인
5. OAuth 리디렉션 URI 추가: `https://www.snsmakeit.com/api/sns-auth-meta`

### 3-2. Vercel 환경변수 설정
```
META_APP_ID=Facebook_App_ID
META_APP_SECRET=Facebook_App_Secret
META_REDIRECT_URI=https://www.snsmakeit.com/api/sns-auth-meta
```

### 3-3. 주의사항
- **스레드**: 텍스트 포스트 자동 발행 가능 (500자 제한)
- **인스타그램**: 이미지 필수, 비즈니스/크리에이터 계정만 지원
- 프로덕션 사용 시 Facebook 앱 심사 필요 (개발 모드에서는 본인 계정만 테스트 가능)

---

## 4. 네이버 DataLab API (SEO 키워드 분석)

### 4-1. 앱 등록
1. https://developers.naver.com 접속 > "애플리케이션 등록"
2. 사용 API: **데이터랩(검색어 트렌드)** 선택
3. 서비스 URL: `https://www.snsmakeit.com`
4. 등록 후 **Client ID**, **Client Secret** 확인

### 4-2. Vercel 환경변수 설정
```
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret
```

### 4-3. 동작 흐름
1. 사용자가 글쓰기에서 키워드 입력
2. 800ms 디바운스 후 `/api/keyword-analysis` 호출
3. 네이버 DataLab에서 7일간 검색 트렌드 조회
4. 네이버 자동완성에서 관련 키워드 수집
5. 결과를 SEO 키워드 분석 패널에 표시

### 4-4. API 키 없을 때
- 샘플 데이터가 표시됨 (랜덤 트렌드)
- "네이버 API 키가 설정되지 않아 샘플 데이터입니다" 안내 표시

---

## 5. 네이버 광고 API (선택 — 월간 검색량/경쟁도)

### 5-1. 계정 준비
1. https://searchad.naver.com 에서 광고 계정 생성
2. 도구 > API 사용 관리에서 API 라이선스 발급
3. API Key, Secret Key, Customer ID 확인

### 5-2. Vercel 환경변수 설정
```
NAVER_ADS_API_KEY=API_Key
NAVER_ADS_SECRET_KEY=Secret_Key
NAVER_ADS_CUSTOMER_ID=Customer_ID
```

> 이 API는 월간 검색량, CPC, 경쟁도 데이터를 제공합니다.
> 현재 뼈대에는 미포함 — 추후 `api/keyword-analysis.js`에 추가 가능

---

## 6. 환경변수 전체 목록

| 변수명 | 용도 | 필수 |
|--------|------|------|
| `TISTORY_CLIENT_ID` | 티스토리 OAuth | 티스토리 발행 시 |
| `TISTORY_CLIENT_SECRET` | 티스토리 OAuth | 티스토리 발행 시 |
| `TISTORY_REDIRECT_URI` | 티스토리 콜백 URL | 티스토리 발행 시 |
| `META_APP_ID` | Facebook/Meta 앱 ID | 스레드/인스타 발행 시 |
| `META_APP_SECRET` | Facebook/Meta 시크릿 | 스레드/인스타 발행 시 |
| `META_REDIRECT_URI` | Meta 콜백 URL | 스레드/인스타 발행 시 |
| `NAVER_CLIENT_ID` | 네이버 개발자 | SEO 키워드 분석 시 |
| `NAVER_CLIENT_SECRET` | 네이버 개발자 | SEO 키워드 분석 시 |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 키 | API 서버용 (기존) |

---

## 7. 테스트 순서

1. **Supabase 테이블 생성** (SQL 실행)
2. **네이버 DataLab API 키 등록** → 키워드 분석 테스트
3. **티스토리 앱 등록** → 연결 + 발행 테스트
4. **Meta 앱 등록** → 스레드 연결 + 발행 테스트
