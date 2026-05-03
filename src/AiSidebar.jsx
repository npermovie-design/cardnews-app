import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, pointsToUses } from "./storage";

/* ════════════════════════════════════════════════════════════
   AiSidebar + SidebarProfile + useOnlineCount
════════════════════════════════════════════════════════════ */

function useOnlineCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    let cancelled = false;
    const myId = "u_" + Math.random().toString(36).slice(2, 8);
    const KEY = "nper_online_users";
    function hb() {
      if (cancelled) return;
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        const now = Date.now();
        raw[myId] = now;
        Object.keys(raw).forEach(k => { if (now - raw[k] > 30000) delete raw[k]; });
        localStorage.setItem(KEY, JSON.stringify(raw));
        if (!cancelled) setCount(Object.keys(raw).length);
      } catch(e) {}
    }
    hb();
    const t = setInterval(hb, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
      try { const raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch(e) {}
    };
  }, []);
  return count;
}



function AiSidebar({ aiMenu, setAiMenu, user, onQna, theme, onlineCount, navigate, onLogout, onCollapse }) {
  const { t } = useI18n();
  const isDark = theme === "dark";
  const sideBg   = isDark ? "rgba(0,0,0,0.45)"           : "#f8f9ff";
  const sideBdr  = isDark ? "rgba(255,255,255,0.07)"     : "rgba(17,24,39,0.10)";
  const menuLabel= isDark ? "rgba(255,255,255,0.2)"      : "rgba(22,142,234,0.36)";
  const itemText = isDark ? "rgba(255,255,255,0.5)"      : "rgba(17,24,39,0.62)";
  const itemActive= isDark ? "#4AABF2"                   : "#168EEA";
  const itemActiveBg = isDark ? "rgba(22,142,234,0.24)" : "rgba(22,142,234,0.08)";
  const brandText= isDark ? "#fff"                       : "#111827";
  const brandSub = isDark ? "rgba(255,255,255,0.3)"      : "rgba(22,142,234,0.52)";
  const comText  = isDark ? "rgba(255,255,255,0.45)"     : "#888";
  const usageBar = isDark ? "rgba(255,255,255,0.08)"     : "rgba(22,142,234,0.12)";
  const usageText= isDark ? "rgba(255,255,255,0.3)"      : "#aaa";
  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const pct = Math.min(Math.round(info.used / freeLimit * 100), 100) + "%";

  const Item = ({ id, label, icon, ids, badge, badgeColor }) => {
    const baseId = id.replace('_intro', '');
    const active = aiMenu === id || aiMenu.startsWith(baseId) || (ids && ids.some(x => aiMenu === x || aiMenu.startsWith(x)));
    return (
      <button onClick={() => setAiMenu(id)} style={{
        width: "100%", padding: "11px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: 13, fontWeight: active ? 700 : 500,
        borderLeft: active ? "3px solid #168EEA" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: 0, marginBottom: 2,
        minHeight: 40, transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(22,142,234,0.06)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ flex: 1 }}>{label}</span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
            background: badgeColor === "orange" ? "rgba(249,115,22,0.15)" : badgeColor === "green" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
            color: badgeColor === "orange" ? "#f97316" : badgeColor === "green" ? "#10b981" : "#3b82f6",
            flexShrink: 0, marginLeft: 4, lineHeight: "16px",
          }}>{badge}</span>
        )}
      </button>
    );
  };

  // 메뉴 정의
  const menuItems = [
    { id:"video_guide", label:t("howto"), ids:["video_guide"] },
    { id:"home", label:"AI도구", ids:["home","blog_naver","blog_tistory","blog_insta","blog_youtube","blog_thread","blog_cafe","blog_yt_blog","blog_news","blog_link","blog_write"] },
    { id:"today_keywords", label:t("sideKeywords"), ids:["today_keywords"] },
    { id:"sns_consulting", label:t("sideConsulting"), ids:["sns_consulting"] },
    { id:"social_analyzer", label:t("sideAnalyzer"), ids:["social_analyzer"] },
    { id:"library", label:t("library") },
  ];

  const isActive = (item) => {
    const baseId = item.id.replace('_intro','');
    return aiMenu === item.id || aiMenu.startsWith(baseId) || (item.ids && item.ids.some(x => aiMenu === x || aiMenu.startsWith(x)));
  };

  const [sideW, setSideW] = useState(() => { try { return parseInt(localStorage.getItem("_sidebar_w")) || 210; } catch { return 210; } });
  const dragRef = useRef(null);
  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sideW;
    const onMove = (ev) => {
      const newW = Math.max(140, Math.min(320, startW + ev.clientX - startX));
      setSideW(newW);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      try { localStorage.setItem("_sidebar_w", String(sideW)); } catch {}
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div style={{
      width: sideW, flexShrink: 0, background: isDark ? "rgba(0,0,0,0.35)" : "#fff",
      borderRight: `1px solid ${sideBdr}`,
      display: "flex", flexDirection: "column", height: "100%", position: "relative",
    }}>
      {/* 메뉴 */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
        {menuItems.map((item, i) => {
          if (item.sep) return <div key={`sep-${i}`} style={{ height:1, background:sideBdr, margin:"10px 6px" }} />;
          if (item.adminOnly && user?.role !== "admin") return null;
          const active = isActive(item);
          return (
            <button key={item.id} onClick={() => setAiMenu(item.id)}
              style={{
                width:"100%", padding:"13px 14px", borderRadius:11, border:"none", cursor:"pointer",
                textAlign:"left", display:"flex", alignItems:"center", gap:0, marginBottom:4,
                background: active ? itemActiveBg : "transparent",
                color: active ? itemActive : itemText,
                fontSize:15, fontWeight: active ? 800 : 600,
                transition:"background 0.12s",
                minHeight:50, fontFamily:"inherit",
                borderLeft: active ? `3px solid ${itemActive}` : "3px solid transparent",
              }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background = isDark?"rgba(255,255,255,0.05)":"rgba(22,142,234,0.06)"; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background = active ? itemActiveBg : "transparent"; }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, letterSpacing:-0.2 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize:10, fontWeight:800, color:"#fff", background:"#f59e0b", borderRadius:6, padding:"2px 8px", flexShrink:0 }}>{item.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* 하단 */}
      <div style={{ padding:"10px", borderTop:`1px solid ${sideBdr}`, flexShrink:0 }}>
        <button onClick={() => navigate && navigate("mypage")}
          style={{
            width:"100%", padding:"12px 14px", borderRadius:10, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:0, background:"transparent",
            color: isDark ? "#4AABF2" : "#1280d4", fontSize:14, fontWeight:700,
            transition:"background 0.12s", minHeight:44, fontFamily:"inherit",
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark?"rgba(22,142,234,0.12)":"rgba(22,142,234,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {t("myPage")}
        </button>
        {onCollapse && (
          <button onClick={onCollapse}
            style={{
              width:"100%", padding:"12px 14px", borderRadius:10, border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", gap:0, background:"transparent",
              color: itemText, fontSize:13, fontWeight:600, marginTop:4,
              transition:"background 0.12s", minHeight:44, fontFamily:"inherit",
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {t("sideCollapse")}
          </button>
        )}
      </div>
      {/* 리사이즈 핸들 */}
      <div ref={dragRef} onMouseDown={handleMouseDown}
        style={{ position:"absolute", top:0, right:-2, bottom:0, width:5, cursor:"col-resize", zIndex:10, background:"transparent" }}
        onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(22,142,234,0.3)":"rgba(22,142,234,0.15)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"} />
    </div>
  );
}

// ── 사이드바 프로필 카드 컴포넌트 ──────────────────────────────────────────────
function SidebarProfile({ user, info, freeLimit, pct, isDark, sideBdr, navigate, onLogout, onlineCount, usageText, usageBar, t }) {
  const [open, setOpen] = useState(false);
  const sub = user._subscription;
  const usesLeft = (sub && sub._monthlyWriteLimit > 0)
    ? Math.max(0, sub._monthlyWriteLimit - (user.monthly_used || 0))
    : Math.floor((user.points || 0) / 1);
  const isLow = usesLeft > 0 && usesLeft <= 2;
  const isEmpty = usesLeft <= 0;
  const ptColor = isEmpty || isLow ? "#f87171" : "#4AABF2";
  const nick = user.nick || user.email?.split("@")[0] || "사용자";
  const initial = nick[0]?.toUpperCase() || "U";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#ebebf0";

  return (
    <div style={{ position: "relative" }}>
      {/* 오버레이 */}
      {open && <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:199 }} />}

      {/* 팝업 */}
      {open && (
        <div style={{
          position:"fixed", bottom:68, left:8, width:"min(220px, 85vw)", zIndex:9999,
          background: isDark ? "rgba(18,15,40,0.97)" : "rgba(255,255,255,0.97)",
          border:`1px solid ${isDark?"rgba(22,142,234,0.25)":"rgba(22,142,234,0.18)"}`,
          borderRadius:16, overflow:"hidden",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(22,142,234,0.1)"
            : "0 8px 32px rgba(22,142,234,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          backdropFilter:"blur(20px)",
        }}>
          {/* 헤더 */}
          <div style={{ padding:"16px 16px 12px",
            background: isDark?"rgba(22,142,234,0.08)":"rgba(22,142,234,0.04)",
            borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(22,142,234,0.1)"}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                background:"#168EEA",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, fontWeight:900, color:"#fff",
                boxShadow:"none" }}>
                {initial}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:text,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</span>
                  <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4, fontWeight:700,
                    background: user.role==="admin"?"rgba(251,191,36,0.15)":"rgba(22,142,234,0.12)",
                    color: user.role==="admin"?"#fbbf24":"#4AABF2", flexShrink:0 }}>
                    {user.role==="admin"?(t?.("admin")||"Admin"):sub?.product_name||((t?.("sideProfileMember"))||"Member")}
                  </span>
                </div>
                <div style={{ fontSize:10, color:muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
              </div>
            </div>
          </div>

          {/* 잔여 횟수 */}
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(22,142,234,0.08)"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, color:muted }}>잔여 횟수</span>
              <span style={{ fontSize:14, fontWeight:900,
                color: isEmpty?"#f87171":isLow?"#f59e0b":"#4AABF2" }}>
                {usesLeft}회
              </span>
            </div>
            <div style={{ height:4, borderRadius:4, background:isDark?"rgba(255,255,255,0.08)":"rgba(22,142,234,0.1)", overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", borderRadius:4,
                background: isEmpty?"#f87171":isLow?"linear-gradient(90deg,#f59e0b,#fbbf24)":"#168EEA",
                width: `${Math.min((usesLeft / Math.max((sub?._monthlyWriteLimit || 10), 1)) * 100, 100)}%`, transition:"width 0.3s" }}/>
            </div>
            {(isEmpty||isLow) && (
              <div style={{ fontSize:10, color:isEmpty?"#f87171":"#f59e0b", fontWeight:700 }}>
                {isEmpty?"횟수를 모두 사용했어요":"횟수가 부족해요"}
              </div>
            )}
          </div>

          {/* 메뉴 */}
          <div style={{ padding:"6px 8px" }}>
            {[
              { label:"플랜 업그레이드", sub:"더 많은 AI 생성", onClick:()=>{ navigate("pricing"); setOpen(false); },
                accent:true },
              { label:t?.("library")||"My Library", sub:t?.("sideLibrarySub")||"Saved content", onClick:()=>{ navigate("library"); setOpen(false); } },
            ].map((item,i) => (
              <button key={i} onClick={item.onClick}
                style={{ width:"100%", padding:"9px 10px", border:"none", borderRadius:9,
                  background:"transparent", cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:10, transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(22,142,234,0.1)":"rgba(22,142,234,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                  background: item.accent?"#168EEA":isDark?"rgba(255,255,255,0.06)":"rgba(22,142,234,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                  {item.accent?"+":"L"}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:item.accent?"#4AABF2":text }}>{item.label}</div>
                  <div style={{ fontSize:10, color:muted }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* 로그아웃 */}
          <div style={{ padding:"6px 8px 8px", borderTop:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"}` }}>
            <button onClick={()=>{ setOpen(false); if(onLogout) onLogout(); }}
              style={{ width:"100%", padding:"9px 10px", border:"none", borderRadius:9,
                background:"transparent", cursor:"pointer", textAlign:"left",
                display:"flex", alignItems:"center", gap:10, color:"#f87171",
                fontSize:13, fontWeight:600, transition:"background 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                background:"rgba(248,113,113,0.1)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>X</div>
              {t?.("logout")||"Logout"}
            </button>
          </div>
        </div>
      )}

      {/* 하단 프로필 버튼 (팝업 토글만, 클릭시 팝업만 열기) */}
      <button onClick={() => setOpen(p => !p)}
        style={{ width:"100%", padding:"11px 14px",
          background: open?(isDark?"rgba(22,142,234,0.1)":"rgba(22,142,234,0.06)"):"transparent",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", gap:10,
          borderTop:`1px solid ${bdr}`,
          transition:"background 0.15s" }}
        onMouseEnter={e=>{ if(!open) e.currentTarget.style.background=isDark?"rgba(255,255,255,0.04)":"rgba(22,142,234,0.04)"; }}
        onMouseLeave={e=>{ if(!open) e.currentTarget.style.background="transparent"; }}>
        <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, position:"relative",
          background:"#168EEA",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:900, color:"#fff",
          boxShadow:"none" }}>
          {initial}
          <div style={{ position:"absolute", bottom:0, right:0, width:9, height:9,
            borderRadius:"50%", background:"#4ade80",
            border:`2px solid ${isDark?"#0f0c29":"#f0f0f8"}` }} />
        </div>
        <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
          <div style={{ fontSize:12, fontWeight:700, color:text,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</div>
          <div style={{ fontSize:10, fontWeight: isLow||isEmpty?700:400,
            color: isEmpty?"#f87171":isLow?"#f59e0b":muted }}>
            {isEmpty?(t?.("sidePointsEmpty")||"Uses depleted"):isLow?`${pointsToUses(ptLeft)}회`:`${pointsToUses(ptLeft).toLocaleString()}회`}
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5"
          style={{ flexShrink:0, transform:open?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s" }}>
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>
  );
}

// 블로그 타입 매핑
const BLOG_MAP = {
  blog_naver:   { type: "blog_naver",   label: "Naver Blog", labelKey: "naverBlog" },
  blog_tistory: { type: "blog_tistory", label: "Tistory", labelKey: "tistory" },
  blog_insta:   { type: "blog_insta",   label: "Instagram", labelKey: "instaCap" },
  blog_youtube: { type: "blog_youtube", label: "YouTube", labelKey: "youtubeScript" },
  blog_thread:  { type: "blog_thread",  label: "Threads", labelKey: "thread" },
  blog_yt_blog: { type: "blog_yt_blog", label: "Link Blog", labelKey: "ytBlog" },
  blog_link:    { type: "blog_link",    label: "Link Blog", labelKey: "ytBlog" },
  blog_cafe:    { type: "blog_cafe",    label: "Naver Cafe", labelKey: "naverCafe" },
};

export { useOnlineCount, AiSidebar, SidebarProfile, BLOG_MAP };
