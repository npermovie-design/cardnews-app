import { useState } from "react";
import { useI18n } from "./i18n.jsx";

export default function EventPage({ C, navigate }) {
  const { lang } = useI18n();
  const ko = lang === "ko";

  const EVENTS = [
    {
      id: 1,
      status: "active",
      badge: ko ? "진행중" : "Active",
      title: ko ? "메이킷 인플루언서 모집!" : "MakeIt Influencer Recruitment!",
      icon: "",
      color: "#168EEA",
      period: "2026.01.01 ~ " + (ko ? "상시 모집" : "Always Open"),
      desc: ko
        ? "블로거, 유튜버, 인스타그래머 등 SNS를 운영하고 있는 분이라면 누구나 가능합니다!\n\nSNS메이킷 홈페이지를 이용하고 후기만 남겨주세요.\nAI 이용권을 지급해드립니다!"
        : "Anyone who runs social media — bloggers, YouTubers, Instagrammers — can participate!\n\nJust use SNS MakeIt and leave a review.\nWe'll reward you with AI credits!",
      details: ko
        ? [
            "대상: SNS(블로그, 유튜브, 인스타그램 등)를 운영하는 모든 분",
            "방법: SNS메이킷을 이용한 후 본인 SNS 채널에 후기 작성",
            "보상: 후기 작성 확인 시 AI 이용권 지급",
            "후기 작성 후 문의하기에서 후기 링크와 함께 신청해주세요",
          ]
        : [
            "Who: Anyone running social media (blog, YouTube, Instagram, etc.)",
            "How: Use SNS MakeIt, then post a review on your channel",
            "Reward: AI credits upon review verification",
            "After posting, submit your review link via Contact Us",
          ],
      howTo: ko
        ? "1. SNS메이킷 회원가입\n2. AI 기능 이용 (블로그, 상세페이지, 이미지 등)\n3. 본인 SNS에 이용 후기 작성\n4. 문의하기에서 후기 링크 제출\n5. 확인 후 AI 이용권 지급!"
        : "1. Sign up for SNS MakeIt\n2. Use AI features (blog, detail pages, images, etc.)\n3. Post a review on your social media\n4. Submit review link via Contact Us\n5. Get AI credits after verification!",
    },
    {
      id: 2,
      status: "active",
      badge: ko ? "진행중" : "Active",
      title: ko ? "오픈 기념 가입 보너스 이벤트" : "Launch Bonus Sign-up Event",
      icon: "",
      color: "#168EEA",
      period: "2026.01.01 ~ " + (ko ? "상시 진행" : "Ongoing"),
      desc: ko
        ? "SNS메이킷 오픈을 기념하여 가입 즉시 추가 횟수를 지급하는 이벤트입니다."
        : "Celebrate the launch of SNS MakeIt — get bonus credits instantly upon sign-up!",
      details: ko
        ? ["가입 즉시 추가 10회 보너스 지급"]
        : ["Instant 10-credit bonus upon registration"],
    },
  ];

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
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, marginBottom: 20, padding: "10px 0", minHeight: 44 }}>
          {ko ? "← 이벤트 목록" : "← Event List"}
        </button>
        <div style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ padding: "36px 32px", background: ev.status === "active" ? "linear-gradient(135deg,rgba(0,0,0,0.06),rgba(236,72,153,0.05))" : "transparent" }}>
            <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
              background: ev.status === "active" ? "#168EEA" : "#666", color: "#fff", marginBottom: 14 }}>
              {ev.badge}
            </div>
            {ev.icon && <div style={{ fontSize: 28, marginBottom: 10 }}>{ev.icon}</div>}
            <h2 style={{ fontSize: 24, fontWeight: 900, color: text, margin: "0 0 8px" }}>{ev.title}</h2>
            <div style={{ fontSize: 13, color: muted }}>{ev.period}</div>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ fontSize: 15, color: text, lineHeight: 2, whiteSpace: "pre-line", marginBottom: 28 }}>{ev.desc}</div>
            {ev.details && (
              <div style={{ background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
                {ev.details.map((d, i) => (
                  <div key={i} style={{ fontSize: 14, color: text, lineHeight: 2 }}>{d}</div>
                ))}
              </div>
            )}
            {ev.howTo && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 10 }}>{ko ? "참여 방법" : "How to Participate"}</div>
                <div style={{ fontSize: 14, color: muted, lineHeight: 2, whiteSpace: "pre-line" }}>{ev.howTo}</div>
              </div>
            )}
            {ev.status === "active" && (
              <button onClick={() => navigate?.("contact")}
                style={{ marginTop: 24, padding: "14px 32px", borderRadius: 12, border: "none",
                  background: "#168EEA", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {ko ? "후기 제출하기 (문의하기)" : "Submit Review (Contact Us)"}
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
        <div style={{ display: "inline-block", background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>{ko ? "이벤트" : "Events"}</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: text, margin: "0 0 8px" }}>{ko ? "진행중인 이벤트" : "Current Events"}</h2>
        <p style={{ fontSize: 14, color: muted }}>{ko ? "SNS메이킷의 다양한 이벤트에 참여하세요!" : "Join various events at SNS MakeIt!"}</p>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e9e9ef", borderRadius: 10, padding: 4 }}>
          {[["active", ko ? "진행중" : "Active"], ["ended", ko ? "마감" : "Ended"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: tab === id ? (isDark ? "rgba(0,0,0,0.06)" : "#fff") : "transparent",
                color: tab === id ? (isDark ? "#fff" : "#168EEA") : muted }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: muted, marginBottom: 12 }}>—</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{tab === "active" ? (ko ? "진행중인 이벤트가 없어요" : "No active events") : (ko ? "마감된 이벤트가 없어요" : "No ended events")}</div>
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
                    background: ev.status === "active" ? "#168EEA" : (isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb"),
                    color: ev.status === "active" ? "#fff" : (isDark ? "rgba(255,255,255,0.6)" : "#666") }}>
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
