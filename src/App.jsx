import { useState, useEffect, useRef } from "react";
import { THEMES, THEME_KEY, getSavedTheme } from "./theme";
import { getUser, setUser, setLocalUser, fbLogout, supabase, fetchUser, syncOAuthUser, FREE_GUEST } from "./storage";

// 페이지 컴포넌트
import HomePage from "./HomePage";
import { AboutPage, HowToPage, AiPage, ContactPage } from "./OtherPages";
import { PricingPage } from "./PricingPage";
import { PaymentSuccessPage, PaymentFailPage } from "./PaymentPage";
import { LegalPage } from "./LegalPage";
import BoardPage from "./BoardPage";
import ArchivePage from "./ArchivePage";
import AdminPage from "./AdminPage";
import AuthModal from "./AuthModal";
import MyPage from "./MyPage";
import AttendanceModal from "./AttendanceModal";

// 접속자 카운트 훅 (localStorage heartbeat)
function useOnlineCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const myId = "u_" + Math.random().toString(36).slice(2, 8);
    const KEY = "nper_online_users";
    function hb() {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        const now = Date.now();
        raw[myId] = now;
        Object.keys(raw).forEach(k => { if (now - raw[k] > 30000) delete raw[k]; });
        localStorage.setItem(KEY, JSON.stringify(raw));
        setCount(Object.keys(raw).length);
      } catch(e) {}
    }
    hb();
    const t = setInterval(hb, 15000);
    return () => {
      clearInterval(t);
      try { const raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch(e) {}
    };
  }, []);
  return count;
}


