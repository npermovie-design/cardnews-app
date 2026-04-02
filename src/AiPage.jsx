import React, { useState, useEffect, useRef } from "react";
import { Badge, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
import { useGenColors, GenLoading, SelectGroup, BeforeAfterSlider, ModelGenerator, SkinRetouchGenerator, FaceSwapGenerator, OutfitSwapGenerator, OutpaintGenerator, TabbedGroup } from "./AiImageGenerators.jsx";
import { TabHeader, DmInputField, InstaAutoReply, InstaAutoDM } from "./AiInstagram.jsx";
import { LibraryPage } from "./AiLibrary.jsx";
import { PromptStudioPage, SnsNewsFeed } from "./AiPromptStudio.jsx";
import { useOnlineCount, AiSidebar, BLOG_MAP } from "./AiSidebar.jsx";
import { RepurposePage, MENU_LABELS, MarketingHub, FileTranscriber, UnifiedBlogWriter, LinkBlogCombined } from "./AiTools.jsx";
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
import AutoPublisher from "./AutoPublisher";
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


// ── 기획 ──────────────────────────────────────────────────────

// ── 콘텐츠 제작 선택 화면 ──────────────────────────────
function ContentCreateSelector({ isDark, homeText, homeMuted, setAiMenu }) {
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  // 편집 AI: 글씨 수정 가능한 에디터
  const editAiTools = [
    { id:"cardnews_simple", label:"카드뉴스", img:"/icons3d/sns-content.png", desc:"텍스트 편집 가능 · AI 자동 구성", size:"1080×1080" },
    { id:"detail_simple", label:"상세페이지", img:"/icons3d/memo.png", desc:"텍스트 편집 가능 · 상품 설명", size:"860×1100" },
    { id:"thumbnail_gen", label:"썸네일", img:"/icons3d/instagram-cam.png", desc:"텍스트 편집 가능 · 유튜브/블로그", size:"1280×720" },
    { id:"ppt_gen", label:"PPT 슬라이드", img:"/icons3d/ppt.png", desc:"텍스트 편집 가능 · 프레젠테이션", size:"1920×1080" },
  ];

  // 이미지 AI: 같은 콘텐츠를 이미지로 바로 생성
  const imageAiTools = [
    { id:"cardnews_simple_img", img:"/icons3d/sns-content.png", label:"카드뉴스", desc:"완성된 이미지로 바로 생성", size:"1080×1080" },
    { id:"detail_simple_img", img:"/icons3d/memo.png", label:"상세페이지", desc:"완성된 이미지로 바로 생성", size:"860×1100" },
    { id:"thumbnail_gen_img", img:"/icons3d/instagram-cam.png", label:"썸네일", desc:"완성된 이미지로 바로 생성", size:"1280×720" },
  ];

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
            <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>콘텐츠 제작</div>
            <div style={{ fontSize:13, color:homeMuted }}>편집 가능한 AI 콘텐츠 또는 이미지를 바로 생성하세요</div>
          </div>

          {/* 편집 AI */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(124,106,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✏️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:homeText }}>편집 AI로 시작하기</div>
                <div style={{ fontSize:11, color:homeMuted }}>텍스트를 직접 수정할 수 있는 콘텐츠</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {editAiTools.map(renderToolCard)}
            </div>
          </div>

          {/* 이미지 AI */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(236,72,153,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🎨</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:homeText }}>이미지 AI로 시작하기</div>
                <div style={{ fontSize:11, color:homeMuted }}>AI가 이미지를 바로 생성합니다</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {imageAiTools.map(renderToolCard)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 미니 통계 대시보드 (홈 화면용) ──────────────────────────────────────
function MiniStats({ isDark, homeText, homeMuted, cardBdr, _s }) {
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
    { label: _s("총 콘텐츠", "Total"), value: totalCount, icon: "📝", color: accent },
    { label: _s("사용 포인트", "Points"), value: usedPoints + "P", icon: "💎", color: "#f59e0b" },
    { label: _s("이번 주", "This Week"), value: weekCount, icon: "📅", color: "#10b981" },
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
function RecentWork({ isDark, homeText, homeMuted, cardBdr, setAiMenu, _s }) {
  const saves = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]").slice(0, 3); } catch { return []; }
  }, []);
  const accent = "#7c6aff";
  const typeLabel = (t) => {
    const map = { blog_naver:"네이버", blog_tistory:"티스토리", blog_insta:"인스타", blog_youtube:"유튜브", blog_thread:"스레드", blog_link:"링크", blog_cafe:"카페", blog_yt_blog:"링크" };
    return map[t] || t || "기타";
  };
  return (
    <div style={{ marginBottom:24, textAlign:"left" }}>
      <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span>{_s("최근 작업","Recent Work")}</span>
        {saves.length > 0 && (
          <span onClick={() => setAiMenu("library")} style={{ fontSize:12, fontWeight:600, color:accent, cursor:"pointer" }}>{_s("전체보기","View All")} →</span>
        )}
      </div>
      {saves.length === 0 ? (
        <div style={{ padding:"24px 16px", borderRadius:14, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>✨</div>
          <div style={{ fontSize:13, color:homeMuted, lineHeight:1.6 }}>{_s("아직 생성한 콘텐츠가 없어요","No content created yet")}</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {saves.map(s => (
            <div key={s.id} onClick={() => setAiMenu("library")}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`1px solid ${cardBdr}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", cursor:"pointer", transition:"all 0.15s", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title || "제목 없음"}</div>
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
function OnboardingModal({ isDark, onClose, _s }) {
  const [step, setStep] = React.useState(0);
  const accent = "#7c6aff";
  const bg = isDark ? "#1a1a2e" : "#fff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const steps = [
    { icon:"✍️", title:_s("AI 도구로 콘텐츠를 만들어보세요","Create content with AI tools"), desc:_s("블로그 글쓰기, 카드뉴스, 썸네일 등\nAI가 전문가 수준의 콘텐츠를 만들어줘요.","Blog writing, card news, thumbnails\nAI creates professional-level content.") },
    { icon:"🔥", title:_s("트렌드 키워드로 빠르게 시작","Start fast with trend keywords"), desc:_s("실시간 인기 키워드를 클릭하면\n바로 콘텐츠 작성이 시작돼요.","Click trending keywords to\ninstantly start creating content.") },
    { icon:"📅", title:_s("소셜 플래너로 일정 관리","Manage schedules with Social Planner"), desc:_s("콘텐츠 발행 일정을 캘린더에 등록하고\n체계적으로 SNS를 관리하세요.","Register publishing schedules\nand manage your SNS systematically.") },
    { icon:"🎉", title:_s("무료 5회 체험 가능!","5 free trials available!"), desc:_s("지금 바로 무료로 시작해보세요.\n회원가입 없이도 체험할 수 있어요!","Start for free right now.\nNo sign-up required to try!") },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const handleFinish = () => { localStorage.setItem("sns_onboarding_done", "1"); onClose(); };
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)", padding:20 }} onClick={handleFinish}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:400, borderRadius:24, background:bg, padding:"40px 32px 32px", boxShadow:"0 24px 80px rgba(0,0,0,0.25)", textAlign:"center", position:"relative", overflow:"hidden" }}>
        {/* skip */}
        <button onClick={handleFinish} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", fontSize:12, fontWeight:600, color:muted, cursor:"pointer" }}>{_s("건너뛰기","Skip")}</button>
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
            <button onClick={()=>setStep(step-1)} style={{ flex:1, padding:"14px 0", borderRadius:14, border:`1.5px solid ${accent}40`, background:"transparent", color:accent, fontSize:15, fontWeight:800, cursor:"pointer" }}>{_s("이전","Back")}</button>
          )}
          <button onClick={()=>{ if(isLast) handleFinish(); else setStep(step+1); }}
            style={{ flex:1, padding:"14px 0", borderRadius:14, border:"none", background:accent, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", boxShadow:`0 8px 24px ${accent}40` }}>
            {isLast ? _s("시작하기","Get Started") : _s("다음","Next")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 미니 소셜 플래너 (홈 화면용) ──────────────────────────────────────
function MiniPlanner({ isDark, homeText, homeMuted, cardBdr, setAiMenu }) {
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
            <div style={{ fontSize:14, fontWeight:800, color:homeText }}>오늘의 플랜 {todayStickers.map((s,i)=><span key={i}>{s}</span>)}</div>
            <div style={{ fontSize:11, color:homeMuted }}>예정된 일정 {upcomingCount}개</div>
          </div>
        </div>
        <button onClick={() => setAiMenu("social_planner")}
          style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${isDark?"rgba(124,106,255,0.3)":"rgba(124,106,255,0.2)"}`, background:"transparent", color:"#7c6aff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          전체 보기 →
        </button>
      </div>
      <div style={{ padding:"12px 20px" }}>
        {todayPlans.length === 0 ? (
          <div style={{ textAlign:"center", padding:"16px 0", color:homeMuted, fontSize:13 }}>
            오늘 등록된 플랜이 없어요 ·{" "}
            <span onClick={() => setAiMenu("social_planner")} style={{ color:"#7c6aff", cursor:"pointer", fontWeight:700 }}>플랜 만들기</span>
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
            {todayPlans.length > 3 && <div style={{ fontSize:11, color:homeMuted, textAlign:"center" }}>+{todayPlans.length - 3}개 더</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 트렌드 키워드 섹션 ──────────────────────────────────────
function TrendKeywords({ isDark, homeText, homeMuted, cardBdr, setAiMenu, _s }) {
  const [trendPlatform, setTrendPlatform] = useState(0);
  const accent_ = "#7c6aff";
  const trendPlatforms = [
    { name:"인스타그램", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
      keywords:["릴스 알고리즘 2026","인스타 팔로워 늘리기","인스타 해시태그 전략","숏폼 콘텐츠 제작","인스타 쇼핑 태그"] },
    { name:"유튜브", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="4"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>,
      keywords:["유튜브 쇼츠 수익화","썸네일 디자인 팁","유튜브 SEO 최적화","구독자 1000명 전략","유튜브 스튜디오 분석"] },
    { name:"네이버블로그", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 7h3l2 5 2-5h3v10h-2.5V11l-2 4h-1l-2-4v6H8V7z"/></svg>,
      keywords:["블로그 상위노출 2026","체험단 마케팅 전략","키워드 분석 도구","블로그 수익화 방법","네이버 플레이스 최적화"] },
    { name:"틱톡", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v14a4 4 0 1 1-3-3.87"/><path d="M19 2v4c-3 0-5-2-5-4"/></svg>,
      keywords:["틱톡 알고리즘 공략","틱톡 쇼핑 라이브","틱톡 광고 세팅법","바이럴 챌린지 기획","틱톡 크리에이터 펀드"] },
    { name:"스레드", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8c2.5 0 4 1.5 4 4s-1.5 4-4 4-4-1.5-4-4"/></svg>,
      keywords:["스레드 팔로워 전략","스레드 vs X 비교","스레드 마케팅 활용법","텍스트 콘텐츠 기획","스레드 알고리즘 이해"] },
  ];
  const tp = trendPlatforms[trendPlatform];
  return (
    <div style={{ maxWidth:540, margin:"0 auto 32px", textAlign:"left" }}>
      <div style={{ fontSize:15, fontWeight:800, color:homeText, marginBottom:14, textAlign:"center" }}>
        {_s("트렌드 키워드","Trending Keywords")}
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

  const AiFooter = () => null;

  // 보관함
  if (aiMenu === "library") {
    return <LibraryPage isDark={isDark} homeText={homeText} homeMuted={homeMuted} cardBdr={cardBdr} cardDescC={cardDescC} setAiMenu={setAiMenu} renderFooter={() => <AiFooter />} />;
  }

  // 바형 헤더 공용
  const BarHeader = ({ title, subtitle }) => (
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
  );

  // ── 공통 도구 헤더 (아이콘 + 제목 + 뒤로가기) ──
  const TOOL_INFO = {
    // 글쓰기
    blog_naver:   { icon:"/icon-naver-blog.png", label:"네이버 블로그", parent:"blog_write" },
    blog_cafe:    { icon:"/icon-naver-cafe.webp", label:"네이버 카페", parent:"blog_write" },
    blog_tistory: { icon:"/icon-tistory.png", label:"티스토리", parent:"blog_write" },
    blog_insta:   { icon:"/icon-instagram.webp", label:"인스타그램", parent:"blog_write" },
    blog_thread:  { icon:"/icon-threads.png", label:"스레드", parent:"blog_write" },
    blog_link:    { icon:"/icon-youtube.png", label:"유튜브 → 블로그", parent:"blog_write" },
    blog_news:    { icon:"/icons3d/news.png", label:"뉴스 → 블로그", parent:"blog_write" },
    blog_yt_blog: { icon:"/icon-youtube.png", label:"유튜브 → 블로그", parent:"blog_write" },
    // 콘텐츠 제작
    cardnews_simple: { icon:"/icons3d/sns-content.png", label:"카드뉴스", parent:"content_create" },
    detail_simple:   { icon:"/icons3d/memo.png", label:"상세페이지", parent:"content_create" },
    thumbnail_gen:   { icon:"/icons3d/instagram-cam.png", label:"썸네일", parent:"content_create" },
    ppt_gen:         { icon:"/icons3d/ppt.png", label:"PPT 슬라이드", parent:"content_create" },
    // 이미지
    product_shot:  { icon:"/icons3d/camera.png", label:"제품컷", parent:"image_tools" },
    logo_gen:      { icon:"/icons3d/palette.png", label:"로고", parent:"image_tools" },
    mockup_gen:    { icon:"/icons3d/sns-app.png", label:"목업", parent:"image_tools" },
    model_gen:     { icon:"/icons3d/char-standing.png", label:"모델", parent:"image_tools" },
    skin_retouch:  { icon:"/icons3d/thumbsup.png", label:"피부 보정", parent:"image_tools" },
    face_swap:     { icon:"/icons3d/char-headphone.png", label:"얼굴 교체", parent:"image_tools" },
    outfit_swap:   { icon:"/icons3d/char-scarf.png", label:"의상 교체", parent:"image_tools" },
    outpaint:      { icon:"/icons3d/cloud-upload.png", label:"여백 늘리기", parent:"image_tools" },
    // 비즈니스 문서
    prompt_studio_make: { icon:"/icons3d/report.png", label:"비즈니스 문서", parent:"prompt_studio" },
    // 직접 디자인
    canvas_direct_: { icon:"/icons3d/palette.png", label:"직접 디자인", parent:"content_create" },
  };

  const ToolHeader = ({ menuId }) => {
    const info = TOOL_INFO[menuId?.replace("_make","")?.replace("_intro","")] || TOOL_INFO[menuId] || (menuId?.startsWith("canvas_direct_") ? TOOL_INFO["canvas_direct_"] : null);
    if (!info) return null;
    const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
    return (
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.12)" : "#fff", borderBottom:`1px solid ${bdr}`, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, minHeight:40 }}>
        <button className="ai-sidebar-mobile" onClick={() => setSideOpen(true)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", color: isDark?"#a5b4fc":"#7c6aff", display:"none", alignItems:"center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <button onClick={() => setAiMenu(info.parent)}
          className="tool-header-back"
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 8px", borderRadius:6, color: isDark ? "#a5b4fc" : "#7c6aff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:4, transition:"background 0.12s", flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span>뒤로</span>
        </button>
        <div style={{ width:1, height:18, background:bdr, flexShrink:0 }} />
        <img src={info.icon} alt="" loading="lazy" decoding="async" style={{ width:22, height:22, borderRadius:4, objectFit:"contain", flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:800, color: homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{info.label}</span>
      </div>
    );
  };

  // ── 도구 래퍼 (헤더 + 콘텐츠) ──
  const ToolWrap = ({ menuId, children }) => (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <ToolHeader menuId={menuId} />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {children}
      </div>
    </div>
  );

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
      { category: "비즈니스", items: [
        { id:"prompt_studio_make", docType:"proposal",    icon:"📋", label:"사업 제안서", desc:"투자·파트너 제안" },
        { id:"prompt_studio_make", docType:"bizplan",     icon:"📊", label:"사업계획서", desc:"창업·투자유치용" },
        { id:"prompt_studio_make", docType:"ppt_outline", icon:"📑", label:"PPT 구성안", desc:"발표 슬라이드 기획" },
        { id:"prompt_studio_make", docType:"report",      icon:"📝", label:"보고서", desc:"업무·분석 보고서" },
      ]},
      { category: "업무", items: [
        { id:"prompt_studio_make", docType:"planner",  icon:"📅", label:"플래너·일정표", desc:"프로젝트·업무 계획" },
        { id:"prompt_studio_make", docType:"meeting",  icon:"📃", label:"회의록", desc:"회의 안건·결과 정리" },
        { id:"prompt_studio_make", docType:"email",    icon:"✉️", label:"비즈니스 메일", desc:"공식 이메일·레터" },
        { id:"prompt_studio_make", docType:"contract", icon:"📜", label:"계약서 초안", desc:"계약·합의서 템플릿" },
      ]},
      { category: "메시지·인사", items: [
        { id:"prompt_studio_make", docType:"congrats",   icon:"🎉", label:"축하 메시지", desc:"결혼·승진·생일·개업" },
        { id:"prompt_studio_make", docType:"condolence", icon:"💐", label:"위로·감사", desc:"조의·병문안·감사" },
        { id:"prompt_studio_make", docType:"speech",     icon:"🎤", label:"인사말·축사", desc:"행사·연설·건배사" },
        { id:"prompt_studio_make", docType:"invite",     icon:"💌", label:"초대장·안내문", desc:"행사·모임·공지" },
      ]},
    ];
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ flex:1, overflowY:"auto", background: isDark ? "transparent" : "#f8f9fb" }}>
          <div style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 60px" }}>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ fontSize:24, fontWeight:900, color:homeText, marginBottom:6 }}>어떤 문서를 작성할까요?</div>
              <div style={{ fontSize:13, color:homeMuted }}>문서 유형을 선택하면 AI가 작성해드려요</div>
            </div>
            {/* 최근 문서 */}
            {(() => {
              try {
                const plans = JSON.parse(localStorage.getItem("nper_plans_v1")||"[]").slice(0,4);
                if (plans.length === 0) return null;
                return (
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:homeText, marginBottom:12, paddingLeft:4 }}>최근 작성한 문서</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                      {plans.map((p, i) => (
                        <button key={i} onClick={() => setAiMenu("prompt_studio_make")}
                          style={{ padding:"12px 14px", borderRadius:12, border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}`, background:isDark?"rgba(255,255,255,0.04)":"#fff", cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#7c6aff"}
                          onMouseLeave={e => e.currentTarget.style.borderColor=isDark?"rgba(255,255,255,0.1)":"#e5e7eb"}>
                          <div style={{ fontSize:12, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title || p.topic || "제목 없음"}</div>
                          <div style={{ fontSize:10, color:homeMuted, marginTop:3 }}>{p.docType || "문서"} · {p.date || ""}</div>
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
    // 온보딩 상태
    const [showOnboarding, setShowOnboarding] = React.useState(false);

    const features_ = [
      { icon:"/icons3d/blog-write.png", title:_s("글쓰기","Writing"), menu:"blog_write" },
      { icon:"/icons3d/palette.png", title:_s("콘텐츠 제작","Content"), menu:"content_create" },
      { icon:"/icons3d/instagram-cam.png", title:_s("이미지","Image"), menu:"image_tools" },
      { icon:"/icons3d/sns-share.png", title:_s("리퍼포징","Repurpose"), menu:"repurpose" },
    ];

    // 홈 화면
    return (
      <div className="ai-home-container" style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px 60px", background:isDark?"transparent":"#fafafa", overflow:"auto" }}>
        {showOnboarding && <OnboardingModal isDark={isDark} onClose={() => setShowOnboarding(false)} _s={_s} />}

        <div style={{ maxWidth:640, width:"100%", textAlign:"center" }}>
          <h1 className="ai-home-title" style={{ fontSize:30, fontWeight:900, color:homeText, marginBottom:10, letterSpacing:-0.8, lineHeight:1.3 }}>
            {_s("SNS메이킷, AI 콘텐츠를 한 번에","SNS Makeit, All AI Content at Once")}
          </h1>

          {/* 기능 아이콘 */}
          <div className="ai-home-features" style={{ display:"flex", justifyContent:"center", gap:20, margin:"32px 0 40px", flexWrap:"wrap" }}>
            {features_.map(f => (
              <div key={f.menu} onClick={() => setAiMenu(f.menu)}
                style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer", transition:"transform 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                <div style={{ width:52, height:52, borderRadius:14, background:isDark?"rgba(255,255,255,0.06)":"#fff", border:`1px solid ${cardBdr}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                  <img src={f.icon} alt="" loading="lazy" decoding="async" style={{ width:28, height:28, objectFit:"contain" }} />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:homeText }}>{f.title}</span>
              </div>
            ))}
          </div>

          {/* 소셜 플래너 바로가기 */}
          <div style={{ marginBottom:24, textAlign:"center" }}>
            <button onClick={() => setAiMenu("social_planner")}
              style={{ padding:"14px 28px", borderRadius:14, border:`1px solid ${cardBdr}`, background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:10, transition:"all 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              <span style={{ fontSize:22 }}>📅</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:14, fontWeight:700, color:homeText }}>소셜 플래너</div>
                <div style={{ fontSize:11, color:homeMuted }}>SNS 업로드 일정을 관리하세요</div>
              </div>
              <span style={{ fontSize:14, color:"#7c6aff", fontWeight:700 }}>→</span>
            </button>
          </div>
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
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform="blog_cafe" />;
  }
  if (aiMenu.startsWith("blog_") && aiMenu !== "blog_write") {
    return <UnifiedBlogWriter theme={theme} isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} defaultPlatform={aiMenu} />;
  }

  // 글쓰기: 선택 화면 (수동발행 / 자동발행 탭)
  if (aiMenu === "blog_write") {
    const writeTab = (() => { try { return sessionStorage.getItem("_blog_write_tab") || "manual"; } catch { return "manual"; } })();
    const setWriteTab = (t) => { try { sessionStorage.setItem("_blog_write_tab", t); } catch {} setAiMenu("blog_write"); };
    const isAutoTab = writeTab === "auto";
    const showAutoTab = user?.role === "admin"; // 관리자만 자동발행 탭 표시
    const writeItems = [
      { category: "직접 작성", items: [
        { id:"blog_naver", icon:"/icon-naver-blog.png", label:"네이버 블로그", desc:"네이버 블로그 글쓰기" },
        { id:"blog_cafe", icon:"/icon-naver-cafe.webp", label:"네이버 카페", desc:"카페 커뮤니티 글" },
        { id:"blog_tistory", icon:"/icon-tistory.png", label:"티스토리", desc:"티스토리 포스트" },
        { id:"blog_insta", icon:"/icon-instagram.webp", label:"인스타그램", desc:"인스타 캡션 생성" },
        { id:"blog_thread", icon:"/icon-threads.png", label:"스레드", desc:"스레드 게시물" },
      ]},
      { category: "링크에서 변환", items: [
        { id:"blog_link", icon:"/icon-youtube.png", label:"유튜브 → 블로그", desc:"유튜브 영상을 글로 변환" },
        { id:"blog_news", icon:"/icons3d/news.png", label:"뉴스 → 블로그", desc:"뉴스 기사를 글로 변환" },
      ]},
    ];
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
            {showAutoTab && (
              <div style={{ display:"flex", gap:4, padding:4, borderRadius:14, background: isDark ? "rgba(255,255,255,0.06)" : "#e8e8f0", marginBottom:28 }}>
                <button onClick={() => setWriteTab("manual")} style={tabStyle(!isAutoTab)}>
                  수동발행
                </button>
                <button onClick={() => setWriteTab("auto")} style={tabStyle(isAutoTab)}>
                  자동발행
                  <span style={{ marginLeft:6, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6, background: isAutoTab ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.15)", color: isAutoTab ? "#fff" : "#10b981", verticalAlign:"middle" }}>NEW</span>
                </button>
              </div>
            )}
            {/* 자동발행 탭 → AutoPublisher 렌더 */}
            {isAutoTab && showAutoTab ? (
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
                              <div style={{ fontSize:12, fontWeight:700, color:homeText, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.title || b.topic || "제목 없음"}</div>
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

  // ── 콘텐츠 제작: 하위 도구 직접 진입 ──
  if (aiMenu === "cardnews_simple" || aiMenu === "cardnews_make" || aiMenu === "cardnews_simple_make") {
    return <ToolWrap menuId="cardnews_simple"><SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  }
  if (aiMenu === "cardnews_simple_img") {
    return <ToolWrap menuId="cardnews_simple_img"><SimpleCardNewsGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} imageMode /></ToolWrap>;
  }
  if (aiMenu === "detail_simple" || aiMenu === "detail_simple_make") {
    return <ToolWrap menuId="detail_simple"><SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  }
  if (aiMenu === "detail_simple_img") {
    return <ToolWrap menuId="detail_simple_img"><SimpleDetailPageGenerator isDark={isDark} user={user} theme={theme} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} imageMode /></ToolWrap>;
  }
  if (aiMenu === "thumbnail_gen" || aiMenu === "thumbnail_gen_make") {
    return <ToolWrap menuId="thumbnail_gen"><ThumbnailGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  }
  if (aiMenu === "thumbnail_gen_img") {
    return <ToolWrap menuId="thumbnail_gen_img"><ThumbnailGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} imageMode /></ToolWrap>;
  }
  if (aiMenu === "ppt_gen") {
    return <ToolWrap menuId="ppt_gen"><PptGenerator isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  }

  // ── 콘텐츠 제작: 직접 디자인 (빈 캔버스 바로 진입) ──
  if (aiMenu.startsWith("canvas_direct_")) {
    const m = aiMenu.replace("canvas_direct_","").split("x");
    const cw = parseInt(m[0])||1080, ch = parseInt(m[1])||1080;
    const UnifiedCanvasEditorLazy = React.lazy(() => import("./UnifiedCanvasEditor"));
    return (
      <ToolWrap menuId="cardnews_simple">
        <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>에디터 로딩 중...</div>}>
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
  if (aiMenu === "content_create") {
    return <ContentCreateSelector isDark={isDark} homeText={homeText} homeMuted={homeMuted} setAiMenu={setAiMenu} />;
  }

  // ── 이미지: 하위 도구 직접 진입 ──
  if (aiMenu === "product_shot") return <ToolWrap menuId="product_shot"><ProductShotGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "logo_gen") return <ToolWrap menuId="logo_gen"><LogoGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "mockup_gen") return <ToolWrap menuId="mockup_gen"><MockupGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "model_gen" || aiMenu === "model_gen_make") return <ToolWrap menuId="model_gen"><ModelGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "skin_retouch") return <ToolWrap menuId="skin_retouch"><SkinRetouchGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "face_swap" || aiMenu === "face_swap_make") return <ToolWrap menuId="face_swap"><FaceSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "outfit_swap" || aiMenu === "outfit_swap_make") return <ToolWrap menuId="outfit_swap"><OutfitSwapGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} /></ToolWrap>;
  if (aiMenu === "outpaint" || aiMenu === "outpaint_make") return <ToolWrap menuId="outpaint"><OutpaintGenerator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} showPointConfirm={showPointConfirm} /></ToolWrap>;

  // ── 이미지: 선택 화면 (이미지 생성 + 수정 통합) ──
  if (aiMenu === "image_tools" || aiMenu === "image_create" || aiMenu === "image_edit") {
    const imgItems = [
      { category: "이미지 생성", items: [
        { id:"product_shot", img:"/icons3d/camera.png", label:"제품컷", desc:"AI 제품 사진 생성" },
        { id:"logo_gen", img:"/icons3d/palette.png", label:"로고", desc:"브랜드 로고 생성" },
        { id:"mockup_gen", img:"/icons3d/sns-app.png", label:"목업", desc:"제품 목업 생성" },
        { id:"model_gen", img:"/icons3d/char-standing.png", label:"모델", desc:"AI 모델 이미지" },
      ]},
      { category: "이미지 수정", items: [
        { id:"skin_retouch", img:"/icons3d/thumbsup.png", label:"피부 보정", desc:"AI 피부 리터칭" },
        { id:"face_swap", img:"/icons3d/char-headphone.png", label:"얼굴 교체", desc:"얼굴 합성·교체" },
        { id:"outfit_swap", img:"/icons3d/char-scarf.png", label:"의상 교체", desc:"가상 피팅" },
        { id:"outpaint", img:"/icons3d/cloud-upload.png", label:"여백 늘리기", desc:"이미지 확장" },
      ]},
    ];
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

  // 자동발행 (관리자 전용)
  if (aiMenu === "auto_publish") {
    return <AutoPublisher theme={theme} user={user} onLoginRequest={onLoginRequest} />;
  }

  // 소셜 플래너
  if (aiMenu === "social_planner") {
    const SocialPlanner = React.lazy(() => import("./SocialPlanner"));
    return <React.Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#888"}}>로딩 중...</div>}><SocialPlanner isDark={isDark} user={user} theme={theme} /></React.Suspense>;
  }

  // 영상 편집 — 일반회원 개방
  if (aiMenu === "video_edit" || aiMenu === "video_create" || aiMenu === "shorts_make") {
    return <ShortsCreator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} />;
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
  const { t: tt } = useI18n();
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const [sideOpen, setSideOpen] = useState(false);
  // isGenerating은 state 대신 전역 변수로 (리렌더 방지 — BlogGenerator unmount 원인)
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
      // 무료 횟수 남아있으면 바로 진행
      const usage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
      const used = usage["member_" + (user.uid || "u")] || 0;
      if (used < 5) { resolve(true); return; } // 무료 5회
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
            <AiContentMemo aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} navigateBoard={navigateBoard} navigateAi={navigateAi} C={C} theme={theme} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} setSideOpen={setSideOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}
