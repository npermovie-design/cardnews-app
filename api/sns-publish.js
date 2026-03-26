// SNS 발행 API — 연결된 플랫폼에 콘텐츠 게시
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

// 마크다운 → HTML 변환 (티스토리용)
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
      return res.status(200).json({
        success: false,
        clipboard: true,
        message: "티스토리 Open API가 종료되어 자동 발행이 불가합니다. 내용이 클립보드에 복사되었으며, 에디터가 열립니다.",
        editorUrl: "https://www.tistory.com/auth/login?redirectUrl=https%3A%2F%2Fwww.tistory.com%2Fm%2Fentry%2Fwrite",
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
      return res.status(200).json({
        success: false,
        clipboard: true,
        message: "네이버 블로그는 API 발행이 지원되지 않습니다. 내용이 클립보드에 복사되었으며, 블로그 에디터가 열립니다.",
        editorUrl: "https://blog.naver.com/PostWriteForm.naver",
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
