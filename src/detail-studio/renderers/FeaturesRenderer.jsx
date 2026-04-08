import React from "react";

export function renderFeatures(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection,
    colorPalette, layout, isMobile, sectionImgInputId,
    handleSectionImageChange, generateSectionImage, setSections,
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layoutVal = ctx.sec.layout || "centered_text";

  // ════════════════════════════════════════
  //  FEATURES -- 제품소개 포인트형 (중앙 제품 + 4포인트)
  // ════════════════════════════════════════
  if (layoutVal === "center_product_4point") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const pointLabels = els.filter(e => e.role_hint === "point_label" || (e.role === "body" && e.fontWeight === "700"));
    const descEl = els.find(e => e.role === "body" && !e.role_hint && e.fontWeight !== "700" && e.fontWeight !== "900");
    const accentColor = "#e8799a";
    const productImg = images[0]?.preview || null;
    const pointPositions = [
      { top: 20, left: 40 }, { top: 20, right: 40 },
      { bottom: 20, left: 40 }, { bottom: 20, right: 40 },
    ];
    const pointIcons = [
      /* 청결 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><circle cx="16" cy="11" r="5"/><path d="M9 26c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>,
      /* 보습 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><path d="M16 6C11 6 7 11 7 16c0 7 9 12 9 12s9-5 9-12c0-5-4-10-9-10z"/><circle cx="16" cy="16" r="3"/></svg>,
      /* 억제 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><rect x="6" y="10" width="20" height="14" rx="3"/><path d="M6 16h20M12 10V8M20 10V8"/></svg>,
      /* 효과 */ <svg viewBox="0 0 32 32" fill="none" stroke={accentColor} strokeWidth="1.8"><circle cx="16" cy="16" r="10"/><path d="M12 16l3 3 6-6"/></svg>,
    ];

    // 타이틀에서 [키워드] 하이라이트 처리
    const renderHighlightTitle = (text) => {
      if (!text) return null;
      const parts = text.split(/(\[.*?\])/g);
      return parts.map((part, pi) => {
        if (part.startsWith("[") && part.endsWith("]")) {
          return <span key={pi}><span style={{ color: isDarkBg ? "#ffffff" : "#1a1a1a", fontWeight: 900 }}>[</span><span style={{ color: isDarkBg ? "#f0a0b8" : accentColor, fontWeight: 900 }}>{part.slice(1, -1)}</span><span style={{ color: isDarkBg ? "#ffffff" : "#1a1a1a", fontWeight: 900 }}>]</span></span>;
        }
        return part.includes("\n") ? part.split("\n").map((line, li) => <span key={`${pi}-${li}`}>{li > 0 && <br/>}{line}</span>) : part;
      });
    };

    return (
      <div style={{ background: bgCol, padding: "60px 50px 56px", position: "relative", overflow: "hidden" }}>
        {/* 상단 태그 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888" }}>[ 제품소개 ]</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: isDarkBg ? "#ffffff" : "#222222", letterSpacing: 1 }}>Brand</span>
        </div>

        {/* 메인 카피 */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: accentColor, letterSpacing: 1.5, marginBottom: 16 })}>{subtitleEl.content}</div>}
          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 34, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.45 })}>
            <span style={{ color: isDarkBg ? "rgba(255,255,255,0.15)" : "#dddddd", fontSize: 42, fontWeight: 300 }}>" </span>
            {renderHighlightTitle(titleEl.content)}
            <span style={{ color: isDarkBg ? "rgba(255,255,255,0.15)" : "#dddddd", fontSize: 42, fontWeight: 300 }}> "</span>
          </div>}
        </div>

        {/* 제품 + 4포인트 영역 */}
        <div style={{ position: "relative", width: "100%", height: isMobile ? 380 : 440, marginBottom: 44 }}>
          {/* 점선 연결 */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 400, height: 400, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 0, borderTop: `1px dashed ${isDarkBg ? "rgba(255,255,255,0.1)" : "#e0d0d4"}` }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 0, borderLeft: `1px dashed ${isDarkBg ? "rgba(255,255,255,0.1)" : "#e0d0d4"}` }} />
          </div>

          {/* 중앙 제품 */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 300, height: 300, borderRadius: "50%", background: isDarkBg ? `radial-gradient(circle, rgba(232,121,154,0.15) 0%, rgba(232,121,154,0.05) 60%, transparent 70%)` : `radial-gradient(circle, #fce4ec 0%, #f8f0f2 60%, transparent 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {productImg ? (
              <img src={productImg} alt="" style={{ maxWidth: "85%", maxHeight: "90%", objectFit: "contain" }} />
            ) : (
              <div style={{ width: 60, height: 180, background: `linear-gradient(180deg, #fce4ec 0%, #f9c4d2 30%, #fff 60%)`, borderRadius: "30px 30px 10px 10px", boxShadow: "0 8px 30px rgba(232,121,154,0.15)" }} />
            )}
          </div>

          {/* 4 포인트 */}
          {pointLabels.slice(0, 4).map((pl, pi) => (
            <div key={pi} style={{ position: "absolute", ...pointPositions[pi], display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 120, textAlign: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isDarkBg ? "#f0a0b8" : accentColor, letterSpacing: 1, background: isDarkBg ? "rgba(232,121,154,0.2)" : "#fce4ec", padding: "3px 12px", borderRadius: 20 }}>Point {String(pi + 1).padStart(2, "0")}</span>
              <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {React.cloneElement(pointIcons[pi % pointIcons.length], { style: { width: 28, height: 28 } })}
              </div>
              <span {...editable(pl)} style={eS(pl, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.9)" : "#333333" })}>{pl.content}</span>
            </div>
          ))}
        </div>

        {/* 하단 설명 */}
        {descEl && (
          <div style={{ textAlign: "center", borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "#f0e8ea"}`, paddingTop: 32 }}>
            <div {...editable(descEl)} style={eS(descEl, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666", lineHeight: 1.8 })}>{descEl.content}</div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  FEATURES / GRID (2col or 3col)
  // ════════════════════════════════════════
  if (secType === "features" || layoutVal === "grid_2col" || layoutVal === "grid_3col") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const gridEls = els.filter(e => e.role !== "title" && e.role !== "subtitle" && e.type !== "divider" && e.type !== "badge");
    const cols = layoutVal === "grid_3col" ? 3 : 2;
    const items = [];
    for (let g = 0; g < gridEls.length; g++) {
      if (gridEls[g].fontWeight === "700" || gridEls[g].fontWeight === "900" || gridEls[g].role === "body" && items.length === 0) {
        items.push({ title: gridEls[g], body: gridEls[g + 1]?.fontWeight !== "700" && gridEls[g + 1]?.fontWeight !== "900" ? gridEls[g + 1] : null });
        if (items[items.length - 1].body) g++;
      } else {
        items.push({ title: gridEls[g], body: null });
      }
    }
    const featureBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
    const productImg = images[0]?.preview || null;
    const getItemImg = (idx) => sec[`iconImg_${idx}`] || (images.length > 0 ? images[idx % images.length]?.preview : null);

    // === 지그재그 제품 쇼케이스 (레퍼런스: 보타니컬 클레이 마스크) ===
    if (dv % 6 === 3) {
      const smudgeColors = [`${mainColor}30`, "#e8d5d0", "#d5e0d0", "#d0d5e8", "#e8e0d0", "#d0e8e0"];
      return (
        <div style={{ background: featureBg, padding: "100px 48px 120px", position: "relative", overflow: "hidden" }}>
          {/* 배경 다이아몬드 패턴 */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, ${isDarkBg ? "#fff" : "#000"} 40px, ${isDarkBg ? "#fff" : "#000"} 41px)`,
          }} />
          {/* 상단 타이틀 -- 중앙 */}
          <div style={{ textAlign: "center", marginBottom: 64, position: "relative", zIndex: 1 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#888", marginBottom: 12 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25, marginBottom: 12 })}>{titleEl.content}</div>}
            {findEls("body").length > 0 && items.length === 0 && <div {...editable(findEls("body")[0])} style={eS(findEls("body")[0], { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999" })}>{findEls("body")[0].content}</div>}
          </div>
          {/* 지그재그 아이템 */}
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 56, position: "relative", zIndex: 1 }}>
            {(items.length > 0 ? items : gridEls.map(el => ({ title: el, body: null }))).map((item, gi) => {
              const isLeft = gi % 2 === 0;
              const itemImg = getItemImg(gi);
              const featureIconImgId = `feat-img-${sec.id}-${gi}`;
              const smudge = smudgeColors[gi % smudgeColors.length];
              return (
                <div key={gi} style={{ display: "flex", alignItems: "center", gap: 0, flexDirection: isLeft ? "row" : "row-reverse" }}>
                  {/* 이미지 + 컬러 스머지 */}
                  <div style={{ flex: "0 0 55%", position: "relative", height: 280 }}>
                    {/* 스머지(색 번짐) 배경 */}
                    <div style={{
                      position: "absolute",
                      [isLeft ? "right" : "left"]: -30,
                      top: "50%", transform: "translateY(-50%)",
                      width: 200, height: 200, borderRadius: "50%",
                      background: smudge, filter: "blur(40px)",
                      pointerEvents: "none", zIndex: 0,
                    }} />
                    {/* 제품 이미지 */}
                    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: isLeft ? "flex-start" : "flex-end" }}>
                      {itemImg ? (
                        <img src={itemImg} alt="" style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: 200, height: 220, borderRadius: 12, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 40, fontWeight: 900, color: `${mainColor}15` }}>{gi + 1}</span>
                        </div>
                      )}
                    </div>
                    <input id={featureIconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${gi}`]: url })); }
                    }} />
                    {/* 이미지 교체 버튼 */}
                    <div style={{ position: "absolute", top: 8, [isLeft ? "left" : "right"]: 8, zIndex: 3 }}>
                      <label htmlFor={featureIconImgId} onClick={e => e.stopPropagation()}
                        style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>교체</label>
                    </div>
                  </div>
                  {/* 텍스트 */}
                  <div style={{ flex: "0 0 45%", padding: isLeft ? "0 0 0 20px" : "0 20px 0 0", textAlign: isLeft ? "left" : "right" }}>
                    {item.title && <div {...editable(item.title)} style={eS(item.title, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 8, lineHeight: 1.5 })}>{item.title.content}</div>}
                    {item.body ? (
                      <div {...editable(item.body)} style={eS(item.body, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 })}>{item.body.content}</div>
                    ) : (
                      <div style={{ fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#ccc", lineHeight: 1.7, fontStyle: "italic" }}>설명을 입력하세요</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // -- 기본 카드 스타일 --
    const cs = { radius: 16, shadow: "0 4px 24px rgba(0,0,0,0.06)", imgH: cols === 3 ? 200 : 260, showImg: true, showNum: true, numStyle: "badge", padTop: "120px", decoType: "circle" };

    // 기본: 이미지 카드 그리드
    return (
      <div style={{ background: featureBg, padding: `${cs.padTop} 64px 100px`, position: "relative", overflow: "hidden" }}>
        {cs.decoType === "circle" && <>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `${mainColor}06`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: `${mainColor}04`, pointerEvents: "none" }} />
        </>}
        <div style={{ textAlign: "center", marginBottom: 64, position: "relative", zIndex: 1 }}>
          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.25, marginBottom: 20 })}>{titleEl.content}</div>}
          {decoLine(mainColor, 48)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${cols}, 1fr)`, gap: isMobile ? 16 : (cols === 3 ? 24 : 28), position: "relative", zIndex: 1 }}>
          {(items.length > 0 ? items : gridEls.map(el => ({ title: el, body: null }))).map((item, gi) => {
            const itemImg = getItemImg(gi);
            const featureIconImgId = `feat-img-${sec.id}-${gi}`;
            return (
              <div key={gi} style={{
                overflow: "hidden",
                background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff",
                borderRadius: cs.radius,
                boxShadow: isDarkBg ? "0 2px 16px rgba(0,0,0,0.2)" : cs.shadow,
                display: "flex", flexDirection: "column",
                border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
              }}>
                {cs.showImg && (
                  <div style={{ width: "100%", height: itemImg ? cs.imgH : 100, position: "relative", overflow: "hidden", cursor: "pointer", background: itemImg ? `linear-gradient(135deg, ${mainColor}12, ${mainColor}06)` : `${mainColor}06` }}
                    onClick={() => document.getElementById(featureIconImgId)?.click()}>
                    {itemImg ? (
                      <img src={itemImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${mainColor}20` }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: mainColor }}>{gi + 1}</span>
                        </div>
                        <span style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbb", fontWeight: 600 }}>이미지 추가</span>
                      </div>
                    )}
                    {itemImg && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.4) 100%)" }} />}
                    {cs.showNum && <div style={{ position: "absolute", top: 12, left: 12, width: 32, height: 32, borderRadius: 10, background: mainColor, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${mainColor}40` }}><span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{gi + 1}</span></div>}
                    <input id={featureIconImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`iconImg_${gi}`]: url }));
                      }
                    }} />
                  </div>
                )}
                {/* 텍스트 영역 */}
                <div style={{ padding: cols === 3 ? "24px 20px 28px" : "28px 28px 32px" }}>
                  {item.title && (
                    <div {...editable(item.title)} style={eS(item.title, { fontSize: cols === 3 ? 17 : 20, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 10, lineHeight: 1.4 })}>
                      {item.title.content}
                    </div>
                  )}
                  {item.body ? (
                    <div {...editable(item.body)} style={eS(item.body, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#777", lineHeight: 1.8 })}>
                      {item.body.content}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#ccc", lineHeight: 1.8, fontStyle: "italic" }}>
                      설명을 입력하세요
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
