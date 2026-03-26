import { useState, useEffect, useRef } from "react";
import { Badge, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { CardNewsApp, PlannerPanel } from "./CardNewsApp";
import BlogGenerator from "./BlogGenerator";
import NewsBlogGenerator from "./NewsBlogGenerator";
import YtBlogGenerator from "./YtBlogGenerator";
import ThumbnailGenerator from "./ThumbnailGenerator";
import SeoAnalyzer from "./SeoAnalyzer";
import AnalyzerPage from "./AnalyzerPage";
import SimpleDetailPageGenerator from "./SimpleDetailPageGenerator";
import SimpleCardNewsGenerator from "./SimpleCardNewsGenerator";
import LogoGenerator from "./LogoGenerator";
import MockupGenerator from "./MockupGenerator";
import ProductShotGenerator from "./ProductShotGenerator";
import PptGenerator from "./PptGenerator";
import ShortsCreator from "./ShortsCreator";
import BackgroundTaskIndicator from "./BackgroundTaskIndicator";
import SnsConnectionManager from "./SnsConnectionManager";
import SnsConnectBanner from "./SnsConnectBanner";
import Footer from "./Footer.jsx";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage, getAuthToken, changePoints, setLocalUser } from "./storage";
import { callClaude } from "./aiClient";

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

  const Item = ({ id, label, icon, ids }) => {
    const baseId = id.replace('_intro', '');
    const active = aiMenu === id || aiMenu.startsWith(baseId) || (ids && ids.some(x => aiMenu === x || aiMenu.startsWith(x)));
    return (
      <button onClick={() => setAiMenu(id)} style={{
        width: "100%", padding: "10px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: 14, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #7c6aff" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: icon ? 7 : 0, marginBottom: 2,
      }}>
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}{label}
      </button>
    );
  };

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
        <div style={{ fontSize: 9, color: brandSub, marginTop: 1 }}>{t("aiGen")}</div>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px", flex: 1, overflowY: "auto", overflowX: "visible" }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home" label={t("home")} />
        <Item id="library" label={t("library")} />
        <Item id="hot_keyword" label="핫 키워드" />

        <div style={{ height:1, background:sideBdr, margin:"8px 4px" }} />
        <Item id="prompt_studio" label="기획" />
        <Item id="blog_write" label="글쓰기" ids={["blog_naver","blog_tistory","blog_insta","blog_youtube","blog_thread","blog_cafe"]} />
        <Item id="blog_link" label="링크 글쓰기" ids={["blog_yt_blog","blog_news"]} />
        <Item id="content_create" label="콘텐츠 제작" ids={["cardnews_simple","detail_simple","thumbnail_gen"]} />
        <Item id="ppt_gen" label="PPT 제작" />
        <Item id="image_create" label="이미지 생성" ids={["product_shot","logo_gen","mockup_gen","model_gen"]} />
        <Item id="image_edit" label="이미지 수정" ids={["face_swap","outfit_swap","outpaint"]} />
        <Item id="video_create" label="영상 제작" ids={["shorts_make"]} />
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
const IMGCARD_SAVES_KEY = "nper_imgcard_saves_v1";
function getImgCardSaves() { try { return JSON.parse(localStorage.getItem(IMGCARD_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteImgCardSave(id) {
  try { localStorage.setItem(IMGCARD_SAVES_KEY, JSON.stringify(getImgCardSaves().filter(x => x.id !== id))); } catch(e) {}
}
const SIMPLEDETAIL_SAVES_KEY = "nper_simpledetail_saves_v1";
function getSimpleDetailSaves() { try { return JSON.parse(localStorage.getItem(SIMPLEDETAIL_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteSimpleDetailSave(id) {
  try { localStorage.setItem(SIMPLEDETAIL_SAVES_KEY, JSON.stringify(getSimpleDetailSaves().filter(x => x.id !== id))); } catch(e) {}
}

// ── LibraryPage 컴포넌트 ──────────────────────────────────────────────────────
function LibraryPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu, renderFooter }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("blog");
  const [blogList, setBlogList] = useState(getBlogSaves);
  const [cardList, setCardList] = useState(getCardSaves);
  const [detailList, setDetailList] = useState(getDetailSaves);
  const [imgCardList, setImgCardList] = useState(getImgCardSaves);
  const [simpleDetailList, setSimpleDetailList] = useState(getSimpleDetailSaves);
  const [search, setSearch] = useState("");
  const [selectedBlog, setSelectedBlog] = useState(null);

  const text  = homeText;
  const muted = homeMuted;
  const bdr   = cardBdr;
  const bg    = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const filteredBlog = blogList.filter(x =>
    !search || x.title.toLowerCase().includes(search.toLowerCase()) || (x.type||"").includes(search)
  );
  const filteredCard = cardList.filter(x =>
    !search || (x.topic||"").toLowerCase().includes(search.toLowerCase())
  );
  const total = blogList.length + cardList.length + detailList.length + imgCardList.length + simpleDetailList.length;

  const typeLabel = {
    blog_naver:"네이버", blog_tistory:"티스토리", blog_insta:"인스타",
    blog_youtube:"유튜브", blog_thread:"스레드", blog_news:"링크",
    blog_yt_blog:"링크", blog_link:"링크"
  };
  const typeColor = {
    blog_naver:"#4ade80", blog_tistory:"#f97316", blog_insta:"#ec4899",
    blog_youtube:"#ef4444", blog_thread:"#7c6aff", blog_news:"#6366f1",
    blog_yt_blog:"#6366f1", blog_link:"#6366f1"
  };

  const snsImageCount = cardList.length + imgCardList.length + detailList.length + simpleDetailList.length;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>{t("library")}</div>
          <div style={{ fontSize:13, color:muted }}>{t("totalN")} {total}{t("totalSaved")} · {t("autoSaved")}</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={t("search")}
          style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${bdr}`, background:inputBg,
            color:text, fontSize:13, outline:"none", width:180 }} />
      </div>

      {/* 탭 — 3개 폴더 */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background: isDark?"rgba(255,255,255,0.05)":"#e9e9ef", borderRadius:10, padding:4, width:"fit-content" }}>
        {[
          ["blog","글 생성", blogList.length],
          ["snsimg","이미지 생성", snsImageCount],
        ].map(([id, label, cnt]) => (
          <button key={id} onClick={()=>{ setTab(id); setSelectedBlog(null); }}
            style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
              background: tab===id ? (isDark?"rgba(99,102,241,0.5)":"#fff") : "transparent",
              color: tab===id ? (isDark?"#fff":accent) : muted,
              boxShadow: tab===id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {label}
            <span style={{ marginLeft:5, fontSize:11, opacity:0.7 }}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* 블로그 목록 */}
      {tab === "blog" && (
        <>
          {filteredBlog.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 글이 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>글 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("blog_naver")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
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
                    복사
                  </button>
                  <button onClick={()=>{ deleteBlogWork(selectedBlog.id); setBlogList(getBlogSaves()); setSelectedBlog(null); }}
                    style={{ padding:"9px 18px", borderRadius:9, border:"1px solid rgba(248,113,113,0.3)",
                      background:"transparent", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    삭제
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
              <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 카드뉴스가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>카드뉴스 편집 화면에서 저장하면 여기 표시됩니다</div>
              <button onClick={()=>setAiMenu("cardnews_simple")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
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
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)"} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    </div>
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

      {/* 상세페이지 탭 (심플+이미지 통합) */}
      {tab === "detail" && (
        <>
          {(detailList.length + simpleDetailList.length) === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:20, marginBottom:12, color:muted, fontWeight:700 }}>상세페이지</div>
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
              {/* 심플 상세페이지 */}
              {detailList.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#888", fontWeight:700 }}>상세페이지</div>}
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:5 }}>{item.count}장</div>
                    <div style={{ position:"absolute", top:8, left:8, background:"rgba(16,185,129,0.8)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>심플</div>
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
                  </div>
                </div>
              ))}
              {/* 이미지 상세페이지 */}
              {simpleDetailList.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumb || item.thumbnail
                      ? <img src={item.thumb||item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#888", fontWeight:700 }}>이미지</div>}
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:5 }}>{item.count||item.slides?.length||0}장</div>
                    <div style={{ position:"absolute", top:8, left:8, background:"rgba(99,102,241,0.8)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>이미지</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.productName||item.topic||"제목 없음"}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                      <button onClick={()=>{
                        try { localStorage.setItem("nper_open_simpledetail", JSON.stringify(item)); } catch {}
                        setAiMenu("detail_image_open");
                      }}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`,
                          background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer", marginRight:6 }}>
                        열기
                      </button>
                      <button onClick={()=>{ if(window.confirm("삭제할까요?")){ deleteSimpleDetailSave(item.id); setSimpleDetailList(getSimpleDetailSaves()); } }}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none",
                          background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SNS 이미지 탭 (카드뉴스+상세페이지 통합) */}
      {tab === "snsimg" && (
        <>
          {(cardList.length + detailList.length + simpleDetailList.length) === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:20, marginBottom:12, color:muted, fontWeight:700 }}>SNS 이미지</div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 SNS 이미지가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>카드뉴스·상세페이지 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("cardnews_simple")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
                카드뉴스 만들기 →
              </button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              {/* 카드뉴스 */}
              {filteredCard.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#888", fontWeight:700 }}>카드뉴스</div>}
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:5 }}>{item.count}장</div>
                    <div style={{ position:"absolute", top:8, left:8, background:"rgba(99,102,241,0.8)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>카드뉴스</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic||"제목 없음"}</div>
                    <div style={{ fontSize:11, color:muted, marginBottom:8 }}>{item.count}장 · {item.date}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{try{localStorage.setItem("nper_open_card",JSON.stringify(item));}catch{}setAiMenu("cardnews_simple_open");}}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>열기</button>
                      <button onClick={()=>{deleteCardWork(item.id);setCardList(getCardSaves());}}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
              {/* 상세페이지 */}
              {detailList.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#888", fontWeight:700 }}>상세페이지</div>}
                    <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 7px", borderRadius:5 }}>{item.count}장</div>
                    <div style={{ position:"absolute", top:8, left:8, background:"rgba(16,185,129,0.8)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>상세페이지</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic||"제목 없음"}</div>
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={()=>{try{localStorage.setItem("nper_open_detail",JSON.stringify(item));}catch{}setAiMenu("detail_simple_open");}}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>열기</button>
                      <button onClick={()=>{if(window.confirm("삭제할까요?")){deleteDetailSave(item.id);setDetailList(getDetailSaves());}}}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
              {simpleDetailList.map(item => (
                <div key={item.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:bg }}>
                  <div style={{ position:"relative", paddingBottom:"100%", background:"#111", overflow:"hidden" }}>
                    {item.thumb||item.thumbnail
                      ? <img src={item.thumb||item.thumbnail} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#888", fontWeight:700 }}>상세페이지</div>}
                    <div style={{ position:"absolute", top:8, left:8, background:"rgba(245,158,11,0.8)", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>상세페이지</div>
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.productName||item.topic||"제목 없음"}</div>
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={()=>{try{localStorage.setItem("nper_open_simpledetail",JSON.stringify(item));}catch{}setAiMenu("detail_simple_open");}}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>열기</button>
                      <button onClick={()=>{if(window.confirm("삭제할까요?")){deleteSimpleDetailSave(item.id);setSimpleDetailList(getSimpleDetailSaves());}}}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      </div>{/* maxWidth:800 */}
      {renderFooter && renderFooter()}
    </div>
  );
}

// ── 기획 ──────────────────────────────────────────────────────
const PLAN_SAVES_KEY = "nper_plans_v1";
function getPlanSaves() { try { return JSON.parse(localStorage.getItem(PLAN_SAVES_KEY)||"[]"); } catch { return []; } }
function savePlan(item) {
  const list = getPlanSaves().filter(x=>x.id!==item.id);
  list.unshift(item);
  try { localStorage.setItem(PLAN_SAVES_KEY, JSON.stringify(list.slice(0,50))); } catch {}
}
function deletePlan(id) {
  try { localStorage.setItem(PLAN_SAVES_KEY, JSON.stringify(getPlanSaves().filter(x=>x.id!==id))); } catch {}
}

function PromptStudioPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu, user, onLoginRequest, onUserUpdate, renderFooter, noHeader }) {
  const text = homeText, muted = homeMuted, bdr = cardBdr;
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const ibg = isDark ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const accent = "#7c6aff";
  const D = isDark;

  const [input, setInput] = useState("");
  const [docType, setDocType] = useState("proposal");
  const [tone, setTone] = useState("professional");
  const [format, setFormat] = useState("structured");
  const [step, setStep] = useState("input");
  const [result, setResult] = useState("");
  const [plans, setPlans] = useState(getPlanSaves);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const inp = { width:"100%", padding:"12px 16px", borderRadius:12, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const DOC_GROUPS = [
    { label:"비즈니스", items:[
      { id:"proposal",   label:"사업 제안서",   desc:"투자·파트너 제안" },
      { id:"bizplan",    label:"사업계획서",    desc:"창업·투자유치용" },
      { id:"ppt_outline",label:"PPT 구성안",   desc:"발표 슬라이드 기획" },
      { id:"report",     label:"보고서",       desc:"업무·분석 보고서" },
    ]},
    { label:"업무", items:[
      { id:"planner",    label:"플래너·일정표", desc:"프로젝트·업무 계획" },
      { id:"meeting",    label:"회의록",       desc:"회의 안건·결과 정리" },
      { id:"email",      label:"비즈니스 메일", desc:"공식 이메일·레터" },
      { id:"contract",   label:"계약서 초안",   desc:"계약·합의서 템플릿" },
    ]},
    { label:"메시지·인사", items:[
      { id:"congrats",   label:"축하 메시지",   desc:"결혼·승진·생일·개업" },
      { id:"condolence", label:"위로·감사",     desc:"조의·병문안·감사" },
      { id:"speech",     label:"인사말·축사",   desc:"행사·연설·건배사" },
      { id:"invite",     label:"초대장·안내문",  desc:"행사·모임·공지" },
    ]},
    { label:"기타", items:[
      { id:"manual",     label:"매뉴얼·가이드", desc:"운영·사용 설명서" },
      { id:"brief",      label:"브리프",       desc:"프로젝트·디자인 브리프" },
      { id:"resume",     label:"이력서·자소서", desc:"채용·지원서" },
      { id:"free",       label:"자유 문서",     desc:"형식 없이 자유롭게" },
    ]},
  ];
  const DOC_TYPES = DOC_GROUPS.flatMap(g=>g.items);

  const TONES = [
    { id:"professional", label:"전문적/공식적" },
    { id:"friendly",     label:"친근한/대화체" },
    { id:"concise",      label:"간결한/핵심만" },
    { id:"persuasive",   label:"설득적/논리적" },
    { id:"creative",     label:"창의적/자유로운" },
  ];

  const FORMATS = [
    { id:"structured", label:"구조화 (목차+본문)" },
    { id:"outline",    label:"아웃라인 (목차만)" },
    { id:"full",       label:"완성본 (바로 사용)" },
    { id:"bullet",     label:"불릿 포인트" },
  ];

  const docInfo = DOC_TYPES.find(d=>d.id===docType) || DOC_TYPES[0];
  const toneInfo = TONES.find(t=>t.id===tone) || TONES[0];
  const formatInfo = FORMATS.find(f=>f.id===format) || FORMATS[0];

  const generate = async () => {
    if (!input.trim()) { setErr("어떤 문서를 만들지 입력해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    setStep("loading"); setErr(""); setResult("");
    window.__isGenerating = true; window.__generatingCost = 10;
    try {
      // callClaude는 상단에서 정적 import됨
      const r = await callClaude(
`당신은 실무 문서 작성 전문가입니다.

[문서 유형] ${docInfo.label}
[말투/톤] ${toneInfo.label}
[형식] ${formatInfo.label}
[요청] ${input}

규칙:
- 이모티콘, 이모지 사용 금지. 깔끔하고 전문적인 텍스트만 사용
- 실제 업무에서 바로 사용할 수 있는 수준으로 작성
- ${docType==="proposal"?"목적, 배경, 제안 내용, 기대 효과, 일정, 예산 항목 포함":""}
- ${docType==="bizplan"?"사업 개요, 시장 분석, 비즈니스 모델, 재무 계획, 팀 구성, 로드맵 포함":""}
- ${docType==="ppt_outline"?"슬라이드별 제목 + 핵심 내용 + 발표 스크립트 포함. 15~20장 분량":""}
- ${docType==="planner"?"일정, 담당자, 마일스톤, 체크리스트 형태로 구성":""}
- ${docType==="report"?"요약, 현황, 분석, 결론, 제언 구조":""}
- ${docType==="contract"?"계약 당사자, 계약 목적, 조건, 기간, 금액, 해지 조건, 서명란 포함":""}
- ${docType==="meeting"?"일시, 참석자, 안건, 논의 내용, 결정사항, 후속조치 구조":""}
- ${docType==="email"?"제목, 수신자, 본문(인사-목적-내용-마무리), 서명 포함":""}
- ${docType==="manual"?"목차, 개요, 단계별 설명, 주의사항, FAQ 포함":""}
- ${docType==="brief"?"프로젝트 배경, 목표, 범위, 일정, 예산, 참고자료 구조":""}
- ${docType==="resume"?"인적사항, 학력, 경력, 역량, 자기소개서(지원동기/성장과정/입사후포부) 포함":""}
- ${docType==="congrats"?"관계(직장동료/친구/지인/가족)와 상황(결혼/승진/생일/개업/출산/졸업)에 맞는 축하 메시지 3~5가지 버전 작성. 짧은 버전(카톡용), 중간 버전(축의금봉투), 긴 버전(편지/카드) 각각 포함. 격식체와 친근체 모두 제공":""}
- ${docType==="condolence"?"상황(조의/병문안/퇴직/감사)에 맞는 메시지 3~5가지 버전 작성. 짧은 버전(문자용), 긴 버전(편지/카드) 포함. 적절한 위로와 공감 표현":""}
- ${docType==="speech"?"행사 종류(결혼/송년회/환영회/기념식/퇴임식)에 맞는 인사말/축사. 도입-본론-마무리 구조. 1~3분 분량 기준. 건배사 포함":""}
- ${docType==="invite"?"행사명, 일시, 장소, 대상, 참석 안내, 회신 방법 포함. 공식/비공식 버전 모두 제공":""}
- ${format==="outline"?"상세 목차와 각 항목의 핵심 키워드만 정리":""}
- ${format==="bullet"?"불릿 포인트 형태로 핵심만 간결하게":""}
- ${format==="full"?"완성된 문서 형태로 바로 사용 가능하게":""}
- 한국어로 작성
- 마크다운 헤더(#, ##, ###) 사용하여 구조화`, 4000);
      setResult(r || "결과를 생성하지 못했습니다.");
      setStep("result");
      const plan = { id:"plan_"+Date.now(), input, docType, tone, format, result:r, date:new Date().toLocaleDateString("ko-KR") };
      savePlan(plan);
      setPlans(getPlanSaves());
      if (user && onUserUpdate) {
        try {
          const newPts = await changePoints(user.uid, -10, "기획 생성");
          if (newPts !== null) onUserUpdate({ ...user, points: newPts });
        } catch {}
      }
    } catch (e) { setErr("생성 실패: " + (e.message || "다시 시도해주세요.")); setStep("input"); }
    finally { window.__isGenerating = false; }
  };

  const loadPlan = (p) => {
    setInput(p.input||""); setDocType(p.docType||"proposal"); setTone(p.tone||"professional"); setFormat(p.format||"structured");
    setResult(p.result||""); setStep(p.result?"result":"input");
  };

  const removePlan = (id) => { deletePlan(id); setPlans(getPlanSaves()); };

  const downloadTxt = () => {
    const blob = new Blob([result], { type:"text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${docInfo.label}_${new Date().toISOString().slice(0,10)}.txt`; a.click();
  };

  const downloadPdf = () => {
    const w = window.open("","_blank");
    if (!w) return;
    const lines = result.split("\n").map(l => {
      if (l.startsWith("### ")) return `<h3 style="margin:18px 0 8px;font-size:16px;font-weight:700">${l.slice(4)}</h3>`;
      if (l.startsWith("## "))  return `<h2 style="margin:24px 0 10px;font-size:18px;font-weight:800">${l.slice(3)}</h2>`;
      if (l.startsWith("# "))   return `<h1 style="margin:28px 0 12px;font-size:22px;font-weight:900">${l.slice(2)}</h1>`;
      if (l.startsWith("- "))   return `<li style="margin:3px 0 3px 20px;line-height:1.8">${l.slice(2)}</li>`;
      if (!l.trim()) return `<br/>`;
      return `<p style="margin:4px 0;line-height:1.9">${l}</p>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docInfo.label}</title>
<style>@page{size:A4;margin:20mm}body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#222;max-width:700px;margin:0 auto;padding:40px 20px}
h1,h2,h3{color:#1a1a2e}li{list-style:disc}</style></head><body>${lines}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const EXAMPLES = [
    "AI SaaS 스타트업 투자유치용 사업계획서",
    "신규 서비스 런칭 제안서 (B2B)",
    "2026년 마케팅 전략 PPT 구성안",
    "앱 개발 프로젝트 3개월 플래너",
    "직장 동료 결혼 축하 메시지",
    "회사 송년회 건배사",
    "거래처 감사 메일",
    "팀원 승진 축하 카드",
  ];

  // ── 입력 ──
  if (step === "input") return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:660, margin:"0 auto" }}>
        {!noHeader && <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>기획</div>
          <div style={{ fontSize:14, color:muted, lineHeight:1.8 }}>실무 문서를 AI가 작성해드립니다.</div>
        </div>}

        {/* 문서 유형 (그룹별) */}
        <div style={{ marginBottom:18 }}>
          {DOC_GROUPS.map(g => (
            <div key={g.label} style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6, paddingLeft:2 }}>{g.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {g.items.map(d => {
                  const sel = docType===d.id;
                  return (
                    <button key={d.id} onClick={()=>setDocType(d.id)}
                      style={{ padding:"10px 6px", borderRadius:10, border:`1.5px solid ${sel?accent:bdr}`,
                        background:sel?`${accent}10`:"transparent", cursor:"pointer", textAlign:"center", transition:"all 0.12s" }}>
                      <div style={{ fontSize:12, fontWeight:sel?800:500, color:sel?accent:text, marginBottom:2 }}>{d.label}</div>
                      <div style={{ fontSize:9, color:muted }}>{d.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ borderRadius:14, border:`1.5px solid ${accent}30`, background:bg, padding:"18px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>내용 설명</div>
          <textarea value={input} onChange={e=>{setInput(e.target.value);setErr("");}}
            style={{ ...inp, minHeight:90, resize:"vertical", fontSize:14, lineHeight:1.8, border:"none", background:"transparent", padding:"0" }}
            placeholder={`예: ${EXAMPLES[DOC_TYPES.findIndex(d=>d.id===docType)%EXAMPLES.length]||EXAMPLES[0]}`} />
        </div>

        {/* 예시 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
          {EXAMPLES.map((ex,i) => (
            <button key={i} onClick={()=>setInput(ex)}
              style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:bg,
                color:muted, fontSize:11, cursor:"pointer", transition:"all 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>
              {ex}
            </button>
          ))}
        </div>

        {/* 말투 + 형식 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>말투</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {TONES.map(t => {
                const sel = tone===t.id;
                return <button key={t.id} onClick={()=>setTone(t.id)}
                  style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${sel?accent:bdr}`, background:sel?`${accent}10`:"transparent",
                    color:sel?accent:muted, fontSize:12, fontWeight:sel?700:400, cursor:"pointer", textAlign:"left" }}>{t.label}</button>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>형식</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {FORMATS.map(f => {
                const sel = format===f.id;
                return <button key={f.id} onClick={()=>setFormat(f.id)}
                  style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${sel?accent:bdr}`, background:sel?`${accent}10`:"transparent",
                    color:sel?accent:muted, fontSize:12, fontWeight:sel?700:400, cursor:"pointer", textAlign:"left" }}>{f.label}</button>;
              })}
            </div>
          </div>
        </div>

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        <button onClick={generate} disabled={!input.trim()}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:input.trim()?"pointer":"not-allowed",
            background:input.trim()?accent:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:16, fontWeight:900, opacity:input.trim()?1:0.5 }}>
          AI 생성 (10P)
        </button>

        {/* 저장된 기획 */}
        {plans.length > 0 && (
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>내 기획 ({plans.length})</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {plans.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10,
                  border:`1px solid ${bdr}`, background:bg, cursor:"pointer" }}
                  onClick={()=>loadPlan(p)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;}}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.input}</div>
                    <div style={{ fontSize:11, color:muted }}>{p.date} / {DOC_TYPES.find(d=>d.id===p.docType)?.label||""}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();removePlan(p.id);}}
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(248,113,113,0.15)", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {renderFooter && renderFooter()}
    </div>
  );

  // ── 로딩 ──
  if (step === "loading") return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:900, color:accent, marginBottom:12 }}>문서 생성 중</div>
        <div style={{ width:280, height:5, borderRadius:3, background:"rgba(128,128,128,0.12)", overflow:"hidden", margin:"0 auto 16px" }}>
          <div style={{ height:"100%", borderRadius:3, background:accent, animation:"ai-progress 12s ease-out forwards" }} />
        </div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>{docInfo.label} 작성 중...<br/>"{input.slice(0,50)}{input.length>50?"...":""}"</div>
      </div>
    </div>
  );

  // ── 결과 ──
  // 마크다운 헤더 → 간단한 HTML 변환
  const renderResult = () => {
    return result.split("\n").map((line,i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize:15, fontWeight:700, color:text, margin:"16px 0 6px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("## "))  return <h2 key={i} style={{ fontSize:17, fontWeight:800, color:text, margin:"22px 0 8px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("# "))   return <h1 key={i} style={{ fontSize:20, fontWeight:900, color:text, margin:"26px 0 10px" }}>{line.slice(2)}</h1>;
      if (line.startsWith("- "))   return <li key={i} style={{ fontSize:14, color:text, lineHeight:1.9, marginLeft:20 }}>{line.slice(2)}</li>;
      if (!line.trim()) return <br key={i}/>;
      return <p key={i} style={{ fontSize:14, color:text, lineHeight:1.9, margin:"3px 0" }}>{line}</p>;
    });
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:740, margin:"0 auto" }}>
        {/* 상단 */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={()=>setStep("input")} style={{ background:"none", border:"none", cursor:"pointer", color:muted, fontSize:18 }}>←</button>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:text }}>{docInfo.label}</div>
            <div style={{ fontSize:11, color:muted }}>{toneInfo.label} / {formatInfo.label}</div>
          </div>
          <div style={{ flex:1 }} />
          <button onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
            style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${copied?"rgba(74,222,128,0.3)":bdr}`, background:copied?"rgba(74,222,128,0.06)":"transparent", color:copied?"#4ade80":text, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {copied ? "복사됨" : "복사"}
          </button>
        </div>

        {/* 요청 요약 */}
        <div style={{ padding:"10px 14px", borderRadius:8, background:ibg, border:`1px solid ${bdr}`, marginBottom:16, fontSize:12, color:muted }}>
          {input}
        </div>

        {/* 결과 본문 */}
        <div style={{ borderRadius:14, border:`1px solid ${bdr}`, background:bg, padding:"28px 30px", marginBottom:16 }}>
          {renderResult()}
        </div>

        {/* 다운로드 */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button onClick={downloadTxt}
            style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid ${bdr}`, background:bg, color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            TXT 저장
          </button>
          <button onClick={downloadPdf}
            style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid ${bdr}`, background:bg, color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            PDF 저장 (인쇄)
          </button>
        </div>

        {/* 하단 액션 */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>{setResult("");setStep("input");}} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>새로 기획</button>
          <button onClick={generate} style={{ flex:1, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:accent, color:"#fff", fontSize:14, fontWeight:800 }}>다시 생성 (10P)</button>
        </div>
      </div>
      {renderFooter && renderFooter()}
    </div>
  );
}

// ── 핫키워드 API ────────────────────────────────────────────────────────
async function fetchTrendsFromAPI(platform) {
  // 서버 API (/api/trends) 호출 → 서버에서 Google/Naver/YouTube/TikTok 실시간 데이터 수집
  try {
    const r = await fetch(`/api/trends?platform=${platform}`);
    if (r.ok) {
      const d = await r.json();
      if (d.live && d.keywords?.length) return d.keywords;
    }
  } catch {}
  return null;
}

// ── 핫키워드 페이지 ──────────────────────────────────────────────────────
function HotKeywordPage({ isDark, homeText, homeMuted, cardBdr, renderFooter, noHeader }) {
  const text = homeText, muted = homeMuted, bdr = cardBdr;
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const PLATFORMS = [
    { id:"all",      label:"전체",     icon:"🔥", color:"#7c6aff" },
    { id:"naver",    label:"네이버",   icon:"N",  color:"#03C75A" },
    { id:"google",   label:"구글",     icon:"G",  color:"#4285F4" },
    { id:"youtube",  label:"유튜브",   icon:"▶",  color:"#FF0000" },
    { id:"insta",    label:"인스타",   icon:"📷", color:"#E4405F" },
    { id:"tiktok",   label:"틱톡",     icon:"♪",  color:"#000000" },
    { id:"x",        label:"X",        icon:"𝕏",  color:isDark?"#fff":"#000" },
  ];

  const [apiStatus, setApiStatus] = useState(""); // "live" | "fallback"
  const [lastUpdate, setLastUpdate] = useState("");

  useEffect(() => {
    setLoading(true); setApiStatus("");
    const fetchKeywords = async () => {
      const platform = tab === "all" ? "google" : tab;

      // 1) API에서 실시간 데이터 시도
      const apiData = await fetchTrendsFromAPI(platform);
      if (apiData && apiData.length > 0) {
        const mkVol = (base) => ({
          naver: Math.floor(base*0.3+Math.random()*base*0.2),
          google: Math.floor(base+Math.random()*base*0.5),
          youtube: Math.floor(base*0.5+Math.random()*base*0.3),
          insta: Math.floor(base*0.25+Math.random()*base*0.2),
          tiktok: Math.floor(base*0.6+Math.random()*base*0.3),
          x: Math.floor(base*0.15+Math.random()*base*0.1),
        });
        const mapped = apiData.map((k,i) => ({
          rank: k.rank || i+1,
          keyword: k.keyword || k.name || "",
          change: k.change || (i<3?"up":i<8?"same":"new"),
          volume: k.volume ? (typeof k.volume === "object" ? k.volume : mkVol(k.volume)) : mkVol(50000-i*3000),
          totalVolume: 0,
        }));
        mapped.forEach(k => { k.totalVolume = Object.values(k.volume).reduce((a,b)=>a+b,0); });
        if (tab !== "all") mapped.sort((a,b) => (b.volume[tab]||b.totalVolume) - (a.volume[tab]||a.totalVolume));
        else mapped.sort((a,b) => b.totalVolume - a.totalVolume);
        mapped.forEach((k,i) => k.rank = i+1);
        setKeywords(mapped);
        setApiStatus("live");
        setLastUpdate(new Date().toLocaleTimeString("ko-KR"));
        setLoading(false);
        return;
      }

      // 2) 폴백: 샘플 데이터
      const mkVol = () => ({
        naver: Math.floor(Math.random()*90000+10000), google: Math.floor(Math.random()*500000+50000),
        youtube: Math.floor(Math.random()*200000+20000), insta: Math.floor(Math.random()*150000+10000),
        tiktok: Math.floor(Math.random()*300000+30000), x: Math.floor(Math.random()*80000+5000),
      });
      const allKw = [
        { keyword:"AI 이미지 생성", change:"up" }, { keyword:"숏폼 마케팅", change:"up" },
        { keyword:"챗GPT 활용법", change:"up" }, { keyword:"인스타 릴스", change:"new" },
        { keyword:"네이버 블로그 수익화", change:"same" }, { keyword:"틱톡 알고리즘", change:"new" },
        { keyword:"브랜드 디자인", change:"same" }, { keyword:"카드뉴스 만들기", change:"same" },
        { keyword:"유튜브 쇼츠 전략", change:"up" }, { keyword:"SEO 최적화", change:"new" },
        { keyword:"인플루언서 마케팅", change:"same" }, { keyword:"AI 로고 디자인", change:"new" },
        { keyword:"콘텐츠 자동화", change:"up" }, { keyword:"디지털 마케팅", change:"same" },
        { keyword:"제품 사진 촬영", change:"same" },
      ].map((k,i) => ({ ...k, rank:i+1, volume:mkVol(), totalVolume:0 }));
      allKw.forEach(k => { k.totalVolume = Object.values(k.volume).reduce((a,b)=>a+b,0); });
      if (tab==="all") allKw.sort((a,b)=>b.totalVolume-a.totalVolume);
      else allKw.sort((a,b)=>(b.volume[tab]||0)-(a.volume[tab]||0));
      allKw.forEach((k,i)=>k.rank=i+1);
      setKeywords(allKw);
      setApiStatus("fallback");
      setLoading(false);
    };
    fetchKeywords();
  }, [tab]);

  const fmtVol = v => v>=1000000?(v/1000000).toFixed(1)+"M":v>=1000?(v/1000).toFixed(0)+"K":String(v);
  const maxVol = keywords.length>0?Math.max(...keywords.map(k=>tab==="all"?k.totalVolume:(k.volume?.[tab]||0)),1):1;

  const filtered = search.trim()
    ? keywords.filter(k=>k.keyword.toLowerCase().includes(search.toLowerCase()))
    : keywords;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        {!noHeader && <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:20, fontWeight:900, color:text, marginBottom:4 }}>핫 키워드</div>
          <div style={{ fontSize:13, color:muted }}>플랫폼별 실시간 인기 키워드와 검색량을 확인하세요</div>
          {apiStatus && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"3px 12px", borderRadius:20,
              background:apiStatus==="live"?"rgba(74,222,128,0.1)":"rgba(245,158,11,0.1)",
              border:`1px solid ${apiStatus==="live"?"rgba(74,222,128,0.3)":"rgba(245,158,11,0.3)"}` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:apiStatus==="live"?"#4ade80":"#f59e0b" }} />
              <span style={{ fontSize:10, color:apiStatus==="live"?"#4ade80":"#f59e0b", fontWeight:600 }}>
                {apiStatus==="live"?`실시간 데이터 ${lastUpdate}`:"샘플 데이터 (API 서버 연결 시 실시간 전환)"}
              </span>
            </div>
          )}
        </div>}

        {/* 플랫폼 탭 */}
        <div style={{ display:"flex", gap:3, marginBottom:16, overflowX:"auto", padding:"4px 0" }}>
          {PLATFORMS.map(p=>(
            <button key={p.id} onClick={()=>setTab(p.id)}
              style={{ padding:"8px 14px", borderRadius:10, border:tab===p.id?`2px solid ${p.color}`:`2px solid transparent`, cursor:"pointer",
                background:tab===p.id?(isDark?`${p.color}25`:`${p.color}12`):"transparent",
                color:tab===p.id?p.color:muted, fontSize:12, fontWeight:tab===p.id?800:500,
                display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" }}>
              <span style={{ fontSize:13 }}>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div style={{ position:"relative", marginBottom:16 }}>
          <svg style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="키워드 검색..."
            style={{ width:"100%", padding:"11px 14px 11px 38px", borderRadius:12, border:`1px solid ${bdr}`,
              background:bg, color:text, fontSize:14, outline:"none", boxSizing:"border-box" }} />
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
            <div style={{ width:40, height:40, border:`3px solid ${accent}30`, borderTopColor:accent, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
            <div style={{ fontSize:13 }}>키워드 불러오는 중...</div>
          </div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted, fontSize:14 }}>검색 결과가 없어요</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {filtered.map((k, i) => {
              const isTop3 = k.rank <= 3;
              const vol = tab==="all"?k.totalVolume:(k.volume?.[tab]||0);
              const pct = Math.max(Math.round((vol/maxVol)*100),3);
              const isOpen = expanded===i;
              const platColors = { naver:"#03C75A", google:"#4285F4", youtube:"#FF0000", insta:"#E4405F", tiktok:"#000", x:isDark?"#fff":"#000" };
              const platIcons  = { naver:"N", google:"G", youtube:"▶", insta:"📷", tiktok:"♪", x:"𝕏" };
              return (
                <div key={i} onClick={()=>setExpanded(isOpen?null:i)}
                  style={{ borderRadius:14, border:`1px solid ${isOpen?accent+"50":bdr}`, background:bg, cursor:"pointer", transition:"all 0.15s",
                    boxShadow:isOpen?`0 4px 20px ${accent}15`:"none" }}>
                  {/* 메인 행 */}
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px" }}>
                    <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                      background:isTop3?"linear-gradient(135deg,#7c6aff,#ec4899)":isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:900, color:isTop3?"#fff":muted }}>
                      {k.rank}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:isTop3?800:600, color:text, marginBottom:4 }}>{k.keyword}</div>
                      {/* 볼륨 바 */}
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:6, borderRadius:3, background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, transition:"width 0.5s",
                            background:tab==="all"?"linear-gradient(90deg,#7c6aff,#ec4899)":(PLATFORMS.find(p=>p.id===tab)?.color||accent) }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:accent, minWidth:48, textAlign:"right" }}>{fmtVol(vol)}</span>
                      </div>
                    </div>
                    {k.change === "up" && <span style={{ fontSize:11, color:"#ef4444", fontWeight:700 }}>▲</span>}
                    {k.change === "new" && <span style={{ fontSize:9, padding:"2px 7px", borderRadius:5, background:`${accent}15`, color:accent, fontWeight:700 }}>NEW</span>}
                    {k.change === "same" && <span style={{ fontSize:11, color:muted }}>-</span>}
                    <span style={{ fontSize:12, color:muted, transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</span>
                  </div>

                  {/* 펼침: 플랫폼별 상세 */}
                  {isOpen && k.volume && (
                    <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${bdr}` }}>
                      <div style={{ fontSize:11, fontWeight:700, color:muted, padding:"12px 0 10px" }}>플랫폼별 검색량</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                        {Object.entries(k.volume).map(([pid,v])=>{
                          const pc = platColors[pid]||accent;
                          const pi = platIcons[pid]||pid;
                          const pName = PLATFORMS.find(p=>p.id===pid)?.label||pid;
                          const maxP = Math.max(...Object.values(k.volume),1);
                          const barPct = Math.max(Math.round((v/maxP)*100),5);
                          return (
                            <div key={pid} style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${bdr}`,
                              background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                                <span style={{ fontSize:12, width:20, textAlign:"center", color:pc, fontWeight:900 }}>{pi}</span>
                                <span style={{ fontSize:11, fontWeight:700, color:text }}>{pName}</span>
                              </div>
                              <div style={{ fontSize:16, fontWeight:900, color:pc, marginBottom:6 }}>{fmtVol(v)}</div>
                              <div style={{ height:4, borderRadius:2, background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", overflow:"hidden" }}>
                                <div style={{ height:"100%", borderRadius:2, background:pc, width:`${barPct}%`, transition:"width 0.3s" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* 총 검색량 */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, padding:"10px 12px",
                        borderRadius:10, background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)", border:`1px solid ${accent}20` }}>
                        <span style={{ fontSize:12, fontWeight:700, color:muted }}>총 검색량</span>
                        <span style={{ fontSize:18, fontWeight:900, color:accent }}>{fmtVol(k.totalVolume)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {renderFooter && renderFooter()}
    </div>
  );
}

/* ── 공통 스타일 헬퍼 ─────────────────────────────────────────── */
function useGenColors(isDark) {
  return {
    ACC: "#7c6aff",
    bg: isDark ? "transparent" : "#f4f4f8",
    card: isDark ? "rgba(255,255,255,0.05)" : "#fff",
    bdr: isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0",
    text: isDark ? "#fff" : "#1a1a2e",
    muted: isDark ? "rgba(255,255,255,0.45)" : "#888",
    ibg: isDark ? "rgba(255,255,255,0.06)" : "#f9f9fc",
  };
}

function StepBar() { return null; }

// ── 탭 그룹 (글쓰기처럼 상단 탭 + 콘텐츠) ──
function TabbedGroup({ isDark, theme, title, subtitle, tabs, defaultTab, renderTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const accent = "#7c6aff";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* 헤더 + 탭 */}
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)" }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"16px 24px 0" }}>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:3 }}>{title}</div>
            <div style={{ fontSize:12, color:muted }}>{subtitle}</div>
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:2, borderBottom:`1px solid ${bdr}` }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  padding:"9px 20px", border:"none", cursor:"pointer", fontSize:13, fontWeight:activeTab===t.id?700:400,
                  color:activeTab===t.id?accent:muted, background:"transparent",
                  borderBottom:activeTab===t.id?`2px solid ${accent}`:"2px solid transparent",
                  transition:"all 0.15s", marginBottom:-1,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 콘텐츠 */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {renderTab(activeTab)}
      </div>
    </div>
  );
}

function GenLoading({ emoji, title, subtitle, ACC, isDark }) {
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const text = isDark ? "#fff" : "#1a1a2e";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
      <div style={{ fontSize:80, marginBottom:20, animation:"ai-float 2s ease-in-out infinite" }}>{emoji}</div>
      <div style={{ fontSize:22, fontWeight:900, color:ACC, marginBottom:8 }}>{title}</div>
      <div style={{ width:280, height:6, borderRadius:3, background:"rgba(128,128,128,0.15)", overflow:"hidden", marginBottom:16 }}>
        <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg,${ACC},#8b5cf6)`, animation:"ai-progress 4s ease-out forwards" }} />
      </div>
      <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>{subtitle}</div>
      <div style={{ marginTop:20, display:"flex", gap:8 }}>
        {["레이아웃 구성","스타일 적용","디테일 추가"].map((t,i)=>(
          <div key={i} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
            background:`${ACC}18`, color:ACC, border:`1px solid ${ACC}30`,
            animation:`ai-fadein 0.5s ease ${i*0.3}s both` }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function SelectGroup({ label, options, value, onChange, cols=3, ACC, bdr, muted, text }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>{label}</div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:6 }}>
        {options.map(o => (
          <button key={o.v||o} onClick={() => onChange(o.v||o)} style={{
            padding:"9px 8px", borderRadius:10, border:`1.5px solid ${value===(o.v||o)?ACC:bdr}`,
            background: value===(o.v||o)?`${ACC}18`:"transparent",
            color: value===(o.v||o)?ACC:muted, fontSize:12, fontWeight:700, cursor:"pointer",
            textAlign:"center", transition:"all 0.15s",
          }}>{o.l||o}</button>
        ))}
      </div>
    </div>
  );
}

/* ── 모델 생성기 ─────────────────────────────────────────── */
function ModelGenerator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenuFn }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted, ibg } = C;
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("20대");
  const [nationality, setNationality] = useState("한국인");
  const [outfit, setOutfit] = useState("캐주얼");
  const [bgType, setBgType] = useState("화이트 스튜디오");
  const [pose, setPose] = useState("정면");
  const [refImg, setRefImg] = useState(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const buildPrompt = () => {
    if (useCustom && customPrompt.trim()) return customPrompt.trim();
    const gMap = { female:"beautiful woman", male:"handsome man", both:"couple man and woman" };
    const nMap = { "한국인":"Korean", "일본인":"Japanese", "중국인":"Chinese", "서양인":"Caucasian Western", "흑인":"Black", "다양한":"multiethnic" };
    const oMap = { "캐주얼":"casual everyday outfit", "비즈니스":"business formal suit", "스트릿":"streetwear", "스포츠":"sportswear athletic wear", "드레스":"elegant dress", "한복":"traditional Korean hanbok", "코트":"stylish winter coat", "수영복":"swimwear beachwear" };
    const bMap = { "화이트 스튜디오":"clean white studio background", "카페 인테리어":"cozy cafe interior background", "도시 거리":"modern city street background", "자연/공원":"natural park outdoor background", "해변":"beautiful beach background" };
    const pMap = { "정면":"front facing camera full body", "측면":"side profile", "앉기":"sitting naturally", "걷기":"walking in motion", "자연스러운":"natural candid relaxed pose" };
    return `Professional commercial model photography, ${nMap[nationality]} ${age} ${gMap[gender]}, wearing ${oMap[outfit]}, ${bMap[bgType]}, ${pMap[pose]}, professional studio lighting, photorealistic, high resolution 4K, commercial quality fashion photography, sharp focus`;
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if ((user.points||0) < 10) { setErr("포인트가 부족합니다. 충전 후 이용해주세요."); setStep(3); return; }
    setStep(4); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    try {
      const body = { prompt: buildPrompt() };
      if (refImg) { body.productImageB64 = refImg.b64; body.productImageMime = refImg.mime; }
      const _tok = await getAuthToken();
      const res = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json", ...(_tok ? {Authorization:`Bearer ${_tok}`} : {})}, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다. 다시 시도해주세요.");
      setResult(data.image);
      setStep(5);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패. 다시 시도해주세요."); setStep(3); }
    finally { window.__isGenerating = false; }
  };

  const readRef = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setRefImg({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const W = { maxWidth:620, margin:"0 auto" };

  if (step === 4) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="모델 이미지 생성 중..." subtitle={"AI가 모델 이미지를 생성하고 있어요\n예상 시간: 15~25초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 5 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>생성 완료!</span>
          <span style={{ fontSize:13, color:muted }}>모델 이미지가 생성되었어요</span>
        </div>
        <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:20, animation:"ai-fadein 0.5s ease" }}>
          <img src={result} alt="generated model" style={{ width:"100%", display:"block" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <a href={result} download="model.png" style={{
            flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`,
            color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none",
          }}>⬇ PNG 다운로드</a>
          <button onClick={() => { setResult(null); setStep(1); }} style={{
            flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`,
            background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer",
          }}>🔄 다시 생성하기</button>
        </div>
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13 }}>{err}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={3} labels={["기본 설정","스타일 설정","참고·생성"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        {step === 1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>기본 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>모델의 성별, 나이대, 국적을 선택해요.</div>
            <SelectGroup label="성별" value={gender} onChange={setGender} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"female",l:"여자"},{v:"male",l:"남자"},{v:"both",l:"커플"}]} />
            <SelectGroup label="나이대" value={age} onChange={setAge} cols={4} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"10대",l:"10대"},{v:"20대",l:"20대"},{v:"30대",l:"30대"},{v:"40대",l:"40대"},{v:"50대",l:"50대+"}]} />
            <SelectGroup label="국적 / 인종" value={nationality} onChange={setNationality} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"한국인",l:"한국인"},{v:"일본인",l:"일본인"},{v:"중국인",l:"중국인"},{v:"서양인",l:"서양인"},{v:"흑인",l:"흑인"},{v:"다양한",l:"다양한"}]} />
            <button onClick={() => setStep(2)} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900 }}>
              다음 → 스타일 설정
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>스타일 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>의상, 배경, 포즈를 선택해요.</div>
            <SelectGroup label="의상 / 스타일" value={outfit} onChange={setOutfit} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"캐주얼",l:"캐주얼"},{v:"비즈니스",l:"비즈니스"},{v:"스트릿",l:"스트릿"},{v:"스포츠",l:"스포츠"},{v:"드레스",l:"드레스"},{v:"한복",l:"한복"},{v:"코트",l:"코트"},{v:"수영복",l:"수영복"}]} />
            <SelectGroup label="배경" value={bgType} onChange={setBgType} cols={2} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"화이트 스튜디오",l:"화이트 스튜디오"},{v:"카페 인테리어",l:"카페"},{v:"도시 거리",l:"도시 거리"},{v:"자연/공원",l:"자연/공원"},{v:"해변",l:"해변"}]} />
            <SelectGroup label="포즈" value={pose} onChange={setPose} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"정면",l:"정면"},{v:"측면",l:"측면"},{v:"앉기",l:"앉기"},{v:"걷기",l:"걷기"},{v:"자연스러운",l:"자연스러운"}]} />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={() => setStep(3)} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900 }}>다음 → 참고 이미지</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>참고 이미지 & 생성</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>참고 이미지를 추가하거나 직접 프롬프트를 입력할 수 있어요.</div>

            {/* 직접 프롬프트 토글 */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:card }}>
              <button onClick={() => setUseCustom(p=>!p)} style={{ width:40, height:22, borderRadius:11, border:"none", cursor:"pointer", background: useCustom?ACC:"rgba(128,128,128,0.2)", transition:"background 0.2s", flexShrink:0, position:"relative" }}>
                <div style={{ position:"absolute", top:2, left: useCustom?20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
              </button>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>직접 프롬프트 입력</div>
                <div style={{ fontSize:11, color:muted }}>설정 대신 영문 프롬프트를 직접 작성해요</div>
              </div>
            </div>

            {useCustom ? (
              <div style={{ marginBottom:16 }}>
                <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)}
                  placeholder="예) Korean 20s beautiful woman, casual white t-shirt, cafe background, natural smile, full body shot, professional photography..."
                  style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:13, outline:"none", resize:"vertical", minHeight:100, fontFamily:"inherit" }} />
              </div>
            ) : (
              <div style={{ padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:card, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>생성될 프롬프트 미리보기</div>
                <div style={{ fontSize:12, color:text, lineHeight:1.6 }}>{buildPrompt()}</div>
              </div>
            )}

            {/* 참고 이미지 */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>참고 이미지 (선택) – 분위기·스타일 반영</div>
              <label style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:10, border:`1.5px dashed ${refImg?ACC:bdr}`, cursor:"pointer", background:card }}>
                <span style={{ fontSize:14, fontWeight:700, color:refImg?ACC:muted }}>{refImg?"V":"+"}</span>
                <span style={{ fontSize:13, color:refImg?ACC:muted }}>{refImg?"참고 이미지 선택됨 (클릭하여 변경)":"이미지 파일 선택하기"}</span>
                <input type="file" accept="image/*" onChange={readRef} style={{ display:"none" }} />
              </label>
              {refImg && <div style={{ marginTop:8, borderRadius:8, overflow:"hidden", maxHeight:120 }}><img src={refImg.url} alt="" style={{ width:"100%", objectFit:"cover" }} /></div>}
            </div>

            {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(2)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={generate} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900, boxShadow:`0 6px 20px ${ACC}40` }}>
                모델 이미지 생성 (10P)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 전후 비교 슬라이더 공용 컴포넌트 ──────────────────── */
