import { useState } from "react";
import { getPosts, setPosts, CATS } from "./storage";
import { Btn, Inp, Textarea } from "./UI";

/* ── RichBody ── */
function RichBody({ body, C }) {
  if (!body) return null;
  const lines = body.split('\n');
  return (
    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {lines.map((line, i) => {
        const ytMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (ytMatch) return (
          <div key={i} style={{ margin: "12px 0", borderRadius: 12, overflow: "hidden", maxWidth: 560 }}>
            <iframe src={"https://www.youtube.com/embed/" + ytMatch[1]} style={{ width: "100%", height: 315, border: "none" }} allowFullScreen title="youtube" />
          </div>
        );
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return (
          <div key={i} style={{ margin: "12px 0" }}>
            <img src={line.trim()} alt="" style={{ maxWidth: "100%", borderRadius: 10 }} onError={e => e.target.style.display = "none"} />
          </div>
        );
        if (/^https?:\/\//i.test(line.trim())) return (
          <div key={i} style={{ margin: "4px 0" }}>
            <a href={line.trim()} target="_blank" rel="noopener noreferrer" style={{ color: C.purpleL, textDecoration: "underline", wordBreak: "break-all" }}>{line.trim()}</a>
          </div>
        );
        return <span key={i}>{line}{i < lines.length - 1 && '\n'}</span>;
      })}
    </div>
  );
}

