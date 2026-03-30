import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage } from "fabric";
import { supabase } from "./storage";
import { useI18n } from "./i18n.jsx";
import { FONTS, loadGFont, TEMPLATES, LAYOUT_OPTIONS } from "./CardNewsEditorUtils.jsx";

/* ══════════════════════════════════════════════════════════════════════
   UnifiedCanvasEditor — 통합 캔버스 에디터
   카드뉴스 / 상세페이지 / 썸네일 / PPT 공통
   모든 스타일 인라인 — 외부 스타일 객체 없음
   ══════════════════════════════════════════════════════════════════════ */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export default function UnifiedCanvasEditor({
  slides: initialSlides = [],
  width = 1080,
  height = 1080,
  mode = "cardnews", // "cardnews" | "detailpage" | "thumbnail" | "ppt"
  C: themeIn,
  onSave,
  onClose,
  onShareTemplate,
  inline = false,
}) {
  /* ── 테마 ── */
  const C = { purple: "#7c6aff", purpleL: "#6357e0", pink: "#ec4899", text: "#1a1730", muted: "rgba(26,23,48,0.5)", border: "rgba(0,0,0,0.08)", bg: "#ffffff", bg2: "#f5f4ff", ...(themeIn || {}) };
  const { lang } = useI18n();
  const ko = lang === "ko";

  /* ── refs ── */
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const slidesDataRef = useRef([]);
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);

  /* ── state ── */
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalSlides, setTotalSlides] = useState(initialSlides.length || 1);
  const [selObj, setSelObj] = useState(null);
  const [selProps, setSelProps] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showImageLib, setShowImageLib] = useState(false);
  const [scale, setScale] = useState(1);

  /* ── 반응형 ── */
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ── 캔버스 초기화 ── */
  useEffect(() => {
    if (!canvasElRef.current) return;
    const fc = new Canvas(canvasElRef.current, {
      width, height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true,
    });
    canvasRef.current = fc;

    // 선택 이벤트
    fc.on("selection:created", (e) => syncSelection(e.selected?.[0]));
    fc.on("selection:updated", (e) => syncSelection(e.selected?.[0]));
    fc.on("selection:cleared", () => { setSelObj(null); setSelProps({}); });
    fc.on("object:modified", () => pushHistory());

    // 초기 슬라이드 로드
    if (initialSlides.length > 0) {
      buildSlideOnCanvas(fc, initialSlides[0]);
      // 모든 슬라이드 데이터 저장
      slidesDataRef.current = initialSlides.map(() => null);
    }
    pushHistory();
    fitCanvas();

    return () => { fc.dispose(); canvasRef.current = null; };
  }, []);

  /* ── 캔버스를 컨테이너에 맞추기 ── */
  const fitCanvas = useCallback(() => {
    const cont = containerRef.current;
    const fc = canvasRef.current;
    if (!cont || !fc) return;
    const cw = cont.clientWidth - 16;
    const ch = cont.clientHeight - 16;
    const s = Math.min(cw / width, ch / height, 1);
    setScale(s);
    const el = fc.getElement()?.parentNode;
    if (el) {
      el.style.transform = `scale(${s})`;
      el.style.transformOrigin = "center center";
    }
  }, [width, height]);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  /* ── 슬라이드를 캔버스에 빌드 ── */
  const buildSlideOnCanvas = (fc, slide) => {
    fc.clear();
    fc.backgroundColor = slide.bgColor || "#ffffff";

    // 배경 이미지
    if (slide.image) {
      FabricImage.fromURL(slide.image, { crossOrigin: "anonymous" }).then(img => {
        if (!img) return;
        const s = Math.max(width / img.width, height / img.height);
        img.set({ scaleX: s, scaleY: s, left: width / 2, top: height / 2, originX: "center", originY: "center", selectable: false, evented: false, name: "bgImage" });
        fc.insertAt(0, img);
        fc.renderAll();
      }).catch(() => {});
    }

    // 제목
    if (slide.title) {
      const tb = new Textbox(slide.title, {
        left: width * 0.08, top: height * 0.15, width: width * 0.84,
        fontSize: slide.fontSize || 42, fontWeight: "bold",
        fill: slide.textColor || "#ffffff",
        fontFamily: slide.fontFamily || "'Pretendard', sans-serif",
        name: "title",
      });
      fc.add(tb);
    }

    // 본문
    if (slide.body) {
      const tb = new Textbox(slide.body, {
        left: width * 0.08, top: height * 0.45, width: width * 0.84,
        fontSize: Math.round((slide.fontSize || 42) * 0.4),
        fill: slide.textColor || "#ffffff",
        fontFamily: slide.fontFamily || "'Pretendard', sans-serif",
        name: "body", opacity: 0.85,
      });
      fc.add(tb);
    }

    fc.renderAll();
  };

  /* ── 슬라이드 전환 ── */
  const saveCurrentSlide = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    slidesDataRef.current[currentIdx] = fc.toJSON();
  };

  const goToSlide = (idx) => {
    if (idx < 0 || idx >= totalSlides) return;
    saveCurrentSlide();
    setCurrentIdx(idx);
    const fc = canvasRef.current;
    if (!fc) return;
    const saved = slidesDataRef.current[idx];
    if (saved) {
      fc.loadFromJSON(saved).then(() => fc.renderAll());
    } else if (initialSlides[idx]) {
      buildSlideOnCanvas(fc, initialSlides[idx]);
    }
  };

  /* ── 선택 객체 속성 동기화 ── */
  const syncSelection = (obj) => {
    if (!obj) return;
    setSelObj(obj);
    setSelProps({
      fontFamily: obj.fontFamily || "Pretendard",
      fontSize: obj.fontSize || 24,
      fill: obj.fill || "#000000",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      textAlign: obj.textAlign || "left",
      opacity: obj.opacity ?? 1,
    });
  };

  const setProp = (key, val) => {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    obj.set(key, val);
    fc.renderAll();
    syncSelection(obj);
    pushHistory();
  };

  /* ── Undo/Redo ── */
  const pushHistory = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    const json = JSON.stringify(fc.toJSON());
    const h = historyRef.current;
    const i = historyIdxRef.current;
    h.splice(i + 1);
    h.push(json);
    if (h.length > 30) h.shift();
    historyIdxRef.current = h.length - 1;
  };

  const undo = () => {
    const h = historyRef.current;
    const i = historyIdxRef.current;
    if (i <= 0) return;
    historyIdxRef.current = i - 1;
    canvasRef.current?.loadFromJSON(JSON.parse(h[i - 1])).then(() => canvasRef.current?.renderAll());
  };

  const redo = () => {
    const h = historyRef.current;
    const i = historyIdxRef.current;
    if (i >= h.length - 1) return;
    historyIdxRef.current = i + 1;
    canvasRef.current?.loadFromJSON(JSON.parse(h[i + 1])).then(() => canvasRef.current?.renderAll());
  };

  /* ── 키보드 단축키 ── */
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const fc = canvasRef.current;
        const obj = fc?.getActiveObject();
        if (obj && obj.name !== "bgImage") { fc.remove(obj); fc.renderAll(); pushHistory(); }
      }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  /* ── 오브젝트 추가 ── */
  const addText = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    const tb = new Textbox(ko ? "텍스트를 입력하세요" : "Enter text", {
      left: width * 0.1, top: height * 0.4, width: width * 0.8,
      fontSize: 32, fill: "#333333", fontFamily: "'Pretendard', sans-serif",
    });
    fc.add(tb);
    fc.setActiveObject(tb);
    fc.renderAll();
    pushHistory();
  };

  const addShape = (type) => {
    const fc = canvasRef.current;
    if (!fc) return;
    const obj = type === "circle"
      ? new Circle({ radius: 60, fill: C.purple + "33", left: width / 2 - 60, top: height / 2 - 60 })
      : new Rect({ width: 150, height: 100, fill: C.purple + "33", left: width / 2 - 75, top: height / 2 - 50, rx: 8, ry: 8 });
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.renderAll();
    pushHistory();
  };

  const addImageFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        FabricImage.fromURL(ev.target.result).then(img => {
          if (!img) return;
          const fc = canvasRef.current;
          const maxW = width * 0.6;
          const s = maxW / img.width;
          img.set({ scaleX: s, scaleY: s, left: width * 0.2, top: height * 0.2 });
          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();
          pushHistory();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const setBgColor = (color) => {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.backgroundColor = color;
    fc.renderAll();
    pushHistory();
  };

  /* ── 내보내기 ── */
  const exportPng = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `slide_${currentIdx + 1}.png`;
    a.click();
  };

  const exportAll = async () => {
    saveCurrentSlide();
    const fc = canvasRef.current;
    if (!fc) return;
    if (!window.JSZip) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const zip = new window.JSZip();
    for (let i = 0; i < totalSlides; i++) {
      const saved = slidesDataRef.current[i];
      if (saved) {
        await fc.loadFromJSON(saved);
        fc.renderAll();
      } else if (initialSlides[i]) {
        buildSlideOnCanvas(fc, initialSlides[i]);
      }
      const b64 = fc.toDataURL({ format: "png" }).split(",")[1];
      zip.file(`slide_${String(i + 1).padStart(2, "0")}.png`, b64, { base64: true });
    }
    // 현재 슬라이드 복원
    const curSaved = slidesDataRef.current[currentIdx];
    if (curSaved) await fc.loadFromJSON(curSaved);
    fc.renderAll();

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slides.zip";
    a.click();
  };

  /* ── 패널 너비 ── */
  const canvasAreaW = isMobile ? "100%" : "calc(100% - 280px)";
  const panelW = 280;

  /* ── 래퍼 스타일 (인라인) ── */
  const wrapperStyle = inline
    ? { width: "100%", flex: 1, display: "flex", alignItems: "stretch", justifyContent: "center", padding: 0, overflow: "hidden" }
    : { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 };

  const modalStyle = inline
    ? { width: "100%", height: "100%", display: "flex", overflow: "hidden", background: "#fff" }
    : { width: "100%", maxWidth: 1400, height: "95vh", background: "#fff", borderRadius: 16, display: "flex", overflow: "hidden", boxShadow: "0 8px 60px rgba(0,0,0,0.25)" };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div style={wrapperStyle}>
      <div style={{ ...modalStyle, flexDirection: isMobile ? "column" : "row" }}>

        {/* ── 캔버스 영역 ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#f0f0f5", padding: 0, overflow: "hidden", width: canvasAreaW }}>

          {/* 슬라이드 네비게이션 */}
          {totalSlides > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <button onClick={() => goToSlide(currentIdx - 1)} disabled={currentIdx === 0}
                style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{currentIdx + 1} / {totalSlides}</span>
              <button onClick={() => goToSlide(currentIdx + 1)} disabled={currentIdx >= totalSlides - 1}
                style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {onClose && <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#666" }}>{ko ? "닫기" : "Close"}</button>}
            </div>
          )}

          {/* 캔버스 컨테이너 */}
          <div ref={containerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 8, background: "#e8e8ee" }}>
            <canvas ref={canvasElRef} width={width} height={height} />
          </div>

          {/* 툴바 */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 12px", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            <button onClick={addText} title={ko ? "텍스트 추가" : "Add Text"}
              style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>T</button>
            <button onClick={() => addShape("rect")} title={ko ? "사각형" : "Rectangle"}
              style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </button>
            <button onClick={() => addShape("circle")} title={ko ? "원형" : "Circle"}
              style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
            </button>
            <button onClick={addImageFromFile} title={ko ? "이미지 추가" : "Add Image"}
              style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)", margin: "0 2px" }} />
            <button onClick={undo} title="Undo" style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button onClick={redo} title="Redo" style={{ background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={exportPng} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                {ko ? "PNG 저장" : "Save PNG"}
              </button>
              {totalSlides > 1 && (
                <button onClick={exportAll} style={{ background: "#333", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  {ko ? "전체 ZIP" : "All ZIP"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 속성 패널 (데스크톱) ── */}
        {!isMobile && (
          <div style={{ display: "flex", flexDirection: "column", background: "#fafafe", borderLeft: "1px solid rgba(0,0,0,0.08)", overflowY: "auto", padding: "0 0 16px", width: panelW }}>
            <div style={{ fontSize: 15, fontWeight: 700, padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "sticky", top: 0, background: "#fafafe", zIndex: 2 }}>
              {ko ? "속성" : "Properties"}
            </div>

            {/* 배경 섹션 */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#333" }}>{ko ? "배경" : "Background"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["#1c1c1e", "#ffffff", "#0f172a", "#fef3c7", "#052e16", "#831843", "#f5ebe0", "#e0f7fa"].map(c => (
                  <button key={c} onClick={() => setBgColor(c)}
                    style={{ width: 28, height: 28, borderRadius: 6, background: c, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer" }} />
                ))}
                <input type="color" onChange={e => setBgColor(e.target.value)}
                  style={{ width: 28, height: 28, padding: 0, border: "2px solid rgba(0,0,0,0.1)", borderRadius: 6, cursor: "pointer", background: "none" }} />
              </div>
            </div>

            {/* 텍스트 속성 (선택된 객체가 있을 때) */}
            {selObj && selObj.type === "textbox" && (
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#333" }}>{ko ? "텍스트" : "Text"}</div>

                {/* 폰트 */}
                <div style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}>{ko ? "폰트" : "Font"}</div>
                <select value={selProps.fontFamily} onChange={e => { loadGFont(e.target.value); setProp("fontFamily", e.target.value); }}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13, background: "#fff", outline: "none", marginBottom: 8 }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {/* 크기 */}
                <div style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}>{ko ? "크기" : "Size"}: {selProps.fontSize}px</div>
                <input type="range" min={10} max={120} value={selProps.fontSize || 24}
                  onChange={e => setProp("fontSize", +e.target.value)}
                  style={{ width: "100%", accentColor: "#7c6aff", marginBottom: 8 }} />

                {/* 색상 */}
                <div style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4 }}>{ko ? "색상" : "Color"}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <input type="color" value={typeof selProps.fill === "string" ? selProps.fill : "#000000"}
                    onChange={e => setProp("fill", e.target.value)}
                    style={{ width: 36, height: 36, padding: 0, border: "2px solid rgba(0,0,0,0.1)", borderRadius: 8, cursor: "pointer", background: "none" }} />
                  {["#ffffff", "#000000", "#333333", "#7c6aff", "#ef4444", "#f59e0b", "#10b981"].map(c => (
                    <button key={c} onClick={() => setProp("fill", c)}
                      style={{ width: 24, height: 24, borderRadius: 4, background: c, border: "1.5px solid rgba(0,0,0,0.15)", cursor: "pointer" }} />
                  ))}
                </div>

                {/* 굵기/기울임/정렬 */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  <button onClick={() => setProp("fontWeight", selProps.fontWeight === "bold" ? "normal" : "bold")}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${selProps.fontWeight === "bold" ? C.purple : "rgba(0,0,0,0.1)"}`, background: selProps.fontWeight === "bold" ? C.purple + "15" : "transparent", cursor: "pointer", fontWeight: 900, fontSize: 13 }}>B</button>
                  <button onClick={() => setProp("fontStyle", selProps.fontStyle === "italic" ? "normal" : "italic")}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${selProps.fontStyle === "italic" ? C.purple : "rgba(0,0,0,0.1)"}`, background: selProps.fontStyle === "italic" ? C.purple + "15" : "transparent", cursor: "pointer", fontStyle: "italic", fontSize: 13 }}>I</button>
                  <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.08)", margin: "0 2px" }} />
                  {["left", "center", "right"].map(a => (
                    <button key={a} onClick={() => setProp("textAlign", a)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: `1.5px solid ${selProps.textAlign === a ? C.purple : "rgba(0,0,0,0.1)"}`, background: selProps.textAlign === a ? C.purple + "15" : "transparent", cursor: "pointer", fontSize: 11 }}>
                      {a === "left" ? "◧" : a === "center" ? "◫" : "◨"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 선택된 객체 삭제 */}
            {selObj && (
              <div style={{ padding: "14px 18px" }}>
                <button onClick={() => { const fc = canvasRef.current; if (fc && selObj) { fc.remove(selObj); fc.renderAll(); setSelObj(null); pushHistory(); } }}
                  style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 10, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {ko ? "선택 삭제" : "Delete Selected"}
                </button>
              </div>
            )}

            {/* 하단 버튼 */}
            <div style={{ marginTop: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {onShareTemplate && (
                <button onClick={() => {
                  saveCurrentSlide();
                  const fc = canvasRef.current;
                  if (!fc) return;
                  const preview = fc.toDataURL({ format: "jpeg", quality: 0.6, multiplier: 0.3 });
                  onShareTemplate({ slidesJson: slidesDataRef.current, preview });
                }}
                  style={{ width: "100%", padding: "12px 0", border: "none", borderRadius: 10, background: "#10b981", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {ko ? "템플릿 공유" : "Share Template"}
                </button>
              )}
              {onSave && (
                <button onClick={() => {
                  saveCurrentSlide();
                  const fc = canvasRef.current;
                  if (!fc) return;
                  const results = [];
                  // 모든 슬라이드 내보내기
                  for (let i = 0; i < totalSlides; i++) {
                    const s = slidesDataRef.current[i];
                    if (s) results.push({ json: s });
                  }
                  onSave(results);
                }}
                  style={{ width: "100%", padding: "12px 0", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {ko ? "저장" : "Save"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
