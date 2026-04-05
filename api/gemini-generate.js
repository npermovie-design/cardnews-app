// Gemini API 직접 호출 — OpenRouter 우회로 타임아웃 방지
export const config = { runtime: "edge", maxDuration: 60 };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return new Response(JSON.stringify({ error: "Gemini API key not configured" }), { status: 500 });

  try {
    const { prompt, maxTokens } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: "prompt 필수" }), { status: 400 });

    // 토큰이 많으면 더 빠른 모델 사용
    const model = (maxTokens && maxTokens > 8000) ? "gemini-2.0-flash" : "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const genConfig = {
      maxOutputTokens: maxTokens || 8000,
      temperature: 1,
      responseMimeType: "application/json",
    };
    // 2.5-flash만 thinking 설정 지원
    if (model.includes("2.5")) genConfig.thinkingConfig = { thinkingBudget: 0 };
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: genConfig,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Gemini 오류 ${res.status}: ${err.slice(0, 200)}` }), { status: res.status });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
