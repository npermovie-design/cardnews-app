import React, { useState, useEffect, useRef } from "react";
import { Badge, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { useOnlineCount, AiSidebar } from "./AiSidebar.jsx";
import BackgroundTaskIndicator from "./BackgroundTaskIndicator";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage, getAuthToken, syncLocalLibrary } from "./storage";

// ── Lazy-loaded: 메뉴별 도구 (code-split) ──
const ModelGenerator = React.lazy(() => import("./AiImageGenerators.jsx").then(m => ({ default: m.ModelGenerator })));
const SkinRetouchGenerator = React.lazy(() => import("./AiImageGenerators.jsx").then(m => ({ default: m.SkinRetouchGenerator })));
const FaceSwapGenerator = React.lazy(() => import("./AiImageGenerators.jsx").then(m => ({ default: m.FaceSwapGenerator })));
const OutfitSwapGenerator = React.lazy(() => import("./AiImageGenerators.jsx").then(m => ({ default: m.OutfitSwapGenerator })));
const OutpaintGenerator = React.lazy(() => import("./AiImageGenerators.jsx").then(m => ({ default: m.OutpaintGenerator })));
const LibraryPage = React.lazy(() => import("./AiLibrary.jsx").then(m => ({ default: m.LibraryPage })));
const PromptStudioPage = React.lazy(() => import("./AiPromptStudio.jsx").then(m => ({ default: m.PromptStudioPage })));
const SnsNewsFeed = React.lazy(() => import("./AiPromptStudio.jsx").then(m => ({ default: m.SnsNewsFeed })));
const RepurposePage = React.lazy(() => import("./AiTools.jsx").then(m => ({ default: m.RepurposePage })));
const MarketingHub = React.lazy(() => import("./AiTools.jsx").then(m => ({ default: m.MarketingHub })));
const UnifiedBlogWriter = React.lazy(() => import("./AiTools.jsx").then(m => ({ default: m.UnifiedBlogWriter })));
const LinkBlogCombined = React.lazy(() => import("./AiTools.jsx").then(m => ({ default: m.LinkBlogCombined })));
const PlannerPanel = React.lazy(() => import("./CardNewsApp").then(m => ({ default: m.PlannerPanel })));
const CardNewsApp = React.lazy(() => import("./CardNewsApp").then(m => ({ default: m.CardNewsApp })));
const SimpleDetailPageGenerator = React.lazy(() => import("./SimpleDetailPageGenerator"));
const DetailPageStudio = React.lazy(() => import("./v2/DetailPageStudioV2"));
const LogoGenerator = React.lazy(() => import("./LogoGenerator"));
const MockupGenerator = React.lazy(() => import("./MockupGenerator"));
const ProductShotGenerator = React.lazy(() => import("./ProductShotGenerator"));
const ShortsCreator = React.lazy(() => import("./ShortsCreator"));
const LongFormEditor = React.lazy(() => import("./LongFormEditor"));
const BlogGenerator = React.lazy(() => import("./BlogGenerator"));
const SocialAnalyzer = React.lazy(() => import("./SocialAnalyzer"));
const VideoGuidePage = React.lazy(() => import("./VideoGuidePage"));
const AutoPublisher = React.lazy(() => import("./AutoPublisher"));
const AnalyzerPage = React.lazy(() => import("./AnalyzerPage"));
const SnsConnectionManager = React.lazy(() => import("./SnsConnectionManager"));
const SnsConsulting = React.lazy(() => import("./SnsConsulting"));
const SnsPublisher = React.lazy(() => import("./SnsPublisher"));

