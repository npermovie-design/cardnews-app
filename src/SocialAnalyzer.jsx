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
  if (!url) return null;
  for (const p of SNS_PLATFORMS) {
    if (p.match && p.match.test(url)) return p;
  }
  return SNS_PLATFORMS[SNS_PLATFORMS.length - 1];
}

// 숫자 포맷 (1234 → 1,234 / 12345 → 1.2만)
function fmtNum(n) {
  if (!n && n !== 0) return "-";
  const num = typeof n === "string" ? parseInt(n.replace(/[^0-9]/g, "")) : n;
  if (isNaN(num)) return "-";
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  return num.toLocaleString();
}

export default function SocialAnalyzer({ isDark, user }) {
  const [links, setLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [metrics, setMetrics] = useState([]); // 플랫폼별 실제 지표
  const reportRef = useRef(null);

  const acc = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a1a";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#999";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";

  const addLink = () => { if (links.length < 10) setLinks([...links, ""]); };
  const removeLink = (idx) => { if (links.length > 1) setLinks(links.filter((_, i) => i !== idx)); };
  const updateLink = (idx, val) => { const n = [...links]; n[idx] = val; setLinks(n); };
  const validLinks = links.filter(l => l.trim());

  // ── 유튜브 채널 실제 데이터 가져오기 (YouTube Data API) ──
  const fetchYoutubeData = async (url) => {
    try {
      const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
      const channelIdMatch = url.match(/channel\/([a-zA-Z0-9_-]+)/);

      let channelId = channelIdMatch ? channelIdMatch[1] : null;

      // @handle → forHandle로 직접 조회
      if (handleMatch && !channelId) {
        const directRes = await fetch(`/api/youtube-search?action=channel-detail&forHandle=${handleMatch[1]}`);
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData?.items?.[0]) {
            const item = directData.items[0];
            const stats = item.statistics || {};
            const snippet = item.snippet || {};
            return {
              name: snippet.title || handleMatch[1],
              thumbnail: snippet.thumbnails?.medium?.url || "",
              subscribers: parseInt(stats.subscriberCount) || 0,
              totalViews: parseInt(stats.viewCount) || 0,
              videoCount: parseInt(stats.videoCount) || 0,
              description: (snippet.description || "").slice(0, 300),
              avgViews: stats.viewCount && stats.videoCount ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount)) : 0,
            };
          }
        }
        // forHandle 실패 시 검색 fallback
        const searchRes = await fetch(`/api/youtube-search?action=channel-search&q=${encodeURIComponent("@" + handleMatch[1])}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          channelId = searchData?.items?.[0]?.channelId;
        }
      }

      if (!channelId) return null;

      const detailRes = await fetch(`/api/youtube-search?action=channel-detail&channelId=${channelId}`);
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();
      const stats = detail?.items?.[0]?.statistics || {};
      const snippet = detail?.items?.[0]?.snippet || {};
      return {
        name: snippet.title || channelId,
        thumbnail: snippet.thumbnails?.medium?.url || "",
        subscribers: parseInt(stats.subscriberCount) || 0,
        totalViews: parseInt(stats.viewCount) || 0,
        videoCount: parseInt(stats.videoCount) || 0,
        description: (snippet.description || "").slice(0, 300),
        avgViews: stats.viewCount && stats.videoCount ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount)) : 0,
      };
    } catch { return null; }
  };

  // ── 페이지 HTML 크롤링으로 실제 데이터 추출 ──
  const fetchPageData = async (url) => {
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.text || null;
    } catch { return null; }
  };

  // ── 메인 분석 ──
  const analyze = async () => {
    if (validLinks.length === 0) return;
    setLoading(true); setError(null); setReport(null); setMetrics([]);

    try {
      setProgress("SNS 계정 데이터를 수집하고 있어요...");

      // 1단계: 각 링크별 실제 데이터 수집
      const results = [];
      for (const url of validLinks) {
        const platform = detectPlatform(url);
        const entry = { url, platform, data: null, pageText: null };

        if (platform?.id === "youtube") {
          entry.data = await fetchYoutubeData(url);
        }
        // 다른 플랫폼은 크롤링으로 텍스트 수집
        if (!entry.data) {
          entry.pageText = await fetchPageData(url);
        }
        results.push(entry);
      }

      setMetrics(results);
      setProgress("AI가 수집된 데이터를 분석하고 있어요...");

      // 2단계: 수집된 실제 데이터를 포함하여 AI 분석 요청
      const linksDetail = results.map((r, i) => {
        const p = r.platform;
        let info = `[계정 ${i + 1}] ${p?.label || "미확인"}\nURL: ${r.url}`;
        if (r.data) {
          const d = r.data;
          info += `\n이름: ${d.name}\n구독자: ${d.subscribers?.toLocaleString()}\n총 조회수: ${d.totalViews?.toLocaleString()}\n영상 수: ${d.videoCount}\n평균 조회수: ${d.avgViews?.toLocaleString()}\n설명: ${d.description}`;
        }
        if (r.pageText) {
          info += `\n페이지 내용:\n${r.pageText.slice(0, 1500)}`;
        }
        return info;
      }).join("\n\n---\n\n");

      const prompt = `당신은 SNS 마케팅 전문 분석가입니다. 다음 SNS 계정들의 실제 수집 데이터를 기반으로 심층 분석해주세요.

${linksDetail}

반드시 한국어로 작성. 이모지/이모티콘/특수기호 절대 금지.
추정이나 예측이 아닌, 위 데이터에서 확인된 사실 기반으로 분석하세요.

## 1. 계정별 현황 분석
각 계정의 실제 데이터를 기반으로:
- 콘텐츠 주제/카테고리
- 콘텐츠 스타일과 톤
- 강점 3가지, 약점 3가지

## 2. 벤치마킹 - 유사 성공 계정 추천
각 플랫폼별로 비슷한 주제이면서 더 성공적인 실제 계정 3~5개:
- 계정명과 URL
- 팔로워/구독자 규모
- 왜 벤치마킹해야 하는지
- 구체적으로 참고할 콘텐츠 예시

## 3. 성장 전략 가이드라인
- 1주 내 즉시 실행할 액션 플랜 5가지
- 1~3개월 중기 전략
- 콘텐츠 아이디어 10개 (구체적 제목)
- 최적 포스팅 시간대와 빈도
- 해시태그/키워드 전략

## 4. 크로스 플랫폼 전략
- 플랫폼 간 콘텐츠 재활용 방법
- 트래픽 유도 전략
- 추가 개설 추천 플랫폼과 이유`;

      const res = await fetch("/api/gemini-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 4000 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI 분석 요청 실패");
      }
      const data = await res.json();
      const aiText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("AI 응답이 비어있습니다");

      setReport({ text: aiText, date: new Date().toLocaleString("ko-KR") });
      setProgress("");
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (e) {
      setError(e.message || "분석 중 오류가 발생했습니다");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  // ── 지표 카드 렌더링 ──
  const MetricCard = ({ label, value, sub, color }) => (
    <div style={{ flex: 1, minWidth: 100, padding: "16px 14px", borderRadius: 14, background: isDark ? "rgba(255,255,255,0.04)" : "#f8f9fa", border: `1px solid ${bdr}`, textAlign: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || acc, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  // ── 플랫폼 데이터 대시보드 ──
  const renderMetricsDashboard = () => {
    if (metrics.length === 0) return null;
    return (
      <div style={{ marginBottom: 28 }}>
        {metrics.map((m, i) => {
          const p = m.platform;
          const d = m.data;
          return (
            <div key={i} style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px 20px", marginBottom: 16, boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.03)" }}>
              {/* 플랫폼 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                {d?.thumbnail && <img src={d.thumbnail} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: `2px solid ${p?.color || acc}30` }} />}
                {!d?.thumbnail && (
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p?.color || acc}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${p?.color || acc}30` }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: p?.color || acc }}>{p?.label?.[0] || "?"}</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 8, background: `${p?.color || acc}15`, fontSize: 10, fontWeight: 700, color: p?.color || acc }}>{p?.label || "SNS"}</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: text, marginTop: 4 }}>{d?.name || m.url.replace(/https?:\/\/(www\.)?/, "").split("/").slice(0, 2).join("/")}</div>
                </div>
                {d && <div style={{ padding: "6px 14px", borderRadius: 10, background: "#22c55e15", border: "1px solid #22c55e30", fontSize: 11, fontWeight: 700, color: "#22c55e" }}>데이터 수집 완료</div>}
                {!d && m.pageText && <div style={{ padding: "6px 14px", borderRadius: 10, background: `${acc}10`, border: `1px solid ${acc}25`, fontSize: 11, fontWeight: 700, color: acc }}>페이지 분석 완료</div>}
                {!d && !m.pageText && <div style={{ padding: "6px 14px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5", fontSize: 11, fontWeight: 600, color: muted }}>URL 기반 분석</div>}
              </div>

              {/* 유튜브 실제 지표 */}
              {d && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <MetricCard label="구독자" value={fmtNum(d.subscribers)} color={p?.color} />
                  <MetricCard label="총 조회수" value={fmtNum(d.totalViews)} color={p?.color} />
                  <MetricCard label="영상 수" value={fmtNum(d.videoCount)} color={p?.color} />
                  <MetricCard label="평균 조회수" value={fmtNum(d.avgViews)} sub="영상당" color={p?.color} />
                </div>
              )}

              {/* 크롤링 데이터 요약 */}
              {!d && m.pageText && (
                <div style={{ padding: "14px 16px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa", border: `1px solid ${bdr}`, fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7 }}>
                  {m.pageText.slice(0, 300)}...
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── 마크다운 렌더링 ──
  const renderMarkdown = (md) => {
    if (!md) return null;
    return md.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 10 }} />;
      if (trimmed.startsWith("## "))
        return <div key={i} style={{ fontSize: 19, fontWeight: 900, color: text, marginTop: 28, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${acc}30` }}>{trimmed.replace(/^##\s*/, "").replace(/\*\*/g, "")}</div>;
      if (trimmed.startsWith("### "))
        return <div key={i} style={{ fontSize: 15, fontWeight: 800, color: text, marginTop: 18, marginBottom: 6 }}>{trimmed.replace(/^###\s*/, "").replace(/\*\*/g, "")}</div>;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.replace(/^[-*]\s*/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5, paddingLeft: 8 }}>
            <span style={{ color: acc, fontWeight: 700, flexShrink: 0 }}>-</span>
            <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
              {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
            </span>
          </div>
        );
      }
      if (/^\d+[\.\)]\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)/)[1];
        const content = trimmed.replace(/^\d+[\.\)]\s*/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 7, paddingLeft: 4 }}>
            <span style={{ color: acc, fontWeight: 800, fontSize: 13, flexShrink: 0, minWidth: 20 }}>{num}.</span>
            <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
              {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
            </span>
          </div>
        );
      }
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.75)" : "#555", lineHeight: 1.8, marginBottom: 3 }}>
          {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**") ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong> : p)}
        </div>
      );
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 60px" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 20, background: "rgba(124,106,255,0.1)", fontSize: 12, fontWeight: 700, color: acc, marginBottom: 14 }}>소셜분석기</div>
        <div style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 8 }}>
          SNS 계정을 분석하고<br/>성장 전략을 제안해드려요
        </div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>
          운영 중인 SNS 프로필 링크를 입력하면 실제 데이터를 수집하고, AI가 분석 리포트를 생성합니다.
        </div>
      </div>

      {/* SNS 링크 입력 */}
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "28px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 4 }}>SNS 링크 입력</div>
        <div style={{ fontSize: 12, color: muted, marginBottom: 20 }}>분석할 SNS 계정의 프로필 URL을 입력하세요 (최대 10개)</div>

        {links.map((link, idx) => {
          const detected = link.trim() ? detectPlatform(link) : null;
          return (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: detected ? `${detected.color}15` : (isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${detected ? detected.color + "30" : bdr}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: detected?.color || muted }}>{detected ? detected.label.slice(0, 2) : String(idx + 1)}</span>
              </div>
              <input value={link} onChange={e => updateLink(idx, e.target.value)}
                placeholder={detected?.placeholder || "SNS 프로필 URL을 입력하세요"}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${detected ? detected.color + "40" : bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none" }}
              />
              {links.length > 1 && (
                <button onClick={() => removeLink(idx)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>x</button>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {links.length < 10 && (
            <button onClick={addLink} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ 링크 추가</button>
          )}
          <button onClick={analyze} disabled={loading || validLinks.length === 0}
            style={{ flex: 1, padding: "12px 24px", borderRadius: 12, border: "none", background: validLinks.length > 0 ? `linear-gradient(135deg, ${acc}, #8b5cf6)` : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"), color: validLinks.length > 0 ? "#fff" : muted, fontSize: 14, fontWeight: 800, cursor: validLinks.length > 0 ? "pointer" : "default" }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                {progress || "분석 중..."}
              </span>
            ) : `분석 시작 (${validLinks.length}개 계정)`}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</div>
        )}
      </div>

      {/* 지원 플랫폼 */}
      {!report && !loading && metrics.length === 0 && (
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 14 }}>지원 플랫폼</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SNS_PLATFORMS.filter(p => p.id !== "other").map(p => (
              <div key={p.id} style={{ padding: "6px 14px", borderRadius: 20, background: `${p.color}10`, border: `1px solid ${p.color}20`, fontSize: 11, fontWeight: 600, color: p.color }}>{p.label}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: muted, marginTop: 14, lineHeight: 1.6 }}>
            유튜브: 구독자/조회수/영상수 실제 데이터 수집 | 기타 플랫폼: 페이지 크롤링 + AI 분석
          </div>
        </div>
      )}

      {/* 실제 데이터 대시보드 */}
      {renderMetricsDashboard()}

      {/* AI 분석 리포트 */}
      {report && (
        <div ref={reportRef} style={{ background: cardBg, borderRadius: 20, border: `1px solid ${bdr}`, padding: "32px 28px", marginBottom: 24, boxShadow: isDark ? "none" : "0 4px 24px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${bdr}` }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 4 }}>AI 분석 리포트</div>
              <div style={{ fontSize: 12, color: muted }}>{report.date} | 실제 데이터 기반 분석</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(report.text)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>복사</button>
          </div>
          <div>{renderMarkdown(report.text)}</div>
        </div>
      )}
    </div>
  );
}
