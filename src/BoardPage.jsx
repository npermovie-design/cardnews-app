import { useState, useEffect, useMemo } from "react";
import { getPosts, setPosts, CATS, awardPostPoints } from "./storage";
import { Btn, Inp, Textarea } from "./UI";

function RichBody({ body, C }) {
  if (!body) return null;
  const lines = body.split("\n");
  return (
    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {lines.map((line, i) => {
        const ytMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (ytMatch) return (<div key={i} style={{ margin:"12px 0", borderRadius:12, overflow:"hidden", maxWidth:560 }}><iframe src={"https://www.youtube.com/embed/"+ytMatch[1]} style={{ width:"100%", height:315, border:"none" }} allowFullScreen title="youtube"/></div>);
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return (<div key={i} style={{ margin:"12px 0" }}><img src={line.trim()} alt="" style={{ maxWidth:"100%", borderRadius:10 }} onError={e=>e.target.style.display="none"}/></div>);
        if (/^https?:\/\//i.test(line.trim())) return (<div key={i} style={{ margin:"4px 0" }}><a href={line.trim()} target="_blank" rel="noopener noreferrer" style={{ color:C.purpleL, textDecoration:"underline", wordBreak:"break-all" }}>{line.trim()}</a></div>);
        return <span key={i}>{line}{i < lines.length-1 && "\n"}</span>;
      })}
    </div>
  );
}

function PostForm({ user, cat, initial, onSubmit, onCancel, C }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody]   = useState(initial?.body || "");
  const catLabel = CATS.find(c => c.id === cat)?.label || cat;
  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:900, color:C.text }}>{initial?"글 수정":"글쓰기"} — {catLabel}</h2>
        <button onClick={onCancel} style={{ background:"none", border:"1px solid "+C.border, color:C.muted, cursor:"pointer", fontSize:13, padding:"6px 14px", borderRadius:8 }}>취소</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>제목</div><Inp C={C} placeholder="제목을 입력해주세요" value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></div>
        <div><div style={{ fontSize:12, color:C.muted, marginBottom:6, fontWeight:600 }}>내용</div><Textarea C={C} placeholder="내용을 입력해주세요" value={body} onChange={e=>setBody(e.target.value)} rows={14} style={{ minHeight:280 }}/></div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"10px 24px", borderRadius:10, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:14, cursor:"pointer", fontWeight:600 }}>취소</button>
          <Btn C={C} onClick={()=>onSubmit({title,body})}>{initial?"수정 완료":"등록하기"}</Btn>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage({ user, C, onLoginRequest, initialCat }) {
  const [cat, setCat]       = useState(initialCat || "ai");
  const [posts, setPosts2]  = useState(getPosts);
  const [view, setView]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [writing, setWriting] = useState(false);
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage]     = useState(1);
  const PER_PAGE = 20;

  const isDark = !!(C.bg?.includes("0a") || C.bg?.includes("#10") || C.bg === "#242424");
  const bdr = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const rowHover = isDark ? "rgba(255,255,255,0.03)" : "#f9fafb";
  const headerBg = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
  const sideBg = isDark ? "rgba(255,255,255,0.02)" : "#fafafa";

  useEffect(() => { if (initialCat) { setCat(initialCat); setView(null); setPage(1); } }, [initialCat]);

  const sync = (next) => { setPosts(next); setPosts2(next); };
  const isOwner = p => user && (user.nick === p.nick || user.role === "admin");

  const filtered = useMemo(() => {
    let list = posts.filter(p => p.cat === cat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.nick||"").toLowerCase().includes(q));
    }
    if (sortBy === "views") list = [...list].sort((a,b) => (b.views||0)-(a.views||0));
    else if (sortBy === "likes") list = [...list].sort((a,b) => (b.likes||0)-(a.likes||0));
    else list = [...list].sort((a,b) => b.id-a.id);
    return list;
  }, [posts, cat, search, sortBy]);

  const popular = useMemo(() =>
    [...posts.filter(p => p.cat === cat)].sort((a,b) => (b.views||0)-(a.views||0)).slice(0,5),
  [posts, cat]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pagePosts = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const submitPost = async (form) => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!form.title.trim() || !form.body.trim()) { alert("제목과 내용을 입력해주세요."); return; }
    const newPost = { id:Date.now(), cat, nick:user.nick, userId:user.uid||user.id,
      title:form.title, body:form.body, date:new Date().toLocaleDateString("ko-KR"),
      comments:[], views:0, likes:0 };
    sync([newPost, ...posts]);
    setWriting(false);
    if (user?.uid) { try { await awardPostPoints(user, ()=>{}); } catch(e) {} }
    alert("글이 등록됐어요! 포인트 1P 적립 🎉");
  };

  const submitEdit = (form) => {
    const next = posts.map(p => p.id===editing.id ? {...p, title:form.title, body:form.body, edited:true} : p);
    sync(next); setView(next.find(p=>p.id===editing.id)); setEditing(null);
  };

  const deletePost = (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    sync(posts.filter(p=>p.id!==id)); setView(null);
  };

  const openPost = (p) => {
    const next = posts.map(pp => pp.id===p.id ? {...pp, views:(pp.views||0)+1} : pp);
    sync(next); setView(next.find(pp=>pp.id===p.id));
  };

  const likePost = (id) => {
    const next = posts.map(p => p.id===id ? {...p, likes:(p.likes||0)+1} : p);
    sync(next); setView(next.find(p=>p.id===id));
  };

  const addComment = (postId) => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!comment.trim()) return;
    const next = posts.map(p => p.id===postId ? {...p, comments:[...p.comments, {id:Date.now(), nick:user.nick, text:comment, date:new Date().toLocaleDateString("ko-KR")}]} : p);
    sync(next); setView(next.find(p=>p.id===postId)); setComment("");
  };

  const deleteComment = (postId, idx) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const next = posts.map(p => p.id===postId ? {...p, comments:p.comments.filter((_,i)=>i!==idx)} : p);
    sync(next); setView(next.find(p=>p.id===postId));
  };

  const Sidebar = () => (
    <aside style={{ width:180, flexShrink:0, borderRight:"1px solid "+bdr, background:sideBg, minHeight:"calc(100vh - 64px)" }}>
      <div style={{ padding:"16px 12px 8px", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:0.5 }}>카테고리</div>
      {CATS.map(cc => (
        <button key={cc.id} onClick={()=>{ setCat(cc.id); setView(null); setWriting(false); setEditing(null); setSearch(""); setPage(1); }}
          style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"10px 14px", border:"none", cursor:"pointer",
            fontSize:13, fontWeight:cat===cc.id?700:500,
            background:cat===cc.id?(isDark?"rgba(124,106,255,0.12)":"rgba(124,106,255,0.08)"):"transparent",
            color:cat===cc.id?C.purpleL:C.muted,
            borderLeft:cat===cc.id?"3px solid "+C.purpleL:"3px solid transparent",
            textAlign:"left", transition:"all 0.12s" }}
          onMouseEnter={e=>{ if(cat!==cc.id) e.currentTarget.style.background=rowHover; }}
          onMouseLeave={e=>{ if(cat!==cc.id) e.currentTarget.style.background="transparent"; }}>
          <span>{cc.icon}</span>{cc.label}
        </button>
      ))}
    </aside>
  );

  if (editing) return (<div style={{ display:"flex" }}><Sidebar/><div style={{ flex:1, padding:"32px 28px" }}><PostForm C={C} user={user} cat={cat} initial={editing} onSubmit={submitEdit} onCancel={()=>setEditing(null)}/></div></div>);
  if (writing) return (<div style={{ display:"flex" }}><Sidebar/><div style={{ flex:1, padding:"32px 28px" }}><PostForm C={C} user={user} cat={cat} onSubmit={submitPost} onCancel={()=>setWriting(false)}/></div></div>);

  if (view) return (
    <div style={{ display:"flex" }}>
      <Sidebar/>
      <div style={{ flex:1, padding:"28px 32px", minWidth:0, maxWidth:900 }}>
        <button onClick={()=>setView(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, marginBottom:20, padding:0, fontWeight:600 }}>← 목록으로</button>
        <div style={{ background:C.card, border:"1px solid "+bdr, borderRadius:12, padding:"28px 32px", marginBottom:16 }}>
          <h2 style={{ color:C.text, fontSize:21, fontWeight:900, margin:"0 0 14px", lineHeight:1.4 }}>{view.title}</h2>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:16, borderBottom:"1px solid "+bdr, marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:13, color:C.muted }}>
              <span style={{ fontWeight:700, color:C.purpleL }}>{view.nick}</span>
              <span>{view.date}</span>
              <span>👁 {view.views||0}</span>
              <span>💬 {(view.comments||[]).length}</span>
              <span>👍 {view.likes||0}</span>
              {view.edited && <span style={{ color:C.purpleL, fontSize:11 }}>(수정됨)</span>}
            </div>
            {isOwner(view) && (
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setEditing(view)} style={{ padding:"4px 12px", borderRadius:7, border:"1px solid "+bdr, background:"transparent", color:C.muted, fontSize:11, cursor:"pointer" }}>수정</button>
                <button onClick={()=>deletePost(view.id)} style={{ padding:"4px 12px", borderRadius:7, border:"1px solid rgba(229,62,62,0.2)", background:"rgba(229,62,62,0.05)", color:"#e53e3e", fontSize:11, cursor:"pointer" }}>삭제</button>
              </div>
            )}
          </div>
          <RichBody C={C} body={view.body}/>
          <div style={{ marginTop:28, textAlign:"center" }}>
            <button onClick={()=>likePost(view.id)} style={{ padding:"10px 32px", borderRadius:24, border:"2px solid "+C.purpleL, background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.05)", color:C.purpleL, fontSize:15, fontWeight:700, cursor:"pointer" }}>
              👍 추천 {view.likes||0}
            </button>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:14, color:C.text, fontWeight:700, marginBottom:12 }}>댓글 {(view.comments||[]).length}개</div>
          {(view.comments||[]).map((cm,i)=>(
            <div key={cm.id||i} style={{ background:C.card, border:"1px solid "+bdr, borderRadius:10, padding:"12px 16px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <span style={{ color:C.purpleL, fontWeight:700, fontSize:13, marginRight:10 }}>{cm.nick}</span>
                  <span style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{cm.text}</span>
                  <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{cm.date}</div>
                </div>
                {user && (user.nick===cm.nick||user.role==="admin") && (
                  <button onClick={()=>deleteComment(view.id,i)} style={{ padding:"3px 9px", borderRadius:6, border:"1px solid rgba(229,62,62,0.2)", background:"transparent", color:"#e53e3e", fontSize:10, cursor:"pointer", flexShrink:0, marginLeft:10 }}>삭제</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {user ? (
          <div style={{ display:"flex", gap:8 }}>
            <Inp C={C} placeholder="댓글을 입력해주세요..." value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}} style={{ flex:1 }}/>
            <button onClick={()=>addComment(view.id)} style={{ padding:"10px 18px", borderRadius:10, border:"none", background:C.purple, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}>등록</button>
          </div>
        ) : (
          <div onClick={onLoginRequest} style={{ fontSize:13, color:C.muted, textAlign:"center", padding:"14px", background:isDark?"rgba(124,106,255,0.06)":"#f5f4ff", borderRadius:10, border:"1px solid rgba(124,106,255,0.15)", cursor:"pointer" }}>
            💬 댓글은 로그인 후 이용 가능합니다 → <span style={{ color:C.purpleL, fontWeight:700 }}>로그인</span>
          </div>
        )}
      </div>
    </div>
  );

  const catInfo = CATS.find(c => c.id === cat);
  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 64px)" }}>
      <Sidebar/>
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 24px 0", borderBottom:"1px solid "+bdr }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <div>
              <h2 style={{ color:C.text, fontSize:20, fontWeight:900, margin:"0 0 3px" }}>{catInfo?.icon} {catInfo?.label}</h2>
              <div style={{ fontSize:12, color:C.muted }}>총 {filtered.length}개의 글</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:0, border:"1px solid "+bdr, borderRadius:9, overflow:"hidden", background:isDark?"rgba(255,255,255,0.04)":"#fff" }}>
                <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="검색..."
                  style={{ padding:"7px 12px", border:"none", background:"transparent", color:C.text, fontSize:13, outline:"none", width:160 }}/>
                {search && <button onClick={()=>{setSearch("");setPage(1);}} style={{ padding:"7px 10px", border:"none", background:"transparent", color:C.muted, cursor:"pointer", fontSize:13 }}>✕</button>}
              </div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{ padding:"7px 10px", borderRadius:9, border:"1px solid "+bdr, background:isDark?"rgba(255,255,255,0.04)":"#fff", color:C.text, fontSize:12, outline:"none", cursor:"pointer" }}>
                <option value="date">최신순</option>
                <option value="views">조회순</option>
                <option value="likes">추천순</option>
              </select>
              <button onClick={()=>{ if(!user){if(onLoginRequest)onLoginRequest();}else setWriting(true); }}
                style={{ padding:"8px 16px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                ✏️ 글쓰기{!user?" (로그인)":""}
              </button>
            </div>
          </div>
          {popular.length > 0 && !search && (
            <div style={{ background:isDark?"rgba(124,106,255,0.06)":"rgba(124,106,255,0.04)", border:"1px solid rgba(124,106,255,0.12)", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.purpleL, marginBottom:7 }}>🔥 인기글</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {popular.map((p,i)=>(
                  <div key={p.id} onClick={()=>openPost(p)} style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer", fontSize:13 }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <span style={{ color:i<3?"#f59e0b":C.muted, fontWeight:700, width:16, textAlign:"center", fontSize:11 }}>{i+1}</span>
                    <span style={{ color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</span>
                    <span style={{ color:C.muted, fontSize:11, flexShrink:0 }}>👁 {p.views||0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex:1 }}>
          <div style={{ display:"grid", gridTemplateColumns:"52px 1fr 90px 80px 60px 52px",
            background:headerBg, borderBottom:"2px solid "+bdr, padding:"8px 16px",
            fontSize:12, fontWeight:700, color:C.muted }}>
            <span style={{ textAlign:"center" }}>번호</span>
            <span style={{ paddingLeft:8 }}>제목</span>
            <span style={{ textAlign:"center" }}>글쓴이</span>
            <span style={{ textAlign:"center" }}>날짜</span>
            <span style={{ textAlign:"center" }}>조회</span>
            <span style={{ textAlign:"center" }}>추천</span>
          </div>
          {pagePosts.length === 0 && (
            <div style={{ textAlign:"center", padding:"80px 0", color:C.muted, fontSize:14 }}>
              {search ? `"${search}" 검색 결과가 없어요` : "아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️"}
            </div>
          )}
          {pagePosts.map((p,idx)=>{
            const num = filtered.length - (page-1)*PER_PAGE - idx;
            const isNew = (Date.now()-p.id) < 1000*60*60*3;
            const hasImage = p.body && /\.(jpg|jpeg|png|gif|webp)/i.test(p.body);
            return (
              <div key={p.id} onClick={()=>openPost(p)}
                style={{ display:"grid", gridTemplateColumns:"52px 1fr 90px 80px 60px 52px",
                  padding:"10px 16px", borderBottom:"1px solid "+bdr, cursor:"pointer", transition:"background 0.1s" }}
                onMouseEnter={e=>e.currentTarget.style.background=rowHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ textAlign:"center", fontSize:12, color:C.muted, alignSelf:"center" }}>{num}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:8, minWidth:0 }}>
                  {hasImage && <span style={{ fontSize:10, background:"rgba(16,185,129,0.1)", color:"#059669", padding:"1px 5px", borderRadius:4, flexShrink:0 }}>이미지</span>}
                  <span style={{ fontSize:14, color:C.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</span>
                  {(p.comments||[]).length > 0 && <span style={{ fontSize:12, color:C.purpleL, fontWeight:700, flexShrink:0 }}>[{p.comments.length}]</span>}
                  {isNew && <span style={{ fontSize:9, background:"rgba(239,68,68,0.1)", color:"#ef4444", padding:"1px 5px", borderRadius:4, fontWeight:700, flexShrink:0 }}>NEW</span>}
                </div>
                <span style={{ textAlign:"center", fontSize:12, color:C.purpleL, fontWeight:600, alignSelf:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nick}</span>
                <span style={{ textAlign:"center", fontSize:12, color:C.muted, alignSelf:"center" }}>{p.date}</span>
                <span style={{ textAlign:"center", fontSize:12, color:C.muted, alignSelf:"center" }}>{p.views||0}</span>
                <span style={{ textAlign:"center", fontSize:12, color:(p.likes||0)>0?"#f59e0b":C.muted, alignSelf:"center", fontWeight:(p.likes||0)>0?700:400 }}>{p.likes||0}</span>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:4, padding:"16px", borderTop:"1px solid "+bdr }}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid "+bdr, background:"transparent", color:C.muted, cursor:page===1?"not-allowed":"pointer", fontSize:12 }}>«</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid "+bdr, background:"transparent", color:C.muted, cursor:page===1?"not-allowed":"pointer", fontSize:12 }}>‹</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const start=Math.max(1,Math.min(page-2,totalPages-4));
              const n=start+i;
              return n<=totalPages?(<button key={n} onClick={()=>setPage(n)} style={{ padding:"5px 12px", borderRadius:7, border:"1px solid "+(n===page?C.purpleL:bdr), background:n===page?C.purpleL:"transparent", color:n===page?"#fff":C.muted, cursor:"pointer", fontSize:12, fontWeight:n===page?700:400 }}>{n}</button>):null;
            })}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid "+bdr, background:"transparent", color:C.muted, cursor:page===totalPages?"not-allowed":"pointer", fontSize:12 }}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid "+bdr, background:"transparent", color:C.muted, cursor:page===totalPages?"not-allowed":"pointer", fontSize:12 }}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}
