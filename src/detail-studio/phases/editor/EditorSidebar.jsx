import React from "react";
import { SECTION_TYPES } from "../../constants.js";
import { SECTION_TEMPLATES, SECTION_TYPE_LABELS } from "../../../detailTemplates.js";
import { fileToBase64, resizeImage } from "../../utils.jsx";
import {
  updateEl, updateElMulti, updateImgProp, updateSection,
  SIDEBAR_TABS, FONT_LIST, SHADOW_PRESETS, BG_BOX_COLORS,
  getShapeDefs, getThemePresets,
} from "./editorHelpers.js";

export default function EditorSidebar({
  D, text, muted, cardBg, bdr, inputBg, acc, isMobile,
  sections, setSections, activeSection, setActiveSection,
  selectedEl, setSelectedEl, sidebarTab, setSidebarTab,
  sectionImages, setSectionImages, images, setImages,
  colorPalette, setColorPalette,
  templateTypeFilter, setTemplateTypeFilter,
  mediaSubTab, setMediaSubTab,
  stockImages, setStockImages,
  generateSectionImage, fetchStockImages,
  inputStyle,
}) {
  const ctx = { setSections, selectedEl, setSelectedEl, activeSection };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
      {/* ── 페이지 탭 ── */}
      {sidebarTab === "pages" && (
        <PagesPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, setActiveSection, selectedEl, setSelectedEl, sectionImages, colorPalette }} />
      )}

      {/* ── 텍스트 탭 ── */}
      {sidebarTab === "text" && (
        <TextPanel {...{ D, text, muted, bdr, inputBg, acc, sections, setSections, activeSection, selectedEl, setSelectedEl, sectionImages, setSectionImages, images, setImages, generateSectionImage, inputStyle, ctx }} />
      )}

      {/* ── 템플릿 탭 ── */}
      {sidebarTab === "templates" && (
        <TemplatesPanel {...{ D, text, muted, bdr, inputBg, acc, sections, setSections, activeSection, setActiveSection, templateTypeFilter, setTemplateTypeFilter }} />
      )}

      {/* ── 도형 탭 ── */}
      {sidebarTab === "shapes" && activeSection < sections.length && (
        <ShapesPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection }} />
      )}

      {/* ── 자료 탭 ── */}
      {sidebarTab === "media" && (
        <MediaPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, sectionImages, setSectionImages, images, setImages, mediaSubTab, setMediaSubTab, stockImages, setStockImages, fetchStockImages }} />
      )}

      {/* ── 색상 탭 ── */}
      {sidebarTab === "color" && (
        <ColorPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, colorPalette, setColorPalette }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   페이지 패널
   ═══════════════════════════════════════════════════════════════ */
function PagesPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, setActiveSection, selectedEl, setSelectedEl, sectionImages, colorPalette }) {
  return (
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
            <span style={{ fontSize: 10, color: muted, cursor: "grab" }}>{"\u2807"}</span>
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
        const newSec = { id: `sec_new_${Date.now()}`, type: "point", label: "\uc0c8 \uc139\uc158", bg_color: colorPalette?.light_bg || "#ffffff", elements: [
          { type: "text", role: "title", content: "\uc0c8 \uc139\uc158 \uc81c\ubaa9", x: 50, y: 200, w: 760, fontSize: 36, fontWeight: "900", color: colorPalette?.main || "#1a1a2e" },
          { type: "text", role: "body", content: "\ub0b4\uc6a9\uc744 \uc785\ub825\ud558\uc138\uc694", x: 50, y: 300, w: 760, fontSize: 16, fontWeight: "400", color: "#666", lineHeight: 1.8 },
        ] };
        setSections(prev => [...prev, newSec]);
        setActiveSection(sections.length);
      }}
        style={{
          width: "100%", padding: "10px", borderRadius: 10, border: `1.5px dashed ${bdr}`,
          background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginTop: 4,
        }}>
        + \uc139\uc158 \ucd94\uac00
      </button>

      {/* 레이어 패널 */}
      {activeSection < sections.length && (
        <LayerPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, selectedEl, setSelectedEl, sectionImages }} />
      )}
    </>
  );
}

function LayerPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, selectedEl, setSelectedEl, sectionImages }) {
  const sec = sections[activeSection];
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>
        \ud398\uc774\uc9c0 {activeSection + 1} \ub808\uc774\uc5b4
      </div>
      {/* 배경 이미지 레이어 */}
      {sec?.bgImage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, background: D ? "rgba(255,255,255,0.03)" : "#f9f9f9", border: `1px solid ${bdr}` }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
            <img src={sec.bgImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontSize: 10, color: muted, flex: 1 }}>\ubc30\uacbd \uc774\ubbf8\uc9c0</span>
        </div>
      )}
      {/* 이미지 레이어 */}
      {sectionImages[sec?.id]?.url && (
        <div onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: -1, el: { type: "image", _type: "image", role: "section_image" } })}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, marginBottom: 4, cursor: "pointer", background: selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? `${acc}15` : (D ? "rgba(255,255,255,0.03)" : "#f9f9f9"), border: `1px solid ${selectedEl?.el?._type === "image" && selectedEl?.secIdx === activeSection ? acc : bdr}` }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
            <img src={sectionImages[sec.id].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontSize: 10, color: text, flex: 1 }}>\uc139\uc158 \uc774\ubbf8\uc9c0</span>
        </div>
      )}
      {/* 텍스트/배지/도형 요소 레이어 */}
      {(sec?.elements || []).map((el, ei) => {
        const isActive = selectedEl?.secIdx === activeSection && selectedEl?.elIdx === ei;
        const elCount = sec?.elements?.length || 0;
        return (
          <div key={ei} onClick={() => setSelectedEl({ secIdx: activeSection, elIdx: ei, el: { ...el, _type: el.type === "shape" ? "shape" : "text" } })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer", background: isActive ? `${acc}15` : "transparent", border: `1px solid ${isActive ? acc : "transparent"}` }}>
            <span style={{ fontSize: 9, color: acc, fontWeight: 700, width: 16, flexShrink: 0 }}>
              {el.type === "badge" ? "B" : el.type === "divider" ? "\u2014" : el.type === "shape" ? "S" : "T"}
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
                }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="\uc704\ub85c">
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 2L2 6h6z" fill="currentColor"/></svg>
                </button>
              )}
              {ei < elCount - 1 && (
                <button onClick={() => {
                  setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: (s.elements || []).map((e, idx) => idx === ei ? s.elements[ei + 1] : idx === ei + 1 ? s.elements[ei] : e) }));
                  if (isActive) setSelectedEl(prev => ({ ...prev, elIdx: ei + 1 }));
                }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: muted, fontSize: 10, cursor: "pointer", padding: 0 }} title="\uc544\ub798\ub85c">
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 8L2 4h6z" fill="currentColor"/></svg>
                </button>
              )}
              <button onClick={() => {
                setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, elements: (s.elements || []).filter((_, idx) => idx !== ei) }));
                if (isActive) setSelectedEl(null);
              }} style={{ width: 18, height: 18, border: "none", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer", padding: 0 }} title="\uc0ad\uc81c">
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   텍스트 속성 패널
   ═══════════════════════════════════════════════════════════════ */
function TextPanel({ D, text, muted, bdr, inputBg, acc, sections, setSections, activeSection, selectedEl, setSelectedEl, sectionImages, setSectionImages, images, setImages, generateSectionImage, inputStyle, ctx }) {
  if (selectedEl?.el?._type === "text") {
    return <TextPropsEditor {...{ D, text, muted, bdr, inputBg, acc, sections, setSections, selectedEl, setSelectedEl, ctx }} />;
  }
  if (selectedEl?.el?._type === "image") {
    return <ImagePropsEditor {...{ D, text, muted, bdr, acc, sections, setSections, selectedEl, setSelectedEl, sectionImages, setSectionImages, images, generateSectionImage }} />;
  }
  if (selectedEl?.el?._type === "shape") {
    return <ShapePropsEditor {...{ D, text, muted, bdr, acc, sections, setSections, selectedEl, setSelectedEl }} />;
  }
  // 기본: 섹션 텍스트 편집 목록
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 12 }}>
        \ud398\uc774\uc9c0 {activeSection + 1} \ud14d\uc2a4\ud2b8
      </div>
      <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>\uce94\ubc84\uc2a4\uc5d0\uc11c \ud14d\uc2a4\ud2b8\ub97c \ud074\ub9ad\ud558\uba74 \uc18d\uc131\uc774 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4</div>
      {(sections[activeSection]?.elements || []).filter(e => e.type === "text").map((el, ei) => (
        <div key={ei} style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: muted, marginBottom: 3, display: "block", fontWeight: 600 }}>{el.role === "title" ? "\uc81c\ubaa9" : el.role === "subtitle" ? "\uc18c\uc81c\ubaa9" : el.role}</label>
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
  );
}

