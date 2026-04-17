// api/naver-datalab.js — 네이버 데이터랩 쇼핑인사이트 프록시

function setCors(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const isAllowed = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "Referer": "https://datalab.naver.com/shoppingInsight/sKeyword.naver",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchRank(cid, count = 20) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today - 7 * 86400000).toISOString().slice(0, 10);
  const r = await fetch("https://datalab.naver.com/shoppingInsight/getKeywordRank.naver", {
    method: "POST", headers: HEADERS,
    body: `cid=${cid}&timeUnit=date&startDate=${start}&endDate=${end}&age=&gender=&device=&page=1&count=${count}`,
  });
  const txt = await r.text();
  if (txt[0] !== "[" && txt[0] !== "{") return null;
  const data = JSON.parse(txt);
  const latest = data[data.length - 1];
  return { date: latest?.datetime, ranks: (latest?.ranks || []).map(r => r.keyword) };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || "shopping";

  try {
    if (action === "shopping") {
      const result = await fetchRank("50000000", 20);
      return res.status(200).json(result || { date: "", ranks: [] });
    }

    if (action === "all") {
      // 여러 카테고리 한번에
      const cats = [
        { cid: "50000000", name: "전체" },
        { cid: "50000001", name: "패션의류" },
        { cid: "50000004", name: "화장품/미용" },
        { cid: "50000006", name: "디지털/가전" },
        { cid: "50000003", name: "식품" },
        { cid: "50000005", name: "가구/인테리어" },
        { cid: "50000002", name: "출산/유아동" },
        { cid: "50000008", name: "스포츠/레저" },
        { cid: "50000007", name: "생활/건강" },
      ];
      const results = {};
      // 순차 요청 (병렬 시 차단 위험)
      for (const cat of cats) {
        const r = await fetchRank(cat.cid, 10);
        if (r) results[cat.name] = r.ranks;
      }
      return res.status(200).json({ categories: results });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
