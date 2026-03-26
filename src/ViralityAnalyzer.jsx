import { useState, useEffect } from "react";
import { callAI } from "./aiClient";

const CATEGORIES = [
  { id: "beauty", label: "뷰티", icon: "💄", tags: ["뷰티","메이크업","스킨케어","화장품리뷰"] },
  { id: "fashion", label: "패션", icon: "👗", tags: ["패션","OOTD","데일리룩","코디추천"] },
  { id: "food", label: "푸드", icon: "🍽", tags: ["맛집","레시피","먹방","카페추천"] },
  { id: "travel", label: "여행", icon: "✈️", tags: ["여행","해외여행","국내여행","여행브이로그"] },
  { id: "fitness", label: "헬스", icon: "💪", tags: ["운동","헬스","다이어트","홈트레이닝"] },
  { id: "tech", label: "IT/테크", icon: "📱", tags: ["AI","테크","앱추천","IT트렌드"] },
  { id: "interior", label: "인테리어", icon: "🏠", tags: ["인테리어","집꾸미기","홈스타일링","리빙"] },
  { id: "pet", label: "반려동물", icon: "🐶", tags: ["반려견","고양이","펫","동물"] },
  { id: "business", label: "비즈니스", icon: "💼", tags: ["마케팅","창업","부업","온라인비즈니스"] },
  { id: "education", label: "교육", icon: "📚", tags: ["공부","자기계발","영어공부","독서"] },
];

function fmt(n) { if (!n) return "0"; if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); }

