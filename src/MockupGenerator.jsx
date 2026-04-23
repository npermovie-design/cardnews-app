import { useState, useRef, useEffect } from "react";
import { changePoints, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import StepBar from "./StepBar.jsx";
import { THEMES, isDarkTheme } from "./theme";
import { useI18n } from "./i18n.jsx";

/* ═══════════════════════════════════════════════════
   MockupGenerator.jsx  ·  AI 목업 생성기
   로고/텍스트 입력 → 목업 종류 선택 → 이미지 생성
═══════════════════════════════════════════════════ */

// 종합 목업 (특별)
const COMPREHENSIVE_MOCKUP = {
  id:"comprehensive", label:"종합 브랜드 목업", icon:"✨",
  desc:"명함·봉투·노트·폰 등 한 장에 모두",
  color:"#f59e0b", isBrand:true
};

const MOCKUP_CATEGORIES = [
  {
    label:"기업·브랜딩",
    items:[
      { id:"business_card",   label:"명함",          icon:"🪪", desc:"가로형 명함 디자인",        color:"#7c6aff" },
      { id:"letterhead",      label:"레터헤드",       icon:"📄", desc:"회사 공문서 레터헤드",      color:"#4f46e5" },
      { id:"envelope",        label:"봉투",           icon:"✉️", desc:"기업 봉투 CI 적용",         color:"#7c6aff" },
      { id:"id_badge",        label:"사원증/배지",    icon:"🪪", desc:"명찰·사원증 목업",          color:"#7c6aff" },
      { id:"stamp",           label:"도장/스탬프",    icon:"📮", desc:"회사 도장 목업",            color:"#dc2626" },
    ]
  },
  {
    label:"디지털·화면",
    items:[
      { id:"phone",           label:"스마트폰",       icon:"📱", desc:"폰 화면 로고 노출",         color:"#06b6d4" },
      { id:"monitor",         label:"모니터",         icon:"🖥",  desc:"모니터 화면 목업",          color:"#8b5cf6" },
      { id:"notebook",        label:"노트북 화면",    icon:"💻", desc:"노트북 화면에 적용",        color:"#0891b2" },
      { id:"tablet",          label:"태블릿",         icon:"📱", desc:"태블릿 화면 목업",          color:"#0ea5e9" },
    ]
  },
  {
    label:"옥외·광고",
    items:[
      { id:"signage",         label:"매장 간판",      icon:"🪧", desc:"매장 외관 간판 적용",       color:"#059669" },
      { id:"billboard",       label:"빌보드/옥외광고",icon:"🎌", desc:"건물 옥외 광고판",          color:"#dc2626" },
      { id:"banner_vertical", label:"배너 (세로형)",  icon:"📢", desc:"행사·전시 롤업 배너",       color:"#b91c1c" },
      { id:"banner_flag",     label:"깃발 배너",      icon:"🚩", desc:"야외 깃발 배너 목업",       color:"#ef4444" },
      { id:"magazine",        label:"잡지/카탈로그",  icon:"📰", desc:"잡지 표지 브랜드 적용",     color:"#7c3aed" },
    ]
  },
  {
    label:"인쇄물",
    items:[
      { id:"notebook_book",   label:"노트(수첩)",     icon:"📒", desc:"수첩 커버 로고",            color:"#d97706" },
      { id:"sticker",         label:"스티커/씰",      icon:"🔖", desc:"원형·각형 스티커",          color:"#0284c7" },
      { id:"packaging",       label:"패키징 박스",    icon:"📦", desc:"제품 포장 박스",            color:"#9333ea" },
      { id:"paper_bag",       label:"쇼핑백",         icon:"🛍", desc:"종이 쇼핑백 로고",          color:"#a16207" },
      { id:"flyer",           label:"전단지/리플렛",  icon:"📋", desc:"홍보 전단지 목업",          color:"#64748b" },
    ]
  },
  {
    label:"굿즈·용품",
    items:[
      { id:"tshirt",          label:"티셔츠",         icon:"👕", desc:"가슴 로고 프린팅",          color:"#ec4899" },
      { id:"tumbler",         label:"텀블러",         icon:"🥤", desc:"측면 로고 인쇄",            color:"#10b981" },
      { id:"mug",             label:"머그컵",         icon:"☕", desc:"머그컵 로고",               color:"#f59e0b" },
      { id:"cap",             label:"모자",           icon:"🧢", desc:"야구모자 앞면 로고",        color:"#b45309" },
      { id:"pen",             label:"볼펜",           icon:"🖊",  desc:"볼펜 몸체 각인",            color:"#475569" },
      { id:"tote_bag",        label:"토트백",         icon:"👜", desc:"캔버스 가방 프린팅",        color:"#7c3aed" },
      { id:"umbrella",        label:"우산",           icon:"☂️", desc:"우산 로고 프린팅",          color:"#0369a1" },
      { id:"apron",           label:"앞치마",         icon:"🧑‍🍳", desc:"앞치마 로고 자수",          color:"#15803d" },
    ]
  },
];

// 평탄화된 목록 (전체 선택/해제용)
const MOCKUP_TYPES = MOCKUP_CATEGORIES.flatMap(c => c.items);

const MOCKUP_PROMPTS = {
  // 기업·브랜딩
  business_card:   "Professional business card mockup, elegant card with logo centered, dark studio background, soft shadow, top-down realistic photography",
  letterhead:      "Corporate letterhead mockup on white premium paper, logo at top, clean minimal office desk background, realistic flat lay",
  envelope:        "White business envelope with logo printed, premium paper texture, flat lay top-down, minimal background",
  id_badge:        "Corporate employee ID badge/lanyard mockup with logo, hanging on white background, professional product photography",
  stamp:           "Corporate rubber stamp or wax seal with logo, dark moody background, close-up detail, professional product photography",
  // 디지털·화면
  phone:           "Modern smartphone screen mockup with logo on dark UI interface, phone on minimal background, realistic 3D product render",
  monitor:         "Widescreen desktop monitor showing logo on dark web interface, professional office desk, realistic product photography",
  notebook:        "MacBook laptop open showing logo on screen, wooden desk background, natural lighting, realistic product photography",
  tablet:          "iPad/tablet mockup showing logo on screen, minimal table background, realistic product photography",
  // 옥외·광고
  signage:         "Modern illuminated storefront signage with logo, urban street at night, realistic architectural visualization, cinematic lighting",
  billboard:       "Large outdoor billboard on building rooftop with brand logo design, blue sky background, realistic 3D render, wide angle perspective",
  banner_vertical: "Vertical pull-up roll-up banner with logo, exhibition hall background, professional marketing mockup, realistic fabric",
  banner_flag:     "Outdoor feather flag/sail banner with logo in wind, street environment, realistic fabric texture render",
  magazine:        "Magazine or catalog cover with brand logo and design, held by hand or on stone surface, editorial photography style, dramatic lighting",
  // 인쇄물
  notebook_book:   "Premium hardcover notebook/journal with logo on cover, flat lay on white background, realistic leather or fabric texture",
  sticker:         "Die-cut brand stickers with logo, round and rectangular, scattered on white background, high quality print mockup",
  packaging:       "Product packaging gift box with logo printed, 3D perspective view, white studio background, realistic commercial render",
  paper_bag:       "Kraft paper shopping bag with logo printed, minimal white background, product photography, natural texture",
  flyer:           "Brand flyer or leaflet with logo, flat lay on white background, clean print mockup, professional graphic design",
  // 굿즈·용품
  tshirt:          "White t-shirt with logo printed on chest, flat lay on minimal background, clean fabric texture, fashion mockup",
  tumbler:         "Stainless steel tumbler/bottle with logo engraved on side, minimal studio background, professional product photography",
  mug:             "White ceramic coffee mug with logo on side, studio lighting, white or dark background, realistic product mockup",
  cap:             "Baseball cap with logo embroidered on front, 3/4 view, minimal background, realistic fabric and embroidery texture",
  pen:             "Premium ballpoint pen with logo engraved, dark elegant background, close-up detail, professional product photography",
  tote_bag:        "Canvas tote bag with logo printed on front, white/natural background, lifestyle product photography",
  umbrella:        "Open umbrella with logo printed on canopy, outdoor or studio background, realistic product photography",
  apron:           "Canvas apron with logo embroidered, flat lay or worn, clean background, realistic fabric texture",
  // 종합
  comprehensive:   "Premium brand identity stationery flat lay mockup featuring business cards, envelope, letterhead, notebook, pen and smartphone arranged aesthetically on white background, top-down bird eye view, professional commercial photography, ultra realistic, high-end corporate branding showcase",
};

async function generateMockup(logoPrompt, mockupType, logoB64, logoMime) {
  const typePrompt = MOCKUP_PROMPTS[mockupType] || "professional product mockup";
  const fullPrompt = `${typePrompt}. Logo/brand element to apply: ${logoPrompt}. High quality commercial product photography, ultra realistic, professional studio lighting, no text labels, no watermarks, 1:1 square format.`;

  const token = await getAuthToken();
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  return raw.startsWith("data:") ? raw : "data:image/png;base64,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" + raw;
}

export default function MockupGenerator({ isDark, user , onUserUpdate, showPointConfirm}) {
  const { t } = useI18n();
  const C       = THEMES[isDark ? "dark" : "light"];
  const text    = C.text;
  const muted   = C.muted;
  const cardBg  = C.card;
  const bdr     = C.border;
  const inputBg = C.inputBg;
  const inputBdr= C.inputBorder;
  const ACC     = "#7c3aed";

  const STEPS = [
    { n:1, label:"설정" },
    { n:2, label:"AI 생성중" },
    { n:3, label:"결과 확인" },
  ];

  const [step,       setStep]       = useState(1); // 1=설정 2=생성중 3=결과
  useGeneratingGuard(step === 2, 30, "mockup_gen"); // 생성 중 이탈 방지
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

  const inp = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

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

  // 모든 선택 가능한 타입 (종합 포함)
  const allTypes = [COMPREHENSIVE_MOCKUP, ...MOCKUP_TYPES];
  const getTypeInfo = (id) => allTypes.find(t => t.id === id) || { label:id, icon:"🎨" };

  const generate = async () => {
    if (!canGenerate) return;
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(10 * selTypes.length))) return;
    if (!user) incrementGuestUsage();
    setStep(2); setResults({}); setError("");
    setGenQueue([...selTypes]);

    const logoDesc = logoText.trim()
      ? `text logo "${logoText.trim()}", clean professional typography`
      : "the uploaded logo image (use as color/style reference, apply creatively to product)";

    // 각 요청 최대 2회 재시도 (탭 전환으로 끊기는 경우 대응)
    const genWithRetry = async (retries = 2) => {
      let lastErr;
      for (let a = 0; a <= retries; a++) {
        try { return await generateMockup(logoDesc, typeId, logoB64, logoMime); }
        catch (e) { lastErr = e; if (a < retries) await new Promise(r => setTimeout(r, 800 * (a + 1))); }
      }
      throw lastErr;
    };
    let successCount = 0;
    let firstError = "";
    let typeId;
    for (typeId of selTypes) {
      setCurGen(typeId);
      try {
        const img = await genWithRetry();
        setResults(prev => ({ ...prev, [typeId]: img }));
        successCount++;
      } catch (e) {
        setResults(prev => ({ ...prev, [typeId]: null }));
        if (!firstError) firstError = e.message;
        console.error(typeId, e);
      }
      setGenQueue(prev => prev.filter(t => t !== typeId));
    }
    setCurGen(null);
    if (successCount > 0 && user?.uid) {
      changePoints(user.uid, -(successCount * 10), `목업 생성 (${successCount}종)`).then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(() => {});
    }
    if (successCount === 0) {
      // 전부 실패: step 2 유지 + 에러 + 재시도 버튼
      setError(firstError || t("mk_gen_fail"));
      return;
    }
    setStep(3);
  };

  const download = (typeId) => {
    const img = results[typeId]; if (!img) return;
    const type = getTypeInfo(typeId);
    const a = document.createElement("a");
    a.href = img;
    a.download = `mockup_${type?.label || typeId}.png`;
    a.click();
  };

  const reset = () => {
    setStep(1); setLogoText(""); setLogoB64(null); setLogoMime(null);
    setLogoPreview(null); setSelTypes([]); setResults({}); setError("");
  };

  // ── STEP 1: 설정
  if (step === 1) return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <StepBar steps={STEPS} current={1} isDark={isDark} />
      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 18px 80px" }}>
        {/* 제목은 ToolHeader에서 표시 */}

        {/* 로고 입력 */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:10 }}>{t("mk_logo_input")}</div>

          {/* 이미지 업로드 */}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoUpload}/>
          {logoPreview ? (
            <div style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px", borderRadius:12, border:`1.5px solid ${ACC}50`, background:`rgba(124,58,237,0.06)`, marginBottom:10 }}>
              <img src={logoPreview} alt="로고" style={{ width:72, height:72, objectFit:"contain", borderRadius:8, background:"#fff", padding:4, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:2 }}>{t("mk_logo_uploaded")}</div>
                <div style={{ fontSize:11, color:muted }}>{t("mk_logo_apply")}</div>
              </div>
              <button onClick={() => { setLogoPreview(null); setLogoB64(null); setLogoMime(null); }}
                style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(239,68,68,0.3)", background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>{t("mk_logo_remove")}</button>
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
            <span style={{ fontSize:11, color:muted }}>{t("mk_or_text")}</span>
            <div style={{ flex:1, height:1, background:bdr }}/>
          </div>
          <input value={logoText} onChange={e => setLogoText(e.target.value)}
            placeholder={t("mk_text_placeholder")} style={inp}/>
          <div style={{ fontSize:11, color:muted, marginTop:5 }}>{t("mk_both_hint")}</div>
        </div>

        {/* 목업 종류 선택 */}
        <div style={{ marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, color:text }}>{t("mk_type_select")} <span style={{ fontSize:11, color:muted, fontWeight:400 }}>({selTypes.length} · {t("mk_per_type")})</span></div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => setSelTypes(MOCKUP_TYPES.map(t=>t.id))}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>전체 선택</button>
              <button onClick={() => setSelTypes([])}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>전체 해제</button>
            </div>
          </div>

          {/* ── 종합 목업 (강조) */}
          {(() => {
            const C = COMPREHENSIVE_MOCKUP;
            const isSel = selTypes.includes(C.id);
            return (
              <button onClick={() => toggleType(C.id)}
                style={{ width:"100%", padding:"16px 20px", borderRadius:14, border:`2px solid ${isSel?"#f59e0b":bdr}`, background:isSel?"rgba(245,158,11,0.12)":cardBg, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14, marginBottom:16, transition:"all 0.12s", boxShadow:isSel?"0 0 0 3px rgba(245,158,11,0.2)":"none" }}>
                <div style={{ width:48, height:48, borderRadius:12, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>✨</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:14, fontWeight:900, color:isSel?"#f59e0b":text }}>종합 브랜드 목업</span>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:"rgba(245,158,11,0.2)", color:"#f59e0b", fontWeight:700 }}>추천</span>
                  </div>
                  <div style={{ fontSize:11, color:muted }}>명함·봉투·레터헤드·노트·폰·스티커 등을 한 이미지에 — 브랜드 정체성을 한눈에 보여줘요</div>
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:isSel?"#f59e0b":muted, flexShrink:0 }}>10P</div>
              </button>
            );
          })()}

          {/* ── 카테고리별 */}
          {MOCKUP_CATEGORIES.map(cat => (
            <div key={cat.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:muted, marginBottom:7, paddingLeft:2, letterSpacing:0.5 }}>{cat.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:6 }}>
                {cat.items.map(t => {
                  const isSel = selTypes.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleType(t.id)}
                      style={{ padding:"10px 6px", borderRadius:10, border:`2px solid ${isSel?t.color:bdr}`, background:isSel?`${t.color}15`:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.1s", boxShadow:isSel?`0 0 0 2px ${t.color}20`:"none" }}>
                      <div style={{ fontSize:18, marginBottom:3 }}>{t.icon}</div>
                      <div style={{ fontSize:10, fontWeight:800, color:isSel?t.color:text, marginBottom:1 }}>{t.label}</div>
                      <div style={{ fontSize:8, color:muted, lineHeight:1.3 }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:14 }}>⚠️ {error}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:muted }}>
            {selTypes.length > 0
              ? <><b style={{ color:ACC }}>{selTypes.length}가지</b> 목업 · <b style={{ color:ACC }}>{selTypes.length * 10}P</b> 차감</>
              : "목업 종류를 선택해주세요"}
          </div>
          <button onClick={generate} disabled={!canGenerate}
            style={{ padding:"13px 40px", borderRadius:12, border:"none", cursor:canGenerate?"pointer":"not-allowed", background:canGenerate?`linear-gradient(135deg,${ACC},#6d28d9)`:"rgba(124,58,237,0.3)", color:"#fff", fontSize:14, fontWeight:900, opacity:canGenerate?1:0.6 }}>
            {user ? `🎨 목업 생성하기 → ${selTypes.length * 10}P` : "✦ 1회 생성하기"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 생성 중
  if (step === 2) {
    const total = selTypes.length;
    const done  = Object.keys(results).length;
    const pct   = Math.round((done / Math.max(total,1)) * 100);
    const curType = getTypeInfo(curGen); // MOCKUP_TYPES → getTypeInfo (comprehensive 포함)
    const isRunning = curGen !== null;

    // 목업 종류별 생성 팁
    const TIPS = {
      comprehensive:   "명함·봉투·노트·폰 등 여러 아이템을 한 이미지에 배치하고 있어요",
      business_card:   "가로형 명함에 로고와 브랜드컬러를 적용하고 있어요",
      letterhead:      "공문서 레터헤드에 로고와 기업 CI를 배치하고 있어요",
      phone:           "스마트폰 화면에 로고가 들어간 UI를 생성하고 있어요",
      monitor:         "모니터 화면에 브랜드 웹사이트 느낌으로 적용하고 있어요",
      billboard:       "건물 옥외 빌보드에 대형 로고를 배치하고 있어요",
      signage:         "매장 간판에 로고와 조명 효과를 적용하고 있어요",
      magazine:        "잡지·카탈로그 표지에 브랜드 디자인을 적용하고 있어요",
      banner_vertical: "세로형 롤업 배너에 로고를 디자인하고 있어요",
      tshirt:          "티셔츠 가슴에 로고 프린팅을 시뮬레이션하고 있어요",
      tumbler:         "텀블러 측면에 로고 인쇄 효과를 적용하고 있어요",
      mug:             "머그컵 측면에 로고를 사실적으로 렌더링하고 있어요",
    };
    const tip = TIPS[curGen] || `${curType?.label || ""} 목업을 AI가 생성하고 있어요`;

    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
        <StepBar steps={STEPS} current={2} isDark={isDark} />
        <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>

          {/* 스피너 */}
          <div style={{ position:"relative", width:100, height:100, margin:"0 auto 20px" }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid rgba(124,58,237,0.15)" }}/>
            {isRunning && <>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:ACC, animation:"spin 1s linear infinite" }}/>
              <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"rgba(124,58,237,0.5)", animation:"spin 1.6s linear infinite reverse" }}/>
            </>}
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
              {isRunning ? (curType?.icon || "🎨") : "✅"}
            </div>
          </div>

          <div style={{ fontSize:17, fontWeight:900, color:text, marginBottom:6 }}>
            {isRunning ? "목업을 생성하고 있어요" : "모든 목업 생성 완료!"}
          </div>

          {/* 현재 생성 항목 + 진행 */}
          {isRunning && (
            <div style={{ background:`rgba(124,58,237,0.08)`, border:`1px solid ${ACC}30`, borderRadius:12, padding:"12px 16px", margin:"0 0 14px", textAlign:"left" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:20 }}>{curType?.icon || "🎨"}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:ACC }}>
                    {curType?.label || curGen} 생성 중... ({done+1}/{total})
                  </div>
                  <div style={{ fontSize:11, color:muted, marginTop:1 }}>{tip}</div>
                </div>
              </div>
            </div>
          )}

          {/* 진행 바 */}
          <div style={{ height:8, borderRadius:4, background:isDark?"rgba(255,255,255,0.08)":"#e8e8e8", overflow:"hidden", marginBottom:14 }}>
            <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${ACC},#6d28d9)`, width:`${pct}%`, transition:"width 0.6s ease" }}/>
          </div>
          <div style={{ fontSize:12, color:muted, marginBottom:14 }}>{done}/{total} 완료 · {Math.max(total-done,0)}개 남음</div>
          {error && (
            <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", textAlign:"left", marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#f87171", fontWeight:700, marginBottom:6 }}>{error}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { setError(""); generate(); }} style={{ flex:1, padding:"9px 14px", borderRadius:8, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#6d28d9)`, color:"#fff", fontSize:12, fontWeight:800 }}>다시 시도</button>
                <button onClick={() => { setError(""); setStep(1); }} style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>설정 변경</button>
              </div>
            </div>
          )}

          {/* 목록 */}
          <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:220, overflowY:"auto", textAlign:"left" }}>
            {selTypes.map(id => {
              const t = getTypeInfo(id);
              const isDone = results[id] !== undefined;
              const isGen  = curGen === id;
              const isPending = !isDone && !isGen;
              return (
                <div key={id} style={{
                  display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:9,
                  background:isDone?"rgba(74,222,128,0.08)":isGen?`rgba(124,58,237,0.1)`:"transparent",
                  border:`1px solid ${isDone?"rgba(74,222,128,0.25)":isGen?`${ACC}40`:bdr}`,
                  transition:"all 0.2s"
                }}>
                  <span style={{ fontSize:17, flexShrink:0 }}>{t?.icon || "🎨"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:isDone?"#4ade80":isGen?ACC:muted }}>{t?.label || id}</div>
                    {isGen && <div style={{ fontSize:10, color:muted, marginTop:1 }}>AI 이미지 생성 중...</div>}
                    {isDone && results[id] && <div style={{ fontSize:10, color:"#4ade80", marginTop:1 }}>✓ 생성 완료</div>}
                    {isDone && !results[id] && <div style={{ fontSize:10, color:"#f87171", marginTop:1 }}>생성 실패</div>}
                    {isPending && <div style={{ fontSize:10, color:muted, marginTop:1 }}>대기 중</div>}
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {isDone && results[id] ? (
                      <img src={results[id]} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:6, border:`1px solid ${ACC}` }}/>
                    ) : isDone && !results[id] ? <span style={{ fontSize:16 }}>❌</span> : isGen ? (
                      <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${ACC}40`, borderTopColor:ACC, animation:"spin 0.8s linear infinite" }}/>
                    ) : <span style={{ fontSize:16 }}>·</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize:11, color:muted, marginTop:14, lineHeight:1.7 }}>
            각 목업은 AI가 약 10~20초 동안 생성해요.<br/>
            페이지를 닫지 말고 기다려주세요.
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}.pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}`}</style>
      </div>
    );
  }

  // ── STEP 3: 결과
  const successResults = selTypes.filter(id => results[id]);
  const failResults    = selTypes.filter(id => results[id] === null);

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <StepBar steps={STEPS} current={3} isDark={isDark} />
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
                <div style={{ aspectRatio:"1", background:isDark?"rgba(255,255,255,0.03)":"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
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
                const t = getTypeInfo(id);
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

        {/* 프로 디자인 문의 배너 */}
        <div style={{ display:'flex', justifyContent:'center', marginTop:20, marginBottom:32 }}>
          <div style={{ width:'100%', maxWidth:640, borderRadius:20,
            border:`1px solid rgba(124,58,237,0.3)`,
            background: isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.04)',
            padding:'20px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center' }}>
            {/* 배지 */}
            <span style={{ fontSize:11, fontWeight:800, padding:'4px 14px', borderRadius:20,
              background:'rgba(124,58,237,0.15)', color:ACC }}>전문 디자인 문의</span>
            {/* 로고 */}
            <img src={"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7wooor/Lc/SAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKZLNHAheR1jQdWYgD8zVH/hJNJ3bf7Ust3937Qmf5120MDisUnLD0pTS7Rb/JHLVxWHoNKrUUW+7S/M0aKZFNHOgeN1kQ9GUgj8xT65JRlBuMlZo6IyUleLugoooqSgooooAKKKKACiiigAooooARmCKWYgAckntXk/jb4z+RLJZ6Bscr8rXrjK5/2B3+p49u9cf+1J+0n4T+FcP9hav4httNnkjElxboxkuXU/dQRrlsHqSQBgjnrXxB4p/b90Ozd4/D3hi91LBwJ9QnW3U++1Q5/UV/bHhF4XZI8HT4k4stPn1pUXquXpOcVq+beMX7vLq73SX888ccScRY3ETyfhelJKOk6qstesYSlZK32mne+itbX651LWL7WJjLfXc13Ie8rlsfQdvwqn+Ar498D/ALTHxr+NevNpPw+8C2GpXSgM6W9rLMIVPQySPIEQe7YFe2/8Kk/bA+w/av7N8GebjP2L7RD5n0zu25/4FX9Z4nxG4Q4f5cFVrwopLSPuxsvKN1ZfKx+FLwv4qxzdeoouT3bm236uzu/mew6brF9o8wlsbua0kHeJyufqO/416r4J+M/nyR2ev7ULfKt6gwuf9sdvqPy71+bnjj9pf41/BTXl0n4g+BbDTbpgWRLi1lhEyjqY5EkKOPdcitXwr+37od46R+IfDF7puTgz6fOtwo99rBD+prwuI8t4G8RcHy46MW5L3KsUlNdnGaumvJtxfVHs5TlHHfBlZVcDHmgvigpKUX6xbTv5pc3Zn6zqwdQykFSMgjvS186/st/tJ+EvipF/YWkeIbbUp0jMlvbuxjuUUfeQxthsDqCARgHnpX0VX+Y/GPC2J4OzirlWIkppawmtpwfwyW++zV3aSau7XP6/yDOYZ7gIYxQdOW0oSVpQkt4u9vVO2qafUKKKK+JPowooooAKKKKACvK/ip8WD4d+12OnSCJrVGe8ux1jCqWZU9wBye3avVBnIx1zxXxj8WvtP/CEeNd277Z/Zt/nPXf5Umf1r9t8LeHsFnWPrYjHRU1RUWovZuTerXVK2212rnu5Vh6dWVSrUV+RXt3ev+R+U3jzxde+PfGeteItRlkmvNTu5LqR5GLN8zEgZPYDAHsK0vhD8M9S+MXxL8O+DNJIS+1i7W2WVhlYk6vIR3CIGY+y1x5r6z/4Jg/ZP+GrdL+07fO/sq/+zZ6+Z5Xb32b6/rnP8dPKcnxWMoL3qVOTj2uk7fJfkfkdNe3rLnfxPX5n6u/CD4QeGfgj4GsPCvhWwWz0+2UeZKVHnXcuBumlb+J2P5cAYAAqn/w0H8NB4t/4Rj/hOtB/t7zPJ+xfbk3eZnGzd93dnjbnOeKP2g/7e/4Uf46/4Rjzv7e/se4+yfZ8+bu2fNsxzu27sY5zjFfib8nl9vJx+GK/kjgngmHHMMVj8fipKalbSzk5NX5pX6dlpez1Vj6fFYt4Nxp046H7f/F74Q+Gfjd4Gv8Awr4qsFvNPuVOyQKPOtZcHbNE38Lqfz5ByCRX4PfF/wCGepfBz4meIvBmrEPe6PdtbtKowsycGOQDsHQqw9mr90/2e/7e/wCFHeBP+En87+3v7Ht/tf2jPm7tvy7887tu3Oec5zX5Y/8ABUD7J/w1Zqf2bb539lWH2nHXzPK4z77Nn6V9P4S4/E4HOsVkTnz0kpPTVc0JKPMvKSfz0OTM4RnSjWtZnzP4E8XXvgPxloviLTpZIbzTLuO6jeNirfKwJGR2IyD7Gv3T+FfxYPiEWljqMola6RXs7s9ZAyhlV/cgjB796/A8V+u3wk+1f8IN4Kxu+2f2bYYx13+VHj9a/eeLeHMDxFgZUMXFcyT5Z9Yvvft3WzR73ClGOLhiKFTsmn2eq/yv6H2fRQc5Oeveiv8APA1CiiigAooooAK8q+KnwnPiH7XfadGJWukZLy0HWQMu1mT3IPI79q9Vor6PIM/xvDmNWNwMtdmntJdmu34p7HVhsTUwtT2lP/gNeZ/Ov478I3vgLxlrXh3UYpIbzTLuS1kWRSrfKxAOD6jBHsa0/hB8TNS+DnxM8O+M9JAe+0e7W5WJjhZU6PGT2DoWU+zV+xf7Un7NnhL4qRf27q/h621K4jjEdxcIpjuUUfdcSLhsDoQSRgDjrXxD4p/YB0O8d5PD3ie803JyINQgW4Ue25Sp/Q1/otwvCHHnD8cxwajUjNONSnfWMrWlB3tprdPrFp2V7H885vxhgOH80nl+ZxlRad4ys5RlF7NNXfk7rRpq7P00+EPxe8M/G7wNYeKvCt+t5p9yo3x7h51rLgboZV/hdT278EZBBqj/AMM9/DM+Lf8AhJ/+EE0H+3vN8/7b9iXd5mc+Zt+7uzzuxnPPWvzD8D/s0fGz4J68+rfD7x1YabdMArvbXUsQmUdBJG8ZRx7NkV7f/wALc/a/+w/Zf7Q8F+bjH237PD5n1xt25/4DX875j4FcWZfip/2HNqlPTWUoys+kuVNSXn17H1FHxF4ZrwTq4qF13dvwdmfbfxe+Lvhn4JeBtQ8VeKr9bPTrZTsjDDzrqXHywxL/ABOx7duScAE1+D3xg+JmpfGP4meIvGerAJe6xdtcGJTlYU4EcYPcIgVR/u19MeOf2afjZ8bNeTVviD46sNSulBVGuLqWVYVPURxpGEQey4rU8LfsA6HZukniHxPealg5MGnwLbqfbcxY/oK/Y/D7whx/C8J1q0eavUVnLaMVvyq+ru9W7a2Witr83m/iXw6l/vKklsopyb+aVvxPkDwL4RvfHnjLRfDunRSTXmp3cdrGkalm+ZgCcD0GSfYV+6fwr+E58PfZL7UYhEbWNY7O0PWMKoVWf3AAwO3U1xX7Lf7NfhL4Vxf27pHh6206d4zHb3DqZLl1P3nMjZbB6AAgdeOlfRVfinivxvUwmMrcOZXUTUVy1Zx1977UIvstpPe946W1/UOD8zrYvK3i40nSVbVc3xOC2bS25rt7u6s762Ciiiv5WPqAooooAKKKKACiiigBGUOpVgCCMEHvXk3jb4MefJJeaBtQt8zWTnC5/wBg9vofz7V61RX3fCHG2d8D4367k1blv8UXrCaXSUevk1aSu7NXZ8pxFwxlnFGG+rZlTvb4ZLSUX3i/zTun1TPlDUtIvtHmMV9aTWkg7SoVz9D3/Cqf4ivriWGOdCkiLIh6q4BH5GqP/CN6Tu3f2XZbv732dM/yr+vsB9KGn7FLH5W/ad4VNH8pRuvS8vU/nXF+BU/aN4THLk/vQ1XzUrP7kfMOm6PfaxMIrG0mu5D2iQtj6nt+Neq+Cvgx5Mkd5r+1yvzLZIcjP+2e/wBB+favV4oI4ECRosaD+FAAPyFPr814x+kNn/EGHngsopLB05aOSk5VGvKdoqN/7seZdJH23Dfg7lOUVo4nMKjxE46pNcsE/ON3zfN27oRVCKFUAKBgAdqWiiv5Rbbd2fvyVtEFFFFIYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/9k="} alt='로고'
              style={{ width:72, height:72, objectFit:'contain', borderRadius:12 }}/>
            {/* 제목 */}
            <div style={{ fontSize:17, fontWeight:900, color:text }}>
              고퀄리티 목업 · 패키지 · 브랜드 디자인은 여기서!
            </div>
            {/* 썸네일 */}
            <div style={{ width:'100%', borderRadius:14, overflow:'hidden', border:`1px solid rgba(124,58,237,0.2)` }}>
              <img src={"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBAUEBAYFBQUGBgYHCQ4JCQgICRINDQoOFRIWFhUSFBQXGiEcFxgfGRQUHScdHyIjJSUlFhwpLCgkKyEkJST/2wBDAQYGBgkICREJCREkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCT/wAARCACgAUADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD1zJoyaKK/ms+0DJoyaKKADJoyaKKADJoyaKKADJoyfWiigLHWoAY1zz8ooIA7AU5B+7X/AHRSkZ61/R9OK5UfGvcjCgU7FBFC5quVABAph4xgZGaeab9KOVAH4UnbpQTSdfajlQDc98UMcYowc5NNzgnH5Ucq7AYtz/x8Sf7xqOpLj/Xyf7xqOv50x3+81P8AE/zPqqfwL0CiiiuUsKKKKACiiigAooooA17P/j2j+lTVBZ/8e0f0qcGv3/KkvqVH/BH8kfO1fjl6i0UlO2nGe1d75VuZhRSUU+VCFpaSijlQC0tJRRyoDl6KKK/nQ+sCiipoodw3HB6cegz1PtWlOnKo7RFKSW5CAT0GaCCOoxV4BNyw5dn8wDEfG4emBxn8aaSjzCIOYl3NnzBnA7DBrreCt9rXb59u34mSq+RToqaWEqNwGOM49R6j/Coa46lOUHaRqpJ6oKKKKgZ1yHEaj/ZFLuwN2N23nHr7VHGTsUHHQU4YB6Dn9a/o+n8KPjXuXpLJZYw8DcMMgN3FVZI3iOHUj+tWbJ2MUkAO1l+ZD7H/AOv/ADrP/t5rd2jvrZgM4LJz+an+lW5JblwpSn8I/qB1FAxViJrLUImlsZ0cgcqp5H1HUVWkZIkaR2CooLMzHAAHUmmtdiJJxdmheO1NwCeormrnx9orqxs5JL9FXcZIeIcf756/hmvLfE3xV1rXLptO0bVYNKQnb+5T5x9W6/litI021foawoTl5HvGMcenb0phGDzXlHwqlj8MXc1lc65JqD6i4kleb/nt0DDJPUcflXrMi5GccipklutiJw5HYwbn/j4l/wB4/wA6iqS5/wCPiT/eNR1/OGO/3mp/if5n1FP4F6BRRRXKWFFFFABRRRQAUUUUAa1p/wAe0f0qaobT/j2j+lSSSCNSxr+gMq/3Kj/gj+SPnavxy9SG/dktX2SbHxwfX2rH07xB50osIWUEceY3b296ra3qjI3zNgdhWVDGpmW7DLGo5bHHPtXl8RKrCj7ek7W39PI6MKot8sjvYpN6DPDDhh6GpKxtLv471GD5LsOCT0q/aykEwufmXofUUsqz1V3ClUVr6Xvu/Ps2TWw7jdos0Zoor6U5BaKKKAOYooor+cz6wdGoZwD06n6VbtnmuVMaQGTy/nJQ4YLnkD+X/wCqqsfVv901f0RZ/OlltmHmxqD5Z6SL3H8q9PLYuVaNNXtK97Wvb5/8P21MK7tFvsW5IYkhWG3Bntronyf70Mn+etSLBKrlJYLzMmBK/ko4kPr/AJNRme0LT3hFwkcoACR8FXx8xz0H/wBeorKfT1lBS+voDnoxGD+Wa+nU6KqRXMtdrSSVvn0erSvdJ22OG0mnp+H9f1qQ6pB/Z85iCbt2HSRuu30P06VnyKFcgdOo+lbXihlL2oBydhOfbisaT+H/AHRXz+d0o0sVUpQ2TVvmr2/H8DswsnKmpPdjKKKB1FeKdJi3PjrV97JG1vEFJUFY89PrWZdeLdWmyH1G4+iEL/LFYmoTMt6F/wCWbsy/8C6j+tZ+tX82l6ZPeQW32l4gD5e7HGcZ/Cv6QpK8UfGSdrnY+F/Fk+meIbW4uJpZIXPlTbmLYRu/PocH8K9d1O1in+WVco/Rh1Br5B1DxHfzsqz3HlIQMxRfKPpnqa+jfg34tHjbwLAs0u6+05vsc5PU7fuP+K4/EGuidG0feM+d7w3RejtZvD+qx3qkvB92THUoev5dfwrorqILJuXBR+R6Gi4snaB0dd3GRjmoNJuVvbOS1z++tTgA9dvb/CuKn7k3BnbUqyxFNVJLVaM8l8UaRp/hu9bRYpRawXu6a3ToACeVH0P8xXLJ4R0XRjJdlGkmIJyTXp/xa8GJ4v8ACzmFWGpaaTeWbp9/co+ZB/vAYx6gV4T4b1rxh48u4rfRdDnvbRcLLcMm2Jfq7YGfxr1IqNSnq7dzqw04yjeb23Ma91m7sNWkuohMYkbOVBIWvpT4Y+NoPHHhqK7Ega6h/dXC98jo2Pcfrmuetvg9/a0MSeIbuKGFRn7Hp4xn/ekI/kPxruNA8LaD4QtDb6Pp1tYRn75QfM/uzHlvxNZzrKcbNWOfEVKclaJWuv8Aj5l/3z/OoqknZXnkZSCpYkEd6y/EOsx+HdC1DWJoJp47G3e4aKIZdwozgV/NuLhKeLnCK1cmvxPfg0oJvsZ2v+PvDvhe/t7DWL6S0ubo4t0NtK3nHIGEKqQxyQMD1q7eeJdLsLu0sZ7ki+vFLQWaxs07qOp8sDIA7k4Arx/4h6lP408QfCi/tNOu7WW7vGufskwxLGgkiJYj0wpOfTmtXw5Hc6f+0Z4jOrblbUdPzpjydJIgY8qn0CnIHoa9p5LRjh1Uk2pqE5NXW8Zctlptu3vonbuc31iXNZbXS+9XPTLHxJpeoalPpcN0F1C3UPLaTKY5VU9G2sASv+0Mip7nWLC01Kz0ye6jjvL4SNbwk/NKIwC+PoCK8r8cR3F98evBw0o/v9Ptmm1CRTxDblmJ8w9gVLcH+8PWqHxfsNQ1HTNO+JOgrP8Aa9HlFzBMJFMT2eRtIAbPX5jxyHYHpUUclpVKlGLnyqpG+vSTuop+Tav3t945YiSUtL2f4Hsmo6nDpiI88dwyO23dHHuCn/aPb6mqg8S2htzcC3vzCJBFv+znbn1znG3tnpnisC68S2PjX4ZNrNgvmxX1uP3CncyyZG6PA/iBBH4ZqvZ204+G6r5jLELfZ9jMA3/e/wBXnOc/rXHTwEFD98rSU+Vr+v8AhvM0dV393a1zsNN1WDVBI0EdwEQgb5I9qtkZ+U9G/Crtc58PEEXg/TovKaEpHtMTDDIeuCDyOuefWujrz8XTjTrSpx2Tt9xrBtxTZrWn/Hun0qK7bg1Ja/8AHsn0qC8b5Sa/eMq/3Kj/AII/kjwavxy9WcV4nDvgqehrHstTjnb7E0mJlBdVz94d/wAq2fEUh2Ngdq8t1Ce4t9QW8gYrNC25D/Q+x6U8wwaxVCVLr09TSjPkkpHqGiariZlGVVHKKxP3yOuPYHj8DXaJP9piWeM/OtePLNBfQW+o2caos+VcKm5g56pjuc9F4Xuc9K7vwtrnnxKrspcD5gHDAjpnPQ9OSOM5r83qUnh5PovxTX/BPbrUVKCqw1O1hlWaMOO/Wn1nQTeRL1/dyfpWhmv0HJ8x+uUby+OOj/z+Z4NanyS02FooozXrGJzNFFFfzmfVjkbYwbGcdqntZZ7O4823blRnPYr71WqSKYoQDnAOR7V0YepyTTu007proRON0b0NxezWo/s/7OpZmeRC3zhiemDUX9oalYENdW8DZPfaGP0x/hWaGidixVCdhGQeS3ryRTmlhUHaioSoBbdkgjnIxmvpP7Tm4qSqNNLpL3f/AAHlt+JxewV7NX+Wv33DUpJ7u8Mk6+XuHAznaoqo7b2J6DsPanzTmUnk89T6/wCA9qir57GVlVqSkm3d3bZ2U48sUgoHUUUVyGh51qsBlSQLgMGLA98g5FVoyl1bgsuUkXDKf1FdB4h0w6dqc9uB8pIdCecq3IrBtLWY3ctrFHJKzfvUVFJOD14Hv/Ov6QpfCj42W54hrsl5beJLrTpgR9nlwD/eXqp/EEV23w/8S6z4SxcaTfy2rzsPNUAFZAM4DKRg9T+ddF4s+FOv63qNtqNjo1y0rIYZMgJnHKscke4z9K2tD+BmuGKL+0J7W1C4yiSbj+YGK7/aJx94mEVE6nQvj7NHGF1vTUnwceZZna5/4AeCfoRXomheNfDWvMlxbXKW9y642XSeTLj056/ma4TTfhLa2CZN5HGe7JFlj/wJjVz/AIQnQlbyy97fSf3EIH54HFc0uV7Ipvseg3kXlS7h91uRWbLdWlhEqFo40XhUUAAfQCsvTtCltIlignmsrbnMIlaQn/vokL+HrWnBYW1swdE3P/z0f5m/M1JJAby8uh/o0Hkqekk3GfoOtC6ajtvupXuG9GOF/wC+R/Wr3fNNJ5xSuFjCnULM6qAAGIAA6VGQGBBAIPBB71Lc/wDHxJ/vGo6/nLHf7zU/xP8AM+sp/AvQq2+l2FrObiCyt4piuzzEjAbb/dz1x7dKdeafZ6iqLeWkFyI23p5sYbY3qM9D7irFFYe0nfmu7lWWxTj0bTIoJ4E0+0WK5/16CFcTf7/Hzfjmm/2FpP2D+zv7LsfsQOfs3kL5Wf8Acxj9KvUU/bVP5n94uVdjNh8NaHboqQaNp0KqxcLHbIoDEYJGB1xxmpP7C0n/AKBtn9/zP9Sv3sY3dOuOM+lXqKbr1HvJ/eHKuxXtdOs7J5HtbWCBpMb2jQKXx0yR1xViiis3Jyd2xpWNW1/49k+lU70kqQKt2/8Ax6p9KrXC7s1+/wCVf7lR/wAEfyR8/V+OXqzltVtvMVs9xXm2tWBimYY4J4r1u8h3AiuO13TPNVjt5ruEmcToWoLpl61tc4Nld4RweiN0Df0NdhpAfR7qR36uiq3zhjKwP3v9lcYGOg9PXjNQsT8ykfUVveGdTN9aG0nAa7tQNpb+NOx9yOn5V8txBgLxdeC0fxfo/wBH8j1cDiXFOlLZnpujXkt9GBKV2n7vX9O/4n8q37Sfeuw5yvTPcVxPh+5aDKyyfPndkt19q6VL0PJEYzukJwFHf/61fO5bjpYOrGa9Gl1X+YYqkptpbG1mikHSlr9MTPGOaooor+dD6sKKKKACiiigAooooAKKKKAN250PTtRkjnu7VJpFQKC2elc74rsbfw5c6Z4gsbdIEs5vKuViXG6F+Dn6f4V2EYxGv0FR3tlb6jaS2l1GJYJV2uh7iv6Pp/Cj417jHuYYk3vIu3GQc9R61B9tnuR/oduWU/8ALST5V/8Ar/hUlnpFpZoiohk8tQqmQ7toAwMdhV3mtbk2KA01pW3Xdw8v+wvyr/iatxwxwIEiRI1H8KjAp+KQj8RSHYMe9HfFB4AA+n0pOaAEPNMIBwSORT/84pp5I7UAYdz/AMfEn+8ajqS5/wCPiT/eNR1/OWO/3mp/if5n1dP4F6BRRRXKWFFFFABRRRQAUUUUAalt/wAeyfSoplqW2/49k+lNlFf0BlX+5Uf8EfyR89V+OXqzLuUzmsa+tQ4PFdBMuaz7iLINdzIR53rembGLhfrXPAPYXcd3BxJGc47MO4Psa9H1SyEisMVxl9YtHMU2nk8VMoqUXGSumaRfVG2mtWgtUu1lzvHyxqQXJ9MV23gwTy232m5jCSSc467R2Ga4nwz4aDyrPKgz16V6fptuIIQAMACvLwOTYfCzdRK8u76f13Na2JlNWZeooor1zkML7Ddf8+8n5UfYbr/nhJ+VdHg+tHI7V8R/qDhf+fsvw/yO3+1qn8qOc+w3X/PCT8qPsN1/z7yflXR8GjHoaP8AUHCf8/Zfh/kP+1qn8qOc+w3X/PCT8qPsN1/zwk/Kuj5HagYo/wBQcL/z9l+H+Qv7Wqfyo5z7Bdf8+8n5UfYbr/nhJ+VdJj3owaP9QcL/AM/Zfh/kP+1qn8qOb+w3X/PCT8qPsF1/z7yflXR/hSgZoXAOE/5+y/D/ACF/a1T+VES3duFAMyDAAwTTheW//PeP86wH++31pK8d8f4qD5VSjp6/5m39mQevMzf+123Xz48/Wl+2W/8Az3j/ADrn6KX/ABEHF/8APqP4/wCYf2XD+Zm/9st8f6+P86Ptlv8A894/zrAoo/4iDi/+fUfx/wAw/suH8zN/7Zb9POj/ADpPtdvj/XR/nWDRR/xEHF/8+o/j/mH9lw/mZuG7gz/ro/zpDdW5/wCWqfnWJRR/xEHF/wDPqP4/5h/ZcP5mSzqXmdlGQWJBFM8tv7pqdPuL9KdXsR4HwuJisRKpJOfvdOuvY53mM4PlSWhW8tv7po8tv7pqzRVf8Q+wn/P2X4f5C/tSf8qK3lt/dNHlt/dNWaKP+IfYT/n7L8P8g/tSf8qK3lt/dNHlt/dNWaKP+IfYT/n7L8P8g/tSf8qK3lt/dNHlt/dNS3FxDZwtPczRwQryZJXCKPxPFcbrfxg8KaPJHDFcz6pPJnbHp8fmAAdSWOFAH1pPw/wa3qy/D/IazSo/so9EtLWdrWMrE5BHUD3pXsbk/wDLCT/vmp/BWsJ4g8KaZqscTQpdw+YsbMCVGTwSK26+1w2FjRowpRd1FJfcrHDKs5Ns5V9Nuz/y7S/981Wl0i9PS0mP/Aa7Oit/Zon2rPPLnQNQkBAsp/8AviqI8GXckm+Sxmz7pXqBFIRR7JD9szibLQrm3wPssigf7NbEVnMiYMTj8K3DTTR7NC9qzI+zzf8APNvyo8mX+435VqEUwij2aD2jKWD2pCx70o4pciggaMGnAUnynpS49KAA5pM0ucUZBoASl5oxQOKAEz6igU7IpBjPSmBzj/fb6mkpX++31NJX821fjZ9atgoooqBhRRRQAUUUUAFFFFAFlPuL9KdTU+4v0od1jQvIyoo6sxwPzr+jsD/u1P8Awr8kfJ1fjY6iq9pqFpf+Z9kuYp/LO1/LbO01i+JPFn9h3ItY4EkmePem99oZjuwv47TyeK2rVI0ouc9EhUouq1GGtzoqz9U1/StEQNqOoW9rnOBI/wAzfQdTXF2PjCbW5nikvvJeMjzIdwUrk4AwDzycZyazr/xKuo3dzp9pYBrS2kMNzdvGJMOBkqARgem7HWsli6fsnVd7L7yp0Zxqqit2emafqNrqluLmzmWaEnAdehryz4mfFPxD4V8VDTNKt7NoIY45WWWMsZ9w6E5G0Z9OeDzXf+DreO10cLFEkKM28IvQZArxf4nuNZ8e6ukAz9lMdqxzxlYlLf8AoRFTTxKq0VWWiZniYSpS5OqZxct3r/j7XWlv5Lq7W4ugZYoyTHEOThVJIVQOlHiHw9quk6jk/vTuKLPbjkDPRl7dcZ6dq9i+H+mWGl2zGEeXcLAsplfCttkdsnPHBwuOMjHfil8SNHHrJJbEEsKmQheFcnG45xgj5T05wa5qlaSSqrbt/XU6aVFNci+Lv/XQ9Q+CcTQfCrw3GzFmFqck9c+Y9dvXM/DWNofAukIxyyxMCc5yfMbv6V01elF3imcyCiijoM1QCGkNU7nWLO2JBl8xh/DHz+vSs2bXbibiCNYl9T8zf4VPMtkaxoTetjcZgoyxAHqTikNcndK9wC08ryN23HNami6qZsWlw371eEY/xj0+v86bunqVKhaN07mqaY1SGmGmYFDNO60mQaMVAw2+hpOnWsfxVrEmhadFeJyvnqjj1Ug5wexos74albx3NsxljkGVbr/k1N1sXGDepsGRR1Iphnjz6+9UvJuG+98v1NHkov8ArJc+wpj5F3NBcOuUbIp3Iqil1FDnYKuRTLMu5Tx/Ki5Li0OzmmTzQ20TzzyLFFGNzOxwFFUtZ1yy0ODzbp/mb/VxJy8h9h6e/SuDv9Q1HxTcxrIjeUzYhtYuRn1Pqfc9PaonUUdOoKNzpywc7lOQ3IPtRSKpRQp4IAFNm80RP5AjMu07BISFJ7ZI5xX85VNZv1Pq1sPoryTWfjyfDmpy6Zq+i21pdxHBSa6miz7gmAgg9iDimR/tD2DgH+yLVwf+eet2w/STYa9dcOZi4qap6PreP+Zz/W6W1z16ivO9L+KF94kE40/SrXSFt5Fikm1e4LfMVDDZHCCXBUghtwB7E0/UviFqfhyxlv7yDS9dtY9m7+ynkhuPnZUXEUm4PlmUcPnnpWP9jYpS5HH3u11189vxuV9Yha/Q9BoryWf9oKygdkbREhZThluNZtEZT6FVZiD7YqrH+0XaXNylrbaVaTTyHakUN5LO7H0ASA5/Ot48N5lJXVL8Y/5k/W6Xc9koqppM97c2EM2oW0VrcSDc0MbFvLz0BJAOfXirdeLOLjJxfQ6E7q5ydxr/AIour27t4bS3062tJ8LM/wA5uIhnJB/hbjpjv1rjvFuq6/banZXMsLSWEgDymTJBPTaM8DggjHWvTNQaHzPsiMDLKjPJzyq/4ms7WLawvbaK21W3jurZyfllYgofVW4r+kcucoYWnyJXcVv6HymIjhnW/fN8ietv66Gf8JRJLaapey8fap1dF/uoAQOO3eub+LE8sviZliV/KtbSESygcRu5cpz2PGa6nwFpsWkajeRWp/0eaIFQH3ruVvX1w1eaat4njv8Axv4/sGHmedLbQwc8J5B2Mf1P50Yn91C0tdNf1NsKljKrlS0SemlrJPRW12X5F74dWcE2rXl24V2SIYQjIOWBzj0GM16bD4dtGe4e3hijedhJJgDDNjB6fSvFdM1Ofw5cmaLLyEGNkcYRlwDgjuDxXo+m+L7q80y2topha3l1txNBGoEBzjbgg7gMc8fl1rycRODw7pzWj/LuehjaVSNVVovy+ZqeAtce88Ra9o8lyZobR0MJKBcLuKt07Zx+FeJeGb8eJfEPii+klB8zVDcqpHVHZ1yPoFFdd4G1W80rxhrRvyFu10++EwAwPMiAfj2+XIryb4X6l9j1S4SRhsuLNy2T1ZSGH15/nXTVXLhuWnpbseZXhetGO/N+p7bpEMtjeedHcTxFAlus/mYwoOMgdCSwIz2yT2FZE+p6hdeLhBcjbZ2iMbqNyC01wWztzuyPl2jJB24OAetdvoWnRRafp6SxtqEU8cVzGzyLEke7LFQFDOxzwTgdB6VtJ4aEfiGDUY9FsY/MkInl+zIGKhSEO58uT90cY6Vy0MNK1pvTp1N5+0he2luv9bnbfDqIQeCdIjEIgVYSFiAICDe2AM9sVv3FzBaRGa4mjhjXq7sABUOlkHTbYht37tefWsD4lA/8IpLIvWOaJv8Ax7H9a9eUvZ079kY4aiqtaNJvd2E1P4iaXZ5W0SS8f1X5E/M8/pXMS+OLvU7xRdiOG2PASPOFPqc9a5RJBIgYd6UmvGnjKknvofa0cmw1JWSu+7O+SUDqasJcHGQOPXtXM+HtXBxaTldwH7tiMnHp9a2pIzIGUEMx9Dub8AOBXsYOrTkkz5/HUKlKTiySXUF9RTIr+JnHzbWByD6Vn3ESBcbvLwef4mP9KxNR1S004kzXSoM8KT8x/AV7P1eM43R5PtWpcrPVtN1AXkQDEeYBz/te9WzXjemeP5dwSyiPyniWX+gFep6Xq8WpQLIjDJFefOPK7Gc42Z53pnxHv7bC6hBHeR/89I8I/wDgf0rrdJ8YaLq7LHBepHOf+WE/7t/wzwfwJrx3VfhD468KEzeGdXi8Q2a8i0vMRXAHoG+635iua/4TW3tbv+zPFGmXei3ucGO6iKgn1BPBHuK8+9SG+praMj1n48azqei+FLeW10z7VZm6Q3c4fm3Ufd+XHO4kjPQYA7iuV+HfxC/s11Uy+Zp9zhj32H+8Pf1FO0/xFerp0ltbX8eo6bOhjktbj97E6HgrzyBj0Irh9N8OT6Fc3IglV7KRjIkJzvhOenPUY7+1Dqpu63NKat7r2PpGS78yLzTKNpAZSzBVYeoY8YrHufFOk2hPnXsJIPKR5diMe3AOa8oXUZmtkTJIUYGTkCqpaW5cqJTu9B1q3V7IpUn1Z6JdfEO0iVlggnuDnKu7CP8AQZqpY/ETVWuVitYbZVKsFjKkjpxkk5OPSuLg0+R5VjXmQ8Dc3Ndv4Q8A3c1wl9dS+TbAHBT70mf7ue3+1+VRzylohyjBLUn07Rr/AFy9eeaRri5Y5lmkPyx+mfT2Uf8A167vStHttIi2RDfIQA8rfeb29h7D9atW1tDaQrBbxiONeij+fufepMEH1rWFNR1OSUrmA/32+tJSv94/Wkr+cqnxs+rWxHPbw3KFJokkUjGGUH/9VcTrHwg0TVpWkXUdatN38EV0GQH6OrfzruGdUKhmVSxwuTjJ9B61U1UXMliwsWbzdyZ8t1Vym4bgpPAYrnBP/wBeunCYqvQkvYz5b/cZ1IRkveVzz7wl8O/EXw/u5ZdMvLLUrNRtW1dmjkliyTsLEbQysWZG6Dcynggre8X+HfE/jy2SKA2+h2iPmOO5bdPnBBlYR5AYAkIu7gkuTkKBqLH4sVWPnxRyny/LWaRGRwImyuRzuL7ckDjqMgYoWPxOTtE7PMJmJUTR7fLMYCE85wGyQMcn8x7MsVWlW+sSnBzXX+tH62Ofkio8qTsYmh/A7RdIigVtW1mTylCmOO4WOPjsMJux/wACrvrDTbTTIUhtYVjVBgHq34seT+dUtCOoo14mpS7z5gaItIhO0jsF6DI4z154HfUEiFtodSxGcAjOPWvLx+MxNebVapzfkb0qcIr3VYdRRRXnGx5vc6y2m+JbyR5lH751+c9uePyrOXxFJ4jS9ntowrWSnZE53GSTBOCz5xnAFR3+iz63r99PM9vZ2y3U0MU00oBchiG2oMseTjpW3o/gOHSi8olvLyad1Bjx9lQIM/MN43Nj2AzkV/RKlKrhqMYr7MfyR8bgIeylUnN7t2/VlzwlqAfXtOMdw7RyKyyRuANrlc44AyOK8E8KambnxzqVyVEr3pu3VW6M5Yuv6ivdfEVla+E/EWinT4mhg2NvUkkEBmUHJ78jivmjwldy2utWk8TESAtgj3Qj+tS1KcPZy9D3svjGn7SrHtc+gdL8HQ6la2kd5O5V1LA29u0jk5ILM5wq9PWtjSPBum6Pe29zFp8sm6VYt8sxmb5jgkiMbQAPUmr/AMNopr3wbptzPCk86mVC8nzbcOT06d+ta+ueOPDfh2EnV9dgXyhhoLc739MbUz7dcVSoRS5ZanPVxs6l1Fu3l0/C7+djzT4nxHSfGmo3sUQSOXQJssq4Bc28yEn3+Vf0rwDwnM0Ooo6HDLE4H5V7F8WPGlpr2itqFksypLaPCplj8tiCW/hyccMf8K8f8J2D3WpxZcojBlOPvY2mrnFRjZnl1XKtOEKa12Xm7/5s+vfBt1Ha+C9GkuL6G3CWI3mRgrgJnJ56gVkax8ZvC2m7vsKXusTgYBjTZGfcO+PzANeOwRtaaybGe4nns5cRTCNfnljDbvLVuwZh8wHYD6VDf2F7qFzM80Uds7sziItzuJJwFHPQBRwOKzp1b27GjpzTlGWjifXXgDVm1zwbpWpPH5bXEJYruDY+Zh1AAPT0FJ8QI/M8Iaj/ALKq/wCTrVP4TxmH4c6DGc5Ft3GP427V0ep2EOq6fcWNxnyp0KMV6jPcV2TjzU3FdUVhavs6sKkujTPAIJvKfB+6etWi1M1nSrjRNRnsLoYkibGR0cdmHsRXOa9r13poihtwgLqTvYZI57dq+bs0+Vn6ZzRlFTi7pnRSXC2w855REF53lsY/GtKL4hWUlkGh33Eq/Iwj+VSR3z+NeP3d5cXj77iZ5W/2jnFavh9wLWY/9NP6CuvC3U7I8zMlF0uZrY6jV/FupXmVSQW6H+GLg/n1rnmy7FmJYnqSck0533tmm7wvNfY05KnSUT4ma56nMa+ksIto7kiu60HW5NOnB3Exk8j0rzbS3uLy8iWCKR4w43OB8qj6120ETLjNeY58zbFXSTSPWx05qjrGhaV4hs2s9W0+1v7Zv+WVxGHUfTPT6irwI70hA7GsjI8h1v8AZ5tLeRrvwXrd1oU+Sfs0zGa2J9P7y/rXjOq+L/EOgatcaVrtmqXdpIYpdo5BHf3BHII6givsUHFeW/G34UN44s4tW0WCNtctgIyhYJ9qiz90seNy5yCe2R6VnKCZUZNHj+j+PbW8dImVBnjBGDWvejSfC+nNq8caQvMDhwxZ5CTnGSSan0b9l/xBelX1nVtO05epWDdPIPxGFH5mvSNJ+AfhmC3tU1261HXntVKxi4l8qJQST9xMZ+pJrN0Wy/adz5yk16/1a9WUzzR/NmOONjuPp05/Cvqr4X+Jdc8S+Glm13S7mzuoWEXnSx+WLtccOFOCPQ8Yz09tzRvC+heHkCaRpFhYgd4IFVj/AMC6/rWoS3U8n1rWMOUiUriA5oxzwaMg0fSrIMB/vt9aSlf77fWkr+bqnxs+tWxm6lo4v7y3ufMiBiUoVlgEowWVsrk/K3y/e54/Cs2PwWITbmLVbwfZ2R1DYfcyxiPnOfl27hgYxvNdJRW0MZWhHli9PkQ6cW7s5e38A2cTQ+de3d0kKxqizNnARGVAD6Ddn1OOSacvgiAlFku2MaFWBSMJIxDRt8zg5IBjG3+774FdNRWjzHEN35/yF7GHY5m38EJCy7tSuCAkYLIojkdlVl3MynqQ3YAfXtb0rwpa6ZfJemR55o4/LjLDGzOcnjqSDituipnjq8005bjVKK6BRRRXIaHNeF7SOePVJGWZvJ1W6wY32dWBwT1/CunTyLeMM721lH/FICA3/fTda8I134ga1oV7rVjpl69ujajPlYVG923EfexkdO1W11y6GhWl3qs0lxeSRiXy0BLt3wATkFeufbpX71hcQ4Yanpd2X5Hy1Sq+ZwTslc6D4p63BdWaTW1yrmzWWVSrEqRtyD0HXnjnr1r5v8N+YmpW04UlI3AY+meK9evry6v7TfPFE6yHY0Z4Zl3ANx9Oo+tLqfwG1iwnS58PossCuCbWWUBgM/wsfvD2PPvXqPDVqbvUtd9juy/F0kpQqPRlGd76XwfaeXf3hiecp9mSRhGvLZO0cc/L1z0rMs9JvJ5AEt2MSMCzcBR+J4r1Dwv8PtejsUgurO0s1Dh91xL5hUE/NhADyQAMseMng10dn8KNBimea/a61FmbOyeQiNec4CjtWLo1JTu0b08fShCUVtfS3Y840Xwq3iWW2ubm4gMYm2rCy71mAOG56Edq07r9n37NqkGpaJeW9qY3y1pLuMZHIO09V69OR9K9fsNNstKgEFhaQWsQ6JEgUVZrenRl73tZXv5WseXWqQlyqnGyjseY6R8FoopVuNV1SR3AwI7UFQv0Y8/pXbaX4S0TRwPsmnxBh/HIN7fma2KK1jShHZGLbbcnuzpdLP8AxL4P93+tWs1U0w/6BD/u/wBatZrQRyXxD8L/ANuab9sto83topIA6yJ1K/UdR+PrXzz4u4e2PqrD9RX1lnFeK/FX4W6pqWrRXWgWqy28xZpFBx5LnGeOuD149683GYVykqkFr1PpcmzSNODoVnZLVP8AT/I8Rll2j0rQ0W7AtJVByWlxj8BXd6b8FLuMiTU4Lm4brsC7U/xNdXYeBGsiv2fS0hIGAQgBA+tVhsLKEuaROYZxTqRdOmr+Z51YaBqV9hvKMMZ/il4/Ida6Gy8J2sODPm4f/a+7+Vej6f4KkfDXB2j0FdFa+HLG2AxEpI74r0nNs+flUbPPdO8O3NyFWGDYg6cYA/Cuo07wXGmHuTvPp2rq44I4hhEAFONSQf/Z"}
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
                  background:`linear-gradient(135deg,${ACC},#6d28d9)`, color:'#fff', fontSize:14, fontWeight:800 }}>
                포트폴리오 보러가기
              </button>
              <button onClick={e => { e.stopPropagation(); window.open('https://xn--p39ay4k91o0re35a.com/contact', '_blank'); }}
                style={{ flex:1, minWidth:140, padding:'13px 20px', borderRadius:12, cursor:'pointer',
                  border:`1px solid rgba(124,58,237,0.5)`, background:'transparent', color:ACC, fontSize:14, fontWeight:800 }}>
                문의하기
              </button>
            </div>
          </div>
        </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pixelReveal{0%{filter:blur(20px) saturate(0.3);opacity:0.3}30%{filter:blur(10px) saturate(0.6);opacity:0.6}60%{filter:blur(4px) saturate(0.8);opacity:0.85}100%{filter:blur(0) saturate(1);opacity:1}}.pixel-reveal{animation:pixelReveal 1.2s ease-out forwards}`}</style>
    </div>
  );
}
