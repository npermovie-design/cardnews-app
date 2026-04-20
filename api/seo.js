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
    { url: "/pricing", priority: "0.8", freq: "monthly", langs: true },
    { url: "/ai", priority: "0.9", freq: "weekly", langs: true },
    { url: "/programs", priority: "0.8", freq: "weekly" },
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

  // 자료실 프로그램 페이지
  let programUrls = [];
  try {
    const sb2 = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);
    const { data: progs } = await sb2.from("programs").select("id,created_at").order("created_at", { ascending: false });
    if (progs) {
      programUrls = progs.map(p => ({
        url: `/programs/${p.id}`,
        priority: "0.7",
        freq: "monthly",
        lastmod: p.created_at ? p.created_at.slice(0, 10) : today,
      }));
    }
  } catch {}

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
${[...staticPages, ...postUrls, ...programUrls].map(urlEntry).join("\n")}
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
    case "cron-keyword":
      return handleCronKeyword(req, res);
    case "cron-daily-keywords":
      return handleCronDailyKeywords(req, res);
    case "cron-info":
      return handleCronInfo(req, res);
    case "cron-threads":
      return handleCronThreads(req, res);
    case "index-now":
      return handleIndexNow(req, res);
    case "bulk-index":
      return handleBulkIndex(req, res);
    case "naver-verify":
      return handleNaverVerify(req, res);
    default:
      return res.status(400).json({ error: "action 파라미터 필요: sitemap|rss|archive-auto-tag|cron-briefing|cron-social|cron-ai|cron-keyword|cron-daily-keywords|cron-info|index-now|bulk-index|naver-verify" });
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

// ── 매일 자동 키워드 추천 (posts 테이블 발행) ──
async function handleCronKeyword(req, res) {
  return handleCronPost(req, res, {
    tag: "키워드",
    idPrefix: "keyword",
    prompt: (todayLabel, yesterday) => `[${todayLabel} 키워드 추천] 오늘 SNS/블로그 마케팅에 활용할 수 있는 트렌딩 키워드 15개를 추천해줘.

각 키워드 항목 형식 (HTML):
<div style="margin-bottom:24px;padding:18px 22px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h3 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#1a1730">[번호]. [키워드]</h3>
<p style="margin:0 0 8px;font-size:14px;line-height:1.85;color:#333">[이 키워드가 왜 지금 뜨는지 배경 설명 2~3줄. 검색량 추이, 관련 이슈, 계절성 등]</p>
<p style="margin:0 0 6px;font-size:13px;color:#555">활용법: [블로그/인스타/유튜브 등에서 이 키워드를 어떻게 콘텐츠로 만들 수 있는지 구체적 팁 1~2줄]</p>
<p style="margin:0;font-size:12px;color:#999">경쟁도: [높음/보통/낮음] | 추천 플랫폼: [네이버블로그/인스타그램/유튜브/틱톡 중 적합한 것]</p>
</div>

구성:
- 시즌/계절 키워드 3개 (현재 시기에 맞는 것)
- 실시간 트렌드 키워드 5개 (최근 이슈/뉴스 기반)
- 롱테일 키워드 4개 (경쟁도 낮고 전환율 높은 것)
- 에버그린 키워드 3개 (꾸준히 검색되는 것)

이모지 사용 금지. 볼드(**) 사용 금지. 각 키워드는 실제 검색될 만한 구체적인 단어/구문으로 작성.

마지막 줄:
HEADLINE: [15개 중 가장 활용도 높은 키워드를 포함한 SEO 친화적 40자 이내 제목]`,
    titleFormat: (todayLabel, headline) => `[${todayLabel.replace(/\./g, "월 ").replace(/월 (\d+)$/, "월 $1일")} 키워드 추천] ${headline}`,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
  });
}