function TextPropsEditor({ D, text, muted, bdr, inputBg, acc, sections, setSections, selectedEl, setSelectedEl, ctx }) {
  const el = selectedEl.el;
  const upd = (key, val) => updateEl(key, val, ctx);

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>\ud14d\uc2a4\ud2b8 \ud3b8\uc9d1</div>

      {/* 폰트 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud3f0\ud2b8</div>
      <select value={el.fontFamily || "Pretendard"} onChange={e => upd("fontFamily", e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 600, marginBottom: 14, cursor: "pointer" }}>
        {FONT_LIST.map(f => <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>{f.label}</option>)}
      </select>

      {/* 크기 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud06c\uae30</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="number" value={el.fontSize || 14} min={8} max={120}
          onChange={e => upd("fontSize", parseInt(e.target.value) || 14)}
          style={{ width: 70, padding: "8px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, fontWeight: 700, textAlign: "center" }} />
        <span style={{ fontSize: 11, color: muted }}>px</span>
      </div>

      {/* 스타일 B/I/U/S */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc2a4\ud0c0\uc77c</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[
          { key: "fontWeight", label: "B", values: ["900", "400"], style: { fontWeight: 900 } },
          { key: "fontStyle", label: "I", values: ["italic", "normal"], style: { fontStyle: "italic" } },
          { key: "textDecoration", label: "U", values: ["underline", "none"], style: { textDecoration: "underline" } },
          { key: "textDecoration", label: "S", values: ["line-through", "none"], style: { textDecoration: "line-through" } },
        ].map((s, si) => {
          const isActive = el[s.key] === s.values[0];
          return (
            <button key={si} onClick={() => upd(s.key, isActive ? s.values[1] : s.values[0])}
              style={{
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
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc0c9\uc0c1</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="color" value={el.color || "#000000"} onChange={e => upd("color", e.target.value)}
          style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
        <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{el.color || "#000000"}</span>
      </div>

      {/* 정렬 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc815\ub82c</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[
          { align: "left", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6h8M2 9h12M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
          { align: "center", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 6h8M2 9h12M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
          { align: "right", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M6 6h8M2 9h12M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
        ].map(a => (
          <button key={a.align} onClick={() => upd("textAlign", a.align)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1.5px solid ${el.textAlign === a.align ? "#2196F3" : bdr}`,
              background: el.textAlign === a.align ? "rgba(33,150,243,0.1)" : "transparent",
              color: el.textAlign === a.align ? "#2196F3" : muted,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>{a.svg}</button>
        ))}
      </div>

      {/* 행간 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud589\uac04</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="range" min="1" max="3" step="0.1" value={el.lineHeight || 1.5}
          onChange={e => upd("lineHeight", parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: "#2196F3" }} />
        <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(el.lineHeight || 1.5).toFixed(1)}</span>
      </div>

      {/* 자간 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc790\uac04</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="range" min="-2" max="10" step="0.5" value={el.letterSpacing || 0}
          onChange={e => upd("letterSpacing", parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: "#2196F3" }} />
        <span style={{ fontSize: 11, color: muted, minWidth: 28, textAlign: "right" }}>{(el.letterSpacing || 0).toFixed(1)}</span>
      </div>

      <div style={{ height: 1, background: bdr, margin: "8px 0 14px" }} />

      {/* 그림자 / 배경박스 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button onClick={() => upd("textShadow", el.textShadow ? "" : "0 2px 8px rgba(0,0,0,0.3)")}
          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${el.textShadow ? "#2196F3" : bdr}`, background: el.textShadow ? "rgba(33,150,243,0.1)" : "transparent", color: el.textShadow ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          \uadf8\ub9bc\uc790
        </button>
        <button onClick={() => upd("bgBox", !el.bgBox)}
          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${el.bgBox ? "#2196F3" : bdr}`, background: el.bgBox ? "rgba(33,150,243,0.1)" : "transparent", color: el.bgBox ? "#2196F3" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          \ubc30\uacbd \ubc15\uc2a4
        </button>
      </div>

      {/* 그림자 세부 조정 */}
      {el.textShadow && (
        <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>\uadf8\ub9bc\uc790 \uc2a4\ud0c0\uc77c</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {SHADOW_PRESETS.map((sh, si) => {
              const val = sh.val || `0 0 12px ${acc}, 0 0 24px ${acc}60`;
              return (
                <button key={si} onClick={() => upd("textShadow", val)}
                  style={{ padding: "6px 4px", borderRadius: 6, border: `1px solid ${el.textShadow === val ? "#2196F3" : bdr}`, background: "transparent", color: text, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                  {sh.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 배경박스 세부 조정 */}
      {el.bgBox && (
        <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 8 }}>\ubc30\uacbd \uc0c9\uc0c1</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {BG_BOX_COLORS.map((bg, bi) => {
              const c = bg.color || (bi === 3 ? `${acc}15` : bi === 4 ? `${acc}30` : acc);
              return (
                <button key={bi} onClick={() => upd("bgBoxColor", c)}
                  style={{ width: 28, height: 28, borderRadius: 6, background: c, border: `1.5px solid ${el.bgBoxColor === c ? "#2196F3" : bdr}`, cursor: "pointer" }} title={bg.label} />
              );
            })}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, marginBottom: 6 }}>\ub465\uae00\uae30</div>
          <input type="range" min="0" max="24" value={el.bgBoxRadius || 8}
            onChange={e => upd("bgBoxRadius", parseInt(e.target.value))}
            style={{ width: "100%", accentColor: acc }} />
        </div>
      )}

      {/* 위치 미세 조정 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc704\uce58 \uc870\uc815</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 8 }}>
        <button onClick={() => upd("offsetY", (el.offsetY || 0) - 4)}
          style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2L2 7h8z" fill="currentColor"/></svg>
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => upd("offsetX", (el.offsetX || 0) - 4)}
            style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l5-4v8z" fill="currentColor"/></svg>
          </button>
          <button onClick={() => updateElMulti({ offsetX: 0, offsetY: 0 }, ctx)}
            style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 9, cursor: "pointer", fontWeight: 700 }}>
            0,0
          </button>
          <button onClick={() => upd("offsetX", (el.offsetX || 0) + 4)}
            style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 6l-5-4v8z" fill="currentColor"/></svg>
          </button>
        </div>
        <button onClick={() => upd("offsetY", (el.offsetY || 0) + 4)}
          style={{ width: 32, height: 24, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, cursor: "pointer" }}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 10l4-5H2z" fill="currentColor"/></svg>
        </button>
      </div>
    </>
  );
}

function ImagePropsEditor({ D, text, muted, bdr, acc, sections, setSections, selectedEl, setSelectedEl, sectionImages, setSectionImages, images, generateSectionImage }) {
  const sec = sections[selectedEl.secIdx];
  const ctx = { setSections, selectedEl, setSelectedEl };
  const imgUpd = (key, val) => updateImgProp(key, val, ctx);

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>\uc774\ubbf8\uc9c0 \ud3b8\uc9d1</div>

      {/* 배경 색상 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ubc30\uacbd \uc0c9\uc0c1</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="color" value={sec?.bg_color || "#ffffff"} onChange={e => {
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, bg_color: e.target.value }));
        }} style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
        <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>{sec?.bg_color || "#ffffff"}</span>
      </div>

      {/* 이미지 미리보기 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc774\ubbf8\uc9c0</div>
      <div style={{ width: "100%", height: 140, borderRadius: 12, overflow: "hidden", background: D ? "rgba(255,255,255,0.04)" : "#f5f5f5", marginBottom: 14, position: "relative", cursor: "pointer" }}
        onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}>
        {(() => {
          const secId = sec?.id;
          const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
          return imgUrl ? (
            <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: muted, fontSize: 12 }}>\ud074\ub9ad\ud558\uc5ec \uc5c5\ub85c\ub4dc</div>
          );
        })()}
        <input id={`sidebar-img-upload-${selectedEl.secIdx}`} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const secId = sec?.id;
          const preview = URL.createObjectURL(file);
          setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: preview, error: null } }));
        }} />
      </div>

      {/* 배경 제거 */}
      <button onClick={async () => {
        const secId = sec?.id;
        const imgUrl = sectionImages[secId]?.url || (images.length > 0 ? images[selectedEl.secIdx % images.length]?.preview : null);
        if (!imgUrl) return;
        setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: true } }));
        try {
          const img = new Image(); img.crossOrigin = "anonymous";
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imgUrl; });
          const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx2 = c.getContext("2d"); ctx2.drawImage(img, 0, 0);
          const imgData = ctx2.getImageData(0, 0, c.width, c.height);
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
          ctx2.putImageData(imgData, 0, 0);
          const result = c.toDataURL("image/png");
          setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: result, error: null } }));
        } catch (err) {
          setSectionImages(prev => ({ ...prev, [secId]: { ...prev[secId], loading: false, error: err.message } }));
        }
      }}
        style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        {sectionImages[sec?.id]?.loading ? "\ucc98\ub9ac \uc911..." : "\ubc30\uacbd \uc81c\uac70"}
      </button>

      <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

      {/* 이미지 변형 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc774\ubbf8\uc9c0 \ubcc0\ud615</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => imgUpd("scaleX", (sec?.imgProps?.scaleX ?? 1) * -1)}
          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sec?.imgProps?.scaleX ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sec?.imgProps?.scaleX ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          \uc88c\uc6b0 \ub4a4\uc9d1
        </button>
        <button onClick={() => imgUpd("scaleY", (sec?.imgProps?.scaleY ?? 1) * -1)}
          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: (sec?.imgProps?.scaleY ?? 1) < 0 ? "rgba(33,150,243,0.1)" : "transparent", color: (sec?.imgProps?.scaleY ?? 1) < 0 ? "#2196F3" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          \uc0c1\ud558 \ub4a4\uc9d1
        </button>
      </div>

      {/* 이미지 크기 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uc774\ubbf8\uc9c0 \ud06c\uae30 (%)</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="range" min="10" max="200" step="5" value={sec?.imgProps?.imgScale ?? 100}
          onChange={e => imgUpd("imgScale", parseInt(e.target.value))} style={{ flex: 1, accentColor: "#2196F3" }} />
        <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sec?.imgProps?.imgScale ?? 100}%</span>
      </div>

      {/* 둥근 모서리 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ub465\uadfc \ubaa8\uc11c\ub9ac</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="range" min="0" max="50" step="1" value={sec?.imgProps?.borderRadius ?? 14}
          onChange={e => imgUpd("borderRadius", parseInt(e.target.value))} style={{ flex: 1, accentColor: "#2196F3" }} />
        <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sec?.imgProps?.borderRadius ?? 14}px</span>
      </div>

      {/* 투명도 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud22c\uba85\ub3c4</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="range" min="0" max="100" step="1" value={sec?.imgProps?.opacity ?? 100}
          onChange={e => imgUpd("opacity", parseInt(e.target.value))} style={{ flex: 1, accentColor: "#2196F3" }} />
        <span style={{ fontSize: 11, color: muted, minWidth: 32, textAlign: "right" }}>{sec?.imgProps?.opacity ?? 100}%</span>
      </div>

      {/* 흑백 효과 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => imgUpd("grayscale", !sec?.imgProps?.grayscale)}
          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${sec?.imgProps?.grayscale ? "#2196F3" : bdr}`, background: sec?.imgProps?.grayscale ? "rgba(33,150,243,0.1)" : "transparent", color: sec?.imgProps?.grayscale ? "#2196F3" : text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          \ud751\ubc31 \ud6a8\uacfc
        </button>
      </div>

      <div style={{ height: 1, background: bdr, margin: "4px 0 14px" }} />

      {/* 기존 이미지로 교체 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\uae30\uc874 \uc774\ubbf8\uc9c0\ub85c \uad50\uccb4</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        <div onClick={() => document.getElementById(`sidebar-img-upload-${selectedEl.secIdx}`)?.click()}
          style={{ height: 60, borderRadius: 8, border: `1.5px dashed ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: muted }}>
          +
        </div>
        {images.map((img, idx) => (
          <div key={idx} onClick={() => {
            const secId = sec?.id;
            setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: img.preview, error: null } }));
          }}
            style={{ height: 60, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${bdr}` }}>
            <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* 위치 리셋 */}
      {(sec?.imgProps?.offsetX || sec?.imgProps?.offsetY) ? (
        <button onClick={() => {
          setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, imgProps: { ...s.imgProps, offsetX: 0, offsetY: 0 } }));
        }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
          \uc704\uce58 \ucd08\uae30\ud654
        </button>
      ) : null}

      {/* AI 이미지 생성 */}
      {sec?.image_prompt && (
        <button onClick={() => generateSectionImage(sec.id, sec.image_prompt)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2196F3, #7c6aff)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          AI \uc774\ubbf8\uc9c0 \uc0dd\uc131
        </button>
      )}
    </>
  );
}

