import { useEffect, useState } from "react";
import { supabase } from "./storage";

const TOSS_SECRET_KEY = "test_sk_kYG57Eba3G4YAkGPzRkjVpWDOxmA";

/* ── 결제 완료 페이지 ── */
export function PaymentSuccessPage({ C, navigate }) {
  const [status, setStatus] = useState("processing"); // processing | success | error
  const [points, setPoints] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const confirm = async () => {
      try {
        const url = new URL(window.location.href);
        const paymentKey = url.searchParams.get("paymentKey");
        const orderId    = url.searchParams.get("orderId");
        const amount     = url.searchParams.get("amount");

        if (!paymentKey || !orderId || !amount) throw new Error("결제 정보가 없어요.");

        // 저장된 주문 정보 가져오기
        const orderInfo = JSON.parse(localStorage.getItem("toss_order") || "{}");
        if (orderInfo.orderId !== orderId) throw new Error("주문 정보가 일치하지 않아요.");

        // 토스 결제 승인 API 호출 (Edge Function 통해서)
        const res = await fetch("https://ckzjnpzadeovrasucjmu.supabase.co/functions/v1/toss-billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm_payment",
            paymentKey,
            orderId,
            amount: Number(amount),
            uid: orderInfo.uid,
            points: orderInfo.points,
            planId: orderInfo.planId,
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error?.message || "결제 승인 실패");

        localStorage.removeItem("toss_order");
        setPoints(orderInfo.points);
        setStatus("success");

        // 로컬 유저 포인트 업데이트
        try {
          const u = JSON.parse(localStorage.getItem("nper_user") || "{}");
          localStorage.setItem("nper_user", JSON.stringify({ ...u, points: data.newPoints }));
        } catch {}

        // 3초 후 홈으로
        setTimeout(() => navigate("home"), 3000);

      } catch(e) {
        setErrorMsg(e.message);
        setStatus("error");
      }
    };
    confirm();
  }, []);

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {status === "processing" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>결제 확인 중...</div>
            <div style={{ fontSize: 14, color: C.muted }}>잠시만 기다려주세요</div>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8 }}>결제 완료!</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#3F72AF", marginBottom: 12 }}>+{points.toLocaleString()} 크레딧</div>
            <div style={{ fontSize: 14, color: C.muted }}>3초 후 홈으로 이동해요</div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>결제 실패</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{errorMsg}</div>
            <button onClick={() => navigate("pricing")} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3F72AF,#112D4E)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              다시 시도하기
            </button>
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>결제가 완료되지 않았어요</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{message}</div>
        <button onClick={() => navigate("pricing")} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3F72AF,#112D4E)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          다시 시도하기
        </button>
      </div>
    </div>
  );
}
