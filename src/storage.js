/* ═══════════════════════════════════════════════════════════
   storage.js  ·  Supabase DB + Auth + 이용 횟수 시스템
   ═══════════════════════════════════════════════════════════ */

import { createClient } from "@supabase/supabase-js";

// ── Supabase Config ───────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const _g = typeof window !== "undefined" ? window : globalThis;
if (!_g.__supabase__) {
  _g.__supabase__ = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      storageKey: "sb-snsmakeit-auth-token",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });
}
export const supabase = _g.__supabase__;

// 기존 파일 호환용 별명 (auth, db 이름 그대로 사용 가능)
export const auth = supabase;
export const db   = supabase;

// ── Auth 토큰 헬퍼 (API 호출 시 사용) ───────────────────────────────────────
export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

// DB 컬럼 points = 실제 이용 횟수 (1:1 매핑)
// 이전 30배 내부 단위를 제거하고 1회 = 1로 통일한다.
export const USE_UNIT = 1;
export const usesToPoints = (uses = 0) => Math.round(Number(uses) || 0);
export const pointsToUses = (points = 0) => Math.floor(Number(points) || 0);
export const pointDeltaToUses = (delta = 0) => {
  const n = Number(delta) || 0;
  return n;
};

// ── 이용 횟수 상수 (내부 저장 단위는 points 컬럼) ──────────────────────────
export const POINTS = {
  SIGNUP:      5,      // 회원가입 보너스 5회
  DAILY_LOGIN: 1,      // 일일 로그인 1회
  REFERRAL_SIGNUP: 5,  // 추천코드 가입자 보상 5회
  REFERRAL_REFERRER: 10, // 추천한 회원 보상 10회
  POST_WRITE:  1,      // 게시글 작성 1회 (하루 10회 제한)
  COMMENT:     0,      // 댓글 작성
  // ── AI 생성 (모두 1회 = 1 차감) ────────────────────────
  AI_USE:      -1,     // 텍스트 생성
  AI_SONNET:   -1,     // Sonnet 텍스트
  IMAGE_GEN:   -1,     // 이미지 생성
  PPT_GEN:     -1,     // PPT/상세페이지 생성
  VIDEO_ANALYZE: -1,   // 영상 분석
  VIDEO_GEN:   -1,     // 영상 15초
  VIDEO_GEN_30: -1,    // 영상 30초
  VIDEO_GEN_60: -1,    // 영상 60초
  // ── AI 채팅 ──────────────────────────────────────────
  CHAT_HAIKU:    -1,   // Haiku 채팅
  CHAT_SONNET:  -1,    // Sonnet 채팅
  CHAT_GPT4O_MINI: -1, // GPT-4o Mini
  CHAT_GPT4O:   -1,    // GPT-4o
  CHAT_GEMINI_FLASH: -1, // Gemini Flash
  CHAT_GEMINI_PRO: -1, // Gemini Pro
};

// 채팅 모델 → 내부 차감 단위 매핑
export const CHAT_COST = {
  "claude-haiku-4-5": POINTS.CHAT_HAIKU,
  "claude-sonnet-4-5": POINTS.CHAT_SONNET,
  "gpt-4o-mini": POINTS.CHAT_GPT4O_MINI,
  "gpt-4o": POINTS.CHAT_GPT4O,
  "gemini-2.5-flash": POINTS.CHAT_GEMINI_FLASH,
  "gemini-2.5-pro": POINTS.CHAT_GEMINI_PRO,
};

// 단건 충전 플랜 (1 point = 1회)
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    points: 0,
    label: "무료",
    color: "#888",
    features: ["가입 시 5회 지급", "비회원 5회 무료 체험", "매일 출석 +1회", "이용 횟수 소진 시 구독 필요"],
    btnLabel: "무료 체험",
    highlight: false,
  },
  {
    id: "pack1",
    name: "Starter",
    price: 5.9,
    points: 20,
    label: "$5.90",
    color: "#4ade80",
    features: ["20회 지급", "모든 기능 이용 가능", "유효기간 없음"],
    btnLabel: "시작하기",
    highlight: false,
    badge: "입문",
  },
  {
    id: "pack3",
    name: "Standard",
    price: 19.9,
    points: 80,
    label: "$19.90",
    color: "#7c6aff",
    features: ["80회 지급", "모든 기능 이용 가능", "SNS 자동 발행"],
    btnLabel: "시작하기",
    highlight: true,
    badge: "추천",
  },
  {
    id: "pack5",
    name: "Pro",
    price: 49.9,
    points: 216,
    label: "$49.90",
    color: "#f59e0b",
    features: ["216회 지급", "모든 기능 이용 가능", "우선 고객지원"],
    btnLabel: "시작하기",
    highlight: false,
    badge: "전문가용",
  },
];

