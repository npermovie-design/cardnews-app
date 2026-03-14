import { useState, useRef } from "react";
import { getPosts, setPosts, CATS } from "./storage";
import { Inp } from "./UI";

/* ══════════════════════════════════════════════════
   반응형 CSS
══════════════════════════════════════════════════ */
const BOARD_CSS = `
  .board-wrap { display:flex; flex-direction:column; min-height:calc(100vh - 64px); }
  .board-row   { display:flex; flex:1; flex-direction:column; }
  .board-side  { display:none; }
  .board-mob-tabs { display:block; }
  .board-main  { flex:1; min-width:0; }

  .pt-head     { display:none; }
  .pt-row      { flex-direction:column; padding:11px 14px; gap:3px; }
  .pt-num      { display:none; }
  .pt-extra    { display:none; }
  .pt-meta     { display:flex; gap:8px; font-size:11px; }
  .pt-date-s   { display:inline; }
  .pt-date-f   { display:none; }

  .dpad        { padding:14px; }
  .fpad        { padding:14px; }
  .pf-act      { flex-direction:column; }
  .pf-act > *  { width:100%; }
  .hdr-row     { flex-direction:column; align-items:flex-start!important; gap:10px; padding:12px 14px; }
  .wb          { width:100%; }
  .wb button   { width:100%; justify-content:center; }
  .tb-row      { flex-direction:column; gap:6px; }
  .cmt-inp-row { flex-direction:column; gap:0; }

  @media(min-width:640px){
    .board-row  { flex-direction:row; }
    .board-side { display:flex; }
    .board-mob-tabs { display:none; }
    .pt-head    { display:flex; }
    .pt-row     { flex-direction:row; align-items:center; padding:0; gap:0; }
    .pt-num     { display:block; }
    .pt-extra   { display:block; }
    .pt-meta    { display:none; }
    .pt-date-s  { display:none; }
    .pt-date-f  { display:inline; }
    .dpad       { padding:28px 32px; }
    .fpad       { padding:22px 28px; }
    .pf-act     { flex-direction:row; justify-content:flex-end; }
    .pf-act > * { width:auto; }
    .hdr-row    { flex-direction:row; align-items:center!important; gap:0; padding:16px 20px; }
    .wb         { width:auto; }
    .wb button  { width:auto; }
    .tb-row     { flex-direction:row; gap:8px; }
    .cmt-inp-row{ flex-direction:row; }
  }
`;

