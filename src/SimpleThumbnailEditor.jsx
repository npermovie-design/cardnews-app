import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage } from "fabric";

/* ──────────────────────────────────────────────────────────────────────
   SimpleThumbnailEditor – 썸네일 생성 후 fabric.js 라이브 편집
   ────────────────────────────────────────────────────────────────────── */

const FONTS = [
  { label:"노토 산스", value:"Noto Sans KR" },
  { label:"나눔 고딕", value:"Nanum Gothic" },
  { label:"나눔 명조", value:"Nanum Myeongjo" },
  { label:"검은 한산스", value:"Black Han Sans" },
  { label:"도현체", value:"Do Hyeon" },
  { label:"주아체", value:"Jua" },
  { label:"나눔 손글씨", value:"Nanum Pen Script" },
  { label:"고운 돋움", value:"Gowun Dodum" },
  { label:"고운 바탕", value:"Gowun Batang" },
  { label:"Montserrat", value:"Montserrat" },
  { label:"Playfair", value:"Playfair Display" },
  { label:"Bebas Neue", value:"Bebas Neue" },
];

const COLORS = [
  "#ffffff","#000000","#ff0000","#ffdd00","#00ff00",
  "#00bfff","#ff69b4","#ff6600","#8b5cf6","#10b981",
];

