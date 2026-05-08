// api/naverbot.js — NaverBot SaaS 통합 API
// ?action=account-verify|license-verify|analyze-keyword|content-generate|login-page

import { createClient } from "@supabase/supabase-js";
import {
  setCors,
  safeError,
  supabase,
  authClient,
  validateLicenseKey,
  verifyLicense,
  verifyMakeitAccount,
  checkDailyQuota,
  getPlanFeatureLimits,
} from "../lib/naverbot/index.js";
import { buildBlogPrompt, splitBodyByImageMarkers } from "../lib/naverbot/prompts.js";
import { fetchRecentTrends, trendsToPromptText } from "../lib/naverbot/trends.js";
import fs from "node:fs";
import path from "node:path";

export const config = { maxDuration: 120 };

// ══════════════════════════════════════════════════════════
// ACTION: account-verify — 메이킷 계정 로그인 + 구독 상태 확인
// ══════════════════════════════════════════════════════════

async function handleAccountVerify(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { email, password, access_token } = req.body || {};

  if (!access_token && (!email || !password)) {
    return safeError(res, 400, "인증 정보 필요");
  }
  if ((email && email.length > 200) || (password && password.length > 200) || (access_token && access_token.length > 4000)) {
    return safeError(res, 400, "잘못된 요청");
  }

  try {
    const result = await verifyMakeitAccount({ email, password, accessToken: access_token });
    if (!result.ok) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("nick, role, points, monthly_used_write, monthly_used_video")
      .eq("uid", result.uid)
      .maybeSingle();

    let trialUsed = 0;
    let trialLimit = 5;
    if (result.trial) {
      const { count } = await supabase
        .from("naverbot_posts_log")
        .select("id", { count: "exact", head: true })
        .eq("license_key", result.uid);
      trialUsed = count ?? 0;
    }

    const limits = getPlanFeatureLimits(result.plan);
    const existingPoints = Math.max(0, Number(userRow?.points ?? result.points ?? 0));
    const isProgramTrial = result.grant_type === "program_trial";
    const writeQuota = result.plan === "member"
      ? { used: 0, limit: existingPoints, exceeded: existingPoints <= 0 }
      : isProgramTrial
        ? { used: Number(userRow?.monthly_used_write || 0), limit: (limits.write || 0) + existingPoints }
        : { used: Number(userRow?.monthly_used_write || 0), limit: limits.write || 0 };
    const videoQuota = (result.plan === "member" || result.plan === "free")
      ? { used: 0, limit: existingPoints }
      : isProgramTrial
        ? { used: Number(userRow?.monthly_used_video || 0), limit: (limits.video || 0) + existingPoints }
        : { used: Number(userRow?.monthly_used_video || 0), limit: limits.video || 0 };

    return res.status(200).json({
      valid: true,
      user: {
        uid: result.uid,
        email: result.email,
        nick: userRow?.nick || "",
        role: userRow?.role || "member",
      },
      plan: result.plan,
      trial: result.trial || false,
      trial_used: trialUsed,
      trial_limit: result.plan === "admin" ? 999999 : trialLimit,
      remaining_count: Math.max(0, Number(userRow?.points ?? result.points ?? 0)),
      expires_at: result.expires_at,
      grant_type: result.grant_type || "",
      limits,
      quota: { used: writeQuota.used, limit: writeQuota.limit, feature: "write" },
      video_quota: { used: videoQuota.used, limit: videoQuota.limit, feature: "video" },
      usage: {
        write: { used: writeQuota.used, limit: writeQuota.limit },
        video: { used: videoQuota.used, limit: videoQuota.limit },
      },
    });
  } catch (e) {
    return safeError(res, 500, "로그인 처리 실패", e);
  }
}

// ══════════════════════════════════════════════════════════
// ACTION: license-verify — 라이선스 검증
// ══════════════════════════════════════════════════════════

async function handleLicenseVerify(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { license_key, machine_id } = req.body || {};

  if (!validateLicenseKey(license_key)) {
    return safeError(res, 400, "잘못된 요청");
  }
  if (!machine_id || typeof machine_id !== "string" || machine_id.length > 128) {
    return safeError(res, 400, "잘못된 요청");
  }

  try {
    const result = await verifyLicense({
      licenseKey: license_key,
      machineId: machine_id,
      bindIfFirst: true,
    });

    if (!result.ok) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    // 플랜별 제한
    const featureLimits = getPlanFeatureLimits(result.license.plan);

    return res.status(200).json({
      valid: true,
      plan: result.license.plan,
      expires_at: result.license.expires_at,
      max_accounts: featureLimits.accounts,
      daily_posts: featureLimits.autopilotDaily,
      monthly_posts: featureLimits.write,
      monthly_videos: featureLimits.video,
      limits: featureLimits,
    });
  } catch (e) {
    return safeError(res, 500, "검증 실패", e);
  }
}

