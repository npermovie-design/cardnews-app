// api/insta.js — 인스타그램 통합 API
// ?action=auto-dm|auto-reply|media|webhook|fetch
import { createClient } from "@supabase/supabase-js";
import { isAllowedOrigin, setCors, requireAuth, safeError, rateLimit } from "../lib/security.js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

const VERIFY_TOKEN = process.env.INSTA_WEBHOOK_VERIFY_TOKEN || "";

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  const action = req.query.action;

  if (!action) {
    return res.status(400).json({ error: "action query parameter 필수 (?action=auto-dm|auto-reply|media|webhook|fetch)" });
  }

  switch (action) {
    case "auto-dm":
      return handleAutoDm(req, res);
    case "auto-reply":
      return handleAutoReply(req, res);
    case "media":
      return handleMedia(req, res);
    case "webhook":
      return handleWebhook(req, res);
    case "fetch":
      return handleFetch(req, res);
    default:
      return res.status(400).json({ error: "잘못된 요청입니다" });
  }
}

// ============================================================
// ── auto-dm: 인스타그램 자동 DM 캠페인 관리 ──
// ============================================================
async function handleAutoDm(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate Limiting
  if (!rateLimit(req, { limit: 30, windowMs: 60000 })) {
    return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." });
  }

  // uid 인증 (Bearer token 기반)
  const bodyUid = req.body?.uid;
  const authUid = await requireAuth(req, res, bodyUid);
  if (!authUid) return;

  // 인증된 uid로 강제 교체 (body의 uid 조작 방지)
  if (req.body) req.body.uid = authUid;

  try {
    const { action } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: "action 필수" });
    }

    switch (action) {
      case "list_campaigns":
        return await autoDm_listCampaigns(req, res);
      case "create_campaign":
        return await autoDm_createCampaign(req, res);
      case "update_campaign":
        return await autoDm_updateCampaign(req, res);
      case "delete_campaign":
        return await autoDm_deleteCampaign(req, res);
      case "toggle_campaign":
        return await autoDm_toggleCampaign(req, res);
      case "generate_dm":
        return await autoDm_generateDm(req, res);
      case "list_logs":
        return await autoDm_listLogs(req, res);
      default:
        return res.status(400).json({ error: "잘못된 요청입니다" });
    }
  } catch (err) {
    console.error("insta-auto-dm error:", err);
    return res.status(500).json({ error: "서버 오류가 발생했습니다" });
  }
}

// ── 캠페인 목록 조회 ──
async function autoDm_listCampaigns(req, res) {
  const { uid } = req.body;

  const { data, error } = await supabase
    .from("insta_dm_campaigns")
    .select("*")
    .eq("uid", uid)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ campaigns: data || [] });
}

