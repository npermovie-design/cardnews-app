import { useState, useEffect, useRef } from "react";
import { Badge, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
// 이미지 생성기 분리 파일 (마이그레이션 진행중)
import { useGenColors, GenLoading, SelectGroup, BeforeAfterSlider, ModelGenerator, SkinRetouchGenerator, FaceSwapGenerator, OutfitSwapGenerator, OutpaintGenerator } from "./AiImageGenerators.jsx";
import { TabHeader, DmInputField, InstaAutoReply, InstaAutoDM } from "./AiInstagram.jsx";
import { LibraryPage } from "./AiLibrary.jsx";
import { PromptStudioPage, SnsNewsFeed } from "./AiPromptStudio.jsx";
import { CardNewsApp, PlannerPanel } from "./CardNewsApp";
import BlogGenerator from "./BlogGenerator";
import NewsBlogGenerator from "./NewsBlogGenerator";
import YtBlogGenerator from "./YtBlogGenerator";
import ThumbnailGenerator from "./ThumbnailGenerator";
import SeoAnalyzer from "./SeoAnalyzer";
import AnalyzerPage from "./AnalyzerPage";
import ViralityAnalyzer from "./ViralityAnalyzer";
import SimpleDetailPageGenerator from "./SimpleDetailPageGenerator";
import SimpleCardNewsGenerator from "./SimpleCardNewsGenerator";
import LogoGenerator from "./LogoGenerator";
import MockupGenerator from "./MockupGenerator";
import ProductShotGenerator from "./ProductShotGenerator";
import PptGenerator from "./PptGenerator";
import ShortsCreator from "./ShortsCreator";
import BackgroundTaskIndicator from "./BackgroundTaskIndicator";
import SnsConnectionManager from "./SnsConnectionManager";
import Footer from "./Footer.jsx";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage, getAuthToken } from "./storage";

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
        {icon && (typeof icon === "string" && icon.startsWith("/") ? <img src={icon} alt="" style={{ width:18, height:18, objectFit:"contain", flexShrink:0 }} /> : <span style={{ fontSize: 14 }}>{icon}</span>)}
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

  return (
    <div style={{
      width: 210, flexShrink: 0, background: sideBg,
      borderRight: `1px solid ${sideBdr}`,
      display: "flex", flexDirection: "column", height: "100%", overflow: "visible",
      position: "relative",
    }}>
      {/* 브랜드 */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${sideBdr}`, display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/logo.png" alt="SNS메이킷" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: brandText }}>SNS메이킷</div>
          <div style={{ fontSize: 9, color: brandSub, marginTop: 1 }}>{t("aiGen")}</div>
        </div>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px", flex: 1, overflowY: "auto", overflowX: "visible" }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home" label={t("home")} icon="/icons3d/sns-heart.png" />
        <Item id="library" label={t("library")} icon="/icons3d/search-book.png" />

        <div style={{ height:1, background:sideBdr, margin:"8px 4px" }} />
        <Item id="prompt_studio" label="비즈니스 문서" icon="/icons3d/report.png" />
        <Item id="blog_write" label="글쓰기" icon="/icons3d/blog-write.png" ids={["blog_naver","blog_tistory","blog_insta","blog_youtube","blog_thread","blog_cafe","blog_yt_blog","blog_news","blog_link"]} />
        <Item id="content_create" label="콘텐츠 제작" icon="/icons3d/palette.png" ids={["cardnews_simple","detail_simple","thumbnail_gen","ppt_gen"]} badge="추천" badgeColor="orange" />
        <Item id="image_create" label="이미지 생성" icon="/icons3d/instagram-cam.png" ids={["product_shot","logo_gen","mockup_gen","model_gen"]} />
        <Item id="image_edit" label="이미지 수정" icon="/icons3d/camera.png" ids={["skin_retouch","face_swap","outfit_swap","outpaint"]} />
        <Item id="video_create" label="영상 제작" icon="/icons3d/sns-app.png" ids={["shorts_make"]} badge="Beta" badgeColor="blue" />

        <div style={{ height:1, background:sideBdr, margin:"8px 4px" }} />
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>리퍼포징</div>
        <Item id="repurpose" label="원소스 멀티유즈" icon="/icons3d/sns-share.png" badge="NEW" badgeColor="green" />
      </div>

      {/* 하단 섹션 – SNS 연동 + 포인트 */}
      <div style={{
        padding: "10px 12px 12px", borderTop: `1px solid ${sideBdr}`,
        background: isDark ? "rgba(0,0,0,0.2)" : "rgba(99,102,241,0.03)",
        flexShrink: 0,
      }}>
        <button onClick={() => navigate && navigate("mypage")} style={{
          width: "100%", padding: "8px 10px", borderRadius: 8,
          border: `1px solid ${isDark ? "rgba(124,106,255,0.18)" : "rgba(124,106,255,0.12)"}`,
          background: isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.05)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          color: isDark ? "#a5b4fc" : "#6366f1", fontSize: 11, fontWeight: 600,
          marginBottom: 8, transition: "background 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.05)"}
        >
          <span style={{ fontSize: 13 }}>🔗</span>
          SNS 계정 연동·관리
        </button>
        {user && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0 4px", fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "#aaa",
          }}>
            <span>보유 포인트</span>
            <span style={{
              fontWeight: 700, fontSize: 12,
              color: isDark ? "#a5b4fc" : "#6366f1",
            }}>
              {Math.max(0, (freeLimit - info.used) * 10 + (user.points || 0)).toLocaleString()}P
            </span>
          </div>
        )}
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


// ── 기획 ──────────────────────────────────────────────────────

// ── 콘텐츠 리퍼포징 (원소스 멀티유즈) ──────────────────────────────────────
function RepurposePage({ isDark, user, onLoginRequest, onUserUpdate, showPointConfirm }) {
  const [sourceType, setSourceType] = useState("text"); // "text" | "url"
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [formats, setFormats] = useState({
    insta: true, thread: true, cardnews: true, naver: false, shorts: false,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { insta, thread, cardnews, naver, shorts }
  const [activeTab, setActiveTab] = useState("insta");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  const FORMAT_LIST = [
    { id: "insta",    label: "인스타그램 캡션", desc: "해시태그 포함" },
    { id: "thread",   label: "스레드 포스트", desc: "280자 이내" },
    { id: "cardnews", label: "카드뉴스 슬라이드 기획", desc: "5-7장" },
    { id: "naver",    label: "네이버 블로그", desc: "SEO 최적화" },
    { id: "shorts",   label: "유튜브 숏폼 대본", desc: "60초 이내" },
  ];

  const selectedCount = Object.values(formats).filter(Boolean).length;

  // URL에서 콘텐츠 가져오기
  const fetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setFetchingUrl(true); setError("");
    try {
      const res = await fetch(`/api/content?action=fetch-url-content&url=${encodeURIComponent(sourceUrl.trim())}`);
      if (!res.ok) throw new Error("URL에서 콘텐츠를 가져올 수 없습니다.");
      const data = await res.json();
      setSourceText(data.content || data.text || "");
      setSourceType("text");
    } catch (e) {
      setError(e.message || "URL 가져오기 실패");
    } finally {
      setFetchingUrl(false);
    }
  };

  // AI 변환 실행
  const handleGenerate = async () => {
    if (!sourceText.trim()) { setError("원본 콘텐츠를 입력해주세요."); return; }
    if (selectedCount === 0) { setError("최소 1개 이상의 형식을 선택해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!(await showPointConfirm(35))) return;

    setError(""); setLoading(true); setResults(null);

    try {
      // 포인트 차감 (35P - AI_SONNET)
      const info = getAiLeft(user);
      const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
      if (info.used >= freeLimit) {
        const { changePoints } = await import("./storage");
        const newPts = await changePoints(user.uid, -35, "콘텐츠 리퍼포징");
        if (onUserUpdate) onUserUpdate({ ...user, points: newPts });
      }

      const selectedFormats = FORMAT_LIST.filter(f => formats[f.id]);
      const formatInstructions = selectedFormats.map(f => {
        if (f.id === "insta") return `[인스타그램 캡션]\n- 감성적이고 읽기 쉬운 캡션 작성\n- 관련 해시태그 15-20개 포함\n- 줄바꿈 활용하여 가독성 높이기`;
        if (f.id === "thread") return `[스레드 포스트]\n- 280자 이내로 핵심만 전달\n- 임팩트 있는 한 줄 또는 짧은 문단\n- 대화체, 반말 OK`;
        if (f.id === "cardnews") return `[카드뉴스 슬라이드 기획]\n- 5~7장 슬라이드 구성\n- 각 슬라이드별 제목(14자 이내)과 본문(50자 이내) 작성\n- 표지 + 핵심 내용 + 마무리 구조`;
        if (f.id === "naver") return `[네이버 블로그]\n- SEO 키워드 자연스럽게 포함\n- 서론/본론/결론 구조\n- 1500~2000자 분량\n- 소제목(##) 활용`;
        if (f.id === "shorts") return `[유튜브 숏폼 대본]\n- 60초 이내 분량\n- 훅(첫 3초) → 핵심 내용 → CTA 구조\n- 구어체, 직접 말하는 톤`;
        return "";
      }).join("\n\n");

      const prompt = `당신은 콘텐츠 리퍼포징 전문가입니다. 아래 원본 콘텐츠를 각 플랫폼에 맞게 변환해주세요.

## 원본 콘텐츠
${sourceText.trim()}

## 변환할 형식과 지침
${formatInstructions}

## 출력 형식
각 형식을 아래와 같이 구분하여 작성해주세요:
${selectedFormats.map(f => `====${f.id}====\n(${f.label} 내용)`).join("\n\n")}

중요: 각 형식의 시작은 반드시 ===={형식id}==== 로 시작하세요. 자연스럽고 한국어로 작성해주세요.`;

      const { callAI } = await import("./aiClient");
      const aiResult = await callAI(
        "claude-sonnet-4-5",
        [{ role: "user", content: prompt }],
        6000
      );

      // 결과 파싱
      const parsed = {};
      selectedFormats.forEach(f => {
        const regex = new RegExp(`====${f.id}====\\s*([\\s\\S]*?)(?=====\\w+====|$)`);
        const match = aiResult.match(regex);
        parsed[f.id] = match ? match[1].trim() : "";
      });

      setResults(parsed);
      // 첫 번째 결과 탭으로 이동
      const firstKey = selectedFormats[0]?.id;
      if (firstKey) setActiveTab(firstKey);

      // 사용량 기록
      const usage = getAiUsage(user);
      setAiUsage(user, usage + 1);
    } catch (e) {
      setError(e.message || "변환 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id) => {
    if (!results?.[id]) return;
    navigator.clipboard.writeText(results[id]).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ flexShrink: 0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 3 }}>콘텐츠 리퍼포징</div>
            <div style={{ fontSize: 12, color: muted }}>하나의 콘텐츠를 여러 플랫폼에 맞게 자동 변환합니다 (35P)</div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 60px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* 소스 입력 영역 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>원본 콘텐츠</div>

            {/* 탭: 직접 입력 / URL */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { id: "text", label: "직접 입력" },
                { id: "url", label: "URL에서 가져오기" },
              ].map(t => (
                <button key={t.id} onClick={() => setSourceType(t.id)}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: `1px solid ${sourceType === t.id ? accent : bdr}`,
                    background: sourceType === t.id ? (isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.08)") : "transparent",
                    color: sourceType === t.id ? accent : muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {sourceType === "url" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://blog.naver.com/... 또는 유튜브, 뉴스 URL"
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`,
                    background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: text, fontSize: 13, outline: "none",
                  }} />
                <button onClick={fetchUrl} disabled={fetchingUrl}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: accent, color: "#fff", fontSize: 12, fontWeight: 700, opacity: fetchingUrl ? 0.6 : 1, whiteSpace: "nowrap",
                  }}>
                  {fetchingUrl ? "가져오는 중..." : "가져오기"}
                </button>
              </div>
            )}

            <textarea value={sourceText} onChange={e => setSourceText(e.target.value)}
              placeholder="블로그 글, 기사, SNS 포스트 등 원본 콘텐츠를 붙여넣으세요..."
              style={{
                width: "100%", minHeight: 180, padding: "14px 16px", borderRadius: 12,
                border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                color: text, fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none",
                fontFamily: "inherit",
              }} />
            <div style={{ fontSize: 11, color: muted, marginTop: 4, textAlign: "right" }}>
              {sourceText.length.toLocaleString()}자
            </div>
          </div>

          {/* 형식 선택 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>변환 형식 선택</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {FORMAT_LIST.map(f => {
                const checked = formats[f.id];
                return (
                  <label key={f.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      borderRadius: 10, border: `1px solid ${checked ? accent + "60" : bdr}`,
                      background: checked ? (isDark ? "rgba(124,106,255,0.1)" : "rgba(124,106,255,0.04)") : cardBg,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => setFormats(p => ({ ...p, [f.id]: !p[f.id] }))}
                      style={{ accentColor: accent, width: 16, height: 16, cursor: "pointer" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: muted }}>{f.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>{selectedCount}개 형식 선택됨</div>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* 생성 버튼 */}
          <button onClick={handleGenerate} disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "default" : "pointer",
              background: loading ? (isDark ? "rgba(124,106,255,0.3)" : "rgba(124,106,255,0.4)") : `linear-gradient(135deg,${accent},#8b5cf6)`,
              color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 28,
              boxShadow: loading ? "none" : `0 6px 24px ${accent}40`,
              opacity: loading ? 0.7 : 1, transition: "all 0.2s",
            }}>
            {loading ? "변환 중..." : `한 번에 변환하기 (${selectedCount}개 형식 · 35P)`}
          </button>

          {/* 결과 영역 */}
          {results && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>변환 결과</div>

              {/* 탭 */}
              <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto", borderBottom: `1px solid ${bdr}` }}>
                {FORMAT_LIST.filter(f => results[f.id] !== undefined).map(f => {
                  const active = activeTab === f.id;
                  return (
                    <button key={f.id} onClick={() => setActiveTab(f.id)}
                      style={{
                        padding: "9px 16px", border: "none", cursor: "pointer", background: "transparent",
                        color: active ? accent : muted, fontSize: 13, fontWeight: active ? 700 : 400,
                        borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                        marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.15s",
                      }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* 결과 내용 */}
              {FORMAT_LIST.filter(f => f.id === activeTab && results[f.id]).map(f => (
                <div key={f.id} style={{ borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${bdr}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{f.label}</span>
                    <button onClick={() => handleCopy(f.id)}
                      style={{
                        padding: "5px 14px", borderRadius: 7, border: `1px solid ${copied === f.id ? "#4ade8060" : bdr}`,
                        background: copied === f.id ? "rgba(74,222,128,0.1)" : "transparent",
                        color: copied === f.id ? "#4ade80" : muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>
                      {copied === f.id ? "복사 완료" : "복사"}
                    </button>
                  </div>
                  <div style={{ padding: "16px", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: text }}>
                    {results[f.id]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AiContent({ aiMenu, user, setAiMenu, navigate, navigateBoard, navigateAi, C, theme, onLoginRequest, onUserUpdate, showPointConfirm }) {
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
        <BarHeader title="비즈니스 문서" subtitle="실무 문서를 AI가 작성해드립니다" />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <PromptStudioPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} setAiMenu={setAiMenu} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} theme={theme} renderFooter={() => <AiFooter />} noHeader />
        </div>
      </div>
    );
  }


  // SNS 뉴스
  if (aiMenu === "hot_keyword") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <BarHeader title="SNS 뉴스" subtitle="SNS 마케팅 관련 최신 뉴스를 확인하세요" />
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          <SnsNewsFeed isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} renderFooter={() => <AiFooter />} />
        </div>
      </div>
    );
  }

  // SVG 아이콘 맵
  const TOOL_ICONS = {
    blog_write: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    blog_link: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    cardnews_simple: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="28" height="28" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    detail_simple: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    thumbnail_gen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="28" height="28" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    product_shot: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    logo_gen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    mockup_gen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    model_gen: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    face_swap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    outfit_swap: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46a1 1 0 0 0-.62.94V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4.4a1 1 0 0 0-.62-.94z"/></svg>,
    outpaint: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    shorts_make: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    repurpose: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  };

  // 홈
  if (!aiMenu || aiMenu === "home") {
    const MENUS = [
      { id: "blog_write",       title: _s("글쓰기","SNS Writing"),      desc: _s("블로그·카페·인스타·스레드·링크변환","Blog, Cafe, Insta, Threads, Link"), cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)", iconImg: "/icon-naver-blog.png"  },
      { id: "cardnews_simple",  title: _s("카드뉴스","Card News"),    desc: _s("텍스트 편집 방식","Text editing style"),         cr: 10, darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)"  },
      { id: "detail_simple",    title: _s("상세페이지","Detail Page"),  desc: _s("텍스트 편집 방식","Text editing style"),         cr: 10, darkColor: "rgba(16,185,129,0.18)",  lightColor: "rgba(16,185,129,0.07)"  },
      { id: "thumbnail_gen",    title: _s("썸네일 생성","Thumbnail Generator"),  desc: _s("유튜브·인스타 썸네일","YouTube & Instagram Thumbnail"), cr: 0, darkColor: "rgba(239,68,68,0.18)",  lightColor: "rgba(239,68,68,0.07)"  },
      { id: "product_shot", title: _s("제품컷 생성","Product Shot"),       desc: _s("AI 광고용 제품 이미지","AI product image for ads"),    cr: 10, darkColor: "rgba(249,115,22,0.18)",  lightColor: "rgba(249,115,22,0.07)"  },
      { id: "logo_gen",     title: _s("로고 생성","Logo Generator"),         desc: _s("AI 맞춤 로고 제작","AI custom logo creation"),        cr: 10, darkColor: "rgba(6,182,212,0.18)",   lightColor: "rgba(6,182,212,0.07)"   },
      { id: "mockup_gen",   title: _s("목업 생성","Mockup Generator"),         desc: _s("제품·브랜드 목업 제작","Product & brand mockup"),    cr: 10, darkColor: "rgba(124,58,237,0.18)",  lightColor: "rgba(124,58,237,0.07)"  },
      { id: "model_gen",    title: _s("모델 생성","Model Generator"),         desc: _s("AI 광고 모델 생성","AI ad model generation"), cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "skin_retouch", title: _s("피부 보정","Skin Retouch"),       desc: _s("AI 피부 보정 · 분위기 변환","AI skin retouching & mood"), cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "face_swap",    title: _s("얼굴 교체","Face Swap"),         desc: _s("얼굴만 교체 · 비교 슬라이더","Face swap with comparison slider"), cr: 10, darkColor: "rgba(16,185,129,0.18)",  lightColor: "rgba(16,185,129,0.07)"  },
      { id: "outfit_swap",  title: _s("의상 교체","Outfit Swap"),         desc: _s("옷·스타일 교체","Clothing & style swap"),           cr: 10, darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "outpaint",     title: _s("여백 늘리기","Outpaint"),      desc: _s("수동 크기 조절 + AI 채우기","Manual resize + AI fill"), cr: 10, darkColor: "rgba(245,158,11,0.18)",  lightColor: "rgba(245,158,11,0.07)"  },
      { id: "shorts_make",  title: _s("쇼츠 영상 만들기","Shorts Video Maker"), desc: _s("AI 분석 + 자동 편집","AI analysis + auto editing"), cr: 10, darkColor: "rgba(239,68,68,0.18)", lightColor: "rgba(239,68,68,0.07)", iconImg: "/icon-youtube.png" },
      { id: "repurpose",    title: _s("원소스 멀티유즈","Content Repurposing"), desc: _s("한 콘텐츠 → 다채널 변환","One content → multi-channel"), cr: 35, darkColor: "rgba(16,185,129,0.18)", lightColor: "rgba(16,185,129,0.07)" },
    ];
    // 카테고리별 그룹
    const GROUPS = [
      { label: _s("SNS 글쓰기","SNS Writing"), color: "#7c6aff",
        items: MENUS.filter(m => m.id.startsWith("blog_")) },
      { label: _s("SNS 이미지","SNS Image"), color: "#ec4899",
        items: MENUS.filter(m => ["cardnews_simple","detail_simple","thumbnail_gen"].includes(m.id)) },
      { label: _s("이미지 생성","Image Generation"), color: "#f59e0b",
        items: MENUS.filter(m => ["product_shot","logo_gen","mockup_gen","model_gen","skin_retouch","face_swap","outfit_swap","outpaint"].includes(m.id)) },
      { label: _s("영상 제작","Video Production"), color: "#ef4444",
        items: MENUS.filter(m => m.id === "shorts_make") },
      { label: _s("리퍼포징","Repurposing"), color: "#10b981",
        items: MENUS.filter(m => m.id === "repurpose") },
    ];

    const quickStartCards = [
      { icon: "📝", title: "블로그 글쓰기", desc: "AI가 SEO 최적화 글을 자동 작성해요", menu: "blog_naver", tag: "인기", tagColor: "#ef4444", tagBg: "rgba(239,68,68,0.1)" },
      { icon: "🎨", title: "카드뉴스 만들기", desc: "주제만 입력하면 슬라이드 완성", menu: "cardnews_simple", tag: "추천", tagColor: "#f97316", tagBg: "rgba(249,115,22,0.1)" },
      { icon: "🔄", title: "원소스 멀티유즈", desc: "1개 글을 5개 포맷으로 동시 변환", menu: "repurpose", tag: "NEW", tagColor: "#10b981", tagBg: "rgba(16,185,129,0.1)" },
    ];

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 60px", background: isDark ? "transparent" : "#f8f8fb" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* 환영 헤더 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: homeText, marginBottom: 6 }}>
              안녕하세요{user?.nick ? `, ${user.nick}님` : ""}!
            </div>
            <div style={{ fontSize: 14, color: homeMuted, lineHeight: 1.6 }}>
              핵심 기능을 하나씩 체험하면 보너스 포인트를 받을 수 있어요!
            </div>
          </div>

          {/* 퀵스타트 카드 */}
          <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            {quickStartCards.map((card, idx) => (
              <div key={idx} onClick={() => setAiMenu(card.menu)} style={{
                flex: "1 1 200px", minWidth: 200, padding: "20px 18px", borderRadius: 16,
                border: `1px solid ${cardBdr}`,
                background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", flexDirection: "column", gap: 10, position: "relative",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(99,102,241,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 28 }}>{card.icon}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                    background: card.tagBg, color: card.tagColor,
                  }}>{card.tag}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: homeText, marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: homeMuted, lineHeight: 1.5 }}>{card.desc}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
                  <span style={{ fontSize: 16, color: isDark ? "rgba(255,255,255,0.25)" : "#ccc" }}>→</span>
                </div>
              </div>
            ))}
          </div>

          {/* 기존 헤더 */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: homeText, marginBottom: 6 }}>{_s("무엇을 만들어볼까요?","What would you like to create?")}</div>
            <div style={{ fontSize: 14, color: homeMuted }}>{_s("왼쪽 메뉴에서 선택하거나, 아래에서 도구를 골라보세요.","Select from the menu or choose a tool below.")}</div>
          </div>

          {/* SNS 자동발행 안내 */}
          <div onClick={() => navigate("mypage")} style={{ borderRadius:14, padding:"16px 20px", marginBottom:24, cursor:"pointer",
            background: isDark ? "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.05))" : "linear-gradient(135deg,rgba(124,106,255,0.04),rgba(236,72,153,0.02))",
            border: `1px solid ${isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.08)"}`, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
              {["/icon-threads.png","/icon-naver-blog.png","/icon-tistory.png"].map((ic,i)=>
                <img key={i} src={ic} alt="" style={{ width:20, height:20, objectFit:"contain", borderRadius:4, border:`2px solid ${isDark?"#1a1a2e":"#fff"}`, marginLeft:i>0?-8:0 }} />
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:homeText }}>{_s("스레드·블로그 계정을 연결하고 자동 발행해보세요","Connect your SNS and auto-publish")}</div>
              <div style={{ fontSize:11, color:homeMuted, marginTop:2 }}>{_s("글 작성 후 원클릭으로 바로 업로드됩니다","One-click upload after writing")}</div>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:"#7c6aff", flexShrink:0 }}>{_s("연동하기 →","Connect →")}</div>
          </div>

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
                  <div key={m.id} onClick={() => setAiMenu(m.id)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setAiMenu(m.id)} style={{
                    padding: "18px 16px", borderRadius: 14, border: `1px solid ${cardBdr}`,
                    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14,
                    minHeight: 48,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isDark ? "0 6px 20px rgba(0,0,0,0.3)" : "0 6px 20px rgba(0,0,0,0.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: isDark ? m.darkColor : m.lightColor, display: "flex", alignItems: "center", justifyContent: "center", color: group.color, flexShrink: 0 }}>
                      {m.iconImg ? <img src={m.iconImg} alt="" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 4 }} /> : (TOOL_ICONS[m.id] || m.title[0])}
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

  // 링크 글쓰기 → 통합 글쓰기의 링크 탭으로 리다이렉트
  if (aiMenu === "blog_link" || aiMenu === "blog_link_intro") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform="link_youtube" />;
  }
  // 하위 호환 - 기존 메뉴 ID로 접근 시 통합 페이지로 이동
  if (aiMenu === "blog_news" || aiMenu === "blog_news_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultTab="news" />;
  }
  if (aiMenu === "blog_yt_blog" || aiMenu === "blog_yt_blog_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultTab="youtube" />;
  }

  // 블로그 계열 인트로 → 인트로 없이 직접 도구로 이동
  if (aiMenu.endsWith("_intro") && aiMenu.startsWith("blog_")) {
    const baseId = aiMenu.replace("_intro", "");
    const info = BLOG_MAP[baseId] || { type: "blog", label: "블로그 글쓰기" };
    return (
      <div key={baseId} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BlogGenerator initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // 통합 글쓰기 (플랫폼 선택)
  if (aiMenu === "blog_write") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
  }

  // 네이버 카페 글쓰기 (하위호환)
  if (aiMenu === "blog_cafe_intro" || aiMenu === "blog_cafe" || aiMenu === "blog_cafe_make") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform="blog_cafe" />;
  }

  // 블로그 계열 생성기 (하위호환)
  if (aiMenu.startsWith("blog_")) {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform={aiMenu} />;
  }

  // 보관함에서 심플 카드뉴스 열기
  if (aiMenu === "cardnews_simple_open") {
    return (
      <div key="cn_simple_open" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} openFromLibrary  onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // 보관함에서 심플 상세페이지 열기
  if (aiMenu === "detail_simple_open") {
    return (
      <div key="detail_simple_open" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} openFromLibrary  onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // ── 콘텐츠 제작기 (카드뉴스 + 상세페이지 + 썸네일 + PPT) ──
  if (["cardnews_simple","cardnews_make","cardnews_simple_make","detail_simple","detail_simple_make","thumbnail_gen","thumbnail_gen_make","ppt_gen","content_create"].some(x => aiMenu === x || aiMenu?.startsWith(x))) {
    return <TabbedGroup key="content" isDark={isDark} theme={theme}
      title="콘텐츠 제작" subtitle="카드뉴스, 상세페이지, 썸네일, PPT를 제작하세요"
      tabs={[
        { id:"cardnews_simple", label:"카드뉴스" },
        { id:"detail_simple", label:"상세페이지" },
        { id:"thumbnail_gen", label:"썸네일" },
        { id:"ppt_gen", label:"PPT" },
      ]}
      defaultTab={aiMenu.startsWith("ppt")?"ppt_gen":aiMenu.startsWith("thumbnail")?"thumbnail_gen":aiMenu.startsWith("detail")?"detail_simple":"cardnews_simple"}
      renderTab={(tab) => {
        if (tab === "cardnews_simple") return <SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "detail_simple") return <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "thumbnail_gen") return <ThumbnailGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "ppt_gen") return <PptGenerator isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
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
        if (tab === "product_shot") return <ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "logo_gen") return <LogoGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "mockup_gen") return <MockupGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
        if (tab === "model_gen") return <ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
        return null;
      }}
    />;
  }

  // ── 이미지 수정 (얼굴교체 + 의상교체 + 여백늘리기) ──
  if (["skin_retouch","face_swap","outfit_swap","outpaint","image_edit"].some(x => aiMenu === x || aiMenu?.startsWith(x))) {
    return <TabbedGroup key="imgedit" isDark={isDark} theme={theme}
      title="이미지 수정" subtitle="AI로 피부 보정, 얼굴 교체, 의상 교체, 여백 확장을 할 수 있어요"
      tabs={[
        { id:"skin_retouch", label:"피부 보정" },
        { id:"face_swap", label:"얼굴 교체" },
        { id:"outfit_swap", label:"의상 교체" },
        { id:"outpaint", label:"여백 늘리기" },
      ]}
      defaultTab={aiMenu.startsWith("skin")?"skin_retouch":aiMenu.startsWith("outfit")?"outfit_swap":aiMenu.startsWith("outpaint")?"outpaint":"face_swap"}
      renderTab={(tab) => {
        if (tab === "skin_retouch") return <SkinRetouchGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
        if (tab === "face_swap") return <FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
        if (tab === "outfit_swap") return <OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
        if (tab === "outpaint") return <OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
        return null;
      }}
    />;
  }

  // ── 마케팅 (SNS 분석 + 인스타 자동DM) ──
  if (aiMenu === "marketing" || aiMenu === "sns_analysis" || aiMenu === "insta_auto_dm" || aiMenu === "insta_auto_reply" || aiMenu.startsWith("analysis_")) {
    return <MarketingHub theme={theme} isDark={isDark} user={user} C={C} navigate={navigate} onUserUpdate={onUserUpdate} defaultTab={aiMenu} />;
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
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="28" height="28" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
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
        <ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // 로고 생성
  if (aiMenu === "logo_gen") {
    return (
      <div key="logo_gen" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <LogoGenerator isDark={isDark} user={user}  onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // 목업 생성
  if (aiMenu === "mockup_gen") {
    return (
      <div key="mockup_gen" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <MockupGenerator isDark={isDark} user={user}  onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // 모델 생성 (인트로 없이 직접 진입)
  if (aiMenu === "model_gen" || aiMenu === "model_gen_make") {
    return <ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
  }

  // 얼굴 교체 (인트로 없이 직접 진입)
  if (aiMenu === "face_swap" || aiMenu === "face_swap_make") {
    return <FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
  }

  // 의상 교체 (인트로 없이 직접 진입)
  if (aiMenu === "outfit_swap" || aiMenu === "outfit_swap_make") {
    return <OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
  }

  // 여백 늘리기 (인트로 없이 직접 진입)
  if (aiMenu === "outpaint" || aiMenu === "outpaint_make") {
    return <OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} />;
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
          <div style={{ borderRadius:16, border:`1px solid ${bdr2}`, background:card2, padding:"4px 0", marginBottom:16, overflow:"hidden" }}><SnsConnectionManager user={user} isDark={isDark} compact /></div>
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

  // 콘텐츠 리퍼포징
  if (aiMenu === "repurpose") {
    return <RepurposePage isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />;
  }

  // 영상 제작
  if (aiMenu === "video_create" || aiMenu === "shorts_make") {
    return <ShortsCreator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} />;
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
  blog_yt_blog_intro: "글쓰기", blog_yt_blog: "글쓰기",
  blog_news_intro: "글쓰기", blog_news: "글쓰기",
  blog_link_intro: "글쓰기", blog_link: "글쓰기",
  cardnews_simple: "카드뉴스", cardnews_simple_make: "카드뉴스",
  detail_simple: "상세페이지", detail_simple_make: "상세페이지", detail_simple_open: "상세페이지",
  thumbnail_gen: "썸네일 생성", thumbnail_gen_make: "썸네일 생성",
  seo_home: "실시간 분석", seo_blog: "블로그 분석", seo_youtube: "유튜브 분석", seo_tistory: "티스토리 분석",
  logo_gen: "로고 생성", mockup_gen: "목업 생성", product_shot: "제품컷 생성",
  blog_cafe_make: "네이버 카페",
  model_gen: "모델 생성", model_gen_make: "모델 생성",
  skin_retouch: "피부 보정", skin_retouch_make: "피부 보정",
  face_swap: "얼굴 교체", face_swap_make: "얼굴 교체",
  outfit_swap: "의상 교체", outfit_swap_make: "의상 교체",
  outpaint: "여백 늘리기", outpaint_make: "여백 늘리기",
  shorts: "숏폼편집",
  content_create: "콘텐츠 제작",
  image_create: "이미지 생성",
  image_edit: "이미지 수정",
  hot_keyword: "SNS 뉴스",
  prompt_studio: "비즈니스 문서",
  ppt_gen: "PPT 제작",
  marketing: "마케팅",
  insta_auto_dm: "마케팅",
  insta_auto_reply: "마케팅",
  sns_analysis: "마케팅",
  analysis_insta: "마케팅",
  analysis_tiktok: "마케팅",
  analysis_youtube: "마케팅",
  repurpose: "원소스 멀티유즈",
};

/* ── 통합 글쓰기 (플랫폼 선택 탭) ── */
const WRITE_PLATFORMS = [
  { id: "blog_naver",   label: "네이버 블로그", type: "blog_naver",  icon: "/icon-naver-blog.png" },
  { id: "blog_cafe",    label: "네이버 카페",  type: "blog_cafe",    icon: "/icon-naver-cafe.webp" },
  { id: "blog_tistory", label: "티스토리",     type: "blog_tistory", icon: "/icon-tistory.png" },
  { id: "blog_insta",   label: "인스타그램",   type: "blog_insta",   icon: "/icon-instagram.webp" },
  { id: "blog_thread",  label: "스레드",       type: "blog_thread",  icon: "/icon-threads.png" },
  { id: "_sep_link", separator: true, label: "링크에서 변환" },
  { id: "link_youtube", label: "유튜브",   link: true, linkTab: "youtube", icon: "/icon-youtube.png" },
  { id: "link_news",    label: "뉴스 기사", link: true, linkTab: "news" },
  { id: "link_blog",    label: "블로그",   link: true, linkTab: "blog", icon: "/icon-naver-blog.png" },
  { id: "link_sns",     label: "SNS",      link: true, linkTab: "sns",  icon: "/icon-instagram.webp" },
];

/* ── 통합 탭 헤더 (글쓰기 / 링크 글쓰기 공용) ── */

/* MARKETING_TABS - insta_auto_reply, insta_auto_dm 숨김 처리 (미구현) */
const MARKETING_TABS = [
  { id: "sns_analysis",  label: "SNS 분석",      icon: "/icon-instagram.webp" },
  // { id: "insta_auto_reply", label: "스레드 자동댓글",  icon: "/icon-threads.png" },  // 미구현 - 숨김
  // { id: "insta_auto_dm", label: "인스타 자동DM", icon: "/icon-threads.png" },        // 미구현 - 숨김
];

function MarketingHub({ theme, isDark, user, C, navigate, onUserUpdate, defaultTab }) {
  /* SNS 분석만 남아있으므로 탭 없이 직접 렌더링 */
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", padding:"16px 24px 12px", textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:3 }}>마케팅</div>
        <div style={{ fontSize:12, color:muted }}>경쟁사 SNS 분석 도구를 활용해보세요</div>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        <ViralityAnalyzer isDark={isDark} />
      </div>
    </div>
  );
}

/* ── 파일 받아쓰기 컴포넌트 ── */
const FILE_TEMPLATES = [
  { id:"info",    icon:"📋", label:"정보성 글",     desc:"정보/노하우/가이드" },
  { id:"visit",   icon:"📍", label:"체험/방문후기", desc:"장소/매장 방문 후기" },
  { id:"travel",  icon:"✈️",  label:"여행 후기",     desc:"국내외 여행 기록" },
  { id:"product", icon:"📦", label:"제품 후기",     desc:"제품/서비스 리뷰" },
  { id:"column",  icon:"📰", label:"칼럼",         desc:"전문 의견/분석 글" },
  { id:"article", icon:"🗞️",  label:"기사 방식",     desc:"뉴스 기사 스타일" },
];

function FileTranscriber({ isDark, user, onLoginRequest, onUserUpdate, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const accent = "#7c6aff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const accentBg = D ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)";

  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [audioMode, setAudioMode] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [manualText, setManualText] = useState("");
  const fileRef = useRef(null);

  const cardStyle = { background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const inputStyle = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:13, outline:"none" };
  const btnStyle = { padding:"14px", borderRadius:12, border:"none", cursor:"pointer", fontSize:15, fontWeight:900, width:"100%", background:`linear-gradient(135deg,${accent},#8b5cf6)`, color:"#fff" };

  // 파일 업로드 처리
  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("파일은 10MB 이하만 가능합니다."); return; }
    setFile(f);
    setError("");
    setAnalyzing(true);
    setFileContent("");
    setResult("");
    setSelectedTemplate(null);
    try {
      const { callAI } = await import("./aiClient");
      if (f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i.test(f.name)) {
        // 음성 파일 → 브라우저 재생 + SpeechRecognition으로 자동 전사
        const audioUrl = URL.createObjectURL(f);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setFileContent("🎤 음성 파일: " + f.name + "\n\n이 브라우저에서는 음성 인식이 지원되지 않습니다.\n크롬 브라우저에서 다시 시도해주세요.\n\n또는 아래에 음성 내용을 직접 입력해주세요:");
          setAudioMode(true);
          URL.revokeObjectURL(audioUrl);
        } else {
          setFileContent("🎤 음성 파일 인식 준비 완료: " + f.name + "\n\n아래 '음성 인식 시작' 버튼을 눌러 재생하면 자동으로 텍스트로 변환됩니다.\n또는 직접 내용을 입력할 수도 있습니다.");
          setAudioUrl(audioUrl);
          setAudioMode(true);
        }
      } else if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:f.type,data:base64.split(",")[1]}},
          {type:"text",text:"이 이미지의 내용을 한국어로 상세히 설명해주세요. 텍스트가 있다면 모두 추출하고, 이미지의 주제와 내용을 자세히 기술해주세요."}
        ]}], 1500);
        setFileContent(txt);
      } else {
        const rawText = await f.text();
        const content = rawText.slice(0, 5000);
        setFileContent(content);
      }
    } catch (err) {
      setError("파일 분석 중 오류: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 템플릿 선택 후 글 생성
  const generateFromTemplate = async (tmpl) => {
    if (!fileContent.trim()) { setError("파일 내용이 없습니다."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (showPointConfirm && !(await showPointConfirm(10))) return;
    setSelectedTemplate(tmpl);
    setGenerating(true);
    setResult("");
    setError("");
    try {
      const { callAIStream } = await import("./aiClient");
      const templatePrompts = {
        info: "정보성 블로그 글 (유용한 정보/노하우/가이드 형식, 검색 최적화 제목 포함, 소제목으로 구분된 체계적 구성)",
        visit: "체험/방문후기 형식 글 (방문 전 기대 → 방문 과정 → 솔직 총평, 장단점 명확, 재방문 의사 포함)",
        travel: "여행 후기 형식 글 (일정별 구조화, 맛집/명소/교통 정보, 실제 여행자 감성, 예산 팁 포함)",
        product: "제품 후기 형식 글 (구매 전 고민 → 언박싱 → 실사용기, 장단점 비교, 추천 대상/가성비 총평)",
        column: "전문 칼럼 형식 글 (주장 → 근거 → 반론 → 결론, 데이터/사례/통계 인용, 논리적 전개)",
        article: "뉴스 기사 방식 글 (역피라미드 구조, 5W1H 포함, 객관적 사실 기반, 보도 형식)",
      };
      const prompt = `다음 파일 내용을 기반으로 ${templatePrompts[tmpl] || "블로그 글"}로 변환해주세요.

[파일 내용]
${fileContent.slice(0, 4000)}

[작성 규칙]
- 2,000~3,000자 분량
- 한국어로 작성
- 소제목 3~5개로 구조화
- 자연스러운 문체
- 글 맨 앞에 SEO 최적화 제목 포함
- 마지막에 해시태그 10개 추가
- 이모티콘/이모지/마크다운 사용 금지, 순수 텍스트만`;

      await callAIStream("claude-haiku-4-5", [{role:"user",content:prompt}], 4000, (accumulated) => {
        setResult(accumulated);
      });
    } catch (err) {
      setError("글 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // 다운로드 기능
  const downloadTxt = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.txt"; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadDoc = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>글 받아쓰기</title></head><body style="font-family:'맑은 고딕',sans-serif;font-size:12pt;line-height:1.8;">${result.split("\n").map(l => l.trim() ? `<p>${l}</p>` : "<br>").join("")}</body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.doc"; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPdf = () => {
    const lines = result.split("\n");
    let y = 50;
    const pageW = 595, pageH = 842, margin = 50, lineH = 18, maxW = pageW - margin * 2;
    let pages = [[]];
    let curPage = 0;
    for (const line of lines) {
      if (y + lineH > pageH - margin) { pages.push([]); curPage++; y = margin; }
      // 한 줄이 길면 줄바꿈 (약 40자 단위)
      const chunks = [];
      if (line.length > 40) {
        for (let i = 0; i < line.length; i += 40) chunks.push(line.slice(i, i + 40));
      } else {
        chunks.push(line || " ");
      }
      for (const chunk of chunks) {
        if (y + lineH > pageH - margin) { pages.push([]); curPage++; y = margin; }
        pages[curPage].push({ text: chunk, y });
        y += lineH;
      }
    }
    // 간단한 PDF 생성 (텍스트 전용)
    let pdf = "%PDF-1.4\n";
    const objs = [];
    const addObj = (content) => { objs.push({ offset: pdf.length, content }); pdf += `${objs.length} 0 obj\n${content}\nendobj\n`; };
    // 1: Catalog
    addObj(`<< /Type /Catalog /Pages 2 0 R >>`);
    // 2: Pages
    const pageRefs = pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
    addObj(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
    // 3: Font
    addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    // Pages + Contents
    for (let p = 0; p < pages.length; p++) {
      const contentIdx = 4 + p * 2 + 1;
      const pageIdx = 4 + p * 2;
      // 텍스트를 ASCII로 변환 (한글은 ?로 대체 - 기본 PDF 폰트 제한)
      const streamLines = [`BT /F1 11 Tf`];
      for (const item of pages[p]) {
        const safe = item.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
        streamLines.push(`${margin} ${pageH - item.y} Td (${safe}) Tj`);
        streamLines.push(`${-margin} ${-(pageH - item.y)} Td`);
      }
      streamLines.push("ET");
      const stream = streamLines.join("\n");
      addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentIdx} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
      addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    }
    const xrefOff = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of objs) pdf += `${String(o.offset).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex:1, overflowY:"auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* 파일 업로드 영역 */}
        {!result && (
          <div style={cardStyle}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:8 }}>파일 업로드</div>
            <div style={{ fontSize:12, color:muted, marginBottom:12, lineHeight:1.6 }}>
              이미지, PDF, TXT, 음성 파일을 업로드하면 AI가 내용을 분석하고 원하는 형식의 글로 변환해줘요
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ border:`2px dashed ${bdr}`, borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", background:ibg, transition:"border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
              <div style={{ width:56, height:56, borderRadius:16, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <span style={{ fontSize:24 }}>📄</span>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:text }}>클릭하여 파일을 선택하세요</div>
              <div style={{ fontSize:12, color:muted, marginTop:4 }}>이미지 (JPG, PNG), PDF, TXT, 음성 (MP3, WAV, M4A) (최대 10MB)</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx,audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac" style={{ display:"none" }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }} />
            {file && (
              <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:accentBg, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>📎</span>
                <span style={{ fontSize:13, fontWeight:700, color:accent, flex:1 }}>{file.name}</span>
                <span style={{ fontSize:11, color:muted }}>{(file.size / 1024).toFixed(0)}KB</span>
              </div>
            )}
          </div>
        )}

        {/* 분석 중 */}
        {analyzing && (
          <div style={{ ...cardStyle, textAlign:"center", padding:32 }}>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:8 }}>파일 분석 중...</div>
            <div style={{ fontSize:13, color:muted }}>AI가 파일 내용을 읽고 있어요</div>
          </div>
        )}

        {/* 음성 파일 모드 → 재생+인식 또는 직접 입력 */}
        {audioMode && !result && !analyzing && (
          <div style={cardStyle}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>🎤 음성 내용 입력</div>
            {audioUrl && (
              <div style={{ marginBottom:12 }}>
                <audio src={audioUrl} controls style={{ width:"100%", borderRadius:10 }} />
                <button onClick={async () => {
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) { setError("크롬 브라우저에서 시도해주세요."); return; }
                  setTranscribing(true);
                  const recognition = new SR();
                  recognition.lang = "ko-KR"; recognition.continuous = true; recognition.interimResults = true;
                  let finalText = "";
                  recognition.onresult = (e) => {
                    let t = "";
                    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
                    finalText = t;
                    setManualText(t);
                  };
                  recognition.onerror = () => { setTranscribing(false); setError("음성 인식 중 오류가 발생했습니다."); };
                  recognition.onend = () => { setTranscribing(false); if (finalText) setFileContent(finalText); };
                  recognition.start();
                  // 오디오 재생
                  const audioEl = document.querySelector("audio");
                  if (audioEl) { audioEl.currentTime = 0; audioEl.play(); }
                  // 60초 후 자동 정지
                  setTimeout(() => { try { recognition.stop(); } catch {} }, 60000);
                }} disabled={transcribing}
                  style={{ ...btnStyle, marginTop:8, background: transcribing ? "#888" : `linear-gradient(135deg,#22c55e,#16a34a)`, opacity: transcribing ? 0.7 : 1 }}>
                  {transcribing ? "🎧 인식 중... (재생하며 인식합니다)" : "🎙️ 음성 인식 시작 (재생하며 자동 변환)"}
                </button>
              </div>
            )}
            <div style={{ fontSize:12, color:muted, marginBottom:6 }}>또는 음성 내용을 직접 입력/붙여넣기:</div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)}
              placeholder="음성 파일의 내용을 여기에 입력해주세요..."
              style={{ ...inputStyle, minHeight:120, resize:"vertical", lineHeight:1.7 }} />
            <button onClick={() => { if (manualText.trim()) { setFileContent(manualText); setAudioMode(false); } else { setError("내용을 입력해주세요."); } }}
              style={{ ...btnStyle, marginTop:10 }}>
              ✓ 내용 확인 → 템플릿 선택
            </button>
          </div>
        )}

        {/* 파일 분석 완료 → 템플릿 선택 */}
        {fileContent && !audioMode && !result && !analyzing && (
          <>
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:6 }}>분석된 내용 미리보기</div>
              <div style={{ fontSize:12, color:muted, lineHeight:1.8, maxHeight:150, overflowY:"auto", padding:"10px 12px", borderRadius:10, background:ibg, border:`1px solid ${bdr}`, whiteSpace:"pre-wrap" }}>
                {fileContent.slice(0, 500)}{fileContent.length > 500 ? "..." : ""}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:6 }}>글 형식 선택</div>
              <div style={{ fontSize:12, color:muted, marginBottom:12 }}>어떤 형식으로 글을 변환할까요?</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8 }}>
                {FILE_TEMPLATES.map(t => {
                  const isA = selectedTemplate === t.id;
                  return (
                    <button key={t.id} onClick={() => generateFromTemplate(t.id)}
                      disabled={generating}
                      style={{ padding:"14px", borderRadius:12, textAlign:"left", cursor: generating ? "not-allowed" : "pointer",
                        border: isA ? `2px solid ${accent}` : `2px solid ${bdr}`,
                        background: isA ? accentBg : ibg, opacity: generating && !isA ? 0.5 : 1, transition:"all 0.15s" }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>{t.icon}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: isA ? accent : text }}>{t.label}</div>
                      <div style={{ fontSize:11, color:muted, marginTop:2 }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 생성 중 */}
        {generating && !result && (
          <div style={{ ...cardStyle, textAlign:"center", padding:32 }}>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:8 }}>글 생성 중...</div>
            <div style={{ fontSize:13, color:muted }}>선택한 형식에 맞게 변환하고 있어요</div>
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <>
            <div style={cardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:800, color:text }}>변환 결과</div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { navigator.clipboard.writeText(result); }}
                    style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    복사
                  </button>
                </div>
              </div>
              <div style={{ fontSize:13, color:text, lineHeight:2, maxHeight:500, overflowY:"auto", padding:"14px 16px", borderRadius:10, background:ibg, border:`1px solid ${bdr}`, whiteSpace:"pre-wrap" }}>
                {result}
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>다운로드</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                <button onClick={downloadTxt} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📝</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>TXT</div>
                  <div style={{ fontSize:10, color:muted }}>텍스트 파일</div>
                </button>
                <button onClick={downloadDoc} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📄</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>DOCX</div>
                  <div style={{ fontSize:10, color:muted }}>워드 문서</div>
                </button>
                <button onClick={downloadPdf} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📕</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>PDF</div>
                  <div style={{ fontSize:10, color:muted }}>PDF 문서</div>
                </button>
              </div>
            </div>

            {/* 다시 하기 */}
            <button onClick={() => { setFile(null); setFileContent(""); setResult(""); setSelectedTemplate(null); setError(""); }}
              style={{ ...btnStyle, background:"transparent", border:`1.5px solid ${bdr}`, color:muted, marginTop:8 }}>
              다른 파일로 다시 하기
            </button>
          </>
        )}

        {error && <div style={{ marginTop:12, padding:14, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}>{error}</div>}
      </div>
    </div>
  );
}

