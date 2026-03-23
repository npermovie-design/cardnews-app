import { useState, useEffect, useRef } from "react";
import SeoAnalyzer from "./SeoAnalyzer";

const MENU_ITEMS = [
  { id:"seo_home",    label:"실시간 검색어",       icon:"📊" },
  { id:"seo_blog",    label:"네이버 블로그 분석",   icon:"📝" },
  { id:"seo_youtube", label:"유튜브 분석",         icon:"▶️" },
  { id:"seo_tistory", label:"티스토리 분석",       icon:"📖" },
  { id:"seo_insta",   label:"인스타그램 분석",     icon:"📸" },
];

const RANK_ITEMS = [
  { id:"rank_youtube", label:"유튜버 TOP100",    icon:"▶️", platform:"유튜브" },
  { id:"rank_insta",   label:"인스타 TOP100",    icon:"📸", platform:"인스타그램" },
  { id:"rank_blog",    label:"블로거 TOP100",    icon:"📝", platform:"네이버 블로그" },
  { id:"rank_tiktok",  label:"틱톡 TOP100",     icon:"🎵", platform:"틱톡" },
];

const BRAND_CATEGORIES = ["전체","뷰티/화장품","패션/의류","식품/음료","IT/전자","자동차","금융","교육","여행","엔터테인먼트","헬스/피트니스","인테리어/리빙"];

const SAVE_KEY = "nper_analyzer_history";
function getHistory() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)||"[]"); } catch { return []; } }
function addHistory(item) {
  const list = getHistory().filter(h => h.id !== item.id);
  list.unshift(item);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0,30))); } catch {}
}

/* ── 홈 히어로 섹션 (판다랭크 스타일) ── */
const HOME_FEATURES = [
  { id:"seo_blog",   icon:"📝", label:"블로그분석",    desc:"네이버 블로그 SEO 진단", color:"#22c55e" },
  { id:"seo_youtube", icon:"▶️", label:"유튜브분석",    desc:"유튜브 영상 최적화 분석", color:"#ef4444" },
  { id:"seo_tistory", icon:"📖", label:"티스토리분석",   desc:"구글 SEO + 애드센스", color:"#f59e0b" },
  { id:"seo_insta",  icon:"📸", label:"인스타분석",     desc:"해시태그·참여율 분석", color:"#e1306c" },
  { id:"seo_home",   icon:"🔥", label:"실시간 검색어",  desc:"네이버·구글 트렌드", color:"#6366f1" },
  { id:"rank_youtube",icon:"🏆", label:"인플루언서 랭킹", desc:"유튜버·인스타 TOP100", color:"#8b5cf6" },
  { id:"rank_brand", icon:"🏢", label:"브랜드 TOP100", desc:"SNS 마케팅 브랜드", color:"#06b6d4" },
  { id:"library",    icon:"📂", label:"내 보관함",     desc:"이전 분석 결과 확인", color:"#64748b" },
];

