import { useState, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 생성기 v2
   - HTML 기반 슬라이드 (실제 쇼핑몰 느낌)
   - 텍스트 직접 편집 가능
   - html2canvas로 PNG 저장
   - 한국 쇼핑몰 레퍼런스 스타일
══════════════════════════════════════════════════════════════ */

const API_KEY = "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";

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     icon:"🍽", accent:"#c0392b", bg:"#fff8f5", sub:"#f5e6e3" },
  { key:"fashion",   label:"패션/의류",     icon:"👗", accent:"#2c2c2c", bg:"#fafafa", sub:"#f0f0f0" },
  { key:"beauty",    label:"뷰티/화장품",   icon:"💄", accent:"#9b5a7a", bg:"#fff5f8", sub:"#f9e8f0" },
  { key:"tech",      label:"전자/디지털",   icon:"💻", accent:"#1a56db", bg:"#f5f8ff", sub:"#e0eaff" },
  { key:"interior",  label:"인테리어/가구", icon:"🪑", accent:"#7c5c3a", bg:"#fdf8f3", sub:"#f0e8dc" },
  { key:"health",    label:"건강/헬스",     icon:"💊", accent:"#2e7d32", bg:"#f5fcf5", sub:"#dff0df" },
  { key:"pet",       label:"반려동물",      icon:"🐾", accent:"#d4820a", bg:"#fffbf0", sub:"#fef0cc" },
  { key:"service",   label:"서비스/교육",   icon:"📚", accent:"#5e35b1", bg:"#f8f5ff", sub:"#ece5ff" },
];

// ── 슬라이드 타입 정의 ────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"hero",    label:"메인 히어로" },
  { id:"feature", label:"핵심 특징"   },
  { id:"detail",  label:"상세 설명"   },
  { id:"trust",   label:"신뢰/후기"   },
  { id:"cta",     label:"구매 유도"   },
];

