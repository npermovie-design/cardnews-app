import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { KlipyButton } from "./KlipyPicker";
import ShareButton from "./ShareButton";

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
const TOPIC_EXAMPLES = [
  { label:"직장인 번아웃", text:"직장인 번아웃 극복법 5가지",
    detail:"1. 번아웃 자가진단 체크리스트\n2. 업무 경계 설정법 (퇴근 후 메일 차단)\n3. 마이크로 휴식 (50분 일하고 10분 쉬기)\n4. 주말 디지털 디톡스 루틴\n5. 번아웃 예방을 위한 취미 활동 추천" },
  { label:"주식 입문", text:"주식 투자 완전 초보 가이드",
    detail:"1. 증권계좌 개설 방법 (MTS 추천)\n2. 주식 용어 정리 (PER, PBR, 시가총액)\n3. ETF vs 개별주 차이점\n4. 초보자 추천 투자 전략 (적립식)\n5. 절대 하면 안 되는 투자 실수 3가지" },
  { label:"다이어트", text:"다이어트 식단 추천",
    detail:"1. 칼로리 계산 없이 하는 간헐적 단식\n2. 아침/점심/저녁 식단 예시\n3. 다이어트 중 먹어도 되는 간식 5가지\n4. 운동 없이 체중 감량하는 생활습관\n5. 요요 없이 유지하는 방법" },
  { label:"마음 챙김", text:"하루 10분 마음 챙김 루틴",
    detail:"1. 아침 5분 감사일기 쓰기\n2. 호흡 명상 기초 (4-7-8 호흡법)\n3. 걷기 명상으로 스트레스 해소\n4. 자기 전 바디스캔 명상\n5. 일주일 마음 챙김 플래너 예시" },
  { label:"재테크", text:"2030 재테크 필수 습관",
    detail:"1. 월급 관리 50-30-20 법칙\n2. 비상금 통장 만들기 (6개월치)\n3. 청약통장 가입 꿀팁\n4. 소액으로 시작하는 투자 (로보어드바이저)\n5. 연말정산 절세 체크리스트" },
  { label:"홈트", text:"집에서 할 수 있는 홈트 루틴",
    detail:"1. 장비 없이 하는 전신 운동 5가지\n2. 초보자 주 3회 홈트 스케줄\n3. 코어 강화 플랭크 챌린지 (30일)\n4. 스트레칭으로 거북목 교정\n5. 홈트 효과를 높이는 식단 팁" },
  { label:"SNS 성장", text:"인스타그램 팔로워 늘리는 방법",
    detail:"1. 프로필 최적화 (바이오, 하이라이트)\n2. 릴스 알고리즘 공략법\n3. 해시태그 전략 (대형+중형+소형 조합)\n4. 게시 최적 시간대와 빈도\n5. 참여율을 높이는 캡션 작성법" },
  { label:"독서법", text:"성인 자기계발 독서법",
    detail:"1. 한 달에 책 4권 읽는 시간 관리법\n2. 밑줄 치기 vs 메모 독서법 비교\n3. 읽은 책 정리하는 노션 템플릿\n4. 분야별 입문서 추천 5권\n5. 독서 모임 참여로 꾸준히 읽기" },
  { label:"카페 창업", text:"소자본 카페 창업 가이드",
    detail:"1. 창업 비용 항목별 정리 (3천만원~1억)\n2. 상권 분석 체크리스트\n3. 메뉴 구성 전략 (시그니처 메뉴 만들기)\n4. SNS 마케팅으로 단골 만들기\n5. 실패하는 카페의 공통점 3가지" },
  { label:"여행 팁", text:"해외여행 준비 완벽 가이드",
    detail:"1. 항공권 최저가 예약 시기와 방법\n2. 여행자 보험 가입 꿀팁\n3. 짐 싸기 체크리스트 (캐리어 정리법)\n4. 현지에서 쓸 유용한 앱 5개\n5. 환전 vs 카드 결제 비교" },
];

