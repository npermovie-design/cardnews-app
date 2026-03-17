import { useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 생성기 v4 – 순수 Canvas 이미지 생성
   - HTML이 아닌 Canvas API로 직접 이미지 픽셀 렌더
   - 결과물 = 완성된 PNG 이미지 (HTML 코드 X)
   - 참고 이미지 스타일 분석 반영
   - 최대 20장 슬라이드
══════════════════════════════════════════════════════════════ */

const API_KEY = "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";
const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";
const W = 1080, H = 1080; // 슬라이드 크기

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", bg:"#fff8f5", textLight:"#fff", textDark:"#1a0800" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", bg:"#f9f9f9", textLight:"#fff", textDark:"#1a1a1a" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", bg:"#fff5f8", textLight:"#fff", textDark:"#2d0e1e" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", bg:"#f5f8ff", textLight:"#fff", textDark:"#0a1a4a" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", bg:"#fdf8f3", textLight:"#fff", textDark:"#2a1a08" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", bg:"#f5fcf5", textLight:"#fff", textDark:"#0a2a0c" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", bg:"#fffbf0", textLight:"#fff", textDark:"#2a1800" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", bg:"#f8f5ff", textLight:"#fff", textDark:"#1a0a40" },
];

// ── 슬라이드 타입 20종 ────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"hero",        label:"메인 히어로"     },
  { id:"intro",       label:"브랜드 소개"     },
  { id:"feature",     label:"핵심 특징"       },
  { id:"detail1",     label:"상세 설명 1"     },
  { id:"detail2",     label:"상세 설명 2"     },
  { id:"comparison",  label:"비교/장점"       },
  { id:"howto",       label:"사용 방법"       },
  { id:"ingredient",  label:"구성/성분"       },
  { id:"quality",     label:"품질 인증"       },
  { id:"review",      label:"고객 후기"       },
  { id:"trust",       label:"신뢰 지표"       },
  { id:"faq",         label:"자주 묻는 질문"  },
  { id:"gallery",     label:"상품 갤러리"     },
  { id:"package",     label:"구성품 안내"     },
  { id:"delivery",    label:"배송/교환 안내"  },
  { id:"event",       label:"이벤트/혜택"     },
  { id:"size",        label:"사이즈 가이드"   },
  { id:"story",       label:"브랜드 스토리"   },
  { id:"warning",     label:"주의사항"        },
  { id:"cta",         label:"구매 유도"       },
];

// ══════════════════════════════════════════════════════════════
// 유틸: Canvas 텍스트 래핑
// ══════════════════════════════════════════════════════════════
function wrapText(ctx, text, maxW) {
  if (!text) return [""];
  const lines = [];
  for (const para of text.split("\n")) {
    if (!para) { lines.push(""); continue; }
    let cur = "";
    for (const ch of para) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

function drawTextBlock(ctx, text, x, y, maxW, lineH, options = {}) {
  const { align = "left", alpha = 1, maxLines = 99 } = options;
  ctx.globalAlpha = alpha;
  const lines = wrapText(ctx, text, maxW).slice(0, maxLines);
  for (const line of lines) {
    const lw = ctx.measureText(line).width;
    const dx = align === "center" ? x + (maxW - lw) / 2
             : align === "right"  ? x + maxW - lw
             : x;
    ctx.fillText(line, dx, y);
    y += lineH;
  }
  ctx.globalAlpha = 1;
  return y;
}

function drawRect(ctx, x, y, w, h, r = 0, fill = null, stroke = null, sw = 1) {
  ctx.beginPath();
  if (r > 0) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
}

function hexToRgb(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 드로어 (Canvas 직접 렌더)
// ══════════════════════════════════════════════════════════════
async function loadImg(src) {
  if (!src) return null;
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = () => res(null);
    img.src = src;
  });
}

function drawBg(ctx, cat, style = "light") {
  if (style === "dark") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cat.textDark); g.addColorStop(1, hexToRgb(cat.accent, 0.4));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = cat.bg; ctx.fillRect(0, 0, W, H);
  }
  // 미묘한 그리드 패턴
  ctx.strokeStyle = style === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function drawLabel(ctx, text, x, y, color, bg = null, pad = 12) {
  ctx.font = `800 22px ${FONT}`;
  const tw = ctx.measureText(text).width;
  if (bg) { drawRect(ctx, x, y - 18, tw + pad*2, 34, 4, bg); }
  ctx.fillStyle = color; ctx.textBaseline = "top";
  ctx.fillText(text, x + (bg ? pad : 0), y - 14);
}

