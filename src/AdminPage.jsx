import { useState } from "react";
import { getPosts, setPosts, getMembers, saveMembers } from "./storage";
import { Btn, Inp } from "./UI";

const ADMIN_PW = "nper2025admin";
const FREE_GUEST  = 5;
const FREE_MEMBER = 20;

export default function AdminPage({ C }) {
  const [pw, setPw]         = useState("");
  const [auth, setAuth]     = useState(false);
  const [tab, setTab]       = useState("posts");
  const [posts, setPosts2]  = useState(getPosts());

  const deletePost = (id) => {
    const updated = getPosts().filter(p => p.id !== id);
    setPosts(updated); setPosts2(updated);
  };
  const grantPoints = (email, pts) => {
    const ms      = getMembers();
    const updated = ms.map(m => m.email === email ? { ...m, points: (m.points || 0) + pts } : m);
    saveMembers(updated);
    alert(email + "에게 " + pts + " 포인트 지급했습니다.");
  };

  if (!auth) return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
      <div style={{
        background: C.card, border: "1px solid " + C.border,
        borderRadius: 20, padding: "36px 32px", boxShadow: C.shadow,
      }}>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 900, marginBottom: 20 }}>관리자 로그인</h2>
        <Inp C={C} type="password" placeholder="관리자 비밀번호" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && pw === ADMIN_PW) setAuth(true); }}
          style={{ marginBottom: 12 }} />
        <Btn C={C} onClick={() => { if (pw === ADMIN_PW) setAuth(true); }} full>확인</Btn>
      </div>
    </div>
  );

  const mems = getMembers();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, marginBottom: 24 }}>관리자 페이지</h2>
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: C.toggleBg, borderRadius: 12, padding: 4, width: "fit-content",
      }}>
        {[["posts", "게시글 관리"], ["members", "회원 관리"], ["ai", "AI 사용 현황"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700,
            background: tab === t ? C.card : "transparent",
            color: tab === t ? C.purpleL : C.muted,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{l}</button>
        ))}
      </div>

      {tab === "posts" && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>총 {posts.length}개의 게시글</div>
          {posts.map(p => (
            <div key={p.id} style={{
              background: C.card, border: "1px solid " + C.border,
              borderRadius: 12, padding: "14px 18px", marginBottom: 8,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              boxShadow: C.shadow,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{p.nick} · {p.date}</div>
              </div>
              <button onClick={() => deletePost(p.id)} style={{
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                background: "rgba(229,62,62,0.08)", color: "#e53e3e", fontSize: 12, flexShrink: 0,
              }}>삭제</button>
            </div>
          ))}
        </div>
      )}

      {tab === "members" && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>총 {mems.length}명</div>
          {mems.map(m => (
            <div key={m.id} style={{
              background: C.card, border: "1px solid " + C.border,
              borderRadius: 12, padding: "14px 18px", marginBottom: 8, boxShadow: C.shadow,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{m.nick}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.email} · {m.points || 0}P</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[50, 100, 500].map(pts => (
                    <button key={pts} onClick={() => grantPoints(m.email, pts)} style={{
                      padding: "5px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer",
                      border: "1px solid rgba(124,106,255,0.25)",
                      background: "rgba(124,106,255,0.06)", color: C.purpleL, fontWeight: 600,
                    }}>+{pts}P</button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "ai" && (
        <div style={{
          background: C.card, border: "1px solid " + C.border,
          borderRadius: 14, padding: "20px 24px", boxShadow: C.shadow,
        }}>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 700, marginBottom: 12 }}>AI 사용 정책</div>
          {[
            { label: "비회원 무료 횟수", value: FREE_GUEST + "회" },
            { label: "회원 무료 횟수",   value: FREE_MEMBER + "회" },
            { label: "포인트 사용",       value: "10P = 1회" },
            { label: "포인트 적립 (글쓰기)", value: "1회당 10P" },
          ].map(r => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid " + C.border,
            }}>
              <span style={{ fontSize: 13, color: C.muted }}>{r.label}</span>
              <span style={{ fontSize: 13, color: C.purpleL, fontWeight: 700 }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
