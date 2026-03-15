// api/transcript.js
// Vercel 서버리스 함수 - YouTube 자막 추출
// CORS 문제 없이 서버에서 직접 YouTube에 요청

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: "videoId 파라미터가 필요합니다" });
  }

  try {
    // 1. YouTube 페이지 HTML 가져오기 (서버에서는 CORS 없음)
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!pageRes.ok) {
      return res.status(500).json({ error: "YouTube 페이지 접근 실패", items: [] });
    }

    const html = await pageRes.text();

    // 2. ytInitialPlayerResponse에서 자막 트랙 목록 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) {
      return res.status(200).json({ items: [], message: "자막 없음" });
    }

    let tracks;
    try {
      tracks = JSON.parse(captionMatch[1]);
    } catch {
      return res.status(200).json({ items: [], message: "자막 파싱 실패" });
    }

    if (!tracks || tracks.length === 0) {
      return res.status(200).json({ items: [], message: "자막 트랙 없음" });
    }

    // 3. 언어 우선순위: 한국어 → 영어 → 자동생성 한국어 → 자동생성 영어 → 첫번째
    const priority = ["ko", "en", "a.ko", "a.en"];
    let chosenTrack = null;
    for (const lang of priority) {
      const t = tracks.find(tr =>
        tr.languageCode === lang ||
        (tr.vssId && tr.vssId.includes(`.${lang}`))
      );
      if (t) { chosenTrack = t; break; }
    }
    if (!chosenTrack) chosenTrack = tracks[0];

    const langCode = chosenTrack.languageCode || "unknown";

    // 4. 자막 XML 가져오기
    const captionUrl = chosenTrack.baseUrl;
    if (!captionUrl) {
      return res.status(200).json({ items: [], message: "자막 URL 없음" });
    }

    const capRes = await fetch(`${captionUrl}&fmt=srv3`);
    if (!capRes.ok) {
      return res.status(200).json({ items: [], message: "자막 다운로드 실패" });
    }

    const xml = await capRes.text();

    // 5. XML 파싱
    const items = [];
    const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const start = parseFloat(m[1]);
      const text = m[2]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, "").trim();
      if (text) items.push({ start, text });
    }

    return res.status(200).json({
      items,
      lang: langCode,
      total: items.length,
      trackName: chosenTrack.name?.simpleText || langCode,
    });

  } catch (error) {
    return res.status(500).json({
      error: "서버 오류: " + error.message,
      items: [],
    });
  }
}
