import { useState, useEffect, useRef } from "react";
import { THEMES, THEME_KEY, getSavedTheme } from "./theme";
import { getUser, setUser, setLocalUser, fbLogout, auth, fetchUser } from "./storage";
import { onAuthStateChanged } from "firebase/auth";

// 페이지 컴포넌트
import HomePage from "./HomePage";
import ArchivePage from "./ArchivePage";
import { AboutPage, AiPage, PricingPage, ContactPage } from "./OtherPages";
import BoardPage from "./BoardPage";
import AdminPage from "./AdminPage";
import AuthModal from "./AuthModal";



export default function App() {
  const [page,       setPage]       = useState("home");
  const [user,       setUserState]  = useState(getUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [showAuth,   setShowAuth]   = useState(false);
  const [boardSub,   setBoardSub]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [boardCat,   setBoardCat]   = useState("info");
  const [pendingPostId, setPendingPostId] = useState(null);
  const [aiSub,      setAiSub]      = useState(false);
  const [aiMenu,     setAiMenu]     = useState("home");
  const [archiveSub, setArchiveSub] = useState(false);
  const [theme,      setTheme]      = useState(getSavedTheme);

  const boardSubRef = useRef(null);
  const profileRef  = useRef(null);
  const aiSubRef    = useRef(null);
  const archiveSubRef = useRef(null);

  // 현재 테마 팔레트
  const C = THEMES[theme];

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  // 카카오 OAuth 콜백 처리
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const path = window.location.pathname;
    if (path === "/oauth/kakao" && code) {
      // 부모창에 코드 전달 후 팝업 닫기
      if (window.opener) {
        window.opener.postMessage({ type: "kakao_code", code }, "*");
        window.close();
      } else {
        // 팝업 아닌 경우 직접 처리
        import("./storage").then(({ fbKakaoLogin, setLocalUser }) => {
          fbKakaoLogin(code).then(user => {
            setLocalUser(user);
            window.location.href = "/";
          }).catch(() => { window.location.href = "/"; });
        });
      }
    }
  }, []);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUser(firebaseUser.uid);
        if (userData) { setLocalUser(userData); setUserState(userData); }
      } else {
        const localU = getUser();
        if (localU && !localU.uid) {
          // 구형 로컬스토리지 유저 → 초기화
          setLocalUser(null); setUserState(null);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = e => {
      if (boardSubRef.current && !boardSubRef.current.contains(e.target)) setBoardSub(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (aiSubRef.current && !aiSubRef.current.contains(e.target)) setAiSub(false);
      if (archiveSubRef.current && !archiveSubRef.current.contains(e.target)) setArchiveSub(false);
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
    // /community/info → page=community, boardCat=info
    if (mainSeg === "community" && segments[1] && !segments[1].startsWith("post-")) {
      setBoardCat(segments[1]);
    }
    if (mainSeg && mainSeg !== "home") setPage(mainSeg);
  }, []);

  useEffect(() => {
    const fn = () => {
      const hash = window.location.hash.replace("#", "") || "home";
      setPage(hash); setBoardSub(false); setMobileOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  const navigate = target => {
    if (target === "login_trigger") { setShowAuth(true); return; }
    const urlTarget = target === "home" ? "/" : "/" + target;
    window.history.pushState(null, "", urlTarget);
    setPage(target); setBoardSub(false); setAiSub(false); setArchiveSub(false); setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const navigateBoard = (cat) => {
    setBoardCat(cat);
    window.history.pushState(null, "", "/community/" + cat);
    setPage("community"); setBoardSub(false); setAiSub(false); setMobileOpen(false);
    window.scrollTo(0, 0);
  };
  const navigatePost = (postId) => {
    const cat = boardCat || "info";
    window.history.pushState(null, "", "/community/" + cat + "/post-" + postId);
  };

  const navigateAi = (menu) => {
    setAiMenu(menu);
    window.history.pushState(null, "", "/ai");
    setPage("ai"); setBoardSub(false); setAiSub(false); setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const handleAuth = u => { setLocalUser(u); setUserState(u); setShowAuth(false); };
  const logout = async () => {
    try { await fbLogout(); } catch(e) {}
    setLocalUser(null); setUserState(null); navigate("home");
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

  const DropMenu = ({ children }) => (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
      background: C.modalBg, border: "1px solid " + C.border,
      borderRadius: 13, padding: 6, minWidth: 190,
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)", animation: "fadeIn 0.15s ease",
    }}>{children}</div>
  );

  const DropItem = ({ id, icon, label, onClick }) => (
    <button onClick={onClick || (() => navigate(id))} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "10px 14px", borderRadius: 9, border: "none", cursor: "pointer",
      background: page === id ? "rgba(124,106,255,0.08)" : "transparent",
      color: page === id ? C.purpleL : C.muted,
      fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(124,106,255,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = page === id ? "rgba(124,106,255,0.08)" : "transparent"}>
      <span>{icon}</span>{label}
    </button>
  );

  /* ── 페이지 렌더 ── */
  const renderPage = () => {
    if (page === "home")     return <HomePage C={C} navigate={navigate} />;
    if (page === "about")    return <AboutPage C={C} navigate={navigate} />;
    if (page === "archive")  return <ArchivePage theme={theme} />;
    if (page === "ai")       return <AiPage C={C} theme={theme} user={user} navigate={navigate} onLogout={logout} onLoginRequest={() => setShowAuth(true)} aiMenu={aiMenu} setAiMenu={setAiMenu} />;
    if (isBoard)             return <BoardPage key={boardCat} C={C} user={user} onLoginRequest={() => setShowAuth(true)} initialCat={boardCat} pendingPostId={pendingPostId} onPendingPostClear={() => setPendingPostId(null)} onNavigatePost={navigatePost} />;
    if (page === "pricing")  return <PricingPage C={C} navigate={navigate} user={user} onLogin={() => setShowAuth(true)} />;
    if (page === "contact")  return <ContactPage C={C} />;
    if (page === "admin")    return <AdminPage C={C} user={user} />;
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
        .page-anim{animation:fadeIn 0.2s ease}
        textarea{resize:vertical}
        .desktop-nav{display:flex!important}
        .mobile-btn{display:none!important}
        .nav-right{display:flex!important}
        @media(max-width:768px){
          .desktop-nav{display:none!important}
          .mobile-btn{display:flex!important}
          .nav-right{display:none!important}
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

      {showAuth && <AuthModal C={C} onClose={() => setShowAuth(false)} onAuth={handleAuth} />}

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
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          <NavBtn id="home" label="홈" />
          <NavBtn id="about" label="소개" />
          <div ref={aiSubRef} style={{ position: "relative" }}>
            <DropBtn label="🤖 AI 생성기" open={aiSub} active={page === "ai"} onClick={() => { setAiSub(s => !s); setArchiveSub(false); setBoardSub(false); }} />
            {aiSub && (
              <DropMenu>
                <DropItem id="ai" icon="✍️" label="SNS 글쓰기"      onClick={() => navigateAi("blog_naver")} />
                <DropItem id="ai" icon="🃏" label="SNS 이미지 만들기" onClick={() => navigateAi("cardnews_make")} />
                <DropItem id="ai" icon="🎬" label="쇼츠영상 생성기" onClick={() => navigateAi("shorts")} />
              </DropMenu>
            )}
          </div>
          <div ref={archiveSubRef} style={{ position: "relative" }}>
            <DropBtn label="📂 자료실" open={archiveSub} active={page === "archive"} onClick={() => { setArchiveSub(s => !s); setBoardSub(false); setAiSub(false); }} />
            {archiveSub && (
              <DropMenu>
                <DropItem id="archive" icon="📁" label="전체 자료" onClick={() => { navigate("archive"); setArchiveSub(false); }} />
              </DropMenu>
            )}
          </div>
          <div ref={boardSubRef} style={{ position: "relative" }}>
            <DropBtn label="커뮤니티" open={boardSub} active={isBoard} onClick={() => { setBoardSub(s => !s); setArchiveSub(false); setAiSub(false); }} />
            {boardSub && (
              <DropMenu>
                <DropItem id="community" icon="📌" label="정보공유"   onClick={() => { navigateBoard("info");   setBoardSub(false); }} />
                <DropItem id="community" icon="❓" label="질문답변"   onClick={() => { navigateBoard("qna");    setBoardSub(false); }} />
                <DropItem id="community" icon="🗣" label="자유게시판" onClick={() => { navigateBoard("free");   setBoardSub(false); }} />
                <DropItem id="community" icon="⭐" label="사용후기"   onClick={() => { navigateBoard("review"); setBoardSub(false); }} />
              </DropMenu>
            )}
          </div>
          <NavBtn id="pricing" label="가격정책" />
          <NavBtn id="contact" label="문의하기" />
        </div>

        {/* 오른쪽: SNS + 테마 + 로그인 */}
        <div className="nav-right" style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>

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
                <span style={{ fontSize: 11, color: C.purpleL, fontWeight: 700 }}>💎{(user.points||0).toLocaleString()}cr</span>
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
                        <span style={{ color: C.muted }}>크레딧 잔액</span>
                        <span style={{ fontWeight: 800, color: C.purpleL }}>💎 {(user.points||0).toLocaleString()}cr</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: theme==="dark"?"rgba(255,255,255,0.08)":"#e0e0eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: Math.min(((user.points||0)/500)*100,100)+"%",
                          background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>AI글=10cr · 이미지=30cr · {Math.floor((user.points||0)/30)}장 생성가능</div>
                    </div>
                  </div>
                  {/* 메뉴 */}
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: "💎", label: "크레딧 충전", sub: "더 많은 AI 생성", action: () => { navigate("pricing"); setProfileOpen(false); } },
                      { icon: "📁", label: "내 보관함", sub: "생성한 글·카드뉴스 확인", action: () => { navigate("ai"); setProfileOpen(false); } },
                      { icon: "📅", label: "가입일", sub: user.joinDate ? new Date(user.joinDate).toLocaleDateString("ko-KR") : "-", action: null },
                      { icon: "🕐", label: "마지막 로그인", sub: user.lastLoginDate || "-", action: null },
                      ...(user.role==="admin" ? [{ icon: "⚙️", label: "관리자 페이지", sub: "회원·포인트 관리", action: () => { navigate("admin"); setProfileOpen(false); } }] : []),
                    ].map((m,i) => (
                      <button key={i} onClick={m.action || undefined} disabled={!m.action}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "none", background: "transparent",
                          cursor: m.action ? "pointer" : "default", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                        onMouseEnter={e=>{ if(m.action) e.currentTarget.style.background=theme==="dark"?"rgba(255,255,255,0.06)":"#f5f5f8"; }}
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
            <button onClick={() => setShowAuth(true)} style={{ padding: "5px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>로그인</button>
          )}
        </div>

        {/* 햄버거 */}
        <button className="mobile-btn" onClick={() => setMobileOpen(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontSize: 22, padding: "4px 8px", marginLeft: "auto", lineHeight: 1 }}>
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
          {[
            { id: "home",  label: "홈" },
            { id: "about",   label: "소개" },
            { id: "archive", label: "📂 자료실" },
            { id: "ai_bl",  label: "✍️ SNS 글쓰기",         ai: "blog_naver" },
            { id: "ai_cn",  label: "🖼 SNS 이미지 만들기",  ai: "cardnews_make" },
            { id: "ai_sh",  label: "🎬 쇼츠영상 생성기",   ai: "shorts" },
            { id: "info",   label: "📌 정보공유",   board: "info"   },
            { id: "qna",    label: "❓ 질문답변",   board: "qna"    },
            { id: "free",   label: "🗣 자유게시판", board: "free"   },
            { id: "review", label: "⭐ 사용후기",   board: "review" },
            { id: "pricing", label: "가격정책" },
            { id: "contact", label: "문의하기" },
          ].map(m => (
            <button key={m.id} onClick={() => m.ai ? navigateAi(m.ai) : m.board ? navigateBoard(m.board) : navigate(m.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "14px 16px", borderRadius: 12, border: "none", cursor: "pointer", marginBottom: 4,
              background: (m.ai ? (page==="ai"&&aiMenu===m.ai) : page===m.id) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (m.ai ? (page==="ai"&&aiMenu===m.ai) : page===m.id) ? C.purpleL : C.muted,
              fontSize: 16, fontWeight: (m.ai ? (page==="ai"&&aiMenu===m.ai) : page===m.id) ? 700 : 500,
              borderLeft: (m.ai ? (page==="ai"&&aiMenu===m.ai) : page===m.id) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid " + C.border }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{user.nick}</div>
                  <div style={{ fontSize: 12, color: C.purpleL, marginTop: 2 }}>{(user.points||0).toLocaleString()}cr</div>
                </div>
                <button onClick={logout} style={{ padding: "8px 16px", borderRadius: 9, cursor: "pointer", border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 13 }}>로그아웃</button>
              </div>
            ) : (
              <button onClick={() => { setShowAuth(true); setMobileOpen(false); }} style={{ width: "100%", padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>
                로그인 / 회원가입
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 페이지 ── */}
      <div style={{ paddingTop: 60 }} className="page-anim" key={page}>
        {renderPage()}
      </div>

      {/* ── 푸터 ── */}
      {!isAi && (
        <footer style={{ borderTop: "1px solid " + C.border, padding: "48px 24px", background: C.footerBg }}>
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
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>서비스</div>
                {["강의 사이트 운영", "SNS 홍보 지원", "프로그램 & 자료 제공", "관리 대행"].map(s => (
                  <div key={s} style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{s}</div>
                ))}
              </div>
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
          <div style={{ maxWidth: 1000, margin: "24px auto 0", paddingTop: 24, borderTop: "1px solid " + C.border, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>© 2025 SNS메이킷 · All rights reserved.</span>
            <span style={{ fontSize: 12, color: C.muted, cursor: "pointer" }} onClick={() => navigate("admin")}>관리자</span>
          </div>
        </footer>
      )}
    </div>
  );
}
