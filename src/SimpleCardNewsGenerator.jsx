import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";

/* ══════════════════════════════════════════════════════════════
   SimpleCardNewsGenerator.jsx
   ✅ Step1: 주제 입력 (예시 주제 태그 + AI 추천)
   ✅ Step2: 슬라이드 기획
   ✅ Step3: 디자인 선택 + 사이즈 선택
   ✅ Step4: 텍스트 편집 (글 수정, Canvas 미리보기)
══════════════════════════════════════════════════════════════ */

import { callAI } from "./aiClient";

// ── 예시 주제 ────────────────────────────────────────────────
const TOPIC_EXAMPLES = [
  { label:"직장인 번아웃", text:"직장인 번아웃 극복법 5가지" },
  { label:"주식 입문",     text:"주식 투자 완전 초보 가이드" },
  { label:"다이어트",      text:"다이어트 식단 추천" },
  { label:"마음 챙김",     text:"하루 10분 마음 챙김 루틴" },
  { label:"재테크",        text:"2030 재테크 필수 습관" },
  { label:"홈트",          text:"집에서 할 수 있는 홈트 루틴" },
  { label:"SNS 성장",      text:"인스타그램 팔로워 늘리는 방법" },
  { label:"독서법",        text:"성인 자기계발 독서법" },
];

// ── 슬라이드 타입 ────────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"cover",   label:"표지"          },
  { id:"intro",   label:"소개"          },
  { id:"point1",  label:"핵심 포인트 1" },
  { id:"point2",  label:"핵심 포인트 2" },
  { id:"point3",  label:"핵심 포인트 3" },
  { id:"point4",  label:"핵심 포인트 4" },
  { id:"detail",  label:"상세 설명"     },
  { id:"tip",     label:"꿀팁"          },
  { id:"summary", label:"요약 정리"     },
  { id:"quote",   label:"명언/인용구"   },
  { id:"cta",     label:"마무리/CTA"    },
];

// ── 사이즈 프리셋 ────────────────────────────────────────────
const SIZE_PRESETS = [
  { label:"정사각형",  w:1080, h:1080, icon:"⬜", desc:"SNS / 인스타그램" },
  { label:"세로 9:16", w:1080, h:1920, icon:"📲", desc:"쇼츠 / 릴스" },
  { label:"세로 4:5",  w:1080, h:1350, icon:"📱", desc:"인스타 피드" },
  { label:"가로형",    w:1200, h:628,  icon:"🖥",  desc:"배너 / 블로그" },
  { label:"직접 입력", w:null, h:null, icon:"✏️", desc:"직접 설정" },
];