export default function AnalyzerPage({ C, theme, user, navigate }) {
  const isDark = theme === "dark";
  const [menu, setMenu] = useState("home");
  const [sideOpen, setSideOpen] = useState(false);
  const [history, setHistory] = useState(getHistory);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingMenu, setPendingMenu] = useState(null);
  const [libraryDetail, setLibraryDetail] = useState(null);

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
  const accent = "#6366f1";

  const menuLabel = menu === "home" ? "AI 분석기획기" : menu === "library" ? "내 보관함" : MENU_ITEMS.find(m => m.id === menu)?.label || RANK_ITEMS.find(m => m.id === menu)?.label || "브랜드 TOP100";

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

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ height:44, flexShrink:0, display:"flex", alignItems:"center", padding:"0 12px", borderBottom:"1px solid "+topBdr, background:topBg }}>
          <button className="az-side-m" onClick={() => setSideOpen(true)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:isDark?"#fff":"#333", padding:"4px 6px", marginRight:8, display:"none" }}>☰</button>
          <span style={{ fontSize:12, color:topClr, fontWeight:600 }}>📊 {menuLabel}</span>
        </div>

        <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
          {/* ══ 홈 ══ */}
          {menu === "home" && (
            <div style={{ flex:1, overflowY:"auto", padding:"32px 20px 60px" }}>
              <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <div style={{ textAlign:"center", marginBottom:32 }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
                  <div style={{ fontSize:24, fontWeight:900, color:text, marginBottom:6 }}>AI 분석기획기</div>
                  <div style={{ fontSize:14, color:muted }}>SNS 콘텐츠를 AI가 분석하고 SEO 점수를 매겨드려요</div>
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
                      <div style={{ width:48, height:48, borderRadius:14, background:f.color+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 10px" }}>
                        {f.icon}
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
                          <div style={{ fontSize:20 }}>{MENU_ITEMS.find(m=>m.id==="seo_"+h.type)?.icon||"📊"}</div>
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
                        <div style={{ fontSize:56, marginBottom:16 }}>📂</div>
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
                              {MENU_ITEMS.find(m=>m.id==="seo_"+h.type)?.icon||"📊"}
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

          {/* 분석기 */}
          {menu.startsWith("seo_") && (
            <SeoAnalyzer isDark={isDark} menu={menu} user={user} onSave={onAnalysisDone} onAnalyzingChange={setIsAnalyzing} />
          )}

          {/* 실시간 인플루언서 랭킹 */}
          {menu.startsWith("rank_") && menu !== "rank_brand" && (
            <RankingView isDark={isDark} menu={menu} text={text} muted={muted} bdr={bdr} cardBg={cardBg} />
          )}

          {/* 브랜드 TOP100 */}
          {menu === "rank_brand" && (
            <BrandRankingView isDark={isDark} text={text} muted={muted} bdr={bdr} cardBg={cardBg} />
          )}

          {/* 분석 중 이탈 방지 팝업 */}
          {pendingMenu && (
            <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"min(400px,90vw)", background:isDark?"#1a1730":"#fff", borderRadius:20, padding:"28px 24px", textAlign:"center",
                boxShadow:"0 24px 64px rgba(0,0,0,0.4)", border:`1px solid ${bdr}` }}>
                <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
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
          <div style={{ fontSize:28 }}>{MENU_ITEMS.find(m=>m.id==="seo_"+item.type)?.icon||"📊"}</div>
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
            <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:10 }}>📋 종합 분석 결과</div>
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
              <div style={{ fontSize:13, fontWeight:800, color:"#ef4444", marginBottom:6 }}>🚨 최우선 수정 사항</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.7 }}>{result.topPriority}</div>
            </div>
          )}

          {/* 항목별 점수 */}
          {result.criteria && config?.criteria && (
            <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:14 }}>📊 항목별 점수</div>
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
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>✨ SEO 추천 제목</div>
              {result.recommendedTitles.map((t,i) => (
                <div key={i} onClick={() => navigator.clipboard?.writeText(t)}
                  style={{ padding:"10px 14px", marginBottom:6, borderRadius:8, border:`1px solid ${bdr}`, cursor:"pointer",
                    background:D?"rgba(255,255,255,0.03)":"#fafafa", fontSize:13, color:text, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}
                  title="클릭하면 복사">
                  <span style={{ color:"#6366f1", fontWeight:900, flexShrink:0 }}>{i+1}</span>
                  <span style={{ flex:1 }}>{t}</span>
                  <span style={{ fontSize:10, color:muted, flexShrink:0 }}>📋</span>
                </div>
              ))}
            </div>
          )}

          {/* 추천 키워드 */}
          {result.recommendedKeywords?.length > 0 && (
            <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>🏷 추천 키워드</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {result.recommendedKeywords.map((k,i) => (
                  <span key={i} onClick={() => navigator.clipboard?.writeText(k)}
                    style={{ padding:"6px 14px", borderRadius:20, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)",
                      color:"#6366f1", fontSize:12, fontWeight:600, cursor:"pointer" }}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* 경쟁 차별화 */}
          {result.competitorTip && (
            <div style={{ padding:"18px 20px", borderRadius:14, background:D?"rgba(139,92,246,0.06)":"rgba(139,92,246,0.03)", border:"1px solid rgba(139,92,246,0.15)" }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#8b5cf6", marginBottom:8 }}>🎯 경쟁 차별화 전략</div>
              <div style={{ fontSize:13, color:text, lineHeight:1.8 }}>{result.competitorTip}</div>
            </div>
          )}
        </div>
      ) : (
        /* 상세 결과가 없는 경우 */
        <div style={{ textAlign:"center", padding:"60px 20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ fontSize:48, marginBottom:14 }}>📄</div>
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
            style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#6366f1", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
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
              <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>✅ 잘하고 있는 점</div>
              {data.good.map((g,i) => <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>• {g}</div>)}
            </div>
          )}
          {data.bad?.length > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:4 }}>❌ 개선이 필요한 점</div>
              {data.bad.map((b,i) => <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>• {b}</div>)}
            </div>
          )}
          {data.howToFix?.length > 0 && (
            <div style={{ padding:"12px", borderRadius:8, background:D?"rgba(245,158,11,0.06)":"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.15)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#f59e0b", marginBottom:6 }}>🔧 수정 가이드</div>
              {data.howToFix.map((fix,i) => (
                <div key={i} style={{ fontSize:12, color:text, lineHeight:1.7, paddingLeft:10 }}>{i+1}. {fix}</div>
              ))}
            </div>
          )}
          {data.example && (
            <div style={{ marginTop:8, padding:"10px 12px", borderRadius:8, background:D?"rgba(34,197,94,0.06)":"rgba(34,197,94,0.03)", border:"1px solid rgba(34,197,94,0.15)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>💡 수정 예시</div>
              <div style={{ fontSize:12, color:text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{data.example}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 사이드바 (기존 유지) ── */
function Sidebar({ menu, setMenu, isDark, text, muted, sideBg, sideBdr, navigate }) {
  const item = (id, active) => ({
    display:"block", width:"100%", textAlign:"left", padding:"10px 14px 10px 36px",
    border:"none", cursor:"pointer", fontSize:13, borderRadius:8, marginBottom:2,
    background: active ? (isDark?"rgba(99,102,241,0.18)":"rgba(99,102,241,0.08)") : "transparent",
    color: active ? "#a5b4fc" : muted, fontWeight: active ? 700 : 400,
    borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
  });
  return (
    <div style={{ width:200, flexShrink:0, background:sideBg, borderRight:"1px solid "+sideBdr, height:"100%", overflowY:"auto", padding:"16px 10px" }}>
      <div style={{ padding:"0 8px 16px", borderBottom:"1px solid "+sideBdr, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:900, color:text }}>SNS메이킷</div>
        <div style={{ fontSize:11, color:muted }}>AI 분석기획기</div>
      </div>
      <div style={{ marginBottom:8, fontSize:10, fontWeight:700, color:muted, letterSpacing:1, padding:"0 8px" }}>MENU</div>
      <button onClick={() => setMenu("home")} style={{ ...item("home",menu==="home"), paddingLeft:14 }}>홈</button>
      <button onClick={() => setMenu("library")} style={{ ...item("library",menu==="library"), paddingLeft:14 }}>내 보관함</button>
      <button onClick={() => setMenu("seo_home")} style={{ ...item("seo_home",menu==="seo_home"), paddingLeft:14 }}>📊 실시간 검색어</button>
      <div style={{ margin:"12px 0 8px", fontSize:11, fontWeight:800, color:text, padding:"0 8px", display:"flex", alignItems:"center", gap:6 }}>🏆 실시간 분석기</div>
      {RANK_ITEMS.map(m => (
        <button key={m.id} onClick={() => setMenu(m.id)} style={item(m.id, menu===m.id)}>{m.icon} {m.label}</button>
      ))}
      <button onClick={() => setMenu("rank_brand")} style={item("rank_brand", menu==="rank_brand")}>🏢 브랜드 TOP100</button>
      <div style={{ margin:"12px 0 8px", fontSize:11, fontWeight:800, color:text, padding:"0 8px", display:"flex", alignItems:"center", gap:6 }}>🔍 SNS 분석기</div>
      {MENU_ITEMS.filter(m => m.id !== "seo_home").map(m => (
        <button key={m.id} onClick={() => setMenu(m.id)} style={item(m.id, menu===m.id)}>{m.icon} {m.label}</button>
      ))}
    </div>
  );
}

/* ── 인플루언서 랭킹 컴포넌트 ── */
const RANK_CATEGORIES = ["전체","뷰티","먹방/요리","IT/테크","패션","게임","교육","여행","운동/건강","엔터","일상/브이로그","키즈","음악","비즈니스"];

function RankingView({ isDark, menu, text, muted, bdr, cardBg }) {
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const [cat, setCat] = useState("전체");
  const [country, setCountry] = useState("한국");
  const [ageGroup, setAgeGroup] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prevMenu, setPrevMenu] = useState(menu);
  const [showFilter, setShowFilter] = useState(false);
  const autoFetched = useRef(false);

  if (menu !== prevMenu) { setPrevMenu(menu); setRanking([]); setCat("전체"); setCountry("한국"); setAgeGroup("전체"); setKeyword(""); setShowFilter(false); autoFetched.current = false; }

  const config = RANK_ITEMS.find(r => r.id === menu);
  if (!config) return null;

  const [detail, setDetail] = useState(null);

  const fetchRanking = async (category) => {
    setLoading(true); setRanking([]); setDetail(null);
    try {
      const { callAI } = await import("./aiClient");
      const urlBase = config.platform==="유튜브"?"https://www.youtube.com/@":config.platform==="인스타그램"?"https://www.instagram.com/":config.platform==="틱톡"?"https://www.tiktok.com/@":config.platform==="네이버 블로그"?"https://blog.naver.com/":"";
      const countryStr = country!=="한국" ? ` 국가:${country}` : "";
      const ageStr = ageGroup!=="전체" ? ` 주요 시청자층:${ageGroup}` : "";
      const kwStr = keyword.trim() ? ` 키워드:"${keyword.trim()}" 관련` : "";
      const prompt = `${country} ${config.platform} ${category==="전체"?"전체":category}${kwStr}${ageStr} 인기 TOP 20. 각: rank,name,category,followers(숫자+만/억),desc(한줄),feature(한줄),url(${urlBase}계정ID),revenue(월 추정 수익),views(월 평균 조회수),age(주요 팬층 연령대). JSON만:{"ranking":[...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 3000);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) setRanking(JSON.parse(m[0]).ranking || []);
    } catch {}
    setLoading(false);
  };

  // 진입 시 자동 로드
  useEffect(() => {
    if (!autoFetched.current && ranking.length === 0 && !loading) {
      autoFetched.current = true;
      fetchRanking("전체");
    }
  });

  const platformColor = config.id==="rank_youtube"?"#ef4444":config.id==="rank_insta"?"#e1306c":config.id==="rank_blog"?"#22c55e":config.id==="rank_tiktok"?"#69c9d0":"#6366f1";

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
            🔧 상세 필터 {showFilter?"▲":"▼"}
          </button>
          {showFilter && (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", padding:"12px 16px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
              <div style={{ minWidth:100 }}>
                <div style={{ fontSize:10, color:muted, marginBottom:4, fontWeight:600 }}>국가</div>
                <select value={country} onChange={e=>setCountry(e.target.value)}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}>
                  {["한국","미국","일본","중국","영국","글로벌"].map(c => <option key={c} value={c}>{c}</option>)}
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
                    <div style={{ fontSize:12, color:muted, marginTop:10, lineHeight:1.6 }}>{r.feature}</div>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, padding:"8px 16px", borderRadius:8,
                          background:platformColor, color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                        {config.icon} 채널 바로가기 →
                      </a>
                    )}
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

/* ── 브랜드 TOP100 ── */
function BrandRankingView({ isDark, text, muted, bdr, cardBg }) {
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const [cat, setCat] = useState("전체");
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [keyword, setKeyword] = useState("");
  const accent = "#6366f1";
  const autoFetched = useRef(false);

  const fetchBrands = async (category) => {
    setLoading(true); setRanking([]); setDetail(null);
    try {
      const { callAI } = await import("./aiClient");
      const kwStr = keyword.trim() ? ` "${keyword.trim()}" 관련` : "";
      const prompt = `한국에서 SNS 마케팅을 잘하는 ${category==="전체"?"전체 업종":category}${kwStr} 브랜드 TOP 20.
각: rank,name(브랜드명),industry(업종),snsScore(SNS 영향력 점수 1~100),revenue(연매출 추정),engagement(SNS 참여율),mainSns(주력 SNS),followers(총 팔로워),strategy(SNS 전략 한줄),website(공식 사이트URL).
JSON만:{"ranking":[...]}`;
      const raw = await callAI("claude-haiku-4-5", [{role:"user",content:prompt}], 3000);
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) setRanking(JSON.parse(m[0]).ranking || []);
    } catch {}
    setLoading(false);
  };

  // 진입 시 자동 로드
  useEffect(() => {
    if (!autoFetched.current && ranking.length === 0 && !loading) {
      autoFetched.current = true;
      fetchBrands("전체");
    }
  });

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text }}>🏢 실시간 브랜드 TOP100</div>
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
                    <div style={{ fontSize:12, color:muted, marginTop:10, lineHeight:1.6 }}>{r.strategy}</div>
                    {r.website && (
                      <a href={r.website.startsWith("http")?r.website:`https://${r.website}`} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, padding:"8px 16px", borderRadius:8,
                          background:accent, color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                        🌐 공식 사이트 →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && ranking.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:6 }}>업종을 선택하면 브랜드를 분석해요</div>
            <div style={{ fontSize:13 }}>위 카테고리 탭을 클릭해주세요</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
