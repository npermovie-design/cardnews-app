import { useState, useEffect, useRef } from "react";
import { supabase } from "./storage";
import SnsConnectionManager from "./SnsConnectionManager";

/* ════════════════════════════════════════════════════════════
   AI Instagram 모듈 - 자동 DM / 자동 댓글
════════════════════════════════════════════════════════════ */

function TabHeader({ title, subtitle, tabs, activeTab, onTabChange, isDark }) {
  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const accent = "#7c6aff";
  return (
    <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)" }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"16px 24px 0" }}>
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:3 }}>{title}</div>
          <div style={{ fontSize:12, color:muted }}>{subtitle}</div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:2, borderBottom:`1px solid ${bdr}`, flexWrap:"wrap" }}>
          {tabs.map(t => {
            if (t.separator) {
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:4, padding:"9px 8px 9px 14px", marginBottom:-1, borderLeft:`1px solid ${bdr}`, marginLeft:4 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:muted, letterSpacing:0.5, whiteSpace:"nowrap" }}>{t.label}</span>
                </div>
              );
            }
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                style={{
                  padding:"9px 16px", border:"none", cursor:"pointer",
                  background:"transparent",
                  color: active ? accent : muted, fontSize:13, fontWeight: active ? 700 : 400,
                  borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                  transition: "all 0.15s", marginBottom:-1,
                  display:"flex", alignItems:"center", gap:5,
                }}>
                {t.icon && <img src={t.icon} alt="" style={{ width:16, height:16, borderRadius:3, objectFit:"contain", opacity: active ? 1 : 0.5 }} />}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── DM 입력 필드 (컴포넌트 바깥 정의 — 리렌더 시 포커스 유지) ── */
