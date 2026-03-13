import { useState } from "react";

const CONTENT_TYPES = [
  { id: "blog", label: "블로그 글", icon: "📝", desc: "SEO 최적화 블로그 포스트" },
  { id: "cardnews", label: "카드뉴스 설명글", icon: "🃏", desc: "카드뉴스용 본문 텍스트" },
  { id: "sns", label: "SNS 캡션", icon: "📱", desc: "인스타·페이스북 캡션" },
  { id: "youtube", label: "유튜브 설명란", icon: "▶️", desc: "유튜브 영상 설명 + 태그" },
];

const TONES = [
  { id: "professional", label: "전문적" },
  { id: "friendly", label: "친근한" },
  { id: "witty", label: "재치있는" },
  { id: "emotional", label: "감성적" },
];

function buildPrompt(keyword, contentType, tone, extra) {
  const toneMap = { professional: "전문적이고 신뢰감 있는", friendly: "친근하고 편안한", witty: "재치있고 유머러스한", emotional: "감성적이고 공감가는" };
  const toneStr = toneMap[tone] || "전문적인";

  if (contentType === "blog") {
    return `다음 주제로 ${toneStr} 톤의 SEO 최적화 블로그 글을 작성해주세요.

주제: ${keyword}
${extra ? `추가 요청: ${extra}` : ""}

형식:
# [매력적인 제목]

## 서론 (독자의 관심을 끄는 도입부, 2-3문단)

## 본론
### [소제목1]
[내용]

### [소제목2]
[내용]

### [소제목3]
[내용]

## 결론 (핵심 요약 + 행동 유도)

---
**관련 태그:** #태그1 #태그2 #태그3 #태그4 #태그5

총 1000-1500자 분량으로 작성해주세요.`;
  }

  if (contentType === "cardnews") {
    return `다음 주제로 카드뉴스용 설명글을 ${toneStr} 톤으로 작성해주세요.

주제: ${keyword}
${extra ? `추가 요청: ${extra}` : ""}

형식:
**[카드 1] 표지**
제목: 
부제목: 

**[카드 2]**
소제목: 
내용: (2-3줄)

**[카드 3]**
소제목: 
내용: (2-3줄)

**[카드 4]**
소제목: 
내용: (2-3줄)

**[카드 5] 마무리**
핵심 메시지: 
CTA: 

각 카드는 짧고 임팩트 있게, 총 5-7장으로 구성해주세요.`;
  }

  if (contentType === "sns") {
    return `다음 주제로 SNS(인스타그램/페이스북)용 캡션을 ${toneStr} 톤으로 작성해주세요.

주제: ${keyword}
${extra ? `추가 요청: ${extra}` : ""}

형식:
**인스타그램 버전** (이모지 활용, 줄바꿈 리듬감)

---

**페이스북 버전** (조금 더 길고 상세하게)

---

**해시태그** (인스타용 20개, 페이스북용 5개 분리)

감성적이고 공감가는 내용으로, 저장하고 싶은 캡션으로 만들어주세요.`;
  }

  if (contentType === "youtube") {
    return `다음 주제로 유튜브 영상 설명란을 ${toneStr} 톤으로 작성해주세요.

주제: ${keyword}
${extra ? `추가 요청: ${extra}` : ""}

형식:
**📌 영상 소개** (2-3문장, 핵심 요약)

**⏱ 타임스탬프**
00:00 인트로
00:30 [내용1]
01:30 [내용2]
03:00 [내용3]
05:00 마무리

**✅ 이 영상에서 배울 수 있는 것**
• 포인트1
• 포인트2
• 포인트3

**🔗 관련 링크**
홈페이지: 
인스타그램: 
문의: 

**#해시태그** (검색 최적화용 15개)

구독과 좋아요를 유도하는 문구도 포함해주세요.`;
  }

  return `${keyword}에 대해 ${toneStr} 톤으로 콘텐츠를 작성해주세요.`;
}

