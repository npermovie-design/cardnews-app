// AI 프록시 — OpenRouter API 키를 서버에서만 사용
// 프론트엔드에서 직접 OpenRouter를 호출하지 않고 이 프록시를 통해 호출

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

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!OR_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const { model, messages, max_tokens, system, stream } = req.body;
    if (!model || !messages) return res.status(400).json({ error: "model, messages 필수" });

    const body = {
      model: orModel(model),
      max_tokens: max_tokens || 2000,
      messages,
    };
    if (system) body.system = system;

    // 스트리밍 모드
    if (stream) {
      body.stream = true;
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

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = orRes.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (e) {}
      return res.end();
    }

    // 일반 모드
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
