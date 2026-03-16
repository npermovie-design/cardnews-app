import { useState, useMemo, useEffect } from "react";
import { getPosts, setPosts } from "./storage";

/* ─── 카테고리 정의 ─────────────────────────────────────────── */
const MAIN_CATS = [
  { id: "community", label: "커뮤니티", icon: "💬" },
];
const SUB_CATS = {
  community: [
    { id: "info",    label: "정보공유",   icon: "📌", color: "#6366f1" },
    { id: "qna",     label: "질문답변",   icon: "❓", color: "#f59e0b" },
    { id: "free",    label: "자유게시판", icon: "🗣", color: "#10b981" },
    { id: "review",  label: "사용후기",   icon: "⭐", color: "#ec4899" },
  ],
};

/* ─── 유틸 ─────────────────────────────────────────────────── */
function timeAgo(id) {
  const d = Date.now() - id;
  const m = Math.floor(d/60000);
  if (m < 1) return "방금";
  if (m < 60) return m + "분 전";
  const h = Math.floor(m/60);
  if (h < 24) return h + "시간 전";
  return Math.floor(h/24) + "일 전";
}
function isToday(id) { return Date.now() - id < 86400000; }

/* ─── RichBody ─────────────────────────────────────────────── */
function RichBody({ body, C }) {
  if (!body) return null;
  return (
    <div style={{fontSize:15,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
      {body.split("\n").map((line,i) => {
        const yt = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (yt) return <div key={i} style={{margin:"14px 0",borderRadius:12,overflow:"hidden",maxWidth:580}}><iframe src={"https://www.youtube.com/embed/"+yt[1]} style={{width:"100%",height:320,border:"none"}} allowFullScreen title="yt"/></div>;
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return <div key={i} style={{margin:"12px 0"}}><img src={line.trim()} alt="" style={{maxWidth:"100%",borderRadius:10}} onError={e=>e.target.style.display="none"}/></div>;
        if (/^https?:\/\//i.test(line.trim())) return <div key={i} style={{margin:"4px 0"}}><a href={line.trim()} target="_blank" rel="noopener noreferrer" style={{color:C.purpleL,textDecoration:"underline"}}>{line.trim()}</a></div>;
        return <span key={i}>{line}{"\n"}</span>;
      })}
    </div>
  );
}

/* ─── 글쓰기 폼 ─────────────────────────────────────────────── */
function WriteForm({ user, subCat, initial, onDone, onCancel, C, isDark }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body,  setBody]  = useState(initial?.body  || "");
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#d1d5db";
  const sub = SUB_CATS.community.find(s=>s.id===subCat);
  return (
    <div style={{maxWidth:860,margin:"0 auto",padding:"32px 0 60px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onCancel} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:18,padding:0}}>←</button>
        <h2 style={{fontSize:20,fontWeight:900,color:C.text,margin:0}}>{initial?"글 수정":"새 글 작성"}</h2>
        {sub && <span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:sub.color+"20",color:sub.color,fontWeight:700}}>{sub.icon} {sub.label}</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <input placeholder="제목을 입력해주세요" value={title} maxLength={100} onChange={e=>setTitle(e.target.value)}
          style={{padding:"13px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:15,outline:"none"}}/>
        <textarea placeholder={"내용을 입력해주세요\n\n• 유튜브/이미지 URL을 줄마다 입력하면 자동 표시됩니다"} value={body} rows={16}
          onChange={e=>setBody(e.target.value)}
          style={{padding:"14px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none",resize:"vertical",lineHeight:1.8,minHeight:280}}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onCancel} style={{padding:"11px 24px",borderRadius:10,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontWeight:600}}>취소</button>
          <button onClick={()=>{if(title.trim()&&body.trim())onDone({title:title.trim(),body:body.trim()});else alert("제목과 내용을 입력해주세요.");}}
            style={{padding:"11px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:800}}>
            {initial?"수정 완료":"등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── BoardPage 메인 ─────────────────────────────────────────── */
export default function BoardPage({ user, C, onLoginRequest, initialCat }) {
  const [mainCat, setMainCat] = useState("community");
  const [subCat,  setSubCat]  = useState(initialCat || "info");
  const [posts,   setPostsS]  = useState(getPosts);
  const [view,    setView]    = useState(null);
  const [mode,    setMode]    = useState("list"); // list | write | edit
  const [comment, setComment] = useState("");
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("latest");
  const [page,    setPage]    = useState(1);
  const PER = 20;

  const isDark = !!(C.bg?.includes("0a")||C.bg?.includes("#10")||C.bg?.includes("242"));
  const bdr  = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const head = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
  const hover= isDark ? "rgba(255,255,255,0.03)" : "#f9fafb";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";

  useEffect(() => {
    if (initialCat) setSubCat(initialCat);
  }, [initialCat]);

  const sync = next => { setPosts(next); setPostsS(next); };
  const own  = p => user && (user.nick===p.nick || user.role==="admin");

  const subList = SUB_CATS[mainCat] || [];
  const subInfo = subList.find(s=>s.id===subCat) || subList[0];

  /* 필터/정렬 */
  const filtered = useMemo(() => {
    let list = posts.filter(p => p.cat===subCat || p.subCat===subCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p=>p.title.toLowerCase().includes(q)||(p.nick||"").toLowerCase().includes(q));
    }
    return sort==="views" ? [...list].sort((a,b)=>(b.views||0)-(a.views||0))
         : sort==="likes" ? [...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
         :                  [...list].sort((a,b)=>b.id-a.id);
  }, [posts, subCat, search, sort]);

  /* 핫 게시글 (조회 상위 3) */
  const hotPosts = useMemo(() =>
    [...posts.filter(p=>p.cat===subCat||p.subCat===subCat)].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,3),
  [posts, subCat]);

  const totalPages = Math.ceil(filtered.length/PER);
  const pageItems  = filtered.slice((page-1)*PER, page*PER);

  /* CRUD */
  const submitPost = ({title,body}) => {
    if (!user) { if(onLoginRequest)onLoginRequest(); return; }
    const p = {id:Date.now(), cat:subCat, subCat, nick:user.nick, title, body,
               date:new Date().toLocaleDateString("ko-KR"), comments:[], views:0, likes:0};
    sync([p,...posts]); setMode("list");
  };
  const submitEdit = ({title,body}) => {
    const next=posts.map(p=>p.id===view.id?{...p,title,body,edited:true}:p);
    sync(next); setView(next.find(p=>p.id===view.id)); setMode("list");
  };
  const del = id => {
    if(!window.confirm("삭제하시겠습니까?"))return;
    sync(posts.filter(p=>p.id!==id)); setView(null); setMode("list");
  };
  const openPost = p => {
    const next=posts.map(pp=>pp.id===p.id?{...pp,views:(pp.views||0)+1}:pp);
    sync(next); setView(next.find(pp=>pp.id===p.id));
  };
  const like = id => {
    const next=posts.map(p=>p.id===id?{...p,likes:(p.likes||0)+1}:p);
    sync(next); setView(next.find(p=>p.id===id));
  };
  const addComment = postId => {
    if(!user){if(onLoginRequest)onLoginRequest();return;}
    if(!comment.trim())return;
    const next=posts.map(p=>p.id===postId?{...p,comments:[...p.comments,{id:Date.now(),nick:user.nick,text:comment,date:new Date().toLocaleDateString("ko-KR")}]}:p);
    sync(next); setView(next.find(p=>p.id===postId)); setComment("");
  };
  const delComment = (postId,idx) => {
    if(!window.confirm("댓글을 삭제할까요?"))return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.filter((_,i)=>i!==idx)}:p);
    sync(next); setView(next.find(p=>p.id===postId));
  };

  /* 글쓰기/수정 폼 */
  if (mode==="write"||mode==="edit") return (
    <div style={{padding:"0 24px"}}>
      <WriteForm user={user} subCat={subCat} initial={mode==="edit"?view:null}
        onDone={mode==="edit"?submitEdit:submitPost} onCancel={()=>setMode("list")} C={C} isDark={isDark}/>
    </div>
  );

  /* 상세 보기 */
  if (view) return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px 60px"}}>
        {/* 뒤로 */}
        <button onClick={()=>setView(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,marginBottom:18,padding:0,fontWeight:600}}>
          ← 목록으로
        </button>
        {/* 게시글 카드 */}
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden",marginBottom:16}}>
          {/* 헤더 */}
          <div style={{padding:"24px 28px 20px",borderBottom:"1px solid "+bdr}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              {subInfo && <span style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:subInfo.color+"20",color:subInfo.color,fontWeight:700}}>{subInfo.icon} {subInfo.label}</span>}
            </div>
            <h1 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.4}}>
              {view.title}
              {view.edited && <span style={{fontSize:11,color:C.muted,marginLeft:8,fontWeight:400}}>(수정됨)</span>}
            </h1>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:14,fontSize:13,color:C.muted}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{(view.nick||"?")[0].toUpperCase()}</div>
                  <span style={{fontWeight:700,color:C.text}}>{view.nick}</span>
                </div>
                <span>{view.date}</span>
                <span>👁 {view.views||0}</span>
                <span>💬 {(view.comments||[]).length}</span>
              </div>
              {own(view) && (
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setMode("edit")} style={{padding:"5px 14px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>수정</button>
                  <button onClick={()=>del(view.id)} style={{padding:"5px 14px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.05)",color:"#ef4444",fontSize:12,cursor:"pointer"}}>삭제</button>
                </div>
              )}
            </div>
          </div>
          {/* 본문 */}
          <div style={{padding:"28px 28px 24px"}}>
            <RichBody C={C} body={view.body}/>
          </div>
          {/* 추천 */}
          <div style={{padding:"16px 28px 24px",textAlign:"center",borderTop:"1px solid "+bdr}}>
            <button onClick={()=>like(view.id)}
              style={{padding:"11px 36px",borderRadius:28,border:"2px solid "+C.purpleL,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",color:C.purpleL,fontSize:15,fontWeight:800,cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.purpleL;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background=isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)";e.currentTarget.style.color=C.purpleL;}}>
              👍 추천 {view.likes||0}
            </button>
          </div>
        </div>

        {/* 댓글 */}
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:"1px solid "+bdr}}>
            <span style={{fontSize:15,fontWeight:700,color:C.text}}>댓글 {(view.comments||[]).length}개</span>
          </div>
          <div style={{padding:"12px 24px"}}>
            {(view.comments||[]).map((cm,i)=>(
              <div key={cm.id||i} style={{padding:"14px 0",borderBottom:"1px solid "+bdr}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{(cm.nick||"?")[0].toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.purpleL}}>{cm.nick}</span>
                      <span style={{fontSize:11,color:C.muted}}>{cm.date}</span>
                    </div>
                    <div style={{fontSize:14,color:C.text,lineHeight:1.7}}>{cm.text}</div>
                  </div>
                  {user&&(user.nick===cm.nick||user.role==="admin")&&(
                    <button onClick={()=>delComment(view.id,i)} style={{padding:"4px 10px",borderRadius:7,border:"none",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontSize:11,cursor:"pointer",flexShrink:0}}>삭제</button>
                  )}
                </div>
              </div>
            ))}
            {(view.comments||[]).length===0&&<div style={{padding:"24px 0",textAlign:"center",color:C.muted,fontSize:14}}>첫 댓글을 남겨보세요 💬</div>}
          </div>
          {/* 댓글 입력 */}
          <div style={{padding:"16px 24px",borderTop:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
            {user ? (
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.nick||"?")[0].toUpperCase()}</div>
                <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="댓글을 입력하세요..."
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}}
                  style={{flex:1,padding:"11px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none"}}/>
                <button onClick={()=>addComment(view.id)} style={{padding:"11px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>등록</button>
              </div>
            ) : (
              <div onClick={onLoginRequest} style={{padding:"14px",textAlign:"center",borderRadius:10,border:"1px solid rgba(99,102,241,0.2)",background:"rgba(99,102,241,0.04)",color:C.muted,fontSize:14,cursor:"pointer"}}>
                댓글을 남기려면 <span style={{color:C.purpleL,fontWeight:700}}>로그인</span>이 필요합니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* 목록 */
  return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      {/* 상단 배너 - 메인 카테고리 */}
      <div style={{background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",borderBottom:"1px solid "+bdr}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto"}}>
            {MAIN_CATS.map(mc=>(
              <button key={mc.id} onClick={()=>{setMainCat(mc.id);setSubCat(SUB_CATS[mc.id][0].id);setSearch("");setPage(1);setView(null);}}
                style={{padding:"14px 20px",border:"none",background:"transparent",cursor:"pointer",fontSize:14,fontWeight:mainCat===mc.id?800:500,
                  color:mainCat===mc.id?C.purpleL:C.muted,
                  borderBottom:mainCat===mc.id?"3px solid "+C.purpleL:"3px solid transparent",
                  whiteSpace:"nowrap",transition:"all 0.12s"}}>
                {mc.icon} {mc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
        {/* 서브 카테고리 탭 */}
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"14px 0",borderBottom:"1px solid "+bdr,overflowX:"auto"}}>
          {subList.map(s=>(
            <button key={s.id} onClick={()=>{setSubCat(s.id);setSearch("");setPage(1);setView(null);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:24,border:"none",cursor:"pointer",
                fontSize:13,fontWeight:subCat===s.id?700:500,whiteSpace:"nowrap",
                background:subCat===s.id?s.color+"18":"transparent",
                color:subCat===s.id?s.color:C.muted,
                outline:subCat===s.id?"2px solid "+s.color+"40":"none",
                transition:"all 0.12s"}}>
              {s.icon} {s.label}
              <span style={{fontSize:10,opacity:0.7}}>{posts.filter(p=>p.cat===s.id||p.subCat===s.id).length}</span>
            </button>
          ))}
        </div>

        <div style={{display:"flex",gap:20,padding:"20px 0 60px",alignItems:"flex-start"}}>
          {/* 메인 컨텐츠 */}
          <div style={{flex:1,minWidth:0}}>
            {/* 헤더 액션바 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {subInfo&&<span style={{fontSize:15,fontWeight:800,color:C.text}}>{subInfo.icon} {subInfo.label}</span>}
                <span style={{fontSize:12,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f8",padding:"2px 8px",borderRadius:10}}>총 {filtered.length}개</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {/* 검색 */}
                <div style={{display:"flex",border:"1px solid "+bdr,borderRadius:9,overflow:"hidden",background:isDark?"rgba(255,255,255,0.04)":"#fff"}}>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="검색..."
                    style={{padding:"7px 12px",border:"none",background:"transparent",color:C.text,fontSize:13,outline:"none",width:150}}/>
                  {search&&<button onClick={()=>{setSearch("");setPage(1);}} style={{padding:"7px 10px",border:"none",background:"transparent",color:C.muted,cursor:"pointer"}}>✕</button>}
                </div>
                {/* 정렬 */}
                <select value={sort} onChange={e=>setSort(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:9,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:C.text,fontSize:12,outline:"none",cursor:"pointer"}}>
                  <option value="latest">최신순</option>
                  <option value="views">조회순</option>
                  <option value="likes">추천순</option>
                </select>
                {/* 글쓰기 */}
                <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest();}else setMode("write");}}
                  style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}}>
                  ✏️ 글쓰기
                </button>
              </div>
            </div>

            {/* 테이블 헤더 */}
            <div style={{background:head,border:"1px solid "+bdr,borderRadius:"10px 10px 0 0",padding:"9px 16px",
              display:"grid",gridTemplateColumns:"52px 1fr 90px 76px 54px 50px",
              fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.3}}>
              <span style={{textAlign:"center"}}>번호</span>
              <span style={{paddingLeft:8}}>제목</span>
              <span style={{textAlign:"center"}}>작성자</span>
              <span style={{textAlign:"center"}}>날짜</span>
              <span style={{textAlign:"center"}}>조회</span>
              <span style={{textAlign:"center"}}>추천</span>
            </div>

            {/* 글 없음 */}
            {pageItems.length===0&&(
              <div style={{background:cardBg,border:"1px solid "+bdr,borderTop:"none",borderRadius:"0 0 10px 10px",padding:"70px 0",textAlign:"center",color:C.muted}}>
                <div style={{fontSize:36,marginBottom:12}}>{subInfo?.icon||"📋"}</div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>
                  {search?`"${search}" 검색 결과가 없어요`:"아직 게시글이 없어요"}
                </div>
                <div style={{fontSize:13,marginBottom:20}}>첫 번째 글을 작성해보세요!</div>
                {user&&<button onClick={()=>setMode("write")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✏️ 글쓰기</button>}
              </div>
            )}

            {/* 글 목록 */}
            <div style={{border:"1px solid "+bdr,borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
              {pageItems.map((p,idx)=>{
                const num = filtered.length-(page-1)*PER-idx;
                const today = isToday(p.id);
                const hasImg = p.body&&/\.(jpg|jpeg|png|gif|webp)/i.test(p.body);
                return (
                  <div key={p.id} onClick={()=>openPost(p)}
                    style={{display:"grid",gridTemplateColumns:"52px 1fr 90px 76px 54px 50px",
                      padding:"11px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",
                      background:"transparent",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{textAlign:"center",fontSize:12,color:C.muted,alignSelf:"center"}}>{num}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:8,minWidth:0}}>
                      {hasImg&&<span style={{fontSize:10,background:"rgba(16,185,129,0.1)",color:"#059669",padding:"1px 5px",borderRadius:4,flexShrink:0}}>📷</span>}
                      <span style={{fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                      {(p.comments||[]).length>0&&<span style={{fontSize:12,color:C.purpleL,fontWeight:700,flexShrink:0}}>[{p.comments.length}]</span>}
                      {today&&<span style={{fontSize:9,background:"rgba(239,68,68,0.12)",color:"#ef4444",padding:"1px 5px",borderRadius:4,fontWeight:700,flexShrink:0}}>N</span>}
                    </div>
                    <div style={{textAlign:"center",alignSelf:"center",minWidth:0}}>
                      <span style={{fontSize:12,color:C.purpleL,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",padding:"0 4px"}}>{p.nick}</span>
                    </div>
                    <span style={{textAlign:"center",fontSize:11,color:C.muted,alignSelf:"center"}}>{p.date}</span>
                    <span style={{textAlign:"center",fontSize:12,color:C.muted,alignSelf:"center"}}>{p.views||0}</span>
                    <span style={{textAlign:"center",fontSize:12,alignSelf:"center",fontWeight:(p.likes||0)>0?700:400,color:(p.likes||0)>0?"#f59e0b":C.muted}}>{p.likes||0}</span>
                  </div>
                );
              })}
            </div>

            {/* 페이지네이션 */}
            {totalPages>1&&(
              <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:20}}>
                <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>«</button>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>‹</button>
                {Array.from({length:Math.min(7,totalPages)},(_,i)=>{
                  const s=Math.max(1,Math.min(page-3,totalPages-6));
                  const n=s+i;
                  return n<=totalPages?<button key={n} onClick={()=>setPage(n)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(n===page?C.purpleL:bdr),background:n===page?C.purpleL:"transparent",color:n===page?"#fff":C.muted,cursor:"pointer",fontSize:12,fontWeight:n===page?700:400}}>{n}</button>:null;
                })}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>›</button>
                <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>»</button>
              </div>
            )}
          </div>

          {/* 우측 사이드바 */}
          <aside style={{width:240,flexShrink:0,display:"flex",flexDirection:"column",gap:14}}>
            {/* 인기글 */}
            {hotPosts.length>0&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"14px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(251,191,36,0.06)":"rgba(251,191,36,0.04)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>🔥 인기글 TOP3</span>
                </div>
                {hotPosts.map((p,i)=>(
                  <div key={p.id} onClick={()=>openPost(p)} style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:16,fontWeight:900,color:i===0?"#ef4444":i===1?"#f59e0b":"#6b7280",flexShrink:0,lineHeight:1.2}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4,marginBottom:3}}>{p.title}</div>
                        <div style={{fontSize:11,color:C.muted}}>👁 {p.views||0} · 👍 {p.likes||0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 카테고리 현황 */}
            <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid "+bdr}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>📂 게시판 현황</span>
              </div>
              {subList.map(s=>{
                const cnt = posts.filter(p=>p.cat===s.id||p.subCat===s.id).length;
                return (
                  <button key={s.id} onClick={()=>{setSubCat(s.id);setSearch("");setPage(1);setView(null);}}
                    style={{width:"100%",padding:"10px 16px",border:"none",borderBottom:"1px solid "+bdr,background:subCat===s.id?(isDark?"rgba(99,102,241,0.1)":"rgba(99,102,241,0.05)"):"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background 0.1s"}}>
                    <span style={{fontSize:13,color:subCat===s.id?s.color:C.text,fontWeight:subCat===s.id?700:400}}>{s.icon} {s.label}</span>
                    <span style={{fontSize:11,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f8",padding:"2px 8px",borderRadius:8}}>{cnt}</span>
                  </button>
                );
              })}
            </div>

            {/* 글쓰기 유도 */}
            {!user&&(
              <div style={{background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"18px 16px",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:8}}>✍️</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>커뮤니티 참여하기</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>로그인하면 글쓰기와 댓글 기능을 사용할 수 있어요</div>
                <button onClick={onLoginRequest} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>로그인 / 가입</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
