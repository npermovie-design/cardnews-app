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

export default function SocialAnalyzer({ isDark, user }) {
  const [links, setLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
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

  // 프록시를 통해 페이지 메타 정보 수집
  const fetchPageMeta = async (url) => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) return { url, error: "페이지를 불러올 수 없습니다" };
      const html = await res.text();
      // 메타 태그에서 정보 추출
      const getMeta = (name) => {
        const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
          || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
        return m ? m[1] : null;
      };
      const title = getMeta("og:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
      const desc = getMeta("og:description") || getMeta("description") || "";
      const image = getMeta("og:image") || "";
      const siteName = getMeta("og:site_name") || "";
      const type = getMeta("og:type") || "";
      // followers/subscriber 정보 (일부 플랫폼 메타에 포함)
      const followers = getMeta("profile:followers_count") || "";
      return { url, title: title.slice(0, 300), desc: desc.slice(0, 500), image, siteName, type, followers, htmlSnippet: html.slice(0, 3000) };
    } catch {
      return { url, error: "네트워크 오류" };
    }
  };

  const analyze = async () => {
    if (validLinks.length === 0) return;
    setLoading(true); setError(null); setReport(null);

    try {
      // 1단계: 각 링크의 메타 정보 수집
      setProgress("SNS 페이지 정보를 수집하고 있어요...");
      const metaResults = await Promise.all(validLinks.map(fetchPageMeta));

      // 2단계: 플랫폼 감지
      const analyzed = metaResults.map(m => ({
        ...m,
        platform: detectPlatform(m.url),
      }));

      // 3단계: AI 분석 요청
      setProgress("AI가 계정을 분석하고 있어요...");

      const linksInfo = analyzed.map((a, i) => {
        const p = a.platform;
        return `[계정 ${i + 1}] ${p?.label || "미확인"}\nURL: ${a.url}\n제목: ${a.title || "N/A"}\n설명: ${a.desc || "N/A"}\n사이트: ${a.siteName || "N/A"}\n페이지 유형: ${a.type || "N/A"}\n팔로워: ${a.followers || "정보 없음"}\n페이지 미리보기:\n${a.htmlSnippet || ""}`;
      }).join("\n\n---\n\n");

      const prompt = `당신은 SNS 마케팅 전문 분석가입니다. 다음 SNS 계정들을 심층 분석해주세요.

${linksInfo}

다음 형식으로 분석 보고서를 작성해주세요. 반드시 한국어로 작성하세요.
이모지, 이모티콘 절대 사용 금지. 특수기호(★●■▶♥☆→) 사용 금지.

## 1. 계정 기본 분석
각 계정별로:
- 플랫폼 및 계정명
- 주요 콘텐츠 주제/카테고리
- 타겟 오디언스 추정
- 콘텐츠 스타일 분석 (톤, 형식, 빈도 추정)
- 강점과 약점

## 2. 핵심 지표 추정
(페이지에서 확인 가능한 정보 기반으로 추정)
- 활동 수준 (활발/보통/저조)
- 콘텐츠 일관성
- 브랜딩 완성도
- 참여도 추정

## 3. 벤치마킹 - 유사 계정 사례 5개
각 계정의 카테고리와 비슷하지만 더 성공적인 계정들을 추천:
- 계정명 (실제 존재하는 계정)
- 왜 벤치마킹 대상인지
- 배울 점

## 4. 성장 가이드라인
- 즉시 실행 가능한 개선사항 (1주 내)
- 중기 전략 (1~3개월)
- 장기 성장 로드맵 (3~6개월)
- 콘텐츠 아이디어 10개 (구체적인 주제/제목 제안)
- 최적의 포스팅 시간대와 빈도

## 5. 크로스 플랫폼 전략
(입력된 계정이 2개 이상이면)
- 플랫폼 간 시너지 방안
- 콘텐츠 재활용 전략
- 트래픽 유도 방법

분석은 구체적이고 실행 가능한 내용으로 작성하세요. 일반론이 아닌 해당 계정에 맞춤화된 조언을 주세요.`;

      const apiKey = localStorage.getItem("gemini_api_key") || "";
      const geminiUrl = apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
        : "/api/proxy?action=gemini";

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
      };

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("AI 분석 요청 실패");
      const data = await res.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("AI 응답이 비어있습니다");

      setReport({ text: aiText, links: analyzed, date: new Date().toLocaleString("ko-KR") });
      setProgress("");

      // 스크롤 to 리포트
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    } catch (e) {
      setError(e.message || "분석 중 오류가 발생했습니다");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  // 마크다운 → 간단 HTML 변환
  const renderMarkdown = (md) => {
    if (!md) return null;
    const lines = md.split("\n");
    const elements = [];
    let inList = false;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) { elements.push(<div key={i} style={{ height: 12 }} />); inList = false; return; }

      // ## 헤더
      if (trimmed.startsWith("## ")) {
        inList = false;
        elements.push(
          <div key={i} style={{ fontSize: 20, fontWeight: 900, color: text, marginTop: 32, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${acc}30` }}>
            {trimmed.replace(/^##\s*/, "").replace(/\*\*/g, "")}
          </div>
        );
        return;
      }
      // ### 서브헤더
      if (trimmed.startsWith("### ")) {
        inList = false;
        elements.push(
          <div key={i} style={{ fontSize: 16, fontWeight: 800, color: text, marginTop: 20, marginBottom: 8 }}>
            {trimmed.replace(/^###\s*/, "").replace(/\*\*/g, "")}
          </div>
        );
        return;
      }
      // - 리스트
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = trimmed.replace(/^[-*]\s*/, "");
        // **볼드** 처리
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        elements.push(
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, paddingLeft: 8 }}>
            <span style={{ color: acc, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>-</span>
            <span style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
              {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**")
                ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong>
                : p
              )}
            </span>
          </div>
        );
        return;
      }
      // 숫자 리스트
      if (/^\d+[\.\)]\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)/)[1];
        const content = trimmed.replace(/^\d+[\.\)]\s*/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        elements.push(
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, paddingLeft: 4 }}>
            <span style={{ color: acc, fontWeight: 800, fontSize: 14, flexShrink: 0, minWidth: 20 }}>{num}.</span>
            <span style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.7 }}>
              {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**")
                ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong>
                : p
              )}
            </span>
          </div>
        );
        return;
      }
      // 일반 텍스트
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <div key={i} style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.75)" : "#555", lineHeight: 1.8, marginBottom: 4 }}>
          {parts.map((p, pi) => p.startsWith("**") && p.endsWith("**")
            ? <strong key={pi} style={{ fontWeight: 800, color: text }}>{p.slice(2, -2)}</strong>
            : p
          )}
        </div>
      );
    });
    return elements;
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 60px" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 20, background: "rgba(124,106,255,0.1)", fontSize: 12, fontWeight: 700, color: acc, marginBottom: 14 }}>
          소셜분석기
        </div>
        <div style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 8 }}>
          SNS 계정을 분석하고<br/>성장 전략을 제안해드려요
        </div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>
          운영 중인 SNS 링크를 입력하면 AI가 계정을 분석하고, 유사 사례와 가이드라인을 제공합니다.
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
              {/* 플랫폼 감지 표시 */}
              <div style={{ width: 36, height: 36, borderRadius: 10, background: detected ? `${detected.color}15` : (isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${detected ? detected.color + "30" : bdr}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: detected?.color || muted }}>
                  {detected ? detected.label.slice(0, 2) : String(idx + 1)}
                </span>
              </div>
              <input
                value={link}
                onChange={e => updateLink(idx, e.target.value)}
                placeholder={detected?.placeholder || "SNS 프로필 URL을 입력하세요"}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${detected ? detected.color + "40" : bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", transition: "border 0.15s" }}
                onFocus={e => e.target.style.borderColor = acc}
                onBlur={e => e.target.style.borderColor = detected ? detected.color + "40" : bdr}
              />
              {links.length > 1 && (
                <button onClick={() => removeLink(idx)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  x
                </button>
              )}
            </div>
          );
        })}

        {/* 링크 추가 + 분석 버튼 */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {links.length < 10 && (
            <button onClick={addLink} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              + 링크 추가
            </button>
          )}
          <button
            onClick={analyze}
            disabled={loading || validLinks.length === 0}
            style={{ flex: 1, padding: "12px 24px", borderRadius: 12, border: "none", background: validLinks.length > 0 ? `linear-gradient(135deg, ${acc}, #8b5cf6)` : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"), color: validLinks.length > 0 ? "#fff" : muted, fontSize: 14, fontWeight: 800, cursor: validLinks.length > 0 ? "pointer" : "default", transition: "all 0.15s" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                분석 중...
              </span>
            ) : `AI 분석 시작 (${validLinks.length}개 계정)`}
          </button>
        </div>

        {/* 진행 상태 */}
        {progress && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: `${acc}08`, border: `1px solid ${acc}20`, fontSize: 13, color: acc, fontWeight: 600 }}>
            {progress}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>

      {/* 지원 플랫폼 안내 */}
      {!report && !loading && (
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "24px", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 14 }}>지원 플랫폼</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SNS_PLATFORMS.filter(p => p.id !== "other").map(p => (
              <div key={p.id} style={{ padding: "6px 14px", borderRadius: 20, background: `${p.color}10`, border: `1px solid ${p.color}20`, fontSize: 11, fontWeight: 600, color: p.color }}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 분석 리포트 */}
      {report && (
        <div ref={reportRef} style={{ background: cardBg, borderRadius: 20, border: `1px solid ${bdr}`, padding: "32px 28px", marginBottom: 24, boxShadow: isDark ? "none" : "0 4px 24px rgba(0,0,0,0.04)" }}>
          {/* 리포트 헤더 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${bdr}` }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 4 }}>SNS 분석 리포트</div>
              <div style={{ fontSize: 12, color: muted }}>{report.date} | {report.links.length}개 계정 분석</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(report.text); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              복사
            </button>
          </div>

          {/* 분석된 계정 카드 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
            {report.links.map((l, i) => (
              <div key={i} style={{ padding: "10px 16px", borderRadius: 12, background: `${l.platform?.color || acc}08`, border: `1px solid ${l.platform?.color || acc}20`, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.platform?.color || acc }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{l.platform?.label || "미확인"}</div>
                  <div style={{ fontSize: 10, color: muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title || l.url}</div>
                </div>
              </div>
            ))}
          </div>

          {/* AI 분석 본문 */}
          <div>{renderMarkdown(report.text)}</div>
        </div>
      )}
    </div>
  );
}
