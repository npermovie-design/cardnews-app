// api/proxy-klipy.js — Klipy API 프록시 (API 키 서버 보관)
const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o));
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const KLIPY_KEY = process.env.KLIPY_KEY;
  if (!KLIPY_KEY) return res.status(500).json({ error: "KLIPY_KEY 미설정" });

  // path: gifs/search, gifs/trending, stickers/search, etc.
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: "path 필요" });

  const params = new URLSearchParams(req.query);
  params.delete("path");

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
