import { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const SHORTS_API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// ════════════════════════════════════════
// Remotion 컴포지션 — 세그먼트 기반 (텍스트 애니메이션 + GIF)
// ════════════════════════════════════════
function SceneComposition({ segments, audioUrl, style }) {
  const { fps, durationInFrames } = useVideoConfig();
  const bg = style?.bg || "#0d0d1a";
  return (
    <AbsoluteFill style={{ background: bg }}>
      {segments.map((seg, i) => {
        const from = Math.round((seg.startSec || 0) * fps);
        const dur = Math.max(1, Math.round((seg.endSec - seg.startSec) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            {seg.type === "gif" ? (
              <GifSegment src={seg.gifUrl} text={seg.text} style={style} />
            ) : (
              <TextSegment text={seg.text} animation={seg.animation || "fade"} style={style} segIndex={i} totalSegs={segments.length} />
            )}
          </Sequence>
        );
      })}
      {/* 자막: 세그먼트 텍스트를 시간에 맞춰 표시 */}
      <SegmentCaptions segments={segments} />
      {audioUrl && <Audio src={audioUrl} volume={1} />}
    </AbsoluteFill>
  );
}

// ── 세그먼트 기반 자막 (음성에 맞춰 계속 변경) ──
function SegmentCaptions({ segments }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;
  const current = segments.find(s => sec >= s.startSec && sec < s.endSec);
  if (!current || !current.text) return null;

  // 세그먼트 내 단어별 순차 표시
  const words = current.text.split(/\s+/);
  const segDur = current.endSec - current.startSec;
  const elapsed = sec - current.startSec;
  const progress = elapsed / segDur;
  const visibleWords = Math.ceil(words.length * Math.min(1, progress * 1.5));

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 4% 4%", pointerEvents: "none" }}>
      <div style={{ background: "rgba(0,0,0,0.85)", borderRadius: 10, padding: "10px 24px", maxWidth: "94%",
        border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.5, wordBreak: "keep-all" }}>
          {words.map((w, i) => (
            <span key={i} style={{ color: i < visibleWords ? "#fff" : "rgba(255,255,255,0.25)" }}>{w} </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 텍스트 애니메이션 세그먼트 — 6종 애니메이션
// ═══════════════════════════════════════════════
function TextSegment({ text, animation, style, segIndex, totalSegs }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const accent = style?.titleColor || "#7c6aff";

  // 입퇴장
  const enterEnd = Math.min(fps * 0.6, durationInFrames * 0.25);
  const exitStart = Math.max(0, durationInFrames - fps * 0.4);
  const enterOp = interpolate(frame, [0, enterEnd], [0, 1], { extrapolateRight: "clamp" });
  const exitOp = interpolate(frame, [exitStart, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(enterOp, exitOp);

  // 애니메이션별 스타일
  const anim = animation || "fade";

  // ── fade: 심플 페이드 + 스케일 ──
  if (anim === "fade") {
    const s = spring({ frame, fps, config: { damping: 20 } });
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.3,
          wordBreak: "keep-all", transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`,
          textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>{text}</div>
      </AbsoluteFill>
    );
  }

  // ── typewriter: 한 글자씩 타이핑 ──
  if (anim === "typewriter") {
    const charsPerFrame = 0.5;
    const visible = Math.floor(frame * charsPerFrame);
    const display = (text || "").slice(0, visible);
    const showCursor = visible < (text || "").length;
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.4,
          wordBreak: "keep-all", fontFamily: "monospace",
          textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
          {display}{showCursor && <span style={{ color: accent, opacity: interpolate(frame % fps, [0, fps/2, fps], [1, 0, 1]) }}>|</span>}
        </div>
      </AbsoluteFill>
    );
  }

  // ── highlight: 단어별 순차 하이라이트 ──
  if (anim === "highlight") {
    const words = (text || "").split(/\s+/);
    const framesPerWord = Math.max(4, Math.floor(durationInFrames * 0.6 / words.length));
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
        <div style={{ fontSize: 48, fontWeight: 800, textAlign: "center", lineHeight: 1.5, wordBreak: "keep-all" }}>
          {words.map((w, i) => {
            const wordStart = i * framesPerWord;
            const isActive = frame >= wordStart;
            const isHighlighted = frame >= wordStart && frame < wordStart + framesPerWord + 6;
            return (
              <span key={i} style={{
                color: isActive ? "#fff" : "rgba(255,255,255,0.2)",
                backgroundColor: isHighlighted ? `${accent}30` : "transparent",
                borderRadius: 6, padding: "2px 4px",
                textShadow: isActive ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
              }}>{w} </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── scale: 큰 임팩트 줌인 ──
  if (anim === "scale") {
    const s = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6%", opacity }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: accent, textAlign: "center", lineHeight: 1.15,
          wordBreak: "keep-all", transform: `scale(${interpolate(s, [0, 1], [2.5, 1])})`,
          textShadow: `0 0 60px ${accent}50, 0 4px 24px rgba(0,0,0,0.8)` }}>{text}</div>
      </AbsoluteFill>
    );
  }

  // ── slide: 아래에서 슬라이드 업 ──
  if (anim === "slide") {
    const s = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.3,
          wordBreak: "keep-all", transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)`,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{text}</div>
      </AbsoluteFill>
    );
  }

  // ── counter: 숫자 카운트업 (숫자가 포함된 경우) ──
  if (anim === "counter") {
    const numMatch = (text || "").match(/(\d[\d,.]*)/);
    const numVal = numMatch ? parseFloat(numMatch[1].replace(/,/g, "")) : 0;
    const prog = spring({ frame, fps, config: { damping: 30, stiffness: 80 } });
    const current = Math.round(numVal * prog);
    const displayText = numMatch ? (text || "").replace(numMatch[1], current.toLocaleString()) : text;
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.3,
          wordBreak: "keep-all", textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{displayText}</div>
      </AbsoluteFill>
    );
  }

  // fallback
  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%", opacity }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.4,
        wordBreak: "keep-all", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{text}</div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// GIF 세그먼트 — GIF + 하단 자막
// ═══════════════════════════════════════════════
function GifSegment({ src, text, style }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enterOp = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const exitOp = interpolate(frame, [durationInFrames - fps * 0.3, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(enterOp, exitOp);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* GIF 배경 (꽉 채움) */}
      {src && <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
      {/* 하단 자막 */}
      {text && (
        <div style={{ position: "absolute", bottom: "6%", left: "5%", right: "5%", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(0,0,0,0.8)", borderRadius: 10, padding: "10px 24px" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.4,
              wordBreak: "keep-all", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{text}</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// (레거시 호환 — 기존 코드에서 참조하는 컴포넌트들)
function GlassCard({ children, style: s, frame, fps, delay = 0 }) {
  const enter = spring({ frame, fps, delay, config: { damping: 20, stiffness: 120 } });
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
      padding: "20px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
      ...s,
    }}>{children}</div>
  );
}

// ── 번호 배지 (01, 02, 03) ──
function NumberBadge({ num, color, size = 44, frame, fps, delay = 0 }) {
  const s = spring({ frame, fps, delay, config: { damping: 15, stiffness: 150 } });
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: `${color}18`, border: `1.5px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 900, color,
      transform: `scale(${s})`,
    }}>{String(num).padStart(2, "0")}</div>
  );
}

// ── 수치 카드 (VIX 15.06 같은) ──
function StatCard({ label, value, sub, color = "#fff", frame, fps, delay = 0 }) {
  const enter = spring({ frame, fps, delay, config: { damping: 20 } });
  const counterProg = spring({ frame, fps, delay: delay + 8, config: { damping: 30, stiffness: 80 } });
  const numVal = typeof value === "number" ? Math.round(value * counterProg) : value;
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 14,
      padding: "16px 14px", textAlign: "center",
      border: "1px solid rgba(255,255,255,0.08)",
      opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
        {typeof value === "number" ? numVal.toLocaleString() : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: sub.startsWith("+") ? "#4ade80" : sub.startsWith("-") ? "#f87171" : "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── 리스트 아이템 (번호 + 텍스트 카드) ──
function ListItem({ num, text, color, frame, fps, delay = 0, light = false }) {
  const enter = spring({ frame, fps, delay, config: { damping: 20 } });
  const bg = light ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.06)";
  const textColor = light ? "#1a1a2e" : "#fff";
  const borderColor = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      background: bg, borderRadius: 14, padding: "18px 22px",
      border: `1px solid ${borderColor}`,
      opacity: enter, transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
    }}>
      <NumberBadge num={num} color={color} size={42} frame={frame} fps={fps} delay={delay + 4} />
      <div style={{ fontSize: 20, fontWeight: 800, color: textColor, lineHeight: 1.3, wordBreak: "keep-all" }}>{text}</div>
    </div>
  );
}

// ── 태그/배지 ──
function Tag({ text, color, frame, fps, delay = 0 }) {
  const enter = spring({ frame, fps, delay, config: { damping: 20, stiffness: 200 } });
  return (
    <span style={{
      display: "inline-block", padding: "6px 16px", borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}35`,
      fontSize: 13, fontWeight: 700, color,
      opacity: enter, transform: `scale(${enter})`,
    }}>{text}</span>
  );
}

// ── 프로그레스 바 (하단) ──
function ProgressBar({ color, frame, durationInFrames }) {
  return <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: "rgba(0,0,0,0.4)" }}>
    <div style={{ height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, width: `${interpolate(frame, [0, durationInFrames], [0, 100])}%`, borderRadius: "0 3px 3px 0", boxShadow: `0 0 12px ${color}60` }} />
  </div>;
}

// ── 타이핑 효과 텍스트 ──
function TypewriterText({ text, frame, fps, delay = 0, style: s }) {
  const charsPerFrame = 0.6;
  const startFrame = delay;
  const visibleChars = Math.floor(Math.max(0, (frame - startFrame) * charsPerFrame));
  const displayText = (text || "").slice(0, visibleChars);
  const showCursor = frame >= startFrame && visibleChars < (text || "").length;
  return <span style={s}>{displayText}{showCursor ? <span style={{ opacity: interpolate(frame % fps, [0, fps/2, fps], [1, 0, 1]) }}>|</span> : null}</span>;
}

// ── 카운터 애니메이션 (숫자가 올라감) ──
function AnimatedCounter({ value, frame, fps, delay = 0, suffix = "", style: s }) {
  const prog = spring({ frame, fps, delay, config: { damping: 30, stiffness: 80 } });
  const num = Math.round(value * prog);
  return <span style={s}>{num.toLocaleString()}{suffix}</span>;
}

// ── SVG 원형 프로그레스 ──
function CircleProgress({ progress, size, strokeWidth, color, bgColor, frame, fps }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const p = spring({ frame, fps, config: { damping: 30 } });
  const offset = circ - (progress * p * circ);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bgColor || "rgba(255,255,255,0.1)"} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ── 바 차트 (spring 스태거) ──
function BarChart({ data, frame, fps, colors, maxH }) {
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: maxH }}>
      {data.map((d, i) => {
        const h = spring({ frame, fps, delay: i * 5, config: { damping: 18, stiffness: 80 } });
        const barH = (d.value / maxVal) * maxH * h;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: colors[i % colors.length], marginBottom: 4, opacity: h }}>{d.label}</div>
            <div style={{ width: "100%", height: barH, background: colors[i % colors.length], borderRadius: "4px 4px 0 0", minWidth: 8 }} />
          </div>
        );
      })}
    </div>
  );
}

