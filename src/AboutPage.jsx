import { useState } from "react";
import { Btn, Badge } from "./UI";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";

/* ═══════════════════════════════════════════
   소개 페이지
═══════════════════════════════════════════ */
export function AboutPage({ navigate, C }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);
  const bg2 = C.bg2 || (C.border?.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)");

  const ALL_TOOLS = [
    { cat: p("aboutToolCatWrite"), items: [
      { icon: "NB", title: p("aboutToolNaver"), desc: p("aboutToolNaverD") },
      { icon: "C", title: p("aboutToolCafe"), desc: p("aboutToolCafeD") },
      { icon: "T", title: p("aboutToolTistory"), desc: p("aboutToolTistoryD") },
      { icon: "IG", title: p("aboutToolInsta"), desc: p("aboutToolInstaD") },
      { icon: "YT", title: p("aboutToolYoutube"), desc: p("aboutToolYoutubeD") },
      { icon: "Th", title: p("aboutToolThread"), desc: p("aboutToolThreadD") },
    ]},
    { cat: p("aboutToolCatContent"), items: [
      { icon: "DP", title: p("aboutToolDetail"), desc: p("aboutToolDetailD") },
      { icon: "SD", title: p("aboutToolSimpleDetail"), desc: p("aboutToolSimpleDetailD") },
    ]},
    { cat: p("aboutToolCatImage"), items: [
      { icon: "PS", title: p("aboutToolProduct"), desc: p("aboutToolProductD") },
      { icon: "LG", title: p("aboutToolLogo"), desc: p("aboutToolLogoD") },
      { icon: "MK", title: p("aboutToolMockup"), desc: p("aboutToolMockupD") },
      { icon: "MD", title: p("aboutToolModel"), desc: p("aboutToolModelD") },
      { icon: "FS", title: p("aboutToolFace"), desc: p("aboutToolFaceD") },
      { icon: "OS", title: p("aboutToolOutfit"), desc: p("aboutToolOutfitD") },
      { icon: "OP", title: p("aboutToolOutpaint"), desc: p("aboutToolOutpaintD") },
    ]},
    { cat: p("aboutToolCatVideo"), items: [
      { icon: "SF", title: p("aboutToolShorts"), desc: p("aboutToolShortsD") },
      { icon: "SV", title: p("aboutToolShortsAi"), desc: p("aboutToolShortsAiD") },
      { icon: "ST", title: p("aboutToolSubtitle"), desc: p("aboutToolSubtitleD") },
      { icon: "TL", title: p("aboutToolTimeline"), desc: p("aboutToolTimelineD") },
    ]},
  ];

  return (
    <div style={{ background: C.bg }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>{p("aboutBadge")}</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          {p("aboutTitle1")}<br/>
          <span style={{ background: "#3b82f6", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p("aboutTitle2")}</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 20, maxWidth: 620 }}>
          {p("aboutIntro")}
        </p>

        {/* 미션 스테이트먼트 */}
        <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 24, background: "rgba(0,0,0,0.06)", marginBottom: 48 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#3b82f6" }}>
            {p("aboutMission")}
          </span>
        </div>

        {/* 공감 섹션 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>{p("aboutPain")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "", text: p("aboutPain1") },
              { icon: "⏰", text: p("aboutPain2") },
              { icon: "IG", text: p("aboutPain3") },
              { icon: "", text: p("aboutPain4") },
              { icon: "", text: p("aboutPain5") },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderRadius: 12, background: bg2 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.purpleL, marginTop: 24, lineHeight: 1.8 }}>
            {p("aboutSolution")}
          </p>
        </div>

        {/* 브랜드 의미 */}
        <div style={{ background: "linear-gradient(135deg,rgba(0,0,0,0.06),rgba(236,72,153,0.04))", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, padding: "36px 32px", marginBottom: 28 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>{p("aboutBrandTitle")}</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.8 }}>{p("aboutBrandSub")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { word: "SNS", sub: "Social Network Service", desc: p("aboutBrandSns"), color: "#3b82f6" },
              { word: "Make it", sub: p("aboutBrandMakeSub"), desc: p("aboutBrandMakeDesc"), color: "#ec4899" },
            ].map((item, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: "24px 22px", border: "1px solid " + C.border }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6, background: `linear-gradient(135deg,${item.color},#8b5cf6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{item.word}</div>
                <div style={{ fontSize: 12, color: item.color, fontWeight: 700, marginBottom: 10 }}>{item.sub}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: "20px 24px", border: "1px solid " + C.border, textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: "0 0 8px", letterSpacing: -0.5 }}>
              {p("aboutBrandSlogan")}
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.8 }}>
              {p("aboutBrandTags")}
            </p>
          </div>
        </div>

        {/* 회사 개요 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { value: p("aboutStatLaunchVal"), label: p("aboutStatLaunch"), icon3d: "/icons3d/sns-heart.png" },
            { value: "20+", label: p("aboutStatTools"), icon3d: "/icons3d/keyboard.png" },
            { value: p("aboutStatLangVal"), label: p("aboutStatLang"), icon3d: "/icons3d/sns-content.png" },
            { value: "2,000+", label: p("aboutStatUsers"), icon3d: "/icons3d/char-headphone.png" },
          ].map((stat, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px 20px", textAlign: "center", boxShadow: C.shadow }}>
              <img src={stat.icon3d} alt="" style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 900, color: "#3b82f6", marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 만들어진 이유 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>{p("aboutWhyTitle")}</h3>
          <div style={{ fontSize: 15, color: C.muted, lineHeight: 2.1 }}>
            <p style={{ marginBottom: 16 }}>{p("aboutWhyP1")}</p>
            <p style={{ marginBottom: 16 }}>{p("aboutWhyP2")}</p>
            <p style={{ marginBottom: 0 }}>{p("aboutWhyP3")}</p>
          </div>
        </div>

        {/* 이런 분들께 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>{p("aboutRecTitle")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 }}>
            {[
              { icon: "", title: p("aboutRec1"), desc: p("aboutRec1d") },
              { icon: "", title: p("aboutRec2"), desc: p("aboutRec2d") },
              { icon: "", title: p("aboutRec3"), desc: p("aboutRec3d") },
              { icon: "", title: p("aboutRec4"), desc: p("aboutRec4d") },
              { icon: "", title: p("aboutRec5"), desc: p("aboutRec5d") },
              { icon: "", title: p("aboutRec6"), desc: p("aboutRec6d") },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "16px", borderRadius: 12, background: bg2, alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI 도구 전체 목록 */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>{p("aboutToolsTitle")}</h3>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{p("aboutToolsSub")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {ALL_TOOLS.map(cat => (
            <div key={cat.cat}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.purpleL, marginBottom: 10 }}>{cat.cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(160px,100%),1fr))", gap: 10 }}>
                {cat.items.map((s, i) => (
                  <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "16px 14px", boxShadow: C.shadow }}>
                    <div style={{ fontSize: 22, marginBottom: 7 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,rgba(0,0,0,0.06),rgba(236,72,153,0.06))", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6", marginBottom: 12 }}>START</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>{p("aboutCtaTitle")}</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            {p("aboutCtaDesc")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>{p("aboutCtaBtn1")}</Btn>
            <Btn C={C} onClick={() => navigate("howto")} ghost>{p("aboutCtaBtn2")}</Btn>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   이용방법 페이지
═══════════════════════════════════════════ */
export function HowToPage({ navigate, C }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);

  const HOW_TO = [
    {
      step: "01", icon: "", color: "#3b82f6",
      title: p("howtoS1"),
      desc: p("howtoS1d"),
      tips: [p("howtoTip1a"), p("howtoTip1b"), p("howtoTip1c")],
    },
    {
      step: "02", icon: "", color: "#8b5cf6",
      title: p("howtoS2"),
      desc: p("howtoS2d"),
      tips: [p("howtoTip2a"), p("howtoTip2b"), p("howtoTip2c")],
    },
    {
      step: "03", icon: "", color: "#ec4899",
      title: p("howtoS3"),
      desc: p("howtoS3d"),
      tips: [p("howtoTip3a"), p("howtoTip3b"), p("howtoTip3c")],
    },
    {
      step: "04", icon: "", color: "#f59e0b",
      title: p("howtoS4"),
      desc: p("howtoS4d"),
      tips: [p("howtoTip4a"), p("howtoTip4b"), p("howtoTip4c")],
    },
    {
      step: "05", icon: "SD", color: "#10b981",
      title: p("howtoS5"),
      desc: p("howtoS5d"),
      tips: [p("howtoTip5a"), p("howtoTip5b"), p("howtoTip5c")],
    },
    {
      step: "06", icon: "", color: "#3b82f6",
      title: p("howtoS6"),
      desc: p("howtoS6d"),
      tips: [p("howtoTip6a"), p("howtoTip6b"), p("howtoTip6c")],
    },
  ];

  const POINT_INFO = [
    { label: "비회원", val: "5회 무료", color: "#888", bg: "rgba(0,0,0,0.04)" },
    { label: "회원가입", val: "+5회 지급", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "유료 플랜", val: "월간 한도 제공", color: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
    { label: "AI 생성 (글쓰기/디자인)", val: "-1회", color: "#ef4444", bg: "rgba(239,68,68,0.05)" },
  ];

  const FAQ = [
    { q: p("howtoFaqQ1"), a: p("howtoFaqA1") },
    { q: p("howtoFaqQ2"), a: p("howtoFaqA2") },
    { q: p("howtoFaqQ3"), a: p("howtoFaqA3") },
    { q: p("howtoFaqQ4"), a: p("howtoFaqA4") },
    { q: p("howtoFaqQ5"), a: p("howtoFaqA5") },
    { q: p("howtoFaqQ6"), a: p("howtoFaqA6") },
  ];

  return (
    <div style={{ background: C.bg }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>{p("howtoBadge")}</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          {p("howtoTitle")}
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 560 }}>
          {p("howtoIntro")}
        </p>

        {/* 6단계 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {HOW_TO.map((step, i) => (
            <div key={step.step} style={{ display: "flex", gap: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "28px 28px", boxShadow: C.shadow }}>
              {/* 아이콘 + 선 */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${step.color}18`, border: `2px solid ${step.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{step.icon}</div>
                {i < HOW_TO.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 24, marginTop: 8, background: `linear-gradient(to bottom,${step.color}40,transparent)`, borderRadius: 2 }} />
                )}
              </div>
              {/* 내용 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: step.color, letterSpacing: 1.5, background: `${step.color}15`, padding: "3px 9px", borderRadius: 20 }}>STEP {step.step}</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{step.title}</span>
                </div>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, margin: "0 0 14px" }}>{step.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {step.tips.map((tip, j) => (
                    <span key={j} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: `${step.color}10`, color: step.color, fontWeight: 600, border: `1px solid ${step.color}25` }}>✓ {tip}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 횟수 안내 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>{p("howtoPointsTitle")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
            {POINT_INFO.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: r.bg, border: `1px solid ${r.color}20` }}>
                <span style={{ fontSize: 13, color: C.muted }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 12, background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.8 }}>
              {p("howtoPtPlanInfo")}
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>{p("howtoFaqTitle")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "20px 22px", boxShadow: C.shadow }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Q. {f.q}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>A. {f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,rgba(0,0,0,0.06),rgba(236,72,153,0.06))", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6", marginBottom: 12 }}>START</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>{p("howtoCtaTitle")}</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            {p("howtoCtaDesc")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>{p("howtoCtaBtn1")}</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>{p("howtoCtaBtn2")}</Btn>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FAQ 페이지 — 자주 묻는 질문
══════════════════════════════════════════════════════════ */
// FAQ_DATA is now generated inside FaqPage to support i18n

export function FaqPage({ C, navigate }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);
  const [openIdx, setOpenIdx] = useState(null);
  const text = C.text;
  const muted = C.muted;
  const bdr = C.border;
  const cardBg = C.card;

  const FAQ_DATA = [
    { cat: p("faqCatService"), items: [
      { q: p("faqServiceQ1"), a: p("faqServiceA1") },
      { q: p("faqServiceQ2"), a: p("faqServiceA2") },
      { q: p("faqServiceQ3"), a: p("faqServiceA3") },
    ]},
    { cat: p("faqCatPoints"), items: [
      { q: p("faqPointsQ1"), a: p("faqPointsA1") },
      { q: p("faqPointsQ2"), a: p("faqPointsA2") },
      { q: p("faqPointsQ3"), a: p("faqPointsA3") },
      { q: p("faqPointsQ4"), a: p("faqPointsA4") },
    ]},
    { cat: p("faqCatGen"), items: [
      { q: p("faqGenQ1"), a: p("faqGenA1") },
      { q: p("faqGenQ2"), a: p("faqGenA2") },
      { q: p("faqGenQ3"), a: p("faqGenA3") },
      { q: p("faqGenQ4"), a: p("faqGenA4") },
    ]},
    { cat: p("faqCatAnalyzer"), items: [
      { q: p("faqAnalyzerQ1"), a: p("faqAnalyzerA1") },
      { q: p("faqAnalyzerQ2"), a: p("faqAnalyzerA2") },
      { q: p("faqAnalyzerQ3"), a: p("faqAnalyzerA3") },
    ]},
    { cat: p("faqCatAccount"), items: [
      { q: p("faqAccountQ1"), a: p("faqAccountA1") },
      { q: p("faqAccountQ2"), a: p("faqAccountA2") },
      { q: p("faqAccountQ3"), a: p("faqAccountA3") },
      { q: p("faqAccountQ4"), a: p("faqAccountA4") },
    ]},
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", background: C.purpleBg, border: `1px solid ${C.purple}30`, borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>FAQ</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: text, margin: "0 0 8px" }}>{p("faqPageTitle")}</h2>
        <p style={{ fontSize: 14, color: muted }}>{p("faqPageSub")}</p>
      </div>

      {FAQ_DATA.map((section, si) => (
        <div key={section.cat} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 12, paddingLeft: 4 }}>{section.cat}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.items.map((item, qi) => {
              const idx = `${si}-${qi}`;
              const isOpen = openIdx === idx;
              return (
                <div key={idx} style={{ borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, overflow: "hidden" }}>
                  <button onClick={() => setOpenIdx(isOpen ? null : idx)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: text, flex: 1, paddingRight: 12 }}>{item.q}</span>
                    <span style={{ fontSize: 14, color: muted, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 20px 16px", fontSize: 13, color: muted, lineHeight: 1.8 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>{p("faqNotFound")}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn C={C} onClick={() => navigate("contact")}>{p("faqContact")}</Btn>
          <Btn C={C} onClick={() => navigate("howto")} ghost>{p("faqHowto")}</Btn>
        </div>
      </div>
    </div>
  );
}
