import { useState, useEffect, useRef, useMemo } from "react";
import { supabase, uploadFileToStorage } from "./storage";
import { useI18n } from "./i18n.jsx";
import { KlipyButton } from "./KlipyPicker";
import { searchGifs as klipySearch, trendingGifs as klipyTrending, getMediaUrl as klipyMediaUrl } from "./klipyClient";

/* ════════════════════════════════════════════════════════════
   BoardComponents - 게시판 하위 컴포넌트
   FreeMediaSearch, RichEditor, RichBody, WriteForm, MediaCard
════════════════════════════════════════════════════════════ */

const SB_STORAGE = (import.meta.env.VITE_SUPABASE_URL || "") + "/storage/v1";
function toThumb(url, w=400, h=300) {
  if (!url || typeof url !== "string") return url;
  if (url.includes(SB_STORAGE + "/object/public/")) {
    const path = url.split("/object/public/")[1];
    return `${SB_STORAGE}/render/image/public/${path}?width=${w}&height=${h}&resize=cover&format=webp&quality=80`;
  }
  return url;
}
const isVideoUrl = url => /\.(mp4|mov|avi|mkv|webm|m4v)/i.test(url);
const isImageUrl = url => /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)/i.test(url);
const safeName = n => n.replace(/[^a-zA-Z0-9._-]/g, "_");

function buildSources() {
  const s = [];
  s.push({ id:"giphy",     label:"Giphy GIF",      group:"gif"   });
  if (TENOR_KEY)    s.push({ id:"tenor",   label:"Tenor GIF",      group:"gif"   });
  if (USE_PIXABAY_PROXY) s.push({ id:"pixphoto",label:"Pixabay 사진",   group:"photo" });
  if (USE_PEXELS_PROXY)   s.push({ id:"pexphoto",label:"Pexels 사진",    group:"photo" });
  if (UNSPLASH_KEY) s.push({ id:"unsplash",label:"Unsplash",        group:"photo" });
  s.push({ id:"openverse", label:"Openverse",       group:"photo" });
  s.push({ id:"wikimedia", label:"Wikimedia",        group:"photo" });
  if (USE_PIXABAY_PROXY) s.push({ id:"pixvid",  label:"Pixabay 영상",   group:"video" });
  if (USE_PEXELS_PROXY)   s.push({ id:"pexvid",  label:"Pexels 영상",    group:"video" });
  s.push({ id:"nasa",      label:"NASA 우주",        group:"art"   });
  s.push({ id:"aic",       label:"시카고미술관",    group:"art"   });
  s.push({ id:"picsum",    label:"랜덤 사진",        group:"random" });
  return s;
}

