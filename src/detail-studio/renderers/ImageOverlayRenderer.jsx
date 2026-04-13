import React from "react";

/**
 * AI 이미지 + 텍스트 오버레이 렌더러
 * AI가 생성한 디자인 이미지를 배경으로 표시하고,
 * 텍스트 요소를 절대위치 오버레이로 배치.
 * 텍스트는 기존 editable()/eS() 헬퍼로 편집 가능.
 */

// 섹션 타입별 텍스트 기본 위치 프리셋
const TEXT_POSITION_PRESETS = {
  hero: { title: { posY: "55%", posX: "50%", align: "center" }, subtitle: { posY: "48%", posX: "50%", align: "center" }, body: { posY: "68%", posX: "50%", align: "center" } },
  pain_points: { title: { posY: "12%", posX: "50%", align: "center" }, subtitle: { posY: "6%", posX: "50%", align: "center" }, body: { posY: "30%", posX: "50%", align: "center" } },
  features: { title: { posY: "8%", posX: "50%", align: "center" }, subtitle: { posY: "3%", posX: "50%", align: "center" }, body: { posY: "20%", posX: "50%", align: "center" } },
  point: { title: { posY: "35%", posX: "70%", align: "center" }, subtitle: { posY: "28%", posX: "70%", align: "center" }, body: { posY: "50%", posX: "70%", align: "center" } },
  stats_highlight: { title: { posY: "10%", posX: "50%", align: "center" }, stat_number: { posY: "40%", posX: "50%", align: "center" }, stat_label: { posY: "55%", posX: "50%", align: "center" } },
  review: { title: { posY: "8%", posX: "50%", align: "center" }, review_text: { posY: "35%", posX: "50%", align: "center" }, review_name: { posY: "60%", posX: "50%", align: "center" } },
  cta: { title: { posY: "20%", posX: "50%", align: "center" }, body: { posY: "30%", posX: "50%", align: "center" }, price: { posY: "70%", posX: "50%", align: "center" } },
  event: { title: { posY: "15%", posX: "50%", align: "center" }, subtitle: { posY: "8%", posX: "50%", align: "center" }, body: { posY: "35%", posX: "50%", align: "center" } },
  howto: { title: { posY: "8%", posX: "50%", align: "center" }, body: { posY: "25%", posX: "50%", align: "center" } },
};

export function renderImageTextOverlay(ctx) {
  const {
    editable, eS, imgButtons, sec, i, els, aiImgSrc,
    isDarkBg, mainColor, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage,
  } = ctx;

  const secType = sec.type || "point";
  const textEls = els.filter(e => e.type === "text");
  const preset = TEXT_POSITION_PRESETS[secType] || TEXT_POSITION_PRESETS.point;

  // 텍스트별 위치 계산
  const getTextPos = (el, elIdx) => {
    // 요소에 직접 지정된 posY가 있으면 사용
    if (el.posY) return { top: el.posY, left: el.posX || "50%", textAlign: el.posAlign || "center" };
    // 프리셋에서 역할별 위치
    const rolePreset = preset[el.role];
    if (rolePreset) return { top: rolePreset.posY, left: rolePreset.posX, textAlign: rolePreset.align };
    // 기본: 역할 없는 텍스트는 순서대로 배치
    const baseY = 40 + elIdx * 10;
    return { top: `${Math.min(baseY, 85)}%`, left: "50%", textAlign: "center" };
  };

  // 텍스트 색상 결정 (이미지 위이므로 기본적으로 흰색 + 그림자)
  const getTextColor = (el) => {
    if (el.color && el.color !== "#1a1a1a" && el.color !== "#333" && el.color !== "#333333") return el.color;
    return "#ffffff";
  };

  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden", minHeight: isMobile ? 500 : 800 }}>
      {/* AI 생성 이미지 (배경) */}
      <img
        src={aiImgSrc}
        alt=""
        style={{
          width: "100%",
          display: "block",
          minHeight: isMobile ? 500 : 800,
          objectFit: "cover",
        }}
        onError={(e) => { e.target.style.display = "none"; }}
      />

      {/* 이미지 교체/생성 버튼 */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5, display: "flex", gap: 4 }}>
        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
          style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          교체
        </label>
        {sec.image_prompt && (
          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
            style={{ padding: "6px 14px", borderRadius: 8, background: `${mainColor}dd`, backdropFilter: "blur(8px)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            AI 재생성
          </button>
        )}
      </div>
      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />

      {/* 텍스트 오버레이 */}
      {textEls.map((el, elIdx) => {
        const pos = getTextPos(el, elIdx);
        const color = getTextColor(el);
        const offsetX = el.offsetX || 0;
        const offsetY = el.offsetY || 0;

        return (
          <div
            key={elIdx}
            {...editable(el)}
            style={{
              ...eS(el, {
                color,
                textShadow: "0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
              }),
              position: "absolute",
              top: pos.top,
              left: pos.left,
              transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`,
              textAlign: pos.textAlign,
              maxWidth: isMobile ? "85%" : "70%",
              zIndex: 2,
              pointerEvents: "auto",
            }}
          >
            {el.content}
          </div>
        );
      })}
    </div>
  );
}
