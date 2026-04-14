import { useState, useMemo, useEffect, useRef } from "react";
import { getPosts, setPosts, changePoints, getPostsFromDB, getPostByIdFromDB, savePostToDB, updatePostInDB, deletePostFromDB, migrateLocalPostsToDB, uploadFileToStorage, supabase } from "./storage";
import { useI18n } from "./i18n.jsx";
import { KlipyButton } from "./KlipyPicker";
import ShareButton, { ShareRow } from "./ShareButton";
import { buildSources, MediaCard, FreeMediaSearch, RichEditor, RichBody, WriteForm, extractThumb, extractText, toThumb, isVideoUrl, isImageUrl, safeName, ARCHIVE_CAT, fetchBoardCats, saveBoardCat, deleteBoardCat, fetchTagsByCat, fetchAllTags, saveTag, deleteTag } from "./BoardComponents.jsx";

/* ─── 기본 카테고리 (Supabase에 데이터 없을 때 폴백) ────────── */
const DEFAULT_CATS = [
  { id: "info",    label: "정보공유",   icon: "", color: "#7c6aff" },
  { id: "qna",     label: "질문답변",   icon: "", color: "#f59e0b" },
  { id: "showcase", label: "작품 공유", icon: "", color: "#ec4899" },
  { id: "archive", label: "자료실",     icon: "", color: "#3b82f6" },
  { id: "sns_briefing", label: "SNS 브리핑", icon: "", color: "#6366f1" },
];

/* ─── SEO: 게시글 메타태그 업데이트 헬퍼 ──────────────────── */
// HTML + 마크다운 문법 모두 제거 → 평문
function stripMdHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
function extractKeywordsBoard(title, plainBody, catName) {
  const text = `${title || ""} ${plainBody || ""}`;
  const tokens = (text.match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || []);
  const STOP = new Set(["그리고","그러나","하지만","때문","위해","대한","있는","있다","합니다","입니다","된다","이다","것은","이것","그것","오늘","어제","내일","through","about","which","their","there","would","could","should","https","http","www","com"]);
  const freq = new Map();
  for (const t of tokens) {
    const k = t.toLowerCase();
    if (STOP.has(k) || k.length < 2) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([w]) => w);
  const base = ["SNS메이킷"];
  if (catName) base.push(catName);
  return [...base, ...top].join(", ");
}
const CAT_LABEL_MAP = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", showcase: "작품 공유", archive: "자료실", sns_briefing: "SNS 브리핑" };

