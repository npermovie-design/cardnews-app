/* ── SNS메이킷 Brand Design System ── */
/* Buffer 스타일: 신뢰(Blue) + 활력(Green) */

const LIGHT = {
  bg: "#ffffff",
  bg2: "#F8F5F1",
  nav: "rgba(255,255,255,0.92)",
  border: "#e8e4e0",
  purple: "#168EEA",
  purpleL: "#168EEA",
  purpleBg: "rgba(22,142,234,0.06)",
  pink: "#34C759",
  text: "#1A1A2E",
  muted: "#666666",
  card: "#ffffff",
  cardHover: "#faf9f7",
  shadow: "0 1px 2px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.06)",
  sidebarBg: "#F8F5F1", inputBg: "#fff", inputBorder: "#d5d0ca",
  footerBg: "#F8F5F1",
  heroBg: "#1A1A2E",
  ctaBg: "#F8F5F1",
  modalBg: "#ffffff", toggleBg: "#f0ede8",
};

export const THEMES = { light: LIGHT, dark: LIGHT };

export const THEME_KEY = "nper_theme";
export function getSavedTheme() { return "light"; }

export const BRAND = {
  primary: "#168EEA",
  primaryLight: "#4AABF2",
  primaryDark: "#1280d4",
  primaryBg: "#EBF5FF",
  accent: "#34C759",
  accentBg: "#E8FBF0",
  teal: "#168EEA",
  success: "#34C759",
  warning: "#f59e0b",
  error: "#E74C3C",
};

export const UI = {
  radius: { xs: 4, sm: 8, md: 10, lg: 14, xl: 18, xxl: 24 },
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 },
  font: { xs: 11, sm: 12, md: 13, lg: 14, xl: 16, xxl: 20, title: "clamp(20px,4vw,28px)" },
  btn: {
    primary: {
      borderRadius: 10, padding: "12px 28px", fontWeight: 600, fontSize: 15,
      border: "none", cursor: "pointer",
      background: "#168EEA", color: "#fff",
    },
    ghost: {
      borderRadius: 10, padding: "12px 28px", fontWeight: 600, fontSize: 15,
      cursor: "pointer", background: "transparent",
    },
  },
  input: { borderRadius: 10, padding: "12px 16px", fontSize: 16 },
  card: { borderRadius: 16, padding: "24px" },
  modal: { borderRadius: 16, padding: "clamp(20px,5vw,32px) clamp(16px,4vw,28px)" },
};

export function isDarkTheme() { return false; }
