// api/youtube-info.js — 유튜브 영상 정보 (ytdl → Invidious 폴백)
import ytdl from "@distube/ytdl-core";

const INVIDIOUS = [
  "https://invidious.io.lol",
  "https://yt.cdaut.de",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
];

function extractId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);
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

  // 1) ytdl-core 시도
  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      },
    });
    const vid = info.videoDetails;
    const formats = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const best = formats[0] || info.formats.find(f => f.hasVideo && f.hasAudio);

    return res.status(200).json({
      title:     vid.title,
      thumbnail: vid.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration:  parseInt(vid.lengthSeconds),
      id,
      streamUrl: best?.url || null,
      quality:   best?.qualityLabel || null,
      source:    "ytdl",
    });
  } catch (e) {
    console.log("ytdl failed:", e.message?.slice(0, 100));
  }

  // 2) Invidious API 폴백
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!r.ok) continue;

      const data = await r.json();
      if (data.error) continue;

      // formatStreams: 오디오+비디오 합본 (보통 360p, 720p)
      const streams = (data.formatStreams || []).filter(f => f.container === "mp4");
      const best = streams.find(f => f.qualityLabel === "720p") || streams[0];

      // adaptiveFormats에서 합본 찾기
      const adaptives = (data.adaptiveFormats || []).filter(f => f.type?.includes("mp4") && f.fps);

      return res.status(200).json({
        title:     data.title,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration:  data.lengthSeconds,
        id,
        streamUrl: best ? `${base}${best.url}` : null,
        quality:   best?.qualityLabel || null,
        source:    "invidious",
        invidiousBase: base,
      });
    } catch (e) {
      console.log(`Invidious ${base} failed:`, e.message?.slice(0, 80));
    }
  }

  // 3) 최후 폴백: oEmbed (제목+썸네일만)
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const d = await r.json();
    return res.status(200).json({
      title:     d.title,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration:  null,
      id,
      streamUrl: null,
      source:    "oembed",
    });
  } catch {}

  return res.status(500).json({ error: "영상 정보를 불러올 수 없습니다. 잠시 후 다시 시도하거나 파일을 직접 업로드해 주세요." });
}

export const config = { maxDuration: 30 };
