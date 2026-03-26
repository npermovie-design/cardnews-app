// SEO 키워드 분석 API
// 네이버 DataLab + 자동완성 기반 키워드 트렌드/관련어 분석
// 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET (네이버 개발자센터)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { keyword, period = "7d" } = req.body;
  if (!keyword) return res.status(400).json({ error: "keyword 필수" });

  const NAVER_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;

  const result = {
    keyword,
    naverTrend: [],
    relatedKeywords: [],
    trendDirection: "stable",
    hasRealData: false,
  };

  // ── 1) 네이버 DataLab 검색 트렌드 (7일) ────────────────────
  if (NAVER_ID && NAVER_SECRET) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const fmt = d => d.toISOString().slice(0, 10);

      const dlRes = await fetch("https://openapi.naver.com/v1/datalab/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          timeUnit: "date",
          keywordGroups: [
            { groupName: keyword, keywords: [keyword] },
          ],
        }),
      });
      const dlData = await dlRes.json();
      const points = dlData?.results?.[0]?.data || [];
      result.naverTrend = points.map(p => ({ date: p.period, ratio: Math.round(p.ratio) }));
      result.hasRealData = points.length > 0;

      // 트렌드 방향 계산
      if (points.length >= 4) {
        const firstHalf = points.slice(0, Math.floor(points.length / 2));
        const secondHalf = points.slice(Math.floor(points.length / 2));
        const avg1 = firstHalf.reduce((s, p) => s + p.ratio, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((s, p) => s + p.ratio, 0) / secondHalf.length;
        if (avg2 > avg1 * 1.15) result.trendDirection = "rising";
        else if (avg2 < avg1 * 0.85) result.trendDirection = "declining";
        else result.trendDirection = "stable";
      }
    } catch (e) {
      console.error("DataLab API error:", e.message);
    }
  }

  // ── 2) 네이버 자동완성으로 관련 키워드 수집 ────────────────────
  try {
    const acRes = await fetch(`https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8`);
    const acData = await acRes.json();
    const suggestions = (acData?.items?.[0] || []).map(item => item[0]).filter(Boolean).slice(0, 10);

    // 각 자동완성 키워드에 대해 간단한 경쟁도 추정
    result.relatedKeywords = suggestions.map((kw, i) => ({
      keyword: kw,
      relevance: Math.max(100 - i * 10, 30),
      competition: i < 3 ? "high" : i < 6 ? "medium" : "low",
    }));
  } catch (e) {
    console.error("Autocomplete error:", e.message);
  }

  // ── 3) 네이버 DataLab으로 관련 키워드 트렌드 비교 (상위 5개) ─────
  if (NAVER_ID && NAVER_SECRET && result.relatedKeywords.length > 0) {
    try {
      const topKws = result.relatedKeywords.slice(0, 5);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const fmt = d => d.toISOString().slice(0, 10);

      const compareRes = await fetch("https://openapi.naver.com/v1/datalab/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          timeUnit: "date",
          keywordGroups: topKws.map(kw => ({
            groupName: kw.keyword,
            keywords: [kw.keyword],
          })),
        }),
      });
      const compareData = await compareRes.json();
      if (compareData?.results) {
        compareData.results.forEach(r => {
          const match = result.relatedKeywords.find(kw => kw.keyword === r.title);
          if (match) {
            const points = r.data || [];
            const avgRatio = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.ratio, 0) / points.length) : 0;
            match.avgSearchRatio = avgRatio;
            match.trend = points.map(p => ({ date: p.period, ratio: Math.round(p.ratio) }));
          }
        });
      }
    } catch (e) {
      console.error("Compare API error:", e.message);
    }
  }

  // ── 4) API 키 없을 때 샘플 데이터 ────────────────────
  if (!result.hasRealData) {
    // 샘플 트렌드 데이터 생성 (데모용)
    const today = new Date();
    result.naverTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().slice(0, 10), ratio: 50 + Math.round(Math.random() * 40) };
    });
    result.trendDirection = "stable";
    result.notice = "네이버 API 키가 설정되지 않아 샘플 데이터입니다. NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정하세요.";
  }

  return res.status(200).json(result);
}
