import { useState, useRef, useEffect } from "react";

/* ══════════════════════════════════════════════════════════════
   상세페이지 생성기 v3
   - 페이지 수 조절 (3~10장)
   - html2canvas 이미지 저장
   - 이모티콘 없는 깔끔한 디자인
   - 여러 이미지 슬라이드별 배치
   - 참고 이미지 업로드 → 스타일 분석
══════════════════════════════════════════════════════════════ */

const API_KEY = "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";

// html2canvas 로드
function loadH2C() {
  return new Promise((res) => {
    if (window.html2canvas) { res(window.html2canvas); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => res(window.html2canvas);
    document.head.appendChild(s);
  });
}

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", bg:"#fff8f5", sub:"#f5e6e3", dark:"#8b1a10" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", bg:"#fafafa", sub:"#efefef", dark:"#000" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", bg:"#fff5f8", sub:"#f9e8f0", dark:"#6b3a5a" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", bg:"#f5f8ff", sub:"#e0eaff", dark:"#0d3a9e" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", bg:"#fdf8f3", sub:"#f0e8dc", dark:"#5a3e24" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", bg:"#f5fcf5", sub:"#dff0df", dark:"#1a5c1e" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", bg:"#fffbf0", sub:"#fef0cc", dark:"#a05e07" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", bg:"#f8f5ff", sub:"#ece5ff", dark:"#3d1e7a" },
];

// ── 슬라이드 타입 풀 (10개) ───────────────────────────────────
const ALL_SLIDE_TYPES = [
  { id:"hero",       label:"메인 히어로"   },
  { id:"feature",    label:"핵심 특징"     },
  { id:"detail1",    label:"상세 설명 1"   },
  { id:"detail2",    label:"상세 설명 2"   },
  { id:"comparison", label:"비교/장점"     },
  { id:"howto",      label:"사용 방법"     },
  { id:"ingredient", label:"구성/성분"     },
  { id:"review",     label:"고객 후기"     },
  { id:"trust",      label:"신뢰 지표"     },
  { id:"cta",        label:"구매 유도"     },
];

// ══════════════════════════════════════════════════════════════
// AI 생성
// ══════════════════════════════════════════════════════════════
async function generateContent({ category, productName, features, price, cta, target, extra, pageCount, refStyle }) {
  const cat = CATEGORIES.find(c => c.key === category);
  const types = ALL_SLIDE_TYPES.slice(0, pageCount);
  const typeList = types.map((t,i) => `슬라이드${i+1}: ${t.id} (${t.label})`).join("\n");

  const slideSchemas = {
    hero:       `{ "id":"hero", "badge":"배지(10자)", "headline":"헤드라인(16자)", "subheadline":"서브(24자)", "body":"소개(40자)" }`,
    feature:    `{ "id":"feature", "sectionLabel":"섹션명(영문,예:FEATURES)", "headline":"헤드라인(18자)", "features":[{"title":"특징명(8자)","desc":"설명(24자)"},{"title":"","desc":""},{"title":"","desc":""}] }`,
    detail1:    `{ "id":"detail1", "sectionLabel":"DETAIL", "headline":"헤드라인(20자)", "body":"본문(80자)", "points":["포인트1(20자)","포인트2","포인트3"] }`,
    detail2:    `{ "id":"detail2", "sectionLabel":"SPECIFICATION", "headline":"헤드라인(16자)", "specs":[{"label":"항목명","value":"값"},{"label":"","value":""},{"label":"","value":""},{"label":"","value":""}] }`,
    comparison: `{ "id":"comparison", "sectionLabel":"WHY US", "headline":"헤드라인(16자)", "before":"기존 문제(30자)", "after":"우리 해결책(30자)", "points":["차별점1(20자)","차별점2","차별점3"] }`,
    howto:      `{ "id":"howto", "sectionLabel":"HOW TO USE", "headline":"헤드라인(16자)", "steps":[{"num":"01","title":"단계명(8자)","desc":"설명(24자)"},{"num":"02","title":"","desc":""},{"num":"03","title":"","desc":""}] }`,
    ingredient: `{ "id":"ingredient", "sectionLabel":"INGREDIENT", "headline":"헤드라인(16자)", "items":[{"name":"성분/구성명(10자)","desc":"설명(30자)"},{"name":"","desc":""},{"name":"","desc":""},{"name":"","desc":""}] }`,
    review:     `{ "id":"review", "sectionLabel":"REVIEW", "headline":"헤드라인(16자)", "reviews":[{"text":"후기내용(40자)","name":"구매자명"},{"text":"","name":""},{"text":"","name":""}] }`,
    trust:      `{ "id":"trust", "sectionLabel":"TRUST", "headline":"헤드라인(16자)", "stats":[{"number":"수치","label":"지표명"},{"number":"","label":""},{"number":"","label":""}], "certText":"인증/수상 내용(30자)" }`,
    cta:        `{ "id":"cta", "sectionLabel":"SPECIAL OFFER", "headline":"마지막 어필(16자)", "price":"${price||""}", "originalPrice":"정가", "discount":"혜택/할인율", "cta":"${cta||"지금 구매하기"}", "urgency":"긴박감 문구(16자)" }`,
  };

  const schemaList = types.map(t => slideSchemas[t.id] || `{ "id":"${t.id}", "headline":"" }`).join(",\n    ");

  const prompt = `한국 쇼핑몰 상세페이지 카피라이터입니다.
상품: ${productName} / 카테고리: ${cat.label}
특징: ${features}
가격: ${price||"미정"} / CTA: ${cta||"지금 구매하기"} / 타겟: ${target||"일반 소비자"}
추가: ${extra||"없음"}
${refStyle ? `\n참고 스타일 분석 결과:\n${refStyle}\n` : ""}
슬라이드 ${pageCount}장 구성:
${typeList}

아래 JSON만 응답 (다른 텍스트 없음):
{
  "slides": [
    ${schemaList}
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(clean); }
  catch { throw new Error("파싱 실패: " + text.slice(0,200)); }
}

// 참고 이미지 분석
async function analyzeRefImage(base64, mimeType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          { type:"image", source:{ type:"base64", media_type: mimeType, data: base64 } },
          { type:"text", text:"이 상세페이지 이미지의 디자인 스타일을 분석해주세요. 색상, 레이아웃, 폰트 스타일, 전체적인 무드, 텍스트 배치 특징을 200자 이내로 간결하게 설명해주세요. 한국어로 답변." }
        ]
      }]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ══════════════════════════════════════════════════════════════
// EditableText
// ══════════════════════════════════════════════════════════════
function E({ v, onSave, tag="span", style={} }) {
  const [val, setVal] = useState(v);
  const [editing, setEditing] = useState(false);
  const Tag = tag;
  useEffect(() => { setVal(v); }, [v]);
  if (!editing) return (
    <Tag style={{ ...style, cursor:"text", outline:"none" }} onClick={() => setEditing(true)} title="클릭하여 편집">{val}</Tag>
  );
  return (
    <Tag contentEditable suppressContentEditableWarning
      style={{ ...style, outline:`2px solid #6366f1`, outlineOffset:2, borderRadius:3, cursor:"text" }}
      onBlur={e => { setEditing(false); const t=e.target.innerText; setVal(t); onSave(t); }}
      onKeyDown={e => { if(e.key==="Enter"&&tag!=="p"&&tag!=="div") { e.preventDefault(); e.target.blur(); } }}>
      {val}
    </Tag>
  );
}

