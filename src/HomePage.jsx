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
  { src: "/icon-tistory.png", orbit: 1, angle: 72, size: 40 },
  { src: "/icon-youtube.png", orbit: 1, angle: 144, size: 38 },
  { src: "/icon-naver-cafe.webp", orbit: 1, angle: 216, size: 40 },
  { src: "/icon-instagram.svg", orbit: 1, angle: 288, size: 38 },
  // 궤도 2 (바깥) — 5개, 72도 간격 (36도 오프셋)
  { src: "/icon-naver-blog.png", orbit: 2, angle: 36, size: 36 },
  { src: "/icon-threads.png", orbit: 2, angle: 108, size: 34 },
  { src: "/icon-youtube.png", orbit: 2, angle: 180, size: 36 },
  { src: "/icon-tistory.png", orbit: 2, angle: 252, size: 34 },
  { src: "/icon-instagram.svg", orbit: 2, angle: 324, size: 32 },
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

  const goAi = () => navigate("programs");
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
          .hp-row{grid-template-columns:1fr!important}
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
          .hp-stats{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}
          .mobile-sticky-cta{display:flex!important}
          .hp-sec{padding-left:20px!important;padding-right:20px!important}
        }
        @media(max-width:480px){
          .hp-hero-inner h1{font-size:28px!important}
          .hp-g4{grid-template-columns:1fr!important}
          .hp-acc-wrap{height:280px!important}
        }
      `}</style>

      {/* ══════ HERO — PulseFit 스타일 ══════ */}
      <section style={{ position: "relative", overflow: "hidden", minHeight: "90vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #E8F0FF 0%, #F5F9FF 50%, #fff 100%)" }}>
        {/* 3D 궤도 아이콘 배경 */}
        <OrbitIconsBg />
        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(120px,16vw,180px) 20px clamp(40px,6vw,60px)", textAlign: "center", position: "relative", zIndex: 10 }}>
          <h1 style={{ fontSize: "clamp(38px,7vw,72px)", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 24px", maxWidth: 700 }}>
            {ko ? <>SNS 콘텐츠,<br/>더 쉽게 관리하세요</> : <>Manage your SNS<br/>the easy way</>}
          </h1>
          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: "#4a5568", lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 520 }}>
            {ko ? "블로그 글쓰기, 자동 발행, 키워드 분석까지. 복잡한 SNS 운영을 심플하게." : "Blog writing, auto-publishing, keyword analysis. Simplify your SNS management."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={goAi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 500, padding: "16px 36px", borderRadius: 99, border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontFamily: "inherit", transition: "transform .15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {ko ? "AI 도구 살펴보기" : "Explore AI tools"}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={goPrice} style={{ fontSize: 18, fontWeight: 500, padding: "16px 36px", borderRadius: 99, border: "1px solid #cbd5e0", background: "transparent", color: "#1a1a1a", cursor: "pointer", fontFamily: "inherit", transition: "transform .15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >{ko ? "요금 알아보기" : "See pricing"}</button>
          </div>
          <p style={{ fontSize: 13, color: "#718096", fontStyle: "italic", marginBottom: 28 }}>
            {ko ? "*체험권은 관리자 부여 방식으로 운영됩니다" : "*Trials are granted by an admin"}
          </p>
          {/* 소셜 프루프 — 실시간 가입자 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {(recentUsers.length > 0 ? recentUsers : [{nick:"김"},{nick:"박"},{nick:"이"},{nick:"최"},{nick:"정"}]).slice(0, 5).map((u, i) => (
                <img key={i} src={`https://api.dicebear.com/9.x/notionists/svg?seed=${u.nick || "user" + i}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt="" style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid #fff", marginLeft: i > 0 ? -8 : 0, background: "#f0f0f0" }} />
              ))}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#4a5568" }}>
              {ko ? `${Math.max(userCount, 100).toLocaleString()}+ 사용자가 함께하는 중` : `${Math.max(userCount, 100).toLocaleString()}+ users joined`}
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
              { img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=520&fit=crop", cat: ko ? "블로그" : "BLOG", title: ko ? "블로그 글쓰기 자동화" : "Blog Writing Automation" },
              { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=520&fit=crop", cat: ko ? "SNS 발행" : "PUBLISH", title: ko ? "SNS 자동 발행" : "SNS Auto Publishing" },
              { img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=520&fit=crop", cat: ko ? "키워드" : "KEYWORDS", title: ko ? "실시간 트렌드 분석" : "Real-time Trend Analysis" },
              { img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=520&fit=crop", cat: ko ? "대시보드" : "DASHBOARD", title: ko ? "콘텐츠 성과 관리" : "Content Performance" },
              { img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=520&fit=crop", cat: ko ? "드라이브" : "DRIVE", title: ko ? "구글 드라이브 연동" : "Google Drive Sync" },
              { img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400&h=520&fit=crop", cat: ko ? "커뮤니티" : "COMMUNITY", title: ko ? "부트캠프 & 커뮤니티" : "Bootcamp & Community" },
              { img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=520&fit=crop", cat: ko ? "블로그" : "BLOG", title: ko ? "블로그 글쓰기 자동화" : "Blog Writing Automation" },
              { img: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=520&fit=crop", cat: ko ? "SNS 발행" : "PUBLISH", title: ko ? "SNS 자동 발행" : "SNS Auto Publishing" },
              { img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=520&fit=crop", cat: ko ? "키워드" : "KEYWORDS", title: ko ? "실시간 트렌드 분석" : "Real-time Trend Analysis" },
              { img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=520&fit=crop", cat: ko ? "대시보드" : "DASHBOARD", title: ko ? "콘텐츠 성과 관리" : "Content Performance" },
              { img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=520&fit=crop", cat: ko ? "드라이브" : "DRIVE", title: ko ? "구글 드라이브 연동" : "Google Drive Sync" },
              { img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400&h=520&fit=crop", cat: ko ? "커뮤니티" : "COMMUNITY", title: ko ? "부트캠프 & 커뮤니티" : "Bootcamp & Community" },
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
      <section style={{ padding: "48px clamp(20px,5vw,32px)", background: BG, borderBottom: "1px solid " + BDR }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="hp-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, textAlign: "center" }}>
            {[
              { num: Math.max(userCount, 100), suffix: "+", label: ko ? "가입 사용자" : "Users" },
              { num: Math.max(statsCount, 50), suffix: "+", label: ko ? "커뮤니티 게시글" : "Posts" },
              { num: 20, suffix: "+", label: ko ? "AI 도구" : "AI Tools" },
              { num: 92, suffix: "%", label: ko ? "시간 절약" : "Time saved" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "16px 0" }}>
                <div style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 800, color: TEXT, letterSpacing: -1 }}>
                  <Counter end={s.num} suffix={s.suffix}/>
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 6, fontWeight: 500 }}>{s.label}</div>
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
                { src: "/icon-naver-cafe.webp", name: "네이버 카페" },
                { src: "/icon-instagram.svg", name: "Instagram" },
                { src: "/icon-youtube.png", name: "YouTube" },
                { src: "/icon-threads.png", name: "Threads" },
                { src: "/icon-tistory.png", name: "Tistory" },
                { src: "/icon-naver-blog.png", name: "네이버 블로그" },
                { src: "/icon-naver-cafe.webp", name: "네이버 카페" },
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

      {/* ══════ 주요 기능 — 벤토 그리드 카드 (Features 스타일) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,4.5vw,42px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.15, textAlign: "center" }}>
              {ko ? "SNS 운영에 필요한 모든 것" : "Everything for SNS management"}
            </h2>
          </Reveal>

          <style>{`
            .hp-bento{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:48px}
            .hp-bento-card{border-radius:20px;border:1px solid ${BDR};background:${BG2};overflow:hidden;transition:transform .2s,box-shadow .2s}
            .hp-bento-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.06)}
            .hp-bento-wide{grid-column:1/-1}
            .hp-bento-wide-inner{display:grid;grid-template-columns:1fr 1.2fr}
            @media(max-width:768px){.hp-bento{grid-template-columns:1fr !important}.hp-bento-wide{grid-column:1 !important}.hp-bento-wide-inner{grid-template-columns:1fr !important}}
          `}</style>

          <div className="hp-bento">
            {/* ── 와이드 카드: AI 글쓰기 ── */}
            <div className="hp-bento-card hp-bento-wide">
              <Reveal>
                <div className="hp-bento-wide-inner">
                  <div style={{ padding: "clamp(28px,3vw,40px)" }}>
                    <h3 style={{ fontSize: "clamp(20px,2.5vw,24px)", fontWeight: 700, color: TEXT, margin: "0 0 12px", lineHeight: 1.3 }}>
                      {ko ? "AI 콘텐츠 생성" : "AI Content Generation"}
                    </h3>
                    <p style={{ fontSize: 15, color: SUB, lineHeight: 1.65, margin: 0, maxWidth: 420 }}>
                      {ko ? "주제만 입력하면 블로그 글, 인스타 캡션, 카드뉴스까지 AI가 자동으로 작성합니다. SEO 최적화 구조로 검색 노출까지 고려합니다." : "Enter a topic and AI writes blog posts, Instagram captions, and card news. SEO-optimized structure included."}
                    </p>
                  </div>
                  <div style={{ position: "relative", overflow: "hidden", minHeight: 300 }}>
                    <div style={{ position: "absolute", top: 24, left: 0, right: -8, bottom: -8, background: BG, border: `1px solid ${BDR}`, borderRadius: "16px 0 0 0", padding: "20px 24px" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 99, background: "#ef4444" }}/><div style={{ width: 10, height: 10, borderRadius: 99, background: "#f59e0b" }}/><div style={{ width: 10, height: 10, borderRadius: 99, background: "#22c55e" }}/>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 14 }}>{ko ? "AI 글 생성기" : "AI Writer"}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ height: 8, borderRadius: 4, background: `${P}18`, width: "90%" }}/>
                        <div style={{ height: 8, borderRadius: 4, background: `${P}12`, width: "70%" }}/>
                        <div style={{ height: 8, borderRadius: 4, background: `${P}08`, width: "55%" }}/>
                        <div style={{ height: 1, background: BDR, margin: "8px 0" }}/>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                          <div style={{ height: 64, borderRadius: 10, background: `${P}06`, border: `1px solid ${BDR}` }}/>
                          <div style={{ height: 64, borderRadius: 10, background: "#22c55e08", border: `1px solid ${BDR}` }}/>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          {(ko?["블로그","인스타","스레드"]:["Blog","Insta","Threads"]).map((t,i) => (
                            <span key={t} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: i===0?P:"transparent", color: i===0?"#fff":MUTED, fontWeight: 600, border: i>0?`1px solid ${BDR}`:"none" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* ── 카드 2: 자동 발행 ── */}
            <div className="hp-bento-card" style={{ padding: "clamp(20px,2.5vw,28px)" }}>
              <Reveal delay={0.05}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>{ko ? "다채널 자동 발행" : "Multi-channel Publishing"}</h3>
                <p style={{ fontSize: 14, color: SUB, lineHeight: 1.6, margin: "0 0 20px" }}>{ko ? "네이버 블로그, 카페, 인스타그램, 스레드에 동시에 발행합니다." : "Publish to Naver Blog, Cafe, Instagram, Threads simultaneously."}</p>
                <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[{name:ko?"네이버 블로그":"Naver Blog",status:ko?"발행 완료":"Done",color:"#22c55e"},{name:ko?"인스타그램":"Instagram",status:ko?"발행 중":"Publishing",color:"#f59e0b"},{name:ko?"스레드":"Threads",status:ko?"대기":"Waiting",color:MUTED}].map(p => (
                      <div key={p.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, background:BG2, border:`1px solid ${BDR}` }}>
                        <div style={{ width:6, height:6, borderRadius:99, background:p.color, flexShrink:0 }}/>
                        <span style={{ fontSize:12, fontWeight:600, color:TEXT, flex:1 }}>{p.name}</span>
                        <span style={{ fontSize:10, fontWeight:600, color:p.color }}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* ── 카드 3: 키워드 분석 ── */}
            <div className="hp-bento-card" style={{ padding: "clamp(20px,2.5vw,28px) clamp(20px,2.5vw,28px) 0" }}>
              <Reveal delay={0.1}>
                <div style={{ padding: "0 clamp(20px,2.5vw,28px)" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>{ko ? "키워드 트렌드 분석" : "Keyword Trends"}</h3>
                  <p style={{ fontSize: 14, color: SUB, lineHeight: 1.6, margin: "0 0 20px" }}>{ko ? "실시간 320+ 키워드로 검색 최적화 콘텐츠를 만드세요." : "320+ real-time keywords for SEO content."}</p>
                </div>
                <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: "12px 12px 0 0", margin: "0 12px", padding: 14 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {(ko?["블로그 마케팅","SEO","SNS 자동화","키워드"]:["Blog Marketing","SEO","Automation","Keywords"]).map((t,i) => (
                      <span key={t} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, background: i===0?P:"#f0f0f5", color: i===0?"#fff":TEXT, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ background: "#f8f9fb", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{ko ? "AI에게 물어보기" : "Ask AI"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: "1px solid " + BDR, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </div>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: "1px solid " + BDR, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                        </div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: 99, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* ── 카드 4: 커뮤니티 ── */}
            <div className="hp-bento-card" style={{ padding: "clamp(20px,2.5vw,28px) clamp(20px,2.5vw,28px) 0" }}>
              <Reveal delay={0.15}>
                <div style={{ padding: "0 clamp(20px,2.5vw,28px)" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>{ko ? "커뮤니티 & 부트캠프" : "Community & Bootcamp"}</h3>
                  <p style={{ fontSize: 14, color: SUB, lineHeight: 1.6, margin: "0 0 16px" }}>{ko ? "사업자들과 노하우를 나누고 함께 성장하세요." : "Share tips and grow together."}</p>
                </div>
                <div style={{ margin: "0 12px", paddingBottom: 12 }}>
                  <div style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        {label:ko?"정보 공유":"Info sharing", count:"128"},
                        {label:ko?"질문 답변":"Q&A", count:"64"},
                        {label:ko?"사용 후기":"Reviews", count:"42"},
                      ].map(c => (
                        <div key={c.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0" }}>
                          <span style={{ fontSize:12, fontWeight:600, color:TEXT }}>{c.label}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:P }}>{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 이미지 아코디언 (interactive-image-accordion 스타일) ══════ */}
      {(() => {
        const [accIdx, setAccIdx] = useState(0);
        const accItems = [
          { title: ko ? "블로그 글쓰기" : "Blog Writing", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "SNS 발행" : "Publishing", img: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "키워드 분석" : "Keywords", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "드라이브 연동" : "Drive Sync", img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop&q=80" },
          { title: ko ? "커뮤니티" : "Community", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=800&fit=crop&q=80" },
        ];
        return (
          <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG2 }}>
            <div style={{ maxWidth: 1140, margin: "0 auto" }}>
              <div className="hp-row" style={{ display: "flex", gap: "clamp(32px,5vw,56px)", alignItems: "center" }}>
                {/* 왼쪽 텍스트 */}
                <div className="hp-row-text" style={{ flex: "1 1 45%", minWidth: 0 }}>
                  <Reveal>
                    <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: TEXT, letterSpacing: -1, margin: "0 0 16px", lineHeight: 1.15 }}>
                      {ko ? <>SNS 운영의 모든 것,<br/>하나로 해결하세요</> : <>Everything for SNS,<br/>all in one place</>}
                    </h2>
                    <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 28px", maxWidth: 380 }}>
                      {ko ? "글쓰기, 키워드 분석, 자동 발행, 커뮤니티까지. SNS 운영을 쉽게 만들어 드립니다." : "Writing, keywords, publishing, community. Making SNS management easy."}
                    </p>
                    <button onClick={goAi} style={{
                      position: "relative", overflow: "hidden",
                      fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 24,
                      border: `1px solid ${P}30`, background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                    }}>{ko ? "AI 도구 살펴보기" : "Explore AI tools"}</button>
                  </Reveal>
                </div>
                {/* 오른쪽 아코디언 */}
                <div className="hp-row-img" style={{ flex: "1 1 55%", minWidth: 0 }}>
                  <div className="hp-acc-wrap" style={{ display: "flex", gap: 8, height: 440, alignItems: "stretch" }}>
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
                {(ko ? ["키워드 조사하느라 30분+","글 하나 쓰는 데 1시간+","이미지 찾고 편집하는 시간","채널마다 일일이 수동 관리"] : ["30min+ on keyword research","1hr+ writing a single post","Time spent finding & editing images","Manually managing each channel"]).map((t, i) => (
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
                  {ko ? <>콘텐츠 제작부터<br/>발행까지 한 번에</> : <>From creation to<br/>publishing, all at once</>}
                </h3>
                {(ko ? ["테마만 입력하면 글이 완성","이미지와 카테고리도 자동 매칭","발행까지 원클릭으로 끝","커뮤니티에서 함께 성장"] : ["Enter a topic, post is ready","Auto image & category matching","One-click to publish","Grow together in community"]).map((t, i) => (
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
                      {ko ? "자동 발행하면 글 품질은 어떤가요?" : "How good is auto-published quality?"}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 12, background: P, color: "#fff", fontSize: 13, width: "fit-content", maxWidth: "65%" }}>
                      {ko ? "SEO 최적화 글 작성 + 이미지/인용구 자동 삽입까지 한 번에 처리됩니다." : "SEO-optimized posts with auto images & quotes, all at once."}
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
                  {ko ? <>발행 현황을<br/>대시보드에서 확인</> : <>Check publishing stats<br/>on dashboard</>}
                  <span style={{ color: MUTED, fontWeight: 400 }}> {ko ? "성공률, 발행 수 한눈에." : "Success rate at a glance."}</span>
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
              { image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face", name: ko?"박** 팀장님":"Park, Lead", role: ko?"마케팅 대행사":"Agency", text: ko?"여러 클라이언트 블로그를 혼자 관리합니다. 키워드 분석이 특히 유용해요.":"I manage multiple clients' blogs alone." },
              { image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face", name: ko?"정** 실장님":"Jung, Dir", role: ko?"뷰티 브랜드":"Beauty", text: ko?"블로그 콘텐츠를 30분 안에 완성해요. 전에는 하루종일 걸렸는데.":"Blog content done in 30 min." },
            ];
            const col2 = [
              { image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face", name: ko?"이** 운영자":"Lee, Mgr", role: ko?"1인 사업자":"Solo Business", text: ko?"자동 발행 덕분에 매일 블로그에 글이 올라가요. 검색 노출이 확 늘었어요.":"Auto-publishing keeps my blog active daily." },
              { image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face", name: ko?"최** 마케터":"Choi, Mkt", role: ko?"스타트업":"Startup", text: ko?"키워드 분석부터 글 작성까지 한 번에 돼서 다른 업무에 집중할 수 있어요.":"From keywords to posts, all at once." },
              { image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face", name: ko?"한** 대표":"Han, CEO", role: ko?"교육 플랫폼":"Education", text: ko?"부트캠프에서 다른 사업자들과 함께 SNS 운영 노하우를 나누고 있어요.":"Learning SNS skills together in bootcamp." },
            ];
            const col3 = [
              { image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face", name: ko?"신** 매니저":"Shin, Mgr", role: ko?"쇼핑몰 운영":"E-commerce", text: ko?"드라이브에 사진만 올려두면 자동으로 블로그 글이 완성돼요. 진짜 편해요.":"Just upload photos to Drive, blog posts are auto-created." },
              { image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face", name: ko?"윤** 기획자":"Yoon, PM", role: ko?"콘텐츠 에이전시":"Content Agency", text: ko?"클라이언트별 톤에 맞춘 글이 나와서 수정만 하면 됩니다.":"Tone-matched drafts per client." },
              { image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face", name: ko?"안** 프리랜서":"Ahn, Freelance", role: ko?"프리랜서":"Freelancer", text: ko?"혼자서도 꾸준히 블로그를 운영할 수 있게 됐어요. 수입이 눈에 띄게 늘었어요.":"Now I can consistently run my blog solo." },
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
            { q: "SNS메이킷은 어떤 서비스인가요?", a: "SNS 콘텐츠 제작과 관리를 쉽게 도와주는 올인원 플랫폼입니다. 블로그 글쓰기, 키워드 분석, 자동 발행, 부트캠프까지 한곳에서 해결할 수 있습니다." },
            { q: "무료로 사용할 수 있나요?", a: "네. 회원가입 시 5회가 무료로 지급되며, 비회원도 5회 체험이 가능합니다. 데스크톱 프로그램도 무료로 다운로드할 수 있습니다." },
            { q: "어떤 기능을 제공하나요?", a: "블로그 자동 글쓰기, 키워드 트렌드 분석, SNS 자동 발행, 구글 드라이브 연동, 부트캠프, 커뮤니티 등 20가지 이상의 기능을 제공합니다." },
            { q: "자동 발행은 어떻게 되나요?", a: "데스크톱 프로그램을 설치하면 테마 입력만으로 글 작성부터 이미지 삽입, 발행까지 자동으로 처리됩니다. Pro 플랜 이상에서 이용 가능합니다." },
            { q: "어떤 플랫폼을 지원하나요?", a: "네이버 블로그, 네이버 카페 자동 발행을 지원하며, 웹에서는 인스타그램, 유튜브, 스레드 등 다양한 SNS용 콘텐츠를 생성할 수 있습니다." },
            { q: "부트캠프는 무엇인가요?", a: "SNS 운영 역량을 함께 키울 수 있는 그룹 프로그램입니다. 매일 미션을 인증하고, 참가자들과 함께 성장할 수 있습니다." },
            { q: "상업적으로 사용 가능한가요?", a: "네, 생성된 모든 콘텐츠는 상업적으로 자유롭게 사용할 수 있습니다." },
            { q: "개인정보는 안전한가요?", a: "암호화된 인프라에서 안전하게 관리되며, 데스크톱 프로그램의 로그인 정보는 PC에만 저장됩니다." },
          ] : [
            { q: "What is SNS Makeit?", a: "An all-in-one platform for easy SNS content creation and management." },
            { q: "Is it free?", a: "Yes. 5 free uses on signup, guests get 5 free tries. Desktop app is free to download." },
            { q: "What features?", a: "Blog writing, keyword analysis, auto-publishing, Drive sync, bootcamps, and 20+ tools." },
            { q: "Auto-publishing?", a: "Desktop app handles writing, images, and publishing automatically. Pro plan required." },
            { q: "Which platforms?", a: "Naver Blog, Naver Cafe auto-publish. Web supports Instagram, YouTube, Threads content." },
            { q: "What are bootcamps?", a: "Group challenges to build your SNS skills together with daily missions." },
            { q: "Commercial use?", a: "Yes, all content is free for commercial use." },
            { q: "Is my data safe?", a: "Encrypted infrastructure. Desktop login info stored locally only." },
          ]).map((item, i) => (
            <Reveal key={i} delay={i * 0.02}><FaqItem q={item.q} a={item.a}/></Reveal>
          ))}
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,120px) clamp(20px,5vw,32px)", background: "linear-gradient(180deg, #fff 0%, #f0f4ff 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,4.5vw,42px)", fontWeight: 800, color: TEXT, letterSpacing: -0.5, lineHeight: 1.15, margin: "0 0 16px" }}>
              {ko ? "지금 바로 시작하세요." : "Start right now."}
            </h2>
            <p style={{ fontSize: 17, color: SUB, lineHeight: 1.6, marginBottom: 36 }}>
              {ko ? "복잡한 SNS 운영, 이제 쉽게 시작하세요.\n무료 체험으로 먼저 확인해보세요." : "Complex SNS management, now made easy.\nTry it free first."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
              <button onClick={() => navigate("programs")} style={{
                fontSize: 16, fontWeight: 600, padding: "15px 36px", borderRadius: 99,
                border: "none", background: "#1a1a1a", color: "#fff", cursor: "pointer", fontFamily: "inherit",
                transition: "transform .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >{ko ? "무료로 시작하기" : "Start for free"}</button>
              <button onClick={goPrice} style={{
                fontSize: 16, fontWeight: 600, padding: "15px 36px", borderRadius: 99,
                border: "1px solid #cbd5e0", background: "transparent", color: TEXT, cursor: "pointer", fontFamily: "inherit",
                transition: "transform .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >{ko ? "요금 알아보기" : "See pricing"}</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 13, color: MUTED }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {ko ? "카드 등록 불필요" : "No credit card"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {ko ? "5회 무료 체험" : "5 free uses"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {ko ? "즉시 사용 가능" : "Instant access"}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 모바일 하단 CTA */}
      <div className="mobile-sticky-cta" style={{ display: "none", position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 900, alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.95)", border: "1px solid " + BDR, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", backdropFilter: "blur(16px)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{ko ? "SNS 콘텐츠 관리" : "SNS Management"}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{ko ? "기능 둘러보기" : "Explore features"}</div>
        </div>
        <button onClick={() => navigate("programs")} style={{ flex: "0 0 auto", minHeight: 44, padding: "0 20px", borderRadius: 10, border: "none", background: P, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{ko ? "보기" : "View"}</button>
      </div>
    </div>
  );
}
