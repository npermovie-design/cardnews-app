// api/whisper.js — 음성 파일 → 텍스트 변환 (OpenAI Whisper / Groq Whisper)
// Vercel Serverless Function: bodyParser 비활성화로 대용량 파일 처리

export const config = {
  api: { bodyParser: false },
};

// 멀티파트 파싱 (간단 구현)
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) { reject(new Error("No boundary")); return; }
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
      resolve({ fields, fileData, fileName });
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  const allowed = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { fields, fileData, fileName } = await parseMultipart(req);

    if (!fileData || fileData.length === 0) {
      return res.status(400).json({ error: "음성 파일이 없습니다" });
    }

    // 파일 크기 체크 (25MB = OpenAI Whisper 제한)
    if (fileData.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: "파일 크기는 25MB 이하여야 합니다" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    // 방법 1: OpenAI API 직접 호출 (OPENAI_API_KEY가 있을 때)
    if (OPENAI_KEY) {
      const FormData = (await import("undici")).FormData;
      const { Blob } = (await import("buffer"));
      const form = new FormData();
      form.append("file", new Blob([fileData]), fileName || "audio.mp3");
      form.append("model", "whisper-1");
      form.append("language", fields.language || "ko");
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

    // 방법 2: Groq Whisper (무료, 빠름) — GROQ_API_KEY
    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (GROQ_KEY) {
      const FormData = (await import("undici")).FormData;
      const { Blob } = (await import("buffer"));
      const form = new FormData();
      form.append("file", new Blob([fileData]), fileName || "audio.mp3");
      form.append("model", "whisper-large-v3");
      form.append("language", fields.language || "ko");
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
