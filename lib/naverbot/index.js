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

export const PLAN_FEATURE_LIMITS = {
  admin: { write: 999999, video: 999999, autopilotDaily: 999999, cafeDaily: 999999, accounts: 99 },
  trial: { write: 5, video: 3, autopilotDaily: 0, cafeDaily: 0, accounts: 1 },
  member: { write: 0, video: 0, autopilotDaily: 0, cafeDaily: 0, accounts: 1 },
  free: { write: 5, video: 3, autopilotDaily: 0, cafeDaily: 0, accounts: 1 },
  starter: { write: 30, video: 10, autopilotDaily: 0, cafeDaily: 0, accounts: 1 },
  basic: { write: 30, video: 10, autopilotDaily: 0, cafeDaily: 0, accounts: 1 },
  pro: { write: 200, video: 99999, autopilotDaily: 3, cafeDaily: 0, accounts: 1 },
  premium: { write: 700, video: 99999, autopilotDaily: 10, cafeDaily: 20, accounts: 3 },
  business: { write: 700, video: 99999, autopilotDaily: 10, cafeDaily: 20, accounts: 3 },
  agency: { write: 999999, video: 999999, autopilotDaily: 999999, cafeDaily: 999999, accounts: 5 },
};

export function normalizePlanName(planName = "") {
  const raw = String(planName || "").toLowerCase();
  if (raw.includes("admin")) return "admin";
  if (raw.includes("agency")) return "agency";
  if (raw.includes("business") || raw.includes("enterprise")) return "business";
  if (raw.includes("premium")) return "premium";
  if (raw.includes("pro")) return "pro";
  if (raw.includes("basic") || raw.includes("starter")) return "basic";
  if (raw.includes("free")) return "free";
  if (raw.includes("member")) return "member";
  if (raw.includes("trial")) return "trial";
  return "basic";
}

export function getPlanFeatureLimits(plan) {
  const key = normalizePlanName(plan);
  return PLAN_FEATURE_LIMITS[key] || PLAN_FEATURE_LIMITS.basic;
}

async function getActiveProgramTrial(uid, email) {
  try {
    const now = new Date().toISOString();
    const normalizedEmail = String(email || "").toLowerCase();
    let query = supabase
      .from("program_trials")
      .select("plan, expires_at, status")
      .eq("status", "active")
      .gte("expires_at", now)
      .order("expires_at", { ascending: false })
      .limit(1);

    if (uid && normalizedEmail) query = query.or(`uid.eq.${uid},email.eq.${normalizedEmail}`);
    else if (uid) query = query.eq("uid", uid);
    else if (normalizedEmail) query = query.eq("email", normalizedEmail);
    else return null;

    const { data, error } = await query;
    if (error) {
      console.warn("[naverbot] program_trials 조회 실패:", error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (e) {
    console.warn("[naverbot] program_trials 예외:", e.message);
    return null;
  }
}

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
    .select("role, points, monthly_used_write, monthly_used_video")
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

  const programTrial = await getActiveProgramTrial(uid, userObj.email);
  if (programTrial) {
    const plan = normalizePlanName(programTrial.plan || "pro");
    return {
      ok: true,
      uid,
      email: userObj.email,
      plan,
      trial: false,
      grant_type: "program_trial",
      points: Math.max(0, Number(userRow?.points || 0)),
      role: userRow?.role || "member",
      expires_at: programTrial.expires_at,
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

  const remainingPoints = Math.max(0, Number(userRow?.points || 0));

  // 활성 구독 없으면 → 메이킷 회원 잔여 횟수(points)를 그대로 사용
  if (!activeSub) {
    return {
      ok: true,
      uid,
      email: userObj.email,
      plan: remainingPoints > 0 ? "member" : "trial",
      trial: remainingPoints <= 0,
      trial_limit: 5,
      points: remainingPoints,
      role: userRow?.role || "member",
      expires_at: null,
    };
  }

  const plan = normalizePlanName(activeSub.product_name || "basic");

  return {
    ok: true,
    uid,
    email: userObj.email,
    plan,
    trial: false,
    points: remainingPoints,
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

// ── 라이선스 검증 (DB 조회 + 상태/만료/머신ID + 세션 관리) ──
// 플랜별 동시 머신 수 제한
const PLAN_MAX_MACHINES = { starter: 1, pro: 1, premium: 1, business: 3, agency: 5 };
// 비활성 머신 유예 시간 (24시간 미접속 시 슬롯 해제)
const MACHINE_IDLE_MS = 24 * 60 * 60 * 1000;

export async function verifyLicense({ licenseKey, machineId, bindIfFirst = false }) {
  const { data, error } = await supabase
    .from("naverbot_licenses")
    .select("id, license_key, plan, status, machine_id_hash, expires_at, active_machines, last_verified_at")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "라이선스 없음" };
  if (data.status !== "active") return { ok: false, reason: "라이선스 비활성" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: "라이선스 만료" };

  const hashedMachine = hashMachineId(machineId);
  const now = new Date().toISOString();
  const maxMachines = PLAN_MAX_MACHINES[data.plan] || 1;

  // active_machines: [{ hash, last_seen }] - 동시 접속 머신 관리
  let machines = Array.isArray(data.active_machines) ? data.active_machines : [];
  // 유휴 머신 제거 (24시간 미접속)
  const cutoff = Date.now() - MACHINE_IDLE_MS;
  machines = machines.filter(m => m.last_seen && new Date(m.last_seen).getTime() > cutoff);

  const existing = machines.find(m => m.hash === hashedMachine);
  if (existing) {
    // 이미 등록된 머신: last_seen 갱신
    existing.last_seen = now;
  } else if (machines.length < maxMachines) {
    // 빈 슬롯 있음: 새 머신 등록
    machines.push({ hash: hashedMachine, last_seen: now });
  } else {
    // 슬롯 초과: 거절
    return { ok: false, reason: `동시 사용 가능 PC 수(${maxMachines}대)를 초과했습니다` };
  }

  // 기존 단일 machine_id_hash 호환성 유지 + active_machines 갱신
  await supabase
    .from("naverbot_licenses")
    .update({
      machine_id_hash: hashedMachine,
      active_machines: machines,
      last_verified_at: now,
      updated_at: now,
    })
    .eq("id", data.id);

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
  starter: 30,   // legacy alias
  basic: 30,
  pro: 200,       // 월 200회
  premium: 700,   // 월 700회 (레거시 Premium은 Business로 매핑)
  business: 700,  // 월 700회
  agency: 999999,
};

// trial은 평생 5회, 나머지는 월간 한도
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

  if (plan === "member" || plan === "free") {
    const { data } = await supabase
      .from("users")
      .select("points")
      .eq("uid", licenseKey)
      .maybeSingle();
    const limit = Math.max(0, Number(data?.points || 0));
    return { used: 0, limit, exceeded: limit <= 0, trial: false, pointsBased: true };
  }

  // 월간 한도 체크 (매월 1일 리셋)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { count } = await supabase
    .from("naverbot_posts_log")
    .select("id", { count: "exact", head: true })
    .eq("license_key", licenseKey)
    .gte("created_at", monthStart.toISOString());

  const limit = getPlanFeatureLimits(plan).write ?? 1;
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ── 일반화된 에러 응답 (내부 정보 노출 금지) ──
export function safeError(res, status, publicMessage, internalError = null) {
  if (internalError) {
    console.error("[naverbot]", publicMessage, internalError);
  }
  return res.status(status).json({ ok: false, error: publicMessage });
}
