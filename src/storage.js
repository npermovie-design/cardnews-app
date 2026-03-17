/* ═══════════════════════════════════════════════════════════
   storage.js  ·  Firebase Realtime DB + 포인트 시스템
   ═══════════════════════════════════════════════════════════ */

// ── Firebase SDK (CDN 없이 npm 방식) ──────────────────────────────────────
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  onValue,
  serverTimestamp,
} from "firebase/database";

// ── Firebase Config ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyClm3wjA2za73xEvIPjmFDtw6PYwKnCjHk",
  authDomain:        "nper-chat.firebaseapp.com",
  databaseURL:       "https://nper-chat-default-rtdb.firebaseio.com",
  projectId:         "nper-chat",
  storageBucket:     "nper-chat.firebasestorage.app",
  messagingSenderId: "749917860492",
  appId:             "1:749917860492:web:f3bed6ab1ea2fcf20ac1a9",
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

export { auth, db };

// ── 포인트 상수 ───────────────────────────────────────────────────────────
export const POINTS = {
  SIGNUP:      200,  // 가입 시 (Free 플랜 200 크레딧)
  DAILY_LOGIN: 3,    // 일일 로그인
  POST_WRITE:  1,    // 게시글 작성
  COMMENT:     0,    // 댓글 작성 (적립 없음)
  AI_USE:      -10,  // AI 생성 1회 (블로그/카드뉴스)
  AI_IMG_USE:  -30,  // AI 이미지 생성 1회 (상세페이지 슬라이드 1장)
};

export const PLANS = [
  {
    id: "free", type: "subscription",
    name: "Free", price: 0, priceUSD: 0,
    credits: 200, label: "무료",
    color: "#888", gradient: "linear-gradient(135deg,#555,#333)",
    features: ["200 크레딧", "회원가입 시 200 크레딧 무료", "5분당 1회 생성 제한", "한 번에 1장 생성 가능", "AI 업스케일링", "고해상도 변환"],
    btnLabel: "현재 플랜", highlight: false,
  },
  {
    id: "basic", type: "subscription",
    name: "Basic", price: 9900, priceUSD: 9,
    credits: 4500, label: "₩9,900/월",
    color: "#4ade80", gradient: "linear-gradient(135deg,#14532d,#166534)",
    badge: "연세 플랜",
    features: ["4,500 크레딧", "⚡ 생성 쿨타임 없음", "한 번에 4장까지 생성 가능", "AI 업스케일링", "피부보정(기본)", "고해상도 변환", "실시간 처리"],
    btnLabel: "구독하기", highlight: false,
  },
  {
    id: "deluxe", type: "subscription",
    name: "Deluxe", price: 19900, priceUSD: 19,
    credits: 9500, label: "₩19,900/월",
    color: "#38bdf8", gradient: "linear-gradient(135deg,#0c4a6e,#0369a1)",
    badge: "추천",
    features: ["9,500 크레딧", "⚡ 생성 쿨타임 없음", "한 번에 4장까지 생성 가능", "AI 업스케일링", "피부보정(기본)", "피부보정(메이크업)", "고해상도 변환", "실시간 처리", "무제한 업로드"],
    btnLabel: "구독하기", highlight: true,
  },
  {
    id: "premium", type: "subscription",
    name: "Premium", price: 29900, priceUSD: 29,
    credits: 14500, label: "₩29,900/월",
    color: "#f59e0b", gradient: "linear-gradient(135deg,#78350f,#92400e)",
    features: ["14,500 크레딧", "⚡ 생성 쿨타임 없음", "한 번에 4장까지 생성 가능", "AI 업스케일링", "피부보정(기본)", "피부보정(메이크업)", "고해상도 변환", "실시간 처리", "무제한 업로드", "베타기능(무료)"],
    btnLabel: "구독하기", highlight: false,
  },
];

// 단건 구매 패키지
export const CREDIT_PACKS = [
  { id: "pack5",  priceUSD: 5,  price: 6900,  credits: 1500, label: "₩6,900"  },
  { id: "pack10", priceUSD: 10, price: 13900, credits: 3000, label: "₩13,900" },
  { id: "pack15", priceUSD: 15, price: 20900, credits: 4800, label: "₩20,900" },
  { id: "pack20", priceUSD: 20, price: 27900, credits: 6450, label: "₩27,900" },
  { id: "pack30", priceUSD: 30, price: 41900, credits: 9750, label: "₩41,900" },
];


// ── 게시판 카테고리 ───────────────────────────────────────────────────────
export const CATS = [
  { id: "ai",      label: "AI & 프로그램 정보", icon: "🤖" },
  { id: "news",    label: "뉴스소식",            icon: "📰" },
  { id: "archive", label: "자료실",              icon: "📁" },
  { id: "qna",     label: "질문답변",            icon: "💬" },
];

