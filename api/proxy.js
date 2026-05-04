// api/proxy.js — Klipy / Pexels / Pixabay API 프록시 통합
// ?action=klipy|pexels|pixabay

import { isAllowedOrigin } from "../lib/security.js";
function setCors(req, res) {
  const origin = req.headers.origin || req.headers.referer || "";
  res.setHeader("Access-Control-Allow-Origin", isAllowedOrigin(origin) ? origin : "https://snsmakeit.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Klipy ──
async function handleKlipy(req, res) {
  const KLIPY_KEY = process.env.KLIPY_KEY;
  if (!KLIPY_KEY) return res.status(500).json({ error: "KLIPY_KEY 미설정" });

  // path: gifs/search, gifs/trending, stickers/search, etc.
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: "path 필요" });

  const params = new URLSearchParams(req.query);
  params.delete("path");
  params.delete("action");

  try {
    const r = await fetch(`https://api.klipy.com/api/v1/${KLIPY_KEY}/${path}?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return res.status(r.status).json({ error: `Klipy API error: ${r.status}` });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Klipy API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Pexels ──
async function handlePexels(req, res) {
  const PEXELS_KEY = process.env.PEXELS_KEY;
  if (!PEXELS_KEY) return res.status(500).json({ error: "PEXELS_KEY 미설정" });

  // path: v1/search, v1/curated, videos/search, videos/popular
  const path = req.query.path || "v1/search";
  const params = new URLSearchParams(req.query);
  params.delete("path");
  params.delete("action");

  try {
    const r = await fetch(`https://api.pexels.com/${path}?${params.toString()}`, {
      headers: { Authorization: PEXELS_KEY },
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Pexels API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Pixabay ──
async function handlePixabay(req, res) {
  const PIXABAY_KEY = process.env.PIXABAY_KEY;
  if (!PIXABAY_KEY) return res.status(500).json({ error: "PIXABAY_KEY 미설정" });

  const isVideo = req.query.video === "true";
  const endpoint = isVideo ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";

  // 쿼리 파라미터 정리 (불필요한 파라미터 제거 후 key 추가)
  const params = new URLSearchParams(req.query);
  params.delete("key");
  params.delete("action");
  params.delete("video");
  params.set("key", PIXABAY_KEY);

  try {
    const r = await fetch(`${endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(r.status || 500).json({ error: "Pixabay 응답 파싱 실패: " + text.slice(0, 200) });
    }
  } catch (e) {
    return res.status(500).json({ error: "Pixabay API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Unsplash ──
async function handleUnsplash(req, res) {
  const UNSPLASH_KEY = process.env.UNSPLASH_KEY;
  if (!UNSPLASH_KEY) return res.status(500).json({ error: "UNSPLASH_KEY 미설정" });

  const query = req.query.query || req.query.q || "";
  const perPage = req.query.per_page || "5";
  const orientation = req.query.orientation || "landscape";

  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=${orientation}`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Unsplash API 호출 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Image Proxy (외부 이미지 → binary, 복사 시 base64 변환용) ──
async function handleImage(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "url 파라미터 필요" });

  // 허용 도메인 검증 (보안: 임의 URL fetch 방지)
  const allowed = ["images.unsplash.com", "images.pexels.com", "pixabay.com", "cdn.pixabay.com", "picsum.photos", "fastly.picsum.photos"];
  try {
    const parsed = new URL(url);
    if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d))) {
      return res.status(403).json({ error: "허용되지 않은 이미지 도메인" });
    }
  } catch {
    return res.status(400).json({ error: "잘못된 URL" });
  }

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SNSMakeIt/1.0)" },
    });
    if (!r.ok) return res.status(r.status).json({ error: `이미지 fetch 실패: ${r.status}` });

    const contentType = r.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await r.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).json({ error: "이미지 프록시 실패: " + (e.message || "").slice(0, 100) });
  }
}

// ── Router ──
import { rateLimit } from "../lib/security.js";
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!rateLimit(req, { limit: 60, windowMs: 60000 })) {
    return res.status(429).json({ error: "요청이 너무 많습니다" });
  }

  const action = req.query.action;

  switch (action) {
    case "klipy":
      return handleKlipy(req, res);
    case "pexels":
      return handlePexels(req, res);
    case "pixabay":
      return handlePixabay(req, res);
    case "unsplash":
      return handleUnsplash(req, res);
    case "image":
      return handleImage(req, res);
    default:
      return res.status(400).json({ error: "action 파라미터 필요: klipy|pexels|pixabay|unsplash|image" });
  }
}
