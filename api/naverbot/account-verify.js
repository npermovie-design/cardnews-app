// NaverBot SaaS - 메이킷 계정 로그인 + 구독 상태 확인
// 별도 라이선스 키 발급 없이, 메이킷 월/연간 구독자가 바로 사용 가능

import { setCors, safeError, supabase, verifyMakeitAccount } from "../../lib/naverbot/index.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return safeError(res, 400, "이메일/비밀번호 필수");
  }
  if (email.length > 200 || password.length > 200) {
    return safeError(res, 400, "잘못된 요청");
  }

  try {
    const result = await verifyMakeitAccount(email, password);
    if (!result.ok) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    // 닉네임 추가 조회
    const { data: userRow } = await supabase
      .from("users")
      .select("nick, role")
      .eq("uid", result.uid)
      .maybeSingle();

    return res.status(200).json({
      valid: true,
      user: {
        uid: result.uid,
        email: result.email,
        nick: userRow?.nick || "",
        role: userRow?.role || "member",
      },
      plan: result.plan,
      expires_at: result.expires_at,
    });
  } catch (e) {
    return safeError(res, 500, "로그인 처리 실패", e);
  }
}
