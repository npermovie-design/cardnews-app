import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { callAI } from "./aiClient";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useI18n } from "./i18n.jsx";

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

  // ── 섹션별 AI 이미지 생성 ──────────────────────────────
  const generateSectionImage = async (secId, prompt) => {
    if (!prompt) return;
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

  // ── AI로 내용 채우기 ──────────────────────────────────
  const autoFillWithAI = async () => {
    if (!productName.trim()) return;
    setAiFilling(true);
    try {
      const prompt = `상품명: "${productName}"${category ? `, 카테고리: ${CATEGORIES.find(c => c.key === category)?.label}` : ""}
이 상품의 주요 특징과 셀링포인트를 5줄로 작성해줘. 번호를 매기고, 실제 쇼핑몰에서 쓸 수 있는 구체적인 표현으로.`;
      const result = await callAI("claude-haiku-4-5-20251001", [{ role: "user", content: prompt }], 500);
      // 마크다운 제거 (#, **, *, ` 등)
      const cleaned = result.replace(/#{1,6}\s*/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^[-•]\s*/gm, "").trim();
      setFeatures(cleaned);
    } catch (e) { console.error(e); }
    setAiFilling(false);
  };

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
      await new Promise(r => setTimeout(r, 300));
      setPipeResults(prev => ({ ...prev, input: { productName, category: catLabel, features, options, extraInfo } }));

      // Step 2: 이미지 색상 추출 (프론트엔드에서 Canvas로 — AI 호출 없음)
      setPipeStep(2);
      let extractedColors = [];
      if (images.length > 0) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => { img.onload = resolve; img.src = images[0].base64; });
          const c = document.createElement("canvas");
          c.width = 64; c.height = 64;
          c.getContext("2d").drawImage(img, 0, 0, 64, 64);
          const data = c.getContext("2d").getImageData(0, 0, 64, 64).data;
          // 간단한 k-means 대용: 8x8 그리드 평균
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
      }
      await new Promise(r => setTimeout(r, 300));
      setPipeResults(prev => ({ ...prev, image: { colors: extractedColors } }));

      // Step 3: 톤앤매너 + 색상 팔레트 (텍스트만 — 빠르게)
      setPipeStep(3);
      const sectionCount = mode === "fast" ? 8 : 15;
      const toneData = {
        tone: "전문적", voice: "~합니다",
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
      await new Promise(r => setTimeout(r, 200));

      // Step 4: 레이아웃 + 콘텐츠 생성 (단일 AI 호출)
      setPipeStep(4);
      const mainColor = toneData.color_palette.main;
      const extraLines = [extraInfo.price, extraInfo.origin, extraInfo.target, extraInfo.shipping, extraInfo.brand, extraInfo.usp].filter(Boolean).join(", ");

      // 디자인 다양성: 랜덤 스타일 시드
      const styleSeeds = [
        { tone: "깔끔하고 미니멀한", palette: "밝고 화이트 베이스", layout: "여백 많은 심플" },
        { tone: "고급스럽고 프리미엄한", palette: "어두운 톤 + 골드 포인트", layout: "대비 강한 럭셔리" },
        { tone: "따뜻하고 친근한", palette: "파스텔 베이지/크림", layout: "라운드 카드형" },
        { tone: "모던하고 트렌디한", palette: "블랙+네온 포인트", layout: "그리드 기반 정렬" },
        { tone: "자연친화적이고 건강한", palette: "그린/어스톤 자연색", layout: "오가닉 곡선형" },
        { tone: "활기차고 에너지 넘치는", palette: "비비드 그라데이션", layout: "다이나믹 비대칭" },
        { tone: "신뢰감 있는 전문적인", palette: "네이비/그레이 차분한", layout: "정돈된 정보형" },
        { tone: "감성적이고 스토리텔링", palette: "모노톤 + 포인트 컬러", layout: "매거진 편집 스타일" },
      ];
      const seed = styleSeeds[Math.floor(Math.random() * styleSeeds.length)];

      const layoutPrompt = `제품:"${productName}" 카테고리:${catLabel}
특징:${features.slice(0, 400)}${extraLines ? ` 추가정보:${extraLines}` : ""}${options.length ? ` 옵션:${options.join("/")}` : ""}
추출색상:${mainColor}
디자인 톤:${seed.tone} / 색상방향:${seed.palette} / 레이아웃:${seed.layout}

이 제품의 쇼핑몰 상세페이지를 ${sectionCount}개 섹션 JSON배열로 만들어줘.

섹션 흐름 (내러티브 순서 참고):
히어로 → 고민/공감 → 솔루션(특장점) → 포인트 상세(2-3개) → 숫자 강조/비교 → 후기 → 스펙/배송 → 보증/신뢰 → CTA → AI 고지

디자인 톤에 맞춰 bg_color를 섹션마다 다양하게:
- 밝은 섹션(#fff, #f8f8f8, #fafafa)과 어두운 섹션(메인컬러 기반, #1a1a2e, #111) 교차
- rgba 투명도 활용: 메인컬러의 05~15% 배경도 적극 사용
- 동일 bg_color 연속 2개 이상 금지

매번 새로운 카피라이팅, 구성, 색상 조합으로 만들어 — 같은 패턴 반복 금지.
카피는 구체적이고 설득력 있게 — 실제 쇼핑몰 수준의 퀄리티.

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

      // Gemini API 직접 호출
      const geminiRes = await fetch("/api/gemini-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: layoutPrompt, maxTokens: mode === "precise" ? 12000 : 6000 }),
      });
      if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        throw new Error(err.error || `생성 실패 (${geminiRes.status})`);
      }
      const { text: layoutResult } = await geminiRes.json();
      let layoutData;
      try {
        const cleaned = layoutResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        layoutData = JSON.parse(cleaned);
      } catch (e) {
        console.error("Layout parse error:", e, layoutResult);
        setPipeError("레이아웃 생성 실패. 다시 시도해주세요.");
        setPhase("input");
        return;
      }

      setPipeResults(prev => ({ ...prev, layout: layoutData }));
      setPipeStep(5); // 완료

      // 섹션 데이터 설정 → 에디터로 전환
      setSections(layoutData.map((s, i) => ({ ...s, id: `sec_${i}_${Date.now()}` })));
      setActiveSection(0);

      // 포인트 차감
      if (user) await changePoints(user.uid, -10, "상세페이지 생성");

      setTimeout(() => setPhase("editor"), 800);

    } catch (e) {
      console.error("Pipeline error:", e);
      setPipeError(e.message || "생성 중 오류가 발생했습니다.");
      setPhase("input");
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

          {/* ── 2. 상품명 + 카테고리 (한 줄) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: text, display: "block", marginBottom: 6 }}>
                상품명 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input value={productName} onChange={e => setProductName(e.target.value)}
                placeholder="예) 제주 흑돼지 육포 선물세트" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: text, display: "block", marginBottom: 6 }}>
                카테고리 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", appearance: "none", paddingRight: 32 }}>
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
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
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
            </>
          )}

          {sidebarTab === "text" && activeSection < sections.length && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12 }}>
                페이지 {activeSection + 1} 텍스트 편집
              </div>
              {(sections[activeSection]?.elements || []).filter(e => e.type === "text").map((el, ei) => (
                <div key={ei} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: muted, marginBottom: 4, display: "block" }}>{el.role === "title" ? "제목" : el.role === "subtitle" ? "소제목" : "본문"}</label>
                  <textarea value={el.content}
                    onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== activeSection ? s : {
                        ...s, elements: s.elements.map((elem, j) => {
                          if (elem.type !== "text") return elem;
                          const textIdx = s.elements.filter((x, k) => x.type === "text" && k <= s.elements.indexOf(elem)).length - 1;
                          // find the matching text element index
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
                    rows={el.role === "body" ? 4 : 2}
                    style={{ ...inputStyle, fontSize: 12, resize: "vertical" }} />
                </div>
              ))}
            </div>
          )}

          {sidebarTab === "color" && colorPalette && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12 }}>색상 모드</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { key: "main", label: "메인", color: colorPalette.main },
                  { key: "gradient", label: "그라데이션", color: colorPalette.gradient },
                  { key: "light_bg", label: "밝은 배경", color: colorPalette.light_bg },
                  { key: "dark_bg", label: "어두운 배경", color: colorPalette.dark_bg },
                ].map(c => (
                  <div key={c.key} style={{ textAlign: "center" }}>
                    <div style={{ width: "100%", height: 48, borderRadius: 8, background: c.color, border: `1px solid ${bdr}` }} />
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: text, fontWeight: 600 }}>{c.color}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                // 전체 색상 적용
                if (!colorPalette) return;
                setSections(prev => prev.map((s, i) => ({
                  ...s,
                  bg_color: i === 0 ? colorPalette.main : (i % 2 === 0 ? colorPalette.light_bg : "#ffffff"),
                })));
              }}
                style={{ ...btnPrimary, marginTop: 16, padding: "10px", fontSize: 13, background: "#1a1a2e", maxWidth: "100%" }}>
                색상 적용
              </button>
              <button onClick={() => {
                setSections(prev => prev.map(s => ({ ...s, bg_color: "#ffffff" })));
              }}
                style={{ ...btnPrimary, marginTop: 8, padding: "10px", fontSize: 13, background: "transparent", color: text, border: `1px solid ${bdr}`, maxWidth: "100%" }}>
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div style={{ flex: 1, overflowY: "auto", background: D ? "rgba(0,0,0,0.15)" : "#e5e5e5", padding: "20px" }}>
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
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {sections.map((sec, i) => (
            <div key={sec.id}
              onClick={() => setActiveSection(i)}
              style={{
                position: "relative", marginBottom: 4,
                border: activeSection === i ? `2px solid ${acc}` : "2px solid transparent",
                borderRadius: 4, cursor: "pointer",
              }}>
              {/* 섹션 렌더링 — 한국 쇼핑몰 스타일 템플릿 */}
              {(() => {
                const secImg = sectionImages[sec.id];
                const heroImgSrc = images.length > 0 ? images[0].preview : null;
                const aiImgSrc = secImg?.url || null;
                // 제품 이미지 자동 분배 — 섹션 인덱스에 따라 다른 제품 사진 할당
                const productImgForSection = images.length > 0
                  ? images[i % images.length]?.preview || images[0]?.preview
                  : null;
                const layout = sec.layout || "centered_text";
                const bgCol = sec.bg_color || "#fff";
                const isDarkBg = bgCol && (() => {
                  const hex = bgCol.replace("#", "");
                  const r = parseInt(hex.slice(0, 2), 16);
                  const g = parseInt(hex.slice(2, 4), 16);
                  const b = parseInt(hex.slice(4, 6), 16);
                  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
                })();
                const secType = sec.type || "point";
                const els = sec.elements || [];
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

                // 공통 editable props
                const editable = (el) => ({
                  contentEditable: true,
                  suppressContentEditableWarning: true,
                  onBlur: onBlurByRef(el),
                  style: { outline: "none", cursor: "text" },
                });

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
                  const imgSrc = aiImgSrc || productImgForSection;
                  if (imgSrc) return (
                    <div style={{ width: "100%", height: h, borderRadius: 16, overflow: "hidden", position: "relative", ...style }}>
                      <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  return (
                    <div style={{ width: size, height: size, borderRadius: "50%", background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: `1.5px solid ${mainColor}25` }}>
                      <span style={{ fontSize: size * 0.35, color: mainColor }}>{icons[idx % icons.length]}</span>
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
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
                        {items.length > 0 ? items.map((item, gi) => (
                          <div key={gi} style={{ textAlign: "center", padding: "32px 20px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, transition: "box-shadow 0.2s", boxShadow: "0 1px 8px rgba(0,0,0,0.03)" }}>
                            {iconCircle(gi, 56)}
                            {item.title && (
                              <div {...editable(item.title)} style={{ ...editable(item.title).style, fontSize: 15, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 8, lineHeight: 1.4 }}>
                                {item.title.content}
                              </div>
                            )}
                            {item.body && (
                              <div {...editable(item.body)} style={{ ...editable(item.body).style, fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 }}>
                                {item.body.content}
                              </div>
                            )}
                          </div>
                        )) : gridEls.map((el, gi) => (
                          <div key={gi} style={{ textAlign: "center", padding: "32px 20px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, boxShadow: "0 1px 8px rgba(0,0,0,0.03)" }}>
                            {iconCircle(gi, 56)}
                            <div {...editable(el)} style={{ ...editable(el).style, fontSize: el.fontWeight === "700" || el.fontWeight === "900" ? 15 : 13, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.6 }}>
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
                    <div style={{ flex: 1, padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      {/* POINT 넘버 */}
                      <div style={{ fontSize: 11, fontWeight: 800, color: mainColor, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>
                        POINT {String(pointNum).padStart(2, "0")}
                      </div>
                      {badge && (
                        <span {...editable(badge)} style={{ ...editable(badge).style, display: "inline-block", padding: "5px 14px", borderRadius: 20, background: `${mainColor}12`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 14, alignSelf: "flex-start", border: `1px solid ${mainColor}25` }}>
                          {badge.content}
                        </span>
                      )}
                      {subtitleEl && (
                        <div {...editable(subtitleEl)} style={{ ...editable(subtitleEl).style, fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 8, letterSpacing: 1 }}>
                          {subtitleEl.content}
                        </div>
                      )}
                      {titleEl && (
                        <div {...editable(titleEl)} style={{ ...editable(titleEl).style, fontSize: 26, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.35, marginBottom: 16 }}>
                          {titleEl.content}
                        </div>
                      )}
                      {bodyEls.map((el, bi) => (
                        <div key={bi} {...editable(el)} style={{ ...editable(el).style, fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.6)" : "#666"), lineHeight: 1.8, marginBottom: 8 }}>
                          {el.content}
                        </div>
                      ))}
                      {!subtitleEl && !titleEl && bodyEls.length === 0 && els.filter(e => e.type === "text").map((el, ei) => (
                        <div key={ei} {...editable(el)} style={{ ...editable(el).style, fontSize: el.fontWeight === "900" ? 26 : el.fontWeight === "700" ? 15 : 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: el.fontWeight === "900" ? 1.35 : 1.8, marginBottom: el.fontWeight === "900" ? 16 : 8 }}>
                          {el.content}
                        </div>
                      ))}
                      {/* 장식 점선 */}
                      <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
                        {[...Array(3)].map((_, di) => <div key={di} style={{ width: 4, height: 4, borderRadius: "50%", background: `${mainColor}30` }} />)}
                      </div>
                    </div>
                  );

                  const imageBlock = (
                    <div style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {renderPlaceholder(320)}
                    </div>
                  );

                  return (
                    <div style={{ display: "flex", minHeight: 400, background: bgCol, flexDirection: imgLeft ? "row" : "row-reverse" }}>
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
                      <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
                        {statNums.map((sn, si) => (
                          <div key={si} style={{ textAlign: "center", minWidth: 140, padding: "24px 20px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
                            <div {...editable(sn)} style={{ ...editable(sn).style, fontSize: 48, fontWeight: 900, color: mainColor, lineHeight: 1.1, marginBottom: 8 }}>
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

        {/* AI 채팅 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ 에이전트 활용 방법
          </div>
          <div style={{
            padding: "14px 16px", borderRadius: 12, border: `1px solid ${acc}40`,
            background: D ? "rgba(124,106,255,0.05)" : "#f8f7ff", marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>빠른 프롬프트 예시</div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>클릭하면 입력창에 자동으로 채워집니다.</div>
            {[
              "내 제품 정보 알려줘",
              "선택한 이미지에서 내 제품 색깔로 바꿔줘",
              "선택한 텍스트를 더 짧고 설득력 있게 다듬어줘",
              "선택한 페이지 카피라이팅을 더 신뢰도 있게 수정해줘",
              "선택한 페이지 톤앤매너를 피란색 톤으로 맞춰줘",
            ].map((prompt, i) => (
              <div key={i} style={{
                padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`,
                background: D ? "rgba(255,255,255,0.04)" : "#fff", marginBottom: 4,
                fontSize: 12, color: text, cursor: "pointer",
              }}
                onClick={() => {/* TODO: AI 채팅 연동 */ }}>
                {prompt}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto" }}>
            <div style={{ position: "relative" }}>
              <input placeholder="메시지를 입력하세요"
                style={{ ...inputStyle, paddingRight: 40, fontSize: 12 }} />
              <button style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: acc, fontSize: 16, cursor: "pointer" }}>➤</button>
            </div>
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