// ── 디자인 프리셋 (CardNewsApp 스타일) ───────────────────────
const DESIGN_PRESETS = [
  { key:"bold_dark",  label:"볼드 다크",  bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:34, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"minimal",    label:"미니멀",     bgColor:"#f8fafc", textColor:"#1e1b4b", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"left",   textValign:"bottom", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"neon",       label:"네온",       bgColor:"#0f172a", textColor:"#a5b4fc", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"warm_cream", label:"크림 웜",    bgColor:"#fefce8", textColor:"#7c2d12", titleSize:30, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"none",      lineHeightTitle:1.4,  lineHeightBody:1.8 },
  { key:"forest",     label:"포레스트",   bgColor:"#052e16", textColor:"#dcfce7", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"ocean",      label:"오션",       bgColor:"#0c1445", textColor:"#bae6fd", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
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

function drawDetailSlide(canvas, slide, style, CW, CH, bgImageEl = null) {
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CW, CH);

  // 배경
  if (bgImageEl && bgImageEl.complete && bgImageEl.naturalWidth > 0) {
    const iR = bgImageEl.naturalWidth / bgImageEl.naturalHeight;
    const cR = CW / CH;
    let sw, sh, sx = 0, sy = 0;
    if (iR > cR) { sh = CH; sw = CH * iR; sx = (CW - sw) / 2; }
    else { sw = CW; sh = CW / iR; sy = (CH - sh) / 2; }
    ctx.drawImage(bgImageEl, sx, sy, sw, sh);
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, CW, CH);
  } else {
    ctx.fillStyle = style.bgColor || "#1c1c1e";
    ctx.fillRect(0, 0, CW, CH);
    // 단색일 때만 장식 원
    ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = style.textColor || "#fff";
    ctx.beginPath(); ctx.arc(CW * 0.88, CH * 0.06, CW * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(CW * 0.08, CH * 0.94, CW * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const tc = style.textColor || "#ffffff";
  const al = style.textAlign || "left";
  const va = style.textValign || "middle";
  const ff = style.fontFamily || "sans-serif";
  const SC = CW / 420;
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
  const _sub = slide.subtitle !== undefined ? slide.subtitle : slide.subheadline;
  const subLines = _sub ? wrapText(ctx, _sub, maxW) : [];
  ctx.font = getCanvasFont("400", bSz, ff);
  const bodLines = slide.body ? wrapText(ctx, slide.body, maxW) : [];
  ctx.font = getCanvasFont("700", hSz, ff);
  const _hl = slide.highlight !== undefined ? slide.highlight : slide.badge;
  const hlLines = _hl ? wrapText(ctx, _hl, maxW) : [];

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
  let y = Math.max(minY, startY);

  function getX(lineW) {
    if (al === "center") return Math.round((CW - lineW) / 2);
    if (al === "right")  return CW - PAD - lineW;
    return PAD;
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
function SlideCanvas({ slide, style, CW, CH, displayW, bgImageSrc }) {
  const cRef = useRef(null);
  const displayH = Math.round(displayW * CH / CW);
  useEffect(() => {
    if (!cRef.current || !slide) return;
    const doDraw = (imgEl) => {
      if (!cRef.current) return;
      drawDetailSlide(cRef.current, slide, style, CW, CH, imgEl);
    };
    const drawWithFont = (imgEl) => {
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => doDraw(imgEl));
      } else {
        doDraw(imgEl);
      }
    };
    if (bgImageSrc) {
      const img = new Image();
      img.onload = () => drawWithFont(img);
      img.onerror = () => drawWithFont(null);
      img.src = bgImageSrc;
    } else {
      drawWithFont(null);
    }
  });
  if (!slide) return null;
  return (
    <canvas ref={cRef} style={{ width:displayW, height:displayH, display:"block", borderRadius:8 }}/>
  );
}

// ── API 호출 ─────────────────────────────────────────────────
async function generateSlideTexts({ topic, pageCount, sourceContent }) {
  const types = SLIDE_TYPES.slice(0, pageCount);
  const srcCtx = sourceContent ? `\n\n[참고할 원본 내용 - 이 내용을 기반으로 슬라이드를 구성하세요]\n${sourceContent.slice(0, 700)}` : "";
  const prompt = `한국 SNS 카드뉴스 카피라이터입니다.
주제: ${topic}${srcCtx}

카드뉴스 슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
각 슬라이드: headline(제목, 14자 이내), subheadline(부제목, 22자 이내, 선택), body(본문, 50자 이내, 선택), badge(강조문구, 8자 이내, 선택)

JSON만 응답:
{"slides":[${types.map(t=>`{"id":"${t.id}","label":"${t.label}","headline":"","subheadline":"","body":"","badge":""}`).join(",")}]}`;

  const txt = await callAI("claude-sonnet-4-5", [{role:"user",content:prompt}], 2000);
  const cleaned = txt.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(cleaned); } catch {
    // JSON 불완전할 경우 slides 키 추출 시도
    const m = cleaned.match(/"slides"\s*:\s*(\[.*)/s);
    if (m) { try { return { slides: JSON.parse(m[1].replace(/}\s*,?\s*$/, '}]').split('}]')[0] + '}]') }; } catch {} }
    return { slides: [] };
  }
}

async function suggestSlideText(topic, sc, sourceContent) {
  const srcCtx = sourceContent ? `\n참고 내용: ${sourceContent.slice(0,400)}` : "";
  const txt = await callAI("claude-sonnet-4-5", [{role:"user", content:`카드뉴스 주제:"${topic}" / 슬라이드:${sc.label}(${sc.id})${srcCtx}\nJSON만:\n{"headline":"제목(14자)","subheadline":"부제목(22자,없으면빈문자)","body":"본문(50자,없으면빈문자)","badge":"강조(8자,없으면빈문자)"}`}], 300);
  return JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
}

async function getTopicSuggestions(topic) {
  const txt = await callAI("claude-sonnet-4-5", [{role:"user", content:`카드뉴스 주제:"${topic}"\nJSON만:\n{"topics":["더 구체적인 주제1","주제2","주제3"],"subtopics":["세부내용 방향1","방향2","방향3"]}`}], 300);
  return JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function SimpleCardNewsGenerator({ isDark, user, theme, openFromLibrary , onUserUpdate}) {
  // 보관함에서 열기: 마운트 전 localStorage에서 항목 읽기
  const libItem = (() => {
    if (!openFromLibrary) return null;
    try {
      const item = JSON.parse(localStorage.getItem("nper_open_card") || "null");
      localStorage.removeItem("nper_open_card");
      return item;
    } catch { return null; }
  })();

  const [wizStep, setWizStep] = useState(libItem ? 4 : 1);

  // URL 불러오기
  const [urlInput,    setUrlInput]    = useState("");
  const [urlLoading,  setUrlLoading]  = useState(false);
  const [urlResult,   setUrlResult]   = useState(null);
  const [autoSuggest, setAutoSuggest] = useState(false);

  // Step1 - 카드뉴스용
  const [topic,     setTopic]     = useState(libItem?.topic || "");
  const [pageCount, setPageCount] = useState(libItem?.count || 6);
  const [aiSugg,    setAiSugg]    = useState(null);
  const [suggesting,setSuggesting]= useState(false);

  // Step2
  const [slideContents, setSlideContents] = useState([]);
  const [planLoading,   setPlanLoading]   = useState(false);

  // Step3
  const [selPreset, setSelPreset] = useState(null);
  const [selSize,   setSelSize]   = useState(0);     // 0 = 정사각형 1080×1080
  const [customW,   setCustomW]   = useState(1080);
  const [customH,   setCustomH]   = useState(1080);

  // Step4
  const [slides,    setSlides]    = useState(libItem?.slides || []);
  const [sted,      setSted]      = useState({});
  const [selIdx,    setSelIdx]    = useState(0);
  const [loading,   setLoading]   = useState(false);
  useGeneratingGuard(loading, 10); // 생성 중 이탈 방지

  useEffect(() => {
    if (autoSuggest && wizStep === 2 && slideContents.length > 0) {
      setAutoSuggest(false);
      suggestAll();
    }
  }, [autoSuggest, wizStep, slideContents.length]);

  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [dlSt,      setDlSt]      = useState({ busy:false, msg:"" });

  // 테마
  const D = isDark || theme === "dark";
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.55)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const accentColor = "#6366f1";

  const preset = SIZE_PRESETS[selSize] || SIZE_PRESETS[0];
  const imgW = preset.w != null ? preset.w : (parseInt(customW)||860);
  const imgH = preset.h != null ? preset.h : (parseInt(customH)||1100);
  const imgRatio = imgW / imgH;
  const activeStyle = selPreset || DESIGN_PRESETS[0];

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:D?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // WizHeader
  const WizHeader = () => (
    <div style={{ padding:"20px 28px 0", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {[["1","주제 입력"],["2","슬라이드 기획"],["3","디자인 선택"],["4","편집"]].map(([n,label],i)=>{
          const step=parseInt(n); const done=wizStep>step; const active=wizStep===step;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", flex:i<3?1:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor:done?"pointer":"default" }}
                onClick={()=>{ if(done&&step<wizStep) setWizStep(step); }}>
                <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:900, flexShrink:0,
                  background:done||active?"#6366f1":(D?"rgba(255,255,255,0.1)":"#e5e5e5"),
                  color:done||active?"#fff":(D?"rgba(255,255,255,0.3)":"#bbb") }}>
                  {done?"✓":n}
                </div>
                <span style={{ fontSize:13, fontWeight:active?800:500, color:active?text:muted, whiteSpace:"nowrap" }}>{label}</span>
              </div>
              {i<3&&<div style={{ flex:1, height:2, background:done?"#6366f1":(D?"rgba(255,255,255,0.1)":"#e5e5e5"), margin:"0 12px", minWidth:16 }}/>}
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
      if (data.error) { alert(data.error); setUrlLoading(false); return; }
      setUrlResult(data);
      // 주제 자동 채우기: 제목 + 설명/내용 요약
      const combined = [data.title, data.description || data.content || ""].filter(Boolean).join("\n").slice(0, 300);
      setTopic(combined);
    } catch(e) { alert("URL 불러오기 실패: " + e.message); }
    setUrlLoading(false);
  };

  // AI 주제 추천
  const getSugg = async () => {
    if (!topic.trim()) return;
    setSuggesting(true); setAiSugg(null);
    try { setAiSugg(await getTopicSuggestions(topic)); } catch{}
    setSuggesting(false);
  };

  // 슬라이드 개별 AI 추천
  const suggestOne = async (idx) => {
    const sc = slideContents[idx]; if(!sc) return;
    setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,aiLoading:true}:s));
    const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,500) : null;
    try {
      const parsed = await suggestSlideText(topic, sc, srcContent);
      setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,...parsed,aiLoading:false}:s));
    } catch { setSlideContents(prev=>prev.map((s,i)=>i===idx?{...s,aiLoading:false}:s)); }
  };

  const suggestAll = async () => {
    setPlanLoading(true);
    for(let i=0;i<slideContents.length;i++){ await suggestOne(i); await new Promise(r=>setTimeout(r,200)); }
    setPlanLoading(false);
  };

  // Step3→Step4: 텍스트 생성
  const generate = async () => {
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage();
    // 크레딧 체크
    if (user && (user.points || 0) < 10) { setShowCreditPopup(true); return; }
    // 포인트 즉시 차감
    if (user?.uid) {
      changePoints(user.uid, -10, "심플 카드뉴스 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }
        setLoading(true);
    try {
      let slidesData;
      if (slideContents.length > 0 && slideContents.some(s=>s.headline)) {
        slidesData = slideContents.map(sc=>({
          id:sc.id, label:sc.label,
          title:sc.headline||"", subtitle:sc.subheadline||"",
          body:sc.body||"", highlight:sc.badge||"",
          headline:sc.headline||"", subheadline:sc.subheadline||"", badge:sc.badge||"",
        }));
        const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,700) : undefined;
        const empty = slidesData.filter(s=>!s.title);
        if (empty.length>0) {
          const fill = await generateSlideTexts({topic, pageCount, sourceContent: srcContent});
          fill.slides?.forEach(fs=>{
            const idx=slidesData.findIndex(s=>s.id===fs.id&&!s.title);
            if(idx>=0) slidesData[idx]={...slidesData[idx],title:fs.headline,subtitle:fs.subheadline,body:fs.body,highlight:fs.badge,headline:fs.headline};
          });
        }
      } else {
        const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,700) : undefined;
        const textData = await generateSlideTexts({topic, pageCount, sourceContent: srcContent});
        slidesData = (textData.slides||[]).map(s=>({
          ...s, title:s.headline, subtitle:s.subheadline, highlight:s.badge
        }));
      }
      setSlides(slidesData); setSted({}); setSelIdx(0); setWizStep(4);
      saveToCardLibrary(slidesData);
      // 포인트 차감은 생성 시작 시점에 처리됨
    } catch(e) { alert("생성 실패: " + e.message); }
    setLoading(false);
  };

  // Step4 편집 헬퍼
  const getCurSlide = (idx) => {
    const base = slides[idx]||{};
    const ed = sted[idx]||{};
    // text fields only (exclude style overrides)
    const { bgColor, bgImage, textColor, titleSize, bodySize, textAlign, textValign, ...textEd } = ed;
    return { ...base, ...textEd };
  };
  const getSlideStyle = (idx) => {
    const so = sted[idx]||{};
    return { ...activeStyle, ...(so.bgColor?{bgColor:so.bgColor}:{}), ...(so.textColor?{textColor:so.textColor}:{}), ...(so.titleSize?{titleSize:so.titleSize}:{}), ...(so.bodySize?{bodySize:so.bodySize}:{}), ...(so.textAlign?{textAlign:so.textAlign}:{}), ...(so.textValign?{textValign:so.textValign}:{}), ...(so.fontFamily?{fontFamily:so.fontFamily}:{}) };
  };
  const updSted = (idx, key, val) => setSted(prev=>({...prev,[idx]:{...(prev[idx]||{}), [key]:val}}));

  // bgFile ref
  const bgFileRef = useRef(null);

  // PNG 저장 (단일)
  const saveOne = (idx) => {
    const slide = getCurSlide(idx);
    const slideStyle = getSlideStyle(idx);
    const bgImg = (sted[idx]||{}).bgImage;
    const doSave = (imgEl) => {
      const canvas = document.createElement("canvas");
      drawDetailSlide(canvas, slide, slideStyle, imgW, imgH, imgEl);
      const a=document.createElement("a");
      a.href=canvas.toDataURL("image/png");
      a.download=`${topic||"cardnews"}_${String(idx+1).padStart(2,"0")}_${slide.label||"slide"}.png`;
      a.click();
    };
    if (bgImg) { const img=new Image(); img.onload=()=>doSave(img); img.onerror=()=>doSave(null); img.src=bgImg; }
    else doSave(null);
  };

  // 전체 ZIP
  const saveAll = async () => {
    if(!slides.length) return;
    setDlSt({busy:true,msg:"ZIP 생성 중..."});
    if(!window.JSZip) await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    const zip=new window.JSZip();
    for(let i=0;i<slides.length;i++){
      const slide=getCurSlide(i);
      const slideStyle=getSlideStyle(i);
      const bgImg=(sted[i]||{}).bgImage;
      await new Promise(resolve=>{
        const doZip=(imgEl)=>{
          const canvas=document.createElement("canvas");
          drawDetailSlide(canvas,slide,slideStyle,imgW,imgH,imgEl);
          const b64=canvas.toDataURL("image/png").split(",")[1];
          const arr=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
          zip.file(`${String(i+1).padStart(2,"0")}_${slide.label||"slide"}.png`,arr);
          resolve();
        };
        if(bgImg){const img=new Image();img.onload=()=>doZip(img);img.onerror=()=>doZip(null);img.src=bgImg;}
        else doZip(null);
      });
    }
    const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${topic||"cardnews"}_slides.zip`;a.click();
    setDlSt({busy:false,msg:"✅ 저장 완료!"});
    setTimeout(()=>setDlSt({busy:false,msg:""}),2500);
  };

  // ── 보관함 저장 ──────────────────────────────────────────
  const saveToCardLibrary = (slidesData) => {
    try {
      const KEY = "nper_saved_works_v2";
      const list = JSON.parse(localStorage.getItem(KEY) || "[]");
      const now = new Date();
      const ds = now.getFullYear() + "." + String(now.getMonth()+1).padStart(2,"0") + "." + String(now.getDate()).padStart(2,"0");
      // 썸네일: 첫 슬라이드를 canvas로 그려서 저장
      let thumb = null;
      try {
        const c = document.createElement("canvas");
        drawDetailSlide(c, { title:slidesData[0]?.title||"", subtitle:slidesData[0]?.subtitle||"", body:slidesData[0]?.body||"", highlight:slidesData[0]?.highlight||"" }, activeStyle, imgW, imgH, null);
        thumb = c.toDataURL("image/jpeg", 0.5);
      } catch {}
      list.unshift({ id:"sc_"+Date.now(), topic, count:slidesData.length, date:ds, thumb, slides:slidesData, gs:activeStyle, sted:{} });
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
    } catch {}
  };

  const resetAll = () => {
    setWizStep(1); setTopic(""); setPageCount(6); setAiSugg(null);
    setSlideContents([]); setSelPreset(null); setSelSize(0);
    setCustomW(1080); setCustomH(1080);
    setSlides([]); setSted({});
  };

  // ═══ STEP 1 ═══════════════════════════════════════════════
  if (wizStep === 1) {
    const canNext = topic.trim().length > 0;
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader/>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 28px 80px" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>주제를 입력하세요</div>
            <div style={{ fontSize:13, color:muted }}>주제를 입력하면 AI가 카드뉴스 슬라이드를 자동 구성해줘요</div>
          </div>

          {/* URL 불러오기 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>🔗 URL로 내용 불러오기</div>
            <div style={{ fontSize:11, color:muted, marginBottom:10 }}>뉴스 기사, 유튜브 링크, 블로그 URL을 붙여넣으면 자동으로 주제를 불러와요</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") fetchFromUrl(); }}
                placeholder="https://... 뉴스/유튜브/블로그 URL 붙여넣기"
                style={{ flex:1, padding:"9px 13px", borderRadius:9, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:12, fontFamily:"inherit", outline:"none" }}/>
              <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                style={{ padding:"9px 18px", borderRadius:9, border:"none", cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:urlLoading||!urlInput.trim()?0.5:1, flexShrink:0, whiteSpace:"nowrap" }}>
                {urlLoading?"불러오는 중...":"불러오기"}
              </button>
            </div>
            {urlResult && (
              <div style={{ marginTop:10, padding:"10px 13px", borderRadius:8, background:D?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)", border:`1px solid rgba(99,102,241,0.2)`, display:"flex", gap:10, alignItems:"flex-start" }}>
                {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:56, height:40, objectFit:"cover", borderRadius:5, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{urlResult.title}</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>{urlResult.type==="youtube"?"유튜브":urlResult.type==="news"?"뉴스 기사":"블로그"} · 내용이 주제에 자동 입력됐어요</div>
                </div>
              </div>
            )}
          </div>

          {/* 예시 주제 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>💡 예시 주제</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {TOPIC_EXAMPLES.map(ex=>{
                const isC = topic === ex.text;
                return (
                  <button key={ex.label} onClick={()=>setTopic(ex.text)}
                    style={{ padding:"5px 12px", borderRadius:16, border:`1px solid ${isC?"#6366f1":bdr}`, background:isC?"rgba(99,102,241,0.15)":"transparent", color:isC?"#a5b4fc":(D?"rgba(255,255,255,0.55)":"#555"), fontSize:12, cursor:"pointer", fontWeight:isC?700:400, transition:"all 0.12s" }}>
                    {ex.label}
                  </button>
                );
              })}
            </div>
            <textarea value={topic} onChange={e=>setTopic(e.target.value)}
              placeholder="주제를 직접 입력하세요... 예) 직장인 번아웃 극복법 5가지" rows={3}
              style={{ width:"100%", background:D?"rgba(255,255,255,0.05)":"#f5f5f5", border:`1px solid ${bdr}`, borderRadius:9, padding:"10px 14px", color:text, fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.7 }}/>
          </div>

          {/* 슬라이드 수 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
              <div style={{ fontSize:22, fontWeight:900, color:accentColor }}>{pageCount}장</div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[3,4,5,6,7,8,10,12].map(n=>{
                const isC = pageCount===n;
                return (
                  <button key={n} onClick={()=>setPageCount(n)}
                    style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${isC?"#6366f1":bdr}`, cursor:"pointer", fontSize:13, fontWeight:700, background:isC?"rgba(99,102,241,0.15)":"transparent", color:isC?"#a5b4fc":(D?"rgba(255,255,255,0.5)":"#666") }}>
                    {n}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize:11, color:muted, marginTop:8, lineHeight:1.6 }}>
              {SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}
            </div>
          </div>

          {/* AI 주제 추천 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:aiSugg?14:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>AI 주제 추천</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>주제를 입력하면 더 구체적인 방향을 추천해줘요</div>
              </div>
              <button onClick={getSugg} disabled={suggesting||!topic.trim()}
                style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:suggesting||!topic.trim()?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:suggesting||!topic.trim()?0.5:1, flexShrink:0 }}>
                {suggesting?"추천 중...":"✨ AI 추천"}
              </button>
            </div>
            {aiSugg && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[{key:"topics",items:aiSugg.topics,label:"주제 방향"},{key:"subtopics",items:aiSugg.subtopics,label:"세부 내용 방향"}]
                  .filter(r=>r.items?.length>0).map(({key,items,label})=>(
                  <div key={key}>
                    <div style={{ fontSize:10, fontWeight:700, color:muted, letterSpacing:1, marginBottom:5 }}>{label}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {items.map((v,i)=><button key={i} onClick={()=>setTopic(v)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid rgba(99,102,241,0.35)", background:"rgba(99,102,241,0.08)", color:text, fontSize:12, cursor:"pointer" }}>{v}</button>)}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10, color:muted }}>클릭하면 주제에 바로 적용돼요</div>
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
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext?"pointer":"not-allowed", background:canNext?"#6366f1":"rgba(99,102,241,0.3)", color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              다음 → <span style={{ fontSize:12, opacity:0.8 }}>슬라이드 기획</span>
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
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 28px 80px" }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>슬라이드 내용을 기획하세요</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7 }}>각 슬라이드의 문구를 직접 입력하거나 AI 추천을 받으세요. 비워두면 AI가 자동으로 채워줘요.</div>
          </div>
          {urlResult && (
            <div style={{ marginBottom:16, padding:"12px 16px", borderRadius:12, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", gap:12 }}>
              {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:44, height:32, objectFit:"cover", borderRadius:6, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>🔗 {urlResult.title}</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>불러온 내용을 기반으로 슬라이드가 자동 구성돼요</div>
              </div>
              <button onClick={suggestAll} disabled={planLoading}
                style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:planLoading?"wait":"pointer", background:"#6366f1", color:"#fff", fontSize:11, fontWeight:800, flexShrink:0 }}>
                {planLoading?"구성 중...":"재구성"}
              </button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginBottom:20, padding:"12px 16px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>전체 AI 추천</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>모든 슬라이드 내용을 AI가 한 번에 추천</div>
            </div>
            <button onClick={suggestAll} disabled={planLoading}
              style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor:planLoading?"wait":"pointer", background:"#6366f1", color:"#fff", fontSize:13, fontWeight:800, opacity:planLoading?0.6:1, flexShrink:0 }}>
              {planLoading?"추천 중...":"✨ 전체 자동 추천"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {slideContents.map((sc,i)=>(
              <div key={i} style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderBottom:`1px solid ${bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#6366f1" }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:800, color:text }}>{sc.label}</span>
                    {sc.headline&&<span style={{ fontSize:11, color:"#6366f1", fontWeight:600 }}>✓ 입력됨</span>}
                  </div>
                  <button onClick={()=>suggestOne(i)} disabled={sc.aiLoading||planLoading}
                    style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#6366f1", fontSize:11, fontWeight:700, cursor:sc.aiLoading||planLoading?"wait":"pointer", opacity:sc.aiLoading||planLoading?0.5:1, display:"flex", alignItems:"center", gap:5 }}>
                    {sc.aiLoading?<><div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(99,102,241,0.5)",borderTopColor:"#6366f1",animation:"spin 0.8s linear infinite" }}/>추천 중</>:"✦ AI 추천"}
                  </button>
                </div>
                <div style={{ padding:"14px 16px", display:"grid", gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>헤드라인 <span style={{ fontWeight:400 }}>(14자 이내)</span></div>
                    <input value={sc.headline||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,headline:e.target.value}:s))} placeholder="비워두면 AI가 자동 생성"
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${sc.headline?"rgba(99,102,241,0.5)":bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>본문 <span style={{ fontWeight:400 }}>(50자 이내, 선택)</span></div>
                    <input value={sc.body||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,body:e.target.value}:s))} placeholder="비워두면 AI가 자동 생성"
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:24 }}>
            <button onClick={()=>setWizStep(1)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>← 이전</button>
            <button onClick={()=>setWizStep(3)} style={{ padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",background:"#6366f1",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8 }}>
              다음 → <span style={{ fontSize:12,opacity:0.8 }}>디자인 선택</span>
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
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 28px 80px" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>디자인 스타일을 선택하세요</div>
            <div style={{ fontSize:13, color:muted }}>선택 안 해도 기본 스타일로 생성돼요</div>
          </div>

          {/* 디자인 프리셋 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:text }}>스타일 선택</div>
              {selPreset&&<button onClick={()=>setSelPreset(null)} style={{ fontSize:11,color:muted,background:"transparent",border:`1px solid ${bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer" }}>선택 해제</button>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
              {DESIGN_PRESETS.map(dp=>{
                const isSel=selPreset?.key===dp.key;
                return (
                  <button key={dp.key} onClick={()=>setSelPreset(isSel?null:dp)}
                    style={{ border:`2px solid ${isSel?"#6366f1":"transparent"}`,borderRadius:12,overflow:"hidden",cursor:"pointer",padding:0,background:"transparent",transition:"all 0.15s",boxShadow:isSel?"0 0 0 3px rgba(99,102,241,0.3)":"0 2px 8px rgba(0,0,0,0.15)" }}>
                    {/* 미리보기 박스 */}
                    <div style={{ width:"100%", paddingBottom:"130%", position:"relative", background:dp.bgColor }}>
                      <div style={{ position:"absolute",inset:0,padding:"8px 7px",display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
                        <div style={{ flex:1,borderRadius:4,background:`${dp.textColor}15`,marginBottom:6 }}/>
                        <div style={{ height:4,borderRadius:2,background:dp.textColor,width:"50%",marginBottom:4,opacity:0.9 }}/>
                        <div style={{ height:3,borderRadius:1,background:dp.textColor,width:"80%",marginBottom:2,opacity:0.6 }}/>
                        <div style={{ height:7,borderRadius:3,background:dp.textColor,width:"100%",opacity:0.3 }}/>
                      </div>
                      {isSel&&<div style={{ position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:900 }}>✓</div>}
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
                <div style={{ fontSize:12,fontWeight:700,color:"#a5b4fc" }}>✓ {selPreset.label} 선택됨</div>
              </div>
            )}
          </div>

          {/* 이미지 크기 */}
          <div style={{ padding:"16px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>이미지 크기</div>
              <div style={{ fontSize:14, fontWeight:900, color:"#6366f1" }}>{imgW} × {imgH} px</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
              {SIZE_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setSelSize(i)}
                  style={{ padding:"8px 4px",borderRadius:9,border:`1.5px solid ${selSize===i?"#6366f1":bdr}`,background:selSize===i?"rgba(99,102,241,0.15)":"transparent",color:selSize===i?"#a5b4fc":(D?"rgba(255,255,255,0.65)":"#555"),fontSize:11,fontWeight:selSize===i?800:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.w&&<span style={{ fontSize:9,opacity:0.7 }}>{p.w}×{p.h}</span>}
                </button>
              ))}
            </div>
            {preset.w==null&&(
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>가로 (px)</div>
                  <input type="number" value={customW} onChange={e=>setCustomW(Number(e.target.value))} min={100} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
                </div>
                <div style={{ fontSize:18,color:muted,paddingTop:18 }}>×</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>세로 (px)</div>
                  <input type="number" value={customH} onChange={e=>setCustomH(Number(e.target.value))} min={100} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
                </div>
              </div>
            )}
            {preset.w&&<div style={{ fontSize:11,color:muted,textAlign:"center",marginTop:4 }}>{preset.desc} · {preset.w}×{preset.h}px</div>}
            <div style={{ marginTop:12,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:10,color:muted }}>비율</div>
              <div style={{ width:Math.min(56,56*imgRatio),height:Math.min(56,56/imgRatio),background:"rgba(99,102,241,0.25)",border:"1.5px solid rgba(99,102,241,0.5)",borderRadius:3 }}/>
              <div style={{ fontSize:11,color:muted }}>{imgW>imgH?"가로형":imgW<imgH?"세로형":"정사각형"} · {(imgW/imgH).toFixed(2)}:1</div>
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={()=>setWizStep(2)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>← 이전</button>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12,color:muted,marginBottom:6 }}>예상 차감: <b style={{ color:"#6366f1" }}>10P</b></div>
              <button onClick={generate} disabled={loading}
                style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:loading?"wait":"pointer",background:"#6366f1",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto",opacity:loading?0.7:1 }}>
                {loading?<><div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin 1s linear infinite" }}/>생성 중...</>:user?"카드뉴스 만들기 →":"✦ 1회 생성하기"}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }


  // ── 크레딧 소진 팝업 ──────────────────────────────────────

  // ═══ STEP 4: 텍스트 편집 ══════════════════════════════════
  if (wizStep === 4) {
    const curSlide = getCurSlide(selIdx);
    const so = sted[selIdx] || {};
    const curStyle = getSlideStyle(selIdx);
    const btnSm = { width:32, height:32, borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:text, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" };

    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader/>

        {/* 크레딧 소진 팝업 */}
        {showCreditPopup && (
          <div onClick={()=>setShowCreditPopup(false)} style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={e=>e.stopPropagation()} style={{ width:"min(400px,92vw)",background:D?"#1a1730":"#fff",borderRadius:20,padding:"32px 28px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}` }}>
              <div style={{ fontSize:48,marginBottom:16 }}>💎</div>
              <div style={{ fontSize:18,fontWeight:900,color:text,marginBottom:10 }}>포인트가 모두 소진되었습니다</div>
              <div style={{ fontSize:13,color:muted,lineHeight:1.8,marginBottom:24 }}>추가 작업을 하려면 포인트를 충전하거나<br/>관리자에게 문의해주세요.</div>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setShowCreditPopup(false)} style={{ flex:1,padding:"11px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer" }}>닫기</button>
                <button onClick={()=>{ setShowCreditPopup(false); window.location.hash="#pricing"; }} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer" }}>💎 포인트 충전</button>
              </div>
              <div style={{ marginTop:12,fontSize:12,color:muted }}>또는 <a href="#contact" style={{ color:"#6366f1" }}>관리자 문의하기 →</a></div>
            </div>
          </div>
        )}

        <input ref={bgFileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>updSted(selIdx,"bgImage",ev.target.result); r.readAsDataURL(f); e.target.value=""; }}/>

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 16px 60px" }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:20,fontWeight:900,color:text,letterSpacing:-0.5,marginBottom:3 }}>슬라이드 편집</div>
            <div style={{ fontSize:12,color:muted }}>텍스트·배경·색상 변경 후 PNG/ZIP으로 저장하세요</div>
          </div>

          <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>

            {/* 썸네일 목록 */}
            <div style={{ width:110, flexShrink:0 }}>
              <div style={{ display:"flex",flexDirection:"column",gap:4,maxHeight:"calc(100vh - 220px)",overflowY:"auto" }}>
                {slides.map((s,i)=>{
                  const sl=getCurSlide(i); const ss=getSlideStyle(i); const sBg=(sted[i]||{}).bgImage; const isActive=selIdx===i;
                  return (
                    <div key={i} onClick={()=>setSelIdx(i)}
                      style={{ borderRadius:8,overflow:"hidden",border:`2px solid ${isActive?"#6366f1":"transparent"}`,cursor:"pointer",transition:"border 0.12s",background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)" }}>
                      <div style={{ position:"relative" }}>
                        <SlideCanvas slide={sl} style={ss} CW={imgW} CH={imgH} displayW={106} bgImageSrc={sBg||undefined}/>
                        <div style={{ position:"absolute",top:3,left:3,width:16,height:16,borderRadius:4,background:isActive?"#6366f1":"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff" }}>{i+1}</div>
                      </div>
                      <div style={{ padding:"3px 5px",background:D?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <span style={{ fontSize:8,color:isActive?"#a5b4fc":muted,fontWeight:isActive?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{s.label}</span>
                        <button onClick={e=>{e.stopPropagation();saveOne(i);}} style={{ fontSize:8,padding:"1px 4px",borderRadius:3,border:"none",background:"transparent",color:muted,cursor:"pointer",flexShrink:0 }}>↓</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={resetAll} style={{ marginTop:6,width:"100%",padding:"6px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:10,cursor:"pointer",fontWeight:700 }}>🔄 처음부터</button>
            </div>

            {/* 편집 패널 */}
            <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,background:cardBg,border:`1px solid ${bdr}` }}>
                <div style={{ width:22,height:22,borderRadius:6,background:"rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#6366f1",flexShrink:0 }}>{selIdx+1}</div>
                <span style={{ fontSize:13,fontWeight:800,color:text,flex:1 }}>{slides[selIdx]?.label}</span>
                <button onClick={()=>setSelIdx(Math.max(0,selIdx-1))} disabled={selIdx===0} style={{ ...btnSm,opacity:selIdx===0?0.3:1 }}>‹</button>
                <span style={{ fontSize:11,color:muted }}>{selIdx+1}/{slides.length}</span>
                <button onClick={()=>setSelIdx(Math.min(slides.length-1,selIdx+1))} disabled={selIdx===slides.length-1} style={{ ...btnSm,opacity:selIdx===slides.length-1?0.3:1 }}>›</button>
              </div>

              <div style={{ borderRadius:9,border:`1px solid ${bdr}`,background:cardBg,padding:"12px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:muted,marginBottom:8 }}>📝 텍스트</div>
                {[
                  { key:"title",label:"제목",placeholder:"제목을 입력하세요" },
                  { key:"subtitle",label:"부제목",placeholder:"비워두면 표시 안 됨" },
                  { key:"body",label:"본문",placeholder:"비워두면 표시 안 됨",ta:true },
                  { key:"highlight",label:"강조문구",placeholder:"비워두면 표시 안 됨" },
                ].map(({key,label,placeholder,ta})=>(
                  <div key={key} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10,fontWeight:700,color:muted,marginBottom:3 }}>{label}</div>
                    {ta
                      ? <textarea value={curSlide[key]||""} onChange={e=>updSted(selIdx,key,e.target.value)} placeholder={placeholder} rows={2} style={{ width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${(curSlide[key]||"")?"rgba(99,102,241,0.5)":bdr}`,background:inputBg,color:text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.6 }}/>
                      : <input value={curSlide[key]||""} onChange={e=>updSted(selIdx,key,e.target.value)} placeholder={placeholder} style={{ width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${(curSlide[key]||"")?"rgba(99,102,241,0.5)":bdr}`,background:inputBg,color:text,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>}
                  </div>
                ))}
              </div>

              <div style={{ borderRadius:9,border:`1px solid ${bdr}`,background:cardBg,padding:"12px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:muted,marginBottom:10 }}>🎨 스타일</div>
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:muted,marginBottom:4 }}>배경색</div>
                    <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                      <input type="color" value={so.bgColor||curStyle.bgColor||"#1c1c1e"} onChange={e=>updSted(selIdx,"bgColor",e.target.value)} style={{ width:34,height:34,borderRadius:7,border:`1px solid ${bdr}`,cursor:"pointer",padding:2 }}/>
                      {so.bgColor&&<button onClick={()=>updSted(selIdx,"bgColor",undefined)} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>↩</button>}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:muted,marginBottom:4 }}>글자색</div>
                    <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                      <input type="color" value={so.textColor||curStyle.textColor||"#ffffff"} onChange={e=>updSted(selIdx,"textColor",e.target.value)} style={{ width:34,height:34,borderRadius:7,border:`1px solid ${bdr}`,cursor:"pointer",padding:2 }}/>
                      {so.textColor&&<button onClick={()=>updSted(selIdx,"textColor",undefined)} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>↩</button>}
                    </div>
                  </div>
                </div>
                {/* 폰트 선택 */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:4 }}>폰트</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {[
                      { label:"기본", val:"sans-serif" },
                      { label:"명조", val:"Nanum Myeongjo" },
                      { label:"고딕", val:"Noto Sans KR" },
                      { label:"둥근", val:"Nanum Gothic" },
                      { label:"배민", val:"BMDOHYEON" },
                      { label:"넥슨", val:"NeoDunggeunmo" },
                    ].map(f=>{
                      const cur = so.fontFamily||curStyle.fontFamily||"sans-serif";
                      const isCur = cur===f.val;
                      return <button key={f.val} onClick={()=>updSted(selIdx,"fontFamily",f.val)}
                        style={{ padding:"5px 10px",borderRadius:6,border:`1px solid ${isCur?"#6366f1":bdr}`,background:isCur?"rgba(99,102,241,0.2)":"transparent",color:isCur?"#a5b4fc":muted,cursor:"pointer",fontSize:11,fontWeight:isCur?700:400 }}>{f.label}</button>;
                    })}
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:4 }}>제목 크기 ({so.titleSize||curStyle.titleSize||32}px)</div>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    <button onClick={()=>updSted(selIdx,"titleSize",Math.max(16,(so.titleSize||curStyle.titleSize||32)-2))} style={{ ...btnSm }}>−</button>
                    <div style={{ flex:1,height:5,borderRadius:3,background:D?"rgba(255,255,255,0.1)":"#e8e8e8",overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:3,background:"#6366f1",width:`${((so.titleSize||curStyle.titleSize||32)-16)/(72-16)*100}%`,transition:"width 0.15s" }}/>
                    </div>
                    <button onClick={()=>updSted(selIdx,"titleSize",Math.min(72,(so.titleSize||curStyle.titleSize||32)+2))} style={{ ...btnSm }}>+</button>
                    {so.titleSize&&<button onClick={()=>updSted(selIdx,"titleSize",undefined)} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>↩</button>}
                  </div>
                </div>
                {/* 본문 크기 */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:4 }}>본문 크기 ({so.bodySize||curStyle.bodySize||15}px)</div>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    <button onClick={()=>updSted(selIdx,"bodySize",Math.max(8,(so.bodySize||curStyle.bodySize||15)-1))} style={{ ...btnSm }}>−</button>
                    <div style={{ flex:1,height:5,borderRadius:3,background:D?"rgba(255,255,255,0.1)":"#e8e8e8",overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:3,background:"#6366f1",width:`${((so.bodySize||curStyle.bodySize||15)-8)/(36-8)*100}%`,transition:"width 0.15s" }}/>
                    </div>
                    <button onClick={()=>updSted(selIdx,"bodySize",Math.min(36,(so.bodySize||curStyle.bodySize||15)+1))} style={{ ...btnSm }}>+</button>
                    {so.bodySize&&<button onClick={()=>updSted(selIdx,"bodySize",undefined)} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>↩</button>}
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:muted,marginBottom:4 }}>가로 정렬</div>
                    <div style={{ display:"flex",gap:3 }}>
                      {[["left","⬅"],["center","↔"],["right","➡"]].map(([v,icon])=>{
                        const cur=so.textAlign||curStyle.textAlign||"left";
                        return <button key={v} onClick={()=>updSted(selIdx,"textAlign",v)} style={{ flex:1,padding:"6px",borderRadius:6,border:`1px solid ${cur===v?"#6366f1":bdr}`,background:cur===v?"rgba(99,102,241,0.2)":"transparent",color:cur===v?"#a5b4fc":muted,cursor:"pointer",fontSize:13 }}>{icon}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:muted,marginBottom:4 }}>세로 정렬</div>
                    <div style={{ display:"flex",gap:3 }}>
                      {[["top","⬆"],["middle","↕"],["bottom","⬇"]].map(([v,icon])=>{
                        const cur=so.textValign||curStyle.textValign||"middle";
                        return <button key={v} onClick={()=>updSted(selIdx,"textValign",v)} style={{ flex:1,padding:"6px",borderRadius:6,border:`1px solid ${cur===v?"#6366f1":bdr}`,background:cur===v?"rgba(99,102,241,0.2)":"transparent",color:cur===v?"#a5b4fc":muted,cursor:"pointer",fontSize:13 }}>{icon}</button>;
                      })}
                    </div>
                  </div>
                </div>
                {so.bgImage ? (
                  <div style={{ display:"flex",gap:8,alignItems:"center",padding:"7px 10px",borderRadius:8,border:`1px solid ${bdr}`,background:inputBg }}>
                    <img src={so.bgImage} alt="" style={{ width:38,height:38,objectFit:"cover",borderRadius:5,flexShrink:0 }}/>
                    <span style={{ flex:1,fontSize:11,color:muted }}>배경 이미지 적용됨</span>
                    <button onClick={()=>updSted(selIdx,"bgImage",undefined)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer" }}>제거</button>
                  </div>
                ) : (
                  <button onClick={()=>bgFileRef.current?.click()} style={{ width:"100%",padding:"8px",borderRadius:8,border:`1.5px dashed ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer" }}>📸 배경 이미지 업로드</button>
                )}
              </div>

              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>saveOne(selIdx)} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",background:"#6366f1",color:"#fff",fontSize:13,fontWeight:800 }}>📥 PNG</button>
                <button onClick={saveAll} disabled={dlSt.busy} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",background:D?"rgba(255,255,255,0.1)":"#2c2c2c",color:"#fff",fontSize:13,fontWeight:800,opacity:dlSt.busy?0.7:1 }}>{dlSt.msg||"📦 ZIP"}</button>
              </div>
            </div>

            {/* 미리보기 */}
            <div style={{ flexShrink:0,width:260,display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
              <div style={{ fontSize:11,fontWeight:700,color:muted }}>미리보기</div>
              <div style={{ borderRadius:12,overflow:"hidden",boxShadow:"0 6px 28px rgba(0,0,0,0.35)",border:`1px solid ${bdr}`,width:"100%" }}>
                <SlideCanvas slide={curSlide} style={curStyle} CW={imgW} CH={imgH} displayW={258} bgImageSrc={so.bgImage||undefined}/>
              </div>
              <div style={{ fontSize:10,color:muted,textAlign:"center" }}>{imgW}×{imgH} · {curStyle.label||"커스텀"}</div>
              <div style={{ display:"flex",gap:6,width:"100%" }}>
                <button onClick={()=>setSelIdx(Math.max(0,selIdx-1))} disabled={selIdx===0} style={{ flex:1,padding:"8px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer",fontSize:13,opacity:selIdx===0?0.3:1 }}>‹</button>
                <span style={{ flex:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:muted }}>{selIdx+1} / {slides.length}</span>
                <button onClick={()=>setSelIdx(Math.min(slides.length-1,selIdx+1))} disabled={selIdx===slides.length-1} style={{ flex:1,padding:"8px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer",fontSize:13,opacity:selIdx===slides.length-1?0.3:1 }}>›</button>
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return null;
}
