// 스레드 게시물 목록 조회 API
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  try {
    // 스레드 연동 정보 조회
    const { data: connections } = await supabase
      .from("sns_connections")
      .select("*")
      .eq("uid", uid)
      .eq("platform", "threads");

    if (!connections?.length) {
      return res.status(200).json({ media: [], error: "스레드 계정이 연동되지 않았습니다." });
    }

    const conn = connections[0];
    const accessToken = conn.access_token;
    const userId = conn.platform_user_id;

    // Threads API로 게시물 목록 조회
    const url = `https://graph.threads.net/v1.0/${userId}/threads?fields=id,media_product_type,media_type,media_url,permalink,text,timestamp,thumbnail_url,shortcode,like_count,reply_audience&limit=25&access_token=${accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Threads API error:", response.status, errData);
      return res.status(200).json({ media: [], error: "스레드 게시물을 불러올 수 없습니다." });
    }

    const data = await response.json();
    const threads = (data.data || []).map(t => ({
      id: t.id,
      media_type: t.media_type || "TEXT",
      media_url: t.media_url || null,
      thumbnail_url: t.thumbnail_url || null,
      permalink: t.permalink || "",
      caption: t.text || "",
      timestamp: t.timestamp,
      like_count: t.like_count ?? null,
      comments_count: null, // Threads API doesn't return this directly
    }));

    return res.status(200).json({ media: threads });
  } catch (err) {
    console.error("threads-media error:", err);
    return res.status(500).json({ error: err.message });
  }
}
