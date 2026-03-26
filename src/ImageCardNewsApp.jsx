import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";

/* ══════════════════════════════════════════════════════════════
   ImageCardNewsApp.jsx
   이미지 카드뉴스 생성기
   - AI 이미지 생성 방식
   - 기본 사이즈: 정사각형 1000×1000
   - 주제 + 내용만 입력하면 AI가 슬라이드 구성
══════════════════════════════════════════════════════════════ */

import { callAI } from "./aiClient";

// ── 스타일 템플릿 ────────────────────────────────────────────
const STYLE_TEMPLATES = [
  { id:"dark_luxury",   label:"다크 럭셔리",   desc:"어두운 배경, 골드 포인트",   preview:{bg:"linear-gradient(135deg,#1a1208,#0d0d0d)",accent:"#c9a84c",textColor:"#fff",subColor:"rgba(201,168,76,0.7)",pattern:"diagonal"}, prompt:"프리미엄 럭셔리 브랜드 스타일. 깊고 어두운 배경, 골드 포인트 컬러, 세련된 세리프 타이포그래피, 드라마틱한 조명." },
  { id:"minimal_white", label:"미니멀 화이트", desc:"깔끔한 여백, 에디토리얼",    preview:{bg:"#ffffff",accent:"#1a1a1a",textColor:"#1a1a1a",subColor:"#888",pattern:"clean"}, prompt:"극도로 미니멀한 에디토리얼 디자인. 순백색 배경, 검정 타이포그래피, 넓은 여백, 산세리프 볼드 폰트." },
  { id:"warm_beige",    label:"감성 내추럴",   desc:"베이지/크림, 따뜻한 감성",   preview:{bg:"linear-gradient(135deg,#f5ede0,#ede3d5)",accent:"#8b6f4e",textColor:"#3d2b1f",subColor:"#9e8070",pattern:"organic"}, prompt:"따뜻하고 감성적인 내추럴 라이프스타일 스타일. 크림/베이지 배경, 자연광 느낌의 포근한 조명." },
  { id:"bold_graphic",  label:"트렌디 그래픽", desc:"굵은 타이포, 강렬한 컬러",   preview:{bg:"linear-gradient(135deg,#ff2d55,#ff6b35)",accent:"#fff200",textColor:"#ffffff",subColor:"rgba(255,255,255,0.85)",pattern:"bold"}, prompt:"대담하고 트렌디한 그래픽 디자인. 강렬한 오렌지/레드 그라데이션, 초대형 볼드 타이포그래피." },
  { id:"clean_health",  label:"클린 헬스케어", desc:"화이트/그린, 신뢰감 있는",   preview:{bg:"linear-gradient(135deg,#f0faf5,#e6f7ee)",accent:"#00875a",textColor:"#1a3a28",subColor:"#4d8c6f",pattern:"grid"}, prompt:"깔끔하고 신뢰감 있는 헬스케어 스타일. 그린 틴트 배경, 에메랄드 그린 포인트." },
  { id:"pastel_soft",   label:"파스텔 소프트", desc:"연한 파스텔, 귀엽고 사랑스러운", preview:{bg:"linear-gradient(135deg,#fce4ec,#f8bbd0)",accent:"#e91e8c",textColor:"#4a1528",subColor:"#c2185b",pattern:"dots"}, prompt:"부드럽고 사랑스러운 파스텔 스타일. 연한 핑크/라벤더 파스텔 배경, 귀여운 일러스트 요소." },
  { id:"tech_dark",     label:"테크 다크",     desc:"다크 배경, 블루 글로우",      preview:{bg:"linear-gradient(135deg,#050d1a,#0a1f3d)",accent:"#00d4ff",textColor:"#e8f4f8",subColor:"rgba(0,212,255,0.7)",pattern:"circuit"}, prompt:"미래지향적인 테크/IT 브랜드 스타일. 딥 네이비 블랙 배경, 시안/블루 글로우 조명." },
  { id:"vintage_retro", label:"빈티지 레트로", desc:"크라프트지, 복고풍 감성",     preview:{bg:"linear-gradient(135deg,#f5e6c8,#e8d5a3)",accent:"#8b2500",textColor:"#3d1a00",subColor:"#6b4226",pattern:"noise"}, prompt:"빈티지/레트로 크라프트 스타일. 크라프트지 질감 배경, 복고풍 세리프 타이포그래피." },
  { id:"food_warm",     label:"식욕자극 푸드",  desc:"따뜻한 앰버, 클로즈업 질감", preview:{bg:"linear-gradient(135deg,#3d1500,#6b2e00)",accent:"#ff8c00",textColor:"#fff8f0",subColor:"rgba(255,200,100,0.8)",pattern:"texture"}, prompt:"식욕을 강하게 자극하는 푸드 사진 스타일. 어두운 앰버/브라운 배경, 따뜻한 오렌지 조명." },
  { id:"premium_black", label:"프리미엄 블랙", desc:"순수 블랙, 하이 콘트라스트",  preview:{bg:"#000000",accent:"#ffffff",textColor:"#ffffff",subColor:"rgba(255,255,255,0.6)",pattern:"minimal_dark"}, prompt:"극한의 프리미엄 블랙 스타일. 순수 검정 배경, 흰색과 회색만 사용한 모노크롬, 초강렬 명암 대비." },
];

// ── 사이즈 프리셋 ────────────────────────────────────────────
const SIZE_PRESETS = [
  { label:"정사각형",  w:1000, h:1000, icon:"⬜", desc:"SNS / 인스타그램" },
  { label:"세로형",   w:860,  h:1100, icon:"📱", desc:"쇼핑몰 상세 세로형" },
  { label:"가로형",   w:1200, h:628,  icon:"🖥", desc:"배너 / 블로그" },
  { label:"세로 9:16",w:1080, h:1920, icon:"📲", desc:"쇼츠 / 릴스" },
  { label:"직접 입력",w:null, h:null, icon:"✏️", desc:"직접 설정" },
];

// ── 슬라이드 타입 ────────────────────────────────────────────
const SLIDE_TYPES_CARD = [
  { id:"cover",    label:"표지" },
  { id:"intro",    label:"소개" },
  { id:"point1",   label:"핵심 포인트 1" },
  { id:"point2",   label:"핵심 포인트 2" },
  { id:"point3",   label:"핵심 포인트 3" },
  { id:"detail",   label:"상세 설명" },
  { id:"summary",  label:"요약 정리" },
  { id:"cta",      label:"마무리/CTA" },
];

const SLIDE_TYPES_DETAIL = [
  { id:"hero",       label:"메인 히어로" },
  { id:"intro",      label:"브랜드 소개" },
  { id:"feature",    label:"핵심 특징" },
  { id:"detail1",    label:"상세 설명 1" },
  { id:"detail2",    label:"상세 설명 2" },
  { id:"howto",      label:"사용 방법" },
  { id:"review",     label:"고객 후기" },
  { id:"cta",        label:"구매 유도" },
];

