// api/generate-image.js
// Gemini Imagen 3 - 슬라이드 전체 이미지 생성

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY 미설정" });

  const { prompt, aspectRatio = "1:1" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt 필요" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
            safetySetting: "block_only_high",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `Imagen 오류 (${response.status})`,
      });
    }

    const data = await response.json();
    const imageB64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!imageB64) return res.status(500).json({ error: "이미지 결과 없음" });

    return res.status(200).json({ image: `data:image/png;base64,${imageB64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
