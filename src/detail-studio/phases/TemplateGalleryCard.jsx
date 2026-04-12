import React from "react";

/**
 * 상세페이지 템플릿 미니 프리뷰 카드
 * 오리지널 CSS 렌더링 — 실제 상세페이지 레이아웃을 축소해서 보여줌
 * Unsplash 무료 이미지 사용
 */
export default function TemplateGalleryCard({ recipe, selected, onClick, isDark }) {
  const sel = selected;
  const p = recipe.preview;
  const heroDark = isDarkColor(p.heroBg);
  const statsDark = isDarkColor(p.statsBg);

  return (
    <button onClick={onClick}
      style={{
        padding: 0,
        border: `2.5px solid ${sel ? "#7c6aff" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", textAlign: "left",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        boxShadow: sel ? "0 0 0 3px rgba(124,106,255,0.2), 0 6px 20px rgba(124,106,255,0.12)" : "0 1px 4px rgba(0,0,0,0.05)",
        transform: sel ? "scale(1.02)" : "scale(1)",
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        fontFamily: "inherit", width: "100%", position: "relative",
      }}
      onMouseEnter={e => { if (!sel) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}}
      onMouseLeave={e => { if (!sel) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}}
    >
      {/* ── 미니 상세페이지 (실제 레이아웃 축소) ── */}
      <div style={{ width: "100%", aspectRatio: "9/16", overflow: "hidden", position: "relative", fontSize: 0 }}>

        {/* 1. 히어로 섹션 (38%) */}
        <div style={{
          height: "38%", background: p.heroBg, position: "relative", overflow: "hidden",
        }}>
          <img src={p.heroImg} alt="" loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: heroDark ? 0.5 : 0.25 }}
            onError={e => { e.target.style.display = "none"; }}
          />
          <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 10px 10px" }}>
            {/* 서브타이틀 */}
            <div style={{ width: 32, height: 2.5, borderRadius: 1, background: p.accentColor, marginBottom: 4, opacity: 0.8 }} />
            {/* 메인 타이틀 */}
            <div style={{ width: "75%", height: 5, borderRadius: 1.5, background: heroDark ? "#fff" : "#1a1a2e", marginBottom: 3, opacity: 0.9 }} />
            <div style={{ width: "50%", height: 4, borderRadius: 1, background: heroDark ? "#fff" : "#1a1a2e", marginBottom: 3, opacity: 0.5 }} />
            {/* 서브 텍스트 */}
            <div style={{ width: "40%", height: 2.5, borderRadius: 1, background: heroDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.25)" }} />
          </div>
        </div>

        {/* 2. 특장점 카드 섹션 (22%) */}
        <div style={{ height: "22%", background: p.cardBg, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          {/* 섹션 타이틀 */}
          <div style={{ width: "45%", height: 3.5, borderRadius: 1, background: p.accentColor, marginBottom: 2, opacity: 0.8, marginLeft: "auto", marginRight: "auto" }} />
          {/* 3개 특징 카드 */}
          <div style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 1, padding: "4px 3px", borderRadius: 3,
                background: isDarkColor(p.cardBg) ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
                border: `0.5px solid ${isDarkColor(p.cardBg) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                textAlign: "center",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.accentColor + "25", margin: "0 auto 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.accentColor }} />
                </div>
                <div style={{ width: "70%", height: 2, borderRadius: 1, background: isDarkColor(p.cardBg) ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)", margin: "0 auto 1px" }} />
                <div style={{ width: "50%", height: 1.5, borderRadius: 1, background: isDarkColor(p.cardBg) ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", margin: "0 auto" }} />
              </div>
            ))}
          </div>
        </div>

        {/* 3. 포인트 섹션 — 이미지+텍스트 (18%) */}
        <div style={{ height: "18%", background: p.heroBg === "#fff" || p.heroBg === "#ffffff" ? "#fafafa" : p.heroBg, padding: "5px 8px", display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ width: "40%", height: "85%", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
            <img src={p.heroImg} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ width: "60%", height: 3, borderRadius: 1, background: p.accentColor, opacity: 0.7 }} />
            <div style={{ width: "90%", height: 2, borderRadius: 1, background: heroDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)" }} />
            <div style={{ width: "75%", height: 2, borderRadius: 1, background: heroDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
            <div style={{ width: "80%", height: 2, borderRadius: 1, background: heroDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
          </div>
        </div>

        {/* 4. 통계 하이라이트 (12%) */}
        <div style={{ height: "12%", background: p.statsBg, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
          {["98%", "4.9", "1만+"].map((n, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: p.accentColor, lineHeight: 1 }}>{n}</div>
              <div style={{ width: 18, height: 1.5, borderRadius: 1, background: statsDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", marginTop: 2, marginLeft: "auto", marginRight: "auto" }} />
            </div>
          ))}
        </div>

        {/* 5. CTA 버튼 (10%) */}
        <div style={{ height: "10%", background: p.cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: "3px 16px", borderRadius: 4, background: p.accentColor }}>
            <div style={{ width: 24, height: 2.5, borderRadius: 1, background: "#fff" }} />
          </div>
        </div>

        {/* 선택 체크 */}
        {sel && (
          <div style={{
            position: "absolute", top: 5, right: 5, width: 22, height: 22,
            borderRadius: "50%", background: "#7c6aff",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5, boxShadow: "0 2px 6px rgba(124,106,255,0.5)",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>

      {/* 하단 라벨 */}
      <div style={{ padding: "7px 9px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: sel ? "#7c6aff" : (isDark ? "#fff" : "#1a1a2e"), marginBottom: 1 }}>{recipe.name}</div>
        <div style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.4)" : "#999", lineHeight: 1.3 }}>{recipe.desc}</div>
      </div>
    </button>
  );
}

function isDarkColor(color) {
  if (!color) return false;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
