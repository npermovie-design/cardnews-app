import { useState, useRef } from "react";
import { callClaude } from "./aiClient";
import PptxGenJS from "pptxgenjs";

/* ═══════════════════════════════════════════════════════════
   PptGenerator - AI PPT 슬라이드 제작기
═══════════════════════════════════════════════════════════ */

const THEMES = [
  { id:"dark",    label:"다크",     bg:"#1a1a2e", text:"#ffffff", accent:"#7c6aff", sub:"#a5b4fc", body:"#cccccc" },
  { id:"light",   label:"라이트",   bg:"#ffffff", text:"#1a1a2e", accent:"#4f46e5", sub:"#6366f1", body:"#444444" },
  { id:"navy",    label:"네이비",   bg:"#0f172a", text:"#f1f5f9", accent:"#38bdf8", sub:"#7dd3fc", body:"#94a3b8" },
  { id:"green",   label:"그린",     bg:"#052e16", text:"#f0fdf4", accent:"#4ade80", sub:"#86efac", body:"#a7f3d0" },
  { id:"warm",    label:"웜톤",     bg:"#fef3c7", text:"#78350f", accent:"#f59e0b", sub:"#d97706", body:"#92400e" },
  { id:"minimal", label:"미니멀",   bg:"#f8fafc", text:"#0f172a", accent:"#334155", sub:"#64748b", body:"#475569" },
];

const LAYOUTS = [
  { id:"title_body",  label:"제목 + 본문" },
  { id:"title_only",  label:"제목만 (강조)" },
  { id:"two_column",  label:"2단 레이아웃" },
  { id:"bullets",     label:"불릿 리스트" },
  { id:"quote",       label:"인용/강조 문구" },
  { id:"section",     label:"섹션 구분" },
];

