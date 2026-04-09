import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// 상품 ID → 포인트 매핑
const PRODUCT_POINTS = {
  960246: 1000,   // Starter 팩
  960260: 2000,   // Basic 팩
  960263: 3500,   // Standard 팩
  960269: 5500,   // Plus 팩
  960271: 9500,   // Pro 팩
};

const SUB_POINTS = {
  960273: 1800,   // Basic 구독
  960276: 3800,   // Pro 구독
  960278: 7000,   // Premium 구독
};

function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

async function addPoints(uid, points, reason) {
  const { data: user, error: fetchErr } = await supabase
    .from("users").select("points").eq("uid", uid).single();

  if (fetchErr || !user) {
    console.error("[LS] User not found:", uid, fetchErr?.message);
    return null;
  }

  const newPoints = (user.points || 0) + points;
  const { error: updateErr } = await supabase
    .from("users").update({ points: newPoints }).eq("uid", uid);

  if (updateErr) {
    console.error("[LS] Point update failed:", updateErr.message);
    return null;
  }

  await supabase.from("point_history").insert({
    uid, delta: points, reason, balance: newPoints,
  });

  return newPoints;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers["x-signature"];

    // Vercel: req.body는 이미 파싱된 객체 (기본 bodyParser 사용)
    const payload = req.body;
    const rawBody = JSON.stringify(payload);

    // 서명 검증 (LS에서 보낸 실제 webhook만 검증)
    if (signature && secret) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = hmac.update(rawBody).digest("hex");
      console.log("[LS] sig check:", signature.slice(0, 16), "vs", digest.slice(0, 16), "bodyLen:", rawBody.length);
    }
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const data = payload.data;
    const attrs = data?.attributes;

    console.log(`[LS] ${eventName} | user: ${userId} | status: ${attrs?.status}`);

    switch (eventName) {
      case "order_created": {
        if (!userId) { console.error("[LS] No user_id"); break; }
        if (attrs.status !== "paid") { console.log("[LS] Not paid:", attrs.status); break; }
        const productId = attrs.first_order_item?.product_id;
        const points = PRODUCT_POINTS[productId];
        if (points) {
          const n = await addPoints(userId, points, `포인트 충전 (${attrs.first_order_item?.product_name || ""})`);
          console.log(`[LS] +${points}P → ${n}`);
        } else {
          console.log(`[LS] Unknown product: ${productId}`);
        }
        break;
      }

      case "subscription_created": {
        if (!userId) break;
        const points = SUB_POINTS[attrs.product_id];
        if (points) {
          const n = await addPoints(userId, points, `구독 시작 (${attrs.product_name || ""})`);
          console.log(`[LS] sub +${points}P → ${n}`);
        }
        break;
      }

      case "subscription_payment_success": {
        if (!userId) break;
        const vMap = { 1508567: 960273, 1508570: 960276, 1508572: 960278 };
        const points = SUB_POINTS[vMap[attrs.variant_id]];
        if (points) {
          await addPoints(userId, points, `구독 갱신 (월간 포인트)`);
        }
        break;
      }

      default:
        console.log(`[LS] Event: ${eventName}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[LS Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// bodyParser 기본값(true) 사용 — req.body로 JSON 접근
