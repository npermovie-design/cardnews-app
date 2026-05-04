// api/ai-proxy.js — 통합 AI 프록시
// ?target= (없으면 기본 Anthropic 프록시)
// ?target=ppt       → AI PPT (Anthropic, Serverless 60초)
// ?target=gemini    → Gemini 생성
// ?target=tts       → Gemini TTS (텍스트→WAV)
// ?target=whisper   → Whisper STT (음성→텍스트)
// ?target=whisper-url → 영상 URL → Whisper STT
// ?target=prepare-lesson → 레슨 자막+번역+더빙 사전 생성

export const config = {
  maxDuration: 120,
  api: { bodyParser: { sizeLimit: "25mb" } },
};

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// ── 공통 CORS ──
import { isAllowedOrigin, rateLimit } from "../lib/security.js";
function setCors(req, res) {
  const origin = req.headers?.origin || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ══════════════════════════════════════════════════════════
// 기본 (target 없음) — Anthropic 프록시 (스트리밍/비스트리밍)
// ══════════════════════════════════════════════════════════

const ANTHROPIC_MODEL_MAP = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5": "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-20250514",
  "gpt-4o": "claude-haiku-4-5-20251001",
  "gpt-4o-mini": "claude-haiku-4-5-20251001",
  "gemini-2.5-flash": "claude-haiku-4-5-20251001",
  "gemini-2.5-pro": "claude-sonnet-4-20250514",
  "gemini-2.0-flash": "claude-haiku-4-5-20251001",
};

function toAnthropicMessages(messages) {
  return messages.filter(msg => msg && typeof msg === "object").map(msg => {
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
        if (p.type === "image" && p.source) return p;
        return { type: "text", text: JSON.stringify(p) };
      });
      return { role: msg.role === "assistant" ? "assistant" : "user", content: parts };
    }
    return msg;
  });
}

// ── IP 기반 rate limit (비회원 AI 호출 남용 방지) ──
const ipCalls = new Map(); // ip → { count, resetAt }
const IP_LIMIT = 20;       // IP당 10분에 20회
const IP_WINDOW = 10 * 60 * 1000;

function checkIpRateLimit(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const now = Date.now();
  const entry = ipCalls.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCalls.set(ip, { count: 1, resetAt: now + IP_WINDOW });
    return null;
  }
  entry.count++;
  if (entry.count > IP_LIMIT) {
    return `요청 한도 초과 (${IP_LIMIT}회/10분). 잠시 후 다시 시도해주세요.`;
  }
  return null;
}

// 메모리 누수 방지: 5분마다 만료된 엔트리 정리
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipCalls) {
    if (now > entry.resetAt) ipCalls.delete(ip);
  }
}, 5 * 60 * 1000);

