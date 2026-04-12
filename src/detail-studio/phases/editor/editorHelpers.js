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
  { key: "pages", icon: "\u2630", label: "\ud398\uc774\uc9c0" },
  { key: "text", icon: "T", label: "\ud14d\uc2a4\ud2b8" },
  { key: "templates", icon: "\u25a6", label: "\ud15c\ud50c\ub9bf" },
  { key: "shapes", icon: "\u25c7", label: "\ub3c4\ud615" },
  { key: "media", icon: "+", label: "\uc790\ub8cc" },
  { key: "color", icon: "\u25d0", label: "\uc0c9\uc0c1" },
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
  { label: "\uc57d\ud558\uac8c", val: "0 1px 4px rgba(0,0,0,0.15)" },
  { label: "\ubcf4\ud1b5", val: "0 2px 8px rgba(0,0,0,0.3)" },
  { label: "\uac15\ud558\uac8c", val: "0 4px 16px rgba(0,0,0,0.5)" },
  { label: "\ub124\uc628", val: null }, // acc 의존 — 런타임에 생성
  { label: "\uc785\uccb4", val: "2px 2px 0 rgba(0,0,0,0.3)" },
  { label: "\uae00\ub85c\uc6b0", val: "0 0 20px rgba(255,255,255,0.5)" },
];

/** 배경박스 프리셋 색상 */
export const BG_BOX_COLORS = [
  { color: "rgba(0,0,0,0.04)", label: "\uc5f0\ud55c" },
  { color: "rgba(0,0,0,0.15)", label: "\uc911\uac04" },
  { color: "rgba(0,0,0,0.4)", label: "\uc9c4\ud55c" },
  { color: null, label: "\ud3ec\uc778\ud2b8 \uc5f0" },   // acc + "15"
  { color: null, label: "\ud3ec\uc778\ud2b8" },           // acc + "30"
  { color: null, label: "\ud3ec\uc778\ud2b8 \uc9c4" },    // acc
  { color: "rgba(255,255,255,0.1)", label: "\ud654\uc774\ud2b8" },
  { color: "rgba(255,255,255,0.25)", label: "\ud654\uc774\ud2b8 \uc9c4" },
];

/** 도형 정의 */
export function getShapeDefs(acc) {
  return [
    { shape: "rect", label: "\uc0ac\uac01\ud615", svg: `<rect x="4" y="8" width="32" height="24" rx="2" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "rect_round", label: "\ub465\uadfc \uc0ac\uac01\ud615", svg: `<rect x="4" y="8" width="32" height="24" rx="8" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "circle", label: "\uc6d0\ud615", svg: `<circle cx="20" cy="20" r="14" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "ellipse", label: "\ud0c0\uc6d0", svg: `<ellipse cx="20" cy="20" rx="16" ry="10" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "triangle", label: "\uc0bc\uac01\ud615", svg: `<polygon points="20,4 36,36 4,36" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "diamond", label: "\ub9c8\ub984\ubaa8", svg: `<polygon points="20,4 36,20 20,36 4,20" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "star", label: "\ubcc4", svg: `<polygon points="20,2 24,14 37,14 27,22 31,35 20,27 9,35 13,22 3,14 16,14" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "hexagon", label: "\uc721\uac01\ud615", svg: `<polygon points="20,2 35,10 35,26 20,34 5,26 5,10" fill="${acc}20" stroke="${acc}"/>` },
    { shape: "line_h", label: "\uac00\ub85c\uc120", svg: `<line x1="4" y1="20" x2="36" y2="20" stroke="${acc}" stroke-width="3"/>` },
    { shape: "line_v", label: "\uc138\ub85c\uc120", svg: `<line x1="20" y1="4" x2="20" y2="36" stroke="${acc}" stroke-width="3"/>` },
    { shape: "arrow_r", label: "\ud654\uc0b4\ud45c \u2192", svg: `<line x1="4" y1="20" x2="32" y2="20" stroke="${acc}" stroke-width="2.5"/><polygon points="28,14 36,20 28,26" fill="${acc}"/>` },
    { shape: "badge_pill", label: "\ud544", svg: `<rect x="2" y="12" width="36" height="16" rx="8" fill="${acc}" /><text x="20" y="23" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">BADGE</text>` },
  ];
}

/** 테마 프리셋 */
export function getThemePresets(colorPalette) {
  return [
    { name: "\ub0b4\ucd94\ub7f4 \ud06c\ub9bc", main: "#8B7355", gradient: "#A69279", light: "#f9f6f2", dark: "#2c2c2c", desc: "\ub530\ub73b\ud55c \ud06c\ub9bc\ud1a4" },
    { name: "\ubaa8\ub358 \ub2e4\ud06c", main: "#c9a961", gradient: "#b8956a", light: "#f5f5f5", dark: "#1a1a2e", desc: "\uace0\uae09 \ub2e4\ud06c+\uace8\ub4dc" },
    { name: "\ud074\ub9b0 \ud654\uc774\ud2b8", main: colorPalette?.main || "#7c6aff", gradient: colorPalette?.gradient || "#9b8ec4", light: "#ffffff", dark: "#111111", desc: "\uae54\ub054\ud55c \ubaa8\ub178\ud1a4" },
  ];
}
