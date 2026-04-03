import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { callAI } from "./aiClient";
import { useI18n } from "./i18n.jsx";
import { lazy, Suspense } from "react";
const UnifiedCanvasEditor = lazy(() => import("./UnifiedCanvasEditor"));

/* ══════════════════════════════════════════════════════════════
   SectionDetailPageGenerator.jsx
   ✅ 무형서비스 섹션 기반 상세페이지 에디터
   ✅ Step1: 카테고리 + 서비스 정보
   ✅ Step2: 섹션 구성 (드래그 정렬, 테마 선택)
   ✅ Step3: AI 텍스트 생성
   ✅ Step4: 섹션 비주얼 편집
   ✅ Step5: 내보내기
══════════════════════════════════════════════════════════════ */

// ── 무형서비스 카테고리 (계층형) ────────────────────────────
const INTANGIBLE_CATEGORIES = [
  { key:"education", label:"교육", icon:"📚", subs:[
    {key:"marketing",label:"마케팅/광고"},{key:"dev_it",label:"개발/IT"},
    {key:"design_video",label:"디자인/영상"},{key:"realestate",label:"부동산/재테크"},
    {key:"license_job",label:"자격증/취업"},{key:"language",label:"어학/외국어"},
    {key:"music_art",label:"음악/미술"},{key:"kids_edu",label:"자녀교육/육아"}
  ]},
  { key:"coaching", label:"코칭/컨설팅", icon:"🎯", subs:[
    {key:"biz_growth",label:"비즈니스 성장"},{key:"startup",label:"창업/사업"},
    {key:"career",label:"커리어/이직"},{key:"life_coaching",label:"라이프코칭"},
    {key:"love_marriage",label:"연애/결혼"},{key:"legal_tax",label:"법률/세무"}
  ]},
  { key:"health", label:"건강/뷰티", icon:"💪", subs:[
    {key:"diet_body",label:"다이어트/체형"},{key:"pt_fitness",label:"PT/피트니스"},
    {key:"skin_care",label:"피부관리"},{key:"counseling",label:"심리상담/명상"},
    {key:"nutrition",label:"식단/영양"}
  ]},
  { key:"service", label:"서비스/플랫폼", icon:"🔧", subs:[
    {key:"saas_app",label:"SaaS/앱"},{key:"subscription",label:"구독서비스"},
    {key:"freelancer",label:"프리랜서"},{key:"agency",label:"대행서비스"},
    {key:"community",label:"커뮤니티/멤버십"}
  ]},
];

// ── 섹션 타입 (20종) ────────────────────────────────────────
const SECTION_TYPES = [
  { id:"hero_dark", label:"히어로 (다크)", defaultH:900, images:[{role:"main_photo",x:0,y:0,w:480,h:480,placeholder:"강사/전문가 인물사진"}], desc:"큰 인물사진 + 헤드라인 + 통계" },
  { id:"hero_light", label:"히어로 (라이트)", defaultH:900, images:[{role:"main_photo",x:0,y:0,w:480,h:480,placeholder:"강사/전문가 인물사진"}], desc:"밝은 배경 + 인물사진" },
  { id:"pain_points", label:"고민/공감", defaultH:700, images:[], desc:"타겟 고민 나열" },
  { id:"expert_intro", label:"전문가 소개", defaultH:850, images:[{role:"profile",x:165,y:60,w:150,h:150,placeholder:"프로필 사진"}], desc:"프로필 + 경력" },
  { id:"media_proof", label:"미디어 증거", defaultH:600, images:[{role:"media1",x:16,y:200,w:145,h:100,placeholder:"미디어1"},{role:"media2",x:167,y:200,w:145,h:100,placeholder:"미디어2"},{role:"media3",x:319,y:200,w:145,h:100,placeholder:"미디어3"}], desc:"출연/기사" },
  { id:"review_cards", label:"수강후기", defaultH:950, images:[], desc:"후기 카드" },
  { id:"stats_highlight", label:"숫자 강조", defaultH:500, images:[], desc:"큰 숫자 통계" },
  { id:"curriculum", label:"커리큘럼", defaultH:1000, images:[], desc:"주차별 교육 내용" },
  { id:"process_steps", label:"진행 과정", defaultH:800, images:[], desc:"타임라인 스텝" },
  { id:"comparison", label:"비교표", defaultH:700, images:[], desc:"Before vs After" },
  { id:"benefits", label:"혜택/장점", defaultH:800, images:[], desc:"아이콘 + 텍스트 카드" },
  { id:"before_after", label:"변화/결과", defaultH:700, images:[{role:"before",x:16,y:200,w:216,h:280,placeholder:"Before 사진"},{role:"after",x:248,y:200,w:216,h:280,placeholder:"After 사진"}], desc:"전후 대비" },
  { id:"pricing", label:"가격표", defaultH:800, images:[], desc:"티어별 가격" },
  { id:"faq", label:"자주 묻는 질문", defaultH:800, images:[], desc:"Q&A 리스트" },
  { id:"target_audience", label:"이런 분께 추천", defaultH:600, images:[], desc:"대상 체크리스트" },
  { id:"bonus_offers", label:"보너스 혜택", defaultH:600, images:[], desc:"추가 제공 항목" },
  { id:"cta_final", label:"최종 CTA", defaultH:700, images:[], desc:"마감 긴급성 + 구매" },
  { id:"testimonial_single", label:"대표 후기", defaultH:500, images:[{role:"person",x:190,y:50,w:100,h:100,placeholder:"후기 인물"}], desc:"큰 인용문" },
  { id:"gallery", label:"포토 갤러리", defaultH:700, images:[{role:"g1",x:16,y:100,w:145,h:145,placeholder:"사진1"},{role:"g2",x:167,y:100,w:145,h:145,placeholder:"사진2"},{role:"g3",x:319,y:100,w:145,h:145,placeholder:"사진3"},{role:"g4",x:16,y:260,w:145,h:145,placeholder:"사진4"},{role:"g5",x:167,y:260,w:145,h:145,placeholder:"사진5"},{role:"g6",x:319,y:260,w:145,h:145,placeholder:"사진6"}], desc:"사진 그리드" },
  { id:"guarantee", label:"보증/신뢰", defaultH:500, images:[{role:"badge",x:165,y:50,w:150,h:150,placeholder:"인증 뱃지"}], desc:"환불 보증" },
];

// ── 카테고리별 컬러 테마 ────────────────────────────────────
const COLOR_THEMES = {
  education: [
    { key:"dark_gold", label:"다크 골드", bg:"#1a1a1a", text:"#fff", accent:"#f9e547", secBg:"#faf6f0", secText:"#2c1810" },
    { key:"navy_gold", label:"네이비 골드", bg:"#0f1b3d", text:"#e8e0d0", accent:"#d4a853", secBg:"#f5f0e8", secText:"#1a1a1a" },
    { key:"cream_brown", label:"크림 브라운", bg:"#faf6f0", text:"#2c1810", accent:"#8b6914", secBg:"#1a1a1a", secText:"#fff" },
  ],
  coaching: [
    { key:"green_cream", label:"그린 크림", bg:"#2d6a4f", text:"#fff", accent:"#95d5b2", secBg:"#faf8f3", secText:"#1a1a1a" },
    { key:"purple_dark", label:"퍼플 다크", bg:"#1a0a2e", text:"#e8d5f5", accent:"#a855f7", secBg:"#f5f0fa", secText:"#1a1a1a" },
    { key:"warm_beige", label:"웜 베이지", bg:"#f5efe6", text:"#2c1810", accent:"#c2956a", secBg:"#2c1810", secText:"#f5efe6" },
  ],
  health: [
    { key:"pink_soft", label:"핑크 소프트", bg:"#f43f5e", text:"#fff", accent:"#fda4af", secBg:"#fff0f5", secText:"#4a1028" },
    { key:"dark_green", label:"다크 그린", bg:"#0a1f0a", text:"#d0f0d0", accent:"#4ade80", secBg:"#f0fdf4", secText:"#1a1a1a" },
    { key:"warm_white", label:"웜 화이트", bg:"#fff", text:"#333", accent:"#f43f5e", secBg:"#1a1a1a", secText:"#fff" },
  ],
  service: [
    { key:"purple_glow", label:"퍼플 글로우", bg:"#0a0a0f", text:"#fff", accent:"#7c3aed", secBg:"#141420", secText:"#c4b5fd" },
    { key:"blue_modern", label:"블루 모던", bg:"#0f172a", text:"#e0e8ff", accent:"#3b82f6", secBg:"#f0f4ff", secText:"#1a1a1a" },
    { key:"clean_white", label:"클린 화이트", bg:"#fff", text:"#1e1e1e", accent:"#7c3aed", secBg:"#f5f3ff", secText:"#1a1a1a" },
  ],
};

// ── 카테고리별 추천 섹션 프리셋 ─────────────────────────────
const CATEGORY_SECTION_PRESETS = {
  education: ["hero_dark","pain_points","expert_intro","media_proof","stats_highlight","review_cards","curriculum","benefits","bonus_offers","pricing","faq","target_audience","guarantee","cta_final"],
  coaching: ["hero_light","pain_points","expert_intro","process_steps","before_after","stats_highlight","testimonial_single","review_cards","comparison","pricing","faq","guarantee","cta_final"],
  health: ["hero_dark","pain_points","before_after","expert_intro","process_steps","stats_highlight","gallery","review_cards","benefits","pricing","faq","guarantee","cta_final"],
  service: ["hero_light","pain_points","benefits","stats_highlight","process_steps","comparison","review_cards","pricing","faq","guarantee","cta_final"],
};

// ══════════════════════════════════════════════════════════════
// Canvas 유틸
// ══════════════════════════════════════════════════════════════

const FONT = "'Pretendard Variable','Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',sans-serif";

