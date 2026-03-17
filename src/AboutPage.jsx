import { useState } from "react";
import { Btn, Badge } from "./UI";

export function AboutPage({ navigate, C }) {
  return (
    <div>
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
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>혹시 이런 경험 있으신가요?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "😓", text: "SNS를 해야 한다는 건 알지만, 매번 뭘 써야 할지 막막하다" },
              { icon: "⏰", text: "블로그 글 하나 쓰는 데 2~3시간이 걸려 지쳐버렸다" },
              { icon: "📱", text: "인스타, 유튜브, 블로그... 여러 플랫폼에 올릴 콘텐츠가 너무 부담스럽다" },
              { icon: "🔄", text: "매일 꾸준히 올리고 싶은데 아이디어가 금방 바닥난다" },
              { icon: "💸", text: "콘텐츠 외주를 맡기자니 비용이 부담되고, 직접 하자니 시간이 없다" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderRadius: 12, background: C.bg2 || (C.border.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") }}>
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
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.04))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "36px 32px", marginBottom: 32 }}>
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

        {/* 플랫폼 소개 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
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
            <p style={{ marginBottom: 16 }}>
              SNS메이킷은 바로 이 문제를 해결하기 위해 탄생했습니다.
              <span style={{ color: C.text, fontWeight: 700 }}> 키워드 하나만 입력하면 AI가 블로그 글, 인스타 캡션, 유튜브 대본, 카드뉴스까지 자동으로 완성</span>해드립니다.
              콘텐츠 제작 시간을 90% 이상 줄이고, 누구나 꾸준한 SNS 운영을 할 수 있도록 돕는 것이 저희의 목표입니다.
            </p>
            <p style={{ marginBottom: 0 }}>
              SNS를 시작하고 싶지만 방법을 모르시는 분, 이미 운영 중이지만 콘텐츠 제작이 버거운 분, 더 많은 플랫폼에 더 자주 올리고 싶은 분 모두를 위해
              <span style={{ color: C.purpleL, fontWeight: 700 }}> SNS메이킷은 매일 새로운 기능을 만들고 있습니다.</span>
            </p>
          </div>
        </div>

        {/* AI 도구 목록 */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>SNS메이킷이 지원하는 AI 도구</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 12, marginBottom: 40 }}>
          {[
            { icon: "📝", title: "네이버 블로그", desc: "SEO 최적화 블로그 글 자동 생성" },
            { icon: "🟠", title: "티스토리", desc: "HTML 형식 블로그 포스트 자동 작성" },
            { icon: "📱", title: "인스타그램", desc: "해시태그 포함 캡션 자동 생성" },
            { icon: "▶️", title: "유튜브 대본", desc: "영상 스크립트·설명란·SEO 태그 생성" },
            { icon: "🧵", title: "스레드", desc: "임팩트 있는 스레드 게시물 작성" },
            { icon: "🖼", title: "카드뉴스", desc: "AI 기획 + 이미지 자동 생성" },
            { icon: "📰", title: "뉴스로 글쓰기", desc: "최신 뉴스 기반 블로그 글 작성" },
            { icon: "🎬", title: "유튜브로 글쓰기", desc: "유튜브 영상 기반 블로그 글 변환" },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 16px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* 이런 분들께 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>이런 분들께 추천드려요</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 }}>
            {[
              { icon: "🏪", title: "소상공인 · 자영업자", desc: "매장 홍보를 위한 SNS 콘텐츠를 빠르게 만들고 싶은 분" },
              { icon: "💼", title: "1인 기업 · 프리랜서", desc: "개인 브랜딩을 위해 꾸준히 콘텐츠를 올리고 싶은 분" },
              { icon: "🎓", title: "강사 · 코치 · 전문가", desc: "지식을 SNS 콘텐츠로 쉽게 변환하고 싶은 분" },
              { icon: "📊", title: "마케터 · 콘텐츠 담당자", desc: "여러 플랫폼 콘텐츠를 빠르게 대량 생산해야 하는 분" },
              { icon: "🌱", title: "SNS 입문자", desc: "SNS를 처음 시작하는데 무엇을 올려야 할지 모르는 분" },
              { icon: "⏱", title: "바쁜 현대인 누구나", desc: "콘텐츠는 올리고 싶지만 시간이 절대적으로 부족한 분" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "16px", borderRadius: 12, background: C.bg2 || (C.border.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"), alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.06))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>지금 바로 시작해보세요</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            회원가입 없이 5회 무료 체험 가능해요.<br/>
            가입하면 즉시 10P 지급 + AI 생성기 풀 이용 가능!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 무료 체험</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>💎 요금제 보기</Btn>
          </div>
        </div>

      </div>
    </div>
  );
}
