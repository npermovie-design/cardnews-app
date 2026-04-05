// DetailPageStudio - Section Templates
// 원칙: 각 섹션별 구조가 실제로 다른 레이아웃 변형 (색만 다른 것 제거)
// 모든 섹션 높이 860~1000px 기준 설계

const T = (type, layout, bg, label, preview, elements) => ({ type, layout, bg_color: bg, label, preview, elements });
const txt = (role, content, opts = {}) => ({ type: "text", role, content, ...opts });
const badge = (content, bg = "#c9a961", color = "#fff") => ({ type: "badge", content, bg, color });

export const SECTION_TEMPLATES = {

  hero: [
    // 1. 풀블리드 이미지 + 하단 그라데이션 오버레이
    T("hero", "full_image", "#111", "풀블리드 + 하단 오버레이", "전체 이미지 + 그라데이션 + 하단 타이틀", [
      badge("BEST SELLER", "#c9a961", "#111"),
      txt("subtitle", "고객이 인정한 최고의 품질", { fontSize: 14, color: "rgba(255,255,255,0.7)" }),
      txt("title", "프리미엄 유기농 제품", { fontSize: 42, fontWeight: "900", color: "#fff" }),
      txt("body", "엄선된 원재료로 만든 프리미엄 제품을 만나보세요", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
    // 2. 좌 이미지 50% + 우 텍스트 50% (가격 포함)
    T("hero", "left_image_right_text", "#f9f6f2", "좌 이미지 + 우 텍스트+가격", "50:50 분할 — 왼쪽 사진, 오른쪽 제목+가격", [
      txt("subtitle", "NEW ARRIVAL", { fontSize: 12, fontWeight: "700", color: "#8B7355" }),
      txt("title", "이번 시즌 베스트", { fontSize: 32, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "트렌디한 디자인과 편안한 착용감", { fontSize: 15, color: "#666" }),
      txt("price", "39,900원", { fontSize: 28, fontWeight: "900", color: "#c9a961" }),
    ]),
    // 3. 다크 센터 + 하단 통계 그리드
    T("hero", "centered_text", "#1a1a2e", "다크 센터 + 통계 4칸", "다크 배경 + 가운데 타이틀 + 하단 4칸 통계", [
      badge("PREMIUM", "#c9a961", "#1a1a2e"),
      txt("title", "최고급 프리미엄 라인", { fontSize: 38, fontWeight: "900", color: "#fff" }),
      txt("body", "장인 정신으로 완성한 프리미엄 품질", { fontSize: 16, color: "rgba(255,255,255,0.6)" }),
      txt("stat_number", "4,200+", { fontSize: 28, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "누적 판매", { fontSize: 11, color: "rgba(255,255,255,0.5)" }),
      txt("stat_number", "98%", { fontSize: 28, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "만족도", { fontSize: 11, color: "rgba(255,255,255,0.5)" }),
    ]),
    // 4. 미니멀 풀블리드 — 텍스트 최소
    T("hero", "full_image", "#111", "미니멀 풀블리드", "풀 이미지 + 브랜드명 + 한 줄 카피만", [
      txt("title", "자연이 선사하는 맛", { fontSize: 48, fontWeight: "900", color: "#fff" }),
    ]),
    // 5. 다크 + 대형 가격 CTA
    T("hero", "full_image", "#1a1a2e", "다크 + 대형 가격", "다크 + 큰 할인가 + 구매 버튼", [
      txt("subtitle", "LIMITED EDITION", { fontSize: 12, fontWeight: "700", color: "#c9a961" }),
      txt("title", "오늘만 이 가격", { fontSize: 40, fontWeight: "900", color: "#fff" }),
      txt("price", "19,900원", { fontSize: 36, fontWeight: "900", color: "#c9a961" }),
      txt("body", "정가 39,900원 → 50% 할인", { fontSize: 14, color: "rgba(255,255,255,0.4)" }),
    ]),
    // 6. 크림 배경 + 중앙 제품 포커스
    T("hero", "centered_text", "#f9f6f2", "크림 중앙 포커스", "크림 배경 + 중앙 대형 타이틀 + 서브 카피", [
      txt("subtitle", "ORGANIC & NATURAL", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "자연 그대로의 건강함", { fontSize: 40, fontWeight: "900", color: "#2c2c2c" }),
      txt("body", "100% 유기농 인증 원료만 사용합니다", { fontSize: 16, color: "#888" }),
    ]),
  ],

  pain_points: [
    // 1. 다크 풀배경 + 글라스 카드 (현재)
    T("pain_points", "centered_text", "#1a1a2e", "다크 + 글라스 카드 4장", "다크 배경 이미지 + 반투명 카드 그리드", [
      txt("title", "이런 고민 있으셨나요?", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "매번 같은 결과에 실망", { fontWeight: "700", color: "#fff" }),
      txt("body", "기대했지만 달라진 게 없는 경험", { color: "rgba(255,255,255,0.5)" }),
      txt("body", "비용은 들지만 효과는 미미", { fontWeight: "700", color: "#fff" }),
      txt("body", "검증되지 않은 방법에 지침", { color: "rgba(255,255,255,0.5)" }),
    ]),
    // 2. 크림 + 큰 인용문 (완전 다른 구조)
    T("pain_points", "centered_text", "#f9f6f2", "크림 + 대형 인용문", "크림 배경 + 큰 따옴표 + 공감 멘트 1개 포커스", [
      txt("subtitle", "REAL VOICE", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "\"왜 맛있는 걸 집에서 못 먹을까?\"", { fontSize: 32, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "외식비는 계속 오르고, 집에서 만들면 맛이 달라서 포기했던 경험. 특별한 날 레스토랑 예약은 왜 이렇게 어려운 걸까요.", { fontSize: 16, color: "#666", lineHeight: 1.8 }),
    ]),
    // 3. 숫자 데이터 강조형 (완전 다른 구조)
    T("pain_points", "centered_text", "#fff", "화이트 + 숫자 데이터", "밝은 배경 + 통계 숫자로 고민 시각화", [
      txt("title", "소비자 10명 중 8명이 겪는 문제", { fontSize: 30, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "83%가 품질에 불만족", { fontWeight: "700", color: "#1a1a1a" }),
      txt("body", "반복 구매 시 실망하는 비율이 높습니다", { color: "#888" }),
      txt("body", "76%가 성분 확인의 어려움 호소", { fontWeight: "700", color: "#1a1a1a" }),
      txt("body", "복잡한 성분표에 지치셨다면 주목하세요", { color: "#888" }),
    ]),
    // 4. 좌 이미지 + 우 고민 리스트 (분할 레이아웃)
    T("pain_points", "left_image_right_text", "#f5f5f5", "좌 이미지 + 우 고민 리스트", "왼쪽 제품 이미지 + 오른쪽 고민 포인트 나열", [
      txt("title", "이것 때문에 고민이셨죠?", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "품질 대비 높은 가격", { fontWeight: "700", color: "#333" }),
      txt("body", "어떤 제품이 진짜 좋은지 판단이 어려움", { color: "#888" }),
      txt("body", "복잡한 조리/사용 과정", { fontWeight: "700", color: "#333" }),
      txt("body", "기대와 다른 결과에 실망", { color: "#888" }),
    ]),
  ],

  features: [
    // 1. 2열 이미지 카드 (현재)
    T("features", "grid_2col", "#fff", "2열 이미지 카드", "2열 이미지+제목+설명 카드 그리드", [
      txt("title", "왜 특별한가요?", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "천연 원재료 100%", { fontWeight: "700", color: "#333" }), txt("body", "국내 최고 품질의 원재료만 엄선", { color: "#666" }),
      txt("body", "특허 받은 제조 공법", { fontWeight: "700", color: "#333" }), txt("body", "독자적 기술로 영양 손실 최소화", { color: "#666" }),
      txt("body", "엄격한 품질 관리", { fontWeight: "700", color: "#333" }), txt("body", "HACCP 인증, 매 로트 검사", { color: "#666" }),
      txt("body", "친환경 포장", { fontWeight: "700", color: "#333" }), txt("body", "재활용 가능한 소재 사용", { color: "#666" }),
    ]),
    // 2. 3열 컴팩트 (다른 열 수)
    T("features", "grid_3col", "#f9f6f2", "3열 컴팩트 아이콘", "3열 아이콘+텍스트 컴팩트", [
      txt("title", "핵심 특장점", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "프리미엄 원료", { fontWeight: "700", color: "#333" }), txt("body", "최상급 원재료", { color: "#666" }),
      txt("body", "안전 인증", { fontWeight: "700", color: "#333" }), txt("body", "국제 인증 취득", { color: "#666" }),
      txt("body", "빠른 배송", { fontWeight: "700", color: "#333" }), txt("body", "주문 후 당일 출고", { color: "#666" }),
    ]),
    // 3. 다크 2열 (배경 완전 다름)
    T("features", "grid_2col", "#1a1a2e", "다크 2열 + 넘버링", "다크 배경 + 큰 넘버 + 2열 카드", [
      txt("title", "4가지 차별 포인트", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "산지 직송 신선함", { fontWeight: "700", color: "#fff" }), txt("body", "매일 새벽 산지에서 직접 공수", { color: "rgba(255,255,255,0.5)" }),
      txt("body", "전문 셰프 레시피", { fontWeight: "700", color: "#fff" }), txt("body", "미슐랭 출신 셰프가 개발한 맛", { color: "rgba(255,255,255,0.5)" }),
      txt("body", "간편한 조리법", { fontWeight: "700", color: "#fff" }), txt("body", "3분이면 완성되는 간편식", { color: "rgba(255,255,255,0.5)" }),
      txt("body", "위생 포장 시스템", { fontWeight: "700", color: "#fff" }), txt("body", "HACCP 인증 시설에서 포장", { color: "rgba(255,255,255,0.5)" }),
    ]),
  ],

  point: [
    // 1. 좌 이미지 + 우 텍스트 (밝은)
    T("point", "left_image_right_text", "#fff", "좌 이미지 + 우 텍스트", "50:50 분할 — 왼쪽 사진+오른쪽 포인트", [
      txt("subtitle", "POINT 01", { fontSize: 12, fontWeight: "700", color: "#8B7355" }),
      txt("title", "차별화된 핵심 포인트", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "다른 제품과는 차원이 다른 품질과 효과를 직접 경험해보세요. 꼼꼼한 공정과 엄격한 품질 관리로 완성됩니다.", { fontSize: 16, color: "#555", lineHeight: 1.8 }),
    ]),
    // 2. 우 이미지 + 좌 텍스트 (크림)
    T("point", "right_image_left_text", "#f9f6f2", "좌 텍스트 + 우 이미지", "50:50 분할 — 왼쪽 텍스트+오른쪽 사진", [
      txt("subtitle", "POINT 02", { fontSize: 12, fontWeight: "700", color: "#8B7355" }),
      txt("title", "전문가가 추천하는 이유", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "과학적 근거와 실제 사용 결과를 바탕으로 합니다. 까다로운 기준을 통과한 제품만 선별합니다.", { fontSize: 16, color: "#555", lineHeight: 1.8 }),
    ]),
    // 3. 다크 + 좌 이미지 (어두운 배경)
    T("point", "left_image_right_text", "#1a1a2e", "다크 + 좌 이미지", "다크 배경 + 50:50 분할", [
      txt("subtitle", "POINT 03", { fontSize: 12, fontWeight: "700", color: "#c9a961" }),
      txt("title", "눈으로 확인하는 품질", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "한눈에 보이는 프리미엄 퀄리티를 경험하세요. 섬세한 마감과 고급 재질이 차이를 만듭니다.", { fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }),
    ]),
    // 4. 풀블리드 이미지 + 하단 텍스트 오버레이 (완전 다른 구조)
    T("point", "full_image", "#111", "풀블리드 + 텍스트 오버레이", "전체 이미지 위에 하단 텍스트", [
      txt("subtitle", "HIGHLIGHT", { fontSize: 11, fontWeight: "700", color: "#c9a961" }),
      txt("title", "감각적인 비주얼", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("body", "모든 디테일에 정성을 담았습니다", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
    // 5. 화이트 + 체크리스트형 (텍스트 구조 다름)
    T("point", "left_image_right_text", "#f5f5f5", "이미지 + 체크리스트", "왼쪽 이미지 + 오른쪽 체크 항목 나열", [
      txt("subtitle", "DETAIL", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "꼼꼼한 품질 관리", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "원재료 선별부터 포장까지 7단계 검사", { fontSize: 15, color: "#555" }),
      txt("body", "매 생산 로트별 성적서 추적 관리", { fontSize: 15, color: "#555" }),
      txt("body", "전문 품질관리팀 24시간 모니터링", { fontSize: 15, color: "#555" }),
    ]),
  ],

  stats_highlight: [
    // 1. 다크 + 큰 숫자 3열
    T("stats_highlight", "centered_text", "#1a1a2e", "다크 + 대형 숫자 3열", "다크 배경 + 골드 대형 숫자 3개", [
      txt("title", "숫자로 증명합니다", { fontSize: 26, fontWeight: "900", color: "#fff" }),
      txt("stat_number", "4,200+", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "누적 판매", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
      txt("stat_number", "98%", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "재구매율", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
      txt("stat_number", "4.9", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "평균 별점", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
    ]),
    // 2. 화이트 + 대형 단일 숫자 포커스 (완전 다른 구조)
    T("stats_highlight", "centered_text", "#fff", "화이트 + 단일 대형 숫자", "밝은 배경 + 하나의 거대한 숫자 포커스", [
      txt("subtitle", "CUSTOMER SATISFACTION", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("stat_number", "98.7%", { fontSize: 80, fontWeight: "900", color: "#1a1a1a" }),
      txt("title", "고객 만족도", { fontSize: 22, fontWeight: "700", color: "#888" }),
      txt("body", "2024년 자체 고객 설문 조사 결과", { fontSize: 13, color: "#bbb" }),
    ]),
    // 3. 크림 + 숫자 4열 (더 많은 데이터)
    T("stats_highlight", "centered_text", "#f9f6f2", "크림 + 4열 데이터", "크림 배경 + 4개 숫자 가로 나열", [
      txt("title", "한눈에 보는 성과", { fontSize: 26, fontWeight: "900", color: "#2c2c2c" }),
      txt("stat_number", "15년", { fontSize: 42, fontWeight: "900", color: "#8B7355" }), txt("stat_label", "업력", { fontSize: 13, color: "#999" }),
      txt("stat_number", "50만+", { fontSize: 42, fontWeight: "900", color: "#8B7355" }), txt("stat_label", "판매량", { fontSize: 13, color: "#999" }),
      txt("stat_number", "99.2%", { fontSize: 42, fontWeight: "900", color: "#8B7355" }), txt("stat_label", "정품률", { fontSize: 13, color: "#999" }),
      txt("stat_number", "4.8", { fontSize: 42, fontWeight: "900", color: "#8B7355" }), txt("stat_label", "별점", { fontSize: 13, color: "#999" }),
    ]),
  ],

  review: [
    // 1. 이미지 헤더 + 3열 카드 (현재)
    T("review", "card_list", "#f9f6f2", "이미지 헤더 + 카드 3열", "상단 이미지 띠 + 별점 + 후기 카드", [
      txt("title", "실제 고객 후기", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("review_name", "김**"), txt("star", "5"), txt("review_text", "기대 이상이에요! 품질이 정말 좋고 배송도 빨랐습니다.", { color: "#555" }),
      txt("review_name", "이**"), txt("star", "5"), txt("review_text", "선물용으로 구매했는데 포장도 고급스럽고 받는 분이 좋아하셨어요.", { color: "#555" }),
      txt("review_name", "박**"), txt("star", "4"), txt("review_text", "재구매 의사 있습니다. 가성비 최고!", { color: "#555" }),
    ]),
    // 2. 다크 배경 후기 (다른 배경)
    T("review", "card_list", "#1a1a2e", "다크 + 후기 카드", "다크 배경 + 후기 3열", [
      txt("title", "생생한 고객 리뷰", { fontSize: 26, fontWeight: "900", color: "#fff" }),
      txt("review_name", "정**"), txt("star", "5"), txt("review_text", "여태 먹어본 중 최고입니다!", { color: "rgba(255,255,255,0.7)" }),
      txt("review_name", "최**"), txt("star", "5"), txt("review_text", "포장 퀄리티부터 남달라요.", { color: "rgba(255,255,255,0.7)" }),
      txt("review_name", "한**"), txt("star", "5"), txt("review_text", "매달 정기 구매하고 있어요.", { color: "rgba(255,255,255,0.7)" }),
    ]),
  ],

  comparison: [
    T("comparison", "centered_text", "#fff", "화이트 비교표", "밝은 배경 + 체크/X 비교 테이블", [
      txt("title", "비교해보세요", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "원재료|일반: 혼합 원료|우리: 100% 국내산", { color: "#555" }),
      txt("body", "인증|일반: 기본 인증|우리: HACCP + ISO", { color: "#555" }),
      txt("body", "포장|일반: 기본 포장|우리: 프리미엄 밀봉", { color: "#555" }),
    ]),
    T("comparison", "centered_text", "#1a1a2e", "다크 비교표", "다크 배경 + 비교 테이블", [
      txt("title", "확실한 차이", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "신선도|일반: 3일|우리: 당일 직송", { color: "rgba(255,255,255,0.7)" }),
      txt("body", "원산지|일반: 수입산|우리: 100% 국내산", { color: "rgba(255,255,255,0.7)" }),
      txt("body", "가격|일반: 고가|우리: 산지 직거래", { color: "rgba(255,255,255,0.7)" }),
    ]),
  ],

  guarantee: [
    T("guarantee", "centered_text", "#f9f6f2", "크림 + 대형 보증 텍스트", "크림 배경 + 큰 보증 카피 + 배지", [
      txt("subtitle", "OUR PROMISE", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "맛에 대한 약속", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "만족하지 못하시면 100% 환불해드립니다. 그만큼 자신있습니다. 30일 이내 무조건 전액 환불 보장.", { fontSize: 16, color: "#666", lineHeight: 1.8 }),
      badge("30일 환불 보증", "#1a1a2e", "#fff"),
    ]),
    T("guarantee", "centered_text", "#1a1a2e", "다크 + 인증 3분할", "다크 배경 + 인증 마크 3개 카드", [
      txt("title", "신뢰할 수 있는 품질", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("body", "HACCP 인증 완료", { fontWeight: "700", color: "#c9a961" }),
      txt("body", "ISO 9001 품질 경영", { fontWeight: "700", color: "#c9a961" }),
      txt("body", "100% 국내산 원료", { fontWeight: "700", color: "#c9a961" }),
    ]),
  ],

  cta: [
    T("cta", "centered_text", "#1a1a2e", "다크 + 가격+CTA", "다크 배경 + 큰 가격 + 구매 버튼", [
      txt("subtitle", "지금이 가장 좋은 기회", { fontSize: 13, color: "rgba(255,255,255,0.7)" }),
      txt("title", "오늘만 특별 할인", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("price", "29,900원", { fontSize: 40, fontWeight: "900", color: "#c9a961" }),
      badge("무료배송", "rgba(255,255,255,0.15)", "#fff"),
    ]),
    T("cta", "left_image_right_text", "#1a1a1a", "좌 이미지 + 우 CTA", "왼쪽 제품 이미지 + 오른쪽 가격/버튼", [
      txt("subtitle", "LIMITED OFFER", { fontSize: 12, fontWeight: "700", color: "#c9a961" }),
      txt("title", "지금 바로 시작하세요", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("price", "39,900원", { fontSize: 32, fontWeight: "900", color: "#c9a961" }),
      txt("body", "첫 구매 고객 추가 10% 할인", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
    ]),
    T("cta", "centered_text", "#f9f6f2", "크림 + 할인율 강조", "크림 배경 + 할인율 배지 + 가격", [
      badge("50% OFF", "#c9a961", "#fff"),
      txt("title", "반값에 만나보세요", { fontSize: 34, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "정가 59,800원", { fontSize: 14, color: "#999" }),
      txt("price", "29,900원", { fontSize: 40, fontWeight: "900", color: "#c9a961" }),
    ]),
  ],

  faq: [
    T("faq", "centered_text", "#f9f6f2", "크림 아코디언 FAQ", "크림 배경 + Q&A 아코디언", [
      txt("title", "자주 묻는 질문", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("question", "Q. 배송은 얼마나 걸리나요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 결제 확인 후 1~2일 이내 출고됩니다.", { color: "#666" }),
      txt("question", "Q. 교환/반품이 가능한가요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 수령 후 7일 이내 미개봉 상태에서 가능합니다.", { color: "#666" }),
      txt("question", "Q. 유통기한은 얼마인가요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 제조일로부터 12개월입니다.", { color: "#666" }),
    ]),
    T("faq", "centered_text", "#1a1a2e", "다크 FAQ", "다크 배경 + Q&A", [
      txt("title", "궁금하신 점", { fontSize: 26, fontWeight: "900", color: "#fff" }),
      txt("question", "Q. 원재료는 어디서 오나요?", { fontWeight: "700", color: "#fff" }),
      txt("answer", "A. 100% 국내 계약 농가에서 직접 공수합니다.", { color: "rgba(255,255,255,0.6)" }),
      txt("question", "Q. 냉동 배송인가요?", { fontWeight: "700", color: "#fff" }),
      txt("answer", "A. 냉장/냉동 신선 배송으로 발송됩니다.", { color: "rgba(255,255,255,0.6)" }),
    ]),
  ],

  cert: [
    T("cert", "centered_text", "#fff", "인증 카드 나열", "밝은 배경 + 인증 마크 카드", [
      txt("title", "인증 및 수상 내역", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "HACCP 식품안전관리인증", { fontWeight: "700", color: "#333" }),
      txt("body", "ISO 22000 국제 인증", { fontWeight: "700", color: "#333" }),
      txt("body", "대한민국 브랜드 대상 수상", { fontWeight: "700", color: "#333" }),
    ]),
  ],

  howto: [
    T("howto", "centered_text", "#fff", "좌우 교차 스텝", "좌우 교차 이미지 + 스텝 설명", [
      txt("title", "간편한 사용법", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "포장을 개봉합니다", { fontWeight: "700", color: "#333" }), txt("body", "간단한 준비로 시작", { color: "#666" }),
      txt("body", "조리/사용합니다", { fontWeight: "700", color: "#333" }), txt("body", "설명서대로 따라하세요", { color: "#666" }),
      txt("body", "완성!", { fontWeight: "700", color: "#333" }), txt("body", "맛있게 즐기세요", { color: "#666" }),
    ]),
  ],

  before_after: [
    T("before_after", "centered_text", "#1a1a2e", "다크 비포/애프터", "다크 배경 + 좌우 비교", [
      txt("title", "확실한 변화", { fontSize: 30, fontWeight: "900", color: "#fff" }),
      txt("body", "사용 전: 기존 방식의 불편함", { color: "rgba(255,255,255,0.6)" }),
      txt("body", "사용 후: 확연히 달라진 결과", { fontWeight: "700", color: "#c9a961" }),
    ]),
  ],

  event: [
    T("event", "centered_text", "#1a1a2e", "다크 이벤트", "다크 배경 이미지 + 이벤트 텍스트", [
      badge("EVENT", "rgba(255,255,255,0.15)", "#fff"),
      txt("title", "특별 이벤트 진행중", { fontSize: 36, fontWeight: "900", color: "#fff" }),
      txt("body", "지금 구매하시면 사은품을 드립니다", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
  ],

  shipping: [
    T("shipping", "centered_text", "#f5f5f5", "배송/교환 안내", "배송 정보 테이블", [
      txt("title", "배송 및 교환/반품 안내", { fontSize: 22, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "결제 완료 후 1~2일 이내 출고 (주말/공휴일 제외)", { color: "#555" }),
      txt("body", "제주/도서산간 지역은 추가 1~2일 소요", { color: "#555" }),
      txt("body", "수령 후 7일 이내 미개봉 제품 교환/반품 가능", { color: "#555" }),
    ]),
  ],

  ai_notice: [
    T("ai_notice", "centered_text", "#fafafa", "AI 생성 안내", "AI 콘텐츠 고지", [
      txt("body", "본 페이지의 일부 콘텐츠는 AI로 생성되었습니다.", { fontSize: 12, color: "#999" }),
    ]),
  ],
};

export const SECTION_TYPE_LABELS = {
  hero: "히어로 (메인 비주얼)",
  pain_points: "고민 포인트",
  features: "특장점 소개",
  point: "상세 설명",
  stats_highlight: "스펙/통계",
  comparison: "비교",
  review: "고객 후기",
  guarantee: "신뢰/보증",
  cert: "인증/수상",
  howto: "사용법/프로세스",
  before_after: "비포/애프터",
  event: "이벤트/프로모션",
  faq: "자주 묻는 질문",
  cta: "구매 유도 (CTA)",
  shipping: "배송/교환/반품",
  ai_notice: "AI 생성 안내",
};
