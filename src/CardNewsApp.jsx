import { useState, useRef, useEffect } from "react";

function loadJSZip() {
  return new Promise(function(resolve, reject) {
    if (window.JSZip) { resolve(window.JSZip); return; }
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = function() { resolve(window.JSZip); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

var RATIOS = [
  { key:"1:1",  W:1080, H:1080 },
  { key:"9:16", W:1080, H:1920 },
  { key:"4:5",  W:1080, H:1350 },
];

var API_KEY = import.meta.env.VITE_API_KEY;
var BG_COLORS = [
  {key:"charcoal",  color:"#1c1c1e"}, {key:"navy",  color:"#0f1629"},
  {key:"indigo",    color:"#1e1b4b"}, {key:"violet",color:"#2e1065"},
  {key:"forest",    color:"#052e16"}, {key:"teal",  color:"#042f2e"},
  {key:"wine",      color:"#450a0a"}, {key:"rust",  color:"#431407"},
  {key:"slate",     color:"#0f172a"}, {key:"dark",  color:"#1c0a00"},
  {key:"white",     color:"#f8fafc"}, {key:"cream", color:"#fefce8"},
];

var TEXT_COLORS = ["#ffffff","#000000","#fef3c7","#dcfce7","#dbeafe","#fce7f3","#a5b4fc","#f0abfc"];

var DESIGN_PRESETS = [
  {key:"bold_dark",  label:"볼드 다크",  bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:30, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"900", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"minimal",    label:"미니멀",     bgColor:"#f8fafc", textColor:"#1e1b4b", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"left",   textValign:"bottom", hlMode:"underline", lineHeightTitle:1.35,lineHeightBody:1.7},
  {key:"neon",       label:"네온",       bgColor:"#0f172a", textColor:"#a5b4fc", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"warm_cream", label:"크림 웜",    bgColor:"#fefce8", textColor:"#7c2d12", titleSize:26, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"none",      lineHeightTitle:1.4, lineHeightBody:1.8},
  {key:"forest",     label:"포레스트",   bgColor:"#052e16", textColor:"#dcfce7", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"ocean",      label:"오션",       bgColor:"#0c1445", textColor:"#bae6fd", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3, lineHeightBody:1.7},
];

var EXAMPLES = [
  {label:"직장인 번아웃", text:"직장인 번아웃 극복법"},
  {label:"주식 입문",     text:"주식 투자 완전 초보 가이드"},
  {label:"다이어트",      text:"다이어트 식단 추천"},
  {label:"마음 챙김",     text:"하루 10분 마음 챙김 루틴"},
  {label:"재테크",        text:"2030 재테크 필수 습관"},
  {label:"홈트",          text:"집에서 할 수 있는 홈트 루틴"},
  {label:"SNS 성장",      text:"인스타그램 팔로워 늘리는 방법"},
  {label:"독서법",        text:"성인 자기계발 독서법"},
];

var PROMPT_EXAMPLES = [
  {
    label: "기본형",
    topic: "직장인 번아웃 극복법",
    prompt: "주제: 직장인 번아웃 극복법\n대상: 20-40대 직장인\n톤: 공감하되 실용적으로\n슬라이드 수: 6장"
  },
  {
    label: "상세 지시형",
    topic: "다이어트 식단",
    prompt: "주제: 다이어트 식단 추천\n대상: 운동 초보 여성\n톤: 친근하고 따뜻하게\n특이사항: 실천 가능한 쉬운 팁 위주, 숫자/통계 포함\n슬라이드 수: 8장"
  },
  {
    label: "마케팅형",
    topic: "인스타 팔로워 늘리기",
    prompt: "주제: 인스타그램 팔로워 1000명 만들기\n대상: SNS 초보자\n톤: 자신감 있고 임팩트 있게\n특이사항: 후킹 제목, 행동 유도 문구 포함\n슬라이드 수: 6장"
  },
  {
    label: "정보형",
    topic: "재테크 습관",
    prompt: "주제: 2030 재테크 필수 습관 5가지\n대상: 사회초년생\n톤: 전문적이지만 이해하기 쉽게\n특이사항: 각 슬라이드마다 핵심 수치 포함\n슬라이드 수: 7장"
  },
];

var SNS_LINKS = [
  {label:"카카오톡", url:"https://open.kakao.com/o/gIw9vTFg",           bg:"#FEE500", tc:"#3A1D1D"},
  {label:"인스타",   url:"https://www.instagram.com/nperinsight/",      bg:"#E1306C", tc:"#fff"},
  {label:"유튜브",   url:"https://www.youtube.com/@nperinsight/videos", bg:"#FF0000", tc:"#fff"},
];

var USAGE_KEY = "nper_ai_usage";
var SAVES_KEY = "nper_saved_works_v2";
var FREE_GUEST = 5;
var FREE_MEMBER = 20;

// ─── 사용량 ──────────────────────────────────────────────────────────────────
function getUsage() { try { return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}"); } catch(e) { return {}; } }
function getLeft(user) {
  var u = getUsage(); var k = user ? ("m_" + user.id) : "guest";
  var used = u[k] || 0; var lim = user ? FREE_MEMBER : FREE_GUEST;
  return { used: used, limit: lim, canUse: used < lim };
}
function consumeOne(user) {
  var u = getUsage(); var k = user ? ("m_" + user.id) : "guest";
  u[k] = (u[k] || 0) + 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch(e) {}
}

// ─── 보관함 ──────────────────────────────────────────────────────────────────
function getSavedWorks() { try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "[]"); } catch(e) { return []; } }
function saveWork(work) {
  var list = getSavedWorks();
  var idx = list.findIndex(function(w) { return w.id === work.id; });
  if (idx >= 0) { list[idx] = work; } else { list.unshift(work); }
  if (list.length > 20) { list = list.slice(0, 20); }
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); } catch(e) {}
  return list;
}
function deleteWork(id) {
  var list = getSavedWorks().filter(function(w) { return w.id !== id; });
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); } catch(e) {}
  return list;
}

// ─── 접속자 ──────────────────────────────────────────────────────────────────
function useOnlineCount() {
  var p = useState(1); var count = p[0]; var setCount = p[1];
  useEffect(function() {
    var myId = "u_" + Math.random().toString(36).slice(2, 8);
    var KEY = "nper_online_users";
    function hb() {
      try {
        var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        var now = Date.now();
        raw[myId] = now;
        Object.keys(raw).forEach(function(k) { if (now - raw[k] > 30000) { delete raw[k]; } });
        localStorage.setItem(KEY, JSON.stringify(raw));
        setCount(Object.keys(raw).length);
      } catch(e) {}
    }
    hb(); var t = setInterval(hb, 10000);
    return function() {
      clearInterval(t);
      try { var raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch(e) {}
    };
  }, []);
  return count;
}

function useWinW() {
  var p = useState(window.innerWidth); var w = p[0]; var setW = p[1];
  useEffect(function() {
    function fn() { setW(window.innerWidth); }
    window.addEventListener("resize", fn);
    return function() { window.removeEventListener("resize", fn); };
  }, []);
  return w;
}

// ─── 한글 안전 Canvas 폰트 ────────────────────────────────────────────────────
function getCanvasFont(weight, size, family) {
  var safeFamily = family && family !== "sans-serif" ? ("'" + family + "', ") : "";
  return weight + " " + size + "px " + safeFamily + "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
}

// ─── Canvas 줄바꿈 (한글 음절 단위) ──────────────────────────────────────────
function wrapText(ctx, text, maxW) {
  if (!text) { return [""]; }
  var lines = [];
  var paras = text.split("\n");
  for (var pi = 0; pi < paras.length; pi++) {
    var para = paras[pi];
    if (!para) { lines.push(""); continue; }
    var words = para.split(" ");
    var cur = "";
    for (var wi = 0; wi < words.length; wi++) {
      var word = words[wi];
      var test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur); cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) { lines.push(cur); }
  }
  return lines.length ? lines : [""];
}

