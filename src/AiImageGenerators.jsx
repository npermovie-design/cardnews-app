import { useState, useRef } from "react";
import { getAuthToken } from "./storage";

/* ════════════════════════════════════════════════════════════
   AI 이미지 생성기 모듈
   - ModelGenerator, SkinRetouchGenerator, FaceSwapGenerator,
     OutfitSwapGenerator, OutpaintGenerator
   - 공용: useGenColors, GenLoading, SelectGroup, BeforeAfterSlider
════════════════════════════════════════════════════════════ */

/* ── 공통 스타일 헬퍼 ─────────────────────────────────────────── */
function useGenColors(isDark) {
  return {
    ACC: "#7c6aff",
    bg: isDark ? "transparent" : "#f4f4f8",
    card: isDark ? "rgba(255,255,255,0.05)" : "#fff",
    bdr: isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0",
    text: isDark ? "#fff" : "#1a1a2e",
    muted: isDark ? "rgba(255,255,255,0.45)" : "#888",
    ibg: isDark ? "rgba(255,255,255,0.06)" : "#f9f9fc",
  };
}

function StepBar() { return null; }

// ── 탭 그룹 (글쓰기처럼 상단 탭 + 콘텐츠) ──
function TabbedGroup({ isDark, theme, title, subtitle, tabs, defaultTab, renderTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const accent = "#7c6aff";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* 헤더 + 탭 */}
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)" }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"16px 24px 0" }}>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:3 }}>{title}</div>
            <div style={{ fontSize:12, color:muted }}>{subtitle}</div>
          </div>
          <div style={{ display:"flex", gap:0, borderBottom:`1.5px solid ${bdr}` }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{
                  flex:1, padding:"12px 20px", border:"none", cursor:"pointer", fontSize:15, fontWeight:activeTab===t.id?800:500,
                  color:activeTab===t.id?accent:muted, background:"transparent",
                  borderBottom:activeTab===t.id?`2.5px solid ${accent}`:"2.5px solid transparent",
                  transition:"all 0.15s", marginBottom:-1.5,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 콘텐츠 */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {renderTab(activeTab)}
      </div>
    </div>
  );
}

function GenLoading({ emoji, title, subtitle, ACC, isDark }) {
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const text = isDark ? "#fff" : "#1a1a2e";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
      <div style={{ fontSize:80, marginBottom:20, animation:"ai-float 2s ease-in-out infinite" }}>{emoji}</div>
      <div style={{ fontSize:22, fontWeight:900, color:ACC, marginBottom:8 }}>{title}</div>
      <div style={{ width:280, height:6, borderRadius:3, background:"rgba(128,128,128,0.15)", overflow:"hidden", marginBottom:16 }}>
        <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg,${ACC},#8b5cf6)`, animation:"ai-progress 4s ease-out forwards" }} />
      </div>
      <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>{subtitle}</div>
      <div style={{ marginTop:20, display:"flex", gap:8 }}>
        {["레이아웃 구성","스타일 적용","디테일 추가"].map((t,i)=>(
          <div key={i} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
            background:`${ACC}18`, color:ACC, border:`1px solid ${ACC}30`,
            animation:`ai-fadein 0.5s ease ${i*0.3}s both` }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function SelectGroup({ label, options, value, onChange, cols=3, ACC, bdr, muted, text }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>{label}</div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:6 }}>
        {options.map(o => (
          <button key={o.v||o} onClick={() => onChange(o.v||o)} style={{
            padding:"9px 8px", borderRadius:10, border:`1.5px solid ${value===(o.v||o)?ACC:bdr}`,
            background: value===(o.v||o)?`${ACC}18`:"transparent",
            color: value===(o.v||o)?ACC:muted, fontSize:12, fontWeight:700, cursor:"pointer",
            textAlign:"center", transition:"all 0.15s",
          }}>{o.l||o}</button>
        ))}
      </div>
    </div>
  );
}

