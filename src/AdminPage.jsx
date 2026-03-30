import { useState, useEffect } from "react";
import { getPosts, getMembers, saveMembers, supabase, changePoints, getPostsFromDB, deletePostFromDB } from "./storage";
import { Btn, Inp } from "./UI";

/* ── 게시판 카테고리/태그 CRUD ── */
const DEFAULT_BOARD_CATS = [
  { id:"info",label:"정보공유",icon:"📌",color:"#7c6aff" },
  { id:"qna", label:"질문답변",icon:"❓",color:"#f59e0b" },
  { id:"free",label:"자유게시판",icon:"🗣",color:"#10b981" },
  { id:"review",label:"사용후기",icon:"⭐",color:"#ec4899" },
];
async function fetchBoardCatsAdmin() {
  try {
    const { data } = await supabase.from("board_cats").select("*").order("order",{ascending:true});
    return (data&&data.length>0) ? data : DEFAULT_BOARD_CATS;
  } catch { return DEFAULT_BOARD_CATS; }
}
async function saveBoardCatAdmin(cat) { await supabase.from("board_cats").upsert(cat); }
async function deleteBoardCatAdmin(id) { await supabase.from("board_cats").delete().eq("id",id); }
async function fetchTagsByCatAdmin(catId) {
  try {
    const { data } = await supabase.from("board_tags").select("*").eq("cat_id",catId).order("order",{ascending:true});
    return data || [];
  } catch { return []; }
}
async function saveTagAdmin(catId, tag) { await supabase.from("board_tags").upsert({...tag,cat_id:catId}); }
async function deleteTagAdmin(tagId) { await supabase.from("board_tags").delete().eq("id",tagId); }

