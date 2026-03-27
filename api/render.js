// 동적 OG 메타태그 렌더링 — 커뮤니티 게시글 공유 시 올바른 OG 태그 반환
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

const SITE_URL = "https://snsmakeit.com";

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);

  let title = "SNS메이킷 커뮤니티";
  let description = "SNS메이킷 사용자들과 정보를 공유하고 소통하는 커뮤니티입니다.";
  let image = `${SITE_URL}/og-image.png`;
  let canonicalUrl = `${SITE_URL}${path}`;

  // 커뮤니티 카테고리
  const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", archive: "자료실" };
  if (segments[1]) {
    const catName = catNames[segments[1]] || "커뮤니티";
    title = `${catName} - SNS메이킷 커뮤니티`;
  }

  // 개별 게시글 OG 태그
  if (segments[2] && segments[2].startsWith("post-")) {
    const postId = segments[2].replace("post-", "");
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("title, content, author, images")
        .eq("id", postId)
        .single();

      if (post) {
        const bodyText = (post.content || "").replace(/<[^>]*>/g, "").substring(0, 160);
        title = `${post.title} - SNS메이킷`;
        description = bodyText || description;
        const imgs = Array.isArray(post.images) ? post.images : [];
        if (imgs.length > 0) image = imgs[0];
      }
    } catch (e) {}
  }

  // SPA를 로드하는 완전한 HTML 반환 (OG 태그 포함)
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google-site-verification" content="RK3cE_t-6IlrSQbjoV4TvEg9n-Crqg8eaEByIHq_V50" />
<meta name="naver-site-verification" content="20befb9d4db477010b5f0545bd3097fe2cfa1e6a" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(canonicalUrl)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="article">
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
<script>
(function(){
  var ua = navigator.userAgent || '';
  if (ua.match(/KAKAOTALK/i)) {
    if (/android/i.test(ua)) {
      location.href = 'intent://' + location.href.replace(/https?:\\/\\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    } else {
      location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
    }
  }
})();
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-E2KGX8KJ4S"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-E2KGX8KJ4S');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;900&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${esc(title)}","description":"${esc(description)}","image":"${esc(image)}","url":"${esc(canonicalUrl)}","publisher":{"@type":"Organization","name":"SNS메이킷","url":"${SITE_URL}"}}
</script>
<style>
body{margin:0;font-family:'Noto Sans KR',sans-serif;background:#0f0c29;color:#fff}
#seo-content{max-width:700px;margin:60px auto;padding:20px;text-align:center}
#seo-content h1{font-size:24px;margin-bottom:12px}
#seo-content p{font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7}
#seo-content a{color:#a5b4fc;text-decoration:none;display:inline-block;margin-top:20px;padding:12px 28px;border-radius:12px;background:linear-gradient(135deg,#7c6aff,#8b5cf6);color:#fff;font-weight:700}
</style>
</head>
<body>
<div id="seo-content">
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<a href="${SITE_URL}${path}">SNS메이킷에서 보기</a>
</div>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
<script>
// SPA 로드 후 SEO 콘텐츠 숨기기
window.addEventListener('DOMContentLoaded',function(){
  var el=document.getElementById('seo-content');
  if(el){var check=setInterval(function(){if(document.getElementById('root').children.length>0){el.style.display='none';clearInterval(check)}},200);setTimeout(function(){clearInterval(check)},5000)}
});
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).send(html);
}

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
