/* ═══════════════════════════════════════════════════════════
   Klipy API Client – GIF/스티커/클립/밈/AI이모지
   (서버 프록시를 통해 API 키 보호)
═══════════════════════════════════════════════════════════ */

function uid() {
  try { return localStorage.getItem("klipy_uid") || (() => { const id = "u_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("klipy_uid", id); return id; })(); }
  catch { return "anon"; }
}

async function call(path, params = {}) {
  const q = new URLSearchParams({ path, customer_id: uid(), per_page: "24", locale: "kr", ...params });
  const res = await fetch(`/api/proxy-klipy?${q}`);
  if (!res.ok) throw new Error(`Klipy API error: ${res.status}`);
  const json = await res.json();
  return json.data || json;
}

// ── GIF ────────────────────────────────────────────────
export async function searchGifs(query, page = 1) {
  return call("gifs/search", { q: query, page });
}
export async function trendingGifs(page = 1) {
  return call("gifs/trending", { page });
}

// ── 스티커 ─────────────────────────────────────────────
export async function searchStickers(query, page = 1) {
  return call("stickers/search", { q: query, page });
}
export async function trendingStickers(page = 1) {
  return call("stickers/trending", { page });
}

// ── 클립 (짧은 영상) ──────────────────────────────────
export async function searchClips(query, page = 1) {
  return call("clips/search", { q: query, page });
}
export async function trendingClips(page = 1) {
  return call("clips/trending", { page });
}

// ── 밈 ─────────────────────────────────────────────────
export async function searchMemes(query, page = 1) {
  return call("static-memes/search", { q: query, page });
}
export async function trendingMemes(page = 1) {
  return call("static-memes/trending", { page });
}

// ── AI 이모지 ──────────────────────────────────────────
export async function searchEmojis(query, page = 1) {
  return call("emojis/search", { q: query, page });
}
export async function trendingEmojis(page = 1) {
  return call("emojis/trending", { page });
}

// ── 자동완성 ───────────────────────────────────────────
export async function autocomplete(query) {
  return call(`autocomplete/${encodeURIComponent(query)}`);
}

// ── 유틸: 미디어 URL 추출 ─────────────────────────────
export function getMediaUrl(item, size = "md") {
  const f = item?.file?.[size] || item?.file?.md || item?.file?.sm;
  if (!f) return null;
  // webp > gif > mp4 > jpg 우선순위
  return f.webp?.url || f.gif?.url || f.mp4?.url || f.jpg?.url || null;
}

export function getVideoUrl(item, size = "md") {
  const f = item?.file?.[size] || item?.file?.md;
  return f?.mp4?.url || f?.webm?.url || null;
}

export function getPreviewUrl(item) {
  return getMediaUrl(item, "sm") || getMediaUrl(item, "xs");
}
