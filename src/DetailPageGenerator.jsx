import { useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 생성기
   카테고리 선택 → 이미지 업로드 + 문구 입력 → AI 슬라이드 생성
══════════════════════════════════════════════════════════════ */

// ── 카테고리 정의 ──────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "food",       label: "식품/음료",     icon: "🍽",
    desc: "맛있는 음식, 음료, 식재료",
    bg: "#1a0a00", text: "#fff8f0", accent: "#f97316", sub: "#fed7aa",
    gradient: "linear-gradient(135deg,#7c2d12,#1a0a00)",
    style: "warm",
  },
  {
    key: "fashion",    label: "패션/의류",     icon: "👗",
    desc: "옷, 신발, 가방, 액세서리",
    bg: "#0f0f0f", text: "#ffffff", accent: "#e2e8f0", sub: "#94a3b8",
    gradient: "linear-gradient(135deg,#1e293b,#0f0f0f)",
    style: "minimal",
  },
  {
    key: "beauty",     label: "뷰티/화장품",   icon: "💄",
    desc: "스킨케어, 메이크업, 향수",
    bg: "#1a0010", text: "#fdf2f8", accent: "#f9a8d4", sub: "#fbcfe8",
    gradient: "linear-gradient(135deg,#831843,#1a0010)",
    style: "luxury",
  },
  {
    key: "tech",       label: "전자/디지털",   icon: "💻",
    desc: "스마트폰, 노트북, 가전",
    bg: "#020617", text: "#e2e8f0", accent: "#38bdf8", sub: "#7dd3fc",
    gradient: "linear-gradient(135deg,#0c1445,#020617)",
    style: "dark",
  },
  {
    key: "interior",   label: "인테리어/가구", icon: "🪑",
    desc: "가구, 조명, 소품, 인테리어",
    bg: "#1c1208", text: "#fef3c7", accent: "#d97706", sub: "#fde68a",
    gradient: "linear-gradient(135deg,#451a03,#1c1208)",
    style: "natural",
  },
  {
    key: "health",     label: "건강/헬스",     icon: "💊",
    desc: "건강식품, 운동용품, 의료기기",
    bg: "#052e16", text: "#f0fdf4", accent: "#4ade80", sub: "#86efac",
    gradient: "linear-gradient(135deg,#14532d,#052e16)",
    style: "fresh",
  },
  {
    key: "pet",        label: "반려동물",       icon: "🐾",
    desc: "사료, 장난감, 용품",
    bg: "#fffbeb", text: "#1c1917", accent: "#f59e0b", sub: "#fbbf24",
    gradient: "linear-gradient(135deg,#fef3c7,#fffbeb)",
    style: "cute",
    light: true,
  },
  {
    key: "service",    label: "서비스/교육",   icon: "📚",
    desc: "강의, 컨설팅, 앱, SaaS",
    bg: "#0f0f1a", text: "#f8fafc", accent: "#818cf8", sub: "#a5b4fc",
    gradient: "linear-gradient(135deg,#1e1b4b,#0f0f1a)",
    style: "professional",
  },
];

// ── 슬라이드 레이아웃 정의 (카테고리별 5장) ──────────────────
const SLIDE_LAYOUTS = [
  { id: "hero",     label: "메인 히어로",    desc: "제품 + 핵심 카피" },
  { id: "feature",  label: "핵심 특징",      desc: "3가지 어필 포인트" },
  { id: "detail",   label: "상세 설명",      desc: "이미지 + 상세 텍스트" },
  { id: "trust",    label: "신뢰/후기",      desc: "수치/보증/고객반응" },
  { id: "cta",      label: "구매 유도",      desc: "가격 + CTA 버튼" },
];

