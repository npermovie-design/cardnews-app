// api/seo.js — Sitemap / RSS / Archive Auto-Tag 통합
// ?action=sitemap|rss|archive-auto-tag

import { createClient } from "@supabase/supabase-js";

// ── Sitemap ──
async function handleSitemap(req, res) {
  const SITE = "https://snsmakeit.com";
  const today = new Date().toISOString().slice(0, 10);

  // 정적 페이지
  const staticPages = [
    { url: "/", priority: "1.0", freq: "weekly", langs: true },
    { url: "/about", priority: "0.8", freq: "monthly", langs: true },
    { url: "/howto", priority: "0.7", freq: "monthly", langs: true },
    { url: "/ai", priority: "0.9", freq: "weekly", langs: true },
    { url: "/pricing", priority: "0.8", freq: "monthly", langs: true },
    { url: "/snsnews", priority: "0.8", freq: "daily" },
    { url: "/community/info", priority: "0.7", freq: "daily" },
    { url: "/community/qna", priority: "0.7", freq: "daily" },
    { url: "/community/free", priority: "0.6", freq: "daily" },
    { url: "/community/review", priority: "0.6", freq: "daily" },
    { url: "/community/archive", priority: "0.5", freq: "weekly" },
    { url: "/contact", priority: "0.5", freq: "monthly" },
    { url: "/event", priority: "0.6", freq: "weekly" },
    { url: "/analyzer", priority: "0.7", freq: "weekly", langs: true },
    { url: "/cases", priority: "0.5", freq: "monthly" },
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
    const { data: posts, error } = await sb.from("posts").select("id,subCat,created_at").order("id", { ascending: false }).limit(500);
    if (error) console.log("Sitemap Supabase error:", error.message);
    if (posts && posts.length) {
      postUrls = posts.map(p => ({
        url: `/community/${p.subCat || "info"}/post-${p.id}`,
        priority: "0.5",
        freq: "monthly",
        lastmod: p.created_at ? p.created_at.slice(0, 10) : today,
      }));
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
    const { data: posts } = await sb.from("posts").select("id,title,content,subCat,author,created_at,images").order("id", { ascending: false }).limit(50);

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
  res.setHeader("Access-Control-Allow-Origin", "*");
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
    default:
      return res.status(400).json({ error: "action 파라미터 필요: sitemap|rss|archive-auto-tag|cron-briefing" });
  }
}

// ── 매일 오전 7시 자동 SNS 브리핑 ──
async function handleCronBriefing(req, res) {
  const OPENROUTER_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_KEY) return res.status(500).json({ error: "OPENROUTER_API_KEY 미설정" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
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
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENROUTER_KEY}`, "HTTP-Referer": "https://snsmakeit.com" },
      body: JSON.stringify({ model: "anthropic/claude-haiku-4-5", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
    });
    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";
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

    return res.status(200).json({ success: true, date: todayKey, length: content.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
