import { useState, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Sequence, Audio,
} from "remotion";
import { NARRATION, LANGUAGES, DEFAULT_LANG, SCENE_TIMINGS, TOTAL_DURATION } from "./narration-data.js";

// ═══════════════════════════════════════════════
// 이용방법 — 영상 갤러리 페이지
// 다국어 CC + TTS 언어 전환 지원
// ═══════════════════════════════════════════════

const FPS = 30;

/* ── 비디오 갤러리 카드 ── */
function VideoCard({ video, C, onPlay }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onPlay}
      style={{
        cursor: "pointer", borderRadius: 16, overflow: "hidden",
        background: C.card, border: "1px solid " + C.border,
        boxShadow: hover ? C.shadowHover : C.shadow,
        transition: "all 0.25s", transform: hover ? "translateY(-4px)" : "none",
      }}
    >
      {/* 썸네일 */}
      <div style={{
        position: "relative", paddingTop: "56.25%",
        background: "linear-gradient(135deg, #1a1040, #0d0b1a)",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: 28, fontWeight: 900, textAlign: "center",
            background: "linear-gradient(135deg,#7c6aff,#ec4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            padding: "0 20px",
          }}>
            {video.title}
          </div>
        </div>
        {/* 재생 버튼 */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: hover ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0)",
          transition: "background 0.2s",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(124,106,255,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hover ? 1 : 0.7, transition: "opacity 0.2s",
            boxShadow: "0 4px 20px rgba(124,106,255,0.4)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* 시간 */}
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "3px 8px",
          fontSize: 12, color: "#fff", fontWeight: 600,
        }}>
          {video.duration}
        </div>
      </div>
      {/* 정보 */}
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>
          {video.title}
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          {video.description}
        </div>
        {/* 언어 태그 */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {video.languages.map(lang => (
            <span key={lang} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 6,
              background: "rgba(124,106,255,0.08)", color: "#7c6aff",
              fontWeight: 600, border: "1px solid rgba(124,106,255,0.15)",
            }}>
              {LANGUAGES[lang]?.flag} {LANGUAGES[lang]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── CC 자막 오버레이 ── */
function CCOverlay({ lang = "ko", secondLang = null, show = true }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;
  if (!show) return null;

  const current = NARRATION.find(n => timeSec >= n.start && timeSec < n.end);
  if (!current) return null;

  const mainText = current[lang] || "";
  const subText = secondLang && secondLang !== lang ? (current[secondLang] || "") : "";
  const elapsed = timeSec - current.start;
  const enterOp = Math.min(1, elapsed / 0.3);
  const exitOp = Math.min(1, (current.end - timeSec) / 0.3);
  const opacity = Math.min(enterOp, exitOp);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 5% 48px", pointerEvents: "none", zIndex: 50 }}>
      <div style={{ opacity, transform: `translateY(${(1 - opacity) * 8}px)`, textAlign: "center", maxWidth: "88%" }}>
        <div style={{
          display: "inline-block", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
          borderRadius: 14, padding: "12px 28px", border: "1px solid rgba(124,106,255,0.12)",
        }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.55, wordBreak: "keep-all", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {mainText}
          </div>
          {subText && (
            <div style={{ fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginTop: 6, wordBreak: "keep-all" }}>
              {subText}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── TTS 세그먼트 오디오 ── */
function TTSFullAudio({ lang = "ko" }) {
  const ext = lang === "ko" ? "wav" : "mp3";
  const src = `/tts/${lang}/narration_full_${lang}.${ext}`;
  return <Audio src={src} volume={1} />;
}

/* ── 영상 플레이어 모달 ── */
function VideoPlayerModal({ video, onClose, C }) {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [secondLang, setSecondLang] = useState(null);
  const [showCC, setShowCC] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    const ext = lang === "ko" ? "wav" : "mp3";
    fetch(`/tts/${lang}/narration_full_${lang}.${ext}`, { method: "HEAD" })
      .then(r => setHasAudio(r.ok))
      .catch(() => setHasAudio(false));
  }, [lang]);

  // ESC 닫기
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const Comp = video.composition;
  const inputProps = { lang, secondLang, showCC, hasAudio };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 닫기 */}
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 24, zIndex: 10,
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10, padding: "8px 16px", color: "#fff", cursor: "pointer",
        fontSize: 13, fontWeight: 600,
      }}>
        ESC
      </button>

      {/* 제목 */}
      <h2 style={{
        fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 16,
        background: "linear-gradient(135deg,#7c6aff,#ec4899)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        {video.title}
      </h2>

      {/* 플레이어 */}
      <div style={{
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 8px 48px rgba(124,106,255,0.25)",
        border: "1px solid rgba(124,106,255,0.2)",
        maxWidth: "100%",
      }}>
        <Player
          component={Comp}
          inputProps={inputProps}
          durationInFrames={FPS * video.totalDuration}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={FPS}
          style={{ width: Math.min(1120, window.innerWidth - 48), height: Math.min(630, (window.innerWidth - 48) * 9 / 16) }}
          controls
          autoPlay
          loop={false}
          clickToPlay
        />
      </div>

      {/* 언어 컨트롤 */}
      <div style={{
        marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
      }}>
        {/* CC 토글 */}
        <button onClick={() => setShowCC(!showCC)} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
          background: showCC ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.05)",
          border: showCC ? "1px solid rgba(124,106,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
          color: showCC ? "#7c6aff" : "rgba(255,255,255,0.4)",
          fontSize: 12, fontWeight: 700,
        }}>
          CC {showCC ? "ON" : "OFF"}
        </button>

        {/* 이중자막 */}
        <button onClick={() => setSecondLang(secondLang ? null : (lang === "ko" ? "en" : "ko"))} style={{
          padding: "7px 14px", borderRadius: 8, cursor: "pointer",
          background: secondLang ? "rgba(236,72,153,0.12)" : "rgba(255,255,255,0.05)",
          border: secondLang ? "1px solid rgba(236,72,153,0.3)" : "1px solid rgba(255,255,255,0.1)",
          color: secondLang ? "#ec4899" : "rgba(255,255,255,0.4)",
          fontSize: 12, fontWeight: 700,
        }}>
          {secondLang ? "DUAL" : "DUAL OFF"}
        </button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />

        {/* 언어 선택 (음성 + 자막 동시 전환) */}
        {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
          <button
            key={code}
            onClick={() => { setLang(code); if (secondLang === code) setSecondLang(null); }}
            style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: code === lang ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.03)",
              border: code === lang ? "1px solid rgba(124,106,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
              color: code === lang ? "#7c6aff" : "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {flag} {label}
          </button>
        ))}
      </div>

      {!hasAudio && (
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          {lang.toUpperCase()} 음성 미생성 (한국어 음성만 활성화)
        </div>
      )}

      {/* 공유 버튼 */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => {
          const url = window.location.origin + "/ai/video_guide?v=" + video.id;
          navigator.clipboard.writeText(url).then(() => alert("링크가 복사되었습니다"));
        }} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 18px", color: "#fff", cursor: "pointer",
          fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          링크 복사
        </button>
        <button onClick={() => {
          const url = window.location.origin + "/ai/video_guide?v=" + video.id;
          if (navigator.share) {
            navigator.share({ title: video.title, text: video.description, url });
          } else {
            navigator.clipboard.writeText(url).then(() => alert("링크가 복사되었습니다"));
          }
        }} style={{
          background: "rgba(124,106,255,0.12)", border: "1px solid rgba(124,106,255,0.25)",
          borderRadius: 10, padding: "8px 18px", color: "#7c6aff", cursor: "pointer",
          fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          공유하기
        </button>
      </div>
    </div>
  );
}

