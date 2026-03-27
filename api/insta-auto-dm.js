// 인스타그램 자동 DM 캠페인 관리 API
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: "action 필수" });
    }

    switch (action) {
      case "list_campaigns":
        return await listCampaigns(req, res);
      case "create_campaign":
        return await createCampaign(req, res);
      case "update_campaign":
        return await updateCampaign(req, res);
      case "delete_campaign":
        return await deleteCampaign(req, res);
      case "toggle_campaign":
        return await toggleCampaign(req, res);
      case "generate_dm":
        return await generateDm(req, res);
      case "list_logs":
        return await listLogs(req, res);
      default:
        return res.status(400).json({ error: `알 수 없는 action: ${action}` });
    }
  } catch (err) {
    console.error("insta-auto-dm error:", err);
    return res.status(500).json({ error: err.message || "서버 오류" });
  }
}

// ── 캠페인 목록 조회 ──
async function listCampaigns(req, res) {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  const { data, error } = await supabase
    .from("insta_dm_campaigns")
    .select("*")
    .eq("uid", uid)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaigns: data || [] });
}

// ── 캠페인 생성 ──
async function createCampaign(req, res) {
  const { uid, campaign } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaign) return res.status(400).json({ error: "campaign 필수" });

  const {
    name,
    postUrl,
    triggerKeywords,
    dmMessageFollower,
    dmMessageNonFollower,
    dmLink,
    isActive,
  } = campaign;

  if (!name) return res.status(400).json({ error: "캠페인 이름 필수" });

  const { data, error } = await supabase
    .from("insta_dm_campaigns")
    .insert({
      uid,
      name,
      post_url: postUrl || null,
      trigger_keywords: triggerKeywords || [],
      dm_message_follower: dmMessageFollower || "",
      dm_message_non_follower: dmMessageNonFollower || "",
      dm_link: dmLink || null,
      is_active: isActive ?? true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}

// ── 캠페인 수정 ──
async function updateCampaign(req, res) {
  const { uid, campaignId, updates } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "updates 필수" });
  }

  // camelCase → snake_case 변환
  const mapped = {};
  const keyMap = {
    name: "name",
    postUrl: "post_url",
    triggerKeywords: "trigger_keywords",
    dmMessageFollower: "dm_message_follower",
    dmMessageNonFollower: "dm_message_non_follower",
    dmLink: "dm_link",
    isActive: "is_active",
  };

  for (const [key, value] of Object.entries(updates)) {
    const col = keyMap[key] || key;
    mapped[col] = value;
  }
  mapped.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("insta_dm_campaigns")
    .update(mapped)
    .eq("id", campaignId)
    .eq("uid", uid)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}

// ── 캠페인 삭제 ──
async function deleteCampaign(req, res) {
  const { uid, campaignId } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });

  const { error } = await supabase
    .from("insta_dm_campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("uid", uid);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

// ── 캠페인 활성/비활성 토글 ──
async function toggleCampaign(req, res) {
  const { uid, campaignId, isActive } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive (boolean) 필수" });
  }

  const { data, error } = await supabase
    .from("insta_dm_campaigns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("uid", uid)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}

// ── AI DM 메시지 생성 ──
async function generateDm(req, res) {
  const { category, tone, goal } = req.body;
  if (!category || !tone || !goal) {
    return res.status(400).json({ error: "category, tone, goal 필수" });
  }

  const prompt = `당신은 인스타그램 마케팅 전문가입니다.
아래 조건에 맞는 자동 DM 메시지 템플릿 2개를 JSON으로 생성해주세요.

- 카테고리: ${category}
- 톤앤매너: ${tone}
- 목표: ${goal}

JSON 형식 (반드시 이 형식만 출력):
{
  "followerMessage": "팔로워에게 보낼 DM 메시지",
  "nonFollowerMessage": "비팔로워에게 보낼 DM 메시지"
}

팔로워 메시지는 친근하고 감사한 톤으로, 비팔로워 메시지는 흥미를 유발하면서 팔로우를 유도하는 톤으로 작성해주세요.
이모지를 적절히 활용하고, 각 메시지는 300자 이내로 작성해주세요.`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenRouter error:", errText);
    return res.status(502).json({ error: "AI 메시지 생성 실패" });
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";

  // JSON 파싱 (코드블록 제거 후)
  const jsonStr = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return res.status(200).json({
      followerMessage: parsed.followerMessage || "",
      nonFollowerMessage: parsed.nonFollowerMessage || "",
    });
  } catch {
    // JSON 파싱 실패 시 원본 텍스트 반환
    return res.status(200).json({
      followerMessage: content,
      nonFollowerMessage: "",
      raw: true,
    });
  }
}

// ── DM 발송 로그 조회 ──
async function listLogs(req, res) {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  const { data, error } = await supabase
    .from("insta_dm_log")
    .select("*")
    .eq("uid", uid)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ logs: data || [] });
}
