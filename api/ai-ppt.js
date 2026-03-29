// AI PPT 전용 프록시 — Serverless Runtime (최대 60초)
// Edge Runtime 대신 일반 Serverless 사용으로 타임아웃 확장

const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_MAP = {
  "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4-5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4-5",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4-5",
  "claude-3-5-sonnet-20241022": "anthropic/claude-sonnet-4-5",
};

function orModel(m) {
  return MODEL_MAP[m] || (m.includes("/") ? m : `anthropic/${m}`);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!OR_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const { model, messages, max_tokens, system } = req.body;
    if (!model || !messages) return res.status(400).json({ error: "model, messages 필수" });

    const body = { model: orModel(model), max_tokens: max_tokens || 5000, messages };
    if (system) body.system = system;

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
      return res.status(orRes.status).json({ error: `AI API 오류: ${errText.slice(0, 200)}` });
    }

    const data = await orRes.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}
