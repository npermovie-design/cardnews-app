import { useState, useRef } from "react";
import { changePoints } from "./storage";

/* ═══════════════════════════════════════════════════════
   LogoGenerator.jsx  ·  AI 로고 생성기
   - 로고 스타일 선택 (11가지)
   - 로고 이름 + 업종/설명 입력
   - 참고 이미지 업로드 (선택)
   - /api/generate-image 동일 엔드포인트 사용
═══════════════════════════════════════════════════════ */

const LOGO_STYLES = [
  { id:"free",        label:"자유로운 로고",      desc:"창의적·독창적",       emoji:"🎨", color:"#ec4899" },
  { id:"symbol_kr",   label:"한글 심볼 로고",     desc:"한국어 타이포 중심",  emoji:"가", color:"#6366f1" },
  { id:"letter_en",   label:"영문 레터링",        desc:"영문 타이포 + 캐릭터",emoji:"Aa", color:"#8b5cf6" },
  { id:"calli_en",    label:"영문 캘리그라피",    desc:"손글씨 스타일",       emoji:"ℳ",  color:"#7c3aed" },
  { id:"simple_en",   label:"심플 영문 레터링",   desc:"깔끔한 영문",         emoji:"AB", color:"#06b6d4" },
  { id:"illust",      label:"일러스트 심볼",       desc:"그림 + 심볼",         emoji:"🖼", color:"#10b981" },
  { id:"flat",        label:"플랫 심볼",           desc:"납작한 아이콘 스타일",emoji:"⬜", color:"#f59e0b" },
  { id:"vintage",     label:"빈티지 심볼",         desc:"클래식·레트로",       emoji:"⚙",  color:"#d97706" },
  { id:"character",   label:"캐릭터 심볼",         desc:"귀여운 마스코트",     emoji:"🐾", color:"#f43f5e" },
  { id:"minimal",     label:"미니멀 심볼",         desc:"단순·미니멀",         emoji:"○",  color:"#64748b" },
  { id:"line",        label:"라인 심볼",           desc:"선 드로잉 스타일",    emoji:"／", color:"#475569" },
];

const INDUSTRIES = [
  "카페/음식점", "패션/의류", "뷰티/화장품", "IT/테크", "교육",
  "헬스/운동", "여행/레저", "부동산/인테리어", "컨설팅/전문직", "기타"
];

// 스타일별 프롬프트 지시사항
function buildLogoPrompt({ style, name, industry, desc, colorPref, bgColor }) {
  const styleGuides = {
    free:       "creative and unique logo design",
    symbol_kr:  "Korean typography logo with Hangul lettering as the main element",
    letter_en:  "English lettering logo combined with a character or mascot illustration",
    calli_en:   "elegant English calligraphy handwriting style logo",
    simple_en:  "clean and simple English typographic logo",
    illust:     "logo with an illustrated symbol or icon in a flat illustration style",
    flat:       "flat design icon/symbol logo with simple geometric shapes",
    vintage:    "vintage retro style logo with classic typography and decorative elements",
    character:  "cute mascot character logo with friendly cartoon style",
    minimal:    "minimalist logo with clean lines and simple geometric symbol",
    line:       "line art logo with thin strokes and outline style drawing",
  };

  return `Create a professional ${styleGuides[style.id] || "logo"} for a business.

Business name: "${name}"
Industry: ${industry}
${desc ? `Description: ${desc}` : ""}
${colorPref ? `Preferred colors: ${colorPref}` : ""}
Background: ${bgColor === "transparent" ? "transparent/white background" : bgColor === "dark" ? "dark background" : "white/light background"}

Requirements:
- High quality, professional logo design
- Clear and readable text if included
- Suitable for commercial use
- Single logo centered on the background
- No watermarks, no text labels, just the logo itself
- Square format, clean composition`;
}

async function generateLogo(prompt, refImageB64, refImageMime) {
  const body = { prompt, productImageB64: refImageB64 || null, productImageMime: refImageMime || null };
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "로고 생성 실패");
  return data.image; // base64
}

