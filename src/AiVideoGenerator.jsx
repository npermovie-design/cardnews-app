import { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const SHORTS_API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// ════════════════════════════════════════
// Remotion 컴포지션 (스킬 기반 — spring, 스타일별 모션)
// ════════════════════════════════════════
function SceneComposition({ scenes, audioUrl, style, captions }) {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: style?.bg || "#000" }}>
      {scenes.map((sc, i) => {
        const from = Math.round(sc._startFrame || 0);
        const dur = Math.round(sc._durFrames || (durationInFrames / scenes.length));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneSlide scene={sc} style={style} sceneIndex={i} totalScenes={scenes.length} />
          </Sequence>
        );
      })}
      {captions && captions.length > 0 && <CaptionOverlay captions={captions} style={style} />}
      {audioUrl && <Audio src={audioUrl} volume={1} />}
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 모션그래픽 서브 컴포넌트들
// ═══════════════════════════════════════════════

// ── 애니메이션 프로그레스 바 (하단) ──
function ProgressBar({ color, frame, durationInFrames }) {
  return <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.3)" }}>
    <div style={{ height: "100%", background: color, width: `${interpolate(frame, [0, durationInFrames], [0, 100])}%`, borderRadius: "0 3px 3px 0" }} />
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
// 메인 씬 슬라이드 (완전 재설계)
// ═══════════════════════════════════════════════
function SceneSlide({ scene, style, sceneIndex, totalScenes }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const styleId = style?.id || "cinematic";
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === totalScenes - 1;

  // ── 공통 spring 애니메이션 ──
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const bounce = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const snap = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const delayed1 = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const delayed2 = spring({ frame, fps, delay: 16, config: { damping: 200 } });
  const delayed3 = spring({ frame, fps, delay: 24, config: { damping: 200 } });

  // ── 퇴장 ──
  const exitStart = Math.max(0, durationInFrames - 10);
  const exitOp = interpolate(frame, [exitStart, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Ken Burns (이미지용) ──
  const kbScale = interpolate(frame, [0, durationInFrames], [1, 1.15], { extrapolateRight: "clamp" });
  const kbX = interpolate(frame, [0, durationInFrames], [sceneIndex % 2 === 0 ? -3 : 3, sceneIndex % 2 === 0 ? 3 : -3]);

  // ── 타이틀 텍스트 ──
  const titleText = scene.title || "";
  const subText = scene.text || "";
  const scriptText = scene._scriptText || "";

  // ── 씬 번호 ──
  const sceneNum = String(sceneIndex + 1).padStart(2, "0");

  return (
    <AbsoluteFill style={{ opacity: exitOp, overflow: "hidden" }}>

      {/* ════ 배경 레이어 ════ */}
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${kbScale}) translateX(${kbX}%)`,
          }} />
          {/* 강한 오버레이 */}
          <div style={{ position: "absolute", inset: 0, background: styleId === "minimal"
            ? "rgba(255,255,255,0.7)"
            : styleId === "bold"
            ? "linear-gradient(135deg, rgba(0,0,0,0.7), rgba(100,0,0,0.6))"
            : "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.85) 100%)"
          }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: scene.bgColor || style?.bg || "#0a0a1a" }} />
      )}

      {/* ════ 스타일별 배경 효과 ════ */}

      {/* 모션그래픽: 그리드 + 글로잉 오브 + 움직이는 그래디언트 */}
      {styleId === "motion" && (<>
        <GridLines frame={frame} fps={fps} color="#00d4ff" count={10} />
        <GlowOrb x={20} y={30} size={200} color="rgba(0,212,255,0.4)" frame={frame} fps={fps} />
        <GlowOrb x={80} y={70} size={150} color="rgba(124,106,255,0.3)" frame={frame} fps={fps} delay={10} />
        <GlowOrb x={60} y={20} size={100} color="rgba(0,255,170,0.2)" frame={frame} fps={fps} delay={20} />
        <div style={{ position: "absolute", inset: "-30%",
          background: `conic-gradient(from ${frame * 2}deg at 50% 50%, rgba(0,212,255,0.08), rgba(124,106,255,0.06), rgba(0,255,170,0.04), rgba(0,212,255,0.08))`,
          transform: `rotate(${frame * 0.5}deg)`,
        }} />
      </>)}

      {/* 애니메이션: 파티클 + 떠다니는 도형 */}
      {styleId === "animation" && (<>
        <Particles count={12} frame={frame} fps={fps} durationInFrames={durationInFrames}
          colors={["#ff6b9d","#ffeead","#a78bfa","#67e8f9","#f472b6"]}
          shapes={["★","♥","✦","◆","●","♦","✿","◇"]} />
        {[0,1,2].map(j => (
          <div key={`ab${j}`} style={{
            position: "absolute",
            left: `${15 + j * 30}%`, top: `${25 + Math.sin(frame/fps + j*2) * 12}%`,
            width: 80 + j * 30, height: 80 + j * 30, borderRadius: j === 1 ? "30%" : "50%",
            background: `rgba(${255 - j*60},${107+j*40},${157+j*30},0.08)`,
            border: `2px solid rgba(${255-j*60},${107+j*40},${157+j*30},0.15)`,
            transform: `rotate(${frame * (j % 2 === 0 ? 1 : -1)}deg) scale(${spring({ frame, fps, delay: j*8, config: { damping: 15 } })})`,
          }} />
        ))}
      </>)}

      {/* 시네마틱: 비네팅 + 레터박스 + 아나모픽 플레어 */}
      {styleId === "cinematic" && (<>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "6%", background: "#000" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "6%", background: "#000" }} />
        {/* 아나모픽 렌즈 플레어 */}
        <div style={{
          position: "absolute", top: "30%", left: "-10%", right: "-10%", height: 3,
          background: `linear-gradient(90deg, transparent, rgba(255,215,0,${interpolate(frame, [fps*0.5, fps*1.5], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) 40%, rgba(255,200,100,${interpolate(frame, [fps*0.5, fps*1.5], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) 60%, transparent)`,
          transform: `translateY(${interpolate(frame, [0, durationInFrames], [-20, 20])}px)`,
          pointerEvents: "none",
        }} />
      </>)}

      {/* 임팩트(bold): 충격파 + 스트라이프 + 글리치 */}
      {styleId === "bold" && (<>
        {frame < fps * 0.8 && [0,1,2].map(j => (
          <div key={`sw${j}`} style={{
            position: "absolute", top: "50%", left: "50%",
            width: interpolate(frame, [j*4, j*4 + fps*0.6], [0, 1200]), height: interpolate(frame, [j*4, j*4 + fps*0.6], [0, 1200]),
            borderRadius: "50%", border: `${3-j}px solid rgba(255,59,59,${interpolate(frame, [j*4, j*4 + fps*0.6], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
            transform: "translate(-50%, -50%)", pointerEvents: "none",
          }} />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, transparent, transparent 30px, rgba(255,0,0,0.03) 30px, rgba(255,0,0,0.03) 32px)", opacity: enter, pointerEvents: "none" }} />
        {/* 글리치 라인 */}
        {frame % 30 < 2 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: `${20 + (frame * 7) % 60}%`, height: 4, background: "rgba(255,0,0,0.4)", pointerEvents: "none" }} />
        )}
      </>)}

      {/* 미니멀: 클린 프레임 + 도형 */}
      {styleId === "minimal" && (<>
        <div style={{ position: "absolute", inset: "6%", border: `1.5px solid rgba(26,26,46,${enter * 0.15})`, borderRadius: 8, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "8%", left: "8%", width: interpolate(enter, [0, 1], [0, 50]), height: 3, background: "#7c6aff", borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: "8%", right: "8%", width: 3, height: interpolate(enter, [0, 1], [0, 50]), background: "#7c6aff", borderRadius: 2 }} />
      </>)}

      {/* 실사 홍보: 기업 UI 라인 + 번호 + 액센트 바 */}
      {styleId === "realfilm" && (<>
        <div style={{ position: "absolute", left: 0, top: "15%", width: 5, height: interpolate(enter, [0, 1], [0, 180]), background: "linear-gradient(180deg, #fff, rgba(255,255,255,0.3))", borderRadius: 3 }} />
        <div style={{ position: "absolute", bottom: "12%", left: "8%", right: "60%", height: 1, background: `rgba(255,255,255,${delayed1 * 0.2})` }} />
      </>)}

      {/* ════ 콘텐츠 레이어 ════ */}

      {/* ── 모션그래픽: 좌상단 레이아웃 + 인포그래픽 ── */}
      {styleId === "motion" && (
        <AbsoluteFill style={{ padding: "10% 8%" }}>
          {/* 씬 번호 배지 */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16,
            opacity: enter,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: "rgba(0,212,255,0.15)",
              border: "1.5px solid rgba(0,212,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 900, color: "#00d4ff",
              transform: `scale(${bounce})`,
            }}>{sceneNum}</div>
            <div style={{ width: interpolate(delayed1, [0, 1], [0, 40]), height: 2, background: "#00d4ff", borderRadius: 1 }} />
          </div>
          {/* 메인 타이틀: 타이핑 효과 */}
          <div style={{ marginBottom: 16 }}>
            <TypewriterText text={titleText} frame={frame} fps={fps} delay={6}
              style={{ fontSize: style?.titleSize || 44, fontWeight: 900, color: "#fff", lineHeight: 1.2, wordBreak: "keep-all",
                textShadow: "0 4px 20px rgba(0,0,0,0.8)" }} />
          </div>
          {/* 서브텍스트 */}
          {subText && (
            <div style={{ opacity: delayed2, transform: `translateY(${interpolate(delayed2, [0, 1], [20, 0])}px)`,
              fontSize: 18, fontWeight: 500, color: "rgba(200,230,255,0.8)", lineHeight: 1.6, maxWidth: "80%", wordBreak: "keep-all" }}>
              {subText}
            </div>
          )}
          {/* 하단 인포그래픽 (짝수 씬: 바 차트, 홀수 씬: 원형 프로그레스) */}
          <div style={{ position: "absolute", bottom: "12%", left: "8%", right: "8%", opacity: delayed3 }}>
            {sceneIndex % 2 === 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <BarChart data={[
                  { label: "A", value: 80 + sceneIndex * 5 },
                  { label: "B", value: 60 + sceneIndex * 8 },
                  { label: "C", value: 90 - sceneIndex * 3 },
                  { label: "D", value: 70 + sceneIndex * 2 },
                ]} frame={frame} fps={fps} colors={["#00d4ff","#7c6aff","#00ffaa","#ff6b9d"]} maxH={80} />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative" }}>
                  <CircleProgress progress={0.75} size={70} strokeWidth={6} color="#00d4ff" frame={frame} fps={fps} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AnimatedCounter value={75} frame={frame} fps={fps} suffix="%" style={{ fontSize: 16, fontWeight: 900, color: "#00d4ff" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>PROGRESS</div>
                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 800, marginTop: 2 }}>Scene {sceneNum}</div>
                </div>
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* ── 애니메이션: 중앙 레이아웃 + 말풍선 느낌 ── */}
      {styleId === "animation" && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10%" }}>
          <div style={{ textAlign: "center", transform: `scale(${bounce})` }}>
            {/* 말풍선 배경 */}
            <div style={{
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
              borderRadius: 24, padding: "28px 32px", border: "2px solid rgba(255,255,255,0.15)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              transform: `translateY(${interpolate(bounce, [0, 1], [40, 0])}px)`,
            }}>
              <div style={{
                fontSize: style?.titleSize || 40, fontWeight: 900,
                color: style?.titleColor || "#ff6b9d", lineHeight: 1.2, wordBreak: "keep-all",
                textShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}>{titleText}</div>
              {subText && (
                <div style={{
                  fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 12,
                  opacity: delayed1, lineHeight: 1.5, wordBreak: "keep-all",
                }}>{subText}</div>
              )}
            </div>
            {/* 씬 인디케이터 도트 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, opacity: delayed2 }}>
              {Array.from({ length: totalScenes }).map((_, i) => (
                <div key={i} style={{
                  width: i === sceneIndex ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === sceneIndex ? "#ff6b9d" : "rgba(255,255,255,0.2)",
                  transition: "none",
                }} />
              ))}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── 실사 홍보: 프로 레이아웃 ── */}
      {styleId === "realfilm" && (
        <AbsoluteFill style={{ padding: "12% 8%" }}>
          {/* 상단 라벨 */}
          <div style={{ opacity: enter, marginBottom: 8 }}>
            <div style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 4,
              background: "rgba(255,255,255,0.15)", fontSize: 11, fontWeight: 700,
              color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase",
            }}>{sceneNum} / {String(totalScenes).padStart(2, "0")}</div>
          </div>
          {/* 메인 타이틀 */}
          <div style={{
            fontSize: style?.titleSize || 42, fontWeight: 900, color: "#fff",
            lineHeight: 1.15, wordBreak: "keep-all", marginBottom: 14,
            opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
          }}>{titleText}</div>
          {/* 구분선 */}
          <div style={{ width: interpolate(delayed1, [0, 1], [0, 60]), height: 3, background: "#fff", borderRadius: 2, marginBottom: 14 }} />
          {/* 서브텍스트 */}
          {subText && (
            <div style={{
              fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7,
              opacity: delayed2, transform: `translateY(${interpolate(delayed2, [0, 1], [15, 0])}px)`,
              maxWidth: "85%", wordBreak: "keep-all",
            }}>{subText}</div>
          )}
          {/* 하단 수치 표시 */}
          <div style={{ position: "absolute", bottom: "10%", left: "8%", right: "8%", display: "flex", gap: 24, opacity: delayed3 }}>
            {[{ label: "STEP", val: sceneIndex + 1 }, { label: "TOTAL", val: totalScenes }].map((d, i) => (
              <div key={i}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 2 }}>{d.label}</div>
                <AnimatedCounter value={d.val} frame={frame} fps={fps} delay={20 + i * 6}
                  style={{ fontSize: 28, fontWeight: 900, color: "#fff" }} />
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ── 시네마틱: 영화 자막 스타일 ── */}
      {styleId === "cinematic" && (
        <AbsoluteFill>
          {/* 하단 텍스트 영역 */}
          <div style={{ position: "absolute", bottom: "10%", left: "8%", right: "8%" }}>
            {/* 작은 라벨 */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: style?.titleColor || "#ffd700",
              letterSpacing: 3, textTransform: "uppercase", marginBottom: 10,
              opacity: interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" }),
            }}>SCENE {sceneNum}</div>
            {/* 메인 타이틀 */}
            <div style={{
              fontSize: style?.titleSize || 44, fontWeight: 900, color: "#fff",
              lineHeight: 1.15, wordBreak: "keep-all",
              opacity: interpolate(frame, [fps * 0.2, fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              textShadow: `0 0 40px rgba(255,215,0,0.25), 0 4px 20px rgba(0,0,0,0.9)`,
            }}>{titleText}</div>
            {/* 서브텍스트 */}
            {subText && (
              <div style={{
                fontSize: 16, color: "rgba(255,255,255,0.65)", marginTop: 10,
                lineHeight: 1.6, wordBreak: "keep-all",
                opacity: delayed1,
              }}>{subText}</div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* ── 미니멀: 클린 중앙 타이포 ── */}
      {styleId === "minimal" && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12%" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#7c6aff", letterSpacing: 4, marginBottom: 14,
              opacity: snap, textTransform: "uppercase",
            }}>PART {sceneNum}</div>
            <div style={{
              fontSize: style?.titleSize || 40, fontWeight: 900,
              color: style?.titleColor || "#1a1a2e", lineHeight: 1.2, wordBreak: "keep-all",
              opacity: snap, transform: `translateY(${interpolate(snap, [0, 1], [15, 0])}px)`,
            }}>{titleText}</div>
            {subText && (
              <div style={{
                fontSize: 16, color: "#666", lineHeight: 1.7, marginTop: 16,
                opacity: delayed1, maxWidth: 600, wordBreak: "keep-all",
              }}>{subText}</div>
            )}
            {/* 하단 구분자 */}
            <div style={{
              width: interpolate(delayed2, [0, 1], [0, 40]), height: 2,
              background: "#7c6aff", borderRadius: 1, margin: "20px auto 0",
            }} />
          </div>
        </AbsoluteFill>
      )}

      {/* ── 임팩트(bold): 풀스크린 타이포 ── */}
      {styleId === "bold" && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8%" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: (style?.titleSize || 48) * 1.2, fontWeight: 900,
              color: style?.titleColor || "#ff3b3b", lineHeight: 1.05, wordBreak: "keep-all",
              letterSpacing: -3,
              transform: `scale(${interpolate(bounce, [0, 1], [2.5, 1])})`,
              opacity: bounce,
              textShadow: "0 0 60px rgba(255,59,59,0.5), 0 4px 20px rgba(0,0,0,0.8)",
            }}>{titleText}</div>
            {subText && (
              <div style={{
                fontSize: 18, color: "#fff", marginTop: 16, fontWeight: 700,
                opacity: delayed2, transform: `translateY(${interpolate(delayed2, [0, 1], [20, 0])}px)`,
                lineHeight: 1.5, wordBreak: "keep-all",
              }}>{subText}</div>
            )}
            {/* 카운터 강조 */}
            <div style={{ marginTop: 20, opacity: delayed3 }}>
              <AnimatedCounter value={sceneIndex + 1} frame={frame} fps={fps} delay={20}
                style={{ fontSize: 56, fontWeight: 900, color: "rgba(255,59,59,0.3)" }} />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ════ 공통: 프로그레스 바 ════ */}
      <ProgressBar color={style?.titleColor || "#7c6aff"} frame={frame} durationInFrames={durationInFrames} />

    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 자막 오버레이 (완전 재설계 — 하이라이트 + 모션)
// ═══════════════════════════════════════════════
function CaptionOverlay({ captions, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const current = captions.find(c => currentMs >= c.startMs && currentMs < c.endMs);
  if (!current) return null;

  const styleId = style?.id || "cinematic";
  const localFrame = Math.round((currentMs - current.startMs) / 1000 * fps);
  const pop = spring({ frame: localFrame, fps, config: { damping: 15, stiffness: 200 } });
  const progress = interpolate(currentMs, [current.startMs, current.endMs], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // 단어 단위 하이라이트
  const words = (current.text || "").split(/(\s+)/);
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  let charCount = 0;

  const captionStyle = {
    motion: { bg: "rgba(0,10,30,0.9)", border: "1px solid rgba(0,212,255,0.3)", color: "#fff", highlight: "#00d4ff" },
    animation: { bg: "rgba(40,10,60,0.9)", border: "1px solid rgba(255,107,157,0.3)", color: "#fff", highlight: "#ff6b9d" },
    realfilm: { bg: "rgba(0,0,0,0.85)", border: "none", color: "#fff", highlight: "#4a9eff" },
    cinematic: { bg: "transparent", border: "none", color: "#fff", highlight: "#ffd700" },
    minimal: { bg: "rgba(255,255,255,0.95)", border: "1px solid rgba(0,0,0,0.08)", color: "#1a1a2e", highlight: "#7c6aff" },
    bold: { bg: "rgba(180,0,0,0.9)", border: "none", color: "#fff", highlight: "#fff" },
  }[styleId] || { bg: "rgba(0,0,0,0.8)", border: "none", color: "#fff", highlight: "#fff" };

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 4% 6%", pointerEvents: "none" }}>
      <div style={{
        background: captionStyle.bg, border: captionStyle.border,
        borderRadius: styleId === "cinematic" ? 0 : 12,
        padding: styleId === "cinematic" ? "0 0 0 14px" : "10px 22px",
        maxWidth: "94%",
        transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])}) translateY(${interpolate(pop, [0, 1], [10, 0])}px)`,
        opacity: pop,
        borderLeft: styleId === "cinematic" ? `3px solid ${style?.titleColor || "#ffd700"}` : undefined,
        boxShadow: styleId === "cinematic" ? "none" : "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <div style={{
          fontSize: style?.captionSize || 26, fontWeight: 800,
          lineHeight: 1.5, wordBreak: "keep-all",
          textAlign: "center",
        }}>
          {words.map((word, wi) => {
            const wordStart = charCount / totalChars;
            charCount += word.length;
            const wordEnd = charCount / totalChars;
            const isActive = progress >= wordStart && progress < wordEnd + 0.05;
            const isPast = progress >= wordEnd + 0.05;
            return (
              <span key={wi} style={{
                color: isActive ? captionStyle.highlight : isPast ? captionStyle.color : `${captionStyle.color}88`,
                textShadow: isActive ? `0 0 12px ${captionStyle.highlight}60` : styleId === "minimal" ? "none" : "0 2px 8px rgba(0,0,0,0.5)",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                display: "inline",
                fontWeight: isActive ? 900 : 700,
              }}>{word}</span>
            );
          })}
        </div>
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
  // 프리뷰: 화면에 맞게 크게
  const previewScale = sizeId === "9:16" ? { w: "min(400px, 45vh * 9 / 16)", h: "min(710px, 78vh)" } : sizeId === "1:1" ? { w: "min(560px, 70vh)", h: "min(560px, 70vh)" } : { w: "min(720px, 90vw)", h: "min(405px, 50vh)" };

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

      // 3) AI에게는 이미지 키워드만 생성 요청 (대본 매칭은 코드에서 직접)
      setLoadingMsg("씬에 맞는 이미지를 찾고 있어요...");
      let imagePrompts = sceneTexts.map(() => currentStyle.imageKeyword || "abstract");
      try {
        const aiRes = await fetch("/api/ai-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat", model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: `각 문장에 어울리는 Unsplash 이미지 검색 키워드(영어 2-3단어)를 생성. 스타일: ${currentStyle.name}.
JSON 배열만 출력. 예: ["technology office","nature sunset","food cooking"]`
            }, {
              role: "user",
              content: sceneTexts.map((t, i) => `${i+1}. ${t.slice(0, 80)}`).join("\n")
            }],
          }),
        });
        const aiData = await aiRes.json();
        const aiContent = aiData.choices?.[0]?.message?.content || aiData.content || "";
        const arr = JSON.parse(aiContent.match(/\[[\s\S]*\]/)?.[0] || "[]");
        if (arr.length === sceneTexts.length) imagePrompts = arr.map(k => `${currentStyle.imageKeyword} ${k}`);
      } catch {}

      // 4) 이미지 검색
      const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
      const scenesWithImages = await Promise.all(sceneTexts.map(async (txt, i) => {
        const startSec = i * secPerScene;
        const endSec = (i + 1) * secPerScene;
        // 제목: 해당 청크의 첫 문장에서 핵심 15자
        const title = txt.slice(0, 20).replace(/[.!?。,]$/, "");
        let imageUrl = null;
        try {
          const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(imagePrompts[i] || "abstract")}&per_page=1&orientation=${orient}`);
          const d = await r.json();
          imageUrl = d.results?.[0]?.urls?.regular || null;
        } catch {}
        return {
          title, text: txt.slice(0, 60), imageUrl,
          imagePrompt: imagePrompts[i] || "", bgColor: currentStyle.bg,
          _startSec: startSec, _endSec: endSec,
          _startFrame: Math.round(startSec * FPS),
          _durFrames: Math.round(secPerScene * FPS),
          _scriptText: txt, // 원본 대본 텍스트 (자막용)
        };
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

      // TTS 음성 생성 (OpenAI TTS API)
      if (ttsEnabled && !audioFile) {
        setLoadingMsg("AI 음성을 생성하고 있어요...");
        try {
          // 전체 대본을 하나의 TTS로 생성 (자연스러운 흐름)
          const fullScript = scenesWithImages.map(sc => sc._scriptText || sc.title || "").filter(Boolean).join("\n");
          if (fullScript.trim()) {
            // 4096자 제한: 넘으면 잘라서 생성
            const ttsText = fullScript.slice(0, 4096);
            const ttsRes = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: ttsText, voice: ttsVoice, speed: ttsSpeed }),
            });
            if (ttsRes.ok) {
              const blob = await ttsRes.blob();
              const url = URL.createObjectURL(blob);
              setTtsUrl(url);
              // TTS 오디오 길이 측정 → 씬 타이밍 재조정
              const audio = new window.Audio(url);
              await new Promise(resolve => {
                audio.onloadedmetadata = () => {
                  const ttsDuration = audio.duration;
                  if (ttsDuration > 3) {
                    setDuration(Math.ceil(ttsDuration));
                    // 씬 타이밍을 TTS 오디오 길이에 맞춰 재분배
                    const secPerScene = ttsDuration / scenesWithImages.length;
                    setScenes(prev => prev.map((sc, i) => ({
                      ...sc,
                      _startSec: i * secPerScene,
                      _endSec: (i + 1) * secPerScene,
                      _startFrame: Math.round(i * secPerScene * FPS),
                      _durFrames: Math.round(secPerScene * FPS),
                    })));
                    // 자막도 TTS 시간에 맞게 재조정
                    setCaptions(prev => prev.map((c, i) => ({
                      ...c,
                      startMs: Math.round(i * secPerScene * 1000),
                      endMs: Math.round((i + 1) * secPerScene * 1000),
                    })));
                  }
                  resolve();
                };
                audio.onerror = resolve;
              });
            } else {
              console.warn("TTS 생성 실패:", await ttsRes.text().catch(() => ""));
            }
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
            <button onClick={() => { setStep("input"); setScenes([]); setCaptions([]); if (ttsUrl) { URL.revokeObjectURL(ttsUrl); setTtsUrl(null); } }} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer" }}>처음</button>
          </div>
        </div>

        {/* 중앙: 프리뷰 + 재생 컨트롤 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "2px solid #2a2a4a", position: "relative" }}>
            <Player
              acknowledgeRemotionLicense
              ref={playerRef}
              component={SceneComposition}
              inputProps={{ scenes, audioUrl: ttsUrl || audioUrl, style: currentStyle, captions }}
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
