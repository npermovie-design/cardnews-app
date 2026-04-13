import React from "react";
import { renderSection } from "../../renderers/SectionDispatcher.jsx";

export default function EditorCanvas({
  D, text, muted, bdr, acc, isMobile,
  sections, setSections, activeSection, setActiveSection,
  selectedEl, setSelectedEl,
  sectionImages, setSectionImages, images, colorPalette,
  canvasZoom, setCanvasZoom,
  sidebarCollapsed, setSidebarCollapsed,
  dragRef, snapGuide,
  setPhase, productName, extraInfo,
  generateSectionImage, generateAllImages,
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "rgba(0,0,0,0.15)" : "#e5e5e5", padding: "20px", position: "relative" }}>
      {/* 사이드바 토글 */}
      {sidebarCollapsed && (
        <button onClick={() => setSidebarCollapsed(false)} title="패널 열기"
          style={{ position: "fixed", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 30, width: 44, height: 44, borderRadius: "50%", border: `1px solid ${bdr}`, background: D ? "#1a1a2e" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontSize: 14, color: muted }}>
          {"☰"}
        </button>
      )}

      {/* 상단 정보 바 */}
      <div style={{ maxWidth: 891, margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: isMobile ? 11 : 12, color: muted }}>{sections.length}개 섹션 \xb7 {Object.values(sectionImages).filter(v => v?.url).length}개 이미지 생성됨</span>
        <div style={{ display: "flex", gap: isMobile ? 4 : 8 }}>
          <button onClick={generateAllImages}
            style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${acc}, #9b6dff)`, color: "#fff", border: "none", fontSize: isMobile ? 10 : 11, fontWeight: 700, cursor: "pointer" }}>
            {"✦"} 전체 AI 이미지 생성
          </button>
          <button onClick={() => setPhase("input")}
            style={{ padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: 8, background: "transparent", color: muted, border: `1px solid ${bdr}`, fontSize: isMobile ? 10 : 11, cursor: "pointer" }}>
            {"←"} 다시 입력
          </button>
        </div>
      </div>

      {/* 플로팅 텍스트 편집 툴바 */}
      {selectedEl && selectedEl.el?._type === "text" && (
        <FloatingTextToolbar {...{ D, text, acc, selectedEl, setSections, setSelectedEl }} />
      )}

      {/* 캔버스 */}
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

            {/* 도형 오버레이 */}
            <ShapeOverlays {...{ sec, i, selectedEl, setSelectedEl, colorPalette, acc }} />

            {/* 사이드 액션 버튼 */}
            {activeSection === i && (
              <SectionActions {...{ i, sec, sections, setSections, setActiveSection, D, text, bdr }} />
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
  );
}

