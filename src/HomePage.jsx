import { useState, useEffect, useRef } from "react";
import { Badge, SecWrap, SecTitle, Btn } from "./UI";
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

  /* 떠다니는 배경 파티클 */
  const particles = [
    { top: "12%", left: "8%",  size: 320, color: "rgba(124,106,255,0.07)", blur: 70 },
    { top: "60%", right: "6%", size: 260, color: "rgba(236,72,153,0.06)",  blur: 60 },
    { top: "30%", left: "55%", size: 200, color: "rgba(99,102,241,0.05)",  blur: 50 },
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
        @media(max-width:640px){ .hero-particle{display:none!important} }
        .tool-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 48px rgba(124,106,255,0.2) !important; }
        .review-card:hover { transform: translateY(-4px) !important; }
        .stat-card:hover { transform: scale(1.04) !important; }
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
            <Badge C={C}>{p("heroBadge")}</Badge>
          </div>

          <h1 style={{ fontSize: "clamp(28px,5.5vw,66px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -2, color: C.text, margin: "0 0 12px" }}>
            <TypeWriter texts={p("heroTyping")} speed={55} pause={2200} />
          </h1>
          <h2 style={{ fontSize: "clamp(22px,4vw,52px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, color: C.text, margin: "0 0 28px" }}>
            {p("heroSub1")}
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
                <div style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  <CountUp to={val} suffix={suffix} />
                </div>
                <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: C.muted, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: C.muted, fontSize: 10, opacity: 0.4 }}>
          <div style={{ width: 1, height: 36, background: "linear-gradient(to bottom,transparent,rgba(124,106,255,0.5))" }} />
          SCROLL
        </div>
      </section>

      {/* ══ AI 도구 소개 (카테고리별) ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge={p("toolsBadge")} title={p("toolsTitle")} sub={p("toolsSub")} />
        {ALL_TOOLS.map((cat, ci) => (
          <div key={cat.cat} style={{ marginBottom: ci < ALL_TOOLS.length - 1 ? 36 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: cat.catColor }}>{cat.cat}</div>
              <div style={{ flex: 1, height: 1, background: `${cat.catColor}30` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(150px,100%),1fr))", gap: 12 }}>
              {cat.items.map((tool, i) => (
                <FadeIn key={tool.title} delay={i * 0.06}>
                  <div className="tool-card" onClick={() => navigate(cat.navTarget || "ai")}
                    style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 16px", cursor: "pointer", position: "relative", transition: "all 0.25s", boxShadow: C.shadow, height: "100%" }}>
                    {tool.tag && (
                      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 800, background: tool.color, color: "#fff", padding: "2px 7px", borderRadius: 7 }}>{tool.tag}</div>
                    )}
                    <div style={{ width:36, height:36, borderRadius:10, background:`${tool.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:tool.color, marginBottom:10, letterSpacing:-0.5 }}>{tool.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 6 }}>{tool.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{tool.desc}</div>
                    <div style={{ marginTop: 12, fontSize: 11, color: tool.color, fontWeight: 700 }}>{p("toolUse")}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        ))}
      </SecWrap>

      {/* ══ 사용 방법 (3단계) ══ */}
      <SecWrap C={C}>
        <SecTitle C={C} badge={p("howBadge")} title={p("howTitle")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 20 }}>
          {[
            { step: "01", title: p("how1"), desc: p("how1d"), color: "#7c6aff" },
            { step: "02", title: p("how2"), desc: p("how2d"), color: "#8b5cf6" },
            { step: "03", title: p("how3"), desc: p("how3d"), color: "#ec4899" },
          ].map((s, i) => (
            <FadeIn key={s.step} delay={i * 0.15}>
              <div style={{ position: "relative", background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 24px", boxShadow: C.shadow, overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 72, fontWeight: 900, color: s.color, opacity: 0.06, fontFamily: "monospace", lineHeight: 1 }}>{s.step}</div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: s.color, marginBottom: 18 }}>{s.step}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: 1.5, marginBottom: 8 }}>STEP {s.step}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{s.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ 실사용 후기 ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge={p("reviewBadge")} title={p("reviewTitle")} sub={p("reviewSub")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 16 }}>
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
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,rgba(124,106,255,0.2),rgba(236,72,153,0.15))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.avatar}</div>
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

      {/* ══ 차별점 ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge={p("whyBadge")} title={p("whyTitle")} sub={p("whySub")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 12 }}>
          {[
            { icon: "01", title: p("w1"), desc: p("w1d") },
            { icon: "02", title: p("w2"), desc: p("w2d") },
            { icon: "03", title: p("w3"), desc: p("w3d") },
            { icon: "04", title: p("w4"), desc: p("w4d") },
          ].map((d, i) => (
            <FadeIn key={d.title} delay={i * 0.1}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 20px", boxShadow: C.shadow, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,rgba(124,106,255,0.15),rgba(236,72,153,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: C.purpleL, flexShrink: 0 }}>{d.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{d.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.75 }}>{d.desc}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ CTA ══ */}
      <section style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,24px)", textAlign: "center", position: "relative", overflow: "hidden", background: C.ctaBg }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(600px, 80vw)", height: "min(600px, 80vw)", borderRadius: "50%", background: "rgba(124,106,255,0.07)", filter: "blur(80px)", pointerEvents: "none", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <Badge C={C}>{p("ctaBadge")}</Badge>
          <h2 style={{ fontSize: "clamp(26px,5vw,54px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.15, margin: "0 0 20px" }}>
            {p("ctaTitle1")}<br/>
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
