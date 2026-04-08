import React from "react";

export function renderCompare(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection, colorPalette,
    layout: _layoutFromCtx, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage, setSections, productName,
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layout = ctx.sec.layout || "centered_text";

  const renderBoldBracket = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[.*?\])/g);
    return parts.map((p, pi) =>
      p.startsWith("[") && p.endsWith("]")
        ? <strong key={pi} style={{ fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
        : p.includes("\n") ? p.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : p
    );
  };

  // ════════════════════════════════════════
  //  TRUST / CERTIFICATION (cert / facility)
  // ════════════════════════════════════════
  if (secType === "cert" || secType === "facility") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const statNums = findEls("stat_number");
    const statLabels = findEls("stat_label");
    const bodyEls = els.filter(e => e.type === "text" && e.role === "body");
    const hasStat = statNums.length > 0;
    return (
      <div style={{ background: bgCol, padding: "160px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
              {titleEl.content}
            </div>
          )}
          {decoLineLong()}
        </div>
        {hasStat ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", marginBottom: bodyEls.length ? 32 : 0 }}>
            {statNums.map((sn, si) => (
              <div key={si} style={{ textAlign: "center", minWidth: 120 }}>
                <div {...editable(sn)} style={eS(sn, { fontSize: 52, fontWeight: 900, color: mainColor, lineHeight: 1.1, marginBottom: 8 })}>
                  {sn.content}
                </div>
                {statLabels[si] && (
                  <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" })}>
                    {statLabels[si].content}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {els.filter(e => e.type !== "divider" && e.role !== "title" && e.role !== "subtitle").map((el, ei) => (
              <div key={ei} style={{ padding: "20px 28px", borderRadius: 14, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, textAlign: "center", minWidth: 140, boxShadow: "0 1px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <span style={{ fontSize: 18, color: mainColor }}>✓</span>
                </div>
                <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: el.fontWeight || "600", color: el.color || (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.6 })}>
                  {el.content}
                </div>
              </div>
            ))}
          </div>
        )}
        {bodyEls.map((el, bi) => (
          <div key={bi} {...editable(el)} style={eS(el, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", lineHeight: 1.8, marginTop: 16, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>
            {el.content}
          </div>
        ))}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  COMPARISON — detail_compare_table (Biodance 스타일)
  // ════════════════════════════════════════
  if (layout === "detail_compare_table") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const badgeEl = els.find(e => e.type === "badge");
    const colHeadersEl = els.find(e => e.role_hint === "col_headers");
    const tableRows = els.filter(e => e.role_hint === "table_row");
    const colHeaders = (colHeadersEl?.content || "").split("|").map(s => s.trim());

    return (
      <div style={{ background: bgCol, padding: "64px 48px 56px" }}>
        {/* 영문 서브 */}
        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", marginBottom: 16 })}>{subtitleEl.content}</div>}
        {/* 헤드라인 */}
        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { textAlign: "center", fontSize: 28, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#333333", lineHeight: 1.55, marginBottom: 48 })}>{renderBoldBracket(titleEl.content)}</div>}

        {/* 테이블 */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {/* 헤더 */}
          <thead>
            <tr>
              <td style={{ width: 60, padding: "0 0 12px" }} />
              {colHeaders.map((h, hi) => (
                <td key={hi} style={{ textAlign: "center", padding: "0 0 12px", verticalAlign: "bottom" }}>
                  {hi === colHeaders.length - 1 && badgeEl && (
                    <div style={{ display: "inline-block", border: `1.5px solid ${isDarkBg ? "rgba(255,255,255,0.7)" : "#1a1a1a"}`, padding: "4px 16px", fontSize: 13, fontWeight: 700, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8, letterSpacing: 1 }}>
                      {badgeEl.content}
                    </div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: hi === colHeaders.length - 1 ? 900 : 800, color: hi === colHeaders.length - 1 ? (isDarkBg ? "#ffffff" : "#1a1a1a") : (isDarkBg ? "rgba(255,255,255,0.6)" : "#333333") }}>{h}</div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((rowEl, ri) => {
              const cells = rowEl.content.split("|").map(s => s.trim());
              const rowLabel = cells[0];
              const isEven = ri % 2 === 1;
              return (
                <tr key={ri}>
                  <td style={{ fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#888888", padding: "20px 16px", textAlign: "left", verticalAlign: "middle", borderRight: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "#eeeeee"}`, background: isEven ? (isDarkBg ? "rgba(255,255,255,0.02)" : "#fafafa") : "transparent" }}>{rowLabel}</td>
                  {cells.slice(1).map((cell, ci) => {
                    const isLast = ci === cells.length - 2;
                    return (
                      <td key={ci} style={{
                        textAlign: "center", padding: "20px 16px", verticalAlign: "middle",
                        fontSize: 14, color: isLast ? (isDarkBg ? "rgba(255,255,255,0.8)" : "#333333") : (isDarkBg ? "rgba(255,255,255,0.65)" : "#555555"),
                        fontWeight: isLast ? 600 : 400, lineHeight: 1.6,
                        borderRight: ci < cells.length - 2 ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "#f0f0f0"}` : "none",
                        background: isLast
                          ? (isEven ? (isDarkBg ? "rgba(255,255,255,0.05)" : "#f5f5f5") : (isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)"))
                          : (isEven ? (isDarkBg ? "rgba(255,255,255,0.02)" : "#fafafa") : "transparent"),
                      }}>
                        {isLast ? <strong style={{ fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{cell}</strong> : cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  COMPARISON (비교표)
  // ════════════════════════════════════════
  if (secType === "comparison") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    const rows = bodyEls.map(el => {
      const parts = (el.content || "").split("|").map(s => s.trim());
      return { el, label: parts[0] || "", before: parts[1] || "", after: parts[2] || "" };
    });
    const productImg = images[0]?.preview || null;

    // === 변형: 3열 비교표 (dv % 6 === 3) ===
    if (dv % 6 === 3 && rows.length >= 3) {
      return (
        <div style={{ background: `${mainColor}10`, padding: "80px 56px 100px", position: "relative", overflow: "hidden", minHeight: 1260 }}>
          {/* 브랜드 워터마크 */}
          <div style={{ position: "absolute", top: 40, right: 40, fontSize: 56, fontWeight: 900, color: "rgba(255,255,255,0.2)", letterSpacing: 4, pointerEvents: "none" }}>
            {(productName || "BRAND").toUpperCase()}
          </div>
          {/* 타이틀 */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, marginBottom: 10 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3 })}>{titleEl.content}</div>}
          </div>
          {/* 3열 비교표 */}
          <div style={{ maxWidth: 700, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            {/* 헤더 */}
            <div style={{ display: "flex" }}>
              <div style={{ flex: "0 0 120px", padding: "18px 16px", background: `${mainColor}18`, textAlign: "center" }} />
              <div style={{ flex: 1, padding: "18px 16px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f5f5", textAlign: "center", fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" }}>일반 제품</div>
              <div style={{ flex: "1.2", padding: "18px 16px", background: isDarkBg ? "rgba(255,255,255,0.08)" : "#fff", textAlign: "center", fontSize: 13, fontWeight: 800, color: mainColor, border: `2px solid ${mainColor}`, borderBottom: "none", borderRadius: "12px 12px 0 0" }}>우리 제품</div>
            </div>
            {/* 행들 */}
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: "flex", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "#e8ede8"}` }}>
                <div style={{ flex: "0 0 120px", padding: "22px 14px", background: `${mainColor}18`, textAlign: "center", fontSize: 13, fontWeight: 800, color: isDarkBg ? "#fff" : "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {row.label}
                </div>
                <div style={{ flex: 1, padding: "22px 16px", background: isDarkBg ? "rgba(255,255,255,0.02)" : "#f5f5f5", textAlign: "center", fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.6 }}>
                  {row.before}
                </div>
                <div {...editable(row.el)} style={eS(row.el, { flex: "1.2", padding: "22px 16px", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#fff", textAlign: "center", fontSize: 13, color: isDarkBg ? "#fff" : "#333", borderLeft: `2px solid ${mainColor}`, borderRight: `2px solid ${mainColor}`, borderBottom: ri === rows.length - 1 ? `2px solid ${mainColor}` : "none", borderRadius: ri === rows.length - 1 ? "0 0 12px 0" : "0", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.6, fontWeight: 600 })}>
                  {row.after}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // === 기본 비교표 ===
    return (
      <div style={{ background: bgCol, padding: "0 0 64px" }}>
        {/* 상단 제품 이미지 영역 */}
        <div style={{ width: "100%", height: 180, position: "relative", overflow: "hidden", marginBottom: 48 }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.4)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}25, ${mainColor}08)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {subtitleEl && (
              <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: productImg ? "#fff" : mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
                {subtitleEl.content}
              </div>
            )}
            {titleEl && (
              <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: productImg ? "#fff" : (isDarkBg ? "#fff" : "#1a1a2e"), lineHeight: 1.3, textShadow: productImg ? "0 2px 12px rgba(0,0,0,0.3)" : "none" })}>
                {titleEl.content}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "0 48px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            {/* 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f5f5f5", padding: "16px 24px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999" }}>항목</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", textAlign: "center" }}>일반</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: mainColor, textAlign: "center" }}>우리 제품</span>
            </div>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "16px 24px", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`, alignItems: "center" }}>
                <span {...editable(row.el)} style={eS(row.el, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "#fff" : "#333" })}>{row.label}</span>
                <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span style={{ fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#bbb" }}>{row.before}</span>
                </div>
                <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: mainColor }}>{row.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  BEFORE / AFTER (변화/결과)
  // ════════════════════════════════════════
  if (secType === "before_after") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    return (
      <div style={{ background: bgCol, padding: "160px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
              {titleEl.content}
            </div>
          )}
          {decoLine(mainColor, 40)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 620, margin: "0 auto" }}>
          {/* Before */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
            <div style={{ padding: "12px 20px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f5f5", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999", letterSpacing: 2 }}>BEFORE</span>
            </div>
            {renderPlaceholder(200, { borderRadius: 0 })}
            {bodyEls[0] && (
              <div style={{ padding: "16px 20px" }}>
                <div {...editable(bodyEls[0])} style={eS(bodyEls[0], { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.8 })}>
                  {bodyEls[0].content}
                </div>
              </div>
            )}
          </div>
          {/* After */}
          <div style={{ borderRadius: 16, overflow: "hidden", border: `2px solid ${mainColor}40` }}>
            <div style={{ padding: "12px 20px", background: `${mainColor}10`, textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: mainColor, letterSpacing: 2 }}>AFTER</span>
            </div>
            {renderPlaceholder(200, { borderRadius: 0 })}
            {bodyEls[1] && (
              <div style={{ padding: "16px 20px" }}>
                <div {...editable(bodyEls[1])} style={eS(bodyEls[1], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "#fff" : "#333", lineHeight: 1.8 })}>
                  {bodyEls[1].content}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
