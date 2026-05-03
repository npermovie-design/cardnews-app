import { useState, useRef } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken, pointsToUses } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import StepBar from "./StepBar.jsx";
import { THEMES, isDarkTheme } from "./theme";
import { useI18n } from "./i18n.jsx";

/* ═══════════════════════════════════════════════════════════
   ProductShotGenerator.jsx  ·  AI 제품컷 생성기
═══════════════════════════════════════════════════════════ */

const ATMOSPHERES = [
  { id:"studio",   label:"스튜디오",       icon:"🎬", desc:"깔끔한 배경·전문 조명",    color:"#7c6aff" },
  { id:"nature",   label:"자연·아웃도어",  icon:"🌿", desc:"자연광·그린 배경",          color:"#10b981" },
  { id:"cafe",     label:"카페·라이프스타일",icon:"☕",desc:"따뜻한 인테리어 공간",      color:"#f59e0b" },
  { id:"city",     label:"도시·스트리트",  icon:"🏙", desc:"도시적·트렌디",             color:"#64748b" },
  { id:"minimal",  label:"미니멀",         icon:"⬜", desc:"화이트·심플 배경",          color:"#94a3b8" },
  { id:"luxury",   label:"럭셔리",         icon:"✨", desc:"다크·고급스러운 분위기",     color:"#7c3aed" },
  { id:"outdoor",  label:"야외·공원",      icon:"🌸", desc:"밝고 화사한 야외",          color:"#ec4899" },
  { id:"abstract", label:"추상·컬러풀",    icon:"🎨", desc:"감각적인 컬러 배경",        color:"#ef4444" },
];

const COLOR_TONES = [
  { id:"bright",  label:"밝고 화사한", color:"#fde68a", textC:"#92400e" },
  { id:"pastel",  label:"파스텔",      color:"#fbcfe8", textC:"#831843" },
  { id:"dark",    label:"다크 무드",   color:"#374151", textC:"#f9fafb" },
  { id:"vintage", label:"빈티지",      color:"#d97706", textC:"#fff"    },
  { id:"vivid",   label:"선명한",      color:"#7c3aed", textC:"#fff"    },
  { id:"natural", label:"자연스러운",  color:"#6ee7b7", textC:"#065f46" },
];

const ATMO_PROMPTS = {
  studio:   "clean professional studio background, white or light grey seamless backdrop, studio lighting",
  nature:   "natural outdoor setting, green nature background, soft natural light, fresh environment",
  cafe:     "cozy cafe interior, warm ambient lighting, wooden textures, lifestyle setting",
  city:     "modern urban city background, street style, contemporary city environment",
  minimal:  "minimalist pure white background, clean simple setting, flat lay style",
  luxury:   "luxury elegant dark background, premium high-end setting, dramatic lighting",
  outdoor:  "bright cheerful outdoor park, blooming flowers, sunny natural environment",
  abstract: "colorful abstract artistic background, vibrant gradient, creative composition",
};

const TONE_PROMPTS = {
  bright:  "bright vibrant colors, high key lighting, cheerful warm tones",
  pastel:  "soft pastel color palette, gentle romantic tones, dreamy atmosphere",
  dark:    "dark moody color grading, low key dramatic lighting, deep shadows",
  vintage: "vintage warm color grading, film photography look, nostalgic tones",
  vivid:   "highly saturated vivid colors, bold striking palette, eye-catching",
  natural: "natural realistic colors, balanced lighting, true-to-life color accuracy",
};

const SIZE_PRESETS = [
  { id:"sq",   label:"정사각형", ratio:"1:1",  w:1,  h:1,  icon:"⬜", desc:"인스타그램 피드",   prompt:"square format 1:1 aspect ratio" },
  { id:"v45",  label:"세로 4:5", ratio:"4:5",  w:4,  h:5,  icon:"📱", desc:"인스타 세로 피드",   prompt:"portrait format 4:5 aspect ratio" },
  { id:"v916", label:"세로 9:16",ratio:"9:16", w:9,  h:16, icon:"📲", desc:"릴스·쇼츠",          prompt:"tall portrait format 9:16 aspect ratio" },
  { id:"h169", label:"가로 16:9",ratio:"16:9", w:16, h:9,  icon:"🖥",  desc:"유튜브 썸네일·배너", prompt:"landscape format 16:9 aspect ratio" },
  { id:"h43",  label:"가로 4:3", ratio:"4:3",  w:4,  h:3,  icon:"🖼",  desc:"블로그·프레젠테이션", prompt:"landscape format 4:3 aspect ratio" },
];

