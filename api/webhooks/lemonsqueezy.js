import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY
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
  // 포인트 추가
  const { data: user } = await supabase
    .from("users").select("points").eq("uid", uid).single();
  if (!user) return null;

  const newPoints = (user.points || 0) + points;
  await supabase.from("users").update({ points: newPoints }).eq("uid", uid);

  // 히스토리 기록
  await supabase.from("point_history").insert({
    uid,
    delta: points,
    reason,
    balance: newPoints,
  });

  return newPoints;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers["x-signature"];

  // raw body
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const eventName = payload.meta?.event_name;
  const customData = payload.meta?.custom_data || {};
  const userId = customData.user_id;
  const data = payload.data;
  const attrs = data?.attributes;

  console.log(`[LS Webhook] ${eventName} | user: ${userId}`);

  try {
    switch (eventName) {
      // ═══ 일회성 결제 (크레딧 충전) ═══
      case "order_created": {
        if (!userId || attrs.status !== "paid") break;
        const productId = attrs.first_order_item?.product_id;
        const points = PRODUCT_POINTS[productId];
        if (points) {
          await addPoints(userId, points, `포인트 충전 (${attrs.first_order_item?.product_name || productId})`);
          console.log(`[LS] +${points}P for user ${userId}`);
        }
        break;
      }

      // ═══ 구독 시작 ═══
      case "subscription_created": {
        if (!userId) break;
        const productId = attrs.product_id;
        const points = SUB_POINTS[productId];
        if (points) {
          await addPoints(userId, points, `구독 시작 (${attrs.product_name || productId})`);
          console.log(`[LS] subscription +${points}P for user ${userId}`);
        }
        break;
      }

      // ═══ 구독 갱신 결제 성공 ═══
      case "subscription_payment_success": {
        const subId = attrs.subscription_id;
        // subscription_id로 product 정보를 가져와야 함
        // custom_data에 user_id가 없을 수 있으므로 별도 처리
        if (userId) {
          // 구독의 variant에서 product 매핑
          const variantId = attrs.variant_id;
          // variant → product 매핑
          const variantToProduct = {
            1508567: 960273, // Basic 구독
            1508570: 960276, // Pro 구독
            1508572: 960278, // Premium 구독
          };
          const productId = variantToProduct[variantId];
          const points = productId ? SUB_POINTS[productId] : null;
          if (points) {
            await addPoints(userId, points, `구독 갱신 (월간 포인트)`);
            console.log(`[LS] renewal +${points}P for user ${userId}`);
          }
        }
        break;
      }

      // ═══ 구독 취소/만료 — 로그만 ═══
      case "subscription_cancelled":
      case "subscription_updated":
      case "subscription_payment_failed": {
        console.log(`[LS] ${eventName} for subscription ${data.id}`);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[LS Webhook Error]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: { bodyParser: false },
};