// ── resize 유틸 ──────────────────────────────────────────────
async function resizeImage(base64DataUrl, targetW, targetH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      const scale = Math.min(targetW / img.width, targetH / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, (targetW-sw)/2, (targetH-sh)/2, sw, sh);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

// ── 이미지 생성 API ──────────────────────────────────────────
async function generateSlideImage(prompt, productDataUrl = null) {
  let productImageB64 = null, productImageMime = null;
  if (productDataUrl) {
    productImageMime = productDataUrl.split(":")[1]?.split(";")[0] || "image/jpeg";
    productImageB64  = productDataUrl.split(",")[1] || null;
  }
  const token = await getAuthToken();
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt, productImageB64, productImageMime }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.image;
}

// ── 슬라이드 텍스트 AI 생성 ──────────────────────────────────
async function generateSlideTexts({ topic, content, pageCount, slideTypes, mode }) {
  const typeList = slideTypes.slice(0, pageCount);
  const prompt = `한국어 SNS 이미지 카피라이터입니다.
주제: ${topic}
내용: ${content}
형식: ${mode === "card" ? "카드뉴스 (정보 전달형)" : "상세페이지 (상품/서비스 소개형)"}

슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
각 슬라이드: headline(14자 이내), body(40자 이내, 선택), badge(8자 이내, 선택)

JSON만 응답:
{"slides":[${typeList.map(t=>`{"id":"${t.id}","label":"${t.label}","headline":"","body":"","badge":""}`).join(",")}]}`;

  const txt = await callAI("claude-sonnet-4-5", [{ role: "user", content: prompt }], 2000);
  return JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
}

