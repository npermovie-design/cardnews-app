// NaverBot SaaS - 블로그 글 생성 (메이킷 BlogUtils 패턴 이식)
// 글타입/톤/말투/분량/필드 + [image: keyword] 인라인 마커 → blocks 응답

import {
  setCors,
  safeError,
  supabase,
  verifyLicense,
  validateLicenseKey,
  checkDailyQuota,
} from "../../lib/naverbot/index.js";
import { buildBlogPrompt, splitBodyByImageMarkers } from "../../lib/naverbot/prompts.js";
import { fetchRecentTrends, trendsToPromptText } from "../../lib/naverbot/trends.js";

const OR_KEY = process.env.OPENROUTER_API_KEY;
const PEXELS_KEY = process.env.PEXELS_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-5";

const VALID_SUBTYPES = ["info", "visit", "travel", "product", "column", "article"];
const VALID_TONES = ["friendly", "diary", "review", "professional"];
const VALID_SPEECH = ["polite_yo", "formal", "casual", "mixed"];
const VALID_WORDCOUNTS = ["short", "medium", "long"];

const WORDCOUNT_TO_TOKENS = {
  short: 3000,
  medium: 5500,
  long: 8000,
};

// ── 입력 검증 ──
function validateInput(b) {
  if (!b || typeof b !== "object") return ["request body 누락"];
  const errors = [];

  if (!validateLicenseKey(b.license_key)) errors.push("license_key 형식 오류");
  if (!b.machine_id || typeof b.machine_id !== "string" || b.machine_id.length > 128)
    errors.push("machine_id 필수");

  if (!b.fields || typeof b.fields !== "object") errors.push("fields 객체 필수");
  else if (!b.fields.keyword || typeof b.fields.keyword !== "string")
    errors.push("fields.keyword 필수");
  else if (b.fields.keyword.length > 200) errors.push("keyword 200자 초과");

  if (b.subtype && !VALID_SUBTYPES.includes(b.subtype))
    errors.push("subtype invalid (info|visit|travel|product|column|article)");
  if (b.tone && !VALID_TONES.includes(b.tone)) errors.push("tone invalid");
  if (b.speech && !VALID_SPEECH.includes(b.speech)) errors.push("speech invalid");
  if (b.word_count && !VALID_WORDCOUNTS.includes(b.word_count))
    errors.push("word_count invalid (short|medium|long)");

  // 자유 프롬프트 길이 제한
  if (b.fields?.extra && b.fields.extra.length > 2000) errors.push("extra 2000자 초과");
  if (b.user_prompt && b.user_prompt.length > 2000) errors.push("user_prompt 2000자 초과");

  return errors;
}

// ── 마크다운/이모지 강제 제거 (방어) ──
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+)_(?!_)/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "")
    .trim();
}

// ── 응답 파싱 ──
function parseResponse(text, fallbackKeyword) {
  const titleMatch = text.match(/\[TITLE\]\s*\n([^\n]+)/);
  const bodyMatch = text.match(/\[BODY\]\s*\n([\s\S]+?)(?=\n\[TAGS\]|$)/);
  const tagsMatch = text.match(/\[TAGS\]\s*\n([^\n]+)/);

  // 본문에서 마크다운 제거 (단, [image: ...] 마커는 보호)
  const rawBody = bodyMatch ? bodyMatch[1].trim() : text.trim();

  // 이미지 마커 임시 치환 → 마크다운 제거 → 복원
  const placeholders = [];
  const protectedBody = rawBody.replace(/\[image:\s*[^\]]+\]/gi, (m) => {
    placeholders.push(m);
    return `__IMG_PH_${placeholders.length - 1}__`;
  });
  let cleanBody = stripMarkdown(protectedBody);
  cleanBody = cleanBody.replace(/__IMG_PH_(\d+)__/g, (_, i) => placeholders[Number(i)] || "");

  const title = stripMarkdown(titleMatch ? titleMatch[1].trim() : fallbackKeyword.slice(0, 30)).slice(0, 60);

  const tags = tagsMatch
    ? tagsMatch[1]
        .split(/[,，]/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return { title, body: cleanBody, tags };
}