function BeforeAfterSlider({ srcImg, result, bdr, ACC, muted, text, onReset, downloadName }) {
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef(null);
  const startSlide = (clientX) => {
    const el = sliderRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = ev => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      setSliderPos(Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100)));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, {passive:true}); document.addEventListener("touchend", up);
    move({ clientX });
  };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
        <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>완료!</span>
        <span style={{ fontSize:13, color:muted }}>슬라이더로 전후를 비교해보세요</span>
      </div>
      <div ref={sliderRef}
        style={{ position:"relative", borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, cursor:"col-resize", animation:"ai-fadein 0.5s ease", userSelect:"none", touchAction:"none" }}
        onMouseDown={e => startSlide(e.clientX)}
        onTouchStart={e => startSlide(e.touches[0].clientX)}>
        {srcImg && <img src={srcImg.url} alt="before" style={{ width:"100%", display:"block" }} />}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", clipPath:`inset(0 ${100-sliderPos}% 0 0)` }}>
          <img src={result} alt="after" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
        </div>
        <div style={{ position:"absolute", top:0, bottom:0, left:`${sliderPos}%`, transform:"translateX(-50%)", width:3, background:"#fff", boxShadow:"0 0 8px rgba(0,0,0,0.4)" }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", fontSize:14 }}>◀▶</div>
        </div>
        <div style={{ position:"absolute", top:10, left:10, padding:"3px 8px", borderRadius:6, background:"rgba(0,0,0,0.55)", color:"#fff", fontSize:11, fontWeight:700 }}>원본</div>
        <div style={{ position:"absolute", top:10, right:10, padding:"3px 8px", borderRadius:6, background:`${ACC}cc`, color:"#fff", fontSize:11, fontWeight:700 }}>결과</div>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <a href={result} download={downloadName||"result.png"} style={{ flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none" }}>⬇ 다운로드</a>
        <button onClick={onReset} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>🔄 다시 시작</button>
      </div>
    </div>
  );
}

/* ── 얼굴 교체 ───────────────────────────────────────────── */
function FaceSwapGenerator({ isDark, user, onUserUpdate, onLoginRequest }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const [step, setStep] = useState(1);
  const [srcImg, setSrcImg] = useState(null); // 원본 (얼굴 교체 대상)
  const [refImg, setRefImg] = useState(null); // 참고 (교체할 얼굴)
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const readFile = setter => e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setter({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg || !refImg) { setErr("두 이미지를 모두 업로드해주세요."); return; }
    if ((user.points||0) < 10) { setErr("포인트가 부족합니다."); return; }
    setStep(3); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    const prompt = `Face swap task: The first image is the TARGET person. The second image is the REFERENCE face. Replace ONLY the face of the person in the first image with the face from the second image. Keep everything else identical: body shape, clothing, pose, hair (except where the face overlaps), background, lighting, and skin tone transition. The result must look photorealistic and seamless, as if it were an original photo. High quality, 4K resolution.`;
    try {
      const _tok2 = await getAuthToken();
      const res = await fetch("/api/generate-image", {
        method:"POST", headers:{"Content-Type":"application/json", ...(_tok2 ? {Authorization:`Bearer ${_tok2}`} : {})},
        body: JSON.stringify({ prompt, productImageB64: srcImg.b64, productImageMime: srcImg.mime, refImageB64: refImg.b64, refImageMime: refImg.mime })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image); setStep(4);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); setStep(2); }
    finally { window.__isGenerating = false; }
  };

  const W = { maxWidth:640, margin:"0 auto" };

  if (step === 3) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="얼굴 교체 중..." subtitle={"AI가 얼굴을 분석하고 자연스럽게 합성하고 있어요\n예상 시간: 20~35초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 4 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <BeforeAfterSlider srcImg={srcImg} result={result} bdr={bdr} ACC={ACC} muted={muted} text={text}
          onReset={() => { setResult(null); setStep(1); setSrcImg(null); setRefImg(null); }}
          downloadName="face_swap.png" />
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13 }}>{err}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={2} labels={["원본 업로드","참고 얼굴 + 생성"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        {/* 두 이미지를 나란히 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>① 원본 인물 사진</div>
            <label style={{ display:"block", cursor:"pointer" }}>
              <div style={{ aspectRatio:"3/4", borderRadius:12, border:`2px dashed ${srcImg?ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:6 }}>
                {srcImg ? <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:11, color:muted, textAlign:"center" }}>얼굴을 교체할<br/>원본 사진</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile(setSrcImg)} style={{ display:"none" }} />
            </label>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>② 참고 얼굴 사진</div>
            <label style={{ display:"block", cursor:"pointer" }}>
              <div style={{ aspectRatio:"3/4", borderRadius:12, border:`2px dashed ${refImg?ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:6 }}>
                {refImg ? <img src={refImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:11, color:muted, textAlign:"center" }}>가져올<br/>얼굴 사진</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile(setRefImg)} style={{ display:"none" }} />
            </label>
          </div>
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${ACC}10`, border:`1px solid ${ACC}30`, marginBottom:16, fontSize:12, color:muted, lineHeight:1.7 }}>
          <b style={{ color:text }}>원본</b>에서 얼굴만 교체되고 몸·의상·배경은 그대로 유지돼요.<br/>
          정면 또는 약간 측면의 선명한 얼굴 사진이 가장 잘 됩니다.
        </div>

        <button onClick={generate} disabled={!srcImg||!refImg}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:srcImg&&refImg?"pointer":"not-allowed",
            background: srcImg&&refImg?`linear-gradient(135deg,${ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg&&refImg?1:0.6 }}>
          얼굴 교체 생성하기 (10P)
        </button>
      </div>
    </div>
  );
}

/* ── 의상 교체 ───────────────────────────────────────────── */
function OutfitSwapGenerator({ isDark, user, onUserUpdate, onLoginRequest }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const OUTFIT_ACC = "#ec4899";
  const [srcImg, setSrcImg] = useState(null);
  const [refImg, setRefImg] = useState(null);
  const [outfitMode, setOutfitMode] = useState("ref"); // "ref" | "preset"
  const [presetOutfit, setPresetOutfit] = useState("캐주얼");
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const OUTFIT_PRESETS = [
    { v:"캐주얼", l:"캐주얼" }, { v:"비즈니스 정장", l:"비즈니스 정장" },
    { v:"드레스", l:"드레스" }, { v:"스포츠웨어", l:"스포츠웨어" },
    { v:"스트릿패션", l:"스트릿" }, { v:"한복", l:"한복" },
    { v:"수영복", l:"수영복" }, { v:"코트", l:"코트" },
  ];

  const readFile = setter => e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setter({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg) { setErr("원본 이미지를 업로드해주세요."); return; }
    if (outfitMode === "ref" && !refImg) { setErr("참고 의상 이미지를 업로드해주세요."); return; }
    if ((user.points||0) < 10) { setErr("포인트가 부족합니다."); return; }
    setGenerating(true); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    const outfitDesc = outfitMode === "ref"
      ? "the outfit/clothing exactly as shown in the second reference image"
      : `${presetOutfit} style outfit appropriate for the person`;
    const prompt = `Outfit swap task: Change ONLY the clothing and outfit of the person in the first image to ${outfitDesc}. Keep everything else EXACTLY the same: face, hairstyle, body shape, skin color, pose, background, and lighting. The clothing change must look natural, well-fitted, and photorealistic. High quality 4K result.`;
    try {
      const body = { prompt, productImageB64: srcImg.b64, productImageMime: srcImg.mime };
      if (outfitMode === "ref" && refImg) { body.refImageB64 = refImg.b64; body.refImageMime = refImg.mime; }
      const _tok3 = await getAuthToken();
      const res = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json", ...(_tok3 ? {Authorization:`Bearer ${_tok3}`} : {})}, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); }
    finally { setGenerating(false); window.__isGenerating = false; }
  };

  const W = { maxWidth:640, margin:"0 auto" };

  if (generating) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="의상 교체 중..." subtitle={"AI가 의상을 분석하고 자연스럽게 입히고 있어요\n예상 시간: 20~35초"} ACC={OUTFIT_ACC} isDark={isDark} />
    </div>
  );

  if (result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <BeforeAfterSlider srcImg={srcImg} result={result} bdr={bdr} ACC={OUTFIT_ACC} muted={muted} text={text}
          onReset={() => { setResult(null); setSrcImg(null); setRefImg(null); }}
          downloadName="outfit_swap.png" />
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13 }}>{err}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        {/* 원본 업로드 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:8 }}>① 원본 인물 사진</div>
          <label style={{ display:"block", cursor:"pointer" }}>
            <div style={{ aspectRatio:"3/4", maxHeight:300, borderRadius:12, border:`2px dashed ${srcImg?OUTFIT_ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:8 }}>
              {srcImg ? <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                : <><span style={{ fontSize:16, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:13, color:muted }}>의상을 교체할 인물 사진</span><span style={{ fontSize:11, color:muted }}>클릭하여 선택</span></>}
            </div>
            <input type="file" accept="image/*" onChange={readFile(setSrcImg)} style={{ display:"none" }} />
          </label>
        </div>

        {/* 의상 선택 방식 */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:8 }}>② 의상 선택 방식</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[{v:"ref",l:"참고 이미지로"},{v:"preset",l:"스타일 선택"}].map(o=>(
              <button key={o.v} onClick={()=>setOutfitMode(o.v)}
                style={{ padding:"11px", borderRadius:10, border:`2px solid ${outfitMode===o.v?OUTFIT_ACC:bdr}`, background:outfitMode===o.v?`${OUTFIT_ACC}15`:"transparent",
                  color:outfitMode===o.v?OUTFIT_ACC:muted, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {o.l}
              </button>
            ))}
          </div>

          {outfitMode === "ref" ? (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>입히고 싶은 의상 사진</div>
              <label style={{ display:"block", cursor:"pointer" }}>
                <div style={{ aspectRatio:"3/4", maxHeight:240, borderRadius:12, border:`2px dashed ${refImg?OUTFIT_ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:8 }}>
                  {refImg ? <img src={refImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:12, color:muted }}>의상 참고 사진</span><span style={{ fontSize:11, color:muted }}>클릭하여 선택</span></>}
                </div>
                <input type="file" accept="image/*" onChange={readFile(setRefImg)} style={{ display:"none" }} />
              </label>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>의상 스타일 선택</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {OUTFIT_PRESETS.map(o=>(
                  <button key={o.v} onClick={()=>setPresetOutfit(o.v)}
                    style={{ padding:"9px 4px", borderRadius:9, border:`1.5px solid ${presetOutfit===o.v?OUTFIT_ACC:bdr}`,
                      background:presetOutfit===o.v?`${OUTFIT_ACC}15`:"transparent",
                      color:presetOutfit===o.v?OUTFIT_ACC:muted, fontSize:11, fontWeight:700, cursor:"pointer", textAlign:"center" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${OUTFIT_ACC}10`, border:`1px solid ${OUTFIT_ACC}30`, marginBottom:16, fontSize:12, color:muted, lineHeight:1.7 }}>
          <b style={{ color:text }}>얼굴·포즈·배경</b>은 그대로 유지하고 의상만 교체해요.<br/>
          전신이 잘 보이는 사진일수록 더 잘 됩니다.
        </div>

        <button onClick={generate} disabled={!srcImg}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:srcImg?"pointer":"not-allowed",
            background: srcImg?`linear-gradient(135deg,${OUTFIT_ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg?1:0.6 }}>
          의상 교체 생성하기 (10P)
        </button>
      </div>
    </div>
  );
}

/* ── 여백 늘리기 (Outpainting) ─────────────────────── */
function OutpaintGenerator({ isDark, user, onUserUpdate, onLoginRequest }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const [step, setStep] = useState(1);
  const [srcImg, setSrcImg] = useState(null);
  const [sizeMode, setSizeMode] = useState("manual"); // "ratio" | "manual"
  // 비율 모드
  const [ratio, setRatio] = useState("16:9");
  const [imgX, setImgX] = useState(50);
  const [imgY, setImgY] = useState(50);
  // 수동 모드: 각 방향 확장 (0~400px 단위)
  const [expLeft,   setExpLeft]   = useState(100);
  const [expRight,  setExpRight]  = useState(100);
  const [expTop,    setExpTop]    = useState(0);
  const [expBottom, setExpBottom] = useState(0);
  const [fillStyle, setFillStyle] = useState("자연스럽게");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const readFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setSrcImg({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
      setImgX(50); setImgY(50);
    };
    reader.readAsDataURL(f);
  };

  const fillMap = {
    "자연스럽게": "seamlessly and naturally matching the existing content style, colors, and texture",
    "흐릿하게":   "with a soft blurred gradient fade that gently transitions to the surroundings",
    "배경확장":   "extending the surrounding environment and background scene",
  };

  const buildPrompt = () => {
    const fm = fillMap[fillStyle] || fillMap["자연스럽게"];
    if (sizeMode === "manual") {
      const dirs = [];
      if (expLeft  > 0) dirs.push(`${expLeft}px to the left`);
      if (expRight > 0) dirs.push(`${expRight}px to the right`);
      if (expTop   > 0) dirs.push(`${expTop}px to the top`);
      if (expBottom> 0) dirs.push(`${expBottom}px to the bottom`);
      const expansion = dirs.length ? dirs.join(", ") : "equally on all sides";
      return `Outpainting task: Expand the canvas by ${expansion}. Fill all new empty areas ${fm}. The filled areas must match the original image's lighting, color palette, and atmosphere. Make the result look like a single seamless photograph.`;
    }
    const hPos = imgX < 30 ? "left side" : imgX > 70 ? "right side" : "center";
    const vPos = imgY < 30 ? "top area"  : imgY > 70 ? "bottom area" : "middle";
    return `Outpainting task: The original image is positioned at the ${hPos}, ${vPos} of a ${ratio} aspect ratio canvas. Fill ALL empty areas around the original image ${fm}. Output: ${ratio} aspect ratio. Make the result look like a single seamless photograph.`;
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg) { setErr("이미지를 업로드해주세요."); return; }
    if (sizeMode === "manual" && expLeft===0 && expRight===0 && expTop===0 && expBottom===0) {
      setErr("최소 한 방향의 여백 크기를 0보다 크게 설정해주세요."); return;
    }
    if ((user.points||0) < 10) { setErr("포인트가 부족합니다."); return; }
    setStep(3); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    try {
      const _tok4 = await getAuthToken();
      const res = await fetch("/api/generate-image", {
        method:"POST", headers:{"Content-Type":"application/json", ...(_tok4 ? {Authorization:`Bearer ${_tok4}`} : {})},
        body: JSON.stringify({ prompt: buildPrompt(), productImageB64: srcImg.b64, productImageMime: srcImg.mime })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image); setStep(4);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); setStep(2); }
    finally { window.__isGenerating = false; }
  };

  const W = { maxWidth:640, margin:"0 auto" };
  const getRatioParts = r => { const [w,h]=r.split(":").map(Number); return {w:w||16,h:h||9}; };

  // 수동 모드 미리보기: 원본을 중앙, 주변에 확장 영역 표시
  const ManualPreview = () => {
    const maxExp = Math.max(expLeft, expRight, expTop, expBottom, 1);
    const scale = 120 / maxExp;
    const oW = 120, oH = 90; // 원본 표시 크기
    const pL = Math.round(expLeft  * scale);
    const pR = Math.round(expRight * scale);
    const pT = Math.round(expTop   * scale);
    const pB = Math.round(expBottom* scale);
    const totalW = pL + oW + pR;
    const totalH = pT + oH + pB;
    const maxW = 320;
    const scaleDown = totalW > maxW ? maxW / totalW : 1;
    const fw = Math.round(totalW * scaleDown);
    const fh = Math.round(totalH * scaleDown);
    const sl = Math.round(pL * scaleDown);
    const st = Math.round(pT * scaleDown);
    const sw = Math.round(oW * scaleDown);
    const sh = Math.round(oH * scaleDown);
    return (
      <div style={{ position:"relative", width:fw, height:fh, margin:"0 auto 12px",
        borderRadius:10, overflow:"hidden", border:`2px solid ${ACC}` }}>
        {/* 확장 영역 (격자) */}
        <div style={{ position:"absolute", inset:0,
          backgroundImage:`repeating-linear-gradient(45deg,${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"} 0,${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"} 1px,transparent 0,transparent 50%)`,
          backgroundSize:"10px 10px",
          background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)" }} />
        {/* 원본 이미지 영역 */}
        <div style={{ position:"absolute", left:sl, top:st, width:sw, height:sh,
          border:`2px solid ${ACC}`, borderRadius:4, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.3)" }}>
          <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        </div>
        {/* 방향 라벨 */}
        {expLeft  > 0 && <div style={{ position:"absolute", left:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>←{expLeft}px</div>}
        {expRight > 0 && <div style={{ position:"absolute", right:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>{expRight}px→</div>}
        {expTop   > 0 && <div style={{ position:"absolute", top:2, left:"50%", transform:"translateX(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>↑{expTop}px</div>}
        {expBottom> 0 && <div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>{expBottom}px↓</div>}
      </div>
    );
  };

  if (step === 3) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="여백 늘리는 중..." subtitle={"이미지의 빈 공간을 AI가 채우고 있어요\n예상 시간: 15~25초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 4 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>생성 완료!</span>
        </div>
        <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:20, animation:"ai-fadein 0.5s ease" }}>
          <img src={result} alt="outpainted" style={{ width:"100%", display:"block" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <a href={result} download="outpainted.png" style={{ flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none" }}>⬇ PNG 다운로드</a>
          <button onClick={() => { setResult(null); setStep(1); setSrcImg(null); }} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>🔄 다시 하기</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={2} labels={["이미지 업로드","크기·설정"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        {step === 1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>이미지 업로드</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>여백을 늘릴 이미지를 업로드해요.</div>
            <label style={{ display:"block", cursor:"pointer", marginBottom:20 }}>
              <div style={{ minHeight:200, borderRadius:14, border:`2px dashed ${srcImg?ACC:bdr}`, background:card,
                display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:10, padding:20 }}>
                {srcImg
                  ? <img src={srcImg.url} alt="" style={{ maxWidth:"100%", maxHeight:240, objectFit:"contain", borderRadius:8 }} />
                  : <><span style={{ fontSize:16, color:muted, fontWeight:700 }}>이미지</span><span style={{ fontSize:14, color:muted }}>확장할 이미지 업로드</span><span style={{ fontSize:12, color:muted }}>클릭하여 선택</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile} style={{ display:"none" }} />
            </label>
            <button onClick={() => { if(!srcImg){setErr("이미지를 업로드해주세요.");return;} setErr(""); setStep(2); }} style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:srcImg?"pointer":"not-allowed",
              background: srcImg?`linear-gradient(135deg,${ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
              color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg?1:0.6,
            }}>다음 → 크기 설정</button>
          </div>
        )}

        {step === 2 && srcImg && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>여백 크기 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:16 }}>원하는 방향과 크기를 설정하면 AI가 자연스럽게 채워드려요.</div>

            {/* 모드 선택 탭 */}
            <div style={{ display:"flex", background: isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", borderRadius:12, padding:4, marginBottom:20 }}>
              {[{v:"manual",l:"수동 설정"},{v:"ratio",l:"비율 선택"}].map(({v,l}) => (
                <button key={v} onClick={()=>setSizeMode(v)} style={{
                  flex:1, padding:"9px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                  background: sizeMode===v ? (isDark?"rgba(255,255,255,0.12)":"#fff") : "transparent",
                  color: sizeMode===v ? (v==="manual"?ACC:text) : muted,
                  boxShadow: sizeMode===v ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  transition:"all 0.15s",
                }}>{l}</button>
              ))}
            </div>

            {/* ── 수동 설정 모드 ── */}
            {sizeMode === "manual" && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10 }}>📐 방향별 확장 크기</div>

                {/* 미리보기 */}
                {ManualPreview()}

                {/* 슬라이더 4개 */}
                {[
                  { label:"← 왼쪽 확장", val:expLeft,   set:setExpLeft,   color:"#7c6aff" },
                  { label:"오른쪽 확장 →", val:expRight, set:setExpRight, color:"#8b5cf6" },
                  { label:"↑ 위쪽 확장",  val:expTop,   set:setExpTop,    color:"#ec4899" },
                  { label:"아래쪽 확장 ↓", val:expBottom,set:setExpBottom, color:"#f59e0b" },
                ].map(({label,val,set,color}) => (
                  <div key={label} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:text }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:900, color:color, minWidth:52, textAlign:"right" }}>{val}px</span>
                    </div>
                    <input type="range" min={0} max={400} step={20} value={val}
                      onChange={e=>set(Number(e.target.value))}
                      style={{ width:"100%", accentColor:color }} />
                    {/* 빠른 값 버튼 */}
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {[0,50,100,150,200,300,400].map(px => (
                        <button key={px} onClick={()=>set(px)} style={{
                          padding:"3px 9px", borderRadius:6, border:`1px solid ${val===px?color:bdr}`,
                          background: val===px?`${color}18`:"transparent",
                          color: val===px?color:muted, fontSize:10, fontWeight:700, cursor:"pointer",
                        }}>{px===0?"없음":`${px}px`}</button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 프리셋 버튼 */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>빠른 프리셋</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6 }}>
                    {[
                      {l:"← 왼쪽만",   vals:[200,0,0,0]},
                      {l:"오른쪽만 →", vals:[0,200,0,0]},
                      {l:"↑↓ 위아래",  vals:[0,0,150,150]},
                      {l:"← → 양쪽",   vals:[150,150,0,0]},
                      {l:"전방향 균일", vals:[100,100,100,100]},
                      {l:"와이드 배너", vals:[200,200,0,0]},
                    ].map(({l,vals:[L,R,T,B]}) => (
                      <button key={l} onClick={()=>{setExpLeft(L);setExpRight(R);setExpTop(T);setExpBottom(B);}}
                        style={{ padding:"8px 10px", borderRadius:9, border:`1px solid ${bdr}`, background:"transparent",
                          color:muted, fontSize:11, fontWeight:700, cursor:"pointer", textAlign:"left",
                          transition:"all 0.1s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.color=ACC;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 비율 선택 모드 ── */}
            {sizeMode === "ratio" && (
              <div>
                <SelectGroup label="목표 비율" value={ratio} onChange={setRatio} cols={4} ACC={ACC} bdr={bdr} muted={muted} text={text}
                  options={["16:9","21:9","4:3","3:2","2:1","1:1","9:16","3:4"]} />

                {/* 비율 프리뷰 + 위치 슬라이더 */}
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10 }}>📍 이미지 위치 조정</div>
                  {(() => {
                    const { w: rw, h: rh } = getRatioParts(ratio);
                    const frameW = 300, frameH = Math.round(frameW * rh / rw);
                    const imgDispW = Math.round(frameW * 0.48), imgDispH = Math.round(frameW * 0.48);
                    const imgLeft = Math.round((imgX / 100) * (frameW - imgDispW));
                    const imgTop  = Math.round((imgY / 100) * (frameH - imgDispH));
                    return (
                      <div style={{ position:"relative", width:frameW, height:Math.min(frameH,220), margin:"0 auto 16px",
                        borderRadius:12, overflow:"hidden", border:`2px solid ${ACC}`,
                        background: isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)" }}>
                        <div style={{ position:"absolute", inset:0,
                          backgroundImage:`repeating-linear-gradient(45deg,${isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 0,${isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px,transparent 0,transparent 50%)`,
                          backgroundSize:"12px 12px" }} />
                        <div style={{ position:"absolute", left:imgLeft, top:Math.min(imgTop,Math.min(frameH,220)-imgDispH),
                          width:imgDispW, height:imgDispH,
                          border:`2px solid ${ACC}`, borderRadius:6, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>
                          <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                        </div>
                        <div style={{ position:"absolute", bottom:6, right:8, fontSize:9, color:isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.4)", fontWeight:700 }}>{ratio}</div>
                      </div>
                    );
                  })()}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginBottom:5 }}>
                      <span>← 왼쪽</span><span style={{ fontWeight:700, color:ACC }}>수평 위치</span><span>오른쪽 →</span>
                    </div>
                    <input type="range" min={0} max={100} value={imgX} onChange={e=>setImgX(Number(e.target.value))} style={{ width:"100%", accentColor:ACC }} />
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginBottom:5 }}>
                      <span>↑ 상단</span><span style={{ fontWeight:700, color:ACC }}>수직 위치</span><span>하단 ↓</span>
                    </div>
                    <input type="range" min={0} max={100} value={imgY} onChange={e=>setImgY(Number(e.target.value))} style={{ width:"100%", accentColor:ACC }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginTop:8 }}>
                    {[{l:"좌상",x:0,y:0},{l:"상단",x:50,y:0},{l:"우상",x:100,y:0},
                      {l:"왼쪽",x:0,y:50},{l:"중앙",x:50,y:50},{l:"오른쪽",x:100,y:50},
                      {l:"좌하",x:0,y:100},{l:"하단",x:50,y:100},{l:"우하",x:100,y:100}].map(({l,x,y})=>(
                      <button key={l} onClick={()=>{setImgX(x);setImgY(y);}}
                        style={{ padding:"5px 4px", borderRadius:7, border:`1px solid ${(imgX===x&&imgY===y)?ACC:bdr}`,
                          background:(imgX===x&&imgY===y)?`${ACC}18`:"transparent",
                          color:(imgX===x&&imgY===y)?ACC:muted, fontSize:10, fontWeight:700, cursor:"pointer" }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 채우기 스타일 (공통) */}
            <SelectGroup label="채우기 스타일" value={fillStyle} onChange={setFillStyle} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"자연스럽게",l:"자연스럽게"},{v:"흐릿하게",l:"흐릿하게"},{v:"배경확장",l:"배경 확장"}]} />

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={generate} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900, boxShadow:`0 6px 20px ${ACC}40` }}>
                여백 늘리기 (10P)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AiContent({ aiMenu, user, setAiMenu, navigate, navigateBoard, navigateAi, C, theme, onLoginRequest, onUserUpdate }) {
  const isDark = theme === "dark";
  const homeText  = isDark ? "#fff"                   : "#1a1a2e";
  const homeMuted = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const cardBdr   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardDescC = isDark ? "rgba(255,255,255,0.4)"  : "#888";

  const { t: tt } = useI18n();
  const { lang: _lang } = useI18n();
  const isKo = _lang === "ko";
  const _s = (ko, en) => isKo ? ko : en;

  const AiFooter = () => null;

  // 보관함
  if (aiMenu === "library") {
    return <LibraryPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} cardDescC={cardDescC} setAiMenu={setAiMenu} renderFooter={() => <AiFooter />} />;
  }

  // 바형 헤더 공용
  const BarHeader = ({ title, subtitle }) => (
    <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"#e5e7eb"}` }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"16px 24px" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:18, fontWeight:900, color:homeText, marginBottom:3 }}>{title}</div>
          <div style={{ fontSize:12, color:homeMuted }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );

  // 기획 스튜디오
  if (aiMenu === "prompt_studio") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <BarHeader title="기획" subtitle="실무 문서를 AI가 작성해드립니다" />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <PromptStudioPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} setAiMenu={setAiMenu} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} theme={theme} renderFooter={() => <AiFooter />} noHeader />
        </div>
      </div>
    );
  }

  // PPT 제작
  if (aiMenu === "ppt_gen") {
    return (
      <div key="ppt_gen" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <BarHeader title="PPT 제작" subtitle="주제를 입력하면 AI가 프레젠테이션을 생성해요" />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <PptGenerator isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
        </div>
      </div>
    );
  }

  // 핫 키워드
  if (aiMenu === "hot_keyword") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <BarHeader title="핫 키워드" subtitle="플랫폼별 실시간 인기 키워드를 확인하세요" />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <HotKeywordPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} renderFooter={() => <AiFooter />} noHeader />
        </div>
      </div>
    );
  }

  // SVG 아이콘 맵
  const TOOL_ICONS = {
    blog_write: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    blog_link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    cardnews_simple: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    detail_simple: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    thumbnail_gen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    product_shot: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    logo_gen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    mockup_gen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    model_gen: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    face_swap: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    outfit_swap: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46a1 1 0 0 0-.62.94V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4.4a1 1 0 0 0-.62-.94z"/></svg>,
    outpaint: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    shorts_make: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  };

  // 홈
  if (!aiMenu || aiMenu === "home") {
    const MENUS = [
      { id: "blog_write",       title: _s("글쓰기","SNS Writing"),      desc: _s("블로그·카페·인스타·스레드","Blog, Cafe, Insta, Threads"), cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)", iconImg: "/icon-naver-blog.png"  },
      { id: "blog_link",        title: _s("링크 글쓰기","Link to Blog"),   desc: _s("유튜브·뉴스·블로그·SNS 링크","YouTube, News, Blog, SNS link"),  cr: 10, darkColor: "rgba(99,102,241,0.18)",   lightColor: "rgba(99,102,241,0.05)", iconImg: "/icon-youtube.png"   },
      { id: "cardnews_simple",  title: _s("카드뉴스","Card News"),    desc: _s("텍스트 편집 방식","Text editing style"),         cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)"  },
      { id: "detail_simple",    title: _s("상세페이지","Detail Page"),  desc: _s("텍스트 편집 방식","Text editing style"),         cr: 10, darkColor: "rgba(16,185,129,0.18)",  lightColor: "rgba(16,185,129,0.07)"  },
      { id: "thumbnail_gen",    title: _s("썸네일 생성","Thumbnail Generator"),  desc: _s("유튜브·인스타 썸네일","YouTube & Instagram Thumbnail"), cr: 0, darkColor: "rgba(239,68,68,0.18)",  lightColor: "rgba(239,68,68,0.07)"  },
      { id: "product_shot", title: _s("제품컷 생성","Product Shot"),       desc: _s("AI 광고용 제품 이미지","AI product image for ads"),    cr: 10, darkColor: "rgba(249,115,22,0.18)",  lightColor: "rgba(249,115,22,0.07)"  },
      { id: "logo_gen",     title: _s("로고 생성","Logo Generator"),         desc: _s("AI 맞춤 로고 제작","AI custom logo creation"),        cr: 10, darkColor: "rgba(6,182,212,0.18)",   lightColor: "rgba(6,182,212,0.07)"   },
      { id: "mockup_gen",   title: _s("목업 생성","Mockup Generator"),         desc: _s("제품·브랜드 목업 제작","Product & brand mockup"),    cr: 10, darkColor: "rgba(124,58,237,0.18)",  lightColor: "rgba(124,58,237,0.07)"  },
      { id: "model_gen",    title: _s("모델 생성","Model Generator"),         desc: _s("AI 광고 모델 생성","AI ad model generation"), cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "face_swap",    title: _s("얼굴 교체","Face Swap"),         desc: _s("얼굴만 교체 · 비교 슬라이더","Face swap with comparison slider"), cr: 10, darkColor: "rgba(16,185,129,0.18)",  lightColor: "rgba(16,185,129,0.07)"  },
      { id: "outfit_swap",  title: _s("의상 교체","Outfit Swap"),         desc: _s("옷·스타일 교체","Clothing & style swap"),           cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "outpaint",     title: _s("여백 늘리기","Outpaint"),      desc: _s("수동 크기 조절 + AI 채우기","Manual resize + AI fill"), cr: 10, darkColor: "rgba(245,158,11,0.18)",  lightColor: "rgba(245,158,11,0.07)"  },
      { id: "shorts_make",  title: _s("쇼츠 영상 만들기","Shorts Video Maker"), desc: _s("AI 분석 + 자동 편집","AI analysis + auto editing"), cr: 10, darkColor: "rgba(239,68,68,0.18)", lightColor: "rgba(239,68,68,0.07)", iconImg: "/icon-youtube.png" },
    ];
    // 카테고리별 그룹
    const GROUPS = [
      { label: _s("SNS 글쓰기","SNS Writing"), color: "#7c6aff",
        items: MENUS.filter(m => m.id.startsWith("blog_")) },
      { label: _s("SNS 이미지","SNS Image"), color: "#ec4899",
        items: MENUS.filter(m => ["cardnews_simple","detail_simple","thumbnail_gen"].includes(m.id)) },
      { label: _s("이미지 생성","Image Generation"), color: "#f59e0b",
        items: MENUS.filter(m => ["product_shot","logo_gen","mockup_gen","model_gen","face_swap","outfit_swap","outpaint"].includes(m.id)) },
      { label: _s("영상 제작","Video Production"), color: "#ef4444",
        items: MENUS.filter(m => m.id === "shorts_make") },
    ];

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 60px", background: isDark ? "transparent" : "#f8f8fb" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* 헤더 - 심플하게 */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: homeText, marginBottom: 6 }}>{_s("무엇을 만들어볼까요?","What would you like to create?")}</div>
            <div style={{ fontSize: 14, color: homeMuted }}>{_s("왼쪽 메뉴에서 선택하거나, 아래에서 도구를 골라보세요.","Select from the menu or choose a tool below.")}</div>
          </div>

          {/* SNS 연동 유도 배너 */}
          <SnsConnectBanner isDark={isDark} user={user} variant="home" connectedPlatforms={snsConns} onNavigateProfile={() => setAiMenu("profile")} />

          {/* 카테고리별 그리드 */}
          {GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: group.color }}>{group.label}</div>
                <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                <div style={{ fontSize: 11, color: homeMuted }}>{group.items.length}{_s("개","")}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
                {group.items.map(m => (
                  <div key={m.id} onClick={() => setAiMenu(m.id)} style={{
                    padding: "18px 16px", borderRadius: 14, border: `1px solid ${cardBdr}`,
                    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isDark ? "0 6px 20px rgba(0,0,0,0.3)" : "0 6px 20px rgba(0,0,0,0.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? m.darkColor : m.lightColor, display: "flex", alignItems: "center", justifyContent: "center", color: group.color, flexShrink: 0 }}>
                      {m.iconImg ? <img src={m.iconImg} alt="" style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4 }} /> : (TOOL_ICONS[m.id] || m.title[0])}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: homeText, marginBottom: 2 }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: cardDescC, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.desc}</div>
                    </div>
                    {m.cr > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.35)" : "#bbb", flexShrink: 0 }}>{m.cr}P</div>}
                  </div>
                ))}
              </div>
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
      <div style={{ flex:1, overflowY:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 20px" }}>
        <div style={{ maxWidth:620, width:"100%" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{icon}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:`${color}18`, border:`1px solid ${color}40`, marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color }}>{badge}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:900, color:t, letterSpacing:-0.5, marginBottom:8 }}>{title}</div>
            <div style={{ fontSize:14, color:m, lineHeight:1.8, maxWidth:440, margin:"0 auto" }}>{subtitle}</div>
          </div>
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13, fontWeight:800, color:t, marginBottom:14 }}>{tt("introSteps")}</div>
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
            <div style={{ fontSize:13, fontWeight:800, color:t, marginBottom:12 }}>{tt("introFeatures")}</div>
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

  // ── 블로그 인트로 데이터 (다국어) ─────────────────────────
  const BLOG_INTRO = {
    blog_naver: {
      icon:"N", title:_s("네이버 블로그","Naver Blog"), badge:_s("SEO 최적화 · 장문 콘텐츠","SEO Optimized · Long-form"), color:"#4ade80",
      subtitle:_s("키워드 기반 SEO 최적화 네이버 블로그 포스트를 AI가 자동 작성해줘요.","AI auto-writes SEO-optimized Naver blog posts based on keywords."),
      steps:[
        { title:_s("주제 입력","Enter Topic"), desc:_s("블로그 주제나 키워드를 입력하거나 예시에서 선택해요.","Enter a blog topic/keyword or choose from examples.") },
        { title:_s("세부 설정","Settings"), desc:_s("글의 톤, 분량, 대상 독자를 설정해요.","Set tone, length, and target audience.") },
        { title:_s("AI 글쓰기","AI Writing"), desc:_s("AI가 서론·본론·결론 구조로 완성된 블로그 글을 작성해요.","AI writes a complete blog post with intro, body, conclusion.") },
        { title:_s("복사 & 활용","Copy & Use"), desc:_s("생성된 글을 복사해 바로 붙여넣기해요.","Copy and paste the generated text directly.") },
      ],
      features:[
        { icon:"", label:_s("SEO 최적화","SEO Optimized") }, { icon:"", label:_s("장문 작성","Long-form") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("네이버 블로그 글 작성하기","Write Naver Blog Post"),
    },
    blog_tistory: {
      icon:"T", title:_s("티스토리 블로그","Tistory Blog"), badge:_s("구조화된 포스팅 · HTML 지원","Structured Post · HTML"), color:"#f97316",
      subtitle:_s("티스토리에 최적화된 구조로 블로그 포스트를 생성해줘요.","AI generates blog posts optimized for Tistory format."),
      steps:[
        { title:_s("주제 입력","Enter Topic"), desc:_s("포스팅할 주제나 키워드를 입력해요.","Enter topic or keyword to post about.") },
        { title:_s("세부 설정","Settings"), desc:_s("글의 톤, 분량, 포함할 내용을 설정해요.","Set tone, length, and content to include.") },
        { title:_s("AI 글쓰기","AI Writing"), desc:_s("AI가 티스토리 형식에 맞는 포스트를 작성해요.","AI writes a post formatted for Tistory.") },
        { title:_s("복사 & 활용","Copy & Use"), desc:_s("생성된 글을 복사해 바로 붙여넣기해요.","Copy and paste directly to Tistory.") },
      ],
      features:[
        { icon:"", label:_s("구조화 포스팅","Structured") }, { icon:"", label:_s("자연스러운 문체","Natural Style") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("티스토리 글 작성하기","Write Tistory Post"),
    },
    blog_insta: {
      icon:"IG", title:_s("인스타그램 캡션","Instagram Caption"), badge:_s("짧고 임팩트있는 · 해시태그 포함","Short & Impactful · Hashtags"), color:"#ec4899",
      subtitle:_s("인스타그램 게시물에 딱 맞는 캡션과 해시태그를 AI가 생성해줘요.","AI generates perfect captions and hashtags for Instagram posts."),
      steps:[
        { title:_s("주제 입력","Enter Topic"), desc:_s("게시할 사진이나 영상의 주제를 설명해요.","Describe the photo/video topic to post.") },
        { title:_s("톤 설정","Set Tone"), desc:_s("감성적·유머러스·정보성 등 분위기를 선택해요.","Choose mood: emotional, humorous, informative, etc.") },
        { title:_s("AI 캡션 생성","AI Caption"), desc:_s("AI가 캡션과 해시태그를 함께 작성해줘요.","AI writes caption text with relevant hashtags.") },
        { title:_s("복사 & 게시","Copy & Post"), desc:_s("캡션을 복사해 인스타그램에 붙여넣기해요.","Copy and paste to Instagram.") },
      ],
      features:[
        { icon:"", label:_s("해시태그 자동","Auto Hashtags") }, { icon:"", label:_s("감성 문구","Catchy Copy") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("인스타그램 캡션 작성하기","Write Instagram Caption"),
    },
    blog_youtube: {
      icon:"YT", title:_s("유튜브 대본","YouTube Script"), badge:_s("영상 대본 · 설명란 포함","Script · Description"), color:"#ef4444",
      subtitle:_s("유튜브 영상 대본과 설명란 텍스트를 AI가 작성해줘요.","AI writes YouTube video scripts and description text."),
      steps:[
        { title:_s("영상 주제 입력","Enter Video Topic"), desc:_s("만들 영상의 주제와 핵심 내용을 입력해요.","Enter the video topic and key points.") },
        { title:_s("채널 스타일 설정","Channel Style"), desc:_s("채널 분위기와 대상 시청자층을 설정해요.","Set channel mood and target audience.") },
        { title:_s("AI 대본 생성","AI Script"), desc:_s("AI가 인트로·본론·아웃트로 구조의 대본을 작성해요.","AI writes script with intro, body, outro structure.") },
        { title:_s("복사 & 활용","Copy & Use"), desc:_s("대본과 설명란을 복사해 바로 사용해요.","Copy script and description to use directly.") },
      ],
      features:[
        { icon:"", label:_s("대본 + 설명란","Script + Desc") }, { icon:"", label:_s("자연스러운 말투","Natural Tone") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("유튜브 대본 작성하기","Write YouTube Script"),
    },
    blog_thread: {
      icon:"TH", title:_s("스레드","Threads"), badge:_s("짧고 임팩트있는 · 연속 게시","Short & Bold · Thread Series"), color:"#7c6aff",
      subtitle:_s("스레드에 올릴 짧고 임팩트 있는 게시물을 AI가 작성해줘요.","AI writes short, impactful posts for Threads."),
      steps:[
        { title:_s("주제 입력","Enter Topic"), desc:_s("스레드에 올릴 주제를 입력해요.","Enter the topic for your thread post.") },
        { title:_s("형식 선택","Format"), desc:_s("단일 포스트 또는 연속 스레드를 선택해요.","Choose single post or thread series.") },
        { title:_s("AI 글쓰기","AI Writing"), desc:_s("AI가 짧고 임팩트 있는 글을 작성해요.","AI writes short, bold text for Threads.") },
        { title:_s("복사 & 게시","Copy & Post"), desc:_s("완성된 게시물을 복사해 올려요.","Copy and post to Threads.") },
      ],
      features:[
        { icon:"", label:_s("짧고 강렬한","Short & Bold") }, { icon:"", label:_s("연속 스레드","Thread Series") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("스레드 게시물 작성하기","Write Thread Post"),
    },
    blog_link: {
      icon:"LK", title:_s("링크 글쓰기","Link to Blog"), badge:_s("유튜브·뉴스 → 블로그 자동 변환","YouTube/News → Blog Auto Convert"), color:"#6366f1",
      subtitle:_s("유튜브 영상이나 뉴스 기사 URL을 입력하면 블로그 포스트로 자동 변환해줘요.","Enter a YouTube or News URL and AI converts it to a blog post."),
      steps:[
        { title:_s("링크 타입 선택","Select Link Type"), desc:_s("유튜브 또는 뉴스 기사를 선택해요.","Choose YouTube or News article.") },
        { title:_s("URL 입력","Enter URL"), desc:_s("변환할 콘텐츠의 URL을 붙여넣기해요.","Paste the content URL.") },
        { title:_s("AI 자동 분석","AI Analysis"), desc:_s("AI가 콘텐츠를 분석하고 블로그 글로 변환해요.","AI analyzes content and converts to a blog post.") },
        { title:_s("복사 & 활용","Copy & Use"), desc:_s("완성된 글을 복사해 바로 사용해요.","Copy and use the generated post.") },
      ],
      features:[
        { icon:"", label:_s("URL만 입력","URL Only") }, { icon:"", label:_s("AI 자동 분석","AI Analysis") },
        { icon:"", label:"10P" }, { icon:"", label:_s("빠른 변환","Fast Convert") },
      ],
      cta:_s("링크로 글쓰기 시작","Start Writing from Link"),
    },
    blog_cafe: {
      icon:"CF", title:_s("네이버 카페 글쓰기","Naver Cafe Post"), badge:_s("짧고 친근한 · 커뮤니티형","Short & Friendly · Community"), color:"#03C75A",
      subtitle:_s("네이버 카페에 어울리는 친근한 게시글을 AI가 작성해줘요.","AI writes friendly community posts for Naver Cafe."),
      steps:[
        { title:_s("카테고리 선택","Select Category"), desc:_s("정보, 후기, 질문, 자유 게시글 중 선택해요.","Choose from info, review, Q&A, or free post.") },
        { title:_s("주제 입력","Enter Topic"), desc:_s("키워드나 주제를 입력해요.","Enter keyword or topic.") },
        { title:_s("AI 글쓰기","AI Writing"), desc:_s("카페 분위기에 맞는 글을 AI가 작성해요.","AI writes a post matching cafe atmosphere.") },
        { title:_s("복사 & 게시","Copy & Post"), desc:_s("완성된 글을 복사해 카페에 붙여넣기해요.","Copy and paste to Naver Cafe.") },
      ],
      features:[
        { icon:"", label:_s("자연스러운 문체","Natural Style") }, { icon:"", label:_s("다양한 카테고리","Various Categories") },
        { icon:"", label:"10P" }, { icon:"", label:_s("복사 저장","Copy & Save") },
      ],
      cta:_s("네이버 카페 글 작성하기","Write Naver Cafe Post"),
    },
  };

  // 링크 글쓰기 (유튜브 + 뉴스 통합)
  if (aiMenu === "blog_link") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />;
  }
  if (aiMenu === "blog_link_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />;
  }
  // 하위 호환 - 기존 메뉴 ID로 접근 시 통합 페이지로 이동
  if (aiMenu === "blog_news" || aiMenu === "blog_news_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} defaultTab="news" />;
  }
  if (aiMenu === "blog_yt_blog" || aiMenu === "blog_yt_blog_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} defaultTab="youtube" />;
  }

  // 블로그 계열 인트로 → 인트로 없이 직접 도구로 이동
  if (aiMenu.endsWith("_intro") && aiMenu.startsWith("blog_")) {
    const baseId = aiMenu.replace("_intro", "");
    const info = BLOG_MAP[baseId] || { type: "blog", label: "블로그 글쓰기" };
    return (
      <div key={baseId} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BlogGenerator initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
      </div>
    );
  }

  // 통합 글쓰기 (플랫폼 선택)
  if (aiMenu === "blog_write") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />;
  }

  // 네이버 카페 글쓰기 (하위호환)
  if (aiMenu === "blog_cafe_intro" || aiMenu === "blog_cafe" || aiMenu === "blog_cafe_make") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} defaultPlatform="blog_cafe" />;
  }

  // 블로그 계열 생성기 (하위호환)
  if (aiMenu.startsWith("blog_")) {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} defaultPlatform={aiMenu} />;
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

  // ── 콘텐츠 제작기 (카드뉴스 + 상세페이지 + 썸네일) ──
  if (["cardnews_simple","cardnews_make","cardnews_simple_make","detail_simple","detail_simple_make","thumbnail_gen","thumbnail_gen_make","content_create"].some(x => aiMenu === x || aiMenu?.startsWith(x))) {
    return <TabbedGroup key="content" isDark={isDark} theme={theme}
      title="콘텐츠 제작" subtitle="카드뉴스, 상세페이지, 썸네일을 제작하세요"
      tabs={[
        { id:"cardnews_simple", label:"카드뉴스" },
        { id:"detail_simple", label:"상세페이지" },
        { id:"thumbnail_gen", label:"썸네일" },
      ]}
      defaultTab={aiMenu.startsWith("thumbnail")?"thumbnail_gen":aiMenu.startsWith("detail")?"detail_simple":"cardnews_simple"}
      renderTab={(tab) => {
        if (tab === "cardnews_simple") return <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} />;
        if (tab === "detail_simple") return <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} />;
        if (tab === "thumbnail_gen") return <ThumbnailGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} />;
        return null;
      }}
    />;
  }

  // ── 이미지 생성 (제품컷 + 로고 + 목업 + 모델) ──
  if (["product_shot","logo_gen","mockup_gen","model_gen","image_create"].some(x => aiMenu === x || aiMenu?.startsWith(x))) {
    return <TabbedGroup key="imggen" isDark={isDark} theme={theme}
      title="이미지 생성" subtitle="AI로 제품컷, 로고, 목업, 모델 이미지를 생성하세요"
      tabs={[
        { id:"product_shot", label:"제품컷" },
        { id:"logo_gen", label:"로고" },
        { id:"mockup_gen", label:"목업" },
        { id:"model_gen", label:"모델" },
      ]}
      defaultTab={aiMenu.startsWith("logo")?"logo_gen":aiMenu.startsWith("mockup")?"mockup_gen":aiMenu.startsWith("model")?"model_gen":"product_shot"}
      renderTab={(tab) => {
        if (tab === "product_shot") return <ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} />;
        if (tab === "logo_gen") return <LogoGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} />;
        if (tab === "mockup_gen") return <MockupGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} />;
        if (tab === "model_gen") return <ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
        return null;
      }}
    />;
  }

  // ── 이미지 수정 (얼굴교체 + 의상교체 + 여백늘리기) ──
  if (["face_swap","outfit_swap","outpaint","image_edit"].some(x => aiMenu === x || aiMenu?.startsWith(x))) {
    return <TabbedGroup key="imgedit" isDark={isDark} theme={theme}
      title="이미지 수정" subtitle="AI로 얼굴 교체, 의상 교체, 여백 확장을 할 수 있어요"
      tabs={[
        { id:"face_swap", label:"얼굴 교체" },
        { id:"outfit_swap", label:"의상 교체" },
        { id:"outpaint", label:"여백 늘리기" },
      ]}
      defaultTab={aiMenu.startsWith("outfit")?"outfit_swap":aiMenu.startsWith("outpaint")?"outpaint":"face_swap"}
      renderTab={(tab) => {
        if (tab === "face_swap") return <FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
        if (tab === "outfit_swap") return <OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
        if (tab === "outpaint") return <OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
        return null;
      }}
    />;
  }

  // ── 실시간 분석 (검색어 + TOP10) ──
  if (aiMenu && (aiMenu.startsWith("seo_") || aiMenu.startsWith("rank_"))) {
    return (
      <div key="analyzer" style={{ flex:1, overflow:"hidden" }}>
        <AnalyzerPage C={C} theme={theme} user={user} navigate={navigate} onUserUpdate={onUserUpdate} initialMenu={aiMenu} embedded />
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
        <div style={{ width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#7c6aff,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        </div>
        <div style={{ fontSize:22, fontWeight:900, color: isDark?"#fff":"#1a1a2e" }}>이미지 생성</div>
        <div style={{ fontSize:14, color: isDark?"rgba(255,255,255,0.45)":"#888", lineHeight:2 }}>AI 이미지 자유 생성 기능<br/>곧 업데이트될 예정이에요.</div>
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

  // 모델 생성 (인트로 없이 직접 진입)
  if (aiMenu === "model_gen" || aiMenu === "model_gen_make") {
    return <ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
  }

  // 얼굴 교체 (인트로 없이 직접 진입)
  if (aiMenu === "face_swap" || aiMenu === "face_swap_make") {
    return <FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
  }

  // 의상 교체 (인트로 없이 직접 진입)
  if (aiMenu === "outfit_swap" || aiMenu === "outfit_swap_make") {
    return <OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
  }

  // 여백 늘리기 (인트로 없이 직접 진입)
  if (aiMenu === "outpaint" || aiMenu === "outpaint_make") {
    return <OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} />;
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
          <div style={{ borderRadius:14, border:`1px solid #7c6aff20`, background:"rgba(99,102,241,0.06)", padding:"18px 20px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.5)":"#888", marginBottom:2 }}>보유 크레딧</div>
                <div style={{ fontSize:28, fontWeight:900, color:"#a5b4fc" }}>{pts.toLocaleString()} <span style={{ fontSize:14 }}>P</span></div>
              </div>
              <button onClick={() => navigate("pricing")}
                style={{ padding:"10px 20px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800 }}>
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
          {/* SNS 계정 연동 */}
          <div style={{ borderRadius:16, border:`1px solid ${bdr2}`, background:card2, padding:"4px 0", marginBottom:16, overflow:"hidden" }}>
            <SnsConnectionManager user={user} isDark={isDark} compact />
          </div>
          {/* 로그아웃 */}
          <button onClick={() => { if (onLogout) onLogout(); navigate("home"); }}
            style={{ width:"100%", padding:"13px", borderRadius:12, border:"1px solid rgba(248,113,113,0.3)", background:"rgba(248,113,113,0.06)", color:"#f87171", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            로그아웃
          </button>
        </div>
        <AiFooter />
      </div>
    );
  }

  // 영상 제작
  if (aiMenu === "video_create" || aiMenu === "shorts_make") {
    return <ShortsCreator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} />;
  }

  return null;
}

const MENU_LABELS = {
  home: "AI 생성기", library: "내 보관함",
  blog_write: "글쓰기",
  blog_naver_intro: "글쓰기", blog_naver: "글쓰기",
  blog_tistory_intro: "글쓰기", blog_tistory: "글쓰기",
  blog_insta_intro: "글쓰기", blog_insta: "글쓰기",
  blog_youtube_intro: "글쓰기", blog_youtube: "글쓰기",
  blog_thread_intro: "글쓰기", blog_thread: "글쓰기",
  blog_cafe_intro: "글쓰기", blog_cafe: "글쓰기",
  blog_yt_blog_intro: "링크 글쓰기", blog_yt_blog: "링크 글쓰기",
  blog_news_intro: "링크 글쓰기", blog_news: "링크 글쓰기",
  blog_link_intro: "링크 글쓰기", blog_link: "링크 글쓰기",
  cardnews_simple: "카드뉴스", cardnews_simple_make: "카드뉴스",
  detail_simple: "상세페이지", detail_simple_make: "상세페이지", detail_simple_open: "상세페이지",
  thumbnail_gen: "썸네일 생성", thumbnail_gen_make: "썸네일 생성",
  seo_home: "실시간 분석", seo_blog: "블로그 분석", seo_youtube: "유튜브 분석", seo_tistory: "티스토리 분석",
  logo_gen: "로고 생성", mockup_gen: "목업 생성", product_shot: "제품컷 생성",
  blog_cafe_make: "네이버 카페",
  model_gen: "모델 생성", model_gen_make: "모델 생성",
  face_swap: "얼굴 교체", face_swap_make: "얼굴 교체",
  outfit_swap: "의상 교체", outfit_swap_make: "의상 교체",
  outpaint: "여백 늘리기", outpaint_make: "여백 늘리기",
  shorts: "숏폼편집",
  content_create: "콘텐츠 제작",
  image_create: "이미지 생성",
  image_edit: "이미지 수정",
  hot_keyword: "핫 키워드",
  prompt_studio: "기획",
  ppt_gen: "PPT 제작",
};

/* ── 통합 글쓰기 (플랫폼 선택 탭) ── */
const WRITE_PLATFORMS = [
  { id: "blog_naver",   label: "네이버 블로그", type: "blog_naver",  icon: "/icon-naver-blog.png" },
  { id: "blog_cafe",    label: "네이버 카페",  type: "blog_cafe",    icon: "/icon-naver-cafe.webp" },
  { id: "blog_tistory", label: "티스토리",     type: "blog_tistory", icon: "/icon-tistory.png" },
  { id: "blog_insta",   label: "인스타그램",   type: "blog_insta",   icon: "/icon-instagram.webp" },
  { id: "blog_thread",  label: "스레드",       type: "blog_thread",  icon: "/icon-threads.png" },
];

/* ── 통합 탭 헤더 (글쓰기 / 링크 글쓰기 공용) ── */
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
        <div style={{ display:"flex", justifyContent:"center", gap:2, borderBottom:`1px solid ${bdr}` }}>
          {tabs.map(t => {
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

function UnifiedBlogWriter({ theme, isDark, user, onLoginRequest, onUserUpdate, defaultPlatform }) {
  const [platform, setPlatform] = useState(defaultPlatform || "blog_naver");
  const info = WRITE_PLATFORMS.find(p => p.id === platform) || WRITE_PLATFORMS[0];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <TabHeader title="글쓰기" subtitle="플랫폼을 선택하고 주제를 입력하면 AI가 글을 작성해요"
        tabs={WRITE_PLATFORMS} activeTab={platform} onTabChange={setPlatform} isDark={isDark} />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <BlogGenerator key={platform} initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
      </div>
    </div>
  );
}

/* ── 링크 글쓰기 통합 컴포넌트 ── */
function LinkBlogCombined({ theme, user, onLoginRequest, onUserUpdate, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || "youtube");
  const isDark = theme === "dark";
  const tabs = [
    { id: "youtube", label: "유튜브",   icon: "/icon-youtube.png" },
    { id: "news",    label: "뉴스 기사" },
    { id: "blog",    label: "블로그",   icon: "/icon-naver-blog.png" },
    { id: "sns",     label: "SNS",      icon: "/icon-instagram.webp" },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <TabHeader title="링크 글쓰기" subtitle="URL을 입력하면 AI가 블로그 글로 변환해줘요"
        tabs={tabs} activeTab={tab} onTabChange={setTab} isDark={isDark} />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {tab === "youtube" ? (
          <YtBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
        ) : (
          <NewsBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate}
            linkMode={tab === "blog" ? "blog" : tab === "sns" ? "sns" : "news"} />
        )}
      </div>
    </div>
  );
}

export function AiPage({ user, navigate, navigateBoard, navigateAi, C, theme, aiMenu: aiMenuProp, setAiMenu: setAiMenuProp, onLogout, onLoginRequest, onUserUpdate }) {
  const { t: tt } = useI18n();
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const [sideOpen, setSideOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shortsJob, setShortsJob] = useState(null);
  const [shortsActive, setShortsActive] = useState(false);
  const [snsConns, setSnsConns] = useState([]);

  // SNS 연결 목록 조회
  useEffect(() => {
    if (user?.uid) {
      fetch(`/api/sns-connections?uid=${user.uid}`).then(r=>r.json()).then(d=>setSnsConns(d.connections||[])).catch(()=>{});
    }
  }, [user?.uid, aiMenu]);

  // Shorts Factory 메시지 수신 (전역 — 메뉴 이동해도 유지)
  useEffect(() => {
    const handler = async (e) => {
      if (e.data?.type !== 'shorts-factory') return;
      if (e.data.action === 'gen-start') setShortsJob({ total: e.data.total, completed: 0, status: 'processing' });
      if (e.data.action === 'gen-progress') setShortsJob(prev => ({ ...prev, completed: e.data.completed, total: e.data.total, status: e.data.status }));
      if (e.data.action === 'gen-complete') setShortsJob(prev => ({ ...prev, status: 'complete' }));
      if (e.data.action === 'navigate') {
        if (e.data.data) {
          try { localStorage.setItem('shorts_linked_data', JSON.stringify(e.data.data)); } catch(err) {}
        }
        setAiMenu(e.data.target);
      }
      if (e.data.action === 'deduct-points' && user) {
        try {
          const cost = Math.abs(e.data.cost || 30);
          const newPts = await changePoints(user.uid, -cost, e.data.reason || "숏폼 영상 생성");
          const newUser = { ...user, points: newPts };
          setLocalUser(newUser);
          if (onUserUpdate) onUserUpdate(newUser);
        } catch(err) { console.error("포인트 차감 실패:", err); }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [user]);
  // CardNewsApp 등 하위 컴포넌트에서 로그인 모달 접근용 전역 등록
  useEffect(function() {
    window.__onLoginRequest = onLoginRequest || function(){};
    window.__setAiMenu = setAiMenu;
    return function() { delete window.__onLoginRequest; delete window.__setAiMenu; };
  }, [onLoginRequest, setAiMenu]);

  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname.replace(/^\//, "");
      const segs = path.split("/");
      if (segs[0] === "ai") {
        const menu = segs[1] || "home";
        if (setAiMenuProp) setAiMenuProp(menu);
        setLocalMenu(menu);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

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
      <div style={{ background:"#13102a", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:20, padding:"32px 28px", maxWidth:360, width:"90%",
        boxShadow:"0 24px 64px rgba(0,0,0,0.5)", textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"rgba(239,68,68,0.1)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{color:"#ef4444",fontSize:20,fontWeight:900}}>!</span></div>
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
      {/* 영상 생성 플로팅 배너 */}
      {shortsJob && shortsJob.status !== 'complete' && aiMenu !== 'video_create' && aiMenu !== 'shorts_make' && (
        <div onClick={() => setAiMenu('video_create')} style={{
          position:"absolute", bottom:20, right:20, zIndex:100,
          background: isDark ? "rgba(124,106,255,0.95)" : "linear-gradient(135deg,#7c6aff,#8b5cf6)",
          borderRadius:16, padding:"14px 20px", cursor:"pointer",
          boxShadow:"0 8px 32px rgba(124,106,255,0.4)", minWidth:200,
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 1s linear infinite" }} />
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>영상 생성 중...</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{shortsJob.completed}/{shortsJob.total}개 완료 · 클릭하여 확인</div>
          </div>
        </div>
      )}
      {shortsJob && shortsJob.status === 'complete' && aiMenu !== 'video_create' && aiMenu !== 'shorts_make' && (
        <div onClick={() => { setAiMenu('video_create'); setShortsJob(null); }} style={{
          position:"absolute", bottom:20, right:20, zIndex:100,
          background:"linear-gradient(135deg,#22c55e,#16a34a)",
          borderRadius:16, padding:"14px 20px", cursor:"pointer",
          boxShadow:"0 8px 32px rgba(34,197,94,0.4)", minWidth:200,
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{ width:24, height:24, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#22c55e", fontWeight:900 }}>V</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>영상 생성 완료!</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>클릭하여 결과 확인</div>
          </div>
        </div>
      )}
      {/* 글로벌 백그라운드 작업 인디케이터 */}
      <BackgroundTaskIndicator isDark={isDark} currentMenu={aiMenu} onNavigate={(menu) => setAiMenu(menu)} />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        button{font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}
        .pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}
        @keyframes ai-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.05)}}
        @keyframes ai-progress{from{width:0%}to{width:92%}}
        @keyframes ai-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ai-sidebar-desktop{display:flex}
        .ai-sidebar-mobile{display:none}
        @media(max-width:768px){
          .ai-sidebar-desktop{display:none!important}
          .ai-sidebar-mobile{display:flex!important}
        }
        @media(max-width:640px){
          .ai-content-pad{padding:16px 12px 60px!important}
          .ai-grid{grid-template-columns:repeat(2,1fr)!important}
          .ai-form-row{flex-direction:column!important}
        }
        @media(max-width:400px){
          .ai-grid{grid-template-columns:1fr!important}
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
            <span style={{ fontSize: 12, color: topClr, whiteSpace: "nowrap", fontWeight: 600 }}>{MENU_LABELS[aiMenu] || "AI 생성기"}</span>
            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 12,
                background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.4)", borderTopColor: "#7c6aff", animation: "spin 0.7s linear infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#7c6aff" }}>AI 생성 중...</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <AiContent aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} C={C} theme={theme} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} />
        </div>
      </div>
    </div>
  );
}
