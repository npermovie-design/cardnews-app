import { useState, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 만들기 v6
   핵심 방식:
   - Claude가 슬라이드별 텍스트 + 비주얼 디렉션 생성
   - Gemini Imagen이 슬라이드 전체 이미지를 한 번에 생성
     (레이아웃·타이포·배경·제품사진 모두 포함)
   - 참고 이미지 스타일이 프롬프트에 완전히 반영됨
══════════════════════════════════════════════════════════════ */

const CLAUDE_KEY = "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";

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", en:"food & beverage",  photoHint:"professional food photography, steaming hot food, rich colors" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", en:"fashion & clothing", photoHint:"fashion lookbook photography, model wearing clothes, studio lighting" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", en:"beauty & cosmetics", photoHint:"luxury cosmetics, glass bottles, soft pink marble background" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", en:"electronics",        photoHint:"sleek electronics product photography, dark background, blue accent light" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", en:"interior & furniture",photoHint:"cozy interior, warm lighting, lifestyle photography" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", en:"health & wellness",  photoHint:"clean health product, white background, green nature elements" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", en:"pet products",        photoHint:"cute pets, warm golden photography, lifestyle" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", en:"service & education", photoHint:"professional office, clean modern design, people working" },
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
  { id:"faq",        label:"FAQ"            },
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
// 1단계: Claude로 슬라이드 콘텐츠 + 이미지 프롬프트 생성
// ══════════════════════════════════════════════════════════════
async function generateSlideDirections({
  category, productName, features, price, cta, target, extra, pageCount, refStyleDesc
}) {
  const cat = CATEGORIES.find(c => c.key === category);
  const types = SLIDE_TYPES.slice(0, pageCount);

  const prompt = `당신은 한국 쇼핑몰 상세페이지 전문 디자이너입니다.
아래 상품의 상세페이지 슬라이드 ${pageCount}장을 만들어야 합니다.
각 슬라이드에 대해 (1) 표시할 텍스트 내용과 (2) Gemini Imagen에게 보낼 영어 이미지 생성 프롬프트를 작성해주세요.

상품 정보:
- 상품명: ${productName}
- 카테고리: ${cat.label} (${cat.en})
- 핵심 특징: ${features}
- 가격: ${price || "미정"}
- CTA: ${cta || "지금 구매하기"}
- 타겟: ${target || "일반 소비자"}
- 추가 정보: ${extra || "없음"}
${refStyleDesc ? `\n참고 이미지 스타일: ${refStyleDesc}` : ""}

슬라이드 구성 (${pageCount}장):
${types.map((t, i) => `${i+1}. ${t.id} (${t.label})`).join("\n")}

이미지 프롬프트 작성 규칙:
- 한국 프리미엄 쇼핑몰 상세페이지 스타일로
- 슬라이드 안에 한국어 텍스트가 직접 포함된 완성된 디자인 이미지
- 사진과 텍스트가 자연스럽게 어우러진 레이아웃
- ${cat.photoHint}
- 고급스럽고 상업적으로 완성된 느낌
- 실제 한국 온라인 쇼핑몰 상세페이지처럼
${refStyleDesc ? `- 참고 스타일: ${refStyleDesc}` : ""}

JSON만 응답 (다른 텍스트 없음):
{
  "slides": [
    {
      "id": "슬라이드id",
      "label": "슬라이드명",
      "texts": {
        "headline": "메인 헤드라인",
        "subheadline": "서브 헤드라인 (있을 경우)",
        "body": "본문 텍스트",
        "badge": "배지 텍스트 (있을 경우)",
        "cta": "CTA 버튼 텍스트 (있을 경우)"
      },
      "imagePrompt": "Korean premium shopping mall product detail page, ${types[0]?.label} section. [구체적인 레이아웃과 비주얼 설명, 반드시 영어로]. Include Korean text: '[헤드라인 한국어]' as large title text. ${cat.photoHint}. Professional commercial photography style, 1:1 square format, no watermark. High-end Korean e-commerce style like luxury brand detail page."
    }
  ]
}`;

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
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); }
  catch { throw new Error("파싱 실패: " + txt.slice(0, 200)); }
}

// ══════════════════════════════════════════════════════════════
// 2단계: Gemini Imagen으로 완성 이미지 생성
// ══════════════════════════════════════════════════════════════
async function generateImage(prompt) {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspectRatio: "1:1" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.image;
}

