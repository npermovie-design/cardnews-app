/* ── SNS메이킷 Brand UI Components ── */
import { BRAND } from "./theme";

export const Badge = ({ children, C, color }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    background: BRAND.primaryBg, border: "none",
    borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600,
    color: BRAND.primary, marginBottom: 20,
  }}>
    {children}
  </div>
);

export const SecWrap = ({ children, bg, style = {}, C, id }) => (
  <section id={id} style={{
    position: "relative", overflow: "hidden",
    padding: "clamp(48px,8vw,96px) clamp(16px,4vw,32px)", background: bg || "transparent", ...style,
  }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {children}
    </div>
  </section>
);

export const SecTitle = ({ badge, title, sub, left, C }) => (
  <div style={{ textAlign: left ? "left" : "center", marginBottom: 56 }}>
    {badge && <Badge C={C}>{badge}</Badge>}
    <h2 style={{
      fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, color: C?.text || "#111827",
      letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 16,
    }}>{title}</h2>
    {sub && (
      <p style={{
        fontSize: "clamp(14px,1.5vw,17px)", color: C?.muted || "#6b7280", lineHeight: 1.6, maxWidth: 600,
        margin: left ? "0" : "0 auto",
      }}>{sub}</p>
    )}
  </div>
);

export const Btn = ({ children, onClick, ghost, small, full, style = {}, C, ariaLabel, className }) => {
  const base = {
    borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600,
    transition: "all 0.15s ease", fontFamily: "inherit", ...style,
  };
  if (ghost) return (
    <button className={className} onClick={onClick} aria-label={ariaLabel} style={{
      ...base,
      padding: small ? "6px 16px" : "12px 24px",
      fontSize: small ? 13 : 15,
      background: "transparent",
      border: "1px solid " + (C?.border || "#d1d5db"),
      color: C?.text || "#111827",
      width: full ? "100%" : "auto",
    }}>
      {children}
    </button>
  );
  return (
    <button className={className} onClick={onClick} aria-label={ariaLabel} style={{
      ...base,
      padding: small ? "6px 16px" : "12px 24px",
      fontSize: small ? 13 : 15,
      background: BRAND.primary,
      color: "#fff",
      width: full ? "100%" : "auto",
    }}>
      {children}
    </button>
  );
};

export const Inp = ({ style, C, "aria-label": ariaLabel, ...props }) => (
  <input
    style={{
      background: C.inputBg, border: "1px solid " + C.inputBorder,
      borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 16,
      fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
      transition: "border-color 0.15s", ...style,
    }}
    onFocus={e => e.target.style.borderColor = BRAND.primary}
    onBlur={e  => e.target.style.borderColor = C.inputBorder}
    {...props}
  />
);

export const Textarea = ({ style, C, ...props }) => (
  <textarea
    style={{
      background: C.inputBg, border: "1px solid " + C.inputBorder,
      borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 16,
      fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
      resize: "vertical", transition: "border-color 0.15s", ...style,
    }}
    onFocus={e => e.target.style.borderColor = BRAND.primary}
    onBlur={e  => e.target.style.borderColor = C.inputBorder}
    {...props}
  />
);
