// NaverBot SaaS - 라이선스 검증
// 클라이언트가 앱 시작 시 + 봇 실행 직전 호출

import { setCors, safeError, validateLicenseKey, verifyLicense } from "../../lib/naverbot/index.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { license_key, machine_id } = req.body || {};

  if (!validateLicenseKey(license_key)) {
    return safeError(res, 400, "잘못된 요청");
  }
  if (!machine_id || typeof machine_id !== "string" || machine_id.length > 128) {
    return safeError(res, 400, "잘못된 요청");
  }

  try {
    const result = await verifyLicense({
      licenseKey: license_key,
      machineId: machine_id,
      bindIfFirst: true,
    });

    if (!result.ok) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    return res.status(200).json({
      valid: true,
      plan: result.license.plan,
      expires_at: result.license.expires_at,
    });
  } catch (e) {
    return safeError(res, 500, "검증 실패", e);
  }
}