// ── AI 슬라이드 내용 생성 ──────────────────────────────────────
async function generateSlideContent({ category, productName, features, price, cta, target, extra }, onStream) {
  const cat = CATEGORIES.find(c => c.key === category);
  const prompt = `당신은 쇼핑몰 상세페이지 전문 카피라이터입니다.
아래 정보를 바탕으로 ${cat.label} 카테고리의 상세페이지 슬라이드 5장 내용을 생성해주세요.

상품명: ${productName}
카테고리: ${cat.label}
핵심 특징: ${features}
가격: ${price || "미입력"}
CTA 문구: ${cta || "지금 구매하기"}
타겟 고객: ${target || "일반 소비자"}
추가 정보: ${extra || "없음"}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{
  "slides": [
    {
      "id": "hero",
      "headline": "메인 헤드라인 (강렬하고 짧게, 15자 이내)",
      "subheadline": "서브 헤드라인 (20자 이내)",
      "body": "짧은 소개 문구 (40자 이내)",
      "badge": "배지 텍스트 (예: NEW, BEST, 한정)"
    },
    {
      "id": "feature",
      "headline": "특징 섹션 제목 (12자 이내)",
      "features": [
        { "icon": "이모지", "title": "특징1 (8자)", "desc": "설명 (20자)" },
        { "icon": "이모지", "title": "특징2 (8자)", "desc": "설명 (20자)" },
        { "icon": "이모지", "title": "특징3 (8자)", "desc": "설명 (20자)" }
      ]
    },
    {
      "id": "detail",
      "headline": "상세 설명 제목 (15자 이내)",
      "body": "상세 설명 문구 (80자 이내, 줄바꿈 가능)",
      "points": ["포인트1 (20자)", "포인트2 (20자)", "포인트3 (20자)"]
    },
    {
      "id": "trust",
      "headline": "신뢰 포인트 제목 (12자 이내)",
      "stats": [
        { "number": "숫자+단위", "label": "설명" },
        { "number": "숫자+단위", "label": "설명" },
        { "number": "숫자+단위", "label": "설명" }
      ],
      "review": "가상 고객 후기 문구 (40자 이내)"
    },
    {
      "id": "cta",
      "headline": "마지막 어필 문구 (15자 이내)",
      "price": "${price || "가격 문의"}",
      "originalPrice": "정가 (할인이 있으면 원가)",
      "cta": "${cta || "지금 구매하기"}",
      "urgency": "긴박감 문구 (예: 오늘만 특가, 한정 수량)"
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  let full = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (d === "[DONE]") break;
      try {
        const p = JSON.parse(d);
        if (p.type === "content_block_delta" && p.delta?.text) {
          full += p.delta.text;
          if (onStream) onStream(full);
        }
      } catch {}
    }
  }
  try {
    const clean = full.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw new Error("AI 응답 파싱 실패");
  }
}

// ── 슬라이드 Canvas 렌더링 ─────────────────────────────────────
function drawSlide(canvas, slideData, layout, cat, bgImg) {
  const W = 800, H = 800;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 배경
  const grad = ctx.createLinearGradient(0, 0, W, H);
  if (cat.light) {
    grad.addColorStop(0, "#fffbeb"); grad.addColorStop(1, "#fef3c7");
  } else {
    const stops = cat.gradient.match(/#[0-9a-f]{6}/gi) || [cat.bg, "#000"];
    grad.addColorStop(0, stops[0]); grad.addColorStop(1, stops[1] || stops[0]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 배경 이미지 오버레이
  if (bgImg) {
    ctx.globalAlpha = layout.id === "hero" ? 0.35 : 0.15;
    ctx.drawImage(bgImg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // 장식 원
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = cat.accent;
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, W * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.1, H * 0.88, W * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const text = cat.text;
  const accent = cat.accent;
  const sub = cat.sub;

  // 폰트 헬퍼
  const font = (w, s) => `${w} ${s}px 'Apple SD Gothic Neo','Noto Sans KR',sans-serif`;

  if (layout.id === "hero") {
    // 배지
    if (slideData.badge) {
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.roundRect(48, 56, 90, 28, 14); ctx.fill();
      ctx.font = font("800", 12); ctx.fillStyle = cat.light ? "#fff" : "#000"; ctx.textBaseline = "middle";
      ctx.textAlign = "center"; ctx.fillText(slideData.badge, 93, 70);
    }
    // 헤드라인
    ctx.font = font("900", 64); ctx.fillStyle = text; ctx.textAlign = "left"; ctx.textBaseline = "top";
    const headLines = wrapCanvas(ctx, slideData.headline || "", W - 100);
    let y = 120;
    headLines.forEach(l => { ctx.fillText(l, 48, y); y += 76; });
    // 서브헤드
    ctx.font = font("600", 26); ctx.fillStyle = sub; ctx.textBaseline = "top";
    y += 8;
    const subLines = wrapCanvas(ctx, slideData.subheadline || "", W - 100);
    subLines.forEach(l => { ctx.fillText(l, 48, y); y += 36; });
    // 본문
    y += 16;
    ctx.font = font("400", 18); ctx.fillStyle = text; ctx.globalAlpha = 0.7;
    const bodyLines = wrapCanvas(ctx, slideData.body || "", W - 100);
    bodyLines.forEach(l => { ctx.fillText(l, 48, y); y += 28; });
    ctx.globalAlpha = 1;
    // 하단 라인
    ctx.fillStyle = accent; ctx.fillRect(48, H - 80, 60, 4);
    ctx.font = font("700", 14); ctx.fillStyle = sub; ctx.textBaseline = "middle";
    ctx.fillText("SCROLL DOWN ↓", 48, H - 55);

  } else if (layout.id === "feature") {
    ctx.font = font("900", 42); ctx.fillStyle = text; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(slideData.headline || "핵심 특징", 48, 60);
    ctx.fillStyle = accent; ctx.fillRect(48, 118, 50, 4);

    const feats = slideData.features || [];
    feats.forEach((f, i) => {
      const bx = 48 + i * 242, by = 165;
      // 카드
      ctx.fillStyle = `rgba(255,255,255,${cat.light ? 0.6 : 0.06})`;
      ctx.beginPath(); ctx.roundRect(bx, by, 220, 240, 16); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${cat.light ? 0.3 : 0.1})`;
      ctx.lineWidth = 1; ctx.stroke();
      // 이모지
      ctx.font = "52px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.icon || "✦", bx + 110, by + 70);
      // 제목
      ctx.font = font("800", 20); ctx.fillStyle = accent; ctx.textBaseline = "top";
      const tl = wrapCanvas(ctx, f.title || "", 190);
      let ty = by + 110;
      tl.forEach(l => { ctx.fillText(l, bx + 110, ty); ty += 26; });
      // 설명
      ctx.font = font("400", 14); ctx.fillStyle = text; ctx.globalAlpha = 0.7;
      const dl = wrapCanvas(ctx, f.desc || "", 190);
      ty += 6;
      dl.forEach(l => { ctx.fillText(l, bx + 110, ty); ty += 20; });
      ctx.globalAlpha = 1;
    });

    // 하단 번호
    ctx.font = font("700", 13); ctx.fillStyle = sub; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.5;
    ctx.fillText("02 / 05", 48, H - 50);
    ctx.globalAlpha = 1;

  } else if (layout.id === "detail") {
    ctx.font = font("900", 38); ctx.fillStyle = text; ctx.textAlign = "left"; ctx.textBaseline = "top";
    const hl = wrapCanvas(ctx, slideData.headline || "상세 설명", W - 100);
    let y = 56;
    hl.forEach(l => { ctx.fillText(l, 48, y); y += 50; });
    ctx.fillStyle = accent; ctx.fillRect(48, y + 4, 40, 3); y += 28;

    ctx.font = font("400", 17); ctx.fillStyle = text; ctx.globalAlpha = 0.85;
    const bl = wrapCanvas(ctx, slideData.body || "", W - 100);
    bl.forEach(l => { ctx.fillText(l, 48, y); y += 26; });
    ctx.globalAlpha = 1; y += 24;

    const pts = slideData.points || [];
    pts.forEach(p => {
      ctx.fillStyle = accent; ctx.font = "16px serif"; ctx.textBaseline = "middle";
      ctx.fillText("✦", 48, y + 10);
      ctx.font = font("600", 16); ctx.fillStyle = text; ctx.textBaseline = "top";
      ctx.fillText(p, 72, y);
      y += 34;
    });

    // 이미지가 있으면 우측에
    if (bgImg) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(W - 310, 160, 280, 380, 20); ctx.clip();
      ctx.globalAlpha = 0.9; ctx.drawImage(bgImg, W - 310, 160, 280, 380);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    ctx.font = font("700", 13); ctx.fillStyle = sub; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.5; ctx.fillText("03 / 05", 48, H - 50); ctx.globalAlpha = 1;

  } else if (layout.id === "trust") {
    ctx.font = font("900", 38); ctx.fillStyle = text; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(slideData.headline || "믿을 수 있는 이유", 48, 56);
    ctx.fillStyle = accent; ctx.fillRect(48, 108, 40, 3);

    const stats = slideData.stats || [];
    stats.forEach((s, i) => {
      const bx = 48 + i * 240, by = 148;
      ctx.fillStyle = `rgba(255,255,255,${cat.light ? 0.5 : 0.05})`;
      ctx.beginPath(); ctx.roundRect(bx, by, 210, 140, 14); ctx.fill();
      ctx.font = font("900", 36); ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.number || "0", bx + 105, by + 55);
      ctx.font = font("500", 14); ctx.fillStyle = sub;
      ctx.fillText(s.label || "", bx + 105, by + 100);
    });

    // 후기
    ctx.fillStyle = `rgba(255,255,255,${cat.light ? 0.4 : 0.05})`;
    ctx.beginPath(); ctx.roundRect(48, 320, W - 96, 140, 14); ctx.fill();
    ctx.font = font("400", 16); ctx.fillStyle = text; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.globalAlpha = 0.9;
    ctx.fillText('"', 68, 340); ctx.font = font("600", 16);
    const rl = wrapCanvas(ctx, (slideData.review || ""), W - 160);
    let ry = 340;
    rl.forEach(l => { ctx.fillText(l, 90, ry); ry += 24; });
    ctx.globalAlpha = 1;
    ctx.font = font("700", 13); ctx.fillStyle = sub; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.5; ctx.fillText("04 / 05", 48, H - 50); ctx.globalAlpha = 1;

  } else if (layout.id === "cta") {
    // 배경 강조
    ctx.fillStyle = `rgba(${cat.light ? "0,0,0" : "255,255,255"},0.03)`;
    ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 24); ctx.fill();

    ctx.font = font("900", 48); ctx.fillStyle = text; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const hl2 = wrapCanvas(ctx, slideData.headline || "지금 바로 만나보세요", W - 120);
    let y = 100;
    hl2.forEach(l => { ctx.fillText(l, W / 2, y); y += 60; }); y += 10;

    // 가격
    if (slideData.originalPrice && slideData.originalPrice !== slideData.price) {
      ctx.font = font("400", 18); ctx.fillStyle = sub; ctx.globalAlpha = 0.6;
      ctx.fillText(`정가 ${slideData.originalPrice}`, W / 2, y);
      ctx.globalAlpha = 1; y += 30;
    }
    ctx.font = font("900", 52); ctx.fillStyle = accent;
    ctx.fillText(slideData.price || "", W / 2, y); y += 70;

    // 긴박감
    ctx.font = font("700", 16); ctx.fillStyle = sub; ctx.globalAlpha = 0.7;
    ctx.fillText(slideData.urgency || "", W / 2, y); ctx.globalAlpha = 1; y += 50;

    // CTA 버튼
    const btnW = 320, btnH = 64, btnX = (W - btnW) / 2;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.roundRect(btnX, y, btnW, btnH, 32); ctx.fill();
    ctx.font = font("800", 22); ctx.fillStyle = cat.light ? "#fff" : "#000"; ctx.textBaseline = "middle";
    ctx.fillText(slideData.cta || "지금 구매하기", W / 2, y + btnH / 2);

    ctx.font = font("700", 13); ctx.fillStyle = sub; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.5; ctx.fillText("05 / 05", 48, H - 50); ctx.globalAlpha = 1;
  }
}

