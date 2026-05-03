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
      fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, color: C?.text || "#1A1A2E",
      letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 16,
    }}>{title}</h2>
    {sub && (
      <p style={{
        fontSize: "clamp(14px,1.5vw,17px)", color: C?.muted || "#666", lineHeight: 1.6, maxWidth: 600,
        margin: left ? "0" : "0 auto",
      }}>{sub}</p>
    )}
  </div>
);

/* ── Neon Button (neon-button.tsx 변환) ── */
export const Btn = ({ children, onClick, ghost, small, full, neon = true, style = {}, C, ariaLabel, className }) => {
  const radius = 24;
  const P = BRAND.primary;

  if (ghost) return (
    <button className={className} onClick={onClick} aria-label={ariaLabel} style={{
      position: "relative", overflow: "hidden",
      borderRadius: radius, cursor: "pointer", fontWeight: 600,
      transition: "all 0.2s ease", fontFamily: "inherit",
      padding: small ? "6px 16px" : "12px 24px",
      fontSize: small ? 13 : 15,
      background: "transparent",
      border: "1px solid " + (C?.border || "#e8e4e0"),
      color: C?.text || "#1A1A2E",
      width: full ? "100%" : "auto",
      ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = P + "40"; e.currentTarget.style.background = P + "08"; const g = e.currentTarget.querySelector(".neon-glow"); if (g) g.style.opacity = "1"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C?.border || "#e8e4e0"; e.currentTarget.style.background = "transparent"; const g = e.currentTarget.querySelector(".neon-glow"); if (g) g.style.opacity = "0"; }}
    >
      {neon && <span className="neon-glow" style={{ position: "absolute", height: 1, top: 0, left: "12.5%", right: "12.5%", background: `linear-gradient(90deg, transparent, ${P}, transparent)`, opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }}/>}
      {neon && <span className="neon-glow" style={{ position: "absolute", height: 1, bottom: 0, left: "12.5%", right: "12.5%", background: `linear-gradient(90deg, transparent, ${P}, transparent)`, opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }}/>}
      {children}
    </button>
  );

  return (
    <button className={className} onClick={onClick} aria-label={ariaLabel} style={{
      position: "relative", overflow: "hidden",
      borderRadius: radius, border: `1px solid ${P}30`, cursor: "pointer", fontWeight: 600,
      transition: "all 0.2s ease", fontFamily: "inherit",
      padding: small ? "6px 16px" : "12px 24px",
      fontSize: small ? 13 : 15,
      background: P,
      color: "#fff",
      width: full ? "100%" : "auto",
      ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; const g = e.currentTarget.querySelector(".neon-glow"); if (g) g.style.opacity = "1"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; const g = e.currentTarget.querySelector(".neon-glow"); if (g) g.style.opacity = "0"; }}
    >
      {neon && <span className="neon-glow" style={{ position: "absolute", height: 1, top: 0, left: "12.5%", right: "12.5%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)", opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }}/>}
      {neon && <span className="neon-glow" style={{ position: "absolute", height: 1, bottom: -1, left: "12.5%", right: "12.5%", background: `linear-gradient(90deg, transparent, ${P}80, transparent)`, opacity: 0, transition: "opacity 0.4s ease", pointerEvents: "none" }}/>}
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
