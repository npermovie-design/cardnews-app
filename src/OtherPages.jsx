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
  const PLANS = [
    {
      id: "free", name: "Free", price: "무료", points: 50, aiCount: 5,
      color: "#888", gradient: "linear-gradient(135deg,#888,#aaa)",
      features: ["가입 시 50P 자동 지급","게시글 작성 10P 적립","댓글 작성 2P 적립","일일 로그인 3P 적립","포인트 소진 시 충전"],
      btnLabel: "무료 시작", btnStyle: { background: "transparent", border: "1px solid #888", color: "#888" },
      badge: null, highlight: false,
    },
    {
      id: "basic", name: "Basic", price: "9,900원", points: 500, aiCount: 50,
      color: "#4ade80", gradient: "linear-gradient(135deg,#22c55e,#4ade80)",
      features: ["500P 즉시 충전","AI 생성 50회 분량","게시글 적립 포함","유효기간 없음"],
      btnLabel: "충전하기", btnStyle: { background: "linear-gradient(135deg,#22c55e,#4ade80)", color: "#fff" },
      badge: "연세 플랜", highlight: false,
    },
    {
      id: "pro", name: "Pro", price: "19,900원", points: 1200, aiCount: 120,
      color: "#6366f1", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      features: ["1,200P 즉시 충전","AI 생성 120회 분량","게시글 적립 포함","우선 고객 지원"],
      btnLabel: "충전하기", btnStyle: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" },
      badge: "🔥 추천", highlight: true,
    },
    {
      id: "premium", name: "Premium", price: "29,900원", points: 2500, aiCount: 250,
      color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#fbbf24)",
      features: ["2,500P 즉시 충전","AI 생성 250회 분량","게시글 적립 포함","전담 지원"],
      btnLabel: "충전하기", btnStyle: { background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#fff" },
      badge: "전문가용", highlight: false,
    },
  ];

  const FAQ = [
    { q: "포인트는 어떻게 사용하나요?", a: "AI 생성 1회에 10P가 차감됩니다. 게시글 작성(10P), 댓글(2P), 일일 로그인(3P)으로 포인트를 적립할 수 있어요." },
    { q: "포인트 유효기간이 있나요?", a: "충전한 포인트는 유효기간이 없습니다. 적립 포인트도 동일하게 영구 사용 가능해요." },
    { q: "결제는 어떻게 하나요?", a: "토스페이먼츠를 통해 신용카드, 카카오페이, 네이버페이 등 다양한 방법으로 결제 가능합니다." },
    { q: "환불이 가능한가요?", a: "충전 후 사용하지 않은 포인트는 7일 이내 전액 환불 가능합니다. 문의하기로 연락해주세요." },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>

      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>✦ 요금제</div>
        <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>포인트 충전으로 무제한 사용</h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>게시글 작성만으로도 포인트를 무료로 적립할 수 있어요<br/>AI를 더 많이 쓰고 싶다면 포인트를 충전하세요</p>
      </div>

      {/* 요금제 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 60 }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{ position: "relative", background: C.card, border: plan.highlight ? "2px solid " + plan.color : "1px solid " + C.border, borderRadius: 20, padding: "28px 22px", display: "flex", flexDirection: "column", boxShadow: plan.highlight ? "0 0 32px rgba(99,102,241,0.2)" : C.shadow, transition: "transform 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>

            {plan.badge && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.gradient, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>{plan.badge}</div>
            )}

            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>{plan.name}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: plan.color, marginBottom: 4 }}>{plan.price}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{plan.points}P 충전</div>
            <div style={{ fontSize: 11, color: plan.color, fontWeight: 700, marginBottom: 20 }}>AI 생성 약 {plan.aiCount}회</div>

            <div style={{ flex: 1, marginBottom: 20 }}>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 8, fontSize: 12, color: C.muted }}>
                  <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => plan.id === "free" ? navigate("cardnews") : navigate("contact")}
              style={{ ...plan.btnStyle, padding: "11px", borderRadius: 11, border: plan.btnStyle.border || "none", cursor: "pointer", fontSize: 13, fontWeight: 700, width: "100%" }}>
              {plan.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* 포인트 적립 안내 */}
      <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "28px 28px", marginBottom: 48 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 20 }}>💰 무료 포인트 적립 방법</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          {[
            { icon: "🎁", action: "회원가입", pt: "+50P", desc: "가입 즉시" },
            { icon: "📝", action: "게시글 작성", pt: "+10P", desc: "글 1개당" },
            { icon: "💬", action: "댓글 작성", pt: "+2P", desc: "댓글 1개당" },
            { icon: "☀️", action: "일일 로그인", pt: "+3P", desc: "하루 1회" },
          ].map((item, i) => (
            <div key={i} style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 12, padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{item.action}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#6366f1" }}>{item.pt}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(99,102,241,0.08)", borderRadius: 10, fontSize: 12, color: C.muted }}>
          💡 <b style={{ color: C.text }}>AI 1회 생성 = 10P</b> 차감 · 게시글 10개 작성하면 AI 10회 사용 가능
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 20 }}>자주 묻는 질문</div>
        {FAQ.map((item, i) => (
          <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 22px", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>Q. {item.q}</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>A. {item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function ContactPage({ C }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", msg: "" });
  const [sent, setSent] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const fs = { background: C.inputBg, border: "1px solid " + C.inputBorder, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  const submit = () => {
    if (!form.name || !form.email || !form.msg) { alert("이름, 이메일, 문의 내용을 입력해주세요."); return; }
    // 실제 메일 전송은 EmailJS or FormSpree 연동 필요 → 지금은 카카오로 유도
    window.open("https://open.kakao.com/o/gIw9vTFg", "_blank");
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-block", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "5px 16px", fontSize: 12, color: C.purpleL, fontWeight: 700, marginBottom: 14 }}>✦ 문의하기</div>
        <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 900, color: C.text, letterSpacing: -1, marginBottom: 12 }}>무엇이든 물어보세요</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>빠른 답변을 원하시면 카카오톡 오픈채팅을 이용해주세요</p>
      </div>

      {/* 빠른 연락 수단 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 40 }}>
        {[
          { icon: "💬", title: "카카오 오픈채팅", desc: "가장 빠른 응답", sub: "평균 30분 이내", color: "#FEE500", tc: "#3A1D1D", url: "https://open.kakao.com/o/gIw9vTFg" },
          { icon: "📸", title: "인스타그램 DM", desc: "@nperinsight", sub: "DM으로 문의", color: "linear-gradient(45deg,#f09433,#dc2743)", tc: "#fff", url: "https://www.instagram.com/nperinsight/" },
          { icon: "▶", title: "유튜브 채널", desc: "@nperinsight", sub: "영상 댓글 문의", color: "#FF0000", tc: "#fff", url: "https://www.youtube.com/@nperinsight/videos" },
        ].map((item, i) => (
          <button key={i} onClick={() => window.open(item.url, "_blank")}
            style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 16, padding: "20px", cursor: "pointer", textAlign: "left", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: C.shadow }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = C.shadow; }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: item.tc, fontWeight: 900, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: C.purpleL, marginBottom: 2, fontWeight: 600 }}>{item.desc}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* 문의 폼 */}
      {!sent ? (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "32px 28px", boxShadow: C.shadow }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>📝 문의 내용 남기기</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>카카오 오픈채팅으로 연결되며, 이메일로도 답변드려요</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>이름 *</div>
                <input placeholder="홍길동" value={form.name} style={fs} onChange={f("name")} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>이메일 *</div>
                <input placeholder="example@email.com" type="email" value={form.email} style={fs} onChange={f("email")} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>문의 유형</div>
              <select value={form.subject} style={{ ...fs }} onChange={f("subject")}>
                <option value="">선택해주세요</option>
                <option value="service">서비스 문의</option>
                <option value="payment">결제/포인트 문의</option>
                <option value="bug">오류/버그 신고</option>
                <option value="partner">제휴/파트너십</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 700 }}>문의 내용 *</div>
              <textarea placeholder="문의하실 내용을 자세히 적어주세요..." rows={5} value={form.msg} style={{ ...fs, resize: "vertical" }} onChange={f("msg")} />
            </div>
            <button onClick={submit}
              style={{ padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6aff,#ec4899)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(124,106,255,0.3)" }}>
              💬 카카오톡으로 문의하기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "48px 28px", textAlign: "center", boxShadow: C.shadow }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>카카오톡이 열렸어요!</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>오픈채팅에서 문의 내용을 보내주세요<br/>빠르게 답변드릴게요 😊</div>
          <button onClick={() => setSent(false)} style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>다시 문의하기</button>
        </div>
      )}
    </div>
  );
}
