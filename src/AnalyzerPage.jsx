import { useState, useEffect, useRef } from "react";
import { callAI } from "./aiClient";
import { useI18n } from "./i18n.jsx";

const MENU_ITEMS = [
  { id:"seo_home",    label:"실시간 검색어" },
];

const RANK_ITEMS = [
  { id:"rank_youtube", label:"유튜버 TOP10",    platform:"유튜브" },
  { id:"rank_insta",   label:"인스타 TOP10",    platform:"인스타그램" },
  { id:"rank_blog",    label:"블로거 TOP10",    platform:"네이버 블로그" },
  { id:"rank_tiktok",  label:"틱톡 TOP10",     platform:"틱톡" },
];

const BRAND_CATEGORIES = ["전체","뷰티/화장품","패션/의류","식품/음료","IT/전자","자동차","금융","교육","여행","엔터테인먼트","헬스/피트니스","인테리어/리빙"];

/* ── AI 결과 캐시 (1시간 TTL) ── */
const CACHE_TTL = 60 * 60 * 1000; // 1시간
function getCached(key) {
  try {
    const raw = JSON.parse(localStorage.getItem("az_cache_" + key));
    if (raw && Date.now() - raw.ts < CACHE_TTL) return raw.data;
  } catch {}
  return null;
}
function setCache(key, data) {
  try { localStorage.setItem("az_cache_" + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ── AI 분석기 사용량 제한 ── */
const AZ_USAGE_KEY = "nper_az_usage";
function getAzUsage() {
  try {
    const raw = JSON.parse(localStorage.getItem(AZ_USAGE_KEY) || "{}");
    const today = new Date().toISOString().slice(0,10);
    if (raw.date !== today) return { date: today, guest: 0, member: 0 };
    return raw;
  } catch { return { date: new Date().toISOString().slice(0,10), guest: 0, member: 0 }; }
}
function incAzUsage(isGuest) {
  const usage = getAzUsage();
  if (isGuest) usage.guest += 1; else usage.member += 1;
  try { localStorage.setItem(AZ_USAGE_KEY, JSON.stringify(usage)); } catch {}
  return usage;
}
function getAzLeft(user) {
  const usage = getAzUsage();
  const limit = user ? 10 : 5;
  const used = user ? usage.member : usage.guest;
  return { limit, used, left: Math.max(0, limit - used), exceeded: used >= limit };
}

const SAVE_KEY = "nper_analyzer_history";
function getHistory() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)||"[]"); } catch { return []; } }
function addHistory(item) {
  const list = getHistory().filter(h => h.id !== item.id);
  list.unshift(item);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0,30))); } catch {}
}

/* ── 홈 히어로 섹션 (판다랭크 스타일) ── */
const HOME_FEATURES = [
  { id:"seo_home",     label:"실시간 검색어",  desc:"검색량·급상승 이유·연관어", color:"#7c6aff" },
  { id:"rank_youtube", label:"유튜버 TOP10",  desc:"카테고리별 인기 유튜버", color:"#ef4444" },
  { id:"rank_insta",   label:"인스타 TOP10",  desc:"카테고리별 인기 인스타", color:"#e1306c" },
  { id:"rank_blog",    label:"블로거 TOP10",  desc:"카테고리별 인기 블로거", color:"#22c55e" },
  { id:"rank_tiktok",  label:"틱톡 TOP10",   desc:"카테고리별 인기 틱토커", color:"#000" },
  { id:"rank_brand",   label:"브랜드 TOP10", desc:"SNS 마케팅 브랜드 순위", color:"#06b6d4" },
  { id:"library",      label:"내 보관함",     desc:"이전 분석 결과 확인", color:"#64748b" },
];

/* ── 오늘의 핫키워드 추천 컴포넌트 ── */
function HotKeywordBox({ isDark, text, muted, bdr, cardBg, accent, onGoTrend }) {
  const { t } = useI18n();
  const [keywords, setKeywords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = getCached("hot_keywords");
    if (cached) { setKeywords(cached); return; }
    setLoading(true);
    callAI(`오늘 SNS 콘텐츠 제작에 쓰기 좋은 핫한 키워드 8개를 추천해줘.
시즌, 트렌드, 음식, 뷰티, 라이프스타일 등 다양한 카테고리에서 선정해줘.
각 키워드마다 왜 핫한지 한 줄 이유도 달아줘.
JSON 배열로만 응답해줘: [{"keyword":"봄동","reason":"봄 제철 식재료로 레시피 콘텐츠 수요 급증","category":"음식"},...]`)
    .then(r => {
      try {
        const match = r.match(/\[[\s\S]*\]/);
        if (match) { const data = JSON.parse(match[0]); setKeywords(data); setCache("hot_keywords", data); }
      } catch {}
    })
    .finally(() => setLoading(false));
  }, []);

  const catColor = { "음식":"#f59e0b", "뷰티":"#ec4899", "라이프스타일":"#7c6aff", "여행":"#06b6d4", "패션":"#f97316", "IT":"#3b82f6", "트렌드":"#22c55e", "건강":"#10b981", "엔터":"#ef4444" };

  return (
    <div style={{ marginBottom:24, padding:"20px 22px", borderRadius:16, background: isDark?"rgba(124,106,255,0.06)":"linear-gradient(135deg,rgba(99,102,241,0.04),rgba(236,72,153,0.03))", border:`1px solid ${isDark?"rgba(124,106,255,0.15)":"rgba(99,102,241,0.08)"}` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:text }}>{t("az_hot_keywords")}</div>
          <div style={{ fontSize:11, color:muted, marginTop:2 }}>SNS 콘텐츠 제작에 활용하세요</div>
        </div>
        <button onClick={onGoTrend} style={{ fontSize:11, color:accent, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
          실시간 검색어 보기 →
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:"20px 0", color:muted, fontSize:13 }}>키워드 분석 중...</div>
      ) : keywords ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(170px,100%),1fr))", gap:8 }}>
          {keywords.map((k,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:isDark?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${bdr}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:800, color:text }}>{k.keyword}</span>
                {k.category && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:(catColor[k.category]||accent)+"18", color:catColor[k.category]||accent }}>{k.category}</span>}
              </div>
              <div style={{ fontSize:11, color:muted, lineHeight:1.5 }}>{k.reason}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:"center", padding:"16px 0", color:muted, fontSize:12 }}>키워드를 불러올 수 없습니다</div>
      )}
    </div>
  );
}

