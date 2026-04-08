import React from "react";

/**
 * MiscRenderer - ai_notice, quote_box, full_image/text_over_image,
 * default/centered_text fallback
 */
export function renderMisc(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection, colorPalette,
    layout: _layoutFromCtx, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage, setSections,
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layout = ctx.sec.layout || "centered_text";

  // renderBoldBracket: [text] 스타일 볼드 처리
  const renderBoldBracket = (text) => {
    if (!text) return text;
    const parts = String(text).split(/(\[[^\]]+\])/g);
    return parts.map((part, pi) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        return <strong key={pi} style={{ fontWeight: 800 }}>{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  // ════════════════════════════════════════
  //  AI NOTICE
  // ════════════════════════════════════════
  if (secType === "ai_notice") {
    return (
      <div style={{ background: bgCol || (isDarkBg ? "#1a1a1a" : "#fafafa"), padding: "24px 48px", textAlign: "center" }}>
        {/* 미세한 구분선 */}
        <div style={{ width: 60, height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "0 auto 12px" }} />
        {els.filter(e => e.type === "text").map((el, ei) => (
          <div key={ei} {...editable(el)} style={eS(el, { fontSize: 10, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#c0c0c0", lineHeight: 1.6 })}>
            {el.content}
          </div>
        ))}
        {els.filter(e => e.type === "text").length === 0 && (
          <div style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#c0c0c0", lineHeight: 1.6 }}>
            본 페이지의 일부 콘텐츠는 AI로 생성되었습니다
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  QUOTE BOX
  // ════════════════════════════════════════
  if (layout === "quote_box") {
    return (
      <div style={{ background: bgCol, padding: "160px 64px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 48px", borderRadius: 20, border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`, textAlign: "center", position: "relative" }}>
          {/* 인용 부호 장식 */}
          <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", width: 32, height: 32, background: bgCol, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 32, color: `${mainColor}40`, fontFamily: "Georgia, serif", lineHeight: 1 }}>"</span>
          </div>
          {els.map((el, ei) => {
            if (el.type === "badge") return (
              <span key={ei} {...editable(el)} style={eS(el, { display: "inline-block", padding: "5px 14px", borderRadius: 16, background: `${mainColor}10`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 16, border: `1px solid ${mainColor}20` })}>
                {el.content}
              </span>
            );
            if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "20px auto", maxWidth: 100 }} />;
            return (
              <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.role === "title" ? 22 : 14, fontWeight: el.role === "title" ? 900 : 400, color: el.color || (isDarkBg ? (el.role === "title" ? "#fff" : "rgba(255,255,255,0.6)") : (el.role === "title" ? "#1a1a2e" : "#666")), lineHeight: el.role === "title" ? 1.35 : 1.8, marginBottom: el.role === "title" ? 12 : 6 })}>
                {el.content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  FULL IMAGE / TEXT OVER IMAGE (non-hero)
  // ════════════════════════════════════════
  if (layout === "full_image" || layout === "text_over_image") {
    const bgImgSrc = aiImgSrc || productImgForSection;
    return (
      <div style={{ width: "100%", minHeight: 400, position: "relative", overflow: "hidden", background: bgCol }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {bgImgSrc ? (
            <img src={bgImgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}20, ${mainColor}08)` }} />
          )}
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 20%, rgba(0,0,0,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
          {sec.image_prompt && (
            <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(124,106,255,0.8)", color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>AI 생성</button>
          )}
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
        <div style={{ position: "relative", zIndex: 1, padding: "60px 48px", minHeight: 400, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {els.map((el, ei) => {
            if (el.type === "badge") return (
              <span key={ei} {...editable(el)} style={eS(el, { display: "inline-block", padding: "6px 16px", borderRadius: 20, background: el.bg || mainColor, color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 12, alignSelf: "flex-start" })}>
                {el.content}
              </span>
            );
            if (el.type === "divider") return <div key={ei} style={{ height: 1, background: "rgba(255,255,255,0.2)", margin: "16px 0", maxWidth: 60 }} />;
            return (
              <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.role === "title" ? 30 : el.role === "subtitle" ? 13 : 15, fontWeight: el.role === "title" ? 900 : el.role === "subtitle" ? 600 : 400, color: "#fff", lineHeight: el.role === "title" ? 1.3 : 1.7, marginBottom: el.role === "title" ? 14 : 6, letterSpacing: el.role === "subtitle" ? 2 : 0, opacity: el.role === "subtitle" ? 0.7 : 1 })}>
                {el.content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  DEFAULT / CENTERED TEXT (catch-all -- always returns JSX)
  // ════════════════════════════════════════
  const titleEl = findEl("title");
  const subtitleEl = findEl("subtitle");
  const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
  const badge = els.find(e => e.type === "badge");
  // 세로 패딩 변형 (더 길게)
  const defaultPad = ["100px 64px", "100px 64px", "120px 80px", "100px 56px", "100px 72px", "100px 64px"][dv % 6];
  // 제목 크기 변형
  const defaultTitleSize = [36, 34, 40, 32, 38, 34][dv % 6];
  // body 텍스트 변형: 카드형 vs 플레인
  const bodyAsCards = dv % 3 === 1 && bodyEls.length >= 3;
  // 좌측 정렬 변형
  const leftAlign = dv % 4 === 2;

  return (
    <div style={{ background: bgCol, padding: defaultPad, textAlign: leftAlign ? "left" : "center", position: "relative", overflow: "hidden" }}>
      {/* 데코 장식 변형 */}
      {dv % 3 === 0 && <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: `${mainColor}05`, pointerEvents: "none" }} />}
      {dv % 3 === 2 && <div style={{ position: "absolute", top: 40, left: leftAlign ? 0 : "auto", right: leftAlign ? "auto" : 0, width: 4, height: 80, background: `${mainColor}15`, borderRadius: 2, pointerEvents: "none" }} />}
      <div style={{ maxWidth: leftAlign ? 600 : "none", position: "relative", zIndex: 1 }}>
        {badge && (
          <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 16px", borderRadius: dv % 2 === 0 ? 20 : 8, background: `${mainColor}12`, color: mainColor, fontSize: 11, fontWeight: 700, marginBottom: 20, border: `1px solid ${mainColor}20` })}>
            {badge.content}
          </span>
        )}
        {subtitleEl && (
          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: isDarkBg ? mainColor : (dv % 2 === 0 ? mainColor : "#999"), letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 })}>
            {subtitleEl.content}
          </div>
        )}
        {titleEl && (
          <div {...editable(titleEl)} style={eS(titleEl, { fontSize: defaultTitleSize, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.35, marginBottom: 24 })}>
            {titleEl.content}
          </div>
        )}
        {(titleEl || subtitleEl) && !bodyAsCards && decoLine(mainColor, leftAlign ? 32 : undefined)}
        {bodyAsCards ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20, maxWidth: 580, marginLeft: leftAlign ? 0 : "auto", marginRight: leftAlign ? "auto" : "auto" }}>
            {bodyEls.map((el, bi) => (
              <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "18px 24px", borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
                <div style={{ width: 4, height: 20, background: mainColor, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                <div {...editable(el)} style={eS(el, { fontSize: 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.75)" : "#444"), lineHeight: 1.8, textAlign: "left" })}>
                  {el.content}
                </div>
              </div>
            ))}
          </div>
        ) : bodyEls.map((el, bi) => (
          <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.65)" : "#555"), lineHeight: 1.9, marginBottom: 16, maxWidth: leftAlign ? "none" : 560, marginLeft: leftAlign ? 0 : "auto", marginRight: leftAlign ? "auto" : "auto" })}>
            {el.content}
          </div>
        ))}
        {!titleEl && !subtitleEl && bodyEls.length === 0 && els.map((el, ei) => {
          if (el.type === "divider") return <div key={ei} style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "16px auto", maxWidth: 100 }} />;
          if (el.type === "badge") return null;
          return (
            <div key={ei} {...editable(el)} style={eS(el, { fontSize: el.fontWeight === "900" ? 28 : el.fontWeight === "700" ? 17 : 15, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "#fff" : "#444"), lineHeight: 1.9, marginBottom: 12 })}>
              {el.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
