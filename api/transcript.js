// api/transcript.js
// CommonJS 방식 (Vercel 기본 호환)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId 필요" });

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!pageRes.ok) {
      return res.status(200).json({ items: [], message: "YouTube 접근 실패", method: "none" });
    }

    const html = await pageRes.text();
    let captionTracks = [];

    // 방법 A: 정규식으로 captionTracks 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (captionMatch) {
      try { captionTracks = JSON.parse(captionMatch[1]); } catch {}
    }

    // 방법 B: ytInitialPlayerResponse 파싱
    if (!captionTracks.length) {
      const iprMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
      if (iprMatch) {
        try {
          const ipr = JSON.parse(iprMatch[1]);
          captionTracks = ipr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        } catch {}
      }
    }

    // 방법 C: InnerTube API
    if (!captionTracks.length) {
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      const clientVersionMatch = html.match(/"clientVersion":"([^"]+)"/);
      if (apiKeyMatch) {
        try {
          const playerRes = await fetch(
            `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId,
                context: {
                  client: {
                    clientName: "WEB",
                    clientVersion: clientVersionMatch?.[1] || "2.20231219.04.00",
                    hl: "ko", gl: "KR",
                  }
                }
              })
            }
          );
          if (playerRes.ok) {
            const pd = await playerRes.json();
            captionTracks = pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          }
        } catch {}
      }
    }

    // 자막 없음 → 설명란
    if (!captionTracks.length) {
      const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const description = descMatch
        ? descMatch[1].replace(/\\n/g, "\n").replace(/\\u0026/g, "&").replace(/\\"/g, '"').slice(0, 3000)
        : "";
      const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : videoId;
      return res.status(200).json({ items: [], description, title, total: 0, method: "description-only" });
    }

    // 우선순위 선택
    const priority = [
      t => t.languageCode === "ko" && !t.kind,
      t => t.languageCode === "en" && !t.kind,
      t => t.languageCode === "ko",
      t => t.languageCode === "en",
      t => t.languageCode?.startsWith("ko"),
      t => t.languageCode?.startsWith("en"),
      () => true,
    ];
    let chosen = null;
    for (const fn of priority) {
      chosen = captionTracks.find(fn);
      if (chosen) break;
    }
    if (!chosen) chosen = captionTracks[0];

    const langCode = chosen.languageCode || "unknown";
    const isAuto = chosen.kind === "asr";

    const capRes = await fetch(`${chosen.baseUrl}&fmt=srv3`);
    if (!capRes.ok) {
      return res.status(200).json({ items: [], message: "자막 다운로드 실패", method: "none" });
    }

    const xml = await capRes.text();
    const items = [];
    const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const text = m[2]
        .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ")
        .replace(/<[^>]+>/g,"").replace(/\n/g," ").trim();
      if (text) items.push({ start: parseFloat(m[1]), text });
    }

    if (!items.length) {
      return res.status(200).json({ items: [], message: "자막 파싱 실패", method: "none" });
    }

    return res.status(200).json({
      items,
      lang: langCode,
      isAuto,
      total: items.length,
      method: isAuto ? "auto-caption" : "manual-caption",
      trackName: chosen.name?.simpleText || langCode,
    });

  } catch (error) {
    return res.status(200).json({ items: [], message: "서버 오류: " + error.message, method: "none" });
  }
};
