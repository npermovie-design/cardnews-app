import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, Line, FabricImage, Shadow, Gradient } from "fabric";
import { supabase } from "./storage";
import { FONTS, loadGFont, TEMPLATES, LAYOUT_OPTIONS, clamp, lightenColor, darkenColor, hexFromAny, Icon, Btn, CollapsibleSection } from "./CardNewsEditorUtils.jsx";
import { useI18n } from "./i18n.jsx";

/* ──────────────────────────────────────────────────────────────────────
   CardNewsEditor  –  Fabric.js v7 기반 카드뉴스 에디터
   ────────────────────────────────────────────────────────────────────── */
export default function CardNewsEditor({
  slides: initialSlides = [],
  width = 1080,
  height = 1080,
  C: themeIn,
  onSave,
  onClose,
  onShareTemplate,
  inline = false,
}) {
  const C = { ...DEFAULT_THEME, ...(themeIn || {}) };
  const { lang } = useI18n();
  const ko = lang === "ko";

  /* refs */
  const canvasRef = useRef(null);       // fabric Canvas instance
  const canvasElRef = useRef(null);     // <canvas> DOM element
  const containerRef = useRef(null);    // wrapper div for responsive sizing
  const fileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const fontFileInputRef = useRef(null);

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
  const [customFonts, setCustomFonts] = useState([]);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showSharedTemplateModal, setShowSharedTemplateModal] = useState(false);
  const [sharedTemplates, setSharedTemplates] = useState([]);
  const [sharedTemplatesLoading, setSharedTemplatesLoading] = useState(false);
  const [showImageLib, setShowImageLib] = useState(false);
  const [imgLibTab, setImgLibTab] = useState("pexels"); // pexels, pixabay, local
  const [imgLibQuery, setImgLibQuery] = useState("");
  const [imgLibResults, setImgLibResults] = useState([]);
  const [imgLibLoading, setImgLibLoading] = useState(false);
  const [imgLibPage, setImgLibPage] = useState(1);
  const [activeLeftTool, setActiveLeftTool] = useState(null); // null, "text", "image", "shape", "layout", "bg", "layer", "template"

  /* text effect states */
  const [textStrokeColor, setTextStrokeColor] = useState("#000000");
  const [textStrokeWidth, setTextStrokeWidth] = useState(0);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradColor1, setGradColor1] = useState("#7c6aff");
  const [gradColor2, setGradColor2] = useState("#ec4899");
  const [gradDirection, setGradDirection] = useState("horizontal");

  const totalSlides = initialSlides.length || 1;
  const allFonts = [...FONTS, ...customFonts];

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
    try {
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
      fc.on("object:added", refreshLayerList);
      fc.on("object:removed", refreshLayerList);

      // ── 스냅 가이드 (중앙/모서리 자석) ──
      const SNAP = 8; // 스냅 거리 (px)
      const guideLines = [];
      const clearGuides = () => { guideLines.forEach(l => fc.remove(l)); guideLines.length = 0; };
      const addGuideLine = (x1, y1, x2, y2) => {
        const line = new Line([x1, y1, x2, y2], { stroke: "#7c6aff", strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, excludeFromExport: true });
        fc.add(line); guideLines.push(line);
      };

      fc.on("object:moving", (e) => {
        const obj = e.target;
        if (!obj) return;
        clearGuides();
        const cw = fc.width, ch = fc.height;
        // getBoundingRect 대신 직접 계산 (Fabric v7 호환)
        const w = (obj.width || 0) * (obj.scaleX || 1);
        const h = (obj.height || 0) * (obj.scaleY || 1);
        const l = obj.left || 0;
        const t = obj.top || 0;
        const cx = l + w / 2;
        const cy = t + h / 2;

        // 세로 중앙선 (수직 가이드)
        if (Math.abs(cx - cw / 2) < SNAP) {
          obj.set({ left: cw / 2 - w / 2 });
          addGuideLine(cw / 2, 0, cw / 2, ch);
        }
        // 가로 중앙선 (수평 가이드)
        if (Math.abs(cy - ch / 2) < SNAP) {
          obj.set({ top: ch / 2 - h / 2 });
          addGuideLine(0, ch / 2, cw, ch / 2);
        }
        // 좌측
        if (Math.abs(l) < SNAP) {
          obj.set({ left: 0 });
          addGuideLine(0, 0, 0, ch);
        }
        // 우측
        if (Math.abs(l + w - cw) < SNAP) {
          obj.set({ left: cw - w });
          addGuideLine(cw, 0, cw, ch);
        }
        // 상단
        if (Math.abs(t) < SNAP) {
          obj.set({ top: 0 });
          addGuideLine(0, 0, cw, 0);
        }
        // 하단
        if (Math.abs(t + h - ch) < SNAP) {
          obj.set({ top: ch - h });
          addGuideLine(0, ch, cw, ch);
        }
        // 1/3 가이드 (세로)
        if (Math.abs(cx - cw / 3) < SNAP) {
          obj.set({ left: cw / 3 - w / 2 });
          addGuideLine(cw / 3, 0, cw / 3, ch);
        }
        if (Math.abs(cx - cw * 2 / 3) < SNAP) {
          obj.set({ left: cw * 2 / 3 - w / 2 });
          addGuideLine(cw * 2 / 3, 0, cw * 2 / 3, ch);
        }
        // 1/3 가이드 (가로)
        if (Math.abs(cy - ch / 3) < SNAP) {
          obj.set({ top: ch / 3 - h / 2 });
          addGuideLine(0, ch / 3, cw, ch / 3);
        }
        if (Math.abs(cy - ch * 2 / 3) < SNAP) {
          obj.set({ top: ch * 2 / 3 - h / 2 });
          addGuideLine(0, ch * 2 / 3, cw, ch * 2 / 3);
        }
        obj.setCoords();
        fc.renderAll();
      });

      fc.on("object:modified", () => { clearGuides(); fc.renderAll(); });
      fc.on("mouse:up", () => { clearGuides(); fc.renderAll(); });

      // load first slide
      if (initialSlides.length) {
        loadSlideToCanvas(fc, initialSlides[0], 0).catch(() => {});
      }

      setTimeout(fitCanvas, 50);

      // ── 키보드 단축키 ──
      const handleKey = (e) => {
        const fc = canvasRef.current;
        if (!fc) return;
        // 텍스트 편집 중이면 무시
        if (fc.getActiveObject()?.isEditing) return;
        // Delete / Backspace → 선택 삭제
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteSelected();
        }
        // Ctrl+Z → 되돌리기
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          undo();
        }
      };
      document.addEventListener("keydown", handleKey);

      return () => {
        document.removeEventListener("keydown", handleKey);
        try { fc.dispose(); } catch {}
        canvasRef.current = null;
      };
    } catch (e) {
      console.error("Canvas init error:", e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── resize canvas when width/height props change ─────────────── */
  useEffect(() => {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.setDimensions({ width, height });
    // re-fit to container
    setTimeout(fitCanvas, 50);
  }, [width, height]);

  /* ── refresh layer list ──────────────────────────────────────────── */
  function refreshLayerList() {
    const fc = canvasRef.current;
    if (!fc) return;
    const objs = fc.getObjects().map((o, i) => ({
      index: i,
      type: o.type,
      name: o.name || o.text?.substring(0, 20) || `${o.type} ${i + 1}`,
      obj: o,
    }));
    setCanvasObjects([...objs].reverse()); // top = front
  }

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
      wrapper.style.transformOrigin = "top center";
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
    refreshLayerList();
  }

  function updateSelProps(obj) {
    if (!obj) { setSelProps({}); return; }
    const p = {
      type: obj.type,
      fontSize: obj.fontSize || 48,
      fontFamily: obj.fontFamily || "Pretendard",
      fill: obj.fill || "#000000",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      textAlign: obj.textAlign || "left",
      opacity: obj.opacity ?? 1,
      text: obj.text || "",
    };
    setSelProps(p);

    // Sync text effect states
    if (obj.type === "textbox" || obj.type === "text") {
      setTextStrokeColor(obj.stroke || "#000000");
      setTextStrokeWidth(obj.strokeWidth || 0);
      const sh = obj.shadow;
      if (sh) {
        setShadowColor(sh.color || "#000000");
        setShadowBlur(sh.blur || 0);
        setShadowOffsetX(sh.offsetX || 0);
        setShadowOffsetY(sh.offsetY || 0);
      } else {
        setShadowColor("#000000");
        setShadowBlur(0);
        setShadowOffsetX(0);
        setShadowOffsetY(0);
      }
      // Check if fill is a gradient
      if (obj.fill && typeof obj.fill === "object" && obj.fill.type === "linear") {
        setGradientEnabled(true);
        const stops = obj.fill.colorStops || [];
        if (stops.length >= 2) {
          setGradColor1(stops[0].color || "#7c6aff");
          setGradColor2(stops[1].color || "#ec4899");
        }
      } else {
        setGradientEnabled(false);
      }
    }
  }

  function handleObjModified() {
    const fc = canvasRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
    pushHistory();
    refreshLayerList();
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
    fc.loadFromJSON(history[newIdx]).then(() => { fc.renderAll(); refreshLayerList(); });
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const fc = canvasRef.current;
    if (!fc) return;
    fc.loadFromJSON(history[newIdx]).then(() => { fc.renderAll(); refreshLayerList(); });
  }

  /* ── layout helpers ───────────────────────────────────────────────── */
  // Build layout-specific decorative elements and position title/body
  function getLayoutConfig(layout, fontSize, textColor, accentColor, bgColor) {
    const ac = accentColor || bgColor || "#7c6aff";
    const fs = fontSize || 56;
    const tc = textColor || "#ffffff";

    const pad = 80; // 좌우 여백
    const contentW = width - pad * 2; // 콘텐츠 영역 너비

    const layouts = {
      "center": {
        title: { left: width / 2, top: height * 0.40, originX: "center", originY: "center", textAlign: "center", width: contentW, fontSize: Math.round(fs * 1.1), fontWeight: "bold", lineHeight: 1.3 },
        body: { left: width / 2, top: height * 0.56, originX: "center", originY: "center", textAlign: "center", width: contentW, fontSize: Math.round(fs * 0.5), opacity: 0.85, lineHeight: 1.6 },
        decos: [],
      },
      "left-bar": {
        title: { left: pad + 20, top: height * 0.25, originX: "left", originY: "top", textAlign: "left", width: contentW - 20, fontSize: Math.round(fs * 1.05), fontWeight: "bold", lineHeight: 1.3 },
        body: { left: pad + 20, top: height * 0.50, originX: "left", originY: "top", textAlign: "left", width: contentW - 20, fontSize: Math.round(fs * 0.48), opacity: 0.85, lineHeight: 1.7 },
        decos: [
          { type: "rect", props: { left: 0, top: 0, width: 14, height: height, fill: ac, selectable: false, evented: false, name: "deco_leftbar" } },
        ],
      },
      "top-bold": {
        title: { left: width / 2, top: height * 0.12, originX: "center", originY: "top", textAlign: "center", width: contentW, fontSize: Math.round(fs * 1.5), fontWeight: "900", lineHeight: 1.2 },
        body: { left: width / 2, top: height * 0.60, originX: "center", originY: "top", textAlign: "center", width: contentW, fontSize: Math.round(fs * 0.45), opacity: 0.7, lineHeight: 1.7 },
        decos: [],
      },
      "bottom-card": {
        title: { left: width / 2, top: height * 0.62, originX: "center", originY: "top", textAlign: "center", width: contentW, fontSize: Math.round(fs * 1.05), fontWeight: "bold", fill: "#ffffff", lineHeight: 1.3 },
        body: { left: width / 2, top: height * 0.80, originX: "center", originY: "top", textAlign: "center", width: contentW, fontSize: Math.round(fs * 0.45), fill: "rgba(255,255,255,0.85)", lineHeight: 1.6 },
        decos: [
          { type: "rect", props: { left: 30, top: height * 0.55, width: width - 60, height: height * 0.40, fill: "rgba(0,0,0,0.7)", rx: 24, ry: 24, selectable: false, evented: false, name: "deco_card" } },
        ],
      },
      "magazine": {
        title: { left: pad, top: height * 0.68, originX: "left", originY: "top", textAlign: "left", width: contentW, fontSize: Math.round(fs * 1.25), fontWeight: "bold", lineHeight: 1.2 },
        body: { left: pad, top: height * 0.86, originX: "left", originY: "top", textAlign: "left", width: contentW, fontSize: Math.round(fs * 0.42), opacity: 0.8, lineHeight: 1.6 },
        decos: [
          { type: "rect", props: { left: 0, top: height * 0.62, width: width, height: height * 0.38, fill: "rgba(0,0,0,0.55)", selectable: false, evented: false, name: "deco_magoverlay" } },
        ],
      },
      "minimal": {
        title: { left: width / 2, top: height * 0.40, originX: "center", originY: "center", textAlign: "center", width: contentW, fontSize: Math.round(fs * 0.95), fontWeight: "bold", lineHeight: 1.3 },
        body: { left: width / 2, top: height * 0.56, originX: "center", originY: "top", textAlign: "center", width: contentW - 40, fontSize: Math.round(fs * 0.42), opacity: 0.55, lineHeight: 1.7 },
        decos: [
          { type: "rect", props: { left: width / 2 - 40, top: height * 0.33, width: 80, height: 3, fill: ac, selectable: false, evented: false, name: "deco_minline" } },
        ],
      },
      "quote": {
        title: { left: width / 2, top: height * 0.40, originX: "center", originY: "center", textAlign: "center", width: contentW - 40, fontSize: Math.round(fs * 1.0), fontWeight: "bold", fontStyle: "italic", lineHeight: 1.4 },
        body: { left: width / 2, top: height * 0.62, originX: "center", originY: "top", textAlign: "center", width: contentW - 40, fontSize: Math.round(fs * 0.42), opacity: 0.8, lineHeight: 1.7 },
        decos: [
          { type: "textbox", props: { left: pad, top: height * 0.12, text: "\u201C", fontSize: 160, fill: tc, opacity: 0.12, fontFamily: "Georgia", selectable: false, evented: false, name: "deco_quotemark" } },
        ],
      },
      "split-left": {
        title: { left: width * 0.2, top: height * 0.35, originX: "center", originY: "center", textAlign: "center", width: width * 0.32, fontSize: Math.round(fs * 1.0), fontWeight: "bold", fill: "#ffffff", lineHeight: 1.3 },
        body: { left: width * 0.2, top: height * 0.58, originX: "center", originY: "top", textAlign: "center", width: width * 0.32, fontSize: Math.round(fs * 0.42), fill: "rgba(255,255,255,0.85)", lineHeight: 1.6 },
        decos: [
          { type: "rect", props: { left: 0, top: 0, width: width * 0.4, height: height, fill: ac, selectable: false, evented: false, name: "deco_splitpanel" } },
        ],
      },
      "split-right": {
        title: { left: width * 0.8, top: height * 0.35, originX: "center", originY: "center", textAlign: "center", width: width * 0.32, fontSize: Math.round(fs * 1.0), fontWeight: "bold", fill: "#ffffff", lineHeight: 1.3 },
        body: { left: width * 0.8, top: height * 0.58, originX: "center", originY: "top", textAlign: "center", width: width * 0.32, fontSize: Math.round(fs * 0.42), fill: "rgba(255,255,255,0.85)", lineHeight: 1.6 },
        decos: [
          { type: "rect", props: { left: width * 0.6, top: 0, width: width * 0.4, height: height, fill: ac, selectable: false, evented: false, name: "deco_splitpanel" } },
        ],
      },
      "stripe": {
        title: { left: width / 2, top: height * 0.43, originX: "center", originY: "center", textAlign: "center", width: contentW, fontSize: Math.round(fs * 1.1), fontWeight: "bold", fill: "#ffffff", lineHeight: 1.2 },
        body: { left: width / 2, top: height * 0.68, originX: "center", originY: "top", textAlign: "center", width: contentW, fontSize: Math.round(fs * 0.45), opacity: 0.85, lineHeight: 1.7 },
        decos: [
          { type: "rect", props: { left: 0, top: height * 0.32, width: width, height: height * 0.32, fill: ac || "rgba(0,0,0,0.8)", selectable: false, evented: false, name: "deco_stripe" } },
        ],
      },
      "corner-accent": {
        title: { left: width - pad, top: height * 0.58, originX: "right", originY: "top", textAlign: "right", width: contentW, fontSize: Math.round(fs * 1.05), fontWeight: "bold", lineHeight: 1.3 },
        body: { left: width - pad, top: height * 0.76, originX: "right", originY: "top", textAlign: "right", width: contentW, fontSize: Math.round(fs * 0.42), opacity: 0.8, lineHeight: 1.6 },
        decos: [
          { type: "circle", props: { left: width * 0.12, top: height * 0.12, radius: 100, fill: ac, opacity: 0.25, originX: "center", originY: "center", selectable: false, evented: false, name: "deco_circle1" } },
          { type: "circle", props: { left: width * 0.18, top: height * 0.04, radius: 50, fill: ac, opacity: 0.18, originX: "center", originY: "center", selectable: false, evented: false, name: "deco_circle2" } },
        ],
      },
    };

    return layouts[layout] || layouts["center"];
  }

  // Apply layout to canvas: reposition title/body, manage decorative elements
  function applyLayoutToCanvas(fc, layout, fontSize, textColor, accentColor, bgColor) {
    const config = getLayoutConfig(layout, fontSize, textColor, accentColor, bgColor);

    // Remove old decorative elements
    const decoObjs = fc.getObjects().filter(o => o.name && o.name.startsWith("deco_"));
    decoObjs.forEach(o => fc.remove(o));

    // Add new decorative elements (before text so they're behind)
    config.decos.forEach(d => {
      let obj;
      if (d.type === "rect") obj = new Rect(d.props);
      else if (d.type === "circle") obj = new Circle(d.props);
      else if (d.type === "textbox") obj = new Textbox(d.props.text || "", { ...d.props });
      if (obj) {
        fc.add(obj);
        // Send decorative elements to back; bg image will remain behind since it was sent to back first
        fc.sendObjectToBack(obj);
        // If there's a bg image, make sure it stays behind the deco
        const bgImg = fc.getObjects().find(o => o.name === "bgImage");
        if (bgImg) fc.sendObjectToBack(bgImg);
      }
    });

    // Reposition title
    const titleObj = fc.getObjects().find(o => o.name === "title");
    if (titleObj && config.title) {
      titleObj.set({
        left: config.title.left,
        top: config.title.top,
        originX: config.title.originX || "center",
        originY: config.title.originY || "center",
        textAlign: config.title.textAlign || "center",
        width: config.title.width || (width - 160),
        fontSize: config.title.fontSize || (fontSize || 56),
        fontWeight: config.title.fontWeight || "bold",
        lineHeight: config.title.lineHeight || 1.3,
      });
      if (config.title.fontStyle) titleObj.set("fontStyle", config.title.fontStyle);
      if (config.title.fill) titleObj.set("fill", config.title.fill);
      if (config.title.opacity !== undefined) titleObj.set("opacity", config.title.opacity);
    }

    // Reposition body
    const bodyObj = fc.getObjects().find(o => o.name === "body");
    if (bodyObj && config.body) {
      bodyObj.set({
        left: config.body.left,
        top: config.body.top,
        originX: config.body.originX || "center",
        originY: config.body.originY || "center",
        textAlign: config.body.textAlign || "center",
        width: config.body.width || (width - 160),
        fontSize: config.body.fontSize || Math.round((fontSize || 56) * 0.45),
        lineHeight: config.body.lineHeight || 1.6,
      });
      if (config.body.fill) bodyObj.set("fill", config.body.fill);
      if (config.body.opacity !== undefined) bodyObj.set("opacity", config.body.opacity);
    }

    fc.renderAll();
  }

  /* ── load slide onto canvas ────────────────────────────────────────── */
  async function loadSlideToCanvas(fc, slide, idx) {
    // If we already have serialized JSON for this slide, use it
    if (slideDataArr[idx]) {
      await fc.loadFromJSON(slideDataArr[idx]);
      fc.renderAll();
      refreshLayerList();
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
      } catch (e) { /* bg image load failed */ }
    }

    // load font if specified
    const slideFontFamily = slide.fontFamily || "Pretendard";
    loadGFont(slideFontFamily);

    // Determine layout config
    const slideLayout = slide.layout || "center";
    const slideFontSize = slide.fontSize || 56;
    const config = getLayoutConfig(slideLayout, slideFontSize, slide.textColor, slide.accentColor, slide.bgColor);

    // Add decorative elements first (behind text)
    config.decos.forEach(d => {
      let obj;
      if (d.type === "rect") obj = new Rect(d.props);
      else if (d.type === "circle") obj = new Circle(d.props);
      else if (d.type === "textbox") obj = new Textbox(d.props.text || "", { ...d.props });
      if (obj) {
        fc.add(obj);
      }
    });

    // title
    if (slide.title) {
      const titleProps = {
        left: config.title.left,
        top: config.title.top,
        originX: config.title.originX || "center",
        originY: config.title.originY || "center",
        width: config.title.width || (width - 160),
        fontSize: config.title.fontSize || slideFontSize,
        fontFamily: slideFontFamily,
        fontWeight: config.title.fontWeight || "bold",
        fill: config.title.fill || slide.textColor || "#ffffff",
        textAlign: config.title.textAlign || "center",
        lineHeight: config.title.lineHeight || 1.3,
        name: "title",
      };
      if (config.title.fontStyle) titleProps.fontStyle = config.title.fontStyle;
      if (config.title.opacity !== undefined) titleProps.opacity = config.title.opacity;
      const title = new Textbox(slide.title, titleProps);
      fc.add(title);
    }

    // body
    if (slide.body) {
      const bodyProps = {
        left: config.body.left,
        top: config.body.top,
        originX: config.body.originX || "center",
        originY: config.body.originY || "center",
        width: config.body.width || (width - 160),
        fontSize: config.body.fontSize || Math.round(slideFontSize * 0.45),
        fontFamily: slideFontFamily,
        fill: config.body.fill || slide.textColor || "#ffffff",
        textAlign: config.body.textAlign || "center",
        opacity: config.body.opacity !== undefined ? config.body.opacity : 0.85,
        lineHeight: config.body.lineHeight || 1.6,
        name: "body",
      };
      const body = new Textbox(slide.body, bodyProps);
      fc.add(body);
    }

    fc.renderAll();
    refreshLayerList();
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

  /* ── text effect setters ────────────────────────────────────────────── */
  function applyTextStroke(color, w) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    obj.set({ stroke: color, strokeWidth: w });
    fc.renderAll();
    pushHistory();
  }

  function applyTextShadow(color, blur, ox, oy) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    if (blur === 0 && ox === 0 && oy === 0) {
      obj.set({ shadow: null });
    } else {
      obj.set({ shadow: new Shadow({ color, blur, offsetX: ox, offsetY: oy }) });
    }
    fc.renderAll();
    pushHistory();
  }

  function applyGradient(enabled, c1, c2, dir) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    if (!enabled) {
      // revert to solid color
      obj.set({ fill: gradColor1 || "#333333" });
    } else {
      obj.set({
        fill: new Gradient({
          type: "linear",
          coords: {
            x1: 0, y1: 0,
            x2: dir === "horizontal" ? obj.width : 0,
            y2: dir === "vertical" ? obj.height : 0,
          },
          colorStops: [
            { offset: 0, color: c1 },
            { offset: 1, color: c2 },
          ],
        }),
      });
    }
    fc.renderAll();
    pushHistory();
  }

  /* ── custom font upload ─────────────────────────────────────────────── */
  function handleCustomFont(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, "");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const font = new FontFace(name, ev.target.result);
      font.load().then((loaded) => {
        document.fonts.add(loaded);
        setCustomFonts(prev => [...prev, { label: name + " (내 폰트)", value: name }]);
      }).catch(err => console.error("Font load error:", err));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  /* ── layer operations ───────────────────────────────────────────────── */
  function bringForward(obj) {
    const fc = canvasRef.current;
    if (!fc || !obj) return;
    fc.bringObjectForward(obj);
    fc.renderAll();
    refreshLayerList();
    pushHistory();
  }

  function sendBackward(obj) {
    const fc = canvasRef.current;
    if (!fc || !obj) return;
    fc.sendObjectBackwards(obj);
    fc.renderAll();
    refreshLayerList();
    pushHistory();
  }

  function selectLayerObj(obj) {
    const fc = canvasRef.current;
    if (!fc || !obj) return;
    fc.setActiveObject(obj);
    fc.renderAll();
    setSelectedObj(obj);
    updateSelProps(obj);
  }

  /* ── add objects ───────────────────────────────────────────────────── */
  function addText() {
    const fc = canvasRef.current;
    if (!fc) return;
    const t = new Textbox(ko ? "텍스트를 입력하세요" : "Enter text here", {
      left: width * 0.1, top: height * 0.4,
      width: width * 0.8,
      fontSize: 48, fontFamily: "Pretendard",
      fill: "#333333", textAlign: "center",
      lineHeight: 1.4,
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

  /* ── image library search ──────────────────────────────────────── */
  async function searchImageLib(query, source, page = 1) {
    setImgLibLoading(true);
    setImgLibResults(prev => page === 1 ? [] : prev);
    try {
      let items = [];
      if (source === "pexels") {
        const path = query ? "v1/search" : "v1/curated";
        const params = query ? `query=${encodeURIComponent(query)}&per_page=20&page=${page}` : `per_page=20&page=${page}`;
        const res = await fetch(`/api/proxy?action=pexels&path=${path}&${params}`);
        const data = await res.json();
        items = (data.photos || []).map(p => ({
          id: p.id, title: p.photographer || "Pexels",
          url: p.src?.large2x || p.src?.large || "",
          preview: p.src?.medium || p.src?.small || "",
          source: "Pexels",
        }));
      } else if (source === "pixabay") {
        const res = await fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(query || "nature")}&per_page=20&page=${page}&safesearch=true&image_type=photo`);
        const data = await res.json();
        items = (data.hits || []).map(h => ({
          id: h.id, title: h.tags,
          url: h.largeImageURL || h.webformatURL,
          preview: h.webformatURL || h.previewURL,
          source: "Pixabay",
        }));
      } else if (source === "local") {
        // Local 3D icons from public/icons3d
        const localIcons = [
          { id: "blog-write", title: "블로그 글쓰기", preview: "/icons3d/blog-write.png", url: "/icons3d/blog-write.png" },
          { id: "blog", title: "블로그", preview: "/icons3d/blog.png", url: "/icons3d/blog.png" },
          { id: "sns-content", title: "SNS 콘텐츠", preview: "/icons3d/sns-content.png", url: "/icons3d/sns-content.png" },
          { id: "sns-marketing", title: "SNS 마케팅", preview: "/icons3d/sns-marketing.png", url: "/icons3d/sns-marketing.png" },
          { id: "sns-share", title: "공유", preview: "/icons3d/sns-share.png", url: "/icons3d/sns-share.png" },
          { id: "report", title: "리포트", preview: "/icons3d/report.png", url: "/icons3d/report.png" },
          { id: "analytics", title: "분석", preview: "/icons3d/analytics.png", url: "/icons3d/analytics.png" },
          { id: "palette", title: "팔레트", preview: "/icons3d/palette.png", url: "/icons3d/palette.png" },
          { id: "camera", title: "카메라", preview: "/icons3d/camera.png", url: "/icons3d/camera.png" },
          { id: "clock", title: "시계", preview: "/icons3d/clock.png", url: "/icons3d/clock.png" },
          { id: "memo", title: "메모", preview: "/icons3d/memo.png", url: "/icons3d/memo.png" },
          { id: "search-book", title: "검색", preview: "/icons3d/search-book.png", url: "/icons3d/search-book.png" },
          { id: "thumbsup", title: "좋아요", preview: "/icons3d/thumbsup.png", url: "/icons3d/thumbsup.png" },
          { id: "sns-heart", title: "SNS 하트", preview: "/icons3d/sns-heart.png", url: "/icons3d/sns-heart.png" },
          { id: "sns-app", title: "앱 아이콘", preview: "/icons3d/sns-app.png", url: "/icons3d/sns-app.png" },
          { id: "instagram-cam", title: "인스타그램", preview: "/icons3d/instagram-cam.png", url: "/icons3d/instagram-cam.png" },
          { id: "seo-book", title: "SEO 분석", preview: "/icons3d/seo-book.png", url: "/icons3d/seo-book.png" },
          { id: "news", title: "뉴스", preview: "/icons3d/news.png", url: "/icons3d/news.png" },
          { id: "ppt", title: "프레젠테이션", preview: "/icons3d/ppt.png", url: "/icons3d/ppt.png" },
        ];
        const filtered = query ? localIcons.filter(i => i.title.toLowerCase().includes(query.toLowerCase())) : localIcons;
        items = filtered.map(i => ({ ...i, source: "3D 아이콘" }));
      } else if (source === "archive") {
        // Supabase 자료실 (커뮤니티 archive 게시물의 첨부 이미지)
        try {
          let q = supabase.from("posts").select("id, title, images").eq("subCat", "archive").order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
          if (query) q = q.ilike("title", `%${query}%`);
          const { data } = await q;
          if (data) {
            for (const post of data) {
              const imgs = Array.isArray(post.images) ? post.images : [];
              imgs.forEach((url, idx) => {
                if (url && typeof url === "string") {
                  items.push({ id: `${post.id}_${idx}`, title: post.title || "자료실", url, preview: url, source: "자료실" });
                }
              });
            }
          }
        } catch {}
      }
      setImgLibResults(prev => page === 1 ? items : [...prev, ...items]);
      setImgLibPage(page);
    } catch (e) {
      /* image lib search failed */
    }
    setImgLibLoading(false);
  }

  async function addImageFromUrl(url) {
    const fc = canvasRef.current;
    if (!fc) return;
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const maxDim = width * 0.5;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      img.set({
        left: width * 0.25, top: height * 0.25,
        scaleX: scale, scaleY: scale,
      });
      fc.add(img);
      fc.setActiveObject(img);
      fc.renderAll();
      pushHistory();
    } catch (e) { console.error("Image from URL failed:", e); }
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

  /* ── apply design template ──────────────────────────────────────────── */
  async function applyTemplate(template) {
    const fc = canvasRef.current;
    if (!fc) return;

    // 기존 배경 이미지 제거
    const existingBg = fc.getObjects().find(o => o.name === "bgImage");
    if (existingBg) fc.remove(existingBg);

    // 실사 배경 이미지 적용
    if (template.bgImage) {
      fc.backgroundColor = template.bgColor || "#000000";
      try {
        const img = await FabricImage.fromURL(template.bgImage, { crossOrigin: "anonymous" });
        const scaleX = width / img.width;
        const scaleY = height / img.height;
        const scale = Math.max(scaleX, scaleY);
        img.set({
          scaleX: scale, scaleY: scale,
          left: width / 2, top: height / 2,
          originX: "center", originY: "center",
          selectable: true, evented: true,
          name: "bgImage", opacity: 0.7,
        });
        fc.add(img);
        fc.sendObjectToBack(img);
      } catch (e) { /* template bg image failed */ }
    } else {
      fc.backgroundColor = template.bgColor;
    }

    // 텍스트 스타일 적용 (색상, 폰트)
    loadGFont(template.fontFamily);
    fc.getObjects().forEach(o => {
      if ((o.type === "textbox" || o.type === "text") && !(o.name && o.name.startsWith("deco_"))) {
        o.set("fill", template.textColor);
        o.set("fontFamily", template.fontFamily);
        if (template.bgImage) {
          // 실사 배경일 때 텍스트에 그림자 추가 (가독성)
          o.set("shadow", new Shadow({ color: "rgba(0,0,0,0.7)", blur: 10, offsetX: 2, offsetY: 3 }));
        } else {
          o.set("shadow", null);
        }
      }
    });

    // 레이아웃 적용 - 항상 기본 56px 기준으로 레이아웃 계산
    const baseFontSize = 56;
    if (template.layout) {
      applyLayoutToCanvas(fc, template.layout, baseFontSize, template.textColor, template.accentColor, template.bgColor);
    }

    fc.renderAll();
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
    pushHistory();
  }

  /* ── load shared templates ─────────────────────────────────────────── */
  async function loadSharedTemplates() {
    setSharedTemplatesLoading(true);
    const all = [];
    try {
      const community = JSON.parse(localStorage.getItem("nper_shared_templates_community") || "[]");
      community.forEach(t => all.push({ ...t, source: "community" }));
    } catch {}
    try {
      const mine = JSON.parse(localStorage.getItem("nper_shared_templates_mine") || "[]");
      mine.forEach(t => all.push({ ...t, source: "mine" }));
    } catch {}
    try {
      if (supabase) {
        const { data, error } = await supabase.from("shared_templates").select("*").order("created_at", { ascending: false }).limit(30);
        if (!error && data) {
          data.forEach(t => { if (!all.find(a => a.id === t.id)) all.push({ ...t, source: "supabase" }); });
        }
      }
    } catch {}
    const unique = [];
    const seen = new Set();
    for (const t of all) { const key = String(t.id); if (!seen.has(key)) { seen.add(key); unique.push(t); } }
    setSharedTemplates(unique);
    setSharedTemplatesLoading(false);
  }

  async function applySharedTemplate(tpl) {
    const fc = canvasRef.current;
    if (!fc) return;
    try {
      // 1) Fabric JSON이 있으면 직접 로드
      if (tpl.canvas_json) {
        const json = typeof tpl.canvas_json === "string" ? JSON.parse(tpl.canvas_json) : tpl.canvas_json;
        await fc.loadFromJSON(json);
        fc.renderAll();
        refreshLayerList();
        pushHistory();
        setShowSharedTemplateModal(false);
        return;
      }
      // 2) slides_data가 있으면 슬라이드 데이터로 적용
      if (tpl.slides_data) {
        const parsed = typeof tpl.slides_data === "string" ? JSON.parse(tpl.slides_data) : tpl.slides_data;
        if (parsed?.[0]) {
          const s = parsed[0];
          // 배경색 적용
          fc.backgroundColor = s.bgColor || tpl.bgColor || "#1a1a2e";
          // 기존 title/body 오브젝트 텍스트+스타일 업데이트
          const titleObj = fc.getObjects().find(o => o.name === "title");
          const bodyObj = fc.getObjects().find(o => o.name === "body");
          if (titleObj && s.title) {
            titleObj.set({
              text: s.title,
              fill: s.textColor || "#ffffff",
              ...(s.fontFamily ? { fontFamily: s.fontFamily } : {}),
            });
          }
          if (bodyObj && s.body) {
            bodyObj.set({
              text: s.body,
              fill: s.textColor || "#ffffff",
              ...(s.fontFamily ? { fontFamily: s.fontFamily } : {}),
            });
          }
          // 프리셋 키로 레이아웃 변경
          if (s.layout) {
            applyLayoutToCanvas(fc, s.layout, s.fontSize || 56, s.textColor || "#ffffff", "#7c6aff", s.bgColor || "#1a1a2e");
          }
          fc.renderAll();
          refreshLayerList();
          pushHistory();
        }
      }
    } catch (e) { /* template apply failed */ }
    setShowSharedTemplateModal(false);
  }

  /* ── change layout of current slide ──────────────────────────────────── */
  function changeLayout(layoutKey) {
    const fc = canvasRef.current;
    if (!fc) return;
    const bgColor = fc.backgroundColor || "#ffffff";
    // Try to detect accent/text colors from existing title
    const titleObj = fc.getObjects().find(o => o.name === "title");
    const textColor = titleObj ? (typeof titleObj.fill === "string" ? titleObj.fill : "#ffffff") : "#ffffff";
    const accentColor = "#7c6aff";
    applyLayoutToCanvas(fc, layoutKey, 56, textColor, accentColor, bgColor);
    setShowLayoutPicker(false);
    pushHistory();
  }

  /* ── text position helpers ─────────────────────────────────────────── */
  function alignTextHorizontal(align) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj || (obj.type !== "textbox" && obj.type !== "text")) return;
    const pad = 80;
    if (align === "left") {
      obj.set({ left: pad, originX: "left" });
    } else if (align === "center") {
      obj.set({ left: width / 2, originX: "center" });
    } else if (align === "right") {
      obj.set({ left: width - pad, originX: "right" });
    }
    fc.renderAll();
    pushHistory();
  }

  function alignTextVertical(pos) {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj || (obj.type !== "textbox" && obj.type !== "text")) return;
    const pad = 80;
    if (pos === "top") {
      obj.set({ top: pad, originY: "top" });
    } else if (pos === "middle") {
      obj.set({ top: height / 2, originY: "center" });
    } else if (pos === "bottom") {
      obj.set({ top: height - pad, originY: "bottom" });
    }
    fc.renderAll();
    pushHistory();
  }

  /* ── download single slide as PNG ───────────────────────────────────── */
  function downloadCurrentPNG() {
    const fc = canvasRef.current;
    if (!fc) return;
    const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `slide_${currentIdx + 1}.png`;
    a.click();
  }

  /* ── download all slides as individual PNGs ─────────────────────────── */
  async function downloadAllPNGs() {
    saveCurrentCanvas();
    const fc = canvasRef.current;
    if (!fc) return;

    for (let i = 0; i < totalSlides; i++) {
      if (i !== currentIdx && slideDataArr[i]) {
        await fc.loadFromJSON(slideDataArr[i]);
        fc.renderAll();
      } else if (i !== currentIdx) {
        await loadSlideToCanvas(fc, slideMetaArr[i] || initialSlides[i], i);
      }
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide_${i + 1}.png`;
      a.click();
      await new Promise(r => setTimeout(r, 200));
    }
    // reload current slide
    if (slideDataArr[currentIdx]) {
      await fc.loadFromJSON(slideDataArr[currentIdx]);
    } else {
      await loadSlideToCanvas(fc, slideMetaArr[currentIdx] || initialSlides[currentIdx], currentIdx);
    }
    fc.renderAll();
  }

  /* ── get first slide preview as base64 ──────────────────────────────── */
  function getFirstSlidePreview() {
    try {
      const fc = canvasRef.current;
      if (!fc) return null;
      // If we're on the first slide, just capture it
      if (currentIdx === 0) {
        return fc.toDataURL({ format: "jpeg", quality: 0.5, multiplier: 0.5 });
      }
      // Otherwise return null (caller will handle)
      return null;
    } catch { return null; }
  }

  /* ── layer type icon helper ─────────────────────────────────────────── */
  function layerIcon(type) {
    if (type === "textbox" || type === "text") return "T";
    if (type === "image") return "\uD83D\uDDBC";
    return "\u25FC";
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  const isTextSelected = selectedObj && (selProps.type === "textbox" || selProps.type === "text");

  // 왼쪽 아이콘 도구 목록 (미리캔버스 스타일)
  const leftTools = [
    { id:"template", icon:"📂", label:ko?"템플릿":"Template" },
    { id:"text",     icon:"T",  label:ko?"텍스트":"Text" },
    { id:"image",    icon:"🖼", label:ko?"이미지":"Image" },
    { id:"shape",    icon:"◆",  label:ko?"도형":"Shape" },
    { id:"layout",   icon:"⊞",  label:ko?"레이아웃":"Layout" },
    { id:"bg",       icon:"🎨", label:ko?"배경":"BG" },
    { id:"layer",    icon:"☰",  label:ko?"레이어":"Layer" },
  ];

  const toggleLeftTool = (id) => setActiveLeftTool(prev => prev === id ? null : id);

  const overlayStyle = inline
    ? { width: "100%", flex: 1, display: "flex", alignItems: "stretch", justifyContent: "center", padding: 0, overflow: "hidden" }
    : S.overlay;
  const modalStyle = inline
    ? { width: "100%", flex: 1, background: "#fff", display: "flex", overflow: "hidden", flexDirection: isMobile ? "column" : "row" }
    : { ...S.modal, flexDirection: isMobile ? "column" : "row" };

  return (
    <div style={overlayStyle} onClick={inline ? undefined : (e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={modalStyle}>

        {/* ── LEFT ICON TOOLBAR (미리캔버스 스타일) ──────────────── */}
        {!isMobile && (
          <div style={{ width: 64, background: "#fafaff", borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, flexShrink: 0 }}>
            {leftTools.map(tool => (
              <button key={tool.id} onClick={() => toggleLeftTool(tool.id)}
                style={{ width: 54, height: 54, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2, transition: "all 0.15s",
                  background: activeLeftTool === tool.id ? "rgba(124,106,255,0.15)" : "transparent",
                  color: activeLeftTool === tool.id ? "#7c6aff" : "#666",
                }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{tool.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap" }}>{tool.label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={undo} disabled={historyIdx <= 0} title={ko?"되돌리기":"Undo"}
              style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", color: "#888", marginBottom: 4 }}>
              <Icon.Undo />
            </button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} title={ko?"다시 실행":"Redo"}
              style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", color: "#888", marginBottom: 8 }}>
              <Icon.Redo />
            </button>
          </div>
        )}

        {/* ── LEFT EXPANDED PANEL ──────────────────────────────────── */}
        {!isMobile && activeLeftTool && (
          <div style={{ width: 220, background: "#fff", borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                {leftTools.find(t => t.id === activeLeftTool)?.label}
              </span>
              <button onClick={() => setActiveLeftTool(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>

              {/* 텍스트 도구 */}
              {activeLeftTool === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn small onClick={() => { addText(); setActiveLeftTool(null); }} style={{ width: "100%", justifyContent: "center" }}>{ko ? "텍스트 추가" : "Add Text"}</Btn>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6, marginTop: 8 }}>
                    {ko ? "캔버스 위의 텍스트를 클릭하면 편집할 수 있습니다." : "Click text on canvas to edit."}
                  </div>
                  {isTextSelected && (
                    <>
                      <label style={S.label}>{ko ? "폰트" : "Font"}</label>
                      <select style={{ ...S.select, fontSize: 12 }} value={selProps.fontFamily}
                        onChange={e => { loadGFont(e.target.value); setProp("fontFamily", e.target.value); }}>
                        {allFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <Btn small onClick={() => fontFileInputRef.current?.click()} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                        {ko ? "내 폰트 업로드" : "Upload Font"}
                      </Btn>
                      <label style={S.label}>{ko ? "크기" : "Size"}: {selProps.fontSize}px</label>
                      <input type="range" min={10} max={200} step={1} value={selProps.fontSize} style={S.range} onChange={e => setProp("fontSize", +e.target.value)} />
                      <label style={S.label}>{ko ? "색상" : "Color"}</label>
                      <input type="color" value={typeof selProps.fill === "string" ? hexFromAny(selProps.fill) : "#000000"} style={S.colorInput}
                        onChange={e => { setGradientEnabled(false); setProp("fill", e.target.value); }} />
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        <Btn small active={selProps.fontWeight === "bold"} onClick={() => setProp("fontWeight", selProps.fontWeight === "bold" ? "normal" : "bold")} accent={C.purple}><Icon.Bold /></Btn>
                        <Btn small active={selProps.fontStyle === "italic"} onClick={() => setProp("fontStyle", selProps.fontStyle === "italic" ? "normal" : "italic")} accent={C.purple}><Icon.Italic /></Btn>
                        <Btn small active={selProps.textAlign === "left"} onClick={() => setProp("textAlign", "left")} accent={C.purple}><Icon.AlignLeft /></Btn>
                        <Btn small active={selProps.textAlign === "center"} onClick={() => setProp("textAlign", "center")} accent={C.purple}><Icon.AlignCenter /></Btn>
                        <Btn small active={selProps.textAlign === "right"} onClick={() => setProp("textAlign", "right")} accent={C.purple}><Icon.AlignRight /></Btn>
                      </div>
                      <label style={S.label}>{ko ? "투명도" : "Opacity"}: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
                      <input type="range" min={0} max={100} step={1} value={Math.round((selProps.opacity ?? 1) * 100)} style={S.range} onChange={e => setProp("opacity", +e.target.value / 100)} />

                      <CollapsibleSection title={ko ? "테두리" : "Stroke"} defaultOpen={false} C={C}>
                        <input type="color" value={textStrokeColor} style={S.colorInput} onChange={e => { setTextStrokeColor(e.target.value); applyTextStroke(e.target.value, textStrokeWidth); }} />
                        <input type="range" min={0} max={10} step={0.5} value={textStrokeWidth} style={S.range} onChange={e => { const w = +e.target.value; setTextStrokeWidth(w); applyTextStroke(textStrokeColor, w); }} />
                      </CollapsibleSection>

                      <CollapsibleSection title={ko ? "그림자" : "Shadow"} defaultOpen={false} C={C}>
                        <input type="color" value={shadowColor} style={S.colorInput} onChange={e => { setShadowColor(e.target.value); applyTextShadow(e.target.value, shadowBlur, shadowOffsetX, shadowOffsetY); }} />
                        <label style={S.label}>{ko ? "블러" : "Blur"}: {shadowBlur}</label>
                        <input type="range" min={0} max={20} step={1} value={shadowBlur} style={S.range} onChange={e => { const v = +e.target.value; setShadowBlur(v); applyTextShadow(shadowColor, v, shadowOffsetX, shadowOffsetY); }} />
                      </CollapsibleSection>

                      <CollapsibleSection title={ko ? "그라데이션" : "Gradient"} defaultOpen={false} C={C}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <label style={{ fontSize: 11 }}>{ko ? "적용" : "On"}</label>
                          <input type="checkbox" checked={gradientEnabled} onChange={e => { setGradientEnabled(e.target.checked); applyGradient(e.target.checked, gradColor1, gradColor2, gradDirection); }} />
                        </div>
                        {gradientEnabled && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input type="color" value={gradColor1} style={S.colorInput} onChange={e => { setGradColor1(e.target.value); applyGradient(true, e.target.value, gradColor2, gradDirection); }} />
                            <input type="color" value={gradColor2} style={S.colorInput} onChange={e => { setGradColor2(e.target.value); applyGradient(true, gradColor1, e.target.value, gradDirection); }} />
                          </div>
                        )}
                      </CollapsibleSection>
                    </>
                  )}
                </div>
              )}

              {/* 이미지 도구 */}
              {activeLeftTool === "image" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn small onClick={() => fileInputRef.current?.click()} style={{ width: "100%", justifyContent: "center" }}>{ko ? "이미지 업로드" : "Upload Image"}</Btn>
                  <Btn small onClick={() => { setShowImageLib(true); if (imgLibResults.length === 0) searchImageLib("", "pexels", 1); setActiveLeftTool(null); }} accent="#8b5cf6" style={{ width: "100%", justifyContent: "center" }}>{ko ? "이미지 검색" : "Image Search"}</Btn>
                  {selectedObj && selProps.type === "image" && (
                    <>
                      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10, marginTop: 4 }}>
                        <Btn small onClick={() => replaceFileInputRef.current?.click()} style={{ width: "100%", justifyContent: "center" }}>{ko ? "이미지 교체" : "Replace"}</Btn>
                      </div>
                      <label style={S.label}>{ko ? "투명도" : "Opacity"}: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
                      <input type="range" min={0} max={100} step={1} value={Math.round((selProps.opacity ?? 1) * 100)} style={S.range} onChange={e => setProp("opacity", +e.target.value / 100)} />
                    </>
                  )}
                </div>
              )}

              {/* 도형 도구 */}
              {activeLeftTool === "shape" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => { addShape("rect"); setActiveLeftTool(null); }}
                    style={{ padding: "16px 8px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 24 }}>▬</span>
                    <span style={{ fontSize: 11, color: "#666" }}>{ko ? "사각형" : "Rect"}</span>
                  </button>
                  <button onClick={() => { addShape("circle"); setActiveLeftTool(null); }}
                    style={{ padding: "16px 8px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 24 }}>●</span>
                    <span style={{ fontSize: 11, color: "#666" }}>{ko ? "원" : "Circle"}</span>
                  </button>
                  {selectedObj && (selProps.type === "rect" || selProps.type === "circle") && (
                    <div style={{ gridColumn: "1/3", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                      <label style={S.label}>{ko ? "채우기 색상" : "Fill"}</label>
                      <input type="color" value={hexFromAny(selProps.fill)} style={S.colorInput} onChange={e => setProp("fill", e.target.value)} />
                      <label style={S.label}>{ko ? "투명도" : "Opacity"}: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
                      <input type="range" min={0} max={100} step={1} value={Math.round((selProps.opacity ?? 1) * 100)} style={S.range} onChange={e => setProp("opacity", +e.target.value / 100)} />
                    </div>
                  )}
                </div>
              )}

              {/* 레이아웃 도구 */}
              {activeLeftTool === "layout" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {LAYOUT_OPTIONS.map(lo => (
                    <button key={lo.key} onClick={() => { changeLayout(lo.key); setActiveLeftTool(null); }}
                      style={{ padding: "10px 4px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", textAlign: "center" }}>
                      <span style={{ fontSize: 18, display: "block", lineHeight: 1 }}>{lo.icon}</span>
                      <span style={{ fontSize: 9, color: "#888", display: "block", marginTop: 3 }}>{lo.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 배경 도구 */}
              {activeLeftTool === "bg" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={S.label}>{ko ? "배경색" : "BG Color"}</label>
                  <input type="color" value={hexFromAny(canvasRef.current?.backgroundColor || "#ffffff")} style={{ ...S.colorInput, width: "100%" }} onChange={e => setBgColor(e.target.value)} />
                  <Btn small onClick={() => bgFileInputRef.current?.click()} style={{ width: "100%", justifyContent: "center" }}>{ko ? "배경 이미지 업로드" : "Upload BG Image"}</Btn>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn small onClick={quickBrighter} accent="#f6ad55" style={{ flex: 1, justifyContent: "center" }}>{ko ? "밝게" : "+"}</Btn>
                    <Btn small onClick={quickDarker} accent="#4a5568" style={{ flex: 1, justifyContent: "center" }}>{ko ? "어둡게" : "-"}</Btn>
                  </div>
                </div>
              )}

              {/* 레이어 도구 */}
              {activeLeftTool === "layer" && (
                <div>
                  {canvasObjects.length === 0 && (
                    <div style={{ fontSize: 12, color: "#999", padding: "8px 0" }}>{ko ? "오브젝트가 없습니다" : "No objects"}</div>
                  )}
                  {canvasObjects.map((item, i) => {
                    const isActive = selectedObj === item.obj;
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 2, borderRadius: 6,
                        background: isActive ? "rgba(124,106,255,0.1)" : "transparent",
                        border: isActive ? "1px solid #7c6aff" : "1px solid transparent",
                        cursor: "pointer",
                      }} onClick={() => selectLayerObj(item.obj)}>
                        <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{layerIcon(item.type)}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#333", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        <button style={S.layerBtn} onClick={e => { e.stopPropagation(); bringForward(item.obj); }}><Icon.Up /></button>
                        <button style={S.layerBtn} onClick={e => { e.stopPropagation(); sendBackward(item.obj); }}><Icon.Down /></button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 템플릿 도구 */}
              {activeLeftTool === "template" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn small onClick={() => { setShowSharedTemplateModal(true); loadSharedTemplates(); setActiveLeftTool(null); }} accent="#f59e0b" style={{ width: "100%", justifyContent: "center" }}>
                    {ko ? "공유 템플릿 불러오기" : "Load Templates"}
                  </Btn>
                  {onShareTemplate && (
                    <Btn small onClick={() => { onShareTemplate(getFirstSlidePreview()); setActiveLeftTool(null); }} accent="#7c6aff" style={{ width: "100%", justifyContent: "center" }}>
                      {ko ? "현재 디자인 공유" : "Share Design"}
                    </Btn>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── CENTER: Canvas Area ──────────────────────────────────── */}
        <div style={{ ...S.canvasArea, flex: 1, minWidth: 0 }}>

          {/* Header: 페이지 네비게이션 + 저장 버튼 */}
          <div style={S.slideNav}>
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx - 1)} disabled={currentIdx === 0}><Icon.Left /></button>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>
              {currentIdx + 1}/{totalSlides}
            </span>
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx + 1)} disabled={currentIdx >= totalSlides - 1}><Icon.Right /></button>
            <div style={{ flex: 1 }} />
            {/* 선택 오브젝트 빠른 액션 */}
            {selectedObj && (
              <>
                {isTextSelected && <>
                  <Btn small onClick={() => alignTextHorizontal("left")} style={{ padding: "4px 6px" }}><Icon.AlignLeft /></Btn>
                  <Btn small onClick={() => alignTextHorizontal("center")} style={{ padding: "4px 6px" }}><Icon.AlignCenter /></Btn>
                  <Btn small onClick={() => alignTextHorizontal("right")} style={{ padding: "4px 6px" }}><Icon.AlignRight /></Btn>
                  <Btn small onClick={() => alignTextVertical("top")} accent="#6366f1" style={{ fontSize: 10 }}>{ko ? "상" : "T"}</Btn>
                  <Btn small onClick={() => alignTextVertical("middle")} accent="#6366f1" style={{ fontSize: 10 }}>{ko ? "중" : "M"}</Btn>
                  <Btn small onClick={() => alignTextVertical("bottom")} accent="#6366f1" style={{ fontSize: 10 }}>{ko ? "하" : "B"}</Btn>
                </>}
                <Btn small onClick={deleteSelected} style={{ color: "#e53e3e" }}><Icon.Trash /></Btn>
                <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)" }} />
              </>
            )}
            <Btn small onClick={quickFontBigger} accent={C.purple} style={{ fontSize: 10 }}>A+</Btn>
            <Btn small onClick={quickFontSmaller} style={{ fontSize: 10 }}>A-</Btn>
            <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.08)" }} />
            <Btn small onClick={downloadCurrentPNG} accent="#10b981" style={{ whiteSpace: "nowrap", fontSize: 11 }}>PNG</Btn>
            <Btn small onClick={downloadAllPNGs} accent="#0ea5e9" style={{ whiteSpace: "nowrap", fontSize: 11 }}>ZIP</Btn>
            <Btn small onClick={onClose} accent="#6366f1" style={{ whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, padding: "6px 14px" }}>{ko ? "← 돌아가기" : "← Back"}</Btn>
          </div>

          {/* Canvas container - 스크롤 없이 화면에 맞춤 */}
          <div ref={containerRef} style={S.canvasContainer}>
            <div style={{
              width: width * canvasScale,
              height: height * canvasScale,
              overflow: "hidden",
              borderRadius: 8,
              boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
              margin: "0 auto",
            }}>
              <canvas ref={canvasElRef} />
            </div>
          </div>

          {/* 모바일 전용 하단 도구바 */}
          {isMobile && (
            <div style={S.toolbar}>
              <Btn small onClick={addText}>{ko ? "T" : "T"}</Btn>
              <Btn small onClick={() => fileInputRef.current?.click()}>🖼</Btn>
              <Btn small onClick={() => addShape("rect")}>▬</Btn>
              <Btn small onClick={() => addShape("circle")}>●</Btn>
              <Btn small onClick={() => bgFileInputRef.current?.click()} accent="#10b981">{ko ? "배경" : "BG"}</Btn>
              <Btn small onClick={() => setShowLayoutPicker(!showLayoutPicker)} accent="#7c6aff">{ko ? "레이아웃" : "Layout"}</Btn>
              {showLayoutPicker && (
                <div style={{ ...S.layoutPicker, bottom: "110%", left: 0, transform: "none" }}>
                  {LAYOUT_OPTIONS.map(lo => (
                    <button key={lo.key} onClick={() => { changeLayout(lo.key); setShowLayoutPicker(false); }} style={S.layoutOption}>
                      <span style={{ fontSize: 16 }}>{lo.icon}</span>
                      <span style={{ fontSize: 9, color: "#555" }}>{lo.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <Btn small onClick={deleteSelected} style={{ color: "#e53e3e" }}><Icon.Trash /></Btn>
              <Btn small onClick={undo} disabled={historyIdx <= 0}><Icon.Undo /></Btn>
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { addImageFromFile(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={bgFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { addBgImage(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={replaceFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { replaceImage(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={fontFileInputRef} type="file" accept=".ttf,.otf,.woff2" style={{ display: "none" }}
            onChange={handleCustomFont} />

          {/* 이미지 라이브러리 모달 */}
          {showImageLib && (
            <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
              onClick={(e) => { if(e.target===e.currentTarget) setShowImageLib(false); }}>
              <div style={{ background:"#fff", borderRadius:16, maxWidth:720, width:"100%", maxHeight:"85vh", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{ko ? "이미지 라이브러리" : "Image Library"}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{ko ? "검색 후 클릭하면 캔버스에 추가됩니다" : "Search and click to add to canvas"}</div>
                  </div>
                  <button onClick={() => setShowImageLib(false)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon.Close /></button>
                </div>
                <div style={{ display:"flex", gap:4, padding:"10px 20px 0", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
                  {[{ id:"pexels", label:"Pexels" }, { id:"pixabay", label:"Pixabay" }, { id:"archive", label:ko?"자료실":"Archive" }, { id:"local", label:ko?"3D 아이콘":"3D Icons" }].map(tab => (
                    <button key={tab.id} onClick={() => { setImgLibTab(tab.id); searchImageLib(imgLibQuery, tab.id, 1); }}
                      style={{ padding:"8px 16px", borderRadius:"8px 8px 0 0", border:"none", cursor:"pointer", fontSize:13, fontWeight:imgLibTab===tab.id?700:500, background:imgLibTab===tab.id?"rgba(124,106,255,0.1)":"transparent", color:imgLibTab===tab.id?"#7c6aff":"#888", borderBottom:imgLibTab===tab.id?"2px solid #7c6aff":"2px solid transparent" }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding:"12px 20px", display:"flex", gap:8 }}>
                  <input type="text" placeholder={ko?"이미지 검색어 입력...":"Search images..."} value={imgLibQuery}
                    onChange={e => setImgLibQuery(e.target.value)} onKeyDown={e => { if(e.key==="Enter") searchImageLib(imgLibQuery, imgLibTab, 1); }}
                    style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1px solid rgba(0,0,0,0.12)", fontSize:13, outline:"none" }} />
                  <button onClick={() => searchImageLib(imgLibQuery, imgLibTab, 1)}
                    style={{ padding:"10px 20px", borderRadius:10, border:"none", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{ko?"검색":"Search"}</button>
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:"0 20px 16px" }}>
                  {imgLibLoading && imgLibResults.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"#888", fontSize:13 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(99,102,241,0.3)", borderTopColor:"#7c6aff", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }} />
                      {ko?"이미지 검색 중...":"Searching..."}
                    </div>
                  ) : imgLibResults.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"#888", fontSize:13 }}>{ko?"검색어를 입력하고 검색해주세요":"Enter a keyword"}</div>
                  ) : (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
                        {imgLibResults.map((item, idx) => (
                          <div key={`${item.id}-${idx}`} style={{ borderRadius:10, overflow:"hidden", border:"1px solid rgba(0,0,0,0.08)", cursor:"pointer", background:"#fff" }}
                            onClick={() => { addImageFromUrl(item.url); setShowImageLib(false); }}>
                            <div style={{ width:"100%", paddingBottom:"100%", position:"relative", background:"#f5f5f5" }}>
                              <img src={item.preview} alt={item.title} loading="lazy" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                            </div>
                            <div style={{ padding:"6px 8px" }}>
                              <div style={{ fontSize:11, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {imgLibTab !== "local" && imgLibResults.length >= 20 && (
                        <div style={{ textAlign:"center", marginTop:16 }}>
                          <button onClick={() => searchImageLib(imgLibQuery, imgLibTab, imgLibPage + 1)} disabled={imgLibLoading}
                            style={{ padding:"10px 28px", borderRadius:10, border:"1px solid rgba(124,106,255,0.3)", background:"rgba(124,106,255,0.08)", color:"#7c6aff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            {imgLibLoading?(ko?"로딩 중...":"Loading..."):(ko?"더 보기":"Load More")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* 공유 템플릿 모달 */}
          {showSharedTemplateModal && (
            <div style={{ position:"fixed", inset:0, zIndex:10000, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
              onClick={(e) => { if(e.target===e.currentTarget) setShowSharedTemplateModal(false); }}>
              <div style={{ background:"#fff", borderRadius:16, maxWidth:600, width:"100%", maxHeight:"80vh", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{ko?"공유 템플릿 불러오기":"Load Shared Templates"}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{ko?"커뮤니티 및 내 템플릿을 선택하여 적용":"Select a template to apply"}</div>
                  </div>
                  <button onClick={() => setShowSharedTemplateModal(false)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}><Icon.Close /></button>
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:16 }}>
                  {sharedTemplatesLoading ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"#888", fontSize:13 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(99,102,241,0.3)", borderTopColor:"#7c6aff", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }} />
                      {ko?"템플릿 불러오는 중...":"Loading..."}
                    </div>
                  ) : sharedTemplates.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"#888", fontSize:13, lineHeight:1.8 }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                      {ko?<>아직 공유된 템플릿이 없습니다.<br/>카드뉴스를 만들고 공유해보세요!</>:<>No shared templates yet.</>}
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
                      {sharedTemplates.map(tpl => (
                        <div key={tpl.id} style={{ borderRadius:12, border:"1px solid rgba(0,0,0,0.08)", overflow:"hidden", background:"#fff", cursor:"pointer" }}
                          onClick={() => applySharedTemplate(tpl)}>
                          <div style={{ width:"100%", paddingBottom:"75%", position:"relative", background:"#f5f5f5" }}>
                            {tpl.preview ? <img src={tpl.preview} alt={tpl.title} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:"#ccc" }}>🎨</div>}
                            {tpl.source==="mine"&&<div style={{ position:"absolute", top:4, left:4, padding:"2px 6px", borderRadius:4, background:"rgba(99,102,241,0.85)", color:"#fff", fontSize:9, fontWeight:700 }}>{ko?"내 템플릿":"Mine"}</div>}
                          </div>
                          <div style={{ padding:"8px 10px" }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tpl.title||(ko?"제목 없음":"Untitled")}</div>
                            <button onClick={(e) => { e.stopPropagation(); applySharedTemplate(tpl); }}
                              style={{ marginTop:6, width:"100%", padding:"5px 0", borderRadius:6, border:"none", background:"rgba(99,102,241,0.15)", color:"#7c6aff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                              {ko?"적용하기":"Apply"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>

        {/* ── RIGHT: 속성 패널 (오브젝트 선택 시만, 모바일에서는 하단 시트) ── */}
        {isMobile && selectedObj && (
          <div style={{ position: "fixed", bottom: 60, left: 0, right: 0, maxHeight: "40vh", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.1)", borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,0.1)", overflowY: "auto", zIndex: 100, padding: "12px 16px" }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: "#ddd", margin: "0 auto 10px" }} />
            {isTextSelected && (
              <>
                <select style={{ ...S.select, fontSize: 12, marginBottom: 8 }} value={selProps.fontFamily}
                  onChange={e => { loadGFont(e.target.value); setProp("fontFamily", e.target.value); }}>
                  {allFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                  <input type="color" value={typeof selProps.fill === "string" ? hexFromAny(selProps.fill) : "#000000"} style={S.colorInput} onChange={e => setProp("fill", e.target.value)} />
                  <input type="range" min={10} max={200} step={1} value={selProps.fontSize} style={{ ...S.range, flex: 1 }} onChange={e => setProp("fontSize", +e.target.value)} />
                  <span style={{ fontSize: 11, color: "#888", minWidth: 30 }}>{selProps.fontSize}px</span>
                </div>
              </>
            )}
            {selProps.type === "image" && (
              <Btn small onClick={() => replaceFileInputRef.current?.click()} style={{ width: "100%", justifyContent: "center" }}>{ko ? "이미지 교체" : "Replace"}</Btn>
            )}
          </div>
        )}
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
  templateStrip: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "6px 12px",
    background: "#fff",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    overflowX: "auto",
    whiteSpace: "nowrap",
    scrollbarWidth: "thin",
  },
  templateChip: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: 3, borderRadius: "50%",
    border: "1px solid transparent",
    background: "transparent", cursor: "pointer",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  layoutPicker: {
    position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)",
    background: "#fff", borderRadius: 12, padding: 10,
    boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.08)",
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
    zIndex: 100, minWidth: 220,
  },
  layoutOption: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 2, padding: "8px 4px", borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.08)", background: "#f9f9fb",
    cursor: "pointer", transition: "all 0.15s",
    minWidth: 48,
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
  layerBtn: {
    background: "none", border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 4, padding: "2px 4px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};
