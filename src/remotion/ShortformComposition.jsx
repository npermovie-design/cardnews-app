import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, interpolate, Sequence } from "remotion";

/* ═══════════════════════════════════════════════════════════
   ShortformComposition – Remotion 기반 숏폼 미리보기 컴포지션
   기존 Canvas drawFrame 로직을 React 컴포넌트로 재구현
═══════════════════════════════════════════════════════════ */

// ── 텍스트 오버레이 (공통) ──────────────────────────────────
function TextOverlay({ text, color, fontSize, maxWidth, style }) {
  if (!text) return null;
  return (
    <div style={{
      fontWeight: 900,
      fontFamily: "sans-serif",
      color,
      fontSize,
      textShadow: "2px 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
      textAlign: "center",
      maxWidth: maxWidth || "88%",
      lineHeight: 1.35,
      wordBreak: "keep-all",
      ...style,
    }}>
      {text}
    </div>
  );
}

// ── 페이드인 애니메이션 래퍼 ─────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delay * fps);
  const opacity = interpolate(frame - delayFrames, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity }}>{children}</div>;
}

// ── 레이아웃: split (얼굴+제목+자막) ────────────────────────
function LayoutSplit({ videoSrc, startFrom, topText, botText, topColor, botColor, font }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 상단 그라데이션 + 제목 */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "14.6%", zIndex: 2,
        background: "linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.1))",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5%" }}>
        <FadeIn>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(54, Math.max(32, Math.floor(800 / Math.max((topText || "").length, 1))))} />
        </FadeIn>
      </div>

      {/* 비디오 (중앙) */}
      <div style={{ position: "absolute", top: "14.6%", bottom: "14.6%", left: 0, right: 0, overflow: "hidden" }}>
        {videoSrc && (
          <Video src={videoSrc} startFrom={startFrom}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 32%" }} />
        )}
        {!videoSrc && (
          <div style={{ width: "100%", height: "100%", background: "#2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>
            👤
          </div>
        )}
      </div>

      {/* 하단 그라데이션 + 자막 */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "14.6%", zIndex: 2,
        background: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.95))",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5%" }}>
        <FadeIn delay={0.15}>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(46, Math.max(28, Math.floor(720 / Math.max((botText || "").length, 1))))} />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_bot (풀화면+하단자막) ─────────────────────
function LayoutFullBot({ videoSrc, startFrom, botText, botColor }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? (
        <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>🎥</div>
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "22%",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85), rgba(0,0,0,0.95))",
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 5% 5%" }}>
        <FadeIn>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(50, Math.max(30, Math.floor(760 / Math.max((botText || "").length, 1))))} />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_top (풀화면+상단자막) ─────────────────────
function LayoutFullTop({ videoSrc, startFrom, topText, topColor }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? (
        <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>🎥</div>
      )}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "18%",
        background: "linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.7), transparent)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "4% 5% 0" }}>
        <FadeIn>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(56, Math.max(34, Math.floor(820 / Math.max((topText || "").length, 1))))} />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ── 레이아웃: full_center (풀화면+중앙자막) ──────────────────
function LayoutFullCenter({ videoSrc, startFrom, botText, botColor, bgOp }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {videoSrc ? (
        <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>🎥</div>
      )}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FadeIn>
          <div style={{ background: `rgba(0,0,0,${Math.max(bgOp || 0.65, 0.65)})`, borderRadius: 20, padding: "24px 36px", maxWidth: "85%" }}>
            <TextOverlay text={botText} color={botColor} fontSize={Math.min(52, Math.max(32, Math.floor(780 / Math.max((botText || "").length, 1))))} />
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── 레이아웃: top_text (상단텍스트형) ────────────────────────
function LayoutTopText({ videoSrc, startFrom, topText, topColor }) {
  return (
    <AbsoluteFill style={{ background: "#111", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "0 0 35%", background: "linear-gradient(135deg, #1a1a2e, #0f0f1f)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6%" }}>
        <FadeIn>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(60, Math.max(36, Math.floor(800 / Math.max((topText || "").length, 1))))} />
        </FadeIn>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {videoSrc ? (
          <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>🎥</div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ── 레이아웃: bot_text (하단텍스트형) ────────────────────────
function LayoutBotText({ videoSrc, startFrom, topText, botText, topColor, botColor }) {
  return (
    <AbsoluteFill style={{ background: "#111", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "0 0 65%", overflow: "hidden", position: "relative" }}>
        {videoSrc ? (
          <Video src={videoSrc} startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>🎥</div>
        )}
        {/* 하단 그라데이션 블렌딩 */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
          background: "linear-gradient(transparent, #0f0f1f)" }} />
      </div>
      <div style={{ flex: "0 0 35%", background: "linear-gradient(135deg, #0f0f1f, #1a1a2e)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6%", gap: 12 }}>
        <FadeIn>
          <TextOverlay text={topText} color={topColor} fontSize={Math.min(40, Math.max(24, Math.floor(700 / Math.max((topText || "").length, 1))))} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <TextOverlay text={botText} color={botColor} fontSize={Math.min(46, Math.max(28, Math.floor(740 / Math.max((botText || "").length, 1))))} />
        </FadeIn>
      </div>
    </AbsoluteFill>
  );
}

// ── 메인 컴포지션 ───────────────────────────────────────────
export default function ShortformComposition({
  videoSrc,
  startFrom = 0,
  layoutType = "split",
  topText = "",
  botText = "",
  topColor = "#ffffff",
  botColor = "#ffff00",
  bgOp = 0.55,
  font = "Noto Sans KR",
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