// ── AI 생성 ───────────────────────────────────────────────────
async function generateContent({ category, productName, features, price, cta, target, extra }) {
  const cat = CATEGORIES.find(c => c.key === category);
  const prompt = `한국 쇼핑몰 상세페이지 전문 카피라이터입니다.
아래 상품의 상세페이지 슬라이드 5장 내용을 생성해주세요.

상품명: ${productName}
카테고리: ${cat.label}
핵심 특징: ${features}
가격: ${price || "미정"}
CTA: ${cta || "지금 구매하기"}
타겟: ${target || "일반 소비자"}
추가정보: ${extra || "없음"}

JSON만 응답. 다른 텍스트 없음:
{
  "slides": [
    {
      "id": "hero",
      "badge": "배지 (8자 이내, 예: NEW ARRIVAL)",
      "headline": "강렬한 메인 카피 (16자 이내)",
      "subheadline": "서브 카피 (24자 이내)",
      "body": "짧은 소개 (40자 이내)"
    },
    {
      "id": "feature",
      "sectionTitle": "섹션 타이틀 (예: WHY CHOOSE US)",
      "headline": "특징 헤드라인 (16자 이내)",
      "features": [
        { "icon": "이모지", "title": "특징명 (8자)", "desc": "설명 (24자 이내)" },
        { "icon": "이모지", "title": "특징명 (8자)", "desc": "설명 (24자 이내)" },
        { "icon": "이모지", "title": "특징명 (8자)", "desc": "설명 (24자 이내)" }
      ]
    },
    {
      "id": "detail",
      "sectionTitle": "DETAIL",
      "headline": "상세 설명 헤드라인 (20자 이내)",
      "body": "본문 설명 (100자 이내)",
      "points": ["포인트1 (20자)", "포인트2 (20자)", "포인트3 (20자)"]
    },
    {
      "id": "trust",
      "sectionTitle": "REVIEW",
      "headline": "고객 신뢰 헤드라인 (16자 이내)",
      "stats": [
        { "number": "숫자+단위", "label": "지표명" },
        { "number": "숫자+단위", "label": "지표명" },
        { "number": "숫자+단위", "label": "지표명" }
      ],
      "review": "고객 후기 문구 (50자 이내)"
    },
    {
      "id": "cta",
      "sectionTitle": "SPECIAL OFFER",
      "headline": "마지막 어필 (16자 이내)",
      "originalPrice": "${price ? `정가 ${price}` : ""}",
      "price": "${price || ""}",
      "discount": "할인율 또는 혜택",
      "cta": "${cta || "지금 구매하기"}",
      "urgency": "긴박감 문구 (16자 이내)"
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); }
  catch { throw new Error("AI 응답 파싱 실패"); }
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 컴포넌트들 (HTML 기반, 편집 가능)
// ══════════════════════════════════════════════════════════════

function EditableText({ value, onChange, tag = "p", style = {}, className = "" }) {
  const [editing, setEditing] = useState(false);
  const Tag = tag;
  if (editing) {
    return (
      <Tag style={{ ...style, outline: "2px solid #6366f1", borderRadius: 4, minWidth: 40, cursor: "text" }}
        contentEditable suppressContentEditableWarning
        onBlur={e => { onChange(e.target.innerText); setEditing(false); }}>
        {value}
      </Tag>
    );
  }
  return (
    <Tag style={{ ...style, cursor: "text", position: "relative" }}
      className={className}
      onClick={() => setEditing(true)}
      title="클릭해서 편집">
      {value}
    </Tag>
  );
}

// 슬라이드 1: 메인 히어로
function HeroSlide({ data, onChange, cat, imgUrl }) {
  const W = 800;
  return (
    <div style={{ width: W, minHeight: W, background: cat.bg, position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing: "border-box" }}>
      {/* 이미지 풀블리드 */}
      {imgUrl && (
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%)" }} />
        </div>
      )}

      {/* 컨텐츠 */}
      <div style={{ position: "relative", zIndex: 2, padding: "64px 56px", minHeight: W, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {/* 배지 */}
        <div style={{ marginBottom: 20 }}>
          <EditableText value={data.badge || "NEW ARRIVAL"} onChange={v => onChange({ ...data, badge: v })}
            tag="span"
            style={{ display: "inline-block", background: cat.accent, color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 3, padding: "6px 16px", borderRadius: 2 }} />
        </div>

        {/* 메인 헤드라인 */}
        <EditableText value={data.headline || ""} onChange={v => onChange({ ...data, headline: v })}
          tag="h1"
          style={{ fontSize: 56, fontWeight: 900, color: imgUrl ? "#fff" : "#1a1a1a", lineHeight: 1.2, letterSpacing: -1.5, marginBottom: 16 }} />

        {/* 서브 */}
        <EditableText value={data.subheadline || ""} onChange={v => onChange({ ...data, subheadline: v })}
          tag="p"
          style={{ fontSize: 20, fontWeight: 500, color: imgUrl ? "rgba(255,255,255,0.85)" : "#555", marginBottom: 20, lineHeight: 1.6 }} />

        {/* 본문 */}
        <EditableText value={data.body || ""} onChange={v => onChange({ ...data, body: v })}
          tag="p"
          style={{ fontSize: 15, color: imgUrl ? "rgba(255,255,255,0.7)" : "#777", lineHeight: 1.8, maxWidth: 480 }} />

        {/* 하단 라인 */}
        <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 3, background: cat.accent }} />
          <span style={{ fontSize: 12, color: imgUrl ? "rgba(255,255,255,0.5)" : "#aaa", letterSpacing: 2, fontWeight: 600 }}>01 / 05</span>
        </div>
      </div>
    </div>
  );
}

// 슬라이드 2: 핵심 특징
function FeatureSlide({ data, onChange, cat, imgUrl }) {
  const W = 800;
  return (
    <div style={{ width: W, minHeight: W, background: "#fff", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* 상단 이미지 */}
      {imgUrl && (
        <div style={{ height: 320, overflow: "hidden", flexShrink: 0 }}>
          <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* 섹션 타이틀 */}
      <div style={{ padding: imgUrl ? "40px 56px 0" : "64px 56px 0", borderTop: `3px solid ${cat.accent}` }}>
        <EditableText value={data.sectionTitle || "FEATURES"} onChange={v => onChange({ ...data, sectionTitle: v })}
          tag="span"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: cat.accent }} />
        <EditableText value={data.headline || ""} onChange={v => onChange({ ...data, headline: v })}
          tag="h2"
          style={{ fontSize: 36, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.3, marginTop: 12, marginBottom: 40, letterSpacing: -0.8 }} />
      </div>

      {/* 특징 3개 */}
      <div style={{ padding: "0 56px 56px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, flex: 1 }}>
        {(data.features || []).map((f, i) => (
          <div key={i} style={{ padding: "28px 20px", background: cat.bg, borderRadius: 12, border: `1px solid ${cat.sub}` }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
            <EditableText value={f.title} onChange={v => onChange({ ...data, features: data.features.map((ff,j)=>j===i?{...ff,title:v}:ff) })}
              tag="p" style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4 }} />
            <EditableText value={f.desc} onChange={v => onChange({ ...data, features: data.features.map((ff,j)=>j===i?{...ff,desc:v}:ff) })}
              tag="p" style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }} />
          </div>
        ))}
      </div>

      {/* 페이지 번호 */}
      <div style={{ padding: "0 56px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 24, height: 2, background: cat.accent }} />
        <span style={{ fontSize: 11, color: "#bbb", letterSpacing: 2, fontWeight: 600 }}>02 / 05</span>
      </div>
    </div>
  );
}

// 슬라이드 3: 상세 설명
function DetailSlide({ data, onChange, cat, imgUrl }) {
  const W = 800;
  return (
    <div style={{ width: W, minHeight: W, background: cat.bg, fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: imgUrl ? "1fr 1fr" : "1fr", minHeight: W }}>
        {/* 이미지 */}
        {imgUrl && (
          <div style={{ overflow: "hidden" }}>
            <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        {/* 텍스트 */}
        <div style={{ padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <EditableText value={data.sectionTitle || "DETAIL"} onChange={v => onChange({ ...data, sectionTitle: v })}
            tag="span" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: cat.accent, marginBottom: 16, display: "block" }} />
          <div style={{ width: 32, height: 3, background: cat.accent, marginBottom: 24 }} />
          <EditableText value={data.headline || ""} onChange={v => onChange({ ...data, headline: v })}
            tag="h2" style={{ fontSize: 30, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.4, letterSpacing: -0.5, marginBottom: 20 }} />
          <EditableText value={data.body || ""} onChange={v => onChange({ ...data, body: v })}
            tag="p" style={{ fontSize: 14, color: "#555", lineHeight: 1.9, marginBottom: 28 }} />
          {/* 포인트 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(data.points || []).map((pt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.accent, flexShrink: 0, marginTop: 7 }} />
                <EditableText value={pt} onChange={v => onChange({ ...data, points: data.points.map((p,j)=>j===i?v:p) })}
                  tag="span" style={{ fontSize: 14, color: "#444", lineHeight: 1.6, fontWeight: 500 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 2, background: cat.accent }} />
            <span style={{ fontSize: 11, color: "#bbb", letterSpacing: 2, fontWeight: 600 }}>03 / 05</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 슬라이드 4: 신뢰/후기
function TrustSlide({ data, onChange, cat, imgUrl }) {
  const W = 800;
  return (
    <div style={{ width: W, minHeight: W, background: "#fff", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing: "border-box" }}>
      {/* 헤더 */}
      <div style={{ padding: "56px 56px 40px", borderBottom: `1px solid #f0f0f0` }}>
        <EditableText value={data.sectionTitle || "REVIEW"} onChange={v => onChange({ ...data, sectionTitle: v })}
          tag="span" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: cat.accent }} />
        <EditableText value={data.headline || ""} onChange={v => onChange({ ...data, headline: v })}
          tag="h2" style={{ fontSize: 36, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.3, marginTop: 12, letterSpacing: -0.8 }} />
      </div>

      {/* 수치 3개 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid #f0f0f0` }}>
        {(data.stats || []).map((s, i) => (
          <div key={i} style={{ padding: "36px 24px", textAlign: "center", borderRight: i < 2 ? `1px solid #f0f0f0` : "none" }}>
            <EditableText value={s.number} onChange={v => onChange({ ...data, stats: data.stats.map((ss,j)=>j===i?{...ss,number:v}:ss) })}
              tag="div" style={{ fontSize: 44, fontWeight: 900, color: cat.accent, lineHeight: 1, letterSpacing: -1 }} />
            <EditableText value={s.label} onChange={v => onChange({ ...data, stats: data.stats.map((ss,j)=>j===i?{...ss,label:v}:ss) })}
              tag="div" style={{ fontSize: 12, color: "#888", marginTop: 8, letterSpacing: 1, fontWeight: 600 }} />
          </div>
        ))}
      </div>

      {/* 후기 인용 */}
      <div style={{ padding: "40px 56px", background: cat.bg }}>
        <div style={{ fontSize: 48, color: cat.accent, lineHeight: 1, marginBottom: 12, fontFamily: "Georgia,serif" }}>"</div>
        <EditableText value={data.review || ""} onChange={v => onChange({ ...data, review: v })}
          tag="p" style={{ fontSize: 18, color: "#333", lineHeight: 1.8, fontStyle: "italic", fontWeight: 500 }} />
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
          {[1,2,3,4,5].map(s=><span key={s} style={{ color: cat.accent, fontSize: 16 }}>★</span>)}
          <span style={{ fontSize: 13, color: "#888", marginLeft: 8 }}>검증된 구매자 후기</span>
        </div>
      </div>

      {/* 이미지 스트립 */}
      {imgUrl && (
        <div style={{ height: 180, overflow: "hidden" }}>
          <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.9)" }} />
        </div>
      )}

      <div style={{ padding: "16px 56px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 24, height: 2, background: cat.accent }} />
        <span style={{ fontSize: 11, color: "#bbb", letterSpacing: 2, fontWeight: 600 }}>04 / 05</span>
      </div>
    </div>
  );
}