export default function ViralityAnalyzer({ isDark }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const [tab, setTab] = useState("feed");
  const [loading, setLoading] = useState(false);

  // ── 영상 피드 ──
  const [feedCat, setFeedCat] = useState("beauty");
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [selFeedVideo, setSelFeedVideo] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [videoAnalyzing, setVideoAnalyzing] = useState(false);

  // ── 트렌드 분석 ──
  const [selCat, setSelCat] = useState(null);
  const [trendData, setTrendData] = useState(null);

  // ── 계정 분석 ──
  const [platform, setPlatform] = useState("instagram");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_sns_analysis_history") || "[]"); } catch { return []; }
  });

  const saveHistory = (item) => {
    const next = [item, ...history.filter(h => !(h.platform === item.platform && h.username === item.username))].slice(0, 20);
    setHistory(next);
    localStorage.setItem("nper_sns_analysis_history", JSON.stringify(next));
  };

  // 영상 피드 로드
  const loadFeed = async (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    setFeedCat(catId); setFeedLoading(true); setFeedVideos([]);
    try {
      const r = await fetch("/api/fetch-trending-videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: catId, keywords: cat.tags, platform: "youtube" }),
      });
      if (!r.ok) { console.error("fetch-trending-videos error:", r.status, await r.text().catch(()=>"")); }
      else { const data = await r.json(); setFeedVideos(data.videos || []); }
    } catch (e) { console.error("Feed load error:", e); }
    setFeedLoading(false);
  };

  useEffect(() => { if (tab === "feed") loadFeed(feedCat); }, [tab]);

  // 개별 영상 AI 분석
  const analyzeVideo = async (video) => {
    setSelFeedVideo(video); setVideoAnalysis(null); setVideoAnalyzing(true);
    try {
      const res = await callAI("claude-sonnet-4-5", [{ role: "user", content: `다음 영상을 분석해주세요:
제목: ${video.title}
채널: ${video.author}
조회수: ${fmt(video.views)}
플랫폼: ${video.platform}

JSON으로 분석:
{
  "hook": "이 영상의 훅(첫 3초) 분석",
  "why_viral": "바이럴 된 이유 3가지",
  "content_structure": "콘텐츠 구조 분석",
  "replication_tips": ["내 콘텐츠에 적용하는 법 1","적용법 2","적용법 3"],
  "similar_ideas": ["비슷한 콘텐츠 아이디어 1","아이디어 2","아이디어 3"]
}
JSON만 출력.` }], 2000,
        "당신은 숏폼 콘텐츠 바이럴 분석 전문가입니다. 영상의 성공 요인을 분석하고 재현 가능한 전략을 제시합니다."
      );
      setVideoAnalysis(JSON.parse((res || "").replace(/```json\n?/g, "").replace(/```/g, "").trim()));
    } catch { setVideoAnalysis(null); }
    setVideoAnalyzing(false);
  };

  // 트렌드 분석
  const analyzeTrend = async (cat) => {
    setSelCat(cat); setTrendData(null); setLoading(true);
    try {
      const res = await callAI("claude-sonnet-4-5", [{ role: "user", content: `인스타그램 "${cat.label}" 분야의 최신 트렌드를 분석해주세요.
관련 해시태그: ${cat.tags.join(", ")}

JSON:
{
  "overview": "전반적 트렌드 요약 (3~4줄)",
  "viral_formats": [
    { "title": "포맷명", "description": "설명 (2줄)", "example": "예시", "views_range": "예상 조회수", "difficulty": "쉬움/보통/어려움" }
  ],
  "trending_hooks": [
    { "hook": "훅 예시", "why_works": "효과 이유", "type": "질문형/충격형/호기심형/공감형" }
  ],
  "content_ideas": [
    { "title": "아이디어", "format": "릴스/카루셀/피드", "description": "실행 방법", "estimated_engagement": "높음/중간/보통" }
  ],
  "hashtag_strategy": { "mega": ["3개"], "mid": ["5개"], "niche": ["5개"] },
  "best_posting_time": "최적 시간대",
  "avoid": ["실수 3가지"]
}
JSON만 출력.` }], 4000,
        "당신은 인스타그램 트렌드 분석 전문가입니다. 2025-2026년 최신 알고리즘과 바이럴 패턴에 정통합니다. 한국 시장 기준."
      );
      setTrendData(JSON.parse((res || "").replace(/```json\n?/g, "").replace(/```/g, "").trim()));
    } catch (e) { alert("분석 실패: " + e.message); }
    setLoading(false);
  };

  // 계정 분석
  const analyzeAccount = async () => {
    if (!query.trim()) return;
    setLoading(true); setProfile(null); setAnalysis(null);
    try {
      const pRes = await fetch("/api/analyze-creator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: query.replace(/^@/, "").trim() }),
      });
      const pData = await pRes.json();
      if (pData.error) throw new Error(pData.error);
      setProfile(pData);

      const platLabel = platform === "instagram" ? "인스타그램" : platform === "youtube" ? "유튜브" : "틱톡";
      const res = await callAI("claude-sonnet-4-5", [{ role: "user", content: `${platLabel} 크리에이터 분석:
계정: @${pData.username} / ${pData.displayName || ""}
소개: ${pData.bio || "없음"}
${pData.followers ? `팔로워: ${pData.followers}` : ""}${pData.subscribers ? `구독자: ${pData.subscribers}` : ""}

JSON:
{
  "summary": "한줄 요약",
  "score": 85,
  "sections": [
    { "title": "콘텐츠 전략", "icon": "📝", "score": 90, "analysis": "분석 3~5줄", "tips": ["팁1","팁2"] },
    { "title": "성장 가능성", "icon": "📈", "score": 80, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "참여율", "icon": "💬", "score": 75, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "브랜딩", "icon": "🎯", "score": 85, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "차별화", "icon": "⚡", "score": 70, "analysis": "분석", "tips": ["팁1","팁2"] }
  ],
  "recommendations": ["추천1","추천2","추천3"]
}
JSON만.` }], 3000, `${platLabel} 마케팅 분석 전문가.`);
      const parsed = JSON.parse((res || "").replace(/```json\n?/g, "").replace(/```/g, "").trim());
      setAnalysis(parsed);
      saveHistory({ platform, username: pData.username, displayName: pData.displayName, profilePic: pData.profilePic, score: parsed.score, summary: parsed.summary, date: new Date().toISOString().slice(0, 10) });
    } catch (e) { alert("분석 실패: " + e.message); }
    setLoading(false);
  };

  const PLATS = [
    { id: "instagram", label: "인스타그램", icon: "/icon-instagram.webp", color: "#E1306C" },
    { id: "youtube", label: "유튜브", icon: "/icon-youtube.png", color: "#FF0000" },
    { id: "tiktok", label: "틱톡", icon: "/icon-youtube.png", color: "#010101" },
  ];
  const plat = PLATS.find(p => p.id === platform) || PLATS[0];

  return (
    <div style={{ padding: "16px 20px 60px", maxWidth: 960, margin: "0 auto" }}>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${bdr}`, paddingBottom: 0 }}>
        {[["feed", "영상 피드"], ["trending", "트렌드 분석"], ["account", "계정 분석"]].map(([k, l]) =>
          <button key={k} onClick={() => { setTab(k); if (k !== "trending") { setTrendData(null); setSelCat(null); } if (k !== "account") { setAnalysis(null); setProfile(null); } }}
            style={{ padding: "10px 20px", border: "none", borderBottom: `2px solid ${tab === k ? accent : "transparent"}`, background: "transparent", color: tab === k ? accent : muted, fontSize: 13, fontWeight: tab === k ? 800 : 500, cursor: "pointer", marginBottom: -1 }}>
            {l}
          </button>
        )}
      </div>

      {/* ═══ 영상 피드 ═══ */}
      {tab === "feed" && (
        <>
          {/* 카테고리 필터 */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => loadFeed(c.id)}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${feedCat === c.id ? accent : bdr}`,
                  background: feedCat === c.id ? (D ? accent + "20" : accent + "0a") : "transparent",
                  color: feedCat === c.id ? accent : muted, fontSize: 12, fontWeight: feedCat === c.id ? 700 : 400, cursor: "pointer" }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {feedLoading ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: muted }}>영상 수집 중...</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
              {feedVideos.map((v, i) => (
                <div key={v.id || i} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", transition: "all 0.15s" }}
                  onClick={() => analyzeVideo(v)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ position: "relative", paddingBottom: "56%", background: "#111" }}>
                    {v.thumbnail && <img src={v.thumbnail} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", bottom: 6, left: 6, padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                      ▶ {fmt(v.views)}
                    </div>
                    {v.duration > 0 && v.duration <= 60 && <div style={{ position: "absolute", top: 6, right: 6, padding: "2px 6px", borderRadius: 4, background: "#ff0050", color: "#fff", fontSize: 9, fontWeight: 700 }}>Shorts</div>}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</div>
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{v.author}{v.published ? ` · ${v.published}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!feedLoading && feedVideos.length === 0 && (
            <div style={{ textAlign: "center", padding: 50, color: muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📹</div>
              <div style={{ fontSize: 13 }}>카테고리를 선택하면 관련 영상을 불러옵니다</div>
            </div>
          )}

          {/* 영상 분석 모달 */}
          {selFeedVideo && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelFeedVideo(null)}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
              <div style={{ position: "relative", width: "90%", maxWidth: 700, maxHeight: "85vh", overflowY: "auto", borderRadius: 16, background: D ? "#1a1a2e" : "#fff", border: `1px solid ${bdr}`, padding: 24 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelFeedVideo(null)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: muted, fontSize: 20, cursor: "pointer" }}>✕</button>

                <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                  {selFeedVideo.thumbnail && <img src={selFeedVideo.thumbnail} alt="" style={{ width: 120, height: 68, borderRadius: 10, objectFit: "cover" }} />}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 4 }}>{selFeedVideo.title}</div>
                    <div style={{ fontSize: 12, color: muted }}>{selFeedVideo.author} · ▶ {fmt(selFeedVideo.views)}</div>
                    <a href={selFeedVideo.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: accent }}>원본 보기 →</a>
                  </div>
                </div>

                {videoAnalyzing ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 13, color: muted }}>AI 분석 중...</div>
                  </div>
                ) : videoAnalysis ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#E1306C", marginBottom: 6 }}>⚡ 훅 분석</div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: text }}>{videoAnalysis.hook}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", marginBottom: 6 }}>🔥 바이럴 요인</div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: text }}>{videoAnalysis.why_viral}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginBottom: 6 }}>📐 콘텐츠 구조</div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: text }}>{videoAnalysis.content_structure}</div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", marginBottom: 6 }}>📋 내 콘텐츠에 적용하기</div>
                      {(videoAnalysis.replication_tips || []).map((t, i) => <div key={i} style={{ fontSize: 12, color: text, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${accent}` }}>{t}</div>)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#06b6d4", marginBottom: 6 }}>💡 비슷한 콘텐츠 아이디어</div>
                      {(videoAnalysis.similar_ideas || []).map((t, i) => <div key={i} style={{ fontSize: 12, color: muted, marginBottom: 4 }}>• {t}</div>)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ 트렌드 분석 ═══ */}
      {tab === "trending" && (
        <>
          {!trendData && !loading && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 14 }}>분석할 분야를 선택하세요</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => analyzeTrend(cat)}
                    style={{ padding: "16px 12px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{cat.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{cat.label}</div>
                    <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{cat.tags.slice(0, 2).map(t => "#" + t).join(" ")}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && selCat && (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{selCat.icon} {selCat.label} 트렌드 분석 중...</div>
            </div>
          )}

          {!loading && trendData && selCat && (
            <div>
              <button onClick={() => { setTrendData(null); setSelCat(null); }} style={{ background: "none", border: "none", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>← 분야 선택</button>
              <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 6 }}>{selCat.icon} {selCat.label} 트렌드</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: muted, marginBottom: 20 }}>{trendData.overview}</div>

              {/* 바이럴 포맷 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: text, marginBottom: 10 }}>🔥 바이럴 콘텐츠 포맷</div>
                {(trendData.viral_formats || []).map((f, i) => (
                  <div key={i} style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: text }}>{f.title}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {f.views_range && <span style={{ padding: "2px 8px", borderRadius: 5, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>▶ {f.views_range}</span>}
                        {f.difficulty && <span style={{ padding: "2px 8px", borderRadius: 5, background: f.difficulty === "쉬움" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: f.difficulty === "쉬움" ? "#22c55e" : "#f59e0b", fontSize: 10, fontWeight: 700 }}>{f.difficulty}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{f.description}</div>
                    {f.example && <div style={{ fontSize: 12, color: accent, marginTop: 4 }}>예시: {f.example}</div>}
                  </div>
                ))}
              </div>

              {/* 훅 + 아이디어 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: text, marginBottom: 10 }}>⚡ 트렌딩 훅</div>
                  {(trendData.trending_hooks || []).map((h, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#E1306C", marginBottom: 4 }}>"{h.hook}"</div>
                      <div style={{ fontSize: 11, color: muted }}>{h.why_works}</div>
                      {h.type && <span style={{ padding: "1px 6px", borderRadius: 4, background: accent + "15", color: accent, fontSize: 9, fontWeight: 600, marginTop: 4, display: "inline-block" }}>{h.type}</span>}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: text, marginBottom: 10 }}>💡 콘텐츠 아이디어</div>
                  {(trendData.content_ideas || []).map((idea, i) => (
                    <div key={i} style={{ padding: 14, borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{idea.title}</span>
                        <span style={{ padding: "1px 6px", borderRadius: 4, background: accent + "12", color: accent, fontSize: 9 }}>{idea.format}</span>
                      </div>
                      <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{idea.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 해시태그 */}
              {trendData.hashtag_strategy && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: text, marginBottom: 10 }}>#️⃣ 해시태그 전략</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[["mega", "메가 (100만+)", "#ef4444"], ["mid", "중형 (1~100만)", "#f59e0b"], ["niche", "니치 (1만↓)", "#22c55e"]].map(([k, l, c]) => (
                      <div key={k} style={{ padding: 12, borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: c, marginBottom: 6 }}>{l}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(trendData.hashtag_strategy[k] || []).map((tag, i) => (
                            <span key={i} style={{ padding: "2px 6px", borderRadius: 4, background: D ? "rgba(255,255,255,0.06)" : "#f0f0f0", color: text, fontSize: 10 }}>#{tag.replace(/^#/, "")}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {trendData.best_posting_time && <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg }}><div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 4 }}>⏰ 최적 게시 시간</div><div style={{ fontSize: 12, color: muted }}>{trendData.best_posting_time}</div></div>}
                {trendData.avoid && <div style={{ padding: 14, borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)", background: D ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.02)" }}><div style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>🚫 피해야 할 실수</div>{trendData.avoid.map((a, i) => <div key={i} style={{ fontSize: 11, color: muted }}>• {a}</div>)}</div>}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ 계정 분석 ═══ */}
      {tab === "account" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {PLATS.map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)}
                style={{ flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", border: `2px solid ${platform === p.id ? p.color : bdr}`, background: platform === p.id ? (D ? p.color + "18" : p.color + "08") : cardBg, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: platform === p.id ? (D ? "#fff" : p.color) : muted, fontSize: 12, fontWeight: platform === p.id ? 800 : 500 }}>
                <img src={p.icon} alt="" style={{ width: 16, height: 16, borderRadius: 3 }} />{p.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="@계정명" onKeyDown={e => e.key === "Enter" && analyzeAccount()}
              style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <button onClick={analyzeAccount} disabled={loading || !query.trim()}
              style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: plat.color, color: "#fff", fontSize: 13, fontWeight: 800, cursor: loading ? "wait" : "pointer", opacity: (loading || !query.trim()) ? 0.6 : 1 }}>
              {loading ? "분석 중..." : "분석"}
            </button>
          </div>

          {loading && <div style={{ textAlign: "center", padding: 50 }}><div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: plat.color, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} /><div style={{ fontSize: 13, color: muted }}>분석 중...</div></div>}

          {!loading && analysis && profile && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 16 }}>
                {profile.profilePic ? <img src={profile.profilePic} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 56, height: 56, borderRadius: "50%", background: bdr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: text }}>{profile.displayName || profile.username}</div>
                  <div style={{ fontSize: 11, color: muted }}>@{profile.username}{profile.followers ? ` · ${profile.followers}` : ""}{profile.subscribers ? ` · ${profile.subscribers}` : ""}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: `conic-gradient(${plat.color} ${(analysis.score || 0) * 3.6}deg, ${bdr} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: D ? "#1a1a2e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: plat.color }}>{analysis.score}</span>
                    </div>
                  </div>
                </div>
              </div>
              {analysis.summary && <div style={{ padding: "8px 14px", borderRadius: 8, background: D ? plat.color + "12" : plat.color + "06", border: `1px solid ${plat.color}25`, marginBottom: 16, fontSize: 12, fontWeight: 700, color: D ? "#fff" : plat.color }}>{analysis.summary}</div>}
              {(analysis.sections || []).map((sec, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: text }}>{sec.icon} {sec.title}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 900, background: sec.score >= 80 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: sec.score >= 80 ? "#22c55e" : "#f59e0b" }}>{sec.score}</span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: text, marginBottom: 8 }}>{sec.analysis}</div>
                  {sec.tips?.map((t, j) => <div key={j} style={{ fontSize: 11, color: muted, marginBottom: 3 }}><span style={{ color: accent, fontWeight: 700 }}>TIP</span> {t}</div>)}
                </div>
              ))}
              {analysis.recommendations && (
                <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${accent}25`, background: D ? accent + "06" : accent + "03", marginTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginBottom: 8 }}>추천 액션</div>
                  {analysis.recommendations.map((r, i) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, fontSize: 12, color: text }}><span style={{ width: 18, height: 18, borderRadius: 4, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>{r}</div>)}
                </div>
              )}
            </div>
          )}

          {!loading && !analysis && history.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>최근 분석</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setPlatform(h.platform); setQuery(h.username); }} style={{ padding: 12, borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {h.profilePic ? <img src={h.profilePic} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 28, height: 28, borderRadius: "50%", background: bdr, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>}
                      <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: text }}>{h.displayName || h.username}</div><div style={{ fontSize: 9, color: muted }}>{h.date}</div></div>
                      {h.score && <span style={{ fontSize: 14, fontWeight: 900, color: h.score >= 80 ? "#22c55e" : "#f59e0b" }}>{h.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !analysis && history.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: muted }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 4 }}>경쟁사 계정을 분석해보세요</div>
              <div style={{ fontSize: 12 }}>@계정명 입력 → AI가 콘텐츠 전략, 성장성, 참여율을 분석</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
