import { useState, useEffect } from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Sequence, Img, Audio,
} from "remotion";
import { LANGUAGES } from "./narration-data.js";

// ── 블로그 튜토리얼 다국어 사전 ──
const BLOG_DICT = {
  // 씬1
  blog_s1_step: { ko: "STEP 01", en: "STEP 01", ja: "STEP 01", zh: "STEP 01", es: "PASO 01" },
  blog_s1_title1: { ko: "키워드 입력하고", en: "Enter a keyword", ja: "キーワードを入力して", zh: "输入关键词", es: "Ingresa una palabra clave" },
  blog_s1_title2: { ko: "제목 선택", en: "Pick a title", ja: "タイトルを選択", zh: "选择标题", es: "Elige un titulo" },
  blog_s1_desc: { ko: "입력창에 주제를 넣으면\nAI가 제목 5개를 추천합니다", en: "Type a topic and\nAI suggests 5 titles", ja: "入力欄にテーマを入れると\nAIが5つのタイトルを提案", zh: "输入主题后\nAI会推荐5个标题", es: "Escribe un tema y\nla IA sugiere 5 titulos" },
  // 씬2
  blog_s2_title1: { ko: "플랫폼, 글타입,", en: "Platform, type,", ja: "プラットフォーム、タイプ、", zh: "平台、类型、", es: "Plataforma, tipo," },
  blog_s2_title2: { ko: "톤앤매너 설정", en: "Tone & style setup", ja: "トーン＆スタイル設定", zh: "风格设置", es: "Configurar tono y estilo" },
  blog_s2_desc: { ko: "네이버 블로그 선택 후\n글톤, 말투, 분량까지 세부 조정", en: "Select Naver Blog, then\nfine-tune tone, style, and length", ja: "ネイバーブログを選択後\n文体や分量を細かく調整", zh: "选择Naver博客后\n细调文风、语气和篇幅", es: "Selecciona Naver Blog, luego\najusta tono, estilo y extension" },
  // 씬3
  blog_s3_title1: { ko: "설정 완료,", en: "Setup done,", ja: "設定完了、", zh: "设置完成，", es: "Configuracion lista," },
  blog_s3_title2: { ko: "생성 버튼 클릭", en: "Click Generate", ja: "生成ボタンをクリック", zh: "点击生成按钮", es: "Haz clic en Generar" },
  blog_s3_desc: { ko: "AI가 자동으로 블로그 글을 작성합니다", en: "AI automatically writes the blog post", ja: "AIが自動でブログ記事を作成します", zh: "AI自动撰写博客文章", es: "La IA escribe automaticamente la publicacion" },
  // 씬4
  blog_s4_title1: { ko: "복사해서", en: "Copy and", ja: "コピーして", zh: "复制后", es: "Copia y" },
  blog_s4_title2: { ko: "바로 발행", en: "Publish now", ja: "すぐ発行", zh: "立即发布", es: "Publica ahora" },
  blog_s4_desc: { ko: "완성된 글을 복사 → 네이버 에디터에\n붙여넣기 → 이미지/태그 추가 → 발행", en: "Copy the result → Paste in\nNaver editor → Add images/tags → Publish", ja: "完成した記事をコピー → ネイバーエディターに\n貼り付け → 画像/タグ追加 → 発行", zh: "复制结果 → 粘贴到\nNaver编辑器 → 添加图片/标签 → 发布", es: "Copia el resultado → Pega en\nel editor Naver → Agrega imagenes/tags → Publica" },
  blog_s4_copy: { ko: "복사", en: "Copy", ja: "コピー", zh: "复制", es: "Copiar" },
  blog_s4_paste: { ko: "붙여넣기", en: "Paste", ja: "貼り付け", zh: "粘贴", es: "Pegar" },
  blog_s4_publish: { ko: "발행", en: "Publish", ja: "発行", zh: "发布", es: "Publicar" },
  // 씬5
  blog_s5_title1: { ko: "외부 링크로", en: "With external links,", ja: "外部リンクで", zh: "通过外部链接", es: "Con enlaces externos," },
  blog_s5_title2: { ko: "더 풍부하게", en: "Make it richer", ja: "もっと豊かに", zh: "更加丰富", es: "Hazlo mas rico" },
  blog_s5_desc: { ko: "유튜브, 뉴스 링크를 넣으면\nAI가 분석해서 블로그 글로 변환", en: "Add YouTube or news links and\nAI converts them into blog posts", ja: "YouTubeやニュースリンクを入れると\nAIが分析してブログ記事に変換", zh: "添加YouTube或新闻链接\nAI分析后转换为博客文章", es: "Agrega enlaces de YouTube o noticias y\nla IA los convierte en publicaciones" },
  // 씬6 CTA
  blog_cta_pre: { ko: "쉬운 SNS의 시작", en: "The easy start to SNS", ja: "簡単なSNSのスタート", zh: "轻松开启SNS之旅", es: "El inicio facil en redes sociales" },
  blog_cta_line1: { ko: "SNS메이킷과", en: "Start with", ja: "SNSメイキットと", zh: "和SNS MakeIt", es: "Comienza con" },
  blog_cta_line2: { ko: "함께하세요", en: "SNS MakeIt", ja: "一緒に始めましょう", zh: "一起开始吧", es: "SNS MakeIt" },
  blog_cta_btn: { ko: "지금 시작하기", en: "Get Started", ja: "今すぐ始める", zh: "立即开始", es: "Empieza Ahora" },
};

