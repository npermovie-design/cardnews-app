// api/generate-image.js
// Nano Banana (Gemini 2.5 Flash Image) 이미지 생성
// - Imagen API(X) → Gemini generateContent API (O)
// - 한국어 프롬프트 네이티브 지원
// - 텍스트를 이미지 안에 직접 렌더링 가능

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY 미설정" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt 필요" });

  try {
    // Nano Banana = gemini-2.5-flash-image 모델
    // generateContent 엔드포인트 사용 (Imagen과 다름)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err.error?.message || `Nano Banana API 오류 (${response.status})`,
      });
    }

    const data = await response.json();

    // 응답에서 이미지 파트 추출
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart?.inlineData?.data) {
      // 이미지 없을 때 텍스트 확인 (오류 메시지일 수 있음)
      const textPart = parts.find(p => p.text);
      return res.status(500).json({
        error: "이미지 생성 결과 없음" + (textPart ? ": " + textPart.text : ""),
      });
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return res.status(200).json({
      image: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
