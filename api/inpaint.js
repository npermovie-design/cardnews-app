// api/inpaint.js
// advimman/lama - 모델명 엔드포인트 (버전 해시 불필요, 항상 최신)

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
    // 모델명 엔드포인트 → 버전 해시 없이 항상 최신 버전 자동 사용
    const createRes = await fetch(
      "https://api.replicate.com/v1/models/advimman/lama/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Prefer": "wait=30",
        },
        body: JSON.stringify({
          input: { image, mask },
        }),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      if (createRes.status === 429) {
        return res.status(429).json({ error: "rate_limit", detail: err.detail || "" });
      }
      return res.status(createRes.status).json({
        error: err.detail || err.message || `요청 실패 (${createRes.status})`,
      });
    }

    const prediction = await createRes.json();

    // Prefer: wait 로 인해 바로 완료된 경우
    if (prediction.status === "succeeded") {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return res.status(200).json({ output });
    }

    // 폴링 (최대 60초)
    const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { "Authorization": `Bearer ${apiKey}` },
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
