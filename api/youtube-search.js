// api/youtube-search.js — YouTube Data API v3 검색 대시보드
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;

  // API 키: 환경변수 또는 클라이언트 전달
  const apiKey = req.query.key || req.body?.key || process.env.YOUTUBE_DATA_API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) return res.status(400).json({ error: "YouTube Data API 키가 필요합니다" });

  const BASE = "https://www.googleapis.com/youtube/v3";

  try {
    if (action === "search") {
      // 영상 검색
      const {
        q = "", maxResults = 20, order = "relevance",
        videoDuration = "", publishedAfter = "", publishedBefore = "",
        regionCode = "", relevanceLanguage = "", videoCategoryId = "",
        pageToken = "",
      } = { ...req.query, ...(req.body || {}) };

      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        q, maxResults: String(Math.min(50, parseInt(maxResults) || 20)),
        order, key: apiKey,
      });
      if (videoDuration) params.set("videoDuration", videoDuration); // short, medium, long
      if (publishedAfter) params.set("publishedAfter", publishedAfter);
      if (publishedBefore) params.set("publishedBefore", publishedBefore);
      if (regionCode) params.set("regionCode", regionCode);
      if (relevanceLanguage) params.set("relevanceLanguage", relevanceLanguage);
      if (videoCategoryId) params.set("videoCategoryId", videoCategoryId);
      if (pageToken) params.set("pageToken", pageToken);

      const r = await fetch(`${BASE}/search?${params}`);
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });

      // 비디오 ID 목록으로 상세 정보(조회수, 구독자수 등) 가져오기
      const videoIds = (data.items || []).map(i => i.id?.videoId).filter(Boolean);
      const channelIds = [...new Set((data.items || []).map(i => i.snippet?.channelId).filter(Boolean))];

      let videoStats = {};
      let channelStats = {};

      if (videoIds.length > 0) {
        const vr = await fetch(`${BASE}/videos?part=statistics,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`);
        const vd = await vr.json();
        (vd.items || []).forEach(v => { videoStats[v.id] = { ...v.statistics, duration: v.contentDetails?.duration }; });
      }

      if (channelIds.length > 0) {
        const cr = await fetch(`${BASE}/channels?part=statistics&id=${channelIds.join(",")}&key=${apiKey}`);
        const cd = await cr.json();
        (cd.items || []).forEach(c => { channelStats[c.id] = c.statistics; });
      }

      // 결과 조합
      const results = (data.items || []).map(item => {
        const vid = item.id?.videoId;
        const vs = videoStats[vid] || {};
        const cs = channelStats[item.snippet?.channelId] || {};
        const views = parseInt(vs.viewCount || "0");
        const subs = parseInt(cs.subscriberCount || "0");
        const ratio = subs > 0 ? views / subs : 0;
        let ratioLevel = 1;
        if (ratio >= 3) ratioLevel = 5;
        else if (ratio >= 1.4) ratioLevel = 4;
        else if (ratio >= 0.6) ratioLevel = 3;
        else if (ratio >= 0.2) ratioLevel = 2;

        return {
          videoId: vid,
          title: item.snippet?.title || "",
          description: item.snippet?.description || "",
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
          channelTitle: item.snippet?.channelTitle || "",
          channelId: item.snippet?.channelId || "",
          publishedAt: item.snippet?.publishedAt || "",
          viewCount: views,
          likeCount: parseInt(vs.likeCount || "0"),
          commentCount: parseInt(vs.commentCount || "0"),
          subscriberCount: subs,
          duration: vs.duration || "",
          ratio: Math.round(ratio * 100) / 100,
          ratioLevel,
        };
      });

      return res.status(200).json({
        results,
        totalResults: data.pageInfo?.totalResults || 0,
        nextPageToken: data.nextPageToken || null,
        prevPageToken: data.prevPageToken || null,
      });
    }

    if (action === "categories") {
      const regionCode = req.query.regionCode || "KR";
      const r = await fetch(`${BASE}/videoCategories?part=snippet&regionCode=${regionCode}&key=${apiKey}`);
      const data = await r.json();
      const cats = (data.items || []).map(c => ({ id: c.id, title: c.snippet?.title }));
      return res.status(200).json({ categories: cats });
    }

    return res.status(400).json({ error: "action 필요 (search, categories)" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
