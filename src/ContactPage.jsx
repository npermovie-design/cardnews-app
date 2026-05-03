import { useState } from "react";
import { useI18n } from "./i18n.jsx";
import { getPageText } from "./i18n-pages.js";
import { supabase } from "./storage";

// FAQ_LIST is generated inside ContactPage for i18n support

export function ContactPage({ C }) {
  const { lang } = useI18n();
  const p = (key) => getPageText(lang, key);

  const FAQ_LIST = [
    { q: p("contactFaqQ1"), a: p("contactFaqA1") },
    { q: p("contactFaqQ2"), a: p("contactFaqA2") },
    { q: p("contactFaqQ3"), a: p("contactFaqA3") },
    { q: p("contactFaqQ4"), a: p("contactFaqA4") },
    { q: p("contactFaqQ5"), a: p("contactFaqA5") },
    { q: p("contactFaqQ6"), a: p("contactFaqA6") },
    { q: p("contactFaqQ7"), a: p("contactFaqA7") },
  ];

  const [form, setForm] = useState({ name: "", email: "", subject: "", msg: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const f = k => e => setForm(p2 => ({ ...p2, [k]: e.target.value }));

  const fs = { background: C.inputBg, border: "1px solid " + C.inputBorder, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", minHeight: 44 };
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!form.name || !form.email || !form.msg) { setErr(lang === "ko" ? "이름, 이메일, 문의 내용을 모두 입력해주세요." : "Please fill in name, email, and message."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr(lang === "ko" ? "올바른 이메일 주소를 입력해주세요." : "Please enter a valid email address."); return; }
    setSubmitting(true);
    try {
      await supabase.from("inquiries").insert({
        name: form.name, email: form.email, subject: form.subject, message: form.msg,
      });
    } catch(e) { /* inquiry save failed */ }
    setSubmitting(false);
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>{p("contactTitle")}</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{p("contactSub")}</p>
      </div>

      {/* 채널톡 바로 상담 */}
      <button onClick={() => { if (window.ChannelIO) window.ChannelIO("showMessenger"); }}
        style={{
          width: "100%", padding: "16px 20px", marginBottom: 32, borderRadius: 14,
          border: `1px solid ${C.border}`, background: C.card,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#168EEA"}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#168EEA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{p("contactChat")}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p("contactChatSub")}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#168EEA", flexShrink: 0 }}>{p("contactChatBtn")}</span>
      </button>

      {/* 자주 묻는 질문 */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 16 }}>{p("contactFaqTitle")}</h3>
        {FAQ_LIST.map((faq, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: "100%", padding: "16px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, textAlign: "left" }}>{faq.q}</span>
              <span style={{ fontSize: 18, color: C.muted, flexShrink: 0, marginLeft: 12, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{faq.a}</div>
            )}
          </div>
        ))}
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
            {err && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13 }}>{err}</div>}
            <button onClick={submit} disabled={submitting}
              style={{ padding: "14px", borderRadius: 12, border: "none", cursor: submitting?"not-allowed":"pointer", background: "#168EEA", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", opacity: submitting?0.7:1, minHeight: 44 }}>
              {submitting ? p("contactSubmitting") : p("contactSubmit")}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "48px 28px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: "#10b981", fontWeight: 900 }}>V</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>{p("contactSuccess")}</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-line" }}>{p("contactSuccessMsg")}</div>
          <button onClick={() => setSent(false)} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>{p("contactBack")}</button>
        </div>
      )}
    </div>
  );
}
