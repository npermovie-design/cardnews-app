import React, { useState, useRef, useEffect } from "react";

// Phase components
import InputPhase from "./detail-studio/phases/InputPhase.jsx";
import GeneratingPhase from "./detail-studio/phases/GeneratingPhase.jsx";
import OutlinePhase from "./detail-studio/phases/OutlinePhase.jsx";
import EditorPhase from "./detail-studio/phases/EditorPhase.jsx";

// API & Pipeline
import {
  handleAgentSend as apiHandleAgentSend,
  fetchStockImages as apiFetchStockImages,
  generateSectionImage as apiGenerateSectionImage,
  generateAllImages as apiGenerateAllImages,
  fillStockImages as apiFillStockImages,
  handleImageUpload as apiHandleImageUpload,
  autoFillWithAI as apiAutoFillWithAI,
  analyzeProduct as apiAnalyzeProduct,
} from "./detail-studio/api.js";
import { runPipeline as apiRunPipeline } from "./detail-studio/pipeline.js";

/* ══════════════════════════════════════════════════════════════
   DetailPageStudio — Hookable 스타일 상세페이지 생성기
   Phase 1: 입력 폼 + AI 파이프라인
   Phase 2: 멀티페이지 라이브 캔버스 에디터
══════════════════════════════════════════════════════════════ */

