import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// ── 일회 충전 팩: product_name → points ──────────────────────
const ONE_OFF_POINTS = {
  "Starter":  1000,   // $5.90
  "Basic":    2000,   // $11.90 (pack)
  "Standard": 3500,   // $19.90
  "Plus":     5500,   // $29.90
  "Pro":      9500,   // $49.90 (pack)
};

// ── 구독 tier: product_name → { monthly, yearly } ────────────
// 연간은 monthly × 12 (2개월 무료 혜택이 가격에 이미 반영됨)
const SUB_TIERS = {
  "Basic":   { monthly: 1800, yearly: 21600 },
  "Pro":     { monthly: 3800, yearly: 45600 },
  "Premium": { monthly: 7000, yearly: 84000 },
};

// created_at과 renews_at의 차이로 monthly/yearly 판별 (200일 기준)
function detectInterval(attrs) {
  if (!attrs?.created_at || !attrs?.renews_at) return "monthly";
  const created = new Date(attrs.created_at);
  const renews = new Date(attrs.renews_at);
  const days = (renews - created) / (1000 * 60 * 60 * 24);
  return days > 200 ? "yearly" : "monthly";
}

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

// 구독 생성 시 매핑 저장 (갱신 결제 시 조회용)
async function saveSubscription(subId, uid, productName, interval, status, attrs = {}) {
  const { error } = await supabase.from("subscriptions").upsert({
    subscription_id: String(subId),
    uid,
    product_name: productName,
    interval,
    status,
    renews_at: attrs.renews_at || null,
    ends_at: attrs.ends_at || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "subscription_id" });
  if (error) console.error("[LS] saveSubscription fail:", error.message);
}

async function getSubscription(subId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", String(subId))
    .single();
  if (error) { console.error("[LS] getSubscription fail:", error.message); return null; }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // URL 시크릿 토큰 검증 (LS signing secret 미사용 시 x-signature 체크 불가)
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = (url.searchParams.get("token") || "").trim();
    const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim();

    if (!secret) {
      console.error("[LS] Auth failed — LEMONSQUEEZY_WEBHOOK_SECRET env var NOT SET on Vercel");
      return res.status(401).json({ error: "Server misconfigured" });
    }
    if (token !== secret) {
      console.error(`[LS] Auth failed — token mismatch (len ${token.length} vs ${secret.length})`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body;
    const eventName = payload.meta?.event_name;
    const userId = payload.meta?.custom_data?.user_id;
    const data = payload.data;
    const attrs = data?.attributes;

    console.log(`[LS] ${eventName} | user:${userId} | product:${attrs?.product_name} | status:${attrs?.status}`);

    switch (eventName) {
      // ── 일회 충전 ─────────────────────────────
      case "order_created": {
        if (!userId || attrs.status !== "paid") break;
        const productName = attrs.first_order_item?.product_name;
        const pts = ONE_OFF_POINTS[productName];
        if (pts) {
          const n = await addPoints(userId, pts, `포인트 충전 (${productName})`);
          console.log(`[LS] +${pts}P (one-off) → ${n}`);
        } else {
          console.warn(`[LS] Unknown pack product: "${productName}"`);
        }
        break;
      }

      // ── 구독 시작 (첫 결제분 포인트 + 매핑 저장) ─────
      case "subscription_created": {
        if (!userId) break;
        const productName = attrs.product_name;
        const tier = SUB_TIERS[productName];
        if (!tier) { console.warn(`[LS] Unknown sub product: "${productName}"`); break; }

        const interval = detectInterval(attrs);
        const pts = interval === "yearly" ? tier.yearly : tier.monthly;
        const label = interval === "yearly" ? "연간" : "월간";

        // 매핑 저장 (갱신 시 조회용)
        await saveSubscription(data.id, userId, productName, interval, attrs.status || "active", attrs);

        // 첫 결제 포인트 지급
        const n = await addPoints(userId, pts, `구독 시작 (${productName} ${label})`);
        console.log(`[LS] +${pts}P (${label} start) → ${n}`);
        break;
      }

      // ── 구독 갱신 ──────────────────────────────
      case "subscription_payment_success": {
        // subscription_created가 초기 결제 포인트를 담당하므로
        // billing_reason === "initial"이면 스킵 (중복 방지)
        if (attrs.billing_reason === "initial") {
          console.log(`[LS] Initial payment skipped (handled by subscription_created)`);
          break;
        }

        // subscription-invoice payload에는 product_name이 없으므로
        // 저장된 매핑에서 조회
        const subId = attrs.subscription_id;
        if (!subId) { console.warn(`[LS] No subscription_id in payload`); break; }

        const sub = await getSubscription(subId);
        if (!sub) { console.warn(`[LS] Subscription mapping not found: ${subId}`); break; }

        const tier = SUB_TIERS[sub.product_name];
        if (!tier) { console.warn(`[LS] Unknown sub tier: ${sub.product_name}`); break; }

        const pts = sub.interval === "yearly" ? tier.yearly : tier.monthly;
        const label = sub.interval === "yearly" ? "연간 갱신" : "월간 갱신";
        const n = await addPoints(sub.uid, pts, `구독 갱신 (${sub.product_name} ${label})`);
        console.log(`[LS] +${pts}P (${label}) → ${n}`);
        break;
      }

      // ── 구독 업데이트 (갱신일 변경 등) ───────────
      case "subscription_updated": {
        const subId = data?.id;
        if (subId) {
          await supabase.from("subscriptions")
            .update({
              status: attrs.status || "active",
              renews_at: attrs.renews_at || null,
              ends_at: attrs.ends_at || null,
              cancelled_at: attrs.cancelled ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("subscription_id", String(subId));
          console.log(`[LS] Subscription ${subId} updated → status:${attrs.status}`);
        }
        break;
      }

      // ── 구독 해지/만료 ─────────────────────────
      case "subscription_cancelled":
      case "subscription_expired": {
        const subId = data?.id;
        if (subId) {
          const isExpired = eventName === "subscription_expired";
          await supabase.from("subscriptions")
            .update({
              status: isExpired ? "expired" : "cancelled",
              ends_at: attrs?.ends_at || null,
              cancelled_at: isExpired ? null : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("subscription_id", String(subId));
          console.log(`[LS] Subscription ${subId} → ${eventName}`);
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[LS Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
}
