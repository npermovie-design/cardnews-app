import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
// aiClient import 제거 — Gemini 직접 호출로 통일
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useI18n } from "./i18n.jsx";
import { SECTION_TEMPLATES, SECTION_TYPE_LABELS } from "./detailTemplates.js";

/* ══════════════════════════════════════════════════════════════
   DetailPageStudio — Hookable 스타일 상세페이지 생성기
   Phase 1: 입력 폼 + AI 파이프라인
   Phase 2: 멀티페이지 라이브 캔버스 에디터
══════════════════════════════════════════════════════════════ */

// ── 카테고리 ─────────────────────────────────────────────────
const CATEGORIES = [
  { key: "food", label: "식품류" },
  { key: "farm", label: "농수산물" },
  { key: "tech", label: "가전/디지털" },
  { key: "living", label: "생활용품/리빙" },
  { key: "fashion", label: "의류/패션" },
  { key: "beauty", label: "화장품/뷰티" },
  { key: "health", label: "건강기능식품" },
  { key: "education", label: "지식서비스/교육" },
  { key: "pet", label: "반려동물" },
  { key: "kids", label: "유아/아동" },
];

// ── 섹션 타입 (20종 — 이전 Canvas 엔진 참고 확장) ────────────
const SECTION_TYPES = [
  { id: "hero", label: "히어로", desc: "메인 타이틀 + 제품 이미지" },
  { id: "pain_points", label: "고민/공감", desc: "타겟 고민 나열" },
  { id: "review", label: "고객 후기", desc: "실제 후기/별점" },
  { id: "concept", label: "컨셉 중간", desc: "브랜드 스토리/감성" },
  { id: "features", label: "특장점 목록", desc: "핵심 장점 나열" },
  { id: "point", label: "포인트", desc: "상세 설명 포인트" },
  { id: "stats_highlight", label: "숫자 강조", desc: "핵심 수치 통계" },
  { id: "process_steps", label: "진행 과정", desc: "타임라인 스텝" },
  { id: "comparison", label: "비교표", desc: "Before vs After 비교" },
  { id: "before_after", label: "변화/결과", desc: "전후 대비" },
  { id: "pricing", label: "가격표", desc: "티어별 가격" },
  { id: "faq", label: "자주 묻는 질문", desc: "Q&A 리스트" },
  { id: "cert", label: "인증", desc: "인증/수상/자격" },
  { id: "facility", label: "시설", desc: "생산시설/환경" },
  { id: "shipping", label: "배송 방법", desc: "배송/포장 안내" },
  { id: "info", label: "정보", desc: "구매 전 확인사항" },
  { id: "contact", label: "연락처", desc: "고객센터/문의" },
  { id: "event", label: "이벤트", desc: "프로모션/할인" },
  { id: "guarantee", label: "보증/신뢰", desc: "환불 보증" },
  { id: "cta", label: "구매 유도", desc: "CTA/주문 버튼" },
  { id: "ai_notice", label: "AI 콘텐츠 고지", desc: "AI 생성 안내" },
];

// ── AI 파이프라인 단계 ─────────────────────────────────────
const PIPELINE_STEPS = [
  { id: "input", label: "입력한 정보" },
  { id: "image", label: "이미지 분석" },
  { id: "tone", label: "톤앤매너 추출" },
  { id: "layout", label: "레이아웃 디자인" },
  { id: "content", label: "콘텐츠 제작" },
];

// ── 유틸 ──────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl, maxW = 384) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = dataUrl;
  });
}