/* ── 메인: 이용방법 갤러리 페이지 ── */
export default function VideoGuidePage({ C, theme }) {
  const [playing, setPlaying] = useState(null); // 재생 중인 영상 index

  // 영상 목록 — 나중에 추가할 수 있는 구조
  const [videos, setVideos] = useState([]);

  // URL 파라미터로 영상 자동 재생 (?v=intro)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v");
    if (videoId && videos.length > 0) {
      const idx = videos.findIndex(v => v.id === videoId);
      if (idx >= 0) setPlaying(idx);
    }
  }, [videos]);

  useEffect(() => {
    // 동적 import로 각 영상의 Composition을 로드
    import("./InfographicVideo.jsx").then(mod => {
      setVideos([
        {
          id: "intro",
          title: "SNS메이킷 소개",
          description: "SNS메이킷이 무엇인지, 어떤 문제를 해결하는지, 핵심 기능과 활용 방법을 3분 안에 소개합니다.",
          duration: "3:18",
          totalDuration: TOTAL_DURATION,
          languages: Object.keys(LANGUAGES),
          composition: mod.InfographicComposition,
        },
        // 향후 영상 추가 예시:
        // {
        //   id: "blog-writer",
        //   title: "AI 블로그 작성법",
        //   description: "키워드 하나로 SEO 최적화된 블로그 글을 자동 생성하는 방법",
        //   duration: "2:30",
        //   totalDuration: 150,
        //   languages: ["ko", "en"],
        //   composition: mod.BlogTutorialComposition,
        // },
      ]);
    });
  }, []);

  return (
    <div style={{ padding: "clamp(20px, 4vw, 40px) clamp(16px, 3vw, 32px)", maxWidth: 1200, margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: "clamp(32px, 5vw, 52px)", paddingTop: 8 }}>
        <h2 style={{
          fontSize: "clamp(22px,4.5vw,30px)", fontWeight: 900, color: C.text,
          marginBottom: 12, lineHeight: 1.3,
        }}>
          이용방법
        </h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 500 }}>
          SNS메이킷의 주요 기능과 활용법을 영상으로 확인하세요.<br />
          다국어 자막과 음성을 지원합니다.
        </p>
      </div>

      {/* 영상 그리드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "clamp(20px, 3vw, 28px)",
      }}>
        {videos.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            C={C}
            onPlay={() => setPlaying(i)}
          />
        ))}

        {/* 준비 중 카드 */}
        <div style={{
          borderRadius: 16, overflow: "hidden",
          background: C.card, border: "1px dashed " + C.border,
          opacity: 0.4, display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 280,
        }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 36, color: C.muted, marginBottom: 14, opacity: 0.5 }}>+</div>
            <div style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>
              더 많은 영상이 준비 중입니다
            </div>
          </div>
        </div>
      </div>

      {/* 하단 여백 */}
      <div style={{ height: 60 }} />

      {/* 플레이어 모달 */}
      {playing !== null && videos[playing] && (
        <VideoPlayerModal
          video={videos[playing]}
          onClose={() => setPlaying(null)}
          C={C}
        />
      )}
    </div>
  );
}
