import { createSectionHelpers } from "./shared.jsx";
import { renderHero } from "./HeroRenderers.jsx";
import { renderPainPoints } from "./PainPointsRenderer.jsx";
import { renderFeatures } from "./FeaturesRenderer.jsx";
import { renderPoint } from "./PointRenderers.jsx";
import { renderContent } from "./ContentRenderers.jsx";
import { renderProcess } from "./ProcessRenderer.jsx";
import { renderCompare } from "./CompareRenderer.jsx";
import { renderPromo } from "./PromoRenderer.jsx";
import { renderMisc } from "./MiscRenderer.jsx";
import { normHex, parseBgColor } from "../utils.jsx";

/**
 * 섹션 렌더링 디스패처
 * DetailPageStudio의 거대한 IIFE를 대체
 */
export function renderSection({
  i, sec, sections, setSections, selectedEl, setSelectedEl,
  sectionImages, setSectionImages, images, colorPalette,
  acc, D, bdr, muted, text, canvasZoom, activeSection, isMobile,
  dragRef, generateSectionImage, productName, extraInfo,
}) {
  const secType = sec.type || "point";
  const layout = sec.layout || "centered_text";
  const secImg = sectionImages[sec.id];
  const heroImgSrc = images.length > 0 ? images[0].preview : null;
  const aiImgSrc = secImg?.url || null;
  const els = sec.elements || [];

  // 그라데이션 배경 지원: linear-gradient로 시작하면 normHex 건너뜀
  const rawBg = sec.bg_color || "#ffffff";
  const bgCol = rawBg.startsWith("linear-gradient") ? rawBg : (normHex(rawBg) || "#ffffff");
  const { isDarkBg } = parseBgColor(rawBg.startsWith("linear-gradient") ? (rawBg.includes("#0") || rawBg.includes("#1") || rawBg.includes("#2") ? "#111" : "#fff") : bgCol);

  // 제품 이미지 자동 분배 (features/point/cta에도 적극 분배)
  const imgLayouts = ["full_image", "text_over_image", "left_image_right_text", "right_image_left_text"];
  const imgSectionTypes = ["hero", "before_after", "features", "point", "cta", "review", "event"];
  const needsImage = imgLayouts.includes(layout) || imgSectionTypes.includes(secType);
  let productImgForSection = null;
  if (needsImage && images.length > 0) {
    if (images.length >= 2) {
      productImgForSection = images[i % images.length]?.preview || null;
    } else {
      productImgForSection = images[0]?.preview || null;
    }
  }
  const mainColor = colorPalette?.main || acc;

  // 공유 헬퍼 생성
  const helpers = createSectionHelpers({
    i, sec, sections, setSections, selectedEl, setSelectedEl,
    sectionImages, setSectionImages, images, colorPalette,
    acc, isDarkBg, mainColor, bdr, dragRef,
    els, bgCol, heroImgSrc, aiImgSrc, secImg, productImgForSection,
    generateSectionImage,
  });

  // ctx에 추가 값 병합
  const ctx = {
    ...helpers,
    layout, secType, isMobile, productName, extraInfo, sections,
    sectionImgInputId: `sec-img-${sec.id}`,
    handleSectionImageChange: async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setSectionImages(prev => ({ ...prev, [sec.id]: { loading: false, url: preview, error: null } }));
    },
    setSections,
  };

  // 디스패치 순서: layout 먼저 → secType
  let result;

  // Hero 계열
  if (layout === "color_overlay" || layout === "set_intro" || layout === "eco_hero_features" ||
      layout === "pattern_lookbook" || layout === "collection_intro" ||
      secType === "hero" || (layout === "full_image" && i === 0)) {
    result = renderHero(ctx);
    if (result) return result;
  }

  // Pain Points 계열
  if (layout === "qa_bubble" || secType === "pain_points") {
    result = renderPainPoints(ctx);
    if (result) return result;
  }

  // Features 계열
  if (layout === "center_product_4point" || secType === "features" || layout === "grid_2col" || layout === "grid_3col") {
    result = renderFeatures(ctx);
    if (result) return result;
  }

  // Point 계열
  if (layout === "checkpoint_list" || layout === "ingredient_grid" || layout === "product_lineup" ||
      layout === "point_ingredient_card" || layout === "minimal_product_features" ||
      secType === "point" || secType === "concept") {
    result = renderPoint(ctx);
    if (result) return result;
  }

  // Content 계열
  if (secType === "review" || layout === "card_list" || secType === "stats_highlight") {
    result = renderContent(ctx);
    if (result) return result;
  }

  // Process 계열
  if (layout === "mechanism_steps" || secType === "howto" || secType === "process_steps") {
    result = renderProcess(ctx);
    if (result) return result;
  }

  // Compare 계열
  if (secType === "cert" || secType === "facility" || layout === "detail_compare_table" ||
      secType === "comparison" || secType === "before_after") {
    result = renderCompare(ctx);
    if (result) return result;
  }

  // Promo 계열
  if (secType === "pricing" || secType === "faq" || secType === "guarantee" ||
      secType === "shipping" || secType === "info" || secType === "contact" ||
      layout === "bundle_promo" || layout === "promo_full" ||
      secType === "event" || secType === "cta") {
    result = renderPromo(ctx);
    if (result) return result;
  }

  // Misc (ai_notice, quote_box, full_image, default fallback)
  return renderMisc(ctx);
}
