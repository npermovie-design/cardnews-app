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
  const [panelOpen, setPanelOpen] = useState(true);
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

      slidesRef.current = new Array(total).fill(null);
      if (initSlides[0]) buildSlide(fc, initSlides[0], 0);
      requestAnimationFrame(() => { fit(fc, box); pushHistory(); });
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
        const sc = Math.max(width/img.width, height/img.height);
        img.set({scaleX:sc,scaleY:sc,left:width/2,top:height/2,originX:"center",originY:"center",selectable:false,evented:false,name:"bg"});
        fc.insertAt(0,img); fc.renderAll();
      }).catch(()=>{});
    }

    // 하이라이트/뱃지 텍스트
    if (s.highlight || s.subtitle) {
      const hl = new Textbox(s.highlight || s.subtitle || "", {
        left:width/2, top:height*0.15, width:width*0.84,
        originX:"center", originY:"center",
        fontSize:16, fontWeight:"700", fill:s.textColor||"#000000",
        fontFamily:s.fontFamily||"Pretendard", opacity:0.6,
        textAlign:"center", name:"highlight",
      });
      fc.add(hl);
    }

    // 제목 — 정중앙 배치, 글씨에 맞는 너비
    if (s.title) {
      const titleFontSize = s.fontSize||42;
      // 글자 수 기반 너비 계산 (최소 40%, 최대 90%)
      const estW = Math.min(width*0.9, Math.max(width*0.4, s.title.length * titleFontSize * 0.7));
      const t = new Textbox(s.title, {
        left:width/2, top:height*0.38, width:estW,
        originX:"center", originY:"center",
        fontSize:titleFontSize, fontWeight:"bold",
        fill:s.textColor||"#000000",
        fontFamily:s.fontFamily||"Pretendard",
        lineHeight:1.3, textAlign:"center", name:"title",
      });
      fc.add(t);
    }

    // 본문 — 제목 아래 중앙 배치, 글씨에 맞는 너비
    if (s.body) {
      const bodyFontSize = Math.round((s.fontSize||42)*0.38);
      const estW = Math.min(width*0.9, Math.max(width*0.35, s.body.length * bodyFontSize * 0.65));
      const b = new Textbox(s.body, {
        left:width/2, top:height*0.58, width:estW,
        originX:"center", originY:"center",
        fontSize:bodyFontSize,
        fill:s.textColor||"#000000", opacity:0.85,
        fontFamily:s.fontFamily||"Pretendard",
        lineHeight:1.7, textAlign:"center", name:"body",
      });
      fc.add(b);
    }

    fc.renderAll();
  };

  /* ── 컨테이너 맞추기 ── */
  const fit = (fc, box) => {
    if(!fc||!box) return;
    const cw=box.clientWidth-20, ch=box.clientHeight-20;
    if(cw<=0||ch<=0) return;
    const s=Math.min(cw/width,ch/height,1);
    const w=box.querySelector(".canvas-container")||box.firstChild;
    if(w){w.style.transform=`scale(${s})`;w.style.transformOrigin="center center";}
  };

  useEffect(()=>{
    const fn=()=>{if(fcRef.current&&boxRef.current) fit(fcRef.current,boxRef.current);};
    window.addEventListener("resize",fn); return()=>window.removeEventListener("resize",fn);
  },[]);

  /* ── 선택 동기화 ── */
  const syncSel = (obj) => {
    if(!obj) return;
    setSel(obj);
    // 텍스트 선택 시 자동으로 속성 패널 열기
    if(obj.type==="textbox"||obj.type==="text") { setPanel("props"); setPanelOpen(true); }
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
    // 그라데이션 오버레이 (상하좌우 → 검은색 투명)
    else if(type==="grad-bottom") {
      obj=new Rect({width,height:height*0.5,left:0,top:height*0.5,selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height*0.5},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0.85)"}]}));
    }
    else if(type==="grad-top") {
      obj=new Rect({width,height:height*0.5,left:0,top:0,selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height*0.5},colorStops:[{offset:0,color:"rgba(0,0,0,0.85)"},{offset:1,color:"rgba(0,0,0,0)"}]}));
    }
    else if(type==="grad-left") {
      obj=new Rect({width:width*0.5,height,left:0,top:0,selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:width*0.5,y2:0},colorStops:[{offset:0,color:"rgba(0,0,0,0.85)"},{offset:1,color:"rgba(0,0,0,0)"}]}));
    }
    else if(type==="grad-right") {
      obj=new Rect({width:width*0.5,height,left:width*0.5,top:0,selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:width*0.5,y2:0},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0.85)"}]}));
    }
    else if(type==="grad-full") {
      obj=new Rect({width,height,left:0,top:0,selectable:true,evented:true,name:"gradient"});
      obj.set("fill",new Gradient({type:"linear",coords:{x1:0,y1:0,x2:0,y2:height},colorStops:[{offset:0,color:"rgba(0,0,0,0)"},{offset:0.4,color:"rgba(0,0,0,0)"},{offset:1,color:"rgba(0,0,0,0.7)"}]}));
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
    // 기존 배경 제거
    fc.getObjects().filter(o=>o.name==="bg").forEach(o=>fc.remove(o));
    FabricImage.fromURL(url,{crossOrigin:"anonymous"}).then(img=>{
      if(!img) return;
      const s=Math.max(width/img.width,height/img.height);
      img.set({scaleX:s,scaleY:s,left:width/2,top:height/2,originX:"center",originY:"center",selectable:false,evented:false,name:"bg"});
      fc.insertAt(0,img); fc.renderAll();
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

  /* ── 키보드 ── */
  useEffect(()=>{
    const fn=e=>{
      if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)||e.target.isContentEditable) return;
      if(e.key==="Delete"||e.key==="Backspace") del();
      if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();undo();}
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))){e.preventDefault();redo();}
    };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[]);

  const B = {background:"none",border:"1px solid #ddd",borderRadius:6,padding:"5px 10px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12};

  // 왼쪽 도구 아이콘 (미리캔버스 스타일 — SVG 아이콘)
  const SvgIcon = ({d, size=18}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
  const leftTools = [
    {id:"props",   icon:<SvgIcon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>, label:"속성"},
    {id:"shapes",  icon:<SvgIcon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>, label:"요소"},
    {id:"images",  icon:<SvgIcon d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z"/>, label:"사진"},
    {id:"layers",  icon:<SvgIcon d="M3 12h18M3 6h18M3 18h18"/>, label:"레이어"},
  ];

  /* ═══ RENDER ═══ */
  return (
    <div style={inline?(isFullscreen?{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"row",overflow:"hidden",background:"#fff"}:{width:"100%",flex:1,display:"flex",overflow:"hidden"}):{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={inline?{width:"100%",height:"100%",display:"flex",flexDirection:"row",background:"#fff",position:"relative"}:{width:"100%",maxWidth:1600,height:"95vh",background:"#fff",borderRadius:16,display:"flex",flexDirection:"row",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",position:"relative"}}>

        {/* ── 왼쪽 아이콘 바 ── */}
        <div style={{width:60,background:"#fff",borderRight:"1px solid #eee",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4,paddingBottom:4,flexShrink:0,overflowY:"auto",overflowX:"hidden"}}>
          {leftTools.map(t=>(
            <button key={t.id} onClick={()=>setPanel(panel===t.id&&panelOpen?null:t.id)||setPanelOpen(true)}
              style={{width:52,height:52,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,border:"none",borderRadius:6,cursor:"pointer",marginBottom:1,flexShrink:0,
                background:panel===t.id&&panelOpen?"rgba(124,106,255,0.12)":"transparent",
                borderLeft:panel===t.id&&panelOpen?"3px solid #7c6aff":"3px solid transparent",
                color:panel===t.id&&panelOpen?"#7c6aff":"#888",transition:"all 0.12s"}}>
              <span style={{fontSize:18,lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:600}}>{t.label}</span>
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

              {/* 디자인 템플릿 */}
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>디자인 템플릿</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                  {[
                    {label:"뉴스 하단",bg:"#1a1a2e",text:"#fff",layout:"bottom",grad:"grad-bottom"},
                    {label:"뉴스 상단",bg:"#0f172a",text:"#fff",layout:"top",grad:"grad-top"},
                    {label:"밝은 중앙",bg:"#ffffff",text:"#1a1a2e",layout:"center",grad:null},
                    {label:"어두운 중앙",bg:"#1c1c1e",text:"#ffffff",layout:"center",grad:null},
                    {label:"좌측 그라데이션",bg:"#0a0a0a",text:"#fff",layout:"left",grad:"grad-left"},
                    {label:"전체 오버레이",bg:"#111",text:"#fff",layout:"overlay",grad:"grad-full"},
                  ].map(tmpl=>(
                    <button key={tmpl.label} onClick={()=>{
                      const fc=fcRef.current; if(!fc) return;
                      setBg(tmpl.bg);
                      // 기존 텍스트 색상 일괄 변경
                      fc.getObjects().forEach(o=>{
                        if(o.type==="textbox"&&o.name!=="bg") o.set("fill",tmpl.text);
                      });
                      // 기존 그라데이션 제거
                      fc.getObjects().filter(o=>o.name==="gradient").forEach(o=>fc.remove(o));
                      // 그라데이션 추가
                      if(tmpl.grad) addShape(tmpl.grad);
                      // 레이아웃 재배치
                      const texts=fc.getObjects().filter(o=>o.type==="textbox"&&o.name!=="bg");
                      if(tmpl.layout==="bottom"&&texts.length>0){
                        texts.forEach((t,i)=>t.set("top",height*0.55+i*height*0.12));
                      } else if(tmpl.layout==="top"&&texts.length>0){
                        texts.forEach((t,i)=>t.set("top",height*0.08+i*height*0.12));
                      } else if(tmpl.layout==="center"&&texts.length>0){
                        const totalH=texts.length*height*0.12;
                        texts.forEach((t,i)=>t.set("top",(height-totalH)/2+i*height*0.12));
                      } else if(tmpl.layout==="left"&&texts.length>0){
                        texts.forEach(t=>{t.set("textAlign","left");t.set("left",width*0.06);t.set("width",width*0.5);});
                      }
                      fc.renderAll();
                    }} style={{padding:"10px 6px",borderRadius:8,border:"1px solid #eee",cursor:"pointer",fontSize:11,fontWeight:600,
                      background:tmpl.bg,color:tmpl.text,textAlign:"center"}}>
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 텍스트 속성 */}
              {sel&&(sel.type==="textbox"||sel.type==="text"||sel.isType?.("textbox"))&&(
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f0f0f0"}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>텍스트</div>
                  <select value={props.fontFamily} onChange={e=>{loadFont(e.target.value);set("fontFamily",e.target.value);}}
                    style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #ddd",fontSize:12,marginBottom:8}}>
                    {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  <div style={{fontSize:11,color:"#888",marginBottom:2}}>크기: {props.fontSize}px</div>
                  <input type="range" min={10} max={120} value={props.fontSize} onChange={e=>set("fontSize",+e.target.value)}
                    style={{width:"100%",accentColor:"#7c6aff",marginBottom:8}}/>
                  <div style={{fontSize:11,color:"#888",marginBottom:2}}>색상</div>
                  <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                    <input type="color" value={props.fill} onChange={e=>set("fill",e.target.value)}
                      style={{width:28,height:28,padding:0,border:"2px solid rgba(0,0,0,0.1)",borderRadius:6,cursor:"pointer"}}/>
                    {["#ffffff","#000000","#7c6aff","#ef4444","#f59e0b","#10b981","#ec4899","#6366f1"].map(c=>(
                      <button key={c} onClick={()=>set("fill",c)} style={{width:20,height:20,borderRadius:4,background:c,border:"1.5px solid rgba(0,0,0,0.15)",cursor:"pointer",padding:0}}/>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:3,marginBottom:8}}>
                    <button onClick={()=>set("fontWeight",props.fontWeight==="bold"?"normal":"bold")}
                      style={{...B,fontWeight:900,background:props.fontWeight==="bold"?"#7c6aff15":"transparent",borderColor:props.fontWeight==="bold"?"#7c6aff":"#ddd"}}>B</button>
                    <button onClick={()=>set("fontStyle",props.fontStyle==="italic"?"normal":"italic")}
                      style={{...B,fontStyle:"italic",background:props.fontStyle==="italic"?"#7c6aff15":"transparent",borderColor:props.fontStyle==="italic"?"#7c6aff":"#ddd"}}>I</button>
                    {["left","center","right"].map(a=>(
                      <button key={a} onClick={()=>set("textAlign",a)}
                        style={{...B,background:props.textAlign===a?"#7c6aff15":"transparent",borderColor:props.textAlign===a?"#7c6aff":"#ddd"}}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                          {a==="left"&&<><line x1="1" y1="3" x2="13" y2="3"/><line x1="1" y1="7" x2="9" y2="7"/><line x1="1" y1="11" x2="11" y2="11"/></>}
                          {a==="center"&&<><line x1="1" y1="3" x2="13" y2="3"/><line x1="3" y1="7" x2="11" y2="7"/><line x1="2" y1="11" x2="12" y2="11"/></>}
                          {a==="right"&&<><line x1="1" y1="3" x2="13" y2="3"/><line x1="5" y1="7" x2="13" y2="7"/><line x1="3" y1="11" x2="13" y2="11"/></>}
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#888",marginBottom:2}}>투명도: {Math.round(props.opacity)}%</div>
                  <input type="range" min={0} max={100} value={props.opacity} onChange={e=>set("opacity",+e.target.value/100)}
                    style={{width:"100%",accentColor:"#7c6aff",marginBottom:8}}/>
                  <div style={{fontSize:11,color:"#888",marginBottom:2}}>외곽선</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="color" value={props.stroke} onChange={e=>set("stroke",e.target.value)}
                      style={{width:24,height:24,padding:0,border:"1px solid #ddd",borderRadius:4,cursor:"pointer"}}/>
                    <input type="range" min={0} max={10} value={props.strokeWidth} onChange={e=>set("strokeWidth",+e.target.value)}
                      style={{flex:1,accentColor:"#7c6aff"}}/>
                    <span style={{fontSize:11,color:"#888"}}>{props.strokeWidth}px</span>
                  </div>
                </div>
              )}

              {/* 선택 삭제 */}
              {sel&&sel.name!=="bg"&&(
                <div style={{padding:"12px 16px"}}>
                  <button onClick={del} style={{width:"100%",padding:"10px",border:"none",borderRadius:8,background:"#ef4444",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>선택 삭제</button>
                </div>
              )}
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
                        {!isBg&&(
                          <div style={{display:"flex",gap:2}}>
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
                      <button key={a.label} onClick={()=>{const fc=fcRef.current;if(!fc||!sel)return;a.fn();fc.renderAll();syncSel(sel);}}
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
                    <div key={i} style={{borderRadius:8,overflow:"hidden",cursor:"pointer",border:"1px solid #eee",position:"relative"}}
                      onClick={()=>addImageUrl(img.full)}>
                      <img src={img.thumb} alt="" style={{width:"100%",height:80,objectFit:"cover",display:"block"}}/>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:9,padding:"2px 4px"}}>{img.source}</div>
                    </div>
                  ))}
                </div>
                {imgResults.length===0&&!imgLoading&&<div style={{textAlign:"center",padding:20,color:"#ccc",fontSize:12}}>키워드로 검색하세요</div>}

                {/* 자료실 이미지 + 검색 */}
                <div style={{borderTop:"1px solid #eee",marginTop:12,paddingTop:12}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>커뮤니티 자료실</div>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    <input placeholder="자료실 검색..." style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid #ddd",fontSize:12,outline:"none"}}
                      onKeyDown={async e=>{
                        if(e.key!=="Enter") return;
                        const kw=e.target.value.trim();
                        setImgLoading(true);
                        try{
                          let q=supabase.from("posts").select("id,title,images").eq("subCat","archive").order("created_at",{ascending:false}).limit(20);
                          if(kw) q=q.ilike("title",`%${kw}%`);
                          const {data}=await q;
                          const imgs=[];
                          (data||[]).forEach(p=>{try{const arr=typeof p.images==="string"?JSON.parse(p.images):p.images;if(Array.isArray(arr)) arr.forEach(u=>{if(typeof u==="string"&&u.startsWith("http")) imgs.push({thumb:u,full:u,source:"자료실: "+(p.title||"").slice(0,15)});});}catch{}});
                          setImgResults(prev=>[...imgs,...prev.filter(x=>!x.source?.startsWith("자료실"))]);
                        }catch{}
                        setImgLoading(false);
                      }}/>
                  </div>
                  <button onClick={async()=>{
                    setImgLoading(true);
                    try{
                      const {data}=await supabase.from("posts").select("id,title,images").eq("subCat","archive").order("created_at",{ascending:false}).limit(12);
                      const imgs=[];
                      (data||[]).forEach(p=>{
                        try{const arr=typeof p.images==="string"?JSON.parse(p.images):p.images;
                          if(Array.isArray(arr)) arr.forEach(u=>{if(typeof u==="string"&&u.startsWith("http")) imgs.push({thumb:u,full:u,source:"자료실: "+(p.title||"").slice(0,15)});});
                        }catch{}
                      });
                      setImgResults(prev=>[...prev,...imgs]);
                    }catch{}
                    setImgLoading(false);
                  }} style={{width:"100%",padding:"8px",borderRadius:8,border:"1px dashed #ccc",background:"transparent",cursor:"pointer",fontSize:12,color:"#666"}}>
                    자료실 이미지 불러오기
                  </button>
                </div>
              </div>
            )}

            {/* ─── 도형/폰트 패널 ─── */}
            {panel==="shapes"&&(
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>도형 추가</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
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
                      style={{padding:"12px 6px",borderRadius:10,border:"1px solid #eee",background:"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <span style={{fontSize:18}}>{s.icon}</span>
                      <span style={{fontSize:10,color:"#888"}}>{s.label}</span>
                    </button>
                  ))}
                </div>

                <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>그라데이션 오버레이</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16}}>
                  {[
                    {type:"grad-bottom",label:"하단→"},
                    {type:"grad-top",label:"상단→"},
                    {type:"grad-left",label:"좌측→"},
                    {type:"grad-right",label:"우측→"},
                    {type:"grad-full",label:"전체"},
                  ].map(g=>(
                    <button key={g.type} onClick={()=>addShape(g.type)}
                      style={{padding:"10px 6px",borderRadius:8,border:"1px solid #eee",background:"linear-gradient(180deg,transparent,rgba(0,0,0,0.6))",cursor:"pointer",fontSize:10,fontWeight:600,color:"#fff"}}>
                      {g.label}
                    </button>
                  ))}
                </div>

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

                <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>폰트 {sel&&sel.type==="textbox"?"(클릭 시 적용)":"미리보기"}</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {FONTS.slice(0,12).map(f=>(
                    <button key={f} onClick={()=>{loadFont(f);if(sel&&sel.type==="textbox"){set("fontFamily",f);}else{addText("가나다 ABC",{fontFamily:f,fontSize:28});}}}
                      style={{padding:"8px 12px",borderRadius:8,border:sel?.fontFamily===f?"2px solid #7c6aff":"1px solid #eee",background:sel?.fontFamily===f?"rgba(124,106,255,0.06)":"#fff",cursor:"pointer",fontFamily:f,fontSize:14,textAlign:"left"}}>
                      {f}
                    </button>
                  ))}
                </div>

                {/* AI 텍스트 생성 */}
                <div style={{borderTop:"1px solid #eee",paddingTop:14,marginTop:14}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>AI 글쓰기</div>
                  <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
                    placeholder="예: 직장인 번아웃 극복법 카드뉴스 제목 써줘&#10;예: 이 슬라이드에 맞는 본문 3줄 작성해줘"
                    rows={3} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #ddd",fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button disabled={aiLoading||!aiPrompt.trim()} onClick={async()=>{
                    setAiLoading(true);
                    try {
                      const txt = await callAI("claude-haiku-4-5",[{role:"user",content:`카드뉴스/콘텐츠 디자인용 텍스트를 작성해주세요. 짧고 임팩트있게.\n\n요청: ${aiPrompt}\n\n결과만 출력 (설명 없이 텍스트만)`}],300);
                      if(txt) addText(txt.trim(),{fontSize:24});
                    } catch(e) { alert("AI 오류: "+e.message); }
                    setAiLoading(false);
                  }} style={{width:"100%",marginTop:6,padding:"10px",borderRadius:8,border:"none",cursor:aiLoading||!aiPrompt.trim()?"not-allowed":"pointer",background:aiLoading?"#ccc":"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:13,fontWeight:700,opacity:aiLoading||!aiPrompt.trim()?0.6:1}}>
                    {aiLoading?"생성 중...":"AI 텍스트 생성"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── 캔버스 영역 (중앙, flex:1) ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* 상단 바 */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff",borderBottom:"1px solid #eee",flexShrink:0}}>
            {total>1&&<>
              <button onClick={()=>go(idx-1)} disabled={idx===0} style={B}>◀</button>
              <span style={{fontSize:13,fontWeight:700}}>{idx+1}/{total}</span>
              <button onClick={()=>go(idx+1)} disabled={idx>=total-1} style={B}>▶</button>
              <div style={{width:1,height:16,background:"#eee"}}/>
            </>}
            <select value={`${width}x${height}`} onChange={e=>{
              // 사이즈 전환은 현재 세션에서는 표시만 (실제 리사이즈는 새 에디터 필요)
            }} style={{fontSize:11,color:"#888",border:"1px solid #eee",borderRadius:6,padding:"3px 8px",background:"#fff",cursor:"default"}}>
              <option value={`${width}x${height}`}>{width}×{height}px</option>
            </select>
            <div style={{flex:1}}/>
            {sel&&sel.name!=="bg"&&<button onClick={del} style={{...B,color:"#ef4444",borderColor:"#fca5a5",fontSize:11}}>삭제</button>}
            <button onClick={exportPng} style={{background:"#7c6aff",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>PNG 저장</button>
            {total>1&&<button onClick={exportAll} style={{background:"#333",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>ZIP</button>}
            {onShareTemplate&&<button onClick={()=>{
              const fc=fcRef.current; if(!fc) return;
              if(!window.confirm("이 디자인을 커뮤니티에 공유할까요?")) return;
              const preview=fc.toDataURL({format:"png",multiplier:0.3});
              onShareTemplate(preview);
            }} style={{...B,color:"#10b981",borderColor:"#86efac",fontSize:11}}>공유</button>}
            {inline&&<button onClick={()=>setIsFullscreen(!isFullscreen)} title={isFullscreen?"축소":"전체화면"} style={{...B,fontSize:13,padding:"4px 8px"}}>{isFullscreen?"⊡":"⊞"}</button>}
            {isFullscreen&&<button onClick={()=>setIsFullscreen(false)} style={{background:"#7c6aff",color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>← 돌아가기</button>}
            {!isFullscreen&&onClose&&<button onClick={()=>setShowExitWarn(true)} style={{...B,fontSize:11}}>← 돌아가기</button>}
          </div>
          {/* 캔버스 */}
          <div ref={boxRef} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#e8e8ee",overflow:"hidden",padding:10}}/>
        </div>

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
