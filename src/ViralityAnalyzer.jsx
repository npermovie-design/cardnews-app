import { useState } from "react";
import { callAI } from "./aiClient";

const CATEGORIES = [
  { id: "beauty", label: "뷰티/화장품", icon: "💄", tags: ["뷰티","메이크업","스킨케어","화장품추천"] },
  { id: "fashion", label: "패션/의류", icon: "👗", tags: ["패션","OOTD","데일리룩","코디"] },
  { id: "food", label: "푸드/맛집", icon: "🍽", tags: ["맛집","레시피","먹방","카페"] },
  { id: "travel", label: "여행", icon: "✈️", tags: ["여행","여행스타그램","해외여행","국내여행"] },
  { id: "fitness", label: "헬스/피트니스", icon: "💪", tags: ["운동","헬스","다이어트","홈트"] },
  { id: "tech", label: "IT/테크", icon: "📱", tags: ["IT","테크","AI","앱추천"] },
  { id: "interior", label: "인테리어", icon: "🏠", tags: ["인테리어","홈스타그램","집꾸미기","리빙"] },
  { id: "pet", label: "반려동물", icon: "🐶", tags: ["반려견","반려묘","펫스타그램","고양이"] },
  { id: "business", label: "비즈니스/마케팅", icon: "💼", tags: ["마케팅","창업","부업","온라인비즈니스"] },
  { id: "education", label: "교육/자기계발", icon: "📚", tags: ["공부","자기계발","영어","독서"] },
];

