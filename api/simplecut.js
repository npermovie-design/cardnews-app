// api/simplecut.js — MakeIt SimpleCut 이메일 확인 API
// POST /api/simplecut?action=check-email

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.body?.action || "check-email";

  if (action === "check-email") {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ exists: false, message: "이메일을 입력하세요" });

    try {
      // users 테이블에서 이메일 확인
      const { data, error } = await supabase
        .from("users")
        .select("email, nick")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        return res.status(500).json({ exists: false, message: "서버 오류" });
      }

      if (data) {
        return res.status(200).json({ exists: true, nick: data.nick });
      } else {
        return res.status(200).json({ exists: false, message: "등록되지 않은 이메일입니다. 회원가입을 먼저 해주세요." });
      }
    } catch (e) {
      return res.status(500).json({ exists: false, message: "서버 오류: " + e.message });
    }
  }

  return res.status(400).json({ error: "unknown action" });
}
