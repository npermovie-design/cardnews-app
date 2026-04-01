import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, supabase } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { KlipyButton } from "./KlipyPicker";
import ShareButton from "./ShareButton";
import { isDarkTheme } from "./theme";
import { lazy, Suspense } from "react";
const UnifiedCanvasEditor = lazy(() => import("./UnifiedCanvasEditor"));
import { useI18n } from "./i18n.jsx";

/* ══════════════════════════════════════════════════════════════
   SimpleCardNewsGenerator.jsx
   ✅ Step1: 주제 입력 (예시 주제 태그 + AI 추천)
   ✅ Step2: 슬라이드 기획
   ✅ Step3: 디자인 선택 + 사이즈 선택
   ✅ Step4: 텍스트 편집 (글 수정, Canvas 미리보기)
══════════════════════════════════════════════════════════════ */

import { callAI } from "./aiClient";

// ── Google Fonts 동적 로더 ───────────────────────────────────
const loadedFonts = new Set();
function loadGFont(family) {
  if (!family || family === "sans-serif" || family === "monospace" || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

// ── 예시 주제 (주제 + 상세내용) ────────────────────────────────
const getTopicExamples = (ko) => [
  { label:ko?"직장인 번아웃":"Burnout", text:"직장인 번아웃 극복법 5가지",
    detail:"1. 번아웃 자가진단 체크리스트\n2. 업무 경계 설정법 (퇴근 후 메일 차단)\n3. 마이크로 휴식 (50분 일하고 10분 쉬기)\n4. 주말 디지털 디톡스 루틴\n5. 번아웃 예방을 위한 취미 활동 추천" },
  { label:ko?"주식 입문":"Stock Basics", text:"주식 투자 완전 초보 가이드",
    detail:"1. 증권계좌 개설 방법 (MTS 추천)\n2. 주식 용어 정리 (PER, PBR, 시가총액)\n3. ETF vs 개별주 차이점\n4. 초보자 추천 투자 전략 (적립식)\n5. 절대 하면 안 되는 투자 실수 3가지" },
  { label:ko?"다이어트":"Diet", text:"다이어트 식단 추천",
    detail:"1. 칼로리 계산 없이 하는 간헐적 단식\n2. 아침/점심/저녁 식단 예시\n3. 다이어트 중 먹어도 되는 간식 5가지\n4. 운동 없이 체중 감량하는 생활습관\n5. 요요 없이 유지하는 방법" },
  { label:ko?"마음 챙김":"Mindfulness", text:"하루 10분 마음 챙김 루틴",
    detail:"1. 아침 5분 감사일기 쓰기\n2. 호흡 명상 기초 (4-7-8 호흡법)\n3. 걷기 명상으로 스트레스 해소\n4. 자기 전 바디스캔 명상\n5. 일주일 마음 챙김 플래너 예시" },
  { label:ko?"재테크":"Finance", text:"2030 재테크 필수 습관",
    detail:"1. 월급 관리 50-30-20 법칙\n2. 비상금 통장 만들기 (6개월치)\n3. 청약통장 가입 꿀팁\n4. 소액으로 시작하는 투자 (로보어드바이저)\n5. 연말정산 절세 체크리스트" },
  { label:ko?"홈트":"Home Workout", text:"집에서 할 수 있는 홈트 루틴",
    detail:"1. 장비 없이 하는 전신 운동 5가지\n2. 초보자 주 3회 홈트 스케줄\n3. 코어 강화 플랭크 챌린지 (30일)\n4. 스트레칭으로 거북목 교정\n5. 홈트 효과를 높이는 식단 팁" },
  { label:ko?"SNS 성장":"SNS Growth", text:"인스타그램 팔로워 늘리는 방법",
    detail:"1. 프로필 최적화 (바이오, 하이라이트)\n2. 릴스 알고리즘 공략법\n3. 해시태그 전략 (대형+중형+소형 조합)\n4. 게시 최적 시간대와 빈도\n5. 참여율을 높이는 캡션 작성법" },
  { label:ko?"독서법":"Reading Tips", text:"성인 자기계발 독서법",
    detail:"1. 한 달에 책 4권 읽는 시간 관리법\n2. 밑줄 치기 vs 메모 독서법 비교\n3. 읽은 책 정리하는 노션 템플릿\n4. 분야별 입문서 추천 5권\n5. 독서 모임 참여로 꾸준히 읽기" },
  { label:ko?"카페 창업":"Cafe Startup", text:"소자본 카페 창업 가이드",
    detail:"1. 창업 비용 항목별 정리 (3천만원~1억)\n2. 상권 분석 체크리스트\n3. 메뉴 구성 전략 (시그니처 메뉴 만들기)\n4. SNS 마케팅으로 단골 만들기\n5. 실패하는 카페의 공통점 3가지" },
  { label:ko?"여행 팁":"Travel Tips", text:"해외여행 준비 완벽 가이드",
    detail:"1. 항공권 최저가 예약 시기와 방법\n2. 여행자 보험 가입 꿀팁\n3. 짐 싸기 체크리스트 (캐리어 정리법)\n4. 현지에서 쓸 유용한 앱 5개\n5. 환전 vs 카드 결제 비교" },
];

// ── 슬라이드 타입 ────────────────────────────────────────────
const getSlideTypes = (ko) => [
  { id:"cover",     label:ko?"표지":"Cover"                },
  { id:"intro",     label:ko?"소개":"Intro"                },
  { id:"point1",    label:ko?"핵심 포인트 1":"Key Point 1" },
  { id:"point2",    label:ko?"핵심 포인트 2":"Key Point 2" },
  { id:"point3",    label:ko?"핵심 포인트 3":"Key Point 3" },
  { id:"point4",    label:ko?"핵심 포인트 4":"Key Point 4" },
  { id:"point5",    label:ko?"핵심 포인트 5":"Key Point 5" },
  { id:"detail",    label:ko?"상세 설명":"Detail"          },
  { id:"compare",   label:ko?"비교표":"Comparison"         },
  { id:"stats",     label:ko?"수치/지표":"Stats"           },
  { id:"checklist", label:ko?"체크리스트":"Checklist"      },
  { id:"tip",       label:ko?"꿀팁":"Tips"                 },
  { id:"summary",   label:ko?"요약 정리":"Summary"         },
  { id:"quote",     label:ko?"명언/인용구":"Quote"         },
  { id:"cta",       label:ko?"마무리/CTA":"CTA"            },
];

// ── 사이즈 프리셋 ────────────────────────────────────────────
const getSizePresets = (ko) => [
  { label:ko?"정사각형":"Square",        w:1080, h:1080, icon:"1:1",  desc:ko?"SNS / 인스타그램":"SNS / Instagram" },
  { label:ko?"세로 9:16":"Vertical 9:16",w:1080, h:1920, icon:"9:16", desc:ko?"쇼츠 / 릴스":"Shorts / Reels" },
  { label:ko?"세로 4:5":"Vertical 4:5",  w:1080, h:1350, icon:"4:5",  desc:ko?"인스타 피드":"Instagram Feed" },
  { label:ko?"가로형":"Horizontal",      w:1200, h:628,  icon:"16:9", desc:ko?"배너 / 블로그":"Banner / Blog" },
  { label:ko?"직접 입력":"Custom",       w:null, h:null, icon:"W×H",  desc:ko?"직접 설정":"Custom Size" },
];

// ── 디자인 프리셋 (핵심 6개만 유지) ───────────────────────
const DESIGN_PRESETS = [
  { key:"bold_dark",  label:"다크",     bgColor:"#1c1c1e", textColor:"#ffffff", titleSize:34, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"minimal",    label:"미니멀",   bgColor:"#f8fafc", textColor:"#1e1b4b", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"pure_white", label:"화이트",   bgColor:"#ffffff", textColor:"#111827", titleSize:32, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"ocean",      label:"오션",     bgColor:"#0c1445", textColor:"#bae6fd", titleSize:32, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"pastel",     label:"파스텔",   bgColor:"#fef3c7", textColor:"#1f2937", titleSize:30, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
  { key:"coral",      label:"코랄",     bgColor:"#fff1f2", textColor:"#9f1239", titleSize:32, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
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

  const imgLayout = slide.imgLayout || "full"; // full, top, bottom, left, right
  const imgRatio = (slide.imgLayoutRatio ?? 50) / 100; // 이미지 영역 비율

  // 배경
  if (bgImageEl && bgImageEl.complete && bgImageEl.naturalWidth > 0) {
    // 레이아웃별 이미지 영역 계산
    let ix = 0, iy = 0, iw = CW, ih = CH;
    if (imgLayout === "top") { ih = Math.round(CH * imgRatio); }
    else if (imgLayout === "bottom") { iy = Math.round(CH * (1 - imgRatio)); ih = Math.round(CH * imgRatio); }
    else if (imgLayout === "left") { iw = Math.round(CW * imgRatio); }
    else if (imgLayout === "right") { ix = Math.round(CW * (1 - imgRatio)); iw = Math.round(CW * imgRatio); }

    // full이 아닌 경우 배경색 먼저 채우기
    if (imgLayout !== "full") {
      ctx.fillStyle = style.bgColor || "#1c1c1e";
      ctx.fillRect(0, 0, CW, CH);
    }

    // 이미지 그리기 (영역에 맞게 cover)
    const iR = bgImageEl.naturalWidth / bgImageEl.naturalHeight;
    const cR = iw / ih;
    let sw, sh, sx2 = 0, sy2 = 0;
    if (iR > cR) { sh = ih; sw = ih * iR; sx2 = (iw - sw) / 2; }
    else { sw = iw; sh = iw / iR; sy2 = (ih - sh) / 2; }
    const scale = (slide.bgScale ?? 100) / 100;
    if (scale !== 1) {
      const nw = sw * scale, nh = sh * scale;
      sx2 = (iw - nw) / 2; sy2 = (ih - nh) / 2;
      sw = nw; sh = nh;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    ctx.globalAlpha = slide.bgOpacity ?? 1;
    ctx.drawImage(bgImageEl, ix + sx2, iy + sy2, sw, sh);
    ctx.restore();
    // 오버레이 (단색 또는 그라데이션)
    const oc = slide.overlayColor || "#000000";
    const oo = slide.overlayOpacity ?? 0.48;
    const r = parseInt(oc.slice(1,3),16)||0, g = parseInt(oc.slice(3,5),16)||0, b = parseInt(oc.slice(5,7),16)||0;
    const ovType = slide.overlayType || "solid";
    if (ovType === "solid") {
      ctx.fillStyle = `rgba(${r},${g},${b},${oo})`;
      ctx.fillRect(0, 0, CW, CH);
    } else {
      let grd;
      if (ovType === "bottom") grd = ctx.createLinearGradient(0, 0, 0, CH);
      else if (ovType === "top") grd = ctx.createLinearGradient(0, CH, 0, 0);
      else if (ovType === "left") grd = ctx.createLinearGradient(CW, 0, 0, 0);
      else if (ovType === "right") grd = ctx.createLinearGradient(0, 0, CW, 0);
      else if (ovType === "center") { grd = ctx.createRadialGradient(CW/2,CH/2,0,CW/2,CH/2,Math.max(CW,CH)*0.7); }
      else grd = ctx.createLinearGradient(0, 0, 0, CH);
      grd.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},${oo})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, CW, CH);
    }
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
  const oxRaw = style.textOffsetX || 0;
  const oyRaw = style.textOffsetY || 0;
  const SC = CW / 420;
  const ox = Math.round(oxRaw * SC);
  const oy = Math.round(oyRaw * SC);
  const PAD = Math.round(CW * 0.09);
  // 레이아웃에 따른 텍스트 영역 제한
  let textAreaX = 0, textAreaY = 0, textAreaW = CW, textAreaH = CH;
  if (imgLayout === "top") { textAreaY = Math.round(CH * imgRatio); textAreaH = CH - textAreaY; }
  else if (imgLayout === "bottom") { textAreaH = Math.round(CH * (1 - imgRatio)); }
  else if (imgLayout === "left") { textAreaX = Math.round(CW * imgRatio); textAreaW = CW - textAreaX; }
  else if (imgLayout === "right") { textAreaW = Math.round(CW * (1 - imgRatio)); }
  const maxW = (imgLayout === "left" || imgLayout === "right") ? textAreaW - PAD * 2 : CW - PAD * 2;

  const tSz = Math.round((style.titleSize || 32) * SC);
  const bSz = Math.round((style.bodySize || 15) * SC);
  const sSz = Math.round((style.subtitleSize || 12) * SC);
  const hSz = Math.round((style.highlightSize || 15) * SC);
  const lhT = style.lineHeightTitle || 1.35;
  const lhB = style.lineHeightBody || 1.7;
  const tw = style.titleWeight || "800";

  ctx.font = getCanvasFont(tw, tSz, ff);
  const titLines = wrapText(ctx, slide.title !== undefined ? slide.title : (slide.headline || ""), maxW);
  ctx.font = getCanvasFont("600", sSz, ff);
  const _sub = slide.subtitle !== undefined ? slide.subtitle : (slide.subheadline || "");
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

  const minY = textAreaY + PAD + Math.round(sSz * 0.5);
  const maxY = textAreaY + textAreaH;
  let startY = va === "top" ? minY : va === "bottom" ? maxY - PAD - totalH : textAreaY + Math.round((textAreaH - totalH) / 2);
  let y = Math.max(minY, startY) + oy;

  const textLeft = (imgLayout === "left") ? textAreaX : 0;
  function getX(lineW) {
    if (al === "center") return textLeft + Math.round((textAreaW - lineW) / 2) + PAD + ox;
    if (al === "right")  return textLeft + textAreaW - PAD - lineW + ox;
    return textLeft + PAD + ox;
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
    <canvas ref={cRef} style={{ width:displayW, height:displayH, display:"block", borderRadius:12 }}/>
  );
}

// ── API 호출 ─────────────────────────────────────────────────
async function generateSlideTexts({ topic, pageCount, sourceContent, topicDetail, slideTypes }) {
  const types = (slideTypes || getSlideTypes(true)).slice(0, pageCount);
  const srcCtx = sourceContent ? `\n\n[참고할 원본 내용]\n${sourceContent.slice(0, 700)}` : "";
  const detailCtx = topicDetail ? `\n\n[상세 내용 — 각 슬라이드에 반드시 이 내용을 반영하세요]\n${topicDetail}` : "";
  const prompt = `한국 SNS 카드뉴스 카피라이터입니다.
주제: ${topic}${srcCtx}${detailCtx}

카드뉴스 슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
${topicDetail ? "상세 내용의 각 항목을 순서대로 슬라이드에 배치하고, 핵심만 짧고 임팩트있게 작성하세요." : ""}
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

// ── 커뮤니티 템플릿 섹션 ────────────────────────────────────
function CommunityTemplateSection({ D, text, muted, bdr, cardBg, onApply, ko=true }) {
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTpl(true);
      const all = [];
      // localStorage
      try {
        const community = JSON.parse(localStorage.getItem("nper_shared_templates_community") || "[]");
        community.forEach(t => all.push({ ...t, source: "community" }));
      } catch {}
      try {
        const mine = JSON.parse(localStorage.getItem("nper_shared_templates_mine") || "[]");
        mine.forEach(t => all.push({ ...t, source: "mine" }));
      } catch {}
      // Supabase
      try {
        if (supabase) {
          const { data, error } = await supabase.from("shared_templates").select("*").order("created_at", { ascending: false }).limit(30);
          if (!error && data) {
            data.forEach(t => {
              if (!all.find(a => a.id === t.id)) all.push({ ...t, source: "supabase" });
            });
          }
        }
      } catch {}
      // 중복 제거 (id 기준)
      const unique = [];
      const seen = new Set();
      for (const t of all) {
        const key = String(t.id);
        if (!seen.has(key)) { seen.add(key); unique.push(t); }
      }
      if (!cancelled) { setTemplates(unique); setLoadingTpl(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ marginBottom:28, padding:"16px 18px", borderRadius:14, border:`1px solid ${bdr}`, background:cardBg }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:text }}>{ko?"커뮤니티 템플릿":"Community Templates"}</div>
          <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"다른 사용자가 공유한 템플릿을 바로 적용할 수 있어요":"Apply templates shared by other users"}</div>
        </div>
        {templates.length > 0 && <span style={{ fontSize:11, color:muted }}>{templates.length}개</span>}
      </div>
      {loadingTpl ? (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ borderRadius:12, overflow:"hidden", background:D?"rgba(255,255,255,0.03)":"#f5f5f5" }}>
                <div style={{ width:"100%", paddingBottom:"75%", background:"linear-gradient(90deg,rgba(124,106,255,0.05) 25%,rgba(124,106,255,0.1) 50%,rgba(124,106,255,0.05) 75%)", backgroundSize:"200% 100%", animation:"imgShimmer 1.5s infinite" }} />
                <div style={{ padding:"8px 10px" }}>
                  <div style={{ height:12, borderRadius:4, background:D?"rgba(255,255,255,0.06)":"#e8e8e8", marginBottom:6, width:"80%" }} />
                  <div style={{ height:10, borderRadius:4, background:D?"rgba(255,255,255,0.04)":"#efefef", width:"60%" }} />
                </div>
              </div>
            ))}
          </div>
          <style>{`@keyframes imgShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign:"center", padding:"28px 12px", color:muted, fontSize:13, lineHeight:1.8 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
          {ko?"아직 공유된 템플릿이 없습니다.":"No shared templates yet."}<br/>{ko?"카드뉴스를 만들고 공유해보세요!":"Create and share your card news!"}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
          {templates.map(tpl => (
            <div key={tpl.id} style={{ borderRadius:12, border:`1px solid ${bdr}`, overflow:"hidden", background:D?"rgba(255,255,255,0.03)":"#fff", transition:"all 0.15s", cursor:"pointer" }}
              onClick={() => onApply(tpl)}>
              {/* 미리보기 이미지 */}
              <div style={{ width:"100%", paddingBottom:"75%", position:"relative", background:D?"rgba(255,255,255,0.05)":"#f5f5f5" }}>
                {tpl.preview ? (
                  <img src={tpl.preview} alt={tpl.title} loading="lazy" decoding="async" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:muted }}>🎨</div>
                )}
                {tpl.source === "mine" && (
                  <div style={{ position:"absolute", top:4, left:4, padding:"2px 6px", borderRadius:4, background:"rgba(99,102,241,0.85)", color:"#fff", fontSize:9, fontWeight:700 }}>{ko?"내 템플릿":"My Template"}</div>
                )}
              </div>
              <div style={{ padding:"8px 10px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tpl.title || (ko?"제목 없음":"Untitled")}</div>
                <div style={{ fontSize:10, color:muted, marginTop:2 }}>{tpl.author || (ko?"익명":"Anonymous")} · {tpl.slide_count || "?"}{ko?"장":""}</div>
                <button onClick={(e) => { e.stopPropagation(); onApply(tpl); }}
                  style={{ marginTop:6, width:"100%", padding:"5px 0", borderRadius:6, border:"none", background:"rgba(99,102,241,0.15)", color:"#7c6aff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {ko?"사용하기":"Use"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 기획 중 애니메이션 컴포넌트 ─────────────────────────────
function PlanningAnimation({ pageCount, ko=true, onCancel }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "\uD83D\uDCCB", text: ko?"주제를 분석하고 있어요":"Analyzing your topic" },
    { icon: "\u270F\uFE0F", text: ko?"슬라이드를 기획하고 있어요":"Planning slides" },
    { icon: "\uD83C\uDFA8", text: ko?"디자인을 구성하고 있어요":"Designing layout" },
    { icon: "\u2728", text: ko?"거의 완성됐어요!":"Almost done!" },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 3000);
    return () => clearInterval(t);
  }, []);

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", maxWidth:420, padding:40 }}>
        {/* 아이콘 애니메이션 */}
        <div style={{ fontSize:72, marginBottom:24, animation:"planFloat 2.5s ease-in-out infinite" }} key={step}>
          <span style={{ display:"inline-block", animation:"planFadeIn 0.5s ease-out" }}>{currentStep.icon}</span>
        </div>

        {/* 메인 텍스트 */}
        <div key={"txt"+step} style={{ fontSize:22, fontWeight:900, color:"#fff", marginBottom:8, animation:"planFadeIn 0.5s ease-out" }}>
          {currentStep.text}
        </div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", marginBottom:32, lineHeight:1.6 }}>
          {ko?`AI가 ${pageCount}장의 카드뉴스를 제작하고 있어요`:`AI is creating ${pageCount} card news slides`}
        </div>

        {/* 단계 인디케이터 */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:280, margin:"0 auto 28px", textAlign:"left" }}>
          {steps.map((s, i) => {
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, transition:"all 0.3s ease" }}>
                <div style={{
                  width:24, height:24, borderRadius:"50%", flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700,
                  background: isDone ? "rgba(99,102,241,0.3)" : isActive ? "#7c6aff" : "rgba(255,255,255,0.08)",
                  color: isDone ? "#a5b4fc" : isActive ? "#fff" : "rgba(255,255,255,0.25)",
                  border: isActive ? "2px solid #a5b4fc" : "2px solid transparent",
                  transition: "all 0.3s ease",
                }}>
                  {isDone ? "\u2713" : isActive ? (
                    <div style={{ width:10, height:10, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 0.8s linear infinite" }} />
                  ) : (i+1)}
                </div>
                <span style={{
                  fontSize:13, fontWeight: isActive ? 700 : 400,
                  color: isDone ? "rgba(255,255,255,0.5)" : isActive ? "#fff" : "rgba(255,255,255,0.25)",
                  transition: "all 0.3s ease",
                  textDecoration: isDone ? "line-through" : "none",
                }}>
                  {s.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* 프로그레스 바 */}
        <div style={{ height:6, borderRadius:4, background:"rgba(255,255,255,0.08)", overflow:"hidden", maxWidth:280, margin:"0 auto" }}>
          <div style={{
            height:"100%", borderRadius:4,
            background:"linear-gradient(90deg, #7c6aff, #8b5cf6, #ec4899)",
            width: `${progress}%`,
            transition:"width 0.8s ease-in-out",
          }} />
        </div>

        {/* 취소 버튼 */}
        {onCancel && (
          <button onClick={onCancel}
            style={{ marginTop:24, padding:"12px 32px", borderRadius:12, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", backdropFilter:"blur(8px)" }}>
            {ko?"취소":"Cancel"}
          </button>
        )}

        <style>{`
          @keyframes planFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
          @keyframes planFadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin { to { transform:rotate(360deg) } }
        `}</style>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function SimpleCardNewsGenerator({ isDark, user, theme, openFromLibrary, onUserUpdate, showPointConfirm, imageMode }) {
  const { lang } = useI18n();
  const ko = lang === "ko";
  const TOPIC_EXAMPLES = getTopicExamples(ko);
  const SLIDE_TYPES = getSlideTypes(ko);
  const SIZE_PRESETS = getSizePresets(ko);

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
  const [topicDetail, setTopicDetail] = useState("");
  const [refFiles, setRefFiles] = useState([]); // 참고 파일 목록
  const [pageCount, setPageCount] = useState(libItem?.count || 6);
  const [aiSugg,    setAiSugg]    = useState(null);
  const [suggesting,setSuggesting]= useState(false);

  // Step2
  const [slideContents, setSlideContents] = useState([]);
  const [planLoading,   setPlanLoading]   = useState(false);

  // Step3
  const [selPreset, setSelPreset] = useState(DESIGN_PRESETS.find(p => p.key === "pure_white") || DESIGN_PRESETS[2]);
  const [selSize,   setSelSize]   = useState(0);     // 0 = 정사각형 1080×1080
  const [customW,   setCustomW]   = useState(1080);
  const [customH,   setCustomH]   = useState(1080);

  // Step4
  const [slides,    setSlides]    = useState(libItem?.slides || []);
  const [sted,      setSted]      = useState({});
  const [selIdx,    setSelIdx]    = useState(0);
  const [showCanvasEditor, setShowCanvasEditor] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [genError,  setGenError]  = useState("");
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaResults, setMediaResults] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);

  const searchMedia = async (q) => {
    if (!q.trim()) return;
    setMediaLoading(true);
    const results = [];
    // Pixabay (서버 프록시)
    try {
      const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(q)}&per_page=12&image_type=photo`);
      const d = await r.json();
      (d.hits||[]).forEach(h => results.push({ url: h.largeImageURL, thumb: h.previewURL, src: "Pixabay", w: h.imageWidth, h: h.imageHeight }));
    } catch {}
    // Pexels (서버 프록시)
    try {
      const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(q)}&per_page=12`);
      const d = await r.json();
      (d.photos||[]).forEach(p => results.push({ url: p.src.large, thumb: p.src.small, src: "Pexels", w: p.width, h: p.height }));
    } catch {}
    setMediaResults(results);
    setMediaLoading(false);
  };

  const [customFonts, setCustomFonts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_custom_fonts")||"[]"); } catch { return []; }
  });
  const fontFileRef = useRef(null);
  useGeneratingGuard(loading, 10, "card_news"); // 생성 중 이탈 방지

  // 커스텀 폰트 복원 (페이지 로드 시)
  useEffect(() => {
    customFonts.forEach(cf => {
      if (cf.data && !document.fonts.check(`12px "${cf.name}"`)) {
        try {
          const buf = Uint8Array.from(atob(cf.data), c=>c.charCodeAt(0)).buffer;
          const ff = new FontFace(cf.name, buf);
          ff.load().then(f => document.fonts.add(f)).catch(()=>{});
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (autoSuggest && wizStep === 2 && slideContents.length > 0) {
      setAutoSuggest(false);
      suggestAll();
    }
  }, [autoSuggest, wizStep, slideContents.length]);

  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [dlSt,      setDlSt]      = useState({ busy:false, msg:"" });

  // 인스타 캡션 & 발행
  const [caption, setCaption] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [snsConns, setSnsConns] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    if (user?.uid) fetch(`/api/sns-connections?uid=${user.uid}`).then(r=>r.json()).then(d=>setSnsConns(d.connections||[])).catch(()=>{});
  }, [user?.uid]);

  const generateCaption = async () => {
    if (!topic.trim()) return;
    setCaptionLoading(true);
    try {
      const slideTexts = slides.map((s,i) => {
        const cur = getCurSlide(i);
        return [cur.title, cur.subtitle, cur.body].filter(Boolean).join(" ");
      }).join("\n");
      const prompt = `카드뉴스 주제: ${topic}\n\n슬라이드 내용:\n${slideTexts}\n\n위 카드뉴스를 인스타그램에 올릴 캡션을 작성해주세요.\n규칙:\n- 첫 줄은 강렬한 훅 (스크롤 멈추게)\n- 본문은 핵심 내용 요약 (3~5줄)\n- 줄바꿈으로 가독성 확보\n- 마지막에 관련 해시태그 10~15개\n- 이모지 적절히 사용\n- 2200자 이내\n- 캡션 텍스트만 출력 (다른 설명 없이)`;
      const res = await callAI(
        "claude-sonnet-4-5",
        [{ role: "user", content: prompt }],
        1500,
        "당신은 인스타그램 캡션 전문 작가입니다. 카드뉴스 내용을 바탕으로 인스타그램 피드 캡션을 작성하세요."
      );
      setCaption((res || "").trim());
    } catch (e) { setCaption("[캡션 생성 실패] " + e.message); }
    setCaptionLoading(false);
  };

  const publishToInstagram = async (scheduledTime) => {
    if (!user?.uid || !caption.trim() || !slides.length) return;
    setPublishing(true); setPublishResult(null);
    try {
      // 첫 번째 슬라이드를 이미지로 변환 후 Supabase Storage에 업로드
      const slide = getCurSlide(0);
      const slideStyle = getSlideStyle(0);
      const bgImg = (sted[0]||{}).bgImage;
      const canvas = document.createElement("canvas");
      const renderImg = bgImg ? await new Promise((res) => { const img = new Image(); img.onload=()=>res(img); img.onerror=()=>res(null); img.src=bgImg; }) : null;
      drawDetailSlide(canvas, slide, slideStyle, imgW, imgH, renderImg);
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
      const fileName = `instagram/${user.uid}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw new Error("이미지 업로드 실패: " + upErr.message);
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      // 이미지 접근 가능 여부 확인
      const checkRes = await fetch(imageUrl, { method: "HEAD" });
      if (!checkRes.ok) throw new Error("이미지 URL 접근 불가 (" + checkRes.status + "): " + imageUrl);

      const r = await fetch("/api/sns-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, platform: "instagram", title: topic || "", content: caption, imageUrl, ...(scheduledTime ? { scheduledTime } : {}) }),
      });
      const data = await r.json();
      setPublishResult(data);
    } catch (e) { setPublishResult({ success: false, error: e.message }); }
    setPublishing(false);
  };

  // 테마
  const D = isDarkTheme(theme);
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.55)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const accentColor = "#7c6aff";

  const preset = SIZE_PRESETS[selSize] || SIZE_PRESETS[0];
  const imgW = preset.w != null ? preset.w : (parseInt(customW)||860);
  const imgH = preset.h != null ? preset.h : (parseInt(customH)||1100);
  const imgRatio = imgW / imgH;
  const activeStyle = selPreset || DESIGN_PRESETS[0];

  const inputStyle = { width:"100%", padding:"11px 14px", borderRadius:12, border:`1px solid ${bdr}`, background:inputBg, color:D?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // WizHeader
  const WizHeader = () => (
    <div className="cn-wiz-header" style={{ padding:"20px 28px 0", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {[["1",ko?"주제 입력":"Topic"],["2",ko?"슬라이드 기획":"Plan"],["3",ko?"디자인 선택":"Design"],["4",ko?"편집":"Edit"]].map(([n,label],i)=>{
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
      if (data.error) { setTopic("[URL 오류] " + data.error); setUrlLoading(false); return; }
      setUrlResult(data);
      // 주제 자동 채우기: 제목 + 설명/내용 요약
      const combined = [data.title, data.description || data.content || ""].filter(Boolean).join("\n").slice(0, 300);
      setTopic(combined);
    } catch(e) { setTopic("[URL 불러오기 실패] " + e.message); }
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
    if (showPointConfirm && user && !(await showPointConfirm(10))) return;
    if (!user) incrementGuestUsage();
    setGenError("");
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
          const fill = await generateSlideTexts({topic, pageCount, sourceContent: srcContent, topicDetail, slideTypes: SLIDE_TYPES});
          fill.slides?.forEach(fs=>{
            const idx=slidesData.findIndex(s=>s.id===fs.id&&!s.title);
            if(idx>=0) slidesData[idx]={...slidesData[idx],title:fs.headline,subtitle:fs.subheadline,body:fs.body,highlight:fs.badge,headline:fs.headline};
          });
        }
      } else {
        const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,700) : undefined;
        const textData = await generateSlideTexts({topic, pageCount, sourceContent: srcContent, topicDetail, slideTypes: SLIDE_TYPES});
        slidesData = (textData.slides||[]).map(s=>({
          ...s, title:s.headline, subtitle:s.subheadline, highlight:s.badge
        }));
      }
      setSlides(slidesData); setSted({}); setSelIdx(0); setWizStep(4);
      saveToCardLibrary(slidesData);
      // 포인트 차감은 생성 시작 시점에 처리됨
    } catch(e) { setSlides([]); setWizStep(3); setGenError((ko?"생성에 실패했습니다: ":"Generation failed: ") + (e.message || (ko?"다시 시도해주세요.":"Please try again."))); console.error("생성 실패:", e.message); }
    setLoading(false);
  };

  // Step4 편집 헬퍼
  const getCurSlide = (idx) => {
    const base = slides[idx]||{};
    const ed = sted[idx]||{};
    // text fields + bg overlay (exclude pure style overrides)
    const { bgColor, bgImage, textColor, titleSize, bodySize, textAlign, textValign, fontFamily, ...textEd } = ed;
    return { ...base, ...textEd };
  };
  const getSlideStyle = (idx) => {
    const so = sted[idx]||{};
    return { ...activeStyle, ...(so.bgColor?{bgColor:so.bgColor}:{}), ...(so.textColor?{textColor:so.textColor}:{}), ...(so.titleSize?{titleSize:so.titleSize}:{}), ...(so.bodySize?{bodySize:so.bodySize}:{}), ...(so.textAlign?{textAlign:so.textAlign}:{}), ...(so.textValign?{textValign:so.textValign}:{}), ...(so.fontFamily?{fontFamily:so.fontFamily}:{}) };
  };
  const updSted = (idx, key, val) => setSted(prev=>({...prev,[idx]:{...(prev[idx]||{}), [key]:val}}));

  // bgFile ref
  const bgFileRef = useRef(null);
  const splitFileRef = useRef(null);

  // 사진 분할: 하나의 이미지를 N분할하여 슬라이드 배경에 적용
  const [splitCount, setSplitCount] = useState(null); // 분할 수 선택 UI
  const handlePhotoSplit = (file, count) => {
    if (!file) return;
    const splitN = count || slides.length;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const sliceH = img.naturalHeight / splitN;
        canvas.width = img.naturalWidth;
        canvas.height = Math.round(sliceH);
        const newSted = { ...sted };
        for (let i = 0; i < splitN && i < slides.length; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, Math.round(sliceH * i), img.naturalWidth, Math.round(sliceH), 0, 0, canvas.width, canvas.height);
          newSted[i] = { ...(newSted[i] || {}), bgImage: canvas.toDataURL("image/jpeg", 0.85) };
        }
        setSted(newSted);
        setSplitCount(null);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

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
    setDlSt({busy:true,msg:ko?"ZIP 생성 중...":"Creating ZIP..."});
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

  // ── 템플릿 공유 ──────────────────────────────────────────
  const shareAsTemplate = (previewImage) => {
    const title = window.prompt(ko?"공유할 템플릿 제목을 입력하세요:":"Enter a title for the shared template:", topic || "");
    if (!title) return;

    // 첫 슬라이드 미리보기 생성 (previewImage가 없으면 직접 그리기)
    let preview = previewImage;
    if (!preview) {
      try {
        const c = document.createElement("canvas");
        const firstSlide = slides[0] || {};
        const ss = getSlideStyle(0);
        drawDetailSlide(c, { title: firstSlide.title||"", subtitle: firstSlide.subtitle||"", body: firstSlide.body||"", highlight: firstSlide.highlight||"" }, ss, imgW, imgH, null);
        preview = c.toDataURL("image/jpeg", 0.5);
      } catch {}
    }

    const templateData = {
      id: Date.now(),
      title,
      author: user?.nick || user?.nickname || user?.email?.split("@")[0] || "익명",
      user_id: user?.id || null,
      preset_key: activeStyle.key || "bold_dark",
      preset_label: activeStyle.label || "볼드 다크",
      slide_count: slides.length,
      slides_data: JSON.stringify(slides),
      preview: preview || null,
      created_at: new Date().toISOString(),
      use_count: 0,
    };

    // Supabase에 저장 시도
    (async () => {
      let savedToSupabase = false;
      try {
        if (supabase) {
          const { error } = await supabase.from("shared_templates").insert([templateData]);
          if (!error) savedToSupabase = true;
        }
      } catch {}

      // localStorage에 저장 (내 템플릿)
      try {
        const myList = JSON.parse(localStorage.getItem("nper_shared_templates_mine") || "[]");
        myList.unshift(templateData);
        localStorage.setItem("nper_shared_templates_mine", JSON.stringify(myList.slice(0, 50)));
      } catch {}

      // Supabase 실패 시 커뮤니티 localStorage에도 저장
      if (!savedToSupabase) {
        try {
          const comList = JSON.parse(localStorage.getItem("nper_shared_templates_community") || "[]");
          comList.unshift(templateData);
          localStorage.setItem("nper_shared_templates_community", JSON.stringify(comList.slice(0, 100)));
        } catch {}
      }

      alert(ko?"템플릿이 공유되었습니다!":"Template shared!");
    })();
  };

  const resetAll = () => {
    setWizStep(1); setTopic(""); setTopicDetail(""); setPageCount(6); setAiSugg(null);
    setSlideContents([]); setSelPreset(null); setSelSize(0);
    setCustomW(1080); setCustomH(1080);
    setSlides([]); setSted({});
  };

  // ═══ STEP 1 ═══════════════════════════════════════════════
  // ── shared mobile styles (injected once via step 1, applies globally) ──
  const mobileStyleBlock = <style>{`
    @media(max-width:768px){
      .cn-step-wrap{padding:16px 14px 40px!important}
      .cn-wiz-header{padding:16px 14px 0!important}
      .cn-wiz-header>div{gap:0!important;margin-bottom:20px!important}
      .cn-wiz-header>div>div>span{font-size:11px!important}
      .cn-wiz-header>div>div>div:first-child{width:24px!important;height:24px!important;font-size:10px!important}
      .cn-size-grid{grid-template-columns:repeat(3,1fr)!important}
      .cn-canvas-area{width:100%!important;max-width:100%!important;overflow-x:auto!important}
      .cn-step-wrap input,.cn-step-wrap textarea,.cn-step-wrap select{font-size:16px!important}
      .cn-step-wrap button{min-height:44px!important}
    }
    @media(max-width:480px){
      .cn-step-wrap{padding:12px 10px 36px!important}
      .cn-wiz-header{padding:12px 10px 0!important}
      .cn-wiz-header>div>div>span{font-size:10px!important;display:none!important}
      .cn-size-grid{grid-template-columns:repeat(2,1fr)!important}
      .cn-design-grid{grid-template-columns:repeat(3,1fr)!important}
      .cn-step-wrap .cn-topic-tags{gap:4px!important}
      .cn-step-wrap .cn-topic-tags button{padding:4px 10px!important;font-size:11px!important}
    }
  `}</style>;

  if (wizStep === 1) {
    const canNext = topic.trim().length > 0;
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        {mobileStyleBlock}
        {/* WizHeader 제거 */}
        <div className="cn-step-wrap" style={{ maxWidth:960, margin:"0 auto", padding:"16px 24px 40px", width:"100%", boxSizing:"border-box" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"주제를 입력하세요":"Enter a Topic"}</div>
            <div style={{ fontSize:12, color:muted }}>{ko?"주제를 입력하면 AI가 슬라이드를 자동 구성해줘요":"Enter a topic and AI will auto-generate your slides"}</div>
          </div>

          {/* URL 불러오기 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>{ko?"🔗 URL로 내용 불러오기":"🔗 Import from URL"}</div>
            <div style={{ fontSize:11, color:muted, marginBottom:10 }}>{ko?"뉴스 기사, 유튜브 링크, 블로그 URL을 붙여넣으면 자동으로 주제를 불러와요":"Paste a news article, YouTube, or blog URL to auto-import content"}</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") fetchFromUrl(); }}
                placeholder={ko?"https://... 뉴스/유튜브/블로그 URL 붙여넣기":"https://... Paste news/YouTube/blog URL"}
                style={{ flex:1, padding:"11px 14px", borderRadius:12, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:12, fontFamily:"inherit", outline:"none" }}/>
              <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                style={{ padding:"11px 18px", borderRadius:12, border:"none", cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:urlLoading||!urlInput.trim()?0.5:1, flexShrink:0, whiteSpace:"nowrap" }}>
                {urlLoading?(ko?"불러오는 중...":"Loading..."):(ko?"불러오기":"Import")}
              </button>
            </div>
            {urlResult && (
              <div style={{ marginTop:10, padding:"11px 14px", borderRadius:12, background:D?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)", border:`1px solid rgba(99,102,241,0.2)`, display:"flex", gap:10, alignItems:"flex-start" }}>
                {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:56, height:40, objectFit:"cover", borderRadius:5, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{urlResult.title}</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>{urlResult.type==="youtube"?"YouTube":urlResult.type==="news"?(ko?"뉴스 기사":"News"):(ko?"블로그":"Blog")} · {ko?"내용이 주제에 자동 입력됐어요":"Content auto-filled into topic"}</div>
                </div>
              </div>
            )}
          </div>

          {/* 예시 주제 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>{ko?"예시 주제":"Example Topics"}</div>
            <div className="cn-topic-tags" style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {TOPIC_EXAMPLES.map(ex=>{
                const isC = topic === ex.text;
                return (
                  <button key={ex.label} onClick={()=>{ setTopic(ex.text); setTopicDetail(ex.detail||""); }}
                    style={{ padding:"5px 12px", borderRadius:16, border:`1px solid ${isC?"#7c6aff":bdr}`, background:isC?"rgba(99,102,241,0.15)":"transparent", color:isC?(D?"#a5b4fc":"#7c6aff"):(D?"rgba(255,255,255,0.55)":"#555"), fontSize:12, cursor:"pointer", fontWeight:isC?700:400, transition:"all 0.12s" }}>
                    {ex.label}
                  </button>
                );
              })}
            </div>

            {/* 주제 입력 */}
            <div style={{ fontSize:11, fontWeight:700, color:text, marginBottom:5 }}>{ko?"주제":"Topic"}</div>
            <input value={topic} onChange={e=>setTopic(e.target.value)}
              placeholder={ko?"주제를 직접 입력하세요... ��) 직장인 번아웃 극복법 5가지":"Enter your topic... e.g. 5 Ways to Overcome Burnout"}
              style={{ width:"100%", background:D?"rgba(255,255,255,0.05)":"#f5f5f5", border:`1px solid ${bdr}`, borderRadius:12, padding:"11px 14px", color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>

            {/* 상세 내용 */}
            <div style={{ fontSize:11, fontWeight:700, color:text, marginTop:12, marginBottom:5 }}>
              {ko?"상세 내용":"Details"} <span style={{ fontWeight:400, color:muted }}>{ko?"(선택) — 각 슬라이드에 들어갈 핵심 내용":"(optional) — key content for each slide"}</span>
            </div>
            <textarea value={topicDetail} onChange={e=>setTopicDetail(e.target.value)}
              placeholder={ko?"각 슬라이드에 넣고 싶은 내용을 줄바꿈으로 구분해 입력하세요\n예)\n1. 번아웃 자가진단 체크리스트\n2. 업무 경계 설정법\n3. 마이크로 휴식 (50분 일하고 10분 쉬기)":"Enter content for each slide, separated by line breaks\ne.g.\n1. Burnout self-check\n2. Setting work boundaries\n3. Micro breaks (work 50min, rest 10min)"} rows={5}
              style={{ width:"100%", background:D?"rgba(255,255,255,0.05)":"#f5f5f5", border:`1px solid ${bdr}`, borderRadius:12, padding:"11px 14px", color:text, fontSize:12, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.8 }}/>

            {/* 참고 파일 첨부 */}
            <div style={{ fontSize:11, fontWeight:700, color:text, marginTop:12, marginBottom:5 }}>
              {ko?"참고 파일":"Reference Files"} <span style={{ fontWeight:400, color:muted }}>{ko?"(선택) — 파일 내용을 AI가 참고합니다":"(optional) — AI will reference these files"}</span>
            </div>
            {refFiles.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6 }}>
                {refFiles.map((f,i) => (
                  <span key={i} style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:D?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)", color:accentColor, display:"inline-flex", alignItems:"center", gap:4 }}>
                    {f.name}
                    <button onClick={()=>setRefFiles(prev=>{const n=[...prev];n.splice(i,1);return n;})} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:12, padding:0, lineHeight:1 }}>x</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="file" accept="image/*,.pdf,.txt,.doc,.docx,.csv,.xlsx,.pptx,.hwp" multiple style={{ display:"none" }} id="cardnews-ref-file"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  const valid = files.filter(f => f.size <= 10*1024*1024);
                  if (valid.length < files.length) alert(`${files.length-valid.length}개 파일이 10MB 초과로 제외`);
                  if (!valid.length) return;
                  const newRefs = [...refFiles];
                  let allContent = topicDetail;
                  for (const file of valid) {
                    try {
                      if (file.type.startsWith("image/")) {
                        const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(file); });
                        const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:base64.split(",")[1]}},{type:"text",text:"이 이미지의 핵심 내용을 카드뉴스 슬라이드에 쓸 수 있게 짧게 설명해주세요."}]}], 300);
                        newRefs.push({ name: file.name, summary: txt.slice(0,200) });
                        allContent += `\n[${file.name}] ${txt.slice(0,200)}`;
                      } else {
                        const t2 = await file.text().catch(()=>"");
                        newRefs.push({ name: file.name, summary: t2.slice(0,300) });
                        allContent += `\n[${file.name}] ${t2.slice(0,300)}`;
                      }
                    } catch {}
                  }
                  setRefFiles(newRefs);
                  setTopicDetail(allContent);
                }}/>
              <button onClick={() => document.getElementById("cardnews-ref-file")?.click()}
                style={{ padding:"7px 14px", borderRadius:10, border:`1px dashed ${bdr}`, cursor:"pointer", background:"transparent", color:muted, fontSize:12, fontWeight:600 }}>
                {ko?"📎 파일 첨부":"📎 Attach Files"}
              </button>
              <span style={{ fontSize:11, color:muted }}>{ko?"여러 파일 선택 가능":"Multiple files supported"}</span>
            </div>
          </div>

          {/* 슬라이드 수 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"슬라이드 수":"Slide Count"}</div>
              <div style={{ fontSize:22, fontWeight:900, color:accentColor }}>{pageCount}{ko?"장":""}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[3,4,5,6,7,8,10,12].map(n=>{
                const isC = pageCount===n;
                return (
                  <button key={n} onClick={()=>setPageCount(n)}
                    style={{ width:38, height:38, borderRadius:12, border:`1.5px solid ${isC?"#7c6aff":bdr}`, cursor:"pointer", fontSize:13, fontWeight:700, background:isC?"rgba(99,102,241,0.15)":"transparent", color:isC?"#a5b4fc":(D?"rgba(255,255,255,0.5)":"#666") }}>
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
                <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"AI 주제 추천":"AI Topic Suggestions"}</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"주제를 입력하면 더 구체적인 방향을 추천해줘요":"Enter a topic to get more specific suggestions"}</div>
              </div>
              <button onClick={getSugg} disabled={suggesting||!topic.trim()}
                style={{ padding:"8px 16px", borderRadius:12, border:"none", cursor:suggesting||!topic.trim()?"not-allowed":"pointer", background:"rgba(99,102,241,0.18)", color:"#a5b4fc", fontSize:12, fontWeight:800, opacity:suggesting||!topic.trim()?0.5:1, flexShrink:0 }}>
                {suggesting?(ko?"추천 중...":"Suggesting..."):(ko?"✨ AI 추천":"✨ AI Suggest")}
              </button>
            </div>
            {aiSugg && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[{key:"topics",items:aiSugg.topics,label:ko?"주제 방향":"Topic Directions"},{key:"subtopics",items:aiSugg.subtopics,label:ko?"세부 내용 방향":"Detail Directions"}]
                  .filter(r=>r.items?.length>0).map(({key,items,label})=>(
                  <div key={key}>
                    <div style={{ fontSize:10, fontWeight:700, color:muted, letterSpacing:1, marginBottom:5 }}>{label}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {items.map((v,i)=><button key={i} onClick={()=>setTopic(v)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid rgba(99,102,241,0.35)", background:"rgba(99,102,241,0.08)", color:text, fontSize:12, cursor:"pointer" }}>{v}</button>)}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10, color:muted }}>{ko?"클릭하면 주제에 바로 적용돼요":"Click to apply to your topic"}</div>
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={()=>{
              if(!canNext) return;
              setSlideContents(SLIDE_TYPES.slice(0,pageCount).map(t=>({id:t.id,label:t.label,headline:"",subheadline:"",body:"",badge:"",aiLoading:false})));
              setWizStep(2);
              if(urlResult) setAutoSuggest(true);
            }} disabled={!canNext}
              style={{ padding:"14px 28px", borderRadius:12, border:`1px solid ${canNext?"rgba(124,106,255,0.4)":"rgba(124,106,255,0.15)"}`, cursor:canNext?"pointer":"not-allowed", background:"transparent", color:canNext?"#7c6aff":"rgba(99,102,241,0.3)", fontSize:14, fontWeight:700 }}>
              {ko?"직접 기획":"Manual Plan"}
            </button>
            <button onClick={async()=>{
              if(!canNext) return;
              setPlanLoading(true);
              const initSlides = SLIDE_TYPES.slice(0,pageCount).map(t=>({id:t.id,label:t.label,headline:"",subheadline:"",body:"",badge:"",aiLoading:false}));
              setSlideContents(initSlides);
              try {
                const result = await generateSlideTexts({ topic, pageCount, sourceContent:urlResult?.content, topicDetail, slideTypes: SLIDE_TYPES });
                if(result?.slides?.length) {
                  setSlideContents(result.slides.map((s,i)=>({...initSlides[i],...s, aiLoading:false})));
                }
              } catch {}
              setPlanLoading(false);
              setWizStep(2);
            }} disabled={!canNext||planLoading}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext&&!planLoading?"pointer":"not-allowed", background:canNext?"#7c6aff":"rgba(99,102,241,0.3)", color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8, opacity:(!canNext||planLoading)?0.5:1, transition:"opacity 0.15s", minHeight:48 }}>
              {planLoading?(ko?"AI 기획 중...":"AI Planning..."):(ko?"AI 자동 기획 →":"AI Auto-Plan →")}
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
        {mobileStyleBlock}
        {/* WizHeader 제거 */}
        <div className="cn-step-wrap" style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 40px", width:"100%", boxSizing:"border-box" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"슬라이드 기획":"Slide Planning"}</div>
            <div style={{ fontSize:12, color:muted }}>{ko?"문구를 직접 입력하거나 비워두면 AI가 자동 채워줘요":"Enter text manually or leave blank for AI to auto-fill"}</div>
          </div>
          {urlResult && (
            <div style={{ marginBottom:16, padding:"12px 16px", borderRadius:12, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", gap:12 }}>
              {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{ width:44, height:32, objectFit:"cover", borderRadius:6, flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>🔗 {urlResult.title}</div>
                <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"불러온 내용을 기반으로 슬라이드가 자동 구성돼요":"Slides auto-generated from imported content"}</div>
              </div>
              <button onClick={suggestAll} disabled={planLoading}
                style={{ padding:"7px 14px", borderRadius:12, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:11, fontWeight:800, flexShrink:0 }}>
                {planLoading?(ko?"구성 중...":"Loading..."):(ko?"재구성":"Regenerate")}
              </button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, marginBottom:20, padding:"12px 16px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"전체 AI 추천":"AI Suggest All"}</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>{ko?"모든 슬라이드 내용을 AI가 한 번에 추천":"AI suggests content for all slides at once"}</div>
            </div>
            <button onClick={suggestAll} disabled={planLoading}
              style={{ padding:"9px 20px", borderRadius:12, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:800, opacity:planLoading?0.6:1, flexShrink:0 }}>
              {planLoading?(ko?"추천 중...":"Suggesting..."):(ko?"✨ 전체 자동 추천":"✨ Auto-Suggest All")}
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
                    {sc.aiLoading?<><div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(99,102,241,0.5)",borderTopColor:"#7c6aff",animation:"spin 0.8s linear infinite" }}/>{ko?"추천 중":"Loading"}</>:(ko?"✦ AI 추천":"✦ AI Suggest")}
                  </button>
                </div>
                <div style={{ padding:"10px 14px", display:"grid", gap:8 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>{ko?"헤드라인":"Headline"} <span style={{ fontWeight:400 }}>{ko?"(14자 이내)":"(max 14 chars)"}</span></div>
                    <input value={sc.headline||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,headline:e.target.value}:s))} placeholder={ko?"비워두면 AI가 자동 생성":"Leave blank for AI auto-fill"}
                      style={{ width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${sc.headline?"rgba(99,102,241,0.5)":bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5 }}>{ko?"본문":"Body"} <span style={{ fontWeight:400 }}>{ko?"(50자 이내, 선택)":"(max 50 chars, optional)"}</span></div>
                    <input value={sc.body||""} onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,body:e.target.value}:s))} placeholder={ko?"비워두면 AI가 자동 생성":"Leave blank for AI auto-fill"}
                      style={{ width:"100%",padding:"11px 14px",borderRadius:12,border:`1px solid ${bdr}`,background:D?"rgba(255,255,255,0.05)":"#f5f5f5",color:text,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
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
        {mobileStyleBlock}
        {/* WizHeader 제거 */}
        <div className="cn-step-wrap" style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 40px", width:"100%", boxSizing:"border-box" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:3 }}>{ko?"디자인 & 크기":"Design & Size"}</div>
            <div style={{ fontSize:12, color:muted }}>{ko?"템플릿을 사용하거나 스타일을 선택하세요":"Use a template or choose a style"}</div>
          </div>

          {/* 커뮤니티 템플릿 */}
          <CommunityTemplateSection
            D={D} text={text} muted={muted} bdr={bdr} cardBg={cardBg} ko={ko}
            onApply={(tpl) => {
              try {
                // 1) 슬라이드 텍스트 + 이미지 적용
                if (tpl.slides_data) {
                  const parsed = typeof tpl.slides_data === "string" ? JSON.parse(tpl.slides_data) : tpl.slides_data;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    const newSlides = parsed.map((s, i) => ({
                      id: s.id || `slide_${i}`,
                      label: s.label || "",
                      title: s.title || s.headline || "",
                      subtitle: s.subtitle || s.subheadline || "",
                      body: s.body || "",
                      highlight: s.highlight || s.badge || "",
                      headline: s.headline || s.title || "",
                      subheadline: s.subheadline || s.subtitle || "",
                      badge: s.badge || s.highlight || "",
                    }));
                    setSlides(newSlides);
                    setPageCount(newSlides.length);
                    if (tpl.title) setTopic(tpl.title);
                    // 배경 이미지/스타일 오버라이드 복원
                    const newSted = {};
                    parsed.forEach((s, i) => {
                      const overrides = {};
                      if (s.bgImage) overrides.bgImage = s.bgImage;
                      if (s.bgColor) overrides.bgColor = s.bgColor;
                      if (s.textColor) overrides.textColor = s.textColor;
                      if (s.overlayColor) overrides.overlayColor = s.overlayColor;
                      if (s.overlayOpacity !== undefined) overrides.overlayOpacity = s.overlayOpacity;
                      if (s.overlayType) overrides.overlayType = s.overlayType;
                      if (s.imgLayout) overrides.imgLayout = s.imgLayout;
                      if (s.imgLayoutRatio !== undefined) overrides.imgLayoutRatio = s.imgLayoutRatio;
                      if (s.bgScale !== undefined) overrides.bgScale = s.bgScale;
                      if (s.bgOpacity !== undefined) overrides.bgOpacity = s.bgOpacity;
                      if (Object.keys(overrides).length > 0) newSted[i] = overrides;
                    });
                    if (Object.keys(newSted).length > 0) setSted(newSted);
                  }
                }
                // 2) 디자인 프리셋 적용
                if (tpl.preset_key) {
                  const found = DESIGN_PRESETS.find(p => p.key === tpl.preset_key);
                  if (found) setSelPreset(found);
                }
                // 3) Step 4 (에디터)로 이동
                setWizStep(4);
              } catch (e) { console.warn("템플릿 적용 실패:", e); }
            }}
          />

          {/* 디자인 프리셋 */}
          <div style={{ padding:"16px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:10 }}>{ko?"디자인 스타일":"Design Style"}</div>
            <div className="cn-design-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))", gap:6 }}>
              {DESIGN_PRESETS.map((p) => {
                const sel = selPreset?.key === p.key;
                return (
                  <button key={p.key} onClick={() => setSelPreset(p)}
                    style={{ padding:0, borderRadius:10, border: sel ? "2px solid #7c6aff" : `1.5px solid ${bdr}`, cursor:"pointer", overflow:"hidden", background:"transparent", transition:"all 0.15s" }}>
                    <div style={{ width:"100%", height:48, background:p.bgColor, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ color:p.textColor, fontSize:11, fontWeight:800, letterSpacing:-0.3 }}>Aa</span>
                    </div>
                    <div style={{ padding:"4px 6px", fontSize:10, fontWeight: sel ? 800 : 500, color: sel ? "#7c6aff" : muted, textAlign:"center", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 이미지 크기 */}
          <div style={{ padding:"16px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>{ko?"이미지 크기":"Image Size"}</div>
              <div style={{ fontSize:14, fontWeight:900, color:"#7c6aff" }}>{imgW} × {imgH} px</div>
            </div>
            <div className="ai-grid-4 cn-size-grid" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
              {SIZE_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setSelSize(i)}
                  style={{ padding:"8px 4px",borderRadius:12,border:`1.5px solid ${selSize===i?"#7c6aff":bdr}`,background:selSize===i?"rgba(99,102,241,0.15)":"transparent",color:selSize===i?"#a5b4fc":(D?"rgba(255,255,255,0.65)":"#555"),fontSize:11,fontWeight:selSize===i?800:500,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.w&&<span style={{ fontSize:9,opacity:0.7 }}>{p.w}×{p.h}</span>}
                </button>
              ))}
            </div>
            {preset.w==null&&(
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>{ko?"가로":"Width"} (px)</div>
                  <input type="number" value={customW} onChange={e=>{const v=Number(e.target.value);setCustomW(Math.max(300,Math.min(4000,v||300)));}} min={300} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
                </div>
                <div style={{ fontSize:18,color:muted,paddingTop:18 }}>×</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>{ko?"세로":"Height"} (px)</div>
                  <input type="number" value={customH} onChange={e=>{const v=Number(e.target.value);setCustomH(Math.max(300,Math.min(4000,v||300)));}} min={300} max={4000} step={10} style={{...inputStyle,textAlign:"center",fontWeight:700}}/>
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

          {genError && <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#ef4444", fontSize:13 }}>{genError}</div>}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={()=>setWizStep(2)} style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>{ko?"← 이전":"← Back"}</button>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12,color:muted,marginBottom:6 }}>{ko?"예상 차감":"Est. cost"}: <b style={{ color:"#7c6aff" }}>10P</b></div>
              <button onClick={generate} disabled={loading}
                style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:loading?"not-allowed":"pointer",background:loading?"rgba(124,106,255,0.5)":"#7c6aff",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto",opacity:loading?0.5:1,transition:"opacity 0.15s",minHeight:48 }}>
                {loading?<><div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin 1s linear infinite" }}/>{ko?"생성 중...":"Generating..."}</>:user?(ko?"카드뉴스 만들기 →":"Generate →"):(ko?"✦ 1회 생성하기":"✦ Generate Once")}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* 생성 중 애니메이션 */}
        {loading && <PlanningAnimation pageCount={slides.length || pageCount} ko={ko} onCancel={() => setLoading(false)} />}
      </div>
    );
  }


  // ── 크레딧 소진 팝업 ──────────────────────────────────────

  // ═══ STEP 4: 캔버스 편집기 — 콘텐츠 영역만 차지 (사이드바 유지) ═══
  if (wizStep === 4) {
    return (
      <div style={{ position:"absolute", inset:0, zIndex:50, display:"flex", flexDirection:"column", overflow:"hidden", background:"#fff" }}>
        <Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"#888"}}>에디터 로딩 중...</div>}>
          <UnifiedCanvasEditor
            slides={slides.map((s, i) => {
              const st = sted[i] || {};
              const ss = getSlideStyle(i);
              return {
                title: st.title ?? s.title ?? "",
                subtitle: st.subtitle ?? s.subtitle ?? s.subheadline ?? "",
                body: st.body ?? s.body ?? "",
                highlight: st.highlight ?? s.highlight ?? s.badge ?? "",
                bgColor: st.bgColor || ss.bgColor || "#1a1a2e",
                textColor: st.textColor || ss.textColor || "#fff",
                fontSize: ss.titleSize || ss.fontSize || 42,
                fontFamily: st.fontFamily || ss.fontFamily || "Pretendard",
                image: st.bgImage || ss.bgImage || null,
                imgLayout: st.imgLayout || s.imgLayout || null,
                imgLayoutRatio: st.imgLayoutRatio ?? s.imgLayoutRatio ?? null,
                overlayColor: st.overlayColor || s.overlayColor || null,
                overlayOpacity: st.overlayOpacity ?? s.overlayOpacity ?? null,
                overlayType: st.overlayType || s.overlayType || null,
                bgScale: st.bgScale ?? s.bgScale ?? null,
                bgOpacity: st.bgOpacity ?? s.bgOpacity ?? null,
              };
            })}
            width={imgW}
            height={imgH}
            mode="cardnews"
            onSave={() => {}}
            onClose={() => setWizStep(3)}
            onShareTemplate={shareAsTemplate}
            inline
          />
        </Suspense>
      </div>
    );
  }

  return null;
}
