// NaverBot SaaS - 블로그 글 생성
// 사용자 주제 + 프롬프트 + 길이 → Claude로 생성 → 클라이언트로 전달
// 인프라: OpenRouter 경유 (메이킷 기존 패턴)

import {
  setCors,
  safeError,
  supabase,
  verifyLicense,
  validateGenerateInput,
  checkDailyQuota,
} from "./_lib.js";

const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4-5";

// 글자수 → 토큰 변환 (대략 한국어 1자 ≈ 1.5 토큰, 여유 20%)
function lengthToMaxTokens(len) {
  return Math.min(8192, Math.ceil(len * 1.8 + 500));
}

function buildPrompts({ topic, length, stylePrompt, autoTitle, autoHashtag }) {
  const system = `당신은 네이버 블로그 글 작성 전문가입니다.
사용자의 글쓰기 스타일을 정확히 따라 자연스러운 블로그 글을 작성합니다.

출력 형식 (반드시 준수):
[TITLE]
제목 한 줄 (30자 이내, 검색 친화적)

[BODY]
본문 (목표 ${length}자 ±10%)
${autoHashtag ? "\n[TAGS]\n태그1, 태그2, 태그3 (5~10개, 쉼표 구분, # 없이)" : ""}

규칙:
- 이모지 사용 금지
- 마크다운(##, **, -) 사용 금지 (네이버는 일반 텍스트만 받음)
- 단락 사이는 빈 줄로 구분
- 제목/소제목/본문 구분 명확하게`;

  const user = `주제: ${topic}

${stylePrompt ? `글쓰기 스타일/규칙:\n${stylePrompt}\n\n` : ""}위 주제로 ${length}자 분량의 네이버 블로그 글을 작성해주세요.`;

  return { system, user };
}

function parseResponse(text, fallbackTopic, autoHashtag) {
  const titleMatch = text.match(/\[TITLE\]\s*\n([^\n]+)/);
  const bodyMatch = text.match(/\[BODY\]\s*\n([\s\S]+?)(?=\n\[TAGS\]|$)/);
  const tagsMatch = text.match(/\[TAGS\]\s*\n([^\n]+)/);

  const title = titleMatch ? titleMatch[1].trim() : fallbackTopic.slice(0, 30);
  const body = bodyMatch ? bodyMatch[1].trim() : text.trim();
  const tags =
    autoHashtag && tagsMatch
      ? tagsMatch[1]
          .split(/[,，]/)
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean)
          .slice(0, 10)
      : [];

  return { title, body, tags };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  if (!OR_KEY) return safeError(res, 500, "서버 설정 오류");

  // 1. 입력 검증
  const errors = validateGenerateInput(req.body);
  if (errors.length) return safeError(res, 400, errors[0]);

  const { license_key, machine_id, topic, style_prompt, length, auto_title, auto_hashtag } = req.body;

  // 2. 라이선스 검증 (machine_id도 같이)
  if (!machine_id || typeof machine_id !== "string") {
    return safeError(res, 400, "잘못된 요청");
  }

  let licenseResult;
  try {
    licenseResult = await verifyLicense({ licenseKey: license_key, machineId: machine_id });
  } catch (e) {
    return safeError(res, 500, "라이선스 검증 실패", e);
  }
  if (!licenseResult.ok) {
    return res.status(403).json({ ok: false, error: licenseResult.reason });
  }

  // 3. 일일 한도 체크
  const quota = await checkDailyQuota(license_key, licenseResult.license.plan);
  if (quota.exceeded) {
    return res.status(429).json({
      ok: false,
      error: `일일 한도 초과 (${quota.used}/${quota.limit})`,
    });
  }

  // 4. Claude 호출 (OpenRouter)
  const safeLen = Math.min(Math.max(Number(length), 1000), 8000);
  const { system, user } = buildPrompts({
    topic,
    length: safeLen,
    stylePrompt: style_prompt || "",
    autoTitle: auto_title !== false,
    autoHashtag: auto_hashtag === true,
  });

  let aiText = "";
  let tokensUsed = 0;
  try {
    const orRes = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://snsmakeit.com",
        "X-Title": "NaverBot SaaS",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: lengthToMaxTokens(safeLen),
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text().catch(() => "");
      return safeError(res, 502, "글 생성 실패", new Error(errText.slice(0, 300)));
    }

    const data = await orRes.json();
    aiText =
      data?.choices?.[0]?.message?.content ||
      data?.content?.[0]?.text ||
      "";
    tokensUsed =
      (data?.usage?.total_tokens) ||
      (data?.usage?.prompt_tokens || 0) + (data?.usage?.completion_tokens || 0) ||
      0;

    if (!aiText) return safeError(res, 502, "빈 응답");
  } catch (e) {
    return safeError(res, 502, "글 생성 실패", e);
  }

  const post = parseResponse(aiText, topic, auto_hashtag === true);

  // 5. 사용량 로깅 (실패해도 응답엔 영향 없음)
  supabase
    .from("naverbot_posts_log")
    .insert({
      license_key,
      topic: topic.slice(0, 200),
      title: post.title.slice(0, 200),
      tokens_used: tokensUsed,
    })
    .then(({ error }) => {
      if (error) console.error("[naverbot] 로그 기록 실패:", error.message);
    });

  return res.status(200).json({
    ok: true,
    title: post.title,
    body: post.body,
    tags: post.tags,
    quota: { used: quota.used + 1, limit: quota.limit },
  });
}
