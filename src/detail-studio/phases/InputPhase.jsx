import React from "react";
import { CATEGORIES } from "../constants.js";

export default function InputPhase({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  productName, setProductName, category, setCategory, features, setFeatures,
  images, options, setOptions, optionInput, setOptionInput,
  extraOpen, setExtraOpen, extraInfo, setExtraInfo,
  aiFilling, mode, setMode, pageCount, setPageCount,
  fileInputRef, handleImageUpload, removeImage, autoFillWithAI, runPipeline,
  inputStyle, btnPrimary,
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f5f5f5" }}>
      <div style={{ maxWidth: "min(680px, 100%)", margin: "0 auto", padding: isMobile ? "24px 14px 60px" : "48px 20px 80px" }}>
        {/* 헤더 — 메이킷 스타일 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: acc + "15", color: acc, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            ✦ AI 상세페이지
          </div>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 8 }}>
            제품 정보를 입력하면<br />AI가 상세페이지를 만들어드려요
          </h1>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>이미지와 제품 정보를 기반으로 톤앤매너를 분석하고, 섹션별 콘텐츠를 자동 생성합니다.</p>
        </div>

        {/* 폼 — 카드 없이 플랫 스타일 */}
        <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "28px 24px", border: `1px solid ${bdr}` }}>

          {/* ── 1. 상품 이미지 (최상단) ── */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              제품 사진 <span style={{ color: "#ef4444" }}>*</span>
              <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>AI가 사진을 분석해 디자인에 반영합니다 ({images.length}/10)</span>
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 100, height: 100, borderRadius: 10, border: `2px dashed ${D ? "rgba(255,255,255,0.15)" : "#ccc"}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", background: D ? "rgba(255,255,255,0.03)" : "#fafafa", flexShrink: 0,
                  transition: "border-color 0.2s",
                }}>
                <span style={{ fontSize: 24, color: acc }}>+</span>
                <span style={{ fontSize: 10, color: acc, fontWeight: 600, marginTop: 2 }}>사진 추가</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 100, height: 100, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${bdr}` }}>
                  <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeImage(i)}
                    style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* ── 구분선 ── */}
          <div style={{ height: 1, background: bdr, margin: "4px 0 24px" }} />

          {/* AI 분석 중 배너 */}
          {aiFilling && (
            <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: `linear-gradient(135deg, ${acc}08, ${acc}15)`, border: `1px solid ${acc}30`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: acc }}>AI가 제품을 분석하고 있습니다</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>상품명, 카테고리, 제품 특징이 자동으로 채워집니다</div>
              </div>
            </div>
          )}

          {/* ── 2. 상품명 + 카테고리 (한 줄) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12, marginBottom: 20 }}>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: text, display: "block", marginBottom: 6 }}>
                상품명 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !productName && <span style={{ fontSize: 11, color: acc, fontWeight: 600, marginLeft: 8 }}>분석 중...</span>}
              </label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="예) 제주 흑돼지 육포 선물세트" style={{ ...inputStyle, borderColor: aiFilling && !productName ? acc + "60" : undefined }} />
            </div>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: text, display: "block", marginBottom: 6 }}>
                카테고리 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !category && <span style={{ fontSize: 11, color: acc, fontWeight: 600, marginLeft: 4 }}>분석 중...</span>}
              </label>
              <div style={{ position: "relative" }}>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", appearance: "none", paddingRight: 32, borderColor: aiFilling && !category ? acc + "60" : undefined }}>
                  <option value="">선택</option>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: muted, pointerEvents: "none", fontSize: 10 }}>▼</span>
              </div>
            </div>
          </div>

          {/* ── 3. 제품 특징 + AI 채우기 ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: text }}>
                제품 특징 / 셀링포인트 <span style={{ color: "#ef4444" }}>*</span>
                {aiFilling && !features && <span style={{ fontSize: 11, color: acc, fontWeight: 600, marginLeft: 8 }}>AI 작성 중...</span>}
              </label>
              <button onClick={autoFillWithAI} disabled={!productName.trim() || aiFilling}
                style={{
                  padding: "5px 12px", borderRadius: 8, border: `1px solid ${acc}40`,
                  background: acc + "10", color: acc, fontSize: 11, fontWeight: 700,
                  cursor: productName.trim() && !aiFilling ? "pointer" : "not-allowed",
                  opacity: productName.trim() ? 1 : 0.4, display: "flex", alignItems: "center", gap: 4,
                }}>
                {aiFilling ? (
                  <><span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 1s linear infinite" }} /> 생성 중...</>
                ) : "✦ AI 자동 채우기"}
              </button>
            </div>
            <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={5}
              placeholder={"예시)\n1. 제주 청정 환경에서 자란 흑돼지 100% 사용\n2. 48시간 저온 숙성으로 부드럽고 깊은 풍미\n3. 무방부제·무색소 — 아이도 안심하고 먹는 건강 간식\n4. 고급 선물 포장으로 명절/기념일 선물에 적합\n5. 개별 소포장으로 휴대 간편, 언제 어디서나 간편하게"}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.8, borderColor: aiFilling && !features ? acc + "60" : undefined }} />
          </div>

          {/* ── 4. 옵션 ── */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              옵션/종류 <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>선택 · {options.length}/10</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && optionInput.trim() && options.length < 10) { setOptions(prev => [...prev, optionInput.trim()]); setOptionInput(""); } }}
                placeholder="예) 오리지널 120g / 매운맛 120g / 선물세트 3종" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => { if (optionInput.trim() && options.length < 10) { setOptions(prev => [...prev, optionInput.trim()]); setOptionInput(""); } }}
                style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>추가</button>
            </div>
            {options.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {options.map((opt, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: acc + "12", color: acc, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    {opt}
                    <span onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 13 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── 5. 세부 정보 (펼치기) ── */}
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setExtraOpen(!extraOpen)}
              style={{ background: "none", border: "none", color: text, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
              <span style={{ fontSize: 11, color: muted, width: 18, height: 18, borderRadius: 4, border: `1px solid ${bdr}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{extraOpen ? "−" : "+"}</span>
              세부 정보 입력 <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(더 정확한 결과를 위해 권장)</span>
            </button>
            {extraOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14, padding: "16px", borderRadius: 12, background: D ? "rgba(255,255,255,0.02)" : "#fafafa", border: `1px solid ${bdr}` }}>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>판매 가격</label>
                  <input value={extraInfo.price} onChange={e => setExtraInfo(p => ({ ...p, price: e.target.value }))} placeholder="39,900원" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>브랜드명</label>
                  <input value={extraInfo.brand} onChange={e => setExtraInfo(p => ({ ...p, brand: e.target.value }))} placeholder="제주미트" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>원산지 / 제조사</label>
                  <input value={extraInfo.origin} onChange={e => setExtraInfo(p => ({ ...p, origin: e.target.value }))} placeholder="제주도 / 자체 HACCP 공장" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>타겟 고객</label>
                  <input value={extraInfo.target} onChange={e => setExtraInfo(p => ({ ...p, target: e.target.value }))} placeholder="30~50대, 선물용 구매자" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>배송 정보</label>
                  <input value={extraInfo.shipping} onChange={e => setExtraInfo(p => ({ ...p, shipping: e.target.value }))} placeholder="당일출고, 냉장특송" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>핵심 차별점 (USP)</label>
                  <input value={extraInfo.usp} onChange={e => setExtraInfo(p => ({ ...p, usp: e.target.value }))} placeholder="48시간 저온 숙성 공법" style={inputStyle} />
                </div>
              </div>
            )}
          </div>


          {/* ── 구분선 ── */}
          <div style={{ height: 1, background: bdr, margin: "0 0 24px" }} />

          {/* ── 6. 생성 모드 + 버튼 ── */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, background: D ? "rgba(255,255,255,0.05)" : "#f0f0f0", borderRadius: 10, padding: 3 }}>
            {[
              { key: "fast", label: "빠른 생성", desc: "SNS/랜딩용", cnt: 7 },
              { key: "precise", label: "전환율 최적화", desc: "스토어/자사몰용", cnt: 14 },
            ].map(m => (
              <button key={m.key} onClick={() => { setMode(m.key); setPageCount(m.cnt); }}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
                  background: mode === m.key ? (D ? "rgba(255,255,255,0.12)" : "#fff") : "transparent",
                  color: mode === m.key ? text : muted, fontSize: 13, fontWeight: mode === m.key ? 700 : 500,
                  cursor: "pointer", boxShadow: mode === m.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}>
                {m.label}
                <div style={{ fontSize: 10, color: mode === m.key ? acc : muted, marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
          {/* ── 페이지 수 표시 (모드에 따라 자동 설정) ── */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: muted }}>생성 페이지:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: acc }}>{pageCount}페이지</span>
          </div>

          <button onClick={runPipeline}
            disabled={!productName.trim() || !category}
            style={{
              ...btnPrimary,
              opacity: (!productName.trim() || !category) ? 0.35 : 1,
              width: "100%", maxWidth: "100%",
            }}>
            ✦ 상세페이지 생성하기
          </button>
          {(!productName.trim() || !category) && (
            <p style={{ fontSize: 11, color: muted, marginTop: 8, textAlign: "center" }}>
              {!productName.trim() ? "상품명을 입력해주세요" : "카테고리를 선택해주세요"}
            </p>
          )}
          {productName.trim() && category && images.length === 0 && (
            <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 8, textAlign: "center" }}>
              사진 없이도 생성 가능해요. 스톡 이미지로 자동 채워집니다.
            </p>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
