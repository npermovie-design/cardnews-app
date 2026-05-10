import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { supabase } from "./storage";

const GRAD = "#3b82f6";

const PLANS = [
  {
    id: "free", name: "Free",
    monthlyPrice: 0, yearlyPrice: 0,
    highlight: false, badge: null,
    limits: { write: 5, video: 3, naver: 0 },
    features: ["관리자 체험권 대상자 사용 가능", "커뮤니티 이용", "키워드 분석"],
    btnLabel: "관리자 부여 전용",
    free: true,
  },
  {
    id: "basic", name: "Basic",
    monthlyPrice: 9.9, yearlyPrice: 99,
    highlight: false, badge: null,
    limits: { write: 30, video: 10, naver: 0 },
    features: ["콘텐츠 생성 월 30회", "영상 생성 월 10회", "영상 10회 초과 시 Pro 권장", "자동발행 체험", "카페 발행 제한", "SNS 플랫폼 지원", "커뮤니티 이용", "키워드 분석"],
    btnLabel: "시작하기",
    lsId: "8dca976c-3064-4d76-af4b-8743a10e9f9f",
    lsIdYearly: "6b3922c9-04e1-40f0-b295-75870a9e0b3f",
  },
  {
    id: "pro", name: "Pro",
    monthlyPrice: 19.9, yearlyPrice: 199,
    highlight: true, badge: "추천",
    limits: { write: 200, video: 99999, naver: 3 },
    features: ["콘텐츠 생성 월 200회", "영상 생성 제한 없음", "영상 편집 추천 플랜", "자동발행 하루 3회", "카페 발행 제한", "SNS 플랫폼 지원", "커뮤니티 이용", "키워드 분석"],
    btnLabel: "시작하기",
    lsId: "81968d65-1482-4dd8-b3a2-88540bdba780",
    lsIdYearly: "ab2d967d-43bb-40a8-96c0-9fcfd6d9c62a",
  },
  {
    id: "business", name: "Business",
    monthlyPrice: 39.9, yearlyPrice: 399,
    highlight: false, badge: "대량 생산",
    limits: { write: 700, video: 99999, naver: 10 },
    features: ["콘텐츠 생성 월 700회", "영상 생성 제한 없음", "대량 운영용 사용량", "자동발행 하루 10회", "카페 발행 가능", "계정 3개", "SNS 플랫폼 지원", "커뮤니티 이용", "키워드 분석"],
    btnLabel: "시작하기",
    lsId: "",
    lsIdYearly: "",
  },
];

const LIMIT_LABELS = [
  { key: "write", label: "콘텐츠 생성" },
];

const COMPARE_ROWS = [
  { label: "콘텐츠 생성 (글+디자인)", vals: ["5회/월", "30회/월", "200회/월", "700회/월"], types: ["num","num","highlight","highlight"] },
  { label: "영상 생성", vals: ["3회/월", "10회/월", "제한 없음", "제한 없음"], types: ["num","num","highlight","highlight"] },
  { label: "자동발행", vals: ["-", "체험", "일 3회", "일 10회"], types: ["no","num","num","highlight"] },
  { label: "카페 발행", vals: ["-", "-", "-", "가능"], types: ["no","no","no","highlight"] },
  { label: "SNS 다중 발행", vals: ["✓", "✓", "✓", "✓"], types: ["yes","yes","yes","yes"] },
  { label: "키워드 분석", vals: ["✓", "✓", "✓", "✓"], types: ["yes","yes","yes","yes"] },
  { label: "커뮤니티", vals: ["✓", "✓", "✓", "✓"], types: ["yes","yes","yes","yes"] },
];

const COMMON_FEATURES = [
  "SNS 플랫폼 지원 (네이버 블로그, 티스토리, 인스타, 스레드)",
  "블로그 자동 글쓰기",
  "키워드 트렌드 분석",
  "콘텐츠 라이브러리 (생성 글 보관)",
  "커뮤니티 이용",
];