// ── Pexels 이미지 검색 ──
async function searchImage(keyword) {
  if (!PEXELS_KEY || !keyword) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
    const r = await fetch(url, { headers: { Authorization: PEXELS_KEY.trim() } });
    if (!r.ok) return null;
    const data = await r.json();
    const photo = data?.photos?.[0];
    if (!photo?.src?.large) return null;
    return { url: photo.src.large, alt: photo.alt || keyword, keyword };
  } catch (e) {
    console.error("[naverbot] Pexels:", e.message);
    return null;
  }
}

// ── 메인 핸들러 ──
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");
  if (!OR_KEY) return safeError(res, 500, "서버 설정 오류");

  // 1. 입력 검증
  const errors = validateInput(req.body);
  if (errors.length) return safeError(res, 400, errors[0]);

  const {
    license_key,
    machine_id,
    subtype = "info",
    tone = "friendly",
    speech = "polite_yo",
    word_count = "medium",
    fields = {},
    user_prompt = "",
  } = req.body;

  // 2. 라이선스
  let licResult;
  try {
    licResult = await verifyLicense({ licenseKey: license_key, machineId: machine_id });
  } catch (e) {
    return safeError(res, 500, "라이선스 검증 실패", e);
  }
  if (!licResult.ok) return res.status(403).json({ ok: false, error: licResult.reason });

  // 3. 일일 한도
  const quota = await checkDailyQuota(license_key, licResult.license.plan);
  if (quota.exceeded) {
    return res.status(429).json({
      ok: false,
      error: `일일 한도 초과 (${quota.used}/${quota.limit})`,
    });
  }

  // 4. 최근 1주일 트렌드 수집 (실패해도 빈 배열 → 트렌드 없이 진행)
  const trends = await fetchRecentTrends(fields.keyword, { days: 7, limit: 8 });
  const trendsText = trendsToPromptText(trends);

  // 5. 프롬프트 빌드
  const { system, user } = buildBlogPrompt({
    subtype,
    tone,
    speech,
    wordCount: word_count,
    fields,
    userPrompt: user_prompt,
    trendsText,
  });

  // 6. Claude 호출
  let aiText = "";
  let tokensUsed = 0;
  try {
    const orRes = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://snsmakeit.com",
        "X-Title": "NaverBot SaaS",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: WORDCOUNT_TO_TOKENS[word_count] || 5500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text().catch(() => "");
      return safeError(res, 502, "글 생성 실패", new Error(errText.slice(0, 300)));
    }

    const data = await orRes.json();
    aiText = data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || "";
    tokensUsed = data?.usage?.total_tokens || 0;
    if (!aiText) return safeError(res, 502, "빈 응답");
  } catch (e) {
    return safeError(res, 502, "글 생성 실패", e);
  }

  // 7. 파싱 + 마커 분할
  const parsed = parseResponse(aiText, fields.keyword || "글");
  const rawBlocks = splitBodyByImageMarkers(parsed.body);

  // 8. 이미지 마커 → Pexels 조회 → 실제 URL 채우기
  const blocks = [];
  for (const blk of rawBlocks) {
    if (blk.type === "text") {
      blocks.push(blk);
    } else if (blk.type === "image") {
      const photo = await searchImage(blk.keyword);
      if (photo) {
        blocks.push({ type: "image", url: photo.url, alt: photo.alt, keyword: blk.keyword });
      }
      // 이미지 못 찾으면 그 블록은 그냥 스킵
    }
  }

  // 9. 사용량 로깅 (비동기, 응답에 영향 X)
  supabase
    .from("naverbot_posts_log")
    .insert({
      license_key,
      topic: (fields.keyword || "").slice(0, 200),
      title: parsed.title.slice(0, 200),
      tokens_used: tokensUsed,
    })
    .then(({ error }) => {
      if (error) console.error("[naverbot] 로그 실패:", error.message);
    });

  return res.status(200).json({
    ok: true,
    title: parsed.title,
    blocks,
    tags: parsed.tags,
    trends_used: trends.length,
    quota: { used: quota.used + 1, limit: quota.limit },
  });
}
