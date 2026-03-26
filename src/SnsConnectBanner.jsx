import { useState, useEffect } from "react";

/* ══════════════════════════════════════════════════════
   SnsConnectBanner
   - SNS 계정 연동 유도 배너 (재사용)
   - variant: "home" (큰 배너), "inline" (결과 화면 내), "mini" (작은 안내)
   ══════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id: "threads", label: "스레드", icon: "/icon-threads.png", color: "#000", auto: true },
  { id: "instagram", label: "인스타그램", icon: "/icon-instagram.webp", color: "#E1306C", auto: true },
  { id: "naver_blog", label: "네이버 블로그", icon: "/icon-naver-blog.png", color: "#03C75A", auto: false },
  { id: "tistory", label: "티스토리", icon: "/icon-tistory.png", color: "#FF6B35", auto: false },
];

export default function SnsConnectBanner({ isDark, user, variant = "home", onNavigateProfile, connectedPlatforms = [] }) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const acc = "#7c6aff";

  const connected = connectedPlatforms.map(c => c.platform);
  const unconnected = PLATFORMS.filter(p => p.auto && !connected.includes(p.id));

  // 모든 자동 발행 플랫폼이 연결되었으면 배너 숨기기
  if (unconnected.length === 0 && variant !== "home") return null;

  const goProfile = () => {
    if (onNavigateProfile) onNavigateProfile();
  };

  // ── 홈 배너 (큰 카드) ──
  if (variant === "home") {
    return (
      <div style={{
        borderRadius: 16, padding: "24px", marginBottom: 28,
        background: isDark
          ? "linear-gradient(135deg, rgba(124,106,255,0.12), rgba(236,72,153,0.08))"
          : "linear-gradient(135deg, rgba(124,106,255,0.06), rgba(236,72,153,0.04))",
        border: `1px solid ${isDark ? "rgba(124,106,255,0.2)" : "rgba(124,106,255,0.1)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: text, marginBottom: 6 }}>
              SNS 계정을 연결하고 원클릭 발행하세요
            </div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
              글 작성 후 스레드·인스타·블로그에 바로 발행할 수 있어요
            </div>
            {/* 연결 상태 표시 */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {PLATFORMS.map(p => {
                const isConn = connected.includes(p.id);
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", borderRadius: 10,
                    background: isConn ? (isDark ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.08)") : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
                    border: `1px solid ${isConn ? "rgba(74,222,128,0.3)" : bdr}`,
                  }}>
                    <img src={p.icon} alt="" style={{ width: 14, height: 14, objectFit: "contain", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: isConn ? "#4ade80" : muted }}>
                      {p.label}
                    </span>
                    {isConn && <span style={{ fontSize: 9, color: "#4ade80" }}>&#10003;</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={goProfile} style={{
            padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${acc}, #8b5cf6)`,
            color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            {connected.length > 0 ? "연동 관리" : "계정 연동하기"} →
          </button>
        </div>
      </div>
    );
  }

  // ── 인라인 배너 (글 결과 화면 등) ──
  if (variant === "inline") {
    if (!user) return null;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        borderRadius: 12, marginTop: 10,
        background: isDark ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)",
        border: `1px solid ${isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.08)"}`,
      }}>
        <div style={{ display: "flex", gap: -4 }}>
          {unconnected.slice(0, 3).map((p, i) => (
            <img key={p.id} src={p.icon} alt="" style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4, marginLeft: i > 0 ? -6 : 0, border: `2px solid ${isDark ? "#1a1a2e" : "#fff"}` }} />
          ))}
        </div>
        <div style={{ flex: 1, fontSize: 11, color: muted }}>
          {unconnected.map(p => p.label).join(", ")} 연동하면 자동 발행 가능
        </div>
        <button onClick={goProfile} style={{
          padding: "6px 14px", borderRadius: 8, border: `1px solid ${acc}40`,
          background: "transparent", color: acc, fontSize: 11, fontWeight: 700, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          연동
        </button>
      </div>
    );
  }

  // ── 미니 (기능 메뉴 상단 작은 안내) ──
  if (variant === "mini") {
    if (!user || unconnected.length === 0) return null;
    return (
      <div onClick={goProfile} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
        borderRadius: 10, cursor: "pointer",
        background: isDark ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)",
        border: `1px solid ${isDark ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)"}`,
        marginBottom: 12,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2" strokeLinecap="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span style={{ fontSize: 11, color: muted, flex: 1 }}>SNS 계정 연동하면 작성한 글을 바로 발행할 수 있어요</span>
        <span style={{ fontSize: 10, color: acc, fontWeight: 700 }}>연동 →</span>
      </div>
    );
  }

  return null;
}
