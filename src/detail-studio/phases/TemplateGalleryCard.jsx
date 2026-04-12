import React from "react";

/**
 * 상세페이지 템플릿 미니 프리뷰 카드
 * PicCopilot 스타일 — 실제 상세페이지를 축소한 것처럼 보이는 CSS 렌더링
 */
export default function TemplateGalleryCard({ recipe, selected, onClick, isDark }) {
  const { preview, palette, name } = recipe;
  const { heroBg, heroText, accent, bodyBg, img } = preview;
  const sel = selected;

  // 밝은/어두운 배경 판별
  const isDarkBg = (color) => {
    if (!color) return false;
    const hex = color.replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  };

  const heroDark = isDarkBg(heroBg);
  const bodyDark = isDarkBg(bodyBg);
  const textOnBody = bodyDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)";
  const lineOnBody = bodyDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <button onClick={onClick}
      style={{
        padding: 0, border: `2.5px solid ${sel ? "#7c6aff" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", textAlign: "left",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        boxShadow: sel ? "0 0 0 3px rgba(124,106,255,0.25), 0 8px 24px rgba(124,106,255,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
        transform: sel ? "scale(1.02)" : "scale(1)",
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        fontFamily: "inherit", width: "100%", position: "relative",
      }}>

      {/* ── 미니 상세페이지 프리뷰 (실제 페이지 축소판) ── */}
      <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", position: "relative" }}>

        {/* 히어로 섹션 (상단 40%) */}
        <div style={{
          height: "40%", background: heroBg, position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        }}>
          {/* 배경 이미지 */}
          <img src={img} alt="" loading="lazy"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: heroDark ? 0.4 : 0.2, pointerEvents: "none",
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
          {/* 히어로 텍스트 */}
          <div style={{ position: "relative", zIndex: 1, padding: "8px 12px", textAlign: "center" }}>
            <div style={{ width: 28, height: 3, borderRadius: 2, background: accent, margin: "0 auto 5px", opacity: 0.8 }} />
            <div style={{ fontSize: 9, fontWeight: 900, color: heroText, lineHeight: 1.2, marginBottom: 3 }}>
              {name}
            </div>
            <div style={{ width: 40, height: 2, borderRadius: 1, background: heroText, margin: "0 auto", opacity: 0.3 }} />
          </div>
        </div>

        {/* 특장점 섹션 (중단) */}
        <div style={{ height: "25%", background: bodyBg, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {/* 3개 특징 카드 */}
          <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
            {[0.9, 0.7, 0.8].map((w, i) => (
              <div key={i} style={{ flex: 1, padding: "4px 3px", borderRadius: 3, background: bodyDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent }} />
                </div>
                <div style={{ width: `${w * 100}%`, height: 2, borderRadius: 1, background: textOnBody, opacity: 0.4 }} />
              </div>
            ))}
          </div>
          {/* 포인트 섹션 라인 */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: 3, background: accent + "15", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: "80%", height: 2, borderRadius: 1, background: textOnBody, opacity: 0.5, marginBottom: 2 }} />
              <div style={{ width: "60%", height: 2, borderRadius: 1, background: textOnBody, opacity: 0.25 }} />
            </div>
          </div>
        </div>

        {/* 통계/리뷰 섹션 (하단) */}
        <div style={{ height: "20%", background: palette.dark_bg || "#1a1a2e", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          {["98%", "4.9", "1만+"].map((n, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: accent, lineHeight: 1 }}>{n}</div>
              <div style={{ width: 16, height: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.15)", marginTop: 2, marginLeft: "auto", marginRight: "auto" }} />
            </div>
          ))}
        </div>

        {/* CTA 섹션 */}
        <div style={{ height: "15%", background: bodyBg, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px" }}>
          <div style={{ padding: "3px 14px", borderRadius: 4, background: accent, display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 20, height: 2, borderRadius: 1, background: "#fff" }} />
          </div>
        </div>

        {/* 선택 체크 */}
        {sel && (
          <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#7c6aff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, boxShadow: "0 2px 6px rgba(124,106,255,0.4)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>

      {/* 하단 라벨 */}
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: sel ? "#7c6aff" : (isDark ? "#fff" : "#1a1a2e"), marginBottom: 1 }}>{name}</div>
        <div style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.4)" : "#999", lineHeight: 1.3 }}>{recipe.desc}</div>
      </div>
    </button>
  );
}
