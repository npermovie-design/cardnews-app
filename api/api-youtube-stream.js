// api/youtube-stream.js - 유튜브 영상을 CORS 프록시로 스트리밍
// 브라우저에서 직접 유튜브 URL에 접근하면 CORS 차단되므로
// Vercel이 중간에서 프록시 역할을 함
import ytdl from "ytdl-core";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length,Content-Range,Accept-Ranges");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    // ytdl 스트림으로 직접 파이프
    // quality: lowest → 파일 크기 최소화 (숏폼 편집용이므로 720p 이하면 충분)
    const stream = ytdl(url, {
      quality: "highestvideo", // mp4 오디오+비디오 합본 중 최고
      filter: format => format.container === "mp4" && format.hasAudio && format.hasVideo,
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

// Vercel Pro: 300초 / Hobby: 60초
export const config = {
  maxDuration: 300,
  api: { responseLimit: false }, // 응답 크기 제한 해제
};
