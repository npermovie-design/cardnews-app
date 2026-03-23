// api/fetch-youtube.js — 유튜브 영상 정보 + 자막 추출 (개선)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  const vidMatch = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!vidMatch) return res.status(400).json({ error: "유튜브 URL이 아닙니다" });
  const videoId = vidMatch[1];

  let title = "", channelName = "", description = "", tags = [], viewCount = "", transcript = "";
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // 1. oembed (항상 작동)
  try {
    const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(5000) });
    if (oRes.ok) { const d = await oRes.json(); title = d.title || ""; channelName = d.author_name || ""; }
  } catch {}

  // 2. YouTube 페이지 (consent 우회)
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko&gl=KR&has_verified=1`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Cookie": "CONSENT=YES+cb; PREF=hl=ko",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      // description
      const descM = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (descM) description = descM[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      if (!description) {
        const descM2 = html.match(/"description":{"simpleText":"((?:[^"\\]|\\.)*)"/);
        if (descM2) description = descM2[1].replace(/\\n/g, "\n");
      }

      // title fallback
      if (!title) {
        const titM = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
        if (titM) title = titM[1];
      }

      // channel fallback
      if (!channelName) {
        const chM = html.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/);
        if (chM) channelName = chM[1];
      }

      // tags
      const tagM = html.match(/"keywords":\[(.*?)\]/);
      if (tagM) { try { tags = JSON.parse(`[${tagM[1]}]`); } catch {} }
      if (tags.length === 0) {
        const metaTag = html.match(/<meta name="keywords" content="([^"]+)"/);
        if (metaTag) tags = metaTag[1].split(",").map(t => t.trim());
      }

      // viewCount
      const viewM = html.match(/"viewCount":"(\d+)"/);
      if (viewM) viewCount = viewM[1];

      // 자막 추출
      const capMatch = html.match(/"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[(.*?)\]/s);
      if (capMatch) {
        try {
          // JSON 파싱을 위해 정리
          let capJson = capMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
          const urlMatch = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"/g);
          if (urlMatch) {
            // 한국어 우선, 없으면 첫 번째
            let capUrl = "";
            const koUrl = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"[^}]*"languageCode":"ko"/);
            if (koUrl) capUrl = koUrl[1];
            else {
              const firstUrl = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"/);
              if (firstUrl) capUrl = firstUrl[1];
            }
            if (capUrl) {
              capUrl = capUrl.replace(/\\u0026/g, "&");
              const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(5000) });
              if (capRes.ok) {
                const capXml = await capRes.text();
                const texts = [];
                const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
                let m;
                while ((m = regex.exec(capXml)) !== null) {
                  let t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, " ").trim();
                  if (t) texts.push(t);
                }
                transcript = texts.join(" ").slice(0, 5000);
              }
            }
          }
        } catch {}
      }

      // timedtext API 직접 시도 (자막이 없는 경우)
      if (!transcript) {
        try {
          const ttRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=ko&fmt=srv3`, { signal: AbortSignal.timeout(5000) });
          if (ttRes.ok) {
            const ttXml = await ttRes.text();
            const texts = [];
            const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
            let m;
            while ((m = regex.exec(ttXml)) !== null) {
              let t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();
              if (t) texts.push(t);
            }
            if (texts.length > 0) transcript = texts.join(" ").slice(0, 5000);
          }
        } catch {}
        // 영어 자막도 시도
        if (!transcript) {
          try {
            const ttRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`, { signal: AbortSignal.timeout(5000) });
            if (ttRes.ok) {
              const ttXml = await ttRes.text();
              const texts = [];
              const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
              let m;
              while ((m = regex.exec(ttXml)) !== null) {
                let t = m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
                if (t) texts.push(t);
              }
              if (texts.length > 0) transcript = texts.join(" ").slice(0, 5000);
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 3. noembed fallback (title/channel이 없는 경우)
  if (!title) {
    try {
      const nRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (nRes.ok) { const d = await nRes.json(); title = d.title || ""; channelName = channelName || d.author_name || ""; }
    } catch {}
  }

  return res.status(200).json({
    videoId, title, channelName, thumbnail, description,
    tags, viewCount, transcript,
    hasData: !!(title || description),
  });
}
