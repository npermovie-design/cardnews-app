/* ═══════════════════════════════════════════════════════════
   storage.js  ·  Supabase DB + Auth + 포인트 시스템
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

// ── 포인트 상수 (API 실비용 반영) ─────────────────────────────────────────
export const POINTS = {
  SIGNUP:      100,    // 회원가입 보너스
  DAILY_LOGIN: 3,      // 일일 로그인 (출석체크 +3P)
  POST_WRITE:  2,      // 게시글 작성 (+2P)
  COMMENT:     0,      // 댓글 작성
  AI_USE:      -10,    // 기본 텍스트 생성 (Haiku) — cost ~7원
  AI_SONNET:   -35,    // 고급 텍스트 생성 (Sonnet) — cost ~42원
  IMAGE_GEN:   -80,    // 이미지 생성 (AI 이미지) — cost ~100원
  PPT_GEN:     -25,    // PPT 1덱 생성 — cost ~15원
  VIDEO_ANALYZE: -35,  // 영상 AI 분석 — cost ~30원
  VIDEO_GEN:   -15,    // 영상 생성 기본 (15초 이하) — cost ~10원
  VIDEO_GEN_30: -25,   // 영상 생성 (30초) — cost ~20원
  VIDEO_GEN_60: -40,   // 영상 생성 (60초+) — cost ~30원
  // AI 채팅 — 모델별 차감
  CHAT_HAIKU:    -5,   // Claude Haiku 채팅 — cost ~3원
  CHAT_SONNET:  -15,   // Claude Sonnet 채팅 — cost ~15원
  CHAT_GPT4O_MINI: -5, // GPT-4o Mini — cost ~3원
  CHAT_GPT4O:   -20,   // GPT-4o — cost ~25원
  CHAT_GEMINI_FLASH: -3, // Gemini Flash — cost ~2원
  CHAT_GEMINI_PRO: -15, // Gemini Pro — cost ~15원
};

// 채팅 모델 → 포인트 매핑
export const CHAT_COST = {
  "claude-haiku-4-5": POINTS.CHAT_HAIKU,
  "claude-sonnet-4-5": POINTS.CHAT_SONNET,
  "gpt-4o-mini": POINTS.CHAT_GPT4O_MINI,
  "gpt-4o": POINTS.CHAT_GPT4O,
  "gemini-2.5-flash": POINTS.CHAT_GEMINI_FLASH,
  "gemini-2.5-pro": POINTS.CHAT_GEMINI_PRO,
};

// 단건 충전 플랜 (PricingPage.jsx의 ONE_OFF_PLANS과 동기화)
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    points: 0,
    label: "무료",
    color: "#888",
    features: ["가입 시 100P 지급", "비회원 5회 무료 체험", "매일 출석 +3P", "포인트 소진 시 충전 필요"],
    btnLabel: "무료 체험",
    highlight: false,
  },
  {
    id: "pack1",
    name: "Starter",
    price: 5900,
    points: 1000,
    label: "5,900원",
    color: "#4ade80",
    features: ["1,000P 충전", "텍스트 100회 분량", "유효기간 없음", "모든 기능 이용 가능"],
    btnLabel: "충전하기",
    highlight: false,
    badge: "입문",
  },
  {
    id: "pack3",
    name: "Standard",
    price: 19900,
    points: 3500,
    label: "19,900원",
    color: "#7c6aff",
    features: ["3,500P 충전 (1P당 5.7원)", "텍스트 350회 · 이미지 70회 분량", "모든 기능 이용 가능", "SNS 자동 발행"],
    btnLabel: "충전하기",
    highlight: true,
    badge: "추천",
  },
  {
    id: "pack5",
    name: "Pro",
    price: 49900,
    points: 9500,
    label: "49,900원",
    color: "#f59e0b",
    features: ["9,500P 충전 (1P당 5.3원)", "텍스트 950회 · 이미지 190회 분량", "모든 기능 이용 가능", "우선 고객지원"],
    btnLabel: "충전하기",
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

// ── 내부 헬퍼: users 테이블에서 유저 가져오기 ────────────────────────────
async function _fetchUserRow(uid) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", uid)
    .single();
  if (error) return null;
  return data;
}

// ── 내부 헬퍼: 일일 로그인 포인트 처리 (fire-and-forget) ─────────────────
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
              uid: userData.uid, delta: POINTS.DAILY_LOGIN, reason: "일일 로그인",
              balance: newPoints, created_at: new Date().toISOString(),
            });
          }
        } catch(e) {}
      })();
      // 로컬 userData는 즉시 업데이트
      userData = { ...userData, points: newPoints, last_login_date: today };
    }
  } catch(e) {
    console.warn("일일 로그인 포인트 처리 실패:", e.message);
  }
  return userData;
}

// ── Auth: 이메일 회원가입 ─────────────────────────────────────────────────
export async function fbRegister(email, pw, nick, captchaToken) {
  // 10초 타임아웃
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
    join_date:       new Date().toISOString(),
    last_login:      new Date().toISOString(),
    last_login_date: new Date().toLocaleDateString("ko-KR"),
    provider:        "email",
  };

  // users 테이블 insert - fire-and-forget (대기 없이 백그라운드 처리)
  (async () => { try { await supabase.from("users").insert(userData); } catch(e) {} })();

  return userData;
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
      join_date:       new Date().toISOString(),
      last_login:      new Date().toISOString(),
      last_login_date: new Date().toLocaleDateString("ko-KR"),
      provider:        "email",
    };
    // fire-and-forget (블로킹 없이 백그라운드 처리)
    (async () => { try { await supabase.from("users").insert(userData); } catch(e) {} })();
  }

  // 일일 로그인 처리 (동기 반환, DB 업데이트는 백그라운드)
  try { userData = _handleDailyLogin(userData); } catch(e) {}
  return userData;
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
      join_date:       new Date().toISOString(),
      last_login:      new Date().toISOString(),
      last_login_date: new Date().toLocaleDateString("ko-KR"),
      provider,
    };
    await supabase.from("users").insert(userData);
  } else {
    userData = await _handleDailyLogin(userData);
  }

  return userData;
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
  return await _fetchUserRow(uid);
}

// ── DB: 포인트 변경 (Supabase RPC 함수 사용 - 단 1회 호출로 차감+내역 동시 처리) ─
export async function changePoints(uid, delta, reason) {
  if (!uid) { console.warn("changePoints: uid 없음"); return 0; }
  try {
    // 읽기 + 쓰기
    const { data: row } = await supabase.from("users").select("points").eq("uid", uid).single();
    const currentPoints = row?.points || 0;

    // 차감 시 잔액 부족하면 거부
    if (delta < 0 && currentPoints < Math.abs(delta)) {
      console.warn("changePoints: 포인트 부족", currentPoints, delta);
      return currentPoints;
    }

    const newPoints = Math.max(0, currentPoints + delta);
    const { error } = await supabase.from("users").update({ points: newPoints }).eq("uid", uid);
    if (error) {
      console.warn("changePoints 업데이트 실패:", error.message);
      return currentPoints;
    }

    // point_history 기록
    supabase.from("point_history").insert({
      uid, delta, reason: reason || "", balance: newPoints, created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});

    return newPoints;
  } catch(e) {
    console.error("changePoints 오류:", e.message);
    return null;
  }
}

// ── Supabase Storage 파일 업로드 ─────────────────────────────────────────
export async function uploadFileToStorage(file, path, onProgress) {
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

export const FREE_GUEST  = 3;     // 비회원 무료
export const FREE_MEMBER = 5;     // 회원 무료 5회

export function getAiLeft(user, cost = Math.abs(POINTS.AI_USE)) {
  const usage  = getAiUsage();
  const key    = user ? "member_" + user.uid : "guest";
  const used   = usage[key] || 0;
  const limit  = user ? FREE_MEMBER : FREE_GUEST;
  const points = user ? (user.points || 0) : 0;
  const extraFromPoints = Math.floor(points / cost);
  return {
    used, limit, points,
    left:   Math.max(0, limit - used) + extraFromPoints,
    canUse: (limit - used > 0) || (points >= cost),
  };
}

export async function useAiOnce(user, setUserState, cost = POINTS.AI_USE, reason = "AI 생성 사용") {
  const absCost = Math.abs(cost);
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

// ── 게시글 작성 / 댓글 포인트 ────────────────────────────────────────────
export async function awardPostPoints(user, setUserState) {
  if (!user?.uid) return;
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
    date:     row.created_at ? new Date(row.created_at).toLocaleDateString("ko-KR") : (row.date || ""),
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
      .order("id", { ascending: false })
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

export async function savePostToDB(post) {
  const row = postToRow(post);
  const { error } = await supabase.from("posts").insert(row);
  if (error) throw error;
  try { sessionStorage.removeItem(POSTS_CACHE_KEY); } catch {} // 캐시 무효화
  const postUrl = `/community/${row.subCat || row.cat || "info"}/post-${row.id}`;
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