// ─── drawSlide (완전 재작성 - 한글 최적화) ───────────────────────────────────
function drawSlide(canvas, slide, style, bgImgEl) {
  var rKey = style.ratio || "1:1";
  var rObj = RATIOS[0];
  for (var ri = 0; ri < RATIOS.length; ri++) { if (RATIOS[ri].key === rKey) { rObj = RATIOS[ri]; break; } }
  var CW = rObj.W; var CH = rObj.H;
  canvas.width = CW; canvas.height = CH;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CW, CH);

  // 배경
  if (bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
    var iR = bgImgEl.naturalWidth / bgImgEl.naturalHeight;
    var cR = CW / CH;
    var sw; var sh; var sx = 0; var sy = 0;
    if (iR > cR) { sh = CH; sw = CH * iR; sx = (CW - sw) / 2; }
    else { sw = CW; sh = CW / iR; sy = (CH - sh) / 2; }
    ctx.drawImage(bgImgEl, sx, sy, sw, sh);
    var op = style.bgOverlayOpacity !== undefined ? style.bgOverlayOpacity : 0.5;
    ctx.fillStyle = "rgba(0,0,0," + op + ")";
    ctx.fillRect(0, 0, CW, CH);
  } else {
    ctx.fillStyle = style.bgColor || "#1c1c1e";
    ctx.fillRect(0, 0, CW, CH);
  }

  // 장식 원
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = style.textColor || "#fff";
  ctx.beginPath(); ctx.arc(CW * 0.88, CH * 0.06, CW * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CW * 0.08, CH * 0.94, CW * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 텍스트 설정
  var tc     = style.textColor || "#ffffff";
  var al     = style.textAlign || "left";
  var va     = style.textValign || "middle";
  var ff     = style.fontFamily || "sans-serif";
  var SC     = CW / 420;
  var PAD    = Math.round(CW * 0.09);
  var padX   = PAD + (style.paddingX || 0) * SC;
  var maxW   = CW - padX * 2;

  var tSz  = Math.round((style.titleSize || 28) * SC);
  var bSz  = Math.round((style.bodySize || 13) * SC);
  var sSz  = Math.round((style.subtitleSize || 11) * SC);
  var hSz  = Math.round((style.highlightSize || 13) * SC);
  var lhT  = style.lineHeightTitle || 1.35;
  var lhB  = style.lineHeightBody || 1.7;
  var tw   = style.titleWeight || "800";

  // 줄 계산
  ctx.font = getCanvasFont(tw, tSz, ff);
  var titLines = wrapText(ctx, slide.title || "", maxW);
  ctx.font = getCanvasFont("600", sSz, ff);
  var subLines = slide.subtitle ? wrapText(ctx, slide.subtitle, maxW) : [];
  ctx.font = getCanvasFont("400", bSz, ff);
  var bodLines = slide.body ? wrapText(ctx, slide.body, maxW) : [];
  ctx.font = getCanvasFont("700", hSz, ff);
  var hlLines  = slide.highlight ? wrapText(ctx, slide.highlight, maxW) : [];

  // 전체 높이 계산
  var GAP_SUB  = Math.round(sSz * 0.5);
  var GAP_TIT  = Math.round(tSz * 0.6);
  var GAP_BOD  = Math.round(bSz * 0.6);
  var GAP_HL   = Math.round(hSz * 0.5);

  var totalH = 0;
  if (subLines.length) { totalH = totalH + subLines.length * Math.round(sSz * lhB) + GAP_SUB; }
  totalH = totalH + titLines.length * Math.round(tSz * lhT);
  if (bodLines.length) { totalH = totalH + GAP_TIT + bodLines.length * Math.round(bSz * lhB); }
  if (hlLines.length)  { totalH = totalH + GAP_BOD + hlLines.length * Math.round(hSz * 1.55); }

  // Y 시작점
  var minY = PAD + Math.round(sSz * 1.5);
  var startY;
  if (va === "top")    { startY = minY; }
  else if (va === "bottom") { startY = CH - PAD - totalH; }
  else { startY = Math.round((CH - totalH) / 2); }
  var y = Math.max(minY, startY);

  // 텍스트 정렬 헬퍼
  function getX(lineW) {
    if (al === "center") { return Math.round((CW - lineW) / 2); }
    if (al === "right")  { return CW - padX - lineW; }
    return padX;
  }
  function drawLines(ls, fnt, color, alpha, lineH) {
    ctx.font = fnt;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.textBaseline = "top";
    for (var li = 0; li < ls.length; li++) {
      var lw = ctx.measureText(ls[li]).width;
      ctx.fillText(ls[li], getX(lw), y);
      y = y + lineH;
    }
    ctx.globalAlpha = 1;
  }

  // 부제목
  if (subLines.length) {
    drawLines(subLines, getCanvasFont("600", sSz, ff), tc, 0.6, Math.round(sSz * lhB));
    y = y + GAP_SUB;
  }

  // 제목
  drawLines(titLines, getCanvasFont(tw, tSz, ff), tc, 1, Math.round(tSz * lhT));

  // 본문
  if (bodLines.length) {
    y = y + GAP_TIT;
    drawLines(bodLines, getCanvasFont("400", bSz, ff), tc, 0.85, Math.round(bSz * lhB));
  }

  // 하이라이트
  if (hlLines.length) {
    y = y + GAP_BOD;
    var hlMode = style.hlMode || "pill";
    var hlFont = getCanvasFont("700", hSz, ff);
    ctx.font = hlFont;
    var mxW = 0;
    for (var hi = 0; hi < hlLines.length; hi++) {
      var lw2 = ctx.measureText(hlLines[hi]).width;
      if (lw2 > mxW) { mxW = lw2; }
    }
    var pad2 = Math.round(hSz * 1.2);
    var blockH = hlLines.length * Math.round(hSz * 1.55) + Math.round(hSz * 0.5);
    var boxX = getX(mxW + pad2 * 2) - Math.round(hSz * 0.1);
    if (hlMode === "pill") {
      ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = tc;
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, Math.round(hSz * 0.7));
      ctx.fill(); ctx.restore();
    } else if (hlMode === "box") {
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.003);
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, 6);
      ctx.stroke(); ctx.restore();
    } else if (hlMode === "underline") {
      var ulX = getX(mxW);
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.004);
      ctx.beginPath(); ctx.moveTo(ulX, y + Math.round(hSz * 1.2)); ctx.lineTo(ulX + mxW, y + Math.round(hSz * 1.2));
      ctx.stroke(); ctx.restore();
    }
    drawLines(hlLines, hlFont, tc, 1, Math.round(hSz * 1.55));
  }
}

// ─── SlideCanvas ──────────────────────────────────────────────────────────────
function SlideCanvas(props) {
  var cRef = useRef(null);
  var slide = props.slide; var style = props.style; var bgUrl = props.bgUrl;
  var width = props.width || 360; var thumb = props.thumb || false;
  useEffect(function() {
    if (!cRef.current || !slide) { return; }
    if (bgUrl) {
      var img = new Image();
      img.onload = function() { if (cRef.current) { drawSlide(cRef.current, slide, style, img); } };
      img.src = bgUrl;
    } else { drawSlide(cRef.current, slide, style, null); }
  });
  if (!slide) { return null; }
  var rObj = RATIOS[0];
  for (var ri = 0; ri < RATIOS.length; ri++) { if (RATIOS[ri].key === (style.ratio || "1:1")) { rObj = RATIOS[ri]; break; } }
  return (
    <div style={{width:width, height:Math.round(width * rObj.H / rObj.W), borderRadius:thumb ? 6 : 12, overflow:"hidden", boxShadow:thumb ? "none" : "0 8px 40px rgba(0,0,0,0.55)", flexShrink:0}}>
      <canvas ref={cRef} style={{width:"100%", height:"100%", display:"block"}}/>
    </div>
  );
}

// ─── PresetCanvas (미리보기) ─────────────────────────────────────────────────
function PresetCanvas(props) {
  var dp = props.dp; var size = props.size || 110; var isC = props.isC;
  var cRef = useRef(null);
  useEffect(function() {
    if (!cRef.current) { return; }
    var sl = { title: dp.label, subtitle: "미리보기", body: "카드뉴스 스타일", highlight: "포인트" };
    drawSlide(cRef.current, sl, Object.assign({}, dp, {ratio:"1:1"}), null);
  }, [dp.key]);
  return (
    <div onClick={props.onClick}
      style={{cursor:"pointer", borderRadius:9, overflow:"hidden", border: isC ? "2.5px solid #6366f1" : "2px solid rgba(255,255,255,0.1)", boxShadow: isC ? "0 0 0 3px rgba(99,102,241,0.3)" : "none", position:"relative", flexShrink:0}}>
      <canvas ref={cRef} width={size} height={size} style={{display:"block", width:size, height:size}}/>
      <div style={{position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.75))", padding:"12px 6px 5px", fontSize:9, fontWeight:700, color:"#fff", textAlign:"center"}}>
        {dp.label}
        {isC && <span style={{marginLeft:4, color:"#a5b4fc"}}>✓</span>}
      </div>
    </div>
  );
}

