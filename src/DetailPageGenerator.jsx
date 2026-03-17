import { useState, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 만들기 v7
   ✅ Nano Banana (gemini-2.5-flash-image) API로 전체 이미지 생성
   ✅ Canvas 완전 제거
   ✅ 한국어 프롬프트로 한국어 텍스트 이미지에 직접 렌더
   ✅ 참고 이미지 스타일 분석 → 동일 스타일 생성
   ✅ 상품 이미지 업로드 → 프롬프트에 설명 반영
   ✅ 최대 20장 / ZIP 저장
══════════════════════════════════════════════════════════════ */

const CLAUDE_KEY = "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";

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", styleHint:"따뜻하고 식욕을 자극하는 음식 사진 스타일, 어두운 우드 테이블, 드라마틱한 조명, 고급 레스토랑 감성" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", styleHint:"미니멀하고 세련된 패션 룩북 스타일, 깔끔한 화이트 스튜디오, 에디토리얼 감성" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", styleHint:"럭셔리 화장품 브랜드 비주얼, 소프트 핑크 마블, 장미꽃잎, 골든 아워 빛, 고급스러운 분위기" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", styleHint:"세련된 IT 제품 사진, 다크 배경, 블루 글로우 조명, 미래지향적이고 테크 감성" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", styleHint:"아늑한 인테리어 라이프스타일, 따뜻한 원목 질감, 자연광, 스칸디나비아 감성" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", styleHint:"깔끔하고 신뢰감 있는 건강 제품, 신선한 그린 컬러, 화이트 배경, 아침 햇살 느낌" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", styleHint:"따뜻하고 귀여운 펫 라이프스타일, 보케 효과, 골든아워, 행복한 분위기" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", styleHint:"전문적이고 신뢰감 있는 서비스 비주얼, 깔끔한 그라데이션, 모던 오피스 감성" },
];

// ── 슬라이드 타입 20종 ────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"hero",       label:"메인 히어로"    },
  { id:"intro",      label:"브랜드 소개"    },
  { id:"feature",    label:"핵심 특징"      },
  { id:"detail1",    label:"상세 설명 1"    },
  { id:"detail2",    label:"상세 설명 2"    },
  { id:"comparison", label:"비교/장점"      },
  { id:"howto",      label:"사용 방법"      },
  { id:"ingredient", label:"구성/성분"      },
  { id:"quality",    label:"품질 인증"      },
  { id:"review",     label:"고객 후기"      },
  { id:"trust",      label:"신뢰 지표"      },
  { id:"faq",        label:"자주 묻는 질문" },
  { id:"gallery",    label:"상품 갤러리"    },
  { id:"package",    label:"구성품 안내"    },
  { id:"delivery",   label:"배송 안내"      },
  { id:"event",      label:"이벤트/혜택"    },
  { id:"size",       label:"사이즈 가이드"  },
  { id:"story",      label:"브랜드 스토리"  },
  { id:"warning",    label:"주의사항"       },
  { id:"cta",        label:"구매 유도"      },
];