/* ── 모델 생성기 ─────────────────────────────────────────── */
function ModelGenerator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenuFn, showPointConfirm }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted, ibg } = C;
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("20대");
  const [nationality, setNationality] = useState("한국인");
  const [outfit, setOutfit] = useState("캐주얼");
  const [bgType, setBgType] = useState("화이트 스튜디오");
  const [pose, setPose] = useState("정면");
  const [refImg, setRefImg] = useState(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const buildPrompt = () => {
    if (useCustom && customPrompt.trim()) return customPrompt.trim();
    const gMap = { female:"beautiful woman", male:"handsome man", both:"couple man and woman" };
    const nMap = { "한국인":"Korean", "일본인":"Japanese", "중국인":"Chinese", "서양인":"Caucasian Western", "흑인":"Black", "다양한":"multiethnic" };
    const oMap = { "캐주얼":"casual everyday outfit", "비즈니스":"business formal suit", "스트릿":"streetwear", "스포츠":"sportswear athletic wear", "드레스":"elegant dress", "한복":"traditional Korean hanbok", "코트":"stylish winter coat", "수영복":"swimwear beachwear" };
    const bMap = { "화이트 스튜디오":"clean white studio background", "카페 인테리어":"cozy cafe interior background", "도시 거리":"modern city street background", "자연/공원":"natural park outdoor background", "해변":"beautiful beach background" };
    const pMap = { "정면":"front facing camera full body", "측면":"side profile", "앉기":"sitting naturally", "걷기":"walking in motion", "자연스러운":"natural candid relaxed pose" };
    return `Professional commercial model photography, ${nMap[nationality]} ${age} ${gMap[gender]}, wearing ${oMap[outfit]}, ${bMap[bgType]}, ${pMap[pose]}, professional studio lighting, photorealistic, high resolution 4K, commercial quality fashion photography, sharp focus`;
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!(await showPointConfirm(10))) return;
    setStep(4); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_model", type: "product_shot", message: "모델 이미지 생성 중..." } } }));
    try {
      const body = { prompt: buildPrompt() };
      if (refImg) { body.productImageB64 = refImg.b64; body.productImageMime = refImg.mime; }
      const _tok = await getAuthToken();
      const res = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json", ...(_tok ? {Authorization:`Bearer ${_tok}`} : {})}, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다. 다시 시도해주세요.");
      setResult(data.image);
      setStep(5);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패. 다시 시도해주세요."); setStep(3); }
    finally { window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_model" } } })); }
  };

  const readRef = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setRefImg({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const W = { maxWidth:620, margin:"0 auto" };

  if (step === 4) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="모델 이미지 생성 중..." subtitle={"AI가 모델 이미지를 생성하고 있어요\n예상 시간: 15~25초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 5 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>생성 완료!</span>
          <span style={{ fontSize:13, color:muted }}>모델 이미지가 생성되었어요</span>
        </div>
        <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:20, animation:"ai-fadein 0.5s ease" }}>
          <img src={result} alt="generated model" style={{ width:"100%", display:"block" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <a href={result} download="model.png" style={{
            flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`,
            color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none",
          }}>⬇ PNG 다운로드</a>
          <button onClick={() => { setResult(null); setStep(1); }} style={{
            flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`,
            background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer",
          }}>🔄 다시 생성하기</button>
        </div>
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={3} labels={["기본 설정","스타일 설정","참고·생성"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

        {step === 1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>기본 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>모델의 성별, 나이대, 국적을 선택해요.</div>
            <SelectGroup label="성별" value={gender} onChange={setGender} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"female",l:"여자"},{v:"male",l:"남자"},{v:"both",l:"커플"}]} />
            <SelectGroup label="나이대" value={age} onChange={setAge} cols={4} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"10대",l:"10대"},{v:"20대",l:"20대"},{v:"30대",l:"30대"},{v:"40대",l:"40대"},{v:"50대",l:"50대+"}]} />
            <SelectGroup label="국적 / 인종" value={nationality} onChange={setNationality} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"한국인",l:"한국인"},{v:"일본인",l:"일본인"},{v:"중국인",l:"중국인"},{v:"서양인",l:"서양인"},{v:"흑인",l:"흑인"},{v:"다양한",l:"다양한"}]} />
            <button onClick={() => setStep(2)} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900 }}>
              다음 → 스타일 설정
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>스타일 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>의상, 배경, 포즈를 선택해요.</div>
            <SelectGroup label="의상 / 스타일" value={outfit} onChange={setOutfit} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"캐주얼",l:"캐주얼"},{v:"비즈니스",l:"비즈니스"},{v:"스트릿",l:"스트릿"},{v:"스포츠",l:"스포츠"},{v:"드레스",l:"드레스"},{v:"한복",l:"한복"},{v:"코트",l:"코트"},{v:"수영복",l:"수영복"}]} />
            <SelectGroup label="배경" value={bgType} onChange={setBgType} cols={2} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"화이트 스튜디오",l:"화이트 스튜디오"},{v:"카페 인테리어",l:"카페"},{v:"도시 거리",l:"도시 거리"},{v:"자연/공원",l:"자연/공원"},{v:"해변",l:"해변"}]} />
            <SelectGroup label="포즈" value={pose} onChange={setPose} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"정면",l:"정면"},{v:"측면",l:"측면"},{v:"앉기",l:"앉기"},{v:"걷기",l:"걷기"},{v:"자연스러운",l:"자연스러운"}]} />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={() => setStep(3)} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900 }}>다음 → 참고 이미지</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>참고 이미지 & 생성</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>참고 이미지를 추가하거나 직접 프롬프트를 입력할 수 있어요.</div>

            {/* 직접 프롬프트 토글 */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:card }}>
              <button onClick={() => setUseCustom(p=>!p)} style={{ width:40, height:22, borderRadius:11, border:"none", cursor:"pointer", background: useCustom?ACC:"rgba(128,128,128,0.2)", transition:"background 0.2s", flexShrink:0, position:"relative" }}>
                <div style={{ position:"absolute", top:2, left: useCustom?20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
              </button>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>직접 프롬프트 입력</div>
                <div style={{ fontSize:11, color:muted }}>설정 대신 영문 프롬프트를 직접 작성해요</div>
              </div>
            </div>

            {useCustom ? (
              <div style={{ marginBottom:16 }}>
                <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)}
                  placeholder="예) Korean 20s beautiful woman, casual white t-shirt, cafe background, natural smile, full body shot, professional photography..."
                  style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:13, outline:"none", resize:"vertical", minHeight:100, fontFamily:"inherit" }} />
              </div>
            ) : (
              <div style={{ padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:card, marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>생성될 프롬프트 미리보기</div>
                <div style={{ fontSize:12, color:text, lineHeight:1.6 }}>{buildPrompt()}</div>
              </div>
            )}

            {/* 참고 이미지 */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>참고 이미지 (선택) – 분위기·스타일 반영</div>
              <label style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:10, border:`1.5px dashed ${refImg?ACC:bdr}`, cursor:"pointer", background:card }}>
                <span style={{ fontSize:14, fontWeight:700, color:refImg?ACC:muted }}>{refImg?"V":"+"}</span>
                <span style={{ fontSize:13, color:refImg?ACC:muted }}>{refImg?"참고 이미지 선택됨 (클릭하여 변경)":"이미지 파일 선택하기"}</span>
                <input type="file" accept="image/*" onChange={readRef} style={{ display:"none" }} />
              </label>
              {refImg && <div style={{ marginTop:8, borderRadius:8, overflow:"hidden", maxHeight:120 }}><img src={refImg.url} alt="" style={{ width:"100%", objectFit:"cover" }} /></div>}
            </div>

            {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(2)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={generate} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900, boxShadow:`0 6px 20px ${ACC}40` }}>
                모델 이미지 생성 (10P)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 전후 비교 슬라이더 공용 컴포넌트 ──────────────────── */
