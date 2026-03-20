// OpenRouter API client — central wrapper for all AI calls
const OR_KEY = "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";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const OR_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${OR_KEY}`,
  "HTTP-Referer": "https://snsmakeit.com",
  "X-Title": "SNS Makeit",
};

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

// Convert Anthropic vision format → OpenAI image_url format
function convertMessages(messages) {
  return messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg;
    const content = msg.content.map((part) => {
      if (part.type === "image" && part.source) {
        const { media_type, data } = part.source;
        return {
          type: "image_url",
          image_url: { url: `data:${media_type};base64,${data}` },
        };
      }
      return part;
    });
    return { ...msg, content };
  });
}

/**
 * Non-streaming AI call. Returns the text response.
 */
export async function callAI(model, messages, maxTokens = 2000, system = null) {
  const body = {
    model: orModel(model),
    max_tokens: maxTokens,
    messages: convertMessages(messages),
  };
  if (system) body.system = system;

  const res = await fetch(OR_URL, {
    method: "POST",
    headers: OR_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`AI API 오류 ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Streaming AI call. Calls onChunk(text) for each chunk, returns full text.
 */
export async function callAIStream(model, messages, maxTokens = 4000, onChunk, system = null) {
  const body = {
    model: orModel(model),
    max_tokens: maxTokens,
    stream: true,
    messages: convertMessages(messages),
  };
  if (system) body.system = system;

  const res = await fetch(OR_URL, {
    method: "POST",
    headers: OR_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`AI API 오류 ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const d = line.slice(6).trim();
        if (d === "[DONE]") continue;
        try {
          const p = JSON.parse(d);
          const chunk = p.choices?.[0]?.delta?.content;
          if (chunk) {
            full += chunk;
            onChunk(full, chunk);
          }
        } catch {}
      }
    }
  }
  return full;
}

/**
 * Convenience wrapper: single user prompt → text response.
 */
export async function callClaude(prompt, maxTokens = 2000, model = "claude-sonnet-4-5") {
  return callAI(model, [{ role: "user", content: prompt }], maxTokens);
}