/* ── PostForm ── */
function PostForm({ user, cat, initial, onSubmit, onCancel, C }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody]   = useState(initial?.body || "");
  const catLabel = CATS.find(c => c.id === cat)?.label || cat;

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{initial ? "글 수정" : "글쓰기"} — {catLabel}</h2>
        <button onClick={onCancel} style={{ background: "none", border: "1px solid " + C.border, color: C.muted, cursor: "pointer", fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>취소</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>제목</div>
          <Inp C={C} placeholder="제목을 입력해주세요" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>내용</div>
          <Textarea C={C} placeholder="내용을 입력해주세요" value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ minHeight: 240 }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>취소</button>
          <Btn C={C} onClick={() => onSubmit({ title, body })}>{initial ? "수정 완료" : "등록하기"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BoardPage
════════════════════════════════════════════════════════════ */
const BT = {
  ko:{ write:"✏️ 글쓰기", list:"목록", post:"등록", noPost:"아직 게시글이 없어요 ✍️",
    num:"번호", title:"제목", author:"글쓴이", date:"날짜", views:"조회",
    comments:"댓글", commentPh:"댓글 입력 (Ctrl+Enter: 등록)",
    loginForComment:"댓글은 로그인 후 이용 가능합니다", loginLink:"→ 로그인",
    edit:"수정", del:"삭제", backToList:"← 목록으로", edited:"(수정됨)",
    confirmDelete:"정말 삭제하시겠습니까?", confirmDeleteCmt:"댓글을 삭제하시겠습니까?",
    pointAlert:"글이 등록됐어요! 10P 적립 🎉", editPost:"✏️ 수정",
    cancel:"취소", submit:"등록하기", editSubmit:"수정 완료",
    titlePh:"제목을 입력해주세요", bodyPh:"내용을 입력해주세요\n\n• 유튜브/이미지 URL을 줄 단위로 입력하면 자동 표시됩니다",
    preview:"👁 미리보기", editMode:"✏️ 편집",
    ytInsert:"▶ 유튜브", imgInsert:"🖼 이미지 URL", bold:"B 굵게",
    insert:"삽입", close:"닫기" },
  en:{ write:"✏️ Write", list:"List", post:"Post", noPost:"No posts yet ✍️",
    num:"No.", title:"Title", author:"Author", date:"Date", views:"Views",
    comments:"Comments", commentPh:"Write a comment (Ctrl+Enter)",
    loginForComment:"Login to write comments", loginLink:"→ Login",
    edit:"Edit", del:"Delete", backToList:"← Back", edited:"(edited)",
    confirmDelete:"Delete this post?", confirmDeleteCmt:"Delete comment?",
    pointAlert:"Posted! +10P 🎉", editPost:"✏️ Edit",
    cancel:"Cancel", submit:"Submit", editSubmit:"Save",
    titlePh:"Enter title", bodyPh:"Enter content",
    preview:"👁 Preview", editMode:"✏️ Edit",
    ytInsert:"▶ YouTube", imgInsert:"🖼 Image URL", bold:"B Bold",
    insert:"Insert", close:"Close" },
  ja:{ write:"✏️ 投稿", list:"一覧", post:"投稿する", noPost:"まだ投稿がありません ✍️",
    num:"番号", title:"タイトル", author:"投稿者", date:"日付", views:"閲覧",
    comments:"コメント", commentPh:"コメントを入力 (Ctrl+Enter)",
    loginForComment:"コメントはログイン後に可能です", loginLink:"→ ログイン",
    edit:"編集", del:"削除", backToList:"← 一覧に戻る", edited:"(編集済み)",
    confirmDelete:"削除しますか？", confirmDeleteCmt:"コメントを削除しますか？",
    pointAlert:"投稿しました！10P獲得 🎉", editPost:"✏️ 編集",
    cancel:"キャンセル", submit:"投稿する", editSubmit:"更新する",
    titlePh:"タイトルを入力", bodyPh:"内容を入力してください",
    preview:"👁 プレビュー", editMode:"✏️ 編集",
    ytInsert:"▶ YouTube", imgInsert:"🖼 画像URL", bold:"B 太字",
    insert:"挿入", close:"閉じる" },
  zh:{ write:"✏️ 发帖", list:"列表", post:"发布", noPost:"暂无帖子 ✍️",
    num:"编号", title:"标题", author:"作者", date:"日期", views:"浏览",
    comments:"评论", commentPh:"写评论 (Ctrl+Enter)",
    loginForComment:"请登录后发表评论", loginLink:"→ 登录",
    edit:"编辑", del:"删除", backToList:"← 返回", edited:"(已编辑)",
    confirmDelete:"确定删除？", confirmDeleteCmt:"确定删除评论？",
    pointAlert:"发帖成功！+10P 🎉", editPost:"✏️ 编辑",
    cancel:"取消", submit:"发布", editSubmit:"保存",
    titlePh:"请输入标题", bodyPh:"请输入内容",
    preview:"👁 预览", editMode:"✏️ 编辑",
    ytInsert:"▶ YouTube", imgInsert:"🖼 图片URL", bold:"B 加粗",
    insert:"插入", close:"关闭" },
};

export default function BoardPage({ user, C, onLoginRequest, lang="ko", t: tProp, initialCat, embedded }) {
  const t = (tProp && tProp.board) ? tProp.board : (BT[lang] || BT.ko);
  const [cat, setCat]           = useState("ai");
  const [posts, setPosts2]      = useState(getPosts);
  const [view, setView]         = useState(null);
  const [editing, setEditing]   = useState(null);
  const [writing, setWriting]   = useState(false);
  const [comment, setComment]   = useState("");
  const [editComment, setEditComment] = useState(null);

  const sync = (next) => { setPosts(next); setPosts2(next); };
  const filtered = posts.filter(p => p.cat === cat);
  const isOwner  = p => user && (user.nick === p.nick || user.role === "admin");

  const submitPost = (form) => {
    if (!user) { alert("글쓰기는 회원만 가능합니다."); return; }
    if (!form.title.trim() || !form.body.trim()) { alert("제목과 내용을 입력해주세요."); return; }
    const newPost = { id: Date.now(), cat, nick: user.nick, userId: user.id, title: form.title, body: form.body, date: new Date().toLocaleDateString("ko-KR"), comments: [] };
    const next = [newPost, ...posts];
    sync(next);
    try {
      const mk = "nper_members";
      const ms = JSON.parse(localStorage.getItem(mk) || "[]");
      localStorage.setItem(mk, JSON.stringify(ms.map(m => m.id === user.id ? { ...m, points: (m.points || 0) + 10 } : m)));
    } catch {}
    setWriting(false);
    alert("글이 등록됐어요! 포인트 1P 적립 🎉");
  };

  const submitEdit = (form) => {
    if (!form.title.trim() || !form.body.trim()) { alert("제목과 내용을 입력해주세요."); return; }
    const next = posts.map(p => p.id === editing.id ? { ...p, title: form.title, body: form.body, edited: true } : p);
    sync(next); setView(next.find(p => p.id === editing.id)); setEditing(null);
  };

  const deletePost = (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const next = posts.filter(p => p.id !== id);
    sync(next); setView(null);
  };

  const addComment = (postId) => {
    if (!user) { alert("댓글은 로그인 후 이용 가능합니다."); return; }
    if (!comment.trim()) return;
    const next = posts.map(p => p.id === postId ? { ...p, comments: [...p.comments, { id: Date.now(), nick: user.nick, userId: user.id, text: comment, date: new Date().toLocaleDateString("ko-KR") }] } : p);
    sync(next); setView(next.find(p => p.id === postId)); setComment("");
  };

  const submitEditComment = (postId) => {
    if (!editComment || !editComment.text.trim()) return;
    const next = posts.map(p => p.id === postId ? { ...p, comments: p.comments.map((c, i) => i === editComment.idx ? { ...c, text: editComment.text, edited: true } : c) } : p);
    sync(next); setView(next.find(p => p.id === postId)); setEditComment(null);
  };

  const deleteComment = (postId, idx) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const next = posts.map(p => p.id === postId ? { ...p, comments: p.comments.filter((_, i) => i !== idx) } : p);
    sync(next); setView(next.find(p => p.id === postId));
  };

  // 모바일: 가로 탭, 데스크톱: 세로 사이드바
  const Sidebar = () => (
    <>
      {/* 데스크톱 사이드바 */}
      <aside style={{ width: 200, flexShrink: 0, borderRight: "1px solid " + C.border, padding: "24px 0", background: C.sidebarBg, display: "var(--board-side-display,flex)", flexDirection: "column" }}
        className="board-sidebar-desktop">
        {CATS.map(cc => (
          <button key={cc.id} onClick={() => { setCat(cc.id); setView(null); setWriting(false); setEditing(null); }}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: cat === cc.id ? "rgba(124,106,255,0.08)" : "transparent", color: cat === cc.id ? C.purpleL : C.muted, borderLeft: cat === cc.id ? "3px solid #7c6aff" : "3px solid transparent", textAlign: "left", transition: "all 0.15s" }}>
            {cc.icon} {cc.label}
          </button>
        ))}
      </aside>
      {/* 모바일 가로 탭 */}
      <div className="board-sidebar-mobile" style={{ display: "none", borderBottom: "1px solid " + C.border, overflowX: "auto", background: C.sidebarBg, flexShrink: 0 }}>
        <div style={{ display: "flex", padding: "8px 12px", gap: 6, whiteSpace: "nowrap" }}>
          {CATS.map(cc => (
            <button key={cc.id} onClick={() => { setCat(cc.id); setView(null); setWriting(false); setEditing(null); }}
              style={{ padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: cat === cc.id ? "rgba(124,106,255,0.12)" : "transparent", color: cat === cc.id ? C.purpleL : C.muted, whiteSpace: "nowrap" }}>
              {cc.icon} {cc.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  if (editing) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "clamp(16px,3vw,32px) clamp(14px,3vw,28px)", minWidth: 0 }}>
        <PostForm C={C} user={user} cat={cat} initial={editing} onSubmit={submitEdit} onCancel={() => setEditing(null)} />
      </div>
    </div>
  );

  if (writing) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "clamp(16px,3vw,32px) clamp(14px,3vw,28px)", minWidth: 0 }}>
        <PostForm C={C} user={user} cat={cat} onSubmit={submitPost} onCancel={() => setWriting(false)} />
      </div>
    </div>
  );

  if (view) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "clamp(16px,3vw,36px) clamp(14px,3vw,32px)", minWidth: 0, maxWidth: "100%" }}>
        <button onClick={() => setView(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0, fontWeight: 600 }}>← 목록으로</button>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 18, padding: "28px", marginBottom: 14, boxShadow: C.shadow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted }}>
              {view.nick} · {view.date}
              {view.edited && <span style={{ color: C.purpleL, marginLeft: 6 }}>(수정됨)</span>}
            </div>
            {isOwner(view) && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setEditing(view)} style={{ padding: "4px 12px", borderRadius: 7, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>수정</button>
                <button onClick={() => deletePost(view.id)} style={{ padding: "4px 12px", borderRadius: 7, border: "1px solid rgba(229,62,62,0.2)", background: "rgba(229,62,62,0.05)", color: "#e53e3e", fontSize: 11, cursor: "pointer" }}>삭제</button>
              </div>
            )}
          </div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 20px" }}>{view.title}</h2>
          <RichBody C={C} body={view.body} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10 }}>댓글 {(view.comments || []).length}개</div>
          {(view.comments || []).map((c, i) => (
            <div key={c.id || i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 16px", marginBottom: 8, boxShadow: C.shadow }}>
              {editComment && editComment.idx === i ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <Inp C={C} value={editComment.text} onChange={e => setEditComment({ ...editComment, text: e.target.value })} onKeyDown={e => e.key === "Enter" && submitEditComment(view.id)} style={{ flex: 1 }} />
                  <button onClick={() => submitEditComment(view.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>저장</button>
                  <button onClick={() => setEditComment(null)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>취소</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ color: C.purpleL, fontWeight: 600, fontSize: 13, marginRight: 8 }}>{c.nick}</span>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{c.text}</span>
                    {c.edited && <span style={{ fontSize: 10, color: C.muted, marginLeft: 6, opacity: 0.6 }}>(수정됨)</span>}
                    <div style={{ fontSize: 11, color: C.muted, opacity: 0.5, marginTop: 3 }}>{c.date}</div>
                  </div>
                  {user && (user.nick === c.nick || user.role === "admin") && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 12 }}>
                      <button onClick={() => setEditComment({ idx: i, text: c.text })} style={{ padding: "3px 9px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer" }}>수정</button>
                      <button onClick={() => deleteComment(view.id, i)} style={{ padding: "3px 9px", borderRadius: 6, border: "1px solid rgba(229,62,62,0.2)", background: "transparent", color: "#e53e3e", fontSize: 10, cursor: "pointer" }}>삭제</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {user ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Inp C={C} placeholder="댓글을 입력해주세요..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment(view.id)} style={{ flex: 1 }} />
            <button onClick={() => addComment(view.id)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: C.purple, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>등록</button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "14px", background: "#f5f4ff", borderRadius: 10, border: "1px solid rgba(124,106,255,0.15)" }}>
            댓글은 로그인 후 이용 가능합니다
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
        <Sidebar />
        <div style={{ flex: 1, padding: "32px 28px", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900, margin: "0 0 4px" }}>
                {CATS.find(c => c.id === cat)?.icon} {CATS.find(c => c.id === cat)?.label}
              </h2>
              <div style={{ fontSize: 12, color: C.muted }}>총 {filtered.length}개의 글</div>
            </div>
            <Btn C={C} onClick={() => { if (!user) alert("글쓰기는 로그인 후 이용 가능합니다."); else setWriting(true); }} small>
              ✏️ 글쓰기{!user && " (로그인 필요)"}
            </Btn>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: C.muted, fontSize: 14 }}>아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️</div>
          ) : filtered.map(p => (
            <div key={p.id}
              style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "16px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: C.shadow, transition: "box-shadow 0.15s,border-color 0.15s", cursor: "pointer" }}
              onClick={() => setView(p)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadowHover; e.currentTarget.style.borderColor = "rgba(124,106,255,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.borderColor = C.border; }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  {p.body && /\.(jpg|jpeg|png|gif|webp)/i.test(p.body) && <span style={{ fontSize: 10, background: "rgba(16,185,129,0.08)", color: "#059669", padding: "2px 7px", borderRadius: 99 }}>🖼 이미지</span>}
                  {p.body && /(youtube\.com|youtu\.be|\.mp4|\.mov)/i.test(p.body) && <span style={{ fontSize: 10, background: "rgba(236,72,153,0.08)", color: "#db2777", padding: "2px 7px", borderRadius: 99 }}>📹 영상</span>}
                  {p.body && /^https?:\/\//m.test(p.body) && <span style={{ fontSize: 10, background: "rgba(124,106,255,0.08)", color: C.purpleL, padding: "2px 7px", borderRadius: 99 }}>🔗 링크</span>}
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                  {p.edited && <span style={{ fontSize: 10, color: C.muted, opacity: 0.6 }}>(수정됨)</span>}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.nick} · {p.date} · 댓글 {p.comments.length}</div>
              </div>
              <div style={{ fontSize: 18, opacity: 0.2, color: C.text, flexShrink: 0, marginLeft: 12 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