function wrapCanvas(ctx, text, maxW) {
  if (!text) return [""];
  const lines = [];
  const paras = text.split("\n");
  for (const para of paras) {
    if (!para) { lines.push(""); continue; }
    let cur = "";
    for (const ch of para) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur = test;
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

// ── SlideCanvas 컴포넌트 ──────────────────────────────────────
function SlideCanvas({ slideData, layout, cat, bgImg, width = 400, thumb = false }) {
  const cRef = useRef(null);
  useEffect(() => {
    if (!cRef.current || !slideData) return;
    if (bgImg) {
      const img = new Image();
      img.onload = () => { if (cRef.current) drawSlide(cRef.current, slideData, layout, cat, img); };
      img.src = bgImg;
    } else {
      drawSlide(cRef.current, slideData, layout, cat, null);
    }
  });
  if (!slideData) return null;
  return (
    <div style={{ width, height: width, borderRadius: thumb ? 8 : 16, overflow: "hidden",
      boxShadow: thumb ? "none" : "0 12px 48px rgba(0,0,0,0.6)", flexShrink: 0 }}>
      <canvas ref={cRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark, user }) {
  const [step,        setStep]        = useState(1); // 1:카테고리 2:입력 3:결과
  const [selCat,      setSelCat]      = useState(null);
  const [images,      setImages]      = useState([]); // [{name, dataUrl}]
  const [form,        setForm]        = useState({ productName:"", features:"", price:"", cta:"", target:"", extra:"" });
  const [slides,      setSlides]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState("");
  const [curIdx,      setCurIdx]      = useState(0);
  const [dlSt,        setDlSt]        = useState({ busy:false, msg:"" });
  const fileRef = useRef(null);

  const text    = isDark ? "#fff"                    : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)"  : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)"  : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)"  : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];
  const bgImg   = images[0]?.dataUrl || null;

  // 이미지 업로드
  const handleImages = (files) => {
    const arr = Array.from(files).slice(0, 5);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ name: f.name, dataUrl: e.target.result });
      r.readAsDataURL(f);
    }))).then(setImages);
  };

  // AI 생성
  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true); setSlides(null);

    try {
      const data = await generateSlideContent({ category: selCat, ...form });
      setSlides(data.slides || []);
      setStep(3); setCurIdx(0);
    } catch (e) {
      setErr("생성 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 다운로드 (현재 슬라이드)
  const dlOne = async () => {
    setDlSt({ busy:true, msg:"저장 중..." });
    try {
      const canvas = document.createElement("canvas");
      const slide  = slides[curIdx];
      const layout = SLIDE_LAYOUTS[curIdx];
      await new Promise(res => {
        if (bgImg) {
          const img = new Image();
          img.onload = () => { drawSlide(canvas, slide, layout, cat, img); res(); };
          img.src = bgImg;
        } else { drawSlide(canvas, slide, layout, cat, null); res(); }
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${form.productName || "detail"}_slide${curIdx+1}.png`;
      a.click();
      setDlSt({ busy:false, msg:"✅ 저장 완료!" });
    } catch { setDlSt({ busy:false, msg:"저장 실패" }); }
  };

  // ZIP 전체 다운로드
  const dlZip = async () => {
    setDlSt({ busy:true, msg:"ZIP 생성 중..." });
    try {
      const { default: JSZip } = await import("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").catch(() => ({ default: null }));
      if (!JSZip) { setDlSt({ busy:false, msg:"ZIP 라이브러리 없음" }); return; }
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const canvas = document.createElement("canvas");
        await new Promise(res => {
          if (bgImg) {
            const img = new Image();
            img.onload = () => { drawSlide(canvas, slides[i], SLIDE_LAYOUTS[i], cat, img); res(); };
            img.src = bgImg;
          } else { drawSlide(canvas, slides[i], SLIDE_LAYOUTS[i], cat, null); res(); }
        });
        const b64 = canvas.toDataURL("image/png").split(",")[1];
        const arr = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        zip.file(`slide_${String(i+1).padStart(2,"0")}.png`, arr);
      }
      const blob = await zip.generateAsync({ type:"blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${form.productName || "detail"}_slides.zip`;
      a.click();
      setDlSt({ busy:false, msg:"✅ ZIP 완료!" });
    } catch (e) { setDlSt({ busy:false, msg:"ZIP 실패: "+e.message }); }
  };

  const inputStyle = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    border:`1px solid ${bdr}`, background:inputBg, color:text,
    fontSize:13, outline:"none", boxSizing:"border-box",
  };

  // ── Step 1: 카테고리 선택 ────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:6 }}>🛍 상세페이지 생성기</div>
        <div style={{ fontSize:13, color:muted }}>카테고리를 선택하면 최적화된 디자인으로 슬라이드를 만들어드려요</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setSelCat(c.key); setStep(2); }}
            style={{ padding:"20px 16px", borderRadius:16, border:`2px solid ${bdr}`,
              background: cardBg, cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.07)" : "#f0f0f8"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = cardBg; }}>
            <div style={{ fontSize:32, marginBottom:10 }}>{c.icon}</div>
            <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:4 }}>{c.label}</div>
            <div style={{ fontSize:12, color:muted, lineHeight:1.5 }}>{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: 정보 입력 ─────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"28px 24px 60px" }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button onClick={() => setStep(1)}
          style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`,
            background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
          ← 카테고리
        </button>
        <div>
          <span style={{ fontSize:20 }}>{cat.icon}</span>
          <span style={{ fontSize:16, fontWeight:800, color:text, marginLeft:8 }}>{cat.label} 상세페이지</span>
        </div>
      </div>

      <div style={{ display:"grid", gap:16 }}>
        {/* 이미지 업로드 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:8 }}>
            📸 상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(최대 5장, 첫 번째 이미지가 메인으로 사용)</span>
          </div>
          <div onClick={() => fileRef.current?.click()}
            style={{ border:`2px dashed ${images.length ? cat.accent : bdr}`, borderRadius:14,
              background: images.length ? `${cat.accent}10` : cardBg,
              padding:images.length ? "12px" : "32px", cursor:"pointer",
              transition:"all 0.15s", textAlign: images.length ? "left" : "center" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = cat.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = images.length ? cat.accent : bdr}>
            {images.length ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.dataUrl} alt={img.name}
                      style={{ width:72, height:72, objectFit:"cover", borderRadius:8, display:"block" }} />
                    <div style={{ position:"absolute", top:-6, right:-6, width:18, height:18,
                      borderRadius:"50%", background:"#ef4444", color:"#fff",
                      fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"pointer" }}
                      onClick={e => { e.stopPropagation(); setImages(images.filter((_,j)=>j!==i)); }}>
                      ✕
                    </div>
                  </div>
                ))}
                {images.length < 5 && (
                  <div style={{ width:72, height:72, borderRadius:8, border:`2px dashed ${bdr}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:24, color:muted }}>+</div>
                )}
              </div>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:8 }}>🖼</div>
                <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>클릭 또는 드래그</div>
                <div style={{ fontSize:12, color:muted }}>JPG, PNG 지원</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }}
            onChange={e => { handleImages(e.target.files); e.target.value=""; }} />
        </div>

        {/* 텍스트 입력 */}
        {[
          { key:"productName", label:"상품명 *", placeholder:"예: 제주 한라봉 생과일 착즙 주스", required:true },
          { key:"features",    label:"핵심 특징 *", placeholder:"예: 100% 생과일, 무첨가, 당일 착즙, 냉장 배송", required:true },
          { key:"price",       label:"가격",         placeholder:"예: 29,900원 (3병 세트)" },
          { key:"cta",         label:"CTA 버튼 문구", placeholder:"예: 지금 주문하기 / 무료배송으로 받기" },
          { key:"target",      label:"타겟 고객",     placeholder:"예: 건강을 챙기는 30-40대 직장인" },
          { key:"extra",       label:"추가 정보",     placeholder:"예: 수상 이력, 언론 소개, 특이 성분 등" },
        ].map(({ key, label, placeholder, required }) => (
          <div key={key}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>{label}</div>
            {key === "features" || key === "extra" ? (
              <textarea value={form[key]} onChange={e => setForm(p => ({...p, [key]:e.target.value}))}
                placeholder={placeholder} rows={3}
                style={{ ...inputStyle, resize:"vertical", fontFamily:"inherit", lineHeight:1.6 }} />
            ) : (
              <input value={form[key]} onChange={e => setForm(p => ({...p, [key]:e.target.value}))}
                placeholder={placeholder} style={inputStyle} />
            )}
          </div>
        ))}

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", fontSize:12, color:"#f87171" }}>{err}</div>}

        <button onClick={generate} disabled={loading}
          style={{ padding:"14px", borderRadius:12, border:"none", cursor: loading ? "wait" : "pointer",
            background: loading ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg,${cat.accent},${cat.sub})`,
            color: cat.light ? "#1a1a2e" : "#fff", fontSize:15, fontWeight:900,
            opacity: loading ? 0.7 : 1 }}>
          {loading ? "🤖 AI가 상세페이지를 만들고 있어요..." : `✨ ${cat.label} 상세페이지 생성`}
        </button>
      </div>
    </div>
  );

  // ── Step 3: 결과 ─────────────────────────────────────────────
  if (step === 3 && slides) {
    const slide  = slides[curIdx];
    const layout = SLIDE_LAYOUTS[curIdx];
    return (
      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px 60px" }}>
        {/* 상단 바 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setStep(2)}
              style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`,
                background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
              ← 수정
            </button>
            <button onClick={() => { setStep(1); setSlides(null); setImages([]); setForm({productName:"",features:"",price:"",cta:"",target:"",extra:""}); }}
              style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`,
                background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
              🔄 새로 만들기
            </button>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={() => setCurIdx(Math.max(0, curIdx-1))} disabled={curIdx===0}
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${bdr}`,
                background:"rgba(255,255,255,0.06)", color:"#fff", cursor: curIdx===0?"not-allowed":"pointer",
                opacity:curIdx===0?0.3:1, fontSize:16 }}>‹</button>
            <span style={{ fontSize:12, color:muted, minWidth:40, textAlign:"center" }}>{curIdx+1} / {slides.length}</span>
            <button onClick={() => setCurIdx(Math.min(slides.length-1, curIdx+1))} disabled={curIdx===slides.length-1}
              style={{ width:30, height:30, borderRadius:7, border:`1px solid ${bdr}`,
                background:"rgba(255,255,255,0.06)", color:"#fff", cursor: curIdx===slides.length-1?"not-allowed":"pointer",
                opacity:curIdx===slides.length-1?0.3:1, fontSize:16 }}>›</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:20, alignItems:"start" }}>
          {/* 메인 미리보기 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted }}>
              {layout.label} — {layout.desc}
            </div>
            <SlideCanvas slideData={slide} layout={layout} cat={cat} bgImg={bgImg} width={520} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={dlOne} disabled={dlSt.busy}
                style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor: dlSt.busy?"not-allowed":"pointer",
                  background:`linear-gradient(135deg,${cat.accent},${cat.sub})`,
                  color: cat.light?"#1a1a2e":"#fff", fontSize:13, fontWeight:800, opacity:dlSt.busy?0.5:1 }}>
                현재 저장
              </button>
              <button onClick={dlZip} disabled={dlSt.busy}
                style={{ padding:"9px 20px", borderRadius:9, border:`1px solid ${bdr}`,
                  background:"rgba(255,255,255,0.06)", color:muted, fontSize:13, fontWeight:700,
                  cursor:dlSt.busy?"not-allowed":"pointer", opacity:dlSt.busy?0.5:1 }}>
                ZIP 전체
              </button>
            </div>
            {dlSt.msg && <div style={{ fontSize:11, color: dlSt.msg.startsWith("✅")?"#4ade80":"#f87171" }}>{dlSt.msg}</div>}
          </div>

          {/* 섬네일 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {slides.map((s, i) => (
              <div key={i} onClick={() => setCurIdx(i)}
                style={{ cursor:"pointer", borderRadius:10, overflow:"hidden",
                  border: i===curIdx ? `2px solid ${cat.accent}` : `2px solid transparent`,
                  transition:"all 0.15s" }}>
                <SlideCanvas slideData={s} layout={SLIDE_LAYOUTS[i]} cat={cat} bgImg={bgImg} width={100} thumb />
                <div style={{ fontSize:10, color: i===curIdx ? cat.accent : muted, textAlign:"center",
                  padding:"4px 0", fontWeight: i===curIdx?700:400 }}>
                  {SLIDE_LAYOUTS[i].label}
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
