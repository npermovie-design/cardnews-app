import { useState, useMemo, useEffect, useRef } from "react";
import { getPosts, setPosts, changePoints } from "./storage";

/* ─── 카테고리 ────────────────────────────────────────────── */
const SUB_CATS = [
  { id: "info",   label: "정보공유",   icon: "📌", color: "#6366f1" },
  { id: "qna",    label: "질문답변",   icon: "❓", color: "#f59e0b" },
  { id: "free",   label: "자유게시판", icon: "🗣", color: "#10b981" },
  { id: "review", label: "사용후기",   icon: "⭐", color: "#ec4899" },
];

/* ─── 리치 텍스트 에디터 ───────────────────────────────────── */
function RichEditor({ value, onChange }) {
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

  const ToolBtn = ({ onClick, title, children, active }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick(); }} title={title}
      style={{ padding:"5px 9px", border:"none", borderRadius:6, background: active?"rgba(99,102,241,0.25)":"transparent",
        color:"#ccc", cursor:"pointer", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", minWidth:28 }}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
      onMouseLeave={e=>e.currentTarget.style.background=active?"rgba(99,102,241,0.25)":"transparent"}>
      {children}
    </button>
  );

  const Divider = () => <div style={{width:1,height:20,background:"rgba(255,255,255,0.15)",margin:"0 3px"}}/>;

  return (
    <div style={{border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,overflow:"visible",background:"#1a1a2e"}}>
      {/* 툴바 */}
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:2,padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)"}}>
        {/* 텍스트 스타일 */}
        <ToolBtn onClick={()=>exec("bold")} title="굵게 (Ctrl+B)"><b>B</b></ToolBtn>
        <ToolBtn onClick={()=>exec("italic")} title="기울임 (Ctrl+I)"><i>I</i></ToolBtn>
        <ToolBtn onClick={()=>exec("underline")} title="밑줄 (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn onClick={()=>exec("strikeThrough")} title="취소선"><s>S</s></ToolBtn>
        <Divider/>
        {/* 폰트 크기 */}
        <select value={fontSize} onChange={e=>{setFontSize(e.target.value);exec("fontSize",e.target.value);}}
          style={{padding:"4px 6px",border:"none",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"#ccc",fontSize:12,cursor:"pointer"}}>
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
        <ToolBtn onClick={insertImage} title="이미지 삽입">🖼</ToolBtn>
        <ToolBtn onClick={insertVideo} title="유튜브 동영상">▶</ToolBtn>
        <ToolBtn onClick={insertLink} title="링크 삽입">🔗</ToolBtn>
        <ToolBtn onClick={insertTable} title="표 삽입">⊞</ToolBtn>
        <Divider/>
        {/* 이모티콘 */}
        <div style={{position:"relative"}}>
          <ToolBtn onClick={()=>setShowEmoji(p=>!p)} title="이모티콘">😊</ToolBtn>
          {showEmoji && (
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:999,
              background:"#1e1c3a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:10,
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
        style={{minHeight:280,padding:"16px 18px",color:"#e0e0e0",fontSize:15,lineHeight:1.8,outline:"none",
          wordBreak:"break-word",overflowY:"auto"}}
      />

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255,255,255,0.25); pointer-events:none; }
        [contenteditable] table td { border: 1px solid #555; padding: 8px 12px; }
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
function WriteForm({ user, subCat, initial, onDone, onCancel, C, isDark }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body,  setBody]  = useState(initial?.body  || "");
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#d1d5db";
  const sub = SUB_CATS.find(s=>s.id===subCat);
  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"28px 0 60px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
        <button type="button" onClick={onCancel} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:18,padding:0}}>←</button>
        <h2 style={{fontSize:20,fontWeight:900,color:C.text,margin:0}}>{initial?"글 수정":"새 글 작성"}</h2>
        {sub&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:sub.color+"20",color:sub.color,fontWeight:700}}>{sub.icon} {sub.label}</span>}
        {!initial&&<span style={{fontSize:12,color:"#4ade80",marginLeft:"auto"}}>✏️ 글 등록 시 1P 적립!</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <input placeholder="제목을 입력해주세요" value={title} maxLength={100} onChange={e=>setTitle(e.target.value)}
          style={{padding:"13px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:15,outline:"none"}}/>
        <RichEditor value={body} onChange={setBody}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button type="button" onClick={onCancel} style={{padding:"11px 24px",borderRadius:10,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:14,cursor:"pointer",fontWeight:600}}>취소</button>
          <button type="button" onClick={()=>{
            if(title.trim()&&body.replace(/<[^>]*>/g,"").trim()) onDone({title:title.trim(),body});
            else alert("제목과 내용을 입력해주세요.");
          }} style={{padding:"11px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:800}}>
            {initial?"수정 완료":"등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── BoardPage 메인 ──────────────────────────────────────── */
export default function BoardPage({ user, C, onLoginRequest, initialCat }) {
  const [subCat,  setSubCat]  = useState(initialCat || "info");
  const [posts,   setPostsS]  = useState(getPosts);
  const [view,    setView]    = useState(null);
  const [mode,    setMode]    = useState("list");
  const [comment, setComment] = useState("");
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("latest");
  const [page,    setPage]    = useState(1);
  const [toast,   setToast]   = useState("");
  const PER = 20;

  const isDark = !!(C.bg?.includes("0a")||C.bg?.includes("#10")||C.bg?.includes("242"));
  const bdr  = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const head = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
  const hover= isDark ? "rgba(255,255,255,0.03)" : "#f9fafb";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "#fff";

  const showToast = (msg,type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(""),3500);
  };

  useEffect(()=>{ if(initialCat) setSubCat(initialCat); },[initialCat]);

  const sync = next=>{ setPosts(next); setPostsS(next); };
  const own  = p=>user&&(user.nick===p.nick||user.role==="admin");

  const subInfo = SUB_CATS.find(s=>s.id===subCat)||SUB_CATS[0];

  const filtered = useMemo(()=>{
    let list = posts.filter(p=>p.cat===subCat||p.subCat===subCat);
    if(search.trim()){ const q=search.toLowerCase(); list=list.filter(p=>p.title.toLowerCase().includes(q)||(p.nick||"").toLowerCase().includes(q)); }
    return sort==="views"?[...list].sort((a,b)=>(b.views||0)-(a.views||0))
          :sort==="likes"?[...list].sort((a,b)=>(b.likes||0)-(a.likes||0))
          :[...list].sort((a,b)=>b.id-a.id);
  },[posts,subCat,search,sort]);

  const hotPosts = useMemo(()=>
    [...posts.filter(p=>p.cat===subCat||p.subCat===subCat)].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,3),
  [posts,subCat]);

  const totalPages=Math.ceil(filtered.length/PER);
  const pageItems=filtered.slice((page-1)*PER,page*PER);

  /* 글 등록 - 1P 지급 */
  const submitPost = async ({title,body}) => {
    if(!user){if(onLoginRequest)onLoginRequest();return;}
    const p={id:Date.now(),cat:subCat,subCat,nick:user.nick,title,body,
             date:new Date().toLocaleDateString("ko-KR"),comments:[],views:0,likes:0};
    sync([p,...posts]); setMode("list");
    // 1P 지급
    if(user.uid){
      try {
        await changePoints(user.uid, 1, "커뮤니티 글 작성");
        showToast("✅ 글이 등록됐어요! +1P 포인트가 지급됐습니다 🎉","success");
      } catch(e) {
        showToast("✅ 글이 등록됐어요!","success");
      }
    } else {
      showToast("✅ 글이 등록됐어요!","success");
    }
  };

  const submitEdit = ({title,body}) => {
    const next=posts.map(p=>p.id===view.id?{...p,title,body,edited:true}:p);
    sync(next); setView(next.find(p=>p.id===view.id)); setMode("list");
    showToast("✅ 글이 수정됐어요","success");
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

  const delComment=(postId,idx)=>{
    if(!window.confirm("댓글을 삭제할까요?"))return;
    const next=posts.map(p=>p.id===postId?{...p,comments:p.comments.filter((_,i)=>i!==idx)}:p);
    sync(next); setView(next.find(p=>p.id===postId));
  };

  /* 공유 */
  const sharePost = post => {
    const url = window.location.origin + window.location.pathname + "#community";
    if(navigator.share){ navigator.share({title:post.title,text:post.title,url}); }
    else { navigator.clipboard.writeText(url); showToast("🔗 링크가 복사됐어요","info"); }
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
        onDone={mode==="edit"?submitEdit:submitPost} onCancel={()=>setMode("list")} C={C} isDark={isDark}/>
    </div>
  );

  /* 상세 보기 */
  if(view) return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      {/* 토스트 */}
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#22c55e":"#6366f1",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>{toast.msg}</div>}
      <div style={{maxWidth:900,margin:"0 auto",padding:"24px 20px 60px"}}>
        <button onClick={()=>setView(null)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,marginBottom:18,padding:0,fontWeight:600}}>← 목록으로</button>
        <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:16,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"24px 28px 20px",borderBottom:"1px solid "+bdr}}>
            {subInfo&&<span style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:subInfo.color+"20",color:subInfo.color,fontWeight:700,display:"inline-block",marginBottom:12}}>{subInfo.icon} {subInfo.label}</span>}
            <h1 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 16px",lineHeight:1.4}}>{view.title}{view.edited&&<span style={{fontSize:11,color:C.muted,marginLeft:8,fontWeight:400}}>(수정됨)</span>}</h1>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:14,fontSize:13,color:C.muted}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{(view.nick||"?")[0].toUpperCase()}</div>
                  <span style={{fontWeight:700,color:C.text}}>{view.nick}</span>
                </div>
                <span>{view.date}</span><span>👁 {view.views||0}</span><span>💬 {(view.comments||[]).length}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>sharePost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>🔗 공유</button>
                <button onClick={()=>printPost(view)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>🖨 인쇄</button>
                {own(view)&&<>
                  <button onClick={()=>setMode("edit")} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer"}}>수정</button>
                  <button onClick={()=>del(view.id)} style={{padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.05)",color:"#ef4444",fontSize:12,cursor:"pointer"}}>삭제</button>
                </>}
              </div>
            </div>
          </div>
          <div style={{padding:"28px 28px 24px"}}>
            <RichBody html={view.body} C={C}/>
          </div>
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
          <div style={{padding:"0 24px"}}>
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
          <div style={{padding:"16px 24px",borderTop:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.02)":"#fafafa"}}>
            {user?(
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{(user.nick||"?")[0].toUpperCase()}</div>
                <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="댓글을 입력하세요..."
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addComment(view.id);}}}
                  style={{flex:1,padding:"11px 16px",borderRadius:10,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.05)":"#fff",color:C.text,fontSize:14,outline:"none"}}/>
                <button onClick={()=>addComment(view.id)} style={{padding:"11px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>등록</button>
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

  /* 목록 */
  return (
    <div style={{background:isDark?"transparent":"#f7f8fa",minHeight:"calc(100vh - 64px)"}}>
      {/* 토스트 */}
      {toast&&<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#22c55e":"#6366f1",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>{toast.msg}</div>}

      {/* 서브 카테고리 탭 */}
      <div style={{borderBottom:"1px solid "+bdr,background:isDark?"rgba(99,102,241,0.04)":"rgba(99,102,241,0.02)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",gap:4,overflowX:"auto"}}>
          {SUB_CATS.map(s=>(
            <button key={s.id} onClick={()=>{setSubCat(s.id);setSearch("");setPage(1);setView(null);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"13px 18px",borderRadius:0,border:"none",cursor:"pointer",
                fontSize:14,fontWeight:subCat===s.id?700:500,whiteSpace:"nowrap",
                background:"transparent",color:subCat===s.id?s.color:C.muted,
                borderBottom:subCat===s.id?"3px solid "+s.color:"3px solid transparent",
                transition:"all 0.12s"}}>
              {s.icon} {s.label}
              <span style={{fontSize:11,opacity:0.6,background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",padding:"1px 7px",borderRadius:10}}>{posts.filter(p=>p.cat===s.id||p.subCat===s.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px"}}>
        {/* 포인트 안내 배너 */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",margin:"16px 0 0",borderRadius:12,
          background:isDark?"rgba(74,222,128,0.06)":"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)"}}>
          <span style={{fontSize:18}}>💎</span>
          <span style={{fontSize:13,color:isDark?"#86efac":"#166534",lineHeight:1.6}}>
            <b>포인트 적립 안내</b> · 게시글 작성 시 <b style={{color:"#4ade80"}}>+1P</b> 적립됩니다.
            댓글에는 포인트가 지급되지 않습니다. 적립된 포인트로 AI 생성기를 이용해보세요!
          </span>
        </div>

        <div style={{display:"flex",gap:20,padding:"16px 0 60px",alignItems:"flex-start"}}>
          {/* 메인 */}
          <div style={{flex:1,minWidth:0}}>
            {/* 액션바 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:15,fontWeight:800,color:C.text}}>{subInfo.icon} {subInfo.label}</span>
                <span style={{fontSize:12,color:C.muted,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f8",padding:"2px 8px",borderRadius:10}}>총 {filtered.length}개</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{display:"flex",border:"1px solid "+bdr,borderRadius:9,overflow:"hidden",background:isDark?"rgba(255,255,255,0.04)":"#fff"}}>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="검색..."
                    style={{padding:"7px 12px",border:"none",background:"transparent",color:C.text,fontSize:13,outline:"none",width:150}}/>
                  {search&&<button onClick={()=>{setSearch("");setPage(1);}} style={{padding:"7px 10px",border:"none",background:"transparent",color:C.muted,cursor:"pointer"}}>✕</button>}
                </div>
                <select value={sort} onChange={e=>setSort(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:9,border:"1px solid "+bdr,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:C.text,fontSize:12,outline:"none",cursor:"pointer"}}>
                  <option value="latest">최신순</option>
                  <option value="views">조회순</option>
                  <option value="likes">추천순</option>
                </select>
                <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest();}else setMode("write");}}
                  style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}}>
                  ✏️ 글쓰기 (+1P)
                </button>
              </div>
            </div>

            {/* 테이블 헤더 */}
            <div style={{background:head,border:"1px solid "+bdr,borderRadius:"10px 10px 0 0",padding:"9px 16px",
              display:"grid",gridTemplateColumns:"52px 1fr 90px 76px 54px 50px",
              fontSize:11,fontWeight:700,color:C.muted}}>
              <span style={{textAlign:"center"}}>번호</span>
              <span style={{paddingLeft:8}}>제목</span>
              <span style={{textAlign:"center"}}>작성자</span>
              <span style={{textAlign:"center"}}>날짜</span>
              <span style={{textAlign:"center"}}>조회</span>
              <span style={{textAlign:"center"}}>추천</span>
            </div>

            {pageItems.length===0&&(
              <div style={{background:cardBg,border:"1px solid "+bdr,borderTop:"none",borderRadius:"0 0 10px 10px",padding:"70px 0",textAlign:"center",color:C.muted}}>
                <div style={{fontSize:36,marginBottom:12}}>{subInfo?.icon||"📋"}</div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>
                  {search?`"${search}" 검색 결과가 없어요`:"아직 게시글이 없어요"}
                </div>
                <div style={{fontSize:13,marginBottom:20}}>첫 번째 글을 작성하면 <b style={{color:"#4ade80"}}>1P</b>가 적립됩니다!</div>
                {user&&<button onClick={()=>setMode("write")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✏️ 글쓰기</button>}
              </div>
            )}

            <div style={{border:"1px solid "+bdr,borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
              {pageItems.map((p,idx)=>{
                const num=filtered.length-(page-1)*PER-idx;
                const today=Date.now()-p.id<86400000;
                return (
                  <div key={p.id} onClick={()=>openPost(p)}
                    style={{display:"grid",gridTemplateColumns:"52px 1fr 90px 76px 54px 50px",
                      padding:"11px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{textAlign:"center",fontSize:12,color:C.muted,alignSelf:"center"}}>{num}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:8,minWidth:0}}>
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

            {totalPages>1&&(
              <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:20}}>
                <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>«</button>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===1?"not-allowed":"pointer",fontSize:12,opacity:page===1?0.4:1}}>‹</button>
                {Array.from({length:Math.min(7,totalPages)},(_,i)=>{const s=Math.max(1,Math.min(page-3,totalPages-6));const n=s+i;return n<=totalPages?<button key={n} onClick={()=>setPage(n)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(n===page?C.purpleL:bdr),background:n===page?C.purpleL:"transparent",color:n===page?"#fff":C.muted,cursor:"pointer",fontSize:12,fontWeight:n===page?700:400}}>{n}</button>:null;})}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>›</button>
                <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:C.muted,cursor:page===totalPages?"not-allowed":"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}>»</button>
              </div>
            )}
          </div>

          {/* 우측 사이드바 */}
          <aside style={{width:240,flexShrink:0,display:"flex",flexDirection:"column",gap:14}}>
            {hotPosts.length>0&&(
              <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"14px 16px",borderBottom:"1px solid "+bdr,background:isDark?"rgba(251,191,36,0.06)":"rgba(251,191,36,0.04)"}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>🔥 인기글 TOP3</span>
                </div>
                {hotPosts.map((p,i)=>(
                  <div key={p.id} onClick={()=>openPost(p)} style={{padding:"12px 16px",borderBottom:"1px solid "+bdr,cursor:"pointer",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=hover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
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
            <div style={{background:C.card,border:"1px solid "+bdr,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid "+bdr}}>
                <span style={{fontSize:13,fontWeight:800,color:C.text}}>💎 포인트 적립</span>
              </div>
              {[["✏️ 글 작성","+1P"],["🤖 AI 생성","-10P"],["🎁 가입 즉시","+10P"],["📅 일일 로그인","+3P"]].map(([a,p])=>(
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
                <button onClick={onLoginRequest} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>로그인 / 가입</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
