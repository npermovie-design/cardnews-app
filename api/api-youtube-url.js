// /api/youtube-url.js  ─  Vercel Serverless Function
// ytdl-core로 유튜브 직접 스트림 URL 추출
// npm install ytdl-core

import ytdl from "ytdl-core";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 파라미터 필요" });

  try {
    const info = await ytdl.getInfo(url);
    const vid  = info.videoDetails;

    // 적절한 포맷 선택 (최대 720p mp4, 오디오+비디오 합본)
    const formats = ytdl.filterFormats(info.formats, "audioandvideo");
    const best    = formats
      .filter(f => f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0]
      || formats[0]
      || info.formats.find(f => f.hasVideo && f.hasAudio);

    if (!best) return res.status(404).json({ error: "사용 가능한 포맷 없음" });

    return res.status(200).json({
      streamUrl:  best.url,
      mimeType:   best.mimeType || "video/mp4",
      quality:    best.qualityLabel || "unknown",
      duration:   parseInt(vid.lengthSeconds),
      title:      vid.title,
      thumbnail:  vid.thumbnails?.slice(-1)[0]?.url || "",
      author:     vid.author?.name || "",
    });
  } catch (e) {
    console.error("ytdl error:", e.message);
    return res.status(500).json({ error: "영상 정보 조회 실패: " + e.message.slice(0, 200) });
  }
}

export const config = { maxDuration: 30 };