const RESOLUTIONS = [
  { id:"sm", label:"소",  px:800,  desc:"800px · 웹용" },
  { id:"md", label:"중",  px:1080, desc:"1080px · SNS 표준" },
  { id:"lg", label:"대",  px:1920, desc:"1920px · 고화질 인쇄" },
];

const MODEL_GENDERS = [
  { id:"female", label:"여성",    icon:"👩" },
  { id:"male",   label:"남성",    icon:"👨" },
  { id:"both",   label:"남녀 혼성", icon:"👫" },
];
const MODEL_AGES   = [
  { id:"20s", label:"20대" },
  { id:"30s", label:"30대" },
  { id:"40s", label:"40대" },
  { id:"50s", label:"50대" },
];
const MODEL_COUNTS = [
  { id:"1",     label:"1명",   icon:"🙂" },
  { id:"2",     label:"2명",   icon:"👥" },
  { id:"group", label:"여러명", icon:"👨‍👩‍👧" },
];

async function generateProductShot(prompt, productB64, productMime) {
  const token = await getAuthToken();
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ prompt, productImageB64: productB64, productImageMime: productMime }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
  if (!data.image) throw new Error("이미지 데이터 없음");
  // data.image is already a full data URL (data:image/...;base64,...)
  return data.image;
}

function buildPrompt({ mode, productName, atmosphere, colorTone, gender, age, count, extraDesc, sizePreset }) {
  const atmoP  = ATMO_PROMPTS[atmosphere] || ATMO_PROMPTS.studio;
  const toneP  = TONE_PROMPTS[colorTone]  || TONE_PROMPTS.natural;
  const nameP  = productName?.trim() ? `"${productName.trim().slice(0, 100)}" ` : "";
  const sizeP  = SIZE_PRESETS.find(s => s.id === sizePreset)?.prompt || SIZE_PRESETS[0].prompt;

  if (mode === "product") {
    return [
      `Professional Korean commercial product photography.`,
      `${nameP}product advertisement image.`,
      atmoP + ".",
      toneP + ".",
      sizeP + ".",
      `High quality studio product shot, commercial advertising style, photorealistic, sharp focus.`,
      `The product is prominently displayed and well-lit.`,
      `No text, no watermark, no people, no models.`,
      extraDesc?.trim() ? `Additional context: ${extraDesc.trim()}.` : "",
    ].filter(Boolean).join(" ");
  }

  const genderP = gender === "female" ? "young Korean woman" : gender === "male" ? "young Korean man" : "Korean man and woman";
  const ageMap  = { "20s":"in their 20s", "30s":"in their 30s", "40s":"in their 40s", "50s":"in their 50s" };
  const ageP    = ageMap[age] || "in their 20s";
  const countP  = count === "1" ? "a single" : count === "2" ? "two" : "a group of";
  const actionP = "naturally holding, using, or showcasing the product with a natural confident expression";

  return [
    `Professional Korean commercial advertising photography.`,
    `${nameP}product advertisement with model.`,
    `${countP} attractive ${genderP} ${ageP} ${actionP}.`,
    `${atmoP}.`,
    `${toneP}.`,
    sizeP + ".",
    `Natural authentic pose, professional commercial lighting, photorealistic, high quality advertising photography.`,
    `Korean beauty standards, clean polished look.`,
    `No text, no watermark.`,
    extraDesc?.trim() ? `Additional details: ${extraDesc.trim()}.` : "",
  ].filter(Boolean).join(" ");
}