function wrapTextKo(ctx, text, maxW) {
  if (!text) return [""];
  const lines = [];
  const paras = text.split("\n");
  for (const para of paras) {
    if (!para) { lines.push(""); continue; }
    let cur = "";
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

function drawPlaceholderImage(ctx, img) {
  const {x,y,w,h,placeholder} = img;
  ctx.save();
  ctx.fillStyle = "rgba(128,128,128,0.12)";
  ctx.fillRect(x,y,w,h);
  ctx.setLineDash([6,4]);
  ctx.strokeStyle = "rgba(128,128,128,0.3)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x+1,y+1,w-2,h-2);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(128,128,128,0.45)";
  ctx.font = "500 13px " + FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u{1F4F7}",x+w/2,y+h/2-10);
  ctx.font = "400 11px " + FONT;
  ctx.fillText(placeholder||"\uC0AC\uC9C4\uC744 \uB123\uC5B4\uC8FC\uC138\uC694",x+w/2,y+h/2+10);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); return; }
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function drawImageOrPlaceholder(ctx, imgDef, imagesData) {
  const found = imagesData && imagesData.find(d => d.role === imgDef.role);
  if (found && found.dataUrl) {
    // dataUrl이 있으면 이미지를 그리기 (캔버스에서 동기로 그릴 수 없으므로 placeholder 표시)
    // 실제 이미지는 drawSectionWithImages에서 async로 처리
    drawPlaceholderImage(ctx, imgDef);
  } else {
    drawPlaceholderImage(ctx, imgDef);
  }
}

// ── 핵심 렌더링: drawSection ────────────────────────────────
function drawSection(canvas, section, themeColors) {
  const W = section.width || 480;
  const H = section.height || 700;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const idx = section.orderIndex || 0;
  const isPrimary = idx % 2 === 0;
  const bg = isPrimary ? themeColors.bg : themeColors.secBg;
  const tc = isPrimary ? themeColors.text : themeColors.secText;
  const accent = themeColors.accent;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const texts = section.texts || {};
  const headline = texts.headline || "";
  const subheadline = texts.subheadline || "";
  const body = texts.body || "";
  const badge = texts.badge || "";
  const items = texts.items || [];
  const stats = texts.stats || [];
  const images = section.images || [];
  const imagesData = section.imagesData || [];
  const sectionType = SECTION_TYPES.find(st => st.id === section.type);
  const sectionImages = sectionType ? sectionType.images : [];

  const PAD = 32;
  const contentW = W - PAD * 2;

  // Helper: alpha color
  function alphaColor(color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    return { restore: () => { ctx.globalAlpha = 1; ctx.restore(); } };
  }

  // Helper: draw text lines
  function drawTextLines(lines, x, startY, lineH) {
    let y = startY;
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += lineH;
    }
    return y;
  }

  switch (section.type) {
    // ────────────────────────────────────────────────────────
    // HERO DARK
    // ────────────────────────────────────────────────────────
    case "hero_dark": {
      // Dark gradient overlay
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      // Image area (top half)
      const imgDef = sectionImages[0];
      if (imgDef) {
        const imgObj = imagesData.find(d => d.role === imgDef.role);
        if (imgObj && imgObj.imgElement) {
          ctx.drawImage(imgObj.imgElement, 0, 0, W, 480);
          // Gradient overlay
          const grad = ctx.createLinearGradient(0, 280, 0, 480);
          grad.addColorStop(0, "rgba(10,10,10,0)");
          grad.addColorStop(1, "rgba(10,10,10,1)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 280, W, 200);
        } else {
          drawPlaceholderImage(ctx, { x:0, y:0, w:W, h:480, placeholder:imgDef.placeholder });
          const grad = ctx.createLinearGradient(0, 280, 0, 480);
          grad.addColorStop(0, "rgba(10,10,10,0)");
          grad.addColorStop(1, "rgba(10,10,10,1)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 280, W, 200);
        }
      }

      let y = 500;

      // Badge
      if (badge) {
        ctx.save();
        ctx.font = "700 12px " + FONT;
        const bw = ctx.measureText(badge).width + 20;
        roundRect(ctx, PAD, y, bw, 28, 14);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(badge, PAD + 10, y + 14);
        ctx.restore();
        y += 44;
      }

      // Headline
      ctx.font = "900 28px " + FONT;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const hLines = wrapTextKo(ctx, headline, contentW);
      y = drawTextLines(hLines, PAD, y, 38);
      y += 12;

      // Subheadline
      if (subheadline) {
        ctx.font = "400 15px " + FONT;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        const sLines = wrapTextKo(ctx, subheadline, contentW);
        y = drawTextLines(sLines, PAD, y, 22);
        y += 16;
      }

      // Body
      if (body) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        const bLines = wrapTextKo(ctx, body, contentW);
        y = drawTextLines(bLines, PAD, y, 20);
        y += 20;
      }

      // Stats grid (3 columns)
      if (stats.length > 0) {
        const statY = Math.max(y + 10, H - 130);
        const statW = Math.floor(contentW / Math.min(stats.length, 3));
        stats.slice(0, 3).forEach((st, i) => {
          const sx = PAD + statW * i;
          // Separator line
          if (i > 0) {
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, statY);
            ctx.lineTo(sx, statY + 70);
            ctx.stroke();
          }
          ctx.font = "900 32px " + FONT;
          ctx.fillStyle = accent;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(st.number || "0", sx + 12, statY + 8);
          ctx.font = "500 12px " + FONT;
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillText(st.label || "", sx + 12, statY + 48);
        });
      }

      // Decorative accent line
      ctx.fillStyle = accent;
      ctx.fillRect(0, H - 4, W, 4);
      break;
    }

    // ────────────────────────────────────────────────────────
    // HERO LIGHT
    // ────────────────────────────────────────────────────────
    case "hero_light": {
      // Light background
      ctx.fillStyle = bg || "#faf8f3";
      ctx.fillRect(0, 0, W, H);

      // Top accent bar
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, 4);

      // Image area
      const imgDef = sectionImages[0];
      if (imgDef) {
        const imgObj = imagesData.find(d => d.role === imgDef.role);
        if (imgObj && imgObj.imgElement) {
          // Circular clip
          ctx.save();
          ctx.beginPath();
          ctx.arc(W/2, 220, 160, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, W/2-160, 60, 320, 320);
          ctx.restore();
          // Circle border
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(W/2, 220, 162, 0, Math.PI*2);
          ctx.stroke();
        } else {
          // Placeholder circle
          ctx.save();
          ctx.fillStyle = "rgba(128,128,128,0.08)";
          ctx.beginPath();
          ctx.arc(W/2, 220, 160, 0, Math.PI*2);
          ctx.fill();
          ctx.setLineDash([6,4]);
          ctx.strokeStyle = "rgba(128,128,128,0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(128,128,128,0.4)";
          ctx.font = "500 13px " + FONT;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u{1F4F7} " + (imgDef.placeholder || ""), W/2, 220);
          ctx.restore();
        }
      }

      let y = 410;

      // Badge
      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.textAlign = "center";
        const bw = ctx.measureText(badge).width + 24;
        roundRect(ctx, W/2 - bw/2, y, bw, 28, 14);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.textBaseline = "middle";
        ctx.fillText(badge, W/2, y + 14);
        y += 44;
      }

      // Headline
      ctx.font = "900 28px " + FONT;
      ctx.fillStyle = tc || "#1a1a1a";
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      const hLines = wrapTextKo(ctx, headline, contentW);
      for (const line of hLines) { ctx.fillText(line, W/2, y); y += 38; }
      y += 10;

      // Subheadline
      if (subheadline) {
        ctx.font = "400 15px " + FONT;
        ctx.fillStyle = tc || "#1a1a1a";
        ctx.globalAlpha = 0.6;
        const sLines = wrapTextKo(ctx, subheadline, contentW);
        for (const line of sLines) { ctx.fillText(line, W/2, y); y += 22; }
        ctx.globalAlpha = 1;
        y += 16;
      }

      // Stats
      if (stats.length > 0) {
        const statY = Math.max(y + 20, H - 140);
        const statW = Math.floor(contentW / Math.min(stats.length, 3));
        stats.slice(0, 3).forEach((st, i) => {
          const sx = PAD + statW * i + statW / 2;
          ctx.font = "900 30px " + FONT;
          ctx.fillStyle = accent;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(st.number || "0", sx, statY);
          ctx.font = "500 12px " + FONT;
          ctx.fillStyle = tc || "#1a1a1a";
          ctx.globalAlpha = 0.55;
          ctx.fillText(st.label || "", sx, statY + 38);
          ctx.globalAlpha = 1;
        });
      }
      break;
    }

    // ────────────────────────────────────────────────────────
    // PAIN POINTS
    // ────────────────────────────────────────────────────────
    case "pain_points": {
      let y = PAD;

      // Header
      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(badge, PAD, y);
        y += 28;
      }

      ctx.font = "900 24px " + FONT;
      ctx.fillStyle = tc;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const hLines = wrapTextKo(ctx, headline || "\uC774\uB7F0 \uACE0\uBBFC \uC788\uC73C\uC2DC\uC8E0?", contentW);
      y = drawTextLines(hLines, PAD, y, 34);
      y += 8;

      if (subheadline) {
        ctx.font = "400 14px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.55;
        const sLines = wrapTextKo(ctx, subheadline, contentW);
        y = drawTextLines(sLines, PAD, y, 22);
        ctx.globalAlpha = 1;
      }
      y += 24;

      // Pain point cards
      const cardItems = items.length > 0 ? items : ["\uACE0\uBBFC 1", "\uACE0\uBBFC 2", "\uACE0\uBBFC 3", "\uACE0\uBBFC 4"];
      cardItems.forEach((item, i) => {
        if (y + 75 > H - 20) return;
        const cardH = 60;
        // Card bg
        roundRect(ctx, PAD, y, contentW, cardH, 12);
        ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        ctx.fill();
        // Left accent border
        roundRect(ctx, PAD, y, 4, cardH, 2);
        ctx.fillStyle = accent;
        ctx.fill();
        // Emoji/number
        ctx.font = "700 18px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("\u{1F62E}\u200D\u{1F4A8}", PAD + 18, y + cardH / 2);
        // Text
        ctx.font = "500 14px " + FONT;
        ctx.fillStyle = tc;
        const tLines = wrapTextKo(ctx, item, contentW - 60);
        const tStartY = y + cardH/2 - (tLines.length * 20) / 2;
        tLines.forEach((l, li) => {
          ctx.fillText(l, PAD + 48, tStartY + li * 20 + 10);
        });
        y += cardH + 10;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // EXPERT INTRO
    // ────────────────────────────────────────────────────────
    case "expert_intro": {
      let y = 40;

      // Profile image (circular)
      const profileDef = sectionImages.find(s => s.role === "profile");
      if (profileDef) {
        const cx = W/2, cy = y + 75, r = 75;
        const imgObj = imagesData.find(d => d.role === "profile");
        if (imgObj && imgObj.imgElement) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, cx-r, cy-r, r*2, r*2);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = "rgba(128,128,128,0.1)";
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.fill();
          ctx.setLineDash([5,3]);
          ctx.strokeStyle = "rgba(128,128,128,0.25)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(128,128,128,0.4)";
          ctx.font = "400 11px " + FONT;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u{1F4F7} \uD504\uB85C\uD544 \uC0AC\uC9C4", cx, cy);
          ctx.restore();
        }
        // Circle border
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI*2);
        ctx.stroke();
        y += 170;
      }

      // Name
      ctx.font = "900 24px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const nameLines = wrapTextKo(ctx, headline, contentW);
      for (const l of nameLines) { ctx.fillText(l, W/2, y); y += 34; }
      y += 4;

      // Badge / title
      if (badge) {
        ctx.font = "600 13px " + FONT;
        ctx.fillStyle = accent;
        ctx.fillText(badge, W/2, y);
        y += 24;
      }

      // Subheadline
      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        const sLines = wrapTextKo(ctx, subheadline, contentW - 40);
        for (const l of sLines) { ctx.fillText(l, W/2, y); y += 20; }
        ctx.globalAlpha = 1;
        y += 12;
      }

      // Divider
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W/2 - 60, y);
      ctx.lineTo(W/2 + 60, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      y += 20;

      // Career items (body text as list)
      if (body) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.75;
        ctx.textAlign = "left";
        const bLines = wrapTextKo(ctx, body, contentW - 20);
        bLines.forEach(l => {
          if (y + 20 > H - 20) return;
          ctx.fillText("\u2022 " + l, PAD + 10, y);
          y += 22;
        });
        ctx.globalAlpha = 1;
      }

      // Items as career entries
      if (items.length > 0) {
        ctx.textAlign = "left";
        items.forEach(item => {
          if (y + 22 > H - 20) return;
          ctx.font = "500 13px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.8;
          ctx.fillText("\u2714 " + item, PAD + 10, y);
          ctx.globalAlpha = 1;
          y += 24;
        });
      }

      // Stats at bottom
      if (stats.length > 0) {
        const statY = Math.max(y + 16, H - 100);
        const statW = Math.floor(contentW / Math.min(stats.length, 3));
        ctx.textAlign = "center";
        stats.slice(0, 3).forEach((st, i) => {
          const sx = PAD + statW * i + statW / 2;
          ctx.font = "900 26px " + FONT;
          ctx.fillStyle = accent;
          ctx.textBaseline = "top";
          ctx.fillText(st.number || "0", sx, statY);
          ctx.font = "400 11px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.55;
          ctx.fillText(st.label || "", sx, statY + 34);
          ctx.globalAlpha = 1;
        });
      }
      break;
    }

    // ────────────────────────────────────────────────────────
    // MEDIA PROOF
    // ────────────────────────────────────────────────────────
    case "media_proof": {
      let y = PAD;

      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(badge, PAD, y);
        y += 24;
      }

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uBBF8\uB514\uC5B4\uAC00 \uC8FC\uBAA9\uD55C \uC804\uBB38\uAC00", contentW);
      y = drawTextLines(hLines, PAD, y, 32);
      y += 8;

      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.55;
        const sLines = wrapTextKo(ctx, subheadline, contentW);
        y = drawTextLines(sLines, PAD, y, 20);
        ctx.globalAlpha = 1;
      }
      y += 24;

      // 3 media images
      sectionImages.forEach(imgDef => {
        const imgObj = imagesData.find(d => d.role === imgDef.role);
        if (imgObj && imgObj.imgElement) {
          roundRect(ctx, imgDef.x, y, imgDef.w, imgDef.h, 8);
          ctx.save();
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, imgDef.x, y, imgDef.w, imgDef.h);
          ctx.restore();
        } else {
          drawPlaceholderImage(ctx, { ...imgDef, y });
        }
      });
      y += 120;

      // Logo text items
      if (items.length > 0) {
        y += 16;
        ctx.textAlign = "center";
        ctx.font = "600 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.45;
        const itemRow = items.slice(0, 5).join("  \u00B7  ");
        ctx.fillText(itemRow, W/2, y);
        ctx.globalAlpha = 1;
        y += 20;
        // More items
        if (items.length > 5) {
          const itemRow2 = items.slice(5, 10).join("  \u00B7  ");
          ctx.fillText(itemRow2, W/2, y);
          y += 20;
        }
      }

      break;
    }

    // ────────────────────────────────────────────────────────
    // REVIEW CARDS
    // ────────────────────────────────────────────────────────
    case "review_cards": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC218\uAC15\uC0DD \uD6C4\uAE30", contentW);
      y = drawTextLines(hLines, PAD, y, 32);
      y += 8;

      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.5;
        ctx.fillText(subheadline, PAD, y);
        ctx.globalAlpha = 1;
        y += 24;
      }
      y += 12;

      // Parse review items: "이름|직업|★★★★★|후기내용"
      const reviews = items.length > 0 ? items : [
        "\uD64D\uAE38\uB3D9|\uD68C\uC0AC\uC6D0|\u2605\u2605\u2605\u2605\u2605|\uC815\uB9D0 \uB9CE\uC740 \uB3C4\uC6C0\uC774 \uB418\uC5C8\uC2B5\uB2C8\uB2E4",
        "\uAE40\uC601\uD76C|\uD504\uB9AC\uB79C\uC11C|\u2605\u2605\u2605\u2605\u2605|\uCD94\uCC9C\uD569\uB2C8\uB2E4!",
        "\uBC15\uC9C0\uC218|\uD559\uC0DD|\u2605\u2605\u2605\u2605|\uAC15\uC758 \uD488\uC9C8\uC774 \uC88B\uC544\uC694"
      ];

      reviews.forEach((review, i) => {
        if (y + 130 > H - 10) return;
        const parts = review.split("|");
        const name = parts[0] || "\uC775\uBA85";
        const job = parts[1] || "";
        const starStr = parts[2] || "\u2605\u2605\u2605\u2605\u2605";
        const content = parts[3] || review;

        const cardH = 120;
        // Card
        roundRect(ctx, PAD, y, contentW, cardH, 14);
        ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        ctx.fill();

        // Avatar circle
        ctx.save();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(PAD + 30, y + 30, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = "700 14px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.charAt(0), PAD + 30, y + 30);
        ctx.restore();

        // Name & job
        ctx.font = "700 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(name, PAD + 56, y + 16);
        if (job) {
          ctx.font = "400 11px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.5;
          ctx.fillText(job, PAD + 56 + ctx.measureText(name).width + 8, y + 18);
          ctx.globalAlpha = 1;
        }

        // Stars
        ctx.font = "400 12px " + FONT;
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(starStr, PAD + 56, y + 36);

        // Quote
        ctx.font = "400 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.75;
        const qLines = wrapTextKo(ctx, "\u201C" + content + "\u201D", contentW - 72);
        let qy = y + 56;
        qLines.slice(0, 3).forEach(l => {
          ctx.fillText(l, PAD + 56, qy);
          qy += 18;
        });
        ctx.globalAlpha = 1;

        y += cardH + 12;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // STATS HIGHLIGHT
    // ────────────────────────────────────────────────────────
    case "stats_highlight": {
      // Decorative circles
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(W * 0.1, H * 0.2, 80, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.9, H * 0.8, 60, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      let y = PAD + 20;

      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(badge, W/2, y);
        y += 28;
      }

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC22B\uC790\uB85C \uC99D\uBA85\uD569\uB2C8\uB2E4", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 34; }
      y += 30;

      // Big stat numbers
      const statItems = stats.length > 0 ? stats : [{number:"4,200+",label:"\uC218\uAC15\uC0DD"},{number:"97%",label:"\uB9CC\uC871\uB3C4"},{number:"150+",label:"\uAE30\uC5C5 \uD611\uC5C5"}];
      const colW = Math.floor(contentW / Math.min(statItems.length, 3));
      statItems.slice(0, 3).forEach((st, i) => {
        const cx = PAD + colW * i + colW / 2;

        // Big number
        ctx.font = "900 42px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(st.number || "0", cx, y);

        // Label
        ctx.font = "500 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        ctx.fillText(st.label || "", cx, y + 52);
        ctx.globalAlpha = 1;

        // Separator
        if (i < statItems.length - 1 && i < 2) {
          ctx.strokeStyle = tc;
          ctx.globalAlpha = 0.12;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD + colW * (i + 1), y - 10);
          ctx.lineTo(PAD + colW * (i + 1), y + 70);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // CURRICULUM
    // ────────────────────────────────────────────────────────
    case "curriculum": {
      let y = PAD;

      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(badge, PAD, y);
        y += 24;
      }

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uCEE4\uB9AC\uD050\uB7FC", contentW);
      y = drawTextLines(hLines, PAD, y, 32);
      y += 20;

      // Parse curriculum items: "PART 1. 제목|내용1, 내용2"
      const parts = items.length > 0 ? items : [
        "PART 1. \uAE30\uCD08|\uAC1C\uB150 \uC774\uD574, \uD658\uACBD \uC124\uC815",
        "PART 2. \uC2E4\uC804|\uD504\uB85C\uC81D\uD2B8 \uC2E4\uC2B5, \uD3EC\uD2B8\uD3F4\uB9AC\uC624",
        "PART 3. \uC2EC\uD654|\uACE0\uAE09 \uAE30\uBC95, \uC2E4\uBB34 \uC801\uC6A9"
      ];

      parts.forEach((part, pi) => {
        if (y + 80 > H - 20) return;
        const [title, ...contentParts] = part.split("|");
        const subItems = contentParts.join("|").split(",").map(s => s.trim()).filter(Boolean);

        // Part header
        roundRect(ctx, PAD, y, contentW, 36, 8);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = "800 14px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(title || "PART " + (pi + 1), PAD + 14, y + 18);
        y += 44;

        // Sub items
        subItems.forEach(sub => {
          if (y + 24 > H - 10) return;
          ctx.font = "400 13px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.75;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("\u2022 " + sub, PAD + 20, y);
          ctx.globalAlpha = 1;
          y += 24;
        });

        y += 12;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // PROCESS STEPS
    // ────────────────────────────────────────────────────────
    case "process_steps": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC9C4\uD589 \uACFC\uC815", contentW);
      y = drawTextLines(hLines, PAD, y, 32);
      y += 24;

      // Parse: "스텝제목|설명"
      const steps = items.length > 0 ? items : [
        "\uC0C1\uB2F4 \uC2E0\uCCAD|\uBB34\uB8CC \uC0C1\uB2F4\uC73C\uB85C \uC2DC\uC791\uD569\uB2C8\uB2E4",
        "\uB9DE\uCDA4 \uC124\uACC4|\uAC1C\uC778\uBCC4 \uCEE4\uB9AC\uD050\uB7FC \uC124\uACC4",
        "\uC9D1\uC911 \uD559\uC2B5|\uC2E4\uC804 \uC704\uC8FC \uD504\uB85C\uADF8\uB7A8",
        "\uC131\uACFC \uD655\uC778|\uACB0\uACFC \uBD84\uC11D \uBC0F \uD53C\uB4DC\uBC31"
      ];

      const circleR = 18;
      const lineX = PAD + circleR;

      steps.forEach((step, si) => {
        if (y + 90 > H - 10) return;
        const [title, desc] = step.split("|");

        // Vertical line (except last)
        if (si < steps.length - 1) {
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(lineX, y + circleR * 2 + 4);
          ctx.lineTo(lineX, y + 90);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }

        // Circle
        ctx.beginPath();
        ctx.arc(lineX, y + circleR, circleR, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.font = "800 14px " + FONT;
        ctx.fillStyle = isPrimary ? themeColors.bg : themeColors.secBg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(si + 1), lineX, y + circleR);

        // Step title
        ctx.font = "700 15px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(title || "Step " + (si + 1), PAD + circleR * 2 + 16, y + 4);

        // Step description
        if (desc) {
          ctx.font = "400 12px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.6;
          const dLines = wrapTextKo(ctx, desc, contentW - circleR * 2 - 24);
          let dy = y + 26;
          dLines.slice(0, 2).forEach(l => {
            ctx.fillText(l, PAD + circleR * 2 + 16, dy);
            dy += 18;
          });
          ctx.globalAlpha = 1;
        }

        y += 90;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // COMPARISON
    // ────────────────────────────────────────────────────────
    case "comparison": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uBE44\uAD50\uD574\uBCF4\uC138\uC694", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }
      y += 16;

      // Two column headers
      const colW2 = (contentW - 12) / 2;

      // Left header (일반)
      roundRect(ctx, PAD, y, colW2, 36, 8);
      ctx.fillStyle = tc;
      ctx.globalAlpha = 0.08;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = "700 14px " + FONT;
      ctx.fillStyle = tc;
      ctx.globalAlpha = 0.5;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\uC77C\uBC18", PAD + colW2 / 2, y + 18);
      ctx.globalAlpha = 1;

      // Right header (우리)
      roundRect(ctx, PAD + colW2 + 12, y, colW2, 36, 8);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = "700 14px " + FONT;
      ctx.fillStyle = accent;
      ctx.fillText("\uC6B0\uB9AC", PAD + colW2 + 12 + colW2 / 2, y + 18);
      y += 48;

      // Parse: "항목|일반|우리"
      const compItems = items.length > 0 ? items : [
        "\uAD50\uC721 \uBC29\uC2DD|\uB179\uD654 \uAC15\uC758|\uB77C\uC774\uBE0C + 1:1 \uCF54\uCE6D",
        "\uD53C\uB4DC\uBC31|\uC5C6\uC74C|\uC8FC 1\uD68C \uAC1C\uC778 \uD53C\uB4DC\uBC31",
        "\uCEE4\uB9AC\uD050\uB7FC|\uC77C\uBC18\uC801|\uB9DE\uCDA4\uD615 \uCEE4\uB9AC\uD050\uB7FC"
      ];

      compItems.forEach((item, i) => {
        if (y + 50 > H - 10) return;
        const [label, leftVal, rightVal] = item.split("|");

        // Row bg
        if (i % 2 === 0) {
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.03;
          ctx.fillRect(PAD, y, contentW, 44);
          ctx.globalAlpha = 1;
        }

        // Label
        ctx.font = "600 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.45;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label || "", PAD + 8, y + 6);
        ctx.globalAlpha = 1;

        // Left value (with X)
        ctx.font = "400 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.5;
        ctx.textAlign = "center";
        ctx.fillText("\u2716 " + (leftVal || ""), PAD + colW2 / 2, y + 26);
        ctx.globalAlpha = 1;

        // Right value (with checkmark)
        ctx.font = "600 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.fillText("\u2714 " + (rightVal || ""), PAD + colW2 + 12 + colW2 / 2, y + 26);

        y += 48;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // BENEFITS
    // ────────────────────────────────────────────────────────
    case "benefits": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uD575\uC2EC \uD61C\uD0DD", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }

      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.55;
        ctx.fillText(subheadline, W/2, y);
        ctx.globalAlpha = 1;
        y += 24;
      }
      y += 20;

      // Parse: "아이콘|제목|설명"
      const benefitItems = items.length > 0 ? items : [
        "\u{1F4DA}|\uCCB4\uACC4\uC801 \uCEE4\uB9AC\uD050\uB7FC|\uB2E8\uACC4\uBCC4 \uD559\uC2B5 \uC124\uACC4",
        "\u{1F4AC}|1:1 \uBA58\uD1A0\uB9C1|\uAC1C\uC778 \uB9DE\uCDA4 \uD53C\uB4DC\uBC31",
        "\u{1F4C8}|\uC2E4\uC804 \uD504\uB85C\uC81D\uD2B8|\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uC644\uC131",
        "\u{1F91D}|\uCEE4\uBBA4\uB2C8\uD2F0|\uC218\uAC15\uC0DD \uB124\uD2B8\uC6CC\uD0B9"
      ];

      // 2x2 grid
      const gapX = 12;
      const gapY = 12;
      const cardW = (contentW - gapX) / 2;
      const cardH = 130;

      benefitItems.slice(0, 4).forEach((item, i) => {
        const [icon, title, desc] = item.split("|");
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = PAD + col * (cardW + gapX);
        const cy = y + row * (cardH + gapY);

        if (cy + cardH > H - 10) return;

        // Card
        roundRect(ctx, cx, cy, cardW, cardH, 14);
        ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        ctx.fill();

        // Icon
        ctx.font = "400 28px " + FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = tc;
        ctx.fillText(icon || "\u2728", cx + 16, cy + 16);

        // Title
        ctx.font = "700 14px " + FONT;
        ctx.fillStyle = tc;
        ctx.fillText(title || "", cx + 16, cy + 56);

        // Desc
        ctx.font = "400 11px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        const dLines = wrapTextKo(ctx, desc || "", cardW - 32);
        let dy = cy + 78;
        dLines.slice(0, 2).forEach(l => {
          ctx.fillText(l, cx + 16, dy);
          dy += 16;
        });
        ctx.globalAlpha = 1;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // BEFORE AFTER
    // ────────────────────────────────────────────────────────
    case "before_after": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uBCC0\uD654\uB97C \uD655\uC778\uD558\uC138\uC694", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }

      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.55;
        ctx.fillText(subheadline, W/2, y);
        ctx.globalAlpha = 1;
        y += 24;
      }
      y += 16;

      // Before label
      ctx.font = "700 13px " + FONT;
      ctx.fillStyle = tc;
      ctx.globalAlpha = 0.5;
      ctx.textAlign = "center";
      ctx.fillText("Before", PAD + 108, y);
      // After label
      ctx.fillStyle = accent;
      ctx.globalAlpha = 1;
      ctx.fillText("After", PAD + 108 + 232, y);
      y += 24;

      // Two images
      sectionImages.forEach(imgDef => {
        const imgObj = imagesData.find(d => d.role === imgDef.role);
        if (imgObj && imgObj.imgElement) {
          roundRect(ctx, imgDef.x, y, imgDef.w, imgDef.h, 12);
          ctx.save();
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, imgDef.x, y, imgDef.w, imgDef.h);
          ctx.restore();
        } else {
          drawPlaceholderImage(ctx, { ...imgDef, y });
        }
      });
      y += 300;

      // Arrow between
      ctx.font = "400 28px " + FONT;
      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u27A1", W/2, y - 160);

      // Stats comparison below
      if (stats.length > 0) {
        y += 16;
        stats.slice(0, 3).forEach((st, i) => {
          if (y + 28 > H - 10) return;
          ctx.font = "700 14px " + FONT;
          ctx.fillStyle = accent;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(st.number || "", PAD + 16, y);
          ctx.font = "400 12px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.6;
          ctx.fillText(st.label || "", PAD + 16 + (ctx.measureText(st.number || "").width) + 8, y + 2);
          ctx.globalAlpha = 1;
          y += 28;
        });
      }

      break;
    }

    // ────────────────────────────────────────────────────────
    // PRICING
    // ────────────────────────────────────────────────────────
    case "pricing": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC694\uAE08 \uC548\uB0B4", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }

      if (subheadline) {
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.5;
        ctx.fillText(subheadline, W/2, y);
        ctx.globalAlpha = 1;
        y += 24;
      }
      y += 20;

      // Parse: "플랜명|가격|설명|포함항목1,포함항목2"
      const plans = items.length > 0 ? items : [
        "\uBCA0\uC774\uC9C1|99,000\uC6D0|\uAE30\uCD08 \uACFC\uC815|\uAC15\uC758 10\uD68C, \uC790\uB8CC\uC9D1",
        "\uD504\uB9AC\uBBF8\uC5C4|199,000\uC6D0|\uC2EC\uD654 \uACFC\uC815|\uAC15\uC758 20\uD68C, 1:1 \uCF54\uCE6D, \uC790\uB8CC\uC9D1, \uCEE4\uBBA4\uB2C8\uD2F0",
        "VIP|399,000\uC6D0|\uB9C8\uC2A4\uD130 \uACFC\uC815|\uC804\uCCB4 \uAC15\uC758, 1:1 \uCF54\uCE6D, \uD3C9\uC0DD \uCEE4\uBBA4\uB2C8\uD2F0"
      ];

      plans.forEach((plan, pi) => {
        const [name, price, desc, includes] = plan.split("|");
        const isHighlight = pi === 1 || plans.length === 1;
        const cardH = 160;

        if (y + cardH > H - 10) return;

        // Card
        roundRect(ctx, PAD + 8, y, contentW - 16, cardH, 16);
        if (isHighlight) {
          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.1;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.stroke();

          // "추천" badge
          const recBadge = "\uCD94\uCC9C";
          ctx.font = "700 10px " + FONT;
          const rbw = ctx.measureText(recBadge).width + 16;
          roundRect(ctx, W/2 - rbw/2, y - 10, rbw, 20, 10);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.fillStyle = bg;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(recBadge, W/2, y);
        } else {
          ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
          ctx.fill();
          ctx.strokeStyle = tc;
          ctx.globalAlpha = 0.1;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Plan name
        ctx.font = "800 16px " + FONT;
        ctx.fillStyle = isHighlight ? accent : tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(name || "", PAD + 24, y + 20);

        // Price
        ctx.font = "900 24px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "right";
        ctx.fillText(price || "", W - PAD - 24, y + 16);

        // Desc
        if (desc) {
          ctx.font = "400 12px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.5;
          ctx.textAlign = "left";
          ctx.fillText(desc, PAD + 24, y + 46);
          ctx.globalAlpha = 1;
        }

        // Included items
        if (includes) {
          const incItems = includes.split(",").map(s => s.trim());
          let iy = y + 70;
          incItems.forEach(inc => {
            if (iy + 18 > y + cardH - 8) return;
            ctx.font = "400 11px " + FONT;
            ctx.fillStyle = tc;
            ctx.globalAlpha = 0.7;
            ctx.textAlign = "left";
            ctx.fillText("\u2713 " + inc, PAD + 24, iy);
            ctx.globalAlpha = 1;
            iy += 18;
          });
        }

        y += cardH + 12;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // FAQ
    // ────────────────────────────────────────────────────────
    case "faq": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38", contentW);
      y = drawTextLines(hLines, PAD, y, 32);
      y += 20;

      // Parse: "Q: 질문 / A: 답변"
      const faqItems = items.length > 0 ? items : [
        "Q: \uCD08\uBCF4\uC790\uB3C4 \uB4E4\uC744 \uC218 \uC788\uB098\uC694? / A: \uB124, \uAE30\uCD08\uBD80\uD130 \uCC28\uADFC\uCC28\uADFC \uC548\uB0B4\uD569\uB2C8\uB2E4.",
        "Q: \uD658\uBD88\uC774 \uAC00\uB2A5\uD55C\uAC00\uC694? / A: 7\uC77C \uC774\uB0B4 100% \uD658\uBD88 \uAC00\uB2A5\uD569\uB2C8\uB2E4.",
        "Q: \uC218\uAC15 \uAE30\uAC04\uC740 \uC5BC\uB9C8\uB098 \uB418\uB098\uC694? / A: \uAD6C\uB9E4\uC77C\uBD80\uD130 \uBB34\uAE30\uD55C \uC218\uAC15 \uAC00\uB2A5\uD569\uB2C8\uB2E4."
      ];

      faqItems.forEach((faq, fi) => {
        if (y + 80 > H - 10) return;
        const parts = faq.split(" / ");
        const q = parts[0] || "";
        const a = parts[1] || "";

        // Q
        ctx.font = "700 14px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const qLines = wrapTextKo(ctx, q, contentW - 8);
        qLines.forEach(l => {
          ctx.fillText(l, PAD + 4, y);
          y += 22;
        });
        y += 4;

        // A
        ctx.font = "400 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.7;
        const aLines = wrapTextKo(ctx, a, contentW - 8);
        aLines.forEach(l => {
          ctx.fillText(l, PAD + 4, y);
          y += 20;
        });
        ctx.globalAlpha = 1;
        y += 8;

        // Divider
        if (fi < faqItems.length - 1) {
          ctx.strokeStyle = tc;
          ctx.globalAlpha = 0.08;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD, y);
          ctx.lineTo(W - PAD, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          y += 12;
        }
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // TARGET AUDIENCE
    // ────────────────────────────────────────────────────────
    case "target_audience": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC774\uB7F0 \uBD84\uAED8 \uCD94\uCC9C\uD569\uB2C8\uB2E4", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }
      y += 20;

      // Parse: "✅ 추천대상" or "❌ 비추대상"
      const targetItems = items.length > 0 ? items : [
        "\u2705 \uC804\uBB38\uC131\uC744 \uD0A4\uC6B0\uACE0 \uC2F6\uC740 \uBD84",
        "\u2705 \uBD80\uC5C5/\uC218\uC775\uD654\uAC00 \uBAA9\uD45C\uC778 \uBD84",
        "\u2705 \uCCB4\uACC4\uC801\uC778 \uD559\uC2B5\uC744 \uC6D0\uD558\uB294 \uBD84",
        "\u274C \uB2E8\uAE30\uAC04 \uC218\uC775\uB9CC \uC6D0\uD558\uB294 \uBD84",
        "\u274C \uB178\uB825 \uC5C6\uC774 \uACB0\uACFC\uB97C \uBC14\uB77C\uB294 \uBD84"
      ];

      targetItems.forEach((item, i) => {
        if (y + 42 > H - 10) return;
        const isPositive = item.startsWith("\u2705") || item.startsWith("\u2714");
        const text = item.replace(/^[\u2705\u274C\u2714\u2716]\s*/, "");

        // Row
        roundRect(ctx, PAD, y, contentW, 36, 10);
        ctx.fillStyle = isPositive ? (accent + "12") : "rgba(239,68,68,0.08)";
        ctx.fill();

        // Icon
        ctx.font = "400 16px " + FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isPositive ? accent : "#ef4444";
        ctx.fillText(isPositive ? "\u2705" : "\u274C", PAD + 12, y + 18);

        // Text
        ctx.font = "500 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.fillText(text, PAD + 40, y + 18);

        y += 44;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // BONUS OFFERS
    // ────────────────────────────────────────────────────────
    case "bonus_offers": {
      let y = PAD;

      if (badge) {
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(badge, W/2, y);
        y += 24;
      }

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uD2B9\uBCC4 \uBCF4\uB108\uC2A4 \uD61C\uD0DD", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }
      y += 16;

      // Parse: "혜택명|설명|가치"
      const bonusItems = items.length > 0 ? items : [
        "\uBCF4\uB108\uC2A4 \uC790\uB8CC\uC9D1|\uC2E4\uC804 \uD15C\uD50C\uB9BF \uBAA8\uC74C|50,000\uC6D0 \uC0C1\uB2F9",
        "1:1 \uCF54\uCE6D \uC138\uC158|\uAC1C\uC778 \uB9DE\uCDA4 \uCEE8\uC124\uD305|100,000\uC6D0 \uC0C1\uB2F9",
        "\uCEE4\uBBA4\uB2C8\uD2F0 \uCD08\uB300|\uC218\uAC15\uC0DD \uC804\uC6A9 \uB124\uD2B8\uC6CC\uD06C|\uBB34\uB8CC"
      ];

      bonusItems.forEach((bonus, bi) => {
        const [name, desc, value] = bonus.split("|");
        const cardH = 80;
        if (y + cardH > H - 10) return;

        // Card with accent border
        roundRect(ctx, PAD, y, contentW, cardH, 14);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.08;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Number badge
        ctx.beginPath();
        ctx.arc(PAD + 28, y + cardH/2, 16, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.font = "800 12px " + FONT;
        ctx.fillStyle = bg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(bi + 1), PAD + 28, y + cardH/2);

        // Name
        ctx.font = "700 14px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(name || "", PAD + 56, y + 16);

        // Desc
        ctx.font = "400 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        ctx.fillText(desc || "", PAD + 56, y + 38);
        ctx.globalAlpha = 1;

        // Value
        if (value) {
          ctx.font = "700 11px " + FONT;
          ctx.fillStyle = accent;
          ctx.textAlign = "right";
          ctx.fillText(value, W - PAD - 16, y + 56);
        }

        y += cardH + 10;
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // CTA FINAL
    // ────────────────────────────────────────────────────────
    case "cta_final": {
      // Dark bg forced
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      let y = PAD + 40;

      // Urgent badge
      if (badge) {
        ctx.font = "700 13px " + FONT;
        const bw = ctx.measureText(badge).width + 28;
        roundRect(ctx, W/2 - bw/2, y, bw, 32, 16);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badge, W/2, y + 16);
        y += 52;
      }

      // Big headline
      ctx.font = "900 28px " + FONT;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uC9C0\uAE08 \uC2DC\uC791\uD558\uC138\uC694", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 38; }
      y += 12;

      // Subheadline
      if (subheadline) {
        ctx.font = "400 14px " + FONT;
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        const sLines = wrapTextKo(ctx, subheadline, contentW);
        for (const l of sLines) { ctx.fillText(l, W/2, y); y += 22; }
        y += 16;
      }

      // Price section
      if (body) {
        ctx.font = "400 14px " + FONT;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        // Strikethrough old price
        const bLines = wrapTextKo(ctx, body, contentW);
        for (const l of bLines) {
          const tw = ctx.measureText(l).width;
          ctx.fillText(l, W/2, y);
          // Strikethrough line
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(W/2 - tw/2, y + 8);
          ctx.lineTo(W/2 + tw/2, y + 8);
          ctx.stroke();
          y += 22;
        }
        y += 8;
      }

      // Stats (if any - show as price emphasis)
      if (stats.length > 0) {
        ctx.font = "900 36px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.fillText(stats[0].number || "", W/2, y);
        y += 46;
        if (stats[0].label) {
          ctx.font = "500 13px " + FONT;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(stats[0].label, W/2, y);
          y += 24;
        }
      }

      y += 20;

      // CTA Button
      const btnW = 280;
      const btnH = 56;
      const btnX = W/2 - btnW/2;
      roundRect(ctx, btnX, y, btnW, btnH, 28);
      ctx.fillStyle = accent;
      ctx.fill();

      // Button glow
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 20;
      roundRect(ctx, btnX, y, btnW, btnH, 28);
      ctx.fill();
      ctx.restore();

      ctx.font = "800 16px " + FONT;
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(items[0] || "\uC9C0\uAE08 \uC2E0\uCCAD\uD558\uAE30", W/2, y + btnH/2);

      // Bottom urgency text
      y += btnH + 20;
      if (items.length > 1) {
        ctx.font = "400 12px " + FONT;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        ctx.fillText(items[1], W/2, y);
      }

      break;
    }

    // ────────────────────────────────────────────────────────
    // TESTIMONIAL SINGLE
    // ────────────────────────────────────────────────────────
    case "testimonial_single": {
      let y = 40;

      // Person photo
      const personDef = sectionImages.find(s => s.role === "person");
      if (personDef) {
        const cx = W/2, cy = y + 50, r = 40;
        const imgObj = imagesData.find(d => d.role === "person");
        if (imgObj && imgObj.imgElement) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, cx-r, cy-r, r*2, r*2);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = "rgba(128,128,128,0.1)";
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "rgba(128,128,128,0.4)";
          ctx.font = "400 11px " + FONT;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u{1F4F7}", cx, cy);
          ctx.restore();
        }
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W/2, y+50, r+2, 0, Math.PI*2);
        ctx.stroke();
        y += 110;
      }

      // Large quote marks
      ctx.font = "900 60px Georgia, serif";
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.3;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("\u201C", W/2, y);
      ctx.globalAlpha = 1;
      y += 50;

      // Quote text
      ctx.font = "italic 500 16px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      const qLines = wrapTextKo(ctx, body || headline || "\uC815\uB9D0 \uB9CE\uC740 \uB3C4\uC6C0\uC774 \uB418\uC5C8\uC2B5\uB2C8\uB2E4.", contentW - 40);
      for (const l of qLines) { ctx.fillText(l, W/2, y); y += 26; }
      y += 16;

      // Name
      ctx.font = "700 14px " + FONT;
      ctx.fillStyle = accent;
      ctx.fillText(subheadline || "\u2014 \uC218\uAC15\uC0DD", W/2, y);

      break;
    }

    // ────────────────────────────────────────────────────────
    // GALLERY
    // ────────────────────────────────────────────────────────
    case "gallery": {
      let y = PAD;

      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "\uD3EC\uD1A0 \uAC24\uB7EC\uB9AC", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }
      y += 16;

      // 3x2 grid
      sectionImages.forEach(imgDef => {
        const imgObj = imagesData.find(d => d.role === imgDef.role);
        const adjY = y + (imgDef.y - 100); // Adjust relative to content area
        if (imgObj && imgObj.imgElement) {
          roundRect(ctx, imgDef.x, adjY, imgDef.w, imgDef.h, 10);
          ctx.save();
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, imgDef.x, adjY, imgDef.w, imgDef.h);
          ctx.restore();
        } else {
          drawPlaceholderImage(ctx, { ...imgDef, y: adjY });
        }
      });

      break;
    }

    // ────────────────────────────────────────────────────────
    // GUARANTEE
    // ────────────────────────────────────────────────────────
    case "guarantee": {
      let y = 30;

      // Badge image
      const badgeDef = sectionImages.find(s => s.role === "badge");
      if (badgeDef) {
        const cx = W/2, cy = y + 75, r = 60;
        const imgObj = imagesData.find(d => d.role === "badge");
        if (imgObj && imgObj.imgElement) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(imgObj.imgElement, cx-r, cy-r, r*2, r*2);
          ctx.restore();
        } else {
          // Shield icon placeholder
          ctx.save();
          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.1;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.font = "400 36px " + FONT;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = accent;
          ctx.fillText("\u{1F6E1}\uFE0F", cx, cy);
          ctx.restore();
        }
        y += 160;
      }

      // Headline
      ctx.font = "900 22px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hLines = wrapTextKo(ctx, headline || "100% \uD658\uBD88 \uBCF4\uC99D", contentW);
      for (const l of hLines) { ctx.fillText(l, W/2, y); y += 32; }
      y += 8;

      // Body / guarantee text
      if (body || subheadline) {
        ctx.font = "400 14px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.65;
        const bLines = wrapTextKo(ctx, body || subheadline, contentW - 20);
        for (const l of bLines) { ctx.fillText(l, W/2, y); y += 22; }
        ctx.globalAlpha = 1;
        y += 12;
      }

      // Trust bullet points
      if (items.length > 0) {
        ctx.textAlign = "left";
        items.forEach(item => {
          if (y + 22 > H - 10) return;
          ctx.font = "500 13px " + FONT;
          ctx.fillStyle = accent;
          ctx.textBaseline = "top";
          ctx.fillText("\u2714 " + item, PAD + 24, y);
          y += 26;
        });
      }

      break;
    }

    default: {
      // Fallback: simple text render
      ctx.font = "700 20px " + FONT;
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(headline || section.type, W/2, H/2 - 20);
      if (body) {
        ctx.font = "400 14px " + FONT;
        ctx.globalAlpha = 0.6;
        ctx.fillText(body, W/2, H/2 + 20);
        ctx.globalAlpha = 1;
      }
      break;
    }
  }
}

// Draw section with async image loading
async function drawSectionWithImages(canvas, section, themeColors) {
  // Load images first
  const sectionType = SECTION_TYPES.find(st => st.id === section.type);
  const imgDefs = sectionType ? sectionType.images : [];
  const imagesData = [];

  for (const imgDef of imgDefs) {
    const srcData = (section.imagesData || []).find(d => d.role === imgDef.role);
    if (srcData && srcData.dataUrl) {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = srcData.dataUrl;
        });
        imagesData.push({ ...srcData, imgElement: img });
      } catch {
        imagesData.push(srcData);
      }
    }
  }

  const sectionWithImgs = { ...section, imagesData };
  drawSection(canvas, sectionWithImgs, themeColors);
}

// ══════════════════════════════════════════════════════════════
// AI 생성 함수
// ══════════════════════════════════════════════════════════════

async function generateAllSections({ mainCat, subCat, serviceName, description, target, price, sectionTypes }) {
  const sectionList = sectionTypes.map((s,i) => {
    const t = SECTION_TYPES.find(st=>st.id===s.type);
    return `${i+1}. ${t?.label||s.type}`;
  }).join("\n");

  const prompt = `당신은 한국 무형서비스 상세페이지 전문 카피라이터입니다.
감성적이고 설득력 있는 한국어 카피를 작성해주세요.

[서비스 정보]
카테고리: ${mainCat} > ${subCat}
서비스명: ${serviceName}
설명: ${description || "없음"}
타겟: ${target || "없음"}
가격: ${price || "미정"}

[섹션 구성]
${sectionList}

각 섹션별 JSON으로 응답:
{"sections":[{"type":"hero_dark","texts":{"headline":"...","subheadline":"...","body":"...","badge":"...","items":["..."],"stats":[{"number":"...","label":"..."}]}}]}

규칙:
- headline: 감성적, 20자 이내, 줄바꿈 \\n 사용 가능
- subheadline: 1줄, 25자 이내
- body: 2-3줄, 60자 이내
- badge: 뱃지 텍스트 8자 이내
- pain_points items: 고객 고민 4-5개
- curriculum items: "PART 1. 제목|내용1, 내용2" 형식으로 4-6개
- faq items: "Q: 질문 / A: 답변" 형식 4-6개
- review_cards items: "이름|직업|★★★★★|후기내용" 형식 3-5개
- stats: [{"number":"4,200","label":"수강생"}] 형식 3개
- process_steps items: "스텝제목|설명" 형식 4-5개
- comparison items: "항목|일반|우리" 형식 5-6개
- benefits items: "아이콘|제목|설명" 형식 4개 (아이콘은 이모지)
- target_audience items: "✅ 추천대상" 또는 "❌ 비추대상" 형식 6개
- bonus_offers items: "혜택명|설명|가치" 형식 3-4개
- pricing items: "플랜명|가격|설명|포함항목1,포함항목2" 형식 2-3개
JSON만 응답하세요.`;

  const txt = await callAI("claude-sonnet-4-5", [{role:"user",content:prompt}], 4000);
  let json;
  try {
    const clean = txt.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    json = JSON.parse(clean);
  } catch { json = {sections:[]}; }
  return json.sections || [];
}

async function regenerateOneSection({ mainCat, subCat, serviceName, description, target, price, sectionType }) {
  const st = SECTION_TYPES.find(t => t.id === sectionType);
  const prompt = `한국 무형서비스 상세페이지 카피라이터입니다.
서비스: ${serviceName} (${mainCat} > ${subCat})
설명: ${description || "없음"} / 타겟: ${target || "없음"} / 가격: ${price || "미정"}
섹션: ${st?.label || sectionType}

JSON만:
{"type":"${sectionType}","texts":{"headline":"...","subheadline":"...","body":"...","badge":"...","items":["..."],"stats":[{"number":"...","label":"..."}]}}`;

  const txt = await callAI("claude-sonnet-4-5", [{role:"user",content:prompt}], 1500);
  try {
    const clean = txt.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════
// Export 함수들
// ══════════════════════════════════════════════════════════════

async function exportLongPng(sections, themeColors, serviceName) {
  const totalH = sections.reduce((s, sec) => s + (sec.height || 700), 0);
  const longCanvas = document.createElement("canvas");
  longCanvas.width = 480;
  longCanvas.height = Math.min(totalH, 16000);

  const ctx = longCanvas.getContext("2d");
  let y = 0;
  for (const sec of sections) {
    if (y >= 16000) break;
    const tempCanvas = document.createElement("canvas");
    const colors = getThemeForSection(sec, sections.indexOf(sec), themeColors);
    await drawSectionWithImages(tempCanvas, sec, colors);
    ctx.drawImage(tempCanvas, 0, y);
    y += sec.height || 700;
  }

  const a = document.createElement("a");
  a.href = longCanvas.toDataURL("image/png");
  a.download = (serviceName || "detail_page") + ".png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function exportSectionZip(sections, themeColors, serviceName) {
  if (!window.JSZip) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const zip = new window.JSZip();
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const tempCanvas = document.createElement("canvas");
    const colors = getThemeForSection(sec, i, themeColors);
    await drawSectionWithImages(tempCanvas, sec, colors);
    const b64 = tempCanvas.toDataURL("image/png").split(",")[1];
    const arr = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const st = SECTION_TYPES.find(t => t.id === sec.type);
    zip.file(`${String(i + 1).padStart(2, "0")}_${st?.label || sec.type}.png`, arr);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${serviceName || "detail"}_sections.zip`;
  a.click();
}

function getThemeForSection(section, index, themeColors) {
  const isPrimary = index % 2 === 0;
  // cta_final always dark
  if (section.type === "cta_final") return { ...themeColors, bg: "#0a0a0a", text: "#fff" };
  return isPrimary ? themeColors : { ...themeColors, bg: themeColors.secBg, text: themeColors.secText };
}

// ══════════════════════════════════════════════════════════════
// SectionCanvas 컴포넌트
// ══════════════════════════════════════════════════════════════

function SectionCanvas({ section, themeColors, index, displayW, onClick }) {
  const cRef = useRef(null);
  const ratio = (section.height || 700) / (section.width || 480);
  const displayH = Math.round(displayW * ratio);

  useEffect(() => {
    if (!cRef.current) return;
    const colors = getThemeForSection(section, index, themeColors);
    drawSection(cRef.current, { ...section, orderIndex: index }, colors);

    // Async image overlay
    const sectionType = SECTION_TYPES.find(st => st.id === section.type);
    if (sectionType && section.imagesData && section.imagesData.some(d => d.dataUrl)) {
      const colors2 = getThemeForSection(section, index, themeColors);
      drawSectionWithImages(cRef.current, { ...section, orderIndex: index }, colors2);
    }
  }, [section, themeColors, index]);

  return (
    <canvas
      ref={cRef}
      onClick={onClick}
      style={{ width: displayW, height: displayH, display: "block", borderRadius: 8, cursor: "pointer" }}
    />
  );
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════

export default function SectionDetailPageGenerator({ isDark, user, theme, onUserUpdate, showPointConfirm }) {
  const { lang } = useI18n();
  const ko = lang === "ko";

  const [step, setStep] = useState(1);

  // Step 1
  const [mainCat, setMainCat] = useState(null);
  const [subCat, setSubCat] = useState(null);
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [price, setPrice] = useState("");

  // Step 2
  const [sections, setSections] = useState([]);
  const [colorThemeIdx, setColorThemeIdx] = useState(0);

  // Step 3, 4, 5
  const [generating, setGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [dlSt, setDlSt] = useState({ busy: false, msg: "" });
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Drag state for Step 2
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useGeneratingGuard(generating, 10, "section_detail");

  const D = isDark || theme === "dark";
  const textColor = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.55)" : "#888";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";

  const mainCatObj = INTANGIBLE_CATEGORIES.find(c => c.key === mainCat);
  const subCatObj = mainCatObj ? mainCatObj.subs.find(s => s.key === subCat) : null;

  const currentThemes = mainCat ? (COLOR_THEMES[mainCat] || COLOR_THEMES.education) : COLOR_THEMES.education;
  const themeColors = currentThemes[colorThemeIdx] || currentThemes[0];

  const accentColor = themeColors.accent || "#7c6aff";

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: D ? "#fff" : "#1a1a2e", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  // ── 위저드 헤더 ──────────────────────────────────────────
  const WizHeader = () => (
    <div style={{ padding: "12px 24px 0", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
        {[["1", "\uCE74\uD14C\uACE0\uB9AC \uC120\uD0DD"], ["2", "\uC139\uC158 \uAD6C\uC131"], ["3", "AI \uD14D\uC2A4\uD2B8"], ["4", "\uBE44\uC8FC\uC5BC \uD3B8\uC9D1"], ["5", "\uB0B4\uBCF4\uB0B4\uAE30"]].map(([n, label], i) => {
          const s = parseInt(n);
          const done = step > s;
          const active = step === s;
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 4 ? 1 : "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: done ? "pointer" : "default" }}
                onClick={() => { if (done && s < step) setStep(s); }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, flexShrink: 0,
                  background: done || active ? accentColor : (D ? "rgba(255,255,255,0.1)" : "#e5e5e5"),
                  color: done || active ? "#fff" : (D ? "rgba(255,255,255,0.3)" : "#bbb")
                }}>
                  {done ? "\u2713" : n}
                </div>
                <span style={{ fontSize: 11, fontWeight: active ? 800 : 500, color: active ? textColor : muted, whiteSpace: "nowrap" }}>{label}</span>
              </div>
              {i < 4 && <div style={{ flex: 1, height: 2, background: done ? accentColor : (D ? "rgba(255,255,255,0.1)" : "#e5e5e5"), margin: "0 8px", minWidth: 8 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── 섹션 초기화 (카테고리 선택 시) ────────────────────────
  const initSections = useCallback((cat) => {
    const presets = CATEGORY_SECTION_PRESETS[cat] || CATEGORY_SECTION_PRESETS.education;
    const secs = presets.map((typeId, i) => {
      const st = SECTION_TYPES.find(t => t.id === typeId);
      return {
        id: "sec_" + Date.now() + "_" + i,
        type: typeId,
        width: 480,
        height: st ? st.defaultH : 700,
        texts: { headline: "", subheadline: "", body: "", badge: "", items: [], stats: [] },
        imagesData: [],
      };
    });
    setSections(secs);
  }, []);

  // Step 1 → Step 2 transition
  const goToStep2 = useCallback(() => {
    if (!mainCat || !serviceName.trim()) return;
    if (sections.length === 0) initSections(mainCat);
    setStep(2);
  }, [mainCat, serviceName, sections.length, initSections]);

  // ── AI 생성 ──────────────────────────────────────────────
  const doGenerate = useCallback(async () => {
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(10))) return;
    if (!user) incrementGuestUsage();

    setGenerating(true);
    try {
      const result = await generateAllSections({
        mainCat: mainCatObj?.label || mainCat,
        subCat: subCatObj?.label || subCat,
        serviceName,
        description,
        target,
        price,
        sectionTypes: sections,
      });

      // Merge AI results into sections
      setSections(prev => prev.map((sec, i) => {
        const aiSec = result.find(r => r.type === sec.type) || result[i];
        if (aiSec && aiSec.texts) {
          return { ...sec, texts: { ...sec.texts, ...aiSec.texts } };
        }
        return sec;
      }));

      setAiGenerated(true);

      if (user?.uid) {
        changePoints(user.uid, -10, "\uC139\uC158 \uC0C1\uC138\uD398\uC774\uC9C0 \uC0DD\uC131").then(newPts => {
          if (onUserUpdate) onUserUpdate({ ...user, points: newPts });
        }).catch(() => {});
      }

      // localStorage save
      try {
        const KEY = "nper_sectiondetail_saves_v1";
        const list = JSON.parse(localStorage.getItem(KEY) || "[]");
        const now = new Date();
        const ds = now.getFullYear() + "." + String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
        list.unshift({ id: "sd_" + Date.now(), topic: serviceName, title: serviceName, count: sections.length, date: ds, category: mainCat });
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
      } catch {}

      setStep(4);
    } catch (e) {
      alert("\uC0DD\uC131\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: " + (e.message || "\uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."));
      console.error("\uC0DD\uC131 \uC2E4\uD328:", e.message);
    }
    setGenerating(false);
  }, [user, showPointConfirm, sections, mainCat, mainCatObj, subCat, subCatObj, serviceName, description, target, price, onUserUpdate]);

  // ── 개별 섹션 재생성 ─────────────────────────────────────
  const regenSection = useCallback(async (index) => {
    const sec = sections[index];
    if (!sec) return;
    setSections(prev => prev.map((s, i) => i === index ? { ...s, _regen: true } : s));
    try {
      const result = await regenerateOneSection({
        mainCat: mainCatObj?.label || mainCat,
        subCat: subCatObj?.label || subCat,
        serviceName, description, target, price,
        sectionType: sec.type,
      });
      if (result && result.texts) {
        setSections(prev => prev.map((s, i) => i === index ? { ...s, texts: { ...s.texts, ...result.texts }, _regen: false } : s));
      } else {
        setSections(prev => prev.map((s, i) => i === index ? { ...s, _regen: false } : s));
      }
    } catch {
      setSections(prev => prev.map((s, i) => i === index ? { ...s, _regen: false } : s));
    }
  }, [sections, mainCat, mainCatObj, subCat, subCatObj, serviceName, description, target, price]);

  // ── 섹션 조작 헬퍼 ───────────────────────────────────────
  const addSection = useCallback((typeId) => {
    const st = SECTION_TYPES.find(t => t.id === typeId);
    if (!st) return;
    setSections(prev => [...prev, {
      id: "sec_" + Date.now(),
      type: typeId,
      width: 480,
      height: st.defaultH,
      texts: { headline: "", subheadline: "", body: "", badge: "", items: [], stats: [] },
      imagesData: [],
    }]);
  }, []);

  const removeSection = useCallback((index) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSectionText = useCallback((index, key, value) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== index) return s;
      if (key === "items" || key === "stats") {
        return { ...s, texts: { ...s.texts, [key]: value } };
      }
      return { ...s, texts: { ...s.texts, [key]: value } };
    }));
  }, []);

  const updateSectionImage = useCallback((index, role, dataUrl) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const existing = (s.imagesData || []).filter(d => d.role !== role);
      return { ...s, imagesData: [...existing, { role, dataUrl }] };
    }));
  }, []);

  // ── 드래그 핸들러 ─────────────────────────────────────────
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setSections(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(dragIdx, 1);
      arr.splice(idx, 0, removed);
      return arr;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx]);

  // ── 이미지 업로드 핸들러 (캔버스 클릭) ─────────────────
  const fileInputRef = useRef(null);
  const pendingImageRef = useRef(null);

  const handleCanvasClick = useCallback((e, sectionIndex) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const sec = sections[sectionIndex];
    const sectionType = SECTION_TYPES.find(st => st.id === sec.type);
    if (!sectionType) return;

    for (const imgDef of sectionType.images) {
      if (clickX >= imgDef.x && clickX <= imgDef.x + imgDef.w &&
          clickY >= imgDef.y && clickY <= imgDef.y + imgDef.h) {
        pendingImageRef.current = { sectionIndex, role: imgDef.role };
        if (fileInputRef.current) fileInputRef.current.click();
        return;
      }
    }
  }, [sections]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageRef.current) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { sectionIndex, role } = pendingImageRef.current;
      updateSectionImage(sectionIndex, role, ev.target.result);
      pendingImageRef.current = null;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [updateSectionImage]);

  // ══════════════════════════════════════════════════════════
  // STEP 1: 카테고리 + 서비스 정보
  // ══════════════════════════════════════════════════════════
  if (step === 1) {
    const canNext = mainCat && serviceName.trim();
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <WizHeader />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: textColor, letterSpacing: -0.5, marginBottom: 3 }}>{"\uBB34\uD615\uC11C\uBE44\uC2A4 \uC0C1\uC138\uD398\uC774\uC9C0 \uB9CC\uB4E4\uAE30"}</div>
            <div style={{ fontSize: 13, color: muted }}>{"\uCE74\uD14C\uACE0\uB9AC\uC640 \uC11C\uBE44\uC2A4 \uC815\uBCF4\uB97C \uC785\uB825\uD558\uBA74 AI\uAC00 \uC139\uC158\uBCC4 \uC0C1\uC138\uD398\uC774\uC9C0\uB97C \uAD6C\uC131\uD574\uC694"}</div>
          </div>

          {/* 메인 카테고리 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 10 }}>{"\uCE74\uD14C\uACE0\uB9AC *"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {INTANGIBLE_CATEGORIES.map(cat => {
                const sel = mainCat === cat.key;
                return (
                  <button key={cat.key} onClick={() => { setMainCat(cat.key); setSubCat(null); initSections(cat.key); }}
                    style={{
                      padding: "18px 10px", borderRadius: 14, border: `2px solid ${sel ? accentColor : bdr}`,
                      background: sel ? `${accentColor}15` : cardBg, cursor: "pointer", textAlign: "center",
                      transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6
                    }}>
                    <div style={{ fontSize: 28 }}>{cat.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: sel ? 800 : 600, color: sel ? accentColor : textColor }}>{cat.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 서브 카테고리 칩 */}
          {mainCatObj && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 10 }}>{"\uC138\uBD80 \uCE74\uD14C\uACE0\uB9AC"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {mainCatObj.subs.map(sub => {
                  const sel = subCat === sub.key;
                  return (
                    <button key={sub.key} onClick={() => setSubCat(sub.key)}
                      style={{
                        padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${sel ? accentColor : bdr}`,
                        background: sel ? `${accentColor}18` : "transparent", cursor: "pointer",
                        fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? accentColor : textColor,
                        transition: "all 0.12s"
                      }}>
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 텍스트 입력 */}
          {[
            { key: "serviceName", label: "\uC11C\uBE44\uC2A4\uBA85 *", ph: "\uC608: \uB9C8\uCF00\uD305 \uB9C8\uC2A4\uD130 \uD074\uB798\uC2A4", val: serviceName, set: setServiceName },
            { key: "description", label: "\uC11C\uBE44\uC2A4 \uC124\uBA85", ph: "\uC608: 3\uAC1C\uC6D4 \uB9CC\uC5D0 \uC6D4 1000\uB9CC\uC6D0 \uB9E4\uCD9C \uB2EC\uC131\uD558\uB294 \uC2E4\uC804 \uB9C8\uCF00\uD305 \uAD50\uC721", val: description, set: setDescription, ta: true },
            { key: "target", label: "\uD0C0\uAC9F \uACE0\uAC1D", ph: "\uC608: \uBD80\uC5C5/\uCC3D\uC5C5\uC744 \uC900\uBE44\uD558\uB294 2030 \uC9C1\uC7A5\uC778", val: target, set: setTarget },
            { key: "price", label: "\uAC00\uACA9", ph: "\uC608: 299,000\uC6D0 (\uC5BC\uB9AC\uBC84\uB4DC \uD2B9\uAC00 149,000\uC6D0)", val: price, set: setPrice },
          ].map(({ key, label, ph, val, set, ta }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 6 }}>{label}</div>
              {ta ? <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
                : <input value={val} onChange={e => set(e.target.value)} placeholder={ph} style={inputStyle} />}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={goToStep2} disabled={!canNext}
              style={{
                padding: "14px 40px", borderRadius: 12, border: "none", cursor: canNext ? "pointer" : "not-allowed",
                background: canNext ? accentColor : "rgba(99,102,241,0.3)", color: "#fff", fontSize: 15, fontWeight: 900,
                display: "flex", alignItems: "center", gap: 8
              }}>
              {"\uB2E4\uC74C \u2192"} <span style={{ fontSize: 12, opacity: 0.8 }}>{"\uC139\uC158 \uAD6C\uC131"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 2: 섹션 구성
  // ══════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <WizHeader />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: textColor, letterSpacing: -0.5, marginBottom: 3 }}>{"\uC139\uC158 \uAD6C\uC131"}</div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{"\uC139\uC158\uC744 \uCD94\uAC00/\uC0AD\uC81C\uD558\uACE0 \uB4DC\uB798\uADF8\uB85C \uC21C\uC11C\uB97C \uBCC0\uACBD\uD558\uC138\uC694"}</div>
          </div>

          {/* 컬러 테마 */}
          <div style={{ padding: "14px 18px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 12 }}>{"\uCEEC\uB7EC \uD14C\uB9C8"}</div>
            <div style={{ display: "flex", gap: 10 }}>
              {currentThemes.map((t, ti) => {
                const sel = colorThemeIdx === ti;
                return (
                  <button key={t.key} onClick={() => setColorThemeIdx(ti)}
                    style={{
                      flex: 1, padding: 0, borderRadius: 12, border: `2px solid ${sel ? t.accent : "transparent"}`,
                      overflow: "hidden", cursor: "pointer", background: "transparent",
                      boxShadow: sel ? `0 0 0 3px ${t.accent}30` : "0 2px 8px rgba(0,0,0,0.15)"
                    }}>
                    <div style={{ display: "flex", height: 48 }}>
                      <div style={{ flex: 1, background: t.bg }} />
                      <div style={{ flex: 1, background: t.secBg }} />
                    </div>
                    <div style={{ height: 4, background: t.accent }} />
                    <div style={{ padding: "6px 4px", background: D ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.95)" }}>
                      <div style={{ fontSize: 10, fontWeight: sel ? 800 : 600, color: sel ? t.accent : textColor }}>{t.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 섹션 리스트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {sections.map((sec, i) => {
              const st = SECTION_TYPES.find(t => t.id === sec.type);
              const isDragOver = dragOverIdx === i;
              return (
                <div key={sec.id}
                  draggable
                  onDragStart={e => handleDragStart(e, i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={e => handleDrop(e, i)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    border: `1.5px solid ${isDragOver ? accentColor : bdr}`,
                    background: isDragOver ? `${accentColor}10` : cardBg,
                    transition: "all 0.12s", cursor: "grab",
                  }}>
                  {/* Drag handle */}
                  <div style={{ fontSize: 16, color: muted, cursor: "grab", userSelect: "none", flexShrink: 0 }}>{"\u2630"}</div>
                  {/* Number */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, background: `${accentColor}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: accentColor, flexShrink: 0
                  }}>{i + 1}</div>
                  {/* Label */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{st?.label || sec.type}</div>
                    <div style={{ fontSize: 10, color: muted }}>{st?.desc || ""}</div>
                  </div>
                  {/* Remove */}
                  <button onClick={() => removeSection(i)}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: "none",
                      background: "rgba(239,68,68,0.1)", color: "#ef4444",
                      fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{"\u00D7"}</button>
                </div>
              );
            })}
          </div>

          {/* 섹션 추가 */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <button onClick={() => setShowAddMenu(!showAddMenu)}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${bdr}`,
                background: "transparent", color: accentColor, fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
              {"+ \uC139\uC158 \uCD94\uAC00"}
            </button>
            {showAddMenu && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                background: D ? "#1e1e2e" : "#fff", border: `1px solid ${bdr}`, borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)", maxHeight: 320, overflowY: "auto",
                padding: 8, marginTop: 4
              }}>
                {SECTION_TYPES.map(st => (
                  <button key={st.id}
                    onClick={() => { addSection(st.id); setShowAddMenu(false); }}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "none",
                      background: "transparent", cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: textColor,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = D ? "rgba(255,255,255,0.06)" : "#f5f5f5"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontWeight: 700 }}>{st.label}</span>
                    <span style={{ color: muted, fontSize: 11 }}>{st.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{ padding: "12px 28px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{"\u2190 \uC774\uC804"}</button>
            <button onClick={() => setStep(3)}
              style={{ padding: "14px 40px", borderRadius: 12, border: "none", cursor: "pointer", background: accentColor, color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
              {"\uB2E4\uC74C \u2192"} <span style={{ fontSize: 12, opacity: 0.8 }}>{"AI \uD14D\uC2A4\uD2B8"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 3: AI 텍스트 생성
  // ══════════════════════════════════════════════════════════
  if (step === 3) {
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <WizHeader />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: textColor, letterSpacing: -0.5, marginBottom: 3 }}>{"AI \uD14D\uC2A4\uD2B8 \uC0DD\uC131"}</div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{"\uBC84\uD2BC\uC744 \uB204\uB974\uBA74 AI\uAC00 \uBAA8\uB4E0 \uC139\uC158\uC758 \uD14D\uC2A4\uD2B8\uB97C \uC790\uB3D9\uC73C\uB85C \uC0DD\uC131\uD569\uB2C8\uB2E4"}</div>
          </div>

          {/* 생성 버튼 */}
          <div style={{ padding: "20px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg, marginBottom: 24, textAlign: "center" }}>
            {user && <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>{"\uC608\uC0C1 \uCC28\uAC10:"} <b style={{ color: accentColor }}>10P</b></div>}
            <button onClick={doGenerate} disabled={generating}
              style={{
                padding: "16px 48px", borderRadius: 14, border: "none", cursor: generating ? "wait" : "pointer",
                background: accentColor, color: "#fff", fontSize: 16, fontWeight: 900,
                display: "inline-flex", alignItems: "center", gap: 10, opacity: generating ? 0.7 : 1,
              }}>
              {generating ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} />
                  {"\uC0DD\uC131 \uC911..."}
                </>
              ) : aiGenerated ? "\u{1F504} \uB2E4\uC2DC \uC0DD\uC131\uD558\uAE30" : "\u2728 AI \uC790\uB3D9 \uC0DD\uC131"}
            </button>
          </div>

          {/* 섹션별 카드 (텍스트 편집) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sections.map((sec, i) => {
              const st = SECTION_TYPES.find(t => t.id === sec.type);
              const texts = sec.texts || {};
              return (
                <div key={sec.id} style={{ borderRadius: 14, border: `1.5px solid ${bdr}`, background: cardBg, overflow: "hidden" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", background: D ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderBottom: `1px solid ${bdr}`
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${accentColor}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: accentColor }}>{i + 1}</div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: textColor }}>{st?.label || sec.type}</span>
                      {texts.headline && <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>{"\u2713 \uC785\uB825\uB428"}</span>}
                    </div>
                    <button onClick={() => regenSection(i)} disabled={sec._regen}
                      style={{
                        padding: "5px 12px", borderRadius: 7, border: `1px solid ${accentColor}60`,
                        background: `${accentColor}10`, color: accentColor, fontSize: 11, fontWeight: 700,
                        cursor: sec._regen ? "wait" : "pointer", opacity: sec._regen ? 0.5 : 1,
                        display: "flex", alignItems: "center", gap: 5
                      }}>
                      {sec._regen ? <><div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(99,102,241,0.5)", borderTopColor: accentColor, animation: "spin 0.8s linear infinite" }} />{"\uC0DD\uC131 \uC911"}</> : "\u2726 \uB2E4\uC2DC \uC0DD\uC131"}
                    </button>
                  </div>

                  <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
                    {/* Headline */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>{"\uD5E4\uB4DC\uB77C\uC778"}</div>
                      <input value={texts.headline || ""} onChange={e => updateSectionText(i, "headline", e.target.value)}
                        placeholder={"\uBE44\uC6CC\uB450\uBA74 AI\uAC00 \uC790\uB3D9 \uC0DD\uC131"}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${texts.headline ? accentColor + "80" : bdr}`, background: inputBg, color: textColor, fontSize: 13, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {/* Subheadline */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>{"\uC11C\uBE0C\uD5E4\uB4DC\uB77C\uC778"}</div>
                      <input value={texts.subheadline || ""} onChange={e => updateSectionText(i, "subheadline", e.target.value)}
                        placeholder={"\uC120\uD0DD \uC0AC\uD56D"}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {/* Body */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>{"\uBCF8\uBB38"}</div>
                      <textarea value={texts.body || ""} onChange={e => updateSectionText(i, "body", e.target.value)}
                        placeholder={"\uC120\uD0DD \uC0AC\uD56D"} rows={2}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                    </div>
                    {/* Badge */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5 }}>{"\uBB38\uAD6C"}</div>
                      <input value={texts.badge || ""} onChange={e => updateSectionText(i, "badge", e.target.value)}
                        placeholder={"\uC120\uD0DD \uC0AC\uD56D (8\uC790 \uC774\uB0B4)"}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                    </div>

                    {/* Items (for list-type sections) */}
                    {["pain_points", "curriculum", "faq", "review_cards", "process_steps", "comparison", "benefits", "target_audience", "bonus_offers", "pricing"].includes(sec.type) && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted }}>{"\uD56D\uBAA9 \uB9AC\uC2A4\uD2B8"}</div>
                          <button onClick={() => updateSectionText(i, "items", [...(texts.items || []), ""])}
                            style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: accentColor, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{"+ \uCD94\uAC00"}</button>
                        </div>
                        {(texts.items || []).map((item, ii) => (
                          <div key={ii} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                            <input value={item} onChange={e => {
                              const newItems = [...(texts.items || [])];
                              newItems[ii] = e.target.value;
                              updateSectionText(i, "items", newItems);
                            }}
                              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                            <button onClick={() => {
                              const newItems = (texts.items || []).filter((_, j) => j !== ii);
                              updateSectionText(i, "items", newItems);
                            }}
                              style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>{"\u00D7"}</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats (for sections that use stats) */}
                    {["hero_dark", "hero_light", "expert_intro", "stats_highlight", "before_after", "cta_final"].includes(sec.type) && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted }}>{"\uD1B5\uACC4 \uC22B\uC790"}</div>
                          <button onClick={() => updateSectionText(i, "stats", [...(texts.stats || []), { number: "", label: "" }])}
                            style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: accentColor, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{"+ \uCD94\uAC00"}</button>
                        </div>
                        {(texts.stats || []).map((stat, si) => (
                          <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                            <input value={stat.number} onChange={e => {
                              const newStats = [...(texts.stats || [])];
                              newStats[si] = { ...newStats[si], number: e.target.value };
                              updateSectionText(i, "stats", newStats);
                            }} placeholder={"\uC22B\uC790"} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                            <input value={stat.label} onChange={e => {
                              const newStats = [...(texts.stats || [])];
                              newStats[si] = { ...newStats[si], label: e.target.value };
                              updateSectionText(i, "stats", newStats);
                            }} placeholder={"\uB808\uC774\uBE14"} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                            <button onClick={() => {
                              const newStats = (texts.stats || []).filter((_, j) => j !== si);
                              updateSectionText(i, "stats", newStats);
                            }}
                              style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>{"\u00D7"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{ padding: "12px 28px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{"\u2190 \uC774\uC804"}</button>
            <button onClick={() => {
              if (!aiGenerated && sections.some(s => !s.texts?.headline)) {
                doGenerate();
              } else {
                setStep(4);
              }
            }}
              style={{ padding: "14px 40px", borderRadius: 12, border: "none", cursor: generating ? "wait" : "pointer", background: accentColor, color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 8, opacity: generating ? 0.7 : 1 }}>
              {generating ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} />{"\uC0DD\uC131 \uC911..."}</> : aiGenerated ? "\uB2E4\uC74C \u2192 \uBE44\uC8FC\uC5BC \uD3B8\uC9D1" : "\u2728 AI \uC0DD\uC131 + \uD3B8\uC9D1\uC73C\uB85C"}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 4: 섹션 비주얼 편집
  // ══════════════════════════════════════════════════════════
  if (step === 4) {
    const displayW = 360;

    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <WizHeader />
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: textColor, letterSpacing: -0.5, marginBottom: 3 }}>{"\uBE44\uC8FC\uC5BC \uD3B8\uC9D1"}</div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{"\uCE94\uBC84\uC2A4 \uC704\uC758 \uC0AC\uC9C4 \uC601\uC5ED\uC744 \uD074\uB9AD\uD558\uBA74 \uC774\uBBF8\uC9C0\uB97C \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC5B4\uC694"}</div>
          </div>

          {/* 에디터 열기 (UnifiedCanvasEditor) */}
          {editorOpen && editingSection !== null && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "90vw", maxWidth: 900, height: "85vh", borderRadius: 16, overflow: "hidden", background: D ? "#1a1a2e" : "#fff" }}>
                <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "#888" }}>{"\uC5D0\uB514\uD130 \uB85C\uB529 \uC911..."}</div>}>
                  <UnifiedCanvasEditor
                    slides={[{
                      title: sections[editingSection]?.texts?.headline || "",
                      body: sections[editingSection]?.texts?.body || "",
                      bgColor: themeColors.bg,
                      textColor: themeColors.text,
                      fontSize: 28,
                      image: null,
                    }]}
                    width={480}
                    height={sections[editingSection]?.height || 700}
                    mode="detailpage"
                    onSave={() => setEditorOpen(false)}
                    onClose={() => setEditorOpen(false)}
                    inline
                  />
                </Suspense>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {sections.map((sec, i) => {
              const st = SECTION_TYPES.find(t => t.id === sec.type);
              return (
                <div key={sec.id} style={{ borderRadius: 14, border: `1.5px solid ${bdr}`, background: cardBg, overflow: "hidden" }}>
                  {/* Section header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", borderBottom: `1px solid ${bdr}`,
                    background: D ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, background: `${accentColor}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: accentColor }}>{i + 1}</div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: textColor }}>{st?.label || sec.type}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingSection(i); setEditorOpen(true); }}
                        style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: accentColor, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\uCE94\uBC84\uC2A4 \uD3B8\uC9D1"}</button>
                      <button onClick={() => removeSection(i)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u00D7"}</button>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                    <SectionCanvas
                      section={sec}
                      themeColors={themeColors}
                      index={i}
                      displayW={displayW}
                      onClick={e => handleCanvasClick(e, i)}
                    />
                  </div>

                  {/* Compact text inputs */}
                  <div style={{ padding: "0 16px 14px", display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>{"\uD5E4\uB4DC\uB77C\uC778"}</div>
                      <input value={sec.texts?.headline || ""} onChange={e => updateSectionText(i, "headline", e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 4 }}>{"\uBCF8\uBB38"}</div>
                      <input value={sec.texts?.body || ""} onChange={e => updateSectionText(i, "body", e.target.value)}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: inputBg, color: textColor, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(3)} style={{ padding: "12px 28px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{"\u2190 \uC774\uC804"}</button>
            <button onClick={() => setStep(5)}
              style={{ padding: "14px 40px", borderRadius: 12, border: "none", cursor: "pointer", background: accentColor, color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
              {"\uB2E4\uC74C \u2192"} <span style={{ fontSize: 12, opacity: 0.8 }}>{"\uB0B4\uBCF4\uB0B4\uAE30"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // STEP 5: 내보내기
  // ══════════════════════════════════════════════════════════
  if (step === 5) {
    const displayW = 360;

    const handleExportLong = async () => {
      setDlSt({ busy: true, msg: "\uAE34 \uC774\uBBF8\uC9C0 \uC0DD\uC131 \uC911..." });
      try {
        await exportLongPng(sections, themeColors, serviceName);
        setDlSt({ busy: false, msg: "\u2705 \uC800\uC7A5 \uC644\uB8CC!" });
      } catch (e) {
        setDlSt({ busy: false, msg: "\uC2E4\uD328: " + e.message });
      }
      setTimeout(() => setDlSt({ busy: false, msg: "" }), 2500);
    };

    const handleExportZip = async () => {
      setDlSt({ busy: true, msg: "ZIP \uC0DD\uC131 \uC911..." });
      try {
        await exportSectionZip(sections, themeColors, serviceName);
        setDlSt({ busy: false, msg: "\u2705 \uC800\uC7A5 \uC644\uB8CC!" });
      } catch (e) {
        setDlSt({ busy: false, msg: "\uC2E4\uD328: " + e.message });
      }
      setTimeout(() => setDlSt({ busy: false, msg: "" }), 2500);
    };

    const handleSave = () => {
      try {
        const KEY = "nper_sectiondetail_saves_v1";
        const list = JSON.parse(localStorage.getItem(KEY) || "[]");
        const now = new Date();
        const ds = now.getFullYear() + "." + String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
        const saveData = {
          id: "sd_" + Date.now(),
          topic: serviceName,
          title: serviceName,
          count: sections.length,
          date: ds,
          category: mainCat,
          sections: sections.map(s => ({ type: s.type, width: s.width, height: s.height, texts: s.texts })),
          colorThemeIdx,
        };
        // Remove old entry with same name if exists
        const filtered = list.filter(item => item.title !== serviceName);
        filtered.unshift(saveData);
        localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 30)));
        setDlSt({ busy: false, msg: "\u2705 \uC800\uC7A5 \uC644\uB8CC!" });
        setTimeout(() => setDlSt({ busy: false, msg: "" }), 2500);
      } catch (e) {
        setDlSt({ busy: false, msg: "\uC800\uC7A5 \uC2E4\uD328: " + e.message });
      }
    };

    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <WizHeader />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: textColor, letterSpacing: -0.5, marginBottom: 3 }}>{"\uB0B4\uBCF4\uB0B4\uAE30"}</div>
            <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{"\uC644\uC131\uB41C \uC0C1\uC138\uD398\uC774\uC9C0\uB97C \uC774\uBBF8\uC9C0\uB85C \uC800\uC7A5\uD558\uC138\uC694"}</div>
          </div>

          {/* Export buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            <button onClick={handleExportLong} disabled={dlSt.busy}
              style={{
                padding: "16px 12px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg,
                cursor: dlSt.busy ? "wait" : "pointer", textAlign: "center", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6
              }}>
              <div style={{ fontSize: 24 }}>{"\u{1F5BC}\uFE0F"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{"\uAE34 \uC774\uBBF8\uC9C0 \uB2E4\uC6B4\uB85C\uB4DC"}</div>
              <div style={{ fontSize: 10, color: muted }}>{"\uBAA8\uB4E0 \uC139\uC158 \uD55C \uC7A5 PNG"}</div>
            </button>
            <button onClick={handleExportZip} disabled={dlSt.busy}
              style={{
                padding: "16px 12px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg,
                cursor: dlSt.busy ? "wait" : "pointer", textAlign: "center", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6
              }}>
              <div style={{ fontSize: 24 }}>{"\u{1F4E6}"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{"\uC139\uC158\uBCC4 ZIP"}</div>
              <div style={{ fontSize: 10, color: muted }}>{"\uAC01 \uC139\uC158 \uAC1C\uBCC4 PNG"}</div>
            </button>
            <button onClick={handleSave}
              style={{
                padding: "16px 12px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg,
                cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 6
              }}>
              <div style={{ fontSize: 24 }}>{"\u{1F4BE}"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{"\uC800\uC7A5"}</div>
              <div style={{ fontSize: 10, color: muted }}>{"\uBE0C\uB77C\uC6B0\uC800\uC5D0 \uBCF4\uAD00"}</div>
            </button>
          </div>

          {/* Status message */}
          {dlSt.msg && (
            <div style={{ padding: "10px 16px", borderRadius: 10, background: `${accentColor}10`, border: `1px solid ${accentColor}30`, marginBottom: 16, textAlign: "center", fontSize: 13, fontWeight: 600, color: accentColor }}>
              {dlSt.msg}
            </div>
          )}

          {/* Full preview */}
          <div style={{
            borderRadius: 14, border: `1.5px solid ${bdr}`, background: cardBg, overflow: "hidden",
            maxHeight: 600, overflowY: "auto", padding: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 12 }}>{"\uBBF8\uB9AC\uBCF4\uAE30"}</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              {sections.map((sec, i) => (
                <SectionCanvas
                  key={sec.id}
                  section={sec}
                  themeColors={themeColors}
                  index={i}
                  displayW={displayW}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button onClick={() => setStep(4)} style={{ padding: "12px 28px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{"\u2190 \uC774\uC804"}</button>
            <button onClick={() => { setStep(1); setMainCat(null); setSubCat(null); setServiceName(""); setDescription(""); setTarget(""); setPrice(""); setSections([]); setAiGenerated(false); setColorThemeIdx(0); }}
              style={{ padding: "14px 40px", borderRadius: 12, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 14, fontWeight: 700 }}>
              {"\uCC98\uC74C\uBD80\uD130 \uB2E4\uC2DC"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
