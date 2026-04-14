import React from "react";

const WIN_URL = "https://github.com/npermovie-design/naverbot-saas/releases/download/v0.1.2/makeit-sns-setup-win.zip";
const MAC_ARM_URL = "https://github.com/npermovie-design/naverbot-saas/releases/download/v0.1.1/makeit-sns-setup-arm64.dmg";
const MAC_INTEL_URL = "https://github.com/npermovie-design/naverbot-saas/releases/download/v0.1.1/makeit-sns-setup-intel.dmg";
const BRAND = "#7c6aff";
const BRAND2 = "#ec4899";
const GRAD = "linear-gradient(135deg, #7c6aff, #ec4899)";

export default function AutomationPage({ C, navigate }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111" }}>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 20px 60px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: "#f3f0ff", color: BRAND, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          SNS Automation Tool
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 20, letterSpacing: -1 }}>
          키워드만 입력하면,<br />
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI가 글을 쓰고 발행</span>합니다.
        </h1>
        <p style={{ fontSize: 17, color: "#6b7280", lineHeight: 1.7, marginBottom: 30 }}>
          네이버 블로그/카페에 최적화된 글을 AI가 자동 생성하고,<br />
          상위 노출에 유리한 구조로 발행까지 완료합니다.
        </p>
        <div style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "#f3f0ff", border: `1px solid ${BRAND}33`, fontSize: 14, color: BRAND, fontWeight: 600 }}>
          무료 회원 5회 무료 제공 | Pro 요금제부터 무제한 이용
        </div>
      </section>

      {/* 3단계 플로우 */}
      <section style={{ padding: "60px 20px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <div style={{ fontSize: 13, color: BRAND, fontWeight: 600, marginBottom: 8 }}>How it works</div>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>3단계로 끝나는 자동화</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {[
            { num: "01", title: "키워드 입력", desc: "블로그나 카페에 쓸 주제를 입력하세요. AI가 네이버 상위 글을 분석하고 최적의 제목과 구조를 제안합니다." },
            { num: "02", title: "AI 글 생성", desc: "추천 제목을 선택하면 AI가 SEO에 최적화된 글을 자동 생성합니다. 사진도 자동으로 삽입됩니다." },
            { num: "03", title: "자동 발행", desc: "생성된 글이 네이버 블로그/카페에 자동으로 발행됩니다. 예약 발행이나 매일 자동 운영도 가능합니다." },
          ].map(s => (
            <div key={s.num} style={{ background: "#fafafa", borderRadius: 16, padding: "32px 24px", border: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 36, fontWeight: 800, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", opacity: 0.4, marginBottom: 12 }}>{s.num}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 기능 소개 */}
      <section style={{ padding: "60px 20px", background: "#f9fafb" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: 13, color: BRAND, fontWeight: 600, marginBottom: 8 }}>Features</div>
            <h2 style={{ fontSize: 28, fontWeight: 700 }}>
              SNS 자동화에 필요한 모든 것,{" "}
              <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>다 있습니다</span>
            </h2>
            <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 8 }}>복잡한 설정 없이, 누구나 바로 쓸 수 있어요.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { title: "AI 글 자동 생성", desc: "키워드만 입력하면 네이버에 최적화된 블로그/카페 글을 AI가 자동 생성합니다. 제목, 본문, 이미지까지 한 번에.", badges: [{ label: "Blog", c: BRAND }, { label: "Cafe", c: BRAND2 }] },
              { title: "글감 분석", desc: "네이버 상위 노출 글을 크롤링하고 AI가 구조를 분석합니다. 추천 제목 5개 + 최적 글 구조를 자동으로 제안합니다.", badges: [{ label: "SEO", c: "#10b981" }] },
              { title: "자동 발행", desc: "생성된 글을 네이버 블로그/카페에 자동으로 발행합니다. 사진, 제목, 본문, 태그까지 원클릭으로.", badges: [{ label: "Automation", c: BRAND }] },
              { title: "자동 운영 모드", desc: "테마만 설정하면 매일 최신 뉴스/트렌드를 분석하여 자동으로 글을 발행합니다. 한 달간 방치 가능.", badges: [{ label: "Autopilot", c: BRAND2 }] },
              { title: "예약 발행", desc: "원하는 시간에 자동으로 발행됩니다. 스케줄을 설정하면 매일 지정 시간에 실행합니다.", badges: [{ label: "Schedule", c: "#f59e0b" }] },
              { title: "다중 계정 관리", desc: "여러 네이버 계정을 저장하고 전환할 수 있습니다. 계정별 세션이 독립적으로 관리됩니다.", badges: [{ label: "Multi", c: "#10b981" }] },
            ].map(f => (
              <div key={f.title} style={{ background: "#fff", borderRadius: 14, padding: "28px 24px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 12 }}>{f.desc}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {f.badges.map(b => (
                    <span key={b.label} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${b.c}15`, color: b.c }}>{b.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 블로그 vs 카페 */}
      <section style={{ padding: "80px 20px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: BRAND, fontWeight: 600, marginBottom: 8 }}>Platforms</div>
          <h2 style={{ fontSize: 28, fontWeight: 700 }}>블로그와 카페, 각각에 맞게</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#f3f0ff", borderRadius: 16, padding: "32px 28px", border: `1px solid ${BRAND}22` }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: BRAND }}>네이버 블로그</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {["SEO 최적화 구조", "2,000~4,000자 분량", "이미지 5장 자동 삽입", "소제목 + 인용구 구조", "상위 노출 제목 분석"].map(t => (
                <li key={t} style={{ fontSize: 13, color: "#374151", padding: "5px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: BRAND, fontWeight: 700 }}>+</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: "#fdf2f8", borderRadius: 16, padding: "32px 28px", border: `1px solid ${BRAND2}22` }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: BRAND2 }}>네이버 카페</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {["카페 분위기 맞춤 톤", "1,000~1,500자 간결 분량", "이미지 2장 삽입", "자연스러운 대화체", "게시판 자동 선택"].map(t => (
                <li key={t} style={{ fontSize: 13, color: "#374151", padding: "5px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: BRAND2, fontWeight: 700 }}>+</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pro 안내 */}
      <section style={{ padding: "60px 20px", background: "#f9fafb" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>무료 회원 5회 무료 제공</h2>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 24 }}>
            무료 회원도 5회까지 무료로 체험할 수 있습니다.<br />
            무제한 이용은 Pro 요금제 이상 구독 시 가능합니다.
          </p>
          <button onClick={() => navigate("pricing")} style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 32px",
            borderRadius: 12, background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15,
            border: "none", cursor: "pointer",
          }}>
            요금제 확인하기
          </button>
        </div>
      </section>

      {/* 다운로드 */}
      <section style={{ padding: "80px 20px 100px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: BRAND, fontWeight: 600, marginBottom: 8 }}>Download</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>다운로드</h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>macOS와 Windows에서 사용 가능합니다.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 700, margin: "0 auto" }}>
          <div style={{ background: "#f9fafb", borderRadius: 16, padding: "40px 30px", textAlign: "center", border: "1px solid #e5e7eb", opacity: 0.6 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}></div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>macOS</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>macOS 12.0 이상</div>
            <div style={{ padding: "10px 24px", borderRadius: 10, background: "#e5e7eb", color: "#9ca3af", fontWeight: 600, fontSize: 13, display: "inline-block" }}>
              준비중
            </div>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 16, padding: "40px 30px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}></div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Windows</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 20 }}>Windows 10/11 (64-bit)</div>
            <a href={WIN_URL} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px",
              borderRadius: 10, background: GRAD, color: "#fff", fontWeight: 600, fontSize: 13,
              textDecoration: "none", border: "none",
            }}>
              x64 다운로드
            </a>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>v0.1.2</div>
          </div>
        </div>
      </section>
    </div>
  );
}
