import { useState, useEffect } from "react";
import { changePoints, fetchUser, setLocalUser } from "./storage";

/* ══════════════════════════════════════════════════════════
   🍋 Lemon Squeezy 설정
   ① https://lemonsqueezy.com 가입
   ② Settings → API → Create API key
   ③ Settings → Store → Store ID 확인
   ④ Products에서 상품 3개 생성 후 Variant ID 복사
══════════════════════════════════════════════════════════ */
const LS_CONFIG = {
  apiKey:  import.meta.env.VITE_LS_API_KEY || "",  // Vercel 환경변수에서 로드
  storeId: "315475",
};

export const PLANS = {
  basic: {
    variantId: "1401989",
    name: "Basic",
    price: 9900,
    priceLabel: "₩9,900",
    points: 500,
    aiCount: 50,
    color: "#22c55e",
    gradient: "linear-gradient(135deg,#22c55e,#4ade80)",
    badge: null,
    highlight: false,
    features: ["500P 즉시 충전", "AI 생성 50회", "유효기간 없음", "게시글 적립 포함"],
  },
  pro: {
    variantId: "1401993",
    name: "Pro",
    price: 19900,
    priceLabel: "₩19,900",
    points: 1200,
    aiCount: 120,
    color: "#6366f1",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    badge: "🔥 추천",
    highlight: true,
    features: ["1,200P 즉시 충전", "AI 생성 120회", "유효기간 없음", "우선 고객 지원"],
  },
  premium: {
    variantId: "890780",
    name: "Premium",
    price: 29900,
    priceLabel: "₩29,900",
    points: 2500,
    aiCount: 250,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)",
    badge: "전문가용",
    highlight: false,
    features: ["2,500P 즉시 충전", "AI 생성 250회", "유효기간 없음", "전담 지원"],
  },
};

/* ══════════════════════════════════════════════════════════
   결제 시작
══════════════════════════════════════════════════════════ */
export function startPayment(planId, user) {
  const plan = PLANS[planId];
  if (!plan || !user) { alert("로그인 후 결제해주세요."); return; }

  // 결제 완료 후 돌아올 URL
  const successUrl = encodeURIComponent(
    `${window.location.origin}/?payment=success&plan=${planId}&uid=${user.uid}&points=${plan.points}`
  );

  // Lemon Squeezy 직접 결제 링크 (API 키 불필요)
  // 이메일 자동 입력 + 성공 후 리다이렉트
  const checkoutUrl = `https://npercontentslab.lemonsqueezy.com/checkout/buy/${plan.variantId}`
    + `?checkout[email]=${encodeURIComponent(user.email || "")}`
    + `&checkout[custom][uid]=${user.uid}`
    + `&checkout[custom][plan]=${planId}`
    + `&checkout[custom][points]=${plan.points}`
    + `&redirect_url=${successUrl}`;

  window.location.href = checkoutUrl;
}

/* ══════════════════════════════════════════════════════════
   결제 완료 처리 훅
══════════════════════════════════════════════════════════ */
export function usePaymentCallback(user, setUserState) {
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    const planId = params.get("plan");
    const uid    = params.get("uid");
    const points = parseInt(params.get("points") || "0");

    if (!status) return;

    // URL 즉시 제거 (중복 방지)
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);

    if (status === "cancel") { setPaymentResult({ status: "cancel" }); return; }

    if (status === "success" && uid && points > 0) {
      const lastKey = `nper_last_pay_${uid}`;
      const now = Date.now();
      if (now - parseInt(localStorage.getItem(lastKey)||"0") < 30000) {
        setPaymentResult({ status: "already" }); return;
      }
      localStorage.setItem(lastKey, String(now));

      (async () => {
        try {
          const newPts  = await changePoints(uid, points, `포인트 충전 (${PLANS[planId]?.name || planId})`);
          const updated = await fetchUser(uid);
          if (updated) { setLocalUser(updated); if (setUserState) setUserState(updated); }
          setPaymentResult({ status: "success", planId, points, newPts });
        } catch (e) {
          console.error("포인트 적립 오류:", e);
          setPaymentResult({ status: "error" });
        }
      })();
    }
  }, []);

  return [paymentResult, setPaymentResult];
}

