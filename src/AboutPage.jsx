import { Btn, Badge } from "./UI";

export function AboutPage({ navigate, C }) {
  const bg2 = C.bg2 || (C.border?.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)");

  const HOW_TO = [
    {
      step: "01", icon: "🔐", color: "#6366f1",
      title: "회원가입 & 로그인",
      desc: "오른쪽 상단 [로그인] 버튼을 눌러 회원가입하세요. 가입 즉시 200P가 자동 지급됩니다. 비회원도 5회 무료로 체험할 수 있어요.",
    },
    {
      step: "02", icon: "🎯", color: "#8b5cf6",
      title: "AI 생성기 선택",
      desc: "상단 메뉴 [AI 생성기]를 클릭하면 SNS 글쓰기 / SNS 이미지 / 이미지 생성 세 카테고리가 나와요. 원하는 도구를 선택하세요.",
    },
    {
      step: "03", icon: "📝", color: "#ec4899",
      title: "키워드·파일 입력",
      desc: "주제·키워드를 입력하거나 이미지·영상 파일을 올리세요. 글 톤, 분량, 스타일 등 옵션을 설정하면 AI가 더 정확하게 만들어줘요.",
    },
    {
      step: "04", icon: "🤖", color: "#f59e0b",
      title: "AI 자동 생성 대기",
      desc: "생성 버튼을 누르면 AI가 자동으로 작업을 시작해요. 글쓰기는 30초~3분, 이미지는 10~30초면 완성됩니다.",
    },
    {
      step: "05", icon: "📋", color: "#10b981",
      title: "결과 복사·다운로드",
      desc: "생성된 글은 [복사] 버튼으로 바로 복사해서 SNS에 붙여넣기, 이미지는 [다운로드]로 저장 후 SNS에 업로드하면 끝!",
    },
    {
      step: "06", icon: "💎", color: "#6366f1",
      title: "포인트 충전·관리",
      desc: "무료 횟수를 모두 사용했다면 [가격정책]에서 포인트를 충전하세요. 출석체크·게시글 작성으로도 포인트를 적립할 수 있어요.",
    },
  ];

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
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>✦ About SNS메이킷</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          SNS 콘텐츠 제작,<br/>
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>이제 AI가 대신해드려요</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 620 }}>
          SNS메이킷은 <b style={{ color: C.text }}>SNS 콘텐츠 제작에 어려움을 느끼는 모든 분들</b>을 위해 만든 AI 기반 콘텐츠 생성 플랫폼입니다.
        </p>

        {/* ── 투컬럼: 소개(좌) + 이용방법(우) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start", marginBottom: 32 }}>

          {/* ── 왼쪽: 소개 콘텐츠 ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* 공감 섹션 */}
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 18, letterSpacing: -0.5 }}>혹시 이런 경험 있으신가요?</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: "😓", text: "SNS를 해야 한다는 건 알지만, 매번 뭘 써야 할지 막막하다" },
                  { icon: "⏰", text: "블로그 글 하나 쓰는 데 2~3시간이 걸려 지쳐버렸다" },
                  { icon: "📱", text: "인스타, 유튜브, 블로그... 여러 플랫폼에 올릴 콘텐츠가 너무 부담스럽다" },
                  { icon: "🔄", text: "매일 꾸준히 올리고 싶은데 아이디어가 금방 바닥난다" },
                  { icon: "💸", text: "콘텐츠 외주를 맡기자니 비용이 부담되고, 직접 하자니 시간이 없다" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 12, background: bg2 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{item.text}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.purpleL, marginTop: 20, lineHeight: 1.8 }}>
                👆 이런 고민들, SNS메이킷이 해결해드립니다.
              </p>
            </div>

            {/* 브랜드 의미 */}
            <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.04))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "32px 28px" }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이란?</h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, lineHeight: 1.8 }}>이름에 모든 것이 담겨 있어요.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                {[
                  { word: "SNS", sub: "Social Network Service", desc: "인스타그램, 유튜브, 블로그 등 소셜 콘텐츠 플랫폼 전체", color: "#6366f1" },
                  { word: "Make it", sub: "만들다 · 해내다 · 실행하다", desc: "Make it happen — 현실로 만들어내다. SNS 콘텐츠를 실제로 완성시킨다는 의미", color: "#ec4899" },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 14, padding: "20px 18px", border: "1px solid " + C.border }}>
                    <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 5, background: `linear-gradient(135deg,${item.color},#8b5cf6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{item.word}</div>
                    <div style={{ fontSize: 11, color: item.color, fontWeight: 700, marginBottom: 8 }}>{item.sub}</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, borderRadius: 12, padding: "18px 20px", border: "1px solid " + C.border, textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 900, color: C.text, margin: "0 0 6px", letterSpacing: -0.5 }}>
                  "SNS 콘텐츠를 쉽게 만들어 실행하게 도와주는 플랫폼"
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.8 }}>
                  SNS 콘텐츠 제작 키트 · SNS 콘텐츠 자동 생성 플랫폼 · SNS 콘텐츠 올인원 툴
                </p>
              </div>
            </div>

            {/* 만들어진 이유 */}
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이 만들어진 이유</h3>
              <div style={{ fontSize: 15, color: C.muted, lineHeight: 2.1 }}>
                <p style={{ marginBottom: 14 }}>
                  SNS가 비즈니스에서 필수가 된 시대입니다. 하지만 현실은 어떤가요?
                  <span style={{ color: C.text, fontWeight: 700 }}> 콘텐츠 하나 만드는 데 수 시간이 걸리고, 매일 올려야 한다는 부담감에 SNS 자체를 포기하는 분들이 많습니다.</span>
                </p>
                <p style={{ marginBottom: 14 }}>
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
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 18, letterSpacing: -0.5 }}>이런 분들께 추천드려요</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 10 }}>
                {[
                  { icon: "🏪", title: "소상공인 · 자영업자", desc: "매장 홍보를 위한 SNS 콘텐츠를 빠르게 만들고 싶은 분" },
                  { icon: "💼", title: "1인 기업 · 프리랜서", desc: "개인 브랜딩을 위해 꾸준히 콘텐츠를 올리고 싶은 분" },
                  { icon: "🎓", title: "강사 · 코치 · 전문가", desc: "지식을 SNS 콘텐츠로 쉽게 변환하고 싶은 분" },
                  { icon: "📊", title: "마케터 · 콘텐츠 담당자", desc: "여러 플랫폼 콘텐츠를 빠르게 대량 생산해야 하는 분" },
                  { icon: "🛒", title: "쇼핑몰 · 브랜드 운영자", desc: "AI 제품컷·상세페이지로 촬영·디자인 비용을 줄이고 싶은 분" },
                  { icon: "🌱", title: "SNS 입문자 누구나", desc: "SNS를 처음 시작하는데 무엇을 올려야 할지 모르는 분" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "14px", borderRadius: 12, background: bg2, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 오른쪽: 이용방법 (sticky) ── */}
          <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6366f1", letterSpacing: 1.5, marginBottom: 8 }}>HOW TO USE</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>이용방법</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {HOW_TO.map((step, i) => (
                  <div key={step.step} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: i < HOW_TO.length - 1 ? 20 : 0 }}>
                    {/* 세로선 */}
                    {i < HOW_TO.length - 1 && (
                      <div style={{ position: "absolute", left: 18, top: 38, width: 2, bottom: 0, background: `linear-gradient(to bottom,${step.color}40,transparent)`, borderRadius: 2 }} />
                    )}
                    {/* 아이콘 */}
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${step.color}20`, border: `2px solid ${step.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, zIndex: 1 }}>{step.icon}</div>
                    {/* 내용 */}
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: step.color, letterSpacing: 1 }}>STEP {step.step}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{step.title}</span>
                      </div>
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 포인트 안내 */}
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px 20px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 12 }}>💎 포인트 안내</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "비회원", val: "5회 무료 체험" },
                  { label: "회원가입", val: "200P 즉시 지급" },
                  { label: "출석체크", val: "매일 +3P" },
                  { label: "게시글 작성", val: "+5P" },
                  { label: "AI 생성 1회", val: "-10P 차감" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 9, background: i === 4 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)" }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 4 ? "#ef4444" : "#10b981" }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.06))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 16, padding: "22px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 6 }}>지금 바로 시작해보세요</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>비회원 5회 무료 체험 가능<br/>가입하면 200P 즉시 지급!</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 체험하기</Btn>
                <button onClick={() => navigate("pricing")} style={{ padding: "9px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.25)", background: "transparent", color: C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  💎 요금제 보기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI 도구 전체 목록 (풀폭) ── */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 6 }}>SNS메이킷이 지원하는 AI 도구 전체</h3>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>총 <b style={{ color: C.purpleL }}>20가지+</b> AI 도구가 준비되어 있어요.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

      </div>
    </div>
  );
}
