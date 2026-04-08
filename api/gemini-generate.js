// Gemini API — Edge Runtime (타임아웃 관대) + 이미지 비전 지원
export const config = { runtime: "edge", maxDuration: 120 };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return new Response(JSON.stringify({ error: "Gemini API key not configured" }), { status: 500 });

  try {
    const { prompt, maxTokens, imageBase64, imageMimeType } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: "prompt 필수" }), { status: 400 });

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const genConfig = {
      maxOutputTokens: maxTokens || 8000,
      temperature: 0.9,
    };

    const parts = [];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const body = { contents: [{ parts }], generationConfig: genConfig };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 100000); // 100초
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Gemini 오류 ${res.status}: ${err.slice(0, 200)}` }), {
        status: res.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