function parseSlides(raw) {
  const cleaned = raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(cleaned).slides; } catch {}
  const m = cleaned.match(/"slides"\s*:\s*(\[[\s\S]*\])/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

export default function PptGenerator({ isDark, user, onLoginRequest, onUserUpdate }) {
  const D = isDark;
  const accent = "#7c6aff";
  const text  = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr   = D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const bg    = D ? "rgba(255,255,255,0.04)" : "#fff";
  const ibg   = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";

  const [step, setStep]       = useState("input"); // input | loading | edit
  const [topic, setTopic]     = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [themeId, setThemeId] = useState("dark");
  const [slides, setSlides]   = useState([]);
  const [selIdx, setSelIdx]   = useState(0);
  const [err, setErr]         = useState("");
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  const theme = THEMES.find(t=>t.id===themeId) || THEMES[0];
  const inp = { width:"100%", padding:"12px 16px", borderRadius:10, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const EXAMPLES = [
    "AI SaaS 스타트업 투자유치 IR 자료",
    "2026년 마케팅 전략 발표",
    "신제품 런칭 사업 계획서",
    "팀 프로젝트 중간 발표",
    "디자인 시스템 도입 제안",
    "분기별 실적 보고",
  ];

  // AI 슬라이드 생성
  const generate = async () => {
    if (!topic.trim()) { setErr("주제를 입력해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    setStep("loading"); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    try {
      const r = await callClaude(
`PPT 슬라이드 기획 전문가입니다.

주제: ${topic}
슬라이드 수: ${slideCount}장

각 슬라이드를 JSON으로 작성하세요. 이모지 사용 금지.

JSON만 응답:
{"slides":[
  {"title":"슬라이드 제목","body":"본문 내용 (줄바꿈은 \\n)","layout":"${LAYOUTS.map(l=>l.id).join("|")}","bullets":["항목1","항목2"],"note":"발표 노트"}
]}

규칙:
- 1번 슬라이드: 표지 (layout: title_only)
- 마지막 슬라이드: 감사/Q&A (layout: title_only)
- 중간: title_body, bullets, two_column, quote, section 적절히 배합
- bullets 배열은 layout이 bullets일 때만 채움 (3~6개)
- body는 2~4줄, 간결하고 전문적으로
- note는 발표자 참고용 스크립트 (1~2문장)
- 실무에서 바로 사용 가능한 수준`, slideCount * 300);

      const parsed = parseSlides(r);
      if (!parsed?.length) throw new Error("슬라이드를 파싱할 수 없습니다.");
      setSlides(parsed.map((s,i) => ({ ...s, id:i, layout:s.layout||"title_body" })));
      setSelIdx(0);
      setStep("edit");
      // 포인트 차감
      if (user && onUserUpdate) {
        try {
          const { changePoints } = await import("./storage");
          const newPts = await changePoints(user.uid, -10, "PPT 생성");
          if (newPts !== null) onUserUpdate({ ...user, points: newPts });
        } catch {}
      }
    } catch (e) { setErr("생성 실패: " + (e.message || "다시 시도해주세요.")); setStep("input"); }
    finally { window.__isGenerating = false; }
  };

  // PPTX 내보내기
  const exportPptx = async () => {
    setExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.defineLayout({ name:"WIDE", width:13.33, height:7.5 });

      slides.forEach((s, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: theme.bg.replace("#","") };

        // 하단 악센트 라인
        slide.addShape(pptx.ShapeType.rect, { x:0, y:7.1, w:13.33, h:0.4, fill:{ color:theme.accent.replace("#","") } });

        const layout = s.layout || "title_body";

        if (layout === "title_only" || layout === "section") {
          // 표지/섹션 - 중앙 큰 제목
          slide.addText(s.title || "", {
            x:1, y:2.2, w:11.33, h:2, fontSize:40, fontFace:"Malgun Gothic",
            color:theme.text.replace("#",""), bold:true, align:"center", valign:"middle",
          });
          if (s.body) {
            slide.addText(s.body.replace(/\\n/g,"\n"), {
              x:2, y:4.2, w:9.33, h:1.5, fontSize:18, fontFace:"Malgun Gothic",
              color:theme.sub.replace("#",""), align:"center", valign:"top",
            });
          }
        } else if (layout === "bullets") {
          slide.addText(s.title || "", {
            x:0.8, y:0.5, w:11.73, h:1, fontSize:28, fontFace:"Malgun Gothic",
            color:theme.text.replace("#",""), bold:true,
          });
          slide.addShape(pptx.ShapeType.rect, { x:0.8, y:1.5, w:2, h:0.06, fill:{ color:theme.accent.replace("#","") } });
          const bullets = (s.bullets || []).map(b => ({ text:b, options:{ fontSize:18, color:theme.body.replace("#",""), fontFace:"Malgun Gothic", bullet:{ code:"2022" }, paraSpaceAfter:8 } }));
          if (bullets.length) {
            slide.addText(bullets, { x:1, y:2, w:10.5, h:4.5, valign:"top" });
          }
        } else if (layout === "two_column") {
          slide.addText(s.title || "", {
            x:0.8, y:0.5, w:11.73, h:1, fontSize:28, fontFace:"Malgun Gothic",
            color:theme.text.replace("#",""), bold:true,
          });
          slide.addShape(pptx.ShapeType.rect, { x:0.8, y:1.5, w:2, h:0.06, fill:{ color:theme.accent.replace("#","") } });
          const bodyText = (s.body || "").replace(/\\n/g,"\n");
          const half = Math.ceil(bodyText.length / 2);
          const left = bodyText.slice(0, half);
          const right = bodyText.slice(half);
          slide.addText(left, { x:0.8, y:2, w:5.5, h:4.5, fontSize:16, fontFace:"Malgun Gothic", color:theme.body.replace("#",""), valign:"top" });
          slide.addText(right, { x:7, y:2, w:5.5, h:4.5, fontSize:16, fontFace:"Malgun Gothic", color:theme.body.replace("#",""), valign:"top" });
        } else if (layout === "quote") {
          slide.addShape(pptx.ShapeType.rect, { x:1.5, y:2, w:0.12, h:3, fill:{ color:theme.accent.replace("#","") } });
          slide.addText(s.title || "", {
            x:2.2, y:2.2, w:9, h:2, fontSize:26, fontFace:"Malgun Gothic",
            color:theme.text.replace("#",""), italic:true, valign:"top",
          });
          if (s.body) {
            slide.addText(s.body.replace(/\\n/g,"\n"), {
              x:2.2, y:4.5, w:9, h:1.5, fontSize:16, fontFace:"Malgun Gothic",
              color:theme.sub.replace("#",""), valign:"top",
            });
          }
        } else {
          // title_body (기본)
          slide.addText(s.title || "", {
            x:0.8, y:0.5, w:11.73, h:1, fontSize:28, fontFace:"Malgun Gothic",
            color:theme.text.replace("#",""), bold:true,
          });
          slide.addShape(pptx.ShapeType.rect, { x:0.8, y:1.5, w:2, h:0.06, fill:{ color:theme.accent.replace("#","") } });
          if (s.body) {
            slide.addText(s.body.replace(/\\n/g,"\n"), {
              x:0.8, y:2, w:11.73, h:4.5, fontSize:18, fontFace:"Malgun Gothic",
              color:theme.body.replace("#",""), valign:"top", lineSpacing:28,
            });
          }
        }

        // 슬라이드 번호
        if (i > 0) {
          slide.addText(String(i + 1), {
            x:12.3, y:6.8, w:0.8, h:0.4, fontSize:10, fontFace:"Malgun Gothic",
            color:theme.sub.replace("#",""), align:"right",
          });
        }

        // 발표 노트
        if (s.note) slide.addNotes(s.note);
      });

      const fileName = `${(topic||"PPT").replace(/[^가-힣a-zA-Z0-9\s]/g,"").trim().slice(0,30)}.pptx`;
      await pptx.writeFile({ fileName });
    } catch (e) { setErr("PPTX 내보내기 실패: " + e.message); }
    setExporting(false);
  };

  const cur = slides[selIdx] || {};
  const updateSlide = (key, val) => {
    setSlides(prev => { const n = [...prev]; n[selIdx] = { ...n[selIdx], [key]: val }; return n; });
  };

  // ── 미리보기 렌더 ──
  const renderPreview = (s, idx) => {
    const layout = s.layout || "title_body";
    const isTitle = layout === "title_only" || layout === "section";
    return (
      <div style={{ width:"100%", aspectRatio:"16/9", background:theme.bg, borderRadius:8, overflow:"hidden", position:"relative", display:"flex", flexDirection:"column" }}>
        {/* 악센트 라인 */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"5%", background:theme.accent }} />

        {isTitle ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8%" }}>
            <div style={{ fontSize:"clamp(14px,2.5vw,28px)", fontWeight:900, color:theme.text, textAlign:"center", lineHeight:1.4, marginBottom:12 }}>{s.title||"제목"}</div>
            {s.body && <div style={{ fontSize:"clamp(10px,1.3vw,16px)", color:theme.sub, textAlign:"center", lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
          </div>
        ) : layout === "quote" ? (
          <div style={{ flex:1, display:"flex", padding:"6% 8%", gap:"3%" }}>
            <div style={{ width:4, background:theme.accent, borderRadius:2, flexShrink:0 }} />
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ fontSize:"clamp(12px,2vw,22px)", fontWeight:700, color:theme.text, fontStyle:"italic", lineHeight:1.5, marginBottom:8 }}>{s.title||""}</div>
              {s.body && <div style={{ fontSize:"clamp(9px,1.1vw,14px)", color:theme.sub, lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
            </div>
          </div>
        ) : (
          <div style={{ flex:1, padding:"5% 6%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:"clamp(12px,2vw,22px)", fontWeight:800, color:theme.text, marginBottom:6 }}>{s.title||"제목"}</div>
            <div style={{ width:40, height:3, background:theme.accent, borderRadius:2, marginBottom:12 }} />
            {layout === "bullets" && s.bullets?.length > 0 ? (
              <div style={{ flex:1 }}>
                {s.bullets.map((b,j) => (
                  <div key={j} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:theme.accent, marginTop:6, flexShrink:0 }} />
                    <div style={{ fontSize:"clamp(9px,1.1vw,14px)", color:theme.body, lineHeight:1.6 }}>{b}</div>
                  </div>
                ))}
              </div>
            ) : layout === "two_column" ? (
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ fontSize:"clamp(9px,1vw,13px)", color:theme.body, lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n").slice(0, Math.ceil((s.body||"").length/2))}</div>
                <div style={{ fontSize:"clamp(9px,1vw,13px)", color:theme.body, lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n").slice(Math.ceil((s.body||"").length/2))}</div>
              </div>
            ) : (
              <div style={{ flex:1, fontSize:"clamp(9px,1.2vw,15px)", color:theme.body, lineHeight:1.8, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>
            )}
          </div>
        )}

        {/* 슬라이드 번호 */}
        {idx > 0 && <div style={{ position:"absolute", bottom:"7%", right:"4%", fontSize:9, color:theme.sub }}>{idx+1}</div>}
      </div>
    );
  };

  // ══ INPUT ══
  if (step === "input") return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>PPT 제작</div>
          <div style={{ fontSize:14, color:muted }}>주제를 입력하면 AI가 발표 슬라이드를 만들어드립니다.</div>
        </div>

        <div style={{ borderRadius:14, border:`1.5px solid ${accent}30`, background:bg, padding:"18px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>발표 주제</div>
          <textarea value={topic} onChange={e=>{setTopic(e.target.value);setErr("");}}
            style={{ ...inp, minHeight:80, resize:"vertical", lineHeight:1.8, border:"none", background:"transparent", padding:0 }}
            placeholder="예: AI SaaS 스타트업 투자유치 IR 자료" />
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
          {EXAMPLES.map((ex,i) => (
            <button key={i} onClick={()=>setTopic(ex)}
              style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:bg, color:muted, fontSize:11, cursor:"pointer" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>
              {ex}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>슬라이드 수</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="range" min={5} max={20} value={slideCount} onChange={e=>setSlideCount(Number(e.target.value))} style={{ flex:1, accentColor:accent }} />
              <span style={{ fontSize:16, fontWeight:900, color:accent, minWidth:30, textAlign:"right" }}>{slideCount}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>테마</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={()=>setThemeId(t.id)}
                  style={{ padding:"6px 4px", borderRadius:7, border:`1.5px solid ${themeId===t.id?accent:bdr}`, cursor:"pointer", textAlign:"center",
                    background:themeId===t.id?`${accent}12`:"transparent" }}>
                  <div style={{ display:"flex", gap:2, justifyContent:"center", marginBottom:3 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:t.bg, border:"1px solid rgba(128,128,128,0.3)" }} />
                    <div style={{ width:10, height:10, borderRadius:3, background:t.accent }} />
                  </div>
                  <div style={{ fontSize:10, fontWeight:themeId===t.id?700:400, color:themeId===t.id?accent:muted }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

        <button onClick={generate} disabled={!topic.trim()}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:topic.trim()?"pointer":"not-allowed",
            background:topic.trim()?accent:"rgba(128,128,128,0.2)", color:"#fff", fontSize:16, fontWeight:900, opacity:topic.trim()?1:0.5 }}>
          AI PPT 생성 (10P)
        </button>
      </div>
    </div>
  );

  // ══ LOADING ══
  if (step === "loading") return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:900, color:accent, marginBottom:12 }}>PPT 슬라이드 생성 중</div>
        <div style={{ width:280, height:5, borderRadius:3, background:"rgba(128,128,128,0.12)", overflow:"hidden", margin:"0 auto 16px" }}>
          <div style={{ height:"100%", borderRadius:3, background:accent, animation:"ai-progress 12s ease-out forwards" }} />
        </div>
        <div style={{ fontSize:13, color:muted }}>{slideCount}장 슬라이드 기획 중...</div>
      </div>
    </div>
  );

  // ══ EDIT ══
  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden", background:D?"transparent":"#f4f4f8" }}>
      {/* 왼쪽: 슬라이드 목록 */}
      <div style={{ width:160, flexShrink:0, borderRight:`1px solid ${bdr}`, overflowY:"auto", padding:"12px 8px", background:D?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)" }}>
        {slides.map((s,i) => (
          <div key={i} onClick={()=>setSelIdx(i)}
            style={{ marginBottom:8, cursor:"pointer", borderRadius:8, border:selIdx===i?`2px solid ${accent}`:`2px solid transparent`,
              overflow:"hidden", opacity:selIdx===i?1:0.7, transition:"all 0.12s" }}>
            <div style={{ transform:"scale(1)", transformOrigin:"top left" }}>
              {renderPreview(s, i)}
            </div>
            <div style={{ padding:"4px 6px", fontSize:9, fontWeight:selIdx===i?700:400, color:selIdx===i?accent:muted, textAlign:"center",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {i+1}. {s.title?.slice(0,15)||"슬라이드"}
            </div>
          </div>
        ))}
        <button onClick={()=>{
          setSlides(prev=>[...prev,{ id:prev.length, title:"새 슬라이드", body:"", layout:"title_body", bullets:[], note:"" }]);
          setSelIdx(slides.length);
        }} style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:10, fontWeight:700, cursor:"pointer" }}>
          + 슬라이드 추가
        </button>
      </div>

      {/* 가운데: 미리보기 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* 상단 바 */}
        <div style={{ padding:"10px 16px", borderBottom:`1px solid ${bdr}`, display:"flex", alignItems:"center", gap:8, flexShrink:0, background:D?"rgba(0,0,0,0.15)":"rgba(249,250,251,0.8)" }}>
          <button onClick={()=>{setStep("input");setSlides([]);}} style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>← 처음으로</button>
          <div style={{ flex:1, fontSize:13, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{topic}</div>
          <div style={{ fontSize:11, color:muted }}>{slides.length}장</div>
          <button onClick={exportPptx} disabled={exporting}
            style={{ padding:"7px 18px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:800, cursor:exporting?"not-allowed":"pointer", opacity:exporting?0.6:1 }}>
            {exporting ? "내보내는 중..." : "PPTX 다운로드"}
          </button>
        </div>

        {/* 메인 프리뷰 */}
        <div ref={previewRef} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24, overflow:"auto" }}>
          <div style={{ width:"100%", maxWidth:800, boxShadow:D?"0 8px 40px rgba(0,0,0,0.5)":"0 8px 40px rgba(0,0,0,0.1)", borderRadius:12, overflow:"hidden" }}>
            {renderPreview(cur, selIdx)}
          </div>
        </div>

        {/* 하단 네비 */}
        <div style={{ padding:"10px 16px", borderTop:`1px solid ${bdr}`, display:"flex", alignItems:"center", justifyContent:"center", gap:12, flexShrink:0 }}>
          <button onClick={()=>setSelIdx(Math.max(0,selIdx-1))} disabled={selIdx===0}
            style={{ padding:"6px 16px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:selIdx===0?muted:text, fontSize:12, cursor:selIdx===0?"not-allowed":"pointer" }}>이전</button>
          <span style={{ fontSize:13, fontWeight:700, color:text }}>{selIdx+1} / {slides.length}</span>
          <button onClick={()=>setSelIdx(Math.min(slides.length-1,selIdx+1))} disabled={selIdx>=slides.length-1}
            style={{ padding:"6px 16px", borderRadius:7, border:`1px solid ${bdr}`, background:"transparent", color:selIdx>=slides.length-1?muted:text, fontSize:12, cursor:selIdx>=slides.length-1?"not-allowed":"pointer" }}>다음</button>
        </div>
      </div>

      {/* 오른쪽: 편집 패널 */}
      <div style={{ width:260, flexShrink:0, borderLeft:`1px solid ${bdr}`, overflowY:"auto", padding:"14px 12px", background:D?"rgba(0,0,0,0.1)":"rgba(0,0,0,0.01)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:text, marginBottom:12 }}>슬라이드 편집</div>

        {/* 레이아웃 */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>레이아웃</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
            {LAYOUTS.map(l => (
              <button key={l.id} onClick={()=>updateSlide("layout",l.id)}
                style={{ padding:"6px 4px", borderRadius:6, border:`1px solid ${cur.layout===l.id?accent:bdr}`,
                  background:cur.layout===l.id?`${accent}12`:"transparent", color:cur.layout===l.id?accent:muted,
                  fontSize:10, fontWeight:cur.layout===l.id?700:400, cursor:"pointer" }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>제목</div>
          <input value={cur.title||""} onChange={e=>updateSlide("title",e.target.value)}
            style={{ ...inp, fontSize:13, padding:"8px 12px" }} />
        </div>

        {/* 본문 */}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>본문</div>
          <textarea value={(cur.body||"").replace(/\\n/g,"\n")} onChange={e=>updateSlide("body",e.target.value)}
            rows={4} style={{ ...inp, fontSize:12, padding:"8px 12px", resize:"vertical", lineHeight:1.7 }} />
        </div>

        {/* 불릿 (bullets 레이아웃일 때) */}
        {cur.layout === "bullets" && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>불릿 항목</div>
            {(cur.bullets||[]).map((b,j) => (
              <div key={j} style={{ display:"flex", gap:4, marginBottom:4 }}>
                <input value={b} onChange={e=>{
                  const nb = [...(cur.bullets||[])]; nb[j] = e.target.value;
                  updateSlide("bullets", nb);
                }} style={{ ...inp, fontSize:11, padding:"6px 10px", flex:1 }} />
                <button onClick={()=>{ const nb = (cur.bullets||[]).filter((_,k)=>k!==j); updateSlide("bullets",nb); }}
                  style={{ padding:"4px 8px", borderRadius:5, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>x</button>
              </div>
            ))}
            <button onClick={()=>updateSlide("bullets",[...(cur.bullets||[]),""])}
              style={{ width:"100%", padding:"5px", borderRadius:6, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:10, cursor:"pointer" }}>+ 항목 추가</button>
          </div>
        )}

        {/* 발표 노트 */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:4 }}>발표 노트</div>
          <textarea value={cur.note||""} onChange={e=>updateSlide("note",e.target.value)}
            rows={2} style={{ ...inp, fontSize:11, padding:"8px 12px", resize:"vertical" }} placeholder="발표자 참고용 메모" />
        </div>

        {/* 테마 변경 */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>테마</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
            {THEMES.map(t => (
              <button key={t.id} onClick={()=>setThemeId(t.id)}
                style={{ padding:"5px", borderRadius:6, border:`1px solid ${themeId===t.id?accent:bdr}`, cursor:"pointer", background:themeId===t.id?`${accent}10`:"transparent" }}>
                <div style={{ display:"flex", gap:2, justifyContent:"center", marginBottom:2 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:t.bg, border:"1px solid rgba(128,128,128,0.3)" }} />
                  <div style={{ width:8, height:8, borderRadius:2, background:t.accent }} />
                </div>
                <div style={{ fontSize:9, color:themeId===t.id?accent:muted }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 슬라이드 삭제 */}
        {slides.length > 1 && (
          <button onClick={()=>{
            setSlides(prev=>prev.filter((_,i)=>i!==selIdx));
            setSelIdx(Math.max(0,selIdx-1));
          }} style={{ width:"100%", padding:"8px", borderRadius:8, border:"1px solid rgba(239,68,68,0.15)", background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>
            이 슬라이드 삭제
          </button>
        )}
      </div>

      {err && <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", padding:"10px 20px", borderRadius:10, background:"rgba(239,68,68,0.9)", color:"#fff", fontSize:13, zIndex:9999 }}>{err}</div>}
    </div>
  );
}