/* ══════════════════════════════════════════════════
   RichBody — 본문 렌더링
══════════════════════════════════════════════════ */
function RichBody({ body, C }) {
  if (!body) return null;
  return (
    <div style={{ fontSize:15, color:C.text, lineHeight:1.9, wordBreak:"break-word" }}>
      {body.split('\n').map((line, i) => {
        const yt = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (yt) return (
          <div key={i} style={{ margin:"14px 0", borderRadius:8, overflow:"hidden" }}>
            <iframe src={"https://www.youtube.com/embed/"+yt[1]}
              style={{ width:"100%", height:240, border:"none" }} allowFullScreen title="yt"/>
          </div>
        );
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return (
          <div key={i} style={{ margin:"10px 0" }}>
            <img src={line.trim()} alt="" style={{ maxWidth:"100%", borderRadius:8 }}
              onError={e=>e.target.style.display="none"}/>
          </div>
        );
        if (/^https?:\/\//i.test(line.trim())) return (
          <div key={i}><a href={line.trim()} target="_blank" rel="noopener noreferrer"
            style={{ color:C.purpleL, textDecoration:"underline", wordBreak:"break-all" }}>{line.trim()}</a></div>
        );
        // bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} style={{ minHeight:"1.5em" }}>
            {parts.map((p,j) =>
              /^\*\*.*\*\*$/.test(p)
                ? <strong key={j}>{p.slice(2,-2)}</strong>
                : p
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PostForm — 글쓰기 / 수정 (리치 에디터)
══════════════════════════════════════════════════ */
function PostForm({ user, cat, initial, onSubmit, onCancel, C }) {
  const [title,    setTitle]    = useState(initial?.title || "");
  const [body,     setBody]     = useState(initial?.body  || "");
  const [preview,  setPreview]  = useState(false);
  const [ytUrl,    setYtUrl]    = useState("");
  const [imgUrl,   setImgUrl]   = useState("");
  const [showYt,   setShowYt]   = useState(false);
  const [showImg,  setShowImg]  = useState(false);
  const taRef = useRef(null);
  const catLabel = CATS.find(c=>c.id===cat)?.label || cat;

  const insertAt = (text) => {
    const el = taRef.current;
    if (!el) { setBody(b=>b+"\n"+text); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const next = body.slice(0,s)+"\n"+text+"\n"+body.slice(e);
    setBody(next);
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+text.length+2, s+text.length+2); },0);
  };

  const wrapSel = (before, after="") => {
    const el = taRef.current; if(!el) return;
    const s=el.selectionStart, e=el.selectionEnd;
    const sel = body.slice(s,e) || "텍스트";
    const next = body.slice(0,s)+before+sel+after+body.slice(e);
    setBody(next);
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+before.length, s+before.length+sel.length); },0);
  };

  const addYt = () => {
    const m = ytUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) { insertAt("https://www.youtube.com/watch?v="+m[1]); setYtUrl(""); setShowYt(false); }
    else alert("올바른 유튜브 URL을 입력해주세요.");
  };
  const addImg = () => {
    if (imgUrl.trim()) { insertAt(imgUrl.trim()); setImgUrl(""); setShowImg(false); }
  };

  const isDark = !C.inputBg || C.inputBg.includes("255,255,255,0");
  const toolBg = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f8";
  const toolBdr = C.border;
  const tbBtn = (active) => ({
    padding:"5px 12px", borderRadius:6, border:"1px solid "+(active?"rgba(124,106,255,0.5)":toolBdr),
    background: active ? "rgba(124,106,255,0.12)" : toolBg,
    color: active ? C.purpleL : C.muted, fontSize:12, cursor:"pointer", fontWeight: active?700:400,
  });

  return (
    <div className="fpad" style={{ maxWidth:900, width:"100%", boxSizing:"border-box" }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:900, color:C.text, margin:0 }}>{initial?"✏️ 수정":"✏️ 글쓰기"}</h2>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{catLabel} 게시판</div>
        </div>
        <button onClick={onCancel}
          style={{ padding:"6px 14px", borderRadius:8, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:13, cursor:"pointer" }}>← 목록</button>
      </div>

      {/* 폼 테두리 */}
      <div style={{ border:"1px solid "+C.border, borderTop:"2px solid "+C.text }}>
        {/* 제목 */}
        <div style={{ display:"flex", borderBottom:"1px solid "+C.border }}>
          <div style={{ width:70, padding:"11px 14px", fontSize:13, fontWeight:700, color:C.muted, background:C.bg2, flexShrink:0, borderRight:"1px solid "+C.border, display:"flex", alignItems:"center" }}>제목</div>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}
            placeholder="제목을 입력해주세요"
            style={{ flex:1, border:"none", outline:"none", padding:"11px 14px", fontSize:14, background:C.card, color:C.text, fontFamily:"inherit" }}/>
        </div>

        {/* 툴바 */}
        <div style={{ padding:"8px 10px", borderBottom:"1px solid "+C.border, background:toolBg, display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
          {/* 텍스트 서식 */}
          <button style={tbBtn(false)} onClick={()=>wrapSel("**","**")} title="굵게"><b>B</b></button>
          <div style={{ width:1, height:18, background:C.border, margin:"0 2px" }}/>

          {/* 유튜브 */}
          <button style={tbBtn(showYt)} onClick={()=>{setShowYt(p=>!p); setShowImg(false);}}>▶ 유튜브</button>

          {/* 이미지 URL */}
          <button style={tbBtn(showImg)} onClick={()=>{setShowImg(p=>!p); setShowYt(false);}}>🖼 이미지 URL</button>

          {/* 링크 */}
          <button style={tbBtn(false)} onClick={()=>wrapSel("https://")}>🔗 링크</button>

          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            <button style={tbBtn(!preview)} onClick={()=>setPreview(false)}>✏️ 편집</button>
            <button style={tbBtn(preview)}  onClick={()=>setPreview(true)}>👁 미리보기</button>
          </div>
        </div>

        {/* 유튜브 입력 */}
        {showYt && (
          <div style={{ padding:"10px 14px", background:C.bg2, borderBottom:"1px solid "+C.border, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>유튜브 URL</span>
            <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."
              onKeyDown={e=>e.key==="Enter"&&addYt()}
              style={{ flex:1, minWidth:200, border:"1px solid "+C.border, outline:"none", padding:"7px 10px", fontSize:13, background:C.card, color:C.text, borderRadius:6, fontFamily:"inherit" }}/>
            <button onClick={addYt} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#FF0000", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>삽입</button>
            <button onClick={()=>setShowYt(false)} style={{ padding:"7px 12px", borderRadius:6, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer" }}>닫기</button>
          </div>
        )}

        {/* 이미지 URL 입력 */}
        {showImg && (
          <div style={{ padding:"10px 14px", background:C.bg2, borderBottom:"1px solid "+C.border, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>이미지 URL</span>
            <input value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="https://example.com/image.jpg"
              onKeyDown={e=>e.key==="Enter"&&addImg()}
              style={{ flex:1, minWidth:200, border:"1px solid "+C.border, outline:"none", padding:"7px 10px", fontSize:13, background:C.card, color:C.text, borderRadius:6, fontFamily:"inherit" }}/>
            <button onClick={addImg} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#6366f1", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>삽입</button>
            <button onClick={()=>setShowImg(false)} style={{ padding:"7px 12px", borderRadius:6, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer" }}>닫기</button>
          </div>
        )}

        {/* 본문 편집 / 미리보기 */}
        {!preview ? (
          <textarea ref={taRef} value={body} onChange={e=>setBody(e.target.value)} rows={16}
            placeholder={"내용을 입력해주세요\n\n• 유튜브/이미지 URL을 줄 단위로 입력하면 자동 표시됩니다\n• **텍스트** 로 굵게 표시"}
            style={{ width:"100%", border:"none", outline:"none", padding:"14px", fontSize:14, background:C.card, color:C.text, fontFamily:"inherit", resize:"vertical", minHeight:300, boxSizing:"border-box", lineHeight:1.8 }}/>
        ) : (
          <div style={{ padding:"14px 16px", minHeight:300, background:C.card }}>
            {body.trim() ? <RichBody C={C} body={body}/> : <span style={{ color:C.muted, fontSize:13 }}>미리보기할 내용이 없습니다</span>}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="pf-act" style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={onCancel}
          style={{ padding:"10px 22px", borderRadius:8, border:"1px solid "+C.border, background:"transparent", color:C.muted, fontSize:14, cursor:"pointer", fontWeight:600 }}>취소</button>
        <button onClick={()=>{
          if (!title.trim()||!body.trim()){alert("제목과 내용을 입력해주세요.");return;}
          onSubmit({title,body});
        }} style={{ padding:"10px 32px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:14, cursor:"pointer", fontWeight:700 }}>
          {initial?"수정 완료":"등록하기"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   BoardPage
══════════════════════════════════════════════════ */
export default function BoardPage({ user, C }) {
  const [cat,        setCat]        = useState("board_ai");
  const [posts,      setPosts2]     = useState(getPosts);
  const [view,       setView]       = useState(null);
  const [editing,    setEditing]    = useState(null);
  const [writing,    setWriting]    = useState(false);
  const [comment,    setComment]    = useState("");
  const [editCmt,    setEditCmt]    = useState(null);
  const [pg,         setPg]         = useState(1);
  const PG = 20;

  const sync      = next => { setPosts(next); setPosts2(next); };
  const filtered  = posts.filter(p=>p.cat===cat);
  const totalPg   = Math.max(1, Math.ceil(filtered.length/PG));
  const paginated = filtered.slice((pg-1)*PG, pg*PG);
  const isOwner   = p => user&&(user.nick===p.nick||user.role==="admin");
  const changeCat = id => { setCat(id); setView(null); setWriting(false); setEditing(null); setPg(1); };

  const submitPost = form => {
    if (!user){alert("글쓰기는 회원만 가능합니다.");return;}
    const np = { id:Date.now(), cat, nick:user.nick, userId:user.id, title:form.title, body:form.body, date:new Date().toLocaleDateString("ko-KR"), views:0, comments:[] };
    sync([np,...posts]);
    try {
      const mk="nper_members"; const ms=JSON.parse(localStorage.getItem(mk)||"[]");
      localStorage.setItem(mk,JSON.stringify(ms.map(m=>m.id===user.id?{...m,points:(m.points||0)+10}:m)));
    } catch{}
    setWriting(false);
    alert("글이 등록됐어요! 포인트 10P 적립 🎉");
  };
  const submitEdit = form => {
    const next=posts.map(p=>p.id===editing.id?{...p,...form,edited:true}:p);
    sync(next); setView(next.find(p=>p.id===editing.id)); setEditing(null);
  };
  const deletePost = id => {
    if(!window.confirm("정말 삭제하시겠습니까?"))return;
    sync(posts.filter(p=>p.id!==id)); setView(null);
  };
  const openPost = p => {
    const next=posts.map(x=>x.id===p.id?{...x,views:(x.views||0)+1}:x);
    sync(next); setView({...p,views:(p.views||0)+1});
  };
  const addComment = postId => {
    if(!user){alert("댓글은 로그인 후 이용 가능합니다.");return;}
    if(!comment.trim())return;
    const next=posts.map(p=>p.id===postId?{...p,comments:[...p.comments,{id:Date.now(),nick:user.nick,text:comment,date:new Date().toLocaleDateString("ko-KR")}]}:p);
    sync(next); setView(next.find(p=>p.id===postId)); setComment("");
  };
  const submitEditCmt = postId => {
    if(!editCmt?.text?.trim())return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.map((c,i)=>i===editCmt.idx?{...c,text:editCmt.text,edited:true}:c)}:p);
    sync(next); setView(next.find(p=>p.id===postId)); setEditCmt(null);
  };
  const deleteCmt = (postId,idx) => {
    if(!window.confirm("댓글을 삭제하시겠습니까?"))return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.filter((_,i)=>i!==idx)}:p);
    sync(next); setView(next.find(p=>p.id===postId));
  };

  const B = C.border, BG2 = C.bg2, PUR = C.purpleL;

  /* ── 모바일 탭 (상단) ── */
  const MobileTabs = () => (
    <div className="board-mob-tabs" style={{ borderBottom:"1px solid "+B, background:C.sidebarBg, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
      <div style={{ display:"flex", padding:"6px 10px", gap:4, whiteSpace:"nowrap" }}>
        {CATS.map(cc=>(
          <button key={cc.id} onClick={()=>changeCat(cc.id)} style={{
            padding:"7px 13px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
            background:cat===cc.id?"rgba(124,106,255,0.12)":C.toggleBg, color:cat===cc.id?PUR:C.muted,
          }}>{cc.icon} {cc.label}</button>
        ))}
      </div>
    </div>
  );

  /* ── 데스크톱 사이드바 (board-row 안에 위치) ── */
  const Sidebar = () => (
    <aside className="board-side" style={{ width:160, flexShrink:0, borderRight:"1px solid "+B, background:C.sidebarBg, flexDirection:"column", paddingTop:4 }}>
      <div style={{ padding:"10px 14px 6px", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:1.2, textTransform:"uppercase" }}>게시판</div>
      {CATS.map(cc=>(
        <button key={cc.id} onClick={()=>changeCat(cc.id)} style={{
          display:"flex", alignItems:"center", gap:8, width:"100%", padding:"10px 14px",
          border:"none", cursor:"pointer", fontSize:13, fontWeight:cat===cc.id?700:500,
          background:cat===cc.id?"rgba(124,106,255,0.1)":"transparent",
          color:cat===cc.id?PUR:C.text,
          borderLeft:cat===cc.id?"3px solid #7c6aff":"3px solid transparent", textAlign:"left",
        }}><span>{cc.icon}</span>{cc.label}</button>
      ))}
    </aside>
  );

  /* ── 글쓰기/수정 ── */
  if (writing||editing) return (
    <div className="board-wrap">
      <style>{BOARD_CSS}</style>
      <MobileTabs/>
      <div className="board-row">
        <Sidebar/>
        <div className="board-main">
          <PostForm C={C} user={user} cat={cat}
            initial={editing||undefined}
            onSubmit={editing?submitEdit:submitPost}
            onCancel={()=>{setEditing(null);setWriting(false);}}/>
        </div>
      </div>
    </div>
  );

  /* ── 글 상세 ── */
  if (view) return (
    <div className="board-wrap">
      <style>{BOARD_CSS}</style>
      <MobileTabs/>
      <div className="board-row">
        <Sidebar/>
        <div className="board-main dpad" style={{ maxWidth:900, boxSizing:"border-box" }}>

          {/* 제목 영역 */}
          <div style={{ borderTop:"2px solid "+C.text, borderBottom:"1px solid "+B }}>
            <div style={{ padding:"14px 0 10px", borderBottom:"1px solid "+B }}>
              <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:800, color:C.text, margin:"0 0 8px", lineHeight:1.4, wordBreak:"keep-all" }}>{view.title}</h2>
              <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12, color:C.muted, flexWrap:"wrap" }}>
                <span style={{ fontWeight:700, color:C.text }}>{view.nick}</span>
                <span>{view.date}</span>
                <span>조회 {view.views||0}</span>
                <span>댓글 {(view.comments||[]).length}</span>
                {view.edited&&<span style={{ color:PUR }}>(수정됨)</span>}
                {isOwner(view)&&(
                  <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                    <button onClick={()=>setEditing(view)} style={{ padding:"3px 11px", borderRadius:5, border:"1px solid "+B, background:"transparent", color:C.muted, fontSize:11, cursor:"pointer" }}>수정</button>
                    <button onClick={()=>deletePost(view.id)} style={{ padding:"3px 11px", borderRadius:5, border:"1px solid rgba(229,62,62,0.3)", background:"rgba(229,62,62,0.05)", color:"#e53e3e", fontSize:11, cursor:"pointer" }}>삭제</button>
                  </div>
                )}
              </div>
            </div>
            {/* 본문 */}
            <div style={{ padding:"20px 0 24px", minHeight:140, borderBottom:"1px solid "+B }}>
              <RichBody C={C} body={view.body}/>
            </div>
          </div>

          {/* 목록/수정/삭제 버튼 */}
          <div style={{ display:"flex", gap:6, padding:"10px 0", borderBottom:"1px solid "+B, marginBottom:18 }}>
            <button onClick={()=>setView(null)} style={{ padding:"7px 18px", borderRadius:6, border:"1px solid "+B, background:BG2, color:C.text, fontSize:13, cursor:"pointer", fontWeight:600 }}>목록</button>
            {isOwner(view)&&<>
              <button onClick={()=>setEditing(view)} style={{ padding:"7px 18px", borderRadius:6, border:"1px solid "+B, background:BG2, color:C.text, fontSize:13, cursor:"pointer" }}>수정</button>
              <button onClick={()=>deletePost(view.id)} style={{ padding:"7px 18px", borderRadius:6, border:"1px solid rgba(229,62,62,0.3)", background:"rgba(229,62,62,0.05)", color:"#e53e3e", fontSize:13, cursor:"pointer" }}>삭제</button>
            </>}
          </div>

          {/* 댓글 */}
          <div style={{ border:"1px solid "+B }}>
            <div style={{ padding:"9px 14px", background:BG2, borderBottom:"1px solid "+B, fontSize:13, fontWeight:700, color:C.text }}>
              댓글 <span style={{ color:PUR }}>{(view.comments||[]).length}</span>
            </div>
            {(view.comments||[]).map((c,i)=>(
              <div key={c.id||i} style={{ borderBottom:"1px solid "+B, padding:"11px 14px" }}>
                {editCmt&&editCmt.idx===i?(
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <Inp C={C} value={editCmt.text} onChange={e=>setEditCmt({...editCmt,text:e.target.value})} onKeyDown={e=>e.key==="Enter"&&submitEditCmt(view.id)} style={{ flex:1, minWidth:120 }}/>
                    <button onClick={()=>submitEditCmt(view.id)} style={{ padding:"7px 13px", borderRadius:6, border:"none", background:C.purple, color:"#fff", fontSize:12, cursor:"pointer" }}>저장</button>
                    <button onClick={()=>setEditCmt(null)} style={{ padding:"7px 12px", borderRadius:6, border:"1px solid "+B, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer" }}>취소</button>
                  </div>
                ):(
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:700, color:PUR }}>{c.nick}</span>
                      <span style={{ fontSize:11, color:C.muted }}>{c.date}</span>
                      {c.edited&&<span style={{ fontSize:10, color:C.muted }}>(수정됨)</span>}
                      {user&&(user.nick===c.nick||user.role==="admin")&&(
                        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                          <button onClick={()=>setEditCmt({idx:i,text:c.text})} style={{ padding:"2px 7px", borderRadius:4, border:"1px solid "+B, background:"transparent", color:C.muted, fontSize:10, cursor:"pointer" }}>수정</button>
                          <button onClick={()=>deleteCmt(view.id,i)} style={{ padding:"2px 7px", borderRadius:4, border:"1px solid rgba(229,62,62,0.2)", background:"transparent", color:"#e53e3e", fontSize:10, cursor:"pointer" }}>삭제</button>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:14, color:C.text, lineHeight:1.7, wordBreak:"break-word" }}>{c.text}</div>
                  </div>
                )}
              </div>
            ))}
            {user?(
              <div className="cmt-inp-row" style={{ display:"flex" }}>
                <div style={{ padding:"9px 12px", background:BG2, borderRight:"1px solid "+B, fontSize:12, fontWeight:700, color:C.text, display:"flex", alignItems:"center", flexShrink:0 }}>{user.nick}</div>
                <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3}
                  placeholder="댓글을 입력해주세요 (Enter: 줄바꿈, Ctrl+Enter: 등록)"
                  style={{ flex:1, border:"none", outline:"none", padding:"9px 12px", fontSize:13, background:C.card, color:C.text, fontFamily:"inherit", resize:"none", lineHeight:1.7 }}
                  onKeyDown={e=>{ if(e.key==="Enter"&&e.ctrlKey){e.preventDefault();addComment(view.id);} }}/>
                <button onClick={()=>addComment(view.id)}
                  style={{ padding:"0 18px", border:"none", borderLeft:"1px solid "+B, background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0, minWidth:64 }}>등록</button>
              </div>
            ):(
              <div style={{ padding:"12px 14px", background:BG2, fontSize:13, color:C.muted, textAlign:"center" }}>댓글은 로그인 후 이용 가능합니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ══ 목록 ══ */
  const catInfo = CATS.find(c=>c.id===cat);
  return (
    <div className="board-wrap">
      <style>{BOARD_CSS}</style>
      <MobileTabs/>
      <div className="board-row">
        <Sidebar/>
        <div className="board-main">

          {/* 게시판 헤더 */}
          <div className="hdr-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"2px solid "+C.text }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:900, color:C.text, margin:0 }}>{catInfo?.icon} {catInfo?.label}</h2>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>총 {filtered.length}개</div>
            </div>
            <div className="wb">
              <button onClick={()=>{ if(!user)alert("글쓰기는 로그인 후 이용 가능합니다."); else setWriting(true); }}
                style={{ padding:"8px 20px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                ✏️ 글쓰기
              </button>
            </div>
          </div>

          {/* 테이블 헤더 (PC) */}
          <div className="pt-head" style={{ display:"flex", background:BG2, borderBottom:"1px solid "+B, fontSize:12, fontWeight:700, color:C.muted }}>
            <div style={{ width:52, padding:"10px 0", textAlign:"center", flexShrink:0 }}>번호</div>
            <div style={{ flex:1, padding:"10px 12px" }}>제목</div>
            <div className="pt-extra" style={{ width:76, padding:"10px 0", textAlign:"center", flexShrink:0 }}>글쓴이</div>
            <div className="pt-extra" style={{ width:86, padding:"10px 0", textAlign:"center", flexShrink:0 }}>날짜</div>
            <div className="pt-extra" style={{ width:52, padding:"10px 0", textAlign:"center", flexShrink:0 }}>조회</div>
          </div>

          {/* 글 없음 */}
          {filtered.length===0&&(
            <div style={{ padding:"60px 0", textAlign:"center", color:C.muted, fontSize:14, borderBottom:"1px solid "+B }}>
              아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️
            </div>
          )}

          {/* 글 목록 */}
          {paginated.map((p,idx)=>{
            const num = filtered.length - ((pg-1)*PG) - idx;
            return (
              <div key={p.id} className="pt-row"
                style={{ display:"flex", borderBottom:"1px solid "+B, cursor:"pointer", transition:"background 0.1s" }}
                onClick={()=>openPost(p)}
                onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div className="pt-num" style={{ width:52, padding:"11px 0", textAlign:"center", fontSize:12, color:C.muted, flexShrink:0 }}>{num}</div>
                <div style={{ flex:1, padding:"9px 12px", minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                    <span style={{ fontSize:14, fontWeight:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"calc(100vw - 140px)" }}>{p.title}</span>
                    {(p.comments||[]).length>0&&<span style={{ fontSize:11, color:PUR, fontWeight:700 }}>[{p.comments.length}]</span>}
                    {p.edited&&<span style={{ fontSize:10, color:C.muted }}>(수정됨)</span>}
                  </div>
                  <div className="pt-meta" style={{ color:C.muted, marginTop:2 }}>
                    <span>{p.nick}</span>
                    <span className="pt-date-s">{p.date}</span>
                    <span>조회 {p.views||0}</span>
                  </div>
                </div>
                <div className="pt-extra" style={{ width:76, padding:"11px 0", textAlign:"center", fontSize:12, color:C.muted, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis" }}>{p.nick}</div>
                <div className="pt-extra" style={{ width:86, padding:"11px 0", textAlign:"center", fontSize:12, color:C.muted, flexShrink:0 }}><span className="pt-date-f">{p.date}</span></div>
                <div className="pt-extra" style={{ width:52, padding:"11px 0", textAlign:"center", fontSize:12, color:C.muted, flexShrink:0 }}>{p.views||0}</div>
              </div>
            );
          })}

          {/* 페이지네이션만 (글쓰기 버튼 제거) */}
          <div style={{ display:"flex", justifyContent:"center", padding:"14px 0" }}>
            {Array.from({length:totalPg},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPg(p)}
                style={{ width:32, height:32, borderRadius:5, border:pg===p?"none":"1px solid "+B, background:pg===p?C.purple:"transparent", color:pg===p?"#fff":C.muted, fontSize:13, cursor:"pointer", fontWeight:pg===p?700:400, margin:"0 2px" }}>
                {p}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
