import React from "react";

const DESIGN_STYLES = [
  {
    id: "minimal_modern", label: "미니멀 모던", desc: "넉넉한 여백, 깔끔한 타이포",
    categories: ["가전", "패션", "default"],
    preview: { hero: "#111", sec1: "#fff", sec2: "#f5f5f5", acc: "#333", font: "가는 산세리프" },
    colors: ["#111111", "#ffffff", "#f5f5f5", "#333333"],
    heroLayout: "full_image", fontStyle: "light",
    rules: "여백 넉넉, 가는 산세리프, 좌우 분할 레이아웃 선호, 흑백+포인트 1색, 이미지 중심",
  },
  {
    id: "premium_warm", label: "프리미엄 웜", desc: "따뜻한 크림톤, 고급스러운",
    categories: ["식품", "건강", "default"],
    preview: { hero: "#2c2218", sec1: "#f9f6f2", sec2: "#f5f0eb", acc: "#c49a6c", font: "세리프" },
    colors: ["#2c2218", "#f9f6f2", "#f5f0eb", "#c49a6c"],
    heroLayout: "full_image", fontStyle: "serif",
    rules: "크림+다크 교차, 세리프 포인트, 따뜻한 어스톤, 풀블리드 이미지",
  },
  {
    id: "clean_beauty", label: "클린 뷰티", desc: "소프트 파스텔, 투명한 느낌",
    categories: ["뷰티", "건강"],
    preview: { hero: "#faf5f5", sec1: "#fff", sec2: "#f8f5f2", acc: "#d4a0a0", font: "라운드" },
    colors: ["#faf5f5", "#ffffff", "#f8f5f2", "#d4a0a0"],
    heroLayout: "left_image_right_text", fontStyle: "round",
    rules: "소프트 파스텔, 라운드 코너 강조, 제품 클로즈업 중심, 깔끔한 여백",
  },
  {
    id: "magazine_editorial", label: "매거진 에디토리얼", desc: "비대칭 그리드, 패션 무드",
    categories: ["패션"],
    preview: { hero: "#111", sec1: "#fff", sec2: "#f0f0f0", acc: "#111", font: "콘덴스드" },
    colors: ["#111111", "#ffffff", "#f0f0f0", "#111111"],
    heroLayout: "collection_intro", fontStyle: "condensed",
    rules: "큰 이미지+작은 텍스트, 비대칭 그리드, 모노톤+포인트 1색, 강한 타이포",
  },
  {
    id: "tech_pro", label: "테크 프로", desc: "다크 베이스, 정보형 레이아웃",
    categories: ["가전"],
    preview: { hero: "#0f0f1a", sec1: "#f0f2f5", sec2: "#fff", acc: "#4a7dff", font: "산세리프" },
    colors: ["#0f0f1a", "#f0f2f5", "#ffffff", "#4a7dff"],
    heroLayout: "full_image", fontStyle: "tech",
    rules: "다크 히어로, 쿨그레이 중성톤, 정돈된 그리드, 아이콘+텍스트 정보형",
  },
  {
    id: "natural_organic", label: "내추럴 오가닉", desc: "자연 질감, 어스톤",
    categories: ["건강", "식품"],
    preview: { hero: "#3a3530", sec1: "#f5f0eb", sec2: "#faf7f3", acc: "#7a8c6e", font: "내추럴" },
    colors: ["#3a3530", "#f5f0eb", "#faf7f3", "#7a8c6e"],
    heroLayout: "full_image", fontStyle: "natural",
    rules: "어스톤, 자연 질감 배경, 부드러운 곡선, 그린/브라운 포인트",
  },
  {
    id: "bold_pop", label: "볼드 팝", desc: "강렬한 컬러, 에너지 넘치는",
    categories: ["식품", "default"],
    preview: { hero: "#1a1a2e", sec1: "#fff", sec2: "#fff5f5", acc: "#ff4757", font: "볼드" },
    colors: ["#1a1a2e", "#ffffff", "#fff5f5", "#ff4757"],
    heroLayout: "full_image", fontStyle: "bold",
    rules: "강렬한 포인트 컬러, 큰 볼드 타이포, 에너지 넘치는 카피, 다이나믹 레이아웃",
  },
  {
    id: "luxury_dark", label: "럭셔리 다크", desc: "블랙+골드, 하이엔드",
    categories: ["뷰티", "패션", "가전"],
    preview: { hero: "#0a0a0a", sec1: "#1a1a1a", sec2: "#111", acc: "#c9a96e", font: "세리프" },
    colors: ["#0a0a0a", "#1a1a1a", "#111111", "#c9a96e"],
    heroLayout: "full_image", fontStyle: "luxury",
    rules: "블랙 베이스, 골드 포인트, 세리프 타이포, 고급스러운 여백, 그라데이션 활용",
  },
  {
    id: "fresh_green", label: "프레시 그린", desc: "청량한 그린톤, 건강한",
    categories: ["건강", "식품"],
    preview: { hero: "#f0f5ef", sec1: "#fff", sec2: "#f5f8f4", acc: "#4a9e5c", font: "클린" },
    colors: ["#f0f5ef", "#ffffff", "#f5f8f4", "#4a9e5c"],
    heroLayout: "left_image_right_text", fontStyle: "clean",
    rules: "밝은 그린톤 배경, 청량한 느낌, 건강/신선 이미지 강조, 깨끗한 레이아웃",
  },
  {
    id: "soft_beige", label: "소프트 베이지", desc: "부드러운 베이지, 편안한",
    categories: ["default", "식품", "건강"],
    preview: { hero: "#f7f3ef", sec1: "#fff", sec2: "#faf7f3", acc: "#a68b6b", font: "소프트" },
    colors: ["#f7f3ef", "#ffffff", "#faf7f3", "#a68b6b"],
    heroLayout: "centered_text", fontStyle: "soft",
    rules: "베이지+화이트 교차, 부드러운 톤, 편안한 가독성, 따뜻한 느낌",
  },
  {
    id: "monochrome", label: "모노크롬", desc: "흑백 그래픽, 모던",
    categories: ["패션", "가전"],
    preview: { hero: "#000", sec1: "#fff", sec2: "#f5f5f5", acc: "#000", font: "모노" },
    colors: ["#000000", "#ffffff", "#f5f5f5", "#000000"],
    heroLayout: "full_image", fontStyle: "mono",
    rules: "순수 흑백, 컬러 최소화, 그래픽적 레이아웃, 강한 대비, 타이포 중심",
  },
  {
    id: "playful_pastel", label: "플레이풀 파스텔", desc: "밝은 파스텔, 친근한",
    categories: ["default"],
    preview: { hero: "#fff", sec1: "#f8f5ff", sec2: "#fff5f8", acc: "#9b7dff", font: "라운드" },
    colors: ["#ffffff", "#f8f5ff", "#fff5f8", "#9b7dff"],
    heroLayout: "left_image_right_text", fontStyle: "playful",
    rules: "밝은 파스텔 교차, 라운드 코너, 친근한 카피, 아이콘 활용",
  },
];

