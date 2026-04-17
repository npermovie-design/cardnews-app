// OpenRouter API client — 서버 프록시를 통해 호출 (API 키 보호)
const PROXY_URL = "/api/ai-proxy";

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
  const body = { model, max_tokens: maxTokens, messages: convertMessages(messages) };
  if (system) body.system = system;

  // Web Lock으로 백그라운드 throttling 방지
  const lockName = `ai-call-${Date.now()}`;
  let lockRelease = null;
  if (navigator.locks) {
    navigator.locks.request(lockName, { mode: "exclusive" }, () => {
      return new Promise((resolve) => { lockRelease = resolve; });
    }).catch(() => {});
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      const isAdmin = !!localStorage.getItem("nper_user") && JSON.parse(localStorage.getItem("nper_user") || "{}").role === "admin";
      if (isAdmin) {
        throw new Error(`[관리자] API ${res.status}: ${err.slice(0, 200)}`);
      }
      if (res.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      if (res.status >= 500) throw new Error("AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      throw new Error("AI 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    if (lockRelease) lockRelease();
  }
}

/**
 * Streaming AI call. Calls onChunk(text) for each chunk, returns full text.
 * 탭 비활성화(백그라운드) 시에도 중단되지 않도록 처리.
 */
export async function callAIStream(model, messages, maxTokens = 4000, onChunk, system = null, timeoutMs = 120000) {
  const body = { model, max_tokens: maxTokens, stream: true, messages: convertMessages(messages) };
  if (system) body.system = system;

  // Web Lock으로 브라우저 탭 throttling 방지 (지원 시)
  const lockName = `ai-stream-${Date.now()}`;
  let lockRelease = null;
  if (navigator.locks) {
    navigator.locks.request(lockName, { mode: "exclusive" }, (lock) => {
      return new Promise((resolve) => { lockRelease = resolve; });
    }).catch(() => {});
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      keepalive: false,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      const isAdmin = !!localStorage.getItem("nper_user") && JSON.parse(localStorage.getItem("nper_user") || "{}").role === "admin";
      if (isAdmin) {
        throw new Error(`[관리자] API ${res.status}: ${err.slice(0, 200)}`);
      }
      if (res.status === 429) throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      if (res.status >= 500) throw new Error("AI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      throw new Error("AI 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
  } finally {
    clearTimeout(timeout);
    if (lockRelease) lockRelease();
  }
}

/**
 * Convenience wrapper: single user prompt → text response.
 */
export async function callClaude(prompt, maxTokens = 2000, model = "claude-sonnet-4-5") {
  return callAI(model, [{ role: "user", content: prompt }], maxTokens);
}
