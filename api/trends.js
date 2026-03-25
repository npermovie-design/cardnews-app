// Vercel Serverless: /api/trends?platform=google|naver|youtube|tiktok|x
const ALLOWED_ORIGINS = ["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173"];
export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  const { platform = "google" } = req.query;

  try {
    if (platform === "google") {
      // Google Trends Daily (Korea)
      const r = await fetch("https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR");
      if (r.ok) {
        const xml = await r.text();
        const items = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].slice(1, 21);
        const keywords = items.map((m, i) => ({
          rank: i + 1,
          keyword: m[1].trim(),
          change: i < 5 ? "up" : i < 10 ? "same" : "new",
        }));
        if (keywords.length > 0) return res.json({ keywords, source: "google_trends_rss", live: true });
      }
      // Fallback: Google Trends JSON
      const r2 = await fetch("https://trends.google.co.kr/trending/rss?geo=KR");
      if (r2.ok) {
        const xml2 = await r2.text();
        const items2 = [...xml2.matchAll(/<title>([^<]+)<\/title>/g)].slice(1, 21);
        const kw2 = items2.map((m, i) => ({ rank: i+1, keyword: m[1].trim(), change: i<5?"up":"same" }));
        if (kw2.length > 0) return res.json({ keywords: kw2, source: "google_trends_rss2", live: true });
      }
    }

    if (platform === "naver") {
      // Naver 실시간 검색 (자동완성 기반)
      const seeds = ["AI","챗GPT","인스타","유튜브","블로그","마케팅","디자인","부동산","주식","여행","맛집","다이어트","영화","게임","패션"];
      const all = [];
      for (const q of seeds.slice(0, 8)) {
        try {
          const r = await fetch(`https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&t_koreng=1&run=2`);
          if (r.ok) {
            const d = await r.json();
            (d.items || []).flat().forEach(s => {
              if (s && s[0] && !all.find(x => x.keyword === s[0])) all.push({ keyword: s[0], change: "same" });
            });
          }
        } catch {}
      }
      if (all.length > 0) return res.json({ keywords: all.slice(0, 20).map((k, i) => ({ ...k, rank: i+1 })), source: "naver_autocomplete", live: true });
    }

    if (platform === "youtube") {
      const seeds = ["AI","숏폼","마케팅","브이로그","뉴스","주식","요리","운동","게임","음악","공부","여행"];
      const all = [];
      for (const q of seeds.slice(0, 8)) {
        try {
          const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}&hl=ko`);
          if (r.ok) {
            const d = await r.json();
            (d[1] || []).slice(0, 3).forEach(s => {
              if (!all.find(x => x.keyword === s)) all.push({ keyword: s, change: "same" });
            });
          }
        } catch {}
      }
      if (all.length > 0) return res.json({ keywords: all.slice(0, 20).map((k, i) => ({ ...k, rank: i+1 })), source: "youtube_autocomplete", live: true });
    }

    if (platform === "tiktok") {
      try {
        const r = await fetch("https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&country_code=KR&page=1&limit=20");
        if (r.ok) {
          const d = await r.json();
          const list = d.data?.list || [];
          if (list.length > 0) {
            return res.json({
              keywords: list.map((h, i) => ({
                rank: i + 1,
                keyword: "#" + (h.hashtag_name || h.name || ""),
                change: h.trend === 1 ? "up" : h.trend === -1 ? "down" : "same",
                volume: h.publish_cnt || 0,
              })),
              source: "tiktok_creative_center", live: true,
            });
          }
        }
      } catch {}
    }

    // 폴백
    res.json({ keywords: [], source: "none", live: false });
  } catch (e) {
    res.status(500).json({ error: e.message, keywords: [] });
  }
}
