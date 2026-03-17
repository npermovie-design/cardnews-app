// api/inpaint.js - LaMa 모델 사용 (NSFW 없음, 워터마크 제거 특화)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용됩니다" });

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "서버 API 키가 설정되지 않았습니다" });

  const { image, mask } = req.body;
  if (!image || !mask) return res.status(400).json({ error: "image와 mask가 필요합니다" });

  try {
    // LaMa (Large Mask inpainting) - NSFW 없음, 워터마크/로고 제거 특화
    // 주변 배경 패턴을 학습해서 자연스럽게 채움
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "627d830d60900aeb676fae6c1e28d649d39e0d6e23715f56e3027aa90ea9c53b",
        input: { image, mask },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      // 429 Rate limit 처리
      if (createRes.status === 429) {
        return res.status(429).json({ error: "rate_limit", detail: err.detail || "" });
      }
      return res.status(createRes.status).json({ error: err.detail || "Replicate 요청 실패" });
    }

    const prediction = await createRes.json();
    const pollUrl    = `https://api.replicate.com/v1/predictions/${prediction.id}`;

    // 폴링 (최대 60초 - LaMa는 SD보다 훨씬 빠름)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { "Authorization": `Token ${apiKey}` },
      });
      const poll = await pollRes.json();
      if (poll.status === "succeeded") {
        const output = Array.isArray(poll.output) ? poll.output[0] : poll.output;
        return res.status(200).json({ output });
      }
      if (poll.status === "failed") {
        return res.status(500).json({ error: poll.error || "처리 실패" });
      }
    }
    return res.status(504).json({ error: "시간 초과 (60초)" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