const FAQ_LIST = [
  { q: "결제 수단은 무엇인가요?", a: "Visa, Mastercard, PayPal 등 해외 결제가 가능합니다. LemonSqueezy를 통해 안전하게 처리됩니다." },
  { q: "플랜 변경이나 취소는 어떻게 하나요?", a: "마이페이지에서 언제든 변경하거나 취소할 수 있습니다. 취소 시 현재 결제 주기가 끝날 때까지 이용 가능합니다." },
  { q: "횟수가 남으면 다음 달로 이월되나요?", a: "미사용 횟수는 다음 달로 이월되지 않습니다. 매월 결제일에 초기화됩니다." },
  { q: "체험권은 어떻게 받을 수 있나요?", a: "체험권은 관리자가 대상 회원에게 직접 부여합니다. 공개 페이지에서 사용자가 직접 체험을 시작하는 방식은 제공하지 않습니다." },
  { q: "NaverBot 자동발행이란?", a: "설정한 키워드를 기반으로 매일 자동으로 네이버 블로그에 글을 작성하고 발행하는 기능입니다. Pro 플랜 이상에서 사용 가능합니다." },
  { q: "환불 정책은 어떻게 되나요?", a: "구매 후 7일 이내 미사용 상태에서 요청 시 전액 환불이 가능합니다. 고객센터 문의하기를 통해 요청해주세요." },
  { q: "연간 결제 시 혜택이 있나요?", a: "연간 결제 시 약 17% 할인된 가격으로 이용하실 수 있습니다. 월간 대비 2개월분을 절약합니다." },
];

