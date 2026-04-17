// api/seo.js — Sitemap / RSS / Archive Auto-Tag 통합
// ?action=sitemap|rss|archive-auto-tag

import { createClient } from "@supabase/supabase-js";

// ── Sitemap ──
async function handleSitemap(req, res) {
  const SITE = "https://snsmakeit.com";
  const today = new Date().toISOString().slice(0, 10);

  // 정적 페이지
  // 실질적 콘텐츠가 있는 정적 페이지만 포함
  // 앱 UI 페이지(/ai, /analyzer)와 콘텐츠 부족 페이지(/cases)는 제외
  const staticPages = [
    { url: "/", priority: "1.0", freq: "weekly", langs: true },
    { url: "/about", priority: "0.8", freq: "monthly", langs: true },
    { url: "/howto", priority: "0.7", freq: "monthly", langs: true },
    { url: "/pricing", priority: "0.8", freq: "monthly", langs: true },
    { url: "/snsnews", priority: "0.8", freq: "daily" },
    { url: "/community/info", priority: "0.7", freq: "daily" },
    { url: "/community/qna", priority: "0.7", freq: "daily" },
    { url: "/community/showcase", priority: "0.7", freq: "daily" },
    { url: "/community/archive", priority: "0.5", freq: "weekly" },
    { url: "/community/sns_briefing", priority: "0.7", freq: "daily" },
    { url: "/contact", priority: "0.5", freq: "monthly" },
    { url: "/event", priority: "0.6", freq: "weekly" },
    { url: "/legal", priority: "0.3", freq: "yearly" },
  ];

  // Supabase에서 게시글 가져오기
  let postUrls = [];
  try {
    const sb = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_KEY
    );
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_KEY) {
      console.log("Sitemap: Supabase env vars missing");
      return;
    }
    const { data: posts, error } = await sb.from("posts").select("id,subCat,created_at").order("id", { ascending: false }).limit(2000);
    if (error) console.log("Sitemap Supabase error:", error.message);
    if (posts && posts.length) {
      const now = Date.now();
      const D30 = 30 * 86400 * 1000;
      const D180 = 180 * 86400 * 1000;
      postUrls = posts.map(p => {
        const ts = p.created_at ? new Date(p.created_at).getTime() : now;
        const age = now - ts;
        let priority = "0.4", freq = "monthly";
        if (age < D30) { priority = "0.8"; freq = "weekly"; }
        else if (age < D180) { priority = "0.6"; freq = "monthly"; }
        return {
          url: `/community/${p.subCat || "info"}/post-${p.id}`,
          priority,
          freq,
          lastmod: p.created_at ? p.created_at.slice(0, 10) : today,
        };
      });
    }
  } catch (e) { console.log("Sitemap error:", e.message); }

  // XML 생성
  const hreflang = (url) => `
    <xhtml:link rel="alternate" hreflang="ko" href="${SITE}${url}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${url}?lang=en"/>
    <xhtml:link rel="alternate" hreflang="ja" href="${SITE}${url}?lang=ja"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE}${url}?lang=zh"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${url}"/>`;

  const urlEntry = (p) => `  <url>
    <loc>${SITE}${p.url}</loc>
    <lastmod>${p.lastmod || today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>${p.langs ? hreflang(p.url) : ""}
  </url>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...staticPages, ...postUrls].map(urlEntry).join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=172800");
  res.status(200).send(xml);
}

// ── RSS ──
async function handleRss(req, res) {
  const SITE = "https://snsmakeit.com";

  let items = "";
  try {
    const sb = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_KEY
    );
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_KEY) {
      console.log("RSS: Supabase env vars missing");
      return;
    }
    const { data: posts } = await sb.from("posts").select("id,title,content,subCat,author,created_at,images").order("created_at", { ascending: false }).limit(50);

    if (posts) {
      items = posts.map(p => {
        const plainBody = (p.content || p.body || "").replace(/<[^>]*>/g, "").slice(0, 300);
        const cat = p.subCat || "info";
        const link = `${SITE}/community/${cat}/post-${p.id}`;
        const pubDate = p.created_at ? new Date(p.created_at).toUTCString() : new Date().toUTCString();
        const image = p.images?.[0] ? `<enclosure url="${p.images[0]}" type="image/jpeg"/>` : "";
        return `    <item>
      <title><![CDATA[${p.title || "제목 없음"}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${plainBody}]]></description>
      <author>${p.author || p.nick || "SNS메이킷"}</author>
      <pubDate>${pubDate}</pubDate>
      <category>${cat}</category>
      ${image}
    </item>`;
      }).join("\n");
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SNS메이킷 커뮤니티</title>
    <link>${SITE}/community</link>
    <description>SNS메이킷 커뮤니티 - 정보공유, 질문답변, 자료실</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/og-image.png</url>
      <title>SNS메이킷</title>
      <link>${SITE}</link>
    </image>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=1800");
  res.status(200).send(xml);
}

// ── Archive Auto-Tag ──
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

function detectTag(images) {
  if (!Array.isArray(images) || images.length === 0) return "";
  const url = images[0].toLowerCase();
  if (/\.(mp4|mov|avi|webm|mkv|m4v)/.test(url)) return "영상";
  if (/\.gif/.test(url)) return "GIF";
  if (/\.(mp3|wav|ogg|flac|aac|m4a)/.test(url)) return "음악";
  if (/\.(jpg|jpeg|png|webp|avif|bmp|svg|tiff)/.test(url)) return "사진";
  return "";
}

async function handleArchiveAutoTag(req, res) {
  const _origin = req.headers?.origin || ""; res.setHeader("Access-Control-Allow-Origin", _origin.includes("snsmakeit.com") || _origin.includes("vercel.app") || _origin.includes("localhost") ? _origin : "https://snsmakeit.com");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // 자료실 게시글 중 tag가 비어있는 것만 조회
    const { data: posts, error } = await supabaseAdmin
      .from("posts")
      .select("id, images, tag")
      .or("cat.eq.archive,subCat.eq.archive")
      .order("id", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    let updated = 0;
    for (const post of (posts || [])) {
      const newTag = detectTag(post.images);
      if (newTag && post.tag !== newTag) {
        await supabaseAdmin.from("posts").update({ tag: newTag }).eq("id", post.id);
        updated++;
      }
    }

    return res.status(200).json({ success: true, total: (posts || []).length, updated });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── IndexNow (Bing/Yandex/네이버) + Google ping ──
async function handleIndexNow(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 파라미터 필요" });

  const SITE = "https://snsmakeit.com";
  const KEY = "b7ec85037f97a6e5870a755bc0c1d9b90d224ed9"; // 네이버 인증키 재활용
  const fullUrl = url.startsWith("http") ? url : SITE + url;

  const results = {};
  // 1) IndexNow (Bing, Yandex, Naver 동시 지원)
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: "snsmakeit.com", key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: [fullUrl] }),
    });
    results.indexnow = { status: r.status, ok: r.ok };
  } catch (e) { results.indexnow = { error: e.message }; }

  // 2) Google sitemap ping
  try {
    const sm = encodeURIComponent(SITE + "/sitemap.xml");
    await fetch(`https://www.google.com/ping?sitemap=${sm}`);
    results.google_ping = "ok";
  } catch (e) { results.google_ping = e.message; }

  return res.status(200).json({ success: true, url: fullUrl, results });
}