function updatePostSeoMeta(post, catId) {
  if (!post) return;
  const catName = CAT_LABEL_MAP[catId] || "커뮤니티";
  const titleClean = stripMdHtml(post.title || "").slice(0, 70);
  const plainBody = stripMdHtml(post.body || post.content || "");
  const desc = plainBody.replace(/\n/g, " ").slice(0, 155) + (plainBody.length > 155 ? "..." : "");
  const fullTitle = `${titleClean} | ${catName} - SNS메이킷`;
  document.title = fullTitle;
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.content = val; };
  const setOrCreateMeta = (name, attr, val) => {
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.content = val;
  };
  setMeta('meta[name="description"]', desc);
  setOrCreateMeta("keywords", "name", extractKeywordsBoard(titleClean, plainBody, catName));
  setMeta('meta[property="og:title"]', fullTitle);
  setMeta('meta[property="og:description"]', desc);
  setMeta('meta[property="og:url"]', `https://snsmakeit.com/community/${catId}/post-${post.id}`);
  setMeta('meta[property="og:type"]', "article");
  setMeta('meta[name="twitter:title"]', fullTitle);
  setMeta('meta[name="twitter:description"]', desc);
  // canonical
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
  canon.href = `https://snsmakeit.com/community/${catId}/post-${post.id}`;
  // 이미지: post.images[0] → 본문 첫 이미지 → 기존 og 유지
  const thumb = (Array.isArray(post.images) && post.images[0]) || extractThumb(post.body || post.content || "") || "";
  if (thumb) {
    setMeta('meta[property="og:image"]', thumb);
    setMeta('meta[name="twitter:image"]', thumb);
  }
}
function resetBoardSeoMeta() {
  document.title = "SNS메이킷 - 커뮤니티";
  const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.content = val; };
  setMeta('meta[name="description"]', "SNS메이킷 커뮤니티 - 정보공유, 질문답변, 자유게시판");
  setMeta('meta[property="og:title"]', "SNS메이킷 - 커뮤니티");
  setMeta('meta[property="og:description"]', "SNS메이킷 커뮤니티 - 정보공유, 질문답변, 자유게시판");
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
  const [viewMode,    setViewMode]    = useState("list"); // "list" | "gallery" | "compact"
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(null); // { post, x, y }
  const archiveFileRef = useRef(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveUploadFile, setArchiveUploadFile] = useState(null);
  const [archiveForm, setArchiveForm] = useState({title:"",desc:"",priceType:"free",price:"",visibility:"all"});
  const [dragOver, setDragOver] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [archiveEditPost, setArchiveEditPost] = useState(null);
  const [archiveEditForm, setArchiveEditForm] = useState({ title: "", desc: "", tag: "" });
  const [archiveThumb, setArchiveThumb] = useState(null); // 썸네일 이미지 파일 (비이미지 자료용)
  const archiveThumbRef = useRef(null);

  // 뒤로가기 시 게시글 상세→목록으로 복원
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;
      if (view && !path.includes("/post-")) {
        // 게시글 상세에서 목록으로 돌아가기
        setView(null);
        setMode("list");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [view]);

  // 파일 타입 자동 감지
  const detectMediaType = (file) => {
    const name = file.name.toLowerCase();
    const mime = (file.type || "").toLowerCase();
    if (mime.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(name)) return "video";
    if (/\.gif$/i.test(name) || mime === "image/gif") return "gif";
    if (mime.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(name)) return "music";
    if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|svg|tiff)$/i.test(name)) return "photo";
    return "file";
  };

  // AI로 파일 분석 → 제목/설명 자동 생성 (이미지는 비전 분석)
  const generateAiMeta = async (fileName, mediaType, file) => {
    const typeLabel = { video: "영상", gif: "GIF/짤", photo: "사진/이미지", music: "음악", file: "파일" }[mediaType] || "자료";
    const cleanName = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").replace(/\d{8,}/g, "").trim();
    try {
      // 이미지 파일이면 비전 분석으로 내용 파악
      let messages;
      if ((mediaType === "photo" || mediaType === "gif") && file && file.size < 5 * 1024 * 1024) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(file);
        });
        const mimeType = file.type || "image/png";
        messages = [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          { type: "text", text: `이 이미지를 분석해서 자료실 등록용 제목과 한줄 설명을 한국어로 만들어줘.\n- 제목: 이미지의 핵심 내용을 반영한 간결한 제목 (파일명 "${cleanName}" 참고하되, 이미지 내용 우선)\n- 설명: 이미지가 어떤 용도로 활용할 수 있는지 한 줄로\nJSON만 출력: {"title":"제목","desc":"설명"}` }
        ]}];
      } else {
        messages = [{ role: "user", content: `파일명: "${cleanName}" (${typeLabel} 파일)\n이 파일의 자료실 등록용 제목과 한줄 설명을 한국어로 만들어줘. JSON만 출력: {"title":"제목","desc":"설명"}` }];
      }
      const r = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 300, messages }),
      });
      const data = await r.json();
      const txt = (data.choices?.[0]?.message?.content || data.content?.[0]?.text || "").replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(txt);
      return { title: parsed.title || cleanName, desc: parsed.desc || `${typeLabel} 자료` };
    } catch(e) { return { title: cleanName || fileName, desc: `${typeLabel} 자료` }; }
  };

  const handleArchiveUpload = async (files) => {
    if (!files || files.length === 0 || !user) { if (!user && onLoginRequest) onLoginRequest(); return; }
    const fileArr = Array.from(files);

    // 단일 파일: 모달 방식 + AI 이미지 분석으로 제목/설명 자동 생성
    if (fileArr.length === 1) {
      const file = fileArr[0];
      setArchiveUploadFile(file);
      const autoTag = detectMediaType(file);
      const tagLabel = { video: "영상", gif: "GIF", photo: "사진", music: "음악" }[autoTag] || "";
      // 먼저 파일명으로 임시 표시 후 AI 분석
      const cleanName = file.name.replace(/\.[^.]+$/, "");
      setArchiveForm({ title: "분석 중...", desc: "AI가 이미지를 분석하고 있어요", priceType: "free", price: "", visibility: "all", tag: tagLabel });
      setShowArchiveModal(true);
      // AI 이미지 분석 실행
      try {
        const meta = await generateAiMeta(file.name, autoTag, file);
        setArchiveForm(prev => ({ ...prev, title: meta.title, desc: meta.desc }));
      } catch {
        setArchiveForm(prev => ({ ...prev, title: cleanName, desc: "" }));
      }
      return;
    }

    // 다중 파일: 자동 업로드 + AI 분류
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: fileArr.length });
    let uploaded = 0;

    for (const file of fileArr) {
      if (file.size > 50 * 1024 * 1024) { alert(`${file.name}: 50MB 초과`); uploaded++; setBulkProgress(p => ({ ...p, done: uploaded })); continue; }
      try {
        const mediaType = detectMediaType(file);
        const meta = await generateAiMeta(file.name, mediaType, file);
        const path = `archive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const url = await uploadFileToStorage(file, path);
        const tagLabel = { video: "영상", gif: "GIF", photo: "사진", music: "음악" }[mediaType] || "";
        await submitPost({
          title: meta.title,
          body: `<p>${meta.desc}</p>`,
          subCat: "archive", tag: tagLabel, images: [url],
          priceType: "free", price: "",
        });
        uploaded++;
        setBulkProgress(p => ({ ...p, done: uploaded }));
      } catch (e) { alert(`${file.name} 업로드 실패: ${e.message}`); uploaded++; setBulkProgress(p => ({ ...p, done: uploaded })); }
    }

    showToast(`${uploaded}개 자료가 등록됐어요!`, "success");
    setBulkUploading(false);
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

  // 반응형 감지
  useEffect(()=>{
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // 카테고리 + 태그 + 게시글 모두 병렬 로드
  useEffect(()=>{
    // 1) localStorage 즉시 표시 (로딩 스피너 없음)
    const cached = getPosts();
    if (cached.length > 0) { setPostsS(cached); setLoading(false); }

    // 2) Supabase 병렬 로드 (카테고리 + 태그 + 게시글 동시)
    (async () => {
      try {
        const migrated = localStorage.getItem("nper_migrated_v1");
        if (!migrated) {
          try { await migrateLocalPostsToDB(); localStorage.setItem("nper_migrated_v1", "1"); } catch(e) {}
        }
        // 병렬 실행
        const [dbData, cats, tags] = await Promise.all([
          getPostsFromDB(),
          fetchBoardCats(),
          fetchAllTags(),
        ]);
        if (cats) setSubCats(cats);
        if (tags) setAllTags(tags);
        if (dbData && dbData.length > 0) {
          const localPosts = getPosts();
          const dbIds = new Set(dbData.map(p => String(p.id)));
          const localOnly = localPosts.filter(p => !dbIds.has(String(p.id)));
          const merged = [...localOnly, ...dbData].sort((a, b) => b.id - a.id);
          setPostsS(merged);
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
        const cat = found.subCat||found.cat||subCat;
        setPostsS(prev => prev.map(pp=>pp.id===found.id ? updated : pp));
        updatePostInDB(found.id, {views: updated.views});
        setView(updated);
        if(found.subCat||found.cat) setSubCat(found.subCat||found.cat);
        updatePostSeoMeta(updated, cat);
        // body가 없으면 Supabase에서 full post 로드
        if(!found.body){
          getPostByIdFromDB(found.id).then(full=>{
            if(full){
              const withBody={...updated, body:full.body, images:full.images||updated.images};
              setView(withBody);
              setPostsS(prev=>prev.map(pp=>pp.id===found.id?{...pp,body:full.body}:pp));
              updatePostSeoMeta(withBody, cat);
            }
          });
        }
      } else {
        // 목록에 없으면 Supabase에서 직접 로드
        getPostByIdFromDB(Number(pendingPostId)).then(full=>{
          if(full){
            const updated={...full, views:(full.views||0)+1};
            const cat = full.subCat||full.cat||subCat;
            setView(updated);
            if(full.subCat||full.cat) setSubCat(full.subCat||full.cat);
            updatePostInDB(full.id, {views: updated.views}).catch(()=>{});
            updatePostSeoMeta(updated, cat);
          }
        });
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
      if(subCat==="archive" && ["video","photo","gif","music","collection"].includes(filterTag)) {
        list = list.filter(p => {
          const imgs = p.images || [];
          if(filterTag==="video") return imgs.some(u=>/\.(mp4|mov|avi|webm|mkv)/i.test(u));
          if(filterTag==="photo") return imgs.some(u=>/\.(jpg|jpeg|png|webp|avif|bmp)/i.test(u)) && !imgs.some(u=>/\.gif$/i.test(u));
          if(filterTag==="gif") return imgs.some(u=>/\.gif$/i.test(u));
          if(filterTag==="music") return imgs.some(u=>/\.(mp3|wav|ogg|flac|m4a|aac)/i.test(u));
          if(filterTag==="collection") return p.tag==="모음집" || imgs.length >= 3;
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
    [...posts].filter(p=>p.cat!=="sns_briefing"&&p.subCat!=="sns_briefing").sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10),
  [posts]);

  // 자료실 탭: 첨부파일 있는 전체 게시물 + 필터태그 적용
  const archiveFiltered = useMemo(()=>{
    let list = posts.filter(p=>(p.cat==="archive"||p.subCat==="archive") && (p.images||[]).length>0);
    if(filterTag && ["video","photo","gif","music","collection"].includes(filterTag)) {
      list = list.filter(p => {
        const imgs = p.images || [];
        if(filterTag==="video") return imgs.some(u=>/\.(mp4|mov|avi|webm|mkv)/i.test(u));
        if(filterTag==="photo") return imgs.some(u=>/\.(jpg|jpeg|png|webp|avif|bmp)/i.test(u)) && !imgs.some(u=>/\.gif$/i.test(u));
        if(filterTag==="gif") return imgs.some(u=>/\.gif$/i.test(u));
        if(filterTag==="music") return imgs.some(u=>/\.(mp3|wav|ogg|flac|m4a|aac)/i.test(u));
        if(filterTag==="collection") return p.tag==="모음집" || imgs.length >= 3;
        return true;
      });
    }
    if(search.trim()){const q=search.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.nick||"").toLowerCase().includes(q));}
    return sort==="views"?[...list].sort((a,b)=>(b.views||0)-(a.views||0))
          :sort==="likes"?[...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
          :[...list].sort((a,b)=>b.id-a.id);
  },[posts,search,sort,filterTag]);

  const isArchivePostsView = false; // 자료실도 일반 게시판 리스트로 표시
  const activeFiltered = subCat==="archive" && archiveView==="posts" ? archiveFiltered : filtered;
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
      // 검색엔진 자동 색인 (IndexNow — 비동기, 실패해도 무시)
      fetch(`/api/seo?action=index-now&url=/community/${cat}/post-${p.id}`).catch(() => {});
    } catch(e) {
      /* Supabase save failed, localStorage only */
    }
    // 1P 지급
    if(user.uid){
      try {
        const newPts = await changePoints(user.uid, 2, "커뮤니티 글 작성");
        if(onUserUpdate) onUserUpdate({...user, points: newPts});
        showToast("글이 등록됐어요! +2P 포인트가 지급됐습니다","success");
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
    try { await deletePostFromDB(id); } catch(e){ /* DB delete failed */ }
  };

  const openPost = async p => {
    const updated = {...p, views:(p.views||0)+1};
    const next = posts.map(pp=>pp.id===p.id ? updated : pp);
    syncLocal(next); setView(updated);
    const cat = p.subCat||p.cat||subCat;
    window.history.pushState(null,"","/community/"+cat+"/post-"+p.id);
    // SEO: 동적 title + meta description + og tags
    updatePostSeoMeta(updated, cat);
    updatePostInDB(p.id, {views: updated.views}).catch(()=>{});
    // body가 없으면 Supabase에서 full post 로드
    if (!p.body) {
      const full = await getPostByIdFromDB(p.id);
      if (full) {
        const withBody = {...updated, body: full.body, images: full.images||updated.images};
        setView(withBody);
        setPostsS(prev => prev.map(pp => pp.id===p.id ? {...pp, body: full.body} : pp));
        updatePostSeoMeta(withBody, cat); // body 로드 후 meta 갱신
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
    const url = window.location.origin + "/community/"+(post.subCat||post.cat||subCat)+"/post-"+post.id;
    if(navigator.share){ navigator.share({title:post.title,text:post.title,url}); }
    else { navigator.clipboard.writeText(url); showToast("링크가 복사됐어요","info"); }
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
    if (!w) return;
    const doc = w.document;
    doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title></title>
      <style>body{font-family:sans-serif;padding:40px;line-height:1.8;max-width:750px;margin:0 auto}
      h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:12px}
      .meta{color:#666;font-size:13px;margin-bottom:24px}
      img{max-width:100%}table{border-collapse:collapse;width:100%}td{border:1px solid #ccc;padding:8px}</style>
    </head><body><h1></h1><div class="meta"></div><div id="content"></div></body></html>`);
    doc.close();
    doc.title = post.title;
    doc.querySelector("h1").textContent = post.title;
    doc.querySelector(".meta").textContent = `${post.nick} \xb7 ${post.date} \xb7 조회 ${post.views||0}`;
    doc.getElementById("content").innerHTML = post.body;
    w.focus(); w.print();
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
      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 16px 60px"}}>
        <button onClick={()=>{setView(null);setTranslatedBody(null);window.history.pushState(null,"","/community/"+subCat);resetBoardSeoMeta();}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,marginBottom:18,padding:"8px 0",fontWeight:600}}>← 목록으로</button>
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"20px 20px 16px",borderBottom:"1px solid "+bdr}}>
            {subInfo&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:subInfo.color+"20",color:subInfo.color,fontWeight:700,display:"inline-block",marginBottom:12}}>{subInfo.icon} {subInfo.label}</span>}
            <h1 style={{fontSize:20,fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.4,wordBreak:"keep-all"}}>{view.title}{view.edited&&<span style={{fontSize:11,color:C.muted,marginLeft:8,fontWeight:400}}>(수정됨)</span>}</h1>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12,fontSize:13,color:C.muted,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{(view.nick||"?")[0].toUpperCase()}</div>
                  <span style={{fontWeight:700,color:C.text}}>{view.nick}</span>
                </div>
                <span>{view.date}</span>
                <span>조회 {view.views||0}</span>
                <span>댓글 {(view.comments||[]).length}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <button onClick={()=>sharePost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>공유</button>
                <button onClick={()=>printPost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>인쇄</button>
                <button onClick={translatePost} disabled={translating} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:translatedBody?"rgba(99,102,241,0.1)":"transparent",color:translatedBody?"#7c6aff":C.muted,fontSize:12,cursor:translating?"wait":"pointer"}}>
                  {translating?"번역중...":translatedBody?"번역됨":"번역"}
                </button>
                {own(view)&&<>
                  <button onClick={()=>setMode("edit")} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>수정</button>
                  <button onClick={()=>del(view.id)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.05)",color:"#ef4444",fontSize:12,cursor:"pointer"}}>{t("delete")}</button>
                </>}
              </div>
            </div>
          </div>
          <div style={{padding:"20px 20px 20px"}}>
            <RichBody html={view.body} C={C}/>
            {translatedBody && (
              <div style={{marginTop:16,padding:"16px 20px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.04)",border:"1px solid rgba(99,102,241,0.2)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#7c6aff"}}>번역 결과</span>
                  <button onClick={()=>setTranslatedBody(null)} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:"1px solid rgba(99,102,241,0.3)",background:"transparent",color:"#7c6aff",cursor:"pointer"}}>닫기</button>
                </div>
                <div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{translatedBody}</div>
              </div>
            )}
            {/* 첨부 이미지/영상 */}
            {(view.images||[]).length > 0 && (
              <div style={{marginTop:24,borderTop:"1px solid "+bdr,paddingTop:20}}>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12}}>첨부 파일 {view.images.length}개</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {view.images.map((url,i)=>{
                    const isPdf = /\.pdf/i.test(url);
                    const fname = decodeURIComponent(url.split("/").pop().replace(/^\d+_/,""));
                    return isVideoUrl(url) ? (
                      <div key={i}>
                        <video src={url} controls style={{width:"100%",maxWidth:640,borderRadius:10,border:"1px solid "+bdr,display:"block"}}/>
                        <a href={url} download style={{display:"inline-block",marginTop:6,fontSize:12,color:C.purpleL||"#7c6aff",textDecoration:"none"}}>영상 다운로드</a>
                      </div>
                    ) : isImageUrl(url) ? (
                      <div key={i}>
                        <img src={toThumb(url,1200,900)} alt={`첨부${i+1}`} style={{maxWidth:"100%",borderRadius:10,border:"1px solid "+bdr,display:"block",cursor:"pointer"}}
                          onClick={()=>window.open(url,"_blank")} onError={e=>{e.target.style.opacity="0.3";}}/>
                        <a href={url} download style={{display:"inline-block",marginTop:4,fontSize:11,color:C.muted,textDecoration:"none"}}>이미지 다운로드</a>
                      </div>
                    ) : isPdf ? (
                      <div key={i} style={{borderRadius:12,border:"1px solid "+bdr,overflow:"hidden",background:isDark?"rgba(255,255,255,0.03)":"#fafafa"}}>
                        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h6"/></svg>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fname}</div>
                            <div style={{fontSize:11,color:C.muted}}>PDF 문서</div>
                          </div>
                          <a href={url} download style={{padding:"8px 16px",borderRadius:8,background:C.purpleL||"#7c6aff",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",flexShrink:0}}>다운로드</a>
                        </div>
                      </div>
                    ) : (
                      <div key={i} style={{borderRadius:12,border:"1px solid "+bdr,overflow:"hidden",background:isDark?"rgba(255,255,255,0.03)":"#fafafa"}}>
                        <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fname}</div>
                            <div style={{fontSize:11,color:C.muted}}>첨부 파일</div>
                          </div>
                          <a href={url} download style={{padding:"8px 16px",borderRadius:8,background:C.purpleL||"#7c6aff",color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",flexShrink:0}}>다운로드</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{padding:"12px 20px",borderTop:"1px solid "+bdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:C.muted}}>SNS 공유</span>
            <ShareRow title={view.title} text={view.body?.replace(/<[^>]*>/g,"")?.slice(0,200)} isDark={isDark} compact />
          </div>
          <div style={{padding:"16px 20px 24px",textAlign:"center",borderTop:"1px solid "+bdr}}>
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
          <button onClick={()=>{setView(null);window.history.pushState(null,"","/community/"+subCat);resetBoardSeoMeta();}}
            style={{padding:"10px 32px",borderRadius:10,border:"1px solid "+bdr,background:C.card,color:C.muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            ≡ 목록으로
          </button>
        </div>
        {/* 댓글 */}
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",borderBottom:"1px solid "+bdr}}>
            <span style={{fontSize:15,fontWeight:700,color:C.text}}>댓글 {(view.comments||[]).length}개</span>
          </div>
          <div style={{padding:"0 20px"}}>
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
            {(view.comments||[]).length===0&&<div style={{padding:"24px 0",textAlign:"center",color:C.muted,fontSize:14}}>첫 댓글을 남겨보세요</div>}
          </div>
          <div style={{padding:"14px 20px",borderTop:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
            {user?(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.nick||"?")[0].toUpperCase()}</div>
                <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="댓글을 입력하세요..."
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}}
                  style={{flex:1,minWidth:0,padding:"11px 14px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none"}}/>
                <button onClick={()=>addComment(view.id)} style={{padding:"11px 18px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>등록</button>
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
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:44,height:44,borderRadius:"50%",border:"3px solid "+(isDark?"rgba(255,255,255,0.08)":"#e9ecef"),borderTopColor:"#7c6aff",animation:"spin 1s linear infinite",marginBottom:16}}/>
          <div style={{fontSize:15,fontWeight:600}}>{t("loadingPosts")}</div>
        </div>
      )}

      {/* 서브 카테고리 탭 */}
      {!loading && <div style={{borderBottom:"1px solid "+bdr,background:isDark?"rgba(99,102,241,0.04)":"rgba(99,102,241,0.02)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
          {(subCat==="archive"?subCats.filter(s=>s.id==="archive"):subCats.filter(s=>s.id!=="archive")).map(s=>(
            <button key={s.id} onClick={()=>{setSubCat(s.id);setSearch("");setPage(1);setView(null);setFilterTag("");setArchiveView("posts");}}
              style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"14px 16px":"16px 22px",borderRadius:0,border:"none",cursor:"pointer",
                fontSize:isMobile?14:15,fontWeight:subCat===s.id?800:600,whiteSpace:"nowrap",minHeight:48,fontFamily:"inherit",
                background:"transparent",color:subCat===s.id?s.color:C.muted,
                borderBottom:subCat===s.id?"3px solid "+s.color:"3px solid transparent",
                transition:"all 0.12s"}}>
              {s.label}
              <span style={{fontSize:12,fontWeight:700,opacity:0.75,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",padding:"3px 9px",borderRadius:12}}>{posts.filter(p=>p.cat===s.id||p.subCat===s.id).length}</span>
            </button>
          ))}
          {user?.role==="admin" && (
            <button onClick={()=>setShowCatMgr(true)}
              style={{marginLeft:"auto",flexShrink:0,padding:"10px 16px",borderRadius:10,border:"1px dashed "+bdr,background:"transparent",color:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              카테고리 관리
            </button>
          )}
        </div>
      </div>}

      {!loading && <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
        {/* 포인트 안내 배너 */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",margin:"18px 0 0",borderRadius:12,
          background:isDark?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.18)"}}>
          <div style={{width:36,height:36,borderRadius:10,background:"rgba(34,197,94,0.15)",color:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <span style={{fontSize:14,color:isDark?"#86efac":"#166534",lineHeight:1.7}}>
            <b>포인트 적립 안내</b> · 게시글 작성 시 <b style={{color:"#22c55e"}}>+1P</b> 적립 (하루 최대 10회).
            댓글에는 포인트가 지급되지 않으며, 매일 로그인 시 <b style={{color:"#22c55e"}}>+2P</b>가 추가로 적립됩니다.
          </span>
        </div>

        <div style={{display:"flex",gap:20,padding:"16px 0 60px",alignItems:"flex-start",flexDirection:isMobile?"column":"row"}}>
          {/* 메인 */}
          <div style={{flex:1,minWidth:0,overflow:"hidden",width:"100%"}}>

            {/* 작품 공유 카드 그리드 */}
            {subCat==="showcase" && (archiveView!=="write") && (() => {
              const showcasePosts = posts.filter(p=>p.cat==="showcase"||p.subCat==="showcase");
              const sorted = [...showcasePosts].sort((a,b)=>b.id-a.id);
              return (
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                    <div style={{fontSize:13,color:C.muted}}>{sorted.length}개 프로젝트</div>
                    {user && <button onClick={()=>setView({mode:"write",subCat:"showcase"})}
                      style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      프로젝트 공유하기
                    </button>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?"100%":"280px"},1fr))`,gap:16}}>
                    {sorted.map(p => {
                      const thumb = (p.images && p.images[0]) || null;
                      const plainBody = (p.body||p.content||"").replace(/<[^>]*>/g,"").replace(/!\[.*?\]\(.*?\)/g,"").slice(0,120);
                      return (
                        <div key={p.id} onClick={()=>openPost(p)}
                          style={{borderRadius:16,border:`1px solid ${bdr}`,overflow:"hidden",cursor:"pointer",
                            background:isDark?"rgba(255,255,255,0.03)":"#fff",transition:"all 0.18s",
                            boxShadow:isDark?"none":"0 1px 3px rgba(0,0,0,0.04)"}}
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(124,106,255,0.12)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=isDark?"none":"0 1px 3px rgba(0,0,0,0.04)";}}>
                          {thumb ? (
                            <div style={{width:"100%",aspectRatio:"16/9",overflow:"hidden",background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5"}}>
                              <img src={thumb} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>{e.target.parentElement.style.display="none";}}/>
                            </div>
                          ) : (
                            <div style={{width:"100%",aspectRatio:"16/9",background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)"} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            </div>
                          )}
                          <div style={{padding:"16px 18px"}}>
                            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{plainBody}</div>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:12,color:"#7c6aff",fontWeight:700}}>{p.nick}</span>
                                <span style={{fontSize:11,color:C.muted}}>{p.date}</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:C.muted}}>
                                <span style={{display:"flex",alignItems:"center",gap:3}}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  {p.views||0}
                                </span>
                                {(p.likes||0)>0 && <span style={{display:"flex",alignItems:"center",gap:3,color:"#f59e0b"}}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                  {p.likes}
                                </span>}
                                {(p.comments||[]).length>0 && <span style={{display:"flex",alignItems:"center",gap:3}}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                  {p.comments.length}
                                </span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sorted.length===0 && (
                    <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{margin:"0 auto 16px",display:"block",opacity:0.3}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>아직 공유된 프로젝트가 없어요</div>
                      <div style={{fontSize:13,lineHeight:1.7}}>AI로 만든 도구, 사이트, 프로젝트를 자유롭게 공유해보세요</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 자료실 전용 탭 (영상/사진/GIF/무료이미지) */}
            {subCat==="archive" && (
              <>
                <div style={{display:"flex",gap:4,marginBottom:0,borderBottom:"1px solid "+bdr,paddingBottom:0}}>
                  {[["posts","자료실"],["search","무료 이미지·GIF"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setArchiveView(v)} style={{
                      padding:"9px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:archiveView===v?700:500,
                      background:"transparent",borderRadius:"8px 8px 0 0",
                      color:archiveView===v?"#a5b4fc":C.muted,
                      borderBottom:archiveView===v?"2px solid #7c6aff":"2px solid transparent",
                    }}>{l}</button>
                  ))}
                </div>
                {/* 법적 고지 */}
                <div style={{padding:"10px 14px",margin:"12px 0",borderRadius:10,background:isDark?"rgba(245,158,11,0.06)":"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.15)",fontSize:11,color:isDark?"#fbbf24":"#92400e",lineHeight:1.7}}>
                  <b>상업적 이용 안내</b> · 개인이 올린 자료는 상업적으로 사용할 시 법적 처벌을 받을 수 있습니다.
                  사이트 관리자 또는 엔퍼 사용자가 올린 자료는 상업적으로 사용해도 문제가 없음을 알려드립니다.
                </div>
              </>
            )}

            {/* 무료 이미지·GIF 검색 뷰 */}
            {subCat==="archive" && archiveView==="search" && (
              <FreeMediaSearch C={C} isDark={isDark} bdr={bdr}/>
            )}

            {/* 자료실 파일 input (숨김) */}
            {subCat==="archive" && (
              <input ref={archiveFileRef} type="file" multiple accept="image/*,video/*,audio/*,.gif,.zip,.rar,.7z,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.hwp,.txt" style={{display:"none"}} onChange={e=>{
                handleArchiveUpload(e.target.files);
                e.target.value="";
              }}/>
            )}

            {/* 자료 업로드 상세 설정 모달 */}
            {showArchiveModal && archiveUploadFile && (
              <div onClick={()=>{setShowArchiveModal(false);setArchiveUploadFile(null);setArchiveThumb(null);}} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                <div onClick={e=>e.stopPropagation()} style={{width:"min(480px,95vw)",background:isDark?"#1a1730":"#fff",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}`}}>
                  <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:16}}>자료 등록</div>
                  {/* 썸네일 미리보기 */}
                  {archiveUploadFile && archiveUploadFile.type?.startsWith("image") && (
                    <div style={{marginBottom:12,borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,maxHeight:180,display:"flex",justifyContent:"center",background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb"}}>
                      <img src={URL.createObjectURL(archiveUploadFile)} alt="" style={{maxWidth:"100%",maxHeight:180,objectFit:"contain"}} onLoad={e=>URL.revokeObjectURL(e.target.src)}/>
                    </div>
                  )}
                  {archiveUploadFile && archiveUploadFile.type?.startsWith("video") && (
                    <div style={{marginBottom:12,borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,maxHeight:180,background:"#000"}}>
                      <video src={URL.createObjectURL(archiveUploadFile)} controls muted style={{maxWidth:"100%",maxHeight:180,display:"block",margin:"0 auto"}}/>
                    </div>
                  )}
                  {/* 비이미지/비영상 파일: 썸네일 추가 */}
                  {archiveUploadFile && !archiveUploadFile.type?.startsWith("image") && !archiveUploadFile.type?.startsWith("video") && (
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:6}}>썸네일 이미지 <span style={{fontWeight:400}}>(선택)</span></div>
                      {archiveThumb ? (
                        <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,maxHeight:160,display:"flex",justifyContent:"center",background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb"}}>
                          <img src={URL.createObjectURL(archiveThumb)} alt="" style={{maxWidth:"100%",maxHeight:160,objectFit:"contain"}} onLoad={e=>URL.revokeObjectURL(e.target.src)}/>
                          <button onClick={()=>setArchiveThumb(null)} style={{position:"absolute",top:6,right:6,width:22,height:22,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
                        </div>
                      ) : (
                        <button onClick={()=>archiveThumbRef.current?.click()}
                          style={{width:"100%",padding:"16px",borderRadius:12,border:`2px dashed ${bdr}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",textAlign:"center"}}>
                          + 썸네일 이미지 추가 (드래그 또는 클릭)
                        </button>
                      )}
                      <input ref={archiveThumbRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])setArchiveThumb(e.target.files[0]);e.target.value="";}}/>
                    </div>
                  )}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>파일</div>
                    <div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.04)":"#f8f8fb",fontSize:13,color:C.text}}>{archiveUploadFile.name} <span style={{color:C.muted,fontSize:11}}>({(archiveUploadFile.size/1024/1024).toFixed(1)}MB)</span></div>
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
                    {[["free","무료","#22c55e"],["paid","유료","#f59e0b"]].map(([v,l,c])=>(
                      <button key={v} onClick={()=>{ if(v==="paid" && user?.role!=="admin"){ alert("유료 자료는 관리자만 등록할 수 있습니다."); return; } setArchiveForm(p=>({...p,priceType:v})); }}
                        style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${archiveForm.priceType===v?c:bdr}`,background:archiveForm.priceType===v?c+"15":"transparent",color:archiveForm.priceType===v?c:C.muted,fontSize:13,fontWeight:archiveForm.priceType===v?800:500,cursor:"pointer",opacity:v==="paid"&&user?.role!=="admin"?0.4:1}}>{l}</button>
                    ))}
                  </div>
                  {archiveForm.priceType==="paid" && (
                    <div style={{marginBottom:12}}>
                      <input value={archiveForm.price} onChange={e=>setArchiveForm(p=>({...p,price:e.target.value}))} placeholder="가격 (예: 5,000원)"
                        style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  )}
                  {/* 분류 태그 */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:6}}>분류</div>
                    <div style={{display:"flex",gap:6}}>
                      {[{id:"영상",c:"#ef4444"},{id:"사진",c:"#3b82f6"},{id:"GIF",c:"#8b5cf6"},{id:"모음집",c:"#f59e0b"}].map(t=>(
                        <button key={t.id} onClick={()=>setArchiveForm(p=>({...p,tag:p.tag===t.id?"":t.id}))}
                          style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${(archiveForm.tag||"")=== t.id?t.c:bdr}`,
                            background:(archiveForm.tag||"")===t.id?t.c+"20":"transparent",color:(archiveForm.tag||"")===t.id?t.c:C.muted,
                            fontSize:12,fontWeight:(archiveForm.tag||"")===t.id?700:500,cursor:"pointer"}}>{t.id}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    {[["all","전체 공개"],["member","회원 전용"],["nonmember","비회원 포함"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setArchiveForm(p=>({...p,visibility:v}))}
                        style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${archiveForm.visibility===v?"#7c6aff":bdr}`,background:archiveForm.visibility===v?"rgba(99,102,241,0.12)":"transparent",color:archiveForm.visibility===v?"#a5b4fc":C.muted,fontSize:11,fontWeight:archiveForm.visibility===v?700:500,cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>{setShowArchiveModal(false);setArchiveUploadFile(null);setArchiveThumb(null);}} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer"}}>취소</button>
                    <button onClick={async()=>{
                      const file = archiveUploadFile;
                      try {
                        const path = `archive/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
                        const url = await uploadFileToStorage(file, path);
                        const type = file.type.startsWith("video")?"video":file.type.startsWith("image")?"image":"file";
                        const images = [url];
                        // 썸네일 이미지가 있으면 업로드해서 첫번째에 추가
                        if (archiveThumb) {
                          try {
                            const thumbPath = `archive/thumb_${Date.now()}_${archiveThumb.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
                            const thumbUrl = await uploadFileToStorage(archiveThumb, thumbPath);
                            images.unshift(thumbUrl);
                          } catch(te) { /* thumbnail upload failed */ }
                        }
                        await submitPost({
                          title: archiveForm.title || file.name.replace(/\.[^.]+$/,""),
                          body: `<p>${archiveForm.desc || type+" 자료"}</p>`,
                          subCat:"archive", tag: archiveForm.tag || "", images,
                          priceType: archiveForm.priceType, price: archiveForm.price,
                        });
                        showToast("자료가 등록됐어요!","success");
                        try { const db = await getPostsFromDB(); if(db?.length) { setPostsS(db.sort((a,b)=>b.id-a.id)); setPosts(db); } } catch{}
                      } catch(e){ alert("업로드 실패: "+e.message); }
                      setShowArchiveModal(false); setArchiveUploadFile(null); setArchiveThumb(null);
                      setArchiveForm({title:"",desc:"",priceType:"free",price:"",visibility:"all"});
                    }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>등록하기</button>
                  </div>
                </div>
              </div>
            )}

            {/* 자료실 미디어 그리드 뷰 */}
            {subCat==="archive" && archiveView==="posts" && <>
                {/* 드래그앤드롭 업로드 영역 */}
                {user && (
                  <div
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const files = e.dataTransfer.files; if (files?.length) handleArchiveUpload(files); }}
                    onClick={() => archiveFileRef.current?.click()}
                    style={{
                      marginBottom: 16, padding: bulkUploading ? "16px" : "28px 20px", borderRadius: 16,
                      border: `2px dashed ${dragOver ? "#7c6aff" : bdr}`,
                      background: dragOver ? (isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)") : "transparent",
                      textAlign: "center", cursor: bulkUploading ? "default" : "pointer",
                      transition: "all 0.2s",
                    }}>
                    {bulkUploading ? (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                          업로드 중... ({bulkProgress.done}/{bulkProgress.total})
                        </div>
                        <div style={{ width: "100%", height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#7c6aff,#8b5cf6)", width: `${bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4, color: C.muted }}>+</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: dragOver ? "#7c6aff" : C.text, marginBottom: 4 }}>
                          파일을 여기에 드래그하거나 클릭하세요
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          사진 · 영상 · GIF · 음악 파일을 여러 개 한번에 올릴 수 있어요 (AI가 자동 분류)
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 서브탭 (무료이미지 스타일) */}
                <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid "+bdr}}>
                  {[{id:"",label:"전체"},{id:"photo",label:"이미지"},{id:"video",label:"영상"},{id:"gif",label:"GIF"},{id:"collection",label:"모음집"}].map(t=>{
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
                </div>

                {/* 자료실은 아래 일반 게시판 리스트에서 렌더 */}

                {/* 자료실 인라인 수정 모달 */}
                {archiveEditPost && (
                  <div onClick={()=>setArchiveEditPost(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                    <div onClick={e=>e.stopPropagation()} style={{width:"min(500px,95vw)",maxHeight:"85vh",overflowY:"auto",background:isDark?"#1a1730":"#fff",borderRadius:20,padding:"24px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)",border:`1px solid ${bdr}`}}>
                      {/* 미리보기 */}
                      {(archiveEditPost.images||[])[0] && (
                        <div style={{marginBottom:16,borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,maxHeight:240}}>
                          {/\.(mp4|mov|avi|webm|mkv)/i.test(archiveEditPost.images[0])
                            ? <video src={archiveEditPost.images[0]} controls style={{width:"100%",maxHeight:240,objectFit:"contain",background:"#000"}}/>
                            : <img src={archiveEditPost.images[0]} alt="" style={{width:"100%",maxHeight:240,objectFit:"contain",background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb"}}/>}
                        </div>
                      )}
                      <div style={{fontSize:18,fontWeight:900,color:C.text,marginBottom:16}}>자료 수정</div>
                      {/* 제목 */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>제목</div>
                        <input value={archiveEditForm.title} onChange={e=>setArchiveEditForm(p=>({...p,title:e.target.value}))}
                          style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      {/* 설명 */}
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:4}}>설명</div>
                        <textarea value={archiveEditForm.desc} onChange={e=>setArchiveEditForm(p=>({...p,desc:e.target.value}))} rows={2}
                          style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
                      </div>
                      {/* 태그 선택 */}
                      <div style={{marginBottom:16}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:6}}>분류 태그</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {[{id:"영상",c:"#ef4444"},{id:"사진",c:"#3b82f6"},{id:"GIF",c:"#8b5cf6"},{id:"모음집",c:"#f59e0b"}].map(t=>(
                            <button key={t.id} onClick={()=>setArchiveEditForm(p=>({...p,tag:p.tag===t.id?"":t.id}))}
                              style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${archiveEditForm.tag===t.id?t.c:bdr}`,
                                background:archiveEditForm.tag===t.id?t.c+"20":"transparent",color:archiveEditForm.tag===t.id?t.c:C.muted,
                                fontSize:12,fontWeight:archiveEditForm.tag===t.id?700:500,cursor:"pointer"}}>{t.id}</button>
                          ))}
                        </div>
                      </div>
                      {/* 버튼 */}
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setArchiveEditPost(null)} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer"}}>취소</button>
                        <button onClick={async()=>{
                          try {
                            const updates = { title: archiveEditForm.title, body: `<p>${archiveEditForm.desc}</p>`, tag: archiveEditForm.tag };
                            await updatePostInDB(archiveEditPost.id, updates);
                            const updated = posts.map(p=>p.id===archiveEditPost.id?{...p,...updates,body:updates.body}:p);
                            syncLocal(updated);
                            showToast("수정 완료!","success");
                          } catch(e){ alert("수정 실패: "+e.message); }
                          setArchiveEditPost(null);
                        }} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>저장</button>
                        <button onClick={async()=>{
                          if(!confirm("이 자료를 삭제하시겠습니까?")) return;
                          try { await deletePostFromDB(archiveEditPost.id); syncLocal(posts.filter(p=>p.id!==archiveEditPost.id)); showToast("삭제 완료","success"); } catch(e){}
                          setArchiveEditPost(null);
                        }} style={{padding:"12px 16px",borderRadius:10,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#ef4444",fontSize:14,fontWeight:700,cursor:"pointer"}}>삭제</button>
                      </div>
                    </div>
                  </div>
                )}
              </>}

            {/* 일반 게시판 뷰 (무료이미지 검색 탭에서는 숨김) */}
            {!(subCat==="archive" && archiveView==="search") && <>

            {/* 액션바 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:17,fontWeight:900,color:C.text,letterSpacing:-0.3}}>{subInfo.label}</span>
                <span style={{fontSize:12,fontWeight:700,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f8",padding:"4px 10px",borderRadius:12}}>{t("totalN")} {activeFiltered.length}{t("itemsUnit")}{isArchivePostsView?" "+t("withAttach"):""}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",border:"1.5px solid "+bdr,borderRadius:11,overflow:"hidden",background:isDark?"rgba(255,255,255,0.04)":"#fff",minHeight:42,alignItems:"center",paddingLeft:10}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={t("search")}
                    style={{padding:"10px 12px",border:"none",background:"transparent",color:C.text,fontSize:14,outline:"none",width:isMobile?100:170,minHeight:40}}/>
                  {search&&<button onClick={()=>{setSearch("");setPage(1);}} style={{padding:"10px 12px",border:"none",background:"transparent",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center"}} aria-label="지우기">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>}
                </div>
                <select value={sort} onChange={e=>setSort(e.target.value)}
                  style={{padding:"10px 12px",borderRadius:11,border:"1.5px solid "+bdr,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:C.text,fontSize:14,fontWeight:600,outline:"none",cursor:"pointer",minHeight:42,fontFamily:"inherit"}}>
                  <option value="latest">{t("sortLatest")}</option>
                  <option value="views">{t("sortViews")}</option>
                  <option value="likes">{t("sortLikes")}</option>
                </select>
                {/* 뷰 모드 토글 */}
                <div style={{display:"flex",border:"1.5px solid "+bdr,borderRadius:11,overflow:"hidden"}}>
                  {[
                    ["list", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, t("viewList")],
                    ["gallery", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, t("viewGallery")],
                    ["compact", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>, t("viewCompact")],
                  ].map(([vm,icon,label])=>(
                    <button key={vm} onClick={()=>setViewMode(vm)} title={label}
                      style={{padding:"10px 12px",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minHeight:42,minWidth:42,
                        background:viewMode===vm?(isDark?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.12)"):(isDark?"rgba(255,255,255,0.04)":"#fff"),
                        color:viewMode===vm?"#7c6aff":C.muted}} aria-label={label}>
                      {icon}
                    </button>
                  ))}
                </div>
                {/* 글쓰기/자료등록 버튼 */}
                <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest();}else setMode("write");}}
                  style={{padding:"12px 22px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 4px 14px rgba(99,102,241,0.35)",minHeight:46,display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {subCat==="archive"?"자료 등록":t("writePost")}
                </button>
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
                    onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}} />
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
                <div style={{background:head,border:"1px solid "+bdr,borderRadius:"12px 12px 0 0",padding:"12px 16px",
                  display:"grid",gridTemplateColumns:"50px 1fr 100px 82px 56px 52px 42px",gap:6,
                  fontSize:12,fontWeight:800,color:C.muted,alignItems:"center",letterSpacing:0.2}}>
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
                  const num=activeFiltered.length-(page-1)*PER-idx;
                  const today=Date.now()-p.id<86400000;
                  const thumb = (p.images && p.images[0]) || extractThumb(p.body);
                  const hasDl = (p.images||[]).length > 0;
                  return isMobile ? (
                    <div key={p.id} onClick={()=>openPost(p)}
                      style={{padding:"12px 14px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=hover}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        {thumb && <img src={toThumb(thumb,96,72)} alt="" loading="eager" style={{width:48,height:36,objectFit:"cover",borderRadius:6,flexShrink:0,marginTop:2}} onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>}
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
                            {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid #3b82f6",background:"transparent",color:"#3b82f6",fontSize:12,cursor:"pointer",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4,minHeight:34,fontFamily:"inherit"}}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                              다운
                            </button>}
                          </div>
                        </div>
                        {/* 번호 제거 */}
                      </div>
                    </div>
                  ) : (
                    <div key={p.id} onClick={()=>openPost(p)}
                      style={{display:"grid",gridTemplateColumns:"50px 1fr 100px 82px 56px 52px 42px",gap:6,
                        padding:"14px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s",alignItems:"center",minHeight:56}}
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
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {thumb && <img src={toThumb(thumb,80,64)} alt="" loading="eager" style={{width:42,height:34,objectFit:"cover",borderRadius:7}} onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:8,minWidth:0}}>
                        {p.tag&&<span style={{fontSize:11,padding:"3px 9px",borderRadius:6,background:(subInfo?.color||"#7c6aff")+"22",color:subInfo?.color||"#7c6aff",fontWeight:800,flexShrink:0,whiteSpace:"nowrap"}}>{p.tag}</span>}
                        <span style={{fontSize:15,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                        {hasDl&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>}
                        {(p.comments||[]).length>0&&<span style={{fontSize:12,color:C.purpleL,fontWeight:800,flexShrink:0}}>[{p.comments.length}]</span>}
                        {today&&<span style={{fontSize:10,background:"rgba(239,68,68,0.15)",color:"#ef4444",padding:"2px 7px",borderRadius:6,fontWeight:800,flexShrink:0}}>NEW</span>}
                      </div>
                      <div style={{textAlign:"center",minWidth:0}}>
                        <span style={{fontSize:13,color:C.purpleL,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",padding:"0 4px"}}>{p.nick}</span>
                      </div>
                      <span style={{textAlign:"center",fontSize:12,color:C.muted,fontWeight:500}}>{p.date}</span>
                      <span style={{textAlign:"center",fontSize:13,color:C.muted,fontWeight:600}}>{p.views||0}</span>
                      <span style={{textAlign:"center",fontSize:13,fontWeight:(p.likes||0)>0?800:500,color:(p.likes||0)>0?"#f59e0b":C.muted}}>{p.likes||0}</span>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {hasDl&&<button onClick={e=>{e.stopPropagation();downloadFile(p.images[0]);}} title="첫 번째 첨부 다운로드"
                          style={{padding:"6px",borderRadius:7,border:"1.5px solid #3b82f6",background:"transparent",color:"#3b82f6",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",width:30,height:30}} aria-label="다운로드">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </button>}
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
                          ? <img src={toThumb(thumb,480,270)} alt="" loading="eager" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>
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
                            <span>{p.views||0}</span>
                            {(p.likes||0)>0&&<span style={{color:"#f59e0b",fontWeight:700}}>+{p.likes}</span>}
                            {(p.comments||[]).length>0&&<span style={{color:C.purpleL,fontWeight:700}}>{p.comments.length}댓글</span>}
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
                  const num=activeFiltered.length-(page-1)*PER-idx;
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
                        ? <img src={toThumb(thumb,68,52)} alt="" loading="eager" style={{width:34,height:26,objectFit:"cover",borderRadius:4,display:"block",flexShrink:0}} onError={e=>{e.target.style.opacity="0.3";e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cline x1='3' y1='3' x2='21' y2='21'/%3E%3C/svg%3E";}}/>
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
                        <span style={{fontSize:11,color:C.muted,flexShrink:0,width:38,textAlign:"center"}}>{p.views||0}</span>
                        {(p.likes||0)>0&&<span style={{fontSize:11,color:"#f59e0b",fontWeight:700,flexShrink:0}}>+{p.likes}</span>}
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
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>커뮤니티 참여하기</div>
              <div style={{fontSize:12,color:C.muted,marginBottom:10,lineHeight:1.5}}>로그인하면 글쓰기와 댓글 기능을 사용할 수 있어요</div>
              <button onClick={onLoginRequest} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>로그인 / 가입</button>
            </div>
          )}

          {/* 우측 사이드바 - 데스크톱만 */}
          {!isMobile && (
          <aside style={{width:240,flexShrink:0,display:"flex",flexDirection:"column",gap:14}}>
            {/* 카톡방 배너 */}
            <a href="https://open.kakao.com/o/gIw9vTFg" target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, background:"#FEE500", textDecoration:"none", transition:"opacity 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.9"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{ width:32, height:32, borderRadius:8, background:"#191919", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#FEE500" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24-.13.47-.85 3.04-.88 3.23 0 0-.02.15.08.21.1.06.21.01.21.01.28-.04 3.24-2.13 3.76-2.49.79.11 1.6.17 2.45.17 5.52 0 10-3.36 10-7.37S17.52 3 12 3z"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:"#191919" }}>카톡방 소통하기</div>
                <div style={{ fontSize:10, color:"rgba(25,25,25,0.55)" }}>마케팅 인사이트 공유</div>
              </div>
              <span style={{ fontSize:11, fontWeight:800, color:"#191919" }}>→</span>
            </a>

            {/* 전체 인기글 TOP10 */}
            {hotPostsAll.length>0&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(239,68,68,0.06)":"rgba(239,68,68,0.03)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>전체 인기글 TOP10</span>
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
            {hotPosts.length>0&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(251,191,36,0.06)":"rgba(251,191,36,0.04)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>{subInfo?.label||""} 인기글</span>
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
              {[["글 작성","+2P"],["AI 생성","-10P"],["가입 즉시","+100P"],["출석체크","+3P"]].map(([a,p])=>(
                <div key={a} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid "+bdr,fontSize:13}}>
                  <span style={{color:C.muted}}>{a}</span>
                  <span style={{fontWeight:700,color:p.startsWith("+")?"#4ade80":"#f87171"}}>{p}</span>
                </div>
              ))}
            </div>
            {!user&&(
              <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"18px 16px",textAlign:"center"}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="1.5" style={{marginBottom:8}}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
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