// ── 로컬스토리지 헬퍼 ─────────────────────────────────────────────────────
export const POSTS_KEY   = "nper_posts_v2";
export const USER_KEY    = "nper_user";
export const AI_KEY      = "nper_ai_usage";
export const MEMBERS_KEY = "nper_members";

export function getLocalUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } }
export function setLocalUser(u)  { try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch {} }
export function getPosts()       { try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]"); } catch { return []; } }
export function setPosts(p)      { try { localStorage.setItem(POSTS_KEY, JSON.stringify(p)); } catch {} }
export function getMembers()     { try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || "[]"); } catch { return []; } }
export function saveMembers(m)   { try { localStorage.setItem(MEMBERS_KEY, JSON.stringify(m)); } catch {} }
export function getUser()        { return getLocalUser(); }
export function setUser(u)       { setLocalUser(u); }

function makeReferralCode(seed = "") {
  const clean = String(seed || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = clean.slice(0, 8).padEnd(8, "0");
  return `MK${base}`;
}

export async function ensureReferralCode(userData) {
  if (!userData?.uid) return userData;
  if (userData.referral_code) return userData;
  const referralCode = makeReferralCode(userData.uid);
  try {
    const { error } = await supabase
      .from("users")
      .update({ referral_code: referralCode })
      .eq("uid", userData.uid);
    if (error) throw error;
    return { ...userData, referral_code: referralCode };
  } catch {
    return { ...userData, referral_code: referralCode };
  }
}

async function insertUserWithReferralFallback(userData) {
  const { error } = await supabase.from("users").insert(userData);
  if (!error) return;
  const { referral_code, ...fallbackUserData } = userData;
  const { error: fallbackError } = await supabase.from("users").insert(fallbackUserData);
  if (fallbackError) throw fallbackError;
}

// ── 내부 헬퍼: users 테이블에서 유저 가져오기 ────────────────────────────
const _userCache = { uid: null, data: null, ts: 0 };
async function _fetchUserRow(uid) {
  if (!uid) return null;
  // 5초 캐시 — 동시 호출 방지
  if (_userCache.uid === uid && _userCache.data && Date.now() - _userCache.ts < 5000) return _userCache.data;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .single();
  if (error) return _userCache.data || null;
  _userCache.uid = uid;
  _userCache.data = data;
  _userCache.ts = Date.now();
  return data;
}

// ── 내부 헬퍼: 일일 로그인 이용 횟수 처리 (fire-and-forget) ─────────────────
function _handleDailyLogin(userData) {
  try {
    const today = new Date().toLocaleDateString("ko-KR");
    if (userData.last_login_date !== today) {
      const newPoints = Math.max(0, (userData.points || 0) + POINTS.DAILY_LOGIN);
      // 비동기로 처리, 로그인을 블로킹하지 않음
      (async () => {
        try {
          const { error } = await supabase.from("users").update({
            points: newPoints,
            last_login_date: today,
            last_login: new Date().toISOString(),
          }).eq("uid", userData.uid);
          if (!error) {
            await supabase.from("point_history").insert({
              uid: userData.uid, delta: POINTS.DAILY_LOGIN, reason: "일일 로그인 +1회",
              balance: newPoints, created_at: new Date().toISOString(),
            });
          }
        } catch(e) {}
      })();
      // 로컬 userData는 즉시 업데이트
      userData = { ...userData, points: newPoints, last_login_date: today };
    }
  } catch(e) {
    /* daily login point processing failed */
  }
  return userData;
}

// ── 일회용 이메일 차단 목록 ───────────────────────────────────────────────
const DISPOSABLE_DOMAINS = [
  "mailinator.com","temp-mail.org","guerrillamail.com","tempmail.email",
  "10minutemail.com","yopmail.com","throwawaymail.com","fakemail.net",
  "maildrop.cc","guerrillamail.info","grr.la","dispostable.com",
  "sharklasers.com","guerrillamailblock.com","pokemail.net","spam4.me",
  "trashmail.com","trashmail.me","mohmal.com","getnada.com",
];

function normalizeEmail(email) {
  const [raw, domain] = email.toLowerCase().split("@");
  let local = raw.split("+")[0]; // +trick 제거
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, ""); // gmail 점 무시
  }
  return `${local}@${domain}`;
}