// ── 슬라이드 이미지 프롬프트 빌더 ───────────────────────────
function buildSimplePrompt(slide, topic, styleTemplateId, imgW, imgH, mode) {
  const h = slide.headline || "";
  const b = slide.body || "";
  const styleTemplate = styleTemplateId ? STYLE_TEMPLATES.find(t=>t.id===styleTemplateId) : null;
  const ratio = imgW > imgH ? "landscape" : imgW < imgH ? "portrait" : "square";

  if (mode === "card") {
    const styleDesc = styleTemplate
      ? styleTemplate.prompt
      : "Clean, modern, professional graphic design background. Bold color gradients or solid colors.";

    const slideRole = slide.id === "cover"
      ? `Cover slide background: Eye-catching visual for topic "${topic}". Use dramatic colors, gradients, or abstract patterns.`
      : slide.id === "ending" || slide.id === "cta"
      ? `Ending/CTA slide background: Clean, minimal design with brand colors. Elegant finish.`
      : `Content slide background: Visual related to "${h || topic}". ${b ? `Context: "${b}".` : ""} Use icons, diagrams, or relevant imagery.`;

    return [
      "Create a BACKGROUND IMAGE for a Korean SNS card news slide.",
      `Design style: ${styleDesc}`,
      `Topic: ${topic}.`,
      slideRole,
      `Aspect ratio: ${imgW}x${imgH} (${ratio}).`,
      "CRITICAL: DO NOT include ANY text, letters, words, numbers, or typography in the image.",
      "DO NOT write any Korean, English, or any language text on the image.",
      "The image should be a pure visual/graphic background - text will be overlaid separately.",
      "Required: High resolution, no watermarks, commercial quality, clean composition.",
      "Forbidden: No text, no letters, no words, no clipart, no emoji, no cartoon illustrations.",
    ].join(" ");
  }

  // 상세페이지 모드
  const base = [
    "Create a BACKGROUND IMAGE for a Korean e-commerce product detail page.",
    styleTemplate ? `Design style: ${styleTemplate.prompt}` : "Sleek, modern, premium commercial design.",
    `Product/Topic: ${topic}.`,
    `Aspect ratio: ${imgW}x${imgH} (${ratio}).`,
    "CRITICAL: DO NOT include ANY text, letters, words, or typography in the image.",
    "The image must be a pure visual background - text will be overlaid separately by the app.",
    "Required: High resolution, no watermarks, commercial quality photography or graphic design.",
    "Forbidden: No text, no letters, no clipart, no emoji, no cartoon, no vector illustrations.",
  ].filter(Boolean).join(" ");
  const layout = h
    ? `Visual context: ${slide.label}. Related to "${h}". ${b?`Additional context: "${b}".`:""}`
    : `Visual context: ${slide.label}. Related to "${topic}".`;
  return `${base} ${layout}`;
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function ImageCardNewsApp({ isDark, user , onUserUpdate}) {
  const isCard = true;
  const mode = "card"; // 이미지 카드뉴스 전용
  const defaultSizeIdx = 0; // 정사각형
  const SLIDE_TYPES = SLIDE_TYPES_CARD;
  const accentBase = "#7c6aff";

  // ── 위저드 단계 ─────────────────────────────────────────────
  const [wizStep, setWizStep] = useState(1);

  // ── Step 1 ──────────────────────────────────────────────────
  const [topic,      setTopic]      = useState("");
  const [content,    setContent]    = useState("");
  const [pageCount,  setPageCount]  = useState(6);
  const [productImages, setProductImages] = useState([]);
  const [aiSugg,     setAiSugg]     = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const productFileRef = useRef(null);

  // ── Step 2: 슬라이드 기획 ───────────────────────────────────
  const [slideContents, setSlideContents] = useState([]);
  const [planGenLoading, setPlanGenLoading] = useState(false);

  // ── Step 3: 디자인 선택 ─────────────────────────────────────
  const [selStyle, setSelStyle] = useState(null);
  const [selSize,  setSelSize]  = useState(defaultSizeIdx);
  const [customW,  setCustomW]  = useState(1000);
  const [customH,  setCustomH]  = useState(1000);
  const [refImg,   setRefImg]   = useState(null);
  const [refStyle, setRefStyle] = useState("");
  const [analyzing,setAnalyzing]= useState(false);
  const refFileRef = useRef(null);
  const [urlInput,  setUrlInput]  = useState("");
  const [urlLoading,setUrlLoading]= useState(false);
  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const r = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await r.json();
      if (data.title) setTopic(data.title.slice(0, 80));
      const desc = [data.description, data.content].filter(Boolean).join(" ").slice(0, 500);
      if (desc) setContent(prev => prev ? prev + "\n" + desc : desc);
    } catch(e) { alert("URL 불러오기 실패: " + e.message); }
    setUrlLoading(false);
  };

  // ── Step 4: 생성 결과 ───────────────────────────────────────
  const [slides,   setSlides]  = useState([]);
  const [rendered, setRendered]= useState([]);
  const [loading,  setLoading] = useState(false);
  useGeneratingGuard(loading, (slides?.length || pageCount || 1) * 30, "card_news"); // 생성 중 이탈 방지
  const [progress, setProgress]= useState({ msg:"", cur:0, total:0 });
  const [err,      setErr]     = useState("");
  const [curIdx,   setCurIdx]  = useState(0);
  const [saving,   setSaving]  = useState(false);
  const [regenIdx, setRegenIdx]= useState(null);
  const [slotSaveMsg, setSlotSaveMsg] = useState({});
  const [saveMsg,  setSaveMsg] = useState("");

  // ── 테마 ────────────────────────────────────────────────────
  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.65)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const accentColor = accentBase;

  const preset  = SIZE_PRESETS[selSize] || SIZE_PRESETS[0];
  const imgW    = preset.w != null ? preset.w : (parseInt(customW) || 1000);
  const imgH    = preset.h != null ? preset.h : (parseInt(customH) || 1000);
  const imgRatio = imgW / imgH;

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:isDark?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── 핸들러 ──────────────────────────────────────────────────
  const handleProductImages = (files) => {
    Promise.all(Array.from(files).slice(0,5).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = e => res({ name:f.name, dataUrl:e.target.result }); r.readAsDataURL(f);
    }))).then(imgs => setProductImages(p => [...p,...imgs].slice(0,5)));
  };

  const handleRef = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      setRefImg(e.target.result); setAnalyzing(true);
      try {
        const b64 = e.target.result.split(",")[1], mime = e.target.result.split(":")[1].split(";")[0];
        const refTxt = await callAI("claude-sonnet-4-5", [{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:mime,data:b64}},
          {type:"text",text:"이 이미지의 디자인 스타일을 80자 이내로 설명해주세요. 색감, 분위기, 레이아웃 위주로. 한국어로."}
        ]}], 300);
        setRefStyle(refTxt || "");
      } catch { setRefStyle(""); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  // ── Step1 AI 주제/내용 추천 ─────────────────────────────────
  const getSugg = async () => {
    if (!topic.trim()) return;
    setSuggesting(true); setAiSugg(null);
    try {
      const suggTxt = (await callAI("claude-sonnet-4-5", [{role:"user", content:`카드뉴스 주제: "${topic}"\n다음을 JSON으로만 답해:\n{"topics":["더 구체적인 제목 추천1","추천2","추천3"],"contents":["들어갈 핵심 내용 추천1","추천2","추천3"]}`}], 500)).replace(/```json\n?/g,"").replace(/```/g,"").trim();
      setAiSugg(JSON.parse(suggTxt));
    } catch { setAiSugg(null); }
    setSuggesting(false);
  };

  // ── 슬라이드별 AI 추천 ───────────────────────────────────────
  const suggestSlide = async (idx) => {
    const sc = slideContents[idx];
    if (!sc) return;
    setSlideContents(prev => prev.map((s,i)=>i===idx?{...s,aiLoading:true}:s));
    try {
      const slideTxt = await callAI("claude-sonnet-4-5", [{role:"user", content:`주제:"${topic}" / 내용:"${content}" / 슬라이드:${sc.label}(${sc.id})\nJSON만:\n{"headline":"헤드라인(14자)","body":"본문(40자,없으면빈문자)","badge":"배지(8자,없으면빈문자)"}`}], 300);
      const parsed = JSON.parse(slideTxt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
      setSlideContents(prev => prev.map((s,i)=>i===idx?{...s,...parsed,aiLoading:false}:s));
    } catch { setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,aiLoading:false}:s)); }
  };

  const suggestAllSlides = async () => {
    setPlanGenLoading(true);
    for (let i = 0; i < slideContents.length; i++) {
      await suggestSlide(i);
      await new Promise(r=>setTimeout(r,200));
    }
    setPlanGenLoading(false);
  };

  // ── 보관함 ──────────────────────────────────────────────────
  const SAVES_KEY = "nper_imgcard_saves_v1";
  const saveToLibrary = (images) => {
    try {
      const saves = JSON.parse(localStorage.getItem(SAVES_KEY)||"[]");
      saves.unshift({ id:Date.now().toString(), topic, date:new Date().toLocaleDateString("ko-KR"), count:images.filter(Boolean).length, thumbnail:images.find(Boolean)||null, images:images.filter(Boolean) });
      localStorage.setItem(SAVES_KEY, JSON.stringify(saves.slice(0,30)));
      return true;
    } catch { return false; }
  };
  const saveOneToLibrary = (idx) => {
    const png = rendered[idx]; if (!png) return false;
    try {
      const saves = JSON.parse(localStorage.getItem(SAVES_KEY)||"[]");
      saves.unshift({ id:Date.now().toString(), topic:`${topic} — ${slides[idx]?.label}`, date:new Date().toLocaleDateString("ko-KR"), count:1, thumbnail:png, images:[png] });
      localStorage.setItem(SAVES_KEY, JSON.stringify(saves.slice(0,30)));
      return true;
    } catch { return false; }
  };

  // ── 생성 ─────────────────────────────────────────────────────
  const generate = async () => {
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage();
    setErr(""); setLoading(true); setSlides([]); setRendered([]); setSaveMsg("");
    // 전체 포인트 즉시 선차감 (슬라이드 수 × 30P)
    if (user?.uid) {
      const totalCost = (slideContents?.length || pageCount || 1) * 30;
      changePoints(user.uid, -totalCost, `이미지 카드뉴스 생성 (${slideContents?.length || pageCount}장)`).then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      });
    }
    const bul = (e)=>{ e.preventDefault(); e.returnValue="생성 중입니다."; };
    window.addEventListener("beforeunload", bul);
    try {
      setProgress({ msg:"슬라이드 텍스트 구성 중...", cur:0, total:pageCount });
      let slidesData;
      if (slideContents.length > 0) {
        slidesData = slideContents.map(sc=>({id:sc.id,label:sc.label,headline:sc.headline||"",body:sc.body||"",badge:sc.badge||""}));
        const emptySlides = slidesData.filter(s=>!s.headline);
        if (emptySlides.length > 0) {
          try {
            const fillData = await generateSlideTexts({topic,content,pageCount,slideTypes:SLIDE_TYPES,mode});
            fillData.slides?.forEach(fs=>{
              const idx = slidesData.findIndex(s=>s.id===fs.id && !s.headline);
              if(idx>=0) slidesData[idx]={...slidesData[idx],...fs};
            });
          } catch {}
        }
      } else {
        const textData = await generateSlideTexts({topic,content,pageCount,slideTypes:SLIDE_TYPES,mode});
        slidesData = textData.slides || [];
      }
      setSlides(slidesData);

      const NEGATIVE = " CRITICAL: NO clipart, NO icons, NO emoji, NO cartoon illustrations, NO vector graphics. Only real commercial photography and professional graphic design.";
      const results = new Array(slidesData.length).fill(null);
      for (let i = 0; i < slidesData.length; i++) {
        const s = slidesData[i];
        setProgress({ msg:`이미지 생성 중... (${i+1}/${slidesData.length}) — ${s.label}`, cur:i+1, total:slidesData.length });
        try {
          const prompt = buildSimplePrompt(s, topic, selStyle, imgW, imgH, mode) + (refStyle?` 참고 스타일: ${refStyle}`:"") + NEGATIVE;
          const prodImg = productImages.length > 0 ? productImages[i % productImages.length]?.dataUrl : null;
          let raw = await generateSlideImage(prompt, prodImg);
          if (raw && (imgW!==1000||imgH!==1000)) raw = await resizeImage(raw, imgW, imgH);
          results[i] = raw;
          // 포인트는 생성 시작 시점에 선차감됨
        } catch { results[i] = null; }
        setRendered([...results]);
        await new Promise(r=>setTimeout(r,50));
      }
      saveToLibrary(results);
      setSaveMsg("✅ 보관함에 저장됐어요!");
      setWizStep(4); setCurIdx(0);
    } catch(e) { setErr("생성 실패: " + e.message); }
    finally { setLoading(false); window.removeEventListener("beforeunload", bul); }
  };

  const regenerateOne = async (idx) => {
    if (!slides[idx] || regenIdx !== null) return;
    setRegenIdx(idx);
    try {
      const NEGATIVE = " CRITICAL: NO clipart, NO icons, NO emoji, NO cartoon illustrations, NO vector graphics.";
      const prodImg = productImages.length > 0 ? productImages[idx % productImages.length]?.dataUrl : null;
      const prompt = buildSimplePrompt(slides[idx], topic, selStyle, imgW, imgH, mode) + (refStyle?` 참고 스타일: ${refStyle}`:"") + NEGATIVE;
      let img = await generateSlideImage(prompt, prodImg);
      if (img && (imgW!==1000||imgH!==1000)) img = await resizeImage(img, imgW, imgH);
      setRendered(prev=>{ const r=[...prev]; r[idx]=img; return r; });
      if (img && user?.uid) changePoints(user.uid, -30, `이미지 재생성 (${slides[idx]?.label})`).then(newPts => { if(onUserUpdate) onUserUpdate({...user, points: newPts}); });
    } catch(e) { setErr("재생성 실패: " + e.message); }
    setRegenIdx(null);
  };

  const saveCurrent = () => {
    const png = rendered[curIdx]; if (!png) return;
    const a = document.createElement("a");
    a.href=png; a.download=`${topic||"slide"}_${String(curIdx+1).padStart(2,"0")}_${slides[curIdx]?.label||"slide"}.png`; a.click();
  };
  const saveAll = async () => {
    if (!rendered.some(Boolean)) return; setSaving(true);
    if (!window.JSZip) await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    const zip = new window.JSZip();
    rendered.forEach((png,i)=>{ if(!png) return; const arr=Uint8Array.from(atob(png.split(",")[1]),c=>c.charCodeAt(0)); zip.file(`${String(i+1).padStart(2,"0")}_${slides[i]?.label||"slide"}.png`,arr); });
    const blob = await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${topic||"slides"}_images.zip`; a.click();
    setSaving(false);
  };

  const resetAll = () => {
    setWizStep(1); setTopic(""); setContent(""); setProductImages([]);
    setSlideContents([]); setSelStyle(null); setSelSize(defaultSizeIdx);
    setRefImg(null); setRefStyle(""); setSlides([]); setRendered([]);
    setSaveMsg(""); setErr("");
  };

  // Step 1 → Step 2: 이동 즉시 AI로 슬라이드 내용 자동 채우기
  const goToStep2 = async () => {
    if (!topic.trim() || !content.trim()) return;
    const initialSlides = SLIDE_TYPES.slice(0, pageCount).map(t => ({
      id: t.id, label: t.label, headline: "", body: "", badge: "", aiLoading: false
    }));
    setSlideContents(initialSlides);
    setWizStep(2);
    setPlanGenLoading(true);
    try {
      const textData = await generateSlideTexts({ topic, content, pageCount, slideTypes: SLIDE_TYPES, mode });
      const filled = textData.slides || [];
      setSlideContents(initialSlides.map(s => {
        const found = filled.find(f => f.id === s.id);
        return found ? { ...s, ...found } : s;
      }));
    } catch {}
    setPlanGenLoading(false);
  };

  // ── 위저드 진행 바 ──────────────────────────────────────────
  const WizHeader = () => (
    <div style={{ padding:"20px 28px 0", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {[["1","주제 입력"],["2","슬라이드 기획"],["3","디자인 선택"],["4","AI 생성"]].map(([n, label], i) => {
          const step = parseInt(n);
          const done = wizStep > step, active = wizStep === step;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", flex:i<3?"1":"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor:done?"pointer":"default" }}
                onClick={()=>{ if(done && step<wizStep) setWizStep(step); }}>
                <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900,
                  background:done?accentColor:active?accentColor:isDark?"rgba(255,255,255,0.1)":"#e5e5e5",
                  color:done||active?"#fff":muted, flexShrink:0 }}>
                  {done?"✓":n}
                </div>
                <span style={{ fontSize:13, fontWeight:active?800:500, color:active?text:muted, whiteSpace:"nowrap" }}>{label}</span>
              </div>
              {i<3 && <div style={{ flex:1, height:2, background:done?accentColor:isDark?"rgba(255,255,255,0.1)":"#e5e5e5", margin:"0 12px", minWidth:16 }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // STEP 1: 주제 입력 (간소화)
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 1) {
    const canNext = topic.trim() && content.trim();
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:640, margin:"0 auto", padding:"0 28px 80px" }}>

          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>
              카드뉴스 주제를 알려주세요
            </div>
            <div style={{ fontSize:13, color:muted }}>
              주제와 들어갈 내용을 간단히 입력하면 AI가 이미지 슬라이드를 구성해요
            </div>
          </div>

          {/* URL 불러오기 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6, letterSpacing:0.5 }}>🔗 URL로 내용 불러오기</div>
            <div style={{ fontSize:11, color:muted, marginBottom:8 }}>뉴스·유튜브·블로그·인스타 URL을 붙여넣으면 내용을 자동으로 채워줘요</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&fetchFromUrl()}
                placeholder="https://... URL 붙여넣기"
                style={{ flex:1, padding:"8px 12px", borderRadius:9, border:`1px solid ${bdr}`, background:isDark?"rgba(255,255,255,0.06)":"#fff", color:text, fontSize:12, outline:"none" }}/>
              <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                style={{ padding:"8px 16px", borderRadius:9, border:"none", cursor:urlLoading?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:urlLoading?0.5:1, flexShrink:0 }}>
                {urlLoading?"불러오는 중...":"불러오기"}
              </button>
            </div>
          </div>

          {/* 주제 */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>어떤 주제로 만들까요? *</div>
            <input
              value={topic}
              onChange={e=>setTopic(e.target.value)}
              placeholder="예: 블로그 글쓰기 노하우 10가지"
              style={inputStyle}
            />
          </div>

          {/* 내용 */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>들어갈 내용을 알려주세요 *</div>
            <textarea
              value={content}
              onChange={e=>setContent(e.target.value)}
              placeholder="예: 키워드 선정 방법, 제목 작성 팁, 글 구성 방법, 사진 활용법 등"
              rows={4}
              style={{ ...inputStyle, resize:"vertical", lineHeight:1.7 }}
            />
          </div>

          {/* AI 추천 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: aiSugg ? 14 : 0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>AI 문구 추천</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>주제를 입력하면 AI가 제목·내용을 추천해줘요</div>
              </div>
              <button onClick={getSugg} disabled={suggesting || !topic.trim()}
                style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:suggesting||!topic.trim()?"not-allowed":"pointer", background:`${accentColor}18`, color:accentColor, fontSize:12, fontWeight:800, opacity:suggesting||!topic.trim()?0.5:1, flexShrink:0 }}>
                {suggesting ? "추천 중..." : "✨ AI 추천"}
              </button>
            </div>
            {aiSugg && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[{ key:"topics", items:aiSugg.topics, label:"주제 추천", setter:setTopic },
                  { key:"contents", items:aiSugg.contents, label:"내용 추천", setter:setContent }]
                  .filter(r=>r.items?.length>0).map(({ key, items, label, setter })=>(
                  <div key={key}>
                    <div style={{ fontSize:10, fontWeight:700, color:muted, letterSpacing:1, marginBottom:6 }}>{label}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {items.map((v,i)=>(
                        <button key={i} onClick={()=>setter(v)}
                          style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${accentColor}35`, background:`${accentColor}08`, color:text, fontSize:12, cursor:"pointer" }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10, color:muted }}>클릭하면 입력란에 바로 적용돼요</div>
              </div>
            )}
          </div>
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
              <div style={{ fontSize:22, fontWeight:900, color:accentColor }}>{pageCount}장</div>
            </div>
            <input type="range" min={3} max={SLIDE_TYPES.length} value={pageCount}
              onChange={e=>setPageCount(Number(e.target.value))} style={{ width:"100%", accentColor }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:4 }}>
              <span>3장</span><span>{SLIDE_TYPES.length}장</span>
            </div>
            <div style={{ fontSize:11, color:muted, marginTop:6, lineHeight:1.6 }}>
              {SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}
            </div>
          </div>

          {/* 참고 이미지 (선택) */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>
              참고 이미지 <span style={{ color:muted, fontWeight:400 }}>(선택 — 최대 5장)</span>
            </div>
            <div onClick={()=>productFileRef.current?.click()}
              onDrop={e=>{e.preventDefault();handleProductImages(e.dataTransfer.files);}}
              onDragOver={e=>e.preventDefault()}
              style={{ border:`1.5px dashed ${productImages.length?accentColor:bdr}`, borderRadius:12, padding:productImages.length?"14px":"20px", cursor:"pointer", background:productImages.length?`${accentColor}06`:cardBg }}>
              {productImages.length ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  {productImages.map((img,i)=>(
                    <div key={i} style={{ position:"relative" }}>
                      <img src={img.dataUrl} alt="" style={{ width:60,height:60,objectFit:"cover",borderRadius:8 }}/>
                      <button onClick={e=>{e.stopPropagation();setProductImages(p=>p.filter((_,j)=>j!==i));}}
                        style={{ position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                    </div>
                  ))}
                  {productImages.length<5 && <div style={{ width:60,height:60,borderRadius:8,border:`1.5px dashed ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:muted }}>+</div>}
                </div>
              ) : (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:text,marginBottom:3 }}>이미지 클릭 또는 드래그</div>
                  <div style={{ fontSize:11,color:muted }}>AI가 참고해서 스타일을 반영해요</div>
                </div>
              )}
            </div>
            <input ref={productFileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handleProductImages(e.target.files);e.target.value="";}}/>
          </div>

          {/* 다음 버튼 */}
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={goToStep2} disabled={!canNext}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext?"pointer":"not-allowed", background:canNext?accentColor:`${accentColor}40`, color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              다음 → <span style={{ fontSize:12, opacity:0.8 }}>슬라이드 기획</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: 슬라이드 기획
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 2) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 28px 80px" }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>슬라이드 내용을 기획하세요</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7 }}>
              각 슬라이드의 문구를 직접 입력하거나, AI 추천을 받아 수정해보세요.<br/>
              비워두면 AI가 자동으로 채워줘요.
            </div>
          </div>

          {planGenLoading && (
            <div style={{ padding:"12px 16px", borderRadius:10, background:`${accentColor}12`, border:`1px solid ${accentColor}30`, marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:16,height:16,borderRadius:"50%",border:`2px solid ${accentColor}40`,borderTopColor:accentColor,animation:"spin 0.8s linear infinite",flexShrink:0 }}/>
              <div style={{ fontSize:13,fontWeight:700,color:accentColor }}>AI가 슬라이드 내용을 자동으로 채우고 있어요...</div>
            </div>
          )}

          {/* 전체 AI 추천 */}
          <div style={{ display:"flex", gap:8, marginBottom:20, padding:"12px 16px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>전체 AI 추천</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>모든 슬라이드 내용을 AI가 한 번에 추천해드려요</div>
            </div>
            <button onClick={suggestAllSlides} disabled={planGenLoading}
              style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor:planGenLoading?"wait":"pointer", background:accentColor, color:"#fff", fontSize:13, fontWeight:800, opacity:planGenLoading?0.6:1, flexShrink:0 }}>
              {planGenLoading?"추천 중...":"✨ 전체 자동 추천"}
            </button>
          </div>

          {/* 슬라이드별 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {slideContents.map((sc, i) => (
              <div key={i} style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderBottom:`1px solid ${bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:`${accentColor}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:accentColor }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:800, color:text }}>{sc.label}</span>
                    {sc.headline && <span style={{ fontSize:11, color:accentColor, fontWeight:600 }}>✓ 입력됨</span>}
                  </div>
                  <button onClick={()=>suggestSlide(i)} disabled={sc.aiLoading||planGenLoading}
                    style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${accentColor}40`, background:`${accentColor}10`, color:accentColor, fontSize:11, fontWeight:700, cursor:sc.aiLoading||planGenLoading?"wait":"pointer", opacity:sc.aiLoading||planGenLoading?0.5:1, display:"flex", alignItems:"center", gap:5 }}>
                    {sc.aiLoading?<><div style={{ width:10,height:10,borderRadius:"50%",border:`1.5px solid ${accentColor}50`,borderTopColor:accentColor,animation:"spin 0.8s linear infinite" }}/>추천 중</>:"✦ AI 추천"}
                  </button>
                </div>
                <div style={{ padding:"14px 16px", display:"grid", gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>헤드라인 <span style={{ fontWeight:400 }}>(14자 이내)</span></div>
                    <input value={sc.headline||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,headline:e.target.value}:s))}
                      placeholder="비워두면 AI가 자동으로 채워줘요"
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${sc.headline?`${accentColor}50`:bdr}`,background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>본문 <span style={{ fontWeight:400 }}>(40자 이내, 선택)</span></div>
                    <input value={sc.body||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,body:e.target.value}:s))}
                      placeholder="비워두면 AI가 자동으로 채워줘요"
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", marginTop:24 }}>
            <button onClick={()=>setWizStep(1)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>← 이전</button>
            <button onClick={()=>setWizStep(3)} style={{ padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",background:accentColor,color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8 }}>
              다음 → <span style={{ fontSize:12,opacity:0.8 }}>디자인 선택</span>
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 3: 디자인 선택
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 3) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:800, margin:"0 auto", padding:"0 28px 80px", width:"100%", boxSizing:"border-box" }}>

          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>디자인 스타일을 선택하세요</div>
            <div style={{ fontSize:13, color:muted }}>선택 안 해도 기본 스타일로 생성돼요</div>
          </div>

          {/* 스타일 템플릿 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:text }}>스타일 템플릿</div>
              {selStyle && <button onClick={()=>setSelStyle(null)} style={{ fontSize:11,color:muted,background:"transparent",border:`1px solid ${bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer" }}>선택 해제</button>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
              {STYLE_TEMPLATES.map(t=>{
                const isSelected = selStyle===t.id;
                const prev = t.preview;
                return (
                  <button key={t.id} onClick={()=>setSelStyle(isSelected?null:t.id)}
                    style={{ border:`2px solid ${isSelected?accentColor:"transparent"}`,borderRadius:14,overflow:"hidden",cursor:"pointer",background:"transparent",padding:0,transition:"all 0.15s",boxShadow:isSelected?`0 0 0 3px ${accentColor}40`:"0 2px 8px rgba(0,0,0,0.15)" }}>
                    <div style={{ width:"100%",paddingBottom:"130%",position:"relative",background:prev.bg }}>
                      {prev.pattern==="diagonal" && <div style={{ position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(45deg,${prev.accent}10 0,${prev.accent}10 1px,transparent 0,transparent 50%)`,backgroundSize:"8px 8px" }}/>}
                      {prev.pattern==="dots"     && <div style={{ position:"absolute",inset:0,backgroundImage:`radial-gradient(circle,${prev.accent}20 1px,transparent 1px)`,backgroundSize:"8px 8px" }}/>}
                      {prev.pattern==="circuit"  && <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(${prev.accent}15 1px,transparent 1px),linear-gradient(90deg,${prev.accent}15 1px,transparent 1px)`,backgroundSize:"10px 10px" }}/>}
                      <div style={{ position:"absolute",inset:0,padding:"8px 7px",display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
                        <div style={{ flex:1,borderRadius:4,background:`${prev.accent}18`,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <div style={{ width:"60%",height:"70%",borderRadius:3,background:`${prev.accent}25` }}/>
                        </div>
                        <div style={{ height:4,borderRadius:2,background:prev.accent,width:"50%",marginBottom:4 }}/>
                        <div style={{ height:3,borderRadius:1,background:prev.textColor,width:"80%",opacity:0.7,marginBottom:2 }}/>
                        <div style={{ height:8,borderRadius:3,background:prev.accent,width:"100%" }}/>
                      </div>
                      {isSelected && <div style={{ position:"absolute",top:6,right:6,width:20,height:20,borderRadius:"50%",background:accentColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:900 }}>✓</div>}
                    </div>
                    <div style={{ padding:"7px 6px",background:isDark?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.95)" }}>
                      <div style={{ fontSize:11,fontWeight:isSelected?800:600,color:isSelected?accentColor:text }}>{t.label}</div>
                      <div style={{ fontSize:9,color:muted,marginTop:1 }}>{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이미지 크기 */}
          <div style={{ padding:"16px 18px",borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,marginBottom:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:700,color:text }}>이미지 크기</div>
              <div style={{ fontSize:14,fontWeight:900,color:accentColor }}>{imgW} × {imgH} px</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12 }}>
              {SIZE_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setSelSize(i)}
                  style={{ padding:"8px 4px",borderRadius:9,border:`1.5px solid ${selSize===i?accentColor:bdr}`,background:selSize===i?`${accentColor}15`:"transparent",color:selSize===i?accentColor:isDark?"rgba(255,255,255,0.65)":"#555",fontSize:11,fontWeight:selSize===i?800:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.w!=null && <span style={{ fontSize:9,opacity:0.7 }}>{p.w}×{p.h}</span>}
                </button>
              ))}
            </div>
            {preset.w==null && (
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>가로 (px)</div>
                  <input type="number" value={customW} onChange={e=>setCustomW(Number(e.target.value))} min={100} max={4000} step={10} style={{ ...inputStyle,textAlign:"center",fontWeight:700 }}/>
                </div>
                <div style={{ fontSize:18,color:muted,paddingTop:18 }}>×</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>세로 (px)</div>
                  <input type="number" value={customH} onChange={e=>setCustomH(Number(e.target.value))} min={100} max={4000} step={10} style={{ ...inputStyle,textAlign:"center",fontWeight:700 }}/>
                </div>
              </div>
            )}
            {preset.w!=null && <div style={{ fontSize:11,color:muted,textAlign:"center" }}>{preset.desc} · {preset.w}×{preset.h}px</div>}
            <div style={{ marginTop:12,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:10,color:muted }}>비율</div>
              <div style={{ width:Math.min(56,56*imgRatio),height:Math.min(56,56/imgRatio),background:`${accentColor}25`,border:`1.5px solid ${accentColor}50`,borderRadius:3 }}/>
              <div style={{ fontSize:11,color:muted }}>{imgW>imgH?"가로형":imgW<imgH?"세로형":"정사각형"} · {(imgW/imgH).toFixed(2)}:1</div>
            </div>
          </div>

          {/* 참고 이미지 스타일 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:4 }}>
              스타일 참고 이미지 <span style={{ color:muted,fontWeight:400 }}>(선택)</span>
            </div>
            <div style={{ fontSize:11,color:muted,marginBottom:8 }}>마음에 드는 이미지를 올리면 AI가 색감·분위기를 분석해서 비슷하게 만들어요</div>
            <div onClick={()=>refFileRef.current?.click()}
              style={{ border:`1.5px dashed ${refImg?accentColor:bdr}`,borderRadius:12,padding:"14px 18px",cursor:"pointer",display:"flex",gap:14,alignItems:"center",background:cardBg }}>
              {refImg ? (
                <>
                  <img src={refImg} alt="" style={{ width:68,height:68,objectFit:"cover",borderRadius:9,flexShrink:0 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    {analyzing ? <div style={{ fontSize:12,color:muted }}>분석 중...</div>
                      : refStyle ? <><div style={{ fontSize:11,fontWeight:700,color:accentColor,marginBottom:3 }}>✓ 스타일 분석 완료</div><div style={{ fontSize:11,color:muted,lineHeight:1.55 }}>{refStyle}</div></> : null}
                  </div>
                  <button onClick={e=>{e.stopPropagation();setRefImg(null);setRefStyle("");}} style={{ padding:"5px 10px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",flexShrink:0 }}>제거</button>
                </>
              ) : <div style={{ textAlign:"center",width:"100%",padding:"6px 0" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:text,marginBottom:3 }}>스타일 참고 이미지 업로드</div>
                  <div style={{ fontSize:11,color:muted }}>이 스타일과 비슷하게 만들어드려요</div>
                </div>}
            </div>
            <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{handleRef(e.target.files[0]);e.target.value="";}}/>
          </div>

          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <button onClick={()=>setWizStep(2)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>← 이전</button>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12,color:muted,marginBottom:6 }}>
                예상 차감: <b style={{ color:accentColor }}>{pageCount * 30}P</b>
                {user && <span style={{ marginLeft:8,color:(user.points||0)<pageCount*30?"#ef4444":muted }}>· 보유 {(user.points||0).toLocaleString()} P</span>}
              </div>
              {user && (user.points||0) < pageCount*30 ? (
                <div style={{ textAlign:"right" }}>
                  <div style={{ padding:"10px 16px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",fontSize:12,fontWeight:700,marginBottom:8 }}>
                    포인트가 모자랍니다. 충전 후 이용해주세요.<br/>
                    <span style={{ fontWeight:400,opacity:0.8 }}>필요 {pageCount*30}P · 보유 {user.points||0}P</span>
                  </div>
                  <button onClick={()=>{ window.location.hash="#pricing"; }}
                    style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"#fff",fontSize:15,fontWeight:900 }}>
                    💎 포인트 충전하기
                  </button>
                </div>
              ) : (
                <button onClick={()=>{ setWizStep(4); generate(); }}
                  style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:"pointer",background:accentColor,color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto" }}>
                  {user ? `이미지 ${pageCount}장 생성하기 → ${pageCount*30}P` : "✦ 1회 생성하기"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 4: 생성 + 결과
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 4) {
    const currentPng = rendered[curIdx];
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <style>{`
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
          @keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}
          .pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}
        `}</style>
        <WizHeader />
        <div style={{ maxWidth:1080, margin:"0 auto", padding:"0 20px 60px" }}>

          {/* 생성 중 — 단계별 체크 + 실시간 이미지 표시 */}
          {loading && (() => {
            const step1Done = progress.total > 0;
            const step2Done = progress.total > 0 && slides.length > 0;
            const step3Active = progress.cur > 0;
            const step3Done = progress.cur >= progress.total && progress.total > 0 && rendered.some(Boolean);
            const doneCount = rendered.filter(Boolean).length;
            const steps = [
              { label:"슬라이드 기획", done: step1Done, active: !step1Done },
              { label:"텍스트 구성", done: step2Done, active: step1Done && !step2Done },
              { label:`이미지 생성 ${step3Active?`(${progress.cur}/${progress.total})`:""}`, done: step3Done, active: step3Active && !step3Done },
              { label:"마무리 작업", done: false, active: step3Done },
            ];
            return (
            <div style={{ padding:"40px 24px",textAlign:"center" }}>
              <style>{`@keyframes ic-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes ic-progress{from{width:0%}to{width:100%}}`}</style>
              <div style={{ fontSize:20,fontWeight:900,color:text,marginBottom:6 }}>
                {step3Active ? `이미지 생성 중 (${progress.cur}/${progress.total})` : step2Done ? "텍스트 완성! 이미지 생성 시작..." : step1Done ? "텍스트 구성 중..." : "AI가 준비하고 있어요..."}
              </div>
              <div style={{ fontSize:13,color:muted,marginBottom:24 }}>
                {step3Active ? (slides[progress.cur-1]?.label||"") : topic}
              </div>

              {/* 단계별 체크리스트 */}
              <div style={{ display:"flex",flexDirection:"column",gap:12,textAlign:"left",maxWidth:280,margin:"0 auto 24px" }}>
                {steps.map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:s.done||s.active?1:0.3,transition:"opacity 0.3s"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                      background:s.done?"#4ade80":s.active?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.05)",
                      border:s.done?"2px solid #4ade80":s.active?"2px solid #7c6aff":"2px solid rgba(255,255,255,0.1)",
                      transition:"all 0.3s"}}>
                      {s.done?<span style={{color:"#fff",fontWeight:900}}>✓</span>:s.active?<div style={{width:8,height:8,borderRadius:"50%",border:"2px solid #7c6aff",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>:null}
                    </div>
                    <span style={{fontSize:13,color:s.done?"#4ade80":s.active?text:muted,fontWeight:s.active?700:400}}>{s.label}</span>
                    {s.done && <span style={{fontSize:10,color:"#4ade80",marginLeft:"auto"}}>완료</span>}
                  </div>
                ))}
              </div>

              {/* 프로그레스 바 */}
              {progress.total > 0 && (
                <div style={{ maxWidth:280,width:"100%",margin:"0 auto 20px" }}>
                  <div style={{ height:6,borderRadius:4,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:6 }}>
                    <div style={{ height:"100%",borderRadius:4,background:"linear-gradient(90deg,#7c6aff,#8b5cf6,#ec4899)",width:`${Math.max(5,(progress.cur/progress.total)*100)}%`,transition:"width 0.5s ease" }}/>
                  </div>
                  <div style={{ fontSize:12,color:muted,fontWeight:600 }}>{doneCount > 0 ? `${doneCount}장 생성 완료` : `${progress.cur}/${progress.total}`}</div>
                </div>
              )}
              {progress.total === 0 && (
                <div style={{ height:4,borderRadius:4,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",overflow:"hidden",maxWidth:280,margin:"0 auto 10px",width:"100%" }}>
                  <div style={{ height:"100%",borderRadius:4,background:"linear-gradient(90deg,#7c6aff,#8b5cf6,#ec4899)",animation:"ic-progress 15s ease-out forwards" }}/>
                </div>
              )}

              {/* 실시간 이미지 생성 미리보기 */}
              {(rendered.length > 0) && (
                <div style={{ maxWidth:480,margin:"0 auto",marginTop:20 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:muted,marginBottom:10 }}>실시간 생성 현황</div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center" }}>
                    {rendered.map((img,i) => (
                      <div key={i} style={{ width:100,height:100,borderRadius:12,overflow:"hidden",
                        border:`2px solid ${img?"#4ade80":i===(progress.cur-1)?"#7c6aff":bdr}`,
                        background:isDark?"rgba(255,255,255,0.03)":"#f0f0f6",position:"relative",
                        boxShadow:img?"0 4px 12px rgba(74,222,128,0.2)":"none",transition:"border 0.3s, box-shadow 0.3s" }}>
                        {img ? (
                          <img src={img} alt="" className="pixel-reveal" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                        ) : (
                          <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4 }}>
                            {i === (progress.cur-1) ? (
                              <>
                                <div style={{ width:20,height:20,border:"2px solid #7c6aff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
                                <span style={{ fontSize:10,color:"#7c6aff",fontWeight:600 }}>생성중</span>
                              </>
                            ) : i < progress.cur ? (
                              <span style={{ fontSize:11,color:"#ef4444",fontWeight:600 }}>실패</span>
                            ) : (
                              <span style={{ fontSize:12,color:muted,fontWeight:600 }}>{i+1}</span>
                            )}
                          </div>
                        )}
                        <div style={{ position:"absolute",top:4,left:4,fontSize:9,background:img?"rgba(74,222,128,0.9)":"rgba(0,0,0,0.5)",color:"#fff",padding:"1px 5px",borderRadius:4,fontWeight:700 }}>
                          {img?"✓":""}{i+1}장
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {err && <div style={{ marginTop:16, padding:"12px 18px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", fontSize:13, fontWeight:700 }}>{err}</div>}
            </div>
            );
          })()}

          {/* 결과 */}
          {(rendered.some(Boolean) || (!loading && slides.length > 0)) && (
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              {/* 메인 뷰어 */}
              <div style={{ flex:1, minWidth:0 }}>
                {saveMsg && <div style={{ marginBottom:10,padding:"8px 14px",borderRadius:9,background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.25)",fontSize:12,color:"#4ade80",fontWeight:700 }}>{saveMsg}</div>}
                <div style={{ position:"relative",width:"100%",paddingTop:`${100/imgRatio}%`,background:"#000",borderRadius:14,overflow:"hidden",border:`1px solid ${bdr}` }}>
                  <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {currentPng
                      ? <img key={curIdx+"-"+currentPng.slice(-20)} src={currentPng} alt="slide" className="pixel-reveal" style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }}/>
                      : <div style={{ textAlign:"center" }}>
                          {!loading && <><div style={{ fontSize:13,color:muted,marginBottom:8 }}>이미지 생성 실패</div>
                          <button onClick={()=>regenerateOne(curIdx)} style={{ padding:"8px 18px",borderRadius:8,border:"none",background:accentColor,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>다시 생성</button></>}
                        </div>}
                  </div>
                </div>
                <div style={{ marginTop:10,padding:"9px 13px",borderRadius:9,background:isDark?"rgba(255,200,0,0.07)":"rgba(180,120,0,0.06)",border:`1px solid ${isDark?"rgba(255,200,0,0.2)":"rgba(180,120,0,0.15)"}`,display:"flex",gap:8,alignItems:"flex-start" }}>
                  <span style={{ fontSize:13,flexShrink:0 }}>💡</span>
                  <div style={{ fontSize:11,color:isDark?"rgba(255,220,80,0.85)":"rgba(100,70,0,0.8)",lineHeight:1.65 }}>
                    AI가 직접 생성한 이미지이므로 <b>이미지 내 텍스트가 깨지거나 어색하게 표시될 수 있어요.</b> 결과가 마음에 들지 않으면 재생성해보세요.
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,marginTop:8 }}>
                  <button onClick={saveCurrent} disabled={!currentPng} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",cursor:currentPng?"pointer":"not-allowed",background:accentColor,color:"#fff",fontSize:13,fontWeight:800,opacity:currentPng?1:0.4 }}>PNG 저장</button>
                  <button onClick={()=>{ if(saveOneToLibrary(curIdx)){ setSlotSaveMsg(p=>({...p,[curIdx]:"✅ 보관함!"})); setTimeout(()=>setSlotSaveMsg(p=>({...p,[curIdx]:""})),2500); } }} disabled={!currentPng}
                    style={{ flex:1,padding:"11px",borderRadius:10,border:`1px solid ${accentColor}`,background:`${accentColor}15`,color:accentColor,fontSize:13,fontWeight:800,cursor:currentPng?"pointer":"not-allowed",opacity:currentPng?1:0.4 }}>
                    {slotSaveMsg[curIdx]||"📁 보관함"}
                  </button>
                  {currentPng && !loading && <button onClick={()=>regenerateOne(curIdx)} style={{ padding:"11px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>🔄</button>}
                  <button onClick={saveAll} disabled={!rendered.some(Boolean)||saving} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:isDark?"rgba(255,255,255,0.1)":"#2c2c2c",color:"#fff",fontSize:13,fontWeight:800,opacity:rendered.some(Boolean)&&!saving?1:0.4 }}>
                    {saving?"저장 중...":"전체 ZIP"}
                  </button>
                </div>
              </div>
              {/* 썸네일 사이드 */}
              <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0,width:110 }}>
                {slides.map((s, i) => {
                  const isRegen = regenIdx===i, isActive = curIdx===i, hasImg = !!rendered[i];
                  return (
                    <div key={i} style={{ borderRadius:10,overflow:"hidden",border:`2px solid ${isActive?accentColor:"transparent"}`,transition:"all 0.12s",background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)" }}>
                      <div onClick={()=>setCurIdx(i)} style={{ cursor:"pointer",position:"relative" }}>
                        {hasImg && !isRegen
                          ? <img src={rendered[i]} alt="" style={{ width:"100%",height:Math.round(110*imgH/imgW),display:"block",objectFit:"cover" }}/>
                          : <div style={{ width:"100%",height:Math.round(110*imgH/imgW),background:isDark?"rgba(255,255,255,0.06)":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center" }}>
                              {isRegen
                                ? <div style={{ textAlign:"center" }}><div style={{ width:20,height:20,borderRadius:"50%",border:`2px solid ${accentColor}50`,borderTopColor:accentColor,animation:"spin 1s linear infinite",margin:"0 auto 4px" }}/><div style={{ fontSize:9,color:accentColor,fontWeight:700 }}>생성중</div></div>
                                : <div style={{ width:16,height:16,borderRadius:"50%",border:`2px solid ${accentColor}40`,borderTopColor:accentColor,animation:"spin 1s linear infinite" }}/>}
                            </div>}
                        <div style={{ position:"absolute",top:4,left:4,width:18,height:18,borderRadius:5,background:isActive?accentColor:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff" }}>{i+1}</div>
                      </div>
                      <div style={{ padding:"4px 5px 5px",background:isDark?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2 }}>
                        <div style={{ fontSize:9,color:isActive?accentColor:muted,fontWeight:isActive?800:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {slotSaveMsg[i] ? <span style={{ color:"#4ade80",fontSize:8 }}>{slotSaveMsg[i]}</span> : s.label}
                        </div>
                        <button onClick={e=>{ e.stopPropagation(); if(hasImg&&!isRegen){saveOneToLibrary(i);setSlotSaveMsg(p=>({...p,[i]:"✅"}));setTimeout(()=>setSlotSaveMsg(p=>({...p,[i]:""})),2500);} }} disabled={!hasImg||isRegen}
                          style={{ flexShrink:0,width:20,height:20,borderRadius:5,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:hasImg&&!isRegen?"pointer":"not-allowed",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",opacity:hasImg&&!isRegen?1:0.3,padding:0 }}>📁</button>
                        <button onClick={e=>{ e.stopPropagation(); regenerateOne(i); }} disabled={isRegen||regenIdx!==null||loading}
                          style={{ flexShrink:0,width:20,height:20,borderRadius:5,border:`1px solid ${isActive?accentColor:bdr}`,background:"transparent",color:isActive?accentColor:muted,cursor:isRegen||regenIdx!==null||loading?"not-allowed":"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",opacity:isRegen||regenIdx!==null||loading?0.4:1,padding:0 }}>↺</button>
                      </div>
                    </div>
                  );
                })}
                <button onClick={resetAll} style={{ marginTop:8,padding:"8px",borderRadius:9,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",fontWeight:700 }}>🔄 처음부터</button>
              </div>
            </div>
          )}

          {err && <div style={{ marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",fontSize:12,color:"#f87171" }}>{err}</div>}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return null;
}
