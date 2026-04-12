/**
 * 상세페이지 완성형 템플릿 레시피
 * 실제 PicCopilot 스타일 프리뷰 이미지 (public/templates/)
 */

export const TEMPLATE_RECIPES = [
  // 식품 - 커피/텀블러 (베이지 내추럴)
  { id: "t01", name: "내추럴 크림", desc: "따뜻한 크림톤 + 자연 감성", tags: ["food","farm","living"], img: "/templates/0d04de1b66ef4900a282e3851f348e93.png", palette: { main: "#8B7355", gradient: "#A69279", light_bg: "#f9f6f2", dark_bg: "#2c2c2c" }, sections: ["hero","features","point","point","stats_highlight","review","cta"] },
  // 캔들/향초 (다크 럭셔리)
  { id: "t02", name: "럭셔리 다크", desc: "다크 배경 + 골드 포인트", tags: ["beauty","living","fashion"], img: "/templates/1c9fb6b63a86432c85e95652671b92e6.png", palette: { main: "#c9a961", gradient: "#b8956a", light_bg: "#f5f5f5", dark_bg: "#1a1a2e" }, sections: ["hero","pain_points","features","point","comparison","guarantee","cta"] },
  // 과일/식품 (오렌지 생동감)
  { id: "t03", name: "따뜻한 오렌지", desc: "활기차고 친근한 주황톤", tags: ["food","farm","kids"], img: "/templates/2fb6ffae71864128b732c3112be43f90.png", palette: { main: "#ea580c", gradient: "#f59e0b", light_bg: "#fff7ed", dark_bg: "#431407" }, sections: ["hero","features","point","review","stats_highlight","cta"] },
  // 뷰티/스킨케어 (베이지 내추럴)
  { id: "t04", name: "스킨 내추럴", desc: "부드러운 베이지 + 스킨케어 감성", tags: ["beauty","health"], img: "/templates/3b7c13161cc3434dbb96fb093183588e.png", palette: { main: "#a08060", gradient: "#c4a882", light_bg: "#faf6f0", dark_bg: "#2c2420" }, sections: ["hero","features","point","stats_highlight","cert","review","cta"] },
  // 초콜릿/베이커리 (브라운 프리미엄)
  { id: "t05", name: "초콜릿 프리미엄", desc: "깊은 브라운 + 달콤한 감성", tags: ["food","farm"], img: "/templates/5e37caa8d7a3410aa1d9734ac0e015ce.png", palette: { main: "#5c3317", gradient: "#8b5a2b", light_bg: "#fdf2e9", dark_bg: "#1a0f07" }, sections: ["hero","features","point","point","review","cta"] },
  // 떡/전통식품 (그린 내추럴)
  { id: "t06", name: "모던 그린", desc: "친환경/유기농 컨셉 그린톤", tags: ["food","farm","health"], img: "/templates/8a1f22e17bed42eb996387b9b0cc0efc.png", palette: { main: "#2d6a4f", gradient: "#52b788", light_bg: "#f0fff4", dark_bg: "#1a2e1a" }, sections: ["hero","features","point","stats_highlight","review","cta"] },
  // 물병/키즈 (파스텔 컬러풀)
  { id: "t07", name: "소프트 파스텔", desc: "부드러운 파스텔 + 귀여운 느낌", tags: ["kids","pet","living"], img: "/templates/353be963d89a433ea910ca13dac6d788.jpg", palette: { main: "#d4829c", gradient: "#7ec8e3", light_bg: "#fef7f7", dark_bg: "#2c2035" }, sections: ["hero","features","point","review","cta"] },
  // 케이크/디저트 (로즈 골드)
  { id: "t08", name: "로즈 골드", desc: "로즈골드 + 화이트 프리미엄", tags: ["food","beauty","fashion"], img: "/templates/d3f2652ada86427abb6dff3353a3898e.png", palette: { main: "#b76e79", gradient: "#d4a0a7", light_bg: "#fdf2f4", dark_bg: "#3d1f25" }, sections: ["hero","features","point","review","guarantee","cta"] },
  // 육포/미트 (주황 볼드)
  { id: "t09", name: "볼드 임팩트", desc: "강렬한 대비 + 임팩트 디자인", tags: ["food","farm"], img: "/templates/cb9061b4cc3c48a2b6b2356a67dd24ec.png", palette: { main: "#ef4444", gradient: "#f59e0b", light_bg: "#fff", dark_bg: "#0a0a0a" }, sections: ["hero","pain_points","features","comparison","stats_highlight","cta"] },
  // 빵/베이커리 (크림 내추럴)
  { id: "t10", name: "클래식 세리프", desc: "세리프 폰트 + 여백 중심 고급 디자인", tags: ["food","beauty","fashion"], img: "/templates/fa18f66814284d87ad98570554af0d46.png", palette: { main: "#44403c", gradient: "#78716c", light_bg: "#fafaf9", dark_bg: "#292524" }, sections: ["hero","point","features","stats_highlight","review","cta"] },
  // 바나나칩/건과 (옐로우)
  { id: "t11", name: "선샤인 옐로우", desc: "밝고 건강한 옐로우톤", tags: ["food","farm","health","kids"], img: "/templates/ef69bcc313164592bd784098681b5a1e.png", palette: { main: "#d97706", gradient: "#fbbf24", light_bg: "#fefce8", dark_bg: "#451a03" }, sections: ["hero","features","point","stats_highlight","review","cta"] },
  // 미니멀 클린
  { id: "t12", name: "미니멀 클린", desc: "화이트 배경에 여백을 살린 깔끔한 디자인", tags: ["tech","living","beauty"], img: "/templates/86c7309269a84683ae6aa7258714c5ff.png", palette: { main: "#1a1a2e", gradient: "#555", light_bg: "#fff", dark_bg: "#1a1a2e" }, sections: ["hero","features","point","stats_highlight","review","cta"] },
  // 추가 이미지들 (다양한 카테고리)
  { id: "t13", name: "프레시 그린", desc: "신선하고 건강한 그린 톤", tags: ["food","farm","health"], img: "/templates/3ef55d894cbb4186819682c6c8556619.png", palette: { main: "#16a34a", gradient: "#4ade80", light_bg: "#f0fdf4", dark_bg: "#052e16" }, sections: ["hero","features","point","review","cta"] },
  { id: "t14", name: "모던 블랙", desc: "세련된 블랙 + 화이트 대비", tags: ["tech","fashion","beauty"], img: "/templates/83c1792991a94e7783f2bd37c6f4de63.png", palette: { main: "#111", gradient: "#333", light_bg: "#f5f5f5", dark_bg: "#000" }, sections: ["hero","features","comparison","point","cta"] },
  { id: "t15", name: "소프트 베이지", desc: "부드러운 베이지 + 우아한 디자인", tags: ["beauty","fashion","living"], img: "/templates/9adaa8a45c814e23b35bf1de2a6b6c0b.png", palette: { main: "#8B7355", gradient: "#c4a882", light_bg: "#faf6f0", dark_bg: "#2c2420" }, sections: ["hero","features","point","review","guarantee","cta"] },
  { id: "t16", name: "비비드 퍼플", desc: "SNS메이킷 시그니처 퍼플톤", tags: ["tech","education","beauty"], img: "/templates/86189afa208f449481c994457023cbdd.png", palette: { main: "#7c6aff", gradient: "#a78bfa", light_bg: "#faf5ff", dark_bg: "#1e1b4b" }, sections: ["hero","features","point","comparison","stats_highlight","cta"] },
  { id: "t17", name: "테크 블루", desc: "신뢰감 있는 블루 톤", tags: ["tech","education","living"], img: "/templates/8adf7be2203a4bc59f80ef1e50321a03.png", palette: { main: "#2563eb", gradient: "#3b82f6", light_bg: "#eff6ff", dark_bg: "#0f172a" }, sections: ["hero","features","comparison","point","faq","cta"] },
  { id: "t18", name: "쿨 그레이", desc: "모노톤 미니멀 디자인", tags: ["tech","living","fashion"], img: "/templates/8f240126f7654ad79e61546974d2e199.png", palette: { main: "#374151", gradient: "#6b7280", light_bg: "#f3f4f6", dark_bg: "#111827" }, sections: ["hero","features","point","stats_highlight","cta"] },
  { id: "t19", name: "코럴 핑크", desc: "따뜻한 핑크 + 여성 타겟", tags: ["beauty","fashion","kids"], img: "/templates/a0b996881520461394ab71625eb7f61e.png", palette: { main: "#e11d48", gradient: "#fb7185", light_bg: "#fff1f2", dark_bg: "#4c0519" }, sections: ["hero","features","point","review","cta"] },
  { id: "t20", name: "어스 브라운", desc: "따뜻한 브라운 + 자연 질감", tags: ["food","farm","living"], img: "/templates/ab8ea157c7374718b1a4cd81e8f1608d.png", palette: { main: "#78350f", gradient: "#a16207", light_bg: "#fef3c7", dark_bg: "#1c1003" }, sections: ["hero","features","point","stats_highlight","review","cta"] },
  { id: "t21", name: "라이트 민트", desc: "시원하고 깨끗한 민트톤", tags: ["health","beauty","living","kids"], img: "/templates/b5c786dcf6324e47a01205d9370d08ff.png", palette: { main: "#0d9488", gradient: "#2dd4bf", light_bg: "#f0fdfa", dark_bg: "#042f2e" }, sections: ["hero","features","point","review","cta"] },
  { id: "t22", name: "골드 프리미엄", desc: "골드 액센트 + 고급 감성", tags: ["food","beauty","fashion"], img: "/templates/ba0052d6e01f4c1693f50511438a09c0.png", palette: { main: "#b8860b", gradient: "#daa520", light_bg: "#fffbeb", dark_bg: "#1a1000" }, sections: ["hero","features","point","guarantee","stats_highlight","cta"] },
  { id: "t23", name: "포레스트", desc: "깊은 그린 + 자연 감성", tags: ["farm","food","health","pet"], img: "/templates/bfe9604f6ae04b578fdb496d9c8b1f16.png", palette: { main: "#166534", gradient: "#15803d", light_bg: "#f0fdf4", dark_bg: "#052e16" }, sections: ["hero","features","point","cert","review","cta"] },
  { id: "t24", name: "스톤 그레이", desc: "차분한 그레이 + 모던 미니멀", tags: ["tech","living","fashion"], img: "/templates/c53a46d50d9f4a5bb6031a852c0466e8.png", palette: { main: "#57534e", gradient: "#78716c", light_bg: "#fafaf9", dark_bg: "#1c1917" }, sections: ["hero","features","point","comparison","cta"] },
];

/** 카테고리 키 → 추천 템플릿 우선 정렬 */
export function getRecommendedTemplates(catKey) {
  if (!catKey) return TEMPLATE_RECIPES;
  return [
    ...TEMPLATE_RECIPES.filter(t => t.tags.includes(catKey)),
    ...TEMPLATE_RECIPES.filter(t => !t.tags.includes(catKey)),
  ];
}
