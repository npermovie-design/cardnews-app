// DetailPageStudio - Section Templates (레이아웃 다양성 강화)
// 각 섹션 타입별로 실제 레이아웃이 다른 변형만 포함

export const SECTION_TEMPLATES = {

  hero: [
    {
      type: "hero", layout: "full_image", bg_color: "#111",
      label: "풀 이미지 히어로",
      preview: "전체 이미지 위에 텍스트 오버레이, 그라데이션 딤",
      elements: [
        { type: "badge", content: "BEST SELLER", bg: "#FF6F00", color: "#fff" },
        { type: "text", role: "subtitle", content: "고객이 인정한 최고의 품질", fontSize: 14, color: "rgba(255,255,255,0.7)" },
        { type: "text", role: "title", content: "프리미엄 유기농 제품", fontSize: 36, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "body", content: "엄선된 원재료로 만든 프리미엄 제품을 만나보세요", fontSize: 16, color: "rgba(255,255,255,0.75)" },
      ],
    },
    {
      type: "hero", layout: "left_image_right_text", bg_color: "#f8f8f8",
      label: "좌측 이미지 + 우측 텍스트",
      preview: "왼쪽에 큰 제품 이미지, 오른쪽에 타이틀과 CTA",
      elements: [
        { type: "text", role: "subtitle", content: "NEW ARRIVAL", fontSize: 12, fontWeight: "700", color: "#7c6aff" },
        { type: "text", role: "title", content: "이번 시즌 베스트 아이템", fontSize: 28, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "트렌디한 디자인과 편안한 착용감을 동시에", fontSize: 14, color: "#666" },
        { type: "text", role: "price", content: "39,900원", fontSize: 24, fontWeight: "900", color: "#e91e63" },
      ],
    },
    {
      type: "hero", layout: "centered_text", bg_color: "#1a1a2e",
      label: "다크 센터 히어로 + 통계",
      preview: "다크 배경, 가운데 제목, 하단 4칸 통계",
      elements: [
        { type: "badge", content: "PREMIUM", bg: "#c9a961", color: "#1a1a2e" },
        { type: "text", role: "title", content: "최고급 프리미엄 라인", fontSize: 32, fontWeight: "900", color: "#fff" },
        { type: "text", role: "body", content: "장인 정신으로 완성한 프리미엄 품질", fontSize: 15, color: "rgba(255,255,255,0.6)" },
        { type: "text", role: "stat_number", content: "4,200+", fontSize: 28, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "누적 판매", fontSize: 11, color: "rgba(255,255,255,0.5)" },
        { type: "text", role: "stat_number", content: "98%", fontSize: 28, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "만족도", fontSize: 11, color: "rgba(255,255,255,0.5)" },
      ],
    },
  ],

  pain_points: [
    {
      type: "pain_points", layout: "centered_text", bg_color: "#fff",
      label: "카드형 고민 포인트",
      preview: "질문 제목 + 고민 카드 3개 나열",
      elements: [
        { type: "text", role: "title", content: "이런 고민 있으셨나요?", fontSize: 24, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "매번 같은 결과에 실망하셨나요?", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "시간과 비용은 들지만 효과는 미미한 경험", color: "#666" },
        { type: "text", role: "body", content: "전문가의 도움 없이 혼자 고민하셨나요?", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "검증되지 않은 방법에 지쳤다면 주목하세요", color: "#666" },
      ],
    },
    {
      type: "pain_points", layout: "grid_2col", bg_color: "#f5f5f5",
      label: "2열 그리드 고민 포인트",
      preview: "2x2 카드 그리드, 아이콘 + 고민 텍스트",
      elements: [
        { type: "text", role: "title", content: "이런 불편함, 겪고 계시죠?", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "매번 비용이 부담되는 관리", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "효과는 일시적, 근본 해결이 안 됨", color: "#666" },
        { type: "text", role: "body", content: "복잡한 사용법에 포기하게 됨", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "어떤 제품이 나에게 맞는지 모름", color: "#666" },
      ],
    },
  ],

  features: [
    {
      type: "features", layout: "grid_2col", bg_color: "#fff",
      label: "2열 특장점 그리드",
      preview: "아이콘 + 제목 + 설명이 2열로 배치",
      elements: [
        { type: "text", role: "title", content: "왜 특별한가요?", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "천연 원재료 100%", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "국내 최고 품질의 원재료만 엄선", color: "#666" },
        { type: "text", role: "body", content: "특허 받은 제조 공법", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "독자적 기술로 영양 손실 최소화", color: "#666" },
        { type: "text", role: "body", content: "엄격한 품질 관리", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "HACCP 인증, 매 로트 검사", color: "#666" },
        { type: "text", role: "body", content: "친환경 포장", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "재활용 가능한 친환경 소재 사용", color: "#666" },
      ],
    },
    {
      type: "features", layout: "grid_3col", bg_color: "#fafafa",
      label: "3열 특장점 그리드",
      preview: "아이콘 원형 + 3열 컴팩트 레이아웃",
      elements: [
        { type: "text", role: "title", content: "핵심 특장점", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "프리미엄 원료", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "최상급 원재료", color: "#666" },
        { type: "text", role: "body", content: "안전 인증", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "국제 인증 취득", color: "#666" },
        { type: "text", role: "body", content: "빠른 배송", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "주문 후 당일 출고", color: "#666" },
      ],
    },
  ],

  point: [
    {
      type: "point", layout: "left_image_right_text", bg_color: "#fff",
      label: "좌 이미지 + 우 텍스트",
      preview: "왼쪽 제품 사진, 오른쪽 포인트 설명",
      elements: [
        { type: "text", role: "subtitle", content: "POINT 01", fontSize: 12, fontWeight: "700", color: "#7c6aff" },
        { type: "text", role: "title", content: "차별화된 핵심 포인트", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "다른 제품과는 차원이 다른 품질과 효과를 직접 경험해보세요. 꼼꼼한 공정과 엄격한 품질 관리로 완성됩니다.", fontSize: 14, color: "#555", lineHeight: 1.7 },
      ],
    },
    {
      type: "point", layout: "right_image_left_text", bg_color: "#f8f8f8",
      label: "좌 텍스트 + 우 이미지",
      preview: "왼쪽 텍스트 설명, 오른쪽 제품 사진",
      elements: [
        { type: "text", role: "subtitle", content: "POINT 02", fontSize: 12, fontWeight: "700", color: "#e91e63" },
        { type: "text", role: "title", content: "전문가가 추천하는 이유", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "각 분야 전문가들이 직접 검증하고 추천하는 제품입니다. 과학적 근거와 실제 사용 결과를 바탕으로 합니다.", fontSize: 14, color: "#555", lineHeight: 1.7 },
      ],
    },
  ],

  stats_highlight: [
    {
      type: "stats_highlight", layout: "centered_text", bg_color: "#1a1a2e",
      label: "다크 배경 숫자 강조",
      preview: "어두운 배경에 큰 숫자 3~4개 나열",
      elements: [
        { type: "text", role: "title", content: "숫자로 증명합니다", fontSize: 22, fontWeight: "900", color: "#fff" },
        { type: "text", role: "stat_number", content: "4,200+", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "누적 판매", fontSize: 12, color: "rgba(255,255,255,0.5)" },
        { type: "text", role: "stat_number", content: "98%", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "재구매율", fontSize: 12, color: "rgba(255,255,255,0.5)" },
        { type: "text", role: "stat_number", content: "4.9", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "평균 별점", fontSize: 12, color: "rgba(255,255,255,0.5)" },
      ],
    },
  ],

  review: [
    {
      type: "review", layout: "card_list", bg_color: "#fafafa",
      label: "카드형 고객 후기",
      preview: "후기 카드 3개, 별점 + 닉네임 + 본문",
      elements: [
        { type: "text", role: "title", content: "실제 고객 후기", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "review_name", content: "김**", color: "#333" },
        { type: "text", role: "star", content: "5" },
        { type: "text", role: "review_text", content: "기대 이상이에요! 품질이 정말 좋고 배송도 빨랐습니다.", color: "#555" },
        { type: "text", role: "review_name", content: "이**", color: "#333" },
        { type: "text", role: "star", content: "5" },
        { type: "text", role: "review_text", content: "선물용으로 구매했는데 포장도 고급스럽고 받는 분이 좋아하셨어요.", color: "#555" },
        { type: "text", role: "review_name", content: "박**", color: "#333" },
        { type: "text", role: "star", content: "4" },
        { type: "text", role: "review_text", content: "재구매 의사 있습니다. 가성비 최고!", color: "#555" },
      ],
    },
  ],

  comparison: [
    {
      type: "comparison", layout: "centered_text", bg_color: "#fff",
      label: "비교 테이블",
      preview: "일반 제품 vs 우리 제품 비교표",
      elements: [
        { type: "text", role: "title", content: "비교해보세요", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "원재료|일반: 혼합 원료|우리: 100% 국내산", color: "#555" },
        { type: "text", role: "body", content: "인증|일반: 기본 인증|우리: HACCP + ISO", color: "#555" },
        { type: "text", role: "body", content: "포장|일반: 기본 포장|우리: 프리미엄 선물 포장", color: "#555" },
      ],
    },
  ],

  faq: [
    {
      type: "faq", layout: "centered_text", bg_color: "#fafafa",
      label: "아코디언 FAQ",
      preview: "질문 + 답변 목록",
      elements: [
        { type: "text", role: "title", content: "자주 묻는 질문", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "question", content: "Q. 배송은 얼마나 걸리나요?", fontWeight: "700", color: "#333" },
        { type: "text", role: "answer", content: "A. 결제 확인 후 1~2일 이내 출고됩니다. 주말/공휴일 제외.", color: "#666" },
        { type: "text", role: "question", content: "Q. 교환/반품이 가능한가요?", fontWeight: "700", color: "#333" },
        { type: "text", role: "answer", content: "A. 수령 후 7일 이내 미개봉 상태에서 교환/반품 가능합니다.", color: "#666" },
      ],
    },
  ],

  guarantee: [
    {
      type: "guarantee", layout: "centered_text", bg_color: "#f0fff4",
      label: "보증/신뢰",
      preview: "만족 보증 + 인증 배지",
      elements: [
        { type: "text", role: "title", content: "100% 만족 보증", fontSize: 24, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "만족하지 못하시면 30일 이내 전액 환불해드립니다. 품질에 대한 자신감입니다.", fontSize: 15, color: "#555", lineHeight: 1.7 },
        { type: "badge", content: "30일 무조건 환불", bg: "#4CAF50", color: "#fff" },
      ],
    },
    {
      type: "guarantee", layout: "centered_text", bg_color: "#1a1a2e",
      label: "다크 보증 + 3분할",
      preview: "다크 배경 + 인증 마크 3개",
      elements: [
        { type: "text", role: "title", content: "신뢰할 수 있는 품질", fontSize: 28, fontWeight: "900", color: "#fff" },
        { type: "text", role: "body", content: "HACCP 인증 완료", fontWeight: "700", color: "#c9a961" },
        { type: "text", role: "body", content: "ISO 9001 품질 경영", fontWeight: "700", color: "#c9a961" },
        { type: "text", role: "body", content: "100% 국내산 원료", fontWeight: "700", color: "#c9a961" },
        { type: "badge", content: "품질 보증", bg: "#c9a961", color: "#1a1a2e" },
      ],
    },
  ],

  cert: [
    {
      type: "cert", layout: "centered_text", bg_color: "#fff",
      label: "인증서/수상 그리드",
      preview: "인증 마크 + 수상 내역 카드형",
      elements: [
        { type: "text", role: "title", content: "인증 및 수상 내역", fontSize: 24, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "HACCP 식품안전관리인증", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "ISO 22000 국제 인증", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "대한민국 브랜드 대상 수상", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "소비자 만족도 1위 선정", fontWeight: "700", color: "#333" },
      ],
    },
    {
      type: "cert", layout: "centered_text", bg_color: "#1a1a2e",
      label: "다크 인증 + 숫자",
      preview: "다크 배경 + 큰 숫자 통계형",
      elements: [
        { type: "text", role: "title", content: "검증된 신뢰", fontSize: 28, fontWeight: "900", color: "#fff" },
        { type: "text", role: "stat_number", content: "15+", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "보유 인증", fontSize: 12, color: "rgba(255,255,255,0.5)" },
        { type: "text", role: "stat_number", content: "28년", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "업력", fontSize: 12, color: "rgba(255,255,255,0.5)" },
        { type: "text", role: "stat_number", content: "1위", fontSize: 36, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "stat_label", content: "업계 점유율", fontSize: 12, color: "rgba(255,255,255,0.5)" },
      ],
    },
  ],

  howto: [
    {
      type: "howto", layout: "centered_text", bg_color: "#fff",
      label: "이미지 교차 사용법",
      preview: "좌우 교차 이미지 + 스텝 설명",
      elements: [
        { type: "text", role: "title", content: "간편한 사용법", fontSize: 24, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "제품을 개봉합니다", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "간단한 준비로 바로 시작할 수 있습니다", color: "#666" },
        { type: "text", role: "body", content: "설명서대로 사용합니다", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "누구나 쉽게 따라할 수 있는 단계별 안내", color: "#666" },
        { type: "text", role: "body", content: "효과를 확인합니다", fontWeight: "700", color: "#333" },
        { type: "text", role: "body", content: "꾸준히 사용하면 놀라운 변화를 경험합니다", color: "#666" },
      ],
    },
  ],

  before_after: [
    {
      type: "before_after", layout: "centered_text", bg_color: "#1a1a2e",
      label: "다크 비포/애프터",
      preview: "다크 배경 + 변화 비교",
      elements: [
        { type: "text", role: "title", content: "놀라운 변화", fontSize: 28, fontWeight: "900", color: "#fff" },
        { type: "text", role: "body", content: "사용 전: 기존 방식의 불편함", color: "rgba(255,255,255,0.6)" },
        { type: "text", role: "body", content: "사용 후: 확연히 달라진 결과", fontWeight: "700", color: "#c9a961" },
      ],
    },
  ],

  event: [
    {
      type: "event", layout: "centered_text", bg_color: "#7c6aff",
      label: "풀 이미지 이벤트",
      preview: "배경 이미지 + 이벤트 텍스트",
      elements: [
        { type: "badge", content: "EVENT", bg: "rgba(255,255,255,0.2)", color: "#fff" },
        { type: "text", role: "title", content: "특별 이벤트 진행중", fontSize: 32, fontWeight: "900", color: "#fff" },
        { type: "text", role: "body", content: "지금 구매하시면 사은품을 드립니다", fontSize: 16, color: "rgba(255,255,255,0.8)" },
      ],
    },
  ],

  cta: [
    {
      type: "cta", layout: "centered_text", bg_color: "#7c6aff",
      label: "보라 CTA",
      preview: "보라색 배경 + 구매 유도 텍스트 + 가격",
      elements: [
        { type: "text", role: "subtitle", content: "지금이 가장 좋은 기회", fontSize: 13, color: "rgba(255,255,255,0.7)" },
        { type: "text", role: "title", content: "오늘만 특별 할인", fontSize: 28, fontWeight: "900", color: "#fff" },
        { type: "text", role: "price", content: "29,900원", fontSize: 32, fontWeight: "900", color: "#fff" },
        { type: "badge", content: "무료배송", bg: "rgba(255,255,255,0.2)", color: "#fff" },
      ],
    },
    {
      type: "cta", layout: "left_image_right_text", bg_color: "#1a1a1a",
      label: "다크 CTA + 이미지",
      preview: "왼쪽 제품 이미지 + 오른쪽 가격/CTA",
      elements: [
        { type: "text", role: "subtitle", content: "LIMITED OFFER", fontSize: 12, fontWeight: "700", color: "#c9a961" },
        { type: "text", role: "title", content: "지금 바로 시작하세요", fontSize: 24, fontWeight: "900", color: "#fff" },
        { type: "text", role: "price", content: "39,900원", fontSize: 28, fontWeight: "900", color: "#c9a961" },
        { type: "text", role: "body", content: "첫 구매 고객 추가 10% 할인", fontSize: 13, color: "rgba(255,255,255,0.6)" },
      ],
    },
  ],

  shipping: [
    {
      type: "shipping", layout: "centered_text", bg_color: "#f8f8f8",
      label: "배송/교환 안내",
      preview: "배송 정보 + 교환/반품 안내",
      elements: [
        { type: "text", role: "title", content: "배송 및 교환/반품 안내", fontSize: 20, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "body", content: "결제 완료 후 1~2일 이내 출고 (주말/공휴일 제외)", color: "#555" },
        { type: "text", role: "body", content: "제주/도서산간 지역은 추가 1~2일 소요", color: "#555" },
        { type: "text", role: "body", content: "수령 후 7일 이내 미개봉 제품 교환/반품 가능", color: "#555" },
      ],
    },
  ],

  ai_notice: [
    {
      type: "ai_notice", layout: "centered_text", bg_color: "#fafafa",
      label: "AI 생성 안내",
      preview: "AI 콘텐츠 고지 문구",
      elements: [
        { type: "text", role: "body", content: "본 페이지의 일부 콘텐츠는 AI로 생성되었습니다.", fontSize: 12, color: "#999" },
      ],
    },
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
