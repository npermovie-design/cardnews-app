// ── 카테고리 ─────────────────────────────────────────────────
export const CATEGORIES = [
  { key: "food", label: "식품류" },
  { key: "farm", label: "농수산물" },
  { key: "tech", label: "가전/디지털" },
  { key: "living", label: "생활용품/리빙" },
  { key: "fashion", label: "의류/패션" },
  { key: "beauty", label: "화장품/뷰티" },
  { key: "health", label: "건강기능식품" },
  { key: "education", label: "지식서비스/교육" },
  { key: "pet", label: "반려동물" },
  { key: "kids", label: "유아/아동" },
];

// ── 섹션 타입 (20종) ────────────
export const SECTION_TYPES = [
  { id: "hero", label: "히어로", desc: "메인 타이틀 + 제품 이미지" },
  { id: "pain_points", label: "고민/공감", desc: "타겟 고민 나열" },
  { id: "review", label: "고객 후기", desc: "실제 후기/별점" },
  { id: "concept", label: "컨셉 중간", desc: "브랜드 스토리/감성" },
  { id: "features", label: "특장점 목록", desc: "핵심 장점 나열" },
  { id: "point", label: "포인트", desc: "상세 설명 포인트" },
  { id: "stats_highlight", label: "숫자 강조", desc: "핵심 수치 통계" },
  { id: "process_steps", label: "진행 과정", desc: "타임라인 스텝" },
  { id: "comparison", label: "비교표", desc: "Before vs After 비교" },
  { id: "before_after", label: "변화/결과", desc: "전후 대비" },
  { id: "pricing", label: "가격표", desc: "티어별 가격" },
  { id: "faq", label: "자주 묻는 질문", desc: "Q&A 리스트" },
  { id: "cert", label: "인증", desc: "인증/수상/자격" },
  { id: "facility", label: "시설", desc: "생산시설/환경" },
  { id: "shipping", label: "배송 방법", desc: "배송/포장 안내" },
  { id: "info", label: "정보", desc: "구매 전 확인사항" },
  { id: "contact", label: "연락처", desc: "고객센터/문의" },
  { id: "event", label: "이벤트", desc: "프로모션/할인" },
  { id: "guarantee", label: "보증/신뢰", desc: "환불 보증" },
  { id: "cta", label: "구매 유도", desc: "CTA/주문 버튼" },
  { id: "ai_notice", label: "AI 콘텐츠 고지", desc: "AI 생성 안내" },
];

// ── AI 파이프라인 단계 ─────────────────────────────────────
export const PIPELINE_STEPS = [
  { id: "input", label: "입력한 정보" },
  { id: "image", label: "이미지 분석" },
  { id: "tone", label: "톤앤매너 추출" },
  { id: "layout", label: "레이아웃 디자인" },
  { id: "content", label: "콘텐츠 제작" },
];