// ── 매일 자동 daily_keywords 테이블 생성 (기존 로컬 스크립트 대체) ──
async function handleCronDailyKeywords(req, res) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const sb = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
  );

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKey = now.toISOString().slice(0, 10);
  const todayLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  // 중복 체크
  const { data: existing } = await sb.from("daily_keywords").select("date").eq("date", todayKey).single();
  if (existing) return res.status(200).json({ message: "이미 존재", date: todayKey });

  const CATEGORIES = [
    { id: "AI 도구", desc: "ChatGPT, Claude, 미드저니, 노션AI, 캔바AI 등 AI 도구 활용법과 비교 리뷰" },
    { id: "AI 트렌드", desc: "AI 모델 업데이트, AI 규제, AI 산업 동향, 생성형AI 뉴스, 빅테크 AI 전략" },
    { id: "블로그", desc: "네이버 블로그 상위노출, 블로그 수익화, SEO, 키워드 분석, 체험단, 블로그 운영 팁" },
    { id: "유튜브", desc: "유튜브 알고리즘, 쇼츠 전략, 썸네일, 구독자 성장, 수익화, 편집 팁" },
    { id: "인스타", desc: "릴스 알고리즘, 팔로워 전략, 인스타 쇼핑, 해시태그, 스토리 활용, 피드 디자인" },
    { id: "틱톡", desc: "틱톡 바이럴 전략, 숏폼 콘텐츠 제작, 틱톡샵, 챌린지 기획, 틱톡 광고" },
    { id: "마케팅", desc: "콘텐츠 마케팅, 브랜드 전략, 인플루언서 협업, SNS 마케팅, CRM" },
    { id: "광고", desc: "퍼포먼스 광고, 메타 광고, 구글 광고, 네이버 검색광고, ROAS 최적화" },
    { id: "이커머스", desc: "스마트스토어, 쿠팡, 라이브커머스, 셀러 전략, 상품 소싱, 쇼핑몰 창업" },
    { id: "부업/수익화", desc: "부업 아이템, 프리랜서 수익, 제휴마케팅, 전자책, 온라인 강의, 디지털노마드" },
    { id: "트렌드", desc: "MZ세대 소비, 핫플레이스, 시즌 이슈, 문화/엔터, 식음료 트렌드" },
    { id: "뷰티", desc: "스킨케어, 메이크업, 뷰티 제품 리뷰, 성분 분석, 셀프케어 루틴" },
    { id: "건강/운동", desc: "다이어트, 홈트레이닝, 건강식품, 러닝, 필라테스, 웰니스 라이프" },
    { id: "여행/맛집", desc: "국내 여행지, 해외 여행, 맛집 추천, 카페 투어, 호텔 리뷰, 여행 팁" },
    { id: "재테크", desc: "주식, 부동산, 코인, 적금, ETF, 경제 뉴스, 절약 팁, 재무 설계" },
    { id: "자기계발", desc: "독서, 생산성, 시간관리, 습관, 커리어 성장, 자격증, 공부법" },
  ];

  // 4개 카테고리씩 묶어서 한번에 요청 (API 호출 횟수 줄이기)
  const BATCH_SIZE = 4;
  const batches = [];
  for (let i = 0; i < CATEGORIES.length; i += BATCH_SIZE) {
    batches.push(CATEGORIES.slice(i, i + BATCH_SIZE));
  }

  const allKeywords = [];

  for (const batch of batches) {
    const catList = batch.map(c => `- "${c.id}": ${c.desc}`).join("\n");
    const prompt = `당신은 SNS 콘텐츠 전략 전문가입니다. 오늘(${todayLabel}) 기준으로 다음 ${batch.length}개 분야 각각에 대해 블로그/유튜브/SNS 콘텐츠 소재로 활용할 수 있는 추천 키워드 20개씩을 선정해주세요.

분야:
${catList}

기준:
- 네이버, 구글, 다음 등에서 실시간 검색 관심도가 높은 키워드
- 시의성 있고, 글/영상 소재로 바로 활용 가능한 것
- 구체적이고 검색 가능한 롱테일 키워드 위주 (너무 포괄적인 단어 금지)

JSON 형식으로 출력:
{
  "카테고리명": [
    { "keyword": "구체적인 키워드명", "reason": "추천 이유 (80~120자)", "platforms": ["추천 플랫폼 2~3개"] }
  ]
}

규칙:
- 유효한 JSON 객체만 출력 (마크다운/코드블록 없이)
- 각 카테고리 정확히 20개
- 한국 시장 기준
- platforms는 네이버블로그, 유튜브, 인스타, 틱톡, 스레드 중 선택
- reason은 80자 이상`;

    try {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 16000, messages: [{ role: "user", content: prompt }] }),
      });
      const aiData = await aiRes.json();
      const raw = aiData.content?.[0]?.text || "";
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      for (const cat of batch) {
        const items = parsed[cat.id];
        if (Array.isArray(items)) {
          allKeywords.push(...items.map(kw => ({ ...kw, category: cat.id })));
        }
      }
    } catch (e) {
      console.error(`[cron-daily-keywords] 배치 실패:`, e.message);
    }
  }

  if (allKeywords.length === 0) {
    return res.status(500).json({ error: "키워드 생성 실패", date: todayKey });
  }

  // Supabase에 저장 (upsert)
  const { error } = await sb.from("daily_keywords").upsert({
    date: todayKey,
    keywords: JSON.stringify(allKeywords),
    created_at: now.toISOString(),
  }, { onConflict: "date" });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const summary = {};
  allKeywords.forEach(kw => { summary[kw.category] = (summary[kw.category] || 0) + 1; });

  return res.status(200).json({ success: true, date: todayKey, total: allKeywords.length, summary });
}

