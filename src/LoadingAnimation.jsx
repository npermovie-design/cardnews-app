/* 공통 AI 생성중 로딩 애니메이션 — 기능별 아이콘 지원 */
import { useState, useEffect } from "react";

// 기능별 SVG 아이콘 + 색상 매핑
const FEATURE_ICONS = {
  // 글쓰기 계열
  blog_write: { color: "#168EEA", label: "글쓰기", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  blog_naver: { color: "#03C75A", label: "네이버 블로그", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  blog_tistory: { color: "#FF6B35", label: "티스토리", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  blog_insta: { color: "#E1306C", label: "인스타그램", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="1.8"/><circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill={c}/></svg> },
  // PPT
  ppt_gen: { color: "#168EEA", label: "PPT 제작", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke={c} strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/><path d="M7 8h4M7 11h6" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/></svg> },
  // 이미지 생성
  product_shot: { color: "#f59e0b", label: "이미지 생성", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="1.8"/><circle cx="8.5" cy="8.5" r="1.5" fill={c}/><path d="M21 15l-5-5L5 21" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  logo_gen: { color: "#ec4899", label: "로고 생성", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M2 17l10 5 10-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  mockup_gen: { color: "#06b6d4", label: "목업 생성", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke={c} strokeWidth="1.8"/><line x1="12" y1="18" x2="12.01" y2="18" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  // 영상 제작
  video_create: { color: "#ef4444", label: "영상 제작", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke={c} strokeWidth="1.8"/><polygon points="10,8 17,12 10,16" fill={c}/></svg> },
  shorts_make: { color: "#ef4444", label: "쇼츠 제작", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke={c} strokeWidth="1.8"/><polygon points="10,8 17,12 10,16" fill={c}/></svg> },
  // 카드뉴스
  card_news: { color: "#8b5cf6", label: "카드뉴스", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="1.8"/><path d="M3 9h18M9 21V9" stroke={c} strokeWidth="1.8"/></svg> },
  // 기본
  default: { color: "#168EEA", label: "AI 작업", svg: (c) => <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg> },
};

// 기능별 로딩 단계 매핑
const FEATURE_STEPS = {
  blog_write: ["주제 분석 중...", "구조 기획 중...", "본문 작성 중...", "마무리 다듬는 중..."],
  blog_naver: ["주제 분석 중...", "구조 기획 중...", "본문 작성 중...", "마무리 다듬는 중..."],
  blog_tistory: ["주제 분석 중...", "구조 기획 중...", "본문 작성 중...", "마무리 다듬는 중..."],
  blog_insta: ["주제 분석 중...", "캡션 기획 중...", "본문 작성 중...", "해시태그 생성 중..."],
  ppt_gen: ["주제 분석 중...", "슬라이드 기획 중...", "내용 작성 중...", "디자인 적용 중..."],
  product_shot: ["이미지 분석 중...", "배경 생성 중...", "합성 처리 중...", "최종 보정 중..."],
  logo_gen: ["브랜드 분석 중...", "디자인 생성 중...", "컬러 적용 중...", "최종 렌더링 중..."],
  mockup_gen: ["이미지 분석 중...", "목업 생성 중...", "합성 처리 중...", "최종 보정 중..."],
  video_create: ["영상 다운로드 중...", "음성 인식 중...", "AI 분석 중...", "결과 생성 중..."],
  shorts_make: ["영상 다운로드 중...", "음성 인식 중...", "AI 분석 중...", "결과 생성 중..."],
  card_news: ["주제 분석 중...", "레이아웃 기획 중...", "본문 작성 중...", "디자인 적용 중..."],
  default: ["주제 분석 중...", "구조 기획 중...", "본문 작성 중...", "마무리 다듬는 중..."],
};

export default function LoadingAnimation({
  icon, // legacy: emoji string (ignored if featureType is set)
  title = "AI가 작업하고 있어요",
  subtitle = "",
  isDark = true,
  featureType = "", // "blog_naver", "ppt_gen", "product_shot", "video_create", etc.
  progress = -1, // 0~3 step index, -1 for auto
  startTime = 0, // ms epoch — 생성 시작 시각 (0이면 mount 시 자동 설정)
  expectedMs = 30000, // 예상 소요 시간
}) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#6c757d";

  const feat = FEATURE_ICONS[featureType] || FEATURE_ICONS.default;
  const stepsLabels = FEATURE_STEPS[featureType] || FEATURE_STEPS.default;

  // elapsed-time 기반 진행률 계산 — 탭 전환·remount 돼도 startTime 기준으로 정확히 복원
  const effectiveStart = startTime || (typeof window !== "undefined" ? Date.now() : 0);
  const [now, setNow] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    // visibility 돌아올 때 즉시 갱신
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(tick, 500);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const elapsed = Math.max(0, now - effectiveStart);
  // 0~90%까지 elapsed 비례, 그 이후는 천천히 95%에 수렴 (생성 완료 전까지 100% 안 가게)
  let progressPct;
  if (elapsed < expectedMs * 0.9) {
    progressPct = (elapsed / expectedMs) * 90;
  } else {
    const over = elapsed - expectedMs * 0.9;
    progressPct = 90 + Math.min(5, over / 2000);
  }
  progressPct = Math.min(95, progressPct);

  // 4단계 step 진행도 elapsed 기반 (각 25%씩)
  const autoStep = Math.min(3, Math.floor((progressPct / 95) * 4));
  const activeStep = progress >= 0 ? progress : autoStep;

  const steps = stepsLabels.map((l, i) => ({
    l,
    d: i < activeStep,
    a: i === activeStep,
  }));

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "60px 24px", textAlign: "center", minHeight: "60vh" }}>
      <style>{`
        @keyframes ld-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.05)}}
        @keyframes ld-progress{from{width:0%}to{width:100%}}
        @keyframes ld-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ld-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ld-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
      `}</style>
      {/* 아이콘 + 링 애니메이션 */}
      <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 20px" }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `3px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          borderTopColor: feat.color, borderRightColor: feat.color,
          animation: "ld-ring 1.5s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "ld-float 3s ease-in-out infinite",
          filter: `drop-shadow(0 8px 20px ${feat.color}40)`,
        }}>
          {feat.svg(feat.color)}
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8, letterSpacing: "-0.5px" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: muted, marginBottom: 24, animation: "ld-pulse 2s ease-in-out infinite" }}>{subtitle}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 260, margin: "0 auto 20px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: s.d || s.a ? 1 : 0.3 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
              background: s.d ? "rgba(74,222,128,0.15)" : s.a ? `${feat.color}20` : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
              border: s.d ? "2px solid #4ade80" : s.a ? `2px solid ${feat.color}` : `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            }}>
              {s.d ? <span style={{ color: "#4ade80" }}>✓</span> : s.a ? <div style={{ width: 8, height: 8, borderRadius: "50%", border: `2px solid ${feat.color}`, borderTopColor: "transparent", animation: "ld-spin 0.8s linear infinite" }} /> : null}
            </div>
            <span style={{ fontSize: 13, color: s.d ? "#4ade80" : s.a ? text : muted, fontWeight: s.a ? 700 : 400 }}>{s.l}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 4, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", overflow: "hidden", maxWidth: 260, margin: "0 auto 10px", width: "100%" }}>
        <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg,${feat.color},${feat.color}cc,#ec4899)`, width: `${progressPct}%`, transition: "width 0.5s ease-out" }} />
      </div>
      <div style={{ fontSize: 12, color: muted }}>{Math.floor(elapsed/1000)}초 경과 · 보통 20~60초 소요</div>
    </div>
  );
}

// export for BackgroundTaskIndicator
export { FEATURE_ICONS };
