// api/fetch-sns-feed.js — 인스타/틱톡 AI 트렌드 피드 (서버 캐싱 + 빠른 모델)
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

// 서버 메모리 캐시 (5분)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { platform, category, keywords } = req.body || {};
  if (!platform || !category || !keywords?.length) {
    return res.status(400).json({ error: "platform, category, keywords 필요" });
  }

  const cacheKey = `${platform}_${category}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ videos: cached.data, category, cached: true });
  }

  const platLabel = platform === "instagram" ? "인스타그램" : "틱톡";

  try {
    const r = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://snsmakeit.com",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [
          { role: "system", content: `한국 ${platLabel} 트렌드 분석 전문가. 2025-2026년 현재 활동 중인 실제 크리에이터 기반. 실제 계정명 사용. JSON만 출력.` },
          { role: "user", content: `한국 ${platLabel} "${category}" 분야 인기 크리에이터+바이럴 콘텐츠 10개.
키워드: ${keywords.join(", ")}

JSON배열:
[{"id":"고유ID","platform":"${platform}","username":"@실제계정","displayName":"이름","followers":"팔로워(예:125K)","title":"인기콘텐츠 요약","contentType":"${platform === "instagram" ? "릴스/카루셀/피드" : "숏폼/듀엣"}","views":"조회수(예:850K)","likes":"좋아요(예:45K)","comments":"댓글(예:1.2K)","engagementRate":"참여율(예:4.8%)","hashtags":["태그1","태그2","태그3"],"whyViral":"인기이유 한줄","published":"시기(예:3일 전)","mood":"분위기(감성적/유머/정보성/트렌디 등)","visualStyle":"스타일 한줄","colorGradient":"CSS gradient(예:linear-gradient(135deg,#ff6b9d,#c44569))"}]` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("OpenRouter error:", r.status, errText);
      return res.status(502).json({ error: "AI 호출 실패" });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const videos = JSON.parse(cleaned);

    cache.set(cacheKey, { data: videos, ts: Date.now() });

    // 오래된 캐시 정리
    if (cache.size > 50) {
      for (const [k, v] of cache) {
        if (Date.now() - v.ts > CACHE_TTL * 2) cache.delete(k);
      }
    }

    return res.json({ videos, category, total: videos.length });
  } catch (e) {
    console.error("fetch-sns-feed error:", e.message);
    return res.status(500).json({ error: "피드 생성 실패: " + (e.message || "").slice(0, 100) });
  }
}

export const config = { maxDuration: 20 };
