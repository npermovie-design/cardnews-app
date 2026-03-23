/* 공통 AI 생성중 로딩 애니메이션 */
export default function LoadingAnimation({ icon = "✍️✨", title = "AI가 작업하고 있어요", subtitle = "", isDark = true }) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#6c757d";
  const steps = [
    { l: "주제 분석 중...", d: true },
    { l: "구조 기획 중...", d: true },
    { l: "본문 작성 중...", a: true },
    { l: "마무리 다듬는 중..." },
  ];

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "60px 24px", textAlign: "center" }}>
      <style>{`
        @keyframes ld-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes ld-progress{from{width:0%}to{width:100%}}
        @keyframes ld-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ fontSize: 64, marginBottom: 16, display: "inline-block", animation: "ld-float 3s ease-in-out infinite", filter: "drop-shadow(0 8px 20px rgba(99,102,241,0.4))" }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8, letterSpacing: "-0.5px" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>{subtitle}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 260, margin: "0 auto 20px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: s.d || s.a ? 1 : 0.3 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
              background: s.d ? "rgba(74,222,128,0.15)" : s.a ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
              border: s.d ? "2px solid #4ade80" : s.a ? "2px solid #7c6aff" : "2px solid rgba(255,255,255,0.1)",
            }}>
              {s.d ? <span style={{ color: "#4ade80" }}>✓</span> : s.a ? <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #7c6aff", borderTopColor: "transparent", animation: "ld-spin 0.8s linear infinite" }} /> : null}
            </div>
            <span style={{ fontSize: 13, color: s.d ? "#4ade80" : s.a ? text : muted, fontWeight: s.a ? 700 : 400 }}>{s.l}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 4, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", overflow: "hidden", maxWidth: 260, margin: "0 auto 10px", width: "100%" }}>
        <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#7c6aff,#8b5cf6,#ec4899)", animation: "ld-progress 15s ease-out forwards" }} />
      </div>
      <div style={{ fontSize: 12, color: muted }}>보통 20~60초 소요</div>
    </div>
  );
}
