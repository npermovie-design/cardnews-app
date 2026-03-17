// api/generate-image.js
// Nano Banana - 모델 자동 fallback + 상품 이미지 참조 지원

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({
    error: "GEMINI_API_KEY가 Vercel 환경변수에 설정되지 않았습니다. Vercel → Settings → Environment Variables에 추가하세요."
  });

  const { prompt, productImageB64, productImageMime } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt 필요" });

  // 시도할 모델 목록 (최신순)
  const MODELS = [
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
    "gemini-2.5-flash-image-preview",
  ];

  // 요청 파트 구성
  const parts = [];

  // 상품 이미지가 있으면 참조 이미지로 포함
  if (productImageB64 && productImageMime) {
    parts.push({
      inline_data: {
        mime_type: productImageMime,
        data: productImageB64,
      }
    });
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
        // 404 = 모델 없음 → 다음 모델 시도
        if (response.status === 404 || response.status === 400) continue;
        // 다른 오류는 바로 반환
        return res.status(response.status).json({ error: lastError });
      }

      const data = await response.json();
      const parts_out = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts_out.find(p => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart?.inlineData?.data) {
        const textPart = parts_out.find(p => p.text);
        lastError = `${model}: 이미지 없음` + (textPart ? ` (${textPart.text.slice(0,100)})` : "");
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

  return res.status(500).json({ error: `모든 모델 실패: ${lastError}` });
}
