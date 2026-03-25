// api/proxy-pixabay.js — Pixabay API 프록시 (API 키 서버 보관)
const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const allowedOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o));
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin || ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const PIXABAY_KEY = process.env.PIXABAY_KEY;
  if (!PIXABAY_KEY) return res.status(500).json({ error: "PIXABAY_KEY 미설정" });

  // 쿼리 파라미터 전달 (key 제외)
  const params = new URLSearchParams(req.query);
  params.delete("key");
  params.set("key", PIXABAY_KEY);

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
