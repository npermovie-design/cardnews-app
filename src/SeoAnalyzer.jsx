import { useState, useEffect, useRef } from "react";
import { callAI } from "./aiClient";

const CATEGORIES = ["전체","IT/테크","경제/금융","엔터테인먼트","스포츠","건강/의학","교육","여행","음식","패션/뷰티"];

/* ── 플랫폼별 분석 기준 ── */
const PLATFORM_CONFIG = {
  blog: {
    label: "네이버 블로그 분석", icon: "📝", color: "#22c55e",
    placeholder: "https://blog.naver.com/...",
    criteria: [
      { key:"title", label:"제목 최적화", icon:"📌", weight:20, guide:"네이버 검색에서 노출되려면 핵심 키워드가 제목 앞부분에 위치해야 합니다. 25~35자가 이상적입니다." },
      { key:"content", label:"본문 구성", icon:"📝", weight:25, guide:"소제목(H2/H3)을 3~5개 사용하고, 핵심 키워드를 본문에 자연스럽게 5~8회 반복해야 합니다." },
      { key:"keyword", label:"키워드 전략", icon:"🔑", weight:20, guide:"메인 키워드 1개 + 연관 키워드 3~5개를 본문 전체에 분산 배치해야 합니다." },
      { key:"media", label:"이미지/영상 활용", icon:"🖼", weight:15, guide:"이미지 최소 5장 이상, alt 태그에 키워드 포함. 영상 1개 이상 삽입이 C-Rank에 유리합니다." },
      { key:"engagement", label:"체류시간/가독성", icon:"⏱", weight:10, guide:"1,500자 이상 작성, 짧은 문단(3~4줄), 목록/표 활용으로 스크롤을 유도해야 합니다." },
      { key:"structure", label:"글 구조/형식", icon:"📋", weight:10, guide:"서론-본론-결론 구조, CTA(행동 유도) 포함, 관련 글 내부 링크 2~3개가 이상적입니다." },
    ],
    systemPrompt: `당신은 네이버 블로그 SEO 전문가입니다. C-Rank, D.I.A 알고리즘, 네이버 검색 최적화에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 네이버 검색 노출을 위한 구체적인 키워드 배치 전략
- C-Rank 점수를 높이기 위한 전문성/신뢰도 개선 방법
- 네이버 스마트블록 노출 가능성
- 모바일 가독성 최적화 방법
- 이웃/공감 유도 전략`,
  },
  youtube: {
    label: "유튜브 분석", icon: "▶️", color: "#ef4444",
    placeholder: "https://youtube.com/watch?v=...",
    criteria: [
      { key:"title", label:"제목 최적화", icon:"📌", weight:20, guide:"클릭률(CTR)을 높이는 제목: 호기심 유발 + 핵심 키워드 포함. 50자 이내가 이상적입니다." },
      { key:"thumbnail", label:"썸네일 분석", icon:"🖼", weight:20, guide:"대비가 강한 색상, 큰 텍스트(3~5단어), 얼굴 표정, 깔끔한 구도가 CTR을 높입니다." },
      { key:"description", label:"설명란 최적화", icon:"📝", weight:15, guide:"첫 2줄에 핵심 내용 요약, 타임스탬프, 관련 링크, 해시태그 포함이 필수입니다." },
      { key:"tags", label:"태그/해시태그", icon:"🏷", weight:15, guide:"메인 키워드 + 연관 키워드 + 브랜드명으로 15~30개 태그를 설정해야 합니다." },
      { key:"engagement", label:"시청자 참여 유도", icon:"💬", weight:15, guide:"댓글 유도 질문, 좋아요/구독 CTA, 다음 영상 예고가 알고리즘에 유리합니다." },
      { key:"structure", label:"영상 구조", icon:"🎬", weight:15, guide:"처음 30초 훅(Hook), 중간 하이라이트, 엔딩 CTA. 8~15분이 광고 수익에 최적입니다." },
    ],
    systemPrompt: `당신은 유튜브 SEO 및 성장 전문가입니다. 유튜브 알고리즘, CTR 최적화, 시청 지속시간에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 유튜브 검색/추천 알고리즘에 맞는 제목 전략
- 썸네일 CTR을 높이는 구체적 디자인 가이드
- 시청 지속시간을 늘리는 영상 구조 제안
- 유튜브 SEO 태그 전략
- 구독자 전환율을 높이는 CTA 배치`,
  },
  tistory: {
    label: "티스토리 분석", icon: "📖", color: "#f59e0b",
    placeholder: "https://xxx.tistory.com/123",
    criteria: [
      { key:"title", label:"제목 최적화", icon:"📌", weight:20, guide:"구글 검색 노출을 위해 핵심 키워드가 제목 앞에 위치해야 합니다. 30~50자가 이상적입니다." },
      { key:"content", label:"본문 품질", icon:"📝", weight:25, guide:"2,000자 이상, H2/H3 소제목 활용, 핵심 키워드 밀도 1~2%가 구글 SEO에 최적입니다." },
      { key:"meta", label:"메타 태그/OG", icon:"🔍", weight:15, guide:"meta description 150자, OG 이미지 설정, canonical URL 설정이 필수입니다." },
      { key:"media", label:"멀티미디어 활용", icon:"🖼", weight:15, guide:"이미지 alt 태그, 캡션 활용, 표/목록 구조화가 구글 검색에 유리합니다." },
      { key:"internal", label:"내부/외부 링크", icon:"🔗", weight:15, guide:"관련 글 내부 링크 3~5개, 권위 있는 외부 링크 1~2개가 SEO에 도움됩니다." },
      { key:"adsense", label:"애드센스 최적화", icon:"💰", weight:10, guide:"광고 배치 위치, 콘텐츠 대비 광고 비율, 사용자 경험 저해 여부를 확인합니다." },
    ],
    systemPrompt: `당신은 티스토리 블로그 및 구글 SEO 전문가입니다. 구글 검색 알고리즘, 애드센스 최적화에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 구글 검색 1페이지 노출을 위한 키워드 전략
- 티스토리 스킨/플러그인 SEO 설정 가이드
- 구글 서치콘솔 최적화 방법
- 애드센스 수익 최적화 팁
- 구글 E-E-A-T 기준 충족 방법`,
  },
  insta: {
    label: "인스타그램 분석", icon: "📸", color: "#e1306c",
    placeholder: "https://www.instagram.com/p/... 또는 @계정명",
    criteria: [
      { key:"visual", label:"비주얼 퀄리티", icon:"🖼", weight:25, guide:"고해상도, 일관된 색감 톤, 브랜드 아이덴티티. 피드 전체의 통일성이 중요합니다." },
      { key:"caption", label:"캡션 최적화", icon:"📝", weight:20, guide:"첫 줄 훅(Hook), 스토리텔링, CTA 포함. 2,200자 이내, 줄바꿈으로 가독성 확보." },
      { key:"hashtag", label:"해시태그 전략", icon:"#️⃣", weight:20, guide:"대형(100만+) 3개 + 중형(1만~100만) 10개 + 소형(1만 이하) 10개 조합. 총 20~25개." },
      { key:"engagement", label:"참여 유도", icon:"💬", weight:15, guide:"질문형 CTA, 저장 유도, DM 유도. 댓글 답변 속도가 알고리즘에 영향." },
      { key:"timing", label:"게시 전략", icon:"⏰", weight:10, guide:"타겟 오디언스 활동 시간대, 일관된 게시 빈도(주 3~5회), 릴스 활용." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:10, guide:"키워드 포함 바이오, 링크트리/링크 활용, 하이라이트 구성." },
    ],
    systemPrompt: `당신은 인스타그램 마케팅 및 성장 전문가입니다. 인스타그램 알고리즘, 릴스 전략, 해시태그 최적화에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 인스타그램 탐색 탭 노출을 위한 전략
- 릴스 vs 피드 포스트 최적 비율
- 해시태그 리서치 및 최적 조합 방법
- 팔로워 증가를 위한 참여율 개선 전략
- 인스타그램 쇼핑/비즈니스 기능 활용법`,
  },
  website: {
    label: "홈페이지 분석", icon: "🌐", color: "#3b82f6",
    placeholder: "https://example.com",
    criteria: [
      { key:"seo", label:"SEO 기본 설정", icon:"🔍", weight:20, guide:"title 태그, meta description, H1~H3 구조, canonical URL, sitemap.xml이 필수입니다." },
      { key:"speed", label:"페이지 속도", icon:"⚡", weight:20, guide:"Core Web Vitals(LCP, FID, CLS) 최적화. 이미지 압축, 코드 최소화, CDN 활용이 중요합니다." },
      { key:"mobile", label:"모바일 최적화", icon:"📱", weight:15, guide:"반응형 디자인, 터치 친화적 버튼(48px+), 뷰포트 메타태그 설정이 필수입니다." },
      { key:"content", label:"콘텐츠 품질", icon:"📝", weight:20, guide:"E-E-A-T 기준 충족, 독창적 콘텐츠, 적절한 키워드 밀도(1~2%), 내부 링크 구조가 중요합니다." },
      { key:"ux", label:"사용자 경험(UX)", icon:"🎨", weight:15, guide:"명확한 CTA, 직관적 네비게이션, 3초 이내 로딩, 접근성(a11y) 준수가 핵심입니다." },
      { key:"technical", label:"기술 SEO", icon:"⚙️", weight:10, guide:"구조화 데이터(Schema.org), robots.txt, HTTPS, 404 처리, 리다이렉트 관리가 필요합니다." },
    ],
    systemPrompt: `당신은 웹사이트 SEO 및 UX 전문가입니다. 구글 검색 알고리즘, Core Web Vitals, 기술 SEO에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 구글 검색 1페이지 노출을 위한 온페이지 SEO 전략
- Core Web Vitals 개선 방법 (LCP, FID, CLS)
- 모바일 퍼스트 인덱싱 대응
- 구조화 데이터(Schema) 적용 가이드
- 경쟁 사이트 대비 차별화 전략`,
  },
  twitter: {
    label: "X(트위터) 분석", icon: "𝕏", color: "#000000",
    placeholder: "https://x.com/username/status/... 또는 @계정명",
    criteria: [
      { key:"content", label:"콘텐츠 전략", icon:"📝", weight:25, guide:"280자 제한 내 임팩트 있는 메시지, 첫 줄 훅(Hook)이 핵심. 스레드 활용으로 심층 콘텐츠 전달." },
      { key:"engagement", label:"참여율 최적화", icon:"💬", weight:20, guide:"리플/리트윗/좋아요 유도. 질문형 트윗, 투표(Poll), 인용 리트윗이 알고리즘에 유리합니다." },
      { key:"hashtag", label:"해시태그/키워드", icon:"#️⃣", weight:15, guide:"1~3개 관련 해시태그. 트렌딩 해시태그 활용, 키워드를 본문에 자연스럽게 포함." },
      { key:"media", label:"미디어 활용", icon:"🖼", weight:15, guide:"이미지/GIF 포함 트윗은 참여율 150% 증가. 영상은 2분 15초 이내가 최적입니다." },
      { key:"timing", label:"게시 타이밍", icon:"⏰", weight:10, guide:"타겟 오디언스 활동 시간대, 하루 3~5회 게시, 피크 시간(오전 9~11시, 오후 1~3시)." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:15, guide:"키워드 포함 바이오, 고정 트윗 활용, 프로필/헤더 이미지 브랜딩 일관성." },
    ],
    systemPrompt: `당신은 X(구 트위터) 마케팅 및 성장 전문가입니다. X 알고리즘, 바이럴 전략, 스레드 최적화에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- X 알고리즘이 선호하는 콘텐츠 유형과 구조
- 팔로워 증가를 위한 참여율 개선 전략
- 스레드(Thread) 작성 최적화 방법
- X Premium(유료) 기능 활용 전략
- 바이럴을 위한 콘텐츠 타이밍과 주제 선정`,
  },
  threads: {
    label: "스레드 분석", icon: "🧵", color: "#000000",
    placeholder: "https://www.threads.net/@username/post/... 또는 @계정명",
    criteria: [
      { key:"content", label:"콘텐츠 전략", icon:"📝", weight:25, guide:"500자 제한 내 임팩트 있는 메시지. 대화형 콘텐츠, 의견 제시, 스토리텔링이 핵심." },
      { key:"engagement", label:"참여율 최적화", icon:"💬", weight:25, guide:"댓글 유도 질문, 의견 대립 주제, 공감형 콘텐츠가 알고리즘에 유리합니다." },
      { key:"visual", label:"미디어 활용", icon:"🖼", weight:15, guide:"캐러셀 이미지, 짧은 영상 활용. 텍스트 전용 포스트도 강력하지만 비주얼 혼합이 효과적." },
      { key:"hashtag", label:"주제 태그", icon:"#️⃣", weight:10, guide:"관련 주제 태그 1~3개 활용. 과도한 태그 사용은 역효과." },
      { key:"consistency", label:"게시 일관성", icon:"📅", weight:15, guide:"주 3~5회 일정한 게시 빈도. 인스타그램 연동으로 크로스 플랫폼 시너지." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:10, guide:"간결한 바이오, 인스타그램 연동, 일관된 브랜드 아이덴티티." },
    ],
    systemPrompt: `당신은 Meta Threads 마케팅 전문가입니다. Threads 알고리즘, 텍스트 기반 SNS 전략에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- Threads 알고리즘이 선호하는 콘텐츠 유형
- 인스타그램 연동을 통한 크로스 플랫폼 전략
- 텍스트 기반 바이럴 콘텐츠 작성법
- 커뮤니티 참여를 높이는 대화형 콘텐츠 전략
- 경쟁 계정 대비 차별화 방법`,
  },
  cafe: {
    label: "네이버 카페 분석", icon: "☕", color: "#2DB400",
    placeholder: "https://cafe.naver.com/...",
    criteria: [
      { key:"title", label:"제목 최적화", icon:"📌", weight:20, guide:"네이버 검색에 노출되는 제목. 핵심 키워드를 앞에 배치하고 20~30자가 이상적입니다." },
      { key:"content", label:"본문 품질", icon:"📝", weight:25, guide:"1,000자 이상, 소제목 활용, 이미지 3장 이상. 카페 특성에 맞는 정보성/후기 콘텐츠가 유리합니다." },
      { key:"keyword", label:"키워드 전략", icon:"🔑", weight:15, guide:"카페 내 인기 키워드 + 네이버 검색 키워드 조합. 태그 기능 적극 활용." },
      { key:"engagement", label:"댓글/공감 유도", icon:"💬", weight:20, guide:"질문형 마무리, 정보 공유 유도, 댓글 답변 신속 대응이 등업과 노출에 유리합니다." },
      { key:"compliance", label:"카페 규정 준수", icon:"📋", weight:10, guide:"게시판 규정, 홍보 제한, 글 형식 규정 준수. 위반 시 삭제/차단 위험." },
      { key:"seo", label:"네이버 SEO", icon:"🔍", weight:10, guide:"네이버 검색 노출을 위한 키워드 배치, 이미지 alt 태그, 링크 활용." },
    ],
    systemPrompt: `당신은 네이버 카페 운영 및 마케팅 전문가입니다. 네이버 카페 알고리즘, 커뮤니티 마케팅에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 네이버 검색 노출을 위한 카페 글 최적화 전략
- 카페 등업/활동 점수를 높이는 방법
- 커뮤니티 특성에 맞는 콘텐츠 작성법
- 카페 규정을 준수하면서 홍보 효과를 높이는 방법
- 카페 멤버 참여를 유도하는 커뮤니티 전략`,
  },
  facebook: {
    label: "페이스북 분석", icon: "📘", color: "#1877f2",
    placeholder: "https://www.facebook.com/... (게시물 또는 페이지 URL)",
    criteria: [
      { key:"content", label:"콘텐츠 전략", icon:"📝", weight:25, guide:"3줄 이내 훅(Hook) + 스토리텔링 본문. '더보기' 클릭을 유도하는 첫 문장이 핵심." },
      { key:"engagement", label:"참여율 최적화", icon:"💬", weight:20, guide:"의미 있는 댓글(Meaningful Interaction)이 알고리즘 핵심. 긴 댓글 유도 질문이 효과적." },
      { key:"media", label:"미디어 활용", icon:"🖼", weight:20, guide:"Reels 최우선, 다음 이미지/캐러셀. 네이티브 영상이 외부 링크보다 도달률 5배 높음." },
      { key:"targeting", label:"타겟 전략", icon:"🎯", weight:15, guide:"그룹 활용, 페이지 인사이트 기반 타겟팅. 부스트 광고 시 관심사/유사 타겟 설정." },
      { key:"timing", label:"게시 타이밍", icon:"⏰", weight:10, guide:"오전 9시~오후 1시, 수/목요일이 최적. 인사이트에서 팔로워 활동 시간 확인." },
      { key:"profile", label:"페이지 최적화", icon:"👤", weight:10, guide:"카테고리 설정, CTA 버튼, About 섹션 키워드, 프로필/커버 이미지 브랜딩." },
    ],
    systemPrompt: `당신은 페이스북 마케팅 및 광고 전문가입니다. 페이스북/메타 알고리즘, 페이지 운영, 광고 최적화에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 페이스북 알고리즘(Meaningful Interaction)에 맞는 콘텐츠 전략
- Reels/영상 콘텐츠 최적화 방법
- 페이지 도달률을 높이는 게시 전략
- 페이스북 그룹 활용 커뮤니티 전략
- 광고 부스트 시 ROI를 높이는 타겟팅 가이드`,
  },
  linkedin: {
    label: "링크드인 분석", icon: "💼", color: "#0a66c2",
    placeholder: "https://www.linkedin.com/posts/... 또는 프로필 URL",
    criteria: [
      { key:"content", label:"콘텐츠 전략", icon:"📝", weight:25, guide:"전문성 어필 + 스토리텔링. 첫 3줄 훅, 줄바꿈 활용. 1,300자 이내가 최적." },
      { key:"engagement", label:"참여율 최적화", icon:"💬", weight:20, guide:"댓글 유도 질문, 업계 인사이트 공유. 첫 1시간 내 댓글이 알고리즘에 핵심." },
      { key:"hashtag", label:"해시태그/키워드", icon:"#️⃣", weight:10, guide:"3~5개 업계 관련 해시태그. 너무 많으면 스팸 처리. 니치 해시태그가 효과적." },
      { key:"media", label:"미디어 활용", icon:"🖼", weight:15, guide:"캐러셀 문서(PDF), 인포그래픽, 네이티브 영상이 높은 참여율. 외부 링크는 도달률 하락." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:20, guide:"헤드라인에 키워드, 배너 이미지, About 섹션 SEO, 추천(Recommendation) 확보." },
      { key:"networking", label:"네트워킹 전략", icon:"🤝", weight:10, guide:"업계 인플루언서 댓글 참여, 1촌 확장, 게시물 초반 자체 댓글로 알고리즘 부스트." },
    ],
    systemPrompt: `당신은 링크드인 마케팅 및 퍼스널 브랜딩 전문가입니다. 링크드인 알고리즘, B2B 마케팅, 채용 브랜딩에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 링크드인 알고리즘이 선호하는 콘텐츠 유형과 구조
- 프로필 SEO 최적화 (검색 노출)
- 퍼스널 브랜딩을 위한 콘텐츠 전략
- B2B 리드 생성을 위한 링크드인 활용법
- 네트워킹을 통한 영향력 확대 전략`,
  },
  tiktok: {
    label: "틱톡 분석", icon: "🎵", color: "#010101",
    placeholder: "https://www.tiktok.com/@username/video/... 또는 @계정명",
    criteria: [
      { key:"hook", label:"첫 3초 훅(Hook)", icon:"⚡", weight:25, guide:"시청자의 스크롤을 멈추는 첫 3초가 가장 중요. 질문/충격/호기심 유발." },
      { key:"content", label:"콘텐츠 구조", icon:"📝", weight:20, guide:"15~60초가 최적. 시작-전개-반전 구조. 루프(Loop) 가능한 영상이 알고리즘에 유리." },
      { key:"audio", label:"사운드/음악", icon:"🎵", weight:15, guide:"트렌딩 사운드 활용 시 도달률 증가. 오리지널 오디오도 바이럴 가능." },
      { key:"hashtag", label:"해시태그 전략", icon:"#️⃣", weight:15, guide:"3~5개 관련 해시태그. #fyp #foryou 보다 니치 해시태그가 타겟팅에 효과적." },
      { key:"engagement", label:"참여 유도", icon:"💬", weight:15, guide:"댓글 유도, 듀엣/스티치 활용, CTA로 팔로우/좋아요 유도. 댓글 답변 필수." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:10, guide:"1줄 바이오, 링크 활용, 프로필 사진, 고정 영상 3개로 첫인상 최적화." },
    ],
    systemPrompt: `당신은 틱톡 마케팅 및 숏폼 콘텐츠 전문가입니다. 틱톡 알고리즘, For You Page(FYP), 바이럴 전략에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 틱톡 알고리즘(FYP)에 최적화된 콘텐츠 전략
- 첫 3초 훅(Hook)으로 시청 지속시간 높이는 방법
- 트렌딩 사운드/챌린지 활용 전략
- 숏폼 콘텐츠 구조 최적화 (루프, 스토리텔링)
- 크리에이터 수익화(Creator Fund, 라이브) 전략`,
  },
  pinterest: {
    label: "핀터레스트 분석", icon: "📌", color: "#e60023",
    placeholder: "https://www.pinterest.com/pin/... 또는 프로필 URL",
    criteria: [
      { key:"visual", label:"비주얼 품질", icon:"🖼", weight:25, guide:"세로 2:3 비율(1000x1500px), 고화질 이미지, 텍스트 오버레이, 브랜드 색상 일관성." },
      { key:"seo", label:"핀 SEO", icon:"🔍", weight:25, guide:"제목에 키워드 포함(40~100자), 설명에 키워드 자연 배치(500자), 보드명 키워드 최적화." },
      { key:"content", label:"콘텐츠 전략", icon:"📝", weight:20, guide:"튜토리얼, 리스트, 인포그래픽이 저장률 높음. 시즌/트렌드 콘텐츠 3개월 선행 게시." },
      { key:"board", label:"보드 구성", icon:"📂", weight:10, guide:"8~12개 주제별 보드, 키워드 포함 보드명, 보드 설명 작성, 보드 커버 이미지 설정." },
      { key:"consistency", label:"게시 일관성", icon:"📅", weight:10, guide:"하루 5~15핀 게시, 일정한 시간대, Rich Pin 활용으로 클릭률 향상." },
      { key:"profile", label:"프로필 최적화", icon:"👤", weight:10, guide:"비즈니스 계정 전환, 키워드 포함 바이오, 웹사이트 인증, 프로필 이미지 브랜딩." },
    ],
    systemPrompt: `당신은 핀터레스트 마케팅 및 비주얼 검색 SEO 전문가입니다. 핀터레스트 알고리즘, Rich Pin, 쇼핑 기능에 정통합니다.
분석 시 다음을 반드시 포함하세요:
- 핀터레스트 검색 알고리즘에 맞는 키워드 전략
- 높은 저장률/클릭률을 위한 핀 디자인 가이드
- 보드 구성 및 SEO 최적화 방법
- 핀터레스트 광고(프로모션 핀) 활용 전략
- 이커머스/블로그 트래픽 유도 방법`,
  },
};

