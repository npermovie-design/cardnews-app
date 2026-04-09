import React from "react";
import { SECTION_TYPES, PIPELINE_STEPS } from "../constants.js";
import { SECTION_TEMPLATES, SECTION_TYPE_LABELS } from "../../detailTemplates.js";
import { fileToBase64, resizeImage } from "../utils.jsx";
import { renderSection } from "../renderers/SectionDispatcher.jsx";

export default function EditorPhase({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  sections, setSections, activeSection, setActiveSection,
  selectedEl, setSelectedEl, sidebarTab, setSidebarTab,
  sidebarCollapsed, setSidebarCollapsed,
  sectionImages, setSectionImages, images, setImages,
  colorPalette, setColorPalette,
  templateTypeFilter, setTemplateTypeFilter,
  canvasZoom, setCanvasZoom,
  agentInput, setAgentInput, agentLoading, agentMessages,
  mediaSubTab, setMediaSubTab,
  stockImages, setStockImages,
  dragRef, snapGuide,
  setPhase, user, productName, extraInfo,
  generateSectionImage, generateAllImages, fetchStockImages, handleAgentSend,
  inputStyle,
}) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* 왼쪽 사이드바 */}
      <div style={{ width: sidebarCollapsed ? 0 : 280, minWidth: sidebarCollapsed ? 0 : 280, borderRight: sidebarCollapsed ? "none" : `1px solid ${bdr}`, display: "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", transition: "width 0.2s, min-width 0.2s", overflow: "hidden", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* 사이드바 탭 아이콘 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
          {[
            { key: "pages", icon: "☰", label: "페이지" },
            { key: "text", icon: "T", label: "텍스트" },
            { key: "templates", icon: "▦", label: "템플릿" },
            { key: "shapes", icon: "◇", label: "도형" },
            { key: "media", icon: "+", label: "자료" },
            { key: "color", icon: "◐", label: "색상" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSidebarTab(tab.key)}
              style={{
                width: "100%", padding: "10px 12px", background: sidebarTab === tab.key ? (D ? "rgba(124,106,255,0.15)" : "#f0eeff") : "transparent",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                color: sidebarTab === tab.key ? acc : muted, fontSize: 13, fontWeight: sidebarTab === tab.key ? 700 : 500,
                borderRadius: 8, margin: "0 8px",
              }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 사이드바 콘텐츠 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {sidebarTab === "pages" && (
            <>
              <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>총 {sections.length} 페이지</div>
              {sections.map((sec, i) => (
                <div key={sec.id} onClick={() => setActiveSection(i)}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("text/plain", String(i))}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const from = parseInt(e.dataTransfer.getData("text/plain"));
                    if (isNaN(from) || from === i) return;
                    setSections(prev => {
                      const arr = [...prev];
                      const [moved] = arr.splice(from, 1);
                      arr.splice(i, 0, moved);
                      return arr;
                    });
                    setActiveSection(i);
                  }}
                  style={{
                    padding: "10px 12px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                    border: `1.5px solid ${activeSection === i ? acc : bdr}`,
                    background: activeSection === i ? (D ? "rgba(124,106,255,0.1)" : "#f8f7ff") : "transparent",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: muted, cursor: "grab" }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: acc, fontWeight: 700 }}>
                        {SECTION_TYPES.find(t => t.id === sec.type)?.label || sec.type}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sec.elements?.find(e => e.role === "title")?.content || sec.label || ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* 섹션 추가 */}
              <button onClick={() => {
                const newSec = { id: `sec_new_${Date.now()}`, type: "point", label: "새 섹션", bg_color: colorPalette?.light_bg || "#ffffff", elements: [
                  { type: "text", role: "title", content: "새 섹션 제목", x: 50, y: 200, w: 760, fontSize: 36, fontWeight: "900", color: colorPalette?.main || "#1a1a2e" },
                  { type: "text", role: "body", content: "내용을 입력하세요", x: 50, y: 300, w: 760, fontSize: 16, fontWeight: "400", color: "#666", lineHeight: 1.8 },
                ] };
                setSections(prev => [...prev, newSec]);
                setActiveSection(sections.length);
              }}
                style={{
                  width: "100%", padding: "10px", borderRadius: 10, border: `1.5px dashed ${bdr}`,
                  background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginTop: 4,
                }}>
                + 섹션 추가
              </button>

              {/* 레이어 패널 — 선택된 섹션의 오브젝트 */}
              {activeSection < sections.length && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>
                    페이지 {activeSection + 1} 레이어
                  </div>
                  {/* 배경 이미지 레이어 */}
                  {sections[activeSection]?.bgImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, background: D ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${bdr}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        <img src={sections[activeSection].bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontSize: 10, color: muted, flex: 1 }}>배경 이미지</span>
                    </div>
                  )}
                  {/* 이미지 레이어 */}
                  {sectionImages[sections[activeSection]?.id]?.url && (
                    <div onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: -1, el: { type: "image", _type: "image", role: "section_image" } })}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, cursor: "pointer", background: selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? `${acc}15` : (D ? "rgba(255,255,255,0.03)" : "#f9f9f9"), border: `1px solid ${selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? acc : bdr}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        <img src={sectionImages[sections[activeSection].id].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontSize: 10, color: text, flex: 1 }}>섹션 이미지</span>
                    </div>
                  )}
                  {/* 텍스트/배지/도형 요소 레이어 */}
                  {(sections[activeSection]?.elements || []).map((el, ei) => {
                    const isActive = selectedEl?.secIdx === activeSection && selectedEl?.elIdx === ei;
                    const elCount = sections[activeSection]?.elements?.length || 0;
                    return (
                      <div key={ei} onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: ei, el: { ...el, _type: el.type === "shape" ? "shape" : "text" } })}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", background: isActive ? `${acc}15` : "transparent", border: `1px solid ${isActive ? acc : "transparent"}` }}>
                        <span style={{ fontSize: 9, color: acc, fontWeight: 700, width: 16, flexShrink: 0 }}>
                          {el.type === "badge" ? "B" : el.type === "divider" ? "—" : el.type === "shape" ? "S" : "T"}
                        </span>
                        <span style={{ fontSize: 10, color: text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {el.content?.slice(0, 20) || el.shape || el.role || el.type}
                        </span>
                        {/* 순서 변경 + 삭제 */}
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          {ei > 0 && (
                            <button onClick={() => {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: (s.elements || []).map((e, idx) => idx === ei - 1 ? s.elements[ei] : idx === ei ? s.elements[ei - 1] : e) }));
                              if (isActive) setSelectedEl(prev => ({ ...prev, elIdx: ei - 1 }));
                            }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="위로">
                              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2L2 6h6z" fill="currentColor"/></svg>
                            </button>
                          )}
                          {ei < elCount - 1 && (
                            <button onClick={() => {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: (s.elements || []).map((e, idx) => idx === ei ? s.elements[ei + 1] : idx === ei + 1 ? s.elements[ei] : e) }));
                              if (isActive) setSelectedEl(prev => ({ ...prev, elIdx: ei + 1 }));
                            }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="아래로">
                              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8L2 4h6z" fill="currentColor"/></svg>
                            </button>
                          )}
                          <button onClick={() => {
                            setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: (s.elements || []).filter((_, idx) => idx !== ei) }));
                            if (isActive) setSelectedEl(null);
                          }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer", padding: 0 }} title="삭제">
                            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* 텍스트 속성 패널 — 텍스트 선택 시 자동 표시 */}
          {sidebarTab === "text" && (
            <div>
              {selectedEl?.el?._type === "text" ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>텍스트 편집</div>

                  {/* 폰트 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>폰트</div>
                  <select value={selectedEl.el.fontFamily || "Pretendard"} onChange={e => {
                    const val = e.target.value;
                    setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fontFamily: val }) }));
                    setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fontFamily: val } }));
                  }} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 600, marginBottom: 14, cursor: "pointer" }}>
                    {[
                      { id: "Pretendard", label: "Pretendard" },
                      { id: "'Noto Sans KR'", label: "Noto Sans KR" },
                      { id: "SBAggroB", label: "SB Aggro Bold" },
                      { id: "'Cafe24Ssurround'", label: "Cafe24 Ssurround" },
                      { id: "MaruBuri", label: "MaruBuri" },
                      { id: "'GmarketSans'", label: "Gmarket Sans" },
                      { id: "serif", label: "Serif" },
                      { id: "monospace", label: "Monospace" },
                    ].map(f => <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>{f.label}</option>)}
                  </select>

                  {/* 크기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>크기</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="number" value={selectedEl.el.fontSize || 14} min={8} max={120}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 14;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fontSize: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fontSize: val } }));
                      }}
                      style={{ width: 70, padding: "8px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, fontWeight: 700, textAlign: "center" }} />
                    <span style={{ fontSize: 11, color: muted }}>px</span>
                  </div>

                  {/* 스타일 B/I/U/S */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>스타일</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {[
                      { key: "fontWeight", label: "B", values: ["900", "400"], style: { fontWeight: 900 } },
                      { key: "fontStyle", label: "I", values: ["italic", "normal"], style: { fontStyle: "italic" } },
                      { key: "textDecoration", label: "U", values: ["underline", "none"], style: { textDecoration: "underline" } },
                      { key: "textDecoration", label: "S", values: ["line-through", "none"], style: { textDecoration: "line-through" } },
                    ].map((s, si) => {
                      const isActive = selectedEl.el[s.key] === s.values[0];
                      return (
                        <button key={si} onClick={() => {
                          const val = isActive ? s.values[1] : s.values[0];
                          setSections(prev => prev.map((sec, idx) => idx !== selectedEl.secIdx ? sec : { ...sec, elements: sec.elements.map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, [s.key]: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, [s.key]: val } }));
                        }} style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: `1.5px solid ${isActive ? "#2196F3" : bdr}`,
                          background: isActive ? "rgba(33,150,243,0.1)" : "transparent",
                          color: isActive ? "#2196F3" : text, fontSize: 15, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", ...s.style,
                        }}>{s.label}</button>
                      );
                    })}
                  </div>

                  {/* 색상 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={selectedEl.el.color || "#000000"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, color: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, color: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{selectedEl.el.color || "#000000"}</span>
                  </div>

                  {/* 정렬 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>정렬</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {[
                      { align: "left", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6h8M2 9h12M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                      { align: "center", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 6h8M2 9h12M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                      { align: "right", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M6 6h8M2 9h12M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                    ].map(a => (
                      <button key={a.align} onClick={() => {
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textAlign: a.align }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textAlign: a.align } }));
                      }} style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: `1.5px solid ${selectedEl.el.textAlign === a.align ? "#2196F3" : bdr}`,
                        background: selectedEl.el.textAlign === a.align ? "rgba(33,150,243,0.1)" : "transparent",
                        color: selectedEl.el.textAlign === a.align ? "#2196F3" : muted,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{a.svg}</button>
                    ))}
                  </div>

                  {/* 행간 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>행간</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="1" max="3" step="0.1" value={selectedEl.el.lineHeight || 1.5}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, lineHeight: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, lineHeight: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(selectedEl.el.lineHeight || 1.5).toFixed(1)}</span>
                  </div>

                  {/* 자간 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>자간</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="-2" max="10" step="0.5" value={selectedEl.el.letterSpacing || 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, letterSpacing: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, letterSpacing: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(selectedEl.el.letterSpacing || 0).toFixed(1)}</span>
                  </div>

                  <div style={{ height: 1, background: bdr, margin: "8px 0 14px" }} />

                  {/* 그림자 / 배경박스 토글 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button onClick={() => {
                      const val = selectedEl.el.textShadow ? "" : "0 2px 8px rgba(0,0,0,0.3)";
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textShadow: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textShadow: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${selectedEl.el.textShadow ? "#2196F3" : bdr}`, background: selectedEl.el.textShadow ? "rgba(33,150,243,0.1)" : "transparent", color: selectedEl.el.textShadow ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      그림자
                    </button>
                    <button onClick={() => {
                      const val = !selectedEl.el.bgBox;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBox: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBox: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${selectedEl.el.bgBox ? "#2196F3" : bdr}`, background: selectedEl.el.bgBox ? "rgba(33,150,243,0.1)" : "transparent", color: selectedEl.el.bgBox ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      배경 박스
                    </button>
                  </div>
                  {/* 그림자 세부 조정 */}
                  {selectedEl.el.textShadow && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>그림자 스타일</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                        {[
                          { label: "약하게", val: "0 1px 4px rgba(0,0,0,0.15)" },
                          { label: "보통", val: "0 2px 8px rgba(0,0,0,0.3)" },
                          { label: "강하게", val: "0 4px 16px rgba(0,0,0,0.5)" },
                          { label: "네온", val: `0 0 12px ${acc}, 0 0 24px ${acc}60` },
                          { label: "입체", val: "2px 2px 0 rgba(0,0,0,0.3)" },
                          { label: "글로우", val: "0 0 20px rgba(255,255,255,0.5)" },
                        ].map((sh, si) => (
                          <button key={si} onClick={() => {
                            setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, textShadow: sh.val }) }));
                            setSelectedEl(prev => ({ ...prev, el: { ...prev.el, textShadow: sh.val } }));
                          }} style={{ padding: "6px 4px", borderRadius: 6, border: `1px solid ${selectedEl.el.textShadow === sh.val ? "#2196F3" : bdr}`, background: "transparent", color: text, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            {sh.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 배경박스 세부 조정 */}
                  {selectedEl.el.bgBox && (
                    <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>배경 색상</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                        {[
                          { color: "rgba(0,0,0,0.04)", label: "연한" },
                          { color: "rgba(0,0,0,0.15)", label: "중간" },
                          { color: "rgba(0,0,0,0.4)", label: "진한" },
                          { color: `${acc}15`, label: "포인트 연" },
                          { color: `${acc}30`, label: "포인트" },
                          { color: acc, label: "포인트 진" },
                          { color: "rgba(255,255,255,0.1)", label: "화이트" },
                          { color: "rgba(255,255,255,0.25)", label: "화이트 진" },
                        ].map((bg, bi) => (
                          <button key={bi} onClick={() => {
                            setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBoxColor: bg.color }) }));
                            setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBoxColor: bg.color } }));
                          }} style={{ width: 28, height: 28, borderRadius: 6, background: bg.color, border: `1.5px solid ${selectedEl.el.bgBoxColor === bg.color ? "#2196F3" : bdr}`, cursor: "pointer" }} title={bg.label} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 6 }}>둥글기</div>
                      <input type="range" min="0" max="24" value={selectedEl.el.bgBoxRadius || 8}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setSections(prev => prev.map((s, idx) => idx !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, bgBoxRadius: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, bgBoxRadius: val } }));
                        }}
                        style={{ width: "100%", accentColor: acc }} />
                    </div>
                  )}

                  {/* 위치 미세 조정 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>위치 조정</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 8 }}>
                    <button onClick={() => {
                      const val = (selectedEl.el.offsetY || 0) - 4;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetY: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetY: val } }));
                    }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2L2 7h8z" fill="currentColor"/></svg>
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => {
                        const val = (selectedEl.el.offsetX || 0) - 4;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: val } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l5-4v8z" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => {
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: 0, offsetY: 0 }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: 0, offsetY: 0 } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
                        0,0
                      </button>
                      <button onClick={() => {
                        const val = (selectedEl.el.offsetX || 0) + 4;
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetX: val }) }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetX: val } }));
                      }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 6l-5-4v8z" fill="currentColor"/></svg>
                      </button>
                    </div>
                    <button onClick={() => {
                      const val = (selectedEl.el.offsetY || 0) + 4;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, offsetY: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, offsetY: val } }));
                    }} style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 10l4-5H2z" fill="currentColor"/></svg>
                    </button>
                  </div>
                </>
              ) : selectedEl?.el?._type === "image" ? (
                /* 이미지 속성 패널 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>이미지 편집</div>

                  {/* 배경 색상 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={sections[selectedEl.secIdx]?.bg_color || "#ffffff"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, bg_color: val }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{sections[selectedEl.secIdx]?.bg_color || "#ffffff"}</span>
                  </div>

                  {/* 이미지 미리보기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지</div>
                  <div style={{ width: "100%", height: 140, borderRadius: 12, overflow: "hidden", background: D ? "rgba(255,255,255,0.04)" : "#f5f5f5", marginBottom: 14, position: "relative", cursor: "pointer" }}
                    onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}>
                    {(() => {
                      const secId = sections[selectedEl.secIdx]?.id;
                      const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
                      return imgUrl ? (
                        <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: muted, fontSize: 12 }}>클릭하여 업로드</div>
                      );
                    })()}
                    <input id={`sidebar-img-upload-${selectedEl.secIdx}`} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const secId = sections[selectedEl.secIdx]?.id;
                      const preview = URL.createObjectURL(file);
                      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: preview, error: null } }));
                    }} />
                  </div>

                  {/* 배경 제거 */}
                  <button onClick={async () => {
                    const secId = sections[selectedEl.secIdx]?.id;
                    const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
                    if (!imgUrl) return;
                    setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: true } }));
                    try {
                      const img = new Image(); img.crossOrigin = "anonymous";
                      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgUrl; });
                      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
                      const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
                      const imgData = ctx.getImageData(0, 0, c.width, c.height);
                      const d = imgData.data;
                      const corners = [0, (c.width - 1) * 4, (c.height - 1) * c.width * 4, ((c.height - 1) * c.width + c.width - 1) * 4];
                      let bgR = 0, bgG = 0, bgB = 0;
                      corners.forEach(ci => { bgR += d[ci]; bgG += d[ci+1]; bgB += d[ci+2]; });
                      bgR = Math.round(bgR / 4); bgG = Math.round(bgG / 4); bgB = Math.round(bgB / 4);
                      const threshold = 40;
                      for (let p = 0; p < d.length; p += 4) {
                        if (Math.abs(d[p] - bgR) < threshold && Math.abs(d[p+1] - bgG) < threshold && Math.abs(d[p+2] - bgB) < threshold) {
                          d[p+3] = 0;
                        }
                      }
                      ctx.putImageData(imgData, 0, 0);
                      const result = c.toDataURL("image/png");
                      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: result, error: null } }));
                    } catch (err) {
                      setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: false, error: err.message } }));
                    }
                  }}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {sectionImages[sections[selectedEl.secIdx]?.id]?.loading ? "처리 중..." : "배경 제거"}
                  </button>

                  <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

                  {/* 이미지 변형 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지 변형</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <button onClick={() => {
                      const cur = sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1;
                      const val = cur * -1;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, scaleX: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, scaleX: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sections[selectedEl.secIdx]?.imgProps?.scaleX ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      좌우 뒤집
                    </button>
                    <button onClick={() => {
                      const cur = sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1;
                      const val = cur * -1;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, scaleY: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, scaleY: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sections[selectedEl.secIdx]?.imgProps?.scaleY ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      상하 뒤집
                    </button>
                  </div>

                  {/* 이미지 크기 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>이미지 크기 (%)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="10" max="200" step="5" value={sections[selectedEl.secIdx]?.imgProps?.imgScale ?? 100}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, imgScale: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, imgScale: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.imgScale ?? 100}%</span>
                  </div>

                  {/* 둥근 모서리 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>둥근 모서리</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="0" max="50" step="1" value={sections[selectedEl.secIdx]?.imgProps?.borderRadius ?? 14}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, borderRadius: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, borderRadius: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.borderRadius ?? 14}px</span>
                  </div>

                  {/* 투명도 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>투명도</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="range" min="0" max="100" step="1" value={sections[selectedEl.secIdx]?.imgProps?.opacity ?? 100}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, opacity: val } }));
                        setSelectedEl(prev => ({ ...prev, el: { ...prev.el, opacity: val } }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sections[selectedEl.secIdx]?.imgProps?.opacity ?? 100}%</span>
                  </div>

                  {/* 흑백 효과 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    <button onClick={() => {
                      const val = !sections[selectedEl.secIdx]?.imgProps?.grayscale;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, grayscale: val } }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, grayscale: val } }));
                    }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${sections[selectedEl.secIdx]?.imgProps?.grayscale ? "#2196F3" : bdr}`, background: sections[selectedEl.secIdx]?.imgProps?.grayscale ? "rgba(33,150,243,0.1)" : "transparent", color: sections[selectedEl.secIdx]?.imgProps?.grayscale ? "#2196F3" : text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      흑백 효과
                    </button>
                  </div>

                  <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

                  {/* 기존 이미지로 교체 */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>기존 이미지로 교체</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    <div onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}
                      style={{ height: 60, borderRadius: 8, border: `1.5px dashed ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: muted }}>
                      +
                    </div>
                    {images.map((img, idx) => (
                      <div key={idx} onClick={() => {
                        const secId = sections[selectedEl.secIdx]?.id;
                        setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: img.preview, error: null } }));
                      }}
                        style={{ height: 60, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${bdr}` }}>
                        <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>

                  {/* 위치 리셋 */}
                  {(sections[selectedEl.secIdx]?.imgProps?.offsetX || sections[selectedEl.secIdx]?.imgProps?.offsetY) ? (
                    <button onClick={() => {
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, offsetX: 0, offsetY: 0 } }));
                    }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                      위치 초기화
                    </button>
                  ) : null}

                  {/* AI 이미지 생성 */}
                  {sections[selectedEl.secIdx]?.image_prompt && (
                    <button onClick={() => generateSectionImage(sections[selectedEl.secIdx].id, sections[selectedEl.secIdx].image_prompt)}
                      style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2196F3, #7c6aff)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      AI 이미지 생성
                    </button>
                  )}
                </>
              ) : selectedEl?.el?._type === "shape" ? (
                /* 도형 속성 패널 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>도형 편집</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>채우기 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={(selectedEl.el.fill || "#7c6aff").replace(/[0-9a-f]{2}$/i, "")} onChange={e => {
                      const val = e.target.value + "33";
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fill: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fill: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                    <button onClick={() => {
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, fill: "transparent" }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, fill: "transparent" } }));
                    }} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>투명</button>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>테두리 색상</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <input type="color" value={selectedEl.el.stroke || "#7c6aff"} onChange={e => {
                      const val = e.target.value;
                      setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, stroke: val }) }));
                      setSelectedEl(prev => ({ ...prev, el: { ...prev.el, stroke: val } }));
                    }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>크기</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <div>
                      <span style={{ fontSize: 9, color: muted }}>너비</span>
                      <input type="number" value={selectedEl.el.width || 120} min="20" max="800" step="10"
                        onChange={e => {
                          const val = parseInt(e.target.value) || 120;
                          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, width: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, width: val } }));
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 9, color: muted }}>높이</span>
                      <input type="number" value={selectedEl.el.height || 80} min="20" max="800" step="10"
                        onChange={e => {
                          const val = parseInt(e.target.value) || 80;
                          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).map((el, ei) => ei !== selectedEl.elIdx ? el : { ...el, height: val }) }));
                          setSelectedEl(prev => ({ ...prev, el: { ...prev.el, height: val } }));
                        }}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
                    </div>
                  </div>
                  <button onClick={() => {
                    setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).filter((_, ei) => ei !== selectedEl.elIdx) }));
                    setSelectedEl(null);
                  }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    도형 삭제
                  </button>
                </>
              ) : (
                /* 기본: 섹션 텍스트 편집 목록 */
                <>
                  <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 12 }}>
                    페이지 {activeSection + 1} 텍스트
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>캔버스에서 텍스트를 클릭하면 속성이 여기에 표시됩니다</div>
                  {(sections[activeSection]?.elements || []).filter(e => e.type === "text").map((el, ei) => (
                    <div key={ei} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: muted, marginBottom: 3, display: "block", fontWeight: 600 }}>{el.role === "title" ? "제목" : el.role === "subtitle" ? "소제목" : el.role}</label>
                      <textarea value={el.content}
                        onChange={e => {
                          const val = e.target.value;
                          setSections(prev => prev.map((s, si) => si !== activeSection ? s : {
                            ...s, elements: (s.elements || []).map((elem, j) => {
                              if (elem.type !== "text") return elem;
                              let count = 0;
                              for (let k = 0; k < s.elements.length; k++) {
                                if (s.elements[k].type === "text") {
                                  if (count === ei) return k === j ? { ...elem, content: val } : elem;
                                  count++;
                                }
                              }
                              return elem;
                            }),
                          }));
                        }}
                        rows={el.role === "body" ? 3 : 2}
                        style={{ ...inputStyle, fontSize: 12, resize: "vertical" }} />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* 템플릿 탭 */}
          {sidebarTab === "templates" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>섹션 템플릿</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>타입을 선택하고 템플릿을 클릭하면 현재 섹션이 교체됩니다</div>
              {/* 타입 선택 드롭다운 */}
              <select value={templateTypeFilter} onChange={e => setTemplateTypeFilter(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 700, marginBottom: 12, cursor: "pointer" }}>
                {Object.entries(SECTION_TEMPLATES).map(([type, tmpls]) => (
                  <option key={type} value={type}>{SECTION_TYPE_LABELS?.[type] || type} ({tmpls.length}종)</option>
                ))}
              </select>
              {/* 선택된 타입의 템플릿 목록 — 2열 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(SECTION_TEMPLATES[templateTypeFilter] || []).map((tmpl, ti) => {
                  const titleEl = tmpl.elements?.find(e => e.role === "title");
                  const subtitleEl = tmpl.elements?.find(e => e.role === "subtitle");
                  const bodyEl = tmpl.elements?.find(e => e.role === "body");
                  const bgDark = tmpl.bg_color && (() => { const h = (tmpl.bg_color||"#fff").replace("#",""); return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000<128; })();
                  return (
                    <button key={ti}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          const oldSec = sections[activeSection];
                          const oldEls = oldSec.elements || [];
                          const mergedElements = (tmpl.elements || []).map(newEl => {
                            if (newEl.type !== "text") return { ...newEl };
                            const matchByRole = oldEls.find(o => o.type === "text" && o.role === newEl.role && o.content);
                            if (matchByRole) return { ...newEl, content: matchByRole.content };
                            return { ...newEl };
                          });
                          const usedRoles = new Set(mergedElements.filter(e => e.type === "text" && oldEls.find(o => o.role === e.role)).map(e => e.role));
                          const leftoverOld = oldEls.filter(o => o.type === "text" && o.content && !usedRoles.has(o.role));
                          let leftoverIdx = 0;
                          const finalElements = mergedElements.map(el => {
                            if (el.type !== "text") return el;
                            const hasOldContent = oldEls.find(o => o.type === "text" && o.role === el.role && o.content);
                            if (hasOldContent) return el;
                            if (leftoverIdx < leftoverOld.length) {
                              const old = leftoverOld[leftoverIdx++];
                              return { ...el, content: old.content };
                            }
                            return el;
                          });
                          const newSec = { ...tmpl, id: oldSec.id, image_prompt: tmpl.image_prompt || oldSec.image_prompt, elements: finalElements };
                          setSections(prev => prev.map((s, si) => si === activeSection ? newSec : s));
                        } else {
                          setSections(prev => [...prev, { ...tmpl, id: `sec_tmpl_${Date.now()}` }]);
                          setActiveSection(sections.length);
                        }
                      }}
                      style={{ width: "100%", borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = acc}
                      onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
                      <div style={{ width: "100%", position: "relative", background: tmpl.bg_color || "#fff", minHeight: 60, maxHeight: 100, overflow: "hidden" }}>
                        {(() => {
                          const imgMap = {
                            hero: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
                            pain_points: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=200&fit=crop",
                            features: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
                            point: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=200&fit=crop",
                            stats_highlight: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
                            review: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=200&fit=crop",
                            comparison: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=200&fit=crop",
                            guarantee: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
                            cert: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop",
                            cta: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=200&fit=crop",
                            howto: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop",
                            before_after: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=200&fit=crop",
                            event: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop",
                            faq: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop",
                          };
                          const imgUrl = imgMap[tmpl.type];
                          if (!imgUrl) return null;
                          return (
                            <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                              <img src={imgUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: bgDark ? 0.4 : 0.2 }} />
                            </div>
                          );
                        })()}
                        <div style={{ position: "relative", zIndex: 1, padding: "10px 10px" }}>
                          {subtitleEl && <div style={{ fontSize: 7, fontWeight: 700, color: subtitleEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#999"), letterSpacing: 1, textTransform: "uppercase", marginBottom: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{subtitleEl.content?.slice(0,15)}</div>}
                          {titleEl && <div style={{ fontSize: 11, fontWeight: 900, color: titleEl.color || (bgDark ? "#fff" : "#1a1a2e"), lineHeight: 1.2, marginBottom: 3, textShadow: bgDark ? "0 1px 4px rgba(0,0,0,0.3)" : "none", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{titleEl.content?.slice(0,20)}</div>}
                          {bodyEl && <div style={{ fontSize: 8, color: bodyEl.color || (bgDark ? "rgba(255,255,255,0.7)" : "#888"), lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{bodyEl.content?.slice(0,30)}</div>}
                          {!titleEl && !bodyEl && <div style={{ fontSize: 9, color: bgDark ? "rgba(255,255,255,0.3)" : "#ccc" }}>{tmpl.label}</div>}
                        </div>
                      </div>
                      <div style={{ padding: "5px 8px", borderTop: `1px solid ${bdr}`, background: D ? "rgba(0,0,0,0.2)" : "#fafafa" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tmpl.label}</div>
                        <div style={{ fontSize: 7, color: muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{tmpl.layout}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: bdr, margin: "12px 0" }} />
              <button onClick={() => {
                const tmpl = (SECTION_TEMPLATES[templateTypeFilter] || [])[0];
                if (tmpl) {
                  setSections(prev => [...prev, { ...tmpl, id: `sec_new_${Date.now()}` }]);
                  setActiveSection(sections.length);
                }
              }}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px dashed ${bdr}`, background: "transparent", color: acc, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + 새 섹션 추가
              </button>
            </div>
          )}

          {/* 도형 탭 */}
          {sidebarTab === "shapes" && activeSection < sections.length && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12 }}>도형 삽입</div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>선택한 섹션에 도형을 추가합니다</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { shape: "rect", label: "사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="2" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "rect_round", label: "둥근 사각형", svg: `<rect x="4" y="8" width="32" height="24" rx="8" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "circle", label: "원형", svg: `<circle cx="20" cy="20" r="14" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "ellipse", label: "타원", svg: `<ellipse cx="20" cy="20" rx="16" ry="10" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "triangle", label: "삼각형", svg: `<polygon points="20,4 36,36 4,36" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "diamond", label: "마름모", svg: `<polygon points="20,4 36,20 20,36 4,20" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "star", label: "별", svg: `<polygon points="20,2 24,14 37,14 27,22 31,35 20,27 9,35 13,22 3,14 16,14" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "hexagon", label: "육각형", svg: `<polygon points="20,2 35,10 35,26 20,34 5,26 5,10" fill="${acc}20" stroke="${acc}"/>` },
                  { shape: "line_h", label: "가로선", svg: `<line x1="4" y1="20" x2="36" y2="20" stroke="${acc}" stroke-width="3"/>` },
                  { shape: "line_v", label: "세로선", svg: `<line x1="20" y1="4" x2="20" y2="36" stroke="${acc}" stroke-width="3"/>` },
                  { shape: "arrow_r", label: "화살표 →", svg: `<line x1="4" y1="20" x2="32" y2="20" stroke="${acc}" stroke-width="2.5"/><polygon points="28,14 36,20 28,26" fill="${acc}"/>` },
                  { shape: "badge_pill", label: "필", svg: `<rect x="2" y="12" width="36" height="16" rx="8" fill="${acc}" /><text x="20" y="23" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">BADGE</text>` },
                ].map((s, si) => (
                  <button key={si} title={s.label}
                    onClick={() => {
                      const newEl = { type: "shape", shape: s.shape, fill: `${acc}20`, stroke: acc, width: 120, height: 80 };
                      setSections(prev => prev.map((sec, idx) => idx !== activeSection ? sec : {
                        ...sec, elements: [...sec.elements, newEl],
                      }));
                    }}
                    style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: s.svg }} />
                    <span style={{ fontSize: 9, color: muted }}>{s.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: bdr, margin: "16px 0" }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>빠른 삽입</div>
              {[
                { label: "구분선 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "divider", color: acc }] })) },
                { label: "배지 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "badge", content: "NEW", bg: acc, color: "#fff" }] })) },
                { label: "텍스트 추가", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "text", role: "body", content: "새 텍스트를 입력하세요", fontSize: 14, fontWeight: "400", color: "#333" }] })) },
              ].map((item, ii) => (
                <button key={ii} onClick={item.action}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left" }}>
                  + {item.label}
                </button>
              ))}
            </div>
          )}

          {/* 자료 탭 */}
          {sidebarTab === "media" && (
            <div>
              <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}` }}>
                {[{ key: "photo", label: "사진" }, { key: "video", label: "동영상" }].map(tab => (
                  <button key={tab.key} onClick={() => setMediaSubTab(tab.key)}
                    style={{ flex: 1, padding: "8px", border: "none", background: (mediaSubTab || "photo") === tab.key ? acc : "transparent", color: (mediaSubTab || "photo") === tab.key ? "#fff" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {(mediaSubTab || "photo") === "video" && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>무료 영상 검색</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <input placeholder="영상 검색 (예: nature, food)" id="stock-video-search"
                      onKeyDown={e => { if (e.key === "Enter") document.getElementById("stock-video-btn")?.click(); }}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                    <button id="stock-video-btn" onClick={async () => {
                      const q = document.getElementById("stock-video-search")?.value || category || "product";
                      const pixKey = import.meta.env.VITE_PIXABAY_KEY || "";
                      if (!pixKey) return;
                      try {
                        const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pixabay.com/api/videos/?key=${pixKey}&q=${encodeURIComponent(q)}&per_page=8&lang=ko`)}`);
                        const data = await res.json();
                        const videos = (data.hits || []).map(v => ({ id: v.id, thumb: `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`, url: v.videos?.medium?.url || v.videos?.small?.url, tags: v.tags }));
                        setStockImages(videos);
                      } catch {}
                    }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      검색
                    </button>
                  </div>
                  {stockImages.length > 0 && stockImages[0]?.url?.includes("video") && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                      {stockImages.map((v, vi) => (
                        <div key={vi} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", position: "relative" }}
                          onClick={() => {
                            if (activeSection < sections.length && v.url) {
                              setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: v.url }));
                            }
                          }}>
                          {v.thumb && <img src={v.thumb} alt="" style={{ width: "100%", height: 60, objectFit: "cover" }} />}
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: "#fff", fontSize: 10 }}>▶</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ height: 1, background: bdr, margin: "8px 0 12px" }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>직접 추가</div>
                  <button onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file"; input.accept = "video/*";
                    input.onchange = (ev) => {
                      const file = ev.target.files?.[0];
                      if (file && activeSection < sections.length) {
                        const url = URL.createObjectURL(file);
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: url }));
                      }
                    };
                    input.click();
                  }}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginBottom: 10 }}>
                    + 동영상 파일 업로드
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder="유튜브/영상 URL" id="video-url-input"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                    <button onClick={() => {
                      const url = document.getElementById("video-url-input")?.value;
                      if (url && activeSection < sections.length) {
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: url }));
                      }
                    }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      적용
                    </button>
                  </div>
                  {sections[activeSection]?.videoUrl && (
                    <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
                      <div style={{ fontSize: 11, color: text, fontWeight: 600, marginBottom: 4 }}>현재 섹션 동영상</div>
                      <div style={{ fontSize: 10, color: muted, wordBreak: "break-all" }}>{sections[activeSection].videoUrl.slice(0, 60)}...</div>
                      <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: null }))}
                        style={{ marginTop: 6, padding: "4px 10px", borderRadius: 6, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
                        제거
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(mediaSubTab || "photo") === "photo" && (
                <>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>업로드 이미지</div>
              {images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
                  {images.map((img, ii) => (
                    <div key={ii} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", aspectRatio: "1" }}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          setSectionImages(prev => ({ ...prev, [sections[activeSection].id]: { loading: false, url: img.preview, error: null } }));
                        }
                      }}>
                      <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "16px", borderRadius: 10, border: `1px dashed ${bdr}`, textAlign: "center", color: muted, fontSize: 11, marginBottom: 16 }}>
                  업로드된 이미지 없음
                </div>
              )}

              <button onClick={() => {
                const input = document.createElement("input");
                input.type = "file"; input.accept = "image/*"; input.multiple = true;
                input.onchange = (ev) => {
                  const files = Array.from(ev.target.files || []);
                  files.forEach(async (file) => {
                    const preview = URL.createObjectURL(file);
                    const raw = await fileToBase64(file);
                    const base64 = await resizeImage(raw, 800);
                    setImages(prev => [...prev, { file, preview, base64 }]);
                  });
                };
                input.click();
              }}
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: acc, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
                + 이미지 추가 업로드
              </button>

              <div style={{ height: 1, background: bdr, margin: "0 0 16px" }} />

              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>무료 스톡 이미지</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input placeholder="키워드 검색..." id="stock-search-input"
                  onKeyDown={e => { if (e.key === "Enter") { const q = e.target.value; if (q) fetchStockImages(q); } }}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
                <button onClick={() => { const q = document.getElementById("stock-search-input")?.value; if (q) fetchStockImages(q); }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  검색
                </button>
              </div>
              {stockImages.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {stockImages.slice(0, 12).map((img, ii) => (
                    <div key={ii} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}`, cursor: "pointer", aspectRatio: "3/2" }}
                      onClick={() => {
                        if (activeSection < sections.length) {
                          setSectionImages(prev => ({ ...prev, [sections[activeSection].id]: { loading: false, url: img.url, error: null } }));
                        }
                      }}>
                      <img src={img.thumb || img.url} alt={img.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          )}

          {sidebarTab === "color" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 14 }}>
                페이지 {activeSection + 1} 배경
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 색상</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <input type="color" value={sections[activeSection]?.bg_color || "#ffffff"} onChange={e => {
                  const val = e.target.value;
                  setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: val }));
                }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
                <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{sections[activeSection]?.bg_color || "#ffffff"}</span>
              </div>

              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
                {["#ffffff", "#f8f8f8", "#fafafa", "#1a1a2e", "#111111", "#0d1117",
                  colorPalette?.main, colorPalette?.gradient, colorPalette?.light_bg, colorPalette?.dark_bg,
                  "#fff5f5", "#f0fff4", "#eff6ff", "#fef3c7", "#fdf2f8",
                ].filter(Boolean).map((c, ci) => (
                  <div key={ci} onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: c }))}
                    style={{ width: 24, height: 24, borderRadius: 6, background: c, border: `2px solid ${sections[activeSection]?.bg_color === c ? "#2196F3" : bdr}`, cursor: "pointer" }} />
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 이미지</div>
              {sections[activeSection]?.bgImage ? (
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <img src={sections[activeSection].bgImage} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${bdr}` }} />
                  <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImage: null }))}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer" }}>x</button>
                </div>
              ) : (
                <label style={{ display: "block", padding: "14px", borderRadius: 10, border: `1.5px dashed ${bdr}`, textAlign: "center", cursor: "pointer", marginBottom: 14, fontSize: 12, color: muted }}>
                  + 배경 이미지 추가
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImage: url }));
                    }
                  }} />
                </label>
              )}
              {sections[activeSection]?.bgImage && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>배경 투명도</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="range" min="10" max="100" step="5" value={sections[activeSection]?.bgImageOpacity ?? 30}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImageOpacity: val }));
                      }} style={{ flex: 1, accentColor: "#2196F3" }} />
                    <span style={{ fontSize: 11, color: muted, minWidth: 30 }}>{sections[activeSection]?.bgImageOpacity ?? 30}%</span>
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: bdr, margin: "14px 0" }} />

              <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>이런 테마를 추천드립니다</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {[
                  { name: "내추럴 크림", main: "#8B7355", gradient: "#A69279", light: "#f9f6f2", dark: "#2c2c2c", desc: "따뜻한 크림톤" },
                  { name: "모던 다크", main: "#c9a961", gradient: "#b8956a", light: "#f5f5f5", dark: "#1a1a2e", desc: "고급 다크+골드" },
                  { name: "클린 화이트", main: colorPalette?.main || "#7c6aff", gradient: colorPalette?.gradient || "#9b8ec4", light: "#ffffff", dark: "#111111", desc: "깔끔한 모노톤" },
                ].map((theme, ti) => (
                  <button key={ti} onClick={() => {
                    const newPalette = { main: theme.main, gradient: theme.gradient, light_bg: theme.light, dark_bg: theme.dark };
                    setColorPalette(newPalette);
                    setSections(prev => prev.map((s, si) => {
                      if (s.type === "hero" || s.type === "cta") return { ...s, bg_color: theme.dark };
                      if (s.type === "stats_highlight") return { ...s, bg_color: theme.dark };
                      if (s.type === "pain_points") return { ...s, bg_color: theme.dark };
                      if (si % 3 === 0) return { ...s, bg_color: theme.light };
                      if (si % 3 === 1) return { ...s, bg_color: "#fff" };
                      return { ...s, bg_color: theme.light };
                    }));
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      {[theme.main, theme.gradient, theme.light, theme.dark].map((c, ci) => (
                        <div key={ci} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: `1px solid ${bdr}` }} />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text }}>{theme.name}</div>
                      <div style={{ fontSize: 9, color: muted }}>{theme.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ height: 1, background: bdr, margin: "0 0 14px" }} />

              {colorPalette && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>현재 팔레트</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {[
                      { label: "메인", color: colorPalette.main },
                      { label: "서브", color: colorPalette.gradient },
                      { label: "밝은", color: colorPalette.light_bg },
                      { label: "어두운", color: colorPalette.dark_bg },
                    ].map(c => (
                      <div key={c.label} onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: c.color }))}
                        style={{ textAlign: "center", cursor: "pointer", padding: 6, borderRadius: 8, border: `1px solid ${bdr}` }}>
                        <div style={{ width: "100%", height: 28, borderRadius: 6, background: c.color, border: `1px solid ${bdr}` }} />
                        <div style={{ fontSize: 9, color: muted, marginTop: 3 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div style={{ flex: 1, overflowY: "auto", background: D ? "rgba(0,0,0,0.15)" : "#e5e5e5", padding: "20px", position: "relative" }}>
        {sidebarCollapsed && (
          <button onClick={() => setSidebarCollapsed(false)} title="패널 열기"
            style={{ position: "fixed", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 30, width: 32, height: 32, borderRadius: "50%", border: `1px solid ${bdr}`, background: D ? "#1a1a2e" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 14, color: muted }}>
            ☰
          </button>
        )}
        <div style={{ maxWidth: 891, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: isMobile ? 11 : 12, color: muted }}>{sections.length}개 섹션 · {Object.values(sectionImages).filter(v => v?.url).length}개 이미지 생성됨</span>
          <div style={{ display: "flex", gap: isMobile ? 4 : 8 }}>
            <button onClick={generateAllImages}
              style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", border: "none", fontSize: isMobile ? 10 : 11, fontWeight: 700, cursor: "pointer" }}>
              ✦ 전체 AI 이미지 생성
            </button>
            <button onClick={() => setPhase("input")}
              style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: "transparent", color: muted, border: `1px solid ${bdr}`, fontSize: isMobile ? 10 : 11, cursor: "pointer" }}>
              ← 다시 입력
            </button>
          </div>
        </div>
        {/* 텍스트 요소 선택 시 플로팅 편집 툴바 */}
        {selectedEl && selectedEl.el?._type === "text" && (() => {
          const currentSize = selectedEl.el.fontSize || 16;
          const changeFontSize = (delta) => {
            const secIdx = selectedEl.secIdx;
            const elIdx = selectedEl.elIdx;
            setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
              ...s,
              elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : {
                ...el,
                fontSize: (el.fontSize || 16) + delta
              })
            }));
            setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, fontSize: (prev.el.fontSize || 16) + delta } } : prev);
          };
          const deleteSelectedElement = () => {
            setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
              ...s,
              elements: (s.elements || []).filter((_, ei) => ei !== selectedEl.elIdx)
            }));
            setSelectedEl(null);
          };
          const toolBtnStyle = { background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", padding: "4px 10px", borderRadius: 4, transition: "background 0.15s" };
          return (
            <div style={{ maxWidth: 891, margin: "0 auto 8px", display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: D ? "#1a1a2e" : "#2a2a3e", borderRadius: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginRight: 4 }}>텍스트</span>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
              <button onClick={() => changeFontSize(-2)} style={toolBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>A-</button>
              <span style={{ color: "#fff", fontSize: 12, minWidth: 32, textAlign: "center" }}>{currentSize}px</span>
              <button onClick={() => changeFontSize(2)} style={toolBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>A+</button>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
              <button onClick={() => {
                const secIdx = selectedEl.secIdx;
                const elIdx = selectedEl.elIdx;
                setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
                  ...s,
                  elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : {
                    ...el,
                    fontWeight: (el.fontWeight === "700" || el.fontWeight === 700 || el.fontWeight === "900" || el.fontWeight === 900) ? "400" : "700"
                  })
                }));
              }} style={{ ...toolBtnStyle, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>B</button>
              <div style={{ flex: 1 }} />
              <button onClick={deleteSelectedElement} style={{ ...toolBtnStyle, color: "#ff6b6b" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,107,0.15)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>삭제</button>
            </div>
          );
        })()}

        <div onClick={() => setSelectedEl(null)} style={{ maxWidth: 891, margin: "0 auto", transform: `scale(${canvasZoom/100})`, transformOrigin: "top center", transition: "transform 0.2s", position: "relative" }}>
          {snapGuide?.x && <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "#2196F3", zIndex: 100, pointerEvents: "none", opacity: 0.7 }} />}
          {snapGuide?.x && <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 1px)", width: 3, background: "rgba(33,150,243,0.15)", zIndex: 99, pointerEvents: "none" }} />}
          {sections.map((sec, i) => (
            <div key={sec.id}
              onClick={() => setActiveSection(i)}
              style={{
                position: "relative", marginBottom: 0,
                border: activeSection === i ? `2px solid ${acc}` : "2px solid transparent",
                borderRadius: 0, cursor: "pointer",
                overflow: "hidden",
                background: sec.bg_color?.startsWith("linear-gradient") ? sec.bg_color : (sec.bg_color || "#ffffff"),
              }}>
              {sec.bgImage && (
                <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                  <img src={sec.bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: (sec.bgImageOpacity ?? 30) / 100 }} />
                </div>
              )}
              {renderSection({
                i, sec, sections, setSections, selectedEl, setSelectedEl,
                sectionImages, setSectionImages, images, colorPalette,
                acc, D, bdr, muted, text, canvasZoom, activeSection, isMobile,
                dragRef, generateSectionImage, productName, extraInfo,
              })}
              {/* 도형 오버레이 렌더링 */}
              {(() => {
                const els = sec.elements || [];
                const shapeEls = els.filter(e => e.type === "shape");
                if (shapeEls.length === 0) return null;
                const mainColor = colorPalette?.main || acc;
                return shapeEls.map((sh, si) => {
                  const shIdx = els.indexOf(sh);
                  const shSelected = selectedEl?.secIdx === i && selectedEl?.elIdx === shIdx;
                  const w = sh.width || 120, h = sh.height || 80;
                  const svgMap = {
                    rect: `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    rect_round: `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="12" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    circle: `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    ellipse: `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-4}" ry="${h/2-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
                    line_h: `<line x1="4" y1="${h/2}" x2="${w-4}" y2="${h/2}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                    line_v: `<line x1="${w/2}" y1="4" x2="${w/2}" y2="${h-4}" stroke="${sh.stroke||mainColor}" stroke-width="3"/>`,
                    badge_pill: `<rect x="2" y="${h/2-12}" width="${w-4}" height="24" rx="12" fill="${sh.stroke||mainColor}"/>`,
                  };
                  svgMap.triangle = `<polygon points="${w/2},4 ${w-4},${h-4} 4,${h-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.diamond = `<polygon points="${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.star = `<polygon points="${w/2},4 ${w*0.62},${h*0.38} ${w-4},${h*0.38} ${w*0.68},${h*0.58} ${w*0.8},${h-4} ${w/2},${h*0.72} ${w*0.2},${h-4} ${w*0.32},${h*0.58} 4,${h*0.38} ${w*0.38},${h*0.38}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.hexagon = `<polygon points="${w/2},4 ${w-4},${h*0.28} ${w-4},${h*0.72} ${w/2},${h-4} 4,${h*0.72} 4,${h*0.28}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`;
                  svgMap.arrow_r = `<line x1="4" y1="${h/2}" x2="${w-12}" y2="${h/2}" stroke="${sh.stroke||mainColor}" stroke-width="2.5"/><polygon points="${w-16},${h/2-6} ${w-4},${h/2} ${w-16},${h/2+6}" fill="${sh.stroke||mainColor}"/>`;
                  return (
                    <div key={`shape-${si}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: shIdx, el: { ...sh, _type: "shape" } }); }}
                      style={{ position: "absolute", zIndex: 10, left: sh.offsetX || 20, top: sh.offsetY || 20, width: w, height: h, cursor: shSelected ? "move" : "pointer", border: shSelected ? "2px solid #2196F3" : "2px solid transparent", borderRadius: 4 }}>
                      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} dangerouslySetInnerHTML={{ __html: svgMap[sh.shape] || svgMap.rect }} />
                    </div>
                  );
                });
              })()}

              {activeSection === i && (
                <div style={{
                  position: "absolute", top: 8, right: -44, display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {[
                    { icon: "✦", label: "AI로 수정", action: () => {} },
                    { icon: "▲", label: "위로", action: () => { if (i > 0) setSections(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); setActiveSection(i-1); } },
                    { icon: "▼", label: "아래로", action: () => { if (i < sections.length-1) setSections(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); setActiveSection(i+1); } },
                    { icon: "⧉", label: "복제", action: () => { setSections(prev => [...prev.slice(0,i+1), { ...sec, id: `sec_dup_${Date.now()}` }, ...prev.slice(i+1)]); setActiveSection(i+1); } },
                    { icon: "+", label: "추가", action: () => { const n = { id:`sec_add_${Date.now()}`, type:"point", bg_color:"#ffffff", elements:[{type:"text",role:"title",content:"새 섹션",fontSize:36,fontWeight:"900",color:"#1a1a2e"}] }; setSections(prev=>[...prev.slice(0,i+1),n,...prev.slice(i+1)]); setActiveSection(i+1); } },
                    { icon: "×", label: "삭제", action: () => { if (sections.length <= 1) return; setSections(prev => prev.filter((_,j) => j !== i)); setActiveSection(Math.max(0, i-1)); } },
                  ].map((ctrl, ci) => (
                    <button key={ci} onClick={e => { e.stopPropagation(); ctrl.action(); }}
                      title={ctrl.label}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`,
                        background: D ? "rgba(0,0,0,0.6)" : "#fff", color: text,
                        fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }}>
                      {ctrl.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 줌 컨트롤 */}
        <div style={{ position: "sticky", bottom: 12, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 20, background: D ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.95)", border: `1px solid ${bdr}`, boxShadow: "0 2px 12px rgba(0,0,0,0.1)", pointerEvents: "auto" }}>
            <button onClick={() => setCanvasZoom(z => Math.max(30, z - 10))} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ fontSize: 11, fontWeight: 700, color: text, minWidth: 36, textAlign: "center" }}>{canvasZoom}%</span>
            <button onClick={() => setCanvasZoom(z => Math.min(150, z + 10))} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", color: text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            <div style={{ width: 1, height: 16, background: bdr, margin: "0 4px" }} />
            <button onClick={() => setCanvasZoom(100)} style={{ padding: "2px 8px", borderRadius: 6, border: "none", background: canvasZoom === 100 ? `${acc}20` : "transparent", color: canvasZoom === 100 ? acc : muted, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>맞춤</button>
          </div>
        </div>
      </div>

      {/* 오른쪽 AI 패널 */}
      <div style={{ width: isMobile ? 0 : 300, borderLeft: isMobile ? "none" : `1px solid ${bdr}`, display: isMobile ? "none" : "flex", flexDirection: "column", background: D ? "rgba(0,0,0,0.2)" : "#fff", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "16px", borderBottom: `1px solid ${bdr}` }}>
          {PIPELINE_STEPS.map((step, i) => {
            if (i === 0) return (
              <div key={step.id} style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 14, fontSize: 12, color: text, fontWeight: 600, cursor: "pointer" }}>
                입력한 정보
              </div>
            );
            return (
              <div key={step.id}>
                <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                  <div style={{ width: 2, height: 10, background: bdr }} />
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f9fafb", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>&#10003;</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{step.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, padding: "1px 8px", borderRadius: 6, background: "rgba(34,197,94,0.1)" }}>완료됨</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            ✦ 수정도우미
          </div>

          {agentMessages.length === 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>빠른 명령 (클릭하면 실행)</div>
              {[
                { label: "선택한 텍스트를 더 설득력 있게", prompt: "선택한 텍스트를 더 짧고 설득력 있게 다듬어줘" },
                { label: "카피라이팅 개선", prompt: "이 섹션의 카피라이팅을 더 신뢰도 있게 수정해줘" },
                { label: "톤앤매너 변경", prompt: "이 섹션의 톤앤매너를 더 따뜻하고 친근하게 바꿔줘" },
                { label: "전체 텍스트 축약", prompt: "이 섹션의 모든 텍스트를 30% 더 짧게 줄여줘" },
              ].map((item, qi) => (
                <button key={qi} onClick={() => { setAgentInput(item.prompt); handleAgentSend(item.prompt); }}
                  style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.04)" : "#fff", marginBottom: 4, fontSize: 11, color: text, cursor: "pointer", textAlign: "left" }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
            {agentMessages.map((msg, mi) => (
              <div key={mi} style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: msg.role === "user" ? `${acc}15` : (D ? "rgba(255,255,255,0.04)" : "#f8f8f8"), border: `1px solid ${msg.role === "user" ? acc + "30" : bdr}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: msg.role === "user" ? acc : muted, marginBottom: 4 }}>{msg.role === "user" ? "나" : "수정도우미"}</div>
                <div style={{ fontSize: 12, color: text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
              </div>
            ))}
            {agentLoading && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
                <div style={{ fontSize: 11, color: acc, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${acc}`, borderColor: `${acc} transparent transparent transparent`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  AI가 수정하고 있어요...
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <input value={agentInput} onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && agentInput.trim()) handleAgentSend(agentInput); }}
              placeholder="AI에게 요청하세요..."
              disabled={agentLoading}
              style={{ ...inputStyle, paddingRight: 40, fontSize: 12 }} />
            <button onClick={() => { if (agentInput.trim()) handleAgentSend(agentInput); }}
              disabled={agentLoading || !agentInput.trim()}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: agentInput.trim() ? acc : muted, fontSize: 16, cursor: agentInput.trim() ? "pointer" : "default" }}>
              ➤
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            수동 저장
          </button>
          <button style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: acc, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
