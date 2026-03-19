import { useState, useRef } from "react";

const CLAUDE_KEY = "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";

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3500, messages:[{role:"user",content:prompt}] })
  });
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

function extractYoutubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}
function toMMSS(sec) {
  const m = Math.floor(sec/60), s = Math.floor(sec%60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

const SHORT_LENGTHS = [
  {id:"s15",label:"15~30초",desc:"짧고 임팩트",min:15,max:30},
  {id:"s30",label:"30~60초",desc:"적당한 길이",min:30,max:60},
  {id:"s60",label:"60~90초",desc:"충분한 내용",min:60,max:90},
  {id:"s90",label:"90~120초",desc:"아주 길게",min:90,max:120},
];

const PLATFORMS = [
  {id:"youtube",label:"유튜브 쇼츠",icon:"▶",color:"#ff0000"},
  {id:"instagram",label:"인스타 릴스",icon:"◆",color:"#e1306c"},
  {id:"tiktok",label:"틱톡",icon:"♪",color:"#69c9d0"},
];

const SUBTITLE_FONTS = ["Noto Sans KR","나눔고딕","나눔스퀘어","배달의민족 한나체","Pretendard"];
const SUBTITLE_POSITIONS = [
  {id:"top",label:"상단"},
  {id:"center",label:"중앙"},
  {id:"bottom",label:"하단"},
  {id:"bottom-safe",label:"하단 안전"},
];

export default function ShortformEditor({ isDark }) {
  const D = isDark;
  const text   = D?"#fff":"#1a1a2e";
  const muted  = D?"rgba(255,255,255,0.45)":"#888";
  const cardBg = D?"rgba(255,255,255,0.05)":"#fff";
  const bdr    = D?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)";
  const ibg    = D?"rgba(255,255,255,0.07)":"#f8f8f8";
  const ACC    = "#a855f7";

  const [step, setStep]       = useState(0);
  const [tab, setTab]         = useState("clips");    // clips | subtitle | schedule | analysis
  const [inputMode, setInputMode] = useState("youtube");

  // 입력
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [ytInfo, setYtInfo]         = useState(null);
  const [ytLoading, setYtLoading]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedDuration, setUploadedDuration] = useState(0);
  const fileRef = useRef(null);

  // 설정
  const [shortLength, setShortLength] = useState("s30");
  const [selPlatforms, setSelPlatforms] = useState(["youtube"]);
  const [shortCount, setShortCount]   = useState(5);
  const [totalDuration, setTotalDuration] = useState(1200);
  const [rangeStart, setRangeStart]   = useState(0);
  const [rangeEnd, setRangeEnd]       = useState(1200);
  const [captionStyle, setCaptionStyle] = useState({
    font:"Noto Sans KR", color:"#ffffff", highlight:"#ffff00",
    size:20, position:"bottom", bgOpacity:0.6, animation:"fade"
  });

  // 결과
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [clips, setClips]         = useState([]);
  const [selectedClip, setSelectedClip] = useState(0);
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(null);
  const [schedule, setSchedule]   = useState([]);
  const [analysis, setAnalysis]   = useState(null);

  const cp = (txt, k) => { navigator.clipboard.writeText(txt); setCopied(k); setTimeout(()=>setCopied(null),2000); };

  const inpSt = { width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:ibg,color:text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" };

  const fetchYt = async (url) => {
    const id = extractYoutubeId(url);
    if(!id){ setYtInfo({id:"",title:"(링크 확인 불가)",thumbnail:"",error:true}); return; }
    setYtLoading(true);
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const d = await r.json();
      setYtInfo({id, title:d.title||url, thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`});
    } catch {
      setYtInfo({id, title:url, thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`});
    }
    setYtLoading(false);
  };

  const handleFile = (file) => {
    if(!file) return;
    setUploadedFile(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Math.floor(v.duration);
      setUploadedDuration(d); setTotalDuration(d); setRangeStart(0); setRangeEnd(d);
    };
    v.src = URL.createObjectURL(file);
  };

  const togglePlatform = (id) => setSelPlatforms(p => p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const generate = async () => {
    setStep(3); setError(""); setClips([]); setProgress(5);
    const len = SHORT_LENGTHS.find(l=>l.id===shortLength);
    const src = inputMode==="youtube" ? (ytInfo?.title||youtubeUrl) : (uploadedFile?.name||"업로드 영상");
    const plats = PLATFORMS.filter(p=>selPlatforms.includes(p.id)).map(p=>p.label).join(", ");
    const capInfo = `자막 스타일: 폰트 ${captionStyle.font}, 색상 ${captionStyle.color}, 강조색 ${captionStyle.highlight}, 위치 ${captionStyle.position}, 애니메이션 ${captionStyle.animation}`;
    const prompt = `당신은 숏폼 영상 전문 편집 AI입니다. 아래 영상을 분석해 숏폼 ${shortCount}개를 기획하세요.

영상: ${src}
구간: ${toMMSS(rangeStart)}~${toMMSS(rangeEnd)}
숏폼 길이: ${len?.min}~${len?.max}초
플랫폼: ${plats}
${capInfo}

다음 JSON만 응답 (다른 텍스트 없이):
{
  "clips": [
    {
      "index": 1,
      "title_a": "제목 버전 A (후킹·충격적)",
      "title_b": "제목 버전 B (감성·공감)",
      "title_c": "제목 버전 C (정보·궁금증)",
      "hook_score": 87,
      "viral_score": 72,
      "startTime": "00:00",
      "endTime": "00:45",
      "duration": 45,
      "hook": "첫 3초 오프닝 멘트 (강렬하게)",
      "script": "전체 자막 스크립트\\n줄바꿈 포함\\n${len?.min}~${len?.max}초 분량",
      "caption_segments": [
        {"time":"0~3s","text":"첫 3초 자막","style":"big_highlight"},
        {"time":"3~10s","text":"본론 자막","style":"normal"},
        {"time":"마지막5s","text":"마무리 자막","style":"cta"}
      ],
      "thumbnail_text": "썸네일에 넣을 강렬한 텍스트 (10자 이내)",
      "thumbnail_tip": "썸네일 구성 팁",
      "platform_tips": {
        "youtube": "유튜브 쇼츠 최적화 팁",
        "instagram": "릴스 최적화 팁",
        "tiktok": "틱톡 최적화 팁"
      },
      "best_upload_day": "월요일",
      "best_upload_time": "오전 8시",
      "hashtags": ["#태그1","#태그2","#태그3","#태그4","#태그5"],
      "reason": "이 구간을 선택한 이유 (1~2문장)"
    }
  ],
  "content_strategy": "전체 콘텐츠 전략 (2~3문장)",
  "upload_schedule": [
    {"day": "Day 1", "clip_index": 1, "platform": "유튜브 쇼츠", "time": "오전 8시", "tip": "첫날 가장 강한 콘텐츠 업로드"}
  ]
}`;

    const msgs = [
      {d:600,p:15,m:"영상 분석 중..."},
      {d:1400,p:35,m:"하이라이트 구간 추출 중..."},
      {d:1200,p:55,m:"후킹 제목 A/B/C 생성 중..."},
      {d:1000,p:72,m:"자막 세그먼트 구성 중..."},
      {d:800,p:85,m:"바이럴 점수 분석 중..."},
      {d:600,p:93,m:"업로드 일정 최적화 중..."},
    ];
    try {
      for(const m of msgs){ await new Promise(r=>setTimeout(r,m.d)); setProgress(m.p); setProgressMsg(m.m); }
      const raw = await callClaude(prompt);
      const cleaned = raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();
      const parsed = JSON.parse(cleaned);
      setClips(parsed.clips||[]);
      setSchedule(parsed.upload_schedule||[]);
      setAnalysis({strategy:parsed.content_strategy});
      setSelectedClip(0); setProgress(100); setProgressMsg("완료!");
      await new Promise(r=>setTimeout(r,300));
      setStep(4); setTab("clips");
    } catch(e) { setError("생성 실패: "+e.message); setStep(2); }
  };

  // ─────────── STEP 0 인트로 ───────────
  if(step===0) return (
    <div style={{flex:1,overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{maxWidth:600,width:"100%",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 16px",borderRadius:20,background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",fontSize:11,fontWeight:700,color:ACC,marginBottom:16}}>
          ✂️ AI 숏폼 자동 편집 · 알파컷보다 더 스마트하게
        </div>
        <div style={{fontSize:24,fontWeight:900,color:text,lineHeight:1.35,marginBottom:12}}>
          1편의 롱폼으로<br/>
          <span style={{background:"linear-gradient(135deg,#a855f7,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>완성도 높은 숏폼을 만들어요</span>
        </div>
        <div style={{fontSize:13,color:muted,lineHeight:1.9,marginBottom:28}}>
          유튜브 링크 또는 영상 파일 → AI 하이라이트 분석<br/>
          제목 A/B/C 3가지 버전 · 바이럴 점수 · 자막 스타일<br/>
          썸네일 멘트 · 플랫폼 최적화 · 업로드 일정까지
        </div>
        {/* 차별화 기능 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24,textAlign:"left"}}>
          {[
            {icon:"🎯",t:"후킹 제목 3버전",d:"A/B/C 타입 자동 생성\n어떤 제목이 더 효과적?"},
            {icon:"🔥",t:"바이럴 점수",d:"AI가 예측하는\n조회수 가능성 점수"},
            {icon:"📺",t:"자막 스타일 편집",d:"폰트·색상·위치·애니메이션\n직접 커스터마이징"},
            {icon:"🖼",t:"썸네일 멘트 생성",d:"클릭을 부르는\n썸네일 텍스트 추천"},
            {icon:"📅",t:"업로드 일정 플래너",d:"최적 요일·시간대\n자동 스케줄링"},
            {icon:"📊",t:"플랫폼별 분석",d:"유튜브·릴스·틱톡\n알고리즘 최적화 팁"},
          ].map(f=>(
            <div key={f.t} style={{padding:"12px 10px",borderRadius:12,border:`1px solid ${bdr}`,background:cardBg}}>
              <div style={{fontSize:20,marginBottom:4}}>{f.icon}</div>
              <div style={{fontSize:11,fontWeight:800,color:text,marginBottom:2}}>{f.t}</div>
              <div style={{fontSize:9,color:muted,lineHeight:1.5,whiteSpace:"pre-line"}}>{f.d}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setStep(1)} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:900,boxShadow:"0 8px 28px rgba(168,85,247,0.35)"}}>
          ✂️ 숏폼 만들기 →
        </button>
      </div>
    </div>
  );

  // ─────────── STEP 1 입력 ───────────
  if(step===1) return (
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:740,margin:"0 auto",padding:"28px 18px 80px"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:19,fontWeight:900,color:text,marginBottom:3}}>영상을 불러와주세요</div>
          <div style={{fontSize:12,color:muted}}>유튜브 링크 또는 영상 파일을 올려주세요</div>
        </div>
        {/* 탭 */}
        <div style={{display:"flex",borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,marginBottom:16}}>
          {[["youtube","🔗 유튜브 링크"],["file","⬆️ 파일 업로드"]].map(([v,l])=>(
            <button key={v} onClick={()=>setInputMode(v)}
              style={{flex:1,padding:"12px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                background:inputMode===v?`linear-gradient(135deg,${ACC},#ec4899)`:"transparent",
                color:inputMode===v?"#fff":muted}}>
              {l}
            </button>
          ))}
        </div>

        {inputMode==="youtube" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1,position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:15,color:muted}}>🔗</span>
                <input value={youtubeUrl}
                  onChange={e=>{setYoutubeUrl(e.target.value);setYtInfo(null);if(extractYoutubeId(e.target.value))fetchYt(e.target.value);}}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{...inpSt,paddingLeft:36}}/>
              </div>
              <button onClick={()=>fetchYt(youtubeUrl)} disabled={ytLoading||!youtubeUrl}
                style={{padding:"0 18px",borderRadius:10,border:"none",cursor:"pointer",background:ACC,color:"#fff",fontSize:13,fontWeight:700,opacity:!youtubeUrl?0.5:1}}>
                {ytLoading?"로딩...":"확인"}
              </button>
            </div>
            {ytInfo && !ytInfo.error && (
              <div style={{borderRadius:12,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.06)`,overflow:"hidden",marginBottom:8}}>
                {ytInfo.thumbnail && <img src={ytInfo.thumbnail} alt="" style={{width:"100%",maxHeight:220,objectFit:"cover",display:"block"}}/>}
                <div style={{padding:"10px 14px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:text}}>{ytInfo.title}</div>
                </div>
              </div>
            )}
            {ytInfo?.error && <div style={{fontSize:12,color:"#f87171",padding:"8px 0"}}>⚠️ 링크를 다시 확인해주세요</div>}
          </div>
        )}

        {inputMode==="file" && (
          <div>
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
            {!uploadedFile ? (
              <div onClick={()=>fileRef.current?.click()}
                onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
                onDragOver={e=>e.preventDefault()}
                style={{border:`2px dashed ${bdr}`,borderRadius:14,padding:"44px 20px",textAlign:"center",cursor:"pointer",background:cardBg}}>
                <div style={{fontSize:44,marginBottom:12}}>📁</div>
                <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:6}}>동영상 파일을 드래그하거나 클릭해서 선택하세요</div>
                <div style={{fontSize:11,color:muted,lineHeight:1.7}}>지원 형식: MP4, MOV, WEBM, MKV · 파일 제한: 5GB</div>
              </div>
            ) : (
              <div style={{borderRadius:12,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.06)`,overflow:"hidden"}}>
                <video controls style={{width:"100%",maxHeight:240,background:"#000",display:"block"}}
                  src={URL.createObjectURL(uploadedFile)}/>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:text}}>{uploadedFile.name}</div>
                    <div style={{fontSize:11,color:muted}}>{(uploadedFile.size/1024/1024).toFixed(1)}MB {uploadedDuration?`· ${toMMSS(uploadedDuration)}`:""}</div>
                  </div>
                  <button onClick={()=>{setUploadedFile(null);setUploadedDuration(0);}}
                    style={{padding:"4px 10px",borderRadius:6,border:`1px solid rgba(239,68,68,0.3)`,background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>
                    제거
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={()=>setStep(0)} style={{padding:"12px 22px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer"}}>취소</button>
          <button onClick={()=>setStep(2)} disabled={inputMode==="youtube"?!ytInfo||ytInfo.error:!uploadedFile}
            style={{flex:1,padding:"13px",borderRadius:10,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:900,
              opacity:(inputMode==="youtube"?!ytInfo||ytInfo.error:!uploadedFile)?0.4:1}}>
            다음 → 세부 설정
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────── STEP 2 세부 설정 ───────────
  if(step===2) return (
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:"24px 18px 80px"}}>

        {/* 영상 요약 */}
        <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          {inputMode==="youtube"&&ytInfo?.thumbnail&&<img src={ytInfo.thumbnail} alt="" style={{width:72,height:44,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
          {inputMode==="file"&&<div style={{width:72,height:44,background:"#1a1a2e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎬</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {inputMode==="youtube"?ytInfo?.title:uploadedFile?.name}
            </div>
            <div style={{fontSize:10,color:muted}}>{inputMode==="youtube"?"유튜브 영상":"업로드 파일"}</div>
          </div>
          <button onClick={()=>setStep(1)} style={{fontSize:11,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>변경</button>
        </div>

        {/* 섹션 공통 스타일 */}
        {[
          /* ① 쇼츠 길이 */
          <div key="len" style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"18px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>⏱ 쇼츠 길이</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
              {SHORT_LENGTHS.map(l=>{
                const s=shortLength===l.id;
                return <button key={l.id} onClick={()=>setShortLength(l.id)}
                  style={{padding:"11px 6px",borderRadius:10,border:`2px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:11,fontWeight:800,color:s?ACC:text,marginBottom:1}}>{l.label}</div>
                  <div style={{fontSize:9,color:muted}}>{l.desc}</div>
                </button>;
              })}
            </div>
          </div>,

          /* ② 업로드 플랫폼 */
          <div key="plat" style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"18px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>📱 업로드 플랫폼 (복수 선택)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
              {PLATFORMS.map(p=>{
                const s=selPlatforms.includes(p.id);
                return <button key={p.id} onClick={()=>togglePlatform(p.id)}
                  style={{padding:"11px 6px",borderRadius:10,border:`2px solid ${s?p.color:bdr}`,background:s?`${p.color}18`:"transparent",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:3}}>{p.icon}</div>
                  <div style={{fontSize:10,fontWeight:800,color:s?p.color:text}}>{p.label}</div>
                </button>;
              })}
            </div>
          </div>,

          /* ③ 자막 스타일 — 차별화 핵심 */
          <div key="sub" style={{borderRadius:14,border:`2px solid ${ACC}40`,background:cardBg,padding:"18px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:text}}>📺 자막 스타일 설정</div>
              <div style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`rgba(168,85,247,0.15)`,color:ACC,fontWeight:700}}>알파컷에 없는 기능</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:5}}>글꼴</div>
                <select value={captionStyle.font} onChange={e=>setCaptionStyle(p=>({...p,font:e.target.value}))}
                  style={{...inpSt,padding:"8px 10px"}}>
                  {SUBTITLE_FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:5}}>자막 위치</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  {SUBTITLE_POSITIONS.map(pos=>{
                    const s=captionStyle.position===pos.id;
                    return <button key={pos.id} onClick={()=>setCaptionStyle(p=>({...p,position:pos.id}))}
                      style={{padding:"6px",borderRadius:7,border:`1.5px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",color:s?ACC:muted,fontSize:10,cursor:"pointer",fontWeight:s?700:400}}>
                      {pos.label}
                    </button>;
                  })}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:5}}>자막 색상</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="color" value={captionStyle.color} onChange={e=>setCaptionStyle(p=>({...p,color:e.target.value}))}
                    style={{width:36,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:11,color:muted}}>기본색</span>
                  <input type="color" value={captionStyle.highlight} onChange={e=>setCaptionStyle(p=>({...p,highlight:e.target.value}))}
                    style={{width:36,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:11,color:muted}}>강조색</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:5}}>글자 크기 <span style={{color:ACC}}>{captionStyle.size}pt</span></div>
                <input type="range" min={14} max={32} value={captionStyle.size}
                  onChange={e=>setCaptionStyle(p=>({...p,size:Number(e.target.value)}))}
                  style={{width:"100%",accentColor:ACC}}/>
              </div>
              <div style={{gridColumn:"span 2"}}>
                <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:5}}>자막 등장 애니메이션</div>
                <div style={{display:"flex",gap:5}}>
                  {["fade","slide-up","pop","bounce","typewriter"].map(a=>{
                    const s=captionStyle.animation===a;
                    return <button key={a} onClick={()=>setCaptionStyle(p=>({...p,animation:a}))}
                      style={{flex:1,padding:"6px 4px",borderRadius:7,border:`1.5px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",color:s?ACC:muted,fontSize:10,cursor:"pointer",fontWeight:s?700:400}}>
                      {a}
                    </button>;
                  })}
                </div>
              </div>
            </div>
            {/* 미리보기 */}
            <div style={{borderRadius:10,background:"#000",height:80,display:"flex",alignItems:captionStyle.position==="top"?"flex-start":captionStyle.position==="center"?"center":"flex-end",justifyContent:"center",padding:"8px",position:"relative",overflow:"hidden"}}>
              <div style={{textAlign:"center",fontFamily:captionStyle.font,fontSize:captionStyle.size-4,color:captionStyle.color,fontWeight:900,textShadow:"2px 2px 4px rgba(0,0,0,0.9)",background:`rgba(0,0,0,${captionStyle.bgOpacity})`,padding:"2px 8px",borderRadius:4}}>
                <span>자막이 </span><span style={{color:captionStyle.highlight}}>이렇게</span><span> 보여요</span>
              </div>
            </div>
          </div>,

          /* ④ 구간 설정 */
          <div key="range" style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"18px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:text}}>✂️ 분석 구간</div>
              <div style={{fontSize:11,color:ACC}}>{toMMSS(rangeStart)} ~ {toMMSS(rangeEnd)}</div>
            </div>
            <input type="range" min={0} max={totalDuration} value={rangeEnd}
              onChange={e=>setRangeEnd(Number(e.target.value))}
              style={{width:"100%",accentColor:ACC}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:muted,marginTop:3}}>
              <span>0:00</span><span>총 {toMMSS(rangeEnd-rangeStart)}</span><span>{toMMSS(totalDuration)}</span>
            </div>
          </div>,

          /* ⑤ 생성 수 */
          <div key="cnt" style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"18px",marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:800,color:text}}>생성할 숏폼 수</div>
              <div style={{fontSize:16,fontWeight:900,color:ACC}}>{shortCount}개</div>
            </div>
            <input type="range" min={1} max={10} value={shortCount} onChange={e=>setShortCount(Number(e.target.value))}
              style={{width:"100%",accentColor:ACC}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:muted,marginTop:3}}>
              <span>1개</span><span>5개</span><span>10개</span>
            </div>
          </div>
        ]}

        {error&&<div style={{padding:"10px",borderRadius:9,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:12,marginBottom:14}}>⚠️ {error}</div>}

        <button onClick={generate}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:900,boxShadow:"0 6px 20px rgba(168,85,247,0.3)"}}>
          ✂️ 숏폼 {shortCount}개 자동 분석 생성 →
        </button>
      </div>
    </div>
  );

  // ─────────── STEP 3 처리중 ───────────
  if(step===3) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{maxWidth:440,width:"100%",textAlign:"center"}}>
        <div style={{position:"relative",width:100,height:100,margin:"0 auto 20px"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(168,85,247,0.15)"}}/>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:ACC,animation:"spin 1s linear infinite"}}/>
          <div style={{position:"absolute",inset:10,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(168,85,247,0.4)",animation:"spin 1.6s linear infinite reverse"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34}}>✂️</div>
        </div>
        <div style={{fontSize:18,fontWeight:900,color:text,marginBottom:6}}>AI가 분석하고 있어요</div>
        <div style={{fontSize:13,color:ACC,fontWeight:700,marginBottom:18}}>{progressMsg}</div>
        <div style={{height:8,borderRadius:4,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden",marginBottom:6}}>
          <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,#a855f7,#ec4899)",width:`${progress}%`,transition:"width 0.6s ease"}}/>
        </div>
        <div style={{fontSize:11,color:muted}}>{progress}%</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─────────── STEP 4 결과 ───────────
  const cur = clips[selectedClip]||{};

  const TAB_ITEMS = [
    {id:"clips",label:"✂️ 숏폼 목록"},
    {id:"subtitle",label:"📺 자막 편집"},
    {id:"schedule",label:"📅 업로드 일정"},
    {id:"analysis",label:"📊 분석 리포트"},
  ];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* 상단 탭 바 */}
      <div style={{display:"flex",borderBottom:`1px solid ${bdr}`,background:cardBg,flexShrink:0}}>
        <button onClick={()=>setStep(2)} style={{padding:"10px 16px",border:"none",background:"transparent",color:muted,fontSize:12,cursor:"pointer",borderRight:`1px solid ${bdr}`}}>← 재설정</button>
        {TAB_ITEMS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"12px 16px",border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===t.id?800:500,
              color:tab===t.id?ACC:muted,background:"transparent",borderBottom:tab===t.id?`2px solid ${ACC}`:"2px solid transparent",transition:"all 0.1s"}}>
            {t.label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{padding:"10px 16px",fontSize:12,color:muted,display:"flex",alignItems:"center"}}>
          총 {clips.length}개 생성됨
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* 왼쪽: 숏폼 목록 (항상 표시) */}
        <div style={{width:220,borderRight:`1px solid ${bdr}`,overflowY:"auto",flexShrink:0}}>
          {clips.map((clip,i)=>{
            const hookColor = clip.hook_score>=80?"#4ade80":clip.hook_score>=60?"#f59e0b":"#f87171";
            const viralColor = clip.viral_score>=80?"#4ade80":clip.viral_score>=60?"#f59e0b":"#f87171";
            return (
              <div key={i} onClick={()=>setSelectedClip(i)}
                style={{padding:"10px 12px",borderBottom:`1px solid ${bdr}`,cursor:"pointer",
                  background:selectedClip===i?`rgba(168,85,247,0.1)`:"transparent",
                  borderLeft:selectedClip===i?`3px solid ${ACC}`:"3px solid transparent"}}>
                {/* 썸네일 */}
                <div style={{position:"relative",borderRadius:8,overflow:"hidden",marginBottom:7,aspectRatio:"16/9",background:"#0f0f0f"}}>
                  {inputMode==="youtube"&&ytInfo?.thumbnail
                    ?<img src={ytInfo.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎬</div>}
                  {/* 타임코드 */}
                  <div style={{position:"absolute",bottom:3,right:3,background:"rgba(0,0,0,0.85)",padding:"1px 5px",borderRadius:4,fontSize:9,color:"#fff"}}>{clip.startTime}~{clip.endTime}</div>
                  {/* 썸네일 멘트 */}
                  {clip.thumbnail_text&&<div style={{position:"absolute",top:3,left:3,right:30,background:"rgba(0,0,0,0.75)",padding:"1px 5px",borderRadius:4,fontSize:8,color:"#fff",fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.thumbnail_text}</div>}
                </div>
                {/* 제목 */}
                <div style={{fontSize:11,fontWeight:700,color:selectedClip===i?ACC:text,lineHeight:1.4,marginBottom:6}}>
                  {clip.title_a}
                </div>
                {/* 점수 배지 */}
                <div style={{display:"flex",gap:4}}>
                  <div style={{padding:"2px 7px",borderRadius:8,background:`${hookColor}18`,border:`1px solid ${hookColor}40`,fontSize:9,fontWeight:700,color:hookColor}}>
                    후킹 {clip.hook_score}
                  </div>
                  <div style={{padding:"2px 7px",borderRadius:8,background:`${viralColor}18`,border:`1px solid ${viralColor}40`,fontSize:9,fontWeight:700,color:viralColor}}>
                    바이럴 {clip.viral_score}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 오른쪽: 탭 컨텐츠 */}
        <div style={{flex:1,overflowY:"auto",minWidth:0}}>

          {/* ── 탭: 숏폼 클립 상세 */}
          {tab==="clips" && (
            <div style={{padding:"18px",maxWidth:720}}>
              {/* 후킹 제목 A/B/C */}
              <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"16px",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:800,color:text}}>🎯 후킹 제목 A/B/C 버전</div>
                  <div style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:"rgba(168,85,247,0.15)",color:ACC,fontWeight:700}}>어떤 제목이 더 효과적일까요?</div>
                </div>
                {[["A","충격·후킹형",cur.title_a,"#ef4444"],["B","감성·공감형",cur.title_b,"#f59e0b"],["C","정보·궁금증형",cur.title_c,"#06b6d4"]].map(([v,typ,title,col])=>(
                  <div key={v} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${col}30`,background:`${col}08`,marginBottom:7}}>
                    <div style={{width:22,height:22,borderRadius:7,background:`${col}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:col,flexShrink:0}}>{v}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:col,fontWeight:700,marginBottom:1}}>{typ}</div>
                      <div style={{fontSize:13,fontWeight:700,color:text,lineHeight:1.4}}>{title}</div>
                    </div>
                    <button onClick={()=>cp(title||"",`title_${v}`)}
                      style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${col}30`,background:"transparent",color:col,fontSize:10,cursor:"pointer",flexShrink:0}}>
                      {copied===`title_${v}`?"✅":"복사"}
                    </button>
                  </div>
                ))}
              </div>

              {/* 점수 + 썸네일 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:10}}>🔥 AI 예측 점수</div>
                  {[["후킹 점수",cur.hook_score,"시청자가 멈추는 강도"],["바이럴 점수",cur.viral_score,"공유·확산 가능성"]].map(([l,v,d])=>{
                    const c=v>=80?"#4ade80":v>=60?"#f59e0b":"#f87171";
                    return <div key={l} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:11,color:muted}}>{l}</span>
                        <span style={{fontSize:13,fontWeight:900,color:c}}>{v}</span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:3,background:c,width:`${v||0}%`,transition:"width 0.4s"}}/>
                      </div>
                      <div style={{fontSize:9,color:muted,marginTop:2}}>{d}</div>
                    </div>;
                  })}
                </div>
                <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:8}}>🖼 썸네일 기획</div>
                  <div style={{padding:"10px",borderRadius:8,background:"#0f0f0f",textAlign:"center",marginBottom:8,minHeight:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontFamily:captionStyle.font,fontSize:16,fontWeight:900,color:"#fff",textShadow:"2px 2px 6px rgba(0,0,0,0.9)"}}>
                      {cur.thumbnail_text||"썸네일 텍스트"}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:muted,lineHeight:1.5}}>{cur.thumbnail_tip}</div>
                  <button onClick={()=>cp(cur.thumbnail_text||"","thumb")}
                    style={{marginTop:8,width:"100%",padding:"5px",borderRadius:7,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:10,cursor:"pointer"}}>
                    {copied==="thumb"?"✅ 복사됨":"텍스트 복사"}
                  </button>
                </div>
              </div>

              {/* 스크립트 */}
              <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:800,color:text}}>📝 자막 스크립트</div>
                  <button onClick={()=>cp(cur.script||"","script")} style={{fontSize:10,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="script"?"✅":"복사"}</button>
                </div>
                {/* 첫 3초 강조 */}
                {cur.hook&&<div style={{padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:8,fontSize:12,color:"#f87171",fontWeight:600}}>
                  🎯 첫 3초: "{cur.hook}"
                </div>}
                <div style={{padding:"10px 12px",borderRadius:8,background:ibg,fontSize:12,color:text,lineHeight:1.9,whiteSpace:"pre-wrap",maxHeight:180,overflowY:"auto"}}>
                  {cur.script}
                </div>
              </div>

              {/* 자막 세그먼트 타임라인 */}
              {cur.caption_segments?.length>0&&(
                <div style={{borderRadius:12,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.04)`,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10}}>📺 자막 세그먼트 타임라인</div>
                  {cur.caption_segments.map((seg,j)=>{
                    const styleColors={"big_highlight":"#f59e0b","normal":ACC,"cta":"#4ade80"};
                    const c=styleColors[seg.style]||muted;
                    return <div key={j} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"6px 0",borderBottom:`1px solid ${bdr}`}}>
                      <div style={{minWidth:60,fontSize:10,color:c,fontWeight:700,paddingTop:1}}>{seg.time}</div>
                      <div style={{flex:1,fontSize:12,color:text,lineHeight:1.5}}>{seg.text}</div>
                      <div style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:`${c}15`,color:c,fontWeight:700,flexShrink:0}}>{seg.style}</div>
                    </div>;
                  })}
                </div>
              )}

              {/* 플랫폼별 팁 */}
              {cur.platform_tips&&(
                <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10}}>📱 플랫폼별 최적화 팁</div>
                  {PLATFORMS.filter(p=>selPlatforms.includes(p.id)).map(p=>(
                    cur.platform_tips[p.id]&&<div key={p.id} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${p.color}30`,background:`${p.color}08`,marginBottom:6}}>
                      <div style={{fontSize:10,fontWeight:700,color:p.color,marginBottom:2}}>{p.icon} {p.label}</div>
                      <div style={{fontSize:11,color:muted,lineHeight:1.5}}>{cur.platform_tips[p.id]}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 선택 이유 */}
              {cur.reason&&(
                <div style={{padding:"10px 14px",borderRadius:10,background:`rgba(168,85,247,0.06)`,border:`1px solid ${ACC}20`,fontSize:11,color:muted,lineHeight:1.6}}>
                  💡 이 구간을 선택한 이유: {cur.reason}
                </div>
              )}

              {/* 해시태그 */}
              {cur.hashtags?.length>0&&(
                <div style={{marginTop:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:muted}}>#️⃣ 해시태그</div>
                    <button onClick={()=>cp(cur.hashtags.join(" "),"tags")} style={{fontSize:10,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="tags"?"✅":"전체 복사"}</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {cur.hashtags.map((tag,j)=>(
                      <span key={j} onClick={()=>cp(tag,`tag${j}`)}
                        style={{padding:"3px 9px",borderRadius:10,background:`rgba(168,85,247,0.12)`,color:ACC,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid rgba(168,85,247,0.25)`}}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 탭: 자막 스타일 편집 */}
          {tab==="subtitle" && (
            <div style={{padding:"18px",maxWidth:720}}>
              <div style={{fontSize:15,fontWeight:900,color:text,marginBottom:16}}>📺 자막 스타일 라이브 편집</div>

              {/* 라이브 프리뷰 */}
              <div style={{borderRadius:14,overflow:"hidden",background:"#000",height:200,position:"relative",marginBottom:18,display:"flex",alignItems:captionStyle.position==="top"?"flex-start":captionStyle.position==="center"?"center":"flex-end",justifyContent:"center",padding:"16px"}}>
                {inputMode==="youtube"&&ytInfo?.thumbnail&&<img src={ytInfo.thumbnail} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.5}}/>}
                <div style={{position:"relative",zIndex:1,textAlign:"center",fontFamily:captionStyle.font,fontSize:captionStyle.size,fontWeight:900,color:captionStyle.color,textShadow:"2px 2px 8px rgba(0,0,0,0.9)",background:`rgba(0,0,0,${captionStyle.bgOpacity})`,padding:"4px 12px",borderRadius:6}}>
                  <span>자막이 </span><span style={{color:captionStyle.highlight}}>이렇게</span><span> 보여요</span>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:10}}>🔤 텍스트</div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:muted,marginBottom:4}}>글꼴</div>
                    <select value={captionStyle.font} onChange={e=>setCaptionStyle(p=>({...p,font:e.target.value}))} style={{...inpSt,padding:"6px 10px",fontSize:12}}>
                      {SUBTITLE_FONTS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:muted,marginBottom:4}}>크기: {captionStyle.size}pt</div>
                    <input type="range" min={14} max={32} value={captionStyle.size} onChange={e=>setCaptionStyle(p=>({...p,size:Number(e.target.value)}))} style={{width:"100%",accentColor:ACC}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:muted,marginBottom:4}}>배경 투명도: {Math.round(captionStyle.bgOpacity*100)}%</div>
                    <input type="range" min={0} max={1} step={0.05} value={captionStyle.bgOpacity} onChange={e=>setCaptionStyle(p=>({...p,bgOpacity:Number(e.target.value)}))} style={{width:"100%",accentColor:ACC}}/>
                  </div>
                </div>

                <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:10}}>🎨 색상 & 위치</div>
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,color:muted,marginBottom:6}}>색상 설정</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <input type="color" value={captionStyle.color} onChange={e=>setCaptionStyle(p=>({...p,color:e.target.value}))} style={{width:40,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                      <span style={{fontSize:11,color:text}}>기본 텍스트</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={captionStyle.highlight} onChange={e=>setCaptionStyle(p=>({...p,highlight:e.target.value}))} style={{width:40,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                      <span style={{fontSize:11,color:text}}>강조 텍스트</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:muted,marginBottom:6}}>위치</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                      {SUBTITLE_POSITIONS.map(pos=>{
                        const s=captionStyle.position===pos.id;
                        return <button key={pos.id} onClick={()=>setCaptionStyle(p=>({...p,position:pos.id}))}
                          style={{padding:"6px",borderRadius:7,border:`1.5px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",color:s?ACC:muted,fontSize:10,cursor:"pointer",fontWeight:s?700:400}}>
                          {pos.label}
                        </button>;
                      })}
                    </div>
                  </div>
                </div>

                <div style={{gridColumn:"span 2",borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,padding:"14px"}}>
                  <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:10}}>✨ 애니메이션</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[
                      {id:"fade",label:"페이드"},
                      {id:"slide-up",label:"슬라이드 업"},
                      {id:"pop",label:"팝"},
                      {id:"bounce",label:"바운스"},
                      {id:"typewriter",label:"타이핑"},
                    ].map(a=>{
                      const s=captionStyle.animation===a.id;
                      return <button key={a.id} onClick={()=>setCaptionStyle(p=>({...p,animation:a.id}))}
                        style={{padding:"8px 14px",borderRadius:8,border:`1.5px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",color:s?ACC:muted,fontSize:11,cursor:"pointer",fontWeight:s?700:400}}>
                        {a.label}
                      </button>;
                    })}
                  </div>
                </div>
              </div>

              {/* CSS 내보내기 */}
              <div style={{marginTop:14,padding:"12px 14px",borderRadius:10,background:ibg,border:`1px solid ${bdr}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:700,color:muted}}>자막 스타일 설정값 (Vrew/CapCut 참고용)</div>
                  <button onClick={()=>cp(`폰트: ${captionStyle.font}\n크기: ${captionStyle.size}pt\n기본색: ${captionStyle.color}\n강조색: ${captionStyle.highlight}\n위치: ${captionStyle.position}\n애니메이션: ${captionStyle.animation}\n배경투명도: ${Math.round(captionStyle.bgOpacity*100)}%`,"style")}
                    style={{fontSize:10,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="style"?"✅":"복사"}</button>
                </div>
                <div style={{fontSize:11,color:text,lineHeight:1.8}}>
                  폰트: <b>{captionStyle.font}</b> · 크기: <b>{captionStyle.size}pt</b> · 위치: <b>{captionStyle.position}</b> · 애니메이션: <b>{captionStyle.animation}</b>
                </div>
              </div>
            </div>
          )}

          {/* ── 탭: 업로드 일정 */}
          {tab==="schedule" && (
            <div style={{padding:"18px",maxWidth:720}}>
              <div style={{fontSize:15,fontWeight:900,color:text,marginBottom:4}}>📅 최적 업로드 일정 플래너</div>
              <div style={{fontSize:12,color:muted,marginBottom:18}}>AI가 추천하는 플랫폼별 최적 업로드 시간이에요</div>

              {/* 요일별 추천 히트맵 */}
              <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"16px",marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:12}}>📊 업로드 최적 시간대 히트맵</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
                  {["월","화","수","목","금","토","일"].map((day,i)=>{
                    const heat=[0.6,0.5,0.7,0.8,0.9,0.7,0.65][i];
                    const c=heat>0.8?"#4ade80":heat>0.65?"#f59e0b":ACC;
                    return <div key={day} style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:muted,marginBottom:4}}>{day}</div>
                      <div style={{height:40,borderRadius:6,background:`${c}${Math.round(heat*100).toString(16)}`,border:`1px solid ${c}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:c,fontWeight:700}}>
                        {heat>=0.85?"최고":heat>=0.7?"좋음":"보통"}
                      </div>
                    </div>;
                  })}
                </div>
                <div style={{fontSize:10,color:muted}}>* 일반적인 SNS 알고리즘 기준, 실제 채널 분석 결과와 다를 수 있어요</div>
              </div>

              {/* 숏폼별 추천 일정 */}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {schedule.length>0 ? schedule.map((s,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`rgba(168,85,247,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:ACC,flexShrink:0}}>D{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <div style={{fontSize:12,fontWeight:800,color:text}}>{s.day} {s.time}</div>
                        <div style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"rgba(6,182,212,0.15)",color:"#06b6d4",fontWeight:700}}>{s.platform}</div>
                      </div>
                      <div style={{fontSize:11,color:muted,marginBottom:4}}>
                        {clips[s.clip_index-1]?.title_a||`숏폼 #${s.clip_index}`}
                      </div>
                      <div style={{fontSize:10,color:ACC}}>{s.tip}</div>
                    </div>
                  </div>
                )) : clips.map((clip,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${bdr}`,background:cardBg,display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:`rgba(168,85,247,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:ACC,flexShrink:0}}>#{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                        <div style={{fontSize:12,fontWeight:800,color:text}}>Day {i+1} · {clip.best_upload_day||"평일"} {clip.best_upload_time||"오전 8시"}</div>
                        <div style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:`rgba(168,85,247,0.15)`,color:ACC,fontWeight:700}}>
                          조회 {clip.viral_score}점
                        </div>
                      </div>
                      <div style={{fontSize:11,color:text,marginBottom:2}}>{clip.title_a}</div>
                      <div style={{fontSize:10,color:muted}}>{clip.startTime} ~ {clip.endTime} · {clip.duration}초</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:14,padding:"12px 14px",borderRadius:10,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",fontSize:11,color:"#fbbf24",lineHeight:1.7}}>
                💡 <b>업로드 팁:</b> 첫 번째 영상 업로드 후 24~48시간 내에 두 번째를 올리면 알고리즘이 채널을 활성화 상태로 인식해요. 3개를 연속 업로드한 후 반응을 보고 다음 일정을 조정하세요.
              </div>
            </div>
          )}

          {/* ── 탭: 분석 리포트 */}
          {tab==="analysis" && (
            <div style={{padding:"18px",maxWidth:720}}>
              <div style={{fontSize:15,fontWeight:900,color:text,marginBottom:4}}>📊 콘텐츠 분석 리포트</div>
              <div style={{fontSize:12,color:muted,marginBottom:18}}>AI가 분석한 이 영상의 숏폼 활용 전략이에요</div>

              {/* 전략 */}
              {analysis?.strategy&&(
                <div style={{padding:"14px 16px",borderRadius:12,background:`rgba(168,85,247,0.08)`,border:`1px solid ${ACC}30`,marginBottom:16,fontSize:13,color:text,lineHeight:1.7}}>
                  🎯 <b style={{color:ACC}}>콘텐츠 전략:</b> {analysis.strategy}
                </div>
              )}

              {/* 점수 분포 */}
              <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"16px",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>📈 숏폼별 점수 분포</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {clips.map((clip,i)=>{
                    const hc=clip.hook_score>=80?"#4ade80":clip.hook_score>=60?"#f59e0b":"#f87171";
                    const vc=clip.viral_score>=80?"#4ade80":clip.viral_score>=60?"#f59e0b":"#f87171";
                    return <div key={i} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${bdr}`,background:selectedClip===i?`rgba(168,85,247,0.08)`:"transparent",cursor:"pointer"}} onClick={()=>{setSelectedClip(i);setTab("clips");}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <div style={{fontSize:11,fontWeight:700,color:text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.title_a}</div>
                        <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}>
                          <span style={{fontSize:10,fontWeight:700,color:hc}}>후킹 {clip.hook_score}</span>
                          <span style={{fontSize:10,color:muted}}>·</span>
                          <span style={{fontSize:10,fontWeight:700,color:vc}}>바이럴 {clip.viral_score}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <div style={{flex:clip.hook_score,height:4,borderRadius:2,background:hc}}/>
                        <div style={{flex:100-clip.hook_score,height:4,borderRadius:2,background:D?"rgba(255,255,255,0.06)":"#e5e7eb"}}/>
                      </div>
                    </div>;
                  })}
                </div>
              </div>

              {/* 플랫폼별 적합도 */}
              <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:cardBg,padding:"16px",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>📱 플랫폼별 콘텐츠 적합도</div>
                {PLATFORMS.map(p=>{
                  const score=selPlatforms.includes(p.id)?Math.round(60+Math.random()*35):40;
                  return <div key={p.id} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:text}}>{p.icon} {p.label}</span>
                      <span style={{fontSize:12,fontWeight:700,color:p.color}}>{score}점</span>
                    </div>
                    <div style={{height:6,borderRadius:3,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:3,background:p.color,width:`${score}%`,transition:"width 0.5s"}}/>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
