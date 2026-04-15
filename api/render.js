// 동적 OG 메타태그 렌더링 — Edge Runtime (비용 절감)
export const config = { runtime: "edge" };

const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;
const SITE_URL = "https://snsmakeit.com";

// HTML 태그 + 마크다운 문법 제거 → 평문
function stripMdHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isUsableOgImage(url) {
  if (!url) return false;
  const u = String(url).split("?")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp|avif)$/i.test(u)) return true;
  if (/\.(pdf|mp4|mov|avi|webm|mkv|m4v|mp3|wav|ogg|zip|hwp|docx?|pptx?|xlsx?)$/i.test(u)) return false;
  return true;
}

function extractFirstImageUrl(content) {
  if (!content) return "";
  const html = String(content);
  const imgTag = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgTag) return imgTag[1];
  const mdImg = html.match(/!\[[^\]]*\]\(([^)\s]+)/);
  if (mdImg) return mdImg[1];
  return "";
}

function extractKeywords(title, plainBody, catName) {
  const text = `${title || ""} ${plainBody || ""}`;
  const tokens = (text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || []);
  const STOP = new Set(["그리고","그러나","하지만","때문","위해","대한","있는","있다","합니다","입니다","된다","이다","것은","이것","그것","오늘","어제","내일","through","about","which","their","there","would","could","should","https","http","www","com"]);
  const freq = new Map();
  for (const t of tokens) {
    const k = t.toLowerCase();
    if (STOP.has(k) || k.length < 2) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([w]) => w);
  const base = ["SNS메이킷"];
  if (catName) base.push(catName);
  return [...base, ...top].join(", ");
}

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

  let title = "SNS메이킷";
  let description = "SNS메이킷 - AI 블로그·상세페이지·이미지 자동 생성";
  let image = `${SITE_URL}/og-image.png`;
  let canonicalUrl = `${SITE_URL}${path}`;
  let keywords = "SNS메이킷, AI 콘텐츠";

  // ── 프로그램 상세 페이지 ──
  if (segments[0] === "programs" && segments[1]) {
    const productId = segments[1];
    const product = await sbQuery("programs", `select=title,desc,thumbnail,category,price_label,tags&id=eq.${productId}`);
    canonicalUrl = `${SITE_URL}/programs/${productId}`;
    if (product) {
      title = `${product.title} - SNS메이킷 프로그램`;
      description = (product.desc || "").slice(0, 155) + ((product.desc || "").length > 155 ? "..." : "");
      if (product.thumbnail) image = product.thumbnail;
      const tagStr = Array.isArray(product.tags) ? product.tags.join(", ") : "";
      keywords = `SNS메이킷, 프로그램, ${tagStr}`;
    } else {
      title = "프로그램 - SNS메이킷";
      description = "SNS 운영과 사업 확장을 위한 필수 솔루션 패키지.";
    }
  }

  const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", archive: "자료실", sns_briefing: "SNS 브리핑" };
  if (segments[1]) {
    title = `${catNames[segments[1]] || "커뮤니티"} - SNS메이킷 커뮤니티`;
  }

  let fullBody = "";
  let postData = null; // 구조화 데이터용
  if (segments[2] && segments[2].startsWith("post-")) {
    const postId = segments[2].replace("post-", "");
    const post = await sbQuery("posts", `select=title,content,images,author,created_at&id=eq.${postId}`);
    canonicalUrl = `${SITE_URL}/community/${segments[1] || "info"}/post-${postId}`;
    if (post) {
      const catName = catNames[segments[1]] || "커뮤니티";
      const plainBody = stripMdHtml(post.content || "");
      const titleClean = stripMdHtml(post.title || "").slice(0, 70);
      fullBody = plainBody.slice(0, 2000);
      title = `${titleClean} | ${catName} - SNS메이킷`;
      description = (plainBody.replace(/\n/g, " ").slice(0, 155) + (plainBody.length > 155 ? "..." : "")) || description;
      const imgs = Array.isArray(post.images) ? post.images : [];
      const firstUsable = imgs.find(isUsableOgImage);
      const bodyImg = extractFirstImageUrl(post.content);
      image = firstUsable || (isUsableOgImage(bodyImg) ? bodyImg : "") || image;
      keywords = extractKeywords(titleClean, plainBody, catName);
      postData = { ...post, title: titleClean };
    } else {
      // Supabase 실패 시에도 URL 기반 최소 정보 제공
      title = `게시글 #${postId} - SNS메이킷`;
      description = `SNS메이킷 ${catNames[segments[1]] || "커뮤니티"} 게시글입니다. 자세한 내용은 사이트에서 확인하세요.`;
    }
  }

  // 봇/크롤러 판별
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|twitterbot|linkedinbot|telegram|whatsapp|discord|preview|fetcher|curl|wget|python|go-http/i.test(ua);

  // Article JSON-LD 구조화 데이터
  let jsonLd = "";
  if (postData) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: (postData.title || "").substring(0, 110),
      description: (description || "").substring(0, 300),
      image: image,
      datePublished: postData.created_at || new Date().toISOString(),
      author: {
        "@type": "Person",
        name: postData.author || "SNS메이킷 사용자",
      },
      publisher: {
        "@type": "Organization",
        name: "SNS메이킷",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/og-image.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
    };
    jsonLd = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  let html;
  if (isBot) {
    // 크롤러: OG 메타 전용 간단 HTML
    html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(keywords)}">
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
${jsonLd}
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
<meta name="keywords" content="${esc(keywords)}">
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

  // IndexNow: 검색엔진에 URL 색인 요청 (비동기, 결과 무시)
  if (isBot && postData) {
    const indexNowKey = process.env.INDEXNOW_KEY || "default";
    fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(canonicalUrl)}&key=${indexNowKey}`)
      .catch(() => {});
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
