import { Btn, Badge } from "./UI";

/* ═══════════════════════════════════════════
   소개 페이지
═══════════════════════════════════════════ */
export function AboutPage({ navigate, C }) {
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
        <Badge C={C}>✦ About SNS메이킷</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          SNS 콘텐츠 제작,<br/>
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>이제 AI가 대신해드려요</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 620 }}>
          SNS메이킷은 <b style={{ color: C.text }}>SNS 콘텐츠 제작에 어려움을 느끼는 모든 분들</b>을 위해 만든 AI 기반 콘텐츠 생성 플랫폼입니다.
        </p>

        {/* 공감 섹션 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>혹시 이런 경험 있으신가요?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "😓", text: "SNS를 해야 한다는 건 알지만, 매번 뭘 써야 할지 막막하다" },
              { icon: "⏰", text: "블로그 글 하나 쓰는 데 2~3시간이 걸려 지쳐버렸다" },
              { icon: "📱", text: "인스타, 유튜브, 블로그... 여러 플랫폼에 올릴 콘텐츠가 너무 부담스럽다" },
              { icon: "🔄", text: "매일 꾸준히 올리고 싶은데 아이디어가 금방 바닥난다" },
              { icon: "💸", text: "콘텐츠 외주를 맡기자니 비용이 부담되고, 직접 하자니 시간이 없다" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderRadius: 12, background: bg2 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.purpleL, marginTop: 24, lineHeight: 1.8 }}>
            👆 이런 고민들, SNS메이킷이 해결해드립니다.
          </p>
        </div>

        {/* 브랜드 의미 */}
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.04))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "36px 32px", marginBottom: 28 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이란?</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.8 }}>이름에 모든 것이 담겨 있어요.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { word: "SNS", sub: "Social Network Service", desc: "인스타그램, 유튜브, 블로그 등 소셜 콘텐츠 플랫폼 전체", color: "#6366f1" },
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

        {/* 만들어진 이유 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이 만들어진 이유</h3>
          <div style={{ fontSize: 15, color: C.muted, lineHeight: 2.1 }}>
            <p style={{ marginBottom: 16 }}>
              SNS가 비즈니스에서 필수가 된 시대입니다. 하지만 현실은 어떤가요?
              <span style={{ color: C.text, fontWeight: 700 }}> 콘텐츠 하나 만드는 데 수 시간이 걸리고, 매일 올려야 한다는 부담감에 SNS 자체를 포기하는 분들이 많습니다.</span>
            </p>
            <p style={{ marginBottom: 16 }}>
              글쓰기에 자신 없는 분, 아이디어가 자꾸 막히는 분, 여러 플랫폼을 동시에 관리해야 하는 분들 모두가
              <span style={{ color: C.purpleL, fontWeight: 700 }}> "SNS 콘텐츠 제작"이라는 장벽 앞에 멈춰버립니다.</span>
            </p>
            <p style={{ marginBottom: 0 }}>
              SNS메이킷은 바로 이 문제를 해결하기 위해 탄생했습니다.
              <span style={{ color: C.text, fontWeight: 700 }}> 키워드 하나만 입력하면 AI가 블로그 글, 인스타 캡션, 유튜브 대본, 카드뉴스, AI 이미지까지 자동으로 완성</span>해드립니다.
              <span style={{ color: C.purpleL, fontWeight: 700 }}> SNS메이킷은 오늘도 새로운 기능을 만들고 있습니다.</span>
            </p>
          </div>
        </div>

        {/* 이런 분들께 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 28, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>이런 분들께 추천드려요</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 }}>
            {[
              { icon: "🏪", title: "소상공인 · 자영업자", desc: "매장 홍보를 위한 SNS 콘텐츠를 빠르게 만들고 싶은 분" },
              { icon: "💼", title: "1인 기업 · 프리랜서", desc: "개인 브랜딩을 위해 꾸준히 콘텐츠를 올리고 싶은 분" },
              { icon: "🎓", title: "강사 · 코치 · 전문가", desc: "지식을 SNS 콘텐츠로 쉽게 변환하고 싶은 분" },
              { icon: "📊", title: "마케터 · 콘텐츠 담당자", desc: "여러 플랫폼 콘텐츠를 빠르게 대량 생산해야 하는 분" },
              { icon: "🛒", title: "쇼핑몰 · 브랜드 운영자", desc: "AI 제품컷·상세페이지로 촬영·디자인 비용을 줄이고 싶은 분" },
              { icon: "🌱", title: "SNS 입문자 누구나", desc: "SNS를 처음 시작하는데 무엇을 올려야 할지 모르는 분" },
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
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>SNS메이킷이 지원하는 AI 도구 전체</h3>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>총 <b style={{ color: C.purpleL }}>20가지+</b> AI 도구가 준비되어 있어요.</p>
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
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>지금 바로 시작해보세요</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            회원가입 없이 10회 무료 체험 가능해요.<br/>
            가입하면 즉시 200P 지급 + AI 생성기 풀 이용 가능!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 무료 체험</Btn>
            <Btn C={C} onClick={() => navigate("howto")} ghost>📖 이용방법 보기</Btn>
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
  const HOW_TO = [
    {
      step: "01", icon: "🔐", color: "#6366f1",
      title: "회원가입 & 로그인",
      desc: "오른쪽 상단 [로그인] 버튼을 눌러 회원가입하세요. 가입 즉시 200P가 자동 지급됩니다. 비회원도 10회 무료로 체험할 수 있어요.",
      tips: ["구글·카카오 소셜 로그인 지원", "비회원 10회 → 회원 20회 무료", "가입 즉시 200P 지급"],
    },
    {
      step: "02", icon: "🎯", color: "#8b5cf6",
      title: "AI 생성기 선택",
      desc: "상단 메뉴 [AI 생성기]를 클릭하면 SNS 글쓰기 / SNS 이미지 / 이미지 생성 세 카테고리가 나와요. 원하는 도구를 선택하세요.",
      tips: ["SNS 글쓰기: 블로그·인스타·유튜브·스레드 등", "SNS 이미지: 카드뉴스·상세페이지", "이미지 생성: 제품컷·로고·목업·모델"],
    },
    {
      step: "03", icon: "📝", color: "#ec4899",
      title: "키워드·파일 입력",
      desc: "주제·키워드를 입력하거나 이미지·영상 파일을 올리세요. 글 톤, 분량, 스타일 등 옵션을 설정하면 AI가 더 정확하게 만들어줘요.",
      tips: ["URL 입력 시 뉴스·유튜브 내용 자동 요약", "SEO 키워드 자동 추천 기능 활용", "글 톤(정보성·감성·전문적 등) 선택 가능"],
    },
    {
      step: "04", icon: "🤖", color: "#f59e0b",
      title: "AI 자동 생성 대기",
      desc: "생성 버튼을 누르면 AI가 자동으로 작업을 시작해요. 글쓰기는 30초~3분, 이미지는 10~30초면 완성됩니다.",
      tips: ["생성 중 페이지를 떠나면 결과가 사라질 수 있어요", "이미지 생성은 평균 15~30초 소요", "글 생성은 분량에 따라 30초~3분"],
    },
    {
      step: "05", icon: "📋", color: "#10b981",
      title: "결과 복사·다운로드",
      desc: "생성된 글은 [복사] 버튼으로 바로 복사해서 SNS에 붙여넣기, 이미지는 [다운로드]로 저장 후 SNS에 업로드하면 끝!",
      tips: ["블로그 글은 HTML 형식으로도 복사 가능", "이미지는 PNG 형식으로 다운로드", "마음에 안 들면 재생성 버튼으로 다시 생성"],
    },
    {
      step: "06", icon: "💎", color: "#6366f1",
      title: "포인트 충전·관리",
      desc: "무료 횟수를 모두 사용했다면 [가격정책]에서 포인트를 충전하세요. 출석체크·게시글 작성으로도 포인트를 적립할 수 있어요.",
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
        <Badge C={C}>📖 How to Use</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          SNS메이킷
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> 이용방법</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 560 }}>
          처음이세요? 6단계를 따라하면 누구든 바로 시작할 수 있어요.
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
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>💎 포인트 적립·차감 안내</h3>
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
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>❓ 자주 묻는 질문</h3>
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
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>이제 직접 써보세요!</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            이론보다 직접 해보는 게 훨씬 빨라요.<br/>
            비회원도 10회 무료, 가입하면 200P 즉시!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 바로 체험</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>💎 요금제 보기</Btn>
          </div>
        </div>

      </div>
    </div>
  );
}
