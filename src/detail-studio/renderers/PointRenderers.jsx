import React from "react";

export function renderPoint(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection,
    colorPalette, sectionImages, secImg,
    layout: _layoutFromCtx, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage, setSections, sections, productName
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layout = ctx.sec.layout || "centered_text";

  // [키워드] 볼드 처리 — 공통 유틸
  const renderBoldBracket = (text, opts = {}) => {
    if (!text) return null;
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((p, pi) => {
      if (p.startsWith("[") && p.endsWith("]")) {
        return (
          <strong key={pi} style={{ fontWeight: 900, color: opts.boldColor || (isDarkBg ? "#ffffff" : "#1a1a1a") }}>
            {p.slice(1, -1)}
          </strong>
        );
      }
      if (opts.wrapSpan) {
        return <span key={pi} style={opts.wrapSpan(p)}>{p}</span>;
      }
      return p;
    });
  };

  // ════════════════════════════════════════
  //  POINT — 체크포인트형 (브랜드+이미지+체크리스트)
  // ════════════════════════════════════════
  if (layout === "checkpoint_list") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const captionEl = els.find(e => e.role_hint === "caption");
    const colTitleEl = els.find(e => e.role_hint === "col_title");
    const checkEls = els.filter(e => e.role_hint === "check");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const checkColor = isDarkBg ? "#7a8c6e" : "#7a8c6e";

    return (
      <div style={{ background: bgCol, padding: "56px 48px 64px" }}>
        {/* 브랜드 헤더 */}
        {subtitleEl && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>
            <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#dddddd", margin: "12px auto 0" }} />
          </div>
        )}
        {/* 헤드라인 */}
        {titleEl && (
          <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 22, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", lineHeight: 1.6, marginBottom: 40 })}>
            {renderBoldBracket(titleEl.content)}
          </div>
        )}
        {/* 히어로 이미지 */}
        <div style={{ width: "100%", maxWidth: 480, height: 280, margin: "0 auto 16px", borderRadius: 12, background: isDarkBg ? "#1a1a1a" : "#f5f2ee", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 180, height: 160, background: isDarkBg ? "radial-gradient(circle, #222 30%, #1a1a1a 100%)" : "radial-gradient(circle, #fff 30%, #f0ece6 100%)", borderRadius: "50%", opacity: 0.8 }} />
          )}
          {imgButtons()}
        </div>
        {/* 캡션 */}
        {captionEl && <div {...editable(captionEl)} style={eS(captionEl, { textAlign: "center", fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", marginBottom: 36 })}>{captionEl.content}</div>}
        {/* 2컬럼 체크리스트 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#eeeeee"}` }}>
          <div style={{ padding: "28px 24px", borderRight: isMobile ? "none" : `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#eeeeee"}` }}>
            {colTitleEl && <div {...editable(colTitleEl)} style={eS(colTitleEl, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", marginBottom: 16 })}>{colTitleEl.content}</div>}
            {checkEls.slice(0, Math.ceil(checkEls.length / 2)).map((el, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M4 9l3.5 3.5L14 5" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#555555", lineHeight: 1.6 })}>{el.content}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "28px 24px" }}>
            <div style={{ height: colTitleEl ? 29 : 0, marginBottom: colTitleEl ? 16 : 0 }} />
            {checkEls.slice(Math.ceil(checkEls.length / 2)).map((el, ci) => (
              <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M4 9l3.5 3.5L14 5" stroke={checkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#555555", lineHeight: 1.6 })}>{el.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  POINT — 원재료 그리드 (4열 원형 이미지)
  // ════════════════════════════════════════
  if (layout === "ingredient_grid") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const infoDescEl = els.find(e => e.role_hint === "info_desc");
    const ingredientEls = els.filter(e => e.role_hint === "ingredient");

    return (
      <div style={{ background: bgCol, padding: "56px 48px 64px" }}>
        {/* 브랜드 헤더 */}
        {subtitleEl && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>
            <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.1)" : "#dddddd", margin: "12px auto 0" }} />
          </div>
        )}
        {/* 타이틀 */}
        {titleEl && (
          <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 24, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", marginBottom: 32, lineHeight: 1.5 })}>
            {renderBoldBracket(titleEl.content)}
          </div>
        )}
        {/* 정보 박스 */}
        {infoDescEl && (
          <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f8f6f3", borderRadius: 8, padding: "24px 28px", marginBottom: 40, maxWidth: 400, marginLeft: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</div>
            <div {...editable(infoDescEl)} style={eS(infoDescEl, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", lineHeight: 1.7 })}>{infoDescEl.content}</div>
          </div>
        )}
        {/* 4열 원형 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "28px 20px" }}>
          {ingredientEls.map((el, ii) => {
            const parts = el.content.split("|");
            const name = parts[0]?.trim();
            const desc = parts[1]?.trim() || "";
            const ingredImgId = `ingred-${sec.id}-${ii}`;
            return (
              <div key={ii} style={{ textAlign: "center" }}>
                <div style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 12px", overflow: "hidden", background: isDarkBg ? "#1a1a1a" : "#f5f2ee", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                  onClick={() => document.getElementById(ingredImgId)?.click()}>
                  {sec[`ingredImg_${ii}`] ? (
                    <img src={sec[`ingredImg_${ii}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: isDarkBg ? "#222222" : "#e8e2da" }} />
                  )}
                  <input id={ingredImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`ingredImg_${ii}`]: url })); }
                  }} />
                </div>
                <div {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.85)" : "#333333", marginBottom: 4 })}>{name}</div>
                <div style={{ fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", lineHeight: 1.4 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  POINT — 제품 라인업 3열 (컬러카드+말풍선+제품명)
  // ════════════════════════════════════════
  if (layout === "product_lineup") {
    const titleEl = findEl("title");
    const lineupItems = els.filter(e => e.role_hint === "lineup_item");

    const renderBoldBracketLineup = (text) => {
      if (!text) return null;
      return text.split(/(\[.*?\])/g).map((p, pi) => p.startsWith("[") && p.endsWith("]")
        ? <span key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ff8080" : "#e04040" }}>{p.slice(1, -1)}</span>
        : <span key={pi} style={{ fontWeight: p === " 라인업" || p.includes("라인업") ? 900 : 400 }}>{p}</span>
      );
    };

    return (
      <div style={{ background: bgCol, padding: "56px 40px 64px" }}>
        {/* 헤드라인 */}
        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 24, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", marginBottom: 40, lineHeight: 1.5 })}>{renderBoldBracketLineup(titleEl.content)}</div>}

        {/* 3열 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${lineupItems.length}, 1fr)`, gap: 16 }}>
          {lineupItems.map((el, li) => {
            const parts = el.content.split("|");
            const bubble = parts[0]?.trim();
            const productNameItem = parts[1]?.trim() || "";
            const origin = parts[2]?.trim() || "";
            const amount = parts[3]?.trim() || "";
            const colors = (parts[4] || "#c08080,#a06060").split(",").map(s => s.trim());
            const imgId = `lineup-img-${sec.id}-${li}`;

            // 제품명에서 앞부분 컬러 강조
            const nameParts = productNameItem.split(" ");
            const accentName = nameParts.slice(0, -1).join(" ");
            const restName = nameParts[nameParts.length - 1] || "";

            return (
              <div key={li} style={{ borderRadius: 16, overflow: "hidden" }}>
                {/* 상단 컬러 영역 */}
                <div style={{ background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`, padding: "24px 16px 0", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* 말풍선 */}
                  <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 20, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#333333", textAlign: "center", lineHeight: 1.5, marginBottom: 16, position: "relative" }}>
                    {bubble}
                    <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid rgba(255,255,255,0.9)" }} />
                  </div>
                  {/* 제품 이미지 */}
                  <div style={{ width: 140, height: 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                    onClick={() => document.getElementById(imgId)?.click()}>
                    {sec[`lineupImg_${li}`] ? (
                      <img src={sec[`lineupImg_${li}`]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ width: 100, height: 140, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>PRODUCT</div>
                    )}
                    <input id={imgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`lineupImg_${li}`]: url })); }
                    }} />
                  </div>
                </div>
                {/* 하단 정보 */}
                <div style={{ padding: "20px 16px 24px", background: isDarkBg ? "#1a1a1a" : "#ffffff", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>
                    <span style={{ color: colors[0], fontWeight: 900 }}>{accentName}</span> {restName}
                  </div>
                  <div style={{ fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", lineHeight: 1.6, marginBottom: 8 }}>{origin}</div>
                  <div {...editable(el)} style={eS(el, { fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666" })}>{amount}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  POINT — 포인트 성분 카드 (배지+헤드라인+둥근카드 2열 원형)
  // ════════════════════════════════════════
  if (layout === "point_ingredient_card") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const descEl = els.find(e => e.role === "body" && !e.role_hint);
    const ingredCards = els.filter(e => e.role_hint === "ingredient_card");
    const accentDark = "#2c3e5c";
    const accentLight = mainColor || "#4a7fb5";

    return (
      <div style={{ background: bgCol, padding: "64px 48px 0", position: "relative" }}>
        {/* POINT 배지 */}
        {subtitleEl && (
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span {...editable(subtitleEl)} style={eS(subtitleEl, { display: "inline-block", padding: "8px 24px", background: isDarkBg ? "rgba(255,255,255,0.1)" : "#f0f0f0", borderRadius: 24, fontSize: 14, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888888", letterSpacing: 2 })}>{subtitleEl.content}</span>
          </div>
        )}
        {/* 헤드라인 */}
        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 28, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.45, marginBottom: 24 })}>{titleEl.content}</div>}
        {/* 설명 */}
        {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.8, marginBottom: 48, whiteSpace: "pre-line" })}>{descEl.content}</div>}
        {/* 둥근 카드 */}
        <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#ffffff", borderRadius: 24, padding: isMobile ? "36px 24px" : "48px 40px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${ingredCards.length}, 1fr)`, gap: 40, boxShadow: isDarkBg ? "0 2px 20px rgba(0,0,0,0.1)" : "0 2px 20px rgba(0,0,0,0.04)" }}>
          {ingredCards.map((el, ci) => {
            const parts = el.content.split("|");
            const name = parts[0]?.trim();
            const desc = parts[1]?.trim() || "";
            const imgId = `pic-${sec.id}-${ci}`;
            return (
              <div key={ci} style={{ textAlign: "center" }}>
                <div style={{ width: 160, height: 160, borderRadius: "50%", margin: "0 auto 20px", overflow: "hidden", background: isDarkBg ? "rgba(255,255,255,0.06)" : (ci % 2 === 0 ? "#f0f4f0" : "#e8f0f8"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                  onClick={() => document.getElementById(imgId)?.click()}>
                  {sec[`picImg_${ci}`] ? (
                    <img src={sec[`picImg_${ci}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: isDarkBg ? "rgba(255,255,255,0.12)" : (ci % 2 === 0 ? "linear-gradient(135deg, #d4e8d0, #b8d8b0)" : "linear-gradient(135deg, #d0e4f0, #b0d0e8)") }} />
                  )}
                  <input id={imgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`picImg_${ci}`]: url })); }
                  }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>{name}</div>
                <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.7 })}>{desc}</div>
              </div>
            );
          })}
        </div>
        {/* 하단 컬러 블록 */}
        <div style={{ display: "flex", marginTop: 0 }}>
          <div style={{ flex: 1, height: 12, background: isDarkBg ? "#1e2d44" : accentDark }} />
          <div style={{ flex: 1, height: 12, background: isDarkBg ? "#2a5580" : accentLight }} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  POINT — 미니멀 제품 소개형 (서브+타이틀+이미지+4열 특징)
  // ════════════════════════════════════════
  if (layout === "minimal_product_features") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const descEl = els.find(e => e.role === "body" && !e.role_hint);
    const featureItems = els.filter(e => e.role_hint === "feature_item");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    const featureIcons = [
      <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><circle cx="18" cy="18" r="14"/><path d="M18 10v8l5 3"/><path d="M10 26l3-3M26 26l-3-3"/></svg>,
      <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><path d="M18 6C13 6 8 12 8 18c0 8 10 14 10 14s10-6 10-14c0-6-5-12-10-12z"/><path d="M14 18c0-2.2 1.8-4 4-4"/></svg>,
      <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><circle cx="18" cy="18" r="10"/><circle cx="18" cy="18" r="4"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4"/></svg>,
      <svg viewBox="0 0 36 36" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.5)" : "#555555"} strokeWidth="1.4" strokeLinecap="round"><path d="M12 28c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="14" r="6"/><path d="M28 12l2-2M6 12l-2-2"/><path d="M18 4v2"/></svg>,
    ];

    return (
      <div style={{ background: bgCol, padding: "64px 48px 56px" }}>
        {/* 서브타이틀 */}
        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", marginBottom: 10 })}>{subtitleEl.content}</div>}
        {/* 대형 타이틀 */}
        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 36, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 24, lineHeight: 1.3 })}>{titleEl.content}</div>}
        {/* 설명 */}
        {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 48px" })}>{descEl.content}</div>}
        {/* 제품 이미지 */}
        <div style={{ width: "100%", maxWidth: 480, height: 340, margin: "0 auto 56px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderRadius: 12, overflow: "hidden" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
              <div style={{ width: 100, height: 240, background: isDarkBg ? "linear-gradient(180deg, #333, #222)" : "linear-gradient(180deg, #e0dcd5, #d0ccc5)", borderRadius: "24px 24px 8px 8px", boxShadow: `0 8px 32px rgba(0,0,0,${isDarkBg ? "0.3" : "0.12"})`, position: "relative" }}>
                <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 50, height: 60, background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
              </div>
              <div style={{ width: 80, height: 260, background: isDarkBg ? "#222222" : "#1a1a1a", borderRadius: 6, boxShadow: `0 8px 32px rgba(0,0,0,${isDarkBg ? "0.4" : "0.15"})`, position: "relative" }}>
                <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4 }} />
              </div>
            </div>
          )}
          {imgButtons()}
        </div>
        {/* 4열 특징 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16, borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#e8e8e8"}`, paddingTop: 40 }}>
          {featureItems.map((el, fi) => (
            <div key={fi} style={{ textAlign: "center" }}>
              <div style={{ width: 44, height: 44, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {React.cloneElement(featureIcons[fi % featureIcons.length], { style: { width: 36, height: 36 } })}
              </div>
              <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#444444", lineHeight: 1.6 })}>{el.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  POINT / DETAIL (좌우 교차)
  // ════════════════════════════════════════
  if (secType === "point" || secType === "concept" || layout === "left_image_right_text" || layout === "right_image_left_text") {
    const isOdd = i % 2 === 1;
    const imgLeft = layout === "left_image_right_text" || (!layout?.includes("right") && isOdd);
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const bodyEls = findEls("body");
    const badge = els.find(e => e.type === "badge");
    const pointNum = (() => {
      // point 타입만 필터링하여 순서 번호 부여 (concept 제외)
      const pointOnly = sections.filter((s, si) => si <= i && s.type === "point");
      if (pointOnly.length > 0) return pointOnly.length;
      // point 타입이 없으면 concept 포함하여 카운트
      return sections.filter((s, si) => si <= i && (s.type === "point" || s.type === "concept")).length;
    })();
    const hasImage = aiImgSrc || productImgForSection;
    const fallbackImg = images[0]?.preview || null;
    const displayImgSrc = hasImage ? (aiImgSrc || productImgForSection) : fallbackImg;

    // ═══ 레이아웃 구조 변형 (dv에 따라 완전히 다른 구조) ═══

    // 변형: 소프트컬러 배경 + 중앙 타이틀 + 태그 뱃지 + 대형 제품 (레퍼런스 기반)
    if (dv % 6 === 2) {
      return (
        <div style={{ background: `linear-gradient(180deg, ${mainColor}12 0%, ${mainColor}20 40%, ${mainColor}30 100%)`, position: "relative", overflow: "hidden" }}>
          {/* 배경 워터마크 */}
          <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontSize: 80, fontWeight: 900, color: "rgba(255,255,255,0.15)", letterSpacing: 8, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 0 }}>
            {(productName || "BRAND").toUpperCase()}
          </div>
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 48px 60px" }}>
            {/* 영문 서브타이틀 */}
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: mainColor, marginBottom: 16, letterSpacing: 1 })}>{subtitleEl.content}</div>}
            {/* 대형 타이틀 */}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.45, marginBottom: 28, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>{titleEl.content}</div>}
            {/* 태그 뱃지 */}
            {bodyEls.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 48, flexWrap: "wrap" }}>
                {bodyEls.slice(0, 4).map((el, bi) => (
                  <span key={bi} {...editable(el)} style={eS(el, { padding: "10px 20px", borderRadius: 24, background: mainColor, color: "#fff", fontSize: 13, fontWeight: 700, display: "inline-block" })}>{el.content}</span>
                ))}
              </div>
            )}
            {/* 대형 제품 이미지 */}
            <div style={{ width: 280, height: 420, margin: "0 auto", position: "relative" }}>
              {displayImgSrc ? (
                <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.1))" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", borderRadius: 16, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
              {imgButtons()}
              {/* 물방울 데코 */}
              <div style={{ position: "absolute", top: -16, right: -24, width: 14, height: 14, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
              <div style={{ position: "absolute", top: 40, left: -16, width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
              <div style={{ position: "absolute", bottom: 80, right: -32, width: 11, height: 11, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
            </div>
          </div>
        </div>
      );
    }

    // 변형 A (dv 1): 풀너비 이미지 상단 + 하단 텍스트 (세로 스택)
    if (dv % 6 === 1) {
      return (
        <div style={{ background: bgCol }}>
          {/* 풀너비 이미지 — 섹션의 60% */}
          <div style={{ width: "100%", height: 700, position: "relative", overflow: "hidden" }}>
            {displayImgSrc ? (
              <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : renderPlaceholder(700, { borderRadius: 0 })}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.15) 100%)" }} />
            {imgButtons()}
          </div>
          {/* 하단 텍스트 블록 — 중앙 정렬 통일 */}
          <div style={{ padding: "80px 64px 100px", textAlign: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3 }}>POINT {String(pointNum).padStart(2, "0")}</span>
            {decoLine(mainColor, 32)}
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 24 })}>{titleEl.content}</div>}
            {bodyEls.map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#555", lineHeight: 1.9, marginBottom: 14, maxWidth: 560, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
            ))}
          </div>
        </div>
      );
    }

    // 변형 B (dv 3): 이미지 배경 풀스크린 + 텍스트 오버레이 (잡지 스타일)
    if (dv % 6 === 3) {
      return (
        <div style={{ width: "100%", minHeight: 1260, position: "relative", overflow: "hidden", background: isDarkBg ? bgCol : "#111" }}>
          {displayImgSrc ? (
            <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.7 }} />
          ) : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${mainColor}30, #1a1a2e)` }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.7) 100%)" }} />
          <div style={{ position: "relative", zIndex: 2, padding: "0 64px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 140 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, marginBottom: 20, display: "block" }}>POINT {String(pointNum).padStart(2, "0")}</span>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: 2, marginBottom: 16 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 28, maxWidth: 500 })}>{titleEl.content}</div>}
            {bodyEls.map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, marginBottom: 12, maxWidth: 480 })}>{el.content}</div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
            <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
          </div>
          <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
        </div>
      );
    }

    // ═══ 변형 4: 중앙 정렬 카드 (이미지 위 + 텍스트 아래, 배경 패턴) ═══
    if (dv % 6 === 4) {
      return (
        <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "120px 64px", position: "relative", overflow: "hidden" }}>
          {/* 미세한 도트 패턴 배경 */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none", backgroundImage: `radial-gradient(${isDarkBg ? "#fff" : "#000"} 1px, transparent 1px)`, backgroundSize: "20px 20px" }} />
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            {/* 넘버 배지 */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
              <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4 }}>POINT {String(pointNum).padStart(2, "0")}</span>
              <div style={{ width: 40, height: 1, background: isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
            </div>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12, letterSpacing: 1 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 26 : 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 20 })}>{titleEl.content}</div>}
            {bodyEls.map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 10 })}>{el.content}</div>
            ))}
            {/* 둥근 모서리 이미지 카드 */}
            <div style={{ marginTop: 40, borderRadius: 20, overflow: "hidden", boxShadow: isDarkBg ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.08)", position: "relative" }}>
              {displayImgSrc ? (
                <img src={displayImgSrc} alt="" style={{ width: "100%", height: isMobile ? 300 : 450, objectFit: "cover" }} />
              ) : renderPlaceholder(isMobile ? 300 : 450, { borderRadius: 0 })}
              {imgButtons()}
            </div>
          </div>
        </div>
      );
    }

    // ═══ 변형 5: 숫자 강조형 (대형 넘버 + 설명 + 하단 이미지 스트립) ═══
    if (dv % 6 === 5) {
      return (
        <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "120px 64px", position: "relative" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            {/* 대형 넘버 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 20 : 40, marginBottom: 48 }}>
              <span style={{ fontSize: isMobile ? 72 : 100, fontWeight: 900, color: mainColor, lineHeight: 1, fontFamily: "Georgia, serif", flexShrink: 0, opacity: 0.8 }}>
                {String(pointNum).padStart(2, "0")}
              </span>
              <div style={{ paddingTop: isMobile ? 8 : 16 }}>
                {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 8, letterSpacing: 1 })}>{subtitleEl.content}</div>}
                {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3, marginBottom: 16 })}>{titleEl.content}</div>}
                {bodyEls.map((el, bi) => (
                  <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 8 })}>{el.content}</div>
                ))}
              </div>
            </div>
            {/* 풀 너비 이미지 */}
            <div style={{ borderRadius: 16, overflow: "hidden", position: "relative" }}>
              {displayImgSrc ? (
                <img src={displayImgSrc} alt="" style={{ width: "100%", height: isMobile ? 280 : 400, objectFit: "cover" }} />
              ) : renderPlaceholder(isMobile ? 280 : 400, { borderRadius: 0 })}
              {imgButtons()}
            </div>
          </div>
        </div>
      );
    }

    // ═══ 변형 0: "Choice XX" 스타일 (A;ROUND 레퍼런스) ═══
    // 50:50 — 왼쪽 제품 이미지(깔끔) + 오른쪽 Choice 넘버링 + 영문 타이틀 + 한글 설명

    const textBlock = (
      <div style={{ flex: "0 0 45%", padding: isMobile ? "48px 24px" : "100px 56px", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left" }}>
        {/* Choice 넘버링 */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#aaa", letterSpacing: 1, fontFamily: "'Georgia', serif" }}>
            Choice {String(pointNum).padStart(2, "0")}.
          </span>
        </div>
        {badge && (
          <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 16px", borderRadius: 24, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 18, alignSelf: "flex-start", border: `1px solid ${mainColor}20` })}>
            {badge.content}
          </span>
        )}
        {subtitleEl && (
          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: mainColor, marginBottom: 12, letterSpacing: 1, textAlign: "left" })}>
            {subtitleEl.content}
          </div>
        )}
        {/* 타이틀 — 큰 볼드 */}
        {titleEl && (
          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 30, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25, marginBottom: 12, textAlign: "left", letterSpacing: -0.5 })}>
            {titleEl.content}
          </div>
        )}
        {/* 서브타이틀 */}
        {subtitleEl && (
          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 500, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", marginBottom: 20, textAlign: "left", lineHeight: 1.6 })}>
            {subtitleEl.content}
          </div>
        )}
        {/* 설명 텍스트 */}
        {bodyEls.map((el, bi) => (
          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.6)" : "#666"), lineHeight: 1.8, marginBottom: 10, textAlign: "left" })}>
            {el.content}
          </div>
        ))}
        {!subtitleEl && !titleEl && bodyEls.length === 0 && els.filter(e => e.type === "text").map((el, ei) => (
          <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.fontWeight === "900" ? 32 : el.fontWeight === "700" ? 16 : 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: el.fontWeight === "900" ? 1.25 : 1.9, marginBottom: el.fontWeight === "900" ? 24 : 12, textAlign: "left" })}>
            {el.content}
          </div>
        ))}
      </div>
    );

    // 이미지 블록 — 레퍼런스 스타일: 깔끔한 제품 이미지, 오버레이 최소화
    const imgMinH = 700;
    const showImgNum = false;
    const imgOverlay = "none";

    const imageBlock = displayImgSrc ? (
      <div style={{ flex: "0 0 55%", minHeight: imgMinH, position: "relative", overflow: "hidden", boxShadow: imgLeft ? "12px 0 40px rgba(0,0,0,0.06)" : "-12px 0 40px rgba(0,0,0,0.06)" }}>
        {hasImage ? renderPlaceholder(imgMinH, { borderRadius: 0 }) : (
          <img src={displayImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: imgOverlay, pointerEvents: "none" }} />
        {showImgNum && <div style={{ position: "absolute", bottom: 32, [imgLeft ? "right" : "left"]: 32, pointerEvents: "none" }}>
          <span style={{ fontSize: 96, fontWeight: 900, color: "rgba(255,255,255,0.12)", fontFamily: "'Georgia', serif", lineHeight: 1, letterSpacing: -4 }}>
            {String(pointNum).padStart(2, "0")}
          </span>
        </div>}
        {/* 이미지 교체 버튼 */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
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
      </div>
    ) : (
      <div style={{ flex: "0 0 55%", minHeight: 600, position: "relative", overflow: "hidden", background: `linear-gradient(145deg, ${mainColor}12, ${mainColor}06)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: imgLeft ? "12px 0 40px rgba(0,0,0,0.06)" : "-12px 0 40px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: `${mainColor}12`, fontFamily: "'Georgia', serif", lineHeight: 1, letterSpacing: -6 }}>
            {String(pointNum).padStart(2, "0")}
          </div>
          <div style={{ width: 60, height: 3, background: mainColor, margin: "16px auto 0", borderRadius: 2 }} />
        </div>
        <div style={{ position: "absolute", top: 30, right: 30, width: 100, height: 100, border: `1px solid ${mainColor}10`, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: 40, left: 40, width: 60, height: 60, border: `1px solid ${mainColor}08`, borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.15)", color: isDarkBg ? "#fff" : "#666", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            + 이미지
          </label>
          {sec.image_prompt && (
            <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
              style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              AI 생성
            </button>
          )}
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
      </div>
    );

    return (
      <div style={{ display: "flex", minHeight: isMobile ? "auto" : 1260, background: bgCol.startsWith("linear-gradient") ? bgCol : bgCol, flexDirection: isMobile ? "column" : (imgLeft ? "row" : "row-reverse") }}>
        {imageBlock}
        {textBlock}
      </div>
    );
  }

  return null;
}
