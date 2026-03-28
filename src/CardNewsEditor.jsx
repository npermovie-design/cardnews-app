import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage } from "fabric";

/* ──────────────────────────────────────────────────────────────────────
   CardNewsEditor  –  Fabric.js v7 기반 카드뉴스 에디터
   ────────────────────────────────────────────────────────────────────── */

const FONTS = [
  { label: "Pretendard", value: "Pretendard" },
  { label: "Noto Sans KR", value: "Noto Sans KR" },
  { label: "나눔고딕", value: "Nanum Gothic" },
  { label: "배민도현체", value: "BMDOHYEON" },
];

const DEFAULT_THEME = {
  purple: "#7c6aff",
  purpleL: "#6357e0",
  pink: "#ec4899",
  text: "#1a1730",
  muted: "rgba(26,23,48,0.5)",
  border: "rgba(0,0,0,0.08)",
  bg: "#ffffff",
  bg2: "#f5f4ff",
};

/* ── helpers ─────────────────────────────────────────────────────────── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lightenColor(hex, amount = 30) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = clamp(((num >> 16) & 0xff) + amount, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((num & 0xff) + amount, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function darkenColor(hex, amount = 30) {
  return lightenColor(hex, -amount);
}

function hexFromAny(color) {
  if (!color) return "#000000";
  if (typeof color === "string" && color.startsWith("#")) return color;
  const d = document.createElement("div");
  d.style.color = color;
  document.body.appendChild(d);
  const computed = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = computed.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map(v => parseInt(v).toString(16).padStart(2, "0")).join("");
}

/* ── icon SVGs (inline) ─────────────────────────────────────────────── */
const Icon = {
  Left: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>,
  Right: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H3"/><path d="M7 6l-4 4 4 4"/></svg>,
  Redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H11a5 5 0 00-5 5v0a5 5 0 005 5h10"/><path d="M17 6l4 4-4 4"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>,
  Bold: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 014 4v0a4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4v0a4 4 0 01-4 4H6z"/></svg>,
  Italic: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  AlignLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>,
  AlignRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

/* ── Btn component ───────────────────────────────────────────────────── */
function Btn({ children, onClick, active, small, accent, disabled, style }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: small ? "6px 10px" : "8px 14px",
    borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
    background: active ? (accent || "#7c6aff") : "#fff",
    color: active ? "#fff" : "#333",
    fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
    ...style,
  };
  return <button style={base} onClick={disabled ? undefined : onClick}>{children}</button>;
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function CardNewsEditor({
  slides: initialSlides = [],
  width = 1080,
  height = 1080,
  C: themeIn,
  onSave,
  onClose,
}) {
  const C = { ...DEFAULT_THEME, ...(themeIn || {}) };

  /* refs */
  const canvasRef = useRef(null);       // fabric Canvas instance
  const canvasElRef = useRef(null);     // <canvas> DOM element
  const containerRef = useRef(null);    // wrapper div for responsive sizing
  const fileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  /* state */
  const [slideDataArr, setSlideDataArr] = useState([]); // Fabric JSON per slide
  const [slideMetaArr, setSlideMetaArr] = useState([]); // original slide props
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedObj, setSelectedObj] = useState(null);
  const [selProps, setSelProps] = useState({});
  const [canvasScale, setCanvasScale] = useState(1);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const totalSlides = initialSlides.length || 1;

  /* ── responsive ────────────────────────────────────────────────────── */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── build initial slide data from props ───────────────────────────── */
  useEffect(() => {
    if (!initialSlides.length) return;
    setSlideMetaArr(initialSlides.map(s => ({ ...s })));
    setSlideDataArr(new Array(initialSlides.length).fill(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── init canvas ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!canvasElRef.current) return;
    const fc = new Canvas(canvasElRef.current, {
      width, height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    canvasRef.current = fc;

    fc.on("selection:created", handleSelection);
    fc.on("selection:updated", handleSelection);
    fc.on("selection:cleared", () => { setSelectedObj(null); setSelProps({}); });
    fc.on("object:modified", handleObjModified);
    fc.on("text:changed", handleObjModified);

    // load first slide
    if (initialSlides.length) {
      loadSlideToCanvas(fc, initialSlides[0], 0);
    }

    fitCanvas();

    return () => {
      fc.dispose();
      canvasRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── fit canvas to container ───────────────────────────────────────── */
  const fitCanvas = useCallback(() => {
    const fc = canvasRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;
    const cw = container.clientWidth - 16;
    const ch = container.clientHeight - 16;
    const scale = Math.min(cw / width, ch / height, 1);
    setCanvasScale(scale);
    const wrapper = fc.wrapperEl || fc.getElement()?.parentNode;
    if (wrapper) {
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = "top left";
    }
  }, [width, height]);

  useEffect(() => {
    window.addEventListener("resize", fitCanvas);
    const t = setTimeout(fitCanvas, 100);
    return () => { window.removeEventListener("resize", fitCanvas); clearTimeout(t); };
  }, [fitCanvas]);

  /* ── selection handler ─────────────────────────────────────────────── */
  function handleSelection(e) {
    const obj = e?.selected?.[0];
    if (!obj) return;
    setSelectedObj(obj);
    updateSelProps(obj);
  }

  function updateSelProps(obj) {
    if (!obj) { setSelProps({}); return; }
    const p = {
      type: obj.type,
      fontSize: obj.fontSize || 24,
      fontFamily: obj.fontFamily || "Pretendard",
      fill: obj.fill || "#000000",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      textAlign: obj.textAlign || "left",
      opacity: obj.opacity ?? 1,
      text: obj.text || "",
    };
    setSelProps(p);
  }

  function handleObjModified() {
    const fc = canvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
    pushHistory();
  }

  /* ── history (undo/redo) ───────────────────────────────────────────── */
  function pushHistory() {
    const fc = canvasRef.current;
    if (!fc) return;
    const json = fc.toJSON();
    setHistory(prev => {
      const next = prev.slice(0, historyIdx + 1);
      next.push(json);
      if (next.length > 30) next.shift();
      setHistoryIdx(next.length - 1);
      return next;
    });
  }

  function undo() {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    const fc = canvasRef.current;
    if (!fc) return;
    fc.loadFromJSON(history[newIdx]).then(() => fc.renderAll());
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const fc = canvasRef.current;
    if (!fc) return;
    fc.loadFromJSON(history[newIdx]).then(() => fc.renderAll());
  }

  /* ── load slide onto canvas ────────────────────────────────────────── */
  async function loadSlideToCanvas(fc, slide, idx) {
    // If we already have serialized JSON for this slide, use it
    if (slideDataArr[idx]) {
      await fc.loadFromJSON(slideDataArr[idx]);
      fc.renderAll();
      pushHistory();
      return;
    }

    // Otherwise, build from slide props
    fc.clear();
    fc.backgroundColor = slide.bgColor || "#ffffff";

    // background image
    if (slide.image) {
      try {
        const img = await FabricImage.fromURL(slide.image, { crossOrigin: "anonymous" });
        const scaleX = width / img.width;
        const scaleY = height / img.height;
        const scale = Math.max(scaleX, scaleY);
        img.set({
          scaleX: scale, scaleY: scale,
          left: width / 2, top: height / 2,
          originX: "center", originY: "center",
          selectable: true, evented: true,
          name: "bgImage",
        });
        fc.add(img);
        fc.sendObjectToBack(img);
      } catch (e) { console.warn("bg image load failed", e); }
    }

    // title
    if (slide.title) {
      const title = new Textbox(slide.title, {
        left: 80, top: slide.image ? height * 0.35 : height * 0.3,
        width: width - 160,
        fontSize: slide.fontSize || 48,
        fontFamily: "Pretendard",
        fontWeight: "bold",
        fill: slide.textColor || "#ffffff",
        textAlign: "center",
        name: "title",
      });
      fc.add(title);
    }

    // body
    if (slide.body) {
      const body = new Textbox(slide.body, {
        left: 80, top: slide.image ? height * 0.55 : height * 0.52,
        width: width - 160,
        fontSize: Math.round((slide.fontSize || 48) * 0.55),
        fontFamily: "Pretendard",
        fill: slide.textColor || "#ffffff",
        textAlign: "center",
        opacity: 0.85,
        name: "body",
      });
      fc.add(body);
    }

    fc.renderAll();
    pushHistory();
  }

  /* ── save current canvas to state ──────────────────────────────────── */
  function saveCurrentCanvas() {
    const fc = canvasRef.current;
    if (!fc) return;
    const json = fc.toJSON();
    setSlideDataArr(prev => {
      const next = [...prev];
      next[currentIdx] = json;
      return next;
    });
  }

  /* ── slide navigation ──────────────────────────────────────────────── */
  function goToSlide(idx) {
    if (idx < 0 || idx >= totalSlides) return;
    saveCurrentCanvas();
    const fc = canvasRef.current;
    if (!fc) return;
    fc.discardActiveObject();
    setSelectedObj(null);
    setSelProps({});
    setCurrentIdx(idx);
    loadSlideToCanvas(fc, slideMetaArr[idx] || initialSlides[idx], idx);
    setHistory([]);
    setHistoryIdx(-1);
  }

  /* ── property setters ──────────────────────────────────────────────── */
  function setProp(key, value) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    obj.set(key, value);
    fc.renderAll();
    updateSelProps(obj);
    pushHistory();
  }

  function setBgColor(color) {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.backgroundColor = color;
    fc.renderAll();
    pushHistory();
  }

  /* ── add objects ───────────────────────────────────────────────────── */
  function addText() {
    const fc = canvasRef.current;
    if (!fc) return;
    const t = new Textbox("텍스트를 입력하세요", {
      left: width * 0.15, top: height * 0.4,
      width: width * 0.7,
      fontSize: 36, fontFamily: "Pretendard",
      fill: "#333333", textAlign: "center",
    });
    fc.add(t);
    fc.setActiveObject(t);
    fc.renderAll();
    pushHistory();
  }

  function addShape(type) {
    const fc = canvasRef.current;
    if (!fc) return;
    let shape;
    if (type === "rect") {
      shape = new Rect({
        left: width * 0.3, top: height * 0.3,
        width: 200, height: 200,
        fill: C.purple, rx: 12, ry: 12,
      });
    } else {
      shape = new Circle({
        left: width * 0.4, top: height * 0.35,
        radius: 100, fill: C.pink,
      });
    }
    fc.add(shape);
    fc.setActiveObject(shape);
    fc.renderAll();
    pushHistory();
  }

  function addImageFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fc = canvasRef.current;
      if (!fc) return;
      try {
        const img = await FabricImage.fromURL(ev.target.result);
        const maxDim = width * 0.6;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        img.set({
          left: width * 0.2, top: height * 0.2,
          scaleX: scale, scaleY: scale,
        });
        fc.add(img);
        fc.setActiveObject(img);
        fc.renderAll();
        pushHistory();
      } catch (e) { console.error(e); }
    };
    reader.readAsDataURL(file);
  }

  function replaceImage(file) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!file || !obj || obj.type !== "image") return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const img = await FabricImage.fromURL(ev.target.result);
        img.set({
          left: obj.left, top: obj.top,
          scaleX: obj.scaleX, scaleY: obj.scaleY,
          angle: obj.angle, opacity: obj.opacity,
        });
        fc.remove(obj);
        fc.add(img);
        fc.setActiveObject(img);
        fc.renderAll();
        pushHistory();
      } catch (e) { console.error(e); }
    };
    reader.readAsDataURL(file);
  }

  function addBgImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const fc = canvasRef.current;
      if (!fc) return;
      try {
        const img = await FabricImage.fromURL(ev.target.result);
        const scaleX = width / img.width;
        const scaleY = height / img.height;
        const scale = Math.max(scaleX, scaleY);
        img.set({
          scaleX: scale, scaleY: scale,
          left: width / 2, top: height / 2,
          originX: "center", originY: "center",
          selectable: true, evented: true,
          name: "bgImage",
        });
        fc.add(img);
        fc.sendObjectToBack(img);
        fc.renderAll();
        pushHistory();
      } catch (e) { console.error(e); }
    };
    reader.readAsDataURL(file);
  }

  function deleteSelected() {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    fc.remove(obj);
    fc.discardActiveObject();
    fc.renderAll();
    setSelectedObj(null);
    setSelProps({});
    pushHistory();
  }

  /* ── quick actions ─────────────────────────────────────────────────── */
  function quickBrighter() {
    const fc = canvasRef.current;
    if (!fc) return;
    const bg = fc.backgroundColor || "#ffffff";
    setBgColor(lightenColor(hexFromAny(bg), 20));
  }
  function quickDarker() {
    const fc = canvasRef.current;
    if (!fc) return;
    const bg = fc.backgroundColor || "#ffffff";
    setBgColor(darkenColor(hexFromAny(bg), 20));
  }
  function quickFontBigger() {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.getObjects().forEach(o => {
      if (o.type === "textbox") o.set("fontSize", (o.fontSize || 24) + 4);
    });
    fc.renderAll();
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
    pushHistory();
  }
  function quickFontSmaller() {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.getObjects().forEach(o => {
      if (o.type === "textbox") o.set("fontSize", Math.max(10, (o.fontSize || 24) - 4));
    });
    fc.renderAll();
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
    pushHistory();
  }

  /* ── export / save ─────────────────────────────────────────────────── */
  async function exportAll() {
    saveCurrentCanvas();
    const fc = canvasRef.current;
    if (!fc) return [];

    const results = [];
    for (let i = 0; i < totalSlides; i++) {
      if (i !== currentIdx && slideDataArr[i]) {
        await fc.loadFromJSON(slideDataArr[i]);
        fc.renderAll();
      } else if (i !== currentIdx) {
        await loadSlideToCanvas(fc, slideMetaArr[i] || initialSlides[i], i);
      }
      // wait a tick for render
      await new Promise(r => setTimeout(r, 50));
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
      results.push({
        ...(slideMetaArr[i] || initialSlides[i]),
        dataUrl,
        fabricJson: fc.toJSON(),
      });
    }
    // reload current
    if (slideDataArr[currentIdx]) {
      await fc.loadFromJSON(slideDataArr[currentIdx]);
    } else {
      await loadSlideToCanvas(fc, slideMetaArr[currentIdx] || initialSlides[currentIdx], currentIdx);
    }
    fc.renderAll();
    return results;
  }

  async function handleSave() {
    const result = await exportAll();
    onSave?.(result);
  }

  async function handleSaveAndClose() {
    const result = await exportAll();
    onSave?.(result);
    onClose?.();
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  const panelW = isMobile ? "100%" : "38%";
  const canvasAreaW = isMobile ? "100%" : "62%";

  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ ...S.modal, flexDirection: isMobile ? "column" : "row" }}>

        {/* ── LEFT: Canvas Area ──────────────────────────────────────── */}
        <div style={{ ...S.canvasArea, width: canvasAreaW }}>

          {/* Slide nav */}
          <div style={S.slideNav}>
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx - 1)} disabled={currentIdx === 0}>
              <Icon.Left />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {currentIdx + 1} / {totalSlides} 페이지 편집
            </span>
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx + 1)} disabled={currentIdx >= totalSlides - 1}>
              <Icon.Right />
            </button>
            <div style={{ flex: 1 }} />
            <button style={S.closeBtn} onClick={onClose}><Icon.Close /></button>
          </div>

          {/* Canvas container */}
          <div ref={containerRef} style={S.canvasContainer}>
            <div style={{
              width: width * canvasScale,
              height: height * canvasScale,
              overflow: "hidden",
              borderRadius: 8,
              boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
            }}>
              <canvas ref={canvasElRef} />
            </div>
          </div>

          {/* Toolbar */}
          <div style={S.toolbar}>
            <Btn small onClick={addText}>+ 텍스트</Btn>
            <Btn small onClick={() => fileInputRef.current?.click()}>+ 이미지</Btn>
            <Btn small onClick={() => addShape("rect")}>▬ 사각형</Btn>
            <Btn small onClick={() => addShape("circle")}>● 원</Btn>
            <div style={{ width: 1, height: 24, background: "rgba(0,0,0,0.1)", margin: "0 4px" }} />
            <Btn small onClick={deleteSelected} style={{ color: "#e53e3e" }}><Icon.Trash /> 삭제</Btn>
            <Btn small onClick={undo} disabled={historyIdx <= 0}><Icon.Undo /></Btn>
            <Btn small onClick={redo} disabled={historyIdx >= history.length - 1}><Icon.Redo /></Btn>
          </div>

          {/* Quick actions */}
          <div style={S.quickActions}>
            <Btn small onClick={quickBrighter} accent="#f6ad55">더 밝게</Btn>
            <Btn small onClick={quickDarker} accent="#4a5568">더 어둡게</Btn>
            <Btn small onClick={quickFontBigger} accent={C.purple}>폰트 크게</Btn>
            <Btn small onClick={quickFontSmaller} accent={C.purpleL}>폰트 작게</Btn>
          </div>

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { addImageFromFile(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={bgFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { addBgImage(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={replaceFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { replaceImage(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        {/* ── RIGHT: Properties Panel ────────────────────────────────── */}
        <div style={{ ...S.panel, width: panelW }}>
          <div style={S.panelTitle}>속성 패널</div>

          {/* === Text props === */}
          {selectedObj && (selProps.type === "textbox" || selProps.type === "text") && (
            <div style={S.section}>
              <div style={S.sectionLabel}>텍스트 속성</div>

              {/* Font family */}
              <label style={S.label}>폰트</label>
              <select style={S.select} value={selProps.fontFamily}
                onChange={e => setProp("fontFamily", e.target.value)}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              {/* Font size */}
              <label style={S.label}>크기: {selProps.fontSize}px</label>
              <input type="range" min={10} max={200} step={1} value={selProps.fontSize}
                style={S.range} onChange={e => setProp("fontSize", +e.target.value)} />

              {/* Color */}
              <label style={S.label}>색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={hexFromAny(selProps.fill)} style={S.colorInput}
                  onChange={e => setProp("fill", e.target.value)} />
                <span style={{ fontSize: 12, color: "#888" }}>{hexFromAny(selProps.fill)}</span>
              </div>

              {/* Bold / Italic */}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Btn small active={selProps.fontWeight === "bold"}
                  onClick={() => setProp("fontWeight", selProps.fontWeight === "bold" ? "normal" : "bold")}
                  accent={C.purple}><Icon.Bold /> 굵게</Btn>
                <Btn small active={selProps.fontStyle === "italic"}
                  onClick={() => setProp("fontStyle", selProps.fontStyle === "italic" ? "normal" : "italic")}
                  accent={C.purple}><Icon.Italic /> 기울임</Btn>
              </div>

              {/* Alignment */}
              <label style={{ ...S.label, marginTop: 10 }}>정렬</label>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small active={selProps.textAlign === "left"}
                  onClick={() => setProp("textAlign", "left")} accent={C.purple}><Icon.AlignLeft /></Btn>
                <Btn small active={selProps.textAlign === "center"}
                  onClick={() => setProp("textAlign", "center")} accent={C.purple}><Icon.AlignCenter /></Btn>
                <Btn small active={selProps.textAlign === "right"}
                  onClick={() => setProp("textAlign", "right")} accent={C.purple}><Icon.AlignRight /></Btn>
              </div>
            </div>
          )}

          {/* === Image props === */}
          {selectedObj && selProps.type === "image" && (
            <div style={S.section}>
              <div style={S.sectionLabel}>이미지 속성</div>

              <Btn small onClick={() => replaceFileInputRef.current?.click()} style={{ marginBottom: 10 }}>
                이미지 교체
              </Btn>

              <label style={S.label}>투명도: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
              <input type="range" min={0} max={100} step={1}
                value={Math.round((selProps.opacity ?? 1) * 100)}
                style={S.range}
                onChange={e => setProp("opacity", +e.target.value / 100)} />
            </div>
          )}

          {/* === Shape props === */}
          {selectedObj && (selProps.type === "rect" || selProps.type === "circle") && (
            <div style={S.section}>
              <div style={S.sectionLabel}>도형 속성</div>

              <label style={S.label}>채우기 색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={hexFromAny(selProps.fill)} style={S.colorInput}
                  onChange={e => setProp("fill", e.target.value)} />
                <span style={{ fontSize: 12, color: "#888" }}>{hexFromAny(selProps.fill)}</span>
              </div>

              <label style={S.label}>투명도: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
              <input type="range" min={0} max={100} step={1}
                value={Math.round((selProps.opacity ?? 1) * 100)}
                style={S.range}
                onChange={e => setProp("opacity", +e.target.value / 100)} />
            </div>
          )}

          {/* === No selection === */}
          {!selectedObj && (
            <div style={S.section}>
              <div style={S.sectionLabel}>배경</div>

              <label style={S.label}>배경색</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color"
                  value={hexFromAny(canvasRef.current?.backgroundColor || "#ffffff")}
                  style={S.colorInput}
                  onChange={e => setBgColor(e.target.value)} />
              </div>

              <Btn small onClick={() => bgFileInputRef.current?.click()} style={{ marginTop: 10 }}>
                배경 이미지 업로드
              </Btn>

              <div style={{ marginTop: 20, padding: 14, background: "#f9f9fb", borderRadius: 10, fontSize: 13, color: "#888", lineHeight: 1.6 }}>
                캔버스의 오브젝트를 클릭하면<br />속성을 편집할 수 있습니다.
              </div>
            </div>
          )}

          {/* Save buttons */}
          <div style={S.saveArea}>
            <button style={{ ...S.saveBtn, background: `linear-gradient(135deg, ${C.purple}, ${C.pink})` }}
              onClick={handleSave}>
              저장
            </button>
            <button style={{ ...S.saveBtn, background: C.purple }}
              onClick={handleSaveAndClose}>
              저장 후 닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 12,
  },
  modal: {
    width: "100%", maxWidth: 1400, height: "95vh",
    background: "#fff", borderRadius: 16,
    display: "flex", overflow: "hidden",
    boxShadow: "0 8px 60px rgba(0,0,0,0.25)",
  },
  canvasArea: {
    display: "flex", flexDirection: "column",
    background: "#f0f0f5", padding: 0,
    overflow: "hidden",
  },
  slideNav: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 16px",
    background: "#fff",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  navBtn: {
    background: "none", border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 6, padding: "4px 8px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#888", padding: 4,
  },
  canvasContainer: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", padding: 8,
    background: "#e8e8ee",
  },
  toolbar: {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
    padding: "8px 12px",
    background: "#fff",
    borderTop: "1px solid rgba(0,0,0,0.08)",
  },
  quickActions: {
    display: "flex", flexWrap: "wrap", gap: 6,
    padding: "6px 12px 10px",
    background: "#fff",
    borderTop: "1px solid rgba(0,0,0,0.04)",
  },
  panel: {
    display: "flex", flexDirection: "column",
    background: "#fafafe",
    borderLeft: "1px solid rgba(0,0,0,0.08)",
    overflowY: "auto",
    padding: "0 0 16px",
  },
  panelTitle: {
    fontSize: 15, fontWeight: 700, padding: "14px 18px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    position: "sticky", top: 0, background: "#fafafe", zIndex: 2,
  },
  section: {
    padding: "14px 18px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#333",
  },
  label: {
    display: "block", fontSize: 12, fontWeight: 600, color: "#666",
    marginTop: 8, marginBottom: 4,
  },
  select: {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)", fontSize: 13,
    background: "#fff", outline: "none",
  },
  range: {
    width: "100%", accentColor: "#7c6aff",
  },
  colorInput: {
    width: 36, height: 36, padding: 0, border: "2px solid rgba(0,0,0,0.1)",
    borderRadius: 8, cursor: "pointer", background: "none",
  },
  saveArea: {
    marginTop: "auto", padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  saveBtn: {
    width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
    transition: "opacity 0.15s",
  },
};