// ══════════════════════════════════════════════════════════════
// 슬라이드 렌더러들 (이모티콘 없음, 타이포 중심)
// ══════════════════════════════════════════════════════════════
const SF = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif";

function HeroSlide({ d, upd, cat, img }) {
  const hasBg = !!img;
  return (
    <div style={{ width:800, height:800, background:cat.bg, position:"relative", overflow:"hidden", fontFamily:SF }}>
      {img && <><img src={img} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/><div style={{ position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.6) 70%)" }}/></>}
      <div style={{ position:"relative",zIndex:2,height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"60px 60px 72px" }}>
        <div style={{ marginBottom:20 }}>
          <E v={d.badge||"NEW"} onSave={v=>upd({...d,badge:v})} tag="span"
            style={{ display:"inline-block",background:cat.accent,color:"#fff",fontSize:10,fontWeight:800,letterSpacing:3,padding:"5px 14px",borderRadius:2 }}/>
        </div>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h1"
          style={{ fontSize:60,fontWeight:900,color:hasBg?"#fff":"#1a1a1a",lineHeight:1.15,letterSpacing:-2,margin:"0 0 16px" }}/>
        <E v={d.subheadline||""} onSave={v=>upd({...d,subheadline:v})} tag="p"
          style={{ fontSize:20,fontWeight:500,color:hasBg?"rgba(255,255,255,0.85)":"#444",margin:"0 0 16px",lineHeight:1.6 }}/>
        <E v={d.body||""} onSave={v=>upd({...d,body:v})} tag="p"
          style={{ fontSize:14,color:hasBg?"rgba(255,255,255,0.65)":"#777",lineHeight:1.8,maxWidth:460,margin:0 }}/>
        <div style={{ marginTop:44,display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:36,height:2,background:hasBg?"rgba(255,255,255,0.5)":cat.accent }}/>
          <span style={{ fontSize:11,color:hasBg?"rgba(255,255,255,0.4)":"#bbb",letterSpacing:3,fontWeight:600 }}>01</span>
        </div>
      </div>
    </div>
  );
}

function FeatureSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:"#fff",fontFamily:SF }}>
      {img && <div style={{ height:280,overflow:"hidden" }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      <div style={{ padding:"44px 60px 20px",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"FEATURES"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:36,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-1,margin:"0 0 36px" }}/>
      </div>
      <div style={{ padding:"0 60px 48px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16 }}>
        {(d.features||[{title:"",desc:""},{title:"",desc:""},{title:"",desc:""}]).map((f,i)=>(
          <div key={i} style={{ padding:"28px 22px",background:cat.bg,borderRadius:10,border:`1px solid ${cat.sub}` }}>
            <div style={{ width:32,height:3,background:cat.accent,marginBottom:18,borderRadius:2 }}/>
            <E v={f.title} onSave={v=>upd({...d,features:d.features.map((ff,j)=>j===i?{...ff,title:v}:ff)})} tag="p"
              style={{ fontSize:16,fontWeight:800,color:"#1a1a1a",margin:"0 0 10px",lineHeight:1.4 }}/>
            <E v={f.desc} onSave={v=>upd({...d,features:d.features.map((ff,j)=>j===i?{...ff,desc:v}:ff)})} tag="p"
              style={{ fontSize:13,color:"#666",lineHeight:1.7,margin:0 }}/>
          </div>
        ))}
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function Detail1Slide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:cat.bg,fontFamily:SF,display:"flex",flexDirection:"column" }}>
      <div style={{ display:"grid",gridTemplateColumns:img?"1fr 1fr":"1fr",flex:1,minHeight:680 }}>
        {img && <div style={{ overflow:"hidden" }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
        <div style={{ padding:"56px 48px",display:"flex",flexDirection:"column",justifyContent:"center" }}>
          <E v={d.sectionLabel||"DETAIL"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
            style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,marginBottom:14,display:"block" }}/>
          <div style={{ width:28,height:2,background:cat.accent,marginBottom:20 }}/>
          <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
            style={{ fontSize:28,fontWeight:900,color:"#1a1a1a",lineHeight:1.4,letterSpacing:-0.5,margin:"0 0 18px" }}/>
          <E v={d.body||""} onSave={v=>upd({...d,body:v})} tag="p"
            style={{ fontSize:13,color:"#555",lineHeight:1.9,margin:"0 0 24px" }}/>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {(d.points||[]).map((pt,i)=>(
              <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                <div style={{ width:5,height:5,borderRadius:"50%",background:cat.accent,flexShrink:0,marginTop:7 }}/>
                <E v={pt} onSave={v=>upd({...d,points:d.points.map((p,j)=>j===i?v:p)})} tag="span"
                  style={{ fontSize:13,color:"#333",lineHeight:1.6,fontWeight:500 }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function Detail2Slide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:"#fff",fontFamily:SF }}>
      {img && <div style={{ height:320,overflow:"hidden" }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      <div style={{ padding:"44px 60px 0",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"SPECIFICATION"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:32,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-0.8,margin:"0 0 32px" }}/>
      </div>
      <div style={{ padding:"0 60px 48px" }}>
        {(d.specs||[]).map((s,i)=>(
          <div key={i} style={{ display:"flex",padding:"16px 0",borderBottom:`1px solid #f0f0f0`,gap:20 }}>
            <E v={s.label} onSave={v=>upd({...d,specs:d.specs.map((ss,j)=>j===i?{...ss,label:v}:ss)})} tag="span"
              style={{ fontSize:13,fontWeight:700,color:cat.accent,minWidth:120,flexShrink:0 }}/>
            <E v={s.value} onSave={v=>upd({...d,specs:d.specs.map((ss,j)=>j===i?{...ss,value:v}:ss)})} tag="span"
              style={{ fontSize:13,color:"#444",lineHeight:1.6 }}/>
          </div>
        ))}
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function ComparisonSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:cat.bg,fontFamily:SF }}>
      <div style={{ padding:"56px 60px 36px",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"WHY US"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:36,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-1,margin:"0 0 36px" }}/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div style={{ padding:"28px 24px",background:"#fff",borderRadius:10,border:`1px solid #e0e0e0` }}>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:3,color:"#999",marginBottom:16 }}>BEFORE</div>
            <E v={d.before||""} onSave={v=>upd({...d,before:v})} tag="p"
              style={{ fontSize:15,color:"#555",lineHeight:1.7,margin:0 }}/>
          </div>
          <div style={{ padding:"28px 24px",background:cat.accent,borderRadius:10 }}>
            <div style={{ fontSize:10,fontWeight:800,letterSpacing:3,color:"rgba(255,255,255,0.6)",marginBottom:16 }}>AFTER</div>
            <E v={d.after||""} onSave={v=>upd({...d,after:v})} tag="p"
              style={{ fontSize:15,color:"#fff",lineHeight:1.7,margin:0 }}/>
          </div>
        </div>
      </div>
      <div style={{ padding:"0 60px 48px",display:"flex",flexDirection:"column",gap:12 }}>
        {(d.points||[]).map((pt,i)=>(
          <div key={i} style={{ display:"flex",gap:12,alignItems:"flex-start",padding:"14px 20px",background:"#fff",borderRadius:8,border:`1px solid ${cat.sub}` }}>
            <div style={{ fontSize:11,fontWeight:800,color:"#fff",background:cat.accent,padding:"3px 8px",borderRadius:2,flexShrink:0,letterSpacing:1 }}>0{i+1}</div>
            <E v={pt} onSave={v=>upd({...d,points:d.points.map((p,j)=>j===i?v:p)})} tag="span"
              style={{ fontSize:14,color:"#333",fontWeight:500,lineHeight:1.6 }}/>
          </div>
        ))}
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function HowtoSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:"#fff",fontFamily:SF }}>
      {img && <div style={{ height:260,overflow:"hidden" }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      <div style={{ padding:"44px 60px 0",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"HOW TO USE"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:34,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-0.8,margin:"0 0 36px" }}/>
      </div>
      <div style={{ padding:"0 60px 48px",display:"flex",flexDirection:"column",gap:0 }}>
        {(d.steps||[]).map((s,i)=>(
          <div key={i} style={{ display:"flex",gap:24,padding:"20px 0",borderBottom: i<(d.steps||[]).length-1?`1px solid #f0f0f0`:"none" }}>
            <div style={{ fontSize:32,fontWeight:900,color:cat.sub,letterSpacing:-2,fontVariantNumeric:"tabular-nums",lineHeight:1,flexShrink:0,width:56,textAlign:"right" }}>{s.num||`0${i+1}`}</div>
            <div style={{ flex:1 }}>
              <E v={s.title} onSave={v=>upd({...d,steps:d.steps.map((ss,j)=>j===i?{...ss,title:v}:ss)})} tag="p"
                style={{ fontSize:16,fontWeight:800,color:"#1a1a1a",margin:"0 0 6px" }}/>
              <E v={s.desc} onSave={v=>upd({...d,steps:d.steps.map((ss,j)=>j===i?{...ss,desc:v}:ss)})} tag="p"
                style={{ fontSize:13,color:"#666",lineHeight:1.7,margin:0 }}/>
            </div>
          </div>
        ))}
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function IngredientSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:cat.bg,fontFamily:SF }}>
      <div style={{ display:"grid",gridTemplateColumns:img?"1fr 1fr":"1fr",minHeight:700 }}>
        <div style={{ padding:"56px 48px 48px",display:"flex",flexDirection:"column",justifyContent:"center" }}>
          <E v={d.sectionLabel||"INGREDIENT"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
            style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,marginBottom:16,display:"block" }}/>
          <div style={{ width:28,height:2,background:cat.accent,marginBottom:20 }}/>
          <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
            style={{ fontSize:30,fontWeight:900,color:"#1a1a1a",lineHeight:1.4,letterSpacing:-0.5,margin:"0 0 28px" }}/>
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {(d.items||[]).map((it,i)=>(
              <div key={i} style={{ paddingLeft:14,borderLeft:`2px solid ${cat.accent}` }}>
                <E v={it.name} onSave={v=>upd({...d,items:d.items.map((ii,j)=>j===i?{...ii,name:v}:ii)})} tag="p"
                  style={{ fontSize:14,fontWeight:800,color:"#1a1a1a",margin:"0 0 4px" }}/>
                <E v={it.desc} onSave={v=>upd({...d,items:d.items.map((ii,j)=>j===i?{...ii,desc:v}:ii)})} tag="p"
                  style={{ fontSize:12,color:"#666",lineHeight:1.6,margin:0 }}/>
              </div>
            ))}
          </div>
        </div>
        {img && <div style={{ overflow:"hidden" }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      </div>
      <SlideNum num={num} cat={cat}/>
    </div>
  );
}

function ReviewSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:"#fff",fontFamily:SF }}>
      <div style={{ padding:"56px 60px 40px",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"REVIEW"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:34,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-0.8,margin:0 }}/>
      </div>
      <div style={{ padding:"0 60px 0" }}>
        {(d.reviews||[]).map((r,i)=>(
          <div key={i} style={{ padding:"24px 0",borderBottom:`1px solid #f0f0f0` }}>
            <div style={{ display:"flex",gap:3,marginBottom:10 }}>
              {[1,2,3,4,5].map(s=><div key={s} style={{ width:10,height:10,background:cat.accent,borderRadius:1 }}/>)}
            </div>
            <E v={r.text} onSave={v=>upd({...d,reviews:d.reviews.map((rr,j)=>j===i?{...rr,text:v}:rr)})} tag="p"
              style={{ fontSize:15,color:"#333",lineHeight:1.8,margin:"0 0 10px",fontStyle:"italic" }}/>
            <E v={r.name} onSave={v=>upd({...d,reviews:d.reviews.map((rr,j)=>j===i?{...rr,name:v}:rr)})} tag="span"
              style={{ fontSize:12,color:"#999",fontWeight:600 }}/>
          </div>
        ))}
      </div>
      {img && <div style={{ margin:"20px 60px 0",height:160,overflow:"hidden",borderRadius:10 }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      <SlideNum num={num} cat={cat} pad="20px 60px 32px"/>
    </div>
  );
}

function TrustSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,minHeight:800,background:cat.bg,fontFamily:SF }}>
      <div style={{ padding:"56px 60px 40px",borderTop:`3px solid ${cat.accent}` }}>
        <E v={d.sectionLabel||"TRUST"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:cat.accent,display:"block",marginBottom:12 }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:34,fontWeight:900,color:"#1a1a1a",lineHeight:1.3,letterSpacing:-0.8,margin:0 }}/>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"0 60px",gap:16,marginBottom:28 }}>
        {(d.stats||[]).map((s,i)=>(
          <div key={i} style={{ padding:"32px 20px",background:"#fff",borderRadius:10,textAlign:"center",border:`1px solid ${cat.sub}` }}>
            <E v={s.number} onSave={v=>upd({...d,stats:d.stats.map((ss,j)=>j===i?{...ss,number:v}:ss)})} tag="div"
              style={{ fontSize:42,fontWeight:900,color:cat.accent,lineHeight:1,letterSpacing:-1 }}/>
            <E v={s.label} onSave={v=>upd({...d,stats:d.stats.map((ss,j)=>j===i?{...ss,label:v}:ss)})} tag="div"
              style={{ fontSize:11,color:"#888",marginTop:8,letterSpacing:1,fontWeight:600 }}/>
          </div>
        ))}
      </div>
      {d.certText && (
        <div style={{ margin:"0 60px",padding:"20px 24px",background:"#fff",borderRadius:10,border:`1px solid ${cat.sub}` }}>
          <E v={d.certText} onSave={v=>upd({...d,certText:v})} tag="p"
            style={{ fontSize:13,color:"#444",lineHeight:1.7,margin:0 }}/>
        </div>
      )}
      {img && <div style={{ margin:"20px 60px 0",height:160,overflow:"hidden",borderRadius:10 }}><img src={img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/></div>}
      <SlideNum num={num} cat={cat} pad="16px 60px 32px"/>
    </div>
  );
}

