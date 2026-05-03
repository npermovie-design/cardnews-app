const { getDriveText, listDriveFiles } = require("./_drive");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const body = req.body || {};
    if (body.action === "list") {
      const files = await listDriveFiles(
        String(body.folder || ""),
        Boolean(body.recursive),
        Math.min(Math.max(Number(body.limit || 30), 1), 500),
        Boolean(body.include_folders || body.includeFolders),
      );
      return res.status(200).json({ ok: true, files });
    }

    if (body.action === "text") {
      const fileId = String(body.file_id || "");
      if (!fileId) return res.status(400).json({ ok: false, error: "file_id 필수" });
      const text = await getDriveText(fileId, String(body.mime_type || ""));
      return res.status(200).json({ ok: true, text });
    }

    return res.status(400).json({ ok: false, error: "지원하지 않는 action" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : "Drive 처리 실패" });
  }
};
