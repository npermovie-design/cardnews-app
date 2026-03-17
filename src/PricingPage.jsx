import { useState, useEffect } from "react";
import { Badge, Btn } from "./UI";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage } from "./storage";

/* ════════════════════════════════════════════════════════════
   PricingPage
════════════════════════════════════════════════════════════ */
export function PricingPage({ navigate, C, user, onLogin }) {
  const [tab, setTab] = useState("subscription");
  const isDark = C?.border?.includes("255");

  const SUB_PLANS = [
    {
      id:"free", name:"Free", price:"무료", credits:200, color:"#888",
      gradient:"linear-gradient(135deg,#555,#333)", badge:null, highlight:false,
      features:["200 크레딧","회원가입 시 무료 지급","5분당 1회 생성 제한","1장씩 생성 가능","AI 업스케일링"],
      btnLabel:"무료 시작",
    },
    {
      id:"basic", name:"Basic", price:"₩9,900/월", credits:4500, color:"#4ade80",
      gradient:"linear-gradient(135deg,#14532d,#22c55e)", badge:"연세 플랜", highlight:false,
      features:["4,500 크레딧","⚡ 생성 쿨타임 없음","4장씩 생성 가능","AI 업스케일링","피부보정(기본)","고해상도 변환","실시간 처리"],
      btnLabel:"Upgrade Plan",
    },
    {
      id:"deluxe", name:"Deluxe", price:"₩19,900/월", credits:9500, color:"#38bdf8",
      gradient:"linear-gradient(135deg,#0c4a6e,#0369a1)", badge:"추천", highlight:true,
      features:["9,500 크레딧","⚡ 생성 쿨타임 없음","4장씩 생성 가능","AI 업스케일링","피부보정(기본+메이크업)","고해상도 변환","실시간 처리","무제한 업로드"],
      btnLabel:"Upgrade Plan",
    },
    {
      id:"premium", name:"Premium", price:"₩29,900/월", credits:14500, color:"#f59e0b",
      gradient:"linear-gradient(135deg,#78350f,#f59e0b)", badge:null, highlight:false,
      features:["14,500 크레딧","⚡ 생성 쿨타임 없음","4장씩 생성 가능","AI 업스케일링","피부보정(기본+메이크업)","고해상도 변환","실시간 처리","무제한 업로드","베타기능(무료)"],
      btnLabel:"Upgrade Plan",
    },
  ];

  const PACKS = [
    { price:"₩6,900",  credits:1500 },
    { price:"₩13,900", credits:3000 },
    { price:"₩20,900", credits:4800 },
    { price:"₩27,900", credits:6450 },
    { price:"₩41,900", credits:9750 },
  ];

  const FAQ = [
    { q:"크레딧은 어떻게 사용하나요?", a:"AI 글쓰기·카드뉴스 생성 1회 = 10 크레딧, 상세페이지 슬라이드 1장 = 30 크레딧이 차감됩니다." },
    { q:"크레딧 유효기간이 있나요?", a:"충전한 크레딧은 유효기간이 없습니다. 게시글 작성(1cr), 일일 로그인(3cr)으로 무료 적립도 가능해요." },
    { q:"결제는 어떻게 하나요?", a:"신용카드, 카카오페이, 네이버페이 등 다양한 방법으로 결제 가능합니다." },
    { q:"환불이 가능한가요?", a:"충전 후 사용하지 않은 크레딧은 7일 이내 전액 환불 가능합니다. 문의하기로 연락해주세요." },
  ];

  const userCredits = user?.points || 0;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "48px 20px 80px" }}>

      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>✦ 요금제</div>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>크레딧으로 자유롭게 사용하세요</h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          AI 글쓰기 · 카드뉴스 = <b style={{ color: C.text }}>10 크레딧</b> &nbsp;·&nbsp; 상세페이지 슬라이드 1장 = <b style={{ color: C.text }}>30 크레딧</b>
        </p>
        {user && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 20px", borderRadius: 20, background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <span style={{ fontSize: 13, color: "#818cf8" }}>내 크레딧</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#6366f1" }}>{userCredits.toLocaleString()} cr</span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e5ea", borderRadius: 12, padding: 4 }}>
          {[["subscription","월 구독"],["oneoff","단건구매"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "10px 32px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                background: tab === id ? (isDark ? "#1e2a4a" : "#fff") : "transparent",
                color: tab === id ? (isDark ? "#38bdf8" : C.text) : C.muted,
                boxShadow: tab === id ? "0 2px 8px rgba(0,0,0,0.12)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 소개 */}
      <div style={{ maxWidth: 620, margin: "0 auto 32px", textAlign: "center" }}>
        {tab === "subscription" && (
          <div style={{ padding: "12px 18px", borderRadius: 10, background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            <b style={{ color: C.text }}>월 구독</b>은 매달 자동으로 크레딧이 충전돼요. 많이 쓸수록 Deluxe·Premium이 더 유리해요.
          </div>
        )}
        {tab === "oneoff" && (
          <div style={{ padding: "12px 18px", borderRadius: 10, background: isDark ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)", fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            <b style={{ color: C.text }}>단건구매</b>는 구독 없이 원하는 만큼만 충전해요. 충전된 크레딧은 <b style={{ color: C.text }}>유효기간 없이 영구</b> 사용 가능해요.
          </div>
        )}
      </div>

      {/* 월 구독 */}
      {tab === "subscription" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(210px,100%),1fr))", gap: 16, marginBottom: 56 }}>
          {SUB_PLANS.map(plan => {
            const isActive = !user?.plan && plan.id === "free" || user?.plan === plan.id;
            return (
              <div key={plan.id} style={{ position: "relative", background: C.card, border: plan.highlight ? "2px solid " + plan.color : "1px solid " + C.border, borderRadius: 20, padding: "32px 22px 24px", display: "flex", flexDirection: "column", boxShadow: plan.highlight ? "0 0 28px " + plan.color + "30" : C.shadow, transition: "transform 0.18s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                {plan.badge && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.gradient, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>{plan.badge}</div>}
                <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 10 }}>{plan.name}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: plan.color, lineHeight: 1.1, marginBottom: 6 }}>{plan.price}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: plan.color, marginBottom: 18 }}>{plan.credits.toLocaleString()} 크레딧</div>
                <div style={{ flex: 1, marginBottom: 20 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 9, fontSize: 12, color: C.muted }}>
                      <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { if (!user) { onLogin?.(); return; } if (plan.id !== "free" && !isActive) navigate("contact"); }}
                  style={{ padding: "12px", borderRadius: 11, border: isActive ? "1px solid " + C.border : "none", cursor: isActive ? "default" : "pointer", fontSize: 13, fontWeight: 800, width: "100%",
                    background: isActive ? (isDark ? "rgba(255,255,255,0.06)" : "#f0f0f5") : plan.gradient,
                    color: isActive ? C.muted : "#fff" }}>
                  {!user ? "로그인 후 이용" : isActive ? "Active" : plan.btnLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 단건구매 */}
      {tab === "oneoff" && (
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 680, margin: "0 auto" }}>
            {PACKS.map((pack, i) => (
              <div key={i} style={{ borderRadius: 16, border: "1px solid " + C.border, background: C.card, padding: "28px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#38bdf8" }}>{pack.price}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>{pack.credits.toLocaleString()} 크레딧</div>
                <button
                  onClick={() => { if (!user) { onLogin?.(); return; } navigate("contact"); }}
                  style={{ marginTop: 6, width: "100%", padding: "11px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                  구매하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 크레딧 적립 안내 */}
      <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "28px", marginBottom: 48 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 20 }}>💰 무료 크레딧 적립 방법</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(130px,45%),1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { icon: "🎁", action: "회원가입", cr: "+200cr", desc: "가입 즉시" },
            { icon: "📝", action: "게시글 작성", cr: "+1cr", desc: "글 1개당" },
            { icon: "☀️", action: "일일 로그인", cr: "+3cr", desc: "하루 1회" },
          ].map((item, i) => (
            <div key={i} style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 12, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{item.action}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#6366f1" }}>{item.cr}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px", background: "rgba(99,102,241,0.08)", borderRadius: 10, fontSize: 12, color: C.muted }}>
          💡 <b style={{ color: C.text }}>AI 글쓰기·카드뉴스 = 10 크레딧</b> · <b style={{ color: C.text }}>상세페이지 슬라이드 1장 = 30 크레딧</b>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 20 }}>자주 묻는 질문</div>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 22px", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Q. {item.q}</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>A. {item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
