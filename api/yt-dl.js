// api/yt-dl.js — 유튜브 영상 정보 조회 (youtube-info 프록시 + oEmbed 폴백)
const INVIDIOUS = [
  "https://invidious.io.lol",
  "https://yt.cdaut.de",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
];

function extractId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  const id = extractId(url);
  if (!id) return res.status(400).json({ error: "유효하지 않은 YouTube URL" });

  // 1) Invidious API 시도
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (r.ok) {
        const d = await r.json();
        if (!d.error && d.title) {
          return res.status(200).json({
            title: d.title,
            thumbnail: d.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            duration: d.lengthSeconds || 0,
            id,
            source: "invidious",
          });
        }
      }
    } catch {}
  }

  // 2) oEmbed 폴백
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      return res.status(200).json({
        title: d.title || "",
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration: 0,
        id,
        source: "oembed",
      });
    }
  } catch {}

  return res.status(500).json({ error: "영상 정보를 불러올 수 없습니다." });
}
