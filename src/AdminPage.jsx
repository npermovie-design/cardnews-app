import React, { useState, useEffect } from "react";
import { getPosts, getMembers, saveMembers, supabase, changePoints, getPostsFromDB, deletePostFromDB, getAuthToken } from "./storage";
import { Btn } from "./UI";

/* ── 게시판 카테고리/태그 CRUD ── */
const DEFAULT_BOARD_CATS = [
  { id:"info",label:"정보공유",icon:"📌",color:"#3b82f6" },
  { id:"qna", label:"질문답변",icon:"",color:"#60a5fa" },
  { id:"free",label:"자유게시판",icon:"🗣",color:"#10b981" },
  { id:"review",label:"사용후기",icon:"",color:"#0ea5e9" },
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

const FREE_GUEST  = 5;
const FREE_MEMBER = 5;
const cleanPostText = (value) => {
  const raw = String(value || "");
  if (!raw) return "";
  if (typeof window !== "undefined" && window.DOMParser) {
    try {
      return new window.DOMParser().parseFromString(raw, "text/html").body.textContent.trim();
    } catch {}
  }
  return raw.replace(/<[^>]*>/g, "").trim();
};

export default function AdminPage({ C, user: adminUser }) {
  const isAdminRole = adminUser?.role === "admin";
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
  const [monthlyAiLogs, setMonthlyAiLogs] = useState([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [programLogs, setProgramLogs] = useState([]);
  const [programLogsLoading, setProgramLogsLoading] = useState(false);
  const [logPeriod, setLogPeriod] = useState("week");
  const [guestSearch, setGuestSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [postPage, setPostPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const PAGE_SIZE = 20;
  const [dailySignups, setDailySignups] = useState([]);
  const [dailyAiUsage, setDailyAiUsage] = useState([]);
  // ── 통합 회원관리: 구독/체험권/횟수내역 ──
  const [subs, setSubs] = useState([]);
  const [trials, setTrials] = useState([]);
  const [expandedUid, setExpandedUid] = useState(null);
  const [memberHistory, setMemberHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});
  const PLAN_LIST = ["Free", "Basic", "Pro", "Premium", "Business", "Agency"];
  const PLAN_LIMITS = { Free: 5, Basic: 30, Pro: 200, Premium: 700, Business: 700, Agency: 99999 };

  useEffect(() => {
    setAuth(Boolean(isAdminRole));
  }, [isAdminRole]);
  // ── 관리자 API 호출 헬퍼 ──
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

  const periodDays = { day: 1, week: 7, month: 30 };
  const loadAiLogs = async (period) => {
    const days = periodDays[period || logPeriod] || 7;
    setAiLogsLoading(true);
    try {
      const { logs } = await adminApi("ai_logs", `&days=${days}`);
      setAiLogs(logs || []);
    } catch {}
    setAiLogsLoading(false);
  };
  const loadMonthlyAiLogs = async () => {
    try {
      const { logs } = await adminApi("ai_logs", "&days=31");
      setMonthlyAiLogs(logs || []);
    } catch {
      setMonthlyAiLogs([]);
    }
  };
  const loadProgramLogs = async (period) => {
    const days = periodDays[period || logPeriod] || 7;
    setProgramLogsLoading(true);
    try {
      const { logs } = await adminApi("program_logs", `&days=${days}`);
      setProgramLogs(logs || []);
    } catch {}
    setProgramLogsLoading(false);
  };
  const switchLogPeriod = (p) => {
    setLogPeriod(p);
    loadAiLogs(p);
    loadMonthlyAiLogs();
    loadProgramLogs(p);
  };

  // ── 구독/체험권 로드 ──
  const loadSubs = async () => {
    try {
      const { data: s } = await supabase.from("subscriptions").select("*").in("status", ["active", "on_trial"]);
      setSubs(s || []);
    } catch {}
  };
  const loadTrials = async () => {
    try {
      const { data: t } = await supabase.from("program_trials").select("id, uid, email, plan, status, created_at, expires_at, note").order("expires_at", { ascending: false });
      setTrials(t || []);
    } catch {}
  };
  const getSub = (uid) => subs.find(s => s.uid === uid);
  const getTrial = (member) => {
    const email = String(member.email || "").toLowerCase();
    return trials.find(t => t.status === "active" && new Date(t.expires_at).getTime() > Date.now() && (t.uid === member.uid || String(t.email || "").toLowerCase() === email));
  };
  const setPlan = async (uid, plan) => {
    if (plan === "Free") {
      await supabase.from("subscriptions").delete().eq("uid", uid);
      setSubs(p => p.filter(s => s.uid !== uid));
    } else {
      const existing = subs.find(s => s.uid === uid);
      const monthlyLimit = PLAN_LIMITS[plan] || 0;
      if (existing) {
        await supabase.from("subscriptions").update({ product_name: plan, status: "active", monthly_limit: monthlyLimit, updated_at: new Date().toISOString() }).eq("id", existing.id);
        setSubs(p => p.map(s => s.uid === uid ? { ...s, product_name: plan, status: "active" } : s));
      } else {
        const row = { uid, product_name: plan, status: "active", monthly_limit: monthlyLimit, updated_at: new Date().toISOString() };
        const { data } = await supabase.from("subscriptions").insert(row).select().single();
        if (data) setSubs(p => [...p, data]);
      }
    }
    showToast(`${plan} 플랜 적용 완료`);
  };
  const grantProTrial = async (member) => {
    if (!window.confirm(`${member.email || member.nick || "선택 회원"}에게 Pro 한 달 체험권을 부여할까요?`)) return;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const { data: trial, error } = await supabase.from("program_trials").insert({ uid: member.uid, email: member.email, plan: "pro", status: "active", expires_at: expiresAt.toISOString(), note: "관리자 지급 Pro 한 달 체험권" }).select("id, uid, email, plan, status, created_at, expires_at, note").single();
    if (error) { showToast(`체험권 지급 실패: ${error.message}`); } else {
      if (trial) setTrials(prev => [trial, ...prev.filter(t => t.id !== trial.id)]);
      showToast("Pro 한 달 체험권 부여 완료");
    }
  };
  const toggleModerator = async (member) => {
    const isMod = member.role === "moderator";
    const action = isMod ? "해제" : "부여";
    if (!window.confirm(`${member.email || member.nick}에게 크루잉 관리 권한을 ${action}할까요?`)) return;
    const newRole = isMod ? "member" : "moderator";
    const { error } = await supabase.from("users").update({ role: newRole }).eq("uid", member.uid);
    if (error) { showToast(`권한 변경 실패: ${error.message}`); return; }
    setMembers2(prev => prev.map(m => m.uid === member.uid ? { ...m, role: newRole } : m));
    showToast(`크루잉 관리 권한 ${action} 완료`);
  };
  // ── 회원별 횟수 내역 로드 ──
  const loadMemberHistory = async (uid) => {
    if (memberHistory[uid]) return;
    setHistoryLoading(p => ({ ...p, [uid]: true }));
    try {
      const { data } = await supabase.from("point_history").select("*").eq("uid", uid).order("created_at", { ascending: false }).limit(30);
      setMemberHistory(p => ({ ...p, [uid]: data || [] }));
    } catch {}
    setHistoryLoading(p => ({ ...p, [uid]: false }));
  };
  const toggleExpand = (uid) => {
    if (expandedUid === uid) { setExpandedUid(null); return; }
    setExpandedUid(uid);
    loadMemberHistory(uid);
  };

  useEffect(() => {
    if (auth) {
      loadMembers(); loadVideos(); loadPosts(); loadBoardCats(); loadAiLogs(); loadMonthlyAiLogs(); loadProgramLogs(); loadDailySignups(); loadDailyAiUsage();
      loadSubs(); loadTrials();
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
        showToast("영상 등록 완료!");
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

  // 관리자 인증: 서버 API에서 role='admin'을 다시 검증한다.
  if (!auth) {
    if (!isAdminRole) return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", boxShadow: C.shadow, textAlign: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:8 }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900, marginBottom: 8 }}>접근 권한 없음</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>관리자 권한이 있는 계정으로 로그인해 주세요.</p>
        </div>
      </div>
    );
    return null;
  }

  const filteredMembers = search.trim()
    ? members.filter(m => (m.nick||"").toLowerCase().includes(search.toLowerCase()) || (m.email||"").toLowerCase().includes(search.toLowerCase()))
    : members;

  const usage = getAllUsage();
  const shellBg = isDark ? "#0f0d1f" : "#f5f6fa";
  const panelBg = isDark ? "rgba(255,255,255,0.045)" : "#fff";
  const panelBorder = isDark ? "rgba(255,255,255,0.06)" : "#eef0f6";
  const subtleBg = isDark ? "rgba(255,255,255,0.035)" : "#f8f9fc";
  const activeBg = isDark ? "rgba(37,99,235,0.14)" : "rgba(37,99,235,0.08)";
  const accent = "#2563eb";
  const blueSoft = isDark ? "rgba(37,99,235,0.16)" : "rgba(37,99,235,0.08)";
  const blueMuted = "#60a5fa";
  const blueDeep = "#1d4ed8";
  const cardStyle = { padding: "20px 22px", borderRadius: 16, background: panelBg, border: `1px solid ${panelBorder}`, boxShadow: isDark ? "none" : "0 2px 12px rgba(15,23,42,0.04)" };
  const isMobileAdmin = typeof window !== "undefined" && window.innerWidth < 768;
  const adminTitle = {stats:"관리자 홈", logs:"SaaS 사용 로그", visitors:"접속 분석", members:"회원 관리", guest:"비회원 관리", posts:"게시글 관리", board:"게시판 관리", inquiries:"문의 관리", appFeedback:"앱 피드백", chat:"실시간 채팅"}[tab] || tab;
  const adminDesc = {
    stats: "핵심 운영 지표를 간결하게 확인합니다.",
    logs: "exe 프로그램에서 발생한 SaaS 사용 횟수만 확인합니다.",
    visitors: "유입 경로와 접속 데이터를 점검합니다.",
    members: "회원 정보, 멤버십, 횟수 내역을 통합 관리합니다.",
    guest: "비회원 AI 사용량을 관리합니다.",
    posts: "커뮤니티 게시글을 검수하고 정리합니다.",
    board: "게시판 카테고리와 태그를 관리합니다.",
    inquiries: "고객 문의 상태와 답변을 처리합니다.",
    appFeedback: "앱 피드백을 확인하고 상태를 변경합니다.",
    chat: "사용자 문의에 실시간으로 답변합니다.",
  }[tab] || "관리자 작업을 처리합니다.";
  const refreshAdminData = () => {
    loadMembers(); loadPosts(); loadAiLogs(); loadMonthlyAiLogs(); loadProgramLogs(); loadDailySignups(); loadDailyAiUsage();
    loadSubs(); loadTrials();
    adminApi("online_count").then(d=>setOnlineCount(d.count||0)).catch(()=>{});
    if (tab === "board") loadBoardCats();
    showToast("관리자 데이터 새로고침 완료");
  };
  const isSaasAiUsageLog = (log) => {
    const reason = String(log?.reason || "");
    const delta = Number(log?.delta || 0);
    if (reason.includes("[PENTEST") || reason.includes("PENTEST") || reason.includes("IDOR")) return false;
    if (reason.includes("NaverBot") || reason.includes("데스크톱")) return false;
    if (reason.includes("구독 시작") || reason.includes("구독 갱신") || reason.includes("추천")) return false;
    if (delta < -1000) return false;
    return delta < 0;
  };
  const memberMonthlySaasUsage = (m) => {
    const write = Number(m?.monthly_used_write ?? m?.monthly_used ?? 0);
    const video = Number(m?.monthly_used_video || 0);
    return { write, video, total: write + video };
  };
  const saasLogUsageCount = (log) => Math.max(1, Math.abs(Number(log?.delta || 0)));
  const saasLogKey = (log) => log?.id || `${log?.uid || ""}-${log?.created_at || ""}-${log?.reason || ""}-${log?.delta || ""}`;
  const dedupeSaasLogs = (logs = []) => {
    const seen = new Set();
    return logs.filter(log => {
      const key = saasLogKey(log);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const buildMonthlySaasUsers = (sourceMembers = members, sourceLogs = monthlyAiLogs) => {
    const monthlyLogByUid = {};
    sourceLogs.filter(isSaasAiUsageLog).forEach(l => {
      const uid = l.uid || "unknown";
      if (!monthlyLogByUid[uid]) monthlyLogByUid[uid] = { write: 0, video: 0, total: 0, lastAt: l.created_at };
      const reason = String(l.reason || "").toLowerCase();
      const count = saasLogUsageCount(l);
      if (reason.includes("video") || reason.includes("영상")) monthlyLogByUid[uid].video += count;
      else monthlyLogByUid[uid].write += count;
      monthlyLogByUid[uid].total += count;
      if (l.created_at && (!monthlyLogByUid[uid].lastAt || l.created_at > monthlyLogByUid[uid].lastAt)) monthlyLogByUid[uid].lastAt = l.created_at;
    });
    const memberByUid = {};
    sourceMembers.forEach(m => { if (m.uid) memberByUid[m.uid] = m; });
    return Array.from(new Set([
      ...sourceMembers.filter(m => memberMonthlySaasUsage(m).total > 0).map(m => m.uid),
      ...Object.keys(monthlyLogByUid),
    ])).map(uid => {
      const m = memberByUid[uid] || { uid };
      const log = monthlyLogByUid[uid] || { write: 0, video: 0, total: 0 };
      const db = memberMonthlySaasUsage(m);
      return {
        ...m,
        _monthlyWrite: Math.max(db.write, log.write),
        _monthlyVideo: Math.max(db.video, log.video),
        _monthlyLogTotal: log.total,
        _monthlyDbTotal: db.total,
        _monthlyLastAt: log.lastAt || m.updated_at || m.created_at,
      };
    })
      .filter(m => m._monthlyWrite > 0 || m._monthlyVideo > 0 || m._monthlyLogTotal > 0)
      .sort((a,b) => ((b._monthlyWrite + b._monthlyVideo) || b._monthlyLogTotal) - ((a._monthlyWrite + a._monthlyVideo) || a._monthlyLogTotal));
  };
  const programLogUid = (log) => log?.license_key || log?.uid || log?.user_id || "";
  const programLogLabel = (log) => cleanPostText(log?.title || log?.topic || "콘텐츠 생성") || "콘텐츠 생성";
  const programLogMember = (log) => members.find(m => m.uid === programLogUid(log));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif", background: shellBg }}>
      {/* 토스트 */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: accent, color: "#fff", padding: "14px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(37,99,235,0.24)", animation: "fadein 0.2s", fontFamily: "inherit" }}>
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
        width: 230, flexShrink: 0, padding: "24px 16px",
        background: isDark ? "rgba(12,10,26,0.96)" : "#fff",
        overflowY: "auto", position: "sticky", top: 0, height: "100vh",
        ...(typeof window !== "undefined" && window.innerWidth < 768 ? { position: "fixed", left: sideOpen ? 0 : -250, zIndex: 1000, transition: "left 0.25s", boxShadow: sideOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none" } : {}),
      }}>
        {/* 로고 */}
        <div style={{ padding: "0 8px 24px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color:"#fff", fontSize:13, fontWeight:900 }}>
              A
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>SNS메이킷</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        {(() => {
          const recentMemberCnt = members.filter(m => { const d = m.join_date||m.created_at; return d && Date.now()-new Date(d).getTime()<7*86400000; }).length;
          const menuItems = [
            { group: "대시보드", items: [
              ["stats", "홈", "M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z"],
              ["logs", "SaaS 사용 로그", "", programLogs.length || null],
              ["visitors", "접속 분석", "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"],
            ]},
            { group: "회원", items: [
              ["members", "회원 관리", "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", recentMemberCnt||null],
              ["guest", "비회원", "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"],
            ]},
            { group: "콘텐츠", items: [
              ["posts", "게시글", "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2", posts.length||null],
              ["board", "게시판", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
            ]},
            { group: "고객", items: [
              ["inquiries", "문의", "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"],
              ["appFeedback", "앱 피드백", "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"],
              ["chat", "실시간 채팅", "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
            ]},
          ];
          return menuItems.map(({ group, items }) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.3)" : "#a0aec0", textTransform: "uppercase", padding: "0 12px", marginBottom: 6, letterSpacing: 1.2 }}>{group}</div>
              {items.map(([id, label, pathD, badge]) => {
                const active = tab === id;
                return (
                  <button key={id} onClick={() => { setTab(id); setSideOpen(false); }} style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 13, fontWeight: active ? 600 : 500, fontFamily: "inherit",
                    background: active ? activeBg : "transparent",
                    color: active ? accent : (isDark ? "rgba(255,255,255,0.55)" : "#64748b"),
                    marginBottom: 2, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:active ? accent : (isDark ? "rgba(255,255,255,0.25)" : "#cbd5e1"), flexShrink:0 }} />
                    <span style={{ flex:1 }}>{label}</span>
                    {badge && <span style={{ fontSize:10, fontWeight:700, minWidth:20, height:20, borderRadius:99, display:"flex", alignItems:"center", justifyContent:"center", background:active?blueSoft:"rgba(37,99,235,0.08)", color:active?accent:(isDark?"rgba(255,255,255,0.4)":"#94a3b8") }}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ));
        })()}

        {/* 하단 관리자 프로필 */}
        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: `1px solid ${panelBorder}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:99, background:accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {(adminUser?.nick||adminUser?.email||"A")[0].toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{adminUser?.nick||"관리자"}</div>
              <div style={{ fontSize:10, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8" }}>{adminUser?.email?.slice(0,20)||"Admin"}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>회원</span><b style={{ color: C.text, fontWeight: 700 }}>{loadingMembers ? "..." : members.length.toLocaleString()}명</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>게시글</span><b style={{ color: C.text, fontWeight: 700 }}>{posts.length.toLocaleString()}개</b></div>
          </div>
        </div>
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <main style={{ flex: 1, width: "100%", maxWidth: 1320, margin: "0 auto", boxSizing: "border-box", padding: "32px clamp(18px, 3vw, 36px) 80px", overflowY: "auto", background: shellBg }}>
        {/* 상단 헤더 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.3)":"#94a3b8", fontWeight:500, marginBottom:4 }}>
              {new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}
            </div>
            <h2 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>{adminTitle}</h2>
            <div style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 13, marginTop: 4, fontWeight: 400 }}>{adminDesc}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* CSV 내보내기 (회원 탭) */}
            {tab === "members" && (
              <button onClick={() => {
                const csv = ["닉네임,이메일,플랜,잔여횟수,가입일"];
                members.forEach(m => {
                  const sub = subs.find(s=>s.uid===m.uid);
                  csv.push([m.nick||"-", m.email||"-", sub?.product_name||"Free", Math.floor(m.points||0), (m.join_date||m.created_at||"-").slice(0,10)].map(v=>`"${v}"`).join(","));
                });
                const blob = new Blob(["\uFEFF"+csv.join("\n")], {type:"text/csv;charset=utf-8"});
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `members_${new Date().toISOString().slice(0,10)}.csv`; a.click();
                showToast("CSV 내보내기 완료");
              }} style={{
                padding:"9px 16px", borderRadius:10, border:`1px solid ${panelBorder}`,
                background:panelBg, color:isDark?"rgba(255,255,255,0.6)":"#64748b", fontSize:12, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
            )}
            <button onClick={refreshAdminData} style={{
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: accent, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(84,111,255,0.25)",
            }}>
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

        // AI 사용 분석 데이터
        const aiOnly = aiLogs.filter(isSaasAiUsageLog);
        const byReason = {};
        aiOnly.forEach(l => { const r = l.reason || "기타"; byReason[r] = (byReason[r]||0) + 1; });
        const totalAiUsage = aiOnly.length;
        const reasonEntries = Object.entries(byReason).sort((a,b)=>b[1]-a[1]);
        const donutColors = ["#2563eb","#1d4ed8","#3b82f6","#60a5fa","#0ea5e9","#0284c7","#0369a1","#93c5fd"];

        // SVG 라인 차트 헬퍼
        const makeLine = (data, w, h, pad) => {
          if (!data.length) return "";
          const max = Math.max(...data.map(d=>d.count),1);
          const step = (w - pad*2) / Math.max(data.length-1,1);
          return data.map((d,i) => {
            const x = pad + i*step;
            const y = h - pad - (d.count/max)*(h-pad*2);
            return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
        };
        const makeArea = (data, w, h, pad) => {
          const line = makeLine(data,w,h,pad);
          if (!line) return "";
          const step = (w - pad*2) / Math.max(data.length-1,1);
          return `${line} L${(pad+(data.length-1)*step).toFixed(1)},${(h-pad).toFixed(1)} L${pad},${(h-pad).toFixed(1)} Z`;
        };

        const cW = 520, cH = 180, cPad = 30;

        return (
        <div>
          {/* ── 요약 카드 4열 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:18, marginBottom:28 }}>
            {[
              { n: totalMembers.toLocaleString()+"+", l: "전체 회원", sub: recentMembers ? `+${recentMembers} 이번주` : null, color:accent },
              { n: (onlineCount||0).toLocaleString()+"+", l: "실시간 접속", sub: null, color:blueDeep },
              { n: totalPosts.toLocaleString()+"+", l: "전체 게시글", sub: todayPosts ? `+${todayPosts} 오늘` : null, color:"#0ea5e9" },
              { n: totalAiUsage.toLocaleString()+"+", l: "웹 AI 사용량", sub: null, color:blueMuted },
            ].map((s,i) => (
              <div key={i} style={{ padding:"22px 24px", borderRadius:16, background:panelBg, border:`1px solid ${panelBorder}`, boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ width:10, height:10, borderRadius:99, background:s.color }} />
                  {s.sub && <span style={{ fontSize:11, fontWeight:600, color:accent, background:blueSoft, padding:"3px 10px", borderRadius:99 }}>{s.sub}</span>}
                </div>
                <div style={{ fontSize:28, fontWeight:800, color:C.text, letterSpacing:-0.5, lineHeight:1 }}>{s.n}</div>
                <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontWeight:500, marginTop:6 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* ── Reports 라인차트 + Analytics 도넛 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap:18, marginBottom:24 }}>
            {/* Reports — SVG 라인 차트 */}
            <div style={{ ...cardStyle, padding:"24px 28px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text }}>Reports</div>
                <div style={{ display:"flex", gap:16, fontSize:11, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:8, height:8, borderRadius:99, background:"#546FFF", display:"inline-block" }}/>가입자</span>
                  <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:8, height:8, borderRadius:99, background:blueMuted, display:"inline-block" }}/>AI 사용</span>
                </div>
              </div>
              {dailySignups.length > 0 ? (
                <svg viewBox={`0 0 ${cW} ${cH}`} style={{ width:"100%", height:180 }}>
                  {/* 가로 그리드 */}
                  {[0,1,2,3,4].map(i => {
                    const y = cPad + i*(cH-cPad*2)/4;
                    return <line key={i} x1={cPad} y1={y} x2={cW-cPad} y2={y} stroke={isDark?"rgba(255,255,255,0.06)":"#f0f0f0"} strokeWidth="1"/>;
                  })}
                  {/* 가입자 라인 */}
                  <path d={makeArea(dailySignups,cW,cH,cPad)} fill="rgba(84,111,255,0.06)" />
                  <path d={makeLine(dailySignups,cW,cH,cPad)} fill="none" stroke="#546FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* AI 사용 라인 */}
                  {dailyAiUsage.length > 0 && <>
                    <path d={makeArea(dailyAiUsage,cW,cH,cPad)} fill="rgba(245,158,11,0.06)" />
                    <path d={makeLine(dailyAiUsage,cW,cH,cPad)} fill="none" stroke={blueMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3"/>
                  </>}
                  {/* 포인트 + 라벨 */}
                  {dailySignups.map((d,i) => {
                    const max = Math.max(...dailySignups.map(x=>x.count),1);
                    const step = (cW-cPad*2)/Math.max(dailySignups.length-1,1);
                    const x = cPad+i*step, y = cH-cPad-(d.count/max)*(cH-cPad*2);
                    return <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#546FFF" stroke={isDark?"#1a1730":"#fff"} strokeWidth="2"/>
                      <text x={x} y={cH-8} textAnchor="middle" fontSize="10" fill={isDark?"rgba(255,255,255,0.35)":"#94a3b8"}>{d.date.slice(5)}</text>
                      {d.count > 0 && <text x={x} y={y-10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#546FFF">{d.count}</text>}
                    </g>;
                  })}
                </svg>
              ) : (
                <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:13 }}>데이터 없음</div>
              )}
            </div>

            {/* Analytics — 도넛 차트 */}
            <div style={{ ...cardStyle, padding:"24px 28px", display:"flex", flexDirection:"column" }}>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:18 }}>Analytics</div>
              {reasonEntries.length > 0 ? (() => {
                const total = reasonEntries.reduce((s,e)=>s+e[1],0);
                let cumAngle = 0;
                const arcs = reasonEntries.slice(0,6).map(([r,c],i) => {
                  const pct = c/total;
                  const start = cumAngle;
                  cumAngle += pct*360;
                  const end = cumAngle;
                  const sr = start*Math.PI/180, er = end*Math.PI/180;
                  const cx=80, cy=80, R=65, r2=40;
                  const x1=cx+R*Math.sin(sr), y1=cy-R*Math.cos(sr);
                  const x2=cx+R*Math.sin(er), y2=cy-R*Math.cos(er);
                  const x3=cx+r2*Math.sin(er), y3=cy-r2*Math.cos(er);
                  const x4=cx+r2*Math.sin(sr), y4=cy-r2*Math.cos(sr);
                  const large = pct > 0.5 ? 1 : 0;
                  return <path key={i} d={`M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${large} 0 ${x4},${y4} Z`} fill={donutColors[i%donutColors.length]}/>;
                });
                const topPct = total > 0 ? Math.round((reasonEntries[0][1]/total)*100) : 0;
                return <>
                  <div style={{ display:"flex", justifyContent:"center", position:"relative" }}>
                    <svg viewBox="0 0 160 160" style={{ width:140, height:140 }}>{arcs}</svg>
                    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                      <div style={{ fontSize:26, fontWeight:900, color:C.text }}>{topPct}%</div>
                      <div style={{ fontSize:10, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8" }}>{reasonEntries[0][0].length>6?reasonEntries[0][0].slice(0,6)+"..":reasonEntries[0][0]}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginTop:14, justifyContent:"center" }}>
                    {reasonEntries.slice(0,6).map(([r],i) => (
                      <span key={r} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:isDark?"rgba(255,255,255,0.5)":"#64748b" }}>
                        <span style={{ width:8, height:8, borderRadius:99, background:donutColors[i%donutColors.length], display:"inline-block" }}/>{r.length>8?r.slice(0,8)+"..":r}
                      </span>
                    ))}
                  </div>
                </>;
              })() : (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:13 }}>AI 사용 데이터 없음</div>
              )}
            </div>
          </div>

          {/* ── 보조 지표 4열 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:14, marginBottom:24 }}>
            {[
              { n: todayPosts, l: "오늘 게시글", color:"#06b6d4" },
              { n: totalViews.toLocaleString(), l: "총 조회수", color:"#546FFF" },
              { n: totalLikes, l: "총 좋아요", color:"#0ea5e9" },
              { n: totalComments, l: "총 댓글", color:blueMuted },
            ].map((s,i) => (
              <div key={i} style={{ padding:"16px 20px", borderRadius:14, background:panelBg, border:`1px solid ${panelBorder}`, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:10, height:36, borderRadius:5, background:s.color, flexShrink:0, opacity:0.7 }}/>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{s.n}</div>
                  <div style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontWeight:500, marginTop:1 }}>{s.l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── 인기 게시글 + 활발한 작성자 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap:18, marginBottom:24 }}>
            {/* 인기 게시글 TOP10 */}
            <div style={cardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text }}>인기 게시글 TOP10</div>
                <span style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>조회수 기준</span>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr>
                      {["#","제목","조회","좋아요","댓글","작성자"].map((h,i) => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:i>=2&&i<=4?"right":"left", color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", fontWeight:600, fontSize:12, borderBottom:`2px solid ${isDark?"rgba(255,255,255,0.06)":"#eef0f6"}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {popularPosts.map((p,i) => (
                      <tr key={p.id} style={{ transition:"background 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.02)":"#fafbfe"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"10px 12px", fontWeight:800, color:i<3?accent:(isDark?"rgba(255,255,255,0.3)":"#c0c0c0"), fontSize:14 }}>{i+1}</td>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:C.text, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cleanPostText(p.title)}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right" }}>
                          <span style={{ background:"rgba(6,182,212,0.1)", color:"#06b6d4", fontWeight:700, fontSize:12, padding:"3px 10px", borderRadius:99 }}>{(p.views||0).toLocaleString()}</span>
                        </td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:"#0ea5e9", fontSize:12 }}>{p.likes||0}</td>
                        <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:blueMuted, fontSize:12 }}>{(p.comments||[]).length}</td>
                        <td style={{ padding:"10px 12px", color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontSize:12 }}>{p.nick}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 활발한 작성자 + 카테고리 */}
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div style={cardStyle}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:14 }}>활발한 작성자 TOP10</div>
                {topList.length === 0 ? <div style={{ color:C.muted, fontSize:12 }}>데이터 없음</div> : topList.map(([nick,cnt],i) => (
                  <div key={nick} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:99, background:i<3?`${donutColors[i]}18`:isDark?"rgba(255,255,255,0.04)":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:i<3?donutColors[i]:(isDark?"rgba(255,255,255,0.35)":"#94a3b8"), flexShrink:0 }}>{i+1}</div>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:accent }}>{cnt}건</span>
                  </div>
                ))}
              </div>
              {/* 카테고리별 게시글 — 가로 바 */}
              <div style={cardStyle}>
                <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:14 }}>카테고리별 게시글</div>
                {Object.entries(catStats).sort((a,b)=>b[1]-a[1]).map(([cat,cnt],i) => {
                  const maxCat = Math.max(...Object.values(catStats),1);
                  return (
                    <div key={cat} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:C.text, minWidth:60 }}>{cat}</span>
                      <div style={{ flex:1, height:10, borderRadius:5, background:isDark?"rgba(255,255,255,0.04)":"#f0f1f5", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:5, background:i%2===0?accent:blueMuted, width:`${Math.max(4,(cnt/maxCat)*100)}%`, transition:"width 0.4s" }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:accent, minWidth:36, textAlign:"right" }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 검색엔진 노출 안내 ── */}
          <div style={{ marginTop:24, padding:"20px 24px", borderRadius:14, background:panelBg, border:`1px solid ${panelBorder}` }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:12 }}>검색엔진 노출 현황</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
              {[
                { name:"Google Search Console", url:"https://search.google.com/search-console", desc:"검색 노출 관리", color:"#4285f4" },
                { name:"Naver Search Advisor", url:"https://searchadvisor.naver.com", desc:"네이버 검색 노출", color:"#03cf5d" },
                { name:"Google Analytics", url:"https://analytics.google.com", desc:"트래픽/유입 분석", color:"#e37400" },
                { name:"Bing Webmaster", url:"https://www.bing.com/webmasters", desc:"Bing 검색 관리", color:"#008373" },
              ].map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:10, background:isDark?"rgba(255,255,255,0.02)":"#fafbfe", border:`1px solid ${panelBorder}`, textDecoration:"none", transition:"border-color 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=s.color}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=panelBorder}>
                  <div style={{ width:8, height:32, borderRadius:4, background:s.color, flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.name}</div>
                    <div style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8" }}>{s.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* ── 플랜 분포 + 최근 활동 ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap:18, marginTop:24 }}>
            {/* 플랜 분포 */}
            <div style={cardStyle}>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:18 }}>플랜 분포</div>
              {(() => {
                const planCount = {};
                members.forEach(m => {
                  const sub = subs.find(s=>s.uid===m.uid);
                  const p = sub?.product_name || "Free";
                  planCount[p] = (planCount[p]||0)+1;
                });
                const entries = Object.entries(planCount).sort((a,b)=>b[1]-a[1]);
                const total = members.length || 1;
                const planColors = {Free:"#94a3b8",Basic:"#3b82f6",Pro:"#2563eb",Premium:"#1d4ed8",Business:"#0ea5e9",Agency:"#0369a1"};
                let cum = 0;
                const arcs = entries.map(([p,c],i) => {
                  const pct = c/total;
                  const start = cum; cum += pct*360;
                  const sr = start*Math.PI/180, er = cum*Math.PI/180;
                  const cx=70,cy=70,R=55,r2=35;
                  const large = pct>0.5?1:0;
                  return <path key={p} d={`M${cx+R*Math.sin(sr)},${cy-R*Math.cos(sr)} A${R},${R} 0 ${large} 1 ${cx+R*Math.sin(er)},${cy-R*Math.cos(er)} L${cx+r2*Math.sin(er)},${cy-r2*Math.cos(er)} A${r2},${r2} 0 ${large} 0 ${cx+r2*Math.sin(sr)},${cy-r2*Math.cos(sr)} Z`} fill={planColors[p]||donutColors[i%donutColors.length]}/>;
                });
                return <>
                  <div style={{ display:"flex", justifyContent:"center", position:"relative", marginBottom:16 }}>
                    <svg viewBox="0 0 140 140" style={{ width:120, height:120 }}>{arcs}</svg>
                    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:900, color:C.text }}>{total}</div>
                      <div style={{ fontSize:9, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8" }}>전체 회원</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {entries.map(([p,c]) => (
                      <div key={p} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:10, height:10, borderRadius:99, background:planColors[p]||"#888", flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:C.text, flex:1, fontWeight:600 }}>{p}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:isDark?"rgba(255,255,255,0.5)":"#64748b" }}>{c}명</span>
                        <span style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.3)":"#94a3b8", minWidth:36, textAlign:"right" }}>{Math.round(c/total*100)}%</span>
                      </div>
                    ))}
                  </div>
                </>;
              })()}
            </div>

            {/* 최근 활동 타임라인 */}
            <div style={cardStyle}>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:18 }}>최근 활동</div>
              <div style={{ maxHeight:320, overflowY:"auto" }}>
                {(() => {
                  const timeline = [];
                  // 최근 가입 회원
                  members.slice(0,5).forEach(m => {
                    const d = m.join_date||m.created_at;
                    if (d) timeline.push({ type:"join", time:new Date(d), label:`${m.nick||"회원"} 가입`, sub:m.email, color:"#22c55e", icon:"M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" });
                  });
                  // 최근 exe 프로그램 사용
                  programLogs.slice(0,8).forEach(l => {
                    const d = l.created_at ? new Date(l.created_at) : null;
                    if (d && !isNaN(d)) {
                      const uid = programLogUid(l);
                      const member = programLogMember(l);
                      const nick = member?.nick || member?.email || uid?.slice(0,6) || "회원";
                      const tokens = Number(l.tokens_used || 0);
                      timeline.push({ type:"program", time:d, label:`${nick} — exe SaaS 사용`, sub:tokens > 0 ? `${tokens.toLocaleString()} tokens` : programLogLabel(l), color:blueMuted, icon:"M13 2L3 14h7l-1 8 11-14h-7l1-6z" });
                    }
                  });
                  // 최근 게시글
                  posts.slice(0,3).forEach(p => {
                    const d = typeof p.date==="string" ? new Date(p.date) : null;
                    if (d && !isNaN(d)) timeline.push({ type:"post", time:d, label:`${p.nick||"회원"} — "${cleanPostText(p.title).slice(0,20)}"`, sub:"게시글 작성", color:"#0ea5e9", icon:"" });
                  });
                  timeline.sort((a,b)=>b.time-a.time);
                  if (timeline.length===0) return <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:20 }}>활동 데이터 없음</div>;
                  const now = Date.now();
                  const ago = (t) => {
                    const diff = now - t.getTime();
                    if (diff<60000) return "방금 전";
                    if (diff<3600000) return Math.floor(diff/60000)+"분 전";
                    if (diff<86400000) return Math.floor(diff/3600000)+"시간 전";
                    return Math.floor(diff/86400000)+"일 전";
                  };
                  return timeline.slice(0,12).map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:12, marginBottom:0 }}>
                      {/* 타임라인 라인 */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:28, flexShrink:0 }}>
                        <div style={{ width:28, height:28, borderRadius:99, background:`${item.color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                        </div>
                        {i<timeline.slice(0,12).length-1 && <div style={{ width:2, flex:1, background:isDark?"rgba(255,255,255,0.04)":"#eef0f6" }}/>}
                      </div>
                      {/* 내용 */}
                      <div style={{ flex:1, paddingBottom:14, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.label}</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:2 }}>
                          <span style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8" }}>{item.sub}</span>
                          <span style={{ fontSize:10, color:isDark?"rgba(255,255,255,0.25)":"#c0c0c0" }}>{ago(item.time)}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ─────────────── SaaS 사용 로그 ─────────────── */}
      {tab === "logs" && (() => {
        const programOnly = [...programLogs].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const byUser = {};
        programOnly.forEach(l => {
          const uid = programLogUid(l) || "unknown";
          byUser[uid] = (byUser[uid] || 0) + 1;
        });
        const topUsers = Object.entries(byUser).sort((a,b)=>b[1]-a[1]).slice(0,6);
        const uniqueUsers = new Set(programOnly.map(programLogUid).filter(Boolean)).size;
        const todayKey = new Date().toISOString().slice(0, 10);
        const todayProgramCount = programOnly.filter(l => String(l.created_at || "").slice(0, 10) === todayKey).length;
        const mostActiveCount = topUsers[0]?.[1] || 0;
        const periodLabel = {day:"오늘",week:"이번 주",month:"이번 달"}[logPeriod];
        const logCard = { ...cardStyle, padding: "18px 20px" };
        const compactLogItem = (children, key) => (
          <div key={key} style={{
            display:"grid", gridTemplateColumns:isMobileAdmin ? "1fr" : "minmax(140px, 0.85fr) minmax(0, 1.5fr) auto", gap:12,
            alignItems:"center", padding:"12px 14px", borderRadius:12,
            background:isDark?"rgba(255,255,255,0.025)":"#fafbfe",
            border:`1px solid ${isDark?"rgba(255,255,255,0.04)":"#f0f1f4"}`,
          }}>
            {children}
          </div>
        );

        return (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[["day","일간"],["week","주간"],["month","월간"]].map(([k,l]) => (
                <button key={k} onClick={() => switchLogPeriod(k)}
                  style={{ padding:"8px 18px", borderRadius:10, border:`1px solid ${logPeriod===k?accent:panelBorder}`, background:logPeriod===k?accent:panelBg, color:logPeriod===k?"#fff":C.text, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12, marginBottom:18 }}>
            {[
              { label: `exe 사용 횟수 (${periodLabel})`, value: programOnly.length + "회", color: accent },
              { label: "사용 회원", value: uniqueUsers + "명", color: "#0ea5e9" },
              { label: "오늘 사용", value: todayProgramCount + "회", color: "#2563eb" },
              { label: "최다 사용", value: mostActiveCount + "회", color: "#60a5fa" },
            ].map(r => (
              <div key={r.label} style={{ padding:"16px 18px", borderRadius:14, background:panelBg, border:`1px solid ${panelBorder}` }}>
                <div style={{ fontSize:22, fontWeight:900, color:r.color, lineHeight:1 }}>{r.value}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:6, fontWeight:600 }}>{r.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap:14, marginBottom:18 }}>
            <div style={logCard}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>exe 사용 TOP</div>
              {topUsers.length === 0 ? <div style={{ color:C.muted, fontSize:13, padding:"18px 0" }}>데이터 없음</div> :
                topUsers.map(([uid,c],i) => {
                  const member = members.find(m=>m.uid===uid);
                  const nick = member?.nick || uid?.slice(0,8) || "?";
                  return (
                    <div key={uid} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<topUsers.length-1?`1px solid ${panelBorder}`:"none" }}>
                      <div style={{ width:26, height:26, borderRadius:8, background:`${accent}14`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:accent, flexShrink:0 }}>{i+1}</div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:13, color:C.text, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</div>
                        <div style={{ fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member?.email || uid}</div>
                      </div>
                      <span style={{ fontSize:13, fontWeight:900, color:accent }}>{c}회</span>
                    </div>
                  );
                })
              }
            </div>

            <div style={logCard}>
              <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>최근 exe 실행</div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {programOnly.slice(0,6).length === 0 ? <div style={{ color:C.muted, fontSize:13, padding:"18px 0" }}>데이터 없음</div> :
                  programOnly.slice(0,6).map((l,i) => {
                    const member = programLogMember(l);
                    const uid = programLogUid(l);
                    return (
                      <div key={l.id || i} style={{ display:"flex", justifyContent:"space-between", gap:12, paddingBottom:i<Math.min(programOnly.length,6)-1?9:0, borderBottom:i<Math.min(programOnly.length,6)-1?`1px solid ${panelBorder}`:"none" }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, color:C.text, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member?.nick || member?.email || uid?.slice(0,8) || "회원"}</div>
                          <div style={{ fontSize:11, color:C.muted }}>{l.created_at ? new Date(l.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "-"}</div>
                        </div>
                        <span style={{ fontSize:12, color:accent, fontWeight:900, flexShrink:0 }}>1회</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          <div style={logCard}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>exe 프로그램 사용 내역</div>
            <div style={{ maxHeight:560, overflowY:"auto", display:"flex", flexDirection:"column", gap:7 }}>
              {programOnly.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:13 }}>{programLogsLoading ? "로딩중..." : "exe 프로그램 사용 기록이 없습니다."}</div>
              ) : programOnly.slice(0,100).map((l,i) => {
                  const member = programLogMember(l);
                  const uid = programLogUid(l);
                  const nick = member?.nick || uid?.slice(0,8) || "회원";
                  return compactLogItem(<>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</div>
                      <div style={{ fontSize:11, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member?.email || uid || "-"}</div>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, color:C.text, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{programLogLabel(l)}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{l.created_at ? new Date(l.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "-"}</div>
                    </div>
                    <span style={{ justifySelf:"end", fontSize:11, padding:"3px 9px", borderRadius:99, background:`${accent}15`, color:accent, fontWeight:800 }}>1회</span>
                  </>, i);
                })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ─────────────── 회원 관리 ─────────────── */}
      {tab === "members" && (() => {
        const mTotalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);
        const mCurPage = Math.min(memberPage, mTotalPages || 1);
        const pagedMembers = filteredMembers.slice((mCurPage-1)*PAGE_SIZE, mCurPage*PAGE_SIZE);
        return (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontWeight: 500 }}>
              총 {members.length.toLocaleString()}명 {search && `· 검색 결과 ${filteredMembers.length.toLocaleString()}명`} · {mCurPage}/{mTotalPages||1} 페이지
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? "rgba(255,255,255,0.3)" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => { setSearch(e.target.value); setMemberPage(1); }} placeholder="Search"
                  style={{ padding: "10px 14px 10px 36px", borderRadius: 10, border: `1px solid ${panelBorder}`, background: panelBg, color: C.text, fontSize: 13, outline: "none", width: 220, fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {loadingMembers && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>회원 목록 불러오는 중...</div>}
          {!loadingMembers && filteredMembers.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
              {search ? "검색 결과가 없어요" : "가입한 회원이 없어요"}
            </div>
          )}

          {/* 테이블 */}
          {!loadingMembers && filteredMembers.length > 0 && (
            <div style={{ background: panelBg, borderRadius: 16, overflow: "hidden", boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 60px", gap: 0, padding: "14px 24px", fontSize: 12, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}>
                <span>Name</span>
                <span>Plan</span>
                <span>Credits</span>
                <span>Joined</span>
                <span></span>
              </div>

              {pagedMembers.map(m => {
                const uid = m.uid || m.id || "";
                const ptVal = ptInputs[uid] || "";
                const sub = getSub(uid);
                const trial = getTrial(m);
                const currentPlan = sub?.product_name || "Free";
                const isExpanded = expandedUid === uid;
                const hist = memberHistory[uid] || [];
                const roleBg = m.role === "admin" ? "rgba(251,191,36,0.12)" : m.role === "instructor" ? "rgba(34,197,94,0.12)" : "transparent";
                const roleColor = m.role === "admin" ? "#fbbf24" : m.role === "instructor" ? "#22c55e" : C.muted;
                const roleLabel = m.role === "admin" ? "관리자" : m.role === "instructor" ? "강사" : "";
                const planColor = currentPlan === "Free" ? C.muted : "#3b82f6";
                const planBg = currentPlan === "Free" ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)") : "rgba(59,130,246,0.1)";

                return (
                  <div key={uid}>
                    {/* 한 줄 요약 행 */}
                    <div onClick={() => toggleExpand(uid)} style={{
                      display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 60px", gap: 0, padding: "14px 24px", alignItems: "center",
                      borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6"}`,
                      cursor: "pointer", transition: "background 0.15s",
                      background: isExpanded ? (isDark ? "rgba(84,111,255,0.06)" : "rgba(84,111,255,0.02)") : "transparent",
                    }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "#fafbfe"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? (isDark ? "rgba(84,111,255,0.06)" : "rgba(84,111,255,0.02)") : "transparent"; }}
                    >
                      {/* 회원 정보 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 99, background: blueSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>
                          {(m.nick||"?")[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nick || "-"}</span>
                            {roleLabel && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 600, background: roleBg, color: roleColor }}>{roleLabel}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                        </div>
                      </div>
                      {/* 플랜 */}
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, background: planBg, color: planColor }}>{currentPlan}</span>
                        {trial && <div style={{ fontSize: 9, color: accent, fontWeight: 600, marginTop: 3 }}>체험 중</div>}
                      </div>
                      {/* 잔여 횟수 */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{Math.floor(m.points || 0)}<span style={{ fontSize: 11, fontWeight: 400, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginLeft: 2 }}>회</span></div>
                      {/* 가입일 */}
                      <div style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8" }}>
                        {(m.join_date || m.created_at) ? new Date(m.join_date || m.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                      </div>
                      {/* 더보기 */}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: isExpanded ? (isDark ? "rgba(84,111,255,0.15)" : "rgba(84,111,255,0.08)") : "transparent", transition: "background 0.15s" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isExpanded ? accent : (isDark ? "rgba(255,255,255,0.3)" : "#94a3b8")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 펼침 상세 패널 */}
                    {isExpanded && (
                      <div style={{ padding: "20px 24px 24px", background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfe", borderTop: `1px solid ${panelBorder}` }}>
                        {/* 상단: 3열 정보 카드 */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                          {/* 멤버십 */}
                          <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 18px" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginBottom: 10, letterSpacing: 0.3 }}>멤버십</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <select value={currentPlan} onChange={e => { e.stopPropagation(); setPlan(uid, e.target.value); }}
                                style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: inputBg, color: C.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                {PLAN_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <button onClick={e => { e.stopPropagation(); grantProTrial(m); }}
                              style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${bdr}`, background: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.06)", color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              Pro 체험 부여
                            </button>
                            <button onClick={e => { e.stopPropagation(); toggleModerator(m); }}
                              style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${bdr}`, marginTop: 4, background: m.role === "moderator" ? (isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.08)") : (isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.06)"), color: m.role === "moderator" ? "#f97316" : "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {m.role === "moderator" ? "프로그램 권한 해제" : "프로그램 권한 부여"}
                            </button>
                            {trial && <div style={{ fontSize: 10, color: "#2563eb", marginTop: 6, fontWeight: 600 }}>~{new Date(trial.expires_at).toLocaleDateString("ko-KR")} 까지</div>}
                          </div>

                          {/* 횟수 관리 */}
                          <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 18px" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginBottom: 10, letterSpacing: 0.3 }}>횟수 관리</div>
                            <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                              {[5, 10, 20, 50].map(n => (
                                <button key={n} onClick={e => { e.stopPropagation(); grantPoints(uid, n); }} style={{
                                  flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 700,
                                  border: "none", background: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)", color: "#3b82f6" }}>
                                  +{n}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                              {[5, 10, 20, 50].map(n => (
                                <button key={n} onClick={e => { e.stopPropagation(); deductPoints(uid, n); }} style={{
                                  flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 700,
                                  border: "none", background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                                  -{n}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <input value={ptVal} type="number" placeholder="직접 입력"
                                onClick={e => e.stopPropagation()}
                                onChange={e => setPtInputs(p => ({ ...p, [uid]: e.target.value }))}
                                style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: `1px solid ${bdr}`, background: inputBg, color: C.text, fontSize: 11, outline: "none" }} />
                              <button onClick={e => { e.stopPropagation(); grantPoints(uid, ptVal); }} style={{ padding: "5px 8px", borderRadius: 5, border: "none", background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>지급</button>
                              <button onClick={e => { e.stopPropagation(); deductPoints(uid, ptVal); }} style={{ padding: "5px 8px", borderRadius: 5, border: "none", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>차감</button>
                              <button onClick={e => { e.stopPropagation(); setPoints(uid, ptVal); }} style={{ padding: "5px 8px", borderRadius: 5, border: `1px solid ${bdr}`, background: "transparent", color: C.muted, fontSize: 10, cursor: "pointer" }}>설정</button>
                            </div>
                          </div>

                          {/* 위험 작업 */}
                          <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 18px" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginBottom: 10, letterSpacing: 0.3 }}>계정 관리</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              <button onClick={e => { e.stopPropagation(); resetPoints(uid); }} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${blueSoft}`, background: blueSoft, color: accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>횟수 초기화</button>
                              <button onClick={e => { e.stopPropagation(); resetMemberUsage(uid); }} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: C.purpleL, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>AI 사용량 초기화</button>
                              {m.role !== "admin" && (
                                <button onClick={async e => {
                                  e.stopPropagation();
                                  const newRole = m.role === "instructor" ? "member" : "instructor";
                                  const label = newRole === "instructor" ? "강사 권한을 부여" : "강사 권한을 해제";
                                  if (!window.confirm(`${m.nick}님에게 ${label}할까요?`)) return;
                                  try {
                                    await adminApi("update_points", `&uid=${encodeURIComponent(uid)}&role=${newRole}`);
                                    await supabase.from("users").update({ role: newRole }).eq("uid", uid);
                                    setMembers2(prev => prev.map(x => x.uid === uid ? { ...x, role: newRole } : x));
                                    showToast(`${m.nick} → ${newRole === "instructor" ? "강사" : "일반회원"} 변경 완료`);
                                  } catch(err) { showToast("오류: " + err.message); }
                                }}
                                  style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${m.role === "instructor" ? "rgba(34,197,94,0.25)" : bdr}`, background: m.role === "instructor" ? "rgba(34,197,94,0.06)" : "transparent", color: m.role === "instructor" ? "#22c55e" : C.purpleL, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                  {m.role === "instructor" ? "강사 해제" : "강사 부여"}
                                </button>
                              )}
                              {m.role !== "admin" && (
                                <button onClick={e => { e.stopPropagation(); deleteMember(uid, m.nick); }} style={{ width: "100%", padding: "6px 0", borderRadius: 6, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>회원 탈퇴</button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 하단: 횟수 내역 테이블 */}
                        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: "16px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8", marginBottom: 10, letterSpacing: 0.3 }}>최근 횟수 내역</div>
                          {historyLoading[uid] && <div style={{ fontSize: 11, color: C.muted, padding: "8px 0" }}>불러오는 중...</div>}
                          {!historyLoading[uid] && hist.length === 0 && <div style={{ fontSize: 11, color: C.muted, padding: "8px 0" }}>내역이 없습니다</div>}
                          {!historyLoading[uid] && hist.length > 0 && (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${panelBorder}` }}>
                                    <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted, fontWeight: 600 }}>날짜</th>
                                    <th style={{ padding: "5px 8px", textAlign: "left", color: C.muted, fontWeight: 600 }}>사유</th>
                                    <th style={{ padding: "5px 8px", textAlign: "right", color: C.muted, fontWeight: 600 }}>변동</th>
                                    <th style={{ padding: "5px 8px", textAlign: "right", color: C.muted, fontWeight: 600 }}>잔액</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {hist.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6"}` }}>
                                      <td style={{ padding: "5px 8px", color: C.muted, whiteSpace: "nowrap" }}>{new Date(h.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                      <td style={{ padding: "5px 8px", color: C.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.reason}</td>
                                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: h.delta > 0 ? "#10b981" : h.delta < 0 ? "#ef4444" : C.muted }}>{h.delta > 0 ? "+" : ""}{h.delta}</td>
                                      <td style={{ padding: "5px 8px", textAlign: "right", color: C.text, fontWeight: 600 }}>{(h.balance || 0).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* 회원 페이지네이션 */}
              {mTotalPages > 1 && (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:4, padding:"16px 20px", borderTop:`1px solid ${panelBorder}` }}>
                  <button onClick={()=>setMemberPage(p=>Math.max(1,p-1))} disabled={mCurPage<=1}
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid ${panelBorder}`, background:"transparent", color:mCurPage<=1?(isDark?"rgba(255,255,255,0.15)":"#d0d0d0"):accent, cursor:mCurPage<=1?"default":"pointer", fontSize:14, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  {Array.from({length:Math.min(mTotalPages,7)}, (_,i) => {
                    let pg;
                    if (mTotalPages<=7) pg = i+1;
                    else if (mCurPage<=4) pg = i+1;
                    else if (mCurPage>=mTotalPages-3) pg = mTotalPages-6+i;
                    else pg = mCurPage-3+i;
                    return (
                      <button key={pg} onClick={()=>setMemberPage(pg)}
                        style={{ width:32, height:32, borderRadius:8, border:pg===mCurPage?`1.5px solid ${accent}`:`1px solid ${panelBorder}`, background:pg===mCurPage?(isDark?`${accent}15`:`${accent}08`):"transparent", color:pg===mCurPage?accent:(isDark?"rgba(255,255,255,0.5)":"#64748b"), cursor:"pointer", fontSize:12, fontWeight:pg===mCurPage?700:500, fontFamily:"inherit" }}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={()=>setMemberPage(p=>Math.min(mTotalPages,p+1))} disabled={mCurPage>=mTotalPages}
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid ${panelBorder}`, background:"transparent", color:mCurPage>=mTotalPages?(isDark?"rgba(255,255,255,0.15)":"#d0d0d0"):accent, cursor:mCurPage>=mTotalPages?"default":"pointer", fontSize:14, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* ─────────────── 비회원 관리 ─────────────── */}
      {tab === "guest" && (
        <div>
          <div style={{ fontSize:13, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", marginBottom:20, lineHeight:1.7 }}>
            비회원은 브라우저의 localStorage에 사용 기록이 저장됩니다. 초기화 시 5회 무료 이용이 재지급됩니다.
          </div>

          {/* 비회원 사용 현황 */}
          <div style={{ ...cardStyle, marginBottom:18 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:16 }}>사용 현황</div>
            {(() => {
              const u = getAllUsage();
              const guestUsed = u["guest"] || 0;
              const memberEntries = Object.entries(u).filter(([k]) => k.startsWith("member_"));
              const pctUsed = Math.min(100, (guestUsed/FREE_GUEST)*100);
              return (
                <div>
                  {/* 비회원 프로그레스 카드 */}
                  <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px", borderRadius:12, background:isDark?"rgba(255,255,255,0.02)":"#fafbfe", marginBottom:14 }}>
                    <div style={{ width:48, height:48, borderRadius:14, background:"rgba(84,111,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:C.text }}>비회원</span>
                        <span style={{ fontSize:14, fontWeight:800, color:guestUsed>=FREE_GUEST?"#ef4444":accent }}>{guestUsed}/{FREE_GUEST}회</span>
                      </div>
                      <div style={{ height:8, borderRadius:4, background:isDark?"rgba(255,255,255,0.06)":"#eef0f6", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:4, background:guestUsed>=FREE_GUEST?"#ef4444":accent, width:`${pctUsed}%`, transition:"width 0.4s" }}/>
                      </div>
                    </div>
                    <button onClick={resetGuestUsage} style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${panelBorder}`, background:panelBg, color:accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                      초기화
                    </button>
                  </div>

                  {/* 회원 사용 기록 */}
                  {memberEntries.length > 0 && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", marginBottom:10 }}>회원 사용 기록 ({memberEntries.length}건)</div>
                      {memberEntries.map(([k, v]) => {
                        const uid = k.replace("member_", "");
                        const mem = members.find(m => m.id === uid || m.uid === uid);
                        const pct = Math.min(100, (v/FREE_MEMBER)*100);
                        return (
                          <div key={k} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.04)":"#f3f4f6"}` }}>
                            <div style={{ width:30, height:30, borderRadius:99, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:accent, flexShrink:0 }}>
                              {(mem?.nick||"?")[0].toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{mem ? mem.nick : uid}</div>
                              {mem && <div style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8" }}>{mem.email}</div>}
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:v>=FREE_MEMBER?"#ef4444":(isDark?"rgba(255,255,255,0.5)":"#64748b"), minWidth:50, textAlign:"right" }}>{v}/{FREE_MEMBER}</span>
                            <button onClick={() => {
                              const u2 = getAllUsage(); delete u2[k];
                              localStorage.setItem("nper_ai_usage", JSON.stringify(u2));
                              showToast("초기화 완료");
                            }} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${panelBorder}`, background:"transparent", color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>초기화</button>
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
          <div style={{ padding:"18px 22px", borderRadius:14, background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.12)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#ef4444", marginBottom:4 }}>전체 사용 기록 초기화</div>
                <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8" }}>모든 비회원 및 회원의 AI 사용 횟수를 초기화합니다.</div>
              </div>
              <button onClick={() => {
                if (!window.confirm("모든 사용자의 AI 횟수를 초기화하시겠습니까?")) return;
                localStorage.removeItem("nper_ai_usage");
                showToast("전체 초기화 완료");
              }} style={{ padding:"9px 20px", borderRadius:10, border:"1px solid rgba(239,68,68,0.25)", background:"rgba(239,68,68,0.06)", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                전체 초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── 게시글 관리 ─────────────── */}
      {tab === "posts" && (() => {
        const filteredPosts = postSearch.trim()
          ? posts.filter(p => cleanPostText(p.title).toLowerCase().includes(postSearch.toLowerCase()))
          : posts;
        const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
        const curPage = Math.min(postPage, totalPages || 1);
        const pagedPosts = filteredPosts.slice((curPage-1)*PAGE_SIZE, curPage*PAGE_SIZE);
        return (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontWeight:500 }}>
              총 {posts.length.toLocaleString()}개{postSearch.trim() ? ` · 검색 결과 ${filteredPosts.length}개` : ""} · {curPage}/{totalPages||1} 페이지
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ position:"relative" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.3)":"#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={postSearch} onChange={e => { setPostSearch(e.target.value); setPostPage(1); }} placeholder="Search"
                  style={{ padding:"9px 14px 9px 34px", borderRadius:10, border:`1px solid ${panelBorder}`, background:panelBg, color:C.text, fontSize:13, outline:"none", width:200, fontFamily:"inherit" }} />
              </div>
              <button onClick={loadPosts} style={{ padding:"9px 16px", borderRadius:10, border:`1px solid ${panelBorder}`, background:panelBg, color:accent, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>새로고침</button>
            </div>
          </div>
          {loadingPosts && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>게시글 불러오는 중...</div>}
          {!loadingPosts && filteredPosts.length === 0 && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>{postSearch.trim() ? "검색 결과가 없어요" : "게시글이 없어요"}</div>}
          {!loadingPosts && filteredPosts.length > 0 && (
            <div style={{ background:panelBg, borderRadius:16, overflow:"hidden", boxShadow:isDark?"none":"0 1px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", minWidth:760, borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["#","제목","작성자","날짜","조회","좋아요",""].map((h,i) => (
                      <th key={h||i} style={{ padding:"12px 14px", textAlign:i>=4&&i<=5?"right":"left", color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", fontWeight:600, fontSize:12, borderBottom:`2px solid ${isDark?"rgba(255,255,255,0.06)":"#eef0f6"}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedPosts.map((p,i) => (
                    <tr key={p.id} style={{ transition:"background 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.02)":"#fafbfe"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"12px 14px", color:isDark?"rgba(255,255,255,0.3)":"#c0c0c0", fontWeight:600, fontSize:12 }}>{(curPage-1)*PAGE_SIZE+i+1}</td>
                      <td style={{ padding:"12px 14px", fontWeight:600, color:C.text, maxWidth:320, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {cleanPostText(p.title)}
                        {p.subCat && <span style={{ marginLeft:8, fontSize:10, padding:"2px 8px", borderRadius:99, background:isDark?"rgba(255,255,255,0.04)":"#f3f4f6", color:isDark?"rgba(255,255,255,0.4)":"#94a3b8", fontWeight:500 }}>{p.subCat}</span>}
                      </td>
                      <td style={{ padding:"12px 14px", color:isDark?"rgba(255,255,255,0.5)":"#64748b", fontSize:12 }}>{p.nick||"-"}</td>
                      <td style={{ padding:"12px 14px", color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", fontSize:12 }}>{typeof p.date==="string"?p.date.slice(0,10):"-"}</td>
                      <td style={{ padding:"12px 14px", textAlign:"right" }}>
                        <span style={{ fontWeight:700, fontSize:12, padding:"3px 10px", borderRadius:99, background:"rgba(6,182,212,0.08)", color:"#06b6d4" }}>{(p.views||0).toLocaleString()}</span>
                      </td>
                      <td style={{ padding:"12px 14px", textAlign:"right", fontWeight:700, color:"#0ea5e9", fontSize:12 }}>{p.likes||0}</td>
                      <td style={{ padding:"12px 14px", textAlign:"right" }}>
                        <button onClick={() => deletePost(p.id)} style={{ padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:11, fontWeight:600, fontFamily:"inherit" }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:4, padding:"16px 20px", borderTop:`1px solid ${panelBorder}` }}>
                  <button onClick={()=>setPostPage(p=>Math.max(1,p-1))} disabled={curPage<=1}
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid ${panelBorder}`, background:"transparent", color:curPage<=1?(isDark?"rgba(255,255,255,0.15)":"#d0d0d0"):accent, cursor:curPage<=1?"default":"pointer", fontSize:14, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  {Array.from({length:Math.min(totalPages,7)}, (_,i) => {
                    let pg;
                    if (totalPages<=7) pg = i+1;
                    else if (curPage<=4) pg = i+1;
                    else if (curPage>=totalPages-3) pg = totalPages-6+i;
                    else pg = curPage-3+i;
                    return (
                      <button key={pg} onClick={()=>setPostPage(pg)}
                        style={{ width:32, height:32, borderRadius:8, border:pg===curPage?`1.5px solid ${accent}`:`1px solid ${panelBorder}`, background:pg===curPage?(isDark?`${accent}15`:`${accent}08`):"transparent", color:pg===curPage?accent:(isDark?"rgba(255,255,255,0.5)":"#64748b"), cursor:"pointer", fontSize:12, fontWeight:pg===curPage?700:500, fontFamily:"inherit" }}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={()=>setPostPage(p=>Math.min(totalPages,p+1))} disabled={curPage>=totalPages}
                    style={{ width:32, height:32, borderRadius:8, border:`1px solid ${panelBorder}`, background:"transparent", color:curPage>=totalPages?(isDark?"rgba(255,255,255,0.15)":"#d0d0d0"):accent, cursor:curPage>=totalPages?"default":"pointer", fontSize:14, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* ─────────────── 게시판 관리 ─────────────── */}
      {tab === "board" && (
        <div style={{ display:"grid", gridTemplateColumns:isMobileAdmin ? "1fr" : "1fr 1.4fr", gap:18, alignItems:"start" }}>
          {/* 왼쪽: 카테고리 목록 */}
          <div style={{ ...cardStyle }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:4 }}>메인 카테고리</div>
            <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", marginBottom:16 }}>선택하면 서브 카테고리를 관리할 수 있어요</div>
            {boardLoading && <div style={{ color:C.muted, fontSize:13 }}>불러오는 중...</div>}
            {boardCats.map(cat => {
              const sel = selBoardCat?.id===cat.id;
              return (
                <div key={cat.id} onClick={()=>handleSelectBoardCat(cat)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`1.5px solid ${sel?accent:panelBorder}`, background:sel?(isDark?"rgba(84,111,255,0.06)":"rgba(84,111,255,0.03)"):"transparent", cursor:"pointer", marginBottom:8, transition:"all 0.15s" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:sel?`${accent}15`:(isDark?"rgba(255,255,255,0.04)":"#f3f4f6"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                    {cat.icon||"#"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:sel?700:600, color:sel?accent:C.text }}>{cat.label}</div>
                    <div style={{ fontSize:10, color:isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>ID: {cat.id}</div>
                  </div>
                  {sel && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
                </div>
              );
            })}
          </div>

          {/* 오른쪽: 서브 카테고리 관리 */}
          <div style={{ ...cardStyle }}>
            {!selBoardCat ? (
              <div style={{ textAlign:"center", padding:"50px 0", color:isDark?"rgba(255,255,255,0.3)":"#94a3b8" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4, marginBottom:12 }}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <div style={{ fontSize:14, fontWeight:600 }}>왼쪽에서 카테고리를 선택하세요</div>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{selBoardCat.label}</div>
                    <div style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.35)":"#94a3b8" }}>서브 카테고리 {boardTags.length}개</div>
                  </div>
                </div>

                {/* 기존 태그 목록 */}
                {boardTags.length === 0 ? (
                  <div style={{ padding:"20px", borderRadius:12, background:isDark?"rgba(255,255,255,0.02)":"#fafbfe", textAlign:"center", color:isDark?"rgba(255,255,255,0.35)":"#94a3b8", fontSize:12, marginBottom:18, border:`1px dashed ${panelBorder}` }}>
                    서브 카테고리가 없어요. 아래에서 추가하세요.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
                    {boardTags.map(tag => (
                      <div key={tag.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:10, background:isDark?"rgba(255,255,255,0.04)":"#f8f9fc", border:`1px solid ${panelBorder}`, transition:"border-color 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(239,68,68,0.3)"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=panelBorder}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{tag.label}</span>
                        <button onClick={()=>handleDeleteTag(tag.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(239,68,68,0.6)", fontSize:16, lineHeight:1, padding:0, fontWeight:400 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 태그 추가 */}
                <div style={{ borderTop:`1px solid ${panelBorder}`, paddingTop:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:isDark?"rgba(255,255,255,0.4)":"#64748b", marginBottom:10 }}>새 서브 카테고리 추가</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input value={newTagLabel} onChange={e=>setNewTagLabel(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") handleAddTag(); }}
                      placeholder="예: AI, 마케팅, 디자인..."
                      style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1px solid ${panelBorder}`, background:isDark?"rgba(255,255,255,0.03)":"#fff", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
                    <button onClick={handleAddTag} disabled={!newTagLabel.trim()}
                      style={{ padding:"10px 20px", borderRadius:10, border:"none", cursor:newTagLabel.trim()?"pointer":"not-allowed", background:newTagLabel.trim()?accent:"rgba(0,0,0,0.04)", color:"#fff", fontSize:13, fontWeight:700, opacity:newTagLabel.trim()?1:0.5, fontFamily:"inherit", boxShadow:newTagLabel.trim()?`0 4px 14px ${accent}40`:"none" }}>
                      추가
                    </button>
                  </div>
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
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:16 }}>{vidEdit ? "영상 수정" : "새 영상 등록"}</div>
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
                        {extractYtId(vidForm.videoUrl) ? "유튜브 인식" : vidForm.videoUrl.includes("drive") ? "구글드라이브 인식" : "직접 링크"}
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
                    {vidEdit ? "수정 완료" : "등록하기"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 영상 목록 */}
          {vidLoading && <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>불러오는 중...</div>}
          {!vidLoading && videos.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:10, opacity:0.5 }}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>
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
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                    }
                  </div>
                  {/* 정보 */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.title}</div>
                    <div style={{ fontSize:11, color:C.muted, display:"flex", gap:8, flexWrap:"wrap" }}>
                      <span>{v.category || "synth"}</span>
                      <span style={{ color:v.isFree!==false?"#0ea5e9":accent, fontWeight:600 }}>{v.isFree !== false ? "무료" : "멤버전용"}</span>
                      {v.downloadUrl && <span>다운로드 있음</span>}
                      <span style={{ color:"rgba(255,255,255,0.2)" }}>|</span>
                      <span style={{ maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", opacity:0.5 }}>{v.videoUrl}</span>
                    </div>
                  </div>
                  {/* 액션 버튼 */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => startEditVideo(v)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"1px solid "+bdr, background:"transparent", color:C.purpleL, fontSize:12, fontWeight:600, cursor:"pointer" }}>수정</button>
                    <button onClick={() => deleteVideo(v.key, v.title)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"none", background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:12, fontWeight:700, cursor:"pointer" }}>삭제</button>
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
                        {tpl.preview ? <img src={tpl.preview} alt={tpl.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>}
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

      {/* pointHistory / membership 탭은 회원관리에 통합됨 */}

      {/* ── 앱 피드백 ── */}
      {tab === "appFeedback" && <AppFeedbackTab C={C} isDark={isDark} />}

      {/* ── 접속 분석 ── */}
      {tab === "visitors" && <VisitorAnalyticsTab C={C} isDark={isDark} />}

      {/* ── 실시간 채팅 ── */}
      {tab === "chat" && <AdminChatTab C={C} isDark={isDark} adminUser={adminUser} />}

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

  const accent = "#546FFF";

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: muted }}>문의 목록 로딩 중...</div>;

  if (selected) {
    const s = selected;
    const st = STATUS[s.status] || STATUS.pending;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: accent, fontSize: 13, marginBottom: 16, padding: 0, fontFamily: "inherit", fontWeight: 600 }}>
          <span style={{ marginRight: 6 }}>←</span>목록으로
        </button>
        <div style={{ background: cardBg, border: "1px solid " + bdr, borderRadius: 16, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: st.color + "18", color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 12, color: muted }}>{new Date(s.created_at).toLocaleString("ko-KR")}</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
              {s.status !== "closed" && <button onClick={() => updateStatus(s.id, "closed")} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid "+bdr, background:"transparent", color:muted, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>종료</button>}
              <button onClick={() => deleteInquiry(s.id)} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.04)", color:"#f87171", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>삭제</button>
            </div>
          </div>
          {/* 고객 정보 카드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
            {[{l:"이름",v:s.name},{l:"이메일",v:s.email},{l:"유형",v:s.subject||"일반"}].map(f => (
              <div key={f.l} style={{ padding:"12px 16px", borderRadius:10, background:isDark?"rgba(255,255,255,0.02)":"#fafbfe", border:"1px solid "+bdr }}>
                <div style={{ fontSize:10, fontWeight:600, color:muted, marginBottom:4, letterSpacing:0.5, textTransform:"uppercase" }}>{f.l}</div>
                <div style={{ fontSize:14, fontWeight:600, color:text }}>{f.v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:14, color:text, lineHeight:1.9, whiteSpace:"pre-wrap", padding:"18px 20px", borderRadius:12, background:isDark?"rgba(255,255,255,0.02)":"#fafbfe", border:"1px solid "+bdr, marginBottom:20 }}>{s.message}</div>

          {s.reply && (
            <div style={{ padding:"16px 20px", borderRadius:12, background:"rgba(34,197,94,0.04)", border:"1px solid rgba(34,197,94,0.15)", marginBottom:18 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:8 }}>답변 완료</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{s.reply}</div>
            </div>
          )}

          <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>답변 작성</div>
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} placeholder="답변 내용을 입력하세요..."
            style={{ width:"100%", padding:"14px 16px", borderRadius:12, border:"1px solid "+bdr, background:isDark?"rgba(255,255,255,0.03)":"#fff", color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }} />
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button onClick={() => submitReply(s.id)} style={{ padding:"10px 24px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(84,111,255,0.25)" }}>답변 저장</button>
          </div>
        </div>
      </div>
    );
  }

  // 상태별 카운트
  const pendingCnt = inquiries.filter(i=>i.status==="pending").length;
  const repliedCnt = inquiries.filter(i=>i.status==="replied").length;
  const closedCnt = inquiries.filter(i=>i.status==="closed").length;

  return (
    <div>
      {/* 상태 요약 카드 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14, marginBottom:20 }}>
        {[
          {l:"대기중", n:pendingCnt, color:"#f59e0b"},
          {l:"답변완료", n:repliedCnt, color:"#22c55e"},
          {l:"종료", n:closedCnt, color:"#94a3b8"},
        ].map(s => (
          <div key={s.l} style={{ padding:"16px 20px", borderRadius:14, background:cardBg, border:"1px solid "+bdr, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:10, height:32, borderRadius:5, background:s.color, flexShrink:0, opacity:0.7 }}/>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:text }}>{s.n}</div>
              <div style={{ fontSize:11, color:muted, marginTop:1 }}>{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {inquiries.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
          <div style={{ fontSize:15, fontWeight:700 }}>접수된 문의가 없습니다</div>
        </div>
      ) : (
        <div style={{ background:cardBg, borderRadius:16, overflow:"hidden", border:"1px solid "+bdr }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr>
                {["상태","이름","이메일","유형","접수일",""].map((h,i) => (
                  <th key={h||i} style={{ padding:"12px 14px", textAlign:"left", color:muted, fontWeight:600, fontSize:12, borderBottom:`2px solid ${bdr}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inquiries.map(item => {
                const st = STATUS[item.status] || STATUS.pending;
                return (
                  <tr key={item.id} onClick={() => { setSelected(item); setReplyText(item.reply || ""); }}
                    style={{ cursor:"pointer", transition:"background 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.02)":"#fafbfe"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:99, background:st.color+"15", color:st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding:"12px 14px", fontWeight:600, color:text }}>{item.name}</td>
                    <td style={{ padding:"12px 14px", color:muted, fontSize:12 }}>{item.email}</td>
                    <td style={{ padding:"12px 14px", color:muted, fontSize:12 }}>{item.subject || "일반"}</td>
                    <td style={{ padding:"12px 14px", color:muted, fontSize:12 }}>{new Date(item.created_at).toLocaleDateString("ko-KR")}</td>
                    <td style={{ padding:"12px 14px", textAlign:"right" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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

  const bdr2 = isDark ? "rgba(255,255,255,0.06)" : "#eef0f6";
  const panelBg2 = isDark ? "rgba(255,255,255,0.045)" : "#fff";

  // 상태별 카운트
  const fbPending = feedbacks.filter(f=>f.status==="pending").length;
  const fbReviewed = feedbacks.filter(f=>f.status==="reviewed").length;
  const fbDone = feedbacks.filter(f=>f.status==="done").length;

  return (
    <div>
      {/* 상태 요약 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:20 }}>
        {[
          {l:"전체",n:feedbacks.length,color:"#546FFF"},
          {l:"검토 대기",n:fbPending,color:"#94a3b8"},
          {l:"검토 중",n:fbReviewed,color:"#3b82f6"},
          {l:"반영 완료",n:fbDone,color:"#22c55e"},
        ].map(s => (
          <div key={s.l} style={{ padding:"14px 18px", borderRadius:14, background:panelBg2, border:`1px solid ${bdr2}`, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:8, height:28, borderRadius:4, background:s.color, flexShrink:0, opacity:0.7 }}/>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{s.n}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div style={{ color:C.muted }}>로딩 중...</div>}
      {feedbacks.length === 0 && !loading && <div style={{ textAlign:"center", padding:40, color:C.muted, fontSize:14 }}>피드백이 없습니다</div>}

      <div style={{ background:panelBg2, borderRadius:16, overflow:"hidden", border:`1px solid ${bdr2}` }}>
        {feedbacks.map((f,i) => (
          <div key={f.id} style={{ padding:"16px 20px", borderTop:i>0?`1px solid ${bdr2}`:"none", transition:"background 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.02)":"#fafbfe"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:99, background:(catColors[f.category]||"#888")+"15", color:catColors[f.category]||"#888", fontWeight:700 }}>{catLabels[f.category]||f.category}</span>
              <span style={{ fontSize:14, fontWeight:700, color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.title}</span>
              <select value={f.status} onChange={e => updateStatus(f.id, e.target.value)}
                style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${statusColors[f.status]}40`, background:`${statusColors[f.status]}08`, color:statusColors[f.status], fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {statusOpts.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
            <div style={{ fontSize:13, color:isDark?"rgba(255,255,255,0.5)":"#64748b", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:80, overflow:"hidden" }}>{f.body}</div>
            <div style={{ fontSize:11, color:isDark?"rgba(255,255,255,0.3)":"#94a3b8", marginTop:8 }}>{f.email} · {f.app_version} · {new Date(f.created_at).toLocaleDateString("ko-KR")}</div>
          </div>
        ))}
      </div>
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
  const isMobileAdmin = typeof window !== "undefined" && window.innerWidth < 768;

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          {label:"국가 수", val:data.countries, desc:`${data.days}일 고유 국가`, color:"#546FFF", icon:"M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"},
          {label:"도시 수", val:data.cities, desc:"도시 식별 기준", color:"#22c55e", icon:"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"},
          {label:"방문 수", val:data.totalVisits, desc:`${data.days}일 고유 방문`, color:"#f59e0b", icon:"M15 12a3 3 0 11-6 0 3 3 0 016 0z"},
          {label:"페이지뷰", val:Object.values(data.dailyCounts || {}).reduce((s, v) => s + v, 0), desc:`${data.days}일 전체 조회`, color:"#8b5cf6", icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"},
        ].map((s, i) => (
          <div key={i} style={{ padding: "20px 22px", borderRadius: 16, background: card, border: `1px solid ${bdr}`, boxShadow: isDark?"none":"0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${s.color}12`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: text, letterSpacing:-0.5 }}>{s.val?.toLocaleString?.() || s.val || 0}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 4, fontWeight:500 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: isDark?"rgba(255,255,255,0.25)":"#c0c0c0", marginTop: 2 }}>{s.desc}</div>
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
      <div style={{ display: "grid", gridTemplateColumns: isMobileAdmin ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 28 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: isMobileAdmin ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
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

// ── 관리자 실시간 채팅 탭 ──
function AdminChatTab({ C, isDark, adminUser }) {
  const [convs, setConvs] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const endRef = React.useRef(null);

  const accent = "#546FFF";
  const panelBg = isDark ? "rgba(255,255,255,0.045)" : "#fff";
  const panelBorder = isDark ? "rgba(255,255,255,0.06)" : "#eef0f6";
  const hoverBg = isDark ? "rgba(255,255,255,0.02)" : "#fafbfe";

  // 대화 목록 로드
  const loadConvs = async () => {
    const { data } = await supabase.from("chat_conversations").select("*").order("updated_at", { ascending: false });
    setConvs(data || []);
    setLoading(false);
  };

  // 메시지 로드
  const loadMessages = async (convId) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data || []);
    // 읽음 처리
    await supabase.from("chat_conversations").update({ unread_admin: 0 }).eq("id", convId);
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, unread_admin: 0 } : c));
  };

  React.useEffect(() => { loadConvs(); }, []);

  // 실시간 구독 — 전체 새 메시지 감지
  React.useEffect(() => {
    const channel = supabase
      .channel("admin-chat-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new;
        // 현재 보고 있는 대화면 메시지 추가
        if (selected && msg.conversation_id === selected.id) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_role === "user") {
            supabase.from("chat_conversations").update({ unread_admin: 0 }).eq("id", selected.id);
          }
        }
        // 대화 목록 갱신
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 대화 선택
  const selectConv = (conv) => {
    setSelected(conv);
    loadMessages(conv.id);
  };

  // 답변 전송
  const send = async () => {
    if (!input.trim() || !selected) return;
    const msg = input.trim();
    setInput("");
    await supabase.from("chat_messages").insert({
      conversation_id: selected.id,
      sender_uid: adminUser?.uid || "admin",
      sender_role: "admin",
      message: msg,
    });
    await supabase.from("chat_conversations").update({
      last_message: msg,
      unread_user: (selected.unread_user || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", selected.id);
  };

  // 대화 종료
  const closeConv = async (convId) => {
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", convId);
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, status: "closed" } : c));
    if (selected?.id === convId) { setSelected(null); setMessages([]); }
  };

  const totalUnread = convs.reduce((s, c) => s + (c.unread_admin || 0), 0);
  const openConvs = convs.filter(c => c.status === "open");
  const closedConvs = convs.filter(c => c.status === "closed");

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>채팅 목록 로딩 중...</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "300px 1fr" : "1fr", gap: 16, height: "calc(100vh - 200px)", minHeight: 500 }}>
      {/* 왼쪽: 대화 목록 */}
      <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${panelBorder}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
            대화 목록
            {totalUnread > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 8px", borderRadius: 99 }}>{totalUnread}</span>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {openConvs.length === 0 && closedConvs.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>아직 문의가 없습니다</div>
          )}
          {openConvs.length > 0 && (
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8", padding: "4px 18px", letterSpacing: 1 }}>진행중</div>
              {openConvs.map(conv => (
                <div key={conv.id} onClick={() => selectConv(conv)}
                  style={{
                    padding: "12px 18px", cursor: "pointer", transition: "background 0.12s",
                    background: selected?.id === conv.id ? (isDark ? "rgba(84,111,255,0.08)" : "rgba(84,111,255,0.04)") : "transparent",
                    borderLeft: selected?.id === conv.id ? `3px solid ${accent}` : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (selected?.id !== conv.id) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{conv.user_nick || "익명"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {conv.unread_admin > 0 && (
                        <span style={{ width: 18, height: 18, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{conv.unread_admin}</span>
                      )}
                      <span style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8" }}>
                        {new Date(conv.updated_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.4)" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.last_message || "새 대화"}
                  </div>
                  <div style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8", marginTop: 2 }}>{conv.user_email}</div>
                </div>
              ))}
            </div>
          )}
          {closedConvs.length > 0 && (
            <div style={{ padding: "8px 0", borderTop: `1px solid ${panelBorder}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.2)" : "#c0c0c0", padding: "4px 18px", letterSpacing: 1 }}>종료됨</div>
              {closedConvs.slice(0, 10).map(conv => (
                <div key={conv.id} onClick={() => selectConv(conv)}
                  style={{ padding: "10px 18px", cursor: "pointer", opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{conv.user_nick || "익명"}</div>
                  <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.last_message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 채팅 화면 */}
      {selected && (
        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* 헤더 */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${panelBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selected.user_nick || "익명"}</div>
              <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}>{selected.user_email}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {selected.status === "open" && (
                <button onClick={() => closeConv(selected.id)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: "transparent", color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  종료
                </button>
              )}
              <button onClick={() => { setSelected(null); setMessages([]); }}
                style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: "transparent", color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                닫기
              </button>
            </div>
          </div>

          {/* 메시지 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>메시지가 없습니다</div>}
            {messages.map(msg => {
              const isAdmin = msg.sender_role === "admin";
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "70%", padding: "10px 14px",
                    borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isAdmin ? accent : (isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"),
                    color: isAdmin ? "#fff" : C.text,
                    fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                  }}>
                    {msg.message}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.5, textAlign: isAdmin ? "right" : "left" }}>
                      {isAdmin ? "관리자" : (selected.user_nick || "사용자")} · {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* 입력 */}
          {selected.status === "open" && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${panelBorder}` }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="답변을 입력하세요..."
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${panelBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                <button onClick={send} disabled={!input.trim()}
                  style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: input.trim() ? accent : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"), color: "#fff", fontSize: 14, fontWeight: 600, cursor: input.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                  전송
                </button>
              </div>
            </div>
          )}
          {selected.status === "closed" && (
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${panelBorder}`, textAlign: "center", fontSize: 13, color: C.muted }}>
              종료된 대화입니다
            </div>
          )}
        </div>
      )}

      {/* 대화 미선택 시 */}
      {!selected && convs.length > 0 && (
        <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <div style={{ textAlign: "center", color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4, marginBottom: 12 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <div style={{ fontSize: 15, fontWeight: 600 }}>왼쪽에서 대화를 선택하세요</div>
          </div>
        </div>
      )}
    </div>
  );
}