const _loaded = new Set();
function loadFont(f) {
  if (!f || _loaded.has(f)) return;
  _loaded.add(f);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

export default function SimpleThumbnailEditor({ imageDataUrl, width, height, isDark, onClose, onSave }) {
  const D = isDark;
  const containerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fcRef = useRef(null);       // fabric Canvas instance
  const [selColor, setSelColor] = useState("#ffffff");
  const [selFont, setSelFont] = useState("Noto Sans KR");
  const [ready, setReady] = useState(false);

  const bg   = D ? "#1a1a2e" : "#f8f8fc";
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted= D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr  = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const barBg= D ? "rgba(0,0,0,0.5)" : "#fff";
  const btnBg= D ? "rgba(255,255,255,0.08)" : "#f0f0f0";

  /* ── fabric Canvas 초기화 ── */
  useEffect(() => {
    if (!canvasElRef.current || fcRef.current) return;
    const fc = new Canvas(canvasElRef.current, {
      width: width || 1280,
      height: height || 720,
      backgroundColor: "#000",
    });
    fcRef.current = fc;

    // 배경 이미지 로드
    if (imageDataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        FabricImage.fromObject({ type: "image", src: imageDataUrl }).then(fImg => {
          fImg.scaleToWidth(fc.width);
          fImg.scaleToHeight(fc.height);
          fImg.set({ selectable: false, evented: false });
          fc.backgroundImage = fImg;
          fc.renderAll();
          setReady(true);
        }).catch(() => {
          // fallback: 직접 Element에서
          const fImg = new FabricImage(img);
          fImg.scaleToWidth(fc.width);
          fImg.scaleToHeight(fc.height);
          fImg.set({ selectable: false, evented: false });
          fc.backgroundImage = fImg;
          fc.renderAll();
          setReady(true);
        });
      };
      img.src = imageDataUrl;
    } else {
      setReady(true);
    }

    return () => { fc.dispose(); fcRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 도구 함수들 ── */
  const addTextbox = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    loadFont(selFont);
    const tb = new Textbox("텍스트 입력", {
      left: fc.width * 0.2,
      top: fc.height * 0.4,
      width: fc.width * 0.6,
      fontSize: 48,
      fontFamily: selFont,
      fill: selColor,
      fontWeight: "bold",
      textAlign: "center",
      editable: true,
      shadow: "2px 2px 6px rgba(0,0,0,0.6)",
    });
    fc.add(tb);
    fc.setActiveObject(tb);
    fc.renderAll();
  }, [selColor, selFont]);

  const addRect = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    const r = new Rect({
      left: fc.width * 0.3, top: fc.height * 0.3,
      width: 200, height: 120,
      fill: selColor,
      opacity: 0.6,
      rx: 10, ry: 10,
    });
    fc.add(r);
    fc.setActiveObject(r);
    fc.renderAll();
  }, [selColor]);

  const addCircle = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    const c = new Circle({
      left: fc.width * 0.4, top: fc.height * 0.35,
      radius: 80,
      fill: selColor,
      opacity: 0.6,
    });
    fc.add(c);
    fc.setActiveObject(c);
    fc.renderAll();
  }, [selColor]);

  const deleteSelected = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    const objs = fc.getActiveObjects();
    objs.forEach(o => fc.remove(o));
    fc.discardActiveObject();
    fc.renderAll();
  }, []);

  const changeFontSize = useCallback((delta) => {
    const fc = fcRef.current; if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set("fontSize", Math.max(10, (obj.fontSize || 32) + delta));
      fc.renderAll();
    }
  }, []);

  const changeSelectedColor = useCallback((color) => {
    const fc = fcRef.current; if (!fc) return;
    setSelColor(color);
    const obj = fc.getActiveObject();
    if (obj) {
      obj.set("fill", color);
      fc.renderAll();
    }
  }, []);

  const changeBrightness = useCallback((delta) => {
    const fc = fcRef.current; if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj) {
      const cur = obj.opacity ?? 1;
      obj.set("opacity", Math.min(1, Math.max(0.1, cur + delta)));
      fc.renderAll();
    }
  }, []);

  const changeFont = useCallback((font) => {
    setSelFont(font);
    loadFont(font);
    const fc = fcRef.current; if (!fc) return;
    const obj = fc.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set("fontFamily", font);
      fc.renderAll();
    }
  }, []);

  const addImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imgEl = new Image();
        imgEl.crossOrigin = "anonymous";
        imgEl.onload = () => {
          const fc = fcRef.current; if (!fc) return;
          const fImg = new FabricImage(imgEl);
          const maxW = fc.width * 0.5;
          if (fImg.width > maxW) fImg.scaleToWidth(maxW);
          fImg.set({ left: 50, top: 50 });
          fc.add(fImg);
          fc.setActiveObject(fImg);
          fc.renderAll();
        };
        imgEl.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  /* ── 다운로드 ── */
  const downloadPng = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `thumbnail_edited_${Date.now()}.png`;
    a.click();
  }, []);

  /* ── 저장 (부모에 dataUrl 전달) ── */
  const handleSave = useCallback(() => {
    const fc = fcRef.current; if (!fc) return;
    const dataUrl = fc.toDataURL({ format: "png", multiplier: 1 });
    if (onSave) onSave(dataUrl);
    if (onClose) onClose();
  }, [onSave, onClose]);

  /* ── 캔버스 표시 스케일 ── */
  const displayW = Math.min(800, typeof window !== "undefined" ? window.innerWidth - 60 : 800);
  const scale = displayW / (width || 1280);

  const toolBtn = (label, onClick, active) => (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 8, border: `1px solid ${active ? "#7c6aff" : bdr}`,
      background: active ? "rgba(99,102,241,0.18)" : btnBg,
      color: active ? "#a5b4fc" : text, fontSize: 12, fontWeight: 700,
      cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* ── 상단 바 ── */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px", alignItems: "center",
        background: barBg, borderRadius: "12px 12px 0 0", width: displayW,
        borderBottom: `1px solid ${bdr}`, boxSizing: "border-box",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: text, flex: 1 }}>썸네일 편집</span>
        {toolBtn("저장", handleSave)}
        {toolBtn("PNG 다운로드", downloadPng)}
        <button onClick={onClose} style={{
          padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`,
          background: "rgba(239,68,68,0.12)", color: "#f87171",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>닫기</button>
      </div>

      {/* ── 캔버스 영역 ── */}
      <div ref={containerRef} style={{
        background: D ? "#111" : "#e5e5e5",
        overflow: "hidden",
        width: displayW,
        height: (height || 720) * scale,
      }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: width || 1280,
          height: height || 720,
        }}>
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* ── 하단 도구 바 ── */}
      <div style={{
        display: "flex", gap: 6, padding: "10px 16px", alignItems: "center",
        background: barBg, borderRadius: "0 0 12px 12px", width: displayW,
        borderTop: `1px solid ${bdr}`, boxSizing: "border-box",
        flexWrap: "wrap",
      }}>
        {toolBtn("+ 텍스트", addTextbox)}
        {toolBtn("+ 이미지", addImage)}
        {toolBtn("\u25A0 사각형", addRect)}
        {toolBtn("\u25CF 원", addCircle)}
        {toolBtn("삭제", deleteSelected)}
        <span style={{ width: 1, height: 24, background: bdr }} />
        {toolBtn("A+", () => changeFontSize(4))}
        {toolBtn("A-", () => changeFontSize(-4))}
        {toolBtn("밝게", () => changeBrightness(0.1))}
        {toolBtn("어둡게", () => changeBrightness(-0.1))}
        <span style={{ width: 1, height: 24, background: bdr }} />

        {/* 색상 선택 */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => changeSelectedColor(c)} style={{
              width: 20, height: 20, borderRadius: 5, background: c, cursor: "pointer",
              border: selColor === c ? "2px solid #7c6aff" : `1px solid ${bdr}`,
            }} />
          ))}
          <input type="color" value={selColor} onChange={e => changeSelectedColor(e.target.value)}
            style={{ width: 20, height: 20, border: "none", cursor: "pointer" }} />
        </div>

        <span style={{ width: 1, height: 24, background: bdr }} />

        {/* 폰트 선택 */}
        <select value={selFont} onChange={e => changeFont(e.target.value)}
          style={{
            padding: "5px 8px", borderRadius: 7, border: `1px solid ${bdr}`,
            background: btnBg, color: text, fontSize: 11, outline: "none",
          }}>
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