// ── 슬라이드 타입 ────────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"cover",     label:"표지"          },
  { id:"intro",     label:"소개"          },
  { id:"point1",    label:"핵심 포인트 1" },
  { id:"point2",    label:"핵심 포인트 2" },
  { id:"point3",    label:"핵심 포인트 3" },
  { id:"point4",    label:"핵심 포인트 4" },
  { id:"point5",    label:"핵심 포인트 5" },
  { id:"detail",    label:"상세 설명"     },
  { id:"compare",   label:"비교표"        },
  { id:"stats",     label:"수치/지표"     },
  { id:"checklist", label:"체크리스트"    },
  { id:"tip",       label:"꿀팁"          },
  { id:"summary",   label:"요약 정리"     },
  { id:"quote",     label:"명언/인용구"   },
  { id:"cta",       label:"마무리/CTA"    },
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
  // 참고이미지 기반 신규 프리셋
  { key:"magazine",   label:"매거진",     bgColor:"#111111", textColor:"#ffffff", titleSize:38, bodySize:14, subtitleSize:11, highlightSize:14, titleWeight:"900", textAlign:"left",   textValign:"bottom", hlMode:"none",      lineHeightTitle:1.2,  lineHeightBody:1.6 },
  { key:"tech_blue",  label:"테크 블루",  bgColor:"#0a192f", textColor:"#e2e8f0", titleSize:36, bodySize:15, subtitleSize:11, highlightSize:14, titleWeight:"900", textAlign:"left",   textValign:"bottom", hlMode:"pill",      lineHeightTitle:1.25, lineHeightBody:1.7 },
  { key:"pastel",     label:"파스텔",     bgColor:"#fef3c7", textColor:"#1f2937", titleSize:30, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
  { key:"gradient_pk",label:"핑크 그라디", bgColor:"#831843", textColor:"#fce7f3", titleSize:34, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"900", textAlign:"center", textValign:"middle", hlMode:"box",       lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"pure_white", label:"퓨어 화이트",bgColor:"#ffffff", textColor:"#111827", titleSize:32, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"left",   textValign:"middle", hlMode:"underline", lineHeightTitle:1.35, lineHeightBody:1.7 },
  { key:"retro",      label:"레트로",     bgColor:"#1a1a2e", textColor:"#e94560", titleSize:36, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"left",   textValign:"bottom", hlMode:"box",       lineHeightTitle:1.2,  lineHeightBody:1.6 },
  { key:"nature",     label:"네이처",     bgColor:"#064e3b", textColor:"#d1fae5", titleSize:30, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"700", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
  { key:"mono",       label:"모노톤",     bgColor:"#27272a", textColor:"#d4d4d8", titleSize:32, bodySize:14, subtitleSize:11, highlightSize:14, titleWeight:"700", textAlign:"left",   textValign:"middle", hlMode:"underline", lineHeightTitle:1.3,  lineHeightBody:1.7 },
  // 추가 프리셋
  { key:"sunset",     label:"선셋",       bgColor:"#7c2d12", textColor:"#fed7aa", titleSize:34, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"900", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"midnight",   label:"미드나이트", bgColor:"#0f0d2e", textColor:"#c4b5fd", titleSize:34, bodySize:15, subtitleSize:12, highlightSize:15, titleWeight:"800", textAlign:"left",   textValign:"bottom", hlMode:"box",       lineHeightTitle:1.25, lineHeightBody:1.7 },
  { key:"coral",      label:"코랄",       bgColor:"#fff1f2", textColor:"#9f1239", titleSize:32, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
  { key:"slate",      label:"슬레이트",   bgColor:"#1e293b", textColor:"#e2e8f0", titleSize:32, bodySize:14, subtitleSize:11, highlightSize:14, titleWeight:"700", textAlign:"left",   textValign:"middle", hlMode:"underline", lineHeightTitle:1.3,  lineHeightBody:1.7 },
  { key:"lavender",   label:"라벤더",     bgColor:"#ede9fe", textColor:"#4c1d95", titleSize:30, bodySize:14, subtitleSize:12, highlightSize:14, titleWeight:"800", textAlign:"center", textValign:"middle", hlMode:"pill",      lineHeightTitle:1.35, lineHeightBody:1.8 },
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
    ctx.save();
    ctx.globalAlpha = slide.bgOpacity ?? 1;
    ctx.drawImage(bgImageEl, sx, sy, sw, sh);
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
  const maxW = CW - PAD * 2;

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
async function generateSlideTexts({ topic, pageCount, sourceContent, topicDetail }) {
  const types = SLIDE_TYPES.slice(0, pageCount);
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
  const [topicDetail, setTopicDetail] = useState("");
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
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaResults, setMediaResults] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);

  const searchMedia = async (q) => {
    if (!q.trim()) return;
    setMediaLoading(true);
    const results = [];
    // Pixabay
    const pbKey = import.meta.env.VITE_PIXABAY_KEY;
    if (pbKey) {
      try {
        const r = await fetch(`https://pixabay.com/api/?key=${pbKey}&q=${encodeURIComponent(q)}&per_page=12&image_type=photo`);
        const d = await r.json();
        (d.hits||[]).forEach(h => results.push({ url: h.largeImageURL, thumb: h.previewURL, src: "Pixabay", w: h.imageWidth, h: h.imageHeight }));
      } catch {}
    }
    // Pexels
    const pxKey = import.meta.env.VITE_PEXELS_KEY;
    if (pxKey) {
      try {
        const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=12`, { headers: { Authorization: pxKey } });
        const d = await r.json();
        (d.photos||[]).forEach(p => results.push({ url: p.src.large, thumb: p.src.small, src: "Pexels", w: p.width, h: p.height }));
      } catch {}
    }
    setMediaResults(results);
    setMediaLoading(false);
  };

  const [customFonts, setCustomFonts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_custom_fonts")||"[]"); } catch { return []; }
  });
  const fontFileRef = useRef(null);
  useGeneratingGuard(loading, 10); // 생성 중 이탈 방지

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

  // 테마
  const D = isDark || theme === "dark";
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

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:D?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // WizHeader
  const WizHeader = () => (
    <div style={{ padding:"20px 28px 0", maxWidth:800, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {[["1","주제 입력"],["2","슬라이드 기획"],["3","디자인 선택"],["4","편집"]].map(([n,label],i)=>{
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
          const fill = await generateSlideTexts({topic, pageCount, sourceContent: srcContent, topicDetail});
          fill.slides?.forEach(fs=>{
            const idx=slidesData.findIndex(s=>s.id===fs.id&&!s.title);
            if(idx>=0) slidesData[idx]={...slidesData[idx],title:fs.headline,subtitle:fs.subheadline,body:fs.body,highlight:fs.badge,headline:fs.headline};
          });
        }
      } else {
        const srcContent = urlResult ? [urlResult.title, urlResult.description, urlResult.content].filter(Boolean).join("\n").slice(0,700) : undefined;
        const textData = await generateSlideTexts({topic, pageCount, sourceContent: srcContent, topicDetail});
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

  // 사진 분할: 하나의 이미지를 슬라이드 개수만큼 분할하여 각 배경에 적용
  const handlePhotoSplit = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const count = slides.length;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        // 세로 분할 (위에서 아래로)
        const sliceH = img.naturalHeight / count;
        canvas.width = img.naturalWidth;
        canvas.height = Math.round(sliceH);
        const newSted = { ...sted };
        for (let i = 0; i < count; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, Math.round(sliceH * i), img.naturalWidth, Math.round(sliceH), 0, 0, canvas.width, canvas.height);
          newSted[i] = { ...(newSted[i] || {}), bgImage: canvas.toDataURL("image/jpeg", 0.85) };
        }
        setSted(newSted);
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
    setWizStep(1); setTopic(""); setTopicDetail(""); setPageCount(6); setAiSugg(null);
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
        <div style={{ maxWidth:800, margin:"0 auto", padding:"16px 28px 80px", width:"100%", boxSizing:"border-box" }}>
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
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8, letterSpacing:0.5 }}>예시 주제</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
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
            <div style={{ fontSize:11, fontWeight:700, color:text, marginBottom:5 }}>주제</div>
            <input value={topic} onChange={e=>setTopic(e.target.value)}
              placeholder="주제를 직접 입력하세요... 예) 직장인 번아웃 극복법 5가지"
              style={{ width:"100%", background:D?"rgba(255,255,255,0.05)":"#f5f5f5", border:`1px solid ${bdr}`, borderRadius:9, padding:"10px 14px", color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>

            {/* 상세 내용 */}
            <div style={{ fontSize:11, fontWeight:700, color:text, marginTop:12, marginBottom:5 }}>
              상세 내용 <span style={{ fontWeight:400, color:muted }}>(선택) — 각 슬라이드에 들어갈 핵심 내용</span>
            </div>
            <textarea value={topicDetail} onChange={e=>setTopicDetail(e.target.value)}
              placeholder={"각 슬라이드에 넣고 싶은 내용을 줄바꿈으로 구분해 입력하세요\n예)\n1. 번아웃 자가진단 체크리스트\n2. 업무 경계 설정법\n3. 마이크로 휴식 (50분 일하고 10분 쉬기)"} rows={5}
              style={{ width:"100%", background:D?"rgba(255,255,255,0.05)":"#f5f5f5", border:`1px solid ${bdr}`, borderRadius:9, padding:"10px 14px", color:text, fontSize:12, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.8 }}/>
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
                    style={{ width:38, height:38, borderRadius:9, border:`1.5px solid ${isC?"#7c6aff":bdr}`, cursor:"pointer", fontSize:13, fontWeight:700, background:isC?"rgba(99,102,241,0.15)":"transparent", color:isC?"#a5b4fc":(D?"rgba(255,255,255,0.5)":"#666") }}>
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

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={()=>{
              if(!canNext) return;
              setSlideContents(SLIDE_TYPES.slice(0,pageCount).map(t=>({id:t.id,label:t.label,headline:"",subheadline:"",body:"",badge:"",aiLoading:false})));
              setWizStep(2);
              if(urlResult) setAutoSuggest(true);
            }} disabled={!canNext}
              style={{ padding:"14px 28px", borderRadius:12, border:`1px solid ${canNext?"rgba(124,106,255,0.4)":"rgba(124,106,255,0.15)"}`, cursor:canNext?"pointer":"not-allowed", background:"transparent", color:canNext?"#7c6aff":"rgba(99,102,241,0.3)", fontSize:14, fontWeight:700 }}>
              직접 기획
            </button>
            <button onClick={async()=>{
              if(!canNext) return;
              setPlanLoading(true);
              const initSlides = SLIDE_TYPES.slice(0,pageCount).map(t=>({id:t.id,label:t.label,headline:"",subheadline:"",body:"",badge:"",aiLoading:false}));
              setSlideContents(initSlides);
              try {
                const result = await generateSlideTexts({ topic, pageCount, sourceContent:urlResult?.content, topicDetail });
                if(result?.slides?.length) {
                  setSlideContents(result.slides.map((s,i)=>({...initSlides[i],...s, aiLoading:false})));
                }
              } catch {}
              setPlanLoading(false);
              setWizStep(2);
            }} disabled={!canNext||planLoading}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext&&!planLoading?"pointer":"not-allowed", background:canNext?"#7c6aff":"rgba(99,102,241,0.3)", color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8, opacity:planLoading?0.7:1 }}>
              {planLoading?"AI 기획 중...":"AI 자동 기획 →"}
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
        <div style={{ maxWidth:800, margin:"0 auto", padding:"0 28px 80px", width:"100%", boxSizing:"border-box" }}>
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
                style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:11, fontWeight:800, flexShrink:0 }}>
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
              style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor:planLoading?"wait":"pointer", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:800, opacity:planLoading?0.6:1, flexShrink:0 }}>
              {planLoading?"추천 중...":"✨ 전체 자동 추천"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {slideContents.map((sc,i)=>(
              <div key={i} style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderBottom:`1px solid ${bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:"#7c6aff" }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:800, color:text }}>{sc.label}</span>
                    {sc.headline&&<span style={{ fontSize:11, color:"#7c6aff", fontWeight:600 }}>✓ 입력됨</span>}
                  </div>
                  <button onClick={()=>suggestOne(i)} disabled={sc.aiLoading||planLoading}
                    style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#7c6aff", fontSize:11, fontWeight:700, cursor:sc.aiLoading||planLoading?"wait":"pointer", opacity:sc.aiLoading||planLoading?0.5:1, display:"flex", alignItems:"center", gap:5 }}>
                    {sc.aiLoading?<><div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid rgba(99,102,241,0.5)",borderTopColor:"#7c6aff",animation:"spin 0.8s linear infinite" }}/>추천 중</>:"✦ AI 추천"}
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
            <button onClick={()=>setWizStep(3)} style={{ padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",background:"#7c6aff",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8 }}>
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
        <div style={{ maxWidth:800, margin:"0 auto", padding:"0 28px 80px", width:"100%", boxSizing:"border-box" }}>
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))", gap:8 }}>
              {DESIGN_PRESETS.map(dp=>{
                const isSel=selPreset?.key===dp.key;
                return (
                  <button key={dp.key} onClick={()=>setSelPreset(isSel?null:dp)}
                    style={{ border:`2px solid ${isSel?"#7c6aff":"transparent"}`,borderRadius:12,overflow:"hidden",cursor:"pointer",padding:0,background:"transparent",transition:"all 0.15s",boxShadow:isSel?"0 0 0 3px rgba(99,102,241,0.3)":"0 2px 8px rgba(0,0,0,0.15)" }}>
                    {/* 시각화된 미리보기 */}
                    <div style={{ width:"100%", paddingBottom:"130%", position:"relative", background:dp.bgColor }}>
                      <div style={{ position:"absolute",inset:0,padding:"10px 8px",display:"flex",flexDirection:"column",justifyContent:dp.textValign==="top"?"flex-start":dp.textValign==="bottom"?"flex-end":"center",textAlign:dp.textAlign||"left" }}>
                        <div style={{ fontSize:8,fontWeight:dp.titleWeight||700,color:dp.textColor,lineHeight:1.3,marginBottom:4 }}>
                          {topic?.slice(0,8)||"제목 미리보기"}
                        </div>
                        <div style={{ fontSize:5,color:dp.textColor,opacity:0.6,lineHeight:1.5 }}>
                          본문 텍스트가<br/>여기에 표시됩니다
                        </div>
                        {dp.hlMode!=="none"&&(
                          <div style={{ marginTop:4,fontSize:5,fontWeight:700,color:dp.hlMode==="box"?"#fff":dp.textColor,
                            background:dp.hlMode==="box"?dp.textColor+"40":dp.hlMode==="pill"?dp.textColor+"25":"transparent",
                            borderBottom:dp.hlMode==="underline"?`1px solid ${dp.textColor}`:"none",
                            padding:dp.hlMode==="pill"?"1px 4px":dp.hlMode==="box"?"1px 3px":"0",
                            borderRadius:dp.hlMode==="pill"?8:dp.hlMode==="box"?2:0,display:"inline-block" }}>
                            강조문구
                          </div>
                        )}
                      </div>
                      {isSel&&<div style={{ position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:"#7c6aff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:900 }}>✓</div>}
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
              <div style={{ fontSize:12,color:muted,marginBottom:6 }}>예상 차감: <b style={{ color:"#7c6aff" }}>10P</b></div>
              <button onClick={generate} disabled={loading}
                style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:loading?"wait":"pointer",background:"#7c6aff",color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto",opacity:loading?0.7:1 }}>
                {loading?<><div style={{ width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin 1s linear infinite" }}/>생성 중...</>:user?"카드뉴스 만들기 →":"✦ 1회 생성하기"}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes sc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes sc-progress{from{width:5%}to{width:92%}}`}</style>

        {/* 생성 중 전체화면 오버레이 */}
        {loading && (
          <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ textAlign:"center",maxWidth:400,padding:40 }}>
              <div style={{ fontSize:64,marginBottom:20,animation:"sc-float 2.5s ease-in-out infinite" }}>✨🎨</div>
              <div style={{ fontSize:22,fontWeight:900,color:"#fff",marginBottom:8 }}>카드뉴스 생성 중...</div>
              <div style={{ fontSize:14,color:"rgba(255,255,255,0.6)",marginBottom:28,lineHeight:1.6 }}>
                AI가 {slides.length || pageCount}장의 슬라이드를 제작하고 있어요<br/>잠시만 기다려주세요
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:10,maxWidth:260,margin:"0 auto 24px",textAlign:"left" }}>
                {["텍스트 구성 중...","디자인 적용 중...","이미지 렌더링 중...","마무리 작업..."].map((l,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10,opacity:0.8 }}>
                    <div style={{ width:18,height:18,borderRadius:"50%",border:"2px solid #7c6aff",borderTopColor:"transparent",animation:"spin 0.8s linear infinite",flexShrink:0 }}/>
                    <span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{ height:6,borderRadius:4,background:"rgba(255,255,255,0.1)",overflow:"hidden",maxWidth:260,margin:"0 auto" }}>
                <div style={{ height:"100%",borderRadius:4,background:"linear-gradient(90deg,#7c6aff,#8b5cf6,#ec4899)",animation:"sc-progress 8s ease-out forwards" }}/>
              </div>
            </div>
          </div>
        )}
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
            <div onClick={e=>e.stopPropagation()} style={{ width:"min(400px,92vw)",background:D?"#13102a":"#fff",borderRadius:20,padding:"32px 28px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}` }}>
              <div style={{ fontSize:48,marginBottom:16 }}>💎</div>
              <div style={{ fontSize:18,fontWeight:900,color:text,marginBottom:10 }}>포인트가 모두 소진되었습니다</div>
              <div style={{ fontSize:13,color:muted,lineHeight:1.8,marginBottom:24 }}>추가 작업을 하려면 포인트를 충전하거나<br/>관리자에게 문의해주세요.</div>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setShowCreditPopup(false)} style={{ flex:1,padding:"11px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer" }}>닫기</button>
                <button onClick={()=>{ setShowCreditPopup(false); window.location.hash="#pricing"; }} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer" }}>포인트 충전</button>
              </div>
              <div style={{ marginTop:12,fontSize:12,color:muted }}>또는 <a href="#contact" style={{ color:"#7c6aff" }}>관리자 문의하기 →</a></div>
            </div>
          </div>
        )}

        <input ref={bgFileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>updSted(selIdx,"bgImage",ev.target.result); r.readAsDataURL(f); e.target.value=""; }}/>
        <input ref={splitFileRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e=>{ const f=e.target.files[0]; if(f) handlePhotoSplit(f); e.target.value=""; }}/>

        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 16px 60px", animation:"fadeIn 0.3s ease" }}>
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
                      style={{ borderRadius:8,overflow:"hidden",border:`2px solid ${isActive?"#7c6aff":"transparent"}`,cursor:"pointer",transition:"border 0.12s",background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)" }}>
                      <div style={{ position:"relative" }}>
                        <SlideCanvas slide={sl} style={ss} CW={imgW} CH={imgH} displayW={106} bgImageSrc={sBg||undefined}/>
                        <div style={{ position:"absolute",top:3,left:3,width:16,height:16,borderRadius:4,background:isActive?"#7c6aff":"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff" }}>{i+1}</div>
                      </div>
                      <div style={{ padding:"3px 5px",background:D?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.95)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <span style={{ fontSize:8,color:isActive?"#a5b4fc":muted,fontWeight:isActive?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{s.label}</span>
                        <button onClick={e=>{e.stopPropagation();saveOne(i);}} style={{ fontSize:8,padding:"1px 4px",borderRadius:3,border:"none",background:"transparent",color:muted,cursor:"pointer",flexShrink:0 }}>↓</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:"flex",gap:4,marginTop:6 }}>
                <button onClick={()=>{
                  const newSlide = { id:"slide_"+Date.now(), label:`추가 ${slides.length+1}`, title:"", subtitle:"", body:"", highlight:"" };
                  setSlides(prev=>[...prev,newSlide]);
                }} style={{ flex:1,padding:"6px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:"#7c6aff",fontSize:10,cursor:"pointer",fontWeight:700 }}>+ 페이지 추가</button>
                {slides.length>2 && <button onClick={()=>{
                  if(!window.confirm("마지막 페이지를 삭제할까요?")) return;
                  setSlides(prev=>prev.slice(0,-1));
                  if(selIdx>=slides.length-1) setSelIdx(Math.max(0,slides.length-2));
                }} style={{ padding:"6px 10px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer",fontWeight:700 }}>삭제</button>}
              </div>
              <button onClick={resetAll} style={{ marginTop:4,width:"100%",padding:"6px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:10,cursor:"pointer",fontWeight:700 }}>🔄 처음부터</button>
            </div>

            {/* 편집 패널 */}
            <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:9,background:cardBg,border:`1px solid ${bdr}` }}>
                <div style={{ width:22,height:22,borderRadius:6,background:"rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#7c6aff",flexShrink:0 }}>{selIdx+1}</div>
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

              {/* 디자인 프리셋 빠른 변경 */}
              <div style={{ borderRadius:9,border:`1px solid ${bdr}`,background:cardBg,padding:"10px 12px",marginBottom:0 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:muted }}>🎯 디자인 프리셋</div>
                  <div style={{ display:"flex",gap:4 }}>
                    <button onClick={()=>{ if(selPreset) setSelPreset({...selPreset}); }}
                      style={{ fontSize:9,padding:"2px 8px",borderRadius:5,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>
                      전체 적용
                    </button>
                    <button onClick={()=>{ if(selPreset){ const so2={...(sted[selIdx]||{})}; Object.assign(so2,{bgColor:selPreset.bgColor,textColor:selPreset.textColor,titleSize:selPreset.titleSize,bodySize:selPreset.bodySize,textAlign:selPreset.textAlign,textValign:selPreset.textValign}); setSted(prev=>({...prev,[selIdx]:so2})); } }}
                      style={{ fontSize:9,padding:"2px 8px",borderRadius:5,border:`1px solid #7c6aff`,background:"rgba(99,102,241,0.15)",color:"#a5b4fc",cursor:"pointer",fontWeight:700 }}>
                      이 슬라이드만
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex",gap:4,overflowX:"auto",paddingBottom:4 }}>
                  {DESIGN_PRESETS.map(dp=>{
                    const isSel=selPreset?.key===dp.key;
                    return <button key={dp.key} onClick={()=>setSelPreset(dp)}
                      style={{ flexShrink:0,padding:"6px 10px",borderRadius:6,border:`1.5px solid ${isSel?"#7c6aff":"transparent"}`,
                        background:dp.bgColor,color:dp.textColor,fontSize:10,fontWeight:isSel?800:500,cursor:"pointer",whiteSpace:"nowrap",
                        boxShadow:isSel?"0 0 0 2px rgba(99,102,241,0.4)":"0 1px 4px rgba(0,0,0,0.2)" }}>
                      {dp.label}
                    </button>;
                  })}
                </div>
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
                {/* 폰트 선택 (드롭다운) */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:4 }}>폰트</div>
                  <select value={so.fontFamily||curStyle.fontFamily||"sans-serif"} onChange={e=>{loadGFont(e.target.value);updSted(selIdx,"fontFamily",e.target.value);}}
                    style={{ width:"100%",padding:"8px 10px",borderRadius:7,border:`1px solid ${bdr}`,background:inputBg,color:text,fontSize:12,outline:"none",cursor:"pointer",fontFamily:so.fontFamily||curStyle.fontFamily||"sans-serif" }}>
                    <option value="sans-serif">기본 (시스템 고딕)</option>
                    <option value="Noto Sans KR">Noto Sans KR (고딕)</option>
                    <option value="Nanum Gothic">나눔 고딕</option>
                    <option value="Nanum Myeongjo">나눔 명조</option>
                    <option value="Nanum Pen Script">나눔 손글씨 펜</option>
                    <option value="Gamja Flower">감자꽃 (귀여운체)</option>
                    <option value="Do Hyeon">도현체 (배민)</option>
                    <option value="Jua">주아체 (배민)</option>
                    <option value="Black Han Sans">검은 한산스</option>
                    <option value="Gugi">구기체</option>
                    <option value="Single Day">싱글데이</option>
                    <option value="Sunflower">해바라기</option>
                    <option value="Poor Story">가난한 이야기</option>
                    <option value="Gothic A1">고딕 A1</option>
                    <option value="Gowun Dodum">고운 돋움</option>
                    <option value="Gowun Batang">고운 바탕</option>
                    <option value="IBM Plex Sans KR">IBM 플렉스 한글</option>
                    <option value="Hahmlet">함렛 세리프</option>
                    <option value="Georgia">Georgia (영문 세리프)</option>
                    <option value="Arial">Arial (영문 산세리프)</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="monospace">Monospace (코딩체)</option>
                    {customFonts.map(cf=><option key={cf.name} value={cf.name}>{cf.name} (업로드)</option>)}
                  </select>
                  {/* 커스텀 폰트 업로드 */}
                  <div style={{ marginTop:6 }}>
                    <button type="button" onClick={()=>fontFileRef.current?.click()}
                      style={{ width:"100%",padding:"7px 10px",borderRadius:7,border:`1px dashed ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",textAlign:"center" }}>
                      + 내 폰트 업로드 (.otf, .ttf, .woff2)
                    </button>
                    <input ref={fontFileRef} type="file" accept=".otf,.ttf,.woff,.woff2" style={{display:"none"}} onChange={async e=>{
                      const file = e.target.files?.[0]; if(!file) return;
                      const fontName = file.name.replace(/\.(otf|ttf|woff2?)/i,"");
                      try {
                        const buf = await file.arrayBuffer();
                        const ff = new FontFace(fontName, buf);
                        await ff.load();
                        document.fonts.add(ff);
                        // base64로 저장하여 세션 간 유지
                        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                        const updated = [...customFonts.filter(f=>f.name!==fontName),{name:fontName,data:b64}];
                        setCustomFonts(updated);
                        try { localStorage.setItem("nper_custom_fonts", JSON.stringify(updated)); } catch {}
                        updSted(selIdx,"fontFamily",fontName);
                      } catch(err){ alert("폰트 로드 실패: "+err.message); }
                      e.target.value="";
                    }}/>
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:4 }}>제목 크기 ({so.titleSize||curStyle.titleSize||32}px)</div>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    <button onClick={()=>updSted(selIdx,"titleSize",Math.max(16,(so.titleSize||curStyle.titleSize||32)-2))} style={{ ...btnSm }}>−</button>
                    <div style={{ flex:1,height:5,borderRadius:3,background:D?"rgba(255,255,255,0.1)":"#e8e8e8",overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:3,background:"#7c6aff",width:`${((so.titleSize||curStyle.titleSize||32)-16)/(72-16)*100}%`,transition:"width 0.15s" }}/>
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
                      <div style={{ height:"100%",borderRadius:3,background:"#7c6aff",width:`${((so.bodySize||curStyle.bodySize||15)-8)/(36-8)*100}%`,transition:"width 0.15s" }}/>
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
                        return <button key={v} onClick={()=>updSted(selIdx,"textAlign",v)} style={{ flex:1,padding:"6px",borderRadius:6,border:`1px solid ${cur===v?"#7c6aff":bdr}`,background:cur===v?"rgba(99,102,241,0.2)":"transparent",color:cur===v?"#a5b4fc":muted,cursor:"pointer",fontSize:13 }}>{icon}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10,color:muted,marginBottom:4 }}>세로 정렬</div>
                    <div style={{ display:"flex",gap:3 }}>
                      {[["top","⬆"],["middle","↕"],["bottom","⬇"]].map(([v,icon])=>{
                        const cur=so.textValign||curStyle.textValign||"middle";
                        return <button key={v} onClick={()=>updSted(selIdx,"textValign",v)} style={{ flex:1,padding:"6px",borderRadius:6,border:`1px solid ${cur===v?"#7c6aff":bdr}`,background:cur===v?"rgba(99,102,241,0.2)":"transparent",color:cur===v?"#a5b4fc":muted,cursor:"pointer",fontSize:13 }}>{icon}</button>;
                      })}
                    </div>
                  </div>
                </div>
                {/* 텍스트 위치 미세조정 */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10,color:muted,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span>텍스트 위치 미세조정</span>
                    {(so.textOffsetX||so.textOffsetY)?<button onClick={()=>{updSted(selIdx,"textOffsetX",0);updSted(selIdx,"textOffsetY",0);}} style={{ fontSize:9,padding:"1px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>초기화</button>:null}
                  </div>
                  <div style={{ display:"flex",gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9,color:muted,marginBottom:3 }}>좌우 ({so.textOffsetX||0}px)</div>
                      <input type="range" min="-200" max="200" value={so.textOffsetX||0} onChange={e=>updSted(selIdx,"textOffsetX",parseInt(e.target.value))} style={{ width:"100%",accentColor:"#7c6aff" }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:9,color:muted,marginBottom:3 }}>상하 ({so.textOffsetY||0}px)</div>
                      <input type="range" min="-200" max="200" value={so.textOffsetY||0} onChange={e=>updSted(selIdx,"textOffsetY",parseInt(e.target.value))} style={{ width:"100%",accentColor:"#7c6aff" }}/>
                    </div>
                  </div>
                </div>
                {/* 현재 스타일 전체 적용 */}
                <button onClick={()=>{
                  const cur = sted[selIdx]||{};
                  const keys = ["bgColor","textColor","titleSize","bodySize","textAlign","textValign","fontFamily","textOffsetX","textOffsetY","bgOpacity","overlayColor","overlayOpacity","overlayType"];
                  setSted(prev => {
                    const next = {...prev};
                    slides.forEach((_,i)=>{ if(i!==selIdx){ const p={...(next[i]||{})}; keys.forEach(k=>{ if(cur[k]!==undefined) p[k]=cur[k]; }); next[i]=p; } });
                    return next;
                  });
                }} style={{ width:"100%",padding:"8px",borderRadius:8,border:`1px solid rgba(74,222,128,0.3)`,background:"rgba(74,222,128,0.06)",color:"#4ade80",fontSize:11,fontWeight:700,cursor:"pointer",marginBottom:10 }}>
                  ✨ 현재 스타일 전체 슬라이드에 적용
                </button>
                {so.bgImage ? (
                  <div>
                    <div style={{ display:"flex",gap:8,alignItems:"center",padding:"7px 10px",borderRadius:8,border:`1px solid ${bdr}`,background:inputBg,marginBottom:8 }}>
                      <img src={so.bgImage} alt="" style={{ width:38,height:38,objectFit:"cover",borderRadius:5,flexShrink:0 }}/>
                      <span style={{ flex:1,fontSize:11,color:muted }}>배경 이미지 적용됨</span>
                      <button onClick={()=>updSted(selIdx,"bgImage",undefined)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer" }}>제거</button>
                    </div>
                    {/* 배경 이미지 투명도 */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ fontSize:10,color:muted,marginBottom:4 }}>배경 투명도 ({Math.round((so.bgOpacity??1)*100)}%)</div>
                      <input type="range" min="0" max="100" value={Math.round((so.bgOpacity??1)*100)}
                        onChange={e=>updSted(selIdx,"bgOpacity",parseInt(e.target.value)/100)}
                        style={{ width:"100%",accentColor:"#7c6aff" }}/>
                    </div>
                    {/* 이미지 위 오버레이 색상 */}
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10,color:muted,marginBottom:4 }}>오버레이 색상</div>
                        <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                          <input type="color" value={so.overlayColor||"#000000"} onChange={e=>updSted(selIdx,"overlayColor",e.target.value)}
                            style={{ width:30,height:30,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:1 }}/>
                          {so.overlayColor&&<button onClick={()=>{updSted(selIdx,"overlayColor",undefined);updSted(selIdx,"overlayOpacity",undefined);}} style={{ fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer" }}>↩</button>}
                        </div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10,color:muted,marginBottom:4 }}>오버레이 투명도 ({Math.round((so.overlayOpacity??0.3)*100)}%)</div>
                        <input type="range" min="0" max="100" value={Math.round((so.overlayOpacity??0.3)*100)}
                          onChange={e=>updSted(selIdx,"overlayOpacity",parseInt(e.target.value)/100)}
                          style={{ width:"100%",accentColor:"#7c6aff" }}/>
                      </div>
                    </div>
                    {/* 오버레이 타입 (그라데이션 방향) */}
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontSize:10,color:muted,marginBottom:4 }}>오버레이 스타일</div>
                      <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                        {[["solid","단색 전체"],["bottom","↓ 하단 그라데이션"],["top","↑ 상단 그라데이션"],["left","← 좌측 그라데이션"],["right","→ 우측 그라데이션"],["center","◎ 중앙 비네팅"]].map(([v,l])=>(
                          <button key={v} onClick={()=>updSted(selIdx,"overlayType",v)}
                            style={{ padding:"4px 8px",borderRadius:6,border:`1px solid ${(so.overlayType||"solid")===v?"#7c6aff":bdr}`,
                              background:(so.overlayType||"solid")===v?"rgba(99,102,241,0.15)":"transparent",
                              color:(so.overlayType||"solid")===v?"#a5b4fc":muted,fontSize:10,fontWeight:(so.overlayType||"solid")===v?700:400,cursor:"pointer" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    <button onClick={()=>bgFileRef.current?.click()} style={{ flex:1,minWidth:80,padding:"8px",borderRadius:8,border:`1.5px dashed ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer" }}>이미지 업로드</button>
                    <button onClick={()=>setShowMediaSearch(true)} style={{ flex:1,minWidth:80,padding:"8px",borderRadius:8,border:`1px solid rgba(99,102,241,0.3)`,background:"rgba(99,102,241,0.08)",color:"#a5b4fc",fontSize:11,cursor:"pointer",fontWeight:700 }}>이미지 검색</button>
                    <button onClick={()=>splitFileRef.current?.click()} style={{ flex:1,minWidth:80,padding:"8px",borderRadius:8,border:`1px solid rgba(34,197,94,0.3)`,background:"rgba(34,197,94,0.08)",color:"#22c55e",fontSize:11,cursor:"pointer",fontWeight:700 }} title="하나의 이미지를 슬라이드 수만큼 분할하여 각 배경에 적용">사진 분할</button>
                    <KlipyButton isDark={isDark} compact onSelect={(item)=>{
                      if(item.url){ setSlides(prev=>{const n=[...prev];n[selIdx]={...n[selIdx],bgImage:item.url};return n;}); }
                    }} buttonStyle={{flex:1,minWidth:80,padding:"8px",fontSize:11,justifyContent:"center"}} />
                  </div>
                )}
              </div>

              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>saveOne(selIdx)} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",background:"#7c6aff",color:"#fff",fontSize:13,fontWeight:800 }}>PNG 저장</button>
                <button onClick={saveAll} disabled={dlSt.busy} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",cursor:"pointer",background:D?"rgba(255,255,255,0.1)":"#2c2c2c",color:"#fff",fontSize:13,fontWeight:800,opacity:dlSt.busy?0.7:1 }}>{dlSt.msg||"ZIP 저장"}</button>
              </div>
              <ShareButton title={topic||"카드뉴스"} text={topic||""} isDark={D} compact />
            </div>

            {/* 미리보기 */}
            <div style={{ flexShrink:0,width:360,display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%" }}>
                <div style={{ fontSize:11,fontWeight:700,color:muted }}>미리보기</div>
                {imgH > imgW && <button onClick={()=>setShowSafeZone(s=>!s)}
                  style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:6,cursor:"pointer",border:`1px solid ${showSafeZone?"rgba(34,197,94,0.4)":bdr}`,background:showSafeZone?"rgba(34,197,94,0.1)":"transparent",color:showSafeZone?"#22c55e":muted }}>
                  {showSafeZone?"세이프존 ON":"세이프존"}
                </button>}
              </div>
              <div style={{ borderRadius:12,overflow:"hidden",boxShadow:"0 6px 28px rgba(0,0,0,0.35)",border:`1px solid ${bdr}`,width:"100%",cursor:"pointer",position:"relative" }}
                onClick={()=>{
                  const canvas = document.createElement("canvas");
                  drawDetailSlide(canvas, curSlide, curStyle, imgW, imgH, null);
                  const url = canvas.toDataURL("image/png");
                  const w = window.open("","_blank","width="+Math.min(imgW,1200)+",height="+Math.min(imgH,900));
                  if(w){w.document.write(`<img src="${url}" style="max-width:100%;max-height:100vh;display:block;margin:auto"/>`);w.document.title="미리보기";}
                }}>
                <SlideCanvas slide={curSlide} style={curStyle} CW={imgW} CH={imgH} displayW={358} bgImageSrc={so.bgImage||undefined}/>
                {/* 세이프존 가이드 오버레이 (세로 이미지일 때만) */}
                {showSafeZone && imgH > imgW && (() => {
                  const scale = 358 / imgW;
                  const dispH = Math.round(imgH * scale);
                  // 인스타 릴스 비율 기준 (1080x1920 기준 비율 적용)
                  const topPct = 250 / 1920; // 상단 ~13%
                  const botPct = 420 / 1920; // 하단 ~22%
                  const leftPct = 70 / 1080; // 좌측 ~6.5%
                  const rightPct = (98 + 193) / 1080; // 우측 ~27%
                  return (
                    <div style={{ position:"absolute",inset:0,pointerEvents:"none",height:dispH }}>
                      {/* 상단 위험 영역 */}
                      <div style={{ position:"absolute",top:0,left:0,right:0,height:(topPct*100)+"%",background:"rgba(239,68,68,0.18)",borderBottom:"1.5px dashed rgba(239,68,68,0.6)" }}>
                        <span style={{ position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:8,color:"rgba(239,68,68,0.8)",fontWeight:700,whiteSpace:"nowrap" }}>상단 UI 영역</span>
                      </div>
                      {/* 하단 위험 영역 */}
                      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:(botPct*100)+"%",background:"rgba(239,68,68,0.18)",borderTop:"1.5px dashed rgba(239,68,68,0.6)" }}>
                        <span style={{ position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",fontSize:8,color:"rgba(239,68,68,0.8)",fontWeight:700,whiteSpace:"nowrap" }}>하단 UI 영역</span>
                      </div>
                      {/* 우측 위험 영역 */}
                      <div style={{ position:"absolute",top:(topPct*100)+"%",right:0,bottom:(botPct*100)+"%",width:(rightPct*100)+"%",background:"rgba(239,68,68,0.12)",borderLeft:"1.5px dashed rgba(239,68,68,0.5)" }}>
                        <span style={{ position:"absolute",top:"50%",left:2,transform:"translateY(-50%) rotate(-90deg)",fontSize:7,color:"rgba(239,68,68,0.7)",fontWeight:700,whiteSpace:"nowrap",transformOrigin:"left center" }}>아이콘</span>
                      </div>
                      {/* 세이프존 테두리 */}
                      <div style={{ position:"absolute",top:(topPct*100)+"%",bottom:(botPct*100)+"%",left:(leftPct*100)+"%",right:(rightPct*100)+"%",border:"1.5px solid rgba(34,197,94,0.5)",borderRadius:4 }}>
                        <span style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:9,color:"rgba(34,197,94,0.7)",fontWeight:800,whiteSpace:"nowrap" }}>Safe Zone</span>
                      </div>
                    </div>
                  );
                })()}
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

        {/* 이미지 검색 모달 */}
        {showMediaSearch && (
          <div onClick={()=>setShowMediaSearch(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"min(700px,95vw)",maxHeight:"80vh",background:D?"#13102a":"#fff",borderRadius:20,padding:"24px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}`,display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontSize:16,fontWeight:900,color:text}}>🔍 이미지 검색 (Pixabay · Pexels)</div>
                <button onClick={()=>setShowMediaSearch(false)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,cursor:"pointer",fontSize:16}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <input value={mediaQuery} onChange={e=>setMediaQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchMedia(mediaQuery)}
                  placeholder="검색어 입력 (예: nature, food, office)"
                  style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:inputBg,color:text,fontSize:13,outline:"none"}}/>
                <button onClick={()=>searchMedia(mediaQuery)} disabled={mediaLoading}
                  style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#7c6aff",color:"#fff",fontSize:13,fontWeight:700,cursor:mediaLoading?"wait":"pointer",opacity:mediaLoading?0.6:1}}>
                  {mediaLoading?"검색중...":"검색"}
                </button>
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {mediaResults.length > 0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                    {mediaResults.map((img,i) => (
                      <div key={i} onClick={()=>{
                        // 이미지를 배경으로 적용
                        const imgEl = new Image();
                        imgEl.crossOrigin = "anonymous";
                        imgEl.onload = () => {
                          const canvas = document.createElement("canvas");
                          canvas.width = imgEl.width; canvas.height = imgEl.height;
                          canvas.getContext("2d").drawImage(imgEl, 0, 0);
                          updSted(selIdx, "bgImage", canvas.toDataURL("image/jpeg", 0.85));
                          setShowMediaSearch(false);
                        };
                        imgEl.onerror = () => { updSted(selIdx, "bgImage", img.url); setShowMediaSearch(false); };
                        imgEl.src = img.url;
                      }}
                        style={{borderRadius:10,overflow:"hidden",border:`1px solid ${bdr}`,cursor:"pointer",position:"relative",aspectRatio:"4/3"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                        onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                        <img src={img.thumb} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px",background:"rgba(0,0,0,0.6)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:9,color:"#fff",fontWeight:600}}>{img.src}</span>
                          <span style={{fontSize:8,color:"rgba(255,255,255,0.6)"}}>{img.w}x{img.h}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"40px 0",color:muted}}>
                    <div style={{fontSize:36,marginBottom:12}}>🖼</div>
                    <div style={{fontSize:13}}>키워드를 입력하고 검색하세요</div>
                    <div style={{fontSize:11,marginTop:6,opacity:0.6}}>클릭하면 배경 이미지로 바로 적용됩니다</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
