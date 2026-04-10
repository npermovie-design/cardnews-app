import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

const PAYMENT_ENABLED = true;

const COMMON_FEATURES = [
  "AI 상세페이지 생성 (전환율 최적화형)",
  "SNS 글쓰기 (네이버/티스토리/인스타/유튜브/스레드)",
  "AI 이미지 생성 (제품컷/로고/목업/모델)",
  "숏폼 자동 편집",
  "유튜브 채널 분석",
  "뉴스레터 구독",
  "커뮤니티 · 자료실 이용",
];

const SUB_PLANS = [
  {
    id: "free", name: "Free", icon: "F",
    monthlyPrice: 0, yearlyPrice: 0,
    points: 100, color: "#888",
    gradient: "linear-gradient(135deg,#555,#333)",
    highlight: false, badge: null,
    features: ["가입 보너스 50P 지급", "AI 글쓰기 약 2회", ...COMMON_FEATURES],
    btnLabel: "무료로 시작",
    free: true,
  },
  {
    id: "basic", name: "Basic", icon: "B",
    monthlyPrice: 9.9, yearlyPrice: 99,
    points: 1800, color: "#4ade80",
    gradient: "linear-gradient(135deg,#14532d,#22c55e)",
    highlight: false, badge: null,
    features: ["매월 1,800P 충전", "AI 글쓰기 약 90회", "상세페이지 생성 약 90회", "이미지 생성 약 9회", ...COMMON_FEATURES],
    btnLabel: "시작하기",
    lsId: "8dca976c-3064-4d76-af4b-8743a10e9f9f",
    lsIdYearly: "6b3922c9-04e1-40f0-b295-75870a9e0b3f",
  },
  {
    id: "pro", name: "Pro", icon: "P",
    monthlyPrice: 19.9, yearlyPrice: 199,
    points: 3800, color: "#38bdf8",
    gradient: "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
    highlight: true, badge: "추천",
    features: ["매월 3,800P 충전", "AI 글쓰기 약 190회", "상세페이지 생성 약 190회", "이미지 생성 약 19회", "숏폼 편집 약 11회", ...COMMON_FEATURES],
    btnLabel: "시작하기",
    lsId: "81968d65-1482-4dd8-b3a2-88540bdba780",
    lsIdYearly: "ab2d967d-43bb-40a8-96c0-9fcfd6d9c62a",
  },
  {
    id: "premium", name: "Premium", icon: "P",
    monthlyPrice: 34.9, yearlyPrice: 349,
    points: 7000, color: "#f59e0b",
    gradient: "linear-gradient(135deg,#78350f,#f59e0b)",
    highlight: false, badge: "최고 가성비",
    features: ["매월 7,000P 충전", "AI 글쓰기 약 350회", "상세페이지 생성 약 350회", "이미지 생성 약 35회", "숏폼 편집 약 20회", "자동 글쓰기 무제한", ...COMMON_FEATURES],
    btnLabel: "시작하기",
    lsId: "ff405644-34fc-415e-b003-e657030484b9",
    lsIdYearly: "fbe69e26-a806-4c86-b36f-5b4e61a4f43d",
  },
];

