// api/news.js - Vercel Serverless Function
// 뉴스 기사 크롤러: CORS 우회 + 본문 추출

export const config = { runtime: "edge" };

function isAllowedOrigin(o) { return o.includes("snsmakeit.com") || o.includes("vercel.app") || o.includes("localhost"); }
function getAllowedOrigin(req) {
  const origin = req.headers.get("origin") || "";
  return isAllowedOrigin(origin) ? origin : "https://snsmakeit.com";
}

function isBlockedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return true;
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "[::1]") return true;
    const parts = host.split(".").map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
      if (parts[0] === 127) return true;
    }
    return false;
  } catch { return true; }
}

// 지원 언론사 파서 목록
const PARSERS = [
  { name: "네이버뉴스",  host: "n.news.naver.com",    sel: "#dic_area" },
  { name: "네이버뉴스",  host: "news.naver.com",       sel: "#dic_area" },
  { name: "다음뉴스",    host: "v.daum.net",            sel: ".article_view" },
  { name: "조선일보",    host: "www.chosun.com",        sel: ".article-body" },
  { name: "중앙일보",    host: "www.joongang.co.kr",   sel: "#article_body" },
  { name: "동아일보",    host: "www.donga.com",         sel: ".article_txt" },
  { name: "한겨레",      host: "www.hani.co.kr",        sel: ".article-text" },
  { name: "연합뉴스",    host: "www.yna.co.kr",         sel: ".article" },
  { name: "KBS",         host: "news.kbs.co.kr",        sel: "#cont_newstext" },
  { name: "MBC",         host: "imnews.imbc.com",       sel: ".news_txt" },
  { name: "SBS",         host: "news.sbs.co.kr",        sel: "#textBody" },
  { name: "매일경제",    host: "www.mk.co.kr",          sel: ".news_cnt_detail_wrap" },
  { name: "한국경제",    host: "www.hankyung.com",      sel: "#articletxt" },
  { name: "사이버타임즈",host: "cybertimes.co.kr",      sel: ".article-body,.view_con,.news_view" },
];

function getSiteName(hostname) {
  const p = PARSERS.find(p => hostname.includes(p.host.replace("www.", "")));
  return p ? p.name : hostname;
}

// 간단한 HTML → 텍스트 변환 (정규식 기반)
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 제목 추출
function extractTitle(html) {
  const og = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (og) return og[1].trim();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) return title[1].replace(/\s*[-|–—]\s*.*$/, "").trim();
  return "";
}

// 본문 추출: CSS 선택자 기반 (간단 구현)
function extractBySelector(html, selector) {
  // 여러 선택자 시도
  const selectors = selector.split(",").map(s => s.trim());
  for (const sel of selectors) {
    const id = sel.startsWith("#") ? sel.slice(1) : null;
    const cls = sel.startsWith(".") ? sel.slice(1) : null;
    let match = null;
    if (id) {
      const re = new RegExp(`id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/(?:div|article|section)`, "i");
      match = html.match(re);
    } else if (cls) {
      const re = new RegExp(`class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:div|article|section)`, "i");
      match = html.match(re);
    }
    if (match && match[1] && match[1].length > 100) {
      return htmlToText(match[1]);
    }
  }
  return null;
}

// 본문 자동 추출 (article 태그 → p 태그 누적)
function extractAutoContent(html) {
  // article 태그 내용 우선
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    const text = htmlToText(articleMatch[1]);
    if (text.length > 300) return text;
  }
  // p 태그 누적
  const pTags = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const texts = pTags.map(m => htmlToText(m[1])).filter(t => t.length > 20);
  if (texts.length >= 3) return texts.join("\n\n");
  return null;
}

export default async function handler(req) {
  const _corsOrigin = getAllowedOrigin(req);
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "URL이 필요합니다" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": _corsOrigin },
    });
  }

  if (isBlockedUrl(targetUrl)) {
    return new Response(JSON.stringify({ error: "허용되지 않는 URL입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": _corsOrigin },
    });
  }

  let hostname = "";
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    return new Response(JSON.stringify({ error: "올바른 URL 형식이 아닙니다" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": _corsOrigin },
    });
  }

  // ── 방법 1: 직접 fetch ──
  let html = "";
  let method = "direct";
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": "https://www.google.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      html = await res.text();
    }
  } catch (e) {
    method = "proxy";
  }

  // ── 방법 2: allorigins 프록시 ──
  if (!html || html.length < 500) {
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (res.ok) {
        const data = await res.json();
        if (data.contents && data.contents.length > 200) {
          html = data.contents;
          method = "proxy";
        }
      }
    } catch (e) {
      method = "failed";
    }
  }

  if (!html || html.length < 200) {
    return new Response(JSON.stringify({
      error: "기사를 불러오지 못했습니다. 지원하지 않는 언론사이거나 접근이 제한된 URL입니다.",
      method: "none",
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": _corsOrigin },
    });
  }

  // ── 본문 추출 ──
  const title = extractTitle(html);
  const siteName = getSiteName(hostname);
  const parser = PARSERS.find(p => hostname.includes(p.host.replace("www.", "")));

  let content = null;
  if (parser) {
    content = extractBySelector(html, parser.sel);
  }
  if (!content || content.length < 100) {
    content = extractAutoContent(html);
  }
  if (!content || content.length < 50) {
    content = htmlToText(html).slice(0, 5000);
  }

  return new Response(JSON.stringify({
    title,
    siteName,
    url: targetUrl,
    content: content.slice(0, 8000),
    contentLength: content.length,
    method,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": _corsOrigin,
      "Cache-Control": "no-store",
    },
  });
}
