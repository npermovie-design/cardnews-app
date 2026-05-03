/* ── SNS메이킷 Brand Design System ── */
/* Primary: #3b82f6 (Blue-500) */

const LIGHT = {
  bg: "#ffffff",
  bg2: "#f9fafb",
  nav: "rgba(255,255,255,0.92)",
  border: "#e5e7eb",
  purple: "#3b82f6",
  purpleL: "#3b82f6",
  purpleBg: "rgba(59,130,246,0.06)",
  pink: "#34C759",
  text: "#333333",
  muted: "#6b7280",
  card: "#ffffff",
  cardHover: "#f9fafb",
  shadow: "0 1px 2px rgba(0,0,0,0.04)",
  shadowHover: "0 4px 12px rgba(0,0,0,0.06)",
  sidebarBg: "#f9fafb", inputBg: "#fff", inputBorder: "#e5e7eb",
  footerBg: "#f9fafb",
  heroBg: "#1A1A2E",
  ctaBg: "#f9fafb",
  modalBg: "#ffffff", toggleBg: "#f3f4f6",
};

export const THEMES = { light: LIGHT, dark: LIGHT };

export const THEME_KEY = "nper_theme";
export function getSavedTheme() { return "light"; }

export const BRAND = {
  primary: "#3b82f6",
  primaryLight: "#60a5fa",
  primaryDark: "#2563eb",
  primaryBg: "#e0f2fe",
  accent: "#34C759",
  accentBg: "#E8FBF0",
  teal: "#3b82f6",
  success: "#34C759",
  warning: "#f59e0b",
  error: "#ef4444",
};

export const UI = {
  radius: { xs: 4, sm: 8, md: 10, lg: 14, xl: 18, xxl: 24 },
  spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 },
  font: { xs: 11, sm: 12, md: 13, lg: 14, xl: 16, xxl: 20, title: "clamp(20px,4vw,28px)" },
  btn: {
    primary: {
      borderRadius: 10, padding: "12px 28px", fontWeight: 600, fontSize: 15,
      border: "none", cursor: "pointer",
      background: "#3b82f6", color: "#fff",
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
