// api/sns.js — SNS 통합 API (publish, connections, auth-meta, auth-tistory, threads-media, feed)
import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 20 };

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// ── 공통 CORS 처리 ──────────────────────────────────────────────
const ALLOWED_ORIGINS = "*";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

// ── 마크다운 → HTML 변환 (티스토리용) ────────────────────────────
function mdToHtml(md) {
  if (!md) return "";
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, m => `<ul>${m}</ul>`)
    .replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(.+)$/gm, "<p>$1</p>")
    .replace(/<p><(h[123]|ul|li|\/)/g, "<$1")
    .replace(/<\/(h[123]|ul)><\/p>/g, "</$1>");
}

// ── fetch-sns-feed 용 서버 메모리 캐시 (5분) ─────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const OR_KEY = process.env.OPENROUTER_API_KEY;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

// ══════════════════════════════════════════════════════════════════
// ACTION: publish — SNS 발행
// ══════════════════════════════════════════════════════════════════
async function handlePublish(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Origin check — block untrusted callers
  const origin = req.headers.origin || req.headers.referer || "";
  const isTrusted = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  if (!isTrusted) return res.status(403).json({ error: "Forbidden" });

  try {
    const { uid, platform, title, content, tags, visibility = "public", scheduledTime, imageUrl } = req.body;
    if (!uid || !platform || !content) return res.status(400).json({ error: "필수 파라미터 누락 (uid, platform, content)" });

    // 연결 정보 조회
    const { data: conn, error: connErr } = await supabase
      .from("sns_connections")
      .select("*")
      .eq("uid", uid)
      .eq("platform", platform)
      .single();

    if (connErr || !conn) return res.status(400).json({ error: `${platform} 연결 정보 없음. 먼저 계정을 연결하세요.` });

    let postUrl = null;
    let publishError = null;

    // ── 티스토리 (API 종료 → 클립보드+에디터 방식) ────────────────────────
    if (platform === "tistory") {
      const tistoryBlog = conn.platform_username || conn.blog_name || "";
      return res.status(200).json({
        success: false,
        clipboard: true,
        message: "티스토리 Open API가 종료되어 자동 발행이 불가합니다. 내용이 클립보드에 복사되었으며, 에디터가 열립니다.",
        editorUrl: tistoryBlog
          ? `https://${tistoryBlog}.tistory.com/manage/newpost`
          : "https://www.tistory.com/",
      });
    }

    // ── 스레드 발행 (즉시 + 예약) ────────────────────────
    else if (platform === "threads") {
      // 1) 미디어 컨테이너 생성
      const containerBody = {
        media_type: imageUrl ? "IMAGE" : "TEXT",
        text: content.slice(0, 500),
        access_token: conn.access_token,
      };
      if (imageUrl) containerBody.image_url = imageUrl;

      const createRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      });
      const createData = await createRes.json();
      if (createData.id) {
        // 2) 발행 (예약 또는 즉시)
        const publishBody = {
          creation_id: createData.id,
          access_token: conn.access_token,
        };
        // 예약 발행: Unix timestamp (최소 10분 후 ~ 최대 75일 후)
        if (scheduledTime) {
          const ts = Math.floor(new Date(scheduledTime).getTime() / 1000);
          const minTs = Math.floor(Date.now() / 1000) + 600; // 10분 후
          const maxTs = Math.floor(Date.now() / 1000) + 75 * 86400; // 75일
          if (ts < minTs) return res.status(400).json({ error: "예약 시간은 최소 10분 후여야 합니다." });
          if (ts > maxTs) return res.status(400).json({ error: "예약 시간은 최대 75일 후까지 가능합니다." });
          publishBody.scheduled_publish_time = ts;
        }

        const pubRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(publishBody),
        });
        const pubData = await pubRes.json();
        if (pubData.id) {
          postUrl = scheduledTime
            ? `예약됨: ${new Date(scheduledTime).toLocaleString("ko-KR")}`
            : `https://www.threads.net/@${conn.platform_username}/post/${pubData.id}`;
        } else {
          publishError = pubData.error?.message || "스레드 발행 실패";
        }
      } else {
        publishError = createData.error?.message || "스레드 컨테이너 생성 실패";
      }
    }

    // ── 네이버 블로그 (자동 발행 불가 → 안내) ────────────────────────
    else if (platform === "naver_blog") {
      const blogId = conn.platform_username || conn.platform_user_id || "";
      return res.status(200).json({
        success: false,
        clipboard: true,
        message: "네이버 블로그는 API 발행이 지원되지 않습니다. 내용이 클립보드에 복사되었으며, 블로그 에디터가 열립니다.",
        editorUrl: blogId
          ? `https://blog.naver.com/${blogId}/postwrite`
          : "https://blog.naver.com/PostWriteForm.naver",
      });
    }

    // ── 인스타그램 (이미지 필수) ────────────────────────
    else if (platform === "instagram") {
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "인스타그램은 이미지가 필요합니다. 카드뉴스나 이미지를 함께 발행해주세요.",
        });
      }
      // Instagram Graph API로 이미지 게시물 발행
      // 1) 미디어 컨테이너 생성
      const createParams = new URLSearchParams({
        image_url: imageUrl,
        caption: content.slice(0, 2200),
        access_token: conn.access_token,
      });
      const createRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: createParams.toString(),
      });
      const createData = await createRes.json();
      if (!createData.id) {
        publishError = `인스타 컨테이너 실패 [userId:${conn.platform_user_id}] [img:${imageUrl?.slice(0,80)}] [resp:${JSON.stringify(createData)}]`;
      } else {
        const pubParams = new URLSearchParams({
          creation_id: createData.id,
          access_token: conn.access_token,
        });
        const pubRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: pubParams.toString(),
        });
        const pubData = await pubRes.json();
        postUrl = pubData.id ? `https://www.instagram.com/p/${pubData.id}` : null;
        if (!pubData.id) publishError = pubData.error?.message || "인스타그램 발행 실패";
      }
    }

    else {
      return res.status(400).json({ error: `지원하지 않는 플랫폼: ${platform}` });
    }

    // 발행 이력 저장
    await supabase.from("publish_history").insert({
      uid,
      platform,
      title: title || "",
      content_preview: content.slice(0, 200),
      post_url: postUrl,
      status: publishError ? "failed" : "success",
      error_message: publishError,
    });

    if (publishError) return res.status(400).json({ success: false, error: publishError });
    return res.status(200).json({ success: true, postUrl });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════
