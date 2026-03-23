export const THEMES = {
  light: {
    bg: "#ffffff", bg2: "#F9F7F7",
    nav: "rgba(255,255,255,0.96)",
    border: "rgba(17,45,78,0.08)",
    purple: "#3F72AF", purpleL: "#3F72AF",
    purpleBg: "rgba(63,114,175,0.08)",
    pink: "#3F72AF",
    text: "#112D4E", muted: "rgba(17,45,78,0.5)",
    card: "#ffffff", cardHover: "#F9F7F7",
    shadow: "0 1px 3px rgba(17,45,78,0.06), 0 4px 16px rgba(63,114,175,0.06)",
    shadowHover: "0 4px 24px rgba(63,114,175,0.14)",
    sidebarBg: "#F9F7F7", inputBg: "#fff", inputBorder: "rgba(17,45,78,0.12)",
    footerBg: "#F9F7F7",
    heroBg: "linear-gradient(165deg,#ffffff 0%,#F9F7F7 40%,#DBE2EF 100%)",
    ctaBg: "linear-gradient(135deg,#F9F7F7,#DBE2EF)",
    modalBg: "#ffffff", toggleBg: "#F9F7F7",
  },
  dark: {
    bg: "#0B1929", bg2: "#0F2137",
    nav: "rgba(11,25,41,0.95)",
    border: "rgba(219,226,239,0.1)",
    purple: "#5B9BD5", purpleL: "#7AB8E0",
    purpleBg: "rgba(91,155,213,0.12)",
    pink: "#5B9BD5",
    text: "#E8EEF5", muted: "rgba(219,226,239,0.55)",
    card: "rgba(255,255,255,0.04)", cardHover: "rgba(255,255,255,0.07)",
    shadow: "none",
    shadowHover: "0 4px 24px rgba(63,114,175,0.2)",
    sidebarBg: "#0F2137", inputBg: "rgba(255,255,255,0.06)", inputBorder: "rgba(219,226,239,0.12)",
    footerBg: "#0F2137",
    heroBg: "transparent",
    ctaBg: "transparent",
    modalBg: "#112D4E", toggleBg: "rgba(255,255,255,0.08)",
  },
};

export const THEME_KEY = "nper_theme";
export function getSavedTheme() {
  try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; }
}