function isDisposableEmail(email) {
  const domain = email.toLowerCase().split("@")[1];
  return DISPOSABLE_DOMAINS.includes(domain);
}

// ── Auth: 이메일 회원가입 ─────────────────────────────────────────────────
export async function fbRegister(email, pw, nick, captchaToken, referralCode = "") {
  // 일회용 이메일 차단
  if (isDisposableEmail(email)) {
    throw new Error("일회용 이메일은 가입할 수 없습니다. 실제 이메일을 사용해주세요.");
  }

  // 이메일 정규화 후 중복 체크 (Gmail +trick 방지)
  const normalized = normalizeEmail(email);
  const { data: existing } = await supabase
    .from("users")
    .select("uid")
    .or(`email.eq.${normalized},email.eq.${email}`)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("이미 가입된 이메일입니다.");
  }

  const signUpOptions = { email, password: pw };
  if (captchaToken) signUpOptions.options = { captchaToken };
  const signUpPromise = supabase.auth.signUp(signUpOptions);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("회원가입 요청 시간이 초과됐습니다. 다시 시도해주세요.")), 30000)
  );
  const { data, error } = await Promise.race([signUpPromise, timeout]);
  if (error) throw error;

  const uid = data.user?.id;
  if (!uid) throw new Error("회원가입에 실패했습니다. 다시 시도해주세요.");

  const userData = {
    uid, email, nick,
    role:            "member",
    points:          POINTS.SIGNUP,
    referral_code:   makeReferralCode(uid),
    join_date:       new Date().toISOString(),
    last_login:      new Date().toISOString(),
    last_login_date: new Date().toLocaleDateString("ko-KR"),
    provider:        "email",
  };

  // users 테이블 insert - fire-and-forget (대기 없이 백그라운드 처리)
  (async () => { try { await insertUserWithReferralFallback(userData); } catch(e) {} })();
  if (referralCode?.trim()) {
    try { localStorage.setItem("nper_pending_referral", referralCode.trim()); } catch {}
  }

  return userData;
}

export async function processReferralSignup(user, referralCode) {
  const code = (referralCode || "").trim();
  if (!user?.uid || !code) return { ok: false };
  try {
    const token = await getAuthToken();
    if (!token) return { ok: false };
    const res = await fetch("/api/sns?action=referral-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ referral_code: code }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.user) {
      setLocalUser(data.user);
      try { localStorage.removeItem("nper_pending_referral"); } catch {}
    }
    return { ok: res.ok, ...data };
  } catch {
    return { ok: false };
  }
}

// ── Auth: 이메일 로그인 ──────────────────────────────────────────────────
export async function fbLogin(email, pw) {
  // 10초 타임아웃
  const authPromise = supabase.auth.signInWithPassword({ email, password: pw });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("로그인 요청 시간이 초과됐습니다. 다시 시도해주세요.")), 30000)
  );
  const { data, error } = await Promise.race([authPromise, timeout]);
  if (error) throw error;

  const uid = data.user.id;
  // users 테이블 조회 - 3초 타임아웃 (실패해도 로그인 진행)
  let userData = null;
  try {
    const fetchPromise = _fetchUserRow(uid);
    const fetchTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
    userData = await Promise.race([fetchPromise, fetchTimeout]);
  } catch(e) { userData = null; }

  if (!userData) {
    userData = {
      uid, email,
      nick: email.split("@")[0],
      role:            "member",
      points:          0,
      referral_code:   makeReferralCode(uid),
      join_date:       new Date().toISOString(),
      last_login:      new Date().toISOString(),
      last_login_date: new Date().toLocaleDateString("ko-KR"),
      provider:        "email",
    };
    // fire-and-forget (블로킹 없이 백그라운드 처리)
    (async () => { try { await insertUserWithReferralFallback(userData); } catch(e) {} })();
  }

  // 일일 로그인 처리 (동기 반환, DB 업데이트는 백그라운드)
  try { userData = _handleDailyLogin(userData); } catch(e) {}
  return await ensureReferralCode(userData);
}

// ── Auth: 구글 로그인 ────────────────────────────────────────────────────
export async function fbGoogleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  // OAuth는 리다이렉트 방식 → onAuthStateChange에서 후처리
}

// ── Auth: 카카오 로그인 ──────────────────────────────────────────────────
export async function fbKakaoLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  // OAuth는 리다이렉트 방식 → onAuthStateChange에서 후처리
}

