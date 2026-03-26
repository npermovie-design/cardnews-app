// api/insta-media.js — 연동된 인스타 계정의 최근 미디어 조회
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  try {
    // 인스타 연동 정보 가져오기
    const { data: conn, error: connErr } = await supabase
      .from("sns_connections")
      .select("access_token, platform_user_id, platform_username")
      .eq("uid", uid)
      .eq("platform", "instagram")
      .single();

    if (connErr || !conn) {
      return res.status(404).json({ error: "인스타그램 연동 정보가 없습니다", connected: false });
    }

    if (!conn.access_token) {
      return res.status(401).json({ error: "액세스 토큰이 만료되었습니다. 다시 연동해주세요.", connected: false });
    }

    // Instagram Graph API로 미디어 조회
    const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink";
    const mediaRes = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=${fields}&limit=20&access_token=${conn.access_token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!mediaRes.ok) {
      const errData = await mediaRes.json().catch(() => ({}));
      // 토큰 만료 체크
      if (mediaRes.status === 401 || errData?.error?.code === 190) {
        return res.status(401).json({ error: "토큰이 만료되었습니다. 다시 연동해주세요.", connected: false });
      }
      return res.status(502).json({ error: "미디어 조회 실패: " + (errData?.error?.message || mediaRes.status) });
    }

    const mediaData = await mediaRes.json();
    const media = (mediaData.data || []).map(m => ({
      id: m.id,
      caption: m.caption || "",
      mediaType: m.media_type,
      mediaUrl: m.media_url || "",
      thumbnailUrl: m.thumbnail_url || m.media_url || "",
      timestamp: m.timestamp,
      likeCount: m.like_count || 0,
      commentsCount: m.comments_count || 0,
      permalink: m.permalink || "",
    }));

    return res.json({
      media,
      username: conn.platform_username,
      userId: conn.platform_user_id,
      connected: true,
    });
  } catch (e) {
    return res.status(500).json({ error: "서버 오류: " + (e.message || "").slice(0, 100) });
  }
}

export const config = { maxDuration: 15 };
