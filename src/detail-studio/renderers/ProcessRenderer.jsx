import React from "react";

export function renderProcess(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection, colorPalette,
    layout: _layoutFromCtx, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage, setSections,
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layout = ctx.sec.layout || "centered_text";

  const renderBoldBracket = (text) => {
    if (!text) return null;
    return text.split(/(\[.*?\])/g).map((p, pi) =>
      p.startsWith("[") && p.endsWith("]")
        ? <strong key={pi} style={{ fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>{p.slice(1, -1)}</strong>
        : p
    );
  };

  // ════════════════════════════════════════
  //  PROCESS — mechanism_steps
  // ════════════════════════════════════════
  if (layout === "mechanism_steps") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const descEl = els.find(e => e.role === "body" && !e.role_hint);
    const mechSteps = els.filter(e => e.role_hint === "mech_step");
    const footnoteEl = els.find(e => e.role_hint === "footnote");
    const accentColor = mainColor || "#4a9fd5";

    const stepIcons = [
      <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><circle cx="20" cy="14" r="10"/><path d="M20 24v8"/><path d="M16 28h8"/></svg>,
      <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><path d="M20 6C15 6 10 14 10 20c0 6 4.5 10 10 10s10-4 10-10c0-6-5-14-10-14z"/><path d="M14 22h12M17 26h6"/></svg>,
      <svg viewBox="0 0 40 40" fill="none" stroke={isDarkBg ? `${accentColor}cc` : accentColor} strokeWidth="1.5"><path d="M8 30l6-8 6 4 6-10 6 6"/><rect x="6" y="8" width="28" height="24" rx="3"/></svg>,
    ];

    return (
      <div style={{ background: bgCol, padding: "64px 48px 48px" }}>
        {/* POINT 넘버 */}
        {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { textAlign: "center", fontSize: 16, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", letterSpacing: 3, marginBottom: 16 })}>{subtitleEl.content}</div>}
        {/* 2줄 헤드라인 */}
        {titleEl && (() => {
          const lines = (titleEl.content || "").split("\n");
          return (
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              {lines[0] && <div style={{ fontSize: 22, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", marginBottom: 4 }}>{lines[0]}</div>}
              {lines[1] && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{lines[1]}</div>}
            </div>
          );
        })()}
        {/* 설명 */}
        {descEl && <div {...editable(descEl)} style={eS(descEl, { textAlign: "center", fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#666666", lineHeight: 1.8, marginBottom: 48 })}>{renderBoldBracket(descEl.content)}</div>}

        {/* 3스텝 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 0, position: "relative", marginBottom: 40 }}>
          {/* 연결선 (그라데이션) */}
          {!isMobile && <div style={{ position: "absolute", top: 20, left: "16.66%", right: "16.66%", height: 2, background: isDarkBg ? `linear-gradient(90deg, ${accentColor}40, ${accentColor}20, ${accentColor}40)` : `linear-gradient(90deg, ${accentColor}30, ${accentColor}15, ${accentColor}30)`, zIndex: 0, borderRadius: 1 }} />}

          {mechSteps.map((el, si) => {
            const parts = el.content.split("|");
            const stepTitle = parts[0]?.trim();
            const stepDesc = parts[1]?.trim() || "";
            return (
              <div key={si} style={{ textAlign: "center", position: "relative", zIndex: 1, padding: "0 8px" }}>
                {/* 넘버 (그라데이션 원형) */}
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, color: "#ffffff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 4px 16px ${accentColor}35` }}>{si + 1}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: accentColor, marginBottom: 10 }}>{stepTitle}</div>
                <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.7, padding: "0 8px" })}>{stepDesc}</div>
                {/* 일러스트 영역 */}
                <div style={{ marginTop: 24, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 100, height: 120, background: isDarkBg ? `${accentColor}15` : `${accentColor}12`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}
                    onClick={() => document.getElementById(`mech-img-${sec.id}-${si}`)?.click()}>
                    {sec[`mechImg_${si}`] ? (
                      <img src={sec[`mechImg_${si}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      React.cloneElement(stepIcons[si % stepIcons.length], { style: { width: 40, height: 40 } })
                    )}
                    <input id={`mech-img-${sec.id}-${si}`} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, idx) => idx !== i ? s : { ...s, [`mechImg_${si}`]: url })); }
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 참고 문구 */}
        {footnoteEl && <div {...editable(footnoteEl)} style={eS(footnoteEl, { textAlign: "center", fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#cccccc", marginTop: 24 })}>{footnoteEl.content}</div>}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HOW TO USE / PROCESS STEPS
  // ════════════════════════════════════════
  if (secType === "howto" || secType === "process_steps") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const stepEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    const steps = [];
    stepEls.forEach((el, idx) => {
      if (el.fontWeight === "700" || el.fontWeight === "900" || idx % 2 === 0) {
        steps.push({ title: el, body: null });
      } else if (steps.length > 0 && !steps[steps.length - 1].body) {
        steps[steps.length - 1].body = el;
      } else {
        steps.push({ title: el, body: null });
      }
    });
    const getStepImg = (idx) => sec[`iconImg_${idx}`] || (images.length > 0 ? images[idx % images.length]?.preview : null);

    // === 변형: 세로 타임라인 (dv >= 3) ===
    if (dv % 6 >= 3) {
      return (
        <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "100px 56px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>{subtitleEl.content}</div>}
            {titleEl ? <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 24 : 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>{titleEl.content}</div> : <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>HOW TO USE</div>}
            {decoLine(mainColor)}
          </div>
          <div style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
            {/* 세로 타임라인 (그라데이션) */}
            <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 2, background: isDarkBg ? `linear-gradient(180deg, ${mainColor}30, ${mainColor}10)` : `linear-gradient(180deg, ${mainColor}25, ${mainColor}08)`, borderRadius: 1 }} />
            {steps.map((step, si) => (
              <div key={si} style={{ display: "flex", gap: 24, marginBottom: 24, position: "relative" }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg, ${mainColor}, ${mainColor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, boxShadow: `0 6px 20px ${mainColor}35` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{si + 1}</span>
                </div>
                <div style={{ paddingTop: 4, flex: 1, padding: "16px 24px 20px", borderRadius: 14, background: isDarkBg ? "rgba(255,255,255,0.03)" : `${mainColor}04`, border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.05)" : `${mainColor}08`}` }}>
                  {step.title && <div {...editable(step.title)} style={eS(step.title, { fontSize: 17, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 8 })}>{step.title.content}</div>}
                  {step.body && <div {...editable(step.body)} style={eS(step.body, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.7 })}>{step.body.content}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // === 기본 howto (좌우 교차) ===
    return (
      <div style={{ background: bgCol, padding: isMobile ? "80px 24px" : "100px 56px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl ? (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
              {titleEl.content}
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e" }}>HOW TO USE</div>
          )}
          {decoLine(mainColor)}
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {steps.map((step, si) => {
            const stepImg = getStepImg(si);
            const stepImgId = `step-img-${sec.id}-${si}`;
            const isEven = si % 2 === 0;
            return (
              <div key={si} style={{ display: "flex", gap: 0, marginBottom: si < steps.length - 1 ? 4 : 0, flexDirection: isEven ? "row" : "row-reverse", minHeight: 180 }}>
                {/* 이미지 영역 */}
                <div style={{ flex: "0 0 45%", position: "relative", overflow: "hidden", borderRadius: isEven ? "16px 0 0 16px" : "0 16px 16px 0", cursor: "pointer", background: `linear-gradient(135deg, ${mainColor}10, ${mainColor}05)` }}
                  onClick={() => document.getElementById(stepImgId)?.click()}>
                  {stepImg ? (
                    <img src={stepImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 180 }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ fontSize: 48, fontWeight: 900, color: `${mainColor}15`, fontFamily: "Georgia, serif" }}>
                        {String(si + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#ccc", fontWeight: 600 }}>+ 이미지</span>
                    </div>
                  )}
                  {stepImg && <div style={{ position: "absolute", inset: 0, background: isEven ? "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.3))" : "linear-gradient(to left, transparent 60%, rgba(0,0,0,0.3))" }} />}
                  <input id={stepImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setSections(prev => prev.map((s, sidx) => sidx !== i ? s : { ...s, [`iconImg_${si}`]: url }));
                    }
                  }} />
                </div>
                {/* 텍스트 영역 */}
                <div style={{ flex: "0 0 55%", padding: "32px 36px", display: "flex", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${mainColor}, ${mainColor}bb)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, flexShrink: 0, boxShadow: `0 6px 20px ${mainColor}35` }}>
                        {si + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase" }}>STEP {String(si + 1).padStart(2, "0")}</span>
                    </div>
                    {step.title && (
                      <div {...editable(step.title)} style={eS(step.title, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a2e", marginBottom: 14, lineHeight: 1.4 })}>
                        {step.title.content}
                      </div>
                    )}
                    {step.body && (
                      <div {...editable(step.body)} style={eS(step.body, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.8 })}>
                        {step.body.content}
                      </div>
                    )}
                  </div>
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
