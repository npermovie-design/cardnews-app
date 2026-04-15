import React from "react";

const STAGES = [
  { label: "제품 이미지 분석 중...", detail: "업로드한 이미지에서 제품 특성과 색상을 추출합니다" },
  { label: "고전환 제목 구상 중...", detail: "상품 판매 포인트와 특성을 결합하여 클릭하고 싶은 제목을 만듭니다" },
  { label: "설득력 있는 제품 설명 작성 중...", detail: "각 섹션에 맞는 설득력 있는 카피를 작성합니다" },
  { label: "핵심 판매 포인트 추출 중...", detail: "최적의 표현으로 핵심 가치를 전달합니다" },
  { label: "섹션 디자인 배치 중...", detail: "레이아웃과 구성을 최적화합니다" },
  { label: "최종 완성", detail: "상세페이지가 완성되었습니다" },
];

export default function GeneratingStep({ state, C, isMobile }) {
  const { genStage = 0, genMessage = "", productName, images } = state;
  const pct = Math.min(100, Math.round((genStage / 5) * 100));

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: isMobile ? "32px 16px" : "60px 24px" }}>
      {/* 제품 정보 카드 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 14,
        background: C.card || "#fafafa", marginBottom: 32,
        border: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
      }}>
        {images[0] && (
          <img src={images[0].preview} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{productName}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>상세페이지 생성 중</div>
        </div>
      </div>

      {/* 진행률 바 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>생성 진행률</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{pct}%</span>
        </div>
        <div style={{
          height: 6, borderRadius: 3, background: C.border || "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3, width: `${pct}%`,
            background: "linear-gradient(90deg, #7c6aff, #ec4899)",
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>

      {/* 단계 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STAGES.map((stage, i) => {
          const isDone = i < genStage;
          const isCurrent = i === genStage;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
              borderRadius: 10,
              background: isCurrent ? (C.purpleBg || "rgba(124,106,255,0.06)") : "transparent",
              opacity: !isDone && !isCurrent ? 0.4 : 1,
              transition: "opacity 0.3s, background 0.3s",
            }}>
              {/* 상태 아이콘 */}
              <div style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                background: isDone ? C.purple : isCurrent ? "transparent" : (C.border || "rgba(0,0,0,0.08)"),
                color: isDone ? "#fff" : C.text,
                border: isCurrent ? `2px solid ${C.purple}` : "none",
              }}>
                {isDone ? "v" : isCurrent ? (
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    border: `2px solid ${C.purple}`, borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                  }} />
                ) : (i + 1)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: isCurrent ? 700 : 500, color: C.text }}>
                  {stage.label}
                </div>
                {isCurrent && (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                    {stage.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 예상 시간 */}
      <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 28 }}>
        예상 대기 시간: 1-3분
      </p>

      {/* 스핀 애니메이션 */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
