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
  // 기본 (7)
  { id:"title_only",     label:"표지",           cat:"기본" },
  { id:"title_sub",      label:"표지+부제목",     cat:"기본" },
  { id:"title_body",     label:"제목+본문",       cat:"기본" },
  { id:"title_body_sub", label:"제목+부제+본문",   cat:"기본" },
  { id:"section",        label:"섹션 구분",       cat:"기본" },
  { id:"section_num",    label:"챕터 번호",       cat:"기본" },
  { id:"agenda",         label:"목차/어젠다",     cat:"기본" },
  // 리스트 (8)
  { id:"bullets",        label:"불릿 리스트",     cat:"리스트" },
  { id:"numbered",       label:"넘버링 리스트",   cat:"리스트" },
  { id:"icon_grid",      label:"아이콘 4칸",      cat:"리스트" },
  { id:"icon_grid_6",    label:"아이콘 6칸",      cat:"리스트" },
  { id:"checklist",      label:"체크리스트",       cat:"리스트" },
  { id:"card_grid",      label:"카드 그리드",      cat:"리스트" },
  { id:"horizontal_list",label:"가로 나열",        cat:"리스트" },
  { id:"definition",     label:"용어 정의",        cat:"리스트" },
  // 비교/분석 (8)
  { id:"two_column",     label:"2단 컬럼",        cat:"비교" },
  { id:"three_column",   label:"3단 컬럼",        cat:"비교" },
  { id:"comparison",     label:"VS 비교",         cat:"비교" },
  { id:"table",          label:"표/테이블",        cat:"비교" },
  { id:"pros_cons",      label:"장단점",           cat:"비교" },
  { id:"before_after",   label:"Before/After",    cat:"비교" },
  { id:"matrix",         label:"매트릭스 2x2",     cat:"비교" },
  { id:"ranking",        label:"순위/랭킹",        cat:"비교" },
  // 데이터 (9)
  { id:"stats",          label:"숫자 강조",        cat:"데이터" },
  { id:"stats_4",        label:"숫자 4칸",         cat:"데이터" },
  { id:"chart_bar",      label:"막대 차트",        cat:"데이터" },
  { id:"chart_bar_h",    label:"가로 막대",        cat:"데이터" },
  { id:"chart_pie",      label:"원형 차트",        cat:"데이터" },
  { id:"chart_donut",    label:"도넛 차트",        cat:"데이터" },
  { id:"progress",       label:"진행률 바",        cat:"데이터" },
  { id:"big_number",     label:"핵심 숫자",        cat:"데이터" },
  { id:"kpi_card",       label:"KPI 카드",         cat:"데이터" },
  // 프로세스 (9)
  { id:"timeline",       label:"타임라인",         cat:"프로세스" },
  { id:"timeline_v",     label:"세로 타임라인",    cat:"프로세스" },
  { id:"steps",          label:"단계 (가로)",      cat:"프로세스" },
  { id:"steps_v",        label:"단계 (세로)",      cat:"프로세스" },
  { id:"pyramid",        label:"피라미드",         cat:"프로세스" },
  { id:"funnel",         label:"퍼널",             cat:"프로세스" },
  { id:"cycle",          label:"순환 사이클",      cat:"프로세스" },
  { id:"flowchart",      label:"플로우차트",       cat:"프로세스" },
  { id:"roadmap",        label:"로드맵",           cat:"프로세스" },
  // 강조 (7)
  { id:"quote",          label:"인용 문구",        cat:"강조" },
  { id:"quote_card",     label:"인용 카드",        cat:"강조" },
  { id:"highlight_box",  label:"강조 박스",        cat:"강조" },
  { id:"callout",        label:"콜아웃",           cat:"강조" },
  { id:"key_message",    label:"핵심 메시지",      cat:"강조" },
  { id:"banner",         label:"배너 강조",        cat:"강조" },
  { id:"cta",            label:"CTA/행동유도",     cat:"강조" },
  // 이미지 (6)
  { id:"image_right",    label:"이미지 우측",      cat:"이미지" },
  { id:"image_left",     label:"이미지 좌측",      cat:"이미지" },
  { id:"image_full",     label:"전체 이미지",      cat:"이미지" },
  { id:"image_top",      label:"이미지 상단",      cat:"이미지" },
  { id:"gallery",        label:"갤러리 2칸",       cat:"이미지" },
  { id:"mockup",         label:"디바이스 목업",    cat:"이미지" },
  // 프레임워크 (9)
  { id:"swot",           label:"SWOT 분석",       cat:"프레임" },
  { id:"org_chart",      label:"조직도",           cat:"프레임" },
  { id:"team",           label:"팀 소개",          cat:"프레임" },
  { id:"pricing",        label:"가격표",           cat:"프레임" },
  { id:"faq",            label:"FAQ",             cat:"프레임" },
  { id:"contact",        label:"연락처/마무리",    cat:"프레임" },
  { id:"thankyou",       label:"감사 페이지",      cat:"프레임" },
  { id:"qna",            label:"Q&A",             cat:"프레임" },
  { id:"references",     label:"참고 자료",        cat:"프레임" },
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

