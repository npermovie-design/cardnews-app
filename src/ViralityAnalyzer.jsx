import { useState } from "react";
import { callAI } from "./aiClient";

const PLATFORMS = [
  { id: "instagram", label: "인스타그램", icon: "/icon-instagram.webp", color: "#E1306C", placeholder: "@username 또는 릴스 URL" },
  { id: "tiktok", label: "틱톡", icon: "/icon-youtube.png", color: "#010101", placeholder: "@username 또는 영상 URL" },
  { id: "youtube", label: "유튜브", icon: "/icon-youtube.png", color: "#FF0000", placeholder: "@채널명 또는 영상 URL" },
];

export default function ViralityAnalyzer({ isDark }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const [platform, setPlatform] = useState("instagram");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
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

  const analyze = async () => {
    if (!query.trim()) return;
    setLoading(true); setProfile(null); setAnalysis(null);

    try {
      // 1) 프로필 데이터 수집
      const pRes = await fetch("/api/analyze-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: query.replace(/^@/, "").trim() }),
      });
      const pData = await pRes.json();
      if (pData.error) throw new Error(pData.error);
      setProfile(pData);

      // 2) AI 분석
      const systemPrompt = platform === "instagram"
        ? "당신은 인스타그램 마케팅 분석 전문가입니다. 크리에이터의 공개 프로필 정보를 바탕으로 콘텐츠 전략, 성장 가능성, 개선점을 분석합니다."
        : platform === "youtube"
        ? "당신은 유튜브 채널 분석 전문가입니다. 채널의 콘텐츠 전략, 성장 패턴, SEO 전략을 분석합니다."
        : "당신은 틱톡 마케팅 분석 전문가입니다. 크리에이터의 숏폼 콘텐츠 전략과 바이럴 패턴을 분석합니다.";

      const prompt = `다음 ${platform} 크리에이터를 분석해주세요:

계정명: @${pData.username}
이름: ${pData.displayName || ""}
소개: ${pData.bio || "정보 없음"}
${pData.followers ? `팔로워: ${pData.followers}` : ""}
${pData.subscribers ? `구독자: ${pData.subscribers}` : ""}
${pData.posts ? `게시물: ${pData.posts}` : ""}

다음 형식으로 분석해주세요 (JSON으로 출력):
{
  "summary": "한줄 요약 (20자 이내)",
  "score": 85,
  "sections": [
    {
      "title": "콘텐츠 전략",
      "icon": "📝",
      "score": 90,
      "analysis": "상세 분석 내용 (3~5줄)",
      "tips": ["개선 팁 1", "개선 팁 2"]
    },
    {
      "title": "성장 가능성",
      "icon": "📈",
      "score": 80,
      "analysis": "분석 내용",
      "tips": ["팁 1", "팁 2"]
    },
    {
      "title": "참여율/인게이지먼트",
      "icon": "💬",
      "score": 75,
      "analysis": "분석 내용",
      "tips": ["팁 1", "팁 2"]
    },
    {
      "title": "브랜딩/프로필",
      "icon": "🎯",
      "score": 85,
      "analysis": "분석 내용",
      "tips": ["팁 1", "팁 2"]
    },
    {
      "title": "경쟁 우위/차별화",
      "icon": "⚡",
      "score": 70,
      "analysis": "분석 내용",
      "tips": ["팁 1", "팁 2"]
    }
  ],
  "recommendations": ["전체 추천 액션 1", "전체 추천 액션 2", "전체 추천 액션 3"]
}

JSON만 출력하세요. 다른 텍스트 없이.`;

      const aiRes = await callAI("claude-sonnet-4-5", [{ role: "user", content: prompt }], 3000, systemPrompt);
      const cleaned = (aiRes || "").replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAnalysis(parsed);

      saveHistory({
        platform, username: pData.username, displayName: pData.displayName,
        profilePic: pData.profilePic, score: parsed.score, summary: parsed.summary,
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      alert("분석 실패: " + e.message);
    }
    setLoading(false);
  };

  const plat = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];

  return (
    <div style={{ padding: "24px 24px 60px", maxWidth: 900, margin: "0 auto" }}>

      {/* 플랫폼 선택 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setPlatform(p.id)}
            style={{
              flex: 1, padding: "14px 12px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${platform === p.id ? p.color : bdr}`,
              background: platform === p.id ? (D ? p.color + "20" : p.color + "08") : cardBg,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              color: platform === p.id ? (D ? "#fff" : p.color) : muted,
              fontSize: 13, fontWeight: platform === p.id ? 800 : 500, transition: "all 0.15s",
            }}>
            <img src={p.icon} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "contain" }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* 검색 입력 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={plat.placeholder}
          onKeyDown={e => e.key === "Enter" && analyze()}
          style={{
            flex: 1, padding: "14px 16px", borderRadius: 12, border: `1px solid ${bdr}`,
            background: inputBg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box",
          }} />
        <button onClick={analyze} disabled={loading || !query.trim()}
          style={{
            padding: "14px 28px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer",
            background: plat.color, color: "#fff", fontSize: 14, fontWeight: 800,
            opacity: (loading || !query.trim()) ? 0.6 : 1,
          }}>
          {loading ? "분석 중..." : "분석하기"}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: plat.color, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: text }}>@{query.replace("@", "")} 분석 중...</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>프로필 데이터 수집 + AI 분석 진행 중</div>
        </div>
      )}

      {/* 분석 결과 */}
      {!loading && analysis && profile && (
        <div>
          {/* 프로필 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, borderRadius: 16, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 20 }}>
            {profile.profilePic
              ? <img src={profile.profilePic} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 64, height: 64, borderRadius: "50%", background: D ? "rgba(255,255,255,0.1)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{profile.displayName || profile.username}</div>
              <div style={{ fontSize: 13, color: muted }}>@{profile.username}</div>
              {profile.bio && <div style={{ fontSize: 11, color: muted, marginTop: 4, lineHeight: 1.5 }}>{profile.bio.slice(0, 150)}</div>}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `conic-gradient(${plat.color} ${(analysis.score || 0) * 3.6}deg, ${bdr} 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: D ? "#1a1a2e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: plat.color }}>{analysis.score}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>종합 점수</div>
            </div>
          </div>

          {/* 요약 */}
          <div style={{ padding: "12px 16px", borderRadius: 10, background: D ? plat.color + "15" : plat.color + "08", border: `1px solid ${plat.color}30`, marginBottom: 20, fontSize: 13, fontWeight: 700, color: D ? "#fff" : plat.color }}>
            {analysis.summary}
          </div>

          {/* 섹션별 분석 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {(analysis.sections || []).map((sec, i) => (
              <div key={i} style={{ padding: 20, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{sec.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: text }}>{sec.title}</span>
                  </div>
                  <div style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 900,
                    background: sec.score >= 80 ? "rgba(34,197,94,0.15)" : sec.score >= 60 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                    color: sec.score >= 80 ? "#22c55e" : sec.score >= 60 ? "#f59e0b" : "#ef4444",
                  }}>{sec.score}점</div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: text, marginBottom: 12 }}>{sec.analysis}</div>
                {sec.tips && sec.tips.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sec.tips.map((tip, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, fontSize: 12, color: muted }}>
                        <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>TIP</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 추천 액션 */}
          {analysis.recommendations && (
            <div style={{ padding: 20, borderRadius: 14, border: `1px solid ${accent}30`, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: accent, marginBottom: 12 }}>추천 액션 플랜</div>
              {analysis.recommendations.map((rec, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: text }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ lineHeight: 1.6 }}>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 최근 분석 히스토리 */}
      {!loading && !analysis && history.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>최근 분석</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 12 }}>
            {history.map((h, i) => (
              <div key={i} onClick={() => { setPlatform(h.platform); setQuery(h.username); }}
                style={{ padding: 16, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {h.profilePic
                    ? <img src={h.profilePic} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: D ? "rgba(255,255,255,0.1)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.displayName || h.username}</div>
                    <div style={{ fontSize: 11, color: muted }}>@{h.username} · {h.platform}</div>
                  </div>
                  {h.score && <div style={{ fontSize: 16, fontWeight: 900, color: h.score >= 80 ? "#22c55e" : h.score >= 60 ? "#f59e0b" : "#ef4444" }}>{h.score}</div>}
                </div>
                {h.summary && <div style={{ fontSize: 11, color: muted, marginTop: 8 }}>{h.summary}</div>}
                <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{h.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !analysis && history.length === 0 && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 8 }}>경쟁사 SNS 계정을 분석해보세요</div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
            인스타그램, 틱톡, 유튜브 크리에이터의 계정명을 입력하면<br />
            AI가 콘텐츠 전략, 성장 가능성, 참여율을 분석합니다.
          </div>
        </div>
      )}
    </div>
  );
}
