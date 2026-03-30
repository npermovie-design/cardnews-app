import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { THEMES, THEME_KEY, getSavedTheme } from "./theme";
import { getUser, setUser, setLocalUser, fbLogout, supabase, fetchUser, syncOAuthUser, FREE_GUEST } from "./storage";
import { useI18n, LANGUAGES } from "./i18n.jsx";

// 핵심 컴포넌트 (즉시 로드)
import HomePage from "./HomePage";
import AuthModal from "./AuthModal";
import Footer from "./Footer.jsx";

// 지연 로드 컴포넌트 (코드 스플리팅)
const AboutPage = lazy(() => import("./AboutPage").then(m => ({ default: m.AboutPage })));
const HowToPage = lazy(() => import("./AboutPage").then(m => ({ default: m.HowToPage })));
const FaqPage = lazy(() => import("./AboutPage").then(m => ({ default: m.FaqPage })));
const AiPage = lazy(() => import("./AiPage").then(m => ({ default: m.AiPage })));
const ContactPage = lazy(() => import("./ContactPage").then(m => ({ default: m.ContactPage })));
const PricingPage = lazy(() => import("./PricingPage").then(m => ({ default: m.PricingPage })));
const PaymentSuccessPage = lazy(() => import("./PaymentPage").then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailPage = lazy(() => import("./PaymentPage").then(m => ({ default: m.PaymentFailPage })));
const LegalPage = lazy(() => import("./LegalPage").then(m => ({ default: m.LegalPage })));
const BoardPage = lazy(() => import("./BoardPage"));
const AdminPage = lazy(() => import("./AdminPage"));
const MyPage = lazy(() => import("./MyPage"));
const AttendanceModal = lazy(() => import("./AttendanceModal"));
const EventPage = lazy(() => import("./EventPage.jsx"));
const CasePage = lazy(() => import("./CasePage.jsx"));
const AnalyzerPage = lazy(() => import("./AnalyzerPage.jsx"));
const SnsNewsPage = lazy(() => import("./SnsNewsPage.jsx"));

// 로딩 폴백
const PageLoader = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(124,106,255,0.15)", borderTopColor: "#7c6aff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: "rgba(26,23,48,0.4)", fontWeight: 600 }}>Loading...</div>
    </div>
  </div>
);

// 접속자 카운트 훅 (Supabase online_users 테이블 + localStorage 폴백)
function useOnlineCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    let cancelled = false;
    const myId = "u_" + Math.random().toString(36).slice(2, 8);
    const device = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
    async function hb() {
      if (cancelled) return;
      try {
        await supabase.from("online_users").upsert({ id: myId, device, last_seen: new Date().toISOString() }, { onConflict: "id" });
        const cutoff = new Date(Date.now() - 20000).toISOString();
        await supabase.from("online_users").delete().lt("last_seen", cutoff);
        const { count: cnt } = await supabase.from("online_users").select("*", { count: "exact", head: true });
        if (!cancelled && cnt != null) setCount(cnt);
      } catch(e) {
        if (cancelled) return;
        try {
          const KEY = "nper_online_users";
          const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
          const now = Date.now();
          raw[myId] = now;
          Object.keys(raw).forEach(k => { if (now - raw[k] > 15000) delete raw[k]; });
          localStorage.setItem(KEY, JSON.stringify(raw));
          if (!cancelled) setCount(Object.keys(raw).length);
        } catch(e2) {}
      }
    }
    hb();
    const t = setInterval(hb, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
      supabase.from("online_users").delete().eq("id", myId).then(() => {}).catch(() => {});
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
    }} role="dialog" aria-modal="true" aria-label="생성 중 이탈 확인">
      <div style={{
        background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 20, padding: "clamp(20px,5vw,32px) clamp(16px,4vw,28px)", maxWidth: 380, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", textAlign: "center",
        animation: "fadeIn 0.15s ease",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
          &#9888;
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1730", marginBottom: 10 }}>
          생성 중입니다!
        </div>
        <div style={{ fontSize: 14, color: "rgba(26,23,48,0.6)", lineHeight: 1.8, marginBottom: 16 }}>
          페이지를 나가면<br/>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>결과물이 저장되지 않으며</span><br/>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{cost}P 포인트가 소진</span>됩니다.
        </div>
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
          소진된 포인트는 복구되지 않습니다
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1px solid rgba(124,106,255,0.2)",
              background: "rgba(124,106,255,0.06)", color: "#7c6aff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
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

// OG 메타태그 동적 업데이트 (클라이언트)
function updateOgMeta(title, description, path, image) {
  const url = "https://snsmakeit.com" + (path || "/");
  const setMeta = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  };
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('link[rel="canonical"]', "href", url);
  if (description) {
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="description"]', "content", description);
  }
  if (image) {
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:image"]', "content", image);
  }
}