// 미니 슬라이드 프리뷰 (모든 레이아웃 시각화)
function MiniSlidePreview({ layoutId, W=60, H=34, theme }) {
  const a=theme.accent, bg=theme.bg, t=theme.text, bd=theme.body;
  const p=Math.round(W*0.06), r=Math.round(W*0.05);
  const bar=<div style={{position:"absolute",bottom:0,left:0,right:0,height:Math.max(2,H*0.06),background:a}}/>;
  const tl=<div style={{width:"55%",height:Math.max(2,H*0.09),background:t,borderRadius:1,opacity:0.7}}/>;
  const ln=<div style={{width:"30%",height:Math.max(1.5,H*0.05),background:a,borderRadius:1,marginTop:H*0.04}}/>;
  const bl=(n=3)=>Array.from({length:n}).map((_,i)=><div key={i} style={{width:`${70-i*8}%`,height:Math.max(1.5,H*0.045),background:t,borderRadius:1,opacity:0.2,marginTop:H*0.04}}/>);
  const dt=(n=3)=>Array.from({length:n}).map((_,i)=><div key={i} style={{display:"flex",gap:H*0.04,alignItems:"center",marginTop:H*0.04}}><div style={{width:H*0.07,height:H*0.07,borderRadius:"50%",background:a,flexShrink:0}}/><div style={{width:`${50-i*5}%`,height:Math.max(1.5,H*0.045),background:t,opacity:0.2,borderRadius:1}}/></div>);
  const nm=(n=3)=>Array.from({length:n}).map((_,i)=><div key={i} style={{display:"flex",gap:H*0.04,alignItems:"center",marginTop:H*0.04}}><div style={{width:H*0.14,height:H*0.14,borderRadius:"50%",background:a,fontSize:Math.max(3,H*0.08),color:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,flexShrink:0}}>{i+1}</div><div style={{width:`${45-i*4}%`,height:Math.max(1.5,H*0.045),background:t,opacity:0.2,borderRadius:1}}/></div>);
  const ck=(n=3)=>Array.from({length:n}).map((_,i)=><div key={i} style={{display:"flex",gap:H*0.04,alignItems:"center",marginTop:H*0.04}}><div style={{width:H*0.1,height:H*0.1,borderRadius:2,border:`1px solid ${a}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.max(3,H*0.06),color:a}}>✓</div><div style={{width:`${48-i*5}%`,height:Math.max(1.5,H*0.045),background:t,opacity:0.2,borderRadius:1}}/></div>);
  const bx={width:W,height:H,background:bg,borderRadius:r,position:"relative",overflow:"hidden"};
  const id=layoutId;
  if(id==="title_only"||id==="title_sub") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{bar}<div style={{width:"60%",height:H*0.09,background:t,borderRadius:1,opacity:0.8}}/>{id==="title_sub"&&<div style={{width:"40%",height:H*0.06,background:a,borderRadius:1,marginTop:H*0.08,opacity:0.5}}/>}<div style={{width:"35%",height:H*0.05,background:t,borderRadius:1,marginTop:H*0.06,opacity:0.3}}/></div>;
  if(id==="section"||id==="section_num") return <div style={{...bx,background:a,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{id==="section_num"&&<div style={{fontSize:Math.max(6,H*0.2),fontWeight:900,color:bg,opacity:0.4,marginBottom:H*0.04}}>01</div>}<div style={{width:"55%",height:H*0.09,background:bg,borderRadius:1}}/></div>;
  if(id==="agenda") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.08}}>{nm(4)}</div></div>;
  if(id==="title_body"||id==="title_body_sub") return <div style={{...bx,padding:p}}>{bar}{tl}{ln}{bl()}</div>;
  if(id==="bullets") return <div style={{...bx,padding:p}}>{bar}{tl}{ln}{dt(3)}</div>;
  if(id==="numbered") return <div style={{...bx,padding:p}}>{bar}{tl}{ln}{nm(3)}</div>;
  if(id==="checklist") return <div style={{...bx,padding:p}}>{bar}{tl}{ln}{ck(3)}</div>;
  if(id==="icon_grid"||id==="icon_grid_6") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"grid",gridTemplateColumns:id==="icon_grid_6"?"1fr 1fr 1fr":"1fr 1fr",gap:H*0.04,marginTop:H*0.08}}>{Array.from({length:id==="icon_grid_6"?6:4}).map((_,i)=><div key={i} style={{height:H*0.16,borderRadius:r*0.6,background:`${a}18`,border:`0.5px solid ${a}35`}}/>)}</div></div>;
  if(id==="card_grid") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:H*0.04,marginTop:H*0.08}}>{[0,1,2].map(i=><div key={i} style={{height:H*0.3,borderRadius:r*0.6,background:`${a}10`,border:`0.5px solid ${a}20`}}/>)}</div></div>;
  if(id==="horizontal_list") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.1}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:H*0.35,borderRadius:r*0.6,background:`${a}${12+i*4}`,border:`0.5px solid ${a}25`}}/>)}</div></div>;
  if(id==="definition") return <div style={{...bx,padding:p}}>{bar}{tl}{[0,1,2].map(i=><div key={i} style={{display:"flex",gap:H*0.04,marginTop:H*0.05}}><div style={{width:H*0.2,height:H*0.06,background:a,borderRadius:1,opacity:0.6,flexShrink:0}}/><div style={{flex:1,height:H*0.04,background:t,borderRadius:1,opacity:0.15}}/></div>)}</div>;
  if(id==="two_column"||id==="three_column") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.06}}>{Array.from({length:id==="three_column"?3:2}).map((_,i)=><div key={i} style={{flex:1}}>{bl(3)}</div>)}</div></div>;
  if(id==="comparison") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.06,alignItems:"center"}}><div style={{flex:1}}>{bl(2)}</div><div style={{width:H*0.22,height:H*0.22,borderRadius:"50%",background:a,fontSize:Math.max(4,H*0.08),color:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,flexShrink:0}}>VS</div><div style={{flex:1}}>{bl(2)}</div></div></div>;
  if(id==="table") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[0,1,2,3].map(r=><div key={r} style={{display:"flex",gap:1,marginTop:1}}>{[0,1,2,3].map(c=><div key={c} style={{flex:1,height:H*0.08,background:r===0?`${a}30`:`${t}08`,borderRadius:1}}/>)}</div>)}</div></div>;
  if(id==="pros_cons") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.06}}><div style={{flex:1,borderRadius:r*0.5,background:"rgba(74,222,128,0.1)",border:"0.5px solid rgba(74,222,128,0.3)",height:H*0.5}}/><div style={{flex:1,borderRadius:r*0.5,background:"rgba(248,113,113,0.1)",border:"0.5px solid rgba(248,113,113,0.3)",height:H*0.5}}/></div></div>;
  if(id==="before_after") return <div style={{...bx,display:"flex"}}>{bar}<div style={{flex:1,background:`${t}08`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:Math.max(5,H*0.12),color:t,opacity:0.3}}>Before</div></div><div style={{width:2,background:a}}/><div style={{flex:1,background:`${a}08`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:Math.max(5,H*0.12),color:a,opacity:0.5}}>After</div></div></div>;
  if(id==="matrix") return <div style={{...bx,padding:p}}>{bar}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:H*0.04,height:"85%"}}>{[a,"#f59e0b","#3b82f6","#22c55e"].map((c,i)=><div key={i} style={{borderRadius:r*0.5,background:`${c}12`,border:`0.5px solid ${c}30`}}/>)}</div></div>;
  if(id==="ranking") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[90,70,50].map((w,i)=><div key={i} style={{display:"flex",gap:H*0.04,alignItems:"center",marginTop:H*0.04}}><div style={{fontSize:Math.max(4,H*0.1),fontWeight:900,color:a,width:H*0.12}}>{i+1}</div><div style={{height:H*0.1,width:`${w}%`,background:a,borderRadius:2,opacity:0.4+i*0.2}}/></div>)}</div></div>;
  if(id==="stats"||id==="stats_4") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.06,marginTop:H*0.1,justifyContent:"center"}}>{Array.from({length:id==="stats_4"?4:3}).map((_,i)=><div key={i} style={{textAlign:"center"}}><div style={{fontSize:Math.max(6,H*0.2),fontWeight:900,color:a}}>8{i}</div><div style={{width:W*0.12,height:H*0.04,background:`${t}20`,borderRadius:1,marginTop:H*0.03}}/></div>)}</div></div>;
  if(id==="chart_bar"||id==="chart_bar_h") {
    if(id==="chart_bar_h") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[80,55,70,40].map((v,i)=><div key={i} style={{display:"flex",gap:H*0.04,alignItems:"center",marginTop:H*0.04}}><div style={{width:W*0.15,height:H*0.04,background:`${t}15`,borderRadius:1}}/><div style={{height:H*0.07,width:`${v}%`,background:a,borderRadius:2,opacity:0.5+i*0.12}}/></div>)}</div></div>;
    return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",alignItems:"flex-end",gap:H*0.06,marginTop:H*0.06,height:H*0.4}}>{[70,45,90,55,80].map((v,i)=><div key={i} style={{flex:1,height:`${v}%`,background:a,borderRadius:1,opacity:0.4+i*0.12}}/>)}</div></div>;
  }
  if(id==="chart_pie"||id==="chart_donut") {
    const sz=Math.min(W,H)*0.4;
    return <div style={{...bx,display:"flex",alignItems:"center",justifyContent:"center",gap:W*0.08}}>{bar}<div style={{width:sz,height:sz,borderRadius:"50%",background:`conic-gradient(${a} 0deg 130deg, #f59e0b 130deg 230deg, #ef4444 230deg 360deg)`,display:"flex",alignItems:"center",justifyContent:"center"}}>{id==="chart_donut"&&<div style={{width:sz*0.5,height:sz*0.5,borderRadius:"50%",background:bg}}/>}</div></div>;
  }
  if(id==="progress") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[75,50,90].map((v,i)=><div key={i} style={{height:H*0.08,borderRadius:2,background:`${a}18`,marginTop:H*0.05,overflow:"hidden"}}><div style={{height:"100%",width:`${v}%`,background:a,borderRadius:2}}/></div>)}</div></div>;
  if(id==="big_number"||id==="kpi_card") return <div style={{...bx,display:"flex",flexDirection:id==="kpi_card"?"row":"column",alignItems:"center",justifyContent:"center",gap:id==="kpi_card"?W*0.06:0}}>{bar}{id==="kpi_card"?<>{[0,1,2].map(i=><div key={i} style={{flex:1,textAlign:"center",borderRight:i<2?`0.5px solid ${a}20`:"none",padding:p*0.5}}><div style={{fontSize:Math.max(7,H*0.22),fontWeight:900,color:a}}>8{i}%</div><div style={{height:H*0.04,background:`${t}15`,borderRadius:1,marginTop:H*0.04}}/></div>)}</>:<><div style={{fontSize:Math.max(10,H*0.35),fontWeight:900,color:a}}>85%</div><div style={{width:W*0.3,height:H*0.05,background:`${t}15`,borderRadius:1,marginTop:H*0.04}}/></>}</div>;
  if(id==="timeline"||id==="timeline_v") {
    if(id==="timeline_v") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06,marginLeft:H*0.1}}>{[0,1,2,3].map(i=><div key={i} style={{display:"flex",gap:H*0.06,marginTop:i?H*0.04:0}}><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:H*0.1,height:H*0.1,borderRadius:"50%",background:a,flexShrink:0}}/>{i<3&&<div style={{width:1,height:H*0.08,background:`${a}40`}}/>}</div><div style={{width:W*0.5,height:H*0.04,background:`${t}12`,borderRadius:1,marginTop:H*0.02}}/></div>)}</div></div>;
    return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",alignItems:"center",gap:H*0.04,marginTop:H*0.12}}>{[0,1,2,3,4].map(i=><><div key={i} style={{width:H*0.12,height:H*0.12,borderRadius:"50%",background:a,flexShrink:0}}/>{i<4&&<div style={{flex:1,height:1,background:`${a}40`}}/>}</>)}</div></div>;
  }
  if(id==="steps"||id==="steps_v") {
    if(id==="steps_v") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[0,1,2].map(i=><div key={i} style={{padding:H*0.04,borderRadius:r*0.4,background:`${a}${i===0?"25":"10"}`,border:i===0?`0.5px solid ${a}`:"none",marginTop:i?H*0.03:0}}><div style={{height:H*0.04,width:`${60-i*10}%`,background:t,opacity:0.2,borderRadius:1}}/></div>)}</div></div>;
    return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:1,marginTop:H*0.1}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,display:"flex",alignItems:"center"}}><div style={{flex:1,height:H*0.22,borderRadius:r*0.4,background:`${a}${i===0?"28":"12"}`,border:i===0?`0.5px solid ${a}`:"none"}}/>{i<3&&<span style={{fontSize:Math.max(4,H*0.1),color:a,flexShrink:0}}>→</span>}</div>)}</div></div>;
  }
  if(id==="pyramid"||id==="funnel") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:H*0.02,padding:p}}>{bar}{(id==="funnel"?[65,50,35,20]:[20,35,50,65]).map((w,i)=><div key={i} style={{width:`${w}%`,height:H*0.1,background:`${a}${18+i*8}`,borderRadius:1}}/>)}</div>;
  if(id==="cycle") return <div style={{...bx,display:"flex",alignItems:"center",justifyContent:"center"}}>{bar}<div style={{width:H*0.55,height:H*0.55,borderRadius:"50%",border:`2px solid ${a}30`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:H*0.2,height:H*0.2,borderRadius:"50%",background:`${a}30`}}/></div>{[0,1,2,3].map(i=><div key={i} style={{position:"absolute",width:H*0.12,height:H*0.12,borderRadius:"50%",background:a,top:`${20+Math.sin(i*Math.PI/2)*25}%`,left:`${35+Math.cos(i*Math.PI/2)*25}%`}}/>)}</div>;
  if(id==="flowchart") return <div style={{...bx,display:"flex",alignItems:"center",justifyContent:"center",gap:H*0.04}}>{bar}{[0,1,2].map(i=><div key={i} style={{display:"flex",alignItems:"center",gap:H*0.04}}><div style={{width:H*0.2,height:H*0.15,borderRadius:i===1?H*0.08:r*0.4,background:`${a}${15+i*8}`,border:`0.5px solid ${a}40`}}/>{i<2&&<span style={{fontSize:Math.max(4,H*0.08),color:a}}>→</span>}</div>)}</div>;
  if(id==="roadmap") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{position:"relative",marginTop:H*0.12}}><div style={{position:"absolute",top:H*0.06,left:0,right:0,height:2,background:`${a}30`}}/><div style={{display:"flex",justifyContent:"space-between"}}>{["Q1","Q2","Q3","Q4"].map((q,i)=><div key={i} style={{textAlign:"center",position:"relative",zIndex:1}}><div style={{width:H*0.1,height:H*0.1,borderRadius:"50%",background:i<2?a:`${a}40`,margin:"0 auto"}}/><div style={{fontSize:Math.max(4,H*0.08),color:t,opacity:0.5,marginTop:H*0.03}}>{q}</div></div>)}</div></div></div>;
  if(id==="quote"||id==="quote_card") return <div style={{...bx,display:"flex",padding:p,gap:H*0.06}}>{bar}<div style={{width:Math.max(2,H*0.05),background:a,borderRadius:1,flexShrink:0}}/><div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>{id==="quote_card"&&<div style={{fontSize:Math.max(6,H*0.15),color:a,opacity:0.3,lineHeight:1}}>"</div>}<div style={{width:W*0.5,height:H*0.06,background:t,opacity:0.5,borderRadius:1}}/><div style={{width:W*0.35,height:H*0.04,background:t,opacity:0.2,borderRadius:1,marginTop:H*0.06}}/></div></div>;
  if(id==="highlight_box") return <div style={{...bx,display:"flex",alignItems:"center",justifyContent:"center",padding:p}}>{bar}<div style={{width:"75%",padding:H*0.08,borderRadius:r,background:`${a}15`,border:`1.5px solid ${a}40`,textAlign:"center"}}><div style={{width:"80%",height:H*0.07,background:t,opacity:0.6,borderRadius:1,margin:"0 auto"}}/><div style={{width:"55%",height:H*0.04,background:t,opacity:0.2,borderRadius:1,margin:`${H*0.04}px auto 0`}}/></div></div>;
  if(id==="callout") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.08,padding:H*0.05,borderLeft:`2px solid ${a}`,background:`${a}08`,borderRadius:`0 ${r*0.4}px ${r*0.4}px 0`}}><div style={{width:"70%",height:H*0.04,background:t,opacity:0.3,borderRadius:1}}/><div style={{width:"50%",height:H*0.04,background:t,opacity:0.15,borderRadius:1,marginTop:H*0.03}}/></div></div>;
  if(id==="key_message") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{bar}<div style={{width:"70%",height:H*0.12,background:a,borderRadius:r*0.5,marginBottom:H*0.06}}/><div style={{width:"50%",height:H*0.04,background:t,opacity:0.2,borderRadius:1}}/></div>;
  if(id==="banner") return <div style={{...bx,display:"flex",flexDirection:"column"}}>{bar}<div style={{height:"40%",background:`${a}20`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"60%",height:H*0.08,background:t,opacity:0.7,borderRadius:1}}/></div><div style={{flex:1,padding:p}}>{bl(2)}</div></div>;
  if(id==="cta") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:H*0.06}}>{bar}<div style={{width:"60%",height:H*0.07,background:t,opacity:0.5,borderRadius:1}}/><div style={{width:"35%",height:H*0.12,background:a,borderRadius:r*0.6}}/></div>;
  if(id==="image_top") return <div style={{...bx,display:"flex",flexDirection:"column"}}>{bar}<div style={{height:"45%",background:`${a}12`}}/><div style={{flex:1,padding:p}}>{tl}{bl(2)}</div></div>;
  if(id==="gallery") return <div style={{...bx,display:"flex",flexDirection:"column",padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.06,flex:1}}><div style={{flex:1,background:`${a}12`,borderRadius:r*0.4}}/><div style={{flex:1,background:`${a}08`,borderRadius:r*0.4}}/></div></div>;
  if(id==="mockup") return <div style={{...bx,display:"flex",alignItems:"center",justifyContent:"center",gap:W*0.08}}>{bar}<div style={{padding:p}}>{tl}{bl(2)}</div><div style={{width:H*0.25,height:H*0.45,borderRadius:r*0.3,border:`1.5px solid ${a}50`,background:`${a}08`,flexShrink:0}}/></div>;
  if(id==="swot") return <div style={{...bx,padding:Math.max(2,p*0.5)}}>{bar}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:H*0.03,height:"90%"}}>{["#22c55e","#f59e0b","#3b82f6","#ef4444"].map((c,i)=><div key={i} style={{borderRadius:r*0.4,background:`${c}12`,border:`0.5px solid ${c}35`}}/>)}</div></div>;
  if(id==="org_chart") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:H*0.04}}>{bar}<div style={{width:H*0.35,height:H*0.14,borderRadius:r*0.4,background:a}}/><div style={{width:0.5,height:H*0.08,background:a}}/><div style={{display:"flex",gap:H*0.06}}>{[0,1,2].map(i=><div key={i} style={{width:H*0.22,height:H*0.12,borderRadius:r*0.3,border:`0.5px solid ${a}50`}}/>)}</div></div>;
  if(id==="team") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.06,marginTop:H*0.08,justifyContent:"center"}}>{[0,1,2,3].map(i=><div key={i} style={{textAlign:"center"}}><div style={{width:H*0.16,height:H*0.16,borderRadius:"50%",background:`${a}25`,margin:"0 auto"}}/><div style={{width:H*0.2,height:H*0.03,background:`${t}15`,borderRadius:1,marginTop:H*0.03}}/></div>)}</div></div>;
  if(id==="pricing") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{display:"flex",gap:H*0.04,marginTop:H*0.06}}>{[0,1,2].map(i=><div key={i} style={{flex:1,borderRadius:r*0.4,border:`${i===1?"1.5":"0.5"}px solid ${i===1?a:`${a}30`}`,padding:H*0.03,textAlign:"center"}}><div style={{fontSize:Math.max(5,H*0.14),fontWeight:900,color:i===1?a:t,opacity:i===1?1:0.5}}>$</div></div>)}</div></div>;
  if(id==="faq") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[0,1,2].map(i=><div key={i} style={{padding:H*0.03,borderRadius:r*0.3,background:`${a}${i===0?"12":"06"}`,marginTop:H*0.03,display:"flex",justifyContent:"space-between"}}><div style={{width:`${55-i*5}%`,height:H*0.04,background:t,opacity:0.2,borderRadius:1}}/><div style={{fontSize:Math.max(4,H*0.08),color:a}}>+</div></div>)}</div></div>;
  if(id==="contact"||id==="thankyou"||id==="qna") return <div style={{...bx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{bar}<div style={{fontSize:Math.max(6,H*0.2),fontWeight:900,color:a,opacity:0.5}}>{id==="thankyou"?"Thanks":id==="qna"?"Q&A":"Contact"}</div><div style={{width:"40%",height:H*0.04,background:`${t}15`,borderRadius:1,marginTop:H*0.06}}/></div>;
  if(id==="references") return <div style={{...bx,padding:p}}>{bar}{tl}<div style={{marginTop:H*0.06}}>{[0,1,2,3].map(i=><div key={i} style={{display:"flex",gap:H*0.03,marginTop:H*0.03}}><div style={{width:H*0.04,height:H*0.04,background:a,borderRadius:1,flexShrink:0,marginTop:1}}/><div style={{width:`${65-i*8}%`,height:H*0.04,background:t,opacity:0.15,borderRadius:1}}/></div>)}</div></div>;
  if(id==="image_right") return <div style={{...bx,display:"flex"}}>{bar}<div style={{flex:1,padding:p}}>{tl}{ln}{bl()}</div><div style={{width:"35%",background:`${a}12`}}/></div>;
  if(id==="image_left") return <div style={{...bx,display:"flex"}}>{bar}<div style={{width:"35%",background:`${a}12`}}/><div style={{flex:1,padding:p}}>{tl}{ln}{bl()}</div></div>;
  if(id==="image_full") return <div style={{...bx,background:`${a}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"50%",height:H*0.08,background:"#fff",borderRadius:1,opacity:0.7}}/></div>;
  return <div style={{...bx,padding:p}}>{bar}{tl}{ln}{bl()}</div>;
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
  const [aiOutline, setAiOutline] = useState(null);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [hoveredLayout, setHoveredLayout] = useState(null);
  const [layoutCatOpen, setLayoutCatOpen] = useState(null);
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

  // ── AI 구성안 추천 ──
  const getOutline = async () => {
    if (!topic.trim()) return;
    setOutlineLoading(true); setAiOutline(null);
    try {
      const r = await callClaude(
`PPT 발표 구성 전문가. 이모지 금지.

주제: ${topic}
${detail ? `요구사항: ${detail}` : ""}
슬라이드: ${slideCount}장

${slideCount}장의 슬라이드 구성안을 추천하세요.
각 슬라이드: 번호, 제목, 레이아웃 추천(${LAYOUTS.map(l=>l.id).join(",")} 중 택1), 핵심 내용 1줄

JSON만: {"outline":[{"no":1,"title":"표지","layout":"title_only","desc":"주제 및 발표자 소개"}]}`, 1500);
      const cleaned = r.replace(/```json\n?/g,"").replace(/```/g,"").trim();
      let data;
      try { data = JSON.parse(cleaned); } catch { const m=cleaned.match(/\{[\s\S]*\}/); if(m) data=JSON.parse(m[0]); }
      if (data?.outline) setAiOutline(data.outline);
    } catch {}
    setOutlineLoading(false);
  };

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

사용 가능한 레이아웃:
기본: title_only(표지), title_body(제목+본문), section(섹션구분)
리스트: bullets(불릿), numbered(넘버링1,2,3), icon_grid(아이콘 4칸 그리드)
비교: two_column(2단), comparison(VS비교), table(표-rows배열)
데이터: stats(숫자강조), chart_bar(막대차트-bars배열), chart_pie(원형차트-segments배열), progress(진행률-bars배열)
프로세스: timeline(타임라인), steps(단계), pyramid(피라미드)
강조: quote(인용), big_number(핵심숫자)
이미지: image_right, image_left, image_full
프레임: swot(SWOT분석-swot객체), org_chart(조직도-orgItems배열)

슬라이드 JSON 필드:
- title, subtitle, body, layout, icon(아이콘키), note(발표노트)
- bullets: 배열 (bullets/numbered/timeline/steps/icon_grid/pyramid)
- stats: [{value:"85%",label:"만족도"}] (stats/big_number)
- leftCol/rightCol: 텍스트 (two_column/comparison)
- rows: [["항목","A","B"],["가격","100","200"]] (table용 2차원배열)
- bars: [{label:"항목",value:75}] (chart_bar/progress)
- segments: [{label:"A",value:40},{label:"B",value:60}] (chart_pie)
- swot: {s:"강점",w:"약점",o:"기회",t:"위협"} (swot)
- orgItems: [{role:"CEO",name:"대표"},{role:"CTO",name:"기술이사"}] (org_chart)

기획 규칙:
1. 1번: 표지(title_only) - 주제+발표자 placeholder
2. 2번: 목차(numbered) - 전체 흐름 4~6개
3. 중간: 최대한 다양한 레이아웃을 골고루 사용
   - 수치 → stats/chart_bar/chart_pie/progress 중 택1
   - 비교 → comparison/table
   - 과정 → timeline/steps
   - 분석 → swot
   - 조직 → org_chart
   - 강조 → quote/big_number
   - 파트 전환 → section
4. 마지막 2번째: 요약(bullets)
5. 마지막: Q&A/감사(title_only)
6. 같은 레이아웃 연속 사용 금지 (다양하게 배합)
7. body/bullets에 구체적 수치, 사례, 근거 포함

JSON만: {"slides":[...]}`, Math.max(slideCount * 400, 5000));

      const parsed = parseSlides(r);
      if (!parsed?.length) throw new Error("슬라이드 파싱 실패");
      setSlides(parsed.map((s,i) => ({
        ...s, id:i, layout:s.layout||"title_body",
        icon:s.icon||"", image:null,
        stats:s.stats||[], leftCol:s.leftCol||"", rightCol:s.rightCol||"",
        rows:s.rows||[], bars:s.bars||[], segments:s.segments||[],
        swot:s.swot||null, orgItems:s.orgItems||[],
        titleSize:28, bodySize:16, showPageNum:i>0,
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
    const isSection = lay === "section";
    const hasImg = s.image && ["image_right","image_left","image_full"].includes(lay);
    // 커스텀 색상 (슬라이드별 오버라이드)
    const sBg = s.customBg || (isSection ? theme.accent : theme.bg);
    const sText = s.customTextColor || theme.text;
    const sAccent = s.customAccent || theme.accent;
    const sBody = s.customBodyColor || theme.body;
    const sSub = theme.sub;
    // 글꼴 크기 (mini일때 축소)
    const tSz = mini ? Math.max(7, (s.titleSize||28)*0.38) : (s.titleSize||28);
    const bSz = mini ? Math.max(5, (s.bodySize||16)*0.38) : (s.bodySize||16);
    // 그라데이션
    const bgStyle = s.gradient
      ? { background:`linear-gradient(${s.gradientAngle||135}deg, ${s.customBg||theme.bg}, ${s.gradientEnd||theme.accent}20)` }
      : { background:sBg };

    return (
      <div style={{ width:"100%", aspectRatio:"16/9", ...bgStyle, borderRadius:mini?4:8, overflow:"hidden", position:"relative", display:"flex", flexDirection:"column" }}>
        {!isSection && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"5%", background:sAccent }} />}
        {/* 로고/워터마크 */}
        {s.logoText && !mini && <div style={{ position:"absolute", top:"4%", right:"4%", fontSize:11, fontWeight:700, color:sAccent, opacity:0.6 }}>{s.logoText}</div>}

        {isSection ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8%" }}>
            <div style={{ fontSize:mini?10:24, fontWeight:900, color:theme.bg, textAlign:"center" }}>{s.title||""}</div>
            {s.subtitle && <div style={{ fontSize:mini?7:14, color:theme.bg, opacity:0.8, marginTop:6 }}>{s.subtitle}</div>}
          </div>
        ) : lay === "title_only" ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"6%" }}>
            <div style={{ fontSize:mini?Math.max(9,tSz*0.4):tSz, fontWeight:900, color:sText, textAlign:"center", lineHeight:1.4,
              ...(s.highlight?{background:`${sAccent}25`,padding:"4px 16px",borderRadius:8}:{}) }}>{s.title||""}</div>
            {s.subtitle && <div style={{ fontSize:mini?7:bSz, color:sSub, marginTop:8, textAlign:"center" }}>{s.subtitle}</div>}
            {s.body && <div style={{ fontSize:mini?6:bSz*0.85, color:sBody, marginTop:6, textAlign:"center", lineHeight:1.7, whiteSpace:"pre-line" }}>{(s.body||"").replace(/\\n/g,"\n")}</div>}
          </div>
        ) : lay === "stats" ? (
          <div style={{ flex:1, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:4 }}>{s.title||""}</div>
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
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:4 }}>{s.title||""}</div>
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
              <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:4 }}>{s.title||""}</div>
              <div style={{ width:30, height:2, background:theme.accent, borderRadius:1, marginBottom:mini?6:12 }} />
              {lay === "bullets" && (s.bullets||[]).length > 0 ? (
                <div style={{ flex:1 }}>
                  {(s.bullets||[]).map((b,j) => (
                    <div key={j} style={{ display:"flex", gap:mini?3:8, marginBottom:mini?2:6, alignItems:"flex-start" }}>
                      <div style={{ width:mini?3:5, height:mini?3:5, borderRadius:"50%", background:theme.accent, marginTop:mini?3:6, flexShrink:0 }} />
                      <div style={{ fontSize:mini?6:13, color:sBody, lineHeight:1.6, fontSize:mini?Math.max(4,bSz*0.35):bSz*0.85 }}>{b}</div>
                    </div>
                  ))}
                </div>
              ) : (lay === "two_column" || lay === "comparison") ? (
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:mini?4:12 }}>
                  <div style={{ fontSize:mini?5:12, color:sBody, lineHeight:1.6, fontSize:mini?Math.max(4,bSz*0.35):bSz*0.85, whiteSpace:"pre-line" }}>{(s.leftCol||(s.body||"").slice(0,Math.ceil((s.body||"").length/2))).replace(/\\n/g,"\n")}</div>
                  <div style={{ fontSize:mini?5:12, color:sBody, lineHeight:1.6, fontSize:mini?Math.max(4,bSz*0.35):bSz*0.85, whiteSpace:"pre-line", borderLeft:`1px solid ${theme.accent}30`, paddingLeft:mini?4:10 }}>{(s.rightCol||(s.body||"").slice(Math.ceil((s.body||"").length/2))).replace(/\\n/g,"\n")}</div>
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

        {/* 표 */}
        {lay==="table" && s.rows?.length>0 && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:mini?5:12, color:theme.body }}>
                <tbody>
                  {s.rows.map((row,ri)=>(
                    <tr key={ri}>
                      {row.map((cell,ci)=>(
                        <td key={ci} style={{ padding:mini?"2px 3px":"8px 12px", border:`1px solid ${theme.accent}30`,
                          background:ri===0?`${theme.accent}20`:"transparent",
                          fontWeight:ri===0||ci===0?700:400, color:ri===0?theme.accent:theme.body }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* 막대 차트 */}
        {lay==="chart_bar" && (s.bars||[]).length>0 && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:mini?3:12, padding:"0 5% 8%" }}>
              {s.bars.map((b,j)=>{
                const max = Math.max(...s.bars.map(x=>x.value||0),1);
                return <div key={j} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:mini?2:6 }}>
                  <div style={{ fontSize:mini?5:11, fontWeight:700, color:theme.accent }}>{b.value||0}%</div>
                  <div style={{ width:"70%", height:`${Math.max((b.value||0)/max*100,5)}%`, background:theme.accent, borderRadius:mini?2:4, minHeight:mini?4:10 }} />
                  <div style={{ fontSize:mini?4:10, color:theme.body, textAlign:"center" }}>{b.label||""}</div>
                </div>;
              })}
            </div>
          </div>
        )}
        {/* 원형 차트 */}
        {lay==="chart_pie" && (s.segments||[]).length>0 && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:mini?8:30 }}>
              <div style={{ width:mini?40:120, height:mini?40:120, borderRadius:"50%", background:`conic-gradient(${s.segments.map((seg,j)=>{
                const colors = [theme.accent,"#f59e0b","#ef4444","#22c55e","#3b82f6","#ec4899"];
                const total = s.segments.reduce((a,x)=>a+(x.value||0),0)||1;
                const start = s.segments.slice(0,j).reduce((a,x)=>a+(x.value||0),0)/total*360;
                const end = start+((seg.value||0)/total*360);
                return `${colors[j%6]} ${start}deg ${end}deg`;
              }).join(",")})`, flexShrink:0 }} />
              <div style={{ display:"flex", flexDirection:"column", gap:mini?2:6 }}>
                {s.segments.map((seg,j)=>{
                  const colors = [theme.accent,"#f59e0b","#ef4444","#22c55e","#3b82f6","#ec4899"];
                  return <div key={j} style={{ display:"flex", alignItems:"center", gap:mini?3:8 }}>
                    <div style={{ width:mini?5:10, height:mini?5:10, borderRadius:2, background:colors[j%6], flexShrink:0 }} />
                    <span style={{ fontSize:mini?5:11, color:theme.body }}>{seg.label} {seg.value}%</span>
                  </div>;
                })}
              </div>
            </div>
          </div>
        )}
        {/* 진행률 */}
        {lay==="progress" && (s.bars||[]).length>0 && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:mini?4:14, padding:"0 3%" }}>
              {s.bars.map((b,j)=>(
                <div key={j}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:mini?2:4 }}>
                    <span style={{ fontSize:mini?5:12, color:theme.body }}>{b.label}</span>
                    <span style={{ fontSize:mini?5:12, fontWeight:700, color:theme.accent }}>{b.value||0}%</span>
                  </div>
                  <div style={{ height:mini?3:8, borderRadius:4, background:`${theme.accent}20`, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(b.value||0,100)}%`, background:theme.accent, borderRadius:4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 넘버링 리스트 */}
        {lay==="numbered" && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1 }}>
              {(s.bullets||[]).map((b,j)=>(
                <div key={j} style={{ display:"flex", gap:mini?4:12, marginBottom:mini?3:10, alignItems:"flex-start" }}>
                  <div style={{ width:mini?12:28, height:mini?12:28, borderRadius:"50%", background:theme.accent, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:mini?6:13, fontWeight:900, color:theme.bg, flexShrink:0 }}>{j+1}</div>
                  <div style={{ fontSize:mini?6:13, color:theme.body, lineHeight:1.5, paddingTop:mini?1:5 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 아이콘 그리드 */}
        {lay==="icon_grid" && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:12 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:mini?4:12 }}>
              {(s.bullets||[]).slice(0,4).map((b,j)=>{
                const icons = ["◆","◎","★","●"];
                return <div key={j} style={{ borderRadius:mini?3:10, background:`${theme.accent}10`, border:`1px solid ${theme.accent}25`, padding:mini?"3px":"12px 14px", display:"flex", alignItems:"center", gap:mini?3:10 }}>
                  <div style={{ fontSize:mini?8:22, color:theme.accent }}>{icons[j%4]}</div>
                  <div style={{ fontSize:mini?5:12, color:theme.body, lineHeight:1.4 }}>{b}</div>
                </div>;
              })}
            </div>
          </div>
        )}
        {/* 큰 숫자 */}
        {lay==="big_number" && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"6%" }}>
            <div style={{ fontSize:mini?7:14, color:theme.sub, marginBottom:mini?4:12 }}>{s.title||""}</div>
            <div style={{ fontSize:mini?24:72, fontWeight:900, color:theme.accent, letterSpacing:-2 }}>{(s.stats||[])[0]?.value||"0"}</div>
            <div style={{ fontSize:mini?7:16, color:theme.body, marginTop:mini?3:10 }}>{(s.stats||[])[0]?.label||""}</div>
          </div>
        )}
        {/* SWOT */}
        {lay==="swot" && s.swot && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||"SWOT 분석"}</div>
            <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", gap:mini?2:8 }}>
              {[["S","강점",s.swot.s,"#22c55e"],["W","약점",s.swot.w,"#f59e0b"],["O","기회",s.swot.o,"#3b82f6"],["T","위협",s.swot.t,"#ef4444"]].map(([k,l,v,c])=>(
                <div key={k} style={{ borderRadius:mini?3:10, border:`2px solid ${c}40`, background:`${c}08`, padding:mini?"3px":"10px 14px" }}>
                  <div style={{ fontSize:mini?7:14, fontWeight:900, color:c, marginBottom:mini?2:6 }}>{k} - {l}</div>
                  <div style={{ fontSize:mini?5:11, color:theme.body, lineHeight:1.5 }}>{v||""}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 조직도 */}
        {lay==="org_chart" && (s.orgItems||[]).length>0 && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||"조직도"}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:mini?3:8 }}>
              {/* CEO (첫 번째) */}
              {s.orgItems[0] && <div style={{ padding:mini?"3px 8px":"10px 24px", borderRadius:mini?3:10, background:theme.accent, color:theme.bg, textAlign:"center" }}>
                <div style={{ fontSize:mini?6:14, fontWeight:800 }}>{s.orgItems[0].role}</div>
                <div style={{ fontSize:mini?5:11 }}>{s.orgItems[0].name}</div>
              </div>}
              {s.orgItems.length>1 && <div style={{ width:2, height:mini?4:16, background:theme.accent }} />}
              <div style={{ display:"flex", gap:mini?4:12, flexWrap:"wrap", justifyContent:"center" }}>
                {s.orgItems.slice(1).map((o,j)=>(
                  <div key={j} style={{ padding:mini?"3px 6px":"8px 18px", borderRadius:mini?3:8, border:`2px solid ${theme.accent}40`, background:`${theme.accent}08`, textAlign:"center" }}>
                    <div style={{ fontSize:mini?5:12, fontWeight:700, color:theme.accent }}>{o.role}</div>
                    <div style={{ fontSize:mini?4:10, color:theme.body }}>{o.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* 단계 프로세스 */}
        {lay==="steps" && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:mini?1:6 }}>
              {(s.bullets||[]).slice(0,5).map((item,j)=>(
                <div key={j} style={{ flex:1, display:"flex", alignItems:"center" }}>
                  <div style={{ flex:1, padding:mini?"3px":"10px 8px", background:`${theme.accent}${j===0?"30":"12"}`, borderRadius:mini?3:8, textAlign:"center",
                    border:j===0?`2px solid ${theme.accent}`:"none" }}>
                    <div style={{ fontSize:mini?5:10, fontWeight:800, color:theme.accent, marginBottom:mini?1:4 }}>STEP {j+1}</div>
                    <div style={{ fontSize:mini?4:11, color:theme.body }}>{item}</div>
                  </div>
                  {j<(s.bullets||[]).length-1 && <div style={{ fontSize:mini?6:16, color:theme.accent, margin:mini?"0 1px":"0 4px", flexShrink:0 }}>→</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 피라미드 */}
        {lay==="pyramid" && (
          <div style={{ position:"absolute", inset:0, padding:"4% 5%", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:mini?Math.max(7,tSz*0.38):tSz*0.72, fontWeight:800, color:sText, marginBottom:mini?4:10 }}>{s.title||""}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:mini?1:4 }}>
              {(s.bullets||[]).slice(0,5).map((item,j,arr)=>{
                const w = 30 + (j/(arr.length-1||1)) * 70;
                return <div key={j} style={{ width:`${w}%`, padding:mini?"2px":"8px 14px", background:`${theme.accent}${Math.round(20+j*12).toString(16)}`,
                  borderRadius:mini?2:6, textAlign:"center", fontSize:mini?5:12, color:j<2?theme.bg:theme.body, fontWeight:j<2?700:400 }}>{item}</div>;
              })}
            </div>
          </div>
        )}

        {/* 페이지 번호 */}
        {s.showPageNum!==false && idx > 0 && !isSection && <div style={{ position:"absolute", bottom:"7%", right:"4%", fontSize:mini?5:9, color:theme.sub }}>{idx+1}</div>}
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

        {/* AI 구성안 추천 */}
        {topic.trim() && (
          <div style={{ marginBottom:16 }}>
            <button onClick={getOutline} disabled={outlineLoading}
              style={{ width:"100%", padding:"12px", borderRadius:10, border:`1px solid ${accent}40`, background:`${accent}08`,
                color:accent, fontSize:13, fontWeight:700, cursor:outlineLoading?"not-allowed":"pointer", opacity:outlineLoading?0.6:1 }}>
              {outlineLoading ? "AI 구성안 분석 중..." : "AI 구성안 미리보기 (무료)"}
            </button>
            {aiOutline && (
              <div style={{ marginTop:10, borderRadius:12, border:`1px solid ${accent}25`, background:`${accent}05`, padding:"14px 16px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:10 }}>AI 추천 구성안 ({aiOutline.length}장)</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {aiOutline.map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"6px 8px", borderRadius:7, background:i%2===0?`${accent}06`:"transparent" }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:`${accent}20`, display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:10, fontWeight:900, color:accent, flexShrink:0 }}>{item.no||i+1}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:text }}>{item.title}</div>
                        <div style={{ fontSize:10, color:muted }}>{item.desc} <span style={{ color:accent, fontSize:9, opacity:0.7 }}>[{item.layout}]</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:muted, marginTop:8 }}>구성안이 마음에 들면 아래 버튼으로 전체 내용을 생성하세요.</div>
              </div>
            )}
          </div>
        )}

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
            {/* 레이아웃 (시각 미니프리뷰 + 호버 확대) */}
            <div style={{ marginBottom:10, position:"relative" }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>레이아웃 ({LAYOUTS.length}종)</div>
              {/* 호버시 확대 프리뷰 */}
              {hoveredLayout && (()=>{
                const hl = LAYOUTS.find(l=>l.id===hoveredLayout);
                if(!hl) return null;
                return <div style={{ position:"absolute", zIndex:99999, pointerEvents:"none",
                  right:"calc(100% + 12px)", top:0,
                  width:340, background:D?"rgba(10,8,30,0.97)":"rgba(255,255,255,0.97)",
                  borderRadius:12, border:`1px solid ${accent}40`, padding:12,
                  boxShadow:D?"0 12px 40px rgba(0,0,0,0.6)":"0 12px 40px rgba(0,0,0,0.15)", backdropFilter:"blur(12px)" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:6 }}>{hl.label} <span style={{ fontSize:10, color:muted, fontWeight:400 }}>{hl.cat}</span></div>
                  <MiniSlidePreview layoutId={hoveredLayout} W={316} H={178} theme={theme} />
                </div>;
              })()}
              {[...new Set(LAYOUTS.map(l=>l.cat))].map(cat=>{
                const isOpen = layoutCatOpen===cat || layoutCatOpen===null;
                const items = LAYOUTS.filter(l=>l.cat===cat);
                return (
                  <div key={cat} style={{ marginBottom:4 }}>
                    <button onClick={()=>setLayoutCatOpen(layoutCatOpen===cat?null:cat)}
                      style={{ display:"flex", alignItems:"center", gap:4, width:"100%", padding:"3px 2px", border:"none", background:"transparent", cursor:"pointer", fontSize:9, fontWeight:700, color:muted }}>
                      <span style={{ transform:isOpen?"rotate(90deg)":"none", transition:"transform 0.15s", fontSize:8 }}>▶</span>
                      {cat} <span style={{ fontSize:8, opacity:0.6 }}>({items.length})</span>
                    </button>
                    {isOpen && (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3, marginTop:2 }}>
                        {items.map(l=>{
                          const sel = cur.layout===l.id;
                          return (
                            <button key={l.id} onClick={()=>upd("layout",l.id)}
                              onMouseEnter={()=>setHoveredLayout(l.id)}
                              onMouseLeave={()=>setHoveredLayout(null)}
                              style={{ padding:"3px", borderRadius:5, border:`1.5px solid ${sel?accent:"transparent"}`,
                                background:sel?`${accent}12`:"transparent", cursor:"pointer", textAlign:"center",
                                transition:"all 0.1s" }}>
                              <MiniSlidePreview layoutId={l.id} W={52} H={30} theme={theme} />
                              <div style={{ fontSize:7, fontWeight:sel?700:400, color:sel?accent:muted, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
            {/* 표/테이블 */}
            {cur.layout==="table" && <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>표 데이터 (행별로)</div>
              {(cur.rows||[]).map((row,j)=>(
                <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                  {row.map((cell,k)=>(
                    <input key={k} value={cell} onChange={e=>{const n=(cur.rows||[]).map(r=>[...r]);n[j][k]=e.target.value;upd("rows",n);}} style={{ ...inp, fontSize:9, padding:"4px 6px", flex:1 }} />
                  ))}
                  <button onClick={()=>upd("rows",(cur.rows||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>x</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:3 }}>
                <button onClick={()=>{const cols=(cur.rows?.[0]?.length)||3;upd("rows",[...(cur.rows||[]),Array(cols).fill("")]);}} style={{ flex:1, padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 행 추가</button>
                <button onClick={()=>upd("rows",(cur.rows||[]).map(r=>[...r,""]))} style={{ flex:1, padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 열 추가</button>
              </div>
            </div>}
            {/* 차트 bars */}
            {(cur.layout==="chart_bar"||cur.layout==="progress") && <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>데이터 항목</div>
              {(cur.bars||[]).map((b,j)=>(
                <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                  <input value={b.label||""} onChange={e=>{const n=[...(cur.bars||[])];n[j]={...n[j],label:e.target.value};upd("bars",n);}} placeholder="항목명" style={{ ...inp, fontSize:10, padding:"4px 8px", flex:1 }} />
                  <input type="number" value={b.value||0} onChange={e=>{const n=[...(cur.bars||[])];n[j]={...n[j],value:Number(e.target.value)};upd("bars",n);}} style={{ ...inp, fontSize:10, padding:"4px 8px", width:50 }} />
                  <button onClick={()=>upd("bars",(cur.bars||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>x</button>
                </div>
              ))}
              <button onClick={()=>upd("bars",[...(cur.bars||[]),{label:"",value:50}])} style={{ width:"100%", padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 추가</button>
            </div>}
            {/* 원형 차트 */}
            {cur.layout==="chart_pie" && <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>비율 항목 (%)</div>
              {(cur.segments||[]).map((s,j)=>(
                <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                  <input value={s.label||""} onChange={e=>{const n=[...(cur.segments||[])];n[j]={...n[j],label:e.target.value};upd("segments",n);}} placeholder="항목" style={{ ...inp, fontSize:10, padding:"4px 8px", flex:1 }} />
                  <input type="number" value={s.value||0} onChange={e=>{const n=[...(cur.segments||[])];n[j]={...n[j],value:Number(e.target.value)};upd("segments",n);}} style={{ ...inp, fontSize:10, padding:"4px 8px", width:50 }} />
                  <button onClick={()=>upd("segments",(cur.segments||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>x</button>
                </div>
              ))}
              <button onClick={()=>upd("segments",[...(cur.segments||[]),{label:"",value:25}])} style={{ width:"100%", padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 추가</button>
            </div>}
            {/* SWOT */}
            {cur.layout==="swot" && <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>SWOT 분석</div>
              {[["s","S (강점)","#22c55e"],["w","W (약점)","#f59e0b"],["o","O (기회)","#3b82f6"],["t","T (위협)","#ef4444"]].map(([k,l,c])=>(
                <div key={k} style={{ marginBottom:4 }}>
                  <div style={{ fontSize:9, color:c, fontWeight:700, marginBottom:2 }}>{l}</div>
                  <textarea value={(cur.swot||{})[k]||""} onChange={e=>upd("swot",{...(cur.swot||{}), [k]:e.target.value})} rows={2} style={{ ...inp, fontSize:10, resize:"vertical" }} />
                </div>
              ))}
            </div>}
            {/* 조직도 */}
            {cur.layout==="org_chart" && <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>조직 구성원</div>
              {(cur.orgItems||[]).map((o,j)=>(
                <div key={j} style={{ display:"flex", gap:3, marginBottom:3 }}>
                  <input value={o.role||""} onChange={e=>{const n=[...(cur.orgItems||[])];n[j]={...n[j],role:e.target.value};upd("orgItems",n);}} placeholder="직책" style={{ ...inp, fontSize:10, padding:"4px 8px", flex:1 }} />
                  <input value={o.name||""} onChange={e=>{const n=[...(cur.orgItems||[])];n[j]={...n[j],name:e.target.value};upd("orgItems",n);}} placeholder="이름" style={{ ...inp, fontSize:10, padding:"4px 8px", flex:1 }} />
                  <button onClick={()=>upd("orgItems",(cur.orgItems||[]).filter((_,k)=>k!==j))} style={{ border:"none", background:"transparent", color:"#f87171", fontSize:10, cursor:"pointer" }}>x</button>
                </div>
              ))}
              <button onClick={()=>upd("orgItems",[...(cur.orgItems||[]),{role:"",name:""}])} style={{ width:"100%", padding:"4px", borderRadius:5, border:`1px dashed ${bdr}`, background:"transparent", color:accent, fontSize:9, cursor:"pointer" }}>+ 추가</button>
            </div>}
            {/* 글꼴 크기 + 페이지번호 */}
            <div style={{ borderTop:`1px solid ${bdr}`, paddingTop:8, marginTop:4, marginBottom:8 }}>
              <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:muted, marginBottom:3 }}>제목 크기 ({cur.titleSize||28}px)</div>
                  <input type="range" min={16} max={52} value={cur.titleSize||28} onChange={e=>upd("titleSize",Number(e.target.value))} style={{ width:"100%", accentColor:accent }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, color:muted, marginBottom:3 }}>본문 크기 ({cur.bodySize||16}px)</div>
                  <input type="range" min={10} max={28} value={cur.bodySize||16} onChange={e=>upd("bodySize",Number(e.target.value))} style={{ width:"100%", accentColor:accent }} />
                </div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:muted, cursor:"pointer" }}>
                <input type="checkbox" checked={cur.showPageNum!==false} onChange={e=>upd("showPageNum",e.target.checked)} style={{ accentColor:accent }} />
                페이지 번호 표시
              </label>
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:3 }}>발표 노트</div>
              <textarea value={cur.note||""} onChange={e=>upd("note",e.target.value)} rows={2} style={{ ...inp, fontSize:10, resize:"vertical" }} placeholder="발표자 참고 메모" />
            </div>
          </>}

          {/* ── 스타일 탭 ── */}
          {editTab === "style" && <>
            {/* 테마 프리셋 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>테마 프리셋</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
                {THEMES.map(t=>(
                  <button key={t.id} onClick={()=>setThemeId(t.id)}
                    style={{ padding:"6px 3px", borderRadius:6, border:`1.5px solid ${themeId===t.id?accent:"transparent"}`, cursor:"pointer", textAlign:"center", background:themeId===t.id?`${accent}10`:"transparent" }}>
                    <div style={{ display:"flex", gap:2, justifyContent:"center", marginBottom:2 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:t.bg, border:"1px solid rgba(128,128,128,0.3)" }} />
                      <div style={{ width:10, height:10, borderRadius:2, background:t.accent }} />
                    </div>
                    <div style={{ fontSize:9, fontWeight:themeId===t.id?700:400, color:themeId===t.id?accent:muted }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 슬라이드별 커스텀 색상 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:6 }}>이 슬라이드 색상 커스텀</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {[
                  ["customBg","배경색",cur.customBg||theme.bg],
                  ["customTextColor","제목색",cur.customTextColor||theme.text],
                  ["customAccent","강조색",cur.customAccent||theme.accent],
                  ["customBodyColor","본문색",cur.customBodyColor||theme.body],
                ].map(([k,label,val])=>(
                  <div key={k}>
                    <div style={{ fontSize:9, color:muted, marginBottom:3 }}>{label}</div>
                    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                      <input type="color" value={val} onChange={e=>upd(k,e.target.value)}
                        style={{ width:28, height:24, borderRadius:4, border:`1px solid ${bdr}`, cursor:"pointer", padding:1 }} />
                      <span style={{ fontSize:9, color:muted }}>{val}</span>
                      {cur[k] && <button onClick={()=>upd(k,undefined)} style={{ fontSize:8, padding:"1px 4px", borderRadius:3, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer" }}>x</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 그라데이션 */}
            <div style={{ marginBottom:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:muted, cursor:"pointer", marginBottom:4 }}>
                <input type="checkbox" checked={!!cur.gradient} onChange={e=>upd("gradient",e.target.checked)} style={{ accentColor:accent }} />
                배경 그라데이션
              </label>
              {cur.gradient && (
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={cur.gradientEnd||theme.accent} onChange={e=>upd("gradientEnd",e.target.value)}
                    style={{ width:28, height:24, borderRadius:4, border:`1px solid ${bdr}`, cursor:"pointer" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:8, color:muted, marginBottom:2 }}>각도 {cur.gradientAngle||135}</div>
                    <input type="range" min={0} max={360} value={cur.gradientAngle||135} onChange={e=>upd("gradientAngle",Number(e.target.value))} style={{ width:"100%", accentColor:accent }} />
                  </div>
                </div>
              )}
            </div>

            {/* 로고/워터마크 텍스트 */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:muted, marginBottom:4 }}>로고/워터마크 텍스트</div>
              <input value={cur.logoText||""} onChange={e=>upd("logoText",e.target.value)}
                style={{ ...inp, fontSize:11, padding:"7px 10px" }} placeholder="회사명, 브랜드명 등" />
            </div>

            {/* 하이라이트 */}
            <div style={{ marginBottom:10 }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:muted, cursor:"pointer" }}>
                <input type="checkbox" checked={!!cur.highlight} onChange={e=>upd("highlight",e.target.checked)} style={{ accentColor:accent }} />
                제목 하이라이트 효과
              </label>
            </div>

            {/* 전체 슬라이드 스타일 일괄 적용 */}
            <button onClick={()=>{
              const keys=["customBg","customTextColor","customAccent","customBodyColor","gradient","gradientEnd","gradientAngle","logoText","highlight","titleSize","bodySize","showPageNum"];
              setSlides(p=>p.map((sl,i)=>{
                if(i===selIdx) return sl;
                const n={...sl};
                keys.forEach(k=>{ if(cur[k]!==undefined) n[k]=cur[k]; else delete n[k]; });
                return n;
              }));
            }} style={{ width:"100%", padding:"8px", borderRadius:7, border:`1px solid rgba(74,222,128,0.3)`, background:"rgba(74,222,128,0.06)", color:"#4ade80", fontSize:10, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
              현재 스타일 전체 적용
            </button>

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
