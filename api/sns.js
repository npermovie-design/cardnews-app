// api/sns.js — SNS 통합 API (publish, connections, auth-meta, auth-tistory, threads-media, feed)
import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 60 };

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// ── Google 토큰 갱신 ────────────────────────────────────────────
async function refreshGoogleToken(conn) {
  if (!conn.refresh_token) return conn.access_token;
  // 만료 10분 전에 갱신
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date(Date.now() + 10 * 60 * 1000)) {
    return conn.access_token;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;
    await supabase.from("sns_connections").update({
      access_token: data.access_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("uid", conn.uid).eq("platform", "youtube");
    return data.access_token;
  }
  return conn.access_token;
}

// ── TikTok 토큰 갱신 ────────────────────────────────────────────
async function refreshTiktokToken(conn) {
  if (!conn.refresh_token) return conn.access_token;
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date(Date.now() + 10 * 60 * 1000)) {
    return conn.access_token;
  }
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;
    await supabase.from("sns_connections").update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || conn.refresh_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq("uid", conn.uid).eq("platform", "tiktok");
    return data.access_token;
  }
  return conn.access_token;
}

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
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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
// ACTION: multi-publish — 다중 플랫폼 동시 발행
// ══════════════════════════════════════════════════════════════════
async function handleMultiPublish(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const origin = req.headers.origin || req.headers.referer || "";
  const isTrusted = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  if (!isTrusted) return res.status(403).json({ error: "Forbidden" });

  try {
    const { uid, title, description, firstComment, contentType, platforms: platformsJson, fileUrl } = req.body;
    if (!uid) return res.status(400).json({ error: "uid 필수" });

    let platforms;
    try { platforms = typeof platformsJson === "string" ? JSON.parse(platformsJson) : platformsJson; }
    catch { return res.status(400).json({ error: "platforms 파싱 실패" }); }

    if (!platforms || !platforms.length) return res.status(400).json({ error: "발행할 플랫폼을 선택하세요" });
    if (!title?.trim()) return res.status(400).json({ error: "제목을 입력하세요" });

    const results = [];

    for (const pf of platforms) {
      const platformId = pf.id;
      const pfDesc = pf.description || description || "";
      const pfTags = pf.tags || "";
      const pfVisibility = pf.visibility || "public";
      let postUrl = null;
      let error = null;
      let status = "success";

      try {
        // 연결 정보 조회
        const { data: conn, error: connErr } = await supabase
          .from("sns_connections")
          .select("*")
          .eq("uid", uid)
          .eq("platform", platformId)
          .single();

        if (connErr || !conn) {
          error = `${platformId} 계정이 연결되지 않았습니다`;
          status = "failed";
        }

        // ── YouTube ──
        else if (platformId === "youtube") {
          // 토큰 갱신
          const ytToken = await refreshGoogleToken(conn);

          if (contentType === "video" && fileUrl) {
            // 1) resumable upload 시작
            const metadata = {
              snippet: {
                title: title,
                description: pfDesc + (pfTags ? "\n\n" + pfTags : ""),
                tags: pfTags ? pfTags.replace(/#/g, "").split(/\s+/).filter(Boolean) : [],
                categoryId: "22", // People & Blogs
              },
              status: {
                privacyStatus: pfVisibility, // public, unlisted, private
                selfDeclaredMadeForKids: false,
              },
            };

            const initRes = await fetch(
              "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${ytToken}`,
                  "Content-Type": "application/json; charset=UTF-8",
                  "X-Upload-Content-Type": "video/*",
                },
                body: JSON.stringify(metadata),
              }
            );

            if (initRes.status === 200) {
              const uploadUrl = initRes.headers.get("location");
              if (uploadUrl && fileUrl) {
                // fileUrl에서 파일 다운로드 후 업로드
                const fileRes = await fetch(fileUrl);
                if (fileRes.ok) {
                  const fileBuffer = await fileRes.arrayBuffer();
                  const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "video/*" },
                    body: fileBuffer,
                  });
                  const uploadData = await uploadRes.json();
                  if (uploadData.id) {
                    postUrl = `https://youtu.be/${uploadData.id}`;

                    // 첫댓글 달기
                    if (firstComment?.trim()) {
                      await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${ytToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          snippet: {
                            videoId: uploadData.id,
                            topLevelComment: { snippet: { textOriginal: firstComment } },
                          },
                        }),
                      });
                    }
                  } else {
                    error = uploadData.error?.message || "YouTube 업로드 실패";
                    status = "failed";
                  }
                } else {
                  error = "파일 다운로드 실패";
                  status = "failed";
                }
              } else {
                error = "YouTube 업로드 URL 획득 실패";
                status = "failed";
              }
            } else {
              const errData = await initRes.json().catch(() => ({}));
              error = errData.error?.message || `YouTube API 오류 (${initRes.status})`;
              status = "failed";
            }
          } else {
            error = "YouTube는 영상 파일이 필요합니다";
            status = "failed";
          }
        }

        // ── Instagram ──
        else if (platformId === "instagram") {
          if (contentType === "video" && fileUrl) {
            // 릴스(Reels) 업로드
            const createParams = new URLSearchParams({
              media_type: "REELS",
              video_url: fileUrl,
              caption: (pfDesc || title) + (pfTags ? "\n\n" + pfTags : ""),
              access_token: conn.access_token,
            });
            const createRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: createParams.toString(),
            });
            const createData = await createRes.json();

            if (createData.id) {
              // 릴스는 처리 시간이 필요 — 최대 30초 폴링
              let mediaReady = false;
              for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const statusRes = await fetch(`https://graph.instagram.com/v21.0/${createData.id}?fields=status_code&access_token=${conn.access_token}`);
                const statusData = await statusRes.json();
                if (statusData.status_code === "FINISHED") { mediaReady = true; break; }
                if (statusData.status_code === "ERROR") { error = "인스타 릴스 처리 실패"; status = "failed"; break; }
              }

              if (mediaReady) {
                const pubParams = new URLSearchParams({ creation_id: createData.id, access_token: conn.access_token });
                const pubRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media_publish`, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: pubParams.toString(),
                });
                const pubData = await pubRes.json();
                if (pubData.id) {
                  postUrl = `https://www.instagram.com/reel/${pubData.id}`;
                  // 첫댓글
                  if (firstComment?.trim()) {
                    await fetch(`https://graph.instagram.com/v21.0/${pubData.id}/comments`, {
                      method: "POST",
                      headers: { "Content-Type": "application/x-www-form-urlencoded" },
                      body: new URLSearchParams({ message: firstComment, access_token: conn.access_token }).toString(),
                    });
                  }
                } else {
                  error = pubData.error?.message || "인스타 발행 실패";
                  status = "failed";
                }
              } else if (!error) {
                error = "인스타 릴스 처리 타임아웃";
                status = "failed";
              }
            } else {
              error = createData.error?.message || "인스타 컨테이너 생성 실패";
              status = "failed";
            }
          } else if (contentType === "image" && fileUrl) {
            // 이미지 게시물
            const createParams = new URLSearchParams({
              image_url: fileUrl,
              caption: (pfDesc || title) + (pfTags ? "\n\n" + pfTags : ""),
              access_token: conn.access_token,
            });
            const createRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: createParams.toString(),
            });
            const createData = await createRes.json();
            if (createData.id) {
              const pubParams = new URLSearchParams({ creation_id: createData.id, access_token: conn.access_token });
              const pubRes = await fetch(`https://graph.instagram.com/v21.0/${conn.platform_user_id}/media_publish`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: pubParams.toString(),
              });
              const pubData = await pubRes.json();
              postUrl = pubData.id ? `https://www.instagram.com/p/${pubData.id}` : null;
              if (!pubData.id) { error = pubData.error?.message || "인스타 발행 실패"; status = "failed"; }
            } else {
              error = createData.error?.message || "인스타 컨테이너 생성 실패";
              status = "failed";
            }
          } else {
            error = "인스타그램은 이미지 또는 영상이 필요합니다";
            status = "failed";
          }
        }

        // ── Threads ──
        else if (platformId === "threads") {
          const textContent = (pfDesc || description || title).slice(0, 500);
          const containerBody = {
            media_type: fileUrl ? (contentType === "video" ? "VIDEO" : "IMAGE") : "TEXT",
            text: textContent,
            access_token: conn.access_token,
          };
          if (fileUrl && contentType === "image") containerBody.image_url = fileUrl;
          if (fileUrl && contentType === "video") containerBody.video_url = fileUrl;

          const createRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(containerBody),
          });
          const createData = await createRes.json();

          if (createData.id) {
            // 비디오인 경우 처리 대기
            if (contentType === "video") {
              for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await fetch(`https://graph.threads.net/v1.0/${createData.id}?fields=status&access_token=${conn.access_token}`);
                const statusData = await statusRes.json();
                if (statusData.status === "FINISHED") break;
                if (statusData.status === "ERROR") { error = "스레드 미디어 처리 실패"; status = "failed"; break; }
              }
            }

            if (!error) {
              const pubRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads_publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: createData.id, access_token: conn.access_token }),
              });
              const pubData = await pubRes.json();
              if (pubData.id) {
                postUrl = `https://www.threads.net/@${conn.platform_username}/post/${pubData.id}`;
              } else {
                error = pubData.error?.message || "스레드 발행 실패";
                status = "failed";
              }
            }
          } else {
            error = createData.error?.message || "스레드 컨테이너 생성 실패";
            status = "failed";
          }
        }

        // ── TikTok ──
        else if (platformId === "tiktok") {
          if (contentType !== "video" || !fileUrl) {
            error = "TikTok은 영상 파일이 필요합니다";
            status = "failed";
          } else {
            // 토큰 갱신
            const tkToken = await refreshTiktokToken(conn);
            // TikTok Content Posting API
            // 1) 업로드 초기화
            const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tkToken}`,
                "Content-Type": "application/json; charset=UTF-8",
              },
              body: JSON.stringify({
                post_info: {
                  title: title.slice(0, 150),
                  privacy_level: pfVisibility === "private" ? "SELF_ONLY" : pfVisibility === "unlisted" ? "MUTUAL_FOLLOW_FRIENDS" : "PUBLIC_TO_EVERYONE",
                  disable_duet: false,
                  disable_comment: false,
                  disable_stitch: false,
                },
                source_info: {
                  source: "PULL_FROM_URL",
                  video_url: fileUrl,
                },
              }),
            });
            const initData = await initRes.json();
            if (initData.data?.publish_id) {
              postUrl = "발행 요청됨 (TikTok 처리 중)";
            } else {
              error = initData.error?.message || "TikTok 업로드 실패";
              status = "failed";
            }
          }
        }

        // ── 네이버 블로그 ──
        else if (platformId === "naver_blog") {
          error = null;
          status = "manual";
          postUrl = "clipboard";
        }

        // ── 지원하지 않는 플랫폼 ──
        else {
          error = `${platformId}는 아직 자동 발행을 지원하지 않습니다`;
          status = "failed";
        }
      } catch (e) {
        error = e.message;
        status = "failed";
      }

      // 발행 이력 저장
      await supabase.from("publish_history").insert({
        uid,
        platform: platformId,
        title: title || "",
        content_preview: (pfDesc || description || "").slice(0, 200),
        post_url: postUrl,
        status: status === "failed" ? "failed" : "success",
        error_message: error,
      });

      results.push({ platform: platformId, status, postUrl, error });
    }

    const successCount = results.filter(r => r.status === "success").length;
    const failCount = results.filter(r => r.status === "failed").length;

    return res.status(200).json({
      success: failCount < results.length, // 하나라도 성공하면 true
      results,
      summary: { total: results.length, success: successCount, failed: failCount },
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════
// ACTION: publish-history — 발행 히스토리 조회
// ══════════════════════════════════════════════════════════════════
async function handlePublishHistory(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "uid 필수" });

  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { data, error, count } = await supabase
      .from("publish_history")
      .select("*", { count: "exact" })
      .eq("uid", uid)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    // 프론트 형식에 맞게 변환
    const history = (data || []).map(row => ({
      title: row.title || "제목 없음",
      description: row.content_preview || "",
      date: row.created_at ? new Date(row.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "",
      status: row.status === "success" ? "완료" : row.status === "failed" ? "실패" : "발행 중",
      platforms: [row.platform],
      postUrl: row.post_url,
      error: row.error_message,
    }));

    return res.status(200).json({ history, total: count || 0 });
  } catch (e) {
    return res.status(500).json({ error: e.message });
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
// ACTION: auth-google — Google(YouTube) OAuth 연동
// ══════════════════════════════════════════════════════════════════
async function handleAuthGoogle(req, res) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://snsmakeit.com/api/sns-auth-google";

  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 처리 (code가 있으면 토큰 교환)
    if (code) {
      const uid = state;
      if (!uid) return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent("사용자 정보 없음"));

      try {
        // 1) Authorization code → Access Token 교환
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("토큰 발급 실패: " + JSON.stringify(tokenData));

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token || null;
        const expiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null;

        // 2) YouTube 채널 정보 가져오기
        const channelRes = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        const channelId = channel?.id || "";
        const channelTitle = channel?.snippet?.title || "";

        // 3) Supabase에 저장
        const { error: dbError } = await supabase.from("sns_connections").upsert({
          uid,
          platform: "youtube",
          access_token: accessToken,
          refresh_token: refreshToken,
          platform_user_id: channelId,
          platform_username: channelTitle,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        if (dbError) throw new Error("DB 저장 실패: " + dbError.message);

        return res.redirect(302, "/ai/blog_write?sns_connected=youtube");
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!CLIENT_ID) return res.status(500).json({ error: "GOOGLE_CLIENT_ID 환경변수 미설정" });
    const uid = req.query.uid;
    const scopes = [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" ");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${uid}`;
    return res.status(200).json({ authUrl });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ══════════════════════════════════════════════════════════════════
// ACTION: auth-tiktok — TikTok OAuth 연동
// ══════════════════════════════════════════════════════════════════
async function handleAuthTiktok(req, res) {
  const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
  const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
  const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || "https://snsmakeit.com/api/sns-auth-tiktok";

  if (req.method === "GET") {
    const { code, state } = req.query;

    // 콜백 처리
    if (code) {
      const uid = state;
      if (!uid) return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent("사용자 정보 없음"));

      try {
        // 1) Authorization code → Access Token 교환
        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: CLIENT_KEY,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("토큰 발급 실패: " + JSON.stringify(tokenData));

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token || null;
        const openId = tokenData.open_id || "";
        const expiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null;

        // 2) 사용자 정보 가져오기
        let displayName = "";
        try {
          const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const userData = await userRes.json();
          displayName = userData.data?.user?.display_name || "";
        } catch {}

        // 3) Supabase에 저장
        const { error: dbError } = await supabase.from("sns_connections").upsert({
          uid,
          platform: "tiktok",
          access_token: accessToken,
          refresh_token: refreshToken,
          platform_user_id: openId,
          platform_username: displayName,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid,platform" });

        if (dbError) throw new Error("DB 저장 실패: " + dbError.message);

        return res.redirect(302, "/ai/blog_write?sns_connected=tiktok");
      } catch (e) {
        return res.redirect(302, "/ai/blog_write?sns_error=" + encodeURIComponent(e.message));
      }
    }

    // 인증 URL 생성
    if (!CLIENT_KEY) return res.status(500).json({ error: "TIKTOK_CLIENT_KEY 환경변수 미설정" });
    const uid = req.query.uid;
    const scopes = "user.info.basic,video.publish,video.upload";
    const csrfState = uid;
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${CLIENT_KEY}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${csrfState}`;
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
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: `한국 ${platLabel} 트렌드 분석 전문가. 2025-2026년 현재 활동 중인 실제 크리에이터 기반. 실제 계정명 사용. JSON만 출력.`,
        messages: [
          { role: "user", content: `한국 ${platLabel} "${category}" 분야 인기 크리에이터+바이럴 콘텐츠 10개.
키워드: ${keywords.join(", ")}

JSON배열:
[{"id":"고유ID","platform":"${platform}","username":"@실제계정","displayName":"이름","followers":"팔로워(예:125K)","title":"인기콘텐츠 요약","contentType":"${platform === "instagram" ? "릴스/카루셀/피드" : "숏폼/듀엣"}","views":"조회수(예:850K)","likes":"좋아요(예:45K)","comments":"댓글(예:1.2K)","engagementRate":"참여율(예:4.8%)","hashtags":["태그1","태그2","태그3"],"whyViral":"인기이유 한줄","published":"시기(예:3일 전)","mood":"분위기(감성적/유머/정보성/트렌디 등)","visualStyle":"스타일 한줄","colorGradient":"CSS gradient(예:linear-gradient(135deg,#ff6b9d,#c44569))"}]` }
        ],
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("Anthropic error:", r.status, errText);
      return res.status(502).json({ error: "AI 호출 실패" });
    }

    const data = await r.json();
    const content = data.content?.[0]?.text || "";
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
// ACTION: webhook-lemonsqueezy — LemonSqueezy 결제 웹훅
// ══════════════════════════════════════════════════════════════════

// 일회 충전 팩: product_name → points (가격 페이지 기준)
const ONE_OFF_POINTS = {
  "Starter":  600,
  "Basic":    1300,
  "Standard": 2400,
  "Plus":     3800,
  "Pro":      6500,
};

// 구독 tier: product_name → { monthly, yearly } (가격 페이지 기준)
const SUB_TIERS = {
  "Basic":    { monthly: 1200,  yearly: 14400 },
  "Pro":      { monthly: 2800,  yearly: 33600 },
  "Premium":  { monthly: 5500,  yearly: 66000 },
  "Business": { monthly: 0,     yearly: 0 },     // 무제한 — 포인트 지급 없음
  "Agency":   { monthly: 0,     yearly: 0 },     // 무제한 — 포인트 지급 없음
};

function detectInterval(attrs) {
  if (!attrs?.created_at || !attrs?.renews_at) return "monthly";
  const created = new Date(attrs.created_at);
  const renews = new Date(attrs.renews_at);
  const days = (renews - created) / (1000 * 60 * 60 * 24);
  return days > 200 ? "yearly" : "monthly";
}

async function addPoints(uid, points, reason) {
  // 원자적 포인트 적립 (FOR UPDATE 행 잠금으로 레이스컨디션 방지)
  const { data: newPoints, error } = await supabase.rpc("change_points_atomic", {
    p_uid: uid, p_delta: points, p_reason: reason || "",
  });
  if (error) { console.error("[LS] RPC error:", error.message); return null; }
  return newPoints;
}

async function saveSubscription(subId, uid, productName, interval, status, attrs = {}) {
  const { error } = await supabase.from("subscriptions").upsert({
    subscription_id: String(subId),
    uid,
    product_name: productName,
    interval,
    status,
    renews_at: attrs.renews_at || null,
    ends_at: attrs.ends_at || null,
    customer_portal_url: attrs.urls?.customer_portal || null,
    update_payment_url: attrs.urls?.update_payment_method || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "subscription_id" });
  if (error) console.error("[LS] saveSubscription fail:", error.message);
}

async function getSubscription(subId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", String(subId))
    .single();
  if (error) { console.error("[LS] getSubscription fail:", error.message); return null; }
  return data;
}

async function handleWebhookLemonsqueezy(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = (url.searchParams.get("token") || "").trim();
    const secret = (process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "").trim();

    if (!secret) {
      console.error("[LS] Auth failed — LEMONSQUEEZY_WEBHOOK_SECRET env var NOT SET on Vercel");
      return res.status(401).json({ error: "Server misconfigured" });
    }
    if (token !== secret) {
      console.error(`[LS] Auth failed — token mismatch (len ${token.length} vs ${secret.length})`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body;
    const eventName = payload.meta?.event_name;
    const userId = payload.meta?.custom_data?.user_id;
    const data = payload.data;
    const attrs = data?.attributes;

    console.log(`[LS] ${eventName} | user:${userId} | product:${attrs?.product_name} | status:${attrs?.status}`);

    switch (eventName) {
      case "order_created": {
        if (!userId || attrs.status !== "paid") break;
        const productName = attrs.first_order_item?.product_name;
        const pts = ONE_OFF_POINTS[productName];
        if (pts) {
          const n = await addPoints(userId, pts, `포인트 충전 (${productName})`);
          console.log(`[LS] +${pts}P (one-off) → ${n}`);
        } else {
          console.warn(`[LS] Unknown pack product: "${productName}"`);
        }
        break;
      }

      case "subscription_created": {
        if (!userId) break;
        const productName = attrs.product_name;
        const tier = SUB_TIERS[productName];
        if (!tier) { console.warn(`[LS] Unknown sub product: "${productName}"`); break; }

        const interval = detectInterval(attrs);
        const pts = interval === "yearly" ? tier.yearly : tier.monthly;
        const label = interval === "yearly" ? "연간" : "월간";

        await saveSubscription(data.id, userId, productName, interval, attrs.status || "active", attrs);

        const n = await addPoints(userId, pts, `구독 시작 (${productName} ${label})`);
        console.log(`[LS] +${pts}P (${label} start) → ${n}`);
        break;
      }

      case "subscription_payment_success": {
        if (attrs.billing_reason === "initial") {
          console.log(`[LS] Initial payment skipped (handled by subscription_created)`);
          break;
        }

        const subId = attrs.subscription_id;
        if (!subId) { console.warn(`[LS] No subscription_id in payload`); break; }

        const sub = await getSubscription(subId);
        if (!sub) { console.warn(`[LS] Subscription mapping not found: ${subId}`); break; }

        const tier = SUB_TIERS[sub.product_name];
        if (!tier) { console.warn(`[LS] Unknown sub tier: ${sub.product_name}`); break; }

        const pts = sub.interval === "yearly" ? tier.yearly : tier.monthly;
        const label = sub.interval === "yearly" ? "연간 갱신" : "월간 갱신";
        const n = await addPoints(sub.uid, pts, `구독 갱신 (${sub.product_name} ${label})`);
        console.log(`[LS] +${pts}P (${label}) → ${n}`);
        break;
      }

      case "subscription_updated": {
        const subId = data?.id;
        if (subId) {
          await supabase.from("subscriptions")
            .update({
              status: attrs.status || "active",
              renews_at: attrs.renews_at || null,
              ends_at: attrs.ends_at || null,
              cancelled_at: attrs.cancelled ? new Date().toISOString() : null,
              customer_portal_url: attrs.urls?.customer_portal || null,
              update_payment_url: attrs.urls?.update_payment_method || null,
              updated_at: new Date().toISOString(),
            })
            .eq("subscription_id", String(subId));
          console.log(`[LS] Subscription ${subId} updated → status:${attrs.status}`);
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const subId = data?.id;
        if (subId) {
          const isExpired = eventName === "subscription_expired";
          await supabase.from("subscriptions")
            .update({
              status: isExpired ? "expired" : "cancelled",
              ends_at: attrs?.ends_at || null,
              cancelled_at: isExpired ? null : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("subscription_id", String(subId));
          console.log(`[LS] Subscription ${subId} → ${eventName}`);
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[LS Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ══════════════════════════════════════════════════════════════════
// ACTION: admin — 관리자 전용 API (service_role 키로 RLS 우회)
// ══════════════════════════════════════════════════════════════════

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function handleAdmin(req, res) {
  const action = req.query.sub_action || req.query.admin_action;
  const sb = getServiceClient();
  if (!sb) return res.status(500).json({ error: "서버 설정 오류" });

  // 인증: Supabase JWT 또는 admin_uid로 admin 확인
  let authUid = "";
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const anonClient = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "");
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (user) authUid = user.id;
  }
  if (!authUid) {
    const origin = req.headers.origin || req.headers.referer || "";
    const isTrusted = origin.includes("snsmakeit.com") || origin.includes("localhost");
    if (isTrusted) authUid = req.query.admin_uid || req.headers["x-admin-uid"] || "";
  }
  if (!authUid) return res.status(403).json({ error: "관리자 인증 필요" });
  const { data: adminCheck } = await sb.from("users").select("role").eq("uid", authUid).single();
  if (!adminCheck || adminCheck.role !== "admin") {
    return res.status(403).json({ error: "관리자 권한 필요" });
  }

  try {
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

    if (action === "update_points") {
      const { uid: targetUid, points } = req.query;
      if (!targetUid || points === undefined) return res.status(400).json({ error: "uid, points 필요" });
      const { error } = await sb.from("users").update({ points: Number(points) }).eq("uid", targetUid);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (action === "delete_member") {
      const targetUid = req.query.target_uid;
      if (!targetUid) return res.status(400).json({ error: "target_uid 필요" });
      const { error } = await sb.from("users").delete().eq("uid", targetUid);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (action === "ai_logs") {
      const { data, error } = await sb.from("point_history").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return res.status(200).json({ logs: data || [] });
    }

    if (action === "daily_signups") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await sb.from("users").select("join_date,created_at").gte("join_date", since);
      return res.status(200).json({ data: data || [] });
    }

    if (action === "daily_ai") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await sb.from("point_history").select("created_at").lt("delta", 0).gte("created_at", since);
      return res.status(200).json({ data: data || [] });
    }

    if (action === "online_count") {
      const { count } = await sb.from("online_users").select("*", { count: "exact", head: true });
      return res.status(200).json({ count: count || 0 });
    }

    return res.status(400).json({ error: "알 수 없는 admin action" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "서버 오류" });
  }
}

// ══════════════════════════════════════════════════════════════════
// 라우터: ?action= 파라미터로 분기
// ══════════════════════════════════════════════════════════════════
// ── 방문자 추적 ──
async function handleTrackLog(req, res) {
  try {
    const country = req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || "unknown";
    const city = decodeURIComponent(req.headers["x-vercel-ip-city"] || "unknown");
    const region = req.headers["x-vercel-ip-country-region"] || "";
    const lat = req.headers["x-vercel-ip-latitude"] || null;
    const lng = req.headers["x-vercel-ip-longitude"] || null;
    const ua = req.headers["user-agent"] || "";
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    await supabase.from("visitor_logs").insert({
      country, city, region, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null,
      page: body.page || "/", referrer: body.referrer || "", device: isMobile ? "mobile" : "desktop", ua: ua.slice(0, 200),
    });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

async function handleTrackStats(req, res) {
  try {
    const days = parseInt(req.query.days || "30");
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { count: totalVisits } = await supabase.from("visitor_logs").select("id", { count: "exact", head: true }).gte("created_at", since);
    const { data: allData } = await supabase.from("visitor_logs").select("country, city, device, page, referrer, lat, lng, created_at").gte("created_at", since).order("created_at").limit(5000);
    const rows = allData || [];
    const countryCounts = {}, cityCounts = {}, dailyCounts = {}, deviceCounts = {}, pageCounts = {}, refCounts = {}, geoPoints = {};
    rows.forEach(r => {
      countryCounts[r.country] = (countryCounts[r.country] || 0) + 1;
      const ck = `${r.city}|${r.country}`; cityCounts[ck] = (cityCounts[ck] || 0) + 1;
      const d = r.created_at.slice(0, 10); dailyCounts[d] = (dailyCounts[d] || 0) + 1;
      deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1;
      pageCounts[r.page] = (pageCounts[r.page] || 0) + 1;
      if (r.referrer) { try { const h = new URL(r.referrer).hostname; refCounts[h] = (refCounts[h] || 0) + 1; } catch {} }
      if (r.lat && r.lng) {
        const gk = `${r.lat.toFixed(1)},${r.lng.toFixed(1)}`;
        if (!geoPoints[gk]) geoPoints[gk] = { lat: r.lat, lng: r.lng, country: r.country, city: r.city, count: 0 };
        geoPoints[gk].count++;
      }
    });
    return res.status(200).json({
      totalVisits: totalVisits || 0, countries: Object.keys(countryCounts).length, cities: Object.keys(cityCounts).length,
      countryCounts, cityCounts, dailyCounts, deviceCounts, days,
      pageCounts: Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 20),
      geoPoints: Object.values(geoPoints),
      referrerCounts: Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
    });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}

const ACTION_MAP = {
  publish: handlePublish,
  "multi-publish": handleMultiPublish,
  "publish-history": handlePublishHistory,
  connections: handleConnections,
  "auth-meta": handleAuthMeta,
  "auth-google": handleAuthGoogle,
  "auth-tiktok": handleAuthTiktok,
  "auth-tistory": handleAuthTistory,
  "threads-media": handleThreadsMedia,
  feed: handleFeed,
  "webhook-lemonsqueezy": handleWebhookLemonsqueezy,
  admin: handleAdmin,
  "track-log": handleTrackLog,
  "track-stats": handleTrackStats,
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
