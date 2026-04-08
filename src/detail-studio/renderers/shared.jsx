import React from "react";

const HANDLE_SIZE = 8;
const HANDLE_COLOR = "#2196F3";
const handlePositions = [
  { cursor: "nw-resize", top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
  { cursor: "n-resize", top: -HANDLE_SIZE/2, left: "50%", ml: -HANDLE_SIZE/2 },
  { cursor: "ne-resize", top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
  { cursor: "w-resize", top: "50%", left: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
  { cursor: "e-resize", top: "50%", right: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
  { cursor: "sw-resize", bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
  { cursor: "s-resize", bottom: -HANDLE_SIZE/2, left: "50%", ml: -HANDLE_SIZE/2 },
  { cursor: "se-resize", bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
];

/**
 * 섹션 렌더링에 필요한 모든 헬퍼를 생성
 * @param {Object} params - 컨텍스트 파라미터
 * @returns {Object} 렌더링 헬퍼 함수들
 */
export function createSectionHelpers({
  i, sec, sections, setSections, selectedEl, setSelectedEl,
  sectionImages, setSectionImages, images, colorPalette,
  acc, isDarkBg, mainColor, bdr, dragRef,
  els, bgCol, heroImgSrc, aiImgSrc, secImg, productImgForSection,
  generateSectionImage,
}) {
  const findEls = (role) => els.filter(e => e.role === role);
  const findEl = (role) => els.find(e => e.role === role);

  const onBlurByRef = (elRef) => (e) => {
    const val = e.currentTarget.textContent;
    const idx = els.indexOf(elRef);
    if (idx < 0) return;
    setSections(prev => prev.map((s, si) => si !== i ? s : {
      ...s, elements: s.elements.map((elem, j) => j === idx ? { ...elem, content: val } : elem),
    }));
  };

  const elIdx = (el) => els.indexOf(el);
  const isSelected = (el) => selectedEl?.secIdx === i && selectedEl?.elIdx === elIdx(el);

  const renderHandles = () => (
    <>
      {handlePositions.map((h, hi) => (
        <div key={hi} style={{
          position: "absolute", width: HANDLE_SIZE, height: HANDLE_SIZE,
          background: "#fff", border: `2px solid ${HANDLE_COLOR}`, borderRadius: 1,
          cursor: h.cursor, zIndex: 10,
          top: h.top, left: h.left, right: h.right, bottom: h.bottom,
          marginLeft: h.ml || 0, marginTop: h.mt || 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} onMouseDown={e => e.stopPropagation()} />
      ))}
      <div style={{
        position: "absolute", top: -28, left: "50%", marginLeft: -6,
        width: 12, height: 12, borderRadius: "50%",
        background: "#fff", border: `2px solid ${HANDLE_COLOR}`,
        cursor: "grab", zIndex: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} onMouseDown={e => e.stopPropagation()} />
      <div style={{
        position: "absolute", top: -16, left: "50%",
        width: 1, height: 16, background: HANDLE_COLOR, zIndex: 9,
      }} />
    </>
  );

  const editable = (el) => {
    const selected = isSelected(el);
    const rawStyle = {
      outline: "none", cursor: selected ? "move" : "text",
      position: "relative", borderRadius: 8,
      padding: selected ? "6px 10px" : "2px 4px",
      border: selected ? `2px solid #2196F3` : "2px solid transparent",
      boxShadow: selected ? "0 0 0 3px rgba(33,150,243,0.15), 0 2px 8px rgba(33,150,243,0.1)" : "none",
      background: selected ? (isDarkBg ? "rgba(33,150,243,0.08)" : "rgba(33,150,243,0.04)") : undefined,
      transition: "border 0.15s, box-shadow 0.15s, background 0.15s, padding 0.15s",
      textShadow: el.textShadow || undefined,
      textAlign: el.textAlign || "center",
      fontFamily: el.fontFamily || undefined,
      fontSize: el.fontSize ? el.fontSize : undefined,
      fontWeight: el.fontWeight || undefined,
      lineHeight: el.lineHeight || undefined,
      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
      marginTop: el.offsetY ? `${el.offsetY}px` : undefined,
      marginLeft: el.offsetX ? `${el.offsetX}px` : undefined,
      ...(el.bgBox ? { background: el.bgBoxColor || (isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"), padding: "8px 14px", borderRadius: el.bgBoxRadius ?? 8 } : {}),
    };
    const style = Object.fromEntries(Object.entries(rawStyle).filter(([_, v]) => v !== undefined));
    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: onBlurByRef(el),
      onClick: (e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: elIdx(el), el: { ...el, _type: "text" } }); },
      onMouseDown: selected ? (e) => {
        if (e.target.closest("[data-handle]")) return;
        dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: el.offsetX || 0, origY: el.offsetY || 0 };
      } : undefined,
      style,
    };
  };

  const eS = (el, defaults) => {
    const merged = { wordBreak: "keep-all", ...defaults, ...editable(el).style };
    const c = (merged.color || "").toLowerCase();
    if (!isDarkBg && (c === "#fff" || c === "#ffffff" || c === "white")) {
      merged.color = (merged.fontWeight === "900" || merged.fontWeight === 900) ? "#1a1a1a" : "#333";
    }
    if (isDarkBg && (c === "#1a1a1a" || c === "#1a1a2e" || c === "#111" || c === "#333" || c === "#000" || c === "#2c2c2c")) {
      merged.color = (merged.fontWeight === "900" || merged.fontWeight === 900) ? "#fff" : "rgba(255,255,255,0.85)";
    }
    return merged;
  };

  const sectionImgInputId = `sec-img-${sec.id}`;
  const handleSectionImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setSectionImages(prev => ({ ...prev, [sec.id]: { loading: false, url: preview, error: null } }));
  };

  const imgButtons = (pos = { top: 12, right: 12 }) => (
    <>
      <div style={{ position: "absolute", ...pos, zIndex: 3, display: "flex", gap: 4 }}>
        <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
          style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
          교체
        </label>
        {sec.image_prompt && (
          <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
            style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            AI 생성
          </button>
        )}
      </div>
      <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
    </>
  );

  const dv = sec.designVariant || 0;

  const decoLine = (color, width = 40) => {
    if (sec._hideDecoLine) return null;
    return (
      <div onClick={e => { e.stopPropagation(); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, _hideDecoLine: true })); }}
        title="클릭하여 제거" style={{ width, height: 2, background: color || mainColor, margin: "0 auto 16px", borderRadius: 1, cursor: "pointer", transition: "opacity 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.4"} onMouseLeave={e => e.currentTarget.style.opacity = "1"} />
    );
  };

  const decoLineLong = (color) => {
    if (sec._hideDecoLine) return null;
    const lineColor = color || (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
    const decoVariant = dv % 3;
    const commonProps = {
      onClick: e => { e.stopPropagation(); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, _hideDecoLine: true })); },
      title: "클릭하여 제거",
      onMouseEnter: e => e.currentTarget.style.opacity = "0.4",
      onMouseLeave: e => e.currentTarget.style.opacity = "1",
      style: { cursor: "pointer", transition: "opacity 0.15s" },
    };
    if (decoVariant === 1) {
      return (
        <div {...commonProps} style={{ ...commonProps.style, display: "flex", gap: 6, justifyContent: "center", margin: "0 auto 24px" }}>
          {Array.from({ length: 5 }, (_, di) => (
            <div key={di} style={{ width: di === 2 ? 8 : 4, height: di === 2 ? 8 : 4, borderRadius: "50%", background: di === 2 ? mainColor : lineColor }} />
          ))}
        </div>
      );
    }
    if (decoVariant === 2) {
      return (
        <div {...commonProps} style={{ ...commonProps.style, margin: "0 auto 24px", textAlign: "center" }}>
          <svg width="80" height="12" viewBox="0 0 80 12" fill="none" style={{ display: "inline-block" }}>
            <path d="M0 6 Q10 0 20 6 T40 6 T60 6 T80 6" stroke={mainColor} strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
        </div>
      );
    }
    return (
      <div {...commonProps} style={{ ...commonProps.style, display: "flex", alignItems: "center", gap: 16, margin: "0 auto 24px", justifyContent: "center", maxWidth: 200 }}>
        <div style={{ flex: 1, height: 1, background: lineColor }} />
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: mainColor }} />
        <div style={{ flex: 1, height: 1, background: lineColor }} />
      </div>
    );
  };

  const renderHeroImage = () => (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {heroImgSrc ? (
        <img src={heroImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})` }} />
      )}
    </div>
  );

  const renderPlaceholder = (h = 280, style = {}) => {
    const imgEl = { type: "image", role: "section_image", secId: sec.id };
    const imgSelected = selectedEl?.el?._type === "image" && selectedEl?.secIdx === i;
    const imgSrc = aiImgSrc || productImgForSection;
    if (imgSrc) return (
      <div onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: -1, el: { ...imgEl, _type: "image" } }); }}
        onMouseDown={imgSelected ? (e) => {
          if (e.target.closest("[data-handle]")) return;
          e.stopPropagation(); e.preventDefault();
          dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: sec.imgProps?.offsetX || 0, origY: sec.imgProps?.offsetY || 0, isImage: true };
        } : undefined}
        style={{ width: "100%", height: h, borderRadius: 16, overflow: "visible", position: "relative", ...style,
          border: imgSelected ? `2px solid #2196F3` : "2px solid transparent",
          cursor: imgSelected ? "move" : "pointer",
          marginTop: sec.imgProps?.offsetY || 0, marginLeft: sec.imgProps?.offsetX || 0,
        }}>
        {imgSelected && renderHandles()}
        <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover",
          borderRadius: sec.imgProps?.borderRadius ?? 14,
          filter: sec.imgProps?.grayscale ? "grayscale(1)" : "none",
          opacity: (sec.imgProps?.opacity ?? 100) / 100,
          transform: `scaleX(${sec.imgProps?.scaleX ?? 1}) scaleY(${sec.imgProps?.scaleY ?? 1}) scale(${(sec.imgProps?.imgScale ?? 100) / 100})`,
        }} />
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
            교체
          </label>
          {sec.image_prompt && (
            <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(124,106,255,0.85)", color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
              AI 생성
            </button>
          )}
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
      </div>
    );
    if (secImg?.loading) return (
      <div style={{ width: "100%", height: h, borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
        <div style={{ color: acc, fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          이미지 생성 중...
        </div>
      </div>
    );
    if (secImg?.error) return (
      <div style={{ width: "100%", height: h, borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff5f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid #fca5a5", ...style }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>이미지 생성 실패</div>
        <div style={{ fontSize: 10, color: "#999", maxWidth: "80%", textAlign: "center", lineHeight: 1.5 }}>{secImg.error.slice(0, 100)}</div>
        <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
          style={{ padding: "6px 16px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
          다시 시도
        </button>
      </div>
    );
    return (
      <div style={{ width: "100%", height: h, borderRadius: 16, position: "relative", overflow: "hidden",
        background: `linear-gradient(145deg, ${mainColor}15, ${mainColor}08)`,
        border: `1px solid ${mainColor}20`, ...style }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "8px 16px", borderRadius: 10, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#f0f0f0", color: isDarkBg ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${bdr}` }}>
            + 이미지 추가
          </label>
          {sec.image_prompt && (
            <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
              style={{ padding: "8px 16px", borderRadius: 10, background: acc, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              AI 이미지 생성
            </button>
          )}
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
      </div>
    );
  };

  const iconCircle = (idx, size = 60) => {
    const icons = ["✦", "◆", "●", "★", "▲", "♦", "◉", "⬟", "⬡"];
    const iconImgId = `icon-img-${sec.id}-${idx}`;
    const iconImg = sec[`iconImg_${idx}`];
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: iconImg ? "transparent" : `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: iconImg ? "none" : `1.5px solid ${mainColor}25`, overflow: "hidden", cursor: "pointer", position: "relative" }}
        onClick={e => { e.stopPropagation(); document.getElementById(iconImgId)?.click(); }}>
        {iconImg ? (
          <img src={iconImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: size * 0.35, color: mainColor }}>{icons[idx % icons.length]}</span>
        )}
        <input id={iconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${idx}`]: url }));
          }
        }} />
      </div>
    );
  };

  const onImageClick = (el) => (e) => {
    e.stopPropagation();
    setSelectedEl({ secIdx: i, elIdx: elIdx(el), el: { ...el, _type: "image" } });
  };

  const SelectionWrap = ({ el, children, style: wrapStyle = {} }) => {
    const selected = isSelected(el);
    return (
      <div
        onMouseDown={selected ? (e) => {
          if (e.target.closest("[data-handle]")) return;
          e.stopPropagation(); e.preventDefault();
          dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, origX: el.offsetX || 0, origY: el.offsetY || 0 };
        } : undefined}
        style={{ position: "relative", ...wrapStyle, border: selected ? `2px solid ${HANDLE_COLOR}` : "2px solid transparent", borderRadius: selected ? 2 : 0, transition: "border 0.1s", cursor: selected ? "move" : "default" }}>
        {selected && renderHandles()}
        {children}
      </div>
    );
  };

  return {
    findEl, findEls, editable, eS, renderHandles, imgButtons,
    decoLine, decoLineLong, renderHeroImage, renderPlaceholder,
    iconCircle, onImageClick, SelectionWrap,
    // pass-through values renderers need
    dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection,
    colorPalette, sectionImages, secImg,
  };
}
