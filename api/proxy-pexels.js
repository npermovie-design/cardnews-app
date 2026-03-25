// api/proxy-pexels.js — Pexels API 프록시 (API 키 서버 보관)
const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o));
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const PEXELS_KEY = process.env.PEXELS_KEY;
  if (!PEXELS_KEY) return res.status(500).json({ error: "PEXELS_KEY 미설정" });

  // path: v1/search, v1/curated, videos/search, videos/popular
  const path = req.query.path || "v1/search";
  const params = new URLSearchParams(req.query);
  params.delete("path");

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
