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

  let fullBody = "";
  if (segments[2] && segments[2].startsWith("post-")) {
    const postId = segments[2].replace("post-", "");
    const post = await sbQuery("posts", `select=title,content,images,author,created_at&id=eq.${postId}`);
    if (post) {
      const bodyText = (post.content || "").replace(/<[^>]*>/g, "").substring(0, 300);
      fullBody = (post.content || "").replace(/<[^>]*>/g, "").substring(0, 2000);
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
${fullBody ? `<article>${esc(fullBody)}</article>` : ""}
<a href="${esc(canonicalUrl)}">SNS메이킷에서 보기</a>
</body>
</html>`;
  } else {
    // 일반 브라우저: /index.html로 리다이렉트 (SPA 라우팅)
    // Vite 빌드된 JS/CSS는 index.html에 포함되어 있으므로 직접 서빙
    const indexRes = await fetch(`${SITE_URL}/index.html`);
    if (indexRes.ok) {
      let indexHtml = await indexRes.text();
      // OG 메타태그 동적 주입 (기존 메타 대체)
      const ogMeta = `
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">`;
      // </head> 앞에 OG 메타 주입
      indexHtml = indexHtml.replace("</head>", ogMeta + "\n</head>");
      html = indexHtml;
    } else {
      // fallback: index.html 가져오기 실패 시 리다이렉트
      return new Response(null, { status: 302, headers: { Location: canonicalUrl } });
    }
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