// ══════════════════════════════════════════════════════════════
// 참고 이미지 스타일 분석
// ══════════════════════════════════════════════════════════════
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
      max_tokens: 600,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: "Analyze this Korean e-commerce detail page image for use as a style reference in image generation prompts. Describe in English (max 200 words): color palette, background style, photography style, typography placement, lighting mood, layout structure, overall visual tone. Focus on details that would help recreate this style." }
        ]
      }]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// AI 추천
async function getAiSuggestions(catLabel, form) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
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
  const [slides,     setSlides]     = useState([]);       // 슬라이드 메타
  const [rendered,   setRendered]   = useState([]);       // base64 완성 이미지
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
    setErr(""); setLoading(true); setRendered([]); setSlides([]);

    try {
      // 1. Claude로 전체 슬라이드 콘텐츠 + 이미지 프롬프트 생성
      setProgress({ msg: "AI가 슬라이드 구성 중...", cur: 0, total: pageCount });
      const data = await generateSlideDirections({ category: selCat, ...form, pageCount, refStyleDesc: refStyle });
      const slidesData = data.slides || [];
      setSlides(slidesData);

      // 2. 각 슬라이드 이미지 생성
      const results = Array(slidesData.length).fill(null);
      for (let i = 0; i < slidesData.length; i++) {
        const s = slidesData[i];
        setProgress({ msg: `이미지 생성 중... (${i+1}/${slidesData.length}) — ${s.label}`, cur: i+1, total: slidesData.length });
        try {
          const img = await generateImage(s.imagePrompt);
          results[i] = img;
        } catch (imgErr) {
          console.warn(`슬라이드 ${i+1} 실패:`, imgErr.message);
          results[i] = null;
        }
        setRendered([...results]);
        await new Promise(r => setTimeout(r, 100));
      }

      setStep(3); setCurIdx(0);
      setProgress({ msg: "완료!", cur: slidesData.length, total: slidesData.length });
    } catch (e) {
      setErr("생성 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrent = () => {
    const png = rendered[curIdx];
    if (!png) return;
    const a = document.createElement("a");
    a.href = png;
    a.download = `${form.productName || "slide"}_${String(curIdx+1).padStart(2,"0")}_${slides[curIdx]?.label || "slide"}.png`;
    a.click();
  };

  const saveAll = async () => {
    const valid = rendered.filter(Boolean);
    if (!valid.length) return;
    setSaving(true);
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
      zip.file(`${String(i+1).padStart(2,"0")}_${slides[i]?.label || "slide"}.png`, arr);
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

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${bdr}`, background: inputBg, color: text,
    fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  // ── Step 1: 카테고리 ────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, letterSpacing: -0.5, marginBottom: 6 }}>상세페이지 만들기</div>
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>
          Gemini AI가 슬라이드를 <b style={{ color: text }}>완성된 이미지로 직접 생성</b>해요.<br/>
          레이아웃·사진·텍스트가 모두 포함된 고품질 상세페이지
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
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                {SLIDE_TYPES.slice(0, pageCount).map(t => t.label).join(" · ")}
              </div>
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
            참고 이미지 <span style={{ color: muted, fontWeight: 400 }}>(선택 — 이 스타일로 생성)</span>
          </div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, lineHeight: 1.6 }}>
            원하는 느낌의 상세페이지 이미지를 올리면 AI가 색감·레이아웃·분위기를 분석해 동일한 스타일로 생성해요
          </div>
          <div onClick={() => refFileRef.current?.click()}
            style={{ border: `1.5px dashed ${refImg ? cat.accent : bdr}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center", background: cardBg, transition: "all 0.12s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = cat.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = refImg ? cat.accent : bdr}>
            {refImg ? (
              <>
                <img src={refImg} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: `1px solid ${bdr}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {analyzing
                    ? <div style={{ fontSize: 12, color: muted }}>스타일 분석 중...</div>
                    : refStyle
                    ? <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: cat.accent, marginBottom: 4 }}>✓ 스타일 분석 완료 — 이 느낌으로 생성돼요</div>
                        <div style={{ fontSize: 11, color: muted, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{refStyle}</div>
                      </>
                    : null}
                </div>
                <button onClick={e => { e.stopPropagation(); setRefImg(null); setRefStyle(""); }}
                  style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>제거</button>
              </>
            ) : (
              <div style={{ textAlign: "center", width: "100%", padding: "8px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>클릭해서 참고 이미지 업로드</div>
                <div style={{ fontSize: 11, color: muted }}>JPG, PNG — 이 스타일과 비슷하게 만들어드려요</div>
              </div>
            )}
          </div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { handleRef(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {/* 텍스트 입력 */}
        {[
          { key: "productName", label: "상품명 *",    ph: "예: 블랙앵거스 티본스테이크 프리미엄 세트" },
          { key: "features",    label: "핵심 특징 *", ph: "예: 1++ 최상급 등급, 두께 5cm, 당일 냉장 배송", ta: true },
          { key: "price",       label: "가격",         ph: "예: 89,000원 (2인 세트)" },
          { key: "cta",         label: "CTA 문구",     ph: "예: 지금 주문하기" },
          { key: "target",      label: "타겟 고객",    ph: "예: 레스토랑 퀄리티를 집에서 즐기고 싶은 3040" },
          { key: "extra",       label: "추가 정보",    ph: "예: 1++ 등급 인증, 수제 드라이에이징 30일", ta: true },
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
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>입력 내용 기반으로 자동 추천</div>
            </div>
            <button onClick={getSugg} disabled={suggesting}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: suggesting ? "wait" : "pointer", background: `${cat.accent}18`, color: cat.accent, fontSize: 12, fontWeight: 800, opacity: suggesting ? 0.6 : 1 }}>
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
              <div style={{ fontSize: 10, color: muted }}>클릭하면 입력란에 바로 적용돼요</div>
            </div>
          )}
        </div>

        {err && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#f87171" }}>
            {err}
          </div>
        )}

        <button onClick={generate} disabled={loading || analyzing}
          style={{ padding: "15px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer", background: loading ? `${cat.accent}55` : cat.accent, color: "#fff", fontSize: 15, fontWeight: 900, opacity: loading || analyzing ? 0.7 : 1 }}>
          {loading ? (progress.msg || "생성 중...") : `Gemini AI로 ${cat.label} 상세페이지 ${pageCount}장 생성`}
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
              슬라이드별 고품질 이미지를 Gemini AI가 직접 그리고 있어요 (장당 약 10~20초)
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: 결과 ────────────────────────────────────────────
  if (step === 3) {
    const currentPng = rendered[curIdx];
    const currentSlide = slides[curIdx];

    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 20px 60px" }}>
        {/* 상단 바 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setStep(2)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>← 수정</button>
            <button onClick={() => { setStep(1); setSlides([]); setRendered([]); setRefImg(null); setRefStyle(""); setForm({ productName: "", features: "", price: "", cta: "지금 구매하기", target: "", extra: "" }); }}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
              새로 만들기
            </button>
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
              {currentSlide?.label?.toUpperCase()}
            </div>
            <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 56px rgba(0,0,0,0.28)", background: isDark ? "#111" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentPng
                ? <img src={currentPng} alt="slide" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                : <div style={{ textAlign: "center", padding: 20 }}>
                    <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>이미지 생성 중...</div>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: `${cat.accent}30`, margin: "0 auto" }}>
                      <div style={{ width: "60%", height: "100%", borderRadius: 2, background: cat.accent, animation: "pulse 1.2s ease-in-out infinite" }} />
                    </div>
                  </div>
              }
            </div>

            {/* 생성 실패 시 재시도 */}
            {!currentPng && !loading && (
              <button onClick={async () => {
                if (!currentSlide?.imagePrompt) return;
                setLoading(true);
                setProgress({ msg: `재시도 중... (${curIdx+1}/${slides.length})`, cur: curIdx+1, total: slides.length });
                try {
                  const img = await generateImage(currentSlide.imagePrompt);
                  setRendered(prev => { const r = [...prev]; r[curIdx] = img; return r; });
                } catch(e) { setErr("재시도 실패: " + e.message); }
                setLoading(false);
              }} style={{ marginTop: 8, width: "100%", padding: "9px", borderRadius: 9, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                🔄 이 슬라이드 재생성
              </button>
            )}

            {/* 저장 버튼 */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={saveCurrent} disabled={!currentPng}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: currentPng ? "pointer" : "not-allowed", background: cat.accent, color: "#fff", fontSize: 13, fontWeight: 800, opacity: currentPng ? 1 : 0.4 }}>
                현재 이미지 저장
              </button>
              <button onClick={saveAll} disabled={!rendered.some(Boolean) || saving}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: rendered.some(Boolean) && !saving ? "pointer" : "not-allowed", background: isDark ? "rgba(255,255,255,0.12)" : "#2c2c2c", color: "#fff", fontSize: 13, fontWeight: 800, opacity: rendered.some(Boolean) && !saving ? 1 : 0.4 }}>
                {saving ? "ZIP 저장 중..." : "전체 ZIP 저장"}
              </button>
            </div>
          </div>

          {/* 섬네일 */}
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

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        `}</style>
      </div>
    );
  }

  return null;
}
