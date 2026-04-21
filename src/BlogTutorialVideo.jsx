import { useState, useEffect } from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Sequence, Img, Audio,
} from "remotion";

// ═══════════════════════════════════════════════
// 블로그 작성 튜토리얼 영상 — 스크린샷 기반
// 1920×1080, 30fps
// ═══════════════════════════════════════════════

const FPS = 30;
const IMG = "/video-assets/blog-tutorial";

const K = {
  purple: "#7c6aff", pink: "#ec4899",
  white: "#ffffff", muted: "rgba(255,255,255,0.5)",
  grad: "linear-gradient(135deg,#7c6aff,#ec4899)",
  gradBg: "linear-gradient(165deg,#0d0b1a 0%,#1a1040 50%,#0d0b1a 100%)",
  naver: "#03c75a",
};

/* ── 유틸 ── */
function fadeSlide(frame, fps, dir = "up", delay = 0) {
  const f = Math.max(0, frame - delay * fps);
  const e = fps * 0.5;
  const opacity = interpolate(f, [0, e], [0, 1], { extrapolateRight: "clamp" });
  const y = dir === "up" ? interpolate(f, [0, e], [40, 0], { extrapolateRight: "clamp" })
    : dir === "down" ? interpolate(f, [0, e], [-40, 0], { extrapolateRight: "clamp" }) : 0;
  const x = dir === "left" ? interpolate(f, [0, e], [60, 0], { extrapolateRight: "clamp" })
    : dir === "right" ? interpolate(f, [0, e], [-60, 0], { extrapolateRight: "clamp" }) : 0;
  return { opacity, transform: `translate(${x}px, ${y}px)` };
}

/* ── 배경 요소 ── */
function WaveBg({ color = K.purple, speed = 0.02, yOffset = 60 }) {
  const frame = useCurrentFrame();
  const shift = frame * speed;
  const points = [];
  for (let x = 0; x <= 1920; x += 20) {
    const y = yOffset + Math.sin((x / 300) + shift) * 30 + Math.sin((x / 150) + shift * 1.5) * 15;
    points.push(`${x},${y}`);
  }
  const d = `M0,${1080} L${points.join(" L")} L1920,${1080} Z`;
  return (
    <AbsoluteFill style={{ opacity: 0.04 }}>
      <svg viewBox="0 0 1920 1080" style={{ width: "100%", height: "100%" }}>
        <path d={d} fill={color} />
      </svg>
    </AbsoluteFill>
  );
}

function GlowOrb({ x, y, color, size = 300 }) {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame * 0.008) * 20;
  const dy = Math.cos(frame * 0.006) * 15;
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: "50%", background: color,
      filter: `blur(${size / 2}px)`, opacity: 0.15,
      transform: `translate(${dx}px, ${dy}px)`,
    }} />
  );
}

function ParticleBg() {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 25 }, (_, i) => {
    const x = (i * 137.5 + i * 17) % 100;
    const baseY = (i * 73.3) % 100;
    const size = 2 + (i % 4);
    const speed = 0.15 + (i % 5) * 0.05;
    const yy = (baseY + frame * speed * 0.05) % 110 - 5;
    return (
      <div key={i} style={{
        position: "absolute", left: `${x}%`, top: `${yy}%`,
        width: size, height: size, borderRadius: "50%",
        background: i % 2 === 0 ? K.purple : K.naver, opacity: 0.06,
      }} />
    );
  });
  return <AbsoluteFill style={{ overflow: "hidden" }}>{dots}</AbsoluteFill>;
}