const ONE_OFF_PLANS = [
  { id:"pack1", name:"Starter",  amount:5.9,  points:1000,  highlight:false, perPoint:"0.59", lsId:"6cd384b2-95a9-4fb6-87e4-2c2bf5dd3a9b" },
  { id:"pack2", name:"Basic",    amount:11.9, points:2000,  highlight:false, perPoint:"0.60", lsId:"de7d098b-9ef7-4673-ba7e-cfe61858be66" },
  { id:"pack3", name:"Standard", amount:19.9, points:3500,  highlight:true,  perPoint:"0.57", lsId:"7593e698-c3ca-4abf-b6a3-e2e50f645591" },
  { id:"pack4", name:"Plus",     amount:29.9, points:5500,  highlight:false, perPoint:"0.54", lsId:"b302ef23-b9ec-450b-9ec8-958c3a587b30" },
  { id:"pack5", name:"Pro",      amount:49.9, points:9500,  highlight:false, perPoint:"0.53", bestValue:true, lsId:"8c88e4c6-52c6-430f-87dd-c7de12d91e50" },
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
  const [successModal, setSuccessModal] = useState(null); // {planName, receiptUrl, newPoints, pointsDelta}
  const isDark = C?.border?.includes("255");
  const userPoints = user?.points || 0;

  const COMMON_F = [
    p("pFeatSns"), p("pFeatNewsBlog"), p("pFeatCard"), p("pFeatDetail"),
    p("pFeatCommunity"), p("pFeatPostPt"), p("pFeatLoginPt"),
  ];
  const PLANS = SUB_PLANS.map(pl => {
    // 포인트 기반으로 사용 횟수 자동 계산 (i18n 지원)
    // 단가: 글쓰기 20P, 상세페이지 45P, 이미지 200P, 쇼츠 180P
    const writes = Math.floor(pl.points / 20);
    const details = Math.floor(pl.points / 45);
    const images = Math.floor(pl.points / 200);
    const shorts = Math.floor(pl.points / 180);
    let featList;
    if (pl.free) {
      featList = [p("pFeatSignup200") || "가입 시 100P 지급", p("pFeatFreeWrite") || "AI 글쓰기 약 2회"];
    } else {
      featList = [
        p("pFeatMonthly").replace("{n}", pl.points.toLocaleString()),
        p("pFeatWriteN").replace("{n}", writes.toLocaleString()),
        p("pFeatDetailN").replace("{n}", details.toLocaleString()),
        p("pFeatImageN").replace("{n}", images.toLocaleString()),
      ];
      if (pl.id === "pro" || pl.id === "premium") {
        featList.push(p("pFeatShortsN").replace("{n}", shorts.toLocaleString()));
      }
      if (pl.id === "premium") {
        featList.push(p("pFeatUnlimitedWrite") || "자동 글쓰기 무제한");
      }
    }
    return {
      ...pl,
      badge: pl.id === "pro" ? p("recommend") : (pl.id === "premium" ? (lang === "ko" ? "최고 가성비" : "Best value") : pl.badge),
      btnLabel: pl.free ? p("pFreeBtn") : p("pStartBtn"),
      features: featList,
    };
  });
  const FAQ = [
    { q: p("faqQ1"), a: p("faqA1") },
    { q: p("faqQ2"), a: p("faqA2") },
    { q: p("faqQ3"), a: p("faqA3") },
    { q: p("faqQ4"), a: p("faqA4") },
    { q: p("faqQ5"), a: p("faqA5") },
    { q: p("faqQ6"), a: p("faqA6") },
    { q: p("faqQ7"), a: p("faqA7") },
  ];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const lsLoaded = useRef(false);

  // Lemon Squeezy 스크립트 로드 + 결제 성공 이벤트 핸들러
  useEffect(() => {
    if (lsLoaded.current) return;
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => {
      lsLoaded.current = true;
      window.createLemonSqueezy?.();
      // 결제 성공 이벤트 구독
      try {
        window.LemonSqueezy?.Setup?.({
          eventHandler: (event) => {
            if (event?.event === "Checkout.Success") {
              const orderAttrs = event?.data?.order?.data?.attributes;
              const item = orderAttrs?.first_order_item;
              const planName = item?.product_name || "";
              const receiptUrl = orderAttrs?.urls?.receipt || null;
              // LS 기본 성공 모달 즉시 닫기 (우리 커스텀 모달 표시)
              try { window.LemonSqueezy?.Url?.Close?.(); } catch(e) {}
              handleCheckoutSuccess(planName, receiptUrl);
            }
          },
        });
      } catch(e) { /* LS Setup unavailable */ }
    };
    document.head.appendChild(script);
  }, []);

  // 결제 성공 핸들러: 포인트 갱신 폴링 + 성공 모달 표시
  const handleCheckoutSuccess = async (planName, receiptUrl) => {
    if (!user?.uid) return;
    const prevPoints = user?.points || 0;

    // 일단 모달 즉시 표시 (포인트는 로딩 상태)
    setSuccessModal({ planName, receiptUrl, newPoints: null, pointsDelta: null });

    // webhook 처리 대기 — 최대 15초 동안 1초마다 포인트 변화 확인
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const { data } = await supabase
          .from("users")
          .select("points")
          .eq("uid", user.uid)
          .single();
        const newPoints = data?.points ?? prevPoints;
        if (newPoints > prevPoints) {
          setSuccessModal(s => s ? { ...s, newPoints, pointsDelta: newPoints - prevPoints } : null);
          return;
        }
      } catch(e) { /* retry */ }
    }
    // 15초 후에도 반영 안 됐으면 일반 안내
    setSuccessModal(s => s ? { ...s, newPoints: prevPoints, pointsDelta: 0 } : null);
  };

  const openCheckout = (lsId, planLabel) => {
    if (!user) { onLogin?.(); return; }
    if (!lsId) return;
    const params = new URLSearchParams();
    params.set("embed", "1");
    params.set("media", "0");
    params.set("checkout[email]", user.email || "");
    params.set("checkout[custom][user_id]", user.uid || "");
    const url = `https://snsmakeit.lemonsqueezy.com/checkout/buy/${lsId}?${params.toString()}`;
    if (window.LemonSqueezy?.Url) {
      window.LemonSqueezy.Url.Open(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleBuy = (plan, isYearly = false) => {
    if (!user) { onLogin?.(); return; }
    if (plan.free) return;
    const lsId = isYearly ? plan.lsIdYearly : plan.lsId;
    if (!lsId) {
      showToast(isYearly ? "연간 결제 준비 중입니다" : "결제 준비 중입니다");
      return;
    }
    openCheckout(lsId, plan.name);
  };

  const handleOneOff = (plan) => {
    if (!user) { onLogin?.(); return; }
    openCheckout(plan.lsId, plan.name);
  };

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 20px 80px", overflowX: "hidden" }}>

      {/* 결제 성공 모달 */}
      {successModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={() => setSuccessModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:isDark?"#181836":"#fff", borderRadius:20, padding:"40px 32px 28px", maxWidth:420, width:"100%", textAlign:"center", boxShadow:"0 24px 80px rgba(0,0,0,0.4)", position:"relative" }}>
            {/* 체크 아이콘 */}
            <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#4ade80,#22c55e)", margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, color:"#fff", fontWeight:900, boxShadow:"0 8px 24px rgba(74,222,128,0.35)" }}>
              ✓
            </div>

            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:8 }}>
              {lang === "ko" ? "결제가 완료되었어요!" : "Payment successful!"}
            </div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:20 }}>
              {successModal.planName && <><strong style={{ color:C.text }}>{successModal.planName}</strong> </>}
              {lang === "ko" ? "구매 감사합니다" : "Thank you for your purchase"}
            </div>

            {/* 포인트 지급 상태 */}
            <div style={{ background: isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)", border:"1px solid rgba(124,106,255,0.25)", borderRadius:14, padding:"16px 18px", marginBottom:20 }}>
              {successModal.newPoints === null ? (
                <div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>{lang === "ko" ? "포인트 지급 중..." : "Crediting points..."}</div>
                  <div style={{ display:"flex", justifyContent:"center", gap:4 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#7c6aff", opacity:0.5, animation:`lsdot 1.2s ${i*0.15}s infinite` }} />
                    ))}
                  </div>
                  <style>{`@keyframes lsdot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
                </div>
              ) : successModal.pointsDelta > 0 ? (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6, letterSpacing:0.3 }}>{lang === "ko" ? "충전된 포인트" : "Points credited"}</div>
                  <div style={{ fontSize:28, fontWeight:900, color:"#7c6aff", marginBottom:4 }}>
                    +{successModal.pointsDelta.toLocaleString()} P
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {lang === "ko" ? "현재 잔액" : "Current balance"}: <strong style={{ color:C.text }}>{successModal.newPoints.toLocaleString()} P</strong>
                  </div>
                </>
              ) : (
                <div style={{ fontSize:12, color:"#f59e0b" }}>
                  {lang === "ko"
                    ? "포인트 지급이 지연되고 있어요. 잠시 후 My Page에서 확인해주세요."
                    : "Point credit is delayed. Please check My Page shortly."}
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
              <button onClick={() => { setSuccessModal(null); navigate("ai"); }}
                style={{ padding:"13px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                {lang === "ko" ? "AI 도구로 이동" : "Go to AI tools"}
              </button>
              {successModal.receiptUrl && (
                <a href={successModal.receiptUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"11px", borderRadius:11, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:12, fontWeight:700, textDecoration:"none", display:"block" }}>
                  {lang === "ko" ? "영수증 보기" : "View receipt"}
                </a>
              )}
              <button onClick={() => setSuccessModal(null)}
                style={{ padding:"9px", borderRadius:11, border:"none", background:"transparent", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {lang === "ko" ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b" }}>{p("paymentPreparing")}</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{p("paymentPreparingDesc")}</div>
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e5e5ea", borderRadius: 12, padding: 4 }}>
              {[
                ["monthly", lang === "ko" ? "월간" : "Monthly"],
                ["yearly", lang === "ko" ? "연간" : "Yearly"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setBilling(id)}
                  style={{ padding: "9px 22px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    background: billing === id ? (isDark ? "#1e2a4a" : "#fff") : "transparent",
                    color: billing === id ? C.purpleL : C.muted,
                    boxShadow: billing === id ? "0 2px 8px rgba(0,0,0,0.12)" : "none" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 플랜 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))", gap: 16, marginBottom: 56 }}>
            {PLANS.map(plan => {
              const isYearly = billing === "yearly";
              const price = isYearly ? (plan.yearlyPrice / 12) : plan.monthlyPrice;
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
                        ${price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: isYearly ? 2 : 16 }}>{p("pricingPerMonth")}</div>
                      {isYearly && (
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>{lang === "ko" ? `연 $${plan.yearlyPrice.toFixed(0)} 청구` : `$${plan.yearlyPrice.toFixed(0)}/year billed`}</div>
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

                  {!plan.free && !PAYMENT_ENABLED && (
                    <div style={{ textAlign: "center", marginBottom: 10, padding: "6px 14px", borderRadius: 10, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{p("comingSoon")}</span>
                    </div>
                  )}
                  <button
                    onClick={() => plan.free ? (user ? null : onLogin?.()) : handleBuy(plan, isYearly)}
                    disabled={isLoading || (plan.free && !!user)}
                    style={{ padding: "13px", borderRadius: 11, border: (plan.free && user) ? "1px solid " + C.border : "none", cursor: (plan.free && user) || isLoading ? "default" : "pointer", fontSize: 13, fontWeight: 800, width: "100%", minHeight: 44,
                      background: (plan.free && user) ? (isDark?"rgba(255,255,255,0.06)":"#f0f0f5") : isLoading ? "rgba(99,102,241,0.3)" : plan.gradient,
                      color: (plan.free && user) ? C.muted : "#fff",
                      opacity: (!plan.free && PAYMENT_ENABLED === false) ? 0.55 : 1,
                    }}>
                    {!user ? p("pricingLogin") : (plan.free && user) ? p("pricingCurrent") : isLoading ? p("pricingOpening") : plan.btnLabel}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 플랜 비교 테이블 (SaaS-style detailed comparison) */}
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 24px", marginBottom: 32, overflowX: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: "#7c6aff", fontWeight: 700, marginBottom: 10 }}>{p("compBadge")}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 6, textAlign: "center" }}>{p("compTitle")}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, textAlign: "center" }}>{p("compSubtitle")}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px 12px", fontSize: 13, fontWeight: 700, color: C.muted, borderBottom: "2px solid " + C.border, width: "28%" }}>{p("compFeature")}</th>
                  {[
                    { name: "Free", color: "#888" },
                    { name: "Basic", color: "#4ade80" },
                    { name: "Pro", color: "#38bdf8" },
                    { name: "Premium", color: "#f59e0b" },
                  ].map(plan => (
                    <th key={plan.name} style={{ textAlign: "center", padding: "14px 8px", fontSize: 13, fontWeight: 800, color: plan.color, borderBottom: "2px solid " + C.border, width: "18%", position: "relative" }}>
                      {plan.name}
                      {plan.name === "Pro" && <div style={{ position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", padding: "1px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{p("recommend")}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "compAiWrite", vals: ["2" + p("compUnitTimes"), "~90" + p("compUnitTimes"), "~190" + p("compUnitTimes"), "~350" + p("compUnitTimes")], types: ["num","num","num","num"] },
                  { key: "compAiImage", vals: ["—", "~9" + p("compUnitTimes"), "~19" + p("compUnitTimes"), "~35" + p("compUnitTimes")], types: ["no","num","num","num"] },
                  { key: "compVideoGen", vals: ["—", "—", "~11" + p("compUnitTimes"), "~20" + p("compUnitTimes")], types: ["no","no","num","num"] },
                  { key: "compAutoPublish", vals: ["—", "—", "check", "check"], types: ["no","no","yes","yes"] },
                  { key: "compCardNews", vals: ["check", "check", "check", "check"], types: ["yes","yes","yes","yes"] },
                  { key: "compDetailPage", vals: ["check", "check", "check", "check"], types: ["yes","yes","yes","yes"] },
                  { key: "compCommunity", vals: ["check", "check", "check", "check"], types: ["yes","yes","yes","yes"] },
                  { key: "compSupport", vals: [p("compSupportComm"), p("compSupportEmail"), p("compSupportEmail"), p("compSupportPriority")], types: ["text","text","text","highlight"] },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)") : "transparent", transition: "background 0.15s" }}>
                    <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 600, color: C.text, borderBottom: "1px solid " + C.border }}>{p(row.key)}</td>
                    {row.vals.map((v, j) => {
                      const type = row.types[j];
                      let content, color;
                      if (type === "yes") { content = "✓"; color = "#22c55e"; }
                      else if (type === "no") { content = v; color = isDark ? "rgba(255,255,255,0.2)" : "#bbb"; }
                      else if (type === "num") { content = v; color = j === 2 ? "#7c6aff" : C.text; }
                      else if (type === "highlight") { content = v; color = "#7c6aff"; }
                      else { content = v; color = C.muted; }
                      return (
                        <td key={j} style={{ textAlign: "center", padding: "14px 8px", fontSize: type === "yes" || type === "no" ? 16 : 13, fontWeight: type === "num" || type === "highlight" ? 700 : 500, borderBottom: "1px solid " + C.border, color }}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 어떤 플랜을 선택할까요? */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 16, textAlign: "center" }}>{p("recTitle")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 14 }}>
              {[
                { label: p("recPersonal"), plans: "Free / Basic", desc: p("recPersonalDesc"), icon3d: "/icons3d/char-standing.png", badge: null, color: "#888" },
                { label: p("recTeam"), plans: "Pro", desc: p("recTeamDesc"), icon3d: "/icons3d/char-headphone.png", badge: p("recTeamBadge"), color: "#7c6aff" },
                { label: p("recAgency"), plans: "Premium", desc: p("recAgencyDesc"), icon3d: "/icons3d/char-backpack.png", badge: null, color: "#f59e0b" },
              ].map((seg, i) => (
                <div key={i} style={{ position: "relative", background: C.card, border: seg.badge ? "2px solid #7c6aff" : "1px solid " + C.border, borderRadius: 16, padding: "24px 20px", textAlign: "center", boxShadow: seg.badge ? "0 0 20px rgba(124,106,255,0.15)" : C.shadow }}>
                  {seg.badge && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>{seg.badge}</div>
                  )}
                  <img src={seg.icon3d} alt="" style={{ width: 44, height: 44, objectFit: "contain", marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 4 }}>{seg.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: seg.color, marginBottom: 6 }}>{seg.plans}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{seg.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 모든 플랜 공통 기능 */}
          <div style={{ background: isDark ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.04)", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 16, padding: "20px 24px", marginBottom: 56 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14, textAlign: "center" }}>{p("commonFeatTitle")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: "8px 24px" }}>
              {COMMON_F.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                  <span style={{ color: "#7c6aff", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </div>
              ))}
            </div>
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
                {plan.bestValue && <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20, background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", marginBottom: 4 }}>{p("bestValue")}</div>}
                {plan.highlight && !plan.bestValue && <div style={{ fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20, background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", marginBottom: 4 }}>{p("pricingPopular")}</div>}
                <div style={{ fontSize: 28, fontWeight: 900, color: "#7c6aff" }}>${plan.amount.toFixed(2)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{plan.points.toLocaleString()} <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>P</span></div>
                <div style={{ fontSize: 11, color: C.muted }}>{p("pricingApprox")}{Math.floor(plan.points/20)}{p("pricingUses")}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: plan.bestValue ? "#f59e0b" : "#7c6aff", marginTop: 4 }}>{plan.perPoint}¢ / P</div>
                <div style={{ marginTop: 6, width: "100%" }}>
                  {PAYMENT_ENABLED === false && (
                    <div style={{ textAlign: "center", marginBottom: 8, padding: "4px 10px", borderRadius: 8, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>{p("comingSoon")}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleOneOff(plan)}
                    disabled={loading === plan.id}
                    style={{ width: "100%", padding: "13px", borderRadius: 9, border: "none", cursor: loading === plan.id ? "not-allowed" : "pointer", background: loading === plan.id ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 800, minHeight: 44,
                      opacity: PAYMENT_ENABLED === false ? 0.55 : 1,
                    }}>
                    {!user ? p("pricingLogin") : loading === plan.id ? p("pricingOpening") : p("pricingBuy")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 포인트 소모 기준 안내 */}
      <div style={{ background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: "28px", marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>{p("pointCostTitle")}</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>{p("pointCostDesc")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 10 }}>
          {[
            { label: p("ptTextHaiku"), cost: "20P", desc: p("ptTextHaikuD") },
            { label: p("ptTextSonnet"), cost: "85P", desc: p("ptTextSonnetD") },
            { label: p("ptImage"), cost: "200P", desc: p("ptImageD") },
            { label: p("ptPpt"), cost: "45P", desc: p("ptPptD") },
            { label: p("ptVideoAnalysis"), cost: "65P", desc: p("ptVideoAnalysisD") },
            { label: p("ptVideoGen"), cost: "35~80P", desc: p("ptVideoGenD") },
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
