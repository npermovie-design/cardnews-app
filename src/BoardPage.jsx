import { useState, useMemo, useEffect, useRef } from "react";
import { getPosts, setPosts, changePoints, getPostsFromDB, getPostByIdFromDB, savePostToDB, updatePostInDB, deletePostFromDB, migrateLocalPostsToDB, uploadFileToStorage, supabase } from "./storage";
import { useI18n } from "./i18n.jsx";

/* ─── 기본 카테고리 (Supabase에 데이터 없을 때 폴백) ────────── */
const DEFAULT_CATS = [
  { id: "info",    label: "정보공유",   icon: "", color: "#7c6aff" },
  { id: "qna",     label: "질문답변",   icon: "", color: "#f59e0b" },
  { id: "free",    label: "자유게시판", icon: "", color: "#10b981" },
  { id: "review",  label: "사용후기",   icon: "", color: "#ec4899" },
  { id: "archive", label: "자료실",     icon: "", color: "#3b82f6" },
];

const isVideoUrl = url => /\.(mp4|mov|avi|mkv|webm|m4v)/i.test(url);
const isImageUrl = url => /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)/i.test(url);
const safeName   = n  => n.replace(/[^a-zA-Z0-9._-]/g, "_");

/* ── Supabase Storage → WebP 썸네일 URL 변환 ── */
const SB_STORAGE = "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1";
function toThumb(url, w=400, h=300) {
  if (!url || typeof url !== "string") return url;
  if (url.includes(SB_STORAGE + "/object/public/")) {
    const path = url.split("/object/public/")[1];
    return `${SB_STORAGE}/render/image/public/${path}?width=${w}&height=${h}&resize=cover&format=webp&quality=80`;
  }
  return url; // 외부 URL은 그대로
}

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
const GIPHY_KEY    = import.meta.env.VITE_GIPHY_KEY    || "dc6zaTOxFJmzC";
const PIXABAY_KEY2 = import.meta.env.VITE_PIXABAY_KEY  || "";
const PEXELS_KEY   = import.meta.env.VITE_PEXELS_KEY   || "";
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
  if (!PIXABAY_KEY2) return {items:[],next:""};
  try {
    const d = await _get(`https://pixabay.com/api/?key=${PIXABAY_KEY2}&q=${encodeURIComponent(q)}&per_page=24&page=${page}&safesearch=true&image_type=photo`);
    return { items: (d.hits||[]).map(h=>({ id:h.id, title:h.tags,
      url:h.largeImageURL||h.webformatURL, preview:h.webformatURL||h.previewURL,
      type:"image", src:"Pixabay" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPixabayVideos(q="nature", page=1) {
  if (!PIXABAY_KEY2) return {items:[],next:""};
  try {
    const d = await _get(`https://pixabay.com/api/videos/?key=${PIXABAY_KEY2}&q=${encodeURIComponent(q)}&per_page=24&page=${page}&safesearch=true`);
    return { items: (d.hits||[]).map(h=>({ id:h.id, title:h.tags,
      url: h.videos?.medium?.url||h.videos?.small?.url||"",
      preview: h.videos?.tiny?.thumbnail||"", type:"video", src:"Pixabay" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPexelsPhotos(q="", page=1) {
  if (!PEXELS_KEY) return {items:[],next:""};
  try {
    const url = q
      ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}`
      : `https://api.pexels.com/v1/curated?per_page=24&page=${page}`;
    const d = await _get(url, {Authorization: PEXELS_KEY});
    return { items: (d.photos||[]).map(p=>({ id:p.id, title:p.photographer||"Pexels",
      url:p.src?.large2x||p.src?.large||"", preview:p.src?.medium||"",
      type:"image", src:"Pexels" })), next:"" };
  } catch { return {items:[],next:""}; }
}

async function fetchPexelsVideos(q="", page=1) {
  if (!PEXELS_KEY) return {items:[],next:""};
  try {
    const url = q
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}`
      : `https://api.pexels.com/videos/popular?per_page=24&page=${page}`;
    const d = await _get(url, {Authorization: PEXELS_KEY});
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

/* ── 소스 목록 (키가 설정된 것만 활성화) ─── */
function buildSources() {
  const s = [];
  s.push({ id:"giphy",     label:"Giphy GIF",      group:"gif"   });
  if (TENOR_KEY)    s.push({ id:"tenor",   label:"Tenor GIF",      group:"gif"   });
  if (PIXABAY_KEY2) s.push({ id:"pixphoto",label:"Pixabay 사진",   group:"photo" });
  if (PEXELS_KEY)   s.push({ id:"pexphoto",label:"Pexels 사진",    group:"photo" });
  if (UNSPLASH_KEY) s.push({ id:"unsplash",label:"Unsplash",        group:"photo" });
  s.push({ id:"openverse", label:"Openverse",       group:"photo" });
  s.push({ id:"wikimedia", label:"Wikimedia",        group:"photo" });
  if (PIXABAY_KEY2) s.push({ id:"pixvid",  label:"Pixabay 영상",   group:"video" });
  if (PEXELS_KEY)   s.push({ id:"pexvid",  label:"Pexels 영상",    group:"video" });
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
              onError={e=>e.target.style.display="none"}/>
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
      { id:"giphy", label:"Giphy" },
      ...(TENOR_KEY ? [{ id:"tenor", label:"Tenor" }] : []),
    ],
    photo: [
      ...(PIXABAY_KEY2 ? [{ id:"pixphoto", label:"Pixabay" }] : []),
      ...(PEXELS_KEY ? [{ id:"pexphoto", label:"Pexels" }] : []),
      ...(UNSPLASH_KEY ? [{ id:"unsplash", label:"Unsplash" }] : []),
      { id:"openverse", label:"Openverse" },
      { id:"wikimedia", label:"Wikimedia" },
      { id:"aic", label:"미술관" },
      { id:"nasa", label:"NASA" },
      { id:"picsum", label:"랜덤" },
    ],
    video: [
      ...(PIXABAY_KEY2 ? [{ id:"pixvid", label:"Pixabay" }] : []),
      ...(PEXELS_KEY ? [{ id:"pexvid", label:"Pexels" }] : []),
    ],
  };

  const fetchSource = async (sourceId, q) => {
    const fns = {
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
  return (
    <div style={{fontSize:15,color:C.text,lineHeight:1.85,wordBreak:"break-word"}}
      dangerouslySetInnerHTML={{__html: html}}/>
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
        // 이미지는 WebP로 변환
        if (file.type.startsWith("image/") && file.type !== "image/gif") {
          file = await toWebP(file);
        }
        const path = `posts/${Date.now()}_${safeName(file.name)}`;
        const url = await uploadFileToStorage(file, path);
        const type = file.type.startsWith("video") ? "video" : "image";
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
            <span style={{fontSize:13,fontWeight:700,color:C.muted}}>+ 파일 첨부 <span style={{fontWeight:400,fontSize:11}}>(이미지·영상, 최대 50MB)</span></span>
            <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading}
              style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.purpleL||"#7c6aff",fontSize:12,fontWeight:700,cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1}}>
              {uploading?"업로드 중...":"+ 파일 추가"}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*"
              style={{display:"none"}} onChange={e=>handleFileUpload(e.target.files)}/>
          </div>
          {uploadedFiles.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {uploadedFiles.map((f,i)=>(
                <div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",border:"1px solid "+bdr}}>
                  {f.type==="video"
                    ? <div style={{width:90,height:68,background:isDark?"#1a1a2e":"#e5e7eb",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#3b82f6"}}>영상</span>
                        <span style={{fontSize:9,color:C.muted,padding:"0 4px",textAlign:"center",wordBreak:"break-all",lineHeight:1.2}}>{(f.name||"video").slice(0,12)}</span>
                      </div>
                    : <img src={f.url} alt="" style={{width:90,height:68,objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
                  }
                  <button type="button" onClick={()=>setUploadedFiles(prev=>prev.filter((_,j)=>j!==i))}
                    style={{position:"absolute",top:2,right:2,width:18,height:18,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
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
function extractThumb(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}
function extractText(html, maxLen = 120) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

/* ─── BoardPage 메인 ──────────────────────────────────────── */
export default function BoardPage({ user, C, onLoginRequest, initialCat, pendingPostId, onPendingPostClear, onNavigatePost, onUserUpdate }) {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const [subCat,  setSubCat]  = useState(initialCat || "info");
  const [subCats, setSubCats] = useState(DEFAULT_CATS);
  const [allTags, setAllTags] = useState({}); // { catId: [{id,label,color}] }
  const [posts,   setPostsS]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [view,    setView]    = useState(null);
  const [mode,    setMode]    = useState("list");
  const [comment, setComment] = useState("");
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("latest");
  const [page,    setPage]    = useState(1);
  const [toast,   setToast]   = useState("");
  const [filterTag,   setFilterTag]   = useState(""); // 세부 태그 필터
  const [archiveView, setArchiveView] = useState("posts"); // "posts" | "search"
  const [viewMode,    setViewMode]    = useState(() => initialCat==="archive" ? "gallery" : "list"); // "list" | "gallery" | "compact"
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(null); // { post, x, y }
  const archiveFileRef = useRef(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveUploadFile, setArchiveUploadFile] = useState(null);
  const [archiveForm, setArchiveForm] = useState({title:"",desc:"",priceType:"free",price:"",visibility:"all"});

  const handleArchiveUpload = async (files) => {
    if (!files || files.length === 0 || !user || user.role !== "admin") return;
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name}: 50MB 초과`); continue; }
      try {
        const path = `archive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const url = await uploadFileToStorage(file, path);
        const type = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "file";
        const newPost = {
          title: file.name.replace(/\.[^.]+$/, ""),
          body: `<p>${type === "video" ? "영상" : type === "image" ? "이미지" : "파일"} 자료</p>`,
          subCat: "archive", tag: "", images: [url],
          priceType: "free", price: "",
          nick: user.nick, date: new Date().toISOString().slice(0, 10),
          views: 0, likes: 0, comments: [],
        };
        await submitPost(newPost);
        showToast("자료가 등록됐어요!", "success");
      } catch (e) { alert(`${file.name} 업로드 실패: ${e.message}`); }
    }
    try { const db = await getPostsFromDB(); if(db?.length) { setPostsS(db.sort((a,b)=>b.id-a.id)); setPosts(db); } } catch{}
  };
  const snippetCache = useRef({}); // postId → snippet text
  const hoverTimer = useRef(null);
  const PER = 20;

  const isDark = !!(C.bg?.includes("0a")||C.bg?.includes("#10")||C.bg?.includes("242"));
  const bdr  = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const head = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
  const hover= isDark ? "rgba(255,255,255,0.03)" : "#f9fafb";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "#fff";

  const [translatedBody, setTranslatedBody] = useState(null);
  const [translating, setTranslating] = useState(false);
  const translatePost = async () => {
    if (!view || translating) return;
    const { lang: curLang } = window.__i18nLang || {};
    const targetLang = curLang === "ko" ? "en" : curLang === "en" ? "ko" : curLang || "en";
    const langNames = { ko:"한국어", en:"English", ja:"日本語", zh:"中文" };
    setTranslating(true);
    try {
      const { callAI } = await import("./aiClient");
      const txt = await callAI("claude-haiku-4-5", [{role:"user",content:`다음 글을 ${langNames[targetLang]||"English"}로 번역해주세요. 번역된 텍스트만 출력하세요:\n\n제목: ${view.title}\n\n${view.body?.replace(/<[^>]*>/g,"").slice(0,2000)}`}], 2000);
      setTranslatedBody(txt);
    } catch(e) { alert("번역 실패: " + e.message); }
    setTranslating(false);
  };

  const showToast = (msg,type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(""),3500);
  };

  useEffect(()=>{ if(initialCat) setSubCat(initialCat); },[initialCat]);

  // 카테고리 + 태그 로드
  useEffect(()=>{
    fetchBoardCats().then(cats => setSubCats(cats));
    fetchAllTags().then(tags => setAllTags(tags));
  }, []);

  // 반응형 감지
  useEffect(()=>{
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // 게시글 로드 - localStorage 즉시 표시 후 Supabase 백그라운드 갱신
  useEffect(()=>{
    // 1) localStorage 즉시 표시 (로딩 스피너 없음)
    const cached = getPosts();
    if (cached.length > 0) { setPostsS(cached); setLoading(false); }

    // 2) Supabase 백그라운드 조용히 갱신 — localStorage 포스트와 merge
    (async () => {
      try {
        const migrated = localStorage.getItem("nper_migrated_v1");
        if (!migrated) {
          try { await migrateLocalPostsToDB(); localStorage.setItem("nper_migrated_v1", "1"); } catch(e) {}
        }
        const dbData = await getPostsFromDB();
        if (dbData && dbData.length > 0) {
          // localStorage에만 있는 포스트(DB 저장 실패분)도 함께 표시
          const localPosts = getPosts();
          const dbIds = new Set(dbData.map(p => String(p.id)));
          const localOnly = localPosts.filter(p => !dbIds.has(String(p.id)));
          const merged = [...localOnly, ...dbData].sort((a, b) => b.id - a.id);
          setPostsS(merged);
          // localStorage도 merge 결과로 갱신
          setPosts(merged);
        }
      } catch(e) {}
      finally { setLoading(false); }
    })();
  }, []);

  // URL에서 특정 게시글 직접 열기
  useEffect(()=>{
    if(pendingPostId && posts.length > 0){
      const found = posts.find(p=>String(p.id)===String(pendingPostId));
      if(found){
        const updated = {...found, views:(found.views||0)+1};
        setPostsS(prev => prev.map(pp=>pp.id===found.id ? updated : pp));
        updatePostInDB(found.id, {views: updated.views});
        setView(updated);
        if(found.subCat||found.cat) setSubCat(found.subCat||found.cat);
      }
      if(onPendingPostClear) onPendingPostClear();
    }
  },[pendingPostId, posts]);

  // 로컬 state만 업데이트 (Supabase는 각 함수에서 직접 처리)
  const syncLocal = next => setPostsS(next);
  const own  = p=>user&&(user.nick===p.nick||user.role==="admin");

  const subInfo = subCats.find(s=>s.id===subCat)||subCats[0];
  const currentTags = allTags[subCat] || [];

  const filtered = useMemo(()=>{
    let list = posts.filter(p=>p.cat===subCat||p.subCat===subCat);
    if(filterTag) {
      if(subCat==="archive" && ["video","photo","gif","music"].includes(filterTag)) {
        list = list.filter(p => {
          const imgs = p.images || [];
          if(filterTag==="video") return imgs.some(u=>/\.(mp4|mov|avi|webm|mkv)/i.test(u));
          if(filterTag==="photo") return imgs.some(u=>/\.(jpg|jpeg|png|webp|avif|bmp)/i.test(u)) && !imgs.some(u=>/\.gif$/i.test(u));
          if(filterTag==="gif") return imgs.some(u=>/\.gif$/i.test(u));
          if(filterTag==="music") return imgs.some(u=>/\.(mp3|wav|ogg|flac|m4a|aac)/i.test(u));
          return true;
        });
      } else {
        list = list.filter(p=>p.tag===filterTag);
      }
    }
    if(search.trim()){ const q=search.toLowerCase(); list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.nick||"").toLowerCase().includes(q)); }
    return sort==="views"?[...list].sort((a,b)=>(b.views||0)-(a.views||0))
          :sort==="likes"?[...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
          :[...list].sort((a,b)=>b.id-a.id);
  },[posts,subCat,search,sort,filterTag]);

  const hotPosts = useMemo(()=>
    [...posts.filter(p=>p.cat===subCat||p.subCat===subCat)].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10),
  [posts,subCat]);
  const hotPostsAll = useMemo(()=>
    [...posts].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10),
  [posts]);

  // 자료실 탭: 첨부파일 있는 전체 게시물
  const archiveFiltered = useMemo(()=>{
    let list = posts.filter(p=>(p.images||[]).length>0);
    if(search.trim()){const q=search.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.nick||"").toLowerCase().includes(q));}
    return sort==="views"?[...list].sort((a,b)=>(b.views||0)-(a.views||0))
          :sort==="likes"?[...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
          :[...list].sort((a,b)=>b.id-a.id);
  },[posts,search,sort]);

  const isArchivePostsView = subCat==="archive" && archiveView==="posts";
  const activeFiltered = isArchivePostsView ? archiveFiltered : filtered;
  const totalPages=Math.ceil(activeFiltered.length/PER);
  const pageItems=activeFiltered.slice((page-1)*PER,page*PER);

  /* 글 등록 - Supabase 저장 + 1P 지급 */
  const submitPost = async ({title, body, subCat: formCat, tag, images, priceType, price}) => {
    if(!user){if(onLoginRequest)onLoginRequest();return;}
    const cat = formCat || subCat;
    const p={id:Date.now(),cat,subCat:cat,tag:tag||"",nick:user.nick,title,body,
             date:new Date().toLocaleDateString("ko-KR"),comments:[],views:0,likes:0,likedBy:[],
             images: Array.isArray(images) ? images : [],
             ...(priceType?{priceType,price:price||""}:{})};
    const nextPosts = [p, ...posts];
    syncLocal(nextPosts);
    setPosts(nextPosts); // 항상 localStorage에 저장 (Supabase 성공 여부 무관)
    setMode("list");
    setSubCat(cat); // 작성 후 해당 카테고리로 이동
    // Supabase 저장 (실패해도 localStorage에 이미 있으므로 무시)
    try {
      await savePostToDB(p);
    } catch(e) {
      console.warn("Supabase 저장 실패, localStorage에만 저장됨:", e?.message);
    }
    // 1P 지급
    if(user.uid){
      try {
        const newPts = await changePoints(user.uid, 1, "커뮤니티 글 작성");
        if(onUserUpdate) onUserUpdate({...user, points: newPts});
        showToast("글이 등록됐어요! +1P 포인트가 지급됐습니다","success");
      } catch(e) {
        showToast("글이 등록됐어요!","success");
      }
    } else {
      showToast("글이 등록됐어요!","success");
    }
  };

  const submitEdit = async ({title, body, subCat: newCat, tag, images}) => {
    const cat = newCat || view.subCat || view.cat || subCat;
    const updated = {...view, title, body, subCat: cat, cat, tag: tag||"", edited:true, images: Array.isArray(images) ? images : (view.images||[])};
    const next = posts.map(p=>p.id===view.id ? updated : p);
    syncLocal(next);
    setPosts(next);
    setView(updated);
    setSubCat(cat); // 수정 후 변경된 카테고리로 이동
    setMode("list");
    try { await updatePostInDB(view.id, {title, body, subCat: cat, cat, tag: tag||"", edited:true, images: updated.images}); } catch(e){}
    showToast("글이 수정됐어요","success");
  };

  const del = async id => {
    if(!window.confirm("삭제하시겠습니까?"))return;
    const next = posts.filter(p=>p.id!==id);
    syncLocal(next);
    setPosts(next); // localStorage도 즉시 삭제
    setView(null); setMode("list");
    try { await deletePostFromDB(id); } catch(e){ console.warn("DB 삭제 실패:", e?.message); }
  };

  const openPost = async p => {
    const updated = {...p, views:(p.views||0)+1};
    const next = posts.map(pp=>pp.id===p.id ? updated : pp);
    syncLocal(next); setView(updated);
    const cat = p.subCat||p.cat||subCat;
    window.history.pushState(null,"","/community/"+cat+"/post-"+p.id);
    // SEO: 동적 title + meta description
    document.title = `${p.title} - SNS메이킷 커뮤니티`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = (p.body||"").replace(/<[^>]*>/g,"").slice(0,155);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${p.title} - SNS메이킷`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = (p.body||"").replace(/<[^>]*>/g,"").slice(0,155);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `https://www.snsmakeit.com/community/${cat}/post-${p.id}`;
    updatePostInDB(p.id, {views: updated.views}).catch(()=>{});
    // body가 없으면 Supabase에서 full post 로드
    if (!p.body) {
      const full = await getPostByIdFromDB(p.id);
      if (full) {
        const withBody = {...updated, body: full.body, images: full.images||updated.images};
        setView(withBody);
        setPostsS(prev => prev.map(pp => pp.id===p.id ? {...pp, body: full.body} : pp));
      }
    }
  };

  // 추천 토글 - 게시글당 1회, 재클릭 시 취소
  const getUserKey = () => user ? (user.uid || user.nick || "user") : ("guest_" + (localStorage.getItem("nper_guest_key") || (() => { const k = Math.random().toString(36).slice(2); localStorage.setItem("nper_guest_key", k); return k; })()));
  const like = id => {
    const uKey = getUserKey();
    const next = posts.map(p => {
      if (p.id !== id) return p;
      const likedBy = p.likedBy || [];
      const alreadyLiked = likedBy.includes(uKey);
      return {
        ...p,
        likes: alreadyLiked ? Math.max(0, (p.likes||0)-1) : (p.likes||0)+1,
        likedBy: alreadyLiked ? likedBy.filter(k=>k!==uKey) : [...likedBy, uKey]
      };
    });
    const updated = next.find(p=>p.id===id);
    syncLocal(next); setView(updated);
    updatePostInDB(id, {likes: updated.likes, likedBy: updated.likedBy}).catch(()=>{});
  };
  const isLiked = (post) => {
    if (!post) return false;
    const uKey = getUserKey();
    return (post.likedBy||[]).includes(uKey);
  };

  const addComment = async postId => {
    if(!user){if(onLoginRequest)onLoginRequest();return;}
    if(!comment.trim())return;
    const newComment = {id:Date.now(),nick:user.nick,text:comment,date:new Date().toLocaleDateString("ko-KR")};
    const next = posts.map(p=>p.id===postId?{...p,comments:[...(p.comments||[]),newComment]}:p);
    const updated = next.find(p=>p.id===postId);
    syncLocal(next); setView(updated); setComment("");
    try { await updatePostInDB(postId, {comments: updated.comments}); } catch(e){}
  };

  const delComment = async (postId,idx) => {
    if(!window.confirm("댓글을 삭제할까요?"))return;
    const next = posts.map(p=>p.id===postId?{...p,comments:(p.comments||[]).filter((_,i)=>i!==idx)}:p);
    const updated = next.find(p=>p.id===postId);
    syncLocal(next); setView(updated);
    try { await updatePostInDB(postId, {comments: updated.comments}); } catch(e){}
  };

  /* 공유 */
  const sharePost = post => {
    const url = window.location.origin + "/community/"+(p.subCat||p.cat||subCat)+"/post-"+p.id;
    if(navigator.share){ navigator.share({title:post.title,text:post.title,url}); }
    else { navigator.clipboard.writeText(url); showToast("🔗 링크가 복사됐어요","info"); }
  };

  /* 파일 다운로드 */
  const downloadFile = async (url) => {
    const ext = isVideoUrl(url) ? ".mp4" : isImageUrl(url) ? ".jpg" : ".bin";
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "download_" + Date.now() + ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, "_blank"); }
  };

  /* 인쇄 */
  const printPost = post => {
    const w = window.open("","_blank","width=800,height=600");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${post.title}</title>
      <style>body{font-family:sans-serif;padding:40px;line-height:1.8;max-width:750px;margin:0 auto}
      h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:12px}
      .meta{color:#666;font-size:13px;margin-bottom:24px}
      img{max-width:100%}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:8px}</style>
    </head><body><h1>${post.title}</h1>
    <div class="meta">${post.nick} · ${post.date} · 조회 ${post.views||0}</div>
    <div>${post.body}</div></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  if(mode==="write"||mode==="edit") return (
    <div style={{padding:"0 24px"}}>
      <WriteForm user={user} subCat={subCat} initial={mode==="edit"?view:null}
        onDone={mode==="edit"?submitEdit:submitPost} onCancel={()=>setMode("list")} C={C} isDark={isDark} cats={subCats} allTags={allTags}/>
    </div>
  );

  /* 상세 보기 */
  if(view) return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      {/* 토스트 */}
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#22c55e":"#7c6aff",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>{toast.msg}</div>}
      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px 60px"}}>
        <button onClick={()=>{setView(null);setTranslatedBody(null);window.history.pushState(null,"","/community/"+subCat);document.title="SNS메이킷 - 커뮤니티";}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,marginBottom:18,padding:0,fontWeight:600}}>← 목록으로</button>
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"24px 28px 20px",borderBottom:"1px solid "+bdr}}>
            {subInfo&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:subInfo.color+"20",color:subInfo.color,fontWeight:700,display:"inline-block",marginBottom:12}}>{subInfo.icon} {subInfo.label}</span>}
            <h1 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.4}}>{view.title}{view.edited&&<span style={{fontSize:11,color:C.muted,marginLeft:8,fontWeight:400}}>(수정됨)</span>}</h1>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:14,fontSize:13,color:C.muted}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{(view.nick||"?")[0].toUpperCase()}</div>
                  <span style={{fontWeight:700,color:C.text}}>{view.nick}</span>
                </div>
                <span>{view.date}</span><span>{view.views||0}</span><span>💬 {(view.comments||[]).length}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>sharePost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>🔗 공유</button>
                <button onClick={()=>printPost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>🖨 인쇄</button>
                <button onClick={translatePost} disabled={translating} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:translatedBody?"rgba(99,102,241,0.1)":"transparent",color:translatedBody?"#7c6aff":C.muted,fontSize:12,cursor:translating?"wait":"pointer"}}>
                  {translating?"번역중...":translatedBody?"✓ 번역됨":"🌐 번역"}
                </button>
                {own(view)&&<>
                  <button onClick={()=>setMode("edit")} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>수정</button>
                  <button onClick={()=>del(view.id)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.05)",color:"#ef4444",fontSize:12,cursor:"pointer"}}>{t("delete")}</button>
                </>}
              </div>
            </div>
          </div>
          <div style={{padding:"28px 28px 24px"}}>
            <RichBody html={view.body} C={C}/>
            {translatedBody && (
              <div style={{marginTop:16,padding:"16px 20px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.2)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#7c6aff"}}>🌐 번역 결과</span>
                  <button onClick={()=>setTranslatedBody(null)} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"1px solid rgba(99,102,241,0.3)",background:"transparent",color:"#7c6aff",cursor:"pointer"}}>닫기</button>
                </div>
                <div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{translatedBody}</div>
              </div>
            )}
            {/* 첨부 이미지/영상 */}
            {(view.images||[]).length > 0 && (
              <div style={{marginTop:24,borderTop:"1px solid "+bdr,paddingTop:20}}>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12}}>+ 첨부 파일 {view.images.length}개</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {view.images.map((url,i)=>
                    isVideoUrl(url) ? (
                      <div key={i}>
                        <video src={url} controls style={{width:"100%",maxWidth:640,borderRadius:10,border:"1px solid "+bdr,display:"block"}}/>
                        <a href={url} download style={{display:"inline-block",marginTop:6,fontSize:12,color:C.purpleL||"#7c6aff",textDecoration:"none"}}>다운로드</a>
                      </div>
                    ) : isImageUrl(url) ? (
                      <img key={i} src={toThumb(url,1200,900)} alt={`첨부${i+1}`} style={{maxWidth:"100%",borderRadius:10,border:"1px solid "+bdr,display:"block",cursor:"pointer"}}
                        onClick={()=>window.open(url,"_blank")} onError={e=>e.target.style.display="none"}/>
                    ) : (
                      <a key={i} href={url} download rel="noopener noreferrer"
                        style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.04)":"#f8f8fb",color:C.text,textDecoration:"none",fontSize:13,fontWeight:600}}>
                        📄 파일 {i+1} <span style={{fontSize:11,color:C.muted,marginLeft:4}}>클릭하여 다운로드</span>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{padding:"16px 28px 24px",textAlign:"center",borderTop:"1px solid "+bdr}}>
            {(() => {
              const liked = isLiked(view);
              return (
                <button onClick={()=>like(view.id)}
                  style={{padding:"11px 36px",borderRadius:28,
                    border:"2px solid "+(liked?"#f59e0b":C.purpleL),
                    background:liked?(isDark?"rgba(245,158,11,0.15)":"rgba(245,158,11,0.08)"):(isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)"),
                    color:liked?"#f59e0b":C.purpleL,fontSize:15,fontWeight:800,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=liked?"rgba(245,158,11,0.3)":C.purpleL;if(!liked)e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background=liked?(isDark?"rgba(245,158,11,0.15)":"rgba(245,158,11,0.08)"):(isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)");e.currentTarget.style.color=liked?"#f59e0b":C.purpleL;}}>
                  {liked?"추천함":"추천"} {view.likes||0}
                </button>
              );
            })()}
          </div>
        </div>
        {/* 이전/다음 글 네비게이션 */}
        {(()=>{
          const viewIdx = filtered.findIndex(p=>p.id===view.id);
          const prevP = viewIdx < filtered.length-1 ? filtered[viewIdx+1] : null; // 최신순이므로 인덱스 +1이 이전글
          const nextP = viewIdx > 0 ? filtered[viewIdx-1] : null; // 인덱스 -1이 다음글
          return (
            <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:12,overflow:"hidden",marginBottom:16}}>
              {nextP&&<div style={{display:"flex",alignItems:"center",padding:"12px 18px",borderBottom:prevP?"1px solid "+bdr:"none",cursor:"pointer",gap:10}}
                onClick={()=>openPost(nextP)}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11,fontWeight:700,color:C.muted,flexShrink:0}}>▲ 다음 글</span>
                <span style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nextP.title}</span>
              </div>}
              {prevP&&<div style={{display:"flex",alignItems:"center",padding:"12px 18px",cursor:"pointer",gap:10}}
                onClick={()=>openPost(prevP)}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11,fontWeight:700,color:C.muted,flexShrink:0}}>▼ 이전 글</span>
                <span style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prevP.title}</span>
              </div>}
            </div>
          );
        })()}
        {/* 목록으로 버튼 (하단) */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <button onClick={()=>{setView(null);window.history.pushState(null,"","/community/"+subCat);}}
            style={{padding:"10px 32px",borderRadius:10,border:"1px solid "+bdr,background:C.card,color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            ≡ 목록으로
          </button>
        </div>
        {/* 댓글 */}
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:"1px solid "+bdr}}>
            <span style={{fontSize:15,fontWeight:700,color:C.text}}>댓글 {(view.comments||[]).length}개</span>
          </div>
          <div style={{padding:"0 24px"}}>
            {(view.comments||[]).map((cm,i)=>(
              <div key={cm.id||i} style={{padding:"14px 0",borderBottom:"1px solid "+bdr}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{(cm.nick||"?")[0].toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.purpleL}}>{cm.nick}</span>
                      <span style={{fontSize:11,color:C.muted}}>{cm.date}</span>
                    </div>
                    <div style={{fontSize:14,color:C.text,lineHeight:1.7}}>{cm.text}</div>
                  </div>
                  {user&&(user.nick===cm.nick||user.role==="admin")&&(
                    <button onClick={()=>delComment(view.id,i)} style={{padding:"4px 10px",borderRadius:7,border:"none",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontSize:11,cursor:"pointer",flexShrink:0}}>{t("delete")}</button>
                  )}
                </div>
              </div>
            ))}
            {(view.comments||[]).length===0&&<div style={{padding:"24px 0",textAlign:"center",color:C.muted,fontSize:14}}>첫 댓글을 남겨보세요 💬</div>}
          </div>
          <div style={{padding:"16px 24px",borderTop:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
            {user?(
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.nick||"?")[0].toUpperCase()}</div>
                <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="댓글을 입력하세요..."
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}}
                  style={{flex:1,padding:"11px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none"}}/>
                <button onClick={()=>addComment(view.id)} style={{padding:"11px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>등록</button>
              </div>
            ):(
              <div onClick={onLoginRequest} style={{padding:"14px",textAlign:"center",borderRadius:10,border:"1px solid rgba(99,102,241,0.2)",background:"rgba(99,102,241,0.04)",color:C.muted,fontSize:14,cursor:"pointer"}}>
                댓글을 남기려면 <span style={{color:C.purpleL,fontWeight:700}}>로그인</span>이 필요합니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* 카테고리 관리 모달 */
  const CatManager = () => {
    const [cats,      setCats]     = useState(subCats);
    const [newIcon,   setNewIcon]  = useState("💬");
    const [newLabel,  setNewLabel] = useState("");
    const [newColor,  setNewColor] = useState("#7c6aff");
    const [saving,    setSaving]   = useState(false);
    const [tab,       setTab]      = useState("cat"); // "cat" | "tag"
    const [selCat,    setSelCat]   = useState(subCats[0]?.id||"info");
    const [localTags, setLocalTags]= useState(allTags);
    const [tagLabel,  setTagLabel] = useState("");
    const [tagColor,  setTagColor] = useState("#7c6aff");
    const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
    const inp = {padding:"9px 12px",borderRadius:8,border:"1px solid "+bdr,background:inputBg,color:C.text,fontSize:13,outline:"none"};

    const addCat = async () => {
      if(!newLabel.trim()) return;
      const id = newLabel.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_가-힣]/g,"") + "_" + Date.now();
      const cat = {id, label:newLabel.trim(), icon:newIcon, color:newColor, order:cats.length};
      setSaving(true);
      await saveBoardCat(cat);
      const updated = [...cats, cat];
      setCats(updated); setSubCats(updated);
      setNewLabel(""); setSaving(false);
    };

    const removeCat = async (id) => {
      if(!window.confirm("이 카테고리를 삭제할까요?\n(해당 카테고리 게시글은 유지됩니다)")) return;
      await deleteBoardCat(id);
      const updated = cats.filter(c=>c.id!==id);
      setCats(updated); setSubCats(updated);
      if(subCat===id) setSubCat(updated[0]?.id||"info");
    };

    const saveCat = async (cat) => {
      await saveBoardCat(cat);
      const updated = cats.map(c=>c.id===cat.id ? cat : c);
      setCats(updated); setSubCats(updated);
    };

    const addTag = async () => {
      if(!tagLabel.trim()) return;
      const id = tagLabel.trim().replace(/\s+/g,"_") + "_" + Date.now();
      const tag = {id, label:tagLabel.trim(), color:tagColor, order:(localTags[selCat]||[]).length};
      setSaving(true);
      await saveTag(selCat, tag);
      const updated = {...localTags, [selCat]: [...(localTags[selCat]||[]), tag]};
      setLocalTags(updated); setAllTags(updated);
      setTagLabel(""); setSaving(false);
    };

    const removeTag = async (catId, tagId) => {
      await deleteTag(catId, tagId);
      const updated = {...localTags, [catId]: (localTags[catId]||[]).filter(t=>t.id!==tagId)};
      setLocalTags(updated); setAllTags(updated);
    };

    return (
      <div onClick={()=>setShowCatMgr(false)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div onClick={e=>e.stopPropagation()} style={{
          width:"min(560px,96vw)",maxHeight:"85vh",overflowY:"auto",
          background:isDark?"#1a1730":"#fff",borderRadius:20,
          border:"1px solid "+bdr,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",
          padding:"28px 24px",
        }}>
          {/* 헤더 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:900,color:C.text}}>게시판 카테고리 관리</div>
            <button onClick={()=>setShowCatMgr(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:20}}>✕</button>
          </div>

          {/* 탭 */}
          <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:"1px solid "+bdr,paddingBottom:0}}>
            {[["cat","카테고리"],["tag","세부 태그"]].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"9px 18px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t?800:500,
                background:tab===t?(isDark?"rgba(99,102,241,0.18)":"rgba(99,102,241,0.1)"):"transparent",
                color:tab===t?"#a5b4fc":C.muted,
                borderBottom:tab===t?"2px solid #7c6aff":"2px solid transparent",
              }}>{l}</button>
            ))}
          </div>

          {/* ── 카테고리 탭 ── */}
          {tab==="cat" && (<>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>현재 카테고리</div>
              {cats.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:6,background:isDark?"rgba(255,255,255,0.04)":"#f8f8fb",border:"1px solid "+bdr}}>
                  <span style={{fontSize:18}}>{c.icon}</span>
                  <span style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{c.label}</span>
                  <span style={{fontSize:11,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#eee",padding:"2px 8px",borderRadius:6}}>
                    {posts.filter(p=>p.cat===c.id||p.subCat===c.id).length}개 글
                  </span>
                  <input type="color" value={c.color} title="색상 변경"
                    onChange={e=>saveCat({...c, color:e.target.value})}
                    style={{width:28,height:28,borderRadius:6,border:"none",cursor:"pointer",padding:2,background:"none"}} />
                  <button onClick={()=>removeCat(c.id)}
                    style={{padding:"4px 10px",borderRadius:7,border:"none",background:"rgba(239,68,68,0.1)",color:"#ef4444",fontSize:12,cursor:"pointer",fontWeight:700}}>{t("delete")}</button>
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid "+bdr,paddingTop:18}}>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>새 카테고리 추가</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input value={newIcon} onChange={e=>setNewIcon(e.target.value)} placeholder="🏷" maxLength={2}
                  style={{...inp,width:52,textAlign:"center",fontSize:18}} />
                <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="카테고리 이름"
                  style={{...inp,flex:1,minWidth:120}} onKeyDown={e=>e.key==="Enter"&&addCat()} />
                <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
                  style={{width:38,height:38,borderRadius:8,border:"1px solid "+bdr,cursor:"pointer",padding:2}} />
                <button onClick={addCat} disabled={saving||!newLabel.trim()}
                  style={{padding:"9px 20px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,whiteSpace:"nowrap"}}>
                  {saving?"저장중...":"+ 추가"}
                </button>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:8}}>이모지 + 이름 + 색상을 설정하고 추가하세요</div>
            </div>
          </>)}

          {/* ── 세부 태그 탭 ── */}
          {tab==="tag" && (<>
            {/* 카테고리 선택 */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:8}}>태그를 추가할 카테고리 선택</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {cats.map(c=>(
                  <button key={c.id} onClick={()=>setSelCat(c.id)} style={{
                    padding:"6px 14px",borderRadius:16,fontSize:12,cursor:"pointer",
                    border:"1px solid "+(selCat===c.id?c.color:bdr),
                    background:selCat===c.id?c.color+"22":"transparent",
                    color:selCat===c.id?c.color:C.muted,fontWeight:selCat===c.id?700:400,
                  }}>{c.icon} {c.label}</button>
                ))}
              </div>
            </div>

            {/* 현재 태그 목록 */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:8}}>
                현재 태그 {(localTags[selCat]||[]).length === 0 && <span style={{fontWeight:400}}>(없음)</span>}
              </div>
              {(localTags[selCat]||[]).length === 0 ? (
                <div style={{padding:"16px",textAlign:"center",borderRadius:10,border:"1px dashed "+bdr,color:C.muted,fontSize:13}}>
                  아직 태그가 없어요. 아래에서 추가해보세요!
                </div>
              ) : (
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {(localTags[selCat]||[]).map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px 5px 12px",borderRadius:20,border:"1px solid "+(t.color||"#7c6aff"),background:(t.color||"#7c6aff")+"18"}}>
                      <span style={{fontSize:13,fontWeight:700,color:t.color||"#7c6aff"}}>{t.label}</span>
                      <span style={{fontSize:11,color:C.muted}}>({posts.filter(p=>(p.cat===selCat||p.subCat===selCat)&&p.tag===t.label).length}개)</span>
                      <button onClick={()=>removeTag(selCat,t.id)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:14,padding:"0 2px",lineHeight:1}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 새 태그 추가 */}
            <div style={{borderTop:"1px solid "+bdr,paddingTop:18}}>
              <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10}}>새 태그 추가</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <input value={tagLabel} onChange={e=>setTagLabel(e.target.value)} placeholder="태그 이름 (예: AI, 마케팅)"
                  style={{...inp,flex:1,minWidth:140}} onKeyDown={e=>e.key==="Enter"&&addTag()} />
                <input type="color" value={tagColor} onChange={e=>setTagColor(e.target.value)}
                  style={{width:38,height:38,borderRadius:8,border:"1px solid "+bdr,cursor:"pointer",padding:2}} />
                <button onClick={addTag} disabled={saving||!tagLabel.trim()}
                  style={{padding:"9px 20px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,whiteSpace:"nowrap"}}>
                  {saving?"저장중...":"+ 추가"}
                </button>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:8}}>
                예) 정보공유 → AI, 마케팅, 프로그램, 재테크 등 원하는 태그를 자유롭게 추가하세요
              </div>
            </div>
          </>)}
        </div>
      </div>
    );
  };

  /* 목록 */
  return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      {showCatMgr && <CatManager />}
      {/* 토스트 */}
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#22c55e":"#7c6aff",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>{toast.msg}</div>}

      {/* 로딩 */}
      {loading && (
        <div style={{textAlign:"center",padding:"80px 0",color:C.muted}}>
          <div style={{fontSize:32,marginBottom:12,display:"inline-block",animation:"spin 1s linear infinite"}}>⏳</div>
          <div style={{fontSize:14}}>{t("loadingPosts")}</div>
        </div>
      )}

      {/* 서브 카테고리 탭 */}
      {!loading && <div style={{borderBottom:"1px solid "+bdr,background:isDark?"rgba(99,102,241,0.04)":"rgba(99,102,241,0.02)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",gap:4,overflowX:"auto"}}>
          {(subCat==="archive"?subCats.filter(s=>s.id==="archive"):subCats.filter(s=>s.id!=="archive")).map(s=>(
            <button key={s.id} onClick={()=>{setSubCat(s.id);setSearch("");setPage(1);setView(null);setFilterTag("");setArchiveView("posts");}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"13px 18px",borderRadius:0,border:"none",cursor:"pointer",
                fontSize:14,fontWeight:subCat===s.id?700:500,whiteSpace:"nowrap",
                background:"transparent",color:subCat===s.id?s.color:C.muted,
                borderBottom:subCat===s.id?"3px solid "+s.color:"3px solid transparent",
                transition:"all 0.12s"}}>
              {s.icon} {s.label}
              <span style={{fontSize:11,opacity:0.6,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",padding:"1px 7px",borderRadius:10}}>{posts.filter(p=>p.cat===s.id||p.subCat===s.id).length}</span>
            </button>
          ))}
          {user?.role==="admin" && (
            <button onClick={()=>setShowCatMgr(true)}
              style={{marginLeft:"auto",flexShrink:0,padding:"8px 14px",borderRadius:8,border:"1px dashed "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              ⚙️ 카테고리 관리
            </button>
          )}
        </div>
      </div>}

      {!loading && <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
        {/* 포인트 안내 배너 */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",margin:"16px 0 0",borderRadius:12,
          background:isDark?"rgba(74,222,128,0.06)":"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)"}}>
          <span style={{fontSize:18}}>💎</span>
          <span style={{fontSize:13,color:isDark?"#86efac":"#166534",lineHeight:1.6}}>
            <b>포인트 적립 안내</b> · 게시글 작성 시 <b style={{color:"#4ade80"}}>+1P</b> 적립됩니다.
            댓글에는 포인트가 지급되지 않습니다. 적립된 포인트로 AI 생성기를 이용해보세요!
          </span>
        </div>

        <div style={{display:"flex",gap:20,padding:"16px 0 60px",alignItems:"flex-start",flexDirection:isMobile?"column":"row"}}>
          {/* 메인 */}
          <div style={{flex:1,minWidth:0,overflow:"hidden",width:"100%"}}>

            {/* 자료실 전용 탭 (영상/사진/GIF/무료이미지) */}
            {subCat==="archive" && (
              <div style={{display:"flex",gap:4,marginBottom:14,borderBottom:"1px solid "+bdr,paddingBottom:0}}>
                {[["posts","자료실"],["search","무료 이미지·GIF"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setArchiveView(v)} style={{
                    padding:"9px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:archiveView===v?700:500,
                    background:"transparent",borderRadius:"8px 8px 0 0",
                    color:archiveView===v?"#a5b4fc":C.muted,
                    borderBottom:archiveView===v?"2px solid #7c6aff":"2px solid transparent",
                  }}>{l}</button>
                ))}
              </div>
            )}

            {/* 무료 이미지·GIF 검색 뷰 */}
            {subCat==="archive" && archiveView==="search" && (
              <FreeMediaSearch C={C} isDark={isDark} bdr={bdr}/>
            )}

            {/* 자료실 파일 input (숨김) */}
            {subCat==="archive" && (
              <input ref={archiveFileRef} type="file" multiple style={{display:"none"}} onChange={e=>{
                if(e.target.files.length===1){ setArchiveUploadFile(e.target.files[0]); setShowArchiveModal(true); }
                else { handleArchiveUpload(e.target.files); }
                e.target.value="";
              }}/>
            )}

            {/* 자료 업로드 상세 설정 모달 */}
            {showArchiveModal && archiveUploadFile && (
              <div onClick={()=>{setShowArchiveModal(false);setArchiveUploadFile(null);}} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                <div onClick={e=>e.stopPropagation()} style={{width:"min(480px,95vw)",background:isDark?"#1a1730":"#fff",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}`}}>
                  <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:16}}>자료 등록</div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>파일</div>
                    <div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.04)":"#f8f8fb",fontSize:13,color:C.text}}>{archiveUploadFile.name}</div>
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>제목</div>
                    <input value={archiveForm.title} onChange={e=>setArchiveForm(p=>({...p,title:e.target.value}))} placeholder="자료 제목"
                      style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>설명</div>
                    <textarea value={archiveForm.desc} onChange={e=>setArchiveForm(p=>({...p,desc:e.target.value}))} placeholder="자료 설명 (선택)" rows={2}
                      style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["free","🆓 무료","#22c55e"],["paid","💰 유료","#f59e0b"]].map(([v,l,c])=>(
                      <button key={v} onClick={()=>setArchiveForm(p=>({...p,priceType:v}))}
                        style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${archiveForm.priceType===v?c:bdr}`,background:archiveForm.priceType===v?c+"15":"transparent",color:archiveForm.priceType===v?c:C.muted,fontSize:13,fontWeight:archiveForm.priceType===v?800:500,cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                  {archiveForm.priceType==="paid" && (
                    <div style={{marginBottom:12}}>
                      <input value={archiveForm.price} onChange={e=>setArchiveForm(p=>({...p,price:e.target.value}))} placeholder="가격 (예: 5,000원)"
                        style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    {[["all","전체 공개"],["member","회원 전용"],["nonmember","비회원 포함"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setArchiveForm(p=>({...p,visibility:v}))}
                        style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${archiveForm.visibility===v?"#7c6aff":bdr}`,background:archiveForm.visibility===v?"rgba(99,102,241,0.12)":"transparent",color:archiveForm.visibility===v?"#a5b4fc":C.muted,fontSize:11,fontWeight:archiveForm.visibility===v?700:500,cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>{setShowArchiveModal(false);setArchiveUploadFile(null);}} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer"}}>취소</button>
                    <button onClick={async()=>{
                      const file = archiveUploadFile;
                      try {
                        const path = `archive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
                        const url = await uploadFileToStorage(file, path);
                        const type = file.type.startsWith("video")?"video":file.type.startsWith("image")?"image":"file";
                        await submitPost({
                          title: archiveForm.title || file.name.replace(/\.[^.]+$/,""),
                          body: `<p>${archiveForm.desc || type+" 자료"}</p>`,
                          subCat:"archive", tag:"", images:[url],
                          priceType: archiveForm.priceType, price: archiveForm.price,
                        });
                        showToast("자료가 등록됐어요!","success");
                        try { const db = await getPostsFromDB(); if(db?.length) { setPostsS(db.sort((a,b)=>b.id-a.id)); setPosts(db); } } catch{}
                      } catch(e){ alert("업로드 실패: "+e.message); }
                      setShowArchiveModal(false); setArchiveUploadFile(null);
                      setArchiveForm({title:"",desc:"",priceType:"free",price:"",visibility:"all"});
                    }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>등록하기</button>
                  </div>
                </div>
              </div>
            )}

            {/* 자료실 미디어 그리드 뷰 */}
            {subCat==="archive" && archiveView==="posts" && (
              <>
                {/* 서브탭 (무료이미지 스타일) */}
                <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid "+bdr}}>
                  {[{id:"",label:"전체"},{id:"video",label:"영상"},{id:"photo",label:"사진"},{id:"gif",label:"GIF · 짤"},{id:"music",label:"음악"}].map(t=>{
                    const active = filterTag===t.id;
                    return (
                      <button key={t.id} onClick={()=>{setFilterTag(t.id);setPage(1);}}
                        style={{flex:1,padding:"12px 0",border:"none",cursor:"pointer",fontSize:13,fontWeight:active?700:500,
                          background:"transparent",color:active?"#a5b4fc":C.muted,
                          borderBottom:active?"2px solid #7c6aff":"2px solid transparent",marginBottom:-2,transition:"all 0.15s"}}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* 검색바 */}
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="자료 검색..."
                    style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:C.text,fontSize:13,outline:"none"}}/>
                  {user?.role==="admin"&&(
                    <button onClick={()=>archiveFileRef.current?.click()}
                      style={{padding:"10px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                      자료 등록
                    </button>
                  )}
                </div>

                {/* 미디어 카드 그리드 */}
                {pageItems.length > 0 ? (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
                    {pageItems.map(p => {
                      const thumb = (p.images||[])[0];
                      const isVid = thumb && /\.(mp4|mov|avi|webm|mkv)/i.test(thumb);
                      const isGif = thumb && /\.gif$/i.test(thumb);
                      return (
                        <div key={p.id} onClick={()=>openPost(p)}
                          style={{borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,background:cardBg,cursor:"pointer",position:"relative",transition:"transform 0.15s"}}
                          onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                          onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                          <div style={{width:"100%",aspectRatio:"1",background:isDark?"rgba(255,255,255,0.03)":"#f0f0f6",overflow:"hidden",position:"relative"}}>
                            {isVid ? (
                              <video src={thumb} muted loop playsInline preload="metadata"
                                style={{width:"100%",height:"100%",objectFit:"cover"}}
                                onMouseEnter={e=>e.target.play().catch(()=>{})}
                                onMouseLeave={e=>{e.target.pause();e.target.currentTime=0;}}/>
                            ) : thumb ? (
                              <img src={thumb} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
                            ) : (
                              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#94a3b8",fontWeight:600}}>파일</div>
                            )}
                            {/* 유형 배지 */}
                            {isVid && <span style={{position:"absolute",top:6,left:6,fontSize:9,background:"rgba(0,0,0,0.7)",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700}}>영상</span>}
                            {isGif && <span style={{position:"absolute",top:6,left:6,fontSize:9,background:"rgba(139,92,246,0.8)",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700}}>GIF</span>}
                            {/* 유료/무료 배지 */}
                            {p.priceType==="paid"&&<span style={{position:"absolute",top:6,right:6,fontSize:9,background:"rgba(245,158,11,0.95)",color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:800}}>유료{p.price?` ${p.price}`:""}</span>}
                            {p.priceType==="free"&&<span style={{position:"absolute",top:6,right:6,fontSize:9,background:"rgba(34,197,94,0.9)",color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:700}}>무료</span>}
                            {/* 다운로드 */}
                            {thumb&&<button onClick={e=>{e.stopPropagation();downloadFile(thumb);}}
                              style={{position:"absolute",bottom:6,right:6,padding:"4px 8px",borderRadius:6,border:"none",background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:700}}>⬇</button>}
                          </div>
                          <div style={{padding:"8px 10px"}}>
                            <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
                    <div style={{fontSize:14,color:"#94a3b8",marginBottom:8,fontWeight:600}}>자료 없음</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>아직 등록된 자료가 없어요</div>
                    <div style={{fontSize:12}}>관리자가 자료를 등록하면 여기에 표시됩니다</div>
                  </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:20}}>
                    {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setPage(n)}
                        style={{width:32,height:32,borderRadius:8,border:`1px solid ${page===n?"#7c6aff":bdr}`,
                          background:page===n?"rgba(99,102,241,0.15)":"transparent",color:page===n?"#a5b4fc":C.muted,
                          fontSize:12,fontWeight:page===n?700:400,cursor:"pointer"}}>{n}</button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 일반 게시판 뷰 (자료실 외) */}
            {subCat!=="archive" && <>

            {/* 액션바 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:15,fontWeight:800,color:C.text}}>{subInfo.icon} {subInfo.label}</span>
                <span style={{fontSize:12,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f8",padding:"2px 8px",borderRadius:10}}>{t("totalN")} {activeFiltered.length}{t("itemsUnit")}{isArchivePostsView?" "+t("withAttach"):""}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",border:"1px solid "+bdr,borderRadius:9,overflow:"hidden",background:isDark?"rgba(255,255,255,0.04)":"#fff"}}>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={t("search")}
                    style={{padding:"7px 10px",border:"none",background:"transparent",color:C.text,fontSize:13,outline:"none",width:isMobile?80:150}}/>
                  {search&&<button onClick={()=>{setSearch("");setPage(1);}} style={{padding:"7px 8px",border:"none",background:"transparent",color:C.muted,cursor:"pointer"}}>✕</button>}
                </div>
                <select value={sort} onChange={e=>setSort(e.target.value)}
                  style={{padding:"7px 8px",borderRadius:9,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:C.text,fontSize:12,outline:"none",cursor:"pointer"}}>
                  <option value="latest">{t("sortLatest")}</option>
                  <option value="views">{t("sortViews")}</option>
                  <option value="likes">{t("sortLikes")}</option>
                </select>
                {/* 뷰 모드 토글 */}
                <div style={{display:"flex",border:"1px solid "+bdr,borderRadius:8,overflow:"hidden"}}>
                  {[["list","☰",t("viewList")],["gallery","⊞",t("viewGallery")],["compact","▤",t("viewCompact")]].map(([vm,icon,label])=>(
                    <button key={vm} onClick={()=>setViewMode(vm)} title={label}
                      style={{padding:"7px 9px",border:"none",cursor:"pointer",fontSize:14,lineHeight:1,
                        background:viewMode===vm?(isDark?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.12)"):(isDark?"rgba(255,255,255,0.04)":"#fff"),
                        color:viewMode===vm?"#7c6aff":C.muted}}>
                      {icon}
                    </button>
                  ))}
                </div>
                {/* 자료실은 관리자만 글쓰기 가능 */}
                {(subCat!=="archive" || user?.role==="admin") && (
                  <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest();}else setMode("write");}}
                    style={{padding:"8px 14px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}}>
                    {subCat==="archive"?"자료 등록":t("writePost")}
                  </button>
                )}
              </div>
            </div>

            {/* 자료실 전용 유형 필터 */}
            {subCat==="archive" && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {[{id:"all",label:"전체"},{id:"video",label:"영상"},{id:"photo",label:"사진"},{id:"gif",label:"GIF·짤"},{id:"music",label:"음악"}].map(t=>{
                  const active = filterTag===(t.id==="all"?"":t.id);
                  const cnt = t.id==="all" ? activeFiltered.length : posts.filter(p=>(p.subCat==="archive")&&(
                    t.id==="video" ? (p.images||[]).some(u=>/\.(mp4|mov|avi|webm)/i.test(u)) :
                    t.id==="photo" ? (p.images||[]).some(u=>/\.(jpg|jpeg|png|webp|avif)/i.test(u)) && !(p.images||[]).some(u=>/\.(gif)/i.test(u)) :
                    t.id==="gif" ? (p.images||[]).some(u=>/\.(gif)/i.test(u)) :
                    t.id==="music" ? (p.images||[]).some(u=>/\.(mp3|wav|ogg|flac|m4a)/i.test(u)) : false
                  )).length;
                  return (
                    <button key={t.id} onClick={()=>{setFilterTag(t.id==="all"?"":t.id);setPage(1);}}
                      style={{padding:"6px 14px",borderRadius:10,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4,
                        border:`1px solid ${active?"#7c6aff":bdr}`,
                        background:active?"rgba(99,102,241,0.15)":"transparent",
                        color:active?"#a5b4fc":C.muted,fontWeight:active?700:400}}>
                      {t.label} <span style={{fontSize:10,opacity:0.6}}>({cnt})</span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* 세부 태그 필터 바 (자료실 외) */}
            {subCat!=="archive" && currentTags.length > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                <button onClick={()=>setFilterTag("")} style={{
                  padding:"4px 12px",borderRadius:14,fontSize:12,cursor:"pointer",
                  border:"1px solid "+(filterTag===""?(subInfo?.color||"#7c6aff"):bdr),
                  background:filterTag===""?(subInfo?.color||"#7c6aff")+"18":"transparent",
                  color:filterTag===""?(subInfo?.color||"#7c6aff"):C.muted,
                  fontWeight:filterTag===""?700:400,
                }}>전체</button>
                {currentTags.map(t=>(
                  <button key={t.id} onClick={()=>{setFilterTag(filterTag===t.label?"":t.label);setPage(1);}} style={{
                    padding:"4px 12px",borderRadius:14,fontSize:12,cursor:"pointer",
                    border:"1px solid "+(filterTag===t.label?(t.color||subInfo?.color||"#7c6aff"):bdr),
                    background:filterTag===t.label?(t.color||subInfo?.color||"#7c6aff")+"18":"transparent",
                    color:filterTag===t.label?(t.color||subInfo?.color||"#7c6aff"):C.muted,
                    fontWeight:filterTag===t.label?700:400,
                  }}>{t.label} <span style={{opacity:0.6,fontSize:10}}>({posts.filter(p=>(p.cat===subCat||p.subCat===subCat)&&p.tag===t.label).length})</span></button>
                ))}
              </div>
            )}

            {/* 빈 목록 */}
            {pageItems.length===0&&(
              <div style={{background:cardBg,border:"1px solid "+bdr,borderRadius:10,padding:"70px 0",textAlign:"center",color:C.muted}}>
                <div style={{fontSize:36,marginBottom:12}}>{""}</div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>
                  {search?`"${search}" ${t("noSearchResult")}`:subCat==="archive"?"아직 등록된 자료가 없어요":t("noPosts")}
                </div>
                {subCat==="archive" ? (
                  <div style={{fontSize:13,marginBottom:20,color:C.muted}}>관리자가 자료를 등록하면 여기에 표시됩니다</div>
                ) : (
                  <>
                    <div style={{fontSize:13,marginBottom:20}}>첫 번째 글을 작성하면 <b style={{color:"#4ade80"}}>1P</b>가 적립됩니다!</div>
                    {user&&<button onClick={()=>setMode("write")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>글쓰기</button>}
                  </>
                )}
              </div>
            )}

            {/* 호버 프리뷰 팝업 */}
            {hoverPreview && (
              <div style={{
                position:"fixed", zIndex:9999, pointerEvents:"none",
                left: hoverPreview.x, top: hoverPreview.y,
                width: 280, background: isDark?"rgba(18,16,48,0.97)":"#fff",
                border:"1px solid "+(isDark?"rgba(124,106,255,0.25)":"rgba(0,0,0,0.1)"),
                borderRadius:14, boxShadow:"0 12px 40px rgba(0,0,0,0.22)", overflow:"hidden",
              }}>
                {hoverPreview.thumb && (
                  <img src={toThumb(hoverPreview.thumb,280,210)} alt=""
                    style={{width:"100%",maxHeight:420,objectFit:"contain",display:"block",background:isDark?"#0a0818":"#f0f0f6"}}
                    onError={e=>e.target.style.display="none"} />
                )}
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:isDark?"#e2e8f0":"#1a1730",marginBottom:6,lineHeight:1.4}}>{hoverPreview.post.title}</div>
                  {hoverPreview.snippet && (
                    <div style={{fontSize:11,color:isDark?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.5)",lineHeight:1.6}}>
                      {hoverPreview.snippet}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── 리스트 뷰 ── */}
            {viewMode==="list" && pageItems.length>0 && <>
              {!isMobile && (
                <div style={{background:head,border:"1px solid "+bdr,borderRadius:"10px 10px 0 0",padding:"9px 12px",
                  display:"grid",gridTemplateColumns:"48px 46px 1fr 90px 76px 50px 46px 36px",
                  fontSize:11,fontWeight:700,color:C.muted,alignItems:"center"}}>
                  <span style={{textAlign:"center"}}>{t("colNo")}</span>
                  <span style={{textAlign:"center"}}>{t("colImage")}</span>
                  <span style={{paddingLeft:6}}>{t("colTitle")}</span>
                  <span style={{textAlign:"center"}}>{t("colAuthor")}</span>
                  <span style={{textAlign:"center"}}>{t("colDate")}</span>
                  <span style={{textAlign:"center"}}>{t("colViews")}</span>
                  <span style={{textAlign:"center"}}>{t("colLikes")}</span>
                  <span style={{textAlign:"center"}}>{t("colDownload")}</span>
                </div>
              )}
              {isMobile && (
                <div style={{background:head,border:"1px solid "+bdr,borderRadius:"10px 10px 0 0",padding:"9px 14px",
                  fontSize:12,fontWeight:700,color:C.muted}}>
                  게시글 목록
                </div>
              )}
              <div style={{border:"1px solid "+bdr,borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
                {pageItems.map((p,idx)=>{
                  const num=filtered.length-(page-1)*PER-idx;
                  const today=Date.now()-p.id<86400000;
                  const thumb = (p.images && p.images[0]) || extractThumb(p.body);
                  const hasDl = (p.images||[]).length > 0;
                  return isMobile ? (
                    <div key={p.id} onClick={()=>openPost(p)}
                      style={{padding:"12px 14px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=hover}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        {thumb && <img src={toThumb(thumb,96,72)} alt="" loading="eager" style={{width:48,height:36,objectFit:"cover",borderRadius:6,flexShrink:0,marginTop:2}} onError={e=>e.target.style.display="none"}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,flexWrap:"wrap"}}>
                            {p.tag&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:(subInfo?.color||"#7c6aff")+"22",color:subInfo?.color||"#7c6aff",fontWeight:700,flexShrink:0}}>{p.tag}</span>}
                            <span style={{fontSize:14,fontWeight:600,color:C.text,lineHeight:1.4}}>{p.title}</span>
                            {hasDl&&<span style={{fontSize:10,color:"#3b82f6",flexShrink:0}}>+</span>}
                            {(p.comments||[]).length>0&&<span style={{fontSize:11,color:C.purpleL,fontWeight:700,flexShrink:0}}>[{p.comments.length}]</span>}
                            {today&&<span style={{fontSize:9,background:"rgba(239,68,68,0.12)",color:"#ef4444",padding:"1px 5px",borderRadius:4,fontWeight:700,flexShrink:0}}>N</span>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:C.muted}}>
                            <span style={{color:C.purpleL,fontWeight:600}}>{p.nick}</span>
                            <span>{p.date}</span><span>{p.views||0}</span>
                            {(p.likes||0)>0&&<span style={{color:"#f59e0b",fontWeight:700}}>{p.likes}</span>}
                            {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}} style={{padding:"2px 8px",borderRadius:6,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",fontSize:10,cursor:"pointer",fontWeight:700}}>⬇ 다운</button>}
                          </div>
                        </div>
                        <span style={{fontSize:11,color:C.muted,flexShrink:0,paddingTop:2}}>#{num}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={p.id} onClick={()=>openPost(p)}
                      style={{display:"grid",gridTemplateColumns:"48px 46px 1fr 90px 76px 50px 46px 36px",
                        padding:"8px 12px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s",alignItems:"center"}}
                      onMouseEnter={e=>{
                        e.currentTarget.style.background=hover;
                        const x=e.clientX+18, y=e.clientY-10;
                        const popW=280, popH=thumb?220:100;
                        const pos={x:x+popW>window.innerWidth?e.clientX-popW-10:x, y:y+popH>window.innerHeight?e.clientY-popH:y};
                        if(snippetCache.current[p.id]!==undefined){
                          setHoverPreview({post:p,thumb,snippet:snippetCache.current[p.id],...pos});
                        } else {
                          setHoverPreview({post:p,thumb,snippet:null,...pos});
                          if(hoverTimer.current!==p.id){
                            hoverTimer.current=p.id;
                            getPostByIdFromDB(p.id).then(full=>{
                              if(full){const snip=extractText(full.body);snippetCache.current[p.id]=snip;setHoverPreview(prev=>prev?.post?.id===p.id?{...prev,snippet:snip}:prev);}
                              else{snippetCache.current[p.id]="";}
                            }).catch(()=>{snippetCache.current[p.id]="";});
                          }
                        }
                      }}
                      onMouseMove={e=>{const x=e.clientX+18,y=e.clientY-10,popW=280,popH=thumb?220:100;const pos={x:x+popW>window.innerWidth?e.clientX-popW-10:x,y:y+popH>window.innerHeight?e.clientY-popH:y};setHoverPreview(prev=>prev?.post?.id===p.id?{...prev,...pos}:prev);}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";setHoverPreview(null);}}>
                      <span style={{textAlign:"center",fontSize:12,color:C.muted}}>{num}</span>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {thumb && <img src={toThumb(thumb,72,56)} alt="" loading="eager" style={{width:36,height:28,objectFit:"cover",borderRadius:5}} onError={e=>e.target.style.display="none"}/>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:6,minWidth:0}}>
                        {p.tag&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:(subInfo?.color||"#7c6aff")+"22",color:subInfo?.color||"#7c6aff",fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>{p.tag}</span>}
                        <span style={{fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                        {hasDl&&<span style={{fontSize:10,color:"#3b82f6",flexShrink:0}} title={`첨부 ${p.images.length}개`}>+</span>}
                        {(p.comments||[]).length>0&&<span style={{fontSize:12,color:C.purpleL,fontWeight:700,flexShrink:0}}>[{p.comments.length}]</span>}
                        {today&&<span style={{fontSize:9,background:"rgba(239,68,68,0.12)",color:"#ef4444",padding:"1px 5px",borderRadius:4,fontWeight:700,flexShrink:0}}>N</span>}
                      </div>
                      <div style={{textAlign:"center",minWidth:0}}>
                        <span style={{fontSize:12,color:C.purpleL,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",padding:"0 4px"}}>{p.nick}</span>
                      </div>
                      <span style={{textAlign:"center",fontSize:11,color:C.muted}}>{p.date}</span>
                      <span style={{textAlign:"center",fontSize:12,color:C.muted}}>{p.views||0}</span>
                      <span style={{textAlign:"center",fontSize:12,fontWeight:(p.likes||0)>0?700:400,color:(p.likes||0)>0?"#f59e0b":C.muted}}>{p.likes||0}</span>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}} title="첫 번째 첨부 다운로드"
                          style={{padding:"3px 6px",borderRadius:6,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:700,lineHeight:1}}>⬇</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>}

            {/* ── 갤러리 뷰 ── */}
            {viewMode==="gallery" && pageItems.length>0 && (
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(210px,1fr))",gap:12}}>
                {pageItems.map(p=>{
                  const thumb=(p.images&&p.images[0])||extractThumb(p.body);
                  const today=Date.now()-p.id<86400000;
                  const hasDl=(p.images||[]).length>0;
                  return (
                    <div key={p.id} onClick={()=>openPost(p)}
                      style={{borderRadius:12,border:"1px solid "+bdr,overflow:"hidden",cursor:"pointer",
                        background:cardBg,transition:"transform 0.15s,box-shadow 0.15s",position:"relative"}}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.15)";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                      <div style={{width:"100%",aspectRatio:"16/9",background:isDark?"rgba(255,255,255,0.04)":"#f0f0f6",overflow:"hidden",position:"relative",flexShrink:0}}>
                        {thumb && isVideoUrl(thumb)
                          ? <video src={thumb} muted loop playsInline preload="metadata"
                              style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                              onMouseEnter={e=>e.target.play().catch(()=>{})}
                              onMouseLeave={e=>{e.target.pause();e.target.currentTime=0;}}/>
                          : thumb
                          ? <img src={toThumb(thumb,480,270)} alt="" loading="eager" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
                          : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{""}</div>
                        }
                        {today&&<span style={{position:"absolute",top:6,left:6,fontSize:9,background:"rgba(239,68,68,0.9)",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700}}>NEW</span>}
                        {/* 유료/무료 배지 */}
                        {p.priceType==="paid"&&<span style={{position:"absolute",top:6,right:6,fontSize:9,background:"rgba(245,158,11,0.95)",color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:800}}>💰 유료{p.price?` ${p.price}`:""}</span>}
                        {p.priceType==="free"&&subCat==="archive"&&<span style={{position:"absolute",top:6,right:6,fontSize:9,background:"rgba(34,197,94,0.9)",color:"#fff",padding:"2px 8px",borderRadius:4,fontWeight:700}}>🆓 무료</span>}
                        {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}}
                          style={{position:"absolute",bottom:6,right:6,padding:"4px 9px",borderRadius:7,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>⬇</button>}
                      </div>
                      <div style={{padding:"10px 12px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.4,marginBottom:6}}>
                          {p.tag&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:(subInfo?.color||"#7c6aff")+"22",color:subInfo?.color||"#7c6aff",fontWeight:700,marginRight:5}}>{p.tag}</span>}
                          {p.title}
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                          <span style={{color:C.purpleL,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"50%"}}>{p.nick}</span>
                          <div style={{display:"flex",gap:8,flexShrink:0}}>
                            <span>👁{p.views||0}</span>
                            {(p.likes||0)>0&&<span style={{color:"#f59e0b",fontWeight:700}}>👍{p.likes}</span>}
                            {(p.comments||[]).length>0&&<span style={{color:C.purpleL,fontWeight:700}}>💬{p.comments.length}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 컴팩트 뷰 ── */}
            {viewMode==="compact" && pageItems.length>0 && (
              <div style={{border:"1px solid "+bdr,borderRadius:10,overflow:"hidden"}}>
                {pageItems.map((p,idx)=>{
                  const num=filtered.length-(page-1)*PER-idx;
                  const thumb=(p.images&&p.images[0])||extractThumb(p.body);
                  const today=Date.now()-p.id<86400000;
                  const hasDl=(p.images||[]).length>0;
                  return (
                    <div key={p.id}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                      onClick={()=>openPost(p)}
                      onMouseEnter={e=>e.currentTarget.style.background=hover}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{fontSize:11,color:C.muted,flexShrink:0,width:28,textAlign:"right"}}>#{num}</span>
                      {thumb
                        ? <img src={toThumb(thumb,68,52)} alt="" loading="eager" style={{width:34,height:26,objectFit:"cover",borderRadius:4,display:"block",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                        : <div style={{width:34,height:26,borderRadius:4,flexShrink:0,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{""}</div>
                      }
                      <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:5}}>
                        {p.tag&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:(subInfo?.color||"#7c6aff")+"22",color:subInfo?.color||"#7c6aff",fontWeight:700,flexShrink:0}}>{p.tag}</span>}
                        <span style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                        {(p.comments||[]).length>0&&<span style={{fontSize:11,color:C.purpleL,fontWeight:700,flexShrink:0}}>[{p.comments.length}]</span>}
                        {today&&<span style={{fontSize:9,background:"rgba(239,68,68,0.12)",color:"#ef4444",padding:"1px 4px",borderRadius:3,fontWeight:700,flexShrink:0}}>N</span>}
                      </div>
                      {!isMobile&&<>
                        <span style={{fontSize:11,color:C.purpleL,fontWeight:600,flexShrink:0,width:68,overflow:"hidden",textOverflow:"ellipsis",textAlign:"right"}}>{p.nick}</span>
                        <span style={{fontSize:11,color:C.muted,flexShrink:0,width:70,textAlign:"center"}}>{p.date}</span>
                        <span style={{fontSize:11,color:C.muted,flexShrink:0,width:38,textAlign:"center"}}>👁{p.views||0}</span>
                        {(p.likes||0)>0&&<span style={{fontSize:11,color:"#f59e0b",fontWeight:700,flexShrink:0}}>👍{p.likes}</span>}
                      </>}
                      {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}}
                        style={{flexShrink:0,padding:"3px 8px",borderRadius:6,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:700}}>⬇</button>}
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages>1&&(
              <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:20}}>
                <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>«</button>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>‹</button>
                {Array.from({length:Math.min(7,totalPages)},(_,i)=>{const s=Math.max(1,Math.min(page-3,totalPages-6));const n=s+i;return n<=totalPages?<button key={n} onClick={()=>setPage(n)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(n===page?C.purpleL:bdr),background:n===page?C.purpleL:"transparent",color:n===page?"#fff":C.muted,cursor:"pointer",fontSize:12,fontWeight:n===page?700:400}}>{n}</button>:null;})}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>›</button>
                <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>»</button>
              </div>
            )}
            </>}
          </div>

          {/* 모바일 로그인 유도 */}
          {isMobile && !user && (
            <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"16px",textAlign:"center",width:"100%"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>✍️ 커뮤니티 참여하기</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.5}}>로그인하면 글쓰기와 댓글 기능을 사용할 수 있어요</div>
              <button onClick={onLoginRequest} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>로그인 / 가입</button>
            </div>
          )}

          {/* 우측 사이드바 - 데스크톱만 */}
          {!isMobile && (
          <aside style={{width:240,flexShrink:0,display:"flex",flexDirection:"column",gap:14}}>
            {/* 전체 인기글 TOP10 */}
            {hotPostsAll.length>0&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(239,68,68,0.06)":"rgba(239,68,68,0.03)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>🔥 전체 인기글 TOP10</span>
                </div>
                {hotPostsAll.map((p,i)=>(
                  <div key={p.id} onClick={()=>openPost(p)} style={{padding:"10px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:14,fontWeight:900,color:i===0?"#ef4444":i===1?"#f59e0b":i===2?"#7c6aff":"#6b7280",flexShrink:0,lineHeight:1.2}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4,marginBottom:2}}>{p.title}</div>
                        <div style={{fontSize:10,color:C.muted}}>{p.views||0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* 게시판별 인기글 TOP10 */}
            {hotPosts.length>0&&subCat!=="archive"&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(251,191,36,0.06)":"rgba(251,191,36,0.04)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>⭐ {subInfo?.label||""} 인기글</span>
                </div>
                {hotPosts.slice(0,5).map((p,i)=>(
                  <div key={p.id} onClick={()=>openPost(p)} style={{padding:"10px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:14,fontWeight:900,color:i===0?"#f59e0b":"#6b7280",flexShrink:0,lineHeight:1.2}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4}}>{p.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid "+bdr}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>포인트 적립</span>
              </div>
              {[["글 작성","+1P"],["AI 생성","-10P"],["가입 즉시","+200P"],["출석체크","+3P"]].map(([a,p])=>(
                <div key={a} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid "+bdr,fontSize:13}}>
                  <span style={{color:C.muted}}>{a}</span>
                  <span style={{fontWeight:700,color:p.startsWith("+")?"#4ade80":"#f87171"}}>{p}</span>
                </div>
              ))}
            </div>
            {!user&&(
              <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"18px 16px",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:8}}>✍️</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>커뮤니티 참여하기</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>로그인하면 글쓰기와 댓글 기능을 사용할 수 있어요</div>
                <button onClick={onLoginRequest} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>로그인 / 가입</button>
              </div>
            )}
          </aside>
          )}
        </div>
      </div>}
    </div>
  );
}