// ── 대량 IndexNow 제출 (모든 게시글) ──
async function handleBulkIndex(req, res) {
  const SITE = "https://snsmakeit.com";
  const KEY = "b7ec85037f97a6e5870a755bc0c1d9b90d224ed9";
  try {
    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);
    const { data: posts } = await sb.from("posts").select("id,subCat").order("id", { ascending: false }).limit(2000);
    if (!posts?.length) return res.status(200).json({ message: "게시글 없음" });
    const urlList = posts.map(p => `${SITE}/community/${p.subCat || "info"}/post-${p.id}`);
    // IndexNow는 최대 10,000개씩 전송 가능
    const batchSize = 500;
    const results = [];
    for (let i = 0; i < urlList.length; i += batchSize) {
      const batch = urlList.slice(i, i + batchSize);
      try {
        const r = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: "snsmakeit.com", key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
        });
        results.push({ batch: Math.floor(i / batchSize) + 1, count: batch.length, status: r.status });
      } catch (e) { results.push({ batch: Math.floor(i / batchSize) + 1, error: e.message }); }
    }
    // Google sitemap ping
    try { await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITE + "/sitemap.xml")}`); } catch {}
    return res.status(200).json({ success: true, totalUrls: urlList.length, batches: results });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

// ── Naver 서치어드바이저 인증 ──
function handleNaverVerify(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("X-Middleware-Skip", "1");
  return res.status(200).send("naver13ff0ecd787361289eef4e82f97736a");
}

// ── Router ──
export default async function handler(req, res) {
  const action = req.query.action;

  switch (action) {
    case "sitemap":
      return handleSitemap(req, res);
    case "rss":
      return handleRss(req, res);
    case "archive-auto-tag":
      return handleArchiveAutoTag(req, res);
    case "cron-briefing":
      return handleCronBriefing(req, res);
    case "cron-social":
      return handleCronSocial(req, res);
    case "cron-ai":
      return handleCronAI(req, res);
    case "index-now":
      return handleIndexNow(req, res);
    case "bulk-index":
      return handleBulkIndex(req, res);
    case "naver-verify":
      return handleNaverVerify(req, res);
    default:
      return res.status(400).json({ error: "action 파라미터 필요: sitemap|rss|archive-auto-tag|cron-briefing|index-now|bulk-index|naver-verify" });
  }
}

// ── 매일 오전 7시 자동 SNS 브리핑 ──
async function handleCronBriefing(req, res) {
  const SEO_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!SEO_ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
  );

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKey = now.toISOString().slice(0, 10);
  const todayLabel = todayKey.replace(/-/g, ".");
  const briefingId = `briefing_${todayKey}`;

  // 중복 체크
  const { data: existing } = await supabase.from("sns_news").select("id").eq("id", briefingId).single();
  if (existing) return res.status(200).json({ message: "이미 존재", date: todayKey });

  const yesterday = new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10).replace(/-/g, ".");
  const prompt = `[${todayLabel} 마케팅 뉴스클리핑] ${yesterday}~${todayLabel} 최근 24시간 내 SNS/디지털 마케팅 관련 주요 뉴스 7개를 뉴스클리핑 형태로 작성해줘.

