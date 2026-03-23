// api/fetch-insta.js — 인스타그램 게시물 정보 추출
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  let title = "", author = "", thumbnail = "", description = "";

  // 1. Instagram oembed API
  try {
    const oRes = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (oRes.ok) {
      const d = await oRes.json();
      title = d.title || "";
      author = d.author_name || "";
      thumbnail = d.thumbnail_url || "";
    }
  } catch {}

  // 2. 페이지 메타 데이터 시도
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      // OG 태그에서 정보 추출
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogTitle && !title) title = ogTitle[1];
      if (ogDesc) description = ogDesc[1];
      if (ogImage && !thumbnail) thumbnail = ogImage[1];

      // caption 추출 시도
      const capMatch = html.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:[^"\\]|\\.)*)"/);
      if (capMatch) description = capMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  } catch {}

  // 3. 해시태그 추출
  const hashtags = [];
  const hashRegex = /#([\w가-힣]+)/g;
  let m;
  const searchText = (description || title || "");
  while ((m = hashRegex.exec(searchText)) !== null) {
    hashtags.push(m[1]);
  }

  return res.status(200).json({
    title: title || description?.slice(0, 80) || "",
    author,
    thumbnail,
    description,
    hashtags,
    hasData: !!(title || description || thumbnail),
  });
}
