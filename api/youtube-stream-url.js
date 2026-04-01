// api/youtube-stream-url.js — YouTube 스트림 URL 추출 (Edge Runtime)
export const config = { runtime: "edge" };

function extractId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const videoUrl = url.searchParams.get("url") || "";
  const vid = extractId(videoUrl);
  if (!vid) return new Response(JSON.stringify({ error: "url 필요" }), { status: 400 });

  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    // YouTube 페이지에서 streamingData 추출
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${vid}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!pageRes.ok) throw new Error("YouTube 접근 실패");
    const html = await pageRes.text();

    // ytInitialPlayerResponse에서 streamingData 추출
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
    if (!match) throw new Error("플레이어 데이터를 찾을 수 없습니다");

    const player = JSON.parse(match[1]);
    const title = player?.videoDetails?.title || "";
    const duration = parseInt(player?.videoDetails?.lengthSeconds || "0");
    const streaming = player?.streamingData;

    if (!streaming) throw new Error("스트리밍 데이터 없음");

    // formats (progressive - 영상+음성 통합)
    const formats = (streaming.formats || [])
      .filter(f => f.mimeType?.includes("video/mp4"))
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    // adaptiveFormats (영상만 또는 음성만)
    const adaptive = (streaming.adaptiveFormats || [])
      .filter(f => f.mimeType?.includes("video/mp4") && f.height && f.height <= 720)
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const best = formats[0] || adaptive[0];
    if (!best) throw new Error("MP4 스트림을 찾을 수 없습니다");

    // URL 디코딩 (signatureCipher 처리는 복잡하므로 직접 URL만)
    let streamUrl = best.url || "";
    if (!streamUrl && best.signatureCipher) {
      // signatureCipher는 서버에서 복호화 필요 — 여기서는 지원 안 함
      throw new Error("이 영상은 암호화된 스트림입니다. 파일 업로드를 이용해주세요.");
    }

    return new Response(JSON.stringify({
      title,
      duration,
      videoId: vid,
      streamUrl,
      quality: best.qualityLabel || `${best.height}p`,
      mimeType: best.mimeType,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
