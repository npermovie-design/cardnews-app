/* ── 공용 컴포넌트 (테마 C를 prop으로 받거나 외부에서 주입) ── */

export const Badge = ({ children, C }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)",
    borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700,
    color: C.purpleL, marginBottom: 20,
  }}>
    {children}
  </div>
);

export const SecWrap = ({ children, bg, style = {}, C }) => (
  <section style={{
    position: "relative", overflow: "hidden",
    padding: "clamp(48px,8vw,100px) clamp(16px,4vw,24px)", background: bg || "transparent", ...style,
  }}>
    <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {children}
    </div>
  </section>
);

export const SecTitle = ({ badge, title, sub, left, C }) => (
  <div style={{ textAlign: left ? "left" : "center", marginBottom: 56 }}>
    {badge && <Badge C={C}>+ {badge}</Badge>}
    <h2 style={{
      fontSize: "clamp(28px,4vw,46px)", fontWeight: 900, color: C.text,
      letterSpacing: -1, lineHeight: 1.15, marginBottom: 16,
    }}>{title}</h2>
    {sub && (
      <p style={{
        fontSize: "clamp(13px,1.5vw,16px)", color: C.muted, lineHeight: 1.7, maxWidth: 600,
        margin: left ? "0" : "0 auto",
      }}>{sub}</p>
    )}
  </div>
);

export const Btn = ({ children, onClick, ghost, small, full, style = {}, C }) => {
  const base = {
    borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700,
    transition: "all 0.2s", fontFamily: "inherit", ...style,
  };
  if (ghost) return (
    <button onClick={onClick} style={{
      ...base,
      padding: small ? "5px 14px" : "11px 26px",
      fontSize: small ? 12 : 14,
      background: "#fff",
      border: "1px solid rgba(124,106,255,0.35)",
      color: C.purpleL,
      boxShadow: "0 1px 4px rgba(124,106,255,0.1)",
      width: full ? "100%" : "auto",
    }}>
      {children}
    </button>
  );
  return (
    <button onClick={onClick} style={{
      ...base,
      padding: small ? "5px 14px" : "12px 28px",
      fontSize: small ? 12 : 14,
      background: "linear-gradient(135deg,#7c6aff,#ec4899)",
      color: "#fff",
      boxShadow: "0 4px 16px rgba(124,106,255,0.3)",
      width: full ? "100%" : "auto",
    }}>
      {children}
    </button>
  );
};

export const Inp = ({ style, C, ...props }) => (
  <input
    style={{
      background: C.inputBg, border: "1px solid " + C.inputBorder,
      borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14,
      fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
      transition: "border-color 0.2s", ...style,
    }}
    onFocus={e => e.target.style.borderColor = C.purple}
    onBlur={e  => e.target.style.borderColor = C.inputBorder}
    {...props}
  />
);

export const Textarea = ({ style, C, ...props }) => (
  <textarea
    style={{
      background: C.inputBg, border: "1px solid " + C.inputBorder,
      borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14,
      fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
      resize: "vertical", ...style,
    }}
    onFocus={e => e.target.style.borderColor = C.purple}
    onBlur={e  => e.target.style.borderColor = C.inputBorder}
    {...props}
  />
);
