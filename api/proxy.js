// api/proxy.js — Klipy / Pexels / Pixabay API 프록시 통합
// ?action=klipy|pexels|pixabay

const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

function setCors(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o));
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Klipy ──
async function handleKlipy(req, res) {
  const KLIPY_KEY = process.env.KLIPY_KEY;
  if (!KLIPY_KEY) return res.status(500).json({ error: "KLIPY_KEY 미설정" });

  // path: gifs/search, gifs/trending, stickers/search, etc.
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: "path 필요" });

  const params = new URLSearchParams(req.query);
  params.delete("path");
  params.delete("action");

  try {
    const r = await fetch(`https://api.klipy.com/api/v1/${KLIPY_KEY}/${path}?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return res.status(r.status).json({ error: `Klipy API error: ${r.status}` });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Klipy API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Pexels ──
async function handlePexels(req, res) {
  const PEXELS_KEY = process.env.PEXELS_KEY;
  if (!PEXELS_KEY) return res.status(500).json({ error: "PEXELS_KEY 미설정" });

  // path: v1/search, v1/curated, videos/search, videos/popular
  const path = req.query.path || "v1/search";
  const params = new URLSearchParams(req.query);
  params.delete("path");
  params.delete("action");

  try {
    const r = await fetch(`https://api.pexels.com/${path}?${params.toString()}`, {
      headers: { Authorization: PEXELS_KEY },
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Pexels API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Pixabay ──
async function handlePixabay(req, res) {
  const PIXABAY_KEY = process.env.PIXABAY_KEY;
  if (!PIXABAY_KEY) return res.status(500).json({ error: "PIXABAY_KEY 미설정" });

  // 쿼리 파라미터 전달 (key 제외)
  const params = new URLSearchParams(req.query);
  params.delete("key");
  params.set("key", PIXABAY_KEY);
  params.delete("action");

  const endpoint = req.query.video === "true" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
  params.delete("video");

  try {
    const r = await fetch(`${endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Pixabay API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Router ──
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;

  switch (action) {
    case "klipy":
      return handleKlipy(req, res);
    case "pexels":
      return handlePexels(req, res);
    case "pixabay":
      return handlePixabay(req, res);
    default:
      return res.status(400).json({ error: "action 파라미터 필요: klipy|pexels|pixabay" });
  }
}
