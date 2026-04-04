// AI 프록시 — Edge Runtime (서버리스보다 저렴)
export const config = { runtime: "edge" };

const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_MAP = {
  // Claude
  "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4-5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4-5",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4-5",
  "claude-3-5-sonnet-20241022": "anthropic/claude-sonnet-4-5",
  // GPT
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  // Gemini
  "gemini-2.5-flash": "google/gemini-2.5-flash-preview:thinking",
  "gemini-2.5-pro": "google/gemini-2.5-pro-preview-03-25",
  "gemini-2.0-flash": "google/gemini-2.0-flash-001",
};

function orModel(m) {
  return MODEL_MAP[m] || (m.includes("/") ? m : `anthropic/${m}`);
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  if (!OR_KEY) return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });

  try {
    const { model, messages, max_tokens, system, stream } = await req.json();
    if (!model || !messages) return new Response(JSON.stringify({ error: "model, messages 필수" }), { status: 400 });

    const body = { model: orModel(model), max_tokens: max_tokens || 2000, messages };
    if (system) body.system = system;
    if (stream) body.stream = true;

    const orRes = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://snsmakeit.com",
        "X-Title": "SNS Makeit",
      },
      body: JSON.stringify(body),
    });

    if (!orRes.ok) {
      const errText = await orRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: `AI API 오류: ${errText.slice(0, 200)}` }), { status: orRes.status });
    }

    if (stream) {
      return new Response(orRes.body, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await orRes.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "서버 오류" }), { status: 500 });
  }
}