// ══════════════════════════════════════════════════════════════
// Nano Banana 프롬프트 빌더 (슬라이드 타입별 한국어)
// ══════════════════════════════════════════════════════════════
function buildPrompt(slide, cat, productName, refStyle) {
  const h    = slide.headline    || "";
  const sub  = slide.subheadline || "";
  const body = slide.body        || "";
  const badge = slide.badge      || "";
  const cta  = slide.cta         || "지금 구매하기";

  // 공통 스타일 지시
  const base = [
    `한국 프리미엄 온라인 쇼핑몰 상세페이지 이미지를 생성해주세요.`,
    `카테고리: ${cat.label}. 디자인 스타일: ${cat.styleHint}.`,
    refStyle ? `참고 이미지 스타일: ${refStyle}` : "",
    `상품명: ${productName}.`,
    `1:1 정사각형 포맷. 워터마크 없음. 고품질 상업 이미지.`,
  ].filter(Boolean).join(" ");

  // 슬라이드별 레이아웃 지시
  const layouts = {
    hero: `풀블리드 히어로 이미지. ${productName} 제품이 화면을 가득 채우는 드라마틱한 사진. 하단에 어두운 그라데이션 오버레이. 하단에 굵고 큰 한국어 제목 "${h}". 그 아래 부제목 "${sub}". ${badge ? `좌상단 배지: "${badge}".` : ""} 강렬하고 임팩트 있는 첫 인상.`,

    intro: `브랜드 소개 레이아웃. 좌측 55%는 흰 배경의 텍스트 영역, 우측 45%는 ${productName} 라이프스타일 사진. 좌측 상단에 작은 영문 섹션 라벨, 그 아래 한국어 큰 제목 "${h}", 본문 "${body}". 좌측 상단에 얇은 가로선 포인트.`,

    feature: `핵심 특징 레이아웃. 상단에 섹션 라벨과 한국어 제목 "${h}". 하단에 3개의 카드가 나란히: 각 카드에 번호(01, 02, 03), 굵은 제목, 설명 텍스트. ${productName} 특징을 강조하는 아이콘이나 일러스트.`,

    detail1: `상세 설명 레이아웃. 상단 50%: ${productName} 클로즈업 고퀄리티 사진. 하단 50%: 흰 배경에 섹션 라벨, 한국어 제목 "${h}", 본문 텍스트 "${body}". 깔끔한 타이포그래피.`,

    detail2: `스펙 정보 레이아웃. 좌측 45%: 섹션 라벨, 한국어 제목 "${h}", 스펙 리스트(항목명: 값 형식으로). 우측 55%: ${productName} 제품 사진. 신뢰감 있고 정보가 명확한 레이아웃.`,

    comparison: `비교 레이아웃. 상단에 제목 "${h}". 중앙에 좌우로 나뉜 카드: 왼쪽 "BEFORE"(회색 배경, 기존 문제점), 오른쪽 "AFTER"(${cat.accent} 강조색 배경, 흰 텍스트, 해결책). 하단에 차별점 목록.`,

    howto: `사용 방법 레이아웃. 상단에 제목 "${h}". 단계별 리스트: 큰 번호(01, 02, 03)와 각 단계 제목, 설명. ${productName} 사용 장면 이미지. 직관적이고 따라하기 쉬운 느낌.`,

    ingredient: `구성/성분 레이아웃. 좌측에 성분 리스트(각 항목: 왼쪽 포인트 라인 + 성분명 + 설명). 우측에 ${productName} 제품 사진. 상단에 제목 "${h}". 신뢰감 있는 디자인.`,

    quality: `품질 인증 레이아웃. 배경에 ${productName} 품질을 보여주는 사진. 오버레이. 상단에 섹션 라벨과 제목 "${h}". 인증 마크나 배지 디자인 요소. 본문 "${body}". 신뢰와 고급스러움.`,

    review: `고객 후기 레이아웃. 상단에 제목 "${h}". 3개의 후기 카드: 각각 별점(★★★★★), 이탤릭체 후기 텍스트, 구매자 닉네임. 따뜻하고 신뢰감 있는 디자인.`,

    trust: `신뢰 지표 레이아웃. 상단에 제목 "${h}". 3개의 수치 카드: 큰 볼드 숫자 + 설명 텍스트. 하단에 인증/보증 문구. ${productName} 브랜드 이미지. 데이터 기반 신뢰감.`,

    faq: `FAQ 레이아웃. 상단에 제목 "${h}". 3~4개의 질문-답변 항목이 세로로 나열. 각 항목: 강조색 "Q" + 질문, "A" + 답변. 깔끔하고 읽기 쉬운 타이포그래피.`,

    gallery: `갤러리 레이아웃. 상단에 제목 "${h}". ${productName} 제품을 다양한 각도와 스타일로 촬영한 사진들이 그리드(2x2)로 배치. 고품질 제품 사진. 시각적으로 풍성한 구성.`,

    package: `구성품 안내 레이아웃. 상단에 제목 "${h}". ${productName} 구성품들이 배치된 플랫레이(flat lay) 사진. 각 구성품에 선과 텍스트로 설명. 깔끔한 화이트 배경.`,

    delivery: `배송 안내 레이아웃. 상단에 제목 "${h}". 배송 단계를 화살표와 아이콘으로 시각화. 각 단계별 설명 텍스트. 안심되고 신뢰감 있는 디자인.`,

    event: `이벤트/혜택 레이아웃. 강렬한 배경(${cat.accent} 계열 색). 중앙에 큰 제목 "${h}". 할인율/혜택을 강조하는 흰색 배지나 박스. 긴박감을 주는 문구. 시선을 끄는 임팩트.`,

    size: `사이즈 가이드 레이아웃. 상단에 제목 "${h}". 사이즈 표나 측정 가이드 일러스트. 측정 방법 설명. 깔끔하고 실용적인 정보 전달.`,

    story: `브랜드 스토리 레이아웃. 감성적인 배경 사진에 어두운 오버레이. 중앙에 큰 제목 "${h}". 아래에 스토리 본문 "${body}". 진정성 있고 따뜻한 브랜드 감성.`,

    warning: `주의사항 레이아웃. 밝은 배경. 상단에 제목 "${h}". 주의사항 목록: 각 항목에 경고 아이콘과 텍스트. 부드럽지만 명확하게 전달하는 디자인.`,

    cta: `구매 유도 레이아웃. ${productName} 감성 사진이 배경, 어두운 오버레이. 중앙 정렬. 상단에 섹션 라벨. 큰 제목 "${h}". 가격 정보(취소선 원가 + 큰 폰트 현재가). 흰색 CTA 버튼 박스에 "${cta}" 텍스트. 긴박감 문구.`,
  };

  const layout = layouts[slide.id] || `${slide.label} 레이아웃. 제목 "${h}". 본문 "${body}". 전문적인 디자인.`;
  return `${base} ${layout}`;
}