function drawPageNum(ctx, num, total, cat, dark = false) {
  const col = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)";
  ctx.font = `700 24px ${FONT}`; ctx.fillStyle = col; ctx.textBaseline = "bottom"; ctx.textAlign = "right";
  ctx.fillText(`${String(num).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, W - 60, H - 48);
  ctx.textAlign = "left";
  // 하단 라인
  drawRect(ctx, 60, H - 56, 48, 3, 2, cat.accent);
}

async function drawSlide(canvas, type, data, cat, productImgs, num, total, style) {
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  const isDark = style === "dark";
  const fg     = isDark ? cat.textLight : cat.textDark;
  const pad    = 80;
  const inner  = W - pad * 2;

  // 이미지 로드
  const imgs = await Promise.all((productImgs || []).map(src => loadImg(src)));
  const mainImg = imgs[0] || null;

  switch (type) {

    case "hero": {
      // 풀블리드 이미지 + 하단 텍스트
      if (mainImg) {
        ctx.drawImage(mainImg, 0, 0, W, H);
        const g = ctx.createLinearGradient(0, H*0.35, 0, H);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.82)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else {
        drawBg(ctx, cat, "dark");
      }
      // 배지
      if (data.badge) {
        const bw = ctx.measureText(data.badge).width + 32;
        ctx.font = `800 22px ${FONT}`;
        drawRect(ctx, pad, H - 370, bw + 32, 38, 3, cat.accent);
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
        ctx.fillText(data.badge, pad + 16, H - 351);
      }
      // 헤드라인
      ctx.font = `900 88px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textBaseline = "top";
      let y = H - 300;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 100, { maxLines: 2 });
      // 서브
      ctx.font = `500 34px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.8)";
      y += 16;
      y = drawTextBlock(ctx, data.subheadline || "", pad, y, inner, 48, { maxLines: 2 });
      drawPageNum(ctx, num, total, cat, true);
      break;
    }

    case "intro": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      // 우측에 이미지
      if (mainImg) {
        const iw = 480, ix = W - iw;
        ctx.save(); ctx.beginPath(); ctx.roundRect(ix, 0, iw, H, [0,0,0,0]); ctx.clip();
        ctx.globalAlpha = 0.9; ctx.drawImage(mainImg, ix, 0, iw, H); ctx.restore();
        ctx.globalAlpha = 1;
        // 이미지 왼쪽 페이드
        const grd = ctx.createLinearGradient(ix - 100, 0, ix + 60, 0);
        grd.addColorStop(0, cat.bg); grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd; ctx.fillRect(ix - 100, 0, 160, H);
      }
      // 텍스트
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "BRAND STORY").toUpperCase(), pad, 120);
      drawRect(ctx, pad, 158, 48, 4, 2, cat.accent);
      ctx.font = `900 64px ${FONT}`; ctx.fillStyle = fg;
      let y = 186;
      y = drawTextBlock(ctx, data.headline || "", pad, y, W * 0.5, 76, { maxLines: 3 });
      ctx.font = `400 28px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
      y += 28;
      drawTextBlock(ctx, data.body || "", pad, y, W * 0.5, 42, { maxLines: 5 });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "feature": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "FEATURES").toUpperCase(), pad, 80);
      drawRect(ctx, pad, 118, 48, 4, 2, cat.accent);
      ctx.font = `900 60px ${FONT}`; ctx.fillStyle = fg;
      let ty = 148;
      ty = drawTextBlock(ctx, data.headline || "", pad, ty, inner, 72, { maxLines: 2 });
      ty += 48;
      const feats = (data.features || []).slice(0, 3);
      const fw = Math.floor((inner - 48) / 3);
      feats.forEach((f, i) => {
        const fx = pad + i * (fw + 24);
        const fy = ty;
        // 카드 배경
        drawRect(ctx, fx, fy, fw, 320, 16, isDark ? "rgba(255,255,255,0.06)" : "#fff",
          isDark ? "rgba(255,255,255,0.1)" : hexToRgb(cat.accent, 0.12), 1.5);
        // 번호
        ctx.font = `900 48px ${FONT}`; ctx.fillStyle = hexToRgb(cat.accent, isDark ? 0.3 : 0.15);
        ctx.textBaseline = "top"; ctx.fillText(`0${i+1}`, fx + 24, fy + 24);
        // 제목
        ctx.font = `800 30px ${FONT}`; ctx.fillStyle = fg;
        drawTextBlock(ctx, f.title || "", fx + 24, fy + 92, fw - 48, 38, { maxLines: 2 });
        // 설명
        ctx.font = `400 22px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
        drawTextBlock(ctx, f.desc || "", fx + 24, fy + 178, fw - 48, 32, { maxLines: 3 });
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "detail1": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      // 상단 절반: 이미지
      if (mainImg) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * 0.52); ctx.clip();
        ctx.drawImage(mainImg, 0, 0, W, H * 0.52); ctx.restore();
        // 하단 페이드
        const g2 = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.54);
        g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, isDark ? cat.textDark : cat.bg);
        ctx.fillStyle = g2; ctx.fillRect(0, H * 0.38, W, H * 0.18);
      }
      const ty = H * 0.54;
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "DETAIL").toUpperCase(), pad, ty);
      drawRect(ctx, pad, ty + 38, 48, 4, 2, cat.accent);
      ctx.font = `900 56px ${FONT}`; ctx.fillStyle = fg;
      let y = ty + 68;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 68, { maxLines: 2 });
      ctx.font = `400 26px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.58)";
      y += 20;
      drawTextBlock(ctx, data.body || "", pad, y, inner, 38, { maxLines: 3 });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "detail2": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      // 좌우 분할: 좌=텍스트, 우=이미지
      const half = W / 2;
      if (mainImg) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(half + 24, 80, half - 80, H - 160, 20); ctx.clip();
        ctx.drawImage(mainImg, half + 24, 80, half - 80, H - 160); ctx.restore();
      }
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "SPEC").toUpperCase(), pad, 100);
      drawRect(ctx, pad, 138, 48, 4, 2, cat.accent);
      ctx.font = `900 56px ${FONT}`; ctx.fillStyle = fg;
      let y = 168;
      y = drawTextBlock(ctx, data.headline || "", pad, y, half - 60, 68, { maxLines: 2 });
      y += 32;
      // 스펙 리스트
      (data.specs || []).forEach((s, i) => {
        drawRect(ctx, pad, y, half - 80, 64, 8, i%2===0 ? (isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)") : "transparent");
        ctx.font = `700 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "middle";
        ctx.fillText(s.label || "", pad + 18, y + 32);
        ctx.font = `400 22px ${FONT}`; ctx.fillStyle = fg;
        ctx.fillText(s.value || "", pad + 200, y + 32);
        y += 72;
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "comparison": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "WHY US").toUpperCase(), pad, 80);
      ctx.font = `900 64px ${FONT}`; ctx.fillStyle = fg;
      let y = 130;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 76, { maxLines: 2 });
      y += 40;
      // BEFORE / AFTER 카드
      const cw = (inner - 32) / 2;
      // Before
      drawRect(ctx, pad, y, cw, 240, 16, isDark ? "rgba(255,255,255,0.04)" : "#fff", "rgba(0,0,0,0.08)", 1);
      ctx.font = `700 20px ${FONT}`; ctx.fillStyle = "rgba(150,150,150,0.8)"; ctx.textBaseline = "top";
      ctx.fillText("BEFORE", pad + 28, y + 24);
      ctx.font = `500 28px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
      drawTextBlock(ctx, data.before || "", pad + 28, y + 68, cw - 56, 38, { maxLines: 3 });
      // After
      drawRect(ctx, pad + cw + 32, y, cw, 240, 16, cat.accent);
      ctx.font = `700 20px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
      ctx.fillText("AFTER", pad + cw + 60, y + 24);
      ctx.font = `500 28px ${FONT}`; ctx.fillStyle = "#fff";
      drawTextBlock(ctx, data.after || "", pad + cw + 60, y + 68, cw - 56, 38, { maxLines: 3 });
      y += 272;
      // 포인트
      (data.points || []).forEach((pt, i) => {
        drawRect(ctx, pad, y, inner, 68, 8, isDark ? "rgba(255,255,255,0.04)" : hexToRgb(cat.accent, 0.05));
        // 번호 배지
        drawRect(ctx, pad + 16, y + 16, 36, 36, 4, cat.accent);
        ctx.font = `800 18px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
        ctx.fillText(String(i+1), pad + 27, y + 34);
        ctx.font = `500 26px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "middle";
        ctx.fillText(pt || "", pad + 68, y + 34);
        y += 76;
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "howto": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "HOW TO USE").toUpperCase(), pad, 80);
      ctx.font = `900 60px ${FONT}`; ctx.fillStyle = fg;
      let y = 130;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 72, { maxLines: 2 });
      y += 40;
      (data.steps || []).forEach((s, i) => {
        // 번호 (큰 글자)
        ctx.font = `900 80px ${FONT}`; ctx.fillStyle = hexToRgb(cat.accent, 0.15); ctx.textBaseline = "top";
        ctx.fillText(s.num || `0${i+1}`, pad, y - 12);
        ctx.font = `800 32px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "top";
        ctx.fillText(s.title || "", pad + 96, y);
        ctx.font = `400 24px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
        drawTextBlock(ctx, s.desc || "", pad + 96, y + 42, inner - 96, 34, { maxLines: 2 });
        // 구분선
        if (i < (data.steps||[]).length - 1) {
          ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad + 96, y + 110); ctx.lineTo(W - pad, y + 110); ctx.stroke();
        }
        y += 120;
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "ingredient": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      // 이미지 우상단
      if (mainImg) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(W - 480, 80, 400, 400, 24); ctx.clip();
        ctx.drawImage(mainImg, W - 480, 80, 400, 400); ctx.restore();
      }
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "INGREDIENT").toUpperCase(), pad, 80);
      drawRect(ctx, pad, 118, 48, 4, 2, cat.accent);
      ctx.font = `900 56px ${FONT}`; ctx.fillStyle = fg;
      let y = 148;
      y = drawTextBlock(ctx, data.headline || "", pad, y, W * 0.55, 68, { maxLines: 2 });
      y += 36;
      (data.items || []).forEach(it => {
        drawRect(ctx, pad, y, W * 0.55, 4, 2, hexToRgb(cat.accent, 0.2));
        y += 12;
        ctx.font = `800 28px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
        ctx.fillText(it.name || "", pad, y);
        ctx.font = `400 22px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
        y = drawTextBlock(ctx, it.desc || "", pad, y + 36, W * 0.55, 32, { maxLines: 2 });
        y += 16;
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "review": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "REVIEW").toUpperCase(), pad, 80);
      ctx.font = `900 60px ${FONT}`; ctx.fillStyle = fg;
      let y = 130;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 72, { maxLines: 2 });
      y += 40;
      (data.reviews || []).slice(0, 3).forEach((r, i) => {
        drawRect(ctx, pad, y, inner, 148, 12, isDark ? "rgba(255,255,255,0.05)" : "#fff", isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", 1);
        // 별
        for (let s = 0; s < 5; s++) {
          drawRect(ctx, pad + 24 + s * 22, y + 24, 14, 14, 2, cat.accent);
        }
        ctx.font = `400 italic 24px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)"; ctx.textBaseline = "top";
        drawTextBlock(ctx, r.text || "", pad + 24, y + 56, inner - 48, 34, { maxLines: 2 });
        ctx.font = `600 20px ${FONT}`; ctx.fillStyle = cat.accent;
        ctx.fillText(r.name || "", pad + 24, y + 116);
        y += 160;
      });
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "trust": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "TRUST").toUpperCase(), pad, 80);
      ctx.font = `900 60px ${FONT}`; ctx.fillStyle = fg;
      let y = 130;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 72, { maxLines: 2 });
      y += 48;
      const stats = (data.stats || []).slice(0, 3);
      const sw2 = Math.floor((inner - 48) / 3);
      stats.forEach((s, i) => {
        const sx = pad + i * (sw2 + 24);
        drawRect(ctx, sx, y, sw2, 200, 16, isDark ? "rgba(255,255,255,0.05)" : "#fff", isDark ? "rgba(255,255,255,0.1)" : hexToRgb(cat.accent, 0.12), 1.5);
        ctx.font = `900 56px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
        drawTextBlock(ctx, s.number || "", sx + 24, y + 36, sw2 - 48, 64, { maxLines: 1 });
        ctx.font = `600 22px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
        drawTextBlock(ctx, s.label || "", sx + 24, y + 120, sw2 - 48, 30, { maxLines: 2 });
      });
      if (data.certText) {
        ctx.font = `400 24px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)"; ctx.textBaseline = "top";
        drawTextBlock(ctx, data.certText, pad, y + 240, inner, 34, { maxLines: 2 });
      }
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "gallery": {
      drawBg(ctx, cat, isDark ? "dark" : "light");
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "GALLERY").toUpperCase(), pad, 80);
      ctx.font = `900 56px ${FONT}`; ctx.fillStyle = fg;
      drawTextBlock(ctx, data.headline || "", pad, 118, inner, 68, { maxLines: 1 });
      // 이미지 그리드 (최대 4장)
      const gridImgs = imgs.slice(0, 4).filter(Boolean);
      if (gridImgs.length === 1) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(pad, 210, inner, H - 310, 16); ctx.clip();
        ctx.drawImage(gridImgs[0], pad, 210, inner, H - 310); ctx.restore();
      } else if (gridImgs.length >= 2) {
        const gh = Math.floor((H - 340) / 2);
        const gw = Math.floor((inner - 16) / 2);
        gridImgs.forEach((img2, i) => {
          const gx = pad + (i % 2) * (gw + 16);
          const gy = 210 + Math.floor(i / 2) * (gh + 16);
          ctx.save(); ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 12); ctx.clip();
          ctx.drawImage(img2, gx, gy, gw, gh); ctx.restore();
        });
      }
      drawPageNum(ctx, num, total, cat, isDark);
      break;
    }

    case "event": {
      // 임팩트 있는 프로모션 슬라이드
      if (mainImg) {
        ctx.drawImage(mainImg, 0, 0, W, H);
        ctx.fillStyle = hexToRgb(cat.accent, 0.82); ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = cat.accent; ctx.fillRect(0, 0, W, H);
        // 대각선 패턴
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 2;
        for (let i = -H; i < W + H; i += 60) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
        }
      }
      // 큰 텍스트
      ctx.font = `800 26px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "SPECIAL OFFER").toUpperCase(), pad, 100);
      ctx.font = `900 96px ${FONT}`; ctx.fillStyle = "#fff";
      let y = 180;
      y = drawTextBlock(ctx, data.headline || "", pad, y, inner, 108, { maxLines: 2 });
      // 할인율 / 혜택 배지
      if (data.discount) {
        drawRect(ctx, pad, y + 32, 240, 72, 8, "#fff");
        ctx.font = `900 40px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "middle";
        ctx.fillText(data.discount, pad + 24, y + 68);
      }
      ctx.font = `500 32px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.textBaseline = "top";
      drawTextBlock(ctx, data.body || "", pad, y + 136, inner, 44, { maxLines: 3 });
      drawPageNum(ctx, num, total, cat, true);
      break;
    }

    case "cta": {
      if (mainImg) {
        ctx.drawImage(mainImg, 0, 0, W, H);
        const g3 = ctx.createLinearGradient(0, 0, 0, H);
        g3.addColorStop(0, "rgba(0,0,0,0.3)"); g3.addColorStop(1, "rgba(0,0,0,0.78)");
        ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
      } else {
        const g4 = ctx.createLinearGradient(0, 0, W, H);
        g4.addColorStop(0, cat.textDark); g4.addColorStop(1, hexToRgb(cat.accent, 0.9));
        ctx.fillStyle = g4; ctx.fillRect(0, 0, W, H);
      }
      // 중앙 정렬
      ctx.font = `700 24px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top"; ctx.textAlign = "center";
      ctx.fillText((data.sectionLabel || "SPECIAL OFFER").toUpperCase(), W/2, 120);
      ctx.font = `900 80px ${FONT}`; ctx.fillStyle = "#fff";
      let y = 200;
      // 가운데 정렬 텍스트
      const hlLines = wrapText(ctx, data.headline || "", inner);
      hlLines.slice(0, 2).forEach(l => {
        ctx.fillText(l, W/2, y); y += 92;
      });
      // 원래 가격
      if (data.originalPrice) {
        ctx.font = `400 28px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText(data.originalPrice, W/2, y + 16);
        // 취소선
        const ow = ctx.measureText(data.originalPrice).width;
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W/2 - ow/2, y + 31); ctx.lineTo(W/2 + ow/2, y + 31); ctx.stroke();
        y += 52;
      }
      // 가격
      ctx.font = `900 100px ${FONT}`; ctx.fillStyle = "#fff";
      ctx.fillText(data.price || "", W/2, y + 16); y += 116;
      // 할인 배지
      if (data.discount) {
        const dw = ctx.measureText(data.discount).width + 56;
        ctx.font = `800 30px ${FONT}`;
        drawRect(ctx, W/2 - dw/2, y, dw, 60, 6, "#fff");
        ctx.fillStyle = cat.accent; ctx.textBaseline = "middle";
        ctx.fillText(data.discount, W/2, y + 30);
        y += 80;
      }
      ctx.font = `500 26px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.textBaseline = "top";
      ctx.fillText(data.urgency || "", W/2, y + 12); y += 56;
      // CTA 버튼
      const ctaTxt = data.cta || "지금 구매하기";
      ctx.font = `900 34px ${FONT}`;
      const ctaW = ctx.measureText(ctaTxt).width + 96;
      drawRect(ctx, W/2 - ctaW/2, y, ctaW, 80, 8, "#fff");
      ctx.fillStyle = cat.accent; ctx.textBaseline = "middle";
      ctx.fillText(ctaTxt, W/2, y + 40);
      ctx.textAlign = "left";
      drawPageNum(ctx, num, total, cat, true);
      break;
    }

    default: {
      // 범용 슬라이드 (나머지 타입)
      drawBg(ctx, cat, isDark ? "dark" : "light");
      if (mainImg) {
        ctx.save(); ctx.beginPath(); ctx.roundRect(W/2 + 20, 80, W/2 - pad - 20, H - 200, 20); ctx.clip();
        ctx.drawImage(mainImg, W/2 + 20, 80, W/2 - pad - 20, H - 200); ctx.restore();
      }
      ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || type.toUpperCase()).toUpperCase(), pad, 80);
      drawRect(ctx, pad, 118, 48, 4, 2, cat.accent);
      ctx.font = `900 60px ${FONT}`; ctx.fillStyle = fg;
      let y = 148;
      y = drawTextBlock(ctx, data.headline || "", pad, y, W/2 - 40, 72, { maxLines: 2 });
      ctx.font = `400 26px ${FONT}`; ctx.fillStyle = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
      y += 24;
      drawTextBlock(ctx, data.body || "", pad, y, W/2 - 40, 38, { maxLines: 6 });
      drawPageNum(ctx, num, total, cat, isDark);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// AI 생성 (JSON)
// ══════════════════════════════════════════════════════════════
async function generateContent({ category, productName, features, price, cta, target, extra, pageCount, refStyle }) {
  const cat = CATEGORIES.find(c => c.key === category);
  const types = SLIDE_TYPES.slice(0, pageCount);

  const schemas = {
    hero:        `{"id":"hero","badge":"배지(10자)","headline":"헤드라인(14자)","subheadline":"서브(20자)","body":"소개(36자)"}`,
    intro:       `{"id":"intro","sectionLabel":"BRAND","headline":"헤드라인(16자)","body":"본문(60자)"}`,
    feature:     `{"id":"feature","sectionLabel":"FEATURES","headline":"헤드라인(16자)","features":[{"title":"특징(8자)","desc":"설명(22자)"},{"title":"","desc":""},{"title":"","desc":""}]}`,
    detail1:     `{"id":"detail1","sectionLabel":"DETAIL","headline":"헤드라인(18자)","body":"본문(60자)"}`,
    detail2:     `{"id":"detail2","sectionLabel":"SPEC","headline":"헤드라인(14자)","specs":[{"label":"항목","value":"값"},{"label":"","value":""},{"label":"","value":""},{"label":"","value":""}]}`,
    comparison:  `{"id":"comparison","sectionLabel":"WHY US","headline":"헤드라인(14자)","before":"기존문제(28자)","after":"해결책(28자)","points":["차별점1(18자)","차별점2","차별점3"]}`,
    howto:       `{"id":"howto","sectionLabel":"HOW TO USE","headline":"헤드라인(14자)","steps":[{"num":"01","title":"단계(8자)","desc":"설명(22자)"},{"num":"02","title":"","desc":""},{"num":"03","title":"","desc":""}]}`,
    ingredient:  `{"id":"ingredient","sectionLabel":"INGREDIENT","headline":"헤드라인(14자)","items":[{"name":"성분(10자)","desc":"설명(28자)"},{"name":"","desc":""},{"name":"","desc":""},{"name":"","desc":""}]}`,
    quality:     `{"id":"quality","sectionLabel":"QUALITY","headline":"헤드라인(14자)","body":"인증 설명(60자)","points":["인증1(18자)","인증2","인증3"]}`,
    review:      `{"id":"review","sectionLabel":"REVIEW","headline":"헤드라인(14자)","reviews":[{"text":"후기(36자)","name":"구매자명"},{"text":"","name":""},{"text":"","name":""}]}`,
    trust:       `{"id":"trust","sectionLabel":"TRUST","headline":"헤드라인(14자)","stats":[{"number":"수치","label":"지표"},{"number":"","label":""},{"number":"","label":""}],"certText":"인증내용(30자)"}`,
    faq:         `{"id":"faq","sectionLabel":"FAQ","headline":"헤드라인(14자)","faqs":[{"q":"질문(20자)","a":"답변(40자)"},{"q":"","a":""},{"q":"","a":""}]}`,
    gallery:     `{"id":"gallery","sectionLabel":"GALLERY","headline":"헤드라인(14자)"}`,
    package:     `{"id":"package","sectionLabel":"PACKAGE","headline":"구성품 헤드라인(14자)","items":[{"name":"구성품명(10자)","desc":"설명(20자)"},{"name":"","desc":""},{"name":"","desc":""}]}`,
    delivery:    `{"id":"delivery","sectionLabel":"DELIVERY","headline":"배송 헤드라인(14자)","points":["배송정보1(24자)","배송정보2","배송정보3"]}`,
    event:       `{"id":"event","sectionLabel":"EVENT","headline":"이벤트 헤드라인(14자)","discount":"할인율/혜택","body":"이벤트 내용(50자)"}`,
    size:        `{"id":"size","sectionLabel":"SIZE GUIDE","headline":"사이즈 헤드라인(14자)","body":"사이즈 안내(60자)"}`,
    story:       `{"id":"story","sectionLabel":"BRAND STORY","headline":"브랜드 헤드라인(14자)","body":"브랜드 스토리(80자)"}`,
    warning:     `{"id":"warning","sectionLabel":"CAUTION","headline":"주의사항 헤드라인(14자)","points":["주의1(24자)","주의2","주의3"]}`,
    cta:         `{"id":"cta","sectionLabel":"ORDER NOW","headline":"마지막어필(14자)","price":"${price||""}","originalPrice":"정가","discount":"할인혜택","cta":"${cta||"지금 구매하기"}","urgency":"긴박감(14자)"}`,
  };

  const slideList = types.map((t,i) => `${i+1}. ${t.id}`).join(", ");
  const schemaList = types.map(t => schemas[t.id] || `{"id":"${t.id}","sectionLabel":"${t.label.toUpperCase()}","headline":"","body":""}`).join(",\n");

  const prompt = `한국 쇼핑몰 상세페이지 카피라이터.
