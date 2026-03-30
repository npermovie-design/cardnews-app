// api/youtube.js — 통합 YouTube API
// ?action=info|stream|url|distube-info|distube-stream|fetch|transcript|dl
//
// 원본 파일:
//   api-youtube-info.js   → action=info
//   api-youtube-stream.js → action=stream
//   api-youtube-url.js    → action=url
//   youtube-info.js       → action=distube-info
//   youtube-stream.js     → action=distube-stream
//   fetch-youtube.js      → action=fetch
//   transcript.js         → action=transcript
//   yt-dl.js              → action=dl

import ytdlCore from "ytdl-core";
import ytdlDistube from "@distube/ytdl-core";

// ── 공통 ──────────────────────────────────────────────
function isAllowedOrigin(o) { return o.includes("snsmakeit.com") || o.includes("vercel.app") || o.includes("localhost"); }

const INVIDIOUS = [
  "https://invidious.io.lol",
  "https://yt.cdaut.de",
  "https://invidious.privacyredirect.com",
  "https://inv.tux.pizza",
];

function extractId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

function setCors(req, res, { methods = "GET,OPTIONS", headers, exposeHeaders } = {}) {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", methods);
  if (headers) res.setHeader("Access-Control-Allow-Headers", headers);
  if (exposeHeaders) res.setHeader("Access-Control-Expose-Headers", exposeHeaders);
}

