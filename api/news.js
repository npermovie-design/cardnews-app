// api/news.js
// 뉴스 기사 URL → 텍스트 추출 (서버에서 CORS 없이 직접 파싱)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 파라미터 필요" });

  // URL 유효성 검사
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: "http/https URL만 지원합니다" });
    }
  } catch {
    return res.status(400).json({ error: "올바른 URL 형식이 아닙니다" });
  }

  try {
    // 기사 페이지 HTML 가져오기
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return res.status(200).json({
        title: "", content: "", error: `페이지 접근 실패 (${pageRes.status})`, method: "none"
      });
    }

    const html = await pageRes.text();

    // ── 제목 추출 ──
    let title = "";
    const titlePatterns = [
      // OG 태그 (가장 신뢰성 높음)
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i),
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i),
      // 뉴스 전용 메타
      html.match(/<meta[^>]*name="headline"[^>]*content="([^"]+)"/i),
      html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i),
      // h1
      html.match(/<h1[^>]*class="[^"]*(?:title|headline|subject|tit)[^"]*"[^>]*>([^<]+)</i),
      html.match(/<h1[^>]*>([^<]{10,200})</i),
      // title 태그
      html.match(/<title>([^<]+)<\/title>/i),
    ];
    for (const m of titlePatterns) {
      if (m?.[1]) { title = decodeHtml(m[1].trim()); break; }
    }

    // ── 본문 추출 ──
    let content = "";

    // 1. JSON-LD 구조화 데이터 (가장 정확)
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        try {
          const json = JSON.parse(block.replace(/<script[^>]*>|<\/script>/gi, "").trim());
          const items = Array.isArray(json) ? json : [json];
          for (const item of items) {
            if (item["@type"]?.match(/NewsArticle|Article|BlogPosting/i)) {
              const text = item.articleBody || item.description || item.text || "";
              if (text.length > 200) { content = text; break; }
            }
          }
        } catch {}
        if (content) break;
      }
    }

    // 2. 뉴스 본문 특화 선택자
    if (!content) {
      const bodyPatterns = [
        // 주요 뉴스 사이트 클래스
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*class="[^"]*(?:article-body|article_body|articleBody|article-content|article_content|news-content|news_content|view_con|viewcon|cont_article|article-text|article_text|story-body|storybody|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="[^"]*(?:article-body|articleBody|article_body|news_content|newsContent|article_view|articeBody|cont_article)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // 네이버 뉴스
        /<div[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*go_trans[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // 다음 뉴스
        /<div[^>]*class="[^"]*news_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*article_view[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // 조선/중앙/동아
        /<div[^>]*class="[^"]*par[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        // 일반 p 태그 집합
        /<main[^>]*>([\s\S]*?)<\/main>/i,
      ];

      for (const pattern of bodyPatterns) {
        const m = html.match(pattern);
        if (m) {
          const raw = (m[1] || m[2] || "");
          const cleaned = stripHtml(raw);
          if (cleaned.length > 300) { content = cleaned; break; }
        }
      }
    }

    // 3. p 태그 전체 수집 (fallback)
    if (!content || content.length < 200) {
      const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      const paragraphs = [];
      for (const m of pMatches) {
        const text = stripHtml(m[1]).trim();
        if (text.length > 30 && text.length < 2000) paragraphs.push(text);
      }
      if (paragraphs.length > 2) {
        content = paragraphs.join("\n\n");
      }
    }

    // 정리
    content = content
      .replace(/\s{3,}/g, "\n\n")
      .replace(/\n{4,}/g, "\n\n")
      .trim()
      .slice(0, 8000); // 최대 8000자

    // OG 이미지
    const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
                  || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    const image = imgMatch?.[1] || "";

    // 사이트명
    const siteMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i)
                   || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:site_name"/i);
    const siteName = siteMatch?.[1] || parsedUrl.hostname;

    return res.status(200).json({
      title,
      content,
      image,
      siteName,
      url,
      contentLength: content.length,
      method: content.length > 200 ? "success" : "partial",
    });

  } catch (error) {
    return res.status(200).json({
      title: "", content: "", error: "서버 오류: " + error.message, method: "none"
    });
  }
};

// HTML 태그 제거
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// HTML 엔티티 디코드
function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}
