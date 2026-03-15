/* ═══════════════════════════════════════════════════════════
   api/news.js  ·  Vercel Serverless — 뉴스 기사 크롤러
   GET /api/news?url=https://...
   ═══════════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 파라미터가 필요합니다." });

  let targetUrl;
  try {
    targetUrl = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: "올바르지 않은 URL입니다." });
  }

  try {
    const html = await fetchHtml(targetUrl.href);
    const data = parseArticle(html, targetUrl.href);

    if (!data.content || data.content.length < 50) {
      return res.status(200).json({ error: "기사 본문을 추출할 수 없습니다. 다른 URL을 시도해주세요." });
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error("news api error:", e);
    return res.status(200).json({ error: "기사를 불러오지 못했습니다: " + e.message });
  }
}

/* ── HTML 가져오기 ── */
async function fetchHtml(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Referer": "https://www.google.com/",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();

    // 인코딩 감지 (EUC-KR 대응)
    let text;
    try {
      text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("â€") || text.includes("ê°")) {
        text = new TextDecoder("euc-kr").decode(buffer);
      }
    } catch {
      text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    }
    return text;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

/* ── 기사 파싱 ── */
function parseArticle(html, url) {
  const hostname = new URL(url).hostname;

  // 제목 추출
  const title = extractTitle(html);

  // 사이트명 추출
  const siteName = extractSiteName(html, hostname);

  // OG 이미지
  const image = extractMeta(html, "og:image");

  // 본문 추출 (사이트별)
  let content = "";
  if (hostname.includes("naver.com")) {
    content = extractBySelectors(html, [
      'div[id="dic_area"]',
      'div[class*="newsct_article"]',
      'div[class*="article_body"]',
      'div[id="articleBodyContents"]',
    ]);
  } else if (hostname.includes("daum.net") || hostname.includes("news.daum")) {
    content = extractBySelectors(html, [
      'div[class*="article_view"]',
      'div[id="harmonyContainer"]',
      'section[class*="article_body"]',
    ]);
  } else if (hostname.includes("chosun.com")) {
    content = extractBySelectors(html, [
      'div[class*="article-body"]',
      'section[class*="article-body"]',
      'div[id="fusion-app"]',
    ]);
  } else if (hostname.includes("joongang") || hostname.includes("joins.com")) {
    content = extractBySelectors(html, [
      'div[id="article_body"]',
      'div[class*="article_body"]',
    ]);
  } else if (hostname.includes("donga.com")) {
    content = extractBySelectors(html, [
      'div[id="article_txt"]',
      'div[class*="article_txt"]',
    ]);
  } else if (hostname.includes("hani.co.kr")) {
    content = extractBySelectors(html, [
      'div[class*="article-text"]',
      'div[itemprop="articleBody"]',
    ]);
  } else if (hostname.includes("yonhap") || hostname.includes("yna.co.kr")) {
    content = extractBySelectors(html, [
      'div[class*="article-txt"]',
      'div[id="articleWrap"]',
    ]);
  } else if (hostname.includes("kbs.co.kr")) {
    content = extractBySelectors(html, [
      'div[id="cont_newstext"]',
      'div[class*="detail-body"]',
    ]);
  } else if (hostname.includes("mbc.co.kr")) {
    content = extractBySelectors(html, [
      'div[class*="news_content"]',
      'div[id="content"]',
    ]);
  } else if (hostname.includes("sbs.co.kr")) {
    content = extractBySelectors(html, [
      'div[class*="article_cont"]',
      'div[id="article_body"]',
    ]);
  } else if (hostname.includes("mk.co.kr") || hostname.includes("매일경제")) {
    content = extractBySelectors(html, [
      'div[id="article_body"]',
      'div[class*="art_body"]',
    ]);
  } else if (hostname.includes("hankyung.com")) {
    content = extractBySelectors(html, [
      'div[id="articletxt"]',
      'div[class*="article-body"]',
    ]);
  }

  // 범용 폴백
  if (!content || content.length < 100) {
    content = extractBySelectors(html, [
      'article',
      'div[itemprop="articleBody"]',
      'div[class*="article_body"]',
      'div[class*="article-body"]',
      'div[class*="news_content"]',
      'div[class*="content_article"]',
      'div[id*="article"]',
      'div[class*="body_text"]',
    ]);
  }

  // 마지막 폴백: 본문 영역 추정
  if (!content || content.length < 100) {
    content = extractBodyFallback(html);
  }

  // 텍스트 정제
  content = cleanText(content);

  return {
    title:        title || "제목 없음",
    siteName:     siteName || hostname,
    content:      content,
    contentLength: content.length,
    image:        image || null,
    url,
    method:       content.length > 100 ? "success" : "partial",
  };
}

