import { useState, useEffect, lazy, Suspense } from "react";
import { fbLogin, fbRegister, fbGoogleLogin, isValidEmail, supabase, processReferralSignup } from "./storage";
import { useI18n } from "./i18n.jsx";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SB_IMG = "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/uploads";
const SLIDES = [
  { img: `${SB_IMG}/login-slide-5.png`, title: "네이버 블로그/카페 자동화", desc: "AI가 SEO 최적화 글을 자동 생성하고 발행합니다" },
  { img: `${SB_IMG}/login-slide-1.png`, title: "AI 블로그 글쓰기", desc: "키워드만 입력하면 6000자+ 글이 자동 생성" },
  { img: `${SB_IMG}/login-slide-2.png`, title: "상세페이지 & 카드뉴스", desc: "디자인 없이 AI가 자동으로 제작" },
  { img: `${SB_IMG}/login-slide-3.png`, title: "이미지 & 영상 생성", desc: "AI 이미지, 쇼츠 영상까지 원클릭" },
  { img: `${SB_IMG}/login-slide-4.png`, title: "SNS 분석 & 키워드 추천", desc: "트렌드 분석으로 콘텐츠 전략 수립" },
];

function LoginRightPanel({ accent }) {
  const [idx, setIdx] = useState(0);
  const slideImgs = [
    `${SB_IMG}/login-slide-5.png`,
    `${SB_IMG}/login-slide-1.png`,
    `${SB_IMG}/login-slide-2.png`,
    `${SB_IMG}/login-slide-3.png`,
    `${SB_IMG}/login-slide-6.png`,
  ];
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % slideImgs.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ flex: "1.3", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* 배경 이미지 (뿌옇게) - 페이드 전환 */}
      {slideImgs.map((img, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(30px) brightness(0.55) saturate(1.3)", transform: "scale(1.2)", opacity: i === idx ? 1 : 0, transition: "opacity 1.5s ease" }} />
      ))}

      {/* 그라디언트 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, rgba(59,130,246,0.5), rgba(26,26,46,0.4), rgba(59,130,246,0.3))" }} />

      {/* 배경 장식 */}
      <div style={{ position: "absolute", top: -150, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(59,130,246,0.12)", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -80, width: 350, height: 350, borderRadius: "50%", background: "rgba(0,0,0,0.06)", filter: "blur(60px)" }} />
      <div style={{ position: "absolute", top: 40, left: 40, width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
      <div style={{ position: "absolute", top: 120, right: 60, width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
      <div style={{ position: "absolute", bottom: 200, left: 80, width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
      <div style={{ position: "absolute", top: 200, left: 30, width: 50, height: 50, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", bottom: 120, right: 40, width: 70, height: 70, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", transform: "rotate(20deg)" }} />

      {/* 메인 콘텐츠 */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560, padding: "20px 32px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* 슬라이드 이미지 — 크게 */}
        {/* 글래스 카드 + 이미지 */}
        <div style={{ width: "140%", maxWidth: 800, padding: 14, borderRadius: 24, background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)", marginBottom: 20 }}>
          <div style={{ borderRadius: 16, overflow: "hidden", position: "relative", aspectRatio: "16/10" }}>
            {slideImgs.map((img, i) => (
              <img key={i} src={img} alt="SNS메이킷" style={{ position: i === 0 ? "relative" : "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: i === idx ? 1 : 0, transition: "opacity 1.2s ease" }} />
            ))}
          </div>
          {/* 인디케이터 (글래스 카드 안) */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", paddingTop: 12 }}>
            {slideImgs.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: i === idx ? 28 : 8, height: 8, borderRadius: 4, border: "none", background: i === idx ? "#fff" : "rgba(255,255,255,0.25)", cursor: "pointer", transition: "all 0.4s" }} />
            ))}
          </div>
        </div>

        {/* 배지 */}
        <div style={{ padding: "6px 16px", borderRadius: 20, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 600, color: "#a5f3fc", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
          체험권은 관리자 부여 방식
        </div>

        {/* 타이틀 */}
        <h2 style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ display: "block", fontSize: "clamp(26px,3vw,36px)", fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>콘텐츠 제작,</span>
          <span style={{ display: "block", fontSize: "clamp(32px,4vw,46px)", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>AI에게 맡기세요</span>
        </h2>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.7, marginBottom: 18 }}>
          주제만 입력하면 AI가 블로그, 이미지, 쇼츠 영상까지 완성합니다
        </p>

        {/* 기능 태그 */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 18, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          {["SSL 보안", "평균 3분 제작", "4개국어 지원", "카드 등록 불필요"].map(t => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t}
            </span>
          ))}
        </div>

      </div>

      {/* 그라디언트 기하학적 도형 애니메이션 */}
      {/* 큰 원형 */}
      <div style={{ position:"absolute", top:"-5%", right:"-8%", width:280, height:280, borderRadius:"50%", background:"linear-gradient(135deg, rgba(59,130,246,0.3), rgba(0,0,0,0.06))", animation:"geoFloat1 15s ease-in-out infinite", filter:"blur(1px)" }} />
      <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:220, height:220, borderRadius:"50%", background:"linear-gradient(135deg, rgba(59,130,246,0.2), rgba(0,0,0,0.06))", animation:"geoFloat2 18s ease-in-out infinite" }} />
      {/* 중간 도형 */}
      <div style={{ position:"absolute", top:"20%", left:"5%", width:80, height:80, borderRadius:20, background:"linear-gradient(135deg, rgba(52,199,89,0.2), rgba(59,130,246,0.15))", animation:"geoFloat3 12s ease-in-out infinite", transform:"rotate(45deg)" }} />
      <div style={{ position:"absolute", top:"55%", right:"8%", width:100, height:100, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)", animation:"geoFloat1 20s ease-in-out infinite 3s" }} />
      <div style={{ position:"absolute", bottom:"20%", right:"15%", width:60, height:60, borderRadius:16, background:"linear-gradient(135deg, rgba(0,0,0,0.06), rgba(59,130,246,0.15))", animation:"geoFloat3 14s ease-in-out infinite 2s", transform:"rotate(30deg)" }} />
      {/* 작은 도형 */}
      <div style={{ position:"absolute", top:"12%", left:"40%", width:20, height:20, borderRadius:"50%", background:"rgba(255,255,255,0.15)", animation:"geoFloat2 8s ease-in-out infinite" }} />
      <div style={{ position:"absolute", top:"40%", left:"12%", width:14, height:14, borderRadius:4, background:"rgba(52,199,89,0.2)", animation:"geoFloat1 10s ease-in-out infinite 1s", transform:"rotate(45deg)" }} />
      <div style={{ position:"absolute", bottom:"35%", left:"30%", width:10, height:10, borderRadius:"50%", background:"rgba(59,130,246,0.25)", animation:"geoFloat3 9s ease-in-out infinite 4s" }} />
      <div style={{ position:"absolute", top:"70%", left:"8%", width:40, height:40, borderRadius:10, border:"1.5px solid rgba(255,255,255,0.06)", animation:"geoFloat2 16s ease-in-out infinite 2s", transform:"rotate(20deg)" }} />
      <div style={{ position:"absolute", top:"8%", right:"15%", width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", animation:"geoFloat1 13s ease-in-out infinite 5s", transform:"rotate(60deg)" }} />
      {/* 선형 장식 */}
      <div style={{ position:"absolute", top:"30%", right:"5%", width:120, height:2, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", animation:"geoFloat2 10s ease-in-out infinite", transform:"rotate(-30deg)" }} />
      <div style={{ position:"absolute", bottom:"40%", left:"3%", width:80, height:2, background:"linear-gradient(90deg, transparent, rgba(59,130,246,0.12), transparent)", animation:"geoFloat3 12s ease-in-out infinite 3s", transform:"rotate(20deg)" }} />

      <style>{`
        @keyframes geoFloat1{0%,100%{transform:translateY(0) rotate(0deg) scale(1)}50%{transform:translateY(-25px) rotate(8deg) scale(1.05)}}
        @keyframes geoFloat2{0%,100%{transform:translateY(0) translateX(0)}33%{transform:translateY(-18px) translateX(10px)}66%{transform:translateY(-8px) translateX(-8px)}}
        @keyframes geoFloat3{0%,100%{transform:translateY(0) rotate(45deg) scale(1)}25%{transform:translateY(-12px) rotate(55deg) scale(1.08)}50%{transform:translateY(-22px) rotate(50deg) scale(1.03)}75%{transform:translateY(-8px) rotate(40deg) scale(0.97)}}
      `}</style>
    </div>
  );
}

export default function AuthPage({ C, onAuth, navigate }) {
  const { lang } = useI18n();
  const ko = lang === "ko";
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState(() => {
    let referral = "";
    try { referral = new URLSearchParams(window.location.search).get("ref") || ""; } catch {}
    return { email: "", pw: "", pw2: "", nick: "", referral };
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleLogin = async () => {
    setErr("");
    if (!form.email || !form.pw) return setErr("이메일과 비밀번호를 입력해주세요.");
    setLoading(true);
    try {
      const user = await fbLogin(form.email, form.pw);
      onAuth(user); navigate("home");
    } catch(e) {
      setErr(e.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setErr("");
    if (!form.email || !form.pw) return setErr("이메일과 비밀번호를 입력해주세요.");
    if (!isValidEmail(form.email)) return setErr("올바른 이메일을 입력해주세요.");
    if (form.pw.length < 6) return setErr("비밀번호는 6자 이상이어야 합니다.");
    if (form.pw !== form.pw2) return setErr("비밀번호가 일치하지 않습니다.");
    if (!agreedToTerms) return setErr("이용약관에 동의해주세요.");
    setLoading(true);
    try {
      let user = await fbRegister(form.email, form.pw, form.nick || form.email.split("@")[0], null, form.referral.trim());
      if (form.referral.trim()) {
        const rr = await processReferralSignup(user, form.referral.trim());
        if (rr?.user) user = rr.user;
      }
      onAuth(user); navigate("home");
    } catch(e) {
      setErr(e.message || "가입 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await fbGoogleLogin();
  };

  const accent = "#3b82f6";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 14, fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "rgba(59,130,246,0.04)", border: "1.5px solid #e5e7eb",
    transition: "border-color 0.2s, background 0.2s",
  };
  const onFocus = e => { e.target.style.borderColor = accent + "70"; e.target.style.background = accent + "08"; };
  const onBlur = e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "rgba(59,130,246,0.04)"; };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#fff" }}>
      <style>{`@media(max-width:768px){.auth-right{display:none!important}}`}</style>

      {/* 왼쪽: 로그인 폼 */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h1 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: "#1a1a2e", marginBottom: 8, lineHeight: 1.2, letterSpacing: -0.5 }}>
            {tab === "login" ? (ko ? <>다시 만나서<br/>반가워요</> : "Welcome back") : (ko ? "시작해볼까요?" : "Let's get started")}
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 32 }}>
            {tab === "login" ? (ko ? "이메일과 비밀번호를 입력해주세요." : "Enter your credentials to continue.") : (ko ? "가입 후 플랜을 선택하거나 관리자 체험권을 사용할 수 있습니다." : "Sign up, then choose a plan or use an admin-granted trial.")}
          </p>

          {err && <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", color: "#ef4444", fontSize: 13, marginBottom: 16, border: "1px solid #fecaca" }}>{err}</div>}

          {tab === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "이메일" : "Email"}</label>
                <input value={form.email} onChange={f("email")} placeholder="email@example.com" type="email" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "비밀번호" : "Password"}</label>
                <input value={form.pw} onChange={f("pw")} placeholder="6자 이상" type="password" onKeyDown={e => e.key === "Enter" && handleLogin()} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#6b7280" }}>
                  <input type="checkbox" style={{ accentColor: accent }} /> {ko ? "로그인 유지" : "Remember me"}
                </label>
                <button onClick={() => {}} style={{ background: "none", border: "none", color: accent, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>{ko ? "비밀번호 찾기" : "Forgot?"}</button>
              </div>
              <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: accent, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
                {loading ? (ko ? "로그인 중..." : "Signing in...") : (ko ? "로그인" : "Sign In")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "닉네임" : "Nickname"}</label>
                <input value={form.nick} onChange={f("nick")} placeholder={ko ? "닉네임" : "Nickname"} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "이메일" : "Email"}</label>
                <input value={form.email} onChange={f("email")} placeholder="email@example.com" type="email" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "비밀번호" : "Password"}</label>
                <input value={form.pw} onChange={f("pw")} placeholder="6자 이상" type="password" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "비밀번호 확인" : "Confirm"}</label>
                <input value={form.pw2} onChange={f("pw2")} placeholder={ko ? "비밀번호 재입력" : "Re-enter"} type="password" onKeyDown={e => e.key === "Enter" && handleRegister()} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6, display: "block" }}>{ko ? "추천코드" : "Referral"}</label>
                <input value={form.referral} onChange={f("referral")} placeholder={ko ? "추천코드 (선택)" : "Optional"} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 2, accentColor: accent, width: 16, height: 16 }} />
                <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}><a href="/legal" target="_blank" style={{ color: accent }}>{ko ? "이용약관 및 개인정보처리방침" : "Terms & Privacy"}</a>{ko ? "에 동의합니다." : ""}</span>
              </label>
              <button onClick={handleRegister} disabled={loading || !agreedToTerms} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", background: (!agreedToTerms) ? "#d1d5db" : accent, color: "#fff", fontSize: 15, fontWeight: 700, cursor: (loading || !agreedToTerms) ? "not-allowed" : "pointer" }}>
                {loading ? (ko ? "가입 중..." : "Creating...") : (ko ? "회원가입하기" : "Create account")}
              </button>
            </div>
          )}

          {/* 구분선 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{ko ? "또는" : "Or continue with"}</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          <button onClick={handleGoogle} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "1.5px solid #e5e7eb", background: "#fff", color: "#333", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google{ko ? "로 계속하기" : ""}
          </button>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9ca3af" }}>
            {tab === "login" ? (
              <>{ko ? "계정이 없으신가요? " : "New here? "}<button onClick={() => { setTab("register"); setErr(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{ko ? "회원가입" : "Create account"}</button></>
            ) : (
              <>{ko ? "이미 계정이 있으신가요? " : "Have an account? "}<button onClick={() => { setTab("login"); setErr(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{ko ? "로그인" : "Sign in"}</button></>
            )}
          </p>
        </div>
      </div>

      {/* 오른쪽: AI 로더 스타일 배경 */}
      <div className="auth-right" style={{ flex: 1.2, position: "relative", overflow: "hidden", background: "linear-gradient(to bottom, #1a3379, #0f172a, #000)" }}>
        <style>{`
          @keyframes auth-circle{0%{transform:rotate(90deg);box-shadow:0 6px 12px 0 #38bdf8 inset,0 12px 18px 0 #005dff inset,0 36px 36px 0 #1e40af inset,0 0 3px 1.2px rgba(56,189,248,0.3),0 0 6px 1.8px rgba(0,93,255,0.2)}50%{transform:rotate(270deg);box-shadow:0 6px 12px 0 #60a5fa inset,0 12px 6px 0 #0284c7 inset,0 24px 36px 0 #005dff inset,0 0 3px 1.2px rgba(56,189,248,0.3),0 0 6px 1.8px rgba(0,93,255,0.2)}100%{transform:rotate(450deg);box-shadow:0 6px 12px 0 #4dc8fd inset,0 12px 18px 0 #005dff inset,0 36px 36px 0 #1e40af inset,0 0 3px 1.2px rgba(56,189,248,0.3),0 0 6px 1.8px rgba(0,93,255,0.2)}}
          @keyframes auth-letter{0%,100%{opacity:0.4;transform:translateY(0)}20%{opacity:1;transform:scale(1.15)}40%{opacity:0.7;transform:translateY(0)}}
          @keyframes auth-f1{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-18px) rotate(4deg)}}
          @keyframes auth-f2{0%,100%{transform:translateY(0) rotate(2deg)}50%{transform:translateY(-14px) rotate(-3deg)}}
          @keyframes auth-f3{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px) rotate(2deg)}}
        `}</style>
        {/* AI 로더 원 */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div style={{ width: 600, height: 600, borderRadius: "50%", animation: "auth-circle 5s linear infinite" }}/>
        </div>
        {/* 중앙 텍스트 */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
            {(ko ? "SNS메이킷" : "SNS Makeit").split("").map((ch, i) => (
              <span key={i} style={{ fontSize: 18, fontWeight: 600, color: "#fff", opacity: 0.4, display: "inline-block", animation: "auth-letter 3s infinite", animationDelay: `${i * 0.1}s` }}>{ch}</span>
            ))}
          </div>
          <div style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 800, color: "#fff", letterSpacing: -1, textAlign: "center", lineHeight: 1.2 }}>
            {ko ? <>대표님들의 맞춤형<br/>SNS 콘텐츠</> : <>Custom SNS<br/>content for you</>}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>
            {ko ? "키워드 하나로 블로그, 인스타, 쇼츠까지" : "Blog, Instagram, Shorts from one keyword"}
          </div>
        </div>
        {/* 플로팅 SNS 아이콘 — 해외 + 국내, 겹치지 않게 */}
        {[
          { icon: <svg viewBox="0 0 24 24" fill="#E4405F"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, top: "12%", left: "18%", size: 54, anim: "auth-f1 5s ease-in-out infinite" },
          { icon: <svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, top: "10%", right: "20%", size: 58, anim: "auth-f2 6s ease-in-out infinite 1s" },
          { icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, top: "28%", left: "14%", size: 46, anim: "auth-f3 5.5s ease-in-out infinite 0.5s" },
          { icon: <svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, top: "26%", right: "16%", size: 48, anim: "auth-f1 5s ease-in-out infinite 2s" },
          { icon: <svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, top: "44%", left: "16%", size: 44, anim: "auth-f2 6s ease-in-out infinite 1.5s" },
          { icon: <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, top: "42%", right: "14%", size: 50, anim: "auth-f3 5s ease-in-out infinite 0.8s" },
          { icon: <svg viewBox="0 0 24 24" fill="#fff"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>, bottom: "28%", left: "20%", size: 48, anim: "auth-f1 5.8s ease-in-out infinite 1.2s" },
          { icon: <svg viewBox="0 0 24 24" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>, bottom: "25%", right: "18%", size: 42, anim: "auth-f3 6.2s ease-in-out infinite 1.6s" },
          { icon: <svg viewBox="0 0 24 24" fill="#FF4500"><circle cx="12" cy="12" r="12"/><path fill="#fff" d="M19.6 12.3c0-.8-.6-1.4-1.4-1.4-.4 0-.7.2-1 .4-1-.7-2.3-1.1-3.8-1.2l.6-3 2.1.5c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1s-.5-1.1-1.1-1.1c-.4 0-.8.3-1 .6l-2.3-.5c-.1 0-.2 0-.2.1l-.7 3.3c-1.5.1-2.9.5-3.9 1.2-.3-.3-.6-.4-1-.4-.8 0-1.4.6-1.4 1.4 0 .5.3 1 .7 1.2 0 .2 0 .3 0 .5 0 2.5 2.9 4.5 6.4 4.5s6.4-2 6.4-4.5c0-.2 0-.3 0-.5.5-.2.8-.7.8-1.2zM8.8 13.4c0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1-.5 1.1-1.1 1.1-1.1-.5-1.1-1.1zm6.2 3.3c-.8.8-2 .8-3 .8s-2.2 0-3-.8c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0 .6.6 1.6.7 2.6.7s2-.1 2.6-.7c.1-.1.3-.1.4 0 .1.1.1.3 0 .4zm-.2-2.2c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1z"/></svg>, bottom: "14%", left: "30%", size: 40, anim: "auth-f2 5.2s ease-in-out infinite 0.9s" },
        ].map((ic, i) => (
          <div key={i} style={{ position: "absolute", top: ic.top, left: ic.left, right: ic.right, bottom: ic.bottom, zIndex: 3, pointerEvents: "none", animation: ic.anim }}>
            <div style={{ width: ic.size, height: ic.size, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: ic.size * 0.45, height: ic.size * 0.45 }}>{ic.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
