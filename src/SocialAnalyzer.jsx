import React, { useState, useRef } from "react";

const SNS_PLATFORMS = [
  { id: "instagram", label: "인스타그램", placeholder: "https://www.instagram.com/username", color: "#E1306C", match: /instagram\.com/ },
  { id: "youtube", label: "유튜브", placeholder: "https://www.youtube.com/@channel", color: "#FF0000", match: /youtube\.com|youtu\.be/ },
  { id: "tiktok", label: "틱톡", placeholder: "https://www.tiktok.com/@username", color: "#010101", match: /tiktok\.com/ },
  { id: "naver_blog", label: "네이버 블로그", placeholder: "https://blog.naver.com/username", color: "#03C75A", match: /blog\.naver\.com/ },
  { id: "threads", label: "스레드", placeholder: "https://www.threads.net/@username", color: "#000000", match: /threads\.net/ },
  { id: "x", label: "X", placeholder: "https://x.com/username", color: "#000000", match: /x\.com|twitter\.com/ },
  { id: "facebook", label: "페이스북", placeholder: "https://www.facebook.com/page", color: "#1877F2", match: /facebook\.com/ },
  { id: "tistory", label: "티스토리", placeholder: "https://example.tistory.com", color: "#FF6B35", match: /tistory\.com/ },
  { id: "other", label: "기타", placeholder: "https://...", color: "#888", match: null },
];
function detectPlatform(url) { for (const p of SNS_PLATFORMS) { if (p.match && p.match.test(url)) return p; } return SNS_PLATFORMS[SNS_PLATFORMS.length - 1]; }
function fmtNum(n) { if (!n && n !== 0) return "-"; const num = typeof n === "string" ? parseInt(n.replace(/[^0-9]/g, "")) : n; if (isNaN(num)) return "-"; if (num >= 100000000) return (num / 100000000).toFixed(1) + "억"; if (num >= 10000) return (num / 10000).toFixed(1) + "만"; if (num >= 1000) return (num / 1000).toFixed(1) + "천"; return num.toLocaleString(); }
function fmtDate(d) { if (!d) return ""; const dt = new Date(d); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; }
function parseDuration(iso) { if (!iso) return ""; const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return ""; const h = parseInt(m[1]||"0"), mi = parseInt(m[2]||"0"), s = parseInt(m[3]||"0"); return h > 0 ? `${h}:${String(mi).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${mi}:${String(s).padStart(2,"0")}`; }

// ── 키워드 검색량 조회 컴포넌트 ──
function KeywordVolume({ isDark }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const acc = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const r = await fetch(`/api/content?action=keyword-volume&q=${encodeURIComponent(query.trim())}`);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "조회 실패"); }
      const d = await r.json();
      setResults(d.keywords || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fmtN = (n) => {
    if (n === "< 10" || !n) return "< 10";
    const num = typeof n === "string" ? parseInt(n) : n;
    if (isNaN(num)) return String(n);
    return num.toLocaleString();
  };

  const compColor = (c) => c === "높음" ? "#ef4444" : c === "중간" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ marginBottom: 28, padding: 24, borderRadius: 16, border: `1px solid ${bdr}`, background: cardBg }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 6 }}>키워드 검색량 조회</div>
      <div style={{ fontSize: 12, color: muted, marginBottom: 16 }}>네이버 기준 월간 검색량, PC/모바일 비율, 경쟁도를 확인하세요. 쉼표로 여러 키워드 입력 가능 (최대 5개)</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder="키워드 입력 (예: AI 마케팅, 블로그 수익)"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f5f5f8", color: text, fontSize: 14, outline: "none" }} />
        <button onClick={search} disabled={loading || !query.trim()}
          style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading || !query.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>
          {loading ? "조회 중..." : "검색량 조회"}
        </button>
      </div>

      {error && <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {results && results.length > 0 && (
        <div>
          {/* 입력 키워드 요약 카드 */}
          {results.slice(0, 5).filter(r => query.toLowerCase().split(",").some(q => r.keyword.toLowerCase().includes(q.trim()))).slice(0, 3).map((kw, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, background: isDark ? "rgba(124,106,255,0.06)" : `${acc}04`, border: `1px solid ${acc}20`, marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 10 }}>{kw.keyword}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {[
                  ["월간 검색량", fmtN(kw.totalSearch), acc],
                  ["PC 검색량", fmtN(kw.monthlyPcQcCnt), "#3b82f6"],
                  ["모바일 검색량", fmtN(kw.monthlyMobileQcCnt), "#10b981"],
                  ["경쟁도", kw.compIdx || "-", compColor(kw.compIdx)],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ padding: "10px 12px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${bdr}`, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 연관 키워드 테이블 */}
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginTop: 16, marginBottom: 10 }}>연관 키워드</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                  {["키워드", "월간 검색량", "PC", "모바일", "경쟁도"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: muted, fontWeight: 700, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 20).map((kw, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${bdr}`, cursor: "pointer" }}
                    onClick={() => { try { navigator.clipboard.writeText(kw.keyword); } catch {} }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f8f8fc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px", fontWeight: 600, color: text }}>{kw.keyword}</td>
                    <td style={{ padding: "10px", fontWeight: 700, color: acc }}>{fmtN(kw.totalSearch)}</td>
                    <td style={{ padding: "10px", color: "#3b82f6" }}>{fmtN(kw.monthlyPcQcCnt)}</td>
                    <td style={{ padding: "10px", color: "#10b981" }}>{fmtN(kw.monthlyMobileQcCnt)}</td>
                    <td style={{ padding: "10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${compColor(kw.compIdx)}15`, color: compColor(kw.compIdx) }}>{kw.compIdx || "-"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>키워드 클릭 시 클립보드 복사 / 데이터: 네이버 검색광고 API</div>
        </div>
      )}

      {results && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: muted, fontSize: 13 }}>검색 결과가 없습니다</div>
      )}
    </div>
  );
}