// ══════════════════════════════════════════════════════════
// ACTION: analyze-keyword — 키워드 분석 (Claude)
// ══════════════════════════════════════════════════════════

const NAVERBOT_ANTHROPIC_KEY = process.env.NAVERBOT_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const FALLBACK_MODEL = "claude-haiku-4-5-20251001";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAnthropicStatus(status) {
  return status === 408 || status === 409 || status === 429 || status === 529 || status >= 500;
}

async function callAnthropicMessages(payload, { maxRetries = 2 } = {}) {
  const models = [MODEL, FALLBACK_MODEL].filter((v, i, a) => v && a.indexOf(v) === i);
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const model = attempt === 0 ? models[0] : (models[attempt] || models[models.length - 1]);
    try {
      const apiRes = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NAVERBOT_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ ...payload, model }),
        signal: AbortSignal.timeout(115000),
      });

      if (apiRes.ok) return await apiRes.json();

      const errText = await apiRes.text().catch(() => "");
      console.error(`[naverbot] Anthropic ${model} [${apiRes.status}]:`, errText.slice(0, 300));
      lastError = new Error(`[${apiRes.status}] ${errText.slice(0, 500)}`);
      lastError.status = apiRes.status;
      if (!isRetryableAnthropicStatus(apiRes.status)) break;
    } catch (e) {
      lastError = e;
    }
    if (attempt < maxRetries - 1) await sleep(1200 * (attempt + 1));
  }

  throw lastError || new Error("Anthropic request failed");
}