/* ════════════════════════════════════════════════════════════
   VideoEditHub — 숏폼/롱폼 선택 → 해당 에디터 표시
════════════════════════════════════════════════════════════ */
function VideoEditHub({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, showPointConfirm, initialMode }) {
  const [mode, setMode] = React.useState(initialMode); // null | "shortform" | "longform"
  const { t: _t } = useI18n();
  const acc = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e5f0";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background: isDark ? "transparent" : "#f4f4f8" }}>
      {/* 상단 탭 바 */}
      <div style={{ padding:"10px 24px 0", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <div style={{ display:"flex", gap:4, padding:3, borderRadius:12, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.06)" }}>
          {[
            { id: null, label: _t("typeSelect") },
            { id: "shortform", label: _t("shortformEdit") },
            { id: "longform", label: _t("longformEdit") },
          ].map(tab => (
            <button key={tab.id||"select"} onClick={() => setMode(tab.id)}
              style={{
                padding:"7px 16px", borderRadius:9, border:"none", cursor:"pointer",
                background: mode === tab.id ? acc : "transparent",
                color: mode === tab.id ? "#fff" : muted,
                fontSize:13, fontWeight:700, transition:"all 0.15s",
              }}>{tab.label}</button>
          ))}
        </div>
        {mode && (
          <div style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, background:"rgba(124,106,255,0.1)", fontSize:10, fontWeight:700, color:acc, marginLeft:4 }}>
            {mode === "shortform" ? _t("shortformMode") : _t("longformMode")}
          </div>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      {mode === "shortform" ? (
        <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:muted}}>{_t("loadingText")}</div>}>
          <ShortsCreator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} onStatusChange={() => {}} />
        </React.Suspense>
      ) : mode === "longform" ? (
        <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:muted}}>{_t("loadingText")}</div>}>
          <LongFormEditor isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} onStatusChange={() => {}} />
        </React.Suspense>
      ) : (
        /* 유형 선택 화면 */
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:640, margin:"0 auto", padding:"36px 20px 60px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>{_t("videoEditing")}</div>
            <div style={{ fontSize:13, color:muted, marginBottom:32 }}>{_t("whatVideoEdit")}</div>
            <div className="ai-home-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {/* 숏폼 */}
              <div onClick={() => setMode("shortform")} className="hover-lift"
                style={{ padding:"32px 20px", borderRadius:16, border:`1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.04)" : "#fff", cursor:"pointer", textAlign:"center", transition:"all 0.2s" }}>
                <div style={{ width:72, height:72, borderRadius:18, background:`${acc}10`, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="2" width="12" height="20" rx="3" stroke={acc} strokeWidth="1.8"/>
                    <path d="M10 14V10l4 2-4 2z" fill={acc}/>
                  </svg>
                </div>
                <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:6 }}>{_t("shortformEdit")}</div>
                <div style={{ fontSize:13, color:muted, lineHeight:1.6, marginBottom:12, whiteSpace:"pre-line" }}>
                  {_t("shortformDesc")}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, justifyContent:"center" }}>
                  {[_t("aiHighlight"),_t("vertical916"),_t("autoCaption")].map(tag => (
                    <span key={tag} style={{ padding:"4px 10px", borderRadius:20, background:`${acc}10`, fontSize:11, color:acc, fontWeight:600 }}>{tag}</span>
                  ))}
                </div>
              </div>
              {/* 롱폼 */}
              <div onClick={() => setMode("longform")} className="hover-lift"
                style={{ padding:"32px 20px", borderRadius:16, border:`1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.04)" : "#fff", cursor:"pointer", textAlign:"center", transition:"all 0.2s" }}>
                <div style={{ width:72, height:72, borderRadius:18, background:`${acc}10`, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8"/>
                    <path d="M8 4v16M16 4v16" stroke={acc} strokeWidth="1" opacity="0.4"/>
                    <path d="M2 12h20" stroke={acc} strokeWidth="1" opacity="0.4"/>
                  </svg>
                </div>
                <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:6 }}>{_t("longformEdit")}</div>
                <div style={{ fontSize:13, color:muted, lineHeight:1.6, marginBottom:12, whiteSpace:"pre-line" }}>
                  {_t("longformDesc")}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, justifyContent:"center" }}>
                  {[_t("silenceRemove"),_t("repeatRemove"),_t("captionAnimation")].map(tag => (
                    <span key={tag} style={{ padding:"4px 10px", borderRadius:20, background:`${acc}10`, fontSize:11, color:acc, fontWeight:600 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AiPage
════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   AiPage – 통합 AI 생성기 (공통 사이드바 + 메뉴별 콘텐츠)
════════════════════════════════════════════════════════════ */

// ── 접속자 카운트 훅 (localStorage heartbeat) ──────────────────────────────


// ── 기획 ──────────────────────────────────────────────────────

// ── 콘텐츠 제작 선택 화면 ──────────────────────────────
function ContentCreateSelector({ isDark, homeText, homeMuted, setAiMenu }) {
  const { t: _t } = useI18n();
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  // 편집 AI: 글씨 수정 가능한 에디터 (상세페이지 리뉴얼 전 비활성화)
  const editAiTools = [];

  // 이미지 AI: 같은 콘텐츠를 이미지로 바로 생성 (상세페이지 리뉴얼 전 비활성화)
  const imageAiTools = [];

  const renderToolCard = (t) => (
    <button key={t.id} onClick={() => setAiMenu(t.id)}
      style={{ padding:"20px 16px", borderRadius:14, border:`1.5px solid ${bdr}`, background:bg, cursor:"pointer",
        display:"flex", alignItems:"center", gap:14, transition:"all 0.15s", textAlign:"left", width:"100%" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=accent; e.currentTarget.style.boxShadow="0 4px 16px rgba(124,106,255,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=bdr; e.currentTarget.style.boxShadow="none"; }}>
      <img src={t.img} alt="" loading="lazy" decoding="async" style={{ width:40, height:40, objectFit:"contain", flexShrink:0 }} />
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:homeText }}>{t.label}</div>
        <div style={{ fontSize:12, color:homeMuted, marginTop:2 }}>{t.desc}</div>
        {t.size && <div style={{ fontSize:10, color:accent, marginTop:3, fontWeight:600 }}>{t.size}</div>}
      </div>
    </button>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f8f9fb" }}>
        <div style={{ maxWidth:800, margin:"0 auto", padding:"32px 24px 60px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>{_t("contentCreate")}</div>
            <div style={{ fontSize:13, color:homeMuted }}>{_t("contentCreateDesc")}</div>
          </div>

          {/* 편집 AI */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(124,106,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✏️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:homeText }}>{_t("startWithEditAi")}</div>
                <div style={{ fontSize:11, color:homeMuted }}>{_t("editableContent")}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {editAiTools.map(renderToolCard)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── 미니 통계 대시보드 (홈 화면용) ──────────────────────────────────────
function MiniStats({ isDark, homeText, homeMuted, cardBdr, _s: _sProp }) {
  const { t: _s } = useI18n();
  const saves = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]"); } catch { return []; }
  }, []);
  const totalCount = saves.length;
  const usedPoints = totalCount * 10;
  const weekCount = React.useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return saves.filter(s => {
      const ts = parseInt(s.id, 10);
      return !isNaN(ts) && (now - ts) < weekMs;
    }).length;
  }, [saves]);
  const accent = "#7c6aff";
  const stats = [
    { label: _s("totalContent"), value: totalCount, icon: "📝", color: accent },
    { label: _s("usedPoints"), value: usedPoints + "P", icon: "💎", color: "#f59e0b" },
    { label: _s("thisWeek"), value: weekCount, icon: "📅", color: "#10b981" },
  ];
  return (
    <div style={{ display:"flex", gap:10, marginBottom:24, justifyContent:"center", flexWrap:"wrap" }}>
      {stats.map(s => (
        <div key={s.label} style={{ flex:"1 1 0", minWidth:100, maxWidth:180, padding:"14px 12px", borderRadius:14, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
          <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1.2 }}>{s.value}</div>
          <div style={{ fontSize:11, fontWeight:600, color:homeMuted, marginTop:4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── 최근 작업 빠른 접근 (홈 화면용) ──────────────────────────────────────
function RecentWork({ isDark, homeText, homeMuted, cardBdr, setAiMenu, _s: _sProp }) {
  const { t: _s } = useI18n();
  const saves = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]").slice(0, 3); } catch { return []; }
  }, []);
  const accent = "#7c6aff";
  const typeLabel = (tp) => {
    const map = { blog_naver:_s("platNaver"), blog_tistory:_s("platTistory"), blog_insta:_s("platInsta"), blog_youtube:_s("platYoutube"), blog_thread:_s("platThread"), blog_link:_s("platLink"), blog_cafe:_s("platCafe"), blog_yt_blog:_s("platLink") };
    return map[tp] || tp || _s("platOther");
  };
  return (
    <div style={{ marginBottom:24, textAlign:"left" }}>
      <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span>{_s("recentWork")}</span>
        {saves.length > 0 && (
          <span onClick={() => setAiMenu("library")} style={{ fontSize:12, fontWeight:600, color:accent, cursor:"pointer" }}>{_s("viewAll")} →</span>
        )}
      </div>
      {saves.length === 0 ? (
        <div style={{ padding:"24px 16px", borderRadius:14, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>✨</div>
          <div style={{ fontSize:13, color:homeMuted, lineHeight:1.6 }}>{_s("noContentYet")}</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {saves.map(s => (
            <div key={s.id} onClick={() => setAiMenu("library")}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", cursor:"pointer", transition:"all 0.15s", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title || _s("untitled")}</div>
                <div style={{ fontSize:11, color:homeMuted, marginTop:3 }}>{s.date}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:accent, background:`${accent}15`, padding:"3px 10px", borderRadius:20, flexShrink:0 }}>{typeLabel(s.type)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 온보딩 튜토리얼 모달 ──────────────────────────────────────
function OnboardingModal({ isDark, onClose, _s: _sProp }) {
  const { t: _s } = useI18n();
  const [step, setStep] = React.useState(0);
  const accent = "#7c6aff";
  const bg = isDark ? "#1a1a2e" : "#fff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const steps = [
    { icon:"✍️", title:_s("onboardStep1Title"), desc:_s("onboardStep1Desc") },
    { icon:"🔥", title:_s("onboardStep2Title"), desc:_s("onboardStep2Desc") },
    { icon:"📅", title:_s("onboardStep3Title"), desc:_s("onboardStep3Desc") },
    { icon:"🎉", title:_s("onboardStep4Title"), desc:_s("onboardStep4Desc") },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const handleFinish = () => { localStorage.setItem("sns_onboarding_done", "1"); onClose(); };
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)", padding:20 }} onClick={handleFinish}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:400, borderRadius:24, background:bg, padding:"40px 32px 32px", boxShadow:"0 24px 80px rgba(0,0,0,0.25)", textAlign:"center", position:"relative", overflow:"hidden" }}>
        {/* skip */}
        <button onClick={handleFinish} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", fontSize:12, fontWeight:600, color:muted, cursor:"pointer" }}>{_s("skipBtn")}</button>
        {/* icon */}
        <div style={{ fontSize:52, marginBottom:16, lineHeight:1 }}>{cur.icon}</div>
        {/* title */}
        <div style={{ fontSize:20, fontWeight:900, color:text, marginBottom:10, lineHeight:1.4 }}>{cur.title}</div>
        {/* desc */}
        <div style={{ fontSize:14, color:muted, lineHeight:1.8, whiteSpace:"pre-line", marginBottom:28 }}>{cur.desc}</div>
        {/* dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i===step?24:8, height:8, borderRadius:4, background: i===step?accent:`${accent}30`, transition:"all 0.3s" }} />
          ))}
        </div>
        {/* buttons */}
        <div style={{ display:"flex", gap:10 }}>
          {step > 0 && (
            <button onClick={()=>setStep(step-1)} style={{ flex:1, padding:"14px 0", borderRadius:14, border:`1.5px solid ${accent}40`, background:"transparent", color:accent, fontSize:15, fontWeight:800, cursor:"pointer" }}>{_s("prevBtn")}</button>
          )}
          <button onClick={()=>{ if(isLast) handleFinish(); else setStep(step+1); }}
            style={{ flex:1, padding:"14px 0", borderRadius:14, border:"none", background:accent, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:`0 8px 24px ${accent}40` }}>
            {isLast ? _s("getStarted") : _s("nextBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 미니 소셜 플래너 (홈 화면용) ──────────────────────────────────────
function MiniPlanner({ isDark, homeText, homeMuted, cardBdr, setAiMenu }) {
  const { t: _t } = useI18n();
  const PLANNER_KEY = "sns_planner_v1";
  const STICKER_KEY = "sns_planner_stickers_v1";
  const plans = (() => { try { return JSON.parse(localStorage.getItem(PLANNER_KEY)) || []; } catch { return []; } })();
  const stickerData = (() => { try { return JSON.parse(localStorage.getItem(STICKER_KEY)) || {}; } catch { return {}; } })();
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const todayPlans = plans.filter(p => p.date === todayStr).sort((a,b) => (a.time||"").localeCompare(b.time||""));
  const todayStickers = stickerData[todayStr] || [];
  const upcomingCount = plans.filter(p => p.date >= todayStr).length;

  const PLAT_MAP = {
    instagram:"#E1306C", youtube:"#FF0000", naverblog:"#03C75A", navercafe:"#03C75A",
    tiktok:"#010101", threads:"#000", tistory:"#F97316", twitter:"#1DA1F2",
    facebook:"#1877F2", linkedin:"#0A66C2", pinterest:"#E60023", kakao:"#FEE500",
    band:"#06CF58", brunch:"#333", other:"#888"
  };

  return (
    <div style={{ borderRadius:16, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${cardBdr}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>📅</span>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:homeText }}>{_t("todayPlan")} {todayStickers.map((s,i)=><span key={i}>{s}</span>)}</div>
            <div style={{ fontSize:11, color:homeMuted }}>{_t("scheduledCount")} {upcomingCount}{_t("scheduledUnit")}</div>
          </div>
        </div>
        <button onClick={() => setAiMenu("social_planner")}
          style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${isDark?"rgba(124,106,255,0.3)":"rgba(124,106,255,0.2)"}`, background:"transparent", color:"#7c6aff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          {_t("viewFullPlan")}
        </button>
      </div>
      <div style={{ padding:"12px 20px" }}>
        {todayPlans.length === 0 ? (
          <div style={{ textAlign:"center", padding:"16px 0", color:homeMuted, fontSize:13 }}>
            {_t("noPlanToday")} ·{" "}
            <span onClick={() => setAiMenu("social_planner")} style={{ color:"#7c6aff", cursor:"pointer", fontWeight:700 }}>{_t("createPlan")}</span>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {todayPlans.slice(0, 3).map(plan => (
              <div key={plan.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:PLAT_MAP[plan.platform]||"#888", flexShrink:0 }} />
                <span style={{ fontSize:12, color:homeMuted, flexShrink:0, width:42 }}>{plan.time}</span>
                <span style={{ fontSize:13, fontWeight:600, color:homeText, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{plan.title}</span>
              </div>
            ))}
            {todayPlans.length > 3 && <div style={{ fontSize:11, color:homeMuted, textAlign:"center" }}>+{todayPlans.length - 3}{_t("moreItems")}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 네이버 쇼핑인사이트 실시간 컴포넌트 ──────────────────────
function NaverShoppingInsight({ isDark, homeText, homeMuted, border, setAiMenu }) {
  const { t: _t } = useI18n();
  const [data, setData] = useState(null);
  const [activeCatN, setActiveCatN] = useState("전체");
  const nGreen = "#03c75a";

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/naver-datalab?action=all");
        const d = await r.json();
        if (d.categories) setData(d.categories);
      } catch {}
    })();
  }, []);

  if (!data) return null;

  const catNames = Object.keys(data);
  const catColorMap = {
    "전체":"#03c75a", "패션의류":"#e1306c", "화장품/미용":"#d946ef", "디지털/가전":"#2563eb",
    "식품":"#ea580c", "가구/인테리어":"#0d9488", "출산/유아동":"#ec4899", "스포츠/레저":"#16a34a", "생활/건강":"#0891b2",
  };
  const catLabelMap = {
    "전체": _t("ai_shopCatAll"), "패션의류": _t("ai_shopCatFashion"), "화장품/미용": _t("ai_shopCatBeauty"),
    "디지털/가전": _t("ai_shopCatDigital"), "식품": _t("ai_shopCatFood"), "가구/인테리어": _t("ai_shopCatFurniture"),
    "출산/유아동": _t("ai_shopCatBaby"), "스포츠/레저": _t("ai_shopCatSports"), "생활/건강": _t("ai_shopCatHealth"),
  };
  const currentItems = data[activeCatN] || [];
  const c = catColorMap[activeCatN] || nGreen;

  return (
    <div style={{ marginBottom:24, padding:"18px 20px", borderRadius:12, background:isDark?"rgba(3,199,90,0.05)":"#f8fdf9", border:`1px solid ${isDark?"rgba(3,199,90,0.1)":"rgba(3,199,90,0.15)"}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={nGreen} strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7h3l2 5 2-5h3v10h-2.5V11l-2 4h-1l-2-4v6H8V7z"/></svg>
        <span style={{ fontSize:14, fontWeight:800, color:homeText }}>{_t("naverShoppingKeywords")}</span>
        <a href="https://datalab.naver.com/shoppingInsight/sCategory.naver" target="_blank" rel="noopener noreferrer"
          style={{ marginLeft:"auto", fontSize:11, color:homeMuted, textDecoration:"none", display:"flex", alignItems:"center", gap:3 }}>
          {_t("datalab")}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display:"flex", gap:4, marginBottom:14, overflowX:"auto", flexWrap:"wrap" }}>
        {catNames.map(cat => {
          const cc = catColorMap[cat] || "#6b7280";
          const isA = activeCatN === cat;
          return (
            <button key={cat} onClick={() => setActiveCatN(cat)}
              style={{ padding:"5px 12px", borderRadius:6, border: isA ? `1.5px solid ${cc}` : `1px solid ${cc}25`,
                background: isA ? cc+"15" : "transparent", color: isA ? cc : cc+"88",
                fontSize:11, fontWeight: isA ? 700 : 500, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.12s" }}>
              {catLabelMap[cat] || cat}
            </button>
          );
        })}
      </div>

      {/* 키워드 태그 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {currentItems.map((kw, i) => (
          <span key={i}
            onClick={() => { sessionStorage.setItem("nper_trend_keyword", kw); setAiMenu("blog_write"); }}
            style={{ padding:"6px 12px", borderRadius:8, background:isDark?"rgba(255,255,255,0.05)":"#fff", border:`1px solid ${border}`,
              fontSize:12, color:homeText, cursor:"pointer", transition:"all 0.12s", display:"inline-flex", alignItems:"center", gap:5 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c; e.currentTarget.style.color = c; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = homeText; }}>
            <span style={{ fontSize:10, fontWeight:800, color: i < 3 ? c : homeMuted }}>{i+1}</span>
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── SNS 자동화 페이지 ──────────────────────────────────────
function SnsAutomationPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu, user, onLoginRequest }) {
  const { t: _t } = useI18n();
  const [step, setStep] = useState(0); // 0: 안내, 1: 설정, 2: 글생성, 3: 발행
  const [keyword, setKeyword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [copied, setCopied] = useState(false);
  const accent = "#7c6aff";
  const green = "#10b981";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const INSTALL_STEPS = [
    {
      title: "Python(파이썬) 설치하기",
      desc: "자동화 프로그램을 실행하려면 Python이라는 프로그램이 필요합니다. 무료이며 1분이면 설치됩니다.",
      details: [
        "아래 링크를 클릭하여 Python 공식 사이트에 접속하세요.",
        "노란색 'Download Python 3.xx' 버튼을 클릭하세요.",
        "다운로드된 파일을 실행하세요.",
        "중요: 설치 화면 하단의 'Add Python to PATH' 체크박스를 반드시 체크한 후 'Install Now'를 클릭하세요.",
        "설치가 완료되면 'Close'를 클릭하세요.",
      ],
      link: { label: "Python 다운로드 페이지 열기", url: "https://www.python.org/downloads/" },
      verify: { label: "설치 확인 방법", steps: ["키보드에서 Win + R 키를 동시에 누르세요.", "'cmd' 입력 후 Enter를 누르세요.", "검은 창이 열리면 아래 명령어를 입력하세요.", "python --version 이라고 나오면 성공입니다."], cmd: "python --version" },
    },
    {
      title: "자동화 도구 설치하기",
      desc: "위에서 열었던 검은 창(명령 프롬프트)에 아래 명령어를 복사해서 붙여넣기하세요.",
      details: [
        _t("clickCopyBtn"),
        "검은 창(명령 프롬프트)에서 마우스 우클릭 → 붙여넣기 하세요.",
        "Enter를 누르면 자동으로 설치됩니다.",
        "설치 완료까지 약 1~2분 소요됩니다. 'Successfully installed' 메시지가 나오면 완료입니다.",
      ],
      cmd: "pip install playwright requests",
    },
    {
      title: "자동화 브라우저 설치하기",
      desc: "같은 검은 창에서 아래 명령어를 실행하세요. 자동 발행에 사용할 브라우저가 설치됩니다.",
      details: [
        _t("clickCopyBtn"),
        "검은 창에 붙여넣기 → Enter를 누르세요.",
        "약 170MB 다운로드가 진행됩니다. 인터넷 속도에 따라 1~3분 소요됩니다.",
        "'Chromium ... downloaded' 메시지가 나오면 설치 완료입니다.",
      ],
      cmd: "playwright install chromium",
    },
  ];

  const generatePost = async () => {
    if (!keyword.trim()) return;
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const { callAI } = await import("./aiClient.js");
      const prompt = `"${keyword}" 주제로 네이버 블로그에 올릴 정보성 글을 작성해주세요.

규칙:
- 6000자 이상, 7~8개 섹션
- 해요체(~요, ~이에요)로 작성
- [TITLE] 제목 (30자 이내)
- [BODY] 본문
- [TAGS] 태그1, 태그2, 태그3 (10개)
- 소제목은 빈 줄로 구분, 마크다운 기호(#, *, -) 사용 금지
- 각 섹션 사이에 [image: 관련키워드] 태그 삽입`;

      const result = await callAI("claude-sonnet-4-5", [{ role: "user", content: prompt }], 6000);
      setGeneratedContent(result);
    } catch (e) {
      setGeneratedContent("ERROR: " + (e.message || "글 생성 실패"));
    }
    setGenerating(false);
  };

  const publishScript = generatedContent ? `# -*- coding: utf-8 -*-
# 메이킷 SNS 자동화 - 네이버 블로그 발행 스크립트
# 사용법: python publish.py

from playwright.sync_api import sync_playwright
import time, os

NAVER_ID = input("네이버 아이디: ")
NAVER_PW = input("네이버 비밀번호: ")

TITLE = """${(generatedContent.match(/\[TITLE\]\s*\n([^\n]+)/) || ["", keyword])[1].replace(/"/g, '\\"')}"""

BODY = """${generatedContent
  .replace(/\[TITLE\]\s*\n[^\n]+\n?/, "")
  .replace(/\[BODY\]\s*\n?/, "")
  .replace(/\[TAGS\]\s*\n?[^\n]*/, "")
  .replace(/\[image:[^\]]+\]/g, "")
  .trim()
  .replace(/"""/g, "'''")
  .slice(0, 8000)}"""

TAGS = "${(generatedContent.match(/\[TAGS\]\s*\n([^\n]+)/) || ["", keyword])[1].replace(/"/g, '')}"

def publish():
    profile_dir = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "MakeitBot", "profile")
    os.makedirs(profile_dir, exist_ok=True)

    with sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="ko-KR",
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        # 1. 로그인
        page.goto("https://nid.naver.com/nidlogin.login", wait_until="domcontentloaded")
        time.sleep(2)

        if "nidlogin" in page.url:
            page.evaluate(f"""([id, pw]) => {{
                const idEl = document.querySelector('#id');
                const pwEl = document.querySelector('#pw');
                if (idEl) {{ idEl.value = id; idEl.dispatchEvent(new Event('input', {{bubbles: true}})); }}
                if (pwEl) {{ pwEl.value = pw; pwEl.dispatchEvent(new Event('input', {{bubbles: true}})); }}
            }}""", [NAVER_ID, NAVER_PW])
            time.sleep(0.5)

            btn = page.query_selector(".btn_login, #log\\\\.login, button[type='submit']")
            if btn: btn.click()

            for _ in range(15):
                time.sleep(1)
                if "nidlogin" not in page.url:
                    print("[OK] 로그인 성공")
                    break
            else:
                print("[!] 로그인 실패 - 캡차/2차인증 확인 후 수동 로그인하세요")
                input("로그인 완료 후 Enter...")

        # 2. 글쓰기 페이지
        page.goto("https://blog.naver.com/" + NAVER_ID + "/postwrite", wait_until="domcontentloaded")
        time.sleep(3)

        # 3. 제목 입력
        title_sel = page.query_selector(".se-documentTitle .se-text-paragraph")
        if title_sel:
            title_sel.click()
            page.keyboard.type(TITLE, delay=30)

        # 4. 본문 입력
        page.keyboard.press("Enter")
        time.sleep(0.5)

        paragraphs = BODY.split("\\n\\n")
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            page.keyboard.type(p, delay=5)
            page.keyboard.press("Enter")
            page.keyboard.press("Enter")
            time.sleep(0.1)

        # 5. 태그 입력
        tag_btn = page.query_selector(".se-tag-label, button[class*='tag']")
        if tag_btn:
            tag_btn.click()
            time.sleep(0.5)
            for tag in TAGS.split(","):
                tag = tag.strip().replace("#", "")
                if tag:
                    tag_input = page.query_selector(".se-tag-input input, input[placeholder*='태그']")
                    if tag_input:
                        tag_input.fill(tag)
                        page.keyboard.press("Enter")
                        time.sleep(0.2)

        print("\\n[완료] 글 작성이 완료되었습니다!")
        print("발행 버튼을 직접 클릭해주세요.")
        input("브라우저를 닫으려면 Enter...")
        ctx.close()

if __name__ == "__main__":
    publish()
` : "";

  const copyScript = () => {
    navigator.clipboard.writeText(publishScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ flex:1, overflow:"auto", padding:"32px 20px", background: isDark ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:720, margin:"0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"inline-block", padding:"5px 14px", borderRadius:20, background:"rgba(124,106,255,0.1)", fontSize:12, fontWeight:700, color:accent, marginBottom:14 }}>
            Beta
          </div>
          <div style={{ fontSize:"clamp(22px,4vw,28px)", fontWeight:900, color:homeText, lineHeight:1.3, marginBottom:8 }}>
            {_t("snsAutomation")}
          </div>
          <div style={{ fontSize:13, color:homeMuted, lineHeight:1.6 }}>
            {_t("snsAutoDesc")}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display:"flex", gap:0, marginBottom:24, borderBottom:`2px solid ${border}` }}>
          {[_t("installGuide"), _t("genAndPublish")].map((label, i) => (
            <button key={i} onClick={() => setStep(i)}
              style={{ padding:"10px 20px", border:"none", borderBottom: step===i ? `3px solid ${accent}` : "3px solid transparent",
                background:"transparent", color: step===i ? accent : homeMuted, fontSize:14, fontWeight: step===i ? 800 : 500,
                cursor:"pointer", transition:"all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 설치 안내 탭 */}
        {step === 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* 안내 배너 */}
            <div style={{ padding:"20px 24px", borderRadius:14, background:`linear-gradient(135deg,${accent}12,#8b5cf612)`, border:`1px solid ${accent}22` }}>
              <div style={{ fontSize:16, fontWeight:800, color:homeText, marginBottom:8 }}>처음이신가요? 걱정 마세요!</div>
              <div style={{ fontSize:13, color:homeMuted, lineHeight:1.8 }}>
                네이버 블로그 자동 발행을 위해 <b style={{color:homeText}}>최초 1회만</b> 아래 3가지를 설치하면 됩니다.<br/>
                모두 <b style={{color:homeText}}>무료</b>이고, 컴퓨터 초보자도 5분이면 완료할 수 있어요.<br/>
                한 번 설치하면 이후에는 바로 자동 발행을 사용할 수 있습니다.
              </div>
            </div>

            {/* 사전 준비: 명령 프롬프트 여는 법 */}
            <div style={{ padding:"18px 20px", borderRadius:12, background:isDark?"rgba(245,158,11,0.06)":"#fffbeb", border:"1px solid rgba(245,158,11,0.15)" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#d97706", marginBottom:10 }}>먼저! 명령 프롬프트 여는 법</div>
              <div style={{ fontSize:13, color:homeMuted, lineHeight:1.8 }}>
                아래 설치 과정에서 "명령 프롬프트"라는 검은 창을 사용합니다.<br/>
                <b style={{color:homeText}}>여는 방법:</b> 키보드에서 <span style={{padding:"2px 8px",borderRadius:4,background:isDark?"rgba(255,255,255,0.1)":"#f1f5f9",fontWeight:700,fontSize:12}}>Win</span> + <span style={{padding:"2px 8px",borderRadius:4,background:isDark?"rgba(255,255,255,0.1)":"#f1f5f9",fontWeight:700,fontSize:12}}>R</span> 동시에 누르기 → <span style={{padding:"2px 8px",borderRadius:4,background:isDark?"rgba(255,255,255,0.1)":"#f1f5f9",fontWeight:700,fontSize:12}}>cmd</span> 입력 → Enter
              </div>
            </div>

            {/* 설치 단계들 */}
            {INSTALL_STEPS.map((s, i) => (
              <div key={i} style={{ padding:"20px 24px", borderRadius:14, background:bg, border:`1px solid ${border}` }}>
                {/* 단계 헤더 */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:accent, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, flexShrink:0 }}>
                    {i+1}
                  </span>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:homeText }}>{s.title}</div>
                    <div style={{ fontSize:12, color:homeMuted, marginTop:2 }}>{s.desc}</div>
                  </div>
                </div>

                {/* 상세 절차 */}
                <div style={{ padding:"14px 18px", borderRadius:10, background:isDark?"rgba(255,255,255,0.02)":"#fafafa", marginBottom:14 }}>
                  {s.details.map((d, di) => (
                    <div key={di} style={{ display:"flex", gap:10, marginBottom: di < s.details.length-1 ? 10 : 0, fontSize:13, color:homeText, lineHeight:1.6 }}>
                      <span style={{ color:accent, fontWeight:700, flexShrink:0 }}>{di+1}.</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>

                {/* 링크 버튼 (Python 다운로드) */}
                {s.link && (
                  <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 20px", borderRadius:10,
                      background:accent, color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none", marginBottom:14 }}>
                    {s.link.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                  </a>
                )}

                {/* 명령어 복사 박스 */}
                {s.cmd && (
                  <div style={{ position:"relative" }}>
                    <div style={{ fontSize:12, color:homeMuted, marginBottom:6, fontWeight:600 }}>
                      {s.link ? "설치 확인용 명령어:" : "아래 명령어를 복사하세요:"}
                    </div>
                    <div style={{ padding:"14px 18px", paddingRight:70, borderRadius:10, background:isDark?"#1a1a2e":"#1e293b", fontFamily:"'Consolas','Monaco','Courier New',monospace", fontSize:14, color:"#e2e8f0", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                      {s.cmd}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(s.cmd); }}
                      style={{ position:"absolute", bottom:10, right:10, padding:"6px 14px", borderRadius:7, border:"none",
                        background:"#7c6aff", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      {_t("copyBtn2")}
                    </button>
                  </div>
                )}

                {/* 설치 확인 */}
                {s.verify && (
                  <div style={{ marginTop:14, padding:"14px 18px", borderRadius:10, background:isDark?"rgba(16,185,129,0.06)":"#f0fdf4", border:"1px solid rgba(16,185,129,0.12)" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:green, marginBottom:8 }}>{s.verify.label}</div>
                    {s.verify.steps.map((vs, vi) => (
                      <div key={vi} style={{ fontSize:12, color:homeMuted, lineHeight:1.7, marginBottom:2 }}>
                        {vi+1}. {vs}
                      </div>
                    ))}
                    <div style={{ marginTop:8, padding:"8px 12px", borderRadius:6, background:isDark?"#1a1a2e":"#1e293b", fontFamily:"monospace", fontSize:13, color:"#e2e8f0" }}>
                      {s.verify.cmd}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 완료 배너 */}
            <div style={{ padding:"20px 24px", borderRadius:14, background:isDark?"rgba(16,185,129,0.06)":"#f0fdf4", border:"1px solid rgba(16,185,129,0.15)", textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:800, color:green, marginBottom:6 }}>설치가 모두 끝났나요?</div>
              <div style={{ fontSize:13, color:homeMuted, marginBottom:14 }}>이제 AI로 글을 생성하고 네이버 블로그에 자동으로 발행할 수 있습니다.</div>
              <button onClick={() => setStep(1)}
                style={{ padding:"14px 40px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${accent},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer" }}>
                글 생성하러 가기
              </button>
            </div>

            {/* FAQ */}
            <div style={{ padding:"18px 20px", borderRadius:12, background:bg, border:`1px solid ${border}` }}>
              <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12 }}>자주 묻는 질문</div>
              {[
                { q: "Python이 뭔가요?", a: "프로그래밍 언어입니다. 자동화 프로그램을 실행하기 위해 필요하며, 설치만 하면 직접 코딩할 필요는 없습니다." },
                { q: "설치 후 컴퓨터가 느려지나요?", a: "아닙니다. 자동 발행할 때만 잠깐 실행되고, 평소에는 컴퓨터에 영향이 없습니다." },
                { q: "'pip'을 찾을 수 없다는 에러가 나요", a: "Python 설치 시 'Add Python to PATH' 체크를 안 한 경우입니다. Python을 삭제 후 다시 설치하면서 반드시 체크해주세요." },
                { q: "맥(Mac)에서도 되나요?", a: "네! 맥에서는 터미널 앱을 열고 동일한 명령어를 입력하면 됩니다." },
              ].map((faq, fi) => (
                <div key={fi} style={{ marginBottom: fi < 3 ? 12 : 0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:homeText, marginBottom:3 }}>{faq.q}</div>
                  <div style={{ fontSize:12, color:homeMuted, lineHeight:1.6 }}>{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 글 생성 & 발행 탭 */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* 키워드 입력 */}
            <div style={{ padding:"18px 20px", borderRadius:12, background:bg, border:`1px solid ${border}` }}>
              <div style={{ fontSize:14, fontWeight:700, color:homeText, marginBottom:12 }}>{_t("topicInput")}</div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={keyword} onChange={e => setKeyword(e.target.value)}
                  placeholder={_t("blogTopicPlaceholder")}
                  onKeyDown={e => e.key === "Enter" && generatePost()}
                  style={{ flex:1, padding:"12px 16px", borderRadius:10, border:`1.5px solid ${border}`, background:"transparent", color:homeText, fontSize:13, outline:"none" }} />
                <button onClick={generatePost} disabled={generating || !keyword.trim()}
                  style={{ padding:"12px 24px", borderRadius:10, border:"none", background:generating ? homeMuted : accent, color:"#fff", fontSize:13, fontWeight:700, cursor: generating ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}>
                  {generating ? _t("aiGenerating") : _t("aiGenBtn")}
                </button>
              </div>
            </div>

            {/* 생성 중 */}
            {generating && (
              <div style={{ textAlign:"center", padding:40, color:homeMuted }}>
                <div style={{ width:36, height:36, border:`3px solid ${border}`, borderTopColor:accent, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
                {_t("aiWritingBlog")}
              </div>
            )}

            {/* 생성 결과 */}
            {generatedContent && !generating && (
              <>
                <div style={{ padding:"18px 20px", borderRadius:12, background:bg, border:`1px solid ${border}` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:homeText }}>{_t("generatedPost")}</span>
                    <span style={{ fontSize:11, color:green, fontWeight:600 }}>{_t("genComplete")}</span>
                  </div>
                  <div style={{ maxHeight:300, overflow:"auto", padding:"12px 14px", borderRadius:8, background:isDark?"#1a1a2e":"#f8fafc", fontSize:12, color:homeMuted, lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                    {generatedContent.slice(0, 2000)}{generatedContent.length > 2000 ? "\n\n" + _t("omitted") : ""}
                  </div>
                </div>

                <div style={{ padding:"18px 20px", borderRadius:12, background:bg, border:`1px solid ${border}` }}>
                  <div style={{ fontSize:14, fontWeight:700, color:homeText, marginBottom:12 }}>{_t("publishToNaver")}</div>
                  <div style={{ fontSize:13, color:homeMuted, lineHeight:1.7, marginBottom:14 }}>
                    아래 발행 스크립트를 복사하여 <code style={{ background:isDark?"rgba(255,255,255,0.06)":"#f1f5f9", padding:"2px 6px", borderRadius:4 }}>publish.py</code>로 저장한 후 실행하세요.
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={copyScript}
                      style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${green},#059669)`, color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer" }}>
                      {copied ? _t("copiedBang") : _t("publishScriptCopy")}
                    </button>
                    <button onClick={() => {
                      const blob = new Blob([publishScript], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "publish.py"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                      style={{ padding:"12px 20px", borderRadius:10, border:`1.5px solid ${green}`, background:"transparent", color:green, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                      .py 다운로드
                    </button>
                  </div>
                  <div style={{ marginTop:14, padding:"12px 14px", borderRadius:8, background:isDark?"rgba(16,185,129,0.06)":"#f0fdf4", border:"1px solid rgba(16,185,129,0.15)", fontSize:12, color:homeMuted, lineHeight:1.7 }}>
                    <b style={{ color:green }}>실행 방법:</b><br/>
                    1. 위 스크립트를 <code>publish.py</code>로 저장<br/>
                    2. 터미널에서 <code>python publish.py</code> 실행<br/>
                    3. 네이버 아이디/비밀번호 입력 → 자동 작성<br/>
                    4. 발행 버튼만 직접 클릭하면 완료
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── 오늘의 키워드 페이지 ──────────────────────────────────────
function TodayKeywordsPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu }) {
  const { t: _t } = useI18n();
  const [keywords, setKeywords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [showTop, setShowTop] = useState(false);
  const scrollRef = useRef(null);
  const accent = "#7c6aff";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          import.meta.env.VITE_SUPABASE_URL || "https://ckzjnpzadeovrasucjmu.supabase.co",
          import.meta.env.VITE_SUPABASE_KEY || ""
        );
        const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const today = kst.toISOString().slice(0, 10);
        setDateStr(today);
        const { data } = await sb.from("daily_keywords").select("*").eq("date", today).single();
        if (data && data.keywords) {
          setKeywords(typeof data.keywords === "string" ? JSON.parse(data.keywords) : data.keywords);
        } else {
          setKeywords(null);
        }
      } catch (e) {
        console.error("키워드 로드 실패:", e);
        setKeywords(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const catColors = {
    "AI 도구": "#6366f1", "AI 트렌드": "#7c3aed", "블로그": "#059669", "유튜브": "#dc2626",
    "인스타": "#e1306c", "틱톡": "#0891b2", "마케팅": "#d97706", "광고": "#2563eb",
    "이커머스": "#0284c7", "부업/수익화": "#0d9488", "트렌드": "#ea580c", "뷰티": "#c026d3",
    "건강/운동": "#16a34a", "여행/맛집": "#e11d48", "재테크": "#9333ea", "자기계발": "#0891b2",
    "AI/테크": "#6366f1", "SNS": "#e1306c", "비즈니스": "#2563eb", "라이프": "#16a34a",
    "기타": "#6b7280",
  };
  const catLabelMapKw = {
    "AI 도구": _t("ai_kwAiTool"), "AI 트렌드": _t("ai_kwAiTrend"), "블로그": _t("ai_kwBlog"), "유튜브": _t("ai_kwYoutube"),
    "인스타": _t("ai_kwInsta"), "틱톡": _t("ai_kwTiktok"), "마케팅": _t("ai_kwMarketing"), "광고": _t("ai_kwAd"),
    "이커머스": _t("ai_kwEcommerce"), "부업/수익화": _t("ai_kwSideJob"), "트렌드": _t("ai_kwTrend"), "뷰티": _t("ai_kwBeauty"),
    "건강/운동": _t("ai_kwHealth"), "여행/맛집": _t("ai_kwTravel"), "재테크": _t("ai_kwFinance"), "자기계발": _t("ai_kwSelfDev"),
    "AI/테크": _t("ai_kwAiTech"), "SNS": _t("ai_kwSns"), "비즈니스": _t("ai_kwBiz"), "라이프": _t("ai_kwLife"),
    "기타": _t("ai_kwOther"),
  };

  // 카테고리별 그룹핑
  const grouped = React.useMemo(() => {
    if (!keywords) return {};
    const g = {};
    keywords.forEach(kw => {
      const cat = kw.category || "기타";
      if (!g[cat]) g[cat] = [];
      g[cat].push(kw);
    });
    return g;
  }, [keywords]);

  const categories = Object.keys(grouped);
  const filtered = activeCat === "all" ? keywords : (grouped[activeCat] || []);

  return (
    <div ref={scrollRef} onScroll={e => setShowTop(e.target.scrollTop > 300)} style={{ flex:1, overflow:"auto", padding:"32px 20px", background: isDark ? "transparent" : "#f4f4f8", position:"relative" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        {/* 헤더 */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"inline-block", padding:"5px 14px", borderRadius:20, background:"rgba(124,106,255,0.1)", fontSize:12, fontWeight:700, color:accent, marginBottom:14 }}>
            {dateStr} {_t("updatedLabel")}
          </div>
          <div style={{ fontSize:"clamp(22px,4vw,30px)", fontWeight:900, color:homeText, lineHeight:1.3, marginBottom:8 }}>
            {_t("todayKeywords")}
          </div>
          <div style={{ fontSize:13, color:homeMuted, lineHeight:1.6 }}>
            {_t("keywordsDesc")}
          </div>
        </div>

        {/* 네이버 쇼핑인사이트 실시간 + 데이터랩 바로가기 */}
        <NaverShoppingInsight isDark={isDark} homeText={homeText} homeMuted={homeMuted} border={border} setAiMenu={setAiMenu} />

        {loading && (
          <div style={{ textAlign:"center", padding:60, color:homeMuted, fontSize:14 }}>
            <div style={{ width:36, height:36, border:`3px solid ${border}`, borderTopColor:accent, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
            {_t("loadingKeywords")}
          </div>
        )}

        {!loading && !keywords && (
          <div style={{ textAlign:"center", padding:60, color:homeMuted }}>
            <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:homeText, marginBottom:6 }}>{_t("noKeywordsYet")}</div>
            <div style={{ fontSize:13 }}>{_t("keywordsUpdateTime")}</div>
          </div>
        )}

        {!loading && keywords && <>
          {/* 카테고리 탭 */}
          <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", flexWrap:"wrap" }}>
            <button onClick={() => setActiveCat("all")}
              style={{ padding:"7px 14px", borderRadius:8, border: activeCat==="all" ? `1.5px solid ${accent}` : `1px solid ${accent}30`,
                background: activeCat==="all" ? accent+"18" : "transparent",
                color: activeCat==="all" ? accent : accent+"88", fontSize:12, fontWeight: activeCat==="all" ? 700 : 500,
                cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0 }}>
              {_t("catAll")} ({keywords.length})
            </button>
            {categories.map(cat => {
              const c = catColors[cat] || "#6b7280";
              const isA = activeCat === cat;
              return (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ padding:"7px 14px", borderRadius:8, border: isA ? `1.5px solid ${c}` : `1px solid ${c}30`,
                    background: isA ? c+"18" : "transparent",
                    color: isA ? c : c+"88", fontSize:12, fontWeight: isA ? 700 : 500,
                    cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0 }}>
                  {catLabelMapKw[cat] || cat} ({(grouped[cat]||[]).length})
                </button>
              );
            })}
          </div>

          {activeCat === "all" ? (
            /* 전체: 카테고리별 섹션 */
            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {categories.map(cat => {
                const c = catColors[cat] || "#6b7280";
                const items = grouped[cat] || [];
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:4, height:20, borderRadius:2, background:c }} />
                      <span style={{ fontSize:15, fontWeight:800, color:homeText }}>{catLabelMapKw[cat] || cat}</span>
                      <span style={{ fontSize:11, color:c, fontWeight:600 }}>{items.length}{_t("itemCount")}</span>
                      <span onClick={() => setActiveCat(cat)} style={{ fontSize:11, color:accent, cursor:"pointer", fontWeight:600, marginLeft:"auto" }}>{_t("viewAllArrow")} &rarr;</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:0, border:`1px solid ${border}`, borderRadius:10, overflow:"hidden" }}>
                      {items.slice(0, 5).map((kw, i) => (
                        <div key={i}
                          style={{ padding:"12px 16px", cursor:"pointer", transition:"background 0.1s", borderBottom: i < Math.min(items.length, 5) - 1 ? `1px solid ${border}` : "none", display:"flex", alignItems:"center", gap:12 }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : c+"06"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          onClick={() => { sessionStorage.setItem("nper_trend_keyword", kw.keyword); setAiMenu("blog_write"); }}>
                          <span style={{ width:22, height:22, borderRadius:6, background:c+"15", color:c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, flexShrink:0 }}>{i+1}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:homeText }}>{kw.keyword}</span>
                          </div>
                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            {kw.platforms && kw.platforms.slice(0,2).map(p => (
                              <span key={p} style={{ fontSize:9, padding:"2px 6px", borderRadius:5, background:c+"10", color:c, fontWeight:600 }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 특정 카테고리 키워드 세로 리스트 */
            (() => {
              const items = grouped[activeCat] || [];
              const c = catColors[activeCat] || "#6b7280";
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:0, border:`1px solid ${border}`, borderRadius:12, overflow:"hidden" }}>
                  {items.map((kw, i) => (
                    <div key={i}
                      style={{ padding:"14px 20px", cursor:"pointer", transition:"background 0.1s", borderBottom: i < items.length - 1 ? `1px solid ${border}` : "none", display:"flex", alignItems:"center", gap:14 }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : c+"06"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      onClick={() => { sessionStorage.setItem("nper_trend_keyword", kw.keyword); setAiMenu("blog_write"); }}>
                      <span style={{ width:24, height:24, borderRadius:6, background:c+"15", color:c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, flexShrink:0 }}>{i+1}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:3 }}>{kw.keyword}</div>
                        <div style={{ fontSize:12, color:homeMuted, lineHeight:1.6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{kw.reason}</div>
                      </div>
                      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                        {kw.platforms && kw.platforms.map(p => (
                          <span key={p} style={{ fontSize:9, padding:"2px 7px", borderRadius:5, background:c+"12", color:c, fontWeight:600 }}>{p}</span>
                        ))}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={homeMuted} strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,opacity:0.3}}><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </>}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {showTop && (
        <button onClick={() => scrollRef.current?.scrollTo({ top:0, behavior:"smooth" })}
          style={{ position:"fixed", bottom:32, right:32, width:46, height:46, borderRadius:"50%", border:"none",
            background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:18, cursor:"pointer",
            boxShadow:"0 4px 16px rgba(124,106,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center",
            transition:"opacity 0.2s, transform 0.2s", zIndex:20 }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      )}
    </div>
  );
}

// ── 트렌드 키워드 섹션 ──────────────────────────────────────
function TrendKeywords({ isDark, homeText, homeMuted, cardBdr, setAiMenu, _s: _sProp }) {
  const { t: _s, lang } = useI18n();
  const [trendPlatform, setTrendPlatform] = useState(0);
  const accent_ = "#7c6aff";
  const trendPlatformsData = {
    ko: [
      { name:_s("ai_trendInsta"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
        keywords:["릴스 알고리즘 2026","인스타 팔로워 늘리기","인스타 해시태그 전략","숏폼 콘텐츠 제작","인스타 쇼핑 태그"] },
      { name:_s("ai_trendYoutube"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>,
        keywords:["유튜브 쇼츠 수익화","썸네일 디자인 팁","유튜브 SEO 최적화","구독자 1000명 전략","유튜브 스튜디오 분석"] },
      { name:_s("ai_trendNaver"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7h3l2 5 2-5h3v10h-2.5V11l-2 4h-1l-2-4v6H8V7z"/></svg>,
        keywords:["블로그 상위노출 2026","체험단 마케팅 전략","키워드 분석 도구","블로그 수익화 방법","네이버 플레이스 최적화"] },
      { name:_s("ai_trendTiktok"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v14a4 4 0 1 1-3-3.87"/><path d="M19 2v4c-3 0-5-2-5-4"/></svg>,
        keywords:["틱톡 알고리즘 공략","틱톡 쇼핑 라이브","틱톡 광고 세팅법","바이럴 챌린지 기획","틱톡 크리에이터 펀드"] },
      { name:_s("ai_trendThreads"), icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8c2.5 0 4 1.5 4 4s-1.5 4-4 4-4-1.5-4-4"/></svg>,
        keywords:["스레드 팔로워 전략","스레드 vs X 비교","스레드 마케팅 활용법","텍스트 콘텐츠 기획","스레드 알고리즘 이해"] },
    ],
    en: [
      { name:"Instagram", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
        keywords:["Reels algorithm 2026","Grow Instagram followers","Hashtag strategy","Short-form content tips","Instagram shopping tags"] },
      { name:"YouTube", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>,
        keywords:["YouTube Shorts monetization","Thumbnail design tips","YouTube SEO optimization","1K subscriber strategy","YouTube Studio analytics"] },
      { name:"Blog", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7h3l2 5 2-5h3v10h-2.5V11l-2 4h-1l-2-4v6H8V7z"/></svg>,
        keywords:["Blog SEO ranking 2026","Review marketing strategy","Keyword analysis tools","Blog monetization","Local SEO optimization"] },
      { name:"TikTok", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v14a4 4 0 1 1-3-3.87"/><path d="M19 2v4c-3 0-5-2-5-4"/></svg>,
        keywords:["TikTok algorithm guide","TikTok Shop Live","TikTok ads setup","Viral challenge ideas","TikTok Creator Fund"] },
      { name:"Threads", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8c2.5 0 4 1.5 4 4s-1.5 4-4 4-4-1.5-4-4"/></svg>,
        keywords:["Threads follower strategy","Threads vs X comparison","Threads marketing tips","Text content planning","Threads algorithm guide"] },
    ],
  };
  const trendPlatforms = trendPlatformsData[lang] || trendPlatformsData[lang === "ja" || lang === "zh" ? "en" : "ko"] || trendPlatformsData.en;
  const tp = trendPlatforms[trendPlatform];
  return (
    <div style={{ maxWidth:540, margin:"0 auto 32px", textAlign:"left" }}>
      <div style={{ fontSize:15, fontWeight:800, color:homeText, marginBottom:14, textAlign:"center" }}>
        {_s("trendKeywords")}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", justifyContent:"center" }}>
        {trendPlatforms.map((p, pi) => (
          <button key={p.name} onClick={() => setTrendPlatform(pi)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:20,
              border: trendPlatform===pi ? `1.5px solid ${accent_}` : `1px solid ${cardBdr}`,
              background: trendPlatform===pi ? (isDark?"rgba(124,106,255,0.15)":"rgba(124,106,255,0.06)") : (isDark?"rgba(255,255,255,0.04)":"#fff"),
              color: trendPlatform===pi ? accent_ : homeMuted,
              fontSize:12, fontWeight: trendPlatform===pi ? 700 : 500, cursor:"pointer", transition:"all 0.15s" }}>
            <span style={{ display:"flex", alignItems:"center" }}>{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
        {tp.keywords.map(kw => (
          <button key={kw} onClick={() => {
            sessionStorage.setItem("nper_trend_keyword", kw);
            setAiMenu("blog_write");
          }}
            style={{ padding:"8px 16px", borderRadius:20, border:`1px solid ${cardBdr}`,
              background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
              color: homeText, fontSize:12, fontWeight:600, cursor:"pointer",
              transition:"all 0.15s", boxShadow:"0 1px 4px rgba(0,0,0,0.03)" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=accent_; e.currentTarget.style.color=accent_; e.currentTarget.style.background=isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.04)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=cardBdr; e.currentTarget.style.color=homeText; e.currentTarget.style.background=isDark?"rgba(255,255,255,0.05)":"#fff"; }}>
            # {kw}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 콘텐츠 리퍼포징 (원소스 멀티유즈) ──────────────────────────────────────
function AiContent({ aiMenu, user, setAiMenu, navigate, navigateBoard, navigateAi, C, theme, onLoginRequest, onUserUpdate, showPointConfirm, setSideOpen }) {
  const isDark = theme === "dark";
  const homeText  = isDark ? "#fff"                   : "#1a1a2e";
  const homeMuted = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const cardBdr   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardDescC = isDark ? "rgba(255,255,255,0.4)"  : "#888";

  const { t: tt } = useI18n();
  const { lang: _lang } = useI18n();
  const isKo = _lang === "ko";
  const _s = (ko, en) => isKo ? ko : en;

  function AiFooter() { return null; }

  // 글쓰기 탭 state (sessionStorage 기반 → React state로 전환)
  const [writeTabState, setWriteTabState] = useState(() => { try { return sessionStorage.getItem("_blog_write_tab") || "manual"; } catch { return "manual"; } });

  // AI도구 홈 검색 state
  const [homeSearch, setHomeSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // 뉴스레터 구독 state (조건부 렌더링 밖에 선언 — React hooks 규칙)
  const [nlEmail, setNlEmail] = React.useState("");
  const [nlSent, setNlSent] = React.useState(false);
  // 온보딩 state (조건부 호출 방지)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 보관함
  if (aiMenu === "library") {
    return <LibraryPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} cardDescC={cardDescC} setAiMenu={setAiMenu} renderFooter={() => <AiFooter />} user={user} />;
  }

  // 바형 헤더 공용
  function BarHeader({ title, subtitle }) { return (
    <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"#e5e7eb"}` }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"12px 24px", display:"flex", alignItems:"center", gap:10 }}>
        <button className="ai-sidebar-mobile" onClick={() => setSideOpen(true)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", color: isDark?"#a5b4fc":"#7c6aff", display:"none", alignItems:"center", flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:900, color:homeText, marginBottom:2 }}>{title}</div>
          <div style={{ fontSize:11, color:homeMuted }}>{subtitle}</div>
        </div>
      </div>
    </div>
  ); }

  // ── 공통 도구 헤더 (아이콘 + 제목 + 뒤로가기) ──
  const TOOL_INFO = {
    // 글쓰기
    blog_naver:   { icon:"/icon-naver-blog.png", label:tt("labelNaverBlog") || tt("naverBlog"), parent:"blog_write" },
    blog_cafe:    { icon:"/icon-naver-cafe.webp", label:tt("naverCafe"), parent:"blog_write" },
    blog_tistory: { icon:"/icon-tistory.png", label:tt("tistory"), parent:"blog_write" },
    blog_insta:   { icon:"/icon-instagram.webp", label:tt("instaCap"), parent:"blog_write" },
    blog_thread:  { icon:"/icon-threads.png", label:tt("thread"), parent:"blog_write" },
    blog_link:    { icon:"/icon-youtube.png", label:tt("ytBlog"), parent:"blog_write" },
    blog_news:    { icon:"/icons3d/news.png", label:tt("newsBlog"), parent:"blog_write" },
    blog_yt_blog: { icon:"/icon-youtube.png", label:tt("ytBlog"), parent:"blog_write" },
    // 콘텐츠 제작
    detail_simple:   { icon:"/icons3d/memo.png", label:tt("toolDetailPage"), parent:"content_create" },
    // 이미지
    product_shot:  { icon:"/icons3d/camera.png", label:tt("toolProductShot"), parent:"image_tools" },
    logo_gen:      { icon:"/icons3d/palette.png", label:tt("toolLogo"), parent:"image_tools" },
    mockup_gen:    { icon:"/icons3d/sns-app.png", label:tt("toolMockup"), parent:"image_tools" },
    model_gen:     { icon:"/icons3d/char-standing.png", label:tt("toolModel"), parent:"image_tools" },
    skin_retouch:  { icon:"/icons3d/thumbsup.png", label:tt("toolSkinRetouch"), parent:"image_tools" },
    face_swap:     { icon:"/icons3d/char-headphone.png", label:tt("toolFaceSwap2"), parent:"image_tools" },
    outfit_swap:   { icon:"/icons3d/char-scarf.png", label:tt("toolOutfitSwap2"), parent:"image_tools" },
    outpaint:      { icon:"/icons3d/cloud-upload.png", label:tt("toolOutpaint2"), parent:"image_tools" },
    // 비즈니스 문서
    prompt_studio_make: { icon:"/icons3d/report.png", label:tt("bizDoc"), parent:"prompt_studio" },
    // 직접 디자인
    canvas_direct_: { icon:"/icons3d/palette.png", label:tt("directDesign"), parent:"content_create" },
  };

  // 도구별 헤더 정보 (i18n 적용)
  const { t: tt2 } = useI18n();
  const TOOL_HEADERS = {
    blog_write:    { badge: tt2("toolBlogBadge"), title: tt2("toolBlogTitle"), desc: tt2("toolBlogDesc") },
    blog_naver:    { badge: tt2("toolBlogBadge"), title: tt2("toolBlogTitle"), desc: tt2("toolBlogDesc") },
    shorts_create: { badge: tt2("sideVideo"), title: tt2("toolBlogTitle").replace(tt2("toolBlogBadge"), tt2("sideVideo")), desc: tt2("toolBlogDesc") },
  };
  const imgSiblings = [
    {id:"product_shot",label:tt2("productShot")},{id:"logo_gen",label:tt2("logoGen")},{id:"mockup_gen",label:tt2("mockupGen")},
    {id:"model_gen",label:tt2("modelGen")},{id:"skin_retouch",label:tt2("toolSkinBadge")},{id:"face_swap",label:tt2("faceSwap")},
    {id:"outfit_swap",label:tt2("outfitSwap")},{id:"outpaint",label:tt2("outpaint")}
  ];
  Object.assign(TOOL_HEADERS, {
    product_shot:  { badge: tt2("toolProductBadge"), title: tt2("toolProductTitle"), desc: tt2("toolProductDesc"), siblings: imgSiblings },
    logo_gen:      { badge: tt2("toolLogoBadge"), title: tt2("toolLogoTitle"), desc: tt2("toolLogoDesc"), siblings: imgSiblings },
    mockup_gen:    { badge: tt2("toolMockupBadge"), title: tt2("toolMockupTitle"), desc: tt2("toolMockupDesc"), siblings: imgSiblings },
    model_gen:     { badge: tt2("toolModelBadge"), title: tt2("toolModelTitle"), desc: tt2("toolModelDesc"), siblings: imgSiblings },
    skin_retouch:  { badge: tt2("toolSkinBadge"), title: tt2("toolSkinTitle"), desc: tt2("toolSkinDesc"), siblings: imgSiblings },
    face_swap:     { badge: tt2("toolFaceBadge"), title: tt2("toolFaceTitle"), desc: tt2("toolFaceDesc"), siblings: imgSiblings },
    outfit_swap:   { badge: tt2("toolOutfitBadge"), title: tt2("toolOutfitTitle"), desc: tt2("toolOutfitDesc"), siblings: imgSiblings },
    outpaint:      { badge: tt2("toolOutpaintBadge"), title: tt2("toolOutpaintTitle"), desc: tt2("toolOutpaintDesc"), siblings: imgSiblings },
    yt_analyzer:   { badge: tt2("toolYtBadge"), title: tt2("toolYtTitle"), desc: tt2("toolYtDesc") },
  });
  // 자체 헤더가 있는 도구는 ToolHeader 건너뜀
  const SELF_HEADER_TOOLS = ["detail_simple", "detail_simple_img"];
  function ToolHeader({ menuId }) {
    if (SELF_HEADER_TOOLS.includes(menuId)) return null;
    const h = TOOL_HEADERS[menuId] || TOOL_HEADERS[menuId?.replace("_make","")];
    if (!h) return null;
    return (
      <div style={{ padding:"36px 24px 0" }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ display:"inline-block", padding:"5px 14px", borderRadius:20, background:"rgba(124,106,255,0.1)", fontSize:12, fontWeight:700, color:"#7c6aff", marginBottom:14 }}>{h.badge}</div>
          <div style={{ fontSize:"clamp(24px,5vw,32px)", fontWeight:900, color: isDark?"#fff":"#1a1a1a", lineHeight:1.3, marginBottom:8, whiteSpace:"pre-line" }}>{h.title}</div>
          <div style={{ fontSize:14, color: isDark?"rgba(255,255,255,0.5)":"#888", lineHeight:1.6, marginBottom: h.siblings ? 20 : 0 }}>{h.desc}</div>
          {/* 이미지 도구 드롭다운 — 같은 카테고리 내 다른 기능 이동 */}
          {h.siblings && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:16, marginBottom:8 }}>
              {h.siblings.map(s => (
                <button key={s.id} onClick={() => setAiMenu(s.id)}
                  style={{ padding:"8px 16px", borderRadius:10, border:`1.5px solid ${menuId === s.id ? "#7c6aff" : (isDark?"rgba(255,255,255,0.1)":"#e5e7eb")}`, background: menuId === s.id ? (isDark?"rgba(124,106,255,0.12)":"rgba(124,106,255,0.06)") : "transparent", cursor:"pointer", fontSize:12, fontWeight: menuId === s.id ? 700 : 500, color: menuId === s.id ? "#7c6aff" : (isDark?"rgba(255,255,255,0.5)":"#888"), transition:"all 0.15s" }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 도구 래퍼 (헤더 + 콘텐츠 통으로 스크롤) ──
  function ToolWrap({ menuId, children }) { return (
    <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f4f4f8" }}>
      <ToolHeader menuId={menuId} />
      {children}
    </div>
  ); }

  // 비즈니스 문서: 하위 도구 직접 진입
  if (aiMenu === "prompt_studio_make") {
    return (
      <ToolWrap menuId="prompt_studio_make">
        <PromptStudioPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} setAiMenu={setAiMenu} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} theme={theme} renderFooter={() => <AiFooter />} noHeader />
      </ToolWrap>
    );
  }

  // 비즈니스 문서: 선택 화면
  if (aiMenu === "prompt_studio") {
    const docItems = [
      { category: tt("docBiz"), items: [
        { id:"prompt_studio_make", docType:"proposal",    icon:"📋", label:tt("docProposal"), desc:tt("docProposalDesc") },
        { id:"prompt_studio_make", docType:"bizplan",     icon:"📊", label:tt("docBizPlan"), desc:tt("docBizPlanDesc") },
        { id:"prompt_studio_make", docType:"ppt_outline", icon:"📑", label:tt("docPpt"), desc:tt("docPptDesc") },
        { id:"prompt_studio_make", docType:"report",      icon:"📝", label:tt("docReport"), desc:tt("docReportDesc") },
      ]},
      { category: tt("docWork"), items: [
        { id:"prompt_studio_make", docType:"planner",  icon:"📅", label:tt("docPlanner"), desc:tt("docPlannerDesc") },
        { id:"prompt_studio_make", docType:"meeting",  icon:"📃", label:tt("docMeeting"), desc:tt("docMeetingDesc") },
        { id:"prompt_studio_make", docType:"email",    icon:"✉️", label:tt("docEmail"), desc:tt("docEmailDesc") },
        { id:"prompt_studio_make", docType:"contract", icon:"📜", label:tt("docContract"), desc:tt("docContractDesc") },
      ]},
      { category: tt("docMessage"), items: [
        { id:"prompt_studio_make", docType:"congrats",   icon:"🎉", label:tt("docCongrats"), desc:tt("docCongratsDesc") },
        { id:"prompt_studio_make", docType:"condolence", icon:"💐", label:tt("docCondolence"), desc:tt("docCondolenceDesc") },
        { id:"prompt_studio_make", docType:"speech",     icon:"🎤", label:tt("docSpeech"), desc:tt("docSpeechDesc") },
        { id:"prompt_studio_make", docType:"invite",     icon:"💌", label:tt("docInvite"), desc:tt("docInviteDesc") },
      ]},
    ];
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f8f9fb" }}>
          <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 60px" }}>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>{tt("whatDocCreate")}</div>
              <div style={{ fontSize:13, color:homeMuted }}>{tt("docSelectDesc")}</div>
            </div>
            {/* 최근 문서 */}
            {(() => {
              try {
                const plans = JSON.parse(localStorage.getItem("nper_plans_v1")||"[]").slice(0,4);
                if (plans.length === 0) return null;
                return (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>{tt("recentDocs")}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                      {plans.map((p, i) => (
                        <button key={i} onClick={() => setAiMenu("prompt_studio_make")}
                          style={{ padding:"12px 14px", borderRadius:12, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#7c6aff"}
                          onMouseLeave={e => e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}>
                          <div style={{ fontSize:12, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title || p.topic || tt("untitled")}</div>
                          <div style={{ fontSize:10, color:homeMuted, marginTop:3 }}>{p.docType || tt("ai_doc")} · {p.date || ""}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}
            {docItems.map(cat => (
              <div key={cat.category} style={{ marginBottom:28 }}>
                <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>{cat.category}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                  {cat.items.map((item, idx) => (
                    <button key={idx} onClick={() => { if (item.docType) sessionStorage.setItem("_prompt_doctype", item.docType); setAiMenu(item.id); }}
                      style={{
                        padding:"20px 14px", borderRadius:14, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`,
                        background: isDark ? "rgba(255,255,255,0.04)" : "#fff", cursor:"pointer",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                        transition:"all 0.15s", textAlign:"center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="#7c6aff"; e.currentTarget.style.boxShadow="0 4px 16px rgba(124,106,255,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"; e.currentTarget.style.boxShadow="none"; }}>
                      <span style={{ fontSize:32 }}>{item.icon}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:homeText }}>{item.label}</span>
                      <span style={{ fontSize:11, color:homeMuted }}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // 오늘의 키워드
  if (aiMenu === "today_keywords") {
    return <TodayKeywordsPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} setAiMenu={setAiMenu} />;
  }

  if (aiMenu === "sns_consulting") {
    return <SnsConsulting isDark={isDark} user={user} />;
  }

  // SNS 뉴스 + 뉴스레터 구독
  if (aiMenu === "hot_keyword") {
    const handleNewsletterSub = async () => {
      if (!nlEmail || !nlEmail.includes("@")) { alert(tt("validEmailPlease")); return; }
      try {
        const sb = (await import("@supabase/supabase-js")).createClient(
          import.meta.env.VITE_SUPABASE_URL || "https://ckzjnpzadeovrasucjmu.supabase.co",
          import.meta.env.VITE_SUPABASE_KEY || ""
        );
        await sb.from("newsletter_subscribers").upsert({ email: nlEmail, subscribed_at: new Date().toISOString(), source: "sns_news" }, { onConflict: "email" });
        setNlSent(true);
      } catch (e) { console.error("Newsletter sub error:", e); alert(tt("subError")); }
    };
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background: isDark ? "transparent" : "#f4f4f8" }}>
        {/* 상단 헤더 + 뉴스레터 구독 */}
        <div style={{ flexShrink:0, padding:"36px 24px 28px" }}>
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <div style={{ display:"inline-block", padding:"5px 14px", borderRadius:20, background:"rgba(239,68,68,0.1)", fontSize:12, fontWeight:700, color:"#ef4444", marginBottom:14 }}>SNS 뉴스</div>
            <div style={{ fontSize:"clamp(24px,5vw,32px)", fontWeight:900, color: isDark?"#fff":"#1a1a1a", lineHeight:1.3, marginBottom:6, whiteSpace:"pre-line" }}>{tt("snsNewsHeader")}</div>
            <div style={{ fontSize:13, color: isDark?"rgba(255,255,255,0.5)":"#999", marginBottom:20 }}>{tt("snsNewsSubtitle")}</div>
            {/* 뉴스레터 구독 */}
            {nlSent ? (
              <div style={{ padding:"14px 20px", borderRadius:12, background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", fontSize:13, fontWeight:600, color:"#10b981" }}>
                {tt("subscribed")}
              </div>
            ) : (
              <div style={{ display:"flex", gap:8 }}>
                <input value={nlEmail} onChange={e => setNlEmail(e.target.value)} placeholder={tt("emailPlaceholder")}
                  style={{ flex:1, padding:"12px 16px", borderRadius:10, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:isDark?"rgba(255,255,255,0.06)":"#fff", color:isDark?"#fff":"#1a1a1a", fontSize:13, outline:"none" }}
                  onKeyDown={e => e.key === "Enter" && handleNewsletterSub()} />
                <button onClick={handleNewsletterSub}
                  style={{ padding:"12px 24px", borderRadius:10, border:"none", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                  {tt("subscribeBtn")}
                </button>
              </div>
            )}
          </div>
        </div>
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
    // cardnews_simple 아이콘 제거됨
    detail_simple: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    // thumbnail_gen 아이콘 제거됨
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

  // 이용방법 (영상 갤러리)
  if (aiMenu === "video_guide") {
    return <VideoGuidePage C={C} theme={theme} />;
  }

  // 홈
  if (!aiMenu || aiMenu === "home") {
    // 홈 = 통합 검색창 (BlogGenerator embedded)
    return (
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <BlogGenerator embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} setAiMenu={setAiMenu} />
      </div>
    );
  }

  /* ── 이전 홈 화면 코드 제거됨 (통합 검색창으로 대체) ── */

  // ── 블로그 도구 메뉴 ──
  if (aiMenu === "blog_link" || aiMenu === "blog_link_intro") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform="link_youtube" />;
  }
  if (aiMenu === "blog_news" || aiMenu === "blog_news_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultTab="news" />;
  }
  if (aiMenu === "blog_yt_blog" || aiMenu === "blog_yt_blog_intro") {
    return <LinkBlogCombined theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultTab="youtube" />;
  }
  if (aiMenu === "blog_cafe_intro" || aiMenu === "blog_cafe" || aiMenu === "blog_cafe_make") {
    return <ToolWrap menuId="blog_write"><UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform="blog_cafe" /></ToolWrap>;
  }
  if (aiMenu.startsWith("blog_") && aiMenu !== "blog_write") {
    return <ToolWrap menuId="blog_write"><UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform={aiMenu} /></ToolWrap>;
  }

  // 글쓰기 → 홈으로 (홈이 통합 검색창)
  if (aiMenu === "blog_write") {
    setAiMenu("home"); return null;
  }
  if (aiMenu === "_blog_write_old_unused") {
    const writeItems = [];
    const tabStyle = (active) => ({
      flex:1, padding:"12px 0", borderRadius:12, border:"none", cursor:"pointer",
      background: active ? "#7c6aff" : "transparent",
      color: active ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "#888"),
      fontSize:14, fontWeight:700, transition:"all 0.15s",
    });
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f8f9fb" }}>
          <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 24px 60px" }}>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>글쓰기</div>
              <div style={{ fontSize:13, color:homeMuted }}>AI가 글을 작성하고 원하는 플랫폼에 발행합니다</div>
            </div>
            {/* 수동/자동 탭 */}
            <div style={{ display:"flex", gap:4, padding:4, borderRadius:14, background: isDark ? "rgba(255,255,255,0.06)" : "#e8e8f0", marginBottom:28 }}>
              <button onClick={() => setWriteTab("manual")} style={tabStyle(!isAutoTab)}>
                수동발행
              </button>
              <button onClick={() => setWriteTab("auto")} style={tabStyle(isAutoTab)}>
                자동발행
              </button>
            </div>
            {/* 자동발행 탭 → AutoPublisher 렌더 */}
            {isAutoTab ? (
              <AutoPublisher theme={theme} user={user} onLoginRequest={onLoginRequest} embedded />
            ) : (
              <>
                {/* 최근 글 */}
                {(() => {
                  try {
                    const blogs = JSON.parse(localStorage.getItem("sns_blog_saves_v1")||"[]").slice(0,4);
                    if (blogs.length === 0) return null;
                    return (
                      <div style={{ marginBottom:28 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>최근 작성한 글</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                          {blogs.map((b, i) => (
                            <button key={i} onClick={() => setAiMenu(b.platform || "blog_naver")}
                              style={{ padding:"12px 14px", borderRadius:12, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
                              onMouseEnter={e => e.currentTarget.style.borderColor="#7c6aff"}
                              onMouseLeave={e => e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}>
                              <div style={{ fontSize:12, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.title || b.topic || tt("untitled")}</div>
                              <div style={{ fontSize:10, color:homeMuted, marginTop:3 }}>{b.platform_label || b.type || ""} · {b.date || ""}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}
                {writeItems.map(cat => (
                  <div key={cat.category} style={{ marginBottom:28 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>{cat.category}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                      {cat.items.map(item => (
                        <button key={item.id} onClick={() => setAiMenu(item.id)}
                          style={{
                            padding:"20px 14px", borderRadius:14, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`,
                            background: isDark ? "rgba(255,255,255,0.04)" : "#fff", cursor:"pointer",
                            display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                            transition:"all 0.15s", textAlign:"center",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#7c6aff"; e.currentTarget.style.boxShadow="0 4px 16px rgba(124,106,255,0.12)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"; e.currentTarget.style.boxShadow="none"; }}>
                          {item.icon ? <img src={item.icon} alt="" loading="lazy" decoding="async" style={{ width:32, height:32, borderRadius:6, objectFit:"contain" }} /> : <span style={{ fontSize:32 }}>{item.emoji}</span>}
                          <span style={{ fontSize:13, fontWeight:700, color:homeText }}>{item.label}</span>
                          <span style={{ fontSize:11, color:homeMuted }}>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 보관함에서 심플 카드뉴스 열기

  // 보관함에서 심플 상세페이지 열기
  if (aiMenu === "detail_simple_open") {
    return (
      <div key="detail_simple_open" style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} openFromLibrary  onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
      </div>
    );
  }

  // ── 콘텐츠 제작: 하위 도구 직접 진입 ──
  if (aiMenu === "cardnews_simple" || aiMenu === "cardnews_simple_make") {
    return (
      <ToolWrap menuId="cardnews_simple">
        <CardNewsApp embedded theme={theme} user={user} initialSubPage={aiMenu === "cardnews_simple_make" ? "make" : "home"} />
      </ToolWrap>
    );
  }
  if (aiMenu === "detail_simple" || aiMenu === "detail_simple_make") {
    return <ToolWrap menuId="detail_simple"><DetailPageStudio isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} C={C} /></ToolWrap>;
  }
  if (aiMenu === "detail_simple_img") {
    return <ToolWrap menuId="detail_simple_img"><SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} imageMode /></ToolWrap>;
  }
  // thumbnail_gen, ppt_gen 렌더링 제거됨

  // ── 보관함에서 템플릿 열기 ──
  if (aiMenu === "cardnews_simple_open") {
    let openData = null;
    try { openData = JSON.parse(localStorage.getItem("nper_open_card") || "null"); } catch {}
    const UnifiedCanvasEditorLazy = React.lazy(() => import("./UnifiedCanvasEditor"));
    return (
      <ToolWrap menuId="cardnews_simple">
        <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>Loading...</div>}>
          <UnifiedCanvasEditorLazy
            slides={openData?.slides || [{ title:"", body:"", bgColor:"#ffffff", textColor:"#111827", fontSize:42, fontFamily:"Pretendard", image:null }]}
            width={1080} height={1080} mode="cardnews"
            presetKey={openData?.gs?.key} presetLabel={openData?.gs?.label}
            onSave={() => {}} onClose={() => setAiMenu("home")}
            inline
          />
        </React.Suspense>
      </ToolWrap>
    );
  }

  // ── 콘텐츠 제작: 직접 디자인 (빈 캔버스 바로 진입) ──
  if (aiMenu.startsWith("canvas_direct_")) {
    const m = aiMenu.replace("canvas_direct_","").split("x");
    const cw = parseInt(m[0])||1080, ch = parseInt(m[1])||1080;
    const UnifiedCanvasEditorLazy = React.lazy(() => import("./UnifiedCanvasEditor"));
    return (
      <ToolWrap menuId="cardnews_simple">
        <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>Loading...</div>}>
          <UnifiedCanvasEditorLazy
            slides={[{ title:"", body:"", bgColor:"#ffffff", textColor:"#111827", fontSize:42, fontFamily:"Pretendard", image:null }]}
            width={cw} height={ch} mode="cardnews"
            onSave={() => {}} onClose={() => setAiMenu("content_create")}
            inline
          />
        </React.Suspense>
      </ToolWrap>
    );
  }

  // ── 콘텐츠 제작: 선택 화면 (미리캔버스 스타일 - 탭+접이식) ──
  // 상세페이지 리뉴얼 전 비활성화 — content_create 접근 시 홈으로
  if (aiMenu === "content_create") {
    setAiMenu("home"); return null;
  }

  // ── 이미지: 하위 도구 직접 진입 ──
  if (aiMenu === "product_shot") return <ToolWrap menuId="product_shot"><ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "logo_gen") return <ToolWrap menuId="logo_gen"><LogoGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "mockup_gen") return <ToolWrap menuId="mockup_gen"><MockupGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "model_gen" || aiMenu === "model_gen_make") return <ToolWrap menuId="model_gen"><ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "skin_retouch") return <ToolWrap menuId="skin_retouch"><SkinRetouchGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "face_swap" || aiMenu === "face_swap_make") return <ToolWrap menuId="face_swap"><FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "outfit_swap" || aiMenu === "outfit_swap_make") return <ToolWrap menuId="outfit_swap"><OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;
  if (aiMenu === "outpaint" || aiMenu === "outpaint_make") return <ToolWrap menuId="outpaint"><OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} onMenuChange={setAiMenu} /></ToolWrap>;

  // ── 이미지: 선택 화면 (이미지 생성 + 수정 통합) ──
  if (aiMenu === "image_tools" || aiMenu === "image_create" || aiMenu === "image_edit") {
    // 바로 제품컷으로 진입
    setAiMenu("product_shot"); return null;
  }
  if (aiMenu === "_image_tools_old_unused") {
    const imgItems = [];
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f8f9fb" }}>
          <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 60px" }}>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>어떤 이미지 작업을 할까요?</div>
              <div style={{ fontSize:13, color:homeMuted }}>AI로 이미지를 생성하거나 수정하세요</div>
            </div>
            {imgItems.map(cat => (
              <div key={cat.category} style={{ marginBottom:28 }}>
                <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>{cat.category}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                  {cat.items.map(item => (
                    <button key={item.id} onClick={() => setAiMenu(item.id)}
                      style={{
                        padding:"20px 14px", borderRadius:14, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`,
                        background: isDark ? "rgba(255,255,255,0.04)" : "#fff", cursor:"pointer",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                        transition:"all 0.15s", textAlign:"center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="#7c6aff"; e.currentTarget.style.boxShadow="0 4px 16px rgba(124,106,255,0.12)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"; e.currentTarget.style.boxShadow="none"; }}>
                      <img src={item.img} alt="" loading="lazy" decoding="async" style={{ width:40, height:40, objectFit:"contain" }} />
                      <span style={{ fontSize:13, fontWeight:700, color:homeText }}>{item.label}</span>
                      <span style={{ fontSize:11, color:homeMuted }}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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

  // 회원정보
  if (aiMenu === "profile") {
    if (!user) return null;
    const nick = user.nick || user.email?.split("@")[0] || "User";
    const initial = nick[0]?.toUpperCase() || "U";
    const dateLoc = _lang === "ja" ? "ja-JP" : _lang === "zh" ? "zh-CN" : _lang === "en" ? "en-US" : "ko-KR";
    const joinDate = user.joinDate ? new Date(user.joinDate).toLocaleDateString(dateLoc) : "-";
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString(dateLoc) : "-";
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
              {user.role==="admin" ? tt("roleAdmin") : tt("roleNormal")}
            </div>
          </div>
          {/* 포인트 */}
          <div style={{ borderRadius:14, border:`1px solid #7c6aff20`, background:"rgba(99,102,241,0.06)", padding:"18px 20px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:12, color:isDark?"rgba(255,255,255,0.5)":"#888", marginBottom:2 }}>{tt("heldCredits")}</div>
                <div style={{ fontSize:28, fontWeight:900, color:"#a5b4fc" }}>{pts.toLocaleString()} <span style={{ fontSize:14 }}>P</span></div>
              </div>
              <button onClick={() => navigate("pricing")}
                style={{ padding:"10px 20px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:800 }}>
                {tt("chargeBtn")}
              </button>
            </div>
          </div>
          {/* 계정 정보 */}
          <div style={{ borderRadius:14, border:`1px solid ${bdr2}`, background:card2, overflow:"hidden", marginBottom:12 }}>
            {[
              { label:tt("joinDateLabel"), value: joinDate },
              { label:tt("lastLoginLabel"), value: lastLogin },
              { label:tt("emailLabel"), value: user.email },
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
            {tt("logoutBtn")}
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

  // 자동발행
  if (aiMenu === "auto_publish") {
    return (
      <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ padding:"36px 24px 28px" }}>
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <div style={{ display:"inline-block", padding:"5px 14px", borderRadius:20, background:"rgba(16,185,129,0.1)", fontSize:12, fontWeight:700, color:"#10b981", marginBottom:14 }}>{tt("autoWriteBadge")}</div>
            <div style={{ fontSize:"clamp(24px,5vw,32px)", fontWeight:900, color: isDark?"#fff":"#1a1a1a", lineHeight:1.3, marginBottom:8, whiteSpace:"pre-line" }}>{tt("autoWriteTitle")}</div>
            <div style={{ fontSize:14, color: isDark?"rgba(255,255,255,0.5)":"#888", lineHeight:1.6 }}>{tt("autoWriteDesc")}</div>
          </div>
        </div>
        <AutoPublisher theme={theme} user={user} onLoginRequest={onLoginRequest} />
      </div>
    );
  }

  // 소셜 플래너
  if (aiMenu === "social_planner") {
    // 소셜 플래너 제거 — 홈으로 리다이렉트
    setAiMenu("home"); return null;
  }

  if (aiMenu === "realtime_analyzer") {
    const { RealtimeAnalyzer } = require("./SocialAnalyzer");
    return (
      <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f4f4f8" }}>
        <RealtimeAnalyzer isDark={isDark} />
      </div>
    );
  }

  if (aiMenu === "sns_publish") {
    return (
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <SnsPublisher isDark={isDark} user={user} onLoginRequest={onLoginRequest} />
      </div>
    );
  }

  if (aiMenu === "social_analyzer") {
    return (
      <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f4f4f8" }}>
        <SocialAnalyzer isDark={isDark} user={user} />
      </div>
    );
  }

  // 영상 편집 — BlogGenerator 영상 모드로 표시 (화면 전환 없이 아래에 인라인)
  if (aiMenu === "video_edit" || aiMenu === "video_create" || aiMenu === "shorts" || aiMenu === "shorts_make" || aiMenu === "longform_edit") {
    const videoInitMode = aiMenu === "longform_edit" ? "longform" : (aiMenu === "shorts" || aiMenu === "shorts_make") ? "shortform" : null;
    return (
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <BlogGenerator embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} setAiMenu={setAiMenu} initialVideoMode={videoInitMode} />
      </div>
    );
  }


  return null;
}

// React.memo로 불필요한 리렌더 방지 (부모 state 변경 시 unmount 방지)
const AiContentMemo = React.memo(AiContent, (prev, next) => {
  // aiMenu가 바뀔 때만 리렌더, 나머지 props 변경은 무시
  return prev.aiMenu === next.aiMenu && prev.user === next.user && prev.theme === next.theme;
});

// ── 블로그 영속 레이어: unmount 방지용 ──
// 블로그 도구 메뉴인지 판별 (blog_write 선택 화면 제외)
function isBlogToolMenu(menu) {
  return menu && menu.startsWith("blog_") && menu !== "blog_write";
}
// 블로그 메뉴 → 렌더링 타입/props 결정
function getBlogRenderInfo(menu) {
  if (menu === "blog_link" || menu === "blog_link_intro") return { type:"unified", platform:"link_youtube", menuId:"blog_link" };
  if (menu === "blog_news" || menu === "blog_news_intro") return { type:"linkCombined", tab:"news", menuId:"blog_news" };
  if (menu === "blog_yt_blog" || menu === "blog_yt_blog_intro") return { type:"linkCombined", tab:"youtube", menuId:"blog_yt_blog" };
  if (menu === "blog_cafe_intro" || menu === "blog_cafe" || menu === "blog_cafe_make") return { type:"unified", platform:"blog_cafe", menuId:"blog_cafe" };
  if (menu && menu.endsWith("_intro") && menu.startsWith("blog_")) {
    const baseId = menu.replace("_intro", "");
    return { type:"unified", platform: baseId, menuId: baseId };
  }
  return { type:"unified", platform: menu, menuId: menu };
}

export function AiPage({ user, navigate, navigateBoard, navigateAi, C, theme, aiMenu: aiMenuProp, setAiMenu: setAiMenuProp, onLogout, onLoginRequest, onUserUpdate }) {
  const { t: tt, lang: _pageLang } = useI18n();
  const _s = (ko, en) => _pageLang === "ko" ? ko : en;
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const [sideOpen, setSideOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  // isGenerating은 state 대신 전역 변수로 (리렌더 방지 — BlogGenerator unmount 원인)
  const [shortsJob, setShortsJob] = useState(null);
  const [shortsActive, setShortsActive] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    (async () => {
      try {
        const local = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
        const merged = await syncLocalLibrary(user.uid, "blog", local);
        if (!alive || !Array.isArray(merged)) return;
        localStorage.setItem("sns_blog_saves_v1", JSON.stringify(merged.slice(0, 100)));
      } catch {}
    })();
    return () => { alive = false; };
  }, [user?.uid]);

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

  // 생성 중 상태는 window.__isGenerating으로 직접 참조 (state 제거 → 리렌더 방지)
  const aiMenu = aiMenuProp !== undefined ? aiMenuProp : localMenu;

  // 블로그 관련 변수 (persistent layer 제거 — sessionStorage 복원으로 대체)
  const blogActiveNow = false; // persistent layer 비활성화

  const [guardModal, setGuardModal] = useState(null);
  const [pointConfirm, setPointConfirm] = useState(null); // { cost, onConfirm, onCancel }

  // 포인트 차감 확인 — 팝업으로 사용자 확인 후 진행
  const showPointConfirm = (cost) => {
    return new Promise(resolve => {
      if (!user) { resolve(true); return; }
      const pts = user.points ?? 0;
      // 회원은 항상 포인트 차감 (무료 횟수 없음)
      // 포인트 부족 시 팝업
      if (pts < cost) {
        setPointConfirm({ cost, onConfirm: () => { setPointConfirm(null); resolve(false); }, onCancel: () => { setPointConfirm(null); resolve(false); } });
        return;
      }
      // 충분하면 확인 팝업
      setPointConfirm({ cost, onConfirm: () => { setPointConfirm(null); resolve(true); }, onCancel: () => { setPointConfirm(null); resolve(false); } });
    });
  };

  const setAiMenu = async (id) => {
    // 생성 중 다른 메뉴 클릭 차단 - 커스텀 모달
    // 블로그 영속 레이어가 활성화된 상태에서는 가드 스킵 (백그라운드에서 계속 생성됨)
    if (window.__isGenerating) {
      const cost = window.__generatingCost || 30;
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
        <div style={{ fontSize:18, fontWeight:900, color:C.text, marginBottom:10 }}>{tt("generatingAlert")}</div>
        <div style={{ fontSize:14, color:C.muted, lineHeight:1.8, marginBottom:24 }}>
          {tt("leaveWarning")}<br/>
          <span style={{ color:"#f87171", fontWeight:700 }}>{tt("resultNotSaved")}</span><br/>
          <span style={{ color:"#f59e0b", fontWeight:700 }}>{guardModal.cost}P {tt("pointsConsumed")}</span>{tt("reallyLeave")}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={guardModal.onCancel}
            style={{ flex:1, padding:"12px", borderRadius:11, border:"1px solid "+C.border,
              background:"transparent", color:C.muted, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            {tt("continueGen")}
          </button>
          <button onClick={guardModal.onConfirm}
            style={{ flex:1, padding:"12px", borderRadius:11, border:"none",
              background:"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            {tt("leaveBtn")}
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
            <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{tt("videoGenProgress")}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{shortsJob.completed}/{shortsJob.total}{tt("completedOf")}</div>
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
            <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{tt("videoGenDone")}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{tt("clickToCheck")}</div>
          </div>
        </div>
      )}

      {/* 글로벌 백그라운드 작업 인디케이터 */}
      {/* BackgroundTaskIndicator 제거 */}
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
        img[loading="lazy"]{background:linear-gradient(90deg,rgba(124,106,255,0.05) 25%,rgba(124,106,255,0.1) 50%,rgba(124,106,255,0.05) 75%);background-size:200% 100%;animation:imgShimmer 1.5s infinite}
        @keyframes imgShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .ai-content-fade{animation:aiFadeIn 0.2s ease}
        @keyframes aiFadeIn{from{opacity:0}to{opacity:1}}
        button:disabled{opacity:0.5!important;cursor:not-allowed!important}
        button{min-height:36px}
        @media(max-width:768px){button{min-height:44px}}
        .ai-sidebar-desktop{display:flex}
        .ai-sidebar-mobile{display:none}
        @media(max-width:768px){
          .ai-sidebar-desktop{display:none!important}
          .ai-sidebar-mobile{display:flex!important}
          .ai-home-features{gap:12px!important}
          .ai-home-features>div{width:auto!important}
          .ai-home-features>div>div:first-child{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}
          .ai-home-search{max-width:100%!important;margin-left:0!important;margin-right:0!important}
          .ai-home-search textarea{font-size:16px!important}
          .ai-home-container{padding:24px 16px 60px!important}
          .ai-home-title{font-size:22px!important}
          .ai-home-2col{grid-template-columns:1fr!important}
          .ai-content-pad{padding:16px 12px 60px!important}
          .tool-header-back{padding:4px 8px!important}
        }
        @media(max-width:640px){
          .ai-content-pad{padding:16px 10px 60px!important}
          .ai-grid{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-3{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .ai-form-row{flex-direction:column!important}
          .tool-header-back{font-size:12px!important;padding:3px 6px!important}
          .tool-header-back span{display:none!important}
          .select-grid{grid-template-columns:repeat(2,1fr)!important}
          .select-title{font-size:20px!important}
          .ai-home-features{gap:10px!important}
          .ai-home-features>div>div:first-child{width:40px!important;height:40px!important;min-width:40px!important;border-radius:10px!important}
          .ai-home-features>div>div:first-child img{width:22px!important;height:22px!important}
          .ai-home-features>div>span{font-size:11px!important}
        }
        @media(max-width:480px){
          .ai-grid{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-3{grid-template-columns:repeat(2,1fr)!important}
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .select-grid{grid-template-columns:repeat(2,1fr)!important}
          .ai-home-container{padding:16px 12px 60px!important}
          .ai-home-title{font-size:20px!important;letter-spacing:-0.5px!important}
          .ai-home-search{border-radius:12px!important}
          .ai-home-2col{grid-template-columns:1fr!important}
          .ai-home-features{gap:8px!important;justify-content:space-between!important}
        }
        @media(max-width:400px){
          .ai-grid{grid-template-columns:1fr!important}
          .ai-grid-3{grid-template-columns:1fr!important}
          .ai-grid-4{grid-template-columns:repeat(2,1fr)!important}
          .select-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* 데스크톱 사이드바 */}
      {sideCollapsed ? (
        <div className="ai-sidebar-desktop" style={{ width: 48, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, background: isDark ? "rgba(0,0,0,0.35)" : "#fff", borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#e5e3f5"}` }}>
          <button onClick={() => setSideCollapsed(false)} title={_t("ai_openMenu")}
            style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isDark ? "#a5b4fc" : "#6366f1" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      ) : (
        <div className="ai-sidebar-desktop">
          <AiSidebar aiMenu={aiMenu} setAiMenu={setAiMenu} user={user} onQna={() => navigate("qna")} theme={theme} onlineCount={onlineCount} navigate={navigate} onLogout={onLogout} onCollapse={() => setSideCollapsed(true)} />
        </div>
      )}

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
            {/* 모바일 전용 사이드바 토글 */}
            <button className="ai-sidebar-mobile" onClick={() => setSideOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20,
                color: isDark ? "#fff" : "#333", padding: "6px 8px", display: "none", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            {/* AI 생성 중 배지 제거 — state 변경으로 하위 컴포넌트 unmount 유발하므로 */}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
          <div className="ai-content-fade" style={{ flex:1, display:"flex", overflow:"hidden" }}>
            <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>Loading...</div>}>
              <AiContentMemo aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} C={C} theme={theme} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} setSideOpen={setSideOpen} />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
