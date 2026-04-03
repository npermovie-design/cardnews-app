// api/youtube-stream-url.js — YouTube Innertube API로 스트림 URL 추출
export const config = { runtime: "edge" };

function extractId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

const INNERTUBE_CLIENTS = [
  {
    name: "ANDROID",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
        hl: "ko",
        gl: "KR",
        userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
    },
    userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
  },
  {
    name: "IOS",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.09.3",
        deviceModel: "iPhone14,3",
        hl: "ko",
        gl: "KR",
        userAgent: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
      },
    },
    userAgent: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
  },
  {
    name: "TV_EMBEDDED",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        hl: "ko",
        gl: "KR",
      },
      thirdParty: { embedUrl: "https://www.youtube.com" },
    },
    userAgent: "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/5.0 Chrome/85.0.4183.93 TV Safari/537.36",
  },
];

export default async function handler(req) {
  const url = new URL(req.url);
  const videoUrl = url.searchParams.get("url") || "";
  const vid = extractId(videoUrl);
  if (!vid) return new Response(JSON.stringify({ error: "url 필요" }), { status: 400 });

  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  const errors = [];

  for (const client of INNERTUBE_CLIENTS) {
    try {
      const body = {
        videoId: vid,
        context: client.context,
        contentCheckOk: true,
        racyCheckOk: true,
      };

      const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          "X-YouTube-Client-Name": client.name === "ANDROID" ? "3" : client.name === "IOS" ? "5" : "85",
          "X-YouTube-Client-Version": client.context.client.clientVersion,
          "Origin": "https://www.youtube.com",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) { errors.push(`${client.name}: HTTP ${res.status}`); continue; }

      const data = await res.json();
      const streaming = data?.streamingData;
      const details = data?.videoDetails;

      if (!streaming) { errors.push(`${client.name}: no streamingData`); continue; }

      // progressive formats 우선 (영상+음성 통합)
      const formats = (streaming.formats || [])
        .filter(f => f.mimeType?.includes("video/mp4") && f.url)
        .sort((a, b) => (b.height || 0) - (a.height || 0));

      // adaptive는 별도 음성 병합이 필요해서 progressive 우선
      const best = formats.find(f => f.height && f.height <= 720) || formats[0];

      if (!best?.url) { errors.push(`${client.name}: no direct URL`); continue; }

      return new Response(JSON.stringify({
        title: details?.title || "",
        duration: parseInt(details?.lengthSeconds || "0"),
        videoId: vid,
        stream_url: best.url,
        streamUrl: best.url,
        quality: best.qualityLabel || `${best.height}p`,
        mimeType: best.mimeType,
        client: client.name,
      }), { headers });

    } catch (e) {
      errors.push(`${client.name}: ${e.message}`);
    }
  }

  // 모든 클라이언트 실패 → 페이지 크롤링 폴백
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${vid}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept": "text/html",
      },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
      if (match) {
        const player = JSON.parse(match[1]);
        const streaming = player?.streamingData;
        if (streaming) {
          const fmts = (streaming.formats || []).filter(f => f.mimeType?.includes("video/mp4") && f.url);
          const best = fmts.find(f => f.height <= 720) || fmts[0];
          if (best?.url) {
            return new Response(JSON.stringify({
              title: player?.videoDetails?.title || "",
              duration: parseInt(player?.videoDetails?.lengthSeconds || "0"),
              videoId: vid,
              stream_url: best.url,
              streamUrl: best.url,
              quality: best.qualityLabel || `${best.height}p`,
              client: "PAGE_CRAWL",
            }), { headers });
          }
        }
      }
    }
  } catch (e) { errors.push(`PAGE: ${e.message}`); }

  return new Response(JSON.stringify({
    error: "스트림 URL을 추출할 수 없습니다",
    details: errors,
    tip: "파일을 직접 업로드해주세요",
  }), { status: 500, headers });
}
