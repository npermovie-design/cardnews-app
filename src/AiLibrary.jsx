import { useState, useEffect } from "react";
import { useI18n } from "./i18n.jsx";
import { deleteLibraryItem, syncLocalLibrary, supabase, upsertLibraryItem } from "./storage";
import { getConsultingSaves, CONSULTING_SAVES_KEY } from "./SnsConsulting";

// 기획 저장 헬퍼 (LibraryPage에서 사용)
const PLAN_SAVES_KEY = "nper_plans_v1";
function getPlanSaves() { try { return JSON.parse(localStorage.getItem(PLAN_SAVES_KEY)||"[]"); } catch { return []; } }
function deletePlan(id) { try { localStorage.setItem(PLAN_SAVES_KEY, JSON.stringify(getPlanSaves().filter(x=>x.id!==id))); } catch {} }

/* ════════════════════════════════════════════════════════════
   AI 보관함 (Library) - 블로그/카드뉴스/상세페이지 저장 관리
════════════════════════════════════════════════════════════ */

const BLOG_SAVES_KEY = "sns_blog_saves_v1";
function getCurrentUid() {
  try { return JSON.parse(localStorage.getItem("nper_user") || "null")?.uid || null; } catch { return null; }
}
function setLocalList(key, list, limit = 100) {
  try { localStorage.setItem(key, JSON.stringify((list || []).slice(0, limit))); } catch(e) {}
}
function getBlogSaves() { try { return JSON.parse(localStorage.getItem(BLOG_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function saveBlogWork(item) {
  const list = getBlogSaves().filter(x => x.id !== item.id);
  list.unshift(item);
  setLocalList(BLOG_SAVES_KEY, list, 100);
  const uid = getCurrentUid();
  if (uid) upsertLibraryItem(uid, "blog", item);
}
function deleteBlogWork(id) {
  setLocalList(BLOG_SAVES_KEY, getBlogSaves().filter(x => x.id !== id), 100);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "blog", id);
}
const CARD_SAVES_KEY = "nper_saved_works_v2";
function getCardSaves() { try { return JSON.parse(localStorage.getItem(CARD_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteCardWork(id) {
  setLocalList(CARD_SAVES_KEY, getCardSaves().filter(x => x.id !== id), 100);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "card", id);
}
const DETAIL_SAVES_KEY = "nper_detail_saves_v1";
function getDetailSaves() { try { return JSON.parse(localStorage.getItem(DETAIL_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteDetailSave(id) {
  setLocalList(DETAIL_SAVES_KEY, getDetailSaves().filter(x => x.id !== id), 50);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "detail", id);
}
const IMGCARD_SAVES_KEY = "nper_imgcard_saves_v1";
function getImgCardSaves() { try { return JSON.parse(localStorage.getItem(IMGCARD_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteImgCardSave(id) {
  setLocalList(IMGCARD_SAVES_KEY, getImgCardSaves().filter(x => x.id !== id), 50);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "imgcard", id);
}
const SIMPLEDETAIL_SAVES_KEY = "nper_simpledetail_saves_v1";
function getSimpleDetailSaves() { try { return JSON.parse(localStorage.getItem(SIMPLEDETAIL_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function deleteSimpleDetailSave(id) {
  setLocalList(SIMPLEDETAIL_SAVES_KEY, getSimpleDetailSaves().filter(x => x.id !== id), 50);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "simpledetail", id);
}
const PPT_SAVES_KEY = "nper_ppt_saves_v1";
function getPptSaves() { try { return JSON.parse(localStorage.getItem(PPT_SAVES_KEY) || "[]"); } catch(e) { return []; } }
function savePptWork(item) {
  const list = getPptSaves().filter(x => x.id !== item.id);
  list.unshift(item);
  setLocalList(PPT_SAVES_KEY, list, 50);
  const uid = getCurrentUid();
  if (uid) upsertLibraryItem(uid, "ppt", item);
}
function deletePptWork(id) {
  setLocalList(PPT_SAVES_KEY, getPptSaves().filter(x => x.id !== id), 50);
  const uid = getCurrentUid();
  if (uid) deleteLibraryItem(uid, "ppt", id);
}

// ── LibraryPage 컴포넌트 ──────────────────────────────────────────────────────
function LibraryPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu, renderFooter, user }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("blog");
  const [blogList, setBlogList] = useState(getBlogSaves);
  const [cardList, setCardList] = useState(getCardSaves);
  const [detailList, setDetailList] = useState(getDetailSaves);
  const [imgCardList, setImgCardList] = useState(getImgCardSaves);
  const [simpleDetailList, setSimpleDetailList] = useState(getSimpleDetailSaves);
  const [pptList, setPptList] = useState(getPptSaves);
  const [docList, setDocList] = useState(getPlanSaves);
  const [consultList, setConsultList] = useState(getConsultingSaves);
  const [search, setSearch] = useState("");
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedConsult, setSelectedConsult] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    (async () => {
      const syncs = await Promise.all([
        syncLocalLibrary(user.uid, "blog", getBlogSaves()),
        syncLocalLibrary(user.uid, "card", getCardSaves()),
        syncLocalLibrary(user.uid, "detail", getDetailSaves()),
        syncLocalLibrary(user.uid, "imgcard", getImgCardSaves()),
        syncLocalLibrary(user.uid, "simpledetail", getSimpleDetailSaves()),
        syncLocalLibrary(user.uid, "ppt", getPptSaves()),
        syncLocalLibrary(user.uid, "consulting", getConsultingSaves()),
      ]);
      if (!alive) return;
      const [blogs, cards, details, imgCards, simpleDetails, ppts, consulting] = syncs;
      setLocalList(BLOG_SAVES_KEY, blogs, 100);
      setLocalList(CARD_SAVES_KEY, cards, 100);
      setLocalList(DETAIL_SAVES_KEY, details, 50);
      setLocalList(IMGCARD_SAVES_KEY, imgCards, 50);
      setLocalList(SIMPLEDETAIL_SAVES_KEY, simpleDetails, 50);
      setLocalList(PPT_SAVES_KEY, ppts, 50);
      setBlogList(blogs);
      setCardList(cards);
      setDetailList(details);
      setImgCardList(imgCards);
      setSimpleDetailList(simpleDetails);
      setPptList(ppts);
      try { localStorage.setItem(CONSULTING_SAVES_KEY, JSON.stringify((consulting || []).slice(0, 50))); } catch {}
      setConsultList(consulting || []);
    })();
    return () => { alive = false; };
  }, [user?.uid]);

  const text  = homeText;
  const muted = homeMuted;
  const bdr   = cardBdr;
  const bg    = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const filteredBlog = blogList.filter(x =>
    x.type !== "shorts" && (!search || x.title.toLowerCase().includes(search.toLowerCase()) || (x.type||"").includes(search))
  );
  const filteredCard = cardList.filter(x =>
    !search || (x.topic||"").toLowerCase().includes(search.toLowerCase())
  );
  const total = blogList.length + cardList.length + detailList.length + imgCardList.length + simpleDetailList.length + pptList.length + docList.length + consultList.length;

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

      {/* 탭 */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background: isDark?"rgba(255,255,255,0.05)":"#e9e9ef", borderRadius:10, padding:4, width:"fit-content", flexWrap:"wrap" }}>
        {[
          ["blog","글 생성", blogList.filter(x=>x.type!=="shorts").length],
          ["shorts","영상 편집", blogList.filter(x=>x.type==="shorts").length],
          ["consulting","SNS 사주팔자", consultList.length],
        ].map(([id, label, cnt]) => (
          <button key={id} onClick={()=>{ setTab(id); setSelectedBlog(null); setSelectedDoc(null); setSelectedConsult(null); }}
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
      {tab === "shorts" && (() => {
        const shortsList = blogList.filter(x => x.type === "shorts");
        return (
          <div>
            {shortsList.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 저장된 영상이 없어요</div>
                <div style={{ fontSize:13, lineHeight:1.8 }}>영상 편집 후 자동으로 여기 저장됩니다</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
                {shortsList.map(s => (
                  <div key={s.id} style={{ padding:"16px", borderRadius:12, border:`1px solid ${bdr}`, background:bg, cursor:"pointer" }}>
                    {s.videoUrl && <video src={s.videoUrl} controls style={{ width:"100%", borderRadius:8, marginBottom:10 }} />}
                    <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>{s.title || "영상"}</div>
                    <div style={{ fontSize:11, color:muted }}>{s.date}</div>
                    <button onClick={() => { deleteBlogWork(s.id); setBlogList(getBlogSaves()); }}
                      style={{ marginTop:8, fontSize:11, color:"#f87171", background:"none", border:"none", cursor:"pointer", padding:0 }}>삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
      {tab === "cardnews" && (
        <>
          {(filteredCard.length + imgCardList.length) === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="3" y="3" width="28" height="28" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
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
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)"} strokeWidth="1.5"><rect x="3" y="3" width="28" height="28" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
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
              {imgCardList.map(item => (
                <div key={item.id}
                  style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                  {(item.thumb||item.thumbnail) ? (
                    <img src={item.thumb||item.thumbnail} alt={item.topic} style={{ width:"100%", aspectRatio:"1", objectFit:"cover", display:"block" }} />
                  ) : (
                    <div style={{ width:"100%", aspectRatio:"1", background: isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.06)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.2)"} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </div>
                  )}
                  <div style={{ padding:"12px 12px 10px" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic||"제목 없음"}</div>
                    <div style={{ fontSize:11, color:muted, marginBottom:10 }}>{item.count||item.slides?.length||0}장 · {item.date}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{try{localStorage.setItem("nper_open_card",JSON.stringify(item));}catch{}setAiMenu("cardnews_simple_open");}}
                        style={{ flex:1, padding:"6px 0", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:accent, fontSize:11, fontWeight:700, cursor:"pointer" }}>열기</button>
                      <button onClick={()=>{deleteImgCardSave(item.id);setImgCardList(getImgCardSaves());}}
                        style={{ padding:"6px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>삭제</button>
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

      {/* PPT 탭 */}
      {tab === "ppt" && (
        <>
          {pptList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 생성한 PPT가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>PPT 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("ppt")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
                PPT 만들기 →
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {pptList.map(item => (
                <div key={item.id}
                  style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.topic||"제목 없음"}</div>
                    <div style={{ fontSize:12, color:muted }}>{item.slideCount||0}장 · {item.date}</div>
                  </div>
                  <button onClick={()=>{deletePptWork(item.id);setPptList(getPptSaves());}}
                    style={{ flexShrink:0, padding:"4px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 문서 탭 */}
      {tab === "doc" && (
        <>
          {docList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ width:48, height:48, borderRadius:12, background:"rgba(99,102,241,0.1)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:6, color:text }}>아직 생성한 문서가 없어요</div>
              <div style={{ fontSize:13, lineHeight:1.8 }}>비즈니스 문서 생성 후 자동으로 여기 저장됩니다</div>
              <button onClick={()=>setAiMenu("prompt_studio")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700 }}>
                문서 작성하기 →
              </button>
            </div>
          ) : selectedDoc ? (
            <div>
              <button onClick={()=>setSelectedDoc(null)}
                style={{ marginBottom:14, padding:"7px 14px", borderRadius:8, border:`1px solid ${bdr}`,
                  background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
                ← 목록으로
              </button>
              <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:16, padding:"24px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:6,
                    background: isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)", color:accent }}>
                    {selectedDoc.docType||"문서"}
                  </span>
                  <span style={{ fontSize:11, color:muted }}>{selectedDoc.date}</span>
                </div>
                <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:20 }}>{selectedDoc.input||"제목 없음"}</div>
                <div style={{ fontSize:14, color:isDark?"rgba(255,255,255,0.75)":"#333", lineHeight:2,
                  whiteSpace:"pre-wrap", background: isDark?"rgba(255,255,255,0.03)":"#f9f9f9",
                  borderRadius:12, padding:"20px 22px", border:`1px solid ${bdr}` }}>
                  {selectedDoc.result}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button onClick={()=>{navigator.clipboard.writeText(selectedDoc.result);}}
                    style={{ padding:"9px 18px", borderRadius:9, border:`1px solid ${bdr}`,
                      background:"transparent", color:accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    복사
                  </button>
                  <button onClick={()=>{deletePlan(selectedDoc.id);setDocList(getPlanSaves());setSelectedDoc(null);}}
                    style={{ padding:"9px 18px", borderRadius:9, border:"1px solid rgba(248,113,113,0.3)",
                      background:"transparent", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {docList.map(item => (
                <div key={item.id} onClick={()=>setSelectedDoc(item)}
                  style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:14, transition:"opacity 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5,
                        background: isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)", color:accent }}>
                        {item.docType||"문서"}
                      </span>
                      <span style={{ fontSize:11, color:muted }}>{item.date}</span>
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {item.input||"제목 없음"}
                    </div>
                    <div style={{ fontSize:12, color:muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.6 }}>
                      {item.result?.slice(0,80)}...
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();deletePlan(item.id);setDocList(getPlanSaves());}}
                    style={{ flexShrink:0, padding:"4px 10px", borderRadius:7, border:"none", background:"rgba(248,113,113,0.1)", color:"#f87171", fontSize:11, cursor:"pointer" }}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SNS 이미지 탭 (레거시 - 숨김) */}
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
      {/* 공유 템플릿 탭 */}
      {tab === "shared" && <SharedTemplatesTab isDark={isDark} text={text} muted={muted} bdr={bdr} bg={bg} accent={accent} setAiMenu={setAiMenu} />}

      {/* SNS 사주팔자 탭 */}
      {tab === "consulting" && (() => {
        if (selectedConsult) {
          return (
            <div>
              <button onClick={() => setSelectedConsult(null)} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:16, fontFamily:"inherit" }}>
                ← 목록으로
              </button>
              <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:16, padding:"24px 20px" }}>
                <div style={{ fontSize:18, fontWeight:800, color:text, marginBottom:8 }}>{selectedConsult.title}</div>
                <div style={{ fontSize:12, color:muted, marginBottom:4 }}>{selectedConsult.date} · {selectedConsult.sns}</div>
                <div style={{ fontSize:12, color:muted, marginBottom:16 }}>MBTI: {selectedConsult.mbti || "-"} · 직업: {selectedConsult.job || "-"}</div>
                <hr style={{ border:"none", borderTop:`1px solid ${bdr}`, margin:"12px 0 16px" }} />
                <div style={{ fontSize:14, lineHeight:2, color:text, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{selectedConsult.content}</div>
                <div style={{ display:"flex", gap:8, marginTop:20 }}>
                  <button onClick={() => {
                    navigator.clipboard.writeText(selectedConsult.content);
                  }} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    복사
                  </button>
                  <button onClick={() => {
                    const printWin = window.open("", "_blank", "width=800,height=600");
                    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${selectedConsult.title}</title>
                      <style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:2;font-size:15px}
                      h1{font-size:20px}p.meta{font-size:13px;color:#888;margin-bottom:20px}@media print{body{margin:20px auto}}</style></head>
                      <body><h1>${selectedConsult.title}</h1><p class="meta">${selectedConsult.date} · ${selectedConsult.sns} · MBTI: ${selectedConsult.mbti||"-"}</p>
                      <div style="white-space:pre-wrap">${selectedConsult.content}</div></body></html>`);
                    printWin.document.close();
                    setTimeout(() => printWin.print(), 300);
                  }} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    인쇄 / PDF
                  </button>
                  <button onClick={() => {
                    const list = getConsultingSaves().filter(x => x.id !== selectedConsult.id);
                    try { localStorage.setItem(CONSULTING_SAVES_KEY, JSON.stringify(list)); } catch {}
                    if (user?.uid) deleteLibraryItem(user.uid, "consulting", selectedConsult.id);
                    setConsultList(list);
                    setSelectedConsult(null);
                  }} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #ef4444", background:"transparent", color:"#ef4444", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" }}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          );
        }
        const filtered = consultList.filter(x => !search || x.title.toLowerCase().includes(search.toLowerCase()) || (x.sns||"").includes(search));
        if (!filtered.length) return <div style={{ textAlign:"center", padding:"60px 0", color:muted, fontSize:14 }}>저장된 SNS 사주팔자 결과가 없습니다</div>;
        return (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map(item => (
              <div key={item.id} onClick={() => setSelectedConsult(item)} style={{
                padding:"16px 18px", borderRadius:14, border:`1px solid ${bdr}`,
                background:bg, cursor:"pointer", transition:"border-color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:text }}>{item.title}</span>
                  <span style={{ fontSize:11, color:muted }}>{item.date}</span>
                </div>
                <div style={{ fontSize:12, color:muted }}>{item.sns} · MBTI: {item.mbti || "-"} · {item.job || "-"}</div>
                <div style={{ fontSize:12, color:muted, marginTop:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {item.content?.slice(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      </div>{/* maxWidth:800 */}
      {renderFooter && renderFooter()}
    </div>
  );
}

// ── 공유 템플릿 탭 컴포넌트 ──────────────────────────────────────────────────────
function SharedTemplatesTab({ isDark, text, muted, bdr, bg, accent, setAiMenu }) {
  const [subTab, setSubTab] = useState("mine"); // "mine" | "community"
  const [myTemplates, setMyTemplates] = useState([]);
  const [communityTemplates, setCommunityTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // 내 템플릿 로드
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("nper_shared_templates_mine") || "[]");
      setMyTemplates(list);
    } catch { setMyTemplates([]); }
  }, []);

  // 커뮤니티 템플릿 로드
  useEffect(() => {
    if (subTab !== "community") return;
    setLoading(true);
    (async () => {
      try {
        // Supabase 시도
        const { supabase } = await import("./storage");
        if (supabase) {
          const { data, error } = await supabase.from("shared_templates").select("*").order("created_at", { ascending: false }).limit(50);
          if (!error && data && data.length > 0) {
            setCommunityTemplates(data);
            setLoading(false);
            return;
          }
        }
      } catch {}
      // localStorage 폴백
      try {
        const list = JSON.parse(localStorage.getItem("nper_shared_templates_community") || "[]");
        setCommunityTemplates(list);
      } catch { setCommunityTemplates([]); }
      setLoading(false);
    })();
  }, [subTab]);

  const handleUse = (tmpl) => {
    try {
      // 템플릿 데이터를 localStorage에 저장하고 카드뉴스 메뉴로 이동
      const slidesData = typeof tmpl.slides_data === "string" ? JSON.parse(tmpl.slides_data) : tmpl.slides_data;
      localStorage.setItem("nper_open_card", JSON.stringify({
        id: "shared_" + tmpl.id,
        topic: tmpl.title,
        count: tmpl.slide_count || slidesData?.length || 0,
        slides: slidesData || [],
        gs: { key: tmpl.preset_key, label: tmpl.preset_label },
        sted: {},
      }));
      // use_count 증가 시도
      (async () => {
        try {
          const { supabase } = await import("./storage");
          if (supabase) await supabase.from("shared_templates").update({ use_count: (tmpl.use_count || 0) + 1 }).eq("id", tmpl.id);
        } catch {}
      })();
      setAiMenu("cardnews_simple_open");
    } catch { alert("템플릿 불러오기에 실패했습니다."); }
  };

  const handleUnshare = (tmpl) => {
    if (!window.confirm("공유를 취소하시겠습니까?")) return;
    try {
      const list = JSON.parse(localStorage.getItem("nper_shared_templates_mine") || "[]");
      const updated = list.filter(x => x.id !== tmpl.id);
      localStorage.setItem("nper_shared_templates_mine", JSON.stringify(updated));
      setMyTemplates(updated);
      // Supabase에서도 삭제 시도
      (async () => {
        try {
          const { supabase } = await import("./storage");
          if (supabase) await supabase.from("shared_templates").delete().eq("id", tmpl.id);
        } catch {}
      })();
      // 커뮤니티 localStorage에서도 삭제
      try {
        const comList = JSON.parse(localStorage.getItem("nper_shared_templates_community") || "[]");
        localStorage.setItem("nper_shared_templates_community", JSON.stringify(comList.filter(x => x.id !== tmpl.id)));
      } catch {}
    } catch {}
  };

  const TemplateCard = ({ tmpl, showUnshare }) => (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* 미리보기 이미지 */}
      <div style={{ width: "100%", aspectRatio: "1", background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.06)", overflow: "hidden", position: "relative" }}>
        {tmpl.preview ? (
          <img src={tmpl.preview} alt={tmpl.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: muted, fontWeight: 700 }}>미리보기 없음</div>
        )}
        {tmpl.slide_count && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5 }}>{tmpl.slide_count}장</div>
        )}
      </div>
      {/* 정보 */}
      <div style={{ padding: "12px 12px 10px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tmpl.title || "제목 없음"}</div>
        <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>{tmpl.author || "익명"}</div>
        {tmpl.preset_label && (
          <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginBottom: 8 }}>{tmpl.preset_label}</div>
        )}
        <div style={{ marginTop: "auto", display: "flex", gap: 6 }}>
          <button onClick={() => handleUse(tmpl)}
            style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
            사용하기
          </button>
          {showUnshare && (
            <button onClick={() => handleUnshare(tmpl)}
              style={{ padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(248,113,113,0.1)", color: "#f87171", fontSize: 11, fontWeight: 600 }}>
              공유 취소
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const templates = subTab === "mine" ? myTemplates : communityTemplates;

  return (
    <>
      {/* 서브탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: isDark ? "rgba(255,255,255,0.05)" : "#e9e9ef", borderRadius: 8, padding: 3, width: "fit-content" }}>
        {[["mine", "내 템플릿"], ["community", "커뮤니티"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: subTab === id ? (isDark ? "rgba(99,102,241,0.5)" : "#fff") : "transparent",
              color: subTab === id ? (isDark ? "#fff" : accent) : muted,
              boxShadow: subTab === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#7c6aff", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13 }}>불러오는 중...</div>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.1)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 20 }}>
            {subTab === "mine" ? "📤" : "🌍"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: text }}>
            {subTab === "mine" ? "아직 공유한 템플릿이 없어요" : "아직 공유된 템플릿이 없어요"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            {subTab === "mine" ? "카드뉴스 편집 화면에서 '템플릿 공유' 버튼을 눌러보세요" : "다른 사용자가 템플릿을 공유하면 여기 표시됩니다"}
          </div>
          <button onClick={() => setAiMenu("cardnews_simple")}
            style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            카드뉴스 만들기 →
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
          {templates.map(tmpl => <TemplateCard key={tmpl.id} tmpl={tmpl} showUnshare={subTab === "mine"} />)}
        </div>
      )}
    </>
  );
}


export { getBlogSaves, saveBlogWork, deleteBlogWork, getCardSaves, deleteCardWork, getDetailSaves, deleteDetailSave, getImgCardSaves, deleteImgCardSave, getSimpleDetailSaves, deleteSimpleDetailSave, getPptSaves, savePptWork, deletePptWork, LibraryPage, SharedTemplatesTab };