// ── 레거시 로컬스토리지 (게시글 등 기존 데이터 호환) ─────────────────────
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

// getUser / setUser 는 로컬스토리지 래퍼 (App.jsx 호환 유지)
export function getUser()        { return getLocalUser(); }
export function setUser(u)       { setLocalUser(u); }

// ── Firebase Auth 헬퍼 ────────────────────────────────────────────────────

/** 회원가입: Firebase Auth + DB에 유저 문서 생성 */
export async function fbRegister(email, pw, nick) {
  const cred = await createUserWithEmailAndPassword(auth, email, pw);
  await updateProfile(cred.user, { displayName: nick });
  const uid = cred.user.uid;
  const userData = {
    uid,
    email,
    nick,
    role:     "member",
    points:   POINTS.SIGNUP,
    joinDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    lastLoginDate: new Date().toLocaleDateString("ko-KR"),
  };
  await set(ref(db, "users/" + uid), userData);
  return userData;
}

/** 로그인: Firebase Auth + DB에서 유저 데이터 가져오기 + 일일 로그인 포인트 */
export async function fbLogin(email, pw) {
  const cred = await signInWithEmailAndPassword(auth, email, pw);
  const uid  = cred.user.uid;
  const snap = await get(ref(db, "users/" + uid));
  let userData = snap.exists() ? snap.val() : { uid, email, nick: cred.user.displayName || email, role: "member", points: 0 };

  // 일일 로그인 포인트 (하루 1회)
  const today = new Date().toLocaleDateString("ko-KR");
  if (userData.lastLoginDate !== today) {
    userData.points       = (userData.points || 0) + POINTS.DAILY_LOGIN;
    userData.lastLoginDate = today;
    userData.lastLogin     = new Date().toISOString();
    await update(ref(db, "users/" + uid), {
      points:        userData.points,
      lastLoginDate: today,
      lastLogin:     userData.lastLogin,
    });
  }
  return userData;
}


/** 카카오 로그인 */
export const KAKAO_REST_KEY = "4d0f0128951fe2ff52b47d4243b1480e";
export const KAKAO_REDIRECT = "https://www.snsmakeit.com/oauth/kakao";

export function kakaoLoginRedirect() {
  const url = "https://kauth.kakao.com/oauth/authorize"
    + "?client_id=" + KAKAO_REST_KEY
    + "&redirect_uri=" + encodeURIComponent(KAKAO_REDIRECT)
    + "&response_type=code"
    + "&prompt=login";
  // 팝업으로 열기
  const popup = window.open(url, "kakaoLogin", "width=500,height=600,left=" + ((window.screen.width-500)/2) + ",top=" + ((window.screen.height-600)/2));
  return popup;
}

/** 카카오 토큰 교환 + Firebase 커스텀 토큰 로그인 (팝업 콜백 처리) */
export async function fbKakaoLogin(code) {
  // 1. 카카오 토큰 교환
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      client_id:    KAKAO_REST_KEY,
      redirect_uri: KAKAO_REDIRECT,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("카카오 토큰 발급 실패");

  // 2. 카카오 유저 정보
  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: "Bearer " + tokenData.access_token },
  });
  const kakaoUser = await userRes.json();
  const kakaoId   = String(kakaoUser.id);
  const nick      = kakaoUser.kakao_account?.profile?.nickname || "카카오유저";
  const email     = kakaoUser.kakao_account?.email || (kakaoId + "@kakao.nper");

  // 3. Firebase DB에 유저 저장 (uid = "kakao_" + kakaoId)
  const uid  = "kakao_" + kakaoId;
  const snap = await get(ref(db, "users/" + uid));
  let userData;

  if (snap.exists()) {
    userData = snap.val();
    const today = new Date().toLocaleDateString("ko-KR");
    if (userData.lastLoginDate !== today) {
      userData.points        = (userData.points || 0) + POINTS.DAILY_LOGIN;
      userData.lastLoginDate = today;
      userData.lastLogin     = new Date().toISOString();
      await update(ref(db, "users/" + uid), {
        points: userData.points, lastLoginDate: today, lastLogin: userData.lastLogin,
      });
    }
  } else {
    userData = {
      uid, email, nick,
      role:          "member",
      points:        POINTS.SIGNUP,
      joinDate:      new Date().toISOString(),
      lastLogin:     new Date().toISOString(),
      lastLoginDate: new Date().toLocaleDateString("ko-KR"),
      provider:      "kakao",
    };
    await set(ref(db, "users/" + uid), userData);
  }
  return userData;
}

