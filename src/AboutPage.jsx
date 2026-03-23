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
    { cat: "✍️ SNS 글쓰기", items: [
      { icon: "📝", title: "네이버 블로그", desc: "SEO 최적화 블로그 글 자동 생성" },
      { icon: "☕", title: "네이버 카페", desc: "카페 커뮤니티 최적화 글 작성" },
      { icon: "🟠", title: "티스토리", desc: "HTML 형식 블로그 포스트 자동 작성" },
      { icon: "📱", title: "인스타그램 캡션", desc: "해시태그 포함 캡션 자동 생성" },
      { icon: "▶️", title: "유튜브 대본", desc: "영상 스크립트·설명란·SEO 태그" },
      { icon: "🧵", title: "스레드", desc: "임팩트 있는 스레드 게시물 작성" },
    ]},
    { cat: "🖼 SNS 이미지", items: [
      { icon: "📰", title: "카드뉴스", desc: "AI 기획 + 이미지 자동 생성" },
      { icon: "🗂", title: "심플 카드뉴스", desc: "감성 카드뉴스 빠르게 완성" },
      { icon: "📄", title: "상세페이지", desc: "제품 상세페이지 자동 생성" },
      { icon: "📋", title: "심플 상세페이지", desc: "기본형 상세페이지 빠르게 완성" },
    ]},
    { cat: "🎨 이미지 생성 AI", items: [
      { icon: "📸", title: "AI 제품 컷", desc: "상품 사진 AI 배경으로 프로급 연출" },
      { icon: "🏷", title: "AI 로고 생성", desc: "브랜드 콘셉트로 로고 자동 생성" },
      { icon: "🖼", title: "AI 목업 생성", desc: "디자인을 목업 이미지에 합성" },
      { icon: "🧍", title: "AI 모델 생성", desc: "상품 착용 AI 모델 이미지 생성" },
      { icon: "😊", title: "얼굴 교체", desc: "원하는 얼굴로 자연스럽게 교체" },
      { icon: "👗", title: "의상 교체", desc: "AI로 의상을 다른 스타일로 교체" },
      { icon: "🖌", title: "여백 채우기", desc: "이미지 여백을 AI가 자연스럽게 확장" },
    ]},
    { cat: "🎬 영상 편집", items: [
      { icon: "📲", title: "숏폼 편집기", desc: "영상 파일로 숏폼 자동 편집·자막 추가" },
    ]},
  ];

  return (
    <div style={{ background: C.bg }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>{p("aboutBadge")}</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          {p("aboutTitle1")}<br/>
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#1a1730)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p("aboutTitle2")}</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 620 }}>
          {p("aboutIntro")}
        </p>

        {/* 공감 섹션 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>{p("aboutPain")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "😓", text: p("aboutPain1") },
              { icon: "⏰", text: p("aboutPain2") },
              { icon: "📱", text: p("aboutPain3") },
              { icon: "🔄", text: p("aboutPain4") },
              { icon: "💸", text: p("aboutPain5") },
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
              { word: "Make it", sub: "만들다 · 해내다 · 실행하다", desc: "Make it happen — 현실로 만들어내다. SNS 콘텐츠를 실제로 완성시킨다는 의미", color: "#1a1730" },
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
              { icon: "🏪", title: p("aboutRec1"), desc: p("aboutRec1d") },
              { icon: "💼", title: p("aboutRec2"), desc: p("aboutRec2d") },
              { icon: "🎓", title: p("aboutRec3"), desc: p("aboutRec3d") },
              { icon: "📊", title: p("aboutRec4"), desc: p("aboutRec4d") },
              { icon: "🛒", title: p("aboutRec5"), desc: p("aboutRec5d") },
              { icon: "🌱", title: p("aboutRec6"), desc: p("aboutRec6d") },
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
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
      step: "01", icon: "🔐", color: "#7c6aff",
      title: p("howtoS1"),
      desc: p("howtoS1d"),
      tips: ["구글·카카오 소셜 로그인 지원", "비회원 10회 → 회원 20회 무료", "가입 즉시 200P 지급"],
    },
    {
      step: "02", icon: "🎯", color: "#8b5cf6",
      title: p("howtoS2"),
      desc: p("howtoS2d"),
      tips: ["SNS 글쓰기: 블로그·인스타·유튜브·스레드 등", "SNS 이미지: 카드뉴스·상세페이지", "이미지 생성: 제품컷·로고·목업·모델"],
    },
    {
      step: "03", icon: "📝", color: "#1a1730",
      title: p("howtoS3"),
      desc: p("howtoS3d"),
      tips: ["URL 입력 시 뉴스·유튜브 내용 자동 요약", "SEO 키워드 자동 추천 기능 활용", "글 톤(정보성·감성·전문적 등) 선택 가능"],
    },
    {
      step: "04", icon: "🤖", color: "#f59e0b",
      title: p("howtoS4"),
      desc: p("howtoS4d"),
      tips: ["생성 중 페이지를 떠나면 결과가 사라질 수 있어요", "이미지 생성은 평균 15~30초 소요", "글 생성은 분량에 따라 30초~3분"],
    },
    {
      step: "05", icon: "📋", color: "#10b981",
      title: p("howtoS5"),
      desc: p("howtoS5d"),
      tips: ["블로그 글은 HTML 형식으로도 복사 가능", "이미지는 PNG 형식으로 다운로드", "마음에 안 들면 재생성 버튼으로 다시 생성"],
    },
    {
      step: "06", icon: "💎", color: "#7c6aff",
      title: p("howtoS6"),
      desc: p("howtoS6d"),
      tips: ["출석체크: 매일 +3P (연속 보너스)", "게시글 작성: +1P", "AI 생성 1회: -10P"],
    },
  ];

  const POINT_INFO = [
    { label: "비회원", val: "10회 무료", color: "#888", bg: "rgba(0,0,0,0.04)" },
    { label: "회원가입", val: "200P 즉시 지급", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "출석체크", val: "매일 +3P", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "게시글 작성", val: "+1P", color: "#10b981", bg: "rgba(16,185,129,0.06)" },
    { label: "댓글 작성", val: "없음", color: "#888", bg: "rgba(0,0,0,0.04)" },
    { label: "AI 생성 1회", val: "-10P", color: "#ef4444", bg: "rgba(239,68,68,0.05)" },
  ];

  const FAQ = [
    { q: "비회원도 사용할 수 있나요?", a: "네! 로그인 없이 AI 기능을 10회 무료로 체험할 수 있어요. 회원가입 시 200P를 즉시 드려요." },
    { q: "포인트는 어떻게 쌓이나요?", a: "가입 즉시 200P, 매일 출석체크로 +3P, 게시글 작성 시 +1P가 적립돼요. 충전도 가능해요." },
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
              💡 포인트 충전 플랜: <b style={{ color: C.text }}>Basic 500P — 9,900원</b> · <b style={{ color: C.text }}>Pro 1,200P — 19,900원</b> · 유효기간 없음
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
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
