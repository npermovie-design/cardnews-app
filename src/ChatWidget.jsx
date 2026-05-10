import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./storage";

const BRAND = "#3b82f6";

export default function ChatWidget({ user, C }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef(null);
  const isDark = C?.bg?.includes("0a") || C?.bg?.includes("#10") || C?.bg?.includes("242");

  // 대화방 로드 또는 생성
  const loadOrCreateConv = useCallback(async () => {
    if (!user?.uid) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_uid", user.uid)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setConvId(data[0].id);
      setUnread(data[0].unread_user || 0);
      return data[0].id;
    } else {
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ user_uid: user.uid, user_nick: user.nick || "", user_email: user.email || "" })
        .select()
        .single();
      if (newConv) {
        setConvId(newConv.id);
        return newConv.id;
      }
    }
    return null;
  }, [user]);

  // 메시지 로드
  const loadMessages = useCallback(async (cid) => {
    if (!cid) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    // 읽음 처리
    await supabase.from("chat_conversations").update({ unread_user: 0 }).eq("id", cid);
    setUnread(0);
  }, []);

  // 초기 로드
  useEffect(() => {
    if (!user?.uid) return;
    loadOrCreateConv().then(cid => { if (cid) loadMessages(cid); });
  }, [user, loadOrCreateConv, loadMessages]);

  // 실시간 구독
  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`chat-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_role === "admin") {
          if (open) {
            supabase.from("chat_conversations").update({ unread_user: 0 }).eq("id", convId);
          } else {
            setUnread(u => u + 1);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId, open]);

  // 스크롤
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // 메시지 전송
  const send = async () => {
    if (!input.trim() || !user?.uid) return;
    setLoading(true);
    let cid = convId;
    if (!cid) cid = await loadOrCreateConv();
    if (!cid) { setLoading(false); return; }

    const msg = input.trim();
    setInput("");
    await supabase.from("chat_messages").insert({
      conversation_id: cid,
      sender_uid: user.uid,
      sender_role: "user",
      message: msg,
    });
    await supabase.from("chat_conversations").update({
      last_message: msg,
      unread_admin: supabase.rpc ? 1 : 1,
      updated_at: new Date().toISOString(),
    }).eq("id", cid);
    // unread_admin 증가
    const { data: conv } = await supabase.from("chat_conversations").select("unread_admin").eq("id", cid).single();
    if (conv) await supabase.from("chat_conversations").update({ unread_admin: (conv.unread_admin || 0) + 1 }).eq("id", cid);
    setLoading(false);
  };

  // 열기
  const handleOpen = () => {
    setOpen(true);
    if (convId) {
      loadMessages(convId);
    }
  };

  const panelBg = isDark ? "#1a1830" : "#fff";
  const panelBdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "#f9fafb";

  // 로그인 안 된 상태면 숨김
  if (!user) return null;

  return (
    <>
      {/* 플로팅 버튼 */}
      {!open && (
        <button onClick={handleOpen}
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 9998,
            width: 52, height: 52, borderRadius: 99, border: "none",
            background: BRAND, color: "#fff", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          {unread > 0 && (
            <div style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unread}
            </div>
          )}
        </button>
      )}

      {/* 채팅 패널 */}
      {open && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9999,
          width: 360, height: 520, maxHeight: "80vh",
          borderRadius: 16, overflow: "hidden",
          background: panelBg, border: `1px solid ${panelBdr}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
          animation: "fadeIn 0.2s ease",
        }}>
          {/* 헤더 */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${panelBdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: BRAND }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>SNS메이킷 상담</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>보통 몇 분 내 답변드립니다</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* 메시지 영역 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>문의 사항을 남겨주세요</div>
                <div style={{ fontSize: 12 }}>운영 시간: 평일 09:00~18:00</div>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_role === "user";
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? BRAND : (isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"),
                    color: isMe ? "#fff" : (isDark ? "rgba(255,255,255,0.85)" : "#1a1a2e"),
                    fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                  }}>
                    {msg.message}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isMe ? "right" : "left" }}>
                      {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* 입력 영역 */}
          <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${panelBdr}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="메시지를 입력하세요..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${panelBdr}`, background: inputBg,
                  color: isDark ? "#fff" : "#1a1a2e", fontSize: 14,
                  outline: "none", fontFamily: "inherit",
                }}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: input.trim() ? BRAND : (isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb"),
                  color: "#fff", cursor: input.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
