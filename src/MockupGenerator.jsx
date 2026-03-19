import { useState, useRef } from "react";
import { changePoints } from "./storage";

/* ═══════════════════════════════════════════════════
   MockupGenerator.jsx  ·  AI 목업 생성기
   로고/텍스트 입력 → 목업 종류 선택 → 이미지 생성
═══════════════════════════════════════════════════ */

const MOCKUP_TYPES = [
  { id:"business_card",  label:"명함",         icon:"🪪", desc:"가로형 명함 디자인",           color:"#6366f1" },
  { id:"phone",          label:"스마트폰 화면", icon:"📱", desc:"폰 화면에 로고 노출",           color:"#06b6d4" },
  { id:"monitor",        label:"컴퓨터 모니터", icon:"🖥",  desc:"모니터 화면 목업",             color:"#8b5cf6" },
  { id:"notebook",       label:"노트북 화면",   icon:"💻", desc:"노트북 화면에 적용",           color:"#0891b2" },
  { id:"tshirt",         label:"티셔츠",        icon:"👕", desc:"티셔츠 가슴 로고 프린팅",      color:"#ec4899" },
  { id:"tumbler",        label:"텀블러",        icon:"🥤", desc:"텀블러 측면 로고 인쇄",        color:"#10b981" },
  { id:"mug",            label:"머그컵",        icon:"☕", desc:"머그컵 측면 로고",             color:"#f59e0b" },
  { id:"notebook_book",  label:"노트북(수첩)",  icon:"📒", desc:"수첩/노트 커버 로고",          color:"#d97706" },
  { id:"pen",            label:"볼펜",          icon:"🖊",  desc:"볼펜 몸체 로고 각인",         color:"#64748b" },
  { id:"tote_bag",       label:"토트백",        icon:"🛍", desc:"가방 측면 로고 프린팅",        color:"#7c3aed" },
  { id:"banner",         label:"배너/현수막",   icon:"🎌", desc:"이벤트 배너 목업",             color:"#dc2626" },
  { id:"signage",        label:"간판",          icon:"🪧", desc:"매장 간판 로고 적용",          color:"#059669" },
  { id:"envelope",       label:"봉투/레터헤드", icon:"✉️", desc:"기업 봉투 CI 적용",            color:"#7c6aff" },
  { id:"cap",            label:"모자",          icon:"🧢", desc:"야구 모자 앞면 로고",          color:"#b45309" },
  { id:"sticker",        label:"스티커/씰",     icon:"🔖", desc:"원형/각형 스티커 목업",        color:"#0284c7" },
  { id:"packaging",      label:"패키징 박스",   icon:"📦", desc:"제품 포장 박스 디자인",        color:"#9333ea" },
];

const MOCKUP_PROMPTS = {
  business_card:  "Professional business card mockup, white card with logo centered, dark background, soft shadow, realistic photography style, top-down view",
  phone:          "Smartphone screen mockup showing logo on a clean interface, modern phone on white or dark background, realistic 3D render",
  monitor:        "Desktop computer monitor displaying logo on dark screen, professional office desk background, realistic product photography",
  notebook:       "Laptop computer screen showing logo on modern website interface, wooden desk background, realistic photography",
  tshirt:         "White t-shirt mockup with logo printed on chest, flat lay or mannequin style, clean white background, realistic fabric texture",
  tumbler:        "Stainless steel tumbler with logo engraved/printed on side, minimal studio background, professional product photography",
  mug:            "White ceramic coffee mug with logo on side, realistic studio lighting, white or dark background, professional mockup",
  notebook_book:  "Premium hardcover notebook with logo on cover, top-down flat lay, minimal background, realistic texture",
  pen:            "Elegant ballpoint pen with logo engraved, dark or white background, professional product photography, close-up detail",
  tote_bag:       "Canvas tote bag with logo printed on front, white background, fashion-forward product photography, natural fabric texture",
  banner:         "Vertical pull-up banner/roll-up banner with logo design, office or exhibition background, professional marketing mockup",
  signage:        "Modern store signage with logo mounted on wall, urban background or interior shop, realistic architectural visualization",
  envelope:       "White business envelope and letterhead set with logo, flat lay top-down view, premium paper texture, minimal background",
  cap:            "Baseball cap with logo embroidered on front, front and 3/4 view, minimal background, realistic fabric mockup",
  sticker:        "Round and rectangular die-cut stickers with logo, scattered arrangement on white background, high-quality print mockup",
  packaging:      "Product packaging box with logo printed, 3D perspective view, white or gradient background, realistic commercial render",
};