// ── 매일 자동 정보공유 (posts 테이블 발행) ──
async function handleCronInfo(req, res) {
  // 요일별 주제 로테이션
  const dayOfWeek = new Date(Date.now() + 9 * 60 * 60 * 1000).getDay();
  const topics = [
    { theme: "SNS 알고리즘 공략법", focus: "인스타그램/틱톡/유튜브 알고리즘 최신 변화와 대응 전략" },
    { theme: "콘텐츠 제작 노하우", focus: "릴스/숏폼/카드뉴스/블로그 등 콘텐츠 제작 실전 팁" },
    { theme: "마케팅 성공 사례 분석", focus: "최근 화제된 브랜드/크리에이터의 SNS 마케팅 전략 분석" },
    { theme: "SNS 트렌드 리포트", focus: "이번 주 SNS 플랫폼별 트렌드, 밈, 챌린지, 해시태그 분석" },
    { theme: "수익화 전략 가이드", focus: "SNS/블로그 수익화, 협찬, 제휴마케팅, 쿠팡파트너스 등 실전 노하우" },
    { theme: "브랜딩 & 퍼스널브랜딩", focus: "개인/기업 브랜딩 전략, 포지셔닝, 차별화 방법론" },
    { theme: "AI 마케팅 활용법", focus: "ChatGPT/Claude/미드저니 등 AI 도구를 마케팅에 활용하는 실전 방법" },
  ];
  const topic = topics[dayOfWeek];

  return handleCronPost(req, res, {
    tag: "정보",
    idPrefix: "info",
    prompt: (todayLabel, yesterday) => `[${todayLabel} 정보공유] 오늘의 주제: "${topic.theme}"

${topic.focus}에 대해 실무자가 바로 활용할 수 있는 깊이 있는 정보 글을 작성해줘.

형식 (HTML):
<div style="margin-bottom:20px;padding:18px 22px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#1a1730">[소제목]</h2>
<p style="margin:0 0 12px;font-size:14px;line-height:1.9;color:#333">[본문 내용]</p>
</div>

구성 요건:
- 도입부: 왜 이 주제가 지금 중요한지 (2~3문장)
- 본론: 핵심 내용 5~7개 섹션 (각 섹션에 소제목 + 구체적 설명 + 실전 적용법)
- 실전 체크리스트: 오늘 바로 실행할 수 있는 액션 아이템 3~5개
- 마무리: 핵심 요약 2~3문장

총 분량: 2000~3000자. 이모지 사용 금지. 볼드(**) 사용 금지.
구체적인 수치, 사례, 도구명을 포함해서 실용적으로 작성.

마지막 줄:
HEADLINE: [글의 핵심을 담은 SEO 친화적 40자 이내 제목]`,
    titleFormat: (todayLabel, headline) => `[${todayLabel.replace(/\./g, "월 ").replace(/월 (\d+)$/, "월 $1일")} ${topic.theme}] ${headline}`,
    image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80",
  });
}

