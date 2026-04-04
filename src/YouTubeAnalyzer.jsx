import { useState, useEffect } from "react";

const DURATION_OPTS = [
  { id: "", label: "전체" },
  { id: "short", label: "숏폼 (4분 미만)" },
  { id: "medium", label: "미드폼 (4~20분)" },
  { id: "long", label: "롱폼 (20분 이상)" },
];

const FORMAT_PRESETS = [
  { id: "", label: "전체", icon: "📺" },
  { id: "short", label: "숏폼/쇼츠", icon: "📱" },
  { id: "long", label: "롱폼", icon: "🎬" },
];

const PERIOD_OPTS = [
  { id: "", label: "전체" },
  { id: "1h", label: "1시간" },
  { id: "1d", label: "오늘" },
  { id: "1w", label: "이번 주" },
  { id: "1m", label: "이번 달" },
  { id: "1y", label: "올해" },
];

const ORDER_OPTS = [
  { id: "relevance", label: "관련성" },
  { id: "viewCount", label: "조회수" },
  { id: "date", label: "업로드 날짜" },
  { id: "rating", label: "평점" },
];

const RATIO_LEVELS = [
  { id: 0, label: "전체", color: "#888" },
  { id: 1, label: "1단계 (아주 낮음)", color: "#94a3b8" },
  { id: 2, label: "2단계 (낮음)", color: "#60a5fa" },
  { id: 3, label: "3단계 (보통~1:1)", color: "#4ade80" },
  { id: 4, label: "4단계 (높음)", color: "#fbbf24" },
  { id: 5, label: "5단계 (매우 높음)", color: "#ef4444" },
];

const SUB_PRESETS = [
  { label: "전체", min: 0, max: Infinity },
  { label: "~1천", min: 0, max: 1000 },
  { label: "1천~5천", min: 1000, max: 5000 },
  { label: "5천~1만", min: 5000, max: 10000 },
  { label: "1만~5만", min: 10000, max: 50000 },
  { label: "5만~10만", min: 50000, max: 100000 },
  { label: "10만~50만", min: 100000, max: 500000 },
  { label: "50만~100만", min: 500000, max: 1000000 },
  { label: "100만+", min: 1000000, max: Infinity },
];

