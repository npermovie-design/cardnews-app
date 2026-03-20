// api/youtube-stream.js — 유튜브 영상을 Vercel 프록시로 스트리밍
import ytdl from "@distube/ytdl-core";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length,Content-Range,Accept-Ranges");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    const stream = ytdl(url, {
      quality: "highestvideo",
      filter: f => f.container === "mp4" && f.hasAudio && f.hasVideo,
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    stream.on("error", (e) => {
      console.error("ytdl stream error:", e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    });

    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent)
      res.status(500).json({ error: "스트리밍 실패: " + e.message.slice(0, 200) });
  }
}

export const config = {
  maxDuration: 300,
  api: { responseLimit: false },
};
