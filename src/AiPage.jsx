import { useState, useEffect } from "react";
import { Badge, Btn } from "./UI";
import { CardNewsApp, PlannerPanel } from "./CardNewsApp";
import BlogGenerator from "./BlogGenerator";
import NewsBlogGenerator from "./NewsBlogGenerator";
import YtBlogGenerator from "./YtBlogGenerator";
import DetailPageGenerator from "./DetailPageGenerator";
import ImageCardNewsApp from "./ImageCardNewsApp";
import SimpleDetailPageGenerator from "./SimpleDetailPageGenerator";
import SimpleCardNewsGenerator from "./SimpleCardNewsGenerator";
import LogoGenerator from "./LogoGenerator";
import MockupGenerator from "./MockupGenerator";
import ProductShotGenerator from "./ProductShotGenerator";
import ShortformEditor from "./ShortformEditor";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage } from "./storage";

/* ════════════════════════════════════════════════════════════
   AiPage
════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   AiPage – 통합 AI 생성기 (공통 사이드바 + 메뉴별 콘텐츠)
════════════════════════════════════════════════════════════ */

// ── 접속자 카운트 훅 (localStorage heartbeat) ──────────────────────────────
function useOnlineCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const myId = "u_" + Math.random().toString(36).slice(2, 8);
    const KEY = "nper_online_users";
    function hb() {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        const now = Date.now();
        raw[myId] = now;
        Object.keys(raw).forEach(k => { if (now - raw[k] > 30000) delete raw[k]; });
        localStorage.setItem(KEY, JSON.stringify(raw));
        setCount(Object.keys(raw).length);
      } catch(e) {}
    }
    hb();
    const t = setInterval(hb, 15000);
    return () => {
      clearInterval(t);
      try { const raw = JSON.parse(localStorage.getItem(KEY) || "{}"); delete raw[myId]; localStorage.setItem(KEY, JSON.stringify(raw)); } catch(e) {}
    };
  }, []);
  return count;
}



