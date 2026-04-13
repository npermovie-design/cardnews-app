// AI 프록시 — Anthropic 직접 호출 (OpenRouter 대비 8배+ 빠름)
export const config = { runtime: "edge", maxDuration: 60 };

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

// Anthropic 모델 매핑
const ANTHROPIC_MODEL_MAP = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-5-20250514",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5-20250514",
};

// Anthropic 미지원 모델은 OpenRouter 폴백
const OR_MODEL_MAP = {
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gemini-2.5-flash": "google/gemini-2.5-flash-preview:thinking",
  "gemini-2.5-pro": "google/gemini-2.5-pro-preview-03-25",
  "gemini-2.0-flash": "google/gemini-2.0-flash-001",
};

function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}

// OpenAI messages → Anthropic messages 변환
function toAnthropicMessages(messages) {
  return messages.map(msg => {
    if (typeof msg.content === "string") return { role: msg.role === "assistant" ? "assistant" : "user", content: msg.content };
    if (Array.isArray(msg.content)) {
      const parts = msg.content.map(p => {
        if (p.type === "text") return { type: "text", text: p.text || "" };
        if (p.type === "image_url" && p.image_url?.url) {
          const url = p.image_url.url;
          if (url.startsWith("data:")) {
            const [meta, data] = url.split(",");
            const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
            return { type: "image", source: { type: "base64", media_type: mime, data } };
          }
        }
        if (p.type === "image" && p.source) return p; // 이미 Anthropic 형식
        return { type: "text", text: JSON.stringify(p) };
      });
      return { role: msg.role === "assistant" ? "assistant" : "user", content: parts };
    }
    return msg;
  });
}

// Anthropic SSE → OpenAI SSE 변환
function anthropicToOpenAI(event, data) {
  if (event === "content_block_delta" && data.delta?.text) {
    return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta.text } }] })}\n\n`;
  }
  if (event === "message_stop") {
    return "data: [DONE]\n\n";
  }
  return null;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders() });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: corsHeaders() });

  try {
    const { model, messages, max_tokens, system, stream } = await req.json();
    if (!model || !messages) return new Response(JSON.stringify({ error: "model, messages 필수" }), { status: 400, headers: corsHeaders() });

    const anthropicModel = ANTHROPIC_MODEL_MAP[model];

    // Anthropic 직접 호출
    if (anthropicModel && ANTHROPIC_KEY) {
      const anthropicMessages = toAnthropicMessages(messages);
      const body = {
        model: anthropicModel,
        max_tokens: max_tokens || 4000,
        messages: anthropicMessages,
      };
      if (system) body.system = system;
      if (stream) body.stream = true;

      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Anthropic 실패 시 OpenRouter 폴백
        if (OR_KEY) return fallbackToOpenRouter(model, messages, max_tokens, system, stream);
        return new Response(JSON.stringify({ error: `Anthropic 오류: ${errText.slice(0, 200)}` }), { status: res.status, headers: corsHeaders() });
      }

      if (stream) {
        // Anthropic SSE → OpenAI SSE 변환 (TransformStream 사용)
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        (async () => {
          const reader = res.body.getReader();
          let buf = "";
          let currentEvent = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop();
              for (const line of lines) {
                if (line.startsWith("event: ")) {
                  currentEvent = line.slice(7).trim();
                } else if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (currentEvent === "content_block_delta" && data.delta?.text) {
                      await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta.text } }] })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
          } catch {} finally {
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            await writer.close();
          }
        })();
        return new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...corsHeaders() } });
      } else {
        // 비스트리밍
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        return new Response(JSON.stringify({
          choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
          usage: { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
        }), { headers: { "Content-Type": "application/json", ...corsHeaders() } });
      }
    }

    // OpenRouter 폴백
    return fallbackToOpenRouter(model, messages, max_tokens, system, stream);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "서버 오류" }), { status: 500, headers: corsHeaders() });
  }
}

async function fallbackToOpenRouter(model, messages, max_tokens, system, stream) {
  if (!OR_KEY) return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: corsHeaders() });
  const orModel = OR_MODEL_MAP[model] || (model.includes("/") ? model : `anthropic/${model}`);
  const body = { model: orModel, max_tokens: max_tokens || 2000, messages };
  if (system) body.system = system;
  if (stream) body.stream = true;
  const orRes = await fetch(OR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OR_KEY}`, "HTTP-Referer": "https://snsmakeit.com", "X-Title": "SNS Makeit" },
    body: JSON.stringify(body),
  });
  if (!orRes.ok) {
    const errText = await orRes.text().catch(() => "");
    return new Response(JSON.stringify({ error: `AI API 오류: ${errText.slice(0, 200)}` }), { status: orRes.status, headers: corsHeaders() });
  }
  if (stream) return new Response(orRes.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...corsHeaders() } });
  const data = await orRes.json();
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders() } });
}
