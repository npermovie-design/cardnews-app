import { useState, useEffect } from "react";
import { changePoints, fetchUser, setLocalUser } from "./storage";

/* ══════════════════════════════════════════════════════════
   🍋 Lemon Squeezy 결제 설정
══════════════════════════════════════════════════════════ */
const LS_CONFIG = {
  apiKey:  import.meta.env.VITE_LS_API_KEY || "",
  storeId: "315475",
};

// 월 구독 플랜 (Lemon Squeezy Variant ID)
export const PLANS = {
  basic: {
    variantId: "cbb325cb-84e0-4e6d-b996-c66c8611bd11",
    name: "Basic",     price: 9900,  priceUSD: 9,
    priceLabel: "₩9,900/월", credits: 4500,
    color: "#4ade80",  gradient: "linear-gradient(135deg,#14532d,#166534)",
    badge: "연세 플랜", highlight: false,
    features: ["4,500 크레딧","⚡ 생성 쿨타임 없음","한 번에 4장까지 생성","AI 업스케일링","피부보정(기본)","고해상도 변환","실시간 처리"],
  },
  deluxe: {
    variantId: "e6cf24e6-4807-45bb-a1e2-9db5d56b3b08",
    name: "Deluxe",    price: 19900, priceUSD: 19,
    priceLabel: "₩19,900/월", credits: 9500,
    color: "#38bdf8",  gradient: "linear-gradient(135deg,#0c4a6e,#0369a1)",
    badge: "추천", highlight: true,
    features: ["9,500 크레딧","⚡ 생성 쿨타임 없음","한 번에 4장까지 생성","AI 업스케일링","피부보정(기본+메이크업)","고해상도 변환","실시간 처리","무제한 업로드"],
  },
  premium: {
    variantId: "fd18d32d-b8af-45aa-9b78-0902b139f127",
    name: "Premium",   price: 29900, priceUSD: 29,
    priceLabel: "₩29,900/월", credits: 14500,
    color: "#f59e0b",  gradient: "linear-gradient(135deg,#78350f,#92400e)",
    badge: null, highlight: false,
    features: ["14,500 크레딧","⚡ 생성 쿨타임 없음","한 번에 4장까지 생성","AI 업스케일링","피부보정(기본+메이크업)","고해상도 변환","실시간 처리","무제한 업로드","베타기능(무료)"],
  },
};

// 단건 구매 패키지
export const CREDIT_PACKS = [
  { id:"pack5",  variantId:"pack5_variant",  price:6900,  priceUSD:5,  credits:1500 },
  { id:"pack10", variantId:"pack10_variant", price:13900, priceUSD:10, credits:3000 },
  { id:"pack15", variantId:"pack15_variant", price:20900, priceUSD:15, credits:4800 },
  { id:"pack20", variantId:"pack20_variant", price:27900, priceUSD:20, credits:6450 },
  { id:"pack30", variantId:"pack30_variant", price:41900, priceUSD:30, credits:9750 },
];

export function startPayment(planId, user) {
  const varMap = {
    basic:   "cbb325cb-84e0-4e6d-b996-c66c8611bd11",
    deluxe:  "e6cf24e6-4807-45bb-a1e2-9db5d56b3b08",
    premium: "fd18d32d-b8af-45aa-9b78-0902b139f127",
  };
  const variantId = varMap[planId];
  if (!variantId) return;
  const checkoutUrl = `https://snsmakeit.lemonsqueezy.com/checkout/buy/${variantId}?checkout[custom][uid]=${user?.uid || ""}&checkout[custom][plan]=${planId}`;
  window.open(checkoutUrl, "_blank");
}

// ── 결제 완료 처리 ────────────────────────────────────────
export function PaymentCallback({ user, onSuccess }) {
  const [paymentResult, setPaymentResult] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return;
    const planId = params.get("plan");
    const plan = PLANS[planId];
    if (!plan || !user?.uid) return;
    const credits = plan.credits;
    changePoints(user.uid, credits, `크레딧 충전 (${plan.name})`).then(newPts => {
      fetchUser(user.uid).then(updated => {
        if (updated) { setLocalUser(updated); }
        setPaymentResult({ status:"success", planId, credits, newPts });
        onSuccess?.({ credits, newPts });
      });
    });
    window.history.replaceState({}, "", window.location.pathname);
  }, [user]);
  return null;
}

