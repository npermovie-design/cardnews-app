// api/image.js — Gemini 이미지 생성 / SNS 크리에이터 분석 통합
// ?action=generate|analyze-creator

import { createClient } from "@supabase/supabase-js";

function isAllowedOrigin(o) { return o.includes("snsmakeit.com") || o.includes("vercel.app") || o.includes("localhost"); }

function setCors(req, res, methods) {
  const origin = req.headers.origin || req.headers.referer || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ── Generate Image (Gemini) ──
async function handleGenerate(req, res) {
  setCors(req, res, "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  // ── Supabase 인증 검증 ──
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabase = createClient(
      "https://ckzjnpzadeovrasucjmu.supabase.co",
      process.env.VITE_SUPABASE_KEY || ""
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "유효하지 않은 인증 토큰입니다." });
    }
  } catch (e) {
    return res.status(401).json({ error: "인증 확인 실패: " + (e.message || "").slice(0, 100) });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });

  const { prompt, productImageB64, productImageMime, refImageB64, refImageMime, aspectRatio } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt 필요" });

  // ── 방법 1: Gemini generateContent (이미지 생성 가능 모델) ──
  const MODELS = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-exp",
  ];

  const parts = [];
  if (productImageB64 && productImageMime) {
    parts.push({ inline_data: { mime_type: productImageMime, data: productImageB64 } });
  }
  if (refImageB64 && refImageMime) {
    parts.push({ inline_data: { mime_type: refImageMime, data: refImageB64 } });
  }
  parts.push({ text: prompt });

  let lastError = "";
  for (const model of MODELS) {
    try {
      console.log(`[image.js] 시도: ${model}`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        lastError = `${model}: ${err.error?.message || response.status}`;
        console.log(`[image.js] ${model} 실패(${response.status}):`, lastError);
        // 모든 4xx 에러는 다음 모델로 시도
        if (response.status < 500) continue;
        continue; // 5xx도 다음 모델 시도
      }

      const data = await response.json();
      const partsOut = data.candidates?.[0]?.content?.parts || [];
      const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart?.inlineData?.data) {
        const textPart = partsOut.find(p => p.text);
        lastError = `${model}: 이미지 없음` + (textPart ? ` (${textPart.text.slice(0, 100)})` : "");
        console.log(`[image.js] ${model}: 응답에 이미지 없음`);
        continue;
      }

      console.log(`[image.js] 성공: ${model}`);
      return res.status(200).json({
        image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
        model,
      });
    } catch (e) {
      lastError = `${model}: ${e.message}`;
      console.error(`[image.js] ${model} 예외:`, e.message);
    }
  }

  // ── 방법 2: Imagen 4 (텍스트→이미지 전용) ──
  const IMAGEN_MODELS = [
    "imagen-4.0-generate-preview-06-06",
    "imagen-3.0-generate-002",
    "imagen-3.0-fast-generate-001",
  ];

  for (const imgModel of IMAGEN_MODELS) {
    try {
      const imagenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: prompt.slice(0, 1000) }],
            parameters: { sampleCount: 1, aspectRatio: aspectRatio || "1:1" },
          }),
        }
      );
      if (imagenRes.ok) {
        const imagenData = await imagenRes.json();
        const b64 = imagenData.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          return res.status(200).json({
            image: `data:image/png;base64,${b64}`,
            model: imgModel,
          });
        }
      }
      const imagenErr = await imagenRes.json().catch(() => ({}));
      lastError += ` | ${imgModel}: ${imagenErr.error?.message || imagenRes.status}`;
    } catch (e) {
      lastError += ` | ${imgModel}: ${e.message}`;
    }
  }

  return res.status(500).json({ error: `이미지 생성 실패: ${lastError}` });
}

// ── Analyze Creator ──
async function handleAnalyzeCreator(req, res) {
  setCors(req, res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { platform, username } = req.body || {};
  if (!platform || !username) return res.status(400).json({ error: "platform, username 필요" });

  const clean = username.replace(/^@/, "").trim();
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  try {
    if (platform === "instagram") {
      // Instagram 프로필 공개 데이터
      const profileUrl = `https://www.instagram.com/${clean}/`;
      const r = await fetch(profileUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR,ko;q=0.9" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "인스타그램 프로필을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
          || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
        return m?.[1] || "";
      };

      const ogTitle = getMeta("og:title");
      const ogDesc = getMeta("og:description");
      const ogImage = getMeta("og:image");

      // 팔로워/게시물 수 추출 시도
      const followersMatch = ogDesc.match(/([\d,.]+[KMkm]?)\s*Followers/i) || ogDesc.match(/팔로워\s*([\d,.]+[만천]?)/);
      const postsMatch = ogDesc.match(/([\d,.]+)\s*Posts/i) || ogDesc.match(/게시물\s*([\d,.]+)/);

      return res.json({
        platform: "instagram",
        username: clean,
        displayName: ogTitle?.replace(/ \(@.*/, "").replace(/ • Instagram.*/, "") || clean,
        bio: ogDesc || "",
        profilePic: ogImage || "",
        followers: followersMatch?.[1] || "",
        posts: postsMatch?.[1] || "",
        profileUrl,
      });
    }

    if (platform === "youtube") {
      // YouTube 채널
      const searchUrl = `https://www.youtube.com/@${clean}`;
      const r = await fetch(searchUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "유튜브 채널을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
        return m?.[1] || "";
      };

      const ogTitle = getMeta("og:title") || getMeta("title");
      const ogDesc = getMeta("og:description") || getMeta("description");
      const ogImage = getMeta("og:image");

      // 구독자 수 추출 시도
      const subsMatch = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/);

      return res.json({
        platform: "youtube",
        username: clean,
        displayName: ogTitle?.replace(/ - YouTube$/, "") || clean,
        bio: ogDesc || "",
        profilePic: ogImage || "",
        subscribers: subsMatch?.[1] || "",
        channelUrl: searchUrl,
      });
    }

    if (platform === "tiktok") {
      const profileUrl = `https://www.tiktok.com/@${clean}`;
      const r = await fetch(profileUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "틱톡 프로필을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
        return m?.[1] || "";
      };

      return res.json({
        platform: "tiktok",
        username: clean,
        displayName: getMeta("og:title")?.replace(/ \(@.*/, "").replace(/ \| TikTok/, "") || clean,
        bio: getMeta("og:description") || getMeta("description") || "",
        profilePic: getMeta("og:image") || "",
        profileUrl,
      });
    }

    return res.status(400).json({ error: "지원하지 않는 플랫폼" });
  } catch (e) {
    return res.status(500).json({ error: "데이터 수집 실패: " + e.message?.slice(0, 100) });
  }
}

// ── Router ──
export default async function handler(req, res) {
  const action = req.query.action;

  switch (action) {
    case "generate":
      return handleGenerate(req, res);
    case "analyze-creator":
      return handleAnalyzeCreator(req, res);
    default:
      return res.status(400).json({ error: "action 파라미터 필요: generate|analyze-creator" });
  }
}

export const config = { maxDuration: 60 };