/* ── 플로팅 텍스트 툴바 ── */
function FloatingTextToolbar({ D, text, acc, selectedEl, setSections, setSelectedEl }) {
  const currentSize = selectedEl.el.fontSize || 16;
  const changeFontSize = (delta) => {
    const { secIdx, elIdx } = selectedEl;
    setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
      ...s, elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : { ...el, fontSize: (el.fontSize || 16) + delta }),
    }));
    setSelectedEl(prev => prev ? { ...prev, el: { ...prev.el, fontSize: (prev.el.fontSize || 16) + delta } } : prev);
  };
  const deleteSelectedElement = () => {
    setSections(prev => prev.map((s, si) => si !== selectedEl.secIdx ? s : {
      ...s, elements: (s.elements || []).filter((_, ei) => ei !== selectedEl.elIdx),
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
        const { secIdx, elIdx } = selectedEl;
        setSections(prev => prev.map((s, si) => si !== secIdx ? s : {
          ...s, elements: (s.elements || []).map((el, ei) => ei !== elIdx ? el : {
            ...el, fontWeight: (el.fontWeight === "700" || el.fontWeight === 700 || el.fontWeight === "900" || el.fontWeight === 900) ? "400" : "700",
          }),
        }));
      }} style={{ ...toolBtnStyle, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>B</button>
      <div style={{ flex: 1 }} />
      <button onClick={deleteSelectedElement} style={{ ...toolBtnStyle, color: "#ff6b6b" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,107,0.15)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>삭제</button>
    </div>
  );
}

/* ── 도형 오버레이 ── */
function ShapeOverlays({ sec, i, selectedEl, setSelectedEl, colorPalette, acc }) {
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
      triangle: `<polygon points="${w/2},4 ${w-4},${h-4} 4,${h-4}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
      diamond: `<polygon points="${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
      star: `<polygon points="${w/2},4 ${w*0.62},${h*0.38} ${w-4},${h*0.38} ${w*0.68},${h*0.58} ${w*0.8},${h-4} ${w/2},${h*0.72} ${w*0.2},${h-4} ${w*0.32},${h*0.58} 4,${h*0.38} ${w*0.38},${h*0.38}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
      hexagon: `<polygon points="${w/2},4 ${w-4},${h*0.28} ${w-4},${h*0.72} ${w/2},${h-4} 4,${h*0.72} 4,${h*0.28}" fill="${sh.fill||'transparent'}" stroke="${sh.stroke||mainColor}" stroke-width="2"/>`,
      arrow_r: `<line x1="4" y1="${h/2}" x2="${w-12}" y2="${h/2}" stroke="${sh.stroke||mainColor}" stroke-width="2.5"/><polygon points="${w-16},${h/2-6} ${w-4},${h/2} ${w-16},${h/2+6}" fill="${sh.stroke||mainColor}"/>`,
    };
    return (
      <div key={`shape-${si}`}
        onClick={(e) => { e.stopPropagation(); setSelectedEl({ secIdx: i, elIdx: shIdx, el: { ...sh, _type: "shape" } }); }}
        style={{ position: "absolute", zIndex: 10, left: sh.offsetX || 20, top: sh.offsetY || 20, width: w, height: h, cursor: shSelected ? "move" : "pointer", border: shSelected ? "2px solid #2196F3" : "2px solid transparent", borderRadius: 4 }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} dangerouslySetInnerHTML={{ __html: svgMap[sh.shape] || svgMap.rect }} />
      </div>
    );
  });
}

/* ── 섹션 사이드 액션 버튼 — overflow 대응: 안쪽 배치 ── */
function SectionActions({ i, sec, sections, setSections, setActiveSection, D, text, bdr }) {
  return (
    <div style={{
      position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 20,
    }}>
      {[
        { icon: "▲", label: "위로", action: () => { if (i > 0) setSections(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); setActiveSection(i-1); } },
        { icon: "▼", label: "아래로", action: () => { if (i < sections.length-1) setSections(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); setActiveSection(i+1); } },
        { icon: "⧉", label: "복제", action: () => { setSections(prev => [...prev.slice(0,i+1), { ...sec, id: `sec_dup_${Date.now()}` }, ...prev.slice(i+1)]); setActiveSection(i+1); } },
        { icon: "+", label: "추가", action: () => { const n = { id:`sec_add_${Date.now()}`, type:"point", bg_color:"#ffffff", elements:[{type:"text",role:"title",content:"새 섹션",fontSize:36,fontWeight:"900",color:"#1a1a2e"}] }; setSections(prev=>[...prev.slice(0,i+1),n,...prev.slice(i+1)]); setActiveSection(i+1); } },
        { icon: "×", label: "삭제", action: () => { if (sections.length <= 1) return; setSections(prev => prev.filter((_,j) => j !== i)); setActiveSection(Math.max(0, i-1)); } },
      ].map((ctrl, ci) => (
        <button key={ci} onClick={e => { e.stopPropagation(); ctrl.action(); }}
          title={ctrl.label}
          style={{
            width: 28, height: 28, borderRadius: 6, border: `1px solid ${bdr}`,
            background: D ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)", color: text,
            fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)",
          }}>
          {ctrl.icon}
        </button>
      ))}
    </div>
  );
}
