import React, { useRef, useCallback } from "react";
import { TEMPLATES } from "./templates";
import { fileToBase64, resizeImage } from "../detail-studio/utils";

export default function InputStep({ state, dispatch, C, isMobile }) {
  const fileRef = useRef(null);
  const dragOver = useRef(false);

  const handleFiles = useCallback(async (files) => {
    const remaining = 10 - state.images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      const resized = await resizeImage(base64, 800);
      dispatch({ type: "ADD_IMAGE", payload: { file, preview: resized, base64: resized } });
    }
  }, [state.images.length, dispatch]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    dragOver.current = false;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (idx) => dispatch({ type: "REMOVE_IMAGE", payload: idx });

  const canProceed = state.images.length > 0 && state.productName.trim().length > 0;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "20px 16px" : "40px 24px" }}>
      {/* 타이틀 */}
      <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 800, color: C.text, marginBottom: 8, textAlign: "center" }}>
        AI 상세페이지 생성기
      </h1>
      <p style={{ fontSize: 14, color: C.muted, textAlign: "center", marginBottom: 32 }}>
        제품 이미지와 상품명만 입력하면 AI가 전문가 수준의 상세페이지를 자동으로 생성합니다
      </p>

      {/* 이미지 업로드 */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text, display: "block", marginBottom: 10 }}>
          제품 이미지 (1-10장)
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); dragOver.current = true; }}
          onDragLeave={() => { dragOver.current = false; }}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${state.images.length > 0 ? C.purple : (C.border || "rgba(0,0,0,0.15)")}`,
            borderRadius: 14,
            padding: state.images.length > 0 ? 12 : "40px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: C.purpleBg || "rgba(0,0,0,0.06)",
            transition: "border-color 0.2s, background 0.2s",
          }}
        >
          {state.images.length === 0 ? (
            <>
              <div style={{ fontSize: 36, color: C.muted, marginBottom: 8 }}>+</div>
              <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
                클릭하거나 이미지를 드래그하여 업로드하세요
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 0", opacity: 0.7 }}>
                JPG, PNG, WEBP / 이미지당 최대 10MB
              </p>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
              {state.images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden" }}>
                  <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    style={{
                      position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer",
                      fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                    }}
                  >x</button>
                </div>
              ))}
              {state.images.length < 10 && (
                <div style={{
                  width: 80, height: 80, borderRadius: 8, border: `1px dashed ${C.muted}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, color: C.muted,
                }}>+</div>
              )}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* 상품명 */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text, display: "block", marginBottom: 10 }}>
          상품명
        </label>
        <input
          value={state.productName}
          onChange={(e) => dispatch({ type: "SET_FIELD", field: "productName", value: e.target.value })}
          placeholder="예: 프리미엄 보습 크림 50ml"
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: `1px solid ${C.border || "rgba(0,0,0,0.1)"}`,
            background: C.inputBg || "#fff", color: C.text, fontSize: 15,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* 언어 선택 */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text, display: "block", marginBottom: 10 }}>
          대상 언어
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ id: "ko", label: "한국어" }, { id: "en", label: "English" }, { id: "ja", label: "日本語" }].map(lang => (
            <button key={lang.id} onClick={() => dispatch({ type: "SET_FIELD", field: "language", value: lang.id })}
              style={{
                padding: "8px 20px", borderRadius: 8, border: `1px solid ${state.language === lang.id ? C.purple : (C.border || "rgba(0,0,0,0.1)")}`,
                background: state.language === lang.id ? (C.purpleBg || "rgba(0,0,0,0.06)") : "transparent",
                color: state.language === lang.id ? C.purple : C.text, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* 템플릿 갤러리 */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text, display: "block", marginBottom: 4 }}>
          상세페이지 템플릿 선택
        </label>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 14px" }}>
          원하는 템플릿을 선택하거나, AI 자동 추천을 선택하면 제품에 맞는 최적의 템플릿을 추천합니다
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 12,
        }}>
          {TEMPLATES.map(tmpl => {
            const selected = state.selectedTemplateId === tmpl.id;
            return (
              <div key={tmpl.id}
                onClick={() => dispatch({ type: "SET_FIELD", field: "selectedTemplateId", value: tmpl.id })}
                style={{
                  borderRadius: 12, overflow: "hidden", cursor: "pointer",
                  border: `2px solid ${selected ? C.purple : "transparent"}`,
                  boxShadow: selected ? `0 0 0 3px ${C.purple}22` : C.shadow,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}>
                <div style={{
                  height: 100, background: tmpl.thumbnail.gradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  {tmpl.isAuto && (
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: tmpl.thumbnail.accent,
                      textAlign: "center", lineHeight: 1.4,
                    }}>AI<br/>자동 추천</div>
                  )}
                  {selected && (
                    <div style={{
                      position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%",
                      background: C.purple, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700,
                    }}>v</div>
                  )}
                </div>
                <div style={{ padding: "8px 10px", background: C.card || "#fff" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{tmpl.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        disabled={!canProceed}
        onClick={() => dispatch({ type: "SET_STEP", step: 2 })}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
          background: canProceed ? "#168EEA" : (C.border || "#ddd"),
          color: canProceed ? "#fff" : C.muted, fontSize: 16, fontWeight: 700,
          cursor: canProceed ? "pointer" : "not-allowed",
          transition: "opacity 0.2s",
        }}>
        상세페이지 생성 시작
      </button>
    </div>
  );
}