// ── 캠페인 생성 ──
async function autoDm_createCampaign(req, res) {
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
async function autoDm_updateCampaign(req, res) {
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
async function autoDm_deleteCampaign(req, res) {
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
async function autoDm_toggleCampaign(req, res) {
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
async function autoDm_generateDm(req, res) {
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

  const INSTA_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!INSTA_ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": INSTA_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic error:", errText);
    return res.status(502).json({ error: "AI 메시지 생성 실패" });
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || "";

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
async function autoDm_listLogs(req, res) {
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

// ============================================================
// ── auto-reply: 인스타그램 자동 대댓글 캠페인 관리 ──
// ============================================================
async function handleAutoReply(req, res) {
  setCors(req, res, { methods: "POST,OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, { limit: 30, windowMs: 60000 })) {
    return res.status(429).json({ error: "요청이 너무 많습니다" });
  }

  const bodyUid = req.body?.uid;
  const authUid = await requireAuth(req, res, bodyUid);
  if (!authUid) return;
  if (req.body) req.body.uid = authUid;

  try {
    const { action } = req.body || {};
    if (!action) return res.status(400).json({ error: "action 필수" });

    switch (action) {
      case "list_campaigns":
        return await autoReply_listCampaigns(req, res);
      case "create_campaign":
        return await autoReply_createCampaign(req, res);
      case "update_campaign":
        return await autoReply_updateCampaign(req, res);
      case "delete_campaign":
        return await autoReply_deleteCampaign(req, res);
      case "toggle_campaign":
        return await autoReply_toggleCampaign(req, res);
      default:
        return res.status(400).json({ error: `알 수 없는 action: ${action}` });
    }
  } catch (err) {
    console.error("insta-auto-reply error:", err);
    return res.status(500).json({ error: err.message || "서버 오류" });
  }
}

async function autoReply_listCampaigns(req, res) {
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

async function autoReply_createCampaign(req, res) {
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

async function autoReply_updateCampaign(req, res) {
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

async function autoReply_deleteCampaign(req, res) {
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

async function autoReply_toggleCampaign(req, res) {
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

// ============================================================
// ── media: 연동된 인스타 계정의 최근 미디어 조회 ──
// ============================================================
async function handleMedia(req, res) {
  setCors(req, res, { methods: "GET,OPTIONS" });
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
      media_type: m.media_type,
      media_url: m.media_url || "",
      thumbnail_url: m.thumbnail_url || m.media_url || "",
      timestamp: m.timestamp,
      like_count: m.like_count || 0,
      comments_count: m.comments_count || 0,
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

// ============================================================
// ── webhook: Instagram Webhook — 댓글 감지 → 키워드 매칭 → 자동 DM 발송 ──
// ============================================================
async function handleWebhook(req, res) {
  setCors(req, res, { methods: "GET,POST,OPTIONS" });

  // ── GET: Webhook 인증 (Hub Challenge) ──
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // ── POST: Webhook 이벤트 수신 ──
  if (req.method === "POST") {
    const body = req.body;

    // 디버그: 수신된 이벤트를 Supabase에 기록
    await logWebhookEvent("received", body);

    // 이벤트 처리 (응답 전에 처리해야 Vercel에서 실행됨)
    try {
      await processWebhookEvent(body);
    } catch (err) {
      await logWebhookEvent("error", { error: err.message, body });
    }

    // 처리 완료 후 200 반환
    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Method not allowed");
}

// ── Supabase에 이벤트 로그 기록 (디버깅용) ──
async function logWebhookEvent(type, data) {
  try {
    await supabase.from("insta_dm_log").insert({
      campaign_id: null,
      uid: "webhook_debug",
      commenter_id: type,
      commenter_username: "",
      comment_id: "debug_" + Date.now(),
      comment_text: JSON.stringify(data).substring(0, 500),
      message_sent: "",
      is_follower: false,
      sent_success: false,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Log error:", e.message);
  }
}

// ── 웹훅 이벤트 처리 ──
async function processWebhookEvent(body) {
  // Instagram 이벤트
  if (body.object === "instagram") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "comments") {
          await handleComment(entry.id, change.value);
        }
      }
      for (const msg of entry.messaging || []) {
        if (msg.message && !msg.message.is_echo) {
          await logWebhookEvent("incoming_dm", { from: msg.sender?.id, text: msg.message?.text?.substring(0, 100) });
        }
      }
    }
    return;
  }

  // Threads 이벤트
  if (body.object === "threads") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "replies" || change.field === "comments") {
          await handleThreadsReply(entry.id, change.value);
        }
      }
    }
    return;
  }

  await logWebhookEvent("skip_unknown_object", { object: body.object });
}

// ── 스레드 댓글/답글 처리 ──
async function handleThreadsReply(threadsUserId, replyData) {
  const { id: replyId, text: replyText, from } = replyData || {};
  if (!replyText || !from?.id) {
    await logWebhookEvent("threads_skip_no_data", { replyData });
    return;
  }

  const replierId = from.id;
  const replierUsername = from.username || "";

  await logWebhookEvent("threads_reply_received", {
    threadsUserId, replierId, replierUsername,
    replyText: replyText.substring(0, 200),
  });

  // 스레드 연동 정보 찾기
  const { data: connections } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("platform", "threads");

  if (!connections?.length) {
    await logWebhookEvent("threads_no_connection", {});
    return;
  }

  const connection = connections.find(c => c.platform_user_id === threadsUserId) || connections[0];
  const uid = connection.uid;
  const accessToken = connection.access_token;
  const userId = connection.platform_user_id;

  // 활성 스레드 대댓글 규칙 조회
  const { data: replyCampaigns } = await supabase
    .from("insta_reply_campaigns")
    .select("*")
    .eq("uid", uid)
    .eq("is_active", true);

  if (!replyCampaigns?.length) return;

  for (const campaign of replyCampaigns) {
    const keywords = campaign.trigger_keywords || [];
    const matched = keywords.length === 0 ||
      keywords.some(kw => replyText.toLowerCase().includes(kw.toLowerCase()));
    if (!matched) continue;

    // 중복 체크
    const { data: existing } = await supabase
      .from("insta_dm_log")
      .select("id")
      .eq("campaign_id", "threads_reply_" + campaign.id)
      .eq("commenter_id", replierId)
      .neq("commenter_id", "webhook_debug")
      .limit(1);

    if (existing?.length) continue;

    const replyMsg = campaign.reply_link
      ? `${campaign.reply_message} ${campaign.reply_link}`
      : campaign.reply_message;

    // 스레드 대댓글 발송
    const sent = await sendThreadsReply(accessToken, userId, replyId, replyMsg);

    // 로그 기록
    await supabase.from("insta_dm_log").insert({
      campaign_id: "threads_reply_" + campaign.id,
      uid,
      commenter_id: replierId,
      commenter_username: replierUsername,
      comment_id: replyId || "unknown",
      comment_text: replyText.substring(0, 500),
      message_sent: replyMsg.substring(0, 1000),
      is_follower: false,
      sent_success: sent,
      created_at: new Date().toISOString(),
    });

    if (sent) {
      await supabase
        .from("insta_reply_campaigns")
        .update({ reply_count: (campaign.reply_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
    }

    break;
  }
}

// ── 스레드 대댓글 발송 (Threads Reply API) ──
async function sendThreadsReply(accessToken, userId, replyToId, message) {
  try {
    // 1) 대댓글 컨테이너 생성
    const createUrl = `https://graph.threads.net/v1.0/${userId}/threads`;
    await logWebhookEvent("threads_reply_creating", { replyToId, messagePreview: message.substring(0, 100) });

    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "TEXT",
        text: message,
        reply_to_id: replyToId,
        access_token: accessToken,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      await logWebhookEvent("threads_reply_create_failed", { status: createRes.status, error: createData });
      return false;
    }

    const creationId = createData.id;

    // 2) 대댓글 발행
    const publishUrl = `https://graph.threads.net/v1.0/${userId}/threads_publish`;
    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      await logWebhookEvent("threads_reply_publish_failed", { status: publishRes.status, error: publishData });
      return false;
    }

    await logWebhookEvent("threads_reply_success", { data: publishData });
    return true;
  } catch (err) {
    await logWebhookEvent("threads_reply_error", { error: err.message });
    return false;
  }
}

// ── 댓글 처리: 키워드 매칭 → 자동 대댓글 + DM 발송 ──
async function handleComment(igAccountId, commentData) {
  const { media, id: commentId, text: commentText, from } = commentData;
  if (!commentText || !from?.id) {
    await logWebhookEvent("skip_no_text_or_from", { commentData });
    return;
  }

  const commenterId = from.id;
  const commenterUsername = from.username || "";
  const mediaId = media?.id;

  await logWebhookEvent("comment_received", {
    igAccountId, commenterId, commenterUsername,
    commentText: commentText.substring(0, 200),
    mediaId,
  });

  // 1) 이 Instagram 계정의 연동 정보 찾기
  const { data: connections } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("platform", "instagram")
    .eq("platform_user_id", igAccountId);

  if (!connections?.length) {
    const { data: allConns } = await supabase
      .from("sns_connections")
      .select("*")
      .eq("platform", "instagram");

    await logWebhookEvent("connection_lookup", {
      igAccountId,
      foundExact: 0,
      allInstagramConnections: (allConns || []).map(c => ({
        uid: c.uid,
        platform_user_id: c.platform_user_id,
        username: c.platform_username,
      })),
    });

    if (!allConns?.length) return;
    var connection = allConns[0];
  } else {
    var connection = connections[0];
  }

  const uid = connection.uid;
  const accessToken = connection.access_token;

  // ── 자동 대댓글 처리 ──
  await handleAutoReplyWebhook(uid, accessToken, igAccountId, mediaId, commentId, commentText, commenterId, commenterUsername);

  // ── DM 캠페인 처리 (현재 비활성 - 개발중) ──
  // 2) 이 유저의 활성 DM 캠페인 조회
  const { data: campaigns } = await supabase
    .from("insta_dm_campaigns")
    .select("*")
    .eq("uid", uid)
    .eq("is_active", true);

  if (!campaigns?.length) {
    await logWebhookEvent("no_active_dm_campaigns", { uid });
    return;
  }

  await logWebhookEvent("dm_campaigns_found", {
    count: campaigns.length,
    names: campaigns.map(c => c.name),
  });

  // 3) 캠페인별 키워드 매칭
  for (const campaign of campaigns) {
    const keywords = campaign.trigger_keywords || [];
    const matched = keywords.length === 0 ||
      keywords.some(kw => commentText.toLowerCase().includes(kw.toLowerCase()));

    if (!matched) {
      await logWebhookEvent("keyword_no_match", {
        campaign: campaign.name, keywords, commentText: commentText.substring(0, 100),
      });
      continue;
    }

    await logWebhookEvent("keyword_matched", {
      campaign: campaign.name, commentText: commentText.substring(0, 100),
    });

    // 4) 중복 발송 체크
    const { data: existing } = await supabase
      .from("insta_dm_log")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("commenter_id", commenterId)
      .neq("commenter_id", "webhook_debug")
      .limit(1);

    if (existing?.length) {
      await logWebhookEvent("already_sent", { campaign: campaign.name, commenterId });
      continue;
    }

    // 5) DM 메시지 결정
    const message = campaign.dm_message_non_follower || campaign.dm_message_follower;
    if (!message) continue;

    const fullMessage = campaign.dm_link
      ? `${message}\n\n${campaign.dm_link}`
      : message;

    // 6) DM 발송
    const sent = await sendDM(accessToken, igAccountId || connection.platform_user_id, commenterId, fullMessage);

    // 7) 발송 로그 기록
    await supabase.from("insta_dm_log").insert({
      campaign_id: campaign.id,
      uid,
      commenter_id: commenterId,
      commenter_username: commenterUsername,
      comment_id: commentId || "unknown",
      comment_text: commentText.substring(0, 500),
      message_sent: fullMessage.substring(0, 1000),
      is_follower: false,
      sent_success: sent,
      created_at: new Date().toISOString(),
    });

    // 8) 발송 카운트 증가
    if (sent) {
      await supabase
        .from("insta_dm_campaigns")
        .update({
          dm_sent_count: (campaign.dm_sent_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }

    break;
  }
}

// ── 자동 대댓글 처리 (webhook 내부용) ──
async function handleAutoReplyWebhook(uid, accessToken, igAccountId, mediaId, commentId, commentText, commenterId, commenterUsername) {
  // 활성 대댓글 규칙 조회
  const { data: replyCampaigns } = await supabase
    .from("insta_reply_campaigns")
    .select("*")
    .eq("uid", uid)
    .eq("is_active", true);

  if (!replyCampaigns?.length) {
    await logWebhookEvent("no_active_reply_campaigns", { uid });
    return;
  }

  await logWebhookEvent("reply_campaigns_found", {
    count: replyCampaigns.length,
    names: replyCampaigns.map(c => c.name),
  });

  for (const campaign of replyCampaigns) {
    const keywords = campaign.trigger_keywords || [];
    const matched = keywords.length === 0 ||
      keywords.some(kw => commentText.toLowerCase().includes(kw.toLowerCase()));

    if (!matched) continue;

    // 중복 대댓글 체크
    const { data: existing } = await supabase
      .from("insta_dm_log")
      .select("id")
      .eq("campaign_id", "reply_" + campaign.id)
      .eq("commenter_id", commenterId)
      .neq("commenter_id", "webhook_debug")
      .limit(1);

    if (existing?.length) {
      await logWebhookEvent("reply_already_sent", { campaign: campaign.name, commenterId });
      continue;
    }

    const replyMsg = campaign.reply_link
      ? `@${commenterUsername} ${campaign.reply_message} ${campaign.reply_link}`
      : `@${commenterUsername} ${campaign.reply_message}`;

    // 대댓글 발송
    const sent = await replyToComment(accessToken, commentId, replyMsg);

    // 로그 기록
    await supabase.from("insta_dm_log").insert({
      campaign_id: "reply_" + campaign.id,
      uid,
      commenter_id: commenterId,
      commenter_username: commenterUsername,
      comment_id: commentId || "unknown",
      comment_text: commentText.substring(0, 500),
      message_sent: replyMsg.substring(0, 1000),
      is_follower: false,
      sent_success: sent,
      created_at: new Date().toISOString(),
    });

    // 대댓글 카운트 증가
    if (sent) {
      await supabase
        .from("insta_reply_campaigns")
        .update({
          reply_count: (campaign.reply_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }

    break;
  }
}

// ── 대댓글 발송 (Instagram Comment Reply API) ──
async function replyToComment(accessToken, commentId, message) {
  try {
    const url = `https://graph.instagram.com/v21.0/${commentId}/replies`;

    await logWebhookEvent("reply_sending", {
      commentId, messagePreview: message.substring(0, 100),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      await logWebhookEvent("reply_send_failed", {
        status: response.status, error: data,
      });
      return false;
    }

    await logWebhookEvent("reply_send_success", { data });
    return true;
  } catch (err) {
    await logWebhookEvent("reply_send_error", { error: err.message });
    return false;
  }
}

// ── DM 발송 (Instagram Send API) ──
async function sendDM(accessToken, igAccountId, recipientId, message) {
  try {
    const url = `https://graph.instagram.com/v21.0/${igAccountId}/messages`;
    const body = {
      recipient: { id: recipientId },
      message: { text: message },
    };

    await logWebhookEvent("dm_sending", {
      url, recipientId, messagePreview: message.substring(0, 100),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      await logWebhookEvent("dm_send_failed", {
        status: response.status, error: data,
      });
      return false;
    }

    await logWebhookEvent("dm_send_success", { data });
    return true;
  } catch (err) {
    await logWebhookEvent("dm_send_error", { error: err.message });
    return false;
  }
}

// ============================================================
// ── fetch: 인스타그램 게시물 정보 추출 ──
// ============================================================
async function handleFetch(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  let title = "", author = "", thumbnail = "", description = "";

  // 1. Instagram oembed API
  try {
    const oRes = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (oRes.ok) {
      const d = await oRes.json();
      title = d.title || "";
      author = d.author_name || "";
      thumbnail = d.thumbnail_url || "";
    }
  } catch {}

  // 2. 페이지 메타 데이터 시도
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      // OG 태그에서 정보 추출
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogTitle && !title) title = ogTitle[1];
      if (ogDesc) description = ogDesc[1];
      if (ogImage && !thumbnail) thumbnail = ogImage[1];

      // caption 추출 시도
      const capMatch = html.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:[^"\\]|\\.)*)"/);
      if (capMatch) description = capMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  } catch {}

  // 3. 해시태그 추출
  const hashtags = [];
  const hashRegex = /#([\w가-힣]+)/g;
  let m;
  const searchText = (description || title || "");
  while ((m = hashRegex.exec(searchText)) !== null) {
    hashtags.push(m[1]);
  }

  return res.status(200).json({
    title: title || description?.slice(0, 80) || "",
    author,
    thumbnail,
    description,
    hashtags,
    hasData: !!(title || description || thumbnail),
  });
}
