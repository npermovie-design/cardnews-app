// Meta(Instagram/Threads) OAuth 연동 API
// 환경변수 필요: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;
  const REDIRECT_URI = process.env.META_REDIRECT_URI || "https://www.snsmakeit.com/api/sns-auth-meta";

  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 처리
    if (code) {
      const [uid, platform] = (state || "").split(":");
      if (!uid) return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent("사용자 정보 없음"));

      try {
        let accessToken = "";
        let platformUserId = "";
        let platformUsername = "";
        let expiresAt = null;

        if (platform === "threads") {
          // ── Threads OAuth: graph.threads.net 사용 ────────────────
          // 1) Short-lived token 교환
          const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: APP_ID,
              client_secret: APP_SECRET,
              grant_type: "authorization_code",
              redirect_uri: REDIRECT_URI,
              code,
            }),
          });
          const tokenData = await tokenRes.json();
          if (!tokenData.access_token) {
            throw new Error("토큰 발급 실패: " + JSON.stringify(tokenData));
          }

          // 2) Long-lived token 교환
          const longRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${tokenData.access_token}`);
          const longData = await longRes.json();
          accessToken = longData.access_token || tokenData.access_token;
          if (longData.expires_in) {
            expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
          }

          // 3) 사용자 정보
          const userRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`);
          const userData = await userRes.json();
          platformUserId = userData.id || tokenData.user_id || "";
          platformUsername = userData.username || "";

        } else {
          // ── Instagram OAuth: graph.facebook.com 사용 ────────────────
          const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`);
          const tokenData = await tokenRes.json();
          if (!tokenData.access_token) throw new Error("토큰 발급 실패");

          const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
          const longData = await longRes.json();
          accessToken = longData.access_token || tokenData.access_token;
          if (longData.expires_in) {
            expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
          }

          // Instagram 사용자 정보
          const userRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
          const userData = await userRes.json();
          platformUserId = userData.id || "";
          platformUsername = userData.name || "";
        }

        // Supabase에 저장
        const { error: dbError } = await supabase.from("sns_connections").upsert({
          uid,
          platform: platform || "threads",
          access_token: accessToken,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        if (dbError) throw new Error("DB 저장 실패: " + dbError.message);

        return res.redirect(302, `/ai/blog_write?sns_connected=${platform || "threads"}`);
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!APP_ID) return res.status(500).json({ error: "META_APP_ID 환경변수 미설정" });
    const { uid, platform = "threads" } = req.query;
    const scopes = platform === "threads"
      ? "threads_basic,threads_content_publish"
      : "instagram_basic,instagram_content_publish,pages_read_engagement";
    const authUrl = platform === "threads"
      ? `https://threads.net/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${uid}:${platform}`
      : `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${uid}:${platform}`;
    return res.status(200).json({ authUrl });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
