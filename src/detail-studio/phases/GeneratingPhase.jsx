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
          display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderRadius: 14,
          background: D ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${bdr}`, marginBottom: 30,
        }}>
          {images[0] && <img src={images[0].preview} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productName}</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>{CATEGORIES.find(c => c.key === category)?.label} · {mode === "fast" ? "에센셜" : "프리미엄"}</div>
          </div>
          {pipeStep < 5 && (
            <div style={{ padding: "7px 14px", borderRadius: 10, background: acc + "15", color: acc, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <span style={{ display: "inline-block", width: 11, height: 11, border: "2px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              생성 중
            </div>
          )}
          {pipeStep >= 5 && (
            <div style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>완료</div>
          )}
        </div>

        {/* 프로그레스 바 */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: text }}>
              {pipeStep <= 1 ? "준비 중..." : pipeStep === 2 ? "사진 분석 중..." : pipeStep === 3 ? "톤앤매너 설정 중..." : pipeStep === 4 ? "콘텐츠 작성 중..." : "완료!"}
            </span>
            <span style={{ fontSize: 13, color: muted, fontWeight: 700 }}>{progressPct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: D ? "rgba(255,255,255,0.08)" : "#e5e7eb", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${acc}, #9b6dff)`, width: `${progressPct}%`, transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* 단계 카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pipelineStepsUI.map((step, i) => {
            const isDone = pipeStep > step.stepIdx;
            const isActive = pipeStep === step.stepIdx;
            const isPending = pipeStep < step.stepIdx;
            return (
              <div key={i} style={{
                padding: "16px 20px", borderRadius: 14,
                background: isActive ? (D ? "rgba(124,106,255,0.08)" : "#f8f7ff") : (D ? "rgba(255,255,255,0.03)" : "#fff"),
                border: `1.5px solid ${isActive ? acc + "60" : bdr}`,
                opacity: isPending ? 0.4 : 1,
                transition: "all 0.4s ease",
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* 아이콘 */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "#22c55e" : isActive ? acc : (D ? "rgba(255,255,255,0.06)" : "#eee"),
                    color: (isDone || isActive) ? "#fff" : muted, fontSize: 15, fontWeight: 900, flexShrink: 0,
                  }}>
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : isActive ? (
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2.5px solid #fff", borderColor: "#fff transparent transparent transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : (i + 1)}
                  </div>
                  {/* 텍스트 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: text }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2, lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                  {/* 상태 */}
                  {isDone && <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 800 }}>완료</span>}
                  {isActive && <span style={{ fontSize: 11, color: acc, fontWeight: 800, animation: "pulse 1.5s infinite" }}>처리 중</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 예상 시간 */}
        {pipeStep < 5 && (
          <p style={{ textAlign: "center", fontSize: 13, color: muted, marginTop: 22, fontWeight: 500 }}>
            {mode === "fast" ? "약 30초~1분 소요됩니다" : "약 1~2분 소요됩니다"}
          </p>
        )}

        {pipeError && (
          <div style={{ marginTop: 22, padding: 22, borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div style={{ color: "#ef4444", fontSize: 15, fontWeight: 800, marginBottom: 8 }}>생성 중 문제가 발생했습니다</div>
            <div style={{ color: muted, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>{pipeError}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setPipeError(""); runPipeline(); }}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: acc, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", minHeight: 48, fontFamily: "inherit" }}>
                다시 시도
              </button>
              <button onClick={() => setPhase("input")}
                style={{ padding: "14px 22px", borderRadius: 12, border: `1.5px solid ${bdr}`, background: "transparent", color: text, fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 48, fontFamily: "inherit" }}>
                돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
