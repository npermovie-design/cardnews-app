// api/content.js — Consolidated content/crawling API
// Routes via ?action=crawl|fetch-url|fetch-url-content|trending-videos|keyword-analysis|trends

// ── Shared constants & helpers ───────────────────────────────────────────

import { isAllowedOrigin, isBlockedUrl as secBlockedUrl, rateLimit } from "../lib/security.js";

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

function setCors(req, res, { methods = "POST,OPTIONS" } = {}) {
  const origin = req.headers?.origin || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
}

function stripHtmlToText(html = "") {
  return decodeHtmlEntities(String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanArticleText(text = "") {
  const blocked = /(무단전재|재배포 금지|기자|구독|공유|댓글|좋아요|Copyright|All rights reserved|닫기|본문 바로가기)/i;
  const seen = new Set();
  return String(text)
    .split(/\n+|(?<=[.!?。])\s+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length >= 18 && !blocked.test(line))
    .filter(line => {
      const key = line.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n")
    .trim();
}

function extractJsonLdArticle(html = "") {
  const scripts = String(html).match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const found = [];
  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== "object") return;
    const type = Array.isArray(node["@type"]) ? node["@type"].join(" ") : String(node["@type"] || "");
    if (/Article|NewsArticle|BlogPosting|SocialMediaPosting/i.test(type) || node.articleBody) found.push(node);
    if (node["@graph"]) visit(node["@graph"]);
    if (node.mainEntity) visit(node.mainEntity);
  };
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try { visit(JSON.parse(decodeHtmlEntities(raw))); } catch {}
  }
  return found.find(item => item.articleBody || item.description || item.headline) || null;
}

function extractArticleContent(html = "") {
  const jsonLd = extractJsonLdArticle(html);
  if (jsonLd?.articleBody) {
    return { content: cleanArticleText(jsonLd.articleBody).slice(0, 6000), extraction: "jsonld" };
  }

  const cleanedHtml = String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const candidates = [];
  const blockPatterns = [
    /<article\b[^>]*>[\s\S]*?<\/article>/gi,
    /<main\b[^>]*>[\s\S]*?<\/main>/gi,
    /<section[^>]+(?:id|class)=["'][^"']*(?:article|news|content|post|entry|story|view|본문|dic_area|newsct_article|harmonyContainer|articleBody|articeBody|news_end)[^"']*["'][^>]*>[\s\S]*?<\/section>/gi,
    /<div[^>]+(?:id|class)=["'][^"']*(?:article|news|content|post|entry|story|view|본문|dic_area|newsct_article|harmonyContainer|articleBody|articeBody|news_end)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
  ];
  for (const pattern of blockPatterns) {
    const matches = cleanedHtml.match(pattern) || [];
    for (const match of matches) candidates.push(cleanArticleText(stripHtmlToText(match)));
  }
  candidates.push(cleanArticleText(stripHtmlToText(cleanedHtml)));

  const best = candidates
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || "";
  return { content: best.slice(0, 6000), extraction: best ? "article" : "body" };
}

// ── Action: crawl ────────────────────────────────────────────────────────

async function handleCrawl(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });
  if (!rateLimit(req, { limit: 20, windowMs: 60000 })) return res.status(429).json({ error: "요청이 너무 많습니다" });

  const { url } = req.body || {};
  if (!url || typeof url !== "string" || url.length > 2000) return res.status(400).json({ error: "url 필요" });
  if (isBlockedUrl(url) || secBlockedUrl(url)) return res.status(400).json({ error: "허용되지 않는 URL입니다." });

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

    // 스크립트/스타일/네비게이션 등 제거
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#\d+;/g, "")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 의미 있는 문장만 추출
    const sentences = text.match(/[가-힣a-zA-Z][^.!?。]{15,}[.!?。]?/g) || [];
    text = sentences.join(" ").slice(0, 5000);

    if (!text || text.length < 50) {
      return res.status(200).json({ error: "페이지 내용을 충분히 추출할 수 없습니다." });
    }

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "페이지를 불러올 수 없습니다: " + (e.message || "").slice(0, 100) });
  }
}