/* ── 생성 중 이탈 방지 커스텀 모달 ── */
function GuardModal({ cost, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#1a1730", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20, padding: "32px 28px", maxWidth: 360, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)", textAlign: "center",
        animation: "fadeIn 0.15s ease",
      }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
          생성 중입니다!
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 24 }}>
          페이지를 나가면<br/>
          <span style={{ color: "#f87171", fontWeight: 700 }}>결과물이 저장되지 않으며</span><br/>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{cost}P 포인트가 소진</span>됩니다.<br/>
          정말 나가시겠습니까?
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            계속 생성하기
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page,       setPage]       = useState("home");
  const [user,       setUserState]  = useState(getUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [openMenu,   setOpenMenu]   = useState(null); // "snsWrite"|"snsImage"|"imageGen"|"board"
  const [profileOpen, setProfileOpen] = useState(false);
  const [boardCat,   setBoardCat]   = useState("info");
  const [pendingPostId, setPendingPostId] = useState(null);
  const [aiMenu,     setAiMenu]     = useState("home");
  const [theme,      setTheme]      = useState(getSavedTheme);
  const [guardModal, setGuardModal] = useState(null); // { cost, onConfirm }
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}").guest || 0; } catch { return 0; }
  });

  const dropMenuRef   = useRef(null);
  const profileRef    = useRef(null);
  const isLoggingOut  = useRef(false);
  const onlineCount   = useOnlineCount();

  // 현재 테마 팔레트
  const C = THEMES[theme];

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  // 포인트 소진 이벤트 수신
  useEffect(() => {
    const handler = () => setShowPointsModal(true);
    window.addEventListener("pointsExhausted", handler);
    return () => window.removeEventListener("pointsExhausted", handler);
  }, []);

  // 게스트 사용 횟수 실시간 업데이트
  useEffect(() => {
    const handler = (e) => setGuestUsageCount(e.detail?.count || 0);
    window.addEventListener("guestUsageUpdate", handler);
    return () => window.removeEventListener("guestUsageUpdate", handler);
  }, []);

  // Supabase Auth 상태 감지
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isLoggingOut.current) return;

        if (event === "SIGNED_OUT" || !session) {
          setLocalUser(null); setUserState(null); return;
        }

        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // setTimeout으로 non-blocking 처리 (Supabase SDK가 콜백을 await하므로 블로킹 방지)
          setTimeout(async () => {
            try {
              const userData = await syncOAuthUser(session.user);
              if (userData) { setLocalUser(userData); setUserState(userData); }
            } catch(e) {}
          }, 0);
        }
        // TOKEN_REFRESHED: 세션만 갱신, 포인트 state 덮어쓰기 금지
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = e => {
      if (dropMenuRef.current && !dropMenuRef.current.contains(e.target)) setOpenMenu(null);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    const rawPath = window.location.pathname.replace(/^\//, "") || "home";
    const segments = rawPath.split("/");
    const mainSeg = segments[0];
    const postId = rawPath.includes("/post-") ? rawPath.split("/post-")[1] : null;
    if (postId) setPendingPostId(postId);

    // /payment/success, /payment/fail 처리
    if (mainSeg === "payment" && segments[1]) {
      setPage("payment/" + segments[1]);
      return;
    }
    // /community/info → page=community, boardCat=info
    if (mainSeg === "community" && segments[1] && !segments[1].startsWith("post-")) {
      setBoardCat(segments[1]);
    }
    // /ai/blog_naver → page=ai, aiMenu=blog_naver
    if (mainSeg === "ai" && segments[1]) {
      setAiMenu(segments[1]);
    }
    if (mainSeg && mainSeg !== "home") setPage(mainSeg);
  }, []);

  // popstate - 뒤로가기 가드
  useEffect(() => {
    const fn = async (e) => {
      if (window.__isGenerating) {
        window.history.pushState(null, "", window.location.href);
        const cost = window.__generatingCost || 10;
        const ok = await new Promise(resolve => {
          setGuardModal({
            cost,
            onConfirm: () => { window.__isGenerating = false; setGuardModal(null); resolve(true); },
            onCancel:  () => { setGuardModal(null); resolve(false); },
          });
        });
        if (!ok) return;
      }
      const hash = window.location.hash.replace("#", "") || "home";
      setPage(hash); setOpenMenu(null); setMobileOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  // 생성 중 이탈 확인 공통 함수 (Promise 반환)
  const confirmGuard = () => new Promise(resolve => {
    if (!window.__isGenerating) { resolve(true); return; }
    const cost = window.__generatingCost || 10;
    setGuardModal({
      cost,
      onConfirm: () => { window.__isGenerating = false; setGuardModal(null); resolve(true); },
      onCancel:  () => { setGuardModal(null); resolve(false); },
    });
  });

  const navigate = async target => {
    if (target === "login_trigger") { setShowAuth(true); return; }
    if (!(await confirmGuard())) return;
    const urlTarget = target === "home" ? "/" : "/" + target;
    window.history.pushState(null, "", urlTarget);
    setPage(target); setOpenMenu(null); setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const navigateBoard = async (cat) => {
    if (!(await confirmGuard())) return;
    setBoardCat(cat);
    window.history.pushState(null, "", "/community/" + cat);
    setPage("community"); setOpenMenu(null); setMobileOpen(false);
    window.scrollTo(0, 0);
  };
  const navigatePost = (postId) => {
    const cat = boardCat || "info";
    window.history.pushState(null, "", "/community/" + cat + "/post-" + postId);
  };

  const navigateAi = async (menu) => {
    if (!(await confirmGuard())) return;
    setAiMenu(menu);
    window.history.pushState(null, "", "/ai/" + menu);
    setPage("ai"); setOpenMenu(null); setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const handleAuth = u => { setLocalUser(u); setUserState(u); setShowAuth(false); };
  const logout = async () => {
    // 로그아웃 플래그 → onAuthStateChange 재로그인 차단
    isLoggingOut.current = true;
    // React state 먼저 초기화 (UI 즉시 반영)
    setLocalUser(null); setUserState(null);
    // 1) Supabase 로그아웃
    try { await supabase.auth.signOut({ scope: "global" }); } catch(e) {}

    // 2) localStorage 전체 Supabase 관련 키 제거
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("sb-") || k === "nper_user" || k.includes("supabase") || k.includes("auth")) {
          localStorage.removeItem(k);
        }
      });
    } catch(e) {}

    // 3) sessionStorage도 제거
    try { sessionStorage.clear(); } catch(e) {}

    // 4) IndexedDB supabase 관련 삭제
    try {
      indexedDB.deleteDatabase("supabase");
      indexedDB.deleteDatabase("supabase-auth");
    } catch(e) {}

    // 5) 쿠키 제거
    try {
      document.cookie.split(";").forEach(c => {
        document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
      });
    } catch(e) {}

    // 6) React state 초기화
    setLocalUser(null);
    setUserState(null);

    // 7) 완전 새로고침
    window.location.replace("/");
  };

  const isBoard = page === "community";
  const isAi    = page === "ai";

  /* ── 네비 버튼 컴포넌트 ── */
  const NavBtn = ({ id, label, active }) => (
    <button onClick={() => navigate(id)} style={{
      background: (active || page === id) ? "rgba(124,106,255,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontSize: 14,
      fontWeight: (active || page === id) ? 700 : 500,
      color: (active || page === id) ? C.purpleL : C.muted,
      transition: "all 0.15s",
    }}>{label}</button>
  );

  const DropBtn = ({ label, open, onClick, active }) => (
    <button onClick={onClick} style={{
      background: (active || open) ? "rgba(124,106,255,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontSize: 14,
      fontWeight: (active || open) ? 700 : 500,
      color: (active || open) ? C.purpleL : C.muted,
      display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
    }}>
      {label}
      <span style={{ fontSize: 10, opacity: 0.5, display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
    </button>
  );

  const DropMenu = ({ children, right }) => (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", zIndex: 100,
      left: right ? "auto" : 0, right: right ? 0 : "auto",
      background: C.modalBg, border: "1px solid " + C.border,
      borderRadius: 13, padding: 6, minWidth: 190,
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)", animation: "fadeIn 0.15s ease",
    }}>{children}</div>
  );

  const DropItem = ({ id, icon, label, onClick }) => (
    <button onClick={onClick || (() => navigate(id))} style={{
      display: "flex", alignItems: "center", gap: icon ? 10 : 0, width: "100%",
      padding: "10px 14px", borderRadius: 9, border: "none", cursor: "pointer",
      background: page === id ? "rgba(124,106,255,0.08)" : "transparent",
      color: page === id ? C.purpleL : C.muted,
      fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(124,106,255,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = page === id ? "rgba(124,106,255,0.08)" : "transparent"}>
      {icon && <span>{icon}</span>}{label}
    </button>
  );

  /* ── 페이지 렌더 ── */
  const renderPage = () => {
    if (page === "home")     return <HomePage C={C} navigate={navigate} />;
    if (page === "about")    return <AboutPage C={C} navigate={navigate} />;
    if (page === "howto")    return <HowToPage C={C} navigate={navigate} />;
    if (page === "archive")  return <ArchivePage C={C} theme={theme} user={user} />;
    if (page === "ai")       return <AiPage C={C} theme={theme} user={user} navigate={navigate} onLogout={logout} onLoginRequest={() => setShowAuth(true)} aiMenu={aiMenu} setAiMenu={setAiMenu} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (isBoard)             return <BoardPage key={boardCat} C={C} user={user} onLoginRequest={() => setShowAuth(true)} initialCat={boardCat} pendingPostId={pendingPostId} onPendingPostClear={() => setPendingPostId(null)} onNavigatePost={navigatePost} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (page === "pricing")  return <PricingPage C={C} navigate={navigate} user={user} onLogin={() => setShowAuth(true)} />;
    if (page === "contact")  return <ContactPage C={C} />;
    if (page === "payment/success") return <PaymentSuccessPage C={C} navigate={navigate} />;
    if (page === "payment/fail")    return <PaymentFailPage C={C} navigate={navigate} />;
    if (page === "legal")           return <LegalPage C={C} navigate={navigate} />;
    if (page === "mypage" || page === "profile")   return <MyPage C={C} theme={theme} user={user} setUser={u => { setLocalUser(u); setUserState(u); }} navigate={navigate} />;
    if (page === "xk9m2p4q7") {
      if (!user) return <div style={{ minHeight: "80vh" }} />;
      if (user.role !== "admin") return <HomePage C={C} navigate={navigate} />;
      return <AdminPage C={C} user={user} />;
    }
    return <HomePage C={C} navigate={navigate} />;
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      transition: "background 0.3s,color 0.3s",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#f5f4ff}
        ::-webkit-scrollbar-thumb{background:rgba(124,106,255,0.25);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(124,106,255,0.4)}
        input::placeholder,textarea::placeholder{color:rgba(26,23,48,0.3)}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;
          outline:none;background:rgba(0,0,0,0.1);width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;
          height:14px;border-radius:50%;background:#7c6aff;cursor:pointer}
        input:focus,textarea:focus{border-color:#7c6aff!important;box-shadow:0 0 0 3px rgba(124,106,255,0.12)}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .page-anim{animation:fadeIn 0.2s ease}
        textarea{resize:vertical}
        .desktop-nav{display:flex!important}
        .mobile-btn{display:none!important}
        .nav-right{display:flex!important}
        .mobile-controls{display:none!important}
        @media(max-width:768px){
          .desktop-nav{display:none!important}
          .mobile-btn{display:flex!important}
          .nav-right{display:none!important}
          .mobile-controls{display:flex!important}
        }
        @media(max-width:768px){
          .page-inner{padding-left:12px!important;padding-right:12px!important}
          .card-grid{grid-template-columns:1fr 1fr!important}
          .hide-mobile{display:none!important}
          .form-row{flex-direction:column!important;gap:10px!important}
        }
        @media(max-width:480px){
          .card-grid{grid-template-columns:1fr!important}
          .stat-row{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:640px){
          .cta-row{flex-direction:column!important}
          .cta-row button{width:100%!important;text-align:center!important}
          .stat-row{gap:20px!important}
          h1,h2{word-break:keep-all!important;letter-spacing:-0.5px!important}
          p{word-break:keep-all!important}
        }
        @media(max-width:480px){
          .cta-row button{padding:13px 20px!important;font-size:14px!important}
          table{display:block;overflow-x:auto}
        }
      `}</style>

      {/* 생성 중 이탈 방지 모달 */}
      {guardModal && <GuardModal cost={guardModal.cost} onConfirm={guardModal.onConfirm} onCancel={guardModal.onCancel} />}
      {showAuth && <AuthModal C={C} onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
      {showAttendance && <AttendanceModal user={user} isDark={theme==="dark"} onClose={() => setShowAttendance(false)} onUserUpdate={u => { setUserState(u); setLocalUser(u); }} />}
      {showPointsModal && (
        <div onClick={() => setShowPointsModal(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,16,58,0.99)", border: "1px solid rgba(124,106,255,0.3)", borderRadius: 22, padding: "36px 28px", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>⚡</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", marginBottom: 10 }}>무료 사용 횟수를 모두 사용했어요</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.9, marginBottom: 26 }}>
              비회원은 AI 기능을 <b style={{ color: "#a5b4fc" }}>{FREE_GUEST}회 무료</b>로 사용할 수 있어요.<br/>
              로그인하면 <b style={{ color: "#a5b4fc" }}>20회 추가</b> + 포인트로 무제한 이용 가능해요!
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setShowPointsModal(false); setShowAuth(true); }}
                style={{ padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                🔐 로그인 / 회원가입
              </button>
              <button onClick={() => { setShowPointsModal(false); navigate("pricing"); }}
                style={{ padding: "12px", borderRadius: 12, border: "1px solid rgba(124,106,255,0.3)", cursor: "pointer", background: "rgba(124,106,255,0.1)", color: "#a5b4fc", fontSize: 13, fontWeight: 700 }}>
                💎 포인트 충전하기
              </button>
              <button onClick={() => setShowPointsModal(false)}
                style={{ padding: "9px", borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 네비게이션 ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: 60,
        background: scrolled ? C.nav : (theme === "dark" ? "rgba(10,8,18,0.7)" : "rgba(255,255,255,0.92)"),
        borderBottom: "1px solid " + (scrolled ? C.border : (theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")),
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? (theme === "dark" ? "0 1px 12px rgba(0,0,0,0.3)" : "0 1px 12px rgba(0,0,0,0.06)") : "none",
        transition: "all 0.3s", display: "flex", alignItems: "center", padding: "0 20px", gap: 4,
      }}>

        {/* 로고 */}
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginRight: 16, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#fff", boxShadow: "0 4px 12px rgba(124,106,255,0.3)" }}>N</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: -0.5, lineHeight: 1 }}>SNS메이킷</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>NPER CONTENTS LAB</div>
          </div>
        </button>

        {/* 데스크톱 메뉴 */}
        <div ref={dropMenuRef} className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
          <NavBtn id="home" label="홈" />
          <NavBtn id="about" label="소개" />
          <NavBtn id="howto" label="이용방법" />
          <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
          {/* AI 생성기 통합 드롭다운 */}
          <div style={{ position: "relative" }}>
            <DropBtn label="AI 생성기" open={openMenu==="aiGen"} active={page==="ai"} onClick={() => setOpenMenu(m => m==="aiGen"?null:"aiGen")} />
            {openMenu==="aiGen" && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
                background: C.modalBg, border: "1px solid " + C.border,
                borderRadius: 13, padding: 8, minWidth: 260,
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)", animation: "fadeIn 0.15s ease",
              }}>
                {[
                  { key:"snsWrite", label:"✍️ SNS 글쓰기",  desc:"블로그·인스타·유튜브",  ai:"blog_naver_intro" },
                  { key:"snsImage", label:"🖼 SNS 이미지",   desc:"카드뉴스·상세페이지",   ai:"cardnews_simple"  },
                  { key:"imageGen", label:"🎨 이미지 생성",  desc:"제품컷·로고·모델·목업", ai:"product_shot"     },
                ].map(item => (
                  <button key={item.key} onClick={() => { navigateAi(item.ai); setOpenMenu(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%",
                      padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: (page==="ai" &&
                        ((item.key==="snsWrite" && aiMenu?.startsWith("blog_")) ||
                         (item.key==="snsImage" && ["cardnews_simple","cardnews_image","detail_simple","detail_image"].some(x=>aiMenu?.startsWith(x))) ||
                         (item.key==="imageGen" && ["product_shot","logo_gen","mockup_gen","model_gen","face_swap","outpaint"].includes(aiMenu))))
                        ? "rgba(124,106,255,0.08)" : "transparent",
                      textAlign: "left", transition: "background 0.12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(124,106,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 26 }}>{item.label.split(" ")[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label.slice(3)}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 커뮤니티 */}
          <div style={{ position: "relative" }}>
            <DropBtn label="커뮤니티" open={openMenu==="board"} active={isBoard} onClick={() => setOpenMenu(m => m==="board"?null:"board")} />
            {openMenu==="board" && (
              <DropMenu right>
                <DropItem id="community" label="정보공유"   onClick={() => { navigateBoard("info");   setOpenMenu(null); }} />
                <DropItem id="community" label="질문답변"   onClick={() => { navigateBoard("qna");    setOpenMenu(null); }} />
                <DropItem id="community" label="자유게시판" onClick={() => { navigateBoard("free");   setOpenMenu(null); }} />
                <DropItem id="community" label="사용후기"   onClick={() => { navigateBoard("review"); setOpenMenu(null); }} />
              </DropMenu>
            )}
          </div>
          <NavBtn id="archive" label="자료실" />
          <NavBtn id="pricing" label="가격정책" />
          <NavBtn id="contact" label="문의하기" />
        </div>

        {/* 오른쪽: 접속자수 + 테마 + 로그인 */}
        <div className="nav-right" style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {/* 접속자 수 */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
            background: theme==="dark" ? "rgba(74,222,128,0.08)" : "rgba(74,222,128,0.06)",
            border: "1px solid rgba(74,222,128,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
              boxShadow: "0 0 6px #4ade80", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>{onlineCount}명 접속중</span>
          </div>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 2px" }} />
          <button onClick={toggleTheme} title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, border: "1px solid " + C.border, background: C.toggleBg, cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted, transition: "all 0.2s", flexShrink: 0 }}>
            {theme === "light" ? "🌙 다크" : "☀️ 라이트"}
          </button>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
          {user ? (
            <div ref={profileRef} style={{ position: "relative" }}>
              {/* 프로필 버튼 */}
              <button onMouseDown={e=>e.stopPropagation()} onClick={() => setProfileOpen(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 6px", borderRadius: 24,
                  border: "1px solid " + C.border, background: profileOpen ? (theme==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.04)") : "transparent",
                  cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c6aff,#ec4899)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {(user.nick||"U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nick}</span>
                <span style={{ fontSize: 11, color: C.purpleL, fontWeight: 700 }}>💎{(user.points||0).toLocaleString()}P</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" style={{ flexShrink:0, transform: profileOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}><polyline points="18 15 12 9 6 15"/></svg>
              </button>

              {/* 프로필 드롭다운 */}
              {profileOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 280, zIndex: 200,
                  background: theme==="dark" ? "#1a1730" : "#fff",
                  border: "1px solid " + C.border, borderRadius: 16,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  {/* 헤더 */}
                  <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid " + C.border,
                    background: theme==="dark" ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#7c6aff,#ec4899)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                        {(user.nick||"U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{user.nick}</span>
                          {user.role==="admin" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>👑 관리자</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
                      </div>
                    </div>
                    {/* 포인트 바 */}
                    <div style={{ background: theme==="dark"?"rgba(255,255,255,0.05)":"#f5f5f8", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: C.muted }}>포인트 잔액</span>
                        <span style={{ fontWeight: 800, color: C.purpleL }}>💎 {(user.points||0).toLocaleString()}P</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: theme==="dark"?"rgba(255,255,255,0.08)":"#e0e0eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: Math.min(((user.points||0)/500)*100,100)+"%",
                          background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>AI 1회=10P · {Math.floor((user.points||0)/10)}회 생성 가능</div>
                    </div>
                  </div>
                  {/* 메뉴 */}
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: "🔴", label: "출석체크", sub: "매일 +3P · 연속 보너스", action: () => { setShowAttendance(true); setProfileOpen(false); } },
                      { icon: "💎", label: "포인트 충전", sub: "더 많은 AI 생성", action: () => { navigate("pricing"); setProfileOpen(false); } },
                      { icon: "📁", label: "내 보관함", sub: "생성한 글·카드뉴스", action: () => { navigate("ai"); setProfileOpen(false); } },
                      { icon: "👤", label: "회원정보", sub: "프로필·포인트 내역 확인", action: () => { navigate("mypage"); setProfileOpen(false); } },
                      ...(user.role==="admin" ? [{ icon: "⚙️", label: "관리자 페이지", sub: "회원·포인트 관리", action: () => { navigate("xk9m2p4q7"); setProfileOpen(false); } }] : []),
                    ].map((m,i) => (
                      <button key={i} onClick={m.action}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "none", background: "transparent",
                          cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                        onMouseEnter={e=>e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,0.06)":"#f5f5f8"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{m.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{m.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* 로그아웃 */}
                  <div style={{ padding: "8px", borderTop: "1px solid " + C.border }}>
                    <button onClick={() => { logout(); setProfileOpen(false); }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "none", background: "transparent",
                        cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, color: "#ef4444" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>🚪</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(() => {
                const left = Math.max(0, FREE_GUEST - guestUsageCount);
                return (
                  <div onClick={() => left === 0 && setShowPointsModal(true)}
                    style={{ padding: "4px 10px", borderRadius: 16, cursor: left === 0 ? "pointer" : "default",
                      background: left > 0 ? "rgba(99,102,241,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${left > 0 ? "rgba(99,102,241,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: left > 0 ? "#a5b4fc" : "#f87171" }}>
                      {left > 0 ? `AI 무료 ${left}회 남음` : "무료 소진 ⚡"}
                    </span>
                  </div>
                );
              })()}
              <button onClick={() => setShowAuth(true)} style={{ padding: "5px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>로그인</button>
            </div>
          )}
        </div>

        {/* 모바일 전용 컨트롤: 다크모드 + 유저상태 */}
        <div className="mobile-controls" style={{ display: "none", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 4, flexShrink: 0 }}>
          {/* 다크/라이트 토글 */}
          <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: "50%", border: "1px solid " + C.border,
            background: C.toggleBg, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {/* 유저 상태 */}
          {user ? (
            <button onClick={() => setMobileOpen(s => !s)} style={{ width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900,
              color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
              {(user.nick||"U")[0].toUpperCase()}
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ padding: "6px 12px", borderRadius: 8, border: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 12,
              background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", flexShrink: 0, whiteSpace: "nowrap" }}>
              로그인
            </button>
          )}
        </div>

        {/* 햄버거 */}
        <button className="mobile-btn" onClick={() => setMobileOpen(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontSize: 22, padding: "4px 8px", lineHeight: 1, flexShrink: 0 }}>
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── 모바일 메뉴 ── */}
      {mobileOpen && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0, bottom: 0, zIndex: 999,
          background: theme === "dark" ? "rgba(10,8,18,0.98)" : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)", padding: "20px 20px 40px",
          animation: "fadeIn 0.2s ease", overflowY: "auto", borderTop: "1px solid " + C.border,
        }}>
              {/* 기본 메뉴 */}
          {[
            { id: "home",    label: "홈" },
            { id: "about",   label: "소개" },
            { id: "archive", label: "📂 자료실" },
          ].map(m => (
            <button key={m.id} onClick={() => { navigate(m.id); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "13px 16px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3,
              background: page === m.id ? "rgba(124,106,255,0.08)" : "transparent",
              color: page === m.id ? C.purpleL : C.text,
              fontSize: 15, fontWeight: page === m.id ? 700 : 500,
              borderLeft: page === m.id ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* SNS 글쓰기 */}
          <div style={{ margin: "8px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purpleL, letterSpacing: 1, padding: "0 4px" }}>✍️ SNS 글쓰기</div>
          </div>
          {[
            { ai: "blog_naver_intro",   label: "네이버 블로그" },
            { ai: "blog_tistory_intro", label: "티스토리" },
            { ai: "blog_insta_intro",   label: "인스타그램 캡션" },
            { ai: "blog_youtube_intro", label: "유튜브 대본" },
            { ai: "blog_thread_intro",  label: "스레드" },
            { ai: "blog_yt_blog_intro", label: "유튜브로 글쓰기" },
            { ai: "blog_news_intro",    label: "뉴스로 글쓰기" },
            { ai: "blog_cafe",          label: "네이버 카페" },
          ].map(m => (
            <button key={m.ai} onClick={() => { navigateAi(m.ai); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 16px 10px 20px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: (page==="ai"&&aiMenu?.startsWith(m.ai.replace("_intro",""))) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (page==="ai"&&aiMenu?.startsWith(m.ai.replace("_intro",""))) ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: (page==="ai"&&aiMenu?.startsWith(m.ai.replace("_intro",""))) ? 700 : 400,
              borderLeft: (page==="ai"&&aiMenu?.startsWith(m.ai.replace("_intro",""))) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* SNS 이미지 */}
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purpleL, letterSpacing: 1, padding: "0 4px" }}>🖼 SNS 이미지</div>
          </div>
          {[
            { ai: "cardnews_simple", label: "심플 카드뉴스" },
            { ai: "cardnews_image",  label: "이미지 카드뉴스" },
            { ai: "detail_simple",   label: "심플 상세페이지" },
            { ai: "detail_image",    label: "이미지 상세페이지" },
            ...(user?.role === "admin" ? [{ ai: "shorts", label: "쇼츠영상 생성기 👑" }] : []),
          ].map(m => (
            <button key={m.ai} onClick={() => { navigateAi(m.ai); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 16px 10px 20px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: (page==="ai"&&aiMenu?.startsWith(m.ai)) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (page==="ai"&&aiMenu?.startsWith(m.ai)) ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: (page==="ai"&&aiMenu?.startsWith(m.ai)) ? 700 : 400,
              borderLeft: (page==="ai"&&aiMenu?.startsWith(m.ai)) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* 이미지 생성 */}
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purpleL, letterSpacing: 1, padding: "0 4px" }}>🎨 이미지생성</div>
          </div>
          {[
            { ai: "product_shot", label: "제품컷 생성" },
            { ai: "logo_gen",     label: "로고 생성" },
            { ai: "mockup_gen",   label: "목업 생성" },
            { ai: "model_gen",    label: "모델 생성" },
            { ai: "face_swap",    label: "얼굴·의상 교체" },
            { ai: "outpaint",     label: "좌우 여백 채우기" },
          ].map(m => (
            <button key={m.ai} onClick={() => { navigateAi(m.ai); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 16px 10px 20px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: (page==="ai"&&aiMenu===m.ai) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (page==="ai"&&aiMenu===m.ai) ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: (page==="ai"&&aiMenu===m.ai) ? 700 : 400,
              borderLeft: (page==="ai"&&aiMenu===m.ai) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* 커뮤니티 */}
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, padding: "0 4px" }}>💬 커뮤니티</div>
          </div>
          {[
            { board: "info",   label: "정보공유" },
            { board: "qna",    label: "질문답변" },
            { board: "free",   label: "자유게시판" },
            { board: "review", label: "사용후기" },
          ].map(m => (
            <button key={m.board} onClick={() => { navigateBoard(m.board); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 16px 10px 20px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: (page==="community"&&boardCat===m.board) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (page==="community"&&boardCat===m.board) ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: (page==="community"&&boardCat===m.board) ? 700 : 400,
              borderLeft: (page==="community"&&boardCat===m.board) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* 기타 */}
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }} />
          {[
            { id: "pricing", label: "💎 가격정책" },
            { id: "contact", label: "📬 문의하기" },
          ].map(m => (
            <button key={m.id} onClick={() => { navigate(m.id); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "13px 16px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3,
              background: page === m.id ? "rgba(124,106,255,0.08)" : "transparent",
              color: page === m.id ? C.purpleL : C.text,
              fontSize: 15, fontWeight: page === m.id ? 700 : 500,
              borderLeft: page === m.id ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid " + C.border }}>
            {user ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c6aff,#ec4899)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>
                      {(user.nick||"U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{user.nick}</div>
                      <div style={{ fontSize: 12, color: C.purpleL, marginTop: 1 }}>💎 {(user.points||0).toLocaleString()}P · {Math.floor((user.points||0)/10)}회 가능</div>
                    </div>
                  </div>
                  <button onClick={logout} style={{ padding: "7px 14px", borderRadius: 9, cursor: "pointer", border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12 }}>로그아웃</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setShowAttendance(true); setMobileOpen(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔴 출석체크</button>
                  <button onClick={() => { navigate("pricing"); setMobileOpen(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💎 포인트 충전</button>
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const left = Math.max(0, FREE_GUEST - guestUsageCount);
                  return (
                    <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10,
                      background: left > 0 ? "rgba(99,102,241,0.08)" : "rgba(239,68,68,0.08)",
                      border: `1px solid ${left > 0 ? "rgba(99,102,241,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: C.muted }}>비회원 AI 무료 사용</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: left > 0 ? "#a5b4fc" : "#f87171" }}>
                          {left > 0 ? `${left}회 남음` : "소진 ⚡"}
                        </span>
                      </div>
                      {left > 0 && (
                        <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: "rgba(99,102,241,0.15)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, width: (left/FREE_GUEST*100)+"%", background: "linear-gradient(90deg,#7c6aff,#ec4899)" }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => { setShowAuth(true); setMobileOpen(false); }} style={{ width: "100%", padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 페이지 ── */}
      <div style={{ paddingTop: 60 }} className="page-anim" key={page}>
        {renderPage()}
      </div>

      {/* ── 푸터 (AI 페이지에선 숨김) ── */}
      {page !== "ai" && <footer style={{ borderTop: "1px solid " + C.border, padding: "48px 24px", background: C.footerBg }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 36 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>N</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>SNS메이킷</div>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>NPER CONTENTS LAB</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.85 }}>비즈니스를 위한 SNS 성장 파트너. AI를 활용해 더 빠르게, 더 스마트하게</p>
            </div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>커뮤니티</div>
                {[
                  {id:"info",icon:"📌",label:"정보공유"},
                  {id:"qna",icon:"❓",label:"질문답변"},
                  {id:"free",icon:"🗣",label:"자유게시판"},
                  {id:"review",icon:"⭐",label:"사용후기"},
                ].map(cc => (
                  <div key={cc.id} onClick={() => { navigateBoard(cc.id); setMobileOpen(false); }} style={{ fontSize: 14, color: C.muted, padding: "6px 0", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = C.purpleL}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    {cc.icon} {cc.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 1000, margin: "24px auto 0", paddingTop: 24, borderTop: "1px solid " + C.border, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 법적 방침 링크 */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "이용약관", tab: "terms" },
                { label: "개인정보처리방침", tab: "privacy" },
                { label: "환불정책", tab: "refund" },
              ].map(item => (
                <button key={item.tab} onClick={() => navigate("legal")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, padding: 0, textDecoration: "underline" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.purpleL}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {item.label}
                </button>
              ))}
            </div>
            {/* 사업자 정보 */}
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 2 }}>
              상호명: 엔퍼그로스 &nbsp;|&nbsp; 대표자: 김선봉 &nbsp;|&nbsp; 사업자등록번호: 598-09-02769
              <br/>
              사업장 주소: 서울특별시 금천구 디지털로9길 68, 대륭포스트타워 5차 1층 111(-377)호 (가산동)
              <br/>
              통신판매업 신고번호: 2024-서울금천-1997호 &nbsp;|&nbsp; 고객센터: npermovie@naver.com
            </div>
            <span style={{ fontSize: 11, color: C.muted }}>© 2025 SNS메이킷 · All rights reserved.</span>
          </div>
      </footer>}
    </div>
  );
}
