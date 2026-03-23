import { useState } from "react";

const EVENTS = [
  {
    id: 1,
    status: "active",
    badge: "진행중",
    title: "메이킷 인플루언서 모집!",
    icon: "",
    color: "#7c6aff",
    period: "2025.01.01 ~ 상시 모집",
    desc: "블로거, 유튜버, 인스타그래머 등 SNS를 운영하고 있는 분이라면 누구나 가능합니다!\n\nSNS메이킷 홈페이지를 이용하고 후기만 남겨주세요.\n4,500 포인트(약 만원 상당)를 지급해드립니다!",
    details: [
      "대상: SNS(블로그, 유튜브, 인스타그램 등)를 운영하는 모든 분",
      "방법: SNS메이킷을 이용한 후 본인 SNS 채널에 후기 작성",
      "보상: 후기 작성 확인 시 4,500P 지급 (약 만원 상당)",
      "후기 작성 후 문의하기에서 후기 링크와 함께 신청해주세요",
    ],
    howTo: "1. SNS메이킷 회원가입\n2. AI 기능 이용 (블로그, 카드뉴스, 이미지 등)\n3. 본인 SNS에 이용 후기 작성\n4. 문의하기에서 후기 링크 제출\n5. 확인 후 4,500P 지급!",
  },
  {
    id: 2,
    status: "ended",
    badge: "마감",
    title: "오픈 기념 가입 보너스 이벤트",
    icon: "",
    color: "#888",
    period: "2024.12.01 ~ 2025.01.31",
    desc: "SNS메이킷 오픈을 기념하여 가입 즉시 추가 포인트를 지급했던 이벤트입니다.",
    details: ["가입 즉시 추가 300P 보너스 지급 (종료)"],
  },
];

export default function EventPage({ C, navigate }) {
  const isDark = C?.border?.includes("255");
  const [tab, setTab] = useState("active");
  const [selected, setSelected] = useState(null);
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e9ecef";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  const filtered = EVENTS.filter(e => tab === "active" ? e.status === "active" : e.status === "ended");

  if (selected) {
    const ev = EVENTS.find(e => e.id === selected);
    if (!ev) { setSelected(null); return null; }
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <button onClick={() => setSelected(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, marginBottom: 20, padding: 0 }}>
          ← 이벤트 목록
        </button>
        <div style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "36px 32px", background: ev.status === "active" ? "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(236,72,153,0.05))" : "transparent" }}>
            <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              background: ev.status === "active" ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "#666", color: "#fff", marginBottom: 14 }}>
              {ev.badge}
            </div>
            {ev.icon && <div style={{ fontSize: 28, marginBottom: 10 }}>{ev.icon}</div>}
            <h2 style={{ fontSize: 24, fontWeight: 900, color: text, margin: "0 0 8px" }}>{ev.title}</h2>
            <div style={{ fontSize: 13, color: muted }}>{ev.period}</div>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 15, color: text, lineHeight: 2, whiteSpace: "pre-line", marginBottom: 28 }}>{ev.desc}</div>
            {ev.details && (
              <div style={{ background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
                {ev.details.map((d, i) => (
                  <div key={i} style={{ fontSize: 14, color: text, lineHeight: 2 }}>{d}</div>
                ))}
              </div>
            )}
            {ev.howTo && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 10 }}>참여 방법</div>
                <div style={{ fontSize: 14, color: muted, lineHeight: 2, whiteSpace: "pre-line" }}>{ev.howTo}</div>
              </div>
            )}
            {ev.status === "active" && (
              <button onClick={() => navigate?.("contact")}
                style={{ marginTop: 24, padding: "14px 32px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                후기 제출하기 (문의하기)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>이벤트</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: text, margin: "0 0 8px" }}>진행중인 이벤트</h2>
        <p style={{ fontSize: 14, color: muted }}>SNS메이킷의 다양한 이벤트에 참여하세요!</p>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e9e9ef", borderRadius: 10, padding: 4 }}>
          {[["active", "진행중"], ["ended", "마감"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: tab === id ? (isDark ? "rgba(99,102,241,0.5)" : "#fff") : "transparent",
                color: tab === id ? (isDark ? "#fff" : "#7c6aff") : muted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: muted, marginBottom: 12 }}>—</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{tab === "active" ? "진행중인 이벤트가 없어요" : "마감된 이벤트가 없어요"}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(ev => (
            <div key={ev.id} onClick={() => setSelected(ev.id)}
              style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 16, padding: "24px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 18, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}>
              {ev.icon ? <div style={{ fontSize: 36, flexShrink: 0 }}>{ev.icon}</div> : null}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10,
                    background: ev.status === "active" ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "#555", color: "#fff" }}>
                    {ev.badge}
                  </span>
                  <span style={{ fontSize: 11, color: muted }}>{ev.period}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: text }}>{ev.title}</div>
                <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{ev.desc.split("\n")[0]}</div>
              </div>
              <span style={{ fontSize: 18, color: muted, flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
