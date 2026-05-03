import { useState, useEffect } from "react";
import { fbLogin, fbRegister, fbGoogleLogin, isValidEmail, supabase, processReferralSignup } from "./storage";
import { useI18n } from "./i18n.jsx";

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
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(145deg, rgba(67,56,202,0.6), rgba(124,106,255,0.35), rgba(139,92,246,0.4))` }} />

      {/* 배경 장식 */}
      <div style={{ position: "absolute", top: -150, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(236,72,153,0.12)", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -80, width: 350, height: 350, borderRadius: "50%", background: "rgba(124,106,255,0.15)", filter: "blur(60px)" }} />
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
          카드 등록 없이 무료로 시작
        </div>

        {/* 타이틀 */}
        <h2 style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ display: "block", fontSize: "clamp(26px,3vw,36px)", fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>콘텐츠 제작,</span>
          <span style={{ display: "block", fontSize: "clamp(32px,4vw,46px)", fontWeight: 900, background: "linear-gradient(135deg, #c084fc, #ec4899, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.2 }}>AI에게 맡기세요</span>
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
      <div style={{ position:"absolute", top:"-5%", right:"-8%", width:280, height:280, borderRadius:"50%", background:"linear-gradient(135deg, rgba(236,72,153,0.3), rgba(124,106,255,0.1))", animation:"geoFloat1 15s ease-in-out infinite", filter:"blur(1px)" }} />
      <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:220, height:220, borderRadius:"50%", background:"linear-gradient(135deg, rgba(56,189,248,0.2), rgba(124,106,255,0.15))", animation:"geoFloat2 18s ease-in-out infinite" }} />
      {/* 중간 도형 */}
      <div style={{ position:"absolute", top:"20%", left:"5%", width:80, height:80, borderRadius:20, background:"linear-gradient(135deg, rgba(251,191,36,0.2), rgba(236,72,153,0.15))", animation:"geoFloat3 12s ease-in-out infinite", transform:"rotate(45deg)" }} />
      <div style={{ position:"absolute", top:"55%", right:"8%", width:100, height:100, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)", animation:"geoFloat1 20s ease-in-out infinite 3s" }} />
      <div style={{ position:"absolute", bottom:"20%", right:"15%", width:60, height:60, borderRadius:16, background:"linear-gradient(135deg, rgba(124,106,255,0.2), rgba(56,189,248,0.15))", animation:"geoFloat3 14s ease-in-out infinite 2s", transform:"rotate(30deg)" }} />
      {/* 작은 도형 */}
      <div style={{ position:"absolute", top:"12%", left:"40%", width:20, height:20, borderRadius:"50%", background:"rgba(255,255,255,0.15)", animation:"geoFloat2 8s ease-in-out infinite" }} />
      <div style={{ position:"absolute", top:"40%", left:"12%", width:14, height:14, borderRadius:4, background:"rgba(251,191,36,0.2)", animation:"geoFloat1 10s ease-in-out infinite 1s", transform:"rotate(45deg)" }} />
      <div style={{ position:"absolute", bottom:"35%", left:"30%", width:10, height:10, borderRadius:"50%", background:"rgba(236,72,153,0.25)", animation:"geoFloat3 9s ease-in-out infinite 4s" }} />
      <div style={{ position:"absolute", top:"70%", left:"8%", width:40, height:40, borderRadius:10, border:"1.5px solid rgba(255,255,255,0.06)", animation:"geoFloat2 16s ease-in-out infinite 2s", transform:"rotate(20deg)" }} />
      <div style={{ position:"absolute", top:"8%", right:"15%", width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", animation:"geoFloat1 13s ease-in-out infinite 5s", transform:"rotate(60deg)" }} />
      {/* 선형 장식 */}
      <div style={{ position:"absolute", top:"30%", right:"5%", width:120, height:2, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", animation:"geoFloat2 10s ease-in-out infinite", transform:"rotate(-30deg)" }} />
      <div style={{ position:"absolute", bottom:"40%", left:"3%", width:80, height:2, background:"linear-gradient(90deg, transparent, rgba(236,72,153,0.12), transparent)", animation:"geoFloat3 12s ease-in-out infinite 3s", transform:"rotate(20deg)" }} />

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

  const accent = "#7c6aff";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#fff" }}>
      {/* 왼쪽: 로그인 폼 */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${accent},#ec4899)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>M</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>SNS메이킷</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1a1a2e", marginBottom: 8, lineHeight: 1.3 }}>
            {tab === "login" ? (ko ? "로그인" : "Log in to your account") : (ko ? "회원가입" : "Create your account")}
          </h1>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 28 }}>
            {tab === "login" ? (ko ? "이메일과 비밀번호를 입력해주세요." : "Enter your email and password to login.") : (ko ? "무료로 가입하고 AI 콘텐츠를 만들어보세요." : "Sign up free and start creating.")}
          </p>

          {/* 에러 */}
          {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#ef4444", fontSize: 13, marginBottom: 16, border: "1px solid #fecaca" }}>{err}</div>}

          {/* 폼 */}
          {tab === "login" ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>이메일</label>
                <input value={form.email} onChange={f("email")} placeholder="email@example.com" type="email"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>비밀번호</label>
                <input value={form.pw} onChange={f("pw")} placeholder="6자 이상" type="password"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ textAlign: "right", marginBottom: 20 }}>
                <button onClick={() => {}} style={{ background: "none", border: "none", color: accent, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>비밀번호 찾기</button>
              </div>
              <button onClick={handleLogin} disabled={loading}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: accent, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "wait" : "pointer", marginBottom: 20 }}>
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>닉네임</label>
                <input value={form.nick} onChange={f("nick")} placeholder="닉네임"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>이메일</label>
                <input value={form.email} onChange={f("email")} placeholder="email@example.com" type="email"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>비밀번호</label>
                <input value={form.pw} onChange={f("pw")} placeholder="6자 이상" type="password"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>비밀번호 확인</label>
                <input value={form.pw2} onChange={f("pw2")} placeholder="비밀번호 재입력" type="password"
                  onKeyDown={e => e.key === "Enter" && handleRegister()}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, display: "block" }}>추천코드</label>
                <input value={form.referral} onChange={f("referral")} placeholder="추천코드 (선택)"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
                <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>추천코드 입력 시 가입자는 5회, 추천한 회원은 10회를 받습니다.</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer" }}>
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 12, color: "#666" }}><a href="/legal" target="_blank" style={{ color: accent }}>이용약관</a> 및 <a href="/legal" target="_blank" style={{ color: accent }}>개인정보처리방침</a>에 동의합니다.</span>
              </label>
              <button onClick={handleRegister} disabled={loading}
                style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: accent, color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "wait" : "pointer", marginBottom: 20 }}>
                {loading ? "가입 중..." : "무료로 시작하기"}
              </button>
            </>
          )}

          {/* 구분선 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 11, color: "#aaa" }}>또는</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          {/* 소셜 로그인 */}
          <button onClick={handleGoogle}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", color: "#333", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google로 계속하기
          </button>

          {/* 탭 전환 */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#888" }}>
            {tab === "login" ? (
              <>계정이 없으신가요? <button onClick={() => { setTab("register"); setErr(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>회원가입</button></>
            ) : (
              <>이미 계정이 있으신가요? <button onClick={() => { setTab("login"); setErr(""); }} style={{ background: "none", border: "none", color: accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>로그인</button></>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 서비스 소개 슬라이드 (모바일 숨김) */}
      {!isMobile && <LoginRightPanel accent={accent} />}
    </div>
  );
}
