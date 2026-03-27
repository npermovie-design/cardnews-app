// 동적 OG 메타태그 렌더링 — 모든 SPA 라우트를 처리
// 크롤러/SNS 공유 시 페이지별 올바른 OG 태그를 반환
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// 빌드된 index.html 읽기
let indexHtml = "";
try {
  indexHtml = readFileSync(resolve("dist/index.html"), "utf-8");
} catch (e) {
  try {
    indexHtml = readFileSync(resolve("index.html"), "utf-8");
  } catch (e2) {}
}

const SITE_URL = "https://www.snsmakeit.com";
const DEFAULT_OG = {
  title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성",
  description: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 비회원 5회 무료 체험!",
  image: `${SITE_URL}/og-image.png`,
};

// 페이지별 OG 메타 정보
const PAGE_META = {
  home: {
    title: "SNS메이킷 - AI 카드뉴스·상세페이지·블로그 자동 생성",
    description: "주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 네이버 블로그, 인스타그램, 유튜브 대본까지!",
  },
  about: {
    title: "소개 - SNS메이킷",
    description: "SNS메이킷은 AI 기반 SNS 콘텐츠 자동 생성 플랫폼입니다. 카드뉴스, 블로그, 상세페이지를 AI가 만들어드립니다.",
  },
  howto: {
    title: "이용방법 - SNS메이킷",
    description: "SNS메이킷 사용법을 알려드려요. 주제 입력부터 콘텐츠 완성까지 3분이면 충분합니다.",
  },
  ai: {
    title: "AI 도구 - SNS메이킷",
    description: "AI 카드뉴스, 블로그 글쓰기, 상세페이지, 로고, 목업, PPT 등 다양한 AI 콘텐츠 생성 도구를 활용해보세요.",
  },
  pricing: {
    title: "가격정책 - SNS메이킷",
    description: "SNS메이킷 크레딧 가격 안내. 비회원 5회 무료 체험, 합리적인 크레딧 충전 요금제를 확인하세요.",
  },
  cases: {
    title: "고객사례 - SNS메이킷",
    description: "다양한 브랜드와 크리에이터들이 SNS메이킷으로 성공한 사례를 확인하세요.",
  },
  community: {
    title: "커뮤니티 - SNS메이킷",
    description: "SNS메이킷 사용자들과 정보를 공유하고 소통하는 커뮤니티입니다. 질문답변, 정보공유, 사용후기를 확인하세요.",
  },
  contact: {
    title: "문의하기 - SNS메이킷",
    description: "SNS메이킷에 대한 문의사항이 있으시면 언제든 연락해주세요.",
  },
  event: {
    title: "이벤트 - SNS메이킷",
    description: "SNS메이킷 진행 중인 이벤트를 확인하세요. 무료 크레딧, 할인 등 다양한 혜택!",
  },
  legal: {
    title: "약관·정책 - SNS메이킷",
    description: "SNS메이킷 이용약관 및 개인정보처리방침을 확인하세요.",
  },
};

