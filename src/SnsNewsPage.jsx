import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./storage";
import Footer from "./Footer.jsx";

/* ════════════════════════════════════════════════════════════
   SNS뉴스 페이지 – SNS 플랫폼 소식/트렌드/업데이트 전달
════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: "all",       label: "전체",         color: "#7c6aff" },
  { id: "platform",  label: "플랫폼 업데이트", color: "#3b82f6" },
  { id: "algorithm", label: "알고리즘",      color: "#f59e0b" },
  { id: "trend",     label: "트렌드",        color: "#10b981" },
  { id: "marketing", label: "마케팅 팁",     color: "#ec4899" },
  { id: "policy",    label: "정책 변경",     color: "#ef4444" },
];

const PLATFORM_TAGS = [
  { id: "instagram", label: "Instagram", color: "#E4405F" },
  { id: "youtube",   label: "YouTube",   color: "#FF0000" },
  { id: "tiktok",    label: "TikTok",    color: "#000000" },
  { id: "naver",     label: "Naver",     color: "#03C75A" },
  { id: "threads",   label: "Threads",   color: "#000000" },
  { id: "x",         label: "X",         color: "#1DA1F2" },
  { id: "facebook",  label: "Facebook",  color: "#1877F2" },
];

const PAGE_SIZE = 12;

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return Math.floor(diff / 60000) + "분 전";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "시간 전";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "일 전";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").slice(0, 200);
}

/* ── 뉴스 작성/수정 모달 ── */
function NewsEditorModal({ article, onSave, onClose, isDark }) {
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [category, setCategory] = useState(article?.category || "platform");
  const [platforms, setPlatforms] = useState(article?.platforms || []);
  const [thumbnail, setThumbnail] = useState(article?.thumbnail || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [pinned, setPinned] = useState(article?.pinned || false);
  const [saving, setSaving] = useState(false);

  const text = isDark ? "#fff" : "#1a1730";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bg = isDark ? "#1a1730" : "#fff";
  const ibg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f8";
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const accent = "#7c6aff";

  const togglePlatform = (id) => {
    setPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title, content, category, platforms, thumbnail, summary, pinned });
    } finally {
      setSaving(false);
    }
  };

  const inp = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 4 }}>
            {article ? "뉴스 수정" : "새 뉴스 작성"}
          </div>
          <div style={{ fontSize: 13, color: muted }}>SNS 플랫폼 소식을 작성하세요</div>
        </div>

        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 제목 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>제목</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="뉴스 제목을 입력하세요" style={inp} />
          </div>

          {/* 카테고리 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>카테고리</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${category === c.id ? c.color : bdr}`,
                    background: category === c.id ? c.color + "15" : "transparent", color: category === c.id ? c.color : muted,
                    fontSize: 12, fontWeight: category === c.id ? 700 : 400, cursor: "pointer" }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 플랫폼 태그 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>관련 플랫폼</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PLATFORM_TAGS.map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  style={{ padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${platforms.includes(p.id) ? p.color : bdr}`,
                    background: platforms.includes(p.id) ? p.color + "15" : "transparent", color: platforms.includes(p.id) ? p.color : muted,
                    fontSize: 11, fontWeight: platforms.includes(p.id) ? 700 : 400, cursor: "pointer" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 썸네일 URL */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>썸네일 URL (선택)</div>
            <input value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://..." style={inp} />
          </div>

          {/* 요약 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>요약 (미리보기용, 선택)</div>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="2~3줄 요약"
              style={{ ...inp, minHeight: 60, resize: "vertical" }} />
          </div>

          {/* 본문 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>본문</div>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="뉴스 본문을 작성하세요. 마크다운(#, ##, -, **) 지원"
              style={{ ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.8 }} />
          </div>

          {/* 고정 */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            <span style={{ fontSize: 13, color: text }}>상단 고정</span>
          </label>
        </div>

        <div style={{ padding: "16px 28px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>취소</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}
            style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "저장 중..." : article ? "수정" : "발행"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 뉴스 상세 뷰 ── */
function NewsDetail({ article, onBack, isAdmin, onEdit, onDelete, isDark }) {
  const text = isDark ? "#fff" : "#1a1730";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const catInfo = CATEGORIES.find(c => c.id === article.category) || CATEGORIES[0];

  const renderContent = (raw) => {
    return raw.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: text, margin: "20px 0 8px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 18, fontWeight: 800, color: text, margin: "26px 0 10px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 22, fontWeight: 900, color: text, margin: "30px 0 12px" }}>{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <li key={i} style={{ fontSize: 14, color: text, lineHeight: 1.9, marginLeft: 20 }}>{renderInline(line.slice(2))}</li>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} style={{ fontSize: 14, color: text, lineHeight: 1.9, margin: "4px 0" }}>{renderInline(line)}</p>;
    });
  };

  const renderInline = (t) => {
    const parts = t.split(/(\*\*.*?\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      return p;
    });
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <button onClick={onBack} style={{ marginBottom: 20, padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>
        ← 목록으로
      </button>

      {article.thumbnail && (
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24, aspectRatio: "16/9", background: "#111" }}>
          <img src={article.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {article.pinned && <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>PIN</span>}
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: catInfo.color + "15", color: catInfo.color }}>{catInfo.label}</span>
        {(article.platforms || []).map(pid => {
          const pl = PLATFORM_TAGS.find(p => p.id === pid);
          return pl ? <span key={pid} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: pl.color + "12", color: pl.color }}>{pl.label}</span> : null;
        })}
        <span style={{ fontSize: 12, color: muted }}>{formatDate(article.created_at)}</span>
        {article.views > 0 && <span style={{ fontSize: 11, color: muted }}>조회 {article.views}</span>}
      </div>

      <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: text, lineHeight: 1.4, marginBottom: 24 }}>{article.title}</h1>

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => onEdit(article)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: "#7c6aff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>수정</button>
          <button onClick={() => onDelete(article.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>삭제</button>
        </div>
      )}

      <div style={{ background: bg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "clamp(20px,4vw,36px)" }}>
        {renderContent(article.content)}
      </div>
    </div>
  );
}

