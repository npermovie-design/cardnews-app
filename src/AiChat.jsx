import { useState, useRef, useEffect } from "react";
import { callAI } from "./aiClient";
import { useAiOnce, CHAT_COST, guestLimitExceeded, incrementGuestUsage } from "./storage";

/* ═══════════════════════════════════════════════════════
   AiChat — 다글로식 AI 채팅 인터페이스
═══════════════════════════════════════════════════════ */

const MODELS = [
  { id:"claude-haiku-4-5", label:"Claude Haiku", desc:"빠르고 효율적인 응답", badge:"기본", color:"#7c6aff", cost:5 },
  { id:"claude-sonnet-4-5", label:"Claude Sonnet", desc:"깊이 있는 분석과 창작", badge:"추천", color:"#7c6aff", cost:15 },
  { id:"gpt-4o-mini", label:"GPT-4o Mini", desc:"빠르고 가성비 좋은 모델", badge:"", color:"#10a37f", cost:5 },
  { id:"gpt-4o", label:"GPT-4o", desc:"OpenAI 최신 멀티모달 모델", badge:"고급", color:"#10a37f", cost:20 },
  { id:"gemini-2.5-flash", label:"Gemini 2.5 Flash", desc:"Google 초고속 응답 모델", badge:"", color:"#4285f4", cost:3 },
  { id:"gemini-2.5-pro", label:"Gemini 2.5 Pro", desc:"Google 고성능 추론 모델", badge:"고급", color:"#4285f4", cost:15 },
];