/** 구글 로그인/회원가입 */
export async function fbGoogleLogin() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const uid  = cred.user.uid;
  const snap = await get(ref(db, "users/" + uid));

  if (snap.exists()) {
    // 기존 유저 → 로그인
    let userData = snap.val();
    const today = new Date().toLocaleDateString("ko-KR");
    if (userData.lastLoginDate !== today) {
      userData.points       = (userData.points || 0) + POINTS.DAILY_LOGIN;
      userData.lastLoginDate = today;
      userData.lastLogin     = new Date().toISOString();
      await update(ref(db, "users/" + uid), {
        points: userData.points, lastLoginDate: today, lastLogin: userData.lastLogin,
      });
    }
    return userData;
  } else {
    // 신규 유저 → 자동 가입
    const nick = cred.user.displayName || cred.user.email.split("@")[0];
    const userData = {
      uid,
      email:         cred.user.email,
      nick,
      role:          "member",
      points:        POINTS.SIGNUP,
      joinDate:      new Date().toISOString(),
      lastLogin:     new Date().toISOString(),
      lastLoginDate: new Date().toLocaleDateString("ko-KR"),
      provider:      "google",
    };
    await set(ref(db, "users/" + uid), userData);
    return userData;
  }
}

/** 로그아웃 */
export async function fbLogout() {
  await signOut(auth);
}

/** DB에서 최신 유저 데이터 가져오기 */
export async function fetchUser(uid) {
  const snap = await get(ref(db, "users/" + uid));
  return snap.exists() ? snap.val() : null;
}

/** 포인트 변경 */
export async function changePoints(uid, delta, reason) {
  const snap = await get(ref(db, "users/" + uid));
  if (!snap.exists()) return;
  const current = snap.val().points || 0;
  const newPts  = Math.max(0, current + delta);
  await update(ref(db, "users/" + uid), { points: newPts });
  // 포인트 히스토리 기록
  await push(ref(db, "pointHistory/" + uid), {
    delta,
    reason,
    balance: newPts,
    at: new Date().toISOString(),
  });
  return newPts;
}

// ── AI 사용 횟수 (Firebase 기반) ──────────────────────────────────────────
export function getAiUsage() { try { return JSON.parse(localStorage.getItem(AI_KEY) || "{}"); } catch { return {}; } }
export function setAiUsage(u){ try { localStorage.setItem(AI_KEY, JSON.stringify(u)); } catch {} }

export const FREE_GUEST  = 5;
export const FREE_MEMBER = 20;
export const CREDIT_PER_TEXT_AI  = 10;   // 블로그/카드뉴스 1회
export const CREDIT_PER_IMG_SLIDE = 30;  // 상세페이지 슬라이드 1장

export function getAiLeft(user) {
  const usage  = getAiUsage();
  const key    = user ? "member_" + user.uid : "guest";
  const used   = usage[key] || 0;
  const limit  = user ? FREE_MEMBER : FREE_GUEST;
  const points = user ? (user.points || 0) : 0;
  const extraFromPoints = Math.floor(points / Math.abs(POINTS.AI_USE));
  return {
    used, limit,
    left: Math.max(0, limit - used) + extraFromPoints,
    canUse: (limit - used > 0) || (points >= Math.abs(POINTS.AI_USE)),
  };
}

export async function useAiOnce(user, setUserState) {
  const usage = getAiUsage();
  const key   = user ? "member_" + user.uid : "guest";
  const used  = usage[key] || 0;
  const limit = user ? FREE_MEMBER : FREE_GUEST;

  if (used < limit) {
    setAiUsage({ ...usage, [key]: used + 1 });
    return true;
  }
  if (user && (user.points || 0) >= Math.abs(POINTS.AI_USE)) {
    const newPts = await changePoints(user.uid, POINTS.AI_USE, "AI 생성 사용");
    const newUser = { ...user, points: newPts };
    setLocalUser(newUser);
    setUserState(newUser);
    return true;
  }
  return false;
}

// ── 게시글 작성 포인트 ────────────────────────────────────────────────────
export async function awardPostPoints(user, setUserState) {
  if (!user || !user.uid) return;
  const newPts = await changePoints(user.uid, POINTS.POST_WRITE, "게시글 작성");
  const newUser = { ...user, points: newPts };
  setLocalUser(newUser);
  if (setUserState) setUserState(newUser);
}

export async function awardCommentPoints(user, setUserState) {
  if (!user || !user.uid) return;
  const newPts = await changePoints(user.uid, POINTS.COMMENT, "댓글 작성");
  const newUser = { ...user, points: newPts };
  setLocalUser(newUser);
  if (setUserState) setUserState(newUser);
}

// ── 유효성 검사 ───────────────────────────────────────────────────────────
export function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
export function genCode()       { return String(Math.floor(100000 + Math.random() * 900000)); }
