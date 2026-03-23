import { useState } from "react";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

export function ContactPage({ C }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);
  const [form, setForm] = useState({ name: "", email: "", subject: "", msg: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const f = k => e => setForm(p2 => ({ ...p2, [k]: e.target.value }));

  const fs = { background: C.inputBg, border: "1px solid " + C.inputBorder, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  const submit = async () => {
    if (!form.name || !form.email || !form.msg) { alert(p("contactRequired")); return; }
    setSubmitting(true);
    try {
      await supabase.from("inquiries").insert({
        name: form.name, email: form.email, subject: form.subject, message: form.msg,
      });
    } catch(e) { console.warn("문의 저장 실패:", e); }
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>{p("contactBadge")}</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>{p("contactTitle")}</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{p("contactSub")}</p>
      </div>

      {/* 문의 폼 */}
      {!sent ? (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>{p("contactFormTitle")}</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>{p("contactFormSub")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>{p("contactName")}</div>
                <input placeholder={p("contactNamePh")} value={form.name} style={fs} onChange={f("name")} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>{p("contactEmail")}</div>
                <input placeholder={p("contactEmailPh")} type="email" value={form.email} style={fs} onChange={f("email")} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>{p("contactSubject")}</div>
              <select value={form.subject} style={{ ...fs }} onChange={f("subject")}>
                <option value="">{p("contactSubjectPh")}</option>
                <option value="service">{p("contactSubj1")}</option>
                <option value="payment">{p("contactSubj2")}</option>
                <option value="bug">{p("contactSubj3")}</option>
                <option value="partner">{p("contactSubj4")}</option>
                <option value="other">{p("contactSubj5")}</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>{p("contactMsg")}</div>
              <textarea placeholder={p("contactMsgPh")} rows={5} value={form.msg} style={{ ...fs, resize: "vertical" }} onChange={f("msg")} />
            </div>
            <button onClick={submit} disabled={submitting}
              style={{ padding: "13px", borderRadius: 12, border: "none", cursor: submitting?"not-allowed":"pointer", background: "linear-gradient(135deg,#7c6aff,#1a1730)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(124,106,255,0.3)", opacity: submitting?0.7:1 }}>
              {submitting ? "전송 중..." : p("contactSubmit")}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "48px 28px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>{p("contactSuccess")}</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>{p("contactSuccessMsg")}</div>
          <button onClick={() => setSent(false)} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>{p("contactBack")}</button>
        </div>
      )}
    </div>
  );
}