export default function App() {
  const [page,       setPage]       = useState("home");
  const [user,       setUserState]  = useState(getUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const { t, lang, setLang } = useI18n();
  const [guestUsageCount, setGuestUsageCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}").guest || 0; } catch { return 0; }
  });

  const dropMenuRef   = useRef(null);
  const profileRef    = useRef(null);
  const isLoggingOut  = useRef(false);
  const onlineCount   = useOnlineCount();

  // 현재 테마 팔레트
  const C = THEMES[theme];

  const toggleTheme = () => {};

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

  // OAuth 에러 콜백 처리 — URL에 error 파라미터가 있으면 정리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error") || params.has("error_code")) {
      console.warn("OAuth error:", params.get("error"), params.get("error_description"));
      // 에러 파라미터 제거하여 URL 정리
      window.history.replaceState({}, "", window.location.pathname);
    }
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

  // popstate - 뒤로가기: URL에서 상태 복원
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
      // URL 파싱으로 이전 페이지 상태 정확히 복원
      const rawPath = window.location.pathname.replace(/^\//, "") || "home";
      const segments = rawPath.split("/");
      const mainSeg = segments[0] || "home";

      // 커뮤니티 하위 카테고리 복원
      if (mainSeg === "community" && segments[1] && !segments[1].startsWith("post-")) {
        setBoardCat(segments[1]);
      }
      // AI 메뉴 복원
      if (mainSeg === "ai" && segments[1]) {
        setAiMenu(segments[1]);
      } else if (mainSeg === "ai") {
        setAiMenu("home");
      }
      // 게시글 뷰 복원 (post-ID)
      if (segments.some(s => s.startsWith("post-"))) {
        const pid = rawPath.split("/post-")[1];
        if (pid) setPendingPostId(pid);
      }

      setPage(mainSeg); setOpenMenu(null); setMobileOpen(false);
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

  const [legalTab, setLegalTab] = useState("terms");
  const navigate = async (target, extra) => {
    if (target === "login_trigger") { setShowAuth(true); return; }
    if (!(await confirmGuard())) return;
    const urlTarget = target === "home" ? "/" : "/" + target;
    window.history.pushState(null, "", urlTarget);
    setPage(target); setOpenMenu(null); setMobileOpen(false);
    if (target === "legal" && extra) setLegalTab(extra);
    // SEO: 다국어 동적 타이틀
    const brand = lang === "ko" ? "SNS메이킷" : "SNS Makeit";
    const titleMap = {
      ko: { home:"SNS메이킷 - AI 카드뉴스·블로그·이미지 자동 생성", about:"소개", howto:"이용방법", ai:"AI 생성기", pricing:"가격정책", contact:"문의하기", event:"이벤트", community:"커뮤니티", legal:"약관·정책", snsnews:"SNS뉴스" },
      en: { home:"SNS Makeit - AI Card News · Blog · Image Generator", about:"About", howto:"How to Use", ai:"AI Generator", pricing:"Pricing", contact:"Contact", event:"Events", community:"Community", legal:"Terms & Policy", snsnews:"SNS News" },
      ja: { home:"SNS Makeit - AI カードニュース·ブログ·画像生成", about:"紹介", howto:"使い方", ai:"AI生成器", pricing:"料金", contact:"お問い合わせ", event:"イベント", community:"コミュニティ", legal:"利用規約", snsnews:"SNSニュース" },
    };
    const titles = titleMap[lang] || titleMap.ko;
    const pageTitle = target === "home" ? titles.home : (titles[target] || target) + " - " + brand;
    document.title = pageTitle;
    updateOgMeta(pageTitle, null, target === "home" ? "/" : "/" + target);
    window.scrollTo(0, 0);
  };

  const navigateBoard = async (cat) => {
    if (!(await confirmGuard())) return;
    setBoardCat(cat);
    window.history.pushState(null, "", "/community/" + cat);
    setPage("community"); setOpenMenu(null); setMobileOpen(false);
    const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", archive: "자료실" };
    const title = (catNames[cat] || "커뮤니티") + " - SNS메이킷";
    document.title = title;
    updateOgMeta(title, null, "/community/" + cat);
    window.scrollTo(0, 0);
  };
  const navigatePost = (postId, postTitle, postDesc, postThumb) => {
    const cat = boardCat || "info";
    window.history.pushState(null, "", "/community/" + cat + "/post-" + postId);
    if (postTitle) {
      const title = postTitle + " - SNS메이킷 커뮤니티";
      document.title = title;
      updateOgMeta(title, postDesc, "/community/" + cat + "/post-" + postId, postThumb);
    }
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
  const NavBtn = ({ id, label, active, onClick }) => (
    <button onClick={onClick || (() => navigate(id))} style={{
      background: (active || page === id) ? "rgba(124,106,255,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 13,
      fontWeight: (active || page === id) ? 700 : 500,
      color: (active || page === id) ? C.purpleL : C.muted,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const DropBtn = ({ label, open, onClick, active }) => (
    <button onClick={onClick} style={{
      background: (active || open) ? "rgba(124,106,255,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, fontSize: 13,
      fontWeight: (active || open) ? 700 : 500,
      color: (active || open) ? C.purpleL : C.muted,
      display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s", whiteSpace: "nowrap",
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
    if (page === "home")     return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => setShowAuth(true)} />;
    if (page === "about")    return <AboutPage C={C} navigate={navigate} />;
    if (page === "howto" || page === "guide")  return <HowToPage C={C} navigate={navigate} />;
    if (page === "faq")      return <FaqPage C={C} navigate={navigate} />;
    if (page === "archive")  { navigateBoard("archive"); return null; }
    if (page === "analyzer")  return <AnalyzerPage C={C} theme={theme} user={user} navigate={navigate} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (page === "ai")       return <AiPage C={C} theme={theme} user={user} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} onLogout={logout} onLoginRequest={() => setShowAuth(true)} aiMenu={aiMenu} setAiMenu={setAiMenu} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} showPointConfirm={async (cost) => {
      if (!user) return true;
      const pts = user.points ?? 0;
      if (pts < cost) { window.dispatchEvent(new Event("pointsExhausted")); return false; }
      return true;
    }} />;
    if (isBoard)             return <BoardPage key={boardCat} C={C} user={user} onLoginRequest={() => setShowAuth(true)} initialCat={boardCat} pendingPostId={pendingPostId} onPendingPostClear={() => setPendingPostId(null)} onNavigatePost={navigatePost} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (page === "pricing")  return <PricingPage C={C} navigate={navigate} user={user} onLogin={() => setShowAuth(true)} />;
    if (page === "contact")  return <ContactPage C={C} />;
    if (page === "event")    return <EventPage C={C} navigate={navigate} />;
    if (page === "snsnews")  return <SnsNewsPage C={C} user={user} navigate={navigate} />;
    if (page === "cases")    return <CasePage C={C} isDark={theme==="dark"} user={user} />;
    if (page === "payment/success") return <PaymentSuccessPage C={C} navigate={navigate} />;
    if (page === "payment/fail")    return <PaymentFailPage C={C} navigate={navigate} />;
    if (page === "legal")           return <LegalPage C={C} navigate={navigate} initialTab={legalTab} />;
    if (page === "mypage" || page === "profile")   return <MyPage C={C} theme={theme} user={user} setUser={u => { setLocalUser(u); setUserState(u); }} navigate={navigate} />;
    if (page === "xk9m2p4q7") {
      if (!user) return <div style={{ minHeight: "80vh" }} />;
      if (user.role !== "admin") return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => setShowAuth(true)} />;
      return <AdminPage C={C} user={user} />;
    }
    // 404 - 알 수 없는 페이지
    if (page !== "home") return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: C.muted, marginBottom: 16, opacity: 0.3 }}>404</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>페이지를 찾을 수 없습니다</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 28 }}>요청하신 페이지가 존재하지 않거나 이동되었어요.</div>
        <button onClick={() => navigate("home")}
          style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          홈으로 돌아가기
        </button>
      </div>
    );
    return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => setShowAuth(true)} />;
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,system-ui,'Noto Sans KR',sans-serif",
      transition: "background 0.3s,color 0.3s",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;min-height:100vh}
        ::-webkit-scrollbar{width:8px}
        ::-webkit-scrollbar-track{background:#f5f4ff}
        ::-webkit-scrollbar-thumb{background:rgba(124,106,255,0.4);border-radius:4px}
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
        @media(max-width:600px){
          .card-grid{grid-template-columns:1fr!important}
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
        /* ── 모바일 최적화 (종합) ── */

        /* 터치 타겟 최소 크기 보장 */
        @media(max-width:768px){
          button,a,[role="button"],[onclick]{min-height:44px}
          input,textarea,select{min-height:44px;font-size:16px!important} /* iOS zoom 방지 */
        }

        /* 태블릿 (768px 이하) */
        @media(max-width:768px){
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-3{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-2{grid-template-columns:1fr 1fr!important}
          .ai-content-area{padding:16px 12px 60px!important}
          .side-panel{width:100%!important;max-width:100%!important;position:fixed!important;z-index:999!important;left:0!important;right:0!important;bottom:0!important;top:60px!important;border-radius:0!important}
        }

        /* 모바일 중간 (640px 이하) */
        @media(max-width:640px){
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-3{grid-template-columns:1fr!important}
          .ai-grid-2{grid-template-columns:1fr!important}
          .flex-col-mobile{flex-direction:column!important}
          .gap-mobile{gap:10px!important}
          .p-mobile{padding:12px!important}
          .text-sm-mobile{font-size:13px!important}
          h1{font-size:clamp(22px,5vw,36px)!important}
          h2{font-size:clamp(18px,4vw,28px)!important}
          h3{font-size:clamp(16px,3.5vw,22px)!important}
        }

        /* 모바일 작은 화면 (480px 이하) */
        @media(max-width:480px){
          .ai-grid-4{grid-template-columns:1fr 1fr!important}
          .ai-grid-3{grid-template-columns:1fr!important}
          .ai-grid-2{grid-template-columns:1fr!important}
          .preview-area{max-width:100%!important;margin:0!important}
          .preview-area canvas{max-width:100%!important;height:auto!important}
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .hide-xs{display:none!important}
          table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
          th,td{white-space:nowrap;padding:8px 10px!important;font-size:12px!important}
        }

        /* 초소형 화면 (360px 이하) */
        @media(max-width:360px){
          .ai-grid-4{grid-template-columns:1fr!important}
          body{font-size:14px}
          .nav-logo-text{display:none!important}
        }

        /* 모바일 모달/팝업 가로 오버플로우 방지 */
        @media(max-width:640px){
          [style*="width: 500"],[style*="width:500"]{width:95vw!important;max-width:95vw!important}
          [style*="width: 480"],[style*="width:480"]{width:95vw!important;max-width:95vw!important}
          [style*="min(640"],[style*="min(560"],[style*="min(500"],[style*="min(480"]{width:95vw!important}
        }

        /* 모바일 스크롤 성능 */
        @media(max-width:768px){
          *{-webkit-tap-highlight-color:transparent}
          img,video{max-width:100%}
        }

        /* 가로 모드 모바일 */
        @media(max-height:500px) and (orientation:landscape){
          .nav-bar{height:48px!important}
          .page-top-pad{padding-top:56px!important}
        }

        /* 모바일 스크롤 성능 */
        @media(max-width:768px){
          .scroll-container{-webkit-overflow-scrolling:touch;overflow-scrolling:touch}
          img{content-visibility:auto}
        }

        /* 모바일 모달 */
        @media(max-width:640px){
          .modal-content{width:95%!important;max-width:95%!important;margin:8px!important;max-height:90vh!important;overflow-y:auto!important}
        }

        /* 모바일 탭/필터 가로 스크롤 */
        @media(max-width:640px){
          .tab-scroll{overflow-x:auto!important;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none}
          .tab-scroll::-webkit-scrollbar{display:none}
        }

        /* safe-area 대응 (노치 디바이스) */
        @supports(padding-top: env(safe-area-inset-top)){
          .nav-bar{padding-top:env(safe-area-inset-top)}
          .bottom-bar{padding-bottom:env(safe-area-inset-bottom)}
        }
      `}</style>

      {/* 생성 중 이탈 방지 모달 */}
      {guardModal && <GuardModal cost={guardModal.cost} onConfirm={guardModal.onConfirm} onCancel={guardModal.onCancel} />}
      {showAuth && <AuthModal C={C} onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
      {showAttendance && <Suspense fallback={null}><AttendanceModal user={user} isDark={theme==="dark"} onClose={() => setShowAttendance(false)} onUserUpdate={u => { setUserState(u); setLocalUser(u); }} /></Suspense>}
      {showPointsModal && (
        <div onClick={() => setShowPointsModal(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 22, padding: "clamp(20px,5vw,36px) clamp(16px,4vw,28px)", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(124,106,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24, fontWeight: 900, color: "#7c6aff" }}>P</div>
            <div style={{ fontSize: "clamp(16px,4vw,19px)", fontWeight: 900, color: "#1a1730", marginBottom: 10 }}>무료 사용 횟수를 모두 사용했어요</div>
            <div style={{ fontSize: 13, color: "rgba(26,23,48,0.55)", lineHeight: 1.9, marginBottom: 26 }}>
              비회원은 AI 기능을 <b style={{ color: "#7c6aff" }}>{FREE_GUEST}회 무료</b>로 사용할 수 있어요.<br/>
              로그인하면 <b style={{ color: "#7c6aff" }}>10회 추가</b> + 포인트로 무제한 이용 가능해요!
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setShowPointsModal(false); setShowAuth(true); }}
                style={{ padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                로그인 / 회원가입
              </button>
              <button onClick={() => { setShowPointsModal(false); navigate("pricing"); }}
                style={{ padding: "12px", borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", cursor: "pointer", background: "rgba(124,106,255,0.06)", color: "#7c6aff", fontSize: 13, fontWeight: 700 }}>
                포인트 충전하기
              </button>
              <button onClick={() => setShowPointsModal(false)}
                style={{ padding: "9px", borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", color: "rgba(26,23,48,0.35)", fontSize: 12 }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 네비게이션 ── */}
      <nav role="navigation" aria-label="메인 네비게이션" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: 60,
        background: scrolled ? C.nav : (theme === "dark" ? "rgba(10,8,18,0.7)" : "rgba(255,255,255,0.92)"),
        borderBottom: "1px solid " + (scrolled ? C.border : (theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")),
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? (theme === "dark" ? "0 1px 12px rgba(0,0,0,0.3)" : "0 1px 12px rgba(0,0,0,0.06)") : "none",
        transition: "all 0.3s", display: "flex", alignItems: "center", padding: "0 20px", gap: 4,
      }}>

        {/* 로고 */}
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginRight: 16, flexShrink: 0 }}>
          <img src="/logo.png" alt="SNS메이킷" style={{ width: 34, height: 34, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: -0.5, lineHeight: 1 }}>SNS메이킷</div>
          </div>
        </button>

        {/* 데스크톱 메뉴 — 중앙 정렬 */}
        <div ref={dropMenuRef} className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
          <NavBtn id="home" label={t("home")} />
          {/* AI 도구 - 드롭다운 없이 바로 진입 */}
          <NavBtn id="ai" label="AI 도구" />
          <NavBtn id="snsnews" label="SNS뉴스" />
          <div style={{ width: 1, height: 16, background: C.border, margin: "0 6px" }} />
          {/* 커뮤니티 */}
          <div style={{ position: "relative" }}>
            <DropBtn label={t("community")} open={openMenu==="board"} active={isBoard} onClick={() => setOpenMenu(m => m==="board"?null:"board")} />
            {openMenu==="board" && (
              <DropMenu>
                <DropItem id="community" label={t("info")}    onClick={() => { navigateBoard("info");    setOpenMenu(null); }} />
                <DropItem id="community" label={t("qna")}     onClick={() => { navigateBoard("qna");     setOpenMenu(null); }} />
                <DropItem id="community" label={t("free")}    onClick={() => { navigateBoard("free");    setOpenMenu(null); }} />
                <DropItem id="community" label={t("review")}  onClick={() => { navigateBoard("review");  setOpenMenu(null); }} />
                <DropItem id="community" label={t("archive")} onClick={() => { navigateBoard("archive"); setOpenMenu(null); }} />
              </DropMenu>
            )}
          </div>
          <NavBtn id="pricing" label={t("pricing")} />
          {/* 고객센터 */}
          <div style={{ position: "relative" }}>
            <DropBtn label={t("support")} open={openMenu==="support"} active={["about","contact","howto","faq"].includes(page)} onClick={() => setOpenMenu(m => m==="support"?null:"support")} />
            {openMenu==="support" && (
              <DropMenu right>
                <DropItem id="about" label={t("about")} onClick={() => { navigate("about"); setOpenMenu(null); }} />
                <DropItem id="faq" label="자주 묻는 질문" onClick={() => { navigate("faq"); setOpenMenu(null); }} />
                <DropItem id="contact" label={t("contact")} onClick={() => { navigate("contact"); setOpenMenu(null); }} />
                <DropItem id="howto" label={t("howto")} onClick={() => { navigate("howto"); setOpenMenu(null); }} />
              </DropMenu>
            )}
          </div>
        </div>

        {/* 오른쪽: 테마 + 로그인 */}
        <div className="nav-right" style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 2px" }} />
          {/* 다국어 선택 */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button onClick={() => setLangOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 20, border: "1px solid " + C.border, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.muted, flexShrink: 0, minHeight: 36 }}>
              <span style={{ fontSize: 11 }}>{LANGUAGES.find(l=>l.code===lang)?.label||t("translate")}</span>
            </button>
            {langOpen && (
              <>
                <div onClick={() => setLangOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 999,
                  background: C.modalBg, border: "1px solid " + C.border, borderRadius: 12, padding: 6,
                  minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", animation: "fadeIn 0.15s ease" }}>
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                        borderRadius: 8, border: "none", cursor: "pointer",
                        background: lang===l.code ? "rgba(99,102,241,0.12)" : "transparent",
                        fontSize: 13, color: lang===l.code ? "#a5b4fc" : C.text, textAlign: "left",
                        fontWeight: lang===l.code ? 700 : 400 }}
                      onMouseEnter={e => { if(lang!==l.code) e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                      onMouseLeave={e => { if(lang!==l.code) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 16 }}>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang===l.code && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
                <span style={{ fontSize: 11, color: C.purpleL, fontWeight: 700 }}>{(user.points||0).toLocaleString()}P</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" style={{ flexShrink:0, transform: profileOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}><polyline points="18 15 12 9 6 15"/></svg>
              </button>

              {/* 프로필 드롭다운 */}
              {profileOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: "min(280px, 85vw)", zIndex: 200,
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
                        <span style={{ fontWeight: 800, color: C.purpleL }}>{(user.points||0).toLocaleString()}P</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: theme==="dark"?"rgba(255,255,255,0.08)":"#e0e0eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: Math.min(((user.points||0)/500)*100,100)+"%",
                          background: "linear-gradient(90deg,#7c6aff,#8b5cf6)" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>AI 1회=10P · {Math.floor((user.points||0)/10)}회 생성 가능</div>
                    </div>
                  </div>
                  {/* 메뉴 */}
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: "🔴", label: "출석체크", sub: "매일 +3P · 연속 보너스", action: () => { setShowAttendance(true); setProfileOpen(false); } },
                      { icon: "P", label: "포인트 충전", sub: "더 많은 AI 생성", action: () => { navigate("pricing"); setProfileOpen(false); } },
                      { icon: "📁", label: "내 보관함", sub: "생성한 글·카드뉴스", action: () => { navigate("ai"); setAiMenu("library"); setProfileOpen(false); } },
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
              <button onClick={() => setShowAuth(true)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", boxShadow: "0 4px 16px rgba(124,106,255,0.3)", minHeight: 36 }}>로그인</button>
            </div>
          )}
        </div>

        {/* 모바일 전용 컨트롤 */}
        <div className="mobile-controls" style={{ display: "none", alignItems: "center", gap: 6, marginLeft: "auto", marginRight: 4, flexShrink: 0 }}>
          {/* 모바일 언어 선택 */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setLangOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: "50%", border: "1px solid " + C.border,
              background: C.toggleBg, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </button>
            {langOpen && (
              <>
                <div onClick={() => setLangOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 999,
                  background: C.modalBg, border: "1px solid " + C.border, borderRadius: 12, padding: 6,
                  minWidth: 120, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                  {LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                        borderRadius: 8, border: "none", cursor: "pointer",
                        background: lang===l.code ? "rgba(99,102,241,0.12)" : "transparent",
                        fontSize: 13, color: lang===l.code ? "#a5b4fc" : C.text, fontWeight: lang===l.code ? 700 : 400 }}>
                      <span style={{ fontSize: 15 }}>{l.flag}</span>{l.label}
                      {lang===l.code && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* 유저 상태 */}
          {user ? (
            <button onClick={() => setMobileOpen(s => !s)} style={{ width: 36, height: 36, borderRadius: "50%",
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
        <button className="mobile-btn" onClick={() => setMobileOpen(s => !s)} aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={mobileOpen} style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontSize: 24, padding: "8px 12px", lineHeight: 1, flexShrink: 0, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* ── 모바일 메뉴 ── */}
      {mobileOpen && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0, bottom: 0, zIndex: 999,
          background: theme === "dark" ? "rgba(10,8,18,0.98)" : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(20px)", padding: "16px 16px 40px",
          animation: "fadeIn 0.2s ease", overflowY: "auto", borderTop: "1px solid " + C.border,
        }}>
              {/* PC 상단 메뉴와 동일한 큰 메뉴만 */}
          {[
            { id: "home",     label: t("home"),      onClick: () => { navigate("home"); setMobileOpen(false); },     active: page==="home" },
            { id: "ai",       label: "AI 도구",       onClick: () => { navigate("ai"); setMobileOpen(false); },       active: page==="ai"||page==="analyzer" },
            { id: "snsnews",  label: "SNS뉴스",       onClick: () => { navigate("snsnews"); setMobileOpen(false); }, active: page==="snsnews" },
            { id: "community",label: t("community"),  onClick: () => { navigateBoard("info"); setMobileOpen(false); }, active: page==="community" },
            { id: "pricing",  label: t("pricing"),    onClick: () => { navigate("pricing"); setMobileOpen(false); }, active: page==="pricing" },
          ].map(m => (
            <button key={m.id} onClick={m.onClick} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "14px 16px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3,
              background: m.active ? "rgba(124,106,255,0.08)" : "transparent",
              color: m.active ? C.purpleL : C.text,
              fontSize: 16, fontWeight: m.active ? 700 : 500,
              borderLeft: m.active ? "3px solid #7c6aff" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* 고객센터 */}
          <div style={{ margin: "12px 0 6px", paddingTop: 8, borderTop: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, padding: "0 4px", marginBottom: 6 }}>고객센터</div>
          </div>
          {[
            { id: "faq",     label: "자주 묻는 질문",  onClick: () => { navigate("faq"); setMobileOpen(false); },     active: page==="faq" },
            { id: "about",   label: t("about"),       onClick: () => { navigate("about"); setMobileOpen(false); },   active: page==="about" },
            { id: "contact", label: t("contact"),     onClick: () => { navigate("contact"); setMobileOpen(false); }, active: page==="contact" },
            { id: "howto",   label: t("howto"),        onClick: () => { navigate("howto"); setMobileOpen(false); },   active: page==="howto" },
          ].map(m => (
            <button key={m.id} onClick={m.onClick} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "11px 16px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: m.active ? "rgba(124,106,255,0.08)" : "transparent",
              color: m.active ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: m.active ? 700 : 400,
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
                      <div style={{ fontSize: 12, color: C.purpleL, marginTop: 1 }}>{(user.points||0).toLocaleString()}P · {Math.floor((user.points||0)/10)}회 가능</div>
                    </div>
                  </div>
                  <button onClick={logout} style={{ padding: "7px 14px", borderRadius: 9, cursor: "pointer", border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12 }}>{t("logout")}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setShowAttendance(true); setMobileOpen(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("attendance")}</button>
                  <button onClick={() => { navigate("pricing"); setMobileOpen(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("pointCharge")}</button>
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
                        <span style={{ fontSize: 12, color: C.muted }}>{t("guestFree")}</span>
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
                  {t("login")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 페이지 ── */}
      <div style={{ paddingTop: 60 }} className="page-anim" key={page}>
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </div>

      {/* ── 푸터 (AI 페이지에서는 콘텐츠 내부에 포함) ── */}
      {page !== "ai" && <Footer C={C} navigateBoard={navigateBoard} navigateAi={navigateAi} navigate={navigate} />}

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로 스크롤"
          style={{
            position: "fixed", bottom: 32, right: 32, zIndex: 900,
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(124,106,255,0.85)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124,106,255,0.3)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      )}
    </div>
  );
}
