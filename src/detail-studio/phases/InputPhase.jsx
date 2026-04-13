import React, { useState } from "react";
import { CATEGORIES } from "../constants.js";
import DesignStylePicker from "./DesignStylePicker.jsx";

export default function InputPhase({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  productName, setProductName, category, setCategory, features, setFeatures,
  images, options, setOptions, optionInput, setOptionInput,
  extraOpen, setExtraOpen, extraInfo, setExtraInfo,
  aiFilling, mode, setMode, pageCount, setPageCount,
  designStyle, setDesignStyle,
  fileInputRef, handleImageUpload, removeImage, autoFillWithAI, runPipeline,
  inputStyle, btnPrimary,
}) {
  const [step, setStep] = useState(1); // 1: 제품 분석, 2: 디자인 선택
  const canProceed = productName.trim() && category;

  // ── Step 1: 제품 정보 입력 ──
  if (step === 1) return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f5f5f5" }}>
      <div style={{ maxWidth: "min(680px, 100%)", margin: "0 auto", padding: isMobile ? "24px 14px 60px" : "48px 20px 80px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          {/* 스텝 인디케이터 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: acc, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</div>
            <div style={{ height: 2, width: 32, background: `${acc}30`, borderRadius: 1 }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: D ? "rgba(255,255,255,0.08)" : "#e0e0e0", color: muted, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 20, background: acc + "15", color: acc, fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
            STEP 1
          </div>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 900, color: text, lineHeight: 1.25, marginBottom: 10, letterSpacing: -0.8 }}>
            제품 정보를 입력해주세요
          </h1>
          <p style={{ fontSize: 15, color: muted, lineHeight: 1.7 }}>이미지와 제품 정보를 기반으로 AI가 톤앤매너를 분석합니다.</p>
        </div>

        {/* 폼 카드 */}
        <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "28px 24px", border: `1px solid ${bdr}` }}>

          {/* ── 1. 상품 이미지 ── */}
          <div style={{ marginBottom: 26 }}>
            <label style={{ fontSize: 15, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              제품 사진 <span style={{ color: "#ef4444" }}>*</span>
              <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>AI가 사진을 분석해 디자인에 반영합니다 ({images.length}/10)</span>
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 110, height: 110, borderRadius: 12, border: `2px dashed ${D ? "rgba(255,255,255,0.18)" : "#ccc"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  cursor: "pointer", background: D ? "rgba(255,255,255,0.03)" : "#fafafa", flexShrink: 0,
                  transition: "border-color 0.2s", fontFamily: "inherit",
                }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span style={{ fontSize: 12, color: acc, fontWeight: 700 }}>사진 추가</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 110, height: 110, borderRadius: 12, overflow: "hidden", flexShrink: 0, border: `1px solid ${bdr}` }}>
                  <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeImage(i)}
                    style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.72)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="제거">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: bdr, margin: "4px 0 24px" }} />

          {/* AI 분석 중 배너 */}
          {aiFilling && (
            <div style={{ marginBottom: 18, padding: "14px 18px", borderRadius: 12, background: `linear-gradient(135deg, ${acc}08, ${acc}15)`, border: `1px solid ${acc}30`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: acc }}>AI가 제품을 분석하고 있습니다</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>상품명, 카테고리, 제품 특징이 자동으로 채워집니다</div>
              </div>
            </div>
          )}

          {/* ── 2. 상품명 + 카테고리 ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 180px", gap: 14, marginBottom: 22 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "block", marginBottom: 8 }}>
                상품명 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !productName && <span style={{ fontSize: 12, color: acc, fontWeight: 700, marginLeft: 8 }}>분석 중...</span>}
              </label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="예) 제주 흑돼지 육포 선물세트" style={{ ...inputStyle, fontSize: 15, padding: "14px 16px", minHeight: 50, borderColor: aiFilling && !productName ? acc + "60" : undefined }} />
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "block", marginBottom: 8 }}>
                카테고리 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !category && <span style={{ fontSize: 12, color: acc, fontWeight: 700, marginLeft: 4 }}>분석 중...</span>}
              </label>
              <div style={{ position: "relative" }}>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ ...inputStyle, fontSize: 15, padding: "14px 16px", minHeight: 50, cursor: "pointer", appearance: "none", paddingRight: 38, borderColor: aiFilling && !category ? acc + "60" : undefined }}>
                  <option value="">선택</option>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: muted, pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
            </div>
          </div>

          {/* ── 3. 제품 특징 ── */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 700, color: text }}>
                제품 특징 / 셀링포인트 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !features && <span style={{ fontSize: 12, color: acc, fontWeight: 700, marginLeft: 8 }}>AI 작성 중...</span>}
              </label>
              <button onClick={autoFillWithAI} disabled={!productName.trim() || aiFilling}
                style={{
                  padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${acc}60`,
                  background: acc + "12", color: acc, fontSize: 13, fontWeight: 800,
                  cursor: productName.trim() && !aiFilling ? "pointer" : "not-allowed",
                  opacity: productName.trim() ? 1 : 0.4, display: "flex", alignItems: "center", gap: 6, minHeight: 40, fontFamily: "inherit",
                }}>
                {aiFilling ? (
                  <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 1s linear infinite" }} /> 생성 중...</>
                ) : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.39 6.95L22 12l-7.61 3.05L12 22l-2.39-6.95L2 12l7.61-3.05L12 2z"/></svg>AI 자동 채우기</>)}
              </button>
            </div>
            <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={5}
              placeholder={"예시)\n1. 제주 청정 환경에서 자란 흑돼지 100% 사용\n2. 48시간 저온 숙성으로 부드럽고 깊은 풍미\n3. 무방부제, 무색소 -- 건강한 간식\n4. 고급 선물 포장\n5. 개별 소포장으로 휴대 간편"}
              style={{ ...inputStyle, fontSize: 15, padding: "14px 16px", resize: "vertical", lineHeight: 1.8, borderColor: aiFilling && !features ? acc + "60" : undefined }} />
          </div>

          {/* ── 4. 옵션 ── */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              옵션/종류 <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>선택 {options.length}/10</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && optionInput.trim() && options.length < 10) { setOptions(prev => [...prev, optionInput.trim()]); setOptionInput(""); } }}
                placeholder="예) 오리지널 120g / 매운맛 120g" style={{ ...inputStyle, fontSize: 15, padding: "14px 16px", minHeight: 50, flex: 1 }} />
              <button onClick={() => { if (optionInput.trim() && options.length < 10) { setOptions(prev => [...prev, optionInput.trim()]); setOptionInput(""); } }}
                style={{ padding: "12px 22px", borderRadius: 12, border: `1.5px solid ${bdr}`, background: inputBg, color: text, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0, minHeight: 50, fontFamily: "inherit" }}>추가</button>
            </div>
            {options.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {options.map((opt, i) => (
                  <span key={i} style={{ padding: "8px 14px", borderRadius: 10, background: acc + "12", color: acc, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {opt}
                    <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} style={{ cursor: "pointer", opacity: 0.7, background: "none", border: "none", color: "inherit", padding: 0, display: "flex", alignItems: "center" }} aria-label="제거">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── 5. 세부 정보 (펼치기) ── */}
          <div style={{ marginBottom: 26 }}>
            <button onClick={() => setExtraOpen(!extraOpen)}
              style={{ background: "none", border: "none", color: text, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontFamily: "inherit" }}>
              <span style={{ color: muted, width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${bdr}`, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s", transform: extraOpen ? "rotate(180deg)" : "none" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
              세부 정보 입력 <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>(더 정확한 결과를 위해 권장)</span>
            </button>
            {extraOpen && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 16, padding: "18px", borderRadius: 12, background: D ? "rgba(255,255,255,0.02)" : "#fafafa", border: `1px solid ${bdr}` }}>
                {[
                  { k: "price", label: "판매 가격", ph: "39,900원" },
                  { k: "brand", label: "브랜드명", ph: "제주미트" },
                  { k: "origin", label: "원산지 / 제조사", ph: "제주도 / 자체 HACCP 공장" },
                  { k: "target", label: "타겟 고객", ph: "30~50대, 선물용 구매자" },
                  { k: "shipping", label: "배송 정보", ph: "당일출고, 냉장특송" },
                  { k: "usp", label: "핵심 차별점 (USP)", ph: "48시간 저온 숙성 공법" },
                ].map(f => (
                  <div key={f.k}>
                    <label style={{ fontSize: 13, color: text, fontWeight: 600, marginBottom: 6, display: "block" }}>{f.label}</label>
                    <input value={extraInfo[f.k]} onChange={e => setExtraInfo(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ ...inputStyle, fontSize: 14, padding: "12px 14px", minHeight: 46 }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 다음 단계 버튼 ── */}
          <button onClick={() => setStep(2)}
            disabled={!canProceed}
            style={{
              ...btnPrimary,
              padding: "18px 32px", fontSize: 17, borderRadius: 14, minHeight: 60,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: canProceed ? 1 : 0.35,
              width: "100%", maxWidth: "100%",
              boxShadow: canProceed ? "0 10px 28px rgba(124,106,255,0.35)" : "none",
            }}>
            <span>디자인 선택하기</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          {!canProceed && (
            <p style={{ fontSize: 13, color: muted, marginTop: 12, textAlign: "center", fontWeight: 500 }}>
              {!productName.trim() ? "상품명을 입력해주세요" : "카테고리를 선택해주세요"}
            </p>
          )}
          {canProceed && images.length === 0 && (
            <p style={{ fontSize: 13, color: "#f59e0b", marginTop: 12, textAlign: "center", fontWeight: 600 }}>
              사진 없이도 생성 가능해요. 스톡 이미지로 자동 채워집니다.
            </p>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ── Step 2: 디자인 스타일 선택 + 생성 ──
  return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f5f5f5" }}>
      <div style={{ maxWidth: "min(720px, 100%)", margin: "0 auto", padding: isMobile ? "24px 14px 60px" : "48px 20px 80px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 32 }}>
          {/* 스텝 인디케이터 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${acc}20`, color: acc, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ height: 2, width: 32, background: acc, borderRadius: 1 }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: acc, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
          </div>
          {/* 뒤로가기 */}
          <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: muted, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "4px 0", marginBottom: 12, fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            제품 정보 수정
          </button>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 20, background: acc + "15", color: acc, fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
            STEP 2
          </div>
          <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 900, color: text, lineHeight: 1.25, marginBottom: 10, letterSpacing: -0.8 }}>
            디자인 스타일을 선택하세요
          </h1>
          <p style={{ fontSize: 15, color: muted, lineHeight: 1.7 }}>선택한 스타일이 전체 상세페이지의 톤과 레이아웃을 결정합니다.</p>

          {/* 제품 요약 카드 */}
          <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 14 }}>
            {images.length > 0 && (
              <img src={images[0].preview} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productName}</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{CATEGORIES.find(c => c.key === category)?.label || category}</div>
            </div>
          </div>
        </div>

        {/* 디자인 스타일 선택 */}
        <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "28px 24px", border: `1px solid ${bdr}`, marginBottom: 20 }}>
          <DesignStylePicker
            designStyle={designStyle} setDesignStyle={setDesignStyle}
            category={category} acc={acc} text={text} muted={muted} bdr={bdr} D={D} isMobile={isMobile}
          />
        </div>

        {/* 생성 모드 + 버튼 */}
        <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "28px 24px", border: `1px solid ${bdr}` }}>
          <label style={{ fontSize: 15, fontWeight: 700, color: text, display: "block", marginBottom: 14 }}>생성 모드</label>
          <div style={{ display: "flex", gap: 0, marginBottom: 22, background: D ? "rgba(255,255,255,0.05)" : "#f0f0f0", borderRadius: 12, padding: 4 }}>
            {[
              { key: "fast", label: "빠른 생성", desc: "SNS/랜딩용", cnt: 7 },
              { key: "precise", label: "전환율 최적화", desc: "스토어/자사몰용", cnt: 14 },
            ].map(m => (
              <button key={m.key} onClick={() => { setMode(m.key); setPageCount(m.cnt); }}
                style={{
                  flex: 1, padding: "14px 18px", borderRadius: 10, border: "none",
                  background: mode === m.key ? (D ? "rgba(255,255,255,0.12)" : "#fff") : "transparent",
                  color: mode === m.key ? text : muted, fontSize: 14, fontWeight: mode === m.key ? 800 : 600,
                  cursor: "pointer", boxShadow: mode === m.key ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s", minHeight: 58, fontFamily: "inherit",
                }}>
                {m.label}
                <div style={{ fontSize: 11, color: mode === m.key ? acc : muted, marginTop: 3, fontWeight: 600 }}>{m.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: muted }}>생성 페이지:</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: acc }}>{pageCount}페이지</span>
          </div>

          <button onClick={runPipeline}
            style={{
              ...btnPrimary,
              padding: "18px 32px", fontSize: 17, borderRadius: 14, minHeight: 60,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", maxWidth: "100%",
              boxShadow: "0 10px 28px rgba(124,106,255,0.35)",
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.39 6.95L22 12l-7.61 3.05L12 22l-2.39-6.95L2 12l7.61-3.05L12 2z"/></svg>
            상세페이지 생성하기
          </button>
        </div>
      </div>
    </div>
  );
}
