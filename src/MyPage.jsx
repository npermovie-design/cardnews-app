import { useState, useEffect, useRef } from "react";
import { supabase, changePoints, getBrandKit } from "./storage";
import SnsConnectionManager from "./SnsConnectionManager";

/* ═══════════════════════════════════════════════
   MyPage.jsx  ·  회원 전용 마이페이지
   - 크레딧 사용/적립 내역
   - 닉네임 변경 (월 1회)
═══════════════════════════════════════════════ */

// 카테고리별 아이콘 + 색상
const HISTORY_ICON = {
  "가입 보너스":        { icon:"+", color:"#4ade80" },
  "일일 로그인":        { icon:"+", color:"#60a5fa" },
  "게시글 작성":        { icon:"+", color:"#a78bfa" },
  "댓글 작성":          { icon:"+", color:"#818cf8" },
  "AI 생성 사용":       { icon:"-", color:"#f87171" },
  "블로그 글 생성":      { icon:"-", color:"#f87171" },
  "유튜브 블로그 생성":  { icon:"-", color:"#f87171" },
  "뉴스 블로그 생성":    { icon:"-", color:"#f87171" },
  "심플 카드뉴스 생성":  { icon:"-", color:"#f87171" },
  "심플 상세페이지 생성":{ icon:"-", color:"#f87171" },
  "이미지 생성":         { icon:"-", color:"#f87171" },
  "이미지 재생성":       { icon:"-", color:"#f59e0b" },
  "상세페이지 이미지 생성":{ icon:"-", color:"#f87171" },
  "로고 생성":           { icon:"-", color:"#f87171" },
  "목업 생성":           { icon:"-", color:"#f87171" },
  "커뮤니티 글 작성":    { icon:"+", color:"#a78bfa" },
  "관리자 지급":        { icon:"+", color:"#fbbf24" },
  "포인트 초기화":      { icon:"R", color:"#94a3b8" },
};

function getHistIcon(reason) {
  for (const [key, val] of Object.entries(HISTORY_ICON)) {
    if (reason?.includes(key)) return val;
  }
  return { icon:"P", color:"#a5b4fc" };
}

