import React, { useRef, useEffect, useCallback } from "react";

// ─── 섹션별 고퀄리티 HTML 생성기 ─────────────────────────────────

function renderSectionHTML(sec, colorScheme, productImages, idx, totalSections) {
  const cs = colorScheme || { primary: "#1a1a2e", secondary: "#888", background: "#ffffff", text: "#1a1a1a", accent: "#168EEA" };
  const d = sec.data || {};
  const img = productImages[idx % Math.max(productImages.length, 1)]?.preview || "";
  const img2 = productImages[(idx + 1) % Math.max(productImages.length, 1)]?.preview || img;
  const sid = sec.id;

  // 부드러운 보조색 생성
  const accentLight = cs.accent + "12";
  const accentMid = cs.accent + "25";
  const primaryLight = cs.primary + "08";

  const generators = {

    // ══════════ 히어로 ══════════
    hero: () => `
      <div data-section="${sid}" style="position:relative;overflow:hidden;background:${cs.background};">
        <!-- 상단 얇은 악센트 라인 -->
        <div style="height:3px;background:linear-gradient(90deg,${cs.accent},${cs.primary});"></div>

        <div style="display:flex;align-items:center;min-height:560px;padding:0;">
          <!-- 왼쪽: 텍스트 영역 -->
          <div style="flex:1;padding:72px 48px 72px 56px;">
            <!-- 영문 서브라벨 -->
            <div data-element="subtitle" data-type="text" style="font-size:11px;font-weight:600;letter-spacing:4px;color:${cs.accent};text-transform:uppercase;margin-bottom:18px;">
              ${d.subtitle || "PREMIUM QUALITY"}
            </div>
            <!-- 메인 타이틀 -->
            <h1 data-element="title" data-type="text" style="font-size:38px;font-weight:900;color:${cs.text};margin:0 0 20px;line-height:1.35;letter-spacing:-1px;word-break:keep-all;">
              ${d.title || "제품 타이틀"}
            </h1>
            <!-- 본문 -->
            <p data-element="body" data-type="text" style="font-size:15px;line-height:1.85;color:${cs.secondary};margin:0 0 32px;max-width:380px;word-break:keep-all;">
              ${d.body || "제품에 대한 간결하고 매력적인 소개 문구를 입력하세요"}
            </p>
            <!-- 구분선 -->
            <div style="width:48px;height:2px;background:${cs.accent};margin-bottom:28px;"></div>
            <!-- 핵심 포인트 3개 가로 -->
            <div style="display:flex;gap:24px;">
              ${(d.quickPoints || ["고품질 소재", "세련된 디자인", "합리적 가격"]).slice(0,3).map(p => `
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:5px;height:5px;border-radius:50%;background:${cs.accent};"></div>
                  <span style="font-size:12px;font-weight:600;color:${cs.text};">${p}</span>
                </div>
              `).join("")}
            </div>
          </div>
          <!-- 오른쪽: 제품 이미지 영역 -->
          <div style="flex:0 0 45%;position:relative;min-height:560px;overflow:hidden;">
            <div style="position:absolute;inset:0;background:linear-gradient(135deg,${accentLight},${primaryLight});"></div>
            ${img ? `<img data-element="hero_img" data-type="image" src="${img}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:85%;max-height:85%;object-fit:contain;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.15));" />` : `
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <div style="width:240px;height:300px;border-radius:20px;background:${accentMid};display:flex;align-items:center;justify-content:center;color:${cs.secondary};font-size:13px;">제품 이미지</div>
            </div>`}
          </div>
        </div>
      </div>`,

    // ══════════ 브랜드 소개 ══════════
    brand: () => `
      <div data-section="${sid}" style="padding:88px 48px;text-align:center;background:${cs.background};border-top:1px solid rgba(0,0,0,0.04);border-bottom:1px solid rgba(0,0,0,0.04);">
        <!-- 영문 브랜드명 -->
        <div data-element="brandName" data-type="text" style="font-size:14px;font-weight:500;letter-spacing:6px;color:${cs.accent};text-transform:uppercase;margin-bottom:28px;">
          ${d.brandName || "BRAND NAME"}
        </div>
        <!-- 한글 태그라인 -->
        <h2 data-element="tagline" data-type="text" style="font-size:30px;font-weight:800;color:${cs.text};margin:0 0 24px;line-height:1.4;letter-spacing:-0.5px;">
          ${d.tagline || "당신을 위한 특별한 선택"}
        </h2>
        <!-- 구분선 -->
        <div style="width:36px;height:1.5px;background:${cs.accent};margin:0 auto 24px;"></div>
        <!-- 본문 -->
        <p data-element="body" data-type="text" style="font-size:14px;line-height:2;color:${cs.secondary};max-width:460px;margin:0 auto;word-break:keep-all;">
          ${d.body || "브랜드의 철학과 가치를 소개하는 텍스트입니다"}
        </p>
      </div>`,

    // ══════════ 핵심 특장점 (POINT 01/02/03 스타일) ══════════
    key_features: () => {
      const features = d.features || [
        { title: "특장점 1", desc: "상세 설명을 입력하세요" },
        { title: "특장점 2", desc: "상세 설명을 입력하세요" },
        { title: "특장점 3", desc: "상세 설명을 입력하세요" },
      ];
      return `
      <div data-section="${sid}" style="padding:80px 0;background:${cs.background};">
        <!-- 섹션 제목 -->
        <div style="text-align:center;margin-bottom:56px;padding:0 48px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;">KEY FEATURES</div>
          <h2 data-element="title" data-type="text" style="font-size:28px;font-weight:900;color:${cs.text};margin:0;line-height:1.4;letter-spacing:-0.5px;">
            ${d.title || "핵심 특장점"}
          </h2>
        </div>
        <!-- 포인트 목록 -->
        ${features.map((f, fi) => {
          const isEven = fi % 2 === 0;
          const pointImg = productImages[(idx + fi) % Math.max(productImages.length, 1)]?.preview || "";
          return `
          <div style="display:flex;align-items:center;${!isEven ? "flex-direction:row-reverse;" : ""}margin-bottom:${fi < features.length - 1 ? 4 : 0}px;background:${fi % 2 === 0 ? "transparent" : primaryLight};">
            <!-- 이미지 -->
            <div style="flex:0 0 50%;height:400px;overflow:hidden;position:relative;">
              ${pointImg ? `<img src="${pointImg}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="width:100%;height:100%;background:${accentMid};display:flex;align-items:center;justify-content:center;color:${cs.secondary};font-size:13px;">이미지 ${fi + 1}</div>`}
            </div>
            <!-- 텍스트 -->
            <div style="flex:1;padding:48px 56px;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:28px;border-radius:4px;background:${cs.accent};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:20px;">
                ${String(fi + 1).padStart(2, "0")}
              </div>
              <h3 data-element="feature_title_${fi}" data-type="text" style="font-size:24px;font-weight:800;color:${cs.text};margin:0 0 14px;line-height:1.4;letter-spacing:-0.3px;">
                ${f.title}
              </h3>
              <p data-element="feature_desc_${fi}" data-type="text" style="font-size:14px;line-height:1.9;color:${cs.secondary};margin:0;word-break:keep-all;">
                ${f.desc}
              </p>
            </div>
          </div>`;
        }).join("")}
      </div>`;
    },

    // ══════════ 제품 정보 테이블 ══════════
    product_info: () => {
      const rows = d.rows || [{ label: "제품명", value: "-" }];
      return `
      <div data-section="${sid}" style="padding:80px 48px;background:${cs.background};">
        <div style="max-width:580px;margin:0 auto;">
          <!-- 영문 라벨 -->
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;text-align:center;">PRODUCT INFORMATION</div>
          <h2 data-element="title" data-type="text" style="font-size:26px;font-weight:800;color:${cs.text};text-align:center;margin:0 0 40px;letter-spacing:-0.3px;">
            ${d.title || "제품 상세 정보"}
          </h2>
          <!-- 테이블 -->
          <div style="border-top:2px solid ${cs.text};">
            ${rows.map((r, ri) => `
              <div style="display:flex;border-bottom:1px solid rgba(0,0,0,0.06);${ri === rows.length - 1 ? "border-bottom:1px solid rgba(0,0,0,0.15);" : ""}">
                <div style="flex:0 0 140px;padding:16px 20px;font-size:13px;font-weight:700;color:${cs.text};background:${primaryLight};">${r.label}</div>
                <div style="flex:1;padding:16px 20px;font-size:13px;color:${cs.secondary};">${r.value}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
    },

    // ══════════ 타겟 고객 ══════════
    target: () => {
      const items = d.items || ["타겟 1", "타겟 2", "타겟 3"];
      return `
      <div data-section="${sid}" style="padding:80px 48px;background:${primaryLight};">
        <div style="max-width:600px;margin:0 auto;text-align:center;">
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;">WHO IS IT FOR</div>
          <h2 data-element="title" data-type="text" style="font-size:26px;font-weight:800;color:${cs.text};margin:0 0 16px;letter-spacing:-0.3px;">
            ${d.title || "이런 분께 추천합니다"}
          </h2>
          <div style="width:36px;height:1.5px;background:${cs.accent};margin:0 auto 40px;"></div>
          <!-- 카드 그리드 -->
          <div style="display:grid;grid-template-columns:repeat(${Math.min(items.length, 3)},1fr);gap:16px;">
            ${items.map((item, ii) => `
              <div style="background:#fff;border-radius:16px;padding:32px 20px;box-shadow:0 2px 16px rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.04);">
                <!-- 아이콘 원 -->
                <div style="width:56px;height:56px;border-radius:50%;background:${accentLight};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${cs.accent}" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div data-element="item_${ii}" data-type="text" style="font-size:14px;font-weight:600;color:${cs.text};line-height:1.6;word-break:keep-all;">
                  ${item}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
    },

    // ══════════ 임상/데이터 ══════════
    clinical: () => {
      const rows = d.rows || [{ test: "만족도 조사", subjects: "100명", period: "2주", result: "95%" }];
      return `
      <div data-section="${sid}" style="padding:80px 48px;background:${cs.background};">
        <div style="max-width:620px;margin:0 auto;">
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;text-align:center;">CLINICAL RESULTS</div>
          <h2 data-element="title" data-type="text" style="font-size:26px;font-weight:800;color:${cs.text};text-align:center;margin:0 0 40px;letter-spacing:-0.3px;">
            ${d.title || "테스트 결과"}
          </h2>
          <!-- 수치 하이라이트 카드 -->
          <div style="display:flex;gap:12px;margin-bottom:36px;">
            ${rows.map(r => `
              <div style="flex:1;text-align:center;padding:28px 16px;border-radius:14px;background:${primaryLight};border:1px solid rgba(0,0,0,0.04);">
                <div style="font-size:36px;font-weight:900;color:${cs.accent};letter-spacing:-1px;margin-bottom:6px;">${r.result}</div>
                <div style="font-size:12px;font-weight:600;color:${cs.text};margin-bottom:4px;">${r.test}</div>
                <div style="font-size:11px;color:${cs.secondary};">${r.subjects} / ${r.period}</div>
              </div>
            `).join("")}
          </div>
          <!-- 출처 -->
          <p style="text-align:center;font-size:11px;color:${cs.secondary};opacity:0.6;">
            * 자체 임상 테스트 기준, 개인차가 있을 수 있습니다
          </p>
        </div>
      </div>`;
    },

    // ══════════ 텍스처/질감 (풀블리드 이미지 + 오버레이 텍스트) ══════════
    texture: () => `
      <div data-section="${sid}" style="position:relative;min-height:480px;overflow:hidden;">
        <!-- 배경 이미지 -->
        ${img ? `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />` : ""}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.55) 100%);"></div>
        <!-- 콘텐츠 -->
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;min-height:480px;padding:56px;">
          <div data-element="subtitle" data-type="text" style="font-size:11px;font-weight:600;letter-spacing:4px;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:14px;">
            ${d.subtitle || "PREMIUM TEXTURE"}
          </div>
          <h2 data-element="title" data-type="text" style="font-size:32px;font-weight:800;color:#fff;margin:0 0 16px;line-height:1.35;letter-spacing:-0.5px;text-shadow:0 1px 8px rgba(0,0,0,0.15);">
            ${d.title || "차원이 다른 품질"}
          </h2>
          <p data-element="body" data-type="text" style="font-size:14px;line-height:1.85;color:rgba(255,255,255,0.85);max-width:400px;margin:0;word-break:keep-all;">
            ${d.body || "섬세한 텍스처와 뛰어난 발림감을 직접 경험해 보세요"}
          </p>
        </div>
      </div>`,

    // ══════════ 제품 갤러리 ══════════
    gallery: () => {
      const imgs = productImages.slice(0, 6);
      return `
      <div data-section="${sid}" style="padding:80px 48px;background:${cs.background};">
        <div style="text-align:center;margin-bottom:40px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;">PRODUCT DETAILS</div>
          <h2 data-element="title" data-type="text" style="font-size:26px;font-weight:800;color:${cs.text};margin:0;letter-spacing:-0.3px;">
            ${d.title || "제품 상세"}
          </h2>
        </div>
        <!-- 메인 이미지 -->
        ${imgs[0] ? `
        <div style="margin-bottom:12px;border-radius:16px;overflow:hidden;background:${primaryLight};">
          <img src="${imgs[0].preview}" style="width:100%;height:400px;object-fit:cover;" />
        </div>` : ""}
        <!-- 서브 이미지 그리드 -->
        <div style="display:grid;grid-template-columns:repeat(${Math.min(Math.max(imgs.length - 1, 3), 3)},1fr);gap:12px;">
          ${(imgs.length > 1 ? imgs.slice(1, 4) : [null, null, null]).map((im, gi) => `
            <div data-element="gallery_${gi}" data-type="image" style="aspect-ratio:1;border-radius:12px;overflow:hidden;background:${primaryLight};">
              ${im ? `<img src="${im.preview}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${cs.secondary};font-size:12px;">이미지</div>`}
            </div>
          `).join("")}
        </div>
      </div>`;
    },

    // ══════════ 사용 방법 ══════════
    usage: () => {
      const steps = d.steps || [
        { step: 1, title: "STEP 1", desc: "사용법을 입력하세요" },
        { step: 2, title: "STEP 2", desc: "사용법을 입력하세요" },
        { step: 3, title: "STEP 3", desc: "사용법을 입력하세요" },
      ];
      return `
      <div data-section="${sid}" style="padding:80px 48px;background:${primaryLight};">
        <div style="max-width:560px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:48px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;">HOW TO USE</div>
            <h2 data-element="title" data-type="text" style="font-size:26px;font-weight:800;color:${cs.text};margin:0;letter-spacing:-0.3px;">
              ${d.title || "사용 방법"}
            </h2>
          </div>
          ${steps.map((s, si) => `
            <div style="display:flex;gap:20px;margin-bottom:${si < steps.length - 1 ? 32 : 0}px;align-items:flex-start;">
              <!-- 넘버 + 연결선 -->
              <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid ${cs.accent};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:${cs.accent};flex-shrink:0;">
                  ${s.step || si + 1}
                </div>
                ${si < steps.length - 1 ? `<div style="width:1.5px;height:32px;background:${cs.accent}30;margin-top:6px;"></div>` : ""}
              </div>
              <!-- 텍스트 -->
              <div style="flex:1;padding-top:8px;">
                <div data-element="step_title_${si}" data-type="text" style="font-size:16px;font-weight:700;color:${cs.text};margin-bottom:6px;">${s.title}</div>
                <div data-element="step_desc_${si}" data-type="text" style="font-size:13px;line-height:1.8;color:${cs.secondary};word-break:keep-all;">${s.desc}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>`;
    },

    // ══════════ 라이프스타일 ══════════
    lifestyle: () => `
      <div data-section="${sid}" style="position:relative;min-height:520px;overflow:hidden;">
        ${img2 ? `<img src="${img2}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />` : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,${cs.primary}15,${cs.accent}15);"></div>`}
        <!-- 반투명 카드 오버레이 -->
        <div style="position:relative;z-index:1;display:flex;align-items:flex-end;min-height:520px;padding:56px;">
          <div style="background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-radius:20px;padding:40px;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.1);">
            <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:${cs.accent};text-transform:uppercase;margin-bottom:12px;">LIFESTYLE</div>
            <h2 data-element="title" data-type="text" style="font-size:24px;font-weight:800;color:${cs.text};margin:0 0 12px;line-height:1.4;letter-spacing:-0.3px;">
              ${d.title || "일상 속 특별한 순간"}
            </h2>
            <p data-element="body" data-type="text" style="font-size:13px;line-height:1.85;color:${cs.secondary};margin:0;word-break:keep-all;">
              ${d.body || "매일의 일상을 더 특별하게 만들어 드립니다"}
            </p>
          </div>
        </div>
      </div>`,

    // ══════════ 유의사항 ══════════
    notices: () => {
      const items = d.items || ["유의사항 1", "유의사항 2", "유의사항 3"];
      return `
      <div data-section="${sid}" style="padding:64px 48px;background:${cs.background};border-top:1px solid rgba(0,0,0,0.06);">
        <div style="max-width:560px;margin:0 auto;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${cs.secondary}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3 data-element="title" data-type="text" style="font-size:16px;font-weight:700;color:${cs.text};margin:0;">
              ${d.title || "고객 유의사항"}
            </h3>
          </div>
          <div style="padding:24px 28px;border-radius:12px;background:${primaryLight};border:1px solid rgba(0,0,0,0.04);">
            ${items.map((item, ni) => `
              <div style="display:flex;gap:10px;margin-bottom:${ni < items.length - 1 ? 12 : 0}px;align-items:flex-start;">
                <span style="color:${cs.secondary};font-size:13px;flex-shrink:0;margin-top:1px;">-</span>
                <span data-element="notice_${ni}" data-type="text" style="font-size:13px;line-height:1.75;color:${cs.secondary};word-break:keep-all;">${item}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
    },

    // ══════════ CTA (구매 유도) ══════════
    cta: () => `
      <div data-section="${sid}" style="padding:80px 48px;text-align:center;background:${cs.primary};">
        <div style="max-width:460px;margin:0 auto;">
          <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:16px;">ORDER NOW</div>
          <h2 data-element="title" data-type="text" style="font-size:30px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.4;letter-spacing:-0.5px;">
            ${d.title || "지금 바로 만나보세요"}
          </h2>
          <p data-element="body" data-type="text" style="font-size:14px;color:rgba(255,255,255,0.6);margin:0 0 36px;line-height:1.7;">
            ${d.body || ""}
          </p>
          <div data-element="cta_btn" data-type="text" style="display:inline-block;padding:16px 56px;border-radius:60px;background:#fff;color:${cs.primary};font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 24px rgba(0,0,0,0.2);cursor:pointer;transition:transform 0.2s;">
            ${d.buttonText || "구매하기"}
          </div>
        </div>
      </div>`,
  };

  const gen = generators[sec.type];
  return gen ? gen() : generators.hero();
}

// ─── 전체 HTML 문서 생성 ─────────────────────────────────

function buildFullHTML(sections, colorScheme, productImages) {
  const sectionsHtml = sections.map((sec, i) => renderSectionHTML(sec, colorScheme, productImages, i, sections.length)).join("\n");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
body{font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:680px;margin:0 auto;overflow-x:hidden;background:#fff;}
img{display:block;max-width:100%;}
[data-element]{transition:outline 0.15s,background 0.15s;}
[data-element]:hover{outline:2px solid rgba(0,0,0,0.06);outline-offset:2px;cursor:pointer;}
[data-element].sel{outline:2px solid #168EEA;outline-offset:2px;background:rgba(0,0,0,0.06);}
[data-section].sel{box-shadow:inset 0 0 0 2px rgba(0,0,0,0.06);}
</style>
</head><body>
${sectionsHtml}
<script>
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-element]');
  var sec=e.target.closest('[data-section]');
  document.querySelectorAll('.sel').forEach(function(n){n.classList.remove('sel');});
  if(el)el.classList.add('sel');
  if(sec)sec.classList.add('sel');
  parent.postMessage({type:'elementClicked',sectionId:sec?sec.dataset.section:null,elementId:el?el.dataset.element:null,elementType:el?el.dataset.type:null},'*');
});
window.addEventListener('message',function(e){
  if(!e.data)return;
  if(e.data.type==='highlight'){
    document.querySelectorAll('.sel').forEach(function(n){n.classList.remove('sel');});
    if(e.data.sectionId){var s=document.querySelector('[data-section="'+e.data.sectionId+'"]');if(s){s.classList.add('sel');s.scrollIntoView({behavior:'smooth',block:'center'});}}
    if(e.data.elementId){var el=document.querySelector('[data-element="'+e.data.elementId+'"]');if(el)el.classList.add('sel');}
  }
  if(e.data.type==='updateContent'){
    var el=document.querySelector('[data-element="'+e.data.elementId+'"]');
    if(el)el.textContent=e.data.content;
  }
});
parent.postMessage({type:'ready'},'*');
</script>
</body></html>`;
}

// ─── React 컴포넌트 ─────────────────────────────────

export default function PreviewRenderer({ sections, colorScheme, productImages, selectedSectionId, selectedElementId, onElementClick, zoom = 100 }) {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);

  const html = buildFullHTML(sections, colorScheme, productImages);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === "ready") readyRef.current = true;
      if (e.data.type === "elementClicked") {
        onElementClick?.(e.data.sectionId, e.data.elementId, e.data.elementType);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onElementClick]);

  useEffect(() => {
    if (readyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "highlight", sectionId: selectedSectionId, elementId: selectedElementId
      }, "*");
    }
  }, [selectedSectionId, selectedElementId]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", background: "#e0e0e0", display: "flex", justifyContent: "center", padding: "24px 0" }}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="preview"
        style={{
          width: 680,
          minHeight: 2000,
          border: "none",
          borderRadius: 6,
          boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
          background: "#fff",
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top center",
        }}
      />
    </div>
  );
}

export { renderSectionHTML, buildFullHTML };
