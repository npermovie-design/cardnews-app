import React from "react";

/**
 * PromoRenderer - pricing, faq, guarantee, shipping/info/contact,
 * bundle_promo, promo_full, event, cta
 */
export function renderPromo(ctx) {
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
  //  PRICING (가격표)
  // ════════════════════════════════════════
  if (secType === "pricing") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const planNames = findEls("plan_name");
    const planPrices = findEls("plan_price");
    const planDescs = findEls("plan_desc");
    const planFeatures = findEls("plan_feature");
    // 플랜별 그룹핑: plan_name 기준
    const plans = planNames.map((pn, pi) => ({
      name: pn,
      price: planPrices[pi],
      desc: planDescs[pi],
      features: planFeatures.slice(pi * 3, (pi + 1) * 3), // 플랜당 약 3개
    }));
    // fallback: planNames가 없으면 body 요소로 대체
    if (plans.length === 0) {
      const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
      return (
        <div style={{ background: bgCol, padding: "120px 64px", textAlign: "center" }}>
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 28, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3, marginBottom: 24 })}>
              {titleEl.content}
            </div>
          )}
          {bodyEls.map((el, bi) => (
            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.65)" : "#666", lineHeight: 1.8, marginBottom: 8 })}>
              {el.content}
            </div>
          ))}
        </div>
      );
    }
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
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 20, maxWidth: 720, margin: "0 auto" }}>
          {plans.map((plan, pi) => {
            const isHighlight = pi === Math.floor(plans.length / 2);
            return (
              <div key={pi} style={{ borderRadius: 18, overflow: "hidden", border: isHighlight ? `2px solid ${mainColor}` : `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", position: "relative", boxShadow: isHighlight ? `0 8px 32px ${mainColor}20` : (isDarkBg ? "0 4px 16px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.05)"), transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = isHighlight ? `0 12px 40px ${mainColor}30` : (isDarkBg ? "0 8px 28px rgba(0,0,0,0.3)" : "0 8px 36px rgba(0,0,0,0.08)"); }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = isHighlight ? `0 8px 32px ${mainColor}20` : (isDarkBg ? "0 4px 16px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.05)"); }}
              >
                {isHighlight && (
                  <div style={{ background: mainColor, color: "#fff", textAlign: "center", padding: "6px", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>BEST</div>
                )}
                <div style={{ padding: "28px 24px", textAlign: "center" }}>
                  {plan.name && (
                    <div {...editable(plan.name)} style={eS(plan.name, { fontSize: 16, fontWeight: 800, color: isDarkBg ? "#fff" : "#333", marginBottom: 8 })}>
                      {plan.name.content}
                    </div>
                  )}
                  {plan.price && (
                    <div {...editable(plan.price)} style={eS(plan.price, { fontSize: 32, fontWeight: 900, color: mainColor, marginBottom: 8 })}>
                      {plan.price.content}
                    </div>
                  )}
                  {plan.desc && (
                    <div {...editable(plan.desc)} style={eS(plan.desc, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#999", marginBottom: 20 })}>
                      {plan.desc.content}
                    </div>
                  )}
                  <div style={{ height: 1, background: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 16 }} />
                  {plan.features.map((feat, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, justifyContent: "flex-start", paddingLeft: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: `${mainColor}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5L9.5 4" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      <span {...editable(feat)} style={eS(feat, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555" })}>
                        {feat.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  FAQ (자주 묻는 질문)
  // ════════════════════════════════════════
  if (secType === "faq") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const questions = findEls("question");
    const answers = findEls("answer");
    // fallback: question/answer role이 없으면 body로 처리
    const hasFaqRoles = questions.length > 0;
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle" && e.role !== "question" && e.role !== "answer");
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
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {hasFaqRoles ? questions.map((q, qi) => {
            const faqOpen = sec._faqOpen || {};
            const isOpen = faqOpen[qi] !== false; // 기본 첫 번째만 열림 -> 모두 열림 기본
            const toggleFaq = (e) => {
              e.stopPropagation();
              setSections(prev => prev.map((s, si) => si !== i ? s : { ...s, _faqOpen: { ...faqOpen, [qi]: !isOpen } }));
            };
            return (
            <div key={qi} style={{ borderRadius: 16, border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, overflow: "hidden", transition: "all 0.2s", boxShadow: isDarkBg ? "0 2px 12px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.03)" }}>
              <div onClick={toggleFaq} style={{ padding: "18px 24px", background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", userSelect: "none", transition: "background 0.15s ease" }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${mainColor}, ${mainColor}cc)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>Q</span>
                <div {...editable(q)} style={eS(q, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "#fff" : "#1a1a2e", flex: 1 })}>
                  {q.content}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.4)" : "#999"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {isOpen && answers[qi] && (
                <div style={{ padding: "14px 24px 16px 52px", background: isDarkBg ? "rgba(255,255,255,0.02)" : "#fff" }}>
                  <div {...editable(answers[qi])} style={eS(answers[qi], { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8 })}>
                    {answers[qi].content}
                  </div>
                </div>
              )}
            </div>
          );}) : bodyEls.map((el, bi) => (
            <div key={bi} {...editable(el)} style={eS(el, { padding: "14px 24px", borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fafafa", fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.7)" : "#555", lineHeight: 1.8 })}>
              {el.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  GUARANTEE (보증/신뢰)
  // ════════════════════════════════════════
  if (secType === "guarantee") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    const badge = els.find(e => e.type === "badge");
    const productImg = images[0]?.preview || null;
    const guaranteeIcons = [
      <svg key="shield" width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 3L5 9v9c0 8.3 5.5 16 13 18 7.5-2 13-9.7 13-18V9L18 3z" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`}/><path d="M13 18l3 3 7-7" stroke={mainColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      <svg key="cert" width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="14" r="9" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`}/><path d="M14 14l3 3 5-5" stroke={mainColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 23l-2 10 6-3 6 3-2-10" stroke={mainColor} strokeWidth="2" fill={`${mainColor}08`}/></svg>,
      <svg key="star" width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 4l4 8.5 9 1.3-6.5 6.3 1.5 9L18 25l-8 4.1 1.5-9L5 13.8l9-1.3L18 4z" stroke={mainColor} strokeWidth="2" fill={`${mainColor}10`} strokeLinejoin="round"/></svg>,
    ];
    // 변형: 2열 인증 카드 (도노도노 레퍼런스 -- 캐치프레이즈 + 인증서 2열)
    if (dv % 6 >= 3) {
      return (
        <div style={{ background: isDarkBg ? bgCol : "#f5f5f5", padding: isMobile ? "80px 20px" : "100px 56px" }}>
          {/* 상단 캐치프레이즈 */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888", marginBottom: 10 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 26 : 34, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.3 })}>{titleEl.content}</div>}
          </div>
          {/* 2열 인증 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : bodyEls.length >= 2 ? "1fr 1fr" : "1fr", gap: 20, maxWidth: 700, margin: "0 auto" }}>
            {bodyEls.map((el, bi) => (
              <div key={bi} style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", borderRadius: 20, padding: "32px 28px", textAlign: "center", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, boxShadow: isDarkBg ? "none" : "0 2px 16px rgba(0,0,0,0.03)" }}>
                {/* 아이콘 */}
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${mainColor}15` }}>
                  {guaranteeIcons[bi % guaranteeIcons.length]}
                </div>
                {/* 인증 제목 */}
                <div style={{ fontSize: 17, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a", marginBottom: 8 }}>
                  {el.content?.split(/[.!?]/)[0] || `인증 ${bi + 1}`}
                </div>
                {/* 설명 */}
                <div {...editable(el)} style={eS(el, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#888", lineHeight: 1.7 })}>
                  {el.content}
                </div>
                {/* 하단 뱃지 */}
                {bi === 0 && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
                    {["안전 인증", "품질 검증", "시험 완료"].map((label, li) => (
                      <span key={li} style={{ padding: "6px 14px", borderRadius: 20, background: li === 0 ? mainColor : (li === 1 ? "#10b981" : `${mainColor}15`), color: li < 2 ? "#fff" : mainColor, fontSize: 11, fontWeight: 700 }}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* 하단 한 줄 텍스트 */}
          {badge && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <span {...editable(badge)} style={eS(badge, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666" })}>{badge.content}</span>
            </div>
          )}
        </div>
      );
    }

    // 기본 guarantee (이미지 헤더 + 아이콘 그리드)
    return (
      <div style={{ position: "relative", overflow: "hidden", textAlign: "center" }}>
        {/* 상단 이미지 배경 영역 */}
        <div style={{ width: "100%", height: 280, position: "relative", overflow: "hidden" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3) blur(1px)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}20, #1a1a2e)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(transparent, ${isDarkBg ? bgCol : "#f8f8fa"})` }} />
        </div>
        <div style={{ background: isDarkBg ? bgCol : "#f8f8fa", padding: "100px 64px 140px" }}>
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 20 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.25, marginBottom: 48 })}>
              {titleEl.content}
            </div>
          )}
          {/* 아이콘 카드 그리드 */}
          {bodyEls.length > 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(bodyEls.length, 3)}, 1fr)`, gap: isMobile ? 12 : 20, maxWidth: 720, margin: "0 auto" }}>
              {bodyEls.map((el, bi) => (
                <div key={bi} style={{ padding: "32px 24px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, boxShadow: isDarkBg ? "none" : "0 2px 16px rgba(0,0,0,0.04)", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${mainColor}15` }}>
                    {guaranteeIcons[bi % guaranteeIcons.length]}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: mainColor, marginBottom: 10, letterSpacing: 1 }}>
                    {String(bi + 1).padStart(2, "0")}
                  </div>
                  <div {...editable(el)} style={eS(el, { fontSize: 15, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.8 })}>
                    {el.content}
                  </div>
                </div>
              ))}
            </div>
          ) : bodyEls.map((el, bi) => (
            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666", lineHeight: 1.8, marginBottom: 14, maxWidth: 500, marginLeft: "auto", marginRight: "auto" })}>
              {el.content}
            </div>
          ))}
          {badge && (
            <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "12px 32px", borderRadius: 28, background: mainColor, color: "#fff", fontSize: 15, fontWeight: 800, marginTop: 36, boxShadow: `0 4px 16px ${mainColor}30`, letterSpacing: 0.5 })}>
              {badge.content}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  SHIPPING / INFO / CONTACT (테이블 스타일)
  // ════════════════════════════════════════
  if (secType === "shipping" || secType === "info" || secType === "contact") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    // SVG 아이콘 배열 (shipping/info/contact용)
    const shippingIcons = [
      <svg key="ship" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="5" width="10" height="8" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M11 8h3l2 3v2h-5V8z" stroke={mainColor} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="4.5" cy="14.5" r="1.5" stroke={mainColor} strokeWidth="1.5"/><circle cx="13.5" cy="14.5" r="1.5" stroke={mainColor} strokeWidth="1.5"/></svg>,
      <svg key="box" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="12" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M2 8h14M9 4v12" stroke={mainColor} strokeWidth="1.5"/></svg>,
      <svg key="clock" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={mainColor} strokeWidth="1.5"/><path d="M9 5v4l3 2" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round"/></svg>,
      <svg key="loc" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C6.24 2 4 4.24 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.76-2.24-5-5-5z" stroke={mainColor} strokeWidth="1.5"/><circle cx="9" cy="7" r="1.5" stroke={mainColor} strokeWidth="1.5"/></svg>,
      <svg key="phone" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 2h3l1.5 4-2 1.5a10 10 0 004 4L12 10l4 1.5V15a1 1 0 01-1 1C8 16 2 10 2 3a1 1 0 011-1z" stroke={mainColor} strokeWidth="1.5"/></svg>,
      <svg key="mail" width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="1" stroke={mainColor} strokeWidth="1.5"/><path d="M2 4l7 5 7-5" stroke={mainColor} strokeWidth="1.5"/></svg>,
      <svg key="info2" width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={mainColor} strokeWidth="1.5"/><path d="M9 8v5M9 5.5v.5" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round"/></svg>,
      <svg key="star2" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2l2 4.5 5 .5-3.5 3.5 1 5L9 13l-4.5 2.5 1-5L2 7l5-.5z" stroke={mainColor} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
    ];
    const shippingBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
    return (
      <div style={{ background: shippingBg, padding: "160px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 24, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a2e", lineHeight: 1.3 })}>
              {titleEl.content}
            </div>
          )}
          {decoLine(mainColor)}
        </div>
        {/* 테이블 형태 정돈 */}
        <div style={{ maxWidth: 640, margin: "0 auto", borderRadius: 16, overflow: "hidden", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, boxShadow: isDarkBg ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 24px rgba(0,0,0,0.05)" }}>
          {/* 테이블 헤더 */}
          <div style={{ padding: "14px 24px", background: isDarkBg ? `${mainColor}20` : `${mainColor}08`, borderBottom: `2px solid ${isDarkBg ? `${mainColor}30` : `${mainColor}15`}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: mainColor }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#555", letterSpacing: 1 }}>
              {secType === "shipping" ? "SHIPPING INFO" : secType === "contact" ? "CONTACT" : "PRODUCT INFO"}
            </span>
          </div>
          {bodyEls.map((el, bi) => {
            const parts = (el.content || "").split("|").map(s => s.trim());
            const hasLabel = parts.length > 1;
            return (
              <div key={bi} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", borderBottom: bi < bodyEls.length - 1 ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` : "none", background: bi % 2 === 0 ? (isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)") : "transparent", transition: "background 0.15s ease" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: isDarkBg ? `${mainColor}15` : `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${isDarkBg ? `${mainColor}20` : `${mainColor}10`}` }}>
                  {shippingIcons[bi % shippingIcons.length]}
                </div>
                {hasLabel ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#444", minWidth: 90, borderRight: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingRight: 16 }}>{parts[0]}</span>
                    <span {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.55)" : "#666", lineHeight: 1.6 })}>{parts.slice(1).join(" | ")}</span>
                  </div>
                ) : (
                  <div {...editable(el)} style={eS(el, { flex: 1, fontSize: 14, fontWeight: el.fontWeight || "400", color: el.color || (isDarkBg ? "rgba(255,255,255,0.75)" : "#444"), lineHeight: 1.8 })}>
                    {el.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  EVENT -- 번들 프로모션형 (상단 히어로+가격 / 하단 2분할)
  // ════════════════════════════════════════
  if (layout === "bundle_promo") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const descEl = els.find(e => e.role === "body" && !e.role_hint && e.fontWeight !== "700");
    const benefitEl = els.find(e => e.role_hint === "benefit");
    const pricingEl = els.find(e => e.role_hint === "pricing");
    const bundleTitleEl = els.find(e => e.role_hint === "bundle_title");
    const bundleLeftEl = els.find(e => e.role_hint === "bundle_left");
    const bundleRightEl = els.find(e => e.role_hint === "bundle_right");
    const bundleRightDescEl = els.find(e => e.role_hint === "bundle_right_desc");
    const badgeEl = els.find(e => e.type === "badge");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const themeColor = isDarkBg ? "#5a7a4e" : "#7a8c6e";
    const prices = pricingEl?.content?.split("|") || ["69,000", "34,500"];

    return (
      <div style={{ overflow: "hidden" }}>
        {/* 상단 히어로 */}
        <div style={{ background: isDarkBg ? "#1a2018" : "#f4f1ec", padding: "56px 48px 0", display: "flex", gap: 32, alignItems: "flex-end", position: "relative" }}>
          {/* 왼쪽 텍스트 */}
          <div style={{ flex: "0 0 45%", paddingBottom: 56 }}>
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", lineHeight: 1.35, marginBottom: 8, whiteSpace: "pre-line" })}>{titleEl.content}</div>}
            {descEl && <div {...editable(descEl)} style={eS(descEl, { fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", marginBottom: 20, lineHeight: 1.6 })}>{descEl.content}</div>}
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { display: "inline-block", background: subtitleEl.bg || themeColor, color: "#ffffff", padding: "6px 16px", borderRadius: 4, fontSize: 13, fontWeight: 700, marginBottom: 12 })}>{subtitleEl.content}</div>}
            {benefitEl && <div {...editable(benefitEl)} style={eS(benefitEl, { fontSize: 15, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.85)" : "#333333", marginBottom: 16, lineHeight: 1.6 })}>{benefitEl.content}</div>}
            {/* 가격 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.35)" : "#999999" }}>소비자가</span>
              <span style={{ fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbbbbb", textDecoration: "line-through" }}>{prices[0]}</span>
              <span style={{ fontSize: 14, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbbbbb" }}>&rarr;</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" }}>&won;</span>
              {pricingEl && <span {...editable(pricingEl)} style={eS(pricingEl, { fontSize: 32, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{prices[1]}</span>}
            </div>
          </div>
          {/* 오른쪽 제품 이미지 */}
          <div style={{ flex: "0 0 50%", minHeight: 320, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ width: "100%", height: 300, borderRadius: "12px 12px 0 0", overflow: "hidden", background: isDarkBg ? "linear-gradient(135deg, #2a3528, #1e2a1c)" : "linear-gradient(135deg, #e8e4dd, #d8d4cc)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {productImg ? (
                <img src={productImg} alt="" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                  <div style={{ width: 80, height: 200, background: `linear-gradient(180deg, #f8f6f2, #e8e4de)`, borderRadius: "20px 20px 8px 8px", position: "relative" }}>
                    <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 40, height: 50, background: themeColor, borderRadius: 4, opacity: 0.5 }} />
                  </div>
                  <div style={{ width: 70, height: 220, background: themeColor, borderRadius: 6 }} />
                </div>
              )}
              {imgButtons()}
            </div>
          </div>
        </div>

        {/* 하단 특별 구성 */}
        <div style={{ background: isDarkBg ? "#111111" : "#ffffff", padding: "48px 48px 56px" }}>
          {/* 타이틀 + 다이아몬드 장식 */}
          {bundleTitleEl && (
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: themeColor, transform: "rotate(45deg)", display: "inline-block" }} />
                  <span style={{ width: 4, height: 4, background: themeColor, transform: "rotate(45deg)", display: "inline-block", opacity: 0.5 }} />
                </span>
                <span {...editable(bundleTitleEl)} style={eS(bundleTitleEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a" })}>{bundleTitleEl.content}</span>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <span style={{ width: 4, height: 4, background: themeColor, transform: "rotate(45deg)", display: "inline-block", opacity: 0.5 }} />
                  <span style={{ width: 6, height: 6, background: themeColor, transform: "rotate(45deg)", display: "inline-block" }} />
                </span>
              </div>
            </div>
          )}

          {/* 2분할 */}
          <div style={{ display: "flex", gap: 0, alignItems: "stretch", position: "relative" }}>
            {/* 왼쪽 */}
            <div style={{ flex: 1, padding: "32px 28px", textAlign: "center", background: isDarkBg ? "rgba(255,255,255,0.03)" : "#ffffff" }}>
              {bundleLeftEl && <div {...editable(bundleLeftEl)} style={eS(bundleLeftEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 20 })}>{bundleLeftEl.content}</div>}
              <div style={{ width: "100%", height: 140, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#eeeeee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {sec.bundleLeftImg ? (
                  <img src={sec.bundleLeftImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    {[0,1,2,3,4].map(ti => (
                      <div key={ti} style={{ width: 28, height: 80, background: `linear-gradient(180deg, ${isDarkBg ? "#333333" : "#f0ede8"}, ${isDarkBg ? "#222222" : "#e0dcd5"})`, borderRadius: "8px 8px 4px 4px", position: "relative" }}>
                        <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translateX(-50%)", width: 14, height: 16, background: themeColor, borderRadius: 2, opacity: 0.4 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* + 버튼 */}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, background: themeColor, color: "#ffffff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, zIndex: 2, boxShadow: `0 2px 12px ${themeColor}50` }}>+</div>

            {/* 오른쪽 */}
            <div style={{ flex: 1, padding: "32px 28px", textAlign: "center", background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f4f1ec", borderRadius: 12 }}>
              {bundleRightEl && <div {...editable(bundleRightEl)} style={eS(bundleRightEl, { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 20 })}>{bundleRightEl.content}</div>}
              <div style={{ width: "100%", height: 140, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#eeeeee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden" }}>
                {sec.bundleRightImg ? (
                  <img src={sec.bundleRightImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 160, height: 80, background: isDarkBg ? "#5a4a3a" : "#c4a77d", borderRadius: "50% / 30%", position: "relative" }}>
                    <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 50, height: 50, borderRadius: "50%", background: themeColor, opacity: 0.5 }} />
                  </div>
                )}
              </div>
              {bundleRightDescEl && <div {...editable(bundleRightDescEl)} style={eS(bundleRightDescEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.7 })}>{bundleRightDescEl.content}</div>}
              {badgeEl && <div style={{ display: "inline-block", marginTop: 12, padding: "4px 14px", background: badgeEl.bg || themeColor, color: badgeEl.color || "#ffffff", fontSize: 12, fontWeight: 700, borderRadius: 20, transform: "rotate(-3deg)" }}>{badgeEl.content}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  EVENT -- 종합 프로모션형 (서브+타이틀+Gift+3컬럼+브랜드)
  // ════════════════════════════════════════
  if (layout === "promo_full") {
    const subtitleEl = findEl("subtitle");
    const titleEl = findEl("title");
    const periodEl = els.find(e => e.role_hint === "period");
    const giftEl = els.find(e => e.role_hint === "gift");
    const benefitChecks = els.filter(e => e.role_hint === "benefit_check");
    const productInfoEl = els.find(e => e.role_hint === "product_info");
    const brandIntroEl = els.find(e => e.role_hint === "brand_intro");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const accentColor = mainColor || "#4a8cc8";

    const giftParts = (giftEl?.content || "").split("|");
    const infoParts = (productInfoEl?.content || "").split("|");
    const brandParts = (brandIntroEl?.content || "").split("|");

    return (
      <div style={{ background: isDarkBg ? `linear-gradient(180deg, ${bgCol}, #111518 40%, #111 100%)` : `linear-gradient(180deg, ${bgCol}, #f0f5fa 40%, #fff 100%)`, padding: "48px 40px 40px", position: "relative", overflow: "hidden" }}>

        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 24, position: "relative", zIndex: 1 }}>
          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#555555", marginBottom: 8 })}>{subtitleEl.content}</div>}
          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 30, fontWeight: 900, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 })}>{titleEl.content}</div>}
          {periodEl && <div {...editable(periodEl)} style={eS(periodEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa" })}>{periodEl.content}</div>}
        </div>

        {/* Gift 바 */}
        {giftEl && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: isDarkBg ? "rgba(255,255,255,0.05)" : "#ffffff", borderRadius: 12, padding: "16px 24px", marginBottom: 36, boxShadow: isDarkBg ? "none" : "0 2px 12px rgba(0,0,0,0.04)", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: isDarkBg ? "#f08060" : "#e06040", fontStyle: "italic" }}>Gift</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 4 }}>{giftParts[0]}</div>
              {giftParts[1] && <div {...editable(giftEl)} style={eS(giftEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#888888", lineHeight: 1.5 })}>{giftParts[1]}</div>}
            </div>
          </div>
        )}

        {/* 3컬럼: 효능 | 제품 | 설명 */}
        <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 36, position: "relative", zIndex: 1, flexDirection: isMobile ? "column" : "row" }}>
          {/* 좌측 효능 */}
          <div style={{ flex: "0 0 25%", display: "flex", flexDirection: "column", gap: 16 }}>
            {benefitChecks.map((el, bi) => (
              <div key={bi} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: isDarkBg ? "#3a7ab0" : accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5L9.5 4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#333333" })}>{el.content}</span>
              </div>
            ))}
          </div>
          {/* 중앙 제품 */}
          <div style={{ flex: "0 0 35%", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {productImg ? (
              <img src={productImg} alt="" style={{ maxWidth: "80%", maxHeight: 280, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 120, height: 220, background: isDarkBg ? "linear-gradient(180deg, #222, #1a1a1a)" : "linear-gradient(180deg, #fff, #f0f0f0)", borderRadius: "16px 16px 8px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", position: "relative" }}>
                <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 60, height: 70, background: accentColor, borderRadius: 4, opacity: 0.4 }} />
              </div>
            )}
            {imgButtons()}
          </div>
          {/* 우측 설명 */}
          {productInfoEl && (
            <div style={{ flex: "0 0 35%" }}>
              <div style={{ fontSize: 11, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#aaaaaa", marginBottom: 8 }}>{infoParts[0]}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#1a1a1a", marginBottom: 8 }}>{infoParts[1]}</div>
              <div {...editable(productInfoEl)} style={eS(productInfoEl, { fontSize: 13, color: isDarkBg ? "rgba(255,255,255,0.45)" : "#777777", lineHeight: 1.7 })}>{infoParts[2]}</div>
            </div>
          )}
        </div>

        {/* 브랜드 소개 박스 */}
        {brandIntroEl && (
          <div style={{ background: isDarkBg ? "rgba(255,255,255,0.04)" : "#f5f8fc", borderRadius: 12, padding: "28px 32px", display: "flex", gap: 24, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
            <div style={{ flex: "0 0 120px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 300, fontStyle: "italic", color: isDarkBg ? "#5a9ad0" : accentColor }}>Brand</div>
              <div style={{ fontSize: 9, color: isDarkBg ? "rgba(255,255,255,0.25)" : "#aaaaaa", marginTop: 4 }}>RECOMMENDED BY EXPERTS</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: isDarkBg ? "#ffffff" : "#333333", marginBottom: 8 }}>{brandParts[0]}</div>
              <div {...editable(brandIntroEl)} style={eS(brandIntroEl, { fontSize: 12, color: isDarkBg ? "rgba(255,255,255,0.4)" : "#777777", lineHeight: 1.7 })}>{brandParts[1]}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  EVENT / PROMOTION
  // ════════════════════════════════════════
  if (secType === "event") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const bodyEls = els.filter(e => e.type === "text" && e.role !== "title" && e.role !== "subtitle");
    const badge = els.find(e => e.type === "badge");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;

    // 변형: 2톤 분할 이벤트 배너 (크림 상단 + 다크 하단)
    if (dv % 6 >= 2 && dv % 6 <= 4) {
      const topBg = dv % 2 === 0 ? "linear-gradient(180deg, #f5f0e8, #ede5d8)" : "linear-gradient(180deg, #f0f0f5, #e8e8f0)";
      const botBg = dv % 2 === 0 ? "#1a2640" : "#1a1a2e";
      const accentTxt = dv % 2 === 0 ? "#8B7355" : "#9b8ec4";
      return (
        <div>
          {/* 상단: 크림/베이지 영역 */}
          <div style={{ background: topBg, position: "relative", overflow: "hidden", padding: "48px 48px 60px" }}>
            {/* 배경 아치 장식 */}
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 20, pointerEvents: "none", opacity: 0.06 }}>
              {[80,60,100,60,80].map((h, ai) => (
                <div key={ai} style={{ width: 70, height: h, borderRadius: "35px 35px 0 0", background: isDarkBg ? "#fff" : "#000" }} />
              ))}
            </div>
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              {/* 브랜드 뱃지 (도장 스타일) */}
              {badge && (
                <div style={{ position: "absolute", top: 0, right: 40 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2.5px solid #c0392b`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)" }}>
                    <span {...editable(badge)} style={eS(badge, { fontSize: 10, fontWeight: 900, color: "#c0392b", textAlign: "center", lineHeight: 1.2 })}>{badge.content}</span>
                  </div>
                </div>
              )}
              {/* 서브타이틀 */}
              {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 600, color: accentTxt, marginBottom: 12, letterSpacing: 2 })}>{subtitleEl.content}</div>}
              {/* 초대형 골드 타이틀 */}
              {titleEl && (
                <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 52, fontWeight: 900, color: "transparent", backgroundImage: "linear-gradient(180deg, #c9a961, #a07830, #c9a961)", WebkitBackgroundClip: "text", backgroundClip: "text", lineHeight: 1.2, marginBottom: 24, letterSpacing: -1 })}>
                  {titleEl.content}
                </div>
              )}
              {/* 설명 텍스트 */}
              {bodyEls.slice(0, 2).map((el, bi) => (
                <div key={bi} {...editable(el)} style={eS(el, { fontSize: 14, color: accentTxt, lineHeight: 1.9, marginBottom: 6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
              ))}
              {/* 중앙 제품 이미지 */}
              <div style={{ width: "100%", maxWidth: 500, height: 400, margin: "36px auto 0", borderRadius: 12, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${mainColor}15, ${mainColor}08)`, boxShadow: "0 12px 48px rgba(0,0,0,0.08)" }}>
                {productImg ? (
                  <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accentTxt} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a4 4 0 00-8 0v2"/></svg>
                  </div>
                )}
                {imgButtons()}
              </div>
            </div>
          </div>
          {/* 하단: 다크 혜택 배너 */}
          <div style={{ background: botBg, padding: "48px 48px 56px", textAlign: "center" }}>
            {/* BENEFIT 구분 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 3 }}>BENEFIT</span>
              <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
            </div>
            {/* 혜택 텍스트 */}
            {bodyEls.slice(2).map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: bi === 0 ? 20 : 14, fontWeight: bi === 0 ? 900 : 500, color: bi === 0 ? "#fff" : "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 10, maxWidth: 480, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
            ))}
            {bodyEls.length <= 2 && (
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.6, marginBottom: 10 }}>
                지금 구매하시면 <span style={{ color: "#c9a961" }}>특별 혜택</span>을 드립니다
              </div>
            )}
            {/* 혜택 아이콘 3열 */}
            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 28 }}>
              {["무료배송", "당일출고", "선물포장"].map((label, li) => (
                <div key={li} style={{ textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c9a961" strokeWidth="1.5" strokeLinecap="round">
                      {li === 0 && <><rect x="1" y="5" width="10" height="8" rx="1"/><path d="M11 8h3l2 3v2h-5V8z"/><circle cx="4.5" cy="14.5" r="1.5"/><circle cx="13.5" cy="14.5" r="1.5"/></>}
                      {li === 1 && <><rect x="2" y="4" width="14" height="12" rx="1"/><path d="M2 8h14M9 4v12"/></>}
                      {li === 2 && <><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 8V6a4 4 0 00-8 0v2"/></>}
                    </svg>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 기본 이벤트 렌더러
    return (
      <div style={{ textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* 풀 배경 이미지 */}
        {productImg ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, ${mainColor}30, ${colorPalette?.gradient || "#9b8ec4"}30)` }} />
        )}
        {/* 오버레이 */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? `linear-gradient(135deg, ${mainColor}cc, rgba(0,0,0,0.7))` : "transparent" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "120px 56px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {badge && (
            <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 28px", borderRadius: 24, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 14, fontWeight: 800, marginBottom: 24, border: "1px solid rgba(255,255,255,0.2)", letterSpacing: 1 })}>
              {badge.content}
            </span>
          )}
          {subtitleEl && (
            <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 16, letterSpacing: 3 })}>
              {subtitleEl.content}
            </div>
          )}
          {titleEl && (
            <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 24, textShadow: "0 2px 16px rgba(0,0,0,0.3)" })}>
              {titleEl.content}
            </div>
          )}
          {bodyEls.map((el, bi) => (
            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, marginBottom: 14, maxWidth: 520 })}>
              {el.content}
            </div>
          ))}
        </div>
        {/* 이미지 교체 */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
          <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>배경 교체</label>
        </div>
        <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
      </div>
    );
  }

  // ════════════════════════════════════════
  //  CTA SECTION (구매 유도)
  // ════════════════════════════════════════
  if (secType === "cta") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const priceEl = findEl("price");
    const bodyEls = els.filter(e => e.type === "text" && e.role === "body");
    const badge = els.find(e => e.type === "badge");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    // 가격에서 할인 정보 추출
    const priceText = priceEl?.content || "";
    const hasDiscount = /할인|%|원래|정가/.test(priceText) || badge?.content?.includes("%");

    // 변형: 제품 중심 CTA (제품 이미지 + 가격 카드 + 보증 아이콘)
    if (dv % 6 >= 2) {
      const ctaBg = isDarkBg ? bgCol : "#fff";
      const ctaTxt = isDarkBg ? "#fff" : "#1a1a1a";
      const ctaSub = isDarkBg ? "rgba(255,255,255,0.55)" : "#888";
      return (
        <div style={{ background: ctaBg, padding: isMobile ? "80px 24px" : "120px 56px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* 배경 원형 장식 */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${mainColor}0a 0%, transparent 70%)`, pointerEvents: "none" }} />
          {/* subtle 도트 패턴 */}
          <div style={{ position: "absolute", inset: 0, opacity: isDarkBg ? 0.03 : 0.025, pointerEvents: "none", backgroundImage: `radial-gradient(${isDarkBg ? "#fff" : "#000"} 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: ctaTxt, lineHeight: 1.25, marginBottom: 24 })}>{titleEl.content}</div>}
            {bodyEls.map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: ctaSub, lineHeight: 1.8, marginBottom: 10, maxWidth: 520, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
            ))}
            {/* 제품 이미지 */}
            {productImg && (
              <div style={{ width: isMobile ? "90%" : "80%", height: isMobile ? 320 : 400, margin: "32px auto", borderRadius: 16, overflow: "hidden", boxShadow: `0 16px 48px ${mainColor}20`, position: "relative" }}>
                <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {imgButtons({ bottom: 8, right: 8 })}
              </div>
            )}
            {/* 가격 영역 -- 할인 뱃지 포함 */}
            {priceEl && (
              <div style={{ marginTop: 24, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
                <div {...editable(priceEl)} style={eS(priceEl, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: ctaTxt, letterSpacing: -1 })}>{priceEl.content}</div>
                {badge && (
                  <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "#ef4444", color: "#fff", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(239,68,68,0.3)" })}>{badge.content}</span>
                )}
              </div>
            )}
            {!priceEl && badge && (
              <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 24px", borderRadius: 24, background: `${mainColor}12`, color: mainColor, fontSize: 14, fontWeight: 800, marginBottom: 28, border: `1.5px solid ${mainColor}25` })}>{badge.content}</span>
            )}
            {/* CTA 버튼 */}
            <div style={{ maxWidth: isMobile ? 320 : 480, margin: "0 auto" }}>
              <div style={{ width: "100%", padding: "18px 0", borderRadius: 28, background: `linear-gradient(135deg, ${mainColor}, ${mainColor}dd)`, color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 900, boxShadow: `0 8px 32px ${mainColor}40, 0 2px 8px ${mainColor}20`, letterSpacing: 1, height: 58, display: "flex", alignItems: "center", justifyContent: "center", animation: "ctaPulse 2s ease-in-out infinite", position: "relative", overflow: "hidden" }}>
                <span style={{ position: "relative", zIndex: 1 }}>지금 구매하기</span>
              </div>
              {/* Urgency 배지 */}
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <span style={{ display: "inline-block", padding: "6px 18px", borderRadius: 20, background: isDarkBg ? "rgba(239,68,68,0.15)" : "#fef2f2", color: "#ef4444", fontSize: 12, fontWeight: 700, border: "1px solid rgba(239,68,68,0.2)" }}>
                  한정 수량 / 조기 마감 가능
                </span>
              </div>
            </div>
            {/* 보증 아이콘 태그 */}
            <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 32, marginTop: 32, flexWrap: "wrap" }}>
              {[
                { label: "무료배송", icon: "M1 5h10v8H1z M11 8h3l2 3v2h-5V8z" },
                { label: "당일출고", icon: "M12 2v10l4.5-2.5L12 2z M2 12h8v8H2z" },
                { label: "100% 정품", icon: "M9 12l2 2 4-4 M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "안전결제", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
              ].map((item, ti) => (
                <div key={ti} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: isDarkBg ? "rgba(255,255,255,0.04)" : `${mainColor}08`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : `${mainColor}15`}` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                  </div>
                  <span style={{ fontSize: 11, color: ctaSub, fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <style>{`@keyframes ctaPulse { 0%,100%{transform:scale(1);box-shadow:0 8px 32px rgba(0,0,0,0.15)} 50%{transform:scale(1.03);box-shadow:0 12px 40px rgba(0,0,0,0.2)} }`}</style>
        </div>
      );
    }

    // 기본 CTA (풀 배경 이미지 + 오버레이)
    return (
      <div style={{ padding: 0, textAlign: "center", position: "relative", overflow: "hidden", minHeight: 1260 }}>
        {productImg ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `linear-gradient(135deg, ${mainColor}, ${colorPalette?.gradient || "#9b8ec4"})` }} />
        )}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: productImg ? "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 100%)" : "transparent" }} />
        <div style={{ position: "relative", zIndex: 2, padding: isMobile ? "100px 24px" : "140px 56px" }}>
          {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 14, letterSpacing: 4, textTransform: "uppercase" })}>{subtitleEl.content}</div>}
          {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 38, fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 24, textShadow: "0 2px 16px rgba(0,0,0,0.3)" })}>{titleEl.content}</div>}
          {bodyEls.map((el, bi) => (
            <div key={bi} {...editable(el)} style={eS(el, { fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, marginBottom: 14, maxWidth: 520, marginLeft: "auto", marginRight: "auto" })}>{el.content}</div>
          ))}
          {priceEl && (
            <div style={{ marginTop: 36, marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <div {...editable(priceEl)} style={eS(priceEl, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: "#fff", letterSpacing: -1 })}>{priceEl.content}</div>
              {badge && <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "10px 22px", borderRadius: 12, background: "#ef4444", color: "#fff", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(239,68,68,0.3)" })}>{badge.content}</span>}
            </div>
          )}
          {!priceEl && badge && <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "8px 20px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 28, border: "1px solid rgba(255,255,255,0.2)" })}>{badge.content}</span>}
          <div style={{ maxWidth: isMobile ? 320 : 480, margin: "0 auto" }}>
            <div style={{ width: "100%", padding: "18px 0", borderRadius: 28, background: `linear-gradient(135deg, ${mainColor}, ${mainColor}dd)`, color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 900, boxShadow: `0 8px 32px ${mainColor}40, 0 2px 8px rgba(0,0,0,0.2)`, letterSpacing: 1, height: 58, display: "flex", alignItems: "center", justifyContent: "center", animation: "ctaPulse 2s ease-in-out infinite", position: "relative", overflow: "hidden" }}>
              <span style={{ position: "relative", zIndex: 1 }}>지금 구매하기</span>
            </div>
            {/* Urgency 배지 */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ display: "inline-block", padding: "6px 18px", borderRadius: 20, background: "rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 12, fontWeight: 700, border: "1px solid rgba(239,68,68,0.3)" }}>
                한정 수량 / 조기 마감 가능
              </span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 16 : 24, marginTop: 28, flexWrap: "wrap" }}>
            {["무료배송", "당일출고", "100% 정품", "안전결제"].map((t, ti) => (
              <span key={ti} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.4)", display: "inline-block" }} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <style>{`@keyframes ctaPulse { 0%,100%{transform:scale(1);box-shadow:0 8px 32px rgba(0,0,0,0.15)} 50%{transform:scale(1.03);box-shadow:0 12px 40px rgba(0,0,0,0.2)} }`}</style>
      </div>
    );
  }

  return null;
}
