import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, Triangle, Polygon, FabricImage, Line, Gradient } from "fabric";
import { callAI } from "./aiClient";
import { supabase } from "./storage";

/* ══════════════════════════════════════════════════════════════
   UnifiedCanvasEditor v2 — 통합 캔버스 에디터
   카드뉴스/상세페이지/썸네일/PPT 공통
   완전 독립 — 외부 스타일/유틸 의존 없음
   ══════════════════════════════════════════════════════════════ */

const FONTS = [
  "Pretendard","Noto Sans KR","Nanum Gothic","Nanum Myeongjo","Black Han Sans",
  "Do Hyeon","Jua","Gothic A1","IBM Plex Sans KR","Gmarket Sans",
  "Spoqa Han Sans Neo","BMDOHYEON","Dongle","Gamja Flower","Hi Melody",
  "Arial","Georgia","Impact","Courier New","Times New Roman",
];

function loadFont(n) {
  if (!n || n==="sans-serif") return;
  const id="gf_"+n.replace(/\s/g,"_");
  if (document.getElementById(id)) return;
  const l=document.createElement("link"); l.id=id; l.rel="stylesheet";
  l.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(n)}:wght@400;700;900&display=swap`;
  document.head.appendChild(l);
  // 폰트 로드 대기 후 캔버스 다시 렌더
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.querySelectorAll("canvas").forEach(c => {
        try { c.__fabric?.renderAll?.(); } catch {}
      });
    });
  }
}

export default function UnifiedCanvasEditor({
  slides: initSlides = [],
  width = 1080, height = 1080,
  mode = "cardnews",
  onSave, onClose, onShareTemplate, inline = false,
}) {
  const boxRef = useRef(null);
  const fcRef = useRef(null);
  const slidesRef = useRef([]);
  const [idx, setIdx] = useState(0);
  const total = Math.max(initSlides.length, 1);
  const [sel, setSel] = useState(null);
  const [props, setProps] = useState({});
  const [panel, setPanel] = useState("props"); // props | images | shapes
  const [imgQuery, setImgQuery] = useState("");
  const [imgResults, setImgResults] = useState([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgSource, setImgSource] = useState("pexels"); // pexels | pixabay | unsplash | upload
  const [layerTick, setLayerTick] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  // AI 캡션 상태
  const [captionOpen, setCaptionOpen] = useState(true);
  const [captionText, setCaptionText] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionTone, setCaptionTone] = useState("professional");
  const [captionEmoji, setCaptionEmoji] = useState(true);
  const captionGenerated = useRef(false);

  // 에디터 진입 시 캡션 자동 생성
  useEffect(() => {
    if (captionGenerated.current || !initSlides?.length) return;
    captionGenerated.current = true;
    (async () => {
      setCaptionLoading(true);
      try {
        const slideTexts = initSlides.map((s,i) =>
          `[${i+1}] ${s.title||""} ${s.subtitle||""} ${s.body||""} ${s.highlight||""}`
        ).join("\n");
        const prompt = `인스타그램 카드뉴스 캡션을 작성해주세요.\n\n카드뉴스 내용:\n${slideTexts}\n\n조건:\n- 전문적이고 신뢰감 있는 말투\n- 이모티콘을 적절히 활용해주세요.\n- 해시태그 5~8개 포함\n- 캡션 길이: 3~5문장\n- 줄바꿈으로 가독성 높게\n- 마지막에 행동 유도(CTA) 한 줄 포함\n\n캡션만 출력하세요.`;
        const result = await callAI("claude-haiku-4-5",[{role:"user",content:prompt}],800);
        setCaptionText(result?.trim()||"");
      } catch(e) { setCaptionText("캡션 자동 생성 실패: "+(e.message||e)); }
      setCaptionLoading(false);
    })();
  }, []);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showExitWarn, setShowExitWarn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Undo/Redo
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const pushHistory = () => {
    const fc = fcRef.current; if (!fc || isUndoRedoRef.current) return;
    const json = JSON.stringify(fc.toJSON());
    const h = historyRef.current;
    // 현재 위치 이후 기록 제거
    historyRef.current = h.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  };
  const undo = () => {
    const fc = fcRef.current; if (!fc) return;
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    isUndoRedoRef.current = true;
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(() => { fc.renderAll(); isUndoRedoRef.current = false; });
  };
  const redo = () => {
    const fc = fcRef.current; if (!fc) return;
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    isUndoRedoRef.current = true;
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(() => { fc.renderAll(); isUndoRedoRef.current = false; });
  };

  /* ── 캔버스 초기화 ── */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || fcRef.current) return;
    const el = document.createElement("canvas");
    el.width = width; el.height = height;
    box.appendChild(el);
    try {
      const fc = new Canvas(el, { width, height, backgroundColor:"#ffffff", preserveObjectStacking:true });
      fcRef.current = fc;
      fc.on("selection:created", e => syncSel(e.selected?.[0]));
      fc.on("selection:updated", e => syncSel(e.selected?.[0]));
      fc.on("selection:cleared", () => { setSel(null); setProps({}); });

      // ── 스냅 가이드라인 ──
      const SNAP = 8;
      let guides = [];
      const clearGuides = () => { guides.forEach(g => fc.remove(g)); guides = []; };
      const addGuide = (x1,y1,x2,y2) => {
        const g = new Line([x1,y1,x2,y2], { stroke:"#00aaff", strokeWidth:1, strokeDashArray:[4,4], selectable:false, evented:false, name:"guide" });
        fc.add(g); guides.push(g);
      };
      fc.on("object:moving", (e) => {
        clearGuides();
        const obj = e.target;
        if (!obj || obj.name === "bg" || obj.name === "guide") return;
        // 바운딩박스 기준 좌표 계산
        const bound = obj.getBoundingRect();
        const bCx = bound.left + bound.width / 2;
        const bCy = bound.top + bound.height / 2;
        const bR = bound.left + bound.width;
        const bB = bound.top + bound.height;
        // 가로 중앙
        if (Math.abs(bCx - width/2) < SNAP) {
          obj.set("left", obj.left + (width/2 - bCx));
          addGuide(width/2, 0, width/2, height);
        }
        // 세로 중앙
        if (Math.abs(bCy - height/2) < SNAP) {
          obj.set("top", obj.top + (height/2 - bCy));
          addGuide(0, height/2, width, height/2);
        }
        // 좌우 여백 (8%)
        const margin = width * 0.08;
        if (Math.abs(bound.left - margin) < SNAP) {
          obj.set("left", obj.left + (margin - bound.left));
          addGuide(margin, 0, margin, height);
        }
        if (Math.abs(bR - (width-margin)) < SNAP) {
          obj.set("left", obj.left + (width - margin - bR));
          addGuide(width-margin, 0, width-margin, height);
        }
        // 상하 여백
        if (Math.abs(bound.top - margin) < SNAP) {
          obj.set("top", obj.top + (margin - bound.top));
          addGuide(0, margin, width, margin);
        }
        if (Math.abs(bB - (height-margin)) < SNAP) {
          obj.set("top", obj.top + (height - margin - bB));
          addGuide(0, height-margin, width, height-margin);
        }
        fc.renderAll();
      });
      fc.on("object:modified", () => { clearGuides(); pushHistory(); });
      fc.on("object:added", () => pushHistory());
      fc.on("object:removed", () => pushHistory());

      // 텍스트 더블클릭 시 hidden textarea 강제 숨김
      fc.on("text:editing:entered", () => {
        requestAnimationFrame(() => {
          document.querySelectorAll("textarea").forEach(ta => {
            if (ta.dataset.fabricHiddentextarea !== undefined || (!ta.id && !ta.className && ta.parentElement?.querySelector("canvas"))) {
              ta.style.position = "fixed";
              ta.style.top = "-9999px";
              ta.style.left = "-9999px";
              ta.style.opacity = "0";
            }
          });
        });
      });

      slidesRef.current = new Array(total).fill(null);
      if (initSlides[0]) buildSlide(fc, initSlides[0], 0);
      // 여러 타이밍에 fit 호출 (레이아웃 안정화)
      requestAnimationFrame(() => { fit(fc, box); pushHistory(); });
      setTimeout(() => fit(fc, box), 300);
      setTimeout(() => fit(fc, box), 1000);
    } catch(e) { console.error("Canvas init:", e); }
    return () => { try { fcRef.current?.dispose(); } catch{} fcRef.current=null; if(box) box.innerHTML=""; };
  }, []);

  /* ── 슬라이드 빌드 ── */
  const buildSlide = (fc, s, i) => {
    if (!fc||!s) return;
    fc.clear();
    fc.backgroundColor = s.bgColor || "#ffffff";

    // 배경 이미지
    if (s.image) {
      FabricImage.fromURL(s.image, {crossOrigin:"anonymous"}).then(img => {
        if(!img||!fcRef.current) return;
        // 이미지 실제 크기 확인 (fabric v6 호환)
        const imgW = img.width || img.getScaledWidth?.() || img._element?.naturalWidth || 800;
        const imgH = img.height || img.getScaledHeight?.() || img._element?.naturalHeight || 800;
        // 전체 커버 (1장으로 꽉 채우기)
        const sc = Math.max(width/imgW, height/imgH);
        img.set({
          scaleX:sc, scaleY:sc,
          left:width/2, top:height/2,
          originX:"center", originY:"center",
          selectable:false, evented:false, name:"bg",
          opacity:s.bgOpacity??1,
        });
        // 기존 bg 제거 후 삽입
        fc.getObjects().filter(o=>o.name==="bg").forEach(o=>fc.remove(o));
        fc.insertAt(0,img);
        // 기본 그라데이션 오버레이 (기존 없으면 추가)
        if(!fc.getObjects().some(o=>o.name==="gradient")){
          const gradOv=new Rect({
            left:0, top:0, width, height,
            originX:"left", originY:"top",
            selectable:true, evented:true, name:"gradient",
          });
          gradOv.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:0.3,color:"rgba(0,0,0,0.15)"},{offset:0.55,color:"rgba(0,0,0,0.6)"},{offset:1,color:"rgba(0,0,0,0.85)"}]}));
          fc.insertAt(1,gradOv);
        }
        fc.renderAll();
      }).catch(()=>{});
    }

    // ── 포인트 색 텍스트 헬퍼 ──
    const pointColor = s.pointColor || "#e4ff1a";
    const addColoredText = (raw, opts) => {
      const clean = (raw||"").replace(/\[P\]/g,"").replace(/\[\/P\]/g,"");
      const tb = new Textbox(clean, opts);
      fc.add(tb);
      // [P]...[/P] 위치 계산 → styles 객체 직접 구성
      const ranges = [];
      let searchStr = raw || "";
      let cleanOffset = 0;
      const tagOpen = "[P]", tagClose = "[/P]";
      while(true) {
        const openIdx = searchStr.indexOf(tagOpen);
        if(openIdx === -1) break;
        const closeIdx = searchStr.indexOf(tagClose, openIdx);
        if(closeIdx === -1) break;
        const beforeOpen = searchStr.slice(0, openIdx).replace(/\[P\]/g,"").replace(/\[\/P\]/g,"");
        const word = searchStr.slice(openIdx + tagOpen.length, closeIdx);
        const startInClean = cleanOffset + beforeOpen.length;
        ranges.push({ start: startInClean, len: word.length });
        cleanOffset = startInClean + word.length;
        searchStr = searchStr.slice(closeIdx + tagClose.length);
      }
      // styles 객체 구성 (Fabric v6: styles[lineIndex][charIndex])
      if(ranges.length > 0) {
        const lines = clean.split("\n");
        const styles = {};
        let globalIdx = 0;
        lines.forEach((line, li) => {
          styles[li] = styles[li] || {};
          for(let ci = 0; ci < line.length; ci++) {
            for(const r of ranges) {
              if(globalIdx >= r.start && globalIdx < r.start + r.len) {
                styles[li][ci] = { fill: pointColor, fontWeight: "900" };
              }
            }
            globalIdx++;
          }
          globalIdx++; // \n
        });
        tb.styles = styles;
      }
      fc.renderAll();
      return tb;
    };

    // ── 브랜드명 (중앙 하단) ──
    if (s.brandName) {
      const brandTb = new Textbox(s.brandName, {
        left:width/2, top:height-50, width:width*0.5,
        originX:"center", originY:"bottom",
        fontSize:Math.round(width*0.018), fontWeight:"700",
        fill:pointColor, fontFamily:s.fontFamily||"Pretendard",
        textAlign:"center", name:"brand", opacity:0.7,
      });
      fc.add(brandTb);
    }

    // ── 마지막 팔로우 유도 페이지 ──
    if (s.isLastSlide) {
      const ctaTitle = (s.title||"").replace(/\[P\]/g,"").replace(/\[\/P\]/g,"");
      const ctaBody = (s.body||"").replace(/\[P\]/g,"").replace(/\[\/P\]/g,"");
      const mx = width * 0.07;
      const tw = width * 0.86;
      let curY = height * 0.20;

      const t1 = new Textbox(ctaTitle || "이 콘텐츠가 도움이 됐다면", {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:Math.round(width*0.042), fontWeight:"900",
        fill:s.textColor||"#ffffff", fontFamily:s.fontFamily||"Pretendard",
        textAlign:"left", name:"title", lineHeight:1.3,
      });
      fc.add(t1); curY += t1.calcTextHeight() + 20;

      const t2 = new Textbox(ctaBody || "좋아요 · 저장 · 팔로우", {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:Math.round(width*0.032), fontWeight:"700",
        fill:pointColor, fontFamily:s.fontFamily||"Pretendard",
        textAlign:"left", name:"highlight", lineHeight:1.5,
      });
      fc.add(t2); curY += t2.calcTextHeight() + 24;

      const t3 = new Textbox("다음에도 유익한 콘텐츠로 찾아올게요!\n팔로우하고 놓치지 마세요", {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:Math.round(width*0.022), fontWeight:"500",
        fill:s.textColor||"#ffffff", fontFamily:s.fontFamily||"Pretendard",
        textAlign:"left", name:"body", opacity:0.7, lineHeight:1.7,
      });
      fc.add(t3); curY += t3.calcTextHeight() + 20;

      if (s.brandName) {
        fc.add(new Textbox(`@${s.brandName}`, {
          left:mx, top:curY, width:tw,
          originX:"left", originY:"top",
          fontSize:Math.round(width*0.024), fontWeight:"800",
          fill:pointColor, fontFamily:s.fontFamily||"Pretendard",
          textAlign:"left", name:"brand", opacity:0.9,
        }));
      }
      fc.renderAll();
      return;
    }

    // ── 레이아웃: 사진 상단 + 텍스트 하단 ──
    const mx = width * 0.07;
    const tw = width * 0.86;
    let curY = height * 0.48;

    // 부제목
    if (s.subtitle) {
      const subTb = new Textbox((s.subtitle||"").replace(/\[P\]/g,"").replace(/\[\/P\]/g,""), {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:Math.round(width*0.028), fontWeight:"600", fill:s.textColor||"#ffffff",
        fontFamily:s.fontFamily||"Pretendard", opacity:0.7,
        textAlign:"left", name:"subtitle",
      });
      fc.add(subTb);
      curY += subTb.calcTextHeight() + 10;
    }

    // 제목 — 큰 글씨 + 포인트 색
    if (s.title) {
      const titleFontSize = Math.round(width * 0.055);
      const titleTb = addColoredText(s.title, {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:titleFontSize, fontWeight:"900",
        fill:s.textColor||"#ffffff",
        fontFamily:s.fontFamily||"Pretendard",
        lineHeight:1.2, textAlign:"left", name:"title",
      });
      curY += titleTb.calcTextHeight() + 16;
    }

    // 본문 — 포인트 색 포함
    if (s.body) {
      const bodyFontSize = Math.round(width * 0.032);
      addColoredText(s.body, {
        left:mx, top:curY, width:tw,
        originX:"left", originY:"top",
        fontSize:bodyFontSize,
        fill:s.textColor||"#ffffff",
        fontFamily:s.fontFamily||"Pretendard",
        lineHeight:1.65, textAlign:"left", name:"body",
      });
    }

    fc.renderAll();
  };

  /* ── 컨테이너 맞추기 ── */
  const fit = (fc, box) => {
    if(!fc||!box) return;
    const rect = box.getBoundingClientRect();
    const cw = box.clientWidth;
    const ch = window.innerHeight - rect.top - 5;
    if(cw<=0||ch<=0) return;
    const s = Math.min(cw/width, ch/height);
    const scaledW = Math.round(width*s);
    const scaledH = Math.round(height*s);
    const w = box.querySelector(".canvas-container") || box.firstChild;
    if(w){
      w.style.transform = `scale(${s})`;
      w.style.transformOrigin = "top left";
      w.style.position = "absolute";
      w.style.left = `${Math.round((cw - scaledW)/2)}px`;
      w.style.top = "0";
    }
    // 부모 높이를 실제 표시 크기로 고정
    box.style.height = `${scaledH}px`;
    box.style.position = "relative";
    box.style.overflow = "hidden";
  };

  useEffect(()=>{
    const fn=()=>{if(fcRef.current&&boxRef.current) fit(fcRef.current,boxRef.current);};
    window.addEventListener("resize",fn); return()=>window.removeEventListener("resize",fn);
  },[]);

  /* ── 선택 동기화 ── */
  const syncSel = (obj) => {
    if(!obj) return;
    setSel(obj);
    // 텍스트 선택 시 자동으로 글씨 패널
    if(obj.type==="textbox"||obj.type==="text") { setPanel("text"); setPanelOpen(true); }
    setProps({
      fontFamily:obj.fontFamily||"Pretendard", fontSize:obj.fontSize||24,
      fill:typeof obj.fill==="string"?obj.fill:"#000", fontWeight:obj.fontWeight||"normal",
      fontStyle:obj.fontStyle||"normal", textAlign:obj.textAlign||"left",
      opacity:(obj.opacity??1)*100, strokeWidth:obj.strokeWidth||0,
      stroke:obj.stroke||"#000000",
    });
  };
  const set = (k,v) => { const fc=fcRef.current; const o=fc?.getActiveObject(); if(!o)return; o.set(k,v); fc.renderAll(); syncSel(o); };

  /* ── 슬라이드 전환 ── */
  const save = () => { const fc=fcRef.current; if(fc) slidesRef.current[idx]=fc.toJSON(); };
  const go = (i) => {
    if(i<0||i>=total) return; save(); setIdx(i);
    const fc=fcRef.current; if(!fc) return;
    const s=slidesRef.current[i];
    if(s) fc.loadFromJSON(s).then(()=>fc.renderAll());
    else if(initSlides[i]) buildSlide(fc,initSlides[i],i);
  };

  /* ── 오브젝트 추가 ── */
  const addText = (text, opts={}) => {
    const fc=fcRef.current; if(!fc) return;
    const t=new Textbox(text||"텍스트 입력",{
      left:width*0.1, top:height*0.35, width:width*0.8,
      fontSize:opts.fontSize||32, fill:opts.fill||"#000000", fontWeight:opts.fontWeight||"normal",
      fontFamily:opts.fontFamily||"Pretendard", textAlign:"center", ...opts,
    });
    fc.add(t); fc.setActiveObject(t); fc.renderAll();
  };

  const addShape = (type) => {
    const fc=fcRef.current; if(!fc) return;
    let obj;
    if(type==="rect") obj=new Rect({width:200,height:140,fill:"#7c6aff33",left:width/2-100,top:height/2-70,rx:12,ry:12});
    else if(type==="circle") obj=new Circle({radius:80,fill:"#ec489933",left:width/2-80,top:height/2-80});
    else if(type==="triangle") obj=new Triangle({width:160,height:140,fill:"#f59e0b33",left:width/2-80,top:height/2-70});
    else if(type==="line") obj=new Line([width*0.2,height/2,width*0.8,height/2],{stroke:"#ffffff",strokeWidth:3});
    else if(type==="filled-rect") obj=new Rect({width:width,height:height*0.3,fill:"#7c6aff",left:0,top:height*0.7,rx:0,ry:0});
    else if(type==="rounded-rect") obj=new Rect({width:280,height:60,fill:"#ffffff",left:width/2-140,top:height/2-30,rx:30,ry:30,stroke:"#333",strokeWidth:2});
    else if(type==="badge") obj=new Rect({width:180,height:44,fill:"#ffffff",left:width/2-90,top:height*0.15,rx:22,ry:22,stroke:"#e5e7eb",strokeWidth:1.5});
    // 그라데이션 오버레이 — 기존 그라데이션 제거 후 추가, originX/Y 명시
    else if(type==="grad-bottom") {
      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
      obj=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:0.5,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0.85)"}]}));
    }
    else if(type==="grad-top") {
      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
      obj=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0.85)"},{offset:0.5,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0)"}]}));
    }
    else if(type==="grad-left") {
      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
      obj=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:width,y2:0},colorStops:[{offset:0,color:"rgba(0,0,0,0.85)"},{offset:0.5,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0)"}]}));
    }
    else if(type==="grad-right") {
      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
      obj=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:width,y2:0},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:0.5,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0.85)"}]}));
    }
    else if(type==="grad-full") {
      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
      obj=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:0.4,color:"rgba(0,0,0,0.1)"},{offset:1,color:"rgba(0,0,0,0.7)"}]}));
    }
    if(obj){fc.add(obj);fc.setActiveObject(obj);fc.renderAll();}
  };

  const addImageUrl = (url) => {
    const fc=fcRef.current; if(!fc) return;
    FabricImage.fromURL(url,{crossOrigin:"anonymous"}).then(img=>{
      if(!img) return;
      const s=(width*0.6)/img.width;
      img.set({scaleX:s,scaleY:s,left:width*0.2,top:height*0.2});
      fc.add(img); fc.setActiveObject(img); fc.renderAll();
    }).catch(()=>{});
  };

  const addImageFile = () => {
    const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange=e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const r=new FileReader();
      r.onload=ev=>addImageUrl(ev.target.result);
      r.readAsDataURL(f);
    };
    inp.click();
  };

  const setBgImage = (url) => {
    const fc=fcRef.current; if(!fc) return;
    fc.getObjects().filter(o=>o.name==="bg").forEach(o=>fc.remove(o));
    FabricImage.fromURL(url,{crossOrigin:"anonymous"}).then(img=>{
      if(!img) return;
      const s=Math.max(width/img.width,height/img.height);
      img.set({scaleX:s,scaleY:s,left:width/2,top:height/2,originX:"center",originY:"center",selectable:false,evented:false,name:"bg"});
      fc.insertAt(0,img);
      // 그라데이션 없으면 자동 추가
      if(!fc.getObjects().some(o=>o.name==="gradient")){
        const ov=new Rect({width,height,left:0,top:0,originX:"left",originY:"top",selectable:true,evented:true,name:"gradient"});
        ov.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0.3)"},{offset:0.35,color:"rgba(0,0,0,0.05)"},{offset:1,color:"rgba(0,0,0,0.65)"}]}));
        fc.insertAt(1,ov);
      }
      fc.renderAll();
    }).catch(()=>{});
  };

  const setBg = (c) => { const fc=fcRef.current; if(fc){fc.backgroundColor=c;fc.renderAll();} };
  const del = () => { const fc=fcRef.current; const o=fc?.getActiveObject(); if(o&&o.name!=="bg"){fc.remove(o);fc.renderAll();setSel(null);} };

  /* ── 이미지 검색 (통합: Pexels+Unsplash+Pixabay 동시) ── */
  const searchImages = async (q) => {
    if(!q.trim()) return;
    setImgLoading(true); setImgResults([]);
    try {
      const [pexRes, unsRes, pixRes] = await Promise.allSettled([
        fetch(`/api/proxy?action=pexels&path=v1/search&query=${encodeURIComponent(q)}&per_page=8`).then(r=>r.json()),
        fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(q)}&per_page=8`).then(r=>r.json()),
        fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(q)}&per_page=8`).then(r=>r.json()),
      ]);
      let all = [];
      if(pexRes.status==="fulfilled") all.push(...(pexRes.value.photos||[]).map(p=>({thumb:p.src?.small,full:p.src?.large,source:"Pexels"})));
      if(unsRes.status==="fulfilled") all.push(...(unsRes.value.results||[]).map(p=>({thumb:p.urls?.thumb,full:p.urls?.regular,source:"Unsplash"})));
      if(pixRes.status==="fulfilled") all.push(...(pixRes.value.hits||[]).map(p=>({thumb:p.previewURL,full:p.largeImageURL,source:"Pixabay"})));
      // 소스별 번갈아 섞기
      const bySource = {Pexels:[],Unsplash:[],Pixabay:[]};
      all.forEach(r => { if(bySource[r.source]) bySource[r.source].push(r); });
      const mixed = [];
      const max = Math.max(bySource.Pexels.length, bySource.Unsplash.length, bySource.Pixabay.length);
      for(let i=0;i<max;i++) {
        if(bySource.Pexels[i]) mixed.push(bySource.Pexels[i]);
        if(bySource.Unsplash[i]) mixed.push(bySource.Unsplash[i]);
        if(bySource.Pixabay[i]) mixed.push(bySource.Pixabay[i]);
      }
      setImgResults(mixed);
    } catch(e) { console.error("Image search:", e); }
    setImgLoading(false);
  };

  /* ── 내보내기 ── */
  const exportPng = () => {
    const fc=fcRef.current; if(!fc) return;
    const u=fc.toDataURL({format:"png",multiplier:1});
    const a=document.createElement("a"); a.href=u; a.download=`slide_${idx+1}.png`; a.click();
  };

  const exportAll = async () => {
    save();
    const fc=fcRef.current; if(!fc) return;
    if(!window.JSZip) await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    const zip=new window.JSZip();
    for(let i=0;i<total;i++){
      const s=slidesRef.current[i];
      if(s) await fc.loadFromJSON(s).then(()=>fc.renderAll());
      else if(initSlides[i]) buildSlide(fc,initSlides[i],i);
      const b64=fc.toDataURL({format:"png"}).split(",")[1];
      zip.file(`slide_${String(i+1).padStart(2,"0")}.png`,b64,{base64:true});
    }
    const cur=slidesRef.current[idx];
    if(cur) await fc.loadFromJSON(cur); fc.renderAll();
    const blob=await zip.generateAsync({type:"blob"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="slides.zip";a.click();
  };

  /* ── TXT 내보내기 ── */
  const exportTxt = () => {
    const fc = fcRef.current; if (!fc) return;
    const lines = [];
    for (let i = 0; i < total; i++) {
      const slide = initSlides[i];
      if (slide) {
        lines.push(`[슬라이드 ${i + 1}]`);
        if (slide.title) lines.push(slide.title);
        if (slide.body) lines.push(slide.body);
        lines.push("");
      }
    }
    const text = lines.join("\n") || "내용 없음";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "slides.txt"; a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── PDF 내보내기 (jsPDF 동적 로드, 슬라이드를 이미지로 삽입) ── */
  const exportPdf = async () => {
    save();
    const fc = fcRef.current; if (!fc) return;
    // jsPDF 동적 로드
    if (!window.jspdf) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const orientation = width >= height ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "px", format: [width, height] });

    for (let i = 0; i < total; i++) {
      if (i > 0) pdf.addPage([width, height], orientation);
      const s = slidesRef.current[i];
      if (s) await fc.loadFromJSON(s).then(() => fc.renderAll());
      else if (initSlides[i]) buildSlide(fc, initSlides[i], i);
      const dataUrl = fc.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 1 });
      pdf.addImage(dataUrl, "JPEG", 0, 0, width, height);
    }
    // 현재 슬라이드 복원
    const cur = slidesRef.current[idx];
    if (cur) await fc.loadFromJSON(cur); fc.renderAll();

    pdf.save("slides.pdf");
  };

  /* ── 키보드 ── */
  useEffect(()=>{
    const fn=e=>{
      if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)||e.target.isContentEditable) return;
      if(e.key==="Delete"||e.key==="Backspace") del();
      if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))){e.preventDefault();redo();}
      // Ctrl+C 복사
      if((e.ctrlKey||e.metaKey)&&e.key==="c"){
        const fc=fcRef.current;if(!fc)return;
        const obj=fc.getActiveObject();if(!obj)return;
        obj.clone().then(cloned=>{window._fabricClipboard=cloned;});
      }
      // Ctrl+V 붙여넣기
      if((e.ctrlKey||e.metaKey)&&e.key==="v"){
        if(!window._fabricClipboard)return;
        const fc=fcRef.current;if(!fc)return;
        window._fabricClipboard.clone().then(cloned=>{
          cloned.set({left:(cloned.left||0)+20,top:(cloned.top||0)+20});
          fc.add(cloned);fc.setActiveObject(cloned);fc.renderAll();
          syncSel(cloned);
        });
      }
    };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[]);

  const B = {background:"none",border:"1px solid #ddd",borderRadius:6,padding:"5px 10px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12};

  // 왼쪽 도구 아이콘 (미리캔버스 스타일 — SVG 아이콘)
  const SvgIcon = ({d, size=18}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
  const leftTools = [
    {id:"props",   icon:<SvgIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>, label:"속성"},
    {id:"text",    icon:<SvgIcon d="M4 7V4h16v3M9 20h6M12 4v16"/>, label:"글씨"},
    {id:"images",  icon:<SvgIcon d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z"/>, label:"사진"},
    {id:"layers",  icon:<SvgIcon d="M3 12h18M3 6h18M3 18h18"/>, label:"레이어"},
  ];

  /* ═══ RENDER ═══ */
  return (
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"row",overflow:"hidden",background:"#fff"}}>
      <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"row",background:"#fff",position:"relative"}}>

        {/* ── 왼쪽 아이콘 바 ── */}
        <div style={{width:56,background:"#f8f8fc",borderRight:"1px solid #e5e5ea",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:6,paddingBottom:6,flexShrink:0,overflowY:"auto",overflowX:"hidden"}}>
          {leftTools.map(t=>(
            <button key={t.id} onClick={()=>setPanel(panel===t.id&&panelOpen?null:t.id)||setPanelOpen(true)}
              style={{width:48,height:48,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,border:"none",borderRadius:8,cursor:"pointer",marginBottom:2,flexShrink:0,
                background:panel===t.id&&panelOpen?"rgba(124,106,255,0.15)":"transparent",
                borderLeft:panel===t.id&&panelOpen?"3px solid #7c6aff":"3px solid transparent",
                color:panel===t.id&&panelOpen?"#7c6aff":"#666",transition:"all 0.12s"}}>
              <span style={{fontSize:17,lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:700}}>{t.label}</span>
            </button>
          ))}
          <div style={{flex:1,minHeight:4}}/>
          <button onClick={undo} title="되돌리기" style={{width:32,height:32,borderRadius:6,border:"none",cursor:"pointer",background:"transparent",color:"#888",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          </button>
          <button onClick={redo} title="다시실행" style={{width:32,height:32,borderRadius:6,border:"none",cursor:"pointer",background:"transparent",color:"#888",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          </button>
        </div>

        {/* ── 왼쪽 확장 패널 (클릭 시 열림) ── */}
        {panelOpen&&panel&&(
        <div style={{width:260,background:"#fafafa",borderRight:"1px solid #eee",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #eee",flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:700,color:"#333"}}>{leftTools.find(t=>t.id===panel)?.label}</span>
            <button onClick={()=>setPanelOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#aaa"}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:0}}>

            {/* ─── 속성 패널 ─── */}
            {panel==="props"&&<>
              {/* 배경색 */}
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>배경색</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {["#ffffff","#f5f5f5","#1c1c1e","#0f172a","#fef3c7","#052e16","#831843","#f5ebe0","#0c1445","#ede9fe"].map(c=>(
                    <button key={c} onClick={()=>setBg(c)} style={{width:24,height:24,borderRadius:5,background:c,border:"2px solid rgba(0,0,0,0.1)",cursor:"pointer",padding:0}}/>
                  ))}
                  <input type="color" onChange={e=>setBg(e.target.value)} style={{width:24,height:24,padding:0,border:"2px solid rgba(0,0,0,0.1)",borderRadius:5,cursor:"pointer"}}/>
                </div>
              </div>

              {/* 배경 이미지 설정 */}
              {(()=>{
                const fc=fcRef.current;
                const bgObj=fc?.getObjects().find(o=>o.name==="bg");
                if(!bgObj) return null;
                return (
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0"}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>배경 이미지</div>
                    <div style={{fontSize:11,color:"#888",marginBottom:4}}>투명도: {Math.round((bgObj.opacity??1)*100)}%</div>
                    <input type="range" min={10} max={100} value={Math.round((bgObj.opacity??1)*100)}
                      onChange={e=>{bgObj.set("opacity",+e.target.value/100);fc.renderAll();setLayerTick(t=>t+1);}}
                      style={{width:"100%",accentColor:"#7c6aff",marginBottom:8}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{
                        const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
                        inp.onchange=ev=>{const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=e2=>setBgImage(e2.target.result);r.readAsDataURL(f);};
                        inp.click();
                      }} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:"#555"}}>
                        사진 교체
                      </button>
                      <button onClick={()=>{
                        fc.getObjects().filter(o=>o.name==="bg").forEach(o=>fc.remove(o));
                        fc.renderAll();setLayerTick(t=>t+1);
                      }} style={{padding:"7px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600,color:"#ef4444"}}>
                        제거
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 텍스트 선택 시 → 글씨 탭 안내 */}
              {sel&&(sel.type==="textbox"||sel.type==="text")&&(
                <div style={{padding:"8px 16px",borderBottom:"1px solid #f0f0f0"}}>
                  <button onClick={()=>{setPanel("text");setPanelOpen(true);}}
                    style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid #7c6aff",background:"rgba(124,106,255,0.06)",color:"#7c6aff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    글씨 탭에서 편집 →
                  </button>
                </div>
              )}

              {/* 개별 정렬 */}
              {sel&&sel.name!=="bg"&&(
                <div style={{padding:"10px 16px",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>선택 요소 정렬</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
                    {[
                      {label:"좌",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width*0.07-b.left));}},
                      {label:"중앙",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width/2-b.left-b.width/2));}},
                      {label:"우",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width*0.93-b.left-b.width));}},
                      {label:"상",fn:()=>{const b=sel.getBoundingRect();sel.set("top",sel.top+(height*0.05-b.top));}},
                      {label:"정중앙",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width/2-b.left-b.width/2));sel.set("top",sel.top+(height/2-b.top-b.height/2));}},
                      {label:"하",fn:()=>{const b=sel.getBoundingRect();sel.set("top",sel.top+(height*0.95-b.top-b.height));}},
                    ].map(a=>(
                      <button key={a.label} onClick={()=>{const fc=fcRef.current;if(!fc||!sel)return;a.fn();sel.setCoords();fc.renderAll();}}
                        style={{padding:"6px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:10,fontWeight:600,color:"#555"}}>{a.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* 선택 요소 투명도 (이미지/도형) */}
              {sel&&sel.name!=="bg"&&sel.type!=="textbox"&&(
                <div style={{padding:"8px 16px",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>투명도: {Math.round((sel.opacity??1)*100)}%</div>
                  <input type="range" min={5} max={100} value={Math.round((sel.opacity??1)*100)}
                    onChange={e=>{sel.set("opacity",+e.target.value/100);fcRef.current?.renderAll();setLayerTick(t=>t+1);}}
                    style={{width:"100%",accentColor:"#7c6aff"}}/>
                </div>
              )}

              {/* 선택 삭제 */}
              {sel&&sel.name!=="bg"&&(
                <div style={{padding:"8px 16px",borderBottom:"1px solid #f0f0f0"}}>
                  <button onClick={del} style={{width:"100%",padding:"8px",border:"none",borderRadius:8,background:"#ef4444",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>선택 삭제</button>
                </div>
              )}

              {/* 도형 추가 */}
              <div style={{padding:"10px 16px",borderBottom:"1px solid #f0f0f0"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>도형 추가</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
                  {[
                    {type:"rect",label:"사각형",icon:"□"},
                    {type:"circle",label:"원",icon:"○"},
                    {type:"triangle",label:"삼각형",icon:"△"},
                    {type:"line",label:"선",icon:"—"},
                    {type:"rounded-rect",label:"둥근태그",icon:"⬭"},
                    {type:"badge",label:"뱃지",icon:"⬬"},
                    {type:"filled-rect",label:"배경바",icon:"▬"},
                  ].map(s=>(
                    <button key={s.type} onClick={()=>addShape(s.type)}
                      style={{padding:"8px 4px",borderRadius:8,border:"1px solid #eee",background:"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:16}}>{s.icon}</span>
                      <span style={{fontSize:9,color:"#888"}}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 그라데이션 오버레이 */}
              <div style={{padding:"10px 16px"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>그라데이션 오버레이</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
                  {[
                    {type:"grad-bottom",label:"하단",grad:"linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8))"},
                    {type:"grad-top",label:"상단",grad:"linear-gradient(to top, transparent 30%, rgba(0,0,0,0.8))"},
                    {type:"grad-full",label:"전체",grad:"linear-gradient(to bottom, transparent 10%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.7))"},
                  ].map(g=>(
                    <button key={g.type} onClick={()=>addShape(g.type)}
                      style={{padding:0,borderRadius:8,border:"1px solid #ddd",cursor:"pointer",overflow:"hidden",height:40}}>
                      <div style={{width:"100%",height:"100%",background:g.grad,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:3}}>
                        <span style={{fontSize:9,fontWeight:700,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>{g.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>}


            {/* ─── 레이어 패널 (드래그 지원) ─── */}
            {panel==="layers"&&(
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>레이어 순서</div>
                <div style={{fontSize:11,color:"#888",marginBottom:10}}>드래그로 순서 변경 · 위가 앞</div>
                {(()=>{
                  const fc=fcRef.current; if(!fc) return null;
                  const objs=fc.getObjects().filter(o=>o.name!=="guide");
                  const list=[...objs].reverse();
                  if(list.length===0) return <div style={{textAlign:"center",padding:20,color:"#ccc",fontSize:12}}>오브젝트가 없습니다</div>;
                  const getLabel=(obj)=>obj.name==="bg"?"배경 이미지":obj.name==="title"?"제목":obj.name==="body"?"본문":obj.name==="highlight"?"부제목":obj.name==="gradient"?"그라데이션":obj.type==="textbox"?`텍스트: ${(obj.text||"").slice(0,10)}`:obj.type==="rect"?"사각형":obj.type==="circle"?"원":obj.type==="triangle"?"삼각형":obj.type==="line"?"선":obj.type==="image"?"이미지":"오브젝트";
                  const getIcon=(obj)=>obj.type==="textbox"?"T":obj.type==="rect"?"□":obj.type==="circle"?"○":obj.type==="triangle"?"△":obj.type==="line"?"—":obj.type==="image"?"🖼":"◆";
                  return list.map((obj,i)=>{
                    const isActive=sel===obj, isBg=obj.name==="bg";
                    return (
                      <div key={i}
                        draggable={!isBg}
                        onDragStart={e=>{if(isBg){e.preventDefault();return;}e.dataTransfer.setData("layerIdx",String(i));}}
                        onDragOver={e=>{if(!isBg)e.preventDefault();}}
                        onDrop={e=>{
                          e.preventDefault();
                          const fromIdx=parseInt(e.dataTransfer.getData("layerIdx"));
                          if(isNaN(fromIdx)||fromIdx===i) return;
                          const fromObj=list[fromIdx], toObj=list[i];
                          if(!fromObj||!toObj||fromObj.name==="bg"||toObj.name==="bg") return;
                          // list는 reverse 순서이므로 실제 fabric index는 objs 기준
                          const fromFabricIdx=objs.indexOf(fromObj), toFabricIdx=objs.indexOf(toObj);
                          if(fromFabricIdx<0||toFabricIdx<0) return;
                          fc.moveTo(fromObj,toFabricIdx);
                          fc.renderAll(); setLayerTick(t=>t+1);
                        }}
                        onClick={()=>{if(!isBg){fc.setActiveObject(obj);fc.renderAll();syncSel(obj);}}}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,marginBottom:3,
                          cursor:isBg?"default":"grab",userSelect:"none",
                          background:isActive?"rgba(124,106,255,0.12)":"transparent",border:`1.5px solid ${isActive?"#7c6aff":"transparent"}`,
                          opacity:isBg?0.4:1,transition:"background 0.1s"}}>
                        <span style={{fontSize:10,color:"#bbb",cursor:"grab"}}>☰</span>
                        <span style={{fontSize:14,width:18,textAlign:"center"}}>{getIcon(obj)}</span>
                        <span style={{flex:1,fontSize:12,fontWeight:isActive?700:400,color:isActive?"#7c6aff":"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getLabel(obj)}</span>
                        {isBg&&(
                          <button onClick={e=>{
                            e.stopPropagation();
                            const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
                            inp.onchange=ev=>{const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=e2=>setBgImage(e2.target.result);r.readAsDataURL(f);};
                            inp.click();
                          }} style={{padding:"3px 8px",borderRadius:4,border:"1px solid #7c6aff",background:"rgba(124,106,255,0.08)",cursor:"pointer",fontSize:9,fontWeight:700,color:"#7c6aff"}}>교체</button>
                        )}
                        {!isBg&&(
                          <div style={{display:"flex",gap:2}}>
                            {obj.type==="image"&&(
                              <button onClick={e=>{
                                e.stopPropagation();
                                const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
                                inp.onchange=ev=>{const f=ev.target.files?.[0];if(!f)return;const rd=new FileReader();
                                  rd.onload=e2=>{
                                    FabricImage.fromURL(e2.target.result,{crossOrigin:"anonymous"}).then(newImg=>{
                                      if(!newImg)return;
                                      newImg.set({scaleX:obj.scaleX,scaleY:obj.scaleY,left:obj.left,top:obj.top,originX:obj.originX,originY:obj.originY,selectable:obj.selectable,evented:obj.evented,name:obj.name,opacity:obj.opacity});
                                      const fc2=fcRef.current;if(!fc2)return;
                                      const idx2=fc2.getObjects().indexOf(obj);
                                      fc2.remove(obj);fc2.insertAt(idx2,newImg);fc2.renderAll();setLayerTick(t=>t+1);
                                    });
                                  };rd.readAsDataURL(f);};
                                inp.click();
                              }} style={{width:20,height:20,borderRadius:3,border:"1px solid #7c6aff",background:"rgba(124,106,255,0.08)",cursor:"pointer",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#7c6aff"}}>↻</button>
                            )}
                            <button onClick={e=>{e.stopPropagation();fc.bringObjectForward(obj);fc.renderAll();setLayerTick(t=>t+1);}}
                              style={{width:20,height:20,borderRadius:3,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                            <button onClick={e=>{e.stopPropagation();fc.sendObjectBackwards(obj);fc.renderAll();setLayerTick(t=>t+1);}}
                              style={{width:20,height:20,borderRadius:3,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                {sel&&sel.name!=="bg"&&(<>
                  <div style={{borderTop:"1px solid #eee",paddingTop:8,marginTop:8,display:"flex",gap:6}}>
                    <button onClick={()=>{const fc=fcRef.current;if(fc&&sel){fc.bringObjectToFront(sel);fc.renderAll();setLayerTick(t=>t+1);}}} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600}}>맨 앞</button>
                    <button onClick={()=>{const fc=fcRef.current;if(fc&&sel){fc.sendObjectToBack(sel);fc.renderAll();setLayerTick(t=>t+1);}}} style={{flex:1,padding:"7px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600}}>맨 뒤</button>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:"#888",marginTop:10,marginBottom:6}}>위치 정렬</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                    {[
                      {label:"좌측",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left-b.left+width*0.08);}},
                      {label:"가로중앙",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width/2-b.left-b.width/2));}},
                      {label:"우측",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width*0.92-b.left-b.width));}},
                      {label:"상단",fn:()=>{const b=sel.getBoundingRect();sel.set("top",sel.top-b.top+height*0.08);}},
                      {label:"정중앙",fn:()=>{const b=sel.getBoundingRect();sel.set("left",sel.left+(width/2-b.left-b.width/2));sel.set("top",sel.top+(height/2-b.top-b.height/2));}},
                      {label:"하단",fn:()=>{const b=sel.getBoundingRect();sel.set("top",sel.top+(height*0.92-b.top-b.height));}},
                    ].map(a=>(
                      <button key={a.label} onClick={()=>{const fc=fcRef.current;if(!fc||!sel)return;a.fn();sel.setCoords();fc.renderAll();syncSel(sel);}}
                        style={{padding:"7px 4px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:10,fontWeight:600,color:"#555"}}>{a.label}</button>
                    ))}
                  </div>
                </>)}
              </div>
            )}

            {/* ─── 이미지 패널 ─── */}
            {panel==="images"&&(
              <div style={{padding:"12px 16px"}}>
                {/* AI 이미지 추천 */}
                <button onClick={async()=>{
                  const fc=fcRef.current; if(!fc) return;
                  const texts=fc.getObjects().filter(o=>o.type==="textbox").map(o=>o.text).join(" ").trim();
                  if(!texts){alert("캔버스에 텍스트를 먼저 추가하세요");return;}
                  setImgLoading(true);
                  try{
                    const kw=await callAI("claude-haiku-4-5",[{role:"user",content:`다음 텍스트에 어울리는 이미지 검색 키워드를 영어로 3개 추천. 쉼표 구분으로만 출력:\n${texts.slice(0,200)}`}],100);
                    const first=kw.split(",")[0]?.trim()||texts.slice(0,20);
                    setImgQuery(first);
                    await searchImages(first);
                  }catch{}
                  setImgLoading(false);
                }} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:12,fontWeight:700,marginBottom:10}}>
                  AI 이미지 추천
                </button>
                <div style={{fontSize:11,color:"#888",marginBottom:8}}>Pexels + Unsplash + Pixabay 통합 검색</div>
                {/* 검색 */}
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <input value={imgQuery} onChange={e=>setImgQuery(e.target.value)} placeholder="검색어 입력..."
                    onKeyDown={e=>{if(e.key==="Enter")searchImages(imgQuery);}}
                    style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1px solid #ddd",fontSize:12,outline:"none"}}/>
                  <button onClick={()=>searchImages(imgQuery)} style={{background:"#7c6aff",color:"#fff",border:"none",borderRadius:8,padding:"0 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>검색</button>
                </div>
                {/* 파일 업로드 / 배경 */}
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <button onClick={addImageFile} style={{flex:1,padding:"8px",borderRadius:8,border:"1px dashed #ccc",background:"transparent",cursor:"pointer",fontSize:12,color:"#666"}}>📁 파일 업로드</button>
                  <button onClick={()=>{const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setBgImage(ev.target.result);r.readAsDataURL(f);};inp.click();}}
                    style={{flex:1,padding:"8px",borderRadius:8,border:"1px dashed #ccc",background:"transparent",cursor:"pointer",fontSize:12,color:"#666"}}>🖼 배경 이미지</button>
                </div>
                {/* 결과 */}
                {imgLoading&&<div style={{textAlign:"center",padding:20,color:"#888",fontSize:12}}>검색 중...</div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                  {imgResults.map((img,i)=>(
                    <div key={i} style={{borderRadius:8,overflow:"hidden",border:"1px solid #eee",position:"relative"}}>
                      <img src={img.thumb} alt="" style={{width:"100%",height:80,objectFit:"cover",display:"block"}}/>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",gap:0}}>
                        <button onClick={()=>setBgImage(img.full)}
                          style={{flex:1,padding:"4px",background:"rgba(124,106,255,0.85)",color:"#fff",border:"none",fontSize:9,fontWeight:700,cursor:"pointer"}}>배경</button>
                        <button onClick={()=>addImageUrl(img.full)}
                          style={{flex:1,padding:"4px",background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",fontSize:9,fontWeight:700,cursor:"pointer"}}>삽입</button>
                      </div>
                    </div>
                  ))}
                </div>
                {imgResults.length===0&&!imgLoading&&<div style={{textAlign:"center",padding:20,color:"#ccc",fontSize:12}}>키워드로 검색하세요</div>}
              </div>
            )}


            {/* ─── 글씨 패널 ─── */}
            {panel==="text"&&(
              <div style={{padding:"12px 16px"}}>
                {/* 선택된 텍스트 편집 */}
                {sel&&(sel.type==="textbox"||sel.type==="text")&&(<>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>텍스트 편집</div>
                  <select value={props.fontFamily} onChange={e=>{loadFont(e.target.value);set("fontFamily",e.target.value);}}
                    style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1px solid #ddd",fontSize:11,marginBottom:6}}>
                    {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  <div style={{fontSize:10,color:"#888"}}>크기: {props.fontSize}px</div>
                  <input type="range" min={10} max={120} value={props.fontSize} onChange={e=>set("fontSize",+e.target.value)}
                    style={{width:"100%",accentColor:"#7c6aff",marginBottom:4}}/>
                  <div style={{fontSize:10,color:"#888"}}>전체 색상</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
                    {["#ffffff","#000000","#7c6aff","#ef4444","#f59e0b","#10b981"].map(c=>(
                      <button key={c} onClick={()=>set("fill",c)} style={{width:18,height:18,borderRadius:3,background:c,border:"1.5px solid rgba(0,0,0,0.15)",cursor:"pointer",padding:0}}/>
                    ))}
                    <input type="color" value={props.fill} onChange={e=>set("fill",e.target.value)}
                      style={{width:18,height:18,padding:0,border:"1px solid #ddd",borderRadius:3,cursor:"pointer"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#888"}}>선택 글자 색 (드래그 후)</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
                    {["#e4ff1a","#ff6b6b","#4ecdc4","#ffd93d","#ffffff","#7c6aff","#ff9f43"].map(c=>(
                      <button key={"s"+c} onClick={()=>{
                        const tb=sel;if(!tb)return;
                        const start=tb.selectionStart,end=tb.selectionEnd;
                        if(start===end)return;
                        for(let i=start;i<end;i++) tb.setSelectionStyles({fill:c,fontWeight:"900"},i,i+1);
                        fcRef.current?.renderAll();
                      }} style={{width:18,height:18,borderRadius:3,background:c,border:"1.5px solid rgba(0,0,0,0.2)",cursor:"pointer",padding:0}}/>
                    ))}
                    <input type="color" onChange={e=>{
                      const tb=sel;if(!tb)return;const s=tb.selectionStart,en=tb.selectionEnd;if(s===en)return;
                      for(let i=s;i<en;i++) tb.setSelectionStyles({fill:e.target.value,fontWeight:"900"},i,i+1);
                      fcRef.current?.renderAll();
                    }} style={{width:18,height:18,padding:0,border:"1px solid #ddd",borderRadius:3,cursor:"pointer"}}/>
                  </div>
                  <div style={{display:"flex",gap:3,marginBottom:8}}>
                    <button onClick={()=>set("fontWeight",props.fontWeight==="bold"?"normal":"bold")}
                      style={{...B,fontWeight:900,fontSize:11,background:props.fontWeight==="bold"?"#7c6aff15":"transparent"}}>B</button>
                    <button onClick={()=>set("fontStyle",props.fontStyle==="italic"?"normal":"italic")}
                      style={{...B,fontStyle:"italic",fontSize:11,background:props.fontStyle==="italic"?"#7c6aff15":"transparent"}}>I</button>
                    {["left","center","right"].map(a=>(
                      <button key={a} onClick={()=>set("textAlign",a)}
                        style={{...B,fontSize:11,background:props.textAlign===a?"#7c6aff15":"transparent"}}>
                        {a==="left"?"◧":a==="center"?"◫":"◨"}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:"#888",marginTop:6,marginBottom:2}}>그림자</div>
                  <div style={{display:"flex",gap:3,marginBottom:6}}>
                    <button onClick={()=>{
                      if(!sel)return;
                      sel.set("shadow", sel.shadow ? null : "2px 3px 6px rgba(0,0,0,0.5)");
                      fcRef.current?.renderAll();
                    }} style={{...B,fontSize:10,flex:1,background:sel?.shadow?"#7c6aff15":"transparent",borderColor:sel?.shadow?"#7c6aff":"#ddd"}}>
                      {sel?.shadow?"그림자 ON":"그림자 OFF"}
                    </button>
                    <button onClick={()=>{if(!sel)return;sel.set("shadow","0 4px 12px rgba(0,0,0,0.8)");fcRef.current?.renderAll();}}
                      style={{...B,fontSize:10}}>강하게</button>
                    <button onClick={()=>{if(!sel)return;sel.set("shadow","1px 1px 3px rgba(0,0,0,0.3)");fcRef.current?.renderAll();}}
                      style={{...B,fontSize:10}}>약하게</button>
                  </div>
                  <div style={{borderBottom:"1px solid #eee",marginBottom:10}}/>
                </>)}

                {/* 글씨색 일괄 변경 */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>글씨색 일괄 변경</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                    {["#ffffff","#000000","#e4ff1a","#ff6b6b","#4ecdc4","#ffd93d","#6c5ce7","#00b894","#fd79a8"].map(c=>(
                      <button key={c} onClick={()=>{
                        const fc=fcRef.current;if(!fc)return;
                        fc.getObjects().filter(o=>o.type==="textbox"&&o.name!=="bg").forEach(o=>{o.set("fill",c);});
                        fc.renderAll();
                      }} style={{width:22,height:22,borderRadius:4,background:c,border:"2px solid rgba(0,0,0,0.15)",cursor:"pointer",padding:0}}/>
                    ))}
                    <input type="color" onChange={e=>{
                      const fc=fcRef.current;if(!fc)return;
                      fc.getObjects().filter(o=>o.type==="textbox"&&o.name!=="bg").forEach(o=>{o.set("fill",e.target.value);});
                      fc.renderAll();
                    }} style={{width:22,height:22,padding:0,border:"2px solid rgba(0,0,0,0.15)",borderRadius:4,cursor:"pointer"}}/>
                  </div>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>포인트색 (강조 단어)</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {["#e4ff1a","#ff6b6b","#4ecdc4","#ffd93d","#ff9ff3","#48dbfb","#1dd1a1","#ff9f43"].map(c=>(
                      <button key={c} onClick={()=>{
                        const fc=fcRef.current;if(!fc)return;
                        fc.getObjects().filter(o=>o.type==="textbox").forEach(o=>{
                          const styles=o.styles||{};
                          Object.values(styles).forEach(line=>{
                            Object.values(line).forEach(ch=>{
                              if(ch.fill && ch.fill!==o.fill) ch.fill=c;
                            });
                          });
                        });
                        fc.renderAll();setLayerTick(t=>t+1);
                      }} style={{width:22,height:22,borderRadius:4,background:c,border:"2px solid rgba(0,0,0,0.15)",cursor:"pointer",padding:0}}/>
                    ))}
                    <input type="color" onChange={e=>{
                      const fc=fcRef.current;if(!fc)return;
                      fc.getObjects().filter(o=>o.type==="textbox").forEach(o=>{
                        const styles=o.styles||{};
                        Object.values(styles).forEach(line=>{
                          Object.values(line).forEach(ch=>{
                            if(ch.fill && ch.fill!==o.fill) ch.fill=e.target.value;
                          });
                        });
                      });
                      fc.renderAll();setLayerTick(t=>t+1);
                    }} style={{width:22,height:22,padding:0,border:"2px solid rgba(0,0,0,0.15)",borderRadius:4,cursor:"pointer"}}/>
                  </div>
                </div>

                {/* 텍스트 배치 */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>텍스트 배치 (현재 슬라이드)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:10}}>
                    {[
                      {label:"좌상",align:"left",vAlign:"top"},
                      {label:"중앙상",align:"center",vAlign:"top"},
                      {label:"우상",align:"right",vAlign:"top"},
                      {label:"좌하",align:"left",vAlign:"bottom"},
                      {label:"중앙",align:"center",vAlign:"center"},
                      {label:"중하",align:"center",vAlign:"bottom"},
                    ].map(a=>(
                      <button key={a.label} onClick={()=>{
                        const fc=fcRef.current;if(!fc)return;
                        const mx=a.align==="left"?width*0.07:a.align==="right"?width*0.93:width/2;
                        const ox=a.align==="left"?"left":a.align==="right"?"right":"center";
                        const texts=fc.getObjects().filter(o=>o.type==="textbox"&&o.name!=="bg");
                        let totalH=0;texts.forEach(o=>totalH+=o.calcTextHeight()+16);
                        let startY=a.vAlign==="top"?height*0.1:a.vAlign==="bottom"?height*0.9-totalH:(height-totalH)/2;
                        texts.forEach(o=>{o.set({left:mx,originX:ox,top:startY,originY:"top",textAlign:a.align});startY+=o.calcTextHeight()+16;o.setCoords();});
                        fc.renderAll();
                      }} style={{padding:"6px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:10,fontWeight:600,color:"#555"}}>{a.label}</button>
                    ))}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>전체 슬라이드 일괄 배치</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                    {[
                      {label:"좌측 정렬",align:"left"},
                      {label:"중앙 정렬",align:"center"},
                      {label:"우측 정렬",align:"right"},
                    ].map(a=>(
                      <button key={a.label} onClick={async()=>{
                        save();
                        const fc=fcRef.current;if(!fc)return;
                        const mx=a.align==="left"?width*0.07:a.align==="right"?width*0.93:width/2;
                        const ox=a.align==="left"?"left":a.align==="right"?"right":"center";
                        for(let si=0;si<total;si++){
                          const sData=slidesRef.current[si];
                          if(!sData) {
                            if(initSlides[si]) { buildSlide(fc,initSlides[si],si); slidesRef.current[si]=fc.toJSON(); }
                            else continue;
                          }
                          await fc.loadFromJSON(slidesRef.current[si]);
                          fc.renderAll();
                          const texts=fc.getObjects().filter(o=>o.type==="textbox"&&o.name!=="bg");
                          let totalH=0;texts.forEach(o=>totalH+=o.calcTextHeight()+16);
                          let startY=height*0.9-totalH;
                          texts.forEach(o=>{o.set({left:mx,originX:ox,textAlign:a.align,top:startY,originY:"top"});startY+=o.calcTextHeight()+16;o.setCoords();});
                          fc.renderAll();
                          slidesRef.current[si]=fc.toJSON();
                        }
                        if(slidesRef.current[idx]) await fc.loadFromJSON(slidesRef.current[idx]);
                        fc.renderAll();
                      }} style={{padding:"7px 4px",borderRadius:6,border:"1px solid #7c6aff",background:"rgba(124,106,255,0.06)",cursor:"pointer",fontSize:10,fontWeight:700,color:"#7c6aff"}}>{a.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{borderBottom:"1px solid #eee",marginBottom:14}}/>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>텍스트 추가</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
                  {[
                    {label:"제목",opts:{fontSize:48,fontWeight:"bold"}},
                    {label:"소제목",opts:{fontSize:28,fontWeight:"700"}},
                    {label:"본문",opts:{fontSize:18}},
                    {label:"캡션",opts:{fontSize:14,opacity:0.7}},
                  ].map(t=>(
                    <button key={t.label} onClick={()=>addText(t.label,t.opts)}
                      style={{padding:"12px 8px",borderRadius:10,border:"1px solid #eee",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>
                      {t.label}
                    </button>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>
        )}

        {/* ── 캔버스 영역 (중앙, flex:1) ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* 상단 바 */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",background:"#fff",borderBottom:"1px solid #eee",flexShrink:0,minHeight:36}}>
            {total>1&&<>
              <button onClick={()=>go(idx-1)} disabled={idx===0} style={{...B,padding:"4px 10px",fontSize:14}}>◀</button>
              <span style={{fontSize:14,fontWeight:800,minWidth:40,textAlign:"center"}}>{idx+1}/{total}</span>
              <button onClick={()=>go(idx+1)} disabled={idx>=total-1} style={{...B,padding:"4px 10px",fontSize:14}}>▶</button>
              <div style={{width:1,height:18,background:"#ddd"}}/>
            </>}
            <select value={`${width}x${height}`} onChange={e=>{
              // 사이즈 전환은 현재 세션에서는 표시만 (실제 리사이즈는 새 에디터 필요)
            }} style={{fontSize:11,color:"#888",border:"1px solid #eee",borderRadius:6,padding:"3px 8px",background:"#fff",cursor:"default"}}>
              <option value={`${width}x${height}`}>{width}×{height}px</option>
            </select>
            <div style={{flex:1}}/>
            {sel&&sel.name!=="bg"&&<button onClick={del} style={{...B,color:"#ef4444",borderColor:"#fca5a5",fontSize:11}}>삭제</button>}
            <button onClick={exportPng} style={{background:"#7c6aff",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>PNG</button>
            {total>1&&<button onClick={exportAll} style={{background:"#333",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>ZIP</button>}
            <button onClick={exportPdf} style={{background:"#e74c3c",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>PDF</button>
            <button onClick={exportTxt} style={{background:"#27ae60",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>TXT</button>
            {onShareTemplate&&<button onClick={()=>{
              const fc=fcRef.current; if(!fc) return;
              if(!window.confirm("이 디자인을 커뮤니티에 공유할까요?")) return;
              const preview=fc.toDataURL({format:"png",multiplier:0.3});
              onShareTemplate(preview);
            }} style={{...B,color:"#10b981",borderColor:"#86efac",fontSize:11}}>공유</button>}
            <button onClick={()=>setCaptionOpen(!captionOpen)}
              style={{background:captionOpen?"#7c6aff":"#fff",color:captionOpen?"#fff":"#7c6aff",border:captionOpen?"none":"1.5px solid #7c6aff",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              AI 캡션
            </button>
            {onClose&&<button onClick={()=>setShowExitWarn(true)} style={{...B,fontSize:11}}>← 돌아가기</button>}
          </div>
          {/* 캔버스 */}
          <div ref={boxRef} style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",background:"#e8e8ee",overflow:"hidden",padding:10,minHeight:0}}/>
        </div>

        {/* ── 오른쪽 AI 캡션 패널 ── */}
        {captionOpen&&(
        <div style={{width:300,background:"#fafafa",borderLeft:"1px solid #eee",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #eee",flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:700,color:"#333"}}>AI 캡션</span>
            <button onClick={()=>setCaptionOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#aaa"}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
            {/* 말투 선택 */}
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>글타입</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5,marginBottom:14}}>
              {[
                {id:"professional",label:"전문적"},
                {id:"casual",label:"친근한"},
                {id:"witty",label:"위트있는"},
                {id:"emotional",label:"감성적"},
                {id:"informative",label:"정보전달"},
                {id:"marketing",label:"마케팅"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setCaptionTone(t.id)}
                  style={{padding:"8px 6px",borderRadius:8,border:captionTone===t.id?"2px solid #7c6aff":"1px solid #eee",
                    background:captionTone===t.id?"rgba(124,106,255,0.08)":"#fff",
                    color:captionTone===t.id?"#7c6aff":"#555",fontSize:12,fontWeight:captionTone===t.id?700:500,cursor:"pointer"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 이모티콘 토글 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #eee"}}>
              <span style={{fontSize:12,fontWeight:600,color:"#555"}}>이모티콘 사용</span>
              <button onClick={()=>setCaptionEmoji(!captionEmoji)}
                style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",
                  background:captionEmoji?"#7c6aff":"#ddd",transition:"background 0.2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,
                  left:captionEmoji?23:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
              </button>
            </div>

            {/* 생성 버튼 */}
            <button disabled={captionLoading} onClick={async()=>{
              setCaptionLoading(true);
              try {
                // 슬라이드 텍스트 수집
                const slideTexts = (initSlides||[]).map((s,i)=>
                  `[${i+1}] ${s.title||""} ${s.subtitle||""} ${s.body||""} ${s.highlight||""}`
                ).join("\n");
                const toneMap = {professional:"전문적이고 신뢰감 있는",casual:"친근하고 대화하는 듯한",witty:"위트있고 재미있는",emotional:"감성적이고 공감을 이끄는",informative:"정보 전달 중심의 명확한",marketing:"행동을 유도하는 마케팅"};
                const toneDesc = toneMap[captionTone] || "전문적인";
                const emojiInst = captionEmoji ? "이모티콘을 적절히 활용해주세요." : "이모티콘은 사용하지 마세요.";
                const prompt = `인스타그램 카드뉴스 캡션을 작성해주세요.

