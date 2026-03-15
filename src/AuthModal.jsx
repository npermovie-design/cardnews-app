import { useState } from "react";
import { fbLogin, fbRegister, fbGoogleLogin, isValidEmail } from "./storage";

export default function AuthModal({ onClose, onAuth, C }) {
  const [tab,     setTab]     = useState("login");
  const [form,    setForm]    = useState({ email: "", pw: "", pw2: "", nick: "" });
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const googleLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const user = await fbGoogleLogin();
      onAuth(user);
    } catch(e) {
      const msg = e.code === "auth/popup-closed-by-user" ? "로그인 창을 닫았습니다."
        : e.code === "auth/popup-blocked" ? "팝업이 차단됐습니다. 팝업을 허용해주세요."
        : "구글 로그인 중 오류가 발생했습니다.";
      setErr(msg);
    } finally { setLoading(false); }
  };

  // 카카오 팝업 메시지 수신
  useState(() => {
    const handler = async (e) => {
      if (e.data && e.data.type === "kakao_code") {
        setErr(""); setLoading(true);
        try {
          const user = await fbKakaoLogin(e.data.code);
          onAuth(user);
        } catch(err) {
          setErr("카카오 로그인 중 오류가 발생했습니다.");
        } finally { setLoading(false); }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  });

  const kakaoLogin = () => {
    setErr("");
    kakaoLoginRedirect();
  };

  const login = async () => {
    setErr(""); setLoading(true);
    try {
      if (!form.email || !form.pw) { setErr("이메일과 비밀번호를 입력해주세요."); setLoading(false); return; }
      if (!isValidEmail(form.email)) { setErr("올바른 이메일 형식이 아닙니다."); setLoading(false); return; }
      const user = await fbLogin(form.email, form.pw);
      onAuth(user);
    } catch(e) {
      const msg = (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : e.code === "auth/too-many-requests"
        ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
        : "로그인 중 오류가 발생했습니다.";
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
      const user = await fbRegister(form.email, form.pw, form.nick.trim());
      onAuth(user);
    } catch(e) {
      const msg = e.code === "auth/email-already-in-use" ? "이미 가입된 이메일입니다."
        : e.code === "auth/weak-password" ? "비밀번호가 너무 약합니다."
        : e.code === "auth/invalid-email" ? "올바른 이메일 형식이 아닙니다."
        : "회원가입 중 오류가 발생했습니다.";
      setErr(msg);
    } finally { setLoading(false); }
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
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>엔퍼콘텐츠랩</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>가입 즉시 10P 지급 · AI 생성 비회원 5회 무료</div>
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
            {err && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
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

            <button onClick={() => { setTab("register"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", padding: "4px" }}>
              아직 계정이 없으신가요? <span style={{ color: "#a5b4fc", fontWeight: 700 }}>회원가입</span>
            </button>
          </div>
        )}

        {tab === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="닉네임 (2자 이상)" value={form.nick} className="nper-auth-input" style={fs} onChange={f("nick")} />
            <input placeholder="이메일" type="email" value={form.email} className="nper-auth-input" style={fs} onChange={f("email")} />
            <input placeholder="비밀번호 (8자 이상)" type="password" value={form.pw} className="nper-auth-input" style={fs} onChange={f("pw")} />
            <input placeholder="비밀번호 확인" type="password" value={form.pw2} className="nper-auth-input" style={fs} onChange={f("pw2")} onKeyDown={e => e.key === "Enter" && register()} />
            {err && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
            <button onClick={register} disabled={loading} style={{ padding: "12px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700 }}>
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
              <div style={{ fontSize: 11, color: C.purpleL, fontWeight: 700, marginBottom: 6 }}>🎁 가입 혜택</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                ✅ 가입 즉시 <b style={{ color: C.text }}>10P</b> 지급 (AI 1회 분량)<br/>
                ✅ 게시글 작성 시 <b style={{ color: C.text }}>1P</b> 적립<br/>
                ✅ 일일 로그인 시 <b style={{ color: C.text }}>1P</b> 적립<br/>
                ✅ 포인트 충전으로 AI 무제한 이용
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
