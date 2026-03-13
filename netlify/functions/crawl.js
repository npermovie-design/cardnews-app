export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { return res.status(200).end(); }
  try {
    var body = req.body || {};
    var url = body.url;
    if (!url) { return res.status(400).json({error:"URL이 없어요"}); }

    var fetchRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9"
      },
      redirect: "follow"
    });

    var html = await fetchRes.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    html = html.replace(/<header[\s\S]*?<\/header>/gi, "");
    var text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 3000) { text = text.substring(0, 3000) + "..."; }

    return res.status(200).json({text});
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}
