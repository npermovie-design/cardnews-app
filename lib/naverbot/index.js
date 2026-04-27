// NaverBot SaaS - 공통 유틸 (라이선스/계정 검증, 입력 검증, CORS, 해시)

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ── 환경변수 ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_KEY;
const MACHINE_ID_SALT = process.env.NAVERBOT_MACHINE_SALT || "naverbot-default-salt-CHANGE-ME";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// 메이킷 계정 인증용 (anon 키)
export const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ACTIVE_SUB_STATUSES = ["active", "on_trial", "past_due"];

// 메이킷 계정 로그인 + 구독 상태 확인 (서버 내부 재사용)
// email+password 또는 access_token 둘 중 하나로 인증
export async function verifyMakeitAccount({ email, password, accessToken } = {}) {
  let userObj = null;

  if (accessToken) {
    // 토큰 기반 인증
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data?.user) return { ok: false, reason: "토큰 만료 또는 무효" };
    userObj = data.user;
  } else if (email && password) {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data?.user) return { ok: false, reason: "이메일 또는 비밀번호가 틀렸습니다" };
    userObj = data.user;
  } else {
    return { ok: false, reason: "인증 정보 필요" };
  }

  const uid = userObj.id;

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("uid", uid)
    .maybeSingle();

  if (userRow?.role === "admin") {
    return {
      ok: true,
      uid,
      email: userObj.email,
      plan: "admin",
      trial: false,
      role: "admin",
      expires_at: null,
    };
  }

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("status, product_name, ends_at, renews_at, updated_at")
    .eq("uid", uid)
    .in("status", ACTIVE_SUB_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  const activeSub = subs && subs.length > 0 ? subs[0] : null;

  // 활성 구독 없으면 → 무료 체험 모드 (5회 한도)
  if (!activeSub) {
    return {
      ok: true,
      uid,
      email: userObj.email,
      plan: "trial",
      trial: true,
      trial_limit: 5,
      role: userRow?.role || "member",
      expires_at: null,
    };
  }

  // 플랜명 정규화 (starter/pro/business)
  const planName = (activeSub.product_name || "").toLowerCase();
  let plan = "starter";
  if (planName.includes("business") || planName.includes("enterprise")) plan = "business";
  else if (planName.includes("pro") || planName.includes("premium")) plan = "pro";

  return {
    ok: true,
    uid,
    email: userObj.email,
    plan,
    trial: false,
    role: userRow?.role || "member",
    expires_at: activeSub.ends_at || activeSub.renews_at || null,
  };
}

// ── 보안: machine_id 평문 저장 금지, salt 해시 ──
export function hashMachineId(machineId) {
  return crypto
    .createHmac("sha256", MACHINE_ID_SALT)
    .update(String(machineId || ""))
    .digest("hex");
}

// ── 입력 검증 ──
const LIMITS = {
  topic_max: 200,
  style_prompt_max: 2000,
  length_min: 1000,
  length_max: 8000,
  license_key_pattern: /^[A-Z0-9-]{16,64}$/i,
};

export function validateLicenseKey(key) {
  if (!key || typeof key !== "string") return false;
  return LIMITS.license_key_pattern.test(key);
}

export function validateGenerateInput(body) {
  const errors = [];
  if (!body || typeof body !== "object") return ["request body 누락"];

  if (!validateLicenseKey(body.license_key)) errors.push("license_key 형식 오류");
  if (!body.topic || typeof body.topic !== "string") errors.push("topic 필수");
  else if (body.topic.length > LIMITS.topic_max) errors.push(`topic 최대 ${LIMITS.topic_max}자`);

  if (body.style_prompt && typeof body.style_prompt !== "string") errors.push("style_prompt 형식 오류");
  else if (body.style_prompt && body.style_prompt.length > LIMITS.style_prompt_max)
    errors.push(`style_prompt 최대 ${LIMITS.style_prompt_max}자`);

  const len = Number(body.length);
  if (!Number.isFinite(len)) errors.push("length 숫자 필수");
  else if (len < LIMITS.length_min || len > LIMITS.length_max)
    errors.push(`length는 ${LIMITS.length_min}~${LIMITS.length_max}`);

  return errors;
}

// ── 라이선스 검증 (DB 조회 + 상태/만료/머신ID) ──
export async function verifyLicense({ licenseKey, machineId, bindIfFirst = false }) {
  const { data, error } = await supabase
    .from("naverbot_licenses")
    .select("id, license_key, plan, status, machine_id_hash, expires_at")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "라이선스 없음" };
  if (data.status !== "active") return { ok: false, reason: "라이선스 비활성" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: "라이선스 만료" };

  const hashedMachine = hashMachineId(machineId);
  if (!data.machine_id_hash) {
    if (bindIfFirst) {
      await supabase
        .from("naverbot_licenses")
        .update({ machine_id_hash: hashedMachine, updated_at: new Date().toISOString() })
        .eq("id", data.id);
    }
  } else if (data.machine_id_hash !== hashedMachine) {
    return { ok: false, reason: "다른 PC에서 사용 중" };
  }

  return {
    ok: true,
    license: {
      id: data.id,
      plan: data.plan,
      expires_at: data.expires_at,
    },
  };
}

// ── 일일 사용량 한도 ──
export const PLAN_DAILY_LIMIT = {
  admin: 999999,
  trial: 5,      // 평생 5회 (일일 아님)
  starter: 1,
  pro: 5,
  business: 999,
};

// trial은 평생 5회, 나머지는 일일 한도
export async function checkDailyQuota(licenseKey, plan) {
  if (plan === "admin") {
    return { used: 0, limit: PLAN_DAILY_LIMIT.admin, exceeded: false, trial: false };
  }

  if (plan === "trial") {
    // 총 누적 체크 (시간 필터 없음)
    const { count } = await supabase
      .from("naverbot_posts_log")
      .select("id", { count: "exact", head: true })
      .eq("license_key", licenseKey);
    const used = count ?? 0;
    const limit = PLAN_DAILY_LIMIT.trial;
    return { used, limit, exceeded: used >= limit, trial: true };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("naverbot_posts_log")
    .select("id", { count: "exact", head: true })
    .eq("license_key", licenseKey)
    .gte("created_at", start.toISOString());

  const limit = PLAN_DAILY_LIMIT[plan] ?? 1;
  const used = count ?? 0;
  return { used, limit, exceeded: used >= limit, trial: false };
}

// ── CORS (데스크톱 클라이언트는 무관, 브라우저 남용 차단용) ──
export function setCors(req, res) {
  // 데스크톱 앱은 origin 없음 → 통과
  // 브라우저 호출은 메이킷 도메인만 허용
  const origin = req.headers?.origin || "";
  const allowed =
    !origin || // 데스크톱
    origin.includes("snsmakeit.com") ||
    origin.includes("vercel.app") ||
    origin.includes("localhost");
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin || "*" : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── 일반화된 에러 응답 (내부 정보 노출 금지) ──
export function safeError(res, status, publicMessage, internalError = null) {
  if (internalError) {
    console.error("[naverbot]", publicMessage, internalError);
  }
  return res.status(status).json({ ok: false, error: publicMessage });
}
