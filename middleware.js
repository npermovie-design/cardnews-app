// Vercel Edge Middleware — 모든 크롤러(검색엔진+소셜)에게 페이지별 메타태그 제공
// Google/Bing 등 검색엔진 봇도 프리렌더링 HTML을 받아야 SPA 색인 문제 해결
export const config = {
  matcher: ["/((?!api|_next|favicon|og-image|robots|sitemap|rss|assets|manifest|icon-|\\.).*)"],
};

const SITE = "https://www.snsmakeit.com";
const DEFAULT_OG = {
  title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성",
  desc: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 네이버·인스타·유튜브 콘텐츠까지 비회원 5회 무료!",
  image: `${SITE}/og-image.png`,
};

// 페이지별 고유 SEO 메타
const PAGE_META = {
  "/": {
    title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성",
    desc: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 네이버 블로그, 인스타그램, 유튜브 대본까지 비회원 5회 무료 체험!",
    keywords: "카드뉴스 만들기, AI 카드뉴스, 상세페이지 제작, 블로그 자동 생성, SNS 콘텐츠",
  },
  "/about": {
    title: "SNS메이킷 소개 - AI 콘텐츠 자동화 플랫폼",
    desc: "AI 기반 SNS 콘텐츠 자동 생성 서비스 SNS메이킷을 소개합니다. 블로그, 카드뉴스, 상세페이지를 원클릭으로 제작하세요.",
    keywords: "SNS메이킷 소개, AI 콘텐츠 플랫폼, 자동 콘텐츠 생성",
  },
  "/howto": {
    title: "SNS메이킷 이용방법 - 3단계로 콘텐츠 완성",
    desc: "SNS메이킷 사용법을 단계별로 안내합니다. 주제 입력 → AI 생성 → 다운로드, 3단계면 충분합니다.",
    keywords: "SNS메이킷 사용법, AI 콘텐츠 만드는 방법, 카드뉴스 만드는 법",
  },
  "/pricing": {
    title: "SNS메이킷 가격정책 - 합리적인 AI 콘텐츠 요금제",
    desc: "비회원 5회 무료 체험! 합리적인 가격으로 AI 카드뉴스, 블로그 글, 상세페이지를 무제한 생성하세요.",
    keywords: "SNS메이킷 가격, AI 콘텐츠 요금, 카드뉴스 가격",
  },
  "/ai": {
    title: "SNS메이킷 AI 생성기 - 블로그·카드뉴스·이미지 자동 제작",
    desc: "AI가 네이버 블로그, 인스타그램 캡션, 유튜브 대본, 카드뉴스, 상세페이지, 로고, 목업까지 자동으로 만들어드립니다.",
    keywords: "AI 블로그 생성기, AI 카드뉴스, AI 이미지 생성, 네이버 블로그 자동, 인스타그램 캡션 생성",
  },
  "/contact": {
    title: "SNS메이킷 문의하기 - 고객지원",
    desc: "궁금한 점이나 제안이 있으시면 언제든 문의해주세요. 빠르게 답변드리겠습니다.",
    keywords: "SNS메이킷 문의, 고객지원, 서비스 문의",
  },
  "/event": {
    title: "SNS메이킷 이벤트 - 인플루언서 모집 & 포인트 지급",
    desc: "인플루언서 모집 중! 후기 작성 시 4,500P(약 만원 상당) 지급. 지금 참여하세요!",
    keywords: "SNS메이킷 이벤트, 인플루언서 모집, 포인트 이벤트",
  },
  "/cases": {
    title: "SNS메이킷 고객사례 - AI 콘텐츠 성공 사례",
    desc: "SNS메이킷으로 만든 성공 사례를 확인하세요. 다양한 업종의 실제 활용 사례를 소개합니다.",
    keywords: "SNS메이킷 사례, AI 콘텐츠 사례, 카드뉴스 사례",
  },
  "/community": {
    title: "SNS메이킷 커뮤니티 - 정보공유·질문답변·자료실",
    desc: "SNS 마케팅 정보 공유, 질문 답변, 자료실 등 커뮤니티에 참여하세요. 다양한 팁과 노하우를 나눠보세요.",
    keywords: "SNS 커뮤니티, 마케팅 정보, SNS 팁",
  },
  "/legal": {
    title: "SNS메이킷 이용약관 및 개인정보처리방침",
    desc: "SNS메이킷 서비스 이용약관 및 개인정보처리방침을 확인하세요.",
    keywords: "이용약관, 개인정보처리방침",
  },
  "/analyzer": {
    title: "SNS메이킷 SEO 분석기 - 핫키워드·트렌드 분석",
    desc: "AI 기반 SEO 키워드 분석, 트렌드 분석으로 콘텐츠 전략을 수립하세요.",
    keywords: "SEO 분석, 키워드 분석, 트렌드 분석, SNS 분석",
  },
  "/mypage": {
    title: "SNS메이킷 마이페이지",
    desc: "내 계정, 포인트, 생성 히스토리를 관리하세요.",
    keywords: "마이페이지, 계정관리",
  },
};