function ShapePropsEditor({ D, text, muted, bdr, acc, sections, setSections, selectedEl, setSelectedEl }) {
  const el = selectedEl.el;
  const ctx = { setSections, selectedEl, setSelectedEl };
  const upd = (key, val) => updateEl(key, val, ctx);

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 16 }}>\ub3c4\ud615 \ud3b8\uc9d1</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ucc44\uc6b0\uae30 \uc0c9\uc0c1</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="color" value={(el.fill || "#7c6aff").replace(/[0-9a-f]{2}$/i, "")} onChange={e => upd("fill", e.target.value + "33")}
          style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
        <button onClick={() => upd("fill", "transparent")}
          style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>\ud22c\uba85</button>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud14c\ub450\ub9ac \uc0c9\uc0c1</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="color" value={el.stroke || "#7c6aff"} onChange={e => upd("stroke", e.target.value)}
          style={{ width: 36, height: 36, border: `2px solid ${bdr}`, borderRadius: 8, cursor: "pointer", padding: 0 }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ud06c\uae30</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 9, color: muted }}>\ub108\ube44</span>
          <input type="number" value={el.width || 120} min="20" max="800" step="10"
            onChange={e => upd("width", parseInt(e.target.value) || 120)}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
        </div>
        <div>
          <span style={{ fontSize: 9, color: muted }}>\ub192\uc774</span>
          <input type="number" value={el.height || 80} min="20" max="800" step="10"
            onChange={e => upd("height", parseInt(e.target.value) || 80)}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 12 }} />
        </div>
      </div>
      <button onClick={() => {
        setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : { ...s, elements: (s.elements || []).filter((_, ei) => ei !== selectedEl.elIdx) }));
        setSelectedEl(null);
      }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        \ub3c4\ud615 \uc0ad\uc81c
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   템플릿 패널
   ═══════════════════════════════════════════════════════════════ */