export default function SeoAnalyzer({ isDark, menu, user, onSave, onAnalyzingChange }) {
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";

  const [trendCat, setTrendCat] = useState("전체");
  const trendInitCache = () => {
    try { const r = JSON.parse(localStorage.getItem("az_trend_전체")); if (r && Date.now() - r.ts < 30*60*1000) return r.data; } catch {} return [];
  };
  const [trends, setTrends] = useState(trendInitCache);
  const [trendLoading, setTrendLoading] = useState(false);
  const trendAutoFetched = useRef(false);

  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [expandedCriteria, setExpandedCriteria] = useState(null);
  const [fetchedPreview, setFetchedPreview] = useState(null);
  const [prevMenu, setPrevMenu] = useState(menu);

  if (menu !== prevMenu) {
    setPrevMenu(menu);
    setResult(null);
    setUrl("");
    setAnalyzing(false);
    setProgress("");
    setExpandedCriteria(null);
    setFetchedPreview(null);
  }

  const [trendEngine, setTrendEngine] = useState("전체");

  // 실시간 검색어 — 캐시 적용 (30분 TTL)
  const TREND_TTL = 30 * 60 * 1000;
  const getTrendCache = (key) => {
    try { const r = JSON.parse(localStorage.getItem("az_trend_" + key)); if (r && Date.now() - r.ts < TREND_TTL) return r.data; } catch {} return null;
  };
  const setTrendCache = (key, data) => {
    try { localStorage.setItem("az_trend_" + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  const fetchTrends = async (cat) => {
    const cacheKey = cat;
    const cached = getTrendCache(cacheKey);
    if (cached) { setTrends(cached); return; }
    setTrendLoading(true); setTrends([]);
    try {
      const prompt = `현재 한국에서 ${cat==="전체"?"모든 분야":cat+" 분야"}의 실시간 인기 검색어를 검색엔진별로 알려주세요.

네이버, 구글, 다음, 빙 각각 TOP 10씩 총 40개를 알려주세요.
각 검색어에 대해 검색엔진, 순위, 카테고리, 간단한 이유, 검색량 추정치, 변동(up/down/new/stable)을 포함해주세요.

JSON만: {"trends":[{"rank":1,"keyword":"검색어","engine":"네이버","category":"분류","reason":"이유","volume":"약 50,000","change":"new"},...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 3000);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]).trends || [];
        setTrends(data);
        setTrendCache(cacheKey, data);
      }
    } catch {}
    setTrendLoading(false);
  };

  // 실시간 검색어 진입 시 캐시 없으면 자동 fetch
  useEffect(() => {
    if (menu === "seo_home" && !trendAutoFetched.current && trends.length === 0 && !trendLoading) {
      trendAutoFetched.current = true;
      fetchTrends("전체");
    }
  }, [menu]);

  // URL 콘텐츠 가져오기
  const fetchUrlContent = async (targetUrl) => {
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const { html } = await res.json();
      if (!html || html.length < 100) return null;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const title = doc.querySelector("title")?.textContent?.trim() || "";
      const metaDesc = doc.querySelector('meta[name="description"]')?.content || doc.querySelector('meta[property="og:description"]')?.content || "";
      const ogImage = doc.querySelector('meta[property="og:image"]')?.content || "";
      const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,.se-text-paragraph-align")).map(h => h.textContent?.trim()).filter(Boolean).join(" | ");
      let body = "";
      const selectors = [".se-main-container",".post_ct",".tt_article_useless_p_margin","article",".entry-content",".post-content","#content",".content","#postViewArea"];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent?.trim().length > 50) { body = el.textContent.replace(/\s+/g," ").trim(); break; }
      }
      if (!body) body = doc.body?.textContent?.replace(/\s+/g," ").trim() || "";
      body = body.slice(0, 4000);
      const imgCount = doc.querySelectorAll("img").length;
      const linkCount = doc.querySelectorAll("a[href]").length;
      const wordCount = body.length;
      if (body.length > 50) return { title, metaDesc, ogImage, headings, body, imgCount, linkCount, wordCount };
    } catch {}
    return null;
  };

  // SEO 분석
  const analyzeUrl = async (type) => {
    if (!url.trim()) return;
    const config = PLATFORM_CONFIG[type];
    if (!config) return;
    setAnalyzing(true); setResult(null); setExpandedCriteria(null);
    if (onAnalyzingChange) onAnalyzingChange(true);

    setProgress("URL 콘텐츠를 가져오는 중...");

    let content = null;
    let ytData = null;
    let instaData = null;
    if (type === "youtube" && url.match(/youtu\.?be/)) {
      try {
        const ytRes = await fetch("/api/fetch-youtube", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }), signal: AbortSignal.timeout(15000),
        });
        if (ytRes.ok) ytData = await ytRes.json();
      } catch {}
    } else if (type === "insta" && url.match(/instagram\.com/)) {
      try {
        const igRes = await fetch("/api/fetch-insta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }), signal: AbortSignal.timeout(15000),
        });
        if (igRes.ok) instaData = await igRes.json();
      } catch {}
    } else {
      content = await fetchUrlContent(url);
    }

    if (instaData && instaData.hasData) {
      setFetchedPreview({
        type:"insta", title: instaData.title?.slice(0,80), desc: instaData.description?.slice(0,200),
        thumb: instaData.thumbnail, channel: instaData.author,
        tags: instaData.hashtags || [],
      });
    } else if (ytData) {
      setFetchedPreview({
        type:"youtube", title: ytData.title, desc: ytData.description?.slice(0,200),
        thumb: ytData.thumbnail, channel: ytData.channelName,
        views: ytData.viewCount ? Number(ytData.viewCount).toLocaleString()+"회" : "",
        tags: ytData.tags || [], hasTranscript: !!ytData.transcript,
        transcriptPreview: ytData.transcript?.slice(0,300),
      });
    } else if (content) {
      setFetchedPreview({
        type:"page", title: content.title, desc: content.metaDesc || content.body?.slice(0,200),
        thumb: content.ogImage, imgCount: content.imgCount, wordCount: content.wordCount,
        headings: content.headings,
      });
    } else {
      setFetchedPreview({ type:"none", title: url });
    }

    setProgress("AI가 콘텐츠를 분석하고 있어요...");
    try {
      let contentInfo;
      if (instaData && instaData.hasData) {
        contentInfo = `\n\n[인스타그램 게시물 실제 데이터]
작성자: ${instaData.author || "확인 불가"}
캡션: ${instaData.description || instaData.title || "없음"}
썸네일: ${instaData.thumbnail || "없음"}
해시태그: ${(instaData.hashtags||[]).map(t=>"#"+t).join(" ") || "없음"}

위 데이터를 기반으로 인스타그램 알고리즘 관점에서 상세히 분석해주세요.
캡션의 훅(첫줄), 스토리텔링, CTA, 해시태그 전략, 비주얼 구성을 모두 평가해주세요.`;
      } else if (ytData) {
        contentInfo = `\n\n[유튜브 영상 실제 데이터 — 이 데이터를 기반으로 정확하게 분석하세요]
영상 제목: ${ytData.title}
채널명: ${ytData.channelName}
조회수: ${ytData.viewCount ? Number(ytData.viewCount).toLocaleString()+"회" : "확인 불가"}
썸네일: ${ytData.thumbnail}
태그: ${(ytData.tags||[]).join(", ") || "없음"}

[설명란 전체]
${ytData.description || "없음"}

[영상 자막/스크립트]
${ytData.transcript || "(자막을 가져올 수 없습니다. 설명란과 제목 기반으로 분석하세요)"}`;
      } else if (content) {
        contentInfo = `\n\n[실제 페이지 데이터 — 이 내용을 기반으로 분석하세요]
페이지 제목: ${content.title}
메타 설명: ${content.metaDesc}
OG 이미지: ${content.ogImage || "없음"}
소제목(H태그): ${content.headings || "없음"}
이미지 수: ${content.imgCount}개
내부/외부 링크 수: ${content.linkCount}개
본문 글자 수: 약 ${content.wordCount}자

[본문 전체 내용]
${content.body.slice(0,3000)}`;
      } else {
        contentInfo = `\n\n[주의] 페이지 콘텐츠를 직접 가져올 수 없습니다.
URL: ${url}
URL에서 유추할 수 있는 정보만으로 분석해주세요. "콘텐츠를 확인할 수 없다"는 식으로 모호하게 답하지 말고, URL 구조와 플랫폼 특성을 기반으로 최선의 분석을 해주세요.`;
      }

      const criteriaList = config.criteria.map((c,i) => `${i+1}. ${c.label} (${c.weight}점 배점)`).join("\n");

      const prompt = `${config.systemPrompt}

다음 URL을 분석해주세요: ${url}
${contentInfo}

## 분석 항목 (총 100점)
${criteriaList}

## 응답 형식 (JSON)
각 항목별로 반드시 다음을 포함해주세요:
- score: 점수 (0~항목 배점)
- grade: 등급 (A+/A/B+/B/C/D)
- summary: 현재 상태 요약 (1~2줄)
- good: 잘하고 있는 점 (배열, 2~3개)
- bad: 개선이 필요한 점 (배열, 2~3개)
- howToFix: 구체적 수정 가이드 (배열, 각 항목은 "무엇을 → 어떻게" 형식, 3~5개)
- example: 수정 예시 (개선된 제목, 태그, 구조 등 실제 적용 가능한 예시)

또한 다음도 포함:
- totalScore: 종합 점수
- totalGrade: 종합 등급
- overallSummary: 전체 분석 요약 (3~4줄)
- topPriority: 가장 먼저 수정해야 할 것 (1가지, 구체적으로)
- recommendedTitles: 추천 제목 5개 (SEO 최적화된)
- recommendedKeywords: 추천 키워드 10개
- competitorTip: 경쟁 콘텐츠 대비 차별화 전략 1가지

JSON만 응답:
{"criteria":{${config.criteria.map(c => `"${c.key}":{"score":0,"grade":"","summary":"","good":[],"bad":[],"howToFix":[],"example":""}`).join(",")}},
"totalScore":0,"totalGrade":"","overallSummary":"","topPriority":"",
"recommendedTitles":[],"recommendedKeywords":[],"competitorTip":""}`;

      const raw = await callAI("claude-sonnet-4-5", [{role:"user",content:prompt}], 6000);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({ ...parsed, config });
        // 보관함에 저장 (전체 결과 포함)
        if (onSave) onSave({
          type: type, url, platform: config.label, score: parsed.totalScore || 0,
          result: parsed,
          resultConfig: { criteria: config.criteria },
        });
      }
    } catch(e) { alert("분석 실패: " + e.message); }
    setAnalyzing(false); setProgress("");
    if (onAnalyzingChange) onAnalyzingChange(false);
  };

  const scoreColor = (s, max=100) => {
    const pct = (s/max)*100;
    return pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  };

  const changeIcon = (c) => c==="up"?"🔺":c==="down"?"🔻":c==="new"?"🆕":"—";
  const changeColor = (c) => c==="up"?"#ef4444":c==="down"?"#3b82f6":c==="new"?"#22c55e":muted;

  // ═══ 실시간 검색어 화면 (판다랭크 스타일) ═══
  if (menu === "seo_home") {
    const filtered = trends.filter(t => trendEngine==="전체" || t.engine===trendEngine);
    const now = new Date();
    const timeStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}시 기준`;

    return (
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          {/* 헤더 */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:24, fontWeight:900, color:text, marginBottom:6 }}>
              오늘 콘텐츠, 어떤 키워드로 시작할까요?
            </div>
            <div style={{ fontSize:13, color:muted }}>실시간 인기 검색어를 분석하고 콘텐츠도 제작해 보세요</div>
          </div>

          {/* 검색 바 */}
          <div style={{
            display:"flex", alignItems:"center", gap:8, maxWidth:600, margin:"0 auto 28px",
            background:cardBg, borderRadius:12, border:`1px solid ${bdr}`, padding:"5px 5px 5px 16px",
            boxShadow:D?"0 2px 12px rgba(0,0,0,0.3)":"0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <input placeholder="분석할 키워드를 입력하세요"
              style={{ flex:1, border:"none", background:"transparent", color:text, fontSize:14, outline:"none", padding:"8px 0" }} />
            <button style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"#22c55e", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
              🔍 분석
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20, justifyContent:"center" }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={()=>{setTrendCat(c);fetchTrends(c);}}
                style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${trendCat===c?"#22c55e":bdr}`,
                  background:trendCat===c?"rgba(34,197,94,0.12)":"transparent",
                  color:trendCat===c?"#22c55e":muted, fontSize:12, fontWeight:trendCat===c?700:400, cursor:"pointer" }}>
                {c}
              </button>
            ))}
          </div>

          {/* 실시간 인기 검색어 영역 */}
          <div style={{ padding:"24px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:900, color:text }}>실시간 인기 검색어</div>
              <div style={{ fontSize:11, color:muted }}>{timeStr}</div>
            </div>

            {/* 엔진 탭 (판다랭크 스타일 밑줄 탭) */}
            <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${bdr}`, marginBottom:16 }}>
              {["전체","네이버","구글","다음","빙"].map(eng => {
                const active = trendEngine===eng;
                const engColor = eng==="네이버"?"#22c55e":eng==="구글"?"#4285f4":eng==="다음"?"#f59e0b":eng==="빙"?"#0078d4":"#6366f1";
                return (
                  <button key={eng} onClick={()=>setTrendEngine(eng)}
                    style={{ padding:"10px 20px", border:"none", cursor:"pointer", fontSize:13, fontWeight:active?700:400,
                      background:"transparent", borderBottom:active?`2px solid ${engColor}`:"2px solid transparent",
                      color:active?engColor:muted, marginBottom:-1 }}>
                    {eng}
                  </button>
                );
              })}
            </div>

            {trendLoading ? (
              <div style={{ textAlign:"center", padding:"60px 0" }}>
                <div style={{ width:32,height:32,border:"3px solid #22c55e",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px" }}/>
                <div style={{ fontSize:14, color:muted }}>AI가 실시간 트렌드를 분석하고 있어요...</div>
              </div>
            ) : filtered.length > 0 ? (
              /* 2열 레이아웃 (판다랭크 스타일) */
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0" }}>
                {filtered.slice(0,20).map((t, i) => (
                  <div key={i}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
                      borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f3f4f6"}`,
                      cursor:"pointer", transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background=D?"rgba(255,255,255,0.03)":"#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    onClick={()=>{
                      const searchUrl = t.engine==="구글"?`https://www.google.com/search?q=${encodeURIComponent(t.keyword)}`
                        :t.engine==="다음"?`https://search.daum.net/search?q=${encodeURIComponent(t.keyword)}`
                        :t.engine==="빙"?`https://www.bing.com/search?q=${encodeURIComponent(t.keyword)}`
                        :`https://search.naver.com/search.naver?query=${encodeURIComponent(t.keyword)}`;
                      window.open(searchUrl,"_blank");
                    }}>
                    {/* 순위 */}
                    <span style={{ fontSize:14, fontWeight:900, color:i<3?"#ef4444":i<6?"#f59e0b":text, minWidth:24, textAlign:"center" }}>
                      {t.rank||i+1}
                    </span>
                    {/* 변동 */}
                    <span style={{ fontSize:10, color:changeColor(t.change), minWidth:20, textAlign:"center", fontWeight:700 }}>
                      {t.change==="new"?"N":t.change==="up"?"▲":t.change==="down"?"▼":"—"}
                    </span>
                    {/* 키워드 */}
                    <span style={{ flex:1, fontSize:14, fontWeight:i<3?700:500, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {t.keyword}
                    </span>
                    {/* 엔진 뱃지 (전체 탭일 때만) */}
                    {trendEngine==="전체" && (
                      <span style={{ fontSize:9, padding:"2px 6px", borderRadius:4, fontWeight:600, flexShrink:0,
                        background:t.engine==="네이버"?"rgba(34,197,94,0.1)":t.engine==="구글"?"rgba(66,133,244,0.1)":t.engine==="빙"?"rgba(0,120,212,0.1)":"rgba(245,158,11,0.1)",
                        color:t.engine==="네이버"?"#22c55e":t.engine==="구글"?"#4285f4":t.engine==="빙"?"#0078d4":"#f59e0b" }}>
                        {t.engine}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"50px 0", color:muted }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
                <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>카테고리를 선택하면 트렌드를 분석해요</div>
                <div style={{ fontSize:13 }}>인기 검색어를 분석하고 콘텐츠도 제작해 보세요</div>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ═══ SNS 분석기 화면 (판다랭크 블로그분석 스타일) ═══
  const analyzerType = menu.replace("seo_","");
  const config = PLATFORM_CONFIG[analyzerType];
  if (!config) return null;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        {/* 헤더 — 블로그 진단 / 게시글 진단 스타일 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:6 }}>
            <span style={{ fontSize:22, fontWeight:900, color:config.color }}>{config.label.split(" ")[0]}</span>
            <span style={{ fontSize:18, fontWeight:600, color:muted }}>게시글 진단</span>
          </div>
        </div>

        {/* URL 입력 (판다랭크 스타일: 넓은 검색바) */}
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"6px 6px 6px 20px", borderRadius:14,
          border:`1px solid ${bdr}`, background:cardBg,
          boxShadow:D?"0 2px 12px rgba(0,0,0,0.2)":"0 2px 12px rgba(0,0,0,0.03)",
          marginBottom:10,
        }}>
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyzeUrl(analyzerType)}
            placeholder={config.placeholder}
            style={{ flex:1, border:"none", background:"transparent", color:text, fontSize:14, outline:"none", padding:"10px 0" }}/>
          <button onClick={()=>analyzeUrl(analyzerType)} disabled={analyzing || !url.trim()}
            style={{ padding:"12px 24px", borderRadius:10, border:"none", background:config.color, color:"#fff", fontSize:14, fontWeight:700,
              cursor:analyzing?"wait":"pointer", opacity:analyzing?0.6:1, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
            🔍 {analyzing ? "분석중..." : "분석"}
          </button>
        </div>

        {/* 일 분석 횟수 안내 */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
          <span style={{ fontSize:11, color:muted }}>오늘 <b style={{color:config.color}}>무제한</b> 분석 가능</span>
        </div>

        {/* 분석 기준 안내 (분석 전) */}
        {!result && !analyzing && (
          <div style={{ padding:"24px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:16 }}>📋 {config.criteria.length}가지 항목을 AI가 분석합니다</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {config.criteria.map(c => (
                <div key={c.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, border:`1px solid ${bdr}`,
                  background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:config.color+"12", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {c.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:text }}>{c.label}</div>
                    <div style={{ fontSize:11, color:muted }}>{c.weight}점 배점</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 판다랭크 스타일 안내 배너 */}
            <div style={{ marginTop:20, padding:"16px 20px", borderRadius:12, background:D?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.03)", border:"1px solid rgba(34,197,94,0.15)", display:"flex", gap:12, alignItems:"center" }}>
              <span style={{ fontSize:28 }}>{config.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:2 }}>URL을 입력하면 AI가 실시간으로 콘텐츠를 분석합니다</div>
                <div style={{ fontSize:11, color:muted }}>제목, 키워드, 본문 구조, 이미지 활용까지 종합 진단 후 구체적인 수정 가이드를 제공합니다</div>
              </div>
            </div>
          </div>
        )}

        {/* 콘텐츠 미리보기 */}
        {fetchedPreview && fetchedPreview.type !== "none" && (
          <div style={{ padding:"18px 20px", borderRadius:14, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16, display:"flex", gap:14, alignItems:"flex-start" }}>
            {fetchedPreview.thumb && (
              <img src={fetchedPreview.thumb} alt="" style={{ width:120, height:68, borderRadius:8, objectFit:"cover", flexShrink:0 }} onError={e=>e.target.style.display="none"}/>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fetchedPreview.title}</div>
              <div style={{ fontSize:12, color:muted, lineHeight:1.5, marginBottom:6,
                overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                {fetchedPreview.desc}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {fetchedPreview.channel && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:"rgba(239,68,68,0.1)", color:"#ef4444", fontWeight:600 }}>{fetchedPreview.channel}</span>}
                {fetchedPreview.views && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted }}>👁 {fetchedPreview.views}</span>}
                {fetchedPreview.imgCount > 0 && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted }}>🖼 {fetchedPreview.imgCount}장</span>}
                {fetchedPreview.wordCount > 0 && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted }}>📝 {fetchedPreview.wordCount}자</span>}
                {fetchedPreview.hasTranscript && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:5, background:"rgba(34,197,94,0.1)", color:"#22c55e", fontWeight:600 }}>자막 감지됨</span>}
              </div>
              {fetchedPreview.tags?.length > 0 && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                  {fetchedPreview.tags.slice(0,8).map((tag,i) => (
                    <span key={i} style={{ fontSize:9, padding:"1px 6px", borderRadius:4, background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted }}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 분석 중 — 프로그레스 */}
        {analyzing && (
          <div style={{ padding:"40px 24px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg, textAlign:"center" }}>
            <div style={{ width:56,height:56,border:`3px solid ${config.color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 20px" }}/>
            <div style={{ fontSize:18, fontWeight:800, color:text, marginBottom:8 }}>{progress}</div>
            <div style={{ fontSize:13, color:muted, marginBottom:24 }}>{config.criteria.length}가지 항목을 세부 분석합니다</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:320, margin:"0 auto", textAlign:"left" }}>
              {[
                { label:"URL 콘텐츠 수집", done: progress.includes("AI가") },
                { label:"제목/키워드 분석", done: false },
                { label:"본문 구조 분석", done: false },
                { label:"SEO 점수 산출", done: false },
                { label:"개선 가이드 생성", done: false },
              ].map((step,i) => {
                const isDone = step.done;
                const isActive = !isDone && (i === 0 ? !progress.includes("AI가") : progress.includes("AI가"));
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, opacity:isDone||isActive?1:0.3 }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                      background:isDone?"#4ade80":isActive?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.05)",
                      border:isDone?"2px solid #4ade80":isActive?`2px solid ${config.color}`:"2px solid rgba(255,255,255,0.1)" }}>
                      {isDone ? <span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>
                        : isActive ? <div style={{width:8,height:8,borderRadius:"50%",border:`2px solid ${config.color}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                        : null}
                    </div>
                    <span style={{ fontSize:13, color:isDone?"#4ade80":isActive?text:muted, fontWeight:isActive?700:400 }}>{step.label}</span>
                    {isDone && <span style={{fontSize:10,color:"#4ade80",marginLeft:"auto"}}>완료</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 분석 결과 (판다랭크 블로그 진단 스타일) ═══ */}
        {result && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* 종합 점수 카드 (판다랭크 스타일: 중앙 큰 점수 + 등급 뱃지) */}
            <div style={{ padding:"32px", borderRadius:20, background:cardBg, border:`1px solid ${bdr}`,
              boxShadow:D?"0 4px 24px rgba(0,0,0,0.2)":"0 4px 24px rgba(0,0,0,0.04)" }}>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:config.color, marginBottom:8 }}>
                  {config.icon} {config.label} 결과
                </div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:16, padding:"16px 32px", borderRadius:16,
                  background:`linear-gradient(135deg,${config.color}10,${config.color}05)`, border:`1px solid ${config.color}30` }}>
                  <div>
                    <div style={{ fontSize:64, fontWeight:900, color:scoreColor(result.totalScore), lineHeight:1 }}>{result.totalScore}</div>
                    <div style={{ fontSize:12, color:muted, marginTop:4 }}>/ 100점</div>
                  </div>
                  <div style={{ width:1, height:60, background:bdr }} />
                  <div style={{ textAlign:"left" }}>
                    <div style={{ padding:"4px 16px", borderRadius:20, fontSize:18, fontWeight:900,
                      background:scoreColor(result.totalScore)+"20", color:scoreColor(result.totalScore), display:"inline-block", marginBottom:6 }}>
                      {result.totalGrade}
                    </div>
                    <div style={{ fontSize:12, color:muted }}>
                      {result.totalScore>=80?"상위 10% 수준입니다":result.totalScore>=60?"보통 수준입니다":"개선이 필요합니다"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 항목별 미니 바 차트 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                {config.criteria.map(criterion => {
                  const data = result.criteria?.[criterion.key];
                  if (!data) return null;
                  const pct = Math.round((data.score/criterion.weight)*100);
                  return (
                    <div key={criterion.key} style={{ padding:"12px", borderRadius:10, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:text }}>{criterion.icon} {criterion.label}</span>
                        <span style={{ fontSize:12, fontWeight:800, color:scoreColor(data.score, criterion.weight) }}>{data.score}/{criterion.weight}</span>
                      </div>
                      <div style={{ height:6, borderRadius:3, background:D?"rgba(255,255,255,0.06)":"#e5e7eb", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, background:scoreColor(data.score, criterion.weight), width:`${pct}%`, transition:"width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 종합 요약 */}
              <div style={{ fontSize:13, color:text, lineHeight:1.8, padding:"14px 16px", borderRadius:10, background:D?"rgba(255,255,255,0.02)":"#f9fafb", border:`1px solid ${bdr}` }}>
                {result.overallSummary}
              </div>
            </div>

            {/* 최우선 수정사항 */}
            {result.topPriority && (
              <div style={{ padding:"18px 22px", borderRadius:16, background:D?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.03)", border:"1px solid rgba(239,68,68,0.2)", display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ fontSize:28, flexShrink:0 }}>🚨</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#ef4444", marginBottom:4 }}>최우선 수정 사항</div>
                  <div style={{ fontSize:13, color:text, lineHeight:1.7 }}>{result.topPriority}</div>
                </div>
              </div>
            )}

            {/* 항목별 상세 분석 */}
            {config.criteria.map(criterion => {
              const data = result.criteria?.[criterion.key];
              if (!data) return null;
              const isExpanded = expandedCriteria === criterion.key;
              return (
                <div key={criterion.key} style={{ borderRadius:16, border:`1px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                  <div onClick={()=>setExpandedCriteria(isExpanded?null:criterion.key)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"18px 22px", cursor:"pointer", transition:"background 0.1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:40, height:40, borderRadius:10, background:config.color+"10", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {criterion.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:text }}>{criterion.label}</div>
                      <div style={{ fontSize:12, color:muted, marginTop:2 }}>{data.summary}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:24, fontWeight:900, color:scoreColor(data.score, criterion.weight) }}>{data.score}<span style={{fontSize:12,color:muted}}>/{criterion.weight}</span></div>
                      <div style={{ fontSize:11, fontWeight:700, color:scoreColor(data.score, criterion.weight) }}>{data.grade}</div>
                    </div>
                    <span style={{ fontSize:14, color:muted, marginLeft:4 }}>{isExpanded?"▲":"▼"}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding:"0 22px 22px", borderTop:`1px solid ${bdr}` }}>
                      <div style={{ padding:"12px 14px", margin:"14px 0", borderRadius:10, background:D?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.03)", border:"1px solid rgba(99,102,241,0.1)" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#6366f1", marginBottom:4 }}>📖 평가 기준</div>
                        <div style={{ fontSize:12, color:muted, lineHeight:1.6 }}>{criterion.guide}</div>
                      </div>

                      {data.good?.length > 0 && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#22c55e", marginBottom:6 }}>✅ 잘하고 있는 점</div>
                          {data.good.map((g,i) => (
                            <div key={i} style={{ display:"flex", gap:8, marginBottom:4, alignItems:"flex-start" }}>
                              <span style={{ color:"#22c55e", flexShrink:0 }}>•</span>
                              <span style={{ fontSize:12, color:text, lineHeight:1.6 }}>{g}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {data.bad?.length > 0 && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", marginBottom:6 }}>❌ 개선이 필요한 점</div>
                          {data.bad.map((b,i) => (
                            <div key={i} style={{ display:"flex", gap:8, marginBottom:4, alignItems:"flex-start" }}>
                              <span style={{ color:"#ef4444", flexShrink:0 }}>•</span>
                              <span style={{ fontSize:12, color:text, lineHeight:1.6 }}>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {data.howToFix?.length > 0 && (
                        <div style={{ marginBottom:14, padding:"16px", borderRadius:12, background:D?"rgba(245,158,11,0.06)":"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.15)" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:8 }}>🔧 수정 가이드</div>
                          {data.howToFix.map((fix,i) => (
                            <div key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
                              <span style={{ fontSize:12, fontWeight:900, color:"#f59e0b", flexShrink:0, minWidth:16 }}>{i+1}.</span>
                              <span style={{ fontSize:12, color:text, lineHeight:1.7 }}>{fix}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {data.example && (
                        <div style={{ padding:"14px 16px", borderRadius:10, background:D?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.03)", border:"1px solid rgba(34,197,94,0.15)" }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>💡 수정 예시</div>
                          <div style={{ fontSize:12, color:text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{data.example}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 추천 제목 */}
            {result.recommendedTitles?.length > 0 && (
              <div style={{ padding:"22px 24px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
                <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:14 }}>✨ SEO 최적화 추천 제목</div>
                {result.recommendedTitles.map((t,i) => (
                  <div key={i} onClick={()=>navigator.clipboard?.writeText(t)}
                    style={{ padding:"12px 16px", marginBottom:8, borderRadius:10, border:`1px solid ${bdr}`, cursor:"pointer",
                      background:D?"rgba(255,255,255,0.03)":"#fafafa", fontSize:13, color:text, fontWeight:600, display:"flex", alignItems:"center", gap:10, transition:"all 0.1s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=config.color}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=bdr}
                    title="클릭하면 복사">
                    <span style={{ width:24, height:24, borderRadius:6, background:config.color+"15", color:config.color, fontWeight:900, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</span>
                    <span style={{ flex:1 }}>{t}</span>
                    <span style={{ fontSize:10, color:muted, flexShrink:0 }}>📋 복사</span>
                  </div>
                ))}
              </div>
            )}

            {/* 추천 키워드 */}
            {result.recommendedKeywords?.length > 0 && (
              <div style={{ padding:"22px 24px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
                <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:14 }}>🏷 추천 키워드</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {result.recommendedKeywords.map((k,i) => (
                    <span key={i} onClick={()=>navigator.clipboard?.writeText(k)}
                      style={{ padding:"8px 16px", borderRadius:20, background:config.color+"10", border:`1px solid ${config.color}25`,
                        color:config.color, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=config.color+"20"}
                      onMouseLeave={e=>e.currentTarget.style.background=config.color+"10"}>
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 경쟁 차별화 전략 */}
            {result.competitorTip && (
              <div style={{ padding:"22px 24px", borderRadius:16, background:D?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.03)", border:"1px solid rgba(139,92,246,0.15)", display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ fontSize:28, flexShrink:0 }}>🎯</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#8b5cf6", marginBottom:6 }}>경쟁 차별화 전략</div>
                  <div style={{ fontSize:13, color:text, lineHeight:1.8 }}>{result.competitorTip}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