export function PricingPage({ navigate, C, user, onLogin }) {
  const { lang } = useI18n();
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const isDark = C?.border?.includes("255");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const lsLoaded = useRef(false);

  useEffect(() => {
    if (lsLoaded.current) return;
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => {
      lsLoaded.current = true;
      window.createLemonSqueezy?.();
      try {
        window.LemonSqueezy?.Setup?.({
          eventHandler: (event) => {
            if (event?.event === "Checkout.Success") {
              const orderAttrs = event?.data?.order?.data?.attributes;
              const item = orderAttrs?.first_order_item;
              const planName = item?.product_name || "";
              const receiptUrl = orderAttrs?.urls?.receipt || null;
              try { window.LemonSqueezy?.Url?.Close?.(); } catch(e) {}
              handleCheckoutSuccess(planName, receiptUrl);
            }
          },
        });
      } catch(e) {}
    };
    document.head.appendChild(script);
  }, []);

  const handleCheckoutSuccess = async (planName, receiptUrl) => {
    if (!user?.uid) return;
    const beforePts = user.points || 0;
    setSuccessModal({ planName, receiptUrl, done: false, confirmed: false });
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const { data } = await supabase.from("users").select("points,monthly_used").eq("uid", user.uid).single();
        if (data && data.points !== beforePts) {
          setSuccessModal(s => s ? { ...s, done: true, confirmed: true } : null);
          return;
        }
        // 구독의 경우 monthly_used가 리셋되었는지 확인
        const { data: subData } = await supabase.from("subscriptions").select("product_name").eq("uid", user.uid).in("status", ["active","on_trial"]).limit(1);
        if (subData?.length) {
          setSuccessModal(s => s ? { ...s, done: true, confirmed: true } : null);
          return;
        }
      } catch(e) {}
    }
    // 30초 경과해도 미확인 → 안내 메시지와 함께 완료 처리
    setSuccessModal(s => s ? { ...s, done: true, confirmed: false } : null);
  };

  const openCheckout = (lsId) => {
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

  const handleBuy = (plan) => {
    if (!user) { onLogin?.(); return; }
    if (plan.free) return;
    const lsId = billing === "yearly" ? plan.lsIdYearly : plan.lsId;
    if (!lsId) { showToast("준비 중입니다. 곧 오픈됩니다!"); return; }
    openCheckout(lsId);
  };

  const fmtLimit = (v) => `${v}회/월`;

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 20px 80px" }}>

      {/* 결제 성공 모달 */}
      {successModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSuccessModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: isDark ? "#181836" : "#fff", borderRadius: 20, padding: "40px 32px 28px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: GRAD, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#fff", fontWeight: 900 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>결제가 완료되었어요!</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
              {successModal.planName && <><strong style={{ color: C.text }}>{successModal.planName}</strong> </>}구매 감사합니다
            </div>
            {!successModal.done && (
              <div style={{ marginBottom: 20, fontSize: 12, color: C.muted }}>플랜 적용 중...</div>
            )}
            {successModal.done && !successModal.confirmed && (
              <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb", border: "1px solid rgba(245,158,11,0.3)", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                결제는 완료되었지만 시스템 반영에 시간이 걸리고 있습니다. 1~2분 후 새로고침하면 적용됩니다. 문제가 지속되면 고객센터로 문의해주세요.
              </div>
            )}
            <button onClick={() => { setSuccessModal(null); navigate("ai"); }}
              style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", background: GRAD, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", marginBottom: 8 }}>
              AI 도구로 이동
            </button>
            {successModal.receiptUrl && (
              <a href={successModal.receiptUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", padding: "11px", borderRadius: 11, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 600, textDecoration: "none", marginBottom: 8 }}>
                영수증 보기
              </a>
            )}
            <button onClick={() => setSuccessModal(null)}
              style={{ padding: "9px", border: "none", background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: isDark ? "#1e1c3a" : "#fff", border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 14, padding: "14px 24px", fontSize: 14, fontWeight: 700,
          color: C.text, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", background: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff", border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#bfdbfe"}`, borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 700, marginBottom: 14, color: isDark ? "#93bbfc" : "#3b82f6" }}>Pricing</div>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12, lineHeight: 1.2 }}>
          딱 필요한 만큼만, 심플하게
        </h2>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
          비즈니스 규모에 맞는 플랜을 선택하세요. 연간 결제 시 17% 할인됩니다.
        </p>
      </div>

      {/* 월간/연간 토글 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-flex", gap: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f5", borderRadius: 12, padding: 4 }}>
          {[["monthly", "월간"], ["yearly", "연간 (17% 할인)"]].map(([id, label]) => (
            <button key={id} onClick={() => setBilling(id)}
              style={{ padding: "9px 24px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: billing === id ? (isDark ? "rgba(0,0,0,0.06)" : "#fff") : "transparent",
                color: billing === id ? (isDark ? "#c4b5fd" : "#3b82f6") : C.muted,
                boxShadow: billing === id ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 플랜 카드 — 다크 스타일 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 16, marginBottom: 56 }}>
        {PLANS.map(plan => {
          const isYearly = billing === "yearly";
          const price = isYearly ? (plan.yearlyPrice / 12) : plan.monthlyPrice;
          const isHighlight = plan.highlight;
          return (
            <div key={plan.id} style={{
              position: "relative",
              background: isHighlight ? "#1A1A2E" : C.card,
              border: isHighlight ? "1px solid rgba(59,130,246,0.3)" : "1px solid " + C.border,
              borderRadius: 20, padding: "28px 20px 24px",
              display: "flex", flexDirection: "column",
              boxShadow: isHighlight ? "0 0 60px rgba(59,130,246,0.12)" : "none",
              transition: "transform 0.18s, box-shadow 0.18s",
              color: isHighlight ? "#fff" : C.text,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; if (isHighlight) e.currentTarget.style.boxShadow = "0 0 80px rgba(59,130,246,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; if (isHighlight) e.currentTarget.style.boxShadow = "0 0 60px rgba(59,130,246,0.12)"; }}>

              {plan.badge && (
                <div style={{
                  position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                  background: isHighlight ? GRAD : "#1A1A2E",
                  color: "#fff",
                  fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap",
                  border: isHighlight ? "none" : "1px solid " + C.border,
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
              {plan.free ? (
                <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 20 }}>무료</div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900 }}>${price.toFixed(2)}</span>
                  <span style={{ fontSize: 13, color: isHighlight ? "rgba(255,255,255,0.5)" : C.muted, marginLeft: 4 }}>/월</span>
                  {isYearly && (
                    <div style={{ fontSize: 11, color: isHighlight ? "rgba(255,255,255,0.4)" : C.muted, marginTop: 2 }}>연 ${plan.yearlyPrice} 결제</div>
                  )}
                </div>
              )}

              {/* CTA 버튼 — 상단 배치 */}
              <button
                onClick={() => plan.free ? null : handleBuy(plan)}
                disabled={plan.free}
                style={{
                  padding: "14px", borderRadius: 14, border: "none", cursor: plan.free ? "default" : "pointer",
                  fontSize: 15, fontWeight: 700, width: "100%", minHeight: 48, marginBottom: 24,
                  background: isHighlight ? GRAD : "#1A1A2E",
                  color: "#fff",
                  opacity: plan.free ? 0.55 : 1,
                  transition: "opacity 0.15s",
                  boxShadow: isHighlight ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                }}>
                {plan.free ? plan.btnLabel : (!user ? "로그인 후 시작" : plan.btnLabel)}
              </button>

              {/* 횟수 표시 */}
              <div style={{ marginBottom: 16 }}>
                {LIMIT_LABELS.map(({ key, label }) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${isHighlight ? "rgba(255,255,255,0.08)" : C.border}` }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: isHighlight ? "rgba(255,255,255,0.6)" : C.muted }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{fmtLimit(plan.limits[key])}</span>
                  </div>
                ))}
              </div>

              {/* 기능 리스트 */}
              <div style={{ flex: 1 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isHighlight ? "rgba(255,255,255,0.4)" : "#22c55e"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontSize: 13, color: isHighlight ? "rgba(255,255,255,0.7)" : C.muted, lineHeight:1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 플랜 비교 테이블 */}
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 24px", marginBottom: 40, overflowX: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{ display: "inline-block", background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: isDark ? "#c4b5fd" : "#3b82f6", fontWeight: 700, marginBottom: 10 }}>Compare</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 6, textAlign: "center" }}>플랜 상세 비교</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, textAlign: "center" }}>내게 맞는 플랜을 찾아보세요</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "14px 12px", fontSize: 13, fontWeight: 700, color: C.muted, borderBottom: "2px solid " + C.border, width: "28%" }}>기능</th>
              {[
                { name: "Free", color: C.muted },
                { name: "Basic", color: isDark ? "#c4b5fd" : "#3b82f6" },
                { name: "Pro", color: "#3b82f6" },
                { name: "Business", color: isDark ? "#c4b5fd" : "#3b82f6" },
              ].map(plan => (
                <th key={plan.name} style={{ textAlign: "center", padding: "14px 8px", fontSize: 13, fontWeight: 800, color: plan.color, borderBottom: "2px solid " + C.border, width: "18%", position: "relative" }}>
                  {plan.name}
                  {plan.name === "Pro" && <div style={{ position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, background: GRAD, color: "#fff", padding: "1px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>추천</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)") : "transparent" }}>
                <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 600, color: C.text, borderBottom: "1px solid " + C.border }}>{row.label}</td>
                {row.vals.map((v, j) => {
                  const type = row.types[j];
                  let content, color;
                  if (type === "yes") { content = "✓"; color = "#22c55e"; }
                  else if (type === "no") { content = v; color = isDark ? "rgba(255,255,255,0.2)" : "#bbb"; }
                  else if (type === "num") { content = v; color = j === 2 ? "#3b82f6" : C.text; }
                  else if (type === "highlight") { content = v; color = "#3b82f6"; }
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

      {/* 어떤 플랜이 나에게 맞을까? */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 16, textAlign: "center" }}>어떤 플랜이 나에게 맞을까?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 14 }}>
          {[
            { label: "체험권을 받은 회원", plan: "Free", desc: "관리자가 부여한 체험권으로 기능을 확인할 수 있습니다.", color: C.muted },
            { label: "개인 블로거 / 크리에이터", plan: "Basic", desc: "매일 1~2개씩 꾸준히 콘텐츠를 만들고 싶은 분에게 딱 맞습니다.", color: isDark ? "#c4b5fd" : "#3b82f6" },
            { label: "마케터 / 소상공인", plan: "Pro", desc: "대량 콘텐츠 + NaverBot 자동발행으로 마케팅을 자동화하세요.", color: "#3b82f6", badge: "추천" },
            { label: "에이전시 / 기업", plan: "Business", desc: "월 700회 콘텐츠 생성과 영상 제한 없음으로 팀 전체 콘텐츠를 관리하세요.", color: isDark ? "#c4b5fd" : "#3b82f6" },
          ].map((seg, i) => (
            <div key={i} style={{ position: "relative", background: C.card, border: seg.badge ? "2px solid #3b82f6" : "1px solid " + C.border, borderRadius: 16, padding: "24px 20px", textAlign: "center", boxShadow: seg.badge ? "0 0 20px rgba(59,130,246,0.12)" : C.shadow }}>
              {seg.badge && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GRAD, color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>{seg.badge}</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{seg.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: seg.color, marginBottom: 8 }}>{seg.plan}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{seg.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 모든 플랜 공통 기능 */}
      <div style={{ background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "24px 28px", marginBottom: 40 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16, textAlign: "center" }}>모든 플랜 공통 기능</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: "8px 24px" }}>
          {COMMON_FEATURES.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
              <span style={{ color: "#3b82f6", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 20, textAlign: "center" }}>자주 묻는 질문</div>
        {FAQ_LIST.map((item, i) => (
          <div key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "16px 20px", marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Q. {item.q}</div>
              <span style={{ fontSize: 16, color: C.muted, transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none", flexShrink: 0, marginLeft: 12 }}>▾</span>
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
