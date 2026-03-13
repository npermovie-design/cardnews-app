import { useState } from "react";
import { fbLogin, fbRegister, isValidEmail } from "./storage";

export default function AuthModal({ onClose, onAuth, C }) {
  const [tab,     setTab]     = useState("login");
  const [form,    setForm]    = useState({ email: "", pw: "", pw2: "", nick: "" });
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

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

  const fs = { background: C.inputBg, border: "1px solid " + C.inputBorder, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,23,48,0.45)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.modalBg, border: "1px solid rgba(124,106,255,0.2)", borderRadius: 22, padding: "36px 30px", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", margin: "0 16px" }}>

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: C.toggleBg, border: "none", color: C.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>N</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>엔퍼콘텐츠랩</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>가입 즉시 50P 지급 · AI 생성 5회 무료</div>
        </div>

        <div style={{ display: "flex", marginBottom: 24, background: C.toggleBg, borderRadius: 10, padding: 4 }}>
          {[["login","로그인"],["register","회원가입"]].map(([t, l]) => (
            <button key={t} onClick={() => { setTab(t); setErr(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? C.card : "transparent", color: tab === t ? C.purpleL : C.muted, boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>{l}</button>
          ))}
        </div>

        {tab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="이메일" type="email" value={form.email} style={fs} onChange={f("email")} />
            <input placeholder="비밀번호" type="password" value={form.pw} style={fs} onChange={f("pw")} onKeyDown={e => e.key === "Enter" && login()} />
            {err && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
            <button onClick={login} disabled={loading} style={{ padding: "12px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700 }}>
              {loading ? "로그인 중..." : "로그인하기"}
            </button>
            <button onClick={() => { setTab("register"); setErr(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, textAlign: "center", padding: "4px" }}>
              아직 계정이 없으신가요? <span style={{ color: C.purpleL, fontWeight: 700 }}>회원가입</span>
            </button>
          </div>
        )}

        {tab === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="닉네임 (2자 이상)" value={form.nick} style={fs} onChange={f("nick")} />
            <input placeholder="이메일" type="email" value={form.email} style={fs} onChange={f("email")} />
            <input placeholder="비밀번호 (8자 이상)" type="password" value={form.pw} style={fs} onChange={f("pw")} />
            <input placeholder="비밀번호 확인" type="password" value={form.pw2} style={fs} onChange={f("pw2")} onKeyDown={e => e.key === "Enter" && register()} />
            {err && <div style={{ fontSize: 12, color: "#e53e3e", textAlign: "center", background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px", border: "1px solid rgba(229,62,62,0.15)" }}>{err}</div>}
            <button onClick={register} disabled={loading} style={{ padding: "12px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(124,106,255,0.3)" : "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700 }}>
              {loading ? "가입 중..." : "회원가입하기"}
            </button>
            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: C.purpleL, fontWeight: 700, marginBottom: 6 }}>🎁 가입 혜택</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                ✅ 가입 즉시 <b style={{ color: C.text }}>50P</b> 지급 (AI 5회 분량)<br/>
                ✅ 게시글 작성 시 <b style={{ color: C.text }}>10P</b> 적립<br/>
                ✅ 댓글 작성 시 <b style={{ color: C.text }}>2P</b> 적립<br/>
                ✅ 일일 로그인 시 <b style={{ color: C.text }}>3P</b> 적립
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