async function handleAnalyzeKeyword(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");
  if (!NAVERBOT_ANTHROPIC_KEY) return safeError(res, 500, "서버 설정 오류");

  const { email, password, access_token, keyword, crawled_titles, crawled_contents } = req.body || {};
  if (!keyword) return safeError(res, 400, "keyword 필수");

  const hasAuth = (email && password) || access_token;
  if (!hasAuth) return safeError(res, 400, "인증 정보 필요");

  let authResult;
  try {
    authResult = await verifyMakeitAccount({ email, password, accessToken: access_token });
  } catch (e) {
    return safeError(res, 500, "계정 검증 실패", e);
  }
  if (!authResult.ok) return res.status(403).json({ ok: false, error: authResult.reason });

  const titles = Array.isArray(crawled_titles) ? crawled_titles.slice(0, 10) : [];
  const topContents = Array.isArray(crawled_contents) ? crawled_contents.slice(0, 5) : [];

  if (!titles.length && !topContents.length) {
    return res.status(200).json({ ok: true, analysis: { suggested_titles: [], structure_summary: "크롤링 데이터 없음", extra_prompt: "" } });
  }

  const prompt = `키워드: "${keyword}"

네이버 블로그 검색 상위 글 제목들:
${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

상위 글 본문 샘플:
${topContents.map((c, i) => `--- 글 ${i + 1}: ${c.title || ""} ---\n${(c.body || "").slice(0, 1500)}`).join("\n")}

위 분석을 바탕으로 다음을 JSON 형식으로 답해주세요:
1. suggested_titles: 이 키워드로 네이버 상위 노출에 유리한 제목 5개 (배열). 상위 글들의 제목 패턴 분석 기반. 30~40자, 호기심 자극형, 숫자/감정 활용.
2. structure_summary: 상위 글들의 공통 구조 패턴 요약 (섹션 구성, 분량, 이미지 위치 등). 200자 이내.
3. extra_prompt: 이 키워드로 고품질 글을 쓰기 위한 프롬프트 지침. 상위글에서 발견한 핵심 포인트 반영. 300자 이내.

반드시 JSON만 출력하세요. \`\`\`json 같은 코드블록 없이.`;

  try {
    const data = await callAnthropicMessages({
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const aiText = data?.content?.[0]?.text || "";

    let analysis;
    try {
      analysis = JSON.parse(aiText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    } catch {
      analysis = { suggested_titles: titles.slice(0, 5), structure_summary: "파싱 실패", extra_prompt: "" };
    }

    return res.status(200).json({ ok: true, analysis, top_titles: titles });
  } catch (e) {
    return safeError(res, 502, "분석 실패", e);
  }
}

// ══════════════════════════════════════════════════════════
// ACTION: content-generate — 블로그 글 생성
// ══════════════════════════════════════════════════════════

const PEXELS_KEY = process.env.PEXELS_KEY;

const VALID_SUBTYPES = ["info", "visit", "travel", "product", "column", "article"];
const VALID_TONES = ["friendly", "diary", "review", "professional"];
const VALID_SPEECH = ["polite_yo", "formal", "casual", "friendly", "mixed"];
const VALID_WORDCOUNTS = ["short", "medium", "long"];

const WORDCOUNT_TO_TOKENS = {
  short: 4000,
  medium: 8000,
  long: 16000,
};

function validateInput(b) {
  if (!b || typeof b !== "object") return ["request body 누락"];
  const errors = [];

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
  if (b.user_prompt && b.user_prompt.length > 8000) errors.push("user_prompt 8000자 초과");

  return errors;
}

function isPointQuotaPlan(plan) {
  return plan === "member" || plan === "free";
}

function isMonthlyQuotaPlan(plan) {
  return !["admin", "trial", "member", "free"].includes(plan);
}

async function checkWriteQuotaForAccount(uid, plan, isAdmin) {
  if (isAdmin) return { used: 0, limit: 999999, exceeded: false };
  if (!isMonthlyQuotaPlan(plan)) return checkDailyQuota(uid, plan);

  const limits = getPlanFeatureLimits(plan);
  const { data: userRow, error } = await supabase
    .from("users")
    .select("monthly_used_write")
    .eq("uid", uid)
    .maybeSingle();
  if (error) throw error;

  const used = Math.max(0, Number(userRow?.monthly_used_write || 0));
  const limit = Math.max(0, Number(limits.write || 0));
  return { used, limit, exceeded: limit <= 0 || used >= limit, trial: false, feature: "write" };
}

async function chargeWriteQuotaForAccount(uid, plan) {
  if (!isMonthlyQuotaPlan(plan)) return null;

  const { data: quotaResult, error } = await supabase.rpc("use_monthly_quota", {
    p_uid: uid,
    p_cost: 1,
    p_reason: "NaverBot 콘텐츠 생성",
    p_feature: "write",
  });
  if (error) throw error;

  const qr = typeof quotaResult === "string" ? JSON.parse(quotaResult) : quotaResult;
  if (!qr?.ok) {
    const err = new Error(qr?.error || "monthly_quota_failed");
    err.quota = qr;
    throw err;
  }
  return {
    used: Number(qr.monthly_used ?? qr.used ?? 0),
    limit: Number(qr.monthly_limit ?? qr.limit ?? 0),
  };
}

function stripMarkdown(text) {
  return text
    .replace(/\[\[(?:\/|bold|underline|italic|strike|font-size:[^\]]+|font:[^\]]+|color:[^\]]+|bg:[^\]]+|background:[^\]]+|highlight:[^\]]+)\]\]/gi, "")
    .replace(/\[(?:\/|underline|font-size|color|bg|background|highlight)(?::[^\]]*)?\]/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+)_(?!_)/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+[\.\)]\s*/gm, "")  // "1. " "1) " "1 " 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "")
    .replace(/[★●■▶♥☆→◆◇▷▼△▲※◎○☑✓✔✕✗✘]/g, "")  // 특수기호 제거
    .trim();
}

