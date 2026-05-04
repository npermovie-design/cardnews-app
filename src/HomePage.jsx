import { useState, useEffect, useRef } from "react";
import { Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

/* ── 팔레트 (CSS 변수 테마 기반) ── */
const P = "#3b82f6";
const PBG = "#e0f2fe";
const PBDR = "#bfdbfe";
const ACC = "#34C759";
const ACCBG = "#E8FBF0";
const TEXT = "#333333";
const SUB = "#4b5563";
const MUTED = "#6b7280";
const BDR = "#e5e7eb";
const BG = "#ffffff";
const BG2 = "#f9fafb";
const DARK = "#1A1A2E";
const DARK2 = "#2a2a42";

/* ── hooks ── */
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return [ref, v];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, v] = useInView();
  const n = typeof IntersectionObserver === "undefined";
  const s = n || v;
  return <div ref={ref} style={{ opacity: s ? 1 : 0, transform: s ? "none" : "translateY(20px)", transition: n ? "none" : `opacity .5s ease ${delay}s, transform .5s ease ${delay}s`, ...style }}>{children}</div>;
}

function Counter({ end, suffix = "" }) {
  const [ref, v] = useInView();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!v) return;
    const num = parseInt(end) || 0;
    if (!num) { setVal(end); return; }
    let c = 0;
    const step = Math.ceil(num / 50);
    const t = setInterval(() => { c += step; if (c >= num) { setVal(num); clearInterval(t); } else setVal(c); }, 20);
    return () => clearInterval(t);
  }, [v]);
  return <span ref={ref}>{typeof val === "number" ? val : end}{suffix}</span>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid " + BDR }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", fontSize: 17, fontWeight: 600, color: TEXT, textAlign: "left", gap: 16, fontFamily: "inherit", lineHeight: 1.4 }}>
        <span>{q}</span>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}><path d="M5 7.5L10 12.5L15 7.5" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        <div style={{ padding: "0 0 20px", fontSize: 16, color: SUB, lineHeight: 1.6 }}>{a}</div>
      </div>
    </div>
  );
}

/* ── 3D 궤도 회전 SNS 아이콘 배경 ── */
const ORBIT_ICONS = [
  // 궤도 0 (안쪽) — 4개, 90도 간격
  { src: "/icon-naver-blog.png", orbit: 0, angle: 0, size: 48 },
  { src: "/icon-instagram.svg", orbit: 0, angle: 90, size: 46 },
  { src: "/icon-youtube.png", orbit: 0, angle: 180, size: 48 },
  { src: "/icon-x.svg", orbit: 0, angle: 270, size: 44 },
  // 궤도 1 (중간) — 5개, 72도 간격
  { src: "/icon-threads.png", orbit: 1, angle: 0, size: 42 },
  { src: "/icon-linkedin.svg", orbit: 1, angle: 72, size: 40 },
  { src: "/icon-tistory.png", orbit: 1, angle: 144, size: 38 },
  { src: "/icon-facebook.svg", orbit: 1, angle: 216, size: 40 },
  { src: "/icon-discord.svg", orbit: 1, angle: 288, size: 38 },
  // 궤도 2 (바깥) — 5개, 72도 간격 (36도 오프셋)
  { src: "/icon-naver-cafe.webp", orbit: 2, angle: 36, size: 36 },
  { src: "/icon-tiktok.svg", orbit: 2, angle: 108, size: 34 },
  { src: "/icon-youtube.png", orbit: 2, angle: 180, size: 36 },
  { src: "/icon-instagram.svg", orbit: 2, angle: 252, size: 34 },
  { src: "/icon-naver-blog.png", orbit: 2, angle: 324, size: 32 },
];

