import { useState, useEffect, useRef } from "react";
import { SecWrap, SecTitle, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";

/* ── 스크롤 감지 훅 ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

/* ── 카운터 애니메이션 ── */
function CountUp({ to, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / (duration / 16));
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(start);
    }, 16);
    return () => clearInterval(t);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── 타이핑 애니메이션 ── */
function TypeWriter({ texts, speed = 60, pause = 2000 }) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const cur = texts[idx];
    if (typing) {
      if (display.length < cur.length) {
        const t = setTimeout(() => setDisplay(cur.slice(0, display.length + 1)), speed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), pause);
        return () => clearTimeout(t);
      }
    } else {
      if (display.length > 0) {
        const t = setTimeout(() => setDisplay(display.slice(0, -1)), speed / 2);
        return () => clearTimeout(t);
      } else {
        setIdx((idx + 1) % texts.length);
        setTyping(true);
      }
    }
  }, [display, typing, idx, texts, speed, pause]);
  return <span>{display}<span style={{ animation: "blink 1s infinite", opacity: 1 }}>|</span></span>;
}

/* ── 페이드인 래퍼 ── */
function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── 페르소나별 탭 ── */
function PersonaTabs({ navigate, C }) {
  const [active, setActive] = useState(0);
  const personas = [
    {
      label: "블로거",
      icon: "N",
      color: "#22c55e",
      title: "블로그 운영이 쉬워져요",
      desc: "SEO 최적화 블로그 글을 3분 만에 자동 생성. 키워드만 입력하면 네이버·티스토리에 바로 올릴 수 있는 고품질 글이 완성됩니다.",
      tools: ["네이버 블로그", "티스토리", "카드뉴스", "실시간 검색어"],
      result: "글 작성 시간 85% 단축",
    },
    {
      label: "마케터",
      icon: "IG",
      color: "#ec4899",
      title: "SNS 마케팅 올인원 솔루션",
      desc: "인스타 캡션, 유튜브 대본, 카드뉴스까지 한 번에. 채널별 최적화된 콘텐츠를 빠르게 생산하고 성과를 분석하세요.",
      tools: ["인스타그램 캡션", "유튜브 대본", "AI 분석기", "숏폼 편집기"],
      result: "콘텐츠 생산량 3배 증가",
    },
    {
      label: "쇼핑몰 사장님",
      icon: "DP",
      color: "#8b5cf6",
      title: "상품 페이지 자동 완성",
      desc: "상세페이지, AI 제품컷, 목업 이미지까지 자동 생성. 모델 촬영 없이도 프로급 상품 이미지를 만들어 매출을 올리세요.",
      tools: ["상세페이지", "AI 제품컷", "AI 모델", "의상 교체"],
      result: "이미지 제작비 70% 절감",
    },
    {
      label: "크리에이터",
      icon: "YT",
      color: "#ef4444",
      title: "영상 콘텐츠 제작 자동화",
      desc: "유튜브 대본 작성부터 숏폼 편집, 썸네일 생성까지. AI가 크리에이터의 콘텐츠 제작 워크플로우를 혁신합니다.",
      tools: ["유튜브 대본", "숏폼 편집기", "AI 로고", "스레드"],
      result: "영상 발행 속도 2배",
    },
  ];
  const p = personas[active];
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
        {personas.map((per, i) => (
          <div key={per.label} className={`persona-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
            style={{ background: i === active ? `${per.color}12` : C.card, color: i === active ? per.color : C.muted }}>
            <span style={{ marginRight: 6 }}>{per.icon}</span>{per.label}
          </div>
        ))}
      </div>
      <FadeIn key={active}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: p.color, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{p.label}</div>
            <h3 style={{ fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 900, color: C.text, lineHeight: 1.3, margin: "0 0 14px" }}>{p.title}</h3>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 20px" }}>{p.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {p.tools.map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 600, color: p.color, background: `${p.color}10`, padding: "5px 12px", borderRadius: 20 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 10, padding: "8px 16px", display: "inline-block" }}>
              ✓ {p.result}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {p.tools.map((t, i) => (
              <div key={t} onClick={() => navigate("ai")} style={{
                background: C.card, border: "1px solid " + C.border, borderRadius: 16,
                padding: "20px 16px", cursor: "pointer", transition: "all 0.25s", boxShadow: C.shadow,
                textAlign: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: p.color, margin: "0 auto 10px" }}>
                  {t[0]}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t}</div>
                <div style={{ fontSize: 11, color: p.color, marginTop: 6, fontWeight: 600 }}>바로 사용 →</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

/* ── 무한 스크롤 마퀴 ── */
function Marquee({ children, speed = 30, reverse = false }) {
  return (
    <div style={{ overflow: "hidden", width: "100%", position: "relative" }}>
      <div style={{
        display: "flex", gap: 48, whiteSpace: "nowrap", willChange: "transform",
        animation: `${reverse ? "marqueeR" : "marqueeL"} ${speed}s linear infinite`,
      }}>
        {children}{children}
      </div>
    </div>
  );
}

export default function HomePage({ navigate, C }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);

  // 실시간 통계 (Supabase에서 posts 수 가져오기)
  const [statsCount, setStatsCount] = useState(5200);
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          import.meta.env.VITE_SUPABASE_URL || "https://ckzjnpzadeovrasucjmu.supabase.co",
          import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs"
        );
        const { count } = await sb.from("posts").select("*", { count: "exact", head: true });
        if (count != null) setStatsCount(Math.max(count, 5200));
      } catch {}
    })();
  }, []);

  /* 배경 그라데이션 (파티클 대신 심플한 그라데이션) */
  const particles = [
    { top: "20%", left: "15%", size: 400, color: "rgba(124,106,255,0.04)", blur: 100 },
  ];

  const ALL_TOOLS = [
    {
      cat: p("catWrite"), catColor: "#7c6aff",
      items: [
        { icon: "N", title: p("tNaver"), desc: p("tNaverD"), tag: p("tagPopular"), color: "#22c55e" },
        { icon: "C", title: p("tCafe"), desc: p("tCafeD"), tag: "", color: "#06b6d4" },
        { icon: "T", title: p("tTistory"), desc: p("tTistoryD"), tag: "", color: "#f59e0b" },
        { icon: "IG", title: p("tInsta"), desc: p("tInstaD"), tag: "", color: "#ec4899" },
        { icon: "YT", title: p("tYoutube"), desc: p("tYoutubeD"), tag: "", color: "#ef4444" },
        { icon: "Th", title: p("tThread"), desc: p("tThreadD"), tag: "", color: "#a855f7" },
      ],
    },
    {
      cat: p("catImage"), catColor: "#8b5cf6",
      items: [
        { icon: "CN", title: p("tCardNews"), desc: p("tCardNewsD"), tag: "", color: "#8b5cf6" },
        { icon: "SC", title: p("tSimpleCard"), desc: p("tSimpleCardD"), tag: "", color: "#7c6aff" },
        { icon: "DP", title: p("tDetail"), desc: p("tDetailD"), tag: "", color: "#ec4899" },
        { icon: "SD", title: p("tSimpleDetail"), desc: p("tSimpleDetailD"), tag: p("tagNew"), color: "#10b981" },
      ],
    },
    {
      cat: p("catAiImg"), catColor: "#ec4899",
      items: [
        { icon: "PS", title: p("tProduct"), desc: p("tProductD"), tag: p("tagPopular"), color: "#f59e0b" },
        { icon: "LG", title: p("tLogo"), desc: p("tLogoD"), tag: "", color: "#7c6aff" },
        { icon: "MK", title: p("tMockup"), desc: p("tMockupD"), tag: "", color: "#8b5cf6" },
        { icon: "MD", title: p("tModel"), desc: p("tModelD"), tag: "", color: "#ec4899" },
        { icon: "FS", title: p("tFace"), desc: p("tFaceD"), tag: "", color: "#10b981" },
        { icon: "OS", title: p("tOutfit"), desc: p("tOutfitD"), tag: "", color: "#f59e0b" },
        { icon: "OP", title: p("tOutpaint"), desc: p("tOutpaintD"), tag: p("tagNew"), color: "#06b6d4" },
      ],
    },
    {
      cat: p("catVideo"), catColor: "#ef4444",
      items: [
        { icon: "SF", title: p("tShorts"), desc: p("tShortsD"), tag: p("tagNew"), color: "#ef4444" },
      ],
    },
    {
      cat: p("catAnalyzer"), catColor: "#22c55e", navTarget: "analyzer",
      items: [
        { icon: "SEO", title: p("tAnalyze"), desc: p("tAnalyzeD"), tag: p("tagNew"), color: "#22c55e" },
        { icon: "TR", title: p("tTrend"), desc: p("tTrendD"), tag: "", color: "#7c6aff" },
        { icon: "RK", title: p("tRanking"), desc: p("tRankingD"), tag: "", color: "#8b5cf6" },
        { icon: "BR", title: p("tBrandRank"), desc: p("tBrandRankD"), tag: "", color: "#06b6d4" },
      ],
    },
  ];

  return (
    <div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes slideRight { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes marqueeL { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes marqueeR { from{transform:translateX(-50%)} to{transform:translateX(0)} }
        @media(max-width:640px){ .hero-particle{display:none!important} }
        .tool-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 48px rgba(124,106,255,0.2) !important; }
        .review-card:hover { transform: translateY(-4px) !important; }
        .stat-card:hover { transform: scale(1.04) !important; }
        .persona-tab { cursor:pointer; padding:10px 22px; border-radius:30px; font-size:14px; font-weight:700; border:1.5px solid transparent; transition:all 0.25s; }
        .persona-tab:hover { transform:translateY(-2px); }
        .persona-tab.active { border-color:rgba(124,106,255,0.5); box-shadow:0 4px 20px rgba(124,106,255,0.15); }
      `}</style>

      {/* ══ 히어로 ══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "clamp(90px,12vw,110px) clamp(16px,4vw,24px) clamp(60px,8vw,80px)",
        textAlign: "center", position: "relative", overflow: "hidden",
        background: C.heroBg,
      }}>
        {particles.map((p, i) => (
          <div key={i} className="hero-particle" style={{
            position: "absolute", width: `min(${p.size}px, 50vw)`, height: `min(${p.size}px, 50vw)`, borderRadius: "50%",
            background: p.color, filter: `blur(${p.blur}px)`, pointerEvents: "none",
            top: p.top, left: p.left, right: p.right,
            animation: `float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * 0.8}s`,
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <div style={{ opacity: 1, transform: "none", animation: "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.purpleL, letterSpacing: 0.5, marginBottom: 12 }}>{p("heroBadge")}</div>
          </div>

          <h1 style={{ fontSize: "clamp(26px,5vw,56px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: -1.5, color: C.text, margin: "0 0 14px" }}>
            <TypeWriter texts={p("heroTyping")} speed={55} pause={2200} />
          </h1>
          <h2 style={{ fontSize: "clamp(20px,3.5vw,42px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: -1, color: C.text, margin: "0 0 28px" }}>
            {p("heroSub1")}
            <span style={{ color: "#7c6aff" }}>
              {p("heroHighlight")}
            </span>
          </h2>
          <p style={{ fontSize: "clamp(14px,1.7vw,18px)", color: C.muted, lineHeight: 1.9, maxWidth: 580, margin: "0 auto 16px" }}>
            {p("heroDesc1")}<br/>
            <b style={{ color: C.purpleL }}>{p("heroDesc2")}</b>{p("heroDesc2b")}<br/>
            <b style={{ color: C.purpleL }}>{p("heroDesc3")}</b>
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 52, marginTop: 36 }}>
            <Btn C={C} onClick={() => navigate("ai")}>{p("heroCta1")}</Btn>
            <Btn C={C} onClick={() => navigate("analyzer")} ghost>AI 분석기</Btn>
          </div>

          {/* 실시간 통계 */}
          <div style={{ display: "flex", gap: "clamp(24px,5vw,52px)", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { val: 25,   suffix: p("statToolsSuffix"), label: p("statTools") },
              { val: statsCount, suffix: p("statContentsSuffix"), label: p("statContents") },
              { val: 3,    suffix: p("statTimeSuffix"),  label: p("statTime") },
            ].map(({ val, suffix, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 800, color: "#7c6aff" }}>
                  <CountUp to={val} suffix={suffix} />
                </div>
                <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: C.muted, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 제품 미리보기 */}
          <div style={{ marginTop: 48, maxWidth: 700, width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(124,106,255,0.15)", border: "1px solid " + C.border }}>
            <img src="/screenshots/ai-home.png" alt="SNS메이킷 AI 생성기" style={{ width: "100%", display: "block" }} />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", opacity: 0.2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </section>

      {/* ══ 신뢰 지표 ══ */}
      <section style={{ padding: "clamp(40px,6vw,64px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 24, textAlign: "center" }}>
          {[
            { val: "5,200+", label: lang === "ko" ? "생성된 콘텐츠" : "Contents created" },
            { val: "20+", label: lang === "ko" ? "AI 도구" : "AI tools" },
            { val: "3분", label: lang === "ko" ? "평균 생성 시간" : "Avg. creation time" },
            { val: "85%", label: lang === "ko" ? "시간 절감" : "Time saved" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: C.text, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ 핵심 기능 벤토 그리드 (아임웹/Cutback 스타일) ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
            {lang === "ko" ? "시작부터 성장까지 쉬워집니다" : "Easy from start to growth"}
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
            {lang === "ko" ? "20가지 AI 도구로 SNS 콘텐츠 제작의 모든 과정을 자동화하세요." : "Automate every step of SNS content creation with 20+ AI tools."}
          </p>
        </div>

        {/* 벤토 그리드 - Cutback 스타일 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
          {/* 글쓰기 - 대형 카드 */}
          <FadeIn style={{ gridColumn: "span 1" }}>
            <div onClick={() => navigate("ai")} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>{lang === "ko" ? "SNS 글쓰기" : "SNS Writing"}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "키워드만 입력하면\nAI가 글을 완성해요" : "Just enter keywords,\nAI completes the article"}
                </h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                  {lang === "ko" ? "네이버 블로그, 인스타, 유튜브 대본까지 6개 플랫폼 지원" : "Supports 6 platforms including Naver Blog, Instagram, YouTube"}
                </p>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 20px 20px" }}>
                <img src="/screenshots/blog-writer.png" alt="블로그 글쓰기 UI" style={{ width: "100%", borderRadius: "12px 12px 0 0", display: "block", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }} />
              </div>
            </div>
          </FadeIn>

          {/* 카드뉴스/상세페이지 */}
          <FadeIn delay={0.1} style={{ gridColumn: "span 1" }}>
            <div onClick={() => navigate("ai")} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", marginBottom: 8 }}>{lang === "ko" ? "콘텐츠 제작" : "Content Creation"}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "카드뉴스, 상세페이지를\n자동으로 디자인해요" : "Auto-design card news\nand detail pages"}
                </h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                  {lang === "ko" ? "주제만 입력하면 슬라이드 기획부터 디자인까지 AI가 완성" : "AI handles everything from slide planning to design"}
                </p>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 20px 20px" }}>
                <img src="/screenshots/cardnews.png" alt="카드뉴스 제작 UI" style={{ width: "100%", borderRadius: "12px 12px 0 0", display: "block", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }} />
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 하단 3열 소형 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 16, marginTop: 16 }}>
          {[
            { title: lang === "ko" ? "AI 이미지 생성" : "AI Image Generation", desc: lang === "ko" ? "제품컷, 로고, 목업, AI 모델 생성" : "Product shots, logos, mockups, AI models", color: "#ec4899", items: "7" },
            { title: lang === "ko" ? "이미지 수정" : "Image Editing", desc: lang === "ko" ? "얼굴 교체, 의상 교체, 여백 확장" : "Face swap, outfit change, outpainting", color: "#f59e0b", items: "3" },
            { title: lang === "ko" ? "영상 편집" : "Video Editing", desc: lang === "ko" ? "숏폼 자동 편집, 자막 추가" : "Auto shorts editing, subtitles", color: "#ef4444", items: "1" },
            { title: lang === "ko" ? "SEO 분석기" : "SEO Analyzer", desc: lang === "ko" ? "실시간 검색어, 인플루언서 랭킹" : "Trending keywords, influencer rankings", color: "#22c55e", items: "4" },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div onClick={() => navigate(f.color === "#22c55e" ? "analyzer" : "ai")} style={{
                background: C.card, border: "1px solid " + C.border, borderRadius: 16,
                padding: "24px 20px", cursor: "pointer", transition: "all 0.25s", height: "100%",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: f.color }}>{f.items}</div>
                  <div style={{ fontSize: 11, color: f.color, fontWeight: 700 }}>{f.items}{lang === "ko" ? "개 도구" : " tools"}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ marginTop: 14, fontSize: 12, color: f.color, fontWeight: 700 }}>{lang === "ko" ? "바로 사용하기" : "Try now"} →</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ 페르소나별 활용 사례 ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge="Use Cases" title={lang === "ko" ? "이런 분들이 사용합니다" : "Made for every creator"} sub={lang === "ko" ? "업종별 맞춤 활용법을 확인하세요." : "Discover tailored solutions for your industry."} />
        <PersonaTabs navigate={navigate} C={C} lang={lang} />
      </SecWrap>

      {/* ══ 이렇게 만들어져요 ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
              {lang === "ko" ? "이렇게 만들어져요" : "See how it works"}
            </h2>
            <p style={{ fontSize: 15, color: C.muted }}>
              {lang === "ko" ? "키워드 입력부터 완성까지, 실제 화면을 확인하세요." : "From keyword input to completion, see the actual process."}
            </p>
          </div>

          {/* Feature 1: 글쓰기 - 좌 텍스트 / 우 이미지 */}
          <FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 40, alignItems: "center", marginBottom: 64 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", letterSpacing: 1, marginBottom: 10 }}>AI WRITING</div>
                <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.text, lineHeight: 1.3, margin: "0 0 16px" }}>
                  {lang === "ko" ? "블로그 글, 3분이면 완성" : "Blog posts, done in 3 minutes"}
                </h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 24px" }}>
                  {lang === "ko" ? "키워드만 입력하면 SEO에 최적화된 블로그 글이 자동으로 작성됩니다. 네이버, 티스토리, 인스타, 유튜브 대본까지 6개 플랫폼을 지원해요." : "Enter keywords and get SEO-optimized blog posts automatically. Supports 6 platforms."}
                </p>
                <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "글쓰기 시작" : "Start writing"}</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid " + C.border, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
                  <img src="/screenshots/blog-result.png" alt="AI 블로그 글 생성 결과" style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{lang === "ko" ? "실제 AI가 작성한 블로그 글" : "Actual blog post written by AI"}</div>
              </div>
            </div>
          </FadeIn>

          {/* Feature 2: 카드뉴스 - 우 텍스트 / 좌 이미지 (reversed) */}
          <FadeIn delay={0.1}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 40, alignItems: "center", marginBottom: 64 }}>
              <div style={{ order: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid " + C.border, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
                    <img src="/screenshots/cardnews-plan.png" alt="AI 카드뉴스 기획 결과" style={{ width: "100%", display: "block" }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{lang === "ko" ? "AI가 자동 기획한 카드뉴스 슬라이드" : "Card news slides auto-planned by AI"}</div>
                </div>
              </div>
              <div style={{ order: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", letterSpacing: 1, marginBottom: 10 }}>CONTENT CREATION</div>
                <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.text, lineHeight: 1.3, margin: "0 0 16px" }}>
                  {lang === "ko" ? "카드뉴스, 주제만 입력하세요" : "Card news, just enter a topic"}
                </h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 24px" }}>
                  {lang === "ko" ? "AI가 슬라이드를 기획하고 디자인까지 완성해요. 카드뉴스, 상세페이지, 썸네일까지 한 번에 만들 수 있어요." : "AI plans slides and completes the design. Create card news, detail pages, and thumbnails at once."}
                </p>
                <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "콘텐츠 만들기" : "Create content"}</Btn>
              </div>
            </div>
          </FadeIn>

          {/* Feature 3: 이미지 수정 - 좌 텍스트 / 우 이미지 */}
          <FadeIn delay={0.2}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 40, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 10 }}>IMAGE AI</div>
                <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, color: C.text, lineHeight: 1.3, margin: "0 0 16px" }}>
                  {lang === "ko" ? "AI로 이미지를 자유롭게" : "Edit images freely with AI"}
                </h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 24px" }}>
                  {lang === "ko" ? "제품컷, 로고, 목업, AI 모델 생성은 물론 얼굴 교체, 의상 교체, 여백 채우기까지. 10가지 이미지 도구가 한 곳에." : "Product shots, logos, mockups, AI models, face swap, outfit change, and more. 10 image tools in one place."}
                </p>
                <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "이미지 도구 보기" : "View image tools"}</Btn>
              </div>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid " + C.border, boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}>
                <img src="/screenshots/image-edit.png" alt="이미지 수정" style={{ width: "100%", display: "block" }} />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 실사용 후기 ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge={p("reviewBadge")} title={p("reviewTitle")} sub={p("reviewSub")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {[
            { name: p("r1name"), job: p("r1job"), avatar: "K", rating: 5, platform: p("r1plat"), text: p("r1text"), result: p("r1result") },
            { name: p("r2name"), job: p("r2job"), avatar: "L", rating: 5, platform: p("r2plat"), text: p("r2text"), result: p("r2result") },
            { name: p("r3name"), job: p("r3job"), avatar: "P", rating: 5, platform: p("r3plat"), text: p("r3text"), result: p("r3result") },
            { name: p("r4name"), job: p("r4job"), avatar: "C", rating: 5, platform: p("r4plat"), text: p("r4text"), result: p("r4result") },
            { name: p("r5name"), job: p("r5job"), avatar: "J", rating: 5, platform: p("r5plat"), text: p("r5text"), result: p("r5result") },
            { name: p("r6name"), job: p("r6job"), avatar: "H", rating: 5, platform: p("r6plat"), text: p("r6text"), result: p("r6result") },
          ].map((r, i) => (
            <FadeIn key={r.name} delay={i * 0.08}>
              <div className="review-card" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 12, boxShadow: C.shadow, transition: "all 0.25s" }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array(r.rating).fill(0).map((_, j) => (
                    <span key={j} style={{ fontSize: 12, color: "#f59e0b" }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.8, margin: 0, flex: 1 }}>
                  "{r.text}"
                </p>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 8, padding: "4px 10px", display: "inline-block" }}>
                  ✓ {r.result}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8, borderTop: "1px solid " + C.border }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(124,106,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.purpleL, flexShrink: 0 }}>{r.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{r.job}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 10, color: C.purpleL, fontWeight: 600, background: "rgba(124,106,255,0.08)", padding: "3px 8px", borderRadius: 6 }}>{r.platform}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ SNS 자동 발행 ══ */}
      <section style={{ padding: "clamp(80px,12vw,120px) clamp(16px,4vw,24px)", position: "relative", overflow: "hidden",
        background: C.isDark ? "linear-gradient(180deg, #0f0c29 0%, #1a1145 50%, #0f0c29 100%)" : "linear-gradient(180deg, #f8f8fb 0%, #eee8ff 50%, #f8f8fb 100%)" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "min(600px,80vw)", height: "min(600px,80vw)", borderRadius: "50%", background: "rgba(124,106,255,0.06)", filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
          <FadeIn>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Auto Publish</div>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.2, margin: "0 0 16px" }}>
              {lang === "ko" ? <>글 작성부터 SNS 발행까지<br/><span style={{ color: "#7c6aff" }}>원클릭</span>으로 끝</> : <>From writing to publishing<br/>in <span style={{ color: "#7c6aff" }}>one click</span></>}
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, margin: "0 auto 40px", maxWidth: 560 }}>
              {lang === "ko" ? "AI가 작성한 글을 복사-붙여넣기 없이 바로 발행하세요. 계정 연결 한 번이면 스레드·블로그·티스토리에 자동 업로드됩니다." : "Publish AI-written content without copy-paste. Connect once, auto-upload to Threads, Blog, and Tistory."}
            </p>
          </FadeIn>

          {/* 플로우 시각화 */}
          <FadeIn delay={0.1}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(8px,2vw,20px)", flexWrap: "wrap", marginBottom: 48 }}>
              {[
                { step: "1", label: lang === "ko" ? "주제 입력" : "Enter topic", icon: "T" },
                { step: "", label: "", icon: "→" },
                { step: "2", label: lang === "ko" ? "AI 글 생성" : "AI writes", icon: "AI" },
                { step: "", label: "", icon: "→" },
                { step: "3", label: lang === "ko" ? "원클릭 발행" : "One-click publish", icon: "V" },
              ].map((s, i) => s.step ? (
                <div key={i} style={{ width: "clamp(80px,15vw,120px)", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: i === 4 ? "linear-gradient(135deg,#7c6aff,#ec4899)" : (C.isDark ? "rgba(255,255,255,0.06)" : "rgba(124,106,255,0.08)"), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20, fontWeight: 900, color: i === 4 ? "#fff" : "#7c6aff" }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.label}</div>
                </div>
              ) : (
                <div key={i} style={{ fontSize: 20, color: C.muted, fontWeight: 300 }}>→</div>
              ))}
            </div>
          </FadeIn>

          {/* 플랫폼 카드 */}
          <FadeIn delay={0.2}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 16, maxWidth: 860, margin: "0 auto 40px" }}>
              {[
                { icon: "/icon-threads.png", name: lang === "ko" ? "스레드" : "Threads", desc: lang === "ko" ? "글 작성 후 원클릭 자동 발행" : "Auto publish after writing", color: "#7c6aff", tag: lang === "ko" ? "자동 발행" : "Auto", tagColor: "#7c6aff" },
                { icon: "/icon-naver-blog.png", name: lang === "ko" ? "네이버 블로그" : "Naver Blog", desc: lang === "ko" ? "복사 + 에디터 바로 열기" : "Copy + open editor", color: "#03C75A", tag: lang === "ko" ? "간편 발행" : "Easy", tagColor: "#4ade80" },
                { icon: "/icon-tistory.png", name: lang === "ko" ? "티스토리" : "Tistory", desc: lang === "ko" ? "복사 + 에디터 바로 열기" : "Copy + open editor", color: "#FF6B35", tag: lang === "ko" ? "간편 발행" : "Easy", tagColor: "#4ade80" },
                { icon: "/icon-instagram.webp", name: lang === "ko" ? "인스타그램" : "Instagram", desc: lang === "ko" ? "카드뉴스 이미지 자동 발행" : "Card news auto publish", color: "#E1306C", tag: lang === "ko" ? "곧 출시" : "Coming", tagColor: "#f59e0b" },
              ].map(p => (
                <div key={p.name} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "28px 20px", textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${p.color}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: p.color + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <img src={p.icon} alt="" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{p.desc}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: p.tagColor + "15", color: p.tagColor }}>{p.tag}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <Btn C={C} onClick={() => navigate("ai")} style={{ fontSize: 16, padding: "14px 36px" }}>
              {lang === "ko" ? "지금 바로 시작하기" : "Get started now"} →
            </Btn>
          </FadeIn>
        </div>
      </section>

      {/* ══ 포인트 적립 시스템 ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 40, alignItems: "center" }}>
            <FadeIn>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c6aff", letterSpacing: 1, marginBottom: 10 }}>POINT SYSTEM</div>
                <h2 style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, color: C.text, lineHeight: 1.3, margin: "0 0 16px" }}>
                  {lang === "ko" ? "매일 무료 포인트를\n쌓을 수 있어요" : "Earn free points\nevery day"}
                </h2>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 28px", whiteSpace: "pre-line" }}>
                  {lang === "ko" ? "출석체크, 게시글 작성, 댓글 활동으로 포인트를 적립하세요.\n적립한 포인트로 AI 도구를 무료로 이용할 수 있어요." : "Earn points through daily check-in, posting, and commenting.\nUse earned points to access AI tools for free."}
                </p>
                <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "포인트 적립 시작" : "Start earning"}</Btn>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { title: lang === "ko" ? "매일 출석체크" : "Daily check-in", point: "+3P", desc: lang === "ko" ? "하루 한 번 출석만 해도" : "Just check in once a day", color: "#7c6aff" },
                  { title: lang === "ko" ? "게시글 작성" : "Write a post", point: "+1P", desc: lang === "ko" ? "커뮤니티 글 작성 시" : "When posting in community", color: "#22c55e" },
                  { title: lang === "ko" ? "회원가입 보너스" : "Sign-up bonus", point: "+200P", desc: lang === "ko" ? "가입 즉시 지급" : "Instant upon sign-up", color: "#ec4899" },
                  { title: lang === "ko" ? "비회원 무료" : "Guest free trial", point: "10" + (lang === "ko" ? "회" : "x"), desc: lang === "ko" ? "로그인 없이 체험" : "Try without login", color: "#f59e0b" },
                ].map(item => (
                  <div key={item.title} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 18px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.point}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ 포인트/요금 안내 ══ */}
      <SecWrap C={C}>
        <SecTitle C={C} badge={p("priceBadge")} title={p("priceTitle")} sub={p("priceSub")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 14 }}>
          {[
            { icon: "FREE", title: p("p1title"), point: p("p1point"), desc: p("p1desc"), color: "#888", btnText: p("p1btn"), onClick: () => navigate("ai") },
            { icon: "+200P", title: p("p2title"), point: p("p2point"), desc: p("p2desc"), color: "#22c55e", btnText: p("p2btn"), onClick: () => navigate("ai") },
            { icon: "5,900", title: p("p3title"), point: p("p3point"), desc: p("p3desc"), color: "#7c6aff", btnText: p("p3btn"), onClick: () => navigate("pricing"), highlight: false },
            { icon: "PRO", title: p("p4title"), point: p("p4point"), desc: p("p4desc"), color: "#8b5cf6", btnText: p("p4btn"), onClick: () => navigate("pricing"), highlight: true },
          ].map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.1}>
              <div className="stat-card" style={{
                background: p.highlight ? "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))" : C.card,
                border: p.highlight ? "2px solid rgba(99,102,241,0.4)" : "1px solid " + C.border,
                borderRadius: 20, padding: "26px 20px", textAlign: "center",
                boxShadow: p.highlight ? "0 8px 32px rgba(99,102,241,0.15)" : C.shadow,
                transition: "all 0.2s", cursor: "default",
                position: "relative", overflow: "hidden",
              }}>
                {p.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", padding: "3px 12px", borderRadius: "0 0 8px 8px" }}>{getPageText(lang,"recommend")}</div>}
                <div style={{ fontSize: 14, fontWeight: 900, color: p.color, marginBottom: 10, letterSpacing: -0.5 }}>{p.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: p.color, marginBottom: 8 }}>{p.point}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</div>
                <button onClick={p.onClick} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: p.highlight ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "rgba(124,106,255,0.1)", color: p.highlight ? "#fff" : C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {p.btnText}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ CTA ══ */}
      <section style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,24px)", textAlign: "center", position: "relative", overflow: "hidden", background: C.ctaBg }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(500px, 70vw)", height: "min(500px, 70vw)", borderRadius: "50%", background: "rgba(124,106,255,0.04)", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.purpleL, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>{lang === "ko" ? "무료로 시작하세요" : "Start free now"}</div>
          <h2 style={{ fontSize: "clamp(24px,4.5vw,44px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, lineHeight: 1.2, margin: "0 0 20px" }}>
            {p("ctaTitle1")}<br/>
            <span style={{ color: "#7c6aff" }}>
              {p("ctaHighlight")}
            </span>
          </h2>
          <p style={{ fontSize: "clamp(14px,1.6vw,17px)", color: C.muted, lineHeight: 1.9, marginBottom: 40, whiteSpace: "pre-line" }}>
            {p("ctaDesc")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>{p("ctaBtn1")}</Btn>
            <Btn C={C} onClick={() => navigate("about")} ghost>{p("ctaBtn2")}</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}