형식:
## 1. [구체적인 뉴스 제목]
[상세 내용 3~5문장. 구체적인 수치, 변경 내용, 영향을 포함. 전날~오늘 사이 발생한 실제 뉴스 기반]
📎 출처: [언론사/플랫폼명] | 관련: #키워드1 #키워드2

총 7개. 한국 뉴스 4개 + 글로벌 3개. 이모지 금지(📎만 허용). 볼드(**) 금지. 최근 24시간 내 뉴스 위주로.

마지막 줄에 아래 형식으로 대표 제목을 추가:
HEADLINE: [7개 중 검색량/관심도 가장 높은 핵심 이슈를 SEO 친화적으로 가다듬어 30자 이내 제목]`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": SEO_ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text || "";
    if (!content || content.length < 100) throw new Error("AI 응답 부족");

    // AI가 생성한 대표 제목 추출 (HEADLINE: 패턴)
    const headlineMatch = content.match(/HEADLINE:\s*(.+)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : ((content.match(/^##\s*\d+\.\s*(.+)/m) || [])[1] || "SNS 마케팅 뉴스클리핑");
    const briefingTitle = `[${todayLabel}] ${headline}`;
    // HEADLINE 줄은 본문에서 제거
    const cleanContent = content.replace(/\n?HEADLINE:.*$/m, "").trim();

    await supabase.from("sns_news").upsert({
      id: briefingId,
      title: briefingTitle,
      content: cleanContent,
      category: "briefing",
      platforms: ["instagram", "youtube", "tiktok", "naver"],
      author_uid: "system_cron",
      pinned: false,
      views: 0,
      summary: `${todayLabel} SNS 마케팅 주요 뉴스 7선 - 매일 오전 7시 자동 발행`,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    // 자동 색인 요청 (IndexNow)
    try {
      const KEY = "b7ec85037f97a6e5870a755bc0c1d9b90d224ed9";
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: "snsmakeit.com", key: KEY, keyLocation: `https://snsmakeit.com/${KEY}.txt`, urlList: ["https://snsmakeit.com/snsnews"] }),
      });
    } catch {}

    return res.status(200).json({ success: true, date: todayKey, length: content.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── 매일 오전 자동 소셜클리핑 (posts 테이블 발행) ──
async function handleCronSocial(req, res) {
  return handleCronPost(req, res, {
    tag: "마케팅",
    idPrefix: "social",
    prompt: (todayLabel, yesterday) => `[${todayLabel} 소셜클리핑] ${yesterday}~${todayLabel} 최근 24시간 내 SNS/디지털 마케팅/이커머스/광고 관련 주요 뉴스 20개를 작성해줘.

각 항목 형식 (HTML):
<div style="margin-bottom:28px;padding:20px 24px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h3 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#1a1730">[번호]. [구체적인 뉴스 제목]</h3>
<p style="margin:0 0 10px;font-size:14px;line-height:1.85;color:#333">[상세 내용 3~4줄. 구체적인 수치, 변경 내용, 시장 영향, 마케터가 알아야 할 핵심 포인트를 포함]</p>
<p style="margin:0;font-size:12px;color:#999">출처: [언론사/플랫폼명]</p>
</div>

총 20개. 한국 뉴스 12개 + 글로벌 8개. 이모지 사용 금지. 볼드(**) 사용 금지.
카테고리: 인스타그램/유튜브/틱톡/네이버/카카오 플랫폼 업데이트, 디지털 광고, 이커머스, 인플루언서, AI 마케팅, 소비 트렌드 등.

마지막 줄:
HEADLINE: [20개 중 가장 화제인 뉴스를 SEO 친화적 40자 이내 제목으로]`,
    titleFormat: (todayLabel, headline) => `[${todayLabel.replace(/\./g, "월 ").replace(/월 (\d+)$/, "월 $1일")} 소셜클리핑] ${headline} 외`,
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80",
  });
}

// ── 매일 오전 자동 AI뉴스 (posts 테이블 발행) ──
async function handleCronAI(req, res) {
  return handleCronPost(req, res, {
    tag: "AI",
    idPrefix: "ainews",
    prompt: (todayLabel, yesterday) => `[${todayLabel} AI뉴스] ${yesterday}~${todayLabel} 최근 24시간 내 AI/인공지능 관련 주요 뉴스 20개를 작성해줘.

각 항목 형식 (HTML):
<div style="margin-bottom:28px;padding:20px 24px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h3 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#1a1730">[번호]. [구체적인 뉴스 제목]</h3>
<p style="margin:0 0 10px;font-size:14px;line-height:1.85;color:#333">[상세 내용 3~4줄. 구체적인 수치, 변경 내용, 기술적 의미, 실무 영향을 포함]</p>
<p style="margin:0;font-size:12px;color:#999">출처: [언론사/플랫폼명]</p>
</div>

총 20개. 이모지 사용 금지. 볼드(**) 사용 금지.
필수 포함 영역:
- Claude/Anthropic, ChatGPT/OpenAI, Gemini/Google, Meta AI 등 주요 AI 모델 업데이트
- AI 스타트업/기업 뉴스 (투자/인수/출시)
- AI 규제/정책 동향 (한국/미국/EU)
- AI 활용 사례 (마케팅/의료/교육/코딩 등)
- AI 오픈소스/연구 동향

마지막 줄:
HEADLINE: [20개 중 가장 화제인 뉴스를 SEO 친화적 40자 이내 제목으로]`,
    titleFormat: (todayLabel, headline) => `[${todayLabel.replace(/\./g, "월 ").replace(/월 (\d+)$/, "월 $1일")} AI뉴스] ${headline} 외`,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
  });
}

// ── 공통: posts 테이블에 자동 발행 ──
async function handleCronPost(req, res, opts) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const sb = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
  );

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKey = now.toISOString().slice(0, 10);
  const todayLabel = todayKey.replace(/-/g, ".");
  const postId = `${opts.idPrefix}_${todayKey}`;

  // 중복 체크
  const { data: existing } = await sb.from("posts").select("id").eq("id", postId).single();
  if (existing) return res.status(200).json({ message: "이미 존재", date: todayKey });

  const yesterday = new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10).replace(/-/g, ".");
  const prompt = opts.prompt(todayLabel, yesterday);

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    const content = aiData.content?.[0]?.text || "";
    if (!content || content.length < 200) throw new Error("AI 응답 부족: " + content.length + "자");

    const headlineMatch = content.match(/HEADLINE:\s*(.+)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : "주요 뉴스 모음";
    const cleanContent = content.replace(/\n?HEADLINE:.*$/m, "").trim();
    const title = opts.titleFormat(todayLabel, headline);

    // 상단 이미지 + 본문
    const body = `<div style="margin-bottom:28px"><img src="${opts.image}" alt="${title}" style="width:100%;max-width:800px;border-radius:14px;display:block"></div>\n${cleanContent}`;

    await sb.from("posts").upsert({
      id: postId,
      title,
      content: body,
      cat: "info",
      subCat: "info",
      tag: opts.tag,
      author: "AI알리미",
      author_uid: "system_cron",
      images: [opts.image],
      views: 0,
      likes: 0,
      comments: [],
      created_at: now.toISOString(),
    }, { onConflict: "id" });

    return res.status(200).json({ success: true, date: todayKey, tag: opts.tag, title, length: body.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
