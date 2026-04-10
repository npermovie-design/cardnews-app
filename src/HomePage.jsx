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

export default function HomePage({ navigate, C, theme, user, onLoginRequest }) {
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
        @media(max-width:768px){
          .hero-particle{display:none!important}
          .tool-card:hover,.review-card:hover,.stat-card:hover,.hover-lift:hover{transform:none!important;box-shadow:none!important}
          .pain-grid{grid-template-columns:1fr!important}
          .compare-table{font-size:11px!important}
          .compare-table th,.compare-table td{padding:10px 6px!important}
          .point-grid{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:480px){
          section{padding-left:12px!important;padding-right:12px!important}
          h1{font-size:24px!important}
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

      {/* ══ 히어로 ══ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "clamp(90px,12vw,110px) clamp(16px,4vw,24px) clamp(60px,8vw,80px)",
        textAlign: "center", position: "relative", overflow: "hidden",
        background: C.heroBg,
      }}>
        <div className="hero-particle" style={{
          position: "absolute", width: "min(400px,50vw)", height: "min(400px,50vw)", borderRadius: "50%",
          background: "rgba(124,106,255,0.04)", filter: "blur(100px)", pointerEvents: "none",
          top: "20%", left: "15%", animation: "float 4s ease-in-out infinite",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          {/* 신뢰 배지 */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "6px 16px", marginBottom: 24, fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s ease-in-out infinite" }} />
            {lang === "ko" ? "카드 등록 없이 무료로 시작" : "Start free, no credit card"}
          </div>

          <h1 style={{ fontSize: "clamp(32px,6.5vw,64px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -2, color: C.text, margin: "0 0 20px" }}>
            {lang === "ko" ? <>콘텐츠 제작,<br/><span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI에게 맡기세요</span></> : <>Content creation?<br/><span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Leave it to AI</span></>}
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,20px)", color: C.muted, lineHeight: 1.8, maxWidth: 620, margin: "0 auto 20px" }}>
            {lang === "ko"
              ? "주제만 입력하면 AI가 블로그, 카드뉴스, 쇼츠 영상까지 3분 만에 완성합니다"
              : "Just enter a topic — AI creates blogs, card news, and shorts videos in 3 minutes"}
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { icon: "🔒", text: lang === "ko" ? "SSL 보안" : "SSL Secure" },
              { icon: "👥", text: lang === "ko" ? "2,000+ 사용자" : "2,000+ Users" },
              { icon: "⚡", text: lang === "ko" ? "평균 3분 제작" : "3min Avg" },
              { icon: "🌏", text: lang === "ko" ? "4개국어 지원" : "4 Languages" },
            ].map(b => (
              <span key={b.text} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.muted, opacity: 0.8 }}>
                <span style={{ fontSize: 11 }}>{b.icon}</span> {b.text}
              </span>
            ))}
          </div>

          <div className="cta-row" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 52 }}>
            <Btn C={C} onClick={() => navigate("ai")} style={{ fontSize: 16, padding: "14px 36px" }}>{lang === "ko" ? "무료로 시작하기" : "Start free"} →</Btn>
            <Btn C={C} onClick={() => {
              const el = document.getElementById("features-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }} ghost style={{ fontSize: 15, padding: "13px 28px" }}>
              {lang === "ko" ? "기능 둘러보기" : "See features"}
            </Btn>
          </div>

          {/* 실시간 통계 카운트업 */}
          <div style={{ display: "flex", gap: "clamp(24px,5vw,52px)", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { end: 25, suffix: "+", label: p("statTools") },
              { end: statsCount > 0 ? statsCount : 500, suffix: p("statContentsSuffix"), label: p("statContents") },
              { end: 3, suffix: p("statTimeSuffix"), label: p("statTime") },
              { end: 60, suffix: lang === "ko" ? "초" : "s", label: lang === "ko" ? "쇼츠 영상 제작" : "Shorts creation" },
            ].map(({ end, suffix, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 800, color: "#7c6aff" }}>
                  <CountUp end={end} suffix={suffix} />
                </div>
                <div style={{ fontSize: "clamp(11px,2.5vw,13px)", color: C.muted, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 제품 미리보기 */}
          <div style={{ marginTop: 48, maxWidth: 700, width: "100%", margin: "48px auto 0", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(124,106,255,0.18), 0 0 0 1px rgba(124,106,255,0.08)", border: "1px solid " + C.border, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 32, background: "#f5f4ff", display: "flex", alignItems: "center", gap: 6, padding: "0 12px", borderBottom: "1px solid " + C.border }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ flex: 1, textAlign: "center", fontSize: 10, color: C.muted, fontWeight: 600 }}>snsmakeit.com</span>
            </div>
            <img src="/screenshots/ai-home.png" alt="SNS메이킷 AI 생성기" fetchpriority="high" loading="lazy" style={{ width: "100%", display: "block", marginTop: 32 }} />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", opacity: 0.5, animation: "float 2s ease-in-out infinite" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
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
          <div className="pain-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              {
                icon: "&#9200;",
                title: lang === "ko" ? "카드뉴스 만드는 데 2시간" : "2 hours for card news",
                quote: lang === "ko" ? "디자인 감각이 없어 매번 외주를 맡기고 있어요" : "I have no design skills and always outsource",
              },
              {
                icon: "&#128221;",
                title: lang === "ko" ? "블로그 글 하나에 반나절" : "Half a day for one blog post",
                quote: lang === "ko" ? "SEO 최적화까지 신경 쓰면 하루가 다 갑니다" : "Add SEO optimization and a whole day is gone",
              },
              {
                icon: "&#128247;",
                title: lang === "ko" ? "SNS 채널마다 따로 제작" : "Separate content per channel",
                quote: lang === "ko" ? "같은 내용을 인스타, 블로그, 스레드에 각각 올리느라 지쳐요" : "Exhausted posting the same content to Instagram, blog, and Threads separately",
              },
              {
                icon: "&#127912;",
                title: lang === "ko" ? "전문가 수준의 이미지 필요" : "Need professional images",
                quote: lang === "ko" ? "제품 사진, 로고, 목업을 직접 만들 수가 없어요" : "I can't create product photos, logos, or mockups myself",
              },
              {
                icon: "🎬",
                title: lang === "ko" ? "영상 제작은 너무 복잡해요" : "Video creation is too complex",
                quote: lang === "ko" ? "촬영, 편집, 자막... 쇼츠 하나 만드는 데 반나절이 걸려요" : "Filming, editing, subtitles... making one short takes half a day",
              },
            ].map((pain, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div style={{
                  background: "#fff", border: "1px solid " + C.border, borderRadius: 16,
                  padding: "28px 24px", height: "100%",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: pain.icon }} />
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10, lineHeight: 1.4 }}>{pain.title}</div>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>
                    &ldquo;{pain.quote}&rdquo;
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
          {/* 카톡방 CTA (한국어 사용자만 노출) */}
          {lang === "ko" && (
            <FadeIn delay={0.2}>
              <a href="https://open.kakao.com/o/gIw9vTFg" target="_blank" rel="noopener noreferrer"
                className="hover-lift"
                style={{ display:"flex", alignItems:"center", gap:14, padding:"18px 24px", marginTop:32, borderRadius:16, background:"#FEE500", textDecoration:"none", border:"1px solid rgba(25,25,25,0.06)" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"#191919", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#FEE500" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24-.13.47-.85 3.04-.88 3.23 0 0-.02.15.08.21.1.06.21.01.21.01.28-.04 3.24-2.13 3.76-2.49.79.11 1.6.17 2.45.17 5.52 0 10-3.36 10-7.37S17.52 3 12 3z"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"#191919" }}>단체카톡방에서 마케팅 인사이트 공유</div>
                  <div style={{ fontSize:12, color:"rgba(25,25,25,0.55)", marginTop:2 }}>같은 고민을 하는 마케터들과 함께 소통하세요</div>
                </div>
                <span style={{ fontSize:14, fontWeight:800, color:"#191919", flexShrink:0 }}>참여하기 →</span>
              </a>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ══ SNS 자동 발행 ══ */}
      <section style={{ padding: "clamp(80px,12vw,120px) clamp(16px,4vw,24px)", position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, #f8f8fb 0%, #ede5ff 50%, #f8f8fb 100%)" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: "min(600px,80vw)", height: "min(600px,80vw)", borderRadius: "50%", background: "rgba(124,106,255,0.06)", filter: "blur(120px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
          <FadeIn>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Auto Publish</div>
            <h2 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.2, margin: "0 0 16px" }}>
              {lang === "ko" ? <>글 작성부터 SNS 발행까지<br/><span style={{ color: "#7c6aff" }}>원클릭</span>으로 끝</> : <>From writing to publishing<br/>in <span style={{ color: "#7c6aff" }}>one click</span></>}
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, margin: "0 auto 40px", maxWidth: 560, whiteSpace: "pre-line" }}>
              {lang === "ko" ? "AI가 작성한 글을 복사-붙여넣기 없이 바로 발행하세요.\n계정 연결 한 번이면 스레드·블로그·티스토리에 자동 업로드됩니다." : "Publish AI-written content without copy-paste.\nConnect once, auto-upload to Threads, Blog, and Tistory."}
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(8px,2vw,20px)", flexWrap: "wrap", marginBottom: 48 }}>
              {[
                { label: lang === "ko" ? "주제 입력" : "Enter topic", icon: "T", highlight: false },
                null,
                { label: lang === "ko" ? "AI 글 생성" : "AI writes", icon: "AI", highlight: false },
                null,
                { label: lang === "ko" ? "원클릭 발행" : "One-click", icon: "V", highlight: true },
              ].map((s, i) => s ? (
                <div key={i} style={{ width: "clamp(80px,15vw,120px)", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: s.highlight ? "linear-gradient(135deg,#7c6aff,#ec4899)" : ("rgba(124,106,255,0.08)"), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20, fontWeight: 900, color: s.highlight ? "#fff" : "#7c6aff" }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{s.label}</div>
                </div>
              ) : (
                <div key={i} style={{ fontSize: 20, color: C.muted, fontWeight: 300 }}>→</div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 16, maxWidth: 860, margin: "0 auto 40px" }}>
              {[
                { icon: "/icon-threads.png", name: lang === "ko" ? "스레드" : "Threads", desc: lang === "ko" ? "글 작성 후 원클릭 자동 발행" : "Auto publish after writing", color: "#7c6aff", tag: lang === "ko" ? "자동 발행" : "Auto", tagColor: "#7c6aff" },
                { icon: "/icon-naver-blog.png", name: lang === "ko" ? "네이버 블로그" : "Naver Blog", desc: lang === "ko" ? "복사 + 에디터 바로 열기" : "Copy + open editor", color: "#03C75A", tag: lang === "ko" ? "간편 발행" : "Easy", tagColor: "#4ade80" },
                { icon: "/icon-tistory.png", name: lang === "ko" ? "티스토리" : "Tistory", desc: lang === "ko" ? "복사 + 에디터 바로 열기" : "Copy + open editor", color: "#FF6B35", tag: lang === "ko" ? "간편 발행" : "Easy", tagColor: "#4ade80" },
                { icon: "/icon-instagram.webp", name: lang === "ko" ? "인스타그램" : "Instagram", desc: lang === "ko" ? "카드뉴스 이미지 자동 발행" : "Card news auto publish", color: "#E1306C", tag: lang === "ko" ? "곧 출시" : "Coming", tagColor: "#f59e0b" },
              ].map(p => (
                <div key={p.name} className="hover-lift" style={{ background: "#fff", border: "1px solid " + (C.border), borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: p.color + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <img src={p.icon} alt={p.name} loading="lazy" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{p.desc}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: p.tagColor + "15", color: p.tagColor }}>{p.tag}</span>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="cta-row" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn C={C} onClick={() => navigate("ai")} style={{ fontSize: 16, padding: "14px 36px" }}>
                {lang === "ko" ? "무료로 시작하기" : "Start free"} →
              </Btn>
              <button onClick={() => { if (!user) { if (onLoginRequest) onLoginRequest(); } else { navigate("mypage"); } }}
                style={{ padding: "14px 32px", borderRadius: 12, border: `2px solid ${"rgba(124,106,255,0.3)"}`,
                  background: "transparent", color: "#7c6aff", fontSize: 16, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {[{src:"/icon-threads.png",alt:"Threads"},{src:"/icon-naver-blog.png",alt:"네이버 블로그"},{src:"/icon-tistory.png",alt:"티스토리"}].map((ic,i)=>
                  <img key={i} src={ic.src} alt={ic.alt} loading="lazy" style={{ width:18, height:18, objectFit:"contain", borderRadius:3, marginLeft:i>0?-6:0 }} />
                )}
                {lang === "ko" ? (user ? "계정 연동하기" : "회원가입 후 연동") : (user ? "Connect accounts" : "Sign up to connect")}
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 핵심 기능 벤토 그리드 (아임웹/Cutback 스타일) ══ */}
      <SecWrap C={C} bg={C.bg2} style={{ scrollMarginTop: 80 }} id="features-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
            {lang === "ko" ? "시작부터 성장까지 쉬워집니다" : "Easy from start to growth"}
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
            {lang === "ko" ? "20가지 AI 도구로 SNS 콘텐츠 제작의 모든 과정을 자동화하세요." : "Automate every step of SNS content creation with 20+ AI tools."}
          </p>
        </div>

        {/* AI 자동 영상 제작 - NEW 강조 배너 (최상단) */}
        <FadeIn>
          <div onClick={() => navigate("ai")} className="hover-lift" style={{ background: "linear-gradient(135deg, #1a1030 0%, #2d1b69 50%, #1a1030 100%)", border: "1px solid rgba(124,106,255,0.3)", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <div style={{ flex: "1 1 300px", padding: "32px 28px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#7c6aff,#ec4899)", padding: "3px 10px", borderRadius: 6 }}>NEW</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>{lang === "ko" ? "AI 자동 영상 제작" : "AI Auto Video"}</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
                {lang === "ko" ? "유튜브 링크 하나로\n쇼츠 영상을 자동 제작" : "Auto-create shorts\nfrom a YouTube link"}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, margin: "0 0 16px" }}>
                {lang === "ko" ? "AI가 영상을 분석하고, 최적의 구간을 찾아 자막과 함께 쇼츠를 자동으로 만들어줍니다. 타임라인 편집, 폰트/스타일 커스텀, 오버레이까지." : "AI analyzes videos, finds optimal segments, and auto-creates shorts with subtitles."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(lang === "ko" ? ["자동 구간 분석","자막 자동 생성","타임라인 편집","무료 소스 검색"] : ["Auto segment analysis","Auto subtitles","Timeline editor","Free stock search"]).map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(124,106,255,0.15)", color: "#a5b4fc", fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ flex: "0 0 200px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 120, height: 200, borderRadius: 12, background: "#000", border: "2px solid rgba(124,106,255,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(124,106,255,0.3)" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}><rect x="2" y="4" width="20" height="16" rx="3" stroke="#7c6aff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#7c6aff"/></svg>
                <div style={{ fontSize: 10, color: "#a5b4fc", fontWeight: 700 }}>9:16 Shorts</div>
              </div>
            </div>
          </div>
        </FadeIn>

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
                  {lang === "ko" ? "네이버 블로그, 인스타, 유튜브 대본까지 6개 플랫폼 지원" : "Supports 6 platforms including Naver Blog, Instagram, YouTube"}
                </p>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 16px 16px" }}>
                <img src="/screenshots/blog-writer.png" alt="블로그 글쓰기 UI" loading="lazy" style={{ width: "100%", borderRadius: "12px 12px 0 0", display: "block", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }} />
              </div>
            </div>
          </FadeIn>

          {/* 카드뉴스/상세페이지 */}
          <FadeIn delay={0.1} style={{ gridColumn: "span 1" }}>
            <div onClick={() => navigate("ai")} className="hover-lift" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, overflow: "hidden", cursor: "pointer", height: "100%" }}>
              <div style={{ padding: "28px 24px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", marginBottom: 8 }}>{lang === "ko" ? "콘텐츠 제작" : "Content Creation"}</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.3 }}>
                  {lang === "ko" ? "카드뉴스, 상세페이지를\n자동으로 디자인해요" : "Auto-design card news\nand detail pages"}
                </h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: 0 }}>
                  {lang === "ko" ? "주제만 입력하면 슬라이드 기획부터 디자인까지 AI가 완성" : "AI handles everything from slide planning to design"}
                </p>
              </div>
              <div style={{ padding: "16px 12px 0", overflow: "hidden", borderRadius: "0 0 16px 16px" }}>
                <img src="/screenshots/cardnews.png" alt="카드뉴스 제작 UI" loading="lazy" style={{ width: "100%", borderRadius: "12px 12px 0 0", display: "block", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }} />
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 하단 3열 소형 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 16, marginTop: 16 }}>
          {[
            { title: lang === "ko" ? "AI 이미지" : "AI Image", desc: lang === "ko" ? "제품컷, 로고, 목업, 모델 생성 · 얼굴·의상 교체, 여백 확장" : "Product shots, logos, mockups, models · Face/outfit swap, outpainting", color: "#ec4899", items: "10" },
            { title: lang === "ko" ? "비즈니스 문서" : "Business Docs", desc: lang === "ko" ? "보도자료, 제안서, 사업계획서 AI 작성" : "Press releases, proposals, business plans", color: "#f59e0b", items: "5" },
            { title: lang === "ko" ? "리퍼포징" : "Repurpose", desc: lang === "ko" ? "유튜브·뉴스·파일을 블로그·SNS로 변환" : "Convert YouTube, news, files to blog & SNS", color: "#ef4444", items: "3" },
            { title: lang === "ko" ? "SEO 분석기" : "SEO Analyzer", desc: lang === "ko" ? "실시간 검색어, 인플루언서 랭킹" : "Trending keywords, influencer rankings", color: "#22c55e", items: "4" },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div onClick={() => navigate(f.color === "#22c55e" ? "analyzer" : "ai")} className="hover-lift" style={{
                background: C.card, border: "1px solid " + C.border, borderRadius: 16,
                padding: "24px 20px", cursor: "pointer", height: "100%",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: f.color }}>{f.items}</div>
                  <div style={{ fontSize: 11, color: f.color, fontWeight: 700 }}>{f.items}{lang === "ko" ? "개 도구" : " tools"}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ marginTop: 14, fontSize: 12, color: f.color, fontWeight: 700 }}>{lang === "ko" ? "기능 둘러보기" : "Explore features"} →</div>
              </div>
            </FadeIn>
          ))}
        </div>

      </SecWrap>

      {/* ══ 경쟁사 비교표 ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: "linear-gradient(180deg, #f8f8fb 0%, #f0ecff 50%, #f8f8fb 100%)" }}>
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
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
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
                    { feature: lang === "ko" ? "카드뉴스+블로그+영상 동시" : "Card+Blog+Video at once", vals: ["check", "cross", "cross", "cross"] },
                    { feature: lang === "ko" ? "SEO 최적화 글쓰기" : "SEO writing", vals: ["check", "cross", "cross", "cross"] },
                    { feature: lang === "ko" ? "AI 이미지 생성/수정" : "AI image gen/edit", vals: ["check", "cross", "partial", "partial"] },
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
                          {v === "check" ? <span style={{ fontSize: 18 }}>&#10003;</span> : v === "cross" ? <span style={{ fontSize: 16, opacity: 0.4 }}>&#10007;</span> : v === "partial" ? <span style={{ fontSize: 12 }}>{lang === "ko" ? "일부" : "Partial"}</span> : <span style={{ fontWeight: 800, color: ci === 0 ? "#7c6aff" : C.text }}>{v}</span>}
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
            <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #f5f4ff 100%)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 24, padding: "clamp(32px,5vw,48px)", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
                &#128274;
              </div>
              <h3 style={{ fontSize: "clamp(20px,3.5vw,28px)", fontWeight: 800, color: C.text, margin: "0 0 12px" }}>
                {lang === "ko" ? "AI가 만들고, 내가 결정하는 콘텐츠" : "AI creates, you decide"}
              </h3>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.85, maxWidth: 600, margin: "0 auto 28px" }}>
                {lang === "ko"
                  ? "AI가 초안을 만들고, 직접 검토한 뒤 발행하세요. 콘텐츠의 품질과 톤을 완벽하게 컨트롤할 수 있습니다."
                  : "AI drafts the content, you review and publish. Full control over quality and tone."}
              </p>
              <div style={{ display: "flex", gap: "clamp(12px,3vw,24px)", justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { icon: "&#9989;", text: lang === "ko" ? "AI 초안 → 내가 검토" : "AI draft → You review" },
                  { icon: "&#9989;", text: lang === "ko" ? "톤·스타일 완벽 제어" : "Full tone control" },
                  { icon: "&#9989;", text: lang === "ko" ? "원클릭 발행 또는 수정" : "One-click publish or edit" },
                ].map(item => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(12px,2.5vw,14px)", fontWeight: 600, color: "#22c55e" }}>
                    <span dangerouslySetInnerHTML={{ __html: item.icon }} />
                    <span style={{ color: C.text }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ Before vs After ══ */}
      <section style={{ padding: "clamp(60px,10vw,100px) clamp(16px,4vw,24px)", background: C.bg2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>Before vs After</div>
              <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: C.text, letterSpacing: -1.5, margin: "0 0 12px" }}>
                {lang === "ko" ? "SNS메이킷 도입 전 vs 후" : "Before vs After SNS Makeit"}
              </h2>
              <p style={{ fontSize: 15, color: C.muted }}>
                {lang === "ko" ? "같은 작업, 완전히 다른 효율" : "Same tasks, completely different efficiency"}
              </p>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { before: lang === "ko" ? "카드뉴스 1개 제작에 2시간, 디자이너 외주비 5만원" : "2 hours per card news, 50k KRW design outsourcing", after: lang === "ko" ? "AI가 3분 만에 완성, 포인트 10P (약 60원)" : "AI completes in 3 min, 10P (~$0.05)" },
              { before: lang === "ko" ? "블로그 글 하나에 반나절, SEO 키워드 별도 조사" : "Half a day per blog post, separate SEO research", after: lang === "ko" ? "SEO 최적화 블로그 글 5분 완성, 키워드 자동 반영" : "SEO-optimized blog in 5 min, auto keywords" },
              { before: lang === "ko" ? "인스타·블로그·스레드 각각 따로 작성" : "Write separately for Instagram, blog, Threads", after: lang === "ko" ? "한 번에 6개 플랫폼용 콘텐츠 동시 생성" : "Generate for 6 platforms at once" },
              { before: lang === "ko" ? "제품 사진 촬영 + 보정에 하루, 스튜디오 비용 별도" : "Full day for product photos + editing, studio costs", after: lang === "ko" ? "AI 제품컷 즉시 생성, 배경 자동 교체" : "AI product shots instantly, auto background swap" },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <BeforeAfterCard before={item.before} after={item.after} C={C} lang={lang} />
              </FadeIn>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Btn C={C} onClick={() => navigate("ai")}>{lang === "ko" ? "직접 체험해보기" : "Try it yourself"} →</Btn>
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
              text: lang === "ko" ? "카드뉴스 제작 시간이 2시간에서 5분으로 줄었어요. 외주비만 월 50만원 이상 절약하고 있습니다. 디자이너 없이도 프로급 카드뉴스가 나옵니다." : "Card news creation went from 2 hours to 5 minutes. Saving over 500K KRW monthly in outsourcing costs.",
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
      <section style={{ padding: "clamp(40px,6vw,60px) clamp(16px,4vw,24px)", background: "linear-gradient(180deg,#f8f8fb,#f5f4ff)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 20, letterSpacing: 1 }}>
            {lang === "ko" ? "다양한 분야에서 활용 중" : "Used across industries"}
          </div>
          <div style={{ display: "flex", gap: "clamp(16px,3vw,32px)", justifyContent: "center", flexWrap: "wrap" }}>
            {(lang === "ko" ? [
              { icon: "🛍️", label: "쇼핑몰 운영자" },
              { icon: "📊", label: "마케팅 대행사" },
              { icon: "🎬", label: "1인 크리에이터" },
              { icon: "🏢", label: "스타트업" },
              { icon: "📝", label: "블로거" },
              { icon: "🎓", label: "프리랜서" },
            ] : [
              { icon: "🛍️", label: "E-commerce" },
              { icon: "📊", label: "Agencies" },
              { icon: "🎬", label: "Creators" },
              { icon: "🏢", label: "Startups" },
              { icon: "📝", label: "Bloggers" },
              { icon: "🎓", label: "Freelancers" },
            ]).map(s => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 80 }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.label}</div>
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
                  { title: lang === "ko" ? "매일 출석체크" : "Daily check-in", point: "+3P", desc: lang === "ko" ? "하루 한 번 출석만 해도" : "Just check in once a day", color: "#7c6aff" },
                  { title: lang === "ko" ? "게시글 작성" : "Write a post", point: "+2P", desc: lang === "ko" ? "커뮤니티 글 작성 시" : "When posting in community", color: "#22c55e" },
                  { title: lang === "ko" ? "회원가입 보너스" : "Sign-up bonus", point: "+100P", desc: lang === "ko" ? "가입 즉시 지급" : "Instant upon sign-up", color: "#ec4899" },
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
            { icon: "+100P", title: lang==="ko"?"회원 가입":"Sign up", point: "100P", desc: lang==="ko"?"가입 즉시 100P 지급 + 게시글·출석 포인트 적립":"100P upon signup + earn more", color: "#22c55e", btnText: lang==="ko"?"무료로 시작하기":"Start free", onClick: () => navigate("ai") },
            { icon: "$19.90", title: lang==="ko"?"Standard 충전":"Standard", point: "3,500P", desc: lang==="ko"?"텍스트 350회 · 이미지 70회 · 유효기간 없음":"350 texts · 70 images · no expiry", color: "#7c6aff", btnText: lang==="ko"?"요금 알아보기":"View pricing", onClick: () => navigate("pricing"), highlight: true },
            { icon: "$49.90", title: lang==="ko"?"Pro 충전":"Pro", point: "9,500P", desc: lang==="ko"?"텍스트 950회 · 이미지 190회 · 우선 고객지원":"950 texts · 190 images · priority support", color: "#8b5cf6", btnText: lang==="ko"?"요금 알아보기":"View pricing", onClick: () => navigate("pricing") },
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
            { q: "SNS메이킷은 어떤 서비스인가요?", a: "SNS메이킷은 AI 기반 콘텐츠 자동 생성 플랫폼입니다. 블로그 글쓰기, 카드뉴스, 상세페이지, AI 이미지 생성, 숏폼 영상 편집까지 20가지 이상의 AI 도구를 하나의 플랫폼에서 제공합니다." },
            { q: "어떤 콘텐츠를 만들 수 있나요?", a: "네이버 블로그, 인스타그램 캡션, 유튜브 대본, 티스토리 글, 카드뉴스, 상세페이지, AI 제품컷, 로고, 목업, 숏폼 영상 등 SNS 마케팅에 필요한 거의 모든 콘텐츠를 AI로 자동 생성할 수 있습니다." },
            { q: "무료로 사용할 수 있나요?", a: "네! 비회원도 로그인 없이 5회까지 무료로 체험할 수 있습니다. 회원가입 시 100포인트가 즉시 지급되며, 매일 출석체크(+3P), 게시글 작성(+2P) 등으로 포인트를 적립해 무료로 계속 사용할 수 있어요." },
            { q: "생성된 콘텐츠의 품질은 어떤가요?", a: "최신 AI 모델(Claude Sonnet 4)을 사용하여 사람이 작성한 것과 구분하기 어려운 높은 품질의 콘텐츠를 생성합니다. SEO 최적화까지 자동으로 적용되어 검색 노출에도 유리합니다." },
            { q: "어떤 플랫폼을 지원하나요?", a: "네이버 블로그, 티스토리, 인스타그램, 유튜브, 스레드, 네이버 카페 등 주요 SNS 플랫폼을 지원합니다. 스레드, 네이버 블로그, 티스토리는 원클릭 자동 발행 기능도 제공합니다." },
            { q: "포인트는 어떻게 적립하나요?", a: "회원가입 시 100P가 즉시 지급됩니다. 이후 매일 출석체크(+3P), 커뮤니티 게시글 작성(+2P)으로 포인트를 적립할 수 있어요. 추가 포인트가 필요하면 합리적인 가격으로 충전할 수도 있습니다." },
            { q: "생성된 콘텐츠를 상업적으로 사용할 수 있나요?", a: "네, SNS메이킷으로 생성한 모든 콘텐츠(글, 이미지, 카드뉴스 등)는 상업적 용도로 자유롭게 사용할 수 있습니다. 별도의 라이선스 비용 없이 블로그, SNS, 쇼핑몰 등에 바로 활용하세요." },
            { q: "개인정보는 안전하게 보호되나요?", a: "SNS메이킷은 Supabase 인프라를 사용하여 데이터를 안전하게 관리합니다. 소셜 로그인(Google, Kakao)은 각 플랫폼의 공식 OAuth 인증을 통해 처리되며, 비밀번호는 암호화되어 저장됩니다." },
          ] : [
            { q: "What is SNS Makeit?", a: "SNS Makeit is an AI-powered content auto-generation platform. It provides 20+ AI tools in one place, including blog writing, card news, detail pages, AI image generation, and short-form video editing." },
            { q: "What content can I create?", a: "You can create Naver blog posts, Instagram captions, YouTube scripts, card news, detail pages, AI product shots, logos, mockups, short-form videos, and more." },
            { q: "Can I use it for free?", a: "Yes! You can try 5 times free without login. Sign up to get 100P instantly, plus earn points daily through check-ins and posting." },
            { q: "What is the quality of generated content?", a: "We use the latest AI models (Claude Sonnet 4) to produce high-quality content that is virtually indistinguishable from human-written text, with automatic SEO optimization." },
            { q: "Which platforms are supported?", a: "We support Naver Blog, Tistory, Instagram, YouTube, Threads, and Naver Cafe. Auto-publishing is available for Threads, Naver Blog, and Tistory." },
            { q: "How do I earn points?", a: "Get 100P on sign-up. Earn +3P daily check-in, +2P per community post. You can also purchase additional points at affordable prices." },
            { q: "Can I use generated content commercially?", a: "Yes! All content created with SNS Makeit (text, images, card news, etc.) can be freely used for commercial purposes without any additional licensing fees." },
            { q: "Is my data safe?", a: "SNS Makeit uses Supabase infrastructure for secure data management. Social logins (Google, Kakao) are processed through official OAuth authentication, and passwords are encrypted." },
          ]).map((item, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <FaqItem q={item.q} a={item.a} C={C} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding: "clamp(60px,10vw,120px) clamp(16px,4vw,24px)", textAlign: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #f5f4ff 0%, #fdf2ff 50%, #f0fdf4 100%)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(500px, 70vw)", height: "min(500px, 70vw)", borderRadius: "50%", background: "rgba(124,106,255,0.06)", filter: "blur(100px)", pointerEvents: "none" }} />
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
              { num: lang === "ko" ? "100P" : "100P", label: lang === "ko" ? "가입 즉시 지급" : "Signup bonus" },
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
    </div>
  );
}
