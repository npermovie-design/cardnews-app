import { useState, useEffect } from "react";
import { db, changePoints } from "./storage";
import { ref, get, update, push } from "firebase/database";
import { getAuth, updateProfile } from "firebase/auth";

/* ═══════════════════════════════════════════════
   MyPage.jsx  ·  회원 전용 마이페이지
   - 크레딧 사용/적립 내역
   - 닉네임 변경 (월 1회)
═══════════════════════════════════════════════ */

// 카테고리별 아이콘 + 색상
const HISTORY_ICON = {
  "가입 보너스":        { icon:"🎁", color:"#4ade80" },
  "일일 로그인":        { icon:"📅", color:"#60a5fa" },
  "게시글 작성":        { icon:"✍️", color:"#a78bfa" },
  "댓글 작성":          { icon:"💬", color:"#818cf8" },
  "AI 생성 사용":       { icon:"🤖", color:"#f87171" },
  "심플 카드뉴스 생성": { icon:"✨", color:"#f87171" },
  "심플 상세페이지 생성":{ icon:"📋", color:"#f87171" },
  "관리자 지급":        { icon:"👑", color:"#fbbf24" },
  "포인트 초기화":      { icon:"🔄", color:"#94a3b8" },
};

function getHistIcon(reason) {
  for (const [key, val] of Object.entries(HISTORY_ICON)) {
    if (reason?.includes(key)) return val;
  }
  return { icon:"💎", color:"#a5b4fc" };
}

