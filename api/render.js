// 동적 OG 메타태그 렌더링 — Edge Runtime (비용 절감)
export const config = { runtime: "edge" };

const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;
const SITE_URL = "https://snsmakeit.com";
const DEFAULT_TITLE = "SNS메이킷 - AI SNS 콘텐츠 자동 생성";
const DEFAULT_DESCRIPTION = "키워드만 입력하면 AI가 블로그, 인스타그램, 쇼츠 콘텐츠 초안을 자동 생성합니다. 비회원 5회 무료, 가입 시 5회 지급.";
const DEFAULT_KEYWORDS = "SNS 콘텐츠 자동 생성, AI 블로그 글쓰기, 인스타그램 캡션 생성, 쇼츠 자동 제작, 네이버 블로그 자동생성, SNS 자동 발행, AI 콘텐츠 제작, 카드뉴스 만들기, AI 이미지 생성, 상세페이지 제작";

const PAGE_META = {
  community: { title: "커뮤니티 - SNS메이킷", description: "SNS메이킷 커뮤니티. SNS 운영, AI 콘텐츠 제작, 마케팅 정보와 질문답변을 공유하세요." },
  programs: { title: "자료실 - SNS메이킷", description: "SNS 운영에 필요한 자동화 도구, 템플릿, 무료 사진, 무료 영상 자료를 확인하세요." },
  newsletter: { title: "뉴스레터 - SNS메이킷", description: "SNS 마케팅 최신 트렌드와 인사이트를 매주 받아보세요." },
  pricing: { title: "가격정책 - SNS메이킷", description: "SNS메이킷 가격정책. 가입 시 5회 지급, Basic 월 50회, Pro 월 200회, Business 월 500회 제공." },
  about: { title: "소개 - SNS메이킷", description: "SNS메이킷은 블로그, 인스타그램, 쇼츠, 이미지 제작을 AI로 자동화하는 SNS 콘텐츠 올인원 플랫폼입니다." },
  ai: { title: "AI 생성기 - SNS메이킷", description: "AI로 블로그 글, 인스타그램 캡션, 카드뉴스, 상세페이지, 제품컷, 로고, 쇼츠 영상을 자동 생성하세요." },
  contact: { title: "문의하기 - SNS메이킷", description: "SNS메이킷 문의하기. 결제, 기능, 오류, 제휴 문의를 남겨주시면 빠르게 답변드립니다." },
  howto: { title: "이용방법 - SNS메이킷", description: "SNS메이킷 사용법 가이드. AI 글쓰기, 이미지 생성, 카드뉴스, 상세페이지, 숏폼 편집까지 단계별로 안내합니다." },
  faq: { title: "자주 묻는 질문 - SNS메이킷", description: "SNS메이킷의 AI 콘텐츠 생성, 이용 횟수, 요금제, 저작권, 계정 관련 자주 묻는 질문을 확인하세요." },
  event: { title: "이벤트 - SNS메이킷", description: "SNS메이킷 이벤트와 혜택을 확인하세요." },
  cases: { title: "고객사례 - SNS메이킷", description: "SNS메이킷을 활용한 고객사례와 AI 콘텐츠 제작 성공 사례를 확인하세요." },
  legal: { title: "약관·정책 - SNS메이킷", description: "SNS메이킷 이용약관, 개인정보처리방침, 환불정책을 확인하세요." },
};

