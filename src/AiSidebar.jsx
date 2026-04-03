import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { getAiLeft, FREE_MEMBER, FREE_GUEST } from "./storage";

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



function AiSidebar({ aiMenu, setAiMenu, user, onQna, theme, onlineCount, navigate, onLogout }) {
  const { t } = useI18n();
  const isDark = theme === "dark";
  const sideBg   = isDark ? "rgba(0,0,0,0.45)"           : "#f0f0f8";
  const sideBdr  = isDark ? "rgba(255,255,255,0.07)"     : "#e5e3f5";
  const menuLabel= isDark ? "rgba(255,255,255,0.2)"      : "rgba(99,102,241,0.4)";
  const itemText = isDark ? "rgba(255,255,255,0.5)"      : "#6c757d";
  const itemActive= isDark ? "#a5b4fc"                   : "#4f46e5";
  const itemActiveBg = isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.1)";
  const brandText= isDark ? "#fff"                       : "#1a1a2e";
  const brandSub = isDark ? "rgba(255,255,255,0.3)"      : "rgba(99,102,241,0.5)";
  const comText  = isDark ? "rgba(255,255,255,0.45)"     : "#888";
  const usageBar = isDark ? "rgba(255,255,255,0.08)"     : "rgba(99,102,241,0.12)";
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
        borderLeft: active ? "3px solid #7c6aff" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: icon ? 7 : 0, marginBottom: 2,
        minHeight: 40, transition: "background 0.12s",
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(99,102,241,0.05)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        {icon && (typeof icon === "string" && icon.startsWith("/") ? <img src={icon} alt="" loading="lazy" decoding="async" style={{ width:18, height:18, objectFit:"contain", flexShrink:0 }} /> : <span style={{ fontSize: 14 }}>{icon}</span>)}
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
    { id:"home", label:t("home"), icon:"/icons3d/sns-heart.png" },
    { id:"social_planner", label:t("sidePlanner")||"소셜 플래너", icon:"/icons3d/sns-heart.png" },
    { id:"library", label:t("library"), icon:"/icons3d/search-book.png" },
    { sep:true },
    { id:"blog_write", label:t("sideWrite")||"글쓰기", icon:"/icons3d/blog-write.png", ids:["blog_naver","blog_tistory","blog_insta","blog_youtube","blog_thread","blog_cafe","blog_yt_blog","blog_news","blog_link","auto_publish"] },
    { id:"content_create", label:t("sideContent")||"콘텐츠 제작", icon:"/icons3d/palette.png", ids:["cardnews_simple","cardnews_make","cardnews_simple_make","detail_simple","detail_simple_make","detail_section","thumbnail_gen","thumbnail_gen_make","ppt_gen","canvas_direct_"] },
    { id:"image_tools", label:t("sideImage")||"이미지", icon:"/icons3d/instagram-cam.png", ids:["image_create","image_edit","product_shot","logo_gen","mockup_gen","model_gen","skin_retouch","face_swap","outfit_swap","outpaint"] },
    { id:"video_edit", label:t("sideVideo")||"영상", icon:"/icons3d/sns-app.png", ids:["shorts_make"], badge:"NEW" },
  ];

  const isActive = (item) => {
    const baseId = item.id.replace('_intro','');
    return aiMenu === item.id || aiMenu.startsWith(baseId) || (item.ids && item.ids.some(x => aiMenu === x || aiMenu.startsWith(x)));
  };

  const [sideW, setSideW] = useState(() => { try { return parseInt(localStorage.getItem("_sidebar_w")) || 180; } catch { return 180; } });
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
      {/* 카톡방 배너 */}
      <a href="https://open.kakao.com/o/gIw9vTFg" target="_blank" rel="noopener noreferrer"
        style={{ display:"flex", alignItems:"center", gap:8, margin:"10px 8px 6px", padding:"10px 12px", borderRadius:10, background:"#FEE500", textDecoration:"none", transition:"opacity 0.15s" }}
        onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}><path fill="#191919" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24-.13.47-.85 3.04-.88 3.23 0 0-.02.15.08.21.1.06.21.01.21.01.28-.04 3.24-2.13 3.76-2.49.79.11 1.6.17 2.45.17 5.52 0 10-3.36 10-7.37S17.52 3 12 3z"/></svg>
        <span style={{ fontSize:11, fontWeight:700, color:"#191919", flex:1, lineHeight:1.3 }}>카톡방 소통하기</span>
        <span style={{ fontSize:11, color:"#191919", fontWeight:800 }}>→</span>
      </a>

      {/* 메뉴 */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 8px" }}>
        {menuItems.map((item, i) => {
          if (item.sep) return <div key={`sep-${i}`} style={{ height:1, background:sideBdr, margin:"6px 4px" }} />;
          if (item.adminOnly && user?.role !== "admin") return null;
          const active = isActive(item);
          return (
            <button key={item.id} onClick={() => setAiMenu(item.id)}
              style={{
                width:"100%", padding:"9px 10px", borderRadius:8, border:"none", cursor:"pointer",
                textAlign:"left", display:"flex", alignItems:"center", gap:8, marginBottom:1,
                background: active ? itemActiveBg : "transparent",
                color: active ? itemActive : itemText,
                fontSize:13, fontWeight: active ? 700 : 500,
                transition:"background 0.12s",
              }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background = isDark?"rgba(255,255,255,0.05)":"rgba(99,102,241,0.05)"; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background = active ? itemActiveBg : "transparent"; }}>
              <img src={item.icon} alt="" loading="lazy" decoding="async" style={{ width:26, height:26, objectFit:"contain", flexShrink:0, opacity:active?1:0.65 }} />
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize:9, fontWeight:700, color:"#fff", background:"#f59e0b", borderRadius:4, padding:"1px 6px", flexShrink:0 }}>{item.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* 하단 */}
      <div style={{ padding:"8px", borderTop:`1px solid ${sideBdr}`, flexShrink:0 }}>
        <button onClick={() => navigate && navigate("mypage")}
          style={{
            width:"100%", padding:"8px 10px", borderRadius:8, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:8, background:"transparent",
            color: isDark ? "#a5b4fc" : "#6366f1", fontSize:12, fontWeight:600,
            transition:"background 0.12s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark?"rgba(124,106,255,0.12)":"rgba(124,106,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          마이페이지
        </button>
      </div>
      {/* 리사이즈 핸들 */}
      <div ref={dragRef} onMouseDown={handleMouseDown}
        style={{ position:"absolute", top:0, right:-2, bottom:0, width:5, cursor:"col-resize", zIndex:10, background:"transparent" }}
        onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(124,106,255,0.3)":"rgba(124,106,255,0.15)"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"} />
    </div>
  );
}

// ── 사이드바 프로필 카드 컴포넌트 ──────────────────────────────────────────────
function SidebarProfile({ user, info, freeLimit, pct, isDark, sideBdr, navigate, onLogout, onlineCount, usageText, usageBar }) {
  const [open, setOpen] = useState(false);
  const ptLeft = Math.max(0, (freeLimit - info.used) * 10) + (user.points || 0);
  const ptTotal = freeLimit * 10 + (user.points || 0);
  const ptPct = Math.min((ptLeft / Math.max(ptTotal, 1)) * 100, 100);
  const isLow = ptLeft > 0 && ptLeft <= 20; // 1~2회 생성 가능(10~20P) 시 경고
  const isEmpty = ptLeft <= 0;
  const ptColor = isEmpty || isLow ? "#f87171" : "#a5b4fc";
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
          position:"fixed", bottom:68, left:8, width:220, zIndex:9999,
          background: isDark ? "rgba(18,15,40,0.97)" : "rgba(255,255,255,0.97)",
          border:`1px solid ${isDark?"rgba(124,106,255,0.25)":"rgba(124,106,255,0.18)"}`,
          borderRadius:16, overflow:"hidden",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,106,255,0.1)"
            : "0 8px 32px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)",
          backdropFilter:"blur(20px)",
        }}>
          {/* 헤더 */}
          <div style={{ padding:"16px 16px 12px",
            background: isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)",
            borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(124,106,255,0.1)"}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                background:"linear-gradient(135deg,#7c6aff,#ec4899)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16, fontWeight:900, color:"#fff",
                boxShadow:"0 2px 8px rgba(124,106,255,0.4)" }}>
                {initial}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:text,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nick}</span>
                  <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4, fontWeight:700,
                    background: user.role==="admin"?"rgba(251,191,36,0.15)":"rgba(99,102,241,0.12)",
                    color: user.role==="admin"?"#fbbf24":"#a5b4fc", flexShrink:0 }}>
                    {user.role==="admin"?"관리자":"회원"}
                  </span>
                </div>
                <div style={{ fontSize:10, color:muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
              </div>
            </div>
          </div>

          {/* 포인트 현황 */}
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.06)":"rgba(124,106,255,0.08)"}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, color:muted }}>보유 포인트</span>
              <span style={{ fontSize:14, fontWeight:900,
                color: isEmpty?"#f87171":isLow?"#f59e0b":"#a5b4fc" }}>
                {ptLeft.toLocaleString()}P
              </span>
            </div>
            {/* 포인트 바 */}
            <div style={{ height:4, borderRadius:4, background:isDark?"rgba(255,255,255,0.08)":"rgba(99,102,241,0.1)", overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", borderRadius:4,
                background: isEmpty?"#f87171":isLow?"linear-gradient(90deg,#f59e0b,#fbbf24)":"linear-gradient(90deg,#7c6aff,#a5b4fc)",
                width: `${Math.min((ptLeft/200)*100,100)}%`, transition:"width 0.3s" }}/>
            </div>
            {(isEmpty||isLow) && (
              <div style={{ fontSize:10, color:isEmpty?"#f87171":"#f59e0b", fontWeight:700 }}>
                {isEmpty?"포인트 소진 · 충전이 필요해요":"1~2회 생성 가능 · 충전을 권장해요"}
              </div>
            )}
          </div>

          {/* 메뉴 */}
          <div style={{ padding:"6px 8px" }}>
            {[
              { label:"포인트 충전", sub:"더 많은 AI 생성", onClick:()=>{ navigate("pricing"); setOpen(false); },
                accent:true },
              { label:"내 보관함", sub:"생성한 글·카드뉴스", onClick:()=>{ navigate("library"); setOpen(false); } },
            ].map((item,i) => (
              <button key={i} onClick={item.onClick}
                style={{ width:"100%", padding:"9px 10px", border:"none", borderRadius:9,
                  background:"transparent", cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:10, transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                  background: item.accent?"linear-gradient(135deg,#7c6aff,#7c6aff)":isDark?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                  {item.accent?"P":"L"}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:item.accent?"#a5b4fc":text }}>{item.label}</div>
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
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 하단 프로필 버튼 (팝업 토글만, 클릭시 팝업만 열기) */}
      <button onClick={() => setOpen(p => !p)}
        style={{ width:"100%", padding:"11px 14px",
          background: open?(isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)"):"transparent",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", gap:10,
          borderTop:`1px solid ${bdr}`,
          transition:"background 0.15s" }}
        onMouseEnter={e=>{ if(!open) e.currentTarget.style.background=isDark?"rgba(255,255,255,0.04)":"rgba(124,106,255,0.04)"; }}
        onMouseLeave={e=>{ if(!open) e.currentTarget.style.background="transparent"; }}>
        <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, position:"relative",
          background:"linear-gradient(135deg,#7c6aff,#ec4899)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, fontWeight:900, color:"#fff",
          boxShadow:"0 2px 8px rgba(124,106,255,0.3)" }}>
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
            {isEmpty?"포인트 소진":isLow?`${ptLeft}P 남음`:`${ptLeft.toLocaleString()}P 잔여`}
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
  blog_naver:   { type: "blog_naver",   label: "네이버 블로그 글쓰기" },
  blog_tistory: { type: "blog_tistory", label: "티스토리 블로그 글쓰기" },
  blog_insta:   { type: "blog_insta",   label: "인스타그램 캡션 생성" },
  blog_youtube: { type: "blog_youtube", label: "유튜브 대본 & 설명 생성" },
  blog_thread:  { type: "blog_thread",  label: "스레드 게시물 작성" },
  blog_yt_blog: { type: "blog_yt_blog", label: "링크 글쓰기" },
  blog_link:    { type: "blog_link",   label: "링크 글쓰기" },
  blog_cafe:    { type: "blog_cafe",    label: "네이버 카페 글쓰기" },
};

export { useOnlineCount, AiSidebar, SidebarProfile, BLOG_MAP };
