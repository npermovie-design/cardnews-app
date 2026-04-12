import React, { useState } from "react";
import { CATEGORIES } from "../constants.js";
import { TEMPLATE_RECIPES, getRecommendedTemplates } from "../templateRecipes.js";
import TemplateGalleryCard from "./TemplateGalleryCard.jsx";

export default function InputPhase({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  productName, setProductName, category, setCategory, features, setFeatures,
  images, options, setOptions, optionInput, setOptionInput,
  extraOpen, setExtraOpen, extraInfo, setExtraInfo,
  aiFilling, mode, setMode, pageCount, setPageCount,
  fileInputRef, handleImageUpload, removeImage, autoFillWithAI, runPipeline,
  inputStyle, btnPrimary,
}) {
  const [inputStep, setInputStep] = useState(1); // 1: 스타일+기본정보, 2: AI 분석 결과 확인
  const [selectedStyle, setSelectedStyle] = useState("minimal_clean");
  const [aiQuestions, setAiQuestions] = useState(null); // AI 추가 질문
  const [aiAnswers, setAiAnswers] = useState({});

  // AI 분석 완료 후 2단계로 전환
  const handleAnalyzeAndNext = async () => {
    if (!productName.trim()) return;
    // AI 자동 채우기 실행
    if (!features.trim() && !aiFilling) {
      await autoFillWithAI();
    }
    // AI 추가 질문 생성
    generateFollowUpQuestions();
    setInputStep(2);
  };

  const generateFollowUpQuestions = async () => {
    if (!productName.trim()) return;
    try {
      const { callAI } = await import("../../aiClient");
      const prompt = `상품명: "${productName}"
카테고리: ${category || "미정"}
${features ? `특징: ${features}` : ""}

이 상품의 상세페이지를 만들기 위해 추가로 필요한 정보를 질문해주세요.
상품 특성에 맞는 구체적인 질문 3~4개를 만들어주세요.

JSON으로만 답변:
{"questions":[
  {"id":"q1","question":"질문 내용","type":"select","options":["옵션1","옵션2","맞춤형"]},
  {"id":"q2","question":"질문 내용","type":"select","options":["예","아니오"]},
  {"id":"q3","question":"질문 내용","type":"text","placeholder":"힌트"}
]}

type은 "select" 또는 "text"만 사용. 질문은 한국어로.`;
      const raw = await callAI("claude-haiku-4-5", [{ role: "user", content: prompt }], 800);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        setAiQuestions(parsed.questions || []);
      }
    } catch {
      setAiQuestions([]);
    }
  };

  const buildExtraContext = () => {
    const parts = [];
    if (Object.keys(aiAnswers).length > 0) {
      for (const [qId, answer] of Object.entries(aiAnswers)) {
        const q = aiQuestions?.find(x => x.id === qId);
        if (q && answer) parts.push(`${q.question}: ${answer}`);
      }
    }
    return parts.join("\n");
  };

  const handleFinalGenerate = () => {
    // AI 추가 질문 답변을 extraInfo에 합치기
    const extra = buildExtraContext();
    if (extra) {
      setExtraInfo(prev => ({ ...prev, aiContext: extra }));
    }
    // 선택한 템플릿 레시피 정보 전달
    const recipe = TEMPLATE_RECIPES.find(r => r.id === selectedStyle);
    if (recipe) {
      setExtraInfo(prev => ({
        ...prev,
        designStyle: recipe.name,
        styleColors: `${recipe.palette.main},${recipe.palette.gradient},${recipe.palette.light_bg},${recipe.palette.dark_bg}`,
        templateSections: recipe.sections.join(","),
        heroLayout: recipe.heroLayout,
      }));
    }
    runPipeline();
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f5f5f5" }}>
      <div style={{ maxWidth: "min(720px, 100%)", margin: "0 auto", padding: isMobile ? "24px 14px 60px" : "48px 20px 80px" }}>

        {/* ═══ STEP 1: 스타일 선택 + 기본 정보 ═══ */}
        {inputStep === 1 && (
          <>
            {/* 헤더 */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 20, background: acc + "15", color: acc, fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
                AI 상세페이지
              </div>
              <h1 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 900, color: text, lineHeight: 1.25, marginBottom: 10, letterSpacing: -0.8 }}>
                어떤 상세페이지를 만들까요?
              </h1>
              <p style={{ fontSize: 15, color: muted, lineHeight: 1.7 }}>스타일을 고르고, 상품 사진과 이름만 입력하세요. AI가 나머지를 채워드립니다.</p>
            </div>

            {/* ── 1. 스타일 선택 갤러리 (PicCopilot 스타일) ── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <label style={{ fontSize: 15, fontWeight: 700, color: text }}>
                  상세 페이지 템플릿 선택
                  <span style={{ fontSize: 12, color: muted, fontWeight: 500, marginLeft: 8 }}>원하는 스타일을 골라주세요</span>
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10 }}>
                {getRecommendedTemplates(category).map(recipe => (
                  <TemplateGalleryCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={selectedStyle === recipe.id}
                    onClick={() => setSelectedStyle(recipe.id)}
                    isDark={D}
                  />
                ))}
              </div>
            </div>

            {/* ── 2. 상품 사진 ── */}
            <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "24px 20px", border: `1px solid ${bdr}`, marginBottom: 16 }}>
              <label style={{ fontSize: 15, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                제품 사진 <span style={{ color: "#ef4444" }}>*</span>
                <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>AI가 사진을 분석해 디자인에 반영합니다 ({images.length}/10)</span>
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 100, height: 100, borderRadius: 12, border: `2px dashed ${D ? "rgba(255,255,255,0.18)" : "#ccc"}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    cursor: "pointer", background: D ? "rgba(255,255,255,0.03)" : "#fafafa", flexShrink: 0, fontFamily: "inherit",
                  }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{ fontSize: 11, color: acc, fontWeight: 700 }}>사진 추가</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
                {images.map((img, i) => (
                  <div key={i} style={{ position: "relative", width: 100, height: 100, borderRadius: 12, overflow: "hidden", flexShrink: 0, border: `1px solid ${bdr}` }}>
                    <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => removeImage(i)}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.72)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. 상품명 + 카테고리 (심플) ── */}
            <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "24px 20px", border: `1px solid ${bdr}`, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 160px", gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "block", marginBottom: 8 }}>
                    상품명 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input value={productName} onChange={e => setProductName(e.target.value)}
                    placeholder="예) 최고급 안심 스테이크" style={{ ...inputStyle, fontSize: 15, padding: "14px 16px", minHeight: 50 }} />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 700, color: text, display: "block", marginBottom: 8 }}>
                    카테고리
                  </label>
                  <div style={{ position: "relative" }}>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      style={{ ...inputStyle, fontSize: 14, padding: "14px 16px", minHeight: 50, cursor: "pointer", appearance: "none", paddingRight: 38 }}>
                      <option value="">자동 감지</option>
                      {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: muted, pointerEvents: "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                </div>
              </div>

              {/* 제품 특징 (선택사항으로 변경) */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: text }}>
                    제품 특징 <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>입력하면 더 정확해요 (선택)</span>
                  </label>
                </div>
                <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={3}
                  placeholder="비워두면 AI가 상품명과 사진을 분석해서 자동으로 작성합니다"
                  style={{ ...inputStyle, fontSize: 14, padding: "12px 16px", resize: "vertical", lineHeight: 1.7 }} />
              </div>
            </div>

            {/* ── 다음 단계 버튼 ── */}
            <button onClick={handleAnalyzeAndNext}
              disabled={!productName.trim()}
              style={{
                ...btnPrimary,
                padding: "18px 32px", fontSize: 17, borderRadius: 14, minHeight: 60,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                opacity: !productName.trim() ? 0.35 : 1,
                width: "100%",
                boxShadow: productName.trim() ? "0 10px 28px rgba(124,106,255,0.35)" : "none",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2l2.39 6.95L22 12l-7.61 3.05L12 22l-2.39-6.95L2 12l7.61-3.05L12 2z"/></svg>
              AI 분석 시작
            </button>
            {!productName.trim() && (
              <p style={{ fontSize: 13, color: muted, marginTop: 12, textAlign: "center" }}>상품명을 입력해주세요</p>
            )}
          </>
        )}

        {/* ═══ STEP 2: AI 분석 결과 확인 + 추가 질문 ═══ */}
        {inputStep === 2 && (
          <>
            {/* 헤더 */}
            <div style={{ marginBottom: 28 }}>
              <button onClick={() => setInputStep(1)}
                style={{ background: "none", border: "none", color: muted, fontSize: 13, cursor: "pointer", padding: "8px 0", marginBottom: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                ← 이전 단계
              </button>
              <h2 style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 8 }}>
                상품 정보를 확인해주세요
              </h2>
              <p style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>AI가 분석한 정보를 확인하고, 추가 질문에 답변하면 더 정확한 상세페이지가 만들어집니다.</p>
            </div>

            {/* AI 분석 중 배너 */}
            {aiFilling && (
              <div style={{ marginBottom: 18, padding: "14px 18px", borderRadius: 12, background: `linear-gradient(135deg, ${acc}08, ${acc}15)`, border: `1px solid ${acc}30`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid", borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: acc }}>AI가 제품을 분석하고 있습니다</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>잠시만 기다려주세요...</div>
                </div>
              </div>
            )}

            {/* ── 1단계: 분석된 기본 정보 확인 ── */}
            <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "24px 20px", border: `1px solid ${bdr}`, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: acc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>1</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: text }}>상품 정보 확인</div>
              </div>

              {/* 이미지 미리보기 */}
              {images.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                  {images.map((img, i) => (
                    <img key={i} src={img.preview} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: `1px solid ${bdr}`, flexShrink: 0 }} />
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 160px", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, display: "block" }}>상품명</label>
                  <input value={productName} onChange={e => setProductName(e.target.value)} style={{ ...inputStyle, fontSize: 14, padding: "11px 14px" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, display: "block" }}>카테고리</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, fontSize: 14, padding: "11px 14px", cursor: "pointer", appearance: "none" }}>
                    <option value="">자동</option>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, display: "block" }}>제품 특징 / 셀링포인트</label>
                <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={4}
                  placeholder="AI가 자동으로 채우고 있습니다..."
                  style={{ ...inputStyle, fontSize: 14, padding: "12px 14px", resize: "vertical", lineHeight: 1.7, borderColor: aiFilling && !features ? acc + "60" : undefined }} />
              </div>
            </div>

            {/* ── 2단계: AI 추가 질문 ── */}
            {aiQuestions && aiQuestions.length > 0 && (
              <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "20px 14px" : "24px 20px", border: `1px solid ${bdr}`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: acc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>2</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: text }}>상세 페이지 정보 보완</div>
                  <span style={{ fontSize: 12, color: muted }}>선택사항</span>
                </div>

                {aiQuestions.map((q, qi) => (
                  <div key={q.id} style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8, display: "block" }}>
                      {qi + 1}. {q.question}
                    </label>
                    {q.type === "select" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(q.options || []).map((opt, oi) => {
                          const sel = aiAnswers[q.id] === opt;
                          return (
                            <button key={oi} onClick={() => setAiAnswers(prev => ({ ...prev, [q.id]: sel ? "" : opt }))}
                              style={{
                                padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: sel ? 700 : 500,
                                border: `1.5px solid ${sel ? acc : bdr}`,
                                background: sel ? acc + "12" : "transparent",
                                color: sel ? acc : text, cursor: "pointer", fontFamily: "inherit",
                              }}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input value={aiAnswers[q.id] || ""} onChange={e => setAiAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder || "입력해주세요"}
                        style={{ ...inputStyle, fontSize: 14, padding: "11px 14px" }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── 3단계: 세부 정보 (접이식) ── */}
            <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: isMobile ? "16px 14px" : "18px 20px", border: `1px solid ${bdr}`, marginBottom: 16 }}>
              <button onClick={() => setExtraOpen(!extraOpen)}
                style={{ background: "none", border: "none", color: text, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: 0, width: "100%", fontFamily: "inherit" }}>
                <span style={{ color: muted, width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${bdr}`, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s", transform: extraOpen ? "rotate(180deg)" : "none" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
                세부 정보 직접 입력 <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>(가격, 배송, 브랜드 등)</span>
              </button>
              {extraOpen && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 16 }}>
                  {[
                    { k: "price", label: "판매 가격", ph: "39,900원" },
                    { k: "brand", label: "브랜드명", ph: "브랜드명" },
                    { k: "origin", label: "원산지 / 제조사", ph: "원산지" },
                    { k: "target", label: "타겟 고객", ph: "30~50대" },
                    { k: "shipping", label: "배송 정보", ph: "당일출고" },
                    { k: "usp", label: "핵심 차별점", ph: "차별 포인트" },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 12, color: muted, fontWeight: 600, marginBottom: 5, display: "block" }}>{f.label}</label>
                      <input value={extraInfo[f.k]} onChange={e => setExtraInfo(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 생성 모드 선택 ── */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: D ? "rgba(255,255,255,0.05)" : "#f0f0f0", borderRadius: 12, padding: 4 }}>
              {[
                { key: "fast", label: "빠른 생성", desc: "SNS/랜딩용", cnt: 7 },
                { key: "precise", label: "전환율 최적화", desc: "스토어/자사몰용", cnt: 14 },
              ].map(m => (
                <button key={m.key} onClick={() => { setMode(m.key); setPageCount(m.cnt); }}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
                    background: mode === m.key ? (D ? "rgba(255,255,255,0.12)" : "#fff") : "transparent",
                    color: mode === m.key ? text : muted, fontSize: 14, fontWeight: mode === m.key ? 800 : 600,
                    cursor: "pointer", boxShadow: mode === m.key ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s", minHeight: 54, fontFamily: "inherit",
                  }}>
                  {m.label}
                  <div style={{ fontSize: 11, color: mode === m.key ? acc : muted, marginTop: 2, fontWeight: 600 }}>{m.desc} ({m.cnt}페이지)</div>
                </button>
              ))}
            </div>

            {/* ── 최종 생성 버튼 ── */}
            <button onClick={handleFinalGenerate}
              disabled={!productName.trim() || aiFilling}
              style={{
                ...btnPrimary,
                padding: "18px 32px", fontSize: 17, borderRadius: 14, minHeight: 60,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                opacity: (!productName.trim() || aiFilling) ? 0.35 : 1,
                width: "100%",
                boxShadow: (productName.trim() && !aiFilling) ? "0 10px 28px rgba(124,106,255,0.35)" : "none",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2l2.39 6.95L22 12l-7.61 3.05L12 22l-2.39-6.95L2 12l7.61-3.05L12 2z"/></svg>
              상세페이지 생성하기
            </button>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