// ══════════════════════════════════════════════════════════════
// API 호출들
// ══════════════════════════════════════════════════════════════

// Nano Banana (gemini-2.5-flash-image) 이미지 생성
async function generateSlideImage(prompt) {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.image; // base64 data URL
}

// Claude로 슬라이드 텍스트 콘텐츠 생성
async function generateSlideTexts({ category, productName, features, price, cta, target, extra, pageCount, refStyle }) {
  const cat   = CATEGORIES.find(c => c.key === category);
  const types = SLIDE_TYPES.slice(0, pageCount);

  const prompt = `한국 프리미엄 쇼핑몰 상세페이지 카피라이터입니다.
상품명: ${productName} / 카테고리: ${cat.label}
특징: ${features} / 가격: ${price || "미정"} / 타겟: ${target || "일반"} / CTA: ${cta || "지금 구매하기"}
추가정보: ${extra || "없음"}
${refStyle ? `참고 스타일: ${refStyle}` : ""}

슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
각 슬라이드: headline(14자 이내), subheadline(20자, 선택), body(50자, 선택), badge(8자, 선택), cta(10자, 선택)

JSON만 응답:
{"slides":[${types.map(t => `{"id":"${t.id}","label":"${t.label}","headline":"","subheadline":"","body":"","badge":"","cta":""}`).join(",")}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

// 참고 이미지 분석
async function analyzeRefImage(b64, mime) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: "이 상세페이지 이미지의 디자인 스타일을 100자 이내로 설명해주세요. 색감, 배경 스타일, 조명, 레이아웃 분위기 위주로. 한국어로." }
        ]
      }]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// AI 문구 추천
async function getAiSuggestions(catLabel, form) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: `카테고리:${catLabel} 상품:"${form.productName}" 특징:"${form.features}"\nJSON만:\n{"productNames":["추천1","추천2","추천3"],"ctas":["CTA1","CTA2","CTA3"],"targets":["타겟1","타겟2"],"extras":["추가1","추가2"]}` }]
    }),
  });
  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  return JSON.parse(txt.replace(/```json\n?/g, "").replace(/```/g, "").trim());
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark }) {
  const [step,       setStep]       = useState(1);
  const [selCat,     setSelCat]     = useState(null);
  const [refImg,     setRefImg]     = useState(null);
  const [refStyle,   setRefStyle]   = useState("");
  const [analyzing,  setAnalyzing]  = useState(false);
  const [pageCount,  setPageCount]  = useState(5);
  const [form,       setForm]       = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [slides,     setSlides]     = useState([]);
  const [rendered,   setRendered]   = useState([]);     // base64 PNG 배열
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState({ msg:"", cur:0, total:0 });
  const [err,        setErr]        = useState("");
  const [curIdx,     setCurIdx]     = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [aiSugg,     setAiSugg]     = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const refFileRef = useRef(null);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];

  const handleRef = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      setRefImg(e.target.result); setAnalyzing(true);
      try {
        const b64  = e.target.result.split(",")[1];
        const mime = e.target.result.split(":")[1].split(";")[0];
        setRefStyle(await analyzeRefImage(b64, mime));
      } catch { setRefStyle("분석 실패"); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  // ── 전체 생성 ────────────────────────────────────────────────
  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true); setSlides([]); setRendered([]);

    try {
      // 1단계: Claude로 텍스트 생성
      setProgress({ msg: "슬라이드 텍스트 구성 중...", cur: 0, total: pageCount });
      const textData = await generateSlideTexts({ category: selCat, ...form, pageCount, refStyle });
      const slidesData = textData.slides || [];
      setSlides(slidesData);

      // 2단계: 각 슬라이드를 Nano Banana로 이미지 생성
      const results = new Array(slidesData.length).fill(null);
      for (let i = 0; i < slidesData.length; i++) {
        const s = slidesData[i];
        setProgress({ msg: `이미지 생성 중... ${i + 1}/${slidesData.length} — ${s.label}`, cur: i + 1, total: slidesData.length });
        try {
          const prompt = buildPrompt(s, cat, form.productName, refStyle);
          results[i] = await generateSlideImage(prompt);
        } catch (e) {
          console.warn(`슬라이드 ${i + 1} 실패:`, e.message);
          results[i] = null;
        }
        setRendered([...results]);
        await new Promise(r => setTimeout(r, 50));
      }

      setStep(3); setCurIdx(0);
    } catch (e) {
      setErr("생성 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 단일 슬라이드 재생성
  const regenerateOne = async (idx) => {
    if (!slides[idx]) return;
    setLoading(true);
    setProgress({ msg: `재생성 중... ${slides[idx].label}`, cur: 1, total: 1 });
    try {
      const prompt = buildPrompt(slides[idx], cat, form.productName, refStyle);
      const img = await generateSlideImage(prompt);
      setRendered(prev => { const r = [...prev]; r[idx] = img; return r; });
    } catch (e) { setErr("재생성 실패: " + e.message); }
    setLoading(false);
  };

  const saveCurrent = () => {
    const png = rendered[curIdx]; if (!png) return;
    const a = document.createElement("a");
    a.href = png;
    a.download = `${form.productName || "slide"}_${String(curIdx + 1).padStart(2, "0")}_${slides[curIdx]?.label || "slide"}.png`;
    a.click();
  };

  const saveAll = async () => {
    if (!rendered.some(Boolean)) return; setSaving(true);
    if (!window.JSZip) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    rendered.forEach((png, i) => {
      if (!png) return;
      const arr = Uint8Array.from(atob(png.split(",")[1]), c => c.charCodeAt(0));
      zip.file(`${String(i + 1).padStart(2, "0")}_${slides[i]?.label || "slide"}.png`, arr);
    });
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${form.productName || "detail"}_slides.zip`;
    a.click();
    setSaving(false);
  };

  const getSugg = async () => {
    setSuggesting(true); setAiSugg(null);
    try { setAiSugg(await getAiSuggestions(cat.label, form)); }
    catch (e) { console.error(e); }
    setSuggesting(false);
  };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  // ── Step 1: 카테고리 ────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 6 }}>상세페이지 만들기</div>
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
          <b style={{ color: text }}>Nano Banana (Gemini 2.5 Flash Image)</b>로 슬라이드를 완성된 이미지로 직접 생성해요.<br />
          한국어 텍스트를 이미지 안에 자연스럽게 렌더링 · Canvas 없음
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 10 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setSelCat(c.key); setStep(2); }}
            style={{ padding: "24px 18px", borderRadius: 14, border: `1.5px solid ${bdr}`, background: cardBg, cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.boxShadow = `0 4px 16px ${c.accent}25`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: c.accent, letterSpacing: 2.5, marginBottom: 12 }}>{c.label.toUpperCase()}</div>
            <div style={{ width: 32, height: 3, background: c.accent, borderRadius: 2 }} />
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: 입력 ────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setStep(1)} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>← 카테고리</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: text }}>{cat.label}</span>
        <div style={{ width: 24, height: 3, background: cat.accent, borderRadius: 1 }} />
      </div>

      <div style={{ display: "grid", gap: 14 }}>

        {/* 슬라이드 수 */}
        <div style={{ padding: "14px 18px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: text }}>슬라이드 수</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{SLIDE_TYPES.slice(0, pageCount).map(t => t.label).join(" · ")}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: cat.accent }}>{pageCount}장</div>
          </div>
          <input type="range" min={3} max={20} value={pageCount} onChange={e => setPageCount(Number(e.target.value))} style={{ width: "100%", accentColor: cat.accent }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: muted, marginTop: 4 }}>
            <span>3장</span><span>20장 (최대)</span>
          </div>
        </div>

        {/* 참고 이미지 */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4 }}>
            참고 이미지 <span style={{ color: muted, fontWeight: 400 }}>(선택 — 이 느낌으로 생성)</span>
          </div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, lineHeight: 1.6 }}>
            원하는 상세페이지를 올리면 AI가 색감·분위기·레이아웃 스타일을 분석해서 동일하게 생성해요
          </div>
          <div onClick={() => refFileRef.current?.click()}
            style={{ border: `1.5px dashed ${refImg ? cat.accent : bdr}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center", background: cardBg, transition: "all 0.12s" }}>
            {refImg ? (
              <>
                <img src={refImg} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: `1px solid ${bdr}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {analyzing
                    ? <div style={{ fontSize: 12, color: muted }}>스타일 분석 중...</div>
                    : refStyle
                      ? <><div style={{ fontSize: 11, fontWeight: 700, color: cat.accent, marginBottom: 4 }}>✓ 스타일 분석 완료 — 이 느낌으로 생성돼요</div><div style={{ fontSize: 11, color: muted, lineHeight: 1.55, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{refStyle}</div></>
                      : null}
                </div>
                <button onClick={e => { e.stopPropagation(); setRefImg(null); setRefStyle(""); }} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>제거</button>
              </>
            ) : (
              <div style={{ textAlign: "center", width: "100%", padding: "8px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>클릭해서 참고 이미지 업로드</div>
                <div style={{ fontSize: 11, color: muted }}>이 스타일과 비슷하게 만들어드려요</div>
              </div>
            )}
          </div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { handleRef(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {/* 텍스트 입력 */}
        {[
          { key: "productName", label: "상품명 *",    ph: "예: 블랙앵거스 티본스테이크 프리미엄 세트" },
          { key: "features",    label: "핵심 특징 *", ph: "예: 1++ 등급, 두께 5cm, 당일 냉장 배송", ta: true },
          { key: "price",       label: "가격",         ph: "예: 89,000원 (2인 세트)" },
          { key: "cta",         label: "CTA 문구",     ph: "예: 지금 주문하기" },
          { key: "target",      label: "타겟 고객",    ph: "예: 레스토랑 퀄리티를 집에서 즐기고 싶은 3040" },
          { key: "extra",       label: "추가 정보",    ph: "예: 드라이에이징 30일, 마르블링 최상급 인증", ta: true },
        ].map(({ key, label, ph, ta }) => (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>{label}</div>
            {ta
              ? <textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
              : <input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />}
          </div>
        ))}

        {/* AI 추천 */}
        <div style={{ padding: "14px 18px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiSugg ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: text }}>AI 문구 추천</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>입력값 기반으로 자동 추천</div>
            </div>
            <button onClick={getSugg} disabled={suggesting} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: suggesting ? "wait" : "pointer", background: `${cat.accent}18`, color: cat.accent, fontSize: 12, fontWeight: 800, opacity: suggesting ? 0.6 : 1 }}>
              {suggesting ? "추천 중..." : "AI 추천"}
            </button>
          </div>
          {aiSugg && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "productName", items: aiSugg.productNames, label: "상품명" },
                { key: "cta",         items: aiSugg.ctas,          label: "CTA 문구" },
                { key: "target",      items: aiSugg.targets,        label: "타겟 고객" },
                { key: "extra",       items: aiSugg.extras,         label: "추가 정보" },
              ].filter(r => r.items?.length > 0).map(({ key, items, label }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {items.map((v, i) => (
                      <button key={i} onClick={() => setForm(p => ({ ...p, [key]: v }))}
                        style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${cat.accent}35`, background: `${cat.accent}08`, color: text, fontSize: 12, cursor: "pointer" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: muted }}>클릭하면 입력란에 바로 적용</div>
            </div>
          )}
        </div>

        {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#f87171" }}>{err}</div>}

        <button onClick={generate} disabled={loading || analyzing}
          style={{ padding: "15px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer", background: loading ? `${cat.accent}55` : cat.accent, color: "#fff", fontSize: 15, fontWeight: 900, opacity: loading || analyzing ? 0.7 : 1 }}>
          {loading ? (progress.msg || "생성 중...") : `Nano Banana로 ${pageCount}장 이미지 생성`}
        </button>

        {/* 진행 바 */}
        {loading && progress.total > 0 && (
          <div style={{ padding: "14px 18px", borderRadius: 12, background: cardBg, border: `1px solid ${bdr}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: muted, marginBottom: 10 }}>
              <span>{progress.msg}</span>
              <span style={{ fontWeight: 700, color: cat.accent }}>{Math.round((progress.cur / progress.total) * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.08)" : "#e8e8e8" }}>
              <div style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${cat.accent}, ${cat.accent}bb)`, width: `${(progress.cur / progress.total) * 100}%`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 8 }}>
              Nano Banana가 한국어 텍스트를 포함한 완성 이미지를 생성 중이에요 (장당 약 10~20초)
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: 결과 ────────────────────────────────────────────
  if (step === 3) {
    const currentPng = rendered[curIdx];
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setStep(2)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>← 수정</button>
            <button onClick={() => { setStep(1); setSlides([]); setRendered([]); setRefImg(null); setRefStyle(""); setForm({ productName: "", features: "", price: "", cta: "지금 구매하기", target: "", extra: "" }); }}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>새로 만들기</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setCurIdx(Math.max(0, curIdx - 1))} disabled={curIdx === 0}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${bdr}`, background: cardBg, color: text, cursor: curIdx === 0 ? "not-allowed" : "pointer", opacity: curIdx === 0 ? 0.3 : 1, fontSize: 18 }}>‹</button>
            <span style={{ fontSize: 12, color: muted, minWidth: 44, textAlign: "center" }}>{curIdx + 1} / {slides.length}</span>
            <button onClick={() => setCurIdx(Math.min(slides.length - 1, curIdx + 1))} disabled={curIdx === slides.length - 1}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${bdr}`, background: cardBg, color: text, cursor: curIdx === slides.length - 1 ? "not-allowed" : "pointer", opacity: curIdx === slides.length - 1 ? 0.3 : 1, fontSize: 18 }}>›</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* 메인 이미지 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: cat.accent, letterSpacing: 2, marginBottom: 8 }}>
              {slides[curIdx]?.label?.toUpperCase()}
            </div>
            <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 56px rgba(0,0,0,0.28)", background: isDark ? "#111" : "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentPng
                ? <img src={currentPng} alt="slide" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                : <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: muted, marginBottom: 8 }}>이미지 생성 실패</div>
                    <button onClick={() => regenerateOne(curIdx)} disabled={loading}
                      style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: cat.accent, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      다시 생성
                    </button>
                  </div>
              }
            </div>

            {/* 저장 + 재생성 */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={saveCurrent} disabled={!currentPng}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: currentPng ? "pointer" : "not-allowed", background: cat.accent, color: "#fff", fontSize: 13, fontWeight: 800, opacity: currentPng ? 1 : 0.4 }}>
                이 슬라이드 저장
              </button>
              {currentPng && (
                <button onClick={() => regenerateOne(curIdx)} disabled={loading}
                  style={{ padding: "11px 18px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                  🔄 재생성
                </button>
              )}
              <button onClick={saveAll} disabled={!rendered.some(Boolean) || saving}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.1)" : "#2c2c2c", color: "#fff", fontSize: 13, fontWeight: 800, opacity: rendered.some(Boolean) && !saving ? 1 : 0.4 }}>
                {saving ? "ZIP 저장 중..." : "전체 ZIP"}
              </button>
            </div>
          </div>

          {/* 섬네일 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            {slides.map((s, i) => (
              <div key={i} onClick={() => setCurIdx(i)}
                style={{ cursor: "pointer", borderRadius: 9, overflow: "hidden", border: i === curIdx ? `2.5px solid ${cat.accent}` : `2.5px solid transparent`, transition: "all 0.12s", width: 100 }}>
                {rendered[i]
                  ? <img src={rendered[i]} alt="" style={{ width: 100, height: 100, display: "block", objectFit: "cover" }} />
                  : <div style={{ width: 100, height: 100, background: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${cat.accent}50`, borderTopColor: cat.accent, animation: "spin 1s linear infinite" }} />
                    </div>
                }
                <div style={{ fontSize: 9, color: i === curIdx ? cat.accent : muted, textAlign: "center", padding: "3px 2px", fontWeight: i === curIdx ? 800 : 400, background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return null;
}
