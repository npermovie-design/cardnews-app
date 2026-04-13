// AI PPT 전용 프록시 — Serverless Runtime (최대 60초)
// Edge Runtime 대신 일반 Serverless 사용으로 타임아웃 확장

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const MODEL_MAP = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-5-20250514",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5-20250514",
};

function resolveModel(m) {
  return MODEL_MAP[m] || "claude-haiku-4-5-20251001";
}

export default async function handler(req, res) {
  // CORS
  const _origin = req.headers?.origin || ""; res.setHeader("Access-Control-Allow-Origin", _origin.includes("snsmakeit.com") || _origin.includes("vercel.app") || _origin.includes("localhost") ? _origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const { model, messages, max_tokens, system } = req.body;
    if (!model || !messages) return res.status(400).json({ error: "model, messages 필수" });

    // system 메시지를 messages에서 분리
    const systemMsg = system || "";
    const filteredMessages = messages.filter(m => m.role !== "system");
    const systemFromMessages = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const finalSystem = [systemMsg, systemFromMessages].filter(Boolean).join("\n");

    const body = {
      model: resolveModel(model),
      max_tokens: max_tokens || 5000,
      messages: filteredMessages,
    };
    if (finalSystem) body.system = finalSystem;

    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      return res.status(anthropicRes.status).json({ error: `Anthropic API 오류: ${errText.slice(0, 200)}` });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text || "";
    // OpenAI 호환 형식으로 반환 (기존 클라이언트 코드 호환)
    return res.status(200).json({
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}
