import React, { useState, useRef } from "react";

const SNS_PLATFORMS = [
  { id: "instagram", label: "인스타그램", placeholder: "https://www.instagram.com/username", color: "#E1306C", match: /instagram\.com/ },
  { id: "youtube", label: "유튜브", placeholder: "https://www.youtube.com/@channel", color: "#FF0000", match: /youtube\.com|youtu\.be/ },
  { id: "tiktok", label: "틱톡", placeholder: "https://www.tiktok.com/@username", color: "#010101", match: /tiktok\.com/ },
  { id: "naver_blog", label: "네이버 블로그", placeholder: "https://blog.naver.com/username", color: "#03C75A", match: /blog\.naver\.com/ },
  { id: "threads", label: "스레드", placeholder: "https://www.threads.net/@username", color: "#000000", match: /threads\.net/ },
  { id: "x", label: "X (트위터)", placeholder: "https://x.com/username", color: "#000000", match: /x\.com|twitter\.com/ },
  { id: "facebook", label: "페이스북", placeholder: "https://www.facebook.com/page", color: "#1877F2", match: /facebook\.com/ },
  { id: "tistory", label: "티스토리", placeholder: "https://example.tistory.com", color: "#FF6B35", match: /tistory\.com/ },
  { id: "linkedin", label: "링크드인", placeholder: "https://www.linkedin.com/in/username", color: "#0A66C2", match: /linkedin\.com/ },
  { id: "other", label: "기타 SNS", placeholder: "https://...", color: "#888", match: null },
];

function detectPlatform(url) {
  for (const p of SNS_PLATFORMS) { if (p.match && p.match.test(url)) return p; }
  return SNS_PLATFORMS[SNS_PLATFORMS.length - 1];
}

