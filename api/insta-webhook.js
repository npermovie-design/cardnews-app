// Instagram Webhook — 댓글 감지 → 키워드 매칭 → 자동 DM 발송
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

const VERIFY_TOKEN = process.env.INSTA_WEBHOOK_VERIFY_TOKEN || "snsmakeit_webhook_2026";

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

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

// ── 댓글 처리: 키워드 매칭 → DM 발송 + 자동 대댓글 ──
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
  await handleAutoReply(uid, accessToken, igAccountId, mediaId, commentId, commentText, commenterId, commenterUsername);

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

// ── 자동 대댓글 처리 ──
async function handleAutoReply(uid, accessToken, igAccountId, mediaId, commentId, commentText, commenterId, commenterUsername) {
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
