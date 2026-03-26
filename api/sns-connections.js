// SNS 연결 관리 API — 목록 조회 / 연결 해제
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const uid = req.query.uid || req.body?.uid;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  // GET: 연결된 플랫폼 목록
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("sns_connections")
      .select("platform, platform_username, blog_name, connected_at, metadata")
      .eq("uid", uid);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ connections: data || [] });
  }

  // DELETE: 연결 해제
  if (req.method === "DELETE") {
    const platform = req.query.platform || req.body?.platform;
    if (!platform) return res.status(400).json({ error: "platform 필수" });
    const { error } = await supabase
      .from("sns_connections")
      .delete()
      .eq("uid", uid)
      .eq("platform", platform);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