export default function AnalyzerPage({ C, theme, user, navigate, onUserUpdate, initialMenu, embedded }) {
  const isDark = theme === "dark";
  const [menu, setMenu] = useState(initialMenu || "home");
  const [sideOpen, setSideOpen] = useState(false);
  const [history, setHistory] = useState(getHistory);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingMenu, setPendingMenu] = useState(null);
  const [libraryDetail, setLibraryDetail] = useState(null);

  useEffect(() => { if (initialMenu && initialMenu !== menu) setMenu(initialMenu); }, [initialMenu]);

  const safeSetMenu = (newMenu) => {
    if (isAnalyzing && newMenu !== menu) {
      setPendingMenu(newMenu);
    } else {
      setMenu(newMenu);
      setLibraryDetail(null);
    }
  };

  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const sideBg = isDark ? "#0f0c29" : "#fff";
  const sideBdr = isDark ? "rgba(255,255,255,0.06)" : "#e9ecef";
  const topBg = isDark ? "rgba(15,12,41,0.95)" : "rgba(255,255,255,0.97)";
  const topBdr = isDark ? "rgba(255,255,255,0.06)" : "#e9ecef";
  const topClr = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  const menuLabel = menu === "home" ? "AI 분석기" : menu === "library" ? "내 보관함" : MENU_ITEMS.find(m => m.id === menu)?.label || RANK_ITEMS.find(m => m.id === menu)?.label || "브랜드 TOP10";

  // 분석 결과 저장 콜백 (전체 결과 포함)
  const onAnalysisDone = (data) => {
    const item = { id: Date.now(), ...data, date: new Date().toLocaleDateString("ko-KR") };
    addHistory(item);
    setHistory(getHistory());
  };

  return (
    <div style={{ display:"flex", width:"100%", height:"calc(100vh - 56px)", overflow:"hidden", position:"relative" }}>
      <style>{`
        .az-side-d{display:flex}.az-side-m{display:none}
        @media(max-width:768px){.az-side-d{display:none!important}.az-side-m{display:flex!important}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {!embedded && <>
        <div className="az-side-d">
          <Sidebar menu={menu} setMenu={safeSetMenu} isDark={isDark} text={text} muted={muted} sideBg={sideBg} sideBdr={sideBdr} navigate={navigate} />
        </div>
        {sideOpen && (
          <div style={{ position:"absolute", inset:0, zIndex:50 }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} onClick={() => setSideOpen(false)} />
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, animation:"slideIn 0.2s ease", zIndex:51 }}>
              <Sidebar menu={menu} setMenu={(m) => { safeSetMenu(m); setSideOpen(false); }} isDark={isDark} text={text} muted={muted} sideBg={sideBg} sideBdr={sideBdr} navigate={navigate} />
            </div>
          </div>
        )}
      </>}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        {!embedded && <div style={{ height:44, flexShrink:0, display:"flex", alignItems:"center", padding:"0 12px", borderBottom:"1px solid "+topBdr, background:topBg }}>
          <button className="az-side-m" onClick={() => setSideOpen(true)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:isDark?"#fff":"#333", padding:"4px 6px", marginRight:8, display:"none" }}>☰</button>
          <span style={{ fontSize:12, color:topClr, fontWeight:600 }}>{menuLabel}</span>
        </div>}

        <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
          {/* ══ 홈 ══ */}
          {menu === "home" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 20px 60px" }}>
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                {/* 헤더는 AiPage에서 렌더링 */}

                {/* 오늘의 핫키워드 추천 */}
                <HotKeywordBox isDark={isDark} text={text} muted={muted} bdr={bdr} cardBg={cardBg} accent={accent} onGoTrend={() => safeSetMenu("seo_home")} />

                {/* 가이드라인 */}
                <div style={{ marginBottom:28, padding:"22px 24px", borderRadius:16, background:isDark?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.03)", border:`1px solid ${isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.1)"}` }}>
                  <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:14 }}>이런 기능을 제공해요</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(240px,100%),1fr))", gap:10, marginBottom:16 }}>
                    {[
                      { title:"실시간 인기 검색어", desc:"네이버·구글 트렌드를 카테고리별로 분석, 검색량·급상승 이유·연관 키워드까지 제공" },
                      { title:"인플루언서 랭킹", desc:"유튜버·인스타·블로거·틱토커 TOP10 인플루언서 순위를 카테고리별로 확인" },
                      { title:"브랜드 TOP10", desc:"SNS 마케팅 브랜드 순위를 카테고리별로 분석하고 트렌드 파악" },
                      { title:"내 보관함", desc:"분석 기록을 자동 저장하고 언제든 다시 확인" },
                    ].map((g,i) => (
                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:3 }}>{g.title}</div>
                          <div style={{ fontSize:11, color:muted, lineHeight:1.6 }}>{g.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop:`1px solid ${isDark?"rgba(99,102,241,0.1)":"rgba(99,102,241,0.08)"}`, paddingTop:14 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:10 }}>이렇게 활용하세요</div>
                    <div style={{ fontSize:12, color:muted, lineHeight:2 }}>
                      <b style={{color:text}}>Step 1.</b> 실시간 검색어에서 트렌드 키워드를 파악하세요<br/>
                      <b style={{color:text}}>Step 2.</b> 인플루언서 랭킹으로 벤치마킹할 채널을 찾으세요<br/>
                      <b style={{color:text}}>Step 3.</b> 트렌드 키워드로 AI 생성기에서 콘텐츠를 제작하세요<br/>
                      <b style={{color:text}}>Step 4.</b> 내 보관함에서 분석 기록을 확인하고 성장을 추적하세요
                    </div>
                  </div>
                </div>

                {/* 기능 그리드 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
                  {HOME_FEATURES.map((f, i) => (
                    <div key={f.id} onClick={() => safeSetMenu(f.id)}
                      style={{
                        padding: "20px 14px", borderRadius: 16, border: `1px solid ${bdr}`,
                        background: cardBg, cursor: "pointer", textAlign: "center",
                        transition: "all 0.2s", animation: `fadeUp 0.3s ease ${i*0.05}s both`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=isDark?"0 8px 24px rgba(0,0,0,0.3)":"0 8px 24px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
                      <div style={{ width:48, height:48, borderRadius:14, background:f.color+"15", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:f.color }} />
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>{f.label}</div>
                      <div style={{ fontSize:11, color:muted, lineHeight:1.4 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>

                {/* 최근 분석 기록 */}
                {history.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:text }}>최근 분석 기록</div>
                      <button onClick={() => safeSetMenu("library")}
                        style={{ fontSize:12, color:accent, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
                        전체보기 →
                      </button>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {history.slice(0,3).map(h => (
                        <div key={h.id} onClick={() => { safeSetMenu("library"); setLibraryDetail(h); }}
                          style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, cursor:"pointer", transition:"all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor=accent}
                          onMouseLeave={e => e.currentTarget.style.borderColor=bdr}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:h.score>=80?"#22c55e":h.score>=60?"#f59e0b":"#ef4444" }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.url}</div>
                            <div style={{ fontSize:11, color:muted }}>{h.platform} · {h.date}</div>
                          </div>
                          <div style={{ fontSize:22, fontWeight:900, color:h.score>=80?"#22c55e":h.score>=60?"#f59e0b":"#ef4444", flexShrink:0 }}>{h.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ 내 보관함 ══ */}
          {menu === "library" && (
            <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
              <div style={{ maxWidth:860, margin:"0 auto" }}>
                {/* 상세 보기 모드 */}
                {libraryDetail ? (
                  <LibraryDetailView
                    item={libraryDetail}
                    isDark={isDark} text={text} muted={muted} bdr={bdr} cardBg={cardBg}
                    onBack={() => setLibraryDetail(null)}
                  />
                ) : (
                  <>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                      <div>
                        <div style={{ fontSize:22, fontWeight:900, color:text }}>내 보관함</div>
                        <div style={{ fontSize:13, color:muted, marginTop:4 }}>이전에 분석했던 결과를 다시 확인할 수 있어요</div>
                      </div>
                      <div style={{ fontSize:12, color:muted }}>총 {history.length}건</div>
                    </div>
                    {history.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"80px 0", color:muted }}>
                        <div style={{ width:56, height:56, borderRadius:16, background:isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{width:12,height:12,borderRadius:"50%",background:"#7c6aff"}}/></div>
                        <div style={{ fontSize:17, fontWeight:700, color:text, marginBottom:8 }}>아직 분석 기록이 없어요</div>
                        <div style={{ fontSize:13, marginBottom:24 }}>SNS 분석기를 사용하면 자동으로 저장됩니다</div>
                        <button onClick={() => safeSetMenu("home")}
                          style={{ padding:"12px 28px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                          분석 시작하기
                        </button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {history.map(h => (
                          <div key={h.id}
                            style={{ padding:"18px 20px", borderRadius:14, border:`1px solid ${bdr}`, background:cardBg,
                              display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor=accent; e.currentTarget.style.transform="translateY(-2px)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor=bdr; e.currentTarget.style.transform="none"; }}
                            onClick={() => setLibraryDetail(h)}>
                            <div style={{ width:44, height:44, borderRadius:12, background:(h.score>=80?"rgba(34,197,94,0.1)":h.score>=60?"rgba(245,158,11,0.1)":"rgba(239,68,68,0.1)"),
                              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                              <div style={{ width:8, height:8, borderRadius:"50%", background:h.score>=80?"#22c55e":h.score>=60?"#f59e0b":"#ef4444" }} />
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {h.url}
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:6, background:isDark?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted, fontWeight:600 }}>
                                  {h.platform}
                                </span>
                                <span style={{ fontSize:11, color:muted }}>{h.date}</span>
                                {h.result ? (
                                  <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:"rgba(34,197,94,0.1)", color:"#22c55e", fontWeight:600 }}>상세보기 가능</span>
                                ) : (
                                  <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:"rgba(245,158,11,0.1)", color:"#f59e0b", fontWeight:600 }}>점수만 저장됨</span>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <div style={{ fontSize:28, fontWeight:900, color:h.score>=80?"#22c55e":h.score>=60?"#f59e0b":"#ef4444" }}>{h.score}</div>
                              <div style={{ fontSize:10, color:muted, fontWeight:600 }}>{h.score>=80?"우수":h.score>=60?"보통":"개선필요"}</div>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                              <button onClick={(e) => { e.stopPropagation(); setLibraryDetail(h); }}
                                style={{ padding:"6px 12px", borderRadius:6, border:`1px solid ${accent}`, background:"transparent", color:accent, fontSize:10, cursor:"pointer", fontWeight:700 }}>
                                상세
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                const list = getHistory().filter(x=>x.id!==h.id);
                                localStorage.setItem(SAVE_KEY,JSON.stringify(list));
                                setHistory(list);
                              }}
                                style={{ padding:"6px 12px", borderRadius:6, border:"none", background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:10, cursor:"pointer", fontWeight:600 }}>
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 실시간 검색어 */}
          {menu === "seo_home" && (
            <TrendingKeywords isDark={isDark} text={text} muted={muted} bdr={bdr} cardBg={cardBg} user={user} navigate={navigate} />
          )}

          {/* 실시간 인플루언서 랭킹 */}
          {menu.startsWith("rank_") && menu !== "rank_brand" && (
            <RankingView isDark={isDark} menu={menu} text={text} muted={muted} bdr={bdr} cardBg={cardBg} />
          )}

          {/* 브랜드 TOP10 */}
          {menu === "rank_brand" && (
            <BrandRankingView isDark={isDark} text={text} muted={muted} bdr={bdr} cardBg={cardBg} />
          )}

          {/* 분석 중 이탈 방지 팝업 */}
          {pendingMenu && (
            <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"min(400px,90vw)", background:isDark?"#1a1730":"#fff", borderRadius:20, padding:"28px 24px", textAlign:"center",
                boxShadow:"0 24px 64px rgba(0,0,0,0.4)", border:`1px solid ${bdr}` }}>
                <div style={{ width:40, height:40, borderRadius:12, background:"rgba(239,68,68,0.1)", margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{color:"#ef4444",fontSize:20,fontWeight:900}}>!</span></div>
                <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:8 }}>분석 중입니다!</div>
                <div style={{ fontSize:13, color:muted, lineHeight:1.8, marginBottom:24 }}>
                  다른 메뉴로 이동하면<br/>
                  <b style={{ color:"#ef4444" }}>현재 분석이 취소</b>됩니다.<br/>
                  정말 이동하시겠습니까?
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setPendingMenu(null)}
                    style={{ flex:1, padding:"12px", borderRadius:10, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:14, cursor:"pointer", fontWeight:600 }}>
                    계속 분석하기
                  </button>
                  <button onClick={() => { setMenu(pendingMenu); setPendingMenu(null); setIsAnalyzing(false); }}
                    style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:"#ef4444", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer" }}>
                    나가기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ 보관함 상세 보기 ══ */
function LibraryDetailView({ item, isDark, text, muted, bdr, cardBg, onBack }) {
  const D = isDark;
  const scoreColor = (s, max=100) => {
    const pct = (s/max)*100;
    return pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  };

  const result = item.result;
  const config = item.resultConfig;

  return (
    <div>
      {/* 뒤로가기 */}
      <button onClick={onBack}
        style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:muted, fontSize:13, marginBottom:20, padding:0 }}>
        ← 보관함 목록
      </button>

      {/* 헤더 */}
      <div style={{ padding:"24px", borderRadius:16, background:cardBg, border:`1px solid ${bdr}`, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:isDark?"rgba(124,106,255,0.12)":"rgba(124,106,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{width:8,height:8,borderRadius:"50%",background:"#7c6aff"}}/></div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:4, wordBreak:"break-all" }}>{item.url}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted, fontWeight:600 }}>{item.platform}</span>
              <span style={{ fontSize:11, color:muted }}>분석일: {item.date}</span>
            </div>
          </div>
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:42, fontWeight:900, color:scoreColor(item.score) }}>{item.score}</div>
            <div style={{ fontSize:12, fontWeight:700, color:scoreColor(item.score) }}>
              {item.score>=80?"우수":item.score>=60?"보통":"개선필요"}
            </div>
          </div>
        </div>
      </div>

      {/* 상세 결과가 있는 경우 */}
      {result ? (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* 종합 분석 */}
          <div style={{ padding:"24px", borderRadius:16, background:D?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.03)", border:"1px solid rgba(99,102,241,0.15)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:10 }}>종합 분석 결과</div>
            <div style={{ fontSize:13, color:text, lineHeight:1.8, marginBottom:12 }}>{result.overallSummary}</div>
            {result.totalGrade && (
              <span style={{ padding:"4px 14px", borderRadius:8, fontSize:13, fontWeight:800,
                background:scoreColor(item.score)+"20", color:scoreColor(item.score) }}>
                종합 등급: {result.totalGrade}
              </span>
            )}
          </div>

          {/* 최우선 수정사항 */}
          {result.topPriority && (
            <div style={{ padding:"18px 20px", borderRadius:14, background:D?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#ef4444", marginBottom:6 }}>최우선 수정 사항</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.7 }}>{result.topPriority}</div>
            </div>
          )}

          {/* 항목별 점수 */}
          {result.criteria && config?.criteria && (
            <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:14 }}>항목별 점수</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {config.criteria.map(criterion => {
                  const data = result.criteria[criterion.key];
                  if (!data) return null;
                  return (
                    <DetailCriterionCard key={criterion.key}
                      criterion={criterion} data={data} isDark={D} text={text} muted={muted} bdr={bdr} cardBg={cardBg} scoreColor={scoreColor} />
                  );
                })}
              </div>
            </div>
          )}

          {/* 추천 제목 */}
          {result.recommendedTitles?.length > 0 && (
            <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>SEO 추천 제목</div>
              {result.recommendedTitles.map((t,i) => (
                <div key={i} onClick={() => navigator.clipboard?.writeText(t)}
                  style={{ padding:"10px 14px", marginBottom:6, borderRadius:8, border:`1px solid ${bdr}`, cursor:"pointer",
                    background:D?"rgba(255,255,255,0.03)":"#fafafa", fontSize:13, color:text, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}
                  title="클릭하면 복사">
                  <span style={{ color:"#7c6aff", fontWeight:900, flexShrink:0 }}>{i+1}</span>
                  <span style={{ flex:1 }}>{t}</span>
                  <span style={{ fontSize:10, color:muted, flexShrink:0 }}>복사</span>
                </div>
              ))}
            </div>
          )}

          {/* 추천 키워드 */}
          {result.recommendedKeywords?.length > 0 && (
            <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>추천 키워드</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {result.recommendedKeywords.map((k,i) => (
                  <span key={i} onClick={() => navigator.clipboard?.writeText(k)}
                    style={{ padding:"6px 14px", borderRadius:20, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)",
                      color:"#7c6aff", fontSize:12, fontWeight:600, cursor:"pointer" }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* 경쟁 차별화 */}
          {result.competitorTip && (
            <div style={{ padding:"18px 20px", borderRadius:14, background:D?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.03)", border:"1px solid rgba(139,92,246,0.15)" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#8b5cf6", marginBottom:8 }}>경쟁 차별화 전략</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.8 }}>{result.competitorTip}</div>
            </div>
          )}
        </div>
      ) : (
        /* 상세 결과가 없는 경우 */
        <div style={{ textAlign:"center", padding:"60px 20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ width:48, height:48, borderRadius:14, background:isDark?"rgba(124,106,255,0.1)":"rgba(124,106,255,0.06)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{width:10,height:10,borderRadius:"50%",background:"#94a3b8"}}/></div>
          <div style={{ fontSize:16, fontWeight:700, color:text, marginBottom:8 }}>상세 분석 결과가 저장되지 않았어요</div>
          <div style={{ fontSize:13, color:muted, lineHeight:1.7, marginBottom:20 }}>
            이전 버전에서 분석한 기록은 점수만 저장됩니다.<br/>
            다시 분석하면 상세 결과를 확인할 수 있어요.
          </div>
          <button onClick={() => {
            // 해당 분석기로 이동
            const targetMenu = "seo_" + (item.type || "blog");
            onBack();
            // 부모에서 menu 변경은 할 수 없으므로 안내만
          }}
            style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            다시 분석하기
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 보관함 항목별 상세 카드 ── */
function DetailCriterionCard({ criterion, data, isDark, text, muted, bdr, cardBg, scoreColor }) {
  const [expanded, setExpanded] = useState(false);
  const D = isDark;
  return (
    <div style={{ borderRadius:12, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.02)":"#fafafa", overflow:"hidden" }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
        <span style={{ fontSize:18 }}>{criterion.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:text }}>{criterion.label}</div>
          <div style={{ fontSize:11, color:muted, marginTop:2 }}>{data.summary}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:900, color:scoreColor(data.score, criterion.weight) }}>
            {data.score}<span style={{fontSize:10,color:muted}}>/{criterion.weight}</span>
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:scoreColor(data.score, criterion.weight) }}>{data.grade}</div>
        </div>
        <span style={{ fontSize:12, color:muted }}>{expanded?"▲":"▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${bdr}` }}>
          {data.good?.length > 0 && (
            <div style={{ marginTop:12, marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>잘하고 있는 점</div>
              {data.good.map((g,i) => <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>• {g}</div>)}
            </div>
          )}
          {data.bad?.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:4 }}>개선이 필요한 점</div>
              {data.bad.map((b,i) => <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>• {b}</div>)}
            </div>
          )}
          {data.howToFix?.length > 0 && (
            <div style={{ padding:"12px", borderRadius:8, background:D?"rgba(245,158,11,0.06)":"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.15)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#f59e0b", marginBottom:6 }}>수정 가이드</div>
              {data.howToFix.map((fix,i) => (
                <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>{i+1}. {fix}</div>
              ))}
            </div>
          )}
          {data.example && (
            <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8, background:D?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.03)", border:"1px solid rgba(34,197,94,0.15)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>수정 예시</div>
              <div style={{ fontSize:12, color:text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{data.example}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 사이드바 ── */
function Sidebar({ menu, setMenu, isDark, text, muted, sideBg, sideBdr }) {
  const item = (id, active) => ({
    display:"block", width:"100%", textAlign:"left", padding:"9px 14px 9px 16px",
    border:"none", cursor:"pointer", fontSize:13, borderRadius:8, marginBottom:2,
    background: active ? (isDark?"rgba(124,106,255,0.18)":"rgba(124,106,255,0.08)") : "transparent",
    color: active ? (isDark?"#a5b4fc":"#7c6aff") : muted, fontWeight: active ? 700 : 400,
    borderLeft: active ? "3px solid #7c6aff" : "3px solid transparent",
  });
  const sectionStyle = {
    fontSize:15, fontWeight:900, color:text, padding:"4px 8px", letterSpacing:-0.3,
  };
  const divider = { height:2, background: isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.12)", margin:"14px 4px", borderRadius:1 };
  return (
    <div style={{ width:200, flexShrink:0, background:sideBg, borderRight:"1px solid "+sideBdr, height:"100%", overflowY:"auto", padding:"16px 10px" }}>
      <div style={{ padding:"0 8px 16px", borderBottom:"1px solid "+sideBdr, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:900, color:text }}>SNS메이킷</div>
        <div style={{ fontSize:11, color:muted }}>AI 분석기</div>
      </div>
      <button onClick={() => setMenu("home")} style={{ ...item("home",menu==="home"), paddingLeft:14 }}>홈</button>
      <button onClick={() => setMenu("library")} style={{ ...item("library",menu==="library"), paddingLeft:14 }}>내 보관함</button>

      <div style={divider} />
      <div style={{ ...sectionStyle, marginBottom:10 }}>실시간</div>
      <button onClick={() => setMenu("seo_home")} style={item("seo_home", menu==="seo_home")}>실시간 검색어</button>

      <div style={divider} />
      <div style={{ ...sectionStyle, marginBottom:10 }}>랭킹</div>
      {RANK_ITEMS.map(m => (
        <button key={m.id} onClick={() => setMenu(m.id)} style={item(m.id, menu===m.id)}>{m.label}</button>
      ))}
      <button onClick={() => setMenu("rank_brand")} style={item("rank_brand", menu==="rank_brand")}>브랜드 TOP10</button>
    </div>
  );
}

/* ── 실시간 검색어 (강화 버전) ── */
const TREND_CATS = ["전체","IT/테크","엔터테인먼트","경제/금융","정치/사회","스포츠","건강/의학","교육","여행","먹방/요리","패션/뷰티"];
const TREND_ENGINES = ["전체","네이버","구글","다음"];
const TREND_CACHE_TTL = 30 * 60 * 1000;

function TrendingKeywords({ isDark, text, muted, bdr, cardBg, user, navigate, onLoginRequest }) {
  const D = isDark;
  const [cat, setCat] = useState("전체");
  const [engine, setEngine] = useState("전체");
  const [trends, setTrends] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem("az_trend_enhanced_전체")); if (r && Date.now() - r.ts < TREND_CACHE_TTL) return r.data; } catch {} return [];
  });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const fetched = useRef(false);

  const fetchTrends = async (c) => {
    const cacheKey = "az_trend_enhanced_" + c;
    try { const r = JSON.parse(localStorage.getItem(cacheKey)); if (r && Date.now() - r.ts < TREND_CACHE_TTL) { setTrends(r.data); return; } } catch {}
    // 사용량 체크 (캐시 히트는 무료, AI 호출만 차감)
    const info = getAzLeft(user);
    if (info.exceeded) { return; }
    incAzUsage(!user);
    setLoading(true); setTrends([]);
    try {
      const prompt = `한국 ${c==="전체"?"전체 카테고리":c} 실시간 인기 검색어 TOP 20.
네이버, 구글 검색 트렌드를 종합 분석해서 다음 정보를 포함해줘:
- rank: 순위 (1~20)
- keyword: 검색어
- engine: 주요 검색엔진 (네이버/구글)
- change: 변동 (up/down/new/stable)
- volume: 예상 일일 검색량 (숫자, 예: 45000)
- reason: 왜 이 검색어가 급상승했는지 한 줄 설명
- category: 카테고리 (뉴스/연예/경제/스포츠/IT/생활/교육 등)
- relatedKeywords: 연관 검색어 3개 (배열)

JSON만 반환: {"trends":[...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 2000);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]).trends || [];
        setTrends(data);
        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch {}
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!fetched.current && trends.length === 0) { fetched.current = true; fetchTrends("전체"); }
  }, []);

  const filtered = trends.filter(t => engine === "전체" || t.engine === engine);
  const now = new Date();
  const timeStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}시 기준`;
  const changeColor = (c) => c==="up"?"#ef4444":c==="down"?"#3b82f6":c==="new"?"#22c55e":muted;
  const fmtVol = (v) => { if (!v) return "-"; const n = Number(v); if (n >= 10000) return (n/10000).toFixed(1)+"만"; if (n >= 1000) return (n/1000).toFixed(1)+"천"; return String(n); };

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ flex:1, overflowY:"auto", padding:isMobile?"16px 12px 60px":"24px 20px 60px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:767px){.az-trend-hdr{display:none!important}.az-trend-row{grid-template-columns:32px 20px 1fr 60px!important}.az-trend-cat,.az-trend-reason{display:none!important}}
      `}</style>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text }}>실시간 인기 검색어</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:11, color:muted }}>{timeStr}</span>
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:8, fontWeight:600,
                background: getAzLeft(user).left > 0 ? "rgba(124,106,255,0.1)" : "rgba(239,68,68,0.1)",
                color: getAzLeft(user).left > 0 ? "#7c6aff" : "#ef4444" }}>
                {user ? "회원" : "비회원"} {getAzLeft(user).left}/{getAzLeft(user).limit}회 남음
              </span>
            </div>
          </div>
          <div style={{ fontSize:13, color:muted }}>검색 트렌드를 분석하고 콘텐츠 주제를 선정하세요</div>
        </div>

        {/* 카테고리 필터 */}
        <div style={{ display:"flex", gap:5, flexWrap:isMobile?"nowrap":"wrap", marginBottom:16, overflowX:isMobile?"auto":"visible", paddingBottom:isMobile?6:0, WebkitOverflowScrolling:"touch" }}>
          {TREND_CATS.map(c => (
            <button key={c} onClick={()=>{setCat(c);fetchTrends(c);}}
              style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${cat===c?"#7c6aff":bdr}`,
                background:cat===c?"rgba(124,106,255,0.12)":"transparent",
                color:cat===c?"#7c6aff":muted, fontSize:12, fontWeight:cat===c?700:400, cursor:"pointer" }}>
              {c}
            </button>
          ))}
        </div>

        {/* 엔진 탭 */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${bdr}`, marginBottom:20 }}>
          {TREND_ENGINES.map(eng => {
            const active = engine===eng;
            return (
              <button key={eng} onClick={()=>setEngine(eng)}
                style={{ padding:"10px 20px", border:"none", cursor:"pointer", fontSize:13, fontWeight:active?700:400,
                  background:"transparent", borderBottom:active?"2px solid #7c6aff":"2px solid transparent",
                  color:active?"#7c6aff":muted, marginBottom:-1 }}>
                {eng}
              </button>
            );
          })}
          <div style={{ flex:1 }} />
          <button onClick={()=>fetchTrends(cat)}
            style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", marginBottom:4 }}>
            새로고침
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ width:32,height:32,border:"3px solid #7c6aff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px" }}/>
            <div style={{ fontSize:14, color:muted }}>AI가 실시간 트렌드를 분석하고 있어요...</div>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {/* 테이블 헤더 (모바일에서 숨김) */}
            <div className="az-trend-hdr" style={{ display:"grid", gridTemplateColumns:"40px 28px 1fr 80px 80px 200px", gap:8, padding:"10px 16px",
              borderBottom:`2px solid ${bdr}`, fontSize:11, fontWeight:700, color:muted }}>
              <span>순위</span><span></span><span>키워드</span><span style={{textAlign:"right"}}>검색량</span><span style={{textAlign:"center"}}>카테고리</span><span>급상승 이유</span>
            </div>
            {filtered.slice(0,20).map((t, i) => (
              <div key={i} className="az-trend-row"
                style={{ display:"grid", gridTemplateColumns:"40px 28px 1fr 80px 80px 200px", gap:8, padding:"14px 16px",
                  borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f3f4f6"}`,
                  cursor:"pointer", transition:"background 0.1s", alignItems:"center" }}
                onMouseEnter={e => e.currentTarget.style.background=D?"rgba(255,255,255,0.03)":"#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}
                onClick={()=>setDetail(detail?.keyword===t.keyword?null:t)}>
                {/* 순위 */}
                <span style={{ fontSize:15, fontWeight:900, color:i<3?"#ef4444":i<6?"#f59e0b":text, textAlign:"center" }}>
                  {t.rank||i+1}
                </span>
                {/* 변동 */}
                <span style={{ fontSize:10, color:changeColor(t.change), textAlign:"center", fontWeight:700 }}>
                  {t.change==="new"?"N":t.change==="up"?"▲":t.change==="down"?"▼":"—"}
                </span>
                {/* 키워드 */}
                <span style={{ fontSize:14, fontWeight:i<3?700:500, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {t.keyword}
                </span>
                {/* 검색량 */}
                <span style={{ fontSize:13, fontWeight:700, color:"#7c6aff", textAlign:"right" }}>
                  {fmtVol(t.volume)}
                </span>
                {/* 카테고리 */}
                <span className="az-trend-cat" style={{ fontSize:10, textAlign:"center", padding:"2px 8px", borderRadius:10,
                  background:D?"rgba(255,255,255,0.06)":"#f0f0f6", color:muted, fontWeight:600 }}>
                  {t.category||"-"}
                </span>
                {/* 이유 */}
                <span className="az-trend-reason" style={{ fontSize:11, color:muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {t.reason||""}
                </span>
              </div>
            ))}

            {/* 상세 패널 */}
            {detail && (
              <div style={{ margin:"16px 0", padding:"20px", borderRadius:14, border:`1px solid ${bdr}`, background:D?"rgba(124,106,255,0.04)":"rgba(124,106,255,0.02)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:text }}>{detail.keyword}</div>
                  <button onClick={()=>setDetail(null)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:16 }}>X</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                  <div style={{ padding:"14px", borderRadius:10, background:cardBg, border:`1px solid ${bdr}`, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>일일 검색량</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"#7c6aff" }}>{fmtVol(detail.volume)}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:10, background:cardBg, border:`1px solid ${bdr}`, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>검색 엔진</div>
                    <div style={{ fontSize:16, fontWeight:700, color:text }}>{detail.engine}</div>
                  </div>
                  <div style={{ padding:"14px", borderRadius:10, background:cardBg, border:`1px solid ${bdr}`, textAlign:"center" }}>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>카테고리</div>
                    <div style={{ fontSize:16, fontWeight:700, color:text }}>{detail.category||"-"}</div>
                  </div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>급상승 이유</div>
                  <div style={{ fontSize:13, color:D?"rgba(255,255,255,0.7)":"#555", lineHeight:1.7 }}>{detail.reason||"정보 없음"}</div>
                </div>
                {detail.relatedKeywords?.length > 0 && (
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:6 }}>연관 검색어</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {detail.relatedKeywords.map((k,j) => (
                        <span key={j} style={{ padding:"5px 12px", borderRadius:16, background:"rgba(124,106,255,0.08)", border:"1px solid rgba(124,106,255,0.15)", color:"#7c6aff", fontSize:12, fontWeight:600 }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"80px 0", color:muted }}>
            {getAzLeft(user).exceeded ? (
              <>
                <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>오늘 무료 사용 횟수를 모두 사용했어요</div>
                <div style={{ fontSize:13, marginBottom:20 }}>{user ? "회원 하루 5회 무료 제공" : "비회원 하루 5회 무료 제공"}</div>
                {!user ? (
                  <button onClick={()=>{ if(typeof window.__onLoginRequest==="function") window.__onLoginRequest(); }}
                    style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#7c6aff", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    로그인하면 10회로 늘어나요
                  </button>
                ) : (
                  <div style={{ fontSize:12, color:muted }}>내일 자정에 초기화됩니다</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>카테고리를 선택하면 트렌드를 분석해요</div>
                <div style={{ fontSize:13 }}>인기 검색어를 분석하고 콘텐츠 주제를 선정하세요</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 인플루언서 랭킹 컴포넌트 ── */
const RANK_CATEGORIES = ["전체","뷰티","먹방/요리","IT/테크","패션","게임","교육","여행","운동/건강","엔터","일상/브이로그","키즈","음악","비즈니스"];

function RankingView({ isDark, menu, text, muted, bdr, cardBg }) {
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const [cat, setCat] = useState("전체");
  const [country, setCountry] = useState("전체");
  const [ageGroup, setAgeGroup] = useState("전체");
  const [keyword, setKeyword] = useState("");
  // 초기 state에서 캐시 즉시 로드
  const initCache = () => getCached(`rank_${menu}_전체_전체_전체_`) || [];
  const [ranking, setRanking] = useState(initCache);
  const [loading, setLoading] = useState(false);
  const [prevMenu, setPrevMenu] = useState(menu);
  const [showFilter, setShowFilter] = useState(true);

  if (menu !== prevMenu) {
    setPrevMenu(menu);
    const c = getCached(`rank_${menu}_전체_전체_전체_`);
    setRanking(c || []);
    setCat("전체"); setCountry("전체"); setAgeGroup("전체"); setKeyword(""); setShowFilter(true);
    if (!c) { /* 캐시 없으면 아래 effect에서 fetch */ }
  }

  const config = RANK_ITEMS.find(r => r.id === menu);
  if (!config) return null;

  const [detail, setDetail] = useState(null);

  const fetchRanking = async (category) => {
    setDetail(null);
    const cacheKey = `rank_${menu}_${category}_${country}_${ageGroup}_${keyword}`;
    const cached = getCached(cacheKey);
    if (cached) { setRanking(cached); return; }
    setLoading(true); setRanking([]);
    try {
      const countryStr = country!=="전체" ? `${country} ` : "";
      const ageStr = ageGroup!=="전체" ? ` 주요 시청자층:${ageGroup}` : "";
      const kwStr = keyword.trim() ? ` 키워드:"${keyword.trim()}" 관련` : "";
      const prompt = `${countryStr}${config.platform} ${category==="전체"?"전체":category}${kwStr}${ageStr} 인기 TOP 10. 각: rank,name,category,followers(숫자+만/억),desc(한줄). URL은 포함하지 마세요. JSON만:{"ranking":[...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 1500);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]).ranking || [];
        setRanking(data);
        setCache(cacheKey, data);
      }
    } catch {}
    setLoading(false);
  };

  // 진입 시 캐시 없으면 자동 fetch
  const didFetch = useRef(false);
  useEffect(() => {
    if (!didFetch.current && ranking.length === 0 && !loading) {
      didFetch.current = true;
      fetchRanking("전체");
    }
  }, [menu]);

  const platformColor = config.id==="rank_youtube"?"#ef4444":config.id==="rank_insta"?"#e1306c":config.id==="rank_blog"?"#22c55e":config.id==="rank_tiktok"?"#69c9d0":"#7c6aff";

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text }}>{config.icon} 실시간 {config.label}</div>
          <div style={{ fontSize:13, color:muted, marginTop:4 }}>{config.platform} 플랫폼 인기 인플루언서를 카테고리별로 확인하세요</div>
        </div>

        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {RANK_CATEGORIES.map(c => (
            <button key={c} onClick={()=>{setCat(c);fetchRanking(c);}}
              style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${cat===c?platformColor:bdr}`,
                background:cat===c?platformColor+"20":"transparent",
                color:cat===c?platformColor:muted, fontSize:11, fontWeight:cat===c?700:400, cursor:"pointer" }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:16 }}>
          <button onClick={()=>setShowFilter(!showFilter)}
            style={{ fontSize:12, color:platformColor, background:"transparent", border:"none", cursor:"pointer", fontWeight:600, marginBottom:8 }}>
            상세 필터 {showFilter?"▲":"▼"}
          </button>
          {showFilter && (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", padding:"12px 16px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ minWidth:100 }}>
                <div style={{ fontSize:10, color:muted, marginBottom:4, fontWeight:600 }}>국가</div>
                <select value={country} onChange={e=>setCountry(e.target.value)}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}>
                  {["전체","한국","미국","일본","중국","영국"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ minWidth:100 }}>
                <div style={{ fontSize:10, color:muted, marginBottom:4, fontWeight:600 }}>주요 팬층</div>
                <select value={ageGroup} onChange={e=>setAgeGroup(e.target.value)}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}>
                  {["전체","10대","20대","30대","40대","50대+"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex:1, minWidth:150 }}>
                <div style={{ fontSize:10, color:muted, marginBottom:4, fontWeight:600 }}>키워드 검색</div>
                <div style={{ display:"flex", gap:6 }}>
                  <input value={keyword} onChange={e=>setKeyword(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&fetchRanking(cat)}
                    placeholder="예: 다이어트, 주식, 캠핑..."
                    style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}/>
                  <button onClick={()=>fetchRanking(cat)}
                    style={{ padding:"7px 14px", borderRadius:8, border:"none", background:platformColor, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    검색
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ width:32,height:32,border:`3px solid ${platformColor}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px" }}/>
            <div style={{ fontSize:14, color:muted }}>AI가 {config.platform} 인플루언서를 분석하고 있어요...</div>
          </div>
        )}

        {!loading && ranking.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ranking.map((r, i) => (
              <div key={i} style={{ borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", cursor:"pointer" }}
                  onClick={()=>setDetail(detail===i?null:i)}>
                  <div style={{ minWidth:32, textAlign:"center" }}>
                    <span style={{ fontSize:18, fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":muted }}>{r.rank||i+1}</span>
                  </div>
                  <div style={{ width:40,height:40,borderRadius:"50%",background:`${platformColor}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:platformColor,flexShrink:0 }}>
                    {(r.name||"?")[0]}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:text }}>{r.name}</span>
                      <span style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:`${platformColor}12`, color:platformColor, fontWeight:600 }}>{r.category}</span>
                    </div>
                    <div style={{ fontSize:11, color:muted }}>{r.desc}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:platformColor }}>{r.followers}</div>
                    <div style={{ fontSize:9, color:muted }}>팔로워</div>
                  </div>
                  <span style={{ fontSize:12, color:muted }}>{detail===i?"▲":"▼"}</span>
                </div>
                {detail === i && (
                  <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${bdr}` }}>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:12 }}>
                      {r.followers && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>팔로워</div>
                        <div style={{ fontSize:15, fontWeight:800, color:platformColor }}>{r.followers}</div>
                      </div>}
                      {r.views && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>월 평균 조회수</div>
                        <div style={{ fontSize:15, fontWeight:800, color:"#06b6d4" }}>{r.views}</div>
                      </div>}
                      {r.revenue && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>월 추정 수익</div>
                        <div style={{ fontSize:15, fontWeight:800, color:"#f59e0b" }}>{r.revenue}</div>
                      </div>}
                      {r.age && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>주요 팬층</div>
                        <div style={{ fontSize:15, fontWeight:800, color:"#8b5cf6" }}>{r.age}</div>
                      </div>}
                    </div>
                    {r.feature && <div style={{ fontSize:12, color:muted, marginTop:10, lineHeight:1.6 }}>{r.feature}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && ranking.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{config.icon}</div>
            <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>카테고리를 선택하면 랭킹을 분석해요</div>
            <div style={{ fontSize:13 }}>위 카테고리 탭을 클릭해주세요</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── 브랜드 TOP10 ── */
function BrandRankingView({ isDark, text, muted, bdr, cardBg }) {
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const [cat, setCat] = useState("전체");
  const [ranking, setRanking] = useState(() => getCached("brand_전체_") || []);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [keyword, setKeyword] = useState("");
  const accent = "#7c6aff";

  const fetchBrands = async (category) => {
    setDetail(null);
    const cacheKey = `brand_${category}_${keyword}`;
    const cached = getCached(cacheKey);
    if (cached) { setRanking(cached); return; }
    setLoading(true); setRanking([]);
    try {
      const kwStr = keyword.trim() ? ` "${keyword.trim()}" 관련` : "";
      const prompt = `한국에서 SNS 마케팅을 잘하는 ${category==="전체"?"전체 업종":category}${kwStr} 브랜드 TOP 10.
각: rank,name(브랜드명),industry(업종),snsScore(1~100),followers(총 팔로워),strategy(한줄). JSON만:{"ranking":[...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 1500);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const data = JSON.parse(m[0]).ranking || [];
        setRanking(data);
        setCache(cacheKey, data);
      }
    } catch {}
    setLoading(false);
  };

  // 진입 시 캐시 없으면 자동 fetch
  const didFetchBrand = useRef(false);
  useEffect(() => {
    if (!didFetchBrand.current && ranking.length === 0 && !loading) {
      didFetchBrand.current = true;
      fetchBrands("전체");
    }
  }, []);

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text }}>실시간 브랜드 TOP10</div>
          <div style={{ fontSize:13, color:muted, marginTop:4 }}>SNS 마케팅을 잘하는 브랜드를 업종별로 분석합니다</div>
        </div>

        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {BRAND_CATEGORIES.map(c => (
            <button key={c} onClick={()=>{setCat(c);fetchBrands(c);}}
              style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${cat===c?accent:bdr}`,
                background:cat===c?accent+"20":"transparent",
                color:cat===c?accent:muted, fontSize:11, fontWeight:cat===c?700:400, cursor:"pointer" }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <input value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchBrands(cat)}
            placeholder="브랜드 키워드 검색..." style={{ flex:1, padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none" }}/>
          <button onClick={()=>fetchBrands(cat)} disabled={loading}
            style={{ padding:"10px 18px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {loading?"분석중...":"검색"}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ width:32,height:32,border:`3px solid ${accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px" }}/>
            <div style={{ fontSize:14, color:muted }}>AI가 브랜드 SNS 영향력을 분석하고 있어요...</div>
          </div>
        )}

        {!loading && ranking.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ranking.map((r, i) => (
              <div key={i} style={{ borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", cursor:"pointer" }}
                  onClick={()=>setDetail(detail===i?null:i)}>
                  <span style={{ fontSize:18, fontWeight:900, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":muted, minWidth:32, textAlign:"center" }}>{r.rank||i+1}</span>
                  <div style={{ width:40,height:40,borderRadius:10,background:`${accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:accent,flexShrink:0 }}>
                    {(r.name||"?").slice(0,2)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:text }}>{r.name}</span>
                      <span style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:`${accent}12`, color:accent, fontWeight:600 }}>{r.industry}</span>
                    </div>
                    <div style={{ fontSize:11, color:muted }}>{r.strategy}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:900, color:r.snsScore>=80?"#22c55e":r.snsScore>=60?"#f59e0b":"#ef4444" }}>{r.snsScore}</div>
                    <div style={{ fontSize:9, color:muted }}>SNS 점수</div>
                  </div>
                  <span style={{ fontSize:12, color:muted }}>{detail===i?"▲":"▼"}</span>
                </div>
                {detail === i && (
                  <div style={{ padding:"0 18px 16px", borderTop:`1px solid ${bdr}` }}>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:12 }}>
                      {r.revenue && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>연 매출 추정</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#f59e0b" }}>{r.revenue}</div>
                      </div>}
                      {r.followers && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>총 SNS 팔로워</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#06b6d4" }}>{r.followers}</div>
                      </div>}
                      {r.engagement && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>참여율</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#8b5cf6" }}>{r.engagement}</div>
                      </div>}
                      {r.mainSns && <div style={{ padding:"8px 14px", borderRadius:8, background:isDark?"rgba(255,255,255,0.03)":"#f8f8fb", border:`1px solid ${bdr}`, flex:1, minWidth:100 }}>
                        <div style={{ fontSize:10, color:muted, marginBottom:2 }}>주력 SNS</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#ec4899" }}>{r.mainSns}</div>
                      </div>}
                    </div>
                    {r.strategy && <div style={{ fontSize:12, color:muted, marginTop:10, lineHeight:1.6 }}>{r.strategy}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && ranking.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"rgba(6,182,212,0.1)", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{width:10,height:10,borderRadius:"50%",background:"#06b6d4"}}/></div>
            <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>업종을 선택하면 브랜드를 분석해요</div>
            <div style={{ fontSize:13 }}>위 카테고리 탭을 클릭해주세요</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