// ── 실시간 키워드 트렌드 컴포넌트 ──
function TrendKeywords({ isDark }) {
  const [platform, setPlatform] = React.useState("google");
  const [data, setData] = React.useState({});
  const [loading, setLoading] = React.useState({});
  const [lastUpdate, setLastUpdate] = React.useState(null);

  const acc = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  const PLATFORMS = [
    { id: "google", label: "구글 트렌드", color: "#4285F4", icon: "G", desc: "실시간 급상승 검색어" },
    { id: "naver", label: "네이버", color: "#03C75A", icon: "N", desc: "인기 연관검색어" },
    { id: "youtube", label: "유튜브", color: "#FF0000", icon: "Y", desc: "인기 검색 자동완성" },
    { id: "reddit", label: "Reddit", color: "#FF4500", icon: "R", desc: "글로벌 커뮤니티 핫토픽" },
  ];

  const fetchTrend = React.useCallback(async (pid) => {
    if (data[pid] && Date.now() - (data[pid]._ts || 0) < 60000) return; // 1분 캐시
    setLoading(p => ({ ...p, [pid]: true }));
    try {
      const r = await fetch(`/api/content?action=trends&platform=${pid}`);
      if (r.ok) {
        const d = await r.json();
        setData(p => ({ ...p, [pid]: { ...d, _ts: Date.now() } }));
        setLastUpdate(new Date());
      }
    } catch {}
    setLoading(p => ({ ...p, [pid]: false }));
  }, [data]);

  React.useEffect(() => { Promise.all([fetchTrend("google"), fetchTrend("naver")]); }, []);
  React.useEffect(() => { fetchTrend(platform); }, [platform]);

  // 자동 갱신 (5분)
  React.useEffect(() => {
    const t = setInterval(() => { fetchTrend(platform); }, 300000);
    return () => clearInterval(t);
  }, [platform]);

  const changeIcon = (ch) => {
    if (ch === "new") return <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", letterSpacing: -0.5 }}>NEW</span>;
    if (ch === "up") return <span style={{ fontSize: 12, color: "#22c55e" }}>&#9650;</span>;
    if (ch === "down") return <span style={{ fontSize: 12, color: "#3b82f6" }}>&#9660;</span>;
    return <span style={{ fontSize: 10, color: muted }}>-</span>;
  };

  const renderList = (pid) => {
    const d = data[pid];
    if (loading[pid] && !d) return <div style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 13 }}>불러오는 중...</div>;
    if (!d?.keywords?.length) return <div style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 13 }}>데이터 없음</div>;
    const p = PLATFORMS.find(x => x.id === pid);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: p.color }}>{p.icon}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: text }}>{p.label} 실시간 검색어</div>
        </div>
        {d.keywords.slice(0, 10).map((kw, i) => (
          <div key={i} onClick={() => { try { navigator.clipboard.writeText(kw.keyword); } catch {} }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, marginBottom: 4, cursor: "pointer", background: i === 0 ? (isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.03)") : "transparent", transition: "background 0.12s" }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f8f8fc"}
            onMouseLeave={e => e.currentTarget.style.background = i === 0 ? (isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.03)") : "transparent"}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? `${acc}15` : (isDark ? "rgba(255,255,255,0.06)" : "#f0f0f4"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: i < 3 ? acc : muted, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw.keyword}</div>
              {kw.volume > 0 && <div style={{ fontSize: 10, color: muted, marginTop: 1 }}>검색량 {kw.volume.toLocaleString()}+</div>}
            </div>
            <div style={{ flexShrink: 0 }}>{changeIcon(kw.change)}</div>
          </div>
        ))}
      </div>
    );
  };

  const now = new Date();
  const timeStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} (${["일","월","화","수","목","금","토"][now.getDay()]}) ${now.getHours()}시`;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: "clamp(20px, 3.5vw, 26px)", fontWeight: 900, color: text, lineHeight: 1.3 }}>
            현재 이 시간,<br />실시간으로 뜨고 있는 검색어
          </div>
          <div style={{ fontSize: 13, color: muted, marginTop: 8 }}>{timeStr} 기준</div>
        </div>
        <button onClick={() => { setData({}); fetchTrend("google"); fetchTrend("naver"); fetchTrend(platform); }}
          style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          새로고침
        </button>
      </div>

      {/* 플랫폼 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, marginTop: 16 }}>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setPlatform(p.id)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            background: platform === p.id ? p.color : (isDark ? "rgba(255,255,255,0.06)" : "#f0f0f4"),
            color: platform === p.id ? "#fff" : muted,
          }}>{p.label}</button>
        ))}
      </div>

      {/* 2컬럼: 구글 트렌드(고정) + 선택 플랫폼 */}
      <div style={{ display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 700 ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${bdr}`, background: cardBg }}>
          {renderList("google")}
        </div>
        <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${bdr}`, background: cardBg }}>
          {renderList(platform === "google" ? "naver" : platform)}
        </div>
      </div>

      {/* 소스 설명 */}
      <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8fc", border: `1px solid ${bdr}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>데이터 소스 안내</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: muted, lineHeight: 1.6 }}>
          {PLATFORMS.map(p => (
            <span key={p.id}><span style={{ color: p.color, fontWeight: 700 }}>{p.icon}</span> {p.label}: {p.desc}</span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: muted, marginTop: 6, opacity: 0.7 }}>키워드 클릭 시 클립보드 복사 / 5분 자동 갱신</div>
      </div>
    </div>
  );
}

// ── 실시간 분석 페이지 (독립 메뉴) ──
export function RealtimeAnalyzer({ isDark }) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const acc = "#7c6aff";
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ padding: "4px 12px", borderRadius: 16, background: `${acc}12`, fontSize: 12, fontWeight: 700, color: acc }}>실시간 분석</span>
        <div style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: text, lineHeight: 1.3, marginTop: 10 }}>키워드 트렌드 + 검색량 조회</div>
        <div style={{ fontSize: 14, color: muted, marginTop: 6, lineHeight: 1.6 }}>실시간 트렌드를 확인하고, 키워드 검색량을 조회해서 글쓰기에 활용하세요.</div>
      </div>
      <TrendKeywords isDark={isDark} />
      <KeywordVolume isDark={isDark} />
    </div>
  );
}

