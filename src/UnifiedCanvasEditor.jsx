import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage } from "fabric";

/* ══════════════════════════════════════════════════════════════
   UnifiedCanvasEditor — 완전 독립 캔버스 에디터
   외부 의존성 없음 (storage, i18n, CardNewsEditorUtils 등 미사용)
   ══════════════════════════════════════════════════════════════ */

const FONT_LIST = [
  "Pretendard", "Noto Sans KR", "Nanum Gothic", "Nanum Myeongjo",
  "Black Han Sans", "Do Hyeon", "Jua", "Gothic A1",
  "IBM Plex Sans KR", "Gmarket Sans", "Spoqa Han Sans Neo",
  "Arial", "Georgia", "Impact", "Courier New",
];

const BG_COLORS = ["#1c1c1e","#ffffff","#0f172a","#fef3c7","#052e16","#831843","#f5ebe0","#e0f7fa","#1a1a2e","#f8fafc"];
const TEXT_COLORS = ["#ffffff","#000000","#333333","#7c6aff","#ef4444","#f59e0b","#10b981","#ec4899"];

function loadFont(name) {
  if (!name || name === "sans-serif") return;
  const id = "gf_" + name.replace(/\s/g, "_");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

export default function UnifiedCanvasEditor({
  slides: initialSlides = [],
  width = 1080,
  height = 1080,
  mode = "cardnews",
  onSave,
  onClose,
  onShareTemplate,
  inline = false,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const slidesRef = useRef([]);
  const [idx, setIdx] = useState(0);
  const [total] = useState(Math.max(initialSlides.length, 1));
  const [sel, setSel] = useState(null);
  const [selProps, setSelProps] = useState({});
  const [ready, setReady] = useState(false);

  /* ── 캔버스 초기화 ── */
  useEffect(() => {
    const box = containerRef.current;
    if (!box || canvasRef.current) return;

    const el = document.createElement("canvas");
    el.width = width;
    el.height = height;
    box.appendChild(el);

    try {
      const fc = new Canvas(el, {
        width, height,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      canvasRef.current = fc;

      fc.on("selection:created", (e) => onSelect(e.selected?.[0]));
      fc.on("selection:updated", (e) => onSelect(e.selected?.[0]));
      fc.on("selection:cleared", () => { setSel(null); setSelProps({}); });

      // 초기 슬라이드
      slidesRef.current = new Array(total).fill(null);
      if (initialSlides[0]) {
        applySlide(fc, initialSlides[0]);
      }

      // 컨테이너에 맞추기
      requestAnimationFrame(() => fitToContainer(fc, box));
      setReady(true);
    } catch (err) {
      console.error("Canvas init error:", err);
    }

    return () => {
      try { canvasRef.current?.dispose(); } catch {}
      canvasRef.current = null;
      if (box) box.innerHTML = "";
    };
  }, []);

  /* ── 슬라이드 적용 ── */
  const applySlide = (fc, slide) => {
    if (!fc || !slide) return;
    fc.clear();
    fc.backgroundColor = slide.bgColor || "#1c1c1e";

    if (slide.title) {
      const t = new Textbox(slide.title, {
        left: width * 0.08, top: height * 0.12, width: width * 0.84,
        fontSize: slide.fontSize || 42, fontWeight: "bold",
        fill: slide.textColor || "#ffffff",
        fontFamily: slide.fontFamily || "Pretendard",
      });
      fc.add(t);
    }

    if (slide.body) {
      const b = new Textbox(slide.body, {
        left: width * 0.08, top: height * 0.42, width: width * 0.84,
        fontSize: Math.round((slide.fontSize || 42) * 0.38),
        fill: slide.textColor || "#ffffff",
        fontFamily: slide.fontFamily || "Pretendard",
        opacity: 0.85,
      });
      fc.add(b);
    }

    if (slide.image) {
      FabricImage.fromURL(slide.image, { crossOrigin: "anonymous" }).then(img => {
        if (!img || !canvasRef.current) return;
        const s = Math.max(width / img.width, height / img.height);
        img.set({ scaleX: s, scaleY: s, left: width / 2, top: height / 2, originX: "center", originY: "center", selectable: false, evented: false });
        fc.insertAt(0, img);
        fc.renderAll();
      }).catch(() => {});
    }

    fc.renderAll();
  };

  /* ── 컨테이너 맞추기 ── */
  const fitToContainer = (fc, box) => {
    if (!fc || !box) return;
    const cw = box.clientWidth - 20;
    const ch = box.clientHeight - 20;
    if (cw <= 0 || ch <= 0) return;
    const s = Math.min(cw / width, ch / height, 1);
    const wrapper = box.querySelector(".canvas-container") || box.firstChild;
    if (wrapper) {
      wrapper.style.transform = `scale(${s})`;
      wrapper.style.transformOrigin = "center center";
    }
  };

  useEffect(() => {
    const fn = () => {
      const fc = canvasRef.current;
      const box = containerRef.current;
      if (fc && box) fitToContainer(fc, box);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ── 선택 ── */
  const onSelect = (obj) => {
    if (!obj) return;
    setSel(obj);
    setSelProps({
      fontFamily: obj.fontFamily || "Pretendard",
      fontSize: obj.fontSize || 24,
      fill: typeof obj.fill === "string" ? obj.fill : "#000000",
      fontWeight: obj.fontWeight || "normal",
      fontStyle: obj.fontStyle || "normal",
      textAlign: obj.textAlign || "left",
    });
  };

  const setProp = (key, val) => {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    obj.set(key, val);
    fc.renderAll();
    onSelect(obj);
  };

  /* ── 슬라이드 전환 ── */
  const saveSlide = () => {
    const fc = canvasRef.current;
    if (fc) slidesRef.current[idx] = fc.toJSON();
  };

  const goTo = (i) => {
    if (i < 0 || i >= total) return;
    saveSlide();
    setIdx(i);
    const fc = canvasRef.current;
    if (!fc) return;
    const saved = slidesRef.current[i];
    if (saved) {
      fc.loadFromJSON(saved).then(() => fc.renderAll());
    } else if (initialSlides[i]) {
      applySlide(fc, initialSlides[i]);
    }
  };

  /* ── 오브젝트 추가 ── */
  const addText = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    try {
      const t = new Textbox("텍스트 입력", {
        left: width * 0.15, top: height * 0.4, width: width * 0.7,
        fontSize: 32, fill: "#333333", fontFamily: "Pretendard",
      });
      fc.add(t);
      fc.setActiveObject(t);
      fc.renderAll();
    } catch (err) { console.error("addText error:", err); }
  };

  const addRect = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    try {
      const r = new Rect({ width: 150, height: 100, fill: "#7c6aff33", left: width / 2 - 75, top: height / 2 - 50, rx: 8, ry: 8 });
      fc.add(r);
      fc.setActiveObject(r);
      fc.renderAll();
    } catch (err) { console.error("addRect error:", err); }
  };

  const addCircle = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    try {
      const c = new Circle({ radius: 60, fill: "#ec489933", left: width / 2 - 60, top: height / 2 - 60 });
      fc.add(c);
      fc.setActiveObject(c);
      fc.renderAll();
    } catch (err) { console.error("addCircle error:", err); }
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fc = canvasRef.current;
        if (!fc) return;
        FabricImage.fromURL(ev.target.result).then(img => {
          if (!img) return;
          const s = (width * 0.5) / img.width;
          img.set({ scaleX: s, scaleY: s, left: width * 0.25, top: height * 0.25 });
          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();
        }).catch(() => {});
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const deleteSelected = () => {
    const fc = canvasRef.current;
    const obj = fc?.getActiveObject();
    if (obj) { fc.remove(obj); fc.renderAll(); setSel(null); }
  };

  const setBg = (color) => {
    const fc = canvasRef.current;
    if (!fc) return;
    fc.backgroundColor = color;
    fc.renderAll();
  };

  /* ── 내보내기 ── */
  const downloadPng = () => {
    const fc = canvasRef.current;
    if (!fc) return;
    const url = fc.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `slide_${idx + 1}.png`;
    a.click();
  };

  /* ── 키보드 ── */
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  /* ── 버튼 스타일 ── */
  const btnS = { background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };

  /* ═══════ RENDER ═══════ */
  return (
    <div style={inline ? { width: "100%", flex: 1, display: "flex", overflow: "hidden" } : { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div style={inline ? { width: "100%", height: "100%", display: "flex", background: "#fff" } : { width: "100%", maxWidth: 1400, height: "95vh", background: "#fff", borderRadius: 16, display: "flex", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>

        {/* 캔버스 영역 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* 상단 바 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fff", borderBottom: "1px solid #eee" }}>
            {total > 1 && (
              <>
                <button onClick={() => goTo(idx - 1)} disabled={idx === 0} style={btnS}>◀</button>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1} / {total}</span>
                <button onClick={() => goTo(idx + 1)} disabled={idx >= total - 1} style={btnS}>▶</button>
              </>
            )}
            <div style={{ flex: 1 }} />
            {onClose && <button onClick={onClose} style={{ ...btnS, fontSize: 12 }}>← 돌아가기</button>}
          </div>

          {/* 캔버스 */}
          <div ref={containerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#e5e5ea", overflow: "hidden", padding: 10 }} />

          {/* 툴바 */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", borderTop: "1px solid #eee" }}>
            <button onClick={addText} style={btnS} title="텍스트">T</button>
            <button onClick={addRect} style={btnS} title="사각형">□</button>
            <button onClick={addCircle} style={btnS} title="원">○</button>
            <button onClick={addImage} style={btnS} title="이미지">🖼</button>
            {sel && <button onClick={deleteSelected} style={{ ...btnS, color: "#ef4444", borderColor: "#fca5a5" }}>삭제</button>}
            <div style={{ flex: 1 }} />
            <button onClick={downloadPng} style={{ background: "#7c6aff", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>PNG 저장</button>
          </div>
        </div>

        {/* 속성 패널 */}
        <div style={{ width: 260, background: "#fafafa", borderLeft: "1px solid #eee", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, padding: "14px 16px", borderBottom: "1px solid #eee" }}>속성</div>

          {/* 배경 */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>배경색</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => setBg(c)} style={{ width: 26, height: 26, borderRadius: 5, background: c, border: "2px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: 0 }} />
              ))}
              <input type="color" onChange={e => setBg(e.target.value)} style={{ width: 26, height: 26, padding: 0, border: "2px solid rgba(0,0,0,0.1)", borderRadius: 5, cursor: "pointer" }} />
            </div>
          </div>

          {/* 텍스트 속성 */}
          {sel && sel.type === "textbox" && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>텍스트</div>

              <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>폰트</div>
              <select value={selProps.fontFamily} onChange={e => { loadFont(e.target.value); setProp("fontFamily", e.target.value); }}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12, marginBottom: 8 }}>
                {FONT_LIST.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>크기: {selProps.fontSize}px</div>
              <input type="range" min={10} max={120} value={selProps.fontSize} onChange={e => setProp("fontSize", +e.target.value)}
                style={{ width: "100%", accentColor: "#7c6aff", marginBottom: 8 }} />

              <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>색상</div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
                <input type="color" value={selProps.fill} onChange={e => setProp("fill", e.target.value)}
                  style={{ width: 30, height: 30, padding: 0, border: "2px solid rgba(0,0,0,0.1)", borderRadius: 6, cursor: "pointer" }} />
                {TEXT_COLORS.map(c => (
                  <button key={c} onClick={() => setProp("fill", c)} style={{ width: 22, height: 22, borderRadius: 4, background: c, border: "1.5px solid rgba(0,0,0,0.15)", cursor: "pointer", padding: 0 }} />
                ))}
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setProp("fontWeight", selProps.fontWeight === "bold" ? "normal" : "bold")}
                  style={{ ...btnS, fontWeight: 900, fontSize: 13, background: selProps.fontWeight === "bold" ? "#7c6aff15" : "transparent", borderColor: selProps.fontWeight === "bold" ? "#7c6aff" : "rgba(0,0,0,0.12)" }}>B</button>
                <button onClick={() => setProp("fontStyle", selProps.fontStyle === "italic" ? "normal" : "italic")}
                  style={{ ...btnS, fontStyle: "italic", fontSize: 13, background: selProps.fontStyle === "italic" ? "#7c6aff15" : "transparent", borderColor: selProps.fontStyle === "italic" ? "#7c6aff" : "rgba(0,0,0,0.12)" }}>I</button>
                <div style={{ width: 1, height: 24, background: "#eee", margin: "0 2px" }} />
                {["left","center","right"].map(a => (
                  <button key={a} onClick={() => setProp("textAlign", a)}
                    style={{ ...btnS, fontSize: 11, background: selProps.textAlign === a ? "#7c6aff15" : "transparent", borderColor: selProps.textAlign === a ? "#7c6aff" : "rgba(0,0,0,0.12)" }}>
                    {a === "left" ? "≡←" : a === "center" ? "≡" : "≡→"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 선택 삭제 */}
          {sel && (
            <div style={{ padding: "12px 16px" }}>
              <button onClick={deleteSelected} style={{ width: "100%", padding: "10px", border: "none", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>선택 삭제</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
