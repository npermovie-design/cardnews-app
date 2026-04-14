// 앱 버전 체크 API — 구버전 강제 업데이트
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const MIN_VERSION = "0.1.1"; // 이 값을 올리면 구버전 차단
  const DOWNLOAD_URL = "https://snsmakeit.com/automation";

  const clientVersion = req.query?.v || req.body?.version || "0.0.0";

  const isOk = compareVersions(clientVersion, MIN_VERSION) >= 0;

  return res.status(200).json({
    ok: isOk,
    min_version: MIN_VERSION,
    client_version: clientVersion,
    download_url: DOWNLOAD_URL,
    message: isOk ? "" : `v${MIN_VERSION} 이상으로 업데이트가 필요합니다.`,
  });
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