// 구 카카오 흐름 호환용 (kakaoLoginRedirect, fbKakaoLogin(code) 대체)
export const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY || "";
export const KAKAO_REDIRECT = "https://snsmakeit.com/oauth/kakao";
export function kakaoLoginRedirect() {
  return fbKakaoLogin(); // Supabase OAuth로 통합
}

// ── Auth: OAuth 로그인 후 users 테이블 동기화 (onAuthStateChange에서 호출) ──
export async function syncOAuthUser(supabaseUser) {
  const uid   = supabaseUser.id;
  const email = supabaseUser.email || "";
  const nick  =
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.name ||
    supabaseUser.user_metadata?.preferred_username ||
    email.split("@")[0];
  const provider = supabaseUser.app_metadata?.provider || "oauth";

  // uid로 먼저 찾고, 없으면 email로 찾기 (기존 데이터 호환)
  let userData = await _fetchUserRow(uid);

  if (!userData && email) {
    const { data } = await supabase.from("users").select("*").eq("email", email).single();
    if (data) {
      // 기존 유저 발견 → uid를 Supabase uid로 업데이트
      await supabase.from("users").update({ uid }).eq("email", email);
      userData = { ...data, uid };
    }
  }

  if (!userData) {
    userData = {
      uid,
      email,
      nick,
      role:            "member",
      points:          POINTS.SIGNUP,
      referral_code:   makeReferralCode(uid),
      join_date:       new Date().toISOString(),
      last_login:      new Date().toISOString(),
      last_login_date: new Date().toLocaleDateString("ko-KR"),
      provider,
    };
    await insertUserWithReferralFallback(userData);
  } else {
    userData = await _handleDailyLogin(userData);
  }

  return await ensureReferralCode(userData);
}

// ── Auth: 로그아웃 ───────────────────────────────────────────────────────
export async function fbLogout() {
  // scope: "global" → 서버 세션까지 완전 삭제 (local이면 새로고침 시 재로그인됨)
  try { await supabase.auth.signOut({ scope: "global" }); } catch(e) {}
  // localStorage 세션 키 직접 제거 (완전 초기화)
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("sb-")) localStorage.removeItem(k);
    });
  } catch(e) {}
  // 로컬 유저 state도 초기화
  try { setLocalUser(null); } catch(e) {}
}

// ── DB: 유저 데이터 가져오기 ─────────────────────────────────────────────
export async function fetchUser(uid) {
  const user = await _fetchUserRow(uid);
  if (user && uid) {
    // 구독 정보 자동 첨부
    try {
      const sub = await getUserSubscription(uid);
      if (sub) user._subscription = sub;
    } catch {}
  }
  return user;
}

// ── 무제한 플랜 체크 ────────────────────────────────────────────
// 현재 공개 요금제는 모두 횟수제로 운영한다. 과거 Agency 구독자만 무제한 호환 유지.
const UNLIMITED_PLANS = ["Agency"];

// 구독 플랜별 월간 한도 (PricingPage 기준)
export const PLAN_LIMITS = {
  "Basic":    { write: 50,  video: 5,  naver: 0 },
  "Pro":      { write: 200, video: 20, naver: 3 },
  "Premium":  { write: 350, video: 35, naver: 5 },
  "Business": { write: 500, video: 50, naver: 10 },
  "Agency":   { write: 99999, video: 99999, naver: 99999 },
};

// 구독 정보 캐시
let _cachedSub = null;
let _cachedSubUid = null;
let _cachedSubTime = 0;

// 구독 상세 정보 반환 (플랜명, 한도, 상태, 갱신일 등)
export async function getUserSubscription(uid) {
  if (!uid) return null;
  if (_cachedSubUid === uid && _cachedSub && Date.now() - _cachedSubTime < 60_000) return _cachedSub;
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("product_name, status, ends_at, renews_at, monthly_limit, interval, customer_portal_url")
      .eq("uid", uid)
      .in("status", ["active", "on_trial"])
      .order("updated_at", { ascending: false })
      .limit(1);
    const sub = data?.[0] || null;
    if (sub) {
      const limits = PLAN_LIMITS[sub.product_name] || null;
      sub._limits = limits;
      sub._monthlyWriteLimit = sub.monthly_limit || limits?.write || 0;
    }
    _cachedSub = sub;
    _cachedSubUid = uid;
    _cachedSubTime = Date.now();
    return sub;
  } catch { return null; }
}

