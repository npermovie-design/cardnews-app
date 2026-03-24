import { useState, useRef } from "react";
import { callClaude } from "./aiClient";
import PptxGenJS from "pptxgenjs";

/* ═══════════════════════════════════════════════════════════
   PptGenerator v2 - AI PPT 제작 (디자인 다양화 + 이미지/아이콘)
═══════════════════════════════════════════════════════════ */

const THEMES = [
  { id:"dark",     label:"다크",     bg:"#1a1a2e", bg2:"#16132b", text:"#ffffff", accent:"#7c6aff", sub:"#a5b4fc", body:"#cccccc", card:"#252040" },
  { id:"light",    label:"라이트",   bg:"#ffffff", bg2:"#f8f9fa", text:"#1a1a2e", accent:"#4f46e5", sub:"#6366f1", body:"#444444", card:"#f1f5f9" },
  { id:"navy",     label:"네이비",   bg:"#0f172a", bg2:"#1e293b", text:"#f1f5f9", accent:"#38bdf8", sub:"#7dd3fc", body:"#94a3b8", card:"#1e293b" },
  { id:"green",    label:"그린",     bg:"#052e16", bg2:"#14532d", text:"#f0fdf4", accent:"#4ade80", sub:"#86efac", body:"#a7f3d0", card:"#14532d" },
  { id:"warm",     label:"웜톤",     bg:"#fffbeb", bg2:"#fef3c7", text:"#78350f", accent:"#f59e0b", sub:"#d97706", body:"#92400e", card:"#fef3c7" },
  { id:"minimal",  label:"미니멀",   bg:"#f8fafc", bg2:"#e2e8f0", text:"#0f172a", accent:"#334155", sub:"#64748b", body:"#475569", card:"#e2e8f0" },
  { id:"coral",    label:"코랄",     bg:"#1c1917", bg2:"#292524", text:"#fef2f2", accent:"#f87171", sub:"#fca5a5", body:"#d6d3d1", card:"#292524" },
  { id:"purple",   label:"퍼플",     bg:"#2e1065", bg2:"#3b0764", text:"#f5f3ff", accent:"#c084fc", sub:"#d8b4fe", body:"#c4b5fd", card:"#3b0764" },
  { id:"ocean",    label:"오션",     bg:"#0c4a6e", bg2:"#075985", text:"#f0f9ff", accent:"#22d3ee", sub:"#67e8f9", body:"#a5f3fc", card:"#075985" },
];

const LAYOUTS = [
  { id:"title_only",     label:"표지/강조",    icon:"[ T ]" },
  { id:"title_body",     label:"제목+본문",    icon:"[T+B]" },
  { id:"bullets",        label:"불릿 리스트",   icon:"[. .]" },
  { id:"two_column",     label:"2단 컬럼",     icon:"[| |]" },
  { id:"image_right",    label:"이미지 오른쪽", icon:"[T|I]" },
  { id:"image_left",     label:"이미지 왼쪽",   icon:"[I|T]" },
  { id:"image_full",     label:"전체 이미지",   icon:"[IMG]" },
  { id:"quote",          label:"인용/강조",     icon:"[ \" ]" },
  { id:"section",        label:"섹션 구분",     icon:"[---]" },
  { id:"stats",          label:"숫자/통계",     icon:"[123]" },
  { id:"comparison",     label:"비교 (좌우)",   icon:"[vs ]" },
  { id:"timeline",       label:"타임라인",      icon:"[>>>]" },
];

const ICONS_MAP = {
  check:"✓", arrow:"→", star:"★", heart:"♥", bulb:"💡", target:"◎",
  chart:"📊", people:"👥", rocket:"🚀", gear:"⚙", lock:"🔒", globe:"🌐",
  money:"💰", clock:"⏱", flag:"🏁", pin:"📌", book:"📖", mail:"✉",
  phone:"📱", cloud:"☁", fire:"🔥", diamond:"◆", circle:"●", square:"■",
};

