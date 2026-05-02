import { useState, useRef, useEffect } from "react";
import { changePoints, deleteLibraryItem, getAiUsage, setAiUsage, upsertLibraryItem } from "./storage";
import { callAI } from "./aiClient";
import { useI18n } from "./i18n";

function loadJSZip() {
  return new Promise(function(resolve, reject) {
    if (window.JSZip) { resolve(window.JSZip); return; }
    let s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = function() { resolve(window.JSZip); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

let RATIOS = [
  { key:"1:1",  W:1080, H:1080 },
  { key:"9:16", W:1080, H:1920 },
  { key:"4:5",  W:1080, H:1350 },
];

let BG_COLORS = [
  {key:"charcoal",  color:"#1c1c1e"}, {key:"navy",  color:"#0f1629"},
  {key:"indigo",    color:"#1e1b4b"}, {key:"violet",color:"#2e1065"},
  {key:"forest",    color:"#052e16"}, {key:"teal",  color:"#042f2e"},
  {key:"wine",      color:"#450a0a"}, {key:"rust",  color:"#431407"},
  {key:"slate",     color:"#0f172a"}, {key:"dark",  color:"#1c0a00"},
  {key:"white",     color:"#f8fafc"}, {key:"cream", color:"#fefce8"},
];

let TEXT_COLORS = ["#ffffff","#000000","#fef3c7","#dcfce7","#dbeafe","#fce7f3","#a5b4fc","#f0abfc"];

let DESIGN_PRESETS = [
  {key:"bold_dark",  labelKey:"cn_boldDark",  bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:30, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"900", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"minimal",    labelKey:"cn_minimal",    bgColor:"#f8fafc", textColor:"#1e1b4b", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"left",   textValign:"bottom", hlMode:"underline", lineHeightTitle:1.35,lineHeightBody:1.7},
  {key:"neon",       labelKey:"cn_neon",       bgColor:"#0f172a", textColor:"#a5b4fc", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"warm_cream", labelKey:"cn_warmCream",  bgColor:"#fefce8", textColor:"#7c2d12", titleSize:26, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"none",      lineHeightTitle:1.4, lineHeightBody:1.8},
  {key:"forest",     labelKey:"cn_forest",     bgColor:"#052e16", textColor:"#dcfce7", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3, lineHeightBody:1.7},
  {key:"ocean",      labelKey:"cn_ocean",      bgColor:"#0c1445", textColor:"#bae6fd", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3, lineHeightBody:1.7},
];

let EXAMPLES = [
  {labelKey:"cn_exBurnout",   text:"직장인 번아웃 극복법"},
  {labelKey:"cn_exStock",     text:"주식 투자 완전 초보 가이드"},
  {labelKey:"cn_exDiet",      text:"다이어트 식단 추천"},
  {labelKey:"cn_exMindful",   text:"하루 10분 마음 챙김 루틴"},
  {labelKey:"cn_exFinance",   text:"2030 재테크 필수 습관"},
  {labelKey:"cn_exHomeTrain", text:"집에서 할 수 있는 홈트 루틴"},
  {labelKey:"cn_exSnsGrowth", text:"인스타그램 팔로워 늘리는 방법"},
  {labelKey:"cn_exReading",   text:"성인 자기계발 독서법"},
];

let PROMPT_EXAMPLES = [
  {
    labelKey: "cn_promptBasic",
    topic: "직장인 번아웃 극복법",
    prompt: "주제: 직장인 번아웃 극복법\n대상: 20-40대 직장인\n톤: 공감하되 실용적으로\n슬라이드 수: 6장"
  },
  {
    labelKey: "cn_promptDetailed",
    topic: "다이어트 식단",
    prompt: "주제: 다이어트 식단 추천\n대상: 운동 초보 여성\n톤: 친근하고 따뜻하게\n특이사항: 실천 가능한 쉬운 팁 위주, 숫자/통계 포함\n슬라이드 수: 8장"
  },
  {
    labelKey: "cn_promptMarketing",
    topic: "인스타 팔로워 늘리기",
    prompt: "주제: 인스타그램 팔로워 1000명 만들기\n대상: SNS 초보자\n톤: 자신감 있고 임팩트 있게\n특이사항: 후킹 제목, 행동 유도 문구 포함\n슬라이드 수: 6장"
  },
  {
    labelKey: "cn_promptInfo",
    topic: "재테크 습관",
    prompt: "주제: 2030 재테크 필수 습관 5가지\n대상: 사회초년생\n톤: 전문적이지만 이해하기 쉽게\n특이사항: 각 슬라이드마다 핵심 수치 포함\n슬라이드 수: 7장"
  },
];

let SNS_LINKS = [
  {labelKey:"cn_kakao", url:"https://open.kakao.com/o/gIw9vTFg",           bg:"#FEE500", tc:"#3A1D1D"},
  {labelKey:"cn_insta", url:"https://www.instagram.com/nperinsight/",      bg:"#E1306C", tc:"#fff"},
  {labelKey:"cn_youtube", url:"https://www.youtube.com/@nperinsight/videos", bg:"#FF0000", tc:"#fff"},
];

let USAGE_KEY = "nper_ai_usage";
let SAVES_KEY = "nper_saved_works_v2";
let FREE_GUEST = 5;
let FREE_MEMBER = 20;

// ─── 사용량 ──────────────────────────────────────────────────────────────────
function getUsage() { try { return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}"); } catch(e) { return {}; } }
function getLeft(user) {
  let u = getUsage(); let k = user ? ("m_" + user.id) : "guest";
  let used = u[k] || 0; let lim = user ? FREE_MEMBER : FREE_GUEST;
  // 로그인 회원은 크레딧 있으면 무조건 허용, 비회원만 횟수 제한
  let canUse = user ? true : (used < lim);
  return { used: used, limit: lim, canUse: canUse };
}
function consumeOne(user) {
  let u = getUsage(); let k = user ? ("m_" + user.id) : "guest";
  u[k] = (u[k] || 0) + 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch(e) {}
  const su = getAiUsage(); const sk = user ? ("member_" + (user.uid || user.id || "u")) : "guest";
  const snu = { ...su }; snu[sk] = (su[sk] || 0) + 1; setAiUsage(snu);
}

// ─── 보관함 ──────────────────────────────────────────────────────────────────
function getSavedWorks() { try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "[]"); } catch(e) { return []; } }
function saveWork(work) {
  let list = getSavedWorks();
  let idx = list.findIndex(function(w) { return w.id === work.id; });
  if (idx >= 0) { list[idx] = work; } else { list.unshift(work); }
  if (list.length > 20) { list = list.slice(0, 20); }
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); } catch(e) {}
  try {
    const uid = JSON.parse(localStorage.getItem("nper_user") || "null")?.uid;
    if (uid) upsertLibraryItem(uid, "card", work);
  } catch(e) {}
  return list;
}
function deleteWork(id) {
  let list = getSavedWorks().filter(function(w) { return w.id !== id; });
  try { localStorage.setItem(SAVES_KEY, JSON.stringify(list)); } catch(e) {}
  try {
    const uid = JSON.parse(localStorage.getItem("nper_user") || "null")?.uid;
    if (uid) deleteLibraryItem(uid, "card", id);
  } catch(e) {}
  return list;
}

// ─── 접속자 ──────────────────────────────────────────────────────────────────
function useOnlineCount() {
  let p = useState(1); let count = p[0]; let setCount = p[1];
  useEffect(function() {
    let cancelled = false;
    let myId = "u_" + Math.random().toString(36).slice(2, 8);
    let KEY = "nper_online_users";
    function hb() {
      if (cancelled) return;
      try {
        let raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        let now = Date.now();
        raw[myId] = now;
        Object.keys(raw).forEach(function(k) { if (now - raw[k] > 30000) { delete raw[k]; } });
        localStorage.setItem(KEY, JSON.stringify(raw));
        if (!cancelled) setCount(Object.keys(raw).length);
      } catch(e) {}
    }
    hb(); let t = setInterval(hb, 15000);
    return function() {
      cancelled = true;
      clearInterval(t);
      try { let raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch(e) {}
    };
  }, []);
  return count;
}

function useWinW() {
  let p = useState(window.innerWidth); let w = p[0]; let setW = p[1];
  useEffect(function() {
    function fn() { setW(window.innerWidth); }
    window.addEventListener("resize", fn);
    return function() { window.removeEventListener("resize", fn); };
  }, []);
  return w;
}

// ─── 한글 안전 Canvas 폰트 ────────────────────────────────────────────────────
function getCanvasFont(weight, size, family) {
  let safeFamily = family && family !== "sans-serif" ? ("'" + family + "', ") : "";
  return weight + " " + size + "px " + safeFamily + "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
}

// ─── Canvas 줄바꿈 (한글 음절 단위) ──────────────────────────────────────────
function wrapText(ctx, text, maxW) {
  if (!text) { return [""]; }
  let lines = [];
  let paras = text.split("\n");
  for (let pi = 0; pi < paras.length; pi++) {
    let para = paras[pi];
    if (!para) { lines.push(""); continue; }
    let words = para.split(" ");
    let cur = "";
    for (let wi = 0; wi < words.length; wi++) {
      let word = words[wi];
      let test = cur ? cur + " " + word : word;
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

function parseAIJson(text) {
  let clean = (text || "").split("```json").join("").split("```").join("").trim();
  let jsonMatch = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : clean);
}

function applyFinalCommentPrompt(parsed, commentPrompt) {
  let result = Object.assign({}, parsed || {});
  let slides = Array.isArray(result.slides) ? result.slides.slice() : [];
  let prompt = (commentPrompt || "").trim();
  if (!slides.length || !prompt) { result.slides = slides; return result; }
  let lastIdx = slides.length - 1;
  let last = Object.assign({}, slides[lastIdx] || {});
  last.title = last.title || "댓글로 알려주세요";
  last.subtitle = last.subtitle || "마지막 안내";
  last.body = prompt;
  last.highlight = prompt.length > 28 ? "댓글로 참여해보세요" : prompt;
  slides[lastIdx] = last;
  result.slides = slides;
  return result;
}

function strengthenFirstSlide(parsed, fallbackTopic) {
  let result = Object.assign({}, parsed || {});
  let slides = Array.isArray(result.slides) ? result.slides.slice() : [];
  if (!slides.length) { result.slides = slides; return result; }
  let first = Object.assign({}, slides[0] || {});
  let topicText = (result.topic || fallbackTopic || "").trim();
  first.index = 1;
  first.isHookCover = true;
  first.badge = first.badge || "저장 필수";
  first.visualKeyword = first.visualKeyword || topicText || first.title || "business marketing";
  if (!first.title && topicText) { first.title = topicText; }
  if (first.title && first.title.length > 34) { first.title = first.title.slice(0, 32) + "..."; }
  if (first.subtitle && first.subtitle.length > 34) { first.subtitle = first.subtitle.slice(0, 32) + "..."; }
  if (first.body) {
    let sentence = String(first.body).split(/[.!?。]\s*|\n/).find(function(v) { return v.trim().length > 0; }) || first.body;
    first.body = sentence.trim().slice(0, 54);
  }
  if (!first.highlight) { first.highlight = "끝까지 보세요"; }
  if (first.highlight.length > 18) { first.highlight = first.highlight.slice(0, 18); }
  slides[0] = first;
  result.slides = slides;
  return result;
}

const CARDNEWS_HOOK_RULES = "\n\n[첫 장 후킹 커버 규칙]\n- 1번 슬라이드는 설명 페이지가 아니라 강한 후킹 커버입니다.\n- 1번 title은 12~24자 안에서 문제, 손실회피, 숫자, 반전, 즉시 얻는 이득 중 하나를 담아 클릭하고 싶게 작성하세요.\n- 1번 title에는 '가이드', '소개', '방법'처럼 밋밋한 단어만 단독으로 쓰지 마세요.\n- 1번 subtitle은 대상 독자나 긴급성을 20자 안팎으로 짧게 씁니다.\n- 1번 body는 비우거나 한 문장만 씁니다. 긴 설명은 2번 슬라이드부터 배치하세요.\n- 1번 highlight는 저장/확인/주의처럼 행동을 유도하는 6~14자 문구로 작성하세요.\n- 가능하면 1번 슬라이드에 badge 필드를 넣고 '저장 필수', '놓치면 손해', '바로 확인' 중 문맥에 맞게 사용하세요.\n- 1번 슬라이드에는 visualKeyword 필드를 반드시 넣으세요. 배경 사진 검색용 영어 키워드 2~5단어로, 실제로 보이면 좋은 장면/사물/상황을 구체적으로 씁니다. 예: skincare product, instagram analytics dashboard, office burnout, money saving wallet";

function proxiedImageUrl(url) {
  return url ? "/api/proxy-image?url=" + encodeURIComponent(url) : "";
}

async function findCardCoverImage(query, ratio) {
  let q = (query || "business marketing").trim();
  let portrait = ratio === "9:16" || ratio === "4:5";
  let orientation = portrait ? "portrait" : "landscape";
  try {
    let pex = await fetch("/api/proxy-pexels?path=v1/search&query=" + encodeURIComponent(q) + "&per_page=8&orientation=" + orientation).then(function(r) { return r.json(); }).catch(function() { return {}; });
    let p = (pex.photos || []).find(function(item) { return item?.src?.large2x || item?.src?.large || item?.src?.portrait; });
    if (p) { return proxiedImageUrl(p.src.large2x || p.src.large || p.src.portrait); }
  } catch(e) {}
  try {
    let uns = await fetch("/api/proxy-unsplash?query=" + encodeURIComponent(q) + "&per_page=8&orientation=" + orientation).then(function(r) { return r.json(); }).catch(function() { return {}; });
    let u = (uns.results || []).find(function(item) { return item?.urls?.regular || item?.urls?.full; });
    if (u) { return proxiedImageUrl(u.urls.regular || u.urls.full); }
  } catch(e) {}
  try {
    let pix = await fetch("/api/proxy-pixabay?q=" + encodeURIComponent(q) + "&per_page=8&safesearch=true&image_type=photo&orientation=" + (portrait ? "vertical" : "horizontal")).then(function(r) { return r.json(); }).catch(function() { return {}; });
    let px = (pix.hits || []).find(function(item) { return item?.largeImageURL || item?.webformatURL; });
    if (px) { return proxiedImageUrl(px.largeImageURL || px.webformatURL); }
  } catch(e) {}
  return proxiedImageUrl("https://picsum.photos/seed/" + encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-")) + "/1080/1350");
}

// ─── drawSlide (완전 재작성 - 한글 최적화) ───────────────────────────────────
function drawSlide(canvas, slide, style, bgImgEl) {
  let rKey = style.ratio || "1:1";
  let rObj = RATIOS[0];
  for (let ri = 0; ri < RATIOS.length; ri++) { if (RATIOS[ri].key === rKey) { rObj = RATIOS[ri]; break; } }
  let CW = rObj.W; let CH = rObj.H;
  canvas.width = CW; canvas.height = CH;
  let ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CW, CH);

  // 배경
  if (bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
    let iR = bgImgEl.naturalWidth / bgImgEl.naturalHeight;
    let cR = CW / CH;
    let sw; let sh; let sx = 0; let sy = 0;
    if (iR > cR) { sh = CH; sw = CH * iR; sx = (CW - sw) / 2; }
    else { sw = CW; sh = CW / iR; sy = (CH - sh) / 2; }
    ctx.drawImage(bgImgEl, sx, sy, sw, sh);
    let op = style.bgOverlayOpacity !== undefined ? style.bgOverlayOpacity : 0.5;
    ctx.fillStyle = "rgba(0,0,0," + op + ")";
    ctx.fillRect(0, 0, CW, CH);
  } else {
    ctx.fillStyle = style.bgColor || "#1c1c1e";
    ctx.fillRect(0, 0, CW, CH);
  }

  let isHookCover = !!(slide && slide.isHookCover);
  if (isHookCover && bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
    let grad = ctx.createLinearGradient(0, CH * 0.22, 0, CH);
    grad.addColorStop(0, "rgba(0,0,0,0.05)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);
  }

  // 장식 원
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = style.textColor || "#fff";
  ctx.beginPath(); ctx.arc(CW * 0.88, CH * 0.06, CW * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CW * 0.08, CH * 0.94, CW * 0.11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (isHookCover) {
    let tc0 = style.textColor || "#fff";
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = tc0;
    ctx.beginPath();
    ctx.roundRect(CW * 0.07, CH * 0.08, CW * 0.52, CH * 0.018, CH * 0.009);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CW * 0.86, CH * 0.18, CW * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 텍스트 설정
  let tc     = style.textColor || "#ffffff";
  let al     = isHookCover ? "left" : (style.textAlign || "left");
  let va     = isHookCover ? "bottom" : (style.textValign || "middle");
  let ff     = style.fontFamily || "sans-serif";
  let SC     = CW / 420;
  let PAD    = Math.round(CW * 0.09);
  let padX   = PAD + (style.paddingX || 0) * SC;
  let maxW   = CW - padX * 2;

  let tSz  = Math.round((style.titleSize || 28) * SC * (isHookCover ? 1.18 : 1));
  let bSz  = Math.round((style.bodySize || 13) * SC * (isHookCover ? 0.95 : 1));
  let sSz  = Math.round((style.subtitleSize || 11) * SC);
  let hSz  = Math.round((style.highlightSize || 13) * SC * (isHookCover ? 1.08 : 1));
  let lhT  = style.lineHeightTitle || 1.35;
  let lhB  = style.lineHeightBody || 1.7;
  let tw   = isHookCover ? "900" : (style.titleWeight || "800");

  // 줄 계산
  ctx.font = getCanvasFont(tw, tSz, ff);
  let titLines = wrapText(ctx, slide.title || "", maxW);
  ctx.font = getCanvasFont("600", sSz, ff);
  let subLines = slide.subtitle ? wrapText(ctx, slide.subtitle, maxW) : [];
  ctx.font = getCanvasFont("400", bSz, ff);
  let bodLines = slide.body ? wrapText(ctx, slide.body, maxW) : [];
  ctx.font = getCanvasFont("700", hSz, ff);
  let hlLines  = slide.highlight ? wrapText(ctx, slide.highlight, maxW) : [];

  // 전체 높이 계산
  let GAP_SUB  = Math.round(sSz * 0.5);
  let GAP_TIT  = Math.round(tSz * 0.6);
  let GAP_BOD  = Math.round(bSz * 0.6);
  let GAP_HL   = Math.round(hSz * 0.5);

  let badgeText = isHookCover ? (slide.badge || "저장 필수") : "";
  let badgeH = 0;
  if (badgeText) { badgeH = Math.round(sSz * 2.6); }
  let totalH = badgeH;
  if (badgeH) { totalH = totalH + Math.round(sSz * 0.7); }
  if (subLines.length) { totalH = totalH + subLines.length * Math.round(sSz * lhB) + GAP_SUB; }
  totalH = totalH + titLines.length * Math.round(tSz * lhT);
  if (bodLines.length) { totalH = totalH + GAP_TIT + bodLines.length * Math.round(bSz * lhB); }
  if (hlLines.length)  { totalH = totalH + GAP_BOD + hlLines.length * Math.round(hSz * 1.55); }

  // Y 시작점
  let minY = PAD + Math.round(sSz * 1.5);
  let startY;
  if (va === "top")    { startY = minY; }
  else if (va === "bottom") { startY = CH - PAD - totalH; }
  else { startY = Math.round((CH - totalH) / 2); }
  let y = Math.max(minY, startY);

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
    for (let li = 0; li < ls.length; li++) {
      let lw = ctx.measureText(ls[li]).width;
      ctx.fillText(ls[li], getX(lw), y);
      y = y + lineH;
    }
    ctx.globalAlpha = 1;
  }

  if (badgeText) {
    ctx.font = getCanvasFont("900", sSz, ff);
    let bw = ctx.measureText(badgeText).width + Math.round(sSz * 2.2);
    let bx = getX(bw);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.roundRect(bx, y, bw, badgeH, Math.round(badgeH / 2));
    ctx.fill();
    ctx.fillStyle = style.bgColor || "#111827";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, bx + Math.round(sSz * 1.1), y + badgeH / 2);
    ctx.restore();
    y = y + badgeH + Math.round(sSz * 0.7);
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
    let hlMode = style.hlMode || "pill";
    let hlFont = getCanvasFont("700", hSz, ff);
    ctx.font = hlFont;
    let mxW = 0;
    for (let hi = 0; hi < hlLines.length; hi++) {
      let lw2 = ctx.measureText(hlLines[hi]).width;
      if (lw2 > mxW) { mxW = lw2; }
    }
    let pad2 = Math.round(hSz * 1.2);
    let blockH = hlLines.length * Math.round(hSz * 1.55) + Math.round(hSz * 0.5);
    let boxX = getX(mxW + pad2 * 2) - Math.round(hSz * 0.1);
    if (hlMode === "pill") {
      ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = tc;
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, Math.round(hSz * 0.7));
      ctx.fill(); ctx.restore();
    } else if (hlMode === "box") {
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.003);
      ctx.beginPath(); ctx.roundRect(boxX, y - Math.round(hSz * 0.25), mxW + pad2 * 2, blockH, 6);
      ctx.stroke(); ctx.restore();
    } else if (hlMode === "underline") {
      let ulX = getX(mxW);
      ctx.save(); ctx.globalAlpha = 1; ctx.strokeStyle = tc; ctx.lineWidth = Math.round(CW * 0.004);
      ctx.beginPath(); ctx.moveTo(ulX, y + Math.round(hSz * 1.2)); ctx.lineTo(ulX + mxW, y + Math.round(hSz * 1.2));
      ctx.stroke(); ctx.restore();
    }
    drawLines(hlLines, hlFont, tc, 1, Math.round(hSz * 1.55));
  }
}

// ─── SlideCanvas ──────────────────────────────────────────────────────────────
function SlideCanvas(props) {
  let cRef = useRef(null);
  let slide = props.slide; let style = props.style; let bgUrl = props.bgUrl;
  let width = props.width || 360; let thumb = props.thumb || false;
  useEffect(function() {
    if (!cRef.current || !slide) { return; }
    if (bgUrl) {
      let img = new Image();
      img.onload = function() { if (cRef.current) { drawSlide(cRef.current, slide, style, img); } };
      img.src = bgUrl;
    } else { drawSlide(cRef.current, slide, style, null); }
  });
  if (!slide) { return null; }
  let rObj = RATIOS[0];
  for (let ri = 0; ri < RATIOS.length; ri++) { if (RATIOS[ri].key === (style.ratio || "1:1")) { rObj = RATIOS[ri]; break; } }
  return (
    <div style={{width:width, height:Math.round(width * rObj.H / rObj.W), borderRadius:thumb ? 6 : 12, overflow:"hidden", boxShadow:thumb ? "none" : "0 8px 40px rgba(0,0,0,0.55)", flexShrink:0}}>
      <canvas ref={cRef} style={{width:"100%", height:"100%", display:"block"}}/>
    </div>
  );
}

// ─── PresetCanvas (미리보기) ─────────────────────────────────────────────────
function PresetCanvas(props) {
  let dp = props.dp; let size = props.size || 110; let isC = props.isC;
  let cRef = useRef(null);
  let { t } = useI18n();
  let dpLabel = t(dp.labelKey);
  useEffect(function() {
    if (!cRef.current) { return; }
    let sl = { title: dpLabel, subtitle: t("cn_preview"), body: t("cn_cardStyle"), highlight: t("cn_point") };
    drawSlide(cRef.current, sl, Object.assign({}, dp, {ratio:"1:1"}), null);
  }, [dp.key]);
  return (
    <div onClick={props.onClick}
      style={{cursor:"pointer", borderRadius:9, overflow:"hidden", border: isC ? "2.5px solid #7c6aff" : "2px solid rgba(255,255,255,0.1)", boxShadow: isC ? "0 0 0 3px rgba(99,102,241,0.3)" : "none", position:"relative", flexShrink:0}}>
      <canvas ref={cRef} width={size} height={size} style={{display:"block", width:size, height:size}}/>
      <div style={{position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.75))", padding:"12px 6px 5px", fontSize:9, fontWeight:700, color:"#fff", textAlign:"center"}}>
        {dpLabel}
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
  let gs = props.gs; let updGs = props.updGs;
  let curBg = props.curBg; let bgRef = props.bgRef;
  let handleBg = props.handleBg; let onRemoveBg = props.onRemoveBg;
  let { t } = useI18n();
  let overlayVal = Math.round((gs.bgOverlayOpacity !== undefined ? gs.bgOverlayOpacity : 0.5) * 100);
  return (
    <div>
      <FieldLabel>{t("cn_bgColor")}</FieldLabel>
      <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:10}}>
        {BG_COLORS.map(function(bc) {
          let isC = gs.bgColor === bc.color;
          return <div key={bc.key} onClick={function() { updGs("bgColor", bc.color); }} title={bc.key} style={{width:24, height:24, borderRadius:5, background:bc.color, cursor:"pointer", border: isC ? "2.5px solid #a5b4fc" : "2px solid rgba(255,255,255,0.15)"}}/>;
        })}
        <input type="color" value={gs.bgColor || "#1c1c1e"} onChange={function(e) { updGs("bgColor", e.target.value); }} style={{width:24, height:24, border:"none", background:"none", cursor:"pointer", padding:0}}/>
      </div>

      <FieldLabel>{t("cn_textColor")}</FieldLabel>
      <div style={{display:"flex", gap:5, marginBottom:10, flexWrap:"wrap"}}>
        {TEXT_COLORS.map(function(c) {
          let isC = gs.textColor === c;
          return <div key={c} onClick={function() { updGs("textColor", c); }} style={{width:22, height:22, borderRadius:5, background:c, cursor:"pointer", border: isC ? "2.5px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.15)"}}/>;
        })}
        <input type="color" value={gs.textColor || "#ffffff"} onChange={function(e) { updGs("textColor", e.target.value); }} style={{width:22, height:22, border:"none", background:"none", cursor:"pointer", padding:0}}/>
      </div>

      <FieldLabel>{t("cn_bgPhoto")}</FieldLabel>
      <input ref={bgRef} type="file" accept="image/*" onChange={handleBg} style={{display:"none"}}/>
      <div style={{display:"flex", gap:6, marginBottom:8}}>
        <button onClick={function() { if (bgRef.current) { bgRef.current.click(); } }}
          style={{flex:1, padding:"7px 0", borderRadius:7, border:"1px dashed rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.45)", fontSize:11, cursor:"pointer"}}>
          {curBg ? t("cn_change") : t("cn_upload")}
        </button>
        {curBg && (
          <button onClick={onRemoveBg} style={{padding:"7px 12px", borderRadius:7, border:"1px solid rgba(255,80,80,0.3)", background:"rgba(255,60,60,0.08)", color:"#ff9090", fontSize:11, cursor:"pointer"}}>{t("cn_remove")}</button>
        )}
      </div>
      {curBg && <SliderRow label={t("cn_darkness")} value={overlayVal} minV={0} maxV={90} unit="%" onChange={function(v) { updGs("bgOverlayOpacity", v / 100); }}/>}

      <Sep/>
      <FieldLabel>{t("cn_slideRatio")}</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {RATIOS.map(function(r) {
          let isC = (gs.ratio || "1:1") === r.key;
          return (
            <button key={r.key} onClick={function() { updGs("ratio", r.key); }}
              style={{flex:1, padding:"6px 0", borderRadius:7, border:"none", cursor:"pointer", background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)", fontSize:11, fontWeight:700}}>
              {r.key}
            </button>
          );
        })}
      </div>

      <FieldLabel>{t("cn_highlight")}</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:8}}>
        {[[t("cn_hlBadge"),"pill"],[t("cn_hlBox"),"box"],[t("cn_hlUnderline"),"underline"],[t("cn_hlNone"),"none"]].map(function(pr) {
          let isC = (gs.hlMode || "pill") === pr[1];
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
  let gs = props.gs; let updGs = props.updGs;
  let curSlide = props.curSlide; let curEd = props.curEd; let updEd = props.updEd;
  let { t } = useI18n();
  return (
    <div>
      <FieldLabel>{t("cn_textAlign")}</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {[[t("cn_alignLeft"),"left"],[t("cn_alignCenter"),"center"],[t("cn_alignRight"),"right"]].map(function(pr) {
          let isC = (gs.textAlign || "left") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("textAlign", pr[1]); }}
              style={{flex:1, padding:"6px 2px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <FieldLabel>{t("cn_verticalPos")}</FieldLabel>
      <div style={{display:"flex", gap:4, marginBottom:10}}>
        {[[t("cn_posTop"),"top"],[t("cn_posMiddle"),"middle"],[t("cn_posBottom"),"bottom"]].map(function(pr) {
          let isC = (gs.textValign || "middle") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("textValign", pr[1]); }}
              style={{flex:1, padding:"6px 2px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <SliderRow label={t("cn_paddingX")} value={gs.paddingX || 0} minV={0} maxV={40} onChange={function(v) { updGs("paddingX", v); }}/>
      <Sep/>
      <FieldLabel>{t("cn_currentSlide")}</FieldLabel>
      {[{k:"badge",l:"후킹 배지"},{k:"title",l:t("cn_title")},{k:"subtitle",l:t("cn_subtitle")},{k:"body",l:t("cn_body")},{k:"highlight",l:t("cn_highlight")}].map(function(f) {
        let curV = (curEd[f.k] !== undefined) ? curEd[f.k] : ((curSlide && curSlide[f.k]) ? curSlide[f.k] : "");
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
  let gs = props.gs; let updGs = props.updGs;
  let { t } = useI18n();
  let fonts = ["sans-serif","Malgun Gothic","Nanum Gothic","Georgia","Arial"];
  return (
    <div>
      <FieldLabel>{t("cn_font")}</FieldLabel>
      <div style={{display:"flex", flexWrap:"wrap", gap:4, marginBottom:10}}>
        {fonts.map(function(f) {
          let isC = (gs.fontFamily || "sans-serif") === f;
          return (
            <button key={f} onClick={function() { updGs("fontFamily", f); }}
              style={{padding:"4px 9px", borderRadius:16, border:"1px solid rgba(255,255,255,0.12)", background: isC ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.05)", color: isC ? "#fff" : "rgba(255,255,255,0.5)", fontSize:10, cursor:"pointer"}}>
              {f}
            </button>
          );
        })}
      </div>
      <FieldLabel>{t("cn_titleWeight")}</FieldLabel>
      <div style={{display:"flex", gap:3, marginBottom:10}}>
        {[[t("cn_weightThin"),"300"],[t("cn_weightNormal"),"400"],[t("cn_weightBold"),"700"],[t("cn_weightHeavy"),"800"],[t("cn_weightBlack"),"900"]].map(function(pr) {
          let isC = (gs.titleWeight || "800") === pr[1];
          return (
            <button key={pr[1]} onClick={function() { updGs("titleWeight", pr[1]); }}
              style={{flex:1, padding:"5px 2px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, background: isC ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)", color: isC ? "#fff" : "rgba(255,255,255,0.4)"}}>
              {pr[0]}
            </button>
          );
        })}
      </div>
      <SliderRow label={t("cn_titleSize")}       value={gs.titleSize || 28}     minV={14} maxV={52} onChange={function(v) { updGs("titleSize", v); }}/>
      <SliderRow label={t("cn_subtitleSize")}   value={gs.subtitleSize || 11}  minV={8}  maxV={24} onChange={function(v) { updGs("subtitleSize", v); }}/>
      <SliderRow label={t("cn_bodySize")}       value={gs.bodySize || 13}      minV={8}  maxV={24} onChange={function(v) { updGs("bodySize", v); }}/>
      <SliderRow label={t("cn_highlightSize")} value={gs.highlightSize || 13} minV={8}  maxV={28} onChange={function(v) { updGs("highlightSize", v); }}/>
      <Sep/>
      <FieldLabel>{t("cn_lineHeight")}</FieldLabel>
      <SliderRow label={t("cn_titleLineHeight")} value={Math.round((gs.lineHeightTitle || 1.35) * 10)} minV={10} maxV={22} unit="×0.1" onChange={function(v) { updGs("lineHeightTitle", v / 10); }}/>
      <SliderRow label={t("cn_bodyLineHeight")} value={Math.round((gs.lineHeightBody  || 1.7)  * 10)} minV={12} maxV={26} unit="×0.1" onChange={function(v) { updGs("lineHeightBody", v / 10); }}/>
    </div>
  );
}

// ─── 편집 패널 ────────────────────────────────────────────────────────────────
function EditPanel(props) {
  let gs = props.gs; let updGs = props.updGs;
  let etab = props.etab; let setEtab = props.setEtab;
  let curBg = props.curBg; let bgRef = props.bgRef;
  let handleBg = props.handleBg; let onRemoveBg = props.onRemoveBg;
  let curSlide = props.curSlide; let curEd = props.curEd; let updEd = props.updEd;
  let selPreset = props.selPreset; let applyPreset = props.applyPreset;
  let { t } = useI18n();
  return (
    <div style={{width:270, flexShrink:0, background:"rgba(0,0,0,0.4)", borderRight:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", height:"100%", overflowY:"auto"}}>
      <div style={{padding:"12px 12px 0"}}>
        <div style={{fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:700, letterSpacing:0.6, marginBottom:8}}>{t("cn_designPreset")}</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10}}>
          {DESIGN_PRESETS.map(function(dp) {
            let isC = selPreset && selPreset.key === dp.key;
            return <PresetCanvas key={dp.key} dp={dp} size={72} isC={isC} onClick={function() { applyPreset(dp); }}/>;
          })}
        </div>
        <Sep/>
      </div>
      <div style={{display:"flex", gap:3, padding:"0 10px 8px"}}>
        <SegBtn label={t("cn_style")}   active={etab === "style"}  onClick={function() { setEtab("style"); }}/>
        <SegBtn label={t("cn_layout")} active={etab === "layout"} onClick={function() { setEtab("layout"); }}/>
        <SegBtn label={t("cn_text")}   active={etab === "text"}   onClick={function() { setEtab("text"); }}/>
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
  let slides = props.slides; let idx = props.idx; let setIdx = props.setIdx;
  let merged = props.merged; let gs = props.gs; let curBg = props.curBg;
  let bgIs = props.bgIs; let sted = props.sted; let tname = props.tname;
  let dlSt = props.dlSt; let dlOne = props.dlOne; let dlZip = props.dlZip;
  let onNew = props.onNew; let onSave = props.onSave; let previewW = props.previewW;
  let caption = props.caption || "";
  let { t } = useI18n();
  let prevDis = idx === 0; let nextDis = idx === slides.length - 1;
  let msgCol = dlSt.msg && dlSt.msg.indexOf("fail") >= 0 ? "#ff9090" : "#86efac";
  function copyCaption() {
    if (!caption.trim() || !navigator.clipboard) { return; }
    navigator.clipboard.writeText(caption).catch(function() {});
  }
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
            style={{padding:"8px 20px", borderRadius:8, border:"none", cursor: dlSt.busy ? "not-allowed" : "pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:12, fontWeight:700, opacity: dlSt.busy ? 0.5 : 1}}>
            {t("cn_saveCurrent")}
          </button>
          <button onClick={dlZip} disabled={dlSt.busy}
            style={{padding:"8px 20px", borderRadius:8, cursor: dlSt.busy ? "not-allowed" : "pointer", border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", fontSize:12, fontWeight:700, opacity: dlSt.busy ? 0.5 : 1}}>
            {t("cn_zipAll")}
          </button>
          <button onClick={onSave}
            style={{padding:"8px 14px", borderRadius:8, border:"1px solid rgba(251,191,36,0.35)", background:"rgba(251,191,36,0.08)", color:"#fbbf24", fontSize:12, fontWeight:700, cursor:"pointer"}}>
            {t("cn_saveToLib")}
          </button>
          <button onClick={onNew}
            style={{padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer"}}>
            {t("cn_createNew")}
          </button>
        </div>
        {dlSt.msg && <div style={{fontSize:11, color:msgCol, textAlign:"center"}}>{dlSt.msg}</div>}
      </div>

      {caption.trim() && (
        <div style={{width:"100%", maxWidth:previewW + 40, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"12px 14px", boxSizing:"border-box"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:8}}>
            <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:800}}>{t("cn_generatedCaption")}</div>
            <button onClick={copyCaption}
              style={{padding:"5px 10px", borderRadius:6, border:"1px solid rgba(99,102,241,0.35)", background:"rgba(99,102,241,0.12)", color:"#a5b4fc", fontSize:11, fontWeight:700, cursor:"pointer"}}>
              {t("copy")}
            </button>
          </div>
          <div style={{whiteSpace:"pre-wrap", color:"rgba(255,255,255,0.78)", fontSize:12, lineHeight:1.7}}>{caption}</div>
        </div>
      )}

      <div style={{width:"100%", maxWidth:previewW + 40}}>
        <div style={{fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:7, fontWeight:700}}>{t("cn_allSlides")} ({slides.length}{t("cn_slideUnit")})</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(70px,1fr))", gap:6}}>
          {slides.map(function(s, i) {
            let sm = Object.assign({}, s, (sted[i] || {}));
            let isC = i === idx;
            return (
              <div key={i} onClick={function() { setIdx(i); }}
                style={{cursor:"pointer", borderRadius:7, overflow:"hidden", border: isC ? "2px solid #7c6aff" : "2px solid transparent", boxShadow: isC ? "0 0 0 2px rgba(99,102,241,0.35)" : "none", position:"relative"}}>
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
export function PlannerPanel(props) {
  let onClose = props.onClose;
  let onApplySlides = props.onApplySlides;
  let isDark = props.theme !== "light";
  let { t } = useI18n();
  // ── 테마 색상 변수 ──────────────────────────────────────────────────────
  let panelBg   = isDark ? "#12103a"                  : "#ffffff";
  let innerBg   = isDark ? "#0f0c29"                  : "#f4f4f8";
  let headerBdr = isDark ? "rgba(255,255,255,0.08)"   : "#e5e3f5";
  let textMain  = isDark ? "#ffffff"                  : "#1a1a2e";
  let textMuted = isDark ? "rgba(255,255,255,0.4)"    : "#888";
  let textSub   = isDark ? "rgba(255,255,255,0.45)"   : "#6c757d";
  let inputBg   = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  let inputBdr  = isDark ? "rgba(255,255,255,0.12)"   : "#d8d6f0";
  let cardBg    = isDark ? "rgba(255,255,255,0.04)"   : "#f8f7ff";
  let cardBdr   = isDark ? "rgba(255,255,255,0.08)"   : "#e5e3f5";
  let accentBg  = isDark ? "rgba(99,102,241,0.25)"    : "rgba(99,102,241,0.08)";
  let accentBdr = isDark ? "rgba(99,102,241,0.5)"     : "rgba(99,102,241,0.3)";
  let tabBg     = isDark ? "rgba(255,255,255,0.07)"   : "#ede9fc";
  let tabActive = isDark ? "rgba(99,102,241,0.5)"     : "#7c6aff";
  let tabText   = isDark ? "rgba(255,255,255,0.45)"   : "#6c757d";
  let btnBg     = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f8";
  let btnBdr    = isDark ? "rgba(255,255,255,0.12)"   : "#d8d6f0";
  let exBg      = isDark ? "rgba(255,200,80,0.08)"    : "rgba(255,180,0,0.06)";
  let exBdr     = isDark ? "rgba(255,200,80,0.2)"     : "rgba(255,180,0,0.3)";
  let exText    = isDark ? "rgba(255,200,80,0.8)"     : "#b87800";
  let divider   = isDark ? inputBg   : "#e5e3f5";
  let slideBg   = isDark ? "rgba(99,102,241,0.08)"    : "#f0f0fc";
  let slideBdr  = isDark ? "rgba(99,102,241,0.2)"     : "#c7c4f0";
  let hlBg      = isDark ? "rgba(255,255,255,0.04)"   : "#fafafa";
  let errColor  = isDark ? "#ff9090"                  : "#e03e3e";
  let accentClr = isDark ? "#a5b4fc"                  : "#4f46e5";
  // ──────────────────────────────────────────────────────────────────────
  let p;
  p = useState(""); let planTopic = p[0]; let setPlanTopic = p[1];
  p = useState(""); let planNote = p[0]; let setPlanNote = p[1];
  p = useState(6); let planCnt = p[0]; let setPlanCnt = p[1];
  p = useState(""); let planResult = p[0]; let setPlanResult = p[1];
  p = useState(false); let planLoading = p[0]; let setPlanLoading = p[1];
  p = useState(""); let planErr = p[0]; let setPlanErr = p[1];
  p = useState(null); let parsedPlan = p[0]; let setParsedPlan = p[1];
  p = useState(0); let showExIdx = p[0]; let setShowExIdx = p[1];
  p = useState(props.initialMode || "topic"); let planMode = p[0]; let setPlanMode = p[1];
  p = useState(""); let urlInput = p[0]; let setUrlInput = p[1];
  p = useState(false); let urlLoading = p[0]; let setUrlLoading = p[1];
  p = useState(""); let urlErr = p[0]; let setUrlErr = p[1];

  let selEx = PROMPT_EXAMPLES[showExIdx];

  async function runUrlPlan() {
    if (!urlInput.trim()) { return; }
    setUrlLoading(true); setUrlErr(""); setParsedPlan(null);
    try {
      // Step 1: Crawl the URL
      let crawlRes = await fetch("/api/crawl", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url: urlInput.trim()})
      });
      let crawlData = await crawlRes.json();
      if (!crawlRes.ok || crawlData.error) { setUrlErr(t("cn_readFailed") + ": " + (crawlData.error || "")); setUrlLoading(false); return; }
      let pageText = crawlData.text || "";
      if (!pageText || pageText.length < 50) { setUrlErr(t("cn_readEmpty")); setUrlLoading(false); return; }

      // Step 2: Plan with AI
      let sysMsg = "You are a Korean card news planning expert. Respond ONLY with a JSON object. No explanation, no markdown, no text before or after. Just the raw JSON.\nFormat: {\"topic\":\"주제명\",\"caption\":\"SNS 게시글 캡션\",\"slides\":[{\"index\":1,\"title\":\"제목\",\"subtitle\":\"부제목\",\"body\":\"본문 2-3문장\",\"highlight\":\"핵심 강조 문구\",\"badge\":\"짧은 배지\"}]}" + CARDNEWS_HOOK_RULES;
      let userMsg = "다음 웹페이지 내용으로 카드뉴스 " + planCnt + "장을 기획해주세요.\n\n[페이지 내용]\n" + pageText;
      if (planNote.trim()) { userMsg = userMsg + "\n\n[추가 요청]\n" + planNote; }
      let text = await callAI("claude-haiku-4-5", [{role:"user", content:userMsg}], 4000, sysMsg).catch(function(e2) { setUrlErr(t("cn_error") + ": " + e2.message); setUrlLoading(false); return null; });
      if (text === null) return;
      let parsed = strengthenFirstSlide(parseAIJson(text), urlInput);
      setParsedPlan(parsed);
    } catch(e3) { setUrlErr(t("cn_error") + e3.message); }
    finally { setUrlLoading(false); }
  }

  async function runPlan() {
    if (!planTopic.trim()) { return; }
    setPlanLoading(true); setPlanErr(""); setPlanResult(""); setParsedPlan(null);
    try {
      let sysMsg = "당신은 인스타그램 카드뉴스 기획 전문가입니다.\n사용자가 주제와 요구사항을 주면, 각 슬라이드의 제목/부제목/본문/하이라이트 문구와 SNS 게시글 캡션을 기획해주세요.\n반드시 아래 JSON 형식만 반환하세요:\n{\"topic\":\"최종 주제명\",\"caption\":\"SNS 게시글 캡션\",\"slides\":[{\"index\":1,\"title\":\"제목\",\"subtitle\":\"부제목\",\"body\":\"본문 2-3문장\",\"highlight\":\"핵심 강조 문구\",\"badge\":\"짧은 배지\"}]}" + CARDNEWS_HOOK_RULES;
      let userMsg = "주제: " + planTopic + "\n슬라이드 수: " + planCnt + "장";
      if (planNote.trim()) { userMsg = userMsg + "\n추가 요청: " + planNote; }
      let text = await callAI("claude-haiku-4-5", [{role:"user", content:userMsg}], 4000, sysMsg).catch(function(e2) { setPlanErr(t("cn_error") + ": " + e2.message); setPlanLoading(false); return null; });
      if (text === null) return;
      let parsed = strengthenFirstSlide(parseAIJson(text), planTopic);
      setParsedPlan(parsed);
      setPlanResult(JSON.stringify(parsed, null, 2));
    } catch(e3) { setPlanErr(t("cn_error") + e3.message); }
    finally { setPlanLoading(false); }
  }

  let inline = !!props.inline;

  return (
    <>
      {!inline && <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:999}}
        onClick={function(e) { if (e.target === e.currentTarget && onClose) { onClose(); } }} />}
      <div style={inline
        ? {flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:innerBg}
        : {position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(780px,96vw)", maxHeight:"90vh", background:panelBg, borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", display:"flex", flexDirection:"column", overflow:"hidden", zIndex:1000}}>
        <div style={{padding:"16px 20px", borderBottom:"1px solid "+headerBdr, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:15, fontWeight:800}}>{"✨ " + t("cn_plannerTitle")}</div>
            <div style={{fontSize:11, color:textMuted, marginTop:2}}>{t("cn_plannerDesc")}</div>
          <div style={{display:"flex",gap:4,marginTop:10}}>
            {[{id:"topic",label:"✏️ " + t("cn_planByTopic")},{id:"url",label:"🔗 " + t("cn_planByLink")}].map(function(m){
              let isA = planMode === m.id;
              return(<button key={m.id} onClick={function(){setPlanMode(m.id);}} style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:isA?800:500,background:isA?tabActive:tabBg,color:isA?"#fff":tabText}}>{m.label}</button>);
            })}
          </div>
          </div>
          {!inline && <button onClick={onClose} style={{background:"transparent", border:"none", color:textMuted, fontSize:18, cursor:"pointer"}}>✕</button>}
        </div>

        <div style={{flex:1, overflowY:"auto", display:"flex", gap:0}}>
          <div style={{width:340, flexShrink:0, padding:"16px", borderRight:"1px solid "+divider}}>
            {planMode === "url" && (
              <div>
                <div style={{fontSize:10,color:textSub,fontWeight:700,letterSpacing:0.6,marginBottom:6}}>{t("cn_urlInput")}</div>
                <div style={{fontSize:11,color:exText,background:exBg,border:"1px solid rgba(255,200,80,0.2)",borderRadius:8,padding:"8px 12px",marginBottom:8,lineHeight:1.6}}>
                  {"⚠️ " + t("cn_urlWarning")}<br/>
                  {t("cn_urlWarningDetail1")}<br/>
                  {t("cn_urlWarningDetail2")}
                </div>
                <input value={urlInput} onChange={function(e){setUrlInput(e.target.value);}} placeholder="https://blog.naver.com/..."
                  style={{width:"100%",background:inputBg,border:"1px solid "+inputBdr,borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>
                <div style={{fontSize:10,color:textSub,fontWeight:700,letterSpacing:0.6,marginBottom:5}}>{t("cn_additionalReq")}</div>
                <textarea value={planNote} onChange={function(e){setPlanNote(e.target.value);}} rows={3}
                  placeholder={"톤: 친근하게\n대상: 20대 여성\n특이사항: 핵심만 요약"}
                  style={{width:"100%",background:inputBg,border:"1px solid "+inputBdr,borderRadius:8,padding:"9px 12px",color:"#fff",fontSize:11,outline:"none",resize:"none",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.6,marginBottom:10}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <span style={{fontSize:11,color:textMuted}}>{t("cn_slideCount")}</span>
                  <div style={{display:"flex",gap:4}}>
                    {[4,5,6,7,8,10].map(function(n){
                      let isC = planCnt === n;
                      return(<button key={n} onClick={function(){setPlanCnt(n);}} style={{width:28,height:28,borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:isC?"#7c6aff":tabBg,color:isC?"#fff":textSub}}>{n}</button>);
                    })}
                  </div>
                </div>
                <button onClick={runUrlPlan} disabled={urlLoading || !urlInput.trim()}
                  style={{width:"100%",padding:"11px",borderRadius:9,border:"none",cursor:(urlLoading||!urlInput.trim())?"not-allowed":"pointer",background:urlInput.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":"rgba(99,102,241,0.2)",color:urlInput.trim()?"#fff":"rgba(255,255,255,0.3)",fontSize:13,fontWeight:800,opacity:urlLoading?0.7:1}}>
                  {urlLoading ? t("cn_analyzingUrl") : "🔗 " + t("cn_urlAnalyze")}
                </button>
                {urlErr && <div style={{fontSize:11,color:errColor,marginTop:8,textAlign:"center"}}>{urlErr}</div>}
              </div>
            )}
            {planMode === "topic" && (
              <div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10, color:textSub, fontWeight:700, letterSpacing:0.6, marginBottom:6}}>{t("cn_promptExample")}</div>
                  <div style={{display:"flex", gap:4, marginBottom:8}}>
                    {PROMPT_EXAMPLES.map(function(ex, i) {
                      let isC = showExIdx === i;
                      return (
                        <button key={i} onClick={function() { setShowExIdx(i); }}
                          style={{flex:1, padding:"5px 2px", borderRadius:6, border:"none", cursor:"pointer", fontSize:10, fontWeight: isC ? 700 : 400, background: isC ? tabActive : tabBg, color: isC ? "#fff" : tabText}}>
                          {t(ex.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{background:slideBg, border:"1px solid "+slideBdr, borderRadius:8, padding:"10px 12px"}}>
                    <div style={{fontSize:10, color:textSub, marginBottom:4}}>{t("cn_exampleDash")} — {t(selEx.labelKey)}</div>
                    <pre style={{fontSize:11, color:textMain, lineHeight:1.7, margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{selEx.prompt}</pre>
                    <button onClick={function() { setPlanTopic(selEx.topic); setPlanNote(selEx.prompt.split("\n").slice(1).join("\n")); }}
                      style={{marginTop:8, padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", background:accentBg, color:"#fff", fontSize:10, fontWeight:700}}>
                      {t("cn_useThisExample")}
                    </button>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10, color:textSub, fontWeight:700, letterSpacing:0.6, marginBottom:5}}>{t("cn_topicRequired")}</div>
                  <input value={planTopic} onChange={function(e) { setPlanTopic(e.target.value); }} placeholder={t("cn_topicExPlaceholder")}
                    style={{width:"100%", background:inputBg, border:"1px solid "+inputBdr, borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10, color:textSub, fontWeight:700, letterSpacing:0.6, marginBottom:5}}>{t("cn_additionalReq")}</div>
                  <textarea value={planNote} onChange={function(e) { setPlanNote(e.target.value); }} rows={4}
                    placeholder={"대상: 20-40대 직장인\n톤: 공감하되 실용적으로\n특이사항: 숫자/통계 포함"}
                    style={{width:"100%", background:inputBg, border:"1px solid "+inputBdr, borderRadius:8, padding:"9px 12px", color:"#fff", fontSize:11, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.6}}/>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                  <span style={{fontSize:11, color:textMuted}}>{t("cn_slideCount")}</span>
                  <div style={{display:"flex", gap:4}}>
                    {[4,5,6,7,8,10].map(function(n) {
                      let isC = planCnt === n;
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
                  style={{width:"100%", padding:"11px", borderRadius:9, border:"none", cursor: (planLoading || !planTopic.trim()) ? "not-allowed" : "pointer", background: planTopic.trim() ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : "rgba(99,102,241,0.2)", color: planTopic.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontSize:13, fontWeight:800, opacity: planLoading ? 0.7 : 1}}>
                  {planLoading ? t("cn_planning") : "✨ " + t("cn_startPlanning")}
                </button>
                {planErr && <div style={{fontSize:11, color:errColor, marginTop:8, textAlign:"center"}}>{planErr}</div>}
              </div>
            )}
          </div>

          <div style={{flex:1, padding:"24px 28px", overflowY:"auto"}}>
            {!parsedPlan && !planLoading && (
              <div style={{height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:textMuted, textAlign:"center", padding:"40px 20px"}}>
                <div style={{fontSize:36}}>📋</div>
                <div style={{fontSize:13, fontWeight:600}}>{t("cn_planGuide1")}</div>
                <div style={{fontSize:13, fontWeight:600}}>{t("cn_planGuide2")}</div>
                <div style={{fontSize:11, color:textMuted, marginTop:4, lineHeight:1.7, whiteSpace:"pre-line"}}>{t("cn_planGuideDetail")}</div>
              </div>
            )}
            {planLoading && (
              <div style={{height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12}}>
                <div style={{fontSize:32}}>⚙️</div>
                <div style={{fontSize:14, fontWeight:700}}>{t("cn_planning")}</div>
                <div style={{fontSize:11, color:textMuted}}>{planCnt + t("cn_planSlideCount")}</div>
              </div>
            )}
            {parsedPlan && !planLoading && (
              <div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
                  <div style={{fontSize:13, fontWeight:800, color:accentClr}}>"{parsedPlan.topic}" · {(parsedPlan.slides || []).length}장</div>
                  <button onClick={function() { if (parsedPlan) { onApplySlides(parsedPlan); onClose(); } }}
                    style={{padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:12, fontWeight:800}}>
                    {t("cn_startEditing")}
                  </button>
                </div>
                {(parsedPlan.slides || []).map(function(sl) {
                  return (
                    <div key={sl.index} style={{background:cardBg, border:"1px solid "+cardBdr, borderRadius:10, padding:"12px 14px", marginBottom:8}}>
                      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                        <div style={{width:22, height:22, borderRadius:6, background:accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:accentClr, flexShrink:0}}>
                          {sl.index}
                        </div>
                        <div style={{fontSize:14, fontWeight:800, color:"#fff"}}>{sl.title}</div>
                      </div>
                      {sl.subtitle && (
                        <div style={{fontSize:11, color:textSub, marginBottom:4, paddingLeft:30}}>{t("cn_subtitleLabel")}: {sl.subtitle}</div>
                      )}
                      {sl.body && (
                        <div style={{fontSize:12, color:textMain, lineHeight:1.65, marginBottom:4, paddingLeft:30}}>{sl.body}</div>
                      )}
                      {sl.highlight && (
                        <div style={{marginLeft:30, display:"inline-block", background:accentBg, borderRadius:5, padding:"3px 10px", fontSize:11, fontWeight:700, color:accentClr}}>
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
    </>
  );
}

// ─── 보관함 팝업 ──────────────────────────────────────────────────────────────
function SavedWorksPanel(props) {
  let works = props.works; let onLoad = props.onLoad; let onDelete = props.onDelete; let onClose = props.onClose;
  let { t } = useI18n();
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center"}}
      onClick={function(e) { if (e.target === e.currentTarget) { onClose(); } }}>
      <div style={{width:500, maxHeight:"80vh", background:"#1a1740", borderRadius:16, border:"1px solid rgba(255,255,255,0.1)", display:"flex", flexDirection:"column", overflow:"hidden"}}>
        <div style={{padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div style={{fontSize:15, fontWeight:800}}>{"📁 " + t("cn_myLibrary")}</div>
          {!inline && <button onClick={onClose} style={{background:"transparent", border:"none", color:"rgba(255,255,255,0.4)", fontSize:18, cursor:"pointer"}}>✕</button>}
        </div>
        <div style={{flex:1, overflowY:"auto", padding:"14px 18px"}}>
          {works.length === 0 && (
            <div style={{textAlign:"center", padding:"36px 0", color:"rgba(255,255,255,0.3)", fontSize:13}}>{t("cn_noSavedWorks")}</div>
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
                    {t("cn_load")}
                  </button>
                  <button onClick={function() { onDelete(w.id); }}
                    style={{padding:"6px 9px", borderRadius:7, border:"1px solid rgba(255,80,80,0.3)", background:"transparent", color:"#ff9090", fontSize:11, cursor:"pointer"}}>
                    {t("delete")}
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
  let page = props.page; let setPage = props.setPage;
  let hasSlides = props.hasSlides; let user = props.user;
  let onlineCount = props.onlineCount;
  let onShowSaved = props.onShowSaved;
  let onShowPlanner = props.onShowPlanner;
  let isDark = props.theme !== "light";
  let { t } = useI18n();
  let info = getLeft(user);
  let pct = Math.round(info.used * 100 / info.limit) + "%";
  let sideBg      = isDark ? "rgba(0,0,0,0.45)"        : "#f0f0f8";
  let sideBdr     = isDark ? "rgba(255,255,255,0.07)"  : "#e5e3f5";
  let menuLabel   = isDark ? "rgba(255,255,255,0.2)"   : "rgba(99,102,241,0.45)";
  let itemText    = isDark ? "rgba(255,255,255,0.5)"   : "#6c757d";
  let itemHover   = isDark ? "rgba(99,102,241,0.1)"    : "rgba(99,102,241,0.08)";
  let itemActive  = isDark ? "#a5b4fc"                 : "#4f46e5";
  let itemActiveBg= isDark ? "rgba(99,102,241,0.2)"   : "rgba(99,102,241,0.1)";
  let brandText   = isDark ? "#fff"                    : "#1a1a2e";
  let brandSub    = isDark ? "rgba(255,255,255,0.3)"   : "rgba(99,102,241,0.5)";
  let comText     = isDark ? "rgba(255,255,255,0.45)"  : "#888";
  let usageText   = isDark ? "rgba(255,255,255,0.3)"   : "#aaa";
  let usageBar    = isDark ? "rgba(255,255,255,0.08)"  : "rgba(99,102,241,0.12)";
  let planLabel   = isDark ? "#a5b4fc"                 : "#4f46e5";
  return (
    <div style={{width:185, flexShrink:0, background:sideBg, borderRight:"1px solid "+sideBdr, display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0}}>
      <div style={{padding:"18px 14px 10px", borderBottom:"1px solid "+sideBdr}}>
        <div style={{fontSize:14, fontWeight:900, letterSpacing:-0.3, color:brandText}}>{t("cn_brand")}</div>
        <div style={{fontSize:9, color:brandSub, marginTop:1}}>{t("cn_brandSub")}</div>
      </div>
      <div style={{padding:"8px 8px", flex:1, display:"flex", flexDirection:"column"}}>
        <div style={{fontSize:9, color:menuLabel, fontWeight:700, letterSpacing:1, padding:"3px 8px", marginBottom:2}}>MENU</div>
        {[
          {id:"home", label:t("cn_menuHome")},
          {id:"edit", label:t("cn_menuEditSave"), hide:!hasSlides},
        ].map(function(item) {
          if (item.hide) { return null; }
          let isA = page === item.id;
          return (
            <button key={item.id} onClick={function() { setPage(item.id); }}
              style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background: isA ? itemActiveBg : "transparent", color: isA ? itemActive : itemText, fontSize:12, fontWeight: isA ? 700 : 400, textAlign:"left", marginBottom:1, borderLeft: isA ? "3px solid #7c6aff" : "3px solid transparent"}}>
              {item.label}
            </button>
          );
        })}
        <div style={{marginBottom:2}}>
          <div style={{padding:"6px 10px", fontSize:10, fontWeight:900, color:planLabel, letterSpacing:0.5, display:"flex", alignItems:"center", gap:5}}>
            {"✨ " + t("cn_plannerTitle")}
          </div>
          <button onClick={function(){onShowPlanner("topic");}}
            style={{width:"100%", padding:"6px 10px 6px 20px", borderRadius:7, border:"none", cursor:"pointer", background:"transparent", color:itemText, fontSize:11, fontWeight:400, textAlign:"left", marginBottom:1, borderLeft:"3px solid transparent"}}
            onMouseEnter={function(e){e.currentTarget.style.background=itemHover; e.currentTarget.style.color=itemActive;}}
            onMouseLeave={function(e){e.currentTarget.style.background="transparent"; e.currentTarget.style.color=itemText;}}>
            {"✏️ " + t("cn_planByTopicMenu")}
          </button>
          <button onClick={function(){onShowPlanner("link");}}
            style={{width:"100%", padding:"6px 10px 6px 20px", borderRadius:7, border:"none", cursor:"pointer", background:"transparent", color:itemText, fontSize:11, fontWeight:400, textAlign:"left", marginBottom:1, borderLeft:"3px solid transparent"}}
            onMouseEnter={function(e){e.currentTarget.style.background=itemHover; e.currentTarget.style.color=itemActive;}}
            onMouseLeave={function(e){e.currentTarget.style.background="transparent"; e.currentTarget.style.color=itemText;}}>
            {"🔗 " + t("cn_planByLinkMenu")}
          </button>
          <button onClick={function() { setPage("make"); }}
            style={{width:"100%", padding:"6px 10px 6px 20px", borderRadius:7, border:"none", cursor:"pointer", background: page === "make" ? itemActiveBg : "transparent", color: page === "make" ? itemActive : itemText, fontSize:11, fontWeight: page === "make" ? 700 : 400, textAlign:"left", marginBottom:1, borderLeft: page === "make" ? "3px solid #7c6aff" : "3px solid transparent"}}>
            {"🃏 " + t("cn_makeDirectMenu")}
          </button>
        </div>
        <button onClick={onShowSaved}
          style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer", background:"transparent", color:itemText, fontSize:12, fontWeight:400, textAlign:"left", marginBottom:1, borderLeft:"3px solid transparent"}}>
          {"📁 " + t("cn_myLibrary")}
        </button>

        <div style={{borderTop:"1px solid "+sideBdr, marginTop:6, paddingTop:6}}>
          <div style={{fontSize:9, color:menuLabel, fontWeight:700, letterSpacing:1, padding:"3px 8px", marginBottom:2}}>COMMUNITY</div>
          {SNS_LINKS.map(function(s) {
            return (
              <button key={s.label} onClick={function() { window.open(s.url, "_blank"); }}
                style={{width:"100%", display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"transparent", color:comText, fontSize:11, textAlign:"left", marginBottom:1}}>
                <div style={{width:11, height:11, borderRadius:3, background:s.bg, flexShrink:0}}/>
                {t(s.labelKey)}
              </button>
            );
          })}
          <button onClick={function() { window.open("https://open.kakao.com/o/gIw9vTFg", "_blank"); }}
            style={{width:"100%", display:"flex", alignItems:"center", gap:7, padding:"6px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"rgba(251,191,36,0.06)", color:"#fbbf24", fontSize:11, textAlign:"left"}}>
            <div style={{width:11, height:11, borderRadius:3, background:"#FEE500", flexShrink:0}}/>
            {t("cn_qaRoom")}
          </button>
        </div>
      </div>

      <div style={{padding:"10px 12px", borderTop:"1px solid "+sideBdr}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
          <div style={{fontSize:10, color:usageText}}>{(user ? t("cn_member") : t("cn_guest")) + " " + info.used + " / " + info.limit + t("cn_countUnit")}</div>
          <div style={{display:"flex", alignItems:"center", gap:3}}>
            <div style={{width:5, height:5, borderRadius:"50%", background:"#4ade80"}}/>
            <span style={{fontSize:9, color:usageText}}>{onlineCount}{t("cn_personUnit")}</span>
          </div>
        </div>
        <div style={{height:3, background:usageBar, borderRadius:2, overflow:"hidden"}}>
          <div style={{height:"100%", width:pct, background:"linear-gradient(90deg,#7c6aff,#8b5cf6)"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── 홈 페이지 ────────────────────────────────────────────────────────────────
function PageHome(props) {
  let setPage = props.setPage; let setMakeStep = props.setMakeStep;
  let hasSlides = props.hasSlides; let tname = props.tname; let slideCnt = props.slideCnt;
  let savedWorks = props.savedWorks; let onShowSaved = props.onShowSaved; let onShowPlanner = props.onShowPlanner;
  let D = props.theme !== "light";
  let { t } = useI18n();
  let bg    = D ? "transparent"              : "transparent";
  let text  = D ? "#fff"                     : "#1a1a2e";
  let muted = D ? "rgba(255,255,255,0.4)"    : "#888";
  let sub   = D ? "rgba(255,255,255,0.35)"   : "#aaa";
  let bdr   = D ? "rgba(255,255,255,0.08)"   : "#e5e3f5";
  let cardA = D ? "rgba(99,102,241,0.25)"    : "rgba(99,102,241,0.08)";
  let cardABdr = D ? "rgba(99,102,241,0.3)"  : "rgba(99,102,241,0.25)";
  let stepBg= D ? "rgba(255,255,255,0.02)"   : "#fff";
  let accentTxt = D ? "#a5b4fc"              : "#4f46e5";
  return (
    <div style={{flex:1, overflowY:"auto", padding:"26px 26px 60px", color:text}}>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:19, fontWeight:900, letterSpacing:-0.5, marginBottom:5, color:text}}>{t("cn_homeTitle")}</div>
        <div style={{fontSize:12, color:muted}}>{t("cn_homeDesc")}</div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:10, marginBottom:26}}>
        <div onClick={function() { setPage("make"); setMakeStep(1); }}
          style={{background: D ? "linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.18))" : "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))", border:"1px solid "+cardABdr, borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>✨</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3, color:text}}>{t("cn_makeCard")}</div>
          <div style={{fontSize:11, color:muted, lineHeight:1.5}}>{t("cn_makeCardFlow")}</div>
          <div style={{marginTop:9, fontSize:11, color:accentTxt, fontWeight:700}}>{t("cn_start")}</div>
        </div>
        <div onClick={onShowPlanner}
          style={{background: D ? "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(168,85,247,0.15))" : "linear-gradient(135deg,rgba(139,92,246,0.08),rgba(168,85,247,0.05))", border:"1px solid "+cardABdr, borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>📋</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3, color:text}}>{t("cn_planAI")}</div>
          <div style={{fontSize:11, color:muted, lineHeight:1.5}}>{t("cn_planAIDesc")}</div>
          <div style={{marginTop:9, fontSize:11, color:accentTxt, fontWeight:700}}>{t("cn_goPlan")}</div>
        </div>
        {hasSlides && (
          <div onClick={function() { setPage("edit"); }}
            style={{background: D ? "rgba(255,255,255,0.04)" : "#fff", border:"1px solid "+bdr, borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
            <div style={{fontSize:24, marginBottom:7}}>🎨</div>
            <div style={{fontSize:13, fontWeight:800, marginBottom:3, color:text}}>{t("cn_continueEdit")}</div>
            <div style={{fontSize:11, color:muted}}>{tname} · {slideCnt}{t("cn_slideUnit")}</div>
            <div style={{marginTop:9, fontSize:11, color:accentTxt, fontWeight:700}}>{t("cn_goEdit")}</div>
          </div>
        )}
        <div onClick={onShowSaved}
          style={{background: D ? "rgba(251,191,36,0.05)" : "rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:12, padding:"18px 16px", cursor:"pointer"}}>
          <div style={{fontSize:24, marginBottom:7}}>📁</div>
          <div style={{fontSize:13, fontWeight:800, marginBottom:3, color:text}}>{t("cn_myLibrary")}</div>
          <div style={{fontSize:11, color:muted}}>{savedWorks.length}{t("cn_savedCount")}</div>
          <div style={{marginTop:9, fontSize:11, color:"#f59e0b", fontWeight:700}}>{t("cn_goSee")}</div>
        </div>
      </div>

      <div style={{marginBottom:12, fontSize:12, fontWeight:700, color:sub}}>{t("cn_howToUse")}</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, marginBottom:24}}>
        {[
          {n:"01", tt:t("cn_step1Title"), d:t("cn_step1Desc")},
          {n:"02", tt:t("cn_step2Title"), d:t("cn_step2Desc")},
          {n:"03", tt:t("cn_step3Title"), d:t("cn_step3Desc")},
          {n:"04", tt:t("cn_step4Title"), d:t("cn_step4Desc")},
        ].map(function(g) {
          return (
            <div key={g.n} style={{background: D ? "rgba(255,255,255,0.02)" : "#fff", border:"1px solid "+bdr, borderRadius:10, padding:"12px"}}>
              <div style={{width:22, height:22, borderRadius:6, background:"rgba(99,102,241,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:accentTxt, marginBottom:7}}>{g.n}</div>
              <div style={{fontSize:12, fontWeight:700, marginBottom:3, color:text}}>{g.tt}</div>
              <div style={{fontSize:10, color:muted, lineHeight:1.5}}>{g.d}</div>
            </div>
          );
        })}
      </div>

      <div style={{background: D ? "rgba(251,191,36,0.05)" : "rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"12px 16px"}}>
        <div style={{fontSize:12, color:"#f59e0b", fontWeight:700, marginBottom:3}}>{t("cn_suggestion")}</div>
        <div style={{fontSize:11, color:muted, lineHeight:1.7}}>
          {t("cn_suggestionDesc")}{" "}
          <a href="https://open.kakao.com/o/gIw9vTFg" target="_blank" rel="noopener noreferrer" style={{color:"#f59e0b", fontWeight:700}}>{t("cn_suggestionLink")}</a>{t("cn_suggestionSuffix")}
        </div>
      </div>
    </div>
  );
}

// ─── 만들기 페이지 ────────────────────────────────────────────────────────────
function PageMake(props) {
  let winW = useWinW();
  let narrow = winW < 880;
  let { t } = useI18n();
  let topic = props.topic; let setTopic = props.setTopic;
  let cnt = props.cnt; let setCnt = props.setCnt;
  let makeStep = props.makeStep; let setMakeStep = props.setMakeStep;
  let selPreset = props.selPreset; let setSelPreset = props.setSelPreset;
  let loading = props.loading; let err = props.err;
  let tname = props.tname; let slides = props.slides;
  let setPage = props.setPage; let onGenerate = props.onGenerate;
  let onShowPlanner = props.onShowPlanner;
  let user = props.user;
  let postCaption = props.postCaption || "";
  let setPostCaption = props.setPostCaption;
  let canGo = topic.trim().length > 0;

  // ── 테마 변수 ──
  let D = props.theme !== "light";
  let text    = D ? "#fff"                     : "#1a1a2e";
  let muted   = D ? "rgba(255,255,255,0.4)"    : "#888";
  let sub     = D ? "rgba(255,255,255,0.35)"   : "#aaa";
  let bdr     = D ? "rgba(255,255,255,0.1)"    : "#e5e3f5";
  let inputBg = D ? "rgba(255,255,255,0.04)"   : "#fff";
  let inputBdr= D ? "rgba(255,255,255,0.12)"   : "#d8d6f0";
  let sectionBg=D ? "rgba(255,255,255,0.03)"   : "#fff";
  let tagBg   = D ? "rgba(255,255,255,0.06)"   : "#ede9fc";
  let tagClr  = D ? "rgba(255,255,255,0.6)"    : "#7c6aff";
  let tagAbg  = D ? "rgba(99,102,241,0.4)"     : "#7c6aff";
  let tagAClr = "#fff";
  let stepDone= D ? "#7c6aff"                  : "#7c6aff";
  let stepAct = D ? "rgba(99,102,241,0.5)"     : "rgba(99,102,241,0.15)";
  let stepInact= D ? "rgba(255,255,255,0.1)"   : "#e5e3f5";
  let stepActTxt= D ? "#fff"                   : "#7c6aff";
  let stepInTxt = D ? "rgba(255,255,255,0.25)" : "#bbb";
  let stepLbl = D ? "rgba(255,255,255,0.5)"    : "#888";
  let accentTxt = D ? "#a5b4fc"               : "#4f46e5";
  let errBg   = D ? "rgba(255,80,80,0.1)"      : "#fff0f0";
  let errClr  = D ? "#ff9090"                  : "#e03e3e";
  let prevBg  = D ? "transparent"              : "#f4f4f8";

  // 포인트/횟수 소진 체크
  const _pu = (function(){ try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
  const _pk = props.user ? ("member_" + (props.user.uid || "u")) : "guest";
  const _pused = _pu[_pk] || 0;
  const _plim = props.user ? 20 : 5;
  let _ppts = props.user ? (props.user.points || 0) : 0;
  // 회원: uid 있고 포인트가 명확히 0이고 20회 초과한 경우만 소진 화면
  // 포인트 정보가 없거나(undefined) 로드 안된 경우 → 허용 (사용 가능으로 처리)
  // 로그인 회원 = 차단 없음 (크레딧은 생성 시 차감), 비회원만 5회 초과 시 차단
  let _pEx = props.user ? false : (_pused >= _plim);

  if (_pEx) {
    return (
      <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center"}}>
        <div style={{maxWidth:380, width:"100%"}}>
          <div style={{fontSize:56, marginBottom:14}}>💎</div>
          <div style={{fontSize:19, fontWeight:900, color:text, marginBottom:8}}>
            {!props.user ? t("cn_freeUsedUp") : t("cn_pointsUsedUp")}
          </div>
          <div style={{fontSize:13, color:muted, lineHeight:1.9, marginBottom:24}}>
            {!props.user
              ? <>비회원 무료 5회를 모두 사용하셨어요.<br/>회원가입 후 5회 보너스를 받으세요!</>
              : <>잔여 횟수가 부족해요.<br/>플랜을 업그레이드하거나 관리자에게 문의해주세요.</>}
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {!props.user ? (
              <button onClick={function(){ if(typeof window.__onLoginRequest==="function") window.__onLoginRequest(); else window.location.hash="#home"; }}
                style={{width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:14, fontWeight:800}}>
                🚀 회원가입 / 로그인하기
              </button>
            ) : (
              <button onClick={function(){ window.location.hash = "#pricing"; }}
                style={{width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:800}}>
                플랜 업그레이드
              </button>
            )}
            <button onClick={function(){ window.location.hash = "#contact"; }}
              style={{width:"100%", padding:"11px", borderRadius:12, border:"1px solid "+bdr, background:"transparent", color:muted, fontSize:13, cursor:"pointer"}}>
              💬 관리자에게 문의하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{flex:1, overflowY:"auto", padding:"22px 26px 60px", maxWidth:720, margin:"0 auto", color:text}}>
      {/* 위저드 헤더 - ImageCardNewsApp 스타일 */}
      <div style={{display:"flex", alignItems:"center", gap:0, marginBottom:28}}>
        {[{n:1,l:t("cn_wizStep1")},{n:2,l:t("cn_wizStep2")},{n:3,l:t("cn_wizStep3")}].map(function(st, si) {
          let done = makeStep > st.n; let active = makeStep === st.n;
          return (
            <div key={st.n} style={{display:"flex", alignItems:"center", flex: si < 2 ? 1 : "auto"}}>
              <div style={{display:"flex", alignItems:"center", gap:8, cursor: done ? "pointer" : "default"}}
                onClick={function() { if (done) { setMakeStep(st.n); } }}>
                <div style={{width:28, height:28, borderRadius:"50%",
                  background: done ? "#7c6aff" : (active ? "#7c6aff" : (D ? "rgba(255,255,255,0.1)" : "#e5e5e5")),
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:900, flexShrink:0,
                  color: (done || active) ? "#fff" : (D ? "rgba(255,255,255,0.3)" : "#bbb")}}>
                  {done ? "✓" : st.n}
                </div>
                <span style={{fontSize:13, fontWeight: active ? 800 : 500,
                  color: active ? text : (D ? "rgba(255,255,255,0.4)" : "#888"), whiteSpace:"nowrap"}}>{st.l}</span>
              </div>
              {si < 2 && <div style={{flex:1, height:2, background: done ? "#7c6aff" : (D ? "rgba(255,255,255,0.1)" : "#e5e5e5"), margin:"0 12px", minWidth:16}}/>}
            </div>
          );
        })}
      </div>

      {makeStep === 1 && (
        <div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4}}>{t("cn_enterTopic")}</div>
            <div style={{fontSize:13, color:muted}}>{t("cn_enterTopicDesc")}</div>
          </div>

          {/* 예시 주제 */}
          <div style={{padding:"14px 18px", borderRadius:12, border:"1px solid "+bdr, background:sectionBg, marginBottom:16}}>
            <div style={{fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5}}>{"💡 " + t("cn_exampleTopics")}</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:12}}>
              {EXAMPLES.map(function(ex) {
                let isC = topic === ex.text;
                return (
                  <button key={ex.labelKey} onClick={function() { setTopic(ex.text); }}
                    style={{padding:"5px 12px", borderRadius:16, border:"1px solid "+(isC?"#7c6aff":bdr),
                      background: isC ? "rgba(99,102,241,0.15)" : tagBg,
                      color: isC ? "#a5b4fc" : tagClr,
                      fontSize:12, cursor:"pointer", fontWeight: isC ? 700 : 400, transition:"all 0.12s"}}>
                    {t(ex.labelKey)}
                  </button>
                );
              })}
            </div>
            <textarea value={topic} onChange={function(e) { setTopic(e.target.value); }}
              placeholder={t("cn_topicPlaceholder")}  rows={3}
              style={{width:"100%", background:inputBg, border:"1px solid "+inputBdr,
                borderRadius:9, padding:"10px 14px", color:text, fontSize:13,
                fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box", lineHeight:1.7}}/>
          </div>

          <div style={{padding:"14px 18px", borderRadius:12, border:"1px solid "+bdr, background:sectionBg, marginBottom:16}}>
            <div style={{fontSize:13, fontWeight:700, color:text, marginBottom:5}}>{t("cn_captionPromptLabel")}</div>
            <div style={{fontSize:11, color:muted, lineHeight:1.6, marginBottom:8}}>{t("cn_captionPromptDesc")}</div>
            <textarea value={postCaption} onChange={function(e) { if (setPostCaption) { setPostCaption(e.target.value); } }}
              placeholder={t("cn_captionPromptPlaceholder")} rows={3}
              style={{width:"100%", background:inputBg, border:"1px solid "+inputBdr,
                borderRadius:9, padding:"10px 14px", color:text, fontSize:13,
                fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7}}/>
          </div>

          {/* 슬라이드 수 */}
          <div style={{padding:"14px 18px", borderRadius:12, border:"1px solid "+bdr, background:sectionBg, marginBottom:16}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
              <div style={{fontSize:13, fontWeight:700, color:text}}>{t("cn_slideCountLabel")}</div>
              <div style={{fontSize:20, fontWeight:900, color:"#7c6aff"}}>{cnt}{t("cn_slideUnit")}</div>
            </div>
            <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
              {[3,4,5,6,7,8,10,12].map(function(n) {
                let isC = cnt === n;
                return (
                  <button key={n} onClick={function() { setCnt(n); }}
                    style={{width:36, height:36, borderRadius:9,
                      border:"1.5px solid "+(isC?"#7c6aff":bdr),
                      cursor:"pointer", fontSize:13, fontWeight:700,
                      background: isC ? "rgba(99,102,241,0.15)" : "transparent",
                      color: isC ? "#a5b4fc" : (D ? "rgba(255,255,255,0.5)" : "#666")}}>
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex", justifyContent:"flex-end"}}>
            <button onClick={function() { if (canGo) { setMakeStep(2); } }} disabled={!canGo}
              style={{padding:"14px 40px", borderRadius:12, border:"none",
                cursor: canGo ? "pointer" : "not-allowed",
                background: canGo ? "linear-gradient(135deg,#7c6aff,#8b5cf6)" : (D ? "rgba(99,102,241,0.2)" : "#e5e3f5"),
                color: canGo ? "#fff" : (D ? "rgba(255,255,255,0.3)" : "#bbb"),
                fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8}}>
              {t("cn_nextDesign")} <span style={{fontSize:12, opacity:0.8}}>{t("cn_designSelect")}</span>
            </button>
          </div>
        </div>
      )}

      {makeStep === 2 && (
        <div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4}}>{t("cn_selectDesignStyle")}</div>
            <div style={{fontSize:13, color:muted}}>{t("cn_selectDesignDesc")}</div>
          </div>
          <div style={{display:"flex", gap:20, minHeight:360, flexDirection: narrow ? "column" : "row"}}>
            <div style={{width: narrow ? "100%" : 300, flexShrink:0, display:"flex", flexDirection:"column"}}>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16}}>
                {DESIGN_PRESETS.map(function(dp) {
                  let isC = selPreset && selPreset.key === dp.key;
                  return (
                    <div key={dp.key} onClick={function() { setSelPreset(isC ? null : dp); }}
                      style={{borderRadius:12, overflow:"hidden", cursor:"pointer",
                        border: isC ? "2px solid #7c6aff" : "2px solid transparent",
                        boxShadow: isC ? "0 0 0 3px rgba(99,102,241,0.25)" : "0 2px 8px rgba(0,0,0,0.15)",
                        transition:"all 0.15s"}}>
                      <PresetCanvas dp={dp} size={86} isC={isC} onClick={function() {}}/>
                    </div>
                  );
                })}
              </div>
              {selPreset && (
                <div style={{padding:"9px 14px", borderRadius:9, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)", marginBottom:14}}>
                  <div style={{fontSize:12, fontWeight:700, color:"#a5b4fc", marginBottom:2}}>{"✓ " + t(selPreset.labelKey) + " " + t("cn_selected")}</div>
                  <button onClick={function(){setSelPreset(null);}} style={{fontSize:11,color:muted,background:"transparent",border:"none",cursor:"pointer",padding:0}}>{t("cn_deselect")}</button>
                </div>
              )}
              <div style={{marginTop:"auto"}}>
                {err && <div style={{padding:"7px 11px", borderRadius:7, background:errBg, color:errClr, fontSize:12, marginBottom:10}}>{err}</div>}
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <button onClick={function() { setMakeStep(1); }}
                    style={{padding:"12px 28px", borderRadius:12, border:"1px solid "+bdr,
                      background:"transparent", color:muted, fontSize:14, fontWeight:700, cursor:"pointer"}}>
                    {t("cn_previous")}
                  </button>
                  <div style={{textAlign:"right"}}>
                    {user && <div style={{fontSize:12, color:muted, marginBottom:6}}>{t("cn_expectedCost")}: <b style={{color:"#7c6aff"}}>10P</b></div>}
                    <button onClick={function() { setMakeStep(3); onGenerate(); }} disabled={loading}
                      style={{padding:"14px 40px", borderRadius:12, border:"none", cursor:"pointer",
                        background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:900,
                        display:"flex", alignItems:"center", gap:8}}>
                      {loading ? t("cn_generating") : user ? <>{t("cn_generateCard")} 💎 10P</> : "✦ " + t("cn_generateOnce")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {!narrow && <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              background:D?"rgba(255,255,255,0.02)":"#f8f8fb", borderRadius:16, border:"1px solid "+bdr, padding:"16px"}}>
              {selPreset ? (
                <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:10}}>
                  <div style={{fontSize:13, fontWeight:700, color:muted}}>{"✔ " + t(selPreset.labelKey)}</div>
                  <PresetCanvas dp={selPreset} size={220} isC={true} onClick={function() {}}/>
                </div>
              ) : (
                <div style={{textAlign:"center", opacity:0.4}}>
                  <div style={{fontSize:36, marginBottom:8}}>🖼</div>
                  <div style={{fontSize:13, color:muted, whiteSpace:"pre-line"}}>{t("cn_selectLeftDesign")}</div>
                </div>
              )}
            </div>}
          </div>
        </div>
      )}

      {makeStep === 3 && (
        <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 0", textAlign:"center"}}>
          {loading && (
            <div style={{width:"100%", maxWidth:520, borderRadius:16, overflow:"hidden",
              border:"1px solid rgba(99,102,241,0.4)", background:D?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.97)"}}>
              <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.22),rgba(99,102,241,0.08))",
                padding:"28px 24px 20px", textAlign:"center", borderBottom:"1px solid rgba(99,102,241,0.2)"}}>
                <div style={{position:"relative", width:72, height:72, margin:"0 auto 16px"}}>
                  <div style={{position:"absolute", inset:0, borderRadius:"50%", border:"3px solid rgba(99,102,241,0.2)"}}/>
                  <div style={{position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent",
                    borderTopColor:"#7c6aff", animation:"cn-spin 1s linear infinite"}}/>
                  <div style={{position:"absolute", inset:8, borderRadius:"50%", border:"2px solid transparent",
                    borderTopColor:"rgba(99,102,241,0.6)", animation:"cn-spin 1.5s linear infinite reverse"}}/>
                  <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:24}}>🎨</div>
                </div>
                <div style={{fontSize:16, fontWeight:800, color:text, marginBottom:6}}>{t("cn_generatingCard")}</div>
                <div style={{fontSize:12, color:muted}}>{topic} · {cnt}{t("cn_slideUnit")} {t("cn_composing")}</div>
              </div>
              <div style={{padding:"16px 24px"}}>
                <div style={{height:8, borderRadius:4, background:D?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden"}}>
                  <div style={{height:"100%", borderRadius:4,
                    background:"linear-gradient(90deg,#7c6aff,#8b5cf6,#ec4899)",
                    animation:"cn-progress 8s ease-out forwards"}}/>
                </div>
                <div style={{fontSize:11, color:D?"rgba(255,255,255,0.35)":"#bbb", marginTop:10, textAlign:"center"}}>
                  {t("cn_genTimeNotice")}
                </div>
              </div>
            </div>
          )}
          {!loading && err && (
            <div>
              <div style={{fontSize:52, marginBottom:14}}>😢</div>
              <div style={{fontSize:16, fontWeight:800, color:text, marginBottom:8}}>{t("cn_genFailed")}</div>
              <div style={{fontSize:13, color:errClr, marginBottom:20}}>{err}</div>
              <button onClick={function() { setMakeStep(2); }}
                style={{padding:"12px 28px", borderRadius:10, border:"1px solid "+bdr,
                  background:"transparent", color:muted, fontSize:13, cursor:"pointer"}}>{t("cn_retryGen")}</button>
            </div>
          )}
          {!loading && !err && (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:60, marginBottom:14, display:"inline-block",
                animation:"cn-popin 0.5s cubic-bezier(0.34,1.56,0.64,1) both"}}>🎉</div>
              <div style={{fontSize:22, fontWeight:900, marginBottom:6, color:text}}>{t("cn_genComplete")}</div>
              <div style={{fontSize:14, color:muted, marginBottom:24}}>{tname} · {slides.length}{t("cn_slideUnit")}</div>
              <button onClick={function() { setPage("edit"); }}
                style={{padding:"14px 40px", borderRadius:14, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff",
                  fontSize:16, fontWeight:900, boxShadow:"0 10px 32px rgba(99,102,241,0.45)"}}>
                {"✏️ " + t("cn_goEdit")}
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
  let { t } = useI18n();
  let user = props.user; let p;
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.slides&&cc.slides.length)return"edit";}catch(e){}return props.initialSubPage||"home";}); let page=p[0];let setPage=p[1];
  p = useState(1);       let makeStep  = p[0]; let setMakeStep  = p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.topic)return cc.topic;}catch(e){}return"";}); let topic=p[0];let setTopic=p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.postCaption)return cc.postCaption;}catch(e){}return"";}); let postCaption=p[0];let setPostCaption=p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.generatedCaption)return cc.generatedCaption;}catch(e){}return"";}); let generatedCaption=p[0];let setGeneratedCaption=p[1];
  p = useState(6);       let cnt       = p[0]; let setCnt       = p[1];
  p = useState(null);    let selPreset = p[0]; let setSelPreset = p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.slides&&cc.slides.length)return cc.slides;}catch(e){}return[];}); let slides=p[0];let setSlides=p[1];
  p = useState(0);       let idx       = p[0]; let setIdx       = p[1];
  p = useState(false);   let loading   = p[0]; let setLoading   = p[1];
  p = useState("");      let err       = p[0]; let setErr       = p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.tname)return cc.tname;}catch(e){}return"";}); let tname=p[0];let setTname=p[1];
  p = useState("style"); let etab      = p[0]; let setEtab      = p[1];
  p = useState({busy:false, msg:""});
  let dlSt = p[0]; let setDlSt = p[1];
  p = useState(function() {
    try { let cached = JSON.parse(localStorage.getItem("sns_cn_cache") || "null"); if (cached && cached.gs) return cached.gs; } catch(e) {}
    return {bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:28, bodySize:13, subtitleSize:11, highlightSize:13, titleWeight:"800", textAlign:"left", textValign:"middle", hlMode:"pill", ratio:"1:1", fontFamily:"sans-serif", bgOverlayOpacity:0.5, paddingX:0, lineHeightTitle:1.35, lineHeightBody:1.7};
  });
  let gs = p[0]; let setGs = p[1];
  p = useState({}); let sted = p[0]; let setSted = p[1];
  p = useState(function(){ try{let cc=JSON.parse(localStorage.getItem("sns_cn_cache")||"null");if(cc&&cc.bgIs)return cc.bgIs;}catch(e){}return{};}); let bgIs = p[0]; let setBgIs = p[1];
  p = useState(false); let showSaved   = p[0]; let setShowSaved   = p[1];
  p = useState(false); let showPlanner = p[0]; let setShowPlanner = p[1];
  p = useState("topic"); let plannerMode = p[0]; let setPlannerMode = p[1];
  p = useState(function() { return getSavedWorks(); });
  let savedWorks = p[0]; let setSavedWorks = p[1];

  let bgRef = useRef(null);
  let winW = useWinW();
  let onlineCount = useOnlineCount();
  let narrow = winW < 880;

  // 생성 중 이탈 방지
  useEffect(function() {
    function handler(e) {
      if (loading) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", handler);
    return function() { window.removeEventListener("beforeunload", handler); };
  }, [loading]);

  // 슬라이드 변경 시 localStorage 캐시
  useEffect(function() {
    if (slides.length > 0) {
      try { localStorage.setItem("sns_cn_cache", JSON.stringify({ slides: slides, gs: gs, bgIs: bgIs, topic: topic, tname: tname, postCaption: postCaption, generatedCaption: generatedCaption })); } catch(e) {}
    }
  }, [slides, gs, bgIs, postCaption, generatedCaption]);

  // initialSubPage="plan" 이면 마운트 시 PlannerPanel 자동 열기
  useEffect(function() {
    if (props.initialSubPage === "plan") {
      setShowPlanner(true);
      setPlannerMode("topic");
      setPage("make");
    } else if (props.initialSubPage === "make") {
      setPage("make");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  let curSlide = slides[idx] || null;
  let curEd    = sted[idx] || {};
  let merged   = curSlide ? Object.assign({}, curSlide, curEd) : null;
  let curBg    = bgIs[idx] || null;

  function updGs(k, v) { setGs(function(prev) { let n = Object.assign({}, prev); n[k] = v; return n; }); }
  function updEd(k, v) {
    setSted(function(prev) { let n = Object.assign({}, prev); n[idx] = Object.assign({}, prev[idx] || {}); n[idx][k] = v; return n; });
  }
  function applyPreset(dp) {
    setSelPreset(dp);
    setGs(function(prev) {
      return Object.assign({}, prev, {bgColor:dp.bgColor, textColor:dp.textColor, titleSize:dp.titleSize, bodySize:dp.bodySize, subtitleSize:dp.subtitleSize || 11, highlightSize:dp.highlightSize || 13, titleWeight:dp.titleWeight, textAlign:dp.textAlign, textValign:dp.textValign, hlMode:dp.hlMode, lineHeightTitle:dp.lineHeightTitle || 1.35, lineHeightBody:dp.lineHeightBody || 1.7});
    });
  }
  function handleApplyPlanSlides(parsed) {
    let planned = strengthenFirstSlide(applyFinalCommentPrompt(parsed, postCaption), topic);
    setSlides(planned.slides || []); setTname(planned.topic || topic);
    setGeneratedCaption(planned.caption || "");
    setIdx(0); setSted({}); setBgIs({}); setPage("edit");
    applyAutoCoverImage(planned);
  }
  async function applyAutoCoverImage(planned) {
    let first = planned?.slides?.[0] || {};
    let query = first.visualKeyword || first.title || planned?.topic || topic || "social media marketing";
    let imgUrl = await findCardCoverImage(query, gs.ratio || "1:1");
    if (imgUrl) {
      setBgIs(function(prev) {
        let next = Object.assign({}, prev);
        next[0] = imgUrl;
        return next;
      });
    }
  }
  function getEl(url) {
    if (!url) { return Promise.resolve(null); }
    return new Promise(function(res) { let im = new Image(); im.onload = function() { res(im); }; im.src = url; });
  }
  function handleBg(e) {
    let files = e.target.files; let f = files && files[0]; if (!f) { return; }
    let r = new FileReader();
    r.onload = function(ev) { setBgIs(function(prev) { let n = Object.assign({}, prev); n[idx] = ev.target.result; return n; }); };
    r.readAsDataURL(f); e.target.value = "";
  }
  function removeBg() { setBgIs(function(prev) { let n = Object.assign({}, prev); n[idx] = null; return n; }); }

  function handleSaveWork() {
    if (!slides.length) { return; }
    let id = "w_" + Date.now();
    let now = new Date();
    let ds = now.getFullYear() + "." + String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
    let thumb = null;
    try { let c = document.createElement("canvas"); drawSlide(c, Object.assign({}, slides[0], (sted[0] || {})), gs, null); thumb = c.toDataURL("image/jpeg", 0.5); } catch(e) {}
    let updated = saveWork({ id:id, topic:tname || topic, count:slides.length, date:ds, thumb:thumb, slides:slides, gs:gs, sted:sted, bgIs:bgIs, postCaption:postCaption, generatedCaption:generatedCaption });
    setSavedWorks(updated);
    setDlSt({busy:false, msg:t("cn_savedToLib")});
    setTimeout(function() { setDlSt(function(prev) { return Object.assign({}, prev, {msg:""}); }); }, 2500);
  }
  function handleLoadWork(work) {
    setSlides(work.slides || []); setTname(work.topic || "");
    setPostCaption(work.postCaption || ""); setGeneratedCaption(work.generatedCaption || "");
    setGs(work.gs || gs); setSted(work.sted || {}); setBgIs(work.bgIs || {}); setIdx(0);
    setPage("edit"); setShowSaved(false);
  }
  function handleDeleteWork(id) { setSavedWorks(deleteWork(id)); }

  async function generate() {
    if (!topic.trim()) { return; }
    let left = getLeft(user);
    if (!left.canUse) { setErr(user ? t("cn_pointsLow") : t("cn_guestOver").replace("{n}", FREE_GUEST)); return; }
    setLoading(true); setErr("");
    try {
      let sysMsg = "인스타그램 카드뉴스 전문 카피라이터.\n반드시 JSON만 반환하세요.\n형식:{\"topic\":\"주제명\",\"caption\":\"인스타그램 게시글 캡션 4-6줄과 해시태그\",\"slides\":[{\"index\":1,\"title\":\"제목\",\"subtitle\":\"부제목\",\"body\":\"본문\",\"highlight\":\"핵심문구\",\"badge\":\"짧은 배지\"}]}\n규칙:\n- caption은 카드뉴스 내용과 자연스럽게 이어지는 게시글 본문으로 작성합니다.\n- 사용자가 댓글 유도 멘트나 CTA를 제공하면 caption 끝부분과 마지막 슬라이드에 자연스럽게 반영합니다.\n- 마지막 슬라이드는 저장/댓글/문의 등 다음 행동을 유도하는 마무리 페이지로 구성합니다." + CARDNEWS_HOOK_RULES;
      let userMsg = "주제: " + topic + "\n슬라이드 수: " + cnt + "장";
      if (postCaption.trim()) { userMsg = userMsg + "\n게시글 캡션/댓글 유도 멘트: " + postCaption.trim(); }
      let text = await callAI("claude-haiku-4-5", [{role:"user", content:userMsg}], 4000, sysMsg).catch(function(e2) { setErr("오류: " + e2.message); setLoading(false); return null; });
      if (text === null) return;
      let parsed = strengthenFirstSlide(applyFinalCommentPrompt(parseAIJson(text), postCaption), topic);
      setSlides(parsed.slides || []); setTname(parsed.topic || topic);
      setGeneratedCaption(parsed.caption || "");
      setIdx(0); setSted({}); setBgIs({});
      if (selPreset) { applyPreset(selPreset); }
      applyAutoCoverImage(parsed);
      setPage("edit"); consumeOne(user);
      if (user && user.uid) { changePoints(user.uid, -1, "카드뉴스 생성").catch(function(e) {}); }
      // 보관함 자동저장
      try {
        let _slides = parsed.slides || [];
        let _tname  = parsed.topic || topic;
        let _thumb  = "";
        try {
          let _tc = document.createElement("canvas");
          drawSlide(_tc, Object.assign({}, _slides[0]), gs, null);
          _thumb = _tc.toDataURL("image/jpeg", 0.5);
        } catch(te) {}
        saveWork({ id: Date.now().toString(), topic: _tname, count: _slides.length,
          date: new Date().toLocaleDateString("ko-KR"), thumb: _thumb,
          slides: _slides, gs: gs, sted: {}, bgIs: bgIs, postCaption: postCaption, generatedCaption: parsed.caption || "" });
      } catch(se) {}
    } catch(e3) { setErr(t("cn_error") + e3.message); }
    finally { setLoading(false); }
  }

  async function dlOne() {
    if (!merged || dlSt.busy) { return; }
    setDlSt({busy:true, msg:t("cn_saving")});
    try {
      let c = document.createElement("canvas"); let el = await getEl(curBg);
      drawSlide(c, merged, gs, el);
      let b64 = c.toDataURL("image/png"); let b = atob(b64.split(",")[1]);
      let arr = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) { arr[i] = b.charCodeAt(i); }
      let url = URL.createObjectURL(new Blob([arr], {type:"image/png"}));
      let a = document.createElement("a"); a.href = url; a.download = "slide_" + String(idx + 1).padStart(2, "0") + ".png"; a.style.display = "none"; document.body.appendChild(a); a.click();
      setTimeout(function() { URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
      setDlSt({busy:false, msg:t("cn_saved")});
    } catch(e) { setDlSt({busy:false, msg:t("cn_fail") + e.message}); }
  }

  async function dlZip() {
    if (!slides.length || dlSt.busy) { return; }
    setDlSt({busy:true, msg:t("cn_preparing")});
    try {
      let JSZip = await loadJSZip(); let zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        let s = Object.assign({}, slides[i], (sted[i] || {}));
        setDlSt({busy:true, msg:"" + (i + 1) + " of " + slides.length});
        let c2 = document.createElement("canvas"); let el2 = await getEl(bgIs[i] || null);
        drawSlide(c2, s, gs, el2);
        let b2 = atob(c2.toDataURL("image/png").split(",")[1]);
        let arr2 = new Uint8Array(b2.length);
        for (let j = 0; j < b2.length; j++) { arr2[j] = b2.charCodeAt(j); }
        zip.file("slide_" + String(i + 1).padStart(2, "0") + ".png", arr2);
      }
      setDlSt({busy:true, msg:"ZIP 압축 중..."});
      let blob = await zip.generateAsync({type:"blob", compression:"DEFLATE", compressionOptions:{level:6}});
      let url2 = URL.createObjectURL(blob); let a2 = document.createElement("a");
      a2.href = url2; a2.download = (tname || "cardnews") + "_slides.zip"; a2.style.display = "none"; document.body.appendChild(a2); a2.click();
      setTimeout(function() { URL.revokeObjectURL(url2); document.body.removeChild(a2); }, 2000);
      setDlSt({busy:false, msg:"ZIP 완료!"});
    } catch(e2) { setDlSt({busy:false, msg:"ZIP 실패: " + e2.message}); }
  }

  let previewW = narrow ? Math.min(winW - 40, 380) : Math.min(Math.floor((winW - 270) * 0.62), 620);
  if (previewW < 300) { previewW = 300; }

  let isLight = props.theme === "light";
  let mainBg    = isLight ? "#f4f4f8"               : "linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)";
  let mainColor = isLight ? "#1a1a2e"               : "#fff";
  let topBarBg  = isLight ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.3)";
  let topBarBdr = isLight ? "#e5e3f5"               : "rgba(255,255,255,0.07)";
  let topText   = isLight ? "#1a1a2e"               : "#fff";
  let topMuted  = isLight ? "#888"                  : "rgba(255,255,255,0.4)";

  let CSS = "*{box-sizing:border-box;margin:0;padding:0}" +
    "@keyframes cn-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}" +
    "@keyframes cn-progress{from{width:0%}to{width:100%}}" +
    "@keyframes cn-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}" +
    "@keyframes cn-popin{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}" +
    "input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;outline:none;background:" + (isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.15)") + ";width:100%}" +
    "input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#7c6aff;cursor:pointer}" +
    "::-webkit-scrollbar{width:4px;height:4px}" +
    "::-webkit-scrollbar-thumb{background:" + (isLight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.12)") + ";border-radius:4px}" +
    "a{text-decoration:none}button{font-family:inherit}";

  return (
    <div style={{display:"flex", height:props.embedded ? "100%" : "100vh", background:mainBg, color:mainColor, fontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif", overflow:"hidden", flex:props.embedded ? 1 : undefined}}>
      <style>{CSS}</style>

      {showPlanner && (
        <PlannerPanel initialMode={plannerMode} theme={props.theme} onClose={function() { setShowPlanner(false); }} onApplySlides={handleApplyPlanSlides}/>
      )}
      {showSaved && (
        <SavedWorksPanel works={savedWorks} onLoad={handleLoadWork} onDelete={handleDeleteWork} onClose={function() { setShowSaved(false); }}/>
      )}

      {!narrow && !props.embedded && (
        <Sidebar page={page} setPage={setPage} hasSlides={slides.length > 0} user={user} onlineCount={onlineCount} theme={props.theme} onShowSaved={function() { setShowSaved(true); }} onShowPlanner={function(mode) { setPlannerMode(mode||"topic"); setShowPlanner(true); }}/>
      )}

      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
        {narrow && (
          <div style={{height:44, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", borderBottom:"1px solid "+topBarBdr, background:topBarBg, flexShrink:0}}>
            <span style={{fontSize:13, fontWeight:900, color:topText}}>SNS메이킷 카드뉴스</span>
            <div style={{display:"flex", gap:5}}>
              <button onClick={function() { setShowPlanner(true); }}
                style={{padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", background:"rgba(99,102,241,0.25)", color:"#a5b4fc", fontSize:10, fontWeight:700}}>
                ✨기획AI
              </button>
              {[{id:"home",l:t("cn_home")},{id:"make",l:t("cn_make")},{id:"edit",l:t("cn_edit")}].map(function(it) {
                if (it.id === "edit" && slides.length === 0) { return null; }
                let isA = page === it.id;
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
            <PageHome setPage={setPage} setMakeStep={setMakeStep} hasSlides={slides.length > 0} tname={tname} slideCnt={slides.length} savedWorks={savedWorks} theme={props.theme} onShowSaved={function() { setShowSaved(true); }} onShowPlanner={function(mode) { setPlannerMode(mode||"topic"); setShowPlanner(true); }}/>
          )}
          {page === "make" && (
            <PageMake topic={topic} setTopic={setTopic} postCaption={postCaption} setPostCaption={setPostCaption} cnt={cnt} setCnt={setCnt} makeStep={makeStep} setMakeStep={setMakeStep} selPreset={selPreset} setSelPreset={setSelPreset} loading={loading} err={err} tname={tname} slides={slides} setPage={setPage} onGenerate={generate} theme={props.theme} user={user} onShowPlanner={function(mode) { setPlannerMode(mode||"topic"); setShowPlanner(true); }}/>
          )}
          {page === "edit" && slides.length > 0 && (
            <div style={{flex:1, display:"flex", flexDirection: narrow ? "column" : "row", height:"100%", overflow:"hidden"}}>
              {narrow ? (
                <>
                  {/* 모바일: 미리보기 상단, 편집패널 하단 스크롤 */}
                  <div style={{flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 16px 8px", background:"rgba(0,0,0,0.2)", borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                    <PreviewPanel slides={slides} idx={idx} setIdx={setIdx} merged={merged} gs={gs} curBg={curBg} bgIs={bgIs} sted={sted} tname={tname} caption={generatedCaption} dlSt={dlSt} dlOne={dlOne} dlZip={dlZip} onNew={function() { if (window.confirm(t("cn_regenConfirm"))) { try{localStorage.removeItem("sns_cn_cache");}catch(e){} setSlides([]); setTname(""); setGeneratedCaption(""); setPage("make"); setMakeStep(1); } }} onSave={handleSaveWork} previewW={Math.min(winW - 32, 340)}/>
                  </div>
                  <div style={{flex:1, overflowY:"auto"}}>
                    <EditPanel gs={gs} updGs={updGs} etab={etab} setEtab={setEtab} curBg={curBg} bgRef={bgRef} handleBg={handleBg} onRemoveBg={removeBg} curSlide={curSlide} curEd={curEd} updEd={updEd} selPreset={selPreset} applyPreset={applyPreset}/>
                  </div>
                </>
              ) : (
                <>
                  <EditPanel gs={gs} updGs={updGs} etab={etab} setEtab={setEtab} curBg={curBg} bgRef={bgRef} handleBg={handleBg} onRemoveBg={removeBg} curSlide={curSlide} curEd={curEd} updEd={updEd} selPreset={selPreset} applyPreset={applyPreset}/>
                  <PreviewPanel slides={slides} idx={idx} setIdx={setIdx} merged={merged} gs={gs} curBg={curBg} bgIs={bgIs} sted={sted} tname={tname} caption={generatedCaption} dlSt={dlSt} dlOne={dlOne} dlZip={dlZip} onNew={function() { if (window.confirm(t("cn_regenConfirm"))) { try{localStorage.removeItem("sns_cn_cache");}catch(e){} setSlides([]); setTname(""); setGeneratedCaption(""); setPage("make"); setMakeStep(1); } }} onSave={handleSaveWork} previewW={previewW}/>
                </>
              )}
            </div>
          )}
          {page === "edit" && slides.length === 0 && (
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10}}>
              <div style={{fontSize:28}}>🎨</div>
              <div style={{fontSize:13, color:"rgba(255,255,255,0.4)"}}>아직 생성된 카드뉴스가 없어요</div>
              <button onClick={function() { setPage("make"); setMakeStep(1); }}
                style={{padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700}}>
                카드뉴스 만들기 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