function MediaCard({ item, isDark, bdr, C, onDl, dlId }) {
  const [hov, setHov] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef(null);
  const isVid = item.type === "video";
  const badge = { gif:"GIF", video:"VIDEO", image:null }[item.type];

  const handleMouseEnter = () => { setHov(true); setShowPreview(true); };
  const handleMouseLeave = () => { setHov(false); setShowPreview(false); };

  return (
    <div ref={cardRef} style={{borderRadius:10,overflow:"hidden",border:"1px solid "+bdr,
      background:isDark?"rgba(255,255,255,0.03)":"#f3f4f6",
      position:"relative",cursor:"pointer",aspectRatio:"1"}}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      onClick={()=>window.open(item.url,"_blank")}>
      {item.preview
        ? <img src={item.preview} alt={item.title} loading="lazy"
            style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
            onError={e=>{ e.target.style.display="none"; }}/>
        : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>
            {isVid?"영상":"이미지"}
          </div>
      }
      {badge && <div style={{position:"absolute",top:4,left:4,fontSize:9,padding:"2px 6px",
        borderRadius:4,background:"rgba(0,0,0,0.65)",color:"#fff",fontWeight:800}}>{badge}</div>}
      <div style={{position:"absolute",bottom:4,right:4,fontSize:9,padding:"1px 5px",
        borderRadius:4,background:"rgba(0,0,0,0.5)",color:"rgba(255,255,255,0.8)"}}>{item.src}</div>
      {hov && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <button onClick={e=>onDl(item,e)}
            style={{padding:"7px 14px",borderRadius:8,border:"none",
              background:"rgba(255,255,255,0.92)",color:"#ec4899",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {dlId===item.id?"저장중...":"저장"}
          </button>
        </div>
      )}
      {/* 호버 프리뷰 팝업 */}
      {showPreview && (
        <div style={{position:"fixed",zIndex:9999,pointerEvents:"none",
          top: (() => { const r = cardRef.current?.getBoundingClientRect(); return r ? Math.min(r.top, window.innerHeight - 380) : 100; })(),
          left: (() => { const r = cardRef.current?.getBoundingClientRect(); return r ? (r.right + 320 > window.innerWidth ? r.left - 320 : r.right + 10) : 200; })(),
          width:300,background:isDark?"rgba(15,12,41,0.97)":"#fff",border:"1px solid "+(isDark?"rgba(255,255,255,0.15)":"#ddd"),
          borderRadius:14,boxShadow:"0 12px 40px rgba(0,0,0,0.35)",overflow:"hidden"}}>
          {isVid && item.url ? (
            <video src={item.url} autoPlay muted loop playsInline
              style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block",background:"#000"}}/>
          ) : (
            <img src={item.preview||item.url} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}
              onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>
          )}
          <div style={{padding:"10px 12px"}}>
            <div style={{fontSize:12,fontWeight:700,color:isDark?"#fff":"#1a1a2e",marginBottom:4,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:10,color:isDark?"rgba(255,255,255,0.5)":"#888",lineHeight:1.8}}>
              <span>{item.src}</span>
              <span>{item.type==="gif"?"GIF":item.type==="video"?"영상":"사진"}</span>
              {item.credit && <span>{item.credit}</span>}
            </div>
            <div style={{fontSize:9,color:isDark?"rgba(255,255,255,0.3)":"#aaa",marginTop:4}}>
              클릭하면 원본 열기 · 저장 가능
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FreeMediaSearch({ C, isDark, bdr }) {
  const tenorCursor = useRef("");

  // 3탭: GIF / 사진 / 영상
  const TABS = [
    { id:"gif",   label:"GIF / 짤" },
    { id:"photo", label:"무료 사진" },
    { id:"video", label:"무료 영상" },
  ];
  const [tab, setTab] = useState("gif");
  const [inputVal, setInputVal] = useState("");
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState({});  // {sourceId: items[]}
  const [loading, setLoading] = useState(true);
  const [dlId, setDlId] = useState(null);

  // 탭별 소스 목록
  const tabSources = {
    gif: [
      { id:"klipy", label:"Klipy" },
      { id:"giphy", label:"Giphy" },
      ...(TENOR_KEY ? [{ id:"tenor", label:"Tenor" }] : []),
    ],
    photo: [
      ...(USE_PIXABAY_PROXY ? [{ id:"pixphoto", label:"Pixabay" }] : []),
      ...(USE_PEXELS_PROXY ? [{ id:"pexphoto", label:"Pexels" }] : []),
      ...(UNSPLASH_KEY ? [{ id:"unsplash", label:"Unsplash" }] : []),
      { id:"openverse", label:"Openverse" },
      { id:"wikimedia", label:"Wikimedia" },
      { id:"aic", label:"미술관" },
      { id:"nasa", label:"NASA" },
      { id:"picsum", label:"랜덤" },
    ],
    video: [
      ...(USE_PIXABAY_PROXY ? [{ id:"pixvid", label:"Pixabay" }] : []),
      ...(USE_PEXELS_PROXY ? [{ id:"pexvid", label:"Pexels" }] : []),
    ],
  };

  const fetchSource = async (sourceId, q) => {
    const fns = {
      klipy:    async ()=>{
        try {
          const raw = q ? await klipySearch(q, 1) : await klipyTrending(1);
          const list = Array.isArray(raw) ? raw : (raw?.results || raw?.data || []);
          const items = list.map(g => {
            const thumb = klipyMediaUrl(g, "sm") || klipyMediaUrl(g, "xs") || g.url || "";
            const full = klipyMediaUrl(g, "md") || klipyMediaUrl(g, "sm") || g.url || "";
            return { thumb, full, title: g.title || "", type: "gif", source: "Klipy" };
          }).filter(x => x.thumb);
          return { items, next: "" };
        } catch(e) { console.warn("Klipy fetch error:", e); return { items: [], next: "" }; }
      },
      giphy:    ()=>fetchGiphyData(q, 0),
      tenor:    ()=>fetchTenorData(q, ""),
      pixphoto: ()=>fetchPixabayPhotos(q||"nature", 1),
      pixvid:   ()=>fetchPixabayVideos(q||"nature", 1),
      pexphoto: ()=>fetchPexelsPhotos(q, 1),
      pexvid:   ()=>fetchPexelsVideos(q, 1),
      unsplash: ()=>fetchUnsplash(q, 1),
      picsum:   ()=>fetchPicsum(1),
      openverse:()=>fetchOpenverse(q||"nature", 1),
      aic:      ()=>fetchArtChicago(q, 1),
      nasa:     ()=>fetchNASA(1),
      wikimedia:()=>fetchWikimedia(q||"nature", 1),
    };
    try { return await (fns[sourceId]||fns.giphy)(); }
    catch { return {items:[],next:""}; }
  };

  // 모든 소스 병렬 로드
  const loadAll = async (q) => {
    setLoading(true);
    tenorCursor.current = "";
    const sources = tabSources[tab] || [];
    const results = await Promise.allSettled(sources.map(s => fetchSource(s.id, q)));
    const map = {};
    sources.forEach((s, i) => {
      const r = results[i];
      map[s.id] = r.status === "fulfilled" ? r.value.items : [];
      if (s.id === "tenor" && r.status === "fulfilled") tenorCursor.current = r.value.next;
    });
    setAllItems(map);
    setLoading(false);
  };

  useEffect(() => {
    setAllItems({}); setQuery(""); setInputVal("");
    loadAll("");
  }, [tab]);

  const doSearch = () => { setQuery(inputVal); loadAll(inputVal); };

  const download = async (item, e) => {
    e.stopPropagation(); setDlId(item.id);
    const ext = item.type==="gif" ? ".gif" : item.type==="video" ? ".mp4" : ".jpg";
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (item.title||"file").slice(0,30) + ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { window.open(item.url, "_blank"); }
    setDlId(null);
  };

  const sources = tabSources[tab] || [];
  const totalItems = sources.reduce((sum, s) => sum + (allItems[s.id]?.length||0), 0);

  return (
    <div>
      {/* 3탭 */}
      <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:"2px solid "+bdr}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:14,fontWeight:tab===t.id?800:500,
              background:"transparent",
              color:tab===t.id?(isDark?"#a5b4fc":"#7c6aff"):C.muted,
              borderBottom:tab===t.id?"3px solid #7c6aff":"3px solid transparent",
              transition:"all 0.15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 검색창 */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={inputVal} onChange={e=>setInputVal(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&doSearch()} placeholder="키워드로 검색 (예: 풍경, 음식, 사람...)"
          style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid "+bdr,
            background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:13,outline:"none"}}/>
        <button onClick={doSearch} disabled={loading}
          style={{padding:"10px 20px",borderRadius:10,border:"none",
            background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,
            cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1,whiteSpace:"nowrap",flexShrink:0}}>
          {loading?"검색중...":"검색"}
        </button>
      </div>

      {loading && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
          {Array.from({length:12}).map((_,i)=>(
            <div key={i} style={{aspectRatio:"1",borderRadius:10,background:isDark?"rgba(255,255,255,0.04)":"#f0f0f6",
              border:"1px solid "+bdr,animation:"pulse 1.5s ease-in-out infinite"}}/>
          ))}
        </div>
      )}

      {!loading && totalItems===0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
          <div style={{fontSize:14,color:"#94a3b8",marginBottom:8,fontWeight:600}}>{tab==="gif"?"GIF":"사진"}</div>
          <div style={{fontSize:14,fontWeight:700}}>결과가 없어요</div>
          <div style={{fontSize:12,marginTop:4}}>다른 키워드로 검색해보세요</div>
        </div>
      )}

      {/* 소스별 섹션으로 표시 */}
      {!loading && sources.map(s => {
        const items = allItems[s.id] || [];
        if (items.length === 0) return null;
        return (
          <div key={s.id} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:800,color:C.text}}>{s.label}</span>
              <span style={{fontSize:11,color:C.muted}}>{items.length}개</span>
              <div style={{flex:1,height:1,background:bdr}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
              {items.slice(0,12).map((item,i)=>(
                <MediaCard key={item.id||i} item={item} isDark={isDark} bdr={bdr} C={C} onDl={download} dlId={dlId}/>
              ))}
            </div>
          </div>
        );
      })}

      {/* 이용 가이드 */}
      <div style={{marginTop:16,padding:"14px 16px",borderRadius:12,
        background:isDark?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.04)",
        border:"1px solid "+(isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.1)")}}>
        <div style={{fontSize:13,fontWeight:800,color:isDark?"#a5b4fc":"#7c6aff",marginBottom:8}}>이용 가이드</div>
        <div style={{fontSize:12,color:C.muted,lineHeight:2}}>
          <b style={{color:C.text}}>저장</b> — 이미지/GIF를 PC에 바로 다운로드<br/>
          <b style={{color:C.text}}>클릭</b> — 원본 사이트에서 고해상도로 보기<br/>
          <b style={{color:C.text}}>검색</b> — 키워드를 입력하면 모든 소스에서 동시 검색<br/>
          <b style={{color:C.text}}>마우스 올리기</b> — 이미지 확대 프리뷰 + 상세 정보 확인
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:8,opacity:0.6,lineHeight:1.8}}>
          Pixabay / Pexels: 무료 상업적 이용 가능 (별도 출처 표기 불요)<br/>
          Giphy / Tenor: GIF 공유 목적, 상업적 이용 시 출처 표기 권장<br/>
          Openverse / Wikimedia: CC 라이선스, 출처 표기 필수<br/>
          NASA / 미술관: 퍼블릭 도메인, 자유롭게 사용 가능
        </div>
      </div>
    </div>
  );
}

