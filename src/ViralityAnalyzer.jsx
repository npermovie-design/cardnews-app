import { useState, useEffect } from "react";

const API = import.meta.env.VITE_SHORTS_FACTORY_URL || (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://shorts-factory-r33o.onrender.com");
const V = `${API}/api/virality`;

function fmt(n) { if (!n) return "0"; if (n >= 1e6) return (n/1e6).toFixed(1)+"M"; if (n >= 1e3) return (n/1e3).toFixed(1)+"K"; return String(n); }

export default function ViralityAnalyzer({ isDark }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";

  const [page, setPage] = useState("videos"); // videos | creators
  const [videos, setVideos] = useState([]);
  const [creators, setCreators] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterCreator, setFilterCreator] = useState(0);
  const [filterConfig, setFilterConfig] = useState(0);
  const [sort, setSort] = useState("views");

  // Modals
  const [selVideo, setSelVideo] = useState(null);
  const [modalTab, setModalTab] = useState("analysis");
  const [analysis, setAnalysis] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Add creator
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);

  // Add video
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoCreator, setNewVideoCreator] = useState(0);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      let url = `${V}/videos?sort=${sort}`;
      if (filterCreator) url += `&creator_id=${filterCreator}`;
      if (filterConfig) url += `&config_id=${filterConfig}`;
      const r = await fetch(url);
      if (r.ok) setVideos(await r.json());
    } catch {}
    setLoading(false);
  };

  const fetchCreators = async () => {
    try { const r = await fetch(`${V}/creators`); if (r.ok) setCreators(await r.json()); } catch {}
  };

  const fetchConfigs = async () => {
    try { const r = await fetch(`${V}/configs`); if (r.ok) setConfigs(await r.json()); } catch {}
  };

  useEffect(() => { fetchCreators(); fetchConfigs(); }, []);
  useEffect(() => { fetchVideos(); }, [sort, filterCreator, filterConfig]);

  const openVideo = async (v) => {
    setSelVideo(v); setModalTab("analysis"); setAnalysis(null); setConcepts([]);
    try {
      const cid = filterConfig || (configs[0]?.id) || 0;
      const r = await fetch(`${V}/videos/${v.id}?config_id=${cid}`);
      if (r.ok) {
        const data = await r.json();
        setAnalysis(data.analysis || null);
        setConcepts(data.concepts || []);
      }
    } catch {}
  };

  const runAnalysis = async (videoId) => {
    setAnalyzing(true);
    try {
      const cid = filterConfig || (configs[0]?.id) || 0;
      const r = await fetch(`${V}/videos/${videoId}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_id: cid || undefined }),
      });
      if (r.ok) {
        const data = await r.json();
        setAnalysis(data.analysis || null);
        setConcepts(data.concepts || []);
        fetchVideos();
      }
    } catch {}
    setAnalyzing(false);
  };

  const addCreator = async () => {
    if (!newUsername.trim()) return;
    setAdding(true);
    try {
      const r = await fetch(`${V}/creators`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.replace("@",""), category: newCategory }),
      });
      if (r.ok) { fetchCreators(); setShowAddCreator(false); setNewUsername(""); setNewCategory(""); }
      else { const d = await r.json(); alert(d.detail || "추가 실패"); }
    } catch {}
    setAdding(false);
  };

  const addVideo = async () => {
    if (!newVideoCreator) return;
    setAdding(true);
    try {
      const r = await fetch(`${V}/videos/manual`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: newVideoCreator, url: newVideoUrl }),
      });
      if (r.ok) { fetchVideos(); setShowAddVideo(false); setNewVideoUrl(""); }
      else { const d = await r.json(); alert(d.detail || "추가 실패"); }
    } catch {}
    setAdding(false);
  };

  const refreshCreator = async (id) => {
    try { await fetch(`${V}/creators/${id}/refresh`, { method: "POST" }); fetchCreators(); } catch {}
  };

  const deleteCreator = async (id) => {
    if (!confirm("이 크리에이터를 삭제하시겠습니까?")) return;
    try { await fetch(`${V}/creators/${id}`, { method: "DELETE" }); fetchCreators(); } catch {}
  };

  const selStyle = (active) => ({
    padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? accent : bdr}`,
    background: active ? (D ? "rgba(124,106,255,0.2)" : "rgba(124,106,255,0.1)") : "transparent",
    color: active ? accent : muted, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer",
  });

  // ── VIDEOS PAGE ──
  const VideosPage = () => (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <select value={filterCreator} onChange={e=>setFilterCreator(+e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12 }}>
          <option value={0}>전체 크리에이터</option>
          {creators.map(c => <option key={c.id} value={c.id}>@{c.username}</option>)}
        </select>
        <select value={filterConfig} onChange={e=>setFilterConfig(+e.target.value)}
          style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12 }}>
          <option value={0}>전체 설정</option>
          {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display:"flex", gap:4 }}>
          {[["views","조회순"],["likes","좋아요순"],["recent","최신순"]].map(([k,l])=>
            <button key={k} onClick={()=>setSort(k)} style={selStyle(sort===k)}>{l}</button>
          )}
        </div>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:11, color:muted }}>{videos.length}개 영상</span>
        <button onClick={()=>setShowAddVideo(true)} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ 영상 추가</button>
      </div>

      {/* Video Grid */}
      {loading ? <div style={{ textAlign:"center", padding:40, color:muted }}>로딩 중...</div> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
          {videos.map(v => (
            <div key={v.id} style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, background:cardBg, cursor:"pointer", transition:"all 0.2s" }}
              onClick={()=>openVideo(v)}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ position:"relative", paddingBottom:"125%", background:"#111" }}>
                {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}
                <div style={{ position:"absolute", bottom:8, left:8, display:"flex", gap:6, fontSize:11, color:"#fff", fontWeight:700, textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}>
                  <span>▶ {fmt(v.views)}</span>
                </div>
                {(v.has_analysis || v.has_concepts) && (
                  <div style={{ position:"absolute", top:8, right:8, display:"flex", gap:4 }}>
                    {v.has_analysis && <span style={{ padding:"2px 6px", borderRadius:4, background:"rgba(124,106,255,0.85)", color:"#fff", fontSize:9, fontWeight:700 }}>분석완료</span>}
                    {v.has_concepts && <span style={{ padding:"2px 6px", borderRadius:4, background:"rgba(236,72,153,0.85)", color:"#fff", fontSize:9, fontWeight:700 }}>콘셉트</span>}
                  </div>
                )}
              </div>
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:text }}>@{v.creator_username || "unknown"}</div>
                <div style={{ display:"flex", gap:10, fontSize:10, color:muted, marginTop:4 }}>
                  <span>♡ {fmt(v.likes)}</span>
                  <span>💬 {fmt(v.comments)}</span>
                  {v.posted_at && <span>{v.posted_at.slice(0,10)}</span>}
                </div>
                {v.caption && <div style={{ fontSize:10, color:muted, marginTop:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.caption.slice(0,60)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && videos.length === 0 && (
        <div style={{ textAlign:"center", padding:60, color:muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📹</div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>영상이 없습니다</div>
          <div style={{ fontSize:12 }}>크리에이터를 추가하고 영상을 수집해보세요</div>
        </div>
      )}
    </div>
  );

  // ── CREATORS PAGE ──
  const CreatorsPage = () => (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <span style={{ fontSize:11, color:muted }}>{creators.length}명의 크리에이터</span>
        <button onClick={()=>setShowAddCreator(true)} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ 크리에이터 추가</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
        {creators.map(c => (
          <div key={c.id} style={{ padding:20, borderRadius:14, border:`1px solid ${bdr}`, background:cardBg }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              {c.profile_pic_url ? <img src={c.profile_pic_url} alt="" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }} />
                : <div style={{ width:44, height:44, borderRadius:"50%", background:D?"rgba(255,255,255,0.1)":"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>👤</div>}
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:text }}>@{c.username}</div>
                {c.category && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:D?"rgba(124,106,255,0.15)":"rgba(124,106,255,0.08)", color:accent, fontWeight:600 }}>{c.category}</span>}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
              {[["팔로워",fmt(c.followers)],["릴스/30일",c.reels_30d||0],["평균조회",fmt(c.avg_views)]].map(([l,v],i)=>
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:16, fontWeight:900, color:text }}>{v}</div>
                  <div style={{ fontSize:9, color:muted, marginTop:2 }}>{l}</div>
                </div>
              )}
            </div>
            {c.scraped_at && <div style={{ fontSize:9, color:muted, marginBottom:8 }}>수집: {c.scraped_at.slice(0,10)}</div>}
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>refreshCreator(c.id)} style={{ flex:1, padding:"6px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>새로고침</button>
              <button onClick={()=>{ setFilterCreator(c.id); setPage("videos"); }} style={{ flex:1, padding:"6px", borderRadius:6, border:`1px solid ${accent}40`, background:`${accent}10`, color:accent, fontSize:11, fontWeight:600, cursor:"pointer" }}>영상 보기</button>
              <button onClick={()=>deleteCreator(c.id)} style={{ padding:"6px 10px", borderRadius:6, border:`1px solid rgba(239,68,68,0.3)`, background:"transparent", color:"#ef4444", fontSize:11, cursor:"pointer" }}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── ANALYSIS MODAL ──
  const AnalysisModal = () => {
    if (!selVideo) return null;
    return (
      <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
        onClick={()=>setSelVideo(null)}>
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }} />
        <div style={{ position:"relative", width:"90%", maxWidth:800, maxHeight:"85vh", overflowY:"auto", borderRadius:16,
          background:D?"#1a1a2e":"#fff", border:`1px solid ${bdr}`, padding:0 }}
          onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${bdr}`, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, background:D?"#1a1a2e":"#fff", zIndex:1 }}>
            {selVideo.thumbnail_url && <img src={selVideo.thumbnail_url} alt="" style={{ width:48, height:48, borderRadius:8, objectFit:"cover" }} />}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:text }}>@{selVideo.creator_username}</div>
              <div style={{ fontSize:11, color:muted }}>▶ {fmt(selVideo.views)} · ♡ {fmt(selVideo.likes)} · 💬 {fmt(selVideo.comments)}</div>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {[["analysis","분석"],["concepts","콘셉트"]].map(([k,l])=>
                <button key={k} onClick={()=>setModalTab(k)} style={selStyle(modalTab===k)}>{l}</button>
              )}
            </div>
            <button onClick={()=>setSelVideo(null)} style={{ background:"none", border:"none", color:muted, fontSize:20, cursor:"pointer" }}>✕</button>
          </div>

          {/* Content */}
          <div style={{ padding:20 }}>
            {!analysis && !concepts.length ? (
              <div style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:14, color:muted, marginBottom:16 }}>아직 분석되지 않은 영상입니다</div>
                <button onClick={()=>runAnalysis(selVideo.id)} disabled={analyzing}
                  style={{ padding:"12px 24px", borderRadius:10, border:"none", background:accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:analyzing?0.6:1 }}>
                  {analyzing ? "분석 중..." : "AI 분석 실행"}
                </button>
              </div>
            ) : modalTab === "analysis" && analysis ? (
              <div>
                {[["HOOK",analysis.hook_analysis],["RETENTION",analysis.retention_analysis],["SCRIPT",analysis.script_analysis]].map(([title,content])=>
                  content ? (
                    <div key={title} style={{ marginBottom:20 }}>
                      <div style={{ display:"inline-block", padding:"4px 12px", borderRadius:6, background:D?"rgba(124,106,255,0.2)":"rgba(124,106,255,0.1)", color:accent, fontSize:12, fontWeight:900, marginBottom:10 }}>{title}</div>
                      <div style={{ fontSize:13, lineHeight:1.8, color:text, whiteSpace:"pre-wrap" }}>{content}</div>
                    </div>
                  ) : null
                )}
                {analysis.full_analysis && (
                  <div style={{ marginTop:20, padding:16, borderRadius:12, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:8 }}>전체 분석</div>
                    <div style={{ fontSize:12, lineHeight:1.7, color:text, whiteSpace:"pre-wrap" }}>{analysis.full_analysis}</div>
                  </div>
                )}
              </div>
            ) : modalTab === "concepts" && concepts.length > 0 ? (
              <div>
                {concepts.map((c,i) => (
                  <div key={i} style={{ marginBottom:24, padding:20, borderRadius:14, border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                    <div style={{ fontSize:11, fontWeight:900, color:"#ec4899", marginBottom:6 }}>CONCEPT {i+1}</div>
                    <div style={{ fontSize:16, fontWeight:900, color:text, marginBottom:8 }}>{c.title}</div>
                    {c.description && <div style={{ fontSize:13, color:muted, marginBottom:12, lineHeight:1.6 }}>{c.description}</div>}
                    {c.hook && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:"inline-block", padding:"3px 10px", borderRadius:5, background:"rgba(34,197,94,0.15)", color:"#22c55e", fontSize:11, fontWeight:800, marginBottom:6 }}>HOOK</div>
                        <div style={{ fontSize:13, lineHeight:1.7, color:text, whiteSpace:"pre-wrap" }}>{c.hook}</div>
                      </div>
                    )}
                    {c.script && (
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:"inline-block", padding:"3px 10px", borderRadius:5, background:"rgba(124,106,255,0.15)", color:accent, fontSize:11, fontWeight:800, marginBottom:6 }}>SCRIPT</div>
                        <div style={{ fontSize:13, lineHeight:1.7, color:text, whiteSpace:"pre-wrap" }}>{c.script}</div>
                      </div>
                    )}
                    {c.why_it_works && (
                      <div>
                        <div style={{ display:"inline-block", padding:"3px 10px", borderRadius:5, background:"rgba(245,158,11,0.15)", color:"#f59e0b", fontSize:11, fontWeight:800, marginBottom:6 }}>WHY IT WORKS</div>
                        <div style={{ fontSize:13, lineHeight:1.7, color:text, whiteSpace:"pre-wrap" }}>{c.why_it_works}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:40, color:muted }}>
                <div style={{ fontSize:14 }}>{modalTab === "analysis" ? "분석 데이터가 없습니다" : "콘셉트가 없습니다"}</div>
                <button onClick={()=>runAnalysis(selVideo.id)} disabled={analyzing}
                  style={{ marginTop:12, padding:"10px 20px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {analyzing ? "분석 중..." : "AI 분석 실행"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding:"24px 24px 60px", maxWidth:1100, margin:"0 auto" }}>
      {/* Page Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[["videos","영상"],["creators","크리에이터"]].map(([k,l])=>
          <button key={k} onClick={()=>setPage(k)}
            style={{ padding:"8px 18px", borderRadius:8, border:`1px solid ${page===k?accent:bdr}`,
              background:page===k?(D?"rgba(124,106,255,0.15)":"rgba(124,106,255,0.08)"):"transparent",
              color:page===k?accent:muted, fontSize:13, fontWeight:page===k?700:400, cursor:"pointer" }}>
            {l}
          </button>
        )}
      </div>

      {page === "videos" ? <VideosPage /> : <CreatorsPage />}

      {/* Modals */}
      {selVideo && <AnalysisModal />}

      {/* Add Creator Modal */}
      {showAddCreator && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowAddCreator(false)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"relative", width:400, borderRadius:16, background:D?"#1a1a2e":"#fff", padding:24, border:`1px solid ${bdr}` }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:900, color:text, marginBottom:16 }}>크리에이터 추가</div>
            <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="@username"
              style={{ width:"100%", padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, marginBottom:10, boxSizing:"border-box" }} />
            <input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="카테고리 (선택)"
              style={{ width:"100%", padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, marginBottom:16, boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowAddCreator(false)} style={{ flex:1, padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>취소</button>
              <button onClick={addCreator} disabled={adding||!newUsername.trim()}
                style={{ flex:1, padding:10, borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:adding?0.6:1 }}>
                {adding ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showAddVideo && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowAddVideo(false)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"relative", width:400, borderRadius:16, background:D?"#1a1a2e":"#fff", padding:24, border:`1px solid ${bdr}` }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:900, color:text, marginBottom:16 }}>영상 추가</div>
            <select value={newVideoCreator} onChange={e=>setNewVideoCreator(+e.target.value)}
              style={{ width:"100%", padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, marginBottom:10, boxSizing:"border-box" }}>
              <option value={0}>크리에이터 선택</option>
              {creators.map(c => <option key={c.id} value={c.id}>@{c.username}</option>)}
            </select>
            <input value={newVideoUrl} onChange={e=>setNewVideoUrl(e.target.value)} placeholder="Instagram 릴스 URL (선택)"
              style={{ width:"100%", padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, marginBottom:16, boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowAddVideo(false)} style={{ flex:1, padding:10, borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>취소</button>
              <button onClick={addVideo} disabled={adding||!newVideoCreator}
                style={{ flex:1, padding:10, borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:adding?0.6:1 }}>
                {adding ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
