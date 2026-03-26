// api/fetch-trending-videos.js — 카테고리별 트렌딩 영상 수집 (YouTube + TikTok)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category, keywords, platform = "youtube" } = req.body || {};
  if (!keywords || !keywords.length) return res.status(400).json({ error: "keywords 필요" });

  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const videos = [];

  try {
    if (platform === "youtube") {
      // YouTube 검색 (공식 API 키 없이 Invidious 활용)
      const query = keywords.slice(0, 3).join(" ") + " shorts";
      const instances = ["https://vid.puffyan.us", "https://invidious.nerdvpn.de", "https://inv.nadeko.net", "https://invidious.io.lol", "https://yt.cdaut.de"];

      for (const base of instances) {
        try {
          const r = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&sort_by=date&type=video&features=4k&region=KR`, {
            signal: AbortSignal.timeout(8000),
            headers: { "User-Agent": ua },
          });
          if (!r.ok) continue;
          const data = await r.json();
          for (const v of (data || []).slice(0, 12)) {
            if (!v.videoId) continue;
            videos.push({
              id: v.videoId,
              platform: "youtube",
              title: v.title || "",
              author: v.author || "",
              authorUrl: v.authorUrl ? `https://youtube.com${v.authorUrl}` : "",
              thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
              url: `https://youtube.com/watch?v=${v.videoId}`,
              views: v.viewCount || 0,
              published: v.publishedText || "",
              duration: v.lengthSeconds || 0,
            });
          }
          if (videos.length > 0) break;
        } catch {}
      }
    }

    if (platform === "tiktok" || (platform === "youtube" && videos.length === 0)) {
      // TikTok 검색 시도 (웹 메타데이터)
      for (const kw of keywords.slice(0, 2)) {
        try {
          const r = await fetch(`https://www.tiktok.com/tag/${encodeURIComponent(kw)}`, {
            headers: { "User-Agent": ua, "Accept": "text/html" },
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
          });
          if (!r.ok) continue;
          const html = await r.text();
          // OG 정보 추출
          const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1];
          const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1];
          if (ogTitle) {
            videos.push({
              id: `tiktok_tag_${kw}`,
              platform: "tiktok",
              title: ogTitle,
              author: `#${kw}`,
              thumbnail: "",
              url: `https://www.tiktok.com/tag/${kw}`,
              views: 0,
              description: ogDesc || "",
            });
          }
        } catch {}
      }
    }

    return res.json({ videos, category, total: videos.length });
  } catch (e) {
    return res.status(500).json({ error: "영상 수집 실패: " + e.message?.slice(0, 100) });
  }
}

export const config = { maxDuration: 25 };
