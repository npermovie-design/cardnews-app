/* 공통 스텝 진행 바 — 이미지 생성기에서 사용 */
export default function StepBar({ steps, current, isDark }) {
  return (
    <div style={{ padding:"16px 16px 0", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <style>{`
        @media(max-width:480px){
          .step-bar-inner{gap:0!important}
          .step-bar-inner .step-label{font-size:11px!important}
          .step-bar-inner .step-circle{width:24px!important;height:24px!important;font-size:10px!important}
          .step-bar-inner .step-line{margin:0 6px!important;min-width:8px!important}
        }
      `}</style>
      <div className="step-bar-inner" style={{ display:"flex", alignItems:"center", gap:0, marginBottom:16 }}>
        {steps.map((s, i) => {
          const done = current > s.n;
          const active = current === s.n;
          return (
            <div key={s.n} style={{ display:"flex", alignItems:"center", flex: i < steps.length - 1 ? 1 : "auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div className="step-circle" style={{
                  width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:900, flexShrink:0,
                  background: done || active ? "#7c6aff" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e5e5"),
                  color: done || active ? "#fff" : (isDark ? "rgba(255,255,255,0.3)" : "#bbb"),
                }}>
                  {done ? "✓" : s.n}
                </div>
                <span className="step-label" style={{ fontSize:13, fontWeight: active ? 800 : 500, color: active ? (isDark?"#fff":"#1a1a2e") : (isDark?"rgba(255,255,255,0.4)":"#999"), whiteSpace:"nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="step-line" style={{ flex:1, height:2, background: done ? "#7c6aff" : (isDark ? "rgba(255,255,255,0.1)" : "#e5e5e5"), margin:"0 12px", minWidth:16 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
