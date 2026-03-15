// api/transcript.js
// youtube-transcript 패키지로 자막 추출 (완전 무료)
// 자동 생성 자막 포함 거의 모든 영상 지원

import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId 필요" });

  /* ── 방법 1: youtube-transcript 패키지 (한국어 우선) ── */
  const langs = ["ko", "en"];
  for (const lang of langs) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (raw && raw.length > 3) {
        const items = raw.map(s => ({
          start: s.offset / 1000,
          text: s.text.replace(/\n/g, " ").trim(),
        })).filter(s => s.text);

        return res.status(200).json({
          items,
          lang,
          total: items.length,
          method: "youtube-transcript",
        });
      }
    } catch { continue; }
  }

  /* ── 방법 2: 자동 생성 자막 (자막 등록 안 한 영상) ── */
  for (const lang of ["a.ko", "a.en", "ko", "en"]) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang.replace("a.", ""),
        country: lang.startsWith("a.") ? undefined : undefined,
      });
      if (raw && raw.length > 3) {
        const items = raw.map(s => ({
          start: s.offset / 1000,
          text: s.text.replace(/\n/g, " ").trim(),
        })).filter(s => s.text);
        if (items.length > 3) {
          return res.status(200).json({
            items,
            lang: lang.replace("a.", ""),
            total: items.length,
            method: "auto-caption",
          });
        }
      }
    } catch { continue; }
  }

  /* ── 방법 3: 직접 YouTube 페이지 파싱 ── */
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    if (!pageRes.ok) throw new Error("페이지 접근 실패");

    const html = await pageRes.text();

    // 자막 트랙 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (captionMatch) {
      const tracks = JSON.parse(captionMatch[1]);
      const priority = ["ko", "en", "a.ko", "a.en"];
      let chosen = null;
      for (const p of priority) {
        const t = tracks.find(tr =>
          tr.languageCode === p || (tr.vssId && tr.vssId.includes(`.${p}`))
        );
        if (t) { chosen = t; break; }
      }
      if (!chosen && tracks.length > 0) chosen = tracks[0];

      if (chosen?.baseUrl) {
        const capRes = await fetch(`${chosen.baseUrl}&fmt=srv3`);
        if (capRes.ok) {
          const xml = await capRes.text();
          const items = [];
          const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
          let m;
          while ((m = re.exec(xml)) !== null) {
            const text = m[2]
              .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
              .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
              .replace(/<[^>]+>/g,"").trim();
            if (text) items.push({ start: parseFloat(m[1]), text });
          }
          if (items.length > 3) {
            return res.status(200).json({
              items,
              lang: chosen.languageCode,
              total: items.length,
              method: "page-parse",
            });
          }
        }
      }
    }

    // 영상 설명란이라도 가져오기
    const descMatch = html.match(/"description":{"simpleText":"([^"]{20,}?)"/);
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const description = descMatch ? descMatch[1].replace(/\\n/g, "\n").replace(/\\u0026/g,"&") : "";
    const title = titleMatch ? titleMatch[1] : videoId;

    return res.status(200).json({
      items: [],
      description: description.slice(0, 2000),
      title,
      total: 0,
      method: "description-only",
      message: "자막 없음 - 영상 설명란 사용",
    });

  } catch (e) {
    return res.status(200).json({ items: [], message: e.message, method: "none" });
  }
}