async function generateMockup(logoPrompt, mockupType, logoB64, logoMime) {
  const typePrompt = MOCKUP_PROMPTS[mockupType] || "professional product mockup";
  const fullPrompt = `${typePrompt}. Logo/brand element to apply: ${logoPrompt}. High quality commercial product photography, ultra realistic, professional studio lighting, no text labels, no watermarks, 1:1 square format.`;

  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: fullPrompt,
      productImageB64: logoB64 || null,
      productImageMime: logoMime || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
  if (!data.image) throw new Error("이미지 데이터 없음");
  const raw = data.image;
  return raw.startsWith("data:") ? raw : "data:image/png;base64," + raw;
}

export default function MockupGenerator({ isDark, user }) {
  const D = isDark;
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.5)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const inputBdr= D ? "rgba(255,255,255,0.15)" : "#ddd";
  const ACC     = "#7c3aed";

  const [step,       setStep]       = useState(0); // 0=인트로 1=설정 2=생성중 3=결과
  const [logoText,   setLogoText]   = useState("");
  const [logoB64,    setLogoB64]    = useState(null);
  const [logoMime,   setLogoMime]   = useState(null);
  const [logoPreview,setLogoPreview]= useState(null);
  const [selTypes,   setSelTypes]   = useState([]);
  const [results,    setResults]    = useState({}); // { typeId: dataUri }
  const [genQueue,   setGenQueue]   = useState([]);
  const [curGen,     setCurGen]     = useState(null);
  const [error,      setError]      = useState("");
  const fileRef = useRef(null);

  const inp = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const handleLogoUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      setLogoPreview(ev.target.result);
      setLogoB64(ev.target.result.split(",")[1]);
      setLogoMime(f.type);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const toggleType = (id) => {
    setSelTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const canGenerate = selTypes.length > 0 && (logoText.trim() || logoB64);

  const generate = async () => {
    if (!canGenerate) return;
    setStep(2); setResults({}); setError("");
    setGenQueue([...selTypes]);

    const logoDesc = logoText.trim()
      ? `text logo "${logoText.trim()}", clean professional typography`
      : "the uploaded logo image (use as color/style reference, apply creatively to product)";

    for (const typeId of selTypes) {
      setCurGen(typeId);
      try {
        const img = await generateMockup(logoDesc, typeId, logoB64, logoMime);
        setResults(prev => ({ ...prev, [typeId]: img }));
      } catch (e) {
        setResults(prev => ({ ...prev, [typeId]: null }));
        console.error(typeId, e);
      }
      setGenQueue(prev => prev.filter(t => t !== typeId));
    }
    setCurGen(null);
    if (user?.uid) changePoints(user.uid, -(selTypes.length * 10), `목업 생성 (${selTypes.length}종)`).catch(() => {});
    setStep(3);
  };

  const download = (typeId) => {
    const img = results[typeId]; if (!img) return;
    const type = MOCKUP_TYPES.find(t => t.id === typeId);
    const a = document.createElement("a");
    a.href = img;
    a.download = `mockup_${type?.label || typeId}.png`;
    a.click();
  };

  const reset = () => {
    setStep(0); setLogoText(""); setLogoB64(null); setLogoMime(null);
    setLogoPreview(null); setSelTypes([]); setResults({}); setError("");
  };

  // ── STEP 0: 인트로
  if (step === 0) return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ maxWidth:560, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:60, marginBottom:14 }}>🎨</div>
        <div style={{ display:"inline-block", padding:"4px 16px", borderRadius:20, background:`rgba(124,58,237,0.15)`, border:`1px solid rgba(124,58,237,0.3)`, fontSize:12, fontWeight:700, color:ACC, marginBottom:14 }}>
          AI 목업 생성 · 16가지 제품 지원
        </div>
        <div style={{ fontSize:24, fontWeight:900, color:text, marginBottom:10 }}>목업 생성기</div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.9, marginBottom:28 }}>
          로고 파일이나 브랜드명을 입력하면<br/>
          명함·폰·모니터·텀블러 등 다양한 제품에<br/>
          적용된 고품질 목업 이미지를 생성해요.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:24 }}>
          {MOCKUP_TYPES.slice(0,8).map(t => (
            <div key={t.id} style={{ padding:"12px 6px", borderRadius:11, border:`1px solid ${bdr}`, background:cardBg, textAlign:"center" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{t.icon}</div>
              <div style={{ fontSize:10, fontWeight:700, color:text }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:muted, marginBottom:24 }}>+ 볼펜, 토트백, 간판, 모자, 패키징 등 총 16종</div>
        <button onClick={() => setStep(1)} style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#6d28d9)`, color:"#fff", fontSize:15, fontWeight:900, boxShadow:"0 8px 24px rgba(124,58,237,0.3)" }}>
          🎨 목업 만들기 시작 →
        </button>
      </div>
    </div>
  );

  // ── STEP 1: 설정
  if (step === 1) return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
          <button onClick={() => setStep(0)} style={{ padding:"5px 11px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 소개</button>
          <div style={{ fontSize:18, fontWeight:900, color:text }}>🎨 목업 생성기</div>
        </div>

        {/* 로고 입력 */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:10 }}>① 로고/브랜드 입력 *</div>

          {/* 이미지 업로드 */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoUpload}/>
          {logoPreview ? (
            <div style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px", borderRadius:12, border:`1.5px solid ${ACC}50`, background:`rgba(124,58,237,0.06)`, marginBottom:10 }}>
              <img src={logoPreview} alt="로고" style={{ width:72, height:72, objectFit:"contain", borderRadius:8, background:"#fff", padding:4, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:2 }}>로고 이미지 업로드됨</div>
                <div style={{ fontSize:11, color:muted }}>이 이미지를 목업에 적용해요</div>
              </div>
              <button onClick={() => { setLogoPreview(null); setLogoB64(null); setLogoMime(null); }}
                style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>제거</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:`2px dashed ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer", marginBottom:10 }}>
              🖼 로고 이미지 파일 업로드 (PNG/JPG 권장)
            </button>
          )}

          {/* 텍스트 입력 */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <div style={{ flex:1, height:1, background:bdr }}/>
            <span style={{ fontSize:11, color:muted }}>또는 텍스트로 입력</span>
            <div style={{ flex:1, height:1, background:bdr }}/>
          </div>
          <input value={logoText} onChange={e => setLogoText(e.target.value)}
            placeholder="브랜드명 또는 로고 설명 입력 (예: MIRI CAFE, 미리 커피)" style={inp}/>
          <div style={{ fontSize:11, color:muted, marginTop:5 }}>이미지 + 텍스트 둘 다 입력하면 더 정확해요</div>
        </div>

        {/* 목업 종류 선택 */}
        <div style={{ marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:800, color:text }}>② 목업 종류 선택 * <span style={{ fontSize:11, color:muted, fontWeight:400 }}>({selTypes.length}개 선택 · 종당 10 크레딧)</span></div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => setSelTypes(MOCKUP_TYPES.map(t=>t.id))}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>전체 선택</button>
              <button onClick={() => setSelTypes([])}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>전체 해제</button>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:7 }}>
            {MOCKUP_TYPES.map(t => {
              const isSel = selTypes.includes(t.id);
              return (
                <button key={t.id} onClick={() => toggleType(t.id)}
                  style={{ padding:"12px 8px", borderRadius:11, border:`2px solid ${isSel?t.color:bdr}`, background:isSel?`${t.color}18`:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.1s", boxShadow:isSel?`0 0 0 3px ${t.color}20`:"none" }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{t.icon}</div>
                  <div style={{ fontSize:11, fontWeight:800, color:isSel?t.color:text, marginBottom:2 }}>{t.label}</div>
                  <div style={{ fontSize:9, color:muted }}>{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:14 }}>⚠️ {error}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:muted }}>
            {selTypes.length > 0
              ? <><b style={{ color:ACC }}>{selTypes.length}가지</b> 목업 · <b style={{ color:ACC }}>{selTypes.length * 10} 크레딧</b> 차감</>
              : "목업 종류를 선택해주세요"}
          </div>
          <button onClick={generate} disabled={!canGenerate}
            style={{ padding:"13px 40px", borderRadius:11, border:"none", cursor:canGenerate?"pointer":"not-allowed", background:canGenerate?`linear-gradient(135deg,${ACC},#6d28d9)`:"rgba(124,58,237,0.3)", color:"#fff", fontSize:14, fontWeight:900, opacity:canGenerate?1:0.6 }}>
            🎨 목업 생성하기 →
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 생성 중
  if (step === 2) {
    const total = selTypes.length;
    const done  = Object.keys(results).length;
    const pct   = Math.round((done / total) * 100);
    const curType = MOCKUP_TYPES.find(t => t.id === curGen);
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
        <div style={{ maxWidth:480, width:"100%", textAlign:"center" }}>
          {/* 스피너 */}
          <div style={{ position:"relative", width:96, height:96, margin:"0 auto 20px" }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid rgba(124,58,237,0.15)" }}/>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:ACC, animation:"spin 1s linear infinite" }}/>
            <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(124,58,237,0.5)", animation:"spin 1.6s linear infinite reverse" }}/>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
              {curType?.icon || "🎨"}
            </div>
          </div>
          <div style={{ fontSize:17, fontWeight:900, color:text, marginBottom:6 }}>목업을 생성하고 있어요</div>
          <div style={{ fontSize:13, color:ACC, fontWeight:700, marginBottom:4 }}>
            {curType ? `${curType.label} 생성 중... (${done+1}/${total})` : "완료!"}
          </div>
          <div style={{ height:7, borderRadius:4, background:D?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden", margin:"16px 0 14px" }}>
            <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${ACC},#6d28d9)`, width:`${pct}%`, transition:"width 0.5s ease" }}/>
          </div>
          {/* 진행 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:200, overflowY:"auto" }}>
            {selTypes.map(id => {
              const t = MOCKUP_TYPES.find(m => m.id === id);
              const isDone = results[id] !== undefined;
              const isGen  = curGen === id;
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:8, background:isDone?"rgba(74,222,128,0.08)":isGen?`rgba(124,58,237,0.08)`:cardBg, border:`1px solid ${isDone?"rgba(74,222,128,0.2)":isGen?`${ACC}30`:bdr}`, textAlign:"left" }}>
                  <span style={{ fontSize:16 }}>{t?.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:isDone?"#4ade80":isGen?ACC:muted, flex:1 }}>{t?.label}</span>
                  <span style={{ fontSize:12 }}>{isDone?"✅":isGen?"⏳":"·"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:muted, marginTop:14, lineHeight:1.7 }}>각 목업은 약 10~20초 소요됩니다.</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── STEP 3: 결과
  const successResults = selTypes.filter(id => results[id]);
  const failResults    = selTypes.filter(id => results[id] === null);

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 18px 80px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18, flexWrap:"wrap" }}>
          <button onClick={reset} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", fontWeight:600 }}>← 다시 만들기</button>
          <div style={{ fontSize:15, fontWeight:900, color:text }}>목업 생성 완료! ({successResults.length}/{selTypes.length}종)</div>
          {failResults.length > 0 && <div style={{ fontSize:12, color:"#f87171" }}>{failResults.length}개 실패</div>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
          {selTypes.map(id => {
            const t = MOCKUP_TYPES.find(m => m.id === id);
            const img = results[id];
            return (
              <div key={id} style={{ borderRadius:14, border:`1px solid ${bdr}`, background:cardBg, overflow:"hidden" }}>
                {/* 이미지 */}
                <div style={{ aspectRatio:"1", background:D?"rgba(255,255,255,0.03)":"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {img
                    ? <img src={img} alt={t?.label} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                    : <div style={{ textAlign:"center", color:muted }}>
                        <div style={{ fontSize:28, marginBottom:4 }}>❌</div>
                        <div style={{ fontSize:11 }}>생성 실패</div>
                      </div>}
                </div>
                {/* 하단 */}
                <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:16 }}>{t?.icon}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:text }}>{t?.label}</span>
                  </div>
                  {img && (
                    <button onClick={() => download(id)}
                      style={{ padding:"4px 12px", borderRadius:6, border:"none", background:`rgba(124,58,237,0.2)`, color:ACC, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      ↓ PNG
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 전체 다운로드 */}
        {successResults.length > 1 && (
          <div style={{ marginTop:20, padding:"16px 20px", borderRadius:14, border:`1px solid ${bdr}`, background:cardBg, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>전체 {successResults.length}개 다운로드</div>
              <div style={{ fontSize:11, color:muted }}>각 이미지를 개별 PNG로 저장해요</div>
            </div>
            <button onClick={async () => {
              if (!window.JSZip) await new Promise((res,rej) => { const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
              const zip = new window.JSZip();
              successResults.forEach(id => {
                const t = MOCKUP_TYPES.find(m=>m.id===id);
                const img = results[id];
                if (!img) return;
                const arr = Uint8Array.from(atob(img.split(",")[1]), c => c.charCodeAt(0));
                zip.file(`mockup_${t?.label||id}.png`, arr);
              });
              const blob = await zip.generateAsync({ type:"blob", compression:"DEFLATE" });
              const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="mockups.zip"; a.click();
            }} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#6d28d9)`, color:"#fff", fontSize:13, fontWeight:800 }}>
              📦 전체 ZIP 다운로드
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
