// Vercel Edge Middleware — 소셜 크롤러에게 페이지별 OG 태그 제공
// ⚠️ Googlebot은 JS 렌더링 가능하므로 제외 (SPA를 그대로 보여야 검색 인덱싱 정상)
export const config = { matcher: ["/((?!api|_next|favicon|og-image|robots|sitemap|assets|20260323|\\.).*)"] };

const SITE = "https://www.snsmakeit.com";
const DEFAULT_OG = {
  title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성",
  desc: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 비회원 5회 무료 체험!",
  image: `${SITE}/og-image.png`,
};

const PAGE_OG = {
  "/": { title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성", desc: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요." },
  "/about": { title: "SNS메이킷 - 소개", desc: "AI 기반 SNS 콘텐츠 자동 생성 서비스 SNS메이킷을 소개합니다." },
  "/howto": { title: "SNS메이킷 - 이용방법", desc: "SNS메이킷 사용법을 단계별로 안내합니다." },
  "/pricing": { title: "SNS메이킷 - 가격정책", desc: "합리적인 가격으로 AI 콘텐츠를 무제한 생성하세요." },
  "/ai": { title: "SNS메이킷 - AI 생성기", desc: "블로그, 카드뉴스, 상세페이지, 이미지를 AI로 자동 생성하세요." },
  "/contact": { title: "SNS메이킷 - 문의하기", desc: "궁금한 점이나 제안이 있으시면 언제든 문의해주세요." },
  "/event": { title: "SNS메이킷 - 이벤트", desc: "인플루언서 모집! 후기 작성 시 4,500P(약 만원 상당) 지급!" },
  "/cases": { title: "SNS메이킷 - 고객사례", desc: "SNS메이킷으로 만든 성공 사례를 확인하세요." },
  "/community": { title: "SNS메이킷 - 커뮤니티", desc: "정보 공유, 질문 답변, 자료실 등 커뮤니티에 참여하세요." },
  "/legal": { title: "SNS메이킷 - 이용약관", desc: "서비스 이용약관 및 개인정보처리방침" },
};

// 검색엔진 + 소셜 크롤러 (Googlebot 포함 — 게시글 색인을 위해)
const CRAWLERS = /Googlebot|bingbot|Yandex|Baiduspider|facebookexternalhit|Facebot|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|Yeti|AdsBot|DuckDuckBot|Applebot/i;
// 카카오톡: 링크 미리보기 봇(kakaotalk-scrap)만 크롤러 처리, 인앱 브라우저는 통과
const KAKAO_SCRAP = /kakaotalk-scrap|kakaostory-og-reader/i;
const KAKAO_INAPP = /KAKAOTALK\s/i;

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";

  // 카카오톡 인앱 브라우저 → SPA 그대로 (React 앱 로드)
  if (KAKAO_INAPP.test(ua) && !KAKAO_SCRAP.test(ua)) return;

  const isGooglebot = /Googlebot|bingbot|Yandex|Baiduspider|DuckDuckBot|Applebot/i.test(ua);
  const isSocialCrawler = CRAWLERS.test(ua) || KAKAO_SCRAP.test(ua);

  // 검색엔진 봇은 게시글 URL에서만 SSR 처리 (나머지는 SPA 그대로)
  if (isGooglebot && !path.match(/\/community\/\w+\/post-\d+/)) return;

  if (!isSocialCrawler) return; // 일반 사용자는 SPA 그대로

  const url = new URL(request.url);
  const path = url.pathname;

  let title, desc, image;

  // 게시글 URL 처리: /community/:cat 또는 /community/:cat/post-:id
  const postMatch = path.match(/\/community\/(\w+)\/post-(\d+)/);
  if (postMatch) {
    // 게시글 — Supabase에서 조회 시도
    const [, catId, postId] = postMatch;
    try {
      const sbUrl = "https://ckzjnpzadeovrasucjmu.supabase.co";
      const sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs";
      const res = await fetch(`${sbUrl}/rest/v1/posts?id=eq.${postId}&select=title,body,images`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` }
      });
      const data = await res.json();
      const post = data?.[0];
      if (post) {
        title = `${post.title} - SNS메이킷 커뮤니티`;
        const plainBody = (post.body || "").replace(/<[^>]*>/g, "");
        desc = plainBody.slice(0, 155);
        image = post.images?.[0] || DEFAULT_OG.image;
        // Googlebot에게 전체 본문 전달 (색인용)
        var fullBody = plainBody;
      }
    } catch {}
  }

  // 일반 페이지 또는 게시글 조회 실패 시
  if (!title) {
    const pg = PAGE_OG[path] || {};
    title = pg.title || DEFAULT_OG.title;
    desc = pg.desc || DEFAULT_OG.desc;
    image = DEFAULT_OG.image;
  }

  const canonical = `${SITE}${path}`;
  const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="SNS메이킷"/>
<meta property="og:locale" content="ko_KR"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${image}"/>
</head><body><h1>${title}</h1><p>${desc}</p>${typeof fullBody === "string" ? `<article>${fullBody}</article>` : ""}<footer><a href="${SITE}">SNS메이킷</a></footer></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
