// NaverBot SaaS - 메이킷 계정 로그인 + 구독 상태 확인
// 별도 라이선스 키 발급 없이, 메이킷 월/연간 구독자가 바로 사용 가능

import { setCors, safeError, supabase, verifyMakeitAccount } from "../../lib/naverbot/index.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return safeError(res, 405, "POST only");

  const { email, password, access_token } = req.body || {};

  if (!access_token && (!email || !password)) {
    return safeError(res, 400, "인증 정보 필요");
  }
  if ((email && email.length > 200) || (password && password.length > 200) || (access_token && access_token.length > 4000)) {
    return safeError(res, 400, "잘못된 요청");
  }

  try {
    const result = await verifyMakeitAccount({ email, password, accessToken: access_token });
    if (!result.ok) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    // 닉네임 추가 조회
    const { data: userRow } = await supabase
      .from("users")
      .select("nick, role")
      .eq("uid", result.uid)
      .maybeSingle();

    // trial 사용량 조회 (구독 없는 경우 5회 카운트)
    let trialUsed = 0;
    let trialLimit = 5;
    if (result.trial) {
      const { count } = await supabase
        .from("naverbot_posts_log")
        .select("id", { count: "exact", head: true })
        .eq("license_key", result.uid);
      trialUsed = count ?? 0;
    }

    return res.status(200).json({
      valid: true,
      user: {
        uid: result.uid,
        email: result.email,
        nick: userRow?.nick || "",
        role: userRow?.role || "member",
      },
      plan: result.plan,
      trial: result.trial || false,
      trial_used: trialUsed,
      trial_limit: trialLimit,
      expires_at: result.expires_at,
    });
  } catch (e) {
    return safeError(res, 500, "로그인 처리 실패", e);
  }
}
