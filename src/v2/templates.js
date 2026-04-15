// 상세페이지 템플릿 프리셋 10종
// PicCopilot + Hookable 분석 기반

export const DESIGN_MOODS = [
  { id: "clean", label: "깔끔한 화이트", desc: "수분감이 돋보이는 맑고 깨끗한 스타일" },
  { id: "premium", label: "프리미엄", desc: "고급스럽고 차분한 프리미엄 스타일" },
  { id: "trendy", label: "트렌디", desc: "트렌디하고 톡톡 튀는 감성 스타일" },
  { id: "natural", label: "내추럴", desc: "자연 유래 성분을 강조하는 자연주의 스타일" },
];

export const SECTION_TYPES = [
  { id: "hero", label: "히어로" },
  { id: "brand", label: "브랜드 소개" },
  { id: "key_features", label: "핵심 특장점" },
  { id: "product_info", label: "제품 정보" },
  { id: "target", label: "타겟 고객" },
  { id: "clinical", label: "임상/데이터" },
  { id: "texture", label: "텍스처/질감" },
  { id: "gallery", label: "제품 갤러리" },
  { id: "usage", label: "사용 방법" },
  { id: "lifestyle", label: "라이프스타일" },
  { id: "notices", label: "유의사항" },
  { id: "cta", label: "구매 유도" },
];

export const TEMPLATES = [
  {
    id: "auto",
    name: "AI 자동 추천",
    category: "all",
    designMood: "auto",
    thumbnail: { gradient: "linear-gradient(135deg, #7c6aff 0%, #ec4899 100%)", accent: "#fff" },
    colorScheme: null,
    sectionOrder: null,
    isAuto: true,
  },
  {
    id: "clean_white",
    name: "클린 화이트",
    category: "beauty",
    designMood: "clean",
    thumbnail: { gradient: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", accent: "#333" },
    colorScheme: { primary: "#1a1a2e", secondary: "#555", background: "#ffffff", text: "#111", accent: "#5e60ce" },
    sectionOrder: ["hero", "brand", "key_features", "product_info", "target", "texture", "gallery", "usage", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "natural_cream",
    name: "내추럴 크림",
    category: "beauty",
    designMood: "natural",
    thumbnail: { gradient: "linear-gradient(135deg, #fdf6ec 0%, #e8d5b7 100%)", accent: "#6b4f36" },
    colorScheme: { primary: "#4a3728", secondary: "#8b7355", background: "#fdf6ec", text: "#2d1f14", accent: "#a67c52" },
    sectionOrder: ["hero", "brand", "key_features", "target", "texture", "product_info", "gallery", "usage", "lifestyle", "notices"],
    fontPair: { heading: "'Noto Serif KR', serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "luxury_dark",
    name: "럭셔리 다크",
    category: "fashion",
    designMood: "premium",
    thumbnail: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", accent: "#c9a96e" },
    colorScheme: { primary: "#c9a96e", secondary: "#a08850", background: "#0f0f1a", text: "#f0ece3", accent: "#c9a96e" },
    sectionOrder: ["hero", "brand", "key_features", "gallery", "product_info", "lifestyle", "clinical", "usage", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "soft_pink",
    name: "소프트 핑크",
    category: "beauty",
    designMood: "clean",
    thumbnail: { gradient: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", accent: "#c2185b" },
    colorScheme: { primary: "#c2185b", secondary: "#e91e63", background: "#fff5f7", text: "#1a1a1a", accent: "#e91e63" },
    sectionOrder: ["hero", "key_features", "texture", "product_info", "target", "gallery", "usage", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "bold_impact",
    name: "볼드 임팩트",
    category: "health",
    designMood: "trendy",
    thumbnail: { gradient: "linear-gradient(135deg, #ff6b35 0%, #f7c948 100%)", accent: "#fff" },
    colorScheme: { primary: "#ff6b35", secondary: "#1a1a1a", background: "#ffffff", text: "#111", accent: "#ff6b35" },
    sectionOrder: ["hero", "key_features", "clinical", "product_info", "target", "gallery", "usage", "lifestyle", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "eco_green",
    name: "에코 그린",
    category: "food",
    designMood: "natural",
    thumbnail: { gradient: "linear-gradient(135deg, #c8e6c9 0%, #81c784 100%)", accent: "#2e7d32" },
    colorScheme: { primary: "#2e7d32", secondary: "#558b2f", background: "#f1f8e9", text: "#1b5e20", accent: "#43a047" },
    sectionOrder: ["hero", "brand", "key_features", "product_info", "clinical", "gallery", "usage", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "modern_gradient",
    name: "모던 그래디언트",
    category: "tech",
    designMood: "trendy",
    thumbnail: { gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", accent: "#fff" },
    colorScheme: { primary: "#667eea", secondary: "#764ba2", background: "#fafafe", text: "#1a1a2e", accent: "#667eea" },
    sectionOrder: ["hero", "key_features", "product_info", "clinical", "gallery", "target", "usage", "lifestyle", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "warm_wood",
    name: "웜 우드",
    category: "food",
    designMood: "natural",
    thumbnail: { gradient: "linear-gradient(135deg, #d7ccc8 0%, #a1887f 100%)", accent: "#4e342e" },
    colorScheme: { primary: "#5d4037", secondary: "#795548", background: "#efebe9", text: "#3e2723", accent: "#8d6e63" },
    sectionOrder: ["hero", "brand", "key_features", "product_info", "gallery", "usage", "lifestyle", "notices"],
    fontPair: { heading: "'Noto Serif KR', serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "tech_minimal",
    name: "테크 미니멀",
    category: "tech",
    designMood: "premium",
    thumbnail: { gradient: "linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)", accent: "#263238" },
    colorScheme: { primary: "#263238", secondary: "#546e7a", background: "#ffffff", text: "#111", accent: "#0288d1" },
    sectionOrder: ["hero", "key_features", "product_info", "clinical", "gallery", "target", "usage", "notices", "cta"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
  {
    id: "pastel_dream",
    name: "파스텔 드림",
    category: "beauty",
    designMood: "clean",
    thumbnail: { gradient: "linear-gradient(135deg, #e8daef 0%, #d5f5e3 100%)", accent: "#6c3483" },
    colorScheme: { primary: "#6c3483", secondary: "#1abc9c", background: "#fdfefe", text: "#2c3e50", accent: "#8e44ad" },
    sectionOrder: ["hero", "brand", "key_features", "texture", "target", "product_info", "gallery", "usage", "notices"],
    fontPair: { heading: "'Pretendard', sans-serif", body: "'Pretendard', sans-serif" },
  },
];

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

export function getTemplatesByMood(mood) {
  if (!mood || mood === "auto") return TEMPLATES.filter(t => !t.isAuto);
  return TEMPLATES.filter(t => t.designMood === mood);
}
