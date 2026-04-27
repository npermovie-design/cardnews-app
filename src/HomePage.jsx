import { useState, useEffect, useRef, useCallback } from "react";
import { SecWrap, SecTitle, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

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

/* ── 숫자 카운트업 애니메이션 ── */
function CountUp({ end, duration = 1.5, suffix = "", prefix = "" }) {
  const [ref, inView] = useInView(0.3);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / (duration * 1000);
      if (elapsed >= 1) { setCount(end); clearInterval(timer); return; }
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setCount(Math.floor(eased * end));
    }, 30);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ── FAQ 아코디언 아이템 ── */
function FaqItem({ q, a, C }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.card, border: "1px solid " + C.border, borderRadius: 14,
      marginBottom: 10, overflow: "hidden", transition: "all 0.2s",
    }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{
        width: "100%", padding: "18px 20px", display: "flex", justifyContent: "space-between",
        alignItems: "center", background: "none", border: "none", cursor: "pointer",
        fontSize: 15, fontWeight: 700, color: C.text, textAlign: "left", gap: 12,
      }}>
        <span>{q}</span>
        <span style={{
          fontSize: 18, color: C.muted, transition: "transform 0.25s", flexShrink: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.3s ease",
      }}>
        <div style={{ padding: "0 20px 18px", fontSize: 14, color: C.muted, lineHeight: 1.85 }}>
          {a}
        </div>
      </div>
    </div>
  );
}

/* ── 추상 SVG mockup: 실제 스크린샷 대용 (지금 서비스 형태 반영) ── */
function MockupAiHome() { return null; }

function MockupBlogWriter() {
  // 실제 인터페이스와 유사한 글쓰기 목업
  const platforms = [
    { name: "네이버 블로그", color: "#03c75a", active: true },
    { name: "네이버 카페", color: "#03c75a", active: false },
    { name: "티스토리", color: "#eb5d00", active: false },
    { name: "인스타그램", color: "#e4405f", active: false },
    { name: "스레드", color: "#000", active: false },
  ];
  return (
    <div style={{ background: "linear-gradient(180deg, #f8f7ff 0%, #fff 100%)", padding: "20px 16px 0" }}>
      {/* 입력 필드 */}
      <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "#bbb", fontWeight: 500 }}>핵심 키워드를 입력하세요</div>
      </div>
      {/* 옵션 버튼 행 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        {["파일", "링크", "설정"].map(t => (
          <span key={t} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", color: "#666", fontWeight: 600, background: "#fff" }}>{t}</span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, padding: "6px 18px", borderRadius: 10, background: "#7c6aff", color: "#fff", fontWeight: 700 }}>생성 30P</span>
      </div>
      {/* 플랫폼 탭 */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 16 }}>
        {platforms.map(p => (
          <span key={p.name} style={{
            fontSize: 11, padding: "5px 12px", borderRadius: 8, fontWeight: 600,
            background: p.active ? "#fff" : "transparent",
            color: p.active ? p.color : "#999",
            border: p.active ? `1.5px solid ${p.color}` : "1px solid #e5e7eb",
          }}>{p.name}</span>
        ))}
        <span style={{ fontSize: 11, padding: "5px 10px", color: "#999", fontWeight: 500 }}>+15</span>
      </div>
    </div>
  );
}

function MockupDetailPage() {
  // 상세페이지 섹션 형태
  return (
    <svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
      <defs>
        <linearGradient id="dp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff5f8"/>
          <stop offset="1" stopColor="#fff"/>
        </linearGradient>
        <linearGradient id="dp-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6"/>
          <stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      <rect width="760" height="360" fill="url(#dp-bg)"/>
      {/* 히어로 섹션 */}
      <rect x="60" y="30" width="640" height="120" rx="14" fill="url(#dp-hero)"/>
      <rect x="90" y="60" width="220" height="14" rx="3" fill="#fff" opacity="0.95"/>
      <rect x="90" y="84" width="320" height="9" rx="2" fill="#fff" opacity="0.7"/>
      <rect x="90" y="100" width="280" height="9" rx="2" fill="#fff" opacity="0.7"/>
      <rect x="90" y="118" width="100" height="22" rx="11" fill="#fff"/>
      {/* 콘텐츠 섹션 3개 */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={60 + i * 220} y="170" width="200" height="160" rx="12" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5"/>
          <rect x={76 + i * 220} y="188" width="168" height="80" rx="8" fill="#8b5cf6" fillOpacity={0.08 + i * 0.04}/>
          <circle cx={160 + i * 220} cy="228" r="20" fill="#8b5cf6" fillOpacity="0.4"/>
          <rect x={76 + i * 220} y="282" width="120" height="10" rx="2" fill="#1a1a2e" opacity="0.75"/>
          <rect x={76 + i * 220} y="300" width="160" height="7" rx="2" fill="#1a1a2e" opacity="0.35"/>
          <rect x={76 + i * 220} y="312" width="100" height="7" rx="2" fill="#1a1a2e" opacity="0.35"/>
        </g>
      ))}
    </svg>
  );
}