export default function DetailPageStudio({ isDark, theme, user, showPointConfirm }) {
  const D = isDark || theme === "dark";

  // 테마 색상 (메이킷 고유 — 다크 모던 스타일)
  const text = D ? "#fff" : "#111";
  const muted = D ? "rgba(255,255,255,0.45)" : "#999";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fafafa";
  const bdr = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#fff";
  const acc = "#7c6aff";

  // ── 상태 ──────────────────────────────────────────────
  const [phase, setPhase] = useState("input"); // input | generating | outline | editor
  const [mode, setMode] = useState("fast");
  const [pageCount, setPageCount] = useState(7);
  const [designStyle, setDesignStyle] = useState(null);

  // 입력 폼
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [images, setImages] = useState([]);
  const [options, setOptions] = useState([]);
  const [optionInput, setOptionInput] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState({ price: "", origin: "", target: "", shipping: "", brand: "", usp: "" });
  const [aiFilling, setAiFilling] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const stockFilledRef = useRef(false);

  // AI 파이프라인
  const [pipeStep, setPipeStep] = useState(0);
  const [pipeResults, setPipeResults] = useState({});
  const [pipeError, setPipeError] = useState("");

  // 에디터 (Phase 2)
  const [sections, setSections] = useState([]);
  const [colorPalette, setColorPalette] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [sidebarTab, setSidebarTab] = useState("pages");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [sectionImages, setSectionImages] = useState({});
  const [selectedEl, setSelectedEl] = useState(null);
  const [templateTypeFilter, setTemplateTypeFilter] = useState("hero");
  const [canvasZoom, setCanvasZoom] = useState(isMobile ? 50 : 100);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [mediaSubTab, setMediaSubTab] = useState("photo");
  const [stockImages, setStockImages] = useState([]);

  // 드래그 이동 상태
  const dragRef = useRef(null);
  const [snapGuide, setSnapGuide] = useState(null);

  const fileInputRef = useRef(null);

  // ── ctx 객체 (API 함수에 전달) ──────────────────────
  const getCtx = () => ({
    // data
    productName, category, features, options, extraInfo, images, mode, pageCount, designStyle, analysisResult,
    sections, sectionImages, activeSection, selectedEl,
    user, showPointConfirm,
    // setters
    setPhase, setPipeStep, setPipeResults, setPipeError,
    setColorPalette, setSections, setActiveSection,
    setAiFilling, setAnalysisResult, setFeatures, setCategory, setProductName, setImages,
    setAgentMessages, setAgentInput, setAgentLoading, setSectionImages,
    setStockImages,
  });

  // ── 래퍼 함수 (최신 state 참조) ─────────────────────
  const handleImageUpload = (e) => apiHandleImageUpload(e, getCtx());
  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));
  const autoFillWithAI = () => apiAutoFillWithAI(getCtx());
  const analyzeProduct = () => apiAnalyzeProduct(getCtx());
  const runPipeline = () => apiRunPipeline(getCtx());
  const generateSectionImage = (secId, prompt) => apiGenerateSectionImage(secId, prompt, getCtx());
  const generateAllImages = () => apiGenerateAllImages(getCtx());
  const fillStockImages = () => apiFillStockImages(getCtx());
  const fetchStockImages = (query) => apiFetchStockImages(query, getCtx());
  const handleAgentSend = (msg) => apiHandleAgentSend(msg, getCtx());

  // ── useEffect hooks ─────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !selectedEl) return;
      const dx = (e.clientX - dragRef.current.startX) / (canvasZoom / 100);
      const dy = (e.clientY - dragRef.current.startY) / (canvasZoom / 100);

      if (dragRef.current.type === "move") {
        const newX = dragRef.current.origX + dx;
        const newY = dragRef.current.origY + dy;
        if (dragRef.current.isImage) {
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, imgProps: { ...s.imgProps, offsetX: Math.round(newX), offsetY: Math.round(newY) },
          }));
        } else {
          const snapThreshold = 8;
          let snappedX = Math.round(newX), snappedY = Math.round(newY);
          let guide = null;
          if (Math.abs(snappedX) < snapThreshold) { snappedX = 0; guide = { ...guide, x: true }; }
          if (Math.abs(snappedY) < snapThreshold) { snappedY = 0; guide = { ...guide, y: true }; }
          setSnapGuide(guide);
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: snappedX, offsetY: snappedY }),
          }));
          setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, offsetX: snappedX, offsetY: snappedY } } : prev);
        }
      }
    };
    const onUp = () => { dragRef.current = null; setSnapGuide(null); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [selectedEl, canvasZoom]);

  // Delete 키로 선택된 요소 삭제
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!selectedEl || phase !== "editor") return;
      if (document.activeElement?.contentEditable === "true") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedEl.elIdx >= 0) {
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, elements: (s.elements || []).filter((_, ei) => ei !== selectedEl.elIdx),
          }));
        }
        setSelectedEl(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEl, phase]);

  // 요소 선택 시 좌측 패널 자동 전환
  useEffect(() => {
    if (selectedEl && phase === "editor") {
      setSidebarTab("text");
    }
  }, [selectedEl]);

  // 에디터 진입 시 스톡 이미지 자동 채우기
  useEffect(() => {
    if (phase === "editor" && sections.length > 0 && !stockFilledRef.current) {
      stockFilledRef.current = true;
      fillStockImages();
    }
    if (phase !== "editor") stockFilledRef.current = false;
  }, [phase]);

  // 이미지 업로드 후 자동 분석 트리거
  useEffect(() => {
    if (images.length > 0 && !features && !aiFilling && phase === "input") {
      const timer = setTimeout(() => autoFillWithAI(), 500);
      return () => clearTimeout(timer);
    }
  }, [images.length]);

  // ── 스타일 ──────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: `1px solid ${bdr}`, background: inputBg, color: text,
    fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const btnPrimary = {
    padding: "14px 32px", borderRadius: 12, border: "none",
    background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", fontSize: 16, fontWeight: 800,
    cursor: "pointer", width: "100%", maxWidth: 400,
  };

  // ══════════════════════════════════════════════════════════
  //  렌더링 — Phase 별 컴포넌트 위임
  // ══════════════════════════════════════════════════════════

  if (phase === "input") return (
    <InputPhase
      D={D} text={text} muted={muted} cardBg={cardBg} bdr={bdr} inputBg={inputBg} acc={acc} isMobile={isMobile}
      productName={productName} setProductName={setProductName}
      category={category} setCategory={setCategory}
      features={features} setFeatures={setFeatures}
      images={images} options={options} setOptions={setOptions}
      optionInput={optionInput} setOptionInput={setOptionInput}
      extraOpen={extraOpen} setExtraOpen={setExtraOpen}
      extraInfo={extraInfo} setExtraInfo={setExtraInfo}
      aiFilling={aiFilling} mode={mode} setMode={setMode}
      pageCount={pageCount} setPageCount={setPageCount}
      designStyle={designStyle} setDesignStyle={setDesignStyle}
      analysisResult={analysisResult} analyzeProduct={analyzeProduct}
      fileInputRef={fileInputRef} handleImageUpload={handleImageUpload}
      removeImage={removeImage} autoFillWithAI={autoFillWithAI} runPipeline={runPipeline}
      inputStyle={inputStyle} btnPrimary={btnPrimary}
    />
  );

  if (phase === "generating") return (
    <GeneratingPhase
      D={D} text={text} muted={muted} bdr={bdr} acc={acc} isMobile={isMobile}
      images={images} productName={productName} category={category} mode={mode}
      pipeStep={pipeStep} pipeError={pipeError} setPipeError={setPipeError}
      runPipeline={runPipeline} setPhase={setPhase}
    />
  );

  if (phase === "outline") return (
    <OutlinePhase
      D={D} text={text} muted={muted} bdr={bdr} acc={acc} isMobile={isMobile}
      sections={sections} setSections={setSections}
      setPhase={setPhase} setActiveSection={setActiveSection}
      stockFilledRef={stockFilledRef}
    />
  );

  if (phase === "editor") return (
    <EditorPhase
      D={D} text={text} muted={muted} cardBg={cardBg} bdr={bdr} inputBg={inputBg} acc={acc} isMobile={isMobile}
      sections={sections} setSections={setSections}
      activeSection={activeSection} setActiveSection={setActiveSection}
      selectedEl={selectedEl} setSelectedEl={setSelectedEl}
      sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
      sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
      sectionImages={sectionImages} setSectionImages={setSectionImages}
      images={images} setImages={setImages}
      colorPalette={colorPalette} setColorPalette={setColorPalette}
      templateTypeFilter={templateTypeFilter} setTemplateTypeFilter={setTemplateTypeFilter}
      canvasZoom={canvasZoom} setCanvasZoom={setCanvasZoom}
      agentInput={agentInput} setAgentInput={setAgentInput}
      agentLoading={agentLoading} agentMessages={agentMessages}
      mediaSubTab={mediaSubTab} setMediaSubTab={setMediaSubTab}
      stockImages={stockImages} setStockImages={setStockImages}
      dragRef={dragRef} snapGuide={snapGuide}
      setPhase={setPhase} user={user} productName={productName} extraInfo={extraInfo}
      generateSectionImage={generateSectionImage} generateAllImages={generateAllImages}
      fetchStockImages={fetchStockImages} handleAgentSend={handleAgentSend}
      inputStyle={inputStyle}
    />
  );

  return null;
}
