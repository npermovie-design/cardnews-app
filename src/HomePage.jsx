import { Badge, SecWrap, SecTitle, Btn } from "./UI";

export default function HomePage({ navigate, C }) {
  return (
    <div>
      {/* 히어로 */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "110px 24px 80px", textAlign: "center",
        position: "relative", overflow: "hidden", background: C.heroBg,
      }}>
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "rgba(124,106,255,0.06)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(236,72,153,0.05)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800 }}>
          <Badge C={C}>✦ AI 기반 SNS 성장 파트너 엔퍼콘텐츠랩</Badge>
          <h1 style={{ fontSize: "clamp(30px,5.5vw,68px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, color: C.text, margin: "0 0 28px" }}>
            SNS 하나로{" "}
            <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              개인의 브랜드와 비즈니스
            </span>를 성장시키는 방법
          </h1>
          <p style={{ fontSize: "clamp(15px,1.8vw,19px)", color: C.muted, lineHeight: 1.85, maxWidth: 580, margin: "0 auto 16px" }}>
            엔퍼는 개인과 전문가의 SNS 계정을 분석하고 콘텐츠 전략부터 운영 구조까지 함께 설계합니다.
          </p>
          <p style={{ fontSize: 14, color: C.purpleL, fontWeight: 600, marginBottom: 44 }}>
            개인의 SNS 성장을 돕는 실전 교육과 계정 운영 전략{" "}
            <span style={{ color: "#ec4899" }}>AI로 더 빠르게</span>
          </p>
          <div className="cta-row" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("cardnews")}>🃏 AI 카드뉴스 바로 만들기</Btn>
            <Btn C={C} onClick={() => navigate("contact")} ghost>SNS 성장 상담 신청</Btn>
          </div>
          <div className="stat-row" style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 64, flexWrap: "wrap" }}>
            {[["10년+", "SNS 운영 경험"], ["AI 자동화", "콘텐츠 제작"], ["주 1회", "전략 미팅"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{v}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: C.muted, fontSize: 10, opacity: 0.4 }}>
          <div style={{ width: 1, height: 36, background: "linear-gradient(to bottom,transparent,rgba(124,106,255,0.5))" }} />
          SCROLL
        </div>
      </section>

      {/* 문제 공감 */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge="Pain Point" title={"SNS를 시작했지만\n이런 고민이 있으신가요?"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 12, marginBottom: 44 }}>
          {[
            { icon: "📉", text: "열심히 올리는데 조회수가 나오지 않는다" },
            { icon: "🤔", text: "어떤 콘텐츠를 올려야 할지 모르겠다" },
            { icon: "🗺️", text: "인스타, 블로그, 유튜브 방향이 잡히지 않는다" },
            { icon: "💰", text: "SNS를 통해 실제 매출로 연결하고 싶다" },
            { icon: "😓", text: "혼자 운영하다 보니 지속하기 어렵다" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 20px", boxShadow: C.shadow }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{item.text}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.05))", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 18, padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "clamp(14px,1.7vw,18px)", color: C.text, lineHeight: 1.85, fontWeight: 600, margin: 0 }}>
            SNS는 단순히 글을 올리는 것이 아니라
            <span style={{ color: C.purpleL }}> 전략과 구조가 필요한 마케팅 채널</span>입니다.
          </p>
        </div>
      </SecWrap>

      {/* 해결 방법 */}
      <SecWrap C={C}>
        <SecTitle C={C} badge="Solution" title="엔퍼는 이렇게 SNS 성장을 돕습니다"
          sub="단순 계정 관리가 아닌 AI를 활용해 콘텐츠 전략과 유입 구조를 설계합니다." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16 }}>
          {[
            { icon: "🔍", num: "01", title: "SNS 계정 분석", desc: "현재 계정 상태와 콘텐츠 방향을 AI로 정밀 진단합니다." },
            { icon: "📐", num: "02", title: "콘텐츠 전략 설계", desc: "AI 데이터 기반으로 조회수가 나오는 콘텐츠 구조를 만듭니다." },
            { icon: "⚙️", num: "03", title: "SNS 운영 시스템", desc: "블로그, 인스타, 유튜브 채널 역할과 연결 구조를 정리합니다." },
            { icon: "📅", num: "04", title: "주 1회 전략 미팅", desc: "AI 리포트로 문제를 분석하고 개선 방향을 함께 잡습니다." },
          ].map((s, i) => (
            <div key={i}
              style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: "28px 22px", position: "relative", overflow: "hidden", boxShadow: C.shadow, transition: "box-shadow 0.2s,transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadowHover; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = ""; }}>
              <div style={{ position: "absolute", top: 14, right: 18, fontSize: 12, fontWeight: 900, color: C.purple, opacity: 0.15, fontFamily: "monospace" }}>{s.num}</div>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.75 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 서비스 소개 */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge="Services" title="엔퍼 서비스" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            { icon: "🎓", tag: "교육", title: "강사 육성 & 강의 사이트", desc: "강의 사이트를 통한 강사 육성 및 고객 연결. SNS 마케팅을 처음 시작하는 분들을 위한 기초부터 실전 강의를 제공합니다." },
            { icon: "📢", tag: "홍보", title: "SNS 콘텐츠 홍보 지원", desc: "SNS 콘텐츠 업로드를 통한 홍보 지원. AI 도구를 활용해 인스타, 블로그, 유튜브 채널을 효율적으로 운영합니다." },
            { icon: "🛠️", tag: "도구", title: "프로그램 & 자료 제공", desc: "SNS 콘텐츠 작업에 필요한 프로그램과 자료를 제공합니다. AI 생성기를 통해 카드뉴스, 썸네일을 빠르게 제작하세요." },
            { icon: "✍️", tag: "대행", title: "관리 대행", desc: "블로그, 유튜브, 인스타 콘텐츠 제작과 운영 대행. AI로 속도와 품질을 높여 효율적으로 관리합니다." },
          ].map((s, i) => (
            <div key={i}
              style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: "28px 22px", display: "flex", flexDirection: "column", gap: 12, boxShadow: C.shadow, transition: "box-shadow 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = C.shadowHover}
              onMouseLeave={e => e.currentTarget.style.boxShadow = C.shadow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 32 }}>{s.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(124,106,255,0.1)", color: C.purpleL, padding: "3px 10px", borderRadius: 99 }}>{s.tag}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, flex: 1 }}>{s.desc}</div>
              <button onClick={() => navigate("contact")} style={{ padding: "8px 0", borderRadius: 9, border: "1px solid rgba(124,106,255,0.25)", background: "rgba(124,106,255,0.04)", color: C.purpleL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                문의하기
              </button>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 차별점 */}
      <SecWrap C={C}>
        <SecTitle C={C} badge="Why Nper" title="왜 많은 사람들이 엔퍼를 선택할까요" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 12 }}>
          {[
            { icon: "🏆", title: "10년 SNS 운영 경험", desc: "다양한 계정 운영 경험을 기반으로 AI가 분석한 전략을 제시합니다." },
            { icon: "📊", title: "실전 데이터 기반 전략", desc: "실제 계정 운영 데이터와 AI 분석 리포트로 컨설팅합니다." },
            { icon: "🔄", title: "주 1회 전략 미팅", desc: "AI 리포트로 지속적으로 계정을 점검하고 개선합니다." },
            { icon: "💵", title: "SNS 비즈니스 연결", desc: "단순 조회수가 아닌 AI 콘텐츠 자동화로 매출 구조를 만듭니다." },
          ].map((d, i) => (
            <div key={i}
              style={{ display: "flex", alignItems: "center", gap: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "22px 24px", boxShadow: C.shadow, transition: "box-shadow 0.2s,transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadowHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.transform = ""; }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,rgba(124,106,255,0.12),rgba(236,72,153,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{d.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5 }}>{d.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* 성장 사례 */}
      <SecWrap C={C} bg={C.bg2}>
        <SecTitle C={C} badge="Results" title="SNS 성장 사례" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 16 }}>
          {[
            { emoji: "📱", platform: "SNS 계정 운영", big: "조회수 10배", small: "시작 3개월 만에", desc: "계정 분석 후 방향을 수정하고 AI로 카드뉴스를 제작해 3개월 만에 조회수가 10배 상승했어요." },
            { emoji: "📝", platform: "블로그 운영", big: "방문자 6배", small: "월 5천 → 3만", desc: "AI 키워드 분석과 초안 자동 작성으로 발행 속도를 높이고 월 방문자가 6배 증가했어요." },
            { emoji: "🎥", platform: "유튜브 채널", big: "구독자 꾸준히 성장", small: "콘텐츠 방향 수정 후", desc: "AI로 썸네일 기획과 스크립트를 작성하고 콘텐츠 방향을 바꾼 후 구독자가 꾸준히 늘고 있어요." },
          ].map((c, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 14, boxShadow: C.shadow }}>
              <div style={{ fontSize: 36 }}>{c.emoji}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>{c.platform}</div>
              <div>
                <div style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, lineHeight: 1.1, background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{c.big}</div>
                <div style={{ fontSize: 12, color: C.purpleL, fontWeight: 600, marginTop: 5 }}>{c.small}</div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.75 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </SecWrap>

      {/* CTA */}
      <section style={{ padding: "130px 24px", textAlign: "center", position: "relative", overflow: "hidden", background: C.ctaBg }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "rgba(124,106,255,0.06)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 660, margin: "0 auto" }}>
          <Badge C={C}>✦ 지금 시작하세요</Badge>
          <h2 style={{ fontSize: "clamp(28px,5vw,58px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.15, margin: "0 0 24px" }}>
            SNS 성장을 시작해보세요
          </h2>
          <p style={{ fontSize: "clamp(14px,1.6vw,17px)", color: C.muted, lineHeight: 1.9, marginBottom: 44 }}>
            SNS는 방향만 잡혀도 성장 속도가 완전히 달라집니다. 지금 엔퍼와 함께{" "}
            <span style={{ color: C.purpleL, fontWeight: 700 }}>AI로 더 빠르게</span>{" "}
            계정의 성장 전략을 만들어보세요.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("contact")}>무료 상담 신청</Btn>
            <Btn C={C} onClick={() => navigate("cardnews")} ghost>🃏 AI 카드뉴스 만들기</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}