// ── Action: fetch-url ────────────────────────────────────────────────────

async function handleFetchUrl(req, res) {
  setCors(req, res, { methods: "POST, OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    // 네이버 블로그: 모바일 URL로 변환
    let fetchUrl = url;
    if (url.includes("blog.naver.com")) {
      const m = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/);
      if (m) fetchUrl = `https://m.blog.naver.com/${m[1]}/${m[2]}`;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return res.status(response.status).json({ error: `HTTP ${response.status}` });

    const html = await response.text();
    return res.status(200).json({ html: html.slice(0, 50000) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── Action: fetch-url-content ────────────────────────────────────────────

async function handleFetchUrlContent(req, res) {
  setCors(req, res, { methods: "GET,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });
  if (isBlockedUrl(url)) return res.status(400).json({ error: "허용되지 않는 URL입니다." });

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
        if (m?.[1]) return decodeHtmlEntities(m[1]).trim();
      }
      return "";
    };
    const jsonLd = extractJsonLdArticle(html);

    // 제목 추출
    let title = getMeta("og:title") || getMeta("twitter:title") || decodeHtmlEntities(jsonLd?.headline || "");
    if (!title) {
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = decodeHtmlEntities(tm?.[1] || "").trim();
    }
    title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim(); // 사이트명 제거

    // 설명 추출
    const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || decodeHtmlEntities(jsonLd?.description || "");

    // 썸네일
    const jsonImage = Array.isArray(jsonLd?.image) ? jsonLd.image[0]?.url || jsonLd.image[0] : jsonLd?.image?.url || jsonLd?.image;
    const thumbnail = getMeta("og:image") || getMeta("twitter:image") || jsonImage || "";
    const publishedAt = getMeta("article:published_time") || getMeta("pubdate") || jsonLd?.datePublished || "";
    const sourceName = getMeta("og:site_name") || "";
    const jsonAuthor = Array.isArray(jsonLd?.author) ? jsonLd.author[0] : jsonLd?.author;
    const author = getMeta("author") || jsonAuthor?.name || (typeof jsonAuthor === "string" ? jsonAuthor : "");

    const extracted = extractArticleContent(html);
    const content = extracted.content;

    // 본문 이미지 추출 (og:image 외 실제 본문 이미지들)
    const images = [];
    const seenImgUrls = new Set();
    if (thumbnail) seenImgUrls.add(thumbnail);
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      let imgUrl = imgMatch[1];
      if (!imgUrl || imgUrl.startsWith("data:")) continue;
      // 상대 경로 → 절대 경로
      if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
      else if (imgUrl.startsWith("/")) {
        try { const u = new URL(url); imgUrl = u.origin + imgUrl; } catch { continue; }
      }
      // 작은 아이콘/트래커/광고 필터
      if (/(icon|logo|sprite|pixel|tracker|banner|ad[_-]|btn|button|badge|avatar)/i.test(imgUrl)) continue;
      const alt = (imgMatch[0].match(/alt=["']([^"']*?)["']/i)?.[1] || "").toLowerCase();
      if (/(icon|logo|avatar|captcha)/i.test(alt)) continue;
      // 크기 힌트로 필터 (width/height < 80)
      const wMatch = imgMatch[0].match(/width=["']?(\d+)/i);
      const hMatch = imgMatch[0].match(/height=["']?(\d+)/i);
      if (wMatch && parseInt(wMatch[1]) < 80) continue;
      if (hMatch && parseInt(hMatch[1]) < 80) continue;
      if (seenImgUrls.has(imgUrl)) continue;
      seenImgUrls.add(imgUrl);
      images.push(imgUrl);
      if (images.length >= 20) break;
    }

    // 사이트 종류 감지
    let type = "web";
    const urlLower = url.toLowerCase();
    if (/(instagram\.com|threads\.(net|com)|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|band\.us|pinterest\.com)/i.test(urlLower)) {
      type = "sns";
    } else if (urlLower.includes("naver.com") || urlLower.includes("daum.net") ||
        urlLower.includes("news") || urlLower.includes("article") || urlLower.includes("기사") ||
        /(chosun|joongang|donga|hani|khan|mk\.co\.kr|hankyung|yna\.co\.kr|newsis|edaily|etnews|zdnet|itworld|bbc|cnn|reuters|apnews)/i.test(urlLower)) {
      type = "news";
    } else if (urlLower.includes("blog") || urlLower.includes("tistory") || urlLower.includes("brunch")) {
      type = "blog";
    }

    return res.status(200).json({
      type,
      title,
      description,
      content,
      contentLength: content.length,
      extraction: extracted.extraction,
      sourceName,
      publishedAt,
      author,
      thumbnail,
      images,
      url,
    });
  } catch (e) {
    return res.status(500).json({ error: "페이지를 불러올 수 없습니다: " + e.message?.slice(0, 100) });
  }
}

// ── Action: trending-videos ──────────────────────────────────────────────

async function handleTrendingVideos(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS", useWildcard: true });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category, keywords, platform = "youtube" } = req.body || {};
  if (!keywords || !keywords.length) return res.status(400).json({ error: "keywords 필요" });

  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const videos = [];

  try {
    if (platform === "youtube" || platform === "all") {
      const query = keywords.slice(0, 3).join(" ") + " shorts";
      const r = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        {
          headers: { "User-Agent": ua, "Accept-Language": "ko-KR,ko;q=0.9", "Accept": "text/html" },
          signal: AbortSignal.timeout(12000),
        }
      );

      if (r.ok) {
        const html = await r.text();
        const seen = new Set();
        const re = /"videoRenderer":\{"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"ownerText":\{"runs":\[\{"text":"([^"]+)"/g;
        let m;
        while ((m = re.exec(html)) && videos.length < 12) {
          const [, id, title, author] = m;
          if (seen.has(id)) continue;
          seen.add(id);

          const block = html.substring(m.index, m.index + 3000);
          const viewMatch = block.match(/"viewCountText":\{"simpleText":"([^"]+)"/);
          const publishMatch = block.match(/"publishedTimeText":\{"simpleText":"([^"]+)"/);
          const lengthMatch = block.match(/"lengthText".*?"simpleText":"([^"]+)"/);
          const channelUrlMatch = block.match(/"canonicalBaseUrl":"([^"]+)"/);
          const avatarMatch = block.match(/"channelThumbnailSupportedRenderers".*?"url":"([^"]+)"/);
          const viewStr = viewMatch?.[1] || "0";
          const viewNum = parseInt(viewStr.replace(/[^0-9]/g, "")) || 0;

          videos.push({
            id,
            platform: "youtube",
            title,
            author,
            authorUrl: channelUrlMatch ? `https://youtube.com${channelUrlMatch[1]}` : "",
            channelAvatar: avatarMatch?.[1] || "",
            thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            url: `https://youtube.com/watch?v=${id}`,
            views: viewNum,
            published: publishMatch?.[1] || "",
            duration: lengthMatch?.[1] || "",
          });
        }
      }
    }

    if (platform === "tiktok" || videos.length === 0) {
      for (const kw of keywords.slice(0, 2)) {
        try {
          const r = await fetch(`https://www.tiktok.com/tag/${encodeURIComponent(kw)}`, {
            headers: { "User-Agent": ua, "Accept": "text/html" },
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
          });
          if (!r.ok) continue;
          const html = await r.text();
          const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1];
          const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1];
          if (ogTitle) {
            videos.push({
              id: `tiktok_tag_${kw}`,
              platform: "tiktok",
              title: ogTitle,
              author: `#${kw}`,
              thumbnail: "",
              url: `https://www.tiktok.com/tag/${kw}`,
              views: 0,
              description: ogDesc || "",
            });
          }
        } catch {}
      }
    }

    return res.json({ videos, category, total: videos.length });
  } catch (e) {
    return res.status(500).json({ error: "영상 수집 실패: " + e.message?.slice(0, 100) });
  }
}

// ── Action: keyword-analysis ─────────────────────────────────────────────

async function handleKeywordAnalysis(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS", useWildcard: true });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { keyword, period = "7d" } = req.body;
  if (!keyword) return res.status(400).json({ error: "keyword 필수" });

  const NAVER_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;

  const result = {
    keyword,
    naverTrend: [],
    relatedKeywords: [],
    trendDirection: "stable",
    hasRealData: false,
  };

  // ── 1) 네이버 DataLab 검색 트렌드 (7일) ────────────────────
  if (NAVER_ID && NAVER_SECRET) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const fmt = d => d.toISOString().slice(0, 10);

      const dlRes = await fetch("https://openapi.naver.com/v1/datalab/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          timeUnit: "date",
          keywordGroups: [
            { groupName: keyword, keywords: [keyword] },
          ],
        }),
      });
      const dlData = await dlRes.json();
      const points = dlData?.results?.[0]?.data || [];
      result.naverTrend = points.map(p => ({ date: p.period, ratio: Math.round(p.ratio) }));
      result.hasRealData = points.length > 0;

      // 트렌드 방향 계산
      if (points.length >= 4) {
        const firstHalf = points.slice(0, Math.floor(points.length / 2));
        const secondHalf = points.slice(Math.floor(points.length / 2));
        const avg1 = firstHalf.reduce((s, p) => s + p.ratio, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((s, p) => s + p.ratio, 0) / secondHalf.length;
        if (avg2 > avg1 * 1.15) result.trendDirection = "rising";
        else if (avg2 < avg1 * 0.85) result.trendDirection = "declining";
        else result.trendDirection = "stable";
      }
    } catch (e) {
      console.error("DataLab API error:", e.message);
    }
  }

  // ── 2) 네이버 자동완성으로 관련 키워드 수집 ────────────────────
  try {
    const acRes = await fetch(`https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8`);
    const acData = await acRes.json();
    const suggestions = (acData?.items?.[0] || []).map(item => item[0]).filter(Boolean).slice(0, 10);

    // 각 자동완성 키워드에 대해 간단한 경쟁도 추정
    result.relatedKeywords = suggestions.map((kw, i) => ({
      keyword: kw,
      relevance: Math.max(100 - i * 10, 30),
      competition: i < 3 ? "high" : i < 6 ? "medium" : "low",
    }));
  } catch (e) {
    console.error("Autocomplete error:", e.message);
  }

  // ── 3) 네이버 DataLab으로 관련 키워드 트렌드 비교 (상위 5개) ─────
  if (NAVER_ID && NAVER_SECRET && result.relatedKeywords.length > 0) {
    try {
      const topKws = result.relatedKeywords.slice(0, 5);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const fmt = d => d.toISOString().slice(0, 10);

      const compareRes = await fetch("https://openapi.naver.com/v1/datalab/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          timeUnit: "date",
          keywordGroups: topKws.map(kw => ({
            groupName: kw.keyword,
            keywords: [kw.keyword],
          })),
        }),
      });
      const compareData = await compareRes.json();
      if (compareData?.results) {
        compareData.results.forEach(r => {
          const match = result.relatedKeywords.find(kw => kw.keyword === r.title);
          if (match) {
            const points = r.data || [];
            const avgRatio = points.length > 0 ? Math.round(points.reduce((s, p) => s + p.ratio, 0) / points.length) : 0;
            match.avgSearchRatio = avgRatio;
            match.trend = points.map(p => ({ date: p.period, ratio: Math.round(p.ratio) }));
          }
        });
      }
    } catch (e) {
      console.error("Compare API error:", e.message);
    }
  }

  // ── 4) API 키 없을 때 샘플 데이터 ────────────────────
  if (!result.hasRealData) {
    // 샘플 트렌드 데이터 생성 (데모용)
    const today = new Date();
    result.naverTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().slice(0, 10), ratio: 50 + Math.round(Math.random() * 40) };
    });
    result.trendDirection = "stable";
    result.notice = "네이버 API 키가 설정되지 않아 샘플 데이터입니다. NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정하세요.";
  }

  return res.status(200).json(result);
}

