import React from "react";

/**
 * 상세페이지 템플릿 미니 프리뷰 카드
 * 실제 PicCopilot 스타일 — 완성된 상세페이지 이미지 사용
 */
export default function TemplateGalleryCard({ recipe, selected, onClick, isDark }) {
  const sel = selected;

  return (
    <button onClick={onClick}
      style={{
        padding: 0,
        border: `2.5px solid ${sel ? "#7c6aff" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)")}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", textAlign: "left",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        boxShadow: sel
          ? "0 0 0 3px rgba(124,106,255,0.25), 0 8px 24px rgba(124,106,255,0.15)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        transform: sel ? "scale(1.03)" : "scale(1)",
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        fontFamily: "inherit", width: "100%", position: "relative",
      }}
      onMouseEnter={e => { if (!sel) e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = sel ? "0 0 0 3px rgba(124,106,255,0.25), 0 8px 24px rgba(124,106,255,0.15)" : "0 4px 16px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { if (!sel) e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = sel ? "0 0 0 3px rgba(124,106,255,0.25), 0 8px 24px rgba(124,106,255,0.15)" : "0 2px 8px rgba(0,0,0,0.06)"; }}
    >
      {/* 실제 상세페이지 프리뷰 이미지 */}
      <div style={{ width: "100%", aspectRatio: "3/4", overflow: "hidden", position: "relative", background: isDark ? "#1a1a2e" : "#f0f0f0" }}>
        <img
          src={recipe.img}
          alt={recipe.name}
          loading="lazy"
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            display: "block", transition: "transform 0.3s",
          }}
          onError={e => { e.target.style.display = "none"; }}
        />

        {/* 선택 체크 */}
        {sel && (
          <div style={{
            position: "absolute", top: 6, right: 6, width: 24, height: 24,
            borderRadius: "50%", background: "#7c6aff",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5, boxShadow: "0 2px 8px rgba(124,106,255,0.5)",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}

        {/* 호버 시 "템플릿 사용" 오버레이 */}
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0, transition: "opacity 0.2s", pointerEvents: "none",
        }}
          className="tmpl-hover-overlay"
        >
          <div style={{ padding: "8px 20px", borderRadius: 8, background: "#fff", color: "#1a1a2e", fontSize: 12, fontWeight: 800 }}>
            템플릿 사용
          </div>
        </div>
      </div>

      {/* 하단 라벨 */}
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: sel ? "#7c6aff" : (isDark ? "#fff" : "#1a1a2e"), marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.name}</div>
        <div style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.4)" : "#999", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.desc}</div>
      </div>
    </button>
  );
}