function T(key, lang = "ko") {
  return BLOG_DICT[key]?.[lang] || BLOG_DICT[key]?.ko || key;
}

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
            <span style={{ fontSize: 16, color: K.naver, fontWeight: 700, letterSpacing: 2 }}>{T("blog_s1_step", lang)}</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.2), fontSize: 48, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 20 }}>
            {T("blog_s1_title1", lang)}{"\n"}
            <span style={{ color: K.naver }}>{T("blog_s1_title2", lang)}</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {T("blog_s1_desc", lang)}
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
            {T("blog_s2_title1", lang)}{"\n"}
            <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {T("blog_s2_title2", lang)}
            </span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {T("blog_s2_desc", lang)}
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
          {T("blog_s3_title1", lang)}{"\n"}
          <span style={{ background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {T("blog_s3_title2", lang)}
          </span>
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.5), fontSize: 22, color: K.muted, marginBottom: 40 }}>
          {T("blog_s3_desc", lang)}
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
            생성 1회
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
            {T("blog_s4_title1", lang)}{"\n"}
            <span style={{ color: K.naver }}>{T("blog_s4_title2", lang)}</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "left", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {T("blog_s4_desc", lang)}
          </div>

          {/* 플로우 */}
          <div style={{ ...fadeSlide(frame, fps, "left", 1), display: "flex", gap: 12, marginTop: 28, alignItems: "center" }}>
            {[T("blog_s4_copy", lang), T("blog_s4_paste", lang), T("blog_s4_publish", lang)].map((step, i) => (
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
            {T("blog_s5_title1", lang)}{"\n"}
            <span style={{ color: "#06b6d4" }}>{T("blog_s5_title2", lang)}</span>
          </div>
          <div style={{ ...fadeSlide(frame, fps, "right", 0.5), fontSize: 20, color: K.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {T("blog_s5_desc", lang)}
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
        <div style={{ ...fadeSlide(frame, fps, "up", 0.2), fontSize: 28, color: K.muted, fontWeight: 600, marginBottom: 16 }}>
          {T("blog_cta_pre", lang)}
        </div>
        <div style={{ ...fadeSlide(frame, fps, "up", 0.4), fontSize: 56, fontWeight: 900, color: K.white, lineHeight: 1.3, marginBottom: 8 }}>
          {T("blog_cta_line1", lang)}
        </div>
        <div style={{
          ...fadeSlide(frame, fps, "up", 0.6), fontSize: 56, fontWeight: 900, lineHeight: 1.3,
          background: K.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {T("blog_cta_line2", lang)}
        </div>

        <div style={{ transform: `scale(${btnScale * pulse})`, marginTop: 36 }}>
          <div style={{
            display: "inline-block", background: K.grad,
            borderRadius: 18, padding: "22px 64px",
            fontSize: 28, fontWeight: 800, color: K.white,
            boxShadow: "0 8px 40px rgba(124,106,255,0.4)",
          }}>
            {T("blog_cta_btn", lang)}
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
  { id: "blog-01", ko: "먼저 메인 화면 중앙에 있는 입력창에 주제나 키워드를 넣어보세요.", en: "First, enter a topic or keyword in the input field at the center of the main screen.", ja: "まずメイン画面中央の入力欄にテーマやキーワードを入力してください。", zh: "首先在主页面中央的输入框中输入主题或关键词。", es: "Primero, ingresa un tema o palabra clave en el campo de entrada del centro de la pantalla principal." },
  { id: "blog-02", ko: "예를 들어 네이버 블로그 잘 쓰는 방법이라고 입력하면, AI가 매력적인 제목 다섯 가지를 바로 추천해 줍니다.", en: "For example, type 'How to write a great Naver blog post' and AI will instantly suggest five attractive titles.", ja: "例えば「ネイバーブログの書き方」と入力すると、AIが魅力的なタイトルを5つすぐに提案してくれます。", zh: "比如输入'如何写好Naver博客'，AI会立即推荐五个吸引人的标题。", es: "Por ejemplo, escribe 'Como escribir un buen post en Naver' y la IA sugerira cinco titulos atractivos al instante." },
  { id: "blog-03", ko: "마음에 드는 제목을 클릭하면 바로 다음 단계로 넘어갈 수 있어요.", en: "Click a title you like and move right on to the next step.", ja: "気に入ったタイトルをクリックすると、すぐ次のステップに進めます。", zh: "点击喜欢的标题就可以进入下一步。", es: "Haz clic en el titulo que te guste y pasa directamente al siguiente paso." },
  { id: "blog-04", ko: "다음은 설정입니다. 설정 버튼을 눌러서 플랫폼을 네이버 블로그로 선택하고, 글 타입도 정해줍니다.", en: "Next is settings. Press the settings button to select Naver Blog as the platform and choose your post type.", ja: "次は設定です。設定ボタンを押してプラットフォームをネイバーブログに選び、記事タイプも決めます。", zh: "接下来是设置。点击设置按钮选择Naver博客平台，并确定文章类型。", es: "Lo siguiente es la configuracion. Presiona el boton de ajustes para seleccionar Naver Blog como plataforma y elige el tipo de publicacion." },
  { id: "blog-05", ko: "정보성 글인지, 후기인지, 칼럼인지 선택하면 그에 맞는 톤과 구성으로 글이 만들어집니다.", en: "Choose whether it's informational, a review, or a column, and the post will be crafted with the right tone and structure.", ja: "情報系か、レビューか、コラムかを選ぶと、それに合ったトーンと構成で記事が作られます。", zh: "选择是信息类、评测还是专栏，文章会按相应的风格和结构生成。", es: "Elige si es informativo, una resena o una columna, y la publicacion se creara con el tono y estructura adecuados." },
  { id: "blog-06", ko: "그리고 글톤과 말투도 조절할 수 있습니다. 친근한 느낌부터 전문적인 느낌까지 브랜드에 맞게 설정할 수 있어요.", en: "You can also adjust the writing tone and style — from friendly to professional, tailored to your brand.", ja: "そして文体や話し方も調整できます。親しみやすさから専門的な感じまで、ブランドに合わせて設定可能です。", zh: "还可以调整文风和语气，从亲切到专业，根据品牌需求设置。", es: "Tambien puedes ajustar el tono y estilo de escritura, desde amigable hasta profesional, adaptado a tu marca." },
  { id: "blog-07", ko: "분량도 중요한데요, 상위 노출이 목적이라면 길게 혹은 아주 길게로 설정하는 것이 효과적입니다.", en: "Length matters too — if you want top search rankings, setting it to 'long' or 'very long' is effective.", ja: "分量も大事で、上位表示が目的なら「長め」か「とても長め」に設定するのが効果的です。", zh: "篇幅也很重要，如果目标是搜索排名靠前，设置为'长'或'很长'会更有效。", es: "La extension tambien importa — si buscas aparecer en los primeros resultados, configurar 'largo' o 'muy largo' es efectivo." },
  { id: "blog-08", ko: "모든 설정이 끝나면 생성 버튼 하나만 누르면 됩니다. AI가 자동으로 글을 작성해 줍니다.", en: "Once all settings are done, just press the Generate button. AI will write the post automatically.", ja: "すべての設定が終わったら、生成ボタンを一つ押すだけです。AIが自動で記事を書いてくれます。", zh: "所有设置完成后，只需点击生成按钮，AI会自动撰写文章。", es: "Una vez que toda la configuracion este lista, solo presiona el boton Generar. La IA escribira la publicacion automaticamente." },
  { id: "blog-09", ko: "완성된 글은 복사해서 네이버 블로그 에디터에 붙여넣기 하면 되고, 이미지와 태그만 추가하면 포스팅이 완료됩니다.", en: "Copy the finished post, paste it into Naver Blog editor, add images and tags, and your post is done.", ja: "完成した記事をコピーしてネイバーブログエディターに貼り付け、画像とタグを追加すれば投稿完了です。", zh: "复制完成的文章，粘贴到Naver博客编辑器，添加图片和标签就完成了。", es: "Copia la publicacion terminada, pegala en el editor de Naver Blog, agrega imagenes y etiquetas, y tu publicacion esta lista." },
  { id: "blog-10", ko: "여기서 한 가지 더 알려드리자면, 외부 링크를 활용하면 더 풍부한 글을 만들 수 있습니다.", en: "One more tip — using external links can make your posts even richer.", ja: "もう一つお伝えすると、外部リンクを活用するとより豊かな記事が作れます。", zh: "再告诉你一个技巧——利用外部链接可以让文章更加丰富。", es: "Un consejo mas — usar enlaces externos puede hacer tus publicaciones aun mas ricas." },
  { id: "blog-11", ko: "유튜브 영상이나 뉴스 기사 링크를 넣으면, AI가 해당 내용을 분석해서 블로그 글로 변환해 줍니다.", en: "Add a YouTube video or news article link, and AI will analyze it and convert it into a blog post.", ja: "YouTube動画やニュース記事のリンクを入れると、AIがその内容を分析してブログ記事に変換してくれます。", zh: "添加YouTube视频或新闻文章链接，AI会分析内容并转换为博客文章。", es: "Agrega un enlace de video de YouTube o articulo de noticias, y la IA lo analizara y convertira en una publicacion de blog." },
  { id: "blog-12", ko: "추가 지시사항 칸에 구체적인 요청을 적으면, 본인만의 맞춤형 결과물도 얻을 수 있어요.", en: "Write specific requests in the additional instructions field to get customized results just for you.", ja: "追加指示欄に具体的なリクエストを書けば、自分だけのカスタマイズ結果を得ることもできます。", zh: "在附加说明栏写入具体要求，就能获得专属的定制结果。", es: "Escribe solicitudes especificas en el campo de instrucciones adicionales para obtener resultados personalizados." },
  { id: "blog-13", ko: "이렇게 하면 매번 몇 시간씩 걸리던 블로그 포스팅을, 몇 분이면 완성할 수 있습니다. 쉬운 SNS의 시작, SNS메이킷과 함께하세요.", en: "Blog posts that used to take hours can now be done in minutes. The easy start to SNS — start with SNS MakeIt.", ja: "何時間もかかっていたブログ投稿が数分で完成。簡単なSNSのスタート、SNSメイキットと一緒に。", zh: "以前需要几个小时的博客文章，现在几分钟就能完成。轻松开启SNS之旅，和SNS MakeIt一起开始吧。", es: "Las publicaciones que tomaban horas ahora se completan en minutos. El inicio facil en redes sociales — comienza con SNS MakeIt." },
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

// TTS 실측 기반 타임스탬프 (93.5초)
const BLOG_TIMESTAMPS = {
  "blog-01": { start: 0, end: 4.89 },
  "blog-02": { start: 4.89, end: 13.19 },
  "blog-03": { start: 13.19, end: 18.08 },
  "blog-04": { start: 18.08, end: 25.42 },
  "blog-05": { start: 25.42, end: 32.08 },
  "blog-06": { start: 32.08, end: 40.38 },
  "blog-07": { start: 40.38, end: 47.45 },
  "blog-08": { start: 47.45, end: 54.24 },
  "blog-09": { start: 54.24, end: 62.67 },
  "blog-10": { start: 62.67, end: 69.47 },
  "blog-11": { start: 69.47, end: 76.95 },
  "blog-12": { start: 76.95, end: 83.47 },
  "blog-13": { start: 83.47, end: 93.53 },
};

const BLOG_TOTAL = 97; // 93.5초 + 엔딩 여유

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
function BlogCCOverlay({ lang = "ko", show = true }) {
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
            {current[lang] || current.ko}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════
// 메인 컴포지션
// ═══════════════════════════════════════════════
export function BlogTutorialComposition({ lang = "ko", showCC = true, hasAudio = false }) {
  return (
    <AbsoluteFill style={{ background: K.gradBg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      {BLOG_SCENE_TIMINGS.map((scene, i) => {
        const { Component } = scene;
        const nextFrom = i < BLOG_SCENE_TIMINGS.length - 1 ? BLOG_SCENE_TIMINGS[i + 1].from : scene.from + scene.dur;
        const extDur = nextFrom - scene.from;
        return (
          <Sequence key={scene.id} from={Math.round(scene.from * FPS)} durationInFrames={Math.round(extDur * FPS)}>
            <Component lang={lang} />
          </Sequence>
        );
      })}

      <BlogCCOverlay lang={lang} show={showCC} />
      <Audio src="/tts/bgm-ambient.mp3" volume={0.12} loop />
      {hasAudio && <Audio src={`/tts/${lang}/blog_tutorial_${lang}.wav`} volume={1} />}
    </AbsoluteFill>
  );
}

export const BLOG_TUTORIAL_DURATION = BLOG_TOTAL;
