import React, { useState, useEffect } from "react";
import { getPosts, getMembers, saveMembers, supabase, changePoints, getPostsFromDB, deletePostFromDB, getAuthToken } from "./storage";
import { Btn, Inp } from "./UI";

/* ── 게시판 카테고리/태그 CRUD ── */
const DEFAULT_BOARD_CATS = [
  { id:"info",label:"정보공유",icon:"📌",color:"#3b82f6" },
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
const FREE_GUEST  = 5;
const FREE_MEMBER = 20;

export default function AdminPage({ C, user: adminUser }) {
  const isAdminRole = adminUser?.role === "admin";
  const [pw, setPw]        = useState("");
  const [auth, setAuth]    = useState(isAdminRole);
  const [tab, setTab]      = useState("stats");
  const [sideOpen, setSideOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  // 게시판 관리 상태
  const [boardCats, setBoardCats] = useState(DEFAULT_BOARD_CATS);
  const [selBoardCat, setSelBoardCat] = useState(null);
  const [boardTags, setBoardTags] = useState([]);
  const [newCatForm, setNewCatForm] = useState({ id:"", label:"", icon:"📌", color:"#3b82f6" });
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
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
  // ── 관리자 API 호출 헬퍼 (service_role 키로 RLS 우회) ──
  const adminApi = async (action, extra = "") => {
    const uid = adminUser?.uid || "";
    const token = await getAuthToken();
    const r = await fetch(`/api/sns?action=admin&sub_action=${action}${extra}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(uid ? { "X-Admin-Uid": uid } : {}),
      },
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
    return r.json();
  };

  // 최근 7일간 일별 신규 가입자 수
  const loadDailySignups = async () => {
    try {
      const { data } = await adminApi("daily_signups");
      const counts = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        counts[d] = 0;
      }
      (data || []).forEach(r => {
        const dt = r.join_date || r.created_at;
        if (dt) { const d = dt.slice(0, 10); if (counts[d] !== undefined) counts[d]++; }
      });
      setDailySignups(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch { setDailySignups([]); }
  };

  // 최근 7일간 일별 AI 사용량
  const loadDailyAiUsage = async () => {
    try {
      const { data } = await adminApi("daily_ai");
      const counts = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        counts[d] = 0;
      }
      (data || []).forEach(r => {
        if (r.created_at) { const d = r.created_at.slice(0, 10); if (counts[d] !== undefined) counts[d]++; }
      });
      setDailyAiUsage(Object.entries(counts).map(([date, count]) => ({ date, count })));
    } catch { setDailyAiUsage([]); }
  };

  // 회원 목록 로드 (API 경유 — RLS 우회)
  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { members: allMembers } = await adminApi("members");
      // 클라이언트에서 정렬 (join_date 우선, 없으면 created_at)
      (allMembers || []).sort((a, b) => {
        const da = new Date(a.join_date || a.created_at || 0);
        const db = new Date(b.join_date || b.created_at || 0);
        return db - da;
      });
      setMembers2(allMembers || []);
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
      const { logs } = await adminApi("ai_logs");
      setAiLogs(logs || []);
    } catch {}
    setAiLogsLoading(false);
  };

  useEffect(() => {
    if (auth) {
      loadMembers(); loadVideos(); loadPosts(); loadBoardCats(); loadAiLogs(); loadDailySignups(); loadDailyAiUsage();
      adminApi("online_count").then(d=>setOnlineCount(d.count||0)).catch(()=>{});
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
    setSelBoardCat(cat); setNewTagLabel(""); setNewTagColor("#3b82f6");
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

  // ── 횟수 지급 (1회 = 1, API 경유)
  const grantPoints = async (uid, count) => {
    if (!count || isNaN(count)) { showToast("횟수를 입력하세요"); return; }
    try {
      const member = members.find(m => m.uid === uid);
      const next = (member?.points || 0) + Number(count);
      await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&points=${next}`);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: next } : m));
      showToast("+" + count + "회 지급 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 횟수 차감 (1회 = 30P, API 경유)
  const deductPoints = async (uid, count) => {
    if (!count || isNaN(count)) { showToast("횟수를 입력하세요"); return; }
    const member = members.find(m => m.uid === uid);
    const cur = member?.points || 0;
    const next = Math.max(0, cur - Number(count));
    try {
      await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&points=${next}`);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: next } : m));
      showToast("-" + count + "회 차감 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 횟수 초기화 (API 경유)
  const resetPoints = async (uid) => {
    if (!window.confirm("이 회원의 잔여 횟수를 0으로 초기화할까요?")) return;
    try {
      await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&points=0`);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: 0 } : m));
      showToast("횟수 초기화 완료");
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 횟수 직접 설정 (API 경유)
  const setPoints = async (uid, count) => {
    if (!count || isNaN(count)) return;
    try {
      const pts = Number(count);
      await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&points=${pts}`);
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: pts } : m));
      showToast(count + "회로 설정 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 회원 탈퇴 (API 경유)
  const deleteMember = async (uid, nick) => {
    if (!window.confirm(`"${nick}" 회원을 탈퇴 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await adminApi("delete_member", `&target_uid=${encodeURIComponent(uid)}`);
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
  const shellBg = isDark ? "#0f0d1f" : "#f6f7fb";
  const panelBg = isDark ? "rgba(255,255,255,0.045)" : "#fff";
  const panelBorder = isDark ? "rgba(255,255,255,0.08)" : "#e6e8f0";
  const subtleBg = isDark ? "rgba(255,255,255,0.035)" : "#f8f9fc";
  const activeBg = isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)";
  const adminTitle = {stats:"통계 대시보드", visitors:"접속 분석", members:"회원 관리", pointHistory:"횟수 내역", guest:"비회원 관리", posts:"게시글 관리", board:"게시판 관리", inquiries:"문의 관리", appFeedback:"앱 피드백"}[tab] || tab;
  const adminDesc = {
    stats: "회원, 게시글, AI 사용량을 한 화면에서 확인합니다.",
    visitors: "유입 경로와 접속 데이터를 점검합니다.",
    members: "회원 정보, 잔여 횟수, 위험 작업을 관리합니다.",
    pointHistory: "횟수 지급과 사용 내역을 추적합니다.",
    guest: "비회원 AI 사용량을 관리합니다.",
    posts: "커뮤니티 게시글을 검수하고 정리합니다.",
    board: "게시판 카테고리와 태그를 관리합니다.",
    inquiries: "고객 문의 상태와 답변을 처리합니다.",
    appFeedback: "앱 피드백을 확인하고 상태를 변경합니다.",
  }[tab] || "관리자 작업을 처리합니다.";
  const refreshAdminData = () => {
    loadMembers(); loadPosts(); loadAiLogs(); loadDailySignups(); loadDailyAiUsage();
    adminApi("online_count").then(d=>setOnlineCount(d.count||0)).catch(()=>{});
    if (tab === "board") loadBoardCats();
    showToast("관리자 데이터 새로고침 완료");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", background: shellBg }}>
      {/* 토스트 */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#22c55e", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "fadein 0.2s" }}>
          {toast}
        </div>
      )}

      {/* 모바일 메뉴 토글 */}
      <button onClick={() => setSideOpen(!sideOpen)} style={{
        display: "none", position: "fixed", top: 12, left: 12, zIndex: 1001,
        width: 40, height: 40, borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#ddd"}`,
        background: isDark ? "#1e1940" : "#fff", cursor: "pointer",
        alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "flex" } : {}),
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* 모바일 오버레이 */}
      {sideOpen && <div onClick={() => setSideOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "block" } : {}) }} />}

      {/* ── 사이드바 ── */}
      <aside style={{
        width: 220, flexShrink: 0, padding: "20px 12px",
        background: isDark ? "rgba(12,10,26,0.96)" : "#fff",
        borderRight: `1px solid ${panelBorder}`,
        overflowY: "auto", position: "sticky", top: 0, height: "100vh",
        ...(typeof window !== "undefined" && window.innerWidth < 768 ? { position: "fixed", left: sideOpen ? 0 : -240, zIndex: 1000, transition: "left 0.2s", boxShadow: sideOpen ? "4px 0 20px rgba(0,0,0,0.2)" : "none" } : {}),
      }}>
        {/* 로고 */}
        <div style={{ padding: "8px 10px 18px", borderBottom: `1px solid ${panelBorder}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>SNS메이킷</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Admin Console</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, background: subtleBg, padding: "8px 10px", borderRadius: 8, border: `1px solid ${panelBorder}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span>회원</span><b style={{ color: C.text }}>{loadingMembers ? "..." : members.length.toLocaleString()}명</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>게시글</span><b style={{ color: C.text }}>{posts.length.toLocaleString()}개</b></div>
          </div>
        </div>

        {/* 메뉴 그룹 */}
        {[
          { group: "대시보드", items: [["stats", "통계"], ["visitors", "접속 분석"]] },
          { group: "회원", items: [["members", "회원 관리"], ["membership", "멤버십 관리"], ["pointHistory", "횟수 내역"], ["guest", "비회원 관리"]] },
          { group: "콘텐츠", items: [["posts", "게시글 관리"], ["board", "게시판 관리"]] },
          { group: "고객", items: [["inquiries", "문의 관리"], ["appFeedback", "앱 피드백"]] },
        ].map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", padding: "0 10px", marginBottom: 6, letterSpacing: 1 }}>{group}</div>
            {items.map(([id, label]) => {
              const active = tab === id;
              return (
                <button key={id} onClick={() => { setTab(id); setSideOpen(false); }} style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  textAlign: "left", fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit",
                  background: active ? activeBg : "transparent",
                  color: active ? C.purpleL : (isDark ? "rgba(255,255,255,0.55)" : "#666"),
                  borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
                  marginBottom: 2, transition: "all 0.12s", display: "block",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main style={{ flex: 1, padding: "28px 28px 80px", overflowY: "auto", background: shellBg }}>
        {/* 상단 타이틀 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap", background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "18px 20px", boxShadow: isDark ? "none" : "0 10px 30px rgba(15,23,42,0.04)" }}>
          <div>
            <h2 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: 0 }}>{adminTitle}</h2>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{adminDesc}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ padding: "7px 10px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.18)", fontSize: 12, fontWeight: 800 }}>관리자 인증됨</span>
            <button onClick={refreshAdminData} style={{ padding: "8px 12px", borderRadius: 9, border: `1px solid ${panelBorder}`, background: subtleBg, color: C.text, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              새로고침
            </button>
          </div>
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

        const cardStyle = { padding:"18px 20px", borderRadius:12, background:panelBg, border:`1px solid ${panelBorder}`, flex:1, minWidth:140, boxShadow:isDark?"none":"0 10px 24px rgba(15,23,42,0.035)" };
        const numStyle = { fontSize:28, fontWeight:900, color:C.purpleL||"#3b82f6", marginBottom:4 };
        const labelStyle = { fontSize:12, color:C.muted, fontWeight:600 };

        return (
        <div>
          {/* 요약 카드 */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
            {[
              { n: totalMembers, l: "전체 회원", color: "#3b82f6" },
              { n: recentMembers, l: "이번주 신규", color: "#22c55e" },
              { n: onlineCount||0, l: "실시간 접속", color: "#f59e0b" },
              { n: totalPosts, l: "전체 게시글", color: "#8b5cf6" },
              { n: todayPosts, l: "오늘 게시글", color: "#ec4899" },
              { n: totalViews.toLocaleString(), l: "총 조회수", color: "#06b6d4" },
              { n: totalLikes, l: "총 좋아요", color: "#f59e0b" },
              { n: totalComments, l: "총 댓글", color: "#10b981" },
            ].map((s,i) => (
              <div key={i} style={cardStyle}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>{s.l}</div>
                <div style={{ ...numStyle, color: s.color }}>{s.n}</div>
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
                    <div style={{ height:"100%", borderRadius:4, background:"#3b82f6", width:`${Math.max(3,(cnt/Math.max(...Object.values(catStats)))*100)}%` }}/>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:C.purpleL||"#3b82f6", minWidth:30, textAlign:"right" }}>{cnt}</span>
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
                  <span style={{ fontSize:12, fontWeight:700, color:C.purpleL||"#3b82f6" }}>{cnt}건</span>
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
          <div style={{ marginTop:24, padding:"18px 22px", borderRadius:14, background:isDark?"rgba(0,0,0,0.06)":"rgba(0,0,0,0.06)", border:`1px solid ${isDark?"rgba(0,0,0,0.06)":"rgba(0,0,0,0.06)"}` }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:10 }}>🔍 검색엔진 노출 현황</div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
              <b style={{color:C.text}}>Google Search Console</b> → <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:"#3b82f6"}}>바로가기</a> (snsmakeit.com 등록 필요)<br/>
              <b style={{color:C.text}}>Naver Search Advisor</b> → <a href="https://searchadvisor.naver.com" target="_blank" rel="noopener noreferrer" style={{color:"#3b82f6"}}>바로가기</a> (네이버 검색 노출)<br/>
              <b style={{color:C.text}}>Bing Webmaster</b> → <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" style={{color:"#3b82f6"}}>바로가기</a> (해외 Bing 검색)<br/>
              <b style={{color:C.text}}>Google Analytics</b> → <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{color:"#3b82f6"}}>바로가기</a> (실시간 트래픽, 유입 경로, 페이지뷰)<br/>
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
                        <span style={{ fontSize:11, fontWeight:700, color:C.purpleL||"#3b82f6" }}>{d.count}</span>
                        <div style={{ width:"100%", maxWidth:40, borderRadius:"6px 6px 0 0", background:"#3b82f6", height:`${Math.max((d.count/maxVal)*80, 4)}px`, transition:"height 0.3s" }}/>
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
              { label: "AI 1회 기준",      value: "1회 차감", color: "#f59e0b" },
              { label: "출석 적립",        value: "+1회", color: "#34d399" },
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
                            <span style={{ fontSize:12, fontWeight:700, color:"#3b82f6" }}>{c}회</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:8 }}>사용자별 TOP5</div>
                        {topUsers.map(([uid,c],i) => (
                          <div key={uid} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:12, fontWeight:900, color:i<3?"#f59e0b":C.muted, minWidth:16 }}>{i+1}</span>
                            <span style={{ fontSize:11, color:C.text, flex:1 }}>{nick(uid)}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:"#3b82f6" }}>{c}회</span>
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
                        <th style={{ padding:"6px 8px", textAlign:"right", color:C.muted, fontWeight:600 }}>잔여횟수</th>
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
                            <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:700, color:l.delta>0?"#22c55e":"#ef4444" }}>{l.delta>0?"+":""}{l.created_at&&l.created_at<"2026-05-03"?Math.round((l.delta||0)/30):Math.round(l.delta)}회</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", color:C.text }}>{l.created_at&&l.created_at<"2026-05-03"?Math.floor((l.balance||0)/30):Math.floor(l.balance||0)}회</td>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 12, padding: "14px 16px" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>회원 목록</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>총 {members.length.toLocaleString()}명 · 검색 결과 {filteredMembers.length.toLocaleString()}명</div>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="닉네임 / 이메일 검색..."
              style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid " + panelBorder, background: subtleBg, color: C.text, fontSize: 13, outline: "none", width: 260 }} />
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
              <div key={m.uid||m.id} style={{ background: panelBg, border: "1px solid " + panelBorder, borderRadius: 12, padding: "14px 16px", marginBottom: 8, boxShadow: isDark ? "none" : "0 4px 12px rgba(15,23,42,0.03)" }}>
                {/* 회원 기본 정보 */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {(m.nick||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{m.nick}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, fontWeight: 700,
                          background: m.role === "admin" ? "rgba(251,191,36,0.12)" : m.role === "instructor" ? "rgba(34,197,94,0.12)" : "rgba(0,0,0,0.06)",
                          color: m.role === "admin" ? "#fbbf24" : m.role === "instructor" ? "#22c55e" : C.purpleL }}>
                          {m.role === "admin" ? "관리자" : m.role === "instructor" ? "강사" : "일반회원"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>{m.email}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        가입 {(m.join_date || m.created_at) ? new Date(m.join_date || m.created_at).toLocaleDateString("ko-KR") : "-"} · AI 사용 {mUsed}회
                      </div>
                    </div>
                  </div>
                  {/* 잔여 횟수 */}
                  <div style={{ textAlign: "right", padding: "8px 12px", borderRadius: 10, background: subtleBg, border: `1px solid ${panelBorder}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.purpleL }}>{Math.floor((m.points||0))}회</div>
                    <div style={{ fontSize: 11, color: C.muted }}>잔여 횟수</div>
                  </div>
                </div>

                {/* 횟수 관리 — 컴팩트 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {/* 지급 */}
                  <div style={{ background: subtleBg, border: `1px solid ${panelBorder}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.purpleL, marginBottom: 6 }}>지급</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[5, 10, 20, 50].map(n => (
                        <button key={n} onClick={() => grantPoints(uid, n)} style={{
                          padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700,
                          border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.06)", color: C.purpleL }}>
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 차감 */}
                  <div style={{ background: subtleBg, border: `1px solid ${panelBorder}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", marginBottom: 6 }}>차감</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[5, 10, 20, 50].map(n => (
                        <button key={n} onClick={() => deductPoints(uid, n)} style={{
                          padding: "4px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700,
                          border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                          -{n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* 직접 입력 + 액션 */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={ptVal} type="number" placeholder="횟수"
                    onChange={e => setPtInputs(p => ({ ...p, [uid]: e.target.value }))}
                    style={{ width: 70, padding: "5px 8px", borderRadius: 7, border: "1px solid " + bdr, background: inputBg, color: C.text, fontSize: 11, outline: "none" }} />
                  <button onClick={() => grantPoints(uid, ptVal)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: C.purpleL, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>지급</button>
                  <button onClick={() => deductPoints(uid, ptVal)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>차감</button>
                  <button onClick={() => setPoints(uid, ptVal)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid " + bdr, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>설정</button>
                  <div style={{ width: 1, height: 16, background: bdr, margin: "0 2px" }} />
                  <button onClick={() => resetPoints(uid)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.06)", color: "#f59e0b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>초기화</button>
                  <button onClick={() => resetMemberUsage(uid)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.06)", color: C.purpleL, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>AI초기화</button>
                  {m.role !== "admin" && (
                    <button onClick={async () => {
                      const newRole = m.role === "instructor" ? "member" : "instructor";
                      const label = newRole === "instructor" ? "강사 권한을 부여" : "강사 권한을 해제";
                      if (!window.confirm(`${m.nick}님에게 ${label}할까요?`)) return;
                      try {
                        await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&role=${newRole}`);
                        await supabase.from("users").update({ role: newRole }).eq("uid", uid);
                        setMembers2(prev => prev.map(x => x.uid === uid ? { ...x, role: newRole } : x));
                        showToast(`${m.nick} → ${newRole === "instructor" ? "강사" : "일반회원"} 변경 완료`);
                      } catch(e) { showToast("오류: " + e.message); }
                    }}
                      style={{ padding: "5px 10px", borderRadius: 7, border: m.role === "instructor" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(0,0,0,0.06)", background: m.role === "instructor" ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.06)", color: m.role === "instructor" ? "#22c55e" : C.purpleL, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {m.role === "instructor" ? "강사 해제" : "강사 부여"}
                    </button>
                  )}
                  {m.role !== "admin" && (
                    <button onClick={() => deleteMember(uid, m.nick)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      회원 탈퇴
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
                      <button onClick={resetGuestUsage} style={{ padding: "7px 16px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.06)", color: C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
                style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, border:`2px solid ${selBoardCat?.id===cat.id?"#3b82f6":bdr}`, background:selBoardCat?.id===cat.id?"rgba(0,0,0,0.06)":"transparent", cursor:"pointer", marginBottom:8, transition:"all 0.15s" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{cat.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>ID: {cat.id}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 오른쪽: 서브 카테고리 관리 */}
          <div style={{ flex:"1 1 320px", background:C.card, border:"1px solid "+bdr, borderRadius:16, padding:"20px" }}>
            {!selBoardCat ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                <div style={{ fontSize:14 }}>왼쪽에서 카테고리를 선택하세요</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:C.text }}>{selBoardCat.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>서브 카테고리 {boardTags.length}개</div>
                </div>

                {/* 기존 태그 목록 */}
                {boardTags.length === 0 ? (
                  <div style={{ padding:"16px", borderRadius:10, background:isDark?"rgba(255,255,255,0.03)":"#f9fafb", textAlign:"center", color:C.muted, fontSize:12, marginBottom:16 }}>
                    서브 카테고리가 없어요. 아래에서 추가하세요.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                    {boardTags.map(tag => (
                      <div key={tag.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, background:isDark?"rgba(255,255,255,0.06)":"#f3f4f6", border:`1px solid ${bdr}` }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{tag.label}</span>
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
                  </div>
                  <button onClick={handleAddTag} disabled={!newTagLabel.trim()}
                    style={{ width:"100%", padding:"11px", borderRadius:10, border:"none", cursor:newTagLabel.trim()?"pointer":"not-allowed", background:newTagLabel.trim()?"#3b82f6":"rgba(0,0,0,0.06)", color:"#fff", fontSize:13, fontWeight:800, opacity:newTagLabel.trim()?1:0.6 }}>
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
              style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"#3b82f6", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {vidFormOpen && !vidEdit ? "✕ 닫기" : "+ 영상 추가"}
            </button>
          </div>

          {/* 등록/수정 폼 */}
          {vidFormOpen && (
            <div style={{ background:isDark?"rgba(0,0,0,0.06)":"rgba(0,0,0,0.06)", border:"1px solid rgba(0,0,0,0.06)", borderRadius:16, padding:"22px 24px", marginBottom:20 }}>
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
                    style={{ accentColor:"#3b82f6" }} />
                  무료 공개
                </label>
                <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                  <button onClick={() => { setVidFormOpen(false); setVidEdit(null); resetVidForm(); }}
                    style={{ padding:"9px 20px", borderRadius:9, border:"1px solid "+bdr, background:"transparent", color:C.muted, fontSize:13, cursor:"pointer" }}>취소</button>
                  <button onClick={submitVideo}
                    style={{ padding:"9px 24px", borderRadius:9, border:"none", background:"#3b82f6", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
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
                  <div style={{ width:96, height:54, borderRadius:8, overflow:"hidden", flexShrink:0, background:"rgba(0,0,0,0.06)" }}>
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
      {/* ─────────────── 템플릿 관리 ─────────────── */}
      {tab === "templates" && (() => {
        const TemplateManager = () => {
          const [templates, setTemplates] = React.useState([]);
          const [tplLoading, setTplLoading] = React.useState(true);
          const loadTemplates = async () => {
            setTplLoading(true);
            try {
              const { data, error } = await supabase.from("shared_templates").select("*").order("created_at", { ascending: false });
              if (!error && data) setTemplates(data);
            } catch (e) { /* template load failed */ }
            setTplLoading(false);
          };
          React.useEffect(() => { loadTemplates(); }, []);
          const deleteTemplate = async (id) => {
            if (!window.confirm("이 템플릿을 삭제하시겠습니까?")) return;
            try {
              await supabase.from("shared_templates").delete().eq("id", id);
              setTemplates(prev => prev.filter(t => t.id !== id));
            } catch (e) { alert("삭제 실패: " + e.message); }
          };
          if (tplLoading) return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>로딩 중...</div>;
          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>공유 템플릿 ({templates.length}개)</span>
                <button onClick={loadTemplates} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.purpleL, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>새로고침</button>
              </div>
              {templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>등록된 템플릿이 없습니다</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {templates.map(tpl => (
                    <div key={tpl.id} style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, overflow: "hidden" }}>
                      <div style={{ width: "100%", paddingBottom: "60%", position: "relative", background: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }}>
                        {tpl.preview ? <img src={tpl.preview} alt={tpl.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#ccc" }}>🎨</div>}
                      </div>
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{tpl.title || "제목 없음"}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{tpl.author || "익명"} · {tpl.slide_count || "?"}장 · {new Date(tpl.created_at).toLocaleDateString()}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button onClick={() => deleteTemplate(tpl.id)}
                            style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        };
        return <TemplateManager />;
      })()}

      {tab === "inquiries" && <InquiryManager C={C} isDark={isDark} />}
    {/* 나머지 탭들은 pointHistory 등 아래에서 계속... → 1340줄 부근 */}

      {/* ── 횟수 내역 ── */}
      {tab === "pointHistory" && <PointHistoryTab C={C} isDark={isDark} members={members} />}

      {/* ── 앱 피드백 ── */}
      {tab === "appFeedback" && <AppFeedbackTab C={C} isDark={isDark} />}

      {/* ── 접속 분석 ── */}
      {tab === "visitors" && <VisitorAnalyticsTab C={C} isDark={isDark} />}

      {/* ── 멤버십 관리 ── */}
      {tab === "membership" && <MembershipTab C={C} isDark={isDark} />}
      </main>
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
            <button onClick={() => submitReply(s.id)} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>답변 저장</button>
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

function PointHistoryTab({ C, isDark, members = [] }) {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filterUid, setFilterUid] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await (await import("./storage")).supabase
          .from("point_history").select("*").order("created_at", { ascending: false }).limit(200);
        setHistory(data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const getName = (uid) => {
    const m = members.find(u => u.uid === uid);
    if (m) return m.nick || m.email?.split("@")[0] || "?";
    return uid?.slice(0, 8) + "...";
  };
  const filtered = filterUid ? history.filter(h => getName(h.uid).toLowerCase().includes(filterUid.toLowerCase()) || h.reason?.toLowerCase().includes(filterUid.toLowerCase())) : history;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.text }}>횟수 사용 내역 ({filtered.length}건)</div>
        <input value={filterUid} onChange={e => setFilterUid(e.target.value)} placeholder="닉네임 또는 사유 검색"
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:"transparent", color:C.text, fontSize:12, outline:"none", width:200 }} />
      </div>
      {loading && <div style={{ color:C.muted }}>로딩 중...</div>}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}` }}>
              <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:700 }}>날짜</th>
              <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:700 }}>회원</th>
              <th style={{ padding:"8px 10px", textAlign:"right", color:C.muted, fontWeight:700 }}>변동</th>
              <th style={{ padding:"8px 10px", textAlign:"right", color:C.muted, fontWeight:700 }}>잔액</th>
              <th style={{ padding:"8px 10px", textAlign:"left", color:C.muted, fontWeight:700 }}>사유</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"#f3f4f6"}` }}>
                <td style={{ padding:"8px 10px", color:C.muted, whiteSpace:"nowrap" }}>{new Date(h.created_at).toLocaleString("ko-KR", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                <td style={{ padding:"8px 10px", color:C.text, fontSize:12, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }} title={h.uid}>{getName(h.uid)}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:700, color: h.delta > 0 ? "#10b981" : h.delta < 0 ? "#ef4444" : C.muted }}>{h.delta > 0 ? "+" : ""}{h.delta}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", color:C.text, fontWeight:600 }}>{(h.balance||0).toLocaleString()}</td>
                <td style={{ padding:"8px 10px", color:C.muted, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis" }}>{h.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppFeedbackTab({ C, isDark }) {
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const catLabels = { feature:"기능 요청", bug:"버그 신고", improve:"개선 제안", other:"기타" };
  const catColors = { feature:"#3b82f6", bug:"#ef4444", improve:"#f59e0b", other:"#888" };
  const statusOpts = ["pending","reviewed","done","rejected"];
  const statusLabels = { pending:"검토 대기", reviewed:"검토 중", done:"반영 완료", rejected:"보류" };
  const statusColors = { pending:"#888", reviewed:"#3b82f6", done:"#10b981", rejected:"#ef4444" };

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await (await import("./storage")).supabase.from("app_feedback").select("*").order("created_at", { ascending: false });
        setFeedbacks(data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id, newStatus) => {
    const { supabase } = await import("./storage");
    await supabase.from("app_feedback").update({ status: newStatus }).eq("id", id);
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
  };

  return (
    <div>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:16 }}>앱 피드백 ({feedbacks.length}건)</div>
      {loading && <div style={{ color:C.muted }}>로딩 중...</div>}
      {feedbacks.map(f => (
        <div key={f.id} style={{ padding:"16px 18px", borderRadius:12, background:C.card, border:`1px solid ${isDark?"rgba(255,255,255,0.06)":"#f0f0f0"}`, marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background:(catColors[f.category]||"#888")+"18", color:catColors[f.category]||"#888", fontWeight:700 }}>{catLabels[f.category]||f.category}</span>
            <span style={{ fontSize:15, fontWeight:700, color:C.text, flex:1 }}>{f.title}</span>
            <select value={f.status} onChange={e => updateStatus(f.id, e.target.value)}
              style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${statusColors[f.status]}`, background:"transparent", color:statusColors[f.status], fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {statusOpts.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{f.body}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>{f.email} · {f.app_version} · {new Date(f.created_at).toLocaleDateString("ko-KR")}</div>
        </div>
      ))}
    </div>
  );
}

// ── 접속 분석 탭 ──
const COUNTRY_NAMES = {KR:"한국",US:"미국",JP:"일본",CN:"중국",TW:"대만",HK:"홍콩",VN:"베트남",TH:"태국",SG:"싱가포르",IN:"인도",DE:"독일",FR:"프랑스",GB:"영국",CA:"캐나다",AU:"호주",BR:"브라질",RU:"러시아",ID:"인도네시아",MY:"말레이시아",PH:"필리핀",NL:"네덜란드",IT:"이탈리아",ES:"스페인",SE:"스웨덴",MX:"멕시코",AR:"아르헨티나",unknown:"미확인"};

function VisitorMap({ geoPoints, isDark }) {
  const mapRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let map;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mapRef.current || mapRef.current._leaflet_id) return;
      map = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: false }).setView([30, 20], 2);
      L.tileLayer(isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 10 }
      ).addTo(map);
      const maxCnt = Math.max(...geoPoints.map(p => p.count), 1);
      geoPoints.forEach(p => {
        const r = Math.max(6, Math.min(30, (p.count / maxCnt) * 30));
        const color = p.country === "KR" ? "#10b981" : p.country === "US" ? "#3b82f6" : p.country === "JP" ? "#f59e0b" : "#3b82f6";
        L.circleMarker([p.lat, p.lng], { radius: r, fillColor: color, color: "rgba(255,255,255,0.5)", weight: 1, fillOpacity: 0.7 })
          .bindTooltip(`${p.city || "?"} (${COUNTRY_NAMES[p.country] || p.country}) — ${p.count}회`, { direction: "top" })
          .addTo(map);
      });
      setReady(true);
    })();
    return () => { if (map) map.remove(); };
  }, [geoPoints, isDark]);

  return <div ref={mapRef} style={{ width: "100%", height: 350, borderRadius: 12, overflow: "hidden" }} />;
}

function VisitorAnalyticsTab({ C, isDark }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(30);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sessionSec, setSessionSec] = React.useState(0);

  // 세션 타이머
  React.useEffect(() => {
    const t = setInterval(() => setSessionSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(sessionSec / 60)).padStart(2, "0");
  const ss = String(sessionSec % 60).padStart(2, "0");

  const load = async (d) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/sns?action=track-stats&days=${d}`);
      if (!r.ok) throw new Error("API error");
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setData(j);
    } catch { setData(null); }
    setLoading(false);
  };
  React.useEffect(() => { load(days); }, [days]);

  const loadCustomRange = async () => {
    if (!dateFrom || !dateTo) return;
    const diffMs = new Date(dateTo) - new Date(dateFrom);
    const diffDays = Math.max(1, Math.ceil(diffMs / 86400000));
    setDays(diffDays);
  };

  const text = C.text;
  const muted = C.muted;
  const card = C.card;
  const bdr = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";
  const inputSt = { padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 12, outline: "none", fontFamily: "inherit" };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: muted }}>로딩 중...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: muted }}>데이터를 불러올 수 없습니다. 배포 후 사용 가능합니다.</div>;

  const sortedCountries = Object.entries(data.countryCounts || {}).sort((a, b) => b[1] - a[1]);
  const sortedCities = Object.entries(data.cityCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const dailyEntries = Object.entries(data.dailyCounts || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDaily = Math.max(...dailyEntries.map(e => e[1]), 1);

  return (
    <div>
      {/* 기간 선택 + 세션 타이머 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "7px 16px", borderRadius: 8, border: days === d ? "2px solid #3b82f6" : `1px solid ${bdr}`,
            background: days === d ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : "transparent",
            color: days === d ? "#3b82f6" : muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{d}일</button>
        ))}
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputSt} />
          <span style={{ color: muted, fontSize: 12 }}>~</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputSt} />
          <button onClick={loadCustomRange} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>조회</button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: muted, background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6", padding: "4px 12px", borderRadius: 8 }}>세션 {mm}:{ss}</span>
          <button onClick={() => load(days)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>새로고침</button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          ["국가 수", data.countries, `${data.days}일 고유 국가`],
          ["도시 수", data.cities, "도시 식별 기준"],
          ["방문 수", data.totalVisits, `${data.days}일 고유 방문`],
          ["페이지뷰", Object.values(data.dailyCounts || {}).reduce((s, v) => s + v, 0), `${data.days}일 전체 조회`],
        ].map(([label, val, desc], i) => (
          <div key={i} style={{ padding: "18px 20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: text }}>{val?.toLocaleString?.() || val || 0}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* 세계 지도 */}
      {(data.geoPoints || []).length > 0 && (
        <div style={{ marginBottom: 28, padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 4 }}>세계 지도 분포</div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 12 }}>원형 크기는 해당 국가의 방문 수를 나타냅니다.</div>
          <VisitorMap geoPoints={data.geoPoints} isDark={isDark} />
        </div>
      )}

      {/* 일별 방문 추이 차트 */}
      {dailyEntries.length > 0 && (
        <div style={{ marginBottom: 28, padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 16 }}>일별 방문 추이</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
            {dailyEntries.map(([date, cnt]) => (
              <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, color: muted }}>{cnt}</div>
                <div style={{ width: "100%", maxWidth: 24, height: Math.max(4, (cnt / maxDaily) * 100), borderRadius: 4, background: "#3b82f6", transition: "height 0.3s" }} />
                <div style={{ fontSize: 8, color: muted, transform: "rotate(-45deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>{date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 국가별 / 도시별 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        <div style={{ padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>국가별 방문</div>
          {sortedCountries.length === 0 && <div style={{ fontSize: 13, color: muted }}>데이터 없음</div>}
          {sortedCountries.map(([code, cnt]) => {
            const pct = Math.round(cnt / data.totalVisits * 100);
            return (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: text, minWidth: 80 }}>{COUNTRY_NAMES[code] || code}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.06)" : "#eee" }}>
                  <div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: "#3b82f6" }} />
                </div>
                <span style={{ fontSize: 12, color: muted, minWidth: 50, textAlign: "right" }}>{cnt} ({pct}%)</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>도시별 방문 TOP 15</div>
          {sortedCities.length === 0 && <div style={{ fontSize: 13, color: muted }}>데이터 없음</div>}
          {sortedCities.map(([key, cnt]) => {
            const [city, country] = key.split("|");
            return (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                <span style={{ color: text }}>{city === "unknown" ? "미확인" : city} <span style={{ color: muted, fontSize: 11 }}>({COUNTRY_NAMES[country] || country})</span></span>
                <span style={{ color: muted, fontWeight: 600 }}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 리퍼러 / 디바이스 / 인기 페이지 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div style={{ padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>유입 경로</div>
          {(data.referrerCounts || []).length === 0 && <div style={{ fontSize: 13, color: muted }}>데이터 없음</div>}
          {(data.referrerCounts || []).map(([ref, cnt]) => (
            <div key={ref} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span style={{ color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{ref}</span>
              <span style={{ color: muted, fontWeight: 600 }}>{cnt}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>디바이스</div>
          {Object.entries(data.deviceCounts || {}).map(([device, cnt]) => (
            <div key={device} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: text, fontWeight: 600 }}>{device === "mobile" ? "모바일" : "데스크톱"}</span>
              <span style={{ color: muted }}>{cnt} ({Math.round(cnt / data.totalVisits * 100)}%)</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px", borderRadius: 14, background: card, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 14 }}>인기 페이지</div>
          {(data.pageCounts || []).map(([page, cnt]) => (
            <div key={page} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span style={{ color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{page}</span>
              <span style={{ color: muted, fontWeight: 600 }}>{cnt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ 멤버십 관리 탭 ═══ */
function MembershipTab({ C, isDark }) {
  const [members, setMembers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const PLANS = ["Free", "Starter", "Pro", "Business", "Enterprise"];

  useEffect(() => {
    (async () => {
      const [{ data: u }, { data: s }] = await Promise.all([
        supabase.from("users").select("uid,email,nick,role").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").in("status", ["active", "on_trial"]),
      ]);
      setMembers(u || []);
      setSubs(s || []);
      setLoading(false);
    })();
  }, []);

  const getSub = (uid) => subs.find(s => s.uid === uid);

  const setPlan = async (uid, plan) => {
    if (plan === "Free") {
      await supabase.from("subscriptions").delete().eq("uid", uid);
      setSubs(p => p.filter(s => s.uid !== uid));
    } else {
      const existing = subs.find(s => s.uid === uid);
      if (existing) {
        await supabase.from("subscriptions").update({ product_name: plan, status: "active", monthly_limit: plan === "Enterprise" ? 9999 : plan === "Business" ? 500 : plan === "Pro" ? 999 : 30, updated_at: new Date().toISOString() }).eq("id", existing.id);
        setSubs(p => p.map(s => s.uid === uid ? { ...s, product_name: plan, status: "active" } : s));
      } else {
        const row = { uid, product_name: plan, status: "active", monthly_limit: plan === "Enterprise" ? 9999 : plan === "Business" ? 500 : plan === "Pro" ? 999 : 30, updated_at: new Date().toISOString() };
        const { data } = await supabase.from("subscriptions").insert(row).select().single();
        if (data) setSubs(p => [...p, data]);
      }
    }
    setMsg(`${plan} 플랜 적용 완료`);
    setTimeout(() => setMsg(""), 2000);
  };

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.email || "").toLowerCase().includes(q) || (m.nick || "").toLowerCase().includes(q);
  });

  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const card = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inp = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>불러오는 중...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>멤버십 관리</h2>

      {msg && <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{msg}</div>}

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이메일 또는 닉네임 검색" style={{ ...inp, marginBottom: 16 }} />

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>총 {filtered.length}명</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.slice(0, 50).map(m => {
          const sub = getSub(m.uid);
          const currentPlan = sub?.product_name || "Free";
          return (
            <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: `1px solid ${bdr}`, background: card }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nick || "-"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: currentPlan === "Free" ? C.muted : "#3b82f6", background: currentPlan === "Free" ? "transparent" : "rgba(59,130,246,0.1)", padding: "3px 10px", borderRadius: 99 }}>{currentPlan}</span>
              <select value={currentPlan} onChange={e => setPlan(m.uid, e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: C.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
