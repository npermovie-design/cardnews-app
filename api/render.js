// 동적 OG 메타태그 렌더링 — Edge Runtime (비용 절감)
export const config = { runtime: "edge" };

const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;
const SITE_URL = "https://snsmakeit.com";

async function sbQuery(table, query) {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch { return null; }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);

  let title = "SNS메이킷 커뮤니티";
  let description = "SNS메이킷 사용자들과 정보를 공유하고 소통하는 커뮤니티입니다.";
  let image = `${SITE_URL}/og-image.png`;
  let canonicalUrl = `${SITE_URL}${path}`;

  const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", archive: "자료실" };
  if (segments[1]) {
    title = `${catNames[segments[1]] || "커뮤니티"} - SNS메이킷 커뮤니티`;
  }

  if (segments[2] && segments[2].startsWith("post-")) {
    const postId = segments[2].replace("post-", "");
    const post = await sbQuery("posts", `select=title,content,images&id=eq.${postId}`);
    if (post) {
      const bodyText = (post.content || "").replace(/<[^>]*>/g, "").substring(0, 160);
      title = `${post.title} - SNS메이킷`;
      description = bodyText || description;
      const imgs = Array.isArray(post.images) ? post.images : [];
      if (imgs.length > 0) image = imgs[0];
      canonicalUrl = `${SITE_URL}/community/${segments[1] || "info"}/post-${postId}`;
    }
  }

  // 봇/크롤러 판별
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|twitterbot|linkedinbot|telegram|whatsapp|discord|preview|fetcher|curl|wget|python|go-http/i.test(ua);

  let html;
  if (isBot) {
    // 크롤러: OG 메타 전용 간단 HTML
    html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="SNS메이킷">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<a href="${esc(canonicalUrl)}">SNS메이킷에서 보기</a>
</body>
</html>`;
  } else {
    // 일반 브라우저: SPA 전체 로드 (OG 메타 동적 주입)
    html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google-site-verification" content="RK3cE_t-6IlrSQbjoV4TvEg9n-Crqg8eaEByIHq_V50" />
<meta name="naver-site-verification" content="b7ec85037f97a6e5870a755bc0c1d9b90d224ed9" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(canonicalUrl)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="shortcut icon" href="/favicon.svg">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#7c6aff">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="SNS메이킷">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-E2KGX8KJ4S"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-E2KGX8KJ4S');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Nanum+Gothic:wght@400;700;800&family=Noto+Sans+KR:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'BMDOHYEON';src:url('https://cdn.jsdelivr.net/gh/webfontworld/baemin/BMDOHYEON.woff2') format('woff2');font-display:swap;}
@font-face{font-family:'NeoDunggeunmo';src:url('https://cdn.jsdelivr.net/gh/webfontworld/nexon/NeoDunggeunmo-Regular.woff2') format('woff2');font-display:swap;}
</style>
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>`;
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