// ── PricingPage UI ────────────────────────────────────────
export function PricingPage({ C, navigate, user, onLogin }) {
  const [tab, setTab] = useState("subscription"); // subscription | oneoff
  const isDark = C?.border?.includes("255");
  const text    = isDark ? "#fff" : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.55)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const bg      = isDark ? "#0d0d1a" : "#f4f4f8";

  const userPlan = user?.plan || "free";
  const userCredits = user?.points || 0;

  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"60px 24px 80px" }}>

      {/* 헤더 */}
      <div style={{ maxWidth:900, margin:"0 auto", textAlign:"center", marginBottom:48 }}>
        <div style={{ fontSize:36, fontWeight:900, color:text, letterSpacing:-1, marginBottom:12 }}>
          크레딧으로 자유롭게 사용하세요
        </div>
        <div style={{ fontSize:16, color:muted, lineHeight:1.8 }}>
          카드뉴스 1회 = <b style={{ color:text }}>10 크레딧</b> &nbsp;·&nbsp;
          상세페이지 슬라이드 1장 = <b style={{ color:text }}>30 크레딧</b>
        </div>
        {user && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:16, padding:"8px 20px", borderRadius:20, background:isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)" }}>
            <span style={{ fontSize:13, color:"#818cf8" }}>내 크레딧</span>
            <span style={{ fontSize:18, fontWeight:900, color:"#7c6aff" }}>{userCredits.toLocaleString()} cr</span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ maxWidth:320, margin:"0 auto 40px", display:"flex", gap:4, background:isDark?"rgba(255,255,255,0.06)":"#e5e5ea", borderRadius:12, padding:4 }}>
        {[["subscription","월 구독"],["oneoff","단건구매"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:14, fontWeight:700,
              background: tab===id ? (isDark?"#1e3a5f":"#fff") : "transparent",
              color: tab===id ? (isDark?"#38bdf8":text) : muted,
              boxShadow: tab===id ? "0 2px 8px rgba(0,0,0,0.15)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* 월 구독 */}
      {tab === "subscription" && (
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16 }}>
            {/* Free 플랜 */}
            <div style={{ borderRadius:20, border:`1px solid ${bdr}`, background:cardBg, padding:"28px 24px", display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:18, fontWeight:800, color:text, marginBottom:8 }}>Free</div>
              <div style={{ fontSize:40, fontWeight:900, color:"#888", marginBottom:4 }}>
                $0
              </div>
              <div style={{ fontSize:12, color:muted, marginBottom:24 }}>무료</div>
              {["200 크레딧","회원가입 시 200 크레딧 무료","5분당 1회 생성 제한","한 번에 1장 생성 가능","AI 업스케일링","고해상도 변환"].map((f,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:13, color:muted }}>
                  <span style={{ color:"#888" }}>✓</span>{f}
                </div>
              ))}
              <div style={{ marginTop:"auto", paddingTop:20 }}>
                <button disabled style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:isDark?"rgba(255,255,255,0.08)":"#e5e5ea", color:muted, fontSize:14, fontWeight:700, cursor:"not-allowed" }}>
                  {userPlan==="free" ? "현재 플랜" : "구독 불가"}
                </button>
              </div>
            </div>
            {/* 유료 플랜 */}
            {Object.entries(PLANS).map(([id, plan])=>{
              const isActive = userPlan === id;
              return (
                <div key={id} style={{ borderRadius:20, border:`2px solid ${plan.highlight ? plan.color : bdr}`, background: plan.highlight ? (isDark?"rgba(14,116,144,0.15)":"rgba(14,116,144,0.05)") : cardBg, padding:"28px 24px", display:"flex", flexDirection:"column", position:"relative", boxShadow: plan.highlight ? `0 4px 24px ${plan.color}25` : "none" }}>
                  {plan.badge && (
                    <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:plan.gradient, color:"#fff", fontSize:11, fontWeight:800, padding:"4px 14px", borderRadius:12, whiteSpace:"nowrap" }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ fontSize:18, fontWeight:800, color:text, marginBottom:8 }}>{plan.name}</div>
                  <div style={{ fontSize:40, fontWeight:900, color:plan.color, marginBottom:4 }}>
                    ${plan.priceUSD}
                  </div>
                  <div style={{ fontSize:12, color:muted, marginBottom:8 }}>{plan.priceLabel}</div>
                  <div style={{ fontSize:13, color:plan.color, fontWeight:700, marginBottom:20 }}>
                    {plan.credits.toLocaleString()} 크레딧
                  </div>
                  {plan.features.map((f,i)=>(
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:8, fontSize:13, color:isDark?"rgba(255,255,255,0.75)":text }}>
                      <span style={{ color:plan.color, flexShrink:0 }}>✓</span>{f}
                    </div>
                  ))}
                  <div style={{ marginTop:"auto", paddingTop:20 }}>
                    <button
                      onClick={()=>{ if (!user) { onLogin?.(); return; } if(!isActive) startPayment(id, user); }}
                      style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", cursor:isActive?"not-allowed":"pointer",
                        background: isActive ? (isDark?"rgba(255,255,255,0.08)":"#e5e5ea") : plan.gradient,
                        color: isActive ? muted : "#fff", fontSize:14, fontWeight:800 }}>
                      {!user ? "로그인 후 이용" : isActive ? "Active" : "Upgrade Plan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 단건구매 */}
      {tab === "oneoff" && (
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <div style={{ textAlign:"center", fontSize:14, color:muted, marginBottom:28 }}>
            구독 없이 크레딧만 구매하세요 · 유효기간 없음
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {CREDIT_PACKS.map(pack=>(
              <div key={pack.id} style={{ borderRadius:16, border:`1px solid ${bdr}`, background:cardBg, padding:"28px 20px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                <div style={{ fontSize:44, fontWeight:900, color:"#38bdf8" }}>${pack.priceUSD}</div>
                <div style={{ fontSize:14, color:muted }}>{pack.credits.toLocaleString()} 크레딧</div>
                <button
                  onClick={()=>{ if(!user){onLogin?.();return;} alert("준비 중입니다"); }}
                  style={{ marginTop:8, width:"100%", padding:"11px", borderRadius:9, border:"none", cursor:"pointer", background:"#3b82f6", color:"#fff", fontSize:14, fontWeight:800 }}>
                  구매하기
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 크레딧 사용 안내 */}
      <div style={{ maxWidth:700, margin:"48px auto 0", padding:"24px 28px", borderRadius:16, background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", border:`1px solid ${bdr}` }}>
        <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:16 }}>💡 크레딧 사용 기준</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            ["블로그/SNS 글 생성","10 크레딧"],
            ["카드뉴스 생성","10 크레딧"],
            ["상세페이지 슬라이드 1장","30 크레딧"],
            ["일일 로그인 적립","+ 3 크레딧"],
            ["게시글 작성 적립","+ 1 크레딧"],
            ["회원가입 무료 지급","+ 200 크레딧"],
          ].map(([label, val],i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:muted, padding:"8px 0", borderBottom:`1px solid ${bdr}` }}>
              <span>{label}</span>
              <span style={{ fontWeight:700, color: val.startsWith("+") ? "#4ade80" : text }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
