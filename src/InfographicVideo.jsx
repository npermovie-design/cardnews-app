import { useState, useEffect, useCallback, useRef } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Sequence, Audio, staticFile,
} from "remotion";
import { NARRATION, LANGUAGES, DEFAULT_LANG, SCENE_TIMINGS, TOTAL_DURATION } from "./narration-data.js";
import { T } from "./infographic-i18n.js";

// ═══════════════════════════════════════════════
// SNS메이킷 인포그래픽 소개 영상 — 나레이션 대본 기반
// 16:9 (1920×1080), ~229초(3:49), 30fps, 다국어 CC + 세그먼트별 TTS
// ═══════════════════════════════════════════════

const K = {
  purple: "#7c6aff", pink: "#ec4899",
  dark: "#1a1730", white: "#ffffff",
  bg: "#0d0b1a", bgCard: "rgba(124,106,255,0.08)",
  muted: "rgba(255,255,255,0.5)",
  grad: "linear-gradient(135deg,#7c6aff,#ec4899)",
  gradBg: "linear-gradient(165deg,#0d0b1a 0%,#1a1040 50%,#0d0b1a 100%)",
};

const FPS = 30;
const DURATION = TOTAL_DURATION; // 229초 (TTS 실측 기반)
const TOTAL = FPS * DURATION;

/* ── 유틸 ── */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function fadeSlide(frame, fps, dir = "up", delay = 0) {
  const f = Math.max(0, frame - delay * fps);
  const enterEnd = fps * 0.5;
  const opacity = interpolate(f, [0, enterEnd], [0, 1], { extrapolateRight: "clamp" });
  const y = dir === "up" ? interpolate(f, [0, enterEnd], [40, 0], { extrapolateRight: "clamp" })
    : dir === "down" ? interpolate(f, [0, enterEnd], [-40, 0], { extrapolateRight: "clamp" }) : 0;
  const x = dir === "left" ? interpolate(f, [0, enterEnd], [60, 0], { extrapolateRight: "clamp" })
    : dir === "right" ? interpolate(f, [0, enterEnd], [-60, 0], { extrapolateRight: "clamp" }) : 0;
  return { opacity, transform: `translate(${x}px, ${y}px)` };
}

function useCountUp(frame, fps, end, startDelay = 0, dur = 1.5) {
  const f = Math.max(0, frame - startDelay * fps);
  const progress = Math.min(1, f / (dur * fps));
  return Math.floor(easeOut(progress) * end);
}

/* ── 플랫 SVG 아이콘 ── */
const Icon = ({ type, size = 28, color = "#fff" }) => {
  const s = { width: size, height: size, display: "block" };
  const icons = {
    clock: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    pen: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    caption: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" />
        <path d="M6 14h4M6 10h8M6 18h12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    image: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <rect x="2" y="3" width="20" height="18" rx="3" stroke={color} strokeWidth="1.8" />
        <circle cx="8" cy="9" r="2" stroke={color} strokeWidth="1.5" />
        <path d="M2 17l5-5 3 3 4-4 8 6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    zap: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.5" fill={color} />
      </svg>
    ),
    bulb: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M9 21h6M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    send: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth="1.8" />
        <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" stroke={color} strokeWidth="1.8" />
        <circle cx="18" cy="8" r="2.5" stroke={color} strokeWidth="1.5" />
        <path d="M18 14a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
    folder: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M3 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-3H5a2 2 0 0 0-2 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    download: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    rocket: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M12 2c-2 4-2 8 0 12m0-12c2 4 2 8 0 12m0-12s6 2 8 8c-2 2-5 3-8 4m0-12s-6 2-8 8c2 2 5 3 8 4M6 18l-2 2M18 18l2 2M9 22h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    play: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
        <path d="M10 8l6 4-6 4V8z" fill={color} />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <path d="M3 20h18M6 16v4M10 12v8M14 8v12M18 4v16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    layout: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
        <path d="M3 9h18M9 9v12" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" />
        <path d="M16 16l5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    share: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth="1.8" />
        <circle cx="18" cy="6" r="2.5" stroke={color} strokeWidth="1.8" />
        <circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth="1.8" />
        <path d="M8.5 10.8L15.5 7.2M8.5 13.2L15.5 16.8" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" style={s}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
        <path d="M8 12l3 3 5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return icons[type] || null;
};

/* ── 배경 요소들 ── */
function ParticleBg() {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 30 }, (_, i) => {
    const x = (i * 137.5) % 100;
    const y = (i * 73.3) % 100;
    const size = 2 + (i % 4);
    const speed = 0.2 + (i % 5) * 0.08;
    const yy = (y + frame * speed * 0.05) % 110 - 5;
    const op = 0.08 + (i % 3) * 0.06;
    return (
      <div key={i} style={{
        position: "absolute", left: `${x}%`, top: `${yy}%`,
        width: size, height: size, borderRadius: "50%",
        background: i % 2 === 0 ? K.purple : K.pink, opacity: op,
      }} />
    );
  });
  return <AbsoluteFill style={{ overflow: "hidden" }}>{dots}</AbsoluteFill>;
}

