import { useState, useEffect } from "react";
import { useI18n } from "./i18n.jsx";
import { changePoints, supabase } from "./storage";

/* ════════════════════════════════════════════════════════════
   AI 기획 (Prompt Studio) - 비즈니스 문서 생성
════════════════════════════════════════════════════════════ */

const PLAN_SAVES_KEY = "nper_plans_v1";
function getPlanSaves() { try { return JSON.parse(localStorage.getItem(PLAN_SAVES_KEY)||"[]"); } catch { return []; } }
function savePlan(item) {
  const list = getPlanSaves().filter(x=>x.id!==item.id);
  list.unshift(item);
  try { localStorage.setItem(PLAN_SAVES_KEY, JSON.stringify(list.slice(0,50))); } catch {}
}
function deletePlan(id) {
  try { localStorage.setItem(PLAN_SAVES_KEY, JSON.stringify(getPlanSaves().filter(x=>x.id!==id))); } catch {}
}

function PromptStudioPage({ isDark, homeText, homeMuted, cardBdr, setAiMenu, user, onLoginRequest, onUserUpdate, showPointConfirm, renderFooter, noHeader }) {
  const text = homeText, muted = homeMuted, bdr = cardBdr;
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const ibg = isDark ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const accent = "#7c6aff";
  const D = isDark;

  const [input, setInput] = useState("");
  const [docType, setDocType] = useState(() => { const saved = sessionStorage.getItem("_prompt_doctype"); if (saved) sessionStorage.removeItem("_prompt_doctype"); return saved || "proposal"; });
  const [docCat, setDocCat] = useState(0);
  const [tone, setTone] = useState("professional");
  const [format, setFormat] = useState("structured");
  const [step, setStep] = useState("input");
  const [result, setResult] = useState("");
  const [plans, setPlans] = useState(getPlanSaves);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const inp = { width:"100%", padding:"12px 16px", borderRadius:12, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const DOC_GROUPS = [
    { label:"비즈니스", items:[
      { id:"proposal",   label:"사업 제안서",   desc:"투자·파트너 제안" },
      { id:"bizplan",    label:"사업계획서",    desc:"창업·투자유치용" },
      { id:"ppt_outline",label:"PPT 구성안",   desc:"발표 슬라이드 기획" },
      { id:"report",     label:"보고서",       desc:"업무·분석 보고서" },
    ]},
    { label:"업무", items:[
      { id:"planner",    label:"플래너·일정표", desc:"프로젝트·업무 계획" },
      { id:"meeting",    label:"회의록",       desc:"회의 안건·결과 정리" },
      { id:"email",      label:"비즈니스 메일", desc:"공식 이메일·레터" },
      { id:"contract",   label:"계약서 초안",   desc:"계약·합의서 템플릿" },
    ]},
    { label:"메시지·인사", items:[
      { id:"congrats",   label:"축하 메시지",   desc:"결혼·승진·생일·개업" },
      { id:"condolence", label:"위로·감사",     desc:"조의·병문안·감사" },
      { id:"speech",     label:"인사말·축사",   desc:"행사·연설·건배사" },
      { id:"invite",     label:"초대장·안내문",  desc:"행사·모임·공지" },
    ]},
    { label:"기타", items:[
      { id:"manual",     label:"매뉴얼·가이드", desc:"운영·사용 설명서" },
      { id:"brief",      label:"브리프",       desc:"프로젝트·디자인 브리프" },
      { id:"resume",     label:"이력서·자소서", desc:"채용·지원서" },
      { id:"free",       label:"자유 문서",     desc:"형식 없이 자유롭게" },
    ]},
  ];
  const DOC_TYPES = DOC_GROUPS.flatMap(g=>g.items);

  const TONES = [
    { id:"professional", label:"전문적/공식적" },
    { id:"friendly",     label:"친근한/대화체" },
    { id:"concise",      label:"간결한/핵심만" },
    { id:"persuasive",   label:"설득적/논리적" },
    { id:"creative",     label:"창의적/자유로운" },
  ];

  const FORMATS = [
    { id:"structured", label:"구조화 (목차+본문)" },
    { id:"outline",    label:"아웃라인 (목차만)" },
    { id:"full",       label:"완성본 (바로 사용)" },
    { id:"bullet",     label:"불릿 포인트" },
  ];

  const docInfo = DOC_TYPES.find(d=>d.id===docType) || DOC_TYPES[0];
  const toneInfo = TONES.find(t=>t.id===tone) || TONES[0];
  const formatInfo = FORMATS.find(f=>f.id===format) || FORMATS[0];

  const generate = async () => {
    if (!input.trim()) { setErr("어떤 문서를 만들지 입력해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!(await showPointConfirm(30))) return;
    setStep("loading"); setErr(""); setResult("");
    window.__isGenerating = true; window.__generatingCost = 30;
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "gen_prompt_studio", type: "blog_write", message: "문서 생성 중..." } } }));
    try {
      const { callClaude } = await import("./aiClient");
      const r = await callClaude(
`당신은 실무 문서 작성 전문가입니다.

[문서 유형] ${docInfo.label}
[말투/톤] ${toneInfo.label}
[형식] ${formatInfo.label}
[요청] ${input}

규칙:
- 이모티콘, 이모지 사용 금지. 깔끔하고 전문적인 텍스트만 사용
- 실제 업무에서 바로 사용할 수 있는 수준으로 작성
- ${docType==="proposal"?"목적, 배경, 제안 내용, 기대 효과, 일정, 예산 항목 포함":""}
- ${docType==="bizplan"?"사업 개요, 시장 분석, 비즈니스 모델, 재무 계획, 팀 구성, 로드맵 포함":""}
- ${docType==="ppt_outline"?"슬라이드별 제목 + 핵심 내용 + 발표 스크립트 포함. 15~20장 분량":""}
- ${docType==="planner"?"일정, 담당자, 마일스톤, 체크리스트 형태로 구성":""}
- ${docType==="report"?"요약, 현황, 분석, 결론, 제언 구조":""}
- ${docType==="contract"?"계약 당사자, 계약 목적, 조건, 기간, 금액, 해지 조건, 서명란 포함":""}
- ${docType==="meeting"?"일시, 참석자, 안건, 논의 내용, 결정사항, 후속조치 구조":""}
- ${docType==="email"?"제목, 수신자, 본문(인사-목적-내용-마무리), 서명 포함":""}
- ${docType==="manual"?"목차, 개요, 단계별 설명, 주의사항, FAQ 포함":""}
- ${docType==="brief"?"프로젝트 배경, 목표, 범위, 일정, 예산, 참고자료 구조":""}
- ${docType==="resume"?"인적사항, 학력, 경력, 역량, 자기소개서(지원동기/성장과정/입사후포부) 포함":""}
- ${docType==="congrats"?"관계(직장동료/친구/지인/가족)와 상황(결혼/승진/생일/개업/출산/졸업)에 맞는 축하 메시지 3~5가지 버전 작성. 짧은 버전(카톡용), 중간 버전(축의금봉투), 긴 버전(편지/카드) 각각 포함. 격식체와 친근체 모두 제공":""}
- ${docType==="condolence"?"상황(조의/병문안/퇴직/감사)에 맞는 메시지 3~5가지 버전 작성. 짧은 버전(문자용), 긴 버전(편지/카드) 포함. 적절한 위로와 공감 표현":""}
- ${docType==="speech"?"행사 종류(결혼/송년회/환영회/기념식/퇴임식)에 맞는 인사말/축사. 도입-본론-마무리 구조. 1~3분 분량 기준. 건배사 포함":""}
- ${docType==="invite"?"행사명, 일시, 장소, 대상, 참석 안내, 회신 방법 포함. 공식/비공식 버전 모두 제공":""}
- ${format==="outline"?"상세 목차와 각 항목의 핵심 키워드만 정리":""}
- ${format==="bullet"?"불릿 포인트 형태로 핵심만 간결하게":""}
- ${format==="full"?"완성된 문서 형태로 바로 사용 가능하게":""}
- 한국어로 작성
- 마크다운 헤더(#, ##, ###) 사용하여 구조화`, 4000);
      setResult(r || "결과를 생성하지 못했습니다.");
      setStep("result");
      const plan = { id:"plan_"+Date.now(), input, docType, tone, format, result:r, date:new Date().toLocaleDateString("ko-KR") };
      savePlan(plan);
      setPlans(getPlanSaves());
      if (user && onUserUpdate) {
        try {
          const { changePoints } = await import("./storage");
          const newPts = await changePoints(user.uid, -30, "기획 생성");
          if (newPts !== null) onUserUpdate({ ...user, points: newPts });
        } catch {}
      }
    } catch (e) { setErr("생성 실패: " + (e.message || "다시 시도해주세요.")); setStep("input"); }
    finally { window.__isGenerating = false; window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "gen_prompt_studio" } } })); }
  };

  const loadPlan = (p) => {
    setInput(p.input||""); setDocType(p.docType||"proposal"); setTone(p.tone||"professional"); setFormat(p.format||"structured");
    setResult(p.result||""); setStep(p.result?"result":"input");
  };

  const removePlan = (id) => { deletePlan(id); setPlans(getPlanSaves()); };

  const downloadTxt = () => {
    const blob = new Blob([result], { type:"text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${docInfo.label}_${new Date().toISOString().slice(0,10)}.txt`; a.click();
  };

  const downloadPdf = () => {
    const w = window.open("","_blank");
    if (!w) return;
    const lines = result.split("\n").map(l => {
      if (l.startsWith("### ")) return `<h3 style="margin:18px 0 8px;font-size:16px;font-weight:700">${l.slice(4)}</h3>`;
      if (l.startsWith("## "))  return `<h2 style="margin:24px 0 10px;font-size:18px;font-weight:800">${l.slice(3)}</h2>`;
      if (l.startsWith("# "))   return `<h1 style="margin:28px 0 12px;font-size:22px;font-weight:900">${l.slice(2)}</h1>`;
      if (l.startsWith("- "))   return `<li style="margin:3px 0 3px 20px;line-height:1.8">${l.slice(2)}</li>`;
      if (!l.trim()) return `<br/>`;
      return `<p style="margin:4px 0;line-height:1.9">${l}</p>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docInfo.label}</title>
<style>@page{size:A4;margin:20mm}body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#222;max-width:700px;margin:0 auto;padding:40px 20px}
h1,h2,h3{color:#1a1a2e}li{list-style:disc}</style></head><body>${lines}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const EXAMPLES = [
    "AI SaaS 스타트업 투자유치용 사업계획서",
    "신규 서비스 런칭 제안서 (B2B)",
    "2026년 마케팅 전략 PPT 구성안",
    "앱 개발 프로젝트 3개월 플래너",
    "직장 동료 결혼 축하 메시지",
    "회사 송년회 건배사",
    "거래처 감사 메일",
    "팀원 승진 축하 카드",
  ];

  // ── 입력 ──
  if (step === "input") return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:660, margin:"0 auto" }}>
        {!noHeader && <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>기획</div>
          <div style={{ fontSize:14, color:muted, lineHeight:1.8 }}>실무 문서를 AI가 작성해드립니다.</div>
        </div>}

        {/* 카테고리 탭 */}
        <div style={{ display:"flex", gap:0, marginBottom:14, borderBottom:`1.5px solid ${bdr}` }}>
          {DOC_GROUPS.map((g,i) => {
            const active = docCat===i;
            return (
              <button key={g.label} onClick={()=>{setDocCat(i);if(!g.items.some(d=>d.id===docType))setDocType(g.items[0].id);}}
                style={{ flex:1, padding:"10px 0", background:"transparent", border:"none", borderBottom:active?`2.5px solid ${accent}`:"2.5px solid transparent",
                  color:active?accent:muted, fontSize:13, fontWeight:active?800:500, cursor:"pointer", transition:"all 0.15s", marginBottom:-1.5 }}>
                {g.label}
              </button>
            );
          })}
        </div>
        {/* 문서 유형 */}
        <div style={{ marginBottom:18 }}>
          <div className="ai-grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
            {DOC_GROUPS[docCat].items.map(d => {
              const sel = docType===d.id;
              return (
                <button key={d.id} onClick={()=>setDocType(d.id)}
                  style={{ padding:"10px 6px", borderRadius:10, border:`1.5px solid ${sel?accent:bdr}`,
                    background:sel?`${accent}10`:"transparent", cursor:"pointer", textAlign:"center", transition:"all 0.12s" }}>
                  <div style={{ fontSize:12, fontWeight:sel?800:500, color:sel?accent:text, marginBottom:2 }}>{d.label}</div>
                  <div style={{ fontSize:9, color:muted }}>{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 입력 */}
        <div style={{ borderRadius:14, border:`1.5px solid ${accent}30`, background:bg, padding:"18px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>내용 설명</div>
          <textarea value={input} onChange={e=>{setInput(e.target.value);setErr("");}}
            style={{ ...inp, minHeight:90, resize:"vertical", fontSize:14, lineHeight:1.8, border:"none", background:"transparent", padding:"0" }}
            placeholder={`예: ${EXAMPLES[DOC_TYPES.findIndex(d=>d.id===docType)%EXAMPLES.length]||EXAMPLES[0]}`} />
        </div>

        {/* 예시 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
          {EXAMPLES.map((ex,i) => (
            <button key={i} onClick={()=>setInput(ex)}
              style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:bg,
                color:muted, fontSize:11, cursor:"pointer", transition:"all 0.12s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>
              {ex}
            </button>
          ))}
        </div>

        {/* 말투 + 형식 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>말투</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {TONES.map(t => {
                const sel = tone===t.id;
                return <button key={t.id} onClick={()=>setTone(t.id)}
                  style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${sel?accent:bdr}`, background:sel?`${accent}10`:"transparent",
                    color:sel?accent:muted, fontSize:12, fontWeight:sel?700:400, cursor:"pointer", textAlign:"left" }}>{t.label}</button>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>형식</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {FORMATS.map(f => {
                const sel = format===f.id;
                return <button key={f.id} onClick={()=>setFormat(f.id)}
                  style={{ padding:"8px 12px", borderRadius:8, border:`1px solid ${sel?accent:bdr}`, background:sel?`${accent}10`:"transparent",
                    color:sel?accent:muted, fontSize:12, fontWeight:sel?700:400, cursor:"pointer", textAlign:"left" }}>{f.label}</button>;
              })}
            </div>
          </div>
        </div>

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#f87171", fontSize:13, marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>{err}{(err.includes("포인트")||err.includes("충전"))&&<button onClick={()=>window.location.href="/pricing"} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>}</div>}

        <button onClick={generate} disabled={!input.trim()}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:input.trim()?"pointer":"not-allowed",
            background:input.trim()?accent:"rgba(128,128,128,0.2)",
            color:"#fff", fontSize:16, fontWeight:900, opacity:input.trim()?1:0.5 }}>
          AI 생성 (10P)
        </button>

        {/* 저장된 기획 */}
        {plans.length > 0 && (
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>내 기획 ({plans.length})</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {plans.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:10,
                  border:`1px solid ${bdr}`, background:bg, cursor:"pointer" }}
                  onClick={()=>loadPlan(p)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;}}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.input}</div>
                    <div style={{ fontSize:11, color:muted }}>{p.date} / {DOC_TYPES.find(d=>d.id===p.docType)?.label||""}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();removePlan(p.id);}}
                    style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(248,113,113,0.15)", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {renderFooter && renderFooter()}
    </div>
  );

  // ── 로딩 ──
  if (step === "loading") return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:900, color:accent, marginBottom:12 }}>문서 생성 중</div>
        <div style={{ width:280, height:5, borderRadius:3, background:"rgba(128,128,128,0.12)", overflow:"hidden", margin:"0 auto 16px" }}>
          <div style={{ height:"100%", borderRadius:3, background:accent, animation:"ai-progress 12s ease-out forwards" }} />
        </div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>{docInfo.label} 작성 중...<br/>"{input.slice(0,50)}{input.length>50?"...":""}"</div>
      </div>
    </div>
  );

  // ── 결과 ──
  // 마크다운 헤더 → 간단한 HTML 변환
  const renderResult = () => {
    return result.split("\n").map((line,i) => {
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize:15, fontWeight:700, color:text, margin:"16px 0 6px" }}>{line.slice(4)}</h3>;
      if (line.startsWith("## "))  return <h2 key={i} style={{ fontSize:17, fontWeight:800, color:text, margin:"22px 0 8px" }}>{line.slice(3)}</h2>;
      if (line.startsWith("# "))   return <h1 key={i} style={{ fontSize:20, fontWeight:900, color:text, margin:"26px 0 10px" }}>{line.slice(2)}</h1>;
      if (line.startsWith("- "))   return <li key={i} style={{ fontSize:14, color:text, lineHeight:1.9, marginLeft:20 }}>{line.slice(2)}</li>;
      if (!line.trim()) return <br key={i}/>;
      return <p key={i} style={{ fontSize:14, color:text, lineHeight:1.9, margin:"3px 0" }}>{line}</p>;
    });
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:740, margin:"0 auto" }}>
        {/* 상단 */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={()=>setStep("input")} style={{ background:"none", border:"none", cursor:"pointer", color:muted, fontSize:18 }}>←</button>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:text }}>{docInfo.label}</div>
            <div style={{ fontSize:11, color:muted }}>{toneInfo.label} / {formatInfo.label}</div>
          </div>
          <div style={{ flex:1 }} />
          <button onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
            style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${copied?"rgba(74,222,128,0.3)":bdr}`, background:copied?"rgba(74,222,128,0.06)":"transparent", color:copied?"#4ade80":text, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {copied ? "복사됨" : "복사"}
          </button>
        </div>

        {/* 요청 요약 */}
        <div style={{ padding:"10px 14px", borderRadius:8, background:ibg, border:`1px solid ${bdr}`, marginBottom:16, fontSize:12, color:muted }}>
          {input}
        </div>

        {/* 결과 본문 */}
        <div style={{ borderRadius:14, border:`1px solid ${bdr}`, background:bg, padding:"28px 30px", marginBottom:16 }}>
          {renderResult()}
        </div>

        {/* 다운로드 */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <button onClick={downloadTxt}
            style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid ${bdr}`, background:bg, color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            TXT 저장
          </button>
          <button onClick={downloadPdf}
            style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid ${bdr}`, background:bg, color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            PDF 저장 (인쇄)
          </button>
        </div>

        {/* 하단 액션 */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>{setResult("");setStep("input");}} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:14, fontWeight:700, cursor:"pointer" }}>새로 기획</button>
          <button onClick={generate} style={{ flex:1, padding:"13px", borderRadius:12, border:"none", cursor:"pointer", background:accent, color:"#fff", fontSize:14, fontWeight:800 }}>다시 생성 (10P)</button>
        </div>
      </div>
      {renderFooter && renderFooter()}
    </div>
  );
}


const NEWS_CATEGORIES = [
  { id: "sns", label: "SNS 마케팅", query: "SNS+마케팅" },
  { id: "digital", label: "디지털 마케팅", query: "디지털+마케팅" },
  { id: "ai", label: "AI/테크", query: "AI+마케팅" },
  { id: "trend", label: "트렌드", query: "마케팅+트렌드" },
  { id: "biz", label: "비즈니스", query: "스타트업+마케팅" },
];

const FALLBACK_NEWS_BY_CATEGORY = {
  sns: [
    { title: "2026 SNS 마케팅 트렌드: AI 콘텐츠 자동화가 대세", source: "마케팅타임즈", pubDate: "2026-03-29", link: "https://news.google.com/search?q=SNS+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "올해 SNS 마케팅의 핵심 키워드는 AI 기반 콘텐츠 자동화입니다. 인스타그램, 틱톡 등 주요 플랫폼에서 AI 도구를 활용한 콘텐츠 제작이 급증하고 있습니다.", thumb: "" },
    { title: "인스타그램 릴스 알고리즘 변경, 마케터가 알아야 할 것들", source: "소셜미디어투데이", pubDate: "2026-03-28", link: "https://news.google.com/search?q=%EC%9D%B8%EC%8A%A4%ED%83%80%EA%B7%B8%EB%9E%A8+%EB%A6%B4%EC%8A%A4&hl=ko", description: "인스타그램이 릴스 추천 알고리즘을 대폭 개편했습니다. 짧은 영상보다 정보성 콘텐츠에 더 높은 가중치를 부여하는 방향으로 변경되었습니다.", thumb: "" },
    { title: "틱톡 커머스 기능 확대, 소상공인 매출 증가 효과", source: "이커머스뉴스", pubDate: "2026-03-28", link: "https://news.google.com/search?q=%ED%8B%B1%ED%86%A1+%EC%BB%A4%EB%A8%B8%EC%8A%A4&hl=ko", description: "틱톡의 인앱 쇼핑 기능이 확대되면서 소상공인들의 매출이 평균 35% 증가한 것으로 나타났습니다.", thumb: "" },
    { title: "스레드(Threads) 마케팅 활용법, 브랜드 사례 분석", source: "디지털마케팅인사이트", pubDate: "2026-03-26", link: "https://news.google.com/search?q=Threads+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "메타의 스레드가 마케팅 채널로 주목받고 있습니다. 성공적인 브랜드 활용 사례와 전략을 분석합니다.", thumb: "" },
    { title: "카드뉴스 vs 릴스, 2026년 최적의 콘텐츠 포맷은?", source: "콘텐츠마케팅랩", pubDate: "2026-03-26", link: "https://news.google.com/search?q=%EC%B9%B4%EB%93%9C%EB%89%B4%EC%8A%A4+%EB%A6%B4%EC%8A%A4&hl=ko", description: "카드뉴스와 릴스 중 어떤 포맷이 더 효과적인지 데이터 기반으로 비교 분석한 결과를 공유합니다.", thumb: "" },
  ],
  digital: [
    { title: "퍼포먼스 마케팅의 종말? 브랜딩 중심으로 전환", source: "디지털마케팅리뷰", pubDate: "2026-03-29", link: "https://news.google.com/search?q=%EB%94%94%EC%A7%80%ED%84%B8+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "서드파티 쿠키 폐지 이후 퍼포먼스 마케팅의 효율이 급감하면서, 브랜딩 중심 마케팅으로 전환하는 기업이 늘고 있습니다.", thumb: "" },
    { title: "구글 SEO 2026 핵심 업데이트 총정리", source: "서치엔진저널", pubDate: "2026-03-28", link: "https://news.google.com/search?q=%EA%B5%AC%EA%B8%80+SEO+2026&hl=ko", description: "구글의 2026년 첫 핵심 업데이트가 적용되었습니다. AI 생성 콘텐츠 평가 기준과 E-E-A-T 가중치 변화를 분석합니다.", thumb: "" },
    { title: "이메일 마케팅 부활, 오픈율 높이는 5가지 전략", source: "마케터스", pubDate: "2026-03-27", link: "https://news.google.com/search?q=%EC%9D%B4%EB%A9%94%EC%9D%BC+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "소셜미디어 알고리즘 변경으로 이메일 마케팅이 다시 주목받고 있습니다. 오픈율을 높이는 실전 전략을 소개합니다.", thumb: "" },
    { title: "네이버 블로그 SEO 가이드 2026년 업데이트", source: "블로그마케팅", pubDate: "2026-03-27", link: "https://news.google.com/search?q=%EB%84%A4%EC%9D%B4%EB%B2%84+%EB%B8%94%EB%A1%9C%EA%B7%B8+SEO&hl=ko", description: "네이버가 블로그 검색 알고리즘을 업데이트했습니다. C-Rank와 D.I.A. 로직의 최신 변경사항과 대응 전략을 알아봅니다.", thumb: "" },
  ],
  ai: [
    { title: "ChatGPT-5 출시, 마케팅 업무에 미치는 영향은?", source: "AI타임즈", pubDate: "2026-03-29", link: "https://news.google.com/search?q=AI+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "OpenAI가 ChatGPT-5를 공개했습니다. 마케팅 카피라이팅, 데이터 분석, 고객 응대 등 실무 활용도를 분석합니다.", thumb: "" },
    { title: "AI 이미지 생성 도구 비교: 마케터를 위한 가이드", source: "테크마케팅", pubDate: "2026-03-28", link: "https://news.google.com/search?q=AI+%EC%9D%B4%EB%AF%B8%EC%A7%80+%EC%83%9D%EC%84%B1&hl=ko", description: "Midjourney, DALL-E, Stable Diffusion 등 주요 AI 이미지 생성 도구의 마케팅 활용도를 비교합니다.", thumb: "" },
    { title: "생성형 AI로 광고 소재 제작, ROI 200% 향상 사례", source: "광고비즈니스", pubDate: "2026-03-27", link: "https://news.google.com/search?q=%EC%83%9D%EC%84%B1%ED%98%95+AI+%EA%B4%91%EA%B3%A0&hl=ko", description: "A/B 테스트 기반으로 AI 생성 광고 소재와 기존 소재의 성과를 비교한 결과, 놀라운 ROI 차이가 나타났습니다.", thumb: "" },
    { title: "AI 챗봇 마케팅, 전환율 3배 높이는 방법", source: "테크리뷰", pubDate: "2026-03-26", link: "https://news.google.com/search?q=AI+%EC%B1%97%EB%B4%87+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "AI 챗봇을 활용한 마케팅 자동화로 전환율을 크게 개선한 실제 사례와 구축 방법을 공유합니다.", thumb: "" },
  ],
  trend: [
    { title: "2026 상반기 마케팅 트렌드 리포트", source: "트렌드코리아", pubDate: "2026-03-29", link: "https://news.google.com/search?q=%EB%A7%88%EC%BC%80%ED%8C%85+%ED%8A%B8%EB%A0%8C%EB%93%9C+2026&hl=ko", description: "2026년 상반기를 지배할 마케팅 트렌드 5가지를 선정했습니다. 숏폼, AI, 커뮤니티 마케팅 등을 분석합니다.", thumb: "" },
    { title: "MZ세대가 떠나고 알파세대가 온다: 타겟 전환 전략", source: "마케팅인사이트", pubDate: "2026-03-28", link: "https://news.google.com/search?q=%EC%95%8C%ED%8C%8C%EC%84%B8%EB%8C%80+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "알파세대(2010년 이후 출생)가 소비 주체로 부상하면서, 마케팅 타겟 전략의 전환이 필요해지고 있습니다.", thumb: "" },
    { title: "유튜브 쇼츠 수익화 정책 변경 안내", source: "크리에이터경제", pubDate: "2026-03-27", link: "https://news.google.com/search?q=%EC%9C%A0%ED%8A%9C%EB%B8%8C+%EC%87%BC%EC%B8%A0+%EC%88%98%EC%9D%B5%ED%99%94&hl=ko", description: "유튜브가 쇼츠 크리에이터를 위한 새로운 수익화 모델을 발표했습니다. 조회수 기반에서 참여도 기반으로 전환됩니다.", thumb: "" },
    { title: "라이브커머스 시장 10조 돌파, 성공 전략은?", source: "이커머스트렌드", pubDate: "2026-03-26", link: "https://news.google.com/search?q=%EB%9D%BC%EC%9D%B4%EB%B8%8C%EC%BB%A4%EB%A8%B8%EC%8A%A4&hl=ko", description: "국내 라이브커머스 시장이 10조원을 돌파했습니다. 성공적인 라이브커머스 운영을 위한 핵심 전략을 알아봅니다.", thumb: "" },
  ],
  biz: [
    { title: "스타트업 마케팅, 적은 예산으로 최대 효과 내는 법", source: "스타트업위클리", pubDate: "2026-03-29", link: "https://news.google.com/search?q=%EC%8A%A4%ED%83%80%ED%8A%B8%EC%97%85+%EB%A7%88%EC%BC%80%ED%8C%85&hl=ko", description: "초기 스타트업이 제한된 예산으로 효과적인 마케팅을 하기 위한 실전 가이드를 제공합니다.", thumb: "" },
    { title: "D2C 브랜드 성공 사례, 자사몰 전환율 최적화", source: "브랜딩저널", pubDate: "2026-03-28", link: "https://news.google.com/search?q=D2C+%EB%B8%8C%EB%9E%9C%EB%93%9C&hl=ko", description: "D2C(Direct to Consumer) 브랜드들의 성공 비결과 자사몰 전환율을 높이는 구체적인 방법론을 분석합니다.", thumb: "" },
    { title: "퍼스널 브랜딩으로 매출 5배 올린 비결", source: "비즈니스인사이더", pubDate: "2026-03-27", link: "https://news.google.com/search?q=%ED%8D%BC%EC%8A%A4%EB%84%90+%EB%B8%8C%EB%9E%9C%EB%94%A9&hl=ko", description: "1인 사업자와 프리랜서를 위한 퍼스널 브랜딩 전략. SNS를 활용해 매출을 극적으로 늘린 실제 사례를 공유합니다.", thumb: "" },
    { title: "브랜딩 리뉴얼, 성공하는 리브랜딩의 조건", source: "디자인비즈", pubDate: "2026-03-26", link: "https://news.google.com/search?q=%EB%A6%AC%EB%B8%8C%EB%9E%9C%EB%94%A9&hl=ko", description: "기존 브랜드를 새롭게 탈바꿈하는 리브랜딩. 성공과 실패를 가르는 핵심 요소를 사례와 함께 분석합니다.", thumb: "" },
  ],
};

async function fetchSnsNewsByCategory(categoryId) {
  const cat = NEWS_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cat.query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    const r = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const data = await r.json();
    const xml = data.contents || "";
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const itemXml of itemMatches.slice(0, 15)) {
      const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
      const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "";
      const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || "";
      const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || "";
      const desc = (itemXml.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || "";
      const thumbMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
      const thumb = thumbMatch ? thumbMatch[1] : "";
      const decodeEntities = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
      const stripHtml = s => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
      const cleanTitle = stripHtml(decodeEntities(title));
      const cleanDesc = stripHtml(decodeEntities(desc));
      if (cleanTitle) {
        items.push({ title: cleanTitle, link, pubDate, source, description: cleanDesc, thumb });
      }
    }
    return items.length > 0 ? items : null;
  } catch { return null; }
}

// ── SNS 뉴스 피드 페이지 (네이버 뉴스 스타일) ──────────────────────────────
function SnsNewsFeed({ isDark, homeText, homeMuted, cardBdr, renderFooter }) {
  const text = homeText, muted = homeMuted, bdr = cardBdr;
  const bg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";
  const [activeTab, setActiveTab] = useState("sns");
  const [newsCache, setNewsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── 오늘의 SNS 브리핑 상태 ── */
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingHistory, setBriefingHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);

  const getTodayKey = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  /* 브리핑 히스토리 로드 */
  const loadBriefingHistory = () => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("nper_sns_briefing_")) {
        const dateStr = key.replace("nper_sns_briefing_", "");
        try {
          const data = JSON.parse(localStorage.getItem(key));
          items.push({ date: dateStr, ...data });
        } catch {}
      }
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    setBriefingHistory(items);
  };

  /* 브리핑 생성/로드 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todayKey = getTodayKey();
      const cacheKey = `nper_sns_briefing_${todayKey}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (!cancelled) { setBriefing(data); setBriefingLoading(false); }
          loadBriefingHistory();
          return;
        } catch {}
      }
      // AI로 브리핑 생성
      setBriefingLoading(true);
      try {
        const { callAI } = await import("./aiClient");
        const todayLabel = todayKey.replace(/-/g, ".");
        const result = await callAI("claude-haiku-4-5", [
          { role: "user", content: `오늘(${todayLabel}) 기준 SNS 마케팅 관련 주요 뉴스와 트렌드를 작성해줘.

형식:
## 1. [뉴스 제목]
[상세 내용 3~5문장. 구체적인 수치, 사례, 영향을 포함]
📎 관련 키워드: #키워드1 #키워드2

## 2. [뉴스 제목]
...

총 5~7개 항목. 각 항목마다:
- 제목은 ##로 시작
- 내용은 3~5문장으로 상세하게
- 관련 키워드는 📎로 시작하고 #으로 표시
- 가능하면 출처 언론사명 포함
마크다운 **볼드** 사용하지 마. 순수 텍스트로.` }
        ], 2500);
        const content = typeof result === "string" ? result : (result?.content || result?.text || "");
        if (!cancelled && content) {
          const data = { title: `${todayLabel} 엔퍼SNS브리핑`, content, date: todayKey };
          localStorage.setItem(cacheKey, JSON.stringify(data));
          setBriefing(data);
          // Supabase posts 테이블에도 자동 게시 시도
          try {
            const { supabase } = await import("./storage");
            if (supabase) {
              await supabase.from("posts").insert({
                id: `briefing_${todayKey}`,
                title: `📰 ${todayLabel} 엔퍼SNS브리핑`,
                content: content,
                author: "엔퍼 AI",
                author_uid: "system_ai",
                cat: "sns_briefing",
                tag: "",
                subCat: "sns_briefing",
                views: 0, likes: 0,
                created_at: new Date().toISOString(),
                images: [], comments: [],
              });
            }
          } catch (e) { /* briefing DB save may already exist */ }
        }
      } catch (e) {
        console.error("브리핑 생성 실패:", e);
      }
      if (!cancelled) { setBriefingLoading(false); loadBriefingHistory(); }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentNews = newsCache[activeTab] || [];

  const loadNews = async (tab, forceRefresh = false) => {
    setLoading(true); setError("");
    if (!forceRefresh && newsCache[tab]) { setLoading(false); return; }
    const items = await fetchSnsNewsByCategory(tab);
    if (items && items.length > 0) {
      setNewsCache(prev => ({ ...prev, [tab]: items }));
    } else {
      setNewsCache(prev => ({ ...prev, [tab]: FALLBACK_NEWS_BY_CATEGORY[tab] || [] }));
      setError("fallback");
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadNews(activeTab);
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [activeTab, refreshKey]);

  const handleRefresh = () => {
    setNewsCache(prev => { const next = { ...prev }; delete next[activeTab]; return next; });
    setRefreshKey(k => k + 1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diff = now - d;
      if (diff < 3600000) return `${Math.floor(diff/60000)}분 전`;
      if (diff < 86400000) return `${Math.floor(diff/3600000)}시간 전`;
      if (diff < 604800000) return `${Math.floor(diff/86400000)}일 전`;
      return d.toLocaleDateString("ko-KR", { month:"short", day:"numeric" });
    } catch { return dateStr; }
  };

  /* ── 브리핑 콘텐츠 파싱 렌더러 ── */
  // 인라인 마크다운 처리 헬퍼: **bold**, #tag
  const renderInlineMarkdown = (text, bodyColor, tagColor, tagBg) => {
    // **bold** 처리 + #tag 처리
    const parts = text.split(/(\*\*[^*]+\*\*|#[^\s#]+)/g).filter(Boolean);
    return parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={j} style={{ fontWeight: 800, color: bodyColor }}>{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith("#") && p.length > 1) {
        return (
          <span key={j} style={{
            display: "inline-block", fontSize: 12, fontWeight: 700, color: tagColor,
            background: tagBg, borderRadius: 20, padding: "2px 8px", marginLeft: 2, marginRight: 2,
          }}>
            {p}
          </span>
        );
      }
      return <span key={j}>{p}</span>;
    });
  };

  const renderBriefingContent = (content, isCard = false) => {
    if (!content) return null;
    const lines = content.split("\n");
    const accentBg = isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.10)";
    const headingColor = isCard ? (isDark ? "#e0d4ff" : "#fff") : text;
    const bodyColor = isCard ? (isDark ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.93)") : text;
    const tagColor = isCard ? (isDark ? "#c4b5fd" : "rgba(255,255,255,0.85)") : accent;
    const tagBg = isCard ? (isDark ? "rgba(124,106,255,0.25)" : "rgba(255,255,255,0.18)") : accentBg;

    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: 8 }} />;

      // ## 제목 또는 # 제목
      if (trimmed.startsWith("#")) {
        const titleText = trimmed.replace(/^#{1,3}\s*/, "");
        return (
          <div key={i} style={{
            fontSize: 17, fontWeight: 800, color: headingColor, marginTop: i === 0 ? 0 : 24, marginBottom: 6,
            letterSpacing: -0.3, lineHeight: 1.5,
          }}>
            {renderInlineMarkdown(titleText, headingColor, tagColor, tagBg)}
          </div>
        );
      }

      // 📎 키워드 줄
      if (trimmed.startsWith("📎")) {
        const parts = trimmed.replace(/^📎\s*/, "").split(/(#[^\s#]+)/g).filter(Boolean);
        return (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 4, alignItems: "center" }}>
            <span style={{ fontSize: 13, marginRight: 2 }}>📎</span>
            {parts.map((p, j) => {
              if (p.startsWith("#")) {
                return (
                  <span key={j} style={{
                    display: "inline-block", fontSize: 12, fontWeight: 700, color: tagColor,
                    background: tagBg, borderRadius: 20, padding: "3px 10px",
                  }}>
                    {p}
                  </span>
                );
              }
              const label = p.trim().replace(/:$/, "").trim();
              return label ? <span key={j} style={{ fontSize: 12, color: tagColor, opacity: 0.8 }}>{label}</span> : null;
            })}
          </div>
        );
      }

      // 일반 텍스트 (인라인 **bold** + #키워드 처리)
      return (
        <div key={i} style={{ fontSize: 14, lineHeight: 1.8, color: bodyColor, marginBottom: 2 }}>
          {renderInlineMarkdown(trimmed, bodyColor, tagColor, tagBg)}
        </div>
      );
    });
  };

  const ThumbPlaceholder = ({ category }) => {
    const gradients = {
      sns: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      digital: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      ai: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      trend: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      biz: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    };
    const labels = { sns: "SNS", digital: "DM", ai: "AI", trend: "T", biz: "BIZ" };
    return (
      <div style={{ width:80, minWidth:80, height:60, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
        background: gradients[category] || "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
        flexShrink:0, color:"#fff", fontSize:13, fontWeight:800, letterSpacing:0.5, textShadow:"0 1px 2px rgba(0,0,0,0.2)" }}>
        {labels[category] || "NEWS"}
      </div>
    );
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>

        {/* ══ 오늘의 SNS 브리핑 카드 ══ */}
        <div style={{
          marginBottom: 24, borderRadius: 16, overflow: "hidden",
          background: isDark
            ? "linear-gradient(135deg, rgba(124,106,255,0.18) 0%, rgba(99,102,241,0.12) 100%)"
            : "linear-gradient(135deg, #7c6aff 0%, #6366f1 40%, #818cf8 100%)",
          border: isDark ? "1px solid rgba(124,106,255,0.25)" : "none",
          boxShadow: isDark ? "none" : "0 4px 24px rgba(124,106,255,0.18)",
        }}>
          <div style={{ padding: "22px 24px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>📰</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: isDark ? "#c4b5fd" : "#fff", letterSpacing: -0.3 }}>
                {briefing ? briefing.title : `${getTodayKey().replace(/-/g, ".")} 엔퍼SNS브리핑`}
              </span>
            </div>
            {briefingLoading ? (
              <div style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.85)", fontSize: 14, padding: "16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                브리핑 작성 중...
              </div>
            ) : briefing ? (
              <div style={{ wordBreak: "break-word" }}>
                {renderBriefingContent(briefing.content, true)}
              </div>
            ) : (
              <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)", fontSize: 13 }}>
                브리핑을 불러올 수 없습니다.
              </div>
            )}
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <a href="/board" onClick={(e) => { e.preventDefault(); /* 커뮤니티 SNS브리핑 게시판으로 이동은 라우터에 따라 조정 */ }}
                style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? "#a5b4fc" : "rgba(255,255,255,0.9)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                전체 보기 <span style={{ fontSize: 14 }}>→</span>
              </a>
            </div>
          </div>
        </div>

        {/* ── 지난 브리핑 히스토리 ── */}
        {briefingHistory.length > 1 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: muted, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>📋</span> 지난 브리핑
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {briefingHistory.filter(h => h.date !== getTodayKey()).slice(0, 7).map(h => {
                const isExpanded = expandedHistory === h.date;
                const dateLabel = h.date.replace(/-/g, ".");
                return (
                  <div key={h.date}
                    onClick={() => setExpandedHistory(isExpanded ? null : h.date)}
                    style={{
                      padding: isExpanded ? "18px 20px" : "14px 18px", borderRadius: 14, cursor: "pointer", transition: "all 0.2s",
                      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1px solid ${isExpanded ? accent : bdr}`,
                      boxShadow: isExpanded ? `0 2px 12px rgba(124,106,255,0.12)` : "0 1px 4px rgba(0,0,0,0.04)",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          background: isDark ? "rgba(124,106,255,0.18)" : "rgba(124,106,255,0.08)",
                          borderRadius: 10, padding: "6px 12px", textAlign: "center", minWidth: 64,
                        }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: accent, lineHeight: 1.2 }}>{dateLabel.split(".").slice(1).join(".")}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: muted, marginTop: 1 }}>{dateLabel.split(".")[0]}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{h.title || `${dateLabel} 엔퍼SNS브리핑`}</div>
                          {!isExpanded && (
                            <div style={{ fontSize: 12, color: muted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                              {(h.content || "").replace(/^##\s*.*/gm, "").replace(/📎.*/gm, "").replace(/\n+/g, " ").trim().slice(0, 80)}...
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, color: muted, transition: "transform 0.2s",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}>▼</span>
                    </div>
                    {isExpanded && (
                      <div style={{
                        marginTop: 16, paddingTop: 16,
                        borderTop: `1px solid ${bdr}`,
                        wordBreak: "break-word",
                      }}>
                        {renderBriefingContent(h.content, false)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 헤더: 탭 + 새로고침 ── */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", borderBottom:`2px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e5e5f0"}`, marginBottom:20 }}>
          <div style={{ display:"flex", gap:0, overflowX:"auto", flex:1 }}>
            {NEWS_CATEGORIES.map(cat => {
              const isActive = activeTab === cat.id;
              return (
                <button key={cat.id} onClick={() => { setActiveTab(cat.id); setError(""); setHoveredIdx(-1); }}
                  style={{
                    padding:"12px 20px", border:"none", cursor:"pointer", fontSize:14, fontWeight: isActive ? 800 : 500,
                    color: isActive ? accent : muted, background:"transparent", whiteSpace:"nowrap",
                    borderBottom: isActive ? `2.5px solid ${accent}` : "2.5px solid transparent",
                    transition:"all 0.15s", marginBottom:-2, flexShrink:0,
                  }}>
                  {cat.label}
                </button>
              );
            })}
          </div>
          {/* 새로고침 버튼 */}
          <button onClick={handleRefresh} disabled={loading}
            style={{ padding:"8px 14px", marginBottom:4, border:`1px solid ${bdr}`, borderRadius:8, background:"transparent",
              color: loading ? muted : text, fontSize:12, fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s",
              opacity: loading ? 0.5 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2.5 11.5a10 10 0 0 1 17.56-5.5M21.5 12.5a10 10 0 0 1-17.56 5.5" />
            </svg>
            새로고침
          </button>
        </div>

        {/* ── RSS 실패 알림 ── */}
        {error === "fallback" && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, padding:"8px 14px", borderRadius:10,
            background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#f59e0b" }} />
            <span style={{ fontSize:11, color:"#f59e0b", fontWeight:600 }}>RSS 피드 연결 실패 - 추천 뉴스를 표시합니다</span>
          </div>
        )}

        {/* ── 로딩 ── */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
            <div style={{ width:40, height:40, border:`3px solid ${accent}30`, borderTopColor:accent, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
            <div style={{ fontSize:13 }}>뉴스 불러오는 중...</div>
          </div>
        ) : (
          /* ── 뉴스 목록 (네이버 뉴스 스타일) ── */
          <div style={{ background: bg, borderRadius:14, border:`1px solid ${bdr}`, overflow:"hidden" }}>
            {currentNews.map((item, i) => (
              <a key={i} href={item.link || undefined} target="_blank" rel="noopener noreferrer"
                onClick={e => { if (!item.link) e.preventDefault(); }}
                onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(-1)}
                style={{
                  textDecoration:"none", display:"flex", alignItems:"flex-start", gap:14,
                  padding:"14px 18px", cursor: item.link ? "pointer" : "default",
                  transition:"background 0.12s",
                  background: hoveredIdx === i ? (isDark ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)") : "transparent",
                  borderBottom: i < currentNews.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f0f0f5"}` : "none",
                }}>

                {/* 썸네일 (80x60) */}
                {item.thumb ? (
                  <img src={item.thumb} alt="" style={{ width:80, minWidth:80, height:60, borderRadius:8, objectFit:"cover", flexShrink:0,
                    background: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5" }}
                    onError={e => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"; }} />
                ) : null}
                {!item.thumb && <ThumbPlaceholder category={activeTab} />}

                {/* 기사 정보 */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:text, lineHeight:1.4, marginBottom:5,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div style={{ fontSize:13, color:muted, lineHeight:1.5, marginBottom:6,
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:muted }}>
                    {item.source && (
                      <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:4, fontWeight:700, fontSize:10,
                        background: isDark ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.07)",
                        color: isDark ? "rgba(180,170,255,0.9)" : "#6c5ce7" }}>
                        {item.source}
                      </span>
                    )}
                    {item.pubDate && <span style={{ color: isDark ? "rgba(255,255,255,0.35)" : "#aaa" }}>{formatDate(item.pubDate)}</span>}
                  </div>
                </div>
              </a>
            ))}
            {currentNews.length === 0 && !loading && (
              <div style={{ textAlign:"center", padding:"40px 0", color:muted, fontSize:13 }}>
                이 카테고리의 뉴스를 불러올 수 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
      {renderFooter && renderFooter()}
    </div>
  );
}

export { PromptStudioPage, SnsNewsFeed };
