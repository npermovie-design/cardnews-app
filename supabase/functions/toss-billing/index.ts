import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// [보안 수정] 비밀키를 환경변수에서 읽음 — Supabase Dashboard > Edge Functions > Secrets에 설정
const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY");
const TOSS_API = "https://api.tosspayments.com/v1";

// [보안 수정] 서버 사이드 금액 → 포인트 매핑 (클라이언트가 포인트를 지정하지 못하게)
const PLAN_POINTS: Record<string, { amount: number; points: number }> = {
  starter:        { amount:  5900, points:  600 },
  basic:          { amount: 11000, points: 1300 },
  standard:       { amount: 19000, points: 2400 },
  plus:           { amount: 29000, points: 3800 },
  pro:            { amount: 49000, points: 6500 },
  basic_monthly:  { amount:  9900, points: 1200 },
  pro_monthly:    { amount: 24900, points: 2800 },
  premium_monthly:{ amount: 44900, points: 5500 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const tossAuth = () => ({
  "Authorization": "Basic " + btoa(TOSS_SECRET_KEY + ":"),
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!TOSS_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "TOSS_SECRET_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const { action, ...body } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 결제 승인 ────────────────────────────────────────────
    if (action === "confirm_payment") {
      const { paymentKey, orderId, amount, uid, planId } = body;

      // [보안 수정] 서버에서 planId로 금액/포인트 검증
      const plan = PLAN_POINTS[planId];
      if (!plan) {
        return new Response(JSON.stringify({ error: "Invalid planId" }), { status: 400, headers: corsHeaders });
      }
      if (plan.amount !== amount) {
        return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400, headers: corsHeaders });
      }

      // Toss 결제 승인
      const res = await fetch(`${TOSS_API}/payments/confirm`, {
        method: "POST",
        headers: tossAuth(),
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      const data = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 400, headers: corsHeaders });

      // [보안 수정] 멱등성: payment_history에 paymentKey UNIQUE로 중복 방지
      const { error: dupErr } = await supabase.from("payment_history").insert({
        uid, order_id: orderId, payment_key: paymentKey, amount, points: plan.points, plan_id: planId,
        status: "success", created_at: new Date().toISOString(),
      });
      if (dupErr?.code === "23505") {
        // 이미 처리된 결제
        return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // [보안 수정] 원자적 포인트 적립 (RPC 사용)
      const { data: newPoints, error: rpcErr } = await supabase.rpc("change_points_atomic", {
        p_uid: uid, p_delta: plan.points, p_reason: `포인트 충전 (${planId})`,
      });

      if (rpcErr) {
        console.error("RPC error:", rpcErr.message);
        return new Response(JSON.stringify({ error: "Point update failed" }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, newPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
