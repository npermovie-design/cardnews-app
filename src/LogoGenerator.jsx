import { useState, useRef } from "react";
import { changePoints } from "./storage";

const LOGO_STYLES = [
  { id:"free",       label:"자유로운 로고",      desc:"창의적·독창적",       color:"#ec4899", bg:"rgba(236,72,153,0.15)" },
  { id:"symbol_kr",  label:"한글 심볼 로고",     desc:"한글 타이포 중심",    color:"#6366f1", bg:"rgba(99,102,241,0.15)" },
  { id:"letter_en",  label:"영문 레터링·캐릭터", desc:"영문 + 캐릭터 혼합",  color:"#8b5cf6", bg:"rgba(139,92,246,0.15)" },
  { id:"calli_en",   label:"영문 캘리그라피",    desc:"손글씨 스타일",       color:"#a78bfa", bg:"rgba(167,139,250,0.15)" },
  { id:"simple_en",  label:"심플 영문 레터링",   desc:"깔끔한 영문",         color:"#06b6d4", bg:"rgba(6,182,212,0.15)" },
  { id:"illust",     label:"일러스트 심볼",      desc:"그림 + 심볼",         color:"#10b981", bg:"rgba(16,185,129,0.15)" },
  { id:"flat",       label:"플랫 심볼",          desc:"납작한 아이콘",       color:"#f59e0b", bg:"rgba(245,158,11,0.15)" },
  { id:"vintage",    label:"빈티지 심볼",        desc:"클래식·레트로",       color:"#d97706", bg:"rgba(217,119,6,0.15)" },
  { id:"character",  label:"캐릭터 심볼",        desc:"귀여운 마스코트",     color:"#f43f5e", bg:"rgba(244,63,94,0.15)" },
  { id:"minimal",    label:"미니멀 심볼",        desc:"단순·미니멀",         color:"#64748b", bg:"rgba(100,116,139,0.15)" },
  { id:"line",       label:"라인 심볼",          desc:"선 드로잉 스타일",    color:"#475569", bg:"rgba(71,85,105,0.15)" },
];

const INDUSTRIES = ["카페/음식점","패션/의류","뷰티/화장품","IT/테크","교육","헬스/운동","여행/레저","부동산/인테리어","컨설팅/전문직","기타"];

const STYLE_GUIDES = {
  free:      "creative unique logo design original concept",
  symbol_kr: "Korean Hangul typography logo Korean lettering as main visual element",
  letter_en: "English lettering logo combined with character or mascot illustration",
  calli_en:  "elegant English calligraphy handwriting style logo",
  simple_en: "clean minimalist English typographic logo",
  illust:    "illustrated symbol logo flat illustration style icon",
  flat:      "flat design geometric icon symbol logo",
  vintage:   "vintage retro style logo classic typography decorative elements",
  character: "cute friendly mascot character logo cartoon style",
  minimal:   "minimalist logo clean lines simple geometric symbol",
  line:      "line art logo thin outline strokes drawing style",
};

async function callAPI(prompt, refB64, refMime) {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, productImageB64: refB64 || null, productImageMime: refMime || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `서버 오류 (${res.status})`);
  if (!data.image) throw new Error("이미지 데이터 없음 - API 응답: " + JSON.stringify(data).slice(0, 200));
  return data.image;
}