function parseResponse(text, fallbackKeyword) {
  const titleMatch = text.match(/\[TITLE\]\s*\n([^\n]+)/);
  const tagsMatch = text.match(/\[TAGS\]\s*\n([^\n]+)/);

  // [TITLE] 이후 ~ [TAGS] 전까지가 본문 ([BODY] 마커 유무 무관)
  let rawBody = "";
  const bodyMatch = text.match(/\[BODY\]\s*\n([\s\S]+?)(?=\n\[TAGS\]|$)/);
  if (bodyMatch) {
    rawBody = bodyMatch[1].trim();
  } else {
    // [BODY] 없으면 [TITLE] 다음줄 ~ [TAGS] 전까지
    const afterTitle = text.match(/\[TITLE\]\s*\n[^\n]+\n([\s\S]+?)(?=\n\[TAGS\]|$)/);
    rawBody = afterTitle ? afterTitle[1].trim() : text.trim();
  }

  // 마커들을 보호하면서 마크다운 제거
  const placeholders = [];
  const markerRegex = /\[(?:image|SUBTITLE|QUOTE|gif):\s*[^\]]+\]|\[(?:SUBTITLE|QUOTE)\]\s*[^\n]+/gi;
  const protectedBody = rawBody.replace(markerRegex, (m) => {
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

async function searchImage(keyword, excludeUrls = []) {
  if (!PEXELS_KEY || !keyword) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=8&orientation=landscape`;
    const r = await fetch(url, { headers: { Authorization: PEXELS_KEY.trim() } });
    if (!r.ok) return null;
    const data = await r.json();
    const excludeSet = new Set(excludeUrls);
    const photos = (data?.photos || []).filter(p => p?.src?.large && !excludeSet.has(p.src.large));
    const photo = photos[Math.floor(Math.random() * Math.min(photos.length, 3))];
    if (!photo?.src?.large) return null;
    return { url: photo.src.large, alt: photo.alt || keyword, keyword };
  } catch (e) {
    console.error("[naverbot] Pexels:", e.message);
    return null;
  }
}

const KLIPY_KEY = process.env.KLIPY_KEY;

async function searchGif(keyword) {
  if (!keyword) return null;

  // 1차: Klipy API
  if (KLIPY_KEY) {
    try {
      const url = `https://api.klipy.com/api/v1/${KLIPY_KEY}/gifs/search?q=${encodeURIComponent(keyword)}&per_page=8&locale=ko_KR&content_filter=g`;
      const r = await fetch(url, { timeout: 8000 });
      if (r.ok) {
        const data = await r.json();
        const items = data?.data?.data || [];
        if (items.length > 0) {
          // 랜덤으로 하나 선택 (다양성)
          const item = items[Math.floor(Math.random() * Math.min(items.length, 5))];
          // Klipy 응답에서 GIF URL 추출 (여러 포맷 중 작은 사이즈 선택)
          const gifUrl = item?.media_formats?.gif?.url
            || item?.media_formats?.tinygif?.url
            || item?.media?.gif?.url
            || item?.url
            || "";
          if (gifUrl) {
            return { url: gifUrl, keyword, source: "klipy" };
          }
        }
      }
    } catch (e) {
      console.error("[naverbot] Klipy:", e.message);
    }
  }

  // 2차: GIPHY 폴백
  const GIPHY_KEY = process.env.GIPHY_KEY;
  if (GIPHY_KEY) {
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(keyword)}&lang=ko&limit=5&rating=g`;
      const r = await fetch(url, { timeout: 8000 });
      if (r.ok) {
        const data = await r.json();
        const items = data?.data || [];
        if (items.length > 0) {
          const item = items[Math.floor(Math.random() * Math.min(items.length, 3))];
          const gifUrl = item?.images?.downsized_medium?.url || item?.images?.original?.url || "";
          if (gifUrl) {
            return { url: gifUrl, keyword, source: "giphy" };
          }
        }
      }
    } catch (e) {
      console.error("[naverbot] GIPHY:", e.message);
    }
  }

  return null;
}

async function handleContentGenerate(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");
  if (!NAVERBOT_ANTHROPIC_KEY) return safeError(res, 500, "서버 설정 오류");

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

  let authResult;
  try {
    authResult = await verifyMakeitAccount({ email, password, accessToken: access_token });
  } catch (e) {
    return safeError(res, 500, "계정 검증 실패", e);
  }
  if (!authResult.ok) return res.status(403).json({ ok: false, error: authResult.reason });

  const userKey = authResult.uid;

  // 관리자 이메일은 한도 무제한
  const ADMIN_EMAILS = ["npermovie@naver.com"];
  const resolvedEmail = (authResult.email || email || "").toLowerCase();
  const isAdmin = authResult.plan === "admin" || authResult.role === "admin" || ADMIN_EMAILS.includes(resolvedEmail);

  let quota;
  try {
    quota = await checkWriteQuotaForAccount(userKey, authResult.plan, isAdmin);
  } catch (e) {
    return safeError(res, 500, "사용량 확인 실패", e);
  }
  if (quota.exceeded && !isAdmin) {
    return res.status(429).json({
      ok: false,
      error: `한도 초과 (${quota.used}/${quota.limit})`,
    });
  }

  const trends = await fetchRecentTrends(fields.keyword, { days: 7, limit: 8 });
  const trendsText = trendsToPromptText(trends);

  const useGif = !!req.body.use_gif;

  // AEO 위치 (top/middle/bottom/none) + 장단점 토글
  const aeoPosition = req.body.aeoPosition || "top";
  const includeProsCons = req.body.includeProsCons !== false;
  let structureOverride = "";
  if (!includeProsCons) structureOverride += "\n\n[장단점·추천 제외] 장점/단점 목록과 추천 대상/비추천 대상 섹션을 넣지 마세요.";

  const { system, user } = buildBlogPrompt({
    subtype,
    tone,
    speech,
    wordCount: word_count,
    fields,
    userPrompt: user_prompt + structureOverride,
    trendsText,
    useGif,
    aeoPosition,
  });

  let aiText = "";
  let tokensUsed = 0;
  try {
    const data = await callAnthropicMessages({
      max_tokens: WORDCOUNT_TO_TOKENS[word_count] || 5500,
      system,
      messages: [{ role: "user", content: user }],
    });
    aiText = data?.content?.[0]?.text || "";
    tokensUsed = (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0);
    if (!aiText) return safeError(res, 502, "빈 응답");
  } catch (e) {
    const detail = e?.message || String(e);
    const msg = e?.status === 429 || e?.status === 529 || e?.name === "TimeoutError"
      ? `글 생성 실패 (AI 서버 혼잡/응답 지연): ${detail.slice(0, 200)}`
      : `글 생성 실패: ${detail.slice(0, 200)}`;
    console.error("[naverbot] content-generate error:", detail);
    return res.status(502).json({ ok: false, error: msg });
  }

  const parsed = parseResponse(aiText, fields.keyword || "글");

  // 태그 fallback: Claude가 TAGS를 누락하면 키워드 기반 자동 생성
  if (!parsed.tags.length && fields.keyword) {
    const kw = fields.keyword.trim();
    const words = kw.split(/[\s,]+/).filter(w => w.length >= 2);
    parsed.tags = [kw, ...words.slice(0, 4)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  }

  const rawBlocks = splitBodyByImageMarkers(parsed.body);

  const blocks = [];
  const usedImageUrls = []; // 중복 방지
  for (const blk of rawBlocks) {
    if (blk.type === "text" || blk.type === "subtitle" || blk.type === "quote") {
      blocks.push(blk);
    } else if (blk.type === "image") {
      let photo = await searchImage(blk.keyword, usedImageUrls);
      if (!photo && blk.keyword.split(" ").length > 2) {
        photo = await searchImage(blk.keyword.split(" ").slice(0, 2).join(" "), usedImageUrls);
      }
      if (!photo) {
        photo = await searchImage(blk.keyword.split(" ")[0], usedImageUrls);
      }
      if (photo) {
        usedImageUrls.push(photo.url);
        blocks.push({ type: "image", url: photo.url, alt: photo.alt, keyword: blk.keyword });
      } else {
        console.warn(`[naverbot] 이미지 검색 실패 (키워드: ${blk.keyword}) — PEXELS_KEY 확인 필요`);
      }
    } else if (blk.type === "gif" && useGif) {
      const gif = await searchGif(blk.keyword);
      if (gif) {
        blocks.push({ type: "image", url: gif.url, alt: blk.keyword, keyword: blk.keyword, isGif: true });
      }
    }
  }

  const { error: logError } = await supabase
    .from("naverbot_posts_log")
    .insert({
      license_key: userKey,
      topic: "",
      title: "",
      tokens_used: tokensUsed,
    });
  if (logError) console.error("[naverbot] 로그 실패:", logError.message);

  let remainingPointQuota = null;
  let chargedMonthlyQuota = null;
  if (!isAdmin && isPointQuotaPlan(authResult.plan)) {
    const { data: newPoints, error: pointError } = await supabase.rpc("change_points_atomic", {
      p_uid: userKey,
      p_delta: -1,
      p_reason: "NaverBot 콘텐츠 생성",
    });
    if (pointError) {
      console.error("[naverbot] 회원 잔여 횟수 차감 실패:", pointError.message);
    } else {
      remainingPointQuota = Math.max(0, Number(newPoints || 0));
    }
  } else if (!isAdmin && isMonthlyQuotaPlan(authResult.plan)) {
    try {
      chargedMonthlyQuota = await chargeWriteQuotaForAccount(userKey, authResult.plan);
    } catch (e) {
      console.error("[naverbot] 월간 글쓰기 횟수 차감 실패:", e?.message || e);
      return res.status(429).json({
        ok: false,
        error: "월간 한도 초과 또는 차감 실패",
        quota: e?.quota || null,
      });
    }
  }

  // 본문 마지막에 해시태그 블록 추가
  if (parsed.tags.length) {
    const hashtagText = parsed.tags.map(t => "#" + t.replace(/\s+/g, "")).join(" ");
    blocks.push({ type: "text", text: "\n" + hashtagText });
  }

  return res.status(200).json({
    ok: true,
    title: parsed.title,
    blocks,
    tags: parsed.tags,
    trends_used: trends.length,
    quota: remainingPointQuota !== null
      ? { used: 0, limit: remainingPointQuota }
      : (chargedMonthlyQuota || { used: quota.used + 1, limit: quota.limit }),
  });
}

// ══════════════════════════════════════════════════════════
// ACTION: login-page — 메이킷 계정 로그인 브릿지 페이지
// ══════════════════════════════════════════════════════════

let cachedHtml = null;

function loadHtml() {
  if (cachedHtml) return cachedHtml;
  try {
    const htmlPath = path.join(process.cwd(), "public", "naverbot-auth.html");
    cachedHtml = fs.readFileSync(htmlPath, "utf8");
  } catch {
    cachedHtml = null;
  }
  return cachedHtml;
}

const INLINE_HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>메이킷 SNS 자동화 로그인</title>
<style>body{font-family:sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{max-width:420px;padding:40px;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:center}
h1{font-size:22px;margin-bottom:10px}p{color:#6b7280;margin-bottom:20px}
.btn{display:block;width:100%;padding:13px;background:#ef4f5f;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:10px}
.btn-google{background:#fff;color:#111;border:1px solid #e5e7eb}
input{width:100%;padding:11px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;margin-top:10px}
</style></head><body><div class="card" id="card"><div>로딩 중...</div></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script>
const SUPABASE_URL="__SUPABASE_URL__";
const SUPABASE_ANON_KEY="__SUPABASE_ANON_KEY__";
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const LOOPBACK_CALLBACK="http://127.0.0.1:54321/callback";
const card=document.getElementById("card");
function callback(session){const u=new URL(LOOPBACK_CALLBACK);u.searchParams.set("access_token",session.access_token);if(session.refresh_token)u.searchParams.set("refresh_token",session.refresh_token);u.searchParams.set("email",session.user.email||"");u.searchParams.set("uid",session.user.id||"");u.searchParams.set("expires_at",String(session.expires_at||""));return u.toString()}
function showOk(session){const url=callback(session);card.innerHTML='<h1>로그인 완료</h1><p>앱으로 이동합니다...</p><button class="btn" onclick="location.href=\\''+url+'\\'">앱으로 이동</button>';setTimeout(()=>{location.href=url},700)}
function showLogin(){card.innerHTML='<h1>메이킷 로그인</h1><p>snsmakeit.com 계정으로 로그인</p><button class="btn btn-google" id="g">Google로 계속하기</button><input type="email" id="email" placeholder="이메일"><input type="password" id="pw" placeholder="비밀번호"><button class="btn" id="em">이메일로 로그인</button>';
document.getElementById("g").onclick=async()=>{await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:LOOPBACK_CALLBACK}})};
document.getElementById("em").onclick=async()=>{const{data,error}=await client.auth.signInWithPassword({email:document.getElementById("email").value,password:document.getElementById("pw").value});if(error)return alert(error.message);showOk(data.session)}}
(async()=>{const{data:{session}}=await client.auth.getSession();if(session)showOk(session);else showLogin()})();
</script></body></html>`;

function handleLoginPage(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  const html = (loadHtml() || INLINE_HTML)
    .replaceAll("__SUPABASE_URL__", process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .replaceAll("__SUPABASE_ANON_KEY__", process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "");
  return res.status(200).send(html);
}

// ══════════════════════════════════════════════════════════
// ACTION: token-refresh — Supabase 토큰 갱신
// ══════════════════════════════════════════════════════════

async function handleTokenRefresh(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");
  const { refresh_token } = req.body || {};
  if (!refresh_token) return safeError(res, 400, "refresh_token 필요");

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_KEY;
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await authClient.auth.refreshSession({ refresh_token });
    if (error || !data?.session) {
      return res.status(200).json({ ok: false, error: error?.message || "갱신 실패" });
    }
    return res.status(200).json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (e) {
    return safeError(res, 500, "토큰 갱신 오류", e);
  }
}

// ══════════════════════════════════════════════════════════
// ACTION: trial — 데스크톱 앱 무료 체험 사용량 서버 조회
// ══════════════════════════════════════════════════════════

async function handleTrial(req, res) {
  if (req.method !== "GET") return safeError(res, 405, "GET only");

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return safeError(res, 401, "auth required");

  try {
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) return safeError(res, 401, "auth required");

    const { count } = await supabase
      .from("naverbot_posts_log")
      .select("id", { count: "exact", head: true })
      .eq("license_key", user.id);

    const used = count ?? 0;
    return res.status(200).json({ ok: true, used, limit: 5, remaining: Math.max(0, 5 - used) });
  } catch (e) {
    return safeError(res, 500, "trial 조회 실패", e);
  }
}

// ══════════════════════════════════════════════════════════
// 라우터
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ACTION: update — 앱 업데이트 확인
// ══════════════════════════════════════════════════════════
function handleUpdate(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "GET only" });
  return res.status(200).json({
    ok: true,
    version: String(process.env.NAVERBOT_LATEST_VERSION || "0.2.2").trim(),
    download_url: String(process.env.NAVERBOT_DOWNLOAD_URL || "https://snsmakeit.com/pricing").trim(),
    notes: process.env.NAVERBOT_UPDATE_NOTES || "새 버전이 준비되었습니다. 최신 설치 파일을 다운로드해 업데이트하세요.",
    required: String(process.env.NAVERBOT_UPDATE_REQUIRED || "").toLowerCase() === "true",
  });
}