function TemplatesPanel({ D, text, muted, bdr, inputBg, acc, sections, setSections, activeSection, setActiveSection, templateTypeFilter, setTemplateTypeFilter }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>\uc139\uc158 \ud15c\ud50c\ub9bf</div>
      <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>\ud0c0\uc785\uc744 \uc120\ud0dd\ud558\uace0 \ud15c\ud50c\ub9bf\uc744 \ud074\ub9ad\ud558\uba74 \ud604\uc7ac \uc139\uc158\uc774 \uad50\uccb4\ub429\ub2c8\ub2e4</div>
      <select value={templateTypeFilter} onChange={e => setTemplateTypeFilter(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, fontWeight: 700, marginBottom: 12, cursor: "pointer" }}>
        {Object.entries(SECTION_TEMPLATES).map(([type, tmpls]) => (
          <option key={type} value={type}>{SECTION_TYPE_LABELS?.[type] || type} ({tmpls.length}\uc885)</option>
        ))}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(SECTION_TEMPLATES[templateTypeFilter] || []).map((tmpl, ti) => (
          <TemplateThumbnail key={ti} tmpl={tmpl} {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, setActiveSection }} />
        ))}
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
        + \uc0c8 \uc139\uc158 \ucd94\uac00
      </button>
    </div>
  );
}

