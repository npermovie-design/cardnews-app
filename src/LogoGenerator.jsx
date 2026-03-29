import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { THEMES } from "./theme";
import StepBar from "./StepBar.jsx";

const LOGO_STYLES = [
  { id:"free",       label:"자유로운 로고",      desc:"창의적·독창적",       color:"#ec4899", bg:"rgba(236,72,153,0.15)" },
  { id:"symbol_kr",  label:"한글 심볼 로고",     desc:"한글 타이포 중심",    color:"#7c6aff", bg:"rgba(99,102,241,0.15)" },
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
  // 참고 이미지가 있으면 "스타일 참고용"임을 프롬프트에 명시
  const finalPrompt = refB64
    ? `[STYLE REFERENCE ONLY - Do NOT copy or reproduce the reference image. Use it only for color palette, mood, and overall aesthetic inspiration.]\n\n${prompt}`
    : prompt;

  const token = await getAuthToken();
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt: finalPrompt, productImageB64: refB64 || null, productImageMime: refMime || null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `서버 오류 (${res.status})`);
  if (!data.image) throw new Error("이미지 데이터 없음 - API 응답: " + JSON.stringify(data).slice(0, 200));
  return data.image;
}

export default function LogoGenerator({ isDark, user , onUserUpdate, showPointConfirm}) {
  const D = isDark;
  const C = THEMES[D ? "dark" : "light"];
  const text    = C.text;
  const muted   = C.muted;
  const cardBg  = C.card;
  const bdr     = C.border;
  const inputBg = C.inputBg;
  const inputBdr= C.inputBorder;

  const STEPS = [
    { n:1, label:"설정" },
    { n:2, label:"AI 생성중" },
    { n:3, label:"결과 확인" },
  ];

  const [step,      setStep]      = useState(1);
  useGeneratingGuard(step === 2, 10, "logo_gen"); // 생성 중 이탈 방지
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
  const [genCount,  setGenCount]  = useState(4);
  const [error,     setError]     = useState("");
  const [selResult, setSelResult] = useState(0);

  const inp = { width:"100%", padding:"11px 14px", borderRadius:12, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const handleRef = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith("image/")) { setError("이미지 파일만 업로드 가능합니다"); e.target.value = ""; return; }
    if (f.size > 10 * 1024 * 1024) { setError("파일 크기는 10MB 이하만 가능합니다"); e.target.value = ""; return; }
    const r = new FileReader();
    r.onload = ev => { setRefImage(ev.target.result.split(",")[1]); setRefMime(f.type); };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const canGenerate = selStyle && name.trim() && industry;

  const generate = async () => {
    if (!canGenerate) return;
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(10 * genCount))) return;
    if (!user) incrementGuestUsage();
    setStep(2); setResults([]); setError(""); setGenIdx(0);
    const styleLabel = LOGO_STYLES.find(s => s.id === selStyle)?.label || selStyle;
    const basePrompt = `Professional ${STYLE_GUIDES[selStyle] || "logo"}. Brand: "${name.trim()}". Industry: ${industry}.${desc ? ` Description: ${desc}.` : ""}${colorPref ? ` Colors: ${colorPref}.` : ""} Background: ${bgColor === "dark" ? "dark" : "white/light"}. High quality, centered, commercial use, no watermarks, square format, single logo only.`;

    const vers = new Array(genCount).fill(null);
    for (let i = 0; i < genCount; i++) {
      setGenIdx(i);
      try {
        const raw = await callAPI(
          basePrompt + ` (variation ${i + 1})`,
          i === 0 ? refImage : null,
          i === 0 ? refMime : null
        );
        // API가 raw base64 또는 data URI 둘 다 반환할 수 있음
        const dataUri = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
        vers[i] = dataUri;
        setResults([...vers]);
      } catch (e) {
        vers[i] = null;
        setResults([...vers]);
        if (i === 0) { setError(e.message); setStep(1); return; }
      }
    }
    setGenIdx(-1);
    const successCount = vers.filter(v => v !== null).length;
    if (successCount > 0 && user?.uid) {
      changePoints(user.uid, -(successCount * 10), `로고 생성 (${successCount}버전)`).then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(() => {});
    }
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
          {[`✨ 11가지 스타일`,`${genCount * 10}P`,`📎 참고이미지 업로드`,`📥 PNG 다운로드`].map(b => (
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
      <StepBar steps={STEPS} current={1} isDark={isDark} />
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
                  style={{ padding:"10px 6px", borderRadius:12, border:`2px solid ${isSel?s.color:bdr}`, background:isSel?s.bg:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.1s", boxShadow:isSel?`0 0 0 3px ${s.color}25`:"none" }}>
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
            <div style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 14px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
              <img src={`data:${refMime};base64,${refImage}`} alt="" style={{ width:56, height:56, objectFit:"cover", borderRadius:7, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:text }}>참고 이미지 업로드됨</div>
                <div style={{ fontSize:10, color:muted }}>색감·분위기만 참고 (그대로 복사 ❌)</div>
              </div>
              <button onClick={() => { setRefImage(null); setRefMime(null); }} style={{ padding:"3px 9px", borderRadius:6, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>제거</button>
            </div>
          ) : (
            <button onClick={() => refFileRef.current?.click()} style={{ width:"100%", padding:"12px", borderRadius:12, border:`2px dashed ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
              📎 참고 이미지 업로드 — 색감·분위기만 반영 (복사 아님)
            </button>
          )}
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:14, whiteSpace:"pre-wrap" }}>⚠️ {error}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {/* 생성 개수 */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:12, color:muted }}>생성 개수</div>
            <div style={{ display:"flex", gap:5 }}>
              {[1,2,3,4].map(n => (
                <button key={n} onClick={() => setGenCount(n)}
                  style={{ width:36, height:36, borderRadius:9, border:`1.5px solid ${genCount===n?"#06b6d4":bdr}`, background:genCount===n?"rgba(6,182,212,0.15)":"transparent", color:genCount===n?"#06b6d4":muted, fontSize:13, fontWeight:genCount===n?800:400, cursor:"pointer" }}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:muted }}>{genCount * 10}P</div>
          </div>
          <button onClick={generate} disabled={!canGenerate}
            style={{ padding:"13px 40px", borderRadius:12, border:"none", cursor:canGenerate?"pointer":"not-allowed", background:canGenerate?"linear-gradient(135deg,#06b6d4,#0891b2)":"rgba(6,182,212,0.3)", color:"#fff", fontSize:14, fontWeight:900, opacity:canGenerate?1:0.6 }}>
            {user ? `🏷 로고 생성하기 → ${genCount * 10}P` : "✦ 1회 생성하기"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 로딩
  if (step === 2) {
    const doneCount = results.filter(Boolean).length;
    const pct = Math.round((doneCount / genCount) * 100);
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
            {genIdx >= 0 ? `버전 ${genIdx+1} / ${genCount} 생성 중...` : "완료!"}
          </div>
          <div style={{ fontSize:12, color:muted, marginBottom:18 }}>"{name}" · {LOGO_STYLES.find(s=>s.id===selStyle)?.label}</div>
          <div style={{ height:7, borderRadius:4, background:D?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden", marginBottom:14 }}>
            <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#06b6d4,#0891b2)", width:`${pct}%`, transition:"width 0.5s ease" }}/>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16, flexWrap:"wrap" }}>
            {Array.from({length:genCount},(_,i)=>i).map(i => {
              const done = results[i]; const isGen = genIdx === i;
              return (
                <div key={i} style={{ width:80, height:80, borderRadius:12, border:`2px solid ${done?"#06b6d4":isGen?"rgba(6,182,212,0.5)":bdr}`, background:done?"transparent":isGen?"rgba(6,182,212,0.04)":cardBg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", overflow:"hidden" }}>
                  {done ? <img src={done} alt={`v${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : isGen ? <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(6,182,212,0.3)", borderTopColor:"#06b6d4", animation:"spin 0.8s linear infinite" }}/> : <span style={{ fontSize:14, color:muted }}>⏳</span>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:muted, lineHeight:1.7 }}>각 버전은 약 10~20초 소요됩니다.<br/>페이지를 닫지 말고 기다려주세요.</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}.pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}`}</style>
      </div>
    );
  }

  // ── STEP 3: 결과
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <StepBar steps={STEPS} current={3} isDark={isDark} />
      <div style={{ maxWidth:940, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <button onClick={reset} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", fontWeight:600 }}>← 다시 만들기</button>
          <div style={{ fontSize:15, fontWeight:900, color:text }}>"{name}" 로고 생성 완료!</div>
          <div style={{ marginLeft:"auto", fontSize:11, color:muted }}>클릭해서 선택 → PNG 다운로드</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:genCount === 1 ? "1fr" : genCount === 2 ? "repeat(2,1fr)" : "repeat(2,1fr)", gap:12, marginBottom:20 }}>
          {Array.from({length:genCount},(_,i)=>i).map(i => {
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
            <div style={{ width:140, height:140, borderRadius:12, background:D?"rgba(255,255,255,0.05)":"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
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

        {/* 프로 디자인 문의 배너 */}
        <div style={{ display:'flex', justifyContent:'center', marginTop:20, marginBottom:32 }}>
          <div style={{ width:'100%', maxWidth:640, borderRadius:20,
            border:'1px solid rgba(6,182,212,0.3)',
            background: D ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.04)',
            padding:'20px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center' }}>
            {/* 배지 */}
            <span style={{ fontSize:11, fontWeight:800, padding:'4px 14px', borderRadius:20,
              background:'rgba(6,182,212,0.15)', color:'#06b6d4' }}>전문 디자인 문의</span>
            {/* 로고 */}
            <img src={"data:image/jpeg;base64,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"} alt='로고'
              style={{ width:72, height:72, objectFit:'contain', borderRadius:12 }}/>
            {/* 제목 */}
            <div style={{ fontSize:17, fontWeight:900, color:text }}>
              고퀄리티 로고 · 편집 · 패키지 디자인은 여기서!
            </div>
            {/* 썸네일 */}
            <div style={{ width:'100%', borderRadius:14, overflow:'hidden', border:'1px solid rgba(6,182,212,0.2)' }}>
              <img src={"data:image/jpeg;base64,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"}
                alt='포트폴리오 썸네일'
                style={{ width:'100%', height:150, objectFit:'cover', display:'block' }}
              />
            </div>
            {/* 설명 */}
            <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>
              AI 작업물이 아쉽다구요? 더 고퀄리티 디자인 작업을 문의해보세요!
            </div>
            {/* 버튼 2개 */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', width:'100%', marginTop:4 }}>
              <button onClick={e => { e.stopPropagation(); window.open('https://xn--p39ay4k91o0re35a.com/', '_blank'); }}
                style={{ flex:1, minWidth:140, padding:'13px 20px', borderRadius:12, border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg,#06b6d4,#0891b2)', color:'#fff', fontSize:14, fontWeight:800 }}>
                포트폴리오 보러가기
              </button>
              <button onClick={e => { e.stopPropagation(); window.open('https://xn--p39ay4k91o0re35a.com/contact', '_blank'); }}
                style={{ flex:1, minWidth:140, padding:'13px 20px', borderRadius:12, cursor:'pointer',
                  border:'1px solid rgba(6,182,212,0.5)', background:'transparent', color:'#06b6d4', fontSize:14, fontWeight:800 }}>
                문의하기
              </button>
            </div>
          </div>
        </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}.pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}`}</style>
    </div>
  );
}