상품: ${productName} / 카테고리: ${cat.label}
특징: ${features} / 가격: ${price||"미정"} / 타겟: ${target||"일반"} / CTA: ${cta||"지금 구매하기"}
추가: ${extra||"없음"}
${refStyle ? `참고 스타일:\n${refStyle}` : ""}

슬라이드 ${pageCount}장: ${slideList}

JSON만 응답:
{"slides":[${schemaList}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, messages:[{ role:"user", content:prompt }] }),
  });
  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(clean); }
  catch { throw new Error("파싱 실패: "+txt.slice(0,200)); }
}

async function analyzeRefImage(base64, mimeType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:600,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:mimeType, data:base64 } },
        { type:"text", text:"이 상세페이지 이미지의 디자인 스타일을 분석해주세요. 색상 팔레트, 레이아웃 구조, 폰트 스타일, 전체 무드와 톤을 150자 이내로 간결하게 설명. 한국어로 답변." }
      ]}]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function getAiSuggestions(category, form, API_KEY_) {
  const cat = CATEGORIES.find(c => c.key === category);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY_,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:600,
      messages:[{ role:"user", content:`카테고리: ${cat.label}\n현재 입력: 상품명="${form.productName}", 특징="${form.features}", 가격="${form.price}"\n\nJSON만 응답:\n{"productNames":["추천1(14자)","추천2","추천3"],"ctas":["CTA1(10자)","CTA2","CTA3"],"targets":["타겟1(22자)","타겟2"],"extras":["추가정보1(28자)","추가정보2"]}` }]
    }),
  });
  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  return JSON.parse(clean);
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark }) {
  const [step,       setStep]       = useState(1);
  const [selCat,     setSelCat]     = useState(null);
  const [images,     setImages]     = useState([]);
  const [refImg,     setRefImg]     = useState(null);
  const [refStyle,   setRefStyle]   = useState("");
  const [analyzing,  setAnalyzing]  = useState(false);
  const [pageCount,  setPageCount]  = useState(5);
  const [form,       setForm]       = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [slideStyle, setSlideStyle] = useState("light"); // light | dark
  const [slides,     setSlides]     = useState(null);
  const [rendered,   setRendered]   = useState([]); // base64 PNG array
  const [loading,    setLoading]    = useState(false);
  const [rendering,  setRendering]  = useState(false);
  const [renderProg, setRenderProg] = useState(0);
  const [err,        setErr]        = useState("");
  const [curIdx,     setCurIdx]     = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [aiSugg,     setAiSugg]     = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const fileRef    = useRef(null);
  const refFileRef = useRef(null);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];

  const handleImages = (files) => {
    const arr = Array.from(files).slice(0, 10);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader(); r.onload = e => res({ name:f.name, dataUrl:e.target.result }); r.readAsDataURL(f);
    }))).then(imgs => setImages(p => [...p, ...imgs].slice(0, 10)));
  };

  const handleRefImg = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      setRefImg(e.target.result); setAnalyzing(true);
      try {
        const b64 = e.target.result.split(",")[1];
        const mime = e.target.result.split(":")[1].split(";")[0];
        setRefStyle(await analyzeRefImage(b64, mime));
      } catch { setRefStyle("분석 실패"); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  // 슬라이드 이미지 렌더링 (Canvas → base64 PNG)
  const renderSlides = useCallback(async (slidesData) => {
    setRendering(true); setRenderProg(0);
    const results = [];
    const productImgUrls = images.map(i => i.dataUrl);
    for (let i = 0; i < slidesData.length; i++) {
      setRenderProg(Math.round((i / slidesData.length) * 100));
      const s = slidesData[i];
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      // 이 슬라이드에 사용할 이미지들 (순환)
      const imgCount = productImgUrls.length;
      const sliceStart = imgCount > 0 ? i % imgCount : 0;
      const imgs2 = imgCount > 0 ? [
        productImgUrls[sliceStart],
        productImgUrls[(sliceStart + 1) % imgCount],
      ].filter(Boolean) : [];
      await drawSlide(canvas, s.id, s, cat, imgs2, i + 1, slidesData.length, slideStyle);
      results.push(canvas.toDataURL("image/png"));
      await new Promise(r => setTimeout(r, 10)); // UI 업데이트 기회
    }
    setRenderProg(100);
    setRendered(results);
    setRendering(false);
    return results;
  }, [images, cat, slideStyle]);

  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true);
    try {
      const data = await generateContent({ category:selCat, ...form, pageCount, refStyle });
      const slidesData = data.slides || [];
      setSlides(slidesData);
      setStep(3); setCurIdx(0);
      // 즉시 렌더링
      await renderSlides(slidesData);
    } catch(e) { setErr("생성 실패: "+e.message); }
    finally    { setLoading(false); }
  };

  // 스타일 변경 시 재렌더
  useEffect(() => {
    if (slides && slides.length > 0 && step === 3) { renderSlides(slides); }
  }, [slideStyle]);

  const saveCurrent = () => {
    if (!rendered[curIdx]) return;
    const a = document.createElement("a");
    a.href = rendered[curIdx];
    a.download = `${form.productName||"slide"}_${String(curIdx+1).padStart(2,"0")}.png`;
    a.click();
  };

  const saveAll = async () => {
    if (!rendered.length) return;
    setSaving(true);
    if (!window.JSZip) {
      await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    const zip = new window.JSZip();
    rendered.forEach((png, i) => {
      const b64 = png.split(",")[1];
      const arr = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      zip.file(`${String(i+1).padStart(2,"0")}_${SLIDE_TYPES[i]?.label||"slide"}.png`, arr);
    });
    const blob = await zip.generateAsync({ type:"blob", compression:"DEFLATE" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${form.productName||"detail"}_slides.zip`;
    a.click();
    setSaving(false);
  };

  const getSuggestions = async () => {
    setSuggesting(true); setAiSugg(null);
    try { setAiSugg(await getAiSuggestions(selCat, form, API_KEY)); }
    catch(e) { console.error(e); }
    setSuggesting(false);
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── Step 1 카테고리 ─────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>상세페이지 생성기</div>
        <div style={{ fontSize:13, color:muted }}>카테고리 선택 → 정보 입력 → Canvas로 이미지 직접 생성 (PNG 저장)</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:10 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={()=>{ setSelCat(c.key); setStep(2); }}
            style={{ padding:"24px 18px", borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.accent; e.currentTarget.style.boxShadow=`0 4px 16px ${c.accent}25`; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=bdr; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
            <div style={{ fontSize:11, fontWeight:800, color:c.accent, letterSpacing:2.5, marginBottom:12 }}>{c.label.toUpperCase()}</div>
            <div style={{ width:32, height:3, background:c.accent, borderRadius:2 }} />
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2 입력 ─────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 24px 60px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
        <button onClick={()=>setStep(1)} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 카테고리</button>
        <span style={{ fontSize:16, fontWeight:800, color:text }}>{cat.label} 상세페이지</span>
        <div style={{ width:28, height:3, background:cat.accent, borderRadius:1 }} />
      </div>

      <div style={{ display:"grid", gap:14 }}>

        {/* 슬라이드 수 */}
        <div style={{ padding:"16px 20px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>
                {SLIDE_TYPES.slice(0, pageCount).map(t=>t.label).join(" · ")}
              </div>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:cat.accent }}>{pageCount}장</div>
          </div>
          <input type="range" min={3} max={20} value={pageCount} onChange={e=>setPageCount(Number(e.target.value))} style={{ width:"100%", accentColor:cat.accent }} />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:4 }}>
            <span>3장</span><span>20장</span>
          </div>
        </div>

        {/* 슬라이드 스타일 */}
        <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:10 }}>슬라이드 스타일</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["light","라이트 (밝은 배경)"],["dark","다크 (어두운 배경)"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSlideStyle(v)}
                style={{ flex:1, padding:"9px", borderRadius:9, border:`1.5px solid ${slideStyle===v?cat.accent:bdr}`, background: slideStyle===v?`${cat.accent}12`:cardBg, color: slideStyle===v?cat.accent:muted, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* 상품 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>
            상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(최대 10장 — 슬라이드별 자동 배치)</span>
          </div>
          <div onClick={()=>fileRef.current?.click()} onDrop={e=>{e.preventDefault();handleImages(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()}
            style={{ border:`1.5px dashed ${images.length?cat.accent:bdr}`, borderRadius:12, padding:images.length?"14px":"24px", cursor:"pointer", background:images.length?`${cat.accent}06`:cardBg, transition:"all 0.12s" }}>
            {images.length ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {images.map((img,i)=>(
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.dataUrl} alt="" style={{ width:60,height:60,objectFit:"cover",borderRadius:8,display:"block" }}/>
                    <button onClick={e=>{e.stopPropagation();setImages(p=>p.filter((_,j)=>j!==i));}}
                      style={{ position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                  </div>
                ))}
                {images.length<10 && <div style={{ width:60,height:60,borderRadius:8,border:`1.5px dashed ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:muted }}>+</div>}
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:12, fontWeight:600, color:text, marginBottom:3 }}>클릭 또는 드래그</div>
                <div style={{ fontSize:11, color:muted }}>JPG, PNG (최대 10장)</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handleImages(e.target.files);e.target.value="";}}/>
        </div>

        {/* 참고 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>참고 이미지 <span style={{ color:muted, fontWeight:400 }}>(선택)</span></div>
          <div style={{ fontSize:11, color:muted, marginBottom:8 }}>마음에 드는 상세페이지 이미지를 올리면 AI가 스타일을 분석해 문구 톤에 반영해요</div>
          <div onClick={()=>refFileRef.current?.click()} style={{ border:`1.5px dashed ${refImg?cat.accent:bdr}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", gap:12, alignItems:"center", background:cardBg }}>
            {refImg ? (
              <>
                <img src={refImg} alt="" style={{ width:64,height:64,objectFit:"cover",borderRadius:8,flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  {analyzing ? <div style={{ fontSize:12,color:muted }}>스타일 분석 중...</div>
                  : refStyle ? <><div style={{ fontSize:11,fontWeight:700,color:cat.accent,marginBottom:3 }}>분석 완료</div><div style={{ fontSize:11,color:muted,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical" }}>{refStyle}</div></>
                  : null}
                </div>
                <button onClick={e=>{e.stopPropagation();setRefImg(null);setRefStyle("");}} style={{ padding:"4px 10px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",flexShrink:0 }}>제거</button>
              </>
            ) : <div style={{ fontSize:12,color:muted }}>참고 이미지 업로드 (선택)</div>}
          </div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{handleRefImg(e.target.files[0]);e.target.value="";}}/>
        </div>

        {/* 텍스트 입력 */}
        {[
          { key:"productName", label:"상품명 *",    ph:"예: 프리미엄 한우 1++ 등심 선물 세트" },
          { key:"features",    label:"핵심 특징 *", ph:"예: 1++ 등급, 냉장 당일 배송, 고급 포장", textarea:true },
          { key:"price",       label:"가격",         ph:"예: 89,000원" },
          { key:"cta",         label:"CTA 문구",     ph:"예: 지금 주문하기" },
          { key:"target",      label:"타겟 고객",    ph:"예: 특별한 날 선물을 찾는 3040" },
          { key:"extra",       label:"추가 정보",    ph:"예: 수상 이력, 원산지, 보관 방법", textarea:true },
        ].map(({ key, label, ph, textarea }) => (
          <div key={key}>
            <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:6 }}>{label}</div>
            {textarea
              ? <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ ...inputStyle,resize:"vertical",lineHeight:1.7 }}/>
              : <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inputStyle}/>}
          </div>
        ))}

        {/* AI 추천 */}
        <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: aiSugg?14:0 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:text }}>AI 추천</div>
              <div style={{ fontSize:11,color:muted,marginTop:2 }}>입력값 기반으로 문구 추천</div>
            </div>
            <button onClick={getSuggestions} disabled={suggesting} style={{ padding:"8px 16px",borderRadius:8,border:"none",cursor:suggesting?"wait":"pointer",background:`${cat.accent}18`,color:cat.accent,fontSize:12,fontWeight:800,opacity:suggesting?0.6:1 }}>
              {suggesting?"추천 중...":"AI 추천 받기"}
            </button>
          </div>
          {aiSugg && (
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {[
                { key:"productName", items:aiSugg.productNames, label:"상품명" },
                { key:"cta",         items:aiSugg.ctas,          label:"CTA 문구" },
                { key:"target",      items:aiSugg.targets,        label:"타겟 고객" },
                { key:"extra",       items:aiSugg.extras,         label:"추가 정보" },
              ].filter(r=>r.items?.length>0).map(({ key, items, label })=>(
                <div key={key}>
                  <div style={{ fontSize:10,fontWeight:700,color:muted,letterSpacing:1,marginBottom:6 }}>{label}</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {items.map((v,i)=>(
                      <button key={i} onClick={()=>setForm(p=>({...p,[key]:v}))}
                        style={{ padding:"5px 12px",borderRadius:6,border:`1px solid ${cat.accent}35`,background:`${cat.accent}08`,color:text,fontSize:12,cursor:"pointer" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize:10,color:muted }}>클릭하면 입력란에 자동 적용</div>
            </div>
          )}
        </div>

        {err && <div style={{ padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",fontSize:12,color:"#f87171" }}>{err}</div>}

        <button onClick={generate} disabled={loading||analyzing}
          style={{ padding:"14px",borderRadius:12,border:"none",cursor:loading?"wait":"pointer",background:loading?`${cat.accent}55`:cat.accent,color:"#fff",fontSize:15,fontWeight:900,opacity:loading||analyzing?0.7:1 }}>
          {loading?"AI가 이미지를 생성하는 중...": `${cat.label} 상세페이지 ${pageCount}장 이미지 생성`}
        </button>
      </div>
    </div>
  );

  // ── Step 3 결과 ─────────────────────────────────────────────
  if (step === 3) {
    const currentPng = rendered[curIdx];
    const slideTypes = SLIDE_TYPES.slice(0, slides?.length || 0);

    return (
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"20px 20px 60px" }}>
        {/* 상단 바 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <button onClick={()=>setStep(2)} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>← 수정</button>
            <button onClick={()=>{ setStep(1);setSlides(null);setRendered([]);setImages([]);setRefImg(null);setRefStyle(""); setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""}); }}
              style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>새로 만들기</button>
            {/* 스타일 토글 */}
            <button onClick={()=>setSlideStyle(p=>p==="light"?"dark":"light")}
              style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>
              {slideStyle==="light"?"다크 모드로":"라이트 모드로"}
            </button>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={()=>setCurIdx(Math.max(0,curIdx-1))} disabled={curIdx===0}
              style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===0?"not-allowed":"pointer",opacity:curIdx===0?0.3:1,fontSize:18 }}>‹</button>
            <span style={{ fontSize:12,color:muted,minWidth:44,textAlign:"center" }}>{curIdx+1} / {slides?.length||0}</span>
            <button onClick={()=>setCurIdx(Math.min((slides?.length||1)-1,curIdx+1))} disabled={curIdx===(slides?.length||1)-1}
              style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===(slides?.length||1)-1?"not-allowed":"pointer",opacity:curIdx===(slides?.length||1)-1?0.3:1,fontSize:18 }}>›</button>
          </div>
        </div>

        {/* 렌더링 진행바 */}
        {rendering && (
          <div style={{ marginBottom:12, padding:"12px 16px", borderRadius:10, background:cardBg, border:`1px solid ${bdr}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:muted, marginBottom:8 }}>
              <span>이미지 생성 중...</span><span>{renderProg}%</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:isDark?"rgba(255,255,255,0.1)":"#e0e0e0" }}>
              <div style={{ height:"100%", borderRadius:2, background:cat.accent, width:`${renderProg}%`, transition:"width 0.3s" }}/>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
          {/* 메인 이미지 */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:800, color:cat.accent, letterSpacing:2, marginBottom:8 }}>
              {slideTypes[curIdx]?.label?.toUpperCase()}
            </div>
            <div style={{ width:"100%", aspectRatio:"1/1", borderRadius:16, overflow:"hidden", boxShadow:"0 12px 48px rgba(0,0,0,0.25)", background:isDark?"#111":"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {currentPng ? (
                <img src={currentPng} alt="slide" style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}/>
              ) : rendering ? (
                <div style={{ fontSize:13, color:muted }}>렌더링 중...</div>
              ) : (
                <div style={{ fontSize:13, color:muted }}>이미지 없음</div>
              )}
            </div>
            {/* 저장 버튼 */}
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={saveCurrent} disabled={!currentPng||rendering}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:currentPng&&!rendering?"pointer":"not-allowed", background:cat.accent, color:"#fff", fontSize:13, fontWeight:800, opacity:currentPng&&!rendering?1:0.5 }}>
                현재 이미지 저장
              </button>
              <button onClick={saveAll} disabled={!rendered.length||rendering||saving}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:rendered.length&&!rendering?"pointer":"not-allowed", background:isDark?"rgba(255,255,255,0.12)":"#2c2c2c", color:"#fff", fontSize:13, fontWeight:800, opacity:rendered.length&&!rendering?1:0.5 }}>
                {saving?"ZIP 저장 중...":"전체 ZIP 저장"}
              </button>
            </div>
          </div>

          {/* 섬네일 */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
            {(slides||[]).map((s,i)=>(
              <div key={i} onClick={()=>setCurIdx(i)}
                style={{ cursor:"pointer", borderRadius:9, overflow:"hidden", border:i===curIdx?`2.5px solid ${cat.accent}`:`2.5px solid transparent`, transition:"all 0.12s", width:100 }}>
                {rendered[i] ? (
                  <img src={rendered[i]} alt="" style={{ width:100, height:100, display:"block", objectFit:"cover" }}/>
                ) : (
                  <div style={{ width:100, height:100, background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ fontSize:10, color:muted }}>...</div>
                  </div>
                )}
                <div style={{ fontSize:9, color:i===curIdx?cat.accent:muted, textAlign:"center", padding:"3px 0", fontWeight:i===curIdx?800:400, background:isDark?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.9)" }}>
                  {slideTypes[i]?.label}
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