function GridBg({ opacity = 0.04 }) {
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#7c6aff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </AbsoluteFill>
  );
}

function GlowOrb({ x, y, color, size = 300 }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: "50%", background: color, filter: `blur(${size / 2}px)`, opacity: 0.15,
    }} />
  );
}

/* ── 나레이션 자막 오버레이 ── */
function NarrationText({ text, frame, fps, delay = 0 }) {
  const style = fadeSlide(frame, fps, "up", delay);
  return (
    <div style={{
      ...style, position: "absolute", bottom: 60, left: "50%",
      transform: `translateX(-50%) ${style.transform}`, width: "80%", textAlign: "center",
      zIndex: 10,
    }}>
      <div style={{
        display: "inline-block", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        borderRadius: 14, padding: "14px 32px",
        border: "1px solid rgba(124,106,255,0.15)",
      }}>
        <span style={{ fontSize: 20, color: "rgba(255,255,255,0.9)", fontWeight: 600, lineHeight: 1.6 }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 1: 공감 — 콘텐츠 제작의 막막함 (0~12초)
// "SNS 콘텐츠 만들 때마다 뭐 올려야 할지 막막했던 적 있으시죠..."
// ═══════════════════════════════════════════════════════════
function Scene01_Empathy({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tasks = [
    { icon: "pen", label: T("s01_task1", lang), delay: 0.6 },
    { icon: "caption", label: T("s01_task2", lang), delay: 0.9 },
    { icon: "caption", label: T("s01_task3", lang), delay: 1.2 },
    { icon: "image", label: T("s01_task4", lang), delay: 1.5 },
  ];

  // 시계 회전 애니메이션
  const clockRotate = interpolate(frame, [0, fps * 10], [0, 360], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg opacity={0.03} />
      <GlowOrb x="20%" y="25%" color="#ff6b6b" size={350} />
      <GlowOrb x="75%" y="60%" color={K.purple} size={300} />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 1000 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 64, fontWeight: 900, color: K.white, lineHeight: 1.4, marginBottom: 20 }}>
          {T("s01_title", lang)}
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.4), fontSize: 20, color: K.muted, marginBottom: 48 }}>
          {T("s01_sub", lang)}
        </div>

        {/* 타임라인 흐름도 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          {tasks.map((t, i) => {
            const s = spring({ frame: Math.max(0, frame - t.delay * fps), fps, config: { damping: 12, stiffness: 90 } });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  transform: `scale(${s})`, opacity: s,
                  background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
                  borderRadius: 16, padding: "20px 24px", textAlign: "center", minWidth: 120,
                }}>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                    <Icon type={t.icon} size={40} color="#ff6b6b" />
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{t.label}</div>
                </div>
                {i < tasks.length - 1 && (
                  <div style={{
                    opacity: s, fontSize: 20, color: "rgba(255,255,255,0.2)",
                  }}>→</div>
                )}
              </div>
            );
          })}
          {/* 시간 표시 */}
          <div style={{
            ...fadeSlide(frame, fps, "left", 2),
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: 16, padding: "20px 28px",
          }}>
            <div style={{ transform: `rotate(${clockRotate}deg)` }}>
              <Icon type="clock" size={32} color="#ff6b6b" />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ff6b6b" }}>{T("s01_time", lang)}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{T("s01_time_label", lang)}</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 2: SNS메이킷 등장 (12~19초)
// "그런데 이제는 그런 시간을 훨씬 줄일 수 있는 방법이 있습니다."
// ═══════════════════════════════════════════════════════════
function Scene02_Intro({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: Math.max(0, frame - 0.8 * fps), fps, config: { damping: 10, stiffness: 60 } });
  const ringScale = interpolate(frame, [fps * 0.5, fps * 3], [0.5, 1.2], { extrapolateRight: "clamp" });
  const ringOp = interpolate(frame, [fps * 0.5, fps * 3], [0.3, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <ParticleBg />
      <GlowOrb x="45%" y="35%" color={K.purple} size={500} />
      <GlowOrb x="55%" y="55%" color={K.pink} size={400} />

      {/* 펄스 링 */}
      <div style={{
        position: "absolute", width: 400, height: 400,
        borderRadius: "50%", border: "2px solid rgba(124,106,255,0.3)",
        transform: `scale(${ringScale})`, opacity: ringOp,
      }} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 24, color: K.muted, fontWeight: 600, marginBottom: 24 }}>
          {T("s02_pre", lang)}
        </div>

        <div style={{ transform: `scale(${logoScale})`, marginBottom: 28 }}>
          <div style={{
            fontSize: 80, fontWeight: 900, letterSpacing: -3,
            background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            SNS메이킷
          </div>
        </div>

        <div style={{ ...fadeSlide(frame, fps, "up", 1.5), fontSize: 22, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          {T("s02_post", lang)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 3: 사용자 고민 3가지 (19~30초)
// "처음 사이트에 들어오면 가장 먼저 보이는 건, 많은 분들이 실제로 겪는 고민..."
// ═══════════════════════════════════════════════════════════
function Scene03_UserPain({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pains = [
    { icon: "search", title: T("s03_p1_title", lang), desc: T("s03_p1_desc", lang), color: "#ff6b6b" },
    { icon: "clock", title: T("s03_p2_title", lang), desc: T("s03_p2_desc", lang), color: "#f59e0b" },
    { icon: "target", title: T("s03_p3_title", lang), desc: T("s03_p3_desc", lang), color: "#8b5cf6" },
  ];

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg opacity={0.03} />
      <GlowOrb x="15%" y="30%" color="#ff6b6b" size={300} />
      <GlowOrb x="85%" y="50%" color="#8b5cf6" size={300} />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 1100 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 18, color: K.pink, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
          YOUR PAIN POINTS
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 56, fontWeight: 900, color: K.white, marginBottom: 52, lineHeight: 1.3 }}>
          {T("s03_title", lang)}
        </div>

        <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
          {pains.map((p, i) => {
            const s = spring({ frame: Math.max(0, frame - (0.8 + i * 0.35) * fps), fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div key={i} style={{
                transform: `scale(${s}) translateY(${(1 - s) * 30}px)`, opacity: s,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${p.color}30`,
                borderRadius: 24, padding: "40px 32px", textAlign: "center", flex: 1, maxWidth: 300,
              }}>
                <div style={{
                  width: 76, height: 76, borderRadius: 20, margin: "0 auto 20px",
                  background: `${p.color}12`, border: `1px solid ${p.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon type={p.icon} size={42} color={p.color} />
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, color: K.white, marginBottom: 16 }}>{p.title}</div>
                <div style={{ fontSize: 22, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 4: 해결 구조 (30~40초)
// "이 사이트는 바로 그 고민을 해결하는 구조로 만들어져 있습니다."
// ═══════════════════════════════════════════════════════════
function Scene04_Solution({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { icon: "search", label: T("s04_step1", lang), desc: T("s04_step1d", lang), color: K.purple },
    { icon: "zap", label: T("s04_step2", lang), desc: T("s04_step2d", lang), color: K.pink },
    { icon: "send", label: T("s04_step3", lang), desc: T("s04_step3d", lang), color: "#06b6d4" },
    { icon: "chart", label: T("s04_step4", lang), desc: T("s04_step4d", lang), color: "#10b981" },
  ];

  const lineWidth = interpolate(frame, [fps * 1, fps * 4], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <GlowOrb x="50%" y="40%" color={K.purple} size={450} />
      <ParticleBg />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 1100 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 18, color: K.purple, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
          HOW IT WORKS
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 56, fontWeight: 900, color: K.white, marginBottom: 28, lineHeight: 1.3 }}>
          {T("s04_title1", lang)}<br />
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T("s04_title2", lang)}
          </span>
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.5), fontSize: 22, color: K.muted, marginBottom: 48 }}>
          {T("s04_sub", lang)}
        </div>

        {/* 4단계 플로우 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 12, position: "relative" }}>
          {/* 연결선 */}
          <div style={{
            position: "absolute", top: 40, left: "12%", right: "12%", height: 2,
            background: "rgba(255,255,255,0.06)", borderRadius: 1, overflow: "hidden",
          }}>
            <div style={{ width: `${lineWidth}%`, height: "100%", background: K.grad }} />
          </div>

          {steps.map((st, i) => {
            const s = spring({ frame: Math.max(0, frame - (0.8 + i * 0.4) * fps), fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div key={i} style={{
                flex: 1, textAlign: "center", position: "relative", zIndex: 1,
                transform: `scale(${s})`, opacity: s,
              }}>
                <div style={{
                  width: 84, height: 84, borderRadius: 22, margin: "0 auto 16px",
                  background: `${st.color}15`, border: `2px solid ${st.color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon type={st.icon} size={44} color={st.color} />
                </div>
                <div style={{ fontSize: 11, color: st.color, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>STEP 0{i + 1}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: K.white, marginBottom: 10 }}>{st.label}</div>
                <div style={{ fontSize: 13, color: K.muted }}>{st.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 5: AI 아이디어 + 활용 예시 (40~55초)
// "예를 들어 콘텐츠를 만들 때 가장 어려운 부분은 아이디어..."
// ═══════════════════════════════════════════════════════════
function Scene05_AITools({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const examples = [
    { label: T("s05_ex1", lang), color: "#e4405f" },
    { label: T("s05_ex2", lang), color: "#f59e0b" },
    { label: T("s05_ex3", lang), color: "#03c75a" },
    { label: T("s05_ex4", lang), color: "#ff0000" },
    { label: T("s05_ex5", lang), color: "#06b6d4" },
    { label: T("s05_ex6", lang), color: "#8b5cf6" },
  ];

  // 타이핑 애니메이션
  const typeText = T("s05_type", lang);
  const typeLen = Math.min(typeText.length, Math.floor(interpolate(frame, [fps * 1, fps * 3.5], [0, typeText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const cursor = frame % (fps * 0.8) < fps * 0.4;

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <GlowOrb x="25%" y="35%" color={K.purple} size={400} />
      <GlowOrb x="75%" y="55%" color={K.pink} size={350} />

      <div style={{ display: "flex", alignItems: "center", gap: 60, zIndex: 1, maxWidth: 1200, padding: "0 80px", width: "100%" }}>
        {/* 왼쪽 텍스트 */}
        <div style={{ flex: 1 }}>
          <div style={{ ...fadeSlide(frame, fps, "left", 0), fontSize: 14, color: K.purple, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
            AI-POWERED
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.2), fontSize: 54, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 24 }}>
            {T("s05_title1", lang)}<br />
            <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {T("s05_title2", lang)}
            </span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 17, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {T("s05_sub", lang)}
          </div>
        </div>

        {/* 오른쪽: AI 입력 UI + 예시 태그 */}
        <div style={{ ...fadeSlide(frame, fps, "right", 0.4), flex: 1 }}>
          {/* AI 입력창 모의 */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,106,255,0.2)",
            borderRadius: 20, padding: 28, marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Icon type="bulb" size={20} color={K.purple} />
              <span style={{ fontSize: 13, color: K.purple, fontWeight: 700 }}>{T("s05_ai_label", lang)}</span>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 18px",
              minHeight: 44, display: "flex", alignItems: "center",
            }}>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                {typeText.slice(0, typeLen)}
                {cursor && <span style={{ color: K.purple }}>|</span>}
              </span>
            </div>

            {/* 생성 결과 라인 */}
            <div style={{ marginTop: 16 }}>
              {[T("s05_r1", lang), T("s05_r2", lang), T("s05_r3", lang)].map((line, i) => {
                const lineOp = interpolate(frame, [fps * (4 + i * 0.5), fps * (4.5 + i * 0.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={i} style={{
                    opacity: lineOp, display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <Icon type="check" size={16} color={K.purple} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{line}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 바로 활용 예시 태그 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {examples.map((ex, i) => {
              const s = spring({ frame: Math.max(0, frame - (2 + i * 0.15) * fps), fps, config: { damping: 12, stiffness: 100 } });
              return (
                <span key={i} style={{
                  transform: `scale(${s})`, opacity: s,
                  background: `${ex.color}12`, border: `1px solid ${ex.color}30`,
                  borderRadius: 10, padding: "8px 16px", fontSize: 13,
                  fontWeight: 700, color: ex.color,
                }}>{ex.label}</span>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 6: 제작 시간 절감 (55~68초)
// "특히 제작 시간을 크게 줄여준다는 점이 가장 큰 장점입니다."
// ═══════════════════════════════════════════════════════════
function Scene06_TimeSave({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beforeW = interpolate(frame, [fps * 0.8, fps * 2], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const afterW = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hours = useCountUp(frame, fps, 120, 0.8, 1.5);
  const mins = useCountUp(frame, fps, 10, 1.5, 1.2);

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <GlowOrb x="30%" y="40%" color={K.purple} size={400} />
      <GlowOrb x="70%" y="50%" color="#10b981" size={350} />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 900 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 18, color: K.purple, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
          TIME SAVED
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 52, fontWeight: 900, color: K.white, marginBottom: 56, lineHeight: 1.3 }}>
          {T("s06_title1", lang)}<br />
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T("s06_title2", lang)}
          </span>
        </div>

        {/* Before / After 바 차트 */}
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {/* Before */}
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{T("s06_before", lang)}</span>
              <span style={{ fontSize: 20, color: "#ff6b6b", fontWeight: 800 }}>{hours}분+</span>
            </div>
            <div style={{ height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
              <div style={{
                width: `${beforeW}%`, height: "100%", borderRadius: 10,
                background: "linear-gradient(90deg, rgba(255,107,107,0.3), rgba(255,107,107,0.6))",
              }} />
            </div>
          </div>

          {/* After */}
          <div style={{ ...fadeSlide(frame, fps, "left", 1) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>SNS메이킷</span>
              <span style={{ fontSize: 20, fontWeight: 800, background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{mins}분</span>
            </div>
            <div style={{ height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
              <div style={{
                width: `${afterW * 0.08}%`, height: "100%", borderRadius: 10,
                background: K.grad,
              }} />
            </div>
          </div>

          {/* 핵심 수치 */}
          <div style={{
            ...fadeSlide(frame, fps, "up", 2),
            marginTop: 40, display: "inline-flex", alignItems: "center", gap: 16,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 16, padding: "16px 32px",
          }}>
            <Icon type="zap" size={28} color="#10b981" />
            <span style={{ fontSize: 28, fontWeight: 800, color: "#10b981" }}>{T("s06_time_save", lang)}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 7: 커뮤니티 (68~85초)
// "커뮤니티 구조도 굉장히 잘 되어 있습니다."
// ═══════════════════════════════════════════════════════════
function Scene07_Community({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topics = [
    { icon: "zap", label: T("s07_t1", lang), color: K.purple },
    { icon: "chart", label: T("s07_t2", lang), color: "#ff0000" },
    { icon: "send", label: T("s07_t3", lang), color: K.pink },
    { icon: "bulb", label: T("s07_t4", lang), color: "#f59e0b" },
  ];

  const posts = [
    { title: "ChatGPT 4o Reels Guide", tag: T("s07_t1", lang), views: "2.4K", color: K.purple },
    { title: "YouTube Shorts Algorithm", tag: T("s07_t2", lang), views: "1.8K", color: "#ff0000" },
    { title: "Instagram Hashtag 2026", tag: T("s07_t3", lang), views: "3.1K", color: K.pink },
  ];

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg opacity={0.03} />
      <GlowOrb x="20%" y="30%" color={K.purple} size={350} />
      <GlowOrb x="80%" y="60%" color={K.pink} size={300} />

      <div style={{ display: "flex", alignItems: "center", gap: 60, zIndex: 1, maxWidth: 1200, padding: "0 80px", width: "100%" }}>
        {/* 왼쪽: 설명 + 토픽 태그 */}
        <div style={{ flex: 1 }}>
          <div style={{ ...fadeSlide(frame, fps, "left", 0), fontSize: 14, color: K.purple, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
            COMMUNITY
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.2), fontSize: 54, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 24 }}>
            {T("s07_title1", lang)}<br />
            <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {T("s07_title2", lang)}
            </span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 17, color: K.muted, lineHeight: 1.7, marginBottom: 28, whiteSpace: "pre-line" }}>
            {T("s07_sub", lang)}
          </div>

          {/* 토픽 태그 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {topics.map((t, i) => {
              const s = spring({ frame: Math.max(0, frame - (1 + i * 0.2) * fps), fps, config: { damping: 12, stiffness: 100 } });
              return (
                <div key={i} style={{
                  transform: `scale(${s})`, opacity: s, display: "flex", alignItems: "center", gap: 8,
                  background: `${t.color}10`, border: `1px solid ${t.color}25`,
                  borderRadius: 10, padding: "8px 14px",
                }}>
                  <Icon type={t.icon} size={16} color={t.color} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 게시판 목업 */}
        <div style={{
          ...fadeSlide(frame, fps, "right", 0.6), flex: 1,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,106,255,0.15)",
          borderRadius: 20, overflow: "hidden",
        }}>
          {/* 헤더 */}
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon type="users" size={18} color={K.purple} />
            <span style={{ fontSize: 14, fontWeight: 700, color: K.white }}>{T("s07_board", lang)}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: K.muted }}>{T("s07_live", lang)}</span>
          </div>
          {/* 게시글 */}
          {posts.map((p, i) => {
            const postOp = interpolate(frame, [fps * (1.5 + i * 0.4), fps * (2 + i * 0.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: postOp, padding: "16px 24px",
                borderBottom: i < posts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${p.color}15`, color: p.color, fontWeight: 700 }}>{p.tag}</span>
                    <span style={{ fontSize: 11, color: K.muted }}>{T("s07_views", lang)} {p.views}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 8: 자료실 (85~100초)
// "자료실도 굉장히 실용적으로 구성되어 있습니다."
// ═══════════════════════════════════════════════════════════
function Scene08_Resources({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const resources = [
    { icon: "play", title: T("s08_r1", lang), desc: T("s08_r1d", lang), color: "#9146ff" },
    { icon: "layout", title: T("s08_r2", lang), desc: T("s08_r2d", lang), color: K.pink },
    { icon: "image", title: T("s08_r3", lang), desc: T("s08_r3d", lang), color: "#06b6d4" },
    { icon: "download", title: T("s08_r4", lang), desc: T("s08_r4d", lang), color: "#f59e0b" },
  ];

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <GlowOrb x="40%" y="40%" color={K.purple} size={450} />
      <ParticleBg />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 1100 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 14, color: "#06b6d4", fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
          RESOURCES
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 56, fontWeight: 900, color: K.white, marginBottom: 24, lineHeight: 1.3 }}>
          {T("s08_title1", lang)}<br />
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T("s08_title2", lang)}
          </span>
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.5), fontSize: 22, color: K.muted, marginBottom: 48 }}>
          {T("s08_sub", lang)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
          {resources.map((r, i) => {
            const s = spring({ frame: Math.max(0, frame - (0.8 + i * 0.25) * fps), fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div key={i} style={{
                transform: `scale(${s}) translateY(${(1 - s) * 20}px)`, opacity: s,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${r.color}25`,
                borderRadius: 20, padding: "32px 20px", textAlign: "center",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 18, margin: "0 auto 16px",
                  background: `${r.color}12`, border: `1px solid ${r.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon type={r.icon} size={40} color={r.color} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: K.white, marginBottom: 12, whiteSpace: "pre-line", lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: K.muted }}>{r.desc}</div>

                {/* 다운로드 버튼 모의 */}
                <div style={{
                  marginTop: 16, padding: "8px 16px", borderRadius: 10,
                  background: `${r.color}15`, border: `1px solid ${r.color}25`,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <Icon type="download" size={14} color={r.color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{T("s08_dl", lang)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 9: 타겟 유저 (100~115초)
// "처음 시작하는 분들부터 이미 운영 중인 분들까지..."
// ═══════════════════════════════════════════════════════════
function Scene09_ForEveryone({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const targets = [
    { icon: "pen", title: T("s09_t1", lang), desc: T("s09_t1d", lang), color: "#06b6d4" },
    { icon: "users", title: T("s09_t2", lang), desc: T("s09_t2d", lang), color: K.purple },
    { icon: "chart", title: T("s09_t3", lang), desc: T("s09_t3d", lang), color: K.pink },
    { icon: "rocket", title: T("s09_t4", lang), desc: T("s09_t4d", lang), color: "#10b981" },
  ];

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <GlowOrb x="30%" y="30%" color={K.purple} size={400} />
      <GlowOrb x="70%" y="60%" color={K.pink} size={350} />

      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 1100 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 14, color: K.pink, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
          FOR EVERYONE
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 56, fontWeight: 900, color: K.white, marginBottom: 24, lineHeight: 1.3 }}>
          {T("s09_title1", lang)}<br />
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T("s09_title2", lang)}
          </span>
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.5), fontSize: 22, color: K.muted, marginBottom: 52 }}>
          {T("s09_sub", lang)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
          {targets.map((t, i) => {
            const s = spring({ frame: Math.max(0, frame - (0.8 + i * 0.25) * fps), fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div key={i} style={{
                transform: `scale(${s})`, opacity: s,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${t.color}20`,
                borderRadius: 20, padding: "36px 20px", textAlign: "center",
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%", margin: "0 auto 16px",
                  background: `${t.color}12`, border: `1px solid ${t.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon type={t.icon} size={40} color={t.color} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: K.white, marginBottom: 14 }}>{t.title}</div>
                <div style={{ fontSize: 20, color: K.muted, lineHeight: 1.6, whiteSpace: "pre-line" }}>{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// 씬 10: CTA 클로징 (115~130초)
// "결국 중요한 건 더 빠르게 만들고, 더 꾸준히 올리는 것..."
// ═══════════════════════════════════════════════════════════
function Scene10_CTA({ lang = "ko" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;
  const btnScale = spring({ frame: Math.max(0, frame - 2 * fps), fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <GridBg />
      <ParticleBg />
      <GlowOrb x="45%" y="35%" color={K.purple} size={600} />
      <GlowOrb x="55%" y="55%" color={K.pink} size={500} />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), fontSize: 22, color: K.muted, fontWeight: 600, marginBottom: 20 }}>
          {T("s10_pre", lang)}
        </div>

        <div style={{ ...fadeSlide(frame, fps, "up", 0.3) }}>
          <div style={{ fontSize: 62, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 10 }}>
            {T("s10_line1", lang)}
          </div>
          <div style={{
            fontSize: 62, fontWeight: 900, lineHeight: 1.3,
            background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {T("s10_line2", lang)}
          </div>
        </div>

        <div style={{ ...fadeSlide(frame, fps, "up", 1), fontSize: 20, color: K.muted, marginTop: 28, marginBottom: 40, lineHeight: 1.6, whiteSpace: "pre-line" }}>
          {T("s10_sub", lang)}
        </div>

        <div style={{ transform: `scale(${btnScale * pulse})` }}>
          <div style={{
            display: "inline-block", background: K.grad,
            borderRadius: 18, padding: "22px 64px",
            fontSize: 30, fontWeight: 800, color: K.white,
            boxShadow: "0 8px 40px rgba(124,106,255,0.4)",
          }}>
            {T("s10_cta", lang)}
          </div>
        </div>

        <div style={{
          ...fadeSlide(frame, fps, "up", 2.5),
          marginTop: 36, fontSize: 48, fontWeight: 900,
          background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          snsmakeit.com
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// CC 자막 오버레이 — 다국어 지원
// ═══════════════════════════════════════════════════════════
function CCOverlay({ lang = "ko", secondLang = null, show = true }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  if (!show) return null;

  // 현재 시간에 해당하는 자막 찾기
  // 각 자막은 다음 자막이 시작될 때까지 유지
  const idx = NARRATION.findIndex((n, i) => {
    const nextStart = i < NARRATION.length - 1 ? NARRATION[i + 1].start : n.end + 2;
    return timeSec >= n.start && timeSec < nextStart;
  });
  if (idx < 0) return null;
  const current = NARRATION[idx];
  const nextStart = idx < NARRATION.length - 1 ? NARRATION[idx + 1].start : current.end + 2;

  // 20자 단위 줄바꿈
  const wrap20 = (txt) => {
    if (!txt || txt.length <= 20) return txt;
    const result = [];
    let remain = txt;
    while (remain.length > 20) {
      let cut = 20;
      // 공백/쉼표 기준으로 자연스럽게 자르기
      for (let j = 20; j > 10; j--) {
        if (remain[j] === " " || remain[j] === "," || remain[j] === ".") { cut = j; break; }
      }
      result.push(remain.slice(0, cut).trim());
      remain = remain.slice(cut).trim();
    }
    if (remain) result.push(remain);
    return result.join("\n");
  };
  const mainText = wrap20(current[lang] || "");
  const subText = secondLang && secondLang !== lang ? wrap20(current[secondLang] || "") : "";

  // 자막 진입/퇴장 애니메이션
  const elapsed = timeSec - current.start;
  const enterOp = Math.min(1, elapsed / 0.3);
  const exitOp = Math.min(1, (nextStart - timeSec) / 0.3);
  const opacity = Math.min(enterOp, exitOp);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 5% 48px", pointerEvents: "none", zIndex: 50 }}>
      <div style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 8}px)`,
        textAlign: "center", maxWidth: "88%",
      }}>
        {/* 메인 자막 */}
        <div style={{
          display: "inline-block",
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
          borderRadius: 14, padding: "12px 28px",
          border: "1px solid rgba(124,106,255,0.12)",
        }}>
          <div style={{
            fontSize: 28, fontWeight: 700, color: "#fff",
            lineHeight: 1.5, wordBreak: "keep-all", whiteSpace: "pre-line",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>
            {mainText}
          </div>

          {/* 보조 자막 (이중언어) */}
          {subText && (
            <div style={{
              fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.6)",
              lineHeight: 1.5, marginTop: 6, wordBreak: "keep-all",
            }}>
              {subText}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// TTS 오디오 — 끊김 없는 단일 트랙 재생
// ═══════════════════════════════════════════════════════════
function TTSFullAudio({ lang = "ko" }) {
  const ext = lang === "ko" ? "wav" : "mp3";
  const src = `/tts/${lang}/narration_full_${lang}.${ext}`;
  return <Audio src={src} volume={1} />;
}

/* ═══ 메인 컴포지션 ═══ */
const SCENE_COMPONENTS = [
  Scene01_Empathy, Scene02_Intro, Scene03_UserPain, Scene04_Solution,
  Scene05_AITools, Scene06_TimeSave, Scene07_Community,
  Scene08_Resources, Scene09_ForEveryone, Scene10_CTA,
];

function InfographicComposition({ lang = "ko", secondLang = null, showCC = true, hasAudio = false }) {
  return (
    <AbsoluteFill style={{ background: K.gradBg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      {/* 상시 배경 (검은 화면 방지) */}
      <GridBg opacity={0.02} />

      {SCENE_TIMINGS.map((timing, i) => {
        const Component = SCENE_COMPONENTS[i];
        if (!Component) return null;
        // 다음 씬 시작까지 확장하여 갭 제거
        const nextFrom = i < SCENE_TIMINGS.length - 1 ? SCENE_TIMINGS[i + 1].from : timing.from + timing.dur;
        const extendedDur = nextFrom - timing.from;
        return (
          <Sequence key={timing.id} from={Math.round(timing.from * FPS)} durationInFrames={Math.round(extendedDur * FPS)}>
            <Component lang={lang} />
          </Sequence>
        );
      })}

      {/* CC 자막 */}
      <CCOverlay lang={lang} secondLang={secondLang} show={showCC} />

      {/* 배경음악 (잔잔한 앰비언트, 음성보다 작게) */}
      <Audio src="/tts/bgm-ambient.mp3" volume={0.12} loop />

      {/* TTS 단일 트랙 (끊김 없음) */}
      {hasAudio && <TTSFullAudio lang={lang} />}
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════
// CC 언어 선택 컨트롤 (플레이어 외부 UI)
// ═══════════════════════════════════════════════════════════
function CCControls({ lang, setLang, secondLang, setSecondLang, showCC, setShowCC }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
      {/* CC 토글 */}
      <button
        onClick={() => setShowCC(!showCC)}
        style={{
          padding: "8px 16px", borderRadius: 10, cursor: "pointer",
          background: showCC ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.05)",
          border: showCC ? "1px solid rgba(124,106,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
          color: showCC ? "#7c6aff" : "rgba(255,255,255,0.4)",
          fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <path d="M8 10c-.5-.3-1-.5-1.5-.5C5.1 9.5 4 10.6 4 12s1.1 2.5 2.5 2.5c.5 0 1-.2 1.5-.5" strokeLinecap="round" />
          <path d="M16 10c-.5-.3-1-.5-1.5-.5-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5c.5 0 1-.2 1.5-.5" strokeLinecap="round" />
        </svg>
        CC
      </button>

      {/* 언어 선택 드롭다운 */}
      {showCC && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span>{LANGUAGES[lang]?.flag}</span>
            <span>{LANGUAGES[lang]?.label}</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>&#9662;</span>
          </button>

          {open && (
            <div style={{
              position: "absolute", bottom: "110%", left: 0, zIndex: 100,
              background: "rgba(20,18,36,0.95)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(124,106,255,0.2)", borderRadius: 14,
              padding: 8, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
              <div style={{ padding: "6px 12px", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: 1 }}>
                SUBTITLE LANGUAGE
              </div>
              {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: code === lang ? "rgba(124,106,255,0.15)" : "transparent",
                    color: code === lang ? "#7c6aff" : "#fff", fontSize: 14, fontWeight: 600,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 12, opacity: 0.7, minWidth: 24 }}>{flag}</span>
                  <span>{label}</span>
                  {code === lang && <span style={{ marginLeft: "auto", fontSize: 12 }}>&#10003;</span>}
                </button>
              ))}

              {/* 이중자막 토글 */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0", padding: "6px 12px 2px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                  DUAL SUBTITLE
                </div>
                <button
                  onClick={() => { setSecondLang(secondLang ? null : (lang === "ko" ? "en" : "ko")); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: secondLang ? "rgba(236,72,153,0.12)" : "transparent",
                    color: secondLang ? "#ec4899" : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: 600, textAlign: "left",
                  }}
                >
                  <span>{secondLang ? "ON" : "OFF"}</span>
                  <span style={{ fontSize: 12 }}>
                    {secondLang
                      ? `${LANGUAGES[lang]?.label} + ${LANGUAGES[secondLang]?.label}`
                      : "이중 자막 표시"}
                  </span>
                </button>
                {secondLang && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 0" }}>
                    {Object.entries(LANGUAGES).filter(([c]) => c !== lang).map(([code, { label, flag }]) => (
                      <button
                        key={code}
                        onClick={() => setSecondLang(code)}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: code === secondLang ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.03)",
                          color: code === secondLang ? "#ec4899" : "rgba(255,255,255,0.5)",
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        {flag} {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TTS 생성 버튼 (브라우저에서 edge-tts 스크립트 실행 안내)
// ═══════════════════════════════════════════════════════════
function TTSStatus({ hasAudio, lang }) {
  const [checking, setChecking] = useState(true);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    fetch(`/tts/${lang}/narration_full_${lang}.${lang === "ko" ? "wav" : "mp3"}`, { method: "HEAD" })
      .then(r => { setExists(r.ok); setChecking(false); })
      .catch(() => { setExists(false); setChecking(false); });
  }, [lang]);

  if (checking) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 16px", borderRadius: 10,
      background: exists ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${exists ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: exists ? "#10b981" : "rgba(255,255,255,0.2)",
      }} />
      <span style={{ fontSize: 12, color: exists ? "#10b981" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>
        {exists ? `TTS (${lang.toUpperCase()})` : "TTS 미생성"}
      </span>
      {!exists && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          pip install edge-tts && python scripts/generate-tts.py --lang {lang} --segments
        </span>
      )}
    </div>
  );
}

/* ═══ 프리뷰 페이지 ═══ */
export default function InfographicVideoPage() {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [secondLang, setSecondLang] = useState(null);
  const [showCC, setShowCC] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);

  // TTS 세그먼트 파일 존재 여부 체크 (첫번째 세그먼트로 확인)
  useEffect(() => {
    fetch(`/tts/${lang}/narration_full_${lang}.${lang === "ko" ? "wav" : "mp3"}`, { method: "HEAD" })
      .then(r => setHasAudio(r.ok))
      .catch(() => setHasAudio(false));
  }, [lang]);

  const inputProps = { lang, secondLang, showCC, hasAudio };

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0b1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 24,
    }}>
      <h1 style={{
        fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 24,
        background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        SNS메이킷 소개 영상 프리뷰
      </h1>

      {/* 영상 플레이어 */}
      <div style={{
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 8px 48px rgba(124,106,255,0.25)",
        border: "1px solid rgba(124,106,255,0.2)",
      }}>
        <Player
          component={InfographicComposition}
          inputProps={inputProps}
          durationInFrames={TOTAL}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={FPS}
          style={{ width: 1120, height: 630 }}
          controls
          autoPlay={false}
          loop={false}
          clickToPlay
        />
      </div>

      {/* 하단 컨트롤 바 */}
      <div style={{
        marginTop: 16, display: "flex", gap: 16, alignItems: "center",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {/* CC 컨트롤 */}
        <CCControls
          lang={lang} setLang={setLang}
          secondLang={secondLang} setSecondLang={setSecondLang}
          showCC={showCC} setShowCC={setShowCC}
        />

        {/* 구분선 */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

        {/* TTS 상태 */}
        <TTSStatus hasAudio={hasAudio} lang={lang} />

        {/* 구분선 */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

        {/* 영상 정보 */}
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          16:9 &middot; 1920x1080 &middot; {DURATION}s &middot; 30fps
        </span>
      </div>

      {/* 지원 언어 안내 */}
      <div style={{
        marginTop: 16, display: "flex", gap: 8, alignItems: "center",
      }}>
        {Object.entries(LANGUAGES).map(([code, { label, flag }]) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              background: code === lang ? "rgba(124,106,255,0.12)" : "transparent",
              border: code === lang ? "1px solid rgba(124,106,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
              color: code === lang ? "#7c6aff" : "rgba(255,255,255,0.35)",
              fontSize: 12, fontWeight: 600,
            }}
          >
            {flag} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { InfographicComposition };
