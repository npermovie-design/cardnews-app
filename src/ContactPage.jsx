import { useState, useEffect } from "react";
import { Badge, Btn } from "./UI";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage } from "./storage";

export function ContactPage({ C }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", msg: "" });
  const [sent, setSent] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const fs = { background: C.inputBg, border: "1px solid " + C.inputBorder, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  const submit = () => {
    if (!form.name || !form.email || !form.msg) { alert("이름, 이메일, 문의 내용을 입력해주세요."); return; }
    // 실제 메일 전송은 EmailJS or FormSpree 연동 필요 → 지금은 카카오로 유도
    window.open("https://open.kakao.com/o/gIw9vTFg", "_blank");
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>✦ 문의하기</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>무엇이든 물어보세요</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>빠른 답변을 원하시면 카카오톡 오픈채팅을 이용해주세요</p>
      </div>

      {/* 빠른 연락 수단 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))", gap: 12, marginBottom: 40 }}>
        {[
          { icon: "💬", title: "카카오 오픈채팅", desc: "가장 빠른 응답", sub: "평균 30분 이내", color: "#FEE500", tc: "#3A1D1D", url: "https://open.kakao.com/o/gIw9vTFg" },
          { icon: "📸", title: "인스타그램 DM", desc: "@nperinsight", sub: "DM으로 문의", color: "linear-gradient(45deg,#f09433,#dc2743)", tc: "#fff", url: "https://www.instagram.com/nperinsight/" },
          { icon: "▶", title: "유튜브 채널", desc: "@nperinsight", sub: "영상 댓글 문의", color: "#FF0000", tc: "#fff", url: "https://www.youtube.com/@nperinsight/videos" },
        ].map((item, i) => (
          <button key={i} onClick={() => window.open(item.url, "_blank")}
            style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px", cursor: "pointer", textAlign: "left", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: C.shadow }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = C.shadow; }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: item.tc, fontWeight: 900, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: C.purpleL, marginBottom: 2, fontWeight: 600 }}>{item.desc}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* 문의 폼 */}
      {!sent ? (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>📝 문의 내용 남기기</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>카카오 오픈채팅으로 연결되며, 이메일로도 답변드려요</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>이름 *</div>
                <input placeholder="홍길동" value={form.name} style={fs} onChange={f("name")} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>이메일 *</div>
                <input placeholder="example@email.com" type="email" value={form.email} style={fs} onChange={f("email")} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>문의 유형</div>
              <select value={form.subject} style={{ ...fs }} onChange={f("subject")}>
                <option value="">선택해주세요</option>
                <option value="service">서비스 문의</option>
                <option value="payment">결제/포인트 문의</option>
                <option value="bug">오류/버그 신고</option>
                <option value="partner">제휴/파트너십</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>문의 내용 *</div>
              <textarea placeholder="문의하실 내용을 자세히 적어주세요..." rows={5} value={form.msg} style={{ ...fs, resize: "vertical" }} onChange={f("msg")} />
            </div>
            <button onClick={submit}
              style={{ padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>
              💬 문의 남기기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "48px 28px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>카카오톡이 열렸어요!</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>오픈채팅에서 문의 내용을 보내주세요<br/>빠르게 답변드릴게요 😊</div>
          <button onClick={() => setSent(false)} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>다시 문의하기</button>
        </div>
      )}
    </div>
  );
}
