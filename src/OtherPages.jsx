import { useState, useEffect } from "react";
import { Badge, Btn } from "./UI";
import { CardNewsApp, PlannerPanel } from "./CardNewsApp";
import BlogGenerator from "./BlogGenerator";
import { getAiLeft, FREE_MEMBER, FREE_GUEST } from "./storage";

/* ════════════════════════════════════════════════════════════
   AboutPage
════════════════════════════════════════════════════════════ */
export function AboutPage({ navigate, C }) {
  return (
    <div>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px" }}>
        <Badge C={C}>✦ About</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, color: C.text, letterSpacing: -1, margin: "0 0 32px" }}>엔퍼(NPER) 소개</h2>
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 40, lineHeight: 2, fontSize: 15, color: C.muted, boxShadow: C.shadow }}>
          <p style={{ marginBottom: 16 }}>안녕하세요. SNS의 실행을 도와드리는 <span style={{ color: C.text, fontWeight: 700 }}>엔퍼(NPER)</span>입니다.</p>
          <p style={{ marginBottom: 16 }}>많은 분들이 SNS가 중요하다는 것은 알고 있지만, 막상 어떻게 시작해야 할지 몰라서 고민하는 경우가 많습니다. 계정을 만들어도 어떤 콘텐츠를 올려야 하는지, 어떤 방향으로 운영해야 하는지, 그리고 꾸준히 실행하는 방법까지 혼자 해결하기는 쉽지 않습니다.</p>
          <p style={{ marginBottom: 16 }}>엔퍼는 바로 그<span style={{ color: C.purpleL, fontWeight: 700 }}> "실행의 과정"</span>을 함께 만들어가는 팀입니다. 단순히 이론만 전달하는 교육이 아니라, 실제 비즈니스에 도움이 되는 SNS 운영 전략을 함께 설계하고 실행까지 이어지도록 돕는 것을 목표로 하고 있습니다.</p>
          <p style={{ marginBottom: 16 }}>계정의 현재 상태를 분석하고, 업종과 브랜드에 맞는 콘텐츠 방향을 설정하며, 블로그·유튜브·인스타그램 등 다양한 채널을 활용해 브랜드가 성장할 수 있는 SNS 구조를 만들어드립니다.</p>
          <p style={{ marginBottom: 16 }}>엔퍼는 단순한 계정 관리 서비스가 아니라<span style={{ color: C.text, fontWeight: 700 }}> 브랜드의 SNS 성장을 함께 만들어가는 파트너</span>가 되고자 합니다.</p>
          <p style={{ marginBottom: 0 }}>SNS를 시작하고 싶지만 방법을 모르시는 분, 이미 운영 중이지만 방향이 고민되는 분, 그리고 비즈니스 성장을 위해 SNS를 제대로 활용하고 싶은 분들과 함께하고 있습니다.<span style={{ color: C.purpleL, fontWeight: 700 }}> SNS의 시작부터 성장까지, 실행을 함께하는 곳. 엔퍼가 도와드리겠습니다.</span></p>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 20 }}>엔퍼가 지원하는 서비스</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 40 }}>
          {[
            { icon: "🎓", title: "강의 사이트 운영", desc: "강사 육성 및 고객 연결을 위한 강의 플랫폼 운영" },
            { icon: "📢", title: "SNS 홍보 지원", desc: "콘텐츠 업로드를 통한 체계적인 SNS 홍보 지원" },
            { icon: "🛠️", title: "프로그램 & 자료 제공", desc: "SNS 콘텐츠 작업에 필요한 AI 프로그램과 자료 제공" },
            { icon: "✍️", title: "관리 대행", desc: "블로그, 유튜브, 인스타그램 콘텐츠 제작 및 운영 대행" },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "22px 20px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.05))", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 20, padding: "28px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, margin: "0 0 18px" }}>AI 카드뉴스 생성기를 지금 바로 무료로 사용해보세요</p>
          <Btn C={C} onClick={() => navigate("cardnews")}>🃏 카드뉴스 생성기 바로가기</Btn>
        </div>
      </div>
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

const SNS_LINKS = [
  { label: "카카오톡", url: "https://open.kakao.com/o/gIw9vTFg",           bg: "#FEE500" },
  { label: "인스타",   url: "https://www.instagram.com/nperinsight/",      bg: "#E1306C" },
  { label: "유튜브",   url: "https://www.youtube.com/@nperinsight/videos", bg: "#FF0000" },
];

function AiSidebar({ aiMenu, setAiMenu, user, onQna, theme, onlineCount }) {
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
  const [blogOpen, setBlogOpen] = useState(!!(aiMenu && aiMenu.startsWith("blog")));
  const [cardOpen, setCardOpen] = useState(!!(aiMenu && aiMenu.startsWith("cardnews")));

  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const pct = Math.min(Math.round(info.used / freeLimit * 100), 100) + "%";

  const Item = ({ id, label, icon, indent }) => {
    const active = aiMenu === id;
    return (
      <button onClick={() => setAiMenu(id)} style={{
        width: "100%", padding: indent ? "6px 10px 6px 26px" : "8px 10px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: indent ? 11 : 12, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: 6, marginBottom: 1,
      }}>
        <span style={{ fontSize: indent ? 11 : 12 }}>{icon}</span>{label}
      </button>
    );
  };

  const Group = ({ label, icon, open, onToggle, active }) => (
    <button onClick={onToggle} style={{
      width: "100%", padding: "7px 10px", borderRadius: 8, border: "none",
      cursor: "pointer", textAlign: "left",
      background: active ? itemActiveBg : "transparent",
      color: active ? itemActive : brandText,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.2, marginBottom: 1,
      borderLeft: "3px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.5, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
    </button>
  );

  return (
    <div style={{
      width: 185, flexShrink: 0, background: sideBg,
      borderRight: `1px solid ${sideBdr}`,
      display: "flex", flexDirection: "column", height: "100%", overflowY: "auto",
    }}>
      {/* 브랜드 */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${sideBdr}` }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: brandText }}>엔퍼</div>
        <div style={{ fontSize: 9, color: brandSub, marginTop: 1 }}>AI 콘텐츠 생성기</div>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px", flex: 1 }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home" label="홈" icon="🏠" />

        {/* SNS 글쓰기 그룹 */}
        <Group label="SNS 글쓰기" icon="✍️" open={blogOpen}
          active={!!(aiMenu && aiMenu.startsWith("blog"))}
          onToggle={() => setBlogOpen(p => !p)} />
        {blogOpen && <>
          <Item id="blog_naver"   label="네이버 블로그"   icon="📝" indent />
          <Item id="blog_tistory" label="티스토리"        icon="📝" indent />
          <Item id="blog_insta"   label="인스타그램 캡션" icon="📱" indent />
          <Item id="blog_youtube" label="유튜브 대본"     icon="▶️" indent />
          <Item id="blog_thread"  label="스레드"          icon="🧵" indent />
        </>}

        {/* 카드뉴스 그룹 */}
        <Group label="카드뉴스" icon="🃏" open={cardOpen}
          active={!!(aiMenu && aiMenu.startsWith("cardnews"))}
          onToggle={() => setCardOpen(p => !p)} />
        {cardOpen && <>
          <Item id="cardnews_plan" label="글 기획하기" icon="📋" indent />
          <Item id="cardnews_make" label="바로 만들기" icon="✨" indent />
        </>}

        <Item id="shorts" label="쇼츠영상 생성기" icon="🎬" />

        {/* 커뮤니티 */}
        <div style={{ borderTop: `1px solid ${sideBdr}`, marginTop: 8, paddingTop: 8 }}>
          <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>COMMUNITY</div>
          {SNS_LINKS.map(s => (
            <button key={s.label} onClick={() => window.open(s.url, "_blank")} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 7,
              padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
              background: "transparent", color: comText, fontSize: 11, textAlign: "left", marginBottom: 1,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, flexShrink: 0 }} />{s.label}
            </button>
          ))}
          <button onClick={onQna} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 7,
            padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
            background: "rgba(251,191,36,0.07)", color: "#fbbf24", fontSize: 11, textAlign: "left",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: "#FEE500", flexShrink: 0 }} />질문 및 건의방
          </button>
        </div>
      </div>

      {/* 사용량 바 */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${sideBdr}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: usageText }}>
            {(user ? "회원" : "비회원") + " " + Math.min(info.used, freeLimit) + "/" + freeLimit + "회 사용"}
          </div>
          {onlineCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80" }} />
              <span style={{ fontSize: 9, color: usageText }}>{onlineCount}명</span>
            </div>
          )}
        </div>
        <div style={{ height: 3, background: usageBar, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
        </div>
      </div>
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
};

function AiContent({ aiMenu, user, setAiMenu, navigate, theme }) {
  const isDark = theme === "dark";
  const homeText  = isDark ? "#fff"                   : "#1a1a2e";
  const homeMuted = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const cardBdr   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardDescC = isDark ? "rgba(255,255,255,0.4)"  : "#888";

  // 홈
  if (!aiMenu || aiMenu === "home") {
    const MENUS = [
      { id: "blog_naver",    icon: "📝", title: "네이버 블로그",   desc: "SEO 최적화 블로그 포스트",   darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(99,102,241,0.07)"  },
      { id: "blog_tistory",  icon: "🟠", title: "티스토리",        desc: "티스토리용 블로그 글",       darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(255,107,53,0.07)"  },
      { id: "blog_insta",    icon: "📱", title: "인스타그램 캡션", desc: "인스타 게시물 캡션",         darkColor: "rgba(236,72,153,0.18)",  lightColor: "rgba(236,72,153,0.07)"  },
      { id: "blog_youtube",  icon: "▶️", title: "유튜브 대본",     desc: "영상 대본 & 설명란",         darkColor: "rgba(239,68,68,0.18)",   lightColor: "rgba(239,68,68,0.07)"   },
      { id: "blog_thread",   icon: "🧵", title: "스레드",          desc: "스레드 게시물 작성",         darkColor: "rgba(99,102,241,0.18)",  lightColor: "rgba(0,0,0,0.04)"       },
      { id: "cardnews_make", icon: "✨", title: "카드뉴스 만들기", desc: "주제 → AI 생성 → 편집",     darkColor: "rgba(139,92,246,0.2)",   lightColor: "rgba(139,92,246,0.07)"  },
      { id: "cardnews_plan", icon: "📋", title: "카드뉴스 기획",   desc: "슬라이드 문구 자동 기획",   darkColor: "rgba(139,92,246,0.2)",   lightColor: "rgba(139,92,246,0.07)"  },
      { id: "shorts",        icon: "🎬", title: "쇼츠영상 생성기", desc: "🔧 개발 중",               darkColor: "rgba(255,255,255,0.04)", lightColor: "rgba(0,0,0,0.03)"       },
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
              <div style={{ fontSize: 24, marginBottom: 7 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3, color: homeText }}>{m.title}</div>
              <div style={{ fontSize: 11, color: cardDescC, lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 블로그 계열
  if (aiMenu.startsWith("blog_")) {
    const info = BLOG_MAP[aiMenu] || { type: "blog", label: "블로그 글쓰기" };
    return (
      <div key={aiMenu} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BlogGenerator initialType={info.type} menuLabel={info.label} embedded theme={theme} />
      </div>
    );
  }

  // 카드뉴스 - 바로 만들기
  if (aiMenu === "cardnews_make") {
    return (
      <div key="cn_make" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <CardNewsApp user={user} embedded initialSubPage="make" theme={theme} />
      </div>
    );
  }

  // 카드뉴스 - 글 기획하기 (인라인 - CardNewsApp의 기획 패널)
  if (aiMenu === "cardnews_plan") {
    return (
      <div key="cn_plan" style={{ flex: 1, display: "flex", overflow: "hidden", background: theme === "dark" ? "#0f0c29" : "#f4f4f8" }}>
        <PlannerPanel inline theme={theme}
          onClose={() => {}}
          onApplySlides={(slides) => {
            // 기획 완료 시 cardnews_make로 이동 (localStorage에 저장 후 이동)
            try { localStorage.setItem("nper_plan_slides", JSON.stringify(slides)); } catch(e) {}
            setAiMenu("cardnews_make");
          }}
        />
      </div>
    );
  }

  // 쇼츠 - 준비중
  if (aiMenu === "shorts") {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, padding: 40, textAlign: "center", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ fontSize: 72 }}>🎬</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: isDark ? "#fff" : "#1a1a2e" }}>쇼츠영상 생성기</div>
        <div style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.45)" : "#888", lineHeight: 2 }}>현재 열심히 개발 중입니다! 🔧<br/>조금만 기다려주시면 곧 업데이트될 예정이에요.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
          {["쇼츠 스크립트 자동 생성", "자막 문구 최적화", "해시태그 자동 추출"].map(t => (
            <div key={t} style={{ padding: "7px 14px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t}</div>
          ))}
        </div>
        <button onClick={() => navigate("qna")} style={{
          marginTop: 10, padding: "11px 26px", borderRadius: 12,
          border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.07)",
          color: "#fbbf24", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>💬 출시 알림 신청하기</button>
      </div>
    );
  }

  return null;
}

export function AiPage({ user, navigate, C, theme, aiMenu: aiMenuProp, setAiMenu: setAiMenuProp }) {
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const aiMenu = aiMenuProp !== undefined ? aiMenuProp : localMenu;
  const setAiMenu = (id) => {
    if (setAiMenuProp) setAiMenuProp(id);
    setLocalMenu(id);
  };

  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const onlineCount = useOnlineCount();

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: theme === "dark" ? "linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)" : "#f4f4f8",
      color: theme === "dark" ? "#fff" : "#1a1a2e",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        button{font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      {/* 사이드바 */}
      <AiSidebar aiMenu={aiMenu} setAiMenu={setAiMenu} user={user} onQna={() => navigate("qna")} theme={theme} onlineCount={onlineCount} />

      {/* 우측 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 사용량 상단 바 */}
        <div style={{
          height: 40, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 20px",
          borderBottom: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid #e5e3f5",
          background: theme === "dark" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: theme === "dark" ? "rgba(255,255,255,0.35)" : "#aaa" }}>🤖 AI 생성기 사용 현황</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: info.used <= freeLimit ? "#a5b4fc" : "#f87171" }}>
              {user ? "회원" : "비회원"} 무료 {Math.min(info.used, freeLimit)}/{freeLimit}회
            </span>
            {user && <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>💎 {user.points || 0}P</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: theme === "dark" ? "rgba(255,255,255,0.45)" : "#888" }}>
                {onlineCount}명 접속중
              </span>
            </div>
            {!user && (
              <button onClick={() => navigate("auth")} style={{
                padding: "4px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700,
              }}>로그인 / 회원가입</button>
            )}
          </div>
        </div>

        {/* 메뉴별 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <AiContent aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} theme={theme} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PricingPage
════════════════════════════════════════════════════════════ */
export function PricingPage({ navigate, C }) {
  const plans = [
    { name: "Free", price: "무료", sub: "영구 무료", color: C.card, border: "rgba(0,0,0,0.1)", badge: null, features: ["카드뉴스 생성 월 20회", "기본 디자인 5종", "PNG 다운로드", "워터마크 없음"], cta: "무료로 시작", ctaStyle: { background: "#f5f4ff", color: C.purpleL, border: "1px solid rgba(124,106,255,0.2)" } },
    { name: "스타터", price: "4,900원", sub: "/ 월", color: C.card, border: "rgba(124,106,255,0.3)", badge: null, features: ["카드뉴스 생성 월 100회", "모든 디자인 프리셋", "PNG + 고화질 다운로드", "기획 AI 무제한 사용", "보관함 최대 50개"], cta: "스타터 시작하기", ctaStyle: { background: "rgba(124,106,255,0.1)", color: C.purpleL, border: "1px solid rgba(124,106,255,0.25)" } },
    { name: "프로", price: "9,900원", sub: "/ 월", color: "linear-gradient(160deg,#faf9ff 0%,#f0eeff 100%)", border: "rgba(124,106,255,0.5)", badge: "인기", features: ["카드뉴스 생성 월 300회", "모든 디자인 프리셋", "PNG + 고화질 다운로드", "기획 AI 무제한 사용", "보관함 무제한", "우선 생성 (빠른 처리)", "신규 기능 우선 제공"], cta: "프로 시작하기", ctaStyle: { background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", border: "none" } },
    { name: "비즈니스", price: "19,900원", sub: "/ 월", color: C.card, border: "rgba(255,180,50,0.4)", badge: "팀용", features: ["카드뉴스 생성 무제한", "모든 디자인 프리셋", "PNG + 고화질 다운로드", "기획 AI 무제한 사용", "보관함 무제한", "우선 생성 (빠른 처리)", "신규 기능 우선 제공", "팀 공유 기능 (출시 예정)", "전용 고객 지원"], cta: "비즈니스 문의하기", ctaStyle: { background: "rgba(255,180,50,0.1)", color: "#b45309", border: "1px solid rgba(255,180,50,0.3)" } },
  ];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        {/* ── 준비중 배너 ── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "6px 20px", marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>🔧</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.purpleL, letterSpacing: 1 }}>COMING SOON</span>
          </div>
          <h1 style={{ fontSize: "clamp(26px,4vw,44px)", fontWeight: 900, color: C.text, marginBottom: 16, letterSpacing: -1 }}>
            가격 정책 준비 중입니다
          </h1>
          <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 28px" }}>
            현재 서비스 정식 출시를 준비하고 있어요.<br />
            출시와 함께 합리적인 가격으로 찾아뵐게요!
          </p>
          <div style={{ display: "inline-flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 18px", boxShadow: C.shadow }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>베타 기간 무료</div>
                <div style={{ fontSize: 11, color: C.muted }}>지금은 무료로 이용 가능</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 18px", boxShadow: C.shadow }}>
              <span style={{ fontSize: 18 }}>📬</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>출시 알림 신청</div>
                <div style={{ fontSize: 11, color: C.muted }}>가격 공개 시 먼저 알려드려요</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 블러 처리된 가격 카드 ── */}
        <div style={{ position: "relative", marginBottom: 48 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, filter: "blur(4px)", opacity: 0.35, pointerEvents: "none", userSelect: "none" }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ position: "relative", borderRadius: 20, border: "1px solid " + plan.border, background: plan.color, padding: "32px 28px", boxShadow: C.shadow }}>
                {plan.badge && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.badge === "인기" ? "linear-gradient(135deg,#7c6aff,#ec4899)" : "rgba(255,180,50,0.9)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    {plan.badge === "인기" ? "✨ 인기" : "👥 팀용"}
                  </div>
                )}
                <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: 1 }}>{plan.name.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: C.text }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>{plan.sub}</span>
                </div>
                <div style={{ borderTop: "1px solid " + C.border, margin: "20px 0", paddingTop: 20 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: C.muted }}>
                      <span style={{ color: C.purple, fontSize: 14, flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: plan.ctaStyle.background, color: plan.ctaStyle.color, border: plan.ctaStyle.border || "none" }}>{plan.cta}</button>
              </div>
            ))}
          </div>
          {/* 블러 위 오버레이 텍스트 */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ fontSize: 36 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>가격 정책 준비 중</div>
            <div style={{ fontSize: 13, color: C.muted }}>정식 출시 시 공개됩니다</div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>문의사항이 있으신가요?</p>
          <button onClick={() => navigate("contact")} style={{ background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.2)", color: C.purpleL, padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            문의하기 →
          </button>
        </div>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   ContactPage
════════════════════════════════════════════════════════════ */
export function ContactPage({ C }) {
  const [form, setForm] = useState({ name: "", email: "", msg: "" });
  const [sent, setSent] = useState(false);
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>
        <Badge C={C}>✦ Contact</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, color: C.text, letterSpacing: -1, margin: "0 0 14px" }}>문의하기</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.85, marginBottom: 32 }}>서비스 이용 문의, 제안 등 편하게 남겨주세요.</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { label: "💬 카카오 단체방", url: "https://open.kakao.com/o/gIw9vTFg", bg: "#FEE500", tc: "#3A1D1D" },
            { label: "📸 인스타그램", url: "https://www.instagram.com/nperinsight/", bg: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)", tc: "#fff" },
            { label: "▶ 유튜브", url: "https://www.youtube.com/@nperinsight/videos", bg: "#FF0000", tc: "#fff" },
          ].map(s => (
            <button key={s.label} onClick={() => window.open(s.url, "_blank")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: s.bg, color: s.tc, fontSize: 12, fontWeight: 700 }}>{s.label}</button>
          ))}
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "52px", background: C.bg2, border: "1px solid rgba(124,106,255,0.15)", borderRadius: 20, boxShadow: C.shadow }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>문의가 접수됐어요!</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>빠른 시간 내에 답변드릴게요.</div>
            <Btn C={C} onClick={() => { setSent(false); setForm({ name: "", email: "", msg: "" }); }}>새 문의 작성</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Inp C={C} placeholder="이름 / 닉네임" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Inp C={C} placeholder="이메일" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Textarea C={C} placeholder="문의 내용을 입력해주세요..." value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} rows={7} />
            <Btn C={C} onClick={() => { if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) return; setSent(true); }}>문의 보내기</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