// 카테고리별 이름
const COMMUNITY_CATS = {
  info: "정보공유",
  qna: "질문답변",
  free: "자유게시판",
  resource: "자료실",
  tip: "꿀팁",
  showcase: "작품공유",
};

// 검색엔진 + 소셜 크롤러 (Googlebot 포함 — SPA 색인 문제 해결)
const CRAWLERS = /Googlebot|bingbot|Yandex|Baiduspider|facebookexternalhit|Facebot|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|Yeti|AdsBot|DuckDuckBot|Applebot|PetalBot|SemrushBot|AhrefsBot|MJ12bot|Sogou|NaverBot/i;
const KAKAO_SCRAP = /kakaotalk-scrap|kakaostory-og-reader/i;
const KAKAO_INAPP = /KAKAOTALK\s/i;

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";

  // 카카오톡 인앱 브라우저 → SPA 그대로 (React 앱 로드)
  if (KAKAO_INAPP.test(ua) && !KAKAO_SCRAP.test(ua)) return;

  const isCrawler = CRAWLERS.test(ua) || KAKAO_SCRAP.test(ua);
  if (!isCrawler) return; // 일반 사용자는 SPA 그대로

  const url = new URL(request.url);
  const path = url.pathname;

  let title, desc, image, keywords, bodyContent = "";

  // 게시글 URL 처리: /community/:cat/post-:id
  const postMatch = path.match(/\/community\/(\w+)\/post-(\d+)/);
  if (postMatch) {
    const [, catId, postId] = postMatch;
    const catName = COMMUNITY_CATS[catId] || catId;
    try {
      const sbUrl = "https://ckzjnpzadeovrasucjmu.supabase.co";
      const sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs";
      const res = await fetch(`${sbUrl}/rest/v1/posts?id=eq.${postId}&select=title,body,images,author_name`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      const data = await res.json();
      const post = data?.[0];
      if (post) {
        title = `${post.title} - SNS메이킷 ${catName}`;
        const plainBody = (post.body || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
        desc = plainBody.slice(0, 155) + (plainBody.length > 155 ? "..." : "");
        image = post.images?.[0] || DEFAULT_OG.image;
        keywords = `SNS메이킷, ${catName}, ${post.title}`;
        bodyContent = `<article><h2>${post.title}</h2><p>${plainBody}</p>${post.author_name ? `<span>작성자: ${post.author_name}</span>` : ""}</article>`;
      }
    } catch {}
  }

  // 커뮤니티 카테고리 페이지: /community/:cat
  if (!title) {
    const catMatch = path.match(/\/community\/(\w+)$/);
    if (catMatch) {
      const catName = COMMUNITY_CATS[catMatch[1]] || catMatch[1];
      title = `SNS메이킷 커뮤니티 - ${catName}`;
      desc = `SNS메이킷 ${catName} 게시판입니다. 다양한 정보와 팁을 확인하세요.`;
      keywords = `SNS메이킷, 커뮤니티, ${catName}`;
    }
  }

  // 일반 페이지
  if (!title) {
    const pg = PAGE_META[path] || {};
    title = pg.title || DEFAULT_OG.title;
    desc = pg.desc || DEFAULT_OG.desc;
    keywords = pg.keywords || "SNS메이킷, AI 콘텐츠, 카드뉴스";
  }

  image = image || DEFAULT_OG.image;
  const canonical = `${SITE}${path === "/" ? "" : path}`;

  // 구조화된 HTML 반환 (검색엔진 + 소셜 크롤러 모두 대응)
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="keywords" content="${esc(keywords)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${canonical}"/>

<!-- Open Graph -->
<meta property="og:type" content="${postMatch ? "article" : "website"}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="SNS메이킷"/>
<meta property="og:locale" content="ko_KR"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${image}"/>

<!-- 구조화 데이터 -->
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": postMatch ? "Article" : "WebPage",
  "name": title,
  "description": desc,
  "url": canonical,
  "image": image,
  "publisher": {
    "@type": "Organization",
    "name": "SNS메이킷",
    "url": SITE,
    "logo": { "@type": "ImageObject", "url": `${SITE}/favicon.svg` },
  },
})}
</script>
</head>
<body>
<header>
  <nav>
    <a href="${SITE}">SNS메이킷</a>
    <a href="${SITE}/about">소개</a>
    <a href="${SITE}/howto">이용방법</a>
    <a href="${SITE}/ai">AI 생성기</a>
    <a href="${SITE}/pricing">가격정책</a>
    <a href="${SITE}/community">커뮤니티</a>
    <a href="${SITE}/event">이벤트</a>
    <a href="${SITE}/contact">문의</a>
  </nav>
</header>
<main>
  <h1>${esc(title)}</h1>
  <p>${esc(desc)}</p>
  ${bodyContent}
</main>
<footer>
  <p>&copy; SNS메이킷 | <a href="${SITE}">www.snsmakeit.com</a></p>
</footer>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

// HTML 특수문자 이스케이프
function esc(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
