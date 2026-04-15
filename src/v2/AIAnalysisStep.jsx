import React, { useEffect, useState } from "react";
import { analyzeProductImage, generateSellingPoints, detectMismatch } from "./aiPipeline";
import { DESIGN_MOODS } from "./templates";

export default function AIAnalysisStep({ state, dispatch, C, isMobile }) {
  const [loading, setLoading] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const [newPoint, setNewPoint] = useState("");

  const subStep = state.analysisSubStep || 0;

  // 진입 시 자동 이미지 분석
  useEffect(() => {
    if (subStep === 0 && state.images.length > 0) {
      runAnalysis();
    }
  }, []);

  async function runAnalysis() {
    setLoading(true);
    try {
      const base64 = state.images[0]?.base64 || state.images[0]?.preview;
      const analysis = await analyzeProductImage(base64);
      const points = await generateSellingPoints(state.productName, analysis);
      dispatch({ type: "SET_FIELD", field: "imageAnalysis", value: analysis });
      dispatch({ type: "SET_FIELD", field: "sellingPoints", value: points });
      dispatch({ type: "SET_FIELD", field: "analysisSubStep", value: 1 });

      // 불일치 감지
      const mis = await detectMismatch(state.productName, points);
      setMismatch(mis);
    } catch (e) {
      console.error("Analysis error:", e);
      dispatch({ type: "SET_FIELD", field: "sellingPoints", value: ["고품질", "세련된 디자인", "뛰어난 내구성", "합리적 가격", "편리한 사용"] });
      dispatch({ type: "SET_FIELD", field: "analysisSubStep", value: 1 });
    }
    setLoading(false);
  }

  function removePoint(idx) {
    const next = state.sellingPoints.filter((_, i) => i !== idx);
    dispatch({ type: "SET_FIELD", field: "sellingPoints", value: next });
  }
  function addPoint() {
    if (!newPoint.trim()) return;
    dispatch({ type: "SET_FIELD", field: "sellingPoints", value: [...state.sellingPoints, newPoint.trim()] });
    setNewPoint("");
  }

  function autoComplete() {
    if (!state.designMood) dispatch({ type: "SET_FIELD", field: "designMood", value: "clean" });
    dispatch({ type: "SET_FIELD", field: "analysisSubStep", value: 3 });
    dispatch({ type: "SET_STEP", step: 3 });
  }

  function confirmAndProceed() {
    dispatch({ type: "SET_FIELD", field: "analysisSubStep", value: 3 });
    dispatch({ type: "SET_STEP", step: 3 });
  }

  const panelStyle = {
    background: C.card || "#fff",
    borderRadius: 14,
    padding: isMobile ? 16 : 24,
    border: `1px solid ${C.border || "rgba(0,0,0,0.06)"}`,
    marginBottom: 16,
  };

  // 로딩 상태
  if (subStep === 0 || loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "32px 16px" : "60px 24px", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, border: `3px solid ${C.border || "#ddd"}`, borderTopColor: C.purple,
          borderRadius: "50%", margin: "0 auto 20px", animation: "spin 0.8s linear infinite",
        }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          제품 이미지 분석 중
        </h2>
        <p style={{ fontSize: 13, color: C.muted }}>
          AI가 이미지에서 제품 특성, 셀링포인트, 색상을 추출하고 있습니다
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 24, maxWidth: 960, margin: "0 auto",
      padding: isMobile ? "20px 16px" : "32px 24px",
      flexDirection: isMobile ? "column" : "row",
    }}>
      {/* 왼쪽: 미리보기 스켈레톤 */}
      <div style={{ flex: isMobile ? "none" : "0 0 280px" }}>
        <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
          {state.images[0] && (
            <img src={state.images[0].preview} alt="" style={{ width: "100%", height: 200, objectFit: "cover" }} />
          )}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{state.productName}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{state.imageAnalysis?.category || "분석 완료"}</div>
          </div>
        </div>
        {/* 이미지 썸네일 그리드 */}
        {state.images.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8 }}>
            {state.images.slice(0, 8).map((img, i) => (
              <img key={i} src={img.preview} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />
            ))}
          </div>
        )}
      </div>

      {/* 오른쪽: AI 어시스턴트 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.purple, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple }} />
          상세 페이지 AI 어시스턴트
        </div>

        {/* Sub-step 1: 셀링포인트 확인 */}
        {subStep >= 1 && (
          <div style={panelStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              1. 판매 포인트를 확인해 주세요
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
              AI가 분석한 셀링포인트입니다. 수정하거나 추가할 수 있습니다.
            </p>

            {/* 불일치 경고 */}
            {mismatch?.hasMismatch && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: "#fff3cd", border: "1px solid #ffc107",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#856404" }}>
                  제품명과 판매 포인트가 일치하지 않을 수 있습니다
                </div>
                <div style={{ fontSize: 11, color: "#856404", marginTop: 4 }}>
                  {mismatch.suggestion}
                </div>
              </div>
            )}

            {/* 태그 칩 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {(state.sellingPoints || []).map((point, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 20,
                  background: C.purpleBg || "rgba(124,106,255,0.08)",
                  border: `1px solid ${C.purple}30`,
                  fontSize: 13, color: C.text,
                }}>
                  {point}
                  <button onClick={() => removePoint(i)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: C.muted, padding: 0, lineHeight: 1,
                  }}>x</button>
                </div>
              ))}
            </div>

            {/* 추가 입력 */}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newPoint} onChange={(e) => setNewPoint(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPoint()}
                placeholder="판매 포인트 추가"
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
                  background: C.inputBg || "#fff", color: C.text, outline: "none",
                }}
              />
              <button onClick={addPoint} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: C.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>추가</button>
            </div>

            {/* 브랜드명 */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>브랜드명 (선택)</label>
              <input value={state.brandName || ""} onChange={(e) => dispatch({ type: "SET_FIELD", field: "brandName", value: e.target.value })}
                placeholder="브랜드명을 입력하세요"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
                  background: C.inputBg || "#fff", color: C.text, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

        {/* Sub-step 2: 디자인 무드 */}
        {subStep >= 1 && (
          <div style={panelStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              2. 디자인 분위기를 선택하세요
            </div>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
              상세페이지의 전체적인 디자인 무드를 선택합니다
            </p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10 }}>
              {DESIGN_MOODS.map(mood => {
                const sel = state.designMood === mood.id;
                return (
                  <button key={mood.id}
                    onClick={() => dispatch({ type: "SET_FIELD", field: "designMood", value: mood.id })}
                    style={{
                      padding: "14px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                      border: `2px solid ${sel ? C.purple : (C.border || "rgba(0,0,0,0.08)")}`,
                      background: sel ? (C.purpleBg || "rgba(124,106,255,0.06)") : "transparent",
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel ? C.purple : C.text, marginBottom: 4 }}>{mood.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{mood.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* 타겟 고객 */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>타겟 고객층</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["20대", "30대", "40대", "전체"].map(age => {
                  const sel = state.qaAnswers?.targetAge === age;
                  return (
                    <button key={age} onClick={() => dispatch({ type: "SET_FIELD", field: "qaAnswers", value: { ...state.qaAnswers, targetAge: age } })}
                      style={{
                        padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${sel ? C.purple : (C.border || "rgba(0,0,0,0.1)")}`,
                        background: sel ? (C.purpleBg || "rgba(124,106,255,0.08)") : "transparent",
                        color: sel ? C.purple : C.text,
                      }}>
                      {age}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={autoComplete} style={{
            padding: "10px 24px", borderRadius: 10, border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
            background: "transparent", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            자동 완성
          </button>
          <button onClick={confirmAndProceed} style={{
            padding: "10px 28px", borderRadius: 10, border: "none",
            background: C.purple, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            정보 확인
          </button>
        </div>
      </div>
    </div>
  );
}