export default function ProductShotGenerator({ isDark, user, onUserUpdate, showPointConfirm, onMenuChange }) {
  const { t } = useI18n();
  const C      = THEMES[isDark ? "dark" : "light"];
  const D      = isDark;
  const text   = C.text;
  const muted  = C.muted;
  const cardBg = C.card;
  const bdr    = C.border;
  const inputBg= C.inputBg;
  const accent = "#f97316";

  const STEPS = [
    { n:1, label:"설정" },
    { n:2, label:"AI 생성중" },
    { n:3, label:"결과 확인" },
  ];

  const [step, setStep] = useState(1); // 1=설정, 2=생성중, 3=결과
  useGeneratingGuard(step === 2, 10, "product_shot");

  const fileRef = useRef(null);
  const [productImg,  setProductImg]  = useState(null); // { b64, mime, url }
  const [productName, setProductName] = useState("");
  const [mode,        setMode]        = useState(null); // "product"|"model"
  const [atmosphere,  setAtmosphere]  = useState("studio");
  const [colorTone,   setColorTone]   = useState("bright");
  const [extraDesc,   setExtraDesc]   = useState("");
  const [gender,      setGender]      = useState("female");
  const [age,         setAge]         = useState("20s");
  const [count,       setCount]       = useState("1");
  const [results,     setResults]     = useState([]); // 생성된 이미지 배열
  const [imgCount,    setImgCount]    = useState(1);  // 생성 수 (1/2/4)
  const [genProgress, setGenProgress] = useState(0);  // 생성 진행 수
  const [error,       setError]       = useState("");
  const [sizePreset,  setSizePreset]  = useState("sq");
  const [resolution,  setResolution]  = useState("md");

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(",")[1];
      setProductImg({ b64, mime: file.type, url: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!productImg) { setError(t("ps_upload_first")); return; }
    if (!mode)       { setError(t("ps_select_mode")); return; }

    const cost = 50 * imgCount;
    if (!user) {
      if (guestLimitExceeded()) { setError(t("ps_guest_limit")); return; }
      incrementGuestUsage();
    } else {
      if (showPointConfirm && !(await showPointConfirm(1))) return;
    }

    setError(""); setResults([]); setGenProgress(0); setStep(2);
    const prompt = buildPrompt({ mode, productName, atmosphere, colorTone, gender, age, count, extraDesc, sizePreset });
    const imgs = [];
    let firstError = "";
    // 이미지 요청 최대 2회 재시도 (탭 전환으로 끊기는 케이스 대응)
    const genWithRetry = async (retries = 2) => {
      let lastErr;
      for (let a = 0; a <= retries; a++) {
        try { return await generateProductShot(prompt, productImg.b64, productImg.mime); }
        catch (e) { lastErr = e; if (a < retries) await new Promise(r => setTimeout(r, 800 * (a + 1))); }
      }
      throw lastErr;
    };
    for (let i = 0; i < imgCount; i++) {
      try {
        const img = await genWithRetry();
        imgs.push(img);
        setResults([...imgs]);
        setGenProgress(i + 1);
      } catch(e) {
        if (!firstError) firstError = e.message;
      }
    }
    if (imgs.length === 0) {
      // 전부 실패: step 2 유지 + 에러 + 재시도 버튼
      setError(firstError || t("ps_gen_fail"));
      return;
    }
    if (user) {
      const successCost = Math.round(cost * (imgs.length / imgCount));
      const updated = await changePoints(user.uid, -successCost, `제품컷 생성 (${imgs.length}장)`);
      if (updated !== null && onUserUpdate) onUserUpdate({ ...user, points: updated });
    }
    setStep(3);
  };

  const handleDownload = (imgSrc, idx = 0) => {
    if (!imgSrc) return;
    const preset = SIZE_PRESETS.find(s => s.id === sizePreset) || SIZE_PRESETS[0];
    const resPx  = RESOLUTIONS.find(r => r.id === resolution)?.px || 1080;
    // 긴 쪽이 resPx가 되도록 출력 크기 계산
    const ratio  = preset.w / preset.h;
    const outW   = ratio >= 1 ? resPx : Math.round(resPx * ratio);
    const outH   = ratio >= 1 ? Math.round(resPx / ratio) : resPx;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");

      // 중앙 크롭 (cover 방식)
      const srcRatio = img.naturalWidth / img.naturalHeight;
      const tgtRatio = outW / outH;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (srcRatio > tgtRatio) {
        sw = Math.round(sh * tgtRatio);
        sx = Math.round((img.naturalWidth - sw) / 2);
      } else {
        sh = Math.round(sw / tgtRatio);
        sy = Math.round((img.naturalHeight - sh) / 2);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `product_shot_${preset.ratio.replace(":","x")}_${resPx}px_${idx+1}_${Date.now()}.png`;
      a.click();
    };
    img.src = imgSrc;
  };

  const reset = () => {
    setResults([]); setError(""); setMode(null); setStep(1);
    setProductImg(null); setProductName(""); setExtraDesc("");
    setAtmosphere("studio"); setColorTone("bright");
    setGender("female"); setAge("20s"); setCount("1");
    setSizePreset("sq"); setResolution("md"); setImgCount(1); setGenProgress(0);
  };

  const card = (active, color = accent) => ({
    padding:"12px 14px", borderRadius:12,
    border:`2px solid ${active ? color : bdr}`,
    background: active ? color + "18" : cardBg,
    cursor:"pointer", transition:"all 0.15s",
  });

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize:12, fontWeight:800, color:muted, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
      {children}
    </div>
  );

  /* ══════════════════════════════════════
     STEP 2: 로딩
  ══════════════════════════════════════ */
  if (step === 2) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <StepBar steps={STEPS} current={2} isDark={isDark} />
      <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
        {/* 애니메이션 아이콘 */}
        <style>{`
          @keyframes ps-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.05)}}
          @keyframes ps-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        `}</style>
        <div style={{ position:"relative", width:100, height:100, margin:"0 auto 28px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`3px solid rgba(249,115,22,0.12)` }}/>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:accent, borderRightColor:accent, animation:"ps-ring 1.5s linear infinite" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", animation:"ps-bounce 2s ease-in-out infinite" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke={accent} strokeWidth="1.8"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill={accent}/>
              <path d="M21 15l-5-5L5 21" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize:17, fontWeight:900, color:text, marginBottom:6 }}>AI가 제품컷을 생성 중이에요</div>
        <div style={{ fontSize:13, color:muted, marginBottom:28 }}>보통 15~30초 소요됩니다. 잠시만 기다려주세요.</div>
        {/* 진행 단계 */}
        {/* 진행 표시 */}
        <div style={{ marginTop:20, width:"100%" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:muted, marginBottom:6 }}>
            <span>생성 중...</span>
            <span style={{ color:accent, fontWeight:800 }}>{genProgress} / {imgCount}</span>
          </div>
          <div style={{ height:6, borderRadius:3, background:D?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden", marginBottom:16 }}>
            <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg,${accent},#ea580c)`,
              width:`${imgCount > 0 ? Math.max(5,(genProgress/imgCount)*100) : 5}%`, transition:"width 0.5s ease" }}/>
          </div>
          {/* 생성된 이미지 실시간 표시 */}
          {results.length > 0 && (
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {results.map((img,i) => img && (
                <div key={i} style={{ width:80, height:80, borderRadius:10, overflow:"hidden", border:`2px solid ${accent}`, boxShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>
                  <img src={img} alt={`${i+1}`} className="pixel-reveal" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div style={{ marginTop:16, padding:"12px 14px", borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", textAlign:"left" }}>
              <div style={{ fontSize:12, color:"#f87171", fontWeight:700, marginBottom:6 }}>{error}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { setError(""); handleGenerate(); }} style={{ flex:1, padding:"9px 14px", borderRadius:8, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${accent},#ea580c)`, color:"#fff", fontSize:12, fontWeight:800 }}>다시 시도</button>
                <button onClick={() => { setError(""); setStep(1); }} style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>설정 변경</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}.pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}`}</style>
    </div>
  );

  /* ══════════════════════════════════════
     STEP 3: 결과
  ══════════════════════════════════════ */
  if (step === 3 && results.length > 0) return (
    <div style={{ flex:1, overflowY:"auto", padding:"40px 20px 80px" }}>
      <StepBar steps={STEPS} current={3} isDark={isDark} />
      <div style={{ maxWidth: results.length > 1 ? 880 : 640, margin:"0 auto" }}>

        {/* 헤더 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <button onClick={reset}
            style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer", fontWeight:600 }}>
            ← 다시 만들기
          </button>
          <div style={{ fontSize:15, fontWeight:900, color:text }}>🛍 제품컷 {results.length}장 생성 완료!</div>
        </div>

        {/* 설정 요약 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
          {[
            mode === "model" ? "🧍 모델 포함" : "📦 제품만",
            ATMOSPHERES.find(a=>a.id===atmosphere)?.icon + " " + ATMOSPHERES.find(a=>a.id===atmosphere)?.label,
            COLOR_TONES.find(t=>t.id===colorTone)?.label,
            SIZE_PRESETS.find(s=>s.id===sizePreset)?.icon + " " + SIZE_PRESETS.find(s=>s.id===sizePreset)?.ratio,
            RESOLUTIONS.find(r=>r.id===resolution)?.desc,
            productName ? `"${productName}"` : null,
          ].filter(Boolean).map((tag, i) => (
            <span key={i} style={{ padding:"3px 10px", borderRadius:12, background:`rgba(249,115,22,0.12)`, border:`1px solid rgba(249,115,22,0.25)`, fontSize:11, fontWeight:600, color:accent }}>
              {tag}
            </span>
          ))}
        </div>

        {/* 이미지 그리드 */}
        <div style={{ display:"grid", gridTemplateColumns: results.length === 1 ? "1fr" : results.length === 2 ? "1fr 1fr" : "1fr 1fr", gap:12, marginBottom:16 }}>
          {results.map((img, idx) => (
            <div key={idx} style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`,
              background: D ? "rgba(0,0,0,0.3)" : "#f5f5f5", boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
              <img src={img} alt={`제품컷 ${idx+1}`}
                style={{ width:"100%", display:"block", objectFit:"contain", maxHeight: results.length > 1 ? 400 : 600 }}
                onError={(e) => { e.target.style.display="none"; }}
              />
              <div style={{ padding:"10px 12px", borderTop:`1px solid ${bdr}` }}>
                <button onClick={() => handleDownload(img, idx)}
                  style={{ width:"100%", padding:"10px", borderRadius:10, border:"none", cursor:"pointer",
                    background:`linear-gradient(135deg,${accent},#ea580c)`, color:"#fff", fontSize:12, fontWeight:800 }}>
                  📥 {idx+1}번 다운로드
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 전체 다운로드 + 재생성 */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {results.length > 1 && (
            <button onClick={() => results.forEach((img, i) => { setTimeout(() => handleDownload(img, i), i*300); })}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${accent},#ea580c)`, color:"#fff", fontSize:14, fontWeight:800,
                boxShadow:`0 6px 20px rgba(249,115,22,0.3)` }}>
              📥 전체 다운로드 ({results.length}장)
            </button>
          )}
          <button onClick={() => { setResults([]); setStep(1); }}
            style={{ padding:"13px 22px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer", fontWeight:700 }}>
            🔄 재생성
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ══════════════════════════════════════
     STEP 1: 설정 화면
  ══════════════════════════════════════ */
  return (
    <div style={{ flex:1, overflowY:"auto", padding:"40px 20px 80px" }}>
      <StepBar steps={STEPS} current={1} isDark={isDark} />
      <div style={{ maxWidth:620, margin:"0 auto" }}>

        {/* 제목+드롭다운은 ToolHeader에서 표시 */}

        {/* ─── ① 제품 이미지 업로드 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:14 }}>
          <SectionTitle>① 제품 이미지 업로드</SectionTitle>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />

          {!productImg ? (
            <div onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              style={{ border:`2px dashed ${bdr}`, borderRadius:12, padding:"36px 20px", textAlign:"center", cursor:"pointer",
                background:D?"rgba(255,255,255,0.02)":"#fafafa", transition:"border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
              <div style={{ fontSize:40, marginBottom:10 }}>📦</div>
              <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:4 }}>제품 이미지를 업로드하세요</div>
              <div style={{ fontSize:12, color:muted }}>클릭하거나 드래그 · JPG, PNG, WEBP</div>
            </div>
          ) : (
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <div style={{ width:100, height:100, borderRadius:10, overflow:"hidden", border:`1px solid ${bdr}`, background:D?"rgba(255,255,255,0.05)":"#f8f8f8", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={productImg.url} alt="제품" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#4ade80", marginBottom:8 }}>✅ 이미지 업로드 완료</div>
                <input value={productName} onChange={e => setProductName(e.target.value)}
                  placeholder="제품명 입력 (선택)"
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <button onClick={() => setProductImg(null)}
                style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12, flexShrink:0 }}>
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ─── ② 생성 모드 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:14 }}>
          <SectionTitle>② 생성 모드 선택</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { id:"product", icon:"📦", label:"제품만 생성",       desc:"제품을 주인공으로 한 깔끔한 광고 이미지" },
              { id:"model",   icon:"🧍", label:"모델과 함께 생성", desc:"모델이 제품을 사용하는 자연스러운 광고 장면" },
            ].map(m => (
              <div key={m.id} onClick={() => setMode(m.id)} style={{ ...card(mode === m.id), padding:"16px" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{m.icon}</div>
                <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:4 }}>{m.label}</div>
                <div style={{ fontSize:11, color:muted, lineHeight:1.5 }}>{m.desc}</div>
                {mode === m.id && <div style={{ marginTop:8, fontSize:10, fontWeight:800, color:accent }}>✓ 선택됨</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ─── 모델 설정 ─── */}
        {mode === "model" && (
          <div style={{ background:cardBg, border:`1px solid ${accent}40`, borderRadius:16, padding:"20px", marginBottom:14 }}>
            <SectionTitle>③ 모델 설정</SectionTitle>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>성별</div>
              <div style={{ display:"flex", gap:8 }}>
                {MODEL_GENDERS.map(g => (
                  <button key={g.id} onClick={() => setGender(g.id)} style={{
                    flex:1, padding:"10px 8px", borderRadius:10, border:`2px solid ${gender===g.id?accent:bdr}`,
                    background: gender===g.id ? accent+"18" : "transparent",
                    color: gender===g.id ? accent : muted, fontSize:13, fontWeight:gender===g.id?800:500, cursor:"pointer",
                  }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{g.icon}</div>{g.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>나이대</div>
              <div style={{ display:"flex", gap:8 }}>
                {MODEL_AGES.map(a => (
                  <button key={a.id} onClick={() => setAge(a.id)} style={{
                    flex:1, padding:"9px 6px", borderRadius:10, border:`2px solid ${age===a.id?accent:bdr}`,
                    background: age===a.id ? accent+"18" : "transparent",
                    color: age===a.id ? accent : muted, fontSize:13, fontWeight:age===a.id?800:500, cursor:"pointer",
                  }}>{a.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>인원수</div>
              <div style={{ display:"flex", gap:8 }}>
                {MODEL_COUNTS.map(c => (
                  <button key={c.id} onClick={() => setCount(c.id)} style={{
                    flex:1, padding:"10px 8px", borderRadius:10, border:`2px solid ${count===c.id?accent:bdr}`,
                    background: count===c.id ? accent+"18" : "transparent",
                    color: count===c.id ? accent : muted, fontSize:13, fontWeight:count===c.id?800:500, cursor:"pointer",
                  }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{c.icon}</div>{c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── 광고 분위기 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:14 }}>
          <SectionTitle>{mode === "model" ? "④" : "③"} 광고 분위기</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
            {ATMOSPHERES.map(a => (
              <div key={a.id} onClick={() => setAtmosphere(a.id)} style={{ ...card(atmosphere === a.id, a.color), padding:"12px" }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{a.icon}</div>
                <div style={{ fontSize:12, fontWeight:800, color:text, marginBottom:2 }}>{a.label}</div>
                <div style={{ fontSize:10, color:muted, lineHeight:1.4 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 색감·톤 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:14 }}>
          <SectionTitle>{mode === "model" ? "⑤" : "④"} 색감·톤</SectionTitle>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {COLOR_TONES.map(t => (
              <button key={t.id} onClick={() => setColorTone(t.id)} style={{
                padding:"8px 16px", borderRadius:20,
                border:`2px solid ${colorTone===t.id?t.color:bdr}`,
                background: colorTone===t.id ? t.color : "transparent",
                color: colorTone===t.id ? t.textC : muted,
                fontSize:12, fontWeight:colorTone===t.id?800:500, cursor:"pointer", transition:"all 0.15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ─── 사이즈·해상도 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:14 }}>
          <SectionTitle>{mode === "model" ? "⑥" : "⑤"} 사이즈 · 해상도</SectionTitle>

          {/* 비율 */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>출력 비율</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
              {SIZE_PRESETS.map(s => {
                const isSel = sizePreset === s.id;
                return (
                  <div key={s.id} onClick={() => setSizePreset(s.id)} style={{
                    borderRadius:10, border:`2px solid ${isSel ? accent : bdr}`,
                    background: isSel ? accent+"18" : "transparent",
                    cursor:"pointer", padding:"10px 6px", textAlign:"center", transition:"all 0.15s",
                  }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{s.icon}</div>
                    <div style={{ fontSize:11, fontWeight:800, color: isSel ? accent : text }}>{s.label}</div>
                    <div style={{ fontSize:9, color:muted, marginTop:2 }}>{s.ratio}</div>
                    <div style={{ fontSize:9, color:muted, lineHeight:1.3, marginTop:2 }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 해상도 */}
          <div>
            <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>다운로드 해상도</div>
            <div style={{ display:"flex", gap:8 }}>
              {RESOLUTIONS.map(r => (
                <button key={r.id} onClick={() => setResolution(r.id)} style={{
                  flex:1, padding:"10px 8px", borderRadius:10,
                  border:`2px solid ${resolution===r.id ? accent : bdr}`,
                  background: resolution===r.id ? accent+"18" : "transparent",
                  color: resolution===r.id ? accent : muted,
                  fontSize:13, fontWeight:resolution===r.id?800:500, cursor:"pointer",
                  transition:"all 0.15s",
                }}>
                  <div style={{ fontWeight:900, marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontSize:10, opacity:0.8 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 생성 수량 */}
          <div>
            <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>생성 이미지 수</div>
            <div style={{ display:"flex", gap:8 }}>
              {[
                { n:1, label:"1장", desc:"10P" },
                { n:2, label:"2장", desc:"20P" },
                { n:4, label:"4장", desc:"40P" },
              ].map(({ n, label, desc }) => (
                <button key={n} onClick={() => setImgCount(n)} style={{
                  flex:1, padding:"10px 8px", borderRadius:10,
                  border:`2px solid ${imgCount===n ? accent : bdr}`,
                  background: imgCount===n ? accent+"18" : "transparent",
                  color: imgCount===n ? accent : muted,
                  fontSize:13, fontWeight:imgCount===n?800:500, cursor:"pointer",
                  transition:"all 0.15s",
                }}>
                  <div style={{ fontWeight:900, marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:10, opacity:0.8 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 추가 설명 ─── */}
        <div style={{ background:cardBg, border:`1px solid ${bdr}`, borderRadius:16, padding:"20px", marginBottom:20 }}>
          <SectionTitle>추가 설명 (선택)</SectionTitle>
          <textarea value={extraDesc} onChange={e => setExtraDesc(e.target.value)}
            placeholder="예: 여름 시즌 한정판, 젊고 활기찬 느낌, 아이돌 화보 스타일 등..."
            rows={2}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", resize:"vertical", lineHeight:1.6, boxSizing:"border-box", fontFamily:"inherit" }} />
        </div>

        {/* ─── 에러 ─── */}
        {error && (
          <div style={{ padding:"12px 16px", borderRadius:10, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14 }}>
            {error}
          </div>
        )}

        {/* ─── 생성 버튼 ─── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          {user && (
            <div style={{ fontSize:12, color:muted }}>
              예상 차감: <b style={{ color:accent }}>1회</b>
              <span style={{ marginLeft:8 }}>· 보유 {pointsToUses(user.points||0).toLocaleString()}회</span>
            </div>
          )}
          <button onClick={handleGenerate}
            disabled={!productImg || !mode}
            style={{
              marginLeft:"auto", padding:"14px 44px", borderRadius:12, border:"none",
              cursor:(!productImg||!mode)?"not-allowed":"pointer",
              background:(!productImg||!mode)?"rgba(249,115,22,0.3)":`linear-gradient(135deg,${accent},#ea580c)`,
              color:"#fff", fontSize:15, fontWeight:900,
              opacity:(!productImg||!mode)?0.6:1,
              boxShadow:(!productImg||!mode)?"none":`0 6px 20px rgba(249,115,22,0.3)`,
            }}>
            {user ? "🛍 제품컷 생성하기 · 10P" : "✦ 1회 생성하기"}
          </button>
        </div>

      </div>
    </div>
  );
}