function CtaSlide({ d, upd, cat, img, num }) {
  return (
    <div style={{ width:800,height:800,position:"relative",overflow:"hidden",fontFamily:SF }}>
      {img ? (<><img src={img} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/><div style={{ position:"absolute",inset:0,background:`rgba(0,0,0,0.62)` }}/></>)
           : (<div style={{ position:"absolute",inset:0,background:cat.accent }}/>)}
      <div style={{ position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:"60px",textAlign:"center" }}>
        <E v={d.sectionLabel||"SPECIAL OFFER"} onSave={v=>upd({...d,sectionLabel:v})} tag="span"
          style={{ fontSize:10,fontWeight:800,letterSpacing:4,color:"rgba(255,255,255,0.6)",marginBottom:24,display:"block" }}/>
        <E v={d.headline||""} onSave={v=>upd({...d,headline:v})} tag="h2"
          style={{ fontSize:44,fontWeight:900,color:"#fff",lineHeight:1.3,letterSpacing:-1.5,margin:"0 0 28px" }}/>
        {d.originalPrice && (
          <E v={d.originalPrice} onSave={v=>upd({...d,originalPrice:v})} tag="div"
            style={{ fontSize:16,color:"rgba(255,255,255,0.5)",textDecoration:"line-through",marginBottom:8 }}/>
        )}
        <E v={d.price||""} onSave={v=>upd({...d,price:v})} tag="div"
          style={{ fontSize:56,fontWeight:900,color:"#fff",letterSpacing:-2,lineHeight:1,marginBottom:12 }}/>
        {d.discount && (
          <div style={{ display:"inline-block",background:"#fff",color:cat.accent,fontSize:13,fontWeight:800,padding:"8px 20px",borderRadius:2,marginBottom:28 }}>
            <E v={d.discount} onSave={v=>upd({...d,discount:v})} tag="span"/>
          </div>
        )}
        {!d.discount && <div style={{ marginBottom:28 }}/>}
        <E v={d.urgency||""} onSave={v=>upd({...d,urgency:v})} tag="p"
          style={{ fontSize:13,color:"rgba(255,255,255,0.65)",marginBottom:36,letterSpacing:0.5,margin:"0 0 32px" }}/>
        <div style={{ background:"#fff",color:cat.accent,borderRadius:3,padding:"18px 64px",fontSize:18,fontWeight:900,letterSpacing:-0.3 }}>
          <E v={d.cta||"지금 구매하기"} onSave={v=>upd({...d,cta:v})} tag="span"/>
        </div>
      </div>
    </div>
  );
}

