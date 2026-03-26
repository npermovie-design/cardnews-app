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
    const { uid, platform, title, content, tags, visibility = "public" } = req.body;
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

    // ── 티스토리 발행 ────────────────────────
    if (platform === "tistory") {
      const htmlContent = mdToHtml(content);
      const tistoryRes = await fetch("https://www.tistory.com/apis/post/write", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: conn.access_token,
          output: "json",
          blogName: conn.blog_name,
          title: title || "제목 없음",
          content: htmlContent,
          visibility: visibility === "public" ? "3" : "0",
          tag: tags || "",
        }),
      });
      const tistoryData = await tistoryRes.json();
      if (tistoryData?.tistory?.status === "200") {
        postUrl = tistoryData.tistory.url || `https://${conn.blog_name}.tistory.com/${tistoryData.tistory.postId}`;
      } else {
        publishError = tistoryData?.tistory?.error_message || "티스토리 발행 실패";
      }
    }

    // ── 스레드 발행 ────────────────────────
    else if (platform === "threads") {
      // 1) 미디어 컨테이너 생성
      const createRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT",
          text: content.slice(0, 500), // 스레드 글자수 제한
          access_token: conn.access_token,
        }),
      });
      const createData = await createRes.json();
      if (createData.id) {
        // 2) 발행
        const pubRes = await fetch(`https://graph.threads.net/v1.0/${conn.platform_user_id}/threads_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: createData.id,
            access_token: conn.access_token,
          }),
        });
        const pubData = await pubRes.json();
        postUrl = pubData.id ? `https://www.threads.net/@${conn.platform_username}/post/${pubData.id}` : null;
        if (!pubData.id) publishError = pubData.error?.message || "스레드 발행 실패";
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

    // ── 인스타그램 (이미지 필수 → 안내) ────────────────────────
    else if (platform === "instagram") {
      return res.status(200).json({
        success: false,
        message: "인스타그램은 이미지가 포함된 게시물만 발행할 수 있습니다. 카드뉴스 생성 후 이용해주세요.",
      });
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
