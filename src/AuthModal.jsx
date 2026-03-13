import { useState, useEffect, useRef } from "react";
import { getMembers, saveMembers, isValidEmail, genCode } from "./storage";

export default function AuthModal({ onClose, onAuth, C }) {
  const [tab, setTab]             = useState("login");
  const [form, setForm]           = useState({ email: "", pw: "", pw2: "", nick: "" });
  const [err, setErr]             = useState("");
  const [step, setStep]           = useState("form");
  const [code, setCode]           = useState("");
  const [inputCode, setInputCode] = useState("");
  const [codeTimer, setCodeTimer] = useState(0);
  const timerRef                  = useRef(null);

  const startTimer = () => {
    setCodeTimer(180);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCodeTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);
  const fmtTime = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

  const login = () => {
    setErr("");
    if (!form.email || !form.pw) { setErr("이메일과 비밀번호를 입력해주세요."); return; }
    if (!isValidEmail(form.email)) { setErr("올바른 이메일 형식이 아닙니다."); return; }
    const found = getMembers().find(m => m.email === form.email && m.pw === form.pw);
    if (!found) { setErr("이메일 또는 비밀번호가 올바르지 않습니다."); return; }
    onAuth(found);
  };

  const sendCode = () => {
    setErr("");
    if (!form.nick.trim()) { setErr("닉네임을 입력해주세요."); return; }
    if (!isValidEmail(form.email)) { setErr("올바른 이메일 형식이 아닙니다."); return; }
    if (form.pw.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    if (form.pw !== form.pw2) { setErr("비밀번호가 일치하지 않습니다."); return; }
    if (getMembers().find(m => m.email === form.email)) { setErr("이미 가입된 이메일입니다."); return; }
    const nc = genCode();
    setCode(nc); setInputCode(""); setStep("verify"); startTimer();
    console.log("[인증코드]", form.email, ":", nc);
    alert("인증코드: " + nc + "\n(테스트 모드 - 콘솔에서도 확인 가능)");
  };

  const verify = () => {
    setErr("");
    if (codeTimer === 0) { setErr("인증 시간이 만료됐습니다. 다시 요청해주세요."); return; }
    if (inputCode.trim() !== code) { setErr("인증코드가 올바르지 않습니다."); return; }
    const nu = {
      id: Date.now(), email: form.email, pw: form.pw, nick: form.nick,
      role: "member", points: 0, joinDate: new Date().toLocaleDateString("ko-KR"), verified: true,
    };
    saveMembers([...getMembers(), nu]);
    clearInterval(timerRef.current);
    onAuth(nu);
  };

  const fs = {
    background: C.inputBg, border: "1px solid " + C.inputBorder,
    borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13,
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,23,48,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.modalBg, border: "1px solid rgba(124,106,255,0.2)",
          borderRadius: 22, padding: "36px 30px", width: "100%", maxWidth: 420,
          position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", margin: "0 16px",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, background: C.toggleBg,
            border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1,
            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: "linear-gradient(135deg,#7c6aff,#ec4899)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8,
          }}>N</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>엔퍼콘텐츠랩</div>
        </div>

        <div style={{ display: "flex", marginBottom: 24, background: C.toggleBg, borderRadius: 10, padding: 4 }}>
          {[["login", "로그인"], ["register", "회원가입"]].map(([t, l]) => (
            <button key={t}
              onClick={() => { setTab(t); setErr(""); setStep("form"); setInputCode(""); }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
                background: tab === t ? C.card : "transparent",
                color: tab === t ? C.purpleL : C.muted,
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >{l}</button>
          ))}
        </div>

        {tab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="이메일" type="email" value={form.email} style={fs}
              onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="비밀번호" type="password" value={form.pw} style={fs}
              onChange={e => setForm({ ...form, pw: e.target.value })}
              onKeyDown={e => e.key === "Enter" && login()} />
            {err && (
              <div style={{
                fontSize: 12, color: "#e53e3e", textAlign: "center",
                background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px",
                border: "1px solid rgba(229,62,62,0.15)",
              }}>{err}</div>
            )}
            <button onClick={login} style={{
              padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#7c6aff,#ec4899)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              boxShadow: "0 4px 14px rgba(124,106,255,0.25)",
            }}>로그인하기</button>
          </div>
        )}

        {tab === "register" && step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="닉네임 (2자 이상)" value={form.nick} style={fs}
              onChange={e => setForm({ ...form, nick: e.target.value })} />
            <input placeholder="이메일" type="email" value={form.email} style={fs}
              onChange={e => setForm({ ...form, email: e.target.value })} />
            <input placeholder="비밀번호 (8자 이상)" type="password" value={form.pw} style={fs}
              onChange={e => setForm({ ...form, pw: e.target.value })} />
            <input placeholder="비밀번호 확인" type="password" value={form.pw2} style={fs}
              onChange={e => setForm({ ...form, pw2: e.target.value })} />
            {err && (
              <div style={{
                fontSize: 12, color: "#e53e3e", textAlign: "center",
                background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px",
                border: "1px solid rgba(229,62,62,0.15)",
              }}>{err}</div>
            )}
            <button onClick={sendCode} style={{
              padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#7c6aff,#ec4899)",
              color: "#fff", fontSize: 14, fontWeight: 700,
              boxShadow: "0 4px 14px rgba(124,106,255,0.25)",
            }}>이메일 인증코드 발송</button>
          </div>
        )}

        {tab === "register" && step === "verify" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              textAlign: "center", padding: "12px",
              background: "rgba(124,106,255,0.06)", borderRadius: 12,
              color: C.purpleL, fontSize: 13, fontWeight: 700,
              border: "1px solid rgba(124,106,255,0.15)",
            }}>{form.email} 로 코드 발송됨</div>
            <div>
              <input placeholder="6자리 인증코드" value={inputCode} maxLength={6}
                style={{ ...fs, textAlign: "center", fontSize: 20, letterSpacing: 6 }}
                onChange={e => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={e => e.key === "Enter" && verify()} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: codeTimer < 30 ? "#e53e3e" : C.muted }}>
                  {codeTimer > 0 ? "남은시간 " + fmtTime(codeTimer) : "시간 만료"}
                </span>
                <button onClick={sendCode} style={{ fontSize: 11, color: C.purpleL, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  재발송
                </button>
              </div>
            </div>
            {err && (
              <div style={{
                fontSize: 12, color: "#e53e3e", textAlign: "center",
                background: "rgba(229,62,62,0.06)", borderRadius: 8, padding: "8px",
                border: "1px solid rgba(229,62,62,0.15)",
              }}>{err}</div>
            )}
            <button onClick={verify} style={{
              padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
              background: inputCode.length === 6 ? "linear-gradient(135deg,#7c6aff,#ec4899)" : "#f0eefd",
              color: inputCode.length === 6 ? "#fff" : C.muted,
              fontSize: 14, fontWeight: 700,
            }}>인증 완료 및 가입</button>
            <button onClick={() => { setStep("form"); setErr(""); }} style={{
              padding: "8px", borderRadius: 10, cursor: "pointer",
              border: "1px solid rgba(0,0,0,0.1)",
              background: "transparent", color: C.muted, fontSize: 12,
            }}>이전으로</button>
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 11, color: C.muted, textAlign: "center" }}>
          회원 혜택: AI 생성기 20회 무료 + 포인트 적립
        </div>
      </div>
    </div>
  );
}
