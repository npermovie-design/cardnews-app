/**
 * EditorPhase 공통 헬퍼 — 반복되는 element/section 업데이트 패턴 추출
 */

/** 선택된 요소의 단일 속성 업데이트 */
export function updateEl(key, val, { setSections, selectedEl, setSelectedEl }) {
  if (!selectedEl) return;
  const { secIdx, elIdx } = selectedEl;
  setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
    ...s,
    elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : { ...el, [key]: val }),
  }));
  setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, [key]: val } } : prev);
}

/** 선택된 요소의 여러 속성 일괄 업데이트 */
export function updateElMulti(updates, { setSections, selectedEl, setSelectedEl }) {
  if (!selectedEl) return;
  const { secIdx, elIdx } = selectedEl;
  setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
    ...s,
    elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : { ...el, ...updates }),
  }));
  setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, ...updates } } : prev);
}

/** 선택된 섹션의 imgProps 업데이트 */
export function updateImgProp(key, val, { setSections, selectedEl, setSelectedEl }) {
  if (!selectedEl) return;
  setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
    ...s, imgProps: { ...s.imgProps, [key]: val },
  }));
  setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, [key]: val } } : prev);
}

/** 활성 섹션의 단일 속성 업데이트 */
export function updateSection(key, val, { setSections, activeSection }) {
  setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, [key]: val }));
}

/** 사이드바 탭 정의 */
export const SIDEBAR_TABS = [
  { key: "pages", icon: "☰", label: "페이지" },
  { key: "text", icon: "T", label: "텍스트" },
  { key: "templates", icon: "▦", label: "템플릿" },
  { key: "shapes", icon: "◇", label: "도형" },
  { key: "media", icon: "+", label: "자료" },
  { key: "color", icon: "◐", label: "색상" },
];

/** 폰트 목록 */
export const FONT_LIST = [
  { id: "Pretendard", label: "Pretendard" },
  { id: "'Noto Sans KR'", label: "Noto Sans KR" },
  { id: "SBAggroB", label: "SB Aggro Bold" },
  { id: "'Cafe24Ssurround'", label: "Cafe24 Ssurround" },
  { id: "MaruBuri", label: "MaruBuri" },
  { id: "'GmarketSans'", label: "Gmarket Sans" },
  { id: "serif", label: "Serif" },
  { id: "monospace", label: "Monospace" },
];

/** 그림자 프리셋 */
export const SHADOW_PRESETS = [
  { label: "약하게", val: "0 1px 4px rgba(0,0,0,0.15)" },
  { label: "보통", val: "0 2px 8px rgba(0,0,0,0.3)" },
  { label: "강하게", val: "0 4px 16px rgba(0,0,0,0.5)" },
  { label: "네온", val: null }, // acc 의존 — 런타임에 생성
  { label: "입체", val: "2px 2px 0 rgba(0,0,0,0.3)" },
  { label: "글로우", val: "0 0 20px rgba(255,255,255,0.5)" },
];

/** 배경박스 프리셋 색상 */
export const BG_BOX_COLORS = [
  { color: "rgba(0,0,0,0.04)", label: "연한" },
  { color: "rgba(0,0,0,0.15)", label: "중간" },
  { color: "rgba(0,0,0,0.4)", label: "진한" },
  { color: null, label: "포인트 연" },   // acc + "15"
  { color: null, label: "포인트" },           // acc + "30"
  { color: null, label: "포인트 진" },    // acc
  { color: "rgba(255,255,255,0.1)", label: "화이트" },
  { color: "rgba(255,255,255,0.25)", label: "화이트 진" },
];

/** 도형 정의 */
export function getShapeDefs(acc) {
  return [
    { shape: "rect", label: "사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="2" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "rect_round", label: "둥근 사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="8" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "circle", label: "원형", svg: `<circle cx="20" cy="20" r="14" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "ellipse", label: "타원", svg: `<ellipse cx="20" cy="20" rx="16" ry="10" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "triangle", label: "삼각형", svg: `<polygon points="20,4 36,36 4,36" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "diamond", label: "마름모", svg: `<polygon points="20,4 36,20 20,36 4,20" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "star", label: "별", svg: `<polygon points="20,2 24,14 37,14 27,22 31,35 20,27 9,35 13,22 3,14 16,14" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "hexagon", label: "육각형", svg: `<polygon points="20,2 35,10 35,26 20,34 5,26 5,10" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "line_h", label: "가로선", svg: `<line x1="4" y1="20" x2="36" y2="20" stroke="${acc}" stroke-width="3"/>` },
    { shape: "line_v", label: "세로선", svg: `<line x1="20" y1="4" x2="20" y2="36" stroke="${acc}" stroke-width="3"/>` },
    { shape: "arrow_r", label: "화살표 →", svg: `<line x1="4" y1="20" x2="32" y2="20" stroke="${acc}" stroke-width="2.5"/><polygon points="28,14 36,20 28,26" fill="${acc}"/>` },
    { shape: "badge_pill", label: "필", svg: `<rect x="2" y="12" width="36" height="16" rx="8" fill="${acc}" /><text x="20" y="23" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">BADGE</text>` },
  ];
}

/** 테마 프리셋 */
export function getThemePresets(colorPalette) {
  return [
    { name: "내추럴 크림", main: "#8B7355", gradient: "#A69279", light: "#f9f6f2", dark: "#2c2c2c", desc: "따뜻한 크림톤" },
    { name: "모던 다크", main: "#c9a961", gradient: "#b8956a", light: "#f5f5f5", dark: "#1a1a2e", desc: "고급 다크+골드" },
    { name: "클린 화이트", main: colorPalette?.main || "#7c6aff", gradient: colorPalette?.gradient || "#9b8ec4", light: "#ffffff", dark: "#111111", desc: "깔끔한 모노톤" },
  ];
}