/* ══════════════════════════════════════════════════════════
   결제 완료 모달
══════════════════════════════════════════════════════════ */
export function PaymentResultModal({ result, onClose, onNavigateAi, C }) {
  if (!result) return null;
  const isDark = !C?.inputBg || C.inputBg.includes("0.06");
  const bg    = isDark ? "rgba(18,16,58,0.98)" : "#fff";
  const text  = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";

  if (result.status === "cancel") return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(8px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:bg, borderRadius:20, padding:"36px 28px", maxWidth:360, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>😢</div>
        <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:8 }}>결제가 취소됐어요</div>
        <div style={{ fontSize:13, color:muted, marginBottom:24, lineHeight:1.7 }}>언제든 다시 충전하실 수 있어요!</div>
        <button onClick={onClose} style={{ padding:"11px 32px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>확인</button>
      </div>
    </div>
  );

  if (result.status === "success") {
    const plan = PLANS[result.planId];
    return (
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(8px)" }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:bg, border:"1px solid rgba(124,106,255,0.2)", borderRadius:24, padding:"40px 32px", maxWidth:400, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
          <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>충전 완료!</div>
          <div style={{ fontSize:13, color:muted, marginBottom:22 }}>{plan?.name} 플랜</div>
          <div style={{ background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:16, padding:"20px", marginBottom:24 }}>
            <div style={{ fontSize:40, fontWeight:900, color:"#a5b4fc", marginBottom:4 }}>+{result.points?.toLocaleString()}P</div>
            <div style={{ fontSize:12, color:muted }}>포인트 즉시 지급 완료</div>
            {result.newPts !== undefined && (
              <div style={{ fontSize:14, color:text, fontWeight:700, marginTop:8 }}>
                현재 잔액: <span style={{ color:"#a5b4fc" }}>{result.newPts?.toLocaleString()}P</span>
              </div>
            )}
          </div>
          <button onClick={()=>{ onClose(); if(onNavigateAi) onNavigateAi(); }}
            style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:"0 8px 24px rgba(124,106,255,0.35)", marginBottom:10 }}>
            AI 생성기 바로 사용하기 →
          </button>
          <button onClick={onClose}
            style={{ width:"100%", padding:"10px", borderRadius:10, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e3f5"}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>
            닫기
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════════════════
   포인트 부족 팝업
══════════════════════════════════════════════════════════ */
export function PointsLowModal({ user, onClose, onPay, C }) {
  const isDark = !C?.inputBg || C.inputBg.includes("0.06");
  const bg    = isDark ? "rgba(18,16,58,0.98)" : "#fff";
  const text  = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#6c757d";
  const bdr   = isDark ? "rgba(255,255,255,0.1)" : "#e5e3f5";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(8px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:bg, border:"1px solid rgba(124,106,255,0.2)", borderRadius:22, padding:"32px 24px", maxWidth:460, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>💎</div>
          <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:6 }}>포인트가 부족해요</div>
          <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>
            현재 잔액 <b style={{ color:"#a5b4fc" }}>{(user?.points||0).toLocaleString()}P</b> · AI 생성 1회 <b style={{ color:"#f59e0b" }}>10P</b> 필요
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
          {Object.entries(PLANS).map(([id, plan]) => (
            <button key={id} onClick={()=>onPay(id)}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 16px", borderRadius:12, cursor:"pointer", transition:"all 0.15s",
                border: plan.highlight ? "2px solid #6366f1" : `1px solid ${bdr}`,
                background: plan.highlight ? (isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.05)") : "transparent",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="#6366f1"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=plan.highlight?"#6366f1":bdr; }}>
              <div style={{ textAlign:"left" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:text }}>{plan.name}</span>
                  {plan.badge && <span style={{ fontSize:10, background:plan.gradient, color:"#fff", padding:"2px 8px", borderRadius:8, fontWeight:700 }}>{plan.badge}</span>}
                </div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>AI {plan.aiCount}회 · {plan.points.toLocaleString()}P</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:900, color:plan.color }}>{plan.priceLabel}</div>
                <div style={{ fontSize:10, color:muted, marginTop:2 }}>💳 해외카드 가능</div>
              </div>
            </button>
          ))}
        </div>

        <button onClick={onClose}
          style={{ width:"100%", padding:"10px", borderRadius:10, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>
          닫기
        </button>
      </div>
    </div>
  );
}
