import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";

/* ═══════════════════════════════════════════════════════════
   ShortformComposition v2 – Remotion 숏폼 컴포지션 (애니메이션 강화)
═══════════════════════════════════════════════════════════ */

function TextOverlay({ text, color, fontSize, maxWidth, style }) {
  if (!text) return null;
  return (
    <div style={{
      fontWeight: 900, fontFamily: "sans-serif", color, fontSize,
      textShadow: "2px 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
      textAlign: "center", maxWidth: maxWidth || "88%", lineHeight: 1.35, wordBreak: "keep-all",
      ...style,
    }}>
      {text}
    </div>
  );
}

// 슬라이드 업 + 페이드인
function SlideUp({ children, delay = 0, distance = 30 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = Math.round(delay * fps);
  const progress = spring({ frame: frame - d, fps, config: { damping: 15, stiffness: 120 } });
  const y = interpolate(progress, [0, 1], [distance, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>;
}

// 스케일 팝인
function PopIn({ children, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = Math.round(delay * fps);
  const s = spring({ frame: frame - d, fps, config: { damping: 12, stiffness: 150 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  return <div style={{ opacity, transform: `scale(${scale})` }}>{children}</div>;
}

// 글자 하나씩 나타나기 (카운트다운 효과)
function TypeWriter({ text, color, fontSize, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!text) return null;
  const d = Math.round(delay * fps);
  const chars = Math.floor(interpolate(frame - d, [0, text.length * 2], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ fontWeight: 900, fontFamily: "sans-serif", color, fontSize,
      textShadow: "2px 2px 12px rgba(0,0,0,0.9)", textAlign: "center", lineHeight: 1.35 }}>
      {text.slice(0, chars)}<span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
    </div>
  );
}

// 진행률 바
function ProgressBar({ color, height = 4 }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = (frame / durationInFrames) * 100;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height, zIndex: 10, background: "rgba(0,0,0,0.3)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color || "#7c6aff", transition: "none" }} />
    </div>
  );
}

// ── 레이아웃: split ──
function LayoutSplit({ videoSrc, startFrom, topText, botText, topColor, botColor }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "15%", zIndex: 2,
        background: "linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.1))",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5%" }}>
        <SlideUp delay={0.1}>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(50, Math.max(28, Math.floor(800 / Math.max((topText || "").length, 1))))} />
        </SlideUp>
      </div>
      <div style={{ position: "absolute", top: "15%", bottom: "15%", left: 0, right: 0, overflow: "hidden" }}>
        {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 32%" }} />
          : <div style={{ width: "100%", height: "100%", background: "#2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>&#128100;</div>}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "15%", zIndex: 2,
        background: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.95))",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5%" }}>
        <SlideUp delay={0.3} distance={20}>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(42, Math.max(24, Math.floor(700 / Math.max((botText || "").length, 1))))} />
        </SlideUp>
      </div>
      <ProgressBar color={topColor} />
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_bot ──
function LayoutFullBot({ videoSrc, startFrom, botText, botColor }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", background: "#1a1a2e" }} />}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "25%",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85), rgba(0,0,0,0.95))",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 5% 6%" }}>
        <PopIn delay={0.2}>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(46, Math.max(26, Math.floor(760 / Math.max((botText || "").length, 1))))} />
        </PopIn>
      </div>
      <ProgressBar color={botColor} />
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_top ──
function LayoutFullTop({ videoSrc, startFrom, topText, topColor }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", background: "#1a1a2e" }} />}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "20%",
        background: "linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5% 5% 0" }}>
        <SlideUp delay={0.1}>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(52, Math.max(30, Math.floor(820 / Math.max((topText || "").length, 1))))} />
        </SlideUp>
      </div>
      <ProgressBar color={topColor} />
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_center ──
function LayoutFullCenter({ videoSrc, startFrom, botText, botColor, bgOp }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", background: "#1a1a2e" }} />}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PopIn delay={0.15}>
          <div style={{ background: `rgba(0,0,0,${Math.max(bgOp || 0.65, 0.65)})`, borderRadius: 20, padding: "24px 36px", maxWidth: "85%" }}>
            <TextOverlay text={botText} color={botColor} fontSize={Math.min(48, Math.max(28, Math.floor(780 / Math.max((botText || "").length, 1))))} />
          </div>
        </PopIn>
      </AbsoluteFill>
      <ProgressBar color={botColor} />
    </AbsoluteFill>
  );
}

// ── 레이아웃: top_text ──
function LayoutTopText({ videoSrc, startFrom, topText, topColor }) {
  return (
    <AbsoluteFill style={{ background: "#111", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "0 0 35%", background: "linear-gradient(135deg, #1a1a2e, #0f0f1f)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6%" }}>
        <SlideUp>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(56, Math.max(32, Math.floor(800 / Math.max((topText || "").length, 1))))} />
        </SlideUp>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "#2a2a3a" }} />}
      </div>
      <ProgressBar color={topColor} />
    </AbsoluteFill>
  );
}

// ── 레이아웃: bot_text ──
function LayoutBotText({ videoSrc, startFrom, topText, botText, topColor, botColor }) {
  return (
    <AbsoluteFill style={{ background: "#111", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "0 0 65%", overflow: "hidden", position: "relative" }}>
        {videoSrc ? <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "#2a2a3a" }} />}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, #0f0f1f)" }} />
      </div>
      <div style={{ flex: "0 0 35%", background: "linear-gradient(135deg, #0f0f1f, #1a1a2e)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6%", gap: 12 }}>
        <SlideUp delay={0.1}>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(36, Math.max(20, Math.floor(700 / Math.max((topText || "").length, 1))))} />
        </SlideUp>
        <SlideUp delay={0.25}>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(42, Math.max(24, Math.floor(740 / Math.max((botText || "").length, 1))))} />
        </SlideUp>
      </div>
      <ProgressBar color={botColor} />
    </AbsoluteFill>
  );
}

// ── 메인 컴포지션 ──
export default function ShortformComposition({
  videoSrc, startFrom = 0, layoutType = "split",
  topText = "", botText = "",
  topColor = "#ffffff", botColor = "#ffff00",
  bgOp = 0.55, font = "Noto Sans KR",
}) {
  const props = { videoSrc, startFrom, topText, botText, topColor, botColor, bgOp, font };
  return (
    <AbsoluteFill style={{ fontFamily: font }}>
      {layoutType === "split" && <LayoutSplit {...props} />}
      {layoutType === "full_bot" && <LayoutFullBot {...props} />}
      {layoutType === "full_top" && <LayoutFullTop {...props} />}
      {layoutType === "full_center" && <LayoutFullCenter {...props} />}
      {layoutType === "top_text" && <LayoutTopText {...props} />}
      {layoutType === "bot_text" && <LayoutBotText {...props} />}
    </AbsoluteFill>
  );
}
