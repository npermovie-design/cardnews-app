import { useState, useEffect, useRef } from "react";
import { supabase } from "./storage";
import SnsConnectionManager from "./SnsConnectionManager";
import { useI18n } from "./i18n";

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
  const { t } = useI18n();
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
    { id: "link", label: t("ig_tpl_link"), msg: t("ig_tpl_link_msg") },
    { id: "thanks", label: t("ig_tpl_thanks"), msg: t("ig_tpl_thanks_msg") },
    { id: "info", label: t("ig_tpl_info"), msg: t("ig_tpl_info_msg") },
    { id: "custom", label: t("ig_tpl_custom"), msg: "" },
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
      else alert(data.error || t("ig_auth_url_fail"));
    } catch (e) { alert(t("ig_connect_error") + e.message); }
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
      const tpl = REPLY_TEMPLATES.find(tp => tp.id === selectedTemplate);
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
            name: (selectedPost.caption || t("ig_post_fallback")).substring(0, 40),
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
    } catch (e) { alert(t("ig_save_fail") + e.message); }
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
    if (!confirm(t("ig_delete_rule_confirm"))) return;
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
      <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_login_required")}</div>
      <div style={{ fontSize: 13, color: muted }}>{t("ig_login_required_threads")}</div>
    </div>
  );

  if (instaConnected === null) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: muted }}>{t("ig_checking_threads")}</div>
    </div>
  );

  if (instaConnected === false) return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg,${accent},#333)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <img src="/icon-threads.png" alt="Threads" style={{ width: 40, height: 40, filter: "brightness(10)" }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>{t("ig_connect_threads")}</div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
          {t("ig_connect_threads_desc").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 32, textAlign: "left" }}>
          {[
            { icon: "📝", title: t("ig_feat_select_post"), desc: t("ig_feat_select_post_desc") },
            { icon: "🔍", title: t("ig_feat_keyword"), desc: t("ig_feat_keyword_desc") },
            { icon: "💬", title: t("ig_feat_auto_reply"), desc: t("ig_feat_auto_reply_desc") },
            { icon: "🔗", title: t("ig_feat_link"), desc: t("ig_feat_link_desc") },
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
          {connectLoading ? t("ig_connecting") : t("ig_connect_threads_btn")}
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: muted }}>{t("ig_meta_safe")}</div>
      </div>
    </div>
  );

  const activeCampaigns = campaigns.filter(c => c.is_active);

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: text }}>{t("ig_threads_auto_reply")}</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t("ig_threads_auto_reply_desc")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${accent}15`, border: `1px solid ${accent}30` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>@{instaConnected.username}</span>
        </div>
      </div>

      {/* 작동 원리 */}
      <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "📝", title: t("ig_feat_select_post"), desc: t("ig_feat_select_post_short") },
          { icon: "🔍", title: t("ig_feat_keyword"), desc: t("ig_feat_keyword_short") },
          { icon: "💬", title: t("ig_feat_auto_reply"), desc: t("ig_feat_auto_reply_short") },
          { icon: "🔗", title: t("ig_feat_link_send"), desc: t("ig_feat_link_send_desc") },
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
          { id: "posts", label: t("ig_tab_my_posts"), count: media.length },
          { id: "campaigns", label: t("ig_tab_active_rules"), count: activeCampaigns.length },
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
              <div style={{ fontSize: 13, color: muted }}>{t("ig_loading_posts")}</div>
            </div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_no_threads_posts")}</div>
              <div style={{ fontSize: 13, color: muted }}>{t("ig_no_threads_posts_desc")}</div>
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
                          {post.caption || t("ig_no_content")}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                          {post.timestamp && <span style={{ fontSize: 10, color: muted }}>{new Date(post.timestamp).toLocaleDateString()}</span>}
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
                        {(selectedPost.caption || t("ig_no_caption")).substring(0, 60)}
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>
                        {selectedPost.timestamp ? new Date(selectedPost.timestamp).toLocaleDateString() : ""}
                        {selectedPost.like_count != null && ` · ❤️ ${selectedPost.like_count}`}
                        {selectedPost.comments_count != null && ` · 💬 ${selectedPost.comments_count}`}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPost(null)}
                      style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>✕</button>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 14 }}>{t("ig_auto_reply_settings")}</div>

                  {/* 활성 토글 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{t("ig_auto_reply_send")}</div>
                    <div onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                      style={{ width: 44, height: 24, borderRadius: 12, background: form.enabled ? "#22c55e" : (D ? "rgba(255,255,255,0.15)" : "#ddd"), cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.enabled ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>

                  {/* 트리거 키워드 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>{t("ig_trigger_keywords")}</div>
                    <input type="text" value={form.triggerKeywords} onChange={e => setForm(f => ({ ...f, triggerKeywords: e.target.value }))}
                      placeholder={t("ig_trigger_keywords_placeholder")}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{t("ig_trigger_keywords_hint")}</div>
                  </div>

                  {/* 대댓글 링크 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>{t("ig_reply_link")}</div>
                    <input type="text" value={form.replyLink} onChange={e => setForm(f => ({ ...f, replyLink: e.target.value }))}
                      placeholder="https://your-link.com"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{t("ig_reply_link_hint")}</div>
                  </div>

                  {/* 템플릿 선택 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>{t("ig_reply_template")}</div>
                    <div className="ai-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
                      {REPLY_TEMPLATES.map(tp => (
                        <button key={tp.id} onClick={() => { setSelectedTemplate(tp.id); if (tp.msg) setForm(f => ({ ...f, replyMessage: tp.msg })); }}
                          style={{ padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${selectedTemplate === tp.id ? accent : bdr}`,
                            background: selectedTemplate === tp.id ? `${accent}15` : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                          <div style={{ fontSize: 12, fontWeight: selectedTemplate === tp.id ? 800 : 500, color: selectedTemplate === tp.id ? accent : text }}>{tp.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 대댓글 메시지 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>{t("ig_reply_message")}</div>
                    <textarea value={form.replyMessage} onChange={e => setForm(f => ({ ...f, replyMessage: e.target.value }))}
                      placeholder={t("ig_reply_message_placeholder")}
                      style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                  </div>

                  {/* 미리보기 */}
                  {form.replyMessage && (
                    <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: D ? "rgba(255,255,255,0.03)" : "#f8f8fc", border: `1px solid ${bdr}` }}>
                      <div style={{ fontSize: 10, color: muted, marginBottom: 6 }}>{t("ig_reply_preview")}</div>
                      <div style={{ fontSize: 12, color: text, lineHeight: 1.6 }}>
                        {t("ig_reply_preview_user")} {form.replyMessage}{form.replyLink ? ` ${form.replyLink}` : ""}
                      </div>
                    </div>
                  )}

                  <button onClick={saveCampaign} disabled={saving || !form.replyMessage.trim()}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${accent},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: (saving || !form.replyMessage.trim()) ? 0.5 : 1 }}>
                    {saving ? t("ig_saving") : postHasCampaign(selectedPost.permalink) ? t("ig_update_rule") : t("ig_save_rule")}
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
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_no_rules")}</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.7 }}>
                {t("ig_no_rules_desc").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
              </div>
              <button onClick={() => setViewTab("posts")}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${accent},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                {t("ig_go_select_post")}
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
                        {c.is_active ? t("ig_stop") : t("ig_activate")}
                      </button>
                      <button onClick={() => deleteCampaign(c.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>{t("ig_delete")}</button>
                    </div>
                  </div>
                  {c.trigger_keywords?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {c.trigger_keywords.map((kw, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: 6, background: accent + "15", color: accent, fontSize: 10, fontWeight: 600 }}>{kw}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: muted }}>💬 {t("ig_reply_label")}{(c.reply_message || "").substring(0, 60)}...</div>
                  {c.reply_count > 0 && <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginTop: 4 }}>✅ {c.reply_count}{t("ig_replied_count")}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div style={{ marginTop: 24, padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>📋 {t("ig_guide_title")}</div>
        <div style={{ fontSize: 11, color: muted, lineHeight: 1.8 }}>
          • {t("ig_guide_threads_1")}<br/>
          • {t("ig_guide_threads_2")}<br/>
          • {t("ig_guide_threads_3")}<br/>
          • {t("ig_guide_threads_4")}
        </div>
      </div>
    </div>
  );
}

/* ── 인스타 자동DM 컴포넌트 ── */
function InstaAutoDM({ isDark, user, onUserUpdate, navigate }) {
  const { t } = useI18n();
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
    { id: "friendly", label: t("ig_tone_friendly"), desc: t("ig_tone_friendly_desc") },
    { id: "professional", label: t("ig_tone_professional"), desc: t("ig_tone_professional_desc") },
    { id: "cute", label: t("ig_tone_cute"), desc: t("ig_tone_cute_desc") },
    { id: "casual", label: t("ig_tone_casual"), desc: t("ig_tone_casual_desc") },
    { id: "luxury", label: t("ig_tone_luxury"), desc: t("ig_tone_luxury_desc") },
    { id: "energetic", label: t("ig_tone_energetic"), desc: t("ig_tone_energetic_desc") },
  ];

  // 기본 메시지 템플릿 (these are actual DM content, kept in Korean as they are user-facing message templates)
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
      else alert(data.error || t("ig_auth_url_fail"));
    } catch (e) { alert(t("ig_connect_error") + e.message); }
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
    const toneLabel = TONE_OPTIONS.find(tp => tp.id === selectedTone)?.label || t("ig_tone_friendly");
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
            name: (selectedPost.caption || t("ig_post_fallback")).substring(0, 40),
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
    } catch (e) { alert(t("ig_save_fail") + e.message); }
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
    if (!confirm(t("ig_delete_campaign_confirm"))) return;
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
      <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_login_required")}</div>
      <div style={{ fontSize: 13, color: muted }}>{t("ig_login_required_dm")}</div>
    </div>
  );

  // ── 연동 확인 로딩 ──
  if (instaConnected === null) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: accent, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <div style={{ fontSize: 13, color: muted }}>{t("ig_checking_insta")}</div>
    </div>
  );

  // ── 미연동: 연동 안내 ──
  if (instaConnected === false) return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg,${accent},#c13584,#833ab4)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>
          📩
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>{t("ig_connect_insta")}</div>
        <div style={{ fontSize: 14, color: muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
          {t("ig_connect_insta_desc").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
        </div>

        {/* 혜택 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 32, textAlign: "left" }}>
          {[
            { icon: "📊", title: t("ig_feat_my_post"), desc: t("ig_feat_my_post_desc") },
            { icon: "🔍", title: t("ig_feat_auto_keyword"), desc: t("ig_feat_auto_keyword_desc") },
            { icon: "📩", title: t("ig_feat_auto_dm"), desc: t("ig_feat_auto_dm_desc") },
            { icon: "📈", title: t("ig_feat_tracking"), desc: t("ig_feat_tracking_desc") },
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
          {connectLoading ? t("ig_connecting") : t("ig_connect_insta_btn")}
        </button>

        <div style={{ marginTop: 16, fontSize: 11, color: muted }}>
          {t("ig_meta_safe")}
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
          <div style={{ fontSize: 20, fontWeight: 900, color: text }}>{t("ig_insta_auto_dm")}</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t("ig_insta_auto_dm_desc")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${accent}15`, border: `1px solid ${accent}30` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>@{instaConnected.username}</span>
        </div>
      </div>

      {/* 작동 원리 */}
      <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "📝", title: t("ig_feat_select_post"), desc: t("ig_feat_select_post_short") },
          { icon: "🔍", title: t("ig_feat_keyword"), desc: t("ig_feat_keyword_short") },
          { icon: "📩", title: t("ig_feat_auto_dm"), desc: t("ig_feat_auto_dm_short") },
          { icon: "🔗", title: t("ig_feat_link_send"), desc: t("ig_feat_link_cta") },
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
          { id: "posts", label: t("ig_tab_my_posts"), count: media.length },
          { id: "campaigns", label: t("ig_tab_active_campaigns"), count: activeCampaigns.length },
          { id: "logs", label: t("ig_tab_send_status"), count: 0 },
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
              <div style={{ fontSize: 13, color: muted }}>{t("ig_loading_posts")}</div>
            </div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_no_insta_posts")}</div>
              <div style={{ fontSize: 13, color: muted }}>{t("ig_no_insta_posts_desc")}</div>
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
                        {(selectedPost.caption || t("ig_no_caption")).substring(0, 60)}
                      </div>
                      <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>
                        {selectedPost.timestamp ? new Date(selectedPost.timestamp).toLocaleDateString() : ""}
                        {selectedPost.like_count != null && ` · ❤️ ${selectedPost.like_count}`}
                        {selectedPost.comments_count != null && ` · 💬 ${selectedPost.comments_count}`}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPost(null)}
                      style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 16, cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 900, color: text, marginBottom: 14 }}>{t("ig_auto_dm_settings")}</div>

                  {/* 활성/비활성 토글 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{t("ig_auto_dm_toggle")}</div>
                    <div onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                      style={{ width: 44, height: 24, borderRadius: 12, background: form.enabled ? "#22c55e" : (D ? "rgba(255,255,255,0.15)" : "#ddd"), cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form.enabled ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>

                  <DmInputField styles={fieldStyles} label={t("ig_trigger_keywords")} value={form.triggerKeywords} onChange={v => setForm(f => ({ ...f, triggerKeywords: v }))} placeholder={t("ig_trigger_keywords_placeholder")} hint={t("ig_trigger_keywords_dm_hint")} />
                  <DmInputField styles={fieldStyles} label={t("ig_dm_link_label")} value={form.dmLink} onChange={v => setForm(f => ({ ...f, dmLink: v }))} placeholder="https://your-link.com" hint={t("ig_dm_link_hint")} />

                  {/* 말투/톤 선택 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 8 }}>{t("ig_tone_select")}</div>
                    <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {TONE_OPTIONS.map(tp => (
                        <button key={tp.id} onClick={() => { setSelectedTone(tp.id); applyDefaultTemplate(tp.id); }}
                          style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${selectedTone === tp.id ? accent : bdr}`,
                            background: selectedTone === tp.id ? `${accent}15` : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                          <div style={{ fontSize: 12, fontWeight: selectedTone === tp.id ? 800 : 500, color: selectedTone === tp.id ? accent : text }}>{tp.label}</div>
                          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{tp.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DM 메시지 + AI 생성 */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{t("ig_dm_message")}</div>
                    <button onClick={generateDM} disabled={generating}
                      style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: generating ? "wait" : "pointer", opacity: generating ? 0.6 : 1, minHeight: 30 }}>
                      {generating ? t("ig_ai_generating") : t("ig_ai_generate_btn")}
                    </button>
                    <button onClick={() => applyDefaultTemplate(selectedTone)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 30 }}>
                      {t("ig_apply_default_tpl")}
                    </button>
                  </div>
                  <DmInputField styles={fieldStyles} label={t("ig_follower_msg")} value={form.dmMessageFollower} onChange={v => setForm(f => ({ ...f, dmMessageFollower: v }))} placeholder={t("ig_follower_msg_placeholder")} multiline />
                  <DmInputField styles={fieldStyles} label={t("ig_non_follower_msg")} value={form.dmMessageNonFollower} onChange={v => setForm(f => ({ ...f, dmMessageNonFollower: v }))} placeholder={t("ig_non_follower_msg_placeholder")} multiline />

                  <button onClick={saveCampaign} disabled={saving || !form.dmMessageFollower.trim()}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${accent},#c13584)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: (saving || !form.dmMessageFollower.trim()) ? 0.5 : 1 }}>
                    {saving ? t("ig_saving") : postHasCampaign(selectedPost.permalink) ? t("ig_update_campaign") : t("ig_save_campaign")}
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
              <div style={{ fontSize: 13, color: muted }}>{t("ig_loading_campaigns")}</div>
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_no_campaigns")}</div>
              <div style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.7 }}>
                {t("ig_no_campaigns_desc").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
              </div>
              <button onClick={() => setViewTab("posts")}
                style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${accent},#c13584)`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                {t("ig_go_select_post")}
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
                        {c.is_active ? t("ig_stop") : t("ig_activate")}
                      </button>
                      <button onClick={() => deleteCampaign(c.id)}
                        style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>
                        {t("ig_delete")}
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
                    📩 {t("ig_follower_label")}{(c.dm_message_follower || "").substring(0, 50)}...
                  </div>
                  {c.dm_sent_count > 0 && <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginTop: 4 }}>✅ {c.dm_sent_count}{t("ig_sent_count")}</div>}
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
              <div style={{ fontSize: 13, color: muted }}>{t("ig_loading_logs")}</div>
            </div>
          ) : dmLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{t("ig_no_logs")}</div>
              <div style={{ fontSize: 13, color: muted }}>{t("ig_no_logs_desc")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* 통계 요약 */}
              <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>{dmLogs.filter(l => l.sent_success).length}</div>
                  <div style={{ fontSize: 11, color: muted }}>{t("ig_send_success")}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444" }}>{dmLogs.filter(l => !l.sent_success).length}</div>
                  <div style={{ fontSize: 11, color: muted }}>{t("ig_send_fail")}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: accent }}>{dmLogs.length}</div>
                  <div style={{ fontSize: 11, color: muted }}>{t("ig_total_attempts")}</div>
                </div>
              </div>

              {/* 로그 목록 */}
              {dmLogs.map((log, i) => (
                <div key={log.id || i} style={{ padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: log.sent_success ? "#22c55e" : "#ef4444" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: text }}>@{log.commenter_username || "unknown"}</span>
                      {log.is_follower && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }}>{t("ig_follower_badge")}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: muted }}>{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</span>
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                    💬 {t("ig_comment_label")}{(log.comment_text || "").substring(0, 80)}
                  </div>
                  <div style={{ fontSize: 11, color: text }}>
                    📩 {t("ig_sent_label")}{(log.message_sent || "").substring(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div style={{ marginTop: 24, padding: 14, borderRadius: 12, border: `1px solid ${bdr}`, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#7c6aff", marginBottom: 6 }}>📋 {t("ig_guide_title")}</div>
        <div style={{ fontSize: 11, color: muted, lineHeight: 1.8 }}>
          • {t("ig_guide_dm_1")}<br/>
          • {t("ig_guide_dm_2")}<br/>
          • Webhook URL: <span style={{ fontFamily: "monospace", fontSize: 10, color: accent }}>https://snsmakeit.com/api/insta-webhook</span><br/>
          • {t("ig_guide_dm_3")}<br/>
          • {t("ig_guide_dm_4")}
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
