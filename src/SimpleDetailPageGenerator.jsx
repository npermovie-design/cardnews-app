import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, upsertLibraryItem } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { KlipyButton } from "./KlipyPicker";
import ShareButton from "./ShareButton";
import { lazy, Suspense } from "react";
const UnifiedCanvasEditor = lazy(() => import("./UnifiedCanvasEditor"));
import { useI18n } from "./i18n.jsx";

/* ══════════════════════════════════════════════════════════════
   SimpleDetailPageGenerator.jsx
   ✅ Step1: 상품 입력 (이미지 상세페이지 동일 UX)
   ✅ Step2: 슬라이드 기획
   ✅ Step3: 디자인 선택 + 사이즈 선택
   ✅ Step4: 텍스트 편집 (이미지 생성 X, 글 수정 방식)
══════════════════════════════════════════════════════════════ */

import { callAI } from "./aiClient";

// ── 카테고리 ─────────────────────────────────────────────────
const getCategories = (ko) => [
  { key:"food",      label:ko?"식품/음료":"Food/Beverage",         accent:"#c0392b" },
  { key:"fashion",   label:ko?"패션/의류":"Fashion",               accent:"#1a1a1a" },
  { key:"beauty",    label:ko?"뷰티/화장품":"Beauty",              accent:"#9b5a7a" },
  { key:"tech",      label:ko?"전자/디지털":"Tech/Digital",        accent:"#1a56db" },
  { key:"interior",  label:ko?"인테리어/가구":"Interior/Furniture",accent:"#7c5c3a" },
  { key:"health",    label:ko?"건강/헬스":"Health/Fitness",        accent:"#2e7d32" },
  { key:"pet",       label:ko?"반려동물":"Pets",                   accent:"#d4820a" },
  { key:"service",   label:ko?"서비스/교육":"Service/Education",   accent:"#5e35b1" },
];

// ── 슬라이드 타입 ────────────────────────────────────────────
const getSlideTypes = (ko) => [
  { id:"hero",      label:ko?"메인 히어로":"Hero"           },
  { id:"intro",     label:ko?"브랜드 소개":"Brand Intro"    },
  { id:"feature",   label:ko?"핵심 특징":"Key Features"     },
  { id:"detail1",   label:ko?"상세 설명 1":"Detail 1"       },
  { id:"detail2",   label:ko?"상세 설명 2":"Detail 2"       },
  { id:"howto",     label:ko?"사용 방법":"How to Use"       },
  { id:"review",    label:ko?"고객 후기":"Reviews"          },
  { id:"trust",     label:ko?"신뢰 지표":"Trust Signals"    },
  { id:"faq",       label:ko?"자주 묻는 질문":"FAQ"         },
  { id:"gallery",   label:ko?"상품 갤러리":"Gallery"        },
  { id:"delivery",  label:ko?"배송 안내":"Shipping Info"    },
  { id:"event",     label:ko?"이벤트/혜택":"Events/Deals"   },
  { id:"story",     label:ko?"브랜드 스토리":"Brand Story"  },
  { id:"warning",   label:ko?"주의사항":"Precautions"       },
  { id:"cta",       label:ko?"구매 유도":"Call to Action"   },
];

// ── 사이즈 프리셋 ────────────────────────────────────────────
const getSizePresets = (ko) => [
  { label:ko?"세로형":"Vertical",      w:860,  h:1100, icon:"3:4",  desc:ko?"쇼핑몰 상세 세로형":"Shop detail vertical" },
  { label:ko?"정사각형":"Square",      w:1000, h:1000, icon:"1:1",  desc:ko?"SNS / 인스타그램":"SNS / Instagram" },
  { label:ko?"가로형":"Horizontal",    w:1200, h:628,  icon:"16:9", desc:ko?"배너 / 블로그":"Banner / Blog" },
  { label:ko?"세로 9:16":"9:16 Vertical", w:1080, h:1920, icon:"9:16", desc:ko?"쇼츠 / 릴스":"Shorts / Reels" },
  { label:ko?"직접 입력":"Custom",     w:null, h:null, icon:"W×H",  desc:ko?"직접 설정":"Custom size" },
];

