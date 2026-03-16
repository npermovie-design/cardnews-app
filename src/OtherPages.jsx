import { useState, useEffect } from "react";
import { Badge, Btn } from "./UI";
import { CardNewsApp, PlannerPanel } from "./CardNewsApp";
import BlogGenerator from "./BlogGenerator";
import NewsBlogGenerator from "./NewsBlogGenerator";
import YtBlogGenerator from "./YtBlogGenerator";
import { getAiLeft, FREE_MEMBER, FREE_GUEST, getAiUsage, setAiUsage } from "./storage";

/* ════════════════════════════════════════════════════════════
   AboutPage
════════════════════════════════════════════════════════════ */
export function AboutPage({ navigate, C }) {
  return (
    <div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* 헤더 */}
        <Badge C={C}>✦ About SNS메이킷</Badge>
        <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, margin: "0 0 12px", lineHeight: 1.15 }}>
          SNS 콘텐츠 제작,<br/>
          <span style={{ background: "linear-gradient(135deg,#7c6aff,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>이제 AI가 대신해드려요</span>
        </h2>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.9, marginBottom: 48, maxWidth: 620 }}>
          SNS메이킷은 <b style={{ color: C.text }}>SNS 콘텐츠 제작에 어려움을 느끼는 모든 분들</b>을 위해 만든 AI 기반 콘텐츠 생성 플랫폼입니다.
        </p>

        {/* 공감 섹션 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>혹시 이런 경험 있으신가요?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "😓", text: "SNS를 해야 한다는 건 알지만, 매번 뭘 써야 할지 막막하다" },
              { icon: "⏰", text: "블로그 글 하나 쓰는 데 2~3시간이 걸려 지쳐버렸다" },
              { icon: "📱", text: "인스타, 유튜브, 블로그... 여러 플랫폼에 올릴 콘텐츠가 너무 부담스럽다" },
              { icon: "🔄", text: "매일 꾸준히 올리고 싶은데 아이디어가 금방 바닥난다" },
              { icon: "💸", text: "콘텐츠 외주를 맡기자니 비용이 부담되고, 직접 하자니 시간이 없다" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderRadius: 12, background: C.bg2 || (C.border.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: 0 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.purpleL, marginTop: 24, lineHeight: 1.8 }}>
            👆 이런 고민들, SNS메이킷이 해결해드립니다.
          </p>
        </div>

        {/* 브랜드 의미 */}
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.08),rgba(236,72,153,0.04))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "36px 32px", marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이란?</h3>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.8 }}>이름에 모든 것이 담겨 있어요.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { word: "SNS", sub: "Social Network Service", desc: "인스타그램, 유튜브, 블로그 등 소셜 콘텐츠 플랫폼 전체", color: "#6366f1" },
              { word: "Make it", sub: "만들다 · 해내다 · 실행하다", desc: "Make it happen — 현실로 만들어내다. SNS 콘텐츠를 실제로 완성시킨다는 의미", color: "#ec4899" },
            ].map((item, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: "24px 22px", border: "1px solid " + C.border }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6, background: `linear-gradient(135deg,${item.color},#8b5cf6)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{item.word}</div>
                <div style={{ fontSize: 12, color: item.color, fontWeight: 700, marginBottom: 10 }}>{item.sub}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 14, padding: "20px 24px", border: "1px solid " + C.border, textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: C.text, margin: "0 0 8px", letterSpacing: -0.5 }}>
              "SNS 콘텐츠를 쉽게 만들어 실행하게 도와주는 플랫폼"
            </p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.8 }}>
              SNS 콘텐츠 제작 키트 · SNS 콘텐츠 자동 생성 플랫폼 · SNS 콘텐츠 올인원 툴
            </p>
          </div>
        </div>

        {/* 플랫폼 소개 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.5 }}>SNS메이킷이 만들어진 이유</h3>
          <div style={{ fontSize: 15, color: C.muted, lineHeight: 2.1 }}>
            <p style={{ marginBottom: 16 }}>
              SNS가 비즈니스에서 필수가 된 시대입니다. 하지만 현실은 어떤가요?
              <span style={{ color: C.text, fontWeight: 700 }}> 콘텐츠 하나 만드는 데 수 시간이 걸리고, 매일 올려야 한다는 부담감에 SNS 자체를 포기하는 분들이 많습니다.</span>
            </p>
            <p style={{ marginBottom: 16 }}>
              글쓰기에 자신 없는 분, 아이디어가 자꾸 막히는 분, 여러 플랫폼을 동시에 관리해야 하는 분들 모두가
              <span style={{ color: C.purpleL, fontWeight: 700 }}> "SNS 콘텐츠 제작"이라는 장벽 앞에 멈춰버립니다.</span>
            </p>
            <p style={{ marginBottom: 16 }}>
              SNS메이킷은 바로 이 문제를 해결하기 위해 탄생했습니다.
              <span style={{ color: C.text, fontWeight: 700 }}> 키워드 하나만 입력하면 AI가 블로그 글, 인스타 캡션, 유튜브 대본, 카드뉴스까지 자동으로 완성</span>해드립니다.
              콘텐츠 제작 시간을 90% 이상 줄이고, 누구나 꾸준한 SNS 운영을 할 수 있도록 돕는 것이 저희의 목표입니다.
            </p>
            <p style={{ marginBottom: 0 }}>
              SNS를 시작하고 싶지만 방법을 모르시는 분, 이미 운영 중이지만 콘텐츠 제작이 버거운 분, 더 많은 플랫폼에 더 자주 올리고 싶은 분 모두를 위해
              <span style={{ color: C.purpleL, fontWeight: 700 }}> SNS메이킷은 매일 새로운 기능을 만들고 있습니다.</span>
            </p>
          </div>
        </div>

        {/* AI 도구 목록 */}
        <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 16 }}>SNS메이킷이 지원하는 AI 도구</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))", gap: 12, marginBottom: 40 }}>
          {[
            { icon: "📝", title: "네이버 블로그", desc: "SEO 최적화 블로그 글 자동 생성" },
            { icon: "🟠", title: "티스토리", desc: "HTML 형식 블로그 포스트 자동 작성" },
            { icon: "📱", title: "인스타그램", desc: "해시태그 포함 캡션 자동 생성" },
            { icon: "▶️", title: "유튜브 대본", desc: "영상 스크립트·설명란·SEO 태그 생성" },
            { icon: "🧵", title: "스레드", desc: "임팩트 있는 스레드 게시물 작성" },
            { icon: "🖼", title: "카드뉴스", desc: "AI 기획 + 이미지 자동 생성" },
            { icon: "📰", title: "뉴스로 글쓰기", desc: "최신 뉴스 기반 블로그 글 작성" },
            { icon: "🎬", title: "유튜브로 글쓰기", desc: "유튜브 영상 기반 블로그 글 변환" },
          ].map((s, i) => (
            <div key={i} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px 16px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 5 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* 이런 분들께 */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "36px 32px", marginBottom: 32, boxShadow: C.shadow }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>이런 분들께 추천드려요</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 12 }}>
            {[
              { icon: "🏪", title: "소상공인 · 자영업자", desc: "매장 홍보를 위한 SNS 콘텐츠를 빠르게 만들고 싶은 분" },
              { icon: "💼", title: "1인 기업 · 프리랜서", desc: "개인 브랜딩을 위해 꾸준히 콘텐츠를 올리고 싶은 분" },
              { icon: "🎓", title: "강사 · 코치 · 전문가", desc: "지식을 SNS 콘텐츠로 쉽게 변환하고 싶은 분" },
              { icon: "📊", title: "마케터 · 콘텐츠 담당자", desc: "여러 플랫폼 콘텐츠를 빠르게 대량 생산해야 하는 분" },
              { icon: "🌱", title: "SNS 입문자", desc: "SNS를 처음 시작하는데 무엇을 올려야 할지 모르는 분" },
              { icon: "⏱", title: "바쁜 현대인 누구나", desc: "콘텐츠는 올리고 싶지만 시간이 절대적으로 부족한 분" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "16px", borderRadius: 12, background: C.bg2 || (C.border.includes("255") ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"), alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.06))", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -0.5 }}>지금 바로 시작해보세요</h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.9, margin: "0 auto 24px", maxWidth: 480 }}>
            회원가입 없이 5회 무료 체험 가능해요.<br/>
            가입하면 즉시 10P 지급 + AI 생성기 풀 이용 가능!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn C={C} onClick={() => navigate("ai")}>✨ AI 생성기 무료 체험</Btn>
            <Btn C={C} onClick={() => navigate("pricing")} ghost>💎 요금제 보기</Btn>
          </div>
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
  const [blogOpen, setBlogOpen] = useState(!!(aiMenu && aiMenu.startsWith("blog")));
  const [cardOpen, setCardOpen] = useState(!!(aiMenu && aiMenu.startsWith("cardnews")));

  const info = getAiLeft(user);
  const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
  const pct = Math.min(Math.round(info.used / freeLimit * 100), 100) + "%";

  const Item = ({ id, label, icon, indent }) => {
    const active = aiMenu === id;
    return (
      <button onClick={() => setAiMenu(id)} style={{
        width: "100%", padding: indent ? "8px 12px 8px 28px" : "10px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: indent ? 13 : 14, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: 7, marginBottom: 2,
      }}>
        <span style={{ fontSize: indent ? 13 : 14 }}>{icon}</span>{label}
      </button>
    );
  };

  const Group = ({ label, icon, open, onToggle, active }) => (
    <button onClick={onToggle} style={{
      width: "100%", padding: "7px 10px", borderRadius: 8, border: "none",
      cursor: "pointer", textAlign: "left",
      background: active ? itemActiveBg : "transparent",
      color: active ? itemActive : brandText,
      fontSize: 14, fontWeight: 800, letterSpacing: 0.2, marginBottom: 2,
      borderLeft: "3px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.5, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
    </button>
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
        <Item id="home" label="홈" icon="🏠" />
        <Item id="library" label="보관함" icon="📁" />

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
          <Item id="blog_yt_blog" label="유튜브로 글쓰기" icon="📺" indent />
          <Item id="blog_news"   label="뉴스로 글쓰기"   icon="📰" indent />
        </>}

        {/* SNS 이미지 그룹 */}
        <Group label="SNS 이미지" icon="🖼" open={cardOpen}
          active={!!(aiMenu && aiMenu.startsWith("cardnews"))}
          onToggle={() => setCardOpen(p => !p)} />
        {cardOpen && <>
          <Item id="cardnews_make" label="카드뉴스 만들기" icon="✨" indent />
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

      {/* 하단 프로필 카드 */}
      <div style={{ borderTop: `1px solid ${sideBdr}`, flexShrink: 0 }}>
        {user ? (
          <SidebarProfile user={user} info={info} freeLimit={freeLimit} pct={pct}
            isDark={isDark} sideBdr={sideBdr} navigate={navigate} onLogout={onLogout}
            onlineCount={onlineCount} usageText={usageText} usageBar={usageBar} />
        ) : (
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: usageText }}>비회원 💎 {Math.max(0, freeLimit - info.used) * 10}P 잔여</div>
              {onlineCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
                  <span style={{ fontSize: 10, color: usageText }}>{onlineCount}명</span>
                </div>
              )}
            </div>
            <div style={{ height: 3, background: usageBar, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: pct, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
            </div>
            <div style={{ fontSize: 10, color: "#a5b4fc", textAlign: "center" }}>
              비회원 5회 무료 · 로그인하면 20회
            </div>
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
  const isLow = ptLeft > 0 && ptLeft <= 10;
  const isEmpty = ptLeft <= 0;
  const ptColor = isEmpty || isLow ? "#f87171" : "#a5b4fc";
  const nick = user.nick || user.email?.split("@")[0] || "사용자";
  const initial = nick[0]?.toUpperCase() || "U";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "#ebebf0";
  const popupBg = isDark ? "#1a1730" : "#fff";
  const menuHover = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f8";

  const MenuItem = ({ icon, label, sub, onClick, danger, disabled }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "11px 16px", border: "none", borderRadius: 9,
        background: "transparent", cursor: disabled ? "default" : "pointer",
        textAlign: "left", display: "flex", alignItems: "center", gap: 12,
        color: danger ? "#f87171" : text, fontSize: 14, fontWeight: 500 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? "rgba(248,113,113,0.08)" : menuHover; }}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div>
        <div>{label}</div>
        {sub && <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* 오버레이 */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 199 }} />
      )}

      {/* 팝업 - 가제트AI 스타일 */}
      {open && (
        <div style={{
          position: "fixed", bottom: 60, left: 10,
          width: 260, zIndex: 9999,
          background: popupBg,
          border: `1px solid ${bdr}`,
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}>
          {/* 상단 프로필 헤더 */}
          <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${bdr}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#7c6aff,#ec4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 900, color: "#fff" }}>
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: text }}>{nick}</span>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 700,
                    background: user.role === "admin" ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.12)",
                    color: user.role === "admin" ? "#fbbf24" : "#a5b4fc" }}>
                    {user.role === "admin" ? "관리자" : "일반회원"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
              </div>
            </div>
            {/* 포인트 현황 */}
            <div style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f7f7fb",
              borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: muted }}>포인트 현황</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: ptColor }}>💎 {ptLeft.toLocaleString()}P</span>
              </div>
              <div style={{ height: 5, borderRadius: 5, background: isDark ? "rgba(255,255,255,0.08)" : "#e0e0eb", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, width: ptPct + "%",
                  background: isEmpty || isLow ? "linear-gradient(90deg,#f87171,#ef4444)" : "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
              </div>
              <div style={{ fontSize: 11, color: muted, marginTop: 5 }}>
                AI 1회=10P · {ptLeft >= 10 ? Math.floor(ptLeft/10) + "회 생성 가능" : "⚠️ 포인트 부족"}
              </div>
            </div>
          </div>

          {/* 메뉴 목록 */}
          <div style={{ padding: "8px" }}>
            <MenuItem icon="💎" label="포인트 충전"
              sub={`현재 ${ptLeft.toLocaleString()}P 보유`}
              onClick={() => { navigate("pricing"); setOpen(false); }} />
            <MenuItem icon="📁" label="내 보관함"
              sub="생성한 글·카드뉴스 확인"
              onClick={() => { setOpen(false); }} />
            <MenuItem icon="📅" label="가입일"
              sub={user.joinDate ? new Date(user.joinDate).toLocaleDateString("ko-KR") : "-"}
              disabled={true} />
            <MenuItem icon="📧" label="마지막 로그인"
              sub={user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("ko-KR") : "-"}
              disabled={true} />
          </div>

          {/* 구분선 + 로그아웃 */}
          <div style={{ borderTop: `1px solid ${bdr}`, padding: "8px" }}>
            <MenuItem icon="🚪" label="로그아웃" danger={true}
              onClick={() => { setOpen(false); if (onLogout) onLogout(); }} />
          </div>
        </div>
      )}

      {/* 하단 프로필 버튼 */}
      <button onClick={() => setOpen(p => !p)}
        style={{ width: "100%", padding: "12px 14px",
          background: open ? (isDark ? "rgba(255,255,255,0.06)" : "#f0f0f8") : "transparent",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          transition: "background 0.15s" }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f5f5f8"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, position: "relative",
          background: "linear-gradient(135deg,#7c6aff,#ec4899)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 900, color: "#fff" }}>
          {initial}
          <div style={{ position: "absolute", bottom: 1, right: 1, width: 9, height: 9,
            borderRadius: "50%", background: "#4ade80",
            border: `2px solid ${isDark ? "#12102a" : "#fff"}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nick}</div>
          <div style={{ fontSize: 11, color: ptColor, fontWeight: 600 }}>💎 {ptLeft.toLocaleString()}P 잔여</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
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