// 슬라이드 5: 구매 유도
function CtaSlide({ data, onChange, cat, imgUrl }) {
  const W = 800;
  return (
    <div style={{ width: W, minHeight: W, position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing: "border-box" }}>
      {/* 배경 */}
      {imgUrl ? (
        <>
          <img src={imgUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
        </>
      ) : (
        <div style={{ position: "absolute", inset: 0, background: cat.accent }} />
      )}

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: W, padding: "64px 56px", textAlign: "center" }}>
        <EditableText value={data.sectionTitle || "SPECIAL OFFER"} onChange={v => onChange({ ...data, sectionTitle: v })}
          tag="span" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, color: "rgba(255,255,255,0.7)", marginBottom: 24, display: "block" }} />

        <EditableText value={data.headline || ""} onChange={v => onChange({ ...data, headline: v })}
          tag="h2" style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1.3, letterSpacing: -1, marginBottom: 32 }} />

        {/* 가격 */}
        <div style={{ marginBottom: 12 }}>
          {data.originalPrice && (
            <EditableText value={data.originalPrice} onChange={v => onChange({ ...data, originalPrice: v })}
              tag="span" style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", textDecoration: "line-through", display: "block", marginBottom: 8 }} />
          )}
          <EditableText value={data.price || ""} onChange={v => onChange({ ...data, price: v })}
            tag="div" style={{ fontSize: 56, fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1 }} />
        </div>

        {/* 할인 배지 */}
        {data.discount && (
          <div style={{ display: "inline-block", background: "#fff", color: cat.accent, fontSize: 14, fontWeight: 800, padding: "8px 20px", borderRadius: 4, marginBottom: 32 }}>
            <EditableText value={data.discount} onChange={v => onChange({ ...data, discount: v })}
              tag="span" />
          </div>
        )}

        {/* 긴박감 */}
        <EditableText value={data.urgency || ""} onChange={v => onChange({ ...data, urgency: v })}
          tag="p" style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 36, letterSpacing: 0.5 }} />

        {/* CTA 버튼 */}
        <div style={{ background: "#fff", color: cat.accent, borderRadius: 4, padding: "18px 64px", fontSize: 18, fontWeight: 900, letterSpacing: -0.3, display: "inline-block", cursor: "pointer" }}>
          <EditableText value={data.cta || "지금 구매하기"} onChange={v => onChange({ ...data, cta: v })}
            tag="span" />
        </div>

        <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 24, height: 2, background: "rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: 600 }}>05 / 05</span>
        </div>
      </div>
    </div>
  );
}

