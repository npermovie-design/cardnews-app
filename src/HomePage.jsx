import { useState, useEffect, useRef } from "react";
import { Badge, SecWrap, SecTitle, Btn } from "./UI";

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
  const isDark = C.heroBg?.includes("0f0c29") || C.heroBg?.includes("gradient");

  /* 떠다니는 배경 파티클 */
  const particles = [
    { top: "12%", left: "8%",  size: 320, color: "rgba(124,106,255,0.07)", blur: 70 },
    { top: "60%", right: "6%", size: 260, color: "rgba(236,72,153,0.06)",  blur: 60 },
    { top: "30%", left: "55%", size: 200, color: "rgba(99,102,241,0.05)",  blur: 50 },
  ];

  const ALL_TOOLS = [
    {
      cat: "✍️ SNS 글쓰기", catColor: "#6366f1",
      items: [
        { icon: "📝", title: "네이버 블로그", desc: "SEO 최적화 정보성 블로그 글 자동 생성", tag: "인기", color: "#22c55e" },
        { icon: "☕", title: "네이버 카페", desc: "카페 커뮤니티에 최적화된 글 자동 작성", tag: "", color: "#06b6d4" },
        { icon: "🟠", title: "티스토리", desc: "HTML 형식 블로그 포스트 자동 작성", tag: "", color: "#f59e0b" },
        { icon: "📱", title: "인스타그램 캡션", desc: "해시태그 포함 인스타 게시물 자동 생성", tag: "", color: "#ec4899" },
        { icon: "▶️", title: "유튜브 대본", desc: "영상 스크립트·설명란·SEO 태그 한번에", tag: "", color: "#ef4444" },
        { icon: "🧵", title: "스레드", desc: "짧고 임팩트 있는 스레드 게시물 자동 작성", tag: "", color: "#a855f7" },
      ],
    },
    {
      cat: "🖼 SNS 이미지", catColor: "#8b5cf6",
      items: [
        { icon: "📰", title: "카드뉴스", desc: "AI 기획 + 이미지 자동 생성 카드뉴스", tag: "", color: "#8b5cf6" },
        { icon: "🗂", title: "심플 카드뉴스", desc: "텍스트만 입력하면 감성 카드뉴스 완성", tag: "", color: "#6366f1" },
        { icon: "📄", title: "상세페이지", desc: "제품 상세페이지 기획·이미지 자동 생성", tag: "", color: "#ec4899" },
        { icon: "📋", title: "심플 상세페이지", desc: "빠르게 만드는 기본형 상세페이지", tag: "신규", color: "#10b981" },
      ],
    },
    {
      cat: "🎨 이미지 생성 AI", catColor: "#ec4899",
      items: [
        { icon: "📸", title: "AI 제품 컷", desc: "상품 사진을 AI 배경으로 프로급 제품 사진", tag: "인기", color: "#f59e0b" },
        { icon: "🏷", title: "AI 로고 생성", desc: "브랜드 콘셉트 설명으로 로고 자동 생성", tag: "", color: "#6366f1" },
        { icon: "🖼", title: "AI 목업 생성", desc: "디자인을 목업 이미지에 자동 합성", tag: "", color: "#8b5cf6" },
        { icon: "🧍", title: "AI 모델 생성", desc: "상품을 입은 AI 모델 이미지 자동 생성", tag: "", color: "#ec4899" },
        { icon: "😊", title: "얼굴 교체", desc: "원하는 얼굴로 자연스럽게 교체", tag: "", color: "#10b981" },
        { icon: "👗", title: "의상 교체", desc: "AI로 의상을 다른 스타일로 교체", tag: "", color: "#f59e0b" },
        { icon: "🖌", title: "여백 채우기", desc: "이미지 여백을 AI가 자연스럽게 확장", tag: "신규", color: "#06b6d4" },
      ],
    },
    {
      cat: "🎬 영상 편집", catColor: "#ef4444",
      items: [
        { icon: "📲", title: "숏폼 편집기", desc: "영상 파일로 숏폼 자동 편집·자막 추가", tag: "신규", color: "#ef4444" },
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
          <div key={i} style={{
            position: "absolute", width: p.size, height: p.size, borderRadius: "50%",
            background: p.color, filter: `blur(${p.blur}px)`, pointerEvents: "none",
            top: p.top, left: p.left, right: p.right,
            animation: `float ${4 + i}s ease-in-out infinite`, animationDelay: `${i * 0.8}s`,
          }} />
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820 }}>
          <div style={{ opacity: 1, transform: "none", animation: "none" }}>
            <Badge C={C}>🚀 SNS 콘텐츠 자동 생성 올인원 플랫폼</Badge>
          </div>

          <h1 style={{ fontSize: "clamp(28px,5.5vw,66px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -2, color: C.text, margin: "0 0 12px" }}>
            <TypeWriter
              texts={[
                "블로그 글, 3분만에 AI가 완성",
                "카드뉴스·상세페이지 자동 생성",
                "AI 제품컷·로고·목업 한번에",
                "숏폼 영상도 자동 편집·자막",
                "SNS 콘텐츠, 이제 AI가 대신해요",
              ]}
              speed={55} pause={2200}
            />
          </h1>
          <h2 style={{ fontSize: "clamp(22px,4vw,52px)", fontWeight: 900, lineHeight: 1.12, letterSpacing: -1.5, color: C.text, margin: "0 0 28px" }}>
            글쓰기부터 이미지·영상까지,{" "}
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SNS메이킷 하나로 끝
            </span>
          </h2>
          <p style={{ fontSize: "clamp(14px,1.7vw,18px)", color: C.muted, lineHeight: 1.9, maxWidth: 580, margin: "0 auto 16px" }}>
            블로그·인스타·유튜브 글쓰기부터 카드뉴스·상세페이지·AI 이미지까지<br/>
            <b style={{ color: C.purpleL }}>20가지 AI 도구</b>가 한 곳에 모여 있어요.<br/>
            <b style={{ color: C.purpleL }}>비회원 10회 무료 · 가입 즉시 200P 지급!</b>
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 52, marginTop: 36 }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 무료 체험</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>💎 요금제 보기</Btn>
          </div>

          {/* 실시간 통계 */}
          <div style={{ display: "flex", gap: "clamp(24px,5vw,52px)", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { val: 20,   suffix: "가지+", label: "AI 도구" },
              { val: 5200, suffix: "+",     label: "생성된 콘텐츠" },
              { val: 3,    suffix: "분",    label: "평균 생성 시간" },
            ].map(({ val, suffix, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(20px,3vw,32px)", fontWeight: 900, background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  <CountUp to={val} suffix={suffix} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
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
        <SecTitle C={C} badge="AI Tools" title="20가지 AI 도구가 한 곳에"
          sub="SNS 글쓰기부터 이미지 생성, 숏폼 편집까지 — SNS 콘텐츠 제작에 필요한 모든 도구를 SNS메이킷에서 만나세요." />
        {ALL_TOOLS.map((cat, ci) => (
          <div key={cat.cat} style={{ marginBottom: ci < ALL_TOOLS.length - 1 ? 36 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: cat.catColor }}>{cat.cat}</div>
              <div style={{ flex: 1, height: 1, background: `${cat.catColor}30` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(180px,100%),1fr))", gap: 12 }}>
              {cat.items.map((tool, i) => (
                <FadeIn key={tool.title} delay={i * 0.06}>
                  <div className="tool-card" onClick={() => navigate("ai")}
                    style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 16px", cursor: "pointer", position: "relative", transition: "all 0.25s", boxShadow: C.shadow, height: "100%" }}>
                    {tool.tag && (
                      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 800, background: tool.color, color: "#fff", padding: "2px 7px", borderRadius: 7 }}>{tool.tag}</div>
                    )}
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{tool.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 6 }}>{tool.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{tool.desc}</div>
                    <div style={{ marginTop: 12, fontSize: 11, color: tool.color, fontWeight: 700 }}>바로 사용하기 →</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        ))}
      </SecWrap>

      {/* ══ 사용 방법 (3단계) ══ */}
      <SecWrap C={C}>
        <SecTitle C={C} badge="How it works" title="3단계로 완성되는 AI 콘텐츠" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 20 }}>
          {[
            { step: "01", icon: "🎯", title: "키워드 또는 파일 입력", desc: "주제·키워드를 입력하거나 이미지·영상 파일을 올리세요. 대상 독자, 글 톤, 분량까지 간단히 설정하면 준비 끝!", color: "#6366f1" },
            { step: "02", icon: "🤖", title: "AI가 자동 생성", desc: "AI가 글·이미지·영상 편집을 자동으로 완성해요. 블로그 글은 30초~3분, 이미지는 10~30초 이내로 완성됩니다.", color: "#8b5cf6" },
            { step: "03", icon: "📋", title: "복사·다운로드·활용", desc: "생성된 글은 그대로 복사해서 붙여넣기, 이미지는 바로 다운로드. SNS에 올리면 끝!", color: "#ec4899" },
          ].map((s, i) => (
            <FadeIn key={s.step} delay={i * 0.15}>
              <div style={{ position: "relative", background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 24px", boxShadow: C.shadow, overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 72, fontWeight: 900, color: s.color, opacity: 0.06, fontFamily: "monospace", lineHeight: 1 }}>{s.step}</div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>{s.icon}</div>
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
        <SecTitle C={C} badge="Reviews" title="실제 사용자 후기" sub="SNS메이킷을 사용해본 분들의 생생한 후기예요." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 16 }}>
          {[
            { name: "김블로그", job: "네이버 블로그 운영자", avatar: "🙋‍♀️", rating: 5, platform: "네이버 블로그", text: "예전엔 글 하나 쓰는데 2~3시간 걸렸는데 이제 30분이면 돼요. SEO 키워드도 알아서 넣어줘서 상위 노출도 잘 되고 있어요. 진짜 신세계입니다 ㅋㅋ", result: "글 작성 시간 85% 단축" },
            { name: "마케터 이씨", job: "인스타 마케터", avatar: "💁‍♂️", rating: 5, platform: "인스타그램", text: "캡션 쓰는 게 매일 스트레스였는데 이제 클릭 몇 번이면 끝나요. 해시태그도 잘 추천해주고 팔로워도 조금씩 늘고 있어요.", result: "팔로워 월 200명 증가" },
            { name: "유튜버 박씨", job: "유튜브 채널 운영", avatar: "🎬", rating: 5, platform: "유튜브", text: "대본이랑 설명란 작성이 제일 힘들었는데 이 툴 쓰고 나서 영상 발행 속도가 2배 빨라졌어요. 숏폼 편집기로 클립 만드는 것도 너무 편해요.", result: "영상 발행 속도 2배" },
            { name: "소상공인 최씨", job: "카페 사장님", avatar: "☕", rating: 5, platform: "블로그 + 인스타", text: "홍보 글 쓸 줄 몰라서 항상 고민이었는데 이제 메뉴 소개, 이벤트 공지 다 AI로 뚝딱 만들어요. AI 제품컷으로 메뉴 사진도 예쁘게 바꾸고 있어요.", result: "월 홍보 비용 60% 절감" },
            { name: "강사 정씨", job: "온라인 강의 운영", avatar: "👩‍🏫", rating: 5, platform: "티스토리 + 카드뉴스", text: "강의 관련 블로그 포스팅을 매주 올리는데 AI 카드뉴스까지 같이 만드니까 콘텐츠 퀄리티가 훨씬 올라갔어요. 수강생들 반응도 좋아졌어요.", result: "포스팅 발행 주 2회→5회" },
            { name: "쇼핑몰 한씨", job: "패션 쇼핑몰 운영", avatar: "👗", rating: 5, platform: "AI 이미지 생성", text: "AI 제품컷이랑 의상 교체 기능으로 모델 촬영비가 확 줄었어요. 상세페이지도 AI로 뚝딱 만드니까 신상 등록이 3배 빨라졌습니다.", result: "이미지 제작비 70% 절감" },
          ].map((r, i) => (
            <FadeIn key={r.name} delay={i * 0.08}>
              <div className="review-card" style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 12, boxShadow: C.shadow, transition: "all 0.25s" }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {"⭐".repeat(r.rating).split("").map((s, j) => (
                    <span key={j} style={{ fontSize: 14 }}>⭐</span>
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
        <SecTitle C={C} badge="Pricing" title="합리적인 포인트 시스템" sub="비회원도 10회 무료! 포인트 충전으로 더 많이 사용하세요." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 14 }}>
          {[
            { icon: "🎁", title: "비회원 무료", point: "10회", desc: "로그인 없이 AI 생성기 10회 무료 체험", color: "#888", btnText: "무료 체험하기", onClick: () => navigate("ai") },
            { icon: "👤", title: "회원 가입", point: "200P 지급", desc: "가입 즉시 200P 지급 + 게시글·로그인 포인트 적립", color: "#22c55e", btnText: "무료 회원가입", onClick: () => navigate("ai") },
            { icon: "⚡", title: "Basic 충전", point: "500P", desc: "9,900원 · AI 50회 분량 · 유효기간 없음", color: "#6366f1", btnText: "충전하기", onClick: () => navigate("pricing"), highlight: false },
            { icon: "🔥", title: "Pro 충전", point: "1,200P", desc: "19,900원 · AI 120회 분량 · 우선 고객지원", color: "#8b5cf6", btnText: "충전하기", onClick: () => navigate("pricing"), highlight: true },
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
                {p.highlight && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", padding: "3px 12px", borderRadius: "0 0 8px 8px" }}>추천</div>}
                <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: p.color, marginBottom: 8 }}>{p.point}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</div>
                <button onClick={p.onClick} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", background: p.highlight ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(124,106,255,0.1)", color: p.highlight ? "#fff" : C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {p.btnText}
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </SecWrap>

      {/* ══ 차별점 ══ */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge="Why SNS메이킷" title="왜 SNS메이킷 AI인가요?" sub="SNS 콘텐츠 제작의 어려움을 해결하기 위해 만들었습니다." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: 12 }}>
          {[
            { icon: "⚡", title: "빠른 생성 속도", desc: "블로그 글은 30초~3분, AI 이미지는 10~30초 이내 완성. 직접 만드는 것보다 10배 이상 빠릅니다." },
            { icon: "🎯", title: "SEO 자동 최적화", desc: "키워드를 자동으로 파악해 검색 상위 노출에 유리한 구조로 글을 작성합니다." },
            { icon: "🌏", title: "20가지+ 올인원 도구", desc: "글쓰기·이미지·영상 편집까지 하나의 플랫폼에서 모두 해결. 여러 툴을 오갈 필요 없어요." },
            { icon: "💰", title: "합리적인 비용", desc: "월정액 없이 포인트 충전 방식. 비회원도 10회 무료로 바로 체험할 수 있어요." },
          ].map((d, i) => (
            <FadeIn key={d.title} delay={i * 0.1}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 20px", boxShadow: C.shadow, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,rgba(124,106,255,0.15),rgba(236,72,153,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{d.icon}</div>
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
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "rgba(124,106,255,0.07)", filter: "blur(80px)", pointerEvents: "none", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <Badge C={C}>🚀 지금 무료로 시작하세요</Badge>
          <h2 style={{ fontSize: "clamp(26px,5vw,54px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.15, margin: "0 0 20px" }}>
            콘텐츠 제작,<br/>
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI로 더 빠르고 쉽게
            </span>
          </h2>
          <p style={{ fontSize: "clamp(14px,1.6vw,17px)", color: C.muted, lineHeight: 1.9, marginBottom: 40 }}>
            로그인 없이 지금 바로 10회 무료 체험!<br/>
            회원가입하면 200P 추가 지급 + 포인트 적립으로 더 오래 사용하세요.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 무료 체험</Btn>
            <Btn C={C} onClick={() => navigate("about")} ghost>서비스 소개 보기</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}
