import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage, Shadow, Gradient } from "fabric";

/* ──────────────────────────────────────────────────────────────────────
   CardNewsEditor  –  Fabric.js v7 기반 카드뉴스 에디터
   ────────────────────────────────────────────────────────────────────── */

const FONTS = [
  // 한글 기본
  { label: "프리텐다드", value: "Pretendard" },
  { label: "노토산스", value: "Noto Sans KR" },
  { label: "나눔고딕", value: "Nanum Gothic" },
  { label: "나눔명조", value: "Nanum Myeongjo" },
  { label: "나눔스퀘어", value: "NanumSquare" },
  { label: "나눔바른고딕", value: "NanumBarunGothic" },
  // 특수/디자인
  { label: "배민도현", value: "BMDOHYEON" },
  { label: "던전모", value: "NeoDunggeunmo" },
  { label: "마루부리", value: "MaruBuri" },
  { label: "고운바탕", value: "GowunBatang" },
  { label: "고운도현", value: "GowunDodum" },
  { label: "이롭게 바탕", value: "EarlyFontDiary" },
  { label: "검은고딕", value: "Black Han Sans" },
  { label: "송명", value: "Song Myung" },
  { label: "하이멜로디", value: "Hi Melody" },
  { label: "도현", value: "Do Hyeon" },
  { label: "주아", value: "Jua" },
  { label: "나눔펜", value: "Nanum Pen Script" },
  { label: "나눔브러시", value: "Nanum Brush Script" },
  { label: "IBM플렉스", value: "IBM Plex Sans KR" },
  { label: "스포카한산스", value: "Spoqa Han Sans Neo" },
  // 영문
  { label: "Montserrat", value: "Montserrat" },
  { label: "Playfair", value: "Playfair Display" },
  { label: "Roboto", value: "Roboto" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
];

/* ── Google Fonts dynamic loader ───────────────────────────────────── */
const loadedFonts = new Set();
function loadGFont(family) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

const TEMPLATES = [
  { name: "다크 모던", bgColor: "#1a1a2e", textColor: "#ffffff", accentColor: "#7c6aff", fontFamily: "Pretendard" },
  { name: "라이트 미니멀", bgColor: "#ffffff", textColor: "#1a1a2e", accentColor: "#7c6aff", fontFamily: "Pretendard" },
  { name: "파스텔 핑크", bgColor: "#fff0f5", textColor: "#4a2040", accentColor: "#ec4899", fontFamily: "Nanum Gothic" },
  { name: "네이비 골드", bgColor: "#0f172a", textColor: "#fbbf24", accentColor: "#f59e0b", fontFamily: "Pretendard" },
  { name: "그린 자연", bgColor: "#ecfdf5", textColor: "#064e3b", accentColor: "#10b981", fontFamily: "Noto Sans KR" },
  { name: "코랄 웜", bgColor: "#fff7ed", textColor: "#9a3412", accentColor: "#f97316", fontFamily: "Nanum Gothic" },
  { name: "퍼플 그라데이션", bgColor: "#1e1b4b", textColor: "#e0e7ff", accentColor: "#818cf8", fontFamily: "Pretendard" },
  { name: "모노크롬", bgColor: "#f8fafc", textColor: "#0f172a", accentColor: "#64748b", fontFamily: "Pretendard" },
  { name: "레드 볼드", bgColor: "#450a0a", textColor: "#ffffff", accentColor: "#ef4444", fontFamily: "BMDOHYEON" },
  { name: "스카이 블루", bgColor: "#f0f9ff", textColor: "#0c4a6e", accentColor: "#0ea5e9", fontFamily: "Noto Sans KR" },
  { name: "블랙 골드", bgColor: "#000000", textColor: "#ffd700", accentColor: "#b8860b", fontFamily: "Pretendard" },
  { name: "소프트 라벤더", bgColor: "#f5f3ff", textColor: "#4c1d95", accentColor: "#8b5cf6", fontFamily: "Nanum Gothic" },
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
  Up: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>,
  Down: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
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

/* ── CollapsibleSection component ────────────────────────────────────── */
function CollapsibleSection({ title, defaultOpen = true, children, C }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div
        style={{ ...S.sectionLabel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span style={{ fontSize: 11, color: "#999", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>&#9660;</span>
      </div>
      {open && children}
    </div>
  );
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
  inline = false,
}) {
  const C = { ...DEFAULT_THEME, ...(themeIn || {}) };

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

      // load first slide
      if (initialSlides.length) {
        loadSlideToCanvas(fc, initialSlides[0], 0).catch(e => console.warn("slide load error", e));
      }

      setTimeout(fitCanvas, 50);

      return () => {
        try { fc.dispose(); } catch {}
        canvasRef.current = null;
      };
    } catch (e) {
      console.error("Canvas init error:", e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    refreshLayerList();
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
      } catch (e) { console.warn("bg image load failed", e); }
    }

    // title
    if (slide.title) {
      const title = new Textbox(slide.title, {
        left: width / 2,
        top: height * 0.4,
        originX: "center",
        originY: "center",
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
        left: width / 2,
        top: height * 0.6,
        originX: "center",
        originY: "center",
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

  /* ── apply design template ──────────────────────────────────────────── */
  function applyTemplate(template) {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.backgroundColor = template.bgColor;
    fc.getObjects().forEach(o => {
      if (o.type === "textbox" || o.type === "text") {
        o.set("fill", template.textColor);
        o.set("fontFamily", template.fontFamily);
      }
    });
    fc.renderAll();
    const obj = fc.getActiveObject();
    if (obj) updateSelProps(obj);
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

  /* ── layer type icon helper ─────────────────────────────────────────── */
  function layerIcon(type) {
    if (type === "textbox" || type === "text") return "T";
    if (type === "image") return "\uD83D\uDDBC";
    return "\u25FC";
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */
  const panelW = isMobile ? "100%" : "38%";
  const canvasAreaW = isMobile ? "100%" : "62%";

  const overlayStyle = inline
    ? { width: "100%", minHeight: "70vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 0 }
    : S.overlay;
  const modalStyle = inline
    ? { width: "100%", maxWidth: 1200, background: "#fff", borderRadius: 16, display: "flex", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", flexDirection: isMobile ? "column" : "row" }
    : { ...S.modal, flexDirection: isMobile ? "column" : "row" };

  const isTextSelected = selectedObj && (selProps.type === "textbox" || selProps.type === "text");

  return (
    <div style={overlayStyle} onClick={inline ? undefined : (e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={modalStyle}>

        {/* ── LEFT: Canvas Area ──────────────────────────────────────── */}
        <div style={{ ...S.canvasArea, width: canvasAreaW }}>

          {/* Header */}
          <div style={S.slideNav}>
            {/* Left: page nav */}
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx - 1)} disabled={currentIdx === 0}>
              <Icon.Left />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>
              {currentIdx + 1} / {totalSlides} 페이지 편집
            </span>
            <button style={S.navBtn} onClick={() => goToSlide(currentIdx + 1)} disabled={currentIdx >= totalSlides - 1}>
              <Icon.Right />
            </button>
            <div style={{ flex: 1 }} />
            {/* Right: actions */}
            <Btn small onClick={downloadCurrentPNG} accent="#10b981" style={{ whiteSpace: "nowrap" }}>PNG 저장</Btn>
            <Btn small onClick={downloadAllPNGs} accent="#0ea5e9" style={{ whiteSpace: "nowrap" }}>전체 저장</Btn>
            <Btn small onClick={onClose} style={{ whiteSpace: "nowrap" }}>← 돌아가기</Btn>
          </div>

          {/* Template selector strip */}
          <div style={S.templateStrip}>
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)} style={S.templateBtn} title={t.name}>
                <span style={{
                  display: "inline-block", width: 20, height: 20, borderRadius: "50%",
                  background: t.bgColor, border: "2px solid " + t.accentColor,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color: "#444" }}>{t.name}</span>
              </button>
            ))}
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
          <input ref={fontFileInputRef} type="file" accept=".ttf,.otf,.woff2" style={{ display: "none" }}
            onChange={handleCustomFont} />
        </div>

        {/* ── RIGHT: Properties Panel ────────────────────────────────── */}
        <div style={{ ...S.panel, width: panelW }}>
          <div style={S.panelTitle}>속성 패널</div>

          {/* === Text props === */}
          {isTextSelected && (
            <CollapsibleSection title="텍스트" defaultOpen={true} C={C}>
              {/* Font family */}
              <label style={S.label}>폰트</label>
              <select style={S.select} value={selProps.fontFamily}
                onChange={e => {
                  const fam = e.target.value;
                  loadGFont(fam);
                  setProp("fontFamily", fam);
                }}>
                {allFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              {/* Custom font upload button */}
              <Btn small onClick={() => fontFileInputRef.current?.click()} style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                내 폰트 업로드
              </Btn>

              {/* Font size */}
              <label style={S.label}>크기: {selProps.fontSize}px</label>
              <input type="range" min={10} max={200} step={1} value={selProps.fontSize}
                style={S.range} onChange={e => setProp("fontSize", +e.target.value)} />

              {/* Color */}
              <label style={S.label}>색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={typeof selProps.fill === "string" ? hexFromAny(selProps.fill) : "#000000"} style={S.colorInput}
                  onChange={e => { setGradientEnabled(false); setProp("fill", e.target.value); }} />
                <span style={{ fontSize: 12, color: "#888" }}>{typeof selProps.fill === "string" ? hexFromAny(selProps.fill) : "그라데이션"}</span>
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

              {/* Opacity */}
              <label style={S.label}>투명도: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
              <input type="range" min={0} max={100} step={1}
                value={Math.round((selProps.opacity ?? 1) * 100)}
                style={S.range}
                onChange={e => setProp("opacity", +e.target.value / 100)} />
            </CollapsibleSection>
          )}

          {/* === Text Stroke === */}
          {isTextSelected && (
            <CollapsibleSection title="테두리" defaultOpen={false} C={C}>
              <label style={S.label}>테두리 색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={textStrokeColor} style={S.colorInput}
                  onChange={e => {
                    setTextStrokeColor(e.target.value);
                    applyTextStroke(e.target.value, textStrokeWidth);
                  }} />
                <span style={{ fontSize: 12, color: "#888" }}>{textStrokeColor}</span>
              </div>
              <label style={S.label}>테두리 두께: {textStrokeWidth}px</label>
              <input type="range" min={0} max={10} step={0.5} value={textStrokeWidth}
                style={S.range}
                onChange={e => {
                  const w = +e.target.value;
                  setTextStrokeWidth(w);
                  applyTextStroke(textStrokeColor, w);
                }} />
            </CollapsibleSection>
          )}

          {/* === Text Shadow === */}
          {isTextSelected && (
            <CollapsibleSection title="그림자" defaultOpen={false} C={C}>
              <label style={S.label}>그림자 색상</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={shadowColor} style={S.colorInput}
                  onChange={e => {
                    setShadowColor(e.target.value);
                    applyTextShadow(e.target.value, shadowBlur, shadowOffsetX, shadowOffsetY);
                  }} />
                <span style={{ fontSize: 12, color: "#888" }}>{shadowColor}</span>
              </div>
              <label style={S.label}>블러: {shadowBlur}</label>
              <input type="range" min={0} max={20} step={1} value={shadowBlur}
                style={S.range}
                onChange={e => {
                  const v = +e.target.value;
                  setShadowBlur(v);
                  applyTextShadow(shadowColor, v, shadowOffsetX, shadowOffsetY);
                }} />
              <label style={S.label}>X 오프셋: {shadowOffsetX}</label>
              <input type="range" min={-20} max={20} step={1} value={shadowOffsetX}
                style={S.range}
                onChange={e => {
                  const v = +e.target.value;
                  setShadowOffsetX(v);
                  applyTextShadow(shadowColor, shadowBlur, v, shadowOffsetY);
                }} />
              <label style={S.label}>Y 오프셋: {shadowOffsetY}</label>
              <input type="range" min={-20} max={20} step={1} value={shadowOffsetY}
                style={S.range}
                onChange={e => {
                  const v = +e.target.value;
                  setShadowOffsetY(v);
                  applyTextShadow(shadowColor, shadowBlur, shadowOffsetX, v);
                }} />
            </CollapsibleSection>
          )}

          {/* === Text Gradient === */}
          {isTextSelected && (
            <CollapsibleSection title="그라데이션" defaultOpen={false} C={C}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>그라데이션 적용</label>
                <input type="checkbox" checked={gradientEnabled}
                  onChange={e => {
                    const enabled = e.target.checked;
                    setGradientEnabled(enabled);
                    applyGradient(enabled, gradColor1, gradColor2, gradDirection);
                  }} />
              </div>
              {gradientEnabled && (
                <>
                  <label style={S.label}>시작색</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={gradColor1} style={S.colorInput}
                      onChange={e => {
                        setGradColor1(e.target.value);
                        applyGradient(true, e.target.value, gradColor2, gradDirection);
                      }} />
                    <span style={{ fontSize: 12, color: "#888" }}>{gradColor1}</span>
                  </div>
                  <label style={S.label}>끝색</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={gradColor2} style={S.colorInput}
                      onChange={e => {
                        setGradColor2(e.target.value);
                        applyGradient(true, gradColor1, e.target.value, gradDirection);
                      }} />
                    <span style={{ fontSize: 12, color: "#888" }}>{gradColor2}</span>
                  </div>
                  <label style={S.label}>방향</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small active={gradDirection === "horizontal"}
                      onClick={() => {
                        setGradDirection("horizontal");
                        applyGradient(true, gradColor1, gradColor2, "horizontal");
                      }} accent={C.purple}>가로</Btn>
                    <Btn small active={gradDirection === "vertical"}
                      onClick={() => {
                        setGradDirection("vertical");
                        applyGradient(true, gradColor1, gradColor2, "vertical");
                      }} accent={C.purple}>세로</Btn>
                  </div>
                </>
              )}
            </CollapsibleSection>
          )}

          {/* === Image props === */}
          {selectedObj && selProps.type === "image" && (
            <CollapsibleSection title="이미지 속성" defaultOpen={true} C={C}>
              <Btn small onClick={() => replaceFileInputRef.current?.click()} style={{ marginBottom: 10 }}>
                이미지 교체
              </Btn>

              <label style={S.label}>투명도: {Math.round((selProps.opacity ?? 1) * 100)}%</label>
              <input type="range" min={0} max={100} step={1}
                value={Math.round((selProps.opacity ?? 1) * 100)}
                style={S.range}
                onChange={e => setProp("opacity", +e.target.value / 100)} />
            </CollapsibleSection>
          )}

          {/* === Shape props === */}
          {selectedObj && (selProps.type === "rect" || selProps.type === "circle") && (
            <CollapsibleSection title="도형 속성" defaultOpen={true} C={C}>
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
            </CollapsibleSection>
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

          {/* === Layer Panel === */}
          <CollapsibleSection title="레이어" defaultOpen={true} C={C}>
            {canvasObjects.length === 0 && (
              <div style={{ fontSize: 12, color: "#999", padding: "4px 0" }}>오브젝트가 없습니다</div>
            )}
            {canvasObjects.map((item, i) => {
              const isActive = selectedObj === item.obj;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 8px", marginBottom: 2,
                  borderRadius: 6,
                  background: isActive ? C.bg2 : "transparent",
                  border: isActive ? `1px solid ${C.purple}` : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
                  onClick={() => selectLayerObj(item.obj)}
                >
                  <span style={{ fontSize: 14, width: 22, textAlign: "center", flexShrink: 0 }}>{layerIcon(item.type)}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                  <button style={S.layerBtn} title="앞으로" onClick={e => { e.stopPropagation(); bringForward(item.obj); }}>
                    <Icon.Up />
                  </button>
                  <button style={S.layerBtn} title="뒤로" onClick={e => { e.stopPropagation(); sendBackward(item.obj); }}>
                    <Icon.Down />
                  </button>
                </div>
              );
            })}
          </CollapsibleSection>

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
  templateStrip: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 16px",
    background: "#fff",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    overflowX: "auto",
    whiteSpace: "nowrap",
    scrollbarWidth: "thin",
  },
  templateBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 10px", borderRadius: 20,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#f9f9fb", cursor: "pointer",
    transition: "all 0.15s",
    flexShrink: 0,
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
