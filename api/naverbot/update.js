module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  return res.status(200).json({
    ok: true,
    version: process.env.NAVERBOT_LATEST_VERSION || "0.1.8",
    download_url: process.env.NAVERBOT_DOWNLOAD_URL || "https://snsmakeit.com/pricing",
    notes: process.env.NAVERBOT_UPDATE_NOTES || "새 버전이 준비되었습니다. 최신 설치 파일을 다운로드해 업데이트하세요.",
    required: String(process.env.NAVERBOT_UPDATE_REQUIRED || "").toLowerCase() === "true",
  });
};
