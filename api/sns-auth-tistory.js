// 티스토리 OAuth 연동 API
// 환경변수 필요: TISTORY_CLIENT_ID, TISTORY_CLIENT_SECRET, TISTORY_REDIRECT_URI
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const CLIENT_ID = process.env.TISTORY_CLIENT_ID;
  const CLIENT_SECRET = process.env.TISTORY_CLIENT_SECRET;
  const REDIRECT_URI = process.env.TISTORY_REDIRECT_URI || "https://www.snsmakeit.com/api/sns-auth-tistory";

  // GET: OAuth 인증 URL 반환 또는 콜백 처리
  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 (code가 있으면 토큰 교환)
    if (code) {
      try {
        const tokenRes = await fetch("https://www.tistory.com/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code,
            grant_type: "authorization_code",
          }),
        });
        const tokenText = await tokenRes.text();
        // 티스토리는 access_token=xxx 형태로 반환
        const accessToken = new URLSearchParams(tokenText).get("access_token");
        if (!accessToken) throw new Error("토큰 발급 실패: " + tokenText);

        // 블로그 정보 가져오기
        const blogRes = await fetch(`https://www.tistory.com/apis/blog/info?access_token=${accessToken}&output=json`);
        const blogData = await blogRes.json();
        const blog = blogData?.tistory?.item?.blogs?.[0];

        // state에서 uid 추출
        const uid = state;
        if (!uid) throw new Error("사용자 정보 없음");

        // Supabase에 저장
        await supabase.from("sns_connections").upsert({
          uid,
          platform: "tistory",
          access_token: accessToken,
          platform_username: blog?.title || "",
          blog_name: blog?.name || "",
          metadata: { blogUrl: blog?.url || "" },
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        // 성공 페이지로 리다이렉트
        return res.redirect(302, "/ai/blog_write?sns_connected=tistory");
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!CLIENT_ID) return res.status(500).json({ error: "TISTORY_CLIENT_ID 환경변수 미설정" });
    const uid = req.query.uid;
    const authUrl = `https://www.tistory.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${uid}`;
    return res.status(200).json({ authUrl });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