// ── 움직이는 파티클 시스템 ──
function Particles({ count, frame, fps, durationInFrames, colors, shapes }) {
  return Array.from({ length: count }).map((_, i) => {
    const seed = i * 137.508; // golden angle
    const startX = ((seed * 7) % 100);
    const speed = 0.3 + (i % 5) * 0.15;
    const y = interpolate(frame, [0, durationInFrames], [110 + (i % 3) * 10, -15 - (i % 4) * 5], { extrapolateRight: "clamp" });
    const x = startX + Math.sin(frame / fps * (1 + i * 0.3) + seed) * 8;
    const rot = frame * (i % 2 === 0 ? 1.5 : -1.5);
    const opacity = interpolate(frame, [0, fps * 0.5, durationInFrames - fps, durationInFrames], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const size = 10 + (i % 4) * 6;
    return (
      <div key={i} style={{
        position: "absolute", left: `${x}%`, top: `${y}%`,
        fontSize: size, color: colors[i % colors.length], opacity,
        transform: `rotate(${rot}deg)`, pointerEvents: "none",
      }}>{shapes[i % shapes.length]}</div>
    );
  });
}

// ── 글로잉 오브 (빛나는 구체) ──
function GlowOrb({ x, y, size, color, frame, fps, delay = 0 }) {
  const pulse = 1 + Math.sin((frame - delay) / fps * 2) * 0.15;
  const opacity = spring({ frame, fps, delay, config: { damping: 200 } });
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      width: size * pulse, height: size * pulse, borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity: opacity * 0.5, transform: "translate(-50%, -50%)", pointerEvents: "none",
    }} />
  );
}

// ── 그리드 라인 배경 ──
function GridLines({ frame, fps, color, count = 8 }) {
  const opacity = interpolate(frame, [0, fps], [0, 0.08], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * (100 / (count + 1))}%`, height: 1, background: color }} />
      ))}
      {Array.from({ length: count }).map((_, i) => (
        <div key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * (100 / (count + 1))}%`, width: 1, background: color }} />
      ))}
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 레이아웃별 씬 렌더러 — AI가 결정한 layout 타입에 따라 완전히 다른 비주얼
// ═══════════════════════════════════════════════

// ── Layout: hero (인트로/결론 — 큰 제목 중앙) ──
function LayoutHero({ title, sub, tag, accent, f }) {
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%" }}>
      {tag && <Tag text={tag} color={accent} frame={f.frame} fps={f.fps} />}
      <div style={{ fontSize: 56, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.12, textAlign: "center",
        marginTop: 20, wordBreak: "keep-all", opacity: f.enter, transform: `translateY(${interpolate(f.enter, [0, 1], [40, 0])}px)`,
        textShadow: f.isDark ? "0 4px 30px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      {sub && <div style={{ fontSize: 22, color: f.isDark ? "rgba(255,255,255,0.65)" : "#666", marginTop: 18, textAlign: "center",
        lineHeight: 1.6, opacity: f.d1, wordBreak: "keep-all", maxWidth: "85%" }}>{sub}</div>}
    </AbsoluteFill>
  );
}

