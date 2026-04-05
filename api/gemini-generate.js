// Gemini API 직접 호출 — 이미지 비전 분석 지원
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

  try {
    const { prompt, maxTokens, imageBase64, imageMimeType } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt 필수" });

    const model = imageBase64 ? "gemini-2.0-flash" : "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const genConfig = {
      maxOutputTokens: maxTokens || 8000,
      temperature: 0.9,
    };

    // 이미지가 있으면 멀티모달 요청
    const parts = [];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: imageMimeType || "image/jpeg", data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const body = {
      contents: [{ parts }],
      generationConfig: genConfig,
    };

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text().catch(() => "");
      return res.status(geminiRes.status).json({ error: `Gemini 오류 ${geminiRes.status}: ${err.slice(0, 200)}` });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
