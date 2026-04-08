import React from "react";

export function renderContent(ctx) {
  const {
    findEl, findEls, editable, eS, imgButtons, decoLine, decoLineLong,
    renderPlaceholder, iconCircle, dv, mainColor, isDarkBg, bgCol, acc, bdr,
    els, sec, i, images, heroImgSrc, aiImgSrc, productImgForSection,
    colorPalette, sectionImages, secImg,
    layout: _layoutFromCtx, isMobile, sectionImgInputId, handleSectionImageChange,
    generateSectionImage, setSections
  } = ctx;

  const secType = ctx.sec.type || "point";
  const layout = ctx.sec.layout || "centered_text";

  // ════════════════════════════════════════
  //  REVIEWS (카드 스타일)
  // ════════════════════════════════════════
  if (secType === "review" || layout === "card_list") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const badge = els.find(e => e.type === "badge");
    const reviewEls = els.filter(e => e.role === "review_text" || e.role === "review_name" || e.role === "star");
    const cards = [];
    reviewEls.forEach(el => {
      if (el.role === "review_name" || cards.length === 0) {
        cards.push([]);
      }
      if (cards.length > 0) cards[cards.length - 1].push(el);
    });
    // 빈 카드 제거
    const filteredCards = cards.filter(c => c.some(e => e.role === "review_name"));
    const profileColors = [mainColor, "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9"];
    const reviewBg = bgCol.startsWith("linear-gradient") ? bgCol : bgCol;
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    // 평균 별점 계산
    const avgStar = (() => {
      const stars = reviewEls.filter(e => e.role === "star").map(e => parseInt(e.content) || 5);
      return stars.length ? (stars.reduce((a, b) => a + b, 0) / stars.length).toFixed(1) : "4.9";
    })();

    // ═══ 변형: 심플 세로 리뷰 (이미지 없음, 인용문 스타일) ═══
    if (dv % 6 >= 3) {
      return (
        <div style={{ background: reviewBg, padding: isMobile ? "80px 24px" : "100px 64px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 })}>{subtitleEl.content}</div>}
            {titleEl ? <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25 })}>{titleEl.content}</div> : <div style={{ fontSize: 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a" }}>REAL REVIEW</div>}
            {/* 평균 별점 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a" }}>{avgStar}</span>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 5 }, (_, si) => <span key={si} style={{ fontSize: 18, color: si < Math.round(parseFloat(avgStar)) ? "#fbbf24" : (isDarkBg ? "rgba(255,255,255,0.15)" : "#e0e0e0") }}>{String.fromCharCode(9733)}</span>)}
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {filteredCards.map((group, gi) => (
              <div key={gi} style={{ padding: "28px 32px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 24, fontSize: 40, color: `${mainColor}12`, fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>"</div>
                {group.filter(e => e.role === "review_text").map((el, ri) => (
                  <div key={ri} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.8)" : "#444", lineHeight: 1.8, marginBottom: 16 })}>{el.content}</div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {group.filter(e => e.role === "review_name").map((el, ni) => (
                    <div key={ni} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${profileColors[gi % profileColors.length]}, ${profileColors[(gi + 2) % profileColors.length]}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{(el.content || "?")[0]}</div>
                      <div>
                        <div {...editable(el)} style={eS(el, { fontSize: 13, fontWeight: 700, color: isDarkBg ? "#fff" : "#333" })}>{el.content}</div>
                        <div style={{ display: "flex", gap: 1 }}>{Array.from({ length: 5 }, (_, si) => <span key={si} style={{ fontSize: 11, color: si < 5 ? "#fbbf24" : "#e0e0e0" }}>{String.fromCharCode(9733)}</span>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ 기본 리뷰 (이미지 배너 + 카드 그리드) ═══
    return (
      <div style={{ background: reviewBg, position: "relative", overflow: "hidden" }}>
        {/* 상단 이미지 띠 + 별점 오버레이 */}
        <div style={{ width: "100%", height: 420, position: "relative", overflow: "hidden" }}>
          {productImg ? (
            <img src={productImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.5)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${mainColor}30, ${mainColor}10)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }} />
          {/* 별점 오버레이 */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 56px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              {badge && (
                <span {...editable(badge)} style={eS(badge, { display: "inline-block", padding: "6px 18px", borderRadius: 20, background: mainColor, color: "#fff", fontSize: 11, fontWeight: 800, marginBottom: 12, letterSpacing: 2 })}>
                  {badge.content}
                </span>
              )}
              {subtitleEl && (
                <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 })}>
                  {subtitleEl.content}
                </div>
              )}
              {titleEl ? (
                <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1.25, textShadow: "0 2px 12px rgba(0,0,0,0.3)" })}>
                  {titleEl.content}
                </div>
              ) : (
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>REAL REVIEW</div>
              )}
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>{avgStar}</div>
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 6 }}>
                {Array.from({ length: 5 }, (_, si) => (
                  <span key={si} style={{ fontSize: 16, color: si < Math.round(parseFloat(avgStar)) ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>{String.fromCharCode(9733)}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 600 }}>{filteredCards.length}개 리뷰</div>
            </div>
          </div>
          {/* 이미지 교체 버튼 */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 4 }}>
            <label htmlFor={sectionImgInputId} onClick={e => e.stopPropagation()}
              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>교체</label>
          </div>
          <input id={sectionImgInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSectionImageChange} />
        </div>
        {/* 리뷰 카드 그리드 */}
        <div style={{ padding: isMobile ? "40px 20px 60px" : "60px 56px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : (filteredCards.length >= 3 ? "repeat(3, 1fr)" : filteredCards.length === 2 ? "1fr 1fr" : "1fr"), gap: 20, maxWidth: 820, margin: "0 auto" }}>
            {filteredCards.map((group, gi) => (
              <div key={gi} style={{ padding: "28px 24px", borderRadius: 16, background: isDarkBg ? "rgba(255,255,255,0.04)" : "#fff", boxShadow: isDarkBg ? "0 2px 12px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.06)", position: "relative", border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
                {/* 따옴표 장식 */}
                <div style={{ position: "absolute", top: 16, right: 20, fontSize: 36, color: `${mainColor}15`, fontFamily: "Georgia, serif", lineHeight: 1, pointerEvents: "none" }}>"</div>
                {/* 프로필 + 이름 + 별점 */}
                {group.filter(e => e.role === "review_name").map((el, ni) => (
                  <div key={ni} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${profileColors[gi % profileColors.length]}, ${profileColors[(gi + 2) % profileColors.length]}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: `0 2px 8px ${profileColors[gi % profileColors.length]}30` }}>
                      {(el.content || "?")[0]}
                    </div>
                    <div>
                      <div {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 700, color: isDarkBg ? "#fff" : "#333", marginBottom: 3 })}>
                        {el.content}
                      </div>
                      {(() => {
                        const star = group.find(e => e.role === "star");
                        const count = star ? (parseInt(star.content) || 5) : 5;
                        return (
                          <div style={{ display: "flex", gap: 1 }}>
                            {Array.from({ length: 5 }, (_, si) => (
                              <span key={si} style={{ fontSize: 13, color: si < count ? "#fbbf24" : (isDarkBg ? "rgba(255,255,255,0.1)" : "#e0e0e0") }}>
                                {String.fromCharCode(9733)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {/* 후기 텍스트 */}
                {group.filter(e => e.role === "review_text").map((el, ri) => (
                  <div key={ri} {...editable(el)} style={eS(el, { fontSize: 14, fontWeight: 400, color: isDarkBg ? "rgba(255,255,255,0.75)" : "#444", lineHeight: 1.8, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" })}>
                    {el.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  //  STATS HIGHLIGHT (숫자 강조)
  // ════════════════════════════════════════
  if (secType === "stats_highlight") {
    const titleEl = findEl("title");
    const subtitleEl = findEl("subtitle");
    const statNums = findEls("stat_number");
    const statLabels = findEls("stat_label");
    const productImg = aiImgSrc || productImgForSection || images[0]?.preview || null;
    const extractPercent = (content) => {
      const num = parseFloat((content || "").replace(/[^0-9.]/g, ""));
      if (isNaN(num)) return 75;
      if (num > 100) return Math.min(100, (num / 10000) * 100 || 75);
      return Math.min(100, num);
    };

    // ═══ 변형: 좌측 수치 카드 스택 + 우측 대형 제품 (레퍼런스 기반) ═══
    if (dv % 6 === 3 && statNums.length >= 2) {
      const accentColor = mainColor || "#c0392b";
      return (
        <div style={{ background: `linear-gradient(180deg, ${mainColor}10 0%, ${mainColor}25 50%, ${mainColor}35 100%)`, padding: "80px 48px 60px", position: "relative", overflow: "hidden" }}>
          {/* 상단 타이틀 */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            {subtitleEl && <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 15, fontWeight: 600, color: `${mainColor}aa`, marginBottom: 10, letterSpacing: 1 })}>{subtitleEl.content}</div>}
            {titleEl && <div {...editable(titleEl)} style={eS(titleEl, { fontSize: 40, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.2, marginBottom: 20 })}>{titleEl.content}</div>}
            {findEls("body").length > 0 && (
              <div>
                <span style={{ fontSize: 16, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#666" }}>인체적용 실험으로 입증된 </span>
                <span {...editable(findEls("body")[0])} style={eS(findEls("body")[0], { fontSize: 18, fontWeight: 800, color: isDarkBg ? "#fff" : "#1a1a1a" })}>{findEls("body")[0].content}</span>
              </div>
            )}
          </div>
          {/* 본문: 좌측 수치 + 우측 제품 */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 720, margin: "0 auto" }}>
            {/* 좌측: 수치 카드 스택 */}
            <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              {statNums.map((sn, si) => (
                <div key={si}>
                  <div style={{ width: 200, padding: "24px 20px", borderRadius: 24, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)", textAlign: "center", border: "1px solid rgba(255,255,255,0.6)" }}>
                    {statLabels[si] && <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: 13, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#888", marginBottom: 8, lineHeight: 1.5 })}>{statLabels[si].content}</div>}
                    <div {...editable(sn)} style={eS(sn, { fontSize: 34, fontWeight: 900, color: accentColor, letterSpacing: -1 })}>{sn.content}</div>
                  </div>
                  {si < statNums.length - 1 && (
                    <div style={{ textAlign: "center", padding: "6px 0", fontSize: 18, color: isDarkBg ? "rgba(255,255,255,0.2)" : "#ddd", fontWeight: 300 }}>+</div>
                  )}
                </div>
              ))}
            </div>
            {/* 우측: 대형 제품 이미지 */}
            <div style={{ flex: "0 0 55%", position: "relative", height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {productImg ? (
                <img src={productImg} alt="" style={{ maxWidth: "85%", maxHeight: "100%", objectFit: "contain", transform: "rotate(-5deg)", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.1))" }} />
              ) : (
                <div style={{ width: 240, height: 360, borderRadius: 20, background: `linear-gradient(135deg, ${mainColor}20, ${mainColor}08)`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-5deg)", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={mainColor} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
              )}
              {imgButtons()}
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 180, height: 30, borderRadius: "50%", background: `${mainColor}12`, filter: "blur(16px)" }} />
            </div>
          </div>
          {/* 하단 출처 */}
          <div style={{ textAlign: "center", marginTop: 40, paddingTop: 20, borderTop: `1px solid ${isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
            {findEls("body").slice(1).map((el, bi) => (
              <div key={bi} {...editable(el)} style={eS(el, { fontSize: 10, color: isDarkBg ? "rgba(255,255,255,0.3)" : "#bbb", lineHeight: 1.8 })}>{el.content}</div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ 기본 stats 렌더러 (프로그레스 바 포함) ═══
    const statsBg = bgCol || "#fff";
    return (
      <div style={{ background: statsBg, position: "relative", overflow: "hidden" }}>
        <div style={{ padding: isMobile ? "80px 24px" : "120px 56px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            {subtitleEl && (
              <div {...editable(subtitleEl)} style={eS(subtitleEl, { fontSize: 12, fontWeight: 700, color: mainColor, letterSpacing: 5, textTransform: "uppercase", marginBottom: 14 })}>
                {subtitleEl.content}
              </div>
            )}
            {titleEl && (
              <div {...editable(titleEl)} style={eS(titleEl, { fontSize: isMobile ? 28 : 36, fontWeight: 900, color: isDarkBg ? "#fff" : "#1a1a1a", lineHeight: 1.25 })}>
                {titleEl.content}
              </div>
            )}
            {decoLine(mainColor, 48)}
          </div>
          {/* 숫자가 1개면 대형 원형 차트 포커스 */}
          {statNums.length === 1 ? (
            <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
              {/* 원형 프로그레스 */}
              <div style={{ width: 260, height: 260, margin: "0 auto 32px", position: "relative" }}>
                <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="130" cy="130" r="110" fill="none" stroke={isDarkBg ? "rgba(255,255,255,0.06)" : "#f0f0f0"} strokeWidth="14" />
                  <circle cx="130" cy="130" r="110" fill="none" stroke={mainColor} strokeWidth="14"
                    strokeDasharray={`${2 * Math.PI * 110 * extractPercent(statNums[0].content) / 100} ${2 * Math.PI * 110}`}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div {...editable(statNums[0])} style={eS(statNums[0], { fontSize: 36, fontWeight: 900, color: mainColor, lineHeight: 1 })}>
                    {statNums[0].content}
                  </div>
                </div>
              </div>
              {statLabels[0] && (
                <div {...editable(statLabels[0])} style={eS(statLabels[0], { fontSize: 20, fontWeight: 700, color: isDarkBg ? "rgba(255,255,255,0.6)" : "#888", marginBottom: 40 })}>
                  {statLabels[0].content}
                </div>
              )}
              {findEls("body").map((el, bi) => (
                <div key={bi} {...editable(el)} style={eS(el, { fontSize: 15, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#999", lineHeight: 1.8, marginBottom: 14 })}>
                  {el.content}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "center", gap: 0, maxWidth: 800, margin: "0 auto" }}>
              {statNums.map((sn, si) => {
                const pct = extractPercent(sn.content);
                return (
                  <div key={si} style={{ textAlign: "center", flex: 1, padding: isMobile ? "28px 16px" : "40px 24px", borderRight: (!isMobile && si < statNums.length - 1) ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` : "none", borderBottom: (isMobile && si < statNums.length - 1) ? `1px solid ${isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` : "none" }}>
                    <div {...editable(sn)} style={eS(sn, { fontSize: isMobile ? 36 : 48, fontWeight: 900, color: mainColor, lineHeight: 1, marginBottom: 12, letterSpacing: -2 })}>
                      {sn.content}
                    </div>
                    {/* 수평 프로그레스 바 */}
                    <div style={{ width: "80%", maxWidth: 160, height: 6, borderRadius: 3, background: isDarkBg ? "rgba(255,255,255,0.06)" : "#f0f0f0", margin: "0 auto 14px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${mainColor}, ${mainColor}cc)`, transition: "width 1s ease" }} />
                    </div>
                    {statLabels[si] && (
                      <div {...editable(statLabels[si])} style={eS(statLabels[si], { fontSize: isMobile ? 13 : 15, fontWeight: 600, color: isDarkBg ? "rgba(255,255,255,0.5)" : "#888" })}>
                        {statLabels[si].content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