// ── Layout: list (번호 카드 리스트 — KEY FEATURES 스타일) ──
function LayoutList({ title, points, tag, accent, f }) {
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "7% 7%" }}>
      {tag && <div style={{ fontSize: 13, fontWeight: 700, color: accent, letterSpacing: 4, marginBottom: 16, opacity: f.enter, textTransform: "uppercase" }}>{tag}</div>}
      <div style={{ fontSize: 44, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.15, marginBottom: 24,
        opacity: f.enter, transform: `translateY(${interpolate(f.enter, [0, 1], [30, 0])}px)`, wordBreak: "keep-all",
        textShadow: f.isDark ? "0 4px 24px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {points.map((p, i) => (
          <ListItem key={i} num={i + 1} text={p} color={accent} frame={f.frame} fps={f.fps} delay={12 + i * 8} light={!f.isDark} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: stats (수치 카드 — 시장 데이터/KPI 스타일) ──
function LayoutStats({ title, stats, tag, accent, f }) {
  const colors = ["#00d4ff", "#7c6aff", "#4ade80", "#f59e0b"];
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "7%" }}>
      {tag && <Tag text={tag} color={accent} frame={f.frame} fps={f.fps} />}
      <div style={{ fontSize: 48, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.15, textAlign: "center",
        marginTop: 16, marginBottom: 32, opacity: f.enter, wordBreak: "keep-all",
        textShadow: f.isDark ? "0 4px 24px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      <div style={{ display: "flex", gap: 14, width: "100%" }}>
        {stats.slice(0, 4).map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} sub={s.sub} color={colors[i % 4]} frame={f.frame} fps={f.fps} delay={14 + i * 8} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: compare (비교 — 좌우 카드 + 중앙 VS) ──
function LayoutCompare({ title, points, tag, accent, f }) {
  const a = points[0] || "";
  const b = points[1] || "";
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "7%" }}>
      {tag && <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 4, marginBottom: 12, opacity: f.enter }}>{tag}</div>}
      <div style={{ fontSize: 42, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", textAlign: "center", marginBottom: 28,
        opacity: f.enter, wordBreak: "keep-all", textShadow: f.isDark ? "0 4px 20px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
        <GlassCard frame={f.frame} fps={f.fps} delay={10} style={{ flex: 1, padding: "24px 20px", textAlign: "center",
          background: f.isDark ? "rgba(0,212,255,0.08)" : "rgba(59,89,152,0.06)", border: `1.5px solid ${f.isDark ? "rgba(0,212,255,0.2)" : "rgba(59,89,152,0.15)"}` }}>
          <NumberBadge num="A" color={accent} size={42} frame={f.frame} fps={f.fps} delay={14} />
          <div style={{ fontSize: 20, fontWeight: 700, color: f.isDark ? "#fff" : "#1a1a2e", marginTop: 12, lineHeight: 1.4, wordBreak: "keep-all" }}>{a}</div>
        </GlassCard>
        <div style={{ fontSize: 24, fontWeight: 900, color: accent, opacity: f.d1, flexShrink: 0 }}>VS</div>
        <GlassCard frame={f.frame} fps={f.fps} delay={18} style={{ flex: 1, padding: "24px 20px", textAlign: "center",
          background: f.isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.06)", border: `1.5px solid ${f.isDark ? "rgba(124,106,255,0.2)" : "rgba(124,106,255,0.15)"}` }}>
          <NumberBadge num="B" color="#a78bfa" size={42} frame={f.frame} fps={f.fps} delay={22} />
          <div style={{ fontSize: 20, fontWeight: 700, color: f.isDark ? "#fff" : "#1a1a2e", marginTop: 12, lineHeight: 1.4, wordBreak: "keep-all" }}>{b}</div>
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: steps (프로세스 — 가로 스텝 + 연결선) ──
function LayoutSteps({ title, points, tag, accent, f }) {
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "7%" }}>
      {tag && <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 4, marginBottom: 12, opacity: f.enter }}>{tag}</div>}
      <div style={{ fontSize: 44, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.15, marginBottom: 32,
        opacity: f.enter, wordBreak: "keep-all", textShadow: f.isDark ? "0 4px 20px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      {/* 가로 스텝 카드 + 연결선 */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
        {points.map((p, i) => {
          const delay = 12 + i * 10;
          const s = spring({ frame: f.frame, fps: f.fps, delay, config: { damping: 20 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ flex: 1, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)` }}>
                <div style={{ background: f.isDark ? "rgba(255,255,255,0.06)" : "#fff", borderRadius: 14, padding: "16px 14px",
                  border: f.isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18`, border: `1.5px solid ${accent}40`,
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                    fontSize: 15, fontWeight: 900, color: accent }}>{i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.4, wordBreak: "keep-all" }}>{p}</div>
                </div>
              </div>
              {i < points.length - 1 && (
                <div style={{ width: 24, height: 2, background: `${accent}40`, flexShrink: 0, opacity: spring({ frame: f.frame, fps: f.fps, delay: delay + 6, config: { damping: 200 } }) }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ── Layout: quote (인용문 — 큰 따옴표 + 중앙 텍스트) ──
function LayoutQuote({ title, sub, tag, accent, f }) {
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10% 8%" }}>
      <div style={{ fontSize: 80, color: accent, opacity: f.enter * 0.3, fontWeight: 900, lineHeight: 0.8, marginBottom: -10 }}>"</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: f.isDark ? "#fff" : "#1a1a2e", textAlign: "center", lineHeight: 1.4,
        opacity: f.enter, wordBreak: "keep-all", fontStyle: "italic", maxWidth: "85%",
        textShadow: f.isDark ? "0 2px 16px rgba(0,0,0,0.5)" : "none" }}>{title}</div>
      {sub && <div style={{ fontSize: 16, color: accent, marginTop: 20, fontWeight: 700, opacity: f.d1 }}> — {sub}</div>}
      {tag && <Tag text={tag} color={accent} frame={f.frame} fps={f.fps} delay={16} />}
    </AbsoluteFill>
  );
}

// ── Layout: highlight (하이라이트 — 큰 숫자 + 라벨) ──
function LayoutHighlight({ title, stats, tag, accent, f }) {
  const mainStat = stats[0] || { label: "", value: title, sub: "" };
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%" }}>
      {tag && <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 4, marginBottom: 20, opacity: f.enter }}>{tag}</div>}
      <div style={{ fontSize: 90, fontWeight: 900, color: accent, lineHeight: 1,
        opacity: f.enter, transform: `scale(${interpolate(f.enter, [0, 1], [0.5, 1])})`,
        textShadow: `0 0 60px ${accent}40` }}>{mainStat.value}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: f.isDark ? "#fff" : "#1a1a2e", marginTop: 16, textAlign: "center",
        opacity: f.d1, wordBreak: "keep-all" }}>{mainStat.label || title}</div>
      {mainStat.sub && <div style={{ fontSize: 16, color: f.isDark ? "rgba(255,255,255,0.5)" : "#888", marginTop: 8, opacity: f.d2 }}>{mainStat.sub}</div>}
      {/* 하단 보조 수치 */}
      {stats.length > 1 && (
        <div style={{ display: "flex", gap: 14, marginTop: 32, opacity: f.d3 }}>
          {stats.slice(1, 4).map((s, i) => (
            <StatCard key={i} label={s.label} value={s.value} sub={s.sub} color={["#00d4ff","#7c6aff","#4ade80"][i % 3]} frame={f.frame} fps={f.fps} delay={24 + i * 6} />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ── Layout: diagram (다이어그램 — 아이콘 + 연결선 + 라벨) ──
function LayoutDiagram({ title, points, tag, accent, f }) {
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "7%" }}>
      {tag && <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 4, marginBottom: 16, opacity: f.enter }}>{tag}</div>}
      <div style={{ fontSize: 42, fontWeight: 900, color: f.isDark ? "#fff" : "#1a1a2e", textAlign: "center", marginBottom: 32,
        opacity: f.enter, wordBreak: "keep-all", textShadow: f.isDark ? "0 4px 20px rgba(0,0,0,0.8)" : "none" }}>{title}</div>
      {/* 다이어그램: 중앙 노드 + 방사형 포인트 */}
      <div style={{ position: "relative", width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* 중앙 노드 */}
        <div style={{ width: 80, height: 80, borderRadius: 20, background: `${accent}20`, border: `2px solid ${accent}50`,
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
          transform: `scale(${f.enter})` }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent }}>★</div>
        </div>
        {/* 방사형 포인트 */}
        {points.map((p, i) => {
          const angle = (i / points.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 140;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const ds = spring({ frame: f.frame, fps: f.fps, delay: 10 + i * 8, config: { damping: 20 } });
          return (
            <div key={i} style={{ position: "absolute", left: `calc(50% + ${x}px - 60px)`, top: `calc(50% + ${y}px - 24px)`,
              width: 120, textAlign: "center", opacity: ds, transform: `scale(${ds})` }}>
              <div style={{ background: f.isDark ? "rgba(255,255,255,0.06)" : "#fff", borderRadius: 10, padding: "10px 8px",
                border: f.isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: f.isDark ? "#fff" : "#1a1a2e", lineHeight: 1.3, wordBreak: "keep-all" }}>{p}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 메인 SceneSlide — layout 기반 동적 렌더링
// ═══════════════════════════════════════════════
function SceneSlide({ scene, style, sceneIndex, totalScenes }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const styleId = style?.id || "cinematic";

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const bounce = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const d1 = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const d2 = spring({ frame, fps, delay: 16, config: { damping: 200 } });
  const d3 = spring({ frame, fps, delay: 24, config: { damping: 200 } });

  const exitStart = Math.max(0, durationInFrames - 10);
  const exitOp = interpolate(frame, [exitStart, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const kbScale = interpolate(frame, [0, durationInFrames], [1, 1.12], { extrapolateRight: "clamp" });
  const kbX = interpolate(frame, [0, durationInFrames], [sceneIndex % 2 === 0 ? -2 : 2, sceneIndex % 2 === 0 ? 2 : -2]);

  const title = scene.title || "";
  const sub = scene.text || "";
  const script = scene._scriptText || "";
  const num = String(sceneIndex + 1).padStart(2, "0");
  const accentColor = style?.titleColor || "#7c6aff";
  const isDark = styleId !== "minimal";

  const layout = scene._layout || "hero";
  const aiPoints = (scene._points && scene._points.length > 0) ? scene._points : script.split(/[.!?。]\s*/).filter(s => s.trim().length > 3).slice(0, 3);
  const aiStats = scene._stats || [];
  const aiTag = scene._tag || "";

  // 공유 props
  const f = { frame, fps, enter, bounce, d1, d2, d3, isDark };

  // 레이아웃별 렌더러 매핑
  const layoutProps = { title, sub, points: aiPoints, stats: aiStats, tag: aiTag, accent: accentColor, f };

  const LayoutRenderer = {
    hero: LayoutHero,
    list: LayoutList,
    stats: LayoutStats,
    compare: LayoutCompare,
    steps: LayoutSteps,
    quote: LayoutQuote,
    highlight: LayoutHighlight,
    diagram: LayoutDiagram,
  }[layout] || LayoutHero;

  return (
    <AbsoluteFill style={{ opacity: exitOp, overflow: "hidden" }}>
      {/* 배경 */}
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kbScale}) translateX(${kbX}%)` }} />
          <div style={{ position: "absolute", inset: 0, background: isDark
            ? "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.88) 100%)"
            : "rgba(255,255,255,0.8)" }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: isDark ? "#0d0d1a" : "#f0f0f8" }} />
      )}

      {/* 레이아웃 렌더링 */}
      <LayoutRenderer {...layoutProps} />

      {/* 프로그레스 바 */}
      <ProgressBar color={accentColor} frame={frame} durationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 자막 오버레이 — 고정 자막 (애니메이션 없음, 사용자 요청)
// ═══════════════════════════════════════════════
function CaptionOverlay({ captions, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const current = captions.find(c => currentMs >= c.startMs && currentMs < c.endMs);
  if (!current) return null;

  const styleId = style?.id || "cinematic";
  const isDark = styleId !== "minimal";

  const captionBg = {
    motion: "rgba(0,10,30,0.92)",
    animation: "rgba(30,10,50,0.92)",
    realfilm: "rgba(0,0,0,0.88)",
    cinematic: "rgba(0,0,0,0.75)",
    minimal: "rgba(255,255,255,0.95)",
    bold: "rgba(180,0,0,0.92)",
  }[styleId] || "rgba(0,0,0,0.85)";

  const textColor = styleId === "minimal" ? "#1a1a2e" : "#fff";

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 4% 4%", pointerEvents: "none" }}>
      <div style={{
        background: captionBg, borderRadius: 10,
        padding: "12px 28px", maxWidth: "94%",
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.08)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{
          fontSize: style?.captionSize || 28, fontWeight: 800,
          color: textColor, textAlign: "center",
          lineHeight: 1.5, wordBreak: "keep-all",
          textShadow: isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "none",
        }}>{current.text}</div>
      </div>
    </AbsoluteFill>
  );
}

// ════════════════════════════════════════
// 상수
// ════════════════════════════════════════
const SIZES = [
  { id: "9:16", label: "9:16", desc: "쇼츠/릴스", w: 1080, h: 1920 },
  { id: "16:9", label: "16:9", desc: "유튜브", w: 1920, h: 1080 },
  { id: "1:1", label: "1:1", desc: "인스타 피드", w: 1080, h: 1080 },
];

const VIDEO_STYLES = [
  { id: "motion", name: "모션그래픽", desc: "역동적인 텍스트 + 그래픽", icon: "🎨", bg: "#0a0a1a", titleColor: "#00d4ff", captionColor: "#fff", titleSize: 44, captionSize: 24, textColor: "#a5b4fc", imageKeyword: "abstract gradient" },
  { id: "animation", name: "애니메이션", desc: "만화/일러스트 느낌", icon: "✏️", bg: "#1a1030", titleColor: "#ff6b9d", captionColor: "#ffeead", titleSize: 40, captionSize: 22, textColor: "#ffeead", imageKeyword: "illustration colorful" },
  { id: "realfilm", name: "실사 홍보영상", desc: "기업/제품 홍보 스타일", icon: "🎬", bg: "#000", titleColor: "#fff", captionColor: "#e0e0e0", titleSize: 42, captionSize: 24, textColor: "#ccc", imageKeyword: "professional business" },
  { id: "cinematic", name: "시네마틱", desc: "영화 같은 무드", icon: "🎞️", bg: "#000", titleColor: "#ffd700", captionColor: "#fff", titleSize: 44, captionSize: 24, textColor: "rgba(255,255,255,0.8)", imageKeyword: "cinematic dark" },
  { id: "minimal", name: "미니멀", desc: "깔끔한 텍스트 중심", icon: "◻️", bg: "#f5f5f5", titleColor: "#1a1a2e", captionColor: "#333", titleSize: 40, captionSize: 22, textColor: "#555", imageKeyword: "minimal clean white" },
  { id: "bold", name: "임팩트", desc: "강렬한 임팩트", icon: "💥", bg: "#000", titleColor: "#ff3b3b", captionColor: "#fff", titleSize: 48, captionSize: 26, textColor: "#fff", imageKeyword: "bold dramatic" },
];

const FPS = 30;

// 텍스트를 최대 글자수 기준으로 자연스럽게 분할
function splitTextByChars(text, maxChars) {
  if (!text || maxChars <= 0) return [text];
  const result = [];
  // 띄어쓰기/구두점 기준으로 단어 분리
  const words = text.split(/(\s+)/).filter(Boolean);
  let line = "";
  for (const w of words) {
    if ((line + w).trim().length > maxChars && line.trim()) {
      result.push(line.trim());
      line = w.trimStart();
    } else {
      line += w;
    }
  }
  if (line.trim()) result.push(line.trim());
  return result.length ? result : [text];
}

export default function AiVideoGenerator({ isDark, user, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const acc = "#7c6aff";

  // step: input → analyzing → editing
  const [step, setStep] = useState("input");
  const [inputMode, setInputMode] = useState("script"); // script | audio
  const [prompt, setPrompt] = useState(""); // 대본 텍스트
  const [duration, setDuration] = useState(30);
  const [sizeId, setSizeId] = useState("9:16");
  const [styleId, setStyleId] = useState("motion");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsUrl, setTtsUrl] = useState(null); // TTS 생성된 음성 URL
  const [ttsVoice, setTtsVoice] = useState("Kore"); // Gemini TTS 음성
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [captionMaxChars, setCaptionMaxChars] = useState(12); // 자막 글자수 제한
  const [silenceThreshold, setSilenceThreshold] = useState(1.0); // 무음 구간 제거 기준 (초)
  const [removeSilence, setRemoveSilence] = useState(true); // 무음 제거 활성화
  const [scenes, setScenes] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [segments, setSegments] = useState([]); // 새 파이프라인: [{type,text,animation,gifUrl,startSec,endSec}]
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [editingScene, setEditingScene] = useState(0);
  const [transcript, setTranscript] = useState("");
  // 에디터 상태 (ShortsCreator 동일)
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSubIdx, setSelectedSubIdx] = useState(-1);
  const [volume, setVolume] = useState(100);
  // 패널
  const [propTab, setPropTab] = useState("scene");
  const [leftW, setLeftW] = useState(200);
  const [rightW, setRightW] = useState(280);
  const [bottomH, setBottomH] = useState(160);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const timelineRef = useRef(null);

  const audioInputRef = useRef(null);
  const playerRef = useRef(null);

  const currentStyle = VIDEO_STYLES.find(s => s.id === styleId) || VIDEO_STYLES[0];
  const currentSize = SIZES.find(s => s.id === sizeId) || SIZES[0];
  const durationInFrames = Math.max(1, Math.round(duration * FPS));
  // 프리뷰: 최대한 크게 (2배+)
  const previewScale = sizeId === "9:16" ? { w: "min(540px, 60vh * 9 / 16)", h: "min(960px, 92vh)" } : sizeId === "1:1" ? { w: "min(720px, 85vh)", h: "min(720px, 85vh)" } : { w: "min(960px, 95vw)", h: "min(540px, 55vh)" };

  // 타임라인 플레이헤드 동기화 — 재생 중 프레임 업데이트
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentFrame === "function") {
        const f = p.getCurrentFrame();
        setPlayhead(f / FPS);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 스페이스바 재생/정지
  useEffect(() => {
    if (step !== "editing") return;
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isPlaying) { playerRef.current?.pause(); setIsPlaying(false); }
        else { playerRef.current?.play(); setIsPlaying(true); }
      }
      if (e.code === "ArrowLeft") { e.preventDefault(); const t = Math.max(0, playhead - 2); setPlayhead(t); playerRef.current?.seekTo(Math.round(t * FPS)); }
      if (e.code === "ArrowRight") { e.preventDefault(); const t = Math.min(duration, playhead + 2); setPlayhead(t); playerRef.current?.seekTo(Math.round(t * FPS)); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, isPlaying, playhead, duration]);

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.06)" : "#f9f9fc", color: text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  // 오디오 파일 처리
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      const audio = new window.Audio(url);
      audio.onloadedmetadata = () => { if (audio.duration > 3) setDuration(Math.min(300, Math.ceil(audio.duration))); };
      return () => URL.revokeObjectURL(url);
    }
    setAudioUrl(null);
  }, [audioFile]);

  // ── 1단계: 음성 분석 + AI 씬 생성 ──
  const startGeneration = async () => {
    if (!prompt.trim() && !audioFile) { setError("영상 주제 또는 음성 파일을 입력해주세요"); return; }
    if (showPointConfirm && user && !(await showPointConfirm(50))) return;

    setLoading(true); setError("");

    let fullText = prompt;
    let captionData = [];

    // 음성 파일이 있으면 shorts-factory로 업로드+분석 시도
    if (audioFile) {
      setLoadingMsg("음성 파일 분석 중..."); setStep("analyzing");
      let audioAnalyzed = false;
      // 50MB 이하만 서버 업로드 시도 (WAV 등 대용량은 건너뜀)
      if (audioFile.size <= 50 * 1024 * 1024) {
        try {
          const uploadForm = new FormData();
          uploadForm.append("video", audioFile);
          const uploadRes = await fetch(`${SHORTS_API}/upload`, { method: "POST", body: uploadForm }).catch(() => null);
          if (uploadRes?.ok) {
            const uploadData = await uploadRes.json();
            setLoadingMsg("AI가 음성을 인식하고 있어요...");
            const analyzeRes = await fetch(`${SHORTS_API}/analyze/${uploadData.file_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ max_chars: 0 }),
            }).catch(() => null);
            if (analyzeRes?.ok) {
              const ad = await analyzeRes.json();
              const segs = ad.segments || [];
              const allSubs = [];
              let analyzedText = "";
              for (const seg of segs) {
                if (seg.subtitles) allSubs.push(...seg.subtitles);
                if (seg.script) analyzedText += seg.script + "\n";
                else if (seg.title) analyzedText += seg.title + "\n";
              }
              if (!analyzedText.trim()) analyzedText = ad.transcript || ad.text || segs.map(s => s.hook || s.title || s.script || "").join("\n");
              if (analyzedText.trim()) {
                fullText = analyzedText;
                audioAnalyzed = true;
              }
              // 자막 데이터 생성
              const rawCaptions = allSubs
                .filter(s => s.text?.trim() && (s.end - s.start) > 0.3)
                .map(s => ({ text: s.text.trim(), startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000) }));

              // 무음 구간 제거: gap이 threshold 이상이면 다음 자막을 앞당김
              if (removeSilence && rawCaptions.length > 1) {
                let totalRemoved = 0;
                captionData = rawCaptions.map((c, i) => {
                  const adjusted = { ...c, startMs: c.startMs - totalRemoved, endMs: c.endMs - totalRemoved };
                  if (i < rawCaptions.length - 1) {
                    const gap = (rawCaptions[i + 1].startMs - c.endMs) / 1000;
                    if (gap >= silenceThreshold) totalRemoved += (gap - 0.15) * 1000; // 0.15초 자연스러운 간격 유지
                  }
                  return adjusted;
                });
                if (totalRemoved > 0) {
                  // 영상 길이를 무음 제거 후로 조정
                  const lastCaption = captionData[captionData.length - 1];
                  const newDuration = Math.ceil(lastCaption.endMs / 1000) + 1;
                  setDuration(prev => Math.min(prev, newDuration));
                }
              } else {
                captionData = rawCaptions;
              }
            }
          }
        } catch (e) { console.warn("음성 분석 실패 (서버):", e); }
      }

      if (audioAnalyzed) {
        setTranscript(fullText);
        setCaptions(captionData);
        if (!prompt.trim()) setPrompt(fullText.slice(0, 300));
      } else {
        // 음성 분석 실패 → 프롬프트로 진행 (음성은 배경음으로만 사용)
        console.warn("음성 분석 실패 — 프롬프트 기반으로 진행합니다");
        if (!fullText.trim()) {
          setError("파일이 너무 크거나 음성 인식에 실패했습니다.\n영상 주제를 입력하면 프롬프트 기반으로 영상을 생성합니다.\n음성은 배경 오디오로 사용됩니다.");
          setStep("input"); setLoading(false); return;
        }
      }
    }

    // AI가 스타일 제안 + 씬 생성
    setLoadingMsg("AI가 영상 구성을 설계하고 있어요...");
    setStep("analyzing");
    try {
      const sceneCount = Math.max(3, Math.ceil(duration / 10));
      const ratio = sizeId === "16:9" ? "가로(16:9)" : sizeId === "1:1" ? "정사각(1:1)" : "세로(9:16)";
      const styleDesc = currentStyle.name + " (" + currentStyle.desc + ")";

      // ── 핵심: 대본을 직접 씬으로 분할 (AI + 코드 하이브리드) ──
      // 1) 대본을 문장 단위로 분리
      const sentences = fullText
        .replace(/([.!?。])\s*/g, "$1\n")
        .split(/\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 2);

      const actualSceneCount = Math.max(3, Math.min(sentences.length, Math.ceil(duration / 8)));
      const secPerScene = duration / actualSceneCount;

      // 2) 문장을 씬 수에 맞게 그룹핑
      const sentencesPerScene = Math.ceil(sentences.length / actualSceneCount);
      const sceneTexts = [];
      for (let i = 0; i < actualSceneCount; i++) {
        const chunk = sentences.slice(i * sentencesPerScene, (i + 1) * sentencesPerScene);
        sceneTexts.push(chunk.join(" "));
      }

      // ══ 새 파이프라인: AI 의미 단위 그룹핑 + 표현 방식 결정 ══
      setLoadingMsg("AI가 대본을 분석하고 있어요...");
      let segmentData = [];
      try {
        const aiRes = await fetch("/api/ai-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat", model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: `당신은 영상 편집자입니다. 대본을 의미 단위로 그룹핑하고, 각 구간의 시각 표현 방식을 결정합니다.

입력: 전체 대본 텍스트
출력: JSON 배열

각 세그먼트:
{
  "text": "화면에 표시할 핵심 텍스트 (원문 그대로가 아닌 핵심만 추출, 짧게)",
  "type": "text" 또는 "gif",
  "animation": "텍스트 애니메이션 타입 (type=text일 때만)",
  "gifKeyword": "영어 GIF 검색 키워드 (type=gif일 때만)",
  "durationSec": 3~5 사이의 초 (짧고 빠른 전환이 좋음)
}

텍스트 애니메이션 타입 (반드시 다양하게 섞어 사용):
- "fade": 심플 페이드인 (일반 설명)
- "typewriter": 한 글자씩 타이핑 (중요 메시지, 인트로)
- "highlight": 단어별 순차 하이라이트 (강조 포인트)
- "scale": 큰 임팩트 줌인 (핵심 숫자, 결론)
- "slide": 아래에서 슬라이드업 (전환, 새 주제)
- "counter": 숫자 카운트업 (수치, 통계)

규칙:
1. 의미 단위는 3~5초가 이상적. 6초 이상은 지루함
2. 연속으로 같은 animation/type 금지
3. GIF 구간은 전체의 20~40% 정도 (시각적 변화를 위해)
4. GIF 키워드는 반드시 영어 (고퀄 검색용)
5. text는 대본 원문을 그대로 쓰지 말고, 화면에 표시할 핵심 문구로 압축
6. 전체 합산 시간이 ${duration}초에 가깝게

JSON 배열만 출력하세요.`
            }, {
              role: "user",
              content: fullText.slice(0, 2000)
            }],
          }),
        });
        const aiData = await aiRes.json();
        const aiContent = aiData.choices?.[0]?.message?.content || aiData.content || "";
        segmentData = JSON.parse(aiContent.match(/\[[\s\S]*\]/)?.[0] || "[]");
      } catch {}

      // fallback: AI 실패 시 문장 단위로 분할
      if (segmentData.length === 0) {
        const anims = ["fade", "typewriter", "highlight", "scale", "slide", "counter"];
        segmentData = sceneTexts.map((t, i) => ({
          text: t.slice(0, 40), type: "text", animation: anims[i % anims.length], durationSec: secPerScene,
        }));
      }

      // 타이밍 계산
      let currentSec = 0;
      const timedSegments = segmentData.map(s => {
        const dur = Math.max(2, Math.min(6, s.durationSec || 4));
        const seg = { ...s, startSec: currentSec, endSec: currentSec + dur };
        currentSec += dur;
        return seg;
      });

      // GIF 구간: Klipy API로 GIF URL 확보
      setLoadingMsg("GIF를 검색하고 있어요...");
      const segmentsWithGifs = await Promise.all(timedSegments.map(async (seg) => {
        if (seg.type === "gif" && seg.gifKeyword) {
          try {
            const r = await fetch(`/api/proxy?action=klipy&path=gifs/search&q=${encodeURIComponent(seg.gifKeyword)}&limit=1`);
            const d = await r.json();
            const gif = d.data?.[0] || d.results?.[0] || d[0];
            const gifUrl = gif?.images?.original?.url || gif?.url || gif?.media_url || "";
            return { ...seg, gifUrl };
          } catch {}
        }
        return seg;
      }));

      // 전체 영상 길이 조정
      const totalDur = Math.ceil(segmentsWithGifs[segmentsWithGifs.length - 1]?.endSec || duration);
      setDuration(totalDur);
      setSegments(segmentsWithGifs);

      // 레거시 호환: scenes/captions도 생성 (에디터 좌측 패널용)
      const scenesWithImages = segmentsWithGifs.map((seg, i) => ({
        title: seg.text, text: "", imageUrl: seg.gifUrl || null,
        _startSec: seg.startSec, _endSec: seg.endSec,
        _startFrame: Math.round(seg.startSec * FPS),
        _durFrames: Math.round((seg.endSec - seg.startSec) * FPS),
        _scriptText: seg.text,
      }));

      // 5) 자막 생성: 글자수 제한에 맞춰 분할
      if (captionData.length === 0) {
        captionData = [];
        for (const sc of scenesWithImages) {
          const fullText = sc._scriptText || sc.title || "";
          const chunks = splitTextByChars(fullText, captionMaxChars);
          const sceneDurMs = (sc._endSec - sc._startSec) * 1000;
          const chunkDurMs = sceneDurMs / chunks.length;
          const startMs = sc._startSec * 1000;
          for (let ci = 0; ci < chunks.length; ci++) {
            captionData.push({
              text: chunks[ci],
              startMs: Math.round(startMs + ci * chunkDurMs),
              endMs: Math.round(startMs + (ci + 1) * chunkDurMs),
            });
          }
        }
      }
      setCaptions(captionData);

      setScenes(scenesWithImages);
      setEditingScene(0);

      // TTS 음성 생성 (Gemini TTS — 씬별 분할 생성 후 합치기)
      if (ttsEnabled && !audioFile) {
        setLoadingMsg("AI 음성을 생성하고 있어요...");
        try {
          // 씬별로 짧은 텍스트를 개별 TTS → Vercel 10초 타임아웃 회피
          const ttsBlobs = [];
          for (let si = 0; si < scenesWithImages.length; si++) {
            const txt = (scenesWithImages[si]._scriptText || scenesWithImages[si].title || "").trim();
            if (!txt) continue;
            setLoadingMsg(`AI 음성 생성 중... (${si + 1}/${scenesWithImages.length})`);
            try {
              const ttsRes = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: txt.slice(0, 1000), voice: ttsVoice }),
              });
              if (ttsRes.ok) {
                const blob = await ttsRes.blob();
                ttsBlobs.push(blob);
              }
            } catch {}
          }
          // WAV 파일 합치기 (헤더 44바이트 스킵 후 PCM 데이터만 연결)
          if (ttsBlobs.length > 0) {
            const pcmChunks = [];
            let sampleRate = 24000;
            for (let bi = 0; bi < ttsBlobs.length; bi++) {
              const buf = await ttsBlobs[bi].arrayBuffer();
              const view = new DataView(buf);
              if (buf.byteLength > 44) {
                sampleRate = view.getUint32(24, true);
                pcmChunks.push(new Uint8Array(buf, 44)); // PCM 데이터만
                // 씬 사이 짧은 무음 (0.2초) 추가 → 자연스러운 연결
                if (bi < ttsBlobs.length - 1) {
                  const silenceBytes = Math.round(sampleRate * 0.2 * 2); // 16bit mono
                  pcmChunks.push(new Uint8Array(silenceBytes));
                }
              }
            }
            // 새 WAV 헤더 생성
            const totalPcm = pcmChunks.reduce((sum, c) => sum + c.byteLength, 0);
            const wavHeader = new ArrayBuffer(44);
            const hv = new DataView(wavHeader);
            const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) hv.setUint8(offset + i, str.charCodeAt(i)); };
            writeStr(0, "RIFF"); hv.setUint32(4, 36 + totalPcm, true); writeStr(8, "WAVE");
            writeStr(12, "fmt "); hv.setUint32(16, 16, true); hv.setUint16(20, 1, true); hv.setUint16(22, 1, true);
            hv.setUint32(24, sampleRate, true); hv.setUint32(28, sampleRate * 2, true);
            hv.setUint16(32, 2, true); hv.setUint16(34, 16, true);
            writeStr(36, "data"); hv.setUint32(40, totalPcm, true);
            const combined = new Blob([wavHeader, ...pcmChunks], { type: "audio/wav" });
            const url = URL.createObjectURL(combined);
            setTtsUrl(url);
            // 오디오 길이 측정 → 씬 타이밍 재조정
            const audio = new window.Audio(url);
            await new Promise(resolve => {
              audio.onloadedmetadata = () => {
                const ttsDuration = audio.duration;
                if (ttsDuration > 3) {
                  setDuration(Math.ceil(ttsDuration));
                  const secPerScene = ttsDuration / scenesWithImages.length;
                  setScenes(prev => prev.map((sc, i) => ({
                    ...sc, _startSec: i * secPerScene, _endSec: (i + 1) * secPerScene,
                    _startFrame: Math.round(i * secPerScene * FPS), _durFrames: Math.round(secPerScene * FPS),
                  })));
                  setCaptions(prev => prev.map((c, i) => ({
                    ...c, startMs: Math.round(i * secPerScene * 1000), endMs: Math.round((i + 1) * secPerScene * 1000),
                  })));
                }
                resolve();
              };
              audio.onerror = resolve;
            });
          }
        } catch (e) {
          console.warn("TTS 생성 오류:", e);
        }
      }

      setStep("editing");
    } catch (e) {
      setError("씬 생성 실패: " + e.message);
      setStep("input");
    }
    setLoading(false);
  };

  const replaceSceneImage = async (idx, query) => {
    const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
    try {
      const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(query)}&per_page=5&orientation=${orient}`);
      const d = await r.json();
      const urls = (d.results || []).map(r => r.urls?.regular).filter(Boolean);
      if (urls.length) setScenes(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: urls[Math.floor(Math.random() * urls.length)] } : s));
    } catch {}
  };

  const basePxPerSec = 16;

  // ════════ Step: 입력 (대본/음성 탭) ════════
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text }}>AI 영상 생성</div>
        <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>대본이나 음성을 넣으면 AI가 자동으로 영상을 구성합니다</div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 입력 모드 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 20, border: `1px solid ${bdr}` }}>
          {[["script","대본 입력"],["audio","음성 파일"]].map(([k,l]) => (
            <button key={k} onClick={() => setInputMode(k)} style={{ flex: 1, padding: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, background: inputMode === k ? `linear-gradient(135deg,${acc},#8b5cf6)` : "transparent", color: inputMode === k ? "#fff" : muted }}>{l}</button>
          ))}
        </div>

        {inputMode === "script" ? (<>
          {/* 대본 입력 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>대본 / 스크립트 *</div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={8}
              placeholder={"대본을 붙여넣거나 직접 작성하세요.\n\nAI가 대본을 분석해서 씬별로 분할하고\n각 씬에 어울리는 이미지를 자동 매칭합니다.\n\n예시:\n안녕하세요, 오늘은 AI로 영상 만드는 방법입니다.\n첫 번째, 대본을 준비합니다.\n두 번째, 스타일을 선택합니다..."}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", minHeight: 160 }} />
          </div>
          {/* TTS */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: ttsEnabled ? 12 : 0 }}>
              <input type="checkbox" checked={ttsEnabled} onChange={e => setTtsEnabled(e.target.checked)} style={{ accentColor: acc, width: 18, height: 18 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: text }}>AI 음성 (TTS) 나레이션</div>
                <div style={{ fontSize: 11, color: muted }}>Google AI 고품질 음성으로 대본을 읽어줍니다</div>
              </div>
            </label>
            {ttsEnabled && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>음성 선택</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
                    {[["Kore","Kore","여성/밝음"],["Aoede","Aoede","여성/부드러움"],["Puck","Puck","남성/자연"],["Charon","Charon","남성/깊음"],["Fenrir","Fenrir","남성/중후"],["Leda","Leda","여성/차분"]].map(([id,name,desc]) => (
                      <button key={id} onClick={() => setTtsVoice(id)}
                        style={{ padding: "6px 4px", borderRadius: 8, border: `1.5px solid ${ttsVoice === id ? acc : bdr}`, background: ttsVoice === id ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: ttsVoice === id ? acc : text }}>{name}</div>
                        <div style={{ fontSize: 8, color: muted }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>읽기 속도</div>
                  <input type="range" min={0.5} max={2.0} step={0.1} value={ttsSpeed} onChange={e => setTtsSpeed(+e.target.value)}
                    style={{ width: "100%", accentColor: acc }} />
                  <div style={{ fontSize: 11, color: muted, textAlign: "center" }}>{ttsSpeed.toFixed(1)}x</div>
                </div>
              </div>
            )}
          </div>
          {/* 자막 글자수 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 8 }}>자막 글자수</div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>자막 한 줄에 표시할 최대 글자수를 선택하세요</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
              {[{ v: 8, label: "8자", desc: "짧게" }, { v: 12, label: "12자", desc: "기본" }, { v: 15, label: "15자", desc: "보통" }, { v: 20, label: "20자", desc: "길게" }].map(o => (
                <button key={o.v} onClick={() => setCaptionMaxChars(o.v)}
                  style={{ padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${captionMaxChars === o.v ? acc : bdr}`, background: captionMaxChars === o.v ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: captionMaxChars === o.v ? acc : text }}>{o.label}</div>
                  <div style={{ fontSize: 9, color: muted }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </>) : (<>
          {/* 음성 파일 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>음성/나레이션 파일 *</div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>AI가 음성을 분석하여 씬과 자막을 자동 생성합니다. 무음 구간은 자동 제외됩니다.</div>
            {audioFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: `${acc}08`, border: `1px solid ${acc}25` }}>
                <span style={{ fontSize: 18 }}>🎵</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: acc }}>{audioFile.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>{(audioFile.size / 1024 / 1024).toFixed(1)}MB · {duration}초</div>
                </div>
                <button onClick={() => { setAudioFile(null); setAudioUrl(null); setDuration(30); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ) : (
              <div onClick={() => audioInputRef.current?.click()} style={{ padding: "36px 20px", borderRadius: 12, border: `2px dashed ${bdr}`, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎤</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>음성 파일 선택</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>MP3, WAV, M4A (최대 50MB)</div>
              </div>
            )}
            <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setAudioFile(e.target.files[0]); e.target.value = ""; }} />
          </div>
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>추가 지시사항 <span style={{ fontSize: 10, color: muted, fontWeight: 400 }}>(선택)</span></div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} placeholder="예: 밝은 분위기로, 자연 이미지 위주로"
              style={{ ...inputStyle, resize: "none", lineHeight: 1.5, fontFamily: "inherit" }} />
          </div>
          {/* 무음 구간 처리 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: removeSilence ? 10 : 0 }}>
              <input type="checkbox" checked={removeSilence} onChange={e => setRemoveSilence(e.target.checked)} style={{ accentColor: acc, width: 18, height: 18 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: text }}>무음 구간 자동 제거</div>
                <div style={{ fontSize: 11, color: muted }}>설정한 시간 이상의 무음 구간을 자동으로 제거합니다</div>
              </div>
            </label>
            {removeSilence && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>무음 기준 (이 이상이면 제거)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                  {[{ v: 0.5, label: "0.5초" }, { v: 1.0, label: "1초" }, { v: 1.5, label: "1.5초" }, { v: 2.0, label: "2초" }].map(o => (
                    <button key={o.v} onClick={() => setSilenceThreshold(o.v)}
                      style={{ padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${silenceThreshold === o.v ? acc : bdr}`, background: silenceThreshold === o.v ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: silenceThreshold === o.v ? acc : text }}>{o.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>)}

        {/* 영상 사이즈 + 길이 + 스타일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 사이즈</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {SIZES.map(s => (
              <button key={s.id} onClick={() => setSizeId(s.id)}
                style={{ padding: "14px 8px", borderRadius: 12, border: `2px solid ${sizeId === s.id ? acc : bdr}`, background: sizeId === s.id ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                <div style={{ width: s.id === "9:16" ? 28 : s.id === "1:1" ? 36 : 48, height: s.id === "9:16" ? 48 : s.id === "1:1" ? 36 : 28, borderRadius: 4, border: `2px solid ${sizeId === s.id ? acc : muted}`, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: sizeId === s.id ? acc : text }}>{s.label}</div>
                <div style={{ fontSize: 10, color: muted }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>영상 사이즈</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setSizeId(s.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${sizeId === s.id ? acc : bdr}`, background: sizeId === s.id ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sizeId === s.id ? acc : text }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: muted }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {!audioFile && (
            <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>영상 길이</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[15, 30, 60, 90].map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${duration === d ? acc : bdr}`, background: duration === d ? `${acc}12` : "transparent", color: duration === d ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{d}s</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 영상 스타일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 10 }}>영상 디자인 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)} style={{ padding: "10px 6px", borderRadius: 10, border: `2px solid ${styleId === s.id ? acc : bdr}`, background: styleId === s.id ? `${acc}10` : "transparent", cursor: "pointer", textAlign: "center" }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: styleId === s.id ? acc : text, marginTop: 4 }}>{s.name}</div>
                <div style={{ fontSize: 9, color: muted }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12 }}>{error}</div>}

        <button onClick={startGeneration} disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {inputMode === "audio" && audioFile ? "음성 분석 + 영상 생성" : ttsEnabled ? "AI 영상 + TTS 생성" : "AI 영상 생성하기"} <span style={{ opacity: 0.7, fontSize: 12 }}>(50P)</span>
        </button>
      </div>
    </div>
  );

  // ════════ Step: 분석 중 ════════
  if (step === "analyzing") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes iconBounce2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 20px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "spin 1.5s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: "iconBounce2 2s ease-in-out infinite" }}><rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8"/><polygon points="10,8 17,12 10,16" fill={acc}/></svg>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 8 }}>{loadingMsg || "AI가 영상을 구성하고 있어요"}</div>
        <div style={{ fontSize: 13, color: muted }}>대본을 분석하고 씬을 배치하는 중...</div>
        {transcript && <div style={{ fontSize: 11, color: muted, marginTop: 14, padding: "10px 14px", borderRadius: 8, background: `${acc}06`, maxHeight: 80, overflow: "auto", textAlign: "left", lineHeight: 1.5 }}>{transcript.slice(0, 200)}...</div>}
      </div>
    </div>
  );

  // suggest 단계 제거 (입력 단계에서 스타일 선택)
  if (step === "suggest") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>AI가 추천하는 영상 스타일</div>
          <div style={{ fontSize: 13, color: muted }}>내용을 분석하여 어울리는 스타일을 제안합니다. 선택 후 편집할 수 있어요.</div>
        </div>

        {/* AI 추천 */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: acc, marginBottom: 10 }}>AI 추천</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {suggestions.map((sg, i) => {
                const matched = VIDEO_STYLES.find(vs => vs.id === sg.id || vs.name === sg.name);
                const sId = matched?.id || VIDEO_STYLES[i % VIDEO_STYLES.length].id;
                const sty = matched || VIDEO_STYLES[i % VIDEO_STYLES.length];
                return (
                  <div key={i} onClick={() => setStyleId(sId)}
                    style={{ padding: 16, borderRadius: 14, border: `2px solid ${styleId === sId ? acc : bdr}`, background: styleId === sId ? `${acc}10` : card, cursor: "pointer", transition: "all .15s" }}>
                    <div style={{ width: "100%", height: 40, borderRadius: 8, background: sty.bg, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: sty.titleColor }}>Aa</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{sg.name || sty.name}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sg.reason}</div>
                    {styleId === sId && <div style={{ fontSize: 10, color: acc, fontWeight: 700, marginTop: 6 }}>선택됨</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 전체 스타일 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10 }}>전체 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)}
                style={{ padding: "8px", borderRadius: 10, border: `2px solid ${styleId === s.id ? acc : bdr}`, cursor: "pointer", textAlign: "center", background: "transparent" }}>
                <div style={{ width: "100%", height: 28, borderRadius: 6, background: s.bg, marginBottom: 4, border: "1px solid rgba(128,128,128,0.2)" }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: styleId === s.id ? acc : muted }}>{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setStep("editing")}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" }}>
          이 스타일로 편집하기 →
        </button>
      </div>
    </div>
  );

  // ════════ Step: 편집 (ShortsCreator 동일 구성) ════════
  const tlPxPerSec = basePxPerSec * timelineZoom;
  const tlWidth = Math.max(duration * tlPxPerSec, 600);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
      {/* 상단 3패널 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* 좌측: 씬 리스트 */}
        <div style={{ width: leftW, flexShrink: 0, background: "#16162a", borderRight: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>씬 ({scenes.length})</span>
            <button onClick={() => { const last = scenes[scenes.length - 1]; setScenes(prev => [...prev, { title: "새 씬", text: "", imagePrompt: "", bgColor: currentStyle.bg, _startSec: last?._endSec || duration, _endSec: (last?._endSec || duration) + 5, _startFrame: Math.round((last?._endSec || duration) * FPS), _durFrames: 5 * FPS }]); }}
              style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #2a2a4a", background: "transparent", color: acc, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
            {scenes.map((sc, i) => (
              <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(sc._startFrame || 0); }}
                style={{ padding: "8px", borderRadius: 8, marginBottom: 2, cursor: "pointer", borderLeft: `3px solid ${editingScene === i ? acc : "transparent"}`, background: editingScene === i ? "rgba(124,106,255,0.15)" : "transparent" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: editingScene === i ? acc : "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `씬 ${i+1}`}</div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{fmt(sc._startSec || 0)} ~ {fmt(sc._endSec || 0)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 6, borderTop: "1px solid #2a2a4a", display: "flex", gap: 4 }}>
            <button onClick={() => setStep("suggest")} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer" }}>← 스타일</button>
            <button onClick={() => { setStep("input"); setScenes([]); setCaptions([]); setSegments([]); if (ttsUrl) { URL.revokeObjectURL(ttsUrl); setTtsUrl(null); } }} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer" }}>처음</button>
          </div>
        </div>

        {/* 중앙: 프리뷰 + 재생 컨트롤 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "2px solid #2a2a4a", position: "relative" }}>
            <Player
              acknowledgeRemotionLicense
              ref={playerRef}
              component={SceneComposition}
              inputProps={{ segments: segments.length > 0 ? segments : scenes.map(s => ({ type: "text", text: s.title, animation: "fade", startSec: s._startSec, endSec: s._endSec })), audioUrl: ttsUrl || audioUrl, style: currentStyle }}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={currentSize.w}
              compositionHeight={currentSize.h}
              style={{ width: previewScale.w, height: previewScale.h }}
              controls={false}
              autoPlay={false}
              clickToPlay
            />
            {/* 시간 표시 */}
            <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>{fmt(playhead)} / {fmt(duration)}</div>
          </div>
          {/* 재생 컨트롤 (ShortsCreator 동일) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button onClick={() => { setPlayhead(0); playerRef.current?.seekTo(0); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏮</button>
            <button onClick={() => {
              if (isPlaying) {
                playerRef.current?.pause();
                setIsPlaying(false);
              } else {
                playerRef.current?.play();
                setIsPlaying(true);
                // TTS 오디오는 Remotion Player <Audio> 컴포넌트가 자동 재생
              }
            }} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 12px ${acc}40` }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => { setPlayhead(duration); playerRef.current?.seekTo(durationInFrames); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏭</button>
            {/* 다운로드 */}
            {ttsUrl && (
              <a href={ttsUrl} download="ai-voice.wav" style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} title="음성 다운로드">🔊</a>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10, color: "#555" }}>Space: 재생 | ←→: 이동</div>
          </div>
        </div>

        {/* 우측: 속성 패널 */}
        <div style={{ width: rightW, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
            {[["scene","씬"],["style","스타일"],["caption","자막"]].map(([k,l]) => (
              <button key={k} onClick={() => setPropTab(k)}
                style={{ flex: 1, padding: "9px 0", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: propTab === k ? "#1e1e3a" : "transparent", color: propTab === k ? acc : "#666", borderBottom: propTab === k ? `2px solid ${acc}` : "2px solid transparent" }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {propTab === "scene" && editingScene >= 0 && scenes[editingScene] ? (() => {
              const sc = scenes[editingScene];
              const upd = (k, v) => setScenes(prev => prev.map((s, i) => i === editingScene ? { ...s, [k]: v } : s));
              return <>
                <div style={{ fontSize: 12, fontWeight: 700, color: acc, marginBottom: 10 }}>씬 {editingScene + 1}</div>
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>제목</div><input value={sc.title || ""} onChange={e => upd("title", e.target.value)} style={inputStyle} /></div>
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>텍스트</div><textarea value={sc.text || ""} onChange={e => upd("text", e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>이미지</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={sc.imagePrompt || ""} onChange={e => upd("imagePrompt", e.target.value)} placeholder="영어 키워드" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => replaceSceneImage(editingScene, sc.imagePrompt)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: `${acc}10`, color: acc, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>교체</button>
                  </div>
                </div>
                {sc.imageUrl && <img src={sc.imageUrl} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />}
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>배경색</div><input type="color" value={sc.bgColor || "#1a1a2e"} onChange={e => upd("bgColor", e.target.value)} style={{ width: "100%", height: 24, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} /></div>
                {scenes.length > 1 && <button onClick={() => { setScenes(prev => prev.filter((_, j) => j !== editingScene)); setEditingScene(Math.max(0, editingScene - 1)); }}
                  style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)", color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>씬 삭제</button>}
              </>;
            })() : propTab === "style" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>영상 스타일</div>
                {VIDEO_STYLES.map(s => (
                  <div key={s.id} onClick={() => setStyleId(s.id)}
                    style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", border: `1.5px solid ${styleId === s.id ? acc : "transparent"}`, background: styleId === s.id ? `${acc}10` : "transparent", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: s.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(128,128,128,0.3)" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: s.titleColor }}>Aa</span>
                    </div>
                    <div><div style={{ fontSize: 12, fontWeight: 700, color: styleId === s.id ? acc : "#ccc" }}>{s.name}</div><div style={{ fontSize: 9, color: "#666" }}>{s.desc}</div></div>
                  </div>
                ))}
                {/* TTS 재생성 */}
                <div style={{ marginTop: 16, padding: "10px 8px", borderRadius: 8, background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.15)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 8 }}>AI 음성 (TTS)</div>
                  {ttsUrl ? (
                    <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 6 }}>AI 음성 적용됨</div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 6 }}>음성 없음</div>
                  )}
                  <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}
                    style={{ width: "100%", padding: "5px 6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", fontSize: 10, marginBottom: 6, outline: "none" }}>
                    <option value="Kore">Kore (여성/밝음)</option>
                    <option value="Aoede">Aoede (여성/부드러움)</option>
                    <option value="Puck">Puck (남성/자연)</option>
                    <option value="Charon">Charon (남성/깊음)</option>
                    <option value="Fenrir">Fenrir (남성/중후)</option>
                    <option value="Leda">Leda (여성/차분)</option>
                  </select>
                  <button disabled={ttsLoading} onClick={async () => {
                    setTtsLoading(true);
                    try {
                      const fullScript = scenes.map(sc => sc._scriptText || sc.title || "").filter(Boolean).join("\n").slice(0, 4096);
                      if (!fullScript.trim()) return;
                      const res = await fetch("/api/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: fullScript, voice: ttsVoice, speed: ttsSpeed }),
                      });
                      if (res.ok) {
                        if (ttsUrl) URL.revokeObjectURL(ttsUrl);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        setTtsUrl(url);
                        const audio = new window.Audio(url);
                        audio.onloadedmetadata = () => {
                          if (audio.duration > 3) {
                            setDuration(Math.ceil(audio.duration));
                            const secPerScene = audio.duration / scenes.length;
                            setScenes(prev => prev.map((sc, i) => ({
                              ...sc, _startSec: i * secPerScene, _endSec: (i + 1) * secPerScene,
                              _startFrame: Math.round(i * secPerScene * FPS), _durFrames: Math.round(secPerScene * FPS),
                            })));
                            setCaptions(prev => prev.map((c, i) => ({
                              ...c, startMs: Math.round(i * secPerScene * 1000), endMs: Math.round((i + 1) * secPerScene * 1000),
                            })));
                          }
                        };
                      }
                    } catch (e) { console.warn("TTS 재생성 실패:", e); }
                    setTtsLoading(false);
                  }} style={{ width: "100%", padding: 6, borderRadius: 6, border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: ttsLoading ? 0.5 : 1 }}>
                    {ttsLoading ? "생성 중..." : ttsUrl ? "음성 재생성" : "AI 음성 생성"}
                  </button>
                  {ttsUrl && (
                    <button onClick={() => { URL.revokeObjectURL(ttsUrl); setTtsUrl(null); }}
                      style={{ width: "100%", padding: 5, borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontSize: 9, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>음성 제거</button>
                  )}
                </div>
              </div>
            ) : propTab === "caption" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>자막 ({captions.length})</div>
                {captions.length === 0 ? <div style={{ fontSize: 11, color: "#555", textAlign: "center", padding: 20 }}>음성 파일을 업로드하면<br/>자막이 자동 생성됩니다</div> : (
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {captions.map((c, i) => (
                      <div key={i} style={{ padding: "6px 8px", borderRadius: 6, marginBottom: 3, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a30" }}>
                        <div style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>{fmt(c.startMs / 1000)} ~ {fmt(c.endMs / 1000)}</div>
                        <input value={c.text} onChange={e => { const nc = [...captions]; nc[i] = { ...nc[i], text: e.target.value }; setCaptions(nc); }}
                          style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 하단: 툴바 + 타임라인 (ShortsCreator 동일) */}
      <div style={{ flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", position: "relative" }}>
        {/* 높이 조절 핸들 */}
        <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
          onMouseDown={e => { e.preventDefault(); const sy = e.clientY; const oh = bottomH;
            const mv = ev => setBottomH(Math.max(80, Math.min(300, oh - (ev.clientY - sy))));
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
          }}><div style={{ width: 40, height: 3, borderRadius: 2, background: "#3a3a5a" }} /></div>

        {/* 툴바 (ShortsCreator 동일) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", borderBottom: "1px solid #1a1a30", background: "#12122a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => { const last = scenes[scenes.length-1]; setScenes(prev => [...prev, { title:"새 씬", text:"", imagePrompt:"", bgColor: currentStyle.bg, _startSec: last?._endSec||duration, _endSec:(last?._endSec||duration)+5, _startFrame: Math.round((last?._endSec||duration)*FPS), _durFrames: 5*FPS }]); }}
              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: acc, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ 씬</button>
            {scenes.length > 1 && editingScene >= 0 && (
              <button onClick={() => { setScenes(prev => prev.filter((_,j)=>j!==editingScene)); setEditingScene(Math.max(0,editingScene-1)); }}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>씬 삭제</button>
            )}
            <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 4px" }} />
            <span style={{ fontSize: 10, color: "#888" }}>🔊</span>
            <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: 50, accentColor: "#4ade80" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => { setPlayhead(0); playerRef.current?.seekTo(0); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: acc, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>⏮ 처음</button>
            <span style={{ fontSize: 11, color: acc, fontFamily: "monospace", fontWeight: 600 }}>{fmt(playhead)} | {fmt(duration)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <input type="range" min="50" max="400" value={timelineZoom * 100} onChange={e => setTimelineZoom(Number(e.target.value)/100)} style={{ width: 60, accentColor: acc }} />
              <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: bottomH, overflow: "hidden" }}>
          {/* 트랙 라벨 */}
          <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
            <div style={{ height: 20 }} />
            <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4a9eff" }}>V</div>
            {captions.length > 0 && <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#f59e0b" }}>S</div>}
            {(ttsUrl || audioUrl) && <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4ade80" }}>A</div>}
          </div>
          {/* 트랙 영역 — 클릭으로 playhead 이동 */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "default" }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const sec = Math.max(0, Math.min(duration, x / tlPxPerSec));
              setPlayhead(sec);
              playerRef.current?.seekTo(Math.round(sec * FPS));
              // 클릭한 위치의 씬 선택
              for (let i = 0; i < scenes.length; i++) {
                if (sec >= (scenes[i]._startSec || 0) && sec < (scenes[i]._endSec || 0)) { setEditingScene(i); break; }
              }
            }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>
              {/* 룰러 */}
              <div style={{ height: 18, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i).filter(i => i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * tlPxPerSec }}><div style={{ width: 1, height: 6, background: "#444" }} /><span style={{ fontSize: 7, color: "#444", position: "absolute", left: 2, top: 6, fontFamily: "monospace" }}>{fmt(sec)}</span></div>
                ))}
              </div>
              {/* 비디오 씬 블록 */}
              <div style={{ height: 28, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {scenes.map((sc, i) => {
                  const left = (sc._startSec || 0) * tlPxPerSec;
                  const width = Math.max(((sc._endSec || 0) - (sc._startSec || 0)) * tlPxPerSec - 1, 16);
                  const colors = ["#7c6aff", "#ec4899", "#4ade80", "#f59e0b", "#4a9eff", "#ef4444"];
                  const c = colors[i % colors.length];
                  return (
                    <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(sc._startFrame || 0); }}
                      style={{ position: "absolute", left, top: 3, width, height: 22, background: editingScene === i ? `${c}50` : `${c}25`, border: `1.5px solid ${editingScene === i ? c : `${c}50`}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden" }}>
                      <span style={{ fontSize: 8, color: "#ddd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `#${i+1}`}</span>
                    </div>
                  );
                })}
              </div>
              {/* 자막 트랙 */}
              {captions.length > 0 && (
                <div style={{ height: 24, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  {captions.map((c, i) => {
                    const left = (c.startMs / 1000) * tlPxPerSec;
                    const width = Math.max(((c.endMs - c.startMs) / 1000) * tlPxPerSec, 8);
                    return <div key={i} style={{ position: "absolute", left, top: 3, width, height: 18, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 3, overflow: "hidden", display: "flex", alignItems: "center", padding: "0 2px" }}>
                      <span style={{ fontSize: 7, color: "#f59e0b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</span>
                    </div>;
                  })}
                </div>
              )}
              {/* 오디오 트랙 */}
              {(ttsUrl || audioUrl) && (
                <div style={{ height: 20, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  <div style={{ position: "absolute", left: 0, top: 4, width: duration * tlPxPerSec, height: 12, background: ttsUrl ? "rgba(124,106,255,0.15)" : "rgba(74,222,128,0.15)", border: `1px solid ${ttsUrl ? "rgba(124,106,255,0.3)" : "rgba(74,222,128,0.3)"}`, borderRadius: 3, display: "flex", alignItems: "center", padding: "0 4px" }}>
                    <span style={{ fontSize: 7, color: ttsUrl ? "#a78bfa" : "#4ade80" }}>{ttsUrl ? "TTS" : "Audio"}</span>
                  </div>
                </div>
              )}
              {/* 재생 헤드 */}
              <div style={{ position: "absolute", left: playhead * tlPxPerSec, top: 0, width: 2, height: "100%", background: "#ff3b3b", zIndex: 20, pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 10, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
