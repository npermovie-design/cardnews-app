import { useState, useEffect, useRef } from "react";
import { Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

/* ── 팔레트 (Buffer 스타일) ── */
const P = "#168EEA";
const PBG = "#EBF5FF";
const PBDR = "#c4e0f9";
const ACC = "#34C759";
const ACCBG = "#E8FBF0";
const TEXT = "#1A1A2E";
const SUB = "#555555";
const MUTED = "#999999";
const BDR = "#e8e4e0";
const BG = "#ffffff";
const BG2 = "#F8F5F1";
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

  return (
    <div style={{ fontFamily: "'Pretendard Variable','Pretendard',-apple-system,system-ui,sans-serif" }}>
      <style>{`
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
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

      {/* ══════ HERO ══════ */}
      <section style={{ padding: "clamp(100px,15vw,160px) clamp(20px,5vw,40px) clamp(72px,10vw,120px)", background: DARK, color: "#fff", position: "relative", overflow: "hidden" }}>
        {/* 우주/네트워크 배경 */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="hg1" cx="30%" cy="40%" r="60%"><stop offset="0%" stopColor="#168EEA" stopOpacity="0.08"/><stop offset="100%" stopColor="#168EEA" stopOpacity="0"/></radialGradient>
            <radialGradient id="hg2" cx="75%" cy="60%" r="45%"><stop offset="0%" stopColor="#34C759" stopOpacity="0.05"/><stop offset="100%" stopColor="#34C759" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1200" height="700" fill="url(#hg1)"/>
          <rect width="1200" height="700" fill="url(#hg2)"/>
          {/* 네트워크 라인 */}
          <g stroke="#168EEA" fill="none" opacity=".12">
            <line x1="100" y1="80" x2="300" y2="200" strokeWidth=".6"/>
            <line x1="300" y1="200" x2="500" y2="120" strokeWidth=".6"/>
            <line x1="500" y1="120" x2="700" y2="280" strokeWidth=".6"/>
            <line x1="700" y1="280" x2="900" y2="150" strokeWidth=".6"/>
            <line x1="900" y1="150" x2="1100" y2="250" strokeWidth=".6"/>
            <line x1="200" y1="400" x2="450" y2="350" strokeWidth=".5"/>
            <line x1="450" y1="350" x2="650" y2="500" strokeWidth=".5"/>
            <line x1="650" y1="500" x2="850" y2="420" strokeWidth=".5"/>
            <line x1="850" y1="420" x2="1050" y2="550" strokeWidth=".5"/>
            <line x1="300" y1="200" x2="450" y2="350" strokeWidth=".4" opacity=".6"/>
            <line x1="700" y1="280" x2="650" y2="500" strokeWidth=".4" opacity=".6"/>
            <line x1="500" y1="120" x2="200" y2="400" strokeWidth=".3" opacity=".4"/>
            <line x1="900" y1="150" x2="1050" y2="550" strokeWidth=".3" opacity=".4"/>
          </g>
          {/* 노드(별) */}
          <g fill="#168EEA" opacity=".2">
            <circle cx="100" cy="80" r="3"/><circle cx="300" cy="200" r="4"/>
            <circle cx="500" cy="120" r="3"/><circle cx="700" cy="280" r="5"/>
            <circle cx="900" cy="150" r="3"/><circle cx="1100" cy="250" r="3"/>
            <circle cx="200" cy="400" r="2.5"/><circle cx="450" cy="350" r="3.5"/>
            <circle cx="650" cy="500" r="3"/><circle cx="850" cy="420" r="4"/>
            <circle cx="1050" cy="550" r="2.5"/>
          </g>
          {/* 은은한 별 */}
          <g fill="#fff" opacity=".15">
            <circle cx="80" cy="300" r="1"/><circle cx="180" cy="550" r="1.2"/>
            <circle cx="400" cy="50" r="1"/><circle cx="600" cy="600" r="1.5"/>
            <circle cx="750" cy="80" r="1"/><circle cx="950" cy="350" r="1.2"/>
            <circle cx="1120" cy="100" r="1"/><circle cx="350" cy="650" r="1"/>
          </g>
        </svg>

        {/* 플로팅 SNS 아이콘 — 히어로 이미지 주변에 모아서 배치 */}
        <div className="hp-float-icon" style={{ top: "15%", right: "18%", animation: "hp-float1 5s ease-in-out infinite" }}>
          <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/icon-instagram.webp" alt="" style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
        </div>
        <div className="hp-float-icon" style={{ top: "8%", right: "28%", animation: "hp-float2 6s ease-in-out infinite 1s" }}>
          <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/icon-youtube.png" alt="" style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
        </div>
        <div className="hp-float-icon" style={{ bottom: "18%", right: "22%", animation: "hp-float3 7s ease-in-out infinite .5s" }}>
          <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/icon-naver-blog.png" alt="" style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
        </div>
        <div className="hp-float-icon" style={{ top: "40%", right: "14%", animation: "hp-float4 5.5s ease-in-out infinite 2s" }}>
          <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/icon-threads.png" alt="" style={{ width: 22, height: 22, borderRadius: 5 }} />
          </div>
        </div>

        <div className="hp-hero-inner" style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: "clamp(48px,6vw,80px)", position: "relative", zIndex: 2 }}>
          <div style={{ flex: "1 1 480px", minWidth: 280 }}>
            <h1 style={{ fontSize: "clamp(32px,5.5vw,54px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, margin: "0 0 20px" }}>
              {ko ? <>SNS 콘텐츠,<br/>키워드 하나면 끝</> : <>SNS content,<br/>one keyword is all</>}
            </h1>
            <p style={{ fontSize: "clamp(16px,1.6vw,18px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 12px", maxWidth: 420 }}>
              {ko ? "블로그, 인스타, 유튜브 쇼츠까지 AI가 한 번에 만들어 줍니다." : "AI creates blog, Instagram, and YouTube Shorts all at once."}
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", marginBottom: 36 }}>
              {ko ? "비회원 5회 무료 / 가입 시 5회 / 카드 불필요" : "5 free / 5 on signup / no card"}
            </p>
            <div className="hp-hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={goAi} style={{ fontSize: 16, fontWeight: 600, padding: "14px 28px", borderRadius: 10, border: "none", background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {ko ? "무료로 시작하기" : "Get started free"}
              </button>
              <button onClick={goPrice} style={{ fontSize: 15, fontWeight: 500, padding: "13px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {ko ? "요금 알아보기" : "See pricing"}
              </button>
            </div>
          </div>
          <div className="hp-hero-visual" style={{ flex: "1 1 440px", minWidth: 280 }}>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <img src="/hero-writing.png" alt={ko ? "AI 글쓰기" : "AI Writing"} loading="eager" style={{ width: "100%", display: "block" }} />
            </div>
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

      {/* ══════ 기능 소개 — 이미지+텍스트 교차 (liveklass 스타일) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: P, background: PBG, padding: "4px 14px", borderRadius: 20, marginBottom: 16 }}>
                {ko ? "주요 기능" : "Key Features"}
              </span>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.2 }}>
                {ko ? <>나만의 SNS 콘텐츠를<br/>더 쉽게, 더 빠르게</> : <>Your SNS content,<br/>easier and faster</>}
              </h2>
              <p style={{ fontSize: 16, color: SUB, lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
                {ko ? "복잡한 도구 없이, 키워드 하나로 모든 채널 콘텐츠를 완성하세요." : "Complete all channel content with one keyword."}
              </p>
            </div>
          </Reveal>

          {/* Feature 1: AI 글쓰기 — 왼쪽 이미지 + 오른쪽 텍스트 */}
          <Reveal>
            <div className="hp-row" style={{ display: "flex", gap: 48, alignItems: "center", marginBottom: 80 }}>
              <div className="hp-row-img" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: BG2, border: "1px solid " + BDR, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/hero-writing.png" alt="" style={{ width: "100%", display: "block" }} loading="lazy" />
                </div>
              </div>
              <div className="hp-row-text" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff", background: P, padding: "3px 10px", borderRadius: 6, marginBottom: 16 }}>HOT</span>
                <h3 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.3 }}>
                  {ko ? <>블로그, SNS 글을<br/>한 번에 완성</> : <>Create blog & SNS<br/>posts together</>}
                </h3>
                <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 24px" }}>
                  {ko ? "키워드 하나만 입력하면 네이버 블로그, 인스타그램, 스레드, 유튜브 대본까지 채널별 톤에 맞춰 AI가 자동으로 초안을 만들어 줍니다." : "Enter one keyword and AI creates drafts for Naver blog, Instagram, Threads, and YouTube scripts with the right tone for each channel."}
                </p>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 20 }}>
                  {["/icon-naver-blog.png","/icon-instagram.webp","/icon-threads.png","/icon-youtube.png","/icon-tistory.png"].map((src,j) => (
                    <img key={j} src={src} alt="" style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid " + BDR }} />
                  ))}
                  <span style={{ fontSize: 13, color: MUTED, fontWeight: 600, marginLeft: 4 }}>+15</span>
                </div>
                <button onClick={goAi} style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, border: "none", background: DARK, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  {ko ? "AI 글쓰기 시작" : "Start AI writing"}
                </button>
              </div>
            </div>
          </Reveal>

          {/* Feature 2: 쇼츠/영상 — 오른쪽 이미지 + 왼쪽 텍스트 */}
          <Reveal>
            <div className="hp-row-reverse" style={{ display: "flex", flexDirection: "row-reverse", gap: 48, alignItems: "center", marginBottom: 80 }}>
              <div className="hp-row-img" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: DARK, border: "1px solid " + DARK2, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
                  <div style={{ textAlign: "center", color: "#fff" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}><rect x="3" y="5" width="18" height="14" rx="4" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8.5 15,12 10,15.5" fill="#fff"/></svg>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{ko ? "유튜브 링크 -> 쇼츠 자동 생성" : "YouTube link -> Auto Shorts"}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{ko ? "편집 없이 바로 발행 가능" : "Publish without editing"}</div>
                  </div>
                </div>
              </div>
              <div className="hp-row-text" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff", background: P, padding: "3px 10px", borderRadius: 6, marginBottom: 16 }}>NEW</span>
                <h3 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.3 }}>
                  {ko ? <>쇼츠 제작부터<br/>자동 발행까지</> : <>From Shorts creation<br/>to auto-publishing</>}
                </h3>
                <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 24px" }}>
                  {ko ? "유튜브 링크 하나로 쇼츠를 자동 생성하고, YouTube, Instagram, TikTok에 원클릭으로 발행하세요. 편집 경험이 없어도 괜찮습니다." : "Create shorts from a YouTube link and publish to YouTube, Instagram, TikTok with one click."}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {(ko ? ["쇼츠 제작","다중 플랫폼","자동 발행"] : ["Shorts","Multi-platform","Auto publish"]).map(t => (
                    <span key={t} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 8, background: PBG, color: P, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
                <button onClick={() => { goAi(); setAiMenu && setAiMenu("sns_publish"); }} style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, border: "none", background: DARK, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  {ko ? "쇼츠 만들기" : "Create Shorts"}
                </button>
              </div>
            </div>
          </Reveal>

          {/* Feature 3: 키워드 분석 — 왼쪽 이미지 + 오른쪽 텍스트 */}
          <Reveal>
            <div className="hp-row" style={{ display: "flex", gap: 48, alignItems: "center" }}>
              <div className="hp-row-img" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: PBG, border: "1px solid " + PBDR, padding: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P, marginBottom: 12 }}>{ko ? "실시간 트렌드 키워드" : "Real-time trending"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(ko ? ["AI 마케팅","블로그 수익화","인스타 릴스","유튜브 쇼츠","챗GPT 활용","SNS 자동화","네이버 상위노출","부업 추천","건강 루틴","뷰티 트렌드","재테크 방법","여행 브이로그"]
                         : ["AI Marketing","Blog Monetize","Insta Reels","YouTube Shorts","ChatGPT Tips","SNS Automation","SEO Tips","Side Hustle","Health","Beauty","Finance","Travel Vlog"]).map((t, i) => (
                      <span key={i} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, background: i < 2 ? P : "#fff", color: i < 2 ? "#fff" : TEXT, fontWeight: 600, border: i < 2 ? "none" : "1px solid " + BDR }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, fontSize: 13, color: SUB }}>{ko ? "네이버 + 구글 실시간 320개+ 키워드" : "320+ keywords from Naver + Google"}</div>
                </div>
              </div>
              <div className="hp-row-text" style={{ flex: "1 1 50%", minWidth: 0 }}>
                <h3 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, color: TEXT, margin: "0 0 14px", lineHeight: 1.3 }}>
                  {ko ? <>오늘 뜨는 키워드로<br/>바로 글쓰기 시작</> : <>Start writing with<br/>today's trending keywords</>}
                </h3>
                <p style={{ fontSize: 16, color: SUB, lineHeight: 1.65, margin: "0 0 24px" }}>
                  {ko ? "네이버와 구글에서 실시간으로 수집한 320개 이상의 트렌드 키워드를 확인하고, 클릭 한 번으로 바로 콘텐츠 제작을 시작하세요." : "Check 320+ trending keywords from Naver and Google, then start creating content with one click."}
                </p>
                <button onClick={goAi} style={{ fontSize: 15, fontWeight: 600, padding: "12px 24px", borderRadius: 10, border: "none", background: DARK, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  {ko ? "키워드 확인하기" : "Check keywords"}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ All-in-one 플랫폼 (liveklass의 4칸 기능) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG2 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.2 }}>
                {ko ? <>SNS 운영에 필요한<br/>모든 도구를 한곳에</> : <>All the tools for SNS<br/>in one place</>}
              </h2>
            </div>
          </Reveal>
          <div className="hp-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: ko ? "AI 글쓰기" : "AI Writing", desc: ko ? "20개+ 플랫폼에 맞는 글을 AI가 자동 생성합니다. 네이버 블로그, 인스타, 유튜브 대본까지." : "AI generates content for 20+ platforms.", icon: <><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5"/></> },
              { title: ko ? "쇼츠 영상 제작" : "Shorts Creator", desc: ko ? "유튜브 링크만으로 쇼츠 영상을 자동 생성합니다. 편집 경험이 필요 없어요." : "Auto-create shorts from a YouTube link.", icon: <><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><polygon points="10,8 15,12 10,16" fill="currentColor"/></> },
              { title: ko ? "추천 키워드" : "Trending Keywords", desc: ko ? "네이버, 구글 실시간 트렌드 320개+ 키워드를 확인하고 바로 제작을 시작하세요." : "320+ real-time keywords from Naver & Google.", icon: <><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5"/></> },
              { title: ko ? "SNS 자동 발행" : "Auto Publishing", desc: ko ? "YouTube, Instagram, TikTok, 네이버 블로그 등 연동된 채널에 원클릭으로 발행합니다." : "One-click publish to linked channels.", icon: <><path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></> },
              { title: ko ? "카드뉴스" : "Card News", desc: ko ? "텍스트를 입력하면 디자인된 카드뉴스 이미지를 자동으로 생성합니다." : "Auto-generate designed card news images.", icon: <><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></> },
              { title: ko ? "커뮤니티 / 자료실" : "Community", desc: ko ? "마케팅 뉴스, 키워드 가이드, 프리미어프로 자동편집 도구를 무료로 제공합니다." : "Free marketing news, guides and tools.", icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" strokeWidth="1.5"/></> },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div onClick={goAi} style={{ background: BG, borderRadius: 16, padding: "28px 24px", cursor: "pointer", border: "1px solid " + BDR, transition: "border-color .2s", height: "100%" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = PBDR}
                  onMouseLeave={e => e.currentTarget.style.borderColor = BDR}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: PBG, display: "flex", alignItems: "center", justifyContent: "center", color: P, marginBottom: 16 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{f.icon}</svg>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{f.title}</div>
                  <p style={{ fontSize: 14, color: SUB, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Before / After ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px", lineHeight: 1.2 }}>
                {ko ? <>생산성은 올리고,<br/>사용하는 툴은 줄이고</> : <>Boost productivity,<br/>fewer tools needed</>}
              </h2>
              <p style={{ fontSize: 16, color: SUB }}>
                {ko ? "매일 2시간 걸리던 작업, 이제 10분이면 끝" : "2 hours daily -> done in 10 minutes"}
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="hp-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: "32px 28px", borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>{ko ? "기존 방식" : "Before"}</div>
                {(ko ? ["키워드 조사 30분+","블로그 1시간 + SEO 별도","채널마다 따로 작성","쇼츠 편집 반나절"] : ["30min+ keyword research","1hr blog + separate SEO","Write per channel","Half-day shorts editing"]).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M4 4l6 6M10 4l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: 15, color: TEXT }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "32px 28px", borderRadius: 16, background: PBG, border: "1px solid " + PBDR }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P, letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>SNS Makeit</div>
                {(ko ? ["AI 추천 키워드로 즉시 시작","SEO 최적화 글 3분 완성","20개+ 플랫폼 동시 생성","유튜브 링크로 쇼츠 자동"] : ["Start with AI keywords","SEO blog in 3 min","20+ platforms at once","Auto shorts from YouTube"]).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3.5 7l2.5 2.5 4.5-4.5" stroke={P} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    <span style={{ fontSize: 15, color: TEXT, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button onClick={goAi} style={{ fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 12, border: "none", background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              {ko ? "무료로 시작하기" : "Start free"}
            </button>
          </div>
        </div>
      </section>

      {/* ══════ 후기 (다크 배경 — liveklass 스타일) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: DARK, color: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: P, background: "rgba(22,142,234,0.15)", padding: "4px 14px", borderRadius: 20, marginBottom: 16 }}>
                {ko ? "사용자 후기" : "Testimonials"}
              </span>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
                {ko ? "결과로 말하는 사용자들" : "Users who speak with results"}
              </h2>
            </div>
          </Reveal>
          <div className="hp-g3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { initial: "K", name: ko ? "김** 대표님" : "Kim, CEO", role: ko ? "패션 쇼핑몰 | 3개월" : "Fashion | 3mo", text: ko ? "블로그 글 작성 시간이 2시간에서 5분으로 줄었어요. 외주비만 월 50만원 이상 절약하고 있습니다." : "Blog writing dropped from 2 hours to 5 minutes.", metric: ko ? "제작 시간 95% 단축" : "95% time saved" },
              { initial: "P", name: ko ? "박** 팀장님" : "Park, Lead", role: ko ? "마케팅 대행사 | 2개월" : "Agency | 2mo", text: ko ? "10개 클라이언트의 블로그를 혼자 관리할 수 있게 됐습니다. SEO 키워드 자동 반영이 강력해요." : "I manage 10 clients' blogs alone.", metric: ko ? "업무 효율 3배 향상" : "3x efficiency" },
              { initial: "L", name: ko ? "이** 크리에이터" : "Lee, Creator", role: ko ? "1인 크리에이터 | 1개월" : "Solo | 1mo", text: ko ? "인스타, 블로그, 스레드 콘텐츠를 한 번에 만들어서 매일 발행 중. 팔로워 3배 증가!" : "Content for all platforms at once.", metric: ko ? "발행량 5배 증가" : "5x output" },
            ].map((r, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div style={{ background: DARK2, borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.06)", height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: P, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{r.initial}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{r.role}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: 0, flex: 1 }}>"{r.text}"</p>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P }}>{r.metric}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 무료 횟수 + 요금 간략 ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="hp-g2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(360px,100%),1fr))", gap: 48, alignItems: "center" }}>
            <Reveal>
              <div>
                <span style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: P, background: PBG, padding: "4px 14px", borderRadius: 20, marginBottom: 16 }}>
                  {ko ? "무료 혜택" : "Free Benefits"}
                </span>
                <h2 style={{ fontSize: "clamp(26px,3.5vw,34px)", fontWeight: 700, color: TEXT, lineHeight: 1.25, margin: "0 0 14px" }}>
                  {ko ? <>매일 무료 횟수를<br/>쌓을 수 있어요.</> : <>Earn free credits<br/>every day.</>}
                </h2>
                <p style={{ fontSize: 16, color: SUB, lineHeight: 1.6, margin: "0 0 28px", whiteSpace: "pre-line" }}>
                  {ko ? "출석체크로 매일 AI 사용 횟수를 적립하세요.\n적립한 횟수로 AI 도구를 무료로 이용할 수 있어요." : "Earn credits through daily check-in.\nUse them for free AI tools."}
                </p>
                <button onClick={goAi} style={{ fontSize: 15, fontWeight: 600, padding: "12px 28px", borderRadius: 12, border: "none", background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                  {ko ? "무료로 시작하기" : "Start free"}
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { title: ko ? "회원가입 보너스" : "Signup", point: "+5", unit: ko ? "회" : "x", desc: ko ? "가입 즉시" : "Instant" },
                  { title: ko ? "매일 로그인" : "Daily", point: "+1", unit: ko ? "회" : "x", desc: ko ? "출석 체크" : "Check-in" },
                  { title: ko ? "비회원 무료" : "Guest", point: "5", unit: ko ? "회" : "x", desc: ko ? "로그인 불필요" : "No login" },
                ].map(item => (
                  <div key={item.title} style={{ background: BG2, borderRadius: 14, padding: "24px 20px", textAlign: "center", border: "1px solid " + BDR }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: P, marginBottom: 4 }}>{item.point}<span style={{ fontSize: 18 }}>{item.unit}</span></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: MUTED }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════ 요금 ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: BG2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: TEXT, letterSpacing: -0.5, margin: "0 0 12px" }}>{p("priceTitle")}</h2>
              <p style={{ fontSize: 16, color: SUB, lineHeight: 1.6 }}>{p("priceSub")}</p>
            </div>
          </Reveal>
          <div className="hp-g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              { icon: "FREE", title: ko?"비회원":"Guest", point: ko?"5회":"5x", desc: ko?"로그인 없이":"No login", onClick: goAi, btnText: ko?"무료 시작":"Start" },
              { icon: "+5", title: ko?"회원 가입":"Sign up", point: ko?"5회":"5x", desc: ko?"가입 즉시":"Instant", onClick: goAi, btnText: ko?"무료 시작":"Start" },
              { icon: "$9.9", title: "Basic", point: "50"+(ko?"회/월":"/mo"), desc: ko?"매일 꾸준히":"Daily", onClick: goPrice, btnText: ko?"요금 보기":"View" },
              { icon: "$19.9", title: "Pro", point: "200"+(ko?"회/월":"/mo"), desc: ko?"대량 + 자동":"Bulk", onClick: goPrice, btnText: ko?"요금 보기":"View", featured: true },
            ].map((pp, i) => (
              <Reveal key={pp.title} delay={i * 0.04}>
                <div style={{ background: BG, borderRadius: 16, padding: "28px 20px", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", border: pp.featured ? "2px solid " + P : "1px solid " + BDR, position: "relative" }}>
                  {pp.featured && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 700, background: P, color: "#fff", padding: "3px 12px", borderRadius: 10 }}>{getPageText(lang,"recommend")}</div>}
                  <div style={{ fontSize: 14, fontWeight: 700, color: pp.featured ? P : SUB, marginTop: pp.featured ? 14 : 0, marginBottom: 6 }}>{pp.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{pp.title}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: pp.featured ? P : TEXT, marginBottom: 8, letterSpacing: -1 }}>{pp.point}</div>
                  <div style={{ fontSize: 14, color: SUB, marginBottom: 20, flex: 1 }}>{pp.desc}</div>
                  <button onClick={pp.onClick} style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", background: pp.featured ? P : DARK, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{pp.btnText}</button>
                </div>
              </Reveal>
            ))}
          </div>
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

      {/* ══════ CTA (다크) ══════ */}
      <section className="hp-sec" style={{ padding: "clamp(80px,12vw,112px) clamp(20px,5vw,32px)", background: DARK, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(28px,4.5vw,44px)", fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.15, margin: "0 0 14px" }}>
              {ko ? "지금 바로 시작하세요." : "Start right now."}
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 32 }}>{p("ctaDesc")}</p>
            <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {[
                { num: "+5"+(ko?"회":"x"), label: ko?"가입 즉시":"Signup" },
                { num: "5"+(ko?"회":"x"), label: ko?"비회원 무료":"Guest" },
                { num: ko?"0원":"$0", label: ko?"카드 불필요":"No card" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{s.num}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={goAi} style={{ fontSize: 16, fontWeight: 600, padding: "14px 32px", borderRadius: 12, border: "none", background: P, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {ko ? "무료로 시작하기" : "Get started free"}
              </button>
              <button onClick={goPrice} style={{ fontSize: 15, fontWeight: 600, padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                {ko ? "요금 알아보기" : "See pricing"}
              </button>
            </div>
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
