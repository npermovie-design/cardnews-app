// NaverBot SaaS - 키워드 분석 (클라이언트 크롤링 데이터 + Claude 분석)
import {
  setCors,
  safeError,
  verifyMakeitAccount,
} from "../../lib/naverbot/index.js";

const ANTHROPIC_KEY = process.env.NAVERBOT_ANTHROPIC_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250514";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");
  if (!ANTHROPIC_KEY) return safeError(res, 500, "서버 설정 오류");

  const { email, password, access_token, keyword, crawled_titles, crawled_contents } = req.body || {};
  if (!keyword) return safeError(res, 400, "keyword 필수");

  // 인증
  const hasAuth = (email && password) || access_token;
  if (!hasAuth) return safeError(res, 400, "인증 정보 필요");

  let authResult;
  try {
    authResult = await verifyMakeitAccount({ email, password, accessToken: access_token });
  } catch (e) {
    return safeError(res, 500, "계정 검증 실패", e);
  }
  if (!authResult.ok) return res.status(403).json({ ok: false, error: authResult.reason });

  // 클라이언트에서 보낸 크롤링 데이터 사용
  const titles = Array.isArray(crawled_titles) ? crawled_titles.slice(0, 10) : [];
  const topContents = Array.isArray(crawled_contents) ? crawled_contents.slice(0, 5) : [];

  if (!titles.length && !topContents.length) {
    return res.status(200).json({ ok: true, analysis: { suggested_titles: [], structure_summary: "크롤링 데이터 없음", extra_prompt: "" } });
  }

  // Claude 분석
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
    const apiRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!apiRes.ok) return safeError(res, 502, "분석 실패");

    const data = await apiRes.json();
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
