import React, { useState } from "react";

/* ════════════════════════════════════════════════════════════
   CardNewsEditor 유틸/상수/UI 헬퍼
════════════════════════════════════════════════════════════ */

const FONTS = [
  // 한글 기본
  { label: "프리텐다드", value: "Pretendard" },
  { label: "노토산스", value: "Noto Sans KR" },
  { label: "나눔고딕", value: "Nanum Gothic" },
  { label: "나눔명조", value: "Nanum Myeongjo" },
  { label: "나눔스퀘어", value: "NanumSquare" },
  { label: "나눔바른고딕", value: "NanumBarunGothic" },
  // 특수/디자인
  { label: "배민도현", value: "BMDOHYEON" },
  { label: "던전모", value: "NeoDunggeunmo" },
  { label: "마루부리", value: "MaruBuri" },
  { label: "고운바탕", value: "GowunBatang" },
  { label: "고운도현", value: "GowunDodum" },
  { label: "이롭게 바탕", value: "EarlyFontDiary" },
  { label: "검은고딕", value: "Black Han Sans" },
  { label: "송명", value: "Song Myung" },
  { label: "하이멜로디", value: "Hi Melody" },
  { label: "도현", value: "Do Hyeon" },
  { label: "주아", value: "Jua" },
  { label: "나눔펜", value: "Nanum Pen Script" },
  { label: "나눔브러시", value: "Nanum Brush Script" },
  { label: "IBM플렉스", value: "IBM Plex Sans KR" },
  { label: "스포카한산스", value: "Spoqa Han Sans Neo" },
  // 영문
  { label: "Montserrat", value: "Montserrat" },
  { label: "Playfair", value: "Playfair Display" },
  { label: "Roboto", value: "Roboto" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
];

/* ── Google Fonts dynamic loader ───────────────────────────────────── */
const loadedFonts = new Set();
function loadGFont(family) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

const TEMPLATES = [
  // 솔리드 컬러
  { name: "다크 모던", category: "솔리드", bgColor: "#1a1a2e", textColor: "#ffffff", accentColor: "#7c6aff", fontFamily: "Pretendard", layout: "center" },
  { name: "라이트 미니멀", category: "솔리드", bgColor: "#ffffff", textColor: "#1a1a2e", accentColor: "#7c6aff", fontFamily: "Pretendard", layout: "minimal" },
  { name: "파스텔 핑크", category: "솔리드", bgColor: "#fff0f5", textColor: "#4a2040", accentColor: "#ec4899", fontFamily: "Nanum Gothic", layout: "corner-accent" },
  { name: "네이비 골드", category: "솔리드", bgColor: "#0f172a", textColor: "#fbbf24", accentColor: "#f59e0b", fontFamily: "Pretendard", layout: "left-bar" },
  { name: "그린 자연", category: "솔리드", bgColor: "#ecfdf5", textColor: "#064e3b", accentColor: "#10b981", fontFamily: "Noto Sans KR", layout: "top-bold" },
  { name: "코랄 웜", category: "솔리드", bgColor: "#fff7ed", textColor: "#9a3412", accentColor: "#f97316", fontFamily: "Nanum Gothic", layout: "quote" },
  { name: "퍼플 그라데이션", category: "솔리드", bgColor: "#1e1b4b", textColor: "#e0e7ff", accentColor: "#818cf8", fontFamily: "Pretendard", layout: "stripe" },
  { name: "모노크롬", category: "솔리드", bgColor: "#f8fafc", textColor: "#0f172a", accentColor: "#64748b", fontFamily: "Pretendard", layout: "minimal" },
  { name: "레드 볼드", category: "솔리드", bgColor: "#450a0a", textColor: "#ffffff", accentColor: "#ef4444", fontFamily: "BMDOHYEON", layout: "split-left" },
  { name: "스카이 블루", category: "솔리드", bgColor: "#f0f9ff", textColor: "#0c4a6e", accentColor: "#0ea5e9", fontFamily: "Noto Sans KR", layout: "top-bold" },
  { name: "블랙 골드", category: "솔리드", bgColor: "#000000", textColor: "#ffd700", accentColor: "#b8860b", fontFamily: "Pretendard", layout: "magazine" },
  { name: "소프트 라벤더", category: "솔리드", bgColor: "#f5f3ff", textColor: "#4c1d95", accentColor: "#8b5cf6", fontFamily: "Nanum Gothic", layout: "corner-accent" },
  // 실사 배경 (Pexels 무료 이미지)
  { name: "카페 인테리어", category: "실사", bgColor: "#2c1810", textColor: "#ffffff", accentColor: "#d4a574", fontFamily: "Nanum Myeongjo", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/1813466/pexels-photo-1813466.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "자연 풍경", category: "실사", bgColor: "#1a3a2a", textColor: "#ffffff", accentColor: "#4ade80", fontFamily: "Pretendard", layout: "magazine", bgImage: "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "도시 야경", category: "실사", bgColor: "#0a0a1a", textColor: "#ffffff", accentColor: "#fbbf24", fontFamily: "Montserrat", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/1519088/pexels-photo-1519088.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "미니멀 데스크", category: "실사", bgColor: "#f5f5f0", textColor: "#1a1a1a", accentColor: "#64748b", fontFamily: "Pretendard", layout: "magazine", bgImage: "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "음식 클로즈업", category: "실사", bgColor: "#3d2b1f", textColor: "#ffffff", accentColor: "#f97316", fontFamily: "GowunBatang", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "꽃 & 보타닉", category: "실사", bgColor: "#2d1f3d", textColor: "#ffffff", accentColor: "#c084fc", fontFamily: "Nanum Myeongjo", layout: "magazine", bgImage: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "바다 & 해변", category: "실사", bgColor: "#0c3547", textColor: "#ffffff", accentColor: "#38bdf8", fontFamily: "Pretendard", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "산 & 하이킹", category: "실사", bgColor: "#1a2a1a", textColor: "#ffffff", accentColor: "#86efac", fontFamily: "Black Han Sans", layout: "magazine", bgImage: "https://images.pexels.com/photos/933054/pexels-photo-933054.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "텍스처 콘크리트", category: "실사", bgColor: "#4a4a4a", textColor: "#ffffff", accentColor: "#a1a1aa", fontFamily: "Pretendard", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/1939485/pexels-photo-1939485.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "대리석 럭셔리", category: "실사", bgColor: "#f0ede8", textColor: "#2c2c2c", accentColor: "#b8860b", fontFamily: "Playfair Display", layout: "magazine", bgImage: "https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "노을 하늘", category: "실사", bgColor: "#4a1942", textColor: "#ffffff", accentColor: "#f472b6", fontFamily: "Do Hyeon", layout: "bottom-card", bgImage: "https://images.pexels.com/photos/209831/pexels-photo-209831.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  { name: "눈 겨울", category: "실사", bgColor: "#e8edf2", textColor: "#1a2a3a", accentColor: "#60a5fa", fontFamily: "Noto Sans KR", layout: "magazine", bgImage: "https://images.pexels.com/photos/688660/pexels-photo-688660.jpeg?auto=compress&cs=tinysrgb&w=1080" },
  // 카드뉴스
  { name: "인스타 감성", category: "카드뉴스", bgColor: "#fef3c7", textColor: "#92400e", accentColor: "#f59e0b", fontFamily: "Nanum Myeongjo", layout: "quote", bgImage: null },
  { name: "정보 카드", category: "카드뉴스", bgColor: "#1e3a5f", textColor: "#ffffff", accentColor: "#60a5fa", fontFamily: "Pretendard", layout: "left-bar" },
  { name: "뉴스 스타일", category: "카드뉴스", bgColor: "#ffffff", textColor: "#111827", accentColor: "#ef4444", fontFamily: "Noto Sans KR", layout: "stripe" },
  // 프레젠테이션
  { name: "비즈니스 블루", category: "프레젠테이션", bgColor: "#1e3a5f", textColor: "#ffffff", accentColor: "#3b82f6", fontFamily: "Pretendard", layout: "split-left" },
  { name: "스타트업 그린", category: "프레젠테이션", bgColor: "#064e3b", textColor: "#ecfdf5", accentColor: "#34d399", fontFamily: "Pretendard", layout: "top-bold" },
  // 상세페이지
  { name: "쇼핑몰 화이트", category: "상세페이지", bgColor: "#ffffff", textColor: "#1f2937", accentColor: "#6366f1", fontFamily: "Noto Sans KR", layout: "minimal" },
  { name: "럭셔리 블랙", category: "상세페이지", bgColor: "#000000", textColor: "#d4af37", accentColor: "#b8860b", fontFamily: "Playfair Display", layout: "magazine" },
  // 소셜미디어
  { name: "틱톡 네온", category: "소셜미디어", bgColor: "#0a0a0a", textColor: "#00f5d4", accentColor: "#00f5d4", fontFamily: "Black Han Sans", layout: "corner-accent" },
  { name: "유튜브 썸네일", category: "소셜미디어", bgColor: "#ff0000", textColor: "#ffffff", accentColor: "#fbbf24", fontFamily: "BMDOHYEON", layout: "stripe" },
];

const LAYOUT_OPTIONS = [
  { key: "center", label: "중앙", icon: "⊞" },
  { key: "bottom-card", label: "하단카드", icon: "▄" },
  { key: "split-left", label: "좌분할", icon: "◧" },
  { key: "split-right", label: "우분할", icon: "◨" },
  { key: "corner-accent", label: "코너", icon: "◜" },
  { key: "top-bold", label: "상단강조", icon: "▀" },
  { key: "left-bar", label: "좌측바", icon: "▌" },
  { key: "minimal", label: "미니멀", icon: "─" },
  { key: "quote", label: "인용", icon: "❝" },
  { key: "magazine", label: "매거진", icon: "▊" },
  { key: "stripe", label: "스트라이프", icon: "≡" },
];

const DEFAULT_THEME = {
  purple: "#7c6aff",
  purpleL: "#6357e0",
  pink: "#ec4899",
  text: "#1a1730",
  muted: "rgba(26,23,48,0.5)",
  border: "rgba(0,0,0,0.08)",
  bg: "#ffffff",
  bg2: "#f5f4ff",
};

/* ── helpers ─────────────────────────────────────────────────────────── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lightenColor(hex, amount = 30) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = clamp(((num >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((num & 0xff) + amount, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darkenColor(hex, amount = 30) {
  return lightenColor(hex, -amount);
}

function hexFromAny(color) {
  if (!color) return "#000000";
  if (typeof color === "string" && color.startsWith("#")) return color;
  const d = document.createElement("div");
  d.style.color = color;
  document.body.appendChild(d);
  const computed = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = computed.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map(v => parseInt(v).toString(16).padStart(2, "0")).join("");
}

/* ── icon SVGs (inline) ─────────────────────────────────────────────── */
const Icon = {
  Left: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>,
  Right: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3"/><path d="M7 6l-4 4 4 4"/></svg>,
  Redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h10"/><path d="M17 6l4 4-4 4"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 014 4v0a4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4v0a4 4 0 01-4 4H6z"/></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>,
  AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Up: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>,
  Down: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
};

/* ── Btn component ───────────────────────────────────────────────────── */
function Btn({ children, onClick, active, small, accent, disabled, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "6px 10px" : "8px 14px",
    borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
    background: active ? (accent || "#7c6aff") : "#fff",
    color: active ? "#fff" : "#333",
    fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
    ...style,
  };
  return <button style={base} onClick={disabled ? undefined : onClick}>{children}</button>;
}

/* ── CollapsibleSection component ────────────────────────────────────── */
function CollapsibleSection({ title, defaultOpen = true, children, C }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div
        style={{ ...S.sectionLabel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span style={{ fontSize: 11, color: "#999", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>&#9660;</span>
      </div>
      {open && children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export { FONTS, loadGFont, TEMPLATES, LAYOUT_OPTIONS, clamp, lightenColor, darkenColor, hexFromAny, Icon, Btn, CollapsibleSection };
