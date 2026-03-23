// api/fetch-url.js — URL 콘텐츠 프록시 (CORS 우회)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    // 네이버 블로그: 모바일 URL로 변환
    let fetchUrl = url;
    if (url.includes("blog.naver.com")) {
      const m = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/);
      if (m) fetchUrl = `https://m.blog.naver.com/${m[1]}/${m[2]}`;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return res.status(response.status).json({ error: `HTTP ${response.status}` });

    const html = await response.text();
    return res.status(200).json({ html: html.slice(0, 50000) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