function parseDuration(iso) {
  if (!iso) return "";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}:` : "";
  const min = (m[2] || "0").padStart(h ? 2 : 1, "0");
  const sec = (m[3] || "0").padStart(2, "0");
  return `${h}${min}:${sec}`;
}

function getPeriodDates(period) {
  if (!period) return {};
  const now = new Date();
  const map = {
    "1h": 3600000, "1d": 86400000, "1w": 604800000,
    "1m": 2592000000, "1y": 31536000000,
  };
  const ms = map[period];
  if (!ms) return {};
  return { publishedAfter: new Date(now.getTime() - ms).toISOString() };
}

export default function YouTubeAnalyzer({ isDark }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const acc = "#7c6aff";

  const [apiKey, setApiKey] = useState(() => localStorage.getItem("yt_api_key") || "server");
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("");
  const [period, setPeriod] = useState("");
  const [order, setOrder] = useState("relevance");
  const [regionCode, setRegionCode] = useState("KR");
  const [maxResults, setMaxResults] = useState(20);
  const [ratioFilter, setRatioFilter] = useState([]);
  const [subPreset, setSubPreset] = useState(0); // SUB_PRESETS index
  const [subMin, setSubMin] = useState("");
  const [subMax, setSubMax] = useState("");
  const [viewMode, setViewMode] = useState("card"); // card | table
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [error, setError] = useState("");

  const saveKey = () => { localStorage.setItem("yt_api_key", apiKey); };

  const doSearch = async (pageToken = "") => {
    if (!query.trim()) return;
    if (!apiKey && apiKey !== "server") { setError("YouTube Data API 키를 입력해주세요"); return; }
    saveKey();
    setLoading(true); setError("");
    if (!pageToken) setResults([]);

    try {
      const params = new URLSearchParams({
        action: "search",
        ...(apiKey && apiKey !== "server" ? { key: apiKey } : {}),
        q: query.trim(),
        maxResults: String(maxResults), order,
        videoDuration: duration, regionCode,
        ...getPeriodDates(period),
      });
      if (pageToken) params.set("pageToken", pageToken);

      const r = await fetch(`/api/youtube-search?${params}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);

      let filtered = d.results || [];
      if (ratioFilter.length > 0) {
        filtered = filtered.filter(v => ratioFilter.includes(v.ratioLevel));
      }
      // 구독자 수 필터
      const sMin = subMin !== "" ? parseInt(subMin) : (SUB_PRESETS[subPreset]?.min ?? 0);
      const sMax = subMax !== "" ? parseInt(subMax) : (SUB_PRESETS[subPreset]?.max ?? Infinity);
      if (sMin > 0 || sMax < Infinity) {
        filtered = filtered.filter(v => v.subscriberCount >= sMin && v.subscriberCount <= sMax);
      }

      setResults(prev => pageToken ? [...prev, ...filtered] : filtered);
      setTotalResults(d.totalResults || 0);
      setNextPageToken(d.nextPageToken || null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const getExportData = () => {
    const headers = ["제목", "채널", "조회수", "구독자수", "비율", "비율단계", "좋아요", "댓글", "길이", "게시일", "URL"];
    const rows = results.map(v => [
      v.title.replace(/<[^>]*>/g, ""), v.channelTitle,
      v.viewCount, v.subscriberCount, v.ratio, v.ratioLevel,
      v.likeCount, v.commentCount, parseDuration(v.duration),
      v.publishedAt?.split("T")[0] || "", `https://youtube.com/watch?v=${v.videoId}`,
    ]);
    return { headers, rows };
  };

  const exportCSV = () => {
    const { headers, rows } = getExportData();
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `youtube_${query}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportTXT = () => {
    const { rows } = getExportData();
    const lines = results.map((v, i) => [
      `[${i + 1}] ${v.title.replace(/<[^>]*>/g, "")}`,
      `   채널: ${v.channelTitle}`,
      `   조회수: ${v.viewCount.toLocaleString()} | 구독자: ${v.subscriberCount.toLocaleString()} | 비율: ${v.ratio}`,
      `   좋아요: ${v.likeCount.toLocaleString()} | 댓글: ${v.commentCount.toLocaleString()} | 길이: ${parseDuration(v.duration)}`,
      `   게시일: ${v.publishedAt?.split("T")[0] || ""} | URL: https://youtube.com/watch?v=${v.videoId}`,
    ].join("\n"));
    const txt = `YouTube 검색 결과: "${query}" (${new Date().toLocaleDateString("ko")})\n${"=".repeat(60)}\n\n${lines.join("\n\n")}`;
    const blob = new Blob(["\uFEFF" + txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `youtube_${query}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    const tableRows = results.map((v, i) => `<tr>
      <td>${i + 1}</td><td>${v.title}</td><td>${v.channelTitle}</td>
      <td>${v.viewCount.toLocaleString()}</td><td>${v.subscriberCount.toLocaleString()}</td>
      <td>${v.ratio}</td><td>${v.likeCount.toLocaleString()}</td>
      <td>${parseDuration(v.duration)}</td><td>${v.publishedAt?.split("T")[0] || ""}</td>
    </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>YouTube 검색: ${query}</title>
      <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:700}
      h1{font-size:18px}h2{font-size:13px;color:#888;margin-bottom:20px}</style></head>
      <body><h1>YouTube 검색: "${query}"</h1><h2>${new Date().toLocaleDateString("ko")} | ${results.length}건</h2>
      <table><thead><tr><th>#</th><th>제목</th><th>채널</th><th>조회수</th><th>구독자</th><th>비율</th><th>좋아요</th><th>길이</th><th>게시일</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      <script>setTimeout(()=>{window.print()},500)<\/script></body></html>`);
    w.document.close();
  };

  const exportGoogleSheets = () => {
    const { headers, rows } = getExportData();
    const all = [headers, ...rows];
    const tsv = all.map(r => r.map(c => String(c).replace(/\t/g, " ")).join("\t")).join("\n");
    navigator.clipboard.writeText(tsv).then(() => {
      window.open("https://sheets.google.com/create", "_blank");
      alert("클립보드에 복사되었습니다!\n\n구글 시트가 열리면 Ctrl+V로 붙여넣기 하세요.");
    }).catch(() => {
      const blob = new Blob(["\uFEFF" + tsv], { type: "text/tab-separated-values;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `youtube_${query}_${new Date().toISOString().split("T")[0]}.tsv`;
      a.click();
    });
  };

  const inputStyle = { padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 13, outline: "none" };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const btnStyle = { padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text }}>YouTube 검색 대시보드</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>키워드, 카테고리, 구독자수 비율로 영상을 분석하세요</div>
        </div>

        {/* 검색 필터 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          {/* 1행: API키 + 키워드 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="검색 키워드 입력" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => doSearch()} disabled={loading} style={btnStyle}>
              {loading ? "검색 중..." : "검색 실행"}
            </button>
          </div>
          {apiKey !== "server" && (
            <div style={{ marginBottom: 10 }}>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} onBlur={saveKey}
                placeholder="YouTube Data API 키 (자체 키 사용 시)" type="password" style={{ ...inputStyle, width: "100%", fontSize: 11 }} />
            </div>
          )}

          {/* 2행: 롱폼/숏폼 프리셋 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {FORMAT_PRESETS.map(f => (
              <button key={f.id} onClick={() => setDuration(f.id)}
                style={{
                  padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1.5px solid ${duration === f.id ? acc : bdr}`,
                  background: duration === f.id ? acc + "18" : "transparent",
                  color: duration === f.id ? acc : muted,
                }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* 3행: 상세 필터 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={selectStyle}>
              {DURATION_OPTS.map(o => <option key={o.id} value={o.id}>길이: {o.label}</option>)}
            </select>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={selectStyle}>
              {PERIOD_OPTS.map(o => <option key={o.id} value={o.id}>기간: {o.label}</option>)}
            </select>
            <select value={order} onChange={e => setOrder(e.target.value)} style={selectStyle}>
              {ORDER_OPTS.map(o => <option key={o.id} value={o.id}>정렬: {o.label}</option>)}
            </select>
            <select value={regionCode} onChange={e => setRegionCode(e.target.value)} style={selectStyle}>
              <option value="KR">국내 (한국)</option>
              <option value="US">해외 (미국)</option>
              <option value="JP">해외 (일본)</option>
              <option value="">전체</option>
            </select>
            <select value={maxResults} onChange={e => setMaxResults(parseInt(e.target.value))} style={selectStyle}>
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>검색량: {n}개</option>)}
            </select>
          </div>

          {/* 3행: 구독자 수 필터 */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>구독자 수 필터</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {SUB_PRESETS.map((p, i) => (
                <button key={i} onClick={() => { setSubPreset(i); setSubMin(""); setSubMax(""); }}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${subPreset === i && subMin === "" && subMax === "" ? acc : bdr}`,
                    background: subPreset === i && subMin === "" && subMax === "" ? acc + "20" : "transparent",
                    color: subPreset === i && subMin === "" && subMax === "" ? acc : muted,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: muted }}>직접 입력:</span>
              <input value={subMin} onChange={e => { setSubMin(e.target.value.replace(/[^0-9]/g, "")); setSubPreset(0); }}
                placeholder="최소 구독자" style={{ ...inputStyle, width: 110, fontSize: 11, padding: "6px 10px" }} />
              <span style={{ color: muted, fontSize: 12 }}>~</span>
              <input value={subMax} onChange={e => { setSubMax(e.target.value.replace(/[^0-9]/g, "")); setSubPreset(0); }}
                placeholder="최대 구독자" style={{ ...inputStyle, width: 110, fontSize: 11, padding: "6px 10px" }} />
              <span style={{ fontSize: 10, color: muted }}>명</span>
            </div>
          </div>
        </div>

        {error && <div style={{ padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {/* 결과 헤더 */}
        {results.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
              완료: {results.length}건 {totalResults > 0 && <span style={{ color: muted, fontWeight: 400 }}>(전체 약 {totalResults.toLocaleString()}건)</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setViewMode("card")} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${viewMode === "card" ? acc : bdr}`, background: viewMode === "card" ? acc + "15" : "transparent", color: viewMode === "card" ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>카드 보기</button>
              <button onClick={() => setViewMode("table")} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${viewMode === "table" ? acc : bdr}`, background: viewMode === "table" ? acc + "15" : "transparent", color: viewMode === "table" ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>테이블 보기</button>
              <button onClick={exportCSV} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>CSV</button>
              <button onClick={exportTXT} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>TXT</button>
              <button onClick={exportPDF} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>PDF</button>
              <button onClick={exportGoogleSheets} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid #34a853`, background: "#34a85315", color: "#34a853", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Google 시트</button>
            </div>
          </div>
        )}

        {/* 카드 뷰 */}
        {viewMode === "card" && results.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
            {results.map(v => (
              <a key={v.videoId} href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer"
                style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", transition: "transform 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ position: "relative" }}>
                  <img src={v.thumbnail} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  {v.duration && <span style={{ position: "absolute", bottom: 6, right: 6, padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 11, fontWeight: 700 }}>{parseDuration(v.duration)}</span>}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: RATIO_LEVELS[v.ratioLevel]?.color + "20", color: RATIO_LEVELS[v.ratioLevel]?.color, fontWeight: 700 }}>비율 {v.ratioLevel}단계</span>
                    <span style={{ fontSize: 10, color: muted }}>{v.publishedAt?.split("T")[0]}</span>
                    <span style={{ fontSize: 10, color: muted }}>{v.channelTitle}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text, lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: v.title }} />
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: muted }}>
                    <span>조회수 <b style={{ color: text }}>{v.viewCount.toLocaleString()}</b></span>
                    <span>구독자 <b style={{ color: text }}>{v.subscriberCount.toLocaleString()}</b></span>
                    <span>비율 <b style={{ color: RATIO_LEVELS[v.ratioLevel]?.color }}>{v.ratio}</b></span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 테이블 뷰 */}
        {viewMode === "table" && results.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: D ? "rgba(255,255,255,0.05)" : "#f0f0f5" }}>
                  {["#", "썸네일", "제목", "채널", "조회수", "구독자", "비율", "좋아요", "길이", "게시일"].map(h => (
                    <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: muted, fontWeight: 700, borderBottom: `1px solid ${bdr}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((v, i) => (
                  <tr key={v.videoId} onClick={() => window.open(`https://youtube.com/watch?v=${v.videoId}`, "_blank")}
                    style={{ cursor: "pointer", borderBottom: `1px solid ${bdr}` }}
                    onMouseEnter={e => e.currentTarget.style.background = D ? "rgba(255,255,255,0.03)" : "#f8f8fb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "8px", color: muted }}>{i + 1}</td>
                    <td style={{ padding: "8px" }}><img src={v.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 6 }} /></td>
                    <td style={{ padding: "8px", color: text, fontWeight: 600, maxWidth: 300 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: v.title }} />
                    </td>
                    <td style={{ padding: "8px", color: muted, whiteSpace: "nowrap" }}>{v.channelTitle}</td>
                    <td style={{ padding: "8px", color: text, fontWeight: 700 }}>{v.viewCount.toLocaleString()}</td>
                    <td style={{ padding: "8px", color: text }}>{v.subscriberCount.toLocaleString()}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: RATIO_LEVELS[v.ratioLevel]?.color + "20", color: RATIO_LEVELS[v.ratioLevel]?.color, fontWeight: 700, fontSize: 11 }}>{v.ratio} ({v.ratioLevel}단계)</span>
                    </td>
                    <td style={{ padding: "8px", color: muted }}>{v.likeCount.toLocaleString()}</td>
                    <td style={{ padding: "8px", color: muted, whiteSpace: "nowrap" }}>{parseDuration(v.duration)}</td>
                    <td style={{ padding: "8px", color: muted, whiteSpace: "nowrap" }}>{v.publishedAt?.split("T")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 더보기 */}
        {nextPageToken && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={() => doSearch(nextPageToken)} disabled={loading}
              style={{ ...btnStyle, background: "transparent", border: `1px solid ${acc}`, color: acc }}>
              {loading ? "로딩 중..." : "더 불러오기"}
            </button>
          </div>
        )}

        {results.length === 0 && !loading && !error && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: muted }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>키워드를 입력하고 검색하세요</div>
            <div style={{ fontSize: 12 }}>카테고리, 영상 길이, 기간, 국내/해외를 필터링할 수 있어요</div>
          </div>
        )}
      </div>
    </div>
  );
}