/* ── Before/After 비교 카드 ── */
function BeforeAfterCard({ before, after, C, lang }) {
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", minHeight: 120 }}>
        <div style={{ padding: "20px 18px", background: "rgba(239,68,68,0.04)", borderRight: "1px solid " + C.border }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", letterSpacing: 1, marginBottom: 8 }}>BEFORE</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{before}</div>
        </div>
        <div style={{ padding: "20px 18px", background: "rgba(34,197,94,0.04)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", letterSpacing: 1, marginBottom: 8 }}>AFTER</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontWeight: 600 }}>{after}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ navigate, C, theme, user, onLoginRequest, setAiMenu }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);

  // 실시간 통계 (Supabase에서 posts 수 가져오기)
  const [statsCount, setStatsCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase.from("posts").select("*", { count: "exact", head: true });
        if (count != null) setStatsCount(count);
      } catch {}
    })();
  }, []);

  /* 배경 장식 */

  return (
    <div>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes kw-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .kw-scroll-wrap { overflow:hidden; }
        .kw-scroll-inner { display:flex; gap:6px; animation:kw-scroll 20s linear infinite; width:max-content; }
        .kw-scroll-inner:hover { animation-play-state:paused; }
        .platform-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:12px; }
        .platform-row img { width:22px; height:22px; border-radius:6px; opacity:0.85; transition:all 0.2s; }
        .platform-row img:hover { opacity:1; transform:scale(1.15); }
        .hero-shot { transition:transform 0.4s cubic-bezier(.25,.8,.25,1), box-shadow 0.4s; }
        .hero-shot:hover { transform:rotate(0deg) scale(1.06) translateY(-10px) !important; box-shadow:0 28px 70px rgba(124,106,255,0.22), 0 0 0 2px rgba(124,106,255,0.35) !important; z-index:10 !important; }
        .hero-gallery { overflow:visible; }
        .mobile-only { display:none; }
        @media(max-width:768px){
          .hero-gallery { height:auto !important; position:relative !important; perspective:none !important; display:grid !important; grid-template-columns:1fr 1fr !important; gap:10px !important; padding:0 8px !important; }
          .hero-shot { position:relative !important; left:auto !important; top:auto !important; width:100% !important; transform:rotate(0deg) !important; animation:none !important; }
        }
        @media(max-width:768px){
          .hero-particle{display:none!important}
          .tool-card:hover,.review-card:hover,.stat-card:hover,.hover-lift:hover{transform:none!important;box-shadow:none!important}
          .pain-grid{grid-template-columns:1fr!important}
          .compare-table{font-size:11px!important}
          .compare-table th,.compare-table td{padding:10px 6px!important}
          .point-grid{grid-template-columns:1fr 1fr!important}
          .home-hero-section{padding:48px 16px 36px!important}
          .home-hero-inner{gap:22px!important}
          .home-hero-copy{text-align:left!important;flex-basis:100%!important}
          .home-hero-copy h1{font-size:30px!important;line-height:1.18!important;letter-spacing:0!important;margin-bottom:12px!important}
          .home-hero-sub{font-size:14px!important;line-height:1.65!important;margin-bottom:8px!important}
          .home-hero-note{font-size:12px!important;margin-bottom:18px!important}
          .home-hero-button{width:100%!important;min-height:52px!important}
          .home-hero-visual{flex-basis:100%!important;min-width:0!important}
          .home-hero-visual img:first-child{border-radius:12px!important}
          .home-hero-visual img:last-child{right:8px!important;bottom:-10px!important;width:48%!important;border-radius:10px!important}
          .mobile-priority-list > div:nth-child(n+5){display:none!important}
          .desktop-compare{display:none!important}
          .mobile-only{display:grid!important}
          .mobile-sticky-cta{display:flex!important}
        }
        @media(max-width:480px){
          section{padding-left:12px!important;padding-right:12px!important}
          h1{font-size:26px!important}
          h2{font-size:20px!important}
          .compare-table{font-size:11px!important;min-width:auto!important}
          .compare-table th,.compare-table td{padding:8px 4px!important;font-size:11px!important}
          .point-grid{grid-template-columns:1fr!important}
        }
        .tool-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 48px rgba(124,106,255,0.2) !important; }
        .review-card:hover { transform: translateY(-4px) !important; }
        .stat-card:hover { transform: scale(1.04) !important; }
        .hover-lift { transition: all 0.25s; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(124,106,255,0.12); }
      `}</style>

      {/* ══ 히어로 (위노트 스타일 - 좌 텍스트 + 우 스크린샷) ══ */}
      <section className="home-hero-section" style={{
        padding: "clamp(80px,10vw,140px) clamp(16px,4vw,24px) clamp(60px,8vw,80px)",
        background: C.heroBg,
      }}>
        <div className="home-hero-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: "clamp(32px,5vw,60px)", flexWrap: "wrap" }}>
          {/* 왼쪽: 텍스트 */}
          <div className="home-hero-copy" style={{ flex: "1 1 400px", minWidth: 280 }}>
            <h1 style={{ fontSize: "clamp(28px,4.5vw,44px)", fontWeight: 900, lineHeight: 1.25, letterSpacing: -1.5, color: C.text, margin: "0 0 16px" }}>
              {lang === "ko" ? <>블로그·인스타·쇼츠,<br/><span style={{ color: "#7c6aff" }}>AI로 한 번에 제작</span></> : <>Blogs, Instagram, shorts,<br/><span style={{ color: "#7c6aff" }}>created with AI</span></>}
            </h1>
            <p className="home-hero-sub" style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, margin: "0 0 8px" }}>
              {lang === "ko"
                ? "키워드만 입력하면 SNS 콘텐츠 초안부터 발행 준비까지 빠르게 완성하세요."
                : "Enter a keyword and prepare social content drafts for every channel."}
            </p>
            <p className="home-hero-note" style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>
              {lang === "ko" ? "비회원 5회 무료 · 가입 시 150P · 카드 등록 불필요" : "5 guest trials · 150P on signup · no card needed"}
            </p>
            <Btn className="home-hero-button" C={C} onClick={() => navigate("ai")} style={{ fontSize: 16, padding: "14px 40px" }}>{lang === "ko" ? "무료로 시작하기" : "Start free"}</Btn>
          </div>
          {/* 오른쪽: 서비스 스크린샷 */}
          <div className="home-hero-visual" style={{ flex: "1 1 440px", minWidth: 280, position: "relative" }}>
            <img src="/hero-writing.png" alt={lang === "ko" ? "AI 글쓰기" : "AI Writing"} loading="eager"
              style={{ width: "100%", borderRadius: 16, boxShadow: "0 16px 60px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)" }} />
            <img src="/hero-generating.png" alt={lang === "ko" ? "AI 생성 중" : "AI Generating"} loading="eager"
              style={{ position: "absolute", right: -20, bottom: -20, width: "55%", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)" }} />
          </div>
        </div>
      </section>

      {/* ══ 페인 포인트 섹션 ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
                {lang === "ko" ? "이런 고민, 하고 계시죠?" : "Sound familiar?"}
              </h2>
              <p style={{ fontSize: 15, color: C.muted }}>
                {lang === "ko" ? "콘텐츠 제작에 지치신 분들을 위해 만들었습니다." : "Built for those tired of content creation."}
              </p>
            </div>
          </FadeIn>
          <div className="pain-grid mobile-priority-list" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: lang === "ko" ? "키워드 찾는 데만 1시간" : "1 hour just finding keywords", quote: lang === "ko" ? "뭘 써야 할지 몰라 매번 검색만 하다 시간이 다 가요" : "I spend all my time searching without knowing what to write" },
              { title: lang === "ko" ? "블로그 글 하나에 반나절" : "Half a day for one blog post", quote: lang === "ko" ? "SEO 최적화까지 신경 쓰면 하루가 다 갑니다" : "Add SEO optimization and a whole day is gone" },
              { title: lang === "ko" ? "SNS 채널마다 따로 제작" : "Separate content per channel", quote: lang === "ko" ? "같은 내용을 인스타, 블로그, 스레드에 각각 올리느라 지쳐요" : "Exhausted posting the same content separately" },
              { title: lang === "ko" ? "매일 올리기가 너무 힘들어요" : "Posting daily is exhausting", quote: lang === "ko" ? "꾸준히 올려야 되는 건 알지만 매번 아이디어가 바닥나요" : "I know I need to post consistently but I run out of ideas" },
              { title: lang === "ko" ? "영상 제작은 너무 복잡해요" : "Video creation is too complex", quote: lang === "ko" ? "촬영, 편집, 자막... 쇼츠 하나 만드는 데 반나절이 걸려요" : "Filming, editing, subtitles... half a day for one short" },
            ].map((pain, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div style={{
                  background: C.card, border: "1px solid " + C.border, borderRadius: 14,
                  padding: "24px 22px", height: "100%",
                }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1.4 }}>{pain.title}</div>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                    &ldquo;{pain.quote}&rdquo;
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 핵심 기능 벤토 그리드 ══ */}
      <SecWrap C={C} bg={C.bg2} style={{ scrollMarginTop: 80 }} id="features-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
            {lang === "ko" ? "시작부터 성장까지 쉬워집니다" : "Easy from start to growth"}
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
            {lang === "ko" ? "20가지 AI 도구로 SNS 콘텐츠 제작의 모든 과정을 자동화하세요." : "Automate every step of SNS content creation with 20+ AI tools."}
          </p>
        </div>

        {/* AI 자동 영상 제작 + SNS 발행 - 2열 배너 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 16, marginBottom: 16 }}>
          {/* 영상 제작 */}
          <FadeIn>
            <div onClick={() => navigate("ai")} className="hover-lift" style={{ background: "linear-gradient(135deg, #1a1030 0%, #2d1b69 50%, #1a1030 100%)", border: "1px solid rgba(124,106,255,0.3)", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexWrap: "wrap", alignItems: "center", height: "100%" }}>
              <div style={{ flex: "1 1 240px", padding: "28px 24px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#7c6aff,#ec4899)", padding: "3px 10px", borderRadius: 6 }}>NEW</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>{lang === "ko" ? "AI 자동 영상 제작" : "AI Auto Video"}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "유튜브 링크 하나로\n쇼츠 영상을 자동 제작" : "Auto-create shorts\nfrom a YouTube link"}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  {lang === "ko" ? "AI가 영상을 분석하고 자막과 함께 쇼츠를 자동으로 만들어줍니다." : "AI analyzes videos and auto-creates shorts with subtitles."}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(lang === "ko" ? ["자동 구간 분석","자막 자동 생성","타임라인 편집"] : ["Auto analysis","Auto subtitles","Timeline editor"]).map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(124,106,255,0.15)", color: "#a5b4fc", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ flex: "0 0 140px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 100, height: 160, borderRadius: 12, background: "#000", border: "2px solid rgba(124,106,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(124,106,255,0.3)" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 6 }}><rect x="2" y="4" width="20" height="16" rx="3" stroke="#7c6aff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#7c6aff"/></svg>
                  <div style={{ fontSize: 9, color: "#a5b4fc", fontWeight: 700 }}>9:16 Shorts</div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* SNS 다중 발행 */}
          <FadeIn delay={0.1}>
            <div onClick={() => { navigate("ai"); setAiMenu && setAiMenu("sns_publish"); }} className="hover-lift" style={{ background: "linear-gradient(135deg, #0c1a2e 0%, #1a3a5c 50%, #0c1a2e 100%)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexWrap: "wrap", alignItems: "center", height: "100%" }}>
              <div style={{ flex: "1 1 240px", padding: "28px 24px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#38bdf8,#06b6d4)", padding: "3px 10px", borderRadius: 6 }}>NEW</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc" }}>{lang === "ko" ? "SNS 다중 발행" : "SNS Multi-Publish"}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "한 번에 여러 플랫폼에\n콘텐츠를 발행하세요" : "Publish content to\nmultiple platforms at once"}
                </h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  {lang === "ko" ? "YouTube, Instagram, Threads, TikTok에 동시 업로드" : "Upload simultaneously to YouTube, Instagram, Threads, TikTok"}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(lang === "ko" ? ["다중 플랫폼","미리보기","발행 히스토리"] : ["Multi-platform","Preview","Publish history"]).map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(56,189,248,0.15)", color: "#7dd3fc", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ flex: "0 0 140px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {/* SNS 플랫폼 아이콘 그리드 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { src: "/icon-youtube.png", alt: "YouTube" },
                      { src: "/icon-instagram.webp", alt: "Instagram" },
                      { src: "/icon-threads.png", alt: "Threads" },
                      { src: null, alt: "TikTok", svg: true },
                    ].map(p => (
                      <div key={p.alt} style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(56,189,248,0.2)" }}>
                        {p.svg ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="#7dd3fc"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.54a8.27 8.27 0 0 0 4.76 1.5V6.69h-1z"/></svg>
                        ) : (
                          <img src={p.src} alt={p.alt} style={{ width: 22, height: 22, objectFit: "contain" }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" style={{ marginTop: 2 }}>
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 벤토 그리드 - Cutback 스타일 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
          {/* 글쓰기 - 대형 카드 */}
          <FadeIn style={{ gridColumn: "span 1" }}>
            <div onClick={() => navigate("ai")} className="hover-lift" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", cursor: "pointer", height: "100%" }}>
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>{lang === "ko" ? "SNS 글쓰기" : "SNS Writing"}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "키워드만 입력하면\nAI가 글을 완성해요" : "Just enter keywords,\nAI completes the article"}
                </h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                  {lang === "ko" ? "네이버 블로그, 인스타, 유튜브 대본까지 20개+ 플랫폼 지원" : "Supports 20+ platforms including Naver Blog, Instagram, YouTube"}
                </p>
                <div className="platform-row">
                  {[{src:"/icon-naver-blog.png",alt:"네이버"},{src:"/icon-naver-cafe.webp",alt:"카페"},{src:"/icon-tistory.png",alt:"티스토리"},{src:"/icon-instagram.webp",alt:"인스타"},{src:"/icon-threads.png",alt:"스레드"},{src:"/icon-youtube.png",alt:"유튜브"}].map(p => (
                    <img key={p.alt} src={p.src} alt={p.alt} title={p.alt} />
                  ))}
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>+14</span>
                </div>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 16px 16px" }}>
                <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
                  <MockupBlogWriter />
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 오늘의 추천 키워드 */}
          <FadeIn delay={0.1} style={{ gridColumn: "span 1" }}>
            <div onClick={() => navigate("ai")} className="hover-lift" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", cursor: "pointer", height: "100%" }}>
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>{lang === "ko" ? "추천 키워드" : "Trending Keywords"}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "오늘 뜨는 키워드로\n바로 글쓰기 시작" : "Start writing with\ntoday's hot keywords"}
                </h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                  {lang === "ko" ? "네이버·구글 실시간 트렌드 320개+ 키워드, 클릭 한 번으로 글쓰기" : "320+ real-time trending keywords from Naver & Google, one-click writing"}
                </p>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 16px 16px" }}>
                <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)", background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#f8f7ff", padding: "16px 14px" }}>
                  <div className="kw-scroll-wrap">
                    <div className="kw-scroll-inner">
                      {["AI 도구","블로그","유튜브","인스타","틱톡","마케팅","이커머스","트렌드","뷰티","건강","부업","재테크","자기계발","여행","AI 도구","블로그","유튜브","인스타","틱톡","마케팅","이커머스","트렌드","뷰티","건강","부업","재테크","자기계발","여행"].map((t, i) => (
                        <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", background: i % 14 === 0 ? "#7c6aff" : theme === "dark" ? "rgba(255,255,255,0.06)" : "#f0eeff", color: i % 14 === 0 ? "#fff" : theme === "dark" ? "rgba(255,255,255,0.6)" : "#6b5ce7", fontWeight: 600, border: `1px solid ${i % 14 === 0 ? "#7c6aff" : theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(124,106,255,0.15)"}` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {["AI 마케팅 자동화","숏폼 콘텐츠 전략","네이버 SEO 최적화","인스타 릴스 트렌드"].map(k => (
                      <div key={k} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff", color: C.text, fontWeight: 600, border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#eee"}`, transition: "all 0.2s", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c6aff"; e.currentTarget.style.background = "rgba(124,106,255,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "#eee"; e.currentTarget.style.background = theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff"; }}
                      >{k}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 하단 4열 소형 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 14, marginTop: 16 }}>
          {[
            { title: lang === "ko" ? "20개+ 플랫폼" : "20+ Platforms", desc: lang === "ko" ? "네이버·카페·티스토리·인스타·스레드·유튜브·X·페이스북·LinkedIn·Medium 등" : "Naver, Cafe, Tistory, Instagram, Threads, YouTube, X, Facebook, LinkedIn, Medium & more", nav: "ai" },
            { title: lang === "ko" ? "무료 자료실" : "Free Resources", desc: lang === "ko" ? "프리미어프로 자동편집, SNS 자동화 등 무료 프로그램 다운로드" : "Free downloads: Premiere auto-edit, SNS automation tools", nav: "programs" },
            { title: lang === "ko" ? "정보공유 커뮤니티" : "Community", desc: lang === "ko" ? "마케팅·AI 뉴스, 키워드 추천, 노하우 가이드가 매일 자동 업데이트" : "Daily auto-updated marketing & AI news, keyword tips, guides", nav: "community/info" },
            { title: lang === "ko" ? "SNS 자동 발행" : "Auto Publish", desc: lang === "ko" ? "스레드·네이버 블로그·티스토리 계정 연동 후 원클릭 발행" : "One-click publish to Threads, Naver Blog, Tistory after linking", nav: "ai" },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div onClick={() => navigate(f.nav)} className="hover-lift" style={{
                background: C.card, border: "1px solid " + C.border, borderRadius: 14,
                padding: "22px 18px", cursor: "pointer", height: "100%",
              }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>

      </SecWrap>

      {/* ══ 경쟁사 비교표 ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Comparison</div>
              <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
                {lang === "ko" ? "왜 SNS메이킷인가요?" : "Why SNS Makeit?"}
              </h2>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
                {lang === "ko" ? "주요 서비스와 비교해보세요. SNS메이킷만의 차별점을 확인하세요." : "Compare with major services. See what makes SNS Makeit different."}
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="mobile-only" style={{ gridTemplateColumns: "1fr", gap: 10, display: "none", marginBottom: 18 }}>
              {(lang === "ko" ? [
                { title: "콘텐츠 제작 시간", desc: "여러 채널용 초안을 한 번에 만들고 수정 시간을 줄입니다." },
                { title: "한국 SNS 최적화", desc: "네이버 블로그, 인스타, 스레드, 티스토리 흐름에 맞춰 작성합니다." },
                { title: "자동 발행 준비", desc: "계정 연동 후 발행까지 이어지는 작업 흐름을 제공합니다." },
                { title: "카드 없이 무료 체험", desc: "비회원 5회 무료, 가입 시 150P로 바로 테스트할 수 있습니다." },
              ] : [
                { title: "Less production time", desc: "Create drafts for multiple channels and reduce editing work." },
                { title: "Korean SNS optimized", desc: "Built around Naver Blog, Instagram, Threads, and Tistory workflows." },
                { title: "Publishing workflow", desc: "Prepare content and publish after connecting accounts." },
                { title: "Free trial, no card", desc: "Try 5 times as a guest and get 150P on signup." },
              ]).map((item, i) => (
                <div key={item.title} style={{
                  background: i === 0 ? "rgba(124,106,255,0.06)" : C.card,
                  border: "1px solid " + (i === 0 ? "rgba(124,106,255,0.22)" : C.border),
                  borderRadius: 12, padding: "16px 15px",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 5 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div className="desktop-compare" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="compare-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "clamp(11px, 2.5vw, 13px)", color: C.text }}>
                <thead>
                  <tr>
                    <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: "2px solid " + C.border, fontSize: "clamp(10px, 2.2vw, 12px)" }}>
                      {lang === "ko" ? "기능" : "Feature"}
                    </th>
                    {[
                      { name: "SNS메이킷", highlight: true },
                      { name: lang === "ko" ? "AI 챗봇" : "AI Chatbot", highlight: false },
                      { name: lang === "ko" ? "디자인 도구" : "Design Tool", highlight: false },
                      { name: lang === "ko" ? "개별 도구" : "Individual", highlight: false },
                    ].map(col => (
                      <th key={col.name} style={{
                        padding: "14px 10px", textAlign: "center", fontWeight: 800, fontSize: "clamp(10px, 2.2vw, 12px)",
                        color: col.highlight ? "#fff" : C.text,
                        background: col.highlight ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "transparent",
                        borderBottom: col.highlight ? "none" : "2px solid " + C.border,
                        borderRadius: col.highlight ? "12px 12px 0 0" : 0,
                      }}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: lang === "ko" ? "콘텐츠 제작 시간" : "Content creation time", vals: [lang === "ko" ? "3분" : "3min", lang === "ko" ? "30분+" : "30min+", lang === "ko" ? "20분+" : "20min+", lang === "ko" ? "2시간+" : "2hrs+"] },
                    { feature: lang === "ko" ? "블로그+키워드+영상 통합" : "Detail+Blog+Video integrated", vals: ["check", "cross", "cross", "cross"] },
                    { feature: lang === "ko" ? "SEO 최적화 글쓰기" : "SEO writing", vals: ["check", "cross", "cross", "cross"] },
                    { feature: lang === "ko" ? "추천 키워드 320+" : "AI image gen/edit", vals: ["check", "cross", "partial", "partial"] },
                    { feature: lang === "ko" ? "한국 SNS 최적화" : "Korean SNS", vals: ["check", "cross", "cross", "partial"] },
                    { feature: lang === "ko" ? "SNS 자동 발행" : "Auto-publish", vals: ["check", "cross", "cross", "cross"] },
                    { feature: lang === "ko" ? "무료 체험 (카드 불필요)" : "Free (no card)", vals: ["check", "partial", "partial", "partial"] },
                  ].map((row, ri) => (
                    <tr key={row.feature} style={{ background: ri % 2 === 0 ? ("rgba(124,106,255,0.02)") : "transparent" }}>
                      <td style={{ padding: "clamp(10px, 2vw, 14px) clamp(6px, 1.5vw, 16px)", fontWeight: 600, borderBottom: "1px solid " + C.border, fontSize: "clamp(11px, 2.5vw, 13px)" }}>{row.feature}</td>
                      {row.vals.map((v, ci) => (
                        <td key={ci} style={{
                          padding: "clamp(10px, 2vw, 14px) clamp(6px, 1.5vw, 12px)", textAlign: "center", borderBottom: "1px solid " + C.border,
                          background: ci === 0 ? ("rgba(124,106,255,0.04)") : "transparent",
                          fontWeight: ci === 0 ? 700 : 400,
                          color: v === "check" ? "#22c55e" : v === "cross" ? (C.muted) : v === "partial" ? "#f59e0b" : (ci === 0 ? "#7c6aff" : C.text),
                        }}>
                          {v === "check" ? <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill={ci === 0 ? "rgba(124,106,255,0.1)" : "rgba(34,197,94,0.1)"} stroke={ci === 0 ? "#7c6aff" : "#22c55e"} strokeWidth="1.5"/><path d="M7 11l3 3 5-5" stroke={ci === 0 ? "#7c6aff" : "#22c55e"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                            : v === "cross" ? <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5"/><path d="M8 8l6 6M14 8l-6 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/></svg>
                            : v === "partial" ? <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{lang === "ko" ? "일부" : "Partial"}</span>
                            : <span style={{ fontWeight: 800, color: ci === 0 ? "#7c6aff" : C.text }}>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "무료로 시작하기" : "Start free"} →</Btn>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 안전한 AI 강조 ══ */}
      <section style={{ padding: "clamp(60px,8vw,80px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ background: "linear-gradient(180deg, rgba(34,197,94,0.04) 0%, rgba(124,106,255,0.04) 100%)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 24, padding: "clamp(32px,5vw,48px)", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(34,197,94,0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 style={{ fontSize: "clamp(20px,3.5vw,28px)", fontWeight: 800, color: C.text, margin: "0 0 12px", letterSpacing: -0.5 }}>
                {lang === "ko" ? "AI가 만들고, 내가 결정하는 콘텐츠" : "AI creates, you decide"}
              </h3>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.85, maxWidth: 600, margin: "0 auto 28px" }}>
                {lang === "ko"
                  ? "AI가 초안을 만들고, 직접 검토한 뒤 발행하세요. 콘텐츠의 품질과 톤을 완벽하게 컨트롤할 수 있습니다."
                  : "AI drafts the content, you review and publish. Full control over quality and tone."}
              </p>
              <div style={{ display: "flex", gap: "clamp(12px,3vw,24px)", justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  lang === "ko" ? "AI 초안 → 내가 검토" : "AI draft → You review",
                  lang === "ko" ? "톤·스타일 완벽 제어" : "Full tone control",
                  lang === "ko" ? "원클릭 발행 또는 수정" : "One-click publish or edit",
                ].map(text => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(12px,2.5vw,14px)", fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ color: C.text }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 콘텐츠 제작 시간 92% 단축 (위노트 스타일 비포/애프터) ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(26px,4.5vw,44px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
                {lang === "ko" ? <>콘텐츠 제작 시간 <span style={{ color: "#7c6aff" }}>92% 단축</span></> : <>Content creation time <span style={{ color: "#7c6aff" }}>92% reduced</span></>}
              </h2>
              <p style={{ fontSize: 15, color: C.muted }}>
                {lang === "ko" ? "매일 2시간 걸리던 작업, SNS메이킷으로 10분이면 끝" : "2 hours daily → done in 10 minutes with SNS Makeit"}
              </p>
            </div>
          </FadeIn>

          {/* 2컬럼 시간 비교 카드 */}
          <FadeIn delay={0.1}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }} className="pain-grid">
              {/* 기존 방식 */}
              <div style={{ padding: "32px 28px", borderRadius: 20, background: C.card, border: "1px solid " + C.border }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", letterSpacing: 1, marginBottom: 8 }}>{lang === "ko" ? "기존 방식" : "Before"}</div>
                <div style={{ fontSize: "clamp(36px,6vw,52px)", fontWeight: 900, color: "#ef4444", marginBottom: 4 }}>2{lang === "ko" ? "시간" : "hrs"}</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{lang === "ko" ? "일 평균 소요 시간" : "Avg. daily time"}</div>
                {(lang === "ko"
                  ? ["키워드 조사에 매번 30분 이상 소요", "블로그 글 하나에 1시간, SEO 별도 조사", "인스타·블로그·스레드 각각 따로 작성", "쇼츠 영상 촬영·편집·자막 반나절", "콘텐츠 아이디어 고갈로 매번 고민"]
                  : ["30+ min keyword research each time", "1 hour per blog post + SEO", "Write separately for each platform", "Half day for short video editing", "Content idea exhaustion"]
                ).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="10" cy="10" r="9" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* SNS메이킷 사용 */}
              <div style={{ padding: "32px 28px", borderRadius: 20, background: theme === "dark" ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.03)", border: "2px solid rgba(124,106,255,0.2)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 1, marginBottom: 8 }}>SNS메이킷</div>
                <div style={{ fontSize: "clamp(36px,6vw,52px)", fontWeight: 900, color: "#7c6aff", marginBottom: 4 }}>10{lang === "ko" ? "분" : "min"}</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{lang === "ko" ? "일 평균 소요 시간" : "Avg. daily time"}</div>
                {(lang === "ko"
                  ? ["AI 추천 키워드 320개로 바로 글쓰기 시작", "SEO 최적화 블로그 글 3분 완성", "한 번에 20개+ 플랫폼용 콘텐츠 동시 생성", "유튜브 링크 하나로 60초 쇼츠 자동 제작", "오늘의 키워드로 매일 새로운 아이디어"]
                  : ["Start writing with 320 AI-recommended keywords", "SEO-optimized blog in 3 minutes", "Generate for 20+ platforms at once", "Auto 60-sec shorts from YouTube link", "Fresh ideas daily with trending keywords"]
                ).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="10" cy="10" r="9" fill="rgba(124,106,255,0.1)" stroke="#7c6aff" strokeWidth="1.5"/><path d="M6 10l3 3 5-5" stroke="#7c6aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <div style={{ textAlign: "center" }}>
            <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "무료로 시작하기" : "Start for free"} →</Btn>
          </div>
        </div>
      </section>

      {/* ══ 실사용 후기 ══ */}
      <SecWrap C={C} bg={C.bg}>
        <SecTitle C={C} badge={lang === "ko" ? "후기" : "Reviews"} title={lang === "ko" ? "실제 사용자의 이야기" : "Real user stories"} sub={lang === "ko" ? "SNS메이킷으로 콘텐츠 제작을 혁신한 분들의 후기입니다." : "Stories from those who transformed their content creation."} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
          {[
            {
              initial: "K", color: "#7c6aff",
              name: lang === "ko" ? "김** 대표님" : "Kim, CEO",
              industry: lang === "ko" ? "패션 쇼핑몰 운영 | 사용 3개월" : "Fashion e-commerce | 3 months",
              text: lang === "ko" ? "블로그 글 작성 시간이 2시간에서 5분으로 줄었어요. 외주비만 월 50만원 이상 절약하고 있습니다. 디자이너 없이도 프로급 결과물이 나옵니다." : "Detail page creation went from 2 hours to 5 minutes. Saving over 500K KRW monthly in outsourcing costs.",
              metric: lang === "ko" ? "제작 시간 95% 단축" : "95% time reduction",
              stars: 5,
            },
            {
              initial: "P", color: "#ec4899",
              name: lang === "ko" ? "박** 팀장님" : "Park, Team Lead",
              industry: lang === "ko" ? "마케팅 대행사 | 사용 2개월" : "Marketing agency | 2 months",
              text: lang === "ko" ? "10개 클라이언트의 블로그를 혼자 관리할 수 있게 됐습니다. 특히 SEO 키워드 자동 반영 기능이 정말 강력해요. 검색 유입이 눈에 띄게 늘었습니다." : "I can now manage 10 clients' blogs by myself. The SEO keyword feature is powerful.",
              metric: lang === "ko" ? "업무 효율 3배 향상" : "3x efficiency gain",
              stars: 5,
            },
            {
              initial: "L", color: "#22c55e",
              name: lang === "ko" ? "이** 크리에이터" : "Lee, Creator",
              industry: lang === "ko" ? "1인 크리에이터 | 사용 1개월" : "Solo creator | 1 month",
              text: lang === "ko" ? "인스타, 블로그, 스레드 콘텐츠를 한 번에 만들어서 매일 발행하고 있어요. 팔로워 증가 속도가 3배 빨라졌습니다." : "I create content for all platforms at once and publish daily. Follower growth tripled.",
              metric: lang === "ko" ? "발행량 5배 증가" : "5x content output",
              stars: 5,
            },
          ].map((r, i) => (
            <FadeIn key={r.initial} delay={i * 0.08}>
              <div className="review-card" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, boxShadow: C.shadow, transition: "all 0.25s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${r.color},${r.color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{r.initial}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{r.industry}</div>
                  </div>
                </div>
                <div style={{ color: "#f59e0b", fontSize: 14, letterSpacing: 2 }}>{"★".repeat(r.stars)}</div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.8, margin: 0, flex: 1 }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7c6aff", background: "rgba(124,106,255,0.08)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  {r.metric}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ 이런 분들이 사용 중 ══ */}
      <section style={{ padding: "clamp(40px,6vw,60px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 24, letterSpacing: 2, textTransform: "uppercase" }}>
            {lang === "ko" ? "다양한 분야에서 활용 중" : "Used across industries"}
          </div>
          <div style={{ display: "flex", gap: "clamp(10px,2vw,18px)", justifyContent: "center", flexWrap: "wrap" }}>
            {(lang === "ko"
              ? ["쇼핑몰 운영자", "마케팅 대행사", "1인 크리에이터", "스타트업", "블로거", "프리랜서"]
              : ["E-commerce", "Agencies", "Creators", "Startups", "Bloggers", "Freelancers"]
            ).map(label => (
              <div key={label} style={{
                padding: "10px 18px", borderRadius: 999,
                border: "1px solid " + C.border, background: C.card,
                fontSize: 13, fontWeight: 600, color: C.text,
              }}>
                {label}
              </div>
            ))}
          </div>
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
                <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "무료로 시작하기" : "Start free"}</Btn>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="point-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { title: lang === "ko" ? "회원가입 보너스" : "Sign-up bonus", point: "+150P", desc: lang === "ko" ? "가입 즉시 지급" : "Instant upon sign-up", color: "#ec4899" },
                  { title: lang === "ko" ? "매일 로그인" : "Daily login", point: "+3P", desc: lang === "ko" ? "하루 한 번 접속만 해도" : "Just log in once a day", color: "#7c6aff" },
                  { title: lang === "ko" ? "게시글 작성" : "Write a post", point: "+1P", desc: lang === "ko" ? "하루 최대 10회까지" : "Up to 10 times a day", color: "#22c55e" },
                  { title: lang === "ko" ? "비회원 무료" : "Guest free trial", point: "5" + (lang === "ko" ? "회" : "x"), desc: lang === "ko" ? "로그인 없이 체험" : "Try without login", color: "#f59e0b" },
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
            { icon: "FREE", title: lang==="ko"?"비회원 무료":"Guest Free", point: lang==="ko"?"5회":"5x", desc: lang==="ko"?"로그인 없이 AI 생성기 5회 무료 체험":"5 free AI uses without login", color: "#888", btnText: lang==="ko"?"무료로 시작하기":"Start free", onClick: () => navigate("ai") },
            { icon: "+150P", title: lang==="ko"?"회원 가입":"Sign up", point: "150P", desc: lang==="ko"?"가입 즉시 150P 지급 + 매일 로그인·게시글로 적립":"150P upon signup + earn daily", color: "#22c55e", btnText: lang==="ko"?"무료로 시작하기":"Start free", onClick: () => navigate("ai") },
            { icon: "$19.9", title: lang==="ko"?"Standard 충전":"Standard", point: "2,400P", desc: lang==="ko"?"가장 많이 선택하는 패키지 · 유효기간 없음":"Most popular · No expiry", color: "#7c6aff", btnText: lang==="ko"?"요금 알아보기":"View pricing", onClick: () => navigate("pricing"), highlight: true },
            { icon: "$49.9", title: lang==="ko"?"Pro 충전":"Pro", point: "6,500P", desc: lang==="ko"?"장기 사용자 · 포인트당 단가 최저":"Best value · Lowest per-point", color: "#8b5cf6", btnText: lang==="ko"?"요금 알아보기":"View pricing", onClick: () => navigate("pricing") },
          ].map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.1}>
              <div className="stat-card" style={{
                background: p.highlight ? "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))" : C.card,
                border: p.highlight ? "2px solid rgba(99,102,241,0.4)" : "1px solid " + C.border,
                borderRadius: 16, padding: "26px 20px", textAlign: "center",
                boxShadow: p.highlight ? "0 8px 32px rgba(99,102,241,0.15)" : C.shadow,
                transition: "all 0.2s", cursor: "default",
                position: "relative", overflow: "hidden",
              }}>
                {p.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", padding: "3px 12px", borderRadius: "0 0 8px 8px" }}>{getPageText(lang,"recommend")}</div>}
                <div style={{ fontSize: 14, fontWeight: 900, color: p.color, marginBottom: 10, letterSpacing: -0.5 }}>{p.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: p.color, marginBottom: 8 }}>{p.point}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</div>
                <button onClick={p.onClick} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: p.highlight ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "rgba(124,106,255,0.1)", color: p.highlight ? "#fff" : C.purpleL, fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>
                  {p.btnText}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ FAQ ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>FAQ</div>
              <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
                {lang === "ko" ? "자주 묻는 질문" : "Frequently Asked Questions"}
              </h2>
            </div>
          </FadeIn>
          {(lang === "ko" ? [
            { q: "SNS메이킷은 어떤 서비스인가요?", a: "SNS메이킷은 AI 기반 콘텐츠 자동 생성 플랫폼입니다. 블로그 글쓰기, 상세페이지 제작, 카드뉴스 제작, 숏폼 영상 편집까지 SNS 운영에 필요한 AI 도구를 하나의 플랫폼에서 제공합니다." },
            { q: "어떤 콘텐츠를 만들 수 있나요?", a: "네이버 블로그, 인스타그램 캡션, 유튜브 대본, 티스토리 글, 상세페이지, 카드뉴스, 숏폼 영상 등 SNS 마케팅에 필요한 콘텐츠를 AI로 자동 생성할 수 있습니다." },
            { q: "무료로 사용할 수 있나요?", a: "네. 비회원도 로그인 없이 5회까지 무료로 체험할 수 있습니다. 회원가입 시 150포인트가 즉시 지급되며, 매일 로그인(+3P), 게시글 작성(+1P, 하루 10회) 등으로 포인트를 적립해 무료로 계속 사용할 수 있어요." },
            { q: "생성된 콘텐츠의 품질은 어떤가요?", a: "최신 AI 모델(Claude 계열)을 사용하여 사람이 작성한 것과 구분하기 어려운 높은 품질의 콘텐츠를 생성합니다. SEO 최적화까지 자동으로 적용되어 검색 노출에도 유리합니다." },
            { q: "어떤 플랫폼을 지원하나요?", a: "네이버 블로그, 티스토리, 인스타그램, 유튜브, 스레드, 네이버 카페 등 주요 SNS 플랫폼을 지원합니다. 스레드, 네이버 블로그, 티스토리는 원클릭 자동 발행 기능도 제공합니다." },
            { q: "포인트는 어떻게 적립하나요?", a: "회원가입 시 150P가 즉시 지급됩니다. 이후 매일 로그인(+3P), 커뮤니티 게시글 작성(+1P, 하루 최대 10회)으로 포인트를 적립할 수 있어요. 추가 포인트가 필요하면 합리적인 가격으로 충전할 수도 있습니다." },
            { q: "생성된 콘텐츠를 상업적으로 사용할 수 있나요?", a: "네, SNS메이킷으로 생성한 모든 콘텐츠(글, 이미지 등)는 상업적 용도로 자유롭게 사용할 수 있습니다. 별도의 라이선스 비용 없이 블로그, SNS, 쇼핑몰 등에 바로 활용하세요." },
            { q: "개인정보는 안전하게 보호되나요?", a: "SNS메이킷은 Supabase 인프라를 사용하여 데이터를 안전하게 관리합니다. 소셜 로그인(Google, Kakao)은 각 플랫폼의 공식 OAuth 인증을 통해 처리되며, 비밀번호는 암호화되어 저장됩니다." },
          ] : [
            { q: "What is SNS Makeit?", a: "SNS Makeit is an AI-powered content auto-generation platform. It provides AI tools for blog writing, detail pages, card news, and short-form video editing in one place." },
            { q: "What content can I create?", a: "You can create Naver blog posts, Instagram captions, YouTube scripts, detail pages, card news, short-form videos, and more." },
            { q: "Can I use it for free?", a: "Yes. Guests can try 5 times without login. Sign up to get 150P instantly, plus earn more through daily login (+3P) and community posts (+1P, up to 10/day)." },
            { q: "What is the quality of generated content?", a: "We use the latest AI models (Claude family) to produce high-quality content that is virtually indistinguishable from human-written text, with automatic SEO optimization." },
            { q: "Which platforms are supported?", a: "We support Naver Blog, Tistory, Instagram, YouTube, Threads, and Naver Cafe. Auto-publishing is available for Threads, Naver Blog, and Tistory." },
            { q: "How do I earn points?", a: "Get 150P on sign-up. Earn +3P daily login, +1P per community post (up to 10/day). You can also purchase additional points at affordable prices." },
            { q: "Can I use generated content commercially?", a: "Yes. All content created with SNS Makeit (text, images, etc.) can be freely used for commercial purposes without any additional licensing fees." },
            { q: "Is my data safe?", a: "SNS Makeit uses Supabase infrastructure for secure data management. Social logins (Google, Kakao) are processed through official OAuth authentication, and passwords are encrypted." },
          ]).map((item, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <FaqItem q={item.q} a={item.a} C={C} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,24px)", textAlign: "center", position: "relative", overflow: "hidden", background: C.bg2 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(500px, 70vw)", height: "min(500px, 70vw)", borderRadius: "50%", background: "rgba(124,106,255,0.05)", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.purpleL, letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>{lang === "ko" ? "지금 바로 시작하세요" : "Start right now"}</div>
          <h2 style={{ fontSize: "clamp(24px,4.5vw,44px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, lineHeight: 1.2, margin: "0 0 20px" }}>
            {p("ctaTitle1")}<br/>
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {p("ctaHighlight")}
            </span>
          </h2>
          <p style={{ fontSize: "clamp(14px,1.6vw,17px)", color: C.muted, lineHeight: 1.9, marginBottom: 24, whiteSpace: "pre-line" }}>
            {p("ctaDesc")}
          </p>
          {/* 핵심 수치 강조 */}
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { num: "150P", label: lang === "ko" ? "가입 즉시 지급" : "Signup bonus" },
              { num: lang === "ko" ? "5회" : "5x", label: lang === "ko" ? "비회원 무료" : "Guest free" },
              { num: lang === "ko" ? "0원" : "$0", label: lang === "ko" ? "카드 등록 불필요" : "No card needed" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#7c6aff" }}>{s.num}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="cta-row" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")} style={{ fontSize: 16, padding: "14px 40px" }}>{lang === "ko" ? "무료로 시작하기" : "Start free"} →</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>{lang === "ko" ? "요금 알아보기" : "See pricing"}</Btn>
          </div>
        </div>
      </section>
      <div className="mobile-sticky-cta" style={{
        display: "none", position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 900,
        alignItems: "center", gap: 10, padding: "10px 10px 10px 14px", borderRadius: 14,
        background: "rgba(255,255,255,0.96)", border: "1px solid rgba(124,106,255,0.18)",
        boxShadow: "0 12px 40px rgba(26,23,48,0.16)", backdropFilter: "blur(14px)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lang === "ko" ? "AI 무료 체험 가능" : "Free AI trial available"}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {lang === "ko" ? "비회원 5회 · 가입 시 150P" : "5 guest uses · 150P signup"}
          </div>
        </div>
        <button onClick={() => navigate("ai")} style={{
          flex: "0 0 auto", minHeight: 44, padding: "0 16px", borderRadius: 11, border: "none",
          background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff",
          fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>
          {lang === "ko" ? "시작" : "Start"}
        </button>
      </div>
    </div>
  );
}