function BeforeAfterSlider({ srcImg, result, bdr, ACC, muted, text, onReset, downloadName }) {
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef(null);
  const startSlide = (clientX) => {
    const el = sliderRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const move = ev => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      setSliderPos(Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100)));
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, {passive:true}); document.addEventListener("touchend", up);
    move({ clientX });
  };
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
        <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>완료!</span>
        <span style={{ fontSize:13, color:muted }}>슬라이더로 전후를 비교해보세요</span>
      </div>
      <div ref={sliderRef}
        style={{ position:"relative", borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, cursor:"col-resize", animation:"ai-fadein 0.5s ease", userSelect:"none", touchAction:"none" }}
        onMouseDown={e => startSlide(e.clientX)}
        onTouchStart={e => startSlide(e.touches[0].clientX)}>
        {srcImg && <img src={srcImg.url} alt="before" style={{ width:"100%", display:"block" }} />}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", clipPath:`inset(0 ${100-sliderPos}% 0 0)` }}>
          <img src={result} alt="after" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
        </div>
        <div style={{ position:"absolute", top:0, bottom:0, left:`${sliderPos}%`, transform:"translateX(-50%)", width:3, background:"#fff", boxShadow:"0 0 8px rgba(0,0,0,0.4)" }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.3)", fontSize:14 }}>◀▶</div>
        </div>
        <div style={{ position:"absolute", top:10, left:10, padding:"3px 8px", borderRadius:6, background:"rgba(0,0,0,0.55)", color:"#fff", fontSize:11, fontWeight:700 }}>원본</div>
        <div style={{ position:"absolute", top:10, right:10, padding:"3px 8px", borderRadius:6, background:`${ACC}cc`, color:"#fff", fontSize:11, fontWeight:700 }}>결과</div>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <a href={result} download={downloadName||"result.png"} style={{ flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none" }}>⬇ 다운로드</a>
        <button onClick={onReset} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>🔄 다시 시작</button>
      </div>
    </div>
  );
}

/* ── 얼굴 교체 ───────────────────────────────────────────── */
/* ── 피부 보정 컴포넌트 ── */
function SkinRetouchGenerator({ isDark, user, onUserUpdate, onLoginRequest, showPointConfirm }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const [srcImg, setSrcImg] = useState(null);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [mood, setMood] = useState("natural");
  const [intensity, setIntensity] = useState("medium");

  const MOODS = [
    { id: "natural", label: "자연스럽게", desc: "피부만 매끄럽게", emoji: "✨" },
    { id: "young", label: "어려보이게", desc: "동안 느낌으로", emoji: "👶" },
    { id: "glow", label: "광채 피부", desc: "빛나는 윤기 피부", emoji: "💎" },
    { id: "porcelain", label: "도자기 피부", desc: "결점 없는 매끈함", emoji: "🪷" },
    { id: "soft", label: "소프트 필터", desc: "부드러운 분위기", emoji: "🌸" },
    { id: "studio", label: "스튜디오", desc: "전문 촬영 느낌", emoji: "📸" },
  ];

  const INTENSITIES = [
    { id: "light", label: "약하게" },
    { id: "medium", label: "보통" },
    { id: "strong", label: "강하게" },
  ];

  const readFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setSrcImg({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg) { setErr("사진을 업로드해주세요."); return; }
    if (!(await showPointConfirm(10))) return;
    setStep(3); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_skinretouch", type: "product_shot", message: "피부 보정 중..." } } }));

    const moodDesc = MOODS.find(m => m.id === mood)?.desc || "자연스럽게";
    const intensityDesc = { light: "subtle and minimal", medium: "moderate", strong: "significant and dramatic" }[intensity] || "moderate";

    const prompt = `Skin retouching ONLY. Apply ${intensityDesc} retouching to this photo.

CRITICAL RULES - DO NOT CHANGE:
- Face shape, size, proportions must remain EXACTLY identical
- Eye size, nose shape, lip shape - NO changes whatsoever
- Facial bone structure must stay the same
- Hair, clothing, background, pose, expression - keep IDENTICAL
- Camera angle, framing, composition - keep IDENTICAL

ONLY modify skin texture:
- Smooth skin pores, blemishes, acne marks, dark spots
- Even out skin tone, reduce redness and discoloration
${mood === "young" ? "- Reduce wrinkles and fine lines, add subtle youthful glow" : ""}
${mood === "glow" ? "- Add dewy, luminous glass-skin glow effect" : ""}
${mood === "porcelain" ? "- Create flawless porcelain-smooth skin texture" : ""}
${mood === "soft" ? "- Apply soft warm filter, gentle skin smoothing" : ""}
${mood === "studio" ? "- Professional studio lighting quality on skin" : ""}
${mood === "natural" ? "- Minimal, natural-looking skin cleanup only" : ""}

This is a RETOUCH task, not a regeneration. The output must look like the SAME photo with better skin only.`;

    try {
      const _tok = await getAuthToken();
      const res = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json", ...(_tok ? { Authorization: `Bearer ${_tok}` } : {}) },
        body: JSON.stringify({ prompt, productImageB64: srcImg.b64, productImageMime: srcImg.mime })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image); setStep(4);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch (e) { setErr(e.message || "보정 실패"); setStep(2); }
    finally { window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_skinretouch" } } })); }
  };

  const W = { maxWidth: 640, margin: "0 auto" };

  if (step === 3) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <GenLoading emoji="✨" title="피부 보정 중..." subtitle={"AI가 피부를 분석하고 보정하고 있어요\n예상 시간: 20~35초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 4 && result) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 60px", background: bg }}>
      <div style={W}>
        <BeforeAfterSlider srcImg={srcImg} result={result} bdr={bdr} ACC={ACC} muted={muted} text={text}
          onReset={() => { setResult(null); setStep(1); setSrcImg(null); }}
          downloadName="skin_retouch.png" />
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 60px", background: bg }}>
      <div style={W}>
        {err && <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{err}{(err.includes("포인트") || err.includes("충전")) && <button onClick={() => navigate("pricing")} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>충전하기</button>}</div>}

        {/* 사진 업로드 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>보정할 사진</div>
          <label style={{ display: "block", cursor: "pointer" }}>
            <div style={{ aspectRatio: "3/4", maxHeight: 320, borderRadius: 14, border: `2px dashed ${srcImg ? ACC : bdr}`, background: card, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexDirection: "column", gap: 8 }}>
              {srcImg ? <img src={srcImg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `${ACC}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: text }}>사진을 업로드하세요</div>
                  <div style={{ fontSize: 11, color: muted }}>얼굴이 잘 보이는 사진을 올려주세요</div>
                </>}
            </div>
            <input type="file" accept="image/*" onChange={readFile} style={{ display: "none" }} />
          </label>
          {srcImg && <button onClick={() => setSrcImg(null)} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>다른 사진 선택</button>}
        </div>

        {/* 보정 분위기 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>보정 분위기</div>
          <div className="ai-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {MOODS.map(m => (
              <button key={m.id} onClick={() => setMood(m.id)}
                style={{ padding: "12px 8px", borderRadius: 12, border: `2px solid ${mood === m.id ? ACC : bdr}`,
                  background: mood === m.id ? `${ACC}12` : "transparent", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: mood === m.id ? 800 : 500, color: mood === m.id ? ACC : text }}>{m.label}</div>
                <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 보정 강도 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>보정 강도</div>
          <div style={{ display: "flex", gap: 8 }}>
            {INTENSITIES.map(i => (
              <button key={i.id} onClick={() => setIntensity(i.id)}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${intensity === i.id ? ACC : bdr}`,
                  background: intensity === i.id ? `${ACC}12` : "transparent", cursor: "pointer",
                  fontSize: 13, fontWeight: intensity === i.id ? 800 : 500, color: intensity === i.id ? ACC : muted }}>
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* 안내 */}
        <div style={{ padding: "10px 14px", borderRadius: 10, background: `${ACC}08`, border: `1px solid ${ACC}20`, marginBottom: 16, fontSize: 12, color: muted, lineHeight: 1.7 }}>
          ✨ AI가 피부 결점을 제거하고 선택한 분위기로 보정합니다. 얼굴, 표정, 헤어, 배경은 그대로 유지됩니다.
        </div>

        {/* 생성 버튼 */}
        <button onClick={generate} disabled={!srcImg}
          style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: srcImg ? "pointer" : "default",
            background: srcImg ? `linear-gradient(135deg,${ACC},#ec4899)` : (isDark ? "rgba(255,255,255,0.06)" : "#eee"),
            color: srcImg ? "#fff" : muted, fontSize: 16, fontWeight: 900,
            boxShadow: srcImg ? "0 8px 28px rgba(124,106,255,0.25)" : "none" }}>
          ✨ 피부 보정 시작 (-10P)
        </button>
      </div>
    </div>
  );
}

