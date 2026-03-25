// api/youtube-info.js - 유튜브 영상 정보만 반환
import ytdl from "ytdl-core";

const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    const info = await ytdl.getInfo(url);
    const vid  = info.videoDetails;

    // mp4 오디오+비디오 합본 포맷 우선
    const formats = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const best = formats[0] || info.formats.find(f => f.hasVideo && f.hasAudio);

    return res.status(200).json({
      title:      vid.title,
      thumbnail:  vid.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`,
      duration:   parseInt(vid.lengthSeconds),
      id:         vid.videoId,
      streamUrl:  best?.url || null,
      quality:    best?.qualityLabel || null,
    });
  } catch (e) {
    return res.status(500).json({ error: "조회 실패: " + e.message.slice(0, 200) });
  }
}

export const config = { maxDuration: 30 };