// ── LibraryPage 컴포넌트 ──────────────────────────────────────────────────────
function LibraryPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu }) {
  const [tab, setTab] = useState("blog");
  const [blogList, setBlogList] = useState(getBlogSaves);
  const [cardList, setCardList] = useState(getCardSaves);
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
  const total = blogList.length + cardList.length;

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
        {[["blog","✍️ 블로그·SNS 글","blog"], ["card","🖼 카드뉴스","card"]].map(([id, label]) => (
          <button key={id} onClick={()=>{ setTab(id); setSelectedBlog(null); }}
            style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              background: tab===id ? (isDark?"rgba(99,102,241,0.5)":"#fff") : "transparent",
              color: tab===id ? (isDark?"#fff":accent) : muted,
              boxShadow: tab===id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {label}
            <span style={{ marginLeft:6, fontSize:11, opacity:0.7 }}>
              {id==="blog" ? blogList.length : cardList.length}
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
              <button onClick={()=>setAiMenu("cardnews_make")}
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
                      <button onClick={()=>setAiMenu("cardnews_make")}
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
    </div>
  );
}

function AiContent({ aiMenu, user, setAiMenu, navigate, theme, onLoginRequest }) {
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

  // 뉴스로 글쓰기
  if (aiMenu === "blog_news") {
    return (
      <div key="news_blog" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NewsBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} />
      </div>
    );
  }

  // 유튜브로 글쓰기
  if (aiMenu === "blog_yt_blog") {
    return (
      <div key="yt_blog" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <YtBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} />
      </div>
    );
  }

  // 블로그 계열
  if (aiMenu.startsWith("blog_")) {
    const info = BLOG_MAP[aiMenu] || { type: "blog", label: "블로그 글쓰기" };
    return (
      <div key={aiMenu} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <BlogGenerator initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} />
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

export function AiPage({ user, navigate, C, theme, aiMenu: aiMenuProp, setAiMenu: setAiMenuProp, onLogout, onLoginRequest }) {
  const [localMenu, setLocalMenu] = useState(aiMenuProp || "home");
  const [sideOpen, setSideOpen] = useState(false);
  // CardNewsApp 등 하위 컴포넌트에서 로그인 모달 접근용 전역 등록
  useEffect(function() {
    window.__onLoginRequest = onLoginRequest || function(){};
    return function() { delete window.__onLoginRequest; };
  }, [onLoginRequest]);
  const aiMenu = aiMenuProp !== undefined ? aiMenuProp : localMenu;
  const setAiMenu = (id) => {
    if (setAiMenuProp) setAiMenuProp(id);
    setLocalMenu(id);
    setSideOpen(false); // 메뉴 선택 시 사이드바 닫기
  };

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
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        button{font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
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
            <span style={{ fontSize: 12, color: topClr, whiteSpace: "nowrap", fontWeight: 600 }}>🤖 AI 생성기</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.55)" : "#888", whiteSpace: "nowrap", fontWeight: 600 }}>현재 접속중 {onlineCount}명</span>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <AiContent aiMenu={aiMenu} user={user} setAiMenu={setAiMenu} navigate={navigate} theme={theme} onLoginRequest={onLoginRequest} />
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 16, marginBottom: 60 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(130px,45%),1fr))", gap: 12 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))", gap: 12, marginBottom: 40 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12 }}>
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
              💬 문의 남기기
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
