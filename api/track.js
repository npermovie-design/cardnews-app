// 방문자 추적 API — Vercel Edge에서 geo 정보 수집 → Supabase 저장
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY
);

function setCors(req, res) {
  const origin = req.headers?.origin || "";
  const allowed = origin.includes("snsmakeit.com") || origin.includes("vercel.app") || origin.includes("localhost");
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || "log";

  // ── 방문 기록 ──
  if (action === "log" && req.method === "POST") {
    try {
      const country = req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"] || "unknown";
      const city = req.headers["x-vercel-ip-city"] || decodeURIComponent(req.headers["x-vercel-ip-city"] || "") || "unknown";
      const region = req.headers["x-vercel-ip-country-region"] || "";
      const lat = req.headers["x-vercel-ip-latitude"] || null;
      const lng = req.headers["x-vercel-ip-longitude"] || null;
      const ua = req.headers["user-agent"] || "";
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const page = body.page || "/";
      const referrer = body.referrer || "";

      // 디바이스 판별
      const isMobile = /mobile|android|iphone|ipad/i.test(ua);
      const device = isMobile ? "mobile" : "desktop";

      await sb.from("visitor_logs").insert({
        country, city, region, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null,
        page, referrer, device, ua: ua.slice(0, 200),
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── 통계 조회 (관리자용) ──
  if (action === "stats" && req.method === "GET") {
    try {
      const days = parseInt(req.query.days || "30");
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // 전체 방문 수
      const { count: totalVisits } = await sb.from("visitor_logs").select("id", { count: "exact", head: true }).gte("created_at", since);

      // 국가별 집계
      const { data: countryData } = await sb.from("visitor_logs").select("country").gte("created_at", since);
      const countryCounts = {};
      (countryData || []).forEach(r => { countryCounts[r.country] = (countryCounts[r.country] || 0) + 1; });

      // 도시별 집계
      const { data: cityData } = await sb.from("visitor_logs").select("city, country").gte("created_at", since);
      const cityCounts = {};
      (cityData || []).forEach(r => {
        const key = `${r.city}|${r.country}`;
        cityCounts[key] = (cityCounts[key] || 0) + 1;
      });

      // 일별 방문 추이
      const { data: dailyData } = await sb.from("visitor_logs").select("created_at").gte("created_at", since).order("created_at");
      const dailyCounts = {};
      (dailyData || []).forEach(r => {
        const d = r.created_at.slice(0, 10);
        dailyCounts[d] = (dailyCounts[d] || 0) + 1;
      });

      // 디바이스별
      const { data: deviceData } = await sb.from("visitor_logs").select("device").gte("created_at", since);
      const deviceCounts = {};
      (deviceData || []).forEach(r => { deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1; });

      // 페이지별
      const { data: pageData } = await sb.from("visitor_logs").select("page").gte("created_at", since);
      const pageCounts = {};
      (pageData || []).forEach(r => { pageCounts[r.page] = (pageCounts[r.page] || 0) + 1; });

      // 좌표 데이터 (지도용)
      const { data: geoData } = await sb.from("visitor_logs").select("lat, lng, country, city").gte("created_at", since).not("lat", "is", null);
      const geoPoints = {};
      (geoData || []).forEach(r => {
        const key = `${r.lat?.toFixed(1)},${r.lng?.toFixed(1)}`;
        if (!geoPoints[key]) geoPoints[key] = { lat: r.lat, lng: r.lng, country: r.country, city: r.city, count: 0 };
        geoPoints[key].count++;
      });

      // 리퍼러별
      const { data: refData } = await sb.from("visitor_logs").select("referrer").gte("created_at", since);
      const refCounts = {};
      (refData || []).forEach(r => {
        if (!r.referrer) return;
        try { const host = new URL(r.referrer).hostname || "직접 방문"; refCounts[host] = (refCounts[host] || 0) + 1; } catch { refCounts[r.referrer.slice(0, 50)] = (refCounts[r.referrer.slice(0, 50)] || 0) + 1; }
      });

      return res.status(200).json({
        totalVisits: totalVisits || 0,
        countries: Object.keys(countryCounts).length,
        cities: Object.keys(cityCounts).length,
        countryCounts,
        cityCounts,
        dailyCounts,
        deviceCounts,
        pageCounts: Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 20),
        geoPoints: Object.values(geoPoints),
        referrerCounts: Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
        days,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}