// ── 디자인 프리셋 (CardNewsApp 스타일) ───────────────────────
const DESIGN_PRESETS = [
  { key:"bold_dark",  label:"볼드 다크",  bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:34, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"minimal",    label:"미니멀",     bgColor:"#f8fafc", textColor:"#1e1b4b", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"left",   textValign:"bottom", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"neon",       label:"네온",       bgColor:"#0f172a", textColor:"#a5b4fc", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"warm_cream", label:"크림 웜",    bgColor:"#fefce8", textColor:"#7c2d12", titleSize:30, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"none",      lineHeightTitle:1.4,  lineHeightBody:1.8 },
  { key:"forest",     label:"포레스트",   bgColor:"#052e16", textColor:"#dcfce7", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"ocean",      label:"오션",       bgColor:"#0c1445", textColor:"#bae6fd", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  // 추가 프리셋
  { key:"magazine",   label:"매거진",     bgColor:"#111111", textColor:"#ffffff", titleSize:38, bodySize:14, subtitleSize:11, highlightSize:14, titleWeight:"900", textAlign:"left",   textValign:"bottom", hlMode:"none",      lineHeightTitle:1.2,  lineHeightBody:1.6 },
  { key:"pastel",     label:"파스텔",     bgColor:"#fef3c7", textColor:"#1f2937", titleSize:30, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
  { key:"gradient_pk",label:"핑크",       bgColor:"#831843", textColor:"#fce7f3", titleSize:34, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"900", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"pure_white", label:"퓨어 화이트",bgColor:"#ffffff", textColor:"#111827", titleSize:32, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"slate",      label:"슬레이트",   bgColor:"#1e293b", textColor:"#e2e8f0", titleSize:32, bodySize:14, subtitleSize:11, highlightSize:14, titleWeight:"700", textAlign:"left",   textValign:"middle", hlMode:"underline", lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"charcoal",   label:"차콜",       bgColor:"#18181b", textColor:"#fafafa", titleSize:36, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.2,  lineHeightBody:1.6 },
];

// ── Canvas 유틸 ──────────────────────────────────────────────
function getCanvasFont(weight, size, family) {
  var safeFamily = family && family !== "sans-serif" ? ("'" + family + "', ") : "";
  return weight + " " + size + "px " + safeFamily + "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
}
function wrapText(ctx, text, maxW) {
  if (!text) return [""];
  const lines = []; const paras = text.split("\n");
  for (const para of paras) {
    if (!para) { lines.push(""); continue; }
    const words = para.split(" "); let cur = "";
    for (const word of words) {
      const test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
      else { cur = test; }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

function drawDetailSlide(canvas, slide, style, CW, CH) {
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CW, CH);

  // 배경
  ctx.fillStyle = style.bgColor || "#1c1c1e";
  ctx.fillRect(0, 0, CW, CH);

  // 장식 원
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = style.textColor || "#fff";
  ctx.beginPath(); ctx.arc(CW * 0.88, CH * 0.06, CW * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CW * 0.08, CH * 0.94, CW * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const tc = style.textColor || "#ffffff";
  const al = style.textAlign || "left";
  const va = style.textValign || "middle";
  const ff = style.fontFamily || "sans-serif";
  const oxRaw = style.textOffsetX || 0;
  const oyRaw = style.textOffsetY || 0;
  const SC = CW / 420;
  const ox = Math.round(oxRaw * SC);
  const oy = Math.round(oyRaw * SC);
  const PAD = Math.round(CW * 0.09);
  const maxW = CW - PAD * 2;

  const tSz = Math.round((style.titleSize || 32) * SC);
  const bSz = Math.round((style.bodySize || 15) * SC);
  const sSz = Math.round((style.subtitleSize || 12) * SC);
  const hSz = Math.round((style.highlightSize || 15) * SC);
  const lhT = style.lineHeightTitle || 1.35;
  const lhB = style.lineHeightBody || 1.7;
  const tw = style.titleWeight || "800";

  ctx.font = getCanvasFont(tw, tSz, ff);
  const titLines = wrapText(ctx, slide.title || slide.headline || "", maxW);
  ctx.font = getCanvasFont("600", sSz, ff);
  const subLines = slide.subtitle || slide.subheadline ? wrapText(ctx, slide.subtitle || slide.subheadline, maxW) : [];
  ctx.font = getCanvasFont("400", bSz, ff);
  const bodLines = slide.body ? wrapText(ctx, slide.body, maxW) : [];
  ctx.font = getCanvasFont("700", hSz, ff);
  const hlLines = slide.highlight || slide.badge ? wrapText(ctx, slide.highlight || slide.badge, maxW) : [];

  const GAP_SUB = Math.round(sSz * 0.5);
  const GAP_TIT = Math.round(tSz * 0.6);
  const GAP_BOD = Math.round(bSz * 0.6);

  let totalH = 0;
  if (subLines.length) totalH += subLines.length * Math.round(sSz * lhB) + GAP_SUB;
  totalH += titLines.length * Math.round(tSz * lhT);
  if (bodLines.length) totalH += GAP_TIT + bodLines.length * Math.round(bSz * lhB);
  if (hlLines.length)  totalH += GAP_BOD + hlLines.length * Math.round(hSz * 1.55);

  const minY = PAD + Math.round(sSz * 1.5);
  let startY = va === "top" ? minY : va === "bottom" ? CH - PAD - totalH : Math.round((CH - totalH) / 2);
  let y = Math.max(minY, startY) + oy;

  function getX(lineW) {
    if (al === "center") return Math.round((CW - lineW) / 2) + ox;
    if (al === "right")  return CW - PAD - lineW + ox;
    return PAD + ox;
  }
  function drawLines(ls, fnt, color, alpha, lineH) {
    ctx.font = fnt; ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.textBaseline = "top";
    for (const l of ls) { const lw = ctx.measureText(l).width; ctx.fillText(l, getX(lw), y); y += lineH; }
    ctx.globalAlpha = 1;
  }

  if (subLines.length) { drawLines(subLines, getCanvasFont("600", sSz, ff), tc, 0.6, Math.round(sSz * lhB)); y += GAP_SUB; }
  drawLines(titLines, getCanvasFont(tw, tSz, ff), tc, 1, Math.round(tSz * lhT));

  if (bodLines.length) {
    y += GAP_TIT;
    drawLines(bodLines, getCanvasFont("400", bSz, ff), tc, 0.85, Math.round(bSz * lhB));
  }
  if (hlLines.length) {
    y += GAP_BOD;
    const hlFont = getCanvasFont("700", hSz, ff);
    ctx.font = hlFont;
    let mxW = 0;
    for (const l of hlLines) { const lw = ctx.measureText(l).width; if (lw > mxW) mxW = lw; }
    const pad2 = Math.round(hSz * 1.2);
    const blockH = hlLines.length * Math.round(hSz * 1.55) + Math.round(hSz * 0.5);
    const boxX = getX(mxW + pad2 * 2) - Math.round(hSz * 0.1);
    const hlMode = style.hlMode || "pill";
    if (hlMode === "pill") {
      ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = tc;
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, Math.round(hSz * 0.7));
      ctx.fill(); ctx.restore();
    } else if (hlMode === "box") {
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.003);
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, 6);
      ctx.stroke(); ctx.restore();
    } else if (hlMode === "underline") {
      const ulX = getX(mxW);
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.004);
      ctx.beginPath(); ctx.moveTo(ulX, y + Math.round(hSz * 1.2)); ctx.lineTo(ulX + mxW, y + Math.round(hSz * 1.2));
      ctx.stroke(); ctx.restore();
    }
    drawLines(hlLines, hlFont, tc, 1, Math.round(hSz * 1.55));
  }
}

// ── SlideCanvas 컴포넌트 ─────────────────────────────────────
function SlideCanvas({ slide, style, CW, CH, displayW }) {
  const cRef = useRef(null);
  const displayH = Math.round(displayW * CH / CW);
  useEffect(() => {
    if (!cRef.current || !slide) return;
    drawDetailSlide(cRef.current, slide, style, CW, CH);
  });
  if (!slide) return null;
  return (
    <canvas ref={cRef} style={{ width:displayW, height:displayH, display:"block", borderRadius:8 }}/>
  );
}

// ── API 호출 ─────────────────────────────────────────────────
async function generateSlideTexts({ category, productName, features, price, cta, target, extra, pageCount, sourceContent }) {
  const allCats = getCategories(true);
  const cat = allCats.find(c => c.key === category) || allCats[0];
  const types = getSlideTypes(true).slice(0, pageCount);
  const srcCtx = sourceContent ? `\n\n[참고할 원본 내용 - 이 내용을 기반으로 슬라이드를 구성하세요]\n${sourceContent.slice(0, 600)}` : "";
  const prompt = `한국 프리미엄 쇼핑몰 상세페이지 카피라이터입니다.
상품명: ${productName} / 카테고리: ${cat.label}
특징: ${features} / 가격: ${price || "미정"} / CTA: ${cta || "지금 구매하기"} / 타겟: ${target || "일반"} / 추가정보: ${extra || "없음"}${srcCtx}

슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
headline(14자 이내), subheadline(20자, 선택), body(50자, 선택), badge(8자, 선택)

JSON만 응답:
{"slides":[${types.map(t=>`{"id":"${t.id}","label":"${t.label}","headline":"","subheadline":"","body":"","badge":""}`).join(",")}]}`;

  const txt = await callAI("claude-sonnet-4-5", [{role:"user",content:prompt}], 3000);
  const cleaned = txt.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(cleaned); } catch {
    // JSON 불완전할 경우 slides 키 추출 시도
    const m = cleaned.match(/"slides"\s*:\s*(\[.*)/s);
    if (m) { try { return { slides: JSON.parse(m[1].replace(/}\s*,?\s*$/, '}]').split('}]')[0] + '}]') }; } catch {} }
    return { slides: [] };
  }
}