export default function SocialAnalyzer({ isDark, user }) {
  const [links, setLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [channels, setChannels] = useState([]); // 수집 데이터
  const [reports, setReports] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [instaScreenshots, setInstaScreenshots] = useState({}); // {urlIndex: base64}

  const acc = "#7c6aff"; const text = isDark ? "#fff" : "#1a1a1a"; const muted = isDark ? "rgba(255,255,255,0.45)" : "#999";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff"; const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const validLinks = links.filter(l => l.trim());
  const addLink = () => { if (links.length < 10) setLinks([...links, ""]); };
  const removeLink = (i) => { if (links.length > 1) setLinks(links.filter((_, j) => j !== i)); };
  const updateLink = (i, v) => { const n = [...links]; n[i] = v; setLinks(n); };

  // ── 유튜브 채널 데이터 ──
  const fetchYoutube = async (url) => {
    try {
      const h = url.match(/@([a-zA-Z0-9_.-]+)/); const cid = url.match(/channel\/([a-zA-Z0-9_-]+)/);
      let info = null;
      if (h) { const r = await fetch(`/api/youtube-search?action=channel-detail&forHandle=${h[1]}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } }
      if (!info && cid) { const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${cid[1]}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } }
      if (!info && h) { const sr = await fetch(`/api/youtube-search?action=channel-search&q=${encodeURIComponent("@"+h[1])}`); if (sr.ok) { const sd = await sr.json(); const id = sd?.items?.[0]?.channelId; if (id) { const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${id}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } } } }
      if (!info) return null;
      const s = info.statistics || {}; const sn = info.snippet || {};
      const subs = parseInt(s.subscriberCount)||0, views = parseInt(s.viewCount)||0, vids = parseInt(s.videoCount)||0;
      let recent = [];
      if (info.id) { const vr = await fetch(`/api/youtube-search?action=channel-videos&channelId=${info.id}&maxResults=30`); if (vr.ok) { const vd = await vr.json(); recent = vd.videos || []; } }
      const avgRecent = recent.length > 0 ? Math.round(recent.reduce((a,v)=>a+v.viewCount,0)/recent.length) : 0;
      const engage = recent.length > 0 ? (recent.reduce((a,v)=>a+v.likeCount+v.commentCount,0) / Math.max(1, recent.reduce((a,v)=>a+v.viewCount,0)) * 100).toFixed(2) : "0";
      return { type:"youtube", name: sn.title||"", thumb: sn.thumbnails?.medium?.url||"", subs, views, vids, avgViews: vids>0?Math.round(views/vids):0, avgRecent, engage, desc: (sn.description||"").slice(0,500), created: sn.publishedAt||"", recent };
    } catch { return null; }
  };

  // ── SNS 프로필 크롤링 ──
  const fetchProfile = async (url) => {
    try {
      const r = await fetch("/api/content?action=sns-profile", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({url}) });
      if (!r.ok) return null; return await r.json();
    } catch { return null; }
  };

  // ── 인스타 Graph API (연동된 사용자) ──
  const fetchInstaApi = async (uid) => {
    try {
      const r = await fetch(`/api/insta-media?uid=${uid}`);
      if (!r.ok) return null;
      const d = await r.json();
      if (!d.connected) return null;
      const media = d.media || [];
      const totalLikes = media.reduce((s, m) => s + (m.like_count || 0), 0);
      const totalComments = media.reduce((s, m) => s + (m.comments_count || 0), 0);
      const avgLikes = media.length > 0 ? Math.round(totalLikes / media.length) : 0;
      const avgComments = media.length > 0 ? Math.round(totalComments / media.length) : 0;
      return {
        username: d.username, userId: d.userId,
        postCount: media.length, media,
        totalLikes, totalComments, avgLikes, avgComments,
        captions: media.map(m => m.caption).filter(Boolean).slice(0, 15),
      };
    } catch { return null; }
  };

  // ── 플랫폼별 개별 AI 분석 ──
  const buildPrompt = (c) => {
    let data = `플랫폼: ${c.plat?.label}\nURL: ${c.url}`;
    if (c.yt) {
      const d = c.yt;
      data += `\n채널명: ${d.name}\n구독자: ${d.subs.toLocaleString()}\n총조회수: ${d.views.toLocaleString()}\n영상수: ${d.vids}\n평균조회수: ${d.avgViews.toLocaleString()}\n최근평균: ${d.avgRecent.toLocaleString()}\n참여율: ${d.engage}%\n설명: ${d.desc}`;
      if (d.recent?.length) {
        data += "\n\n=== 최근 영상 (이 목록으로 카테고리와 활동 패턴을 판단하세요) ===";
        d.recent.forEach((v,i) => { data += `\n${i+1}. "${v.title}" | 조회 ${v.viewCount.toLocaleString()} | 좋아요 ${v.likeCount} | 댓글 ${v.commentCount} | ${fmtDate(v.publishedAt)}`; });
        // 업로드 간격 분석 데이터
        const dates = d.recent.map(v => new Date(v.publishedAt)).sort((a,b) => b-a);
        if (dates.length >= 2) {
          const gaps = [];
          for (let gi = 0; gi < dates.length - 1; gi++) gaps.push(Math.round((dates[gi] - dates[gi+1]) / 86400000));
          const avgGap = Math.round(gaps.reduce((s,g) => s+g, 0) / gaps.length);
          const maxGap = Math.max(...gaps);
          const daysSinceLast = Math.round((Date.now() - dates[0]) / 86400000);
          data += `\n\n=== 업로드 패턴 데이터 ===`;
          data += `\n평균 업로드 간격: ${avgGap}일`;
          data += `\n최대 공백: ${maxGap}일`;
          data += `\n마지막 업로드: ${daysSinceLast}일 전`;
          data += `\n분석 기간 영상 수: ${d.recent.length}개`;
        }
      }
    }
    if (c.instaApi) {
      const a = c.instaApi;
      data += "\n\n=== Instagram Graph API 실제 데이터 ===";
      data += `\n계정명: @${a.username}`;
      data += `\n게시물 수: ${a.postCount}`;
      data += `\n총 좋아요: ${a.totalLikes} (평균 ${a.avgLikes}/게시물)`;
      data += `\n총 댓글: ${a.totalComments} (평균 ${a.avgComments}/게시물)`;
      if (a.media?.length) {
        data += "\n\n최근 게시물:";
        a.media.slice(0, 10).forEach((m, mi) => {
          data += `\n${mi + 1}. [${m.media_type}] 좋아요 ${m.like_count} | 댓글 ${m.comments_count} | ${m.caption?.slice(0, 80) || "(캡션 없음)"} | ${m.timestamp?.slice(0, 10)}`;
        });
      }
      data += "\n=== API 데이터 끝 ===";
    }
    if (c.instaVision) {
      const v = c.instaVision;
      data += "\n\n=== 인스타그램 스크린샷에서 추출한 실제 데이터 ===";
      if (v.username) data += `\n계정명: @${v.username}`;
      if (v.name) data += `\n이름: ${v.name}`;
      if (v.followers) data += `\n팔로워: ${v.followers}`;
      if (v.following) data += `\n팔로잉: ${v.following}`;
      if (v.posts) data += `\n게시물: ${v.posts}`;
      if (v.bio) data += `\n바이오: ${v.bio}`;
      if (v.topics) data += `\n주제: ${v.topics}`;
      if (v.rawText) data += `\n전체 텍스트: ${v.rawText}`;
      data += "\n=== 스크린샷 데이터 끝 ===";
    }
    if (c.profile) {
      const m = c.profile.meta || {};
      if (m["og:title"]) data += `\n이름: ${m["og:title"]}`;
      if (m["og:description"]) data += `\n설명: ${m["og:description"]}`;
      if (m._visitors) data += `\n방문자: ${m._visitors}`;
      if (m._postCount) data += `\n게시글: ${m._postCount}`;
      if (c.profile.texts?.length) data += `\n\n=== 크롤링된 콘텐츠 (이 목록에서 포스팅 빈도와 주제를 분석하세요) ===\n${c.profile.texts.slice(0, 20).join("\n")}`;
      if (c.profile.dates?.length) {
        data += `\n\n=== 포스팅 날짜 목록 ===\n${c.profile.dates.slice(0, 20).join("\n")}`;
      }
    }

    const isInsta = c.plat?.id === "instagram";
    const instaExtra = isInsta ? `
[인스타그램 특별 지시]
데이터 수집이 제한되더라도 반드시 아래 내용을 모두 작성하세요:
- URL에서 계정명 "@${c.url.match(/instagram\.com\/([^/?]+)/)?.[1] || ""}"를 분석
- 이 계정명과 설명에서 파악 가능한 카테고리/분야를 기반으로 분석
- 인스타그램 해당 분야의 성공 공식, 트렌드, 콘텐츠 전략을 상세히 제시
- "데이터 부족" 같은 변명 없이 전문가 관점에서 최대한 분석` : "";

    const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    return `오늘 날짜는 ${today}입니다. 반드시 ${new Date().getFullYear()}년 기준으로 분석하세요. 2024년이 아닙니다.

SNS 전문 분석가로서 이 ${c.plat?.label} 계정을 분석하세요.
[핵심] 채널명/URL이 아닌, 영상 제목이나 크롤링 텍스트 등 실제 콘텐츠 기반으로 판단하세요.
${instaExtra}

${data}

한국어. 이모지/특수기호 금지. 마크다운 테이블 사용.
모든 섹션을 빠짐없이 작성하세요.

## 채널 진단
| 항목 | 분석 결과 |
|---|---|
| 콘텐츠 카테고리 | (실제 콘텐츠 기반) |
| 등급 | (S/A/B/C/D) |
| 강점 | (3가지) |
| 약점 | (3가지) |
| 타겟 | (구체적 오디언스) |

## 활동 패턴 분석
최근 게시물/영상의 업로드 날짜를 기반으로 활동 패턴을 분석하세요:

| 항목 | 분석 결과 |
|---|---|
| 평균 포스팅 빈도 | (주 n회 또는 월 n회) |
| 가장 활발한 요일 | (데이터 기반) |
| 가장 활발한 시간대 | (데이터 기반) |
| 최근 활동 공백 | (마지막 포스팅 이후 경과일) |
| 꾸준함 점수 | (10점 만점, 근거 포함) |
| 활동 추세 | (증가/유지/감소 + 설명) |

활동 공백이 있다면 구체적으로 언제부터 언제까지인지 지적하고, 개선 방안을 제시하세요.

## 30일 콘텐츠 주제
최근 1주일 트렌드와 관심도가 높은 키워드를 반영하여, 이 계정 분야에 맞는 한 달치 주제 30개:

| 일차 | 주제 |
|---|---|
| 1일 | (최근 트렌드 반영 구체적 주제) |
| 2일 | (구체적 주제) |
...30일까지 모두 작성. 최근 화제인 주제 우선.

## 키워드/해시태그
- 핵심 키워드 5개
- 롱테일 키워드 5개
- 추천 해시태그 10개

## 성장 로드맵
| 기간 | 목표 | 핵심 전략 |
|---|---|---|
| 1주 | (목표) | (바로 실행 액션 3가지) |
| 1개월 | (목표) | (전략) |
| 3개월 | (목표) | (전략) |
| 6개월 | (목표) | (전략) |
| 1년 | (목표) | (전략) |`;
  };

  // ── 인스타 스크린샷 → Gemini 비전으로 지표 추출 ──
  const analyzeInstaScreenshot = async (base64) => {
    const prompt = `이 인스타그램 프로필 스크린샷에서 다음 정보를 정확히 추출해주세요:
- 계정명 (아이디)
- 이름
- 팔로워 수
- 팔로잉 수
- 게시물 수
- 프로필 설명(바이오)
- 보이는 게시물 내용/주제

JSON 형식으로 응답:
{"username":"","name":"","followers":0,"following":0,"posts":0,"bio":"","topics":"","rawText":"화면에서 읽은 모든 텍스트"}`;
    try {
      const r = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 1000, imageBase64: base64.split(",")[1], imageMimeType: "image/png" }) });
      if (!r.ok) return null;
      const d = await r.json();
      const text = d?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { rawText: text };
    } catch { return null; }
  };

  const fetchAiReport = async (c) => {
    const prompt = buildPrompt(c);
    const r = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 6000 }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "AI 실패");
    const rd = await r.json();
    return rd?.text || "";
  };

  // ── 분석 ──
  const analyze = async () => {
    if (!validLinks.length) return;
    setLoading(true); setError(null); setChannels([]); setReports({}); setActiveTab("overview");
    try {
      // 1단계: 데이터 수집
      const collected = [];
      for (let i = 0; i < validLinks.length; i++) {
        const url = validLinks[i]; const plat = detectPlatform(url);
        setProgress(`${plat?.label} 데이터 수집 중... (${i + 1}/${validLinks.length})`);
        if (plat?.id === "youtube") {
          collected.push({ url, plat, yt: await fetchYoutube(url) });
        } else if (plat?.id === "instagram") {
          // 인스타: 1순위 Graph API 연동 → 2순위 스크린샷 → 3순위 크롤링
          let instaData = null;
          if (user?.id) {
            setProgress("인스타그램 연동 데이터 확인 중...");
            instaData = await fetchInstaApi(user.id);
          }
          if (instaData) {
            collected.push({ url, plat, profile: null, instaApi: instaData });
          } else if (instaScreenshots[i]) {
            setProgress("인스타그램 스크린샷 분석 중...");
            const visionData = await analyzeInstaScreenshot(instaScreenshots[i]);
            collected.push({ url, plat, profile: null, instaVision: visionData });
          } else {
            collected.push({ url, plat, profile: await fetchProfile(url) });
          }
        } else {
          collected.push({ url, plat, profile: await fetchProfile(url) });
        }
      }
      setChannels(collected);
      setActiveTab("ch0"); // 첫 번째 탭 자동 선택

      // 2단계: 플랫폼별 개별 AI 분석 (병렬)
      setProgress("AI 분석 리포트 생성 중...");
      const reportPromises = collected.map((c, i) =>
        fetchAiReport(c).then(text => ({ key: `ch${i}`, text })).catch(() => ({ key: `ch${i}`, text: "분석 중 오류가 발생했습니다." }))
      );
      const results = await Promise.all(reportPromises);
      const rMap = {};
      results.forEach(r => { rMap[r.key] = r.text; });
      setReports(rMap);
      setProgress("");
    } catch (e) { setError(e.message); setProgress(""); } finally { setLoading(false); }
  };

  // ════════════════════════════════
  //  컴포넌트
  // ════════════════════════════════
  const Card = ({children, style:s}) => <div style={{background:cardBg, borderRadius:14, border:`1px solid ${bdr}`, padding:"20px 18px", ...s}}>{children}</div>;
  const Stat = ({label,value,sub,color}) => (
    <div style={{textAlign:"center",flex:1,minWidth:80}}>
      <div style={{fontSize:10,fontWeight:600,color:muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:color||text,letterSpacing:-0.5}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:muted,marginTop:2}}>{sub}</div>}
    </div>
  );
  const Grade = ({g}) => { const c={S:"#7c6aff",A:"#22c55e",B:"#3b82f6",C:"#f59e0b",D:"#ef4444"}[g]||muted; return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:10,background:`${c}15`,border:`2px solid ${c}40`,fontSize:18,fontWeight:900,color:c}}>{g}</span>; };
  const Bar = ({value,max,color,label}) => { const pct=max>0?Math.min(100,value/max*100):0; return (
    <div style={{marginBottom:6}}>
      {label&&<div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:isDark?"rgba(255,255,255,0.6)":"#666",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{label}</span><span style={{color:color||acc,fontWeight:700,flexShrink:0}}>{fmtNum(value)}</span></div>}
      <div style={{height:6,borderRadius:3,background:isDark?"rgba(255,255,255,0.06)":"#eee",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:color||acc,transition:"width 0.6s"}}/></div>
    </div>
  );};

  // ── 유튜브 탭 ──
  const YtTab = ({d}) => { const mx = Math.max(...d.recent.map(v=>v.viewCount),1); return (
    <div>
      {/* 상단: 프로필 + 핵심 지표 */}
      <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:20}}>
        {d.thumb&&<img src={d.thumb} alt="" style={{width:56,height:56,borderRadius:14,objectFit:"cover",border:"2px solid #FF000020"}}/>}
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:text}}>{d.name}</div>
          <div style={{fontSize:11,color:muted}}>개설일 {fmtDate(d.created)}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",background:isDark?"rgba(255,255,255,0.02)":"#f8f9fb",borderRadius:12,padding:"16px 12px",border:`1px solid ${bdr}`}}>
        <Stat label="구독자" value={fmtNum(d.subs)} color="#FF0000"/>
        <Stat label="총 조회수" value={fmtNum(d.views)} color="#FF4444"/>
        <Stat label="영상 수" value={fmtNum(d.vids)}/>
        <Stat label="최근 평균" value={fmtNum(d.avgRecent)} sub="최근10개"/>
        <Stat label="참여율" value={`${d.engage}%`} sub="좋아요+댓글"/>
      </div>
      {/* 조회수 추이 차트 (SVG) */}
      {d.recent.length >= 3 && (() => {
        const sorted = [...d.recent].sort((a,b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        const maxV = Math.max(...sorted.map(v => v.viewCount), 1);
        const W = 760, H = 140, padL = 50, padR = 20, padT = 10, padB = 30;
        const chartW = W - padL - padR, chartH = H - padT - padB;
        const points = sorted.map((v, i) => ({ x: padL + (i / (sorted.length - 1)) * chartW, y: padT + chartH - (v.viewCount / maxV) * chartH, v }));
        const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const areaD = pathD + ` L${points[points.length-1].x},${padT+chartH} L${points[0].x},${padT+chartH} Z`;
        return (
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>조회수 추이</div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
              <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF0000" stopOpacity="0.15"/><stop offset="100%" stopColor="#FF0000" stopOpacity="0"/></linearGradient></defs>
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => <line key={i} x1={padL} y1={padT + chartH * (1-r)} x2={W-padR} y2={padT + chartH * (1-r)} stroke={isDark?"rgba(255,255,255,0.06)":"#eee"} strokeWidth="1"/>)}
              <path d={areaD} fill="url(#vg)"/>
              <path d={pathD} fill="none" stroke="#FF0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#FF0000" stroke="#fff" strokeWidth="2"/>)}
              {points.map((p, i) => <text key={`l${i}`} x={p.x} y={padT + chartH + 18} textAnchor="middle" fontSize="9" fill={isDark?"rgba(255,255,255,0.4)":"#999"}>{fmtDate(p.v.publishedAt).slice(5)}</text>)}
              {[0, 0.5, 1].map((r, i) => <text key={`y${i}`} x={padL - 6} y={padT + chartH * (1-r) + 4} textAnchor="end" fontSize="9" fill={isDark?"rgba(255,255,255,0.4)":"#999"}>{fmtNum(Math.round(maxV * r))}</text>)}
            </svg>
          </Card>
        );
      })()}
      {/* 2열: 조회수 바 차트 + 최근 영상 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>영상별 조회수</div>
          {d.recent.slice(0,6).map((v,i)=><Bar key={i} value={v.viewCount} max={mx} color="#FF0000" label={v.title.length>25?v.title.slice(0,25)+"...":v.title}/>)}
        </Card>
        <Card><div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>최근 업로드</div>
          {d.recent.slice(0,4).map((v,i)=>(
            <a key={i} href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" style={{display:"flex",gap:10,marginBottom:10,textDecoration:"none",color:"inherit"}}>
              <img src={v.thumbnail} alt="" style={{width:80,height:45,borderRadius:6,objectFit:"cover",flexShrink:0}}/>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:13,fontWeight:700,color:text,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</div>
                <div style={{fontSize:9,color:muted,marginTop:3}}>조회 {fmtNum(v.viewCount)} | {fmtDate(v.publishedAt)}</div>
              </div>
            </a>
          ))}
        </Card>
      </div>
    </div>
  );};

  // ── 프로필 탭 (비유튜브) ──
  const ProfileTab = ({c}) => { const m = c.profile?.meta||{}; const v = c.instaVision; const ia = c.instaApi; const ogT=ia?.username?`@${ia.username}`:(v?.name||v?.username||m["og:title"]||m._title||""); const ogD=v?.bio||m["og:description"]||m.description||""; const ogI=m["og:image"]||""; return (
    <div>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
        {ogI?<img src={ogI} alt="" style={{width:56,height:56,borderRadius:14,objectFit:"cover",border:`2px solid ${c.plat?.color||acc}20`}} onError={e=>{e.target.style.display="none"}}/>:
          <div style={{width:56,height:56,borderRadius:14,background:`${c.plat?.color||acc}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:22,fontWeight:900,color:c.plat?.color||acc}}>{c.plat?.label?.[0]}</span></div>}
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:text}}>{ogT||c.url.replace(/https?:\/\/(www\.)?/,"").split("/").slice(0,2).join("/")}</div>
          {ogD&&<div style={{fontSize:12,color:muted,marginTop:4,lineHeight:1.5}}>{ogD.slice(0,120)}{ogD.length>120?"...":""}</div>}
        </div>
      </div>
      {/* 지표 카드 */}
      {(ia||v?.followers||v?.posts||m._visitors||m._neighbors||m._postCount)&&(
        <div style={{display:"flex",gap:8,marginBottom:16,background:isDark?"rgba(255,255,255,0.02)":"#f8f9fb",borderRadius:12,padding:"16px 12px",border:`1px solid ${bdr}`,flexWrap:"wrap"}}>
          {ia&&<><Stat label="게시물" value={fmtNum(ia.postCount)} color="#E1306C"/><Stat label="평균 좋아요" value={fmtNum(ia.avgLikes)} color="#E1306C"/><Stat label="평균 댓글" value={fmtNum(ia.avgComments)} color="#E1306C"/><Stat label="총 좋아요" value={fmtNum(ia.totalLikes)} color="#E1306C"/></>}
          {v?.followers&&<Stat label="팔로워" value={fmtNum(v.followers)} color={c.plat?.color}/>}
          {v?.following&&<Stat label="팔로잉" value={fmtNum(v.following)} color={c.plat?.color}/>}
          {v?.posts&&<Stat label="게시물" value={fmtNum(v.posts)} color={c.plat?.color}/>}
          {m._visitors&&<Stat label="방문자" value={m._visitors} color={c.plat?.color}/>}
          {m._neighbors&&<Stat label="이웃" value={m._neighbors} color={c.plat?.color}/>}
          {m._postCount&&<Stat label="게시글" value={m._postCount} color={c.plat?.color}/>}
        </div>
      )}
      {ia&&<div style={{padding:"8px 12px",borderRadius:8,background:"#22c55e10",border:"1px solid #22c55e20",fontSize:13,color:"#22c55e",fontWeight:700,marginBottom:16}}>Instagram Graph API 데이터 수집 완료</div>}
      {v&&!ia&&<div style={{padding:"8px 12px",borderRadius:8,background:"#22c55e10",border:"1px solid #22c55e20",fontSize:13,color:"#22c55e",fontWeight:700,marginBottom:16}}>스크린샷에서 데이터 추출 완료</div>}
      {/* 인스타 API: 최근 게시물 좋아요 차트 */}
      {ia?.media?.length >= 3 && (() => {
        const sorted = [...ia.media].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
        const maxV = Math.max(...sorted.map(m=>m.like_count),1);
        return <Card style={{marginBottom:16}}><div style={{fontSize:14,fontWeight:800,color:text,marginBottom:12}}>게시물 좋아요 추이</div>
          {sorted.slice(-8).map((m,i)=><Bar key={i} value={m.like_count} max={maxV} color="#E1306C" label={(m.caption||"게시물").slice(0,30)+(m.caption?.length>30?"...":"")}/>)}
        </Card>;
      })()}
      {c.profile?.texts?.length>0&&(
        <Card><div style={{fontSize:12,fontWeight:700,color:text,marginBottom:10}}>수집된 콘텐츠 ({c.profile.texts.length}개)</div>
          {c.profile.texts.slice(0,8).map((t,i)=><div key={i} style={{fontSize:11,color:isDark?"rgba(255,255,255,0.6)":"#666",lineHeight:1.6,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${c.plat?.color||acc}30`}}>{t.slice(0,100)}</div>)}
        </Card>
      )}
      {!c.profile?.texts?.length&&!m._visitors&&!ogD&&(
        <Card style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>데이터 수집 제한</div>
          <div style={{fontSize:12,color:muted,lineHeight:1.6}}>이 플랫폼은 서버 크롤링이 제한되어 수집 가능한 데이터가 적습니다.<br/>AI가 URL과 플랫폼 특성을 기반으로 분석합니다.</div>
        </Card>
      )}
    </div>
  );};

  // ── 리포트 렌더 ──
  const renderReport = (md) => {
    if (!md) return null;
    const sections = md.split(/^## /m).filter(Boolean);
    const sColors = ["#7c6aff","#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
    return sections.map((sec,si) => {
      const lines = sec.split("\n"); const title = lines[0]?.replace(/\*\*/g,"").trim();
      const body = lines.slice(1); const elements = []; let tbl = []; let k = 0;
      const flush = () => { if (tbl.length>=2) { const rows=tbl.map(l=>l.split("|").map(c=>c.trim()).filter(Boolean)); const hdr=rows[0]; const data=rows.filter((_,i)=>i>0&&!rows[i].every(c=>/^[-:]+$/.test(c)));
        elements.push(<div key={`t${k++}`} style={{overflowX:"auto",marginBottom:16}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}><thead><tr>{hdr.map((h,i)=><th key={i} style={{padding:"12px 16px",background:isDark?`${sColors[si%7]}10`:`${sColors[si%7]}08`,borderBottom:`2px solid ${sColors[si%7]}25`,textAlign:"left",fontWeight:800,color:text,fontSize:14,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{data.map((row,ri)=><tr key={ri} style={{background:ri%2?isDark?"rgba(255,255,255,0.01)":"rgba(0,0,0,0.01)":"transparent"}}>{row.map((cell,ci)=>{const gm=cell.match(/^([SABCD])등급?$/i); const dm=cell.match(/^(상|중|하)$/); return <td key={ci} style={{padding:"12px 16px",borderBottom:`1px solid ${bdr}`,color:isDark?"rgba(255,255,255,0.8)":"#333",fontSize:15,lineHeight:1.7,verticalAlign:"top"}}>{gm?<Grade g={gm[1]}/>:dm?<span style={{padding:"2px 8px",borderRadius:4,background:dm[1]==="하"?"#22c55e15":dm[1]==="중"?"#f59e0b15":"#ef444415",color:dm[1]==="하"?"#22c55e":dm[1]==="중"?"#f59e0b":"#ef4444",fontSize:13,fontWeight:700}}>{cell}</span>:linkify(cell)}</td>;})}</tr>)}</tbody></table></div>);
      } tbl=[]; };
      const linkify = (s) => { if (!s) return s; const clean = s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""); return clean.split(/(https?:\/\/[^\s|)]+)/g).map((p,i)=>/^https?:\/\//.test(p)?<a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{color:acc,fontWeight:700,textDecoration:"underline"}}>{p.replace(/https?:\/\/(www\.)?/,"").slice(0,35)}</a>:p.split(/(\*\*[^*]+\*\*)/g).map((q,j)=>q.startsWith("**")&&q.endsWith("**")?<strong key={j} style={{fontWeight:800,color:text}}>{q.slice(2,-2)}</strong>:q)); };
      body.forEach(line => { const t=line.trim(); if(t.startsWith("|")&&t.endsWith("|")){tbl.push(t);return;} if(tbl.length)flush();
        if(!t){elements.push(<div key={`s${k++}`} style={{height:4}}/>);return;}
        if(t.startsWith("### ")){elements.push(<div key={`h${k++}`} style={{fontSize:16,fontWeight:800,color:text,marginTop:18,marginBottom:8}}>{t.replace(/^###\s*/,"").replace(/\*\*/g,"")}</div>);return;}
        if(t.startsWith("- ")||t.startsWith("* ")){elements.push(<div key={`l${k++}`} style={{display:"flex",gap:8,marginBottom:6,paddingLeft:4}}><span style={{color:sColors[si%7],fontSize:7,marginTop:8}}>●</span><span style={{fontSize:15,color:isDark?"rgba(255,255,255,0.8)":"#333",lineHeight:1.7}}>{linkify(t.replace(/^[-*]\s*/,""))}</span></div>);return;}
        if(/^\d+[\.\)]/.test(t)){const n=t.match(/^(\d+)/)[1];elements.push(<div key={`n${k++}`} style={{display:"flex",gap:10,marginBottom:8,padding:"10px 14px",borderRadius:10,background:isDark?"rgba(255,255,255,0.02)":"#f9fafb",border:`1px solid ${bdr}`}}><span style={{width:26,height:26,borderRadius:8,background:`${sColors[si%7]}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:sColors[si%7],flexShrink:0}}>{n}</span><span style={{fontSize:15,color:isDark?"rgba(255,255,255,0.8)":"#333",lineHeight:1.7}}>{linkify(t.replace(/^\d+[\.\)]\s*/,""))}</span></div>);return;}
        elements.push(<div key={`p${k++}`} style={{fontSize:15,color:isDark?"rgba(255,255,255,0.7)":"#444",lineHeight:1.8,marginBottom:4}}>{linkify(t)}</div>);
      }); if(tbl.length)flush();
      return <Card key={si} style={{marginBottom:18}}><div style={{fontSize:18,fontWeight:900,color:text,marginBottom:16,paddingBottom:12,borderBottom:`2px solid ${sColors[si%7]}25`,display:"flex",alignItems:"center",gap:10}}><div style={{width:4,height:22,borderRadius:2,background:sColors[si%7]}}/>{title}</div>{elements}</Card>;
    });
  };

  // ════════════════════════════════
  //  메인 렌더
  // ════════════════════════════════
  const hasData = channels.length > 0;

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px 60px"}}>
      {/* 헤더 */}
      <div style={{marginBottom:20}}>
        <span style={{padding:"4px 12px",borderRadius:16,background:`${acc}12`,fontSize:12,fontWeight:700,color:acc}}>SNS분석</span>
        <div style={{fontSize:"clamp(22px,4vw,30px)",fontWeight:900,color:text,lineHeight:1.3,marginTop:10}}>SNS 분석 + 키워드 트렌드</div>
        <div style={{fontSize:14,color:muted,marginTop:6,lineHeight:1.6}}>실시간 트렌드 키워드를 확인하고, SNS 계정을 AI가 분석합니다.</div>
      </div>

      {/* SNS 계정 분석 - 사용 가이드 */}
      {!hasData && !loading && (
        <Card style={{marginBottom:16,background:isDark?"rgba(124,106,255,0.04)":`${acc}04`,border:`1px solid ${acc}15`}}>
          <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:10}}>사용 방법</div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            {[
              {n:"1",t:"SNS 프로필 링크 입력",d:"유튜브, 블로그, 인스타 등 분석할 계정 URL을 입력하세요"},
              {n:"2",t:"AI가 데이터 수집",d:"유튜브는 구독자/조회수/영상 데이터를 실시간 수집합니다"},
              {n:"3",t:"분석 리포트 확인",d:"채널 진단, 경쟁 분석, 30일 콘텐츠 플랜을 받아보세요"},
            ].map((s,i) => (
              <div key={i} style={{flex:1,minWidth:160}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{width:24,height:24,borderRadius:8,background:`${acc}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:acc}}>{s.n}</span>
                  <span style={{fontSize:13,fontWeight:700,color:text}}>{s.t}</span>
                </div>
                <div style={{fontSize:12,color:muted,lineHeight:1.5,paddingLeft:32}}>{s.d}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 입력 */}
      {!hasData && (
        <Card style={{marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:14}}>SNS 링크 입력</div>
          {links.map((l,i) => { const d=l.trim()?detectPlatform(l):null; const isInsta=d?.id==="instagram"; return (
            <div key={i}>
              <div style={{display:"flex",gap:6,marginBottom:isInsta?4:8}}>
                <div style={{width:32,height:32,borderRadius:8,background:d?`${d.color}12`:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1.5px solid ${d?d.color+"30":bdr}`}}><span style={{fontSize:9,fontWeight:800,color:d?.color||muted}}>{d?d.label.slice(0,2):i+1}</span></div>
                <input value={l} onChange={e=>updateLink(i,e.target.value)} placeholder="SNS 프로필 URL" style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${d?d.color+"30":bdr}`,background:inputBg,color:text,fontSize:13,outline:"none"}}/>
                {links.length>1&&<button onClick={()=>removeLink(i)} style={{width:28,height:28,borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer"}}>x</button>}
              </div>
              {/* 인스타그램: 스크린샷 업로드 안내 */}
              {isInsta && (
                <div style={{marginLeft:38,marginBottom:10,padding:"10px 14px",borderRadius:10,background:isDark?"rgba(225,48,108,0.06)":"#fdf2f8",border:"1px solid #E1306C20"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#E1306C",marginBottom:6}}>인스타그램 프로필 스크린샷을 올려주세요</div>
                  <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.5}}>인스타그램은 보안 정책으로 서버 수집이 불가합니다. 프로필 화면을 캡처해서 올리면 AI가 팔로워/게시물 등을 정확히 분석합니다.</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <label style={{padding:"6px 14px",borderRadius:8,background:"#E1306C",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                      {instaScreenshots[i] ? "다른 스크린샷 선택" : "스크린샷 업로드"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader(); reader.onload = () => setInstaScreenshots(prev => ({...prev, [i]: reader.result})); reader.readAsDataURL(file);
                      }}/>
                    </label>
                    {instaScreenshots[i] && <span style={{fontSize:11,color:"#22c55e",fontWeight:700}}>업로드 완료</span>}
                  </div>
                  {instaScreenshots[i] && <img src={instaScreenshots[i]} alt="" style={{marginTop:8,maxHeight:120,borderRadius:8,border:`1px solid ${bdr}`}}/>}
                </div>
              )}
            </div>
          );})}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            {links.length<10&&<button onClick={addLink} style={{padding:"8px 16px",borderRadius:8,border:`1.5px dashed ${bdr}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ 추가</button>}
            <button onClick={analyze} disabled={loading||!validLinks.length} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:validLinks.length?`linear-gradient(135deg,${acc},#8b5cf6)`:"#e5e7eb",color:validLinks.length?"#fff":muted,fontSize:13,fontWeight:800,cursor:validLinks.length?"pointer":"default"}}>
              {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>{progress}</span>:`분석 시작 (${validLinks.length}개)`}
            </button>
          </div>
          {error&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:"1px solid #fca5a520",fontSize:12,color:"#dc2626",fontWeight:600}}>{error}</div>}
        </Card>
      )}

      {/* 탭 네비게이션 */}
      {hasData && (
        <>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16,padding:"4px",background:isDark?"rgba(255,255,255,0.03)":"#f3f4f6",borderRadius:12}}>
            {channels.map((c,i) => {
              const isActive = activeTab === `ch${i}`;
              return <button key={i} onClick={()=>setActiveTab(`ch${i}`)} style={{padding:"8px 16px",borderRadius:10,border:"none",background:isActive?cardBg:"transparent",color:isActive?c.plat?.color||acc:muted,fontSize:12,fontWeight:isActive?800:500,cursor:"pointer",boxShadow:isActive?(isDark?"none":"0 1px 4px rgba(0,0,0,0.08)"):"none",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                <span style={{width:8,height:8,borderRadius:4,background:c.plat?.color||acc,opacity:isActive?1:0.3}}/>
                {c.plat?.label}
              </button>;
            })}
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              <button onClick={()=>window.print()} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>PDF 저장</button>
              <button onClick={()=>{setChannels([]);setReports({});setActiveTab("overview");}} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>다시 분석</button>
            </div>
          </div>

          {/* 탭 콘텐츠: 대시보드 + 해당 플랫폼 AI 리포트 */}
          {channels.map((c,i) => activeTab===`ch${i}` && (
            <div key={i}>
              {c.yt ? <YtTab d={c.yt}/> : <ProfileTab c={c}/>}
              {/* 해당 플랫폼 AI 리포트 */}
              {reports[`ch${i}`] ? (
                <div style={{marginTop:20}}>{renderReport(reports[`ch${i}`])}</div>
              ) : loading && (
                <Card style={{marginTop:20,textAlign:"center",padding:"40px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:acc,fontSize:13,fontWeight:700}}>
                    <span style={{width:14,height:14,border:`2px solid ${acc}40`,borderTop:`2px solid ${acc}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>
                    AI 분석 중...
                  </div>
                </Card>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