// ══════════════════════════════════════════════════════════
// ACTION: hot-manifest — 렌더러 핫 업데이트 매니페스트
// ══════════════════════════════════════════════════════════
function handleHotManifest(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "GET only" });

  const baseUrl = "https://snsmakeit.com/naverbot-assets";
  const version = String(process.env.NAVERBOT_RENDERER_VERSION || "0").trim();

  // version이 "0"이면 핫 업데이트 비활성 (배포 전)
  if (version === "0") {
    return res.status(200).json({ version: "0", files: [] });
  }

  return res.status(200).json({
    version,
    files: [
      { name: "style.css", url: `${baseUrl}/style.css?v=${version}` },
      { name: "app.js", url: `${baseUrl}/app.js?v=${version}` },
      { name: "cardnews.js", url: `${baseUrl}/cardnews.js?v=${version}` },
    ],
  });
}

// ══════════════════════════════════════════════════════════
// ACTION: version-check — 최소 요구 버전 확인 (앱 기동 시)
// ══════════════════════════════════════════════════════════
function handleVersionCheck(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "GET only" });

  const clientVersion = req.query.v || "0.0.0";
  const minVersion = String(process.env.NAVERBOT_MIN_VERSION || "0.2.2").trim();
  const latestVersion = String(process.env.NAVERBOT_LATEST_VERSION || minVersion).trim();
  const downloadUrl = String(process.env.NAVERBOT_DOWNLOAD_URL || "https://snsmakeit.com/pricing").trim();

  const compare = (a, b) => {
    const pa = String(a).split(".").map(n => parseInt(n, 10) || 0);
    const pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const isFutureSpoof = compare(clientVersion, latestVersion) > 0;
  const isOk = !isFutureSpoof && compare(clientVersion, minVersion) >= 0;
  return res.status(200).json({
    ok: isOk,
    min_version: minVersion,
    latest_version: latestVersion,
    message: isOk ? "" : (isFutureSpoof ? "등록되지 않은 앱 버전입니다. 공식 빌드로 업데이트하세요." : "최소 요구 버전보다 낮습니다. 업데이트가 필요합니다."),
    download_url: downloadUrl,
  });
}