/* ── 제목 추출 ── */
function extractTitle(html) {
  const og = extractMeta(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "";
}

/* ── 사이트명 추출 ── */
function extractSiteName(html, hostname) {
  const og = extractMeta(html, "og:site_name");
  if (og) return og;
  const siteMap = {
    "naver.com":    "네이버뉴스",
    "daum.net":     "다음뉴스",
    "chosun.com":   "조선일보",
    "joongang":     "중앙일보",
    "donga.com":    "동아일보",
    "hani.co.kr":   "한겨레",
    "yna.co.kr":    "연합뉴스",
    "kbs.co.kr":    "KBS",
    "mbc.co.kr":    "MBC",
    "sbs.co.kr":    "SBS",
    "mk.co.kr":     "매일경제",
    "hankyung.com": "한국경제",
    "cybertimes":   "사이버타임즈",
  };
  for (const [k, v] of Object.entries(siteMap)) {
    if (hostname.includes(k)) return v;
  }
  return hostname.replace("www.", "");
}

/* ── OG 메타 추출 ── */
function extractMeta(html, property) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  const m = html.match(re) || html.match(re2);
  return m ? m[1].trim() : "";
}

/* ── CSS 셀렉터 스타일 추출 (정규식 기반) ── */
function extractBySelectors(html, selectors) {
  for (const sel of selectors) {
    const content = extractByCssSelector(html, sel);
    if (content && content.length > 50) return content;
  }
  return "";
}

function extractByCssSelector(html, selector) {
  // div[id="xxx"] 또는 div[class*="xxx"] 또는 article, section
  let tagMatch, attrType, attrVal;

  const idMatch      = selector.match(/^(\w+)\[id=["']([^"']+)["']\]$/);
  const classMatch   = selector.match(/^(\w+)\[class\*=["']([^"']+)["']\]$/);
  const tagOnlyMatch = selector.match(/^(\w+)$/);
  const attrMatch    = selector.match(/^(\w+)\[(\w+)=["']([^"']+)["']\]$/);
  const itempropMatch= selector.match(/^(\w+)\[itemprop=["']([^"']+)["']\]$/);

  if (idMatch) {
    const [, tag, id] = idMatch;
    const re = new RegExp(`<${tag}[^>]+id=["']${id}["'][^>]*>`, "i");
    const m = html.match(re);
    if (m) return extractTagContent(html, m.index, tag);
  } else if (classMatch) {
    const [, tag, cls] = classMatch;
    const re = new RegExp(`<${tag}[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>`, "i");
    const m = html.match(re);
    if (m) return extractTagContent(html, m.index, tag);
  } else if (itempropMatch) {
    const [, tag, prop] = itempropMatch;
    const re = new RegExp(`<${tag}[^>]+itemprop=["']${prop}["'][^>]*>`, "i");
    const m = html.match(re);
    if (m) return extractTagContent(html, m.index, tag);
  } else if (attrMatch) {
    const [, tag, attr, val] = attrMatch;
    const re = new RegExp(`<${tag}[^>]+${attr}=["']${val}["'][^>]*>`, "i");
    const m = html.match(re);
    if (m) return extractTagContent(html, m.index, tag);
  } else if (tagOnlyMatch) {
    const tag = tagOnlyMatch[1];
    const re = new RegExp(`<${tag}[\\s>]`, "i");
    const m = html.match(re);
    if (m) return extractTagContent(html, m.index, tag);
  }
  return "";
}

/* ── 태그 내용 추출 (중첩 처리) ── */
function extractTagContent(html, startIndex, tag) {
  const openTag = new RegExp(`<${tag}[\\s>]`, "gi");
  const closeTag = new RegExp(`</${tag}>`, "gi");

  let depth = 0;
  let i = startIndex;
  let end = -1;

  openTag.lastIndex = startIndex;
  closeTag.lastIndex = startIndex;

  // 시작 태그 찾기
  const firstOpen = html.indexOf("<" + tag, startIndex);
  if (firstOpen < 0) return "";

  const tagEnd = html.indexOf(">", firstOpen);
  if (tagEnd < 0) return "";

  depth = 1;
  let pos = tagEnd + 1;

  // 최대 500KB만 처리
  const limit = Math.min(pos + 500000, html.length);

  while (pos < limit && depth > 0) {
    const nextOpen  = html.indexOf("<" + tag, pos);
    const nextClose = html.indexOf("</" + tag + ">", pos);

    if (nextClose < 0) break;

    if (nextOpen > 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + tag.length + 1;
    } else {
      depth--;
      if (depth === 0) { end = nextClose; break; }
      pos = nextClose + tag.length + 3;
    }
  }

  if (end < 0) end = Math.min(startIndex + 20000, html.length);
  return html.slice(firstOpen, end + tag.length + 3);
}

/* ── 본문 폴백: p태그 모음 ── */
function extractBodyFallback(html) {
  const mainStart = Math.max(
    html.indexOf("<main"),
    html.indexOf('<div id="content'),
    html.indexOf('<div class="content'),
  );
  const searchHtml = mainStart > 0 ? html.slice(mainStart, mainStart + 100000) : html;

  const pTags = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(searchHtml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 20) pTags.push(text);
  }
  return pTags.join("\n");
}

/* ── 텍스트 정제 ── */
function cleanText(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
