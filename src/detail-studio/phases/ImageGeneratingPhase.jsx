import React from "react";

export default function ImageGeneratingPhase({
  sections, sectionImages, genProgress, D, text, muted, acc, bdr, isMobile,
}) {
  const { completed = 0, total = 0, currentSecId = "" } = genProgress || {};
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = completed >= total && total > 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${acc}, ${acc}aa)`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
            boxShadow: `0 8px 32px ${acc}40` }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: text, marginBottom: 8, lineHeight: 1.3 }}>
            AI가 디자인 이미지를 생성하고 있습니다
          </h2>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>
            각 섹션의 배경 디자인을 AI가 제작합니다. 약 3~5분 소요됩니다.
          </p>
        </div>

        {/* 프로그레스 바 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{completed}/{total} 섹션 완료</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: acc }}>{pct}%</span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: D ? "rgba(255,255,255,0.08)" : "#f0f0f0", overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 4,
              background: `linear-gradient(90deg, ${acc}, ${acc}cc)`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* 섹션 썸네일 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 3 : 4}, 1fr)`, gap: 12, marginBottom: 32 }}>
          {sections.map((sec, i) => {
            const img = sectionImages[sec.id];
            const isLoading = img?.loading;
            const hasImage = img?.url;
            const hasError = img?.error;
            return (
              <div key={sec.id} style={{
                aspectRatio: "3/4", borderRadius: 12, overflow: "hidden", position: "relative",
                background: D ? "rgba(255,255,255,0.04)" : "#f5f5f5",
                border: `1px solid ${isLoading ? acc : hasImage ? `${acc}40` : bdr}`,
                transition: "border 0.3s",
              }}>
                {hasImage && (
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                {isLoading && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: D ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)" }}>
                    <div style={{ width: 20, height: 20, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {hasError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#dc2626" }}>
                    실패
                  </div>
                )}
                {!hasImage && !isLoading && !hasError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: muted }}>{sec.type}</span>
                  </div>
                )}
                {/* 체크마크 */}
                {hasImage && (
                  <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 상태 메시지 */}
        {!isDone && (
          <p style={{ fontSize: 12, color: muted, animation: "pulse 2s ease-in-out infinite" }}>
            {currentSecId ? `${sections.findIndex(s => s.id === currentSecId) + 1}번째 섹션 디자인 생성 중...` : "준비 중..."}
          </p>
        )}
        {isDone && (
          <p style={{ fontSize: 14, fontWeight: 700, color: acc }}>
            모든 이미지 생성 완료! 에디터로 이동합니다...
          </p>
        )}

        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