const AI_META = {
  home: PAGE_META.ai,
  blog: { title: "AI 블로그 글쓰기 - SNS메이킷", description: "키워드와 주제만 입력하면 AI가 블로그 글 초안을 자동 생성합니다." },
  insta: { title: "인스타그램 캡션 생성 - SNS메이킷", description: "AI로 인스타그램 게시글 문구, 해시태그, 릴스 캡션 초안을 빠르게 만드세요." },
  cardnews: { title: "AI 카드뉴스 생성 - SNS메이킷", description: "주제 입력만으로 SNS 카드뉴스 문구와 구성을 자동 생성하세요." },
  cardnews_simple: { title: "AI 카드뉴스 생성 - SNS메이킷", description: "간단 입력으로 SNS 카드뉴스 초안과 이미지를 빠르게 제작하세요." },
  detail: { title: "AI 상세페이지 제작 - SNS메이킷", description: "상품 정보로 상세페이지 카피와 섹션 구성을 AI가 자동 생성합니다." },
  detail_simple: { title: "AI 상세페이지 제작 - SNS메이킷", description: "상품명과 핵심 정보만으로 상세페이지 초안을 빠르게 만드세요." },
  image: { title: "AI 이미지 생성 - SNS메이킷", description: "마케팅용 이미지, 썸네일, SNS 비주얼을 AI로 생성하세요." },
  product_shot: { title: "AI 제품컷 생성 - SNS메이킷", description: "제품 사진을 업로드해 광고용 제품컷과 배경 이미지를 생성하세요." },
  marketing: { title: "AI 마케팅 문구 생성 - SNS메이킷", description: "광고 문구, 후킹 카피, SNS 운영 문안을 AI로 빠르게 만드세요." },
  shorts: { title: "AI 쇼츠 영상 생성 - SNS메이킷", description: "AI로 쇼츠 영상 기획, 자막, 편집용 콘텐츠 초안을 생성하세요." },
};

const PRIVATE_PATHS = new Set(["login", "mypage", "profile", "xk9m2p4q7", "admin"]);

