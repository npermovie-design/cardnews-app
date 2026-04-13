import React from "react";

const WIN_URL = "https://github.com/npermovie-design/cardnews-app/releases/latest/download/makeit-sns-automation-setup.exe";
const MAC_URL = null; // Mac 빌드 준비 후 추가

export default function AutomationPage({ C, navigate }) {
  const S = {
    page: { minHeight: "100vh", background: "#0a0a0a", color: "#fff" },
    hero: { textAlign: "center", padding: "100px 20px 60px", maxWidth: 800, margin: "0 auto" },
    heroTitle: { fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.2, marginBottom: 20, letterSpacing: -1 },
    heroAccent: { background: "linear-gradient(135deg, #ef4f5f, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    heroSub: { fontSize: 17, color: "#9ca3af", lineHeight: 1.7, marginBottom: 40 },
    downloadSection: { padding: "60px 20px", maxWidth: 900, margin: "0 auto" },
    downloadTitle: { fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 12 },
    downloadSub: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginBottom: 40 },
    cards: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 700, margin: "0 auto" },
    card: { background: "#1a1a2e", borderRadius: 16, padding: "40px 30px", textAlign: "center", border: "1px solid #2a2a3e" },
    cardIcon: { fontSize: 48, marginBottom: 16, opacity: 0.8 },
    cardTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
    cardReq: { fontSize: 12, color: "#6b7280", marginBottom: 20 },
    btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", border: "none", transition: "all 0.2s" },
    btnPrimary: { background: "#ef4f5f", color: "#fff" },
    btnDisabled: { background: "#374151", color: "#6b7280", cursor: "not-allowed" },
    features: { padding: "80px 20px", maxWidth: 1000, margin: "0 auto" },
    featTitle: { fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 },
    featAccent: { background: "linear-gradient(135deg, #ef4f5f, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    featSub: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginBottom: 50 },
    featGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
    featCard: { background: "#1a1a2e", borderRadius: 14, padding: "28px 24px", border: "1px solid #2a2a3e" },
    featCardTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
    featCardDesc: { fontSize: 13, color: "#9ca3af", lineHeight: 1.6 },
    featBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 10 },
    pricing: { padding: "80px 20px", maxWidth: 900, margin: "0 auto", textAlign: "center" },
    priceCards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 800, margin: "0 auto", marginTop: 40 },
    priceCard: { background: "#1a1a2e", borderRadius: 14, padding: "30px 20px", border: "1px solid #2a2a3e", textAlign: "center" },
    priceCardPro: { background: "#1a1a2e", borderRadius: 14, padding: "30px 20px", border: "2px solid #ef4f5f", textAlign: "center", position: "relative" },
    priceLabel: { fontSize: 13, color: "#9ca3af", marginBottom: 4 },
    priceAmount: { fontSize: 32, fontWeight: 800, marginBottom: 4 },
    priceUnit: { fontSize: 13, color: "#6b7280" },
    priceList: { listStyle: "none", padding: 0, margin: "20px 0", textAlign: "left" },
    priceItem: { fontSize: 12, color: "#d1d5db", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 },
    cta: { padding: "80px 20px 100px", textAlign: "center" },
    ctaTitle: { fontSize: 28, fontWeight: 700, marginBottom: 12 },
    ctaSub: { fontSize: 14, color: "#9ca3af", marginBottom: 30 },
  };

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: "rgba(239,79,95,0.15)", color: "#ef4f5f", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          SNS 자동화 도구
        </div>
        <h1 style={S.heroTitle}>
          키워드만 입력하면,<br />
          <span style={S.heroAccent}>AI가 글을 쓰고 발행</span>합니다.
        </h1>
        <p style={S.heroSub}>
          네이버 블로그/카페에 최적화된 글을 AI가 자동 생성하고,<br />
          상위 노출에 유리한 구조로 발행까지 완료합니다.<br />
          매일 자동 운영도 가능합니다.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={WIN_URL || "#"} style={{ ...S.btn, ...S.btnPrimary, textDecoration: "none" }}>
            Windows 다운로드
          </a>
          <button style={{ ...S.btn, ...S.btnDisabled }} disabled>
            macOS 준비 중
          </button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>
          v0.1.0 | Windows 10/11 (64-bit) | 약 190MB
        </div>
      </div>

      {/* Download */}
      <div style={S.downloadSection}>
        <h2 style={S.downloadTitle}>다운로드</h2>
        <p style={S.downloadSub}>macOS와 Windows에서 사용 가능합니다.</p>
        <div style={S.cards}>
          <div style={S.card}>
            <div style={S.cardIcon}></div>
            <div style={S.cardTitle}>macOS</div>
            <div style={S.cardReq}>macOS 12.0 이상</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button style={{ ...S.btn, ...S.btnDisabled, fontSize: 12, padding: "8px 16px" }} disabled>Apple Silicon</button>
              <button style={{ ...S.btn, ...S.btnDisabled, fontSize: 12, padding: "8px 16px" }} disabled>Intel</button>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>준비 중</div>
          </div>
          <div style={S.card}>
            <div style={S.cardIcon}></div>
            <div style={S.cardTitle}>Windows</div>
            <div style={S.cardReq}>Windows 10/11 (64-bit)</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <a href={WIN_URL || "#"} style={{ ...S.btn, ...S.btnPrimary, fontSize: 12, padding: "8px 16px", textDecoration: "none" }}>x64 다운로드</a>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>v0.1.0 · 190MB</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={S.features}>
        <div style={{ fontSize: 13, color: "#ef4f5f", textAlign: "center", marginBottom: 8 }}>[ 주요 기능 ]</div>
        <h2 style={S.featTitle}>
          SNS 자동화에 필요한 모든 것,<br />
          <span style={S.featAccent}>다 있습니다</span>
        </h2>
        <p style={S.featSub}>복잡한 설정 없이, 누구나 바로 쓸 수 있어요.</p>
        <div style={S.featGrid}>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>AI 글 자동 생성</div>
            <div style={S.featCardDesc}>키워드만 입력하면 네이버에 최적화된 블로그/카페 글을 AI가 자동 생성합니다. 제목, 본문, 이미지까지 한 번에.</div>
            <div style={{ ...S.featBadge, background: "rgba(239,79,95,0.15)", color: "#ef4f5f" }}>Blog</div>
            <div style={{ ...S.featBadge, background: "rgba(245,158,11,0.15)", color: "#f59e0b", marginLeft: 6 }}>Cafe</div>
          </div>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>글감 분석</div>
            <div style={S.featCardDesc}>네이버 상위 노출 글을 크롤링하고 AI가 구조를 분석합니다. 추천 제목 5개 + 최적 글 구조를 자동으로 제안합니다.</div>
            <div style={{ ...S.featBadge, background: "rgba(16,185,129,0.15)", color: "#10b981" }}>SEO</div>
          </div>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>자동 발행</div>
            <div style={S.featCardDesc}>생성된 글을 네이버 블로그/카페에 자동으로 발행합니다. 사진, 제목, 본문, 태그까지 원클릭으로.</div>
            <div style={{ ...S.featBadge, background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>Automation</div>
          </div>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>자동 운영 모드</div>
            <div style={S.featCardDesc}>테마만 설정하면 매일 최신 뉴스/트렌드를 분석하여 자동으로 글을 발행합니다. 매일 자동, 한 달간 방치 가능.</div>
            <div style={{ ...S.featBadge, background: "rgba(239,79,95,0.15)", color: "#ef4f5f" }}>Autopilot</div>
          </div>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>예약 발행</div>
            <div style={S.featCardDesc}>원하는 시간에 자동으로 발행됩니다. 글 작성 후 스케줄을 설정하면 Windows Task Scheduler가 자동 실행합니다.</div>
            <div style={{ ...S.featBadge, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>Schedule</div>
          </div>
          <div style={S.featCard}>
            <div style={S.featCardTitle}>다중 계정 관리</div>
            <div style={S.featCardDesc}>여러 네이버 계정을 저장하고 전환할 수 있습니다. 계정별 세션이 독립적으로 관리됩니다.</div>
            <div style={{ ...S.featBadge, background: "rgba(16,185,129,0.15)", color: "#10b981" }}>Multi</div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={S.pricing}>
        <div style={{ fontSize: 13, color: "#ef4f5f", marginBottom: 8 }}>[ 요금제 ]</div>
        <h2 style={S.featTitle}>심플하고 합리적인 가격</h2>
        <p style={S.featSub}>필요한 만큼만 선택하세요.</p>
        <div style={S.priceCards}>
          <div style={S.priceCard}>
            <div style={S.priceLabel}>Starter</div>
            <div style={S.priceAmount}>29,000<span style={S.priceUnit}>원/월</span></div>
            <ul style={S.priceList}>
              <li style={S.priceItem}>블로그 1개</li>
              <li style={S.priceItem}>일 1회 발행</li>
              <li style={S.priceItem}>글감 분석</li>
            </ul>
            <button style={{ ...S.btn, background: "#2a2a3e", color: "#d1d5db", width: "100%", justifyContent: "center" }} onClick={() => navigate("pricing")}>시작하기</button>
          </div>
          <div style={S.priceCardPro}>
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#ef4f5f", color: "#fff", padding: "4px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>인기</div>
            <div style={S.priceLabel}>Pro</div>
            <div style={{ ...S.priceAmount, color: "#ef4f5f" }}>59,000<span style={S.priceUnit}>원/월</span></div>
            <ul style={S.priceList}>
              <li style={S.priceItem}>블로그 + 카페</li>
              <li style={S.priceItem}>일 5회 발행</li>
              <li style={S.priceItem}>자동 운영 모드</li>
              <li style={S.priceItem}>예약 발행</li>
              <li style={S.priceItem}>글감 분석</li>
            </ul>
            <button style={{ ...S.btn, ...S.btnPrimary, width: "100%", justifyContent: "center" }} onClick={() => navigate("pricing")}>Pro 시작하기</button>
          </div>
          <div style={S.priceCard}>
            <div style={S.priceLabel}>Business</div>
            <div style={S.priceAmount}>99,000<span style={S.priceUnit}>원/월</span></div>
            <ul style={S.priceList}>
              <li style={S.priceItem}>다계정 무제한</li>
              <li style={S.priceItem}>무제한 발행</li>
              <li style={S.priceItem}>자동 운영 모드</li>
              <li style={S.priceItem}>우선 지원</li>
            </ul>
            <button style={{ ...S.btn, background: "#2a2a3e", color: "#d1d5db", width: "100%", justifyContent: "center" }} onClick={() => navigate("pricing")}>문의하기</button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={S.cta}>
        <h2 style={S.ctaTitle}>지금 시작하세요</h2>
        <p style={S.ctaSub}>무료 체험 5회 제공. 설치 후 바로 사용할 수 있습니다.</p>
        <a href={WIN_URL || "#"} style={{ ...S.btn, ...S.btnPrimary, textDecoration: "none", fontSize: 16, padding: "14px 36px" }}>
          무료 다운로드
        </a>
      </div>
    </div>
  );
}
