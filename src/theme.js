export const THEMES = {
  light: {
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
  },
  dark: {
    bg: "#0a0812", bg2: "#100d22",
    nav: "rgba(10,8,18,0.93)",
    border: "rgba(255,255,255,0.07)",
    purple: "#7c6aff", purpleL: "#a89bff",
    purpleBg: "rgba(124,106,255,0.12)",
    pink: "#ec4899",
    text: "#f0eeff", muted: "rgba(240,238,255,0.5)",
    card: "rgba(255,255,255,0.04)", cardHover: "rgba(255,255,255,0.07)",
    shadow: "none",
    shadowHover: "0 4px 24px rgba(124,106,255,0.2)",
    sidebarBg: "#100d22", inputBg: "rgba(255,255,255,0.06)", inputBorder: "rgba(255,255,255,0.1)",
    footerBg: "#100d22",
    heroBg: "transparent",
    ctaBg: "transparent",
    modalBg: "#13102a", toggleBg: "rgba(255,255,255,0.08)",
  },
};

export const THEME_KEY = "nper_theme";
export function getSavedTheme() {
  try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; }
}
