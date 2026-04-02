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
    { cat: "SNS 글쓰기", items: [
      { icon: "NB", title: "네이버 블로그", desc: "SEO 최적화 블로그 글 자동 생성" },
      { icon: "C", title: "네이버 카페", desc: "카페 커뮤니티 최적화 글 작성" },
      { icon: "T", title: "티스토리", desc: "HTML 형식 블로그 포스트 자동 작성" },
      { icon: "IG", title: "인스타그램 캡션", desc: "해시태그 포함 캡션 자동 생성" },
      { icon: "YT", title: "유튜브 대본", desc: "영상 스크립트·설명란·SEO 태그" },
      { icon: "Th", title: "스레드", desc: "임팩트 있는 스레드 게시물 작성" },
    ]},
    { cat: "SNS 이미지", items: [
      { icon: "N", title: "카드뉴스", desc: "AI 기획 + 이미지 자동 생성" },
      { icon: "SC", title: "심플 카드뉴스", desc: "감성 카드뉴스 빠르게 완성" },
      { icon: "DP", title: "상세페이지", desc: "제품 상세페이지 자동 생성" },
      { icon: "SD", title: "심플 상세페이지", desc: "기본형 상세페이지 빠르게 완성" },
    ]},
    { cat: "이미지 생성 AI", items: [
      { icon: "PS", title: "AI 제품 컷", desc: "상품 사진 AI 배경으로 프로급 연출" },
      { icon: "LG", title: "AI 로고 생성", desc: "브랜드 콘셉트로 로고 자동 생성" },
      { icon: "MK", title: "AI 목업 생성", desc: "디자인을 목업 이미지에 합성" },
      { icon: "MD", title: "AI 모델 생성", desc: "상품 착용 AI 모델 이미지 생성" },
      { icon: "FS", title: "얼굴 교체", desc: "원하는 얼굴로 자연스럽게 교체" },
      { icon: "OS", title: "의상 교체", desc: "AI로 의상을 다른 스타일로 교체" },
      { icon: "OP", title: "여백 채우기", desc: "이미지 여백을 AI가 자연스럽게 확장" },
    ]},
    { cat: "AI 영상 제작", items: [
      { icon: "SF", title: "숏폼 편집기", desc: "영상 파일로 숏폼 자동 편집·자막 추가" },
      { icon: "SV", title: "AI 쇼츠 영상 제작", desc: "AI로 숏폼 영상 자동 생성" },
      { icon: "ST", title: "AI 자막 생성", desc: "영상에 자막을 자동으로 생성·삽입" },
      { icon: "TL", title: "타임라인 편집기", desc: "직관적인 타임라인 기반 영상 편집" },
    ]},
  ];

  return (
    <div style={{ background: C.bg }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>{p("aboutBadge")}</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          {p("aboutTitle1")}<br/>
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p("aboutTitle2")}</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 20, maxWidth: 620 }}>
          {p("aboutIntro")}
        </p>

        {/* 미션 스테이트먼트 */}
        <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 24, background: "rgba(124,106,255,0.08)", marginBottom: 48 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#7c6aff" }}>
            {lang === "ko"
              ? "우리의 미션: 모든 콘텐츠 크리에이터의 시간을 되돌려주는 것"
              : "Our mission: Giving every content creator their time back"}
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
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.04))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "36px 32px", marginBottom: 28 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>{p("aboutBrandTitle")}</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.8 }}>{p("aboutBrandSub")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { word: "SNS", sub: "Social Network Service", desc: "인스타그램, 유튜브, 블로그 등 소셜 콘텐츠 플랫폼 전체", color: "#7c6aff" },
              { word: "Make it", sub: "만들다 · 해내다 · 실행하다", desc: "Make it happen — 현실로 만들어내다. SNS 콘텐츠를 실제로 완성시킨다는 의미", color: "#ec4899" },
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
              "SNS 콘텐츠를 쉽게 만들어 실행하게 도와주는 플랫폼"
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.8 }}>
              SNS 콘텐츠 제작 키트 · SNS 콘텐츠 자동 생성 플랫폼 · SNS 콘텐츠 올인원 툴
            </p>
          </div>
        </div>

        {/* 회사 개요 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { value: lang === "ko" ? "2024.10" : "Oct 2024", label: lang === "ko" ? "서비스 런칭" : "Launched", icon3d: "/icons3d/sns-heart.png" },
            { value: "20+", label: lang === "ko" ? "AI 도구" : "AI Tools", icon3d: "/icons3d/keyboard.png" },
            { value: lang === "ko" ? "4개국어" : "4 Languages", label: lang === "ko" ? "다국어 지원" : "Multilingual", icon3d: "/icons3d/sns-content.png" },
            { value: "2,000+", label: lang === "ko" ? "월 사용자" : "Monthly Users", icon3d: "/icons3d/char-headphone.png" },
          ].map((stat, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "24px 20px", textAlign: "center", boxShadow: C.shadow }}>
              <img src={stat.icon3d} alt="" style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 900, color: "#7c6aff", marginBottom: 4 }}>{stat.value}</div>
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
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.06))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#7c6aff", marginBottom: 12 }}>START</div>
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
      step: "01", icon: "", color: "#7c6aff",
      title: p("howtoS1"),
      desc: p("howtoS1d"),
      tips: ["구글·카카오 소셜 로그인 지원", "비회원 5회 → 회원 10회 무료", "가입 즉시 100P 지급"],
    },
    {
      step: "02", icon: "", color: "#8b5cf6",
      title: p("howtoS2"),
      desc: p("howtoS2d"),
      tips: ["SNS 글쓰기: 블로그·인스타·유튜브·스레드 등", "SNS 이미지: 카드뉴스·상세페이지", "이미지 생성: 제품컷·로고·목업·모델"],
    },
    {
      step: "03", icon: "", color: "#ec4899",
      title: p("howtoS3"),
      desc: p("howtoS3d"),
      tips: ["URL 입력 시 뉴스·유튜브 내용 자동 요약", "SEO 키워드 자동 추천 기능 활용", "글 톤(정보성·감성·전문적 등) 선택 가능"],
    },
    {
      step: "04", icon: "", color: "#f59e0b",
      title: p("howtoS4"),
      desc: p("howtoS4d"),
      tips: ["생성 중 페이지를 떠나면 결과가 사라질 수 있어요", "이미지 생성은 평균 15~30초 소요", "글 생성은 분량에 따라 30초~3분"],
    },
    {
      step: "05", icon: "SD", color: "#10b981",
      title: p("howtoS5"),
      desc: p("howtoS5d"),
      tips: ["블로그 글은 HTML 형식으로도 복사 가능", "이미지는 PNG 형식으로 다운로드", "마음에 안 들면 재생성 버튼으로 다시 생성"],
    },
    {
      step: "06", icon: "", color: "#7c6aff",
      title: p("howtoS6"),
      desc: p("howtoS6d"),
      tips: ["출석체크: 매일 +3P (연속 보너스)", "게시글 작성: +2P", "AI 생성 1회: -10P"],
    },
  ];

  const POINT_INFO = [
    { label: "비회원", val: "5회 무료", color: "#888", bg: "rgba(0,0,0,0.04)" },
    { label: "회원가입", val: "100P 즉시 지급", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "출석체크", val: "매일 +3P", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "게시글 작성", val: "+2P", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "댓글 작성", val: "없음", color: "#888", bg: "rgba(0,0,0,0.04)" },
    { label: "AI 생성 1회", val: "-10P", color: "#ef4444", bg: "rgba(239,68,68,0.05)" },
  ];

  const FAQ = [
    { q: "비회원도 사용할 수 있나요?", a: "네! 로그인 없이 AI 기능을 5회 무료로 체험할 수 있어요. 회원가입 시 100P를 즉시 드려요." },
    { q: "포인트는 어떻게 쌓이나요?", a: "가입 즉시 100P, 매일 출석체크로 +3P, 게시글 작성 시 +2P가 적립돼요. 충전도 가능해요." },
    { q: "생성된 콘텐츠를 상업적으로 사용해도 되나요?", a: "네, 생성된 콘텐츠는 자유롭게 사용하실 수 있어요. 단 법적 책임은 사용자에게 있습니다." },
    { q: "포인트 유효기간이 있나요?", a: "충전 포인트는 유효기간이 없어요. 마음껏 사용하세요." },
    { q: "생성 결과가 마음에 안 들면 어떻게 하나요?", a: "재생성 버튼을 누르면 다시 생성할 수 있어요. 단, 재생성 시에도 10P가 차감됩니다." },
    { q: "모바일에서도 사용 가능한가요?", a: "네! 모바일 브라우저에서도 모든 기능을 사용할 수 있어요." },
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

        {/* 포인트 안내 */}
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
          <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.8 }}>
              포인트 충전 플랜: <b style={{ color: C.text }}>Standard 3,500P — 19,900원</b> · <b style={{ color: C.text }}>Pro 9,500P — 49,900원</b> · 유효기간 없음
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
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.06))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#7c6aff", marginBottom: 12 }}>START</div>
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
const FAQ_DATA = [
  {
    cat: "서비스 소개",
    items: [
      { q: "SNS메이킷은 어떤 서비스인가요?", a: "SNS메이킷은 AI를 활용하여 블로그 글, 카드뉴스, 상세페이지, 썸네일, 제품 이미지 등 SNS 콘텐츠를 자동으로 생성해주는 올인원 플랫폼입니다. 실시간 검색어 분석과 인플루언서·브랜드 TOP10 랭킹 기능도 제공합니다." },
      { q: "어떤 AI 도구를 사용할 수 있나요?", a: "네이버 블로그, 티스토리, 인스타그램 캡션, 유튜브 대본, 스레드 등 8종 글쓰기 도구와 카드뉴스, 상세페이지, 썸네일 등 이미지 도구, 제품컷, 로고, 목업, AI 모델, 얼굴/의상 교체, 여백 확장 등 총 20가지 이상의 AI 도구를 제공합니다." },
      { q: "AI 분석기는 무엇인가요?", a: "AI가 네이버·구글 실시간 인기 검색어를 분석하여 검색량, 급상승 이유, 연관 키워드를 제공합니다. 인플루언서·브랜드 TOP10 랭킹도 카테고리별로 확인할 수 있습니다." },
    ],
  },
  {
    cat: "포인트 & 요금",
    items: [
      { q: "무료로 사용할 수 있나요?", a: "네! 비회원도 AI 생성기 5회 무료 체험이 가능하고, 회원 가입 시 100P가 즉시 지급됩니다. AI 분석기는 비회원 하루 5회, 회원 하루 5회 무료로 이용 가능합니다." },
      { q: "포인트는 어떻게 충전하나요?", a: "가격정책 페이지에서 원하는 포인트 패키지를 선택하여 결제하시면 즉시 충전됩니다. 또한 매일 출석체크 시 3P, 게시글 작성 시 2P가 자동 적립됩니다." },
      { q: "AI 생성 1회에 포인트가 얼마나 소모되나요?", a: "AI 글쓰기, 카드뉴스, 이미지 생성 등 대부분의 기능은 1회당 10P가 소모됩니다. 썸네일 생성은 무료입니다." },
      { q: "포인트 환불이 가능한가요?", a: "미사용 포인트에 대해서는 결제일로부터 7일 이내 환불 요청이 가능합니다. 문의하기 페이지에서 환불 요청을 보내주세요." },
    ],
  },
  {
    cat: "AI 생성기",
    items: [
      { q: "생성된 글/이미지의 저작권은 누구에게 있나요?", a: "AI로 생성된 모든 콘텐츠의 저작권은 사용자에게 귀속됩니다. 상업적 용도로 자유롭게 사용하실 수 있습니다." },
      { q: "생성 결과가 마음에 들지 않으면 다시 생성할 수 있나요?", a: "네, 같은 주제로 다시 생성하면 매번 새로운 결과물이 나옵니다. 다만 재생성 시에도 포인트가 차감됩니다." },
      { q: "카드뉴스/상세페이지에서 텍스트를 직접 수정할 수 있나요?", a: "네, AI가 생성한 후 편집 화면에서 제목, 본문, 색상, 배경 등을 자유롭게 수정할 수 있습니다. 수정 후 PNG 또는 ZIP으로 다운로드하세요." },
      { q: "생성된 블로그 글을 바로 네이버에 올릴 수 있나요?", a: "생성된 글은 복사 버튼으로 한 번에 복사한 뒤 네이버 블로그 에디터에 붙여넣기하면 됩니다. HTML 형식도 지원합니다." },
    ],
  },
  {
    cat: "AI 분석기",
    items: [
      { q: "AI 분석기는 어떤 기능이 있나요?", a: "실시간 인기 검색어 분석 (검색량, 급상승 이유, 연관 키워드), 인플루언서 랭킹 (유튜버/인스타/블로거/틱톡 TOP10), 브랜드 TOP10 랭킹을 제공합니다." },
      { q: "하루 무료 사용 횟수는 얼마나 되나요?", a: "비회원은 하루 5회, 회원은 하루 5회 무료로 이용할 수 있습니다. 무료 횟수 초과 시 1회당 10P로 추가 분석이 가능합니다." },
      { q: "실시간 검색어 데이터는 얼마나 정확한가요?", a: "AI가 네이버, 구글 등 주요 검색엔진의 트렌드 데이터를 종합 분석하여 제공합니다. 검색량은 예상치이며 참고 자료로 활용해주세요." },
    ],
  },
  {
    cat: "계정 & 기타",
    items: [
      { q: "회원가입은 어떻게 하나요?", a: "이메일과 비밀번호로 간단하게 가입할 수 있습니다. 가입 즉시 100P가 지급되며 바로 AI 도구를 사용하실 수 있습니다." },
      { q: "비밀번호를 잊었어요.", a: "로그인 화면에서 '비밀번호 찾기'를 클릭하면 가입한 이메일로 인증 코드가 발송됩니다. 인증 후 새 비밀번호를 설정하세요." },
      { q: "커뮤니티 게시판은 무엇인가요?", a: "정보 공유, 질문과 답변, 자유 게시판, 사용 후기 등의 커뮤니티 공간입니다. 게시글 작성 시 2P가 적립됩니다." },
      { q: "서비스 관련 문의는 어디로 하나요?", a: "상단 메뉴의 고객센터 > 문의하기 페이지에서 문의를 보내주시면 빠르게 답변드리겠습니다. 이메일: npermovie@naver.com" },
    ],
  },
];

export function FaqPage({ C, navigate }) {
  const [openIdx, setOpenIdx] = useState(null);
  const text = C.text;
  const muted = C.muted;
  const bdr = C.border;
  const cardBg = C.card;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", background: C.purpleBg, border: `1px solid ${C.purple}30`, borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>FAQ</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: text, margin: "0 0 8px" }}>자주 묻는 질문</h2>
        <p style={{ fontSize: 14, color: muted }}>궁금한 점을 빠르게 확인하세요</p>
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
        <p style={{ fontSize: 13, color: muted, marginBottom: 16 }}>원하는 답변을 찾지 못하셨나요?</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn C={C} onClick={() => navigate("contact")}>문의하기</Btn>
          <Btn C={C} onClick={() => navigate("howto")} ghost>이용방법</Btn>
        </div>
      </div>
    </div>
  );
}
