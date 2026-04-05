import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
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

  // AI 파이프라인
  const [pipeStep, setPipeStep] = useState(0); // 0-4
  const [pipeResults, setPipeResults] = useState({});
  const [pipeError, setPipeError] = useState("");

  // 에디터 (Phase 2)
  const [sections, setSections] = useState([]);
  const [colorPalette, setColorPalette] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [sidebarTab, setSidebarTab] = useState("pages");
  const [sectionImages, setSectionImages] = useState({}); // { secId: { url, loading, error } }
  // 텍스트 요소 선택/편집
  const [selectedEl, setSelectedEl] = useState(null); // { secIdx, elIdx, el }
  const [templateTypeFilter, setTemplateTypeFilter] = useState("hero");
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]);
  const [mediaSubTab, setMediaSubTab] = useState("photo");

  // 드래그 이동 상태
  const dragRef = useRef(null); // { type: "move"|"resize", startX, startY, origX, origY, origW, origH, handle }

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
          // 텍스트 위치 이동
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
            ...s, elements: s.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: Math.round(newX), offsetY: Math.round(newY) }),
          }));
          setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, offsetX: Math.round(newX), offsetY: Math.round(newY) } } : prev);
        }
      }
    };
    const onUp = () => { dragRef.current = null; };
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

  // 전체 섹션 이미지 일괄 생성
  const generateAllImages = async () => {
    for (const sec of sections) {
      if (sec.image_prompt && !sectionImages[sec.id]?.url) {
        await generateSectionImage(sec.id, sec.image_prompt);
        await new Promise(r => setTimeout(r, 1000)); // rate limit 방지
      }
    }
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
      const sectionCount = mode === "fast" ? 8 : 15;
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

      // 디자인 다양성: 랜덤 스타일 시드 (74개 실제 상세페이지 분석 기반)
      const styleSeeds = [
        { tone: "미니멀 모던", palette: "#fff/#f8f8f8 화이트 베이스, 1가지 포인트 컬러만", layout: "여백 넉넉한 심플, 중앙정렬 헤드라인, 좌우 분할", hero: "full_image 위에 작은 텍스트 오버레이" },
        { tone: "소프트 페미닌", palette: "블러시 핑크#f5e6e0/세이지 그린#e8efe0/라벤더#e8e0f0, 크림 배경", layout: "둥근 카드, 소프트 그림자, 원형 이미지", hero: "파스텔 그라데이션 배경 + 중앙 타이틀" },
        { tone: "볼드 바이브", palette: "비비드 마젠타#e91e63/코랄#ff6f61/딥그린#2e7d32, 화이트 대비", layout: "컬러 블록 섹션, 큰 타이포그래피, 강한 CTA", hero: "풀 블리드 이미지 + 큰 굵은 타이틀" },
        { tone: "내추럴 오가닉", palette: "테라코타#c4a882/웜베이지#f5f0eb/초콜릿브라운#5d4037, 크림", layout: "자연 질감, 부드러운 곡선, 보태니컬 요소", hero: "어스톤 배경 + 심플 캐치프레이즈" },
        { tone: "럭셔리 프리미엄", palette: "딥 네이비#1a237e/골드#c9a961/화이트, 다크 배경 중심", layout: "와이드 여백, 세리프 느낌 타이포, 금선 디테일", hero: "다크 배경 + 골드 텍스트 + 미니멀" },
        { tone: "캐주얼 플레이풀", palette: "오렌지#ff9800/스카이블루#03a9f4/라임#cddc39, 밝은 배경", layout: "일러스트 요소, 재미있는 타이포, 비정형 레이아웃", hero: "컬러풀 배경 + 큰 제품 사진 + 활기찬 카피" },
        { tone: "클린 프로페셔널", palette: "네이비#263238/그레이#607d8b/화이트, 차분한 중성톤", layout: "정돈된 그리드, 정보형 테이블, 아이콘+텍스트", hero: "깔끔한 화이트 배경 + 제품 중심 + 데이터 뱃지" },
        { tone: "매거진 에디토리얼", palette: "모노톤#222/#666/#f0f0f0 + 1가지 액센트 컬러", layout: "매거진 그리드, 큰 이미지+작은 텍스트, 비대칭", hero: "풀 블리드 사진 + 에디토리얼 타이틀" },
      ];
      const seed = styleSeeds[Math.floor(Math.random() * styleSeeds.length)];

      const layoutPrompt = `제품:"${productName}" 카테고리:${catLabel}
특징:${features.slice(0, 400)}${extraLines ? ` 추가정보:${extraLines}` : ""}${options.length ? ` 옵션:${options.join("/")}` : ""}
추출색상:${mainColor}
디자인 톤:${seed.tone}
색상방향:${seed.palette}
레이아웃:${seed.layout}
히어로 스타일:${seed.hero}

이 제품의 쇼핑몰 상세페이지를 ${sectionCount}개 섹션 JSON배열로 만들어줘.

섹션 흐름 (내러티브 순서 참고):
히어로 → 고민/공감 → 솔루션(특장점) → 포인트 상세(2-3개) → 숫자 강조/비교 → 후기 → 스펙/배송 → 보증/신뢰 → CTA → AI 고지

디자인 톤에 맞춰 bg_color를 섹션마다 다양하게:
- 밝은 섹션(#fff, #f8f8f8, #fafafa)과 어두운 섹션(메인컬러 기반, #1a1a2e, #111) 교차
- rgba 투명도 활용: 메인컬러의 05~15% 배경도 적극 사용
- 동일 bg_color 연속 2개 이상 금지

매번 새로운 카피라이팅, 구성, 색상 조합으로 만들어 — 같은 패턴 반복 금지.
카피는 구체적이고 설득력 있게 — 실제 쇼핑몰 수준의 퀄리티.

레이아웃 다양성 규칙:
- point 섹션은 left_image_right_text와 right_image_left_text를 교대 사용
- features는 grid_2col 또는 grid_3col 중 랜덤
- review는 card_list 필수
- hero는 full_image 필수
- 같은 layout이 연속 3개 이상 나오면 안 됨
- centered_text만 반복되는 것은 절대 금지 — 다양한 layout 혼합 필수
- 전체 ${sectionCount}개 중 최소 4종류 이상의 layout 사용

각 섹션 구조:
{
  "type": "hero|pain_points|review|concept|features|point|stats_highlight|process_steps|comparison|before_after|pricing|faq|cert|shipping|info|event|guarantee|cta|ai_notice",
  "layout": "full_image|text_over_image|left_image_right_text|right_image_left_text|centered_text|grid_2col|grid_3col|card_list|quote_box",
  "bg_color": "#hex",
  "image_prompt": "이 섹션에 어울리는 이미지를 AI로 생성하기 위한 영문 프롬프트 (제품/배경/소품 묘사, 50단어 이내)",
  "elements": [
    {type:"text", role:"subtitle|title|body|price|review_name|review_text|stat_number|stat_label|question|answer|plan_name|plan_price|plan_desc|plan_feature", content:"", fontSize:숫자, fontWeight:"400|700|900", color:"#hex", textAlign:"left|center|right"},
    {type:"badge", content:"텍스트", bg:"#hex", color:"#hex"},
    {type:"divider", color:"#hex"}
  ]
}

layout 설명:
- full_image: 전체 이미지 위에 텍스트 오버레이 (hero에 적합)
- text_over_image: 이미지 50% + 텍스트 오버레이
- left_image_right_text: 좌측 이미지 + 우측 텍스트 (2컬럼)
- right_image_left_text: 우측 이미지 + 좌측 텍스트
- centered_text: 텍스트 중앙 정렬 (이미지 없음)
- grid_2col: 2열 그리드 (features에 적합)
- grid_3col: 3열 그리드
- card_list: 카드형 리스트 (review에 적합)
- quote_box: 인용/강조 박스

섹션별 필수 elements:

hero (layout:full_image):
  [{type:"text",role:"subtitle",content:"브랜드/카테고리"},{type:"text",role:"title",content:"캐치프레이즈 20자이내"},{type:"text",role:"body",content:"서브카피 40자이내"}]

pain_points (layout:centered_text):
  [{type:"text",role:"title",content:"이런 고민 있으셨나요?"},{type:"text",role:"body",content:"고민1",fontWeight:"700"},{type:"text",role:"body",content:"고민1 설명"},{type:"text",role:"body",content:"고민2",fontWeight:"700"},{type:"text",role:"body",content:"고민2 설명"},{type:"text",role:"body",content:"고민3",fontWeight:"700"},{type:"text",role:"body",content:"고민3 설명"}]

review (layout:card_list):
  [{type:"text",role:"title",content:"고객 후기"},{type:"text",role:"review_name",content:"닉네임1"},{type:"text",role:"star",content:"5"},{type:"text",role:"review_text",content:"후기1"},{type:"text",role:"review_name",content:"닉네임2"},{type:"text",role:"star",content:"5"},{type:"text",role:"review_text",content:"후기2"},{type:"text",role:"review_name",content:"닉네임3"},{type:"text",role:"star",content:"4"},{type:"text",role:"review_text",content:"후기3"}]

features (layout:grid_2col):
  [{type:"text",role:"title",content:"섹션제목"},{type:"text",role:"body",content:"특징1제목",fontWeight:"700"},{type:"text",role:"body",content:"특징1설명"},{type:"text",role:"body",content:"특징2제목",fontWeight:"700"},{type:"text",role:"body",content:"특징2설명"},...]

point (layout:left_image_right_text 또는 right_image_left_text, 교대):
  [{type:"text",role:"subtitle",content:"소제목"},{type:"text",role:"title",content:"포인트제목"},{type:"text",role:"body",content:"설명"}]

stats_highlight (layout:centered_text):
  [{type:"text",role:"title",content:"숫자로 증명합니다"},{type:"text",role:"stat_number",content:"4,200+"},{type:"text",role:"stat_label",content:"누적 판매"},{type:"text",role:"stat_number",content:"98%"},{type:"text",role:"stat_label",content:"재구매율"},{type:"text",role:"stat_number",content:"4.9"},{type:"text",role:"stat_label",content:"평균 별점"}]

process_steps (layout:centered_text):
  [{type:"text",role:"title",content:"이렇게 사용하세요"},{type:"text",role:"body",content:"Step1 제목",fontWeight:"700"},{type:"text",role:"body",content:"Step1 설명"},{type:"text",role:"body",content:"Step2 제목",fontWeight:"700"},{type:"text",role:"body",content:"Step2 설명"}]

comparison (layout:centered_text):
  [{type:"text",role:"title",content:"비교해보세요"},{type:"text",role:"body",content:"항목|일반|우리 제품"},{type:"text",role:"body",content:"항목|일반|우리 제품"},{type:"text",role:"body",content:"항목|일반|우리 제품"}]

before_after (layout:left_image_right_text):
  [{type:"text",role:"title",content:"변화를 확인하세요"},{type:"text",role:"body",content:"Before 설명"},{type:"text",role:"body",content:"After 설명"}]

pricing (layout:centered_text):
  [{type:"text",role:"title",content:"가격 안내"},{type:"text",role:"plan_name",content:"베이직"},{type:"text",role:"plan_price",content:"29,900원"},{type:"text",role:"plan_desc",content:"입문자용"},{type:"text",role:"plan_feature",content:"기본 기능 포함"},{type:"text",role:"plan_feature",content:"무료 배송"}]

faq (layout:centered_text):
  [{type:"text",role:"title",content:"자주 묻는 질문"},{type:"text",role:"question",content:"Q. 질문1"},{type:"text",role:"answer",content:"A. 답변1"},{type:"text",role:"question",content:"Q. 질문2"},{type:"text",role:"answer",content:"A. 답변2"}]

cert (layout:centered_text):
  [{type:"text",role:"title",content:"인증제목"},{type:"text",role:"stat_number",content:"99%"},{type:"text",role:"stat_label",content:"고객만족도"},{type:"text",role:"stat_number",content:"100%"},{type:"text",role:"stat_label",content:"유기농인증"},{type:"text",role:"body",content:"설명"}]

shipping (layout:centered_text):
  [{type:"text",role:"title",content:"배송안내"},{type:"text",role:"body",content:"배송정보1"},{type:"text",role:"body",content:"배송정보2"}]

guarantee (layout:centered_text):
  [{type:"text",role:"title",content:"100% 만족 보증"},{type:"text",role:"body",content:"보증 내용 설명"},{type:"badge",content:"30일 무조건 환불",bg:"${mainColor}",color:"#fff"}]

cta (layout:centered_text):
  [{type:"text",role:"subtitle",content:"한정혜택"},{type:"text",role:"title",content:"지금바로시작"},{type:"text",role:"price",content:"29,900원"},{type:"badge",content:"무료배송",bg:"${mainColor}",color:"#fff"}]

ai_notice: [{type:"text",role:"body",content:"본 페이지의 일부 콘텐츠는 AI로 생성되었습니다"}]

규칙:
- 각 섹션은 위 구조를 반드시 따를 것
- 카피는 구체적이고 매력적으로
- image_prompt는 영문
- 색상은 ${mainColor} 기반 통일
- point 섹션은 2-3개, 교대 레이아웃
- 첫번째=hero 마지막=ai_notice
- 이모지 절대 사용 금지
JSON배열만 출력.`;

      // Gemini API 직접 호출 (항상 8개로 먼저 생성) — 90초 타임아웃
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 90000);
      let geminiRes;
      try {
        geminiRes = await fetch("/api/gemini-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 6000 }),
          signal: abortCtrl.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw new Error(fetchErr.name === "AbortError" ? "생성 시간 초과 (90초). 다시 시도해주세요." : fetchErr.message);
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
            body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 6000 }),
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

      // 프리미엄: 추가 섹션 2차 생성
      if (mode === "precise" && layoutData.length < 12) {
        try {
          const existingTypes = layoutData.map(s => s.type).join(",");
          const addPrompt = `제품:"${productName}" 카테고리:${catLabel}. 기존 섹션: ${existingTypes}. 추가로 5-7개 섹션을 JSON배열로 만들어줘. 기존에 없는 타입으로: comparison, before_after, faq, pricing, process_steps, guarantee, cert 등에서 선택. 디자인 톤:${seed.tone}, 색상:${seed.palette}. 마지막은 반드시 ai_notice. JSON배열만 출력.`;
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

      // 섹션 데이터 설정 → 아웃라인 확인 단계
      setSections(layoutData.map((s, i) => ({ ...s, id: `sec_${i}_${Date.now()}`, enabled: true })));
      setActiveSection(0);

      // 포인트 차감
      if (user) await changePoints(user.uid, -10, "상세페이지 생성");

      setTimeout(() => setPhase("outline"), 800);

    } catch (e) {
      console.error("Pipeline error:", e);
      setPipeError(e.message || "생성 중 오류가 발생했습니다.");
      // generating 화면에서 에러를 보여줌 (input으로 바로 안 돌림)
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
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 80px" }}>
        {/* 헤더 — 메이킷 스타일 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: acc + "15", color: acc, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            ✦ AI 상세페이지
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: text, lineHeight: 1.3, marginBottom: 8 }}>
            제품 정보를 입력하면<br />AI가 상세페이지를 만들어드려요
          </h1>
          <p style={{ fontSize: 14, color: muted, lineHeight: 1.6 }}>이미지와 제품 정보를 기반으로 톤앤매너를 분석하고, 섹션별 콘텐츠를 자동 생성합니다.</p>
        </div>

        {/* 폼 — 카드 없이 플랫 스타일 */}
        <div style={{ background: D ? cardBg : "#fff", borderRadius: 16, padding: "28px 24px", border: `1px solid ${bdr}` }}>

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
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, borderColor: aiFilling && !features ? acc + "60" : undefined }} />
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
              { key: "fast", label: "에센셜", desc: "핵심 구성 8~10페이지" },
              { key: "precise", label: "프리미엄", desc: "풀 구성 15~20페이지" },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
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

          <button onClick={runPipeline}
            disabled={!productName.trim() || !category || images.length === 0}
            style={{
              ...btnPrimary,
              opacity: (!productName.trim() || !category || images.length === 0) ? 0.35 : 1,
              width: "100%", maxWidth: "100%",
            }}>
            ✦ 상세페이지 생성하기
          </button>
          {(!productName.trim() || !category || images.length === 0) && (
            <p style={{ fontSize: 11, color: muted, marginTop: 8, textAlign: "center" }}>
              {!images.length ? "제품 사진을 먼저 올려주세요" : !productName.trim() ? "상품명을 입력해주세요" : "카테고리를 선택해주세요"}
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
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{pipeError}</span>
            <button onClick={() => setPhase("input")} style={{ background: "none", border: "none", color: "#f87171", fontWeight: 700, cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}>돌아가기</button>
          </div>
        )}
      </div>
    </div>
  );

  // ── 아웃라인 확인 (Phase 1.5) ──────────────────────────
  if (phase === "outline") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: D ? "transparent" : "#f5f5f5", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "24px 24px 0" }}>
        <div style={{ maxWidth: 600, width: "100%" }}>
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
              <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${enabled ? acc + "35" : bdr}`, background: enabled ? (D ? "rgba(124,106,255,0.06)" : "#faf9ff") : (D ? "rgba(255,255,255,0.02)" : "#fafafa"), marginBottom: 8, opacity: enabled ? 1 : 0.4, transition: "all 0.15s" }}>
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
                {/* 배경색 + 번호 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: sec.bg_color || "#f8f8f8", border: `1px solid ${bdr}` }} />
                  <span style={{ fontSize: 10, color: muted, fontWeight: 600, fontFamily: "monospace" }}>{i + 1}</span>
                </div>
              </div>
            );
          })}
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
          <button onClick={async () => {
            const enabledSecs = sections.filter(s => s.enabled !== false);
            setSections(enabledSecs);
            setPhase("editor");
            // 모든 섹션 AI 이미지 자동 생성 (히어로 포함)
            if (!user) return; // AI 이미지 생성은 로그인 필요
            for (const sec of enabledSecs) {
              if (sec.type === "ai_notice" || !sec.image_prompt) continue;
              if (sectionImages[sec.id]?.url) continue;
              // 업로드 이미지 기반 컨텍스트 추가
              const productContext = productName ? ` for "${productName}"` : "";
              const enhancedPrompt = sec.type === "hero"
                ? `Professional hero banner image${productContext}. ${sec.image_prompt}. High quality product photography, studio lighting, clean background.`
                : `${sec.image_prompt}${productContext}. Professional product photography style, clean and modern.`;
              generateSectionImage(sec.id, enhancedPrompt);
              // 동시 요청 부하 분산 (1.5초 간격)
              await new Promise(r => setTimeout(r, 1500));
            }
          }}
            style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 16px ${acc}40` }}>
            편집 시작 ({sections.filter(s => s.enabled !== false).length}개 섹션) →
          </button>
        </div>
      </div>
    </div>
  );

  // ── 에디터 (Phase 2) ────────────────────────────────────
  if (phase === "editor") return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽 사이드바 */}
      <div style={{ width: 280, borderRight: `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff" }}>
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
                  { type: "text", role: "body", content: "내용을 입력하세요", x: 50, y: 300, w: 760, fontSize: 16, fontWeight: "400", color: "#666", lineHeight: 1.7 },
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
                  {/* 텍스트/배지 요소 레이어 */}
                  {(sections[activeSection]?.elements || []).map((el, ei) => (
                    <div key={ei} onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: ei, el: { ...el, _type: el.type === "badge" ? "text" : "text" } })}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", background: selectedEl?.secIdx === activeSection && selectedEl?.elIdx === ei ? `${acc}15` : "transparent", border: `1px solid ${selectedEl?.secIdx === activeSection && selectedEl?.elIdx === ei ? acc : "transparent"}` }}>
                      <span style={{ fontSize: 9, color: acc, fontWeight: 700, width: 16, flexShrink: 0 }}>
                        {el.type === "badge" ? "B" : el.type === "divider" ? "—" : "T"}
                      </span>
                      <span style={{ fontSize: 10, color: text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {el.content?.slice(0, 25) || el.role || el.type}
                      </span>
                      <span style={{ fontSize: 8, color: muted }}>{el.role}</span>
                    </div>
                  ))}
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

                  {/* 그림자 / 배경박스 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
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
                  <div style={{ width: "100%", height: 140, borderRadius: 12, overflow: "hidden", background: D ? "rgba(255,255,255,0.04)" : "#f5f5f5", marginBottom: 8, position: "relative", cursor: "pointer" }}
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
                      {/* 실제 디자인 미리보기 */}
                      <div style={{ width: "100%", padding: "20px 16px", background: tmpl.bg_color || "#fff", minHeight: 80 }}>
                        {subtitleEl && <div style={{ fontSize: 8, fontWeight: 700, color: subtitleEl.color || (bgDark ? "rgba(255,255,255,0.5)" : "#999"), letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{subtitleEl.content?.slice(0,20)}</div>}
                        {titleEl && <div style={{ fontSize: 14, fontWeight: 900, color: titleEl.color || (bgDark ? "#fff" : "#1a1a2e"), lineHeight: 1.3, marginBottom: 6 }}>{titleEl.content?.slice(0,25)}</div>}
                        {bodyEl && <div style={{ fontSize: 9, color: bodyEl.color || (bgDark ? "rgba(255,255,255,0.5)" : "#888"), lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{bodyEl.content?.slice(0,60)}</div>}
                        {!titleEl && !bodyEl && <div style={{ fontSize: 10, color: bgDark ? "rgba(255,255,255,0.3)" : "#ccc" }}>{tmpl.label}</div>}
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>동영상 추가</div>
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
                    style={{ width: "100%", padding: "14px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>
                    + 동영상 파일 업로드
                  </button>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>또는 URL 입력</div>
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

              {/* 전체 색상 팔레트 */}
              {colorPalette && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>전체 팔레트</div>
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
        {/* 상단 액션 바 */}
        <div style={{ maxWidth: 860, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: muted }}>{sections.length}개 섹션 · {Object.values(sectionImages).filter(v => v?.url).length}개 이미지 생성됨</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={generateAllImages}
              style={{ padding: "7px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ✦ 전체 AI 이미지 생성
            </button>
            <button onClick={() => setPhase("input")}
              style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", color: muted, border: `1px solid ${bdr}`, fontSize: 11, cursor: "pointer" }}>
              ← 다시 입력
            </button>
          </div>
        </div>
        {/* 인라인 툴바 제거 — 좌측 속성 패널로 통합됨 */}

        <div onClick={() => setSelectedEl(null)} style={{ maxWidth: 860, margin: "0 auto", transform: `scale(${canvasZoom/100})`, transformOrigin: "top center", transition: "transform 0.2s" }}>
          {sections.map((sec, i) => (
            <div key={sec.id}
              onClick={() => setActiveSection(i)}
              style={{
                position: "relative", marginBottom: 4,
                border: activeSection === i ? `2px solid ${acc}` : "2px solid transparent",
                borderRadius: 4, cursor: "pointer",
                overflow: "hidden",
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
                const bgCol = sec.bg_color || "#fff";
                const hexClean = (bgCol || "#fff").replace("#", "");
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
                  return {
                    contentEditable: true,
                    suppressContentEditableWarning: true,
                    onBlur: onBlurByRef(el),
                    onClick: (e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: elIdx(el), el: { ...el, _type: "text" } }); },
                    onMouseDown: selected ? (e) => {
                      if (e.target.closest("[data-handle]")) return;
                      dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: el.offsetX || 0, origY: el.offsetY || 0 };
                    } : undefined,
                    style: {
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
                      lineHeight: el.lineHeight || undefined,
                      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                      marginTop: el.offsetY ? `${el.offsetY}px` : undefined,
                      marginLeft: el.offsetX ? `${el.offsetX}px` : undefined,
                      ...(el.bgBox ? { background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", padding: "8px 14px", borderRadius: 8 } : {}),
                    },
                  };
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
                const decoLine = (color, width = 40) => (
                  <div style={{ width, height: 2, background: color || mainColor, margin: "0 auto 16px", borderRadius: 1 }} />
                );
                const decoLineLong = (color) => (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "0 auto 24px", justifyContent: "center", maxWidth: 200 }}>
                    <div style={{ flex: 1, height: 1, background: color || (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)") }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: mainColor }} />
                    <div style={{ flex: 1, height: 1, background: color || (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)") }} />
                  </div>
                );

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
                //  HERO SECTION
                // ════════════════════════════════════════
                if (secType === "hero" || (layout === "full_image" && i === 0)) {
                  const subtitle = findEl("subtitle");
                  const title = findEl("title");
                  const body = findEl("body");
                  const badge = els.find(e => e.type === "badge");
                  return (
                    <div style={{ width: "100%", minHeight: 560, position: "relative", overflow: "hidden", background: "#111" }}>
                      {renderHeroImage()}
                      {/* 그라디언트 오버레이 */}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)" }} />
                      {/* 배지 - 좌측 상단 */}
                      {badge && (
                        <div style={{ position: "absolute", top: 24, left: 28, zIndex: 2 }}>
                          <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "8px 20px", borderRadius: 24, background: mainColor, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 0.5, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
                            {badge.content}
                          </span>
                        </div>
                      )}
                      {/* 콘텐츠 */}
                      <div style={{ position: "relative", zIndex: 1, padding: "80px 48px 56px", minHeight: 560, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        {subtitle && (
                          <div {...editable(subtitle)} style={{ ...editable(subtitle).style, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
                            {subtitle.content}
                          </div>
                        )}
                        {title && (
                          <div {...editable(title)} style={{ ...editable(title).style, fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 16, letterSpacing: -0.5, textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
                            {title.content}
                          </div>
                        )}
                        {body && (
                          <div {...editable(body)} style={{ ...editable(body).style, fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 500 }}>
                            {body.content}
                          </div>
                        )}
                        {!subtitle && !title && !body && els.filter(e => e.type === "text").slice(0, 3).map((el, ei) => (
                          <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: ei === 0 ? 14 : ei === 1 ? 38 : 16, fontWeight: ei === 1 ? 900 : ei === 0 ? 600 : 400, color: "#fff", lineHeight: ei === 1 ? 1.25 : 1.7, marginBottom: ei === 1 ? 16 : 8, letterSpacing: ei === 0 ? 3 : 0 }}>
                            {el.content}
                          </div>
                        ))}
                        {/* 통계 블록 (Figma 패턴) */}
                        {findEls("stat_number").length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(findEls("stat_number").length, 4)}, 1fr)`, gap: 12, marginTop: 28, maxWidth: 480 }}>
                            {findEls("stat_number").map((sn, si) => (
                              <div key={si} style={{ textAlign: "center", padding: "14px 8px", borderRadius: 12, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                                <div {...editable(sn)} style={{ ...editable(sn).style, fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{sn.content}</div>
                                {findEls("stat_label")[si] && (
                                  <div {...editable(findEls("stat_label")[si])} style={{ ...editable(findEls("stat_label")[si]).style, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{findEls("stat_label")[si].content}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* CTA 버튼 */}
                        {findEl("price") && (
                          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ padding: "16px 32px", borderRadius: 14, background: mainColor, color: "#fff", fontSize: 16, fontWeight: 800, boxShadow: `0 4px 20px ${mainColor}40` }}>
                              {findEl("price") && <span {...editable(findEl("price"))} style={{ ...editable(findEl("price")).style }}>{findEl("price").content}</span>}
                              {" "}구매하기
                            </div>
                          </div>
                        )}
                        {!findEl("price") && (
                          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.3)" }} />
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 500 }}>SCROLL DOWN</span>
                          </div>
                        )}
                      </div>
                      {/* 이미지 교체 */}
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
                        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
                          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
                      </div>
                      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
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
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 8 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
                        {items.map((item, pi) => (
                          <div key={pi} style={{ display: "flex", gap: 16, padding: "20px 24px", borderRadius: 14, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, boxShadow: "0 1px 6px rgba(0,0,0,0.03)" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${mainColor}20` }}>
                              <span style={{ fontSize: 14, fontWeight: 900, color: mainColor }}>?</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              {item.title && (
                                <div {...editable(item.title)} style={{ ...editable(item.title).style, fontSize: 15, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: item.body ? 6 : 0, lineHeight: 1.4 }}>
                                  {item.title.content}
                                </div>
                              )}
                              {item.body && (
                                <div {...editable(item.body)} style={{ ...editable(item.body).style, fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 }}>
                                  {item.body.content}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                  // group grid elements: pair title+body
                  const items = [];
                  for (let g = 0; g < gridEls.length; g++) {
                    if (gridEls[g].fontWeight === "700" || gridEls[g].fontWeight === "900" || gridEls[g].role === "body" && items.length === 0) {
                      items.push({ title: gridEls[g], body: gridEls[g + 1]?.fontWeight !== "700" && gridEls[g + 1]?.fontWeight !== "900" ? gridEls[g + 1] : null });
                      if (items[items.length - 1].body) g++;
                    } else {
                      items.push({ title: gridEls[g], body: null });
                    }
                  }
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      {/* 섹션 타이틀 */}
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 8 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      {/* 그리드 */}
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cols === 3 ? 20 : 28 }}>
                        {items.length > 0 ? items.map((item, gi) => (
                          <div key={gi} style={{ textAlign: "center", padding: cols === 3 ? "28px 16px" : "36px 24px", borderRadius: 20, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, boxShadow: isDarkBg ? "none" : "0 4px 20px rgba(0,0,0,0.04)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                            {iconCircle(gi, cols === 3 ? 52 : 64)}
                            {item.title && (
                              <div {...editable(item.title)} style={{ ...editable(item.title).style, fontSize: cols === 3 ? 14 : 16, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 10, lineHeight: 1.4 }}>
                                {item.title.content}
                              </div>
                            )}
                            {item.body && (
                              <div {...editable(item.body)} style={{ ...editable(item.body).style, fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", lineHeight: 1.7 }}>
                                {item.body.content}
                              </div>
                            )}
                          </div>
                        )) : gridEls.map((el, gi) => (
                          <div key={gi} style={{ textAlign: "center", padding: cols === 3 ? "28px 16px" : "36px 24px", borderRadius: 20, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, boxShadow: isDarkBg ? "none" : "0 4px 20px rgba(0,0,0,0.04)" }}>
                            {iconCircle(gi, cols === 3 ? 52 : 64)}
                            <div {...editable(el)} style={{ ...editable(el).style, fontSize: el.fontWeight === "700" || el.fontWeight === "900" ? 16 : 13, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.6 }}>
                              {el.content}
                            </div>
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

                  const textBlock = (
                    <div style={{ flex: 1, padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left" }}>
                      {/* POINT 넘버 라인 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 32, height: 2, background: mainColor }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: mainColor, letterSpacing: 4, textTransform: "uppercase" }}>
                          POINT {String(pointNum).padStart(2, "0")}
                        </span>
                      </div>
                      {badge && (
                        <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "6px 16px", borderRadius: 24, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 16, alignSelf: "flex-start", border: `1px solid ${mainColor}20` }}>
                          {badge.content}
                        </span>
                      )}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 14, fontWeight: 600, color: mainColor, marginBottom: 10, letterSpacing: 1, textAlign: "left" }}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {titleEl && (
                        <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 20, textAlign: "left" }}>
                          {titleEl.content}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.65)" : "#555"), lineHeight: 1.8, marginBottom: 10, textAlign: "left" }}>
                          {el.content}
                        </div>
                      ))}
                      {!subtitleEl && !titleEl && bodyEls.length === 0 && els.filter(e => e.type === "text").map((el, ei) => (
                        <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: el.fontWeight === "900" ? 28 : el.fontWeight === "700" ? 16 : 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: el.fontWeight === "900" ? 1.3 : 1.8, marginBottom: el.fontWeight === "900" ? 20 : 10, textAlign: "left" }}>
                          {el.content}
                        </div>
                      ))}
                    </div>
                  );

                  const imageBlock = (
                    <div style={{ flex: 1, minHeight: 420, position: "relative", overflow: "hidden" }}>
                      {renderPlaceholder(420, { borderRadius: 0 })}
                    </div>
                  );

                  return (
                    <div style={{ display: "flex", minHeight: 420, background: bgCol, flexDirection: imgLeft ? "row" : "row-reverse" }}>
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
                  // group reviews
                  const cards = [];
                  reviewEls.forEach(el => {
                    if (el.role === "review_name" || (cards.length === 0)) {
                      cards.push([]);
                    }
                    cards[cards.length - 1].push(el);
                  });
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {badge && (
                          <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "6px 18px", borderRadius: 20, background: mainColor, color: "#fff", fontSize: 11, fontWeight: 800, marginBottom: 14, letterSpacing: 2 }}>
                            {badge.content}
                          </span>
                        )}
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl ? (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        ) : (
                          <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>REAL REVIEW</div>
                        )}
                        {decoLineLong()}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: cards.length > 2 ? "1fr 1fr" : "1fr", gap: 16, maxWidth: 700, margin: "0 auto" }}>
                        {cards.map((group, gi) => (
                          <div key={gi} style={{ padding: "24px 28px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, boxShadow: isDarkBg ? "none" : "0 2px 12px rgba(0,0,0,0.04)" }}>
                            {/* 별점 */}
                            {(() => {
                              const star = group.find(e => e.role === "star");
                              return star ? (
                                <div style={{ color: "#fbbf24", fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>
                                  {"★".repeat(parseInt(star.content) || 5)}
                                </div>
                              ) : (
                                <div style={{ color: "#fbbf24", fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>★★★★★</div>
                              );
                            })()}
                            {/* 후기 텍스트 */}
                            {group.filter(e => e.role === "review_text").map((el, ri) => (
                              <div key={ri} {...editable(el)} style={{ ...editable(el).style, fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.75)" : "#444", lineHeight: 1.65, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {el.content}
                              </div>
                            ))}
                            {/* 리뷰어 이름 */}
                            {group.filter(e => e.role === "review_name").map((el, ni) => (
                              <div key={ni} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${mainColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: mainColor }}>
                                  {(el.content || "?")[0]}
                                </div>
                                <div {...editable(el)} style={{ ...editable(el).style, fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#888" }}>
                                  {el.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
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
                  return (
                    <div style={{ background: bgCol, padding: "72px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 48 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLineLong()}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
                        {statNums.map((sn, si) => (
                          <div key={si} style={{ textAlign: "center", minWidth: 160, padding: "32px 24px", borderRadius: 20, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, boxShadow: isDarkBg ? "none" : "0 4px 24px rgba(0,0,0,0.04)" }}>
                            <div {...editable(sn)} style={{ ...editable(sn).style, fontSize: 56, fontWeight: 900, color: mainColor, lineHeight: 1, marginBottom: 10, letterSpacing: -2 }}>
                              {sn.content}
                            </div>
                            {statLabels[si] && (
                              <div {...editable(statLabels[si])} style={{ ...editable(statLabels[si]).style, fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" }}>
                                {statLabels[si].content}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 48 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl ? (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        ) : (
                          <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>HOW TO USE</div>
                        )}
                        {decoLine(mainColor)}
                      </div>
                      <div style={{ maxWidth: 520, margin: "0 auto", position: "relative" }}>
                        {/* 세로 연결선 */}
                        <div style={{ position: "absolute", left: 24, top: 48, bottom: 48, width: 2, background: `${mainColor}15` }} />
                        {steps.map((step, si) => (
                          <div key={si} style={{ display: "flex", gap: 24, marginBottom: 36, position: "relative" }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: mainColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0, zIndex: 1, boxShadow: `0 4px 14px ${mainColor}30` }}>
                              {si + 1}
                            </div>
                            <div style={{ flex: 1, paddingTop: 4 }}>
                              {step.title && (
                                <div {...editable(step.title)} style={{ ...editable(step.title).style, fontSize: 17, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 6, lineHeight: 1.4 }}>
                                  {step.title.content}
                                </div>
                              )}
                              {step.body && (
                                <div {...editable(step.body)} style={{ ...editable(step.body).style, fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 }}>
                                  {step.body.content}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLineLong()}
                      </div>
                      {hasStat ? (
                        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", marginBottom: bodyEls.length ? 32 : 0 }}>
                          {statNums.map((sn, si) => (
                            <div key={si} style={{ textAlign: "center", minWidth: 120 }}>
                              <div {...editable(sn)} style={{ ...editable(sn).style, fontSize: 52, fontWeight: 900, color: mainColor, lineHeight: 1.1, marginBottom: 8 }}>
                                {sn.content}
                              </div>
                              {statLabels[si] && (
                                <div {...editable(statLabels[si])} style={{ ...editable(statLabels[si]).style, fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" }}>
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
                              <div {...editable(el)} style={{ ...editable(el).style, fontSize: 13, fontWeight: el.fontWeight || "600", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.6 }}>
                                {el.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={{ ...editable(el).style, textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", lineHeight: 1.7, marginTop: 16, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                          {el.content}
                        </div>
                      ))}
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
                  // body content: "항목|일반|우리 제품" 형식
                  const rows = bodyEls.map(el => {
                    const parts = (el.content || "").split("|").map(s => s.trim());
                    return { el, label: parts[0] || "", before: parts[1] || "", after: parts[2] || "" };
                  });
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor, 40)}
                      </div>
                      <div style={{ maxWidth: 620, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                        {/* 헤더 */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f5f5f5", padding: "14px 24px" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999" }}>항목</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", textAlign: "center" }}>일반</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, textAlign: "center" }}>우리 제품</span>
                        </div>
                        {rows.map((row, ri) => (
                          <div key={ri} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "14px 24px", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                            <span {...editable(row.el)} style={{ ...editable(row.el).style, fontSize: 14, fontWeight: 600, color: isDarkBg ? "#fff" : "#333" }}>{row.label}</span>
                            <span style={{ fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#bbb", textAlign: "center" }}>{row.before}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: mainColor, textAlign: "center" }}>{row.after}</span>
                          </div>
                        ))}
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
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
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
                              <div {...editable(bodyEls[0])} style={{ ...editable(bodyEls[0]).style, fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 }}>
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
                              <div {...editable(bodyEls[1])} style={{ ...editable(bodyEls[1]).style, fontSize: 13, fontWeight: 600, color: isDarkBg ? "#fff" : "#333", lineHeight: 1.7 }}>
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
                      <div style={{ background: bgCol, padding: "64px 48px", textAlign: "center" }}>
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 24 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#666", lineHeight: 1.8, marginBottom: 8 }}>
                            {el.content}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
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
                                  <div {...editable(plan.name)} style={{ ...editable(plan.name).style, fontSize: 16, fontWeight: 800, color: isDarkBg ? "#fff" : "#333", marginBottom: 8 }}>
                                    {plan.name.content}
                                  </div>
                                )}
                                {plan.price && (
                                  <div {...editable(plan.price)} style={{ ...editable(plan.price).style, fontSize: 32, fontWeight: 900, color: mainColor, marginBottom: 8 }}>
                                    {plan.price.content}
                                  </div>
                                )}
                                {plan.desc && (
                                  <div {...editable(plan.desc)} style={{ ...editable(plan.desc).style, fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#999", marginBottom: 20 }}>
                                    {plan.desc.content}
                                  </div>
                                )}
                                <div style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 16 }} />
                                {plan.features.map((feat, fi) => (
                                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, justifyContent: "flex-start", paddingLeft: 8 }}>
                                    <span style={{ fontSize: 10, color: mainColor, fontWeight: 900 }}>+</span>
                                    <span {...editable(feat)} style={{ ...editable(feat).style, fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555" }}>
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
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
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
                              <div {...editable(q)} style={{ ...editable(q).style, fontSize: 15, fontWeight: 700, color: isDarkBg ? "#fff" : "#1a1a2e", flex: 1 }}>
                                {q.content}
                              </div>
                            </div>
                            {answers[qi] && (
                              <div style={{ padding: "14px 24px 16px 52px", background: isDarkBg ? "rgba(255,255,255,0.02)" : "#fff" }}>
                                <div {...editable(answers[qi])} style={{ ...editable(answers[qi]).style, fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7 }}>
                                  {answers[qi].content}
                                </div>
                              </div>
                            )}
                          </div>
                        )) : bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={{ ...editable(el).style, padding: "14px 24px", borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555", lineHeight: 1.7 }}>
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
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px", textAlign: "center" }}>
                      {/* 방패 아이콘 */}
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${mainColor}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: `2px solid ${mainColor}25` }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: mainColor }}>&#10003;</span>
                      </div>
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {titleEl && (
                        <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 16 }}>
                          {titleEl.content}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 8, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                          {el.content}
                        </div>
                      ))}
                      {badge && (
                        <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "10px 28px", borderRadius: 24, background: `${mainColor}10`, color: mainColor, fontSize: 14, fontWeight: 800, marginTop: 20, border: `1.5px solid ${mainColor}30` }}>
                          {badge.content}
                        </span>
                      )}
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
                  const shippingSymbols = ["*", "+", "~", "#", "=", ">", "-", "&"];
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px" }}>
                      <div style={{ textAlign: "center", marginBottom: 40 }}>
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 24, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {decoLine(mainColor)}
                      </div>
                      <div style={{ maxWidth: 600, margin: "0 auto" }}>
                        {bodyEls.map((el, bi) => (
                          <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 0", borderBottom: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${mainColor}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                              {shippingSymbols[bi % shippingSymbols.length]}
                            </div>
                            <div {...editable(el)} style={{ ...editable(el).style, flex: 1, fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.75)" : "#444"), lineHeight: 1.7, paddingTop: 6 }}>
                              {el.content}
                            </div>
                          </div>
                        ))}
                      </div>
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
                  return (
                    <div style={{ background: bgCol, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                      {/* 배경 장식 */}
                      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `${mainColor}08` }} />
                      <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: `${mainColor}06` }} />
                      <div style={{ position: "relative", zIndex: 1 }}>
                        {badge && (
                          <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "8px 24px", borderRadius: 24, background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})`, color: "#fff", fontSize: 13, fontWeight: 800, marginBottom: 20, boxShadow: `0 4px 14px ${mainColor}30` }}>
                            {badge.content}
                          </span>
                        )}
                        {subtitleEl && (
                          <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 10, letterSpacing: 2 }}>
                            {subtitleEl.content}
                          </div>
                        )}
                        {titleEl && (
                          <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 16 }}>
                            {titleEl.content}
                          </div>
                        )}
                        {bodyEls.map((el, bi) => (
                          <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#666", lineHeight: 1.7, marginBottom: 8, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                            {el.content}
                          </div>
                        ))}
                      </div>
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
                  return (
                    <div style={{ background: bgCol, padding: "72px 48px", textAlign: "center" }}>
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 10, letterSpacing: 2 }}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {titleEl && (
                        <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 20 }}>
                          {titleEl.content}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7, marginBottom: 8, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
                          {el.content}
                        </div>
                      ))}
                      {priceEl && (
                        <div style={{ marginTop: 24, marginBottom: 28 }}>
                          <div {...editable(priceEl)} style={{ ...editable(priceEl).style, fontSize: 36, fontWeight: 900, color: mainColor }}>
                            {priceEl.content}
                          </div>
                        </div>
                      )}
                      {badge && (
                        <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "6px 18px", borderRadius: 20, background: `${mainColor}10`, color: mainColor, fontSize: 12, fontWeight: 700, marginBottom: 24, border: `1px solid ${mainColor}25` }}>
                          {badge.content}
                        </span>
                      )}
                      <div>
                        <div style={{ display: "inline-block", padding: "18px 64px", borderRadius: 60, background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})`, color: "#fff", fontSize: 18, fontWeight: 900, boxShadow: `0 6px 24px ${mainColor}35`, letterSpacing: 1 }}>
                          지금 바로 구매하기
                        </div>
                      </div>
                      {/* 신뢰 배지 */}
                      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28 }}>
                        {["무료배송", "100% 정품", "안전결제"].map((t, ti) => (
                          <div key={ti} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${mainColor}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 8, color: mainColor }}>✓</span>
                            </div>
                            <span style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999", fontWeight: 500 }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ════════════════════════════════════════
                //  AI NOTICE
                // ════════════════════════════════════════
                if (secType === "ai_notice") {
                  return (
                    <div style={{ background: bgCol || (isDarkBg ? "#1a1a1a" : "#fafafa"), padding: "28px 48px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: isDarkBg ? "rgba(255,255,255,0.15)" : "#ccc" }} />
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: isDarkBg ? "rgba(255,255,255,0.15)" : "#ccc" }} />
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: isDarkBg ? "rgba(255,255,255,0.15)" : "#ccc" }} />
                      </div>
                      {els.filter(e => e.type === "text").map((el, ei) => (
                        <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: 11, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#bbb", lineHeight: 1.6 }}>
                          {el.content}
                        </div>
                      ))}
                      {els.filter(e => e.type === "text").length === 0 && (
                        <div style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#bbb", lineHeight: 1.6 }}>
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
                    <div style={{ background: bgCol, padding: "56px 48px" }}>
                      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 48px", borderRadius: 20, border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`, textAlign: "center", position: "relative" }}>
                        {/* 인용 부호 장식 */}
                        <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", width: 32, height: 32, background: bgCol, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 32, color: `${mainColor}40`, fontFamily: "Georgia, serif", lineHeight: 1 }}>"</span>
                        </div>
                        {els.map((el, ei) => {
                          if (el.type === "badge") return (
                            <span key={ei} {...editable(el)} style={{ ...editable(el).style, display: "inline-block", padding: "5px 14px", borderRadius: 16, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 16, border: `1px solid ${mainColor}20` }}>
                              {el.content}
                            </span>
                          );
                          if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "20px auto", maxWidth: 100 }} />;
                          return (
                            <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: el.role === "title" ? 22 : 14, fontWeight: el.role === "title" ? 900 : 400, color: el.color || (isDarkBg ? (el.role === "title" ? "#fff" : "rgba(255,255,255,0.6)") : (el.role === "title" ? "#1a1a2e" : "#666")), lineHeight: el.role === "title" ? 1.35 : 1.8, marginBottom: el.role === "title" ? 12 : 6 }}>
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
                            <span key={ei} {...editable(el)} style={{ ...editable(el).style, display: "inline-block", padding: "6px 16px", borderRadius: 20, background: el.bg || mainColor, color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 12, alignSelf: "flex-start" }}>
                              {el.content}
                            </span>
                          );
                          if (el.type === "divider") return <div key={ei} style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "16px 0", maxWidth: 60 }} />;
                          return (
                            <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: el.role === "title" ? 30 : el.role === "subtitle" ? 13 : 15, fontWeight: el.role === "title" ? 900 : el.role === "subtitle" ? 600 : 400, color: "#fff", lineHeight: el.role === "title" ? 1.3 : 1.7, marginBottom: el.role === "title" ? 14 : 6, letterSpacing: el.role === "subtitle" ? 2 : 0, opacity: el.role === "subtitle" ? 0.7 : 1 }}>
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
                return (
                  <div style={{ background: bgCol, padding: "56px 48px", textAlign: "center" }}>
                    {badge && (
                      <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "6px 16px", borderRadius: 20, background: `${mainColor}12`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 16, border: `1px solid ${mainColor}20` }}>
                        {badge.content}
                      </span>
                    )}
                    {subtitleEl && (
                      <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                        {subtitleEl.content}
                      </div>
                    )}
                    {titleEl && (
                      <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 26, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.35, marginBottom: 16 }}>
                        {titleEl.content}
                      </div>
                    )}
                    {(titleEl || subtitleEl) && decoLine(mainColor)}
                    {bodyEls.map((el, bi) => (
                      <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.65)" : "#666"), lineHeight: 1.8, marginBottom: 8, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
                        {el.content}
                      </div>
                    ))}
                    {!titleEl && !subtitleEl && bodyEls.length === 0 && els.map((el, ei) => {
                      if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "16px auto", maxWidth: 100 }} />;
                      if (el.type === "badge") return null;
                      return (
                        <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: el.fontWeight === "900" ? 26 : el.fontWeight === "700" ? 16 : 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#444"), lineHeight: 1.7, marginBottom: 10 }}>
                          {el.content}
                        </div>
                      );
                    })}
                  </div>
                );
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
                    { icon: "+", label: "추가", action: () => { const n = { id:`sec_add_${Date.now()}`, type:"point", bg_color:"#fff", elements:[{type:"text",role:"title",content:"새 섹션",fontSize:36,fontWeight:"900",color:"#1a1a2e"}] }; setSections(prev=>[...prev.slice(0,i+1),n,...prev.slice(i+1)]); setActiveSection(i+1); } },
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
      <div style={{ width: 300, borderLeft: `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff" }}>
        {/* 파이프라인 결과 요약 */}
        <div style={{ padding: "16px", borderBottom: `1px solid ${bdr}` }}>
          {PIPELINE_STEPS.map((step, i) => {
            if (i === 0) return (
              <div key={step.id} style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 8, fontSize: 12, color: text, fontWeight: 600, cursor: "pointer" }}>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
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
              <div key={mi} style={{ marginBottom: 8, padding: "10px 12px", borderRadius: 10, background: msg.role === "user" ? `${acc}15` : (D ? "rgba(255,255,255,0.04)" : "#f8f8f8"), border: `1px solid ${msg.role === "user" ? acc + "30" : bdr}` }}>
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
