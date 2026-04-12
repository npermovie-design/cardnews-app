/**
 * 상세페이지 완성형 템플릿 레시피
 * 각 레시피 = 섹션 조합 + 컬러 팔레트 + 레이아웃 스타일 + 미리보기 이미지
 */

// Unsplash 이미지 (상업적 무료)
const U = (id, w = 400, h = 600) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80`;

export const TEMPLATE_RECIPES = [
  // ═══ 1. 미니멀 클린 ═══
  {
    id: "minimal_clean",
    name: "미니멀 클린",
    desc: "화이트 배경에 여백을 살린 깔끔한 디자인",
    tags: ["food", "living", "beauty", "health"],
    palette: { main: "#1a1a2e", gradient: "#555", light_bg: "#ffffff", dark_bg: "#1a1a2e" },
    sections: ["hero", "pain_points", "features", "point", "stats_highlight", "review", "cta"],
    heroLayout: "centered_text",
    preview: {
      heroBg: "#fff",
      heroText: "#1a1a2e",
      accent: "#1a1a2e",
      bodyBg: "#f8f8f8",
      img: U("photo-1556742049-0cfed4f6a45d"),
    },
  },
  // ═══ 2. 내추럴 크림 ═══
  {
    id: "natural_cream",
    name: "내추럴 크림",
    desc: "따뜻한 크림톤으로 자연스럽고 고급스러운 느낌",
    tags: ["food", "farm", "health", "beauty"],
    palette: { main: "#8B7355", gradient: "#A69279", light_bg: "#f9f6f2", dark_bg: "#2c2c2c" },
    sections: ["hero", "features", "point", "point", "stats_highlight", "guarantee", "review", "cta"],
    heroLayout: "full_image",
    preview: {
      heroBg: "#f9f6f2",
      heroText: "#5c4a32",
      accent: "#8B7355",
      bodyBg: "#f9f6f2",
      img: U("photo-1504674900247-0877df9cc836"),
    },
  },
  // ═══ 3. 럭셔리 다크 ═══
  {
    id: "luxury_dark",
    name: "럭셔리 다크",
    desc: "다크 배경 + 골드 포인트의 프리미엄 디자인",
    tags: ["beauty", "fashion", "tech", "health"],
    palette: { main: "#c9a961", gradient: "#b8956a", light_bg: "#f5f5f5", dark_bg: "#1a1a2e" },
    sections: ["hero", "pain_points", "features", "point", "comparison", "stats_highlight", "guarantee", "cta"],
    heroLayout: "color_overlay",
    preview: {
      heroBg: "#1a1a2e",
      heroText: "#c9a961",
      accent: "#c9a961",
      bodyBg: "#111",
      img: U("photo-1523293182086-7651a899d37f"),
    },
  },
  // ═══ 4. 소프트 파스텔 ═══
  {
    id: "soft_pastel",
    name: "소프트 파스텔",
    desc: "부드러운 핑크/라벤더 톤의 여성스러운 디자인",
    tags: ["beauty", "fashion", "kids", "pet"],
    palette: { main: "#d4829c", gradient: "#c4a0d8", light_bg: "#fef7f7", dark_bg: "#2c2035" },
    sections: ["hero", "features", "point", "review", "stats_highlight", "cta"],
    heroLayout: "centered_text",
    preview: {
      heroBg: "#fef7f7",
      heroText: "#8b4060",
      accent: "#d4829c",
      bodyBg: "#fef7f7",
      img: U("photo-1596462502278-27bfdc403348"),
    },
  },
  // ═══ 5. 볼드 임팩트 ═══
  {
    id: "bold_impact",
    name: "볼드 임팩트",
    desc: "강렬한 타이포와 높은 대비의 눈에 띄는 디자인",
    tags: ["tech", "food", "living", "education"],
    palette: { main: "#ef4444", gradient: "#f59e0b", light_bg: "#fff", dark_bg: "#0a0a0a" },
    sections: ["hero", "pain_points", "features", "comparison", "stats_highlight", "review", "guarantee", "cta"],
    heroLayout: "full_image",
    preview: {
      heroBg: "#0a0a0a",
      heroText: "#fff",
      accent: "#ef4444",
      bodyBg: "#fff",
      img: U("photo-1505740420928-5e560c06d30e"),
    },
  },
  // ═══ 6. 모던 그린 ═══
  {
    id: "modern_green",
    name: "모던 그린",
    desc: "친환경/유기농 컨셉에 어울리는 그린 톤 디자인",
    tags: ["farm", "food", "health", "pet"],
    palette: { main: "#2d6a4f", gradient: "#52b788", light_bg: "#f0fff4", dark_bg: "#1a2e1a" },
    sections: ["hero", "features", "point", "stats_highlight", "cert", "review", "cta"],
    heroLayout: "centered_text",
    preview: {
      heroBg: "#f0fff4",
      heroText: "#1a3a2a",
      accent: "#2d6a4f",
      bodyBg: "#f0fff4",
      img: U("photo-1542838132-92c53300491e"),
    },
  },
  // ═══ 7. 테크 블루 ═══
  {
    id: "tech_blue",
    name: "테크 블루",
    desc: "신뢰감 있는 블루 톤의 기술/전자제품 디자인",
    tags: ["tech", "education", "living"],
    palette: { main: "#2563eb", gradient: "#3b82f6", light_bg: "#eff6ff", dark_bg: "#0f172a" },
    sections: ["hero", "features", "comparison", "point", "stats_highlight", "faq", "cta"],
    heroLayout: "color_overlay",
    preview: {
      heroBg: "#0f172a",
      heroText: "#60a5fa",
      accent: "#2563eb",
      bodyBg: "#eff6ff",
      img: U("photo-1519389950473-47ba0277781c"),
    },
  },
  // ═══ 8. 따뜻한 오렌지 ═══
  {
    id: "warm_orange",
    name: "따뜻한 오렌지",
    desc: "활기차고 친근한 주황/노랑 톤 디자인",
    tags: ["food", "kids", "education", "pet"],
    palette: { main: "#ea580c", gradient: "#f59e0b", light_bg: "#fff7ed", dark_bg: "#431407" },
    sections: ["hero", "pain_points", "features", "point", "review", "stats_highlight", "cta"],
    heroLayout: "full_image",
    preview: {
      heroBg: "#fff7ed",
      heroText: "#7c2d12",
      accent: "#ea580c",
      bodyBg: "#fff7ed",
      img: U("photo-1565299624946-b28f40a0ae38"),
    },
  },
  // ═══ 9. 클래식 세리프 ═══
  {
    id: "classic_serif",
    name: "클래식 세리프",
    desc: "세리프 폰트 + 여백 중심의 전통적 고급 디자인",
    tags: ["food", "beauty", "fashion", "health"],
    palette: { main: "#44403c", gradient: "#78716c", light_bg: "#fafaf9", dark_bg: "#292524" },
    sections: ["hero", "point", "features", "stats_highlight", "review", "guarantee", "cta"],
    heroLayout: "centered_text",
    preview: {
      heroBg: "#fafaf9",
      heroText: "#292524",
      accent: "#44403c",
      bodyBg: "#fafaf9",
      img: U("photo-1559056199-641a0ac8b55e"),
    },
  },
  // ═══ 10. 비비드 퍼플 ═══
  {
    id: "vivid_purple",
    name: "비비드 퍼플",
    desc: "SNS메이킷 시그니처 퍼플 톤 디자인",
    tags: ["beauty", "fashion", "tech", "education"],
    palette: { main: "#7c6aff", gradient: "#a78bfa", light_bg: "#faf5ff", dark_bg: "#1e1b4b" },
    sections: ["hero", "features", "point", "comparison", "stats_highlight", "review", "cta"],
    heroLayout: "color_overlay",
    preview: {
      heroBg: "#1e1b4b",
      heroText: "#c4b5fd",
      accent: "#7c6aff",
      bodyBg: "#faf5ff",
      img: U("photo-1522335789203-aabd1fc54bc9"),
    },
  },
  // ═══ 11. 쿨 그레이 ═══
  {
    id: "cool_gray",
    name: "쿨 그레이",
    desc: "모노톤 그레이 기반의 세련된 미니멀 디자인",
    tags: ["tech", "living", "fashion"],
    palette: { main: "#374151", gradient: "#6b7280", light_bg: "#f3f4f6", dark_bg: "#111827" },
    sections: ["hero", "features", "point", "stats_highlight", "comparison", "cta"],
    heroLayout: "full_image",
    preview: {
      heroBg: "#f3f4f6",
      heroText: "#111827",
      accent: "#374151",
      bodyBg: "#f9fafb",
      img: U("photo-1493723843671-1d655e66ac1c"),
    },
  },
  // ═══ 12. 로즈 골드 ═══
  {
    id: "rose_gold",
    name: "로즈 골드",
    desc: "로즈골드 + 화이트의 여성 타겟 프리미엄 디자인",
    tags: ["beauty", "fashion", "health", "kids"],
    palette: { main: "#b76e79", gradient: "#d4a0a7", light_bg: "#fdf2f4", dark_bg: "#3d1f25" },
    sections: ["hero", "features", "point", "review", "stats_highlight", "guarantee", "cta"],
    heroLayout: "centered_text",
    preview: {
      heroBg: "#fdf2f4",
      heroText: "#6b2130",
      accent: "#b76e79",
      bodyBg: "#fdf2f4",
      img: U("photo-1571781926291-c477ebfd024b"),
    },
  },
];

/** 카테고리 키 → 추천 템플릿 필터 */
export function getRecommendedTemplates(catKey) {
  if (!catKey) return TEMPLATE_RECIPES;
  return [
    ...TEMPLATE_RECIPES.filter(t => t.tags.includes(catKey)),
    ...TEMPLATE_RECIPES.filter(t => !t.tags.includes(catKey)),
  ];
}
