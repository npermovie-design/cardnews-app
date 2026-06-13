import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient, getVapidPublicKey, sendWebPushToUsers } from "../lib/webPush.js";

function setCors(req, res) {
  const origin = req.headers?.origin || "";
  const allowed = origin.includes("snsmakeit.com") || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^https?:\/\/localhost:\d+$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "https://snsmakeit.com");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

async function getBearerUser(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  const anonClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  return user || null;
}

function subscriptionId(endpoint) {
  return crypto.createHash("sha256").update(String(endpoint || "")).digest("hex");
}

function normalizeSubscription(raw) {
  const subscription = raw && typeof raw === "object" ? raw : {};
  const endpoint = String(subscription.endpoint || "").trim();
  const p256dh = String(subscription.keys?.p256dh || "").trim();
  const auth = String(subscription.keys?.auth || "").trim();
  if (!/^https:\/\/[^ ]{20,}$/i.test(endpoint)) throw new Error("invalid subscription endpoint");
  if (!p256dh || !auth) throw new Error("invalid subscription keys");
  return { endpoint, keys: { p256dh, auth } };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(value) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function dateKeyFromUtcMs(ms) {
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

function challengeDayDateKey(challenge, day) {
  const start = parseDateKey(challenge?.start_date || challenge?.created_at);
  const dayNumber = Number(day || 0);
  if (!start || dayNumber <= 0) return null;
  return dateKeyFromUtcMs(start + ((dayNumber - 1) * DAY_MS));
}

function isApplicationEligibleForChallengeDay(challenge, application, day) {
  if (String(challenge?.challenge_mode || "").toLowerCase() !== "habit") return true;
  const targetDate = challengeDayDateKey(challenge, day);
  const challengeStart = parseDateKey(challenge?.start_date || challenge?.created_at);
  const joinedAt = parseDateKey(application?.confirmed_at || application?.created_at || challenge?.start_date || challenge?.created_at);
  const joinedDate = dateKeyFromUtcMs(Math.max(challengeStart || 0, joinedAt || 0));
  if (!targetDate || !joinedDate) return true;
  return joinedDate <= targetDate;
}

function hasProof(mission) {
  return Boolean(String(mission?.link || "").trim() || String(mission?.screenshot_url || "").trim() || String(mission?.extra_link || "").trim());
}

function missionComplete(challenge, mission, targetDate) {
  if (!hasProof(mission)) return false;
  if (String(challenge?.challenge_mode || "").toLowerCase() !== "habit") return true;
  return String(mission?.post_date || "").slice(0, 10) === targetDate;
}

async function requireAdmin(sb, uid) {
  const { data } = await sb.from("users").select("role,plan,email").eq("uid", uid).maybeSingle();
  return data?.role === "admin" || data?.role === "moderator" || data?.plan === "admin";
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const action = String(req.query?.action || "public-key");
  if (action === "public-key") {
    return res.status(200).json({ ok: true, publicKey: getVapidPublicKey() });
  }

  const user = await getBearerUser(req);
  if (!user?.id) return res.status(401).json({ ok: false, error: "로그인이 필요합니다" });
  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ ok: false, error: "서버 설정 오류" });

  try {
    if (action === "subscribe") {
      if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST만 허용됩니다" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const subscription = normalizeSubscription(body.subscription);
      const row = {
        id: subscriptionId(subscription.endpoint),
        uid: user.id,
        endpoint: subscription.endpoint,
        subscription,
        user_agent: String(req.headers?.["user-agent"] || "").slice(0, 500),
        enabled: true,
        last_error: null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await sb.from("push_subscriptions").upsert(row, { onConflict: "id" });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === "unsubscribe") {
      if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ ok: false, error: "POST 또는 DELETE만 허용됩니다" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const endpoint = String(body.endpoint || body.subscription?.endpoint || "").trim();
      if (!endpoint) return res.status(400).json({ ok: false, error: "endpoint 필요" });
      const { error } = await sb
        .from("push_subscriptions")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("id", subscriptionId(endpoint))
        .eq("uid", user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === "test") {
      if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST만 허용됩니다" });
      const push = await sendWebPushToUsers([user.id], {
        title: "SNS메이킷 알림 테스트",
        body: "휴대폰/앱 알림이 정상적으로 연결되었습니다.",
        url: "/growth",
        tag: `push-test-${user.id}`,
      });
      return res.status(200).json({ ok: true, push });
    }

    if (action === "challenge-missing") {
      if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST만 허용됩니다" });
      if (!(await requireAdmin(sb, user.id))) return res.status(403).json({ ok: false, error: "관리자 권한이 필요합니다" });
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const challengeId = String(body.challenge_id || "").trim();
      const day = Number(body.day || 0);
      if (!challengeId || day <= 0) return res.status(400).json({ ok: false, error: "challenge_id와 day가 필요합니다" });

      const { data: challenge, error: challengeError } = await sb
        .from("challenges")
        .select("id,title,start_date,created_at,challenge_mode")
        .eq("id", challengeId)
        .maybeSingle();
      if (challengeError || !challenge) return res.status(404).json({ ok: false, error: "챌린지를 찾을 수 없습니다" });

      const { data: applications, error: appError } = await sb
        .from("challenge_applications")
        .select("uid,created_at,confirmed_at")
        .eq("challenge_id", challengeId)
        .eq("status", "confirmed")
        .not("uid", "is", null);
      if (appError) throw appError;

      const eligibleUids = [...new Set((applications || [])
        .filter(app => isApplicationEligibleForChallengeDay(challenge, app, day))
        .map(app => app.uid)
        .filter(Boolean))];
      if (eligibleUids.length === 0) return res.status(200).json({ ok: true, missing: 0, push: { sent: 0, failed: 0 } });

      const targetDate = challengeDayDateKey(challenge, day);
      const { data: missions, error: missionError } = await sb
        .from("challenge_missions")
        .select("uid,link,screenshot_url,extra_link,post_date")
        .eq("challenge_id", challengeId)
        .eq("day", day)
        .in("uid", eligibleUids);
      if (missionError) throw missionError;

      const done = new Set((missions || []).filter(m => missionComplete(challenge, m, targetDate)).map(m => m.uid));
      const missingUids = eligibleUids.filter(uid => !done.has(uid));
      const isHabit = String(challenge.challenge_mode || "").toLowerCase() === "habit";
      const message = isHabit
        ? `Day ${day} 인증이 아직 등록되지 않았습니다. 오늘 날짜로 업로드한 링크와 게시 날짜를 맞춰 미션 게시판에 올려주세요.`
        : `Day ${day} 인증이 아직 등록되지 않았습니다. 오늘 안에 미션 게시판에서 인증을 올려주세요.`;
      const push = await sendWebPushToUsers(missingUids, {
        title: `${challenge.title || "크루잉"} 인증 알림`,
        body: message,
        url: `/growth/${challengeId}/board`,
        tag: `manual-missing-${challengeId}-${day}`,
      });
      return res.status(200).json({ ok: true, missing: missingUids.length, push });
    }

    return res.status(400).json({ ok: false, error: "unknown action" });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message || "푸시 알림 처리 실패" });
  }
}
