// lib/security.js — 공통 보안 헬퍼
import { createClient } from "@supabase/supabase-js";

// ── CORS ──
const ALLOWED_ORIGINS = [
  "https://snsmakeit.com",
  "https://www.snsmakeit.com",
];

// Vercel Preview URL 패턴 (프로젝트 고유)
const VERCEL_PREVIEW_RE = /^https:\/\/sns-?makeit[a-z0-9-]*\.vercel\.app$/;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  // 로컬 개발 (NODE_ENV=development만)
  if (process.env.NODE_ENV === "development" && origin.includes("localhost")) return true;
  return false;
}

export function setCors(req, res, { methods = "GET,POST,OPTIONS" } = {}) {
  const origin = req.headers?.origin || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ── 인증: Bearer token → uid 검증 ──
let _supabaseClient = null;
function getAnonClient() {
  if (!_supabaseClient) {
    _supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ""
    );
  }
  return _supabaseClient;
}

export async function verifyUid(req) {
  const authHeader = req.headers?.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  try {
    const { data: { user } } = await getAnonClient().auth.getUser(authHeader.replace("Bearer ", ""));
    return user?.id || null;
  } catch { return null; }
}

// uid 파라미터가 토큰의 uid와 일치하는지 검증
export async function requireAuth(req, res, bodyUid = null) {
  const tokenUid = await verifyUid(req);
  if (!tokenUid) {
    res.status(401).json({ error: "로그인이 필요합니다" });
    return null;
  }
  // bodyUid가 제공되면 일치 여부 확인 (권한 상승 방지)
  if (bodyUid && bodyUid !== tokenUid) {
    res.status(403).json({ error: "권한이 없습니다" });
    return null;
  }
  return tokenUid;
}

// ── Rate Limiting (인메모리, Vercel Serverless 환경) ──
const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

export function rateLimit(req, { limit = 30, windowMs = 60000, keyFn } = {}) {
  // 주기적 정리
  if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
    const cutoff = Date.now() - windowMs * 2;
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < cutoff) rateLimitMap.delete(k);
    }
    lastCleanup = Date.now();
  }

  const key = keyFn
    ? keyFn(req)
    : (req.headers?.["x-real-ip"] || req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown");

  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  rateLimitMap.set(key, entry);

  return entry.count <= limit;
}

// ── 안전한 에러 응답 ──
export function safeError(res, status, publicMsg, internalDetail = "") {
  if (internalDetail) console.error(`[API Error] ${publicMsg}: ${internalDetail}`);
  return res.status(status).json({ error: publicMsg });
}

// ── SSRF 방지 URL 검증 ──
export function isBlockedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return true;
    const host = u.hostname.toLowerCase();
    // 로컬/내부 IP 차단
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "0.0.0.0") return true;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("172.")) return true;
    if (host.endsWith(".local") || host.endsWith(".internal")) return true;
    // 메타데이터 엔드포인트
    if (host === "169.254.169.254" || host === "metadata.google.internal") return true;
    // 127.x.x.x 변형
    if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}