// ── action=info  (원본: api-youtube-info.js, ytdl-core) ──
async function handleInfo(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    const info = await ytdlCore.getInfo(url);
    const vid  = info.videoDetails;

    const formats = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const best = formats[0] || info.formats.find(f => f.hasVideo && f.hasAudio);

    return res.status(200).json({
      title:      vid.title,
      thumbnail:  vid.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`,
      duration:   parseInt(vid.lengthSeconds),
      id:         vid.videoId,
      streamUrl:  best?.url || null,
      quality:    best?.qualityLabel || null,
    });
  } catch (e) {
    return res.status(500).json({ error: "조회 실패: " + e.message.slice(0, 200) });
  }
}

// ── action=stream  (원본: api-youtube-stream.js, ytdl-core) ──
async function handleStream(req, res) {
  setCors(req, res, {
    headers: "Range",
    exposeHeaders: "Content-Length,Content-Range,Accept-Ranges",
  });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    const stream = ytdlCore(url, {
      quality: "highestvideo",
      filter: format => format.container === "mp4" && format.hasAudio && format.hasVideo,
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    stream.on("error", (e) => {
      console.error("ytdl stream error:", e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    });

    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent)
      res.status(500).json({ error: "스트리밍 실패: " + e.message.slice(0, 200) });
  }
}

// ── action=url  (원본: api-youtube-url.js, ytdl-core) ──
async function handleUrl(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 파라미터 필요" });

  try {
    const info = await ytdlCore.getInfo(url);
    const vid  = info.videoDetails;

    const formats = ytdlCore.filterFormats(info.formats, "audioandvideo");
    const best    = formats
      .filter(f => f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0]
      || formats[0]
      || info.formats.find(f => f.hasVideo && f.hasAudio);

    if (!best) return res.status(404).json({ error: "사용 가능한 포맷 없음" });

    return res.status(200).json({
      streamUrl:  best.url,
      mimeType:   best.mimeType || "video/mp4",
      quality:    best.qualityLabel || "unknown",
      duration:   parseInt(vid.lengthSeconds),
      title:      vid.title,
      thumbnail:  vid.thumbnails?.slice(-1)[0]?.url || "",
      author:     vid.author?.name || "",
    });
  } catch (e) {
    console.error("ytdl error:", e.message);
    return res.status(500).json({ error: "영상 정보 조회 실패: " + e.message.slice(0, 200) });
  }
}

// ── action=distube-info  (원본: youtube-info.js, @distube/ytdl-core + Invidious 폴백) ──
async function handleDistubeInfo(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  const id = extractId(url);
  if (!id) return res.status(400).json({ error: "유효하지 않은 YouTube URL" });

  // 1) @distube/ytdl-core 시도
  try {
    const info = await ytdlDistube.getInfo(url, {
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      },
    });
    const vid = info.videoDetails;
    const formats = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.container === "mp4")
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    const best = formats[0] || info.formats.find(f => f.hasVideo && f.hasAudio);

    return res.status(200).json({
      title:     vid.title,
      thumbnail: vid.thumbnails?.slice(-1)[0]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration:  parseInt(vid.lengthSeconds),
      id,
      streamUrl: best?.url || null,
      quality:   best?.qualityLabel || null,
      source:    "ytdl",
    });
  } catch (e) {
    console.log("ytdl failed:", e.message?.slice(0, 100));
  }

  // 2) Invidious API 폴백
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!r.ok) continue;

      const data = await r.json();
      if (data.error) continue;

      const streams = (data.formatStreams || []).filter(f => f.container === "mp4");
      const best = streams.find(f => f.qualityLabel === "720p") || streams[0];

      const adaptives = (data.adaptiveFormats || []).filter(f => f.type?.includes("mp4") && f.fps);

      return res.status(200).json({
        title:     data.title,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration:  data.lengthSeconds,
        id,
        streamUrl: best ? `${base}${best.url}` : null,
        quality:   best?.qualityLabel || null,
        source:    "invidious",
        invidiousBase: base,
      });
    } catch (e) {
      console.log(`Invidious ${base} failed:`, e.message?.slice(0, 80));
    }
  }

  // 3) 최후 폴백: oEmbed (제목+썸네일만)
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const d = await r.json();
    return res.status(200).json({
      title:     d.title,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration:  null,
      id,
      streamUrl: null,
      source:    "oembed",
    });
  } catch {}

  return res.status(500).json({ error: "영상 정보를 불러올 수 없습니다. 잠시 후 다시 시도하거나 파일을 직접 업로드해 주세요." });
}

// ── action=distube-stream  (원본: youtube-stream.js, @distube/ytdl-core) ──
async function handleDistubeStream(req, res) {
  setCors(req, res, {
    headers: "Range",
    exposeHeaders: "Content-Length,Content-Range,Accept-Ranges",
  });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    const stream = ytdlDistube(url, {
      quality: "highestvideo",
      filter: f => f.container === "mp4" && f.hasAudio && f.hasVideo,
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    stream.on("error", (e) => {
      console.error("ytdl stream error:", e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    });

    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent)
      res.status(500).json({ error: "스트리밍 실패: " + e.message.slice(0, 200) });
  }
}

// ── action=fetch  (원본: fetch-youtube.js, 영상 정보 + 자막 추출) ──
async function handleFetch(req, res) {
  setCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url 필요" });

  const vidMatch = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!vidMatch) return res.status(400).json({ error: "유튜브 URL이 아닙니다" });
  const videoId = vidMatch[1];

  let title = "", channelName = "", description = "", tags = [], viewCount = "", transcript = "";
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // 1. oembed (항상 작동)
  try {
    const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(5000) });
    if (oRes.ok) { const d = await oRes.json(); title = d.title || ""; channelName = d.author_name || ""; }
  } catch {}

  // 2. YouTube 페이지 (consent 우회)
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=ko&gl=KR&has_verified=1`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Cookie": "CONSENT=YES+cb; PREF=hl=ko",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      // description
      const descM = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (descM) description = descM[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      if (!description) {
        const descM2 = html.match(/"description":{"simpleText":"((?:[^"\\]|\\.)*)"/);
        if (descM2) description = descM2[1].replace(/\\n/g, "\n");
      }

      // title fallback
      if (!title) {
        const titM = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
        if (titM) title = titM[1];
      }

      // channel fallback
      if (!channelName) {
        const chM = html.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/);
        if (chM) channelName = chM[1];
      }

      // tags
      const tagM = html.match(/"keywords":\[(.*?)\]/);
      if (tagM) { try { tags = JSON.parse(`[${tagM[1]}]`); } catch {} }
      if (tags.length === 0) {
        const metaTag = html.match(/<meta name="keywords" content="([^"]+)"/);
        if (metaTag) tags = metaTag[1].split(",").map(t => t.trim());
      }

      // viewCount
      const viewM = html.match(/"viewCount":"(\d+)"/);
      if (viewM) viewCount = viewM[1];

      // 자막 추출
      const capMatch = html.match(/"captions":\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[(.*?)\]/s);
      if (capMatch) {
        try {
          let capJson = capMatch[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"');
          const urlMatch = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"/g);
          if (urlMatch) {
            let capUrl = "";
            const koUrl = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"[^}]*"languageCode":"ko"/);
            if (koUrl) capUrl = koUrl[1];
            else {
              const firstUrl = capJson.match(/"baseUrl":"(https?:\/\/[^"]+)"/);
              if (firstUrl) capUrl = firstUrl[1];
            }
            if (capUrl) {
              capUrl = capUrl.replace(/\\u0026/g, "&");
              const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(5000) });
              if (capRes.ok) {
                const capXml = await capRes.text();
                const texts = [];
                const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
                let m;
                while ((m = regex.exec(capXml)) !== null) {
                  let t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, " ").trim();
                  if (t) texts.push(t);
                }
                transcript = texts.join(" ").slice(0, 5000);
              }
            }
          }
        } catch {}
      }

      // timedtext API 직접 시도 (자막이 없는 경우)
      if (!transcript) {
        try {
          const ttRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=ko&fmt=srv3`, { signal: AbortSignal.timeout(5000) });
          if (ttRes.ok) {
            const ttXml = await ttRes.text();
            const texts = [];
            const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
            let m;
            while ((m = regex.exec(ttXml)) !== null) {
              let t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").trim();
              if (t) texts.push(t);
            }
            if (texts.length > 0) transcript = texts.join(" ").slice(0, 5000);
          }
        } catch {}
        // 영어 자막도 시도
        if (!transcript) {
          try {
            const ttRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`, { signal: AbortSignal.timeout(5000) });
            if (ttRes.ok) {
              const ttXml = await ttRes.text();
              const texts = [];
              const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
              let m;
              while ((m = regex.exec(ttXml)) !== null) {
                let t = m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
                if (t) texts.push(t);
              }
              if (texts.length > 0) transcript = texts.join(" ").slice(0, 5000);
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 3. noembed fallback (title/channel이 없는 경우)
  if (!title) {
    try {
      const nRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, { signal: AbortSignal.timeout(5000) });
      if (nRes.ok) { const d = await nRes.json(); title = d.title || ""; channelName = channelName || d.author_name || ""; }
    } catch {}
  }

  return res.status(200).json({
    videoId, title, channelName, thumbnail, description,
    tags, viewCount, transcript,
    hasData: !!(title || description),
  });
}