function AiSidebar({ aiMenu, setAiMenu, user, onQna, theme, onlineCount, navigate, onLogout }) {
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
  const [blogOpen,  setBlogOpen]  = useState(true);
  const [cardOpen,  setCardOpen]  = useState(true);
  const [imageOpen, setImageOpen] = useState(true);

  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const pct = Math.min(Math.round(info.used / freeLimit * 100), 100) + "%";

  const Item = ({ id, label, icon, indent }) => {
    const baseId = id.replace('_intro', '');
    const active = aiMenu === id || aiMenu.startsWith(baseId);
    return (
      <button onClick={() => setAiMenu(id)} style={{
        width: "100%", padding: indent ? "8px 12px 8px 28px" : "10px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: indent ? 13 : 14, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: icon ? 7 : 0, marginBottom: 2,
      }}>
        {icon && <span style={{ fontSize: indent ? 13 : 14 }}>{icon}</span>}{label}
      </button>
    );
  };

  const Group = ({ label, icon, active }) => (
    <div style={{
      width: "100%", padding: "7px 10px", borderRadius: 8,
      background: "transparent",
      color: active ? itemActive : brandText,
      fontSize: 14, fontWeight: 800, letterSpacing: 0.2, marginBottom: 2,
      borderLeft: "3px solid transparent",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <span>{icon}</span>{label}
    </div>
  );

  return (
    <div style={{
      width: 210, flexShrink: 0, background: sideBg,
      borderRight: `1px solid ${sideBdr}`,
      display: "flex", flexDirection: "column", height: "100%", overflow: "visible",
      position: "relative",
    }}>
      {/* 브랜드 */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${sideBdr}` }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: brandText }}>SNS메이킷</div>
        <div style={{ fontSize: 9, color: brandSub, marginTop: 1 }}>AI 콘텐츠 생성기</div>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px", flex: 1, overflowY: "auto", overflowX: "visible" }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home" label="홈" icon="" />
        <Item id="library" label="보관함" icon="" />

        {/* SNS 글쓰기 그룹 */}
        <Group label="SNS 글쓰기" icon="" active={!!(aiMenu && (aiMenu.startsWith("blog")))} />
        {blogOpen && <>
          <Item id="blog_naver_intro"   label="네이버 블로그"   icon="" indent />
          <Item id="blog_tistory_intro" label="티스토리"        icon="" indent />
          <Item id="blog_insta_intro"   label="인스타그램 캡션" icon="" indent />
          <Item id="blog_youtube_intro" label="유튜브 대본"     icon="" indent />
          <Item id="blog_thread_intro"  label="스레드"          icon="" indent />
          <Item id="blog_yt_blog_intro" label="유튜브로 글쓰기" icon="" indent />
          <Item id="blog_news_intro"    label="뉴스로 글쓰기"   icon="" indent />
        </>}

        {/* SNS 이미지 그룹 */}
        <Group label="SNS 이미지" icon="" active={!!(aiMenu && (aiMenu==="cardnews_simple"||aiMenu==="cardnews_image"||aiMenu==="detail_simple"||aiMenu==="detail_image"))} />
        {cardOpen && <>
          <Item id="cardnews_simple" label="심플 카드뉴스"   icon="" indent />
          <Item id="cardnews_image"  label="이미지 카드뉴스" icon="" indent />
          <Item id="detail_simple"   label="심플 상세페이지" icon="" indent />
          <Item id="detail_image"    label="이미지 상세페이지" icon="" indent />
        </>}

        {/* 이미지 생성 그룹 */}
        <Group label="이미지 생성" icon="" active={!!(aiMenu && (aiMenu==="image_gen"||aiMenu==="logo_gen"||aiMenu==="mockup_gen"||aiMenu==="product_shot"))} />
        {imageOpen && <>
          <Item id="product_shot" label="제품컷 생성"  icon="" indent />
          <Item id="logo_gen"     label="로고 생성"    icon="" indent />
          <Item id="mockup_gen"   label="목업 생성"    icon="" indent />
        </>}

        {user?.role === "admin" && <Item id="shorts" label="숏폼편집 👑" icon="" />}


      </div>

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
                {isEmpty?"⚠️ 포인트 소진 · 충전이 필요해요":"⚡ 1~2회 생성 가능 · 충전을 권장해요"}
              </div>
            )}
          </div>

          {/* 메뉴 */}
          <div style={{ padding:"6px 8px" }}>
            {[
              { label:"포인트 충전", sub:"더 많은 AI 생성", onClick:()=>{ navigate("pricing"); setOpen(false); },
                accent:true },
              { label:"내 보관함", sub:"생성한 글·카드뉴스", onClick:()=>setOpen(false) },
            ].map((item,i) => (
              <button key={i} onClick={item.onClick}
                style={{ width:"100%", padding:"9px 10px", border:"none", borderRadius:9,
                  background:"transparent", cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:10, transition:"background 0.12s" }}
                onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                  background: item.accent?"linear-gradient(135deg,#7c6aff,#a855f7)":isDark?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                  {item.accent?"💎":"📁"}
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
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🚪</div>
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
            {isEmpty?"⚠️ 포인트 소진":isLow?`⚡ ${ptLeft}P 남음`:`${ptLeft.toLocaleString()}P 잔여`}
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
  blog_yt_blog: { type: "blog_yt_blog",  label: "유튜브로 글쓰기" },
};


// ── 블로그 글 저장/불러오기 헬퍼 ──────────────────────────────────────────────
const BLOG_SAVES_KEY = "sns_blog_saves_v1";
function getBlogSaves() { try { return JSON.parse(localStorage.getItem(BLOG_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function saveBlogWork(item) {
  const list = getBlogSaves().filter(x => x.id !== item.id);
  list.unshift(item);
  try { localStorage.setItem(BLOG_SAVES_KEY, JSON.stringify(list.slice(0, 100))); } catch(e) {}
}
function deleteBlogWork(id) {
  try { localStorage.setItem(BLOG_SAVES_KEY, JSON.stringify(getBlogSaves().filter(x => x.id !== id))); } catch(e) {}
}
const CARD_SAVES_KEY = "nper_saved_works_v2";
function getCardSaves() { try { return JSON.parse(localStorage.getItem(CARD_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteCardWork(id) {
  try { localStorage.setItem(CARD_SAVES_KEY, JSON.stringify(getCardSaves().filter(x => x.id !== id))); } catch(e) {}
}
const DETAIL_SAVES_KEY = "nper_detail_saves_v1";
function getDetailSaves() { try { return JSON.parse(localStorage.getItem(DETAIL_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteDetailSave(id) {
  try { localStorage.setItem(DETAIL_SAVES_KEY, JSON.stringify(getDetailSaves().filter(x => x.id !== id))); } catch(e) {}
}

// ── LibraryPage 컴포넌트 ──────────────────────────────────────────────────────
function LibraryPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu }) {
  const [tab, setTab] = useState("blog");
  const [blogList, setBlogList] = useState(getBlogSaves);
  const [cardList, setCardList] = useState(getCardSaves);
  const [detailList, setDetailList] = useState(getDetailSaves);
  const [search, setSearch] = useState("");
  const [selectedBlog, setSelectedBlog] = useState(null);

  const text  = homeText;
  const muted = homeMuted;
  const bdr   = cardBdr;
  const bg    = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#6366f1";

  const filteredBlog = blogList.filter(x =>
    !search || x.title.toLowerCase().includes(search.toLowerCase()) || (x.type||"").includes(search)
  );
  const filteredCard = cardList.filter(x =>
    !search || (x.topic||"").toLowerCase().includes(search.toLowerCase())
  );
  const total = blogList.length + cardList.length + detailList.length;

  const typeLabel = {
    blog_naver:"네이버", blog_tistory:"티스토리", blog_insta:"인스타",
    blog_youtube:"유튜브", blog_thread:"스레드", blog_news:"뉴스블로그",
    blog_yt_blog:"유튜브블로그"
  };
  const typeColor = {
    blog_naver:"#4ade80", blog_tistory:"#f97316", blog_insta:"#ec4899",
    blog_youtube:"#ef4444", blog_thread:"#6366f1", blog_news:"#06b6d4",
    blog_yt_blog:"#ef4444"
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>📁 내 보관함</div>
          <div style={{ fontSize:13, color:muted }}>총 {total}개 저장됨 · 자동 저장됩니다</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="검색..."
          style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${bdr}`, background:inputBg,
            color:text, fontSize:13, outline:"none", width:180 }} />
      </div>

      {/* 탭 */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background: isDark?"rgba(255,255,255,0.05)":"#e9e9ef", borderRadius:10, padding:4, width:"fit-content" }}>
        {[["blog","✍️ 블로그·SNS 글","blog"], ["card","🖼 카드뉴스","card"], ["detail","🛍 상세페이지","detail"]].map(([id, label]) => (
          <button key={id} onClick={()=>{ setTab(id); setSelectedBlog(null); }}
            style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              background: tab===id ? (isDark?"rgba(99,102,241,0.5)":"#fff") : "transparent",
              color: tab===id ? (isDark?"#fff":accent) : muted,
              boxShadow: tab===id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {label}
            <span style={{ marginLeft:6, fontSize:11, opacity:0.7 }}>
              {id==="blog" ? blogList.length : id==="card" ? cardList.length : detailList.length}
            </span>
          </button>
        ))}
      </div>

      {/* 블로그 목록 */}
      {tab === "blog" && (
        <>
          {filteredBlog.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✍️</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 글이 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>글 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("blog_naver")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
                블로그 글 작성하기 →
              </button>
            </div>
          ) : selectedBlog ? (
            /* 글 상세 보기 */
            <div>
              <button onClick={()=>setSelectedBlog(null)}
                style={{ marginBottom:14, padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`,
                  background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
                ← 목록으로
              </button>
              <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:16, padding:"24px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:6,
                    background: isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)", color:typeColor[selectedBlog.type]||accent }}>
                    {typeLabel[selectedBlog.type]||"블로그"}
                  </span>
                  <span style={{ fontSize:11, color:muted }}>{selectedBlog.date}</span>
                </div>
                <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:20 }}>{selectedBlog.title}</div>
                <div style={{ fontSize:14, color:isDark?"rgba(255,255,255,0.75)":"#333", lineHeight:2,
                  whiteSpace:"pre-wrap", background: isDark?"rgba(255,255,255,0.03)":"#f9f9f9",
                  borderRadius:12, padding:"20px 22px", border:`1px solid ${bdr}` }}>
                  {selectedBlog.content}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button onClick={()=>{ navigator.clipboard.writeText(selectedBlog.content); }}
                    style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${bdr}`,
                      background:"transparent", color:accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    📋 복사
                  </button>
                  <button onClick={()=>{ deleteBlogWork(selectedBlog.id); setBlogList(getBlogSaves()); setSelectedBlog(null); }}
                    style={{ padding:"9px 18px", borderRadius:9, border:"1px solid rgba(248,113,113,0.3)",
                      background:"transparent", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    🗑 삭제
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredBlog.map(item => (
                <div key={item.id} onClick={()=>setSelectedBlog(item)}
                  style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12,
                    padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:14,
                    transition:"opacity 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5,
                        background: isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)",
                        color: typeColor[item.type]||muted }}>
                        {typeLabel[item.type]||"블로그"}
                      </span>
                      <span style={{ fontSize:11, color:muted }}>{item.date}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize:12, color:muted, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", lineHeight:1.6 }}>
                      {item.content?.slice(0,80)}...
                    </div>
                  </div>
                  <button onClick={e=>{ e.stopPropagation(); deleteBlogWork(item.id); setBlogList(getBlogSaves()); }}
                    style={{ flexShrink:0, padding:"4px 10px", borderRadius:7, border:"none",
                      background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 카드뉴스 목록 */}
      {tab === "card" && (
        <>
          {filteredCard.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🖼</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 카드뉴스가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>카드뉴스 편집 화면에서 저장하면 여기 표시됩니다</div>
              <button onClick={()=>setAiMenu("cardnews_simple")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
                카드뉴스 만들기 →
              </button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
              {filteredCard.map(item => (
                <div key={item.id}
                  style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:14, overflow:"hidden",
                    display:"flex", flexDirection:"column" }}>
                  {item.thumb ? (
                    <img src={item.thumb} alt={item.topic}
                      style={{ width:"100%", aspectRatio:"1", objectFit:"cover", display:"block" }} />
                  ) : (
                    <div style={{ width:"100%", aspectRatio:"1", background: isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.06)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>🃏</div>
                  )}
                  <div style={{ padding:"12px 12px 10px" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {item.topic || "제목 없음"}
                    </div>
                    <div style={{ fontSize:11, color:muted, marginBottom:10 }}>
                      {item.count}장 · {item.date}
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{
                        try { localStorage.setItem("nper_open_card", JSON.stringify(item)); } catch {}
                        setAiMenu("cardnews_simple_open");
                      }}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`,
                          background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        열기
                      </button>
                      <button onClick={()=>{ deleteCardWork(item.id); setCardList(getCardSaves()); }}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none",
                          background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 상세페이지 탭 */}
      {tab === "detail" && (
        <>
          {detailList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🛍</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 상세페이지가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>상세페이지 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("detail_simple")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:13, fontWeight:700 }}>
                상세페이지 만들기 →
              </button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              {detailList.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>🛍</div>}
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:5 }}>{item.count}장</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.productName}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                      <button onClick={()=>{
                        try { localStorage.setItem("nper_open_detail", JSON.stringify(item)); } catch {}
                        setAiMenu("detail_simple_open");
                      }}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`,
                          background:"transparent", color:"#10b981", fontSize:11, fontWeight:700, cursor:"pointer", marginRight:6 }}>
                        열기
                      </button>
                      <button onClick={()=>{ if(window.confirm(`"${item.productName}" 를 삭제할까요?`)){ deleteDetailSave(item.id); setDetailList(getDetailSaves()); } }}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none",
                          background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
                    </div>
                    {item.images?.length > 1 && (
                      <div style={{ display:"flex", gap:4, marginTop:8, overflowX:"auto" }}>
                        {item.images.slice(1,5).map((img,i)=>(
                          <img key={i} src={img} alt="" style={{ width:36, height:36, objectFit:"cover", borderRadius:5, flexShrink:0 }}/>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AiContent({ aiMenu, user, setAiMenu, navigate, theme, onLoginRequest, onUserUpdate }) {
  const isDark = theme === "dark";
  const homeText  = isDark ? "#fff"                   : "#1a1a2e";
  const homeMuted = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const cardBdr   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardDescC = isDark ? "rgba(255,255,255,0.4)"  : "#888";

  // 보관함
  if (aiMenu === "library") {
    return <LibraryPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} cardDescC={cardDescC} setAiMenu={setAiMenu} />;
  }

  // 홈
  if (!aiMenu || aiMenu === "home") {
    const MENUS = [
      { id: "blog_naver_intro",    icon: "📝", title: "네이버 블로그",   desc: "SEO 최적화 블로그 포스트", cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)"  },
      { id: "blog_tistory_intro",  icon: "🟠", title: "티스토리",        desc: "티스토리용 블로그 글",     cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(255,107,53,0.07)"  },
      { id: "blog_insta_intro",    icon: "📱", title: "인스타그램 캡션", desc: "인스타 게시물 캡션",       cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "blog_youtube_intro",  icon: "▶️", title: "유튜브 대본",     desc: "영상 대본 & 설명란",       cr: 10, darkColor: "rgba(239,68,68,0.18)",   lightColor: "rgba(239,68,68,0.07)"   },
      { id: "blog_thread_intro",   icon: "🧵", title: "스레드",          desc: "스레드 게시물 작성",       cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(0,0,0,0.04)"       },
      { id: "blog_yt_blog_intro",  icon: "📺", title: "유튜브로 글쓰기", desc: "유튜브 영상으로 글 작성",  cr: 10, darkColor: "rgba(239,68,68,0.18)",   lightColor: "rgba(239,68,68,0.05)"   },
      { id: "blog_news_intro",     icon: "📰", title: "뉴스로 글쓰기",   desc: "뉴스 기사로 블로그 작성",  cr: 10, darkColor: "rgba(6,182,212,0.18)",   lightColor: "rgba(6,182,212,0.07)"   },
      { id: "cardnews_simple",  icon: "✨", title: "심플 카드뉴스",    desc: "텍스트 편집 방식",         cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)"  },
      { id: "cardnews_image",   icon: "🖼", title: "이미지 카드뉴스",  desc: "AI 이미지 슬라이드 생성",  cr: 30, darkColor: "rgba(139,92,246,0.18)",  lightColor: "rgba(139,92,246,0.07)"  },
      { id: "detail_simple",    icon: "📋", title: "심플 상세페이지",  desc: "텍스트 편집 방식",         cr: 10, darkColor: "rgba(16,185,129,0.18)",  lightColor: "rgba(16,185,129,0.07)"  },
      { id: "detail_image",     icon: "🛍", title: "이미지 상세페이지",desc: "AI 이미지 상세페이지",     cr: 30, darkColor: "rgba(245,158,11,0.18)",  lightColor: "rgba(245,158,11,0.07)"  },
      { id: "image_gen",        icon: "🎨", title: "이미지 생성",      desc: "AI 이미지 자유 생성",      cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "product_shot", icon: "🛍", title: "제품컷 생성", desc: "AI 광고용 제품 이미지", cr: 10, darkColor: "rgba(249,115,22,0.18)",  lightColor: "rgba(249,115,22,0.07)"  },
      { id: "logo_gen",   icon: "🏷", title: "로고 생성",  desc: "AI 맞춤 로고 제작",   cr: 10, darkColor: "rgba(6,182,212,0.18)",   lightColor: "rgba(6,182,212,0.07)"   },
      { id: "mockup_gen", icon: "🎨", title: "목업 생성",  desc: "제품·브랜드 목업 제작", cr: 10, darkColor: "rgba(124,58,237,0.18)",  lightColor: "rgba(124,58,237,0.07)"  },
      ...(user?.role === "admin" ? [{ id: "shorts", icon: "✂️", title: "숏폼편집 👑", desc: "유튜브→숏폼 AI 기획 (관리자)", cr: 10, darkColor: "rgba(239,68,68,0.18)", lightColor: "rgba(239,68,68,0.07)" }] : []),
    ];
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, marginBottom: 5, color: homeText }}>AI 생성기에 오신 걸 환영해요! 👋</div>
          <div style={{ fontSize: 13, color: homeMuted }}>왼쪽 메뉴에서 원하는 콘텐츠 타입을 선택해주세요</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
          {MENUS.map(m => (
            <div key={m.id} onClick={() => setAiMenu(m.id)} style={{
              background: isDark ? m.darkColor : m.lightColor,
              border: `1px solid ${cardBdr}`,
              borderRadius: 12, padding: "16px 14px", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 6 }}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                {m.cr > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: isDark ? "rgba(255,255,255,0.5)" : "#888", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", borderRadius: 5, padding: "2px 6px" }}>{m.cr}P</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3, color: homeText }}>{m.title}</div>
              <div style={{ fontSize: 11, color: cardDescC, lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 인트로 소개 화면 컴포넌트 (블로그 + SNS 이미지 공용) ─────
  const IntroScreen = ({ icon, title, subtitle, badge, color, steps, features, cta, onStart }) => {
    const D = isDark;
    const t = D?"#fff":"#1a1a2e";
    const m = D?"rgba(255,255,255,0.5)":"#888";
    const bdr = D?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)";
    const cardBg = D?"rgba(255,255,255,0.04)":"#fff";
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 28px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{icon}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:`${color}18`, border:`1px solid ${color}40`, marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color }}>{badge}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:900, color:t, letterSpacing:-0.5, marginBottom:8 }}>{title}</div>
            <div style={{ fontSize:14, color:m, lineHeight:1.8, maxWidth:440, margin:"0 auto" }}>{subtitle}</div>
          </div>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:800, color:t, marginBottom:14 }}>📋 이런 순서로 제작돼요</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {steps.map((s,i)=>(
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", borderRadius:11, background:cardBg, border:`1px solid ${bdr}` }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:`${color}20`, border:`1.5px solid ${color}50`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color, flexShrink:0 }}>{i+1}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:t, marginBottom:2 }}>{s.title}</div>
                    <div style={{ fontSize:12, color:m, lineHeight:1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding:"16px 18px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:800, color:t, marginBottom:12 }}>✨ 주요 특징</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {features.map((f,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, background:`${color}10`, border:`1px solid ${color}30` }}>
                  <span style={{ fontSize:14 }}>{f.icon}</span>
                  <span style={{ fontSize:12, color, fontWeight:600 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onStart}
            style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${color},${color}cc)`, color:"#fff", fontSize:16, fontWeight:900, boxShadow:`0 8px 28px ${color}40` }}>
            {cta} →
          </button>
        </div>
      </div>
    );
  };

  // ── 블로그 인트로 데이터 ───────────────────────────────────
  const BLOG_INTRO = {
    blog_naver: {
      icon:"📝", title:"네이버 블로그", badge:"SEO 최적화 · 장문 콘텐츠", color:"#4ade80",
      subtitle:"키워드 기반 SEO 최적화 네이버 블로그 포스트를 AI가 자동 작성해줘요. 소제목 구조와 자연스러운 문체로 완성돼요.",
      steps:[
        { title:"주제 입력", desc:"블로그 주제나 키워드를 입력하거나 예시에서 선택해요." },
        { title:"세부 설정", desc:"글의 톤(친근/전문), 분량, 대상 독자를 설정해요." },
        { title:"AI 글쓰기", desc:"AI가 서론·본론·결론 구조로 완성된 블로그 글을 작성해요." },
        { title:"복사 & 활용", desc:"생성된 글을 복사해 네이버 블로그에 바로 붙여넣기해요." },
      ],
      features:[
        { icon:"🔍", label:"SEO 최적화" }, { icon:"📄", label:"장문 작성" },
        { icon:"💎", label:"10P" }, { icon:"📋", label:"복사 저장" },
      ],
      cta:"네이버 블로그 글 작성하기",
    },
    blog_tistory: {
      icon:"🟠", title:"티스토리 블로그", badge:"구조화된 포스팅 · HTML 지원", color:"#f97316",
      subtitle:"티스토리에 최적화된 구조로 블로그 포스트를 생성해줘요. 가독성 높은 소제목과 정보 구조로 완성돼요.",
      steps:[
        { title:"주제 입력", desc:"포스팅할 주제나 키워드를 입력해요." },
        { title:"세부 설정", desc:"글의 톤, 분량, 포함할 내용을 설정해요." },
        { title:"AI 글쓰기", desc:"AI가 티스토리 형식에 맞는 포스트를 작성해요." },
        { title:"복사 & 활용", desc:"생성된 글을 복사해 티스토리에 바로 붙여넣기해요." },
      ],
      features:[
        { icon:"📑", label:"구조화 포스팅" }, { icon:"✍️", label:"자연스러운 문체" },
        { icon:"💎", label:"10P" }, { icon:"📋", label:"복사 저장" },
      ],
      cta:"티스토리 글 작성하기",
    },
    blog_insta: {
      icon:"📱", title:"인스타그램 캡션", badge:"짧고 임팩트있는 · 해시태그 포함", color:"#ec4899",
      subtitle:"인스타그램 게시물에 딱 맞는 캡션과 해시태그를 AI가 생성해줘요. 감성적이고 임팩트 있는 문구로 완성돼요.",
      steps:[
        { title:"주제/이미지 설명 입력", desc:"게시할 사진이나 영상의 주제·내용을 설명해요." },
        { title:"톤 설정", desc:"감성적·유머러스·정보성 등 원하는 분위기를 선택해요." },
        { title:"AI 캡션 생성", desc:"AI가 캡션 본문과 관련 해시태그를 함께 작성해줘요." },
        { title:"복사 & 게시", desc:"캡션을 복사해 인스타그램에 바로 붙여넣기해요." },
      ],
      features:[
        { icon:"#️⃣", label:"해시태그 자동 생성" }, { icon:"💬", label:"감성 문구" },
        { icon:"💎", label:"10P" }, { icon:"📋", label:"복사 저장" },
      ],
      cta:"인스타그램 캡션 작성하기",
    },
    blog_youtube: {
      icon:"▶️", title:"유튜브 대본", badge:"영상 대본 · 설명란 포함", color:"#ef4444",
      subtitle:"유튜브 영상 대본과 설명란 텍스트를 AI가 작성해줘요. 시청자의 흥미를 끄는 인트로부터 아웃트로까지 완성돼요.",
      steps:[
        { title:"영상 주제 입력", desc:"만들 영상의 주제와 핵심 내용을 입력해요." },
        { title:"채널 스타일 설정", desc:"채널 분위기와 대상 시청자층을 설정해요." },
        { title:"AI 대본 생성", desc:"AI가 인트로·본론·아웃트로 구조의 대본을 작성해요." },
        { title:"복사 & 활용", desc:"대본과 설명란 텍스트를 복사해 바로 사용해요." },
      ],
      features:[
        { icon:"🎬", label:"대본 + 설명란" }, { icon:"🎤", label:"자연스러운 말투" },
        { icon:"💎", label:"10P" }, { icon:"📋", label:"복사 저장" },
      ],
      cta:"유튜브 대본 작성하기",
    },
    blog_thread: {
      icon:"🧵", title:"스레드", badge:"짧고 임팩트있는 · 연속 게시", color:"#a855f7",
      subtitle:"스레드(Threads)에 올릴 짧고 임팩트 있는 게시물을 AI가 작성해줘요. 연속 스레드 형식으로도 생성돼요.",
      steps:[
        { title:"주제 입력", desc:"스레드에 올릴 주제나 하고 싶은 이야기를 입력해요." },
        { title:"형식 선택", desc:"단일 포스트 또는 연속 스레드 형식을 선택해요." },
        { title:"AI 글쓰기", desc:"AI가 스레드 특유의 짧고 임팩트 있는 글을 작성해요." },
        { title:"복사 & 게시", desc:"완성된 게시물을 복사해 스레드에 바로 올려요." },
      ],
      features:[
        { icon:"⚡", label:"짧고 강렬한 글" }, { icon:"🔗", label:"연속 스레드" },
        { icon:"💎", label:"10P" }, { icon:"📋", label:"복사 저장" },
      ],
      cta:"스레드 게시물 작성하기",
    },
    blog_yt_blog: {
      icon:"📺", title:"유튜브로 글쓰기", badge:"영상 → 블로그 자동 변환", color:"#ef4444",
      subtitle:"유튜브 영상 URL을 입력하면 영상 내용을 분석해 블로그 포스트로 자동 변환해줘요. 영상 하나로 블로그 글까지!",
      steps:[
        { title:"유튜브 URL 입력", desc:"변환할 유튜브 영상 URL을 붙여넣기해요." },
        { title:"AI 영상 분석", desc:"AI가 영상의 자막·내용을 분석해요." },
        { title:"블로그 글 변환", desc:"영상 내용을 구조화된 블로그 포스트로 변환해요." },
        { title:"복사 & 활용", desc:"완성된 블로그 글을 복사해 바로 사용해요." },
      ],
      features:[
        { icon:"🔗", label:"URL만 입력" }, { icon:"🤖", label:"AI 자동 분석" },
        { icon:"💎", label:"10P" }, { icon:"⚡", label:"빠른 변환" },
      ],
      cta:"유튜브 영상으로 글쓰기",
    },
    blog_news: {
      icon:"📰", title:"뉴스로 글쓰기", badge:"뉴스 기사 → 블로그 변환", color:"#06b6d4",
      subtitle:"뉴스 기사 URL을 입력하면 기사 내용을 분석해 나만의 블로그 포스트로 자동 변환해줘요. 트렌드를 콘텐츠로!",
      steps:[
        { title:"뉴스 URL 입력", desc:"활용할 뉴스 기사 URL을 붙여넣기해요." },
        { title:"AI 기사 분석", desc:"AI가 기사의 핵심 내용을 파악해요." },
        { title:"블로그 글 변환", desc:"기사 내용을 나만의 시각으로 재작성한 블로그 글을 생성해요." },
        { title:"복사 & 활용", desc:"완성된 포스트를 복사해 블로그에 게시해요." },
      ],
      features:[
        { icon:"🔗", label:"URL만 입력" }, { icon:"📡", label:"최신 트렌드" },
        { icon:"💎", label:"10P" }, { icon:"✍️", label:"나만의 시각" },
      ],
      cta:"뉴스로 블로그 글쓰기",
    },
  };

  // 뉴스로 글쓰기
  if (aiMenu === "blog_news") {
    return (
      <div key="news_blog" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NewsBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
      </div>
    );
  }
  if (aiMenu === "blog_news_intro") {
    const d = BLOG_INTRO.blog_news;
    return <IntroScreen {...d} onStart={()=>setAiMenu("blog_news")} />;
  }

  // 유튜브로 글쓰기
  if (aiMenu === "blog_yt_blog") {
    return (
      <div key="yt_blog" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <YtBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
      </div>
    );
  }
  if (aiMenu === "blog_yt_blog_intro") {
    const d = BLOG_INTRO.blog_yt_blog;
    return <IntroScreen {...d} onStart={()=>setAiMenu("blog_yt_blog")} />;
  }

  // 블로그 계열 인트로
  if (aiMenu.endsWith("_intro") && aiMenu.startsWith("blog_")) {
    const baseId = aiMenu.replace("_intro", "");
    const d = BLOG_INTRO[baseId];
    if (d) return <IntroScreen {...d} onStart={()=>setAiMenu(baseId)} />;
  }

  // 블로그 계열 생성기
  if (aiMenu.startsWith("blog_")) {
    const info = BLOG_MAP[aiMenu] || { type: "blog", label: "블로그 글쓰기" };
    return (
      <div key={aiMenu} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BlogGenerator initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 보관함에서 심플 카드뉴스 열기
  if (aiMenu === "cardnews_simple_open") {
    return (
      <div key="cn_simple_open" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} openFromLibrary  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 보관함에서 심플 상세페이지 열기
  if (aiMenu === "detail_simple_open") {
    return (
      <div key="detail_simple_open" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} openFromLibrary  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 심플 카드뉴스 인트로 or 생성기
  if (aiMenu === "cardnews_simple" || aiMenu === "cardnews_make") {
    if (aiMenu === "cardnews_simple") {
      return (
        <IntroScreen menuId="cardnews_simple" icon="" title="심플 카드뉴스" badge="텍스트 편집 방식 · 빠른 제작"
          subtitle="주제만 입력하면 AI가 슬라이드 텍스트를 자동 생성해줘요. 배경색과 글자 스타일을 자유롭게 수정할 수 있어요."
          color="#6366f1"
          steps={[
            { title:"주제 입력", desc:"만들고 싶은 카드뉴스 주제를 입력해요. AI 추천으로 더 구체적인 방향을 잡을 수 있어요." },
            { title:"슬라이드 기획", desc:"각 슬라이드의 제목·내용을 AI가 자동 추천하거나 직접 입력할 수 있어요." },
            { title:"디자인 선택 + 사이즈", desc:"스타일 프리셋과 이미지 크기를 선택해요." },
            { title:"텍스트 편집 + 저장", desc:"제목/본문 수정, 배경색·글자색 변경, 정렬 설정 후 PNG/ZIP 저장" },
          ]}
          features={[
            { icon:"⚡", label:"빠른 제작" },
            { icon:"💎", label:"10P" },
            { icon:"🎨", label:"배경색 자유 변경" },
            { icon:"📸", label:"배경 이미지 업로드" },
            { icon:"↔", label:"정렬 조절" },
            { icon:"📥", label:"PNG/ZIP 저장" },
          ]}
          cta="심플 카드뉴스 만들기"
          onStart={()=>setAiMenu("cardnews_simple_make")}
        />
      );
    }
    return (
      <div key="cn_simple" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }
  if (aiMenu === "cardnews_simple_make") {
    return (
      <div key="cn_simple_make" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 이미지 카드뉴스 인트로 or 생성기
  if (aiMenu === "cardnews_image" || aiMenu === "cardnews_image_make") {
    if (aiMenu === "cardnews_image") {
      return (
        <IntroScreen menuId="cardnews_image" icon="" title="이미지 카드뉴스" badge="AI 이미지 생성 방식 · 고품질"
          subtitle="주제를 입력하면 AI가 실제 사진 품질의 이미지 슬라이드를 생성해줘요. 슬라이드마다 재생성이 가능해요."
          color="#8b5cf6"
          steps={[
            { title:"주제 입력", desc:"카드뉴스 주제와 들어갈 내용을 입력해요. AI 추천으로 더 구체적인 방향을 잡을 수 있어요." },
            { title:"슬라이드 기획", desc:"각 슬라이드의 헤드라인·본문을 AI가 자동 추천하거나 직접 입력해요." },
            { title:"디자인 스타일 + 사이즈", desc:"10가지 스타일 템플릿과 이미지 크기를 선택해요." },
            { title:"AI 이미지 생성 + 저장", desc:"AI가 슬라이드마다 고품질 이미지를 생성해요. PNG/ZIP 저장 가능" },
          ]}
          features={[
            { icon:"🤖", label:"AI 이미지 생성" },
            { icon:"💎", label:"슬라이드당 30P" },
            { icon:"🎨", label:"10가지 스타일" },
            { icon:"🔄", label:"슬라이드 재생성" },
            { icon:"📐", label:"4가지 사이즈" },
            { icon:"📦", label:"ZIP 다운로드" },
          ]}
          cta="이미지 카드뉴스 만들기"
          onStart={()=>setAiMenu("cardnews_image_make")}
        />
      );
    }
    return (
      <div key="cn_image" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <ImageCardNewsApp isDark={isDark} user={user}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 심플 상세페이지 인트로 or 생성기
  if (aiMenu === "detail_simple" || aiMenu === "detail_simple_make") {
    if (aiMenu === "detail_simple") {
      return (
        <IntroScreen menuId="detail_simple" icon="" title="심플 상세페이지" badge="텍스트 편집 방식 · 빠른 제작"
          subtitle="상품 정보를 입력하면 AI가 상세페이지 슬라이드 텍스트를 자동 구성해줘요. 배경과 글자 스타일을 자유롭게 수정할 수 있어요."
          color="#10b981"
          steps={[
            { title:"상품 정보 입력", desc:"카테고리·상품명·핵심 특징 등 상품 정보를 입력해요. AI 문구 추천도 제공해요." },
            { title:"슬라이드 기획", desc:"각 슬라이드의 헤드라인·본문을 AI가 자동 추천하거나 직접 입력해요." },
            { title:"디자인 선택 + 사이즈", desc:"스타일 프리셋과 이미지 크기를 선택해요. 세로형이 기본이에요." },
            { title:"텍스트 편집 + 저장", desc:"제목/본문 수정, 배경색·글자색 변경, 정렬 설정 후 PNG/ZIP 저장" },
          ]}
          features={[
            { icon:"⚡", label:"빠른 제작" },
            { icon:"💎", label:"10P" },
            { icon:"🎨", label:"배경색 자유 변경" },
            { icon:"📸", label:"배경 이미지 업로드" },
            { icon:"↕", label:"세로/가로 정렬" },
            { icon:"📥", label:"PNG/ZIP 저장" },
          ]}
          cta="심플 상세페이지 만들기"
          onStart={()=>setAiMenu("detail_simple_make")}
        />
      );
    }
    return (
      <div key="detail_simple" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 이미지 상세페이지 인트로 or 생성기
  if (aiMenu === "detail_image" || aiMenu === "detail_image_make" || aiMenu === "detail_page") {
    if (aiMenu === "detail_image") {
      return (
        <IntroScreen menuId="detail_image" icon="" title="이미지 상세페이지" badge="AI 이미지 생성 방식 · 최고 품질"
          subtitle="상품 정보를 입력하면 AI가 실제 사진 품질의 상세페이지 이미지를 생성해줘요. 참고 이미지 스타일 분석도 가능해요."
          color="#f59e0b"
          steps={[
            { title:"상품 정보 입력", desc:"카테고리·상품명·특징·가격·타겟 고객 등 상세 정보를 입력해요." },
            { title:"슬라이드 기획", desc:"최대 20장의 슬라이드 구성을 기획해요. 각 슬라이드 문구를 AI가 추천해줘요." },
            { title:"디자인 + 사이즈 선택", desc:"10가지 스타일 템플릿, 참고 이미지 업로드, 이미지 크기를 선택해요." },
            { title:"AI 이미지 생성 + 저장", desc:"AI가 각 슬라이드를 고품질 상업용 이미지로 생성해요. 개별 재생성 가능" },
          ]}
          features={[
            { icon:"🤖", label:"AI 이미지 생성" },
            { icon:"💎", label:"슬라이드당 30P" },
            { icon:"🖼", label:"참고 이미지 분석" },
            { icon:"🔄", label:"개별 재생성" },
            { icon:"📐", label:"최대 20장" },
            { icon:"📦", label:"ZIP 다운로드" },
          ]}
          cta="이미지 상세페이지 만들기"
          onStart={()=>setAiMenu("detail_image_make")}
        />
      );
    }
    return (
      <div key="detail_image" style={{ flex:1, overflowY:"auto", background: isDark?"transparent":"#f4f4f8" }}>
        <DetailPageGenerator isDark={isDark} user={user}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 카드뉴스 기획 패널
  if (aiMenu === "cardnews_plan") {
    return (
      <div key="cn_plan" style={{ flex:1, display:"flex", overflow:"hidden", background: theme==="dark"?"#0f0c29":"#f4f4f8" }}>
        <PlannerPanel inline theme={theme}
          onClose={()=>{}}
          onApplySlides={(slides)=>{
            try { localStorage.setItem("nper_plan_slides", JSON.stringify(slides)); } catch(e) {}
            setAiMenu("cardnews_simple_make");
          }}
        />
      </div>
    );
  }

  // 이미지 생성
  if (aiMenu === "image_gen") {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:18, padding:40, textAlign:"center", background: isDark?"transparent":"#f4f4f8" }}>
        <div style={{ fontSize:72 }}>🎨</div>
        <div style={{ fontSize:22, fontWeight:900, color: isDark?"#fff":"#1a1a2e" }}>이미지 생성</div>
        <div style={{ fontSize:14, color: isDark?"rgba(255,255,255,0.45)":"#888", lineHeight:2 }}>AI 이미지 자유 생성 기능 🔧<br/>곧 업데이트될 예정이에요.</div>
      </div>
    );
  }

  // 제품컷 생성
  if (aiMenu === "product_shot") {
    return (
      <div key="product_shot" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 로고 생성
  if (aiMenu === "logo_gen") {
    return (
      <div key="logo_gen" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <LogoGenerator isDark={isDark} user={user}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 목업 생성
  if (aiMenu === "mockup_gen") {
    return (
      <div key="mockup_gen" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <MockupGenerator isDark={isDark} user={user}  onUserUpdate={onUserUpdate} />
      </div>
    );
  }


  // 회원정보
  if (aiMenu === "profile") {
    if (!user) return null;
    const nick = user.nick || user.email?.split("@")[0] || "사용자";
    const initial = nick[0]?.toUpperCase() || "U";
    const joinDate = user.joinDate ? new Date(user.joinDate).toLocaleDateString("ko-KR") : "-";
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("ko-KR") : "-";
    const pts = user.points || 0;
    const bdr2 = isDark ? "rgba(255,255,255,0.08)" : "#e9ecef";
    const card2 = isDark ? "rgba(255,255,255,0.04)" : "#fff";
    return (
      <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ maxWidth:520, margin:"0 auto", padding:"32px 20px 60px" }}>
          {/* 프로필 카드 */}
          <div style={{ borderRadius:16, border:`1px solid ${bdr2}`, background:card2, padding:"24px", marginBottom:16, textAlign:"center" }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#7c6aff,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:900, color:"#fff", margin:"0 auto 12px" }}>
              {initial}
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:isDark?"#fff":"#1a1a2e", marginBottom:4 }}>{nick}</div>
            <div style={{ fontSize:13, color:isDark?"rgba(255,255,255,0.5)":"#888", marginBottom:10 }}>{user.email}</div>
            <div style={{ display:"inline-block", padding:"4px 14px", borderRadius:10, fontSize:12, fontWeight:700,
              background: user.role==="admin" ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.12)",
              color: user.role==="admin" ? "#fbbf24" : "#a5b4fc" }}>
              {user.role==="admin" ? "관리자" : "일반회원"}
            </div>
          </div>
          {/* 포인트 */}
          <div style={{ borderRadius:14, border:`1px solid #6366f120`, background:"rgba(99,102,241,0.06)", padding:"18px 20px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.5)":"#888", marginBottom:2 }}>보유 크레딧</div>
                <div style={{ fontSize:28, fontWeight:900, color:"#a5b4fc" }}>{pts.toLocaleString()} <span style={{ fontSize:14 }}>P</span></div>
              </div>
              <button onClick={() => navigate("pricing")}
                style={{ padding:"10px 20px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800 }}>
                충전하기
              </button>
            </div>
          </div>
          {/* 계정 정보 */}
          <div style={{ borderRadius:14, border:`1px solid ${bdr2}`, background:card2, overflow:"hidden", marginBottom:12 }}>
            {[
              { label:"가입일", value: joinDate },
              { label:"마지막 로그인", value: lastLogin },
              { label:"이메일", value: user.email },
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px",
                borderBottom: i < 2 ? `1px solid ${bdr2}` : "none" }}>
                <span style={{ fontSize:13, color:isDark?"rgba(255,255,255,0.5)":"#888" }}>{item.label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:isDark?"#fff":"#1a1a2e" }}>{item.value}</span>
              </div>
            ))}
          </div>
          {/* 로그아웃 */}
          <button onClick={() => { if (onLogout) onLogout(); navigate("home"); }}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"1px solid rgba(248,113,113,0.3)", background:"rgba(248,113,113,0.06)", color:"#f87171", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 숏폼편집 (관리자 전용)
  if (aiMenu === "shorts") {
    if (user?.role !== "admin") {
      return (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, padding:40, textAlign:"center", background: isDark?"transparent":"#f4f4f8" }}>
          <div style={{ fontSize:64 }}>🔒</div>
          <div style={{ fontSize:20, fontWeight:900, color: isDark?"#fff":"#1a1a2e" }}>관리자 전용 기능</div>
          <div style={{ fontSize:13, color: isDark?"rgba(255,255,255,0.45)":"#888", lineHeight:2 }}>
            숏폼편집 기능은 현재 관리자만 이용 가능해요.<br/>
            준비가 완료되면 정식 오픈될 예정이에요.
          </div>
          <button onClick={() => setAiMenu("home")}
            style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
            홈으로 돌아가기
          </button>
        </div>
      );
    }
    return (
      <div key="shorts" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <ShortformEditor isDark={isDark} user={user} />
      </div>
    );
  }

  return null;
}

const MENU_LABELS = {
  home: "AI 생성기", library: "내 보관함",
  blog_naver_intro: "네이버 블로그", blog_naver: "네이버 블로그",
  blog_tistory_intro: "티스토리", blog_tistory: "티스토리",
  blog_insta_intro: "인스타그램 캡션", blog_insta: "인스타그램 캡션",
  blog_youtube_intro: "유튜브 대본", blog_youtube: "유튜브 대본",
  blog_thread_intro: "스레드", blog_thread: "스레드",
  blog_yt_blog_intro: "유튜브로 글쓰기", blog_yt_blog: "유튜브로 글쓰기",
  blog_news_intro: "뉴스로 글쓰기", blog_news: "뉴스로 글쓰기",
  cardnews_simple: "심플 카드뉴스", cardnews_simple_make: "심플 카드뉴스",
  cardnews_image: "이미지 카드뉴스", cardnews_image_make: "이미지 카드뉴스",
  detail_simple: "심플 상세페이지", detail_simple_make: "심플 상세페이지", detail_simple_open: "심플 상세페이지",
  detail_image: "이미지 상세페이지", detail_image_make: "이미지 상세페이지",
  logo_gen: "로고 생성", mockup_gen: "목업 생성", shorts: "숏폼편집",
};

export function AiPage({ user, navigate, C, theme, aiMenu: aiMenuProp, setAiMenu: setAiMenuProp, onLogout, onLoginRequest, onUserUpdate }) {
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const [sideOpen, setSideOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // CardNewsApp 등 하위 컴포넌트에서 로그인 모달 접근용 전역 등록
  useEffect(function() {
    window.__onLoginRequest = onLoginRequest || function(){};
    return function() { delete window.__onLoginRequest; };
  }, [onLoginRequest]);

  // 생성 중 상태 감지 (useGeneratingGuard 이벤트)
  useEffect(() => {
    const handler = (e) => setIsGenerating(e.detail?.generating || false);
    window.addEventListener("aiGeneratingChange", handler);
    return () => window.removeEventListener("aiGeneratingChange", handler);
  }, []);
  const aiMenu = aiMenuProp !== undefined ? aiMenuProp : localMenu;
  const [guardModal, setGuardModal] = useState(null);

  const setAiMenu = async (id) => {
    // 생성 중 다른 메뉴 클릭 차단 - 커스텀 모달
    if (window.__isGenerating) {
      const cost = window.__generatingCost || 10;
      const ok = await new Promise(resolve => {
        setGuardModal({
          cost,
          onConfirm: () => { window.__isGenerating = false; setGuardModal(null); resolve(true); },
          onCancel:  () => { setGuardModal(null); resolve(false); },
        });
      });
      if (!ok) return;
    }
    if (setAiMenuProp) setAiMenuProp(id);
    setLocalMenu(id);
    setSideOpen(false);
    if (id && id !== "home") {
      window.history.pushState(null, "", "/ai/" + id);
    } else {
      window.history.pushState(null, "", "/ai");
    }
  };

  // 가드 모달 렌더링 (최상위)
  const GuardModalInline = guardModal ? (
    <div style={{ position:"fixed", inset:0, zIndex:99999,
      display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#1a1730", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:20, padding:"32px 28px", maxWidth:360, width:"90%",
        boxShadow:"0 24px 64px rgba(0,0,0,0.5)", textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:14 }}>⚠️</div>
        <div style={{ fontSize:18, fontWeight:900, color:"#fff", marginBottom:10 }}>생성 중입니다!</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.8, marginBottom:24 }}>
          페이지를 나가면<br/>
          <span style={{ color:"#f87171", fontWeight:700 }}>결과물이 저장되지 않으며</span><br/>
          <span style={{ color:"#f59e0b", fontWeight:700 }}>{guardModal.cost}P 포인트가 소진</span>됩니다.<br/>
          정말 나가시겠습니까?
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={guardModal.onCancel}
            style={{ flex:1, padding:"12px", borderRadius:11, border:"1px solid rgba(255,255,255,0.15)",
              background:"transparent", color:"rgba(255,255,255,0.7)", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            계속 생성하기
          </button>
          <button onClick={guardModal.onConfirm}
            style={{ flex:1, padding:"12px", borderRadius:11, border:"none",
              background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            나가기
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const onlineCount = useOnlineCount();
  const isDark = theme === "dark";
  const topBdr = isDark ? "rgba(255,255,255,0.07)" : "#e5e3f5";
  const topBg  = isDark ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.9)";
  const topClr = isDark ? "rgba(255,255,255,0.35)" : "#aaa";

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: isDark ? "linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)" : "#f4f4f8",
      color: isDark ? "#fff" : "#1a1a2e",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif",
      overflow: "hidden", position: "relative",
    }}>
      {GuardModalInline}
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        button{font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes ai-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.05)}}
        @keyframes ai-progress{from{width:0%}to{width:92%}}
        @keyframes ai-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ai-sidebar-desktop{display:flex}
        .ai-sidebar-mobile{display:none}
        @media(max-width:768px){
          .ai-sidebar-desktop{display:none!important}
          .ai-sidebar-mobile{display:flex!important}
        }
      `}</style>

      {/* 데스크톱 사이드바 */}
      <div className="ai-sidebar-desktop">
        <AiSidebar aiMenu={aiMenu} setAiMenu={setAiMenu} user={user} onQna={() => navigate("qna")} theme={theme} onlineCount={onlineCount} navigate={navigate} onLogout={onLogout} />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {sideOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSideOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 260, animation: "slideIn 0.2s ease", zIndex: 51 }}>
            <AiSidebar aiMenu={aiMenu} setAiMenu={setAiMenu} user={user} onQna={() => navigate("qna")} theme={theme} onlineCount={onlineCount} navigate={navigate} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* 상단 바 */}
        <div style={{
          height: 44, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 12px",
          borderBottom: "1px solid " + topBdr, background: topBg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* 모바일 햄버거 */}
            <button className="ai-sidebar-mobile" onClick={() => setSideOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20,
                color: isDark ? "#fff" : "#333", padding: "4px 6px", marginRight: 4, display: "none" }}>
              ☰
            </button>
            <span style={{ fontSize: 12, color: topClr, whiteSpace: "nowrap", fontWeight: 600 }}>🤖 {MENU_LABELS[aiMenu] || "AI 생성기"}</span>
            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 12,
                background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.4)", borderTopColor: "#6366f1", animation: "spin 0.7s linear infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>AI 생성 중...</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <AiContent aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} theme={theme} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
        </div>
      </div>
    </div>
  );
}