/* ── 영상자료실 Supabase 헬퍼 ── */
async function fetchVideos() {
  const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
  return (data || []).map(v => ({ ...v, key: v.id }));
}
async function saveVideo(data) {
  await supabase.from("videos").insert({ ...data, created_at: new Date().toISOString() });
}
async function editVideo(id, data) {
  await supabase.from("videos").update(data).eq("id", id);
}
async function removeVideo(id) {
  await supabase.from("videos").delete().eq("id", id);
}
function extractYtId(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return m ? m[1] : null;
}
function ytThumb(url) {
  const id = extractYtId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
function convertDriveUrl(url) {
  if (!url) return url;
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  return url;
}
function getDriveThumb(url) {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
}

const ADMIN_PW = import.meta.env.VITE_ADMIN_PW || "";
const FREE_GUEST  = 10;
const FREE_MEMBER = 20;

export default function AdminPage({ C, user: adminUser }) {
  const isAdminRole = adminUser?.role === "admin";
  const [pw, setPw]        = useState("");
  const [auth, setAuth]    = useState(isAdminRole);
  const [tab, setTab]      = useState("stats");
  const [onlineCount, setOnlineCount] = useState(0);
  // 게시판 관리 상태
  const [boardCats, setBoardCats] = useState(DEFAULT_BOARD_CATS);
  const [selBoardCat, setSelBoardCat] = useState(null);
  const [boardTags, setBoardTags] = useState([]);
  const [newCatForm, setNewCatForm] = useState({ id:"", label:"", icon:"📌", color:"#7c6aff" });
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#7c6aff");
  const [boardLoading, setBoardLoading] = useState(false);
  const [posts, setPosts2] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [members, setMembers2] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch]   = useState("");
  const [toast, setToast]     = useState("");
  const [ptInputs, setPtInputs] = useState({});
  const [aiLogs, setAiLogs] = useState([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [guestSearch, setGuestSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [dailySignups, setDailySignups] = useState([]);
  const [dailyAiUsage, setDailyAiUsage] = useState([]);

  // 최근 7일간 일별 신규 가입자 수
  const loadDailySignups = async () => {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      // join_date 우선, 없으면 created_at 폴백
      let { data } = await supabase.from("users").select("join_date,created_at").gte("join_date", since);
      if (!data || data.length === 0) {
        const res = await supabase.from("users").select("join_date,created_at").gte("created_at", since);
        data = res.data;
      }
      const counts = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        counts[d] = 0;
      }
      (data || []).forEach(r => {
        const dt = r.join_date || r.created_at;
        if (dt) {
          const d = dt.slice(0, 10);
          if (counts[d] !== undefined) counts[d]++;
        }
      });
      setDailySignups(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch { setDailySignups([]); }
  };

  // 최근 7일간 일별 AI 사용량
  const loadDailyAiUsage = async () => {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase.from("point_history").select("created_at").lt("delta", 0).gte("created_at", since);
      const counts = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        counts[d] = 0;
      }
      (data || []).forEach(r => {
        if (r.created_at) {
          const d = r.created_at.slice(0, 10);
          if (counts[d] !== undefined) counts[d]++;
        }
      });
      setDailyAiUsage(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch { setDailyAiUsage([]); }
  };

  // Supabase에서 회원 목록 로드
  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      // 정렬 없이 전체 가져오기 (join_date 컬럼 미존재 대비)
      let allMembers = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase.from("users").select("*").range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allMembers = allMembers.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      // 클라이언트에서 정렬 (join_date 우선, 없으면 created_at)
      allMembers.sort((a, b) => {
        const da = new Date(a.join_date || a.created_at || 0);
        const db = new Date(b.join_date || b.created_at || 0);
        return db - da;
      });
      setMembers2(allMembers);
    } catch(e) { console.error("회원 로드 실패:", e); showToast("회원 로드 실패: " + (e.message || e)); }
    setLoadingMembers(false);
  };

  // Firebase에서 게시글 로드
  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const list = await getPostsFromDB();
      setPosts2(list);
    } catch(e) { console.error("게시글 로드 실패:", e); }
    setLoadingPosts(false);
  };

  const loadAiLogs = async () => {
    setAiLogsLoading(true);
    try {
      const { data } = await supabase.from("point_history").select("*").order("created_at",{ascending:false}).limit(200);
      setAiLogs(data || []);
    } catch {}
    setAiLogsLoading(false);
  };

  useEffect(() => {
    if (auth) {
      loadMembers(); loadVideos(); loadPosts(); loadBoardCats(); loadAiLogs(); loadDailySignups(); loadDailyAiUsage();
      supabase.from("online_users").select("*",{count:"exact",head:true}).then(({count})=>setOnlineCount(count||0)).catch(()=>{});
    }
  }, [auth]);

  const loadBoardCats = async () => {
    setBoardLoading(true);
    try { setBoardCats(await fetchBoardCatsAdmin()); } catch(e) {}
    setBoardLoading(false);
  };
  const loadTagsForCat = async (catId) => {
    try { setBoardTags(await fetchTagsByCatAdmin(catId)); } catch(e) { setBoardTags([]); }
  };
  const handleSelectBoardCat = async (cat) => {
    setSelBoardCat(cat); setNewTagLabel(""); setNewTagColor("#7c6aff");
    await loadTagsForCat(cat.id);
  };
  const handleAddTag = async () => {
    if (!newTagLabel.trim()||!selBoardCat) return;
    setBoardLoading(true);
    try {
      const newTag = { id: Date.now().toString(), label: newTagLabel.trim(), color: newTagColor, order: boardTags.length };
      const { error } = await supabase.from("board_tags").upsert({...newTag, cat_id: selBoardCat.id});
      if (error) throw new Error(error.message);
      setNewTagLabel(""); await loadTagsForCat(selBoardCat.id);
      showToast("서브 카테고리 추가 완료!");
    } catch(e) {
      alert("저장 실패: " + e.message + "\n\nSupabase에 board_tags 테이블이 없거나 권한이 없습니다.\n아래 SQL을 실행해주세요.");
    } finally { setBoardLoading(false); }
  };
  const handleDeleteTag = async (tagId) => {
    try {
      const { error } = await supabase.from("board_tags").delete().eq("id",tagId);
      if (error) throw new Error(error.message);
      await loadTagsForCat(selBoardCat.id);
      showToast("서브 카테고리 삭제 완료");
    } catch(e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // 영상 목록 로드
  const [videos, setVideos]       = useState([]);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidForm, setVidForm]     = useState({ title:"", videoUrl:"", downloadUrl:"", thumbnail:"", description:"", category:"synth", isFree:true });
  const [vidEdit, setVidEdit]     = useState(null); // 수정 중인 영상 key
  const [vidFormOpen, setVidFormOpen] = useState(false);

  const loadVideos = async () => {
    setVidLoading(true);
    try { setVideos(await fetchVideos()); } catch(e) {}
    setVidLoading(false);
  };

  const resetVidForm = () => setVidForm({ title:"", videoUrl:"", downloadUrl:"", thumbnail:"", description:"", category:"synth", isFree:true });

  const submitVideo = async () => {
    if (!vidForm.title.trim() || !vidForm.videoUrl.trim()) { alert("제목과 영상 URL은 필수입니다."); return; }
    const finalForm = { ...vidForm };
    if (finalForm.videoUrl.includes("drive.google.com") && !finalForm.videoUrl.includes("/preview")) {
      finalForm.videoUrl = convertDriveUrl(finalForm.videoUrl);
    }
    if (!finalForm.thumbnail) {
      finalForm.thumbnail = ytThumb(finalForm.videoUrl) || getDriveThumb(finalForm.videoUrl) || "";
    }
    try {
      if (vidEdit) {
        await editVideo(vidEdit, finalForm);
        showToast("영상 수정 완료!");
      } else {
        await saveVideo(finalForm);
        showToast("영상 등록 완료! 🎬");
      }
      resetVidForm(); setVidEdit(null); setVidFormOpen(false);
      loadVideos();
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const deleteVideo = async (key, title) => {
    if (!window.confirm(`"${title}" 영상을 삭제할까요?`)) return;
    try { await removeVideo(key); showToast("영상 삭제 완료"); loadVideos(); }
    catch(e) { alert("삭제 실패: " + e.message); }
  };

  const startEditVideo = (v) => {
    setVidForm({ title: v.title||"", videoUrl: v.videoUrl||"", downloadUrl: v.downloadUrl||"", thumbnail: v.thumbnail||"", description: v.description||"", category: v.category||"synth", isFree: v.isFree !== false });
    setVidEdit(v.key);
    setVidFormOpen(true);
  };

  const isDark = C.bg?.includes("0a") || C.bg?.includes("#10") || C.bg?.includes("242");
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "#fff";

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── 포인트 지급 (Supabase)
  const grantPoints = async (uid, pts) => {
    if (!pts || isNaN(pts)) { showToast("포인트를 입력하세요"); return; }
    try {
      const member = members.find(m => m.uid === uid);
      const next = (member?.points || 0) + Number(pts);
      await supabase.from("users").update({ points: next }).eq("uid", uid);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: next } : m));
      showToast("+" + pts + "P 지급 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 포인트 초기화 (Supabase)
  const resetPoints = async (uid) => {
    if (!window.confirm("이 회원의 포인트를 0으로 초기화할까요?")) return;
    try {
      await supabase.from("users").update({ points: 0 }).eq("uid", uid);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: 0 } : m));
      showToast("포인트 초기화 완료");
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 포인트 직접 설정 (Supabase)
  const setPoints = async (uid, pts) => {
    if (!pts || isNaN(pts)) return;
    try {
      await supabase.from("users").update({ points: Number(pts) }).eq("uid", uid);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: Number(pts) } : m));
      showToast(pts + "P 설정 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 회원 탈퇴 (Supabase)
  const deleteMember = async (uid, nick) => {
    if (!window.confirm(`"${nick}" 회원을 탈퇴 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await supabase.from("users").delete().eq("uid", uid);
      setMembers2(prev => prev.filter(m => m.uid !== uid));
      showToast(`"${nick}" 회원 탈퇴 처리 완료`);
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── AI 사용 초기화
  const resetMemberUsage = (id) => {
    try {
      const usage = JSON.parse(localStorage.getItem("nper_ai_usage") || "{}");
      delete usage["member_" + id];
      localStorage.setItem("nper_ai_usage", JSON.stringify(usage));
      showToast("AI 사용 횟수 초기화 완료");
    } catch(e) {}
  };

  // ── 게시글 삭제 (Supabase)
  const deletePost = async (id) => {
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    try {
      await deletePostFromDB(id);
      setPosts2(prev => prev.filter(p => p.id !== id));
      showToast("게시글 삭제 완료");
    } catch(e) { showToast("삭제 실패: " + e.message); }
  };

  // ── 비회원 사용 관리
  const getGuestUsage = () => {
    try {
      const u = JSON.parse(localStorage.getItem("nper_ai_usage") || "{}");
      return Object.entries(u).filter(([k]) => k === "guest");
    } catch { return []; }
  };
  const resetGuestUsage = () => {
    try {
      const u = JSON.parse(localStorage.getItem("nper_ai_usage") || "{}");
      delete u["guest"];
      localStorage.setItem("nper_ai_usage", JSON.stringify(u));
      showToast("비회원 사용 횟수 초기화 완료 (5회 재지급)");
    } catch(e) {}
  };
  const getAllUsage = () => {
    try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch { return {}; }
  };

  // 관리자 인증: role='admin' 필수 + 비밀번호 이중 체크 (role='admin'이면 비밀번호 스킵)
  if (!auth) {
    // role이 admin이 아닌 경우 접근 완전 차단
    if (!isAdminRole) return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", boxShadow: C.shadow, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900, marginBottom: 8 }}>접근 권한 없음</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>관리자 권한이 있는 계정으로 로그인해 주세요.</p>
        </div>
      </div>
    );
    // role='admin'인데 auth가 false인 경우 (비밀번호 이중 인증)
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", boxShadow: C.shadow }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900 }}>관리자 로그인</h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>관리자 비밀번호를 입력해 주세요.</p>
          </div>
          <Inp C={C} type="password" placeholder="관리자 비밀번호" value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && ADMIN_PW && pw === ADMIN_PW) setAuth(true); }}
            style={{ marginBottom: 12 }} />
          <Btn C={C} onClick={() => { if (ADMIN_PW && pw === ADMIN_PW) setAuth(true); else alert("비밀번호가 틀렸습니다."); }} full>확인</Btn>
        </div>
      </div>
    );
  }

  const filteredMembers = search.trim()
    ? members.filter(m => (m.nick||"").toLowerCase().includes(search.toLowerCase()) || (m.email||"").toLowerCase().includes(search.toLowerCase()))
    : members;

  const usage = getAllUsage();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      {/* 토스트 */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#22c55e", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "fadein 0.2s" }}>
          ✅ {toast}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: 0 }}>⚙️ 관리자 페이지</h2>
        <span style={{ fontSize: 12, color: C.muted, background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6", padding: "4px 12px", borderRadius: 20 }}>회원 {loadingMembers ? "로딩중..." : members.length + "명"} · 게시글 {posts.length}개</span>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 24, background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderRadius: 12, padding: 4 }}>
        {[["stats","📊 통계"], ["members","👥 회원 관리"], ["guest","🌐 비회원 관리"], ["posts","📋 게시글 관리"], ["board","📂 게시판 관리"], ["inquiries","📩 문의 관리"], ["videos","🎬 영상 관리"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
            background: tab === t ? C.card : "transparent",
            color: tab === t ? C.purpleL : C.muted,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ─────────────── 통계 대시보드 ─────────────── */}
      {tab === "stats" && (() => {
        const totalMembers = members.length;
        const totalPosts = posts.length;
        const totalViews = posts.reduce((s,p) => s + (p.views||0), 0);
        const totalLikes = posts.reduce((s,p) => s + (p.likes||0), 0);
        const totalComments = posts.reduce((s,p) => s + (p.comments||[]).length, 0);
        const todayStr = new Date().toISOString().slice(0,10);
        const todayPosts = posts.filter(p => {
          const d = typeof p.date === "string" ? p.date : "";
          return d.includes(todayStr) || d.includes(new Date().toLocaleDateString("ko-KR"));
        }).length;
        const recentMembers = members.filter(m => {
          const d = m.join_date || m.created_at;
          if (!d) return false;
          return Date.now() - new Date(d).getTime() < 7*86400000;
        }).length;
        const catStats = {};
        posts.forEach(p => { const c = p.subCat||p.cat||"기타"; catStats[c] = (catStats[c]||0)+1; });
        const topPosters = {};
        posts.forEach(p => { if(p.nick) topPosters[p.nick] = (topPosters[p.nick]||0)+1; });
        const topList = Object.entries(topPosters).sort((a,b)=>b[1]-a[1]).slice(0,10);
        const popularPosts = [...posts].sort((a,b) => (b.views||0)-(a.views||0)).slice(0,10);

        const cardStyle = { padding:"20px", borderRadius:14, background:isDark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${isDark?"rgba(255,255,255,0.08)":"#e5e7eb"}`, flex:1, minWidth:140 };
        const numStyle = { fontSize:28, fontWeight:900, color:C.purpleL||"#7c6aff", marginBottom:4 };
        const labelStyle = { fontSize:12, color:C.muted, fontWeight:600 };

        return (
        <div>
          {/* 요약 카드 */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
            {[
              { n: totalMembers, l: "전체 회원", icon: "👥", color: "#7c6aff" },
              { n: recentMembers, l: "이번주 신규", icon: "🆕", color: "#22c55e" },
              { n: onlineCount||0, l: "실시간 접속", icon: "🟢", color: "#f59e0b" },
              { n: totalPosts, l: "전체 게시글", icon: "📋", color: "#8b5cf6" },
              { n: todayPosts, l: "오늘 게시글", icon: "📝", color: "#ec4899" },
              { n: totalViews.toLocaleString(), l: "총 조회수", icon: "👁", color: "#06b6d4" },
              { n: totalLikes, l: "총 좋아요", icon: "👍", color: "#f59e0b" },
              { n: totalComments, l: "총 댓글", icon: "💬", color: "#10b981" },
            ].map((s,i) => (
              <div key={i} style={cardStyle}>
                <div style={{ fontSize:20, marginBottom:8 }}>{s.icon}</div>
                <div style={{ ...numStyle, color: s.color }}>{s.n}</div>
                <div style={labelStyle}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* 카테고리별 게시글 */}
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
            <div style={{ ...cardStyle, minWidth:280 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>📂 카테고리별 게시글</div>
              {Object.entries(catStats).sort((a,b)=>b[1]-a[1]).map(([cat,cnt]) => (
                <div key={cat} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text, minWidth:80 }}>{cat}</span>
                  <div style={{ flex:1, height:8, borderRadius:4, background:isDark?"rgba(255,255,255,0.06)":"#f0f0f0", overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#7c6aff,#8b5cf6)", width:`${Math.max(3,(cnt/Math.max(...Object.values(catStats)))*100)}%` }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:C.purpleL||"#7c6aff", minWidth:30, textAlign:"right" }}>{cnt}</span>
                </div>
              ))}
            </div>

            {/* 활발한 작성자 TOP10 */}
            <div style={{ ...cardStyle, minWidth:280 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>🏆 활발한 작성자 TOP10</div>
              {topList.map(([nick,cnt],i) => (
                <div key={nick} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:900, color:i<3?"#f59e0b":C.muted, minWidth:20 }}>{i+1}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text, flex:1 }}>{nick}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:C.purpleL||"#7c6aff" }}>{cnt}건</span>
                </div>
              ))}
            </div>
          </div>

          {/* 인기 게시글 TOP10 */}
          <div style={cardStyle}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>🔥 인기 게시글 TOP10 (조회수)</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}` }}>
                    <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:600 }}>#</th>
                    <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:600 }}>제목</th>
                    <th style={{ padding:"8px 10px", textAlign:"right", color:C.muted, fontWeight:600 }}>조회</th>
                    <th style={{ padding:"8px 10px", textAlign:"right", color:C.muted, fontWeight:600 }}>좋아요</th>
                    <th style={{ padding:"8px 10px", textAlign:"right", color:C.muted, fontWeight:600 }}>댓글</th>
                    <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:600 }}>작성자</th>
                  </tr>
                </thead>
                <tbody>
                  {popularPosts.map((p,i) => (
                    <tr key={p.id} style={{ borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"#f3f4f6"}` }}>
                      <td style={{ padding:"8px 10px", fontWeight:700, color:i<3?"#f59e0b":C.muted }}>{i+1}</td>
                      <td style={{ padding:"8px 10px", fontWeight:600, color:C.text, maxWidth:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color:"#06b6d4" }}>{(p.views||0).toLocaleString()}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color:"#f59e0b" }}>{p.likes||0}</td>
                      <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color:"#8b5cf6" }}>{(p.comments||[]).length}</td>
                      <td style={{ padding:"8px 10px", color:C.muted }}>{p.nick}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 검색엔진 노출 안내 */}
          <div style={{ marginTop:24, padding:"18px 22px", borderRadius:14, background:isDark?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.03)", border:`1px solid ${isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.1)"}` }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:10 }}>🔍 검색엔진 노출 현황</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
              <b style={{color:C.text}}>Google Search Console</b> → <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:"#7c6aff"}}>바로가기</a> (snsmakeit.com 등록 필요)<br/>
              <b style={{color:C.text}}>Naver Search Advisor</b> → <a href="https://searchadvisor.naver.com" target="_blank" rel="noopener noreferrer" style={{color:"#7c6aff"}}>바로가기</a> (네이버 검색 노출)<br/>
              <b style={{color:C.text}}>Bing Webmaster</b> → <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" style={{color:"#7c6aff"}}>바로가기</a> (해외 Bing 검색)<br/>
              <b style={{color:C.text}}>Google Analytics</b> → <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{color:"#7c6aff"}}>바로가기</a> (실시간 트래픽, 유입 경로, 페이지뷰)<br/>
              <br/>
              <span style={{color:"#f59e0b",fontWeight:700}}>💡 추천:</span> Google Analytics를 연동하면 실시간 방문자, 페이지뷰, 유입 검색어, 검색엔진별 트래픽을 모두 확인할 수 있습니다.
              GA4 추적 코드를 <code style={{background:isDark?"rgba(255,255,255,0.1)":"#f0f0f6",padding:"1px 6px",borderRadius:4}}>index.html</code>에 추가하면 됩니다.
            </div>
          </div>
          {/* 기간별 추이 차트 */}
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginTop:24, marginBottom:24 }}>
            {/* 최근 7일 신규 가입자 */}
            <div style={{ ...cardStyle, minWidth:280, flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>📈 최근 7일 신규 가입자</div>
              {dailySignups.length === 0 ? (
                <div style={{ color:C.muted, fontSize:12 }}>데이터 없음</div>
              ) : (() => {
                const maxVal = Math.max(...dailySignups.map(d => d.count), 1);
                return (
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                    {dailySignups.map(d => (
                      <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.purpleL||"#7c6aff" }}>{d.count}</span>
                        <div style={{ width:"100%", maxWidth:40, borderRadius:"6px 6px 0 0", background:"linear-gradient(180deg,#7c6aff,#8b5cf6)", height:`${Math.max((d.count/maxVal)*80, 4)}px`, transition:"height 0.3s" }}/>
                        <span style={{ fontSize:9, color:C.muted, whiteSpace:"nowrap" }}>{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* 최근 7일 AI 사용량 */}
            <div style={{ ...cardStyle, minWidth:280, flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:14 }}>🤖 최근 7일 AI 사용량</div>
              {dailyAiUsage.length === 0 ? (
                <div style={{ color:C.muted, fontSize:12 }}>데이터 없음</div>
              ) : (() => {
                const maxVal = Math.max(...dailyAiUsage.map(d => d.count), 1);
                return (
                  <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                    {dailyAiUsage.map(d => (
                      <div key={d.date} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#f59e0b" }}>{d.count}</span>
                        <div style={{ width:"100%", maxWidth:40, borderRadius:"6px 6px 0 0", background:"linear-gradient(180deg,#f59e0b,#f97316)", height:`${Math.max((d.count/maxVal)*80, 4)}px`, transition:"height 0.3s" }}/>
                        <span style={{ fontSize:9, color:C.muted, whiteSpace:"nowrap" }}>{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* AI 설정 현황 */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
            {[
              { label: "비회원 무료 횟수", value: FREE_GUEST + "회", color: "#4ade80" },
              { label: "회원 무료 횟수",   value: FREE_MEMBER + "회", color: "#a5b4fc" },
              { label: "AI 1회 비용",      value: "10P", color: "#f59e0b" },
              { label: "글쓰기 적립",      value: "1P", color: "#34d399" },
            ].map(r => (
              <div key={r.label} style={{ padding:"18px 20px", borderRadius:14, background:isDark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${isDark?"rgba(255,255,255,0.08)":"#e5e7eb"}` }}>
                <div style={{ fontSize:22, fontWeight:900, color:r.color, marginBottom:4 }}>{r.value}</div>
                <div style={{ fontSize:12, color:C.muted }}>{r.label}</div>
              </div>
            ))}
          </div>

          {/* AI 사용 로그 */}
          <div style={{ ...cardStyle }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text }}>🤖 AI 사용 로그 (최근 200건)</div>
              <button onClick={loadAiLogs} disabled={aiLogsLoading}
                style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:"transparent", color:C.muted, fontSize:11, cursor:"pointer" }}>
                {aiLogsLoading?"로딩중...":"🔄 새로고침"}
              </button>
            </div>
            {aiLogs.length === 0 ? (
              <div style={{ textAlign:"center", padding:20, color:C.muted, fontSize:13 }}>
                {aiLogsLoading ? "로딩중..." : "아직 사용 기록이 없습니다. (point_history 테이블 필요)"}
              </div>
            ) : (
              <>
                {/* AI 기능별 사용 통계 */}
                {(() => {
                  const aiOnly = aiLogs.filter(l => l.delta < 0);
                  const byReason = {};
                  aiOnly.forEach(l => {
                    const r = l.reason || "기타";
                    byReason[r] = (byReason[r]||0) + 1;
                  });
                  const byUser = {};
                  aiOnly.forEach(l => {
                    const u = l.uid || "unknown";
                    byUser[u] = (byUser[u]||0) + 1;
                  });
                  const topUsers = Object.entries(byUser).sort((a,b)=>b[1]-a[1]).slice(0,5);
                  const nick = uid => members.find(m=>m.uid===uid)?.nick || uid?.slice(0,8) || "?";
                  return (
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:16 }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:8 }}>기능별 사용 횟수</div>
                        {Object.entries(byReason).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([r,c]) => (
                          <div key={r} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:11, color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#7c6aff" }}>{c}회</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:8 }}>사용자별 TOP5</div>
                        {topUsers.map(([uid,c],i) => (
                          <div key={uid} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:12, fontWeight:900, color:i<3?"#f59e0b":C.muted, minWidth:16 }}>{i+1}</span>
                            <span style={{ fontSize:11, color:C.text, flex:1 }}>{nick(uid)}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#7c6aff" }}>{c}회</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* 최근 로그 테이블 */}
                <div style={{ overflowX:"auto", maxHeight:300, overflowY:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, position:"sticky", top:0, background:isDark?"#1a1730":"#fff" }}>
                        <th style={{ padding:"6px 8px", textAlign:"left", color:C.muted, fontWeight:600 }}>사용자</th>
                        <th style={{ padding:"6px 8px", textAlign:"left", color:C.muted, fontWeight:600 }}>기능</th>
                        <th style={{ padding:"6px 8px", textAlign:"right", color:C.muted, fontWeight:600 }}>포인트</th>
                        <th style={{ padding:"6px 8px", textAlign:"right", color:C.muted, fontWeight:600 }}>잔여</th>
                        <th style={{ padding:"6px 8px", textAlign:"left", color:C.muted, fontWeight:600 }}>일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiLogs.slice(0,50).map((l,i) => {
                        const nick = members.find(m=>m.uid===l.uid)?.nick || l.uid?.slice(0,8) || "?";
                        return (
                          <tr key={i} style={{ borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.04)":"#f3f4f6"}` }}>
                            <td style={{ padding:"6px 8px", fontWeight:600, color:C.text }}>{nick}</td>
                            <td style={{ padding:"6px 8px", color:C.muted }}>{l.reason||"-"}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:700, color:l.delta>0?"#22c55e":"#ef4444" }}>{l.delta>0?"+":""}{l.delta}P</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", color:C.text }}>{l.balance?.toLocaleString()||"-"}P</td>
                            <td style={{ padding:"6px 8px", color:C.muted, fontSize:10 }}>{l.created_at ? new Date(l.created_at).toLocaleString("ko-KR") : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {/* ─────────────── 회원 관리 ─────────────── */}
      {tab === "members" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, color: C.muted }}>총 <b style={{ color: C.text }}>{members.length}명</b>의 회원</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="닉네임 / 이메일 검색..."
              style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid " + bdr, background: inputBg, color: C.text, fontSize: 13, outline: "none", width: 220 }} />
          </div>

          {loadingMembers && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>⏳ 회원 목록 불러오는 중...</div>}
          {!loadingMembers && filteredMembers.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
              {search ? "검색 결과가 없어요" : "가입한 회원이 없어요"}
            </div>
          )}
          {!loadingMembers && filteredMembers.map(m => {
            const uid = m.uid || m.id || "";
            const mUsed = usage["member_" + uid] || 0;
            const ptVal = ptInputs[uid] || "";
            return (
              <div key={m.uid||m.id} style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 14, padding: "18px 20px", marginBottom: 10, boxShadow: C.shadow }}>
                {/* 회원 기본 정보 */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {(m.nick||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{m.nick}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700,
                          background: m.role === "admin" ? "rgba(251,191,36,0.12)" : "rgba(99,102,241,0.1)",
                          color: m.role === "admin" ? "#fbbf24" : C.purpleL }}>
                          {m.role === "admin" ? "👑 관리자" : "일반회원"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>{m.email}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        가입 {(m.join_date || m.created_at) ? new Date(m.join_date || m.created_at).toLocaleDateString("ko-KR") : "-"} · AI 사용 {mUsed}회
                      </div>
                    </div>
                  </div>
                  {/* 포인트 뱃지 */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.purpleL }}>💎 {(m.points||0).toLocaleString()}P</div>
                    <div style={{ fontSize: 11, color: C.muted }}>보유 포인트</div>
                  </div>
                </div>

                {/* 포인트 관리 */}
                <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9fb", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>💎 포인트 관리</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {/* 빠른 지급 버튼 */}
                    {[50, 100, 200, 500, 1000].map(pts => (
                      <button key={pts} onClick={() => grantPoints(uid, pts)} style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 700,
                        border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: C.purpleL }}>
                        +{pts}P
                      </button>
                    ))}
                    {/* 직접 입력 지급 */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={ptVal} type="number" placeholder="직접 입력"
                        onChange={e => setPtInputs(p => ({ ...p, [uid]: e.target.value }))}
                        style={{ width: 90, padding: "6px 10px", borderRadius: 8, border: "1px solid " + bdr, background: inputBg, color: C.text, fontSize: 12, outline: "none" }} />
                      <button onClick={() => grantPoints(uid, ptVal)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: C.purpleL, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>지급</button>
                      <button onClick={() => setPoints(uid, ptVal)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}>설정</button>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => resetPoints(uid)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.06)", color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    🔄 포인트 초기화
                  </button>
                  <button onClick={() => resetMemberUsage(uid)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)", color: C.purpleL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    🔄 AI 횟수 초기화
                  </button>
                  {m.role !== "admin" && (
                    <button onClick={() => deleteMember(uid, m.nick)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      🗑 회원 탈퇴
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────── 비회원 관리 ─────────────── */}
      {tab === "guest" && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>🌐 비회원 관리</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.8 }}>
            비회원은 브라우저의 localStorage에 사용 기록이 저장됩니다.<br/>
            특정 비회원의 사용 횟수를 초기화하면 다시 5회 무료 이용이 가능합니다.
          </div>

          {/* 현재 비회원 사용 현황 */}
          <div style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>현재 사용 현황</div>
            {(() => {
              const u = getAllUsage();
              const guestUsed = u["guest"] || 0;
              const memberEntries = Object.entries(u).filter(([k]) => k.startsWith("member_"));
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid " + bdr }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>👤 비회원</div>
                      <div style={{ fontSize: 12, color: C.muted }}>이 브라우저의 비회원 사용 기록</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: guestUsed >= FREE_GUEST ? "#ef4444" : C.purpleL }}>{guestUsed}/{FREE_GUEST}회 사용</span>
                      <button onClick={resetGuestUsage} style={{ padding: "7px 16px", borderRadius: 9, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        🔄 초기화 (5회 재지급)
                      </button>
                    </div>
                  </div>
                  {memberEntries.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>회원 사용 기록</div>
                      {memberEntries.map(([k, v]) => {
                        const uid = k.replace("member_", "");
                        const mem = members.find(m => m.id === uid || m.uid === uid);
                        return (
                          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid " + bdr, fontSize: 13 }}>
                            <div>
                              <span style={{ fontWeight: 600, color: C.text }}>{mem ? mem.nick : uid}</span>
                              {mem && <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{mem.email}</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ color: v >= FREE_MEMBER ? "#ef4444" : C.muted }}>{v}/{FREE_MEMBER}회</span>
                              <button onClick={() => {
                                const u2 = getAllUsage(); delete u2[k];
                                localStorage.setItem("nper_ai_usage", JSON.stringify(u2));
                                showToast("초기화 완료");
                              }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>초기화</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 전체 초기화 */}
          <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>⚠️ 전체 사용 기록 초기화</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>모든 비회원 및 회원의 AI 사용 횟수를 초기화합니다.</div>
            <button onClick={() => {
              if (!window.confirm("모든 사용자의 AI 횟수를 초기화하시겠습니까?")) return;
              localStorage.removeItem("nper_ai_usage");
              showToast("전체 초기화 완료");
            }} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🗑 전체 초기화
            </button>
          </div>
        </div>
      )}

      {/* ─────────────── 게시글 관리 ─────────────── */}
      {tab === "posts" && (() => {
        const filteredPosts = postSearch.trim()
          ? posts.filter(p => (p.title||"").toLowerCase().includes(postSearch.toLowerCase()))
          : posts;
        return (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize: 13, color: C.muted }}>총 <b style={{ color: C.text }}>{posts.length}개</b>의 게시글{postSearch.trim() ? ` (검색결과 ${filteredPosts.length}개)` : ""}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={postSearch} onChange={e => setPostSearch(e.target.value)} placeholder="제목 검색..."
                style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid " + bdr, background: inputBg, color: C.text, fontSize: 13, outline: "none", width: 200 }} />
              <button onClick={loadPosts} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer" }}>🔄 새로고침</button>
            </div>
          </div>
          {loadingPosts && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>⏳ 게시글 불러오는 중...</div>}
          {!loadingPosts && filteredPosts.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>{postSearch.trim() ? "검색 결과가 없어요" : "게시글이 없어요"}</div>}
          {!loadingPosts && filteredPosts.map(p => (
            <div key={p.id} style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: C.shadow }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p.nick} · {p.date} · 조회 {p.views||0} · 추천 {p.likes||0}</div>
              </div>
              <button onClick={() => deletePost(p.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>삭제</button>
            </div>
          ))}
        </div>
        );
      })()}

      {/* ─────────────── 게시판 관리 ─────────────── */}
      {tab === "board" && (
        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* 왼쪽: 카테고리 목록 */}
          <div style={{ flex:"1 1 280px", background:C.card, border:"1px solid "+bdr, borderRadius:16, padding:"20px" }}>
            <div style={{ fontSize:15, fontWeight:900, color:C.text, marginBottom:4 }}>메인 카테고리</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:16 }}>카테고리를 선택하면 서브 카테고리를 관리할 수 있어요</div>
            {boardLoading && <div style={{ color:C.muted, fontSize:13 }}>불러오는 중...</div>}
            {boardCats.map(cat => (
              <div key={cat.id} onClick={()=>handleSelectBoardCat(cat)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, border:`2px solid ${selBoardCat?.id===cat.id?cat.color:bdr}`, background:selBoardCat?.id===cat.id?cat.color+"15":"transparent", cursor:"pointer", marginBottom:8, transition:"all 0.15s" }}>
                <span style={{ fontSize:20 }}>{cat.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{cat.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>ID: {cat.id}</div>
                </div>
                <div style={{ width:14, height:14, borderRadius:"50%", background:cat.color, flexShrink:0 }}/>
              </div>
            ))}
          </div>

          {/* 오른쪽: 서브 카테고리 관리 */}
          <div style={{ flex:"1 1 320px", background:C.card, border:"1px solid "+bdr, borderRadius:16, padding:"20px" }}>
            {!selBoardCat ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                <div style={{ fontSize:32, marginBottom:8 }}>👈</div>
                <div style={{ fontSize:14 }}>왼쪽에서 카테고리를 선택하세요</div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                  <span style={{ fontSize:22 }}>{selBoardCat.icon}</span>
                  <div>
                    <div style={{ fontSize:15, fontWeight:900, color:C.text }}>{selBoardCat.label}</div>
                    <div style={{ fontSize:11, color:C.muted }}>서브 카테고리 {boardTags.length}개</div>
                  </div>
                </div>

                {/* 기존 태그 목록 */}
                {boardTags.length === 0 ? (
                  <div style={{ padding:"16px", borderRadius:10, background:isDark?"rgba(255,255,255,0.03)":"#f9fafb", textAlign:"center", color:C.muted, fontSize:12, marginBottom:16 }}>
                    서브 카테고리가 없어요. 아래에서 추가하세요.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                    {boardTags.map(tag => (
                      <div key={tag.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, background:tag.color+"20", border:`1px solid ${tag.color}50` }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:tag.color }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:isDark?C.text:"#333" }}>{tag.label}</span>
                        <button onClick={()=>handleDeleteTag(tag.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(239,68,68,0.7)", fontSize:14, lineHeight:1, padding:"0 2px" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 태그 추가 */}
                <div style={{ borderTop:"1px solid "+bdr, paddingTop:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:10 }}>새 서브 카테고리 추가</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                    <input value={newTagLabel} onChange={e=>setNewTagLabel(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") handleAddTag(); }}
                      placeholder="예: AI, 마케팅, 디자인..."
                      style={{ flex:1, padding:"9px 12px", borderRadius:9, border:"1px solid "+bdr, background:inputBg, color:C.text, fontSize:13, outline:"none" }}/>
                    <input type="color" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)}
                      style={{ width:36, height:36, borderRadius:8, border:"1px solid "+bdr, cursor:"pointer", padding:2 }}/>
                  </div>
                  {newTagLabel.trim() && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>미리보기</div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:newTagColor+"20", border:`1px solid ${newTagColor}50` }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:newTagColor }}/>
                        <span style={{ fontSize:13,fontWeight:600,color:isDark?C.text:"#333" }}>{newTagLabel}</span>
                      </div>
                    </div>
                  )}
                  <button onClick={handleAddTag} disabled={!newTagLabel.trim()}
                    style={{ width:"100%", padding:"11px", borderRadius:10, border:"none", cursor:newTagLabel.trim()?"pointer":"not-allowed", background:newTagLabel.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":"rgba(99,102,241,0.3)", color:"#fff", fontSize:13, fontWeight:800, opacity:newTagLabel.trim()?1:0.6 }}>
                    + 서브 카테고리 추가
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────── 영상 관리 ─────────────── */}
      {tab === "videos" && (
        <div>
          {/* 헤더 + 추가 버튼 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:14, color:C.muted }}>총 <b style={{ color:C.text }}>{videos.length}개</b>의 영상</div>
            <button onClick={() => { resetVidForm(); setVidEdit(null); setVidFormOpen(p=>!p); }}
              style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {vidFormOpen && !vidEdit ? "✕ 닫기" : "+ 영상 추가"}
            </button>
          </div>

          {/* 등록/수정 폼 */}
          {vidFormOpen && (
            <div style={{ background:isDark?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.03)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:16 }}>{vidEdit ? "✏️ 영상 수정" : "➕ 새 영상 등록"}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
                {[
                  { label:"제목 *", key:"title", placeholder:"영상 제목" },
                  { label:"영상 URL * (유튜브 or 구글드라이브)", key:"videoUrl", placeholder:"https://drive.google.com/file/d/... 또는 https://youtu.be/..." },
                  { label:"다운로드 URL (선택)", key:"downloadUrl", placeholder:"https://drive.google.com/..." },
                  { label:"썸네일 URL (선택·자동)", key:"thumbnail", placeholder:"비워두면 자동 적용" },
                  { label:"설명 (선택)", key:"description", placeholder:"영상 설명" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:4 }}>{f.label}</div>
                    <input value={vidForm[f.key]} onChange={e => setVidForm(p=>({...p,[f.key]:e.target.value}))}
                      placeholder={f.placeholder}
                      style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid "+bdr, background:inputBg, color:C.text, fontSize:13, outline:"none", boxSizing:"border-box" }} />
                    {f.key==="videoUrl" && vidForm.videoUrl && (
                      <div style={{ fontSize:11, marginTop:4, color: extractYtId(vidForm.videoUrl)?"#4ade80":vidForm.videoUrl.includes("drive")?"#60a5fa":"#a3a3a3", fontWeight:600 }}>
                        {extractYtId(vidForm.videoUrl) ? "✅ 유튜브 인식" : vidForm.videoUrl.includes("drive") ? "✅ 구글드라이브 인식" : "🔗 직접 링크"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:14 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:13, color:C.text }}>
                  <input type="checkbox" checked={vidForm.isFree} onChange={e=>setVidForm(p=>({...p,isFree:e.target.checked}))}
                    style={{ accentColor:"#7c6aff" }} />
                  무료 공개
                </label>
                <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                  <button onClick={() => { setVidFormOpen(false); setVidEdit(null); resetVidForm(); }}
                    style={{ padding:"9px 20px", borderRadius:9, border:"1px solid "+bdr, background:"transparent", color:C.muted, fontSize:13, cursor:"pointer" }}>취소</button>
                  <button onClick={submitVideo}
                    style={{ padding:"9px 24px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {vidEdit ? "✅ 수정 완료" : "✅ 등록하기"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 영상 목록 */}
          {vidLoading && <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>⏳ 불러오는 중...</div>}
          {!vidLoading && videos.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎬</div>
              <div style={{ fontSize:14, color:C.text, fontWeight:700 }}>등록된 영상이 없어요</div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {videos.map(v => {
              const thumb = v.thumbnail || ytThumb(v.videoUrl) || null;
              return (
                <div key={v.key} style={{ background:C.card, border:"1px solid "+bdr, borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:C.shadow }}>
                  {/* 썸네일 */}
                  <div style={{ width:96, height:54, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(99,102,241,0.1)" }}>
                    {thumb
                      ? <img src={thumb} alt={v.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🎬</div>
                    }
                  </div>
                  {/* 정보 */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.title}</div>
                    <div style={{ fontSize:11, color:C.muted, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span>{v.category || "synth"}</span>
                      <span>{v.isFree !== false ? "🟢 무료" : "👑 멤버전용"}</span>
                      {v.downloadUrl && <span>⬇️ 다운로드 있음</span>}
                      <span style={{ color:"rgba(255,255,255,0.2)" }}>|</span>
                      <span style={{ maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", opacity:0.5 }}>{v.videoUrl}</span>
                    </div>
                  </div>
                  {/* 액션 버튼 */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => startEditVideo(v)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"1px solid "+bdr, background:"transparent", color:C.purpleL, fontSize:12, fontWeight:600, cursor:"pointer" }}>✏️ 수정</button>
                    <button onClick={() => deleteVideo(v.key, v.title)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer" }}>🗑 삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────── 문의 관리 ─────────────── */}
      {tab === "inquiries" && <InquiryManager C={C} isDark={isDark} />}
    </div>
  );
}

/* ── 문의 관리 컴포넌트 ── */
function InquiryManager({ C, isDark }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e9ecef";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      setInquiries(data || []);
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id, status) => {
    await supabase.from("inquiries").update({ status }).eq("id", id);
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    await supabase.from("inquiries").update({ reply: replyText, status: "replied" }).eq("id", id);
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, reply: replyText, status: "replied" } : i));
    setReplyText("");
  };

  const deleteInquiry = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    await supabase.from("inquiries").delete().eq("id", id);
    setInquiries(prev => prev.filter(i => i.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const STATUS = { pending: { label: "대기중", color: "#f59e0b" }, replied: { label: "답변완료", color: "#4ade80" }, closed: { label: "종료", color: "#94a3b8" } };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: muted }}>문의 목록 로딩 중...</div>;

  if (selected) {
    const s = selected;
    const st = STATUS[s.status] || STATUS.pending;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 13, marginBottom: 16, padding: 0 }}>← 목록으로</button>
        <div style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: st.color + "20", color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 12, color: muted }}>{new Date(s.created_at).toLocaleString("ko-KR")}</span>
            <button onClick={() => deleteInquiry(s.id)} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#f87171", fontSize: 11, cursor: "pointer" }}>삭제</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px 12px", fontSize: 13, marginBottom: 20 }}>
            <span style={{ color: muted, fontWeight: 700 }}>이름</span><span style={{ color: text }}>{s.name}</span>
            <span style={{ color: muted, fontWeight: 700 }}>이메일</span><span style={{ color: text }}>{s.email}</span>
            <span style={{ color: muted, fontWeight: 700 }}>유형</span><span style={{ color: text }}>{s.subject || "-"}</span>
          </div>
          <div style={{ fontSize: 14, color: text, lineHeight: 1.9, whiteSpace: "pre-wrap", padding: "16px 18px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#f9f9fc", border: "1px solid " + bdr, marginBottom: 20 }}>{s.message}</div>

          {s.reply && (
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>답변 내용</div>
              <div style={{ fontSize: 13, color: text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{s.reply}</div>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>답변 작성</div>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} placeholder="답변 내용을 입력하세요..."
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + bdr, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", color: text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => submitReply(s.id)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>답변 저장</button>
            {s.status !== "closed" && <button onClick={() => updateStatus(s.id, "closed")} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid " + bdr, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>종료 처리</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: text }}>📩 문의 목록 ({inquiries.length}건)</div>
      </div>
      {inquiries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>접수된 문의가 없습니다</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inquiries.map(item => {
            const st = STATUS[item.status] || STATUS.pending;
            return (
              <div key={item.id} onClick={() => { setSelected(item); setReplyText(item.reply || ""); }}
                style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: st.color + "20", color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: muted }}>{item.subject || "일반"}</span>
                    <span style={{ fontSize: 11, color: muted }}>{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 2 }}>{item.name} ({item.email})</div>
                  <div style={{ fontSize: 12, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.message.slice(0, 80)}</div>
                </div>
                <span style={{ fontSize: 16, color: muted, flexShrink: 0 }}>→</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