// 커뮤니티 카테고리별 메타
const COMMUNITY_CAT_META = {
  info: { title: "정보공유", desc: "유용한 정보와 노하우를 공유하는 게시판" },
  qna: { title: "질문답변", desc: "궁금한 점을 질문하고 답변을 받아보세요" },
  free: { title: "자유게시판", desc: "자유롭게 소통하는 게시판" },
  review: { title: "사용후기", desc: "SNS메이킷 사용 후기를 남겨주세요" },
  archive: { title: "자료실", desc: "유용한 자료와 템플릿을 다운로드하세요" },
};

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  let path = url.pathname;
  if (path === "/") path = "/home";

  const segments = path.split("/").filter(Boolean);
  const mainPage = segments[0] || "home";

  let meta = { ...DEFAULT_OG };
  let canonicalUrl = `${SITE_URL}${path === "/home" ? "/" : path}`;

  // 1) 정적 페이지 메타
  if (PAGE_META[mainPage]) {
    meta.title = PAGE_META[mainPage].title;
    meta.description = PAGE_META[mainPage].description;
  }

  // 2) 커뮤니티 카테고리
  if (mainPage === "community" && segments[1]) {
    const cat = segments[1];
    const catMeta = COMMUNITY_CAT_META[cat];
    if (catMeta) {
      meta.title = `${catMeta.title} - SNS메이킷 커뮤니티`;
      meta.description = catMeta.desc;
    }

    // 3) 개별 게시글
    if (segments[2] && segments[2].startsWith("post-")) {
      const postId = segments[2].replace("post-", "");
      try {
        const { data: post } = await supabase
          .from("posts")
          .select("title, content, author, created_at, images")
          .eq("id", postId)
          .single();

        if (post) {
          const bodyPreview = (post.content || "").replace(/<[^>]*>/g, "").substring(0, 150);
          meta.title = `${post.title} - SNS메이킷 커뮤니티`;
          meta.description = bodyPreview || meta.description;
          // 게시글 이미지가 있으면 OG 이미지로 사용
          const images = Array.isArray(post.images) ? post.images : [];
          if (images.length > 0) meta.image = images[0];
          canonicalUrl = `${SITE_URL}/community/${cat}/post-${postId}`;
        }
      } catch (e) {
        // 게시글 조회 실패 시 기본값 유지
      }
    }
  }

  // 4) AI 도구 서브페이지
  if (mainPage === "ai" && segments[1]) {
    const toolNames = {
      blog_write: "AI 글쓰기", cardnews_simple: "AI 카드뉴스", detail_simple: "AI 상세페이지",
      thumbnail_gen: "AI 썸네일", logo_gen: "AI 로고", mockup_gen: "AI 목업",
      ppt_gen: "AI PPT", marketing: "마케팅 분석", product_shot: "AI 제품컷",
      model_gen: "AI 모델", face_swap: "AI 얼굴교체", outfit_swap: "AI 의상교체",
      hot_keyword: "핫 키워드", video_create: "숏폼 편집",
    };
    const toolName = toolNames[segments[1]];
    if (toolName) {
      meta.title = `${toolName} - SNS메이킷`;
      meta.description = `SNS메이킷의 ${toolName} 기능으로 콘텐츠를 자동으로 생성해보세요.`;
    }
  }

  // index.html이 없으면 최소한의 HTML 반환
  if (!indexHtml) {
    return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(buildMinimalHtml(meta, canonicalUrl));
  }

  // index.html의 메타 태그를 동적으로 교체
  let html = indexHtml;

  // title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escHtml(meta.title)}</title>`
  );

  // meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escHtml(meta.description)}"`
  );

  // canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${escHtml(canonicalUrl)}"`
  );

  // og tags
  html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${escHtml(canonicalUrl)}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${escHtml(meta.title)}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${escHtml(meta.description)}"`);
  html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${escHtml(meta.image)}"`);

  // twitter tags
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${escHtml(meta.title)}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${escHtml(meta.description)}"`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${escHtml(meta.image)}"`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).send(html);
}

function escHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildMinimalHtml(meta, canonicalUrl) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(meta.title)}</title>
  <meta name="description" content="${escHtml(meta.description)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  <meta property="og:title" content="${escHtml(meta.title)}">
  <meta property="og:description" content="${escHtml(meta.description)}">
  <meta property="og:image" content="${escHtml(meta.image)}">
  <meta property="og:site_name" content="SNS메이킷">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(meta.title)}">
  <meta name="twitter:description" content="${escHtml(meta.description)}">
  <meta name="twitter:image" content="${escHtml(meta.image)}">
  <script>window.location.replace("https://www.snsmakeit.com" + window.location.pathname + window.location.search);</script>
</head>
<body></body>
</html>`;
}
