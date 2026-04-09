import { useEffect, useState } from "react";
import { supabase } from "./storage";

/* ── 결제 완료 페이지 (Lemon Squeezy Checkout 후 리다이렉트) ── */
export function PaymentSuccessPage({ C, navigate }) {
  const [status, setStatus] = useState("processing");
  const [points, setPoints] = useState(0);

  useEffect(() => {
    // Webhook이 포인트를 처리하므로 잠시 대기 후 최신 포인트 조회
    const check = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("nper_user") || "{}");
        if (!stored.uid) { setStatus("success"); setTimeout(() => navigate("home"), 3000); return; }

        // 1~2초 대기 (webhook 처리 시간)
        await new Promise(r => setTimeout(r, 2000));

        const { data } = await supabase
          .from("users").select("points").eq("uid", stored.uid).single();

        if (data) {
          const diff = (data.points || 0) - (stored.points || 0);
          if (diff > 0) setPoints(diff);
          localStorage.setItem("nper_user", JSON.stringify({ ...stored, points: data.points }));
        }

        setStatus("success");
        setTimeout(() => navigate("home"), 3000);
      } catch {
        setStatus("success");
        setTimeout(() => navigate("home"), 3000);
      }
    };
    check();
  }, []);

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {status === "processing" && (
          <>
            <div style={{ width:48, height:48, borderRadius:"50%", border:"4px solid rgba(124,106,255,0.2)", borderTopColor:"#7c6aff", margin:"0 auto 16px", animation:"spin 1s linear infinite" }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>결제 확인 중...</div>
            <div style={{ fontSize: 14, color: C.muted }}>잠시만 기다려주세요</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8 }}>결제 완료!</div>
            {points > 0 && <div style={{ fontSize: 28, fontWeight: 900, color: "#7c6aff", marginBottom: 12 }}>+{points.toLocaleString()} P</div>}
            <div style={{ fontSize: 14, color: C.muted }}>3초 후 홈으로 이동합니다</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 결제 실패 페이지 ── */
export function PaymentFailPage({ C, navigate }) {
  const url = new URL(window.location.href);
  const message = url.searchParams.get("message") || "결제가 취소됐어요.";

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(239,68,68,0.1)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>결제가 완료되지 않았어요</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{message}</div>
        <button onClick={() => navigate("pricing")} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          다시 시도하기
        </button>
      </div>
    </div>
  );
}
