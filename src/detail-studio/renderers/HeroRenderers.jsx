import React from "react";

export function renderHero(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, renderHeroImage, decoLine, renderPlaceholder, iconCircle,
    dv, mainColor, isDarkBg, bgCol, acc, bdr, els, sec, i, images,
    heroImgSrc, aiImgSrc, productImgForSection, colorPalette, sectionImages, secImg,
    layout: _layout, isMobile, productName, extraInfo,
    sectionImgInputId, handleSectionImageChange, generateSectionImage, setSections
  } = ctx;

  const secType = sec.type || "point";
  const layout = _layout || sec.layout || "centered_text";

  // ════════════════════════════════════════
  //  HERO -- 컬러 오버레이 (배경색+이미지 오버레이+대형 카피)
  // ════════════════════════════════════════
  if (layout === "color_overlay") {
    const titleEl = findEl("title");
    const bodyEl = findEl("body");
    const badgeEl = els.find(e => e.type === "badge");
    const heroImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const overlayColor = bgCol || "#dfc87a";

    return (
      <div style={{ position: "relative", minHeight: 560, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 56px 56px" }}>
        {/* 배경 레이어 */}
        <div style={{ position: "absolute", inset: 0, background: overlayColor }} />
        {heroImg && <img src={heroImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, mixBlendMode: "multiply" }} />}
        <div style={{ position: "absolute", inset: 0, background: `${overlayColor}60` }} />

        {/* 브랜드 태그 */}
        {badgeEl && (
          <div style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2, marginBottom: 48, lineHeight: 1.6 }}>
            <span {...editable(badgeEl)} style={eS(badgeEl, {})}>{badgeEl.content}</span>
          </div>
        )}

        {/* 대형 카피 */}
        {titleEl && (
          <div {...editable(titleEl)} style={eS(titleEl, { position: "relative", zIndex: 1, textAlign: "center", fontSize: 38, fontWeight: 900, color: "#ffffff", lineHeight: 1.5, marginBottom: 32, textShadow: "0 2px 20px rgba(0,0,0,0.08)", whiteSpace: "pre-line" })}>
            {titleEl.content}
          </div>
        )}

        {/* 설명문 */}
        {bodyEl && (
          <div {...editable(bodyEl)} style={eS(bodyEl, { position: "relative", zIndex: 1, textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-line" })}>
            {bodyEl.content}
          </div>
        )}
        {imgButtons()}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HERO -- 세트 소개 (브랜드 테두리 박스+영문 서브+제품 이미지)
  // ════════════════════════════════════════
  if (layout === "set_intro") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    return (
      <div style={{ background: bgCol, padding: "72px 48px 0", textAlign: "center" }}>
        {/* 브랜드 테두리 박스 */}
        {titleEl && (
          <div style={{ display: "inline-block", border: `2px solid ${isDarkBg ? "rgba(255,255,255,0.7)" : "#1a1a1a"}`, padding: "16px 48px", marginBottom: 16 }}>
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 300, color: isDarkBg ? "#ffffff" : "#1a1a1a", letterSpacing: 2, fontStyle: "italic" })}>
              {titleEl.content}
            </div>
          </div>
        )}

        {/* 서브 영문 */}
        {subtitleEl && (
          <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#999999", letterSpacing: 3, marginBottom: 48 })}>
            {subtitleEl.content}
          </div>
        )}

        {/* 하단 제품 이미지 */}
        <div style={{ width: "100%", height: 380, background: isDarkBg ? "#1a1a1a" : "#f8f6f2", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", position: "relative" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 320, height: 280, background: isDarkBg ? "linear-gradient(180deg, transparent, #222)" : "linear-gradient(180deg, transparent, #f0ece4)", borderRadius: "50% 50% 0 0" }} />
          )}
          {imgButtons()}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HERO -- 에코 히어로 종합 (그린+타이틀+특징바+3열카드)
  // ════════════════════════════════════════
  if (layout === "eco_hero_features") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const badgeEl = els.find(e => e.type === "badge");
    const heroSubEl = els.find(e => e.role_hint === "hero_sub");
    const heroDescEl = els.find(e => e.role_hint === "hero_desc");
    const featBars = els.filter(e => e.role_hint === "feat_bar");
    const detailCards = els.filter(e => e.role_hint === "detail_card");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const greenAccent = "#7ac070";

    const featIcons = [
      <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><circle cx="14" cy="14" r="11"/><path d="M10 14l3 3 6-6"/></svg>,
      <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><path d="M14 4C10 4 6 10 6 14c0 6 8 12 8 12s8-6 8-12c0-4-4-10-8-10z"/></svg>,
      <svg viewBox="0 0 28 28" fill="none" stroke={greenAccent} strokeWidth="1.4" strokeLinecap="round"><path d="M6 20l4-6 4 3 4-8 4 5"/><rect x="4" y="6" width="20" height="16" rx="2"/></svg>,
    ];

    return (
      <div>
        {/* 히어로 */}
        <div style={{ position: "relative", minHeight: 440, background: isDarkBg ? `linear-gradient(135deg, #1a2a1a, #0e1a10 40%, #080e08)` : `linear-gradient(135deg, #c8d8c4, #a0b898 40%, #8aa880)`, padding: "40px 40px 0", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.15), rgba(0,40,20,0.25))", pointerEvents: "none" }} />
          {/* 상단 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, position: "relative", zIndex: 1 }}>
            {badgeEl && <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: 3, textTransform: "uppercase" }}>{badgeEl.content}</span>}
            {subtitleEl && <span {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 2, fontStyle: "italic" })}>{subtitleEl.content}</span>}
          </div>
          {/* 헤드라인 */}
          <div style={{ position: "relative", zIndex: 1, marginBottom: 16 }}>
            {heroSubEl && <div {...editable(heroSubEl)} style={eS(heroSubEl, { fontSize: 20, fontWeight: 400, color: "rgba(255,255,255,0.85)", marginBottom: 4 })}>{heroSubEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 36, fontWeight: 900, color: "#ffffff", lineHeight: 1.25, textShadow: "0 2px 12px rgba(0,0,0,0.1)", whiteSpace: "pre-line" })}>{titleEl.content}</div>}
          </div>
          {heroDescEl && <div {...editable(heroDescEl)} style={eS(heroDescEl, { position: "relative", zIndex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 1, lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-line" })}>{heroDescEl.content}</div>}
          {/* 제품 이미지 */}
          <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", width: 240, height: 280, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
            {productImg ? (
              <img src={productImg} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            ) : (
              <div style={{ width: 180, height: 200, background: "rgba(255,255,255,0.25)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>PRODUCT IMAGE</div>
            )}
          </div>
          {imgButtons()}
        </div>

        {/* 특징 바 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", background: isDarkBg ? "rgba(0,15,5,0.85)" : "rgba(0,30,15,0.7)", backdropFilter: "blur(8px)" }}>
          {featBars.map((el, fi) => {
            const parts = el.content.split("|");
            return (
              <div key={fi} style={{ padding: "24px 20px", textAlign: "center", borderRight: fi < featBars.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <div style={{ width: 32, height: 32, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {React.cloneElement(featIcons[fi % featIcons.length], { style: { width: 28, height: 28 } })}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", marginBottom: 6 }}>{parts[0]}</div>
                <div {...editable(el)} style={eS(el, { fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 })}>{parts[1]}</div>
              </div>
            );
          })}
        </div>

        {/* 3열 이미지 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 2, background: isDarkBg ? "#1a1a1a" : "#f0f0f0" }}>
          {detailCards.map((el, di) => {
            const parts = el.content.split("|");
            const cardImgId = `ecocard-${sec.id}-${di}`;
            return (
              <div key={di} style={{ background: isDarkBg ? "#111111" : "#ffffff", overflow: "hidden" }}>
                <div style={{ width: "100%", height: 180, background: isDarkBg ? "#1a1a18" : "#e8e8e0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}
                  onClick={() => document.getElementById(cardImgId)?.click()}>
                  {sec[`ecoCardImg_${di}`] ? (
                    <img src={sec[`ecoCardImg_${di}`]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#999999", letterSpacing: 1 }}>DETAIL {di + 1}</span>
                  )}
                  <input id={cardImgId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { const url = URL.createObjectURL(file); setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, [`ecoCardImg_${di}`]: url })); }
                  }} />
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999", letterSpacing: 1, marginBottom: 4 }}>{parts[0]}</div>
                  <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333" })}>{parts[1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HERO -- 패턴 룩북 (컬러패턴+중앙이미지+세로텍스트)
  // ════════════════════════════════════════
  if (layout === "pattern_lookbook") {
    const titleEl = findEl("title");
    const sideLeft = els.find(e => e.role_hint === "side_left");
    const sideRight = els.find(e => e.role_hint === "side_right");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    return (
      <div style={{ position: "relative", minHeight: 640, background: bgCol, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        {/* 패턴 배경 */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "radial-gradient(circle, #fff 2px, transparent 2px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        {/* 상단 로고 */}
        {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", fontSize: 28, fontWeight: 300, fontStyle: "italic", color: "#ffffff", letterSpacing: 2, zIndex: 2 })}>{titleEl.content}</div>}

        {/* 좌측 세로 */}
        {sideLeft && <div {...editable(sideLeft)} style={eS(sideLeft, { position: "absolute", left: 20, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 2 })}>{sideLeft.content}</div>}

        {/* 우측 세로 */}
        {sideRight && <div {...editable(sideRight)} style={eS(sideRight, { position: "absolute", right: 20, top: "50%", transform: "translateY(-50%) rotate(90deg)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 2 })}>{sideRight.content}</div>}

        {/* 중앙 이미지 */}
        <div style={{ width: 380, height: 460, background: isDarkBg ? "#2a2a2a" : "#e8d0c8", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 12, color: "rgba(0,0,0,0.2)", letterSpacing: 2 }}>MODEL / PRODUCT IMAGE</span>
          )}
          {imgButtons()}
        </div>

        {/* 하단 브랜드 */}
        {titleEl && <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", fontSize: 16, fontStyle: "italic", color: "#ffffff", letterSpacing: 2, zIndex: 2 }}>{titleEl.content}</div>}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HERO -- 컬렉션 소개 (대형 세리프+좌이미지+우설명)
  // ════════════════════════════════════════
  if (layout === "collection_intro") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const seasonEl = els.find(e => e.role_hint === "season");
    const descEl = els.find(e => e.role === "body" && !e.role_hint);
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    return (
      <div style={{ background: bgCol, padding: "72px 48px 64px" }}>
        {/* 대형 타이틀 */}
        <div style={{ marginBottom: 8 }}>
          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 48, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.15, letterSpacing: -1, fontFamily: "'Georgia','Times New Roman',serif", whiteSpace: "pre-line" })}>{titleEl.content}</div>}
          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 48, fontWeight: 400, fontStyle: "italic", color: isDarkBg ? "rgba(255,255,255,0.6)" : "#a06868", lineHeight: 1.15, fontFamily: "'Georgia','Times New Roman',serif" })}>{subtitleEl.content}</div>}
        </div>

        {/* 좌이미지 + 우텍스트 */}
        <div style={{ display: "flex", gap: 32, marginTop: 36, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ flex: "0 0 45%", height: 320, background: isDarkBg ? "#2a2a2a" : "#eeeeee", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {productImg ? (
              <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.15)" : "#cccccc", letterSpacing: 2 }}>LOOKBOOK IMAGE</span>
            )}
            {imgButtons()}
          </div>
          <div style={{ flex: 1, paddingTop: 8 }}>
            {seasonEl && <div {...editable(seasonEl)} style={eS(seasonEl, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999999", letterSpacing: 3, marginBottom: 16 })}>{seasonEl.content}</div>}
            {descEl && <div {...editable(descEl)} style={eS(descEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#777777", lineHeight: 1.8 })}>{descEl.content}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  HERO SECTION (default)
  // ════════════════════════════════════════
  if (secType === "hero" || (layout === "full_image" && i === 0)) {
    const subtitle = findEl("subtitle");
    const title = findEl("title");
    const body = findEl("body");
    const badge = els.find(e => e.type === "badge");
    const statNums = findEls("stat_number");
    const statLabels = findEls("stat_label");

    // 변형: 2톤 분할 히어로 (ARMAND 레퍼런스)
    if (dv % 6 === 5) {
      const heroImg = aiImgSrc || productImgForSection || images[0]?.preview;
      const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle" && e.role !== "stat_number" && e.role !== "stat_label");
      return (
        <div>
          {/* 상단: 밝은 배경 + 제품 이미지 + 특징 텍스트 */}
          <div style={{ background: colorPalette?.light_bg || "#f5f0eb", position: "relative", padding: "60px 48px 80px", display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 32, flexDirection: isMobile ? "column" : "row", minHeight: isMobile ? "auto" : 500 }}>
            {/* 좌측 특징 텍스트 */}
            <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", gap: 16 }}>
              {bodyEls.slice(0, 4).map((el, bi) => (
                <div key={bi} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: mainColor, flexShrink: 0, marginTop: 2 }}>{bi + 1}.</span>
                  <div {...editable(el)} style={eS(el, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#666", lineHeight: 1.6 })}>{el.content}</div>
                </div>
              ))}
            </div>
            {/* 우측 제품 이미지 */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
              {heroImg ? (
                <img src={heroImg} alt="" style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain", filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.08))" }} />
              ) : (
                <div style={{ width: 320, height: 360, borderRadius: 16, background: `linear-gradient(135deg, ${mainColor}15, ${mainColor}08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 60, color: `${mainColor}15`, fontWeight: 900 }}>+</span>
                </div>
              )}
              {imgButtons({ top: 8, right: 8 })}
            </div>
          </div>
          {/* 하단: 다크 배경 + 브랜드 타이포 + 캐치프레이즈 */}
          <div style={{ background: "#1a1a2e", padding: isMobile ? "60px 24px" : "80px 56px", position: "relative", overflow: "hidden" }}>
            {/* 세로 브랜드 타이포 배경 */}
            <div style={{ position: "absolute", left: isMobile ? -20 : 40, top: "50%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "center", fontSize: isMobile ? 48 : 80, fontWeight: 900, color: "rgba(255,255,255,0.04)", letterSpacing: 8, whiteSpace: "nowrap", pointerEvents: "none", textTransform: "uppercase" }}>
              {(productName || "BRAND").toUpperCase()}
            </div>
            <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
              {subtitle && <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginBottom: 16 })}>{subtitle.content}</div>}
              {title && <div {...editable(title)} style={eS(title, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 20 })}>{title.content}</div>}
              {/* 인증/수상 배지 */}
              {statNums.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28, flexWrap: "wrap" }}>
                  {statNums.map((sn, si) => (
                    <div key={si} style={{ textAlign: "center", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div {...editable(sn)} style={eS(sn, { fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 })}>{sn.content}</div>
                      {statLabels[si] && <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginTop: 6 })}>{statLabels[si].content}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 변형: 라이프스타일 히어로 (풀배경 + 좌상단 로고 + 좌측 타이틀 + 우측 뱃지 + 하단 아이콘)
    if (dv % 6 === 3) {
      const heroImg = aiImgSrc || productImgForSection || images[0]?.preview;
      return (
        <div style={{ position: "relative", minHeight: 1260, overflow: "hidden", background: "#1a2a1a" }}>
          {heroImg ? (
            <img src={heroImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${mainColor}40, #1a1a2e)`, zIndex: 0 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%)", zIndex: 1 }} />
          {imgButtons()}
          <div style={{ position: "relative", zIndex: 2, padding: "48px 80px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "space-between", maxWidth: 720, margin: "0 auto" }}>
            {/* 좌상단: 브랜드 로고 */}
            {badge && <div {...editable(badge)} style={eS(badge, { fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: 3 })}>{badge.content}</div>}
            {!badge && <div />}

            {/* 중앙: 타이틀 + 뱃지 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32 }}>
              <div style={{ flex: 1, maxWidth: 380 }}>
                {title && <div {...editable(title)} style={eS(title, { fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1.35, marginBottom: 12 })}>{title.content}</div>}
                {subtitle && <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: 1, textTransform: "uppercase" })}>{subtitle.content}</div>}
              </div>
              {statNums.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                  {statNums.map((sn, si) => (
                    <div key={si} style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <span {...editable(sn)} style={eS(sn, { fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 })}>{sn.content}</span>
                      {statLabels[si] && <span {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1 })}>{statLabels[si].content}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 하단: 설명 + 스크롤 */}
            <div>
              {body && <div {...editable(body)} style={eS(body, { fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, marginBottom: 16, maxWidth: 360 })}>{body.content}</div>}
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 3, textTransform: "uppercase" }}>SCROLL DOWN</div>
            </div>
          </div>
        </div>
      );
    }

    // 기본 히어로
    return (
      <div style={{ width: "100%", minHeight: 1260, position: "relative", overflow: "hidden", background: "#111" }}>
        {renderHeroImage()}
        {/* 그라디언트 오버레이 */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.88) 100%)" }} />
        {/* 상단 브랜드 로고 */}
        {extraInfo?.brand && (
          <div style={{ position: "absolute", top: 28, left: 32, zIndex: 2, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{extraInfo.brand[0]}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>{extraInfo.brand}</span>
          </div>
        )}
        {/* 배지 - 우측 상단 */}
        {badge && (
          <div style={{ position: "absolute", top: 28, right: 80, zIndex: 2 }}>
            <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "8px 22px", borderRadius: 24, background: mainColor, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 0.5, boxShadow: `0 4px 16px ${mainColor}50` })}>
              {badge.content}
            </span>
          </div>
        )}
        {/* 코너 프레임 장식 */}
        <div style={{ position: "absolute", top: 24, left: 24, width: 60, height: 60, borderTop: "2px solid rgba(255,255,255,0.15)", borderLeft: "2px solid rgba(255,255,255,0.15)", zIndex: 1, borderRadius: "4px 0 0 0" }} />
        <div style={{ position: "absolute", bottom: 24, right: 24, width: 60, height: 60, borderBottom: "2px solid rgba(255,255,255,0.15)", borderRight: "2px solid rgba(255,255,255,0.15)", zIndex: 1, borderRadius: "0 0 4px 0" }} />
        {/* 콘텐츠 */}
        <div style={{ position: "relative", zIndex: 1, padding: "100px 56px 72px", minHeight: 1260, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {subtitle && (
            <div {...editable(subtitle)} style={eS(subtitle, { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>
              {subtitle.content}
            </div>
          )}
          {title && (
            <div {...editable(title)} style={eS(title, { fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 18, letterSpacing: -0.5, textShadow: "0 2px 24px rgba(0,0,0,0.4)", wordBreak: "keep-all" })}>
              {title.content}
            </div>
          )}
          {body && (
            <div {...editable(body)} style={eS(body, { fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, maxWidth: 520 })}>
              {body.content}
            </div>
          )}
          {!subtitle && !title && !body && els.filter(e => e.type === "text").slice(0, 3).map((el, ei) => (
            <div key={ei} {...editable(el)} style={eS(el, { fontSize: ei === 0 ? 14 : ei === 1 ? 42 : 16, fontWeight: ei === 1 ? 900 : ei === 0 ? 600 : 400, color: "#fff", lineHeight: ei === 1 ? 1.2 : 1.7, marginBottom: ei === 1 ? 18 : 8, letterSpacing: ei === 0 ? 4 : 0 })}>
              {el.content}
            </div>
          ))}
          {/* 통계 블록 */}
          {findEls("stat_number").length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(findEls("stat_number").length, 4)}, 1fr)`, gap: 12, marginTop: 32, maxWidth: 500 }}>
              {findEls("stat_number").map((sn, si) => (
                <div key={si} style={{ textAlign: "center", padding: "16px 10px", borderRadius: 14, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div {...editable(sn)} style={eS(sn, { fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 })}>{sn.content}</div>
                  {findEls("stat_label")[si] && (
                    <div {...editable(findEls("stat_label")[si])} style={{ ...editable(findEls("stat_label")[si]).style, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{findEls("stat_label")[si].content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* CTA 버튼 */}
          {findEl("price") && (
            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ padding: "18px 36px", borderRadius: 14, background: mainColor, color: "#fff", fontSize: 17, fontWeight: 800, boxShadow: `0 6px 24px ${mainColor}50`, letterSpacing: 0.5 }}>
                {findEl("price") && <span {...editable(findEl("price"))} style={{ ...editable(findEl("price")).style }}>{findEl("price").content}</span>}
                {" "}구매하기
              </div>
            </div>
          )}
          {/* SCROLL DOWN 애니메이션 화살표 */}
          {!findEl("price") && (
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontWeight: 500 }}>SCROLL DOWN</span>
              </div>
              <div style={{ marginLeft: 0, marginTop: 4, animation: "heroArrowBounce 2s ease-in-out infinite" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 7l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          )}
        </div>
        {/* 이미지 교체 */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
        <style>{`@keyframes heroArrowBounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(8px);opacity:1} }`}</style>
      </div>
    );
  }

  return null;
}