function MiniPreview({ style, selected }) {
  const { hero, sec1, sec2, acc } = style.preview;
  return (
    <div style={{ width: "100%", aspectRatio: "3/4", borderRadius: 12, overflow: "hidden", background: "#f5f5f5", position: "relative" }}>
      {/* Hero */}
      <div style={{ height: "35%", background: hero, position: "relative", display: "flex", alignItems: "flex-end", padding: "0 12px 8px" }}>
        <div>
          <div style={{ width: 60, height: 5, borderRadius: 3, background: hero === "#fff" || hero === "#f0f5ef" || hero === "#faf5f5" || hero === "#f7f3ef" ? "#333" : "#fff", marginBottom: 4, opacity: 0.9 }} />
          <div style={{ width: 40, height: 3, borderRadius: 2, background: hero === "#fff" || hero === "#f0f5ef" || hero === "#faf5f5" || hero === "#f7f3ef" ? "#666" : "rgba(255,255,255,0.5)" }} />
        </div>
      </div>
      {/* Section 1 — Features */}
      <div style={{ height: "30%", background: sec1, padding: "8px 12px" }}>
        <div style={{ width: 40, height: 3, borderRadius: 2, background: sec1 === "#fff" || sec1 === "#f8f5ff" || sec1 === "#f0f2f5" ? "#222" : "#fff", marginBottom: 6, opacity: 0.8 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 24, borderRadius: 4, background: acc + "18", border: `1px solid ${acc}30` }} />
          ))}
        </div>
      </div>
      {/* Section 2 — CTA */}
      <div style={{ height: "35%", background: sec2, padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: acc + "20", border: `1px solid ${acc}30` }} />
        <div style={{ width: 50, height: 3, borderRadius: 2, background: sec2 === "#fff" || sec2.startsWith("#f") ? "#333" : "#fff", opacity: 0.7 }} />
        <div style={{ width: 44, height: 14, borderRadius: 7, background: acc, opacity: 0.85 }} />
      </div>
      {/* Selected overlay */}
      {selected && (
        <div style={{ position: "absolute", inset: 0, border: "3px solid #7c6aff", borderRadius: 12, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", background: "#7c6aff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesignStylePicker({ designStyle, setDesignStyle, category, acc, text, muted, bdr, D, isMobile }) {
  const catLabel = {
    "food": "식품", "beauty": "뷰티", "fashion": "패션", "electronics": "가전",
    "health": "건강", "agriculture": "식품", "kitchen": "가전",
  }[category] || "default";

  // 카테고리에 맞는 스타일 우선 정렬
  const sorted = [...DESIGN_STYLES].sort((a, b) => {
    const aMatch = a.categories.includes(catLabel) ? 1 : 0;
    const bMatch = b.categories.includes(catLabel) ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <div style={{ marginBottom: 26 }}>
      <label style={{ fontSize: 15, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        디자인 스타일
        <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>선택하면 전체 디자인 톤이 결정됩니다</span>
      </label>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? 8 : 12,
        marginTop: 10,
      }}>
        {sorted.map(style => (
          <div
            key={style.id}
            onClick={() => setDesignStyle(designStyle === style.id ? null : style.id)}
            style={{
              cursor: "pointer",
              borderRadius: 14,
              overflow: "hidden",
              border: designStyle === style.id ? `2px solid ${acc}` : `1px solid ${bdr}`,
              background: D ? "rgba(255,255,255,0.03)" : "#fff",
              transition: "all 0.2s",
              transform: designStyle === style.id ? "scale(1.02)" : "none",
              boxShadow: designStyle === style.id ? `0 4px 16px ${acc}25` : "none",
            }}
          >
            <MiniPreview style={style} selected={designStyle === style.id} />
            <div style={{ padding: isMobile ? "6px 6px 8px" : "8px 10px 10px" }}>
              <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: text, lineHeight: 1.3 }}>{style.label}</div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: muted, marginTop: 2, lineHeight: 1.3 }}>{style.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { DESIGN_STYLES };