/* ─── 리치 텍스트 에디터 ───────────────────────────────────── */
function RichEditor({ value, onChange, isDark }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const exec = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    onChange(editorRef.current.innerHTML);
  };

  const insertEmoji = (emoji) => {
    editorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    onChange(editorRef.current.innerHTML);
  };

  const insertTable = () => {
    const rows = parseInt(prompt("행 수?", "3") || "3");
    const cols = parseInt(prompt("열 수?", "3") || "3");
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += '<td style="border:1px solid #555;padding:8px 12px;min-width:60px">&nbsp;</td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table><br>";
    exec("insertHTML", html);
  };

  const insertImage = () => {
    const url = prompt("이미지 URL을 입력하세요:");
    if (url) exec("insertHTML", `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0" alt=""/>`);
  };

  const insertVideo = () => {
    const url = prompt("유튜브 URL을 입력하세요:");
    if (!url) return;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) {
      exec("insertHTML", `<div style="margin:12px 0;border-radius:12px;overflow:hidden;max-width:560px"><iframe src="https://www.youtube.com/embed/${m[1]}" style="width:100%;height:315px;border:none" allowfullscreen></iframe></div>`);
    } else {
      alert("유효한 유튜브 URL이 아닙니다");
    }
  };

  const insertLink = () => {
    const url = prompt("링크 URL:");
    const text = prompt("링크 텍스트:", url);
    if (url) exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#7c6aff">${text||url}</a>`);
  };

  const EMOJIS = ["😀","😂","🥰","😎","🤔","😅","🔥","✅","❌","💡","📌","🎉","👍","👏","💯","🙏","⭐","💎","🚀","💬"];

  const [showEmoji, setShowEmoji] = useState(false);
  const [fontSize, setFontSize] = useState("3");

  const edBdr = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const edBg  = isDark ? "#1a1a2e" : "#f9f9fc";
  const edTxt = isDark ? "#e0e0e0" : "#1a1730";
  const btnClr = isDark ? "#ccc" : "#555";
  const tbBdr = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const tbBg  = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const ToolBtn = ({ onClick, title, children, active }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick(); }} title={title}
      style={{ padding:"5px 9px", border:"none", borderRadius:6, background: active?"rgba(99,102,241,0.25)":"transparent",
        color:btnClr, cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", minWidth:28 }}
      onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.07)"}
      onMouseLeave={e=>e.currentTarget.style.background=active?"rgba(99,102,241,0.25)":"transparent"}>
      {children}
    </button>
  );

  const Divider = () => <div style={{width:1,height:20,background:isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)",margin:"0 3px"}}/>;

  return (
    <div style={{border:`1px solid ${edBdr}`,borderRadius:12,overflow:"visible",background:edBg}}>
      {/* 툴바 */}
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:2,padding:"8px 10px",borderBottom:`1px solid ${tbBdr}`,background:tbBg}}>
        {/* 텍스트 스타일 */}
        <ToolBtn onClick={()=>exec("bold")} title="굵게 (Ctrl+B)"><b>B</b></ToolBtn>
        <ToolBtn onClick={()=>exec("italic")} title="기울임 (Ctrl+I)"><i>I</i></ToolBtn>
        <ToolBtn onClick={()=>exec("underline")} title="밑줄 (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn onClick={()=>exec("strikeThrough")} title="취소선"><s>S</s></ToolBtn>
        <Divider/>
        {/* 폰트 크기 */}
        <select value={fontSize} onChange={e=>{setFontSize(e.target.value);exec("fontSize",e.target.value);}}
          style={{padding:"4px 6px",border:"none",borderRadius:6,background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",color:btnClr,fontSize:12,cursor:"pointer"}}>
          {[["1","작게"],["3","보통"],["5","크게"],["7","매우 크게"]].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Divider/>
        {/* 정렬 */}
        <ToolBtn onClick={()=>exec("justifyLeft")} title="왼쪽 정렬">≡</ToolBtn>
        <ToolBtn onClick={()=>exec("justifyCenter")} title="가운데 정렬">☰</ToolBtn>
        <ToolBtn onClick={()=>exec("justifyRight")} title="오른쪽 정렬">≡</ToolBtn>
        <Divider/>
        {/* 목록 */}
        <ToolBtn onClick={()=>exec("insertUnorderedList")} title="글머리 목록">• 목록</ToolBtn>
        <ToolBtn onClick={()=>exec("insertOrderedList")} title="번호 목록">1. 목록</ToolBtn>
        <Divider/>
        {/* 삽입 */}
        <ToolBtn onClick={insertImage} title="이미지 삽입">IMG</ToolBtn>
        <ToolBtn onClick={insertVideo} title="유튜브 동영상">▶</ToolBtn>
        <ToolBtn onClick={insertLink} title="링크 삽입">🔗</ToolBtn>
        <ToolBtn onClick={insertTable} title="표 삽입">⊞</ToolBtn>
        <Divider/>
        {/* 이모티콘 */}
        <div style={{position:"relative"}}>
          <ToolBtn onClick={()=>setShowEmoji(p=>!p)} title="이모티콘">😊</ToolBtn>
          {showEmoji && (
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:999,
              background:isDark?"#1e1c3a":"#fff",border:`1px solid ${edBdr}`,borderRadius:12,padding:10,
              display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,width:180,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
              {EMOJIS.map(e=>(
                <button key={e} type="button" onClick={()=>{insertEmoji(e);setShowEmoji(false);}}
                  style={{padding:"6px",border:"none",background:"transparent",cursor:"pointer",fontSize:18,borderRadius:6}}
                  onMouseEnter={ev=>ev.currentTarget.style.background="rgba(255,255,255,0.1)"}
                  onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <Divider/>
        {/* 실행취소/재실행 */}
        <ToolBtn onClick={()=>exec("undo")} title="실행취소">↩</ToolBtn>
        <ToolBtn onClick={()=>exec("redo")} title="다시실행">↪</ToolBtn>
        <ToolBtn onClick={()=>exec("removeFormat")} title="서식 지우기">✕ 서식</ToolBtn>
      </div>

      {/* 에디터 */}
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={e=>onChange(e.currentTarget.innerHTML)}
        onClick={()=>setShowEmoji(false)}
        data-placeholder="내용을 입력해주세요..."
        style={{minHeight:280,padding:"16px 18px",color:edTxt,fontSize:15,lineHeight:1.8,outline:"none",
          wordBreak:"break-word",overflowY:"auto"}}
      />

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: ${isDark?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.3)"}; pointer-events:none; }
        [contenteditable] table td { border: 1px solid ${isDark?"#555":"#ccc"}; padding: 8px 12px; }
        [contenteditable] a { color: #7c6aff; }
        [contenteditable] img { max-width: 100%; border-radius: 8px; }
        [contenteditable] ul { padding-left: 20px; }
        [contenteditable] ol { padding-left: 20px; }
      `}</style>
    </div>
  );
}

/* ─── 본문 렌더러 ─────────────────────────────────────────── */
function RichBody({ html, C }) {
  if (!html) return null;
  const isDark = !!(C.bg?.includes("0a")||C.bg?.includes("#10")||C.bg?.includes("242"));
  return (
    <>
      <div style={{fontSize:15,color:C.text,lineHeight:1.85,wordBreak:"break-word"}}
        dangerouslySetInnerHTML={{__html: html}}/>
      <div style={{marginTop:28,padding:"16px 18px",borderRadius:12,
        background:isDark?"rgba(124,106,255,0.06)":"rgba(124,106,255,0.04)",
        border:`1px solid ${isDark?"rgba(124,106,255,0.15)":"rgba(124,106,255,0.12)"}`,
        fontSize:13,color:isDark?"rgba(255,255,255,0.55)":"#666",lineHeight:1.7}}>
        <span style={{fontWeight:700,color:isDark?"#a5b4fc":"#7c6aff"}}>요청합니다</span>{" "}
        게시판에 원하는 자료 및 정보를 요청하시면 참고해서 더 많은 자료를 공유드립니다.
      </div>
    </>
  );
}

/* ─── 글쓰기 폼 ─────────────────────────────────────────── */
function WriteForm({ user, subCat, initial, onDone, onCancel, C, isDark, cats, allTags }) {
  const { t } = useI18n();
  const [title,         setTitle]        = useState(initial?.title || "");
  const [body,          setBody]         = useState(initial?.body  || "");
  const [pickedCat,     setPickedCat]    = useState(initial?.subCat || subCat || (cats[0]?.id || "info"));
  const [pickedTag,     setPickedTag]    = useState(initial?.tag || "");
  const [uploadedFiles, setUploadedFiles]= useState(
    (initial?.images || []).map(url => ({ url, type: isVideoUrl(url) ? "video" : "image" }))
  );
  const [uploading,     setUploading]    = useState(false);
  const [priceType,    setPriceType]    = useState(initial?.priceType || "free"); // "free" | "paid"
  const [price,        setPrice]        = useState(initial?.price || "");
  const fileInputRef = useRef(null);

  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#d1d5db";
  const sub = cats.find(s=>s.id===pickedCat) || cats[0];
  const tags = allTags[pickedCat] || [];

  const toWebP = (file) => new Promise(resolve => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      // 최대 1600px로 축소
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(objUrl);
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
      }, "image/webp", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); }; // 변환 실패 시 원본 사용
    img.src = objUrl;
  });

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name}: 파일 크기는 50MB 이하여야 합니다.`); continue; }
      try {
        let type = "file";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("video/")) type = "video";
        else if (file.type === "application/pdf") type = "pdf";
        // 이미지는 WebP로 변환 (PDF/문서/영상은 원본 유지)
        if (type === "image" && file.type !== "image/gif") {
          file = await toWebP(file);
        }
        const path = `posts/${Date.now()}_${safeName(file.name)}`;
        const url = await uploadFileToStorage(file, path);
        setUploadedFiles(prev => [...prev, { url, type, name: file.name }]);
      } catch(e) {
        alert(`${file.name} 업로드 실패: ${e.message}`);
      }
    }
    setUploading(false);
  };

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"28px 0 60px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
        <button type="button" onClick={onCancel} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:18,padding:0}}>←</button>
        <h2 style={{fontSize:20,fontWeight:900,color:C.text,margin:0}}>{initial?"글 수정":"새 글 작성"}</h2>
        {!initial&&<span style={{fontSize:12,color:"#4ade80",marginLeft:"auto"}}>글 등록 시 1P 적립!</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* 카테고리 선택 */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>카테고리 선택</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {cats.map(s=>(
              <button key={s.id} type="button" onClick={()=>{ setPickedCat(s.id); setPickedTag(""); }} style={{
                padding:"7px 16px", borderRadius:20, border:"2px solid "+(pickedCat===s.id ? s.color : bdr),
                background: pickedCat===s.id ? s.color+"22" : "transparent",
                color: pickedCat===s.id ? s.color : C.muted,
                fontSize:13, fontWeight: pickedCat===s.id ? 700 : 400, cursor:"pointer",
                transition:"all 0.15s",
              }}>{s.icon} {s.label}</button>
            ))}
          </div>
        </div>

        {/* 세부 태그 선택 (해당 카테고리에 태그가 있을 때만) */}
        {tags.length > 0 && (
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>세부 카테고리 <span style={{fontWeight:400}}>(선택)</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              <button type="button" onClick={()=>setPickedTag("")} style={{
                padding:"5px 14px", borderRadius:16, fontSize:12, cursor:"pointer",
                border:"1px solid "+(pickedTag==="" ? (sub?.color||"#7c6aff") : bdr),
                background: pickedTag==="" ? (sub?.color||"#7c6aff")+"18" : "transparent",
                color: pickedTag==="" ? (sub?.color||"#7c6aff") : C.muted, fontWeight: pickedTag===""?700:400,
              }}>전체</button>
              {tags.map(t=>(
                <button key={t.id} type="button" onClick={()=>setPickedTag(t.label)} style={{
                  padding:"5px 14px", borderRadius:16, fontSize:12, cursor:"pointer",
                  border:"1px solid "+(pickedTag===t.label ? (t.color||sub?.color||"#7c6aff") : bdr),
                  background: pickedTag===t.label ? (t.color||sub?.color||"#7c6aff")+"18" : "transparent",
                  color: pickedTag===t.label ? (t.color||sub?.color||"#7c6aff") : C.muted,
                  fontWeight: pickedTag===t.label ? 700 : 400,
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        )}

        <input placeholder="제목을 입력해주세요" value={title} maxLength={100} onChange={e=>setTitle(e.target.value)}
          style={{padding:"13px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:15,outline:"none"}}/>
        <RichEditor value={body} onChange={setBody} isDark={isDark}/>

        {/* 파일 첨부 */}
        <div style={{border:"1px solid "+bdr,borderRadius:12,padding:"14px 16px",background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:uploadedFiles.length>0?12:0}}>
            <span style={{fontSize:13,fontWeight:700,color:C.muted}}>+ 파일 첨부 <span style={{fontWeight:400,fontSize:11}}>(이미지·영상·PDF·문서, 최대 50MB)</span></span>
            <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading}
              style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.purpleL||"#7c6aff",fontSize:12,fontWeight:700,cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1}}>
              {uploading?"업로드 중...":"+ 파일 추가"}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.hwp,.txt"
              style={{display:"none"}} onChange={e=>handleFileUpload(e.target.files)}/>
          </div>
          {uploadedFiles.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {uploadedFiles.map((f,i)=>(
                <div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",border:"1px solid "+bdr}}>
                  {f.type==="video"
                    ? <div style={{width:90,height:68,background:isDark?"#1a1a2e":"#e5e7eb",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                        <span style={{fontSize:16}}>🎬</span>
                        <span style={{fontSize:9,color:C.muted,padding:"0 4px",textAlign:"center",wordBreak:"break-all",lineHeight:1.2}}>{(f.name||"video").slice(0,12)}</span>
                      </div>
                    : f.type==="pdf"
                    ? <div style={{width:90,height:68,background:isDark?"#1a1a2e":"#fef3c7",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                        <span style={{fontSize:16}}>📄</span>
                        <span style={{fontSize:9,color:C.muted,padding:"0 4px",textAlign:"center",wordBreak:"break-all",lineHeight:1.2}}>{(f.name||"pdf").slice(0,12)}</span>
                      </div>
                    : f.type==="file"
                    ? <div style={{width:90,height:68,background:isDark?"#1a1a2e":"#e5e7eb",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                        <span style={{fontSize:16}}>📎</span>
                        <span style={{fontSize:9,color:C.muted,padding:"0 4px",textAlign:"center",wordBreak:"break-all",lineHeight:1.2}}>{(f.name||"file").slice(0,12)}</span>
                      </div>
                    : <img src={f.url} alt="" style={{width:90,height:68,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>
                  }
                  <button type="button" onClick={()=>setUploadedFiles(prev=>prev.filter((_,j)=>j!==i))}
                    style={{position:"absolute",top:2,right:2,width:18,height:18,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Klipy GIF 삽입 */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <KlipyButton isDark={isDark} compact onSelect={(item)=>{
            if(item.url){
              const imgTag=`<img src="${item.url}" alt="${item.title||"GIF"}" style="max-width:100%;border-radius:8px;margin:8px 0"/>`;
              setBody(prev=>prev+imgTag);
            }
          }} />
          <span style={{fontSize:11,color:C.muted}}>GIF · 스티커 · 밈을 본문에 삽입</span>
        </div>

        {/* 자료실 유료/무료 선택 */}
        {pickedCat==="archive" && (
          <div style={{marginBottom:16,padding:"14px 18px",borderRadius:12,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>자료 유형</div>
            <div style={{display:"flex",gap:8,marginBottom:priceType==="paid"?12:0}}>
              {[["free","무료","#22c55e"],["paid","유료","#f59e0b"]].map(([v,l,c])=>(
                <button key={v} type="button" onClick={()=>setPriceType(v)}
                  style={{flex:1,padding:"10px 16px",borderRadius:10,border:`2px solid ${priceType===v?c:bdr}`,
                    background:priceType===v?c+"15":"transparent",
                    color:priceType===v?c:C.muted,fontSize:13,fontWeight:priceType===v?800:500,cursor:"pointer",transition:"all 0.15s"}}>
                  {v==="free"?"🆓 ":"💰 "}{l}
                </button>
              ))}
            </div>
            {priceType==="paid" && (
              <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="가격 입력 (예: 5,000원)"
                style={{width:"100%",padding:"10px 14px",borderRadius:9,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            )}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button type="button" onClick={onCancel} style={{padding:"11px 24px",borderRadius:10,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontWeight:600}}>{t("cancel")}</button>
          <button type="button" onClick={()=>{
            if(title.trim()&&body.replace(/<[^>]*>/g,"").trim()) onDone({title:title.trim(),body,subCat:pickedCat,tag:pickedTag,images:uploadedFiles.map(f=>f.url),
              ...(pickedCat==="archive"?{priceType,price:priceType==="paid"?price:""}:{})});
            else alert("제목과 내용을 입력해주세요.");
          }} style={{padding:"11px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:800}}>
            {initial?"수정 완료":"등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 썸네일·텍스트 추출 ─────────────────────────────────── */

function extractThumb(html) { const m = html?.match(/<img[^>]+src=["']([^"']+)/i); return m ? m[1] : null; }
function extractText(html, maxLen = 120) { const t = html?.replace(/<[^>]*>/g, '').trim() || ''; return t.length > maxLen ? t.slice(0, maxLen) + '...' : t; }

/* ─── Supabase 카테고리 CRUD ─────────────────────────────────── */
const ARCHIVE_CAT = { id: "archive", label: "자료실", icon: "", color: "#3b82f6" };

async function fetchBoardCats() {
  try {
    const { data } = await supabase.from("board_cats").select("*").order("order", { ascending: true });
    if (!data || data.length === 0) return DEFAULT_CATS;
    const cats = data.map(v => ({ ...v, key: v.id }));
    // 자료실이 Supabase에 없으면 삽입 후 추가
    if (!cats.find(c => c.id === "archive")) {
      supabase.from("board_cats").insert({ ...ARCHIVE_CAT, order: cats.length }).then(() => {});
      cats.push(ARCHIVE_CAT);
    }
    return cats;
  } catch { return DEFAULT_CATS; }
}
async function saveBoardCat(cat) {
  await supabase.from("board_cats").upsert(cat);
}
async function deleteBoardCat(id) {
  await supabase.from("board_cats").delete().eq("id", id);
}

/* ─── Supabase 세부 태그(Tag) CRUD ──────────────────────────── */
async function fetchTagsByCat(catId) {
  try {
    const { data } = await supabase.from("board_tags").select("*").eq("cat_id", catId).order("order", { ascending: true });
    return (data || []).map(v => ({ ...v, key: v.id }));
  } catch { return []; }
}
async function fetchAllTags() {
  try {
    const { data } = await supabase.from("board_tags").select("*");
    if (!data) return {};
    const result = {};
    data.forEach(tag => {
      if (!result[tag.cat_id]) result[tag.cat_id] = [];
      result[tag.cat_id].push({ ...tag, key: tag.id });
    });
    return result;
  } catch { return {}; }
}
async function saveTag(catId, tag) {
  await supabase.from("board_tags").upsert({ ...tag, cat_id: catId });
}
async function deleteTag(catId, tagId) {
  await supabase.from("board_tags").delete().eq("id", tagId);
}

/* ─── 무료 미디어 검색 (자료실용) ──────────────────────────── */
const GIPHY_KEY    = import.meta.env.VITE_GIPHY_KEY    || "";
const USE_PIXABAY_PROXY = true;
const USE_PEXELS_PROXY  = true;
const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_KEY || "";
const TENOR_KEY    = import.meta.env.VITE_TENOR_KEY    || "";

/* fetch helpers */
async function _get(url, headers={}) {
  const res = await fetch(url, Object.keys(headers).length ? { headers } : undefined);
  return res.json();
}

async function fetchGiphyData(q="", offset=0) {
  try {
    const url = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&offset=${offset}&rating=g&lang=ko`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&offset=${offset}&rating=g`;
    const d = await _get(url);
    return { items: (d.data||[]).map(g=>({ id:g.id, title:g.title||"GIF",
      url: g.images?.original?.url||g.images?.fixed_height?.url||"",
      preview: g.images?.fixed_height?.url||g.images?.original?.url||"",
      type:"gif", src:"GIPHY" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchTenorData(q="", pos="") {
  if (!TENOR_KEY) return {items:[],next:""};
  try {
    const base = q
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=24&media_filter=gif${pos?"&pos="+pos:""}`
      : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=24&media_filter=gif${pos?"&pos="+pos:""}`;
    const d = await _get(base);
    return { items: (d.results||[]).map(g=>({ id:g.id, title:g.content_description||"GIF",
      url: g.media_formats?.gif?.url||g.media_formats?.tinygif?.url||"",
      preview: g.media_formats?.tinygif?.url||g.media_formats?.gif?.url||"",
      type:"gif", src:"Tenor" })), next: d.next||"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPixabayPhotos(q="nature", page=1) {
  if (!USE_PIXABAY_PROXY) return {items:[],next:""};
  try {
    const d = await _get(`/api/proxy-pixabay?q=${encodeURIComponent(q)}&per_page=24&page=${page}&safesearch=true&image_type=photo`);
    return { items: (d.hits||[]).map(h=>({ id:h.id, title:h.tags,
      url:h.largeImageURL||h.webformatURL, preview:h.webformatURL||h.previewURL,
      type:"image", src:"Pixabay" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPixabayVideos(q="nature", page=1) {
  if (!USE_PIXABAY_PROXY) return {items:[],next:""};
  try {
    const d = await _get(`/api/proxy-pixabay?q=${encodeURIComponent(q)}&per_page=24&page=${page}&safesearch=true&video=true`);
    return { items: (d.hits||[]).map(h=>({ id:h.id, title:h.tags,
      url: h.videos?.medium?.url||h.videos?.small?.url||"",
      preview: h.videos?.tiny?.thumbnail||"", type:"video", src:"Pixabay" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPexelsPhotos(q="", page=1) {
  if (!USE_PEXELS_PROXY) return {items:[],next:""};
  try {
    const path = q ? "v1/search" : "v1/curated";
    const params = q ? `query=${encodeURIComponent(q)}&per_page=24&page=${page}` : `per_page=24&page=${page}`;
    const d = await _get(`/api/proxy-pexels?path=${path}&${params}`);
    return { items: (d.photos||[]).map(p=>({ id:p.id, title:p.photographer||"Pexels",
      url:p.src?.large2x||p.src?.large||"", preview:p.src?.medium||"",
      type:"image", src:"Pexels" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPexelsVideos(q="", page=1) {
  if (!USE_PEXELS_PROXY) return {items:[],next:""};
  try {
    const path = q ? "videos/search" : "videos/popular";
    const params = q ? `query=${encodeURIComponent(q)}&per_page=24&page=${page}` : `per_page=24&page=${page}`;
    const d = await _get(`/api/proxy-pexels?path=${path}&${params}`);
    return { items: (d.videos||[]).map(v=>({ id:v.id, title:v.user?.name||"Pexels Video",
      url: (v.video_files||[]).find(f=>f.quality==="hd")?.link||(v.video_files||[])[0]?.link||"",
      preview:v.image||"", type:"video", src:"Pexels" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchUnsplash(q="", page=1) {
  if (!UNSPLASH_KEY) return {items:[],next:""};
  try {
    const url = q
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&page=${page}&client_id=${UNSPLASH_KEY}`
      : `https://api.unsplash.com/photos?per_page=24&page=${page}&order_by=popular&client_id=${UNSPLASH_KEY}`;
    const d = await _get(url);
    const photos = q ? (d.results||[]) : (Array.isArray(d)?d:[]);
    return { items: photos.map(p=>({ id:p.id, title:p.description||p.alt_description||"Unsplash",
      url:p.urls?.full||p.urls?.regular||"", preview:p.urls?.regular||p.urls?.small||"",
      type:"image", src:"Unsplash" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPicsum(page=1) {
  try {
    const d = await _get(`https://picsum.photos/v2/list?page=${page}&limit=24`);
    return { items: (d||[]).map(p=>({ id:p.id, title:p.author||"Picsum",
      url:`https://picsum.photos/id/${p.id}/1200/800`,
      preview:`https://picsum.photos/id/${p.id}/400/300`,
      type:"image", src:"Picsum" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchOpenverse(q="nature", page=1) {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q||"nature")}&page_size=24&page=${page}&license_type=commercial,modification`;
    const d = await _get(url);
    return { items: (d.results||[]).map(p=>({ id:p.id||p.url, title:p.title||"Openverse",
      url: p.url||"", preview: p.thumbnail||p.url||"",
      type:"image", src:"Openverse", credit: p.creator||"" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchArtChicago(q="", page=1) {
  try {
    const from = (page-1)*24;
    const url = q
      ? `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&fields=id,title,image_id,artist_title&limit=24&from=${from}`
      : `https://api.artic.edu/api/v1/artworks?fields=id,title,image_id,artist_title&limit=24&page=${page}`;
    const d = await _get(url);
    const list = (d.data||[]).filter(a=>a.image_id);
    return { items: list.map(a=>({ id:String(a.id), title:a.title||"AIC",
      url:`https://www.artic.edu/iiif/2/${a.image_id}/full/1686,/0/default.jpg`,
      preview:`https://www.artic.edu/iiif/2/${a.image_id}/full/400,/0/default.jpg`,
      type:"image", src:"AIC 미술관", credit:a.artist_title||"" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchNASA(page=1) {
  try {
    const d = await _get(`https://api.nasa.gov/planetary/apod?count=24&api_key=DEMO_KEY&thumbs=true`);
    const list = Array.isArray(d) ? d : [];
    return { items: list.map((a,i)=>({ id:a.date||String(i), title:a.title||"NASA",
      url: a.media_type==="video" ? (a.thumbnail_url||"") : (a.hdurl||a.url||""),
      preview: a.media_type==="video" ? (a.thumbnail_url||"") : (a.url||""),
      type: a.media_type==="video" ? "video" : "image", src:"NASA" }))
      .filter(a=>a.preview), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchWikimedia(q="nature", page=1) {
  try {
    const offset = (page-1)*24;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl|mediatype|size&iiurlwidth=400&format=json&gsrlimit=24&gsroffset=${offset}&origin=*`;
    const d = await _get(url);
    const pages = Object.values(d?.query?.pages||{});
    return { items: pages.filter(p=>p.imageinfo?.[0]?.thumburl).map(p=>({
      id:String(p.pageid), title:p.title?.replace("File:","").replace(/\.[^.]+$/,"")||"Wikimedia",
      url: p.imageinfo[0].url||"",
      preview: p.imageinfo[0].thumburl||"",
      type: (p.imageinfo[0].mediatype||"").toLowerCase().includes("video") ? "video" : "image",
      src:"Wikimedia" })), next:"" };
  } catch { return {items:[],next:""}; }
}



export { buildSources, MediaCard, FreeMediaSearch, RichEditor, RichBody, WriteForm, extractThumb, extractText, toThumb, isVideoUrl, isImageUrl, safeName, ARCHIVE_CAT, fetchBoardCats, saveBoardCat, deleteBoardCat, fetchTagsByCat, fetchAllTags, saveTag, deleteTag, fetchGiphyData, fetchTenorData, fetchPixabayPhotos, fetchPixabayVideos, fetchPexelsPhotos, fetchPexelsVideos, fetchUnsplash, fetchPicsum, fetchOpenverse, fetchArtChicago, fetchNASA, fetchWikimedia };
