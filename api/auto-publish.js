// Vercel → Render 프록시: 네이버 블로그 자동 발행

const RENDER_URL = process.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

function setCors(req, res) {
  const origin = req.headers?.origin || "";
  res.setHeader("Access-Control-Allow-Origin",
    origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost")
      ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, platform, naverId, naverPw, blogId, post } = req.body || {};

  if (!action) return res.status(400).json({ error: "action 필요" });

  try {
    if (action === "test-publish" || action === "publish") {
      if (platform === "naver_blog") {
        // Render 서버로 프록시
        const resp = await fetch(`${RENDER_URL}/naver-publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ naverId, naverPw, blogId, post }),
        });
        const result = await resp.json();
        return res.status(200).json(result);
      }
      return res.status(400).json({ error: `미지원 플랫폼: ${platform}` });
    }

    return res.status(400).json({ error: `알 수 없는 action: ${action}` });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || "서버 오류" });
  }
}