function TemplateThumbnail({ tmpl, D, text, muted, bdr, acc, sections, setSections, activeSection, setActiveSection }) {
  const titleEl = tmpl.elements?.find(e => e.role === "title");
  const subtitleEl = tmpl.elements?.find(e => e.role === "subtitle");
  const bodyEl = tmpl.elements?.find(e => e.role === "body");
  const bgDark = tmpl.bg_color && (() => { const h = (tmpl.bg_color||"#fff").replace("#",""); return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000<128; })();

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

  const handleClick = () => {
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
  };

  return (
    <button onClick={handleClick}
      style={{ width: "100%", borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.03)" : "#fafafa", cursor: "pointer", textAlign: "left", overflow: "hidden", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = acc}
      onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
      <div style={{ width: "100%", position: "relative", background: tmpl.bg_color || "#fff", minHeight: 60, maxHeight: 100, overflow: "hidden" }}>
        {imgMap[tmpl.type] && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img src={imgMap[tmpl.type]} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: bgDark ? 0.4 : 0.2 }} />
          </div>
        )}
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
}

/* ═══════════════════════════════════════════════════════════════
   도형 패널
   ═══════════════════════════════════════════════════════════════ */
function ShapesPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection }) {
  const shapeDefs = getShapeDefs(acc);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 12 }}>\ub3c4\ud615 \uc0bd\uc785</div>
      <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>\uc120\ud0dd\ud55c \uc139\uc158\uc5d0 \ub3c4\ud615\uc744 \ucd94\uac00\ud569\ub2c8\ub2e4</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {shapeDefs.map((s, si) => (
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
      <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>\ube60\ub978 \uc0bd\uc785</div>
      {[
        { label: "\uad6c\ubd84\uc120 \ucd94\uac00", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "divider", color: acc }] })) },
        { label: "\ubc30\uc9c0 \ucd94\uac00", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "badge", content: "NEW", bg: acc, color: "#fff" }] })) },
        { label: "\ud14d\uc2a4\ud2b8 \ucd94\uac00", action: () => setSections(prev => prev.map((s, idx) => idx !== activeSection ? s : { ...s, elements: [...s.elements, { type: "text", role: "body", content: "\uc0c8 \ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud558\uc138\uc694", fontSize: 14, fontWeight: "400", color: "#333" }] })) },
      ].map((item, ii) => (
        <button key={ii} onClick={item.action}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 6, textAlign: "left" }}>
          + {item.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   자료 패널
   ═══════════════════════════════════════════════════════════════ */
function MediaPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, sectionImages, setSectionImages, images, setImages, mediaSubTab, setMediaSubTab, stockImages, setStockImages, fetchStockImages }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${bdr}` }}>
        {[{ key: "photo", label: "\uc0ac\uc9c4" }, { key: "video", label: "\ub3d9\uc601\uc0c1" }].map(tab => (
          <button key={tab.key} onClick={() => setMediaSubTab(tab.key)}
            style={{ flex: 1, padding: "8px", border: "none", background: (mediaSubTab || "photo") === tab.key ? acc : "transparent", color: (mediaSubTab || "photo") === tab.key ? "#fff" : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {(mediaSubTab || "photo") === "video" && (
        <VideoSubPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, stockImages, setStockImages }} />
      )}

      {(mediaSubTab || "photo") === "photo" && (
        <PhotoSubPanel {...{ D, text, muted, bdr, acc, sections, setSections, activeSection, sectionImages, setSectionImages, images, setImages, stockImages, fetchStockImages }} />
      )}
    </div>
  );
}

function VideoSubPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, stockImages, setStockImages }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>\ubb34\ub8cc \uc601\uc0c1 \uac80\uc0c9</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="\uc601\uc0c1 \uac80\uc0c9 (\uc608: nature, food)" id="stock-video-search"
          onKeyDown={e => { if (e.key === "Enter") document.getElementById("stock-video-btn")?.click(); }}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
        <button id="stock-video-btn" onClick={async () => {
          const q = document.getElementById("stock-video-search")?.value || "product";
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
          \uac80\uc0c9
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
                  <span style={{ color: "#fff", fontSize: 10 }}>{"\u25b6"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 1, background: bdr, margin: "8px 0 12px" }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>\uc9c1\uc811 \ucd94\uac00</div>
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
        + \ub3d9\uc601\uc0c1 \ud30c\uc77c \uc5c5\ub85c\ub4dc
      </button>
      <div style={{ display: "flex", gap: 6 }}>
        <input placeholder="\uc720\ud29c\ube0c/\uc601\uc0c1 URL" id="video-url-input"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
        <button onClick={() => {
          const url = document.getElementById("video-url-input")?.value;
          if (url && activeSection < sections.length) {
            setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: url }));
          }
        }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          \uc801\uc6a9
        </button>
      </div>
      {sections[activeSection]?.videoUrl && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: D ? "rgba(255,255,255,0.04)" : "#f8f8f8", border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 11, color: text, fontWeight: 600, marginBottom: 4 }}>\ud604\uc7ac \uc139\uc158 \ub3d9\uc601\uc0c1</div>
          <div style={{ fontSize: 10, color: muted, wordBreak: "break-all" }}>{sections[activeSection].videoUrl.slice(0, 60)}...</div>
          <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, videoUrl: null }))}
            style={{ marginTop: 6, padding: "4px 10px", borderRadius: 6, border: `1px solid #ef4444`, background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
            \uc81c\uac70
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoSubPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, sectionImages, setSectionImages, images, setImages, stockImages, fetchStockImages }) {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>\uc5c5\ub85c\ub4dc \uc774\ubbf8\uc9c0</div>
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
          \uc5c5\ub85c\ub4dc\ub41c \uc774\ubbf8\uc9c0 \uc5c6\uc74c
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
        + \uc774\ubbf8\uc9c0 \ucd94\uac00 \uc5c5\ub85c\ub4dc
      </button>

      <div style={{ height: 1, background: bdr, margin: "0 0 16px" }} />

      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>\ubb34\ub8cc \uc2a4\ud1a1 \uc774\ubbf8\uc9c0</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="\ud0a4\uc6cc\ub4dc \uac80\uc0c9..." id="stock-search-input"
          onKeyDown={e => { if (e.key === "Enter") { const q = e.target.value; if (q) fetchStockImages(q); } }}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 11, outline: "none" }} />
        <button onClick={() => { const q = document.getElementById("stock-search-input")?.value; if (q) fetchStockImages(q); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: acc, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          \uac80\uc0c9
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
  );
}

