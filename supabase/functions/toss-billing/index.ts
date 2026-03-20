import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOSS_SECRET_KEY = "test_sk_kYG57Eba3G4YAkGPzRkjVpWDOxmA";
const TOSS_API = "https://api.tosspayments.com/v1";

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

  try {
    const { action, ...body } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 결제 승인 ────────────────────────────────────────────
    if (action === "confirm_payment") {
      const { paymentKey, orderId, amount, uid, points, planId } = body;

      const res = await fetch(`${TOSS_API}/payments/confirm`, {
        method: "POST",
        headers: tossAuth(),
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      const data = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 400, headers: corsHeaders });

      const { data: user } = await supabase.from("users").select("points").eq("uid", uid).single();
      const newPoints = (user?.points || 0) + points;
      await supabase.from("users").update({ points: newPoints }).eq("uid", uid);

      await supabase.from("payment_history").insert({
        uid, order_id: orderId, amount, points, plan_id: planId,
        status: "success", created_at: new Date().toISOString(),
      });

      await supabase.from("point_history").insert({
        uid, delta: points, reason: `포인트 충전 (${planId})`,
        balance: newPoints, created_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, newPoints }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