// ── action=transcript  (원본: transcript.js) ──
async function handleTranscript(req, res) {
  setCors(req, res, { methods: "GET, OPTIONS" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId 필요" });

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!pageRes.ok) {
      return res.status(200).json({ items: [], message: "YouTube 접근 실패", method: "none" });
    }

    const html = await pageRes.text();
    let captionTracks = [];

    // 방법 A: 정규식으로 captionTracks 추출
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (captionMatch) {
      try { captionTracks = JSON.parse(captionMatch[1]); } catch {}
    }

    // 방법 B: ytInitialPlayerResponse 파싱
    if (!captionTracks.length) {
      const iprMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
      if (iprMatch) {
        try {
          const ipr = JSON.parse(iprMatch[1]);
          captionTracks = ipr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        } catch {}
      }
    }

    // 방법 C: InnerTube API
    if (!captionTracks.length) {
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      const clientVersionMatch = html.match(/"clientVersion":"([^"]+)"/);
      if (apiKeyMatch) {
        try {
          const playerRes = await fetch(
            `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoId,
                context: {
                  client: {
                    clientName: "WEB",
                    clientVersion: clientVersionMatch?.[1] || "2.20231219.04.00",
                    hl: "ko", gl: "KR",
                  }
                }
              })
            }
          );
          if (playerRes.ok) {
            const pd = await playerRes.json();
            captionTracks = pd?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          }
        } catch {}
      }
    }

    // 자막 없음 → 설명란
    if (!captionTracks.length) {
      const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const description = descMatch
        ? descMatch[1].replace(/\\n/g, "\n").replace(/\\u0026/g, "&").replace(/\\"/g, '"').slice(0, 3000)
        : "";
      const htitle = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : videoId;
      return res.status(200).json({ items: [], description, title: htitle, total: 0, method: "description-only" });
    }

    // 우선순위 선택
    const priority = [
      t => t.languageCode === "ko" && !t.kind,
      t => t.languageCode === "en" && !t.kind,
      t => t.languageCode === "ko",
      t => t.languageCode === "en",
      t => t.languageCode?.startsWith("ko"),
      t => t.languageCode?.startsWith("en"),
      () => true,
    ];
    let chosen = null;
    for (const fn of priority) {
      chosen = captionTracks.find(fn);
      if (chosen) break;
    }
    if (!chosen) chosen = captionTracks[0];

    const langCode = chosen.languageCode || "unknown";
    const isAuto = chosen.kind === "asr";

    const capRes = await fetch(`${chosen.baseUrl}&fmt=srv3`);
    if (!capRes.ok) {
      return res.status(200).json({ items: [], message: "자막 다운로드 실패", method: "none" });
    }

    const xml = await capRes.text();
    const items = [];
    const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const text = m[2]
        .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ")
        .replace(/<[^>]+>/g,"").replace(/\n/g," ").trim();
      if (text) items.push({ start: parseFloat(m[1]), text });
    }

    if (!items.length) {
      return res.status(200).json({ items: [], message: "자막 파싱 실패", method: "none" });
    }

    return res.status(200).json({
      items,
      lang: langCode,
      isAuto,
      total: items.length,
      method: isAuto ? "auto-caption" : "manual-caption",
      trackName: chosen.name?.simpleText || langCode,
    });

  } catch (error) {
    return res.status(200).json({ items: [], message: "서버 오류: " + error.message, method: "none" });
  }
}

// ── action=dl  (원본: yt-dl.js, Invidious + oEmbed) ──
async function handleDl(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url 필요" });

  const id = extractId(url);
  if (!id) return res.status(400).json({ error: "유효하지 않은 YouTube URL" });

  // 1) Invidious API 시도
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (r.ok) {
        const d = await r.json();
        if (!d.error && d.title) {
          return res.status(200).json({
            title: d.title,
            thumbnail: d.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            duration: d.lengthSeconds || 0,
            id,
            source: "invidious",
          });
        }
      }
    } catch {}
  }

  // 2) oEmbed 폴백
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      return res.status(200).json({
        title: d.title || "",
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        duration: 0,
        id,
        source: "oembed",
      });
    }
  } catch {}

  return res.status(500).json({ error: "영상 정보를 불러올 수 없습니다." });
}

// ── 라우터 ──────────────────────────────────────────────
const HANDLERS = {
  "info":           handleInfo,
  "stream":         handleStream,
  "url":            handleUrl,
  "distube-info":   handleDistubeInfo,
  "distube-stream": handleDistubeStream,
  "fetch":          handleFetch,
  "transcript":     handleTranscript,
  "dl":             handleDl,
};

export default async function handler(req, res) {
  const action = req.query.action;

  if (!action || !HANDLERS[action]) {
    // CORS도 세팅 (에러 응답도 CORS 필요)
    setCors(req, res);
    return res.status(400).json({
      error: "action 파라미터 필요",
      available: Object.keys(HANDLERS),
    });
  }

  return HANDLERS[action](req, res);
}

// 가장 높은 maxDuration(300s) 적용, 스트리밍용 responseLimit 해제
export const config = {
  maxDuration: 300,
  api: { responseLimit: false },
};
