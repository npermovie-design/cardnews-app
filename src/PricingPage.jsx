import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || "";

// 토스페이먼츠 연동 완료 후 true로 변경
const PAYMENT_ENABLED = false;

const COMMON_FEATURES = [
  "SNS 글쓰기 (네이버/티스토리/인스타/유튜브/스레드)",
  "뉴스·유튜브로 블로그 글쓰기",
  "심플·이미지 카드뉴스 생성",
  "심플·이미지 상세페이지 생성",
  "커뮤니티 · 자료실 이용",
  "게시글 작성 시 +2P 적립",
  "출석체크 시 +3P 적립",
];

const SUB_PLANS = [
  {
    id: "free", name: "Free", icon: "F",
    monthlyPrice: 0, yearlyPrice: 0,
    points: 100, color: "#888",
    gradient: "linear-gradient(135deg,#555,#333)",
    highlight: false, badge: null,
    features: ["가입 보너스 100P 지급", ...COMMON_FEATURES],
    btnLabel: "무료로 시작",
    free: true,
  },
  {
    id: "basic", name: "Basic", icon: "B",
    monthlyPrice: 9900, yearlyPrice: 95040,
    points: 1800, color: "#4ade80",
    gradient: "linear-gradient(135deg,#14532d,#22c55e)",
    highlight: false, badge: null,
    features: ["매월 1,800P 충전", "AI 글쓰기 약 180회", ...COMMON_FEATURES],
    btnLabel: "시작하기",
  },
  {
    id: "pro", name: "Pro", icon: "P",
    monthlyPrice: 19900, yearlyPrice: 191040,
    points: 3800, color: "#38bdf8",
    gradient: "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
    highlight: true, badge: "추천",
    features: ["매월 3,800P 충전", "AI 글쓰기 약 380회", "이미지 생성 약 47회", ...COMMON_FEATURES],
    btnLabel: "시작하기",
  },
  {
    id: "premium", name: "Premium", icon: "P",
    monthlyPrice: 34900, yearlyPrice: 335040,
    points: 7000, color: "#f59e0b",
    gradient: "linear-gradient(135deg,#78350f,#f59e0b)",
    highlight: false, badge: "최고 가성비",
    features: ["매월 7,000P 충전", "AI 글쓰기 약 700회", "이미지 생성 약 87회", ...COMMON_FEATURES],
    btnLabel: "시작하기",
  },
];

const ONE_OFF_PLANS = [
  { id:"pack1", name:"Starter",  amount:5900,  points:1000,  highlight:false },
  { id:"pack2", name:"Basic",    amount:11900, points:2000,  highlight:false },
  { id:"pack3", name:"Standard", amount:19900, points:3500,  highlight:true  },
  { id:"pack4", name:"Plus",     amount:29900, points:5500,  highlight:false },
  { id:"pack5", name:"Pro",      amount:49900, points:9500,  highlight:false },
];

// FAQ는 컴포넌트 안에서 번역 함수로 동적 생성

