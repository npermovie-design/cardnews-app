// Instagram Webhook — 댓글 감지 → 키워드 매칭 → 자동 DM 발송
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

const VERIFY_TOKEN = process.env.INSTA_WEBHOOK_VERIFY_TOKEN || "snsmakeit_webhook_2026";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");

  // ── GET: Webhook 인증 (Hub Challenge) ──
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // ── POST: Webhook 이벤트 수신 ──
  if (req.method === "POST") {
    const body = req.body;
    console.log("Webhook event:", JSON.stringify(body).substring(0, 500));

    // 즉시 200 반환 (Instagram은 5초 내 응답 필요)
    res.status(200).send("EVENT_RECEIVED");

    // 비동기로 이벤트 처리
    try {
      await processWebhookEvent(body);
    } catch (err) {
      console.error("Webhook processing error:", err);
    }
    return;
  }

  return res.status(405).send("Method not allowed");
}

// ── 웹훅 이벤트 처리 ──
async function processWebhookEvent(body) {
  if (body.object !== "instagram") return;

  for (const entry of body.entry || []) {
    // 댓글 이벤트 처리
    for (const change of entry.changes || []) {
      if (change.field === "comments") {
        await handleComment(entry.id, change.value);
      }
    }

    // messaging 이벤트 (DM 수신 시)도 처리 가능
    for (const msg of entry.messaging || []) {
      if (msg.message && !msg.message.is_echo) {
        await handleIncomingMessage(entry.id, msg);
      }
    }
  }
}

// ── 댓글 처리: 키워드 매칭 → DM 발송 ──
async function handleComment(igAccountId, commentData) {
  const { media, id: commentId, text: commentText, from } = commentData;
  if (!commentText || !from?.id) return;

  const mediaId = media?.id;
  const commenterId = from.id;
  const commenterUsername = from.username || "";

  console.log(`Comment on media ${mediaId}: "${commentText}" from @${commenterUsername}`);

  // 1) 이 Instagram 계정의 연동 정보 찾기
  const { data: connections } = await supabase
    .from("sns_connections")
    .select("*")
    .eq("platform", "instagram")
    .eq("platform_user_id", igAccountId);

  if (!connections?.length) {
    console.log("No connection found for IG account:", igAccountId);
    return;
  }

  const connection = connections[0];
  const uid = connection.uid;
  const accessToken = connection.access_token;

  // 2) 이 유저의 활성 캠페인 조회
  const { data: campaigns } = await supabase
    .from("insta_dm_campaigns")
    .select("*")
    .eq("uid", uid)
    .eq("is_active", true);

  if (!campaigns?.length) return;

  // 3) 캠페인별 키워드 매칭
  for (const campaign of campaigns) {
    const keywords = campaign.trigger_keywords || [];

    // 키워드가 비어있으면 모든 댓글에 반응
    const matched = keywords.length === 0 ||
      keywords.some(kw => commentText.toLowerCase().includes(kw.toLowerCase()));

    if (!matched) continue;

    console.log(`Keyword matched! Campaign: ${campaign.name}, Comment: "${commentText}"`);

    // 4) 이미 이 댓글에 DM 보냈는지 중복 체크
    const { data: existing } = await supabase
      .from("insta_dm_log")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("commenter_id", commenterId)
      .eq("comment_id", commentId)
      .limit(1);

    if (existing?.length) {
      console.log("Already sent DM for this comment, skipping");
      continue;
    }

    // 5) 팔로워 여부 확인
    const isFollower = await checkFollower(accessToken, igAccountId, commenterId);

    // 6) DM 메시지 결정
    const message = isFollower
      ? campaign.dm_message_follower
      : campaign.dm_message_non_follower;

    if (!message) continue;

    // 링크가 있으면 메시지에 추가
    const fullMessage = campaign.dm_link
      ? `${message}\n\n${campaign.dm_link}`
      : message;

    // 7) DM 발송
    const sent = await sendDM(accessToken, igAccountId, commenterId, fullMessage);

    // 8) 발송 로그 기록
    await supabase.from("insta_dm_log").insert({
      campaign_id: campaign.id,
      uid,
      commenter_id: commenterId,
      commenter_username: commenterUsername,
      comment_id: commentId,
      comment_text: commentText.substring(0, 500),
      message_sent: fullMessage.substring(0, 1000),
      is_follower: isFollower,
      sent_success: sent,
      created_at: new Date().toISOString(),
    });

    // 9) 발송 카운트 증가
    if (sent) {
      await supabase.rpc("increment_dm_sent_count", { cid: campaign.id }).catch(() => {
        // rpc가 없으면 직접 업데이트
        supabase
          .from("insta_dm_campaigns")
          .update({
            dm_sent_count: (campaign.dm_sent_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id)
          .then(() => {});
      });
    }

    // 하나의 댓글에 대해 첫 매칭 캠페인만 DM 발송 (중복 방지)
    break;
  }
}

// ── 수신 DM 처리 (자동 응답) ──
async function handleIncomingMessage(igAccountId, messaging) {
  const senderId = messaging.sender?.id;
  if (!senderId || senderId === igAccountId) return;

  // 수신 DM 로그만 기록 (추후 자동응답 확장 가능)
  console.log(`Incoming DM from ${senderId}: ${messaging.message?.text?.substring(0, 100)}`);
}

// ── 팔로워 확인 ──
async function checkFollower(accessToken, igAccountId, userId) {
  try {
    // Instagram Graph API로 팔로워 확인
    // 참고: 이 API는 비즈니스/크리에이터 계정에서만 동작
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${igAccountId}?fields=followers&access_token=${accessToken}`
    );
    // 팔로워 목록 직접 조회가 제한적이므로, 기본적으로 비팔로워로 처리
    // 실제로는 conversation history로 판단하거나 기본값 사용
    return false;
  } catch {
    return false;
  }
}

// ── DM 발송 (Instagram Send API) ──
async function sendDM(accessToken, igAccountId, recipientId, message) {
  try {
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${igAccountId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("DM send failed:", data);
      return false;
    }

    console.log("DM sent successfully:", data);
    return true;
  } catch (err) {
    console.error("DM send error:", err);
    return false;
  }
}
