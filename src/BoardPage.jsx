import { useState, useMemo, useEffect } from "react";
import { getPosts, setPosts, CATS } from "./storage";

/* ────────────────────────────────────────────────────────────
   유틸
──────────────────────────────────────────────────────────── */
function timeAgo(id) {
  const diff = Date.now() - id;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return m + "분 전";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "시간 전";
  return Math.floor(h / 24) + "일 전";
}

/* ────────────────────────────────────────────────────────────
   글 본문 렌더러
──────────────────────────────────────────────────────────── */
function RichBody({ body, C }) {
  if (!body) return null;
  return (
    <div style={{ fontSize:15, color:C.text, lineHeight:1.9, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
      {body.split("\n").map((line, i) => {
        const yt = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (yt) return <div key={i} style={{margin:"14px 0",borderRadius:12,overflow:"hidden",maxWidth:580}}><iframe src={"https://www.youtube.com/embed/"+yt[1]} style={{width:"100%",height:320,border:"none"}} allowFullScreen title="yt"/></div>;
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return <div key={i} style={{margin:"12px 0"}}><img src={line.trim()} alt="" style={{maxWidth:"100%",borderRadius:10}} onError={e=>e.target.style.display="none"}/></div>;
        if (/^https?:\/\//i.test(line.trim())) return <div key={i} style={{margin:"4px 0"}}><a href={line.trim()} target="_blank" rel="noopener noreferrer" style={{color:C.purpleL,textDecoration:"underline",wordBreak:"break-all"}}>{line.trim()}</a></div>;
        return <span key={i}>{line}{"\n"}</span>;
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   글쓰기 폼
──────────────────────────────────────────────────────────── */
function WriteForm({ user, cat, initial, onDone, onCancel, C, isDark }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body,  setBody]  = useState(initial?.body  || "");
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#d1d5db";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "#fff";
  const catLabel = CATS.find(c=>c.id===cat)?.label || "";

  return (
    <div style={{maxWidth:780, margin:"0 auto", padding:"32px 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div style={{fontSize:20,fontWeight:900,color:C.text}}>{initial?"글 수정":"새 글 작성"} <span style={{fontSize:14,color:C.purpleL,fontWeight:600}}>— {catLabel}</span></div>
        <button onClick={onCancel} style={{padding:"7px 16px",borderRadius:9,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>취소</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <input placeholder="제목을 입력해주세요" value={title} maxLength={100}
          onChange={e=>setTitle(e.target.value)}
          style={{padding:"12px 16px",borderRadius:10,border:"1px solid "+bdr,background:inputBg,color:C.text,fontSize:15,outline:"none"}}/>
        <textarea placeholder={"내용을 입력해주세요\n\n유튜브/이미지 URL을 줄 단위로 넣으면 자동 표시됩니다"} value={body} rows={14}
          onChange={e=>setBody(e.target.value)}
          style={{padding:"14px 16px",borderRadius:10,border:"1px solid "+bdr,background:inputBg,color:C.text,fontSize:14,outline:"none",resize:"vertical",lineHeight:1.8,minHeight:260}}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onCancel} style={{padding:"11px 24px",borderRadius:10,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontWeight:600}}>취소</button>
          <button onClick={()=>{ if(title.trim()&&body.trim()) onDone({title:title.trim(),body:body.trim()}); else alert("제목과 내용을 모두 입력해주세요."); }}
            style={{padding:"11px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:800}}>
            {initial?"수정 완료":"등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   메인 BoardPage
──────────────────────────────────────────────────────────── */
export default function BoardPage({ user, C, onLoginRequest, initialCat }) {
  const [cat,     setCat]     = useState(initialCat || "ai");
  const [posts,   setPosts2]  = useState(getPosts);
  const [view,    setView]    = useState(null);   // 열린 글
  const [mode,    setMode]    = useState("list"); // list | write | edit
  const [comment, setComment] = useState("");
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("latest"); // latest | views | likes
  const [page,    setPage]    = useState(1);
  const PER = 20;

  const isDark = C.bg?.includes("0a") || C.bg?.includes("#10") || C.bg?.includes("242");
  const bdr    = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const hover  = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const head   = isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6";
  const sideBg = isDark ? "rgba(255,255,255,0.02)" : "#fafafa";

  // initialCat 변경 시 업데이트
  useEffect(() => {
    if (initialCat && initialCat !== cat) {
      setCat(initialCat); setView(null); setMode("list"); setPage(1); setSearch("");
    }
  }, [initialCat]);

  const sync = next => { setPosts(next); setPosts2(next); };
  const own  = p => user && (user.nick === p.nick || user.role === "admin");

  /* ── 필터/정렬 ── */
  const filtered = useMemo(() => {
    let list = posts.filter(p => p.cat === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.nick||"").toLowerCase().includes(q));
    }
    return sort === "views"  ? [...list].sort((a,b)=>(b.views||0)-(a.views||0))
         : sort === "likes"  ? [...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
         :                     [...list].sort((a,b)=>b.id-a.id);
  }, [posts, cat, search, sort]);

  const popular    = useMemo(() => [...posts.filter(p=>p.cat===cat)].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5), [posts,cat]);
  const totalPages = Math.ceil(filtered.length / PER);
  const pageItems  = filtered.slice((page-1)*PER, page*PER);

  /* ── CRUD ── */
  const submitPost = ({title, body}) => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    const p = { id:Date.now(), cat, nick:user.nick, title, body,
                date:new Date().toLocaleDateString("ko-KR"), comments:[], views:0, likes:0 };
    sync([p, ...posts]);
    setMode("list");
    alert("등록됐어요! 🎉");
  };

  const submitEdit = ({title, body}) => {
    const next = posts.map(p => p.id===view.id ? {...p,title,body,edited:true} : p);
    sync(next); setView(next.find(p=>p.id===view.id)); setMode("list");
  };

  const del = id => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    sync(posts.filter(p=>p.id!==id)); setView(null); setMode("list");
  };

  const open = p => {
    const next = posts.map(pp => pp.id===p.id ? {...pp, views:(pp.views||0)+1} : pp);
    sync(next); setView(next.find(pp=>pp.id===p.id));
  };

  const like = id => {
    const next = posts.map(p => p.id===id ? {...p, likes:(p.likes||0)+1} : p);
    sync(next); setView(next.find(p=>p.id===id));
  };

  const addComment = postId => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!comment.trim()) return;
    const next = posts.map(p => p.id===postId
      ? {...p, comments:[...p.comments,{id:Date.now(),nick:user.nick,text:comment,date:new Date().toLocaleDateString("ko-KR")}]}
      : p);
    sync(next); setView(next.find(p=>p.id===postId)); setComment("");
  };

  const delComment = (postId, idx) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const next = posts.map(p => p.id===postId ? {...p, comments:p.comments.filter((_,i)=>i!==idx)} : p);
    sync(next); setView(next.find(p=>p.id===postId));
  };

  /* ── 사이드바 ── */
  const Sidebar = () => (
    <aside style={{width:176, flexShrink:0, borderRight:"1px solid "+bdr, background:sideBg, minHeight:"calc(100vh - 64px)"}}>
      <div style={{padding:"18px 14px 8px", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:1}}>COMMUNITY</div>
      {CATS.map(cc => {
        const active = cat === cc.id;
        return (
          <button key={cc.id}
            onClick={()=>{setCat(cc.id);setView(null);setMode("list");setSearch("");setPage(1);}}
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 14px",
              border:"none",borderLeft:active?"3px solid "+C.purpleL:"3px solid transparent",
              cursor:"pointer",fontSize:13,fontWeight:active?700:500,textAlign:"left",
              background:active?(isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)"):"transparent",
              color:active?C.purpleL:C.muted,transition:"all 0.12s"}}
            onMouseEnter={e=>{if(!active)e.currentTarget.style.background=hover;}}
            onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
            <span style={{fontSize:15}}>{cc.icon}</span>{cc.label}
          </button>
        );
      })}
    </aside>
  );

  const catInfo = CATS.find(c=>c.id===cat);

  /* ── 글쓰기 / 수정 ── */
  if (mode === "write") return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"0 32px"}}><WriteForm user={user} cat={cat} onDone={submitPost} onCancel={()=>setMode("list")} C={C} isDark={isDark}/></div>
    </div>
  );

  if (mode === "edit" && view) return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"0 32px"}}><WriteForm user={user} cat={cat} initial={view} onDone={submitEdit} onCancel={()=>setMode("list")} C={C} isDark={isDark}/></div>
    </div>
  );

  /* ── 글 상세 ── */
  if (view) return (
    <div style={{display:"flex"}}>
      <Sidebar/>
      <div style={{flex:1,padding:"28px 32px",minWidth:0,maxWidth:860}}>
        {/* 뒤로 */}
        <button onClick={()=>setView(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0,fontWeight:600}}>← 목록으로</button>
        {/* 글 카드 */}
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,padding:"28px 32px",marginBottom:20}}>
          {/* 카테고리 뱃지 */}
          <div style={{marginBottom:10}}>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:isDark?"rgba(124,106,255,0.12)":"rgba(124,106,255,0.07)",color:C.purpleL,fontWeight:700}}>{catInfo?.icon} {catInfo?.label}</span>
          </div>
          <h1 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.4}}>{view.title}{view.edited&&<span style={{fontSize:11,color:C.muted,marginLeft:8,fontWeight:400}}>(수정됨)</span>}</h1>
          {/* 메타 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:18,borderBottom:"1px solid "+bdr,marginBottom:22}}>
            <div style={{display:"flex",alignItems:"center",gap:14,fontSize:13,color:C.muted}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{(view.nick||"?")[0].toUpperCase()}</div>
                <span style={{fontWeight:700,color:C.text}}>{view.nick}</span>
              </span>
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
          <RichBody C={C} body={view.body}/>
          {/* 추천 */}
          <div style={{marginTop:32,textAlign:"center"}}>
            <button onClick={()=>like(view.id)}
              style={{padding:"11px 36px",borderRadius:28,border:"2px solid "+C.purpleL,background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.05)",color:C.purpleL,fontSize:15,fontWeight:800,cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=C.purpleL;e.currentTarget.style.color="#fff";}}
              onMouseLeave={e=>{e.currentTarget.style.background=isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.05)";e.currentTarget.style.color=C.purpleL;}}>
              👍 추천 {view.likes||0}
            </button>
          </div>
        </div>
        {/* 댓글 */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>댓글 {(view.comments||[]).length}개</div>
          {(view.comments||[]).map((cm,i)=>(
            <div key={cm.id||i} style={{background:C.card,border:"1px solid "+bdr,borderRadius:12,padding:"14px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#7c6aff,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{(cm.nick||"?")[0].toUpperCase()}</div>
                    <span style={{fontWeight:700,fontSize:13,color:C.purpleL}}>{cm.nick}</span>
                    <span style={{fontSize:11,color:C.muted}}>{cm.date}</span>
                  </div>
                  <div style={{fontSize:14,color:C.text,lineHeight:1.7,paddingLeft:30}}>{cm.text}</div>
                </div>
                {user&&(user.nick===cm.nick||user.role==="admin")&&(
                  <button onClick={()=>delComment(view.id,i)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,0.25)",background:"transparent",color:"#ef4444",fontSize:11,cursor:"pointer",flexShrink:0,marginLeft:12}}>삭제</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {user ? (
          <div style={{display:"flex",gap:10}}>
            <input placeholder="댓글을 입력하세요..." value={comment} onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}}
              style={{flex:1,padding:"11px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none"}}/>
            <button onClick={()=>addComment(view.id)}
              style={{padding:"11px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>등록</button>
          </div>
        ) : (
          <div onClick={onLoginRequest} style={{padding:"16px",textAlign:"center",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:isDark?"rgba(124,106,255,0.05)":"rgba(124,106,255,0.03)",color:C.muted,fontSize:14,cursor:"pointer"}}>
            💬 댓글은 로그인 후 이용 가능합니다 → <span style={{color:C.purpleL,fontWeight:700}}>로그인</span>
          </div>
        )}
      </div>
    </div>
  );

  /* ── 목록 ── */
  return (
    <div style={{display:"flex",minHeight:"calc(100vh - 64px)"}}>
      <Sidebar/>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>

        {/* 헤더 */}
        <div style={{padding:"22px 24px 0",borderBottom:"1px solid "+bdr}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:900,color:C.text,margin:"0 0 4px"}}>{catInfo?.icon} {catInfo?.label}</h2>
              <span style={{fontSize:12,color:C.muted}}>총 {filtered.length}개</span>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {/* 검색 */}
              <div style={{display:"flex",border:"1px solid "+bdr,borderRadius:9,overflow:"hidden",background:isDark?"rgba(255,255,255,0.04)":"#fff"}}>
                <input value={search} placeholder="검색..." onChange={e=>{setSearch(e.target.value);setPage(1);}}
                  style={{padding:"7px 13px",border:"none",background:"transparent",color:C.text,fontSize:13,outline:"none",width:155}}/>
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
                style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                ✏️ 글쓰기
              </button>
            </div>
          </div>

          {/* 인기글 */}
          {popular.length>0&&!search&&(
            <div style={{background:isDark?"rgba(124,106,255,0.05)":"rgba(124,106,255,0.03)",border:"1px solid rgba(124,106,255,0.1)",borderRadius:10,padding:"10px 16px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.purpleL,marginBottom:8}}>🔥 인기글</div>
              {popular.map((p,i)=>(
                <div key={p.id} onClick={()=>open(p)} style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer",padding:"3px 0",fontSize:13}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <span style={{color:i<3?"#f59e0b":C.muted,fontWeight:700,fontSize:12,width:18,textAlign:"center",flexShrink:0}}>{i+1}</span>
                  <span style={{color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                  <span style={{color:C.muted,fontSize:11,flexShrink:0}}>👁{p.views||0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 테이블 헤더 */}
        <div style={{display:"grid",gridTemplateColumns:"50px 1fr 88px 76px 52px 48px",
          background:head,borderBottom:"2px solid "+bdr,padding:"9px 16px",
          fontSize:11,fontWeight:700,color:C.muted,letterSpacing:0.3}}>
          <span style={{textAlign:"center"}}>번호</span>
          <span style={{paddingLeft:8}}>제목</span>
          <span style={{textAlign:"center"}}>글쓴이</span>
          <span style={{textAlign:"center"}}>날짜</span>
          <span style={{textAlign:"center"}}>조회</span>
          <span style={{textAlign:"center"}}>추천</span>
        </div>

        {/* 글 없음 */}
        {pageItems.length===0&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",color:C.muted}}>
            <div style={{fontSize:40,marginBottom:12}}>{catInfo?.icon||"📋"}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>{search?`"${search}" 검색 결과가 없어요`:"아직 게시글이 없어요"}</div>
            <div style={{fontSize:13,marginBottom:20}}>첫 번째 글을 남겨보세요!</div>
            {user&&<button onClick={()=>setMode("write")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#ec4899)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✏️ 글쓰기</button>}
          </div>
        )}

        {/* 글 목록 */}
        <div style={{flex:1}}>
          {pageItems.map((p,idx)=>{
            const num = filtered.length-(page-1)*PER-idx;
            const isNew = Date.now()-p.id < 1000*60*60*3;
            return (
              <div key={p.id} onClick={()=>open(p)}
                style={{display:"grid",gridTemplateColumns:"50px 1fr 88px 76px 52px 48px",
                  padding:"11px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=hover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{textAlign:"center",fontSize:12,color:C.muted,alignSelf:"center"}}>{num}</span>
                <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:8,minWidth:0}}>
                  <span style={{fontSize:14,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</span>
                  {(p.comments||[]).length>0&&<span style={{fontSize:12,color:C.purpleL,fontWeight:700,flexShrink:0}}>[{p.comments.length}]</span>}
                  {isNew&&<span style={{fontSize:9,background:"rgba(239,68,68,0.12)",color:"#ef4444",padding:"1px 5px",borderRadius:4,fontWeight:700,flexShrink:0}}>N</span>}
                </div>
                <div style={{textAlign:"center",alignSelf:"center",minWidth:0}}>
                  <div style={{fontSize:12,color:C.purpleL,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 4px"}}>{p.nick}</div>
                </div>
                <span style={{textAlign:"center",fontSize:11,color:C.muted,alignSelf:"center"}}>{p.date}</span>
                <span style={{textAlign:"center",fontSize:12,color:C.muted,alignSelf:"center"}}>{p.views||0}</span>
                <span style={{textAlign:"center",fontSize:12,color:(p.likes||0)>0?"#f59e0b":C.muted,alignSelf:"center",fontWeight:(p.likes||0)>0?700:400}}>{p.likes||0}</span>
              </div>
            );
          })}
        </div>

        {/* 페이지네이션 */}
        {totalPages>1&&(
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:4,padding:"16px",borderTop:"1px solid "+bdr}}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>‹</button>
            {Array.from({length:Math.min(7,totalPages)},(_,i)=>{
              const s=Math.max(1,Math.min(page-3,totalPages-6));
              const n=s+i;
              return n<=totalPages?<button key={n} onClick={()=>setPage(n)} style={{padding:"5px 12px",borderRadius:7,border:"1px solid "+(n===page?C.purpleL:bdr),background:n===page?C.purpleL:"transparent",color:n===page?"#fff":C.muted,cursor:"pointer",fontSize:12,fontWeight:n===page?700:400}}>{n}</button>:null;
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}
