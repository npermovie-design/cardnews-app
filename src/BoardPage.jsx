import { useState } from "react";
import { getPosts, setPosts, CATS } from "./storage";
import { Inp, Textarea } from "./UI";

/* ── 반응형 CSS ── */
const BOARD_CSS = `
  .board-wrap { display: flex; flex-direction: column; min-height: calc(100vh - 64px); }
  .board-inner { display: flex; flex: 1; flex-direction: column; }
  .board-sidebar { display: none; }
  .board-mobile-tabs { display: block; }
  .board-content { padding: 0; flex: 1; }
  .post-table-head { display: none; }
  .post-row { flex-direction: column; gap: 4px; padding: 12px 14px; }
  .post-row-title { font-size: 14px; }
  .post-row-meta { font-size: 11px; }
  .post-row-num { display: none; }
  .post-row-views { display: none; }
  .post-row-date-short { display: inline; }
  .post-row-date-full { display: none; }
  .detail-pad { padding: 16px 14px; }
  .form-pad { padding: 16px 14px; }
  .write-btn-wrap { width: 100%; }
  .write-btn-wrap button { width: 100%; }
  .board-title-row { flex-direction: column; align-items: flex-start !important; gap: 10px; padding: 14px; }
  .pf-actions { flex-direction: column; }
  .pf-actions button { width: 100%; }
  .cmt-row { flex-direction: row; gap: 8px; }

  @media (min-width: 640px) {
    .board-inner { flex-direction: row; }
    .board-sidebar { display: flex; }
    .board-mobile-tabs { display: none; }
    .board-content { padding: 0; }
    .post-table-head { display: flex; }
    .post-row { flex-direction: row; align-items: center; gap: 0; padding: 0; }
    .post-row-num { display: block; }
    .post-row-views { display: block; }
    .post-row-date-short { display: none; }
    .post-row-date-full { display: inline; }
    .detail-pad { padding: 28px 32px; }
    .form-pad { padding: 24px 32px; }
    .write-btn-wrap { width: auto; }
    .write-btn-wrap button { width: auto; }
    .board-title-row { flex-direction: row; align-items: center !important; gap: 0; padding: 20px 24px; }
    .pf-actions { flex-direction: row; justify-content: flex-end; }
    .pf-actions button { width: auto; }
  }
`;

