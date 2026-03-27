// 인스타그램 자동 대댓글 캠페인 관리 API
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action } = req.body || {};
    if (!action) return res.status(400).json({ error: "action 필수" });

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
      default:
        return res.status(400).json({ error: `알 수 없는 action: ${action}` });
    }
  } catch (err) {
    console.error("insta-auto-reply error:", err);
    return res.status(500).json({ error: err.message || "서버 오류" });
  }
}

async function listCampaigns(req, res) {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  const { data, error } = await supabase
    .from("insta_reply_campaigns")
    .select("*")
    .eq("uid", uid)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaigns: data || [] });
}

async function createCampaign(req, res) {
  const { uid, campaign } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaign) return res.status(400).json({ error: "campaign 필수" });

  const { name, postUrl, mediaId, triggerKeywords, replyMessage, replyLink, isActive } = campaign;
  if (!name) return res.status(400).json({ error: "캠페인 이름 필수" });

  // 같은 게시물에 기존 규칙이 있으면 업데이트
  if (postUrl) {
    const { data: existing } = await supabase
      .from("insta_reply_campaigns")
      .select("id")
      .eq("uid", uid)
      .eq("post_url", postUrl)
      .limit(1);

    if (existing?.length) {
      const { data, error } = await supabase
        .from("insta_reply_campaigns")
        .update({
          name,
          media_id: mediaId || null,
          trigger_keywords: triggerKeywords || [],
          reply_message: replyMessage || "",
          reply_link: replyLink || null,
          is_active: isActive ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)
        .eq("uid", uid)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ campaign: data });
    }
  }

  const { data, error } = await supabase
    .from("insta_reply_campaigns")
    .insert({
      uid,
      name,
      post_url: postUrl || null,
      media_id: mediaId || null,
      trigger_keywords: triggerKeywords || [],
      reply_message: replyMessage || "",
      reply_link: replyLink || null,
      is_active: isActive ?? true,
      reply_count: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}

async function updateCampaign(req, res) {
  const { uid, campaignId, updates } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });

  const keyMap = {
    name: "name",
    postUrl: "post_url",
    mediaId: "media_id",
    triggerKeywords: "trigger_keywords",
    replyMessage: "reply_message",
    replyLink: "reply_link",
    isActive: "is_active",
  };

  const mapped = {};
  for (const [key, value] of Object.entries(updates || {})) {
    mapped[keyMap[key] || key] = value;
  }
  mapped.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("insta_reply_campaigns")
    .update(mapped)
    .eq("id", campaignId)
    .eq("uid", uid)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}

async function deleteCampaign(req, res) {
  const { uid, campaignId } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });

  const { error } = await supabase
    .from("insta_reply_campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("uid", uid);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

async function toggleCampaign(req, res) {
  const { uid, campaignId, isActive } = req.body;
  if (!uid) return res.status(400).json({ error: "uid 필수" });
  if (!campaignId) return res.status(400).json({ error: "campaignId 필수" });
  if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive (boolean) 필수" });

  const { data, error } = await supabase
    .from("insta_reply_campaigns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("uid", uid)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaign: data });
}