/* ── 뉴스 카드 ── */
function NewsCard({ article, onClick, isDark }) {
  const text = isDark ? "#fff" : "#1a1730";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const catInfo = CATEGORIES.find(c => c.id === article.category) || CATEGORIES[0];

  return (
    <div onClick={onClick} style={{
      background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden",
      cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,255,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      {/* 썸네일 */}
      {article.thumbnail ? (
        <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#f0f0f4" }}>
          <img src={article.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ) : (
        <div style={{ aspectRatio: "16/9", background: isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"} strokeWidth="1.5">
            <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8M15 18h-5"/>
          </svg>
        </div>
      )}

      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* 태그 줄 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {article.pinned && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>PIN</span>}
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: catInfo.color + "12", color: catInfo.color }}>{catInfo.label}</span>
          {(article.platforms || []).slice(0, 2).map(pid => {
            const pl = PLATFORM_TAGS.find(p => p.id === pid);
            return pl ? <span key={pid} style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: pl.color + "10", color: pl.color }}>{pl.label}</span> : null;
          })}
        </div>

        {/* 제목 */}
        <div style={{ fontSize: 15, fontWeight: 800, color: text, lineHeight: 1.5, marginBottom: 8,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.title}
        </div>

        {/* 요약 */}
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.7, flex: 1, marginBottom: 12,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.summary || stripHtml(article.content)}
        </div>

        {/* 하단 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: muted }}>{formatDate(article.created_at)}</span>
          {article.views > 0 && <span style={{ fontSize: 11, color: muted }}>조회 {article.views}</span>}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   메인 SnsNewsPage
════════════════════════════════════════════════════════════ */
export default function SnsNewsPage({ C, user, navigate }) {
  const isDark = false; // 라이트모드 전용
  const text = C?.text || "#1a1730";
  const muted = C?.muted || "rgba(26,23,48,0.5)";
  const bdr = C?.border || "rgba(0,0,0,0.08)";
  const accent = "#7c6aff";

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // 상세보기 article
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loaderRef = useRef(null);

  const isAdmin = user?.role === "admin";

  // 기사 불러오기
  const fetchRef = useRef(0);
  const fetchArticles = useCallback(async (reset = false, pg = 0) => {
    const fetchId = ++fetchRef.current;
    setLoading(true);
    try {
      const from = reset ? 0 : pg * PAGE_SIZE;
      let q = supabase.from("sns_news").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (category !== "all") q = q.eq("category", category);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q;
      if (fetchId !== fetchRef.current) return; // stale request
      if (error) throw error;
      if (reset) {
        setArticles(data || []);
      } else {
        setArticles(prev => [...prev, ...(data || [])]);
      }
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (e) {
      if (fetchId !== fetchRef.current) return;
      setArticles(prev => prev.length === 0 ? SAMPLE_NEWS : prev);
      setHasMore(false);
    }
    if (fetchId === fetchRef.current) setLoading(false);
  }, [category, search]);

  // 카테고리/검색 변경 시 리셋
  useEffect(() => {
    setPage(0);
    setArticles([]);
    setHasMore(true);
    fetchArticles(true, 0);
  }, [category, search]);

  // 페이지 변경 시 추가 로드 (첫 페이지 제외 - 위에서 처리)
  useEffect(() => {
    if (page > 0) fetchArticles(false, page);
  }, [page]);

  // 무한 스크롤
  useEffect(() => {
    if (!loaderRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  // 조회수 증가
  const viewArticle = async (article) => {
    setSelected(article);
    window.scrollTo(0, 0);
    try {
      await supabase.from("sns_news").update({ views: (article.views || 0) + 1 }).eq("id", article.id);
    } catch {}
  };

  // 저장
  const handleSave = async (data) => {
    try {
      if (editTarget) {
        await supabase.from("sns_news").update({ ...data, updated_at: new Date().toISOString() }).eq("id", editTarget.id);
      } else {
        await supabase.from("sns_news").insert({ ...data, author_uid: user.uid, views: 0 });
      }
      setEditorOpen(false);
      setEditTarget(null);
      setPage(0);
      setArticles([]);
      fetchArticles(true);
    } catch (e) {
      alert("저장 실패: " + (e.message || "다시 시도해주세요."));
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("이 뉴스를 삭제할까요?")) return;
    try {
      await supabase.from("sns_news").delete().eq("id", id);
      setSelected(null);
      setPage(0);
      setArticles([]);
      fetchArticles(true);
    } catch {}
  };

  // 수정
  const handleEdit = (article) => {
    setEditTarget(article);
    setEditorOpen(true);
  };

  // 상세 뷰
  if (selected) {
    return (
      <div style={{ minHeight: "80vh", padding: "clamp(20px,4vw,40px) clamp(16px,3vw,28px) 60px", background: "#f8f8fb" }}>
        <NewsDetail article={selected} onBack={() => setSelected(null)} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} isDark={isDark} />
        <div style={{ maxWidth: 760, margin: "40px auto 0" }}><Footer C={C || { text:"#1a1730", muted:"rgba(26,23,48,0.5)", border:"rgba(0,0,0,0.08)", purpleL:"#6357e0", card:"#fff", footerBg:"#fafafa", toggleBg:"#f5f4ff" }} /></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "80vh", background: "#f8f8fb" }}>
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(165deg,#f5f4ff 0%,#fdf2ff 100%)", padding: "clamp(40px,6vw,80px) 24px clamp(30px,4vw,50px)", textAlign: "center", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(24px,5vw,36px)", fontWeight: 900, color: text, letterSpacing: -0.5, marginBottom: 12, lineHeight: 1.3 }}>
            SNS뉴스
          </div>
          <div style={{ fontSize: "clamp(14px,2.5vw,16px)", color: muted, lineHeight: 1.8 }}>
            SNS 플랫폼 업데이트, 알고리즘 변경, 마케팅 트렌드를 한곳에서 확인하세요
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "clamp(20px,3vw,32px) clamp(16px,3vw,24px) 60px" }}>
        {/* 필터 바 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {/* 카테고리 */}
          <div className="tab-scroll" style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setCategory(c.id); setSelected(null); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${category === c.id ? c.color : "transparent"}`,
                  background: category === c.id ? c.color + "12" : "transparent", color: category === c.id ? c.color : muted,
                  fontSize: 13, fontWeight: category === c.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {/* 검색 */}
            <div style={{ position: "relative" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
                style={{ padding: "8px 14px 8px 32px", borderRadius: 10, border: `1px solid ${bdr}`, background: "#fff", color: text, fontSize: 13, outline: "none", width: "min(180px, 40vw)" }} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            {/* 관리자: 글쓰기 */}
            {isAdmin && (
              <button onClick={() => { setEditTarget(null); setEditorOpen(true); }}
                style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                + 새 뉴스
              </button>
            )}
          </div>
        </div>

        {/* 기사 그리드 */}
        {articles.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(124,106,255,0.3)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
              <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8M15 18h-5" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>아직 등록된 소식이 없습니다</div>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>SNS 관련 소식이 등록되면 여기서 확인할 수 있어요</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 20 }} className="card-grid">
            {articles.map(a => (
              <NewsCard key={a.id} article={a} onClick={() => viewArticle(a)} isDark={isDark} />
            ))}
          </div>
        )}

        {/* 로딩 / 더보기 */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 28, height: 28, border: "3px solid rgba(124,106,255,0.15)", borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, color: muted }}>불러오는 중...</div>
          </div>
        )}
        {hasMore && !loading && <div ref={loaderRef} style={{ height: 40 }} />}
      </div>

      {/* 에디터 모달 */}
      {editorOpen && <NewsEditorModal article={editTarget} onSave={handleSave} onClose={() => { setEditorOpen(false); setEditTarget(null); }} isDark={isDark} />}

      <Footer C={C || { text:"#1a1730", muted:"rgba(26,23,48,0.5)", border:"rgba(0,0,0,0.08)", purpleL:"#6357e0", card:"#fff", footerBg:"#fafafa", toggleBg:"#f5f4ff" }} />
    </div>
  );
}

/* ── 샘플 데이터 (DB 연결 전 표시) ── */
const SAMPLE_NEWS = [
  {
    id: "sample_1", title: "인스타그램, 2026년 새 알고리즘 업데이트 발표", category: "algorithm", platforms: ["instagram"],
    summary: "인스타그램이 릴스와 피드 노출 방식을 대폭 변경합니다. 오리지널 콘텐츠와 소규모 크리에이터에게 더 많은 노출 기회를 제공하는 방향으로 알고리즘이 바뀝니다.",
    content: "## 인스타그램 2026 알고리즘 변경 요약\n\n인스타그램이 공식 블로그를 통해 알고리즘 업데이트를 발표했습니다.\n\n### 주요 변경사항\n\n- **오리지널 콘텐츠 우대**: 리포스트보다 직접 제작한 콘텐츠에 더 높은 가중치\n- **소규모 크리에이터 지원**: 팔로워 1만 미만 계정의 릴스 노출 30% 증가\n- **댓글 상호작용 강화**: 댓글 수보다 댓글 대화 깊이가 더 중요해짐\n- **해시태그 변화**: 3~5개의 관련 해시태그가 가장 효과적\n\n### 마케터가 준비해야 할 것\n\n- 리그램/리포스트 의존도를 줄이고 오리지널 콘텐츠 제작에 집중\n- 댓글 답글을 통한 소통 강화\n- 릴스 30초~90초 길이가 최적",
    thumbnail: "", created_at: new Date(Date.now() - 3600000).toISOString(), views: 342, pinned: true,
  },
  {
    id: "sample_2", title: "틱톡, 검색 광고 기능 정식 출시 - 마케터 필독", category: "platform", platforms: ["tiktok"],
    summary: "틱톡이 검색 결과 내 광고 배치를 정식으로 시작합니다. 구글/네이버 검색광고처럼 키워드 기반 광고가 가능해집니다.",
    content: "## 틱톡 검색 광고 정식 출시\n\n틱톡이 Search Ads를 정식 출시했습니다. 이제 틱톡 내 검색 결과에 광고를 노출할 수 있습니다.\n\n### 특징\n\n- **키워드 타겟팅**: 특정 검색어에 광고 노출\n- **인텐트 기반**: 구매 의도가 높은 사용자 타겟\n- **숏폼 광고 형태**: 일반 틱톡 콘텐츠와 동일한 형태\n\n### 예상 영향\n\n- 틱톡이 검색 엔진으로서의 역할 강화\n- Z세대 타겟 마케팅 채널로서 중요도 상승\n- 기존 검색 광고 대비 CPC가 낮을 것으로 예상",
    thumbnail: "", created_at: new Date(Date.now() - 86400000).toISOString(), views: 215, pinned: false,
  },
  {
    id: "sample_3", title: "유튜브 쇼츠, 3분 길이까지 확대 적용", category: "platform", platforms: ["youtube"],
    summary: "유튜브가 쇼츠 최대 길이를 60초에서 3분으로 확대합니다. 더 깊이 있는 숏폼 콘텐츠 제작이 가능해집니다.",
    content: "## 유튜브 쇼츠 3분 확대\n\n유튜브가 쇼츠 영상 최대 길이를 3분으로 확대한다고 발표했습니다.\n\n### 변경 내용\n\n- **기존**: 최대 60초\n- **변경**: 최대 3분 (180초)\n- **적용 시기**: 2026년 4월부터 순차 적용\n\n### 크리에이터에게 의미\n\n- 튜토리얼, 리뷰 등 정보성 콘텐츠에 유리\n- 기존 긴 영상을 쇼츠로 재편집하기 수월\n- 수익화 조건은 동일하게 유지",
    thumbnail: "", created_at: new Date(Date.now() - 172800000).toISOString(), views: 189, pinned: false,
  },
  {
    id: "sample_4", title: "네이버 블로그, AI 생성 콘텐츠 품질 가이드라인 발표", category: "policy", platforms: ["naver"],
    summary: "네이버가 AI로 생성된 블로그 콘텐츠에 대한 공식 품질 가이드라인을 발표했습니다. 단순 AI 생성 글은 노출 제한될 수 있습니다.",
    content: "## 네이버 블로그 AI 콘텐츠 가이드라인\n\n네이버가 AI 생성 콘텐츠에 대한 새로운 가이드라인을 공개했습니다.\n\n### 핵심 내용\n\n- **AI 보조 허용**: AI를 도구로 활용한 콘텐츠는 허용\n- **순수 AI 생성 제한**: 사람의 편집/검수 없이 AI만으로 대량 생산한 글은 노출 제한\n- **경험 기반 우대**: 실제 경험, 사진, 개인적 의견이 포함된 글 우대\n\n### SNS메이킷 사용자 가이드\n\n- AI로 초안을 생성한 후 반드시 본인의 경험과 의견을 추가하세요\n- 직접 촬영한 사진을 함께 사용하면 더 좋습니다\n- 키워드 과다 삽입은 피하세요",
    thumbnail: "", created_at: new Date(Date.now() - 259200000).toISOString(), views: 428, pinned: false,
  },
  {
    id: "sample_5", title: "2026년 상반기 SNS 마케팅 트렌드 TOP 5", category: "trend", platforms: ["instagram", "tiktok", "youtube"],
    summary: "올해 상반기 주목해야 할 SNS 마케팅 트렌드를 정리했습니다. AI 활용, 마이크로 인플루언서, 커뮤니티 기반 마케팅이 핵심입니다.",
    content: "## 2026 상반기 SNS 마케팅 트렌드\n\n### 1. AI 콘텐츠 하이브리드\n- AI로 초안 생성 + 사람이 개성 추가하는 하이브리드 방식이 대세\n- 순수 AI 콘텐츠보다 engagement 2배 이상 높음\n\n### 2. 마이크로 인플루언서 부상\n- 팔로워 1천~1만 계정의 전환율이 메가 인플루언서 대비 3배\n- 브랜드들이 소규모 다수 협업으로 전환 중\n\n### 3. 숏폼 + 검색 최적화\n- 틱톡/유튜브 쇼츠가 검색 엔진화\n- SEO 키워드를 영상 캡션에 포함하는 것이 중요\n\n### 4. 커뮤니티 기반 마케팅\n- 일방적 콘텐츠 발행보다 팬 커뮤니티 운영이 핵심\n- 인스타 방송, 스레드 대화 등 양방향 소통\n\n### 5. UGC(사용자 제작 콘텐츠) 재활용\n- 고객이 만든 콘텐츠를 브랜드 채널에 활용\n- 광고 소재로도 전환율이 높음",
    thumbnail: "", created_at: new Date(Date.now() - 432000000).toISOString(), views: 567, pinned: false,
  },
  {
    id: "sample_6", title: "스레드, 광고 베타 테스트 시작 - 초기 진입 기회", category: "marketing", platforms: ["threads"],
    summary: "메타의 스레드가 광고 베타 테스트를 시작합니다. 초기 광고주에게 유리한 조건이 예상되어 빠른 진입을 권장합니다.",
    content: "## 스레드 광고 베타 시작\n\n메타가 스레드(Threads)에서 광고 베타 테스트를 시작했습니다.\n\n### 현황\n\n- **대상**: 미국, 한국, 일본 우선 적용\n- **형태**: 인피드 텍스트/이미지 광고\n- **타겟팅**: 인스타그램 데이터 기반\n\n### 마케터에게 기회인 이유\n\n- 초기 플랫폼은 광고 단가가 낮음 (인스타 대비 60~70% 수준 예상)\n- 경쟁 광고주가 적어 노출 기회 높음\n- 텍스트 기반이라 콘텐츠 제작 비용 낮음\n\n### 준비사항\n\n- 스레드 계정 활성화 및 팔로워 확보\n- 텍스트 중심 콘텐츠 스타일 테스트\n- 인스타와 교차 홍보 전략 수립",
    thumbnail: "", created_at: new Date(Date.now() - 518400000).toISOString(), views: 156, pinned: false,
  },
];
