// api/generate-image.js
// Gemini Imagen 3 이미지 생성 서버리스 함수

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다" });

  const { prompt, aspectRatio = "1:1", negativePrompt = "" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt가 필요합니다" });

  try {
    // Imagen 3 API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{
            prompt,
            ...(negativePrompt ? { negativePrompt } : {}),
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
            safetySetting: "block_only_high",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `Imagen API 오류 (${response.status})`,
      });
    }

    const data = await response.json();
    const imageB64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageB64) {
      return res.status(500).json({ error: "이미지 생성 결과 없음" });
    }

    // base64 PNG 반환
    return res.status(200).json({
      image: `data:image/png;base64,${imageB64}`,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
