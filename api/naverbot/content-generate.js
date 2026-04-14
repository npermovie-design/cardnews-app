// NaverBot SaaS - 블로그 글 생성 (메이킷 BlogUtils 패턴 이식)
// 글타입/톤/말투/분량/필드 + [image: keyword] 인라인 마커 → blocks 응답

import {
  setCors,
  safeError,
  supabase,
  verifyMakeitAccount,
  checkDailyQuota,
} from "../../lib/naverbot/index.js";
import { buildBlogPrompt, splitBodyByImageMarkers } from "../../lib/naverbot/prompts.js";
import { fetchRecentTrends, trendsToPromptText } from "../../lib/naverbot/trends.js";

const ANTHROPIC_KEY = process.env.NAVERBOT_ANTHROPIC_KEY;
const PEXELS_KEY = process.env.PEXELS_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250514";

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

  // 메이킷 인증: email+password 또는 access_token
  const hasEmailPw = b.email && b.password;
  const hasToken = b.access_token && typeof b.access_token === "string";
  if (!hasEmailPw && !hasToken) errors.push("인증 정보 필요 (이메일/비번 또는 토큰)");
  if (b.email && b.email.length > 200) errors.push("이메일 형식 오류");
  if (b.password && b.password.length > 200) errors.push("비밀번호 형식 오류");
  if (b.access_token && b.access_token.length > 4000) errors.push("토큰 형식 오류");

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
  // PIXMARK / PIXEND 사용: 영문자만이라 markdown stripper에 안 잡힘
  const placeholders = [];
  const protectedBody = rawBody.replace(/\[image:\s*[^\]]+\]/gi, (m) => {
    placeholders.push(m);
    return `PIXMARK${placeholders.length - 1}PIXEND`;
  });
  let cleanBody = stripMarkdown(protectedBody);
  cleanBody = cleanBody.replace(/PIXMARK(\d+)PIXEND/g, (_, i) => placeholders[Number(i)] || "");

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
  if (!ANTHROPIC_KEY) return safeError(res, 500, "서버 설정 오류");

  // 1. 입력 검증
  const errors = validateInput(req.body);
  if (errors.length) return safeError(res, 400, errors[0]);

  const {
    email,
    password,
    access_token,
    subtype = "info",
    tone = "friendly",
    speech = "polite_yo",
    word_count = "medium",
    fields = {},
    user_prompt = "",
  } = req.body;

  // 2. 메이킷 계정 + 구독 상태 확인
  let authResult;
  try {
    authResult = await verifyMakeitAccount({ email, password, accessToken: access_token });
  } catch (e) {
    return safeError(res, 500, "계정 검증 실패", e);
  }
  if (!authResult.ok) return res.status(403).json({ ok: false, error: authResult.reason });

  // 사용량 추적을 위해 uid를 internal key로 사용
  const userKey = authResult.uid;

  // 3. 일일 한도
  const quota = await checkDailyQuota(userKey, authResult.plan);
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
    const apiRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: WORDCOUNT_TO_TOKENS[word_count] || 5500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      return safeError(res, 502, "글 생성 실패", new Error(errText.slice(0, 300)));
    }

    const data = await apiRes.json();
    aiText = data?.content?.[0]?.text || "";
    tokensUsed = (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0);
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

  // 9. 사용량 로깅 (uid를 license_key 컬럼에 저장 — 기존 스키마 호환)
  const { error: logError } = await supabase
    .from("naverbot_posts_log")
    .insert({
      license_key: userKey,
      topic: (fields.keyword || "").slice(0, 200),
      title: parsed.title.slice(0, 200),
      tokens_used: tokensUsed,
    });
  if (logError) console.error("[naverbot] 로그 실패:", logError.message);

  return res.status(200).json({
    ok: true,
    title: parsed.title,
    blocks,
    tags: parsed.tags,
    trends_used: trends.length,
    quota: { used: quota.used + 1, limit: quota.limit },
  });
}