// ── Action: trends ───────────────────────────────────────────────────────

async function handleTrends(req, res) {
  setCors(req, res, { methods: "GET,OPTIONS" });
  const { platform = "google" } = req.query;

  try {
    if (platform === "google") {
      // Google Trends Daily (Korea) - trends.google.com (not .co.kr)
      const r = await fetch("https://trends.google.com/trending/rss?geo=KR");
      if (r.ok) {
        const xml = await r.text();
        const titles = [...xml.matchAll(/<item>\s*<title>([^<]+)<\/title>/gs)];
        const volumes = [...xml.matchAll(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/g)];
        if (titles.length > 0) {
          const keywords = titles.slice(0, 20).map((m, i) => {
            const vol = volumes[i] ? parseInt((volumes[i][1] || "0").replace(/[^0-9]/g, "")) : 0;
            return { rank: i + 1, keyword: m[1].trim(), change: i < 3 ? "up" : i < 8 ? "new" : "same", volume: vol };
          });
          return res.json({ keywords, source: "google_trends_rss", live: true });
        }
      }
    }

    if (platform === "naver") {
      // 네이버: 뉴스 헤드라인 키워드 추출 + 자동완성 병합
      const all = [];
      const seen = new Set();

      // 1. 네이버 뉴스 인기 기사에서 키워드 추출 (실시간 트렌드 근사)
      try {
        const newsRes = await fetch("https://news.naver.com/main/ranking/popularDay.naver", {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (newsRes.ok) {
          const buf = await newsRes.arrayBuffer();
          const html = new TextDecoder("euc-kr").decode(buf);
          const titles = [...html.matchAll(/class="list_title[^"]*"[^>]*>([^<]+)/g)].map(m => m[1].trim());
          // 제목에서 핵심 키워드 추출 (따옴표 안 텍스트, 고유명사 등)
          const kwSet = new Set();
          titles.slice(0, 20).forEach(title => {
            // 따옴표/작은따옴표 안 텍스트 추출
            const quoted = [...title.matchAll(/[''""「」]([^''""「」]{2,15})[''""「」]/g)].map(m => m[1].trim());
            quoted.forEach(q => { if (q.length >= 2 && q.length <= 15) kwSet.add(q); });
            // 한글 2~6글자 고유명사 추출 (마침표/조사 제거)
            const names = title.match(/[가-힣]{2,6}/g) || [];
            names.forEach(n => {
              if (!["에서","으로","이다","한다","됐다","했다","있다","없다","같은","대해","위해","라고","에게","까지","부터","에는"].includes(n) && n.length >= 2) {
                kwSet.add(n);
              }
            });
          });
          // 상위 키워드를 네이버 자동완성으로 검증 + 확장
          const topKws = [...kwSet].slice(0, 15);
          const acResults = await Promise.allSettled(topKws.map(q =>
            fetch(`https://mac.search.naver.com/mobile/ac?q=${encodeURIComponent(q)}&st=100&frm=mobile_nv&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1`)
              .then(r => r.ok ? r.json() : null).catch(() => null)
          ));
          acResults.forEach((r, idx) => {
            // 원래 키워드 먼저 추가
            const orig = topKws[idx];
            if (orig && !seen.has(orig)) { seen.add(orig); all.push({ keyword: orig, change: idx < 3 ? "up" : "new" }); }
            // 자동완성 결과도 추가
            if (r.status === "fulfilled" && r.value) {
              (r.value.items || []).flat().slice(0, 2).forEach(s => {
                const kw = s && s[0] ? s[0].trim() : "";
                if (kw && kw.length >= 2 && !seen.has(kw)) { seen.add(kw); all.push({ keyword: kw, change: "same" }); }
              });
            }
          });
        }
      } catch {}

      // 2. 폴백: 트렌드 시드 자동완성
      if (all.length < 10) {
        const seeds = ["오늘","속보","인기","주식","부동산","AI","여행","맛집","건강","드라마"];
        const fallback = await Promise.allSettled(seeds.map(q =>
          fetch(`https://mac.search.naver.com/mobile/ac?q=${encodeURIComponent(q)}&st=100&frm=mobile_nv&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1`)
            .then(r => r.ok ? r.json() : null).catch(() => null)
        ));
        fallback.forEach(r => {
          if (r.status !== "fulfilled" || !r.value) return;
          (r.value.items || []).flat().slice(0, 2).forEach(s => {
            const kw = s && s[0] ? s[0].trim() : "";
            if (kw && kw.length >= 2 && !seen.has(kw)) { seen.add(kw); all.push({ keyword: kw, change: "same" }); }
          });
        });
      }

      if (all.length > 0) return res.json({ keywords: all.slice(0, 20).map((k, i) => ({ ...k, rank: i+1 })), source: "naver_news_trend", live: true });
    }

    if (platform === "youtube") {
      // YouTube: 병렬 자동완성 (EUC-KR 디코딩)
      const seeds = ["AI","숏폼","마케팅","브이로그","뉴스","주식","요리","운동","게임","음악","공부","여행","인스타","틱톡","챗GPT"];
      const all = [];
      const seen = new Set();
      const results = await Promise.allSettled(seeds.map(q =>
        fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=ko&q=${encodeURIComponent(q)}`)
          .then(async r => { if (!r.ok) return null; const buf = await r.arrayBuffer(); return JSON.parse(new TextDecoder("euc-kr").decode(buf)); })
          .catch(() => null)
      ));
      results.forEach(r => {
        if (r.status !== "fulfilled" || !r.value) return;
        (r.value[1] || []).slice(0, 3).forEach(s => {
          const clean = (s || "").trim();
          if (clean && clean.length >= 2 && !seen.has(clean)) { seen.add(clean); all.push({ keyword: clean, change: "same" }); }
        });
      });
      if (all.length > 0) return res.json({ keywords: all.slice(0, 20).map((k, i) => ({ ...k, rank: i+1 })), source: "youtube_autocomplete", live: true });
    }

    if (platform === "reddit") {
      // Reddit 글로벌 + 한국 핫토픽
      const all = [];
      const seen = new Set();
      for (const sub of ["popular", "korea", "hanguk"]) {
        try {
          const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, { headers: { "User-Agent": "SNSMakeit/1.0" } });
          if (r.ok) {
            const d = await r.json();
            (d.data?.children || []).forEach(p => {
              const title = p.data?.title || "";
              const score = p.data?.score || 0;
              if (title && !seen.has(title) && score > 5) {
                seen.add(title);
                all.push({ keyword: title.slice(0, 60), change: score > 1000 ? "up" : score > 100 ? "new" : "same", volume: score, subreddit: p.data?.subreddit || sub });
              }
            });
          }
        } catch {}
      }
      if (all.length > 0) {
        all.sort((a, b) => b.volume - a.volume);
        return res.json({ keywords: all.slice(0, 20).map((k, i) => ({ ...k, rank: i + 1 })), source: "reddit_hot", live: true });
      }
    }

    if (platform === "tiktok") {
      try {
        const r = await fetch("https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&country_code=KR&page=1&limit=20");
        if (r.ok) {
          const d = await r.json();
          const list = d.data?.list || [];
          if (list.length > 0) {
            return res.json({
              keywords: list.map((h, i) => ({
                rank: i + 1,
                keyword: "#" + (h.hashtag_name || h.name || ""),
                change: h.trend === 1 ? "up" : h.trend === -1 ? "down" : "same",
                volume: h.publish_cnt || 0,
              })),
              source: "tiktok_creative_center", live: true,
            });
          }
        }
      } catch {}
    }

    // 폴백
    res.json({ keywords: [], source: "none", live: false });
  } catch (e) {
    res.status(500).json({ error: e.message, keywords: [] });
  }
}

// ── Router ───────────────────────────────────────────────────────────────

// ── Action: auto-publish (Render 프록시: 네이버 블로그 자동 발행) ─────────

const AUTO_PUBLISH_RENDER_URL = process.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

async function handleAutoPublish(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, platform, naverId, naverPw, blogId, post } = req.body || {};

  if (!action) return res.status(400).json({ error: "action 필요" });

  try {
    if (action === "test-publish" || action === "publish") {
      if (platform === "naver_blog") {
        // Render 서버로 프록시
        const resp = await fetch(`${AUTO_PUBLISH_RENDER_URL}/naver-publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ naverId, naverPw, blogId, post }),
        });
        const result = await resp.json();
        return res.status(200).json(result);
      }
      return res.status(400).json({ error: `미지원 플랫폼: ${platform}` });
    }

    return res.status(400).json({ error: `알 수 없는 action: ${action}` });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || "서버 오류" });
  }
}