// ── Threads @choi.openai 모니터링 → 정보공유 자동 발행 ──
async function handleCronThreads(req, res) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const sb = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
  );

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const results = { checked: false, published: false, pending: false };

  // ── Step 1: 예약된 pending 글이 있으면 발행 ──
  try {
    const { data: pendings } = await sb.from("sns_news")
      .select("*")
      .eq("category", "threads_pending");

    for (const p of (pendings || [])) {
      const publishAt = new Date(p.summary);
      if (publishAt > new Date()) continue; // 아직 시간 안 됨

      // AI로 정보글 생성
      const threadContent = p.content;
      const prompt = `다음은 AI/기술 전문가 @choi.openai의 최신 Threads 게시물입니다:

${threadContent}

위 내용을 바탕으로 SNS 마케팅/AI 정보공유 글을 작성해줘.

형식 (HTML):
<div style="margin-bottom:20px;padding:18px 22px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#1a1730">[소제목]</h2>
<p style="margin:0 0 12px;font-size:14px;line-height:1.9;color:#333">[본문 내용]</p>
</div>

요구사항:
- 원문의 핵심 인사이트를 바탕으로 확장 분석
- 실무자가 바로 활용할 수 있는 깊이 있는 해설
- 원문 출처(@choi.openai Threads) 하단에 명시
- 1500~3000자
- 이모지 사용 금지. 볼드(**) 사용 금지.

마지막 줄:
HEADLINE: [핵심을 담은 SEO 친화적 40자 이내 제목]`;

      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 6000, messages: [{ role: "user", content: prompt }] }),
        });
        const aiData = await aiRes.json();
        const content = aiData.content?.[0]?.text || "";
        if (!content || content.length < 200) continue;

        const headlineMatch = content.match(/HEADLINE:\s*(.+)/);
        const headline = headlineMatch ? headlineMatch[1].trim() : "AI 트렌드 인사이트";
        const cleanContent = content.replace(/\n?HEADLINE:.*$/m, "").trim();

        const todayLabel = now.toISOString().slice(0, 10).replace(/-/g, ".");
        const title = `[AI 인사이트] ${headline}`;
        const postId = p.id.replace("threads_pending_", "threads_");
        const image = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80";
        const body = `<div style="margin-bottom:28px"><img src="${image}" alt="${title}" style="width:100%;max-width:800px;border-radius:14px;display:block"></div>\n${cleanContent}\n<div style="margin-top:24px;padding:12px 16px;border-radius:10px;background:rgba(124,106,255,0.04);font-size:12px;color:#999">출처: <a href="https://www.threads.com/@choi.openai" target="_blank" style="color:#7c6aff">@choi.openai Threads</a></div>`;

        await sb.from("posts").upsert({
          id: postId,
          title,
          content: body,
          cat: "info",
          subCat: "info",
          tag: "AI",
          author: "AI알리미",
          author_uid: "system_cron",
          images: [image],
          views: 0,
          likes: 0,
          comments: [],
          created_at: new Date().toISOString(),
        }, { onConflict: "id" });

        // pending → published로 변경
        await sb.from("sns_news").update({ category: "threads_published" }).eq("id", p.id);
        results.published = true;
      } catch (e) {
        console.log("Threads publish error:", e.message);
      }
    }
  } catch (e) {
    console.log("Threads pending check error:", e.message);
  }

  // ── Step 2: Threads 새 글 감지 ──
  try {
    const threadsRes = await fetch("https://www.threads.com/@choi.openai", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    });
    const html = await threadsRes.text();
    results.checked = true;

    // 포스트 텍스트 추출
    const textMatches = [...html.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)];
    const texts = textMatches
      .map(m => { try { return JSON.parse('"' + m[1] + '"'); } catch { return ""; } })
      .filter(t => t.length > 50);

    if (!texts.length) return res.status(200).json({ ...results, message: "포스트 추출 실패" });

    // 최신 글의 해시 생성 (앞 80자 기준)
    const latestText = texts[0];
    const hashStr = Buffer.from(latestText.slice(0, 80)).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);

    // 이미 처리했는지 확인 (pending 또는 published)
    const { data: existing } = await sb.from("sns_news")
      .select("id")
      .or(`id.eq.threads_pending_${hashStr},id.eq.threads_${hashStr}`)
      .limit(1);

    if (existing?.length) return res.status(200).json({ ...results, message: "이미 감지된 글", hash: hashStr });

    // 새 글 발견! 1~5시간 랜덤 딜레이로 예약
    const delayHours = 1 + Math.random() * 4; // 1~5시간
    const publishAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

    // 최근 글 3개까지 합쳐서 저장
    const threadContent = texts.slice(0, 3).join("\n\n───\n\n");

    await sb.from("sns_news").upsert({
      id: `threads_pending_${hashStr}`,
      title: `[대기] ${latestText.slice(0, 60)}...`,
      content: threadContent,
      category: "threads_pending",
      summary: publishAt.toISOString(),
      author_uid: "system_cron",
      platforms: ["threads"],
      pinned: false,
      views: 0,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" });

    results.pending = true;
    return res.status(200).json({
      ...results,
      message: "새 글 감지, 발행 예약됨",
      hash: hashStr,
      publishAt: publishAt.toISOString(),
      delayHours: Math.round(delayHours * 10) / 10,
    });
  } catch (e) {
    return res.status(500).json({ ...results, error: e.message });
  }
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

    // 검색엔진에 새 글 색인 요청 (비동기, 실패 무시)
    const postUrl = `https://snsmakeit.com/community/info/post-${postId}`;
    pingSearchEngines(postUrl).catch(() => {});

    return res.status(200).json({ success: true, date: todayKey, tag: opts.tag, title, length: body.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ── 검색엔진 색인 요청 ──
async function pingSearchEngines(pageUrl) {
  const sitemapUrl = "https://snsmakeit.com/sitemap.xml";
  const indexNowKey = process.env.INDEXNOW_KEY || "";

  const pings = [
    // Google sitemap ping
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => {}),
    // IndexNow (Bing, Yandex, Seznam)
    indexNowKey ? fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "snsmakeit.com",
        key: indexNowKey,
        urlList: [pageUrl],
      }),
    }).catch(() => {}) : Promise.resolve(),
  ];

  await Promise.allSettled(pings);
}