function OrbitIconsBg() {
  const orbitRadii = [280, 400, 520];
  const orbitSpeeds = [50, 70, 90]; // seconds per revolution
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0,
      perspective: "1200px",
    }}>
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%) rotateX(55deg)",
        transformStyle: "preserve-3d",
      }}>
        {[0, 1, 2].map(oi => (
          <div key={oi} style={{
            position: "absolute", top: 0, left: 0,
            width: 0, height: 0,
            animation: `hp-orbit-spin ${orbitSpeeds[oi]}s linear infinite`,
            transformStyle: "preserve-3d",
          }}>
            {/* 궤도 링 */}
            <div style={{
              position: "absolute",
              top: -orbitRadii[oi], left: -orbitRadii[oi],
              width: orbitRadii[oi] * 2, height: orbitRadii[oi] * 2,
              borderRadius: "50%",
              border: "1px solid rgba(59,130,246,0.12)",
              pointerEvents: "none",
            }}/>
            {ORBIT_ICONS.filter(ic => ic.orbit === oi).map((ic, i) => {
              const rad = (ic.angle * Math.PI) / 180;
              const x = Math.cos(rad) * orbitRadii[oi];
              const y = Math.sin(rad) * orbitRadii[oi];
              return (
                <div key={i} style={{
                  position: "absolute",
                  left: x - ic.size / 2,
                  top: y - ic.size / 2,
                  width: ic.size, height: ic.size,
                  animation: `hp-orbit-counter ${orbitSpeeds[oi]}s linear infinite`,
                  transformStyle: "preserve-3d",
                }}>
                  <div style={{
                    width: "100%", height: "100%",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(59,130,246,0.12)",
                    boxShadow: "0 8px 32px rgba(59,130,246,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: "rotateX(-55deg)",
                  }}>
                    <img src={ic.src} alt="" style={{ width: "55%", height: "55%", borderRadius: 6, objectFit: "contain" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* 글로우 블롭 */}
      <div style={{ position: "absolute", right: "-10%", top: "-10%", width: "35%", height: "35%", borderRadius: "50%", background: "rgba(59,130,246,0.12)", filter: "blur(120px)", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", left: "-8%", bottom: "-15%", width: "30%", height: "30%", borderRadius: "50%", background: "rgba(52,199,89,0.08)", filter: "blur(100px)", pointerEvents: "none" }}/>
    </div>
  );
}

/* ── 세로 자동 스크롤 후기 v2 (testimonial-v2 변환) ── */
function TestimonialColumn({ items, duration = 18, reverse = false, style = {}, className = "" }) {
  return (
    <div className={className} style={{ overflow: "hidden", ...style }}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 20, paddingBottom: 20,
        animation: `hp-scroll-y ${duration}s linear infinite${reverse ? " reverse" : ""}`,
      }}>
        {[...items, ...items].map((t, i) => (
          <div key={i} style={{
            padding: "28px 24px", borderRadius: 20,
            border: "1px solid " + BDR, background: BG,
            minWidth: 260, maxWidth: 300,
            transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
            cursor: "default",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03) translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <p style={{ fontSize: 14, color: SUB, lineHeight: 1.65, margin: "0 0 18px" }}>{t.text}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(t.name || "user" + i)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt="" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "#f0f0f0" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: -0.3 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ navigate, C, theme, user, onLoginRequest, setAiMenu }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);
  const ko = lang === "ko";

  const [statsCount, setStatsCount] = useState(0);
  useEffect(() => {
    (async () => { try { const { count } = await supabase.from("posts").select("*", { count: "exact", head: true }); if (count != null) setStatsCount(count); } catch {} })();
  }, []);

  const goAi = () => navigate("ai");
  const goPrice = () => navigate("pricing");

  // 실시간 가입자 수 + 최근 가입자
  const [userCount, setUserCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { count, error: cErr } = await supabase.from("users").select("*", { count: "exact", head: true });
        if (!cErr && count != null) setUserCount(count);
        const { data, error: dErr } = await supabase.from("users").select("nick").order("created_at", { ascending: false }).limit(5);
        if (!dErr && data) setRecentUsers(data);
      } catch {}
    })();
    // 실시간 구독 — 새 가입자 감지
    const channel = supabase.channel("user-count").on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, (payload) => {
      setUserCount(c => c + 1);
      setRecentUsers(prev => [payload.new, ...prev].slice(0, 5));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);


  return (
    <div style={{ fontFamily: "'Pretendard Variable','Pretendard',-apple-system,system-ui,sans-serif" }}>
      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes hp-scroll-y{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}
        @keyframes hp-icon-float{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-10px) rotate(3deg)}50%{transform:translateY(-4px) rotate(-2deg)}75%{transform:translateY(-12px) rotate(1deg)}}
        @keyframes hp-orbit-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes hp-orbit-counter{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}
        @keyframes hp-logo-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .hp-logo-track{display:flex;gap:32px;animation:hp-logo-scroll 20s linear infinite;width:max-content}
        .hp-logo-track:hover{animation-play-state:paused}
        .mq-wrap{overflow:hidden}.mq-inner{display:flex;gap:10px;animation:marquee 28s linear infinite;width:max-content}.mq-inner:hover{animation-play-state:paused}
        @keyframes hp-float1{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-14px) rotate(2deg)}}
        @keyframes hp-float2{0%,100%{transform:translateY(0) rotate(1deg)}50%{transform:translateY(-10px) rotate(-2deg)}}
        @keyframes hp-float3{0%,100%{transform:translateY(0) rotate(2deg)}50%{transform:translateY(-18px) rotate(-1deg)}}
        @keyframes hp-float4{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes hp-pulse{0%,100%{opacity:.3}50%{opacity:.5}}
        .mobile-sticky-cta{display:none}
        .hp-float-icon{position:absolute;pointer-events:none;z-index:1}
        @media(max-width:768px){
          .hp-hero-inner{flex-direction:column!important;gap:36px!important;text-align:center!important}
          .hp-hero-btns{justify-content:center!important}
          .hp-hero-visual{max-width:420px!important;margin:0 auto!important}
          .hp-float-icon{display:none!important}
          .hp-row{flex-direction:column!important}
          .hp-row-reverse{flex-direction:column!important}
          .hp-row .hp-row-img,.hp-row-reverse .hp-row-img{max-width:100%!important;width:100%!important}
          .hp-row .hp-row-text,.hp-row-reverse .hp-row-text{max-width:100%!important;width:100%!important}
          .hp-g2{grid-template-columns:1fr!important}
          .hp-g3{grid-template-columns:1fr!important}
          .hp-tc-hide-md{display:none!important}
          .hp-tc-hide-sm{display:none!important}
          .hp-g4{grid-template-columns:1fr 1fr!important}
          .hp-stats{grid-template-columns:repeat(2,1fr)!important}
          .mobile-sticky-cta{display:flex!important}
          .hp-sec{padding-left:20px!important;padding-right:20px!important}
        }
        @media(max-width:480px){
          .hp-hero-inner h1{font-size:28px!important}
          .hp-g4{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ══════ HERO — PulseFit 스타일 ══════ */}
      <section style={{ position: "relative", overflow: "hidden", minHeight: "90vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #E8F0FF 0%, #F5F9FF 50%, #fff 100%)" }}>
        {/* 3D 궤도 아이콘 배경 */}
        <OrbitIconsBg />
        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(120px,16vw,180px) 20px clamp(40px,6vw,60px)", textAlign: "center", position: "relative", zIndex: 10 }}>
          <h1 style={{ fontSize: "clamp(38px,7vw,72px)", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 24px", maxWidth: 700 }}>
            {ko ? <>대표님들의<br/>SNS 발행 파트너</> : <>Your SNS<br/>publishing partner</>}
          </h1>
          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: "#4a5568", lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 520 }}>
            {ko ? "AI가 블로그, 인스타, 쇼츠까지 만들어 드립니다. SNS, 지금 당장 시작해보세요." : "AI creates blog, Instagram, and Shorts. Start your SNS right now."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={goAi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 500, padding: "16px 36px", borderRadius: 99, border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "transform .15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {ko ? "무료로 시작하기" : "Start free"}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={goPrice} style={{ fontSize: 18, fontWeight: 500, padding: "16px 36px", borderRadius: 99, border: "1px solid #cbd5e0", background: "transparent", color: "#1a1a1a", cursor: "pointer", fontFamily: "inherit", transition: "transform .15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >{ko ? "요금 알아보기" : "See pricing"}</button>
          </div>
          <p style={{ fontSize: 13, color: "#718096", fontStyle: "italic", marginBottom: 28 }}>
            {ko ? "*카드 등록 없이 무료로 시작" : "*No credit card required"}
          </p>
          {/* 소셜 프루프 — 실시간 가입자 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {(recentUsers.length > 0 ? recentUsers : [{nick:"김"},{nick:"박"},{nick:"이"},{nick:"최"},{nick:"정"}]).slice(0, 5).map((u, i) => (
                <img key={i} src={`https://api.dicebear.com/9.x/notionists/svg?seed=${u.nick || "user" + i}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt="" style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid #fff", marginLeft: i > 0 ? -8 : 0, background: "#f0f0f0" }} />
              ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#4a5568" }}>
              {ko ? `${Math.max(userCount, 100).toLocaleString()}+ 대표님이 사용 중` : `${Math.max(userCount, 100).toLocaleString()}+ users joined`}
            </span>
          </div>
        </div>

        {/* 하단 프로그램 카드 캐러셀 */}
        <div style={{ position: "relative", width: "100%", overflow: "hidden", padding: "40px 0 60px", zIndex: 10 }}>
          {/* 좌우 페이드 */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(90deg, #fff, transparent)", zIndex: 2, pointerEvents: "none" }}/>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(270deg, #fff, transparent)", zIndex: 2, pointerEvents: "none" }}/>
          <style>{`@keyframes hp-hero-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.hp-hero-cards{display:flex;gap:20px;animation:hp-hero-scroll 30s linear infinite;width:max-content}.hp-hero-cards:hover{animation-play-state:paused}`}</style>
          <div className="hp-hero-cards" style={{ paddingLeft: 20 }}>
            {[
              { img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=520&fit=crop", cat: ko ? "블로그" : "BLOG", title: ko ? "AI 블로그 글쓰기" : "AI Blog Writing" },
              { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=520&fit=crop", cat: ko ? "인스타그램" : "INSTAGRAM", title: ko ? "인스타 캡션 자동 생성" : "Auto Instagram Captions" },
              { img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=520&fit=crop", cat: ko ? "쇼츠" : "SHORTS", title: ko ? "유튜브 쇼츠 제작" : "YouTube Shorts Creator" },
              { img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=520&fit=crop", cat: ko ? "키워드" : "KEYWORDS", title: ko ? "실시간 트렌드 분석" : "Real-time Trend Analysis" },
              { img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400&h=520&fit=crop", cat: ko ? "발행" : "PUBLISH", title: ko ? "SNS 자동 발행" : "Auto SNS Publishing" },
              { img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=520&fit=crop", cat: ko ? "카드뉴스" : "CARD NEWS", title: ko ? "카드뉴스 자동 제작" : "Auto Card News" },
              { img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=520&fit=crop", cat: ko ? "블로그" : "BLOG", title: ko ? "AI 블로그 글쓰기" : "AI Blog Writing" },
              { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=520&fit=crop", cat: ko ? "인스타그램" : "INSTAGRAM", title: ko ? "인스타 캡션 자동 생성" : "Auto Instagram Captions" },
              { img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=520&fit=crop", cat: ko ? "쇼츠" : "SHORTS", title: ko ? "유튜브 쇼츠 제작" : "YouTube Shorts Creator" },
              { img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=520&fit=crop", cat: ko ? "키워드" : "KEYWORDS", title: ko ? "실시간 트렌드 분석" : "Real-time Trend Analysis" },
              { img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400&h=520&fit=crop", cat: ko ? "발행" : "PUBLISH", title: ko ? "SNS 자동 발행" : "Auto SNS Publishing" },
              { img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=520&fit=crop", cat: ko ? "카드뉴스" : "CARD NEWS", title: ko ? "카드뉴스 자동 제작" : "Auto Card News" },
            ].map((card, i) => (
              <div key={i} onClick={goAi} style={{ flexShrink: 0, width: 300, height: 400, borderRadius: 24, overflow: "hidden", position: "relative", cursor: "pointer", transition: "transform .3s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04) translateY(-8px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}
              >
                <img src={card.img} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 100%)" }}/>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{card.cat}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{card.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 실적 (liveklass 스타일 스탯 바) ══════ */}
      <section style={{ padding: "40px clamp(20px,5vw,32px)", background: BG, borderBottom: "1px solid " + BDR }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="hp-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, textAlign: "center" }}>
            {[
              { num: 92, suffix: "%", label: ko ? "시간 절약" : "Time saved" },
              { num: 20, suffix: "+", label: ko ? "지원 플랫폼" : "Platforms" },
              { num: 320, suffix: "+", label: ko ? "실시간 키워드" : "Keywords" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: TEXT, letterSpacing: -1 }}>
                  <Counter end={s.num} suffix={s.suffix}/>
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 플랫폼 아이콘 자동 스크롤 (logos3 변환) ══════ */}
      <section style={{ padding: "32px 0", background: BG, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ overflow: "hidden" }}>
            <div className="hp-logo-track">
              {[
                { src: "/icon-naver-blog.png", name: "네이버 블로그" },
                { src: "/icon-instagram.svg", name: "Instagram" },
                { src: "/icon-youtube.png", name: "YouTube" },
                { src: "/icon-threads.png", name: "Threads" },
                { src: "/icon-tistory.png", name: "Tistory" },
                { src: "/icon-naver-blog.png", name: "네이버 카페" },
                { src: "/icon-instagram.svg", name: "Instagram" },
                { src: "/icon-youtube.png", name: "YouTube" },
                { src: "/icon-threads.png", name: "Threads" },
                { src: "/icon-tistory.png", name: "Tistory" },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: BG2, border: "1px solid " + BDR, flexShrink: 0 }}>
                  <img src={p.src} alt="" style={{ width: 20, height: 20, borderRadius: 5 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: SUB, whiteSpace: "nowrap" }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", inset: "0", left: 0, width: 60, background: `linear-gradient(to right, ${BG}, transparent)`, pointerEvents: "none" }}/>
          <div style={{ position: "absolute", inset: "0", right: 0, left: "auto", width: 60, background: `linear-gradient(to left, ${BG}, transparent)`, pointerEvents: "none" }}/>
        </div>
      </section>

      {/* ══════ 주요 기능 — 탭 전환 (Feature108 스타일) ══════ */}
      {(() => {
        const tabs = [
          { id: "write", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>, label: ko ? "AI 글쓰기" : "AI Writing",
            badge: "HOT", title: ko ? "블로그, SNS 글을 한 번에 완성" : "Blog & SNS posts created together",
            desc: ko ? "키워드 하나만 입력하면 네이버 블로그, 인스타그램, 스레드, 유튜브 대본까지 AI가 자동으로 만들어 줍니다." : "One keyword generates drafts for Naver blog, Instagram, Threads, and YouTube scripts.",
            btn: ko ? "AI 글쓰기 시작" : "Start AI writing", onClick: goAi,
            visual: <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid " + BDR }}><img src="/hero-writing.png" alt="" style={{ width: "100%", display: "block" }} loading="lazy" /></div>,
          },
          { id: "shorts", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><polygon points="10,8 15,12 10,16" fill="currentColor" stroke="none"/></svg>, label: ko ? "쇼츠 제작" : "Shorts",
            badge: "NEW", title: ko ? "쇼츠 제작부터 자동 발행까지" : "Shorts creation to auto-publishing",
            desc: ko ? "유튜브 링크 하나로 쇼츠를 자동 생성하고, YouTube, Instagram, TikTok에 원클릭으로 발행하세요." : "Create shorts from YouTube, publish to YouTube, Instagram, TikTok with one click.",
            btn: ko ? "쇼츠 만들기" : "Create Shorts", onClick: () => { goAi(); setAiMenu && setAiMenu("sns_publish"); },
            visual: <div style={{ borderRadius: 16, background: DARK, aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center", color: "#fff" }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px" }}><rect x="3" y="5" width="18" height="14" rx="4" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8.5 15,12 10,15.5" fill="#fff"/></svg><div style={{ fontSize: 14, fontWeight: 600 }}>{ko ? "유튜브 링크 -> 쇼츠 자동 생성" : "YouTube -> Auto Shorts"}</div></div></div>,
          },
          { id: "keyword", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>, label: ko ? "키워드 분석" : "Keywords",
            title: ko ? "오늘 뜨는 키워드로 바로 글쓰기" : "Write with today's trending keywords",
            desc: ko ? "네이버와 구글에서 실시간으로 수집한 320개 이상의 트렌드 키워드를 확인하고, 바로 콘텐츠를 만드세요." : "320+ trending keywords from Naver & Google.",
            btn: ko ? "키워드 확인하기" : "Check keywords", onClick: goAi,
            visual: <div style={{ borderRadius: 16, padding: 24, background: PBG, border: "1px solid " + PBDR }}><div style={{ fontSize: 13, fontWeight: 600, color: P, marginBottom: 12 }}>{ko ? "실시간 트렌드 키워드" : "Trending now"}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(ko ? ["AI 마케팅","블로그 수익화","인스타 릴스","유튜브 쇼츠","SNS 자동화","네이버 상위노출","부업 추천","뷰티 트렌드"] : ["AI Marketing","Blog Monetize","Insta Reels","YouTube Shorts","SNS Automation","SEO Tips","Side Hustle","Beauty"]).map((t, i) => <span key={i} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, background: i < 2 ? P : "#fff", color: i < 2 ? "#fff" : TEXT, fontWeight: 600, border: i < 2 ? "none" : "1px solid " + BDR }}>{t}</span>)}</div></div>,
          },
        ];
        const [activeTab, setActiveTab] = useState(tabs[0].id);
        const active = tabs.find(t => t.id === activeTab) || tabs[0];
        return (
          <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
            <div style={{ maxWidth: 1140, margin: "0 auto" }}>
              <Reveal>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: P, background: PBG, padding: "4px 14px", borderRadius: 20, marginBottom: 16 }}>
                    {ko ? "주요 기능" : "Key Features"}
                  </span>
                  <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.2 }}>
                    {ko ? "SNS 운영에 필요한 모든 것" : "Everything for SNS management"}
                  </h2>
                  <p style={{ fontSize: 16, color: SUB }}>{ko ? "탭을 눌러 각 기능을 확인하세요." : "Click each tab to explore features."}</p>
                </div>
              </Reveal>

              {/* 탭 버튼 */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14,
                    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                    background: activeTab === tab.id ? PBG : "transparent",
                    color: activeTab === tab.id ? P : MUTED,
                    transition: "all .2s",
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* 탭 콘텐츠 */}
              <div style={{ background: BG2, borderRadius: 24, padding: "clamp(24px,4vw,48px)" }}>
                <div className="hp-row" style={{ display: "flex", gap: "clamp(24px,4vw,48px)", alignItems: "center" }}>
                  <div className="hp-row-text" style={{ flex: "1 1 50%", minWidth: 0 }}>
                    {active.badge && <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff", background: P, padding: "4px 12px", borderRadius: 20, marginBottom: 16 }}>{active.badge}</span>}
                    <h3 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.25 }}>{active.title}</h3>
                    <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 28px" }}>{active.desc}</p>
                    <button onClick={active.onClick} style={{
                      position: "relative", overflow: "hidden",
                      fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 24,
                      border: `1px solid ${P}30`, background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                    }}>{active.btn}</button>
                  </div>
                  <div className="hp-row-img" style={{ flex: "1 1 50%", minWidth: 0 }}>
                    {active.visual}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ══════ 이미지 아코디언 (interactive-image-accordion 스타일) ══════ */}
      {(() => {
        const [accIdx, setAccIdx] = useState(0);
        const accItems = [
          { title: ko ? "AI 글쓰기" : "AI Writing", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "쇼츠 제작" : "Shorts", img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "키워드 분석" : "Keywords", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "자동 발행" : "Publish", img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "카드뉴스" : "Card News", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=800&fit=crop&q=80" },
        ];
        return (
          <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG2 }}>
            <div style={{ maxWidth: 1140, margin: "0 auto" }}>
              <div className="hp-row" style={{ display: "flex", gap: "clamp(32px,5vw,56px)", alignItems: "center" }}>
                {/* 왼쪽 텍스트 */}
                <div className="hp-row-text" style={{ flex: "1 1 45%", minWidth: 0 }}>
                  <Reveal>
                    <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: TEXT, letterSpacing: -1, margin: "0 0 16px", lineHeight: 1.15 }}>
                      {ko ? <>SNS 운영의 모든 것,<br/>하나의 플랫폼에서</> : <>Everything for SNS,<br/>in one platform</>}
                    </h2>
                    <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 28px", maxWidth: 380 }}>
                      {ko ? "글쓰기, 영상, 키워드, 발행까지. 복잡한 도구 없이 하나로 해결하세요." : "Writing, video, keywords, publishing. All in one."}
                    </p>
                    <button onClick={goAi} style={{
                      position: "relative", overflow: "hidden",
                      fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 24,
                      border: `1px solid ${P}30`, background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                    }}>{ko ? "무료로 시작하기" : "Get started free"}</button>
                  </Reveal>
                </div>
                {/* 오른쪽 아코디언 */}
                <div className="hp-row-img" style={{ flex: "1 1 55%", minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, height: 440, alignItems: "stretch" }}>
                    {accItems.map((item, i) => (
                      <div key={i} onMouseEnter={() => setAccIdx(i)} style={{
                        position: "relative", borderRadius: 16, overflow: "hidden", cursor: "pointer",
                        flex: accIdx === i ? "4 1 0" : "0.5 1 0",
                        transition: "flex 0.5s cubic-bezier(0.4,0,0.2,1)",
                        minWidth: 0,
                      }}>
                        <img src={item.img} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}/>
                        <span style={{
                          position: "absolute", color: "#fff", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap",
                          transition: "all .3s",
                          ...(accIdx === i
                            ? { bottom: 20, left: "50%", transform: "translateX(-50%) rotate(0deg)" }
                            : { bottom: 80, left: "50%", transform: "translateX(-50%) rotate(90deg)" }),
                        }}>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ══════ Features Grid (features-9 스타일) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(64px,10vw,96px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div className="hp-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid " + BDR, borderRadius: 0 }}>
            {/* 왼쪽: Before → SNS 마케팅 현황 */}
            <Reveal>
              <div style={{ padding: "clamp(24px,4vw,48px)", borderBottom: "1px solid " + BDR }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, marginBottom: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {ko ? "기존 SNS 운영 방식" : "Traditional SNS workflow"}
                </div>
                <h3 style={{ fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 700, color: TEXT, lineHeight: 1.3, marginBottom: 24 }}>
                  {ko ? <>매일 2시간씩 소모되는<br/>반복 작업들</> : <>Repetitive tasks<br/>consuming 2hrs daily</>}
                </h3>
                {(ko ? ["키워드 조사 30분+","블로그 1시간 + SEO 별도","채널마다 따로 작성","쇼츠 편집 반나절"] : ["30min+ keyword research","1hr blog + separate SEO","Write per channel","Half-day shorts editing"]).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M4 4l6 6M10 4l-6 6" stroke={MUTED} strokeWidth="2" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: 15, color: TEXT }}>{t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            {/* 오른쪽: After → SNS메이킷 */}
            <Reveal delay={0.1}>
              <div style={{ padding: "clamp(24px,4vw,48px)", borderBottom: "1px solid " + BDR, borderLeft: "1px solid " + BDR, background: BG2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: P, marginBottom: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z" strokeLinejoin="round"/></svg>
                  SNS Makeit
                </div>
                <h3 style={{ fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 700, color: TEXT, lineHeight: 1.3, marginBottom: 24 }}>
                  {ko ? <>AI가 대신 만들고<br/>원클릭으로 발행</> : <>AI creates for you,<br/>publish in one click</>}
                </h3>
                {(ko ? ["AI 추천 키워드로 즉시 시작","SEO 최적화 글 3분 완성","20개+ 플랫폼 동시 생성","유튜브 링크로 쇼츠 자동"] : ["Start with AI keywords","SEO blog in 3 min","20+ platforms at once","Auto shorts from YouTube"]).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3.5 7l2.5 2.5 4.5-4.5" stroke={P} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    <span style={{ fontSize: 15, color: TEXT, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            {/* 가운데 숫자 배너 */}
            <div style={{ gridColumn: "1 / -1", borderBottom: "1px solid " + BDR, padding: "clamp(32px,5vw,56px) 24px", textAlign: "center" }}>
              <Reveal>
                <div style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 700, color: TEXT, letterSpacing: -2 }}>
                  92% {ko ? "시간 절약" : "time saved"}
                </div>
              </Reveal>
            </div>
            {/* 하단 전체: 채팅 지원 + 활동 피드 */}
            <Reveal>
              <div style={{ padding: "clamp(24px,4vw,48px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, marginBottom: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  {ko ? "빠른 고객 지원" : "Fast support"}
                </div>
                <h3 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: TEXT, lineHeight: 1.3, marginBottom: 24 }}>
                  {ko ? <>궁금한 점은 바로<br/>문의하세요</> : <>Ask us anything,<br/>anytime</>}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid " + BDR, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: P }}/></div>
                      <span style={{ fontSize: 11, color: MUTED }}>방금 전</span>
                    </div>
                    <div style={{ marginTop: 6, padding: "10px 14px", borderRadius: 12, border: "1px solid " + BDR, background: BG, fontSize: 13, color: TEXT, width: "fit-content", maxWidth: "65%" }}>
                      {ko ? "블로그 글 품질이 어느 정도인가요?" : "How good is the blog quality?"}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 12, background: P, color: "#fff", fontSize: 13, width: "fit-content", maxWidth: "65%" }}>
                      {ko ? "Claude AI 기반으로 SEO 최적화된 고품질 글을 자동 생성합니다." : "High-quality SEO-optimized content powered by Claude AI."}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, textAlign: "right", marginTop: 4 }}>{ko ? "방금" : "Now"}</div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ padding: "clamp(24px,4vw,48px)", borderLeft: "1px solid " + BDR }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, marginBottom: 24 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  {ko ? "실시간 활동" : "Activity feed"}
                </div>
                <h3 style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                  {ko ? <>콘텐츠 성과를<br/>실시간으로 확인</> : <>Monitor performance<br/>in real-time</>}
                  <span style={{ color: MUTED, fontWeight: 400 }}> {ko ? "즉시 개선하세요." : "Improve instantly."}</span>
                </h3>
                {/* 미니 차트 대체 — 바 그래프 */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 32, height: 100 }}>
                  {[35,55,40,70,50,85,60,90,75,95,65,80].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i >= 10 ? P : PBG, transition: "height .3s" }}/>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════ 후기 — 세로 자동 스크롤 3컬럼 ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: P, background: PBG, padding: "4px 14px", borderRadius: 20, marginBottom: 16 }}>
                {ko ? "사용자 후기" : "Testimonials"}
              </span>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.2 }}>
                {ko ? "결과로 말하는 사용자들" : "Users who speak with results"}
              </h2>
              <p style={{ fontSize: 16, color: SUB }}>{ko ? "실제 사용자들의 성과를 확인하세요." : "See real results from our users."}</p>
            </div>
          </Reveal>
          {(() => {
            const col1 = [
              { image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face", name: ko?"김** 대표님":"Kim, CEO", role: ko?"패션 쇼핑몰":"Fashion", text: ko?"블로그 작성 시간이 2시간에서 5분으로 줄었어요. 외주비 월 50만원 절약하고 있습니다.":"Blog writing dropped from 2hr to 5min." },
              { image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", name: ko?"박** 팀장님":"Park, Lead", role: ko?"마케팅 대행사":"Agency", text: ko?"10개 클라이언트 블로그를 혼자 관리합니다. SEO 자동 반영이 강력해요.":"I manage 10 clients' blogs alone." },
              { image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", name: ko?"정** 실장님":"Jung, Dir", role: ko?"뷰티 브랜드":"Beauty", text: ko?"인스타, 블로그 콘텐츠를 30분 안에 완성해요. 전에는 하루종일 걸렸는데.":"30 min for all content." },
            ];
            const col2 = [
              { image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", name: ko?"이** 크리에이터":"Lee, Creator", role: ko?"1인 크리에이터":"Solo Creator", text: ko?"인스타, 블로그, 스레드를 한 번에 만들어서 매일 발행 중. 팔로워 3배!":"All platforms at once. 3x followers!" },
              { image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face", name: ko?"최** 마케터":"Choi, Mkt", role: ko?"IT 스타트업":"Startup", text: ko?"키워드 분석부터 글 생성까지 자동화돼서 다른 업무에 집중할 수 있어요.":"Automated from keywords to posts." },
              { image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", name: ko?"한** 대표":"Han, CEO", role: ko?"교육 플랫폼":"Education", text: ko?"쇼츠 영상까지 자동 생성돼서 유튜브 구독자가 2배로 늘었습니다.":"YouTube subs doubled with auto shorts." },
            ];
            const col3 = [
              { image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", name: ko?"신** 매니저":"Shin, Mgr", role: ko?"쇼핑몰 운영":"E-commerce", text: ko?"상세페이지 제작이 10분이면 끝나요. 외주 맡기던 시절이 믿기지 않아요.":"Product pages in 10 min." },
              { image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", name: ko?"윤** 기획자":"Yoon, PM", role: ko?"콘텐츠 에이전시":"Content Agency", text: ko?"클라이언트별 톤 맞춤 글이 자동으로 나와서 수정만 하면 됩니다.":"Auto tone-matched drafts per client." },
              { image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face", name: ko?"안** 프리랜서":"Ahn, Freelance", role: ko?"프리랜서":"Freelancer", text: ko?"혼자서도 대행사 수준의 콘텐츠를 만들 수 있게 됐어요. 수입 2배!":"Agency-level content solo. 2x income!" },
            ];
            return (
              <div style={{ display: "flex", justifyContent: "center", gap: 20, maxHeight: 700, overflow: "hidden", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }}>
                <TestimonialColumn items={col1} duration={22} />
                <TestimonialColumn items={col2} duration={26} reverse className="hp-tc-hide-md" />
                <TestimonialColumn items={col3} duration={20} className="hp-tc-hide-sm" />
              </div>
            );
          })()}
        </div>
      </section>


      {/* ══════ FAQ ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{ko ? "자주 묻는 질문" : "FAQ"}</h2>
            </div>
          </Reveal>
          {(ko ? [
            { q: "SNS메이킷은 어떤 서비스인가요?", a: "AI 기반 콘텐츠 자동 생성 플랫폼입니다. 블로그 글쓰기, 영상 편집, SNS 자동 발행까지 하나의 플랫폼에서 제공합니다." },
            { q: "어떤 콘텐츠를 만들 수 있나요?", a: "네이버 블로그, 인스타그램 캡션, 유튜브 대본, 티스토리 글, 숏폼 영상 등 다양한 콘텐츠를 자동 생성합니다." },
            { q: "무료로 사용할 수 있나요?", a: "네. 비회원 5회 무료, 가입 시 5회 지급, 매일 출석 체크로 추가 적립 가능합니다." },
            { q: "콘텐츠 품질은 어떤가요?", a: "최신 AI 모델(Claude)로 높은 품질의 콘텐츠를 생성합니다. SEO 최적화도 자동 적용됩니다." },
            { q: "어떤 플랫폼을 지원하나요?", a: "네이버 블로그, 티스토리, 인스타그램, 유튜브, 스레드, 네이버 카페 등 20개+ 플랫폼을 지원합니다." },
            { q: "횟수는 어떻게 충전하나요?", a: "가입 시 5회 지급 + 매일 출석 적립. 유료 플랜으로 더 많은 횟수를 이용할 수 있습니다." },
            { q: "상업적으로 사용 가능한가요?", a: "네, 모든 콘텐츠는 상업적으로 자유롭게 사용 가능합니다." },
            { q: "개인정보는 안전한가요?", a: "Supabase 인프라 + 공식 OAuth 인증 + 암호화 저장으로 안전하게 관리됩니다." },
          ] : [
            { q: "What is SNS Makeit?", a: "AI-powered content platform for blog writing, video editing, and SNS auto-publishing." },
            { q: "What content can I create?", a: "Naver blog, Instagram, YouTube scripts, Tistory, short-form videos, and more." },
            { q: "Is it free?", a: "Yes. 5 guest uses, 5 on signup, +1 daily check-in." },
            { q: "Content quality?", a: "Latest AI models (Claude) with automatic SEO optimization." },
            { q: "Supported platforms?", a: "20+ including Naver, Tistory, Instagram, YouTube, Threads." },
            { q: "How to get credits?", a: "5 on signup + daily check-in. Paid plans for more." },
            { q: "Commercial use?", a: "Yes, all content is free for commercial use." },
            { q: "Is my data safe?", a: "Supabase + OAuth + encrypted storage." },
          ]).map((item, i) => (
            <Reveal key={i} delay={i * 0.02}><FaqItem q={item.q} a={item.a}/></Reveal>
          ))}
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(64px,10vw,96px) clamp(20px,5vw,32px)", background: BG, textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,4.5vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, lineHeight: 1.15, margin: "0 0 14px" }}>
              {ko ? "지금 바로 시작하세요." : "Start right now."}
            </h2>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, marginBottom: 32 }}>
              {ko ? "로그인 없이 5회 무료 체험. 카드 등록 불필요." : "5 free trials without login. No card needed."}
            </p>
            <button onClick={goAi} style={{
              position: "relative", overflow: "hidden",
              fontSize: 16, fontWeight: 600, padding: "14px 36px", borderRadius: 24,
              border: "none", background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit",
            }}>{ko ? "무료로 시작하기" : "Get started free"}</button>
          </Reveal>
        </div>
      </section>

      {/* 모바일 하단 CTA */}
      <div className="mobile-sticky-cta" style={{ display: "none", position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 900, alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.95)", border: "1px solid " + BDR, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", backdropFilter: "blur(16px)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{ko ? "AI 무료 체험" : "Free AI trial"}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{ko ? "비회원 5회 / 가입 +5회" : "5 guest + 5 signup"}</div>
        </div>
        <button onClick={goAi} style={{ flex: "0 0 auto", minHeight: 44, padding: "0 20px", borderRadius: 10, border: "none", background: P, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{ko ? "시작" : "Start"}</button>
      </div>
    </div>
  );
}