// 기존 호환: 플랜 이름만 반환
export async function getUserPlan(uid) {
  const sub = await getUserSubscription(uid);
  return sub?.product_name || null;
}

export function isUnlimitedPlan(planName) {
  return UNLIMITED_PLANS.includes(planName);
}

// 구독 캐시 무효화 (결제 완료 등)
export function invalidateSubCache() {
  _cachedSub = null;
  _cachedSubUid = null;
  _cachedSubTime = 0;
}

// ── DB: 이용 횟수 변경 (무제한 플랜은 차감 스킵, 원자적 RPC 사용) ───
export async function changePoints(uid, delta, reason) {
  if (!uid) { return 0; }
  try {
    // 무제한 플랜 체크 — 차감(delta < 0)인 경우만 스킵
    if (delta < 0) {
      const plan = await getUserPlan(uid);
      if (isUnlimitedPlan(plan)) {
        const { data: row } = await supabase.from("users").select("points").eq("uid", uid).single();
        const currentPoints = row?.points || 0;
        supabase.from("point_history").insert({
          uid, delta: 0, reason: `[무제한] ${reason || ""}`, balance: currentPoints, created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {});
        return currentPoints;
      }
    }

    // 원자적 잔액 변경 (FOR UPDATE 행 잠금으로 레이스컨디션 방지)
    const { data: newPoints, error } = await supabase.rpc("change_points_atomic", {
      p_uid: uid, p_delta: delta, p_reason: reason || "",
    });

    if (error) {
      console.error("changePoints RPC 오류:", error.message);
      // RPC 실패 시 현재 잔여 횟수 원천값 조회하여 반환
      const { data: row } = await supabase.from("users").select("points").eq("uid", uid).single();
      return row?.points || 0;
    }

    return newPoints;
  } catch(e) {
    console.error("changePoints 오류:", e.message);
    return null;
  }
}

// ── DB: 계정 공통 출석체크 ─────────────────────────────────────────────
export async function fetchAttendance(uid) {
  if (!uid) return [];
  try {
    const { data, error } = await supabase
      .from("attendance_checks")
      .select("check_date")
      .eq("uid", uid)
      .order("check_date", { ascending: true });
    if (error) throw error;
    return (data || []).map(r => r.check_date).filter(Boolean);
  } catch {
    return null;
  }
}

export async function addAttendance(uid, checkDate, points, reason) {
  if (!uid || !checkDate) return { ok: false, duplicate: false };
  try {
    const { error } = await supabase
      .from("attendance_checks")
      .insert({ uid, check_date: checkDate, points });
    if (error) {
      if (String(error.code) === "23505" || /duplicate|unique/i.test(error.message || "")) {
        return { ok: false, duplicate: true };
      }
      throw error;
    }
    const newPoints = await changePoints(uid, points, reason);
    return { ok: true, points: newPoints };
  } catch {
    return { ok: false, duplicate: false };
  }
}

// ── DB: 계정 공통 AI 보관함 ────────────────────────────────────────────
export async function fetchLibraryItems(uid, kind) {
  if (!uid) return null;
  try {
    let q = supabase
      .from("user_library_items")
      .select("item_id,kind,payload,created_at,updated_at")
      .eq("uid", uid)
      .order("updated_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(r => ({ ...(r.payload || {}), id: r.item_id || r.payload?.id, _kind: r.kind }));
  } catch {
    return null;
  }
}

export async function upsertLibraryItem(uid, kind, item) {
  if (!uid || !kind || !item?.id) return false;
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("user_library_items").upsert({
      uid,
      kind,
      item_id: String(item.id),
      payload: item,
      updated_at: now,
    }, { onConflict: "uid,kind,item_id" });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteLibraryItem(uid, kind, itemId) {
  if (!uid || !kind || !itemId) return false;
  try {
    const { error } = await supabase
      .from("user_library_items")
      .delete()
      .eq("uid", uid)
      .eq("kind", kind)
      .eq("item_id", String(itemId));
    return !error;
  } catch {
    return false;
  }
}

export async function syncLocalLibrary(uid, kind, localItems) {
  const local = Array.isArray(localItems) ? localItems : [];
  if (!uid) return local;
  const remote = await fetchLibraryItems(uid, kind);
  if (remote === null) return local;

  for (const item of local) {
    if (item?.id) upsertLibraryItem(uid, kind, item).catch?.(() => {});
  }

  const map = new Map();
  [...remote, ...local].forEach(item => {
    if (!item?.id) return;
    const key = String(item.id);
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()];
}

// ── Storage 업로드 제한 ──────────────────────────────────────────────────
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "audio/mpeg", "audio/wav",
  "application/pdf",
];

// ── Supabase Storage 파일 업로드 ─────────────────────────────────────────
export async function uploadFileToStorage(file, path, onProgress) {
  // 사이즈 제한
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`파일 크기가 ${MAX_UPLOAD_SIZE / 1024 / 1024}MB를 초과합니다.`);
  }
  // MIME 타입 검증
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("허용되지 않는 파일 형식입니다.");
  }

  if (onProgress) onProgress(10);
  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, file, { upsert: true });
  if (error) {
    if (error.message?.includes("Bucket not found") || error.statusCode === "404") {
      throw new Error("Storage 버킷이 없습니다. Supabase 대시보드 → Storage → 'uploads' 버킷을 Public으로 생성해주세요.");
    }
    if (error.message?.includes("policy") || error.statusCode === "403") {
      throw new Error("Storage 권한 오류: Supabase 대시보드 → Storage → uploads → Policies에 INSERT 정책을 추가해주세요.");
    }
    throw new Error(error.message || "파일 업로드 실패");
  }
  if (onProgress) onProgress(100);
  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
  return urlData.publicUrl;
}

