import React, { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { SECTION_TEMPLATES, SECTION_TYPE_LABELS } from "./detailTemplates.js";
import { CATEGORIES, SECTION_TYPES, PIPELINE_STEPS } from "./detail-studio/constants.js";
import { fileToBase64, resizeImage } from "./detail-studio/utils.jsx";
import { renderSection } from "./detail-studio/renderers/SectionDispatcher.jsx";

/* ══════════════════════════════════════════════════════════════
   DetailPageStudio — Hookable 스타일 상세페이지 생성기
   Phase 1: 입력 폼 + AI 파이프라인
   Phase 2: 멀티페이지 라이브 캔버스 에디터
══════════════════════════════════════════════════════════════ */

// Constants, Utils, Renderers 는 detail-studio/ 에서 import

// ══════════════════════════════════════════════════════════════
//  메인 컴포넌트
// ══════════════════════════════════════════════════════════════
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
  const [phase, setPhase] = useState("input"); // input | generating | editor
  const [mode, setMode] = useState("fast"); // fast | precise
  const [pageCount, setPageCount] = useState(7); // 사용자 조절 가능 섹션 수

  // 입력 폼
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [images, setImages] = useState([]); // [{ file, preview, base64 }]
  const [options, setOptions] = useState([]); // ["옵션1", ...]
  const [optionInput, setOptionInput] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraInfo, setExtraInfo] = useState({ price: "", origin: "", target: "", shipping: "", brand: "", usp: "" });
  const [aiFilling, setAiFilling] = useState(false);
  const stockFilledRef = useRef(false);

  // AI 파이프라인
  const [pipeStep, setPipeStep] = useState(0); // 0-4
  const [pipeResults, setPipeResults] = useState({});
  const [pipeError, setPipeError] = useState("");

  // 에디터 (Phase 2)
  const [sections, setSections] = useState([]);
  const [colorPalette, setColorPalette] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  // 모바일 감지
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [sidebarTab, setSidebarTab] = useState("pages");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [sectionImages, setSectionImages] = useState({}); // { secId: { url, loading, error } }
  // 텍스트 요소 선택/편집
  const [selectedEl, setSelectedEl] = useState(null); // { secIdx, elIdx, el }
  const [templateTypeFilter, setTemplateTypeFilter] = useState("hero");
  const [canvasZoom, setCanvasZoom] = useState(isMobile ? 50 : 100);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [mediaSubTab, setMediaSubTab] = useState("photo");

  // 드래그 이동 상태
  const dragRef = useRef(null); // { type: "move"|"resize", startX, startY, origX, origY, origW, origH, handle }
  const [snapGuide, setSnapGuide] = useState(null); // { x, y } — 스냅 가이드라인 위치

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !selectedEl) return;
      const dx = (e.clientX - dragRef.current.startX) / (canvasZoom / 100);
      const dy = (e.clientY - dragRef.current.startY) / (canvasZoom / 100);

      if (dragRef.current.type === "move") {
        const newX = dragRef.current.origX + dx;
        const newY = dragRef.current.origY + dy;
        if (dragRef.current.isImage) {
          // 이미지 위치 이동
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, imgProps: { ...s.imgProps, offsetX: Math.round(newX), offsetY: Math.round(newY) },
          }));
        } else {
          // 텍스트 위치 이동 + 스냅 가이드
          const snapThreshold = 8;
          let snappedX = Math.round(newX), snappedY = Math.round(newY);
          let guide = null;
          // 중앙 스냅 (offsetX = 0 → 가운데)
          if (Math.abs(snappedX) < snapThreshold) { snappedX = 0; guide = { ...guide, x: true }; }
          // Y=0 스냅 (기본 위치)
          if (Math.abs(snappedY) < snapThreshold) { snappedY = 0; guide = { ...guide, y: true }; }
          setSnapGuide(guide);
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: snappedX, offsetY: snappedY }),
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
      // contentEditable 안에서 타이핑 중이면 무시
      if (document.activeElement?.contentEditable === "true") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedEl.elIdx >= 0) {
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, elements: s.elements.filter((_, ei) => ei !== selectedEl.elIdx),
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

  // 에디터 진입 시 스톡 이미지 자동 채우기 (AI 이미지는 버튼으로 수동 생성)
  useEffect(() => {
    if (phase === "editor" && sections.length > 0 && !stockFilledRef.current) {
      stockFilledRef.current = true;
      fillStockImages();
    }
    if (phase !== "editor") stockFilledRef.current = false;
  }, [phase]);

  const handleAgentSend = async (msg) => {
    if (!msg?.trim()) return;
    setAgentMessages(prev => [...prev, { role: "user", content: msg }]);
    setAgentInput("");
    setAgentLoading(true);
    try {
      const sec = sections[activeSection];
      const isImageEdit = selectedEl?.el?._type === "image";

      if (isImageEdit) {
        // AI 이미지 수정: 프롬프트로 새 이미지 생성
        const secId = sec?.id;
        const currentImg = sectionImages[secId]?.url || (images.length > 0 ? images[activeSection % images.length]?.preview : null);
        const prompt = `상세페이지용 ${sec?.type || "제품"} 이미지를 생성해주세요. 사용자 요청: "${msg}". 배경은 깔끔하게, 상품/주제가 돋보이도록.`;
        setAgentMessages(prev => [...prev, { role: "assistant", content: "이미지 생성 중..." }]);
        await generateSectionImage(secId, prompt);
        setAgentMessages(prev => {
          const filtered = prev.filter(m => m.content !== "이미지 생성 중...");
          return [...filtered, { role: "assistant", content: "이미지가 생성되었습니다. 캔버스에서 확인해보세요." }];
        });
      } else {
        // 텍스트 수정
        const secJson = JSON.stringify(sec?.elements?.filter(e => e.type === "text").map(e => ({ role: e.role, content: e.content })) || []);
        const prompt = `상세페이지 에디터의 AI 에이전트입니다. 현재 섹션의 텍스트 요소들:
${secJson}

사용자 요청: "${msg}"

위 요청에 맞게 텍스트를 수정해서 JSON 배열로 반환해줘.
이모지(emoji), 이모티콘, 특수기호를 절대 사용하지 마세요. 텍스트만 작성하세요.
형식: [{"role":"기존role","content":"수정된텍스트"}]
JSON배열만 출력.`;
        const agentRes = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 2000 }) });
        const agentData = await agentRes.json();
        const result = agentData.text || agentData.error || "";
        const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        try {
          const updates = JSON.parse(cleaned);
          if (Array.isArray(updates)) {
            setSections(prev => prev.map((s, si) => si !== activeSection ? s : {
              ...s, elements: s.elements.map(el => {
                if (el.type !== "text") return el;
                const upd = updates.find(u => u.role === el.role);
                return upd ? { ...el, content: upd.content } : el;
              }),
            }));
            setAgentMessages(prev => [...prev, { role: "assistant", content: "수정 완료! 변경된 내용을 확인해보세요." }]);
          }
        } catch {
          setAgentMessages(prev => [...prev, { role: "assistant", content: cleaned }]);
        }
      }
    } catch (e) {
      setAgentMessages(prev => [...prev, { role: "assistant", content: `오류: ${e.message}` }]);
    }
    setAgentLoading(false);
  };
  const [stockImages, setStockImages] = useState([]);
  const fetchStockImages = async (query) => {
    try {
      const pixKey = import.meta.env.VITE_PIXABAY_KEY || "";
      const pexKey = import.meta.env.VITE_PEXELS_KEY || "";
      const results = [];
      // Pixabay
      if (pixKey) {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pixabay.com/api/?key=${pixKey}&q=${query}&image_type=photo&per_page=8&lang=ko`)}`);
          const data = await res.json();
          (data.hits || []).forEach(h => results.push({ url: h.webformatURL, thumb: h.previewURL, title: h.tags, src: "Pixabay" }));
        } catch {}
      }
      // Pexels
      if (pexKey) {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.pexels.com/v1/search?query=${query}&per_page=8&locale=ko-KR`)}&headers=${encodeURIComponent(JSON.stringify({ Authorization: pexKey }))}`);
          const data = await res.json();
          (data.photos || []).forEach(p => results.push({ url: p.src.medium, thumb: p.src.small, title: p.alt || "", src: "Pexels" }));
        } catch {}
      }
      setStockImages(results.length > 0 ? results : []);
    } catch { setStockImages([]); }
  };

  // ── 섹션별 AI 이미지 생성 ──────────────────────────────
  const generateSectionImage = async (secId, prompt) => {
    if (!prompt) return;
    if (!user) { alert("이미지 생성은 로그인 후 이용 가능합니다."); return; }
    setSectionImages(prev => ({ ...prev, [secId]: { loading: true, url: null, error: null } }));
    try {
      const token = await getAuthToken() || "";
      const res = await fetch("/api/image?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prompt, aspectRatio: "3:4" }),
      });
      const data = await res.json();
      if (data.image) {
        setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: data.image, error: null } }));
      } else {
        setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: data.error || "생성 실패" } }));
      }
    } catch (e) {
      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: e.message } }));
    }
  };

  // 전체 섹션 이미지 일괄 생성 (AI 또는 스톡)
  const generateAllImages = async () => {
    if (user) {
      // 로그인 시: AI 이미지 생성
      for (const sec of sections) {
        if (sec.image_prompt && !sectionImages[sec.id]?.url) {
          await generateSectionImage(sec.id, sec.image_prompt);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    } else {
      // 비로그인: 스톡 이미지로 자동 채우기
      await fillStockImages();
    }
  };

  // 스톡 이미지 자동 채우기
  const fillStockImages = async () => {
    try {
      // 카테고리 라벨 + 상품명의 첫 2단어로 검색 (긴 상품명은 검색 결과가 나쁨)
      const catLabel = CATEGORIES.find(c => c.key === category)?.label || "";
      const shortName = (productName || "").split(/\s+/).slice(0, 2).join(" ");
      const searchTerm = shortName || catLabel || "product";
      let stockUrls = [];
      // 서버 proxy API 사용 (PIXABAY_KEY가 서버에 있음)
      try {
        const res = await fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(searchTerm)}&per_page=30&image_type=photo&lang=ko`);
        if (res.ok) {
          const data = await res.json();
          stockUrls = (data.hits || []).map(h => h.webformatURL || h.largeImageURL).filter(Boolean);
        }
      } catch {}
      // 실패 시: 사용자 업로드 이미지 순환 사용
      if (stockUrls.length === 0 && images.length > 0) {
        stockUrls = images.map(img => img.preview).filter(Boolean);
      }
      if (stockUrls.length > 0) {
        const newImgs = {};
        sections.forEach((sec, idx) => {
          if (sec.type === "ai_notice" || sec.type === "shipping") return;
          if (sectionImages[sec.id]?.url) return;
          newImgs[sec.id] = { url: stockUrls[idx % stockUrls.length], loading: false, error: null };
        });
        if (Object.keys(newImgs).length > 0) {
          setSectionImages(prev => ({ ...prev, ...newImgs }));
        }
      }
    } catch (e) { console.log("Stock fill error:", e); }
  };

  const fileInputRef = useRef(null);

  // ── 이미지 업로드 ─────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      alert("이미지는 최대 10장까지 업로드 가능합니다.");
      return;
    }
    const newImages = [];
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const raw = await fileToBase64(file);
      const base64 = await resizeImage(raw, 800);
      newImages.push({ file, preview, base64 });
    }
    setImages(prev => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // ── AI로 내용 채우기 (이미지 비전 분석 포함) ──────────────
  const autoFillWithAI = async () => {
    if (!productName.trim() && images.length === 0) return;
    setAiFilling(true);
    try {
      const hasImage = images.length > 0 && images[0].base64;
      const prompt = hasImage
        ? `이 제품 사진을 분석해서 JSON으로 응답해줘.${productName ? ` 참고 상품명: "${productName}"` : ""}
{
  "category": "food|farm|tech|living|fashion|beauty|health|education|pet|kids 중 하나",
  "productName": "사진에서 파악한 상품명 (한국어)",
  "features": "사진에서 보이는 제품 특징 5가지 (번호 포함, 자연스러운 한국어, 쇼핑몰 수준)"
}
features는 줄바꿈(\\n)으로 구분. JSON만 출력.`
        : `상품명: "${productName}"
이 상품을 분석해서 JSON으로 응답해줘:
{
  "category": "food|farm|tech|living|fashion|beauty|health|education|pet|kids 중 하나",
  "productName": "${productName}",
  "features": "제품 특징 5가지 (번호 포함, 자연스러운 한국어, 쇼핑몰 수준)"
}
features는 줄바꿈(\\n)으로 구분. JSON만 출력.`;
      // 이미지가 있으면 base64도 함께 전송 (Gemini 비전) — 512px로 축소
      const reqBody = { prompt, maxTokens: 800 };
      if (hasImage) {
        try {
          const smallBase64 = await resizeImage(images[0].base64, 512);
          const raw = smallBase64;
          reqBody.imageBase64 = raw.includes(",") ? raw.split(",")[1] : raw;
          reqBody.imageMimeType = images[0].file?.type || "image/jpeg";
        } catch { /* 리사이즈 실패 시 이미지 없이 진행 */ }
      }
      const geminiRes = await fetch("/api/gemini-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      const geminiData = await geminiRes.json();
      const result = geminiData.text || "";
      const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.features) {
          // \\n → 실제 줄바꿈, 마크다운 제거
          const featText = parsed.features.replace(/\\n/g, "\n").replace(/#{1,6}\s*/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
          setFeatures(featText);
        }
        if (parsed.category && CATEGORIES.find(c => c.key === parsed.category)) {
          setCategory(parsed.category);
        }
        if (parsed.productName && !productName.trim()) {
          setProductName(parsed.productName);
        }
      } catch {
        const text = cleaned.replace(/\\n/g, "\n").replace(/#{1,6}\s*/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
        setFeatures(text);
      }
    } catch (e) { console.error("AI 분석 실패:", e); }
    setAiFilling(false);
  };

  // 이미지 업로드 후 자동 분석 트리거
  useEffect(() => {
    if (images.length > 0 && !features && !aiFilling && phase === "input") {
      // 이미지 업로드되면 0.5초 후 자동 분석 시작
      const timer = setTimeout(() => autoFillWithAI(), 500);
      return () => clearTimeout(timer);
    }
  }, [images.length]);

  // ── AI 파이프라인 실행 ────────────────────────────────
  const runPipeline = async () => {
    if (!productName.trim() || !category) return;
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(10))) return;
    if (!user) incrementGuestUsage();

    setPhase("generating");
    setPipeStep(0);
    setPipeResults({});
    setPipeError("");

    const catLabel = CATEGORIES.find(c => c.key === category)?.label || category;

    try {
      // Step 1: 입력 정보 정리
      setPipeStep(1);
      await new Promise(r => setTimeout(r, 1200));
      setPipeResults(prev => ({ ...prev, input: { productName, category: catLabel, features, options, extraInfo } }));

      // Step 2: 이미지 분석 + 색상 추출
      setPipeStep(2);
      let extractedColors = [];
      let aiToneResult = null;
      if (images.length > 0) {
        try {
          // Canvas 색상 추출
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => { img.onload = resolve; img.src = images[0].base64; });
          const c = document.createElement("canvas");
          c.width = 64; c.height = 64;
          c.getContext("2d").drawImage(img, 0, 0, 64, 64);
          const data = c.getContext("2d").getImageData(0, 0, 64, 64).data;
          const buckets = {};
          for (let i = 0; i < data.length; i += 4) {
            const r = Math.round(data[i] / 32) * 32;
            const g = Math.round(data[i+1] / 32) * 32;
            const b = Math.round(data[i+2] / 32) * 32;
            const key = `${r},${g},${b}`;
            buckets[key] = (buckets[key] || 0) + 1;
          }
          extractedColors = Object.entries(buckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([k]) => {
              const [r, g, b] = k.split(",").map(Number);
              return "#" + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("");
            });
        } catch (e) { console.warn("Color extraction failed:", e); }

        // AI 톤앤매너 분석 (Gemini)
        try {
          const toneRes = await fetch("/api/gemini-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `제품:"${productName}" 카테고리:${CATEGORIES.find(c=>c.key===category)?.label||"일반"} 추출색상:${extractedColors.join(",")}
이 제품에 어울리는 톤앤매너를 JSON으로 출력해줘:
{"tone":"톤(예:전문적/따뜻한/고급스러운/활기찬)","voice":"말투(예:~합니다/~해요/~이다)","mood":"분위기 한 줄"}
JSON만 출력.`, maxTokens: 200 }),
          });
          const toneData2 = await toneRes.json();
          const toneParsed = JSON.parse((toneData2.text || "{}").replace(/```json?\s*/g, "").replace(/```/g, "").trim());
          aiToneResult = toneParsed;
        } catch { /* 실패해도 진행 */ }
      }
      setPipeResults(prev => ({ ...prev, image: { colors: extractedColors, tone: aiToneResult } }));
      await new Promise(r => setTimeout(r, 1000));

      // Step 3: 톤앤매너 + 색상 팔레트
      setPipeStep(3);
      const sectionCount = pageCount;
      const toneData = {
        tone: aiToneResult?.tone || "전문적", voice: aiToneResult?.voice || "~합니다",
        color_palette: {
          main: extractedColors[0] || "#7c6aff",
          gradient: extractedColors[1] || "#9b8ec4",
          light_bg: "#f8f8f8",
          dark_bg: extractedColors[2] || "#2d2d3a",
        },
        font_style: "bold", section_count: sectionCount,
      };
      setColorPalette(toneData.color_palette);
      setPipeResults(prev => ({ ...prev, tone: toneData }));
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: 레이아웃 + 콘텐츠 생성 (단일 AI 호출)
      setPipeStep(4);
      const mainColor = toneData.color_palette.main;
      const extraLines = [extraInfo.price, extraInfo.origin, extraInfo.target, extraInfo.shipping, extraInfo.brand, extraInfo.usp].filter(Boolean).join(", ");

      // 톤앤매너 통일: 카테고리 기반 색상 테마 (참고자료 76개 분석 기반)
      // 원칙: 1) 한 페이지에 1-2색만, 2) 배경은 흰색/크림/다크만, 3) 원색 배경 절대 금지
      const categoryThemes = {
        "식품": { tone: "내추럴 프리미엄", palette: `메인${mainColor}/화이트#fff/크림#f9f6f2/차콜#2c2c2c — 원색배경 절대금지, 크림+다크만 교차`, layout: "풀블리드 이미지 중심, 텍스트는 보조, 이미지 80%+" },
        "뷰티": { tone: "소프트 클린", palette: `메인${mainColor}/화이트#fff/블러시#f8f5f2/다크#1a1a2e — 파스텔만, 원색금지`, layout: "깔끔한 여백, 제품 클로즈업 중심" },
        "패션": { tone: "매거진 에디토리얼", palette: `메인${mainColor}/화이트#fff/라이트그레이#f5f5f5/블랙#111 — 모노톤+포인트1색`, layout: "큰 이미지+작은 텍스트, 비대칭 그리드" },
        "가전": { tone: "클린 프로페셔널", palette: `메인${mainColor}/화이트#fff/쿨그레이#f0f2f5/네이비#1a1a2e — 차분한 중성톤만`, layout: "정돈된 그리드, 정보형, 아이콘+텍스트" },
        "건강": { tone: "내추럴 오가닉", palette: `메인${mainColor}/화이트#fff/웜베이지#f5f0eb/차콜#333 — 어스톤만`, layout: "자연 질감, 부드러운 곡선" },
        "default": { tone: "미니멀 모던", palette: `메인${mainColor}/화이트#fff/라이트#f8f8f8/다크#1a1a2e — 포인트1색+흰+다크만`, layout: "여백 넉넉, 중앙정렬, 좌우 분할" },
      };
      const catKey = ["식품","음료","건강식품","간식"].some(k => catLabel.includes(k)) ? "식품"
        : ["뷰티","화장품","스킨케어","향수"].some(k => catLabel.includes(k)) ? "뷰티"
        : ["패션","의류","가방","신발","주얼리"].some(k => catLabel.includes(k)) ? "패션"
        : ["가전","전자","IT","디지털"].some(k => catLabel.includes(k)) ? "가전"
        : ["건강","영양","비타민","운동"].some(k => catLabel.includes(k)) ? "건강" : "default";
      const seed = categoryThemes[catKey];

      // 모드에 따라 다른 상세페이지 구조
      const longFlow = `순서(14섹션 — 전환율 최적화형):
1. hero: 제품 대표 이미지 + 결과 중심 핵심 카피 1줄 + 서브 설명
2. pain_points: 고객이 겪는 불편/고민 3~4개 명확하게 제시 (공감 유도)
3. point(해결 제시): "이 제품이 해결책이다" — 제품 단독 이미지 + 짧은 선언 문장
4. features: 핵심 기능 3~5개 요약 (아이콘+짧은 제목+한줄 설명)
5. point(기능 상세 1): 기능 하나를 깊이 설명 — 기능→효과→결과
6. point(기능 상세 2): 다른 기능 하나를 깊이 설명
7. stats_highlight: 수치/그래프/비교 — 기능을 눈으로 보여줌 (신뢰 확보)
8. point(사용감/텍스처): 실제 사용 느낌 전달 — 발림성, 흡수력, 질감
9. point(성분/기술력): 핵심 성분 강조 + 피부 자극 테스트 완료 등
10. howto: 사용 방법 2~3단계
11. point(추천 대상): 체크형 리스트로 구매 대상 명확화
12. event: 할인/증정/기간 한정 이벤트 혜택
13. review: 실제 후기 3개 + 별점
14. cta: 제품 이미지 + "지금 바로 경험해보세요" + 구매 버튼`;

      const shortFlow = `순서(7섹션 — 전환 빠른형, SNS/랜딩용):
1. hero: 제품 이미지 + 강한 결과 중심 카피
2. pain_points(문제+해결 합침): 고민 2~3개 → 바로 제품이 해결책 제시
3. features: 핵심 기능 3개 (짧고 직관적으로)
4. point(시각 증거): Before/After 또는 수치 비교로 효과 전달
5. point(사용감): 텍스처 컷 + 실제 느낌 전달
6. event: 할인/증정 혜택 — 지금 구매해야 하는 이유
7. cta: 제품 + 한 줄 — 바로 구매 유도`;

      const layoutPrompt = `제품:"${productName}" 카테고리:${catLabel}
특징:${features.slice(0, 400)}${extraLines ? ` 추가정보:${extraLines}` : ""}${options.length ? ` 옵션:${options.join("/")}` : ""}
메인컬러:${mainColor}
디자인 톤:${seed.tone}

한국 프리미엄 상세페이지 ${sectionCount}개 섹션 JSON배열.
핵심 흐름: 문제 인식 → 해결 제시 → 기능 설득 → 신뢰 확보 → 구매 유도

${sectionCount <= 8 ? shortFlow : longFlow}
총 ${sectionCount}개 섹션을 정확히 생성하세요.

[중요] 설계 원칙:
- 텍스트는 짧게, 이미지로 설명
- 한 섹션에 하나의 메시지만 전달
- 중요한 내용은 반복 노출
- 기능 나열이 아니라 "사용 후 변화" 강조

[중요] 색상 규칙:
- bg_color: "#ffffff", "#f9f6f2", "#f5f5f5", "#1a1a2e", "#f5f0eb" 중에서만 선택 (반드시 6자리 hex)
- 원색 배경(하늘/연두/노랑/분홍) 절대 금지
- 밝은 배경과 다크 배경 교차 배치
- 밝은배경 텍스트="#1a1a1a", 다크배경 텍스트="#ffffff"
- 모든 color 값은 반드시 #rrggbb 6자리 형식 사용
- 포인트 컬러: ${mainColor}

형식: [{"type":"","layout":"","bg_color":"#hex","image_prompt":"제품 관련 영문 프롬프트 40단어","elements":[{"type":"text","role":"","content":"","fontSize":숫자,"fontWeight":"400|700|900","color":"#hex"}]}]

type: hero, pain_points, features, point, stats_highlight, review, cta, event, howto, comparison, guarantee, before_after 중 선택.
layout: hero=full_image, pain_points=centered_text, features=grid_2col/grid_3col, point=left_image_right_text/right_image_left_text/centered_text/full_image, stats=centered_text, review=card_list, cta=centered_text.
role: subtitle, title, body, price, stat_number, stat_label, review_name, star, review_text, question, answer.
image_prompt는 제품 실사진 스타일. 모든 섹션에 image_prompt 필수.
카피는 실제 쇼핑몰 수준, ${catLabel} 카테고리 전문 멘트. 구체적 수치/성분 포함.
- 이모지(emoji), 이모티콘, 특수기호(❌, 🎊, 🎁, ✦, ★ 등)를 절대 사용하지 마세요. 텍스트만 작성하세요.
- 모든 elements에 content 필수
JSON배열만 출력.`;

      // Gemini API 직접 호출 — 110초 타임아웃
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 110000);
      let geminiRes;
      try {
        geminiRes = await fetch("/api/gemini-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 8000 }),
          signal: abortCtrl.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw new Error(fetchErr.name === "AbortError" ? "생성 시간 초과. 다시 시도해주세요." : fetchErr.message);
      }
      clearTimeout(timeoutId);
      if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        throw new Error(err.error || (geminiRes.status === 504 ? "AI 서버 응답 지연 — 잠시 후 다시 시도해주세요." : `생성 실패 (${geminiRes.status})`));
      }
      const geminiJson = await geminiRes.json();
      const layoutResult = geminiJson.text || "";
      if (!layoutResult || layoutResult.length < 10) {
        throw new Error("AI 응답이 비어있습니다. 다시 시도해주세요.");
      }
      let layoutData;
      try {
        let cleaned = layoutResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        // JSON 배열이 아닌 경우 배열 부분만 추출 시도
        if (!cleaned.startsWith("[")) {
          const arrMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrMatch) cleaned = arrMatch[0];
        }
        layoutData = JSON.parse(cleaned);
        if (!Array.isArray(layoutData)) throw new Error("배열이 아닌 응답");
      } catch (e) {
        console.error("Layout parse error:", e, layoutResult?.slice(0, 500));
        // 한번 더 재시도
        try {
          const retryRes = await fetch("/api/gemini-generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 8000 }),
          });
          const retryData = await retryRes.json();
          const retryText = (retryData.text || "").replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const retryArr = retryText.startsWith("[") ? retryText : (retryText.match(/\[[\s\S]*\]/) || [""])[0];
          layoutData = JSON.parse(retryArr);
          if (!Array.isArray(layoutData)) throw new Error("재시도 실패");
          console.log("Layout parse 재시도 성공");
        } catch (e2) {
          console.error("Layout parse 재시도 실패:", e2);
          setPipeError("레이아웃 생성 실패. 다시 시도해주세요. (JSON 파싱 오류)");
          return; // generating 화면에서 에러 표시, input으로 안 돌림
        }
      }

      // 프리미엄: 부족한 섹션 보충
      if (mode === "precise" && layoutData.length < 12) {
        try {
          const existingTypes = layoutData.map(s => s.type).join(",");
          const addPrompt = `제품:"${productName}" 카테고리:${catLabel}. 기존 섹션: ${existingTypes}.
부족한 섹션을 추가로 만들어줘(JSON배열). 아래에서 기존에 없는 것 선택:
- point(성분/기술력 상세): 핵심 성분 강조 + 신뢰 확보
- point(추천 대상): 체크형 리스트로 타겟 명확화
- comparison: 일반 제품 vs 우리 제품 비교
- howto: 사용 방법 2~3단계
- guarantee: 보증/인증/신뢰
- before_after: 사용 전후 변화
흐름: 기능 설득 → 신뢰 확보 → 구매 유도. 디자인 톤:${seed.tone}. 색상:${seed.palette}. 이모지(emoji), 이모티콘, 특수기호를 절대 사용하지 마세요. JSON배열만 출력.`;
          const addRes = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: addPrompt, maxTokens: 5000 }) });
          if (addRes.ok) {
            const { text: addResult } = await addRes.json();
            const addCleaned = addResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
            const addData = JSON.parse(addCleaned);
            if (Array.isArray(addData)) layoutData = [...layoutData, ...addData];
          }
        } catch (e2) { console.warn("프리미엄 추가 섹션 생성 실패:", e2); }
      }

      setPipeResults(prev => ({ ...prev, layout: layoutData }));
      setPipeStep(5); // 완료

      // 섹션 데이터 설정 → 레이아웃 다양성 강제 적용 + 배경색 교차
      const layoutVariants = {
        hero: ["full_image", "left_image_right_text", "centered_text", "right_image_left_text"],
        pain_points: ["centered_text", "grid_2col", "grid_3col", "left_image_right_text"],
        features: ["grid_2col", "grid_3col", "centered_text", "left_image_right_text", "right_image_left_text"],
        point: ["left_image_right_text", "right_image_left_text", "full_image", "centered_text"],
        stats_highlight: ["centered_text"],
        review: ["card_list"],
        comparison: ["centered_text"],
        guarantee: ["centered_text"],
        cta: ["centered_text", "left_image_right_text"],
        faq: ["centered_text"],
        howto: ["centered_text"],
        before_after: ["centered_text"],
        event: ["centered_text"],
        pricing: ["centered_text"],
        process_steps: ["centered_text"],
        facility: ["centered_text"],
        contact: ["centered_text"],
        info: ["centered_text"],
        cert: ["centered_text"],
        shipping: ["centered_text"],
      };
      // 배경색: 흰색/크림 기본, 다크는 hero/cta/stats만
      // 배경색 패턴: 밝은 배경 중심, 다크는 최소
      const bgPattern = ["#ffffff", "#f5f5f5", "#f9f6f2", "#ffffff", "#f5f0eb", "#f5f5f5", "#ffffff", "#f9f6f2", "#1a1a2e", "#ffffff", "#f5f5f5", "#f9f6f2", "#ffffff", "#f5f0eb"];
      let pointIdx = 0;
      const diversified = layoutData.map((s, i) => {
        const type = s.type || "point";
        // 빈 elements fallback: 템플릿에서 기본 elements 가져오기
        if (!s.elements || s.elements.length === 0) {
          const templates = SECTION_TEMPLATES[type];
          if (templates && templates.length > 0) {
            const tmpl = templates[Math.floor(Math.random() * templates.length)];
            s = { ...s, elements: tmpl.elements, layout: tmpl.layout, bg_color: tmpl.bg_color };
          } else {
            s = { ...s, elements: [
              { type: "text", role: "title", content: SECTION_TYPE_LABELS[type] || type, fontSize: 26, fontWeight: "900", color: "#1a1a1a" },
              { type: "text", role: "body", content: "내용을 입력해주세요", fontSize: 14, color: "#666" },
            ] };
          }
        }
        const variants = layoutVariants[type];
        let newLayout = s.layout;
        // point 섹션은 교대 배치
        if (type === "point") {
          newLayout = pointIdx % 2 === 0 ? "left_image_right_text" : "right_image_left_text";
          // 3번째 point는 full_image
          if (pointIdx === 2) newLayout = "full_image";
          pointIdx++;
        } else if (variants && variants.length > 1) {
          // 같은 타입 내에서 랜덤 선택 (이전과 다르게)
          newLayout = variants[Math.floor(Math.random() * variants.length)];
        }
        // 배경색 교차 강제 (hero/cta/stats는 다크, 나머지는 패턴)
        let newBg = s.bg_color;
        if (type === "hero") newBg = "#111";
        else if (type === "ai_notice") newBg = "#fafafa";
        else if (type === "shipping") newBg = "#f5f5f5";
        else {
          // 연속 같은 배경 방지 — 이전 섹션과 다른 색 선택
          newBg = bgPattern[i % bgPattern.length];
          if (i > 0) {
            const prevBg = layoutData[i - 1]?._assignedBg;
            if (prevBg === newBg) {
              newBg = bgPattern[(i + 1) % bgPattern.length];
              if (prevBg === newBg) newBg = bgPattern[(i + 2) % bgPattern.length];
            }
          }
          s._assignedBg = newBg;
        }
        // 디자인 변형 번호 (같은 타입이라도 시각적으로 다르게)
        const designVariant = (i * 7 + 3) % 6;

        // ── 배경 변경 후 텍스트 색상 자동 보정 ──
        const bgHex = (newBg || "#fff").replace("#", "");
        const bR = parseInt(bgHex.slice(0, 2), 16) || 255;
        const bG = parseInt(bgHex.slice(2, 4), 16) || 255;
        const bB = parseInt(bgHex.slice(4, 6), 16) || 255;
        const newIsDark = (bR * 299 + bG * 587 + bB * 114) / 1000 < 128;
        const correctedElements = (s.elements || []).map(el => {
          if (el.type !== "text" && el.type !== "badge") return el;
          const c = (el.color || "").toLowerCase();
          if (newIsDark) {
            // 다크 배경: 어두운 텍스트를 밝게 변환
            if (c === "#1a1a1a" || c === "#1a1a2e" || c === "#333" || c === "#333333" || c === "#2c2c2c" || c === "#111" || c === "#000" || c === "#444" || c === "#555") {
              return { ...el, color: "#fff" };
            }
            if (c === "#666" || c === "#666666" || c === "#777" || c === "#888" || c === "#999") {
              return { ...el, color: "rgba(255,255,255,0.65)" };
            }
          } else {
            // 밝은 배경: 밝은 텍스트를 어둡게 변환
            if (c === "#fff" || c === "#ffffff" || c === "white") {
              return { ...el, color: el.fontWeight === "900" || el.fontWeight === "700" ? "#1a1a1a" : "#333" };
            }
            if (c.startsWith("rgba(255,255,255")) {
              return { ...el, color: el.fontWeight === "700" ? "#555" : "#888" };
            }
          }
          return el;
        });

        return { ...s, id: `sec_${i}_${Date.now()}`, enabled: true, layout: newLayout, bg_color: newBg, designVariant, elements: correctedElements };
      });
      setSections(diversified);
      setActiveSection(0);

      // 포인트 차감 (실패해도 진행)
      try { if (user?.uid) await changePoints(user.uid, -10, "상세페이지 생성"); } catch {}
      if (!user) try { incrementGuestUsage(); } catch {}

      setTimeout(() => setPhase("outline"), 800);

    } catch (e) {
      console.error("Pipeline error:", e);
      setPipeError((e.message || "생성 중 오류가 발생했습니다.") + " — 다시 시도해주세요.");
    }
  };

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
  //  렌더링
  // ══════════════════════════════════════════════════════════

  // ── 입력 폼 ─────────────────────────────────────────────
  if (phase === "input") return (
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

  // ── AI 파이프라인 진행 화면 ──────────────────────────────
  const pipelineStepsUI = [
    { label: "제품 사진 분석", desc: "이미지에서 색상·스타일·분위기를 읽어요", stepIdx: 2 },
    { label: "톤앤매너 설정", desc: "브랜드에 맞는 색상과 말투를 결정해요", stepIdx: 3 },
    { label: "섹션 구성 & 카피 작성", desc: "페이지별 레이아웃과 텍스트를 만들어요", stepIdx: 4 },
  ];
  const progressPct = pipeStep <= 1 ? 5 : pipeStep === 2 ? 30 : pipeStep === 3 ? 55 : pipeStep === 4 ? 80 : 100;

  if (phase === "generating") return (
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

  // ── 아웃라인 확인 (Phase 1.5) ──────────────────────────
  if (phase === "outline") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: D ? "transparent" : "#f5f5f5", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "24px 24px 0" }}>
        <div style={{ maxWidth: "min(600px, 100%)", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 6 }}>섹션 구성 확인</div>
          <div style={{ fontSize: 13, color: muted }}>포함할 섹션을 선택하고 순서를 변경하세요</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 12 }}>총 {sections.filter(s => s.enabled !== false).length}/{sections.length}개 섹션 선택됨</div>
          {sections.map((sec, i) => {
            const sType = SECTION_TYPES.find(t => t.id === sec.type);
            const enabled = sec.enabled !== false;
            // 섹션 타입별 미니 레이아웃 프리뷰 SVG
            const layoutMini = {
              full_image: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#e8e0f0"} opacity="0.5"/><rect x="8" y="18" width="32" height="3" rx="1" fill={acc}/><rect x="14" y="23" width="20" height="2" rx="1" fill={acc} opacity="0.4"/></svg>,
              centered_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="12" y="8" width="24" height="3" rx="1" fill={acc}/><rect x="8" y="14" width="32" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="10" y="19" width="28" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="14" y="24" width="20" height="2" rx="1" fill={muted} opacity="0.2"/></svg>,
              left_image_right_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="18" height="24" rx="3" fill={acc} opacity="0.2"/><rect x="25" y="8" width="18" height="3" rx="1" fill={acc}/><rect x="25" y="14" width="16" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="25" y="19" width="14" height="2" rx="1" fill={muted} opacity="0.3"/></svg>,
              right_image_left_text: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="27" y="4" width="18" height="24" rx="3" fill={acc} opacity="0.2"/><rect x="3" y="8" width="18" height="3" rx="1" fill={acc}/><rect x="3" y="14" width="16" height="2" rx="1" fill={muted} opacity="0.3"/><rect x="3" y="19" width="14" height="2" rx="1" fill={muted} opacity="0.3"/></svg>,
              grid_2col: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="20" height="12" rx="3" fill={acc} opacity="0.15"/><rect x="25" y="4" width="20" height="12" rx="3" fill={acc} opacity="0.15"/><rect x="3" y="19" width="20" height="9" rx="3" fill={acc} opacity="0.1"/><rect x="25" y="19" width="20" height="9" rx="3" fill={acc} opacity="0.1"/></svg>,
              grid_3col: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="2" y="6" width="13" height="20" rx="2" fill={acc} opacity="0.15"/><rect x="17" y="6" width="14" height="20" rx="2" fill={acc} opacity="0.15"/><rect x="33" y="6" width="13" height="20" rx="2" fill={acc} opacity="0.15"/></svg>,
              card_list: <svg width="48" height="32" viewBox="0 0 48 32"><rect width="48" height="32" rx="3" fill={sec.bg_color || "#f8f8f8"} opacity="0.3"/><rect x="3" y="4" width="42" height="7" rx="2" fill={acc} opacity="0.12"/><rect x="3" y="13" width="42" height="7" rx="2" fill={acc} opacity="0.12"/><rect x="3" y="22" width="42" height="7" rx="2" fill={acc} opacity="0.12"/></svg>,
            };
            const miniSvg = layoutMini[sec.layout] || layoutMini.centered_text;
            const titleContent = sec.elements?.find(e => e.role === "title")?.content || "";
            return (
              <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${enabled ? acc + "35" : bdr}`, background: enabled ? (D ? "rgba(124,106,255,0.06)" : "#faf9ff") : (D ? "rgba(255,255,255,0.02)" : "#fafafa"), marginBottom: 14, opacity: enabled ? 1 : 0.4, transition: "all 0.15s" }}>
                {/* 체크박스 */}
                <button onClick={() => setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, enabled: s.enabled === false ? true : false }))}
                  style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${enabled ? acc : bdr}`, background: enabled ? acc : "transparent", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {enabled && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                {/* 순서 변경 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                  <button onClick={() => { if (i > 0) setSections(prev => { const a = [...prev]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); }}
                    style={{ width: 20, height: 14, border: "none", background: "transparent", color: muted, fontSize: 9, cursor: "pointer", padding: 0, opacity: i === 0 ? 0.2 : 0.7 }}>▲</button>
                  <button onClick={() => { if (i < sections.length-1) setSections(prev => { const a = [...prev]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; }); }}
                    style={{ width: 20, height: 14, border: "none", background: "transparent", color: muted, fontSize: 9, cursor: "pointer", padding: 0, opacity: i === sections.length-1 ? 0.2 : 0.7 }}>▼</button>
                </div>
                {/* 레이아웃 미니 프리뷰 */}
                <div style={{ flexShrink: 0, borderRadius: 6, overflow: "hidden", border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fff" }}>
                  {miniSvg}
                </div>
                {/* 섹션 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{sType?.label || sec.type}</div>
                  <div style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {titleContent || sType?.desc || ""}
                  </div>
                </div>
                {/* 삭제 버튼 */}
                <button onClick={() => setSections(prev => prev.filter((_, si) => si !== i))}
                  style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", flexShrink: 0, opacity: 0.4 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>
                  x
                </button>
              </div>
            );
          })}
          {/* 섹션 추가 */}
          <button onClick={() => {
            const newSec = {
              id: `sec_add_${Date.now()}`, type: "point", layout: "centered_text",
              bg_color: "#ffffff", enabled: true, designVariant: Math.floor(Math.random() * 6),
              elements: [
                { type: "text", role: "title", content: "새 섹션 제목", fontSize: 28, fontWeight: "900", color: "#1a1a1a" },
                { type: "text", role: "body", content: "내용을 입력하세요", fontSize: 15, color: "#666" },
              ],
            };
            setSections(prev => [...prev, newSec]);
          }}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer", marginBottom: 14, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = acc; e.currentTarget.style.color = acc; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}>
            + 섹션 추가
          </button>
        </div>
        {/* 예상 길이 */}
        <div style={{ textAlign: "center", padding: "12px 0 8px", fontSize: 11, color: muted }}>
          예상 길이: 약 {(sections.filter(s => s.enabled !== false).length * 1200).toLocaleString()}px
        </div>

        </div>
      </div>
      {/* 하단 고정 버튼 */}
      <div style={{ flexShrink: 0, padding: "16px 24px", borderTop: `1px solid ${bdr}`, background: D ? "rgba(0,0,0,0.3)" : "#fff", display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 600, width: "100%", display: "flex", gap: 10 }}>
          <button onClick={() => { setPhase("input"); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>
            ← 다시 입력
          </button>
          <button onClick={() => {
            const enabledSecs = sections.filter(s => s.enabled !== false);
            setSections(enabledSecs);
            stockFilledRef.current = false; // 에디터 진입 시 스톡 이미지 자동 채우기 트리거
            setPhase("editor");
          }}
            style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 16px ${acc}40` }}>
            편집 시작 ({sections.filter(s => s.enabled !== false).length}개 섹션) →
          </button>
        </div>
      </div>
    </div>
  );

  // (에디터 진입 시 이미지 자동 채우기는 상단 useEffect에서 처리)

  // ── 에디터 (Phase 2) ────────────────────────────────────
  if (phase === "editor") return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽 사이드바 */}
      <div style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, borderRight: sidebarCollapsed ? "none" : `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", transition: "width 0.2s, min-width 0.2s", overflow: "hidden", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* 사이드바 탭 아이콘 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
          {[
            { key: "pages", icon: "☰", label: "페이지" },
            { key: "text", icon: "T", label: "텍스트" },
            { key: "templates", icon: "▦", label: "템플릿" },
            { key: "shapes", icon: "◇", label: "도형" },
            { key: "media", icon: "+", label: "자료" },
            { key: "color", icon: "◐", label: "색상" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSidebarTab(tab.key)}
              style={{
                width: "100%", padding: "10px 12px", background: sidebarTab === tab.key ? (D ? "rgba(124,106,255,0.15)" : "#f0eeff") : "transparent",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                color: sidebarTab === tab.key ? acc : muted, fontSize: 13, fontWeight: sidebarTab === tab.key ? 700 : 500,
                borderRadius: 8, margin: "0 8px",
              }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 사이드바 콘텐츠 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {sidebarTab === "pages" && (
            <>
              <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>총 {sections.length} 페이지</div>
              {sections.map((sec, i) => (
                <div key={sec.id} onClick={() => setActiveSection(i)}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("text/plain", String(i))}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const from = parseInt(e.dataTransfer.getData("text/plain"));
                    if (isNaN(from) || from === i) return;
                    setSections(prev => {
                      const arr = [...prev];
                      const [moved] = arr.splice(from, 1);
                      arr.splice(i, 0, moved);
                      return arr;
                    });
                    setActiveSection(i);
                  }}
                  style={{
                    padding: "10px 12px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                    border: `1.5px solid ${activeSection === i ? acc : bdr}`,
                    background: activeSection === i ? (D ? "rgba(124,106,255,0.1)" : "#f8f7ff") : "transparent",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: muted, cursor: "grab" }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: acc, fontWeight: 700 }}>
                        {SECTION_TYPES.find(t => t.id === sec.type)?.label || sec.type}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sec.elements?.find(e => e.role === "title")?.content || sec.label || ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* 섹션 추가 */}
              <button onClick={() => {
                const newSec = { id: `sec_new_${Date.now()}`, type: "point", label: "새 섹션", bg_color: colorPalette?.light_bg || "#ffffff", elements: [
                  { type: "text", role: "title", content: "새 섹션 제목", x: 50, y: 200, w: 760, fontSize: 36, fontWeight: "900", color: colorPalette?.main || "#1a1a2e" },
                  { type: "text", role: "body", content: "내용을 입력하세요", x: 50, y: 300, w: 760, fontSize: 16, fontWeight: "400", color: "#666", lineHeight: 1.8 },
                ] };
                setSections(prev => [...prev, newSec]);
                setActiveSection(sections.length);
              }}
                style={{
                  width: "100%", padding: "10px", borderRadius: 10, border: `1.5px dashed ${bdr}`,
                  background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginTop: 4,
                }}>
                + 섹션 추가
              </button>

              {/* 레이어 패널 — 선택된 섹션의 오브젝트 */}
              {activeSection < sections.length && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>
                    페이지 {activeSection + 1} 레이어
                  </div>
                  {/* 배경 이미지 레이어 */}
                  {sections[activeSection]?.bgImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, background: D ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${bdr}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        <img src={sections[activeSection].bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontSize: 10, color: muted, flex: 1 }}>배경 이미지</span>
                    </div>
                  )}
                  {/* 이미지 레이어 */}
                  {sectionImages[sections[activeSection]?.id]?.url && (
                    <div onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: -1, el: { type: "image", _type: "image", role: "section_image" } })}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, cursor: "pointer", background: selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? `${acc}15` : (D ? "rgba(255,255,255,0.03)" : "#f9f9f9"), border: `1px solid ${selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? acc : bdr}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        <img src={sectionImages[sections[activeSection].id].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontSize: 10, color: text, flex: 1 }}>섹션 이미지</span>
                    </div>
                  )}
                  {/* 텍스트/배지/도형 요소 레이어 */}
                  {(sections[activeSection]?.elements || []).map((el, ei) => {
                    const isActive = selectedEl?.secIdx === activeSection && selectedEl?.elIdx === ei;
                    const elCount = sections[activeSection]?.elements?.length || 0;
                    return (
                      <div key={ei} onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: ei, el: { ...el, _type: el.type === "shape" ? "shape" : "text" } })}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", background: isActive ? `${acc}15` : "transparent", border: `1px solid ${isActive ? acc : "transparent"}` }}>
                        <span style={{ fontSize: 9, color: acc, fontWeight: 700, width: 16, flexShrink: 0 }}>
                          {el.type === "badge" ? "B" : el.type === "divider" ? "—" : el.type === "shape" ? "S" : "T"}
                        </span>
                        <span style={{ fontSize: 10, color: text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {el.content?.slice(0, 20) || el.shape || el.role || el.type}
                        </span>
                        {/* 순서 변경 + 삭제 */}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          {ei > 0 && (
                            <button onClick={() => {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: s.elements.map((e, idx) => idx === ei - 1 ? s.elements[ei] : idx === ei ? s.elements[ei - 1] : e) }));
                              if (isActive) setSelectedEl(prev => ({ ...prev, elIdx: ei - 1 }));
                            }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="위로">
                              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2L2 6h6z" fill="currentColor"/></svg>
                            </button>
                          )}
                          {ei < elCount - 1 && (
                            <button onClick={() => {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: s.elements.map((e, idx) => idx === ei ? s.elements[ei + 1] : idx === ei + 1 ? s.elements[ei] : e) }));
                              if (isActive) setSelectedEl(prev => ({ ...prev, elIdx: ei + 1 }));
                            }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="아래로">
                              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8L2 4h6z" fill="currentColor"/></svg>
                            </button>
                          )}
                          <button onClick={() => {
                            setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: s.elements.filter((_, idx) => idx !== ei) }));
                            if (isActive) setSelectedEl(null);
                          }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer", padding: 0 }} title="삭제">
                            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 텍스트 속성 패널 — 텍스트 선택 시 자동 표시 */}
          {sidebarTab === "text" && (
            <div>
              {selectedEl?.el?._type === "text" ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>텍스트 편집</div>

                  {/* 폰트 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>폰트</div>
                  <select value={selectedEl.el.fontFamily || "Pretendard"} onChange={e => {
                    const val = e.target.value;
                    setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fontFamily: val }) }));
                    setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fontFamily: val } }));
                  }} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 600, marginBottom: 14, cursor: "pointer" }}>
                    {[
                      { id: "Pretendard", label: "Pretendard" },
                      { id: "'Noto Sans KR'", label: "Noto Sans KR" },
                      { id: "SBAggroB", label: "SB Aggro Bold" },
                      { id: "'Cafe24Ssurround'", label: "Cafe24 Ssurround" },
                      { id: "MaruBuri", label: "MaruBuri" },
                      { id: "'GmarketSans'", label: "Gmarket Sans" },
                      { id: "serif", label: "Serif" },
                      { id: "monospace", label: "Monospace" },
                    ].map(f => <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>{f.label}</option>)}
                  </select>

                  {/* 크기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>크기</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="number" value={selectedEl.el.fontSize || 14} min={8} max={120}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 14;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fontSize: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fontSize: val } }));
                      }}
                      style={{ width: 70, padding: "8px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, fontWeight: 700, textAlign: "center" }} />
                    <span style={{ fontSize: 11, color: muted }}>px</span>
                  </div>

                  {/* 스타일 B/I/U/S */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>스타일</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {[
                      { key: "fontWeight", label: "B", values: ["900", "400"], style: { fontWeight: 900 } },
                      { key: "fontStyle", label: "I", values: ["italic", "normal"], style: { fontStyle: "italic" } },
                      { key: "textDecoration", label: "U", values: ["underline", "none"], style: { textDecoration: "underline" } },
                      { key: "textDecoration", label: "S", values: ["line-through", "none"], style: { textDecoration: "line-through" } },
                    ].map((s, si) => {
                      const isActive = selectedEl.el[s.key] === s.values[0];
                      return (
                        <button key={si} onClick={() => {
                          const val = isActive ? s.values[1] : s.values[0];
                          setSections(prev => prev.map((sec, idx) => idx !== selectedEl.secIdx ? sec : { ...sec, elements: sec.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, [s.key]: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, [s.key]: val } }));
                        }} style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: `1.5px solid ${isActive ? "#2196F3" : bdr}`,
                          background: isActive ? "rgba(33,150,243,0.1)" : "transparent",
                          color: isActive ? "#2196F3" : text, fontSize: 15, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", ...s.style,
                        }}>{s.label}</button>
                      );
                    })}
                  </div>

                  {/* 색상 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={selectedEl.el.color || "#000000"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, color: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, color: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{selectedEl.el.color || "#000000"}</span>
                  </div>

                  {/* 정렬 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>정렬</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {[
                      { align: "left", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6h8M2 9h12M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                      { align: "center", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 6h8M2 9h12M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                      { align: "right", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M6 6h8M2 9h12M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                    ].map(a => (
                      <button key={a.align} onClick={() => {
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textAlign: a.align }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textAlign: a.align } }));
                      }} style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: `1.5px solid ${selectedEl.el.textAlign === a.align ? "#2196F3" : bdr}`,
                        background: selectedEl.el.textAlign === a.align ? "rgba(33,150,243,0.1)" : "transparent",
                        color: selectedEl.el.textAlign === a.align ? "#2196F3" : muted,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{a.svg}</button>
                    ))}
                  </div>

                  {/* 행간 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>행간</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="1" max="3" step="0.1" value={selectedEl.el.lineHeight || 1.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, lineHeight: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, lineHeight: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(selectedEl.el.lineHeight || 1.5).toFixed(1)}</span>
                  </div>

                  {/* 자간 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>자간</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="-2" max="10" step="0.5" value={selectedEl.el.letterSpacing || 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, letterSpacing: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, letterSpacing: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(selectedEl.el.letterSpacing || 0).toFixed(1)}</span>
                  </div>

                  <div style={{ height: 1, background: bdr, margin: "8px 0 14px" }} />

                  {/* 그림자 / 배경박스 토글 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button onClick={() => {
                      const val = selectedEl.el.textShadow ? "" : "0 2px 8px rgba(0,0,0,0.3)";
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textShadow: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textShadow: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${selectedEl.el.textShadow ? "#2196F3" : bdr}`, background: selectedEl.el.textShadow ? "rgba(33,150,243,0.1)" : "transparent", color: selectedEl.el.textShadow ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      그림자
                    </button>
                    <button onClick={() => {
                      const val = !selectedEl.el.bgBox;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBox: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBox: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${selectedEl.el.bgBox ? "#2196F3" : bdr}`, background: selectedEl.el.bgBox ? "rgba(33,150,243,0.1)" : "transparent", color: selectedEl.el.bgBox ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      배경 박스
                    </button>
                  </div>
                  {/* 그림자 세부 조정 */}
                  {selectedEl.el.textShadow && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>그림자 스타일</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                        {[
                          { label: "약하게", val: "0 1px 4px rgba(0,0,0,0.15)" },
                          { label: "보통", val: "0 2px 8px rgba(0,0,0,0.3)" },
                          { label: "강하게", val: "0 4px 16px rgba(0,0,0,0.5)" },
                          { label: "네온", val: `0 0 12px ${acc}, 0 0 24px ${acc}60` },
                          { label: "입체", val: "2px 2px 0 rgba(0,0,0,0.3)" },
                          { label: "글로우", val: "0 0 20px rgba(255,255,255,0.5)" },
                        ].map((sh, si) => (
                          <button key={si} onClick={() => {
                            setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textShadow: sh.val }) }));
                            setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textShadow: sh.val } }));
                          }} style={{ padding: "6px 4px", borderRadius: 6, border: `1px solid ${selectedEl.el.textShadow === sh.val ? "#2196F3" : bdr}`, background: "transparent", color: text, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {sh.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 배경박스 세부 조정 */}
                  {selectedEl.el.bgBox && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>배경 색상</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                        {[
                          { color: "rgba(0,0,0,0.04)", label: "연한" },
                          { color: "rgba(0,0,0,0.15)", label: "중간" },
                          { color: "rgba(0,0,0,0.4)", label: "진한" },
                          { color: `${acc}15`, label: "포인트 연" },
                          { color: `${acc}30`, label: "포인트" },
                          { color: acc, label: "포인트 진" },
                          { color: "rgba(255,255,255,0.1)", label: "화이트" },
                          { color: "rgba(255,255,255,0.25)", label: "화이트 진" },
                        ].map((bg, bi) => (
                          <button key={bi} onClick={() => {
                            setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBoxColor: bg.color }) }));
                            setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBoxColor: bg.color } }));
                          }} style={{ width: 28, height: 28, borderRadius: 6, background: bg.color, border: `1.5px solid ${selectedEl.el.bgBoxColor === bg.color ? "#2196F3" : bdr}`, cursor: "pointer" }} title={bg.label} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 6 }}>둥글기</div>
                      <input type="range" min="0" max="24" value={selectedEl.el.bgBoxRadius || 8}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBoxRadius: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBoxRadius: val } }));
                        }}
                        style={{ width: "100%", accentColor: acc }} />
                    </div>
                  )}

                  {/* 위치 미세 조정 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>위치 조정</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 8 }}>
                    <button onClick={() => {
                      const val = (selectedEl.el.offsetY || 0) - 4;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetY: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetY: val } }));
                    }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2L2 7h8z" fill="currentColor"/></svg>
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => {
                        const val = (selectedEl.el.offsetX || 0) - 4;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: val } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l5-4v8z" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => {
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: 0, offsetY: 0 }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: 0, offsetY: 0 } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
                        0,0
                      </button>
                      <button onClick={() => {
                        const val = (selectedEl.el.offsetX || 0) + 4;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: val } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 6l-5-4v8z" fill="currentColor"/></svg>
                      </button>
                    </div>
                    <button onClick={() => {
                      const val = (selectedEl.el.offsetY || 0) + 4;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetY: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetY: val } }));
                    }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 10l4-5H2z" fill="currentColor"/></svg>
                    </button>
                  </div>
                </>
              ) : selectedEl?.el?._type === "image" ? (
                /* 이미지 속성 패널 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>이미지 편집</div>

                  {/* 배경 색상 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={sections[selectedEl.secIdx]?.bg_color || "#ffffff"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, bg_color: val }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{sections[selectedEl.secIdx]?.bg_color || "#ffffff"}</span>
                  </div>

                  {/* 이미지 미리보기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지</div>
                  <div style={{ width: "100%", height: 140, borderRadius: 12, overflow: "hidden", background: D ? "rgba(255,255,255,0.04)" : "#f5f5f5", marginBottom: 14, position: "relative", cursor: "pointer" }}
                    onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}>
                    {(() => {
                      const secId = sections[selectedEl.secIdx]?.id;
                      const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
                      return imgUrl ? (
                        <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: muted, fontSize: 12 }}>클릭하여 업로드</div>
                      );
                    })()}
                    <input id={`sidebar-img-upload-${selectedEl.secIdx}`} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const secId = sections[selectedEl.secIdx]?.id;
                      const preview = URL.createObjectURL(file);
                      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: preview, error: null } }));
                    }} />
                  </div>

                  {/* 배경 제거 */}
                  <button onClick={async () => {
                    const secId = sections[selectedEl.secIdx]?.id;
                    const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
                    if (!imgUrl) return;
                    setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: true } }));
                    try {
                      // Canvas로 이미지 로드 후 base64 변환
                      const img = new Image(); img.crossOrigin = "anonymous";
                      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgUrl; });
                      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
                      const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
                      // 배경 제거: 모서리 색상 기반 chroma key
                      const imgData = ctx.getImageData(0, 0, c.width, c.height);
                      const d = imgData.data;
                      // 모서리 4개 픽셀의 평균을 배경색으로 추정
                      const corners = [0, (c.width - 1) * 4, (c.height - 1) * c.width * 4, ((c.height - 1) * c.width + c.width - 1) * 4];
                      let bgR = 0, bgG = 0, bgB = 0;
                      corners.forEach(ci => { bgR += d[ci]; bgG += d[ci+1]; bgB += d[ci+2]; });
                      bgR = Math.round(bgR / 4); bgG = Math.round(bgG / 4); bgB = Math.round(bgB / 4);
                      const threshold = 40;
                      for (let p = 0; p < d.length; p += 4) {
                        if (Math.abs(d[p] - bgR) < threshold && Math.abs(d[p+1] - bgG) < threshold && Math.abs(d[p+2] - bgB) < threshold) {
                          d[p+3] = 0; // alpha to 0
                        }
                      }
                      ctx.putImageData(imgData, 0, 0);
                      const result = c.toDataURL("image/png");
                      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: result, error: null } }));
                    } catch (err) {
                      setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: false, error: err.message } }));
                    }
                  }}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {sectionImages[sections[selectedEl.secIdx]?.id]?.loading ? "처리 중..." : "배경 제거"}
                  </button>

                  <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

                  {/* 이미지 변형 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지 변형</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <button onClick={() => {
                      const cur = sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1;
                      const val = cur * -1;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, scaleX: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, scaleX: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      좌우 뒤집
                    </button>
                    <button onClick={() => {
                      const cur = sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1;
                      const val = cur * -1;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, scaleY: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, scaleY: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      상하 뒤집
                    </button>
                  </div>

                  {/* 이미지 크기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지 크기 (%)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="10" max="200" step="5" value={sections[selectedEl.secIdx]?.imgProps?.imgScale ?? 100}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, imgScale: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, imgScale: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.imgScale ?? 100}%</span>
                  </div>

                  {/* 둥근 모서리 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>둥근 모서리</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="0" max="50" step="1" value={sections[selectedEl.secIdx]?.imgProps?.borderRadius ?? 14}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, borderRadius: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, borderRadius: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.borderRadius ?? 14}px</span>
                  </div>

                  {/* 투명도 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>투명도</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="0" max="100" step="1" value={sections[selectedEl.secIdx]?.imgProps?.opacity ?? 100}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, opacity: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, opacity: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.opacity ?? 100}%</span>
                  </div>

                  {/* 흑백 효과 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <button onClick={() => {
                      const val = !sections[selectedEl.secIdx]?.imgProps?.grayscale;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, grayscale: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, grayscale: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${sections[selectedEl.secIdx]?.imgProps?.grayscale ? "#2196F3" : bdr}`, background: sections[selectedEl.secIdx]?.imgProps?.grayscale ? "rgba(33,150,243,0.1)" : "transparent", color: sections[selectedEl.secIdx]?.imgProps?.grayscale ? "#2196F3" : text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      흑백 효과
                    </button>
                  </div>

                  <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

                  {/* 기존 이미지로 교체 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>기존 이미지로 교체</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    <div onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}
                      style={{ height: 60, borderRadius: 8, border: `1.5px dashed ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: muted }}>
                      +
                    </div>
                    {images.map((img, idx) => (
                      <div key={idx} onClick={() => {
                        const secId = sections[selectedEl.secIdx]?.id;
                        setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: img.preview, error: null } }));
                      }}
                        style={{ height: 60, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${bdr}` }}>
                        <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>

                  {/* 위치 리셋 */}
                  {(sections[selectedEl.secIdx]?.imgProps?.offsetX || sections[selectedEl.secIdx]?.imgProps?.offsetY) ? (
                    <button onClick={() => {
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, offsetX: 0, offsetY: 0 } }));
                    }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                      위치 초기화
                    </button>
                  ) : null}

                  {/* AI 이미지 생성 */}
                  {sections[selectedEl.secIdx]?.image_prompt && (
                    <button onClick={() => generateSectionImage(sections[selectedEl.secIdx].id, sections[selectedEl.secIdx].image_prompt)}
                      style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2196F3, #7c6aff)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      AI 이미지 생성
                    </button>
                  )}
                </>
              ) : selectedEl?.el?._type === "shape" ? (
                /* 도형 속성 패널 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>도형 편집</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>채우기 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={(selectedEl.el.fill || "#7c6aff").replace(/[0-9a-f]{2}$/i, "")} onChange={e => {
                      const val = e.target.value + "33";
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fill: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fill: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <button onClick={() => {
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fill: "transparent" }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fill: "transparent" } }));
                    }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>투명</button>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>테두리 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={selectedEl.el.stroke || "#7c6aff"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, stroke: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, stroke: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>크기</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <div>
                      <span style={{ fontSize: 9, color: muted }}>너비</span>
                      <input type="number" value={selectedEl.el.width || 120} min="20" max="800" step="10"
                        onChange={e => {
                          const val = parseInt(e.target.value) || 120;
                          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, width: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, width: val } }));
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 9, color: muted }}>높이</span>
                      <input type="number" value={selectedEl.el.height || 80} min="20" max="800" step="10"
                        onChange={e => {
                          const val = parseInt(e.target.value) || 80;
                          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, height: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, height: val } }));
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
                    </div>
                  </div>
                  <button onClick={() => {
                    setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: s.elements.filter((_, ei) => ei !== selectedEl.elIdx) }));
                    setSelectedEl(null);
                  }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    도형 삭제
                  </button>
                </>
              ) : (
                /* 기본: 섹션 텍스트 편집 목록 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 12 }}>
                    페이지 {activeSection + 1} 텍스트
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>캔버스에서 텍스트를 클릭하면 속성이 여기에 표시됩니다</div>
                  {(sections[activeSection]?.elements || []).filter(e => e.type === "text").map((el, ei) => (
                    <div key={ei} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: muted, marginBottom: 3, display: "block", fontWeight: 600 }}>{el.role === "title" ? "제목" : el.role === "subtitle" ? "소제목" : el.role}</label>
                      <textarea value={el.content}
                        onChange={e => {
                          const val = e.target.value;
                          setSections(prev => prev.map((s, si) => si !== activeSection ? s : {
                            ...s, elements: s.elements.map((elem, j) => {
                              if (elem.type !== "text") return elem;
                              let count = 0;
                              for (let k = 0; k < s.elements.length; k++) {
                                if (s.elements[k].type === "text") {
                                  if (count === ei) return k === j ? { ...elem, content: val } : elem;
                                  count++;
                                }
                              }
                              return elem;
                            }),
                          }));
                        }}
                        rows={el.role === "body" ? 3 : 2}
                        style={{ ...inputStyle, fontSize: 12, resize: "vertical" }} />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* 템플릿 탭 */}
          {sidebarTab === "templates" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>섹션 템플릿</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>타입을 선택하고 템플릿을 클릭하면 현재 섹션이 교체됩니다</div>
              {/* 타입 선택 드롭다운 */}
              <select value={templateTypeFilter} onChange={e => setTemplateTypeFilter(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 700, marginBottom: 12, cursor: "pointer" }}>
                {Object.entries(SECTION_TEMPLATES).map(([type, tmpls]) => (
                  <option key={type} value={type}>{SECTION_TYPE_LABELS?.[type] || type} ({tmpls.length}종)</option>
                ))}
              </select>
              {/* 선택된 타입의 템플릿 목록 — 2열 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(SECTION_TEMPLATES[templateTypeFilter] || []).map((tmpl, ti) => {
                  const titleEl = tmpl.elements?.find(e => e.role === "title");
                  const subtitleEl = tmpl.elements?.find(e => e.role === "subtitle");
                  const bodyEl = tmpl.elements?.find(e => e.role === "body");
                  const bgDark = tmpl.bg_color && (() => { const h = (tmpl.bg_color||"#fff").replace("#",""); return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000<128; })();
                  return (
                    <button key={ti}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          const oldSec = sections[activeSection];
                          const oldEls = oldSec.elements || [];
                          // 기존 텍스트 content를 role 기준으로 보존
                          const mergedElements = (tmpl.elements || []).map(newEl => {
                            if (newEl.type !== "text") return { ...newEl };
                            // 같은 role의 기존 요소에서 content 가져오기
                            const matchByRole = oldEls.find(o => o.type === "text" && o.role === newEl.role && o.content);
                            if (matchByRole) {
                              return { ...newEl, content: matchByRole.content };
                            }
                            // role 매칭 실패 시 같은 타입의 요소 순서대로 매칭
                            return { ...newEl };
                          });
                          // role 매칭 안 된 기존 텍스트 중 content가 있는 것들을 순서대로 채우기
                          const usedRoles = new Set(mergedElements.filter(e => e.type === "text" && oldEls.find(o => o.role === e.role)).map(e => e.role));
                          const leftoverOld = oldEls.filter(o => o.type === "text" && o.content && !usedRoles.has(o.role));
                          let leftoverIdx = 0;
                          const finalElements = mergedElements.map(el => {
                            if (el.type !== "text") return el;
                            // 이미 기존 content가 채워진 경우 스킵
                            const hasOldContent = oldEls.find(o => o.type === "text" && o.role === el.role && o.content);
                            if (hasOldContent) return el;
                            // 남은 기존 텍스트로 채우기
                            if (leftoverIdx < leftoverOld.length) {
                              const old = leftoverOld[leftoverIdx++];
                              return { ...el, content: old.content };
                            }
                            return el;
                          });
                          const newSec = { ...tmpl, id: oldSec.id, image_prompt: tmpl.image_prompt || oldSec.image_prompt, elements: finalElements };
                          setSections(prev => prev.map((s, si) => si === activeSection ? newSec : s));
                        } else {
                          setSections(prev => [...prev, { ...tmpl, id: `sec_tmpl_${Date.now()}` }]);
                          setActiveSection(sections.length);
                        }
                      }}
                      style={{ width: "100%", borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = acc}
                      onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
                      {/* 미리보기 이미지 + 텍스트 */}
                      <div style={{ width: "100%", position: "relative", background: tmpl.bg_color || "#fff", minHeight: 60, maxHeight: 100, overflow: "hidden" }}>
                        {/* Unsplash 샘플 이미지 (섹션 타입별) */}
                        {(() => {
                          const imgMap = {
                            hero: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
                            pain_points: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=200&fit=crop",
                            features: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
                            point: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=200&fit=crop",
                            stats_highlight: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
                            review: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=200&fit=crop",
                            comparison: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
                            guarantee: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
                            cert: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
                            cta: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=200&fit=crop",
                            howto: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop",
                            before_after: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=200&fit=crop",
                            event: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop",
                            faq: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop",
                          };
                          const imgUrl = imgMap[tmpl.type];
                          if (!imgUrl) return null;
                          return (
                            <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                              <img src={imgUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: bgDark ? 0.4 : 0.2 }} />
                            </div>
                          );
                        })()}
                        <div style={{ position: "relative", zIndex: 1, padding: "10px 10px" }}>
                          {subtitleEl && <div style={{ fontSize: 7, fontWeight: 700, color: subtitleEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#999"), letterSpacing: 1, textTransform: "uppercase", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{subtitleEl.content?.slice(0,15)}</div>}
                          {titleEl && <div style={{ fontSize: 11, fontWeight: 900, color: titleEl.color || (bgDark ? "#fff" : "#1a1a2e"), lineHeight: 1.2, marginBottom: 3, textShadow: bgDark ? "0 1px 4px rgba(0,0,0,0.3)" : "none", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{titleEl.content?.slice(0,20)}</div>}
                          {bodyEl && <div style={{ fontSize: 8, color: bodyEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#888"), lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{bodyEl.content?.slice(0,30)}</div>}
                          {!titleEl && !bodyEl && <div style={{ fontSize: 9, color: bgDark ? "rgba(255,255,255,0.3)" : "#ccc" }}>{tmpl.label}</div>}
                        </div>
                      </div>
                      <div style={{ padding: "5px 8px", borderTop: `1px solid ${bdr}`, background: D ? "rgba(0,0,0,0.2)" : "#fafafa" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tmpl.label}</div>
                        <div style={{ fontSize: 7, color: muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tmpl.layout}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: bdr, margin: "12px 0" }} />
              <button onClick={() => {
                const tmpl = (SECTION_TEMPLATES[templateTypeFilter] || [])[0];
                if (tmpl) {
                  setSections(prev => [...prev, { ...tmpl, id: `sec_new_${Date.now()}` }]);
                  setActiveSection(sections.length);
                }
              }}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px dashed ${bdr}`, background: "transparent", color: acc, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + 새 섹션 추가
              </button>
            </div>
          )}

          {/* 도형 탭 */}
          {sidebarTab === "shapes" && activeSection < sections.length && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12 }}>도형 삽입</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>선택한 섹션에 도형을 추가합니다</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { shape: "rect", label: "사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="2" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "rect_round", label: "둥근 사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="8" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "circle", label: "원형", svg: `<circle cx="20" cy="20" r="14" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "ellipse", label: "타원", svg: `<ellipse cx="20" cy="20" rx="16" ry="10" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "triangle", label: "삼각형", svg: `<polygon points="20,4 36,36 4,36" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "diamond", label: "마름모", svg: `<polygon points="20,4 36,20 20,36 4,20" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "star", label: "별", svg: `<polygon points="20,2 24,14 37,14 27,22 31,35 20,27 9,35 13,22 3,14 16,14" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "hexagon", label: "육각형", svg: `<polygon points="20,2 35,10 35,26 20,34 5,26 5,10" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "line_h", label: "가로선", svg: `<line x1="4" y1="20" x2="36" y2="20" stroke="${acc}" stroke-width="3"/>` },
                  { shape: "line_v", label: "세로선", svg: `<line x1="20" y1="4" x2="20" y2="36" stroke="${acc}" stroke-width="3"/>` },
                  { shape: "arrow_r", label: "화살표 →", svg: `<line x1="4" y1="20" x2="32" y2="20" stroke="${acc}" stroke-width="2.5"/><polygon points="28,14 36,20 28,26" fill="${acc}"/>` },
                  { shape: "badge_pill", label: "필", svg: `<rect x="2" y="12" width="36" height="16" rx="8" fill="${acc}" /><text x="20" y="23" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">BADGE</text>` },
                ].map((s, si) => (
                  <button key={si} title={s.label}
                    onClick={() => {
                      const newEl = { type: "shape", shape: s.shape, fill: `${acc}20`, stroke: acc, width: 120, height: 80 };
                      setSections(prev => prev.map((sec, idx) => idx !== activeSection ? sec : {
                        ...sec, elements: [...sec.elements, newEl],
                      }));
                    }}
                    style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: s.svg }} />
                    <span style={{ fontSize: 9, color: muted }}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* 구분선 */}
              <div style={{ height: 1, background: bdr, margin: "16px 0" }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>빠른 삽입</div>
              {[
                { label: "구분선 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "divider", color: acc }] })) },
                { label: "배지 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "badge", content: "NEW", bg: acc, color: "#fff" }] })) },
                { label: "텍스트 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "text", role: "body", content: "새 텍스트를 입력하세요", fontSize: 14, fontWeight: "400", color: "#333" }] })) },
              ].map((item, ii) => (
                <button key={ii} onClick={item.action}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left" }}>
                  + {item.label}
                </button>
              ))}
            </div>
          )}

          {/* 자료 탭 */}
          {sidebarTab === "media" && (
            <div>
              {/* 사진 / 동영상 서브탭 */}
              <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}` }}>
                {[{ key: "photo", label: "사진" }, { key: "video", label: "동영상" }].map(tab => (
                  <button key={tab.key} onClick={() => setMediaSubTab(tab.key)}
                    style={{ flex: 1, padding: "8px", border: "none", background: (mediaSubTab || "photo") === tab.key ? acc : "transparent", color: (mediaSubTab || "photo") === tab.key ? "#fff" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {(mediaSubTab || "photo") === "video" && (
                <div>
                  {/* 스톡 영상 검색 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>무료 영상 검색</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <input placeholder="영상 검색 (예: nature, food)" id="stock-video-search"
                      onKeyDown={e => { if (e.key === "Enter") document.getElementById("stock-video-btn")?.click(); }}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                    <button id="stock-video-btn" onClick={async () => {
                      const q = document.getElementById("stock-video-search")?.value || category || "product";
                      const pixKey = import.meta.env.VITE_PIXABAY_KEY || "";
                      if (!pixKey) return;
                      try {
                        const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pixabay.com/api/videos/?key=${pixKey}&q=${encodeURIComponent(q)}&per_page=8&lang=ko`)}`);
                        const data = await res.json();
                        const videos = (data.hits || []).map(v => ({ id: v.id, thumb: `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`, url: v.videos?.medium?.url || v.videos?.small?.url, tags: v.tags }));
                        setStockImages(prev => videos); // 임시 재활용
                      } catch {}
                    }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      검색
                    </button>
                  </div>
                  {stockImages.length > 0 && stockImages[0]?.url?.includes("video") && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                      {stockImages.map((v, vi) => (
                        <div key={vi} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", position: "relative" }}
                          onClick={() => {
                            if (activeSection < sections.length && v.url) {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: v.url }));
                            }
                          }}>
                          {v.thumb && <img src={v.thumb} alt="" style={{ width: "100%", height: 60, objectFit: "cover" }} />}
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: "#fff", fontSize: 10 }}>▶</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ height: 1, background: bdr, margin: "8px 0 12px" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>직접 추가</div>
                  <button onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file"; input.accept = "video/*";
                    input.onchange = (e) => {
                      const file = e.target.files?.[0];
                      if (file && activeSection < sections.length) {
                        const url = URL.createObjectURL(file);
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: url }));
                      }
                    };
                    input.click();
                  }}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginBottom: 10 }}>
                    + 동영상 파일 업로드
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder="유튜브/영상 URL" id="video-url-input"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                    <button onClick={() => {
                      const url = document.getElementById("video-url-input")?.value;
                      if (url && activeSection < sections.length) {
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: url }));
                      }
                    }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      적용
                    </button>
                  </div>
                  {sections[activeSection]?.videoUrl && (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
                      <div style={{ fontSize: 11, color: text, fontWeight: 600, marginBottom: 4 }}>현재 섹션 동영상</div>
                      <div style={{ fontSize: 10, color: muted, wordBreak: "break-all" }}>{sections[activeSection].videoUrl.slice(0, 60)}...</div>
                      <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: null }))}
                        style={{ marginTop: 6, padding: "4px 10px", borderRadius: 6, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
                        제거
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(mediaSubTab || "photo") === "photo" && (
                <>
              {/* 업로드한 제품 이미지 */}
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>업로드 이미지</div>
              {images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
                  {images.map((img, ii) => (
                    <div key={ii} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", aspectRatio: "1" }}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          setSectionImages(prev => ({ ...prev, [sections[activeSection].id]: { loading: false, url: img.preview, error: null } }));
                        }
                      }}>
                      <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "16px", borderRadius: 10, border: `1px dashed ${bdr}`, textAlign: "center", color: muted, fontSize: 11, marginBottom: 16 }}>
                  업로드된 이미지 없음
                </div>
              )}

              {/* 추가 이미지 업로드 */}
              <button onClick={() => {
                const input = document.createElement("input");
                input.type = "file"; input.accept = "image/*"; input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(async (file) => {
                    const preview = URL.createObjectURL(file);
                    const raw = await fileToBase64(file);
                    const base64 = await resizeImage(raw, 800);
                    setImages(prev => [...prev, { file, preview, base64 }]);
                  });
                };
                input.click();
              }}
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: acc, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
                + 이미지 추가 업로드
              </button>

              <div style={{ height: 1, background: bdr, margin: "0 0 16px" }} />

              {/* 무료 스톡 이미지 검색 */}
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>무료 스톡 이미지</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input placeholder="키워드 검색..." id="stock-search-input"
                  onKeyDown={e => { if (e.key === "Enter") { const q = e.target.value; if (q) fetchStockImages(q); } }}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                <button onClick={() => { const q = document.getElementById("stock-search-input")?.value; if (q) fetchStockImages(q); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  검색
                </button>
              </div>
              {stockImages.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {stockImages.slice(0, 12).map((img, ii) => (
                    <div key={ii} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", aspectRatio: "3/2" }}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          setSectionImages(prev => ({ ...prev, [sections[activeSection].id]: { loading: false, url: img.url, error: null } }));
                        }
                      }}>
                      <img src={img.thumb || img.url} alt={img.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          )}

          {sidebarTab === "color" && (
            <div>
              {/* 현재 섹션 배경 편집 */}
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 14 }}>
                페이지 {activeSection + 1} 배경
              </div>

              {/* 배경색 */}
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 색상</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <input type="color" value={sections[activeSection]?.bg_color || "#ffffff"} onChange={e => {
                  const val = e.target.value;
                  setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: val }));
                }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{sections[activeSection]?.bg_color || "#ffffff"}</span>
              </div>

              {/* 빠른 배경색 선택 */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
                {["#ffffff", "#f8f8f8", "#fafafa", "#1a1a2e", "#111111", "#0d1117",
                  colorPalette?.main, colorPalette?.gradient, colorPalette?.light_bg, colorPalette?.dark_bg,
                  "#fff5f5", "#f0fff4", "#eff6ff", "#fef3c7", "#fdf2f8",
                ].filter(Boolean).map((c, ci) => (
                  <div key={ci} onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: c }))}
                    style={{ width: 24, height: 24, borderRadius: 6, background: c, border: `2px solid ${sections[activeSection]?.bg_color === c ? "#2196F3" : bdr}`, cursor: "pointer" }} />
                ))}
              </div>

              {/* 배경 이미지 */}
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 이미지</div>
              {sections[activeSection]?.bgImage ? (
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <img src={sections[activeSection].bgImage} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${bdr}` }} />
                  <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImage: null }))}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer" }}>x</button>
                </div>
              ) : (
                <label style={{ display: "block", padding: "14px", borderRadius: 10, border: `1.5px dashed ${bdr}`, textAlign: "center", cursor: "pointer", marginBottom: 14, fontSize: 12, color: muted }}>
                  + 배경 이미지 추가
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImage: url }));
                    }
                  }} />
                </label>
              )}
              {sections[activeSection]?.bgImage && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 투명도</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="range" min="10" max="100" step="5" value={sections[activeSection]?.bgImageOpacity ?? 30}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImageOpacity: val }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 30 }}>{sections[activeSection]?.bgImageOpacity ?? 30}%</span>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: bdr, margin: "14px 0" }} />

              {/* 추천 테마 */}
              <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>이런 테마를 추천드립니다</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  { name: "내추럴 크림", main: "#8B7355", gradient: "#A69279", light: "#f9f6f2", dark: "#2c2c2c", desc: "따뜻한 크림톤" },
                  { name: "모던 다크", main: "#c9a961", gradient: "#b8956a", light: "#f5f5f5", dark: "#1a1a2e", desc: "고급 다크+골드" },
                  { name: "클린 화이트", main: colorPalette?.main || "#7c6aff", gradient: colorPalette?.gradient || "#9b8ec4", light: "#ffffff", dark: "#111111", desc: "깔끔한 모노톤" },
                ].map((theme, ti) => (
                  <button key={ti} onClick={() => {
                    const newPalette = { main: theme.main, gradient: theme.gradient, light_bg: theme.light, dark_bg: theme.dark };
                    setColorPalette(newPalette);
                    // 모든 섹션 배경색을 테마에 맞게 자동 조정
                    setSections(prev => prev.map((s, si) => {
                      if (s.type === "hero" || s.type === "cta") return { ...s, bg_color: theme.dark };
                      if (s.type === "stats_highlight") return { ...s, bg_color: theme.dark };
                      if (s.type === "pain_points") return { ...s, bg_color: theme.dark };
                      if (si % 3 === 0) return { ...s, bg_color: theme.light };
                      if (si % 3 === 1) return { ...s, bg_color: "#fff" };
                      return { ...s, bg_color: theme.light };
                    }));
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      {[theme.main, theme.gradient, theme.light, theme.dark].map((c, ci) => (
                        <div key={ci} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: `1px solid ${bdr}` }} />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text }}>{theme.name}</div>
                      <div style={{ fontSize: 9, color: muted }}>{theme.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: bdr, margin: "0 0 14px" }} />

              {/* 전체 색상 팔레트 */}
              {colorPalette && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>현재 팔레트</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {[
                      { label: "메인", color: colorPalette.main },
                      { label: "서브", color: colorPalette.gradient },
                      { label: "밝은", color: colorPalette.light_bg },
                      { label: "어두운", color: colorPalette.dark_bg },
                    ].map(c => (
                      <div key={c.label} onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: c.color }))}
                        style={{ textAlign: "center", cursor: "pointer", padding: 6, borderRadius: 8, border: `1px solid ${bdr}` }}>
                        <div style={{ width: "100%", height: 28, borderRadius: 6, background: c.color, border: `1px solid ${bdr}` }} />
                        <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div style={{ flex: 1, overflowY: "auto", background: D ? "rgba(0,0,0,0.15)" : "#e5e5e5", padding: "20px", position: "relative" }}>
        {/* 사이드바 접힌 상태 → 열기 버튼 */}
        {sidebarCollapsed && (
          <button onClick={() => setSidebarCollapsed(false)} title="패널 열기"
            style={{ position: "fixed", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 30, width: 32, height: 32, borderRadius: "50%", border: `1px solid ${bdr}`, background: D ? "#1a1a2e" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 14, color: muted }}>
            ☰
          </button>
        )}
        {/* 상단 액션 바 */}
        <div style={{ maxWidth: 891, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: isMobile ? 11 : 12, color: muted }}>{sections.length}개 섹션 · {Object.values(sectionImages).filter(v => v?.url).length}개 이미지 생성됨</span>
          <div style={{ display: "flex", gap: isMobile ? 4 : 8 }}>
            <button onClick={generateAllImages}
              style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", border: "none", fontSize: isMobile ? 10 : 11, fontWeight: 700, cursor: "pointer" }}>
              ✦ 전체 AI 이미지 생성
            </button>
            <button onClick={() => setPhase("input")}
              style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: "transparent", color: muted, border: `1px solid ${bdr}`, fontSize: isMobile ? 10 : 11, cursor: "pointer" }}>
              ← 다시 입력
            </button>
          </div>
        </div>
        {/* 텍스트 요소 선택 시 플로팅 편집 툴바 */}
        {selectedEl && selectedEl.el?._type === "text" && (() => {
          const currentSize = selectedEl.el.fontSize || 16;
          const changeFontSize = (delta) => {
            const secIdx = selectedEl.secIdx;
            const elIdx = selectedEl.elIdx;
            setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
              ...s,
              elements: s.elements.map((el, ei) => ei !== elIdx ? el : {
                ...el,
                fontSize: (el.fontSize || 16) + delta
              })
            }));
            setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, fontSize: (prev.el.fontSize || 16) + delta } } : prev);
          };
          const deleteSelectedElement = () => {
            setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
              ...s,
              elements: s.elements.filter((_, ei) => ei !== selectedEl.elIdx)
            }));
            setSelectedEl(null);
          };
          const toolBtnStyle = { background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", padding: "4px 10px", borderRadius: 4, transition: "background 0.15s" };
          return (
            <div style={{ maxWidth: 891, margin: "0 auto 8px", display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: D ? "#1a1a2e" : "#2a2a3e", borderRadius: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginRight: 4 }}>텍스트</span>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
              <button onClick={() => changeFontSize(-2)} style={toolBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>A-</button>
              <span style={{ color: "#fff", fontSize: 12, minWidth: 32, textAlign: "center" }}>{currentSize}px</span>
              <button onClick={() => changeFontSize(2)} style={toolBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>A+</button>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
              <button onClick={() => {
                const secIdx = selectedEl.secIdx;
                const elIdx = selectedEl.elIdx;
                setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
                  ...s,
                  elements: s.elements.map((el, ei) => ei !== elIdx ? el : {
                    ...el,
                    fontWeight: (el.fontWeight === "700" || el.fontWeight === 700 || el.fontWeight === "900" || el.fontWeight === 900) ? "400" : "700"
                  })
                }));
              }} style={{ ...toolBtnStyle, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>B</button>
              <div style={{ flex: 1 }} />
              <button onClick={deleteSelectedElement} style={{ ...toolBtnStyle, color: "#ff6b6b" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,107,0.15)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>삭제</button>
            </div>
          );
        })()}

        <div onClick={() => setSelectedEl(null)} style={{ maxWidth: 891, margin: "0 auto", transform: `scale(${canvasZoom/100})`, transformOrigin: "top center", transition: "transform 0.2s", position: "relative" }}>
          {/* 정렬 스냅 가이드라인 — 캔버스 중앙 기준 */}
          {snapGuide?.x && <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "#2196F3", zIndex: 100, pointerEvents: "none", opacity: 0.7 }} />}
          {snapGuide?.x && <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 1px)", width: 3, background: "rgba(33,150,243,0.15)", zIndex: 99, pointerEvents: "none" }} />}
          {sections.map((sec, i) => (
            <div key={sec.id}
              onClick={() => setActiveSection(i)}
              style={{
                position: "relative", marginBottom: 0,
                border: activeSection === i ? `2px solid ${acc}` : "2px solid transparent",
                borderRadius: 0, cursor: "pointer",
                overflow: "hidden",
                background: sec.bg_color?.startsWith("linear-gradient") ? sec.bg_color : (sec.bg_color || "#ffffff"),
              }}>
              {/* 배경 이미지 레이어 */}
              {sec.bgImage && (
                <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                  <img src={sec.bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: (sec.bgImageOpacity ?? 30) / 100 }} />
                </div>
              )}
              {/* 섹션 렌더링 — SectionDispatcher */}
              {renderSection({
                i, sec, sections, setSections, selectedEl, setSelectedEl,
                sectionImages, setSectionImages, images, colorPalette,
                acc, D, bdr, muted, text, canvasZoom, activeSection, isMobile,
                dragRef, generateSectionImage, productName, extraInfo,
              })}
              {/* 도형 오버레이 렌더링 */}
              {(() => {
                const els = sec.elements || [];
                const shapeEls = els.filter(e => e.type === "shape");
                if (shapeEls.length === 0) return null;
                const mainColor = colorPalette?.main || acc;
                return shapeEls.map((sh, si) => {
                  const shIdx = els.indexOf(sh);
                  const shSelected = selectedEl?.secIdx === i && selectedEl?.elIdx === shIdx;
                  const w = sh.width || 120, h = sh.height || 80;
                  const svgMap = {
                    rect: `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    rect_round: `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="12" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    circle: `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    ellipse: `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-4}" ry="${h/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    line_h: `<line x1="4" y1="${h/2}" x2="${w-4}" y2="${h/2}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                    line_v: `<line x1="${w/2}" y1="4" x2="${w/2}" y2="${h-4}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                    badge_pill: `<rect x="2" y="${h/2-12}" width="${w-4}" height="24" rx="12" fill="${sh.stroke||mainColor}"/>`,
                  };
                  svgMap.triangle = `<polygon points="${w/2},4 ${w-4},${h-4} 4,${h-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.diamond = `<polygon points="${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.star = `<polygon points="${w/2},4 ${w*0.62},${h*0.38} ${w-4},${h*0.38} ${w*0.68},${h*0.58} ${w*0.8},${h-4} ${w/2},${h*0.72} ${w*0.2},${h-4} ${w*0.32},${h*0.58} 4,${h*0.38} ${w*0.38},${h*0.38}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.hexagon = `<polygon points="${w/2},4 ${w-4},${h*0.28} ${w-4},${h*0.72} ${w/2},${h-4} 4,${h*0.72} 4,${h*0.28}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.arrow_r = `<line x1="4" y1="${h/2}" x2="${w-12}" y2="${h/2}" stroke="${sh.stroke||mainColor}" stroke-width="2.5"/><polygon points="${w-16},${h/2-6} ${w-4},${h/2} ${w-16},${h/2+6}" fill="${sh.stroke||mainColor}"/>`;
                  return (
                    <div key={`shape-${si}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: shIdx, el: { ...sh, _type: "shape" } }); }}
                      style={{ position: "absolute", zIndex: 10, left: sh.offsetX || 20, top: sh.offsetY || 20, width: w, height: h, cursor: shSelected ? "move" : "pointer", border: shSelected ? "2px solid #2196F3" : "2px solid transparent", borderRadius: 4 }}>
                      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} dangerouslySetInnerHTML={{ __html: svgMap[sh.shape] || svgMap.rect }} />
                    </div>
                  );
                });
              })()}

              {/* 페이지 컨트롤 (활성 시) */}
              {activeSection === i && (
                <div style={{
                  position: "absolute", top: 8, right: -44, display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {[
                    { icon: "✦", label: "AI로 수정", action: () => {} },
                    { icon: "▲", label: "위로", action: () => { if (i > 0) setSections(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); setActiveSection(i-1); } },
                    { icon: "▼", label: "아래로", action: () => { if (i < sections.length-1) setSections(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); setActiveSection(i+1); } },
                    { icon: "⧉", label: "복제", action: () => { setSections(prev => [...prev.slice(0,i+1), { ...sec, id: `sec_dup_${Date.now()}` }, ...prev.slice(i+1)]); setActiveSection(i+1); } },
                    { icon: "+", label: "추가", action: () => { const n = { id:`sec_add_${Date.now()}`, type:"point", bg_color:"#ffffff", elements:[{type:"text",role:"title",content:"새 섹션",fontSize:36,fontWeight:"900",color:"#1a1a2e"}] }; setSections(prev=>[...prev.slice(0,i+1),n,...prev.slice(i+1)]); setActiveSection(i+1); } },
                    { icon: "×", label: "삭제", action: () => { if (sections.length <= 1) return; setSections(prev => prev.filter((_,j) => j !== i)); setActiveSection(Math.max(0, i-1)); } },
                  ].map((ctrl, ci) => (
                    <button key={ci} onClick={e => { e.stopPropagation(); ctrl.action(); }}
                      title={ctrl.label}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`,
                        background: D ? "rgba(0,0,0,0.6)" : "#fff", color: text,
                        fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }}>
                      {ctrl.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 줌 컨트롤 */}
        <div style={{ position: "sticky", bottom: 12, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 20, background: D ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.95)", border: `1px solid ${bdr}`, boxShadow: "0 2px 12px rgba(0,0,0,0.1)", pointerEvents: "auto" }}>
            <button onClick={() => setCanvasZoom(z => Math.max(30, z - 10))} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ fontSize: 11, fontWeight: 700, color: text, minWidth: 36, textAlign: "center" }}>{canvasZoom}%</span>
            <button onClick={() => setCanvasZoom(z => Math.min(150, z + 10))} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <div style={{ width: 1, height: 16, background: bdr, margin: "0 4px" }} />
            <button onClick={() => setCanvasZoom(100)} style={{ padding: "2px 8px", borderRadius: 6, border: "none", background: canvasZoom === 100 ? `${acc}20` : "transparent", color: canvasZoom === 100 ? acc : muted, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>맞춤</button>
          </div>
        </div>
      </div>

      {/* 오른쪽 AI 패널 */}
      <div style={{ width: isMobile ? 0 : 300, borderLeft: isMobile ? "none" : `1px solid ${bdr}`, display: isMobile ? "none" : "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* 파이프라인 결과 요약 */}
        <div style={{ padding: "16px", borderBottom: `1px solid ${bdr}` }}>
          {PIPELINE_STEPS.map((step, i) => {
            if (i === 0) return (
              <div key={step.id} style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 14, fontSize: 12, color: text, fontWeight: 600, cursor: "pointer" }}>
                입력한 정보
              </div>
            );
            return (
              <div key={step.id}>
                <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                  <div style={{ width: 2, height: 10, background: bdr }} />
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>&#10003;</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, padding: "1px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>완료됨</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI 에이전트 채팅 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ 수정도우미
          </div>

          {/* 빠른 프롬프트 */}
          {agentMessages.length === 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>빠른 명령 (클릭하면 실행)</div>
              {[
                { label: "선택한 텍스트를 더 설득력 있게", prompt: "선택한 텍스트를 더 짧고 설득력 있게 다듬어줘" },
                { label: "카피라이팅 개선", prompt: "이 섹션의 카피라이팅을 더 신뢰도 있게 수정해줘" },
                { label: "톤앤매너 변경", prompt: "이 섹션의 톤앤매너를 더 따뜻하고 친근하게 바꿔줘" },
                { label: "전체 텍스트 축약", prompt: "이 섹션의 모든 텍스트를 30% 더 짧게 줄여줘" },
              ].map((item, qi) => (
                <button key={qi} onClick={() => { setAgentInput(item.prompt); handleAgentSend(item.prompt); }}
                  style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.04)" : "#fff", marginBottom: 4, fontSize: 11, color: text, cursor: "pointer", textAlign: "left" }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* 메시지 목록 */}
          <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
            {agentMessages.map((msg, mi) => (
              <div key={mi} style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: msg.role === "user" ? `${acc}15` : (D ? "rgba(255,255,255,0.04)" : "#f8f8f8"), border: `1px solid ${msg.role === "user" ? acc + "30" : bdr}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: msg.role === "user" ? acc : muted, marginBottom: 4 }}>{msg.role === "user" ? "나" : "수정도우미"}</div>
                <div style={{ fontSize: 12, color: text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
              </div>
            ))}
            {agentLoading && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
                <div style={{ fontSize: 11, color: acc, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  AI가 수정하고 있어요...
                </div>
              </div>
            )}
          </div>

          {/* 입력 */}
          <div style={{ position: "relative" }}>
            <input value={agentInput} onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && agentInput.trim()) handleAgentSend(agentInput); }}
              placeholder="AI에게 요청하세요..."
              disabled={agentLoading}
              style={{ ...inputStyle, paddingRight: 40, fontSize: 12 }} />
            <button onClick={() => { if (agentInput.trim()) handleAgentSend(agentInput); }}
              disabled={agentLoading || !agentInput.trim()}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: agentInput.trim() ? acc : muted, fontSize: 16, cursor: agentInput.trim() ? "pointer" : "default" }}>
              ➤
            </button>
          </div>
        </div>

        {/* 하단: 다운로드/저장 */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            수동 저장
          </button>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: acc, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            다운로드
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}