// ACTION: connections — SNS 연결 목록 조회 / 연결 해제
// ══════════════════════════════════════════════════════════════════
async function handleConnections(req, res) {
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

// ══════════════════════════════════════════════════════════════════
// ACTION: auth-meta — Meta(Instagram/Threads) OAuth 연동
// ══════════════════════════════════════════════════════════════════
async function handleAuthMeta(req, res) {
  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;
  const IG_APP_ID = process.env.INSTAGRAM_APP_ID || APP_ID;
  const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || APP_SECRET;
  const REDIRECT_URI = process.env.META_REDIRECT_URI || "https://snsmakeit.com/api/sns-auth-meta";

  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 처리
    if (code) {
      const [uid, platform] = (state || "").split(":");
      if (!uid) return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent("사용자 정보 없음"));

      try {
        let accessToken = "";
        let platformUserId = "";
        let platformUsername = "";
        let expiresAt = null;

        if (platform === "threads") {
          // ── Threads OAuth: graph.threads.net 사용 ────────────────
          // 1) Short-lived token 교환
          const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: APP_ID,
              client_secret: APP_SECRET,
              grant_type: "authorization_code",
              redirect_uri: REDIRECT_URI,
              code,
            }),
          });
          const tokenData = await tokenRes.json();
          if (!tokenData.access_token) {
            throw new Error("토큰 발급 실패: " + JSON.stringify(tokenData));
          }

          // 2) Long-lived token 교환
          const longRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${tokenData.access_token}`);
          const longData = await longRes.json();
          accessToken = longData.access_token || tokenData.access_token;
          if (longData.expires_in) {
            expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
          }

          // 3) 사용자 정보
          const userRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`);
          const userData = await userRes.json();
          platformUserId = userData.id || tokenData.user_id || "";
          platformUsername = userData.username || "";

        } else {
          // ── Instagram Business Login OAuth ────────────────
          // 1) Short-lived token 교환
          const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: IG_APP_ID,
              client_secret: IG_APP_SECRET,
              grant_type: "authorization_code",
              redirect_uri: REDIRECT_URI,
              code,
            }),
          });
          const tokenData = await tokenRes.json();
          if (!tokenData.access_token) throw new Error("토큰 발급 실패: " + JSON.stringify(tokenData));

          // 2) Long-lived token 교환
          const longRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${tokenData.access_token}`);
          const longData = await longRes.json();
          accessToken = longData.access_token || tokenData.access_token;
          if (longData.expires_in) {
            expiresAt = new Date(Date.now() + longData.expires_in * 1000).toISOString();
          }

          // 3) Instagram 사용자 정보
          const userRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`);
          const userData = await userRes.json();
          platformUserId = userData.user_id || tokenData.user_id || "";
          platformUsername = userData.username || "";
        }

        // Supabase에 저장
        const { error: dbError } = await supabase.from("sns_connections").upsert({
          uid,
          platform: platform || "threads",
          access_token: accessToken,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        if (dbError) throw new Error("DB 저장 실패: " + dbError.message);

        return res.redirect(302, `/ai/blog_write?sns_connected=${platform || "threads"}`);
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!APP_ID && !IG_APP_ID) return res.status(500).json({ error: "META_APP_ID 또는 INSTAGRAM_APP_ID 환경변수 미설정" });
    const { uid, platform = "threads" } = req.query;
    const scopes = platform === "threads"
      ? "threads_basic,threads_content_publish"
      : "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments";
    const authUrl = platform === "threads"
      ? `https://threads.net/oauth/authorize?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${uid}:${platform}`
      : `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${uid}:${platform}`;
    return res.status(200).json({ authUrl });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ══════════════════════════════════════════════════════════════════
// ACTION: auth-tistory — 티스토리 OAuth 연동
// ══════════════════════════════════════════════════════════════════
async function handleAuthTistory(req, res) {
  const CLIENT_ID = process.env.TISTORY_CLIENT_ID;
  const CLIENT_SECRET = process.env.TISTORY_CLIENT_SECRET;
  const REDIRECT_URI = process.env.TISTORY_REDIRECT_URI || "https://snsmakeit.com/api/sns-auth-tistory";

  // GET: OAuth 인증 URL 반환 또는 콜백 처리
  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 (code가 있으면 토큰 교환)
    if (code) {
      try {
        const tokenRes = await fetch("https://www.tistory.com/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code,
            grant_type: "authorization_code",
          }),
        });
        const tokenText = await tokenRes.text();
        // 티스토리는 access_token=xxx 형태로 반환
        const accessToken = new URLSearchParams(tokenText).get("access_token");
        if (!accessToken) throw new Error("토큰 발급 실패: " + tokenText);

        // 블로그 정보 가져오기
        const blogRes = await fetch(`https://www.tistory.com/apis/blog/info?access_token=${accessToken}&output=json`);
        const blogData = await blogRes.json();
        const blog = blogData?.tistory?.item?.blogs?.[0];

        // state에서 uid 추출
        const uid = state;
        if (!uid) throw new Error("사용자 정보 없음");

        // Supabase에 저장
        await supabase.from("sns_connections").upsert({
          uid,
          platform: "tistory",
          access_token: accessToken,
          platform_username: blog?.title || "",
          blog_name: blog?.name || "",
          metadata: { blogUrl: blog?.url || "" },
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        // 성공 페이지로 리다이렉트
        return res.redirect(302, "/ai/blog_write?sns_connected=tistory");
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!CLIENT_ID) return res.status(500).json({ error: "TISTORY_CLIENT_ID 환경변수 미설정" });
    const uid = req.query.uid;
    const authUrl = `https://www.tistory.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${uid}`;
    return res.status(200).json({ authUrl });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ══════════════════════════════════════════════════════════════════
// ACTION: threads-media — 스레드 게시물 목록 조회
// ══════════════════════════════════════════════════════════════════
async function handleThreadsMedia(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

// ══════════════════════════════════════════════════════════════════
// ACTION: feed — 인스타/틱톡 AI 트렌드 피드
// ══════════════════════════════════════════════════════════════════
async function handleFeed(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, category, keywords } = req.body || {};
  if (!platform || !category || !keywords?.length) {
    return res.status(400).json({ error: "platform, category, keywords 필요" });
  }

  const cacheKey = `${platform}_${category}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ videos: cached.data, category, cached: true });
  }

  const platLabel = platform === "instagram" ? "인스타그램" : "틱톡";

  try {
    const r = await fetch(OR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OR_KEY}`,
        "HTTP-Referer": "https://snsmakeit.com",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [
          { role: "system", content: `한국 ${platLabel} 트렌드 분석 전문가. 2025-2026년 현재 활동 중인 실제 크리에이터 기반. 실제 계정명 사용. JSON만 출력.` },
          { role: "user", content: `한국 ${platLabel} "${category}" 분야 인기 크리에이터+바이럴 콘텐츠 10개.
키워드: ${keywords.join(", ")}

JSON배열:
[{"id":"고유ID","platform":"${platform}","username":"@실제계정","displayName":"이름","followers":"팔로워(예:125K)","title":"인기콘텐츠 요약","contentType":"${platform === "instagram" ? "릴스/카루셀/피드" : "숏폼/듀엣"}","views":"조회수(예:850K)","likes":"좋아요(예:45K)","comments":"댓글(예:1.2K)","engagementRate":"참여율(예:4.8%)","hashtags":["태그1","태그2","태그3"],"whyViral":"인기이유 한줄","published":"시기(예:3일 전)","mood":"분위기(감성적/유머/정보성/트렌디 등)","visualStyle":"스타일 한줄","colorGradient":"CSS gradient(예:linear-gradient(135deg,#ff6b9d,#c44569))"}]` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("OpenRouter error:", r.status, errText);
      return res.status(502).json({ error: "AI 호출 실패" });
    }

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const videos = JSON.parse(cleaned);

    cache.set(cacheKey, { data: videos, ts: Date.now() });

    // 오래된 캐시 정리
    if (cache.size > 50) {
      for (const [k, v] of cache) {
        if (Date.now() - v.ts > CACHE_TTL * 2) cache.delete(k);
      }
    }

    return res.json({ videos, category, total: videos.length });
  } catch (e) {
    console.error("fetch-sns-feed error:", e.message);
    return res.status(500).json({ error: "피드 생성 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ══════════════════════════════════════════════════════════════════
// 라우터: ?action= 파라미터로 분기
// ══════════════════════════════════════════════════════════════════
const ACTION_MAP = {
  publish: handlePublish,
  connections: handleConnections,
  "auth-meta": handleAuthMeta,
  "auth-tistory": handleAuthTistory,
  "threads-media": handleThreadsMedia,
  feed: handleFeed,
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;
  if (!action || !ACTION_MAP[action]) {
    return res.status(400).json({
      error: "action 파라미터 필수",
      validActions: Object.keys(ACTION_MAP),
    });
  }

  return ACTION_MAP[action](req, res);
}
