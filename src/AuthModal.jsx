import { useState, useEffect } from "react";
import { fbLogin, fbRegister, fbGoogleLogin, fbKakaoLogin, isValidEmail, supabase } from "./storage";

export default function AuthModal({ onClose, onAuth, C }) {
  const [tab,          setTab]         = useState("login");
  const [form,         setForm]        = useState({ email: "", pw: "", pw2: "", nick: "" });
  const [err,          setErr]         = useState("");
  const [loading,      setLoading]     = useState(false);
  const [regStep,      setRegStep]     = useState(1);   // 1=폼, 2=인증 대기
  const [verifyLoading,setVerifyLoading] = useState(false);
  const [resendCool,   setResendCool]  = useState(false); // 재발송 쿨다운
  const [resendCount,  setResendCount] = useState(0); // 재발송 카운트다운
  const [pendingUser,  setPendingUser] = useState(null);  // 인증 대기 중인 FB user
  const [agreedToTerms, setAgreedToTerms] = useState(false); // 이용약관 동의

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));



  // 인앱 브라우저(카카오/네이버 등 WebView) 감지
  const isInAppBrowser = () => {
    const ua = navigator.userAgent || "";
    return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN|FBAV|Line|Twitter|Snapchat|UCBrowser|MiuiBrowser|GSA/i.test(ua)
      || (ua.includes("wv") && /Android/i.test(ua));
  };

  // 외부 브라우저로 강제 열기 (Chrome Intent / 범용)
  const openInExternalBrowser = () => {
    const url = window.location.href;
    // Android Chrome Intent
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
      setTimeout(() => { window.location.href = url; }, 1500);
    } else {
      window.location.href = url;
    }
  };

  const googleLogin = async () => {
    if (isInAppBrowser()) { setErr("__inapp__"); return; }
    setErr(""); setLoading(true);
    try {
      await fbGoogleLogin(); // Supabase OAuth → 리다이렉트됨 (이후 App.jsx에서 처리)
    } catch(e) {
      setErr("구글 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const kakaoLogin = () => {
    setErr("");
    fbKakaoLogin(); // Supabase OAuth → 리다이렉트됨
  };

  const login = async () => {
    setErr(""); setLoading(true);
    try {
      if (!form.email || !form.pw) { setErr("이메일과 비밀번호를 입력해주세요."); setLoading(false); return; }
      if (!isValidEmail(form.email)) { setErr("올바른 이메일 형식이 아닙니다."); setLoading(false); return; }
      const user = await fbLogin(form.email, form.pw);
      onAuth(user);
    } catch(e) {
      const msg = (e.message?.includes("Invalid login") || e.message?.includes("invalid_credentials") || e.message?.includes("Invalid email"))
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : e.message?.includes("Email not confirmed")
        ? "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요."
        : e.message?.includes("too many requests") || e.message?.includes("rate limit")
        ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
        : e.message?.includes("시간이 초과")
        ? e.message
        : e.message?.includes("User not found") || e.message?.includes("user not found")
        ? "가입되지 않은 이메일입니다. 회원가입을 먼저 해주세요."
        : `오류: ${e.message}`;
      setErr(msg);
    } finally { setLoading(false); }
  };

  const register = async () => {
    setErr(""); setLoading(true);
    try {
      if (!form.nick.trim() || form.nick.trim().length < 2) { setErr("닉네임을 2자 이상 입력해주세요."); setLoading(false); return; }
      if (!isValidEmail(form.email)) { setErr("올바른 이메일 형식이 아닙니다."); setLoading(false); return; }
      if (form.pw.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); setLoading(false); return; }
      if (form.pw !== form.pw2) { setErr("비밀번호가 일치하지 않습니다."); setLoading(false); return; }

      await fbRegister(form.email, form.pw, form.nick.trim());
      setRegStep(2);
    } catch(e) {
      const msg = e.message?.includes("already registered") || e.message?.includes("already been registered") || e.message?.includes("User already registered")
        ? "이미 가입된 이메일입니다."
        : e.message?.includes("Password should")
        ? "비밀번호가 너무 약합니다. (8자 이상)"
        : e.message?.includes("valid email")
        ? "올바른 이메일 형식이 아닙니다."
        : e.message?.includes("시간이 초과")
        ? e.message
        : `오류: ${e.message}`;
      setErr(msg);
    } finally { setLoading(false); }
  };

  // 인증 완료 확인
  const checkVerification = async () => {
    setVerifyLoading(true); setErr("");
    try {
      // Supabase: 이메일 인증 후 로그인 시도
      const user = await fbLogin(form.email, form.pw);
      onAuth(user);
    } catch(e) {
      // 인증 안 된 경우 Supabase가 에러 반환
      setErr("아직 인증이 완료되지 않았어요. 이메일 링크를 클릭해주세요.");
    } finally { setVerifyLoading(false); }
  };

  // 인증 메일 재발송
  const resendEmail = async () => {
    if (resendCool) return;
    try {
      await supabase.auth.resend({ type: "signup", email: form.email });
      setResendCool(true);
      setResendCount(30);
      setErr("");
      const timer = setInterval(() => {
        setResendCount(c => { if (c <= 1) { clearInterval(timer); setResendCool(false); return 0; } return c - 1; });
      }, 1000);
    } catch(e) { setErr("재발송 중 오류가 발생했어요."); }
  };

  // 모달은 항상 다크 스타일로 고정 (배경이 어두운 오버레이 위)
  const isDark = !C.inputBg || C.inputBg.includes("255,255,255");
  const inputBg  = "rgba(255,255,255,0.08)";
  const inputBdr = "rgba(255,255,255,0.18)";
  const inputClr = "#fff";
  const fs = { background: inputBg, border: "1px solid " + inputBdr, borderRadius: 10, padding: "10px 14px", color: inputClr, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,23,48,0.45)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
      <style>{".nper-auth-input::placeholder{color:rgba(255,255,255,0.35)!important}"}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(18,16,58,0.98)", border: "1px solid rgba(124,106,255,0.25)", borderRadius: 22, padding: "clamp(24px,5vw,36px) clamp(18px,4vw,30px)", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", margin: "0 16px" }}>

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: C.toggleBg, border: "none", color: C.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>N</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>SNS메이킷</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>가입 즉시 100P 지급 · AI 생성 비회원 5회 무료</div>
        </div>

        <div style={{ display: "flex", marginBottom: 24, background: C.toggleBg, borderRadius: 10, padding: 4 }}>
          {[["login","로그인"],["register","회원가입"]].map(([t, l]) => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? C.card : "transparent", color: tab === t ? C.purpleL : C.muted, boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{l}</button>
          ))}
        </div>

        {tab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="이메일" type="email" value={form.email} className="nper-auth-input" style={fs} onChange={f("email")} />
            <input placeholder="비밀번호" type="password" value={form.pw} className="nper-auth-input" style={fs} onChange={f("pw")} onKeyDown={e => e.key === "Enter" && login()} />
            {err && err !== "__inapp__" && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
            {err === "__inapp__" && (
              <div style={{ borderRadius: 12, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, marginBottom: 8 }}>카카오 앱에서는 구글 로그인이 불가해요</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 12 }}>
                  Google 정책상 카카오·네이버 등 앱 내 브라우저에서는 구글 로그인이 차단됩니다.<br/>
                  <b style={{ color: "#fff" }}>Chrome 브라우저</b>에서 직접 접속해 로그인해주세요.
                </div>
                <button onClick={openInExternalBrowser}
                  style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  Chrome으로 열기
                </button>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 8 }}>
                  또는 주소창에 <b style={{ color: "rgba(255,255,255,0.6)" }}>snsmakeit.com</b> 직접 입력
                </div>
              </div>
            )}
            <button onClick={login} disabled={loading} style={{ padding: "12px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700 }}>
              {loading ? "로그인 중..." : "로그인하기"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>또는</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
            <button onClick={googleLogin} disabled={loading}
              style={{ padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google로 로그인
            </button>

            <button onClick={() => alert("npermovie@naver.com으로 문의해주세요")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", padding: "2px 0 0" }}>
              비밀번호를 잊으셨나요?
            </button>
            <button onClick={() => { setTab("register"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", padding: "4px" }}>
              아직 계정이 없으신가요? <span style={{ color: "#a5b4fc", fontWeight: 700 }}>회원가입</span>
            </button>
          </div>
        )}

        {tab === "register" && regStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="닉네임 (2자 이상)" value={form.nick} className="nper-auth-input" style={fs} onChange={f("nick")} />
            <input placeholder="이메일" type="email" value={form.email} className="nper-auth-input" style={fs} onChange={f("email")} />
            <input placeholder="비밀번호 (8자 이상)" type="password" value={form.pw} className="nper-auth-input" style={fs} onChange={f("pw")} />
            <input placeholder="비밀번호 확인" type="password" value={form.pw2} className="nper-auth-input" style={fs} onChange={f("pw2")} onKeyDown={e => e.key === "Enter" && register()} />
            {err && err !== "__inapp__" && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
            {err === "__inapp__" && (
              <div style={{ borderRadius: 12, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, marginBottom: 8 }}>카카오 앱에서는 구글 로그인이 불가해요</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 12 }}>
                  Google 정책상 카카오·네이버 등 앱 내 브라우저에서는 구글 로그인이 차단됩니다.<br/>
                  <b style={{ color: "#fff" }}>Chrome 브라우저</b>에서 직접 접속해 로그인해주세요.
                </div>
                <button onClick={openInExternalBrowser}
                  style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  Chrome으로 열기
                </button>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 8 }}>
                  또는 주소창에 <b style={{ color: "rgba(255,255,255,0.6)" }}>snsmakeit.com</b> 직접 입력
                </div>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "4px 0" }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#7c6aff", width: 16, height: 16, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                <a href="/legal" target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", textDecoration: "underline" }}>이용약관 및 개인정보처리방침</a>에 동의합니다
              </span>
            </label>
            <button onClick={register} disabled={loading || !agreedToTerms} style={{ padding: "12px", borderRadius: 12, border: "none", cursor: (loading || !agreedToTerms) ? "not-allowed" : "pointer", background: (loading || !agreedToTerms) ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700, opacity: !agreedToTerms ? 0.5 : 1 }}>
              {loading ? "가입 중..." : "회원가입하기"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>또는</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
            <button onClick={googleLogin} disabled={loading}
              style={{ padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google로 시작하기
            </button>

            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: C.purpleL, fontWeight: 700, marginBottom: 6 }}>가입 혜택</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                ·가입 즉시 <b style={{ color: C.text }}>100P</b> 지급 (AI 10회 분량)<br/>
                ·게시글 작성 시 <b style={{ color: C.text }}>2P</b> 적립<br/>
                ·출석체크 시 <b style={{ color: C.text }}>3P</b> 적립<br/>
                ·포인트 충전으로 AI 무제한 이용
              </div>
            </div>
          </div>
        )}

        {/* ── 이메일 인증 대기 화면 ── */}
        {tab === "register" && regStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
            {/* 아이콘 */}
            <div style={{ fontSize: 18, fontWeight: 700, color: "#7c6aff", margin: "8px 0 4px" }}>이메일 인증</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>이메일 인증을 완료해주세요</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.9 }}>
              <b style={{ color: "#a5b4fc" }}>{form.email}</b>으로<br/>
              인증 메일을 발송했어요.<br/>
              메일함을 확인하고 링크를 클릭한 뒤<br/>아래 버튼을 눌러주세요.
            </div>

            {/* 안내 박스 */}
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "12px 14px", textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                메일이 보이지 않으면 <b style={{ color: "#fff" }}>스팸함</b>을 확인해주세요<br/>
                링크 클릭 후 이 창으로 돌아와서 아래 버튼을 눌러주세요
              </div>
            </div>

            {err && <div style={{ fontSize: 12, color: "#e53e3e", background: "rgba(229,62,62,0.08)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(229,62,62,0.2)" }}>{err}</div>}

            {/* 인증 완료 확인 버튼 */}
            <button onClick={checkVerification} disabled={verifyLoading}
              style={{ padding: "13px", borderRadius: 12, border: "none", cursor: verifyLoading ? "not-allowed" : "pointer", background: verifyLoading ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
              {verifyLoading ? "확인 중..." : "인증 완료 확인"}
            </button>

            {/* 재발송 + 다시가입 */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resendEmail} disabled={resendCool}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: resendCool ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)", fontSize: 12, cursor: resendCool ? "not-allowed" : "pointer" }}>
                {resendCool ? `${resendCount}초 후 재발송` : "메일 재발송"}
              </button>
              <button onClick={() => { setRegStep(1); setErr(""); setPendingUser(null); }}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer" }}>
                ← 정보 수정
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
