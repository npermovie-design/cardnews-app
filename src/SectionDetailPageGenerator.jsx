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

function stripEmoji(str) {
  if (!str) return "";
  return str.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]/gu, "").trim();
}

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
  ctx.fillText("[+]",x+w/2,y+h/2-10);
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

function drawImageOrPlaceholder(ctx, imgDef, section) {
  const loaded = section._loadedImages && section._loadedImages.find(d => d.role === imgDef.role);
  if (loaded && loaded.imageObj) {
    const {x,y,w,h} = imgDef;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x,y,w,h);
    ctx.clip();
    const scale = Math.max(w/loaded.imageObj.width, h/loaded.imageObj.height);
    const dx = x + (w - loaded.imageObj.width*scale)/2;
    const dy = y + (h - loaded.imageObj.height*scale)/2;
    ctx.drawImage(loaded.imageObj, dx, dy, loaded.imageObj.width*scale, loaded.imageObj.height*scale);
    ctx.restore();
  } else if (imgDef.dataUrl) {
    // Has dataUrl but not yet loaded as Image - show "loading" placeholder
    const {x,y,w,h} = imgDef;
    ctx.save();
    ctx.fillStyle = "rgba(100,100,100,0.15)";
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle = "rgba(100,100,100,0.5)";
    ctx.font = "400 11px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("이미지 로딩중...", x+w/2, y+h/2);
    ctx.restore();
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

  // 글로벌 클리핑: 캔버스 영역 밖으로 절대 안 나가게
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  const texts = section.texts || {};
  const headline = texts.headline || "";
  const subheadline = texts.subheadline || "";
  const body = texts.body || "";
  const badge = texts.badge || "";
  const items = texts.items || [];
  const stats = texts.stats || [];
  const images = section.images || [];
  // _loadedImages는 export 시 async로 주입됨, 편집 중에는 images[].dataUrl 사용
  const imagesData = section._loadedImages || [];
  const sectionType = SECTION_TYPES.find(st => st.id === section.type);
  const sectionImages = images.length > 0 ? images : (sectionType ? sectionType.images : []);

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
          ctx.fillText("[+] " + (imgDef.placeholder || ""), W/2, 220);
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
        ctx.fillText("!", PAD + 18, y + cardH / 2);
        // Text (strip emoji for canvas compatibility)
        ctx.font = "500 14px " + FONT;
        ctx.fillStyle = tc;
        const tLines = wrapTextKo(ctx, stripEmoji(item), contentW - 60);
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
          ctx.fillText("[+] \uD504\uB85C\uD544 \uC0AC\uC9C4", cx, cy);
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

      // Items as career entries (with wrapping)
      if (items.length > 0) {
        ctx.textAlign = "left";
        items.forEach(item => {
          if (y + 22 > H - 20) return;
          ctx.font = "500 13px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.8;
          const itemLines = wrapTextKo(ctx, "\u2714 " + stripEmoji(item), contentW - 20);
          itemLines.forEach(il => {
            if (y + 20 > H - 20) return;
            ctx.fillText(il, PAD + 10, y);
            y += 22;
          });
          ctx.globalAlpha = 1;
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

      // Logo text items (wrapped)
      if (items.length > 0) {
        y += 16;
        ctx.textAlign = "center";
        ctx.font = "500 11px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.45;
        const allItemsText = items.map(s => stripEmoji(s)).join(" · ");
        const iLines = wrapTextKo(ctx, allItemsText, contentW - 20);
        iLines.slice(0, 3).forEach(l => {
          if (y + 16 > H - 10) return;
          ctx.fillText(l, W/2, y);
          y += 16;
        });
        ctx.globalAlpha = 1;
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

      reviews.forEach((review, ri) => {
        const parts = review.split("|");
        const name = stripEmoji(parts[0] || "\uC775\uBA85");
        const job = stripEmoji(parts[1] || "");
        const starStr = (parts[2] || "").replace(/[^\u2605\u2606*]/g, "") || "*****";
        const content = stripEmoji(parts[3] || parts[0] || review);

        // 후기 내용 래핑으로 카드 높이 계산
        ctx.font = "400 11px " + FONT;
        const qLines = wrapTextKo(ctx, content, contentW - 72);
        const visibleLines = qLines.slice(0, 4);
        const cardH = Math.max(100, 56 + visibleLines.length * 16 + 16);

        if (y + cardH + 12 > H - 10) return;

        // Card bg
        roundRect(ctx, PAD, y, contentW, cardH, 14);
        ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        ctx.fill();

        // Clip to card
        ctx.save();
        ctx.beginPath();
        ctx.rect(PAD, y, contentW, cardH);
        ctx.clip();

        // Avatar circle
        ctx.save();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(PAD + 28, y + 28, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name.charAt(0), PAD + 28, y + 28);
        ctx.restore();

        // Name & job
        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const nameText = name.length > 8 ? name.slice(0, 8) + ".." : name;
        ctx.fillText(nameText, PAD + 52, y + 14);
        if (job) {
          ctx.font = "400 10px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.5;
          const jobText = job.length > 10 ? job.slice(0, 10) + ".." : job;
          ctx.fillText(jobText, PAD + 52 + ctx.measureText(nameText).width + 6, y + 16);
          ctx.globalAlpha = 1;
        }

        // Stars
        ctx.font = "400 10px " + FONT;
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(starStr.slice(0, 5), PAD + 52, y + 32);

        // Quote
        ctx.font = "400 11px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.75;
        let qy = y + 50;
        visibleLines.forEach(l => {
          ctx.fillText(l, PAD + 52, qy);
          qy += 16;
        });
        ctx.globalAlpha = 1;

        // 카드 클리핑 해제
        ctx.restore();

        y += cardH + 10;
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
        const titleText = stripEmoji(title) || "PART " + (pi + 1);
        const titleLines = wrapTextKo(ctx, titleText, contentW - 28);
        if (titleLines.length <= 1) {
          ctx.fillText(titleLines[0] || titleText, PAD + 14, y + 18);
          y += 44;
        } else {
          let ty = y + 10;
          titleLines.forEach(tl => { ctx.fillText(tl, PAD + 14, ty); ty += 20; });
          y = ty + 8;
        }

        // Sub items (with text wrapping)
        subItems.forEach(sub => {
          if (y + 24 > H - 10) return;
          ctx.font = "400 13px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.75;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const subLines = wrapTextKo(ctx, "\u2022 " + stripEmoji(sub), contentW - 28);
          subLines.forEach((sl, sli) => {
            if (y + 20 > H - 10) return;
            ctx.fillText(sl, PAD + 20, y);
            y += 20;
          });
          ctx.globalAlpha = 1;
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
      const cardH = 160;

      benefitItems.slice(0, 4).forEach((item, i) => {
        const [icon, title, desc] = item.split("|");
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = PAD + col * (cardW + gapX);
        const cy = y + row * (cardH + gapY);

        if (cy + cardH > H - 10) return;

        // Card bg
        roundRect(ctx, cx, cy, cardW, cardH, 14);
        ctx.fillStyle = isPrimary ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
        ctx.fill();

        // Clip to card bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cardW, cardH);
        ctx.clip();

        ctx.font = "700 16px " + FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = accent;
        ctx.fillText(stripEmoji(icon) || "*", cx + 14, cy + 14);

        ctx.font = "700 12px " + FONT;
        ctx.fillStyle = tc;
        const tLines = wrapTextKo(ctx, stripEmoji(title || ""), cardW - 28);
        let ty = cy + 40;
        tLines.slice(0, 2).forEach(l => { ctx.fillText(l, cx + 14, ty); ty += 16; });

        ctx.font = "400 10px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        const dLines = wrapTextKo(ctx, stripEmoji(desc || ""), cardW - 28);
        let dy = ty + 4;
        dLines.slice(0, 4).forEach(l => { ctx.fillText(l, cx + 14, dy); dy += 13; });
        ctx.globalAlpha = 1;

        ctx.restore();
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

      const cW = contentW - 32; // card inner width
      plans.forEach((plan, pi) => {
        const [name, price, desc, includes] = plan.split("|");
        const isHighlight = pi === 1 || plans.length === 1;

        // 포함항목으로 카드 높이 동적 계산
        const incItems = includes ? includes.split(",").map(s => s.trim()).filter(Boolean) : [];
        const cardH = Math.max(100, 60 + Math.max(incItems.length, 1) * 18 + 20);

        if (y + cardH + 16 > H - 10) return;

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

        // Plan name (wrapped)
        ctx.font = "800 14px " + FONT;
        ctx.fillStyle = isHighlight ? accent : tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const nameLines = wrapTextKo(ctx, stripEmoji(name || ""), cW * 0.55);
        let ny = y + 16;
        nameLines.slice(0, 1).forEach(l => { ctx.fillText(l, PAD + 24, ny); ny += 20; });

        // Price (wrapped)
        ctx.font = "700 14px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "right";
        const priceText = stripEmoji(price || "");
        const priceLines = wrapTextKo(ctx, priceText, cW * 0.4);
        priceLines.slice(0, 1).forEach(l => { ctx.fillText(l, W - PAD - 24, y + 16); });

        // Desc (wrapped)
        let descY = ny + 2;
        if (desc) {
          ctx.font = "400 11px " + FONT;
          ctx.fillStyle = tc;
          ctx.globalAlpha = 0.5;
          ctx.textAlign = "left";
          const dLines = wrapTextKo(ctx, stripEmoji(desc), cW);
          dLines.slice(0, 1).forEach(l => { ctx.fillText(l, PAD + 24, descY); descY += 16; });
          ctx.globalAlpha = 1;
        }

        // Included items (wrapped)
        if (incItems.length > 0) {
          let iy = descY + 4;
          incItems.forEach(inc => {
            if (iy + 16 > y + cardH - 6) return;
            ctx.font = "400 10px " + FONT;
            ctx.fillStyle = tc;
            ctx.globalAlpha = 0.7;
            ctx.textAlign = "left";
            const iLines = wrapTextKo(ctx, "\u2713 " + stripEmoji(inc), cW);
            iLines.slice(0, 1).forEach(l => { ctx.fillText(l, PAD + 24, iy); iy += 16; });
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

        // Icon (text-safe replacement for emoji)
        ctx.font = "700 14px " + FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isPositive ? accent : "#ef4444";
        ctx.fillText(isPositive ? "O" : "X", PAD + 12, y + 18);

        // Text
        ctx.font = "500 13px " + FONT;
        ctx.fillStyle = tc;
        const tgtLines = wrapTextKo(ctx, stripEmoji(text), contentW - 48);
        ctx.fillText(tgtLines[0] || text, PAD + 40, y + 18);

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

        // Name (wrapped)
        ctx.font = "700 13px " + FONT;
        ctx.fillStyle = tc;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const bnLines = wrapTextKo(ctx, stripEmoji(name || ""), contentW - 80);
        bnLines.slice(0, 1).forEach(l => { ctx.fillText(l, PAD + 56, y + 16); });

        // Desc (wrapped)
        ctx.font = "400 11px " + FONT;
        ctx.fillStyle = tc;
        ctx.globalAlpha = 0.6;
        const bdLines = wrapTextKo(ctx, stripEmoji(desc || ""), contentW - 80);
        bdLines.slice(0, 2).forEach((l, li) => { ctx.fillText(l, PAD + 56, y + 36 + li * 15); });
        ctx.globalAlpha = 1;

        // Value (wrapped)
        if (value) {
          ctx.font = "700 10px " + FONT;
          ctx.fillStyle = accent;
          ctx.textAlign = "right";
          ctx.fillText(stripEmoji(value).slice(0, 15), W - PAD - 16, y + 56);
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
          ctx.fillText("[+]", cx, cy);
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
          ctx.fillText("[S]", cx, cy);
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

  // 글로벌 클리핑 해제
  ctx.restore();
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

// 전체 생성: 한 섹션씩 순차 호출 (안정적, 타임아웃 방지)
// onProgress(idx, total) 콜백으로 진행률 전달
async function generateAllSections({ mainCat, subCat, serviceName, description, target, price, sectionTypes, onProgress }) {
  const allResults = [];
  for (let i = 0; i < sectionTypes.length; i++) {
    const s = sectionTypes[i];
    if (onProgress) onProgress(i, sectionTypes.length);
    try {
      const result = await regenerateOneSection({
        mainCat, subCat, serviceName, description, target, price,
        sectionType: s.type,
      });
      allResults.push(result || { type: s.type, texts: { headline: "", subheadline: "", body: "", badge: "" } });
    } catch (e) {
      console.warn("section gen failed:", s.type, e.message);
      allResults.push({ type: s.type, texts: { headline: "", subheadline: "", body: "", badge: "" } });
    }
  }
  return allResults;
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

    // 이미지가 있으면 async로 로드 후 렌더, 없으면 바로 렌더
    const hasAnyImage = (section.images || []).some(img => img.dataUrl);
    if (hasAnyImage) {
      // Load all images, then draw with them
      Promise.all(
        (section.images || []).map(img => {
          if (!img.dataUrl) return Promise.resolve(null);
          return new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve({ role: img.role, imgElement: image });
            image.onerror = () => resolve(null);
            image.src = img.dataUrl;
          });
        })
      ).then(loaded => {
        const loadedImages = loaded.filter(Boolean);
        drawSection(cRef.current, { ...section, orderIndex: index, _loadedImages: loadedImages }, colors);
      });
    } else {
      drawSection(cRef.current, { ...section, orderIndex: index }, colors);
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
  const [previewIdx, setPreviewIdx] = useState(null);
  const [genProgress, setGenProgress] = useState("");
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
      // SECTION_TYPES에 정의된 images 슬롯을 deep copy
      const images = (st?.images || []).map(img => ({ ...img, dataUrl: null }));
      return {
        id: "sec_" + Date.now() + "_" + i,
        type: typeId,
        width: 480,
        height: st ? st.defaultH : 700,
        texts: { headline: "", subheadline: "", body: "", badge: "", items: [], stats: [] },
        images,
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
        onProgress: (idx, total) => {
          const st = SECTION_TYPES.find(t => t.id === sections[idx]?.type);
          setGenProgress(`${idx + 1}/${total} ${st?.label || ""} 생성 중...`);
        },
      });

      setGenProgress("");

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
    const images = (st.images || []).map(img => ({ ...img, dataUrl: null }));
    setSections(prev => [...prev, {
      id: "sec_" + Date.now(),
      type: typeId,
      width: 480,
      height: st.defaultH,
      texts: { headline: "", subheadline: "", body: "", badge: "", items: [], stats: [] },
      images,
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
                  {genProgress || "생성 중..."}
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
    const displayW = 300;

    const scrollToSection = (idx) => {
      const el = document.getElementById("sec-block-" + idx);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const moveSection = (from, to) => {
      if (to < 0 || to >= sections.length) return;
      setSections(prev => {
        const arr = [...prev];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        return arr.map((s, i) => ({ ...s, order: i }));
      });
    };

    // Drag reorder for sidebar
    const sidebarDragRef = { current: null };

    const handleImageUpload = (secIdx, imgIdx) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSections(prev => prev.map((s, si) => {
            if (si !== secIdx) return s;
            const newImgs = [...(s.images || [])];
            if (newImgs[imgIdx]) newImgs[imgIdx] = { ...newImgs[imgIdx], dataUrl: ev.target.result };
            return { ...s, images: newImgs };
          }));
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    const handleImageRemove = (secIdx, imgIdx) => {
      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const newImgs = [...(s.images || [])];
        if (newImgs[imgIdx]) newImgs[imgIdx] = { ...newImgs[imgIdx], dataUrl: null };
        return { ...s, images: newImgs };
      }));
    };

    const updateItem = (secIdx, itemIdx, val) => {
      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const items = [...(s.texts?.items || [])]; items[itemIdx] = val;
        return { ...s, texts: { ...s.texts, items } };
      }));
    };
    const addItem = (secIdx) => {
      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        return { ...s, texts: { ...s.texts, items: [...(s.texts?.items || []), ""] } };
      }));
    };
    const removeItem = (secIdx, itemIdx) => {
      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const items = [...(s.texts?.items || [])]; items.splice(itemIdx, 1);
        return { ...s, texts: { ...s.texts, items } };
      }));
    };
    const updateStat = (secIdx, statIdx, field, val) => {
      setSections(prev => prev.map((s, si) => {
        if (si !== secIdx) return s;
        const stats = [...(s.texts?.stats || [])];
        stats[statIdx] = { ...stats[statIdx], [field]: val };
        return { ...s, texts: { ...s.texts, stats } };
      }));
    };

    const inputSt = { width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:textColor, fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
    const labelSt = { fontSize:10, fontWeight:700, color:muted, marginBottom:4 };
    const ITEMS_TYPES = ["pain_points","curriculum","faq","review_cards","process_steps","comparison","benefits","target_audience","bonus_offers","pricing"];
    const STATS_TYPES = ["hero_dark","hero_light","stats_highlight"];

    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <WizHeader />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* -- 왼쪽 사이드바: 섹션 리스트 -- */}
          <div style={{
            width:220, flexShrink:0, borderRight:`1.5px solid ${bdr}`,
            background: D ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            display:"flex", flexDirection:"column", overflow:"hidden",
          }}>
            <div style={{ padding:"12px 12px 8px", borderBottom:`1px solid ${bdr}` }}>
              <div style={{ fontSize:12, fontWeight:800, color:textColor }}>섹션 목록</div>
              <div style={{ fontSize:10, color:muted, marginTop:2 }}>클릭=이동 / 드래그=순서변경</div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
              {sections.map((sec, i) => {
                const st = SECTION_TYPES.find(t => t.id === sec.type);
                return (
                  <div key={sec.id} draggable
                    onDragStart={() => { sidebarDragRef.current = i; }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (sidebarDragRef.current !== null && sidebarDragRef.current !== i) moveSection(sidebarDragRef.current, i); sidebarDragRef.current = null; }}
                    onClick={() => scrollToSection(i)}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      padding:"8px 8px", marginBottom:4, borderRadius:8,
                      background: D ? "rgba(255,255,255,0.04)" : "#fff",
                      border:`1px solid ${bdr}`, cursor:"grab",
                      transition:"background 0.15s", userSelect:"none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${accentColor}12`}
                    onMouseLeave={e => e.currentTarget.style.background = D ? "rgba(255,255,255,0.04)" : "#fff"}
                  >
                    <span style={{ width:20, height:20, borderRadius:5, background:`${accentColor}20`, color:accentColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, flexShrink:0 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:11, fontWeight:700, color:textColor, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{st?.label||sec.type}</span>
                    <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                      <button onClick={e => { e.stopPropagation(); moveSection(i, i-1); }} disabled={i===0}
                        style={{ width:18, height:18, borderRadius:4, border:"none", background:"transparent", color: i===0?muted:textColor, fontSize:9, cursor:i===0?"default":"pointer", opacity:i===0?0.3:1, display:"flex", alignItems:"center", justifyContent:"center" }}>&#9650;</button>
                      <button onClick={e => { e.stopPropagation(); moveSection(i, i+1); }} disabled={i===sections.length-1}
                        style={{ width:18, height:18, borderRadius:4, border:"none", background:"transparent", color:i===sections.length-1?muted:textColor, fontSize:9, cursor:i===sections.length-1?"default":"pointer", opacity:i===sections.length-1?0.3:1, display:"flex", alignItems:"center", justifyContent:"center" }}>&#9660;</button>
                      <button onClick={e => { e.stopPropagation(); removeSection(i); }}
                        style={{ width:18, height:18, borderRadius:4, border:"none", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 테마 전환 */}
            <div style={{ padding:"8px 12px", borderTop:`1px solid ${bdr}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>컬러 테마</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {(COLOR_THEMES[mainCat] || COLOR_THEMES.education).map((t, ti) => (
                  <button key={t.key} onClick={() => setColorThemeIdx(ti)}
                    style={{
                      display:"flex", alignItems:"center", gap:6, padding:"6px 8px", borderRadius:6,
                      border: colorThemeIdx === ti ? `2px solid ${accentColor}` : `1px solid ${bdr}`,
                      background: colorThemeIdx === ti ? `${accentColor}10` : "transparent",
                      cursor:"pointer", fontSize:10, fontWeight:600, color:textColor,
                    }}>
                    <div style={{ display:"flex", gap:2 }}>
                      <div style={{ width:14, height:14, borderRadius:3, background:t.bg, border:"1px solid rgba(128,128,128,0.2)" }} />
                      <div style={{ width:14, height:14, borderRadius:3, background:t.accent }} />
                      <div style={{ width:14, height:14, borderRadius:3, background:t.secBg, border:"1px solid rgba(128,128,128,0.2)" }} />
                    </div>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* 하단 버튼 */}
            <div style={{ padding:"8px 12px", borderTop:`1px solid ${bdr}`, display:"flex", gap:6 }}>
              <button onClick={() => setStep(3)} style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, fontWeight:700, cursor:"pointer" }}>&larr; 이전</button>
              <button onClick={() => setStep(5)} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:accentColor, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>내보내기 &rarr;</button>
            </div>
          </div>

          {/* -- 캔버스 크게보기 모달 -- */}
          {previewIdx !== null && previewIdx >= 0 && previewIdx < sections.length && (
            <div onClick={() => setPreviewIdx(null)} style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
              <div style={{ maxWidth:480, width:"90vw", maxHeight:"90vh", overflow:"auto", borderRadius:12 }} onClick={e=>e.stopPropagation()}>
                <SectionCanvas section={sections[previewIdx]} themeColors={themeColors} index={previewIdx} displayW={480} onClick={()=>setPreviewIdx(null)} />
              </div>
            </div>
          )}

          {/* -- 오른쪽: 섹션 편집 영역 -- */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 40px" }}>
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              <div style={{ fontSize:12, color:muted, marginBottom:16 }}>미리보기 클릭 = 크게 보기 · 텍스트/사진은 우측에서 직접 수정</div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {sections.map((sec, i) => {
                  const st = SECTION_TYPES.find(t => t.id === sec.type);
                  const hasItems = ITEMS_TYPES.includes(sec.type);
                  const hasStats = STATS_TYPES.includes(sec.type);
                  const hasImages = (sec.images||[]).length > 0;
                  const isReview = sec.type === "review_cards";

                  return (
                    <div key={sec.id} id={"sec-block-"+i}
                      style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden", scrollMarginTop:20 }}>

                      {/* 섹션 제목 바 */}
                      <div style={{ padding:"8px 14px", borderBottom:`1px solid ${bdr}`, background: D?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)", display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:`${accentColor}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:accentColor }}>{i+1}</div>
                        <span style={{ fontSize:13, fontWeight:800, color:textColor }}>{st?.label||sec.type}</span>
                      </div>

                      {/* 미리보기 + 편집 2단 */}
                      <div style={{ display:"flex", gap:0 }}>
                        {/* 캔버스 미리보기 (클릭하면 크게) */}
                        <div style={{ flexShrink:0, padding:12, display:"flex", justifyContent:"center", alignItems:"flex-start", background: D?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.02)", cursor:"zoom-in" }}
                          onClick={() => setPreviewIdx(i)}>
                          <SectionCanvas section={sec} themeColors={themeColors} index={i} displayW={displayW} onClick={() => setPreviewIdx(i)} />
                        </div>

                        {/* 편집 패널 */}
                        <div style={{ flex:1, padding:"12px 14px", display:"flex", flexDirection:"column", gap:8, overflowY:"auto", maxHeight: 600, minWidth:0 }}>
                          {/* 기본 텍스트 */}
                          <div>
                            <div style={labelSt}>헤드라인</div>
                            <input value={sec.texts?.headline||""} onChange={e=>updateSectionText(i,"headline",e.target.value)} placeholder="메인 제목" style={inputSt} />
                          </div>
                          <div>
                            <div style={labelSt}>서브헤드라인</div>
                            <input value={sec.texts?.subheadline||""} onChange={e=>updateSectionText(i,"subheadline",e.target.value)} placeholder="부제목" style={inputSt} />
                          </div>
                          <div>
                            <div style={labelSt}>본문</div>
                            <textarea value={sec.texts?.body||""} onChange={e=>updateSectionText(i,"body",e.target.value)} placeholder="상세 설명" rows={2} style={{...inputSt, resize:"vertical", minHeight:36}} />
                          </div>
                          <div>
                            <div style={labelSt}>뱃지</div>
                            <input value={sec.texts?.badge||""} onChange={e=>updateSectionText(i,"badge",e.target.value)} placeholder="예: 얼리버드 할인" style={inputSt} />
                          </div>

                          {/* 사진 슬롯 */}
                          {hasImages && (
                            <div>
                              <div style={labelSt}>사진</div>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                {(sec.images||[]).map((img, imgI) => (
                                  <div key={imgI} style={{ position:"relative" }}>
                                    {img.dataUrl ? (
                                      <div style={{ position:"relative" }}>
                                        <img src={img.dataUrl} alt="" style={{ width:64, height:64, objectFit:"cover", borderRadius:6, border:`1px solid ${bdr}` }} />
                                        <button onClick={()=>handleImageRemove(i,imgI)} style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:8, border:"none", background:"#ef4444", color:"#fff", fontSize:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>
                                      </div>
                                    ) : (
                                      <button onClick={()=>handleImageUpload(i,imgI)} style={{ width:64, height:64, borderRadius:6, border:`1.5px dashed ${bdr}`, background:D?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, color:muted, fontSize:8 }}>
                                        <span style={{ fontSize:14 }}>+</span>
                                        <span style={{ textAlign:"center", lineHeight:1.2 }}>{img.placeholder||"사진"}</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stats */}
                          {hasStats && (sec.texts?.stats||[]).length>0 && (
                            <div>
                              <div style={labelSt}>통계</div>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                {(sec.texts.stats||[]).map((stat,si) => (
                                  <div key={si} style={{ display:"flex", gap:3 }}>
                                    <input value={stat.number||""} onChange={e=>updateStat(i,si,"number",e.target.value)} placeholder="숫자" style={{...inputSt, width:55, fontSize:11}} />
                                    <input value={stat.label||""} onChange={e=>updateStat(i,si,"label",e.target.value)} placeholder="라벨" style={{...inputSt, width:50, fontSize:11}} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* review_cards 전용: 후기 개별 편집 */}
                          {isReview && (
                            <div>
                              <div style={{ ...labelSt, display:"flex", justifyContent:"space-between" }}>
                                <span>후기 목록</span>
                                <button onClick={()=>addItem(i)} style={{ fontSize:9, padding:"1px 6px", borderRadius:4, border:`1px solid ${bdr}`, background:"transparent", color:accentColor, cursor:"pointer", fontWeight:700 }}>+추가</button>
                              </div>
                              {(sec.texts?.items||[]).map((item, ii) => {
                                const parts = item.split("|");
                                const rName = parts[0]||""; const rJob = parts[1]||"";
                                const rStars = parts[2]||"★★★★★"; const rContent = parts[3]||"";
                                const updateReview = (field, val) => {
                                  const p = [rName, rJob, rStars, rContent];
                                  if (field==="name") p[0]=val; if (field==="job") p[1]=val;
                                  if (field==="stars") p[2]=val; if (field==="content") p[3]=val;
                                  updateItem(i, ii, p.join("|"));
                                };
                                return (
                                  <div key={ii} style={{ padding:8, borderRadius:8, border:`1px solid ${bdr}`, marginBottom:6, background:D?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)" }}>
                                    <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                                      <input value={rName} onChange={e=>updateReview("name",e.target.value)} placeholder="이름" style={{...inputSt, flex:1, fontSize:10}} />
                                      <input value={rJob} onChange={e=>updateReview("job",e.target.value)} placeholder="직업" style={{...inputSt, flex:1, fontSize:10}} />
                                      <select value={rStars} onChange={e=>updateReview("stars",e.target.value)}
                                        style={{...inputSt, width:70, fontSize:10, padding:"4px 2px"}}>
                                        <option value="★★★★★">★×5</option>
                                        <option value="★★★★">★×4</option>
                                        <option value="★★★">★×3</option>
                                        <option value="★★">★×2</option>
                                        <option value="★">★×1</option>
                                      </select>
                                      <button onClick={()=>removeItem(i,ii)} style={{ width:20, height:20, borderRadius:4, border:"none", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>&times;</button>
                                    </div>
                                    <textarea value={rContent} onChange={e=>updateReview("content",e.target.value)} placeholder="후기 내용" rows={2}
                                      style={{...inputSt, fontSize:10, resize:"vertical", minHeight:30}} />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Items (review_cards 제외) */}
                          {hasItems && !isReview && (
                            <div>
                              <div style={{ ...labelSt, display:"flex", justifyContent:"space-between" }}>
                                <span>항목</span>
                                <button onClick={()=>addItem(i)} style={{ fontSize:9, padding:"1px 6px", borderRadius:4, border:`1px solid ${bdr}`, background:"transparent", color:accentColor, cursor:"pointer", fontWeight:700 }}>+추가</button>
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                {(sec.texts?.items||[]).map((item, ii) => (
                                  <div key={ii} style={{ display:"flex", gap:3 }}>
                                    <input value={item} onChange={e=>updateItem(i,ii,e.target.value)} style={{...inputSt, flex:1, fontSize:11}} placeholder={`항목 ${ii+1}`} />
                                    <button onClick={()=>removeItem(i,ii)} style={{ width:20, height:20, borderRadius:4, border:"none", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"center" }}>&times;</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