/* ═══════════════════════════════════════════════════════════════
   색상 패널
   ═══════════════════════════════════════════════════════════════ */
function ColorPanel({ D, text, muted, bdr, acc, sections, setSections, activeSection, colorPalette, setColorPalette }) {
  const themes = getThemePresets(colorPalette);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 14 }}>
        \ud398\uc774\uc9c0 {activeSection + 1} \ubc30\uacbd
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ubc30\uacbd \uc0c9\uc0c1</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input type="color" value={sections[activeSection]?.bg_color || "#ffffff"} onChange={e => {
          setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bg_color: e.target.value }));
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

      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ubc30\uacbd \uc774\ubbf8\uc9c0</div>
      {sections[activeSection]?.bgImage ? (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <img src={sections[activeSection].bgImage} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${bdr}` }} />
          <button onClick={() => setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImage: null }))}
            style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 10, cursor: "pointer" }}>x</button>
        </div>
      ) : (
        <label style={{ display: "block", padding: "14px", borderRadius: 10, border: `1.5px dashed ${bdr}`, textAlign: "center", cursor: "pointer", marginBottom: 14, fontSize: 12, color: muted }}>
          + \ubc30\uacbd \uc774\ubbf8\uc9c0 \ucd94\uac00
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
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6 }}>\ubc30\uacbd \ud22c\uba85\ub3c4</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="range" min="10" max="100" step="5" value={sections[activeSection]?.bgImageOpacity ?? 30}
              onChange={e => {
                setSections(prev => prev.map((s, si) => si !== activeSection ? s : { ...s, bgImageOpacity: parseInt(e.target.value) }));
              }} style={{ flex: 1, accentColor: "#2196F3" }} />
            <span style={{ fontSize: 11, color: muted, minWidth: 30 }}>{sections[activeSection]?.bgImageOpacity ?? 30}%</span>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: bdr, margin: "14px 0" }} />

      <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>\uc774\ub7f0 \ud14c\ub9c8\ub97c \ucd94\ucc9c\ub4dc\ub9bd\ub2c8\ub2e4</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {themes.map((theme, ti) => (
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
          <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 10 }}>\ud604\uc7ac \ud314\ub808\ud2b8</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            {[
              { label: "\uba54\uc778", color: colorPalette.main },
              { label: "\uc11c\ube0c", color: colorPalette.gradient },
              { label: "\ubc1d\uc740", color: colorPalette.light_bg },
              { label: "\uc5b4\ub450\uc6b4", color: colorPalette.dark_bg },
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
  );
}

/** 사이드바 탭 아이콘 바 (EditorPhase에서 사용) */
export function SidebarTabBar({ sidebarTab, setSidebarTab, D, bdr, acc, muted }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", borderBottom: `1px solid ${bdr}` }}>
      {SIDEBAR_TABS.map(tab => (
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
  );
}
