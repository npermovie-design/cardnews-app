/* ── 로컬스토리지 키 ── */
export const POSTS_KEY   = "nper_posts_v2";
export const USER_KEY    = "nper_user";
export const AI_KEY      = "nper_ai_usage";
export const MEMBERS_KEY = "nper_members";

export const FREE_GUEST  = 5;
export const FREE_MEMBER = 20;

/* ── 게시판 카테고리 ── */
export const CATS = [
  { id: "ai",      label: "AI & 프로그램 정보", icon: "🤖" },
  { id: "news",    label: "뉴스소식",           icon: "📰" },
  { id: "archive", label: "자료실",             icon: "📁" },
  { id: "qna",     label: "질문답변",           icon: "💬" },
];

/* ── 헬퍼 ── */
export function getUser()    { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } }
export function setUser(u)   { try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch {} }
export function getAiUsage() { try { return JSON.parse(localStorage.getItem(AI_KEY) || "{}"); } catch { return {}; } }
export function setAiUsage(u){ try { localStorage.setItem(AI_KEY, JSON.stringify(u)); } catch {} }
export function getPosts()   { try { return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]"); } catch { return []; } }
export function setPosts(p)  { try { localStorage.setItem(POSTS_KEY, JSON.stringify(p)); } catch {} }
export function getMembers() { try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || "[]"); } catch { return []; } }
export function saveMembers(m){ try { localStorage.setItem(MEMBERS_KEY, JSON.stringify(m)); } catch {} }

/* ── AI 사용 횟수 ── */
export function getAiLeft(user) {
  const usage = getAiUsage();
  const key   = user ? "member_" + user.id : "guest";
  const used  = usage[key] || 0;
  const limit = user ? FREE_MEMBER : FREE_GUEST;
  const points = user ? (user.points || 0) : 0;
  return {
    used, limit,
    left: Math.max(0, limit - used) + Math.floor(points / 10),
    canUse: (limit - used > 0) || (points >= 10),
  };
}
export function useAiOnce(user, setUserState) {
  const usage = getAiUsage();
  const key   = user ? "member_" + user.id : "guest";
  const used  = usage[key] || 0;
  const limit = user ? FREE_MEMBER : FREE_GUEST;
  if (used < limit) { setAiUsage({ ...usage, [key]: used + 1 }); return true; }
  if (user && (user.points || 0) >= 10) {
    const newUser = { ...user, points: (user.points || 0) - 10 };
    setUser(newUser); setUserState(newUser);
    return true;
  }
  return false;
}

/* ── 이메일 검증 ── */
export function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
export function genCode()       { return String(Math.floor(100000 + Math.random() * 900000)); }