export function PricingPage({ navigate, C, user, onLogin }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);
  const [tab, setTab]         = useState("subscription");
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(null);
  const [toast, setToast]     = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const isDark = C?.border?.includes("255");
  const userPoints = user?.points || 0;

  const COMMON_F = [
    p("pFeatSns"), p("pFeatNewsBlog"), p("pFeatCard"), p("pFeatDetail"),
    p("pFeatCommunity"), p("pFeatPostPt"), p("pFeatLoginPt"),
  ];
  const PLANS = SUB_PLANS.map(pl => ({
    ...pl,
    badge: pl.id==="pro" ? p("recommend") : pl.badge,
    btnLabel: pl.free ? p("pFreeBtn") : p("pStartBtn"),
    features: [
      pl.free ? p("pFeatSignup200") || "가입 보너스 100P 지급" : p("pFeatMonthly").replace("{n}", pl.points.toLocaleString()),
      ...COMMON_F,
    ],
  }));
  const FAQ = [
    { q: p("faqQ1"), a: p("faqA1") },
    { q: p("faqQ2"), a: p("faqA2") },
    { q: p("faqQ3"), a: p("faqA3") },
    { q: p("faqQ4"), a: p("faqA4") },
  ];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleBuy = async (plan, isYearly = false) => {
    if (!user) { onLogin?.(); return; }
    if (plan.free) return;
    if (!PAYMENT_ENABLED) { showToast("결제 시스템 준비 중입니다. 포인트 충전은 관리자에게 문의해주세요."); return; }
    setLoading(plan.id + (isYearly ? "_y" : ""));
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: `customer_${user.uid}` });
      const amount  = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
      const orderId = `order_${user.uid}_${Date.now()}`;
      const pts     = isYearly ? plan.points * 12 : plan.points;

      localStorage.setItem("toss_order", JSON.stringify({
        orderId, planId: plan.id + (isYearly ? "_yearly" : "_monthly"),
        points: pts, amount, uid: user.uid,
      }));

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: amount },
        orderId,
        orderName: `SNS메이킷 ${plan.name} ${isYearly ? "연구독" : "월구독"}`,
        successUrl: window.location.origin + "/payment/success",
        failUrl: window.location.origin + "/payment/fail",
        customerEmail: user.email || "",
        customerName: user.nick || "회원",
      });
    } catch(e) {
      if (e.code !== "USER_CANCEL") alert("결제 중 오류: " + e.message);
    } finally { setLoading(null); }
  };

  const handleOneOff = async (plan) => {
    if (!user) { onLogin?.(); return; }
    if (!PAYMENT_ENABLED) { showToast("결제 시스템 준비 중입니다. 포인트 충전은 관리자에게 문의해주세요."); return; }
    setLoading(plan.id);
    try {
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: `customer_${user.uid}` });
      const orderId = `order_${user.uid}_${Date.now()}`;

      localStorage.setItem("toss_order", JSON.stringify({
        orderId, planId: plan.id,
        points: plan.points, amount: plan.amount, uid: user.uid,
      }));

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: plan.amount },
        orderId,
        orderName: `SNS메이킷 ${plan.name} ${plan.points.toLocaleString()}P 충전`,
        successUrl: window.location.origin + "/payment/success",
        failUrl: window.location.origin + "/payment/fail",
        customerEmail: user.email || "",
        customerName: user.nick || "회원",
      });
    } catch(e) {
      if (e.code !== "USER_CANCEL") alert("결제 중 오류: " + e.message);
    } finally { setLoading(null); }
  };

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 20px 80px" }}>

      {/* 토스트 알림 */}
      {toast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: isDark ? "#1e1c3a" : "#fff", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 14, padding: "14px 24px", fontSize: 14, fontWeight: 700,
          color: C.text, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>{p("pricingBadge")}</div>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>{p("pricingTitle")}</h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          {p("pricingSub")}
        </p>
        {user && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 20px", borderRadius: 20, background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <span style={{ fontSize: 13, color: "#818cf8" }}>{p("pricingMyPoints")}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#7c6aff" }}>{userPoints.toLocaleString()} P</span>
          </div>
        )}
      </div>

      {!PAYMENT_ENABLED && (
        <div style={{ textAlign:"center", marginBottom:20, padding:"12px 20px", borderRadius:12, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.25)", maxWidth:500, margin:"0 auto 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b" }}>결제 서비스 준비 중입니다</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>현재 포인트 충전은 관리자에게 문의해주세요.</div>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e5ea", borderRadius: 12, padding: 4 }}>
          {[["subscription",p("pricingSubTab")],["oneoff",p("pricingOneoffTab")]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "10px 32px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                background: tab === id ? (isDark ? "#1e2a4a" : "#fff") : "transparent",
                color: tab === id ? C.purpleL : C.muted,
                boxShadow: tab === id ? "0 2px 8px rgba(0,0,0,0.12)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 구독 탭 */}
      {tab === "subscription" && (
        <>
          {/* 월간/연간 토글 */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <span style={{ fontSize: 14, fontWeight: billing==="monthly"?700:400, color: billing==="monthly"?C.text:C.muted }}>{p("pricingMonthly")}</span>
            <div onClick={() => setBilling(b => b==="monthly"?"yearly":"monthly")}
              style={{ width: 52, height: 28, borderRadius: 14, background: billing==="yearly" ? "#7c6aff" : (isDark?"rgba(255,255,255,0.15)":"#ddd"), cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 4, left: billing==="yearly"?26:4, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: billing==="yearly"?700:400, color: billing==="yearly"?C.text:C.muted }}>{p("pricingYearly")}</span>
            {billing === "yearly" && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff" }}>{p("pricingYearlyDiscount")}</span>
            )}
          </div>

          {/* 플랜 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 16, marginBottom: 56 }}>
            {PLANS.map(plan => {
              const isYearly = billing === "yearly";
              const price = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const isLoading = loading === plan.id + (isYearly ? "_y" : "");

              return (
                <div key={plan.id} style={{ position: "relative", background: C.card, border: plan.highlight ? "2px solid " + plan.color : "1px solid " + C.border, borderRadius: 22, padding: "32px 20px 24px", display: "flex", flexDirection: "column", boxShadow: plan.highlight ? "0 0 28px " + plan.color + "30" : C.shadow, transition: "transform 0.18s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>

                  {plan.badge && (
                    <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: plan.gradient, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {plan.badge}
                    </div>
                  )}

                  <div style={{ fontSize: 28, marginBottom: 8 }}>{plan.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 10 }}>{plan.name}</div>

                  {plan.free ? (
                    <div style={{ fontSize: 32, fontWeight: 900, color: plan.color, marginBottom: 16 }}>{p("pricingFree")}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, fontWeight: 900, color: plan.color, lineHeight: 1, marginBottom: 2 }}>
                        ₩{price.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: isYearly ? 2 : 16 }}>{p("pricingPerMonth")}</div>
                      {isYearly && (
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>연 ₩{plan.yearlyPrice.toLocaleString()} 청구</div>
                      )}
                    </>
                  )}

                  <div style={{ fontSize: 14, fontWeight: 800, color: plan.color, marginBottom: 16 }}>{plan.points.toLocaleString()} P/월</div>

                  <div style={{ flex: 1, marginBottom: 20 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, fontSize: 12, color: C.muted }}>
                        <span style={{ color: plan.color, flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>

                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => plan.free ? (user ? null : onLogin?.()) : handleBuy(plan, isYearly)}
                      disabled={isLoading || (plan.free && !!user)}
                      style={{ padding: "12px", borderRadius: 11, border: (plan.free && user) ? "1px solid " + C.border : "none", cursor: (plan.free && user) || isLoading ? "default" : "pointer", fontSize: 13, fontWeight: 800, width: "100%",
                        background: (plan.free && user) ? (isDark?"rgba(255,255,255,0.06)":"#f0f0f5") : isLoading ? "rgba(99,102,241,0.3)" : plan.gradient,
                        color: (plan.free && user) ? C.muted : "#fff",
                        opacity: (!plan.free && PAYMENT_ENABLED === false) ? 0.55 : 1,
                      }}>
                      {!user ? p("pricingLogin") : (plan.free && user) ? p("pricingCurrent") : isLoading ? p("pricingOpening") : plan.btnLabel}
                    </button>
                    {!plan.free && !PAYMENT_ENABLED && (
                      <div onClick={() => handleBuy(plan, isYearly)} style={{ position: "absolute", inset: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(0,0,0,0.18)" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.45)", padding: "3px 10px", borderRadius: 20 }}>곧 오픈 예정</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 단건구매 탭 */}
      {tab === "oneoff" && (
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", padding: "12px 18px", borderRadius: 10, background: isDark ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)", fontSize: 13, color: C.muted, marginBottom: 28, maxWidth: 500, margin: "0 auto 28px" }}>
            {p("pricingOneoffDesc")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,45%),1fr))", gap: 14, maxWidth: 760, margin: "0 auto" }}>
            {ONE_OFF_PLANS.map(plan => (
              <div key={plan.id} style={{ borderRadius: 18, border: plan.highlight ? "2px solid #7c6aff" : "1px solid " + C.border, background: C.card, padding: "28px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: plan.highlight ? "0 0 24px rgba(99,102,241,0.2)" : C.shadow, transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                {plan.highlight && <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", marginBottom: 4 }}>{p("pricingPopular")}</div>}
                <div style={{ fontSize: 28, fontWeight: 900, color: "#7c6aff" }}>₩{plan.amount.toLocaleString()}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{plan.points.toLocaleString()} <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>P</span></div>
                <div style={{ fontSize: 11, color: C.muted }}>{p("pricingApprox")}{Math.floor(plan.points/10)}{p("pricingUses")}</div>
                <div style={{ marginTop: 6, width: "100%", position: "relative" }}>
                  <button
                    onClick={() => handleOneOff(plan)}
                    disabled={loading === plan.id}
                    style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", cursor: loading === plan.id ? "not-allowed" : "pointer", background: loading === plan.id ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 800,
                      opacity: PAYMENT_ENABLED === false ? 0.55 : 1,
                    }}>
                    {!user ? p("pricingLogin") : loading === plan.id ? p("pricingOpening") : p("pricingBuy")}
                  </button>
                  {PAYMENT_ENABLED === false && (
                    <div onClick={() => handleOneOff(plan)} style={{ position: "absolute", inset: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "rgba(0,0,0,0.18)" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.45)", padding: "3px 10px", borderRadius: 20 }}>곧 오픈 예정</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 포인트 소모 기준 안내 */}
      <div style={{ background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: "28px", marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>포인트 소모 기준 (API 비용 반영)</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>실제 AI 모델 사용량에 따라 포인트가 차감됩니다.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
          {[
            { label: "텍스트 생성 (Claude Haiku)", cost: "10P", desc: "빠른 글쓰기·요약" },
            { label: "텍스트 생성 (Claude Sonnet)", cost: "35P", desc: "고품질 글쓰기·분석" },
            { label: "이미지 생성 (AI 이미지)", cost: "80P", desc: "1장 기준" },
            { label: "PPT 생성", cost: "25P", desc: "1덱 기준" },
            { label: "영상 분석 (Shorts)", cost: "35P", desc: "1건 분석" },
            { label: "영상 생성", cost: "15~40P", desc: "길이에 따라 변동" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 16px" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{item.desc}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#7c6aff", whiteSpace: "nowrap", marginLeft: 12 }}>{item.cost}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 무료 포인트 적립 안내 */}
      <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "28px", marginBottom: 48 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 20 }}>{p("pricingFreeMethod")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(130px,45%),1fr))", gap: 12 }}>
          {[
            { icon:"+", action:p("pricingSignup"), pt:p("pricingSignupPts"), desc:p("pricingSignupDesc") },
            { icon:"+", action:p("pricingPost"), pt:p("pricingPostPts"), desc:p("pricingPostDesc") },
            { icon:"+", action:p("pricingDaily"), pt:p("pricingDailyPts"), desc:p("pricingDailyDesc") },
          ].map((item, i) => (
            <div key={i} style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 12, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{item.action}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#7c6aff" }}>{item.pt}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 20 }}>{p("pricingFaqTitle")}</div>
        {FAQ.map((item, i) => (
          <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 22px", marginBottom: 10, cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Q. {item.q}</div>
              <span style={{ fontSize: 18, color: C.muted, transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none" }}>▾</span>
            </div>
            {openFaq === i && (
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.border }}>A. {item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