function UnifiedBlogWriter({ theme, isDark, user, onLoginRequest, onUserUpdate, showPointConfirm, defaultPlatform }) {
  const defaultIsLink = defaultPlatform && WRITE_PLATFORMS.find(p => p.id === defaultPlatform)?.link;
  const [category, setCategory] = useState(defaultIsLink ? "link" : "direct");
  const [platform, setPlatform] = useState(defaultPlatform || "blog_naver");
  const info = WRITE_PLATFORMS.find(p => p.id === platform) || WRITE_PLATFORMS[0];
  const isLink = info && info.link;

  const directTabs = WRITE_PLATFORMS.filter(p => !p.link && !p.separator);
  const linkTabs = WRITE_PLATFORMS.filter(p => p.link);
  const subTabs = category === "direct" ? directTabs : category === "link" ? linkTabs : [];

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === "direct" && info?.link) setPlatform("blog_naver");
    if (cat === "link" && !info?.link) setPlatform("link_youtube");
  };

  const _text = isDark ? "#e8eaed" : "#1a1a2e";
  const _muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const _bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const _accent = "#7c6aff";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)" }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"16px 24px 0" }}>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:18, fontWeight:900, color:_text, marginBottom:3 }}>글쓰기</div>
            <div style={{ fontSize:12, color:_muted }}>직접 작성하거나, 링크/파일을 블로그 글로 변환할 수 있어요</div>
          </div>
          {/* 대분류 탭 */}
          <div style={{ display:"flex", justifyContent:"center", gap:4, marginBottom:10 }}>
            {[{id:"direct",label:"직접 작성"},{id:"link",label:"링크에서 변환"},{id:"file",label:"파일 받아쓰기"}].map(c => {
              const active = category === c.id;
              return (
                <button key={c.id} onClick={() => handleCategoryChange(c.id)} style={{
                  padding:"8px 20px", borderRadius:20, border: active ? `2px solid ${_accent}` : `1.5px solid ${_bdr}`,
                  cursor:"pointer", background: active ? (isDark ? "rgba(124,106,255,0.18)" : "rgba(124,106,255,0.08)") : "transparent",
                  color: active ? _accent : _muted, fontSize:13, fontWeight: active ? 800 : 500, transition:"all 0.15s",
                }}>{c.label}</button>
              );
            })}
          </div>
          {/* 세부 플랫폼 탭 (파일 받아쓰기에서는 숨김) */}
          {category !== "file" && (
            <div style={{ display:"flex", justifyContent:"center", gap:2, borderBottom:`1px solid ${_bdr}`, flexWrap:"wrap" }}>
              {subTabs.map(t => {
                const active = platform === t.id;
                return (
                  <button key={t.id} onClick={() => setPlatform(t.id)} style={{
                    padding:"9px 16px", border:"none", cursor:"pointer", background:"transparent",
                    color: active ? _accent : _muted, fontSize:13, fontWeight: active ? 700 : 400,
                    borderBottom: active ? `2px solid ${_accent}` : "2px solid transparent",
                    transition:"all 0.15s", marginBottom:-1, display:"flex", alignItems:"center", gap:5,
                  }}>
                    {t.icon && <img src={t.icon} alt="" style={{ width:16, height:16, borderRadius:3, objectFit:"contain", opacity: active ? 1 : 0.5 }} />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {category === "file" ? (
          <FileTranscriber isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        ) : isLink ? (
          info.linkTab === "youtube" ? (
            <YtBlogGenerator key={platform} theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
          ) : (
            <NewsBlogGenerator key={platform} theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate}
              linkMode={info.linkTab === "blog" ? "blog" : info.linkTab === "sns" ? "sns" : "news"} showPointConfirm={showPointConfirm} />
          )
        ) : (
          <BlogGenerator key={platform} initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        )}
      </div>
    </div>
  );
}

/* ── 링크 글쓰기 통합 컴포넌트 ── */
function LinkBlogCombined({ theme, user, onLoginRequest, onUserUpdate, showPointConfirm, defaultTab }) {
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
          <YtBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        ) : (
          <NewsBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate}
            linkMode={tab === "blog" ? "blog" : tab === "sns" ? "sns" : "news"} showPointConfirm={showPointConfirm} />
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
          const { changePoints, setLocalUser } = await import('./storage.js');
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
    return function() { delete window.__onLoginRequest; };
  }, [onLoginRequest]);

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
  const [pointConfirm, setPointConfirm] = useState(null); // { cost, onConfirm, onCancel }

  // 포인트 차감 확인 모달 — Promise를 반환하므로 await로 사용
  const showPointConfirm = (cost) => {
    return new Promise((resolve) => {
      setPointConfirm({
        cost,
        onConfirm: () => { setPointConfirm(null); resolve(true); },
        onCancel:  () => { setPointConfirm(null); resolve(false); },
      });
    });
  };

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
      <div style={{ background:C.modalBg||C.card, border:"1px solid "+C.border,
        borderRadius:20, padding:"32px 28px", maxWidth:360, width:"90%",
        boxShadow:"0 24px 64px rgba(0,0,0,0.18)", textAlign:"center" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"rgba(239,68,68,0.1)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{color:"#ef4444",fontSize:20,fontWeight:900}}>!</span></div>
        <div style={{ fontSize:18, fontWeight:900, color:C.text, marginBottom:10 }}>생성 중입니다!</div>
        <div style={{ fontSize:14, color:C.muted, lineHeight:1.8, marginBottom:24 }}>
          페이지를 나가면<br/>
          <span style={{ color:"#f87171", fontWeight:700 }}>결과물이 저장되지 않으며</span><br/>
          <span style={{ color:"#f59e0b", fontWeight:700 }}>{guardModal.cost}P 포인트가 소진</span>됩니다.<br/>
          정말 나가시겠습니까?
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={guardModal.onCancel}
            style={{ flex:1, padding:"12px", borderRadius:11, border:"1px solid "+C.border,
              background:"transparent", color:C.muted, fontSize:14, fontWeight:700, cursor:"pointer" }}>
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

      {/* ── 포인트 차감 확인 모달 ── */}
      {pointConfirm && (() => {
        const userPts = user?.points || 0;
        const insufficient = userPts < pointConfirm.cost;
        return (
          <div style={{ position:"fixed", inset:0, zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }} onClick={pointConfirm.onCancel}>
            <div onClick={e => e.stopPropagation()} style={{ background: isDark ? "rgba(18,15,40,0.97)" : "#fff", border: "1px solid " + (isDark ? "rgba(124,106,255,0.25)" : "rgba(99,102,241,0.15)"), borderRadius:20, padding:"32px 28px", maxWidth:380, width:"90%", boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,106,255,0.1)" : "0 24px 64px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.08)", textAlign:"center" }}>
              <div style={{ width:52, height:52, borderRadius:14, background: insufficient ? "rgba(239,68,68,0.1)" : "rgba(124,106,255,0.1)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:24 }}>{insufficient ? "\u26A0\uFE0F" : "\uD83D\uDC8E"}</span>
              </div>
              <div style={{ fontSize:18, fontWeight:900, color: isDark ? "#fff" : "#1a1a2e", marginBottom:8 }}>{insufficient ? "\uD3EC\uC778\uD2B8\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4" : "\uD3EC\uC778\uD2B8 \uCC28\uAC10 \uC548\uB0B4"}</div>
              <div style={{ fontSize:14, lineHeight:1.8, color: isDark ? "rgba(255,255,255,0.6)" : "#666", marginBottom:6 }}>
                {insufficient
                  ? <span>{"\uC774 \uC791\uC5C5\uC5D0\uB294 "}<span style={{ color:"#f59e0b", fontWeight:700 }}>{pointConfirm.cost}P</span>{"\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."}</span>
                  : <span>{"\uC774 \uC791\uC5C5\uC744 \uC9C4\uD589\uD558\uBA74 "}<span style={{ color:"#f59e0b", fontWeight:700 }}>{pointConfirm.cost}P</span>{"\uAC00 \uCC28\uAC10\uB429\uB2C8\uB2E4."}<br/>{"\uC9C4\uD589\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?"}</span>
                }
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, marginBottom:20, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.06)", fontSize:13, fontWeight:600, color: insufficient ? "#f87171" : isDark ? "#a5b4fc" : "#6366f1" }}>
                {"\uBCF4\uC720 \uD3EC\uC778\uD2B8: "}{userPts.toLocaleString()}P
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={pointConfirm.onCancel} style={{ flex:1, padding:"13px", borderRadius:12, border: "1px solid " + (isDark ? "rgba(255,255,255,0.12)" : "#ddd"), background:"transparent", color: isDark ? "rgba(255,255,255,0.6)" : "#888", fontSize:14, fontWeight:700, cursor:"pointer" }}>{"\uCDE8\uC18C"}</button>
                {insufficient ? (
                  <button onClick={() => { pointConfirm.onCancel(); navigate("pricing"); }} style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c6aff,#6366f1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,106,255,0.3)" }}>{"\uCDA9\uC804\uD558\uAE30"}</button>
                ) : (
                  <button onClick={pointConfirm.onConfirm} style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c6aff,#6366f1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,106,255,0.3)" }}>{"\uC9C4\uD589"}</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
          position:"absolute", bottom:90, right:20, zIndex:100,
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
          .ai-content-pad{padding:16px 10px 60px!important}
          .ai-grid{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-3{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .ai-form-row{flex-direction:column!important}
        }
        @media(max-width:400px){
          .ai-grid{grid-template-columns:1fr!important}
          .ai-grid-3{grid-template-columns:1fr!important}
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
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
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "min(260px, 80vw)", animation: "slideIn 0.2s ease", zIndex: 51 }}>
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
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22,
                color: isDark ? "#fff" : "#333", padding: "8px 10px", marginRight: 2, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <AiContent aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} C={C} theme={theme} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        </div>
      </div>
    </div>
  );
}
