// api/fetch-trending-videos.js — 카테고리별 트렌딩 영상 수집 (YouTube 검색 직접 파싱)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category, keywords, platform = "youtube" } = req.body || {};
  if (!keywords || !keywords.length) return res.status(400).json({ error: "keywords 필요" });

  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const videos = [];

  try {
    if (platform === "youtube" || platform === "all") {
      const query = keywords.slice(0, 3).join(" ") + " shorts";
      const r = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        {
          headers: { "User-Agent": ua, "Accept-Language": "ko-KR,ko;q=0.9", "Accept": "text/html" },
          signal: AbortSignal.timeout(12000),
        }
      );

      if (r.ok) {
        const html = await r.text();
        const seen = new Set();
        const re = /"videoRenderer":\{"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"ownerText":\{"runs":\[\{"text":"([^"]+)"/g;
        let m;
        while ((m = re.exec(html)) && videos.length < 12) {
          const [, id, title, author] = m;
          if (seen.has(id)) continue;
          seen.add(id);

          const block = html.substring(m.index, m.index + 3000);
          const viewMatch = block.match(/"viewCountText":\{"simpleText":"([^"]+)"/);
          const publishMatch = block.match(/"publishedTimeText":\{"simpleText":"([^"]+)"/);
          const lengthMatch = block.match(/"lengthText".*?"simpleText":"([^"]+)"/);
          const channelUrlMatch = block.match(/"canonicalBaseUrl":"([^"]+)"/);
          const avatarMatch = block.match(/"channelThumbnailSupportedRenderers".*?"url":"([^"]+)"/);
          const viewStr = viewMatch?.[1] || "0";
          const viewNum = parseInt(viewStr.replace(/[^0-9]/g, "")) || 0;

          videos.push({
            id,
            platform: "youtube",
            title,
            author,
            authorUrl: channelUrlMatch ? `https://youtube.com${channelUrlMatch[1]}` : "",
            channelAvatar: avatarMatch?.[1] || "",
            thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            url: `https://youtube.com/watch?v=${id}`,
            views: viewNum,
            published: publishMatch?.[1] || "",
            duration: lengthMatch?.[1] || "",
          });
        }
      }
    }

    if (platform === "tiktok" || videos.length === 0) {
      for (const kw of keywords.slice(0, 2)) {
        try {
          const r = await fetch(`https://www.tiktok.com/tag/${encodeURIComponent(kw)}`, {
            headers: { "User-Agent": ua, "Accept": "text/html" },
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
          });
          if (!r.ok) continue;
          const html = await r.text();
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
