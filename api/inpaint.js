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

  const { image, mask } = req.body;
  if (!image || !mask) {
    return res.status(400).json({ error: "image와 mask가 필요합니다" });
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
        version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
        input: {
          image,
          mask,
          prompt:              "seamless background texture, clean image, no watermark, no logo",
          negative_prompt:     "watermark, logo, text, mark, symbol, sparkle, star",
          num_inference_steps: 20,
          guidance_scale:      8,
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
