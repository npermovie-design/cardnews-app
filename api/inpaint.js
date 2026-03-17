// api/inpaint.js
// Vercel 서버리스 함수 - API 키를 서버에서만 관리

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다" });
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버 API 키가 설정되지 않았습니다" });
  }

  const { image, mask, width, height } = req.body;
  if (!image) {
    return res.status(400).json({ error: "image가 필요합니다" });
  }

  // mask가 없으면 Gemini 고정 위치로 자동 생성
  let finalMask = mask;
  if (!finalMask && width && height) {
    finalMask = buildGeminiMask(width, height);
  }
  if (!finalMask) {
    return res.status(400).json({ error: "mask 또는 width/height가 필요합니다" });
  }

  try {
    // 1. Replicate 예측 생성
    // stability-ai/stable-diffusion-inpainting 최신 버전
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // kandinsky-2-inpainting: NSFW 필터 없음, 빠름, 고품질
        version: "c109cc9a2b5f3c988ac7b4f4c40f74cfe51d12e3a9d21dce4cf62cf9244fd93f",
        input: {
          image,
          mask:                finalMask,
          prompt:              "clean background, seamless texture, high quality",
          negative_prompt:     "watermark, text, logo, symbol, blurry",
          num_inference_steps: 75,
          guidance_scale:      4,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return res.status(createRes.status).json({ error: err.detail || "Replicate 요청 실패" });
    }

    const prediction = await createRes.json();
    const pollUrl    = `https://api.replicate.com/v1/predictions/${prediction.id}`;

    // 2. 폴링 (최대 120초)
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes  = await fetch(pollUrl, {
        headers: { "Authorization": `Token ${apiKey}` },
      });
      const poll = await pollRes.json();

      if (poll.status === "succeeded") {
        const output = Array.isArray(poll.output) ? poll.output[0] : poll.output;
        return res.status(200).json({ output });
      }
      if (poll.status === "failed") {
        return res.status(500).json({ error: poll.error || "AI 처리 실패" });
      }
    }

    return res.status(504).json({ error: "시간 초과 (120초)" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