export default function LogoGenerator({ isDark, user }) {
  const D = isDark;
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.5)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const inputBdr= D ? "rgba(255,255,255,0.15)" : "#ddd";

  // 입력 상태
  const [selStyle,   setSelStyle]   = useState(null);
  const [name,       setName]       = useState("");
  const [industry,   setIndustry]   = useState("");
  const [desc,       setDesc]       = useState("");
  const [colorPref,  setColorPref]  = useState("");
  const [bgColor,    setBgColor]    = useState("white");
  const [refImage,   setRefImage]   = useState(null); // base64
  const [refMime,    setRefMime]    = useState(null);
  const refFileRef = useRef(null);

  // 결과 상태
  const [step,    setStep]    = useState(1); // 1=설정, 2=생성중/결과
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // 최대 4개 버전
  const [genIdx,  setGenIdx]  = useState(0);  // 현재 생성 중 인덱스
  const [error,   setError]   = useState("");
  const [selResult, setSelResult] = useState(0);

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const handleRefUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      setRefImage(ev.target.result.split(",")[1]);
      setRefMime(f.type);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const canGenerate = selStyle && name.trim() && industry;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true); setStep(2); setResults([]); setError(""); setGenIdx(0);

    const prompt = buildLogoPrompt({ style: selStyle, name: name.trim(), industry, desc, colorPref, bgColor });

    // 4가지 버전 순차 생성
    const versions = [];
    for (let i = 0; i < 4; i++) {
      setGenIdx(i);
      try {
        const img = await generateLogo(prompt, i === 0 ? refImage : null, i === 0 ? refMime : null);
        versions.push("data:image/png;base64," + img);
        setResults([...versions]);
      } catch(e) {
        versions.push(null);
        setResults([...versions]);
        if (i === 0) { setError("생성 실패: " + e.message); setLoading(false); setStep(1); return; }
      }
    }

    setGenIdx(-1); setLoading(false);
    if (user?.uid) changePoints(user.uid, -40, "로고 생성 (4버전)").catch(()=>{});
    setSelResult(0);
  };

  const downloadResult = (idx) => {
    const img = results[idx];
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = `logo_${name.replace(/\s/g,"_")}_v${idx+1}.png`;
    a.click();
  };

  const reset = () => { setStep(1); setResults([]); setError(""); setGenIdx(0); };

  // ── STEP 1: 설정 ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 20px 80px" }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>🏷 AI 로고 생성기</div>
            <div style={{ fontSize:13, color:muted }}>스타일을 선택하고 정보를 입력하면 AI가 로고 4가지 버전을 만들어줘요</div>
          </div>

          {/* 스타일 선택 */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>① 로고 스타일 선택 *</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:8 }}>
              {LOGO_STYLES.map(s => {
                const isSel = selStyle?.id === s.id;
                return (
                  <button key={s.id} onClick={()=>setSelStyle(isSel?null:s)}
                    style={{ padding:"12px 10px", borderRadius:12, border:`2px solid ${isSel?s.color:bdr}`, background:isSel?`${s.color}18`:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.12s",
                      boxShadow:isSel?`0 0 0 3px ${s.color}30`:"none" }}>
                    <div style={{ fontSize:22, marginBottom:5 }}>{s.emoji}</div>
                    <div style={{ fontSize:12, fontWeight:800, color:isSel?s.color:text, marginBottom:2 }}>{s.label}</div>
                    <div style={{ fontSize:10, color:muted }}>{s.desc}</div>
                  </button>
                );
              })}
            </div>
            {selStyle && <div style={{ marginTop:8, fontSize:12, color:selStyle.color, fontWeight:600 }}>✓ {selStyle.label} 선택됨</div>}
          </div>

          {/* 로고 정보 */}
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:22 }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:-4 }}>② 로고 정보 입력 *</div>

            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>로고/브랜드 이름 *</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="예: 미리카페, SNS메이킷, BlueRock" style={inputStyle}/>
            </div>

            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>업종/분야 *</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                {INDUSTRIES.map(ind=>(
                  <button key={ind} onClick={()=>setIndustry(ind)}
                    style={{ padding:"5px 12px", borderRadius:16, border:`1px solid ${industry===ind?"#6366f1":bdr}`, background:industry===ind?"rgba(99,102,241,0.15)":"transparent", color:industry===ind?"#a5b4fc":muted, fontSize:12, cursor:"pointer", fontWeight:industry===ind?700:400 }}>
                    {ind}
                  </button>
                ))}
              </div>
              <input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="직접 입력 가능" style={{...inputStyle, marginTop:0}}/>
            </div>

            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>브랜드 설명 (선택)</div>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="예: 20대 여성 타겟, 감성적이고 따뜻한 분위기의 카페 브랜드" rows={2}
                style={{...inputStyle, resize:"vertical", lineHeight:1.7}}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>선호 색상 (선택)</div>
                <input value={colorPref} onChange={e=>setColorPref(e.target.value)} placeholder="예: 파란색과 흰색, 골드" style={inputStyle}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>배경</div>
                <div style={{ display:"flex", gap:6 }}>
                  {[["white","밝은"],["dark","어두운"],["transparent","투명"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setBgColor(v)}
                      style={{ flex:1, padding:"9px 4px", borderRadius:9, border:`1px solid ${bgColor===v?"#6366f1":bdr}`, background:bgColor===v?"rgba(99,102,241,0.15)":"transparent", color:bgColor===v?"#a5b4fc":muted, fontSize:11, cursor:"pointer", fontWeight:bgColor===v?700:400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 참고 이미지 */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>③ 참고 이미지 (선택)</div>
            <div style={{ fontSize:12, color:muted, marginBottom:10 }}>원하는 스타일의 참고 이미지를 올리면 AI가 비슷한 분위기로 생성해요</div>
            <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleRefUpload}/>
            {refImage ? (
              <div style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
                <img src={`data:${refMime};base64,${refImage}`} alt="" style={{ width:72, height:72, objectFit:"cover", borderRadius:8, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:3 }}>참고 이미지 업로드됨</div>
                  <div style={{ fontSize:11, color:muted }}>첫 번째 버전 생성 시 참고로 사용돼요</div>
                </div>
                <button onClick={()=>{setRefImage(null);setRefMime(null);}} style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#f87171", fontSize:12, cursor:"pointer" }}>제거</button>
              </div>
            ) : (
              <button onClick={()=>refFileRef.current?.click()}
                style={{ width:"100%", padding:"16px", borderRadius:12, border:`2px dashed ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                📎 참고 이미지 업로드 (JPG, PNG)
              </button>
            )}
          </div>

          {error && <div style={{ padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", fontSize:12, marginBottom:16 }}>{error}</div>}

          {/* 생성 버튼 */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, color:muted }}>예상 차감: <b style={{ color:"#06b6d4" }}>40 크레딧</b> (4가지 버전)</div>
            <button onClick={generate} disabled={!canGenerate}
              style={{ padding:"14px 44px", borderRadius:12, border:"none", cursor:canGenerate?"pointer":"not-allowed", background:canGenerate?"linear-gradient(135deg,#06b6d4,#0891b2)":"rgba(6,182,212,0.3)", color:"#fff", fontSize:15, fontWeight:900, opacity:canGenerate?1:0.6 }}>
              🏷 로고 생성하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: 생성 중 / 결과 ──────────────────────────────
  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px 80px" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={reset} style={{ padding:"7px 16px", borderRadius:9, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", fontWeight:600 }}>← 다시 설정</button>
          <div style={{ fontSize:16, fontWeight:900, color:text }}>"{name}" 로고 생성 결과</div>
          {loading && <div style={{ fontSize:12, color:"#06b6d4", fontWeight:600 }}>⏳ {genIdx+1}/4 생성 중...</div>}
        </div>

        {/* 4가지 버전 그리드 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, marginBottom:20 }}>
          {[0,1,2,3].map(i => {
            const img = results[i];
            const isGenerating = loading && genIdx === i;
            const isPending = loading && genIdx < i;
            const isSel = selResult === i && img;
            return (
              <div key={i} onClick={()=>img&&setSelResult(i)}
                style={{ borderRadius:14, border:`2px solid ${isSel?"#06b6d4":bdr}`, background:cardBg, overflow:"hidden", cursor:img?"pointer":"default",
                  boxShadow:isSel?"0 0 0 3px rgba(6,182,212,0.3)":"none", transition:"all 0.15s" }}>
                {/* 이미지 영역 */}
                <div style={{ aspectRatio:"1", background:isDark?"rgba(255,255,255,0.03)":"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {img ? (
                    <img src={img} alt={`로고 v${i+1}`} style={{ width:"100%", height:"100%", objectFit:"contain", padding:8 }}/>
                  ) : isGenerating ? (
                    <div style={{ textAlign:"center" }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(6,182,212,0.3)", borderTopColor:"#06b6d4", animation:"spin 1s linear infinite", margin:"0 auto 10px" }}/>
                      <div style={{ fontSize:12, color:"#06b6d4" }}>생성 중...</div>
                    </div>
                  ) : (
                    <div style={{ textAlign:"center", color:muted }}>
                      <div style={{ fontSize:28, marginBottom:6 }}>⏳</div>
                      <div style={{ fontSize:12 }}>대기 중</div>
                    </div>
                  )}
                  {isSel && <div style={{ position:"absolute", top:8, right:8, background:"#06b6d4", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700, color:"#fff" }}>선택됨</div>}
                </div>
                {/* 하단 */}
                <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>버전 {i+1}</div>
                  {img && (
                    <button onClick={e=>{e.stopPropagation();downloadResult(i);}}
                      style={{ padding:"5px 12px", borderRadius:7, border:"none", background:"rgba(6,182,212,0.2)", color:"#06b6d4", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      ↓ PNG
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 선택된 버전 크게 보기 + 다운로드 */}
        {results[selResult] && !loading && (
          <div style={{ padding:"20px", borderRadius:16, border:`1px solid ${bdr}`, background:cardBg, display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
            <img src={results[selResult]} alt="선택된 로고" style={{ width:180, height:180, objectFit:"contain", borderRadius:12, background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5", padding:8, flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:15, fontWeight:900, color:text, marginBottom:6 }}>버전 {selResult+1} 선택됨</div>
              <div style={{ fontSize:12, color:muted, marginBottom:14, lineHeight:1.7 }}>
                스타일: {selStyle?.label}<br/>
                브랜드: {name} · {industry}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>downloadResult(selResult)}
                  style={{ padding:"11px 24px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#06b6d4,#0891b2)", color:"#fff", fontSize:13, fontWeight:800 }}>
                  📥 PNG 다운로드
                </button>
                <button onClick={reset}
                  style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>
                  🔄 다시 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
