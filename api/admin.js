// api/admin.js — 관리자 전용 API (service_role 키로 RLS 우회)
import { createClient } from "@supabase/supabase-js";

function setCors(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  const isAllowed = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;
  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: "서버 설정 오류" });

  // ── 인증: 요청자가 admin인지 확인 ──
  const authUid = req.query.admin_uid || req.headers["x-admin-uid"] || "";
  if (!authUid) return res.status(403).json({ error: "관리자 인증 필요" });
  const { data: adminCheck } = await sb.from("users").select("role").eq("uid", authUid).single();
  if (!adminCheck || adminCheck.role !== "admin") {
    return res.status(403).json({ error: "관리자 권한 필요" });
  }

  try {
    // ── 전체 회원 목록 ──
    if (action === "members") {
      let allMembers = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await sb.from("users").select("*").range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allMembers = allMembers.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return res.status(200).json({ members: allMembers, total: allMembers.length });
    }

    // ── 포인트 수정 ──
    if (action === "update_points") {
      const { uid: targetUid, points } = req.query;
      if (!targetUid || points === undefined) return res.status(400).json({ error: "uid, points 필요" });
      const { error } = await sb.from("users").update({ points: Number(points) }).eq("uid", targetUid);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── 회원 삭제 ──
    if (action === "delete_member") {
      const targetUid = req.query.target_uid;
      if (!targetUid) return res.status(400).json({ error: "target_uid 필요" });
      const { error } = await sb.from("users").delete().eq("uid", targetUid);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── AI 사용 로그 ──
    if (action === "ai_logs") {
      const { data, error } = await sb.from("point_history").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return res.status(200).json({ logs: data || [] });
    }

    // ── 일별 신규 가입자 (7일) ──
    if (action === "daily_signups") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await sb.from("users").select("join_date,created_at").gte("join_date", since);
      return res.status(200).json({ data: data || [] });
    }

    // ── 일별 AI 사용량 (7일) ──
    if (action === "daily_ai") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await sb.from("point_history").select("created_at").lt("delta", 0).gte("created_at", since);
      return res.status(200).json({ data: data || [] });
    }

    // ── 온라인 카운트 ──
    if (action === "online_count") {
      const { count } = await sb.from("online_users").select("*", { count: "exact", head: true });
      return res.status(200).json({ count: count || 0 });
    }

    return res.status(400).json({ error: "알 수 없는 action" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}