/* ── RichBody ── */
function RichBody({ body, C }) {
  if (!body) return null;
  const lines = body.split('\n');
  return (
    <div style={{ fontSize: 15, color: C.text, lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {lines.map((line, i) => {
        const ytMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (ytMatch) return (
          <div key={i} style={{ margin: "16px 0", borderRadius: 10, overflow: "hidden", maxWidth: "100%" }}>
            <iframe src={"https://www.youtube.com/embed/" + ytMatch[1]}
              style={{ width: "100%", height: 240, border: "none" }} allowFullScreen title="youtube" />
          </div>
        );
        if (/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(line.trim())) return (
          <div key={i} style={{ margin: "12px 0" }}>
            <img src={line.trim()} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
          </div>
        );
        if (/^https?:\/\//i.test(line.trim())) return (
          <div key={i} style={{ margin: "4px 0" }}>
            <a href={line.trim()} target="_blank" rel="noopener noreferrer"
              style={{ color: C.purpleL, textDecoration: "underline", wordBreak: "break-all" }}>{line.trim()}</a>
          </div>
        );
        return <span key={i}>{line}{i < lines.length - 1 && '\n'}</span>;
      })}
    </div>
  );
}

/* ── PostForm (글쓰기/수정) ── */
function PostForm({ user, cat, initial, onSubmit, onCancel, C }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody]   = useState(initial?.body || "");
  const catLabel = CATS.find(c => c.id === cat)?.label || cat;

  return (
    <div className="form-pad" style={{ maxWidth: 860, width: "100%", boxSizing: "border-box" }}>
      <style>{BOARD_CSS}</style>

      {/* 폼 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text, margin: 0 }}>
            {initial ? "✏️ 글 수정" : "✏️ 글쓰기"}
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{catLabel} 게시판</div>
        </div>
        <button onClick={onCancel}
          style={{ background: "none", border: "1px solid " + C.border, color: C.muted, cursor: "pointer", fontSize: 13, padding: "6px 14px", borderRadius: 8 }}>← 목록으로</button>
      </div>

      {/* 구분선 */}
      <div style={{ height: 2, background: C.text, marginBottom: 0, opacity: 0.8 }} />

      <div style={{ border: "1px solid " + C.border, borderTop: "none" }}>
        {/* 제목 입력 */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid " + C.border }}>
          <div style={{ width: 80, padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.muted, background: C.bg2, flexShrink: 0, borderRight: "1px solid " + C.border }}>제목</div>
          <input
            value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
            placeholder="제목을 입력해주세요"
            style={{ flex: 1, border: "none", outline: "none", padding: "12px 16px", fontSize: 14, background: C.card, color: C.text, fontFamily: "inherit" }}
          />
        </div>

        {/* 내용 입력 */}
        <div>
          <textarea
            value={body} onChange={e => setBody(e.target.value)} rows={16}
            placeholder="내용을 입력해주세요&#10;&#10;이미지 URL, 유튜브 링크를 입력하면 자동으로 표시됩니다."
            style={{ width: "100%", border: "none", outline: "none", padding: "16px", fontSize: 14, background: C.card, color: C.text, fontFamily: "inherit", resize: "vertical", minHeight: 320, boxSizing: "border-box", lineHeight: 1.8 }}
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="pf-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={onCancel}
          style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>취소</button>
        <button onClick={() => {
          if (!title.trim() || !body.trim()) { alert("제목과 내용을 입력해주세요."); return; }
          onSubmit({ title, body });
        }} style={{ padding: "10px 32px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>
          {initial ? "수정 완료" : "등록하기"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BoardPage — DC인사이드 스타일
════════════════════════════════════════════════════════════ */
export default function BoardPage({ user, C }) {
  const [cat, setCat]                 = useState("ai");
  const [posts, setPosts2]            = useState(getPosts);
  const [view, setView]               = useState(null);
  const [editing, setEditing]         = useState(null);
  const [writing, setWriting]         = useState(false);
  const [comment, setComment]         = useState("");
  const [editComment, setEditComment] = useState(null);
  const [page, setPage2]              = useState(1);
  const PAGE_SIZE = 20;

  const sync = (next) => { setPosts(next); setPosts2(next); };
  const filtered  = posts.filter(p => p.cat === cat);
  const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isOwner   = p => user && (user.nick === p.nick || user.role === "admin");

  const changeCat = (id) => { setCat(id); setView(null); setWriting(false); setEditing(null); setPage2(1); };

  const submitPost = (form) => {
    if (!user) { alert("글쓰기는 회원만 가능합니다."); return; }
    const newPost = { id: Date.now(), cat, nick: user.nick, userId: user.id, title: form.title, body: form.body, date: new Date().toLocaleDateString("ko-KR"), views: 0, comments: [] };
    sync([newPost, ...posts]);
    try {
      const mk = "nper_members";
      const ms = JSON.parse(localStorage.getItem(mk) || "[]");
      localStorage.setItem(mk, JSON.stringify(ms.map(m => m.id === user.id ? { ...m, points: (m.points || 0) + 10 } : m)));
    } catch {}
    setWriting(false);
    alert("글이 등록됐어요! 포인트 10P 적립 🎉");
  };

  const submitEdit = (form) => {
    const next = posts.map(p => p.id === editing.id ? { ...p, ...form, edited: true } : p);
    sync(next); setView(next.find(p => p.id === editing.id)); setEditing(null);
  };

  const deletePost = (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    sync(posts.filter(p => p.id !== id)); setView(null);
  };

  const openPost = (p) => {
    // 조회수 증가
    const next = posts.map(x => x.id === p.id ? { ...x, views: (x.views || 0) + 1 } : x);
    sync(next);
    setView({ ...p, views: (p.views || 0) + 1 });
  };

  const addComment = (postId) => {
    if (!user) { alert("댓글은 로그인 후 이용 가능합니다."); return; }
    if (!comment.trim()) return;
    const next = posts.map(p => p.id === postId
      ? { ...p, comments: [...p.comments, { id: Date.now(), nick: user.nick, text: comment, date: new Date().toLocaleDateString("ko-KR") }] }
      : p);
    sync(next); setView(next.find(p => p.id === postId)); setComment("");
  };

  const submitEditComment = (postId) => {
    if (!editComment?.text?.trim()) return;
    const next = posts.map(p => p.id === postId
      ? { ...p, comments: p.comments.map((c, i) => i === editComment.idx ? { ...c, text: editComment.text, edited: true } : c) }
      : p);
    sync(next); setView(next.find(p => p.id === postId)); setEditComment(null);
  };

  const deleteComment = (postId, idx) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    const next = posts.map(p => p.id === postId
      ? { ...p, comments: p.comments.filter((_, i) => i !== idx) }
      : p);
    sync(next); setView(next.find(p => p.id === postId));
  };

  /* ── 공통 스타일 ── */
  const borderC = C.border;
  const headBg  = C.bg2;
  const rowHover = C.cardHover;

  /* ── 카테고리 사이드바/모바일 탭 ── */
  const CatNav = () => (
    <>
      <style>{BOARD_CSS}</style>

      {/* 데스크톱 사이드바 */}
      <aside className="board-sidebar" style={{
        width: 180, flexShrink: 0,
        borderRight: "1px solid " + borderC,
        background: C.sidebarBg,
        flexDirection: "column",
        paddingTop: 8,
      }}>
        <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>게시판</div>
        {CATS.map(cc => (
          <button key={cc.id} onClick={() => changeCat(cc.id)} style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "10px 16px",
            border: "none", cursor: "pointer", fontSize: 13, fontWeight: cat === cc.id ? 700 : 500,
            background: cat === cc.id ? "rgba(124,106,255,0.1)" : "transparent",
            color: cat === cc.id ? C.purpleL : C.text,
            borderLeft: cat === cc.id ? "3px solid #7c6aff" : "3px solid transparent",
            textAlign: "left",
          }}>
            <span>{cc.icon}</span> {cc.label}
          </button>
        ))}
      </aside>

      {/* 모바일 가로 탭 */}
      <div className="board-mobile-tabs" style={{
        borderBottom: "1px solid " + borderC,
        background: C.sidebarBg,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }}>
        <div style={{ display: "flex", padding: "6px 10px", gap: 4, whiteSpace: "nowrap" }}>
          {CATS.map(cc => (
            <button key={cc.id} onClick={() => changeCat(cc.id)} style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: cat === cc.id ? "rgba(124,106,255,0.12)" : C.toggleBg,
              color: cat === cc.id ? C.purpleL : C.muted,
            }}>
              {cc.icon} {cc.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  /* ── 글쓰기 / 수정 ── */
  if (writing || editing) return (
    <div className="board-wrap">
      <CatNav />
      <div className="board-inner">
        <PostForm C={C} user={user} cat={cat}
          initial={editing || undefined}
          onSubmit={editing ? submitEdit : submitPost}
          onCancel={() => { setEditing(null); setWriting(false); }} />
      </div>
    </div>
  );

  /* ── 글 상세 ── */
  if (view) return (
    <div className="board-wrap">
      <CatNav />
      <div className="board-inner">
        <div className="detail-pad" style={{ flex: 1, maxWidth: 860, width: "100%", boxSizing: "border-box" }}>

          {/* 제목 영역 */}
          <div style={{ borderTop: "2px solid " + C.text, borderBottom: "1px solid " + borderC, marginBottom: 0 }}>
            <div style={{ padding: "16px 0 12px", borderBottom: "1px solid " + borderC }}>
              <h2 style={{ fontSize: "clamp(16px,3vw,20px)", fontWeight: 800, color: C.text, margin: "0 0 8px", lineHeight: 1.4, wordBreak: "keep-all" }}>{view.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: C.text }}>{view.nick}</span>
                <span>{view.date}</span>
                <span>조회 {view.views || 0}</span>
                <span>댓글 {(view.comments || []).length}</span>
                {view.edited && <span style={{ color: C.purpleL }}>(수정됨)</span>}
                {isOwner(view) && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={() => setEditing(view)}
                      style={{ padding: "3px 12px", borderRadius: 5, border: "1px solid " + borderC, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>수정</button>
                    <button onClick={() => deletePost(view.id)}
                      style={{ padding: "3px 12px", borderRadius: 5, border: "1px solid rgba(229,62,62,0.3)", background: "rgba(229,62,62,0.05)", color: "#e53e3e", fontSize: 11, cursor: "pointer" }}>삭제</button>
                  </div>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div style={{ padding: "20px 0 28px", minHeight: 160, borderBottom: "1px solid " + borderC }}>
              <RichBody C={C} body={view.body} />
            </div>
          </div>

          {/* 목록/이전/다음 버튼 */}
          <div style={{ display: "flex", gap: 6, padding: "12px 0", borderBottom: "1px solid " + borderC, marginBottom: 20 }}>
            <button onClick={() => setView(null)}
              style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid " + borderC, background: C.bg2, color: C.text, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              목록
            </button>
            {isOwner(view) && (
              <>
                <button onClick={() => setEditing(view)}
                  style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid " + borderC, background: C.bg2, color: C.text, fontSize: 13, cursor: "pointer" }}>수정</button>
                <button onClick={() => deletePost(view.id)}
                  style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid rgba(229,62,62,0.3)", background: "rgba(229,62,62,0.05)", color: "#e53e3e", fontSize: 13, cursor: "pointer" }}>삭제</button>
              </>
            )}
          </div>

          {/* 댓글 영역 */}
          <div style={{ border: "1px solid " + borderC }}>
            <div style={{ padding: "10px 16px", background: headBg, borderBottom: "1px solid " + borderC, fontSize: 13, fontWeight: 700, color: C.text }}>
              댓글 <span style={{ color: C.purpleL }}>{(view.comments || []).length}</span>
            </div>

            {(view.comments || []).map((c, i) => (
              <div key={c.id || i} style={{ borderBottom: "1px solid " + borderC, padding: "12px 16px" }}>
                {editComment && editComment.idx === i ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Inp C={C} value={editComment.text}
                      onChange={e => setEditComment({ ...editComment, text: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && submitEditComment(view.id)}
                      style={{ flex: 1, minWidth: 120 }} />
                    <button onClick={() => submitEditComment(view.id)}
                      style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: C.purple, color: "#fff", fontSize: 12, cursor: "pointer" }}>저장</button>
                    <button onClick={() => setEditComment(null)}
                      style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid " + borderC, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>취소</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.purpleL }}>{c.nick}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{c.date}</span>
                      {c.edited && <span style={{ fontSize: 10, color: C.muted }}>(수정됨)</span>}
                      {user && (user.nick === c.nick || user.role === "admin") && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                          <button onClick={() => setEditComment({ idx: i, text: c.text })}
                            style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid " + borderC, background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer" }}>수정</button>
                          <button onClick={() => deleteComment(view.id, i)}
                            style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(229,62,62,0.2)", background: "transparent", color: "#e53e3e", fontSize: 10, cursor: "pointer" }}>삭제</button>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, wordBreak: "break-word" }}>{c.text}</div>
                  </div>
                )}
              </div>
            ))}

            {/* 댓글 입력 */}
            {user ? (
              <div className="cmt-row" style={{ display: "flex", gap: 0, borderTop: (view.comments||[]).length === 0 ? "none" : "none" }}>
                <div style={{ padding: "10px 14px", background: headBg, borderRight: "1px solid " + borderC, fontSize: 12, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {user.nick}
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="댓글을 입력해주세요"
                  rows={3}
                  style={{ flex: 1, border: "none", outline: "none", padding: "10px 14px", fontSize: 13, background: C.card, color: C.text, fontFamily: "inherit", resize: "none", lineHeight: 1.7 }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(view.id); } }}
                />
                <button onClick={() => addComment(view.id)}
                  style={{ padding: "0 20px", border: "none", borderLeft: "1px solid " + borderC, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, minWidth: 70 }}>
                  등록
                </button>
              </div>
            ) : (
              <div style={{ padding: "14px 16px", background: headBg, fontSize: 13, color: C.muted, textAlign: "center" }}>
                댓글은 로그인 후 이용 가능합니다
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );

  /* ── 목록 ── */
  const catInfo = CATS.find(c => c.id === cat);
  return (
    <div className="board-wrap">
      <CatNav />
      <div className="board-inner">
        <div className="board-content">

          {/* 게시판 헤더 */}
          <div className="board-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid " + C.text }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text, margin: 0 }}>{catInfo?.icon} {catInfo?.label}</h2>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>총 {filtered.length}개</div>
            </div>
            <div className="write-btn-wrap">
              <button onClick={() => { if (!user) alert("글쓰기는 로그인 후 이용 가능합니다."); else setWriting(true); }}
                style={{ padding: "9px 22px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ✏️ 글쓰기
              </button>
            </div>
          </div>

          {/* 목록 테이블 헤더 (PC) */}
          <div className="post-table-head" style={{ display: "flex", background: headBg, borderBottom: "1px solid " + borderC, fontSize: 12, fontWeight: 700, color: C.muted }}>
            <div style={{ width: 56, padding: "10px 0", textAlign: "center", flexShrink: 0 }}>번호</div>
            <div style={{ flex: 1, padding: "10px 12px" }}>제목</div>
            <div style={{ width: 80, padding: "10px 0", textAlign: "center", flexShrink: 0 }}>글쓴이</div>
            <div style={{ width: 80, padding: "10px 0", textAlign: "center", flexShrink: 0 }}>날짜</div>
            <div style={{ width: 56, padding: "10px 0", textAlign: "center", flexShrink: 0 }}>조회</div>
          </div>

          {/* 게시글 없을 때 */}
          {filtered.length === 0 && (
            <div style={{ padding: "60px 0", textAlign: "center", color: C.muted, fontSize: 14, borderBottom: "1px solid " + borderC }}>
              아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️
            </div>
          )}

          {/* 게시글 목록 */}
          {paginated.map((p, idx) => {
            const num = filtered.length - ((page - 1) * PAGE_SIZE) - idx;
            return (
              <div key={p.id} className="post-row"
                style={{ display: "flex", borderBottom: "1px solid " + borderC, cursor: "pointer", transition: "background 0.1s" }}
                onClick={() => openPost(p)}
                onMouseEnter={e => e.currentTarget.style.background = rowHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                {/* 번호 (PC) */}
                <div className="post-row-num" style={{ width: 56, padding: "12px 0", textAlign: "center", fontSize: 12, color: C.muted, flexShrink: 0 }}>{num}</div>

                {/* 제목 */}
                <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
                  <div className="post-row-title" style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "calc(100vw - 160px)" }}>
                      {p.title}
                    </span>
                    {(p.comments || []).length > 0 && (
                      <span style={{ fontSize: 11, color: C.purpleL, fontWeight: 700 }}>[{p.comments.length}]</span>
                    )}
                    {p.edited && <span style={{ fontSize: 10, color: C.muted }}>(수정됨)</span>}
                  </div>
                  {/* 모바일에서만 보이는 메타 */}
                  <div className="post-row-meta" style={{ display: "flex", gap: 8, color: C.muted, marginTop: 3 }}>
                    <span>{p.nick}</span>
                    <span className="post-row-date-short">{p.date}</span>
                    <span>조회 {p.views || 0}</span>
                  </div>
                </div>

                {/* 글쓴이 (PC) */}
                <div className="post-row-views" style={{ width: 80, padding: "12px 0", textAlign: "center", fontSize: 12, color: C.muted, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{p.nick}</div>

                {/* 날짜 (PC) */}
                <div className="post-row-views" style={{ width: 80, padding: "12px 0", textAlign: "center", fontSize: 12, color: C.muted, flexShrink: 0 }}>
                  <span className="post-row-date-full">{p.date}</span>
                </div>

                {/* 조회수 (PC) */}
                <div className="post-row-views" style={{ width: 56, padding: "12px 0", textAlign: "center", fontSize: 12, color: C.muted, flexShrink: 0 }}>{p.views || 0}</div>
              </div>
            );
          })}

          {/* 하단: 글쓰기 버튼 + 페이지네이션 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", flexWrap: "wrap", gap: 10 }}>
            {/* 페이지네이션 */}
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {Array.from({ length: totalPage }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage2(p)}
                  style={{ width: 32, height: 32, borderRadius: 5, border: page === p ? "none" : "1px solid " + borderC, background: page === p ? C.purple : "transparent", color: page === p ? "#fff" : C.muted, fontSize: 13, cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>
                  {p}
                </button>
              ))}
            </div>

            <div className="write-btn-wrap">
              <button onClick={() => { if (!user) alert("글쓰기는 로그인 후 이용 가능합니다."); else setWriting(true); }}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ✏️ 글쓰기
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
