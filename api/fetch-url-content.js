// api/fetch-url-content.js — URL에서 콘텐츠 추출 (뉴스/블로그/유튜브)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  // ── YouTube 감지 ───────────────────────────────────────────
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^&?/\s]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    try {
      // oEmbed로 제목 가져오기
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (r.ok) {
        const d = await r.json();
        // YouTube 설명은 oEmbed에 없으므로 Invidious에서 시도
        let description = "";
        const invidiousInstances = ["https://invidious.io.lol", "https://yt.cdaut.de", "https://inv.tux.pizza"];
        for (const base of invidiousInstances) {
          try {
            const iv = await fetch(`${base}/api/v1/videos/${id}`, {
              signal: AbortSignal.timeout(6000),
              headers: { "User-Agent": "Mozilla/5.0" },
            });
            if (iv.ok) {
              const ivData = await iv.json();
              if (!ivData.error && ivData.description) {
                description = ivData.description.slice(0, 500);
                break;
              }
            }
          } catch {}
        }
        return res.status(200).json({
          type: "youtube",
          title: d.title || "",
          description: description,
          author: d.author_name || "",
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          url,
        });
      }
    } catch (e) {
      console.log("YouTube oEmbed failed:", e.message);
    }
    return res.status(500).json({ error: "유튜브 정보를 불러올 수 없습니다." });
  }

  // ── 일반 웹페이지 (뉴스/블로그) ───────────────────────────
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    if (!r.ok) return res.status(400).json({ error: `페이지 불러오기 실패 (${r.status})` });

    const html = await r.text();

    // 메타 태그 추출 헬퍼
    const getMeta = (name) => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return "";
    };

    // 제목 추출
    let title = getMeta("og:title") || getMeta("twitter:title");
    if (!title) {
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = tm?.[1]?.trim() || "";
    }
    title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim(); // 사이트명 제거

    // 설명 추출
    const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");

    // 썸네일
    const thumbnail = getMeta("og:image") || getMeta("twitter:image");

    // 본문 텍스트 추출 (스크립트/스타일 제거 후)
    let bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 의미있는 본문만 (100자 이상 연속 텍스트 블록)
    const sentences = bodyText.match(/[가-힣a-zA-Z][^.!?。]{20,}[.!?。]?/g) || [];
    const content = sentences.slice(0, 15).join(" ").slice(0, 800);

    // 사이트 종류 감지
    let type = "web";
    const urlLower = url.toLowerCase();
    if (urlLower.includes("naver.com") || urlLower.includes("daum.net") ||
        urlLower.includes("news") || urlLower.includes("article") || urlLower.includes("기사")) {
      type = "news";
    } else if (urlLower.includes("blog") || urlLower.includes("tistory") || urlLower.includes("brunch")) {
      type = "blog";
    }

    return res.status(200).json({
      type,
      title,
      description,
      content,
      thumbnail,
      url,
    });
  } catch (e) {
    return res.status(500).json({ error: "페이지를 불러올 수 없습니다: " + e.message?.slice(0, 100) });
  }
}

export const config = { maxDuration: 20 };