export default function MyPage({ user, setUser, C, navigate, theme }) {
  const isDark = theme === "dark";
  const text   = isDark ? "#fff" : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg= isDark ? "rgba(255,255,255,0.06)" : "#f5f5f8";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)" : "#ddd";

  const [tab, setTab]       = useState("info");
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [userData, setUserData] = useState(user);

  // user prop 변경 시 즉시 반영 (포인트 차감 등)
  useEffect(() => {
    if (user) setUserData(u => ({ ...u, ...user }));
  }, [user?.points, user?.nick]);

  // 닉네임 변경
  const [nickEdit, setNickEdit]   = useState(false);
  const [newNick, setNewNick]     = useState(user?.nick || "");
  const [nickLoading, setNickLoading] = useState(false);
  const [nickMsg, setNickMsg]     = useState("");
  const [toast, setToast]         = useState("");

  // 브랜드 키트
  const DEFAULT_BRAND_KIT = {
    colors: { primary: "#7c6aff", secondary: "#ec4899", accent: "#22c55e" },
    font: "Pretendard",
    logo: null,
    name: "",
    slogan: "",
    tone: "전문적",
  };
  const [brandKit, setBrandKit] = useState(() => {
    const saved = getBrandKit();
    return saved || { ...DEFAULT_BRAND_KIT };
  });
  const [brandSaving, setBrandSaving] = useState(false);
  const logoInputRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""), 3000); };

  // 포인트 내역 로드
  useEffect(() => {
    if (!user?.uid) return;
    setHistLoading(true);

    // 포인트 내역 (타임아웃 8초)
    // point_history 로드 - RPC 함수 사용으로 속도 개선
    (async () => {
      try {
        const { data, error } = await supabase
          .from("point_history")
          .select("id, delta, reason, balance, created_at")
          .eq("uid", user.uid)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        setHistory((data || []).map(h => ({ ...h, at: h.created_at })));
      } catch(e) {
        console.warn("point_history 로드 실패:", e.message);
        setHistory([]);
      } finally {
        setHistLoading(false);
      }

      // 최신 포인트 조회
      try {
        const { data } = await supabase
          .from("users")
          .select("points, nick, email")
          .eq("uid", user.uid)
          .single();
        if (data) setUserData(prev => ({ ...prev, ...data }));
      } catch(e) {}
    })();
  }, [user?.uid]);

  // 닉네임 변경 가능 여부 (localStorage 기반)
  const getNickChangedAt = () => {
    if (userData?.nickChangedAt) return userData.nickChangedAt;
    try { return localStorage.getItem(`nper_nick_changed_${user?.uid}`) || null; } catch { return null; }
  };
  const canChangeNick = () => {
    const changedAt = getNickChangedAt();
    if (!changedAt) return true;
    const diffDays = (Date.now() - new Date(changedAt)) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };
  const nextChangeDate = () => {
    const changedAt = getNickChangedAt();
    if (!changedAt) return null;
    const next = new Date(changedAt);
    next.setDate(next.getDate() + 30);
    return next.toLocaleDateString("ko-KR");
  };

  const handleNickChange = async () => {
    if (!newNick.trim() || newNick.trim().length < 2) { setNickMsg("닉네임은 2자 이상이어야 해요."); return; }
    if (newNick.trim().length > 16) { setNickMsg("닉네임은 16자 이하여야 해요."); return; }
    if (!canChangeNick()) { setNickMsg(`다음 변경 가능일: ${nextChangeDate()}`); return; }
    setNickLoading(true); setNickMsg("");
    try {
      const now = new Date().toISOString();
      // nick만 업데이트 (nick_changed_at 컬럼 없어도 동작)
      const { error } = await supabase.from("users").update({ nick: newNick.trim() }).eq("uid", user.uid);
      if (error) throw new Error(error.message);
      // 변경 날짜는 localStorage에 보관
      const nickChangedKey = `nper_nick_changed_${user.uid}`;
      try { localStorage.setItem(nickChangedKey, now); } catch {}
      try {
        await supabase.from("point_history").insert({
          uid: user.uid, delta: 0, reason: "닉네임 변경", balance: userData?.points || 0, created_at: now
        });
      } catch(e) {} // point_history 실패해도 닉네임 변경은 진행
      const newUserObj = { ...user, nick: newNick.trim() };
      const updated = { ...userData, nick: newNick.trim(), nickChangedAt: now };
      setUserData(updated);
      try { localStorage.setItem("nper_user", JSON.stringify(newUserObj)); } catch {}
      if (setUser) setUser(newUserObj);
      setNickEdit(false);
      showToast("닉네임이 변경됐어요!");
    } catch(e) {
      setNickMsg("변경 중 오류: " + (e.message || "다시 시도해주세요."));
    } finally { setNickLoading(false); }
  };

  if (!user) {
    return (
      <div style={{ maxWidth:480, margin:"100px auto", textAlign:"center", padding:"0 24px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}></div>
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
          .myp-tab { flex: 1 !important; padding: 7px 8px !important; font-size: 11px !important; }
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
                {userData?.role==="admin" && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:5, background:"rgba(251,191,36,0.15)", color:"#fbbf24", fontWeight:700 }}>관리자</span>}
              </div>
              <div style={{ fontSize:12, color:muted, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userData?.email}</div>
              <div style={{ fontSize:11, color:muted }}>가입 {userData?.join_date ? new Date(userData.join_date).toLocaleDateString("ko-KR") : (userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString("ko-KR") : "-")}</div>
            </div>
          </div>

          {/* 오른쪽: 크레딧 */}
          <div style={{ flexShrink:0, textAlign:"right" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#a5b4fc" }}>{(userData?.points||0).toLocaleString()}P</div>
            <div style={{ fontSize:10, color:muted }}>보유 포인트</div>
          </div>
        </div>

        {/* 적립/사용 배지 + 닉네임 변경 버튼 */}
        <div style={{ display:"flex", gap:8, marginTop:14, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ padding:"5px 12px", borderRadius:8, background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.25)", fontSize:12, fontWeight:700, color:"#4ade80" }}>+{earned.toLocaleString()}P 적립</div>
            <div style={{ padding:"5px 12px", borderRadius:8, background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.25)", fontSize:12, fontWeight:700, color:"#f87171" }}>{used.toLocaleString()}P 사용</div>
          </div>
          <button onClick={()=>{ setNickEdit(e=>!e); setNewNick(userData?.nick||""); setNickMsg(""); }}
            style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>
            {nickEdit?"취소":"닉네임 변경"}
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
              ? <div style={{ fontSize:11, color:"#f59e0b", marginTop:6 }}>다음 변경 가능일: {nextChangeDate()}</div>
              : <div style={{ fontSize:11, color:muted, marginTop:6 }}>월 1회 변경 가능해요</div>}
          </div>
        )}
      </div>

      {/* ── 탭 ── */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:isDark?"rgba(255,255,255,0.04)":"#f3f4f6", borderRadius:12, padding:4 }}>
        {[["info","계정 정보"],["history","포인트 내역"],["brand","브랜드 키트"]].map(([t,l])=>(
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
          {histLoading && <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>내역 불러오는 중...</div>}
          {!histLoading && history.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:14, color:"#94a3b8", marginBottom:12, fontWeight:600 }}>내역 없음</div>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:6 }}>포인트 내역이 없어요</div>
              <div style={{ fontSize:12 }}>AI 생성이나 게시글 작성으로 포인트를 적립해보세요!</div>
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
            { label:"가입일",         value:userData?.join_date ? new Date(userData.join_date).toLocaleDateString("ko-KR") : (userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString("ko-KR") : "-") },
            { label:"마지막 로그인",  value:(userData?.last_login||userData?.lastLogin) ? new Date(userData.last_login||userData.lastLogin).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-" },
            { label:"계정 유형",      value:userData?.provider==="google"?"구글":userData?.provider==="kakao"?"카카오":"이메일" },
            { label:"닉네임 변경일",  value:userData?.nickChangedAt ? new Date(userData.nickChangedAt).toLocaleDateString("ko-KR") : "변경 기록 없음" },
            { label:"다음 변경 가능", value:canChangeNick() ? "지금 변경 가능" : nextChangeDate() },
          ].map(({label,value})=>(
            <div key={label} className="myp-info-row" style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:11, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:muted, flexShrink:0 }}>{label}</div>
              <div className="myp-info-val" style={{ fontSize:13, fontWeight:600, color:text, textAlign:"right", wordBreak:"break-all" }}>{value}</div>
            </div>
          ))}

          <div className="myp-quick-grid" style={{ marginTop:8, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              { icon:"P", label:"포인트 충전", sub:"AI 생성 포인트 충전", action:()=>navigate("pricing"), color:"#a5b4fc" },
              { icon:"L", label:"내 보관함",   sub:"카드뉴스·상세페이지", action:()=>navigate("ai"), color:"#4ade80" },
              { icon:"Q", label:"문의하기",    sub:"1:1 문의", action:()=>navigate("contact"), color:"#f59e0b" },
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

          {/* SNS 계정 연동 */}
          <div style={{ marginTop:16, background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, overflow:"hidden" }}>
            <SnsConnectionManager user={user} isDark={isDark} compact />
          </div>
        </div>
      )}

      {/* ── 브랜드 키트 탭 ── */}
      {tab === "brand" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* 브랜드 컬러 */}
          <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, padding:"18px 18px 14px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:14 }}>브랜드 컬러</div>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              {[["primary","프라이머리"],["secondary","세컨더리"],["accent","액센트"]].map(([key,label])=>(
                <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:muted }}>{label}</label>
                  <div style={{ position:"relative", width:48, height:48, borderRadius:12, overflow:"hidden", border:`2px solid ${bdr}`, cursor:"pointer" }}>
                    <input type="color" value={brandKit.colors[key]}
                      onChange={e=>setBrandKit(prev=>({...prev, colors:{...prev.colors, [key]:e.target.value}}))}
                      style={{ position:"absolute", inset:0, width:"150%", height:"150%", border:"none", cursor:"pointer", transform:"translate(-16%,-16%)" }}/>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, color:text, fontFamily:"monospace" }}>{brandKit.colors[key]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 브랜드 폰트 */}
          <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, padding:"18px 18px 14px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>브랜드 폰트</div>
            <select value={brandKit.font} onChange={e=>setBrandKit(prev=>({...prev, font:e.target.value}))}
              style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", cursor:"pointer", appearance:"auto" }}>
              {["Pretendard","Noto Sans KR","Nanum Gothic","Nanum Myeongjo","BMDOHYEON"].map(f=>(
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div style={{ marginTop:10, padding:"12px 14px", borderRadius:10, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}` }}>
              <span style={{ fontFamily:brandKit.font, fontSize:15, color:text, fontWeight:600 }}>미리보기: {brandKit.font} 폰트입니다.</span>
            </div>
          </div>

          {/* 로고 업로드 */}
          <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, padding:"18px 18px 14px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>로고 업로드</div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e=>{
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 500*1024) { showToast("로고 이미지는 500KB 이하만 가능해요."); e.target.value=""; return; }
                const reader = new FileReader();
                reader.onload = ev => setBrandKit(prev=>({...prev, logo:ev.target.result}));
                reader.readAsDataURL(file);
                e.target.value = "";
              }}/>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {brandKit.logo ? (
                <div style={{ position:"relative" }}>
                  <img src={brandKit.logo} alt="로고" style={{ width:64, height:64, borderRadius:12, objectFit:"contain", border:`1px solid ${bdr}`, background:isDark?"rgba(255,255,255,0.06)":"#f5f5f8" }}/>
                  <button onClick={()=>setBrandKit(prev=>({...prev, logo:null}))}
                    style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", border:"none", background:"#f87171", color:"#fff", fontSize:12, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>x</button>
                </div>
              ) : (
                <div style={{ width:64, height:64, borderRadius:12, border:`2px dashed ${inputBdr}`, display:"flex", alignItems:"center", justifyContent:"center", color:muted, fontSize:11, fontWeight:600 }}>
                  없음
                </div>
              )}
              <button onClick={()=>logoInputRef.current?.click()}
                style={{ padding:"9px 18px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {brandKit.logo ? "변경" : "업로드"}
              </button>
            </div>
            <div style={{ fontSize:10, color:muted, marginTop:8 }}>PNG/JPG, 최대 500KB</div>
          </div>

          {/* 브랜드 이름 & 슬로건 */}
          <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, padding:"18px 18px 14px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>브랜드 정보</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4, display:"block" }}>브랜드 이름</label>
                <input value={brandKit.name} onChange={e=>setBrandKit(prev=>({...prev, name:e.target.value}))} placeholder="예: 엔퍼콘텐츠랩" maxLength={30}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4, display:"block" }}>슬로건</label>
                <input value={brandKit.slogan} onChange={e=>setBrandKit(prev=>({...prev, slogan:e.target.value}))} placeholder="예: AI로 만드는 콘텐츠" maxLength={60}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
            </div>
          </div>

          {/* 브랜드 톤 */}
          <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:14, padding:"18px 18px 14px" }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>브랜드 톤</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["전문적","친근한","캐주얼","격식있는","유머러스"].map(t=>(
                <button key={t} onClick={()=>setBrandKit(prev=>({...prev, tone:t}))}
                  style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${brandKit.tone===t?"#7c6aff":bdr}`, background:brandKit.tone===t?(isDark?"rgba(124,106,255,0.15)":"rgba(124,106,255,0.08)"):"transparent", color:brandKit.tone===t?"#a5b4fc":muted, fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <button disabled={brandSaving} onClick={async()=>{
            setBrandSaving(true);
            try {
              localStorage.setItem("nper_brand_kit", JSON.stringify(brandKit));
              if (user?.uid) {
                await supabase.from("users").update({ brand_kit: brandKit }).eq("uid", user.uid);
              }
              showToast("브랜드 키트가 저장됐어요!");
            } catch(e) {
              showToast("저장 중 오류가 발생했어요.");
              console.error("brand kit save error:", e);
            } finally { setBrandSaving(false); }
          }}
            style={{ padding:"14px 0", borderRadius:13, border:"none", background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:15, fontWeight:800, cursor:brandSaving?"wait":"pointer", opacity:brandSaving?0.6:1, transition:"opacity 0.15s" }}>
            {brandSaving ? "저장 중..." : "브랜드 키트 저장"}
          </button>

        </div>
      )}
    </div>
  );
}
