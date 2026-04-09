import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

const PRODUCT_POINTS = {
  960246: 1000, 960260: 2000, 960263: 3500, 960269: 5500, 960271: 9500,
};
const SUB_POINTS = {
  960273: 1800, 960276: 3800, 960278: 7000,
};

async function addPoints(uid, points, reason) {
  const { data: user, error: err1 } = await supabase
    .from("users").select("points").eq("uid", uid).single();
  if (err1 || !user) { console.error("[LS] User not found:", uid); return null; }

  const newPoints = (user.points || 0) + points;
  const { error: err2 } = await supabase
    .from("users").update({ points: newPoints }).eq("uid", uid);
  if (err2) { console.error("[LS] Update fail:", err2.message); return null; }

  await supabase.from("point_history").insert({ uid, delta: points, reason, balance: newPoints });
  return newPoints;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // URL 시크릿 토큰 검증 + LS 시그니처 헤더 존재 확인
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const lsSig = req.headers["x-signature"];

    if (token !== secret || !lsSig) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body;
    const eventName = payload.meta?.event_name;
    const userId = payload.meta?.custom_data?.user_id;
    const data = payload.data;
    const attrs = data?.attributes;

    console.log(`[LS] ${eventName} | user:${userId} | status:${attrs?.status}`);

    switch (eventName) {
      case "order_created": {
        if (!userId || attrs.status !== "paid") break;
        const pts = PRODUCT_POINTS[attrs.first_order_item?.product_id];
        if (pts) {
          const n = await addPoints(userId, pts, `포인트 충전 (${attrs.first_order_item?.product_name || ""})`);
          console.log(`[LS] +${pts}P → ${n}`);
        }
        break;
      }
      case "subscription_created": {
        if (!userId) break;
        const pts = SUB_POINTS[attrs.product_id];
        if (pts) await addPoints(userId, pts, `구독 시작 (${attrs.product_name || ""})`);
        break;
      }
      case "subscription_payment_success": {
        if (!userId) break;
        const vMap = { 1508567: 960273, 1508570: 960276, 1508572: 960278 };
        const pts = SUB_POINTS[vMap[attrs.variant_id]];
        if (pts) await addPoints(userId, pts, "구독 갱신 (월간 포인트)");
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[LS Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
}