export default function AiChat({ isDark, user, theme, setAiMenu }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("claude-haiku-4-5");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_ai_chats") || "[]"); } catch { return []; }
  });
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  // 스크롤 하단 유지
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 홈에서 전달된 초기 질문 자동 전송
  useEffect(() => {
    const initQ = sessionStorage.getItem("nper_chat_init");
    const initModel = sessionStorage.getItem("nper_chat_model");
    if (initModel) { setModel(initModel); sessionStorage.removeItem("nper_chat_model"); }
    if (initQ) {
      sessionStorage.removeItem("nper_chat_init");
      setInput(initQ);
      // 약간 딜레이 후 자동 전송
      setTimeout(() => {
        setInput("");
        const userMsg = { role: "user", content: initQ };
        setMessages([userMsg]);
        setLoading(true);
        const systemPrompt = "당신은 SNS메이킷의 AI 어시스턴트입니다. SNS 콘텐츠 제작, 마케팅, 블로그 글쓰기, 디자인, 비즈니스에 대해 전문적이고 친절하게 답변합니다. 한국어로 답변하세요. 마크다운 형식으로 깔끔하게 정리해주세요.";
        callAI(model, [{ role: "user", content: systemPrompt }, { role: "user", content: initQ }], 2000)
          .then(response => { setMessages([userMsg, { role: "assistant", content: response }]); })
          .catch(e => { setMessages([userMsg, { role: "assistant", content: "오류: " + (e.message || "다시 시도해주세요") }]); })
          .finally(() => setLoading(false));
      }, 100);
    }
  }, []); // eslint-disable-line

  // 채팅 저장
  const saveChats = (list) => {
    try { localStorage.setItem("nper_ai_chats", JSON.stringify(list.slice(0, 50))); } catch {}
  };

  // 새 채팅
  const newChat = () => {
    if (messages.length > 0) {
      const title = messages[0]?.content?.slice(0, 30) || "새 채팅";
      const updated = [{ id: Date.now(), title, messages, date: new Date().toLocaleDateString() }, ...chats];
      setChats(updated);
      saveChats(updated);
    }
    setMessages([]);
    setChatId(null);
    inputRef.current?.focus();
  };

  // 이전 채팅 불러오기
  const loadChat = (chat) => {
    setChatId(chat.id);
    setMessages(chat.messages || []);
  };

  // 메시지 전송
  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    // 비회원: 5회 제한 체크
    if (!user) {
      if (guestLimitExceeded()) {
        alert("비회원 무료 체험 5회를 모두 사용했습니다. 회원가입하면 100P를 드려요!");
        return;
      }
      incrementGuestUsage();
    }

    setInput("");
    const userMsg = { role: "user", content: q };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    // 회원: 포인트 차감
    const chatCost = CHAT_COST[model] || -5;
    if (user) {
      try { await useAiOnce(user, null, chatCost, `AI 채팅 (${MODELS.find(m=>m.id===model)?.label||model})`); }
      catch { /* 포인트 부족해도 일단 진행 */ }
    }

    try {
      const ctx = newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const systemPrompt = "당신은 SNS메이킷의 AI 어시스턴트입니다. SNS 콘텐츠 제작, 마케팅, 블로그 글쓰기, 디자인, 비즈니스에 대해 전문적이고 친절하게 답변합니다. 한국어로 답변하세요. 마크다운 형식으로 깔끔하게 정리해주세요.";
      const response = await callAI(model, [
        { role: "user", content: systemPrompt },
        ...ctx,
      ], 2000);

      const aiMsg = { role: "assistant", content: response };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);

      // 항상 자동 저장
      const title = newMsgs[0]?.content?.slice(0, 30) || "채팅";
      if (chatId) {
        const updated = chats.map(c => c.id === chatId ? { ...c, messages: finalMsgs, title } : c);
        setChats(updated);
        saveChats(updated);
      } else {
        const newId = Date.now();
        setChatId(newId);
        const updated = [{ id: newId, title, messages: finalMsgs, date: new Date().toLocaleDateString(), model }, ...chats];
        setChats(updated);
        saveChats(updated);
      }
    } catch (e) {
      setMessages([...newMsgs, { role: "assistant", content: "오류가 발생했습니다: " + (e.message || "다시 시도해주세요.") }]);
    }
    setLoading(false);
  };

  // 간단 마크다운 렌더
  const renderMd = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 15, fontWeight: 800, margin: "14px 0 6px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 17, fontWeight: 800, margin: "18px 0 8px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 20, fontWeight: 900, margin: "20px 0 10px" }}>{line.slice(2)}</h1>;
      if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} style={{ marginLeft: 16, marginBottom: 3, lineHeight: 1.7 }}>{formatInline(line.slice(2))}</li>;
      if (line.match(/^\d+\. /)) return <li key={i} style={{ marginLeft: 16, marginBottom: 3, lineHeight: 1.7, listStyleType: "decimal" }}>{formatInline(line.replace(/^\d+\. /, ""))}</li>;
      if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: `1px solid ${bdr}`, margin: "12px 0" }} />;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} style={{ margin: "4px 0", lineHeight: 1.8 }}>{formatInline(line)}</p>;
    });
  };

  const formatInline = (t) => {
    // **bold** 처리
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        : p
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

      {/* 왼쪽: 채팅 목록 */}
      <div style={{ width: 200, background: isDark ? "rgba(0,0,0,0.2)" : "#fafafa", borderRight: `1px solid ${bdr}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px" }}>
          <button onClick={newChat}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", fontSize: 13, fontWeight: 700, color: text, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            새로운 채팅
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
          {chats.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 10px", fontSize: 12, color: muted }}>채팅 기록이 없습니다</div>
          )}
          {chats.map(chat => (
            <button key={chat.id} onClick={() => loadChat(chat)}
              style={{
                width: "100%", padding: "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: chatId === chat.id ? (isDark ? "rgba(124,106,255,0.2)" : "rgba(124,106,255,0.1)") : "transparent",
                color: chatId === chat.id ? accent : text,
                fontSize: 12, fontWeight: chatId === chat.id ? 700 : 500,
                textAlign: "left", marginBottom: 2, transition: "background 0.12s",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
              {chat.title}
            </button>
          ))}
        </div>
      </div>

      {/* 오른쪽: 채팅 영역 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* 빈 상태 — 다글로식 모델선택 + 프롬프트 카드 */}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 60, maxWidth: 600, margin: "0 auto" }}>

                {/* 모델 선택 */}
                <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
                  <button onClick={() => setShowModelPicker(!showModelPicker)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${bdr}`, background: cardBg, cursor: "pointer", fontSize: 13, fontWeight: 600, color: text }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: MODELS.find(m=>m.id===model)?.color||"#10b981" }} />
                    {MODELS.find(m => m.id === model)?.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {showModelPicker && (
                    <div style={{ position: "absolute", top: "110%", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: `1px solid ${bdr}`, padding: 8, zIndex: 10, minWidth: 240 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: muted, padding: "6px 10px" }}>AI 모델 선택</div>
                      {MODELS.map(m => (
                        <button key={m.id} onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: model === m.id ? "rgba(124,106,255,0.08)" : "transparent", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: model === m.id ? m.color : "#ddd", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{m.label} {m.badge && <span style={{ fontSize: 10, fontWeight: 600, color: accent, background: "rgba(124,106,255,0.1)", padding: "1px 6px", borderRadius: 6, marginLeft: 4 }}>{m.badge}</span>} <span style={{ fontSize: 10, color: muted, fontWeight: 500 }}>{m.cost}P/회</span></div>
                            <div style={{ fontSize: 11, color: muted }}>{m.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 타이틀 */}
                <div style={{ fontSize: 20, fontWeight: 800, color: text, marginBottom: 4, lineHeight: 1.5 }}>
                  SNS 콘텐츠, 무엇이든 도와드려요
                </div>
                <div style={{ fontSize: 13, color: muted, marginBottom: 28 }}>
                  마케팅 전략부터 글쓰기, 디자인 팁까지
                </div>

                {/* 프롬프트 카드 — 다글로 스타일 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "left" }}>
                  {[
                    { icon: "📊", title: "마케팅 전략", desc: "인스타그램 팔로워 늘리는 전략을 세워줘" },
                    { icon: "📝", title: "블로그 SEO", desc: "네이버 블로그 상위 노출 최적화 팁 알려줘" },
                    { icon: "🎨", title: "카드뉴스 기획", desc: "직장인 타겟 카드뉴스 주제 추천해줘" },
                    { icon: "💡", title: "콘텐츠 아이디어", desc: "이번 주 SNS 콘텐츠 계획 세워줘" },
                    { icon: "✍️", title: "카피라이팅", desc: "제품 상세페이지 매력적인 카피 써줘" },
                    { icon: "📈", title: "성과 분석", desc: "SNS 마케팅 KPI 지표 정리해줘" },
                  ].map((card, i) => (
                    <button key={i} onClick={() => { setInput(card.desc); }}
                      style={{ padding: "16px 14px", borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 6 }}>{card.icon} {card.title}</div>
                      <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{card.desc}</div>
                    </button>
                  ))}
                </div>

                {/* 도구 바로가기 */}
                {setAiMenu && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                    {[
                      { icon: "/icons3d/blog-write.png", label: "글쓰기", menu: "blog_write" },
                      { icon: "/icons3d/palette.png", label: "콘텐츠 제작", menu: "content_create" },
                      { icon: "/icons3d/instagram-cam.png", label: "이미지 생성", menu: "image_create" },
                      { icon: "/icons3d/report.png", label: "비즈니스 문서", menu: "prompt_studio" },
                    ].map(t => (
                      <button key={t.menu} onClick={() => setAiMenu(t.menu)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", fontSize: 12, fontWeight: 600, color: text, transition: "all 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "#f5f5ff"}
                        onMouseLeave={e => e.currentTarget.style.background = cardBg}>
                        <img src={t.icon} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} /> {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 대화 메시지 */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "80%", padding: "12px 16px", borderRadius: "16px 16px 4px 16px",
                      background: accent, color: "#fff", fontSize: 14, lineHeight: 1.7,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6aff,#ec4899)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      fontSize: 14, color: "#fff", fontWeight: 800,
                    }}>AI</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        padding: "14px 18px", borderRadius: "4px 16px 16px 16px",
                        background: isDark ? "rgba(255,255,255,0.06)" : "#f8f8fb",
                        fontSize: 14, color: text, lineHeight: 1.8,
                      }}>
                        {renderMd(msg.content)}
                      </div>
                      {/* 다른 기능으로 넘기기 */}
                      {i === messages.length - 1 && !loading && setAiMenu && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          {[
                            { label: "블로그 글쓰기", menu: "blog_write", icon: "📝" },
                            { label: "카드뉴스 만들기", menu: "content_create", icon: "🎨" },
                            { label: "복사", action: "copy", icon: "📋" },
                          ].map(btn => (
                            <button key={btn.label} onClick={() => {
                              if (btn.action === "copy") {
                                try { navigator.clipboard.writeText(msg.content); } catch {}
                                return;
                              }
                              // 내용을 sessionStorage에 저장하고 해당 기능으로 이동
                              sessionStorage.setItem("nper_ai_content", msg.content);
                              setAiMenu(btn.menu);
                            }}
                              style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: cardBg, cursor: "pointer", fontSize: 11, fontWeight: 600, color: text, display: "flex", alignItems: "center", gap: 4 }}>
                              {btn.icon} {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 로딩 */}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, color: "#fff", fontWeight: 800 }}>AI</div>
                <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: isDark ? "rgba(255,255,255,0.06)" : "#f8f8fb" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(n => (
                      <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: accent, opacity: 0.4, animation: `dotPulse 1.2s ease-in-out ${n * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* 입력 영역 */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "12px 20px", background: isDark ? "rgba(0,0,0,0.1)" : "#fff" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 10,
              padding: "10px 14px", borderRadius: 14,
              border: `1.5px solid ${bdr}`, background: cardBg,
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="궁금한 내용을 질문해 보세요"
                rows={1}
                style={{
                  flex: 1, border: "none", outline: "none", fontSize: 14, color: text,
                  background: "transparent", resize: "none", fontFamily: "inherit",
                  lineHeight: 1.6, maxHeight: 120, minHeight: 24, boxSizing: "border-box",
                }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? accent : "#e5e7eb",
                  color: "#fff", cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  );
}