// ══════════════════════════════════════════════════════════════
//  메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DetailPageStudio({ isDark, theme, user, showPointConfirm, C }) {
  const { t, lang } = useI18n();
  const ko = lang === "ko";
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

  // 에디터 진입 시 스톡 이미지 자동 채우기
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
- 이모지 절대 사용 금지
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
        throw new Error(err.error || `생성 실패 (${geminiRes.status})`);
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
흐름: 기능 설득 → 신뢰 확보 → 구매 유도. 디자인 톤:${seed.tone}. 색상:${seed.palette}. JSON배열만 출력.`;
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
      <div style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, borderRight: sidebarCollapsed ? "none" : `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", transition: "width 0.2s, min-width 0.2s", overflow: "hidden", position: "relative" }}>
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
              {/* 선택된 타입의 템플릿 목록 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(SECTION_TEMPLATES[templateTypeFilter] || []).map((tmpl, ti) => {
                  const titleEl = tmpl.elements?.find(e => e.role === "title");
                  const subtitleEl = tmpl.elements?.find(e => e.role === "subtitle");
                  const bodyEl = tmpl.elements?.find(e => e.role === "body");
                  const bgDark = tmpl.bg_color && (() => { const h = (tmpl.bg_color||"#fff").replace("#",""); return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000<128; })();
                  return (
                    <button key={ti}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          const newSec = { ...tmpl, id: sections[activeSection].id, image_prompt: tmpl.image_prompt || sections[activeSection].image_prompt };
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
                      <div style={{ width: "100%", position: "relative", background: tmpl.bg_color || "#fff", minHeight: 100, overflow: "hidden" }}>
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
                        <div style={{ position: "relative", zIndex: 1, padding: "20px 16px" }}>
                          {subtitleEl && <div style={{ fontSize: 8, fontWeight: 700, color: subtitleEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#999"), letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{subtitleEl.content?.slice(0,20)}</div>}
                          {titleEl && <div style={{ fontSize: 14, fontWeight: 900, color: titleEl.color || (bgDark ? "#fff" : "#1a1a2e"), lineHeight: 1.3, marginBottom: 6, textShadow: bgDark ? "0 1px 4px rgba(0,0,0,0.3)" : "none" }}>{titleEl.content?.slice(0,25)}</div>}
                          {bodyEl && <div style={{ fontSize: 9, color: bodyEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#888"), lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{bodyEl.content?.slice(0,60)}</div>}
                          {!titleEl && !bodyEl && <div style={{ fontSize: 10, color: bgDark ? "rgba(255,255,255,0.3)" : "#ccc" }}>{tmpl.label}</div>}
                        </div>
                      </div>
                      <div style={{ padding: "8px 12px", borderTop: `1px solid ${bdr}`, background: D ? "rgba(0,0,0,0.2)" : "#fafafa" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: text }}>{tmpl.label}</div>
                        <div style={{ fontSize: 8, color: muted }}>{tmpl.layout} / {tmpl.preview?.slice(0,30)}</div>
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
        {/* 인라인 툴바 제거 — 좌측 속성 패널로 통합됨 */}

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
              {/* 섹션 렌더링 — 한국 쇼핑몰 스타일 템플릿 */}
              {(() => {
                const secType = sec.type || "point";
                const layout = sec.layout || "centered_text";
                const secImg = sectionImages[sec.id];
                const heroImgSrc = images.length > 0 ? images[0].preview : null;
                const aiImgSrc = secImg?.url || null;
                const els = sec.elements || [];
                // 3자리 hex → 6자리 변환
                const normHex = (c) => { if (!c || !c.startsWith("#")) return c || "#ffffff"; const h = c.slice(1); if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`; return c; };
                const bgCol = normHex(sec.bg_color) || "#ffffff";
                // linear-gradient 지원: 첫 번째 색상 추출
                const firstHex = bgCol.startsWith("linear-gradient") ? normHex((bgCol.match(/#[0-9a-fA-F]{3,8}/) || ["#ffffff"])[0]) : bgCol;
                const hexClean = (firstHex || "#ffffff").replace("#", "");
                const bgR = parseInt(hexClean.slice(0, 2), 16) || 255;
                const bgG = parseInt(hexClean.slice(2, 4), 16) || 255;
                const bgB = parseInt(hexClean.slice(4, 6), 16) || 255;
                const isDarkBg = (bgR * 299 + bgG * 587 + bgB * 114) / 1000 < 128;
                // 제품 이미지 자동 분배 — 중복 최소화
                const imgLayouts = ["full_image", "text_over_image", "left_image_right_text", "right_image_left_text"];
                const needsImage = imgLayouts.includes(layout) || secType === "hero" || secType === "before_after";
                let productImgForSection = null;
                if (needsImage && images.length > 0) {
                  if (images.length >= 2) {
                    // 2장 이상이면 순환 배치
                    productImgForSection = images[i % images.length]?.preview || null;
                  } else {
                    // 1장이면 hero + 첫 point에만 배치
                    const imgSectionCount = sections.filter((s, si) => si < i && (imgLayouts.includes(s.layout) || s.type === "hero")).length;
                    if (secType === "hero" || imgSectionCount < 1) {
                      productImgForSection = images[0]?.preview || null;
                    }
                  }
                }
                const mainColor = colorPalette?.main || acc;
                const dv = sec.designVariant || 0; // 디자인 변형 0~5

                // 요소 찾기 헬퍼
                const findEls = (role) => els.filter(e => e.role === role);
                const findEl = (role) => els.find(e => e.role === role);

                // contentEditable onBlur 핸들러
                const onBlurHandler = (ei) => (e) => {
                  const val = e.currentTarget.textContent;
                  setSections(prev => prev.map((s, si) => si !== i ? s : {
                    ...s, elements: s.elements.map((elem, j) => j === ei ? { ...elem, content: val } : elem),
                  }));
                };
                const onBlurByRef = (elRef) => (e) => {
                  const val = e.currentTarget.textContent;
                  const idx = els.indexOf(elRef);
                  if (idx < 0) return;
                  setSections(prev => prev.map((s, si) => si !== i ? s : {
                    ...s, elements: s.elements.map((elem, j) => j === idx ? { ...elem, content: val } : elem),
                  }));
                };

                // 공통 editable props — 클릭 시 선택 + 파란 핸들 시스템
                const elIdx = (el) => els.indexOf(el);
                const isSelected = (el) => selectedEl?.secIdx === i && selectedEl?.elIdx === elIdx(el);

                // 파란 핸들 8포인트 래퍼
                const HANDLE_SIZE = 8;
                const HANDLE_COLOR = "#2196F3";
                const handlePositions = [
                  { cursor: "nw-resize", top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
                  { cursor: "n-resize", top: -HANDLE_SIZE/2, left: "50%", ml: -HANDLE_SIZE/2 },
                  { cursor: "ne-resize", top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
                  { cursor: "w-resize", top: "50%", left: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
                  { cursor: "e-resize", top: "50%", right: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
                  { cursor: "sw-resize", bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
                  { cursor: "s-resize", bottom: -HANDLE_SIZE/2, left: "50%", ml: -HANDLE_SIZE/2 },
                  { cursor: "se-resize", bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
                ];
                const renderHandles = () => (
                  <>
                    {handlePositions.map((h, hi) => (
                      <div key={hi} style={{
                        position: "absolute", width: HANDLE_SIZE, height: HANDLE_SIZE,
                        background: "#fff", border: `2px solid ${HANDLE_COLOR}`, borderRadius: 1,
                        cursor: h.cursor, zIndex: 10,
                        top: h.top, left: h.left, right: h.right, bottom: h.bottom,
                        marginLeft: h.ml || 0, marginTop: h.mt || 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }} onMouseDown={e => e.stopPropagation()} />
                    ))}
                    {/* 회전 핸들 */}
                    <div style={{
                      position: "absolute", top: -28, left: "50%", marginLeft: -6,
                      width: 12, height: 12, borderRadius: "50%",
                      background: "#fff", border: `2px solid ${HANDLE_COLOR}`,
                      cursor: "grab", zIndex: 10,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} onMouseDown={e => e.stopPropagation()} />
                    <div style={{
                      position: "absolute", top: -16, left: "50%",
                      width: 1, height: 16, background: HANDLE_COLOR, zIndex: 9,
                    }} />
                  </>
                );

                const editable = (el) => {
                  const selected = isSelected(el);
                  const rawStyle = {
                    outline: "none", cursor: selected ? "move" : "text",
                    position: "relative",
                    borderRadius: 8,
                    padding: selected ? "6px 10px" : "2px 4px",
                    border: selected ? `2px solid #2196F3` : "2px solid transparent",
                    boxShadow: selected ? "0 0 0 3px rgba(33,150,243,0.15), 0 2px 8px rgba(33,150,243,0.1)" : "none",
                    background: selected ? (isDarkBg ? "rgba(33,150,243,0.08)" : "rgba(33,150,243,0.04)") : undefined,
                    transition: "border 0.15s, box-shadow 0.15s, background 0.15s, padding 0.15s",
                    textShadow: el.textShadow || undefined,
                    textAlign: el.textAlign || "center",
                    fontFamily: el.fontFamily || undefined,
                    fontSize: el.fontSize ? el.fontSize : undefined,
                    fontWeight: el.fontWeight || undefined,
                    lineHeight: el.lineHeight || undefined,
                    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                    marginTop: el.offsetY ? `${el.offsetY}px` : undefined,
                    marginLeft: el.offsetX ? `${el.offsetX}px` : undefined,
                    ...(el.bgBox ? { background: el.bgBoxColor || (isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"), padding: "8px 14px", borderRadius: el.bgBoxRadius ?? 8 } : {}),
                  };
                  // undefined 값 제거 → 섹션 기본값이 살아남도록
                  const style = Object.fromEntries(Object.entries(rawStyle).filter(([_, v]) => v !== undefined));
                  return {
                    contentEditable: true,
                    suppressContentEditableWarning: true,
                    onBlur: onBlurByRef(el),
                    onClick: (e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: elIdx(el), el: { ...el, _type: "text" } }); },
                    onMouseDown: selected ? (e) => {
                      if (e.target.closest("[data-handle]")) return;
                      dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: el.offsetX || 0, origY: el.offsetY || 0 };
                    } : undefined,
                    style,
                  };
                };
                // 섹션 기본 스타일 + 사용자 편집값 병합 + 가독성 자동 보정
                const eS = (el, defaults) => {
                  const merged = { wordBreak: "keep-all", ...defaults, ...editable(el).style };
                  // 가독성 보정: 밝은 배경에 흰 글씨 / 어두운 배경에 검은 글씨 방지
                  const c = (merged.color || "").toLowerCase();
                  if (!isDarkBg && (c === "#fff" || c === "#ffffff" || c === "white")) {
                    merged.color = (merged.fontWeight === "900" || merged.fontWeight === 900) ? "#1a1a1a" : "#333";
                  }
                  if (isDarkBg && (c === "#1a1a1a" || c === "#1a1a2e" || c === "#111" || c === "#333" || c === "#000" || c === "#2c2c2c")) {
                    merged.color = (merged.fontWeight === "900" || merged.fontWeight === 900) ? "#fff" : "rgba(255,255,255,0.85)";
                  }
                  return merged;
                };

                // 이미지 교체+AI 생성 버튼 헬퍼 (모든 섹션에서 사용)
                const imgButtons = (pos = { top: 12, right: 12 }) => (
                  <>
                    <div style={{ position: "absolute", ...pos, zIndex: 3, display: "flex", gap: 4 }}>
                      <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                        style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        교체
                      </label>
                      {sec.image_prompt && (
                        <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                          style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          AI 생성
                        </button>
                      )}
                    </div>
                    <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                  </>
                );

                // 도형(shape) 렌더링 — 섹션 위에 오버레이
                const renderShapes = () => {
                  const shapes = els.filter(e => e.type === "shape");
                  if (shapes.length === 0) return null;
                  return shapes.map((sh, si) => {
                    const shIdx = els.indexOf(sh);
                    const shSelected = selectedEl?.secIdx === i && selectedEl?.elIdx === shIdx;
                    const svgMap = {
                      rect: `<rect x="2" y="2" width="${(sh.width||120)-4}" height="${(sh.height||80)-4}" rx="2" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      rect_round: `<rect x="2" y="2" width="${(sh.width||120)-4}" height="${(sh.height||80)-4}" rx="12" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      circle: `<circle cx="${(sh.width||120)/2}" cy="${(sh.height||80)/2}" r="${Math.min(sh.width||120,sh.height||80)/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      ellipse: `<ellipse cx="${(sh.width||120)/2}" cy="${(sh.height||80)/2}" rx="${(sh.width||120)/2-4}" ry="${(sh.height||80)/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      triangle: `<polygon points="${(sh.width||120)/2},4 ${(sh.width||120)-4},${(sh.height||80)-4} 4,${(sh.height||80)-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      diamond: `<polygon points="${(sh.width||120)/2},4 ${(sh.width||120)-4},${(sh.height||80)/2} ${(sh.width||120)/2},${(sh.height||80)-4} 4,${(sh.height||80)/2}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      star: `<polygon points="${(sh.width||120)/2},4 ${(sh.width||120)*0.62},${(sh.height||80)*0.38} ${(sh.width||120)-4},${(sh.height||80)*0.38} ${(sh.width||120)*0.68},${(sh.height||80)*0.58} ${(sh.width||120)*0.8},${(sh.height||80)-4} ${(sh.width||120)/2},${(sh.height||80)*0.72} ${(sh.width||120)*0.2},${(sh.height||80)-4} ${(sh.width||120)*0.32},${(sh.height||80)*0.58} 4,${(sh.height||80)*0.38} ${(sh.width||120)*0.38},${(sh.height||80)*0.38}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      hexagon: `<polygon points="${(sh.width||120)/2},4 ${(sh.width||120)-4},${(sh.height||80)*0.28} ${(sh.width||120)-4},${(sh.height||80)*0.72} ${(sh.width||120)/2},${(sh.height||80)-4} 4,${(sh.height||80)*0.72} 4,${(sh.height||80)*0.28}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                      line_h: `<line x1="4" y1="${(sh.height||80)/2}" x2="${(sh.width||120)-4}" y2="${(sh.height||80)/2}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                      line_v: `<line x1="${(sh.width||120)/2}" y1="4" x2="${(sh.width||120)/2}" y2="${(sh.height||80)-4}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                      arrow_r: `<line x1="4" y1="${(sh.height||80)/2}" x2="${(sh.width||120)-12}" y2="${(sh.height||80)/2}" stroke="${sh.stroke||mainColor}" stroke-width="2.5"/><polygon points="${(sh.width||120)-16},${(sh.height||80)/2-6} ${(sh.width||120)-4},${(sh.height||80)/2} ${(sh.width||120)-16},${(sh.height||80)/2+6}" fill="${sh.stroke||mainColor}"/>`,
                      badge_pill: `<rect x="2" y="${(sh.height||80)/2-12}" width="${(sh.width||120)-4}" height="24" rx="12" fill="${sh.stroke||mainColor}"/><text x="${(sh.width||120)/2}" y="${(sh.height||80)/2+4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">BADGE</text>`,
                    };
                    return (
                      <div key={`shape-${si}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: shIdx, el: { ...sh, _type: "shape" } }); }}
                        onMouseDown={shSelected ? (e) => {
                          if (e.target.closest("[data-handle]")) return;
                          e.stopPropagation(); e.preventDefault();
                          dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: sh.offsetX || 0, origY: sh.offsetY || 0, isShape: true, shapeIdx: shIdx };
                        } : undefined}
                        style={{
                          position: "absolute", zIndex: 10,
                          left: sh.offsetX || 20, top: sh.offsetY || 20,
                          width: sh.width || 120, height: sh.height || 80,
                          cursor: shSelected ? "move" : "pointer",
                          border: shSelected ? "2px solid #2196F3" : "2px solid transparent",
                          borderRadius: 4,
                        }}>
                        {shSelected && renderHandles()}
                        <svg width={sh.width || 120} height={sh.height || 80} viewBox={`0 0 ${sh.width||120} ${sh.height||80}`}
                          dangerouslySetInnerHTML={{ __html: svgMap[sh.shape] || svgMap.rect }} />
                      </div>
                    );
                  });
                };

                // 선택된 요소 래퍼 (파란 핸들 표시 + 드래그 이동)
                const SelectionWrap = ({ el, children, style = {} }) => {
                  const selected = isSelected(el);
                  return (
                    <div
                      onMouseDown={selected ? (e) => {
                        if (e.target.closest("[data-handle]")) return;
                        e.stopPropagation(); e.preventDefault();
                        dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: el.offsetX || 0, origY: el.offsetY || 0 };
                      } : undefined}
                      style={{ position: "relative", ...style, border: selected ? `2px solid ${HANDLE_COLOR}` : "2px solid transparent", borderRadius: selected ? 2 : 0, transition: "border 0.1s", cursor: selected ? "move" : "default" }}>
                      {selected && renderHandles()}
                      {children}
                    </div>
                  );
                };

                // 이미지 요소 클릭 핸들러
                const onImageClick = (el) => (e) => {
                  e.stopPropagation();
                  setSelectedEl({ secIdx: i, elIdx: elIdx(el), el: { ...el, _type: "image" } });
                };

                // 장식적 라인 (섹션 제목 위/아래)
                const decoLine = (color, width = 40) => {
                  if (sec._hideDecoLine) return null;
                  return (
                    <div onClick={e => { e.stopPropagation(); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, _hideDecoLine: true })); }}
                      title="클릭하여 제거" style={{ width, height: 2, background: color || mainColor, margin: "0 auto 16px", borderRadius: 1, cursor: "pointer", transition: "opacity 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.4"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
                  );
                };
                const decoLineLong = (color) => {
                  if (sec._hideDecoLine) return null;
                  const lineColor = color || (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
                  const decoVariant = dv % 3;
                  const commonProps = {
                    onClick: e => { e.stopPropagation(); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, _hideDecoLine: true })); },
                    title: "클릭하여 제거",
                    onMouseEnter: e => e.currentTarget.style.opacity = "0.4",
                    onMouseLeave: e => e.currentTarget.style.opacity = "1",
                    style: { cursor: "pointer", transition: "opacity 0.15s" },
                  };
                  if (decoVariant === 1) {
                    // 도트 구분선
                    return (
                      <div {...commonProps} style={{ ...commonProps.style, display: "flex", gap: 6, justifyContent: "center", margin: "0 auto 24px" }}>
                        {Array.from({ length: 5 }, (_, di) => (
                          <div key={di} style={{ width: di === 2 ? 8 : 4, height: di === 2 ? 8 : 4, borderRadius: "50%", background: di === 2 ? mainColor : lineColor }} />
                        ))}
                      </div>
                    );
                  }
                  if (decoVariant === 2) {
                    // 웨이브 구분선
                    return (
                      <div {...commonProps} style={{ ...commonProps.style, margin: "0 auto 24px", textAlign: "center" }}>
                        <svg width="80" height="12" viewBox="0 0 80 12" fill="none" style={{ display: "inline-block" }}>
                          <path d="M0 6 Q10 0 20 6 T40 6 T60 6 T80 6" stroke={mainColor} strokeWidth="1.5" fill="none" opacity="0.5" />
                        </svg>
                      </div>
                    );
                  }
                  // 기본: 라인 + 원형 도트
                  return (
                    <div {...commonProps} style={{ ...commonProps.style, display: "flex", alignItems: "center", gap: 16, margin: "0 auto 24px", justifyContent: "center", maxWidth: 200 }}>
                      <div style={{ flex: 1, height: 1, background: lineColor }} />
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: mainColor }} />
                      <div style={{ flex: 1, height: 1, background: lineColor }} />
                    </div>
                  );
                };

                // 히어로 이미지 영역 (제품 이미지 사용 — hero만)
                const renderHeroImage = () => (
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                    {heroImgSrc ? (
                      <img src={heroImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})` }} />
                    )}
                  </div>
                );

                // 섹션별 이미지 교체 핸들러
                const sectionImgInputId = `sec-img-${sec.id}`;
                const handleSectionImageChange = async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const preview = URL.createObjectURL(file);
                  setSectionImages(prev => ({ ...prev, [sec.id]: { loading: false, url: preview, error: null } }));
                };

                // 이미지 렌더 (AI 생성 > 제품 이미지 > placeholder)
                const renderPlaceholder = (h = 280, style = {}) => {
                  // 이미지 요소 (선택 가능 — 가상 요소)
                  const imgEl = { type: "image", role: "section_image", secId: sec.id };
                  const imgSelected = selectedEl?.el?._type === "image" && selectedEl?.secIdx === i;
                  const imgSrc = aiImgSrc || productImgForSection;
                  if (imgSrc) return (
                    <div onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: -1, el: { ...imgEl, _type: "image" } }); }}
                      onMouseDown={imgSelected ? (e) => {
                        if (e.target.closest("[data-handle]")) return;
                        e.stopPropagation(); e.preventDefault();
                        dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: sec.imgProps?.offsetX || 0, origY: sec.imgProps?.offsetY || 0, isImage: true };
                      } : undefined}
                      style={{ width: "100%", height: h, borderRadius: 16, overflow: "visible", position: "relative", ...style,
                        border: imgSelected ? `2px solid #2196F3` : "2px solid transparent",
                        cursor: imgSelected ? "move" : "pointer",
                        marginTop: sec.imgProps?.offsetY || 0, marginLeft: sec.imgProps?.offsetX || 0,
                      }}>
                      {imgSelected && renderHandles()}
                      <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover",
                        borderRadius: sec.imgProps?.borderRadius ?? 14,
                        filter: sec.imgProps?.grayscale ? "grayscale(1)" : "none",
                        opacity: (sec.imgProps?.opacity ?? 100) / 100,
                        transform: `scaleX(${sec.imgProps?.scaleX ?? 1}) scaleY(${sec.imgProps?.scaleY ?? 1}) scale(${(sec.imgProps?.imgScale ?? 100) / 100})`,
                      }} />
                      {/* 이미지 교체/AI 생성 버튼 */}
                      <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                          교체
                        </label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(124,106,255,0.85)", color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                            AI 생성
                          </button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  );
                  if (secImg?.loading) return (
                    <div style={{ width: "100%", height: h, borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
                      <div style={{ color: acc, fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        이미지 생성 중...
                      </div>
                    </div>
                  );
                  if (secImg?.error) return (
                    <div style={{ width: "100%", height: h, borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff5f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #fca5a5", ...style }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>이미지 생성 실패</div>
                      <div style={{ fontSize: 10, color: "#999", maxWidth: "80%", textAlign: "center", lineHeight: 1.5 }}>{secImg.error.slice(0, 100)}</div>
                      <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                        style={{ padding: "6px 16px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                        다시 시도
                      </button>
                    </div>
                  );
                  return (
                    <div style={{ width: "100%", height: h, borderRadius: 16, position: "relative", overflow: "hidden",
                      background: `linear-gradient(145deg, ${mainColor}15, ${mainColor}08)`,
                      border: `1px solid ${mainColor}20`, ...style }}>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "8px 16px", borderRadius: 10, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#f0f0f0", color: isDarkBg ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${bdr}` }}>
                          + 이미지 추가
                        </label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "8px 16px", borderRadius: 10, background: acc, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            AI 이미지 생성
                          </button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  );
                };

                // 아이콘 원형 (features 그리드용)
                const iconCircle = (idx, size = 60) => {
                  const icons = ["✦", "◆", "●", "★", "▲", "♦", "◉", "⬟", "⬡"];
                  const iconImgId = `icon-img-${sec.id}-${idx}`;
                  const iconImg = sec[`iconImg_${idx}`];
                  return (
                    <div style={{ width: size, height: size, borderRadius: "50%", background: iconImg ? "transparent" : `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: iconImg ? "none" : `1.5px solid ${mainColor}25`, overflow: "hidden", cursor: "pointer", position: "relative" }}
                      onClick={e => { e.stopPropagation(); document.getElementById(iconImgId)?.click(); }}>
                      {iconImg ? (
                        <img src={iconImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: size * 0.35, color: mainColor }}>{icons[idx % icons.length]}</span>
                      )}
                      <input id={iconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${idx}`]: url }));
                        }
                      }} />
                    </div>
                  );
                };

                // ════════════════════════════════════════
                //  HERO — 컬러 오버레이 (배경색+이미지 오버레이+대형 카피)
                // ════════════════════════════════════════
                if (layout === "color_overlay") {
                  const titleEl = findEl("title");
                  const bodyEl = findEl("body");
                  const badgeEl = els.find(e => e.type === "badge");
                  const heroImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const overlayColor = bgCol || "#dfc87a";

                  return (
                    <div style={{ position: "relative", minHeight: 560, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 56px 56px" }}>
                      {/* 배경 레이어 */}
                      <div style={{ position: "absolute", inset: 0, background: overlayColor }} />
                      {heroImg && <img src={heroImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, mixBlendMode: "multiply" }} />}
                      <div style={{ position: "absolute", inset: 0, background: `${overlayColor}60` }} />

                      {/* 브랜드 태그 */}
                      {badgeEl && (
                        <div style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2, marginBottom: 48, lineHeight: 1.6 }}>
                          <span {...editable(badgeEl)} style={eS(badgeEl, {})}>{badgeEl.content}</span>
                        </div>
                      )}

                      {/* 대형 카피 */}
                      {titleEl && (
                        <div {...editable(titleEl)} style={eS(titleEl, { position: "relative", zIndex: 1, textAlign: "center", fontSize: 38, fontWeight: 900, color: "#ffffff", lineHeight: 1.5, marginBottom: 32, textShadow: "0 2px 20px rgba(0,0,0,0.08)", whiteSpace: "pre-line" })}>
                          {titleEl.content}
                        </div>
                      )}

                      {/* 설명문 */}
                      {bodyEl && (
                        <div {...editable(bodyEl)} style={eS(bodyEl, { position: "relative", zIndex: 1, textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-line" })}>
                          {bodyEl.content}
                        </div>
                      )}
                      {imgButtons()}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HERO — 세트 소개 (브랜드 테두리 박스+영문 서브+제품 이미지)
                // ════════════════════════════════════════
                if (layout === "set_intro") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  return (
                    <div style={{ background: bgCol, padding: "72px 48px 0", textAlign: "center" }}>
                      {/* 브랜드 테두리 박스 */}
                      {titleEl && (
                        <div style={{ display: "inline-block", border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.7)" : "#1a1a1a"}`, padding: "16px 48px", marginBottom: 16 }}>
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 300, color: isDarkBg ? "#ffffff" : "#1a1a1a", letterSpacing: 2, fontStyle: "italic" })}>
                            {titleEl.content}
                          </div>
                        </div>
                      )}

                      {/* 서브 영문 */}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", letterSpacing: 3, marginBottom: 48 })}>
                          {subtitleEl.content}
                        </div>
                      )}

                      {/* 하단 제품 이미지 */}
                      <div style={{ width: "100%", height: 380, background: isDarkBg ? "#1a1a1a" : "#f8f6f2", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 320, height: 280, background: isDarkBg ? "linear-gradient(180deg, transparent, #222)" : "linear-gradient(180deg, transparent, #f0ece4)", borderRadius: "50% 50% 0 0" }} />
                        )}
                        {imgButtons()}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HERO — 에코 히어로 종합 (그린+타이틀+특징바+3열카드)
                // ════════════════════════════════════════
                if (layout === "eco_hero_features") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const badgeEl = els.find(e => e.type === "badge");
                  const heroSubEl = els.find(e => e.role_hint === "hero_sub");
                  const heroDescEl = els.find(e => e.role_hint === "hero_desc");
                  const featBars = els.filter(e => e.role_hint === "feat_bar");
                  const detailCards = els.filter(e => e.role_hint === "detail_card");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const greenAccent = "#7ac070";

                  const featIcons = [
                    <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><circle cx="14" cy="14" r="11"/><path d="M10 14l3 3 6-6"/></svg>,
                    <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><path d="M14 4C10 4 6 10 6 14c0 6 8 12 8 12s8-6 8-12c0-4-4-10-8-10z"/></svg>,
                    <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><path d="M6 20l4-6 4 3 4-8 4 5"/><rect x="4" y="6" width="20" height="16" rx="2"/></svg>,
                  ];

                  return (
                    <div>
                      {/* 히어로 */}
                      <div style={{ position: "relative", minHeight: 440, background: isDarkBg ? `linear-gradient(135deg, #1a2a1a, #0e1a10 40%, #080e08)` : `linear-gradient(135deg, #c8d8c4, #a0b898 40%, #8aa880)`, padding: "40px 40px 0", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.15), rgba(0,40,20,0.25))", pointerEvents: "none" }} />
                        {/* 상단 */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, position: "relative", zIndex: 1 }}>
                          {badgeEl && <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: 3, textTransform: "uppercase" }}>{badgeEl.content}</span>}
                          {subtitleEl && <span {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 2, fontStyle: "italic" })}>{subtitleEl.content}</span>}
                        </div>
                        {/* 헤드라인 */}
                        <div style={{ position: "relative", zIndex: 1, marginBottom: 16 }}>
                          {heroSubEl && <div {...editable(heroSubEl)} style={eS(heroSubEl, { fontSize: 20, fontWeight: 400, color: "rgba(255,255,255,0.85)", marginBottom: 4 })}>{heroSubEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: "#ffffff", lineHeight: 1.25, textShadow: "0 2px 12px rgba(0,0,0,0.1)", whiteSpace: "pre-line" })}>{titleEl.content}</div>}
                        </div>
                        {heroDescEl && <div {...editable(heroDescEl)} style={eS(heroDescEl, { position: "relative", zIndex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 1, lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-line" })}>{heroDescEl.content}</div>}
                        {/* 제품 이미지 */}
                        <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", width: 240, height: 280, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                          {productImg ? (
                            <img src={productImg} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: 180, height: 200, background: "rgba(255,255,255,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>PRODUCT IMAGE</div>
                          )}
                        </div>
                        {imgButtons()}
                      </div>

                      {/* 특징 바 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", background: isDarkBg ? "rgba(0,15,5,0.85)" : "rgba(0,30,15,0.7)", backdropFilter: "blur(8px)" }}>
                        {featBars.map((el, fi) => {
                          const parts = el.content.split("|");
                          return (
                            <div key={fi} style={{ padding: "24px 20px", textAlign: "center", borderRight: fi < featBars.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                              <div style={{ width: 32, height: 32, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {React.cloneElement(featIcons[fi % featIcons.length], { style: { width: 28, height: 28 } })}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", marginBottom: 6 }}>{parts[0]}</div>
                              <div {...editable(el)} style={eS(el, { fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 })}>{parts[1]}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 3열 이미지 카드 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 2, background: isDarkBg ? "#1a1a1a" : "#f0f0f0" }}>
                        {detailCards.map((el, di) => {
                          const parts = el.content.split("|");
                          const cardImgId = `ecocard-${sec.id}-${di}`;
                          return (
                            <div key={di} style={{ background: isDarkBg ? "#111111" : "#ffffff", overflow: "hidden" }}>
                              <div style={{ width: "100%", height: 180, background: isDarkBg ? "#1a1a18" : "#e8e8e0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}
                                onClick={() => document.getElementById(cardImgId)?.click()}>
                                {sec[`ecoCardImg_${di}`] ? (
                                  <img src={sec[`ecoCardImg_${di}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <span style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#999999", letterSpacing: 1 }}>DETAIL {di + 1}</span>
                                )}
                                <input id={cardImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`ecoCardImg_${di}`]: url })); }
                                }} />
                              </div>
                              <div style={{ padding: "14px 16px" }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 1, marginBottom: 4 }}>{parts[0]}</div>
                                <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333" })}>{parts[1]}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HERO — 패턴 룩북 (컬러패턴+중앙이미지+세로텍스트)
                // ════════════════════════════════════════
                if (layout === "pattern_lookbook") {
                  const titleEl = findEl("title");
                  const sideLeft = els.find(e => e.role_hint === "side_left");
                  const sideRight = els.find(e => e.role_hint === "side_right");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  return (
                    <div style={{ position: "relative", minHeight: 640, background: bgCol, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
                      {/* 패턴 배경 */}
                      <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "radial-gradient(circle, #fff 2px, transparent 2px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

                      {/* 상단 로고 */}
                      {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", fontSize: 28, fontWeight: 300, fontStyle: "italic", color: "#ffffff", letterSpacing: 2, zIndex: 2 })}>{titleEl.content}</div>}

                      {/* 좌측 세로 */}
                      {sideLeft && <div {...editable(sideLeft)} style={eS(sideLeft, { position: "absolute", left: 20, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 2 })}>{sideLeft.content}</div>}

                      {/* 우측 세로 */}
                      {sideRight && <div {...editable(sideRight)} style={eS(sideRight, { position: "absolute", right: 20, top: "50%", transform: "translateY(-50%) rotate(90deg)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 2 })}>{sideRight.content}</div>}

                      {/* 중앙 이미지 */}
                      <div style={{ width: 380, height: 460, background: isDarkBg ? "#2a2a2a" : "#e8d0c8", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 12, color: "rgba(0,0,0,0.2)", letterSpacing: 2 }}>MODEL / PRODUCT IMAGE</span>
                        )}
                        {imgButtons()}
                      </div>

                      {/* 하단 브랜드 */}
                      {titleEl && <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", fontSize: 16, fontStyle: "italic", color: "#ffffff", letterSpacing: 2, zIndex: 2 }}>{titleEl.content}</div>}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HERO — 컬렉션 소개 (대형 세리프+좌이미지+우설명)
                // ════════════════════════════════════════
                if (layout === "collection_intro") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const seasonEl = els.find(e => e.role_hint === "season");
                  const descEl = els.find(e => e.role === "body" && !e.role_hint);
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  return (
                    <div style={{ background: bgCol, padding: "72px 48px 64px" }}>
                      {/* 대형 타이틀 */}
                      <div style={{ marginBottom: 8 }}>
                        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 48, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.15, letterSpacing: -1, fontFamily: "'Georgia','Times New Roman',serif", whiteSpace: "pre-line" })}>{titleEl.content}</div>}
                        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 48, fontWeight: 400, fontStyle: "italic", color: isDarkBg ? "rgba(255,255,255,0.6)" : "#a06868", lineHeight: 1.15, fontFamily: "'Georgia','Times New Roman',serif" })}>{subtitleEl.content}</div>}
                      </div>

                      {/* 좌이미지 + 우텍스트 */}
                      <div style={{ display: "flex", gap: 32, marginTop: 36, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
                        <div style={{ flex: "0 0 45%", height: 320, background: isDarkBg ? "#2a2a2a" : "#eeeeee", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          {productImg ? (
                            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.15)" : "#cccccc", letterSpacing: 2 }}>LOOKBOOK IMAGE</span>
                          )}
                          {imgButtons()}
                        </div>
                        <div style={{ flex: 1, paddingTop: 8 }}>
                          {seasonEl && <div {...editable(seasonEl)} style={eS(seasonEl, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999999", letterSpacing: 3, marginBottom: 16 })}>{seasonEl.content}</div>}
                          {descEl && <div {...editable(descEl)} style={eS(descEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#777777", lineHeight: 1.8 })}>{descEl.content}</div>}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HERO SECTION
                // ════════════════════════════════════════
                if (secType === "hero" || (layout === "full_image" && i === 0)) {
                  const subtitle = findEl("subtitle");
                  const title = findEl("title");
                  const body = findEl("body");
                  const badge = els.find(e => e.type === "badge");
                  const statNums = findEls("stat_number");
                  const statLabels = findEls("stat_label");

                  // ═══ 변형: 2톤 분할 히어로 (ARMAND 레퍼런스 — 밝은 상단 + 다크 하단 + 브랜드 타이포) ═══
                  if (dv % 6 === 5) {
                    const heroImg = aiImgSrc || productImgForSection || images[0]?.preview;
                    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle" && e.role !== "stat_number" && e.role !== "stat_label");
                    return (
                      <div>
                        {/* 상단: 밝은 배경 + 제품 이미지 + 특징 텍스트 */}
                        <div style={{ background: colorPalette?.light_bg || "#f5f0eb", position: "relative", padding: "60px 48px 80px", display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 32, flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? "auto" : 500 }}>
                          {/* 좌측 특징 텍스트 */}
                          <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", gap: 16 }}>
                            {bodyEls.slice(0, 4).map((el, bi) => (
                              <div key={bi} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: mainColor, flexShrink: 0, marginTop: 2 }}>{bi + 1}.</span>
                                <div {...editable(el)} style={eS(el, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#666", lineHeight: 1.6 })}>{el.content}</div>
                              </div>
                            ))}
                          </div>
                          {/* 우측 제품 이미지 */}
                          <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
                            {heroImg ? (
                              <img src={heroImg} alt="" style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain", filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.08))" }} />
                            ) : (
                              <div style={{ width: 320, height: 360, borderRadius: 16, background: `linear-gradient(135deg, ${mainColor}15, ${mainColor}08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 60, color: `${mainColor}15`, fontWeight: 900 }}>+</span>
                              </div>
                            )}
                            {imgButtons({ top: 8, right: 8 })}
                          </div>
                        </div>
                        {/* 하단: 다크 배경 + 브랜드 타이포 + 캐치프레이즈 */}
                        <div style={{ background: "#1a1a2e", padding: isMobile ? "60px 24px" : "80px 56px", position: "relative", overflow: "hidden" }}>
                          {/* 세로 브랜드 타이포 배경 */}
                          <div style={{ position: "absolute", left: isMobile ? -20 : 40, top: "50%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "center", fontSize: isMobile ? 48 : 80, fontWeight: 900, color: "rgba(255,255,255,0.04)", letterSpacing: 8, whiteSpace: "nowrap", pointerEvents: "none", textTransform: "uppercase" }}>
                            {(productName || "BRAND").toUpperCase()}
                          </div>
                          <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
                            {subtitle && <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginBottom: 16 })}>{subtitle.content}</div>}
                            {title && <div {...editable(title)} style={eS(title, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 20 })}>{title.content}</div>}
                            {/* 인증/수상 배지 */}
                            {statNums.length > 0 && (
                              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28, flexWrap: "wrap" }}>
                                {statNums.map((sn, si) => (
                                  <div key={si} style={{ textAlign: "center", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div {...editable(sn)} style={eS(sn, { fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 })}>{sn.content}</div>
                                    {statLabels[si] && <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginTop: 6 })}>{statLabels[si].content}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ═══ 변형: 라이프스타일 히어로 (풀배경 + 좌상단 로고 + 좌측 타이틀 + 우측 뱃지 + 하단 아이콘) ═══
                  if (dv % 6 === 3) {
                    const heroImg = aiImgSrc || productImgForSection || images[0]?.preview;
                    return (
                      <div style={{ position: "relative", minHeight: 1260, overflow: "hidden", background: "#1a2a1a" }}>
                        {heroImg ? (
                          <img src={heroImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${mainColor}40, #1a1a2e)`, zIndex: 0 }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%)", zIndex: 1 }} />
                        {imgButtons()}
                        <div style={{ position: "relative", zIndex: 2, padding: "48px 80px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "space-between", maxWidth: 720, margin: "0 auto" }}>
                          {/* 좌상단: 브랜드 로고 */}
                          {badge && <div {...editable(badge)} style={eS(badge, { fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: 3 })}>{badge.content}</div>}
                          {!badge && <div />}

                          {/* 중앙: 타이틀 + 뱃지 */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
                            <div style={{ flex: 1, maxWidth: 380 }}>
                              {title && <div {...editable(title)} style={eS(title, { fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.35, marginBottom: 12 })}>{title.content}</div>}
                              {subtitle && <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: 1, textTransform: "uppercase" })}>{subtitle.content}</div>}
                            </div>
                            {statNums.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                                {statNums.map((sn, si) => (
                                  <div key={si} style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
                                    <span {...editable(sn)} style={eS(sn, { fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 })}>{sn.content}</span>
                                    {statLabels[si] && <span {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1 })}>{statLabels[si].content}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 하단: 설명 + 스크롤 */}
                          <div>
                            {body && <div {...editable(body)} style={eS(body, { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 16, maxWidth: 360 })}>{body.content}</div>}
                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 3, textTransform: "uppercase" }}>SCROLL DOWN</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 히어로 ═══
                  return (
                    <div style={{ width: "100%", minHeight: 1260, position: "relative", overflow: "hidden", background: "#111" }}>
                      {renderHeroImage()}
                      {/* 그라디언트 오버레이 — 더 강한 딤 */}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.88) 100%)" }} />
                      {/* 상단 브랜드 로고 — 브랜드명이 있을 때만 표시 */}
                      {extraInfo?.brand && (
                        <div style={{ position: "absolute", top: 28, left: 32, zIndex: 2, display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{extraInfo.brand[0]}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>{extraInfo.brand}</span>
                        </div>
                      )}
                      {/* 배지 - 우측 상단 */}
                      {badge && (
                        <div style={{ position: "absolute", top: 28, right: 80, zIndex: 2 }}>
                          <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "8px 22px", borderRadius: 24, background: mainColor, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 0.5, boxShadow: `0 4px 16px ${mainColor}50` })}>
                            {badge.content}
                          </span>
                        </div>
                      )}
                      {/* 코너 프레임 장식 */}
                      <div style={{ position: "absolute", top: 24, left: 24, width: 60, height: 60, borderTop: "2px solid rgba(255,255,255,0.15)", borderLeft: "2px solid rgba(255,255,255,0.15)", zIndex: 1, borderRadius: "4px 0 0 0" }} />
                      <div style={{ position: "absolute", bottom: 24, right: 24, width: 60, height: 60, borderBottom: "2px solid rgba(255,255,255,0.15)", borderRight: "2px solid rgba(255,255,255,0.15)", zIndex: 1, borderRadius: "0 0 4px 0" }} />
                      {/* 콘텐츠 */}
                      <div style={{ position: "relative", zIndex: 1, padding: "100px 56px 72px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        {subtitle && (
                          <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>
                            {subtitle.content}
                          </div>
                        )}
                        {title && (
                          <div {...editable(title)} style={eS(title, { fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 18, letterSpacing: -0.5, textShadow: "0 2px 24px rgba(0,0,0,0.4)", wordBreak: "keep-all" })}>
                            {title.content}
                          </div>
                        )}
                        {body && (
                          <div {...editable(body)} style={eS(body, { fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, maxWidth: 520 })}>
                            {body.content}
                          </div>
                        )}
                        {!subtitle && !title && !body && els.filter(e => e.type === "text").slice(0, 3).map((el, ei) => (
                          <div key={ei} {...editable(el)} style={eS(el, { fontSize: ei === 0 ? 14 : ei === 1 ? 42 : 16, fontWeight: ei === 1 ? 900 : ei === 0 ? 600 : 400, color: "#fff", lineHeight: ei === 1 ? 1.2 : 1.7, marginBottom: ei === 1 ? 18 : 8, letterSpacing: ei === 0 ? 4 : 0 })}>
                            {el.content}
                          </div>
                        ))}
                        {/* 통계 블록 */}
                        {findEls("stat_number").length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(findEls("stat_number").length, 4)}, 1fr)`, gap: 12, marginTop: 32, maxWidth: 500 }}>
                            {findEls("stat_number").map((sn, si) => (
                              <div key={si} style={{ textAlign: "center", padding: "16px 10px", borderRadius: 14, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div {...editable(sn)} style={eS(sn, { fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 })}>{sn.content}</div>
                                {findEls("stat_label")[si] && (
                                  <div {...editable(findEls("stat_label")[si])} style={{ ...editable(findEls("stat_label")[si]).style, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{findEls("stat_label")[si].content}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* CTA 버튼 */}
                        {findEl("price") && (
                          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ padding: "18px 36px", borderRadius: 14, background: mainColor, color: "#fff", fontSize: 17, fontWeight: 800, boxShadow: `0 6px 24px ${mainColor}50`, letterSpacing: 0.5 }}>
                              {findEl("price") && <span {...editable(findEl("price"))} style={{ ...editable(findEl("price")).style }}>{findEl("price").content}</span>}
                              {" "}구매하기
                            </div>
                          </div>
                        )}
                        {/* SCROLL DOWN 애니메이션 화살표 */}
                        {!findEl("price") && (
                          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)" }} />
                              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontWeight: 500 }}>SCROLL DOWN</span>
                            </div>
                            <div style={{ marginLeft: 0, marginTop: 4, animation: "heroArrowBounce 2s ease-in-out infinite" }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 7l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* 이미지 교체 */}
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                      <style>{`@keyframes heroArrowBounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(8px);opacity:1} }`}</style>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  PAIN POINTS — Q&A 말풍선형
                // ════════════════════════════════════════
                if (layout === "qa_bubble") {
                  const titleEl = findEl("title");
                  const qBubbles = els.filter(e => e.role_hint === "q_bubble");
                  const aBubble = els.find(e => e.role_hint === "a_bubble");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const accentColor = mainColor || "#3a5ba0";
                  const darkAccent = "#2a3a6e";

                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    return text.split(/(\[.*?\])/g).map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <strong key={pi} style={{ fontWeight: 900 }}>{p.slice(1, -1)}</strong>
                      : p.includes("\n") ? p.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : p
                    );
                  };

                  return (
                    <div style={{ background: bgCol, padding: "56px 48px 0", overflow: "hidden" }}>
                      {/* Q */}
                      <div style={{ fontSize: 48, fontWeight: 900, color: isDarkBg ? "#5a8ad0" : accentColor, marginBottom: 20 }}>Q.</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", marginBottom: 32 }}>
                        {qBubbles.map((el, qi) => (
                          <div key={qi} {...editable(el)} style={eS(el, { background: isDarkBg ? "rgba(255,255,255,0.08)" : "#ffffff", borderRadius: "20px 20px 20px 4px", padding: "14px 24px", fontSize: 16, fontWeight: 500, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333", boxShadow: isDarkBg ? "none" : "0 2px 8px rgba(0,0,0,0.04)", maxWidth: "80%" })}>{el.content}</div>
                        ))}
                      </div>

                      {/* A */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 48 }}>
                        <div style={{ fontSize: 48, fontWeight: 900, color: isDarkBg ? "#7090c0" : darkAccent, marginBottom: 12 }}>A.</div>
                        {aBubble && <div {...editable(aBubble)} style={eS(aBubble, { background: isDarkBg ? "#3a5080" : darkAccent, borderRadius: "20px 20px 4px 20px", padding: "18px 28px", fontSize: 16, fontWeight: 600, color: "#ffffff", maxWidth: "75%", textAlign: "center", lineHeight: 1.6 })}>{aBubble.content}</div>}
                      </div>

                      {/* CTA 헤드라인 */}
                      {titleEl && (
                        <div style={{ textAlign: "center", marginBottom: 48 }}>
                          <div style={{ fontSize: 36, color: isDarkBg ? "#5a8ad0" : accentColor, fontWeight: 300, marginBottom: 8 }}>"</div>
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#1a1a1a", lineHeight: 1.5 })}>{renderBoldBracket(titleEl.content)}</div>
                        </div>
                      )}

                      {/* 제품 이미지 */}
                      <div style={{ width: "100%", height: 320, background: isDarkBg ? "linear-gradient(180deg, transparent, rgba(0,0,0,0.2))" : "linear-gradient(180deg, transparent, rgba(0,0,0,0.03))", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain" }} />
                        ) : (
                          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", paddingBottom: 20 }}>
                            <div style={{ width: 80, height: 200, background: "#ffffff", borderRadius: "12px 12px 6px 6px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", position: "relative" }}>
                              <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 50, height: 60, background: darkAccent, borderRadius: 4, opacity: 0.6 }} />
                            </div>
                            <div style={{ width: 90, height: 220, background: "#ffffff", borderRadius: "12px 12px 6px 6px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", position: "relative" }}>
                              <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 55, height: 65, background: darkAccent, borderRadius: 4, opacity: 0.6 }} />
                            </div>
                          </div>
                        )}
                        {imgButtons()}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  PAIN POINTS (고민/공감)
                // ════════════════════════════════════════
                if (secType === "pain_points") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const painEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  const items = [];
                  painEls.forEach((el, idx) => {
                    if (el.fontWeight === "700" || el.fontWeight === "900" || idx % 2 === 0) {
                      items.push({ title: el, body: null });
                    } else if (items.length > 0 && !items[items.length - 1].body) {
                      items[items.length - 1].body = el;
                    } else {
                      items.push({ title: el, body: null });
                    }
                  });
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  // ── pain_points 변형 렌더링 ──
                  // 변형 0,1: 다크 배경 + 글라스 카드 (기존)
                  // 변형 3: 대형 인용문 중앙
                  // 변형 2,4,5: 체크리스트 세로

                  if (dv % 6 >= 2) {
                    // 밝은 배경 변형들 — bgCol 사용
                    const painBg = bgCol;
                    const painTxtCol = isDarkBg ? "#fff" : "#1a1a1a";
                    const painSubCol = isDarkBg ? "rgba(255,255,255,0.6)" : "#888";

                    if (dv % 6 === 3) {
                      // 변형 3: 대형 인용문 중앙
                      return (
                        <div style={{ background: painBg, padding: "100px 64px", textAlign: "center" }}>
                          <div style={{ fontSize: 80, color: `${mainColor}15`, fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: -20 }}>"</div>
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: painTxtCol, lineHeight: 1.4, marginBottom: 32, maxWidth: 560, marginLeft: "auto", marginRight: "auto" })}>{titleEl.content}</div>}
                          {painEls.map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: el.fontWeight === "700" ? "#333" : painSubCol, fontWeight: el.fontWeight || "400", lineHeight: 1.9, marginBottom: 12, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                          ))}
                        </div>
                      );
                    }

                    // 변형 2,4,5: 세로 체크리스트
                    return (
                      <div style={{ background: painBg, padding: "100px 64px" }}>
                        <div style={{ textAlign: "center", marginBottom: 56 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: painTxtCol, lineHeight: 1.3, marginBottom: 16 })}>{titleEl.content}</div>}
                          {decoLine(mainColor, 40)}
                        </div>
                        <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
                          {items.map((item, pi) => (
                            <div key={pi} style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "24px 28px", borderRadius: 14, background: "transparent", border: `1px solid rgba(0,0,0,0.06)` }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${mainColor}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                              <div style={{ flex: 1 }}>
                                {item.title && <div {...editable(item.title)} style={eS(item.title, { fontSize: 15, fontWeight: 700, color: painTxtCol, marginBottom: item.body ? 4 : 0 })}>{item.title.content}</div>}
                                {item.body && <div {...editable(item.body)} style={eS(item.body, { fontSize: 13, color: painSubCol, lineHeight: 1.7 })}>{item.body.content}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // 변형 0,1: 다크 배경 (기존 스타일)
                  return (
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      {productImg ? (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px) brightness(0.35)" }} />
                        </div>
                      ) : (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, #1a1a2e 0%, ${mainColor}30 100%)` }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.8) 100%)" : "transparent" }} />
                      <div style={{ position: "relative", zIndex: 2, padding: "100px 64px" }}>
                        <div style={{ textAlign: "center", marginBottom: 56 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 12 })}>{titleEl.content}</div>}
                          {decoLine(mainColor, 48)}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: items.length >= 4 ? "1fr 1fr" : "1fr", gap: 16, maxWidth: 680, margin: "0 auto" }}>
                          {items.map((item, pi) => (
                            <div key={pi} style={{ display: "flex", gap: 20, padding: "32px 28px", borderRadius: 16, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <div style={{ width: 44, height: 44, borderRadius: 12, background: dv === 1 ? `${mainColor}20` : "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {dv === 1 ? (
                                  <span style={{ fontSize: 16, fontWeight: 900, color: mainColor }}>{String(pi + 1).padStart(2, "0")}</span>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5l-10 10" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                {item.title && (
                                  <div {...editable(item.title)} style={eS(item.title, { fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: item.body ? 6 : 0, lineHeight: 1.5 })}>
                                    {item.title.content}
                                  </div>
                                )}
                                {item.body && (
                                  <div {...editable(item.body)} style={eS(item.body, { fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 })}>
                                    {item.body.content}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* 이미지 교체 버튼 */}
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>배경 교체</label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>AI 생성</button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  FEATURES — 제품소개 포인트형 (중앙 제품 + 4포인트)
                // ════════════════════════════════════════
                if (layout === "center_product_4point") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const pointLabels = els.filter(e => e.role_hint === "point_label" || (e.role === "body" && e.fontWeight === "700"));
                  const descEl = els.find(e => e.role === "body" && !e.role_hint && e.fontWeight !== "700" && e.fontWeight !== "900");
                  const accentColor = "#e8799a";
                  const productImg = images[0]?.preview || null;
                  const pointPositions = [
                    { top: 20, left: 40 }, { top: 20, right: 40 },
                    { bottom: 20, left: 40 }, { bottom: 20, right: 40 },
                  ];
                  const pointIcons = [
                    /* 청결 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><circle cx="16" cy="11" r="5"/><path d="M9 26c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>,
                    /* 보습 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><path d="M16 6C11 6 7 11 7 16c0 7 9 12 9 12s9-5 9-12c0-5-4-10-9-10z"/><circle cx="16" cy="16" r="3"/></svg>,
                    /* 억제 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><rect x="6" y="10" width="20" height="14" rx="3"/><path d="M6 16h20M12 10V8M20 10V8"/></svg>,
                    /* 효과 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><circle cx="16" cy="16" r="10"/><path d="M12 16l3 3 6-6"/></svg>,
                  ];

                  // 타이틀에서 [키워드] 하이라이트 처리
                  const renderHighlightTitle = (text) => {
                    if (!text) return null;
                    const parts = text.split(/(\[.*?\])/g);
                    return parts.map((part, pi) => {
                      if (part.startsWith("[") && part.endsWith("]")) {
                        return <span key={pi}><span style={{ color: isDarkBg ? "#ffffff" : "#1a1a1a", fontWeight: 900 }}>[</span><span style={{ color: isDarkBg ? "#f0a0b8" : accentColor, fontWeight: 900 }}>{part.slice(1, -1)}</span><span style={{ color: isDarkBg ? "#ffffff" : "#1a1a1a", fontWeight: 900 }}>]</span></span>;
                      }
                      return part.includes("\n") ? part.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : part;
                    });
                  };

                  return (
                    <div style={{ background: bgCol, padding: "60px 50px 56px", position: "relative", overflow: "hidden" }}>
                      {/* 상단 태그 */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888" }}>[ 제품소개 ]</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: isDarkBg ? "#ffffff" : "#222222", letterSpacing: 1 }}>Brand</span>
                      </div>

                      {/* 메인 카피 */}
                      <div style={{ textAlign: "center", marginBottom: 48 }}>
                        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: accentColor, letterSpacing: 1.5, marginBottom: 16 })}>{subtitleEl.content}</div>}
                        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.45 })}>
                          <span style={{ color: isDarkBg ? "rgba(255,255,255,0.15)" : "#dddddd", fontSize: 42, fontWeight: 300 }}>" </span>
                          {renderHighlightTitle(titleEl.content)}
                          <span style={{ color: isDarkBg ? "rgba(255,255,255,0.15)" : "#dddddd", fontSize: 42, fontWeight: 300 }}> "</span>
                        </div>}
                      </div>

                      {/* 제품 + 4포인트 영역 */}
                      <div style={{ position: "relative", width: "100%", height: isMobile ? 320 : 380, marginBottom: 44 }}>
                        {/* 점선 연결 */}
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, height: 340, pointerEvents: "none" }}>
                          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 0, borderTop: `1px dashed ${isDarkBg ? "rgba(255,255,255,0.1)" : "#e0d0d4"}` }} />
                          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 0, borderLeft: `1px dashed ${isDarkBg ? "rgba(255,255,255,0.1)" : "#e0d0d4"}` }} />
                        </div>

                        {/* 중앙 제품 */}
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 220, height: 220, borderRadius: "50%", background: isDarkBg ? `radial-gradient(circle, rgba(232,121,154,0.15) 0%, rgba(232,121,154,0.05) 60%, transparent 70%)` : `radial-gradient(circle, #fce4ec 0%, #f8f0f2 60%, transparent 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {productImg ? (
                            <img src={productImg} alt="" style={{ maxWidth: "70%", maxHeight: "85%", objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: 60, height: 180, background: `linear-gradient(180deg, #fce4ec 0%, #f9c4d2 30%, #fff 60%)`, borderRadius: "30px 30px 10px 10px", boxShadow: "0 8px 30px rgba(232,121,154,0.15)" }} />
                          )}
                        </div>

                        {/* 4 포인트 */}
                        {pointLabels.slice(0, 4).map((pl, pi) => (
                          <div key={pi} style={{ position: "absolute", ...pointPositions[pi], display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 120, textAlign: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isDarkBg ? "#f0a0b8" : accentColor, letterSpacing: 1, background: isDarkBg ? "rgba(232,121,154,0.2)" : "#fce4ec", padding: "3px 12px", borderRadius: 20 }}>Point {String(pi + 1).padStart(2, "0")}</span>
                            <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {React.cloneElement(pointIcons[pi % pointIcons.length], { style: { width: 28, height: 28 } })}
                            </div>
                            <span {...editable(pl)} style={eS(pl, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.9)" : "#333333" })}>{pl.content}</span>
                          </div>
                        ))}
                      </div>

                      {/* 하단 설명 */}
                      {descEl && (
                        <div style={{ textAlign: "center", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#f0e8ea"}`, paddingTop: 32 }}>
                          <div {...editable(descEl)} style={eS(descEl, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666", lineHeight: 1.8 })}>{descEl.content}</div>
                        </div>
                      )}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  FEATURES / GRID (2col or 3col)
                // ════════════════════════════════════════
                if (secType === "features" || layout === "grid_2col" || layout === "grid_3col") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const gridEls = els.filter(e => e.role !== "title" && e.role !== "subtitle" && e.type !== "divider" && e.type !== "badge");
                  const cols = layout === "grid_3col" ? 3 : 2;
                  const items = [];
                  for (let g = 0; g < gridEls.length; g++) {
                    if (gridEls[g].fontWeight === "700" || gridEls[g].fontWeight === "900" || gridEls[g].role === "body" && items.length === 0) {
                      items.push({ title: gridEls[g], body: gridEls[g + 1]?.fontWeight !== "700" && gridEls[g + 1]?.fontWeight !== "900" ? gridEls[g + 1] : null });
                      if (items[items.length - 1].body) g++;
                    } else {
                      items.push({ title: gridEls[g], body: null });
                    }
                  }
                  const featureBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
                  const productImg = images[0]?.preview || null;
                  const getItemImg = (idx) => sec[`iconImg_${idx}`] || (images.length > 0 ? images[idx % images.length]?.preview : null);

                  // ═══ 지그재그 제품 쇼케이스 (레퍼런스: 보타니컬 클레이 마스크) ═══
                  if (dv % 6 === 3) {
                    const smudgeColors = [`${mainColor}30`, "#e8d5d0", "#d5e0d0", "#d0d5e8", "#e8e0d0", "#d0e8e0"];
                    return (
                      <div style={{ background: featureBg, padding: "100px 48px 120px", position: "relative", overflow: "hidden" }}>
                        {/* 배경 다이아몬드 패턴 */}
                        <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, ${isDarkBg ? "#fff" : "#000"} 40px, ${isDarkBg ? "#fff" : "#000"} 41px)`,
                        }} />
                        {/* 상단 타이틀 — 중앙 */}
                        <div style={{ textAlign: "center", marginBottom: 64, position: "relative", zIndex: 1 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#888", marginBottom: 12 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25, marginBottom: 12 })}>{titleEl.content}</div>}
                          {findEls("body").length > 0 && items.length === 0 && <div {...editable(findEls("body")[0])} style={eS(findEls("body")[0], { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999" })}>{findEls("body")[0].content}</div>}
                        </div>
                        {/* 지그재그 아이템 */}
                        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 56, position: "relative", zIndex: 1 }}>
                          {(items.length > 0 ? items : gridEls.map(el => ({ title: el, body: null }))).map((item, gi) => {
                            const isLeft = gi % 2 === 0;
                            const itemImg = getItemImg(gi);
                            const featureIconImgId = `feat-img-${sec.id}-${gi}`;
                            const smudge = smudgeColors[gi % smudgeColors.length];
                            return (
                              <div key={gi} style={{ display: "flex", alignItems: "center", gap: 0, flexDirection: isLeft ? "row" : "row-reverse" }}>
                                {/* 이미지 + 컬러 스머지 */}
                                <div style={{ flex: "0 0 55%", position: "relative", height: 280 }}>
                                  {/* 스머지(색 번짐) 배경 */}
                                  <div style={{
                                    position: "absolute",
                                    [isLeft ? "right" : "left"]: -30,
                                    top: "50%", transform: "translateY(-50%)",
                                    width: 200, height: 200, borderRadius: "50%",
                                    background: smudge, filter: "blur(40px)",
                                    pointerEvents: "none", zIndex: 0,
                                  }} />
                                  {/* 제품 이미지 */}
                                  <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: isLeft ? "flex-start" : "flex-end" }}>
                                    {itemImg ? (
                                      <img src={itemImg} alt="" style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
                                    ) : (
                                      <div style={{ width: 200, height: 220, borderRadius: 12, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ fontSize: 40, fontWeight: 900, color: `${mainColor}15` }}>{gi + 1}</span>
                                      </div>
                                    )}
                                  </div>
                                  <input id={featureIconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${gi}`]: url })); }
                                  }} />
                                  {/* 이미지 교체 버튼 */}
                                  <div style={{ position: "absolute", top: 8, [isLeft ? "left" : "right"]: 8, zIndex: 3 }}>
                                    <label htmlFor={featureIconImgId} onClick={e => e.stopPropagation()}
                                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>교체</label>
                                  </div>
                                </div>
                                {/* 텍스트 */}
                                <div style={{ flex: "0 0 45%", padding: isLeft ? "0 0 0 20px" : "0 20px 0 0", textAlign: isLeft ? "left" : "right" }}>
                                  {item.title && <div {...editable(item.title)} style={eS(item.title, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 8, lineHeight: 1.5 })}>{item.title.content}</div>}
                                  {item.body && <div {...editable(item.body)} style={eS(item.body, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 })}>{item.body.content}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // ── 기본 카드 스타일 ──
                  const cs = { radius: 16, shadow: "0 4px 24px rgba(0,0,0,0.06)", imgH: cols === 3 ? 200 : 260, showImg: true, showNum: true, numStyle: "badge", padTop: "120px", decoType: "circle" };

                  // 기본: 이미지 카드 그리드
                  return (
                    <div style={{ background: featureBg, padding: `${cs.padTop} 64px 100px`, position: "relative", overflow: "hidden" }}>
                      {cs.decoType === "circle" && <>
                        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `${mainColor}06`, pointerEvents: "none" }} />
                        <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: `${mainColor}04`, pointerEvents: "none" }} />
                      </>}
                      <div style={{ textAlign: "center", marginBottom: 64, position: "relative", zIndex: 1 }}>
                        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
                        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.25, marginBottom: 20 })}>{titleEl.content}</div>}
                        {decoLine(mainColor, 48)}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${cols}, 1fr)`, gap: isMobile ? 16 : (cols === 3 ? 24 : 28), position: "relative", zIndex: 1 }}>
                        {(items.length > 0 ? items : gridEls.map(el => ({ title: el, body: null }))).map((item, gi) => {
                          const itemImg = getItemImg(gi);
                          const featureIconImgId = `feat-img-${sec.id}-${gi}`;
                          return (
                            <div key={gi} style={{
                              overflow: "hidden",
                              background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff",
                              borderRadius: cs.radius,
                              boxShadow: isDarkBg ? "0 2px 16px rgba(0,0,0,0.2)" : cs.shadow,
                              display: "flex", flexDirection: "column",
                              border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                            }}>
                              {cs.showImg && (
                                <div style={{ width: "100%", height: itemImg ? cs.imgH : 100, position: "relative", overflow: "hidden", cursor: "pointer", background: itemImg ? `linear-gradient(135deg, ${mainColor}12, ${mainColor}06)` : `${mainColor}06` }}
                                  onClick={() => document.getElementById(featureIconImgId)?.click()}>
                                  {itemImg ? (
                                    <img src={itemImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                                      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${mainColor}20` }}>
                                        <span style={{ fontSize: 20, fontWeight: 900, color: mainColor }}>{gi + 1}</span>
                                      </div>
                                      <span style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbb", fontWeight: 600 }}>이미지 추가</span>
                                    </div>
                                  )}
                                  {itemImg && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.4) 100%)" }} />}
                                  {cs.showNum && <div style={{ position: "absolute", top: 12, left: 12, width: 32, height: 32, borderRadius: 10, background: mainColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${mainColor}40` }}><span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{gi + 1}</span></div>}
                                  <input id={featureIconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${gi}`]: url }));
                                    }
                                  }} />
                                </div>
                              )}
                              {/* 텍스트 영역 */}
                              <div style={{ padding: cols === 3 ? "24px 20px 28px" : "28px 28px 32px" }}>
                                {item.title && (
                                  <div {...editable(item.title)} style={eS(item.title, { fontSize: cols === 3 ? 17 : 20, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 10, lineHeight: 1.4 })}>
                                    {item.title.content}
                                  </div>
                                )}
                                {item.body && (
                                  <div {...editable(item.body)} style={eS(item.body, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#777", lineHeight: 1.8 })}>
                                    {item.body.content}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT — 체크포인트형 (브랜드+이미지+체크리스트)
                // ════════════════════════════════════════
                if (layout === "checkpoint_list") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const captionEl = els.find(e => e.role_hint === "caption");
                  const colTitleEl = els.find(e => e.role_hint === "col_title");
                  const checkEls = els.filter(e => e.role_hint === "check");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const checkColor = isDarkBg ? "#7a8c6e" : "#7a8c6e";

                  // [키워드] 볼드 처리
                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    const parts = text.split(/(\[.*?\])/g);
                    return parts.map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <strong key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
                      : p
                    );
                  };

                  return (
                    <div style={{ background: bgCol, padding: "56px 48px 64px" }}>
                      {/* 브랜드 헤더 */}
                      {subtitleEl && (
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>
                          <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#dddddd", margin: "12px auto 0" }} />
                        </div>
                      )}
                      {/* 헤드라인 */}
                      {titleEl && (
                        <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 22, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", lineHeight: 1.6, marginBottom: 40 })}>
                          {renderBoldBracket(titleEl.content)}
                        </div>
                      )}
                      {/* 히어로 이미지 */}
                      <div style={{ width: "100%", maxWidth: 480, height: 280, margin: "0 auto 16px", borderRadius: 12, background: isDarkBg ? "#1a1a1a" : "#f5f2ee", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 180, height: 160, background: isDarkBg ? "radial-gradient(circle, #222 30%, #1a1a1a 100%)" : "radial-gradient(circle, #fff 30%, #f0ece6 100%)", borderRadius: "50%", opacity: 0.8 }} />
                        )}
                        {imgButtons()}
                      </div>
                      {/* 캡션 */}
                      {captionEl && <div {...editable(captionEl)} style={eS(captionEl, { textAlign: "center", fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", marginBottom: 36 })}>{captionEl.content}</div>}
                      {/* 2컬럼 체크리스트 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#eeeeee"}` }}>
                        <div style={{ padding: "28px 24px", borderRight: isMobile ? "none" : `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#eeeeee"}` }}>
                          {colTitleEl && <div {...editable(colTitleEl)} style={eS(colTitleEl, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", marginBottom: 16 })}>{colTitleEl.content}</div>}
                          {checkEls.slice(0, Math.ceil(checkEls.length / 2)).map((el, ci) => (
                            <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M4 9l3.5 3.5L14 5" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#555555", lineHeight: 1.6 })}>{el.content}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: "28px 24px" }}>
                          <div style={{ height: colTitleEl ? 29 : 0, marginBottom: colTitleEl ? 16 : 0 }} />
                          {checkEls.slice(Math.ceil(checkEls.length / 2)).map((el, ci) => (
                            <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M4 9l3.5 3.5L14 5" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <span {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#555555", lineHeight: 1.6 })}>{el.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT — 원재료 그리드 (4열 원형 이미지)
                // ════════════════════════════════════════
                if (layout === "ingredient_grid") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const infoDescEl = els.find(e => e.role_hint === "info_desc");
                  const ingredientEls = els.filter(e => e.role_hint === "ingredient");

                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    const parts = text.split(/(\[.*?\])/g);
                    return parts.map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <strong key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
                      : p
                    );
                  };

                  return (
                    <div style={{ background: bgCol, padding: "56px 48px 64px" }}>
                      {/* 브랜드 헤더 */}
                      {subtitleEl && (
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>
                          <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#dddddd", margin: "12px auto 0" }} />
                        </div>
                      )}
                      {/* 타이틀 */}
                      {titleEl && (
                        <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 24, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", marginBottom: 32, lineHeight: 1.5 })}>
                          {renderBoldBracket(titleEl.content)}
                        </div>
                      )}
                      {/* 정보 박스 */}
                      {infoDescEl && (
                        <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f8f6f3", borderRadius: 8, padding: "24px 28px", marginBottom: 40, maxWidth: 400, marginLeft: "auto" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</div>
                          <div {...editable(infoDescEl)} style={eS(infoDescEl, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", lineHeight: 1.7 })}>{infoDescEl.content}</div>
                        </div>
                      )}
                      {/* 4열 원형 그리드 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "28px 20px" }}>
                        {ingredientEls.map((el, ii) => {
                          const parts = el.content.split("|");
                          const name = parts[0]?.trim();
                          const desc = parts[1]?.trim() || "";
                          const ingredImgId = `ingred-${sec.id}-${ii}`;
                          return (
                            <div key={ii} style={{ textAlign: "center" }}>
                              <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 12px", overflow: "hidden", background: isDarkBg ? "#1a1a1a" : "#f5f2ee", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                                onClick={() => document.getElementById(ingredImgId)?.click()}>
                                {sec[`ingredImg_${ii}`] ? (
                                  <img src={sec[`ingredImg_${ii}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: isDarkBg ? "#222222" : "#e8e2da" }} />
                                )}
                                <input id={ingredImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`ingredImg_${ii}`]: url })); }
                                }} />
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.85)" : "#333333", marginBottom: 4 }}>{name}</div>
                              <div {...editable(el)} style={eS(el, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", lineHeight: 1.4 })}>{desc}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT — 제품 라인업 3열 (컬러카드+말풍선+제품명)
                // ════════════════════════════════════════
                if (layout === "product_lineup") {
                  const titleEl = findEl("title");
                  const lineupItems = els.filter(e => e.role_hint === "lineup_item");

                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    return text.split(/(\[.*?\])/g).map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <span key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ff8080" : "#e04040" }}>{p.slice(1, -1)}</span>
                      : <span key={pi} style={{ fontWeight: p === " 라인업" || p.includes("라인업") ? 900 : 400 }}>{p}</span>
                    );
                  };

                  return (
                    <div style={{ background: bgCol, padding: "56px 40px 64px" }}>
                      {/* 헤드라인 */}
                      {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 24, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", marginBottom: 40, lineHeight: 1.5 })}>{renderBoldBracket(titleEl.content)}</div>}

                      {/* 3열 카드 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${lineupItems.length}, 1fr)`, gap: 16 }}>
                        {lineupItems.map((el, li) => {
                          const parts = el.content.split("|");
                          const bubble = parts[0]?.trim();
                          const productName = parts[1]?.trim() || "";
                          const origin = parts[2]?.trim() || "";
                          const amount = parts[3]?.trim() || "";
                          const colors = (parts[4] || "#c08080,#a06060").split(",").map(s => s.trim());
                          const imgId = `lineup-img-${sec.id}-${li}`;

                          // 제품명에서 앞부분 컬러 강조
                          const nameParts = productName.split(" ");
                          const accentName = nameParts.slice(0, -1).join(" ");
                          const restName = nameParts[nameParts.length - 1] || "";

                          return (
                            <div key={li} style={{ borderRadius: 16, overflow: "hidden" }}>
                              {/* 상단 컬러 영역 */}
                              <div style={{ background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`, padding: "24px 16px 0", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {/* 말풍선 */}
                                <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 20, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#333333", textAlign: "center", lineHeight: 1.5, marginBottom: 16, position: "relative" }}>
                                  {bubble}
                                  <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid rgba(255,255,255,0.9)" }} />
                                </div>
                                {/* 제품 이미지 */}
                                <div style={{ width: 140, height: 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                                  onClick={() => document.getElementById(imgId)?.click()}>
                                  {sec[`lineupImg_${li}`] ? (
                                    <img src={sec[`lineupImg_${li}`]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                  ) : (
                                    <div style={{ width: 100, height: 140, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>PRODUCT</div>
                                  )}
                                  <input id={imgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`lineupImg_${li}`]: url })); }
                                  }} />
                                </div>
                              </div>
                              {/* 하단 정보 */}
                              <div style={{ padding: "20px 16px 24px", background: isDarkBg ? "#1a1a1a" : "#ffffff", textAlign: "center" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>
                                  <span style={{ color: colors[0], fontWeight: 900 }}>{accentName}</span> {restName}
                                </div>
                                <div style={{ fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", lineHeight: 1.6, marginBottom: 8 }}>{origin}</div>
                                <div {...editable(el)} style={eS(el, { fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666" })}>{amount}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT — 포인트 성분 카드 (배지+헤드라인+둥근카드 2열 원형)
                // ════════════════════════════════════════
                if (layout === "point_ingredient_card") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const descEl = els.find(e => e.role === "body" && !e.role_hint);
                  const ingredCards = els.filter(e => e.role_hint === "ingredient_card");
                  const accentDark = "#2c3e5c";
                  const accentLight = mainColor || "#4a7fb5";

                  return (
                    <div style={{ background: bgCol, padding: "64px 48px 0", position: "relative" }}>
                      {/* POINT 배지 */}
                      {subtitleEl && (
                        <div style={{ textAlign: "center", marginBottom: 36 }}>
                          <span {...editable(subtitleEl)} style={eS(subtitleEl, { display: "inline-block", padding: "8px 24px", background: isDarkBg ? "rgba(255,255,255,0.1)" : "#f0f0f0", borderRadius: 24, fontSize: 14, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888888", letterSpacing: 2 })}>{subtitleEl.content}</span>
                        </div>
                      )}
                      {/* 헤드라인 */}
                      {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 28, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.45, marginBottom: 24 })}>{titleEl.content}</div>}
                      {/* 설명 */}
                      {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.8, marginBottom: 48, whiteSpace: "pre-line" })}>{descEl.content}</div>}
                      {/* 둥근 카드 */}
                      <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#ffffff", borderRadius: 24, padding: isMobile ? "36px 24px" : "48px 40px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${ingredCards.length}, 1fr)`, gap: 40, boxShadow: isDarkBg ? "0 2px 20px rgba(0,0,0,0.1)" : "0 2px 20px rgba(0,0,0,0.04)" }}>
                        {ingredCards.map((el, ci) => {
                          const parts = el.content.split("|");
                          const name = parts[0]?.trim();
                          const desc = parts[1]?.trim() || "";
                          const imgId = `pic-${sec.id}-${ci}`;
                          return (
                            <div key={ci} style={{ textAlign: "center" }}>
                              <div style={{ width: 160, height: 160, borderRadius: "50%", margin: "0 auto 20px", overflow: "hidden", background: isDarkBg ? "rgba(255,255,255,0.06)" : (ci % 2 === 0 ? "#f0f4f0" : "#e8f0f8"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                                onClick={() => document.getElementById(imgId)?.click()}>
                                {sec[`picImg_${ci}`] ? (
                                  <img src={sec[`picImg_${ci}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: isDarkBg ? "rgba(255,255,255,0.12)" : (ci % 2 === 0 ? "linear-gradient(135deg, #d4e8d0, #b8d8b0)" : "linear-gradient(135deg, #d0e4f0, #b0d0e8)") }} />
                                )}
                                <input id={imgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`picImg_${ci}`]: url })); }
                                }} />
                              </div>
                              <div style={{ fontSize: 17, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>{name}</div>
                              <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.7 })}>{desc}</div>
                            </div>
                          );
                        })}
                      </div>
                      {/* 하단 컬러 블록 */}
                      <div style={{ display: "flex", marginTop: 0 }}>
                        <div style={{ flex: 1, height: 12, background: isDarkBg ? "#1e2d44" : accentDark }} />
                        <div style={{ flex: 1, height: 12, background: isDarkBg ? "#2a5580" : accentLight }} />
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT — 미니멀 제품 소개형 (서브+타이틀+이미지+4열 특징)
                // ════════════════════════════════════════
                if (layout === "minimal_product_features") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const descEl = els.find(e => e.role === "body" && !e.role_hint);
                  const featureItems = els.filter(e => e.role_hint === "feature_item");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  const featureIcons = [
                    <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><circle cx="18" cy="18" r="14"/><path d="M18 10v8l5 3"/><path d="M10 26l3-3M26 26l-3-3"/></svg>,
                    <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><path d="M18 6C13 6 8 12 8 18c0 8 10 14 10 14s10-6 10-14c0-6-5-12-10-12z"/><path d="M14 18c0-2.2 1.8-4 4-4"/></svg>,
                    <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><circle cx="18" cy="18" r="10"/><circle cx="18" cy="18" r="4"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4"/></svg>,
                    <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><path d="M12 28c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="14" r="6"/><path d="M28 12l2-2M6 12l-2-2"/><path d="M18 4v2"/></svg>,
                  ];

                  return (
                    <div style={{ background: bgCol, padding: "64px 48px 56px" }}>
                      {/* 서브타이틀 */}
                      {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", marginBottom: 10 })}>{subtitleEl.content}</div>}
                      {/* 대형 타이틀 */}
                      {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 36, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 24, lineHeight: 1.3 })}>{titleEl.content}</div>}
                      {/* 설명 */}
                      {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 48px" })}>{descEl.content}</div>}
                      {/* 제품 이미지 */}
                      <div style={{ width: "100%", maxWidth: 480, height: 340, margin: "0 auto 56px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderRadius: 12, overflow: "hidden" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
                        ) : (
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                            <div style={{ width: 100, height: 240, background: isDarkBg ? "linear-gradient(180deg, #333, #222)" : "linear-gradient(180deg, #e0dcd5, #d0ccc5)", borderRadius: "24px 24px 8px 8px", boxShadow: `0 8px 32px rgba(0,0,0,${isDarkBg ? "0.3" : "0.12"})`, position: "relative" }}>
                              <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 50, height: 60, background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
                            </div>
                            <div style={{ width: 80, height: 260, background: isDarkBg ? "#222222" : "#1a1a1a", borderRadius: 6, boxShadow: `0 8px 32px rgba(0,0,0,${isDarkBg ? "0.4" : "0.15"})`, position: "relative" }}>
                              <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }} />
                            </div>
                          </div>
                        )}
                        {imgButtons()}
                      </div>
                      {/* 4열 특징 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16, borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#e8e8e8"}`, paddingTop: 40 }}>
                        {featureItems.map((el, fi) => (
                          <div key={fi} style={{ textAlign: "center" }}>
                            <div style={{ width: 44, height: 44, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {React.cloneElement(featureIcons[fi % featureIcons.length], { style: { width: 36, height: 36 } })}
                            </div>
                            <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#444444", lineHeight: 1.6 })}>{el.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  POINT / DETAIL (좌우 교차)
                // ════════════════════════════════════════
                if (secType === "point" || secType === "concept" || layout === "left_image_right_text" || layout === "right_image_left_text") {
                  const isOdd = i % 2 === 1;
                  const imgLeft = layout === "left_image_right_text" || (!layout?.includes("right") && isOdd);
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const bodyEls = findEls("body");
                  const badge = els.find(e => e.type === "badge");
                  const pointNum = (() => {
                    const pts = sections.filter((s, si) => si <= i && (s.type === "point" || s.type === "concept"));
                    return pts.length;
                  })();
                  const hasImage = aiImgSrc || productImgForSection;
                  const fallbackImg = images[0]?.preview || null;
                  const displayImgSrc = hasImage ? (aiImgSrc || productImgForSection) : fallbackImg;

                  // ═══ 레이아웃 구조 변형 (dv에 따라 완전히 다른 구조) ═══

                  // 변형: 소프트컬러 배경 + 중앙 타이틀 + 태그 뱃지 + 대형 제품 (레퍼런스 기반)
                  if (dv % 6 === 2) {
                    return (
                      <div style={{ background: `linear-gradient(180deg, ${mainColor}12 0%, ${mainColor}20 40%, ${mainColor}30 100%)`, position: "relative", overflow: "hidden" }}>
                        {/* 배경 워터마크 */}
                        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontSize: 80, fontWeight: 900, color: "rgba(255,255,255,0.15)", letterSpacing: 8, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 0 }}>
                          {(productName || "BRAND").toUpperCase()}
                        </div>
                        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 48px 60px" }}>
                          {/* 영문 서브타이틀 */}
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: mainColor, marginBottom: 16, letterSpacing: 1 })}>{subtitleEl.content}</div>}
                          {/* 대형 타이틀 */}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.45, marginBottom: 28, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>{titleEl.content}</div>}
                          {/* 태그 뱃지 */}
                          {bodyEls.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 48, flexWrap: "wrap" }}>
                              {bodyEls.slice(0, 4).map((el, bi) => (
                                <span key={bi} {...editable(el)} style={eS(el, { padding: "10px 20px", borderRadius: 24, background: mainColor, color: "#fff", fontSize: 13, fontWeight: 700, display: "inline-block" })}>{el.content}</span>
                              ))}
                            </div>
                          )}
                          {/* 대형 제품 이미지 */}
                          <div style={{ width: 280, height: 420, margin: "0 auto", position: "relative" }}>
                            {displayImgSrc ? (
                              <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.1))" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", borderRadius: 16, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                              </div>
                            )}
                            {imgButtons()}
                            {/* 물방울 데코 */}
                            <div style={{ position: "absolute", top: -16, right: -24, width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
                            <div style={{ position: "absolute", top: 40, left: -16, width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
                            <div style={{ position: "absolute", bottom: 80, right: -32, width: 11, height: 11, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 변형 A (dv 1): 풀너비 이미지 상단 + 하단 텍스트 (세로 스택)
                  if (dv % 6 === 1) {
                    return (
                      <div style={{ background: bgCol }}>
                        {/* 풀너비 이미지 — 섹션의 60% */}
                        <div style={{ width: "100%", height: 700, position: "relative", overflow: "hidden" }}>
                          {displayImgSrc ? (
                            <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : renderPlaceholder(700, { borderRadius: 0 })}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.15) 100%)" }} />
                          {imgButtons()}
                        </div>
                        {/* 하단 텍스트 블록 — 중앙 정렬 통일 */}
                        <div style={{ padding: "80px 64px 100px", textAlign: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3 }}>POINT {String(pointNum).padStart(2, "0")}</span>
                          {decoLine(mainColor, 32)}
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 24 })}>{titleEl.content}</div>}
                          {bodyEls.map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#555", lineHeight: 1.9, marginBottom: 14, maxWidth: 560, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // 변형 B (dv 3): 이미지 배경 풀스크린 + 텍스트 오버레이 (잡지 스타일)
                  if (dv % 6 === 3) {
                    return (
                      <div style={{ width: "100%", minHeight: 1260, position: "relative", overflow: "hidden", background: isDarkBg ? bgCol : "#111" }}>
                        {displayImgSrc ? (
                          <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.7 }} />
                        ) : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${mainColor}30, #1a1a2e)` }} />}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)" }} />
                        <div style={{ position: "relative", zIndex: 2, padding: "0 64px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 140 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, marginBottom: 20, display: "block" }}>POINT {String(pointNum).padStart(2, "0")}</span>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: 2, marginBottom: 16 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 28, maxWidth: 500 })}>{titleEl.content}</div>}
                          {bodyEls.map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, marginBottom: 12, maxWidth: 480 })}>{el.content}</div>
                          ))}
                        </div>
                        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
                        </div>
                        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                      </div>
                    );
                  }

                  // ═══ 변형 4: 중앙 정렬 카드 (이미지 위 + 텍스트 아래, 배경 패턴) ═══
                  if (dv % 6 === 4) {
                    return (
                      <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "120px 64px", position: "relative", overflow: "hidden" }}>
                        {/* 미세한 도트 패턴 배경 */}
                        <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none", backgroundImage: `radial-gradient(${isDarkBg ? "#fff" : "#000"} 1px, transparent 1px)`, backgroundSize: "20px 20px" }} />
                        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
                          {/* 넘버 배지 */}
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
                            <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4 }}>POINT {String(pointNum).padStart(2, "0")}</span>
                            <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
                          </div>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12, letterSpacing: 1 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 26 : 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 20 })}>{titleEl.content}</div>}
                          {bodyEls.map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 10 })}>{el.content}</div>
                          ))}
                          {/* 둥근 모서리 이미지 카드 */}
                          <div style={{ marginTop: 40, borderRadius: 20, overflow: "hidden", boxShadow: isDarkBg ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.08)", position: "relative" }}>
                            {displayImgSrc ? (
                              <img src={displayImgSrc} alt="" style={{ width: "100%", height: isMobile ? 300 : 450, objectFit: "cover" }} />
                            ) : renderPlaceholder(isMobile ? 300 : 450, { borderRadius: 0 })}
                            {imgButtons()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ═══ 변형 5: 숫자 강조형 (대형 넘버 + 설명 + 하단 이미지 스트립) ═══
                  if (dv % 6 === 5) {
                    return (
                      <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "120px 64px", position: "relative" }}>
                        <div style={{ maxWidth: 700, margin: "0 auto" }}>
                          {/* 대형 넘버 */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 20 : 40, marginBottom: 48 }}>
                            <span style={{ fontSize: isMobile ? 72 : 100, fontWeight: 900, color: mainColor, lineHeight: 1, fontFamily: "Georgia, serif", flexShrink: 0, opacity: 0.8 }}>
                              {String(pointNum).padStart(2, "0")}
                            </span>
                            <div style={{ paddingTop: isMobile ? 8 : 16 }}>
                              {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 8, letterSpacing: 1 })}>{subtitleEl.content}</div>}
                              {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 16 })}>{titleEl.content}</div>}
                              {bodyEls.map((el, bi) => (
                                <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 8 })}>{el.content}</div>
                              ))}
                            </div>
                          </div>
                          {/* 풀 너비 이미지 */}
                          <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
                            {displayImgSrc ? (
                              <img src={displayImgSrc} alt="" style={{ width: "100%", height: isMobile ? 280 : 400, objectFit: "cover" }} />
                            ) : renderPlaceholder(isMobile ? 280 : 400, { borderRadius: 0 })}
                            {imgButtons()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ═══ 변형 0: "Choice XX" 스타일 (A;ROUND 레퍼런스) ═══
                  // 50:50 — 왼쪽 제품 이미지(깔끔) + 오른쪽 Choice 넘버링 + 영문 타이틀 + 한글 설명

                  const textBlock = (
                    <div style={{ flex: "0 0 50%", padding: isMobile ? "48px 24px" : "80px 48px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left" }}>
                      {/* Choice 넘버링 */}
                      <div style={{ marginBottom: 20 }}>
                        <span style={{ fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#aaa", letterSpacing: 1, fontFamily: "'Georgia', serif" }}>
                          Choice {String(pointNum).padStart(2, "0")}.
                        </span>
                      </div>
                      {badge && (
                        <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 16px", borderRadius: 24, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 18, alignSelf: "flex-start", border: `1px solid ${mainColor}20` })}>
                          {badge.content}
                        </span>
                      )}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12, letterSpacing: 1, textAlign: "left" })}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {/* 타이틀 — 큰 볼드 */}
                      {titleEl && (
                        <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 30, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25, marginBottom: 12, textAlign: "left", letterSpacing: -0.5 })}>
                          {titleEl.content}
                        </div>
                      )}
                      {/* 서브타이틀 */}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 500, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", marginBottom: 20, textAlign: "left", lineHeight: 1.6 })}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {/* 설명 텍스트 */}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.6)" : "#666"), lineHeight: 1.8, marginBottom: 10, textAlign: "left" })}>
                          {el.content}
                        </div>
                      ))}
                      {!subtitleEl && !titleEl && bodyEls.length === 0 && els.filter(e => e.type === "text").map((el, ei) => (
                        <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.fontWeight === "900" ? 32 : el.fontWeight === "700" ? 16 : 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: el.fontWeight === "900" ? 1.25 : 1.9, marginBottom: el.fontWeight === "900" ? 24 : 12, textAlign: "left" })}>
                          {el.content}
                        </div>
                      ))}
                    </div>
                  );

                  // 이미지 블록 — 레퍼런스 스타일: 깔끔한 제품 이미지, 오버레이 최소화
                  const imgMinH = 700;
                  const showImgNum = false;
                  const imgOverlay = "none";

                  const imageBlock = displayImgSrc ? (
                    <div style={{ flex: "0 0 50%", minHeight: imgMinH, position: "relative", overflow: "hidden" }}>
                      {hasImage ? renderPlaceholder(imgMinH, { borderRadius: 0 }) : (
                        <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, background: imgOverlay, pointerEvents: "none" }} />
                      {showImgNum && <div style={{ position: "absolute", bottom: 32, [imgLeft ? "right" : "left"]: 32, pointerEvents: "none" }}>
                        <span style={{ fontSize: 96, fontWeight: 900, color: "rgba(255,255,255,0.12)", fontFamily: "'Georgia', serif", lineHeight: 1, letterSpacing: -4 }}>
                          {String(pointNum).padStart(2, "0")}
                        </span>
                      </div>}
                      {/* 이미지 교체 버튼 */}
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          교체
                        </label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            AI 생성
                          </button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  ) : (
                    <div style={{ flex: "0 0 50%", minHeight: 600, position: "relative", overflow: "hidden", background: `linear-gradient(145deg, ${mainColor}15, ${mainColor}08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 120, fontWeight: 900, color: `${mainColor}12`, fontFamily: "'Georgia', serif", lineHeight: 1, letterSpacing: -6 }}>
                          {String(pointNum).padStart(2, "0")}
                        </div>
                        <div style={{ width: 60, height: 3, background: mainColor, margin: "16px auto 0", borderRadius: 2 }} />
                      </div>
                      <div style={{ position: "absolute", top: 30, right: 30, width: 100, height: 100, border: `1px solid ${mainColor}10`, borderRadius: "50%" }} />
                      <div style={{ position: "absolute", bottom: 40, left: 40, width: 60, height: 60, border: `1px solid ${mainColor}08`, borderRadius: "50%" }} />
                      <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.15)", color: isDarkBg ? "#fff" : "#666", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          + 이미지
                        </label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            AI 생성
                          </button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  );

                  return (
                    <div style={{ display: "flex", minHeight: isMobile ? "auto" : 1260, background: bgCol.startsWith("linear-gradient") ? bgCol : bgCol, flexDirection: isMobile ? "column" : (imgLeft ? "row" : "row-reverse") }}>
                      {imageBlock}
                      {textBlock}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  REVIEWS (카드 스타일)
                // ════════════════════════════════════════
                if (secType === "review" || layout === "card_list") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const badge = els.find(e => e.type === "badge");
                  const reviewEls = els.filter(e => e.role === "review_text" || e.role === "review_name" || e.role === "star");
                  const cards = [];
                  reviewEls.forEach(el => {
                    if (el.role === "review_name" || cards.length === 0) {
                      cards.push([]);
                    }
                    if (cards.length > 0) cards[cards.length - 1].push(el);
                  });
                  // 빈 카드 제거
                  const filteredCards = cards.filter(c => c.some(e => e.role === "review_name"));
                  const profileColors = [mainColor, "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9"];
                  const reviewBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  // 평균 별점 계산
                  const avgStar = (() => {
                    const stars = reviewEls.filter(e => e.role === "star").map(e => parseInt(e.content) || 5);
                    return stars.length ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1) : "4.9";
                  })();
                  // ═══ 변형: 심플 세로 리뷰 (이미지 없음, 인용문 스타일) ═══
                  if (dv % 6 >= 3) {
                    return (
                      <div style={{ background: reviewBg, padding: isMobile ? "80px 24px" : "100px 64px" }}>
                        <div style={{ textAlign: "center", marginBottom: 48 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 })}>{subtitleEl.content}</div>}
                          {titleEl ? <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25 })}>{titleEl.content}</div> : <div style={{ fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a" }}>REAL REVIEW</div>}
                          {/* 평균 별점 */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
                            <span style={{ fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a" }}>{avgStar}</span>
                            <div style={{ display: "flex", gap: 2 }}>
                              {Array.from({ length: 5 }, (_, si) => <span key={si} style={{ fontSize: 18, color: si < Math.round(parseFloat(avgStar)) ? "#fbbf24" : (isDarkBg ? "rgba(255,255,255,0.15)" : "#e0e0e0") }}>{String.fromCharCode(9733)}</span>)}
                            </div>
                          </div>
                        </div>
                        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
                          {filteredCards.map((group, gi) => (
                            <div key={gi} style={{ padding: "28px 32px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, position: "relative" }}>
                              <div style={{ position: "absolute", top: 20, right: 24, fontSize: 40, color: `${mainColor}12`, fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>"</div>
                              {group.filter(e => e.role === "review_text").map((el, ri) => (
                                <div key={ri} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.8, marginBottom: 16 })}>{el.content}</div>
                              ))}
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {group.filter(e => e.role === "review_name").map((el, ni) => (
                                  <div key={ni} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${profileColors[gi % profileColors.length]}, ${profileColors[(gi + 2) % profileColors.length]}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{(el.content || "?")[0]}</div>
                                    <div>
                                      <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "#fff" : "#333" })}>{el.content}</div>
                                      <div style={{ display: "flex", gap: 1 }}>{Array.from({ length: 5 }, (_, si) => <span key={si} style={{ fontSize: 11, color: si < 5 ? "#fbbf24" : "#e0e0e0" }}>{String.fromCharCode(9733)}</span>)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 리뷰 (이미지 배너 + 카드 그리드) ═══
                  return (
                    <div style={{ background: reviewBg, position: "relative", overflow: "hidden" }}>
                      {/* 상단 이미지 띠 + 별점 오버레이 */}
                      <div style={{ width: "100%", height: 420, position: "relative", overflow: "hidden" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5)" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}30, ${mainColor}10)` }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }} />
                        {/* 별점 오버레이 */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 56px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <div>
                            {badge && (
                              <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 18px", borderRadius: 20, background: mainColor, color: "#fff", fontSize: 11, fontWeight: 800, marginBottom: 12, letterSpacing: 2 })}>
                                {badge.content}
                              </span>
                            )}
                            {subtitleEl && (
                              <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 })}>
                                {subtitleEl.content}
                              </div>
                            )}
                            {titleEl ? (
                              <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1.25, textShadow: "0 2px 12px rgba(0,0,0,0.3)" })}>
                                {titleEl.content}
                              </div>
                            ) : (
                              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>REAL REVIEW</div>
                            )}
                          </div>
                          <div style={{ textAlign: "center", flexShrink: 0 }}>
                            <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>{avgStar}</div>
                            <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 6 }}>
                              {Array.from({ length: 5 }, (_, si) => (
                                <span key={si} style={{ fontSize: 16, color: si < Math.round(parseFloat(avgStar)) ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>{String.fromCharCode(9733)}</span>
                              ))}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 600 }}>{filteredCards.length}개 리뷰</div>
                          </div>
                        </div>
                        {/* 이미지 교체 버튼 */}
                        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
                        </div>
                        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                      </div>
                      {/* 리뷰 카드 그리드 */}
                      <div style={{ padding: isMobile ? "40px 20px 60px" : "60px 56px 80px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : (filteredCards.length >= 3 ? "repeat(3, 1fr)" : filteredCards.length === 2 ? "1fr 1fr" : "1fr"), gap: 20, maxWidth: 820, margin: "0 auto" }}>
                          {filteredCards.map((group, gi) => (
                            <div key={gi} style={{ padding: "28px 24px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", boxShadow: isDarkBg ? "0 2px 12px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.06)", position: "relative", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
                              {/* 따옴표 장식 */}
                              <div style={{ position: "absolute", top: 16, right: 20, fontSize: 36, color: `${mainColor}15`, fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>"</div>
                              {/* 프로필 + 이름 + 별점 */}
                              {group.filter(e => e.role === "review_name").map((el, ni) => (
                                <div key={ni} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${profileColors[gi % profileColors.length]}, ${profileColors[(gi + 2) % profileColors.length]}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: `0 2px 8px ${profileColors[gi % profileColors.length]}30` }}>
                                    {(el.content || "?")[0]}
                                  </div>
                                  <div>
                                    <div {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "#fff" : "#333", marginBottom: 3 })}>
                                      {el.content}
                                    </div>
                                    {(() => {
                                      const star = group.find(e => e.role === "star");
                                      const count = star ? (parseInt(star.content) || 5) : 5;
                                      return (
                                        <div style={{ display: "flex", gap: 1 }}>
                                          {Array.from({ length: 5 }, (_, si) => (
                                            <span key={si} style={{ fontSize: 13, color: si < count ? "#fbbf24" : (isDarkBg ? "rgba(255,255,255,0.1)" : "#e0e0e0") }}>
                                              {String.fromCharCode(9733)}
                                            </span>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ))}
                              {/* 후기 텍스트 */}
                              {group.filter(e => e.role === "review_text").map((el, ri) => (
                                <div key={ri} {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.75)" : "#444", lineHeight: 1.8, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" })}>
                                  {el.content}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  STATS HIGHLIGHT (숫자 강조)
                // ════════════════════════════════════════
                if (secType === "stats_highlight") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const statNums = findEls("stat_number");
                  const statLabels = findEls("stat_label");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const extractPercent = (content) => {
                    const num = parseFloat((content || "").replace(/[^0-9.]/g, ""));
                    if (isNaN(num)) return 75;
                    if (num > 100) return Math.min(100, (num / 10000) * 100 || 75);
                    return Math.min(100, num);
                  };
                  // ═══ 변형: 좌측 수치 카드 스택 + 우측 대형 제품 (레퍼런스 기반) ═══
                  if (dv % 6 === 3 && statNums.length >= 2) {
                    const accentColor = mainColor || "#c0392b";
                    return (
                      <div style={{ background: `linear-gradient(180deg, ${mainColor}10 0%, ${mainColor}25 50%, ${mainColor}35 100%)`, padding: "80px 48px 60px", position: "relative", overflow: "hidden" }}>
                        {/* 상단 타이틀 */}
                        <div style={{ textAlign: "center", marginBottom: 48 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 15, fontWeight: 600, color: `${mainColor}aa`, marginBottom: 10, letterSpacing: 1 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.2, marginBottom: 20 })}>{titleEl.content}</div>}
                          {findEls("body").length > 0 && (
                            <div>
                              <span style={{ fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666" }}>인체적용 실험으로 입증된 </span>
                              <span {...editable(findEls("body")[0])} style={eS(findEls("body")[0], { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a" })}>{findEls("body")[0].content}</span>
                            </div>
                          )}
                        </div>
                        {/* 본문: 좌측 수치 + 우측 제품 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 720, margin: "0 auto" }}>
                          {/* 좌측: 수치 카드 스택 */}
                          <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                            {statNums.map((sn, si) => (
                              <div key={si}>
                                <div style={{ width: 200, padding: "24px 20px", borderRadius: 24, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)", textAlign: "center", border: "1px solid rgba(255,255,255,0.6)" }}>
                                  {statLabels[si] && <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#888", marginBottom: 8, lineHeight: 1.5 })}>{statLabels[si].content}</div>}
                                  <div {...editable(sn)} style={eS(sn, { fontSize: 34, fontWeight: 900, color: accentColor, letterSpacing: -1 })}>{sn.content}</div>
                                </div>
                                {si < statNums.length - 1 && (
                                  <div style={{ textAlign: "center", padding: "6px 0", fontSize: 18, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#ddd", fontWeight: 300 }}>+</div>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* 우측: 대형 제품 이미지 */}
                          <div style={{ flex: "0 0 55%", position: "relative", height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {productImg ? (
                              <img src={productImg} alt="" style={{ maxWidth: "85%", maxHeight: "100%", objectFit: "contain", transform: "rotate(-5deg)", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.1))" }} />
                            ) : (
                              <div style={{ width: 240, height: 360, borderRadius: 20, background: `linear-gradient(135deg, ${mainColor}20, ${mainColor}08)`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-5deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                              </div>
                            )}
                            {imgButtons()}
                            <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 180, height: 30, borderRadius: "50%", background: `${mainColor}12`, filter: "blur(16px)" }} />
                          </div>
                        </div>
                        {/* 하단 출처 */}
                        <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
                          {findEls("body").slice(1).map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbb", lineHeight: 1.8 })}>{el.content}</div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 stats 렌더러 (프로그레스 바 포함) ═══
                  const statsBg = bgCol || "#fff";
                  return (
                    <div style={{ background: statsBg, position: "relative", overflow: "hidden" }}>
                      <div style={{ padding: isMobile ? "80px 24px" : "120px 56px" }}>
                        <div style={{ textAlign: "center", marginBottom: 64 }}>
                          {subtitleEl && (
                            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 5, textTransform: "uppercase", marginBottom: 14 })}>
                              {subtitleEl.content}
                            </div>
                          )}
                          {titleEl && (
                            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25 })}>
                              {titleEl.content}
                            </div>
                          )}
                          {decoLine(mainColor, 48)}
                        </div>
                        {/* 숫자가 1개면 대형 원형 차트 포커스 */}
                        {statNums.length === 1 ? (
                          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
                            {/* 원형 프로그레스 */}
                            <div style={{ width: 260, height: 260, margin: "0 auto 32px", position: "relative" }}>
                              <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="130" cy="130" r="110" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.06)" : "#f0f0f0"} strokeWidth="14" />
                                <circle cx="130" cy="130" r="110" fill="none" stroke={mainColor} strokeWidth="14"
                                  strokeDasharray={`${2 * Math.PI * 110 * extractPercent(statNums[0].content) / 100} ${2 * Math.PI * 110}`}
                                  strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                              </svg>
                              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <div {...editable(statNums[0])} style={eS(statNums[0], { fontSize: 36, fontWeight: 900, color: mainColor, lineHeight: 1 })}>
                                  {statNums[0].content}
                                </div>
                              </div>
                            </div>
                            {statLabels[0] && (
                              <div {...editable(statLabels[0])} style={eS(statLabels[0], { fontSize: 20, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#888", marginBottom: 40 })}>
                                {statLabels[0].content}
                              </div>
                            )}
                            {findEls("body").map((el, bi) => (
                              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", lineHeight: 1.8, marginBottom: 14 })}>
                                {el.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "center", gap: 0, maxWidth: 800, margin: "0 auto" }}>
                            {statNums.map((sn, si) => {
                              const pct = extractPercent(sn.content);
                              return (
                                <div key={si} style={{ textAlign: "center", flex: 1, padding: isMobile ? "28px 16px" : "40px 24px", borderRight: (!isMobile && si < statNums.length - 1) ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` : "none", borderBottom: (isMobile && si < statNums.length - 1) ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` : "none" }}>
                                  <div {...editable(sn)} style={eS(sn, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: mainColor, lineHeight: 1, marginBottom: 12, letterSpacing: -2 })}>
                                    {sn.content}
                                  </div>
                                  {/* 수평 프로그레스 바 */}
                                  <div style={{ width: "80%", maxWidth: 160, height: 6, borderRadius: 3, background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f0f0f0", margin: "0 auto 14px", overflow: "hidden" }}>
                                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${mainColor}, ${mainColor}cc)`, transition: "width 1s ease" }} />
                                  </div>
                                  {statLabels[si] && (
                                    <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: isMobile ? 13 : 15, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" })}>
                                      {statLabels[si].content}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  PROCESS — 성분 메커니즘 3스텝
                // ════════════════════════════════════════
                if (layout === "mechanism_steps") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const descEl = els.find(e => e.role === "body" && !e.role_hint);
                  const mechSteps = els.filter(e => e.role_hint === "mech_step");
                  const footnoteEl = els.find(e => e.role_hint === "footnote");
                  const accentColor = mainColor || "#4a9fd5";

                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    return text.split(/(\[.*?\])/g).map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <strong key={pi} style={{ fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
                      : p
                    );
                  };

                  const stepIcons = [
                    <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><circle cx="20" cy="14" r="10"/><path d="M20 24v8"/><path d="M16 28h8"/></svg>,
                    <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><path d="M20 6C15 6 10 14 10 20c0 6 4.5 10 10 10s10-4 10-10c0-6-5-14-10-14z"/><path d="M14 22h12M17 26h6"/></svg>,
                    <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><path d="M8 30l6-8 6 4 6-10 6 6"/><rect x="6" y="8" width="28" height="24" rx="3"/></svg>,
                  ];

                  return (
                    <div style={{ background: bgCol, padding: "64px 48px 48px" }}>
                      {/* POINT 넘버 */}
                      {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 16, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", letterSpacing: 3, marginBottom: 16 })}>{subtitleEl.content}</div>}
                      {/* 2줄 헤드라인 */}
                      {titleEl && (() => {
                        const lines = (titleEl.content || "").split("\n");
                        return (
                          <div style={{ textAlign: "center", marginBottom: 28 }}>
                            {lines[0] && <div style={{ fontSize: 22, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", marginBottom: 4 }}>{lines[0]}</div>}
                            {lines[1] && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{lines[1]}</div>}
                          </div>
                        );
                      })()}
                      {/* 설명 */}
                      {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666", lineHeight: 1.8, marginBottom: 48 })}>{renderBoldBracket(descEl.content)}</div>}

                      {/* 3스텝 */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 0, position: "relative", marginBottom: 40 }}>
                        {/* 연결선 */}
                        {!isMobile && <div style={{ position: "absolute", top: 16, left: "16.66%", right: "16.66%", height: 1, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#dddddd", zIndex: 0 }} />}

                        {mechSteps.map((el, si) => {
                          const parts = el.content.split("|");
                          const stepTitle = parts[0]?.trim();
                          const stepDesc = parts[1]?.trim() || "";
                          return (
                            <div key={si} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                              {/* 넘버 */}
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: isDarkBg ? `${accentColor}cc` : accentColor, color: "#ffffff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{si + 1}</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: accentColor, marginBottom: 10 }}>{stepTitle}</div>
                              <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.7, padding: "0 8px" })}>{stepDesc}</div>
                              {/* 일러스트 영역 */}
                              <div style={{ marginTop: 24, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: 100, height: 120, background: isDarkBg ? `${accentColor}15` : `${accentColor}12`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}
                                  onClick={() => document.getElementById(`mech-img-${sec.id}-${si}`)?.click()}>
                                  {sec[`mechImg_${si}`] ? (
                                    <img src={sec[`mechImg_${si}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    React.cloneElement(stepIcons[si % stepIcons.length], { style: { width: 40, height: 40 } })
                                  )}
                                  <input id={`mech-img-${sec.id}-${si}`} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, idx) => idx !== i ? s : { ...s, [`mechImg_${si}`]: url })); }
                                  }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 참고 문구 */}
                      {footnoteEl && <div {...editable(footnoteEl)} style={eS(footnoteEl, { textAlign: "center", fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#cccccc", marginTop: 24 })}>{footnoteEl.content}</div>}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  HOW TO USE / PROCESS STEPS
                // ════════════════════════════════════════
                if (secType === "howto" || secType === "process_steps") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const stepEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  const steps = [];
                  stepEls.forEach((el, idx) => {
                    if (el.fontWeight === "700" || el.fontWeight === "900" || idx % 2 === 0) {
                      steps.push({ title: el, body: null });
                    } else if (steps.length > 0 && !steps[steps.length - 1].body) {
                      steps[steps.length - 1].body = el;
                    } else {
                      steps.push({ title: el, body: null });
                    }
                  });
                  const getStepImg = (idx) => sec[`iconImg_${idx}`] || (images.length > 0 ? images[idx % images.length]?.preview : null);
                  // ═══ 변형: 세로 타임라인 (dv >= 3) ═══
                  if (dv % 6 >= 3) {
                    return (
                      <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "100px 56px" }}>
                        <div style={{ textAlign: "center", marginBottom: 48 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>{subtitleEl.content}</div>}
                          {titleEl ? <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>{titleEl.content}</div> : <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>HOW TO USE</div>}
                          {decoLine(mainColor)}
                        </div>
                        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
                          {/* 세로 타임라인 */}
                          <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 2, background: isDarkBg ? "rgba(255,255,255,0.08)" : `${mainColor}15` }} />
                          {steps.map((step, si) => (
                            <div key={si} style={{ display: "flex", gap: 24, marginBottom: 32, position: "relative" }}>
                              <div style={{ width: 50, height: 50, borderRadius: "50%", background: mainColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: `0 4px 12px ${mainColor}30` }}>
                                <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{si + 1}</span>
                              </div>
                              <div style={{ paddingTop: 8 }}>
                                {step.title && <div {...editable(step.title)} style={eS(step.title, { fontSize: 17, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 6 })}>{step.title.content}</div>}
                                {step.body && <div {...editable(step.body)} style={eS(step.body, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7 })}>{step.body.content}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 howto (좌우 교차) ═══
                  return (
                    <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "100px 56px" }}>
                      <div style={{ textAlign: "center", marginBottom: 56 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl ? (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        ) : (
                          <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>HOW TO USE</div>
                        )}
                        {decoLine(mainColor)}
                      </div>
                      <div style={{ maxWidth: 680, margin: "0 auto" }}>
                        {steps.map((step, si) => {
                          const stepImg = getStepImg(si);
                          const stepImgId = `step-img-${sec.id}-${si}`;
                          const isEven = si % 2 === 0;
                          return (
                            <div key={si} style={{ display: "flex", gap: 0, marginBottom: si < steps.length - 1 ? 4 : 0, flexDirection: isEven ? "row" : "row-reverse", minHeight: 180 }}>
                              {/* 이미지 영역 */}
                              <div style={{ flex: "0 0 45%", position: "relative", overflow: "hidden", borderRadius: isEven ? "16px 0 0 16px" : "0 16px 16px 0", cursor: "pointer", background: `linear-gradient(135deg, ${mainColor}10, ${mainColor}05)` }}
                                onClick={() => document.getElementById(stepImgId)?.click()}>
                                {stepImg ? (
                                  <img src={stepImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 180 }} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    <span style={{ fontSize: 48, fontWeight: 900, color: `${mainColor}15`, fontFamily: "Georgia, serif" }}>
                                      {String(si + 1).padStart(2, "0")}
                                    </span>
                                    <span style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#ccc", fontWeight: 600 }}>+ 이미지</span>
                                  </div>
                                )}
                                {stepImg && <div style={{ position: "absolute", inset: 0, background: isEven ? "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.3))" : "linear-gradient(to left, transparent 60%, rgba(0,0,0,0.3))" }} />}
                                <input id={stepImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    setSections(prev => prev.map((s, sidx) => sidx !== i ? s : { ...s, [`iconImg_${si}`]: url }));
                                  }
                                }} />
                              </div>
                              {/* 텍스트 영역 */}
                              <div style={{ flex: "0 0 55%", padding: "32px 36px", display: "flex", alignItems: "center" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mainColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, flexShrink: 0, boxShadow: `0 4px 14px ${mainColor}30` }}>
                                      {si + 1}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase" }}>STEP {String(si + 1).padStart(2, "0")}</span>
                                  </div>
                                  {step.title && (
                                    <div {...editable(step.title)} style={eS(step.title, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 14, lineHeight: 1.4 })}>
                                      {step.title.content}
                                    </div>
                                  )}
                                  {step.body && (
                                    <div {...editable(step.body)} style={eS(step.body, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.8 })}>
                                      {step.body.content}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  TRUST / CERTIFICATION
                // ════════════════════════════════════════
                if (secType === "cert" || secType === "facility") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const statNums = findEls("stat_number");
                  const statLabels = findEls("stat_label");
                  const bodyEls = els.filter(e => e.type === "text" && e.role === "body");
                  const hasStat = statNums.length > 0;
                  return (
                    <div style={{ background: bgCol, padding: "160px 64px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLineLong()}
                      </div>
                      {hasStat ? (
                        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", marginBottom: bodyEls.length ? 32 : 0 }}>
                          {statNums.map((sn, si) => (
                            <div key={si} style={{ textAlign: "center", minWidth: 120 }}>
                              <div {...editable(sn)} style={eS(sn, { fontSize: 52, fontWeight: 900, color: mainColor, lineHeight: 1.1, marginBottom: 8 })}>
                                {sn.content}
                              </div>
                              {statLabels[si] && (
                                <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" })}>
                                  {statLabels[si].content}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                          {els.filter(e => e.type !== "divider" && e.role !== "title" && e.role !== "subtitle").map((el, ei) => (
                            <div key={ei} style={{ padding: "20px 28px", borderRadius: 14, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, textAlign: "center", minWidth: 140, boxShadow: "0 1px 8px rgba(0,0,0,0.03)" }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                                <span style={{ fontSize: 18, color: mainColor }}>✓</span>
                              </div>
                              <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: el.fontWeight || "600", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.6 })}>
                                {el.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={eS(el, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", lineHeight: 1.8, marginTop: 16, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>
                          {el.content}
                        </div>
                      ))}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  COMPARISON — 3열 상세 비교표 (Biodance 스타일)
                // ════════════════════════════════════════
                if (layout === "detail_compare_table") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const badgeEl = els.find(e => e.type === "badge");
                  const colHeadersEl = els.find(e => e.role_hint === "col_headers");
                  const tableRows = els.filter(e => e.role_hint === "table_row");
                  const colHeaders = (colHeadersEl?.content || "").split("|").map(s => s.trim());

                  const renderBoldBracket = (text) => {
                    if (!text) return null;
                    const parts = text.split(/(\[.*?\])/g);
                    return parts.map((p, pi) => p.startsWith("[") && p.endsWith("]")
                      ? <strong key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
                      : p.includes("\n") ? p.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : p
                    );
                  };

                  return (
                    <div style={{ background: bgCol, padding: "64px 48px 56px" }}>
                      {/* 영문 서브 */}
                      {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", marginBottom: 16 })}>{subtitleEl.content}</div>}
                      {/* 헤드라인 */}
                      {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 28, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", lineHeight: 1.55, marginBottom: 48 })}>{renderBoldBracket(titleEl.content)}</div>}

                      {/* 테이블 */}
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        {/* 헤더 */}
                        <thead>
                          <tr>
                            <td style={{ width: 60, padding: "0 0 12px" }} />
                            {colHeaders.map((h, hi) => (
                              <td key={hi} style={{ textAlign: "center", padding: "0 0 12px", verticalAlign: "bottom" }}>
                                {hi === colHeaders.length - 1 && badgeEl && (
                                  <div style={{ display: "inline-block", border: `1.5px solid ${isDarkBg ? "rgba(255,255,255,0.7)" : "#1a1a1a"}`, padding: "4px 16px", fontSize: 13, fontWeight: 700, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8, letterSpacing: 1 }}>
                                    {badgeEl.content}
                                  </div>
                                )}
                                <div style={{ fontSize: 18, fontWeight: hi === colHeaders.length - 1 ? 900 : 800, color: hi === colHeaders.length - 1 ? (isDarkBg ? "#ffffff" : "#1a1a1a") : (isDarkBg ? "rgba(255,255,255,0.6)" : "#333333") }}>{h}</div>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((rowEl, ri) => {
                            const cells = rowEl.content.split("|").map(s => s.trim());
                            const rowLabel = cells[0];
                            const isEven = ri % 2 === 1;
                            return (
                              <tr key={ri}>
                                <td style={{ fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#888888", padding: "20px 16px", textAlign: "left", verticalAlign: "middle", borderRight: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "#eeeeee"}`, background: isEven ? (isDarkBg ? "rgba(255,255,255,0.02)" : "#fafafa") : "transparent" }}>{rowLabel}</td>
                                {cells.slice(1).map((cell, ci) => {
                                  const isLast = ci === cells.length - 2;
                                  return (
                                    <td key={ci} style={{
                                      textAlign: "center", padding: "20px 16px", verticalAlign: "middle",
                                      fontSize: 14, color: isLast ? (isDarkBg ? "rgba(255,255,255,0.8)" : "#333333") : (isDarkBg ? "rgba(255,255,255,0.65)" : "#555555"),
                                      fontWeight: isLast ? 600 : 400, lineHeight: 1.6,
                                      borderRight: ci < cells.length - 2 ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "#f0f0f0"}` : "none",
                                      background: isLast
                                        ? (isEven ? (isDarkBg ? "rgba(255,255,255,0.05)" : "#f5f5f5") : (isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)"))
                                        : (isEven ? (isDarkBg ? "rgba(255,255,255,0.02)" : "#fafafa") : "transparent"),
                                    }}>
                                      {isLast ? <strong style={{ fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{cell}</strong> : cell}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  COMPARISON (비교표)
                // ════════════════════════════════════════
                if (secType === "comparison") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  const rows = bodyEls.map(el => {
                    const parts = (el.content || "").split("|").map(s => s.trim());
                    return { el, label: parts[0] || "", before: parts[1] || "", after: parts[2] || "" };
                  });
                  const productImg = images[0]?.preview || null;

                  // ═══ 변형: 3열 비교표 (항목/경쟁사/자사 — 자사 컬러 테두리 강조) (레퍼런스 기반) ═══
                  if (dv % 6 === 3 && rows.length >= 3) {
                    return (
                      <div style={{ background: `${mainColor}10`, padding: "80px 56px 100px", position: "relative", overflow: "hidden", minHeight: 1260 }}>
                        {/* 브랜드 워터마크 */}
                        <div style={{ position: "absolute", top: 40, right: 40, fontSize: 56, fontWeight: 900, color: "rgba(255,255,255,0.2)", letterSpacing: 4, pointerEvents: "none" }}>
                          {(productName || "BRAND").toUpperCase()}
                        </div>
                        {/* 타이틀 */}
                        <div style={{ textAlign: "center", marginBottom: 40 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, marginBottom: 10 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3 })}>{titleEl.content}</div>}
                        </div>
                        {/* 3열 비교표 */}
                        <div style={{ maxWidth: 700, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                          {/* 헤더 */}
                          <div style={{ display: "flex" }}>
                            <div style={{ flex: "0 0 120px", padding: "18px 16px", background: `${mainColor}18`, textAlign: "center" }} />
                            <div style={{ flex: 1, padding: "18px 16px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f5f5", textAlign: "center", fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" }}>일반 제품</div>
                            <div style={{ flex: "1.2", padding: "18px 16px", background: isDarkBg ? "rgba(255,255,255,0.08)" : "#fff", textAlign: "center", fontSize: 13, fontWeight: 800, color: mainColor, border: `2px solid ${mainColor}`, borderBottom: "none", borderRadius: "12px 12px 0 0" }}>우리 제품</div>
                          </div>
                          {/* 행들 */}
                          {rows.map((row, ri) => (
                            <div key={ri} style={{ display: "flex", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "#e8ede8"}` }}>
                              <div style={{ flex: "0 0 120px", padding: "22px 14px", background: `${mainColor}18`, textAlign: "center", fontSize: 13, fontWeight: 800, color: isDarkBg ? "#fff" : "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {row.label}
                              </div>
                              <div style={{ flex: 1, padding: "22px 16px", background: isDarkBg ? "rgba(255,255,255,0.02)" : "#f5f5f5", textAlign: "center", fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.6 }}>
                                {row.before}
                              </div>
                              <div {...editable(row.el)} style={eS(row.el, { flex: "1.2", padding: "22px 16px", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#fff", textAlign: "center", fontSize: 13, color: isDarkBg ? "#fff" : "#333", borderLeft: `2px solid ${mainColor}`, borderRight: `2px solid ${mainColor}`, borderBottom: ri === rows.length - 1 ? `2px solid ${mainColor}` : "none", borderRadius: ri === rows.length - 1 ? "0 0 12px 0" : "0", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.6, fontWeight: 600 })}>
                                {row.after}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 비교표 ═══
                  return (
                    <div style={{ background: bgCol, padding: "0 0 64px" }}>
                      {/* 상단 제품 이미지 영역 */}
                      <div style={{ width: "100%", height: 180, position: "relative", overflow: "hidden", marginBottom: 48 }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4)" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}25, ${mainColor}08)` }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          {subtitleEl && (
                            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: productImg ? "#fff" : mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
                              {subtitleEl.content}
                            </div>
                          )}
                          {titleEl && (
                            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: productImg ? "#fff" : (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.3, textShadow: productImg ? "0 2px 12px rgba(0,0,0,0.3)" : "none" })}>
                              {titleEl.content}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: "0 48px" }}>
                        <div style={{ maxWidth: 620, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
                          {/* 헤더 */}
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f5f5f5", padding: "16px 24px" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999" }}>항목</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", textAlign: "center" }}>일반</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, textAlign: "center" }}>우리 제품</span>
                          </div>
                          {rows.map((row, ri) => (
                            <div key={ri} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "16px 24px", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`, alignItems: "center" }}>
                              <span {...editable(row.el)} style={eS(row.el, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "#fff" : "#333" })}>{row.label}</span>
                              <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                                <span style={{ fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#bbb" }}>{row.before}</span>
                              </div>
                              <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <span style={{ fontSize: 13, fontWeight: 700, color: mainColor }}>{row.after}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  BEFORE / AFTER (변화/결과)
                // ════════════════════════════════════════
                if (secType === "before_after") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  return (
                    <div style={{ background: bgCol, padding: "160px 64px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 620, margin: "0 auto" }}>
                        {/* Before */}
                        <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                          <div style={{ padding: "12px 20px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f5f5", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999", letterSpacing: 2 }}>BEFORE</span>
                          </div>
                          {renderPlaceholder(200, { borderRadius: 0 })}
                          {bodyEls[0] && (
                            <div style={{ padding: "16px 20px" }}>
                              <div {...editable(bodyEls[0])} style={eS(bodyEls[0], { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.8 })}>
                                {bodyEls[0].content}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* After */}
                        <div style={{ borderRadius: 16, overflow: "hidden", border: `2px solid ${mainColor}40` }}>
                          <div style={{ padding: "12px 20px", background: `${mainColor}10`, textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: mainColor, letterSpacing: 2 }}>AFTER</span>
                          </div>
                          {renderPlaceholder(200, { borderRadius: 0 })}
                          {bodyEls[1] && (
                            <div style={{ padding: "16px 20px" }}>
                              <div {...editable(bodyEls[1])} style={eS(bodyEls[1], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "#fff" : "#333", lineHeight: 1.8 })}>
                                {bodyEls[1].content}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  PRICING (가격표)
                // ════════════════════════════════════════
                if (secType === "pricing") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const planNames = findEls("plan_name");
                  const planPrices = findEls("plan_price");
                  const planDescs = findEls("plan_desc");
                  const planFeatures = findEls("plan_feature");
                  // 플랜별 그룹핑: plan_name 기준
                  const plans = planNames.map((pn, pi) => ({
                    name: pn,
                    price: planPrices[pi],
                    desc: planDescs[pi],
                    features: planFeatures.slice(pi * 3, (pi + 1) * 3), // 플랜당 약 3개
                  }));
                  // fallback: planNames가 없으면 body 요소로 대체
                  if (plans.length === 0) {
                    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                    return (
                      <div style={{ background: bgCol, padding: "120px 64px", textAlign: "center" }}>
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 24 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#666", lineHeight: 1.8, marginBottom: 8 })}>
                            {el.content}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div style={{ background: bgCol, padding: "160px 64px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 20, maxWidth: 720, margin: "0 auto" }}>
                        {plans.map((plan, pi) => {
                          const isHighlight = pi === Math.floor(plans.length / 2);
                          return (
                            <div key={pi} style={{ borderRadius: 16, overflow: "hidden", border: isHighlight ? `2px solid ${mainColor}` : `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", position: "relative" }}>
                              {isHighlight && (
                                <div style={{ background: mainColor, color: "#fff", textAlign: "center", padding: "6px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>BEST</div>
                              )}
                              <div style={{ padding: "28px 24px", textAlign: "center" }}>
                                {plan.name && (
                                  <div {...editable(plan.name)} style={eS(plan.name, { fontSize: 16, fontWeight: 800, color: isDarkBg ? "#fff" : "#333", marginBottom: 8 })}>
                                    {plan.name.content}
                                  </div>
                                )}
                                {plan.price && (
                                  <div {...editable(plan.price)} style={eS(plan.price, { fontSize: 32, fontWeight: 900, color: mainColor, marginBottom: 8 })}>
                                    {plan.price.content}
                                  </div>
                                )}
                                {plan.desc && (
                                  <div {...editable(plan.desc)} style={eS(plan.desc, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#999", marginBottom: 20 })}>
                                    {plan.desc.content}
                                  </div>
                                )}
                                <div style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 16 }} />
                                {plan.features.map((feat, fi) => (
                                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "flex-start", paddingLeft: 8 }}>
                                    <span style={{ fontSize: 10, color: mainColor, fontWeight: 900 }}>+</span>
                                    <span {...editable(feat)} style={eS(feat, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555" })}>
                                      {feat.content}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  FAQ (자주 묻는 질문)
                // ════════════════════════════════════════
                if (secType === "faq") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const questions = findEls("question");
                  const answers = findEls("answer");
                  // fallback: question/answer role이 없으면 body로 처리
                  const hasFaqRoles = questions.length > 0;
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle" && e.role !== "question" && e.role !== "answer");
                  return (
                    <div style={{ background: bgCol, padding: "160px 64px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
                        {hasFaqRoles ? questions.map((q, qi) => (
                          <div key={qi} style={{ borderRadius: 14, border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, overflow: "hidden" }}>
                            <div style={{ padding: "16px 24px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 14, fontWeight: 900, color: mainColor }}>Q</span>
                              <div {...editable(q)} style={eS(q, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "#fff" : "#1a1a2e", flex: 1 })}>
                                {q.content}
                              </div>
                            </div>
                            {answers[qi] && (
                              <div style={{ padding: "14px 24px 16px 52px", background: isDarkBg ? "rgba(255,255,255,0.02)" : "#fff" }}>
                                <div {...editable(answers[qi])} style={eS(answers[qi], { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8 })}>
                                  {answers[qi].content}
                                </div>
                              </div>
                            )}
                          </div>
                        )) : bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={eS(el, { padding: "14px 24px", borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555", lineHeight: 1.8 })}>
                            {el.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  GUARANTEE (보증/신뢰)
                // ════════════════════════════════════════
                if (secType === "guarantee") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  const badge = els.find(e => e.type === "badge");
                  const productImg = images[0]?.preview || null;
                  const guaranteeIcons = [
                    <svg key="shield" width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 3L5 9v9c0 8.3 5.5 16 13 18 7.5-2 13-9.7 13-18V9L18 3z" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`}/><path d="M13 18l3 3 7-7" stroke={mainColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                    <svg key="cert" width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="14" r="9" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`}/><path d="M14 14l3 3 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 23l-2 10 6-3 6 3-2-10" stroke={mainColor} strokeWidth="2" fill={`${mainColor}08`}/></svg>,
                    <svg key="star" width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 4l4 8.5 9 1.3-6.5 6.3 1.5 9L18 25l-8 4.1 1.5-9L5 13.8l9-1.3L18 4z" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`} strokeLinejoin="round"/></svg>,
                  ];
                  // ═══ 변형: 2열 인증 카드 (도노도노 레퍼런스 — 캐치프레이즈 + 인증서 2열) ═══
                  if (dv % 6 >= 3) {
                    return (
                      <div style={{ background: isDarkBg ? bgCol : "#f5f5f5", padding: isMobile ? "80px 20px" : "100px 56px" }}>
                        {/* 상단 캐치프레이즈 */}
                        <div style={{ textAlign: "center", marginBottom: 48 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", marginBottom: 10 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 26 : 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3 })}>{titleEl.content}</div>}
                        </div>
                        {/* 2열 인증 카드 */}
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : bodyEls.length >= 2 ? "1fr 1fr" : "1fr", gap: 20, maxWidth: 700, margin: "0 auto" }}>
                          {bodyEls.map((el, bi) => (
                            <div key={bi} style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", borderRadius: 20, padding: "32px 28px", textAlign: "center", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, boxShadow: isDarkBg ? "none" : "0 2px 16px rgba(0,0,0,0.03)" }}>
                              {/* 아이콘 */}
                              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${mainColor}15` }}>
                                {guaranteeIcons[bi % guaranteeIcons.length]}
                              </div>
                              {/* 인증 제목 */}
                              <div style={{ fontSize: 17, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 8 }}>
                                {el.content?.split(/[.!?]/)[0] || `인증 ${bi + 1}`}
                              </div>
                              {/* 설명 */}
                              <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 })}>
                                {el.content}
                              </div>
                              {/* 하단 뱃지 */}
                              {bi === 0 && (
                                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
                                  {["안전 인증", "품질 검증", "시험 완료"].map((label, li) => (
                                    <span key={li} style={{ padding: "6px 14px", borderRadius: 20, background: li === 0 ? mainColor : (li === 1 ? "#10b981" : `${mainColor}15`), color: li < 2 ? "#fff" : mainColor, fontSize: 11, fontWeight: 700 }}>{label}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* 하단 한 줄 텍스트 */}
                        {badge && (
                          <div style={{ textAlign: "center", marginTop: 32 }}>
                            <span {...editable(badge)} style={eS(badge, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666" })}>{badge.content}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ═══ 기본 guarantee (이미지 헤더 + 아이콘 그리드) ═══
                  return (
                    <div style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
                      {/* 상단 이미지 배경 영역 */}
                      <div style={{ width: "100%", height: 280, position: "relative", overflow: "hidden" }}>
                        {productImg ? (
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3) blur(1px)" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}20, #1a1a2e)` }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(transparent, ${isDarkBg ? bgCol : "#f8f8fa"})` }} />
                      </div>
                      <div style={{ background: isDarkBg ? bgCol : "#f8f8fa", padding: "100px 64px 140px" }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.25, marginBottom: 48 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {/* 아이콘 카드 그리드 */}
                        {bodyEls.length > 1 ? (
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(bodyEls.length, 3)}, 1fr)`, gap: isMobile ? 12 : 20, maxWidth: 720, margin: "0 auto" }}>
                            {bodyEls.map((el, bi) => (
                              <div key={bi} style={{ padding: "32px 24px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, boxShadow: isDarkBg ? "none" : "0 2px 16px rgba(0,0,0,0.04)", textAlign: "center" }}>
                                <div style={{ width: 64, height: 64, borderRadius: 16, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${mainColor}15` }}>
                                  {guaranteeIcons[bi % guaranteeIcons.length]}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: mainColor, marginBottom: 10, letterSpacing: 1 }}>
                                  {String(bi + 1).padStart(2, "0")}
                                </div>
                                <div {...editable(el)} style={eS(el, { fontSize: 15, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.8 })}>
                                  {el.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 14, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>
                            {el.content}
                          </div>
                        ))}
                        {badge && (
                          <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "12px 32px", borderRadius: 28, background: mainColor, color: "#fff", fontSize: 15, fontWeight: 800, marginTop: 36, boxShadow: `0 4px 16px ${mainColor}30`, letterSpacing: 0.5 })}>
                            {badge.content}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  SHIPPING / INFO (테이블 스타일)
                // ════════════════════════════════════════
                if (secType === "shipping" || secType === "info" || secType === "contact") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  // SVG 아이콘 배열 (shipping/info/contact용)
                  const shippingIcons = [
                    <svg key="ship" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="5" width="10" height="8" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M11 8h3l2 3v2h-5V8z" stroke={mainColor} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="4.5" cy="14.5" r="1.5" stroke={mainColor} strokeWidth="1.5"/><circle cx="13.5" cy="14.5" r="1.5" stroke={mainColor} strokeWidth="1.5"/></svg>,
                    <svg key="box" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="12" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M2 8h14M9 4v12" stroke={mainColor} strokeWidth="1.5"/></svg>,
                    <svg key="clock" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={mainColor} strokeWidth="1.5"/><path d="M9 5v4l3 2" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round"/></svg>,
                    <svg key="loc" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C6.24 2 4 4.24 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.76-2.24-5-5-5z" stroke={mainColor} strokeWidth="1.5"/><circle cx="9" cy="7" r="1.5" stroke={mainColor} strokeWidth="1.5"/></svg>,
                    <svg key="phone" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 2h3l1.5 4-2 1.5a10 10 0 004 4L12 10l4 1.5V15a1 1 0 01-1 1C8 16 2 10 2 3a1 1 0 011-1z" stroke={mainColor} strokeWidth="1.5"/></svg>,
                    <svg key="mail" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M2 4l7 5 7-5" stroke={mainColor} strokeWidth="1.5"/></svg>,
                    <svg key="info2" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={mainColor} strokeWidth="1.5"/><path d="M9 8v5M9 5.5v.5" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round"/></svg>,
                    <svg key="star2" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l2 4.5 5 .5-3.5 3.5 1 5L9 13l-4.5 2.5 1-5L2 7l5-.5z" stroke={mainColor} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
                  ];
                  const shippingBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
                  return (
                    <div style={{ background: shippingBg, padding: "160px 64px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 24, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor)}
                      </div>
                      {/* 테이블 형태 정돈 */}
                      <div style={{ maxWidth: 620, margin: "0 auto", borderRadius: 14, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                        {bodyEls.map((el, bi) => {
                          const parts = (el.content || "").split("|").map(s => s.trim());
                          const hasLabel = parts.length > 1;
                          return (
                            <div key={bi} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: bi < bodyEls.length - 1 ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` : "none", background: bi % 2 === 0 ? (isDarkBg ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)") : "transparent" }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {shippingIcons[bi % shippingIcons.length]}
                              </div>
                              {hasLabel ? (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555", minWidth: 80 }}>{parts[0]}</span>
                                  <span {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#777", lineHeight: 1.6 })}>{parts.slice(1).join(" | ")}</span>
                                </div>
                              ) : (
                                <div {...editable(el)} style={eS(el, { flex: 1, fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.75)" : "#444"), lineHeight: 1.8 })}>
                                  {el.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  EVENT — 번들 프로모션형 (상단 히어로+가격 / 하단 2분할)
                // ════════════════════════════════════════
                if (layout === "bundle_promo") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const descEl = els.find(e => e.role === "body" && !e.role_hint && e.fontWeight !== "700");
                  const benefitEl = els.find(e => e.role_hint === "benefit");
                  const pricingEl = els.find(e => e.role_hint === "pricing");
                  const bundleTitleEl = els.find(e => e.role_hint === "bundle_title");
                  const bundleLeftEl = els.find(e => e.role_hint === "bundle_left");
                  const bundleRightEl = els.find(e => e.role_hint === "bundle_right");
                  const bundleRightDescEl = els.find(e => e.role_hint === "bundle_right_desc");
                  const badgeEl = els.find(e => e.type === "badge");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const themeColor = isDarkBg ? "#5a7a4e" : "#7a8c6e";
                  const prices = pricingEl?.content?.split("|") || ["69,000", "34,500"];

                  return (
                    <div style={{ overflow: "hidden" }}>
                      {/* ── 상단 히어로 ── */}
                      <div style={{ background: isDarkBg ? "#1a2018" : "#f4f1ec", padding: "56px 48px 0", display: "flex", gap: 32, alignItems: "flex-end", position: "relative" }}>
                        {/* 왼쪽 텍스트 */}
                        <div style={{ flex: "0 0 45%", paddingBottom: 56 }}>
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.35, marginBottom: 8, whiteSpace: "pre-line" })}>{titleEl.content}</div>}
                          {descEl && <div {...editable(descEl)} style={eS(descEl, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", marginBottom: 20, lineHeight: 1.6 })}>{descEl.content}</div>}
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { display: "inline-block", background: subtitleEl.bg || themeColor, color: "#ffffff", padding: "6px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, marginBottom: 12 })}>{subtitleEl.content}</div>}
                          {benefitEl && <div {...editable(benefitEl)} style={eS(benefitEl, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.85)" : "#333333", marginBottom: 16, lineHeight: 1.6 })}>{benefitEl.content}</div>}
                          {/* 가격 */}
                          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                            <span style={{ fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999" }}>소비자가</span>
                            <span style={{ fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbbbbb", textDecoration: "line-through" }}>{prices[0]}</span>
                            <span style={{ fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbbbbb" }}>&rarr;</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>&won;</span>
                            {pricingEl && <span {...editable(pricingEl)} style={eS(pricingEl, { fontSize: 32, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{prices[1]}</span>}
                          </div>
                        </div>
                        {/* 오른쪽 제품 이미지 */}
                        <div style={{ flex: "0 0 50%", minHeight: 320, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div style={{ width: "100%", height: 300, borderRadius: "12px 12px 0 0", overflow: "hidden", background: isDarkBg ? "linear-gradient(135deg, #2a3528, #1e2a1c)" : "linear-gradient(135deg, #e8e4dd, #d8d4cc)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                            {productImg ? (
                              <img src={productImg} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
                            ) : (
                              <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                                <div style={{ width: 80, height: 200, background: `linear-gradient(180deg, #f8f6f2, #e8e4de)`, borderRadius: "20px 20px 8px 8px", position: "relative" }}>
                                  <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 40, height: 50, background: themeColor, borderRadius: 4, opacity: 0.5 }} />
                                </div>
                                <div style={{ width: 70, height: 220, background: themeColor, borderRadius: 6 }} />
                              </div>
                            )}
                            {imgButtons()}
                          </div>
                        </div>
                      </div>

                      {/* ── 하단 특별 구성 ── */}
                      <div style={{ background: isDarkBg ? "#111111" : "#ffffff", padding: "48px 48px 56px" }}>
                        {/* 타이틀 + 다이아몬드 장식 */}
                        {bundleTitleEl && (
                          <div style={{ textAlign: "center", marginBottom: 36 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                              <span style={{ display: "inline-flex", gap: 4 }}>
                                <span style={{ width: 6, height: 6, background: themeColor, transform: "rotate(45deg)", display: "inline-block" }} />
                                <span style={{ width: 4, height: 4, background: themeColor, transform: "rotate(45deg)", display: "inline-block", opacity: 0.5 }} />
                              </span>
                              <span {...editable(bundleTitleEl)} style={eS(bundleTitleEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{bundleTitleEl.content}</span>
                              <span style={{ display: "inline-flex", gap: 4 }}>
                                <span style={{ width: 4, height: 4, background: themeColor, transform: "rotate(45deg)", display: "inline-block", opacity: 0.5 }} />
                                <span style={{ width: 6, height: 6, background: themeColor, transform: "rotate(45deg)", display: "inline-block" }} />
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 2분할 */}
                        <div style={{ display: "flex", gap: 0, alignItems: "stretch", position: "relative" }}>
                          {/* 왼쪽 */}
                          <div style={{ flex: 1, padding: "32px 28px", textAlign: "center", background: isDarkBg ? "rgba(255,255,255,0.03)" : "#ffffff" }}>
                            {bundleLeftEl && <div {...editable(bundleLeftEl)} style={eS(bundleLeftEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 20 })}>{bundleLeftEl.content}</div>}
                            <div style={{ width: "100%", height: 140, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#eeeeee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              {sec.bundleLeftImg ? (
                                <img src={sec.bundleLeftImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                                  {[0,1,2,3,4].map(ti => (
                                    <div key={ti} style={{ width: 28, height: 80, background: `linear-gradient(180deg, ${isDarkBg ? "#333333" : "#f0ede8"}, ${isDarkBg ? "#222222" : "#e0dcd5"})`, borderRadius: "8px 8px 4px 4px", position: "relative" }}>
                                      <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translateX(-50%)", width: 14, height: 16, background: themeColor, borderRadius: 2, opacity: 0.4 }} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* + 버튼 */}
                          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, background: themeColor, color: "#ffffff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, zIndex: 2, boxShadow: `0 2px 12px ${themeColor}50` }}>+</div>

                          {/* 오른쪽 */}
                          <div style={{ flex: 1, padding: "32px 28px", textAlign: "center", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f4f1ec", borderRadius: 12 }}>
                            {bundleRightEl && <div {...editable(bundleRightEl)} style={eS(bundleRightEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 20 })}>{bundleRightEl.content}</div>}
                            <div style={{ width: "100%", height: 140, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#eeeeee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden" }}>
                              {sec.bundleRightImg ? (
                                <img src={sec.bundleRightImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: 160, height: 80, background: isDarkBg ? "#5a4a3a" : "#c4a77d", borderRadius: "50% / 30%", position: "relative" }}>
                                  <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 50, height: 50, borderRadius: "50%", background: themeColor, opacity: 0.5 }} />
                                </div>
                              )}
                            </div>
                            {bundleRightDescEl && <div {...editable(bundleRightDescEl)} style={eS(bundleRightDescEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.7 })}>{bundleRightDescEl.content}</div>}
                            {badgeEl && <div style={{ display: "inline-block", marginTop: 12, padding: "4px 14px", background: badgeEl.bg || themeColor, color: badgeEl.color || "#ffffff", fontSize: 12, fontWeight: 700, borderRadius: 20, transform: "rotate(-3deg)" }}>{badgeEl.content}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  EVENT — 종합 프로모션형 (서브+타이틀+Gift+3컬럼+브랜드)
                // ════════════════════════════════════════
                if (layout === "promo_full") {
                  const subtitleEl = findEl("subtitle");
                  const titleEl = findEl("title");
                  const periodEl = els.find(e => e.role_hint === "period");
                  const giftEl = els.find(e => e.role_hint === "gift");
                  const benefitChecks = els.filter(e => e.role_hint === "benefit_check");
                  const productInfoEl = els.find(e => e.role_hint === "product_info");
                  const brandIntroEl = els.find(e => e.role_hint === "brand_intro");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  const accentColor = mainColor || "#4a8cc8";

                  const giftParts = (giftEl?.content || "").split("|");
                  const infoParts = (productInfoEl?.content || "").split("|");
                  const brandParts = (brandIntroEl?.content || "").split("|");

                  return (
                    <div style={{ background: isDarkBg ? `linear-gradient(180deg, ${bgCol}, #111518 40%, #111 100%)` : `linear-gradient(180deg, ${bgCol}, #f0f5fa 40%, #fff 100%)`, padding: "48px 40px 40px", position: "relative", overflow: "hidden" }}>

                      {/* 헤더 */}
                      <div style={{ textAlign: "center", marginBottom: 24, position: "relative", zIndex: 1 }}>
                        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", marginBottom: 8 })}>{subtitleEl.content}</div>}
                        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 })}>{titleEl.content}</div>}
                        {periodEl && <div {...editable(periodEl)} style={eS(periodEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa" })}>{periodEl.content}</div>}
                      </div>

                      {/* Gift 바 */}
                      {giftEl && (
                        <div style={{ display: "flex", alignItems: "center", gap: 16, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#ffffff", borderRadius: 12, padding: "16px 24px", marginBottom: 36, boxShadow: isDarkBg ? "none" : "0 2px 12px rgba(0,0,0,0.04)", position: "relative", zIndex: 1 }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: isDarkBg ? "#f08060" : "#e06040", fontStyle: "italic" }}>Gift</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 4 }}>{giftParts[0]}</div>
                            {giftParts[1] && <div {...editable(giftEl)} style={eS(giftEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.5 })}>{giftParts[1]}</div>}
                          </div>
                        </div>
                      )}

                      {/* 3컬럼: 효능 | 제품 | 설명 */}
                      <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 36, position: "relative", zIndex: 1, flexDirection: isMobile ? "column" : "row" }}>
                        {/* 좌측 효능 */}
                        <div style={{ flex: "0 0 25%", display: "flex", flexDirection: "column", gap: 16 }}>
                          {benefitChecks.map((el, bi) => (
                            <div key={bi} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 22, height: 22, borderRadius: "50%", background: isDarkBg ? "#3a7ab0" : accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5L9.5 4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </div>
                              <span {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333" })}>{el.content}</span>
                            </div>
                          ))}
                        </div>
                        {/* 중앙 제품 */}
                        <div style={{ flex: "0 0 35%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          {productImg ? (
                            <img src={productImg} alt="" style={{ maxWidth: "80%", maxHeight: 280, objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: 120, height: 220, background: isDarkBg ? "linear-gradient(180deg, #222, #1a1a1a)" : "linear-gradient(180deg, #fff, #f0f0f0)", borderRadius: "16px 16px 8px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", position: "relative" }}>
                              <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 60, height: 70, background: accentColor, borderRadius: 4, opacity: 0.4 }} />
                            </div>
                          )}
                          {imgButtons()}
                        </div>
                        {/* 우측 설명 */}
                        {productInfoEl && (
                          <div style={{ flex: "0 0 35%" }}>
                            <div style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", marginBottom: 8 }}>{infoParts[0]}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>{infoParts[1]}</div>
                            <div {...editable(productInfoEl)} style={eS(productInfoEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.7 })}>{infoParts[2]}</div>
                          </div>
                        )}
                      </div>

                      {/* 브랜드 소개 박스 */}
                      {brandIntroEl && (
                        <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f8fc", borderRadius: 12, padding: "28px 32px", display: "flex", gap: 24, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                          <div style={{ flex: "0 0 120px", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 300, fontStyle: "italic", color: isDarkBg ? "#5a9ad0" : accentColor }}>Brand</div>
                            <div style={{ fontSize: 9, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#aaaaaa", marginTop: 4 }}>RECOMMENDED BY EXPERTS</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#333333", marginBottom: 8 }}>{brandParts[0]}</div>
                            <div {...editable(brandIntroEl)} style={eS(brandIntroEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#777777", lineHeight: 1.7 })}>{brandParts[1]}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  EVENT / PROMOTION
                // ════════════════════════════════════════
                if (secType === "event") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                  const badge = els.find(e => e.type === "badge");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

                  // ═══ 변형: 2톤 분할 이벤트 배너 (크림 상단 + 다크 하단) ═══
                  if (dv % 6 >= 2 && dv % 6 <= 4) {
                    const topBg = dv % 2 === 0 ? "linear-gradient(180deg, #f5f0e8, #ede5d8)" : "linear-gradient(180deg, #f0f0f5, #e8e8f0)";
                    const botBg = dv % 2 === 0 ? "#1a2640" : "#1a1a2e";
                    const accentTxt = dv % 2 === 0 ? "#8B7355" : "#9b8ec4";
                    return (
                      <div>
                        {/* ── 상단: 크림/베이지 영역 ── */}
                        <div style={{ background: topBg, position: "relative", overflow: "hidden", padding: "48px 48px 60px" }}>
                          {/* 배경 아치 장식 */}
                          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, pointerEvents: "none", opacity: 0.06 }}>
                            {[80,60,100,60,80].map((h, ai) => (
                              <div key={ai} style={{ width: 70, height: h, borderRadius: "35px 35px 0 0", background: isDarkBg ? "#fff" : "#000" }} />
                            ))}
                          </div>
                          <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                            {/* 브랜드 뱃지 (도장 스타일) */}
                            {badge && (
                              <div style={{ position: "absolute", top: 0, right: 40 }}>
                                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2.5px solid #c0392b`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)" }}>
                                  <span {...editable(badge)} style={eS(badge, { fontSize: 10, fontWeight: 900, color: "#c0392b", textAlign: "center", lineHeight: 1.2 })}>{badge.content}</span>
                                </div>
                              </div>
                            )}
                            {/* 서브타이틀 */}
                            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: accentTxt, marginBottom: 12, letterSpacing: 2 })}>{subtitleEl.content}</div>}
                            {/* 초대형 골드 타이틀 */}
                            {titleEl && (
                              <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 52, fontWeight: 900, color: "transparent", backgroundImage: "linear-gradient(180deg, #c9a961, #a07830, #c9a961)", WebkitBackgroundClip: "text", backgroundClip: "text", lineHeight: 1.2, marginBottom: 24, letterSpacing: -1 })}>
                                {titleEl.content}
                              </div>
                            )}
                            {/* 설명 텍스트 */}
                            {bodyEls.slice(0, 2).map((el, bi) => (
                              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, color: accentTxt, lineHeight: 1.9, marginBottom: 6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                            ))}
                            {/* 중앙 제품 이미지 */}
                            <div style={{ width: 300, height: 280, margin: "36px auto 0", borderRadius: 20, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${mainColor}15, ${mainColor}08)`, boxShadow: "0 12px 48px rgba(0,0,0,0.08)" }}>
                              {productImg ? (
                                <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accentTxt} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a4 4 0 00-8 0v2"/></svg>
                                </div>
                              )}
                              {imgButtons()}
                            </div>
                          </div>
                        </div>
                        {/* ── 하단: 다크 혜택 배너 ── */}
                        <div style={{ background: botBg, padding: "48px 48px 56px", textAlign: "center" }}>
                          {/* BENEFIT 구분 */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 3 }}>BENEFIT</span>
                            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
                          </div>
                          {/* 혜택 텍스트 */}
                          {bodyEls.slice(2).map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: bi === 0 ? 20 : 14, fontWeight: bi === 0 ? 900 : 500, color: bi === 0 ? "#fff" : "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10, maxWidth: 480, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                          ))}
                          {bodyEls.length <= 2 && (
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.6, marginBottom: 10 }}>
                              지금 구매하시면 <span style={{ color: "#c9a961" }}>특별 혜택</span>을 드립니다
                            </div>
                          )}
                          {/* 혜택 아이콘 3열 */}
                          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 28 }}>
                            {["무료배송", "당일출고", "선물포장"].map((label, li) => (
                              <div key={li} style={{ textAlign: "center" }}>
                                <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a961" strokeWidth="1.5" strokeLinecap="round">
                                    {li === 0 && <><rect x="1" y="5" width="10" height="8" rx="1"/><path d="M11 8h3l2 3v2h-5V8z"/><circle cx="4.5" cy="14.5" r="1.5"/><circle cx="13.5" cy="14.5" r="1.5"/></>}
                                    {li === 1 && <><rect x="2" y="4" width="14" height="12" rx="1"/><path d="M2 8h14M9 4v12"/></>}
                                    {li === 2 && <><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a4 4 0 00-8 0v2"/></>}
                                  </svg>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ═══ 기본 이벤트 렌더러 ═══
                  return (
                    <div style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
                      {/* 풀 배경 이미지 */}
                      {productImg ? (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, ${mainColor}30, ${colorPalette?.gradient || "#9b8ec4"}30)` }} />
                      )}
                      {/* 오버레이 */}
                      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? `linear-gradient(135deg, ${mainColor}cc, rgba(0,0,0,0.7))` : "transparent" }} />
                      <div style={{ position: "relative", zIndex: 2, padding: "120px 56px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        {badge && (
                          <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 28px", borderRadius: 24, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 14, fontWeight: 800, marginBottom: 24, border: "1px solid rgba(255,255,255,0.2)", letterSpacing: 1 })}>
                            {badge.content}
                          </span>
                        )}
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 16, letterSpacing: 3 })}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 24, textShadow: "0 2px 16px rgba(0,0,0,0.3)" })}>
                            {titleEl.content}
                          </div>
                        )}
                        {bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, marginBottom: 14, maxWidth: 520 })}>
                            {el.content}
                          </div>
                        ))}
                      </div>
                      {/* 이미지 교체 */}
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>배경 교체</label>
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  CTA SECTION (구매 유도)
                // ════════════════════════════════════════
                if (secType === "cta") {
                  const titleEl = findEl("title");
                  const subtitleEl = findEl("subtitle");
                  const priceEl = findEl("price");
                  const bodyEls = els.filter(e => e.type === "text" && e.role === "body");
                  const badge = els.find(e => e.type === "badge");
                  const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
                  // 가격에서 할인 정보 추출
                  const priceText = priceEl?.content || "";
                  const hasDiscount = /할인|%|원래|정가/.test(priceText) || badge?.content?.includes("%");

                  // ═══ 변형: 제품 중심 CTA (제품 이미지 + 가격 카드 + 보증 아이콘) ═══
                  if (dv % 6 >= 2) {
                    const ctaBg = isDarkBg ? bgCol : "#fff";
                    const ctaTxt = isDarkBg ? "#fff" : "#1a1a1a";
                    const ctaSub = isDarkBg ? "rgba(255,255,255,0.55)" : "#888";
                    return (
                      <div style={{ background: ctaBg, padding: isMobile ? "80px 24px" : "120px 56px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                        {/* 배경 원형 장식 */}
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${mainColor}08 0%, transparent 70%)`, pointerEvents: "none" }} />
                        <div style={{ position: "relative", zIndex: 1 }}>
                          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
                          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: ctaTxt, lineHeight: 1.25, marginBottom: 24 })}>{titleEl.content}</div>}
                          {bodyEls.map((el, bi) => (
                            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: ctaSub, lineHeight: 1.8, marginBottom: 10, maxWidth: 520, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                          ))}
                          {/* 제품 이미지 */}
                          {productImg && (
                            <div style={{ width: isMobile ? 200 : 280, height: isMobile ? 200 : 280, margin: "32px auto", borderRadius: 24, overflow: "hidden", boxShadow: `0 16px 48px ${mainColor}20`, position: "relative" }}>
                              <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              {imgButtons({ bottom: 8, right: 8 })}
                            </div>
                          )}
                          {/* 가격 영역 — 할인 뱃지 포함 */}
                          {priceEl && (
                            <div style={{ marginTop: 24, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                              <div {...editable(priceEl)} style={eS(priceEl, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: ctaTxt, letterSpacing: -1 })}>{priceEl.content}</div>
                              {badge && (
                                <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "#ef4444", color: "#fff", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(239,68,68,0.3)" })}>{badge.content}</span>
                              )}
                            </div>
                          )}
                          {!priceEl && badge && (
                            <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 24px", borderRadius: 24, background: `${mainColor}12`, color: mainColor, fontSize: 14, fontWeight: 800, marginBottom: 28, border: `1.5px solid ${mainColor}25` })}>{badge.content}</span>
                          )}
                          {/* CTA 버튼 */}
                          <div style={{ maxWidth: isMobile ? 320 : 480, margin: "0 auto" }}>
                            <div style={{ width: "100%", padding: "18px 0", borderRadius: 28, background: mainColor, color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 900, boxShadow: `0 8px 32px ${mainColor}40`, letterSpacing: 1, height: 56, display: "flex", alignItems: "center", justifyContent: "center", animation: "ctaPulse 2s ease-in-out infinite" }}>
                              지금 구매하기
                            </div>
                          </div>
                          {/* 보증 아이콘 태그 */}
                          <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 32, marginTop: 36, flexWrap: "wrap" }}>
                            {[
                              { label: "무료배송", icon: "M1 5h10v8H1z M11 8h3l2 3v2h-5V8z" },
                              { label: "당일출고", icon: "M12 2v10l4.5-2.5L12 2z M2 12h8v8H2z" },
                              { label: "100% 정품", icon: "M9 12l2 2 4-4 M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                              { label: "안전결제", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                            ].map((item, ti) => (
                              <div key={ti} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : `${mainColor}15`}` }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                                </div>
                                <span style={{ fontSize: 11, color: ctaSub, fontWeight: 600 }}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <style>{`@keyframes ctaPulse { 0%,100%{transform:scale(1);box-shadow:0 8px 32px rgba(0,0,0,0.15)} 50%{transform:scale(1.03);box-shadow:0 12px 40px rgba(0,0,0,0.2)} }`}</style>
                      </div>
                    );
                  }

                  // ═══ 기본 CTA (풀 배경 이미지 + 오버레이) ═══
                  return (
                    <div style={{ padding: 0, textAlign: "center", position: "relative", overflow: "hidden", minHeight: 1260 }}>
                      {productImg ? (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                          <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})` }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 100%)" : "transparent" }} />
                      <div style={{ position: "relative", zIndex: 2, padding: isMobile ? "100px 24px" : "140px 56px" }}>
                        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 14, letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>}
                        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 24, textShadow: "0 2px 16px rgba(0,0,0,0.3)" })}>{titleEl.content}</div>}
                        {bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: 14, maxWidth: 520, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
                        ))}
                        {priceEl && (
                          <div style={{ marginTop: 36, marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                            <div {...editable(priceEl)} style={eS(priceEl, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: "#fff", letterSpacing: -1 })}>{priceEl.content}</div>
                            {badge && <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "#ef4444", color: "#fff", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(239,68,68,0.3)" })}>{badge.content}</span>}
                          </div>
                        )}
                        {!priceEl && badge && <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "8px 20px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 28, border: "1px solid rgba(255,255,255,0.2)" })}>{badge.content}</span>}
                        <div style={{ maxWidth: isMobile ? 320 : 480, margin: "0 auto" }}>
                          <div style={{ width: "100%", padding: "18px 0", borderRadius: 28, background: mainColor, color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 900, boxShadow: `0 8px 32px ${mainColor}40`, letterSpacing: 1, height: 56, display: "flex", alignItems: "center", justifyContent: "center", animation: "ctaPulse 2s ease-in-out infinite" }}>
                            지금 구매하기
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 24, marginTop: 32, flexWrap: "wrap" }}>
                          {["무료배송", "당일출고", "100% 정품", "안전결제"].map((t, ti) => (
                            <span key={ti} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: 0.5 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <style>{`@keyframes ctaPulse { 0%,100%{transform:scale(1);box-shadow:0 8px 32px rgba(0,0,0,0.15)} 50%{transform:scale(1.03);box-shadow:0 12px 40px rgba(0,0,0,0.2)} }`}</style>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  AI NOTICE
                // ════════════════════════════════════════
                if (secType === "ai_notice") {
                  return (
                    <div style={{ background: bgCol || (isDarkBg ? "#1a1a1a" : "#fafafa"), padding: "24px 48px", textAlign: "center" }}>
                      {/* 미세한 구분선 */}
                      <div style={{ width: 60, height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "0 auto 12px" }} />
                      {els.filter(e => e.type === "text").map((el, ei) => (
                        <div key={ei} {...editable(el)} style={eS(el, { fontSize: 10, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#c0c0c0", lineHeight: 1.6 })}>
                          {el.content}
                        </div>
                      ))}
                      {els.filter(e => e.type === "text").length === 0 && (
                        <div style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#c0c0c0", lineHeight: 1.6 }}>
                          본 페이지의 일부 콘텐츠는 AI로 생성되었습니다
                        </div>
                      )}
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  QUOTE BOX
                // ════════════════════════════════════════
                if (layout === "quote_box") {
                  return (
                    <div style={{ background: bgCol, padding: "160px 64px" }}>
                      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 48px", borderRadius: 20, border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`, textAlign: "center", position: "relative" }}>
                        {/* 인용 부호 장식 */}
                        <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", width: 32, height: 32, background: bgCol, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 32, color: `${mainColor}40`, fontFamily: "Georgia, serif", lineHeight: 1 }}>"</span>
                        </div>
                        {els.map((el, ei) => {
                          if (el.type === "badge") return (
                            <span key={ei} {...editable(el)} style={eS(el, { display: "inline-block", padding: "5px 14px", borderRadius: 16, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 16, border: `1px solid ${mainColor}20` })}>
                              {el.content}
                            </span>
                          );
                          if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "20px auto", maxWidth: 100 }} />;
                          return (
                            <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.role === "title" ? 22 : 14, fontWeight: el.role === "title" ? 900 : 400, color: el.color || (isDarkBg ? (el.role === "title" ? "#fff" : "rgba(255,255,255,0.6)") : (el.role === "title" ? "#1a1a2e" : "#666")), lineHeight: el.role === "title" ? 1.35 : 1.8, marginBottom: el.role === "title" ? 12 : 6 })}>
                              {el.content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  FULL IMAGE / TEXT OVER IMAGE (non-hero)
                // ════════════════════════════════════════
                if (layout === "full_image" || layout === "text_over_image") {
                  const bgImgSrc = aiImgSrc || productImgForSection;
                  return (
                    <div style={{ width: "100%", minHeight: 400, position: "relative", overflow: "hidden", background: bgCol }}>
                      <div style={{ position: "absolute", inset: 0 }}>
                        {bgImgSrc ? (
                          <img src={bgImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}20, ${mainColor}08)` }} />
                        )}
                      </div>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 20%, rgba(0,0,0,0.5) 100%)" }} />
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
                        {sec.image_prompt && (
                          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
                            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(124,106,255,0.8)", color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>AI 생성</button>
                        )}
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
                      <div style={{ position: "relative", zIndex: 1, padding: "60px 48px", minHeight: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        {els.map((el, ei) => {
                          if (el.type === "badge") return (
                            <span key={ei} {...editable(el)} style={eS(el, { display: "inline-block", padding: "6px 16px", borderRadius: 20, background: el.bg || mainColor, color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 12, alignSelf: "flex-start" })}>
                              {el.content}
                            </span>
                          );
                          if (el.type === "divider") return <div key={ei} style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "16px 0", maxWidth: 60 }} />;
                          return (
                            <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.role === "title" ? 30 : el.role === "subtitle" ? 13 : 15, fontWeight: el.role === "title" ? 900 : el.role === "subtitle" ? 600 : 400, color: "#fff", lineHeight: el.role === "title" ? 1.3 : 1.7, marginBottom: el.role === "title" ? 14 : 6, letterSpacing: el.role === "subtitle" ? 2 : 0, opacity: el.role === "subtitle" ? 0.7 : 1 })}>
                              {el.content}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  DEFAULT / CENTERED TEXT
                // ════════════════════════════════════════
                const titleEl = findEl("title");
                const subtitleEl = findEl("subtitle");
                const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
                const badge = els.find(e => e.type === "badge");
                // 세로 패딩 변형 (더 길게)
                const defaultPad = ["100px 64px", "100px 64px", "120px 80px", "100px 56px", "100px 72px", "100px 64px"][dv % 6];
                // 제목 크기 변형
                const defaultTitleSize = [36, 34, 40, 32, 38, 34][dv % 6];
                // body 텍스트 변형: 카드형 vs 플레인
                const bodyAsCards = dv % 3 === 1 && bodyEls.length >= 3;
                // 좌측 정렬 변형
                const leftAlign = dv % 4 === 2;

                return (
                  <div style={{ background: bgCol, padding: defaultPad, textAlign: leftAlign ? "left" : "center", position: "relative", overflow: "hidden" }}>
                    {/* 데코 장식 변형 */}
                    {dv % 3 === 0 && <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: `${mainColor}05`, pointerEvents: "none" }} />}
                    {dv % 3 === 2 && <div style={{ position: "absolute", top: 40, left: leftAlign ? 0 : "auto", right: leftAlign ? "auto" : 0, width: 4, height: 80, background: `${mainColor}15`, borderRadius: 2, pointerEvents: "none" }} />}
                    <div style={{ maxWidth: leftAlign ? 600 : "none", position: "relative", zIndex: 1 }}>
                      {badge && (
                        <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 16px", borderRadius: dv % 2 === 0 ? 20 : 8, background: `${mainColor}12`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 20, border: `1px solid ${mainColor}20` })}>
                          {badge.content}
                        </span>
                      )}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: isDarkBg ? mainColor : (dv % 2 === 0 ? mainColor : "#999"), letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 })}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {titleEl && (
                        <div {...editable(titleEl)} style={eS(titleEl, { fontSize: defaultTitleSize, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.35, marginBottom: 24 })}>
                          {titleEl.content}
                        </div>
                      )}
                      {(titleEl || subtitleEl) && !bodyAsCards && decoLine(mainColor, leftAlign ? 32 : undefined)}
                      {bodyAsCards ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20, maxWidth: 580, marginLeft: leftAlign ? 0 : "auto", marginRight: leftAlign ? "auto" : "auto" }}>
                          {bodyEls.map((el, bi) => (
                            <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 24px", borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
                              <div style={{ width: 4, height: 20, background: mainColor, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                              <div {...editable(el)} style={eS(el, { fontSize: 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.75)" : "#444"), lineHeight: 1.8, textAlign: "left" })}>
                                {el.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.65)" : "#555"), lineHeight: 1.9, marginBottom: 16, maxWidth: leftAlign ? "none" : 560, marginLeft: leftAlign ? 0 : "auto", marginRight: leftAlign ? "auto" : "auto" })}>
                          {el.content}
                        </div>
                      ))}
                      {!titleEl && !subtitleEl && bodyEls.length === 0 && els.map((el, ei) => {
                        if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "16px auto", maxWidth: 100 }} />;
                        if (el.type === "badge") return null;
                        return (
                          <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.fontWeight === "900" ? 28 : el.fontWeight === "700" ? 17 : 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#444"), lineHeight: 1.9, marginBottom: 12 })}>
                            {el.content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
      <div style={{ width: isMobile ? 0 : 300, borderLeft: isMobile ? "none" : `1px solid ${bdr}`, display: isMobile ? "none" : "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff" }}>
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