카드뉴스 내용:
${slideTexts}

조건:
- ${toneDesc} 말투로 작성
- ${emojiInst}
- 해시태그 5~8개 포함
- 캡션 길이: 3~5문장
- 줄바꿈으로 가독성 높게
- 마지막에 행동 유도(CTA) 한 줄 포함

캡션만 출력하세요.`;
                const result = await callAI("claude-haiku-4-5",[{role:"user",content:prompt}],800);
                setCaptionText(result?.trim()||"");
              } catch(e) { setCaptionText("캡션 생성 오류: "+(e.message||e)); }
              setCaptionLoading(false);
            }} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",cursor:captionLoading?"not-allowed":"pointer",
              background:captionLoading?"#ccc":"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,
              marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {captionLoading?(
                <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>
              ):(
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>캡션 생성</>
              )}
            </button>

            {/* 결과 */}
            {captionText&&(
              <div style={{position:"relative"}}>
                <textarea value={captionText} onChange={e=>setCaptionText(e.target.value)}
                  rows={16} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid #ddd",fontSize:13,lineHeight:1.7,
                    resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:"#fff",minHeight:280}}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button onClick={()=>{navigator.clipboard.writeText(captionText);}}
                    style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:"#555"}}>
                    복사
                  </button>
                  <button onClick={()=>setCaptionText("")}
                    style={{padding:"8px 12px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:12,color:"#888"}}>
                    지우기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* 나가기 경고 팝업 */}
        {showExitWarn&&(
          <div style={{position:"absolute",inset:0,zIndex:100,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",maxWidth:360,width:"90%",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
              <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
              <div style={{fontSize:16,fontWeight:800,color:"#1a1a2e",marginBottom:8}}>정말 나가시겠습니까?</div>
              <div style={{fontSize:13,color:"#666",lineHeight:1.7,marginBottom:20}}>
                저장하지 않은 작업은 사라지며,<br/>
                <b style={{color:"#ef4444"}}>사용한 포인트는 복구되지 않습니다.</b>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowExitWarn(false)}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid #ddd",background:"#fff",color:"#333",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  계속 작업하기
                </button>
                <button onClick={()=>{setShowExitWarn(false);onClose();}}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"#ef4444",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