/** Storage 파일 삭제 */
export async function deleteFileFromStorage(path) {
  try {
    await supabase.storage.from("uploads").remove([path]);
  } catch (e) {
    // 파일 없어도 무시
  }
}

// ── AI 사용 횟수 ──────────────────────────────────────────────────────────
export function getAiUsage() {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
    // 월간 리셋: 저장된 월과 현재 월이 다르면 카운트 초기화
    const now = new Date();
    const curMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    if (raw._month !== curMonth) {
      // 게스트 카운트는 유지, 멤버 카운트만 리셋
      const reset = { _month: curMonth, guest: raw.guest || 0 };
      localStorage.setItem(AI_KEY, JSON.stringify(reset));
      return reset;
    }
    return raw;
  } catch { return {}; }
}
export function setAiUsage(u){
  try {
    const now = new Date();
    u._month = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    localStorage.setItem(AI_KEY, JSON.stringify(u));
  } catch {}
}

export const FREE_GUEST  = 5;     // 비회원 무료
export const FREE_MEMBER = 5;     // 회원 무료 5회

export function getAiLeft(user, cost = Math.abs(POINTS.AI_USE)) {
  const usage  = getAiUsage();
  const key    = user ? "member_" + user.uid : "guest";
  const used   = usage[key] || 0;
  const limit  = user ? FREE_MEMBER : FREE_GUEST;
  const points = user ? (user.points || 0) : 0;
  const extraFromPoints = Math.floor(points / cost);

  // 구독자인 경우: 월간 한도 기반
  const sub = user?._subscription;
  if (sub && sub._monthlyWriteLimit > 0) {
    const monthlyUsed = user.monthly_used || 0;
    const monthlyLimit = sub._monthlyWriteLimit;
    const monthlyLeft = Math.max(0, monthlyLimit - monthlyUsed);
    return {
      used: monthlyUsed, limit: monthlyLimit, points,
      left: monthlyLeft,
      canUse: monthlyLeft > 0,
      isSubscriber: true,
      planName: sub.product_name,
    };
  }

  return {
    used, limit, points,
    left:   Math.max(0, limit - used) + extraFromPoints,
    canUse: (limit - used > 0) || (points >= cost),
    isSubscriber: false,
  };
}

