import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

let configured = false;

export function getVapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || "").trim();
}

export function isWebPushConfigured() {
  return Boolean(getVapidPublicKey() && String(process.env.VAPID_PRIVATE_KEY || "").trim());
}

function configureWebPush() {
  if (configured || !isWebPushConfigured()) return isWebPushConfigured();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@snsmakeit.com",
    getVapidPublicKey(),
    String(process.env.VAPID_PRIVATE_KEY || "").trim()
  );
  configured = true;
  return true;
}

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sendWebPushToUsers(uids, payload) {
  if (!Array.isArray(uids) || uids.length === 0) return { sent: 0, failed: 0, disabled: 0, skipped: true };
  if (!configureWebPush()) return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: "web push env missing" };
  const sb = getServiceClient();
  if (!sb) return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: "supabase service env missing" };

  const { data: subscriptions, error } = await sb
    .from("push_subscriptions")
    .select("id,uid,subscription")
    .in("uid", [...new Set(uids.filter(Boolean))])
    .eq("enabled", true);
  if (error || !subscriptions?.length) return { sent: 0, failed: 0, disabled: 0, skipped: false };

  let sent = 0;
  let failed = 0;
  let disabled = 0;
  const body = JSON.stringify({
    title: payload?.title || "SNS메이킷 알림",
    body: payload?.body || "새 알림이 도착했습니다.",
    url: payload?.url || "/growth",
    tag: payload?.tag || "snsmakeit-notice",
  });

  await Promise.all(subscriptions.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, body, { TTL: 60 * 60 * 8 });
      sent += 1;
      await sb.from("push_subscriptions").update({
        last_success_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    } catch (e) {
      failed += 1;
      const statusCode = Number(e?.statusCode || 0);
      const shouldDisable = statusCode === 404 || statusCode === 410;
      if (shouldDisable) disabled += 1;
      await sb.from("push_subscriptions").update({
        enabled: shouldDisable ? false : true,
        last_error: String(e?.body || e?.message || "push failed").slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
  }));

  return { sent, failed, disabled, skipped: false };
}
