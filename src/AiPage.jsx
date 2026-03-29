import { useState, useEffect, useRef } from "react";
import { Badge, Btn } from "./UI";
import { useI18n } from "./i18n.jsx";
// 이미지 생성기 분리 파일 (마이그레이션 진행중)
import { useGenColors, GenLoading, SelectGroup, BeforeAfterSlider, ModelGenerator, SkinRetouchGenerator, FaceSwapGenerator, OutfitSwapGenerator, OutpaintGenerator } from "./AiImageGenerators.jsx";
import { TabHeader, DmInputField, InstaAutoReply, InstaAutoDM } from "./AiInstagram.jsx";
import { LibraryPage } from "./AiLibrary.jsx";
import { PromptStudioPage, SnsNewsFeed } from "./AiPromptStudio.jsx";
import { useOnlineCount, AiSidebar } from "./AiSidebar.jsx";
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

// ── 콘텐츠 리퍼포징 (원소스 멀티유즈) ──────────────────────────────────────
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