function FaceSwapGenerator({ isDark, user, onUserUpdate, onLoginRequest, showPointConfirm }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const [step, setStep] = useState(1);
  const [srcImg, setSrcImg] = useState(null); // 원본 (얼굴 교체 대상)
  const [refImg, setRefImg] = useState(null); // 참고 (교체할 얼굴)
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const readFile = setter => e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setter({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg || !refImg) { setErr("두 이미지를 모두 업로드해주세요."); return; }
    if (!(await showPointConfirm(10))) return;
    setStep(3); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_faceswap", type: "product_shot", message: "얼굴 교체 중..." } } }));
    const prompt = `Face swap task: The first image is the TARGET person. The second image is the REFERENCE face. Replace ONLY the face of the person in the first image with the face from the second image. Keep everything else identical: body shape, clothing, pose, hair (except where the face overlaps), background, lighting, and skin tone transition. The result must look photorealistic and seamless, as if it were an original photo. High quality, 4K resolution.`;
    try {
      const _tok2 = await getAuthToken();
      const res = await fetch("/api/generate-image", {
        method:"POST", headers:{"Content-Type":"application/json", ...(_tok2 ? {Authorization:`Bearer ${_tok2}`} : {})},
        body: JSON.stringify({ prompt, productImageB64: srcImg.b64, productImageMime: srcImg.mime, refImageB64: refImg.b64, refImageMime: refImg.mime })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image); setStep(4);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); setStep(2); }
    finally { window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_faceswap" } } })); }
  };

  const W = { maxWidth:640, margin:"0 auto" };

  if (step === 3) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="얼굴 교체 중..." subtitle={"AI가 얼굴을 분석하고 자연스럽게 합성하고 있어요\n예상 시간: 20~35초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 4 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <BeforeAfterSlider srcImg={srcImg} result={result} bdr={bdr} ACC={ACC} muted={muted} text={text}
          onReset={() => { setResult(null); setStep(1); setSrcImg(null); setRefImg(null); }}
          downloadName="face_swap.png" />
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={2} labels={["원본 업로드","참고 얼굴 + 생성"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

        {/* 두 이미지를 나란히 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>① 원본 인물 사진</div>
            <label style={{ display:"block", cursor:"pointer" }}>
              <div style={{ aspectRatio:"3/4", borderRadius:12, border:`2px dashed ${srcImg?ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:6 }}>
                {srcImg ? <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:11, color:muted, textAlign:"center" }}>얼굴을 교체할<br/>원본 사진</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile(setSrcImg)} style={{ display:"none" }} />
            </label>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>② 참고 얼굴 사진</div>
            <label style={{ display:"block", cursor:"pointer" }}>
              <div style={{ aspectRatio:"3/4", borderRadius:12, border:`2px dashed ${refImg?ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:6 }}>
                {refImg ? <img src={refImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                  : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:11, color:muted, textAlign:"center" }}>가져올<br/>얼굴 사진</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile(setRefImg)} style={{ display:"none" }} />
            </label>
          </div>
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${ACC}10`, border:`1px solid ${ACC}30`, marginBottom:16, fontSize:12, color:muted, lineHeight:1.7 }}>
          <b style={{ color:text }}>원본</b>에서 얼굴만 교체되고 몸·의상·배경은 그대로 유지돼요.<br/>
          정면 또는 약간 측면의 선명한 얼굴 사진이 가장 잘 됩니다.
        </div>

        <button onClick={generate} disabled={!srcImg||!refImg}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:srcImg&&refImg?"pointer":"not-allowed",
            background: srcImg&&refImg?`linear-gradient(135deg,${ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg&&refImg?1:0.6 }}>
          얼굴 교체 생성하기 (10P)
        </button>
      </div>
    </div>
  );
}

/* ── 의상 교체 ───────────────────────────────────────────── */
function OutfitSwapGenerator({ isDark, user, onUserUpdate, onLoginRequest, showPointConfirm }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const OUTFIT_ACC = "#ec4899";
  const [srcImg, setSrcImg] = useState(null);
  const [refImg, setRefImg] = useState(null);
  const [outfitMode, setOutfitMode] = useState("ref"); // "ref" | "preset"
  const [presetOutfit, setPresetOutfit] = useState("캐주얼");
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const OUTFIT_PRESETS = [
    { v:"캐주얼", l:"캐주얼" }, { v:"비즈니스 정장", l:"비즈니스 정장" },
    { v:"드레스", l:"드레스" }, { v:"스포츠웨어", l:"스포츠웨어" },
    { v:"스트릿패션", l:"스트릿" }, { v:"한복", l:"한복" },
    { v:"수영복", l:"수영복" }, { v:"코트", l:"코트" },
  ];

  const readFile = setter => e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setter({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg) { setErr("원본 이미지를 업로드해주세요."); return; }
    if (outfitMode === "ref" && !refImg) { setErr("참고 의상 이미지를 업로드해주세요."); return; }
    if (!(await showPointConfirm(10))) return;
    setGenerating(true); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_outfitswap", type: "product_shot", message: "의상 교체 중..." } } }));
    const outfitDesc = outfitMode === "ref"
      ? "the outfit/clothing exactly as shown in the second reference image"
      : `${presetOutfit} style outfit appropriate for the person`;
    const prompt = `Outfit swap task: Change ONLY the clothing and outfit of the person in the first image to ${outfitDesc}. Keep everything else EXACTLY the same: face, hairstyle, body shape, skin color, pose, background, and lighting. The clothing change must look natural, well-fitted, and photorealistic. High quality 4K result.`;
    try {
      const body = { prompt, productImageB64: srcImg.b64, productImageMime: srcImg.mime };
      if (outfitMode === "ref" && refImg) { body.refImageB64 = refImg.b64; body.refImageMime = refImg.mime; }
      const _tok3 = await getAuthToken();
      const res = await fetch("/api/generate-image", { method:"POST", headers:{"Content-Type":"application/json", ...(_tok3 ? {Authorization:`Bearer ${_tok3}`} : {})}, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); }
    finally { setGenerating(false); window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_outfitswap" } } })); }
  };

  const W = { maxWidth:640, margin:"0 auto" };

  if (generating) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="의상 교체 중..." subtitle={"AI가 의상을 분석하고 자연스럽게 입히고 있어요\n예상 시간: 20~35초"} ACC={OUTFIT_ACC} isDark={isDark} />
    </div>
  );

  if (result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <BeforeAfterSlider srcImg={srcImg} result={result} bdr={bdr} ACC={OUTFIT_ACC} muted={muted} text={text}
          onReset={() => { setResult(null); setSrcImg(null); setRefImg(null); }}
          downloadName="outfit_swap.png" />
        {err && <div style={{ marginTop:12, padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

        {/* 원본 업로드 */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:8 }}>① 원본 인물 사진</div>
          <label style={{ display:"block", cursor:"pointer" }}>
            <div style={{ aspectRatio:"3/4", maxHeight:300, borderRadius:12, border:`2px dashed ${srcImg?OUTFIT_ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:8 }}>
              {srcImg ? <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                : <><span style={{ fontSize:16, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:13, color:muted }}>의상을 교체할 인물 사진</span><span style={{ fontSize:11, color:muted }}>클릭하여 선택</span></>}
            </div>
            <input type="file" accept="image/*" onChange={readFile(setSrcImg)} style={{ display:"none" }} />
          </label>
        </div>

        {/* 의상 선택 방식 */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:8 }}>② 의상 선택 방식</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[{v:"ref",l:"참고 이미지로"},{v:"preset",l:"스타일 선택"}].map(o=>(
              <button key={o.v} onClick={()=>setOutfitMode(o.v)}
                style={{ padding:"11px", borderRadius:10, border:`2px solid ${outfitMode===o.v?OUTFIT_ACC:bdr}`, background:outfitMode===o.v?`${OUTFIT_ACC}15`:"transparent",
                  color:outfitMode===o.v?OUTFIT_ACC:muted, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {o.l}
              </button>
            ))}
          </div>

          {outfitMode === "ref" ? (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:6 }}>입히고 싶은 의상 사진</div>
              <label style={{ display:"block", cursor:"pointer" }}>
                <div style={{ aspectRatio:"3/4", maxHeight:240, borderRadius:12, border:`2px dashed ${refImg?OUTFIT_ACC:bdr}`, background:card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:8 }}>
                  {refImg ? <img src={refImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
                    : <><span style={{ fontSize:14, color:muted, fontWeight:700 }}>+</span><span style={{ fontSize:12, color:muted }}>의상 참고 사진</span><span style={{ fontSize:11, color:muted }}>클릭하여 선택</span></>}
                </div>
                <input type="file" accept="image/*" onChange={readFile(setRefImg)} style={{ display:"none" }} />
              </label>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>의상 스타일 선택</div>
              <div className="ai-grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {OUTFIT_PRESETS.map(o=>(
                  <button key={o.v} onClick={()=>setPresetOutfit(o.v)}
                    style={{ padding:"9px 4px", borderRadius:9, border:`1.5px solid ${presetOutfit===o.v?OUTFIT_ACC:bdr}`,
                      background:presetOutfit===o.v?`${OUTFIT_ACC}15`:"transparent",
                      color:presetOutfit===o.v?OUTFIT_ACC:muted, fontSize:11, fontWeight:700, cursor:"pointer", textAlign:"center" }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"10px 14px", borderRadius:10, background:`${OUTFIT_ACC}10`, border:`1px solid ${OUTFIT_ACC}30`, marginBottom:16, fontSize:12, color:muted, lineHeight:1.7 }}>
          <b style={{ color:text }}>얼굴·포즈·배경</b>은 그대로 유지하고 의상만 교체해요.<br/>
          전신이 잘 보이는 사진일수록 더 잘 됩니다.
        </div>

        <button onClick={generate} disabled={!srcImg}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:srcImg?"pointer":"not-allowed",
            background: srcImg?`linear-gradient(135deg,${OUTFIT_ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg?1:0.6 }}>
          의상 교체 생성하기 (10P)
        </button>
      </div>
    </div>
  );
}

/* ── 여백 늘리기 (Outpainting) ─────────────────────── */
function OutpaintGenerator({ isDark, user, onUserUpdate, onLoginRequest, showPointConfirm }) {
  const C = useGenColors(isDark);
  const { ACC, bg, card, bdr, text, muted } = C;
  const [step, setStep] = useState(1);
  const [srcImg, setSrcImg] = useState(null);
  const [sizeMode, setSizeMode] = useState("manual"); // "ratio" | "manual"
  // 비율 모드
  const [ratio, setRatio] = useState("16:9");
  const [imgX, setImgX] = useState(50);
  const [imgY, setImgY] = useState(50);
  // 수동 모드: 각 방향 확장 (0~400px 단위)
  const [expLeft,   setExpLeft]   = useState(100);
  const [expRight,  setExpRight]  = useState(100);
  const [expTop,    setExpTop]    = useState(0);
  const [expBottom, setExpBottom] = useState(0);
  const [fillStyle, setFillStyle] = useState("자연스럽게");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const readFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setSrcImg({ b64: ev.target.result.split(",")[1], mime: f.type, url: ev.target.result });
      setImgX(50); setImgY(50);
    };
    reader.readAsDataURL(f);
  };

  const fillMap = {
    "자연스럽게": "seamlessly and naturally matching the existing content style, colors, and texture",
    "흐릿하게":   "with a soft blurred gradient fade that gently transitions to the surroundings",
    "배경확장":   "extending the surrounding environment and background scene",
  };

  const buildPrompt = () => {
    const fm = fillMap[fillStyle] || fillMap["자연스럽게"];
    if (sizeMode === "manual") {
      const dirs = [];
      if (expLeft  > 0) dirs.push(`${expLeft}px to the left`);
      if (expRight > 0) dirs.push(`${expRight}px to the right`);
      if (expTop   > 0) dirs.push(`${expTop}px to the top`);
      if (expBottom> 0) dirs.push(`${expBottom}px to the bottom`);
      const expansion = dirs.length ? dirs.join(", ") : "equally on all sides";
      return `Outpainting task: Expand the canvas by ${expansion}. Fill all new empty areas ${fm}. The filled areas must match the original image's lighting, color palette, and atmosphere. Make the result look like a single seamless photograph.`;
    }
    const hPos = imgX < 30 ? "left side" : imgX > 70 ? "right side" : "center";
    const vPos = imgY < 30 ? "top area"  : imgY > 70 ? "bottom area" : "middle";
    return `Outpainting task: The original image is positioned at the ${hPos}, ${vPos} of a ${ratio} aspect ratio canvas. Fill ALL empty areas around the original image ${fm}. Output: ${ratio} aspect ratio. Make the result look like a single seamless photograph.`;
  };

  const generate = async () => {
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!srcImg) { setErr("이미지를 업로드해주세요."); return; }
    if (sizeMode === "manual" && expLeft===0 && expRight===0 && expTop===0 && expBottom===0) {
      setErr("최소 한 방향의 여백 크기를 0보다 크게 설정해주세요."); return;
    }
    if (!(await showPointConfirm(10))) return;
    setStep(3); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_outpaint", type: "product_shot", message: "이미지 확장 중..." } } }));
    try {
      const _tok4 = await getAuthToken();
      const res = await fetch("/api/generate-image", {
        method:"POST", headers:{"Content-Type":"application/json", ...(_tok4 ? {Authorization:`Bearer ${_tok4}`} : {})},
        body: JSON.stringify({ prompt: buildPrompt(), productImageB64: srcImg.b64, productImageMime: srcImg.mime })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("이미지를 생성하지 못했습니다.");
      setResult(data.image); setStep(4);
      if (onUserUpdate && data.points !== undefined) onUserUpdate({ ...user, points: data.points });
    } catch(e) { setErr(e.message||"생성 실패"); setStep(2); }
    finally { window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_outpaint" } } })); }
  };

  const W = { maxWidth:640, margin:"0 auto" };
  const getRatioParts = r => { const [w,h]=r.split(":").map(Number); return {w:w||16,h:h||9}; };

  // 수동 모드 미리보기: 원본을 중앙, 주변에 확장 영역 표시
  const ManualPreview = () => {
    const maxExp = Math.max(expLeft, expRight, expTop, expBottom, 1);
    const scale = 120 / maxExp;
    const oW = 120, oH = 90; // 원본 표시 크기
    const pL = Math.round(expLeft  * scale);
    const pR = Math.round(expRight * scale);
    const pT = Math.round(expTop   * scale);
    const pB = Math.round(expBottom* scale);
    const totalW = pL + oW + pR;
    const totalH = pT + oH + pB;
    const maxW = 320;
    const scaleDown = totalW > maxW ? maxW / totalW : 1;
    const fw = Math.round(totalW * scaleDown);
    const fh = Math.round(totalH * scaleDown);
    const sl = Math.round(pL * scaleDown);
    const st = Math.round(pT * scaleDown);
    const sw = Math.round(oW * scaleDown);
    const sh = Math.round(oH * scaleDown);
    return (
      <div style={{ position:"relative", width:fw, height:fh, margin:"0 auto 12px",
        borderRadius:10, overflow:"hidden", border:`2px solid ${ACC}` }}>
        {/* 확장 영역 (격자) */}
        <div style={{ position:"absolute", inset:0,
          backgroundImage:`repeating-linear-gradient(45deg,${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"} 0,${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"} 1px,transparent 0,transparent 50%)`,
          backgroundSize:"10px 10px",
          background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)" }} />
        {/* 원본 이미지 영역 */}
        <div style={{ position:"absolute", left:sl, top:st, width:sw, height:sh,
          border:`2px solid ${ACC}`, borderRadius:4, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.3)" }}>
          <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        </div>
        {/* 방향 라벨 */}
        {expLeft  > 0 && <div style={{ position:"absolute", left:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>←{expLeft}px</div>}
        {expRight > 0 && <div style={{ position:"absolute", right:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>{expRight}px→</div>}
        {expTop   > 0 && <div style={{ position:"absolute", top:2, left:"50%", transform:"translateX(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>↑{expTop}px</div>}
        {expBottom> 0 && <div style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", fontSize:8, color:ACC, fontWeight:800 }}>{expBottom}px↓</div>}
      </div>
    );
  };

  if (step === 3) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:bg }}>
      <GenLoading emoji="" title="여백 늘리는 중..." subtitle={"이미지의 빈 공간을 AI가 채우고 있어요\n예상 시간: 15~25초"} ACC={ACC} isDark={isDark} />
    </div>
  );

  if (step === 4 && result) return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ fontSize:13, fontWeight:700, color:"#4ade80" }}>생성 완료!</span>
        </div>
        <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:20, animation:"ai-fadein 0.5s ease" }}>
          <img src={result} alt="outpainted" style={{ width:"100%", display:"block" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <a href={result} download="outpainted.png" style={{ flex:1, padding:"13px", borderRadius:12, background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:14, fontWeight:800, textAlign:"center", textDecoration:"none" }}>⬇ PNG 다운로드</a>
          <button onClick={() => { setResult(null); setStep(1); setSrcImg(null); }} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>🔄 다시 하기</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", background:bg }}>
      <div style={W}>
        <StepBar step={step} total={2} labels={["이미지 업로드","크기·설정"]} ACC={ACC} />
        {err && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.1)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>navigate("pricing")} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

        {step === 1 && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>이미지 업로드</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>여백을 늘릴 이미지를 업로드해요.</div>
            <label style={{ display:"block", cursor:"pointer", marginBottom:20 }}>
              <div style={{ minHeight:200, borderRadius:14, border:`2px dashed ${srcImg?ACC:bdr}`, background:card,
                display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexDirection:"column", gap:10, padding:20 }}>
                {srcImg
                  ? <img src={srcImg.url} alt="" style={{ maxWidth:"100%", maxHeight:240, objectFit:"contain", borderRadius:8 }} />
                  : <><span style={{ fontSize:16, color:muted, fontWeight:700 }}>이미지</span><span style={{ fontSize:14, color:muted }}>확장할 이미지 업로드</span><span style={{ fontSize:12, color:muted }}>클릭하여 선택</span></>}
              </div>
              <input type="file" accept="image/*" onChange={readFile} style={{ display:"none" }} />
            </label>
            <button onClick={() => { if(!srcImg){setErr("이미지를 업로드해주세요.");return;} setErr(""); setStep(2); }} style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:srcImg?"pointer":"not-allowed",
              background: srcImg?`linear-gradient(135deg,${ACC},#8b5cf6)`:"rgba(128,128,128,0.2)",
              color:"#fff", fontSize:15, fontWeight:900, opacity:srcImg?1:0.6,
            }}>다음 → 크기 설정</button>
          </div>
        )}

        {step === 2 && srcImg && (
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:4 }}>여백 크기 설정</div>
            <div style={{ fontSize:13, color:muted, marginBottom:16 }}>원하는 방향과 크기를 설정하면 AI가 자연스럽게 채워드려요.</div>

            {/* 모드 선택 탭 */}
            <div style={{ display:"flex", background: isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", borderRadius:12, padding:4, marginBottom:20 }}>
              {[{v:"manual",l:"수동 설정"},{v:"ratio",l:"비율 선택"}].map(({v,l}) => (
                <button key={v} onClick={()=>setSizeMode(v)} style={{
                  flex:1, padding:"9px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                  background: sizeMode===v ? (isDark?"rgba(255,255,255,0.12)":"#fff") : "transparent",
                  color: sizeMode===v ? (v==="manual"?ACC:text) : muted,
                  boxShadow: sizeMode===v ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  transition:"all 0.15s",
                }}>{l}</button>
              ))}
            </div>

            {/* ── 수동 설정 모드 ── */}
            {sizeMode === "manual" && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10 }}>📐 방향별 확장 크기</div>

                {/* 미리보기 */}
                {ManualPreview()}

                {/* 슬라이더 4개 */}
                {[
                  { label:"← 왼쪽 확장", val:expLeft,   set:setExpLeft,   color:"#7c6aff" },
                  { label:"오른쪽 확장 →", val:expRight, set:setExpRight, color:"#8b5cf6" },
                  { label:"↑ 위쪽 확장",  val:expTop,   set:setExpTop,    color:"#ec4899" },
                  { label:"아래쪽 확장 ↓", val:expBottom,set:setExpBottom, color:"#f59e0b" },
                ].map(({label,val,set,color}) => (
                  <div key={label} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:text }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:900, color:color, minWidth:52, textAlign:"right" }}>{val}px</span>
                    </div>
                    <input type="range" min={0} max={400} step={20} value={val}
                      onChange={e=>set(Number(e.target.value))}
                      style={{ width:"100%", accentColor:color }} />
                    {/* 빠른 값 버튼 */}
                    <div style={{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" }}>
                      {[0,50,100,150,200,300,400].map(px => (
                        <button key={px} onClick={()=>set(px)} style={{
                          padding:"3px 9px", borderRadius:6, border:`1px solid ${val===px?color:bdr}`,
                          background: val===px?`${color}18`:"transparent",
                          color: val===px?color:muted, fontSize:10, fontWeight:700, cursor:"pointer",
                        }}>{px===0?"없음":`${px}px`}</button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 프리셋 버튼 */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>빠른 프리셋</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6 }}>
                    {[
                      {l:"← 왼쪽만",   vals:[200,0,0,0]},
                      {l:"오른쪽만 →", vals:[0,200,0,0]},
                      {l:"↑↓ 위아래",  vals:[0,0,150,150]},
                      {l:"← → 양쪽",   vals:[150,150,0,0]},
                      {l:"전방향 균일", vals:[100,100,100,100]},
                      {l:"와이드 배너", vals:[200,200,0,0]},
                    ].map(({l,vals:[L,R,T,B]}) => (
                      <button key={l} onClick={()=>{setExpLeft(L);setExpRight(R);setExpTop(T);setExpBottom(B);}}
                        style={{ padding:"8px 10px", borderRadius:9, border:`1px solid ${bdr}`, background:"transparent",
                          color:muted, fontSize:11, fontWeight:700, cursor:"pointer", textAlign:"left",
                          transition:"all 0.1s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=ACC;e.currentTarget.style.color=ACC;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 비율 선택 모드 ── */}
            {sizeMode === "ratio" && (
              <div>
                <SelectGroup label="목표 비율" value={ratio} onChange={setRatio} cols={4} ACC={ACC} bdr={bdr} muted={muted} text={text}
                  options={["16:9","21:9","4:3","3:2","2:1","1:1","9:16","3:4"]} />

                {/* 비율 프리뷰 + 위치 슬라이더 */}
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10 }}>📍 이미지 위치 조정</div>
                  {(() => {
                    const { w: rw, h: rh } = getRatioParts(ratio);
                    const frameW = 300, frameH = Math.round(frameW * rh / rw);
                    const imgDispW = Math.round(frameW * 0.48), imgDispH = Math.round(frameW * 0.48);
                    const imgLeft = Math.round((imgX / 100) * (frameW - imgDispW));
                    const imgTop  = Math.round((imgY / 100) * (frameH - imgDispH));
                    return (
                      <div style={{ position:"relative", width:frameW, height:Math.min(frameH,220), margin:"0 auto 16px",
                        borderRadius:12, overflow:"hidden", border:`2px solid ${ACC}`,
                        background: isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)" }}>
                        <div style={{ position:"absolute", inset:0,
                          backgroundImage:`repeating-linear-gradient(45deg,${isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 0,${isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px,transparent 0,transparent 50%)`,
                          backgroundSize:"12px 12px" }} />
                        <div style={{ position:"absolute", left:imgLeft, top:Math.min(imgTop,Math.min(frameH,220)-imgDispH),
                          width:imgDispW, height:imgDispH,
                          border:`2px solid ${ACC}`, borderRadius:6, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>
                          <img src={srcImg.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                        </div>
                        <div style={{ position:"absolute", bottom:6, right:8, fontSize:9, color:isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.4)", fontWeight:700 }}>{ratio}</div>
                      </div>
                    );
                  })()}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginBottom:5 }}>
                      <span>← 왼쪽</span><span style={{ fontWeight:700, color:ACC }}>수평 위치</span><span>오른쪽 →</span>
                    </div>
                    <input type="range" min={0} max={100} value={imgX} onChange={e=>setImgX(Number(e.target.value))} style={{ width:"100%", accentColor:ACC }} />
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginBottom:5 }}>
                      <span>↑ 상단</span><span style={{ fontWeight:700, color:ACC }}>수직 위치</span><span>하단 ↓</span>
                    </div>
                    <input type="range" min={0} max={100} value={imgY} onChange={e=>setImgY(Number(e.target.value))} style={{ width:"100%", accentColor:ACC }} />
                  </div>
                  <div className="ai-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginTop:8 }}>
                    {[{l:"좌상",x:0,y:0},{l:"상단",x:50,y:0},{l:"우상",x:100,y:0},
                      {l:"왼쪽",x:0,y:50},{l:"중앙",x:50,y:50},{l:"오른쪽",x:100,y:50},
                      {l:"좌하",x:0,y:100},{l:"하단",x:50,y:100},{l:"우하",x:100,y:100}].map(({l,x,y})=>(
                      <button key={l} onClick={()=>{setImgX(x);setImgY(y);}}
                        style={{ padding:"5px 4px", borderRadius:7, border:`1px solid ${(imgX===x&&imgY===y)?ACC:bdr}`,
                          background:(imgX===x&&imgY===y)?`${ACC}18`:"transparent",
                          color:(imgX===x&&imgY===y)?ACC:muted, fontSize:10, fontWeight:700, cursor:"pointer" }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 채우기 스타일 (공통) */}
            <SelectGroup label="채우기 스타일" value={fillStyle} onChange={setFillStyle} cols={3} ACC={ACC} bdr={bdr} muted={muted} text={text}
              options={[{v:"자연스럽게",l:"자연스럽게"},{v:"흐릿하게",l:"흐릿하게"},{v:"배경확장",l:"배경 확장"}]} />

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>← 이전</button>
              <button onClick={generate} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${ACC},#8b5cf6)`, color:"#fff", fontSize:15, fontWeight:900, boxShadow:`0 6px 20px ${ACC}40` }}>
                여백 늘리기 (10P)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { useGenColors, GenLoading, SelectGroup, BeforeAfterSlider, ModelGenerator, SkinRetouchGenerator, FaceSwapGenerator, OutfitSwapGenerator, OutpaintGenerator };