// ── 슬라이드 렌더러 ────────────────────────────────────────────
function SlideRenderer({ slide, idx, onChange, cat, imgUrl, thumb = false }) {
  const scale = thumb ? 0.14 : 1;
  const props = { data: slide, onChange, cat, imgUrl };
  const inner = slide.id === "hero"    ? <HeroSlide    {...props} />
              : slide.id === "feature" ? <FeatureSlide {...props} />
              : slide.id === "detail"  ? <DetailSlide  {...props} />
              : slide.id === "trust"   ? <TrustSlide   {...props} />
              : slide.id === "cta"     ? <CtaSlide     {...props} />
              : null;

  if (thumb) {
    return (
      <div style={{ width: 800 * scale, height: 800 * scale, overflow: "hidden", borderRadius: 6, flexShrink: 0, pointerEvents: "none" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 800, height: 800 }}>
          {inner}
        </div>
      </div>
    );
  }
  return inner;
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark, user }) {
  const [step,    setStep]    = useState(1);
  const [selCat,  setSelCat]  = useState(null);
  const [images,  setImages]  = useState([]);
  const [form,    setForm]    = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [slides,  setSlides]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [curIdx,  setCurIdx]  = useState(0);
  const [dlBusy,  setDlBusy]  = useState(false);
  const fileRef = useRef(null);
  const slideRef = useRef(null);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];
  const bgImg   = images[0]?.dataUrl || null;

  const handleImages = (files) => {
    const arr = Array.from(files).slice(0, 5);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ name: f.name, dataUrl: e.target.result });
      r.readAsDataURL(f);
    }))).then(setImages);
  };

  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true);
    try {
      const data = await generateContent({ category: selCat, ...form });
      setSlides(data.slides || []);
      setStep(3); setCurIdx(0);
    } catch(e) { setErr("생성 실패: " + e.message); }
    finally    { setLoading(false); }
  };

  const updateSlide = (idx, newData) => {
    setSlides(prev => prev.map((s, i) => i === idx ? newData : s));
  };

  // html2canvas 다운로드
  const dlOne = async () => {
    if (!slideRef.current) return;
    setDlBusy(true);
    try {
      const { default: h2c } = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      const canvas = await h2c(slideRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#fff" });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${form.productName || "detail"}_slide${curIdx+1}.png`;
      a.click();
    } catch(e) {
      // fallback: 직접 링크
      alert("저장 중 오류: " + e.message);
    }
    setDlBusy(false);
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── Step 1: 카테고리 ────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:6 }}>🛍 상세페이지 생성기</div>
        <div style={{ fontSize:13, color:muted }}>카테고리를 선택하면 최적화된 디자인으로 슬라이드를 만들어드려요 · 텍스트 직접 편집 가능</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:10 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setSelCat(c.key); setStep(2); }}
            style={{ padding:"20px 16px", borderRadius:14, border:`2px solid ${bdr}`, background:cardBg, cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.transform = "none"; }}>
            <div style={{ fontSize:30, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:4 }}>{c.label}</div>
            <div style={{ width:24, height:2, background:c.accent, borderRadius:1 }} />
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: 입력 ────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
        <button onClick={() => setStep(1)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 카테고리</button>
        <span style={{ fontSize:18 }}>{cat.icon}</span>
        <span style={{ fontSize:16, fontWeight:800, color:text }}>{cat.label} 상세페이지</span>
        <div style={{ width:32, height:3, background:cat.accent, borderRadius:1 }} />
      </div>

      <div style={{ display:"grid", gap:14 }}>
        {/* 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:8 }}>
            📸 상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(최대 5장, 첫 번째가 메인)</span>
          </div>
          <div onClick={() => fileRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleImages(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            style={{ border:`2px dashed ${images.length ? cat.accent : bdr}`, borderRadius:12, padding: images.length ? "14px" : "28px", cursor:"pointer", background: images.length ? `${cat.accent}08` : cardBg, textAlign: images.length ? "left" : "center", transition:"all 0.15s" }}>
            {images.length ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.dataUrl} alt="" style={{ width:68, height:68, objectFit:"cover", borderRadius:8, display:"block" }} />
                    <button onClick={e => { e.stopPropagation(); setImages(images.filter((_,j)=>j!==i)); }}
                      style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:"#ef4444", color:"#fff", border:"none", cursor:"pointer", fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  </div>
                ))}
                {images.length < 5 && <div style={{ width:68, height:68, borderRadius:8, border:`2px dashed ${bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:muted }}>+</div>}
              </div>
            ) : (
              <div>
                <div style={{ fontSize:32, marginBottom:6 }}>🖼</div>
                <div style={{ fontSize:13, fontWeight:600, color:text }}>클릭 또는 드래그</div>
                <div style={{ fontSize:12, color:muted, marginTop:4 }}>JPG, PNG 지원</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e => { handleImages(e.target.files); e.target.value=""; }} />
        </div>

        {[
          { key:"productName", label:"상품명 *",      ph:"예: 프리미엄 한우 1++ 등심 세트",         required:true  },
          { key:"features",    label:"핵심 특징 *",   ph:"예: 1++ 등급, 냉장 당일 배송, 선물 포장", required:true, textarea:true },
          { key:"price",       label:"가격",           ph:"예: 89,000원"  },
          { key:"cta",         label:"CTA 문구",       ph:"예: 지금 주문하기"  },
          { key:"target",      label:"타겟 고객",      ph:"예: 특별한 날 선물을 찾는 3040"  },
          { key:"extra",       label:"추가 정보",      ph:"예: 수상 이력, 언론 보도, 원산지 등", textarea:true },
        ].map(({ key, label, ph, required, textarea }) => (
          <div key={key}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>{label}</div>
            {textarea ? (
              <textarea value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} rows={3} style={{ ...inputStyle, resize:"vertical", lineHeight:1.7 }} />
            ) : (
              <input value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))}
                placeholder={ph} style={inputStyle} />
            )}
          </div>
        ))}

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", fontSize:12, color:"#f87171" }}>{err}</div>}

        <button onClick={generate} disabled={loading}
          style={{ padding:"14px", borderRadius:12, border:"none", cursor: loading?"wait":"pointer",
            background: loading ? `${cat.accent}60` : cat.accent,
            color:"#fff", fontSize:15, fontWeight:900, transition:"all 0.15s" }}>
          {loading ? "✨ AI가 상세페이지를 구성 중이에요..." : `✨ ${cat.label} 상세페이지 생성`}
        </button>
      </div>
    </div>
  );

  // ── Step 3: 결과 + 편집 ─────────────────────────────────────
  if (step === 3 && slides) {
    const slide = slides[curIdx];
    return (
      <div style={{ maxWidth:1060, margin:"0 auto", padding:"20px 20px 60px" }}>
        {/* 상단 바 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setStep(2)} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 수정</button>
            <button onClick={() => { setStep(1); setSlides(null); setImages([]); setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""}); }}
              style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>🔄 새로 만들기</button>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontSize:11, color:muted, marginRight:4 }}>텍스트 클릭 시 편집 가능</span>
            <div style={{ width:1, height:16, background:bdr }} />
            <button onClick={() => setCurIdx(Math.max(0,curIdx-1))} disabled={curIdx===0}
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${bdr}`, background:"rgba(255,255,255,0.06)", color:text, cursor:curIdx===0?"not-allowed":"pointer", opacity:curIdx===0?0.3:1, fontSize:16 }}>‹</button>
            <span style={{ fontSize:12, color:muted, minWidth:42, textAlign:"center" }}>{curIdx+1} / {slides.length}</span>
            <button onClick={() => setCurIdx(Math.min(slides.length-1,curIdx+1))} disabled={curIdx===slides.length-1}
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${bdr}`, background:"rgba(255,255,255,0.06)", color:text, cursor:curIdx===slides.length-1?"not-allowed":"pointer", opacity:curIdx===slides.length-1?0.3:1, fontSize:16 }}>›</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
          {/* 메인 슬라이드 */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:cat.accent, marginBottom:8, letterSpacing:1 }}>
              {SLIDE_TYPES[curIdx]?.label}
            </div>
            {/* 슬라이드 래퍼 - 스케일로 맞춤 */}
            <div style={{ width:"100%", aspectRatio:"1/1", position:"relative", borderRadius:16, overflow:"hidden", boxShadow:"0 12px 48px rgba(0,0,0,0.2)", background:"#fff" }}>
              <div ref={slideRef} style={{ position:"absolute", inset:0, transform:`scale(${640/800})`, transformOrigin:"top left", width:800, height:800 }}>
                <SlideRenderer slide={slide} idx={curIdx} onChange={d => updateSlide(curIdx, d)} cat={cat} imgUrl={bgImg} />
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={dlOne} disabled={dlBusy}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:dlBusy?"wait":"pointer",
                  background:`linear-gradient(135deg,${cat.accent},${cat.sub || cat.accent})`,
                  color:"#fff", fontSize:13, fontWeight:800, opacity:dlBusy?0.6:1 }}>
                {dlBusy ? "저장 중..." : "⬇️ 현재 슬라이드 저장"}
              </button>
            </div>
          </div>

          {/* 섬네일 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
            {slides.map((s, i) => (
              <div key={i} onClick={() => setCurIdx(i)}
                style={{ cursor:"pointer", borderRadius:10, overflow:"hidden", border: i===curIdx ? `3px solid ${cat.accent}` : `3px solid transparent`, transition:"all 0.15s" }}>
                <SlideRenderer slide={s} idx={i} onChange={()=>{}} cat={cat} imgUrl={bgImg} thumb />
                <div style={{ fontSize:9, color: i===curIdx ? cat.accent : muted, textAlign:"center", padding:"4px 0 2px", fontWeight: i===curIdx?800:400, background: isDark?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.9)" }}>
                  {SLIDE_TYPES[i]?.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
