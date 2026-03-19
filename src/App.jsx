import { useState, useEffect, useRef } from "react";
import { THEMES, THEME_KEY, getSavedTheme } from "./theme";
import { getUser, setUser, setLocalUser, fbLogout, auth, fetchUser } from "./storage";
import { onAuthStateChanged } from "firebase/auth";

// 페이지 컴포넌트
import HomePage from "./HomePage";
import { AboutPage, AiPage, PricingPage, ContactPage } from "./OtherPages";
import BoardPage from "./BoardPage";
import ArchivePage from "./ArchivePage";
import AdminPage from "./AdminPage";
import AuthModal from "./AuthModal";
import MyPage from "./MyPage";

const SNS = [
  { url: "https://open.kakao.com/o/gIw9vTFg",              label: "💬", bg: "#FEE500", tc: "#3A1D1D" },
  { url: "https://www.instagram.com/nperinsight/",          label: "📸", bg: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)", tc: "#fff" },
  { url: "https://www.youtube.com/@nperinsight/videos",     label: "▶",  bg: "#FF0000", tc: "#fff" },
];

// 전체 접속자 수 훅 (회원+비회원 통합)
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
      } catch {}
    }
    hb();
    const t = setInterval(hb, 15000);
    return () => {
      clearInterval(t);
      try { const raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch {}
    };
  }, []);
  return count;
}

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
  const [theme,      setTheme]      = useState(getSavedTheme);

  const boardSubRef = useRef(null);
  const profileRef  = useRef(null);
  const aiSubRef    = useRef(null);

  const onlineCount = useOnlineCount();

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
    if (mainSeg === "community" && segments[1] && !segments[1].startsWith("post-")) {
      setBoardCat(segments[1]);
    }
    // /ai/blog_naver_intro → page=ai, aiMenu=blog_naver_intro
    if (mainSeg === "ai" && segments[1]) {
      setAiMenu(segments[1]);
    }
    if (mainSeg === "mypage" && !user) { setPage("home"); return; } // 비로그인 차단
    if (mainSeg && mainSeg !== "home") setPage(mainSeg);
  }, []);

  useEffect(() => {
    const fn = () => {
      const path = window.location.pathname.replace(/^\//, "") || "home";
      const segs = path.split("/");
      const main = segs[0] || "home";
      setBoardSub(false); setMobileOpen(false);
      window.scrollTo(0, 0);
      if (main === "ai" && segs[1]) {
        setPage("ai");
        setAiMenu(segs[1]);
      } else if (main === "community" && segs[1]) {
        setBoardCat(segs[1]);
        setPage("community");
      } else {
        setPage(main === "" ? "home" : main);
      }
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  const navigate = target => {
    if (target === "login_trigger") { setShowAuth(true); return; }
    const urlTarget = target === "home" ? "/" : "/" + target;
    window.history.pushState(null, "", urlTarget);
    setPage(target); setBoardSub(false); setAiSub(false); setMobileOpen(false);
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
    window.history.pushState(null, "", "/ai/" + menu);
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
    if (page === "archive")  return <ArchivePage C={C} theme={theme} user={user} />;
    if (page === "ai")       return <AiPage C={C} theme={theme} user={user} navigate={navigate} onLogout={logout} onLoginRequest={() => setShowAuth(true)} aiMenu={aiMenu} setAiMenu={(menu) => {
        setAiMenu(menu);
        window.history.pushState(null, "", "/ai/" + menu);
        window.scrollTo(0, 0);
      }} />;
    if (isBoard)             return <BoardPage key={boardCat} C={C} user={user} onLoginRequest={() => setShowAuth(true)} initialCat={boardCat} pendingPostId={pendingPostId} onPendingPostClear={() => setPendingPostId(null)} onNavigatePost={navigatePost} />;
    if (page === "pricing")  return <PricingPage C={C} navigate={navigate} user={user} onLogin={() => setShowAuth(true)} />;
    if (page === "contact")  return <ContactPage C={C} />;
    if (page === "mypage")   return <MyPage user={user} setUser={u=>{ setUserState(u); try{localStorage.setItem("nper_user",JSON.stringify(u));}catch{} }} C={C} navigate={navigate} theme={theme} />;
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
          <NavBtn id="archive" label="📂 자료실" />
          <div ref={aiSubRef} style={{ position: "relative" }}>
            <DropBtn label="🤖 AI 생성기" open={aiSub} active={page === "ai"} onClick={() => setAiSub(s => !s)} />
            {aiSub && (
              <DropMenu>
                {/* SNS 글쓰기 */}
                <div style={{ padding:"6px 14px 2px", fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.3)", letterSpacing:1.2, textTransform:"uppercase" }}>SNS 글쓰기</div>
                <DropItem id="ai" icon="📝" label="네이버 블로그"   onClick={() => { navigateAi("blog_naver_intro");   setAiSub(false); }} />
                <DropItem id="ai" icon="🟠" label="티스토리"        onClick={() => { navigateAi("blog_tistory_intro"); setAiSub(false); }} />
                <DropItem id="ai" icon="📱" label="인스타그램 캡션" onClick={() => { navigateAi("blog_insta_intro");   setAiSub(false); }} />
                <DropItem id="ai" icon="▶️" label="유튜브 대본"     onClick={() => { navigateAi("blog_youtube_intro"); setAiSub(false); }} />
                <DropItem id="ai" icon="🧵" label="스레드"          onClick={() => { navigateAi("blog_thread_intro");  setAiSub(false); }} />
                <DropItem id="ai" icon="📺" label="유튜브로 글쓰기" onClick={() => { navigateAi("blog_yt_blog_intro"); setAiSub(false); }} />
                <DropItem id="ai" icon="📰" label="뉴스로 글쓰기"   onClick={() => { navigateAi("blog_news_intro");    setAiSub(false); }} />
                {/* SNS 이미지 */}
                <div style={{ padding:"8px 14px 2px", fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.3)", letterSpacing:1.2, textTransform:"uppercase", borderTop:"1px solid rgba(255,255,255,0.07)", marginTop:4 }}>SNS 이미지</div>
                <DropItem id="ai" icon="✨" label="심플 카드뉴스"    onClick={() => { navigateAi("cardnews_simple");  setAiSub(false); }} />
                <DropItem id="ai" icon="🖼" label="이미지 카드뉴스"  onClick={() => { navigateAi("cardnews_image");   setAiSub(false); }} />
                <DropItem id="ai" icon="📋" label="심플 상세페이지"  onClick={() => { navigateAi("detail_simple");    setAiSub(false); }} />
                <DropItem id="ai" icon="🛍" label="이미지 상세페이지" onClick={() => { navigateAi("detail_image");     setAiSub(false); }} />
                <DropItem id="ai" icon="🎬" label="쇼츠영상 생성기"  onClick={() => { navigateAi("shorts");           setAiSub(false); }} />
              </DropMenu>
            )}
          </div>
          <div ref={boardSubRef} style={{ position: "relative" }}>
            <DropBtn label="커뮤니티" open={boardSub} active={isBoard} onClick={() => setBoardSub(s => !s)} />
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

        {/* 오른쪽: 테마 + 로그인/로그아웃 + 문의 */}
        <div className="nav-right" style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={toggleTheme} title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, border: "1px solid " + C.border, background: C.toggleBg, cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted, transition: "all 0.2s", flexShrink: 0 }}>
            {theme === "light" ? "🌙 다크" : "☀️ 라이트"}
          </button>
          <button onClick={() => { navigate("contact"); }} style={{ padding: "5px 13px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted }}>문의하기</button>
          {user ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
              <button onClick={logout} style={{ padding: "5px 13px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.muted }}>로그아웃</button>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 5px #4ade80" }}/>
                <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{onlineCount}명 접속중</span>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
              <button onClick={() => setShowAuth(true)} style={{ padding: "5px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>로그인</button>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 5px #4ade80" }}/>
                <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{onlineCount}명 접속중</span>
              </div>
            </div>
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
          {/* 기본 메뉴 */}
          {[
            { id: "home",  label: "홈" },
            { id: "about", label: "소개" },
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
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1.5, padding: "0 4px" }}>✍️ SNS 글쓰기</div>
          </div>
          {[
            { id: "blog_naver",   label: "📝 네이버 블로그",   ai: "blog_naver_intro" },
            { id: "blog_tistory", label: "🟠 티스토리",        ai: "blog_tistory_intro" },
            { id: "blog_insta",   label: "📱 인스타그램 캡션", ai: "blog_insta_intro" },
            { id: "blog_youtube", label: "▶️ 유튜브 대본",     ai: "blog_youtube_intro" },
            { id: "blog_thread",  label: "🧵 스레드",          ai: "blog_thread_intro" },
            { id: "blog_yt_blog", label: "📺 유튜브로 글쓰기", ai: "blog_yt_blog_intro" },
            { id: "blog_news",    label: "📰 뉴스로 글쓰기",   ai: "blog_news_intro" },
          ].map(m => (
            <button key={m.id} onClick={() => { navigateAi(m.ai); setMobileOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 16px 10px 20px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: (page==="ai"&&aiMenu===m.ai) ? "rgba(124,106,255,0.08)" : "transparent",
              color: (page==="ai"&&aiMenu===m.ai) ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: (page==="ai"&&aiMenu===m.ai) ? 700 : 400,
              borderLeft: (page==="ai"&&aiMenu===m.ai) ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* SNS 이미지 */}
          <div style={{ margin: "14px 0 6px", paddingBottom: 6, borderBottom: "1px solid " + C.border }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1.5, padding: "0 4px" }}>🖼 SNS 이미지</div>
          </div>
          {[
            { id: "cardnews_simple", label: "✨ 심플 카드뉴스",    ai: "cardnews_simple" },
            { id: "cardnews_image",  label: "🖼 이미지 카드뉴스",  ai: "cardnews_image" },
            { id: "detail_simple",   label: "📋 심플 상세페이지",  ai: "detail_simple" },
            { id: "detail_image",    label: "🛍 이미지 상세페이지", ai: "detail_image" },
            { id: "shorts",          label: "🎬 쇼츠영상 생성기",   ai: "shorts" },
          ].map(m => (
            <button key={m.id} onClick={() => { navigateAi(m.ai); setMobileOpen(false); }} style={{
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
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 1.5, padding: "0 4px" }}>💬 커뮤니티</div>
          </div>
          {[
            { id: "info",   label: "📌 정보공유",   board: "info"   },
            { id: "qna",    label: "❓ 질문답변",   board: "qna"    },
            { id: "free",   label: "🗣 자유게시판", board: "free"   },
            { id: "review", label: "⭐ 사용후기",   board: "review" },
          ].map(m => (
            <button key={m.id} onClick={() => { navigateBoard(m.board); setMobileOpen(false); }} style={{
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
              <div style={{ display: "flex", flexDirection:"column", gap:10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{user.nick}</div>
                    <div style={{ fontSize: 12, color: C.purpleL, marginTop: 2 }}>💎 {(user.points||0).toLocaleString()}cr</div>
                  </div>
                  <button onClick={logout} style={{ padding: "8px 16px", borderRadius: 9, cursor: "pointer", border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 13 }}>로그아웃</button>
                </div>
                <button onClick={()=>{ navigate("mypage"); setMobileOpen(false); }}
                  style={{ width:"100%", padding:"11px", borderRadius:10, border:"1px solid "+C.border, background:"transparent", color:C.purpleL, fontSize:13, fontWeight:700, cursor:"pointer", textAlign:"left" }}>
                  👤 내 마이페이지 (크레딧 내역·닉네임 변경)
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowAuth(true); setMobileOpen(false); }} style={{ width: "100%", padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>
                로그인 / 회원가입
              </button>
            )}
            {/* 라이트/다크 모드 토글 + 접속자 수 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>현재 {onlineCount}명 접속중</span>
              </div>
              <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, border: "1px solid " + C.border, background: C.toggleBg, cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.muted }}>
                {theme === "light" ? "🌙 다크" : "☀️ 라이트"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 페이지 ── */}
      <div style={{ paddingTop: 60 }} className="page-anim" key={page}>
        {renderPage()}
      </div>

      {/* ── 푸터 ── */}
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
    </div>
  );
}