/* ── 스텝 번호 뱃지 ── */
function StepBadge({ num, color = K.purple }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 14,
      background: `${color}20`, border: `2px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20, fontWeight: 900, color,
      flexShrink: 0,
    }}>
      {num}
    </div>
  );
}

/* ── 스크린샷 프레임 (브라우저 목업) ── */
function ScreenFrame({ src, scale = 1, frame, fps, delay = 0.3, maxH = null }) {
  const s = spring({ frame: Math.max(0, frame - delay * fps), fps, config: { damping: 14, stiffness: 80 } });
  return (
    <div style={{
      transform: `scale(${s * scale})`, opacity: s,
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 12px 60px rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.08)",
      maxHeight: maxH || "auto",
    }}>
      <Img src={src} style={{ width: "100%", display: "block" }} />
    </div>
  );
}

/* ── 스크린샷 + 위→아래 스크롤 애니메이션 ── */
function ScrollingScreen({ src, frame, fps, delay = 0.3, height = 500, scrollDur = 8 }) {
  const s = spring({ frame: Math.max(0, frame - delay * fps), fps, config: { damping: 14, stiffness: 80 } });
  const scrollF = Math.max(0, frame - (delay + 1) * fps);
  const scrollY = interpolate(scrollF, [0, scrollDur * fps], [0, -60], { extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: s, transform: `scale(${s})`,
      borderRadius: 16, overflow: "hidden", height,
      boxShadow: "0 12px 60px rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ transform: `translateY(${scrollY}%)` }}>
        <Img src={src} style={{ width: "100%", display: "block" }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 씬 구성 — 13개 나레이션 세그먼트를 6개 씬으로 묶음
// ═══════════════════════════════════════════════

// 씬 1: 키워드 입력 (seg 1-3) — 이미지 1, 2
function SceneBlog01({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color={K.naver} speed={0.025} yOffset={850} />
      <GlowOrb x="20%" y="30%" color={K.naver} size={400} />
      <GlowOrb x="75%" y="55%" color={K.purple} size={350} />
      <ParticleBg />

      <div style={{ display: "flex", alignItems: "center", gap: 56, zIndex: 1, padding: "0 80px", width: "100%" }}>
        {/* 왼쪽: 텍스트 */}
        <div style={{ flex: "0 0 400px" }}>
          <div style={{ ...fadeSlide(frame, fps, "left", 0), display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <StepBadge num="1" color={K.naver} />
            <span style={{ fontSize: 16, color: K.naver, fontWeight: 700, letterSpacing: 2 }}>STEP 01</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.2), fontSize: 48, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
            키워드 입력하고{"\n"}
            <span style={{ color: K.naver }}>제목 선택</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7 }}>
            입력창에 주제를 넣으면{"\n"}AI가 제목 5개를 추천합니다
          </div>
        </div>

        {/* 오른쪽: 스크린샷 — 시차 등장 */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* 1번: 메인 화면 (스크롤) */}
          <ScrollingScreen src={`${IMG}/1.png`} frame={frame} fps={fps} delay={0.3} height={480} scrollDur={12} />
          {/* 2번: 제목 추천 (3초 후 슬라이드 업) */}
          <div style={{
            ...fadeSlide(frame, fps, "up", 3),
            position: "absolute", bottom: -20, right: 20,
            width: 420, borderRadius: 16, overflow: "hidden",
            boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
            border: "2px solid rgba(3,199,90,0.3)",
          }}>
            <Img src={`${IMG}/2.png`} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 씬 2: 설정 (seg 4-7) — 이미지 3
function SceneBlog02({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color={K.purple} speed={0.02} yOffset={830} />
      <GlowOrb x="60%" y="35%" color={K.purple} size={450} />
      <ParticleBg />

      <div style={{ display: "flex", alignItems: "center", gap: 56, zIndex: 1, padding: "0 80px", width: "100%", flexDirection: "row-reverse" }}>
        {/* 오른쪽: 텍스트 */}
        <div style={{ flex: "0 0 420px" }}>
          <div style={{ ...fadeSlide(frame, fps, "right", 0), display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <StepBadge num="2" color={K.purple} />
            <span style={{ fontSize: 16, color: K.purple, fontWeight: 700, letterSpacing: 2 }}>STEP 02</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.2), fontSize: 48, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
            플랫폼, 글타입,{"\n"}
            <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              톤앤매너 설정
            </span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7 }}>
            네이버 블로그 선택 후{"\n"}글톤, 말투, 분량까지 세부 조정
          </div>

          {/* 설정 태그들 */}
          <div style={{ ...fadeSlide(frame, fps, "right", 1), display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            {[
              { label: "네이버 블로그", color: K.naver },
              { label: "정보성 글", color: K.purple },
              { label: "친근 · 정보형", color: K.pink },
              { label: "길게", color: "#f59e0b" },
            ].map((tag, i) => (
              <span key={i} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: `${tag.color}15`, border: `1px solid ${tag.color}30`, color: tag.color,
              }}>{tag.label}</span>
            ))}
          </div>
        </div>

        {/* 왼쪽: 설정 화면 (위→아래 스크롤) */}
        <div style={{ flex: 1 }}>
          <ScrollingScreen src={`${IMG}/3.png`} frame={frame} fps={fps} delay={0.3} height={560} scrollDur={18} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 씬 3: 생성 (seg 8) — 생성 버튼 강조
function SceneBlog03({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin(frame * 0.1) * 0.03 + 1;
  const btnScale = spring({ frame: Math.max(0, frame - 1 * fps), fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color={K.purple} speed={0.03} yOffset={840} />
      <GlowOrb x="50%" y="45%" color={K.purple} size={500} />
      <ParticleBg />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0), display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <StepBadge num="3" color={K.purple} />
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 56, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 16 }}>
          설정 완료,{"\n"}
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            생성 버튼 클릭
          </span>
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.5), fontSize: 22, color: K.muted, marginBottom: 40 }}>
          AI가 자동으로 블로그 글을 작성합니다
        </div>

        {/* 생성 버튼 모의 */}
        <div style={{ transform: `scale(${btnScale * pulse})` }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: K.grad, borderRadius: 16, padding: "24px 56px",
            fontSize: 28, fontWeight: 800, color: K.white,
            boxShadow: "0 8px 40px rgba(124,106,255,0.4)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            생성 30P
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 씬 4: 복사 & 발행 (seg 9) — 이미지 4, 5
function SceneBlog04({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color={K.naver} speed={0.025} yOffset={860} />
      <GlowOrb x="30%" y="40%" color={K.naver} size={400} />
      <ParticleBg />

      <div style={{ display: "flex", alignItems: "center", gap: 56, zIndex: 1, padding: "0 80px", width: "100%" }}>
        <div style={{ flex: "0 0 420px" }}>
          <div style={{ ...fadeSlide(frame, fps, "left", 0), display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <StepBadge num="4" color={K.naver} />
            <span style={{ fontSize: 16, color: K.naver, fontWeight: 700, letterSpacing: 2 }}>STEP 04</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.2), fontSize: 48, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
            복사해서{"\n"}
            <span style={{ color: K.naver }}>바로 발행</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7 }}>
            완성된 글을 복사 → 네이버 에디터에{"\n"}붙여넣기 → 이미지/태그 추가 → 발행
          </div>

          {/* 플로우 */}
          <div style={{ ...fadeSlide(frame, fps, "left", 1), display: "flex", gap: 12, marginTop: 28, alignItems: "center" }}>
            {["복사", "붙여넣기", "발행"].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  padding: "10px 20px", borderRadius: 12, fontSize: 16, fontWeight: 700,
                  background: i === 2 ? "rgba(3,199,90,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${i === 2 ? "rgba(3,199,90,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: i === 2 ? K.naver : K.white,
                }}>{step}</span>
                {i < 2 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 20 }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 생성결과 → 복사 → 발행 순차 표시 */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* 8번: 생성 결과 (스크롤) */}
          <ScrollingScreen src={`${IMG}/8.png`} frame={frame} fps={fps} delay={0.3} height={440} scrollDur={8} />
          {/* 5번: 붙여넣기 Ctrl+V (3초 후) */}
          <div style={{
            ...fadeSlide(frame, fps, "right", 3),
            position: "absolute", top: 20, right: -30,
            width: 220, borderRadius: 14, overflow: "hidden",
            boxShadow: "0 8px 36px rgba(0,0,0,0.6)",
            border: "2px solid rgba(124,106,255,0.3)",
          }}>
            <Img src={`${IMG}/5.png`} style={{ width: "100%", display: "block" }} />
          </div>
          {/* 4번: 네이버 글쓰기 버튼 (5초 후) */}
          <div style={{
            ...fadeSlide(frame, fps, "up", 5),
            position: "absolute", bottom: -10, right: 40,
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 8px 32px rgba(3,199,90,0.3)",
            border: "2px solid rgba(3,199,90,0.3)",
          }}>
            <Img src={`${IMG}/4.png`} style={{ height: 60, display: "block" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 씬 5: 외부 링크 활용 (seg 10-12) — 이미지 6, 7
function SceneBlog05({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color="#06b6d4" speed={0.02} yOffset={840} />
      <GlowOrb x="65%" y="35%" color="#06b6d4" size={400} />
      <GlowOrb x="25%" y="60%" color={K.purple} size={350} />
      <ParticleBg />

      <div style={{ display: "flex", alignItems: "center", gap: 56, zIndex: 1, padding: "0 80px", width: "100%", flexDirection: "row-reverse" }}>
        <div style={{ flex: "0 0 420px" }}>
          <div style={{ ...fadeSlide(frame, fps, "right", 0), display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <StepBadge num="5" color="#06b6d4" />
            <span style={{ fontSize: 16, color: "#06b6d4", fontWeight: 700, letterSpacing: 2 }}>BONUS TIP</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.2), fontSize: 48, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
            외부 링크로{"\n"}
            <span style={{ color: "#06b6d4" }}>더 풍부하게</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7 }}>
            유튜브, 뉴스 링크를 넣으면{"\n"}AI가 분석해서 블로그 글로 변환
          </div>
        </div>

        {/* 왼쪽: 유튜브(3초 후) + 뉴스(6초 후) 순차 등장 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={fadeSlide(frame, fps, "left", 1)}>
            <ScreenFrame src={`${IMG}/6.png`} frame={frame} fps={fps} delay={1} />
          </div>
          <div style={fadeSlide(frame, fps, "left", 4)}>
            <ScreenFrame src={`${IMG}/7.png`} frame={frame} fps={fps} delay={4} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 씬 6: 마무리 CTA (seg 13)
function SceneBlog06({ lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;
  const btnScale = spring({ frame: Math.max(0, frame - 1.5 * fps), fps, config: { damping: 10, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ background: K.gradBg, justifyContent: "center", alignItems: "center" }}>
      <WaveBg color={K.purple} speed={0.03} yOffset={820} />
      <WaveBg color={K.naver} speed={0.02} yOffset={870} />
      <GlowOrb x="45%" y="35%" color={K.purple} size={600} />
      <GlowOrb x="55%" y="55%" color={K.naver} size={400} />
      <ParticleBg />

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.3), fontSize: 56, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
          몇 시간 걸리던 포스팅을{"\n"}
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            몇 분이면 완성
          </span>
        </div>

        <div style={{ transform: `scale(${btnScale * pulse})`, marginTop: 32 }}>
          <div style={{
            display: "inline-block", background: K.grad,
            borderRadius: 18, padding: "22px 64px",
            fontSize: 28, fontWeight: 800, color: K.white,
            boxShadow: "0 8px 40px rgba(124,106,255,0.4)",
          }}>
            지금 시작하기
          </div>
        </div>

        <div style={{
          ...fadeSlide(frame, fps, "up", 2),
          marginTop: 32, fontSize: 44, fontWeight: 900,
          background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          snsmakeit.com
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 나레이션 데이터 & 씬 타이밍
// ═══════════════════════════════════════════════
const BLOG_NARRATION = [
  { id: "blog-01", ko: "먼저 메인 화면 중앙에 있는 입력창에 주제나 키워드를 넣어보세요." },
  { id: "blog-02", ko: "예를 들어 네이버 블로그 잘 쓰는 방법이라고 입력하면, AI가 매력적인 제목 다섯 가지를 바로 추천해 줍니다." },
  { id: "blog-03", ko: "마음에 드는 제목을 클릭하면 바로 다음 단계로 넘어갈 수 있어요." },
  { id: "blog-04", ko: "다음은 설정입니다. 설정 버튼을 눌러서 플랫폼을 네이버 블로그로 선택하고, 글 타입도 정해줍니다." },
  { id: "blog-05", ko: "정보성 글인지, 후기인지, 칼럼인지 선택하면 그에 맞는 톤과 구성으로 글이 만들어집니다." },
  { id: "blog-06", ko: "그리고 글톤과 말투도 조절할 수 있습니다. 친근한 느낌부터 전문적인 느낌까지 브랜드에 맞게 설정할 수 있어요." },
  { id: "blog-07", ko: "분량도 중요한데요, 상위 노출이 목적이라면 길게 혹은 아주 길게로 설정하는 것이 효과적입니다." },
  { id: "blog-08", ko: "모든 설정이 끝나면 생성 버튼 하나만 누르면 됩니다. AI가 자동으로 글을 작성해 줍니다." },
  { id: "blog-09", ko: "완성된 글은 복사해서 네이버 블로그 에디터에 붙여넣기 하면 되고, 이미지와 태그만 추가하면 포스팅이 완료됩니다." },
  { id: "blog-10", ko: "여기서 한 가지 더 알려드리자면, 외부 링크를 활용하면 더 풍부한 글을 만들 수 있습니다." },
  { id: "blog-11", ko: "유튜브 영상이나 뉴스 기사 링크를 넣으면, AI가 해당 내용을 분석해서 블로그 글로 변환해 줍니다." },
  { id: "blog-12", ko: "추가 지시사항 칸에 구체적인 요청을 적으면, 본인만의 맞춤형 결과물도 얻을 수 있어요." },
  { id: "blog-13", ko: "이렇게 하면 매번 몇 시간씩 걸리던 블로그 포스팅을, 몇 분이면 완성할 수 있습니다." },
];

// 씬별 세그먼트 매핑
const BLOG_SCENES = [
  { id: "bs01", segs: ["blog-01", "blog-02", "blog-03"], Component: SceneBlog01 },
  { id: "bs02", segs: ["blog-04", "blog-05", "blog-06", "blog-07"], Component: SceneBlog02 },
  { id: "bs03", segs: ["blog-08"], Component: SceneBlog03 },
  { id: "bs04", segs: ["blog-09"], Component: SceneBlog04 },
  { id: "bs05", segs: ["blog-10", "blog-11", "blog-12"], Component: SceneBlog05 },
  { id: "bs06", segs: ["blog-13"], Component: SceneBlog06 },
];

// TTS 실측 기반 타임스탬프 (91.6초, 구분자 없음)
const BLOG_TIMESTAMPS = {
  "blog-01": { start: 0, end: 4.99 },
  "blog-02": { start: 4.99, end: 13.44 },
  "blog-03": { start: 13.44, end: 18.43 },
  "blog-04": { start: 18.43, end: 25.92 },
  "blog-05": { start: 25.92, end: 32.71 },
  "blog-06": { start: 32.71, end: 41.16 },
  "blog-07": { start: 41.16, end: 48.37 },
  "blog-08": { start: 48.37, end: 55.3 },
  "blog-09": { start: 55.3, end: 63.89 },
  "blog-10": { start: 63.89, end: 70.82 },
  "blog-11": { start: 70.82, end: 78.44 },
  "blog-12": { start: 78.44, end: 85.1 },
  "blog-13": { start: 85.1, end: 91.61 },
};

const BLOG_TOTAL = 95; // 91.6초 + 엔딩 여유

// 씬 타이밍 계산
function getBlogSceneTimings() {
  return BLOG_SCENES.map((scene, i) => {
    const firstSeg = BLOG_TIMESTAMPS[scene.segs[0]];
    const lastSeg = BLOG_TIMESTAMPS[scene.segs[scene.segs.length - 1]];
    const from = firstSeg.start;
    const nextFrom = i < BLOG_SCENES.length - 1
      ? BLOG_TIMESTAMPS[BLOG_SCENES[i + 1].segs[0]].start
      : BLOG_TOTAL;
    return { ...scene, from, dur: nextFrom - from };
  });
}

const BLOG_SCENE_TIMINGS = getBlogSceneTimings();

// ═══════════════════════════════════════════════
// CC 자막
// ═══════════════════════════════════════════════
function BlogCCOverlay({ show = true }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;
  if (!show) return null;

  const sceneIdx = BLOG_SCENE_TIMINGS.findIndex((s, i) => {
    const nextFrom = i < BLOG_SCENE_TIMINGS.length - 1 ? BLOG_SCENE_TIMINGS[i + 1].from : s.from + s.dur;
    return timeSec >= s.from && timeSec < nextFrom;
  });
  if (sceneIdx < 0) return null;

  const scene = BLOG_SCENE_TIMINGS[sceneIdx];
  const sceneSegs = scene.segs.map(id => BLOG_NARRATION.find(n => n.id === id)).filter(Boolean);
  if (!sceneSegs.length) return null;

  const sceneProgress = (timeSec - scene.from) / (scene.dur || 1);
  const segIdx = Math.min(Math.floor(sceneProgress * sceneSegs.length), sceneSegs.length - 1);
  const current = sceneSegs[Math.max(0, segIdx)];

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 5% 48px", pointerEvents: "none", zIndex: 50 }}>
      <div style={{ textAlign: "center", maxWidth: "92%" }}>
        <div style={{
          display: "inline-block", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
          borderRadius: 14, padding: "14px 36px", border: "1px solid rgba(124,106,255,0.12)",
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.5, wordBreak: "keep-all", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {current.ko}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 메인 컴포지션
// ═══════════════════════════════════════════════
export function BlogTutorialComposition({ showCC = true, hasAudio = false }) {
  return (
    <AbsoluteFill style={{ background: K.gradBg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      {BLOG_SCENE_TIMINGS.map((scene, i) => {
        const { Component } = scene;
        const nextFrom = i < BLOG_SCENE_TIMINGS.length - 1 ? BLOG_SCENE_TIMINGS[i + 1].from : scene.from + scene.dur;
        const extDur = nextFrom - scene.from;
        return (
          <Sequence key={scene.id} from={Math.round(scene.from * FPS)} durationInFrames={Math.round(extDur * FPS)}>
            <Component />
          </Sequence>
        );
      })}

      <BlogCCOverlay show={showCC} />
      <Audio src="/tts/bgm-ambient.mp3" volume={0.12} loop />
      {hasAudio && <Audio src="/tts/ko/blog_tutorial_ko.wav" volume={1} />}
    </AbsoluteFill>
  );
}

export const BLOG_TUTORIAL_DURATION = BLOG_TOTAL;
