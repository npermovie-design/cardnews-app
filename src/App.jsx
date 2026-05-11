import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { THEMES, THEME_KEY, getSavedTheme } from "./theme";
import { getUser, setUser, setLocalUser, fbLogout, supabase, fetchUser, syncOAuthUser, FREE_GUEST, processReferralSignup, ensureReferralCode, getUsageSummary } from "./storage";
import { useI18n, LANGUAGES } from "./i18n.jsx";

// 핵심 컴포넌트 (즉시 로드)
const HomePage = lazy(() => import("./HomePage"));
import AuthPage from "./AuthPage";
import Footer from "./Footer.jsx";
import ChatWidget from "./ChatWidget.jsx";

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
const EventPage = lazy(() => import("./EventPage.jsx"));
const CasePage = lazy(() => import("./CasePage.jsx"));
const AnalyzerPage = lazy(() => import("./AnalyzerPage.jsx"));
const ProgramsPage = lazy(() => import("./ProgramsPage.jsx"));
const NoticePage = lazy(() => import("./NoticePage.jsx"));
const ClassPage = lazy(() => import("./ClassPage.jsx"));
const ChallengePage = lazy(() => import("./ChallengePage.jsx"));
// const GuidePage = lazy(() => import("./GuidePage.jsx"));

// 로딩 폴백
const PageLoader = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(59,130,246,0.15)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: "rgba(26,23,48,0.4)", fontWeight: 600 }}>Loading...</div>
    </div>
  </div>
);