export default function BlogGenerator() {
  const [keyword, setKeyword] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [extra, setExtra] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!keyword.trim()) {
      setError("키워드 또는 주제를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    setCopied(false);

    const prompt = buildPrompt(keyword, contentType, tone, extra);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 2000,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) throw new Error("API 오류가 발생했습니다.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                setResult((prev) => prev + parsed.delta.text);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setError("생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e9ecef", padding: "20px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
            ✍️ 블로그 글 생성기
          </h1>
          <p style={{ color: "#6c757d", margin: "6px 0 0", fontSize: 14 }}>
            키워드를 입력하면 AI가 콘텐츠를 자동으로 생성해드립니다
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>
        {/* Content Type 선택 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 12, color: "#1a1a2e", fontSize: 15 }}>
            콘텐츠 타입
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: contentType === type.id ? "2px solid #4f46e5" : "2px solid #e9ecef",
                  background: contentType === type.id ? "#f0f0ff" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{type.icon}</div>
                <div style={{ fontWeight: 600, color: contentType === type.id ? "#4f46e5" : "#1a1a2e", fontSize: 14 }}>
                  {type.label}
                </div>
                <div style={{ color: "#6c757d", fontSize: 12, marginTop: 2 }}>{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 키워드 입력 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 10, color: "#1a1a2e", fontSize: 15 }}>
            키워드 / 주제 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="예: 다이어트 식단 관리법, 재테크 초보 가이드..."
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: error ? "2px solid #ef4444" : "2px solid #e9ecef",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
              transition: "border 0.15s",
            }}
            onFocus={(e) => (e.target.style.border = "2px solid #4f46e5")}
            onBlur={(e) => (e.target.style.border = error ? "2px solid #ef4444" : "2px solid #e9ecef")}
          />
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6 }}>{error}</p>}
        </div>

        {/* 톤 선택 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 10, color: "#1a1a2e", fontSize: 15 }}>
            글 톤
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: tone === t.id ? "2px solid #4f46e5" : "2px solid #e9ecef",
                  background: tone === t.id ? "#4f46e5" : "#fff",
                  color: tone === t.id ? "#fff" : "#495057",
                  fontWeight: tone === t.id ? 600 : 400,
                  cursor: "pointer",
                  fontSize: 14,
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 추가 요청 */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 10, color: "#1a1a2e", fontSize: 15 }}>
            추가 요청사항 <span style={{ color: "#adb5bd", fontWeight: 400 }}>(선택)</span>
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="예: 20대 여성 타겟, 제품명 꼭 포함, 2000자 이상..."
            rows={3}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "2px solid #e9ecef",
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.border = "2px solid #4f46e5")}
            onBlur={(e) => (e.target.style.border = "2px solid #e9ecef")}
          />
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "none",
            background: loading ? "#a5b4fc" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
              AI가 작성 중입니다...
            </>
          ) : (
            "✨ AI로 생성하기"
          )}
        </button>

        {/* 결과 */}
        {(result || loading) && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontWeight: 600, color: "#1a1a2e", fontSize: 15 }}>생성 결과</label>
              {result && (
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "2px solid #4f46e5",
                    background: copied ? "#4f46e5" : "#fff",
                    color: copied ? "#fff" : "#4f46e5",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                >
                  {copied ? "✅ 복사됨!" : "📋 복사하기"}
                </button>
              )}
            </div>
            <div
              style={{
                background: "#fff",
                border: "2px solid #e9ecef",
                borderRadius: 12,
                padding: "20px",
                minHeight: 200,
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
                fontSize: 14,
                color: "#1a1a2e",
              }}
            >
              {result || <span style={{ color: "#adb5bd" }}>생성 중...</span>}
              {loading && result && (
                <span style={{ display: "inline-block", width: 2, height: 16, background: "#4f46e5", marginLeft: 2, animation: "blink 1s infinite" }} />
              )}
            </div>
            {result && (
              <div style={{ marginTop: 8, textAlign: "right", color: "#adb5bd", fontSize: 12 }}>
                총 {result.length.toLocaleString()}자
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