async function suggestSlideText(form, cat, sc, sourceContent) {
  const srcCtx = sourceContent ? `\n참고 내용: ${sourceContent.slice(0,400)}` : "";
  const txt = await callAI("claude-sonnet-4-5", [{role:"user", content:`상품: ${form.productName} (${cat.label}) / 특징: ${form.features} / 가격: ${form.price||"미정"}\n슬라이드: ${sc.label}(${sc.id})${srcCtx}\nJSON만:\n{"headline":"헤드라인(14자)","subheadline":"서브(22자,없으면빈문자)","body":"본문(50자,없으면빈문자)","badge":"배지(8자,없으면빈문자)"}`}], 300);
  return JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
}

async function getAiSuggestions(catLabel, form) {
  const txt = await callAI("claude-sonnet-4-5", [{role:"user", content:`카테고리:${catLabel} 상품:"${form.productName}" 특징:"${form.features}"\nJSON만:\n{"productNames":["추천1","추천2","추천3"],"ctas":["CTA1","CTA2","CTA3"],"targets":["타겟1","타겟2"],"extras":["추가1","추가2"]}`}], 500);
  return JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function SimpleDetailPageGenerator({ isDark, user, theme, onUserUpdate, showPointConfirm, imageMode }) {
  const { lang } = useI18n();
  const ko = lang === "ko";
  const CATEGORIES = getCategories(ko);
  const SLIDE_TYPES = getSlideTypes(ko);
  const SIZE_PRESETS = getSizePresets(ko);

  const [wizStep, setWizStep] = useState(1);
  const autoDownloadRef = useRef(false);

  // imageMode: 자동 ZIP 다운로드
  useEffect(() => {
    if (autoDownloadRef.current && wizStep === 4) {
      autoDownloadRef.current = false;
      setTimeout(() => { saveAll(); }, 500);
    }
  });

  // URL 불러오기
  const [urlInput,   setUrlInput]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult,  setUrlResult]  = useState(null);
  const [autoSuggest, setAutoSuggest] = useState(false);

  // Step1
  const [selCat,    setSelCat]    = useState(null);
  const [form,      setForm]      = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [pageCount, setPageCount] = useState(5);
  const [aiSugg,    setAiSugg]    = useState(null);
  const [suggesting,setSuggesting]= useState(false);

  // Step2
  const [slideContents, setSlideContents] = useState([]);
  const [planLoading,   setPlanLoading]   = useState(false);

  // Step3
  const [selPreset, setSelPreset] = useState(null);
  const [selSize,   setSelSize]   = useState(0);
  const [customW,   setCustomW]   = useState(860);
  const [customH,   setCustomH]   = useState(1100);

  // Step4
  const [slides,    setSlides]    = useState([]);
  const [sted,      setSted]      = useState({}); // per-slide overrides
  const [selIdx,    setSelIdx]    = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [dlSt,      setDlSt]      = useState({ busy:false, msg:"" });
  useGeneratingGuard(loading, 10, "card_news");

  // 테마
  const D = isDark || theme === "dark";
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.55)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const accentColor = selCat ? (CATEGORIES.find(c=>c.key===selCat)?.accent||"#7c6aff") : "#7c6aff";
  const cat = CATEGORIES.find(c=>c.key===selCat) || CATEGORIES[0];
  const catKo = getCategories(true).find(c=>c.key===selCat) || getCategories(true)[0];

  const preset = SIZE_PRESETS[selSize] || SIZE_PRESETS[0];
  const imgW = preset.w != null ? preset.w : (parseInt(customW)||860);
  const imgH = preset.h != null ? preset.h : (parseInt(customH)||1100);
  const imgRatio = imgW / imgH;
  const activeStyle = selPreset || DESIGN_PRESETS[0];

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:D?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // WizHeader
  const WizHeader = () => (
    <div style={{ padding:"12px 24px 0", maxWidth:960, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:16 }}>
        {[["1",ko?"상품 입력":"Product Info"],["2",ko?"슬라이드 기획":"Plan Slides"],["3",ko?"디자인 선택":"Design"],["4",ko?"편집":"Edit"]].map(([n,label],i)=>{
          const step=parseInt(n); const done=wizStep>step; const active=wizStep===step;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", flex:i<3?1:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor:done?"pointer":"default" }}
                onClick={()=>{ if(done&&step<wizStep) setWizStep(step); }}>
                <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:900, flexShrink:0,
                  background:done||active?"#7c6aff":(D?"rgba(255,255,255,0.1)":"#e5e5e5"),
                  color:done||active?"#fff":(D?"rgba(255,255,255,0.3)":"#bbb") }}>
                  {done?"✓":n}
                </div>
                <span style={{ fontSize:13, fontWeight:active?800:500, color:active?text:muted, whiteSpace:"nowrap" }}>{label}</span>
              </div>
              {i<3&&<div style={{ flex:1, height:2, background:done?"#7c6aff":(D?"rgba(255,255,255,0.1)":"#e5e5e5"), margin:"0 12px", minWidth:16 }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // URL에서 콘텐츠 불러오기
  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true); setUrlResult(null);
    try {
      const r = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await r.json();
      if (data.error) { setForm(p=>({...p, productName: (ko?"[URL 오류] ":"[URL Error] ") + data.error})); setUrlLoading(false); return; }
      setUrlResult(data);
      if (data.title) setForm(p=>({...p, productName: data.title.slice(0,60)}));
      const desc = [data.description, data.content].filter(Boolean).join(" ").slice(0, 200);
      if (desc) setForm(p=>({...p, features: desc}));
    } catch(e) { setForm(p=>({...p, productName: (ko?"[URL 실패] ":"[URL Failed] ") + e.message})); }
    setUrlLoading(false);
  };

  // AI 추천
  const getSugg = async () => {
    if (!selCat||!form.productName) return;
    setSuggesting(true); setAiSugg(null);
    try { setAiSugg(await getAiSuggestions(catKo.label, form)); } catch{}
    setSuggesting(false);
  };

  // 슬라이드 개별 AI 추천
  const suggestOne = async (idx) => {
    const sc = slideContents[idx]; if(!sc) return;
    setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,aiLoading:true}:s));
    const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,500) : null;
    try {
      const parsed = await suggestSlideText(form, catKo, sc, srcContent);
      setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,...parsed,aiLoading:false}:s));
    } catch { setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,aiLoading:false}:s)); }
  };

  const suggestAll = async () => {
    setPlanLoading(true);
    for(let i=0;i<slideContents.length;i++){ await suggestOne(i); await new Promise(r=>setTimeout(r,200)); }
    setPlanLoading(false);
  };

  // Step3→Step4: 슬라이드 텍스트 생성 후 편집 모드로
  const generate = async () => {
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(1))) return;
    if (!user) incrementGuestUsage();
    setLoading(true);
    try {
      const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,700) : undefined;
      let slidesData;
      if (slideContents.length > 0 && slideContents.some(s=>s.headline)) {
        slidesData = slideContents.map(sc=>({
          id:sc.id, label:sc.label,
          title: sc.headline||"",
          subtitle: sc.subheadline||"",
          body: sc.body||"",
          highlight: sc.badge||"",
          headline: sc.headline||"",
          subheadline: sc.subheadline||"",
          badge: sc.badge||"",
        }));
        const empty = slidesData.filter(s=>!s.title);
        if (empty.length>0) {
          const fill = await generateSlideTexts({category:selCat,...form,pageCount,sourceContent:srcContent});
          fill.slides?.forEach(fs=>{
            const idx=slidesData.findIndex(s=>s.id===fs.id&&!s.title);
            if(idx>=0) slidesData[idx]={...slidesData[idx],title:fs.headline,subtitle:fs.subheadline,body:fs.body,highlight:fs.badge,headline:fs.headline};
          });
        }
      } else {
        const textData = await generateSlideTexts({category:selCat,...form,pageCount,sourceContent:srcContent});
        slidesData = (textData.slides||[]).map(s=>({
          ...s, title:s.headline, subtitle:s.subheadline, highlight:s.badge
        }));
      }
      setSlides(slidesData); setSted({}); setSelIdx(0); setWizStep(4);
      if (imageMode && slidesData.length > 0) {
        setTimeout(() => { autoDownloadRef.current = true; }, 300);
      }
      if (user?.uid) changePoints(user.uid, -1, "심플 상세페이지 생성").then(newPts => { if (onUserUpdate) onUserUpdate({...user, points: newPts}); }).catch(()=>{});
      // 프리셋 저장
      try {
        const KEY = "nper_simpledetail_saves_v1";
        const list = JSON.parse(localStorage.getItem(KEY) || "[]");
        const now = new Date();
        const ds = now.getFullYear() + "." + String(now.getMonth()+1).padStart(2,"0") + "." + String(now.getDate()).padStart(2,"0");
        const savedItem = { id:"sd_"+Date.now(), topic:form.productName, title:form.productName, count:slidesData.length, date:ds, slides:slidesData, category:selCat?.key };
        list.unshift(savedItem);
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
        if (user?.uid) upsertLibraryItem(user.uid, "simpledetail", savedItem);
      } catch {}
    } catch(e) { setSlides([]); setWizStep(3); alert(ko ? "생성에 실패했습니다: " + (e.message || "다시 시도해주세요.") : "Generation failed: " + (e.message || "Please try again.")); console.error("생성 실패:", e.message); }
    setLoading(false);
  };

  // Step4 편집 헬퍼
  const getCurSlide = (idx) => {
    const base = slides[idx]||{};
    const ed = sted[idx]||{};
    return { ...base, ...ed };
  };
  const getSlideStyle = (idx) => {
    const so = sted[idx]||{};
    return { ...activeStyle, ...(so.bgColor?{bgColor:so.bgColor}:{}), ...(so.textColor?{textColor:so.textColor}:{}), ...(so.titleSize?{titleSize:so.titleSize}:{}), ...(so.bodySize?{bodySize:so.bodySize}:{}), ...(so.textAlign?{textAlign:so.textAlign}:{}), ...(so.textValign?{textValign:so.textValign}:{}), ...(so.fontFamily?{fontFamily:so.fontFamily}:{}), ...(so.textOffsetX!==undefined?{textOffsetX:so.textOffsetX}:{}), ...(so.textOffsetY!==undefined?{textOffsetY:so.textOffsetY}:{}) };
  };
  const updSted = (idx, key, val) => setSted(prev=>({...prev,[idx]:{...(prev[idx]||{}), [key]:val}}));

  // PNG 저장 (단일)
  const saveOne = (idx) => {
    const slide = getCurSlide(idx);
    const slideStyle = getSlideStyle(idx);
    const canvas = document.createElement("canvas");
    drawDetailSlide(canvas, slide, slideStyle, imgW, imgH);
    const a=document.createElement("a");
    a.href=canvas.toDataURL("image/png");
    a.download=`${form.productName||"slide"}_${String(idx+1).padStart(2,"0")}_${slide.label||"slide"}.png`;
    a.click();
  };

  // 전체 ZIP
  const saveAll = async () => {
    if(!slides.length) return;
    setDlSt({busy:true,msg:ko?"ZIP 생성 중...":"Creating ZIP..."});
    if(!window.JSZip) await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    const zip=new window.JSZip();
    for(let i=0;i<slides.length;i++){
      const slide=getCurSlide(i);
      const slideStyle=getSlideStyle(i);
      const canvas=document.createElement("canvas");
      drawDetailSlide(canvas,slide,slideStyle,imgW,imgH);
      const b64=canvas.toDataURL("image/png").split(",")[1];
      const arr=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      zip.file(`${String(i+1).padStart(2,"0")}_${slide.label||"slide"}.png`,arr);
    }
    const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${form.productName||"detail"}_slides.zip`;a.click();
    setDlSt({busy:false,msg:ko?"✅ 저장 완료!":"✅ Saved!"});
    setTimeout(()=>setDlSt({busy:false,msg:""}),2500);
  };

  const resetAll = () => { setWizStep(1); setSelCat(null); setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""}); setPageCount(5); setAiSugg(null); setSlideContents([]); setSelPreset(null); setSelSize(0); setSlides([]); setSted({}); };

  useEffect(() => {
    if (autoSuggest && wizStep === 2 && slideContents.length > 0) {
      setAutoSuggest(false);
      suggestAll();
    }
  }, [autoSuggest, wizStep, slideContents.length]);

  // ═══ STEP 1 ═══════════════════════════════════════════════
  if (wizStep === 1) {
    const canNext = selCat && form.productName.trim() && form.features.trim();
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader/>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 40px" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"상품 정보를 입력하세요":"Enter product information"}</div>
            <div style={{ fontSize:13, color:muted }}>{ko?"입력한 내용을 바탕으로 AI가 상세페이지 슬라이드를 구성해요":"AI will create detail page slides based on your input"}</div>
          </div>

          {/* URL 불러오기 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>{ko?"🔗 URL로 내용 불러오기":"🔗 Import from URL"}</div>
            <div style={{ fontSize:11, color:muted, marginBottom:10 }}>{ko?"상품 페이지, 뉴스 기사, 유튜브 링크를 붙여넣으면 상품명·특징을 자동으로 채워줘요":"Paste a product page, news article, or YouTube link to auto-fill product name and features"}</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") fetchFromUrl(); }}
                placeholder={ko?"https://... 상품 페이지 / 뉴스 / 유튜브 URL":"https://... product page / news / YouTube URL"}
                style={{ flex:1, padding:"9px 13px", borderRadius:9, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:12, fontFamily:"inherit", outline:"none" }}/>
              <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                style={{ padding:"9px 18px", borderRadius:9, border:"none", cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:urlLoading||!urlInput.trim()?0.5:1, flexShrink:0, whiteSpace:"nowrap" }}>
                {urlLoading?(ko?"불러오는 중...":"Loading..."):(ko?"불러오기":"Import")}
              </button>
            </div>
            {urlResult && (
              <div style={{ marginTop:10, padding:"10px 13px", borderRadius:8, background:D?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)", border:"1px solid rgba(99,102,241,0.2)", display:"flex", gap:10, alignItems:"flex-start" }}>
                {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:56, height:40, objectFit:"cover", borderRadius:5, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{urlResult.title}</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>{urlResult.type==="youtube"?(ko?"유튜브":"YouTube"):urlResult.type==="news"?(ko?"뉴스 기사":"News"):(ko?"웹페이지":"Webpage")} · {ko?"상품명·특징에 자동 입력됐어요":"Auto-filled product name and features"}</div>
                </div>
              </div>
            )}
          </div>

          {/* 카테고리 */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:10 }}>{ko?"카테고리 *":"Category *"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
              {CATEGORIES.map(c=>(
                <button key={c.key} onClick={()=>setSelCat(c.key)}
                  style={{ padding:"12px 10px", borderRadius:10, border:`1.5px solid ${selCat===c.key?c.accent:bdr}`, background:selCat===c.key?`${c.accent}15`:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.12s" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:selCat===c.key?c.accent:text, letterSpacing:1 }}>{c.label.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 슬라이드 수 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"슬라이드 수":"Slide count"}</div>
              <div style={{ fontSize:22, fontWeight:900, color:accentColor }}>{pageCount}{ko?"장":""}</div>
            </div>
            <input type="range" min={3} max={15} value={pageCount} onChange={e=>setPageCount(Number(e.target.value))} style={{ width:"100%", accentColor }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:4 }}><span>{ko?"3장":"3"}</span><span>{ko?"15장":"15"}</span></div>
            <div style={{ fontSize:11, color:muted, marginTop:6, lineHeight:1.6 }}>{SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}</div>
          </div>

          {/* 텍스트 입력 */}
          {[
            { key:"productName", label:ko?"상품명 *":"Product Name *",    ph:ko?"예: 프리미엄 한우 1++ 등심 선물 세트":"e.g. Premium Gift Set" },
            { key:"features",    label:ko?"핵심 특징 *":"Key Features *", ph:ko?"예: 1++ 등급, 냉장 당일 배송, 고급 포장":"e.g. Top grade, same-day delivery, premium packaging", ta:true },
            { key:"price",       label:ko?"가격":"Price",                 ph:ko?"예: 89,000원 (2인 세트)":"e.g. $89 (set for 2)" },
            { key:"cta",         label:ko?"CTA 문구":"CTA Text",          ph:ko?"예: 지금 주문하기":"e.g. Order Now" },
            { key:"target",      label:ko?"타겟 고객":"Target Audience",   ph:ko?"예: 레스토랑 퀄리티를 집에서 즐기고 싶은 3040":"e.g. 30-40s wanting restaurant quality at home" },
            { key:"extra",       label:ko?"추가 정보":"Additional Info",   ph:ko?"예: 드라이에이징 30일, 인증 등급":"e.g. 30-day dry-aged, certified grade", ta:true },
          ].map(({key,label,ph,ta})=>(
            <div key={key} style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>{label}</div>
              {ta ? <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{...inputStyle,resize:"vertical",lineHeight:1.7}}/>
                  : <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inputStyle}/>}
            </div>
          ))}

          {/* AI 문구 추천 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:aiSugg?14:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"AI 문구 추천":"AI Suggestions"}</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"입력 내용 기반으로 자동 추천":"Auto-suggest based on your input"}</div>
              </div>
              <button onClick={getSugg} disabled={suggesting||!selCat}
                style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:suggesting||!selCat?"not-allowed":"pointer", background:`${accentColor}18`, color:accentColor, fontSize:12, fontWeight:800, opacity:suggesting||!selCat?0.5:1 }}>
                {suggesting?(ko?"추천 중...":"Suggesting..."):(ko?"✨ AI 추천":"✨ AI Suggest")}
              </button>
            </div>
            {aiSugg && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[{key:"productName",items:aiSugg.productNames,label:ko?"상품명":"Product"},{key:"cta",items:aiSugg.ctas,label:"CTA"},{key:"target",items:aiSugg.targets,label:ko?"타겟":"Target"},{key:"extra",items:aiSugg.extras,label:ko?"추가정보":"Extra"}]
                  .filter(r=>r.items?.length>0).map(({key,items,label})=>(
                  <div key={key}>
                    <div style={{ fontSize:10, fontWeight:700, color:muted, letterSpacing:1, marginBottom:5 }}>{label}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {items.map((v,i)=><button key={i} onClick={()=>setForm(p=>({...p,[key]:v}))} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${accentColor}35`, background:`${accentColor}08`, color:text, fontSize:12, cursor:"pointer" }}>{v}</button>)}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10, color:muted }}>{ko?"클릭하면 입력란에 바로 적용":"Click to apply to input field"}</div>
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={()=>{
              if(!canNext) return;
              setSlideContents(SLIDE_TYPES.slice(0,pageCount).map(t=>({id:t.id,label:t.label,headline:"",subheadline:"",body:"",badge:"",aiLoading:false})));
              setWizStep(2);
              if(urlResult) setAutoSuggest(true);
            }} disabled={!canNext}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext?"pointer":"not-allowed", background:canNext?"#7c6aff":"rgba(99,102,241,0.3)", color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              {ko?"다음 →":"Next →"} <span style={{ fontSize:12, opacity:0.8 }}>{ko?"슬라이드 기획":"Plan Slides"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STEP 2 ═══════════════════════════════════════════════
  if (wizStep === 2) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader/>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 40px" }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"슬라이드 내용을 기획하세요":"Plan your slide content"}</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7 }}>{ko?"각 슬라이드의 문구를 직접 입력하거나 AI 추천을 받으세요. 비워두면 AI가 자동으로 채워줘요.":"Enter text for each slide or use AI suggestions. Leave blank and AI will fill them in."}</div>
          </div>
          {urlResult && (
            <div style={{ marginBottom:16, padding:"12px 16px", borderRadius:12, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", gap:12 }}>
              {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:44, height:32, objectFit:"cover", borderRadius:6, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>🔗 {urlResult.title}</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"불러온 내용을 기반으로 슬라이드가 자동 구성돼요":"Slides will be auto-composed from imported content"}</div>
              </div>
              <button onClick={suggestAll} disabled={planLoading}
                style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:11, fontWeight:800, flexShrink:0 }}>
                {planLoading?(ko?"구성 중...":"Composing..."):(ko?"재구성":"Recompose")}
              </button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginBottom:20, padding:"12px 16px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"전체 AI 추천":"AI Suggest All"}</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"모든 슬라이드 내용을 AI가 한 번에 추천":"AI suggests content for all slides at once"}</div>
            </div>
            <button onClick={suggestAll} disabled={planLoading}
              style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:800, opacity:planLoading?0.6:1, flexShrink:0 }}>
              {planLoading?(ko?"추천 중...":"Suggesting..."):(ko?"✨ 전체 자동 추천":"✨ Auto-suggest All")}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {slideContents.map((sc,i)=>(
              <div key={i} style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderBottom:`1px solid ${bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#7c6aff" }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:800, color:text }}>{sc.label}</span>
                    {sc.headline&&<span style={{ fontSize:11, color:"#7c6aff", fontWeight:600 }}>{ko?"✓ 입력됨":"✓ Filled"}</span>}
                  </div>
                  <button onClick={()=>suggestOne(i)} disabled={sc.aiLoading||planLoading}
                    style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#7c6aff", fontSize:11, fontWeight:700, cursor:sc.aiLoading||planLoading?"wait":"pointer", opacity:sc.aiLoading||planLoading?0.5:1, display:"flex", alignItems:"center", gap:5 }}>
                    {sc.aiLoading?<><div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(99,102,241,0.5)",borderTopColor:"#7c6aff",animation:"spin 0.8s linear infinite" }}/>{ko?"추천 중":"Suggesting"}</>:(ko?"✦ AI 추천":"✦ AI Suggest")}
                  </button>
                </div>
                <div style={{ padding:"14px 16px", display:"grid", gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>{ko?"헤드라인":"Headline"} <span style={{ fontWeight:400 }}>{ko?"(14자 이내)":"(max 14 chars)"}</span></div>
                    <input value={sc.headline||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,headline:e.target.value}:s))} placeholder={ko?"비워두면 AI가 자동 생성":"Leave blank for AI to generate"}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${sc.headline?"rgba(99,102,241,0.5)":bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>{ko?"본문":"Body"} <span style={{ fontWeight:400 }}>{ko?"(50자 이내, 선택)":"(max 50 chars, optional)"}</span></div>
                    <input value={sc.body||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,body:e.target.value}:s))} placeholder={ko?"비워두면 AI가 자동 생성":"Leave blank for AI to generate"}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:24 }}>
            <button onClick={()=>setWizStep(1)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>{ko?"← 이전":"← Back"}</button>
            <button onClick={()=>setWizStep(3)} style={{ padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",background:"#7c6aff",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8 }}>
              {ko?"다음 →":"Next →"} <span style={{ fontSize:12,opacity:0.8 }}>{ko?"디자인 선택":"Design"}</span>
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ═══ STEP 3 ═══════════════════════════════════════════════
  if (wizStep === 3) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader/>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 40px" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"디자인 스타일을 선택하세요":"Choose a design style"}</div>
            <div style={{ fontSize:13, color:muted }}>{ko?"선택 안 해도 기본 스타일로 생성돼요":"Default style will be used if none selected"}</div>
          </div>

          {/* 디자인 프리셋 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:text }}>{ko?"스타일 선택":"Select Style"}</div>
              {selPreset&&<button onClick={()=>setSelPreset(null)} style={{ fontSize:11,color:muted,background:"transparent",border:`1px solid ${bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer" }}>{ko?"선택 해제":"Deselect"}</button>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
              {DESIGN_PRESETS.map(dp=>{
                const isSel=selPreset?.key===dp.key;
                return (
                  <button key={dp.key} onClick={()=>setSelPreset(isSel?null:dp)}
                    style={{ border:`2px solid ${isSel?"#7c6aff":"transparent"}`,borderRadius:12,overflow:"hidden",cursor:"pointer",padding:0,background:"transparent",transition:"all 0.15s",boxShadow:isSel?"0 0 0 3px rgba(99,102,241,0.3)":"0 2px 8px rgba(0,0,0,0.15)" }}>
                    {/* 미리보기 박스 */}
                    <div style={{ width:"100%", paddingBottom:"130%", position:"relative", background:dp.bgColor }}>
                      <div style={{ position:"absolute",inset:0,padding:"8px 7px",display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
                        <div style={{ flex:1,borderRadius:4,background:`${dp.textColor}15`,marginBottom:6 }}/>
                        <div style={{ height:4,borderRadius:2,background:dp.textColor,width:"50%",marginBottom:4,opacity:0.9 }}/>
                        <div style={{ height:3,borderRadius:1,background:dp.textColor,width:"80%",marginBottom:2,opacity:0.6 }}/>
                        <div style={{ height:7,borderRadius:3,background:dp.textColor,width:"100%",opacity:0.3 }}/>
                      </div>
                      {isSel&&<div style={{ position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"#7c6aff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:900 }}>✓</div>}
                    </div>
                    <div style={{ padding:"6px 5px",background:D?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.95)" }}>
                      <div style={{ fontSize:10,fontWeight:isSel?800:600,color:isSel?"#a5b4fc":text }}>{dp.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selPreset&&(
              <div style={{ marginTop:10,padding:"9px 14px",borderRadius:9,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#a5b4fc" }}>✓ {selPreset.label} {ko?"선택됨":"selected"}</div>
              </div>
            )}
          </div>

          {/* 이미지 크기 */}
          <div style={{ padding:"16px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"이미지 크기":"Image Size"}</div>
              <div style={{ fontSize:14, fontWeight:900, color:"#7c6aff" }}>{imgW} × {imgH} px</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
              {SIZE_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setSelSize(i)}
                  style={{ padding:"8px 4px",borderRadius:9,border:`1.5px solid ${selSize===i?"#7c6aff":bdr}`,background:selSize===i?"rgba(99,102,241,0.15)":"transparent",color:selSize===i?"#a5b4fc":(D?"rgba(255,255,255,0.65)":"#555"),fontSize:11,fontWeight:selSize===i?800:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.w&&<span style={{ fontSize:9,opacity:0.7 }}>{p.w}×{p.h}</span>}
                </button>
              ))}
            </div>
            {preset.w==null&&(
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>{ko?"가로 (px)":"Width (px)"}</div>
                  <input type="number" value={customW} onChange={e=>setCustomW(Number(e.target.value))} min={100} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
                </div>
                <div style={{ fontSize:18,color:muted,paddingTop:18 }}>×</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>{ko?"세로 (px)":"Height (px)"}</div>
                  <input type="number" value={customH} onChange={e=>setCustomH(Number(e.target.value))} min={100} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
                </div>
              </div>
            )}
            {preset.w&&<div style={{ fontSize:11,color:muted,textAlign:"center",marginTop:4 }}>{preset.desc} · {preset.w}×{preset.h}px</div>}
            <div style={{ marginTop:12,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:10,color:muted }}>{ko?"비율":"Ratio"}</div>
              <div style={{ width:Math.min(56,56*imgRatio),height:Math.min(56,56/imgRatio),background:"rgba(99,102,241,0.25)",border:"1.5px solid rgba(99,102,241,0.5)",borderRadius:3 }}/>
              <div style={{ fontSize:11,color:muted }}>{imgW>imgH?(ko?"가로형":"Horizontal"):imgW<imgH?(ko?"세로형":"Vertical"):(ko?"정사각형":"Square")} · {(imgW/imgH).toFixed(2)}:1</div>
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={()=>setWizStep(2)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>{ko?"← 이전":"← Back"}</button>
            <div style={{ textAlign:"right" }}>
              {user && <div style={{ fontSize:12,color:muted,marginBottom:6 }}>{ko?"예상 차감:":"Est. cost:"} <b style={{ color:"#7c6aff" }}>10P</b></div>}
              <button onClick={generate} disabled={loading}
                style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:loading?"wait":"pointer",background:"#7c6aff",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto",opacity:loading?0.7:1 }}>
                {loading?<><div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin 1s linear infinite" }}/>{ko?"생성 중...":"Generating..."}</>:user?(ko?"텍스트 생성하기 →":"Generate Text →"):(ko?"✦ 1회 생성하기":"✦ Generate Once")}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ═══ STEP 4: 캔버스 편집기 (CardNewsEditor) ══════════════════════════════
  if (wizStep === 4) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"#888"}}>에디터 로딩 중...</div>}>
          <UnifiedCanvasEditor
            slides={slides.map((s, i) => {
              const st = sted[i] || {};
              const ss = getSlideStyle(i);
              return {
                title: st.title ?? s.title ?? "",
                body: st.body ?? s.body ?? "",
                bgColor: st.bgColor || ss.bgColor || "#1a1a2e",
                textColor: st.textColor || ss.textColor || "#fff",
                fontSize: ss.titleSize || 34,
                image: st.bgImage || s.bgImage || null,
              };
            })}
            width={imgW}
            height={imgH}
            mode="detailpage"
            onSave={() => {}}
            onClose={() => setWizStep(3)}
            inline
          />
        </Suspense>
      </div>
    );
  }

  return null;
}