export default function ViralityAnalyzer({ isDark }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const [tab, setTab] = useState("trending"); // trending | account
  const [loading, setLoading] = useState(false);

  // ── 트렌딩 탐색 상태 ──
  const [selCat, setSelCat] = useState(null);
  const [trendData, setTrendData] = useState(null);

  // ── 계정 분석 상태 ──
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

  // ── 트렌딩 분석 ──
  const analyzeTrend = async (cat) => {
    setSelCat(cat); setTrendData(null); setLoading(true);
    try {
      const res = await callAI("claude-sonnet-4-5", [{ role: "user", content: `인스타그램 "${cat.label}" 분야의 최신 트렌드를 분석해주세요.

관련 해시태그: ${cat.tags.join(", ")}

다음 JSON 형식으로 출력하세요:
{
  "overview": "현재 이 분야의 전반적인 트렌드 요약 (3~4줄)",
  "viral_formats": [
    {
      "title": "바이럴 콘텐츠 포맷명",
      "description": "이 포맷이 왜 뜨는지 설명 (2줄)",
      "example": "실제 콘텐츠 예시",
      "views_range": "예상 조회수 범위 (예: 10만~50만)",
      "difficulty": "쉬움/보통/어려움"
    }
  ],
  "trending_hooks": [
    {
      "hook": "첫 줄/첫 3초 훅 예시",
      "why_works": "왜 이 훅이 효과적인지",
      "type": "질문형/충격형/호기심형/공감형/숫자형"
    }
  ],
  "content_ideas": [
    {
      "title": "콘텐츠 아이디어 제목",
      "format": "릴스/카루셀/스토리/피드",
      "description": "구체적인 실행 방법",
      "estimated_engagement": "높음/중간/보통"
    }
  ],
  "hashtag_strategy": {
    "mega": ["팔로워 100만+ 해시태그 3개"],
    "mid": ["1만~100만 해시태그 5개"],
    "niche": ["1만 이하 니치 해시태그 5개"]
  },
  "best_posting_time": "이 분야 최적 게시 시간대",
  "avoid": ["이 분야에서 피해야 할 실수 3가지"]
}

JSON만 출력하세요.` }], 4000,
        "당신은 인스타그램 트렌드 분석 전문가입니다. 2025-2026년 최신 인스타그램 알고리즘과 바이럴 패턴에 정통합니다. 한국 시장 기준으로 분석합니다."
      );
      const cleaned = (res || "").replace(/```json\n?/g, "").replace(/```/g, "").trim();
      setTrendData(JSON.parse(cleaned));
    } catch (e) { alert("트렌드 분석 실패: " + e.message); }
    setLoading(false);
  };

  // ── 계정 분석 ──
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
      const res = await callAI("claude-sonnet-4-5", [{ role: "user", content: `다음 ${platLabel} 크리에이터를 분석해주세요:

계정명: @${pData.username}
이름: ${pData.displayName || ""}
소개: ${pData.bio || "정보 없음"}
${pData.followers ? `팔로워: ${pData.followers}` : ""}${pData.subscribers ? `구독자: ${pData.subscribers}` : ""}${pData.posts ? ` · 게시물: ${pData.posts}` : ""}

JSON 형식으로 출력:
{
  "summary": "한줄 요약 (20자 이내)",
  "score": 85,
  "sections": [
    { "title": "콘텐츠 전략", "icon": "📝", "score": 90, "analysis": "분석 (3~5줄)", "tips": ["팁1","팁2"] },
    { "title": "성장 가능성", "icon": "📈", "score": 80, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "참여율", "icon": "💬", "score": 75, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "브랜딩", "icon": "🎯", "score": 85, "analysis": "분석", "tips": ["팁1","팁2"] },
    { "title": "차별화", "icon": "⚡", "score": 70, "analysis": "분석", "tips": ["팁1","팁2"] }
  ],
  "recommendations": ["추천 액션 1","추천 액션 2","추천 액션 3"]
}
JSON만 출력.` }], 3000,
        `당신은 ${platLabel} 마케팅 분석 전문가입니다. 크리에이터의 프로필을 바탕으로 콘텐츠 전략, 성장성, 개선점을 분석합니다.`
      );
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
    <div style={{ padding: "20px 24px 60px", maxWidth: 940, margin: "0 auto" }}>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[["trending", "트렌딩 탐색"], ["account", "계정 분석"]].map(([k, l]) =>
          <button key={k} onClick={() => { setTab(k); setTrendData(null); setAnalysis(null); setProfile(null); }}
            style={{ padding: "10px 22px", borderRadius: 10, border: `1.5px solid ${tab === k ? accent : bdr}`, background: tab === k ? (D ? accent + "20" : accent + "0a") : "transparent", color: tab === k ? accent : muted, fontSize: 14, fontWeight: tab === k ? 800 : 500, cursor: "pointer" }}>
            {l}
          </button>
        )}
      </div>

      {/* ═══ 트렌딩 탐색 ═══ */}
      {tab === "trending" && (
        <>
          {/* 카테고리 그리드 */}
          {!trendData && !loading && (
            <div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>분석할 분야를 선택하세요</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => analyzeTrend(cat)}
                    style={{ padding: "18px 14px", borderRadius: 14, border: `1px solid ${selCat?.id === cat.id ? accent : bdr}`, background: cardBg, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{cat.label}</div>
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{cat.tags.slice(0, 2).map(t => "#" + t).join(" ")}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 로딩 */}
          {loading && selCat && (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: text }}>{selCat.icon} {selCat.label} 트렌드 분석 중...</div>
            </div>
          )}

          {/* 트렌드 결과 */}
          {!loading && trendData && selCat && (
            <div>
              <button onClick={() => { setTrendData(null); setSelCat(null); }} style={{ background: "none", border: "none", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>← 분야 선택으로 돌아가기</button>

              <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 6 }}>{selCat.icon} {selCat.label} 트렌드</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: muted, marginBottom: 24 }}>{trendData.overview}</div>

              {/* 바이럴 포맷 */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 12 }}>🔥 바이럴 콘텐츠 포맷</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(trendData.viral_formats || []).map((f, i) => (
                    <div key={i} style={{ padding: 18, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: text }}>{f.title}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {f.views_range && <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10, fontWeight: 700 }}>▶ {f.views_range}</span>}
                          {f.difficulty && <span style={{ padding: "3px 8px", borderRadius: 6, background: f.difficulty === "쉬움" ? "rgba(34,197,94,0.12)" : f.difficulty === "보통" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)", color: f.difficulty === "쉬움" ? "#22c55e" : f.difficulty === "보통" ? "#f59e0b" : "#ef4444", fontSize: 10, fontWeight: 700 }}>{f.difficulty}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 6 }}>{f.description}</div>
                      {f.example && <div style={{ fontSize: 12, color: accent, fontStyle: "italic" }}>예시: {f.example}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 트렌딩 훅 */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 12 }}>⚡ 트렌딩 훅 (첫 3초)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(trendData.trending_hooks || []).map((h, i) => (
                    <div key={i} style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#E1306C", marginBottom: 6 }}>"{h.hook}"</div>
                      <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{h.why_works}</div>
                      {h.type && <span style={{ padding: "2px 8px", borderRadius: 4, background: accent + "15", color: accent, fontSize: 10, fontWeight: 600 }}>{h.type}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 콘텐츠 아이디어 */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 12 }}>💡 콘텐츠 아이디어</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                  {(trendData.content_ideas || []).map((idea, i) => (
                    <div key={i} style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: text }}>{idea.title}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(124,106,255,0.12)", color: accent, fontSize: 10, fontWeight: 600 }}>{idea.format}</span>
                      </div>
                      <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{idea.description}</div>
                      {idea.estimated_engagement && <div style={{ fontSize: 10, color: idea.estimated_engagement === "높음" ? "#22c55e" : "#f59e0b", fontWeight: 700, marginTop: 6 }}>참여율: {idea.estimated_engagement}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 해시태그 전략 */}
              {trendData.hashtag_strategy && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 12 }}>#️⃣ 해시태그 전략</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[["mega", "메가 (100만+)", "#ef4444"], ["mid", "중형 (1만~100만)", "#f59e0b"], ["niche", "니치 (1만 이하)", "#22c55e"]].map(([k, l, c]) => (
                      <div key={k} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 8 }}>{l}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(trendData.hashtag_strategy[k] || []).map((tag, i) => (
                            <span key={i} style={{ padding: "3px 8px", borderRadius: 6, background: D ? "rgba(255,255,255,0.06)" : "#f0f0f0", color: text, fontSize: 11 }}>#{tag.replace(/^#/, "")}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 정보 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {trendData.best_posting_time && (
                  <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 6 }}>⏰ 최적 게시 시간</div>
                    <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{trendData.best_posting_time}</div>
                  </div>
                )}
                {trendData.avoid && (
                  <div style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: D ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.03)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", marginBottom: 6 }}>🚫 피해야 할 실수</div>
                    {(trendData.avoid || []).map((a, i) => <div key={i} style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>• {a}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ 계정 분석 ═══ */}
      {tab === "account" && (
        <>
          {/* 플랫폼 선택 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {PLATS.map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", border: `2px solid ${platform === p.id ? p.color : bdr}`, background: platform === p.id ? (D ? p.color + "20" : p.color + "08") : cardBg, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: platform === p.id ? (D ? "#fff" : p.color) : muted, fontSize: 13, fontWeight: platform === p.id ? 800 : 500 }}>
                <img src={p.icon} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }} />{p.label}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="@계정명을 입력하세요" onKeyDown={e => e.key === "Enter" && analyzeAccount()}
              style={{ flex: 1, padding: "13px 16px", borderRadius: 12, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <button onClick={analyzeAccount} disabled={loading || !query.trim()}
              style={{ padding: "13px 24px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer", background: plat.color, color: "#fff", fontSize: 14, fontWeight: 800, opacity: (loading || !query.trim()) ? 0.6 : 1 }}>
              {loading ? "분석 중..." : "분석"}
            </button>
          </div>

          {/* 로딩 */}
          {loading && (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: plat.color, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>@{query.replace("@", "")} 분석 중...</div>
            </div>
          )}

          {/* 분석 결과 */}
          {!loading && analysis && profile && (
            <div>
              {/* 프로필 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, borderRadius: 16, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 20 }}>
                {profile.profilePic ? <img src={profile.profilePic} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 60, height: 60, borderRadius: "50%", background: D ? "rgba(255,255,255,0.1)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{profile.displayName || profile.username}</div>
                  <div style={{ fontSize: 12, color: muted }}>@{profile.username}{profile.followers ? ` · 팔로워 ${profile.followers}` : ""}{profile.subscribers ? ` · 구독자 ${profile.subscribers}` : ""}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: `conic-gradient(${plat.color} ${(analysis.score || 0) * 3.6}deg, ${bdr} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 54, height: 54, borderRadius: "50%", background: D ? "#1a1a2e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: plat.color }}>{analysis.score}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>종합 점수</div>
                </div>
              </div>

              {analysis.summary && <div style={{ padding: "10px 16px", borderRadius: 10, background: D ? plat.color + "15" : plat.color + "08", border: `1px solid ${plat.color}30`, marginBottom: 20, fontSize: 13, fontWeight: 700, color: D ? "#fff" : plat.color }}>{analysis.summary}</div>}

              {/* 섹션 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {(analysis.sections || []).map((sec, i) => (
                  <div key={i} style={{ padding: 18, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: text }}>{sec.icon} {sec.title}</span>
                      <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 12, fontWeight: 900, background: sec.score >= 80 ? "rgba(34,197,94,0.12)" : sec.score >= 60 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)", color: sec.score >= 80 ? "#22c55e" : sec.score >= 60 ? "#f59e0b" : "#ef4444" }}>{sec.score}점</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: text, marginBottom: 10 }}>{sec.analysis}</div>
                    {sec.tips?.map((t, j) => <div key={j} style={{ fontSize: 12, color: muted, marginBottom: 4 }}><span style={{ color: accent, fontWeight: 700 }}>TIP</span> {t}</div>)}
                  </div>
                ))}
              </div>

              {analysis.recommendations && (
                <div style={{ padding: 18, borderRadius: 14, border: `1px solid ${accent}30`, background: D ? accent + "08" : accent + "04" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: accent, marginBottom: 10 }}>추천 액션</div>
                  {analysis.recommendations.map((r, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: text }}><span style={{ width: 20, height: 20, borderRadius: 5, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span><span style={{ lineHeight: 1.5 }}>{r}</span></div>)}
                </div>
              )}
            </div>
          )}

          {/* 히스토리 */}
          {!loading && !analysis && history.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 10 }}>최근 분석</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setPlatform(h.platform); setQuery(h.username); }} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {h.profilePic ? <img src={h.profilePic} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: bdr, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>}
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: text }}>{h.displayName || h.username}</div><div style={{ fontSize: 10, color: muted }}>@{h.username} · {h.date}</div></div>
                      {h.score && <span style={{ fontSize: 15, fontWeight: 900, color: h.score >= 80 ? "#22c55e" : "#f59e0b" }}>{h.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !analysis && history.length === 0 && (
            <div style={{ textAlign: "center", padding: 50, color: muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 6 }}>경쟁사 계정을 분석해보세요</div>
              <div style={{ fontSize: 12 }}>@계정명을 입력하면 AI가 콘텐츠 전략, 성장성, 참여율을 분석합니다.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
