const LIGHT = {
  bg: "#ffffff", bg2: "#f5f4ff",
  nav: "rgba(255,255,255,0.95)",
  border: "rgba(0,0,0,0.08)",
  purple: "#7c6aff", purpleL: "#6357e0",
  purpleBg: "rgba(124,106,255,0.08)",
  pink: "#ec4899",
  text: "#1a1730", muted: "rgba(26,23,48,0.5)",
  card: "#ffffff", cardHover: "#faf9ff",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(124,106,255,0.06)",
  shadowHover: "0 4px 24px rgba(124,106,255,0.16)",
  sidebarBg: "#fafafa", inputBg: "#fff", inputBorder: "rgba(0,0,0,0.12)",
  footerBg: "#fafafa",
  heroBg: "linear-gradient(165deg,#ffffff 0%,#f5f4ff 50%,#fdf2ff 100%)",
  ctaBg: "linear-gradient(135deg,#f5f4ff,#fdf2ff)",
  modalBg: "#ffffff", toggleBg: "#f5f4ff",
};

export const THEMES = { light: LIGHT, dark: LIGHT };

export const THEME_KEY = "nper_theme";
export function getSavedTheme() { return "light"; }

// ── 공통 UI 상수 (모든 페이지에서 통일) ────────────────────────────────────
export const UI = {
  radius: { xs: 6, sm: 8, md: 10, lg: 12, xl: 16, xxl: 20 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: { xs: 11, sm: 12, md: 13, lg: 14, xl: 16, xxl: 20, title: "clamp(20px,4vw,28px)" },
  btn: {
    primary: { borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff" },
    ghost: { borderRadius: 12, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", background: "transparent" },
  },
  input: { borderRadius: 10, padding: "11px 14px", fontSize: 14 },
  card: { borderRadius: 14, padding: "18px 16px" },
  modal: { borderRadius: 20, padding: "clamp(20px,5vw,32px) clamp(16px,4vw,28px)" },
};

export function isDarkTheme() { return false; }
