import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════
   KeywordInsightPanel
   - 글쓰기 화면에 내장되는 SEO 키워드 분석 패널
   - 7일 트렌드 차트 + 관련 키워드 + 경쟁도 표시
   ══════════════════════════════════════════════════════ */

export default function KeywordInsightPanel({ keyword, isDark, onKeywordSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#f9f9fc";
  const acc = "#168EEA";

  // 키워드 변경 시 디바운스 분석
  useEffect(() => {
    if (!keyword || keyword.trim().length < 2) { setData(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAnalysis(keyword.trim()), 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  const fetchAnalysis = async (kw) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/keyword-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const json = await res.json();
      if (json && typeof json === "object") setData(json);
      else throw new Error("응답 형식 오류");
    } catch (e) {
      setError(e.name === "TimeoutError" ? "요청 시간 초과" : "분석 실패");
      setData(null);
    }
    setLoading(false);
  };

  // 트렌드 방향 아이콘 + 색상
  const trendInfo = {
    rising: { label: "상승 중", color: "#4ade80", icon: "↑" },
    declining: { label: "하락 중", color: "#f87171", icon: "↓" },
    stable: { label: "안정적", color: "#fbbf24", icon: "→" },
  };

  // 경쟁도 색상
  const compColor = { high: "#f87171", medium: "#fbbf24", low: "#4ade80" };
  const compLabel = { high: "높음", medium: "보통", low: "낮음" };

  if (!keyword || keyword.trim().length < 2) return null;

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${bdr}`,
      background: cardBg, overflow: "hidden", marginTop: 10,
    }}>
      <style>{`
        @keyframes kip-shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
      `}</style>

      {/* 헤더 - 항상 표시 */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
        background: "transparent", display: "flex", alignItems: "center", gap: 8,
        color: text, fontSize: 12, fontWeight: 700, textAlign: "left",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <span>SEO 키워드 분석</span>
        {loading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${acc}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />}
        {data && !loading && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
            color: trendInfo[data.trendDirection]?.color,
            background: `${trendInfo[data.trendDirection]?.color}15`,
          }}>
            {trendInfo[data.trendDirection]?.icon} {trendInfo[data.trendDirection]?.label}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, color: muted }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {/* 확장 영역 */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${bdr}` }}>
          {error && <div style={{ padding: 8, fontSize: 12, color: "#f87171" }}>{error}</div>}

          {loading && (
            <div style={{ padding: "16px 0" }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  height: 14, borderRadius: 6, marginBottom: 8,
                  background: `linear-gradient(90deg, ${isDark?"rgba(255,255,255,0.05)":"#eee"} 25%, ${isDark?"rgba(255,255,255,0.1)":"#f5f5f5"} 50%, ${isDark?"rgba(255,255,255,0.05)":"#eee"} 75%)`,
                  backgroundSize: "400px 100%",
                  animation: "kip-shimmer 1.5s infinite",
                  width: `${80 - i * 15}%`,
                }} />
              ))}
            </div>
          )}

          {data && !loading && (
            <>
              {/* 미니 트렌드 차트 (7일) */}
              <div style={{ marginTop: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>7일 검색 트렌드</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 50 }}>
                  {(data.naverTrend || []).map((d, i) => {
                    const maxRatio = Math.max(...data.naverTrend.map(t => t.ratio), 1);
                    const h = (d.ratio / maxRatio) * 40 + 6;
                    const isToday = i === data.naverTrend.length - 1;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{
                          width: "100%", height: h, borderRadius: 4,
                          background: isToday ? acc : isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)",
                          transition: "height 0.3s ease",
                        }} />
                        <span style={{ fontSize: 8, color: muted }}>{d.date?.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 안내 메시지 */}
              {data.notice && (
                <div style={{ padding: "6px 10px", borderRadius: 8, background: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 10, color: "#f59e0b", marginBottom: 10 }}>
                  {data.notice}
                </div>
              )}

              {/* 관련 키워드 */}
              {data.relatedKeywords?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>관련 키워드 (클릭하여 적용)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.relatedKeywords.map((kw, i) => (
                      <button key={i}
                        onClick={() => onKeywordSelect && onKeywordSelect(kw.keyword)}
                        style={{
                          padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                          border: `1px solid ${bdr}`, background: "transparent",
                          color: text, fontSize: 11, fontWeight: 500,
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.background = `${acc}10`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{kw.keyword}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6,
                          background: `${compColor[kw.competition]}15`,
                          color: compColor[kw.competition],
                        }}>
                          {compLabel[kw.competition]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 트렌드 기반 팁 */}
              <div style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 10,
                background: isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)",
                border: `1px solid ${acc}20`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 4 }}>SEO 팁</div>
                <div style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>
                  {data.trendDirection === "rising"
                    ? `"${keyword}" 검색량이 상승 중이에요! 지금 발행하면 높은 노출을 기대할 수 있습니다.`
                    : data.trendDirection === "declining"
                    ? `"${keyword}" 검색량이 감소 중이에요. 관련 키워드를 조합해서 노출을 높여보세요.`
                    : `"${keyword}" 검색량이 안정적이에요. 경쟁도 낮은 관련 키워드를 활용하면 좋습니다.`
                  }
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
