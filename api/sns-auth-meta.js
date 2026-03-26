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
      try {
        // 1) Short-lived token 교환
        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`);
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("토큰 발급 실패");

        // 2) Long-lived token 교환
        const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
        const longData = await longRes.json();
        const accessToken = longData.access_token || tokenData.access_token;

        // 3) Threads 사용자 정보
        const userRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`);
        const userData = await userRes.json();

        // state에서 uid+platform 추출 (uid:threads 형태)
        const [uid, platform] = (state || "").split(":");
        if (!uid) throw new Error("사용자 정보 없음");

        await supabase.from("sns_connections").upsert({
          uid,
          platform: platform || "threads",
          access_token: accessToken,
          platform_user_id: userData.id || "",
          platform_username: userData.username || "",
          token_expires_at: longData.expires_in ? new Date(Date.now() + longData.expires_in * 1000).toISOString() : null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

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