export default function MyPage({ user, setUser, C, navigate, theme }) {
  const isDark = theme === "dark";
  const text   = isDark ? "#fff" : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg= isDark ? "rgba(255,255,255,0.06)" : "#f5f5f8";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)" : "#ddd";

  const [tab, setTab]       = useState("history");
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [userData, setUserData] = useState(user);

  // 닉네임 변경
  const [nickEdit, setNickEdit]   = useState(false);
  const [newNick, setNewNick]     = useState(user?.nick || "");
  const [nickLoading, setNickLoading] = useState(false);
  const [nickMsg, setNickMsg]     = useState("");
  const [toast, setToast]         = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 3000); };

  // 포인트 내역 로드
  useEffect(() => {
    if (!user?.uid) return;
    setHistLoading(true);
    get(ref(db, "pointHistory/" + user.uid)).then(snap => {
      if (snap.exists()) {
        const raw = snap.val();
        const list = Object.values(raw)
          .sort((a,b) => new Date(b.at||0) - new Date(a.at||0));
        setHistory(list);
      } else {
        setHistory([]);
      }
    }).catch(()=>{}).finally(()=>setHistLoading(false));

    // 최신 유저 데이터
    get(ref(db, "users/" + user.uid)).then(snap => {
      if (snap.exists()) setUserData(snap.val());
    }).catch(()=>{});
  }, [user?.uid]);

  // 닉네임 변경 가능 여부
  const canChangeNick = () => {
    if (!userData?.nickChangedAt) return true;
    const last = new Date(userData.nickChangedAt);
    const now  = new Date();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };
  const nextChangeDate = () => {
    if (!userData?.nickChangedAt) return null;
    const last = new Date(userData.nickChangedAt);
    last.setDate(last.getDate() + 30);
    return last.toLocaleDateString("ko-KR");
  };

  const handleNickChange = async () => {
    if (!newNick.trim() || newNick.trim().length < 2) { setNickMsg("닉네임은 2자 이상이어야 해요."); return; }
    if (newNick.trim().length > 16) { setNickMsg("닉네임은 16자 이하여야 해요."); return; }
    if (!canChangeNick()) { setNickMsg(`다음 변경 가능일: ${nextChangeDate()}`); return; }
    setNickLoading(true); setNickMsg("");
    try {
      const fbUser = getAuth().currentUser;
      if (fbUser) await updateProfile(fbUser, { displayName: newNick.trim() });
      const now = new Date().toISOString();
      await update(ref(db, "users/" + user.uid), { nick: newNick.trim(), nickChangedAt: now });
      // 히스토리 기록
      await push(ref(db, "pointHistory/" + user.uid), {
        delta: 0, reason: "닉네임 변경", balance: userData?.points || 0, at: now
      });
      const updated = { ...userData, nick: newNick.trim(), nickChangedAt: now };
      setUserData(updated);
      // 로컬스토리지 + 상위 state 업데이트
      try { localStorage.setItem("nper_user", JSON.stringify({...user, nick: newNick.trim()})); } catch {}
      if (setUser) setUser({...user, nick: newNick.trim()});
      setNickEdit(false);
      showToast("닉네임이 변경됐어요! ✅");
    } catch(e) {
      setNickMsg("변경 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally { setNickLoading(false); }
  };

  if (!user) {
    return (
      <div style={{ maxWidth:480, margin:"100px auto", textAlign:"center", padding:"0 24px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔐</div>
        <div style={{ fontSize:18, fontWeight:800, color:text, marginBottom:8 }}>로그인이 필요해요</div>
        <div style={{ fontSize:13, color:muted, marginBottom:24 }}>마이페이지는 로그인한 회원만 볼 수 있어요.</div>
        <button onClick={()=>navigate("home")} style={{ padding:"11px 28px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>홈으로</button>
      </div>
    );
  }

  const earned = history.filter(h=>h.delta>0).reduce((s,h)=>s+h.delta,0);
  const used   = history.filter(h=>h.delta<0).reduce((s,h)=>s+h.delta,0);

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"20px 16px 80px" }}>
      <style>{`
        @media (max-width: 600px) {
          .myp-header { flex-direction: column !important; }
          .myp-credit-row { flex-direction: column !important; align-items: stretch !important; }
          .myp-credit-badges { justify-content: flex-start !important; margin-top: 10px; }
          .myp-nick-row { flex-direction: column !important; gap: 8px !important; }
          .myp-nick-row input { width: 100% !important; }
          .myp-tab { padding: 8px 14px !important; font-size: 12px !important; }
          .myp-hist-item { padding: 12px 12px !important; gap: 10px !important; }
          .myp-quick-grid { grid-template-columns: 1fr 1fr !important; }
          .myp-info-row { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .myp-info-val { text-align: left !important; font-size: 12px !important; }
        }
      `}</style>

      {/* 토스트 */}
      {toast && (
        <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:"#22c55e", color:"#fff", padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}

      {/* ── 프로필 헤더 ── */}
      <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:18, padding:"20px 18px", marginBottom:16 }}>

        {/* 아바타 + 이름 + 크레딧 */}
        <div className="myp-header" style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
          {/* 왼쪽: 아바타 + 정보 */}
          <div style={{ display:"flex", gap:14, flex:1, minWidth:0 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#7c6aff,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff", flexShrink:0 }}>
              {(userData?.nick||"U")[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                <span style={{ fontSize:17, fontWeight:900, color:text }}>{userData?.nick}</span>
                {userData?.role==="admin" && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background:"rgba(251,191,36,0.15)", color:"#fbbf24", fontWeight:700 }}>👑 관리자</span>}
              </div>
              <div style={{ fontSize:12, color:muted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userData?.email}</div>
              <div style={{ fontSize:11, color:muted }}>가입 {userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString("ko-KR") : "-"}</div>
            </div>
          </div>

          {/* 오른쪽: 크레딧 */}
          <div style={{ flexShrink:0, textAlign:"right" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#a5b4fc" }}>💎 {(userData?.points||0).toLocaleString()}P</div>
            <div style={{ fontSize:10, color:muted }}>보유 크레딧</div>
          </div>
        </div>

        {/* 적립/사용 배지 + 닉네임 변경 버튼 */}
        <div style={{ display:"flex", gap:8, marginTop:14, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6" }}>
            <div style={{ padding:"5px 12px", borderRadius:8, background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.25)", fontSize:12, fontWeight:700, color:"#4ade80" }}>+{earned.toLocaleString()}P 적립</div>
            <div style={{ padding:"5px 12px", borderRadius:8, background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.25)", fontSize:12, fontWeight:700, color:"#f87171" }}>{used.toLocaleString()}P 사용</div>
          </div>
          <button onClick={()=>{ setNickEdit(e=>!e); setNewNick(userData?.nick||""); setNickMsg(""); }}
            style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>
            {nickEdit?"✕ 취소":"✏️ 닉네임 변경"}
          </button>
        </div>

        {/* 닉네임 변경 폼 */}
        {nickEdit && (
          <div style={{ marginTop:14, padding:"14px", borderRadius:12, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>새 닉네임 (2~16자)</div>
            <div className="myp-nick-row" style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={newNick} onChange={e=>setNewNick(e.target.value)} placeholder="새 닉네임 입력" maxLength={16}
                style={{ flex:1, padding:"9px 12px", borderRadius:9, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
              <button onClick={handleNickChange} disabled={nickLoading||!canChangeNick()}
                style={{ padding:"9px 18px", borderRadius:9, border:"none", cursor:nickLoading?"wait":canChangeNick()?"pointer":"not-allowed", background:canChangeNick()?"linear-gradient(135deg,#7c6aff,#ec4899)":"rgba(99,102,241,0.3)", color:"#fff", fontSize:12, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
                {nickLoading?"변경 중...":"변경하기"}
              </button>
            </div>
            {nickMsg && <div style={{ fontSize:11, color:"#f87171", marginTop:6 }}>{nickMsg}</div>}
            {!canChangeNick()
              ? <div style={{ fontSize:11, color:"#f59e0b", marginTop:6 }}>⏰ 다음 변경 가능일: {nextChangeDate()}</div>
              : <div style={{ fontSize:11, color:muted, marginTop:6 }}>💡 월 1회 변경 가능해요</div>}
          </div>
        )}
      </div>

      {/* ── 탭 ── */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:isDark?"rgba(255,255,255,0.04)":"#f3f4f6", borderRadius:12, padding:4 }}>
        {[["history","💳 크레딧 내역"],["info","👤 계정 정보"]].map(([t,l])=>(
          <button key={t} className="myp-tab" onClick={()=>setTab(t)} style={{ flex:1, padding:"9px 16px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
            background:tab===t?cardBg:"transparent", color:tab===t?"#a5b4fc":muted,
            boxShadow:tab===t?"0 1px 4px rgba(0,0,0,0.1)":"none", transition:"all 0.15s" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── 크레딧 내역 탭 ── */}
      {tab === "history" && (
        <div>
          {histLoading && <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>⏳ 내역 불러오는 중...</div>}
          {!histLoading && history.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:6 }}>크레딧 내역이 없어요</div>
              <div style={{ fontSize:12 }}>AI 생성이나 게시글 작성으로 크레딧을 적립해보세요!</div>
            </div>
          )}
          {!histLoading && history.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {history.map((h, i) => {
                const { icon, color } = getHistIcon(h.reason);
                const isEarn = h.delta > 0;
                const isZero = h.delta === 0;
                return (
                  <div key={i} className="myp-hist-item" style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                      {icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.reason || "포인트 변경"}</div>
                      <div style={{ fontSize:11, color:muted }}>
                        {h.at ? new Date(h.at).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-"}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {!isZero && <div style={{ fontSize:15, fontWeight:900, color:isEarn?"#4ade80":"#f87171" }}>{isEarn?"+":""}{h.delta?.toLocaleString()}P</div>}
                      {isZero && <div style={{ fontSize:11, color:muted }}>-</div>}
                      <div style={{ fontSize:10, color:muted }}>잔액 {(h.balance||0).toLocaleString()}P</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 계정 정보 탭 ── */}
      {tab === "info" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { label:"닉네임",         value:userData?.nick || "-" },
            { label:"이메일",         value:userData?.email || "-" },
            { label:"가입일",         value:userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString("ko-KR") : "-" },
            { label:"마지막 로그인",  value:userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-" },
            { label:"계정 유형",      value:userData?.provider==="google"?"🔵 구글":userData?.provider==="kakao"?"🟡 카카오":"📧 이메일" },
            { label:"닉네임 변경일",  value:userData?.nickChangedAt ? new Date(userData.nickChangedAt).toLocaleDateString("ko-KR") : "변경 기록 없음" },
            { label:"다음 변경 가능", value:canChangeNick() ? "✅ 지금 변경 가능" : nextChangeDate() },
          ].map(({label,value})=>(
            <div key={label} className="myp-info-row" style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:11, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:muted, flexShrink:0 }}>{label}</div>
              <div className="myp-info-val" style={{ fontSize:13, fontWeight:600, color:text, textAlign:"right", wordBreak:"break-all" }}>{value}</div>
            </div>
          ))}

          <div className="myp-quick-grid" style={{ marginTop:8, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { icon:"💎", label:"크레딧 충전", sub:"더 많은 AI 생성", action:()=>navigate("pricing"), color:"#a5b4fc" },
              { icon:"📁", label:"내 보관함",   sub:"카드뉴스·상세페이지", action:()=>navigate("ai"), color:"#4ade80" },
              { icon:"📬", label:"문의하기",    sub:"1:1 문의", action:()=>navigate("contact"), color:"#f59e0b" },
            ].map(({icon,label,sub,action,color})=>(
              <button key={label} onClick={action}
                style={{ padding:"14px 12px", borderRadius:13, border:`1px solid ${bdr}`, background:cardBg, cursor:"pointer", textAlign:"left", transition:"border-color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                onMouseLeave={e=>e.currentTarget.style.borderColor=bdr}>
                <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:10, color:muted }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