export async function useAiOnce(user, setUserState, cost = POINTS.AI_USE, reason = "AI 생성 사용") {
  const absCost = Math.abs(cost);

  // 구독자: 월간 한도에서 차감 (RPC)
  const sub = user?._subscription;
  if (sub && sub._monthlyWriteLimit > 0 && user?.uid) {
    try {
      const { data, error } = await supabase.rpc("use_monthly_quota", {
        p_uid: user.uid,
        p_cost: 1,
        p_reason: reason,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.ok) {
        const newUser = { ...user, monthly_used: result.monthly_used };
        setLocalUser(newUser);
        setUserState(newUser);
        return true;
      }
      // monthly_exceeded → 한도 초과
      if (result?.error === "monthly_exceeded") return false;
      // no_subscription / no_limit_set → 포인트 방식 폴백
    } catch (e) {
      console.warn("useAiOnce subscription RPC failed, fallback to points:", e.message);
    }
  }

  // 비구독자 / 폴백: 기존 무료 횟수 + 포인트 방식
  const usage = getAiUsage();
  const key   = user ? "member_" + user.uid : "guest";
  const used  = usage[key] || 0;
  const limit = user ? FREE_MEMBER : FREE_GUEST;

  if (used < limit) {
    setAiUsage({ ...usage, [key]: used + 1 });
    return true;
  }
  if (user && (user.points || 0) >= absCost) {
    const delta = cost > 0 ? -cost : cost;
    const newPts = await changePoints(user.uid, delta, reason);
    const newUser = { ...user, points: newPts };
    setLocalUser(newUser);
    setUserState(newUser);
    return true;
  }
  return false;
}

// ── 게시글 작성 / 댓글 이용 횟수 ────────────────────────────────────────────
export async function awardPostPoints(user, setUserState) {
  if (!user?.uid) return;
  // 하루 10회 적립 제한 (도배 방지)
  const today = new Date().toISOString().slice(0, 10);
  const key = `nper_post_pts_${user.uid}_${today}`;
  const count = parseInt(localStorage.getItem(key) || "0", 10);
  if (count >= 10) return; // 일일 한도 초과
  localStorage.setItem(key, String(count + 1));
  const newPts  = await changePoints(user.uid, POINTS.POST_WRITE, "게시글 작성");
  const newUser = { ...user, points: newPts };
  setLocalUser(newUser);
  if (setUserState) setUserState(newUser);
}

export async function awardCommentPoints(user, setUserState) {
  if (!user?.uid) return;
  const newPts  = await changePoints(user.uid, POINTS.COMMENT, "댓글 작성");
  const newUser = { ...user, points: newPts };
  setLocalUser(newUser);
  if (setUserState) setUserState(newUser);
}

// ── 게스트 사용 즉시 증가 + 배지 업데이트 이벤트 발생 ─────────────────────
export function incrementGuestUsage() {
  try {
    const usage = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
    usage["guest"] = (usage["guest"] || 0) + 1;
    localStorage.setItem(AI_KEY, JSON.stringify(usage));
    window.dispatchEvent(new CustomEvent("guestUsageUpdate", { detail: { count: usage["guest"] } }));
  } catch(e) {}
}

// ── 게스트 사용 한도 체크 (초과 시 window 이벤트 발생 → App.jsx 팝업 표시) ─
export function guestLimitExceeded() {
  try {
    const usage = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
    if ((usage["guest"] || 0) >= FREE_GUEST) {
      window.dispatchEvent(new CustomEvent("pointsExhausted", { detail: { isGuest: true } }));
      return true;
    }
  } catch(e) {}
  return false;
}

// ── 유효성 검사 ───────────────────────────────────────────────────────────
export function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
export function genCode()       { return String(Math.floor(100000 + Math.random() * 900000)); }

// ── 게시글 CRUD (Supabase) ────────────────────────────────────────────────
// Supabase posts 테이블 컬럼: id(TEXT), title, content, author, author_uid, cat, tag, subCat, views, likes, created_at, images, comments
function rowToPost(row) {
  if (!row) return row;
  return {
    id:       row.id,
    title:    row.title || "",
    body:     row.content || "",
    nick:     row.author || row.nick || "",
    uid:      row.author_uid || "",
    cat:      row.cat || "free",
    tag:      row.tag || "",
    subCat:   row.subCat || row.cat || "",
    views:    row.views || 0,
    likes:    row.likes || 0,
    created_at: row.created_at || null,
    date:     row.created_at ? ((d) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`)(new Date(row.created_at)) : (row.date || ""),
    comments: Array.isArray(row.comments) ? row.comments : [],
    likedBy:  Array.isArray(row.likedBy) ? row.likedBy : [],
    images:   Array.isArray(row.images) ? row.images : (typeof row.images === "string" ? (() => { try { const p = JSON.parse(row.images); return Array.isArray(p) ? p : []; } catch { return []; } })() : []),
  };
}
function postToRow(post) {
  return {
    id:         String(post.id),
    title:      post.title || "",
    content:    post.body || post.content || "",
    author:     post.nick || post.author || "",
    author_uid: post.uid || post.author_uid || "",
    cat:        post.cat || "free",
    tag:        post.tag || "",
    subCat:     post.subCat || post.cat || "",
    views:      post.views || 0,
    likes:      post.likes || 0,
    created_at: post.created_at || new Date().toISOString(),
    images:     Array.isArray(post.images) ? post.images : [],
    comments:   Array.isArray(post.comments) ? post.comments : [],
  };
}

/** 전체 게시글 목록 가져오기 (content 제외 — 빠른 로딩 + 캐시) */
const POSTS_CACHE_KEY = "nper_posts_cache";
const POSTS_CACHE_TTL = 60000; // 1분 캐시

export async function getPostsFromDB() {
  // sessionStorage 캐시 확인 (1분 유효)
  try {
    const cached = sessionStorage.getItem(POSTS_CACHE_KEY);
    if (cached) {
      const { data: cachedData, ts } = JSON.parse(cached);
      if (Date.now() - ts < POSTS_CACHE_TTL && cachedData?.length > 0) {
        return cachedData;
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,author,author_uid,cat,subCat,tag,views,likes,created_at,images")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    const result = (data || []).map(rowToPost);
    // 캐시 저장
    try { sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
    return result;
  } catch (e) {
    console.error("getPostsFromDB error:", e);
    return [];
  }
}

/** 단일 게시글 전체 가져오기 (content 포함 — 글 열 때 사용) */
export async function getPostByIdFromDB(postId) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", String(postId))
      .single();
    if (error) throw error;
    return data ? rowToPost(data) : null;
  } catch (e) {
    return null;
  }
}

/** 게시글 저장 (신규) */
// 검색엔진 자동 색인 요청 (게시글 작성/수정 시 호출)
function pingSitemapAsync(postUrl) {
  try {
    const sm = encodeURIComponent("https://snsmakeit.com/sitemap.xml");
    fetch(`https://www.google.com/ping?sitemap=${sm}`).catch(() => {});
    // IndexNow (Bing/Yandex/네이버 동시 색인 요청)
    if (postUrl) {
      fetch(`/api/seo?action=index-now&url=${encodeURIComponent(postUrl)}`).catch(() => {});
    }
  } catch {}
}

function slugifyPostUrl(input) {
  return String(input || "post")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "") || "post";
}

export async function savePostToDB(post) {
  const row = postToRow(post);
  const { error } = await supabase.from("posts").insert(row);
  if (error) throw error;
  try { sessionStorage.removeItem(POSTS_CACHE_KEY); } catch {} // 캐시 무효화
  const postUrl = `/community/${row.subCat || row.cat || "info"}/post-${row.id}/${slugifyPostUrl(row.title)}`;
  pingSitemapAsync(postUrl);
}

/** 게시글 업데이트 (부분) */
export async function updatePostInDB(postId, data) {
  // body → content, nick → author 변환
  const row = {};
  if (data.body !== undefined)   row.content = data.body;
  if (data.title !== undefined)  row.title   = data.title;
  if (data.nick !== undefined)   row.author  = data.nick;
  if (data.views !== undefined)  row.views   = data.views;
  if (data.likes !== undefined)  row.likes   = data.likes;
  if (data.comments !== undefined) row.comments = data.comments;
  if (data.edited !== undefined) row.updated_at = new Date().toISOString();
  // 그 외 필드 직접 전달
  const pass = ["cat","tag","subCat","images"];
  pass.forEach(k => { if (data[k] !== undefined) row[k] = data[k]; });
  const { error } = await supabase.from("posts").update(row).eq("id", String(postId));
  if (error) throw error;
}

/** 게시글 삭제 */
export async function deletePostFromDB(postId) {
  const { error } = await supabase.from("posts").delete().eq("id", String(postId));
  if (error) throw error;
}

/** localStorage → Supabase 마이그레이션 (1회 실행용) — 배치 insert */
export async function migrateLocalPostsToDB() {
  try {
    const localPosts = getPosts();
    if (!localPosts.length) return 0;

    const { data: existing } = await supabase.from("posts").select("id");
    const existingIds = new Set((existing || []).map(p => String(p.id)));

    const toInsert = localPosts.filter(p => !existingIds.has(String(p.id)));
    if (!toInsert.length) return 0;

    // 배치 insert (50개씩)
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      await supabase.from("posts").insert(batch);
    }
    return toInsert.length;
  } catch (e) {
    console.error("migration error:", e);
    return 0;
  }
}

// ── 브랜드 키트 헬퍼 ─────────────────────────────────────────
export function getBrandKit() {
  try { return JSON.parse(localStorage.getItem("nper_brand_kit")) || null; } catch { return null; }
}
