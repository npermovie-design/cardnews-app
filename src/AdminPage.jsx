import { useState, useEffect } from "react";
import { getPosts, setPosts, getMembers, saveMembers, db, changePoints, getPostsFromDB } from "./storage";
import { ref, get, set, push, update, remove } from "firebase/database";
import { Btn, Inp } from "./UI";

/* ── 영상자료실 Firebase 헬퍼 ── */
const VID_PATH = "archive/videos";
async function fetchVideos() {
  const snap = await get(ref(db, VID_PATH));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
async function saveVideo(data) {
  const r = push(ref(db, VID_PATH));
  await set(r, { ...data, createdAt: Date.now() });
}
async function editVideo(key, data) {
  await update(ref(db, `${VID_PATH}/${key}`), data);
}
async function removeVideo(key) {
  await remove(ref(db, `${VID_PATH}/${key}`));
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

const ADMIN_PW = "nper2025admin";
const FREE_GUEST  = 5;
const FREE_MEMBER = 20;

export default function AdminPage({ C, user: adminUser }) {
  const [pw, setPw]        = useState("");
  const [auth, setAuth]    = useState(false);
  const [tab, setTab]      = useState("members");
  const [posts, setPosts2] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [members, setMembers2] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch]   = useState("");
  const [toast, setToast]     = useState("");
  const [ptInputs, setPtInputs] = useState({});
  const [guestSearch, setGuestSearch] = useState("");

  // Firebase에서 회원 목록 로드
  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const snap = await get(ref(db, "users"));
      if (snap.exists()) {
        const obj = snap.val();
        const list = Object.values(obj).sort((a, b) =>
          new Date(b.joinDate || 0) - new Date(a.joinDate || 0)
        );
        setMembers2(list);
      } else {
        setMembers2([]);
      }
    } catch(e) { console.error("회원 로드 실패:", e); }
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

  useEffect(() => { if (auth) { loadMembers(); loadVideos(); loadPosts(); } }, [auth]);

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

  // ── 포인트 지급 (Firebase)
  const grantPoints = async (uid, pts) => {
    if (!pts || isNaN(pts)) { showToast("포인트를 입력하세요"); return; }
    try {
      const snap = await get(ref(db, "users/" + uid));
      if (!snap.exists()) return;
      const cur = snap.val().points || 0;
      const next = cur + Number(pts);
      await update(ref(db, "users/" + uid), { points: next });
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: next } : m));
      showToast("+" + pts + "P 지급 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 포인트 초기화 (Firebase)
  const resetPoints = async (uid) => {
    if (!window.confirm("이 회원의 포인트를 0으로 초기화할까요?")) return;
    try {
      await update(ref(db, "users/" + uid), { points: 0 });
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: 0 } : m));
      showToast("포인트 초기화 완료");
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 포인트 직접 설정 (Firebase)
  const setPoints = async (uid, pts) => {
    if (!pts || isNaN(pts)) return;
    try {
      await update(ref(db, "users/" + uid), { points: Number(pts) });
      setMembers2(prev => prev.map(m => m.uid === uid ? { ...m, points: Number(pts) } : m));
      showToast(pts + "P 설정 완료!");
      setPtInputs(p => ({ ...p, [uid]: "" }));
    } catch(e) { showToast("오류: " + e.message); }
  };

  // ── 회원 탈퇴 (Firebase)
  const deleteMember = async (uid, nick) => {
    if (!window.confirm(`"${nick}" 회원을 탈퇴 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await remove(ref(db, "users/" + uid));
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

  // ── 게시글 삭제 (Firebase)
  const deletePost = async (id) => {
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    try {
      await remove(ref(db, "posts/" + id));
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

  if (!auth) return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", boxShadow: C.shadow }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900 }}>관리자 로그인</h2>
        </div>
        <Inp C={C} type="password" placeholder="관리자 비밀번호" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && pw === ADMIN_PW) setAuth(true); }}
          style={{ marginBottom: 12 }} />
        <Btn C={C} onClick={() => { if (pw === ADMIN_PW) setAuth(true); else alert("비밀번호가 틀렸습니다."); }} full>확인</Btn>
      </div>
    </div>
  );

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
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {[["members","👥 회원 관리"], ["guest","🌐 비회원 관리"], ["posts","📋 게시글 관리"], ["videos","🎬 영상 관리"], ["ai","📊 AI 현황"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
            background: tab === t ? C.card : "transparent",
            color: tab === t ? C.purpleL : C.muted,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s",
          }}>{l}</button>
        ))}
      </div>

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
                        가입 {m.joinDate ? new Date(m.joinDate).toLocaleDateString("ko-KR") : "-"} · AI 사용 {mUsed}회
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
      {tab === "posts" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize: 13, color: C.muted }}>총 <b style={{ color: C.text }}>{posts.length}개</b>의 게시글</div>
            <button onClick={loadPosts} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:C.muted, fontSize:12, cursor:"pointer" }}>🔄 새로고침</button>
          </div>
          {loadingPosts && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>⏳ 게시글 불러오는 중...</div>}
          {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>게시글이 없어요</div>}
          {!loadingPosts && posts.map(p => (
            <div key={p.id} style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: C.shadow }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p.nick} · {p.date} · 조회 {p.views||0} · 추천 {p.likes||0}</div>
              </div>
              <button onClick={() => deletePost(p.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>삭제</button>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────── 영상 관리 ─────────────── */}
      {tab === "videos" && (
        <div>
          {/* 헤더 + 추가 버튼 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:14, color:C.muted }}>총 <b style={{ color:C.text }}>{videos.length}개</b>의 영상</div>
            <button onClick={() => { resetVidForm(); setVidEdit(null); setVidFormOpen(p=>!p); }}
              style={{ padding:"9px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
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
                    style={{ accentColor:"#6366f1" }} />
                  무료 공개
                </label>
                <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                  <button onClick={() => { setVidFormOpen(false); setVidEdit(null); resetVidForm(); }}
                    style={{ padding:"9px 20px", borderRadius:9, border:"1px solid "+bdr, background:"transparent", color:C.muted, fontSize:13, cursor:"pointer" }}>취소</button>
                  <button onClick={submitVideo}
                    style={{ padding:"9px 24px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
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

      {/* ─────────────── AI 현황 ─────────────── */}
      {tab === "ai" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "비회원 무료 횟수", value: FREE_GUEST + "회", color: "#4ade80" },
              { label: "회원 무료 횟수",   value: FREE_MEMBER + "회", color: "#a5b4fc" },
              { label: "AI 1회 비용",      value: "10P", color: "#f59e0b" },
              { label: "글쓰기 적립",      value: "1P", color: "#34d399" },
            ].map(r => (
              <div key={r.label} style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 12, padding: "18px 20px", boxShadow: C.shadow }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: r.color, marginBottom: 4 }}>{r.value}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, border: "1px solid " + bdr, borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>전체 사용 현황</div>
            {(() => {
              const u = getAllUsage();
              const entries = Object.entries(u);
              if (entries.length === 0) return <div style={{ color: C.muted, fontSize: 13 }}>사용 기록 없음</div>;
              return entries.map(([k, v]) => {
                const isGuest = k === "guest";
                const uid = k.replace("member_", "");
                const mem = !isGuest ? members.find(m => m.id === uid || m.uid === uid) : null;
                const lim = isGuest ? FREE_GUEST : FREE_MEMBER;
                const pct = Math.min((v / lim) * 100, 100);
                return (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                        {isGuest ? "👤 비회원" : "👤 " + (mem ? mem.nick : uid)}
                        {mem && <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>{mem.email}</span>}
                      </span>
                      <span style={{ fontSize: 13, color: v >= lim ? "#ef4444" : C.purpleL, fontWeight: 700 }}>{v}/{lim}회</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.08)" : "#e9ecef", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: pct + "%", background: v >= lim ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#7c6aff,#ec4899)" }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
