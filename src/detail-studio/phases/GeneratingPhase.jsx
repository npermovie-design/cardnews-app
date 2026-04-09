import React from "react";
import { CATEGORIES } from "../constants.js";

export default function GeneratingPhase({
  D, text, muted, bdr, acc, isMobile,
  images, productName, category, mode,
  pipeStep, pipeError, setPipeError, runPipeline, setPhase,
}) {
  const pipelineStepsUI = [
    { label: "제품 사진 분석", desc: "이미지에서 색상·스타일·분위기를 읽어요", stepIdx: 2 },
    { label: "톤앤매너 설정", desc: "브랜드에 맞는 색상과 말투를 결정해요", stepIdx: 3 },
    { label: "섹션 구성 & 카피 작성", desc: "페이지별 레이아웃과 텍스트를 만들어요", stepIdx: 4 },
  ];
  const progressPct = pipeStep <= 1 ? 5 : pipeStep === 2 ? 30 : pipeStep === 3 ? 55 : pipeStep === 4 ? 80 : 100;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: D ? "transparent" : "#f5f5f5" }}>
      <div style={{ maxWidth: 460, width: "100%", padding: "40px 24px" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

        {/* 상단 제품 정보 카드 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderRadius: 14,
          background: D ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${bdr}`, marginBottom: 28,
        }}>
          {images[0] && <img src={images[0].preview} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productName}</div>
            <div style={{ fontSize: 12, color: muted }}>{CATEGORIES.find(c => c.key === category)?.label} · {mode === "fast" ? "에센셜" : "프리미엄"}</div>
          </div>
          {pipeStep < 5 && (
            <div style={{ padding: "5px 12px", borderRadius: 8, background: acc + "15", color: acc, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              생성 중
            </div>
          )}
          {pipeStep >= 5 && (
            <div style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>완료</div>
          )}
        </div>

        {/* 프로그레스 바 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: text }}>
              {pipeStep <= 1 ? "준비 중..." : pipeStep === 2 ? "사진 분석 중..." : pipeStep === 3 ? "톤앤매너 설정 중..." : pipeStep === 4 ? "콘텐츠 작성 중..." : "완료!"}
            </span>
            <span style={{ fontSize: 12, color: muted }}>{progressPct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: D ? "rgba(255,255,255,0.08)" : "#e5e7eb", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${acc}, #9b6dff)`, width: `${progressPct}%`, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* 단계 카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pipelineStepsUI.map((step, i) => {
            const isDone = pipeStep > step.stepIdx;
            const isActive = pipeStep === step.stepIdx;
            const isPending = pipeStep < step.stepIdx;
            return (
              <div key={i} style={{
                padding: "14px 18px", borderRadius: 12,
                background: isActive ? (D ? "rgba(124,106,255,0.08)" : "#f8f7ff") : (D ? "rgba(255,255,255,0.03)" : "#fff"),
                border: `1px solid ${isActive ? acc + "60" : bdr}`,
                opacity: isPending ? 0.35 : 1,
                transition: "all 0.4s ease",
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* 아이콘 */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "#22c55e" : isActive ? acc : (D ? "rgba(255,255,255,0.06)" : "#eee"),
                    color: (isDone || isActive) ? "#fff" : muted, fontSize: 13, fontWeight: 900, flexShrink: 0,
                  }}>
                    {isDone ? "✓" : isActive ? (
                      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #fff", borderColor: "#fff transparent transparent transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : (i + 1)}
                  </div>
                  {/* 텍스트 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{step.desc}</div>
                  </div>
                  {/* 상태 */}
                  {isDone && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>완료</span>}
                  {isActive && <span style={{ fontSize: 10, color: acc, fontWeight: 700, animation: "pulse 1.5s infinite" }}>처리 중</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 예상 시간 */}
        {pipeStep < 5 && (
          <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 20 }}>
            {mode === "fast" ? "약 30초~1분 소요됩니다" : "약 1~2분 소요됩니다"}
          </p>
        )}

        {pipeError && (
          <div style={{ marginTop: 20, padding: 20, borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ color: "#f87171", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>생성 중 문제가 발생했습니다</div>
            <div style={{ color: "#999", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>{pipeError}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setPipeError(""); runPipeline(); }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: acc, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                다시 시도
              </button>
              <button onClick={() => setPhase("input")}
                style={{ padding: "12px 20px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>
                돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