function fmtNum(n) {
  if (!n && n !== 0) return "-";
  const num = typeof n === "string" ? parseInt(n.replace(/[^0-9]/g, "")) : n;
  if (isNaN(num)) return "-";
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  if (num >= 1000) return (num / 1000).toFixed(1) + "천";
  return num.toLocaleString();
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,"0")}.${String(date.getDate()).padStart(2,"0")}`;
}

function parseDuration(iso) {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0"), mi = parseInt(m[2] || "0"), s = parseInt(m[3] || "0");
  if (h > 0) return `${h}:${String(mi).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${mi}:${String(s).padStart(2,"0")}`;
}

export default function SocialAnalyzer({ isDark }) {
  const [links, setLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [channelData, setChannelData] = useState([]); // 플랫폼별 수집 데이터
  const reportRef = useRef(null);

  const acc = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a1a";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#999";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";

  const addLink = () => { if (links.length < 10) setLinks([...links, ""]); };
  const removeLink = (idx) => { if (links.length > 1) setLinks(links.filter((_, i) => i !== idx)); };
  const updateLink = (idx, val) => { const n = [...links]; n[idx] = val; setLinks(n); };
  const validLinks = links.filter(l => l.trim());

  // ── 유튜브 채널 데이터 + 최근 영상 ──
  const fetchYoutubeChannel = async (url) => {
    try {
      const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
      const channelIdMatch = url.match(/channel\/([a-zA-Z0-9_-]+)/);
      let channelId = channelIdMatch ? channelIdMatch[1] : null;
      let channelInfo = null;

      // forHandle로 직접 조회
      if (handleMatch) {
        const r = await fetch(`/api/youtube-search?action=channel-detail&forHandle=${handleMatch[1]}`);
        if (r.ok) {
          const d = await r.json();
          if (d?.items?.[0]) { channelInfo = d.items[0]; channelId = channelInfo.id; }
        }
      }
      // channelId로 조회
      if (!channelInfo && channelId) {
        const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${channelId}`);
        if (r.ok) { const d = await r.json(); if (d?.items?.[0]) channelInfo = d.items[0]; }
      }
      // 검색 fallback
      if (!channelInfo && handleMatch) {
        const sr = await fetch(`/api/youtube-search?action=channel-search&q=${encodeURIComponent("@" + handleMatch[1])}`);
        if (sr.ok) {
          const sd = await sr.json();
          channelId = sd?.items?.[0]?.channelId;
          if (channelId) {
            const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${channelId}`);
            if (r.ok) { const d = await r.json(); if (d?.items?.[0]) channelInfo = d.items[0]; }
          }
        }
      }
      if (!channelInfo) return null;

      const stats = channelInfo.statistics || {};
      const snippet = channelInfo.snippet || {};
      const subs = parseInt(stats.subscriberCount) || 0;
      const views = parseInt(stats.viewCount) || 0;
      const vids = parseInt(stats.videoCount) || 0;

      // 최근 영상 6개
      let recentVideos = [];
      if (channelId) {
        const vr = await fetch(`/api/youtube-search?action=channel-videos&channelId=${channelId}&maxResults=6`);
        if (vr.ok) { const vd = await vr.json(); recentVideos = vd.videos || []; }
      }

      return {
        type: "youtube",
        name: snippet.title || "",
        thumbnail: snippet.thumbnails?.medium?.url || "",
        banner: channelInfo.brandingSettings?.image?.bannerExternalUrl || "",
        subscribers: subs,
        totalViews: views,
        videoCount: vids,
        avgViews: vids > 0 ? Math.round(views / vids) : 0,
        description: (snippet.description || "").slice(0, 500),
        createdAt: snippet.publishedAt || "",
        recentVideos,
        // 계산 지표
        engagementRate: recentVideos.length > 0
          ? (recentVideos.reduce((s, v) => s + v.likeCount + v.commentCount, 0) / recentVideos.reduce((s, v) => s + v.viewCount, 0) * 100).toFixed(2)
          : 0,
        avgRecentViews: recentVideos.length > 0
          ? Math.round(recentVideos.reduce((s, v) => s + v.viewCount, 0) / recentVideos.length)
          : 0,
      };
    } catch { return null; }
  };

  // ── 페이지 크롤링 (비유튜브) ──
  const fetchPageCrawl = async (url) => {
    try {
      const r = await fetch("/api/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      if (!r.ok) return null;
      const d = await r.json();
      return d.text || null;
    } catch { return null; }
  };

  // ── 분석 실행 ──
  const analyze = async () => {
    if (validLinks.length === 0) return;
    setLoading(true); setError(null); setReport(null); setChannelData([]);

    try {
      setProgress("SNS 계정에 직접 접속하여 데이터를 수집 중...");
      const collected = [];

      for (let idx = 0; idx < validLinks.length; idx++) {
        const url = validLinks[idx];
        const platform = detectPlatform(url);
        setProgress(`${platform?.label || "SNS"} 데이터 수집 중... (${idx + 1}/${validLinks.length})`);

        if (platform?.id === "youtube") {
          const yt = await fetchYoutubeChannel(url);
          collected.push({ url, platform, data: yt, pageText: null });
        } else {
          const pageText = await fetchPageCrawl(url);
          collected.push({ url, platform, data: null, pageText });
        }
      }

      setChannelData(collected);
      setProgress("AI가 수집된 데이터를 분석하고 리포트를 작성 중...");

      // AI 분석 프롬프트 구성
      const details = collected.map((c, i) => {
        let info = `[계정 ${i+1}] ${c.platform?.label} | ${c.url}`;
        if (c.data) {
          const d = c.data;
          info += `\n채널명: ${d.name}\n구독자: ${d.subscribers.toLocaleString()}명\n총 조회수: ${d.totalViews.toLocaleString()}회\n영상 수: ${d.videoCount}개\n평균 조회수: ${d.avgViews.toLocaleString()}회\n최근 평균 조회수: ${d.avgRecentViews.toLocaleString()}회\n참여율: ${d.engagementRate}%\n채널 설명: ${d.description}`;
          if (d.recentVideos?.length) {
            info += "\n\n최근 영상:";
            d.recentVideos.forEach((v, vi) => { info += `\n${vi+1}. "${v.title}" - 조회수 ${v.viewCount.toLocaleString()} / 좋아요 ${v.likeCount.toLocaleString()} / 댓글 ${v.commentCount.toLocaleString()} (${fmtDate(v.publishedAt)})`; });
          }
        }
        if (c.pageText) info += `\n\n크롤링된 페이지 내용:\n${c.pageText.slice(0, 2000)}`;
        return info;
      }).join("\n\n===\n\n");

      const prompt = `SNS 마케팅 전문가로서 다음 계정들의 실제 수집 데이터를 분석하세요.

${details}

한국어로 작성. 이모지/특수기호 금지. 추정이 아닌 데이터 기반 분석.

## 채널 진단
각 계정별:
- 콘텐츠 카테고리와 주제
- 강점 3가지 (데이터 근거 포함)
- 약점 3가지 (데이터 근거 포함)
- 콘텐츠 품질 등급 (S/A/B/C/D)

## 경쟁 채널 분석
각 플랫폼별 동일 카테고리의 성공 채널 5개:
- 채널명 (실제 존재하는 채널)
- 구독자/팔로워 규모
- 벤치마킹 포인트
- 참고할 콘텐츠 예시 2개

## 성장 액션 플랜 (우선순위순)
1순위부터 10순위까지 구체적 액션:
- 각 액션의 예상 효과
- 실행 난이도 (상/중/하)
- 소요 시간

## 콘텐츠 전략
- 추천 콘텐츠 주제 10개 (구체적 제목)
- 최적 업로드 시간과 빈도
- 추천 해시태그/키워드 20개
- 썸네일/커버 전략`;

      const r = await fetch("/api/gemini-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 4000 }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "AI 분석 실패");
      const rd = await r.json();
      const aiText = rd?.text || "";
      if (!aiText) throw new Error("AI 응답 없음");

      setReport({ text: aiText, date: new Date().toLocaleString("ko-KR") });
      setProgress("");
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (e) {
      setError(e.message);
      setProgress("");
    } finally { setLoading(false); }
  };

  // ════════════════════════════════════════
  //  시각적 컴포넌트
  // ════════════════════════════════════════

  // 지표 카드
  const Stat = ({ label, value, sub, color, big }) => (
    <div style={{ flex: 1, minWidth: 110, padding: big ? "20px 16px" : "14px 12px", borderRadius: 14, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fb", border: `1px solid ${bdr}`, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 6, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: big ? 28 : 20, fontWeight: 900, color: color || text, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  // 프로그레스 바
  const ProgressBar = ({ value, max, color, label }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
      <div style={{ marginBottom: 8 }}>
        {label && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#666", fontWeight: 600 }}>{label}</span>
          <span style={{ color: color || acc, fontWeight: 700 }}>{fmtNum(value)}</span>
        </div>}
        <div style={{ height: 8, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#eee", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${color || acc}, ${color || acc}aa)`, transition: "width 0.8s ease" }} />
        </div>
      </div>
    );
  };

  // ── 유튜브 대시보드 ──
  const renderYoutubeDashboard = (d) => {
    const maxView = Math.max(...d.recentVideos.map(v => v.viewCount), 1);
    return (
      <>
        {/* 채널 헤더 */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          {d.thumbnail && <img src={d.thumbnail} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", border: "3px solid #FF000020" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: text }}>{d.name}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>채널 개설일: {fmtDate(d.createdAt)}</div>
          </div>
          <div style={{ padding: "6px 16px", borderRadius: 10, background: "#22c55e15", border: "1px solid #22c55e30", fontSize: 12, fontWeight: 700, color: "#22c55e" }}>API 데이터 수집 완료</div>
        </div>

        {/* 핵심 지표 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
          <Stat label="구독자" value={fmtNum(d.subscribers)} color="#FF0000" big />
          <Stat label="총 조회수" value={fmtNum(d.totalViews)} color="#FF4444" big />
          <Stat label="영상 수" value={fmtNum(d.videoCount)} color="#FF6666" big />
          <Stat label="평균 조회수" value={fmtNum(d.avgViews)} sub="영상당 전체" />
          <Stat label="최근 평균" value={fmtNum(d.avgRecentViews)} sub="최근 6개 영상" />
          <Stat label="참여율" value={`${d.engagementRate}%`} sub="좋아요+댓글/조회" />
        </div>

        {/* 최근 영상 조회수 차트 */}
        {d.recentVideos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>최근 영상 조회수</div>
            {d.recentVideos.map((v, vi) => (
              <ProgressBar key={vi} value={v.viewCount} max={maxView} color="#FF0000" label={v.title.length > 40 ? v.title.slice(0, 40) + "..." : v.title} />
            ))}
          </div>
        )}

        {/* 최근 영상 썸네일 그리드 */}
        {d.recentVideos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>최근 업로드 영상</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {d.recentVideos.map((v, vi) => (
                <a key={vi} href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${bdr}`, background: cardBg }}>
                    <div style={{ position: "relative" }}>
                      <img src={v.thumbnail} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{parseDuration(v.duration)}</div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text, lineHeight: 1.4, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 10, color: muted }}>
                        <span>조회 {fmtNum(v.viewCount)}</span>
                        <span>좋아요 {fmtNum(v.likeCount)}</span>
                        <span>댓글 {fmtNum(v.commentCount)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{fmtDate(v.publishedAt)}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── 크롤링 데이터 대시보드 ──
  const renderCrawlDashboard = (c) => (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `${c.platform?.color || acc}12`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${c.platform?.color || acc}25` }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: c.platform?.color || acc }}>{c.platform?.label?.[0] || "?"}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: text }}>{c.platform?.label || "SNS"}</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{c.url}</div>
        </div>
        {c.pageText && <div style={{ padding: "5px 12px", borderRadius: 8, background: `${acc}10`, fontSize: 11, fontWeight: 700, color: acc }}>페이지 크롤링 완료</div>}
      </div>
      {c.pageText && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb", border: `1px solid ${bdr}`, fontSize: 12, color: isDark ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7, maxHeight: 200, overflow: "hidden" }}>
          {c.pageText.slice(0, 500)}...
        </div>
      )}
    </div>
  );

  // ── 마크다운 → 시각적 섹션 렌더링 ──
  const renderReport = (md) => {
    if (!md) return null;
    const sections = md.split(/^## /m).filter(Boolean);
    return sections.map((sec, si) => {
      const lines = sec.split("\n");
      const title = lines[0]?.replace(/\*\*/g, "").trim();
      const body = lines.slice(1).join("\n").trim();
      return (
        <div key={si} style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: text, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${acc}20`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: acc }} />
            {title}
          </div>
          {body.split("\n").map((line, li) => {
            const t = line.trim();
            if (!t) return <div key={li} style={{ height: 8 }} />;
            if (t.startsWith("### ")) return <div key={li} style={{ fontSize: 14, fontWeight: 800, color: text, marginTop: 16, marginBottom: 8 }}>{t.replace(/^###\s*/, "").replace(/\*\*/g, "")}</div>;
            if (t.startsWith("- ") || t.startsWith("* ")) {
              const content = t.replace(/^[-*]\s*/, "");
              const parts = content.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={li} style={{ display: "flex", gap: 8, marginBottom: 5, paddingLeft: 4 }}>
                  <span style={{ color: acc, fontSize: 8, marginTop: 6 }}>●</span>
                  <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
                    {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
                  </span>
                </div>
              );
            }
            if (/^\d+[\.\)]\s/.test(t)) {
              const num = t.match(/^(\d+)/)[1];
              const content = t.replace(/^\d+[\.\)]\s*/, "");
              const parts = content.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={li} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "10px 14px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb", border: `1px solid ${bdr}` }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: `${acc}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: acc, flexShrink: 0 }}>{num}</span>
                  <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
                    {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
                  </span>
                </div>
              );
            }
            const parts = t.split(/(\*\*[^*]+\*\*)/g);
            return (
              <div key={li} style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "#555", lineHeight: 1.8, marginBottom: 3 }}>
                {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
              </div>
            );
          })}
        </div>
      );
    });
  };

  // ════════════════════════════════════════
  //  메인 렌더
  // ════════════════════════════════════════
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 60px" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 20, background: `${acc}15`, fontSize: 12, fontWeight: 700, color: acc, marginBottom: 12 }}>소셜분석기</div>
        <div style={{ fontSize: "clamp(22px,5vw,30px)", fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 6 }}>SNS 계정을 분석하고<br/>성장 전략을 제안해드려요</div>
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>SNS 프로필 링크를 입력하면 실제 데이터를 수집하여 분석합니다.</div>
      </div>

      {/* 입력 영역 */}
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px 20px", marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 16 }}>SNS 링크 입력</div>
        {links.map((link, idx) => {
          const det = link.trim() ? detectPlatform(link) : null;
          return (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: det ? `${det.color}12` : (isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1.5px solid ${det ? det.color + "30" : bdr}` }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: det?.color || muted }}>{det ? det.label.slice(0, 2) : idx + 1}</span>
              </div>
              <input value={link} onChange={e => updateLink(idx, e.target.value)} placeholder="SNS 프로필 URL" style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${det ? det.color + "35" : bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none" }} />
              {links.length > 1 && <button onClick={() => removeLink(idx)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {links.length < 10 && <button onClick={addLink} style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ 추가</button>}
          <button onClick={analyze} disabled={loading || !validLinks.length}
            style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: validLinks.length ? `linear-gradient(135deg, ${acc}, #8b5cf6)` : "#e5e7eb", color: validLinks.length ? "#fff" : muted, fontSize: 14, fontWeight: 800, cursor: validLinks.length ? "pointer" : "default" }}>
            {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />{progress}</span> : `분석 시작 (${validLinks.length}개)`}
          </button>
        </div>
        {error && <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a520", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</div>}
      </div>

      {/* 수집 데이터 대시보드 */}
      {channelData.map((c, i) => (
        <div key={i} style={{ background: cardBg, borderRadius: 20, border: `1px solid ${bdr}`, padding: "28px 24px", marginBottom: 20, boxShadow: isDark ? "none" : "0 2px 16px rgba(0,0,0,0.03)" }}>
          {c.data ? renderYoutubeDashboard(c.data) : renderCrawlDashboard(c)}
        </div>
      ))}

      {/* AI 분석 리포트 */}
      {report && (
        <div ref={reportRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: text }}>AI 분석 리포트</div>
              <div style={{ fontSize: 11, color: muted }}>{report.date}</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(report.text)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>텍스트 복사</button>
          </div>
          {renderReport(report.text)}
        </div>
      )}

      {/* 플랫폼 안내 (초기 상태) */}
      {!channelData.length && !loading && (
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 12 }}>지원 플랫폼</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {SNS_PLATFORMS.filter(p => p.id !== "other").map(p => (
              <span key={p.id} style={{ padding: "5px 12px", borderRadius: 16, background: `${p.color}10`, border: `1px solid ${p.color}20`, fontSize: 10, fontWeight: 600, color: p.color }}>{p.label}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>
            유튜브: YouTube Data API로 구독자/조회수/영상수/최근 영상 실제 수집 | 기타: 페이지 크롤링 + AI 분석
          </div>
        </div>
      )}
    </div>
  );
}
