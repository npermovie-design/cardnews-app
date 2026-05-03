const { getDriveMedia } = require("./_drive");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("GET only");

  const fileId = String(req.query.id || "");
  if (!fileId) return res.status(400).send("id 필수");

  try {
    const media = await getDriveMedia(fileId);
    const contentType = media.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await media.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).send(e && e.message ? e.message : "Drive 이미지 처리 실패");
  }
};
