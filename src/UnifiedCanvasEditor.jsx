import React, { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, Textbox, Rect, Circle, FabricImage, Line } from "fabric";
import { callAI } from "./aiClient";

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
        const cx = obj.left + (obj.width * (obj.scaleX||1)) / 2;
        const cy = obj.top + (obj.height * (obj.scaleY||1)) / 2;
        // 가로 중앙
        if (Math.abs(cx - width/2) < SNAP) {
          obj.set("left", width/2 - (obj.width*(obj.scaleX||1))/2);
          addGuide(width/2, 0, width/2, height);
        }
        // 세로 중앙
        if (Math.abs(cy - height/2) < SNAP) {
          obj.set("top", height/2 - (obj.height*(obj.scaleY||1))/2);
          addGuide(0, height/2, width, height/2);
        }
        // 좌우 여백 (8%)
        const margin = width * 0.08;
        if (Math.abs(obj.left - margin) < SNAP) {
          obj.set("left", margin);
          addGuide(margin, 0, margin, height);
        }
        if (Math.abs(obj.left + (obj.width*(obj.scaleX||1)) - (width-margin)) < SNAP) {
          obj.set("left", width - margin - obj.width*(obj.scaleX||1));
          addGuide(width-margin, 0, width-margin, height);
        }
        fc.renderAll();
      });
      fc.on("object:modified", () => clearGuides());

      slidesRef.current = new Array(total).fill(null);
      if (initSlides[0]) buildSlide(fc, initSlides[0], 0);
      requestAnimationFrame(() => fit(fc, box));
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
        left:width*0.08, top:height*0.12, width:width*0.84,
        fontSize:16, fontWeight:"700", fill:s.textColor||"#000000",
        fontFamily:s.fontFamily||"Pretendard", opacity:0.6,
        textAlign:"center", name:"highlight",
      });
      fc.add(hl);
    }

    // 제목 — 정중앙 배치
    if (s.title) {
      const t = new Textbox(s.title, {
        left:width*0.08, top:height*0.3, width:width*0.84,
        fontSize:s.fontSize||42, fontWeight:"bold",
        fill:s.textColor||"#000000",
        fontFamily:s.fontFamily||"Pretendard",
        lineHeight:1.3, textAlign:"center", name:"title",
      });
      fc.add(t);
    }

    // 본문 — 제목 아래 중앙 배치
    if (s.body) {
      const b = new Textbox(s.body, {
        left:width*0.08, top:height*0.52, width:width*0.84,
        fontSize:Math.round((s.fontSize||42)*0.38),
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
    else if(type==="line") obj=new Line([width*0.2,height/2,width*0.8,height/2],{stroke:"#ffffff",strokeWidth:3});
    else if(type==="filled-rect") obj=new Rect({width:width,height:height*0.3,fill:"#7c6aff",left:0,top:height*0.7,rx:0,ry:0});
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
    };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[]);

  const B = {background:"none",border:"1px solid #ddd",borderRadius:6,padding:"5px 10px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12};

  /* ═══ RENDER ═══ */
  return (
    <div style={inline?{width:"100%",flex:1,display:"flex",overflow:"hidden"}:{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={inline?{width:"100%",height:"100%",display:"flex",background:"#fff"}:{width:"100%",maxWidth:1400,height:"95vh",background:"#fff",borderRadius:16,display:"flex",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>

        {/* 캔버스 영역 */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* 상단 */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"#fff",borderBottom:"1px solid #eee",flexShrink:0}}>
            {total>1&&<>
              <button onClick={()=>go(idx-1)} disabled={idx===0} style={B}>◀</button>
              <span style={{fontSize:13,fontWeight:700}}>{idx+1}/{total}</span>
              <button onClick={()=>go(idx+1)} disabled={idx>=total-1} style={B}>▶</button>
            </>}
            <div style={{flex:1}}/>
            {onClose&&<button onClick={onClose} style={{...B,fontSize:12}}>← 돌아가기</button>}
          </div>
          {/* 캔버스 */}
          <div ref={boxRef} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#e5e5ea",overflow:"hidden",padding:10}}/>
          {/* 하단: 내보내기만 */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"#fff",borderTop:"1px solid #eee",flexShrink:0}}>
            {sel&&<button onClick={del} style={{...B,color:"#ef4444",borderColor:"#fca5a5",fontSize:12}}>선택 삭제</button>}
            {onShareTemplate&&<button onClick={()=>{
              const fc=fcRef.current; if(!fc) return;
              if(!window.confirm("이 디자인을 커뮤니티에 공유할까요?")) return;
              const preview=fc.toDataURL({format:"png",multiplier:0.3});
              onShareTemplate(preview);
            }} style={{...B,color:"#10b981",borderColor:"#86efac",fontSize:12}}>공유</button>}
            <div style={{flex:1}}/>
            <button onClick={exportPng} style={{background:"#7c6aff",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>PNG</button>
            {total>1&&<button onClick={exportAll} style={{background:"#333",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>ZIP</button>}
          </div>
        </div>

        {/* 우측 패널 */}
        <div style={{width:280,background:"#fafafa",borderLeft:"1px solid #eee",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
          {/* 패널 탭 */}
          <div style={{display:"flex",borderBottom:"1px solid #eee",flexShrink:0}}>
            {[{id:"props",label:"속성"},{id:"layers",label:"레이어"},{id:"images",label:"이미지"},{id:"shapes",label:"도형/폰트"}].map(t=>(
              <button key={t.id} onClick={()=>setPanel(t.id)} style={{flex:1,padding:"10px 0",border:"none",borderBottom:panel===t.id?"2px solid #7c6aff":"2px solid transparent",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:panel===t.id?800:500,color:panel===t.id?"#7c6aff":"#888"}}>{t.label}</button>
            ))}
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

              {/* 텍스트 속성 */}
              {sel&&sel.type==="textbox"&&(
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

            {/* ─── 레이어 패널 ─── */}
            {panel==="layers"&&(
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>레이어 순서</div>
                <div style={{fontSize:11,color:"#888",marginBottom:10}}>위에 있을수록 앞에 표시됩니다. 드래그 또는 버튼으로 순서 변경</div>
                {(()=>{
                  const fc=fcRef.current; if(!fc) return null;
                  const objs=fc.getObjects().filter(o=>o.name!=="guide");
                  const list=[...objs].reverse(); // 위에 있을수록 앞
                  return list.length===0 ? (
                    <div style={{textAlign:"center",padding:20,color:"#ccc",fontSize:12}}>오브젝트가 없습니다</div>
                  ) : list.map((obj,i)=>{
                    const isActive = sel === obj;
                    const label = obj.name==="bg"?"배경 이미지" : obj.name==="title"?"제목" : obj.name==="body"?"본문" : obj.name==="highlight"?"부제목" : obj.type==="textbox"?`텍스트: ${(obj.text||"").slice(0,10)}` : obj.type==="rect"?"사각형" : obj.type==="circle"?"원" : obj.type==="line"?"선" : obj.type==="image"?"이미지" : "오브젝트";
                    const isBg = obj.name==="bg";
                    return (
                      <div key={i} onClick={()=>{if(!isBg){fc.setActiveObject(obj);fc.renderAll();syncSel(obj);}}}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:isBg?"default":"pointer",
                          background:isActive?"rgba(124,106,255,0.12)":"transparent",border:`1.5px solid ${isActive?"#7c6aff":"transparent"}`,
                          opacity:isBg?0.5:1}}>
                        <span style={{fontSize:14,width:20,textAlign:"center"}}>{obj.type==="textbox"?"T":obj.type==="rect"?"□":obj.type==="circle"?"○":obj.type==="line"?"—":obj.type==="image"?"🖼":"◆"}</span>
                        <span style={{flex:1,fontSize:12,fontWeight:isActive?700:400,color:isActive?"#7c6aff":"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
                        {!isBg&&(
                          <div style={{display:"flex",gap:2}}>
                            <button onClick={e=>{e.stopPropagation();fc.bringObjectForward(obj);fc.renderAll();setLayerTick(t=>t+1);}}
                              title="앞으로" style={{width:22,height:22,borderRadius:4,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                            <button onClick={e=>{e.stopPropagation();fc.sendObjectBackwards(obj);fc.renderAll();setLayerTick(t=>t+1);}}
                              title="뒤로" style={{width:22,height:22,borderRadius:4,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                {sel&&sel.name!=="bg"&&(
                  <div style={{borderTop:"1px solid #eee",paddingTop:10,marginTop:10,display:"flex",gap:6}}>
                    <button onClick={()=>{const fc=fcRef.current;if(fc&&sel){fc.bringObjectToFront(sel);fc.renderAll();}}} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600}}>맨 앞으로</button>
                    <button onClick={()=>{const fc=fcRef.current;if(fc&&sel){fc.sendObjectToBack(sel);fc.renderAll();}}} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #ddd",background:"#fff",cursor:"pointer",fontSize:11,fontWeight:600}}>맨 뒤로</button>
                  </div>
                )}
              </div>
            )}

            {/* ─── 이미지 패널 ─── */}
            {panel==="images"&&(
              <div style={{padding:"12px 16px"}}>
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
              </div>
            )}

            {/* ─── 도형/폰트 패널 ─── */}
            {panel==="shapes"&&(
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>도형 추가</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
                  {[
                    {type:"rect",label:"사각형",icon:"□"},
                    {type:"circle",label:"원",icon:"○"},
                    {type:"line",label:"선",icon:"—"},
                    {type:"filled-rect",label:"배경바",icon:"▬"},
                  ].map(s=>(
                    <button key={s.type} onClick={()=>addShape(s.type)}
                      style={{padding:"14px 8px",borderRadius:10,border:"1px solid #eee",background:"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <span style={{fontSize:22}}>{s.icon}</span>
                      <span style={{fontSize:10,color:"#888"}}>{s.label}</span>
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

                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>폰트 미리보기</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {FONTS.slice(0,12).map(f=>(
                    <button key={f} onClick={()=>{loadFont(f);addText("가나다 ABC",{fontFamily:f,fontSize:28});}}
                      style={{padding:"8px 12px",borderRadius:8,border:"1px solid #eee",background:"#fff",cursor:"pointer",fontFamily:f,fontSize:14,textAlign:"left"}}>
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
      </div>
    </div>
  );
}