function slugifyKo(input, fallback = "content") {
  const slug = stripMdHtml(input || "")
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  return slug || fallback;
}

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

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = `${SITE_URL}/og-image.png`;
  let canonicalUrl = `${SITE_URL}${path === "/" ? "" : path}`;
  let keywords = DEFAULT_KEYWORDS;
  let ogType = "website";

  if (segments[0] && PAGE_META[segments[0]]) {
    title = PAGE_META[segments[0]].title;
    description = PAGE_META[segments[0]].description;
  }

  if (segments[0] === "ai" && segments[1] && AI_META[segments[1]]) {
    title = AI_META[segments[1]].title;
    description = AI_META[segments[1]].description;
  }

  // ── 프로그램 상세 페이지 ──
  if (segments[0] === "programs" && segments[1]) {
    const productId = segments[1];
    const product = await sbQuery("programs", `select=title,desc,thumbnail,category,price_label,tags&id=eq.${productId}`);
    if (product) {
      canonicalUrl = `${SITE_URL}/programs/${productId}/${slugifyKo(product.title, "program")}`;
      title = `${product.title} - SNS메이킷 프로그램`;
      description = (product.desc || "").slice(0, 155) + ((product.desc || "").length > 155 ? "..." : "");
      if (product.thumbnail) image = product.thumbnail;
      const tagStr = Array.isArray(product.tags) ? product.tags.join(", ") : "";
      keywords = `SNS메이킷, 프로그램, ${tagStr}`;
    } else {
      canonicalUrl = `${SITE_URL}/programs/${productId}`;
      title = "프로그램 - SNS메이킷";
      description = "SNS 운영과 사업 확장을 위한 필수 솔루션 패키지.";
    }
  }

  const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", sns_briefing: "SNS 브리핑" };
  let catPosts = []; // 카테고리 목록용
  if (segments[0] === "community" && segments[1] && !segments[2]) {
    title = `${catNames[segments[1]] || "커뮤니티"} - SNS메이킷 커뮤니티`;
    description = `SNS메이킷 ${catNames[segments[1]] || "커뮤니티"} 게시판입니다. 최신 글을 확인하세요.`;
    // 카테고리 페이지: 최근 게시글 50개 링크 제공 (크롤러 내부링크)
    try {
      const catFilter = segments[1] === "info" ? "" : `&subCat=eq.${segments[1]}`;
      const catData = await sbQuery("posts", `select=id,title,subCat,created_at&order=created_at.desc&limit=50${catFilter}`);
      // sbQuery는 단일 객체 반환이므로 배열 쿼리 별도 처리
      if (SB_URL && SB_KEY) {
        const r = await fetch(`${SB_URL}/rest/v1/posts?select=id,title,subCat,created_at&order=created_at.desc&limit=50${catFilter}`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        });
        if (r.ok) catPosts = await r.json();
      }
    } catch {}
  } else if (segments[0] === "community" && segments[1]) {
    title = `${catNames[segments[1]] || "커뮤니티"} - SNS메이킷 커뮤니티`;
  }

  let fullBody = "";
  let postData = null; // 구조화 데이터용
  if (segments[2] && segments[2].startsWith("post-")) {
    const postId = segments[2].replace("post-", "");
    const post = await sbQuery("posts", `select=title,content,images,author,created_at&id=eq.${postId}`);
    if (post) {
      const catName = catNames[segments[1]] || "커뮤니티";
      const plainBody = stripMdHtml(post.content || "");
      const titleClean = stripMdHtml(post.title || "").slice(0, 70);
      canonicalUrl = `${SITE_URL}/community/${segments[1] || "info"}/post-${postId}/${slugifyKo(titleClean, "post")}`;
      fullBody = plainBody.slice(0, 5000);
      title = `${titleClean} | ${catName} - SNS메이킷`;
      description = (plainBody.replace(/\n/g, " ").slice(0, 155) + (plainBody.length > 155 ? "..." : "")) || description;
      const imgs = Array.isArray(post.images) ? post.images : [];
      const firstUsable = imgs.find(isUsableOgImage);
      const bodyImg = extractFirstImageUrl(post.content);
      image = firstUsable || (isUsableOgImage(bodyImg) ? bodyImg : "") || image;
      keywords = extractKeywords(titleClean, plainBody, catName);
      ogType = "article";
      postData = { ...post, title: titleClean };
    } else {
      // Supabase 실패 시에도 URL 기반 최소 정보 제공
      canonicalUrl = `${SITE_URL}/community/${segments[1] || "info"}/post-${postId}`;
      title = `게시글 #${postId} - SNS메이킷`;
      description = `SNS메이킷 ${catNames[segments[1]] || "커뮤니티"} 게시글입니다. 자세한 내용은 사이트에서 확인하세요.`;
    }
  }

  // 봇/크롤러 판별
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isBot = /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|twitterbot|linkedinbot|telegram|whatsapp|discord|preview|fetcher|curl|wget|python|go-http|gptbot|claude-web|ccbot|petalbot|yandexbot|bingpreview|applebot|duckduckbot|bytespider|semrush|ahrefs/i.test(ua);
  const robotsContent = PRIVATE_PATHS.has(segments[0]) || segments[0] === "payment" ? "noindex, nofollow" : "index, follow";
  const canonicalPath = (() => {
    try { return new URL(canonicalUrl).pathname; } catch { return path; }
  })();
  // slug가 다른 경우: 봇에게는 canonical로 안내 (200), 브라우저에는 리디렉션
  // 301 리디렉션은 Google에서 "리디렉션 오류"로 잡힐 수 있으므로 봇에게는 canonical만 설정
  if (canonicalPath !== path && !isBot) {
    return Response.redirect(canonicalUrl, 301);
  }

  // Article + BreadcrumbList JSON-LD 구조화 데이터
  let jsonLd = "";
  if (postData) {
    const catName = catNames[segments[1]] || "커뮤니티";
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: (postData.title || "").substring(0, 110),
        description: (description || "").substring(0, 300),
        image: image,
        datePublished: postData.created_at || new Date().toISOString(),
        dateModified: postData.created_at || new Date().toISOString(),
        author: {
          "@type": "Person",
          name: postData.author || "SNS메이킷 사용자",
        },
        publisher: {
          "@type": "Organization",
          name: "SNS메이킷",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        inLanguage: "ko-KR",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "커뮤니티", item: `${SITE_URL}/community/info` },
          { "@type": "ListItem", position: 3, name: catName, item: `${SITE_URL}/community/${segments[1] || "info"}` },
          { "@type": "ListItem", position: 4, name: (postData.title || "게시글").substring(0, 60) },
        ],
      },
    ];
    jsonLd = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");
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
<meta name="robots" content="${robotsContent}">
<link rel="canonical" href="${esc(canonicalUrl)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${esc(canonicalUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
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
${fullBody ? `<article><h2>${esc(title)}</h2>${postData ? `<p><strong>작성자:</strong> ${esc(postData.author || "SNS메이킷")}</p>` : ""}${fullBody.split('\n').filter(l => l.trim()).map(l => `<p>${esc(l.trim())}</p>`).join('\n')}</article>` : ""}
${catPosts.length > 0 ? `<section><h2>${esc(catNames[segments[1]] || "커뮤니티")} 최근 게시글</h2><ul>${catPosts.map(p => `<li><a href="${SITE_URL}/community/${p.subCat || "info"}/post-${p.id}/${slugifyKo(p.title, "post")}">${esc(stripMdHtml(p.title || "").slice(0, 80))}</a> <time>${(p.created_at || "").slice(0, 10)}</time></li>`).join("\n")}</ul></section>` : ""}
<nav>
<a href="https://snsmakeit.com">SNS메이킷 홈</a>
<a href="https://snsmakeit.com/community/info">정보공유</a>
<a href="https://snsmakeit.com/community/qna">질문답변</a>
<a href="https://snsmakeit.com/community/free">자유게시판</a>
<a href="https://snsmakeit.com/community/review">사용후기</a>
<a href="https://snsmakeit.com/community/sns_briefing">SNS 브리핑</a>
<a href="https://snsmakeit.com/snsnews">SNS뉴스</a>
<a href="https://snsmakeit.com/programs">자료실</a>
<a href="https://snsmakeit.com/ai">AI 도구</a>
<a href="https://snsmakeit.com/pricing">가격정책</a>
</nav>
</body>
</html>`;
  } else {
    // 일반 브라우저: /index.html로 리다이렉트 (SPA 라우팅)
    // Vite 빌드된 JS/CSS는 index.html에 포함되어 있으므로 직접 서빙
    const indexRes = await fetch(`${SITE_URL}/index.html`);
    if (indexRes.ok) {
      let indexHtml = await indexRes.text();
      // 기존 SPA HTML의 정적 메타를 현재 경로 기준으로 교체한다.
      const setHeadTag = (html, pattern, replacement) => {
        if (pattern.test(html)) return html.replace(pattern, replacement);
        return html.replace("</head>", `${replacement}\n</head>`);
      };
      indexHtml = indexHtml
        .replace(/<title>[\s\S]*?<\/title>/gi, "")
        .replace(/<meta\s+[^>]*name=["'](?:description|keywords|robots|twitter:title|twitter:description|twitter:image)["'][^>]*>\s*/gi, "")
        .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi, "")
        .replace(/<link\s+[^>]*href=["'][^"']+["'][^>]*rel=["']canonical["'][^>]*>\s*/gi, "")
        .replace(/<meta\s+[^>]*property=["']og:(?:type|url|title|description|image|image:width|image:height)["'][^>]*>\s*/gi, "");
      const dynamicHead = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}">`,
        `<meta name="keywords" content="${esc(keywords)}">`,
        `<meta name="robots" content="${robotsContent}">`,
        `<link rel="canonical" href="${esc(canonicalUrl)}">`,
        `<meta property="og:type" content="${ogType}">`,
        `<meta property="og:url" content="${esc(canonicalUrl)}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:description" content="${esc(description)}">`,
        `<meta property="og:image" content="${esc(image)}">`,
        `<meta property="og:image:width" content="1200">`,
        `<meta property="og:image:height" content="630">`,
        `<meta name="twitter:title" content="${esc(title)}">`,
        `<meta name="twitter:description" content="${esc(description)}">`,
        `<meta name="twitter:image" content="${esc(image)}">`,
      ].join("\n");
      indexHtml = indexHtml.replace("</head>", `${dynamicHead}\n</head>`);
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
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Vary": "User-Agent",
    },
  });
}

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
