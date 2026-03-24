/* 공통 스텝 진행 바 — 미니멀 프로그레스 스타일 */
export default function StepBar({ steps, current, isDark }) {
  const acc = "#7c6aff";
  const currentStep = steps.find(s => s.n === current);
  const label = currentStep?.label || "";

  return (
    <div style={{ padding:"12px 16px 0", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      {/* 프로그레스 바 */}
      <div style={{ height:3, borderRadius:2, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:8 }}>
        <div style={{
          height:"100%", borderRadius:2, background: acc,
          width: (current / steps.length * 100) + "%",
          transition:"width 0.4s ease",
        }} />
      </div>
      {/* 현재 단계 텍스트 + 도트 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:800, color:acc }}>{current}/{steps.length}</span>
          <span style={{ fontSize:12, fontWeight:700, color:acc }}>{label}</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {steps.map(s => (
            <div key={s.n} style={{
              width:6, height:6, borderRadius:"50%",
              background: s.n <= current ? acc : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
              transition:"background 0.3s",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
