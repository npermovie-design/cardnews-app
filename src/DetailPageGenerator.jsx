import { useState, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 만들기 v5
   - Gemini Imagen 3으로 각 슬라이드 배경 이미지 AI 생성
   - 참고 이미지 스타일 → 프롬프트 반영
   - Canvas로 텍스트/레이아웃 합성 → 완성 PNG
   - 최대 20장, ZIP 저장
══════════════════════════════════════════════════════════════ */

const CLAUDE_KEY = "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";
const W = 1080, H = 1080;
const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", bg:"#fff8f5", promptHint:"food photography, restaurant, appetizing" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", bg:"#f9f9f9", promptHint:"fashion, clothing, minimal lifestyle" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", bg:"#fff5f8", promptHint:"beauty, cosmetics, skincare, elegant" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", bg:"#f5f8ff", promptHint:"technology, electronics, modern, sleek" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", bg:"#fdf8f3", promptHint:"interior design, furniture, cozy home" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", bg:"#f5fcf5", promptHint:"health, wellness, nature, fresh" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", bg:"#fffbf0", promptHint:"pet, animal, cute, warm" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", bg:"#f8f5ff", promptHint:"professional service, education, clean office" },
];

// ── 슬라이드 타입 20종 ────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"hero",       label:"메인 히어로",    bgStyle:"fullbleed"  },
  { id:"intro",      label:"브랜드 소개",    bgStyle:"split"      },
  { id:"feature",    label:"핵심 특징",      bgStyle:"light"      },
  { id:"detail1",    label:"상세 설명 1",    bgStyle:"topimg"     },
  { id:"detail2",    label:"상세 설명 2",    bgStyle:"split"      },
  { id:"comparison", label:"비교/장점",      bgStyle:"light"      },
  { id:"howto",      label:"사용 방법",      bgStyle:"light"      },
  { id:"ingredient", label:"구성/성분",      bgStyle:"split"      },
  { id:"quality",    label:"품질 인증",      bgStyle:"split"      },
  { id:"review",     label:"고객 후기",      bgStyle:"light"      },
  { id:"trust",      label:"신뢰 지표",      bgStyle:"light"      },
  { id:"faq",        label:"자주 묻는 질문", bgStyle:"light"      },
  { id:"gallery",    label:"상품 갤러리",    bgStyle:"fullbleed"  },
  { id:"package",    label:"구성품 안내",    bgStyle:"light"      },
  { id:"delivery",   label:"배송/교환 안내", bgStyle:"light"      },
  { id:"event",      label:"이벤트/혜택",    bgStyle:"dark"       },
  { id:"size",       label:"사이즈 가이드",  bgStyle:"light"      },
  { id:"story",      label:"브랜드 스토리",  bgStyle:"split"      },
  { id:"warning",    label:"주의사항",       bgStyle:"light"      },
  { id:"cta",        label:"구매 유도",      bgStyle:"dark"       },
];

// ══════════════════════════════════════════════════════════════
// Imagen 프롬프트 생성
// ══════════════════════════════════════════════════════════════
function buildImagePrompt(slideType, cat, productName, refStyleDesc, productImageB64) {
  const bgStyle = SLIDE_TYPES.find(s => s.id === slideType)?.bgStyle || "light";
  const styleBase = refStyleDesc
    ? `Style reference: ${refStyleDesc}.`
    : `Korean e-commerce product page style.`;

  const bgMap = {
    fullbleed: "full background product photography, dramatic lighting",
    split:     "clean background on one side, product on the other",
    topimg:    "top half product photo, bottom half clean white",
    light:     "clean minimal background, subtle texture, professional",
    dark:      "dark moody background, dramatic lighting",
  };

  const prompt = [
    `${cat.promptHint}, ${productName} product detail page background,`,
    bgMap[bgStyle] || bgMap.light,
    styleBase,
    `High-end Korean shopping mall style, ${slideType} section,`,
    "professional product photography, no text, no watermark,",
    "commercial photography, editorial quality, 1:1 square format.",
  ].join(" ");

  return prompt;
}