function parseSlides(raw) {
  const cleaned = raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(cleaned).slides; } catch {}
  const m = cleaned.match(/"slides"\s*:\s*(\[[\s\S]*?\])\s*\}/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  try {
    const arr = cleaned.match(/\[[\s\S]*\]/);
    if (arr) return JSON.parse(arr[0]);
  } catch {}
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

  const [step, setStep]       = useState("input");
  const [topic, setTopic]     = useState("");
  const [detail, setDetail]   = useState("");
  const [slideCount, setSlideCount] = useState(12);
  const [themeId, setThemeId] = useState("dark");
  const [slides, setSlides]   = useState([]);
  const [selIdx, setSelIdx]   = useState(0);
  const [err, setErr]         = useState("");
  const [exporting, setExporting] = useState(false);
  const [editTab, setEditTab] = useState("content");
  const [aiSlideLoading, setAiSlideLoading] = useState(false);
  const imgRef = useRef(null);

  const theme = THEMES.find(t=>t.id===themeId) || THEMES[0];
  const inp = { width:"100%", padding:"10px 14px", borderRadius:9, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  const EXAMPLES = [
    "AI SaaS 스타트업 시리즈A 투자유치 IR",
    "2026년 디지털 마케팅 전략 발표",
    "신제품 런칭 Go-to-Market 전략",
    "팀 프로젝트 중간보고 발표",
    "디자인 시스템 도입 제안서",
    "분기별 매출 실적 보고",
    "회사 소개서 (Company Profile)",
    "UX 리서치 결과 공유",
  ];

  // ── AI 생성 ──
  const generate = async () => {
    if (!topic.trim()) { setErr("주제를 입력해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    setStep("loading"); setErr("");
    window.__isGenerating = true; window.__generatingCost = 10;
    try {
      const r = await callClaude(
`PPT 슬라이드 전문 기획자. 이모지 사용 금지.

[주제] ${topic}
${detail ? `[상세 요구사항]\n${detail}\n` : ""}
[슬라이드 수] ${slideCount}장

사용 가능한 레이아웃: ${LAYOUTS.map(l=>l.id).join(", ")}

각 슬라이드를 상세하게 기획하세요:
- title: 슬라이드 제목
- subtitle: 부제목 (선택)
- body: 본문 (줄바꿈은 \\n)
- bullets: 불릿 항목 배열 (bullets/stats 레이아웃일 때)
- layout: 레이아웃 ID
- icon: 슬라이드 대표 아이콘 키 (${Object.keys(ICONS_MAP).join(",")}) 중 1개
- stats: 통계 배열 [{value:"85%",label:"고객 만족도"}] (stats 레이아웃일 때)
- leftCol/rightCol: 2단/비교 레이아웃의 좌우 텍스트
- note: 발표자 노트 (2~3문장)

기획 규칙:
1. 1번 슬라이드: 표지 (title_only) - 주제 + 발표자/날짜 placeholder
2. 2번: 목차/어젠다 (bullets) - 전체 발표 흐름 요약
3. 중간: 내용에 맞게 다양한 레이아웃을 배합
   - 핵심 수치가 있으면 stats 레이아웃
   - 비교할 내용이 있으면 comparison 레이아웃
   - 단계/과정은 timeline 레이아웃
   - 중간중간 section으로 파트 구분
   - quote로 핵심 메시지 강조
4. 마지막 2번째: 요약/핵심 정리
5. 마지막: Q&A/감사 (title_only)
6. body는 핵심 내용을 구체적으로 (숫자, 사례, 근거 포함)
7. 각 슬라이드가 논리적으로 연결되게 구성

JSON만 응답: {"slides":[...]}`, Math.max(slideCount * 350, 4000));

      const parsed = parseSlides(r);
      if (!parsed?.length) throw new Error("슬라이드 파싱 실패");
      setSlides(parsed.map((s,i) => ({
        ...s, id:i, layout:s.layout||"title_body",
        icon:s.icon||"", image:null, imageSize:50,
        titleSize:null, bodySize:null,
        stats:s.stats||[], leftCol:s.leftCol||"", rightCol:s.rightCol||"",
      })));
      setSelIdx(0);
      setStep("edit");
      if (user && onUserUpdate) {
        try {
          const { changePoints } = await import("./storage");
          const newPts = await changePoints(user.uid, -10, "PPT 생성");
          if (newPts !== null) onUserUpdate({ ...user, points: newPts });
        } catch {}
      }
    } catch (e) { setErr("생성 실패: " + (e.message||"")); setStep("input"); }
    finally { window.__isGenerating = false; }
  };

  // ── PPTX 내보내기 ──
  const exportPptx = async () => {
    setExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name:"W", width:13.33, height:7.5 });
      pptx.layout = "W";
      const c = k => (theme[k]||"#000").replace("#","");

      slides.forEach((s, i) => {
        const slide = pptx.addSlide();
        const lay = s.layout||"title_body";
        slide.background = { color:c("bg") };

        // 악센트 바
        if (lay === "section") {
          slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{ color:c("accent") } });
          slide.addText(s.title||"", { x:1.5, y:2.5, w:10, h:2.5, fontSize:38, fontFace:"Malgun Gothic", color:c("bg"), bold:true, align:"center", valign:"middle" });
          if (s.subtitle) slide.addText(s.subtitle, { x:2, y:5, w:9, h:1, fontSize:18, fontFace:"Malgun Gothic", color:c("bg"), align:"center" });
        } else {
          slide.addShape(pptx.ShapeType.rect, { x:0, y:7.1, w:13.33, h:0.4, fill:{ color:c("accent") } });

          if (lay === "title_only") {
            slide.addText(s.title||"", { x:1, y:1.8, w:11.33, h:2.5, fontSize:40, fontFace:"Malgun Gothic", color:c("text"), bold:true, align:"center", valign:"middle" });
            if (s.subtitle) slide.addText(s.subtitle, { x:2, y:4.3, w:9.33, h:1, fontSize:20, fontFace:"Malgun Gothic", color:c("sub"), align:"center" });
            if (s.body) slide.addText(s.body.replace(/\\n/g,"\n"), { x:2, y:5.2, w:9.33, h:1.5, fontSize:16, fontFace:"Malgun Gothic", color:c("body"), align:"center" });
          } else if (lay === "stats") {
            slide.addText(s.title||"", { x:0.8, y:0.4, w:11.73, h:0.9, fontSize:26, fontFace:"Malgun Gothic", color:c("text"), bold:true });
            slide.addShape(pptx.ShapeType.rect, { x:0.8, y:1.3, w:1.8, h:0.05, fill:{ color:c("accent") } });
            const st = s.stats||[];
            const cols = Math.min(st.length, 4);
            const cw = 11 / Math.max(cols,1);
            st.slice(0,4).forEach((item,j) => {
              const x = 1 + j * cw;
              slide.addText(item.value||"", { x, y:2.2, w:cw-0.5, h:1.5, fontSize:44, fontFace:"Malgun Gothic", color:c("accent"), bold:true, align:"center" });
              slide.addText(item.label||"", { x, y:3.8, w:cw-0.5, h:0.8, fontSize:14, fontFace:"Malgun Gothic", color:c("body"), align:"center" });
            });
            if (s.body) slide.addText(s.body.replace(/\\n/g,"\n"), { x:0.8, y:5, w:11.73, h:1.8, fontSize:15, fontFace:"Malgun Gothic", color:c("body") });
          } else {
            // 공통 헤더
            const hasImage = (lay==="image_right"||lay==="image_left"||lay==="image_full") && s.image;
            const contentW = hasImage && lay!=="image_full" ? 6.5 : 11.73;
            const contentX = lay==="image_left" && hasImage ? 6.5 : 0.8;

            if (lay !== "image_full") {
              slide.addText(s.title||"", { x:contentX, y:0.4, w:contentW, h:0.9, fontSize:26, fontFace:"Malgun Gothic", color:c("text"), bold:true });
              slide.addShape(pptx.ShapeType.rect, { x:contentX, y:1.3, w:1.8, h:0.05, fill:{ color:c("accent") } });
            }

            if (lay === "bullets") {
              const bul = (s.bullets||[]).map(b => ({ text:b, options:{ fontSize:17, color:c("body"), fontFace:"Malgun Gothic", bullet:{code:"2022"}, paraSpaceAfter:8 } }));
              if (bul.length) slide.addText(bul, { x:contentX+0.2, y:1.8, w:contentW-0.4, h:4.8, valign:"top" });
            } else if (lay === "two_column" || lay === "comparison") {
              const lc = s.leftCol || (s.body||"").slice(0, Math.ceil((s.body||"").length/2));
              const rc = s.rightCol || (s.body||"").slice(Math.ceil((s.body||"").length/2));
              slide.addText((lc||"").replace(/\\n/g,"\n"), { x:0.8, y:1.8, w:5.8, h:4.8, fontSize:15, fontFace:"Malgun Gothic", color:c("body"), valign:"top" });
              slide.addShape(pptx.ShapeType.rect, { x:6.6, y:2, w:0.06, h:4, fill:{ color:c("accent")+"40" } });
              slide.addText((rc||"").replace(/\\n/g,"\n"), { x:6.9, y:1.8, w:5.8, h:4.8, fontSize:15, fontFace:"Malgun Gothic", color:c("body"), valign:"top" });
              if (lay==="comparison") {
                slide.addShape(pptx.ShapeType.rect, { x:5.9, y:1.3, w:1.5, h:0.6, fill:{ color:c("accent") }, rectRadius:0.15 });
                slide.addText("VS", { x:5.9, y:1.3, w:1.5, h:0.6, fontSize:14, fontFace:"Malgun Gothic", color:c("bg"), bold:true, align:"center", valign:"middle" });
              }
            } else if (lay === "timeline") {
              const items = s.bullets || [];
              items.slice(0,5).forEach((item, j) => {
                const x = 1 + j * 2.3;
                slide.addShape(pptx.ShapeType.ellipse, { x:x+0.7, y:2.5, w:0.5, h:0.5, fill:{ color:c("accent") } });
                slide.addText(String(j+1), { x:x+0.7, y:2.5, w:0.5, h:0.5, fontSize:12, fontFace:"Malgun Gothic", color:c("bg"), align:"center", valign:"middle", bold:true });
                slide.addText(item, { x:x, y:3.3, w:1.9, h:2, fontSize:12, fontFace:"Malgun Gothic", color:c("body"), align:"center", valign:"top" });
                if (j < items.length-1) slide.addShape(pptx.ShapeType.rect, { x:x+1.3, y:2.7, w:1.2, h:0.06, fill:{ color:c("accent")+"60" } });
              });
            } else if (lay === "quote") {
              slide.addShape(pptx.ShapeType.rect, { x:1.5, y:2, w:0.15, h:3.5, fill:{ color:c("accent") } });
              slide.addText(s.title||"", { x:2.3, y:2, w:9, h:2.5, fontSize:28, fontFace:"Malgun Gothic", color:c("text"), italic:true, valign:"middle" });
              if (s.body) slide.addText(s.body.replace(/\\n/g,"\n"), { x:2.3, y:4.8, w:9, h:1.5, fontSize:15, fontFace:"Malgun Gothic", color:c("sub") });
            } else {
              // title_body, image_right, image_left, image_full
              if (s.body && lay!=="image_full") {
                slide.addText(s.body.replace(/\\n/g,"\n"), { x:contentX, y:1.8, w:contentW, h:4.8, fontSize:17, fontFace:"Malgun Gothic", color:c("body"), valign:"top", lineSpacing:26 });
              }
            }

            // 이미지 삽입 (base64)
            if (hasImage && s.image) {
              const imgOpts = lay==="image_full"
                ? { x:0, y:0, w:13.33, h:7.1, sizing:{ type:"cover", w:13.33, h:7.1 } }
                : lay==="image_right"
                  ? { x:7.5, y:1.5, w:5.3, h:5.2, sizing:{ type:"contain", w:5.3, h:5.2 } }
                  : { x:0.5, y:1.5, w:5.3, h:5.2, sizing:{ type:"contain", w:5.3, h:5.2 } };
              try { slide.addImage({ data:s.image, ...imgOpts }); } catch {}
            }
          }

          // 아이콘
          if (s.icon && ICONS_MAP[s.icon] && !["section","image_full"].includes(lay)) {
            slide.addText(ICONS_MAP[s.icon], { x:12, y:0.3, w:0.8, h:0.8, fontSize:22, align:"center", valign:"middle", color:c("accent") });
          }

          // 슬라이드 번호
          if (i > 0) slide.addText(String(i+1), { x:12.3, y:6.7, w:0.8, h:0.4, fontSize:10, fontFace:"Malgun Gothic", color:c("sub"), align:"right" });
        }

        if (s.note) slide.addNotes(s.note);
      });

      const fn = `${(topic||"PPT").replace(/[^가-힣a-zA-Z0-9\s]/g,"").trim().slice(0,30)}.pptx`;
      await pptx.writeFile({ fileName:fn });
    } catch (e) { setErr("PPTX 내보내기 실패: " + e.message); }
    setExporting(false);
  };

  const cur = slides[selIdx] || {};
  const upd = (k, v) => setSlides(p => { const n=[...p]; n[selIdx]={...n[selIdx],[k]:v}; return n; });

  // 개별 슬라이드 AI 자동기획
  const aiSuggestSlide = async () => {
    if (!cur.title?.trim()) return;
    setAiSlideLoading(true);
    try {
      const lay = cur.layout || "title_body";
      const context = slides.map((s,i) => `${i+1}. [${s.layout}] ${s.title||""}`).join("\n");
      const r = await callClaude(
`PPT 슬라이드 내용 작성. 이모지 금지. JSON만 응답.

[전체 주제] ${topic}
[현재 슬라이드] ${selIdx+1}번 / 전체 ${slides.length}장
[슬라이드 제목] ${cur.title}
[레이아웃] ${lay}
[전체 슬라이드 구조]
${context}

이 슬라이드의 내용을 제목에 맞게 상세 기획하세요:
${lay==="bullets"||lay==="timeline" ? '- bullets: 항목 배열 (4~6개), 구체적 내용' : ''}
${lay==="stats" ? '- stats: [{value:"수치",label:"항목명"}] 3~4개, 실감나는 숫자' : ''}
${lay==="two_column"||lay==="comparison" ? '- leftCol: 왼쪽 내용, rightCol: 오른쪽 내용' : ''}
${lay==="quote" ? '- body: 인용문 출처나 부연 설명' : ''}
- body: 본문 (구체적, 숫자/사례 포함, 줄바꿈은 \\n)
- subtitle: 부제목 (선택)
- note: 발표자 노트 (2~3문장)

JSON: {"body":"...","subtitle":"...","bullets":[...],"stats":[...],"leftCol":"...","rightCol":"...","note":"..."}`, 1000);

      const cleaned = r.replace(/```json\n?/g,"").replace(/```/g,"").trim();
      let data;
      try { data = JSON.parse(cleaned); } catch {
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) data = JSON.parse(m[0]);
      }
      if (data) {
        setSlides(p => {
          const n = [...p];
          const s = { ...n[selIdx] };
          if (data.body) s.body = data.body;
          if (data.subtitle) s.subtitle = data.subtitle;
          if (data.bullets?.length) s.bullets = data.bullets;
          if (data.stats?.length) s.stats = data.stats;
          if (data.leftCol) s.leftCol = data.leftCol;
          if (data.rightCol) s.rightCol = data.rightCol;
          if (data.note) s.note = data.note;
          n[selIdx] = s;
          return n;
        });
      }
    } catch (e) { console.error("AI slide suggest error:", e); }
    setAiSlideLoading(false);
  };

  const handleImage = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => upd("image", ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── 미리보기 ──
  const renderPreview = (s, idx, mini = false) => {
    const lay = s.layout||"title_body";
    const fs = mini ? 0.45 : 1;
    const isSection = lay === "section";
    const hasImg = s.image && ["image_right","image_left","image_full"].includes(lay);

    return (
      <div style={{ width:"100%", aspectRatio:"16/9", background:isSection?theme.accent:theme.bg, borderRadius:mini?4:8, overflow:"hidden", position:"relative", display:"flex", flexDirection:"column" }}>
        {!isSection && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"5%", background:theme.accent }} />}

        {isSection ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8%" }}>
            <div style={{ fontSize:mini?10:24, fontWeight:900, color:theme.bg, textAlign:"center" }}>{s.title||""}</div>
            {s.subtitle && <div style={{ fontSize:mini?7:14, color:theme.bg, opacity:0.8, marginTop:6 }}>{s.subtitle}</div>}
          </div>
        ) : lay === "title_only" ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"6%" }}>
            <div style={{ fontSize:mini?11:26, fontWeight:900, color:theme.text, textAlign:"center", lineHeight:1.4 }}>{s.title||""}</div>
            {s.subtitle && <div style={{ fontSize:mini?7:15, color:theme.sub, marginTop:8, textAlign:"center" }}>{s.subtitle}</div>}
            {s.body && <div style={{ fontSize:mini?6:13, color:theme.body, marginTop:6, textAlign:"center", lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
          </div>
        ) : lay === "stats" ? (
          <div style={{ flex:1, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?9:20, fontWeight:800, color:theme.text, marginBottom:4 }}>{s.title||""}</div>
            <div style={{ width:30, height:2, background:theme.accent, borderRadius:1, marginBottom:mini?6:14 }} />
            <div style={{ display:"flex", gap:mini?4:16, flex:1, alignItems:"center", justifyContent:"center" }}>
              {(s.stats||[]).slice(0,4).map((st,j) => (
                <div key={j} style={{ textAlign:"center", flex:1 }}>
                  <div style={{ fontSize:mini?12:32, fontWeight:900, color:theme.accent }}>{st.value||""}</div>
                  <div style={{ fontSize:mini?6:11, color:theme.body, marginTop:4 }}>{st.label||""}</div>
                </div>
              ))}
            </div>
          </div>
        ) : lay === "quote" ? (
          <div style={{ flex:1, display:"flex", padding:"5% 6%", gap:"3%" }}>
            <div style={{ width:mini?2:4, background:theme.accent, borderRadius:2, flexShrink:0 }} />
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ fontSize:mini?9:20, fontWeight:700, color:theme.text, fontStyle:"italic", lineHeight:1.5 }}>{s.title||""}</div>
              {s.body && <div style={{ fontSize:mini?6:12, color:theme.sub, lineHeight:1.7, marginTop:8, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
            </div>
          </div>
        ) : lay === "timeline" ? (
          <div style={{ flex:1, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?9:20, fontWeight:800, color:theme.text, marginBottom:4 }}>{s.title||""}</div>
            <div style={{ width:30, height:2, background:theme.accent, borderRadius:1, marginBottom:mini?6:14 }} />
            <div style={{ display:"flex", alignItems:"flex-start", gap:mini?2:8, flex:1, paddingTop:mini?4:16 }}>
              {(s.bullets||[]).slice(0,5).map((item,j) => (
                <div key={j} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ width:mini?10:24, height:mini?10:24, borderRadius:"50%", background:theme.accent, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", fontSize:mini?6:11, fontWeight:900, color:theme.bg }}>{j+1}</div>
                  {!mini && j < (s.bullets||[]).length-1 && <div style={{ height:2, background:`${theme.accent}40`, margin:"8px auto", width:"80%" }} />}
                  <div style={{ fontSize:mini?5:11, color:theme.body, marginTop:mini?2:6, lineHeight:1.4 }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex:1, padding:"4% 5%", display:"flex", flexDirection:lay==="image_left"?"row-reverse":"row", gap:"3%" }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
              <div style={{ fontSize:mini?9:20, fontWeight:800, color:theme.text, marginBottom:4 }}>{s.title||""}</div>
              <div style={{ width:30, height:2, background:theme.accent, borderRadius:1, marginBottom:mini?6:12 }} />
              {lay === "bullets" && (s.bullets||[]).length > 0 ? (
                <div style={{ flex:1 }}>
                  {(s.bullets||[]).map((b,j) => (
                    <div key={j} style={{ display:"flex", gap:mini?3:8, marginBottom:mini?2:6, alignItems:"flex-start" }}>
                      <div style={{ width:mini?3:5, height:mini?3:5, borderRadius:"50%", background:theme.accent, marginTop:mini?3:6, flexShrink:0 }} />
                      <div style={{ fontSize:mini?6:13, color:theme.body, lineHeight:1.6 }}>{b}</div>
                    </div>
                  ))}
                </div>
              ) : (lay === "two_column" || lay === "comparison") ? (
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:mini?4:12 }}>
                  <div style={{ fontSize:mini?5:12, color:theme.body, lineHeight:1.6, whiteSpace:"pre-line" }}>{(s.leftCol||(s.body||"").slice(0,Math.ceil((s.body||"").length/2))).replace(/\\n/g,"\n")}</div>
                  <div style={{ fontSize:mini?5:12, color:theme.body, lineHeight:1.6, whiteSpace:"pre-line", borderLeft:`1px solid ${theme.accent}30`, paddingLeft:mini?4:10 }}>{(s.rightCol||(s.body||"").slice(Math.ceil((s.body||"").length/2))).replace(/\\n/g,"\n")}</div>
                </div>
              ) : (
                <div style={{ flex:1, fontSize:mini?6:14, color:theme.body, lineHeight:1.8, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>
              )}
            </div>
            {/* 이미지 영역 */}
            {hasImg && lay!=="image_full" && (
              <div style={{ width:"40%", flexShrink:0, borderRadius:mini?3:8, overflow:"hidden", background:theme.card }}>
                <img src={s.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              </div>
            )}
          </div>
        )}

        {/* 전체 이미지 배경 */}
        {lay === "image_full" && s.image && (
          <>
            <img src={s.image} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8%" }}>
              <div style={{ fontSize:mini?11:28, fontWeight:900, color:"#fff", textAlign:"center" }}>{s.title||""}</div>
              {s.body && <div style={{ fontSize:mini?6:14, color:"rgba(255,255,255,0.8)", marginTop:8, textAlign:"center", whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
            </div>
          </>
        )}

        {/* 아이콘 */}
        {s.icon && ICONS_MAP[s.icon] && !["section","image_full"].includes(lay) && (
          <div style={{ position:"absolute", top:"5%", right:"4%", fontSize:mini?10:20, color:theme.accent, opacity:0.7 }}>{ICONS_MAP[s.icon]}</div>
        )}

        {idx > 0 && !isSection && <div style={{ position:"absolute", bottom:"7%", right:"4%", fontSize:mini?5:9, color:theme.sub }}>{idx+1}</div>}
      </div>
    );
  };

  // ══ INPUT ══
  if (step === "input") return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 28px 60px", background:D?"transparent":"#f4f4f8" }}>
      <div style={{ maxWidth:660, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:6 }}>PPT 제작</div>
          <div style={{ fontSize:14, color:muted }}>주제와 요구사항을 입력하면 AI가 슬라이드를 기획합니다.</div>
        </div>

        <div style={{ borderRadius:14, border:`1.5px solid ${accent}30`, background:bg, padding:"18px", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:6 }}>발표 주제</div>
          <input value={topic} onChange={e=>{setTopic(e.target.value);setErr("");}}
            style={{ ...inp, fontSize:15, fontWeight:700 }} placeholder="예: AI SaaS 스타트업 시리즈A IR" />
        </div>
        <div style={{ borderRadius:14, border:`1px solid ${bdr}`, background:bg, padding:"18px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:6 }}>상세 요구사항 (선택)</div>
          <textarea value={detail} onChange={e=>setDetail(e.target.value)}
            style={{ ...inp, minHeight:60, resize:"vertical", lineHeight:1.7 }}
            placeholder="포함할 내용, 강조할 포인트, 타겟 청중 등 (비워두면 AI가 자동 구성)" />
        </div>

        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:16 }}>
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
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>슬라이드 수: {slideCount}장</div>
            <input type="range" min={5} max={25} value={slideCount} onChange={e=>setSlideCount(Number(e.target.value))} style={{ width:"100%", accentColor:accent }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:muted, marginTop:4 }}><span>5</span><span>15</span><span>25</span></div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:8 }}>테마</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={()=>setThemeId(t.id)}
                  style={{ padding:"5px 3px", borderRadius:6, border:`1.5px solid ${themeId===t.id?accent:"transparent"}`, cursor:"pointer", textAlign:"center",
                    background:themeId===t.id?`${accent}12`:"transparent" }}>
                  <div style={{ display:"flex", gap:2, justifyContent:"center", marginBottom:2 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:t.bg, border:"1px solid rgba(128,128,128,0.3)" }} />
                    <div style={{ width:8, height:8, borderRadius:2, background:t.accent }} />
                  </div>
                  <div style={{ fontSize:9, fontWeight:themeId===t.id?700:400, color:themeId===t.id?accent:muted }}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {err && <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.06)", color:"#f87171", fontSize:13, marginBottom:14 }}>{err}</div>}

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
        <div style={{ fontSize:18, fontWeight:900, color:accent, marginBottom:12 }}>PPT {slideCount}장 기획 중</div>
        <div style={{ width:300, height:5, borderRadius:3, background:"rgba(128,128,128,0.12)", overflow:"hidden", margin:"0 auto 16px" }}>
          <div style={{ height:"100%", borderRadius:3, background:accent, animation:"ai-progress 15s ease-out forwards" }} />
        </div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.8 }}>슬라이드별 내용을 상세 기획하고 있습니다...</div>
      </div>
    </div>
  );

  // ══ EDIT ══
  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden", background:D?"transparent":"#f4f4f8" }}>
      {/* 왼쪽: 슬라이드 목록 */}
      <div style={{ width:140, flexShrink:0, borderRight:`1px solid ${bdr}`, overflowY:"auto", padding:"10px 6px", background:D?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)" }}>
        {slides.map((s,i) => (
          <div key={i} onClick={()=>setSelIdx(i)}
            style={{ marginBottom:6, cursor:"pointer", borderRadius:6, border:selIdx===i?`2px solid ${accent}`:`2px solid transparent`,
              overflow:"hidden", opacity:selIdx===i?1:0.65, transition:"all 0.1s" }}>
            {renderPreview(s, i, true)}
            <div style={{ padding:"2px 4px", fontSize:8, fontWeight:selIdx===i?700:400, color:selIdx===i?accent:muted, textAlign:"center",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {i+1}. {s.title?.slice(0,12)||""}
            </div>
          </div>
        ))}
        <button onClick={()=>{
          setSlides(p=>[...p,{id:p.length,title:"새 슬라이드",body:"",layout:"title_body",bullets:[],stats:[],note:"",icon:"",image:null}]);
          setSelIdx(slides.length);
        }} style={{ width:"100%", padding:"6px", borderRadius:6, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, fontWeight:700, cursor:"pointer" }}>
          + 추가
        </button>
      </div>

      {/* 가운데 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"8px 14px", borderBottom:`1px solid ${bdr}`, display:"flex", alignItems:"center", gap:8, flexShrink:0, background:D?"rgba(0,0,0,0.15)":"rgba(249,250,251,0.8)" }}>
          <button onClick={()=>{setStep("input");setSlides([]);}} style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:10, cursor:"pointer" }}>← 처음</button>
          <div style={{ flex:1, fontSize:12, fontWeight:700, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{topic}</div>
          <span style={{ fontSize:10, color:muted }}>{slides.length}장</span>
          <button onClick={exportPptx} disabled={exporting}
            style={{ padding:"6px 16px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:11, fontWeight:800, cursor:exporting?"not-allowed":"pointer", opacity:exporting?0.6:1 }}>
            {exporting?"내보내는 중...":"PPTX 다운로드"}
          </button>
        </div>

        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:20, overflow:"auto" }}>
          <div style={{ width:"100%", maxWidth:780, boxShadow:D?"0 8px 40px rgba(0,0,0,0.5)":"0 8px 40px rgba(0,0,0,0.1)", borderRadius:10, overflow:"hidden" }}>
            {renderPreview(cur, selIdx)}
          </div>
        </div>

        <div style={{ padding:"8px 14px", borderTop:`1px solid ${bdr}`, display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexShrink:0 }}>
          <button onClick={()=>setSelIdx(Math.max(0,selIdx-1))} disabled={selIdx===0}
            style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:selIdx===0?muted:text, fontSize:11, cursor:selIdx===0?"not-allowed":"pointer" }}>이전</button>
          <span style={{ fontSize:12, fontWeight:700, color:text }}>{selIdx+1} / {slides.length}</span>
          <button onClick={()=>setSelIdx(Math.min(slides.length-1,selIdx+1))} disabled={selIdx>=slides.length-1}
            style={{ padding:"5px 14px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:selIdx>=slides.length-1?muted:text, fontSize:11, cursor:selIdx>=slides.length-1?"not-allowed":"pointer" }}>다음</button>
        </div>
      </div>

      {/* 오른쪽: 편집 */}
      <div style={{ width:270, flexShrink:0, borderLeft:`1px solid ${bdr}`, display:"flex", flexDirection:"column", overflow:"hidden", background:D?"rgba(0,0,0,0.1)":"rgba(0,0,0,0.01)" }}>
        {/* 탭 */}
        <div style={{ display:"flex", borderBottom:`1px solid ${bdr}`, flexShrink:0 }}>
          {[["content","내용"],["style","스타일"],["media","미디어"]].map(([id,label])=>(
            <button key={id} onClick={()=>setEditTab(id)}
              style={{ flex:1, padding:"9px 0", border:"none", cursor:"pointer", fontSize:11, fontWeight:editTab===id?700:400,
                color:editTab===id?accent:muted, background:"transparent",
                borderBottom:editTab===id?`2px solid ${accent}`:"2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"12px 10px" }}>
          {/* ── 내용 탭 ── */}
          {editTab === "content" && <>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:4 }}>레이아웃</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
                {LAYOUTS.map(l => (
                  <button key={l.id} onClick={()=>upd("layout",l.id)}
                    style={{ padding:"5px 2px", borderRadius:5, border:`1px solid ${cur.layout===l.id?accent:bdr}`,
                      background:cur.layout===l.id?`${accent}12`:"transparent", color:cur.layout===l.id?accent:muted,
                      fontSize:9, fontWeight:cur.layout===l.id?700:400, cursor:"pointer" }}>
                    <div style={{ fontFamily:"monospace", fontSize:9, marginBottom:1 }}>{l.icon}</div>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                <div style={{ fontSize:10, fontWeight:700, color:muted }}>제목</div>
                <button onClick={aiSuggestSlide} disabled={aiSlideLoading || !cur.title?.trim()}
                  style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${accent}40`, background:`${accent}10`,
                    color:accent, fontSize:9, fontWeight:700, cursor:aiSlideLoading||!cur.title?.trim()?"not-allowed":"pointer",
                    opacity:aiSlideLoading||!cur.title?.trim()?0.5:1, display:"flex", alignItems:"center", gap:4 }}>
                  {aiSlideLoading ? (
                    <><div style={{ width:8, height:8, border:`1.5px solid ${accent}40`, borderTopColor:accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} /> 기획 중...</>
                  ) : "AI 자동기획"}
                </button>
              </div>
              <input value={cur.title||""} onChange={e=>upd("title",e.target.value)} style={{ ...inp, fontSize:12 }}
                placeholder="제목 입력 후 'AI 자동기획' 클릭" />
            </div>
            {cur.layout !== "stats" && <>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>본문</div>
                <textarea value={(cur.body||"").replace(/\\n/g,"\n")} onChange={e=>upd("body",e.target.value)}
                  rows={3} style={{ ...inp, fontSize:11, resize:"vertical", lineHeight:1.6 }} />
              </div>
            </>}
            {(cur.layout==="bullets"||cur.layout==="timeline") && <>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>{cur.layout==="timeline"?"단계":"항목"}</div>
                {(cur.bullets||[]).map((b,j)=>(
                  <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                    <span style={{ fontSize:9, color:accent, fontWeight:700, marginTop:7, flexShrink:0 }}>{j+1}</span>
                    <input value={b} onChange={e=>{const n=[...(cur.bullets||[])];n[j]=e.target.value;upd("bullets",n);}} style={{ ...inp, fontSize:10, padding:"5px 8px", flex:1 }} />
                    <button onClick={()=>upd("bullets",(cur.bullets||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:12, cursor:"pointer" }}>x</button>
                  </div>
                ))}
                <button onClick={()=>upd("bullets",[...(cur.bullets||[]),""])} style={{ width:"100%", padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 추가</button>
              </div>
            </>}
            {cur.layout === "stats" && <>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>통계 항목</div>
                {(cur.stats||[]).map((st,j)=>(
                  <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                    <input value={st.value||""} onChange={e=>{const n=[...(cur.stats||[])];n[j]={...n[j],value:e.target.value};upd("stats",n);}} placeholder="85%" style={{ ...inp, fontSize:11, padding:"5px 8px", flex:1 }} />
                    <input value={st.label||""} onChange={e=>{const n=[...(cur.stats||[])];n[j]={...n[j],label:e.target.value};upd("stats",n);}} placeholder="항목명" style={{ ...inp, fontSize:11, padding:"5px 8px", flex:1 }} />
                    <button onClick={()=>upd("stats",(cur.stats||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:12, cursor:"pointer" }}>x</button>
                  </div>
                ))}
                <button onClick={()=>upd("stats",[...(cur.stats||[]),{value:"",label:""}])} style={{ width:"100%", padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 추가</button>
              </div>
            </>}
            {(cur.layout==="two_column"||cur.layout==="comparison") && <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>왼쪽</div>
                  <textarea value={(cur.leftCol||"").replace(/\\n/g,"\n")} onChange={e=>upd("leftCol",e.target.value)} rows={3} style={{ ...inp, fontSize:10, resize:"vertical" }} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>오른쪽</div>
                  <textarea value={(cur.rightCol||"").replace(/\\n/g,"\n")} onChange={e=>upd("rightCol",e.target.value)} rows={3} style={{ ...inp, fontSize:10, resize:"vertical" }} />
                </div>
              </div>
            </>}
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>발표 노트</div>
              <textarea value={cur.note||""} onChange={e=>upd("note",e.target.value)} rows={2} style={{ ...inp, fontSize:10, resize:"vertical" }} placeholder="발표자 참고 메모" />
            </div>
          </>}

          {/* ── 스타일 탭 ── */}
          {editTab === "style" && <>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>테마</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
                {THEMES.map(t=>(
                  <button key={t.id} onClick={()=>setThemeId(t.id)}
                    style={{ padding:"8px 4px", borderRadius:7, border:`1.5px solid ${themeId===t.id?accent:"transparent"}`, cursor:"pointer", textAlign:"center", background:themeId===t.id?`${accent}10`:"transparent" }}>
                    <div style={{ display:"flex", gap:3, justifyContent:"center", marginBottom:3 }}>
                      <div style={{ width:12, height:12, borderRadius:3, background:t.bg, border:"1px solid rgba(128,128,128,0.3)" }} />
                      <div style={{ width:12, height:12, borderRadius:3, background:t.accent }} />
                      <div style={{ width:12, height:12, borderRadius:3, background:t.text, opacity:0.6 }} />
                    </div>
                    <div style={{ fontSize:10, fontWeight:themeId===t.id?700:400, color:themeId===t.id?accent:muted }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>아이콘</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:3 }}>
                <button onClick={()=>upd("icon","")} style={{ padding:6, borderRadius:5, border:`1px solid ${!cur.icon?accent:bdr}`, background:!cur.icon?`${accent}12`:"transparent", cursor:"pointer", fontSize:10, color:muted }}>없음</button>
                {Object.entries(ICONS_MAP).map(([k,v])=>(
                  <button key={k} onClick={()=>upd("icon",k)} title={k}
                    style={{ padding:6, borderRadius:5, border:`1px solid ${cur.icon===k?accent:bdr}`, background:cur.icon===k?`${accent}12`:"transparent", cursor:"pointer", fontSize:14, textAlign:"center" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {slides.length>1 && <button onClick={()=>{
              setSlides(p=>p.filter((_,i)=>i!==selIdx));
              setSelIdx(Math.max(0,selIdx-1));
            }} style={{ width:"100%", padding:"8px", borderRadius:7, border:"1px solid rgba(239,68,68,0.15)", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>
              이 슬라이드 삭제
            </button>}
          </>}

          {/* ── 미디어 탭 ── */}
          {editTab === "media" && <>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>이미지 삽입</div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImage} />
              {cur.image ? (
                <div>
                  <div style={{ borderRadius:8, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:8 }}>
                    <img src={cur.image} alt="" style={{ width:"100%", maxHeight:140, objectFit:"cover", display:"block" }} />
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>imgRef.current?.click()} style={{ flex:1, padding:"6px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:accent, fontSize:10, cursor:"pointer" }}>변경</button>
                    <button onClick={()=>upd("image",null)} style={{ flex:1, padding:"6px", borderRadius:6, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>제거</button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>imgRef.current?.click()}
                  style={{ width:"100%", padding:"20px 12px", borderRadius:10, border:`2px dashed ${bdr}`, background:"transparent", cursor:"pointer", textAlign:"center", color:muted, fontSize:12 }}>
                  클릭하여 이미지 업로드<br/><span style={{ fontSize:10 }}>JPG, PNG, WEBP</span>
                </button>
              )}
              {cur.image && <div style={{ marginTop:8, fontSize:10, color:muted }}>
                이미지가 적용되려면 레이아웃을 "이미지 오른쪽", "이미지 왼쪽", 또는 "전체 이미지"로 설정하세요.
              </div>}
            </div>
            <div style={{ padding:"10px 12px", borderRadius:8, background:ibg, border:`1px solid ${bdr}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:text, marginBottom:6 }}>이미지 레이아웃 바로가기</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {[["image_right","이미지 오른쪽"],["image_left","이미지 왼쪽"],["image_full","전체 이미지 배경"]].map(([id,label])=>(
                  <button key={id} onClick={()=>{upd("layout",id);setEditTab("content");}}
                    style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${cur.layout===id?accent:bdr}`,
                      background:cur.layout===id?`${accent}12`:"transparent", color:cur.layout===id?accent:muted,
                      fontSize:11, fontWeight:cur.layout===id?700:400, cursor:"pointer", textAlign:"left" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>}
        </div>
      </div>

      {err && <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", padding:"10px 20px", borderRadius:10, background:"rgba(239,68,68,0.9)", color:"#fff", fontSize:13, zIndex:9999 }}>{err}</div>}
    </div>
  );
}