async function handleDefault(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // IP rate limit 체크
    const rateLimitErr = checkIpRateLimit(req);
    if (rateLimitErr) return res.status(429).json({ error: rateLimitErr });

    const { model, messages, max_tokens, system, stream } = req.body;
    if (!model || !messages) return res.status(400).json({ error: "model, messages 필수" });

    const anthropicModel = ANTHROPIC_MODEL_MAP[model] || "claude-haiku-4-5-20251001";

    if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

    const anthropicMessages = toAnthropicMessages(messages);
    const body = {
      model: anthropicModel,
      max_tokens: max_tokens || 4000,
      messages: anthropicMessages,
    };
    if (system) body.system = system;
    if (stream) body.stream = true;

    const apiRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text().catch(() => "");
      return res.status(apiRes.status).json({ error: `Anthropic 오류: ${errText.slice(0, 200)}` });
    }

    if (stream) {
      // Anthropic SSE → OpenAI SSE 변환
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = apiRes.body.getReader();
      const decoder = new TextDecoder();
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
                  res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: data.delta.text } }] })}\n\n`);
                }
              } catch {}
            }
          }
        }
      } catch {} finally {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } else {
      const data = await apiRes.json();
      const text = data.content?.[0]?.text || "";
      return res.status(200).json({
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
      });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}

// ══════════════════════════════════════════════════════════
// target=ppt — AI PPT 전용 (Anthropic, Serverless)
// ══════════════════════════════════════════════════════════

const PPT_MODEL_MAP = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5": "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-20250514",
};

function resolvePptModel(m) {
  return PPT_MODEL_MAP[m] || "claude-haiku-4-5-20251001";
}

async function handlePpt(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "API key not configured" });

  try {
    const { model, messages, max_tokens, system } = req.body;
    if (!model || !messages) return res.status(400).json({ error: "model, messages 필수" });

    const systemMsg = system || "";
    const filteredMessages = messages.filter(m => m.role !== "system");
    const systemFromMessages = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const finalSystem = [systemMsg, systemFromMessages].filter(Boolean).join("\n");

    const body = {
      model: resolvePptModel(model),
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
    return res.status(200).json({
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}

// ══════════════════════════════════════════════════════════
// target=gemini — Gemini API (이미지 비전 지원)
// ══════════════════════════════════════════════════════════

async function handleGemini(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

  try {
    const { prompt, maxTokens, imageBase64, imageMimeType } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt 필수" });

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const genConfig = {
      maxOutputTokens: maxTokens || 8000,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    };

    const parts = [];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const body = { contents: [{ parts }], generationConfig: genConfig };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 100000);
    const apiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!apiRes.ok) {
      const err = await apiRes.text().catch(() => "");
      return res.status(apiRes.status).json({ error: `Gemini 오류 ${apiRes.status}: ${err.slice(0, 200)}` });
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ══════════════════════════════════════════════════════════
// target=tts — Gemini TTS (텍스트 → WAV 음성)
// ══════════════════════════════════════════════════════════

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function handleTts(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { text, voice = "Kore" } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
    if (text.length > 5000) return res.status(400).json({ error: "text max 5000 chars" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 필요합니다" });

    const ttsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: { voice_name: voice },
              },
            },
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(ttsRes.status).json({ error: `Gemini TTS 실패: ${errText.slice(0, 300)}` });
    }

    const data = await ttsRes.json();
    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      return res.status(500).json({ error: "음성 생성 실패: 오디오 데이터 없음" });
    }

    const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType || "";

    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) sampleRate = parseInt(rateMatch[1]);

    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", wavBuffer.byteLength);
    res.status(200).send(wavBuffer);
  } catch (e) {
    return res.status(500).json({ error: "TTS 처리 실패: " + (e.message || "").slice(0, 200) });
  }
}

// ══════════════════════════════════════════════════════════
// target=whisper — 음성 파일 → 텍스트 변환 (OpenAI/Groq Whisper)
// ══════════════════════════════════════════════════════════

async function handleWhisper(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    // bodyParser가 활성화된 상태 — multipart는 raw buffer로 올 수 있음
    // Content-Type에 따라 분기
    const contentType = req.headers["content-type"] || "";

    let fileData = null;
    let fileName = "";
    let language = "ko";

    if (contentType.includes("multipart/form-data")) {
      // Vercel bodyParser가 multipart를 처리하지 못하면 raw 파싱
      const parsed = await parseMultipartFromReq(req);
      fileData = parsed.fileData;
      fileName = parsed.fileName;
      language = parsed.fields?.language || "ko";
    } else {
      // JSON body fallback: base64 encoded audio
      const { audio_base64, file_name, lang } = req.body || {};
      if (audio_base64) {
        fileData = Buffer.from(audio_base64, "base64");
        fileName = file_name || "audio.mp3";
        language = lang || "ko";
      }
    }

    if (!fileData || fileData.length === 0) {
      return res.status(400).json({ error: "음성 파일이 없습니다" });
    }

    if (fileData.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: "파일 크기는 25MB 이하여야 합니다" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (OPENAI_KEY) {
      const FormData = (await import("undici")).FormData;
      const { Blob } = (await import("buffer"));
      const form = new FormData();
      form.append("file", new Blob([fileData]), fileName || "audio.mp3");
      form.append("model", "whisper-1");
      form.append("language", language);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "segment");

      const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}` },
        body: form,
      });

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        return res.status(whisperRes.status).json({ error: `Whisper API 실패: ${errText.slice(0, 200)}` });
      }

      const data = await whisperRes.json();
      return res.status(200).json(data);
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY) {
      const FormData = (await import("undici")).FormData;
      const { Blob } = (await import("buffer"));
      const form = new FormData();
      form.append("file", new Blob([fileData]), fileName || "audio.mp3");
      form.append("model", "whisper-large-v3");
      form.append("language", language);
      form.append("response_format", "verbose_json");

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}` },
        body: form,
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return res.status(groqRes.status).json({ error: `Groq Whisper 실패: ${errText.slice(0, 200)}` });
      }

      const data = await groqRes.json();
      return res.status(200).json(data);
    }

    return res.status(500).json({ error: "OPENAI_API_KEY 또는 GROQ_API_KEY 환경변수가 필요합니다" });
  } catch (e) {
    return res.status(500).json({ error: "음성 처리 실패: " + (e.message || "").slice(0, 200) });
  }
}

// 멀티파트 파싱 (req가 stream일 때)
async function parseMultipartFromReq(req) {
  return new Promise((resolve, reject) => {
    // bodyParser가 이미 파싱했으면 req.body에 Buffer가 있을 수 있음
    if (req.body && Buffer.isBuffer(req.body)) {
      return resolve(parseMultipartBuffer(req.body, req.headers["content-type"]));
    }
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      resolve(parseMultipartBuffer(buf, req.headers["content-type"]));
    });
    req.on("error", reject);
  });
}

function parseMultipartBuffer(buf, contentType) {
  const boundaryMatch = (contentType || "").match(/boundary=(.+)/);
  if (!boundaryMatch) return { fields: {}, fileData: null, fileName: "" };
  const boundary = boundaryMatch[1];
  const parts = buf.toString("binary").split(`--${boundary}`).filter(p => p.includes("Content-Disposition"));
  const fields = {};
  let fileData = null;
  let fileName = "";
  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const header = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 4).replace(/\r\n$/, "");
    const nameMatch = header.match(/name="([^"]+)"/);
    const fileMatch = header.match(/filename="([^"]+)"/);
    if (nameMatch) {
      if (fileMatch) {
        fileName = fileMatch[1];
        fileData = Buffer.from(body, "binary");
      } else {
        fields[nameMatch[1]] = body;
      }
    }
  }
  return { fields, fileData, fileName };
}

// ══════════════════════════════════════════════════════════
// 라우터
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// target=whisper-url — 영상 URL → 다운로드 → Whisper STT
// ══════════════════════════════════════════════════════════
async function handleWhisperUrl(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { video_url, lang = "ko" } = req.body || {};
    if (!video_url) return res.status(400).json({ error: "video_url 필요" });

    // 영상 파일 다운로드 (25MB 제한)
    const dlRes = await fetch(video_url);
    if (!dlRes.ok) return res.status(400).json({ error: "영상 다운로드 실패: " + dlRes.status });

    const contentLength = parseInt(dlRes.headers.get("content-length") || "0", 10);
    if (contentLength > 25 * 1024 * 1024) {
      return res.status(413).json({ error: "파일이 25MB를 초과합니다. 분할 처리가 필요합니다.", size: contentLength });
    }

    const arrayBuf = await dlRes.arrayBuffer();
    const fileData = Buffer.from(arrayBuf);

    // 파일 확장자 추출
    const urlPath = new URL(video_url).pathname;
    const ext = urlPath.split(".").pop() || "mp4";
    const fileName = `audio.${ext}`;

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    const FormData = (await import("undici")).FormData;
    const { Blob } = (await import("buffer"));
    const form = new FormData();
    form.append("file", new Blob([fileData]), fileName);
    form.append("language", lang);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    let apiUrl, apiKey, model;
    if (OPENAI_KEY) {
      apiUrl = "https://api.openai.com/v1/audio/transcriptions";
      apiKey = OPENAI_KEY;
      model = "whisper-1";
    } else if (GROQ_KEY) {
      apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
      apiKey = GROQ_KEY;
      model = "whisper-large-v3";
    } else {
      return res.status(500).json({ error: "OPENAI_API_KEY 또는 GROQ_API_KEY 필요" });
    }

    form.append("model", model);
    const whisperRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      return res.status(whisperRes.status).json({ error: `Whisper 실패: ${errText.slice(0, 300)}` });
    }

    const data = await whisperRes.json();

    // segments → [{start, end, text}] 변환
    const subtitles = (data.segments || []).map(s => ({
      start: Math.round(s.start * 100) / 100,
      end: Math.round(s.end * 100) / 100,
      text: s.text.trim(),
    }));

    return res.status(200).json({
      text: data.text,
      subtitles,
      language: data.language,
      duration: data.duration,
    });
  } catch (e) {
    return res.status(500).json({ error: "Whisper URL 처리 실패: " + (e.message || "").slice(0, 300) });
  }
}

// ══════════════════════════════════════════════════════════
// target=prepare-lesson — 레슨 1개의 자막+번역+더빙 사전 생성
// POST { lesson_id, video_url, langs: ["en","ja","zh","es","vi"] }
// 1) Whisper STT → ko 자막 → DB 저장
// 2) 각 lang으로 번역 → DB 저장
// 3) 각 lang TTS → Storage 저장
// ══════════════════════════════════════════════════════════
async function handlePrepareLesson(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { lesson_id, video_url, langs = ["en", "ja", "zh", "es", "vi"], step } = req.body || {};
  if (!lesson_id || !video_url) return res.status(400).json({ error: "lesson_id, video_url 필요" });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  try {
    // ── STEP 1: Whisper STT (한국어 자막) ──
    if (!step || step === "stt") {
      // 이미 있으면 건너뛰기
      const { data: existing } = await sb.from("class_subtitles").select("id").eq("lesson_id", lesson_id).eq("lang", "ko").maybeSingle();
      if (!existing) {
        const dlRes = await fetch(video_url);
        if (!dlRes.ok) return res.status(400).json({ error: "영상 다운로드 실패" });
        const buf = Buffer.from(await dlRes.arrayBuffer());
        if (buf.length > 25 * 1024 * 1024) return res.status(413).json({ error: "25MB 초과, 분할 필요" });

        const FormData = (await import("undici")).FormData;
        const { Blob } = (await import("buffer"));
        const form = new FormData();
        const ext = new URL(video_url).pathname.split(".").pop() || "mp4";
        form.append("file", new Blob([buf]), `audio.${ext}`);
        form.append("language", "ko");
        form.append("response_format", "verbose_json");
        form.append("timestamp_granularities[]", "segment");

        let apiUrl, apiKey, model;
        if (OPENAI_KEY) { apiUrl = "https://api.openai.com/v1/audio/transcriptions"; apiKey = OPENAI_KEY; model = "whisper-1"; }
        else if (GROQ_KEY) { apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions"; apiKey = GROQ_KEY; model = "whisper-large-v3"; }
        else return res.status(500).json({ error: "Whisper API 키 없음" });

        form.append("model", model);
        const wRes = await fetch(apiUrl, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}` }, body: form });
        if (!wRes.ok) return res.status(wRes.status).json({ error: "Whisper 실패: " + (await wRes.text()).slice(0, 200) });

        const wData = await wRes.json();
        const koSubs = (wData.segments || []).map(s => ({
          start: Math.round(s.start * 100) / 100,
          end: Math.round(s.end * 100) / 100,
          text: s.text.trim(),
        }));
        await sb.from("class_subtitles").upsert({ lesson_id, lang: "ko", subtitles: koSubs }, { onConflict: "lesson_id,lang" });
      }
      if (step === "stt") return res.status(200).json({ ok: true, step: "stt" });
    }

    // ── STEP 2: 번역 ──
    if (!step || step === "translate") {
      const { data: koRow } = await sb.from("class_subtitles").select("subtitles").eq("lesson_id", lesson_id).eq("lang", "ko").maybeSingle();
      if (!koRow) return res.status(400).json({ error: "한국어 자막 없음. stt 먼저 실행" });
      const koSubs = koRow.subtitles;

      const langNames = { en: "English", ja: "Japanese", zh: "Chinese", es: "Spanish", vi: "Vietnamese" };
      for (const lang of langs) {
        const { data: ex } = await sb.from("class_subtitles").select("id").eq("lesson_id", lesson_id).eq("lang", lang).maybeSingle();
        if (ex) continue;

        const textsStr = koSubs.map(s => s.text).join("\n---\n");
        const tRes = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001", max_tokens: 4000,
            messages: [{ role: "user", content: `다음 한국어 자막들을 ${langNames[lang]}로 번역해. 각 줄을 ---로 구분해서 같은 순서로 번역 결과만 출력해:\n\n${textsStr}` }],
          }),
        });
        if (tRes.ok) {
          const tData = await tRes.json();
          const translated = (tData.content?.[0]?.text || "").split(/\n---\n|\n-{3}\n/);
          const translatedSubs = koSubs.map((s, i) => ({ ...s, text: translated[i]?.trim() || s.text }));
          await sb.from("class_subtitles").upsert({ lesson_id, lang, subtitles: translatedSubs }, { onConflict: "lesson_id,lang" });
        }
      }
      if (step === "translate") return res.status(200).json({ ok: true, step: "translate" });
    }

    // ── STEP 3: TTS 더빙 ──
    if (!step || step === "tts") {
      if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY 필요" });

      const voiceMap = { ko: "Kore", en: "Puck", ja: "Kore", zh: "Kore", es: "Puck", vi: "Kore" };
      const allLangs = ["ko", ...langs];

      for (const lang of allLangs) {
        // 이미 Storage에 있으면 건너뛰기
        const storagePath = `classes/dub_${lesson_id}_${lang}.wav`;
        const { data: exFile } = await sb.storage.from("public-assets").list("classes", { search: `dub_${lesson_id}_${lang}.wav` });
        if (exFile?.length > 0) continue;

        const { data: subRow } = await sb.from("class_subtitles").select("subtitles").eq("lesson_id", lesson_id).eq("lang", lang).maybeSingle();
        if (!subRow) continue;

        const fullText = subRow.subtitles.map(s => s.text).join(". ").slice(0, 4000);
        const ttsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullText }] }],
              generationConfig: {
                response_modalities: ["AUDIO"],
                speech_config: { voice_config: { prebuilt_voice_config: { voice_name: voiceMap[lang] || "Kore" } } },
              },
            }),
          }
        );
        if (!ttsRes.ok) continue;

        const ttsData = await ttsRes.json();
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!audioPart?.inlineData?.data) continue;

        const pcmBuf = Buffer.from(audioPart.inlineData.data, "base64");
        const mimeType = audioPart.inlineData.mimeType || "";
        let sr = 24000;
        const rm = mimeType.match(/rate=(\d+)/);
        if (rm) sr = parseInt(rm[1]);
        const wavBuf = pcmToWav(pcmBuf, sr, 1, 16);

        await sb.storage.from("public-assets").upload(storagePath, wavBuf, { contentType: "audio/wav", upsert: true });
      }
      if (step === "tts") return res.status(200).json({ ok: true, step: "tts" });
    }

    return res.status(200).json({ ok: true, step: "all" });
  } catch (e) {
    return res.status(500).json({ error: "prepare-lesson 실패: " + (e.message || "").slice(0, 300) });
  }
}

const TARGET_MAP = {
  ppt: handlePpt,
  gemini: handleGemini,
  tts: handleTts,
  whisper: handleWhisper,
  "whisper-url": handleWhisperUrl,
  "prepare-lesson": handlePrepareLesson,
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const target = req.query.target;

  if (target && TARGET_MAP[target]) {
    return TARGET_MAP[target](req, res);
  }

  // target 없으면 기본 Anthropic 프록시
  return handleDefault(req, res);
}