function DmInputField({ label, value, onChange, placeholder, multiline, hint, styles }) {
  const { bdr, inputBg, text, muted } = styles;
  const baseStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 4 }}>{label}</div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ ...baseStyle, resize: "vertical", minHeight: 70 }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={baseStyle} />
      )}
      {hint && <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/* ── 스레드 자동 대댓글 컴포넌트 ── */
function InstaAutoReply({ isDark, user, onUserUpdate, navigate }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#000";

  const [instaConnected, setInstaConnected] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewTab, setViewTab] = useState("posts");

  const [form, setForm] = useState({
    enabled: true, triggerKeywords: "",
    replyMessage: "", replyLink: "",
  });

  // 기본 대댓글 템플릿
  const REPLY_TEMPLATES = [
    { id: "link", label: "링크 안내", msg: "자세한 내용은 프로필 링크에서 확인해보세요!" },
    { id: "thanks", label: "감사 인사", msg: "댓글 감사합니다! DM으로 자세한 내용 보내드릴게요." },
    { id: "info", label: "정보 안내", msg: "궁금하신 내용은 DM으로 문의해주세요!" },
    { id: "custom", label: "직접 입력", msg: "" },
  ];
  const [selectedTemplate, setSelectedTemplate] = useState("link");

  // 1) 스레드 연동 확인
  useEffect(() => {
    if (!user?.uid) { setInstaConnected(false); return; }
    (async () => {
      try {
        const r = await fetch(`/api/sns-connections?uid=${user.uid}`);
        const data = await r.json();
        const th = (data.connections || []).find(c => c.platform === "threads");
        setInstaConnected(th ? { username: th.username || th.account_name || th.platform_username || "Threads" } : false);
      } catch (e) { setInstaConnected(false); }
    })();
  }, [user?.uid]);

  // 2) 스레드 게시물 + 캠페인 로드
  useEffect(() => {
    if (!user?.uid || !instaConnected) return;
    setMediaLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/threads-media?uid=${user.uid}`);
        const data = await r.json();
        setMedia(data.media || []);
      } catch (e) {}
      setMediaLoading(false);
    })();
    setCampaignsLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/insta-auto-reply", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list_campaigns", uid: user.uid }),
        });
        const data = await r.json();
        setCampaigns(data.campaigns || []);
      } catch (e) {}
      setCampaignsLoading(false);
    })();
  }, [user?.uid, instaConnected]);

  const startConnect = async () => {
    if (!user?.uid) return;
    setConnectLoading(true);
    try {
      const r = await fetch(`/api/sns-auth-meta?uid=${user.uid}&platform=threads`);
      const data = await r.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else alert(data.error || "인증 URL을 가져올 수 없습니다.");
    } catch (e) { alert("연동 오류: " + e.message); }
    setConnectLoading(false);
  };

  const selectPost = (post) => {
    if (selectedPost?.id === post.id) { setSelectedPost(null); return; }
    setSelectedPost(post);
    const existing = campaigns.find(c => c.post_url === post.permalink);
    if (existing) {
      setForm({
        enabled: existing.is_active !== false,
        triggerKeywords: (existing.trigger_keywords || []).join(", "),
        replyMessage: existing.reply_message || "",
        replyLink: existing.reply_link || "",
      });
    } else {
      const tpl = REPLY_TEMPLATES.find(t => t.id === selectedTemplate);
      setForm({ enabled: true, triggerKeywords: "", replyMessage: tpl?.msg || "", replyLink: "" });
    }
  };

  const postHasCampaign = (permalink) => campaigns.some(c => c.post_url === permalink);

  const saveCampaign = async () => {
    if (!user?.uid || !selectedPost || !form.replyMessage.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/insta-auto-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign", uid: user.uid,
          campaign: {
            name: (selectedPost.caption || "게시물").substring(0, 40),
            postUrl: selectedPost.permalink,
            mediaId: selectedPost.id,
            triggerKeywords: form.triggerKeywords.split(",").map(s => s.trim()).filter(Boolean),
            replyMessage: form.replyMessage,
            replyLink: form.replyLink,
            isActive: form.enabled,
          },
        }),
      });
      const data = await r.json();
      if (data.campaign) {
        setCampaigns(prev => {
          const idx = prev.findIndex(c => c.post_url === selectedPost.permalink);
          if (idx >= 0) { const n = [...prev]; n[idx] = data.campaign; return n; }
          return [data.campaign, ...prev];
        });
      }
      setSelectedPost(null);
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const toggleCampaign = async (id, isActive) => {
    try {
      await fetch("/api/insta-auto-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_campaign", uid: user.uid, campaignId: id, isActive }),
      });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c));
    } catch (e) {}
  };

  const deleteCampaign = async (id) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return;
    try {
      await fetch("/api/insta-auto-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_campaign", uid: user.uid, campaignId: id }),
      });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e) {}
  };

  // 로그인 필요
  if (!user) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>로그인이 필요합니다</div>
      <div style={{ fontSize: 13, color: muted }}>스레드 자동 댓글을 사용하려면 먼저 로그인해주세요.</div>
    </div>
  );

  if (instaConnected === null) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: muted }}>Threads 연동 상태 확인 중...</div>
    </div>
  );

  if (instaConnected === false) return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg,${accent},#333)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <img src="/icon-threads.png" alt="Threads" style={{ width: 40, height: 40, filter: "brightness(10)" }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>Threads 계정을 연동하세요</div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
          Threads 계정을 연동하면<br/>댓글에 자동으로 대댓글을 달 수 있습니다.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 32, textAlign: "left" }}>
          {[
            { icon: "📝", title: "게시물 선택", desc: "URL 입력 없이 게시물을 바로 선택" },
            { icon: "🔍", title: "키워드 감지", desc: "댓글에 특정 키워드가 달리면 즉시 감지" },
            { icon: "💬", title: "자동 대댓글", desc: "원하는 메시지로 자동 답글" },
            { icon: "🔗", title: "링크 전달", desc: "대댓글에 원하는 링크 포함" },
          ].map((b, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
        <button onClick={startConnect} disabled={connectLoading}
          style={{ padding: "14px 40px", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${accent},#333)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: connectLoading ? "wait" : "pointer", opacity: connectLoading ? 0.6 : 1, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {connectLoading ? "연동 중..." : "Threads 연동하기"}
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: muted }}>Meta 공식 인증을 통해 안전하게 연동됩니다</div>
      </div>
    </div>
  );

  const activeCampaigns = campaigns.filter(c => c.is_active);

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: text }}>스레드 자동 대댓글</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>스레드 댓글 키워드 감지 → 자동 대댓글 + 링크 전송</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${accent}15`, border: `1px solid ${accent}30` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>@{instaConnected.username}</span>
        </div>
      </div>

      {/* 작동 원리 */}
      <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "📝", title: "게시물 선택", desc: "내 게시물에서 바로 선택" },
          { icon: "🔍", title: "키워드 감지", desc: "특정 키워드 댓글 감지" },
          { icon: "💬", title: "자동 대댓글", desc: "원하는 메시지로 답글" },
          { icon: "🔗", title: "링크 전송", desc: "대댓글에 링크 포함" },
        ].map((f, i) => (
          <div key={i} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: text, marginBottom: 2 }}>{f.title}</div>
            <div style={{ fontSize: 9, color: muted }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 12, overflow: "hidden", border: `1px solid ${bdr}` }}>
        {[
          { id: "posts", label: "내 게시물", count: media.length },
          { id: "campaigns", label: "활성 규칙", count: activeCampaigns.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setViewTab(tab.id); setSelectedPost(null); }}
            style={{ flex: 1, padding: "11px 0", border: "none", background: viewTab === tab.id ? accent : "transparent", color: viewTab === tab.id ? "#fff" : muted, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
            {tab.label} {tab.count > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* 게시물 탭 */}
      {viewTab === "posts" && (
        <>
          {mediaLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: muted }}>게시물 불러오는 중...</div>
            </div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>스레드 게시물이 없습니다</div>
              <div style={{ fontSize: 13, color: muted }}>Threads에 게시물을 올리면 여기에 표시됩니다.</div>
            </div>
          ) : (
            <>
              {/* 스레드 게시물은 텍스트 기반이므로 카드형 리스트로 표시 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: selectedPost ? 0 : 20 }}>
                {media.map(post => {
                  const isSelected = selectedPost?.id === post.id;
                  const hasCampaign = postHasCampaign(post.permalink);
                  return (
                    <div key={post.id} onClick={() => selectPost(post)}
                      style={{ padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                        border: isSelected ? `2px solid ${accent}` : hasCampaign ? "2px solid #22c55e" : `1px solid ${bdr}`,
                        background: isSelected ? (D ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)") : cardBg, transition: "all 0.2s",
                        display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {post.thumbnail_url || post.media_url ? (
                        <img src={post.thumbnail_url || post.media_url} alt=""
                          style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: D ? "rgba(255,255,255,0.06)" : "#f0f0f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <img src="/icon-threads.png" alt="" style={{ width: 24, height: 24, opacity: 0.5 }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: text, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {post.caption || "(내용 없음)"}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                          {post.timestamp && <span style={{ fontSize: 10, color: muted }}>{new Date(post.timestamp).toLocaleDateString("ko-KR")}</span>}
                          {post.like_count != null && <span style={{ fontSize: 10, color: muted }}>❤️ {post.like_count}</span>}
                        </div>
                      </div>
                      {hasCampaign && (
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 선택된 게시물 대댓글 설정 */}
              {selectedPost && (
                <div style={{ marginTop: 12, padding: 20, borderRadius: 16, border: `1px solid ${accent}30`, background: D ? "rgba(124,106,255,0.04)" : "rgba(124,106,255,0.02)" }}>
                  {/* 미리보기 */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
                    <img src={selectedPost.thumbnail_url || selectedPost.media_url} alt=""
                      style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(selectedPost.caption || "캡션 없음").substring(0, 60)}
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>
                        {selectedPost.timestamp ? new Date(selectedPost.timestamp).toLocaleDateString("ko-KR") : ""}
                        {selectedPost.like_count != null && ` · ❤️ ${selectedPost.like_count}`}
                        {selectedPost.comments_count != null && ` · 💬 ${selectedPost.comments_count}`}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPost(null)}
                      style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>✕</button>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 14 }}>자동 대댓글 설정</div>

                  {/* 활성 토글 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>자동 대댓글 발송</div>
                    <div onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                      style={{ width: 44, height: 24, borderRadius: 12, background: form.enabled ? "#22c55e" : (D ? "rgba(255,255,255,0.15)" : "#ddd"), cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.enabled ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>

                  {/* 트리거 키워드 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>트리거 키워드</div>
                    <input type="text" value={form.triggerKeywords} onChange={e => setForm(f => ({ ...f, triggerKeywords: e.target.value }))}
                      placeholder="정보, 링크, 궁금, 가격"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>쉼표로 구분. 이 키워드가 포함된 댓글에 자동 대댓글. 비우면 모든 댓글에 반응</div>
                  </div>

                  {/* 대댓글 링크 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>대댓글 링크 (선택)</div>
                    <input type="text" value={form.replyLink} onChange={e => setForm(f => ({ ...f, replyLink: e.target.value }))}
                      placeholder="https://your-link.com"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>대댓글 메시지 끝에 포함될 링크</div>
                  </div>

                  {/* 템플릿 선택 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>대댓글 템플릿</div>
                    <div className="ai-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
                      {REPLY_TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => { setSelectedTemplate(t.id); if (t.msg) setForm(f => ({ ...f, replyMessage: t.msg })); }}
                          style={{ padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${selectedTemplate === t.id ? accent : bdr}`,
                            background: selectedTemplate === t.id ? `${accent}15` : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                          <div style={{ fontSize: 12, fontWeight: selectedTemplate === t.id ? 800 : 500, color: selectedTemplate === t.id ? accent : text }}>{t.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 대댓글 메시지 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>대댓글 메시지</div>
                    <textarea value={form.replyMessage} onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))}
                      placeholder="자동으로 달릴 대댓글 내용을 입력해주세요"
                      style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>

                  {/* 미리보기 */}
                  {form.replyMessage && (
                    <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: D ? "rgba(255,255,255,0.03)" : "#f8f8fc", border: `1px solid ${bdr}` }}>
                      <div style={{ fontSize: 10, color: muted, marginBottom: 6 }}>대댓글 미리보기</div>
                      <div style={{ fontSize: 12, color: text, lineHeight: 1.6 }}>
                        @사용자 {form.replyMessage}{form.replyLink ? ` ${form.replyLink}` : ""}
                      </div>
                    </div>
                  )}

                  <button onClick={saveCampaign} disabled={saving || !form.replyMessage.trim()}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${accent},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: (saving || !form.replyMessage.trim()) ? 0.5 : 1 }}>
                    {saving ? "저장 중..." : postHasCampaign(selectedPost.permalink) ? "규칙 업데이트" : "대댓글 규칙 저장"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* 활성 규칙 탭 */}
      {viewTab === "campaigns" && (
        <>
          {campaignsLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>아직 규칙이 없어요</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.7 }}>
                "내 게시물" 탭에서 게시물을 선택하고<br/>자동 대댓글 규칙을 설정해보세요.
              </div>
              <button onClick={() => setViewTab("posts")}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${accent},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                게시물 선택하러 가기
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ padding: 16, borderRadius: 14, border: `1px solid ${c.is_active ? accent + "40" : bdr}`, background: c.is_active ? (D ? accent + "08" : accent + "03") : cardBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.is_active ? "#22c55e" : "#888" }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleCampaign(c.id, !c.is_active)}
                        style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: c.is_active ? "#ef4444" : "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {c.is_active ? "중지" : "활성화"}
                      </button>
                      <button onClick={() => deleteCampaign(c.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>삭제</button>
                    </div>
                  </div>
                  {c.trigger_keywords?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {c.trigger_keywords.map((kw, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: 6, background: accent + "15", color: accent, fontSize: 10, fontWeight: 600 }}>{kw}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: muted }}>💬 대댓글: {(c.reply_message || "").substring(0, 60)}...</div>
                  {c.reply_count > 0 && <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginTop: 4 }}>✅ {c.reply_count}건 답글됨</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div style={{ marginTop: 24, padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>📋 이용 안내</div>
        <div style={{ fontSize: 11, color: muted, lineHeight: 1.8 }}>
          • 연동된 Threads 계정의 게시물에 달린 댓글에 자동 대댓글을 답니다<br/>
          • 키워드를 설정하면 해당 키워드가 포함된 댓글에만 대댓글이 달립니다<br/>
          • 동일 사용자에게 중복 대댓글은 발송되지 않습니다<br/>
          • Threads API 정책에 따라 일일 발송 제한이 있을 수 있습니다
        </div>
      </div>
    </div>
  );
}

/* ── 인스타 자동DM 컴포넌트 ── */
function InstaAutoDM({ isDark, user, onUserUpdate, navigate }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#E1306C";

  // 연동 상태
  const [instaConnected, setInstaConnected] = useState(null); // null=loading, false, object{username}
  const [connectLoading, setConnectLoading] = useState(false);

  // 미디어 & 캠페인
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // 선택된 게시물 DM 설정
  const [selectedPost, setSelectedPost] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // 게시물별 DM 폼
  const [form, setForm] = useState({
    enabled: true, triggerKeywords: "",
    dmMessageFollower: "", dmMessageNonFollower: "", dmLink: "",
  });

  // 톤/말투 선택
  const [selectedTone, setSelectedTone] = useState("friendly");
  const TONE_OPTIONS = [
    { id: "friendly", label: "친근한", desc: "반말/이모지 활용" },
    { id: "professional", label: "전문적", desc: "존댓말/비즈니스" },
    { id: "cute", label: "귀여운", desc: "애교/이모지 많이" },
    { id: "casual", label: "캐주얼", desc: "편한 대화체" },
    { id: "luxury", label: "고급스러운", desc: "품격있는 톤" },
    { id: "energetic", label: "에너지틱", desc: "열정적/활발" },
  ];

  // 기본 메시지 템플릿
  const DEFAULT_TEMPLATES = {
    friendly: {
      follower: "안녕하세요! 댓글 남겨주셔서 감사해요 🙏✨ 관심 가져주셔서 너무 기뻐요! 자세한 내용은 아래 링크에서 확인해보세요 👇",
      nonFollower: "반가워요! 댓글 감사합니다 😊 저희 계정을 팔로우하시면 더 많은 유용한 콘텐츠를 받아보실 수 있어요! 자세한 내용은 여기서 확인해주세요 👇",
    },
    professional: {
      follower: "안녕하세요, 댓글 감사드립니다. 관심 가져주신 내용에 대해 자세한 정보를 안내드립니다. 아래 링크를 참고해 주세요.",
      nonFollower: "안녕하세요, 관심 가져주셔서 감사합니다. 더 많은 정보와 콘텐츠를 원하시면 팔로우 부탁드립니다. 자세한 내용은 아래 링크를 확인해 주세요.",
    },
    cute: {
      follower: "헤이~ 댓글 남겨줘서 고마워요 💕🥰 역시 우리 팔로워님! 궁금한 거 있으면 언제든 물어봐요~ 링크 보내드릴게요 💌",
      nonFollower: "어머~ 댓글 감사해용 💗 팔로우하면 더 재밌는 콘텐츠가 가득해요! 일단 이거부터 확인해보세용~ ✨",
    },
    casual: {
      follower: "댓글 감사해요! 관련 내용 공유드릴게요. 링크 확인해보세요 👍",
      nonFollower: "관심 가져주셔서 감사해요! 팔로우하시면 더 좋은 정보 받으실 수 있어요. 일단 여기서 확인해보세요!",
    },
    luxury: {
      follower: "소중한 관심에 진심으로 감사드립니다. 보다 상세한 안내를 위해 아래 정보를 공유드립니다.",
      nonFollower: "관심 가져주셔서 영광입니다. 앞으로도 가치 있는 콘텐츠를 전달드리겠습니다. 팔로우와 함께 아래 내용을 확인해 주세요.",
    },
    energetic: {
      follower: "와!! 댓글 감사합니다!! 🔥🔥 바로 정보 공유드릴게요!! 지금 바로 확인하세요!! 💪✨",
      nonFollower: "오!! 관심 감사합니다!! 🎉 팔로우하시면 매일 핫한 콘텐츠 업데이트!! 일단 이것부터 확인!! 🚀",
    },
  };

  // 뷰 탭: "posts" | "campaigns" | "logs"
  const [viewTab, setViewTab] = useState("posts");

  // DM 발송 로그
  const [dmLogs, setDmLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 1) 인스타 연동 확인
  useEffect(() => {
    if (!user?.uid) { setInstaConnected(false); return; }
    (async () => {
      try {
        const r = await fetch(`/api/sns-connections?uid=${user.uid}`);
        const data = await r.json();
        const ig = (data.connections || []).find(c => c.platform === "instagram");
        setInstaConnected(ig ? { username: ig.username || ig.account_name || ig.platform_username || "Instagram" } : false);
      } catch (e) {
        console.error("SNS connection check error:", e);
        setInstaConnected(false);
      }
    })();
  }, [user?.uid]);

  // 2) 연동 후: 미디어 + 캠페인 로드
  useEffect(() => {
    if (!user?.uid || !instaConnected) return;
    // 미디어 로드
    setMediaLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/insta-media?uid=${user.uid}`);
        const data = await r.json();
        setMedia(data.media || []);
      } catch (e) { console.error("Media load error:", e); }
      setMediaLoading(false);
    })();
    // 캠페인 로드
    setCampaignsLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/insta-auto-dm", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list_campaigns", uid: user.uid }),
        });
        const data = await r.json();
        setCampaigns(data.campaigns || []);
      } catch (e) { console.error("Campaign load error:", e); }
      setCampaignsLoading(false);
    })();
  }, [user?.uid, instaConnected]);

  // 인스타 연동 시작
  const startConnect = async () => {
    if (!user?.uid) return;
    setConnectLoading(true);
    try {
      const r = await fetch(`/api/sns-auth-meta?uid=${user.uid}&platform=instagram`);
      const data = await r.json();
      if (data.authUrl) window.location.href = data.authUrl;
      else alert(data.error || "인증 URL을 가져올 수 없습니다.");
    } catch (e) { alert("연동 오류: " + e.message); }
    setConnectLoading(false);
  };

  // 게시물 선택 → 폼 초기화 (기존 캠페인 있으면 불러옴)
  const selectPost = (post) => {
    if (selectedPost?.id === post.id) { setSelectedPost(null); return; }
    setSelectedPost(post);
    const existing = campaigns.find(c => c.post_url === post.permalink);
    if (existing) {
      setForm({
        enabled: existing.is_active !== false,
        triggerKeywords: (existing.trigger_keywords || []).join(", "),
        dmMessageFollower: existing.dm_message_follower || "",
        dmMessageNonFollower: existing.dm_message_non_follower || "",
        dmLink: existing.dm_link || "",
      });
    } else {
      // 새 캠페인: 선택된 톤의 기본 템플릿 자동 적용
      const template = DEFAULT_TEMPLATES[selectedTone] || DEFAULT_TEMPLATES.friendly;
      setForm({
        enabled: true, triggerKeywords: "",
        dmMessageFollower: template.follower,
        dmMessageNonFollower: template.nonFollower,
        dmLink: "",
      });
    }
  };

  // 기본 템플릿 자동 적용
  const applyDefaultTemplate = (toneId) => {
    const template = DEFAULT_TEMPLATES[toneId];
    if (template) {
      setForm(f => ({
        ...f,
        dmMessageFollower: template.follower,
        dmMessageNonFollower: template.nonFollower,
      }));
    }
  };

  // AI DM 메시지 생성 (선택된 톤 반영)
  const generateDM = async () => {
    if (!selectedPost) return;
    setGenerating(true);
    const toneLabel = TONE_OPTIONS.find(t => t.id === selectedTone)?.label || "친근한";
    try {
      const r = await fetch("/api/insta-auto-dm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_dm", category: (selectedPost.caption || "").substring(0, 100), tone: toneLabel, goal: "팔로우 유도 + 링크 클릭" }),
      });
      const data = await r.json();
      if (data.followerMessage) setForm(f => ({ ...f, dmMessageFollower: data.followerMessage, dmMessageNonFollower: data.nonFollowerMessage || "" }));
    } catch (e) { console.error("Generate error:", e); }
    setGenerating(false);
  };

  // DM 발송 로그 조회
  const loadDmLogs = async () => {
    if (!user?.uid) return;
    setLogsLoading(true);
    try {
      const r = await fetch("/api/insta-auto-dm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_logs", uid: user.uid }),
      });
      const data = await r.json();
      setDmLogs(data.logs || []);
    } catch (e) { console.error("Log load error:", e); }
    setLogsLoading(false);
  };

  // 캠페인 저장 (게시물 기반)
  const saveCampaign = async () => {
    if (!user?.uid || !selectedPost || !form.dmMessageFollower.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/insta-auto-dm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign", uid: user.uid,
          campaign: {
            name: (selectedPost.caption || "게시물").substring(0, 40),
            postUrl: selectedPost.permalink,
            triggerKeywords: form.triggerKeywords.split(",").map(s => s.trim()).filter(Boolean),
            dmMessageFollower: form.dmMessageFollower,
            dmMessageNonFollower: form.dmMessageNonFollower,
            dmLink: form.dmLink, isActive: form.enabled,
          },
        }),
      });
      const data = await r.json();
      if (data.campaign) {
        setCampaigns(prev => {
          const idx = prev.findIndex(c => c.post_url === selectedPost.permalink);
          if (idx >= 0) { const n = [...prev]; n[idx] = data.campaign; return n; }
          return [data.campaign, ...prev];
        });
      }
      setSelectedPost(null);
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  // 캠페인 토글
  const toggleCampaign = async (id, isActive) => {
    try {
      await fetch("/api/insta-auto-dm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_campaign", uid: user.uid, campaignId: id, isActive }),
      });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: isActive } : c));
    } catch (e) { console.error(e); }
  };

  // 캠페인 삭제
  const deleteCampaign = async (id) => {
    if (!confirm("이 캠페인을 삭제하시겠습니까?")) return;
    try {
      await fetch("/api/insta-auto-dm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_campaign", uid: user.uid, campaignId: id }),
      });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  // 게시물에 캠페인 존재 여부
  const postHasCampaign = (permalink) => campaigns.some(c => c.post_url === permalink);

  // InputField는 컴포넌트 바깥(DmInputField)으로 이동됨 — 여기서는 스타일만 전달
  const fieldStyles = { bdr, inputBg, text, muted };

  // ── 로그인 필요 ──
  if (!user) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>로그인이 필요합니다</div>
      <div style={{ fontSize: 13, color: muted }}>인스타 자동DM을 사용하려면 먼저 로그인해주세요.</div>
    </div>
  );

  // ── 연동 확인 로딩 ──
  if (instaConnected === null) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: muted }}>Instagram 연동 상태 확인 중...</div>
    </div>
  );

  // ── 미연동: 연동 안내 ──
  if (instaConnected === false) return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg,${accent},#c13584,#833ab4)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>
          📩
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>Instagram 계정을 연동하세요</div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
          Instagram 비즈니스/크리에이터 계정을 연동하면<br/>게시물 댓글 키워드 감지 + 자동 DM 발송이 가능합니다.
        </div>

        {/* 혜택 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 32, textAlign: "left" }}>
          {[
            { icon: "📊", title: "내 게시물 연동", desc: "URL 입력 없이 게시물을 바로 선택" },
            { icon: "🔍", title: "키워드 자동 감지", desc: "댓글에 특정 키워드가 달리면 즉시 감지" },
            { icon: "📩", title: "자동 DM 발송", desc: "팔로워/비팔로워 맞춤 메시지 전송" },
            { icon: "📈", title: "성과 추적", desc: "발송 수, 클릭률 등 실시간 확인" },
          ].map((b, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        <button onClick={startConnect} disabled={connectLoading}
          style={{ padding: "14px 40px", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${accent},#c13584)`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: connectLoading ? "wait" : "pointer", opacity: connectLoading ? 0.6 : 1, boxShadow: "0 4px 20px rgba(225,48,108,0.3)" }}>
          {connectLoading ? "연동 중..." : "Instagram 연동하기"}
        </button>

        <div style={{ marginTop: 16, fontSize: 11, color: muted }}>
          Meta 공식 인증을 통해 안전하게 연동됩니다
        </div>
      </div>
    </div>
  );

  // ── 연동 완료: 메인 UI ──
  const activeCampaigns = campaigns.filter(c => c.is_active);

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      {/* 헤더 + 연동 계정 배지 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: text }}>인스타 자동DM</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>댓글 키워드 감지 → 자동 DM 발송</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${accent}15`, border: `1px solid ${accent}30` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>@{instaConnected.username}</span>
        </div>
      </div>

      {/* 작동 원리 */}
      <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "📝", title: "게시물 선택", desc: "내 게시물에서 바로 선택" },
          { icon: "🔍", title: "키워드 감지", desc: "특정 키워드 댓글 감지" },
          { icon: "📩", title: "자동 DM", desc: "팔로워/비팔로워 분기" },
          { icon: "🔗", title: "링크 전송", desc: "CTA 버튼 + 링크" },
        ].map((f, i) => (
          <div key={i} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: text, marginBottom: 2 }}>{f.title}</div>
            <div style={{ fontSize: 9, color: muted }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* 탭 전환: 내 게시물 / 활성 캠페인 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 12, overflow: "hidden", border: `1px solid ${bdr}` }}>
        {[
          { id: "posts", label: "내 게시물", count: media.length },
          { id: "campaigns", label: "활성 캠페인", count: activeCampaigns.length },
          { id: "logs", label: "발송 현황", count: 0 },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setViewTab(tab.id); setSelectedPost(null); if (tab.id === "logs") loadDmLogs(); }}
            style={{ flex: 1, padding: "11px 0", border: "none", background: viewTab === tab.id ? accent : "transparent", color: viewTab === tab.id ? "#fff" : muted, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
            {tab.label} {tab.count > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* ── 내 게시물 탭 ── */}
      {viewTab === "posts" && (
        <>
          {mediaLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: muted }}>게시물 불러오는 중...</div>
            </div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>게시물이 없습니다</div>
              <div style={{ fontSize: 13, color: muted }}>Instagram에 게시물을 올리면 여기에 표시됩니다.</div>
            </div>
          ) : (
            <>
              {/* 게시물 그리드 */}
              <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: selectedPost ? 0 : 20 }}>
                {media.map(post => {
                  const isSelected = selectedPost?.id === post.id;
                  const hasCampaign = postHasCampaign(post.permalink);
                  return (
                    <div key={post.id} onClick={() => selectPost(post)}
                      style={{ position: "relative", paddingBottom: "100%", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: isSelected ? `3px solid ${accent}` : hasCampaign ? "3px solid #22c55e" : `1px solid ${bdr}`, transition: "all 0.2s" }}>
                      <img src={post.thumbnail_url || post.media_url} alt=""
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      {/* 오버레이 */}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 6px", background: "linear-gradient(transparent,rgba(0,0,0,0.7))" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          {post.like_count != null && <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>❤️ {post.like_count}</span>}
                          {post.comments_count != null && <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>💬 {post.comments_count}</span>}
                        </div>
                      </div>
                      {/* 캠페인 활성 배지 */}
                      {hasCampaign && (
                        <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 선택된 게시물 DM 설정 패널 */}
              {selectedPost && (
                <div style={{ marginTop: 12, padding: 20, borderRadius: 16, border: `1px solid ${accent}30`, background: D ? "rgba(225,48,108,0.04)" : "rgba(225,48,108,0.02)" }}>
                  {/* 게시물 미리보기 */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
                    <img src={selectedPost.thumbnail_url || selectedPost.media_url} alt=""
                      style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(selectedPost.caption || "캡션 없음").substring(0, 60)}
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>
                        {selectedPost.timestamp ? new Date(selectedPost.timestamp).toLocaleDateString("ko-KR") : ""}
                        {selectedPost.like_count != null && ` · ❤️ ${selectedPost.like_count}`}
                        {selectedPost.comments_count != null && ` · 💬 ${selectedPost.comments_count}`}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPost(null)}
                      style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 14 }}>자동 DM 설정</div>

                  {/* 활성/비활성 토글 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>이 게시물 DM 자동 발송</div>
                    <div onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                      style={{ width: 44, height: 24, borderRadius: 12, background: form.enabled ? "#22c55e" : (D ? "rgba(255,255,255,0.15)" : "#ddd"), cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.enabled ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>

                  <DmInputField styles={fieldStyles} label="트리거 키워드" value={form.triggerKeywords} onChange={v => setForm(f => ({ ...f, triggerKeywords: v }))} placeholder="정보, 링크, 궁금, 가격" hint="쉼표로 구분. 이 키워드가 포함된 댓글에 자동 DM 발송. 비우면 모든 댓글에 반응" />
                  <DmInputField styles={fieldStyles} label="DM 링크 (CTA)" value={form.dmLink} onChange={v => setForm(f => ({ ...f, dmLink: v }))} placeholder="https://your-link.com" hint="DM에 포함될 링크" />

                  {/* 말투/톤 선택 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>말투 선택</div>
                    <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {TONE_OPTIONS.map(t => (
                        <button key={t.id} onClick={() => { setSelectedTone(t.id); applyDefaultTemplate(t.id); }}
                          style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${selectedTone === t.id ? accent : bdr}`,
                            background: selectedTone === t.id ? `${accent}15` : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                          <div style={{ fontSize: 12, fontWeight: selectedTone === t.id ? 800 : 500, color: selectedTone === t.id ? accent : text }}>{t.label}</div>
                          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DM 메시지 + AI 생성 */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>DM 메시지</div>
                    <button onClick={generateDM} disabled={generating}
                      style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: generating ? "wait" : "pointer", opacity: generating ? 0.6 : 1, minHeight: 30 }}>
                      {generating ? "AI 생성 중..." : "AI로 맞춤 메시지 생성"}
                    </button>
                    <button onClick={() => applyDefaultTemplate(selectedTone)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 30 }}>
                      기본 템플릿 적용
                    </button>
                  </div>
                  <DmInputField styles={fieldStyles} label="팔로워용 메시지" value={form.dmMessageFollower} onChange={v => setForm(f => ({ ...f, dmMessageFollower: v }))} placeholder="팔로워에게 보낼 감사 메시지" multiline />
                  <DmInputField styles={fieldStyles} label="비팔로워용 메시지" value={form.dmMessageNonFollower} onChange={v => setForm(f => ({ ...f, dmMessageNonFollower: v }))} placeholder="비팔로워에게 팔로우를 유도하는 메시지" multiline />

                  <button onClick={saveCampaign} disabled={saving || !form.dmMessageFollower.trim()}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${accent},#c13584)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: (saving || !form.dmMessageFollower.trim()) ? 0.5 : 1 }}>
                    {saving ? "저장 중..." : postHasCampaign(selectedPost.permalink) ? "캠페인 업데이트" : "캠페인 저장"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── 활성 캠페인 탭 ── */}
      {viewTab === "campaigns" && (
        <>
          {campaignsLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: muted }}>캠페인 로딩 중...</div>
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>아직 캠페인이 없어요</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.7 }}>
                "내 게시물" 탭에서 게시물을 선택하고<br/>자동 DM 캠페인을 설정해보세요.
              </div>
              <button onClick={() => setViewTab("posts")}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${accent},#c13584)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                게시물 선택하러 가기
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ padding: 16, borderRadius: 14, border: `1px solid ${c.is_active ? accent + "40" : bdr}`, background: c.is_active ? (D ? accent + "08" : accent + "03") : cardBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.is_active ? "#22c55e" : "#888" }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => toggleCampaign(c.id, !c.is_active)}
                        style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: c.is_active ? "#ef4444" : "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {c.is_active ? "중지" : "활성화"}
                      </button>
                      <button onClick={() => deleteCampaign(c.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
                        삭제
                      </button>
                    </div>
                  </div>
                  {c.post_url && <div style={{ fontSize: 11, color: muted, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📌 {c.post_url}</div>}
                  {c.trigger_keywords?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {c.trigger_keywords.map((kw, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: 6, background: accent + "15", color: accent, fontSize: 10, fontWeight: 600 }}>{kw}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: muted }}>
                    📩 팔로워: {(c.dm_message_follower || "").substring(0, 50)}...
                  </div>
                  {c.dm_sent_count > 0 && <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginTop: 4 }}>✅ {c.dm_sent_count}건 발송됨</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 발송 현황 탭 ── */}
      {viewTab === "logs" && (
        <>
          {logsLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: muted }}>발송 로그 불러오는 중...</div>
            </div>
          ) : dmLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>발송 기록이 없습니다</div>
              <div style={{ fontSize: 13, color: muted }}>캠페인이 활성화되면 DM 발송 기록이 여기에 표시됩니다.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 통계 요약 */}
              <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{dmLogs.filter(l => l.sent_success).length}</div>
                  <div style={{ fontSize: 11, color: muted }}>발송 성공</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{dmLogs.filter(l => !l.sent_success).length}</div>
                  <div style={{ fontSize: 11, color: muted }}>발송 실패</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{dmLogs.length}</div>
                  <div style={{ fontSize: 11, color: muted }}>총 시도</div>
                </div>
              </div>

              {/* 로그 목록 */}
              {dmLogs.map((log, i) => (
                <div key={log.id || i} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: log.sent_success ? "#22c55e" : "#ef4444" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: text }}>@{log.commenter_username || "unknown"}</span>
                      {log.is_follower && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }}>팔로워</span>}
                    </div>
                    <span style={{ fontSize: 10, color: muted }}>{log.created_at ? new Date(log.created_at).toLocaleString("ko-KR") : ""}</span>
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                    💬 댓글: {(log.comment_text || "").substring(0, 80)}
                  </div>
                  <div style={{ fontSize: 11, color: text }}>
                    📩 발송: {(log.message_sent || "").substring(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div style={{ marginTop: 24, padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", marginBottom: 6 }}>📋 이용 안내</div>
        <div style={{ fontSize: 11, color: muted, lineHeight: 1.8 }}>
          • Instagram 비즈니스/크리에이터 계정이 연결되어 있어야 합니다<br/>
          • Meta 앱 대시보드에서 Webhook을 설정해야 자동 DM이 작동합니다<br/>
          • Webhook URL: <span style={{ fontFamily: "monospace", fontSize: 10, color: accent }}>https://snsmakeit.com/api/insta-webhook</span><br/>
          • 인증 토큰: <span style={{ fontFamily: "monospace", fontSize: 10, color: accent }}>snsmakeit_webhook_2026</span><br/>
          • Instagram Messaging API 정책에 따라 24시간 내 대화만 가능합니다<br/>
          • 하루 발송 제한이 있으며, 스팸으로 감지되면 계정이 제한될 수 있습니다
        </div>
      </div>
    </div>
  );
}

/* MARKETING_TABS - insta_auto_reply, insta_auto_dm 숨김 처리 (미구현) */
const MARKETING_TABS = [
  { id: "sns_analysis",  label: "SNS 분석",      icon: "/icon-instagram.webp" },
  // { id: "insta_auto_reply", label: "스레드 자동댓글",  icon: "/icon-threads.png" },  // 미구현 - 숨김
  // { id: "insta_auto_dm", label: "인스타 자동DM", icon: "/icon-threads.png" },        // 미구현 - 숨김
];

export { TabHeader, DmInputField, InstaAutoReply, InstaAutoDM };