// ══════════════════════════════════════════════════════════════
// Canvas 텍스트 합성 유틸
// ══════════════════════════════════════════════════════════════
function wrapText(ctx, text, maxW) {
  if (!text) return [""];
  const lines = [];
  for (const para of (text || "").split("\n")) {
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

function drawText(ctx, text, x, y, maxW, lineH, opts = {}) {
  const { align = "left", alpha = 1, maxLines = 99 } = opts;
  ctx.globalAlpha = alpha;
  const lines = wrapText(ctx, text, maxW).slice(0, maxLines);
  for (const line of lines) {
    const lw = ctx.measureText(line).width;
    const dx = align === "center" ? x + (maxW - lw) / 2 : align === "right" ? x + maxW - lw : x;
    ctx.fillText(line, dx, y); y += lineH;
  }
  ctx.globalAlpha = 1; return y;
}

function rect(ctx, x, y, w, h, r, fill, stroke, sw = 1) {
  ctx.beginPath();
  r > 0 ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  if (fill)  { ctx.fillStyle   = fill;   ctx.fill(); }
  if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
}

function hexRgba(hex, a = 1) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

async function loadImg(src) {
  if (!src) return null;
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = () => res(null); img.src = src;
  });
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 Canvas 합성 (배경 이미지 + 텍스트)
// ══════════════════════════════════════════════════════════════
async function compositeSlide(canvas, slideType, data, cat, bgImageSrc, productImgSrc) {
  const ctx = canvas.getContext("2d");
  canvas.width = W; canvas.height = H;
  const pad = 80, inner = W - pad * 2;
  const bgImg = await loadImg(bgImageSrc);
  const prodImg = await loadImg(productImgSrc);
  const bgStyle = SLIDE_TYPES.find(s => s.id === slideType)?.bgStyle || "light";

  // ── 배경 렌더 ──────────────────────────────────────────────
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
    // fallback 그라데이션
    const g = ctx.createLinearGradient(0, 0, W, H);
    if (bgStyle === "dark") {
      g.addColorStop(0, "#1a1a2e"); g.addColorStop(1, hexRgba(cat.accent, 0.6));
    } else {
      g.addColorStop(0, cat.bg); g.addColorStop(1, "#ffffff");
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const isDark = bgStyle === "dark" || bgStyle === "fullbleed";

  // 오버레이 (가독성)
  if (bgStyle === "fullbleed") {
    const ol = ctx.createLinearGradient(0, H * 0.3, 0, H);
    ol.addColorStop(0, "rgba(0,0,0,0)"); ol.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = ol; ctx.fillRect(0, 0, W, H);
  } else if (bgStyle === "dark") {
    ctx.fillStyle = "rgba(0,0,0,0.52)"; ctx.fillRect(0, 0, W, H);
  } else if (bgStyle === "light" || bgStyle === "topimg") {
    ctx.fillStyle = "rgba(255,255,255,0.42)"; ctx.fillRect(0, 0, W, H);
  } else if (bgStyle === "split") {
    // 우측 절반만 이미지, 좌측은 흰색 오버레이
    const g2 = ctx.createLinearGradient(0, 0, W * 0.6, 0);
    g2.addColorStop(0, "rgba(255,255,255,0.9)"); g2.addColorStop(0.55, "rgba(255,255,255,0.55)"); g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }

  // 상품 이미지 (스플릿 레이아웃용)
  if (prodImg && (bgStyle === "split" || bgStyle === "topimg")) {
    if (bgStyle === "split") {
      ctx.save(); ctx.beginPath(); ctx.roundRect(W * 0.54, 100, W * 0.42, H - 200, 20); ctx.clip();
      ctx.drawImage(prodImg, W * 0.54, 100, W * 0.42, H - 200); ctx.restore();
    } else if (bgStyle === "topimg") {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * 0.48); ctx.clip();
      ctx.drawImage(prodImg, 0, 0, W, H * 0.48); ctx.restore();
      const fade = ctx.createLinearGradient(0, H * 0.38, 0, H * 0.5);
      fade.addColorStop(0, "rgba(255,255,255,0)"); fade.addColorStop(1, "rgba(255,255,255,0.95)");
      ctx.fillStyle = fade; ctx.fillRect(0, H * 0.38, W, H * 0.14);
    }
  }

  const fg = isDark || bgStyle === "fullbleed" ? "#ffffff" : "#1a1a1a";
  const fgSub = isDark || bgStyle === "fullbleed" ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.55)";
  const textZone = bgStyle === "split" ? W * 0.5 - pad - 20
                 : bgStyle === "topimg" ? inner
                 : inner;
  const yStart = bgStyle === "fullbleed" ? H * 0.44
               : bgStyle === "topimg"    ? H * 0.52
               : bgStyle === "split"     ? 110
               : 90;

  // ── 공통 헤더 ──────────────────────────────────────────────
  function drawHeader(sectionLabel, headline, y0) {
    ctx.font = `800 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
    ctx.fillText((sectionLabel || "").toUpperCase(), pad, y0);
    rect(ctx, pad, y0 + 38, 44, 4, 2, cat.accent);
    ctx.font = `900 ${bgStyle === "fullbleed" ? 80 : 58}px ${FONT}`; ctx.fillStyle = fg;
    return drawText(ctx, headline || "", pad, y0 + 60, textZone, 68, { maxLines: 2 });
  }

  function drawPageNum(num, total) {
    const col = isDark || bgStyle === "fullbleed" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
    ctx.font = `700 24px ${FONT}`; ctx.fillStyle = col; ctx.textBaseline = "bottom"; ctx.textAlign = "right";
    ctx.fillText(`${String(num).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, W - pad, H - 52);
    ctx.textAlign = "left";
    rect(ctx, pad, H - 60, 44, 3, 2, hexRgba(cat.accent, isDark || bgStyle==="fullbleed" ? 0.6 : 1));
  }

  const num = data._num || 1, total = data._total || 1;

  // ── 슬라이드별 렌더 ────────────────────────────────────────
  switch (slideType) {

    case "hero": {
      if (data.badge) {
        ctx.font = `800 24px ${FONT}`;
        const bw = ctx.measureText(data.badge).width + 40;
        rect(ctx, pad, H * 0.44 - 60, bw, 44, 4, cat.accent);
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(data.badge, pad + 20, H * 0.44 - 38);
      }
      ctx.font = `900 88px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textBaseline = "top";
      let y = H * 0.44;
      y = drawText(ctx, data.headline || "", pad, y, inner, 100, { maxLines: 2 });
      ctx.font = `500 36px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.82)";
      y += 18; drawText(ctx, data.subheadline || "", pad, y, inner, 50, { maxLines: 2 });
      break;
    }

    case "cta": {
      ctx.textAlign = "center";
      ctx.font = `700 24px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "ORDER NOW").toUpperCase(), W/2, 100);
      ctx.font = `900 78px ${FONT}`; ctx.fillStyle = "#fff";
      let y = 180;
      const hl = wrapText(ctx, data.headline || "", inner);
      hl.slice(0, 2).forEach(l => { ctx.fillText(l, W/2, y); y += 92; });
      if (data.originalPrice) {
        ctx.font = `400 30px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillText(data.originalPrice, W/2, y + 10);
        const ow = ctx.measureText(data.originalPrice).width;
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W/2-ow/2, y+27); ctx.lineTo(W/2+ow/2, y+27); ctx.stroke();
        y += 56;
      }
      ctx.font = `900 104px ${FONT}`; ctx.fillStyle = "#fff"; ctx.fillText(data.price || "", W/2, y + 10); y += 120;
      if (data.discount) {
        ctx.font = `800 28px ${FONT}`;
        const dw = ctx.measureText(data.discount).width + 56;
        rect(ctx, W/2-dw/2, y, dw, 58, 6, "#fff");
        ctx.fillStyle = cat.accent; ctx.textBaseline = "middle"; ctx.fillText(data.discount, W/2, y + 29); y += 78;
      }
      ctx.font = `500 26px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
      ctx.fillText(data.urgency || "", W/2, y + 10); y += 56;
      const ctaW = ctx.measureText(data.cta || "지금 구매하기").width + 96;
      ctx.font = `900 34px ${FONT}`;
      rect(ctx, W/2-ctaW/2, y, ctaW, 80, 8, "#fff");
      ctx.fillStyle = cat.accent; ctx.textBaseline = "middle"; ctx.fillText(data.cta || "지금 구매하기", W/2, y + 40);
      ctx.textAlign = "left";
      break;
    }

    case "event": {
      ctx.font = `800 26px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.textBaseline = "top";
      ctx.fillText((data.sectionLabel || "EVENT").toUpperCase(), pad, 100);
      ctx.font = `900 88px ${FONT}`; ctx.fillStyle = "#fff";
      let y = 180;
      y = drawText(ctx, data.headline || "", pad, y, inner, 100, { maxLines: 2 });
      if (data.discount) {
        ctx.font = `800 44px ${FONT}`;
        const dw = ctx.measureText(data.discount).width + 48;
        rect(ctx, pad, y + 24, dw, 80, 6, "#fff");
        ctx.fillStyle = cat.accent; ctx.textBaseline = "middle"; ctx.fillText(data.discount, pad + 24, y + 64); y += 120;
      }
      ctx.font = `500 30px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textBaseline = "top";
      drawText(ctx, data.body || "", pad, y + 8, inner, 44, { maxLines: 3 });
      break;
    }

    case "feature": {
      let y = drawHeader(data.sectionLabel || "FEATURES", data.headline, yStart) + 40;
      const feats = (data.features || []).slice(0, 3);
      const fw = Math.floor((textZone - 40) / 3);
      feats.forEach((f, i) => {
        const fx = pad + i * (fw + 20), fy = y;
        rect(ctx, fx, fy, fw, 300, 16, "rgba(255,255,255,0.88)", hexRgba(cat.accent, 0.15), 1.5);
        // 번호
        ctx.font = `900 52px ${FONT}`; ctx.fillStyle = hexRgba(cat.accent, 0.18); ctx.textBaseline = "top";
        ctx.fillText(`0${i+1}`, fx + 22, fy + 20);
        rect(ctx, fx + 22, fy + 88, 32, 3, 2, cat.accent);
        ctx.font = `800 28px ${FONT}`; ctx.fillStyle = "#1a1a1a";
        drawText(ctx, f.title || "", fx + 22, fy + 110, fw - 44, 36, { maxLines: 2 });
        ctx.font = `400 21px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.55)";
        drawText(ctx, f.desc || "", fx + 22, fy + 188, fw - 44, 30, { maxLines: 3 });
      });
      break;
    }

    case "review": {
      let y = drawHeader(data.sectionLabel || "REVIEW", data.headline, yStart) + 36;
      (data.reviews || []).slice(0, 3).forEach(r => {
        rect(ctx, pad, y, inner, 152, 12, "rgba(255,255,255,0.9)", "rgba(0,0,0,0.07)", 1);
        for (let s = 0; s < 5; s++) rect(ctx, pad + 24 + s * 22, y + 22, 14, 14, 2, cat.accent);
        ctx.font = `italic 400 24px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.textBaseline = "top";
        drawText(ctx, r.text || "", pad + 24, y + 54, inner - 48, 34, { maxLines: 2 });
        ctx.font = `600 20px ${FONT}`; ctx.fillStyle = cat.accent;
        ctx.fillText(r.name || "", pad + 24, y + 118);
        y += 164;
      });
      break;
    }

    case "trust": {
      let y = drawHeader(data.sectionLabel || "TRUST", data.headline, yStart) + 44;
      const stats = (data.stats || []).slice(0, 3);
      const sw = Math.floor((textZone - 40) / 3);
      stats.forEach((s, i) => {
        const sx = pad + i * (sw + 20);
        rect(ctx, sx, y, sw, 196, 16, "rgba(255,255,255,0.88)", hexRgba(cat.accent, 0.12), 1.5);
        ctx.font = `900 52px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top";
        drawText(ctx, s.number || "", sx + 20, y + 32, sw - 40, 60, { maxLines: 1 });
        ctx.font = `600 21px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.5)";
        drawText(ctx, s.label || "", sx + 20, y + 118, sw - 40, 30, { maxLines: 2 });
      });
      if (data.certText) {
        ctx.font = `400 24px ${FONT}`; ctx.fillStyle = fgSub; ctx.textBaseline = "top";
        drawText(ctx, data.certText, pad, y + 236, textZone, 34, { maxLines: 2 });
      }
      break;
    }

    case "comparison": {
      let y = drawHeader(data.sectionLabel || "WHY US", data.headline, yStart) + 36;
      const cw = (textZone - 24) / 2;
      rect(ctx, pad, y, cw, 224, 14, "rgba(255,255,255,0.88)", "rgba(0,0,0,0.08)", 1);
      ctx.font = `700 20px ${FONT}`; ctx.fillStyle = "rgba(150,150,150,0.9)"; ctx.textBaseline = "top";
      ctx.fillText("BEFORE", pad + 24, y + 20);
      ctx.font = `500 26px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.45)";
      drawText(ctx, data.before || "", pad + 24, y + 60, cw - 48, 36, { maxLines: 3 });
      rect(ctx, pad + cw + 24, y, cw, 224, 14, cat.accent);
      ctx.font = `700 20px ${FONT}`; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
      ctx.fillText("AFTER", pad + cw + 48, y + 20);
      ctx.font = `500 26px ${FONT}`; ctx.fillStyle = "#fff";
      drawText(ctx, data.after || "", pad + cw + 48, y + 60, cw - 48, 36, { maxLines: 3 });
      y += 252;
      (data.points || []).forEach((pt, i) => {
        rect(ctx, pad, y, textZone, 68, 8, "rgba(255,255,255,0.8)");
        rect(ctx, pad + 16, y + 16, 36, 36, 4, cat.accent);
        ctx.font = `800 18px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(String(i+1), pad + 27, y + 34);
        ctx.font = `500 24px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(pt || "", pad + 68, y + 34);
        y += 76;
      });
      break;
    }

    case "howto": {
      let y = drawHeader(data.sectionLabel || "HOW TO USE", data.headline, yStart) + 40;
      (data.steps || []).forEach((s, i) => {
        ctx.font = `900 72px ${FONT}`; ctx.fillStyle = hexRgba(cat.accent, 0.14); ctx.textBaseline = "top"; ctx.fillText(s.num || `0${i+1}`, pad, y - 8);
        ctx.font = `800 30px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "top"; ctx.fillText(s.title || "", pad + 88, y);
        ctx.font = `400 22px ${FONT}`; ctx.fillStyle = fgSub;
        drawText(ctx, s.desc || "", pad + 88, y + 38, textZone - 88, 32, { maxLines: 2 });
        if (i < (data.steps||[]).length - 1) {
          ctx.strokeStyle = "rgba(0,0,0,0.07)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(pad + 88, y + 108); ctx.lineTo(pad + textZone, y + 108); ctx.stroke();
        }
        y += 120;
      });
      break;
    }

    default: {
      // 범용 슬라이드
      let y = drawHeader(data.sectionLabel || slideType.toUpperCase(), data.headline, yStart) + 32;
      ctx.font = `400 27px ${FONT}`; ctx.fillStyle = fgSub;
      y = drawText(ctx, data.body || "", pad, y, textZone, 40, { maxLines: 6 });
      if (data.points) {
        y += 24;
        (data.points || []).forEach(pt => {
          rect(ctx, pad, y, 5, 5, 2.5, cat.accent);
          ctx.font = `500 25px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "top";
          drawText(ctx, pt, pad + 20, y - 2, textZone - 20, 36, { maxLines: 1 });
          y += 44;
        });
      }
      if (data.specs) {
        y += 16;
        (data.specs || []).forEach((s, i) => {
          rect(ctx, pad, y, textZone, 62, 8, i%2===0 ? "rgba(255,255,255,0.85)" : "transparent");
          ctx.font = `700 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "middle"; ctx.fillText(s.label || "", pad + 18, y + 31);
          ctx.font = `400 22px ${FONT}`; ctx.fillStyle = fg; ctx.fillText(s.value || "", pad + 190, y + 31);
          y += 70;
        });
      }
      if (data.stats) {
        y += 16;
        const sw2 = Math.floor((textZone - 40) / 3);
        (data.stats || []).slice(0, 3).forEach((s, i) => {
          const sx = pad + i * (sw2 + 20);
          rect(ctx, sx, y, sw2, 180, 14, "rgba(255,255,255,0.88)", hexRgba(cat.accent, 0.12), 1.5);
          ctx.font = `900 48px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top"; drawText(ctx, s.number || "", sx + 20, y + 28, sw2 - 40, 56, { maxLines: 1 });
          ctx.font = `600 20px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.5)"; drawText(ctx, s.label || "", sx + 20, y + 106, sw2 - 40, 28, { maxLines: 2 });
        });
      }
      if (data.faqs) {
        y += 8;
        (data.faqs || []).forEach(q => {
          rect(ctx, pad, y, textZone, 120, 12, "rgba(255,255,255,0.88)", "rgba(0,0,0,0.06)", 1);
          ctx.font = `700 22px ${FONT}`; ctx.fillStyle = cat.accent; ctx.textBaseline = "top"; drawText(ctx, "Q  " + (q.q||""), pad + 20, y + 18, textZone - 40, 30, { maxLines: 1 });
          ctx.font = `400 21px ${FONT}`; ctx.fillStyle = fgSub; drawText(ctx, "A  " + (q.a||""), pad + 20, y + 62, textZone - 40, 30, { maxLines: 2 });
          y += 132;
        });
      }
      if (data.items) {
        y += 16;
        (data.items || []).forEach(it => {
          rect(ctx, pad, y, 4, 44, 2, cat.accent);
          ctx.font = `800 26px ${FONT}`; ctx.fillStyle = fg; ctx.textBaseline = "top"; ctx.fillText(it.name || "", pad + 20, y);
          ctx.font = `400 21px ${FONT}`; ctx.fillStyle = fgSub; drawText(ctx, it.desc || "", pad + 20, y + 32, textZone - 20, 30, { maxLines: 2 });
          y += 86;
        });
      }
      if (data.reviews) {
        y += 16;
        (data.reviews || []).slice(0, 3).forEach(r => {
          rect(ctx, pad, y, textZone, 140, 12, "rgba(255,255,255,0.9)", "rgba(0,0,0,0.07)", 1);
          for (let s = 0; s < 5; s++) rect(ctx, pad + 20 + s * 20, y + 18, 12, 12, 2, cat.accent);
          ctx.font = `italic 400 22px ${FONT}`; ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.textBaseline = "top";
          drawText(ctx, r.text || "", pad + 20, y + 46, textZone - 40, 32, { maxLines: 2 });
          ctx.font = `600 18px ${FONT}`; ctx.fillStyle = cat.accent; ctx.fillText(r.name || "", pad + 20, y + 110);
          y += 152;
        });
      }
      break;
    }
  }

  drawPageNum(num, total);
}

// ══════════════════════════════════════════════════════════════
// AI 콘텐츠 생성 (Claude)
// ══════════════════════════════════════════════════════════════
async function generateContent({ category, productName, features, price, cta, target, extra, pageCount, refStyle }) {
  const cat = CATEGORIES.find(c => c.key === category);
  const types = SLIDE_TYPES.slice(0, pageCount);
  const schemas = {
    hero:       `{"id":"hero","badge":"배지(8자)","headline":"헤드라인(14자)","subheadline":"서브(22자)"}`,
    intro:      `{"id":"intro","sectionLabel":"BRAND","headline":"헤드라인(14자)","body":"본문(60자)"}`,
    feature:    `{"id":"feature","sectionLabel":"FEATURES","headline":"헤드라인(14자)","features":[{"title":"특징(8자)","desc":"설명(20자)"},{"title":"","desc":""},{"title":"","desc":""}]}`,
    detail1:    `{"id":"detail1","sectionLabel":"DETAIL","headline":"헤드라인(14자)","body":"본문(60자)"}`,
    detail2:    `{"id":"detail2","sectionLabel":"SPEC","headline":"헤드라인(14자)","specs":[{"label":"항목","value":"값"},{"label":"","value":""},{"label":"","value":""},{"label":"","value":""}]}`,
    comparison: `{"id":"comparison","sectionLabel":"WHY US","headline":"헤드라인(14자)","before":"기존(26자)","after":"해결(26자)","points":["차별점1(16자)","차별점2","차별점3"]}`,
    howto:      `{"id":"howto","sectionLabel":"HOW TO USE","headline":"헤드라인(14자)","steps":[{"num":"01","title":"단계(8자)","desc":"설명(20자)"},{"num":"02","title":"","desc":""},{"num":"03","title":"","desc":""}]}`,
    ingredient: `{"id":"ingredient","sectionLabel":"INGREDIENT","headline":"헤드라인(14자)","items":[{"name":"성분(10자)","desc":"설명(26자)"},{"name":"","desc":""},{"name":"","desc":""},{"name":"","desc":""}]}`,
    quality:    `{"id":"quality","sectionLabel":"QUALITY","headline":"헤드라인(14자)","body":"설명(60자)","points":["인증1(16자)","인증2","인증3"]}`,
    review:     `{"id":"review","sectionLabel":"REVIEW","headline":"헤드라인(14자)","reviews":[{"text":"후기(34자)","name":"구매자"},{"text":"","name":""},{"text":"","name":""}]}`,
    trust:      `{"id":"trust","sectionLabel":"TRUST","headline":"헤드라인(14자)","stats":[{"number":"수치","label":"지표"},{"number":"","label":""},{"number":"","label":""}],"certText":"인증(28자)"}`,
    faq:        `{"id":"faq","sectionLabel":"FAQ","headline":"헤드라인(14자)","faqs":[{"q":"질문(18자)","a":"답변(36자)"},{"q":"","a":""},{"q":"","a":""}]}`,
    gallery:    `{"id":"gallery","sectionLabel":"GALLERY","headline":"헤드라인(14자)"}`,
    package:    `{"id":"package","sectionLabel":"PACKAGE","headline":"헤드라인(14자)","items":[{"name":"구성품(10자)","desc":"설명(18자)"},{"name":"","desc":""},{"name":"","desc":""}]}`,
    delivery:   `{"id":"delivery","sectionLabel":"DELIVERY","headline":"헤드라인(14자)","points":["배송정보1(22자)","배송정보2","배송정보3"]}`,
    event:      `{"id":"event","sectionLabel":"EVENT","headline":"헤드라인(14자)","discount":"할인혜택","body":"이벤트내용(44자)"}`,
    size:       `{"id":"size","sectionLabel":"SIZE","headline":"헤드라인(14자)","body":"사이즈안내(60자)"}`,
    story:      `{"id":"story","sectionLabel":"STORY","headline":"헤드라인(14자)","body":"스토리(80자)"}`,
    warning:    `{"id":"warning","sectionLabel":"CAUTION","headline":"헤드라인(14자)","points":["주의1(22자)","주의2","주의3"]}`,
    cta:        `{"id":"cta","sectionLabel":"ORDER NOW","headline":"어필(14자)","price":"${price||""}","originalPrice":"정가","discount":"할인","cta":"${cta||"지금 구매하기"}","urgency":"긴박감(14자)"}`,
  };
  const prompt = `한국 쇼핑몰 상세페이지 카피라이터. 상품: ${productName} / 카테고리: ${cat.label} / 특징: ${features} / 가격: ${price||"미정"} / 타겟: ${target||"일반"} / 추가: ${extra||"없음"}
${refStyle ? `참고 스타일: ${refStyle}` : ""}
슬라이드 ${pageCount}장. JSON만 응답:
{"slides":[${types.map(t => schemas[t.id] || `{"id":"${t.id}","sectionLabel":"${t.label.toUpperCase()}","headline":"","body":""}`).join(",")}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, messages:[{role:"user",content:prompt}] }),
  });
  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  return JSON.parse(clean);
}

// Gemini Imagen 이미지 생성 (/api/generate-image 서버리스 함수 경유)
async function generateBgImage(prompt) {
  const res = await fetch("/api/generate-image", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ prompt, aspectRatio:"1:1" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.image; // base64 data URL
}

// 참고 이미지 분석
async function analyzeRef(b64, mime) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600,
      messages:[{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:mime,data:b64}},
        {type:"text",text:"이 상세페이지 이미지의 디자인 스타일을 영어로 분석해주세요 (이미지 생성 프롬프트에 쓸 것): color palette, mood, lighting style, background type, photography style. 150 words max. English only."}
      ]}]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
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
  const [slides,     setSlides]     = useState(null);
  const [rendered,   setRendered]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState({ step:"", cur:0, total:0 });
  const [err,        setErr]        = useState("");
  const [curIdx,     setCurIdx]     = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [aiSugg,     setAiSugg]     = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const fileRef = useRef(null), refFileRef = useRef(null);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];

  const handleImages = (files) => {
    Promise.all(Array.from(files).slice(0,10).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = e => res({ name:f.name, dataUrl:e.target.result }); r.readAsDataURL(f);
    }))).then(imgs => setImages(p => [...p,...imgs].slice(0,10)));
  };

  const handleRef = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      setRefImg(e.target.result); setAnalyzing(true);
      try {
        const b64 = e.target.result.split(",")[1], mime = e.target.result.split(":")[1].split(";")[0];
        setRefStyle(await analyzeRef(b64, mime));
      } catch { setRefStyle("분석 실패"); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  // ── 전체 생성 프로세스 ────────────────────────────────────────
  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true); setRendered([]); setSlides(null);

    try {
      // 1. 텍스트 생성
      setProgress({ step:"AI가 카피 작성 중...", cur:0, total:pageCount });
      const data = await generateContent({ category:selCat, ...form, pageCount, refStyle });
      const slidesData = data.slides || [];
      setSlides(slidesData);

      // 2. 슬라이드별 Imagen 배경 생성 + Canvas 합성
      const productImgs = images.map(i => i.dataUrl);
      const results = [];
      for (let i = 0; i < slidesData.length; i++) {
        const s = slidesData[i];
        setProgress({ step:`배경 이미지 생성 중... (${i+1}/${slidesData.length})`, cur:i+1, total:slidesData.length });

        // Gemini로 배경 생성
        let bgImage = null;
        try {
          const imgPrompt = buildImagePrompt(s.id, cat, form.productName, refStyle, null);
          bgImage = await generateBgImage(imgPrompt);
        } catch (imgErr) {
          console.warn(`슬라이드 ${i+1} 배경 생성 실패 (폴백 사용):`, imgErr.message);
        }

        // Canvas 합성
        const canvas = document.createElement("canvas");
        const prodImg = productImgs.length > 0 ? productImgs[i % productImgs.length] : null;
        await compositeSlide(canvas, s.id, { ...s, _num:i+1, _total:slidesData.length }, cat, bgImage, prodImg);
        results.push(canvas.toDataURL("image/png"));

        // 중간 결과 반영
        setRendered([...results]);
        await new Promise(r => setTimeout(r, 20));
      }

      setStep(3); setCurIdx(0);
      setProgress({ step:"완료!", cur:slidesData.length, total:slidesData.length });
    } catch(e) { setErr("생성 실패: " + e.message); }
    finally    { setLoading(false); }
  };

  const saveCurrent = () => {
    if (!rendered[curIdx]) return;
    const a = document.createElement("a");
    a.href = rendered[curIdx];
    a.download = `${form.productName||"slide"}_${String(curIdx+1).padStart(2,"0")}.png`;
    a.click();
  };

  const saveAll = async () => {
    if (!rendered.length) return; setSaving(true);
    if (!window.JSZip) await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    const zip = new window.JSZip();
    rendered.forEach((png,i) => {
      const arr = Uint8Array.from(atob(png.split(",")[1]), c=>c.charCodeAt(0));
      zip.file(`${String(i+1).padStart(2,"0")}_${SLIDE_TYPES[i]?.label||"slide"}.png`, arr);
    });
    const blob = await zip.generateAsync({ type:"blob", compression:"DEFLATE" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${form.productName||"detail"}_slides.zip`; a.click();
    setSaving(false);
  };

  const getSuggestions = async () => {
    setSuggesting(true); setAiSugg(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600,
          messages:[{role:"user",content:`카테고리:${cat.label} 상품명:"${form.productName}" 특징:"${form.features}"\nJSON만:\n{"productNames":["추천1(14자)","추천2","추천3"],"ctas":["CTA1(10자)","CTA2","CTA3"],"targets":["타겟1(22자)","타겟2"],"extras":["추가1(28자)","추가2"]}`}]
        }),
      });
      const d = await res.json();
      const txt = d.content?.[0]?.text||"";
      setAiSugg(JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim()));
    } catch(e) { console.error(e); }
    setSuggesting(false);
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── Step 1: 카테고리 ────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>상세페이지 만들기</div>
        <div style={{ fontSize:13, color:muted }}>Gemini AI가 배경 이미지를 직접 생성 → Canvas로 텍스트 합성 → PNG 저장</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:10 }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={()=>{ setSelCat(c.key); setStep(2); }}
            style={{ padding:"24px 18px", borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.accent; e.currentTarget.style.boxShadow=`0 4px 16px ${c.accent}25`; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=bdr; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
            <div style={{ fontSize:11, fontWeight:800, color:c.accent, letterSpacing:2.5, marginBottom:12 }}>{c.label.toUpperCase()}</div>
            <div style={{ width:32, height:3, background:c.accent, borderRadius:2 }}/>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2: 입력 ────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 24px 60px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={()=>setStep(1)} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 카테고리</button>
        <span style={{ fontSize:16, fontWeight:800, color:text }}>{cat.label}</span>
        <div style={{ width:24, height:3, background:cat.accent, borderRadius:1 }}/>
      </div>
      <div style={{ display:"grid", gap:14 }}>

        {/* 슬라이드 수 */}
        <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>{SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}</div>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:cat.accent }}>{pageCount}장</div>
          </div>
          <input type="range" min={3} max={20} value={pageCount} onChange={e=>setPageCount(Number(e.target.value))} style={{ width:"100%", accentColor:cat.accent }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:4 }}>
            <span>3장 (최소)</span><span>20장 (최대)</span>
          </div>
        </div>

        {/* 상품 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(최대 10장)</span></div>
          <div onClick={()=>fileRef.current?.click()} onDrop={e=>{e.preventDefault();handleImages(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()}
            style={{ border:`1.5px dashed ${images.length?cat.accent:bdr}`, borderRadius:12, padding:images.length?"14px":"20px", cursor:"pointer", background:images.length?`${cat.accent}06`:cardBg, transition:"all 0.12s" }}>
            {images.length ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {images.map((img,i)=>(
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.dataUrl} alt="" style={{ width:60, height:60, objectFit:"cover", borderRadius:8, display:"block" }}/>
                    <button onClick={e=>{e.stopPropagation();setImages(p=>p.filter((_,j)=>j!==i));}} style={{ position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                  </div>
                ))}
                {images.length < 10 && <div style={{ width:60,height:60,borderRadius:8,border:`1.5px dashed ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:muted }}>+</div>}
              </div>
            ) : <div style={{ textAlign:"center" }}><div style={{ fontSize:12,fontWeight:600,color:text,marginBottom:3 }}>클릭 또는 드래그</div><div style={{ fontSize:11,color:muted }}>JPG, PNG (최대 10장)</div></div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handleImages(e.target.files);e.target.value="";}}/>
        </div>

        {/* 참고 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>참고 이미지 <span style={{ color:muted, fontWeight:400 }}>(선택 — 색감·분위기 반영)</span></div>
          <div style={{ fontSize:11, color:muted, marginBottom:8 }}>마음에 드는 상세페이지를 올리면 AI가 색감·조명·스타일을 분석해 배경 생성에 반영해요</div>
          <div onClick={()=>refFileRef.current?.click()} style={{ border:`1.5px dashed ${refImg?cat.accent:bdr}`, borderRadius:12, padding:"12px 16px", cursor:"pointer", display:"flex", gap:12, alignItems:"center", background:cardBg }}>
            {refImg ? (
              <>
                <img src={refImg} alt="" style={{ width:60,height:60,objectFit:"cover",borderRadius:8,flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  {analyzing ? <div style={{ fontSize:12,color:muted }}>스타일 분석 중...</div>
                  : refStyle ? <><div style={{ fontSize:11,fontWeight:700,color:cat.accent,marginBottom:3 }}>스타일 분석 완료 ✓</div><div style={{ fontSize:11,color:muted,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{refStyle}</div></> : null}
                </div>
                <button onClick={e=>{e.stopPropagation();setRefImg(null);setRefStyle("");}} style={{ padding:"4px 10px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",flexShrink:0 }}>제거</button>
              </>
            ) : <div style={{ fontSize:12,color:muted }}>참고 이미지 업로드 (선택)</div>}
          </div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{handleRef(e.target.files[0]);e.target.value="";}}/>
        </div>

        {/* 텍스트 입력 */}
        {[
          { key:"productName", label:"상품명 *",    ph:"예: 프리미엄 한우 1++ 등심 선물 세트" },
          { key:"features",    label:"핵심 특징 *", ph:"예: 1++ 등급, 냉장 당일 배송, 고급 포장", ta:true },
          { key:"price",       label:"가격",         ph:"예: 89,000원" },
          { key:"cta",         label:"CTA 문구",     ph:"예: 지금 주문하기" },
          { key:"target",      label:"타겟 고객",    ph:"예: 특별한 날 선물을 찾는 3040" },
          { key:"extra",       label:"추가 정보",    ph:"예: 수상 이력, 원산지, 보관 방법", ta:true },
        ].map(({ key, label, ph, ta }) => (
          <div key={key}>
            <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:6 }}>{label}</div>
            {ta ? <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ ...inputStyle,resize:"vertical",lineHeight:1.7 }}/>
                : <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inputStyle}/>}
          </div>
        ))}

        {/* AI 추천 */}
        <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:aiSugg?14:0 }}>
            <div><div style={{ fontSize:13,fontWeight:700,color:text }}>AI 추천</div><div style={{ fontSize:11,color:muted,marginTop:2 }}>입력값 기반 문구 자동 추천</div></div>
            <button onClick={getSuggestions} disabled={suggesting} style={{ padding:"8px 16px",borderRadius:8,border:"none",cursor:suggesting?"wait":"pointer",background:`${cat.accent}18`,color:cat.accent,fontSize:12,fontWeight:800,opacity:suggesting?0.6:1 }}>
              {suggesting?"추천 중...":"AI 추천"}
            </button>
          </div>
          {aiSugg && (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[{key:"productName",items:aiSugg.productNames,label:"상품명"},{key:"cta",items:aiSugg.ctas,label:"CTA"},{key:"target",items:aiSugg.targets,label:"타겟"},{key:"extra",items:aiSugg.extras,label:"추가정보"}]
                .filter(r=>r.items?.length>0).map(({ key, items, label })=>(
                <div key={key}>
                  <div style={{ fontSize:10,fontWeight:700,color:muted,letterSpacing:1,marginBottom:5 }}>{label}</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                    {items.map((v,i)=>(<button key={i} onClick={()=>setForm(p=>({...p,[key]:v}))} style={{ padding:"4px 10px",borderRadius:6,border:`1px solid ${cat.accent}30`,background:`${cat.accent}08`,color:text,fontSize:12,cursor:"pointer" }}>{v}</button>))}
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
          {loading ? (progress.step || "생성 중...") : `Gemini AI로 상세페이지 ${pageCount}장 생성`}
        </button>

        {loading && progress.total > 0 && (
          <div style={{ padding:"12px 16px", borderRadius:10, background:cardBg, border:`1px solid ${bdr}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:muted,marginBottom:8 }}>
              <span>{progress.step}</span><span>{progress.cur}/{progress.total}</span>
            </div>
            <div style={{ height:4,borderRadius:2,background:isDark?"rgba(255,255,255,0.1)":"#e0e0e0" }}>
              <div style={{ height:"100%",borderRadius:2,background:cat.accent,width:`${(progress.cur/progress.total)*100}%`,transition:"width 0.4s" }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 3: 결과 ────────────────────────────────────────────
  if (step === 3) {
    const slideTypes = SLIDE_TYPES.slice(0, slides?.length || 0);
    return (
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"20px 20px 60px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setStep(2)} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>← 수정</button>
            <button onClick={()=>{ setStep(1);setSlides(null);setRendered([]);setImages([]);setRefImg(null);setRefStyle("");setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""}); }} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>새로 만들기</button>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            <button onClick={()=>setCurIdx(Math.max(0,curIdx-1))} disabled={curIdx===0} style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===0?"not-allowed":"pointer",opacity:curIdx===0?0.3:1,fontSize:18 }}>‹</button>
            <span style={{ fontSize:12,color:muted,minWidth:44,textAlign:"center" }}>{curIdx+1} / {slides?.length||0}</span>
            <button onClick={()=>setCurIdx(Math.min((slides?.length||1)-1,curIdx+1))} disabled={curIdx===(slides?.length||1)-1} style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===(slides?.length||1)-1?"not-allowed":"pointer",opacity:curIdx===(slides?.length||1)-1?0.3:1,fontSize:18 }}>›</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10,fontWeight:800,color:cat.accent,letterSpacing:2,marginBottom:8 }}>{slideTypes[curIdx]?.label?.toUpperCase()}</div>
            <div style={{ width:"100%",aspectRatio:"1/1",borderRadius:16,overflow:"hidden",boxShadow:"0 12px 48px rgba(0,0,0,0.25)",background:isDark?"#111":"#eee",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {rendered[curIdx] ? <img src={rendered[curIdx]} alt="slide" style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }}/> : <div style={{ fontSize:13,color:muted }}>렌더링 중...</div>}
            </div>
            <div style={{ display:"flex",gap:8,marginTop:10 }}>
              <button onClick={saveCurrent} disabled={!rendered[curIdx]} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",cursor:rendered[curIdx]?"pointer":"not-allowed",background:cat.accent,color:"#fff",fontSize:13,fontWeight:800,opacity:rendered[curIdx]?1:0.5 }}>현재 이미지 저장</button>
              <button onClick={saveAll} disabled={!rendered.length||saving} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",cursor:rendered.length&&!saving?"pointer":"not-allowed",background:isDark?"rgba(255,255,255,0.12)":"#2c2c2c",color:"#fff",fontSize:13,fontWeight:800,opacity:rendered.length&&!saving?1:0.5 }}>{saving?"ZIP 저장 중...":"전체 ZIP 저장"}</button>
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:6,flexShrink:0 }}>
            {(slides||[]).map((s,i)=>(
              <div key={i} onClick={()=>setCurIdx(i)} style={{ cursor:"pointer",borderRadius:9,overflow:"hidden",border:i===curIdx?`2.5px solid ${cat.accent}`:`2.5px solid transparent`,transition:"all 0.12s",width:100 }}>
                {rendered[i] ? <img src={rendered[i]} alt="" style={{ width:100,height:100,display:"block",objectFit:"cover" }}/> : <div style={{ width:100,height:100,background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ fontSize:9,color:muted }}>...</div></div>}
                <div style={{ fontSize:9,color:i===curIdx?cat.accent:muted,textAlign:"center",padding:"3px 0",fontWeight:i===curIdx?800:400,background:isDark?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.9)" }}>{slideTypes[i]?.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}