export default function LogoGenerator({ isDark, user }) {
  const D = isDark;
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.5)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const inputBdr= D ? "rgba(255,255,255,0.15)" : "#ddd";

  const [step,      setStep]      = useState(0);
  const [selStyle,  setSelStyle]  = useState(null);
  const [name,      setName]      = useState("");
  const [industry,  setIndustry]  = useState("");
  const [desc,      setDesc]      = useState("");
  const [colorPref, setColorPref] = useState("");
  const [bgColor,   setBgColor]   = useState("white");
  const [refImage,  setRefImage]  = useState(null);
  const [refMime,   setRefMime]   = useState(null);
  const refFileRef = useRef(null);

  const [results,   setResults]   = useState([]);
  const [genIdx,    setGenIdx]    = useState(0);
  const [error,     setError]     = useState("");
  const [selResult, setSelResult] = useState(0);

  const inp = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const handleRef = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setRefImage(ev.target.result.split(",")[1]); setRefMime(f.type); };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const canGenerate = selStyle && name.trim() && industry;

  const generate = async () => {
    if (!canGenerate) return;
    setStep(2); setResults([]); setError(""); setGenIdx(0);
    const styleLabel = LOGO_STYLES.find(s => s.id === selStyle)?.label || selStyle;
    const basePrompt = `Professional ${STYLE_GUIDES[selStyle] || "logo"}. Brand: "${name.trim()}". Industry: ${industry}.${desc ? ` Description: ${desc}.` : ""}${colorPref ? ` Colors: ${colorPref}.` : ""} Background: ${bgColor === "dark" ? "dark" : "white/light"}. High quality, centered, commercial use, no watermarks, square format, single logo only.`;

    const vers = new Array(4).fill(null);
    for (let i = 0; i < 4; i++) {
      setGenIdx(i);
      try {
        const raw = await callAPI(
          basePrompt + ` (variation ${i + 1})`,
          i === 0 ? refImage : null,
          i === 0 ? refMime : null
        );
        // API가 raw base64 또는 data URI 둘 다 반환할 수 있음
        const dataUri = raw.startsWith("data:") ? raw : "data:image/png;base64," + raw;
        vers[i] = dataUri;
        setResults([...vers]);
      } catch (e) {
        vers[i] = null;
        setResults([...vers]);
        if (i === 0) { setError(e.message); setStep(1); return; }
      }
    }
    setGenIdx(-1);
    if (user?.uid) changePoints(user.uid, -40, "로고 생성 (4버전)").catch(() => {});
    setSelResult(vers.findIndex(v => v !== null));
    setStep(3);
  };

  const download = (i) => {
    if (!results[i]) return;
    const a = document.createElement("a");
    a.href = results[i];
    a.download = `logo_${name.replace(/\s+/g,"_")}_v${i+1}.png`;
    a.click();
  };

  const reset = () => {
    setStep(0); setResults([]); setError("");
    setSelStyle(null); setName(""); setIndustry("");
    setDesc(""); setColorPref(""); setBgColor("white");
    setRefImage(null); setRefMime(null);
  };

  // ── STEP 0: 인트로
  if (step === 0) return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ maxWidth:540, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:60, marginBottom:14 }}>🏷</div>
        <div style={{ display:"inline-block", padding:"4px 16px", borderRadius:20, background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.3)", fontSize:12, fontWeight:700, color:"#06b6d4", marginBottom:14 }}>
          AI 로고 생성 · 4가지 버전 동시 제작
        </div>
        <div style={{ fontSize:26, fontWeight:900, color:text, marginBottom:10 }}>AI 로고 생성기</div>
        <div style={{ fontSize:14, color:muted, lineHeight:1.9, marginBottom:28 }}>
          브랜드 이름과 스타일만 선택하면<br/>AI가 로고 4가지 버전을 자동으로 만들어줘요.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:24 }}>
          {[["1","스타일 선택","11가지 로고 스타일 중 선택"],["2","정보 입력","브랜드명, 업종, 설명 입력"],["3","AI 생성","4가지 버전 자동 생성"],["4","PNG 저장","마음에 드는 버전 다운로드"]].map(([n,l,d]) => (
            <div key={n} style={{ padding:"12px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, textAlign:"left" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                <div style={{ width:20, height:20, borderRadius:6, background:"rgba(6,182,212,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#06b6d4" }}>{n}</div>
                <span style={{ fontSize:12, fontWeight:800, color:text }}>{l}</span>
              </div>
              <div style={{ fontSize:11, color:muted }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", marginBottom:28 }}>
          {["✨ 11가지 스타일","💎 40 크레딧","📎 참고이미지 업로드","📥 PNG 다운로드"].map(b => (
            <span key={b} style={{ padding:"4px 10px", borderRadius:14, border:`1px solid ${bdr}`, background:cardBg, fontSize:11, color:muted }}>{b}</span>
          ))}
        </div>
        <button onClick={() => setStep(1)} style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#06b6d4,#0891b2)", color:"#fff", fontSize:15, fontWeight:900, boxShadow:"0 8px 24px rgba(6,182,212,0.3)" }}>
          🏷 로고 만들기 시작 →
        </button>
      </div>
    </div>
  );

  // ── STEP 1: 설정
  if (step === 1) return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:820, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <button onClick={() => setStep(0)} style={{ padding:"5px 11px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 소개</button>
          <div style={{ fontSize:18, fontWeight:900, color:text }}>🏷 AI 로고 생성기</div>
        </div>

        {/* 스타일 */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:10 }}>① 로고 스타일 선택 *</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:7 }}>
            {LOGO_STYLES.map(s => {
              const isSel = selStyle === s.id;
              return (
                <button key={s.id} onClick={() => setSelStyle(isSel ? null : s.id)}
                  style={{ padding:"10px 6px", borderRadius:11, border:`2px solid ${isSel?s.color:bdr}`, background:isSel?s.bg:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.1s", boxShadow:isSel?`0 0 0 3px ${s.color}25`:"none" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:isSel?s.color:text, marginBottom:2 }}>{s.label}</div>
                  <div style={{ fontSize:9, color:muted }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
          {selStyle && <div style={{ marginTop:6, fontSize:11, color:"#06b6d4", fontWeight:600 }}>✓ {LOGO_STYLES.find(s=>s.id===selStyle)?.label} 선택됨</div>}
        </div>

        {/* 정보 */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text }}>② 정보 입력</div>
          <div><div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>브랜드/로고 이름 *</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 미리카페, SNS메이킷" style={inp}/></div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>업종/분야 *</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:5 }}>
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  style={{ padding:"3px 9px", borderRadius:12, border:`1px solid ${industry===ind?"#06b6d4":bdr}`, background:industry===ind?"rgba(6,182,212,0.15)":"transparent", color:industry===ind?"#06b6d4":muted, fontSize:10, cursor:"pointer", fontWeight:industry===ind?700:400 }}>{ind}</button>
              ))}
            </div>
            <input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="직접 입력" style={inp}/>
          </div>
          <div><div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>브랜드 설명 (선택)</div>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="예: 20대 여성 타겟, 감성적 카페 브랜드" style={{ ...inp, resize:"vertical", lineHeight:1.6 }}/></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>선호 색상 (선택)</div>
              <input value={colorPref} onChange={e=>setColorPref(e.target.value)} placeholder="예: 파란색, 골드와 블랙" style={inp}/></div>
            <div><div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>배경</div>
              <div style={{ display:"flex", gap:4 }}>
                {[["white","밝은"],["dark","어두운"],["transparent","투명"]].map(([v,l]) => (
                  <button key={v} onClick={() => setBgColor(v)} style={{ flex:1, padding:"8px 4px", borderRadius:8, border:`1px solid ${bgColor===v?"#06b6d4":bdr}`, background:bgColor===v?"rgba(6,182,212,0.15)":"transparent", color:bgColor===v?"#06b6d4":muted, fontSize:10, cursor:"pointer", fontWeight:bgColor===v?700:400 }}>{l}</button>
                ))}
              </div></div>
          </div>
        </div>

        {/* 참고 이미지 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:7 }}>③ 참고 이미지 (선택)</div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleRef}/>
          {refImage ? (
            <div style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 14px", borderRadius:11, border:`1px solid ${bdr}`, background:cardBg }}>
              <img src={`data:${refMime};base64,${refImage}`} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:7, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:text }}>참고 이미지 업로드됨</div>
                <div style={{ fontSize:10, color:muted }}>버전 1 생성 시 스타일 참고</div>
              </div>
              <button onClick={() => { setRefImage(null); setRefMime(null); }} style={{ padding:"3px 9px", borderRadius:6, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>제거</button>
            </div>
          ) : (
            <button onClick={() => refFileRef.current?.click()} style={{ width:"100%", padding:"12px", borderRadius:11, border:`2px dashed ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
              📎 참고 이미지 업로드 (선택)
            </button>
          )}
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:14, whiteSpace:"pre-wrap" }}>⚠️ {error}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:muted }}>예상 차감: <b style={{ color:"#06b6d4" }}>40 크레딧</b></div>
          <button onClick={generate} disabled={!canGenerate}
            style={{ padding:"13px 40px", borderRadius:11, border:"none", cursor:canGenerate?"pointer":"not-allowed", background:canGenerate?"linear-gradient(135deg,#06b6d4,#0891b2)":"rgba(6,182,212,0.3)", color:"#fff", fontSize:14, fontWeight:900, opacity:canGenerate?1:0.6 }}>
            🏷 로고 생성하기 →
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 로딩
  if (step === 2) {
    const doneCount = results.filter(Boolean).length;
    const pct = Math.round((doneCount / 4) * 100);
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
        <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
          <div style={{ position:"relative", width:96, height:96, margin:"0 auto 20px" }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid rgba(6,182,212,0.15)" }}/>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"#06b6d4", animation:"spin 1s linear infinite" }}/>
            <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(6,182,212,0.5)", animation:"spin 1.6s linear infinite reverse" }}/>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>🏷</div>
          </div>
          <div style={{ fontSize:17, fontWeight:900, color:text, marginBottom:6 }}>로고를 생성하고 있어요</div>
          <div style={{ fontSize:13, color:"#06b6d4", fontWeight:700, marginBottom:4 }}>
            {genIdx >= 0 ? `버전 ${genIdx+1} / 4 생성 중...` : "완료!"}
          </div>
          <div style={{ fontSize:12, color:muted, marginBottom:18 }}>"{name}" · {LOGO_STYLES.find(s=>s.id===selStyle)?.label}</div>
          <div style={{ height:7, borderRadius:4, background:D?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden", marginBottom:14 }}>
            <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#06b6d4,#0891b2)", width:`${pct}%`, transition:"width 0.5s ease" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16 }}>
            {[0,1,2,3].map(i => {
              const done = results[i]; const isGen = genIdx === i;
              return (
                <div key={i} style={{ width:54, height:54, borderRadius:10, border:`2px solid ${done?"#06b6d4":isGen?"rgba(6,182,212,0.5)":bdr}`, background:done?"rgba(6,182,212,0.12)":isGen?"rgba(6,182,212,0.04)":cardBg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:3 }}>
                  {done ? <span style={{ fontSize:18 }}>✅</span> : isGen ? <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(6,182,212,0.3)", borderTopColor:"#06b6d4", animation:"spin 0.8s linear infinite" }}/> : <span style={{ fontSize:14, color:muted }}>⏳</span>}
                  <div style={{ fontSize:9, color:done?"#06b6d4":muted }}>v{i+1}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:muted, lineHeight:1.7 }}>각 버전은 약 10~20초 소요됩니다.<br/>페이지를 닫지 말고 기다려주세요.</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── STEP 3: 결과
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:940, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <button onClick={reset} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", fontWeight:600 }}>← 다시 만들기</button>
          <div style={{ fontSize:15, fontWeight:900, color:text }}>"{name}" 로고 생성 완료!</div>
          <div style={{ marginLeft:"auto", fontSize:11, color:muted }}>클릭해서 선택 → PNG 다운로드</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:20 }}>
          {[0,1,2,3].map(i => {
            const img = results[i]; const isSel = selResult === i && img;
            return (
              <div key={i} onClick={() => img && setSelResult(i)}
                style={{ borderRadius:13, border:`2px solid ${isSel?"#06b6d4":bdr}`, background:cardBg, overflow:"hidden", cursor:img?"pointer":"default", transition:"all 0.15s", boxShadow:isSel?"0 0 0 3px rgba(6,182,212,0.2)":"none" }}>
                <div style={{ aspectRatio:"1", background:D?"rgba(255,255,255,0.03)":"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                  {img
                    ? <img src={img} alt={`로고 v${i+1}`}
                        style={{ width:"100%", height:"100%", objectFit:"contain", padding:10, display:"block" }}
                      />
                    : <div style={{ textAlign:"center", color:muted }}><div style={{ fontSize:22, marginBottom:4 }}>❌</div><div style={{ fontSize:11 }}>생성 실패</div></div>}
                  {isSel && <div style={{ position:"absolute", top:7, right:7, background:"#06b6d4", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#fff" }}>선택됨</div>}
                </div>
                <div style={{ padding:"9px 13px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:isSel?"#06b6d4":text }}>버전 {i+1}</span>
                  {img && <button onClick={e=>{ e.stopPropagation(); download(i); }} style={{ padding:"4px 12px", borderRadius:6, border:"none", background:"rgba(6,182,212,0.2)", color:"#06b6d4", fontSize:11, fontWeight:700, cursor:"pointer" }}>↓ PNG</button>}
                </div>
              </div>
            );
          })}
        </div>

        {results[selResult] && (
          <div style={{ padding:"18px", borderRadius:15, border:`1px solid ${bdr}`, background:cardBg, display:"flex", gap:18, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ width:140, height:140, borderRadius:11, background:D?"rgba(255,255,255,0.05)":"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
              <img src={results[selResult]} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", padding:8, display:"block" }}/>
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:14, fontWeight:900, color:text, marginBottom:4 }}>버전 {selResult+1} 선택됨</div>
              <div style={{ fontSize:11, color:muted, marginBottom:3 }}>스타일: {LOGO_STYLES.find(s=>s.id===selStyle)?.label}</div>
              <div style={{ fontSize:11, color:muted, marginBottom:14 }}>브랜드: {name} · {industry}</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={() => download(selResult)} style={{ padding:"10px 22px", borderRadius:9, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#06b6d4,#0891b2)", color:"#fff", fontSize:13, fontWeight:800 }}>📥 PNG 다운로드</button>
                <button onClick={reset} style={{ padding:"10px 18px", borderRadius:9, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>🔄 다시 생성</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