function SlideNum({ num, cat, pad }) {
  return (
    <div style={{ padding: pad||"14px 60px 28px", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:24, height:2, background:cat.accent, borderRadius:1 }}/>
      <span style={{ fontSize:10, color:"#bbb", letterSpacing:3, fontWeight:600 }}>
        {String(num).padStart(2,"0")}
      </span>
    </div>
  );
}

const RENDERERS = {
  hero: HeroSlide, feature: FeatureSlide, detail1: Detail1Slide, detail2: Detail2Slide,
  comparison: ComparisonSlide, howto: HowtoSlide, ingredient: IngredientSlide,
  review: ReviewSlide, trust: TrustSlide, cta: CtaSlide,
};

function SlideView({ slide, updSlide, cat, imgUrl, num, thumb }) {
  const Comp = RENDERERS[slide.id] || Detail1Slide;
  const scale = thumb ? 100/800 : 1;
  const inner = <Comp d={slide} upd={updSlide} cat={cat} img={imgUrl} num={num}/>;
  if (!thumb) return inner;
  return (
    <div style={{ width:100, height:100, overflow:"hidden", borderRadius:6, flexShrink:0, pointerEvents:"none", background:"#fff" }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:"top left", width:800, height:800 }}>
        {inner}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 메인
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark }) {
  const [step,      setStep]      = useState(1);
  const [selCat,    setSelCat]    = useState(null);
  const [images,    setImages]    = useState([]);        // 상품 이미지들
  const [refImg,    setRefImg]    = useState(null);      // 참고 이미지
  const [refStyle,  setRefStyle]  = useState("");        // 참고 스타일 분석 결과
  const [analyzing, setAnalyzing] = useState(false);
  const [pageCount, setPageCount] = useState(5);
  const [form,      setForm]      = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [slides,    setSlides]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");
  const [curIdx,    setCurIdx]    = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");
  const fileRef    = useRef(null);
  const refFileRef = useRef(null);
  const slideRef   = useRef(null);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];

  // 슬라이드별 이미지 배정 (순환)
  const getImgForSlide = (idx) => images.length > 0 ? images[idx % images.length]?.dataUrl : null;

  const handleImages = (files) => {
    const arr = Array.from(files).slice(0, 10);
    Promise.all(arr.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ name: f.name, dataUrl: e.target.result });
      r.readAsDataURL(f);
    }))).then(imgs => setImages(p => [...p, ...imgs].slice(0,10)));
  };

  const handleRefImg = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      const dataUrl = e.target.result;
      setRefImg(dataUrl);
      setAnalyzing(true);
      try {
        const base64 = dataUrl.split(",")[1];
        const mime   = dataUrl.split(":")[1].split(";")[0];
        const style  = await analyzeRefImage(base64, mime);
        setRefStyle(style);
      } catch(err) { setRefStyle("분석 실패"); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  const generate = async () => {
    if (!form.productName.trim()) { setErr("상품명을 입력해주세요"); return; }
    if (!form.features.trim())    { setErr("핵심 특징을 입력해주세요"); return; }
    setErr(""); setLoading(true);
    try {
      const data = await generateContent({ category:selCat, ...form, pageCount, refStyle });
      setSlides(data.slides || []);
      setStep(3); setCurIdx(0);
    } catch(e) { setErr("생성 실패: " + e.message); }
    finally    { setLoading(false); }
  };

  const updSlide = (idx, d) => setSlides(p => p.map((s,i) => i===idx ? d : s));

  // ── 저장 (html2canvas) ──────────────────────────────────────
  const saveSlide = async () => {
    if (!slideRef.current) return;
    setSaving(true); setSaveMsg("저장 중...");
    try {
      const h2c = await loadH2C();
      // 슬라이드 내부 800×800 div를 직접 캡처
      const target = slideRef.current.querySelector("[data-slide-inner]") || slideRef.current;
      const canvas = await h2c(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 800,
        height: target.scrollHeight || 800,
        logging: false,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${form.productName||"detail"}_slide${curIdx+1}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setSaveMsg("✅ 저장 완료!");
    } catch(e) {
      setSaveMsg("저장 실패: " + e.message);
    }
    setSaving(false);
    setTimeout(()=>setSaveMsg(""), 3000);
  };

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── Step 1 카테고리 ─────────────────────────────────────────
  if (step === 1) return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>상세페이지 생성기</div>
        <div style={{ fontSize:13, color:muted }}>카테고리 선택 → 정보 입력 → AI 슬라이드 생성 + 텍스트 편집</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:10 }}>
        {CATEGORIES.map(c=>(
          <button key={c.key} onClick={()=>{ setSelCat(c.key); setStep(2); }}
            style={{ padding:"22px 18px", borderRadius:12, border:`1.5px solid ${bdr}`, background:cardBg, cursor:"pointer", textAlign:"left", transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=c.accent; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 20px ${c.accent}20`; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=bdr; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
            <div style={{ fontSize:12, fontWeight:800, color:c.accent, letterSpacing:2, marginBottom:10 }}>
              {c.label.toUpperCase()}
            </div>
            <div style={{ width:28, height:2, background:c.accent, borderRadius:1 }}/>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 2 입력 ─────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 24px 60px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
        <button onClick={()=>setStep(1)} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>← 카테고리</button>
        <span style={{ fontSize:16, fontWeight:800, color:text }}>{cat.label} 상세페이지</span>
        <div style={{ width:28, height:2, background:cat.accent, borderRadius:1 }}/>
      </div>

      <div style={{ display:"grid", gap:14 }}>

        {/* 슬라이드 수 */}
        <div style={{ padding:"16px 20px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
            <div style={{ fontSize:20, fontWeight:900, color:cat.accent }}>{pageCount}장</div>
          </div>
          <input type="range" min={3} max={10} value={pageCount} onChange={e=>setPageCount(Number(e.target.value))}
            style={{ width:"100%", accentColor:cat.accent }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:6 }}>
            <span>3장 (최소)</span>
            <span style={{ color:muted }}>구성: {ALL_SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}</span>
            <span>10장 (최대)</span>
          </div>
        </div>

        {/* 상품 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:8 }}>
            상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(최대 10장 — 슬라이드별 자동 배치)</span>
          </div>
          <div onClick={()=>fileRef.current?.click()}
            onDrop={e=>{e.preventDefault();handleImages(e.dataTransfer.files);}}
            onDragOver={e=>e.preventDefault()}
            style={{ border:`1.5px dashed ${images.length?cat.accent:bdr}`, borderRadius:12, padding:images.length?"14px":"28px", cursor:"pointer", background:images.length?`${cat.accent}06`:cardBg, transition:"all 0.12s" }}>
            {images.length ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                {images.map((img,i)=>(
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.dataUrl} alt="" style={{ width:64,height:64,objectFit:"cover",borderRadius:7,display:"block",border:`1px solid ${bdr}` }}/>
                    <button onClick={e=>{e.stopPropagation();setImages(p=>p.filter((_,j)=>j!==i));}}
                      style={{ position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                  </div>
                ))}
                {images.length<10 && <div style={{ width:64,height:64,borderRadius:7,border:`1.5px dashed ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:muted }}>+</div>}
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:12,fontWeight:700,color:text,marginBottom:4 }}>클릭 또는 드래그</div>
                <div style={{ fontSize:12,color:muted }}>JPG, PNG 지원</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handleImages(e.target.files);e.target.value="";}}/>
        </div>

        {/* 참고 이미지 */}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>
            참고 이미지 <span style={{ color:muted, fontWeight:400 }}>(선택 — 해당 스타일을 참고해서 생성)</span>
          </div>
          <div style={{ fontSize:11, color:muted, marginBottom:8 }}>마음에 드는 상세페이지 이미지를 올리면 AI가 스타일을 분석해 반영해요</div>
          <div onClick={()=>refFileRef.current?.click()}
            style={{ border:`1.5px dashed ${refImg?cat.accent:bdr}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", display:"flex", gap:14, alignItems:"center", background:cardBg, transition:"all 0.12s" }}>
            {refImg ? (
              <>
                <img src={refImg} alt="" style={{ width:72,height:72,objectFit:"cover",borderRadius:8,flexShrink:0,border:`1px solid ${bdr}` }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  {analyzing ? (
                    <div style={{ fontSize:13,color:muted }}>AI가 스타일 분석 중...</div>
                  ) : refStyle ? (
                    <>
                      <div style={{ fontSize:11,fontWeight:700,color:cat.accent,marginBottom:4 }}>분석 완료</div>
                      <div style={{ fontSize:12,color:muted,lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical" }}>{refStyle}</div>
                    </>
                  ) : null}
                </div>
                <button onClick={e=>{e.stopPropagation();setRefImg(null);setRefStyle("");}}
                  style={{ flexShrink:0,padding:"4px 10px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer" }}>제거</button>
              </>
            ) : (
              <div style={{ fontSize:12,color:muted }}>참고 이미지 업로드 (선택)</div>
            )}
          </div>
          <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{handleRefImg(e.target.files[0]);e.target.value="";}}/>
        </div>

        {/* 텍스트 입력 */}
        {[
          { key:"productName", label:"상품명 *",    ph:"예: 프리미엄 한우 1++ 등심 선물 세트", required:true },
          { key:"features",    label:"핵심 특징 *", ph:"예: 1++ 최고 등급, 냉장 당일 배송, 고급 선물 포장", textarea:true, required:true },
          { key:"price",       label:"가격",         ph:"예: 89,000원" },
          { key:"cta",         label:"CTA 문구",     ph:"예: 지금 주문하기" },
          { key:"target",      label:"타겟 고객",    ph:"예: 특별한 날 선물을 찾는 3040" },
          { key:"extra",       label:"추가 정보",    ph:"예: 수상 이력, 원산지, 보관 방법", textarea:true },
        ].map(({ key, label, ph, textarea }) => (
          <div key={key}>
            <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:6 }}>{label}</div>
            {textarea ? (
              <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ ...inputStyle,resize:"vertical",lineHeight:1.7 }}/>
            ) : (
              <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inputStyle}/>
            )}
          </div>
        ))}

        {err && <div style={{ padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",fontSize:12,color:"#f87171" }}>{err}</div>}

        <button onClick={generate} disabled={loading||analyzing}
          style={{ padding:"14px",borderRadius:12,border:"none",cursor:loading?"wait":"pointer",background:loading?`${cat.accent}50`:cat.accent,color:"#fff",fontSize:15,fontWeight:900,transition:"all 0.12s",opacity:loading||analyzing?0.7:1 }}>
          {loading ? "AI가 상세페이지를 구성하는 중..." : `${cat.label} 상세페이지 ${pageCount}장 생성`}
        </button>
      </div>
    </div>
  );

  // ── Step 3 결과 ─────────────────────────────────────────────
  if (step === 3 && slides) {
    const slide      = slides[curIdx];
    const slideTypes = ALL_SLIDE_TYPES.slice(0, slides.length);
    const imgUrl     = getImgForSlide(curIdx);
    const PREVIEW_W  = 560;
    const scale      = PREVIEW_W / 800;

    return (
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"20px 20px 60px" }}>
        {/* 상단 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setStep(2)} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>← 수정</button>
            <button onClick={()=>{ setStep(1);setSlides(null);setImages([]);setRefImg(null);setRefStyle("");setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""}); }}
              style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>새로 만들기</button>
            <span style={{ fontSize:11,color:muted,alignSelf:"center",marginLeft:4 }}>텍스트 클릭 → 편집</span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button onClick={()=>setCurIdx(Math.max(0,curIdx-1))} disabled={curIdx===0}
              style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===0?"not-allowed":"pointer",opacity:curIdx===0?0.3:1,fontSize:18 }}>‹</button>
            <span style={{ fontSize:12,color:muted,minWidth:44,textAlign:"center" }}>{curIdx+1} / {slides.length}</span>
            <button onClick={()=>setCurIdx(Math.min(slides.length-1,curIdx+1))} disabled={curIdx===slides.length-1}
              style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===slides.length-1?"not-allowed":"pointer",opacity:curIdx===slides.length-1?0.3:1,fontSize:18 }}>›</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
          {/* 메인 미리보기 */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:800, color:cat.accent, letterSpacing:2, marginBottom:8 }}>
              {slideTypes[curIdx]?.label?.toUpperCase()}
            </div>
            {/* 스케일 래퍼 */}
            <div style={{ width:"100%", paddingBottom:`${100 * (slide.id==="hero"||slide.id==="cta" ? 1 : 1)}%`, position:"relative", borderRadius:14, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", background:"#fff" }}>
              <div ref={slideRef} style={{ position:"absolute", inset:0, overflow:"hidden" }}>
                <div data-slide-inner=""
                  style={{ transform:`scale(${scale})`, transformOrigin:"top left", width:800 }}>
                  <SlideView slide={slide} updSlide={d=>updSlide(curIdx,d)} cat={cat} imgUrl={imgUrl} num={curIdx+1}/>
                </div>
              </div>
            </div>
            {/* 저장 버튼 */}
            <div style={{ display:"flex", gap:8, marginTop:10, alignItems:"center" }}>
              <button onClick={saveSlide} disabled={saving}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:saving?"wait":"pointer", background:cat.accent, color:"#fff", fontSize:13, fontWeight:800, opacity:saving?0.6:1 }}>
                {saving ? "저장 중..." : "현재 슬라이드 저장 (PNG)"}
              </button>
              {saveMsg && <span style={{ fontSize:12, color: saveMsg.startsWith("✅")?"#4ade80":"#f87171", fontWeight:600 }}>{saveMsg}</span>}
            </div>
          </div>

          {/* 섬네일 */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
            {slides.map((s,i)=>(
              <div key={i} onClick={()=>setCurIdx(i)} style={{ cursor:"pointer", borderRadius:8, overflow:"hidden", border: i===curIdx?`2.5px solid ${cat.accent}`:`2.5px solid transparent`, transition:"all 0.12s" }}>
                <SlideView slide={s} updSlide={()=>{}} cat={cat} imgUrl={getImgForSlide(i)} num={i+1} thumb/>
                <div style={{ fontSize:9,color:i===curIdx?cat.accent:muted,textAlign:"center",padding:"3px 0",fontWeight:i===curIdx?800:400,background:isDark?"rgba(0,0,0,0.3)":"rgba(255,255,255,0.9)" }}>
                  {slideTypes[i]?.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