/* ── 신규 가입자 환영 모달 ── */
function WelcomeModal({ userName, lang = "ko", onClose, onGoAi, onGoPricing }) {
  const ko = lang === "ko";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      padding: 20, animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: "#111827",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 24, padding: "44px 32px 28px",
          maxWidth: 440, width: "100%", textAlign: "center",
          position: "relative", boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
        }}>
        {/* 닫기 */}
        <button onClick={onClose}
          style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18 }}
          aria-label={ko ? "닫기" : "Close"}>×</button>

        {/* 축하 아이콘 */}
        <div style={{
          width: 84, height: 84, borderRadius: "50%",
          background: "#3b82f6",
          margin: "0 auto 18px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 44, fontWeight: 900, color: "#fff",
          boxShadow: "none",
        }}>
          ✨
        </div>

        <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: -0.5 }}>
          {ko ? `${userName || "회원"}님, 환영해요!` : `Welcome${userName ? `, ${userName}` : ""}!`}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 22 }}>
          {ko ? "SNS 콘텐츠 제작의 모든 것, 지금 바로 시작해보세요" : "All your SNS content creation starts now"}
        </div>

        {/* 5회 카드 */}
        <div style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.35)",
          borderRadius: 16, padding: "18px 20px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            {ko ? "가입 축하 보너스" : "Signup bonus"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#3b82f6", marginBottom: 6 }}>
            +5회
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            {ko ? "콘텐츠 생성 5회 분량" : "5 content credits"}
          </div>
        </div>

        {/* 혜택 리스트 */}
        <div style={{ textAlign: "left", marginBottom: 24 }}>
          {[
            { icon: "1", text: ko ? "콘텐츠 생성 1회 차감" : "Content generation uses 1 credit" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: "rgba(59,130,246,0.2)",
                border: "1px solid rgba(59,130,246,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#60a5fa", flexShrink: 0,
              }}>{item.icon}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
        </div>

        {/* CTA 버튼 */}
        <button onClick={onGoAi}
          style={{
            width: "100%", padding: "14px",
            background: "#3b82f6",
            border: "none", borderRadius: 12,
            color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
            marginBottom: 8, boxShadow: "none",
          }}>
          {ko ? "AI 도구 시작하기 →" : "Start using AI tools →"}
        </button>
        <button onClick={onGoPricing}
          style={{
            width: "100%", padding: "11px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, color: "rgba(255,255,255,0.65)",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
          {ko ? "요금제 살펴보기" : "View pricing plans"}
        </button>
      </div>
    </div>
  );
}

/* ── 생성 중 이탈 방지 커스텀 모달 ── */
function GuardModal({ cost, onConfirm, onCancel, lang = "ko" }) {
  const ko = lang === "ko";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }} role="dialog" aria-modal="true" aria-label={ko ? "생성 중 이탈 확인" : "Leave while generating"}>
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
          {ko ? "생성 중입니다!" : "Generating!"}
        </div>
        <div style={{ fontSize: 14, color: "rgba(26,23,48,0.6)", lineHeight: 1.8, marginBottom: 16 }}>
          {ko ? (<>
            페이지를 나가면<br/>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>결과물이 저장되지 않으며</span><br/>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>1회가 차감</span>됩니다.
          </>) : (<>
            Leaving this page will<br/>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>discard your result</span> and<br/>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>use 1 credit</span>.
          </>)}
        </div>
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
          {ko ? "차감된 횟수는 복구되지 않습니다" : "Used credits cannot be restored"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "1px solid rgba(59,130,246,0.2)",
              background: "rgba(59,130,246,0.06)", color: "#3b82f6", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {ko ? "계속 생성하기" : "Keep generating"}
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {ko ? "나가기" : "Leave"}
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

function localDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function App() {
  const [page,       setPage]       = useState("home");
  const [aiVisited,  setAiVisited]  = useState(false);
  const [user,       setUserState]  = useState(getUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const onScroll = () => { setShowScrollTop(window.scrollY > 400); setScrolled(window.scrollY > 10); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [openMenu,   setOpenMenu]   = useState(null); // "snsWrite"|"snsImage"|"imageGen"|"board"
  const [profileOpen, setProfileOpen] = useState(false);
  const [boardCat,   setBoardCat]   = useState("info");
  const [pendingPostId, setPendingPostId] = useState(null);
  const [programId, setProgramId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [classId, setClassId] = useState(null);
  const [classLessonId, setClassLessonId] = useState(null);
  const [aiMenu,     setAiMenu]     = useState("home");
  const [theme,      setTheme]      = useState(getSavedTheme);
  const [guardModal, setGuardModal] = useState(null); // { cost, onConfirm }
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);
  const { t, lang, setLang } = useI18n();
  const [guestUsageCount, setGuestUsageCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}").guest || 0; } catch { return 0; }
  });

  const dropMenuRef   = useRef(null);
  const profileRef    = useRef(null);
  const isLoggingOut  = useRef(false);
  // 현재 테마 팔레트
  const C = THEMES[theme];

  useEffect(() => {
    const brand = lang === "ko" ? "SNS메이킷" : "SNS Makeit";
    const path = page === "home" ? "/" : page === "ai" && aiMenu && aiMenu !== "home" ? `/ai/${aiMenu}` : `/${page}`;
    const titleMap = {
      ko: {
        home: "SNS메이킷 - AI SNS 콘텐츠 자동 생성",
        about: "소개 - SNS메이킷",
        howto: "이용방법 - SNS메이킷",
        faq: "자주 묻는 질문 - SNS메이킷",
        ai: "AI 생성기 - SNS메이킷",
        programs: "자동화 - SNS메이킷",
        class: "클래스 - SNS메이킷",
        challenge: "성장 프로그램 - SNS메이킷",
        pricing: "가격정책 - SNS메이킷",
        contact: "문의하기 - SNS메이킷",
        event: "이벤트 - SNS메이킷",
        cases: "고객사례 - SNS메이킷",
        community: "커뮤니티 - SNS메이킷",
        legal: "약관·정책 - SNS메이킷",
      },
      en: {
        home: "SNS Makeit - AI Social Content Generator",
        about: "About - SNS Makeit",
        howto: "How to Use - SNS Makeit",
        faq: "FAQ - SNS Makeit",
        ai: "AI Generator - SNS Makeit",
        programs: "Resources - SNS Makeit",
        class: "Classes - SNS Makeit",
        challenge: "Bootcamp - SNS Makeit",
        pricing: "Pricing - SNS Makeit",
        contact: "Contact - SNS Makeit",
        event: "Events - SNS Makeit",
        cases: "Customer Cases - SNS Makeit",
        community: "Community - SNS Makeit",
        legal: "Terms & Policy - SNS Makeit",
      },
    };
    const descMap = {
      ko: {
        home: "블로그 글쓰기, 자동 발행, 키워드 분석까지. SNS 콘텐츠 관리를 쉽게 도와주는 올인원 플랫폼.",
        about: "SNS메이킷은 블로그 글쓰기, 자동 발행, 키워드 분석 등 SNS 콘텐츠 관리를 위한 올인원 플랫폼입니다.",
        howto: "SNS메이킷 사용법 가이드. 블로그 글쓰기, 자동 발행, 키워드 분석까지 단계별로 안내합니다.",
        faq: "SNS메이킷의 콘텐츠 생성, 요금제, 저작권, 계정 관련 자주 묻는 질문을 확인하세요.",
        ai: "블로그 글, 인스타그램 캡션, 영상 편집까지 쉽게 생성하세요.",
        class: "SNS 콘텐츠 제작과 자동화 실무를 배우는 메이킷 클래스입니다.",
        challenge: "SNS 성장 목표를 정하고 매일 인증하며 실행하는 메이킷 성장 프로그램입니다.",
        pricing: "SNS메이킷 가격정책. Free부터 Business까지, 필요한 만큼 콘텐츠 생성과 자동 발행을 이용하세요.",
        contact: "SNS메이킷 문의하기. 결제, 기능, 오류, 제휴 문의를 남겨주시면 빠르게 답변드립니다.",
        community: "SNS메이킷 커뮤니티. SNS 운영, AI 콘텐츠 제작, 마케팅 정보와 질문답변, 성장 프로그램을 함께하세요.",
        programs: "SNS 운영에 필요한 자동화 도구, 템플릿, 무료 사진, 무료 영상 자료를 확인하세요.",
        event: "SNS메이킷 이벤트와 혜택을 확인하세요.",
        cases: "SNS메이킷을 활용한 고객사례와 AI 콘텐츠 제작 성공 사례를 확인하세요.",
        legal: "SNS메이킷 이용약관, 개인정보처리방침, 환불정책을 확인하세요.",
      },
      en: {
        home: "Enter a keyword and AI creates drafts for blogs, Instagram, and shorts. 5 guest uses and 5 credits on signup.",
        about: "SNS Makeit is an all-in-one AI platform for blogs, Instagram, shorts, and image content creation.",
        howto: "Learn how to use SNS Makeit for AI writing, image generation, card news, detail pages, and shorts editing.",
        faq: "Find answers about SNS Makeit AI content generation, credits, pricing, copyright, and accounts.",
        ai: "Generate blog posts, Instagram captions, card news, product images, logos, and shorts videos with AI.",
        class: "Practical SNS Makeit classes for content creation, automation, and marketing workflows.",
        challenge: "SNS Makeit bootcamps help you set goals, submit proofs, and build a consistent content routine.",
        pricing: "SNS Makeit pricing. 5 credits on signup, simple monthly usage counts, and plan upgrades.",
        contact: "Contact SNS Makeit for billing, features, bugs, or partnership inquiries.",
        community: "SNS Makeit Community for AI content creation, marketing tips, and Q&A.",
        programs: "Download automation tools, templates, free photos, and video resources for SNS operations.",
      },
      ja: {
        home: "キーワードを入力すると、AIがブログ、Instagram、ショート動画の下書きを作成します。",
        about: "SNS Makeitは、SNSコンテンツ制作を支援するAIプラットフォームです。",
        howto: "SNS MakeitのAIライティング、画像生成、ショート動画編集の使い方を確認できます。",
        faq: "SNS Makeitの生成回数、料金、著作権、アカウントに関する質問を確認できます。",
        ai: "ブログ、カードニュース、商品画像、ショート動画をAIで作成できます。",
        class: "SNSコンテンツ制作と自動化を実践的に学べるSNS Makeitクラスです。",
        challenge: "目標設定、認証、毎日の実行を支援するSNS Makeitブートキャンプです。",
        pricing: "SNS Makeitの料金プラン。無料利用からBusinessまで確認できます。",
        contact: "決済、機能、不具合、提携に関するお問い合わせはこちらです。",
        community: "SNS運用、AIコンテンツ制作、マーケティング情報を共有するコミュニティです。",
        programs: "SNS運用に役立つ自動化ツール、テンプレート、素材を確認できます。",
      },
    };
    const title = (titleMap[lang] || titleMap.ko)[page] || `${brand}`;
    const desc = (descMap[lang] || descMap.ko)[page] || (descMap[lang] || descMap.ko).home;
    const privatePages = ["login", "mypage", "profile", "xk9m2p4q7", "payment/success", "payment/fail"];
    document.title = title;
    updateOgMeta(title, desc, path);
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", privatePages.includes(page) ? "noindex, nofollow" : "index, follow");
  }, [page, aiMenu, lang]);

  // 방문자 추적 (페이지 로드 시 1회, 프로덕션만)
  useEffect(() => {
    if (window.location.hostname === "localhost") return;
    try {
      const key = "nper_visit_" + new Date().toISOString().slice(0, 13);
      if (!sessionStorage.getItem(key)) {
        fetch("/api/sns?action=track-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: window.location.pathname, referrer: document.referrer }),
        }).catch(() => {});
        sessionStorage.setItem(key, "1");
      }
    } catch {}
  }, []);

  // 이용 횟수 소진 이벤트 수신
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

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    (async () => {
      try {
        const withCode = await ensureReferralCode(user);
        if (alive && withCode?.referral_code && withCode.referral_code !== user.referral_code) {
          setLocalUser(withCode);
          setUserState(withCode);
        }
        const code = localStorage.getItem("nper_pending_referral") || "";
        if (code.trim()) {
          const rr = await processReferralSignup(withCode || user, code.trim());
          if (alive && rr?.user) {
            setLocalUser(rr.user);
            setUserState(rr.user);
          }
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [user?.uid]);


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
        // TOKEN_REFRESHED: 세션만 갱신, 이용 횟수 state 덮어쓰기 금지
      }
    );
    return () => subscription.unsubscribe();
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
    const postId = rawPath.includes("/post-") ? rawPath.split("/post-")[1].split("/")[0] : null;
    if (postId) setPendingPostId(postId);

    // 404 리다이렉트: 기존 경로 → 신규 경로
    const REDIRECTS = { board: "community/info", terms: "legal", news: "snsnews" };
    if (REDIRECTS[mainSeg]) {
      window.history.replaceState(null, "", "/" + REDIRECTS[mainSeg]);
      const rSegs = REDIRECTS[mainSeg].split("/");
      if (rSegs[0] === "community" && rSegs[1]) setBoardCat(rSegs[1]);
      setPage(rSegs[0]);
      return;
    }
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
    // /programs/[id] → page=programs, programId=id
    if (mainSeg === "programs" && segments[1]) {
      setProgramId(segments[1]);
    }
    // /growth/[id] or /challenge/[id] → page=challenge, challengeId=id
    if ((mainSeg === "growth" || mainSeg === "challenge") && segments[1]) {
      setChallengeId(segments[1]);
    }
    // /class/[courseId]/[lessonId] → page=class
    if (mainSeg === "class" && segments[1]) {
      setClassId(segments[1]);
      if (segments[2]) setClassLessonId(segments[2]);
    }
    // /growth → challenge 페이지로 매핑
    const effectiveSeg = mainSeg === "growth" ? "challenge" : mainSeg;
    if (effectiveSeg && effectiveSeg !== "home") setPage(effectiveSeg);
    if (effectiveSeg === "ai") setAiVisited(true);
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
      // 게시글 뷰 복원은 BoardPage popstate에서 처리
      // App.jsx는 페이지 전환만 담당
      if (!segments.some(s => s.startsWith("post-"))) {
        setPendingPostId(null);
      }

      setPage(mainSeg); setOpenMenu(null); setMobileOpen(false);
      if (mainSeg === "ai") setAiVisited(true);
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
    if (target === "login_trigger") { navigate("login"); return; }
    if (!(await confirmGuard())) return;
    const urlTarget = target === "home" ? "/" : target === "challenge" ? "/growth" : "/" + target;
    window.history.pushState(null, "", urlTarget);
    setPage(target); setOpenMenu(null); setMobileOpen(false);
    if (target === "ai") setAiVisited(true);
    if (target === "legal" && extra) setLegalTab(extra);
    // SEO: 다국어 동적 타이틀
    const brand = lang === "ko" ? "SNS메이킷" : "SNS Makeit";
    const titleMap = {
      ko: { home:"SNS메이킷 - AI SNS 콘텐츠 자동 생성", about:"소개", howto:"이용방법", ai:"AI 생성기", programs:"자동화", class:"클래스", challenge:"성장 프로그램", notice:"공지사항", pricing:"가격정책", contact:"문의하기", event:"이벤트", community:"커뮤니티", legal:"약관·정책" },
      en: { home:"SNS Makeit - AI Social Content Generator", about:"About", howto:"How to Use", ai:"AI Generator", programs:"Program Store", class:"Classes", challenge:"Bootcamp", notice:"Notices", pricing:"Pricing", contact:"Contact", event:"Events", community:"Community", legal:"Terms & Policy" },
      ja: { home:"SNS Makeit - AI カードニュース·ブログ·画像生成", about:"紹介", howto:"使い方", ai:"AI生成器", programs:"プログラムストア", class:"クラス", challenge:"ブートキャンプ", notice:"お知らせ", pricing:"料金", contact:"お問い合わせ", event:"イベント", community:"コミュニティ", legal:"利用規約" },
    };
    // 페이지별 meta description (SEO 최적화)
    const descMap = {
      ko: {
        home: "블로그 글쓰기, 자동 발행, 키워드 분석까지. SNS 콘텐츠 관리를 쉽게 도와주는 올인원 플랫폼.",
        pricing: "SNS메이킷 가격정책. Free부터 Business까지, 필요한 만큼 콘텐츠 생성과 자동 발행을 이용하세요.",
        about: "SNS메이킷은 SNS 콘텐츠 관리를 위한 올인원 플랫폼입니다.",
        howto: "SNS메이킷 사용법 가이드. 블로그 글쓰기, 자동 발행까지 단계별로 안내합니다.",
        ai: "블로그 글, 이미지, 영상을 쉽게 생성하세요.",
        class: "SNS 콘텐츠 제작과 자동화 실무를 배우는 메이킷 클래스입니다.",
        challenge: "SNS 성장 목표를 정하고 매일 인증하며 실행하는 메이킷 성장 프로그램입니다.",
        contact: "SNS메이킷 문의하기. 결제, 기능, 오류 등 1:1 문의를 받고 있어요.",
        community: "SNS메이킷 커뮤니티. 마케터와 크리에이터를 위한 정보와 Q&A.",
        programs: "SNS 자동화봇으로 네이버 블로그 글 생성, 드라이브 자료 기반 발행, 자동 운영 흐름을 확인하세요.",
      },
      en: {
        home: "Enter a keyword and AI creates drafts for blogs, Instagram, and shorts. 5 guest uses and 5 credits on signup.",
        pricing: "SNS Makeit pricing. 5 credits on signup, simple monthly usage counts, and plan upgrades.",
        about: "SNS Makeit is an all-in-one platform automating SNS content creation with AI.",
        howto: "SNS Makeit user guide. Step-by-step for AI writing, image generation, and shorts editing.",
        ai: "Generate blogs, card news, detail pages, images, and shorts videos with AI. 5 free uses for guests.",
        class: "Practical SNS Makeit classes for content creation, automation, and marketing workflows.",
        challenge: "SNS Makeit bootcamps help you set goals, submit proofs, and build a consistent content routine.",
        contact: "Contact SNS Makeit. 1:1 support for billing, features, and troubleshooting.",
        community: "SNS Makeit Community. Info, Q&A, and resources for marketers and creators.",
      },
      ja: {
        home: "キーワードを入力すると、AIがブログ、Instagram、ショート動画の下書きを作成します。",
        pricing: "SNS Makeitの料金プラン。無料利用からBusinessまで確認できます。",
        about: "SNS Makeitは、SNSコンテンツ制作を支援するAIプラットフォームです。",
        howto: "SNS Makeitの使い方をステップごとに確認できます。",
        ai: "ブログ、画像、動画をAIで簡単に作成できます。",
        class: "SNSコンテンツ制作と自動化を実践的に学べるSNS Makeitクラスです。",
        challenge: "目標設定、認証、毎日の実行を支援するSNS Makeitブートキャンプです。",
        contact: "決済、機能、不具合に関するお問い合わせはこちらです。",
        community: "SNS運用、AIコンテンツ制作、Q&Aのためのコミュニティです。",
      },
    };
    const titles = titleMap[lang] || titleMap.ko;
    const descs = descMap[lang] || descMap.ko;
    const pageTitle = target === "home" ? titles.home : (titles[target] || target) + " - " + brand;
    const pageDesc = descs[target] || descs.home;
    document.title = pageTitle;
    updateOgMeta(pageTitle, pageDesc, target === "home" ? "/" : "/" + target);
    window.scrollTo(0, 0);
  };

  const navigateBoard = async (cat) => {
    if (!(await confirmGuard())) return;
    setBoardCat(cat);
    window.history.pushState(null, "", "/community/" + cat);
    setPage("community"); setOpenMenu(null); setMobileOpen(false);
    const catNames = { info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", challenge: "성장 프로그램" };
    const title = (catNames[cat] || "커뮤니티") + " - SNS메이킷";
    document.title = title;
    updateOgMeta(title, null, "/community/" + cat);
    window.scrollTo(0, 0);
  };
  const navigatePost = (postId, postTitle, postDesc, postThumb) => {
    const cat = boardCat || "info";
    const slug = String(postTitle || "post")
      .toLowerCase()
      .replace(/<[^>]+>/g, " ")
      .replace(/[^0-9a-z가-힣]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80)
      .replace(/-$/g, "") || "post";
    const path = "/community/" + cat + "/post-" + postId + "/" + slug;
    window.history.pushState(null, "", path);
    if (postTitle) {
      const title = postTitle + " - SNS메이킷 커뮤니티";
      document.title = title;
      updateOgMeta(title, postDesc, path, postThumb);
    }
  };

  const navigateAi = async (menu) => {
    if (!(await confirmGuard())) return;
    setAiMenu(menu);
    window.history.pushState(null, "", "/ai/" + menu);
    setPage("ai"); setAiVisited(true); setOpenMenu(null); setMobileOpen(false);
    window.scrollTo(0, 0);
  };

  const handleAuth = u => {
    setLocalUser(u); setUserState(u);
    // 신규 가입자 환영 모달
    try {
      if (localStorage.getItem("nper_just_registered") === "1") {
        localStorage.removeItem("nper_just_registered");
        setShowWelcome(true);
      }
    } catch {}
  };
  // AiPage에 전달하는 콜백 안정화 (인라인 함수 → useCallback)
  const stableOnLoginRequest = useCallback(() => navigate("login"), [navigate]);
  const stableOnUserUpdate = useCallback(u => { setLocalUser(u); setUserState(u); }, []);
  const refreshCurrentUser = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;
    try {
      const fresh = await fetchUser(uid, { force: true });
      if (fresh) {
        setLocalUser(fresh);
        setUserState(fresh);
      }
    } catch {}
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const onFocus = () => refreshCurrentUser();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCurrentUser();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.uid, refreshCurrentUser]);

  const usageSummary = getUsageSummary(user);
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
      background: (active || page === id) ? "rgba(59,130,246,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "7px 12px", borderRadius: 8, fontSize: 13,
      fontWeight: (active || page === id) ? 700 : 500,
      color: (active || page === id) ? C.purpleL : C.muted,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const DropBtn = ({ id, label, open, onClick, active }) => (
    <button onClick={onClick} style={{
      background: (active || open) ? "rgba(59,130,246,0.08)" : "transparent",
      border: "none", cursor: "pointer", padding: "7px 12px", borderRadius: 8, fontSize: 13,
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

  const DropItem = ({ id, label, onClick }) => (
    <button onClick={onClick || (() => navigate(id))} style={{
      display: "flex", alignItems: "center", width: "100%",
      padding: "10px 14px", borderRadius: 9, border: "none", cursor: "pointer",
      background: page === id ? "rgba(59,130,246,0.08)" : "transparent",
      color: page === id ? C.purpleL : C.muted,
      fontSize: 13, fontWeight: 600, textAlign: "left", transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.06)"}
      onMouseLeave={e => e.currentTarget.style.background = page === id ? "rgba(59,130,246,0.08)" : "transparent"}>
      {label}
    </button>
  );

  /* ── 페이지 렌더 ── */
  const renderPage = () => {
    if (page === "home")     return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => navigate("login")} setAiMenu={setAiMenu} />;
    if (page === "login")    { if (user) { navigate("home"); return null; } return <AuthPage C={C} onAuth={handleAuth} navigate={navigate} />; }
    if (page === "about")    return <AboutPage C={C} navigate={navigate} />;
    if (page === "howto")  return <HowToPage C={C} navigate={navigate} />;
    // guide 페이지 비활성화
    if (page === "faq")      return <FaqPage C={C} navigate={navigate} />;

    if (page === "analyzer")  return <AnalyzerPage C={C} theme={theme} user={user} navigate={navigate} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (page === "ai")       return null; /* AiPage는 keep-alive로 별도 렌더 */
    if (isBoard)             return <BoardPage key={boardCat} C={C} user={user} onLoginRequest={() => navigate("login")} initialCat={boardCat} pendingPostId={pendingPostId} onPendingPostClear={() => setPendingPostId(null)} onNavigatePost={navigatePost} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} />;
    if (page === "pricing")  return <PricingPage C={C} navigate={navigate} user={user} onLogin={() => navigate("login")} />;
    if (page === "contact")  return <ContactPage C={C} />;
    if (page === "event")    return <EventPage C={C} navigate={navigate} />;
    if (page === "programs") return <ProgramsPage C={C} navigate={navigate} user={user} onLogin={() => navigate("login")} initialProductId={programId} onProductIdChange={setProgramId} />;
    if (page === "notice") return <NoticePage C={C} navigate={navigate} user={user} />;
    if (page === "class") {
      return <ClassPage C={C} navigate={navigate} user={user} theme={theme} initialCourseId={classId} initialLessonId={classLessonId} />;
    }
    if (page === "challenge") return <ChallengePage C={C} navigate={navigate} user={user} theme={theme} onLoginRequest={() => navigate("login")} onUserUpdate={u => { setLocalUser(u); setUserState(u); }} initialChallengeId={challengeId} />;
    if (page === "snsnews")  { navigate("community"); return null; }
    if (page === "cases")    return <CasePage C={C} isDark={theme==="dark"} user={user} />;
    if (page === "intro-video") { navigate("home"); return null; }
    if (page === "payment/success") return <PaymentSuccessPage C={C} navigate={navigate} />;
    if (page === "payment/fail")    return <PaymentFailPage C={C} navigate={navigate} />;
    if (page === "legal")           return <LegalPage C={C} navigate={navigate} initialTab={legalTab} />;
    if (page === "mypage" || page === "profile")   return <MyPage C={C} theme={theme} user={user} setUser={u => { setLocalUser(u); setUserState(u); }} navigate={navigate} />;
    if (page === "xk9m2p4q7") {
      if (!user) return <div style={{ minHeight: "80vh" }} />;
      if (user.role !== "admin") return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => navigate("login")} setAiMenu={setAiMenu} />;
      return <AdminPage C={C} user={user} />;
    }
    // 404 - 알 수 없는 페이지
    if (page !== "home") return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: C.muted, marginBottom: 16, opacity: 0.3 }}>404</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 8 }}>{lang === "ko" ? "페이지를 찾을 수 없습니다" : "Page not found"}</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 28 }}>{lang === "ko" ? "요청하신 페이지가 존재하지 않거나 이동되었어요." : "The page you requested doesn't exist or has moved."}</div>
        <button onClick={() => navigate("home")}
          style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: "#3b82f6", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {lang === "ko" ? "홈으로 돌아가기" : "Back to Home"}
        </button>
      </div>
    );
    return <HomePage C={C} navigate={navigate} theme={theme} user={user} onLoginRequest={() => navigate("login")} setAiMenu={setAiMenu} />;
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
        ::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.4);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(59,130,246,0.4)}
        input::placeholder,textarea::placeholder{color:rgba(26,23,48,0.3)}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;
          outline:none;background:rgba(0,0,0,0.1);width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;
          height:14px;border-radius:50%;background:#3b82f6;cursor:pointer}
        input:focus,textarea:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes onlinePulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,0.4)}50%{opacity:0.6;box-shadow:0 0 0 4px rgba(34,197,94,0)}}
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
      {guardModal && <GuardModal cost={guardModal.cost} onConfirm={guardModal.onConfirm} onCancel={guardModal.onCancel} lang={lang} />}
      {/* 로그인은 별도 페이지로 이동 */}
      {showWelcome && (
        <WelcomeModal
          userName={user?.nick}
          lang={lang}
          onClose={() => setShowWelcome(false)}
          onGoAi={() => { setShowWelcome(false); navigate("ai"); }}
          onGoPricing={() => { setShowWelcome(false); navigate("pricing"); }}
        />
      )}
      {showPointsModal && (
        <div onClick={() => setShowPointsModal(false)} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 22, padding: "clamp(20px,5vw,36px) clamp(16px,4vw,28px)", maxWidth: 380, width: "90%", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24, fontWeight: 900, color: "#3b82f6" }}>5</div>
            <div style={{ fontSize: "clamp(16px,4vw,19px)", fontWeight: 900, color: "#1a1730", marginBottom: 10 }}>무료 사용 횟수를 모두 사용했어요</div>
            <div style={{ fontSize: 13, color: "rgba(26,23,48,0.55)", lineHeight: 1.9, marginBottom: 26 }}>
              비회원은 AI 기능을 <b style={{ color: "#3b82f6" }}>{FREE_GUEST}회 무료</b>로 사용할 수 있어요.<br/>
              로그인하면 <b style={{ color: "#3b82f6" }}>5회</b>가 즉시 지급됩니다!
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setShowPointsModal(false); navigate("login"); }}
                style={{ padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                로그인 / 회원가입
              </button>
              <button onClick={() => { setShowPointsModal(false); navigate("pricing"); }}
                style={{ padding: "12px", borderRadius: 12, border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer", background: "rgba(59,130,246,0.06)", color: "#3b82f6", fontSize: 13, fontWeight: 700 }}>
                플랜 둘러보기
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
        boxSizing: "border-box", maxWidth: "100vw", overflow: "visible",
        background: scrolled ? C.nav : "transparent",
        borderBottom: scrolled ? "1px solid " + C.border : "none",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.04)" : "none",
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
          <NavBtn id="programs" label="제품" />
          <NavBtn id="class" label="클래스" />
          <div style={{ width: 1, height: 16, background: C.border, margin: "0 6px" }} />
          {/* 성장 프로그램 */}
          <NavBtn id="challenge" label="성장 프로그램" />
          {/* 커뮤니티 */}
          <div style={{ position: "relative" }}>
            <DropBtn id="community" label={t("community")} open={openMenu==="board"} active={isBoard} onClick={() => setOpenMenu(m => m==="board"?null:"board")} />
            {openMenu==="board" && (
              <DropMenu>
                <DropItem id="community" label={t("info")}    onClick={() => { navigateBoard("info");    setOpenMenu(null); }} />
                <DropItem id="community" label={t("qna")}     onClick={() => { navigateBoard("qna");     setOpenMenu(null); }} />
              </DropMenu>
            )}
          </div>
          {/* 고객센터 */}
          <div style={{ position: "relative" }}>
            <DropBtn id="support" label="고객센터" open={openMenu==="support"} active={page==="notice"||page==="pricing"||page==="contact"} onClick={() => setOpenMenu(m => m==="support"?null:"support")} />
            {openMenu==="support" && (
              <DropMenu>
                <DropItem id="notice" label="공지사항" onClick={() => { navigate("notice"); setOpenMenu(null); }} />
                <DropItem id="pricing" label={t("pricing")} onClick={() => { navigate("pricing"); setOpenMenu(null); }} />
                <DropItem id="contact" label={t("contact")} onClick={() => { navigate("contact"); setOpenMenu(null); }} />
              </DropMenu>
            )}
          </div>
        </div>

        {/* 오른쪽: 테마 + 로그인 */}
        <div className="nav-right" style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
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
                        background: lang===l.code ? "rgba(59,130,246,0.12)" : "transparent",
                        fontSize: 13, color: lang===l.code ? "#60a5fa" : C.text, textAlign: "left",
                        fontWeight: lang===l.code ? 700 : 400 }}
                      onMouseEnter={e => { if(lang!==l.code) e.currentTarget.style.background = "rgba(59,130,246,0.06)"; }}
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3b82f6",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {(user.nick||"U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nick}</span>
                <span style={{ fontSize: 11, color: C.purpleL, fontWeight: 700 }}>{usageSummary.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" style={{ flexShrink:0, transform: profileOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}><polyline points="18 15 12 9 6 15"/></svg>
              </button>

              {/* 프로필 드롭다운 */}
              {profileOpen && (
                <div style={{ position: "fixed", top: 70, right: 20, width: "min(280px, 85vw)", zIndex: 9999,
                  background: theme==="dark" ? "#1a1730" : "#fff",
                  border: "1px solid " + C.border, borderRadius: 16,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                  {/* 헤더 */}
                  <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid " + C.border,
                    background: theme==="dark" ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#3b82f6",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                        {(user.nick||"U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{user.nick}</span>
                          {user.role==="admin" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>관리자</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
                      </div>
                    </div>
                    {/* 잔여 횟수 바 */}
                    <div style={{ background: theme==="dark"?"rgba(255,255,255,0.05)":"#f5f5f8", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: C.muted }}>잔여 횟수</span>
                        <span style={{ fontWeight: 800, color: C.purpleL }}>{usageSummary.label}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: theme==="dark"?"rgba(255,255,255,0.08)":"#e0e0eb", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: Math.min((usageSummary.left / Math.max(usageSummary.limit || 1, 1)) * 100, 100)+"%",
                          background: "#3b82f6" }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                        {usageSummary.isSubscriber ? `${usageSummary.planName} ${usageSummary.used.toLocaleString()}/${usageSummary.limit.toLocaleString()}회 사용` : `AI 생성 ${usageSummary.label} 가능`}
                      </div>
                    </div>
                  </div>
                  {/* 메뉴 */}
                  <div style={{ padding: "8px" }}>
                    {[
                      { icon: "+", label: "플랜 업그레이드", sub: "더 많은 AI 생성", action: () => { navigate("pricing"); setProfileOpen(false); } },
                      { icon: "F", label: "내 보관함", sub: "생성한 글 보관", action: () => { navigate("ai"); setAiMenu("library"); setProfileOpen(false); } },
                      { icon: "U", label: "회원정보", sub: "프로필·이용 내역 확인", action: () => { navigate("mypage"); setProfileOpen(false); } },
                      ...(user.role==="admin" ? [{ icon: "A", label: "관리자 페이지", sub: "회원·플랜 관리", action: () => { navigate("xk9m2p4q7"); setProfileOpen(false); } }] : []),
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:28, textAlign:"center" }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => navigate("login")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "#3b82f6", color: "#fff", minHeight: 36 }}>로그인</button>
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
                        background: lang===l.code ? "rgba(59,130,246,0.12)" : "transparent",
                        fontSize: 13, color: lang===l.code ? "#60a5fa" : C.text, fontWeight: lang===l.code ? 700 : 400 }}>
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
              background: "#3b82f6", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900,
              color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
              {(user.nick||"U")[0].toUpperCase()}
            </button>
          ) : (
            <button onClick={() => navigate("login")} style={{ padding: "6px 12px", borderRadius: 8, border: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 12,
              background: "#3b82f6", color: "#fff", flexShrink: 0, whiteSpace: "nowrap" }}>
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
            { id: "programs", label: "제품", onClick: () => { navigate("programs"); setMobileOpen(false); }, active: page==="programs" },
            { id: "class", label: "클래스", onClick: () => { navigate("class"); setMobileOpen(false); }, active: page==="class" },
            { id: "challenge", label: "성장 프로그램", onClick: () => { navigate("challenge"); setMobileOpen(false); }, active: page==="challenge" },
            { id: "community",label: t("community"),  onClick: () => { navigateBoard("info"); setMobileOpen(false); }, active: page==="community" },
          ].map(m => (
            <button key={m.id} onClick={m.onClick} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "14px 16px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3,
              background: m.active ? "rgba(59,130,246,0.08)" : "transparent",
              color: m.active ? C.purpleL : C.text,
              fontSize: 16, fontWeight: m.active ? 700 : 500,
              borderLeft: m.active ? "3px solid #3b82f6" : "3px solid transparent",
            }}>{m.label}</button>
          ))}

          {/* 고객센터 */}
          <div style={{ margin: "12px 0 6px", paddingTop: 8, borderTop: "1px solid " + C.border }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, padding: "0 16px 6px", opacity: 0.6 }}>고객센터</div>
          </div>
          {[
            { id: "notice",  label: "공지사항",     onClick: () => { navigate("notice"); setMobileOpen(false); },  active: page==="notice" },
            { id: "pricing", label: t("pricing"),   onClick: () => { navigate("pricing"); setMobileOpen(false); }, active: page==="pricing" },
            { id: "contact", label: t("contact"),   onClick: () => { navigate("contact"); setMobileOpen(false); }, active: page==="contact" },
          ].map(m => (
            <button key={m.id} onClick={m.onClick} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "11px 16px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
              background: m.active ? "rgba(59,130,246,0.08)" : "transparent",
              color: m.active ? C.purpleL : C.muted,
              fontSize: 14, fontWeight: m.active ? 700 : 400,
            }}>{m.label}</button>
          ))}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid " + C.border }}>
            {user ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#3b82f6",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>
                      {(user.nick||"U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{user.nick}</div>
                      <div style={{ fontSize: 12, color: C.purpleL, marginTop: 1 }}>잔여 {usageSummary.label}</div>
                    </div>
                  </div>
                  <button onClick={logout} style={{ padding: "7px 14px", borderRadius: 9, cursor: "pointer", border: "1px solid " + C.border, background: "transparent", color: C.muted, fontSize: 12 }}>{t("logout")}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { navigate("pricing"); setMobileOpen(false); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>플랜 보기</button>
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const left = Math.max(0, FREE_GUEST - guestUsageCount);
                  return (
                    <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10,
                      background: left > 0 ? "rgba(59,130,246,0.08)" : "rgba(239,68,68,0.08)",
                      border: `1px solid ${left > 0 ? "rgba(59,130,246,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: C.muted }}>{t("guestFree")}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: left > 0 ? "#60a5fa" : "#f87171" }}>
                          {left > 0 ? `${left}회 남음` : "소진 ⚡"}
                        </span>
                      </div>
                      {left > 0 && (
                        <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: "rgba(59,130,246,0.15)", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, width: (left/FREE_GUEST*100)+"%", background: "#3b82f6" }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => { navigate("login"); setMobileOpen(false); }} style={{ width: "100%", padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: "#3b82f6", color: "#fff" }}>
                  {t("login")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 페이지 ── */}
      {/* AI 페이지 — keep-alive: 한번 방문하면 항상 마운트, display로 숨김 */}
      {aiVisited && (
        <div style={{ paddingTop: 60, display: page === "ai" ? "block" : "none" }}>
          <Suspense fallback={<PageLoader />}>
            <AiPage C={C} theme={theme} user={user} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} onLogout={logout} onLoginRequest={stableOnLoginRequest} aiMenu={aiMenu} setAiMenu={setAiMenu} onUserUpdate={stableOnUserUpdate} />
          </Suspense>
        </div>
      )}
      {/* 일반 페이지 — AI가 아닐 때만 표시 */}
      {page !== "ai" && (
        <div style={{ paddingTop: 60 }} className="page-anim" key={page}>
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </div>
      )}

      {/* ── 푸터 (AI 페이지에서는 콘텐츠 내부에 포함) ── */}
      {page !== "ai" && <Footer C={C} navigateBoard={navigateBoard} navigateAi={navigateAi} navigate={navigate} />}

      {/* 실시간 채팅 위젯 */}
      <ChatWidget user={user} C={C} />

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로 스크롤"
          style={{
            position: "fixed", bottom: 32, right: 32, zIndex: 900,
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(59,130,246,0.85)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "none",
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
