# 프로젝트 개요

SNS 콘텐츠 자동화 플랫폼 (snsmakeit.com)
- React (Vite) 프론트엔드 + Supabase 백엔드
- OpenRouter API 사용 (claude-sonnet-4-5)

## 주요 기능
- AI 글쓰기 (네이버, 인스타, 유튜브, 티스토리 등)
- 카드뉴스 / 상세페이지 / 썸네일 생성
- 이미지 생성/수정 (로고, 목업, 얼굴교체, 의상교체)
- PPT 제작
- SEO 분석 (핫키워드)
- **Shorts Factory** (shorts-factory/) - 숏폼 영상 자동 제작
- **Virality System** (shorts-factory/virality/) - 경쟁사 릴스 AI 분석

## Shorts Factory (FastAPI 백엔드)
- 위치: shorts-factory/
- 실행: `cd shorts-factory && uvicorn app:app --port 8000`
- PyAV 영상처리, faster-whisper 음성인식, OpenRouter AI 분석
- Dockerfile + Procfile 준비됨
- **아직 미배포** → Render 배포 필요 (VITE_SHORTS_FACTORY_URL 환경변수)

## 개발 규칙
- 한국어 UI, 다크모드/라이트모드 지원
- AiPage.jsx가 메인 AI 메뉴 허브 (2800+ lines)
- iframe으로 Shorts Factory 임베딩 (localhost:8000 또는 배포 URL)
- OpenRouter API 키: aiClient.js에서 관리
- 포인트 시스템: Supabase에서 유저별 포인트 차감