// ══════════════════════════════════════════════════════════
// ACTION: use-quota — 데스크톱 앱에서 횟수 차감 + 잔여 횟수 반환
// ══════════════════════════════════════════════════════════

async function handleUseQuota(req, res) {
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { access_token, reason, feature = "write" } = req.body || {};
  if (!access_token) return safeError(res, 400, "인증 정보 필요");
  const normalizedFeature = ["write", "video"].includes(String(feature)) ? String(feature) : "write";

  try {
    const result = await verifyMakeitAccount({ accessToken: access_token });
    if (!result.ok) return res.status(200).json({ ok: false, error: result.reason });

    const uid = result.uid;
    const plan = result.plan;
    const isAdmin = plan === "admin";

    if (isAdmin) {
      return res.status(200).json({ ok: true, remaining: 999999 });
    }

    if (plan === "trial") {
      const limits = getPlanFeatureLimits("trial");
      const usedColumn = normalizedFeature === "video" ? "monthly_used_video" : "monthly_used_write";
      const limit = Math.max(0, Number(limits[normalizedFeature] || 0));
      const { data: userRow, error: readErr } = await supabase
        .from("users")
        .select(usedColumn)
        .eq("uid", uid)
        .maybeSingle();
      if (readErr) return safeError(res, 500, "체험 횟수 확인 실패", readErr);

      const used = Math.max(0, Number(userRow?.[usedColumn] || 0));
      if (limit <= 0 || used + 1 > limit) {
        return res.status(200).json({ ok: false, error: "월간 한도 초과", feature: normalizedFeature, monthly_used: used, monthly_limit: limit });
      }

      const newUsed = used + 1;
      const { error: updateErr } = await supabase
        .from("users")
        .update({ [usedColumn]: newUsed })
        .eq("uid", uid);
      if (updateErr) return safeError(res, 500, "체험 횟수 차감 실패", updateErr);

      return res.status(200).json({ ok: true, feature: normalizedFeature, monthly_used: newUsed, monthly_limit: limit });
    }

    if (plan === "member" || plan === "free") {
      // 비구독 회원: points 차감
      const { data: newPoints, error } = await supabase.rpc("change_points_atomic", {
        p_uid: uid,
        p_delta: -1,
        p_reason: reason || (normalizedFeature === "video" ? "데스크톱 영상 편집" : "데스크톱 콘텐츠 생성"),
      });
      if (error) {
        if (error.message?.includes("insufficient") || error.message?.includes("잔액")) {
          return res.status(200).json({ ok: false, error: "횟수 부족", remaining: 0 });
        }
        return safeError(res, 500, "횟수 차감 실패", error);
      }
      return res.status(200).json({ ok: true, remaining: Math.max(0, Number(newPoints || 0)) });
    }

    // 구독자: 월간 횟수 차감
    const { data: quotaResult, error: qErr } = await supabase.rpc("use_monthly_quota", {
      p_uid: uid,
      p_cost: 1,
      p_reason: reason || (normalizedFeature === "video" ? "데스크톱 영상 편집" : "데스크톱 콘텐츠 생성"),
      p_feature: normalizedFeature,
    });
    if (qErr) return safeError(res, 500, "월간 횟수 차감 실패", qErr);

    const qr = typeof quotaResult === "string" ? JSON.parse(quotaResult) : quotaResult;
    if (!qr.ok) {
      return res.status(200).json({ ok: false, error: qr.error || "월간 한도 초과", feature: qr.feature || normalizedFeature, monthly_used: qr.monthly_used ?? qr.used, monthly_limit: qr.monthly_limit ?? qr.limit });
    }
    return res.status(200).json({ ok: true, feature: qr.feature || normalizedFeature, monthly_used: qr.monthly_used, monthly_limit: qr.monthly_limit });
  } catch (e) {
    return safeError(res, 500, "횟수 처리 실패", e);
  }
}

const ACTION_MAP = {
  "account-verify": handleAccountVerify,
  "license-verify": handleLicenseVerify,
  "analyze-keyword": handleAnalyzeKeyword,
  "content-generate": handleContentGenerate,
  "login-page": handleLoginPage,
  "token-refresh": handleTokenRefresh,
  "trial": handleTrial,
  "update": handleUpdate,
  "hot-manifest": handleHotManifest,
  "version-check": handleVersionCheck,
  "use-quota": handleUseQuota,
};

import { rateLimit as _rl } from "../lib/security.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // Rate Limiting (content-generate는 무겁기 때문에 별도 한도)
  const action = req.query.action;
  const limit = action === "content-generate" ? 10 : 30;
  if (!_rl(req, { limit, windowMs: 60000 })) {
    return res.status(429).json({ error: "요청이 너무 많습니다" });
  }

  if (!action || !ACTION_MAP[action]) {
    return res.status(400).json({ error: "잘못된 요청입니다" });
  }

  return ACTION_MAP[action](req, res);
}
