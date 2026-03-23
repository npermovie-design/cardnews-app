// api/generate-image.js
// Gemini 이미지 생성 API — 2025 최신 모델 자동 fallback

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY가 설정되지 않았습니다." });

  const { prompt, productImageB64, productImageMime, refImageB64, refImageMime, aspectRatio } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt 필요" });

  // ── 방법 1: Gemini generateContent (이미지 생성 가능 모델) ──
  const MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ];

  const parts = [];
  if (productImageB64 && productImageMime) {
    parts.push({ inline_data: { mime_type: productImageMime, data: productImageB64 } });
  }
  if (refImageB64 && refImageMime) {
    parts.push({ inline_data: { mime_type: refImageMime, data: refImageB64 } });
  }
  parts.push({ text: prompt });

  let lastError = "";
  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        lastError = `${model}: ${err.error?.message || response.status}`;
        if ([400, 403, 404, 429].includes(response.status)) continue;
        return res.status(response.status).json({ error: lastError });
      }

      const data = await response.json();
      const partsOut = data.candidates?.[0]?.content?.parts || [];
      const imagePart = partsOut.find(p => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart?.inlineData?.data) {
        const textPart = partsOut.find(p => p.text);
        lastError = `${model}: 이미지 없음` + (textPart ? ` (${textPart.text.slice(0, 100)})` : "");
        continue;
      }

      return res.status(200).json({
        image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
        model,
      });
    } catch (e) {
      lastError = `${model}: ${e.message}`;
    }
  }

  // ── 방법 2: Imagen 4 (텍스트→이미지 전용) ──
  const IMAGEN_MODELS = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
  ];

  for (const imgModel of IMAGEN_MODELS) {
    try {
      const imagenRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: prompt.slice(0, 1000) }],
            parameters: { sampleCount: 1, aspectRatio: aspectRatio || "1:1" },
          }),
        }
      );
      if (imagenRes.ok) {
        const imagenData = await imagenRes.json();
        const b64 = imagenData.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          return res.status(200).json({
            image: `data:image/png;base64,${b64}`,
            model: imgModel,
          });
        }
      }
      const imagenErr = await imagenRes.json().catch(() => ({}));
      lastError += ` | ${imgModel}: ${imagenErr.error?.message || imagenRes.status}`;
    } catch (e) {
      lastError += ` | ${imgModel}: ${e.message}`;
    }
  }

  return res.status(500).json({ error: `이미지 생성 실패: ${lastError}` });
}
