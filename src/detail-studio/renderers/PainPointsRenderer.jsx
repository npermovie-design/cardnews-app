import React from "react";

export function renderPainPoints(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection,
    colorPalette, layout, isMobile, sectionImgInputId,
    handleSectionImageChange, generateSectionImage, setSections,
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layoutVal = ctx.sec.layout || "centered_text";

  // [text] 대괄호 스타일 볼드 처리 (qa_bubble 전용)
  const renderBoldBracket = (text) => {
    if (!text) return null;
    return text.split(/(\[.*?\])/g).map((p, pi) => p.startsWith("[") && p.endsWith("]")
      ? <strong key={pi} style={{ fontWeight: 900 }}>{p.slice(1, -1)}</strong>
      : p.includes("\n") ? p.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : p
    );
  };

  // ════════════════════════════════════════
  //  PAIN POINTS -- Q&A 말풍선형
  // ════════════════════════════════════════
  if (layoutVal === "qa_bubble") {
    const titleEl = findEl("title");
    const qBubbles = els.filter(e => e.role_hint === "q_bubble");
    const aBubble = els.find(e => e.role_hint === "a_bubble");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const accentColor = mainColor || "#3a5ba0";
    const darkAccent = "#2a3a6e";

    return (
      <div style={{ background: bgCol, padding: "40px 48px 0", overflow: "hidden" }}>
        {/* Q */}
        <div style={{ fontSize: 36, fontWeight: 900, color: isDarkBg ? "#5a8ad0" : accentColor, marginBottom: 12 }}>Q.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
          {qBubbles.map((el, qi) => (
            <div key={qi} {...editable(el)} style={eS(el, { background: isDarkBg ? "rgba(255,255,255,0.08)" : "#ffffff", borderRadius: "20px 20px 20px 4px", padding: "12px 20px", fontSize: 15, fontWeight: 500, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333", boxShadow: isDarkBg ? "none" : "0 2px 8px rgba(0,0,0,0.04)", maxWidth: "80%" })}>{el.content}</div>
          ))}
        </div>

        {/* A */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 24 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: isDarkBg ? "#7090c0" : darkAccent, marginBottom: 8 }}>A.</div>
          {aBubble && <div {...editable(aBubble)} style={eS(aBubble, { background: isDarkBg ? "#3a5080" : darkAccent, borderRadius: "20px 20px 4px 20px", padding: "14px 24px", fontSize: 15, fontWeight: 600, color: "#ffffff", maxWidth: "75%", textAlign: "center", lineHeight: 1.6 })}>{aBubble.content}</div>}
        </div>

        {/* CTA 헤드라인 */}
        {titleEl && (
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, color: isDarkBg ? "#5a8ad0" : accentColor, fontWeight: 300, marginBottom: 8 }}>"</div>
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#1a1a1a", lineHeight: 1.5 })}>{renderBoldBracket(titleEl.content)}</div>
          </div>
        )}

        {/* 제품 이미지 */}
        <div style={{ width: "100%", height: 320, background: isDarkBg ? "linear-gradient(180deg, transparent, rgba(0,0,0,0.2))" : "linear-gradient(180deg, transparent, rgba(0,0,0,0.03))", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", position: "relative" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", gap: 20, alignItems: "flex-end", paddingBottom: 20 }}>
              <div style={{ width: 80, height: 200, background: "#ffffff", borderRadius: "12px 12px 6px 6px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", position: "relative" }}>
                <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 50, height: 60, background: darkAccent, borderRadius: 4, opacity: 0.6 }} />
              </div>
              <div style={{ width: 90, height: 220, background: "#ffffff", borderRadius: "12px 12px 6px 6px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", position: "relative" }}>
                <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 55, height: 65, background: darkAccent, borderRadius: 4, opacity: 0.6 }} />
              </div>
            </div>
          )}
          {imgButtons()}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  PAIN POINTS (고민/공감)
  // ════════════════════════════════════════
  if (secType === "pain_points") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const painEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    const items = [];
    painEls.forEach((el, idx) => {
      if (el.fontWeight === "700" || el.fontWeight === "900" || idx % 2 === 0) {
        items.push({ title: el, body: null });
      } else if (items.length > 0 && !items[items.length - 1].body) {
        items[items.length - 1].body = el;
      } else {
        items.push({ title: el, body: null });
      }
    });
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    // -- pain_points 변형 렌더링 --
    // 변형 0,1: 다크 배경 + 글라스 카드 (기존)
    // 변형 3: 대형 인용문 중앙
    // 변형 2,4,5: 체크리스트 세로

    if (dv % 6 >= 2) {
      // 밝은 배경 변형들 -- bgCol 사용
      const painBg = bgCol;
      const painTxtCol = isDarkBg ? "#fff" : "#1a1a1a";
      const painSubCol = isDarkBg ? "rgba(255,255,255,0.6)" : "#888";

      if (dv % 6 === 3) {
        // 변형 3: 대형 인용문 중앙
        return (
          <div style={{ background: painBg, padding: "100px 64px", textAlign: "center" }}>
            <div style={{ fontSize: 80, color: `${mainColor}15`, fontFamily: "Georgia, serif", lineHeight: 1, marginBottom: -20 }}>"</div>
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: painTxtCol, lineHeight: 1.4, marginBottom: 32, maxWidth: 560, marginLeft: "auto", marginRight: "auto" })}>{titleEl.content}</div>}
            {painEls.map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: el.fontWeight === "700" ? "#333" : painSubCol, fontWeight: el.fontWeight || "400", lineHeight: 1.9, marginBottom: 12, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
            ))}
          </div>
        );
      }

      // 변형 2,4,5: 세로 체크리스트
      return (
        <div style={{ background: painBg, padding: "100px 64px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: painTxtCol, lineHeight: 1.3, marginBottom: 16 })}>{titleEl.content}</div>}
            {decoLine(mainColor, 40)}
          </div>
          <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {items.map((item, pi) => (
              <div key={pi} style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "24px 28px", borderRadius: 14, background: "transparent", border: `1px solid rgba(0,0,0,0.06)` }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `${mainColor}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  {item.title && <div {...editable(item.title)} style={eS(item.title, { fontSize: 15, fontWeight: 700, color: painTxtCol, marginBottom: item.body ? 4 : 0 })}>{item.title.content}</div>}
                  {item.body && <div {...editable(item.body)} style={eS(item.body, { fontSize: 13, color: painSubCol, lineHeight: 1.7 })}>{item.body.content}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 변형 0,1: 다크 배경 (기존 스타일)
    return (
      <div style={{ position: "relative", overflow: "hidden" }}>
        {productImg ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px) brightness(0.35)" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, #1a1a2e 0%, ${mainColor}30 100%)` }} />
        )}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.8) 100%)" : "transparent" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "100px 64px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 12 })}>{titleEl.content}</div>}
            {decoLine(mainColor, 48)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: items.length >= 4 ? "1fr 1fr" : "1fr", gap: 16, maxWidth: 680, margin: "0 auto" }}>
            {items.map((item, pi) => (
              <div key={pi} style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "32px 28px", borderRadius: 16, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: dv === 1 ? `${mainColor}20` : "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  {dv === 1 ? (
                    <span style={{ fontSize: 16, fontWeight: 900, color: mainColor }}>{String(pi + 1).padStart(2, "0")}</span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5l-10 10" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {item.title && (
                    <div {...editable(item.title)} style={eS(item.title, { fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: item.body ? 6 : 0, lineHeight: 1.5 })}>
                      {item.title.content}
                    </div>
                  )}
                  {item.body && (
                    <div {...editable(item.body)} style={eS(item.body, { fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 })}>
                      {item.body.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 이미지 교체 버튼 */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>배경 교체</label>
          {sec.image_prompt && (
            <button onClick={e => { e.stopPropagation(); generateSectionImage(sec.id, sec.image_prompt); }}
              style={{ padding: "6px 12px", borderRadius: 8, background: acc, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>AI 생성</button>
          )}
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
      </div>
    );
  }

  return null;
}