// ── Action: keyword-volume (네이버 검색광고 API 기반 키워드 검색량 조회) ──
async function handleKeywordVolume(req, res) {
  setCors(req, res, { methods: "GET,POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const keywords = req.method === "POST"
    ? (req.body?.keywords || [])
    : (req.query.keywords || req.query.q || "").split(",").map(k => k.trim()).filter(Boolean);

  if (!keywords.length) return res.status(400).json({ error: "keywords 필요" });
  if (keywords.length > 5) return res.status(400).json({ error: "최대 5개 키워드" });

  const API_LICENSE = process.env.NAVER_AD_API_LICENSE;
  const API_SECRET = process.env.NAVER_AD_API_SECRET;
  const CUSTOMER_ID = process.env.NAVER_AD_CUSTOMER_ID;

  if (!API_LICENSE || !API_SECRET || !CUSTOMER_ID) {
    return res.status(500).json({ error: "네이버 검색광고 API 키 미설정" });
  }

  try {
    const crypto = require("crypto");
    const timestamp = Date.now().toString();
    const method = "GET";
    const uri = "/keywordstool";
    const message = `${timestamp}.${method}.${uri}`;
    const signature = crypto.createHmac("sha256", API_SECRET).update(message).digest("base64");

    const params = new URLSearchParams({
      hintKeywords: keywords.join(","),
      showDetail: "1",
    });

    const apiRes = await fetch(`https://api.naver.com${uri}?${params}`, {
      method: "GET",
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": API_LICENSE,
        "X-Customer": CUSTOMER_ID,
        "X-Signature": signature,
      },
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      return res.status(apiRes.status).json({ error: `네이버 API 오류: ${errText.slice(0, 200)}` });
    }

    const data = await apiRes.json();
    const results = (data.keywordList || []).map(kw => ({
      keyword: kw.relKeyword || "",
      monthlyPcQcCnt: kw.monthlyPcQcCnt || 0,       // PC 월간 검색량
      monthlyMobileQcCnt: kw.monthlyMobileQcCnt || 0, // 모바일 월간 검색량
      monthlyAvePcClkCnt: kw.monthlyAvePcClkCnt || 0,
      monthlyAveMobileClkCnt: kw.monthlyAveMobileClkCnt || 0,
      monthlyAvePcCtr: kw.monthlyAvePcCtr || 0,
      monthlyAveMobileCtr: kw.monthlyAveMobileCtr || 0,
      plAvgDepth: kw.plAvgDepth || 0,                  // 경쟁 정도
      compIdx: kw.compIdx || "",                        // 경쟁 지표 (높음/중간/낮음)
      totalSearch: (kw.monthlyPcQcCnt || 0) + (kw.monthlyMobileQcCnt || 0),
    }));

    // 입력 키워드 우선 정렬
    const inputSet = new Set(keywords.map(k => k.toLowerCase()));
    results.sort((a, b) => {
      const aMain = inputSet.has(a.keyword.toLowerCase()) ? 0 : 1;
      const bMain = inputSet.has(b.keyword.toLowerCase()) ? 0 : 1;
      if (aMain !== bMain) return aMain - bMain;
      return b.totalSearch - a.totalSearch;
    });

    return res.json({ keywords: results.slice(0, 30), source: "naver_searchad_api" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "검색량 조회 실패" });
  }
}

const ACTION_HANDLERS = {
  "crawl": handleCrawl,
  "fetch-url": handleFetchUrl,
  "fetch-url-content": handleFetchUrlContent,
  "trending-videos": handleTrendingVideos,
  "keyword-analysis": handleKeywordAnalysis,
  "trends": handleTrends,
  "sns-profile": handleSnsProfile,
  "auto-publish": handleAutoPublish,
  "keyword-volume": handleKeywordVolume,
};

// ── Action: sns-profile (SNS 프로필 크롤링 — 메타태그/구조화 데이터 추출) ──
async function handleSnsProfile(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });
  if (isBlockedUrl(url)) return res.status(400).json({ error: "허용되지 않는 URL" });

  const result = { url, meta: {}, texts: [], jsonLd: null };

  try {
    // 1) 인스타그램: oEmbed API 먼저 시도
    if (url.includes("instagram.com")) {
      try {
        const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.META_APP_TOKEN || ""}`;
        if (process.env.META_APP_TOKEN) {
          const oe = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
          if (oe.ok) {
            const oed = await oe.json();
            result.meta.title = oed.author_name || "";
            result.meta.description = oed.title || "";
            result.meta.image = oed.thumbnail_url || "";
            result.meta.provider = "instagram_oembed";
          }
        }
      } catch {}
    }

    // 2) 네이버 블로그: 모바일 URL로 변환 (PC는 JS렌더링이라 크롤링 안됨)
    let fetchUrl = url;
    if (url.includes("blog.naver.com") && !url.includes("m.blog.naver.com")) {
      fetchUrl = url.replace("blog.naver.com", "m.blog.naver.com");
    }

    // 2) HTML 크롤링
    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    };

    const r = await fetch(fetchUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!r.ok) return res.status(200).json({ ...result, error: `HTTP ${r.status}` });

    const html = await r.text();

    // HTML 엔티티 디코딩 헬퍼
    const decodeEntities = (s) => s
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)))
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");

    // 3) 모든 meta 태그 추출
    const metaRegex = /<meta[^>]*>/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const tag = match[0];
      const name = (tag.match(/(?:property|name)=["']([^"']*)["']/i) || [])[1];
      const content = (tag.match(/content=["']([^"']*)["']/i) || [])[1];
      if (name && content) {
        result.meta[name] = decodeEntities(content.slice(0, 500));
      }
    }

    // 4) title 태그
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) result.meta._title = titleMatch[1].slice(0, 300);

    // 5) JSON-LD 구조화 데이터 추출 (가장 중요! 팔로워/포스트수 등 포함)
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const jsonLds = [];
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        jsonLds.push(parsed);
      } catch {}
    }
    if (jsonLds.length > 0) result.jsonLd = jsonLds;

    // 6) 네이버 블로그 특화: 방문자 수, 이웃 수 등
    if (url.includes("blog.naver.com")) {
      const visitorMatch = html.match(/방문자[^\d]*(\d[\d,]+)/);
      if (visitorMatch) result.meta._visitors = visitorMatch[1];
      const neighborMatch = html.match(/이웃[^\d]*(\d[\d,]+)/);
      if (neighborMatch) result.meta._neighbors = neighborMatch[1];
      const postCountMatch = html.match(/게시[글물][^\d]*(\d[\d,]+)/);
      if (postCountMatch) result.meta._postCount = postCountMatch[1];
    }

    // 7) 본문 텍스트 추출 (태그 제거, 중요 텍스트만)
    let bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ").trim();

    // 의미 있는 문장만
    const sentences = bodyText.match(/[가-힣a-zA-Z][^.!?]{10,}[.!?]?/g) || [];
    result.texts = sentences.slice(0, 30).map(s => s.trim());

    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({ ...result, error: e.message?.slice(0, 200) });
  }
}

export default async function handler(req, res) {
  const { action } = req.query;

  // 전역 Rate Limiting (IP당 60회/분)
  if (!rateLimit(req, { limit: 60, windowMs: 60000 })) {
    return res.status(429).json({ error: "요청이 너무 많습니다" });
  }

  if (!action || !ACTION_HANDLERS[action]) {
    const origin = req.headers.origin || "";
    res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
    return res.status(400).json({ error: "잘못된 요청입니다" });
  }

  return ACTION_HANDLERS[action](req, res);
}

export const config = { maxDuration: 25 };