// ─── 공통 UI ──────────────────────────────────────────────────────────────────
function FieldLabel(props) {
  return <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:5, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase"}}>{props.children}</div>;
}
function Sep() { return <div style={{borderTop:"1px solid rgba(255,255,255,0.07)", margin:"9px 0"}}/>; }
function SegBtn(props) {
  return (
    <button onClick={props.onClick} style={{flex:1, padding:"7px 2px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:props.active ? "rgba(99,102,241,0.55)" : "rgba(255,255,255,0.06)", color:props.active ? "#fff" : "rgba(255,255,255,0.4)"}}>
      {props.label}
    </button>
  );
}
function SliderRow(props) {
  return (
    <div style={{marginBottom:9}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
        <span style={{color:"rgba(255,255,255,0.5)", fontSize:11}}>{props.label}</span>
        <span style={{color:"#a5b4fc", fontSize:11, fontWeight:700}}>{props.value}{props.unit || "px"}</span>
      </div>
      <input type="range" min={props.minV} max={props.maxV} value={props.value}
        onChange={function(e) { props.onChange(Number(e.target.value)); }} style={{width:"100%"}}/>
    </div>
  );
}

// ─── 스타일 탭 ───────────────────────────────────────────────────────────────
function StyleTab(props) {
  var gs = props.gs; var updGs = props.updGs;
  var curBg = props.curBg; var bgRef = props.bgRef;
  var handleBg = props.handleBg; var onRemoveBg = props.onRemoveBg;
  var overlayVal = Math.round((gs.bgOverlayOpacity !== undefined ? gs.bgOverlayOpacity : 0.5) * 100);
  return (
    <div>
      <FieldLabel>배경 색상</FieldLabel>
      <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:10}}>
        {BG_COLORS.map(function(bc) {
          var isC = gs.bgColor === bc.color;
          return <div key={bc.key} onClick={function() { updGs("bgColor", bc.color); }} title={bc.key} style={{width:24, height:24, borderRadius:5, background:bc.color, cursor:"pointer", border: isC ? "2.5px solid #a5b4fc" : "2px solid rgba(255,255,255,0.15)"}}/>;
        })}
        <input type="color" value={gs.bgColor || "#1c1c1e"} onChange={function(e) { updGs("bgColor", e.target.value); }} style={{width:24, height:24, border:"none", background:"none", cursor:"pointer", padding:0}}/>
      </div>

      <FieldLabel>텍스트 색상</FieldLabel>
      <div style={{display:"flex", gap:5, marginBottom:10, flexWrap:"wrap"}}>
        {TEXT_COLORS.map(function(c) {
          var isC = gs.textColor === c;
          return <div key={c} onClick={function() { updGs("textColor", c); }} style={{width:22, height:22, borderRadius:5, background:c, cursor:"pointer", border: isC ? "2.5px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.15)"}}/>;
        })}
        <input type="color" value={gs.textColor || "#ffffff"} onChange={function(e) { updGs("textColor", e.target.value); }} style={{width:22, height:22, border:"none", background:"none", cursor:"pointer", padding:0}}/>
      </div>

      <FieldLabel>배경 사진</FieldLabel>
      <input ref={bgRef} type="file" accept="image/*" onChange={handleBg} style={{display:"none"}}/>
      <div style={{display:"flex", gap:6, marginBottom:8}}>
        <button onClick={function() { if (bgRef.current) { bgRef.current.click(); } }}
          style={{flex:1, padding:"7px 0", borderRadius:7, border:"1px dashed rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:11, cursor:"pointer"}}>
          {curBg ? "변경" : "업로드"}
        </button>
        {curBg && (
          <button onClick={onRemoveBg} style={{padding:"7px 12px", borderRadius:7, border:"1px solid rgba(255,80,80,0.3)", background:"rgba(255,60,60,0.08)", color:"#ff9090", fontSize:11, cursor:"pointer"}}>제거</button>
        )}
      </div>
      {curBg && <SliderRow label="어둡기" value={overlayVal} minV={0} maxV={90} unit="%" onChange={function(v) { updGs("bgOverlayOpacity", v / 100); }}/>}

      <Sep/>
      <FieldLabel>슬라이드 비율</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {RATIOS.map(function(r) {
          var isC = (gs.ratio || "1:1") === r.key;
          return (
            <button key={r.key} onClick={function() { updGs("ratio", r.key); }}
              style={{flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer", background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)", fontSize:11, fontWeight:700}}>
              {r.key}
            </button>
          );
        })}
      </div>

      <FieldLabel>하이라이트</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:8}}>
        {[["뱃지","pill"],["박스","box"],["밑줄","underline"],["없음","none"]].map(function(pr) {
          var isC = (gs.hlMode || "pill") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("hlMode", pr[1]); }}
              style={{flex:1, padding:"5px 2px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 레이아웃 탭 ──────────────────────────────────────────────────────────────
function LayoutTab(props) {
  var gs = props.gs; var updGs = props.updGs;
  var curSlide = props.curSlide; var curEd = props.curEd; var updEd = props.updEd;
  return (
    <div>
      <FieldLabel>텍스트 정렬</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {[["왼쪽","left"],["가운데","center"],["오른쪽","right"]].map(function(pr) {
          var isC = (gs.textAlign || "left") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("textAlign", pr[1]); }}
              style={{flex:1, padding:"6px 2px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <FieldLabel>세로 위치</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {[["상단","top"],["중앙","middle"],["하단","bottom"]].map(function(pr) {
          var isC = (gs.textValign || "middle") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("textValign", pr[1]); }}
              style={{flex:1, padding:"6px 2px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <SliderRow label="좌우 여백" value={gs.paddingX || 0} minV={0} maxV={40} onChange={function(v) { updGs("paddingX", v); }}/>
      <Sep/>
      <FieldLabel>현재 슬라이드 내용</FieldLabel>
      {[{k:"title",l:"제목"},{k:"subtitle",l:"부제목"},{k:"body",l:"본문"},{k:"highlight",l:"하이라이트"}].map(function(f) {
        var curV = (curEd[f.k] !== undefined) ? curEd[f.k] : ((curSlide && curSlide[f.k]) ? curSlide[f.k] : "");
        return (
          <div key={f.k} style={{marginBottom:8}}>
            <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:3}}>{f.l}</div>
            <textarea value={curV} rows={f.k === "body" ? 3 : 2}
              onChange={function(e) { updEd(f.k, e.target.value); }}
              style={{width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"5px 8px", color:"#fff", fontSize:11, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box"}}/>
          </div>
        );
      })}
    </div>
  );
}

// ─── 텍스트 탭 ────────────────────────────────────────────────────────────────
function TextTab(props) {
  var gs = props.gs; var updGs = props.updGs;
  var fonts = ["sans-serif","Malgun Gothic","Nanum Gothic","Georgia","Arial"];
  return (
    <div>
      <FieldLabel>폰트</FieldLabel>
      <div style={{display:"flex", flexWrap:"wrap", gap:4, marginBottom:10}}>
        {fonts.map(function(f) {
          var isC = (gs.fontFamily || "sans-serif") === f;
          return (
            <button key={f} onClick={function() { updGs("fontFamily", f); }}
              style={{padding:"4px 9px", borderRadius:16, border:"1px solid rgba(255,255,255,0.12)", background: isC ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.05)", color: isC ? "#fff" : "rgba(255,255,255,0.5)", fontSize:10, cursor:"pointer"}}>
              {f}
            </button>
          );
        })}
      </div>
      <FieldLabel>제목 굵기</FieldLabel>
      <div style={{display:"flex", gap:3, marginBottom:10}}>
        {[["가늘","300"],["보통","400"],["굵게","700"],["진하게","800"],["블랙","900"]].map(function(pr) {
          var isC = (gs.titleWeight || "800") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("titleWeight", pr[1]); }}
              style={{flex:1, padding:"5px 2px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <SliderRow label="제목 크기"       value={gs.titleSize || 28}     minV={14} maxV={52} onChange={function(v) { updGs("titleSize", v); }}/>
      <SliderRow label="부제목 크기"     value={gs.subtitleSize || 11}  minV={8}  maxV={24} onChange={function(v) { updGs("subtitleSize", v); }}/>
      <SliderRow label="본문 크기"       value={gs.bodySize || 13}      minV={8}  maxV={24} onChange={function(v) { updGs("bodySize", v); }}/>
      <SliderRow label="하이라이트 크기" value={gs.highlightSize || 13} minV={8}  maxV={28} onChange={function(v) { updGs("highlightSize", v); }}/>
      <Sep/>
      <FieldLabel>행간</FieldLabel>
      <SliderRow label="제목 행간" value={Math.round((gs.lineHeightTitle || 1.35) * 10)} minV={10} maxV={22} unit="×0.1" onChange={function(v) { updGs("lineHeightTitle", v / 10); }}/>
      <SliderRow label="본문 행간" value={Math.round((gs.lineHeightBody  || 1.7)  * 10)} minV={12} maxV={26} unit="×0.1" onChange={function(v) { updGs("lineHeightBody", v / 10); }}/>
    </div>
  );
}

// ─── 편집 패널 ────────────────────────────────────────────────────────────────
function EditPanel(props) {
  var gs = props.gs; var updGs = props.updGs;
  var etab = props.etab; var setEtab = props.setEtab;
  var curBg = props.curBg; var bgRef = props.bgRef;
  var handleBg = props.handleBg; var onRemoveBg = props.onRemoveBg;
  var curSlide = props.curSlide; var curEd = props.curEd; var updEd = props.updEd;
  var selPreset = props.selPreset; var applyPreset = props.applyPreset;
  return (
    <div style={{width:270, flexShrink:0, background:"rgba(0,0,0,0.4)", borderRight:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", height:"100%", overflowY:"auto"}}>
      <div style={{padding:"12px 12px 0"}}>
        <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:700, letterSpacing:0.6, marginBottom:8}}>디자인 프리셋</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10}}>
          {DESIGN_PRESETS.map(function(dp) {
            var isC = selPreset && selPreset.key === dp.key;
            return <PresetCanvas key={dp.key} dp={dp} size={72} isC={isC} onClick={function() { applyPreset(dp); }}/>;
          })}
        </div>
        <Sep/>
      </div>
      <div style={{display:"flex", gap:3, padding:"0 10px 8px"}}>
        <SegBtn label="스타일"   active={etab === "style"}  onClick={function() { setEtab("style"); }}/>
        <SegBtn label="레이아웃" active={etab === "layout"} onClick={function() { setEtab("layout"); }}/>
        <SegBtn label="텍스트"   active={etab === "text"}   onClick={function() { setEtab("text"); }}/>
      </div>
      <div style={{flex:1, overflowY:"auto", padding:"0 10px 16px"}}>
        {etab === "style"  && <StyleTab gs={gs} updGs={updGs} curBg={curBg} bgRef={bgRef} handleBg={handleBg} onRemoveBg={onRemoveBg}/>}
        {etab === "layout" && <LayoutTab gs={gs} updGs={updGs} curSlide={curSlide} curEd={curEd} updEd={updEd}/>}
        {etab === "text"   && <TextTab gs={gs} updGs={updGs}/>}
      </div>
    </div>
  );
}

// ─── 미리보기 패널 ────────────────────────────────────────────────────────────
function PreviewPanel(props) {
  var slides = props.slides; var idx = props.idx; var setIdx = props.setIdx;
  var merged = props.merged; var gs = props.gs; var curBg = props.curBg;
  var bgIs = props.bgIs; var sted = props.sted; var tname = props.tname;
  var dlSt = props.dlSt; var dlOne = props.dlOne; var dlZip = props.dlZip;
  var onNew = props.onNew; var onSave = props.onSave; var previewW = props.previewW;
  var prevDis = idx === 0; var nextDis = idx === slides.length - 1;
  var msgCol = dlSt.msg && dlSt.msg.indexOf("실패") >= 0 ? "#ff9090" : "#86efac";
  return (
    <div style={{flex:1, overflowY:"auto", padding:"14px 18px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:12}}>
      <div style={{width:"100%", maxWidth:previewW + 40, display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
        <div style={{width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:600}}>{tname}</div>
          <div style={{display:"flex", gap:5, alignItems:"center"}}>
            <button onClick={function() { setIdx(Math.max(0, idx - 1)); }} disabled={prevDis}
              style={{width:30, height:30, borderRadius:7, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.06)", color:"#fff", cursor: prevDis ? "not-allowed" : "pointer", fontSize:16, opacity: prevDis ? 0.25 : 1}}>
              &#8249;
            </button>
            <span style={{fontSize:11, color:"rgba(255,255,255,0.35)", minWidth:38, textAlign:"center"}}>{(idx + 1) + " / " + slides.length}</span>
            <button onClick={function() { setIdx(Math.min(slides.length - 1, idx + 1)); }} disabled={nextDis}
              style={{width:30, height:30, borderRadius:7, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.06)", color:"#fff", cursor: nextDis ? "not-allowed" : "pointer", fontSize:16, opacity: nextDis ? 0.25 : 1}}>
              &#8250;
            </button>
          </div>
        </div>

        <SlideCanvas slide={merged} style={gs} bgUrl={curBg} width={previewW}/>

        <div style={{display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center"}}>
          <button onClick={dlOne} disabled={dlSt.busy}
            style={{padding:"8px 20px", borderRadius:8, border:"none", cursor: dlSt.busy ? "not-allowed" : "pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:12, fontWeight:700, opacity: dlSt.busy ? 0.5 : 1}}>
            현재 저장
          </button>
          <button onClick={dlZip} disabled={dlSt.busy}
            style={{padding:"8px 20px", borderRadius:8, cursor: dlSt.busy ? "not-allowed" : "pointer", border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", fontSize:12, fontWeight:700, opacity: dlSt.busy ? 0.5 : 1}}>
            ZIP 전체
          </button>
          <button onClick={onSave}
            style={{padding:"8px 14px", borderRadius:8, border:"1px solid rgba(251,191,36,0.35)", background:"rgba(251,191,36,0.08)", color:"#fbbf24", fontSize:12, fontWeight:700, cursor:"pointer"}}>
            보관함 저장
          </button>
          <button onClick={onNew}
            style={{padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer"}}>
            새로 만들기
          </button>
        </div>
        {dlSt.msg && <div style={{fontSize:11, color:msgCol, textAlign:"center"}}>{dlSt.msg}</div>}
      </div>

      <div style={{width:"100%", maxWidth:previewW + 40}}>
        <div style={{fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:7, fontWeight:700}}>전체 ({slides.length}장)</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(70px,1fr))", gap:6}}>
          {slides.map(function(s, i) {
            var sm = Object.assign({}, s, (sted[i] || {}));
            var isC = i === idx;
            return (
              <div key={i} onClick={function() { setIdx(i); }}
                style={{cursor:"pointer", borderRadius:7, overflow:"hidden", border: isC ? "2px solid #6366f1" : "2px solid transparent", boxShadow: isC ? "0 0 0 2px rgba(99,102,241,0.35)" : "none", position:"relative"}}>
                <SlideCanvas slide={sm} style={gs} bgUrl={bgIs[i] || null} width={70} thumb={true}/>
                <div style={{position:"absolute", bottom:2, right:3, fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.85)", textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>
                  {i < 9 ? "0" + (i + 1) : "" + (i + 1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 기획 AI 패널 ─────────────────────────────────────────────────────────────
function PlannerPanel(props) {
  var onClose = props.onClose;
  var onApplySlides = props.onApplySlides;
  var p;
  p = useState(""); var planTopic = p[0]; var setPlanTopic = p[1];
  p = useState(""); var planNote = p[0]; var setPlanNote = p[1];
  p = useState(6); var planCnt = p[0]; var setPlanCnt = p[1];
  p = useState(""); var planResult = p[0]; var setPlanResult = p[1];
  p = useState(false); var planLoading = p[0]; var setPlanLoading = p[1];
  p = useState(""); var planErr = p[0]; var setPlanErr = p[1];
  p = useState(null); var parsedPlan = p[0]; var setParsedPlan = p[1];
  p = useState(0); var showExIdx = p[0]; var setShowExIdx = p[1];

  var selEx = PROMPT_EXAMPLES[showExIdx];

  async function runPlan() {
    if (!planTopic.trim()) { return; }
    setPlanLoading(true); setPlanErr(""); setPlanResult(""); setParsedPlan(null);
    try {
      var sysMsg = "당신은 인스타그램 카드뉴스 기획 전문가입니다.\n사용자가 주제와 요구사항을 주면, 각 슬라이드의 제목/부제목/본문/하이라이트 문구를 기획해주세요.\n반드시 아래 JSON 형식만 반환하세요:\n{\"topic\":\"최종 주제명\",\"slides\":[{\"index\":1,\"title\":\"제목\",\"subtitle\":\"부제목\",\"body\":\"본문 2-3문장\",\"highlight\":\"핵심 강조 문구\"}]}";
      var userMsg = "주제: " + planTopic + "\n슬라이드 수: " + planCnt + "장";
      if (planNote.trim()) { userMsg = userMsg + "\n추가 요청: " + planNote; }
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5", max_tokens:4000, system:sysMsg, messages:[{role:"user", content:userMsg}]})
      });
      if (!res.ok) { var e2 = await res.json().catch(function(){return{};}); setPlanErr("오류: " + ((e2.error && e2.error.message) ? e2.error.message : "다시 시도")); setPlanLoading(false); return; }
      var data = await res.json();
      var text = (data.content || []).map(function(b) { return b.text || ""; }).join("");
      var clean = text.split("```json").join("").split("```").join("").trim();
      var parsed = JSON.parse(clean);
      setParsedPlan(parsed);
      setPlanResult(JSON.stringify(parsed, null, 2));
    } catch(e3) { setPlanErr("오류: " + e3.message); }
    finally { setPlanLoading(false); }
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16}}
      onClick={function(e) { if (e.target === e.currentTarget) { onClose(); } }}>
      <div style={{width:"min(780px,100%)", maxHeight:"90vh", background:"#12103a", borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", display:"flex", flexDirection:"column", overflow:"hidden"}}>
        <div style={{padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:15, fontWeight:800}}>✨ 카드뉴스 기획 AI</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2}}>주제와 방향을 입력하면 슬라이드 문구를 자동으로 기획해드려요</div>
          </div>
          <button onClick={onClose} style={{background:"transparent", border:"none", color:"rgba(255,255,255,0.4)", fontSize:18, cursor:"pointer"}}>✕</button>
        </div>

        <div style={{flex:1, overflowY:"auto", display:"flex", gap:0}}>
          <div style={{width:340, flexShrink:0, padding:"16px", borderRight:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:0.6, marginBottom:6}}>명령어 예시</div>
              <div style={{display:"flex", gap:4, marginBottom:8}}>
                {PROMPT_EXAMPLES.map(function(ex, i) {
                  var isC = showExIdx === i;
                  return (
                    <button key={i} onClick={function() { setShowExIdx(i); }}
                      style={{flex:1, padding:"5px 2px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight: isC ? 700 : 400, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)", color: isC ? "#fff" : "rgba(255,255,255,0.45)"}}>
                      {ex.label}
                    </button>
                  );
                })}
              </div>
              <div style={{background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:8, padding:"10px 12px"}}>
                <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:4}}>예시 — {selEx.label}</div>
                <pre style={{fontSize:11, color:"rgba(255,255,255,0.7)", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{selEx.prompt}</pre>
                <button onClick={function() { setPlanTopic(selEx.topic); setPlanNote(selEx.prompt.split("\n").slice(1).join("\n")); }}
                  style={{marginTop:8, padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", background:"rgba(99,102,241,0.35)", color:"#fff", fontSize:10, fontWeight:700}}>
                  이 예시 사용하기
                </button>
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:0.6, marginBottom:5}}>주제 *</div>
              <input value={planTopic} onChange={function(e) { setPlanTopic(e.target.value); }} placeholder="예) 직장인 번아웃 극복법"
                style={{width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box"}}/>
            </div>

            <div style={{marginBottom:10}}>
              <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:0.6, marginBottom:5}}>추가 요청사항 (선택)</div>
              <textarea value={planNote} onChange={function(e) { setPlanNote(e.target.value); }} rows={4}
                placeholder={"대상: 20-40대 직장인\n톤: 공감하되 실용적으로\n특이사항: 숫자/통계 포함"}
                style={{width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:11, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.6}}/>
            </div>

            <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
              <span style={{fontSize:11, color:"rgba(255,255,255,0.4)"}}>슬라이드 수</span>
              <div style={{display:"flex", gap:4}}>
                {[4,5,6,7,8,10].map(function(n) {
                  var isC = planCnt === n;
                  return (
                    <button key={n} onClick={function() { setPlanCnt(n); }}
                      style={{width:28, height:28, borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background: isC ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={runPlan} disabled={planLoading || !planTopic.trim()}
              style={{width:"100%", padding:"11px", borderRadius:9, border:"none", cursor: (planLoading || !planTopic.trim()) ? "not-allowed" : "pointer", background: planTopic.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.2)", color: planTopic.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontSize:13, fontWeight:800, opacity: planLoading ? 0.7 : 1}}>
              {planLoading ? "기획 중..." : "✨ 기획 시작"}
            </button>
            {planErr && <div style={{fontSize:11, color:"#ff9090", marginTop:8, textAlign:"center"}}>{planErr}</div>}
          </div>

          <div style={{flex:1, padding:"16px", overflowY:"auto"}}>
            {!parsedPlan && !planLoading && (
              <div style={{height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(255,255,255,0.25)", textAlign:"center", padding:"40px 20px"}}>
                <div style={{fontSize:36}}>📋</div>
                <div style={{fontSize:13, fontWeight:600}}>왼쪽에서 주제를 입력하고</div>
                <div style={{fontSize:13, fontWeight:600}}>기획 시작 버튼을 눌러주세요</div>
                <div style={{fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:4, lineHeight:1.7}}>AI가 각 슬라이드의 제목, 부제목,<br/>본문, 하이라이트 문구를 자동으로 기획해요</div>
              </div>
            )}
            {planLoading && (
              <div style={{height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12}}>
                <div style={{fontSize:32}}>⚙️</div>
                <div style={{fontSize:14, fontWeight:700}}>기획 중...</div>
                <div style={{fontSize:11, color:"rgba(255,255,255,0.4)"}}>슬라이드 {planCnt}장 기획 중</div>
              </div>
            )}
            {parsedPlan && !planLoading && (
              <div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                  <div style={{fontSize:13, fontWeight:800, color:"#a5b4fc"}}>"{parsedPlan.topic}" · {(parsedPlan.slides || []).length}장</div>
                  <button onClick={function() { if (parsedPlan) { onApplySlides(parsedPlan); onClose(); } }}
                    style={{padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:12, fontWeight:800}}>
                    이 기획으로 편집 시작 →
                  </button>
                </div>
                {(parsedPlan.slides || []).map(function(sl) {
                  return (
                    <div key={sl.index} style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"12px 14px", marginBottom:8}}>
                      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                        <div style={{width:22, height:22, borderRadius:6, background:"rgba(99,102,241,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#a5b4fc", flexShrink:0}}>
                          {sl.index}
                        </div>
                        <div style={{fontSize:14, fontWeight:800, color:"#fff"}}>{sl.title}</div>
                      </div>
                      {sl.subtitle && (
                        <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:4, paddingLeft:30}}>부제목: {sl.subtitle}</div>
                      )}
                      {sl.body && (
                        <div style={{fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:4, paddingLeft:30}}>{sl.body}</div>
                      )}
                      {sl.highlight && (
                        <div style={{marginLeft:30, display:"inline-block", background:"rgba(99,102,241,0.25)", borderRadius:5, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#a5b4fc"}}>
                          ✦ {sl.highlight}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 보관함 팝업 ──────────────────────────────────────────────────────────────
function SavedWorksPanel(props) {
  var works = props.works; var onLoad = props.onLoad; var onDelete = props.onDelete; var onClose = props.onClose;
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center"}}
      onClick={function(e) { if (e.target === e.currentTarget) { onClose(); } }}>
      <div style={{width:500, maxHeight:"80vh", background:"#1a1740", borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", display:"flex", flexDirection:"column", overflow:"hidden"}}>
        <div style={{padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{fontSize:15, fontWeight:800}}>📁 내 보관함</div>
          <button onClick={onClose} style={{background:"transparent", border:"none", color:"rgba(255,255,255,0.4)", fontSize:18, cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1, overflowY:"auto", padding:"14px 18px"}}>
          {works.length === 0 && (
            <div style={{textAlign:"center", padding:"36px 0", color:"rgba(255,255,255,0.3)", fontSize:13}}>저장된 작품이 없어요</div>
          )}
          {works.map(function(w) {
            return (
              <div key={w.id} style={{display:"flex", gap:12, alignItems:"center", padding:"10px", borderRadius:10, border:"1px solid rgba(255,255,255,0.07)", marginBottom:8, background:"rgba(255,255,255,0.03)"}}>
                <div style={{width:48, height:48, borderRadius:8, overflow:"hidden", flexShrink:0, background:"#111"}}>
                  {w.thumb && <img src={w.thumb} style={{width:"100%", height:"100%", objectFit:"cover"}} alt=""/>}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{w.topic}</div>
                  <div style={{fontSize:11, color:"rgba(255,255,255,0.35)"}}>{w.count}장 · {w.date}</div>
                </div>
                <div style={{display:"flex", gap:6}}>
                  <button onClick={function() { onLoad(w); }}
                    style={{padding:"6px 12px", borderRadius:7, border:"none", cursor:"pointer", background:"rgba(99,102,241,0.5)", color:"#fff", fontSize:11, fontWeight:700}}>
                    불러오기
                  </button>
                  <button onClick={function() { onDelete(w.id); }}
                    style={{padding:"6px 9px", borderRadius:7, border:"1px solid rgba(255,80,80,0.3)", background:"transparent", color:"#ff9090", fontSize:11, cursor:"pointer"}}>
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 사이드바 ─────────────────────────────────────────────────────────────────
function Sidebar(props) {
  var page = props.page; var setPage = props.setPage;
  var hasSlides = props.hasSlides; var user = props.user;
  var onlineCount = props.onlineCount;
  var onShowSaved = props.onShowSaved;
  var onShowPlanner = props.onShowPlanner;
  var info = getLeft(user);
  var pct = Math.round(info.used * 100 / info.limit) + "%";
  return (
    <div style={{width:185, flexShrink:0, background:"rgba(0,0,0,0.45)", borderRight:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0}}>
      <div style={{padding:"18px 14px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{fontSize:14, fontWeight:900, letterSpacing:-0.3}}>엔퍼</div>
        <div style={{fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:1}}>카드뉴스 AI v2.2</div>
      </div>
      <div style={{padding:"8px 8px", flex:1, display:"flex", flexDirection:"column"}}>
        <div style={{fontSize:9, color:"rgba(255,255,255,0.2)", fontWeight:700, letterSpacing:1, padding:"3px 8px", marginBottom:2}}>MENU</div>
        {[
          {id:"home", label:"홈"},
          {id:"make", label:"카드뉴스 만들기"},
          {id:"edit", label:"편집 및 저장", hide:!hasSlides},
        ].map(function(item) {
          if (item.hide) { return null; }
          var isA = page === item.id;
          return (
            <button key={item.id} onClick={function() { setPage(item.id); }}
              style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background: isA ? "rgba(99,102,241,0.2)" : "transparent", color: isA ? "#a5b4fc" : "rgba(255,255,255,0.5)", fontSize:12, fontWeight: isA ? 700 : 400, textAlign:"left", marginBottom:1, borderLeft: isA ? "3px solid #6366f1" : "3px solid transparent"}}>
              {item.label}
            </button>
          );
        })}
        <button onClick={onShowPlanner}
          style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"rgba(99,102,241,0.07)", color:"#a5b4fc", fontSize:12, fontWeight:600, textAlign:"left", marginBottom:1, borderLeft:"3px solid rgba(99,102,241,0.3)"}}>
          ✨ 기획 AI
        </button>
        <button onClick={onShowSaved}
          style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:400, textAlign:"left", marginBottom:1, borderLeft:"3px solid transparent"}}>
          📁 내 보관함
        </button>

        <div style={{borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:6, paddingTop:6}}>
          <div style={{fontSize:9, color:"rgba(255,255,255,0.2)", fontWeight:700, letterSpacing:1, padding:"3px 8px", marginBottom:2}}>COMMUNITY</div>
          {SNS_LINKS.map(function(s) {
            return (
              <button key={s.label} onClick={function() { window.open(s.url, "_blank"); }}
                style={{width:"100%", display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:11, textAlign:"left", marginBottom:1}}>
                <div style={{width:11, height:11, borderRadius:3, background:s.bg, flexShrink:0}}/>
                {s.label}
              </button>
            );
          })}
          <button onClick={function() { window.open("https://open.kakao.com/o/gIw9vTFg", "_blank"); }}
            style={{width:"100%", display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"rgba(251,191,36,0.06)", color:"#fbbf24", fontSize:11, textAlign:"left"}}>
            <div style={{width:11, height:11, borderRadius:3, background:"#FEE500", flexShrink:0}}/>
            질문 및 건의방
          </button>
        </div>
      </div>

      <div style={{padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
          <div style={{fontSize:10, color:"rgba(255,255,255,0.3)"}}>{(user ? "회원" : "비회원") + " " + info.used + " / " + info.limit + "회"}</div>
          <div style={{display:"flex", alignItems:"center", gap:3}}>
            <div style={{width:5, height:5, borderRadius:"50%", background:"#4ade80"}}/>
            <span style={{fontSize:9, color:"rgba(255,255,255,0.3)"}}>{onlineCount}명</span>
          </div>
        </div>
        <div style={{height:3, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden"}}>
          <div style={{height:"100%", width:pct, background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── 홈 페이지 ────────────────────────────────────────────────────────────────
function PageHome(props) {
  var setPage = props.setPage; var setMakeStep = props.setMakeStep;
  var hasSlides = props.hasSlides; var tname = props.tname; var slideCnt = props.slideCnt;
  var savedWorks = props.savedWorks; var onShowSaved = props.onShowSaved; var onShowPlanner = props.onShowPlanner;
  return (
    <div style={{flex:1, overflowY:"auto", padding:"26px 26px 60px"}}>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:19, fontWeight:900, letterSpacing:-0.5, marginBottom:5}}>오늘은 어떤 카드뉴스를 만들어볼까요?</div>
        <div style={{fontSize:12, color:"rgba(255,255,255,0.4)"}}>주제만 입력하면 AI가 카드뉴스를 자동으로 만들어드려요</div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:10, marginBottom:26}}>
        <div onClick={function() { setPage("make"); setMakeStep(1); }}
          style={{background:"linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.18))", border:"1px solid rgba(99,102,241,0.3)", borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>✨</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3}}>카드뉴스 만들기</div>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.5}}>주제 입력 → AI 생성 → 편집</div>
          <div style={{marginTop:9, fontSize:11, color:"#a5b4fc", fontWeight:700}}>시작하기 →</div>
        </div>
        <div onClick={onShowPlanner}
          style={{background:"linear-gradient(135deg,rgba(139,92,246,0.25),rgba(168,85,247,0.15))", border:"1px solid rgba(139,92,246,0.3)", borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>📋</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3}}>기획 AI</div>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.5}}>제목·본문·하이라이트 자동 기획</div>
          <div style={{marginTop:9, fontSize:11, color:"#c4b5fd", fontWeight:700}}>기획하기 →</div>
        </div>
        {hasSlides && (
          <div onClick={function() { setPage("edit"); }}
            style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
            <div style={{fontSize:24, marginBottom:7}}>🎨</div>
            <div style={{fontSize:13, fontWeight:800, marginBottom:3}}>이어서 편집</div>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.45)"}}>{tname} · {slideCnt}장</div>
            <div style={{marginTop:9, fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700}}>편집하러 가기 →</div>
          </div>
        )}
        <div onClick={onShowSaved}
          style={{background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>📁</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3}}>내 보관함</div>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.45)"}}>{savedWorks.length}개 저장됨</div>
          <div style={{marginTop:9, fontSize:11, color:"#fbbf24", fontWeight:700}}>보러 가기 →</div>
        </div>
      </div>

      <div style={{marginBottom:12, fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)"}}>사용 방법</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, marginBottom:24}}>
        {[
          {n:"01", t:"주제 입력",   d:"만들 카드뉴스 주제를 입력"},
          {n:"02", t:"기획 AI",     d:"문구를 AI로 먼저 기획 가능"},
          {n:"03", t:"디자인 선택", d:"6가지 미리보기 프리셋 선택"},
          {n:"04", t:"편집 저장",   d:"색상·레이아웃 수정 후 PNG"},
        ].map(function(g) {
          return (
            <div key={g.n} style={{background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"12px"}}>
              <div style={{width:22, height:22, borderRadius:6, background:"rgba(99,102,241,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#a5b4fc", marginBottom:7}}>{g.n}</div>
              <div style={{fontSize:12, fontWeight:700, marginBottom:3}}>{g.t}</div>
              <div style={{fontSize:10, color:"rgba(255,255,255,0.35)", lineHeight:1.5}}>{g.d}</div>
            </div>
          );
        })}
      </div>

      <div style={{background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:10, padding:"12px 16px"}}>
        <div style={{fontSize:12, color:"#fbbf24", fontWeight:700, marginBottom:3}}>기능 개선 건의 · 질문방</div>
        <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.7}}>
          불편한 점이나 추가 기능은{" "}
          <a href="https://open.kakao.com/o/gIw9vTFg" target="_blank" style={{color:"#fbbf24", fontWeight:700}}>카카오톡 질문방</a>에 올려주세요!
        </div>
      </div>
    </div>
  );
}

// ─── 만들기 페이지 ────────────────────────────────────────────────────────────
function PageMake(props) {
  var topic = props.topic; var setTopic = props.setTopic;
  var cnt = props.cnt; var setCnt = props.setCnt;
  var makeStep = props.makeStep; var setMakeStep = props.setMakeStep;
  var selPreset = props.selPreset; var setSelPreset = props.setSelPreset;
  var loading = props.loading; var err = props.err;
  var tname = props.tname; var slides = props.slides;
  var setPage = props.setPage; var onGenerate = props.onGenerate;
  var onShowPlanner = props.onShowPlanner;
  var canGo = topic.trim().length > 0;
  return (
    <div style={{flex:1, overflowY:"auto", padding:"22px 26px 60px", maxWidth:720}}>
      <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:22}}>
        {[{n:1,l:"주제 입력"},{n:2,l:"디자인 선택"},{n:3,l:"AI 생성"}].map(function(st, si) {
          var done = makeStep > st.n; var active = makeStep === st.n;
          return (
            <div key={st.n} style={{display:"flex", alignItems:"center", gap:5}}>
              <div style={{display:"flex", alignItems:"center", gap:5, cursor: done ? "pointer" : "default"}}
                onClick={function() { if (done) { setMakeStep(st.n); } }}>
                <div style={{width:21, height:21, borderRadius:"50%", background: done ? "#6366f1" : (active ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"), border: active ? "2px solid #6366f1" : "2px solid transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color: (done || active) ? "#fff" : "rgba(255,255,255,0.25)"}}>
                  {done ? "✓" : st.n}
                </div>
                <span style={{fontSize:11, fontWeight: active ? 700 : 400, color: active ? "#fff" : (done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)")}}>{st.l}</span>
              </div>
              {si < 2 && <div style={{width:18, height:1, background:"rgba(255,255,255,0.15)"}}/>}
            </div>
          );
        })}
      </div>

      {makeStep === 1 && (
        <div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
            <div style={{fontSize:14, fontWeight:800}}>주제를 입력하세요</div>
            <button onClick={onShowPlanner}
              style={{padding:"6px 14px", borderRadius:7, border:"1px solid rgba(99,102,241,0.3)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", fontSize:11, fontWeight:700, cursor:"pointer"}}>
              ✨ 기획 AI 사용하기
            </button>
          </div>
          <div style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, padding:"16px", marginBottom:12}}>
            <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:7, fontWeight:700}}>예시 주제</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:12}}>
              {EXAMPLES.map(function(ex) {
                var isC = topic === ex.text;
                return (
                  <button key={ex.label} onClick={function() { setTopic(ex.text); }}
                    style={{padding:"5px 11px", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", background: isC ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", color: isC ? "#fff" : "rgba(255,255,255,0.6)", fontSize:11, cursor:"pointer", fontWeight:600}}>
                    {ex.label}
                  </button>
                );
              })}
            </div>
            <textarea value={topic} onChange={function(e) { setTopic(e.target.value); }}
              placeholder="주제를 직접 입력하세요..." rows={3}
              style={{width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box"}}/>
            <div style={{display:"flex", alignItems:"center", gap:8, marginTop:9}}>
              <span style={{color:"rgba(255,255,255,0.4)", fontSize:11}}>슬라이드 수</span>
              <div style={{display:"flex", gap:3}}>
                {[3,4,5,6,7,8,10,12].map(function(n) {
                  var isC = cnt === n;
                  return (
                    <button key={n} onClick={function() { setCnt(n); }}
                      style={{width:28, height:28, borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background: isC ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{display:"flex", justifyContent:"flex-end"}}>
            <button onClick={function() { if (canGo) { setMakeStep(2); } }} disabled={!canGo}
              style={{padding:"10px 24px", borderRadius:9, border:"none", cursor: canGo ? "pointer" : "not-allowed", background: canGo ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.2)", color: canGo ? "#fff" : "rgba(255,255,255,0.3)", fontSize:13, fontWeight:700}}>
              다음 →
            </button>
          </div>
        </div>
      )}

      {makeStep === 2 && (
        <div>
          <div style={{fontSize:14, fontWeight:800, marginBottom:3}}>디자인 스타일 선택</div>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:14}}>미리보기 확인 후 선택 (건너뛰기 가능)</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:9, marginBottom:16}}>
            {DESIGN_PRESETS.map(function(dp) {
              var isC = selPreset && selPreset.key === dp.key;
              return (
                <div key={dp.key} onClick={function() { setSelPreset(isC ? null : dp); }}
                  style={{borderRadius:10, overflow:"hidden", cursor:"pointer", border: isC ? "2.5px solid #6366f1" : "2px solid rgba(255,255,255,0.08)", boxShadow: isC ? "0 0 0 3px rgba(99,102,241,0.3)" : "none"}}>
                  <PresetCanvas dp={dp} size={128} isC={isC} onClick={function() {}}/>
                </div>
              );
            })}
          </div>
          {err && <div style={{padding:"7px 11px", borderRadius:7, background:"rgba(255,80,80,0.1)", color:"#ff9090", fontSize:12, marginBottom:10}}>{err}</div>}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <button onClick={function() { setMakeStep(1); }}
              style={{padding:"8px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:12, cursor:"pointer"}}>
              ← 이전
            </button>
            <button onClick={function() { setMakeStep(3); onGenerate(); }} disabled={loading}
              style={{padding:"10px 24px", borderRadius:9, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700}}>
              {loading ? "생성 중..." : "카드뉴스 생성"}
            </button>
          </div>
        </div>
      )}

      {makeStep === 3 && (
        <div style={{textAlign:"center", padding:"32px 0"}}>
          {loading && (
            <div>
              <div style={{fontSize:32, marginBottom:12}}>⚙️</div>
              <div style={{fontSize:14, fontWeight:700, marginBottom:5}}>AI가 카드뉴스를 기획하고 있어요...</div>
              <div style={{fontSize:12, color:"rgba(255,255,255,0.4)"}}>{cnt}장 생성 중</div>
            </div>
          )}
          {!loading && err && (
            <div>
              <div style={{fontSize:12, color:"#ff9090", marginBottom:12}}>{err}</div>
              <button onClick={function() { setMakeStep(2); }}
                style={{padding:"9px 20px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer"}}>다시 시도</button>
            </div>
          )}
          {!loading && !err && (
            <div>
              <div style={{fontSize:32, marginBottom:12}}>🎉</div>
              <div style={{fontSize:14, fontWeight:700, marginBottom:5}}>생성 완료!</div>
              <div style={{fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:16}}>{tname} · {slides.length}장</div>
              <button onClick={function() { setPage("edit"); }}
                style={{padding:"10px 28px", borderRadius:9, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800}}>
                편집하러 가기 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 앱 ──────────────────────────────────────────────────────────────────
export function CardNewsApp(props) {
  var user = props.user; var p;
  p = useState("home");  var page      = p[0]; var setPage      = p[1];
  p = useState(1);       var makeStep  = p[0]; var setMakeStep  = p[1];
  p = useState("");      var topic     = p[0]; var setTopic     = p[1];
  p = useState(6);       var cnt       = p[0]; var setCnt       = p[1];
  p = useState(null);    var selPreset = p[0]; var setSelPreset = p[1];
  p = useState([]);      var slides    = p[0]; var setSlides    = p[1];
  p = useState(0);       var idx       = p[0]; var setIdx       = p[1];
  p = useState(false);   var loading   = p[0]; var setLoading   = p[1];
  p = useState("");      var err       = p[0]; var setErr       = p[1];
  p = useState("");      var tname     = p[0]; var setTname     = p[1];
  p = useState("style"); var etab      = p[0]; var setEtab      = p[1];
  p = useState({busy:false, msg:""});
  var dlSt = p[0]; var setDlSt = p[1];
  p = useState({bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"left", textValign:"middle", hlMode:"pill", ratio:"1:1", fontFamily:"sans-serif", bgOverlayOpacity:0.5, paddingX:0, lineHeightTitle:1.35, lineHeightBody:1.7});
  var gs = p[0]; var setGs = p[1];
  p = useState({}); var sted = p[0]; var setSted = p[1];
  p = useState({}); var bgIs = p[0]; var setBgIs = p[1];
  p = useState(false); var showSaved   = p[0]; var setShowSaved   = p[1];
  p = useState(false); var showPlanner = p[0]; var setShowPlanner = p[1];
  p = useState(function() { return getSavedWorks(); });
  var savedWorks = p[0]; var setSavedWorks = p[1];

  var bgRef = useRef(null);
  var winW = useWinW();
  var onlineCount = useOnlineCount();
  var narrow = winW < 880;
  var curSlide = slides[idx] || null;
  var curEd    = sted[idx] || {};
  var merged   = curSlide ? Object.assign({}, curSlide, curEd) : null;
  var curBg    = bgIs[idx] || null;

  function updGs(k, v) { setGs(function(prev) { var n = Object.assign({}, prev); n[k] = v; return n; }); }
  function updEd(k, v) {
    setSted(function(prev) { var n = Object.assign({}, prev); n[idx] = Object.assign({}, prev[idx] || {}); n[idx][k] = v; return n; });
  }
  function applyPreset(dp) {
    setSelPreset(dp);
    setGs(function(prev) {
      return Object.assign({}, prev, {bgColor:dp.bgColor, textColor:dp.textColor, titleSize:dp.titleSize, bodySize:dp.bodySize, subtitleSize:dp.subtitleSize || 11, highlightSize:dp.highlightSize || 13, titleWeight:dp.titleWeight, textAlign:dp.textAlign, textValign:dp.textValign, hlMode:dp.hlMode, lineHeightTitle:dp.lineHeightTitle || 1.35, lineHeightBody:dp.lineHeightBody || 1.7});
    });
  }
  function handleApplyPlanSlides(parsed) {
    setSlides(parsed.slides || []); setTname(parsed.topic || topic);
    setIdx(0); setSted({}); setBgIs({}); setPage("edit");
  }
  function getEl(url) {
    if (!url) { return Promise.resolve(null); }
    return new Promise(function(res) { var im = new Image(); im.onload = function() { res(im); }; im.src = url; });
  }
  function handleBg(e) {
    var files = e.target.files; var f = files && files[0]; if (!f) { return; }
    var r = new FileReader();
    r.onload = function(ev) { setBgIs(function(prev) { var n = Object.assign({}, prev); n[idx] = ev.target.result; return n; }); };
    r.readAsDataURL(f); e.target.value = "";
  }
  function removeBg() { setBgIs(function(prev) { var n = Object.assign({}, prev); n[idx] = null; return n; }); }

  function handleSaveWork() {
    if (!slides.length) { return; }
    var id = "w_" + Date.now();
    var now = new Date();
    var ds = now.getFullYear() + "." + String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
    var thumb = null;
    try { var c = document.createElement("canvas"); drawSlide(c, Object.assign({}, slides[0], (sted[0] || {})), gs, null); thumb = c.toDataURL("image/jpeg", 0.5); } catch(e) {}
    var updated = saveWork({ id:id, topic:tname || topic, count:slides.length, date:ds, thumb:thumb, slides:slides, gs:gs, sted:sted });
    setSavedWorks(updated);
    setDlSt({busy:false, msg:"보관함에 저장됐어요!"});
    setTimeout(function() { setDlSt(function(prev) { return Object.assign({}, prev, {msg:""}); }); }, 2500);
  }
  function handleLoadWork(work) {
    setSlides(work.slides || []); setTname(work.topic || "");
    setGs(work.gs || gs); setSted(work.sted || {}); setBgIs({}); setIdx(0);
    setPage("edit"); setShowSaved(false);
  }
  function handleDeleteWork(id) { setSavedWorks(deleteWork(id)); }

  async function generate() {
    if (!topic.trim()) { return; }
    var left = getLeft(user);
    if (!left.canUse) { setErr(user ? "무료 횟수 초과" : "비회원 " + FREE_GUEST + "회 초과"); return; }
    setLoading(true); setErr("");
    try {
      var sysMsg = "인스타그램 카드뉴스 전문 카피라이터.\n반드시 JSON만 반환하세요.\n형식:{\"topic\":\"주제명\",\"slides\":[{\"index\":1,\"title\":\"제목\",\"subtitle\":\"부제목\",\"body\":\"본문\",\"highlight\":\"핵심문구\"}]}";
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5", max_tokens:4000, system:sysMsg, messages:[{role:"user", content:"주제: " + topic + "\n슬라이드 수: " + cnt + "장"}]})
      });
      if (!res.ok) {
        var e2 = await res.json().catch(function() { return {}; });
        setErr("오류(" + res.status + "): " + ((e2.error && e2.error.message) ? e2.error.message : "다시 시도")); setLoading(false); return;
      }
      var data = await res.json();
      var text = (data.content || []).map(function(b) { return b.text || ""; }).join("");
      var clean = text.split("```json").join("").split("```").join("").trim();
      var parsed = JSON.parse(clean);
      setSlides(parsed.slides || []); setTname(parsed.topic || topic);
      setIdx(0); setSted({}); setBgIs({});
      if (selPreset) { applyPreset(selPreset); }
      setPage("edit"); consumeOne(user);
    } catch(e3) { setErr("오류: " + e3.message); }
    finally { setLoading(false); }
  }

  async function dlOne() {
    if (!merged || dlSt.busy) { return; }
    setDlSt({busy:true, msg:"저장 중..."});
    try {
      var c = document.createElement("canvas"); var el = await getEl(curBg);
      drawSlide(c, merged, gs, el);
      var b64 = c.toDataURL("image/png"); var b = atob(b64.split(",")[1]);
      var arr = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) { arr[i] = b.charCodeAt(i); }
      var url = URL.createObjectURL(new Blob([arr], {type:"image/png"}));
      var a = document.createElement("a"); a.href = url; a.download = "slide_" + String(idx + 1).padStart(2, "0") + ".png"; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function() { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
      setDlSt({busy:false, msg:"저장 완료!"});
    } catch(e) { setDlSt({busy:false, msg:"실패: " + e.message}); }
  }

  async function dlZip() {
    if (!slides.length || dlSt.busy) { return; }
    setDlSt({busy:true, msg:"준비 중..."});
    try {
      var JSZip = await loadJSZip(); var zip = new JSZip();
      for (var i = 0; i < slides.length; i++) {
        var s = Object.assign({}, slides[i], (sted[i] || {}));
        setDlSt({busy:true, msg:"" + (i + 1) + " of " + slides.length});
        var c2 = document.createElement("canvas"); var el2 = await getEl(bgIs[i] || null);
        drawSlide(c2, s, gs, el2);
        var b2 = atob(c2.toDataURL("image/png").split(",")[1]);
        var arr2 = new Uint8Array(b2.length);
        for (var j = 0; j < b2.length; j++) { arr2[j] = b2.charCodeAt(j); }
        zip.file("slide_" + String(i + 1).padStart(2, "0") + ".png", arr2);
      }
      setDlSt({busy:true, msg:"ZIP 압축 중..."});
      var blob = await zip.generateAsync({type:"blob", compression:"DEFLATE", compressionOptions:{level:6}});
      var url2 = URL.createObjectURL(blob); var a2 = document.createElement("a");
      a2.href = url2; a2.download = (tname || "cardnews") + "_slides.zip"; a2.style.display = "none"; document.body.appendChild(a2); a2.click();
      setTimeout(function() { URL.revokeObjectURL(url2); document.body.removeChild(a2); }, 2000);
      setDlSt({busy:false, msg:"ZIP 완료!"});
    } catch(e2) { setDlSt({busy:false, msg:"ZIP 실패: " + e2.message}); }
  }

  var previewW = narrow ? Math.min(winW - 40, 320) : Math.min(Math.floor((winW - 270) * 0.52), 430);
  if (previewW < 240) { previewW = 240; }

  var CSS = "*{box-sizing:border-box;margin:0;padding:0}" +
    "input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;outline:none;background:rgba(255,255,255,0.15);width:100%}" +
    "input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#6366f1;cursor:pointer}" +
    "::-webkit-scrollbar{width:4px;height:4px}" +
    "::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}" +
    "a{text-decoration:none}button{font-family:inherit}";

  return (
    <div style={{display:"flex", height:"100vh", background:"linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)", color:"#fff", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif", overflow:"hidden"}}>
      <style>{CSS}</style>

      {showPlanner && (
        <PlannerPanel onClose={function() { setShowPlanner(false); }} onApplySlides={handleApplyPlanSlides}/>
      )}
      {showSaved && (
        <SavedWorksPanel works={savedWorks} onLoad={handleLoadWork} onDelete={handleDeleteWork} onClose={function() { setShowSaved(false); }}/>
      )}

      {!narrow && (
        <Sidebar page={page} setPage={setPage} hasSlides={slides.length > 0} user={user} onlineCount={onlineCount} onShowSaved={function() { setShowSaved(true); }} onShowPlanner={function() { setShowPlanner(true); }}/>
      )}

      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
        {narrow && (
          <div style={{height:44, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.3)", flexShrink:0}}>
            <span style={{fontSize:13, fontWeight:900}}>엔퍼 카드뉴스</span>
            <div style={{display:"flex", gap:5}}>
              <button onClick={function() { setShowPlanner(true); }}
                style={{padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", background:"rgba(99,102,241,0.25)", color:"#a5b4fc", fontSize:10, fontWeight:700}}>
                ✨기획AI
              </button>
              {[{id:"home",l:"홈"},{id:"make",l:"만들기"},{id:"edit",l:"편집"}].map(function(it) {
                if (it.id === "edit" && slides.length === 0) { return null; }
                var isA = page === it.id;
                return (
                  <button key={it.id} onClick={function() { setPage(it.id); }}
                    style={{padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", background: isA ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isA ? "#fff" : "rgba(255,255,255,0.4)", fontSize:10, fontWeight:700}}>
                    {it.l}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{flex:1, display:"flex", overflow:"hidden"}}>
          {page === "home" && (
            <PageHome setPage={setPage} setMakeStep={setMakeStep} hasSlides={slides.length > 0} tname={tname} slideCnt={slides.length} savedWorks={savedWorks} onShowSaved={function() { setShowSaved(true); }} onShowPlanner={function() { setShowPlanner(true); }}/>
          )}
          {page === "make" && (
            <PageMake topic={topic} setTopic={setTopic} cnt={cnt} setCnt={setCnt} makeStep={makeStep} setMakeStep={setMakeStep} selPreset={selPreset} setSelPreset={setSelPreset} loading={loading} err={err} tname={tname} slides={slides} setPage={setPage} onGenerate={generate} onShowPlanner={function() { setShowPlanner(true); }}/>
          )}
          {page === "edit" && slides.length > 0 && (
            <div style={{flex:1, display:"flex", height:"100%", overflow:"hidden"}}>
              <EditPanel gs={gs} updGs={updGs} etab={etab} setEtab={setEtab} curBg={curBg} bgRef={bgRef} handleBg={handleBg} onRemoveBg={removeBg} curSlide={curSlide} curEd={curEd} updEd={updEd} selPreset={selPreset} applyPreset={applyPreset}/>
              <PreviewPanel slides={slides} idx={idx} setIdx={setIdx} merged={merged} gs={gs} curBg={curBg} bgIs={bgIs} sted={sted} tname={tname} dlSt={dlSt} dlOne={dlOne} dlZip={dlZip} onNew={function() { setPage("make"); setMakeStep(1); }} onSave={handleSaveWork} previewW={previewW}/>
            </div>
          )}
          {page === "edit" && slides.length === 0 && (
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10}}>
              <div style={{fontSize:28}}>🎨</div>
              <div style={{fontSize:13, color:"rgba(255,255,255,0.4)"}}>아직 생성된 카드뉴스가 없어요</div>
              <button onClick={function() { setPage("make"); setMakeStep(1); }}
                style={{padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700}}>
                카드뉴스 만들기 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}