import { useState, useRef } from "react";

/*
  ShortformEditor  —  Vercel 전용 완결판
  흐름:
  ① /api/youtube-info  → 제목·썸네일·길이 취득
  ② /api/youtube-stream → Vercel이 유튜브를 대신 다운로드해서 브라우저에 스트리밍
  ③ ffmpeg.wasm (브라우저) → 구간 자르기 + 9:16 세로 변환
  ④ Blob URL → 재생 + MP4 다운로드
  파일 업로드도 동일하게 ffmpeg.wasm 처리
*/

const CLAUDE_KEY = "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";

const ACC = "#a855f7";

function toMMSS(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60);return`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function parseTimeToSec(t){if(!t)return 0;const p=String(t).match(/(\d+):(\d+)/);return p?parseInt(p[1])*60+parseInt(p[2]):0;}
function extractYtId(url){const m=url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);return m?m[1]:null;}

async function callClaude(prompt,maxTokens=2000){
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]})
  });
  return (await res.json()).content?.[0]?.text||"";
}

function parseJSON(raw){
  const c=raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();
  try{return JSON.parse(c);}catch{}
  const objs=[];let depth=0,inStr=false,esc=false,start=-1,arr=false;
  for(let i=0;i<c.length;i++){
    const ch=c[i];
    if(esc){esc=false;continue;}if(ch==="\\"&&inStr){esc=true;continue;}
    if(ch==='"'){inStr=!inStr;continue;}if(inStr)continue;
    if(!arr&&ch==="["){arr=true;depth=1;continue;}if(!arr)continue;
    if(ch==="{"){if(depth===1)start=i;depth++;}
    else if(ch==="}"){depth--;if(depth===1&&start>=0){try{objs.push(JSON.parse(c.slice(start,i+1)));}catch{}start=-1;}}
    else if(ch==="[")depth++;else if(ch==="]")depth--;
  }
  return{clips:objs};
}

const LENGTHS=[{id:"s15",label:"15~30초",min:15,max:30},{id:"s30",label:"30~60초",min:30,max:60},{id:"s60",label:"60~90초",min:60,max:90},{id:"s90",label:"90~120초",min:90,max:120}];

// ffmpeg.wasm 싱글톤 로더
let ffmpegInstance=null;
async function getFFmpeg(onLog){
  if(ffmpegInstance)return ffmpegInstance;
  // @ffmpeg/ffmpeg 0.12.x UMD 버전 동적 로드
  if(!window.FFmpegWASM){
    await new Promise((res,rej)=>{
      const s=document.createElement("script");
      s.src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js";
      s.onload=res;s.onerror=()=>rej(new Error("ffmpeg.js 로드 실패"));
      document.head.appendChild(s);
    });
  }
  const {FFmpeg}=window.FFmpegWASM||{};
  if(!FFmpeg)throw new Error("FFmpeg 클래스 없음");
  const ff=new FFmpeg();
  if(onLog)ff.on("log",({message})=>onLog(message));
  await ff.load({
    coreURL:"https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
    wasmURL:"https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
  });
  ffmpegInstance=ff;
  return ff;
}

export default function ShortformEditor({isDark}){
  const D=isDark;
  const text  =D?"#fff":"#1a1a2e";
  const muted =D?"rgba(255,255,255,0.45)":"#888";
  const card  =D?"rgba(255,255,255,0.05)":"#fff";
  const bdr   =D?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)";
  const ibg   =D?"rgba(255,255,255,0.07)":"#f8f8f8";

  const [step,setStep]         = useState(0);
  const [tab,setTab]           = useState("clips");
  const [inputMode,setInputMode]= useState("youtube");

  // 입력
  const [ytUrl,setYtUrl]       = useState("");
  const [ytInfo,setYtInfo]     = useState(null);
  const [ytLoading,setYtLoading]= useState(false);
  const [file,setFile]         = useState(null);
  const [fileDur,setFileDur]   = useState(0);
  const fileRef  = useRef(null);
  const fileObjUrl= useRef(null);

  // 설정
  const [lenId,setLenId]       = useState("s30");
  const [count,setCount]       = useState(3);
  const [totalDur,setTotalDur] = useState(1200);
  const [rangeEnd,setRangeEnd] = useState(1200);
  const [capStyle,setCapStyle] = useState({font:"Noto Sans KR",color:"#ffffff",hl:"#ffff00",size:20,pos:"bottom",bgOp:0.6});

  // 결과
  const [clips,setClips]       = useState([]);
  const [selIdx,setSelIdx]     = useState(0);
  const [prog,setProg]         = useState(0);
  const [progMsg,setProgMsg]   = useState("");
  const [extracted,setExtracted]= useState({});  // key→{url,blob}
  const [rec,setRec]           = useState(false);
  const [recPct,setRecPct]     = useState(0);
  const [recMsg,setRecMsg]     = useState("");
  const [err,setErr]           = useState("");
  const [copied,setCopied]     = useState(null);
  const [archive,setArchive]   = useState(()=>{try{return JSON.parse(localStorage.getItem("snsmakeit_shorts_v3")||"[]");}catch{return[];}});
  const [archMsg,setArchMsg]   = useState("");

  const cp=(t,k)=>{navigator.clipboard.writeText(t);setCopied(k);setTimeout(()=>setCopied(null),2000);};
  const inp={width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:ibg,color:text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  // ── 유튜브 정보 조회
  const fetchYt=async(url)=>{
    const id=extractYtId(url);
    if(!id){setYtInfo({id:"",title:"링크를 확인해주세요",error:true});return;}
    setYtLoading(true);
    try{
      const r=await fetch(`/api/youtube-info?url=${encodeURIComponent(url)}`);
      if(r.ok){
        const d=await r.json();
        setYtInfo({id,title:d.title,thumbnail:d.thumbnail,duration:d.duration,ok:true});
        if(d.duration){setTotalDur(d.duration);setRangeEnd(d.duration);}
        setYtLoading(false);return;
      }
    }catch{}
    // fallback: oEmbed (제목·썸네일만, 길이 모름)
    try{
      const r=await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const d=await r.json();
      setYtInfo({id,title:d.title,thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`,duration:null,ok:true,fallback:true});
    }catch{
      setYtInfo({id,title:url,thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`,duration:null,ok:true,fallback:true});
    }
    setYtLoading(false);
  };

  // ── 파일 업로드
  const handleFile=f=>{
    if(!f)return;
    if(fileObjUrl.current)URL.revokeObjectURL(fileObjUrl.current);
    fileObjUrl.current=URL.createObjectURL(f);
    setFile(f);
    const v=document.createElement("video");
    v.onloadedmetadata=()=>{const d=Math.floor(v.duration);setFileDur(d);setTotalDur(d);setRangeEnd(d);};
    v.src=fileObjUrl.current;
  };

  // ── 핵심: ffmpeg.wasm으로 영상 추출
  const extract=async(clip,doDownload=false)=>{
    if(rec)return;
    const startSec=parseTimeToSec(clip.startTime);
    const endSec  =parseTimeToSec(clip.endTime);
    const dur     =Math.max(endSec-startSec,1);
    setRec(true);setRecPct(0);setRecMsg("ffmpeg 초기화 중...");

    try{
      // ① ffmpeg.wasm 로드 (최초 1회 약 20~40초)
      setRecMsg("ffmpeg.wasm 로딩 중... (최초 실행 시 20~40초 소요)");
      const ff=await getFFmpeg(msg=>{
        // ffmpeg 내부 로그에서 진행률 추정
        const m=msg.match(/time=(\d+):(\d+):(\d+)/);
        if(m){
          const t=parseInt(m[1])*3600+parseInt(m[2])*60+parseInt(m[3]);
          setRecPct(Math.min(Math.round((t/dur)*100),95));
        }
      });
      setRecPct(10);setRecMsg("영상 소스 불러오는 중...");

      // ② 소스 데이터 취득
      let srcBytes;
      if(inputMode==="file"&&file){
        setRecMsg("파일 읽는 중...");
        srcBytes=new Uint8Array(await file.arrayBuffer());
      } else if(inputMode==="youtube"){
        // Vercel 프록시를 통해 유튜브 영상 다운로드
        setRecMsg(`유튜브 영상 다운로드 중...\n(영상 크기에 따라 수분 소요될 수 있어요)`);
        const r=await fetch(`/api/youtube-stream?url=${encodeURIComponent(ytUrl)}`);
        if(!r.ok){
          const e=await r.json().catch(()=>({error:"알 수 없는 오류"}));
          throw new Error(e.error||`서버 오류 (${r.status})`);
        }
        const buf=await r.arrayBuffer();
        srcBytes=new Uint8Array(buf);
        setRecMsg("다운로드 완료! ffmpeg 처리 시작...");
      } else throw new Error("소스 없음");
      setRecPct(40);

      // ③ ffmpeg에 파일 쓰기
      const ext=inputMode==="file"?(file.name.split(".").pop()||"mp4"):"mp4";
      await ff.writeFile(`src.${ext}`,srcBytes);
      setRecPct(45);setRecMsg("9:16 세로 영상 변환 중...");

      // ④ 구간 자르기 + 9:16 세로 변환
      // crop=ih*(9/16):ih → 가로영상 중앙에서 9:16 비율로 크롭
      await ff.exec([
        "-ss", String(startSec),
        "-t",  String(dur),
        "-i",  `src.${ext}`,
        "-vf", "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,setsar=1",
        "-c:v","libx264","-preset","ultrafast","-crf","26",
        "-c:a","aac","-b:a","128k","-ar","44100",
        "-movflags","+faststart",
        "-y","out.mp4"
      ]);
      setRecPct(92);setRecMsg("파일 읽는 중...");

      const data=await ff.readFile("out.mp4");
      const blob=new Blob([data.buffer],{type:"video/mp4"});
      const blobUrl=URL.createObjectURL(blob);
      const k=clip.index??selIdx;

      setExtracted(p=>({...p,[k]:{url:blobUrl,blob,title:clip.title_a||"shortform"}}));
      setRecPct(100);setRecMsg("완료!");

      // 임시 파일 정리
      try{await ff.deleteFile(`src.${ext}`);}catch{}
      try{await ff.deleteFile("out.mp4");}catch{}

      if(doDownload)dlVideo(clip,blobUrl,blob);
    }catch(e){
      console.error(e);
      alert("추출 실패: "+e.message);
    }
    setTimeout(()=>{setRec(false);setRecPct(0);setRecMsg("");},600);
  };

  const dlVideo=(clip,url,blob)=>{
    const name=`shortform_${(clip.title_a||"clip").replace(/[^가-힣a-zA-Z0-9]/g,"_").slice(0,25)}.mp4`;
    const a=document.createElement("a");a.href=url;a.download=name;a.click();
  };
  const downloadClip=clip=>{
    const k=clip.index??selIdx;
    const ex=extracted[k];
    if(ex)dlVideo(clip,ex.url,ex.blob);
    else extract(clip,true);
  };

  // ── 보관함
  const saveOne=clip=>{
    const src=inputMode==="youtube"?(ytInfo?.title||ytUrl):file?.name;
    const e={id:Date.now()+"",savedAt:new Date().toLocaleDateString("ko-KR"),source:src,thumb:inputMode==="youtube"?ytInfo?.thumbnail:null,...clip};
    const u=[e,...archive].slice(0,100);setArchive(u);localStorage.setItem("snsmakeit_shorts_v3",JSON.stringify(u));
    setArchMsg("✅ 저장됐어요!");setTimeout(()=>setArchMsg(""),2000);
  };
  const saveAll=()=>{
    const src=inputMode==="youtube"?(ytInfo?.title||ytUrl):file?.name;
    const entries=clips.map(c=>({id:Date.now()+"_"+c.index,savedAt:new Date().toLocaleDateString("ko-KR"),source:src,thumb:inputMode==="youtube"?ytInfo?.thumbnail:null,...c}));
    const u=[...entries,...archive].slice(0,100);setArchive(u);localStorage.setItem("snsmakeit_shorts_v3",JSON.stringify(u));
    setArchMsg(`✅ ${clips.length}개 저장!`);setTimeout(()=>setArchMsg(""),2500);
  };

  // ── AI 생성
  const generate=async()=>{
    setStep(3);setErr("");setClips([]);setProg(5);
    const len=LENGTHS.find(l=>l.id===lenId);
    const src=inputMode==="youtube"?(ytInfo?.title||ytUrl):(file?.name||"영상");
    try{
      setProg(10);setProgMsg("영상 분석 중...");
      const p1=`숏폼 AI. 영상에서 ${count}개 구간 선정.
영상: ${src} | 구간: 00:00~${toMMSS(rangeEnd)} | 길이: ${len?.min}~${len?.max}초
JSON만: {"clips":[{"index":1,"startTime":"00:00","endTime":"00:30","duration":30,"reason":"이유"}]}`;
      const r1=await callClaude(p1,800);
      const planClips=(parseJSON(r1).clips||[]).slice(0,count);
      setProg(20);setProgMsg(`${planClips.length}개 구간 추출, 상세 생성 중...`);

      const all=[];
      for(let i=0;i<planClips.length;i+=2){
        const g=planClips.slice(i,i+2);
        setProg(20+Math.round(((i+2)/planClips.length)*65));
        setProgMsg(`숏폼 ${i+1}~${Math.min(i+2,planClips.length)}번 생성 중...`);
        const p2=`숏폼 상세 기획. 영상: ${src} | 길이: ${len?.min}~${len?.max}초
${g.map(c=>`#${c.index}: ${c.startTime}~${c.endTime}`).join("\n")}
JSON만:{"clips":[${g.map(c=>`{"index":${c.index},"startTime":"${c.startTime}","endTime":"${c.endTime}","duration":${c.duration},"title_a":"후킹제목","title_b":"감성제목","title_c":"정보제목","hook_score":80,"viral_score":75,"hook":"첫3초멘트","script":"자막스크립트","thumbnail_text":"썸네일텍스트","hashtags":["#태그1","#태그2","#태그3"],"reason":"${c.reason||""}"}`).join(",")}]}`;
        const r2=await callClaude(p2,1800);
        all.push(...(parseJSON(r2).clips||[]));
        setClips([...all]);
      }
      setSelIdx(0);setProg(100);setProgMsg("완료!");
      await new Promise(r=>setTimeout(r,300));
      setStep(4);setTab("clips");
      setTimeout(saveAll,500);
    }catch(e){setErr("생성 실패: "+e.message);setStep(2);}
  };

  const cur=clips[selIdx]||{};
  const curStart=parseTimeToSec(cur.startTime);
  const curEnd  =parseTimeToSec(cur.endTime);

  // ══ STEP 0: 인트로 ══
  if(step===0)return(
    <div style={{flex:1,overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{maxWidth:560,width:"100%",textAlign:"center"}}>
        <div style={{display:"inline-flex",gap:6,padding:"5px 16px",borderRadius:20,background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",fontSize:11,fontWeight:700,color:ACC,marginBottom:16}}>
          ✂️ Vercel 전용 · ytdl-core + ffmpeg.wasm
        </div>
        <div style={{fontSize:24,fontWeight:900,color:text,lineHeight:1.35,marginBottom:12}}>
          1편의 롱폼으로<br/>
          <span style={{background:"linear-gradient(135deg,#a855f7,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>재생 가능한 세로 숏폼을</span>
        </div>
        <div style={{fontSize:13,color:muted,lineHeight:1.9,marginBottom:20}}>
          유튜브 링크 → Vercel이 영상 스트리밍<br/>
          ffmpeg.wasm이 브라우저에서 직접 9:16 변환<br/>
          별도 서버 없이 재생 · 다운로드까지
        </div>
        {/* 동작 구조 */}
        <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"14px 16px",marginBottom:20,textAlign:"left"}}>
          <div style={{fontSize:11,fontWeight:800,color:text,marginBottom:8}}>📡 Vercel 전용 구조</div>
          {[
            ["1","유튜브 링크 입력","/api/youtube-info → 제목·썸네일·길이 취득"],
            ["2","Vercel 프록시","/api/youtube-stream → Vercel이 유튜브 대신 다운로드"],
            ["3","브라우저 편집","ffmpeg.wasm → 구간 자르기 + 9:16 세로 변환"],
            ["4","완성","Blob URL → 즉시 재생 + MP4 다운로드"],
          ].map(([n,t,d])=>(
            <div key={n} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:6,background:`rgba(168,85,247,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:ACC,flexShrink:0}}>{n}</div>
              <div><div style={{fontSize:11,fontWeight:700,color:text}}>{t}</div><div style={{fontSize:10,color:muted}}>{d}</div></div>
            </div>
          ))}
        </div>
        <button onClick={()=>setStep(1)} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:15,fontWeight:900,boxShadow:"0 8px 28px rgba(168,85,247,0.3)"}}>
          ✂️ 숏폼 만들기 →
        </button>
      </div>
    </div>
  );

  // ══ STEP 1: 입력 ══
  if(step===1)return(
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:720,margin:"0 auto",padding:"28px 18px 80px"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:19,fontWeight:900,color:text,marginBottom:3}}>영상을 불러와주세요</div>
          <div style={{fontSize:12,color:muted}}>유튜브 링크 또는 파일을 올려주세요</div>
        </div>
        <div style={{display:"flex",borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,marginBottom:14}}>
          {[["youtube","🔗 유튜브 링크"],["file","⬆️ 파일 업로드"]].map(([v,l])=>(
            <button key={v} onClick={()=>setInputMode(v)}
              style={{flex:1,padding:"12px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                background:inputMode===v?`linear-gradient(135deg,${ACC},#ec4899)`:"transparent",color:inputMode===v?"#fff":muted}}>
              {l}
            </button>
          ))}
        </div>

        {inputMode==="youtube"&&<>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{flex:1,position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:muted}}>🔗</span>
              <input value={ytUrl}
                onChange={e=>{setYtUrl(e.target.value);setYtInfo(null);if(extractYtId(e.target.value))fetchYt(e.target.value);}}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{...inp,paddingLeft:34}}/>
            </div>
            <button onClick={()=>fetchYt(ytUrl)} disabled={ytLoading||!ytUrl}
              style={{padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:ACC,color:"#fff",fontSize:13,fontWeight:700,opacity:!ytUrl?0.5:1}}>
              {ytLoading?"로딩...":"확인"}
            </button>
          </div>
          {ytInfo&&!ytInfo.error&&<div style={{borderRadius:12,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.06)`,overflow:"hidden",marginBottom:8}}>
            {ytInfo.thumbnail&&<img src={ytInfo.thumbnail} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>}
            <div style={{padding:"10px 14px"}}>
              <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:3}}>{ytInfo.title}</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {ytInfo.duration&&<span style={{fontSize:11,color:muted}}>길이: {toMMSS(ytInfo.duration)}</span>}
                {ytInfo.fallback
                  ?<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"rgba(245,158,11,0.15)",color:"#fbbf24",fontWeight:700}}>⚠️ /api/youtube-info 미동작 — 영상길이 모름</span>
                  :<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"rgba(74,222,128,0.15)",color:"#4ade80",fontWeight:700}}>✓ API 정상 — 스트리밍 준비됨</span>}
              </div>
            </div>
          </div>}
          {ytInfo?.error&&<div style={{fontSize:12,color:"#f87171",padding:"6px 0"}}>⚠️ {ytInfo.title}</div>}
        </>}

        {inputMode==="file"&&<>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          {!file
            ?<div onClick={()=>fileRef.current?.click()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}
                style={{border:`2px dashed ${bdr}`,borderRadius:14,padding:"40px 20px",textAlign:"center",cursor:"pointer",background:card}}>
                <div style={{fontSize:40,marginBottom:10}}>📁</div>
                <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:4}}>드래그하거나 클릭해서 파일 선택</div>
                <div style={{fontSize:11,color:muted}}>MP4, MOV, WEBM, MKV · 브라우저에서 직접 처리</div>
              </div>
            :<div style={{borderRadius:12,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.06)`,overflow:"hidden"}}>
                <video controls style={{width:"100%",maxHeight:220,background:"#000",display:"block"}} src={fileObjUrl.current}/>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:text}}>{file.name}</div>
                    <div style={{fontSize:11,color:muted}}>{(file.size/1024/1024).toFixed(1)}MB{fileDur?` · ${toMMSS(fileDur)}`:""}</div>
                  </div>
                  <button onClick={()=>{setFile(null);setFileDur(0);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>제거</button>
                </div>
              </div>}
        </>}

        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>setStep(0)} style={{padding:"12px 20px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer"}}>취소</button>
          <button onClick={()=>setStep(2)} disabled={inputMode==="youtube"?!ytInfo||ytInfo.error:!file}
            style={{flex:1,padding:"13px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:900,
              opacity:(inputMode==="youtube"?!ytInfo||ytInfo.error:!file)?0.4:1}}>
            다음 → 세부 설정
          </button>
        </div>
      </div>
    </div>
  );

  // ══ STEP 2: 설정 ══
  if(step===2)return(
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:740,margin:"0 auto",padding:"22px 18px 80px"}}>
        {/* 요약 */}
        <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          {inputMode==="youtube"&&ytInfo?.thumbnail&&<img src={ytInfo.thumbnail} alt="" style={{width:68,height:42,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
          {inputMode==="file"&&<div style={{width:68,height:42,background:"#1a1a2e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎬</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inputMode==="youtube"?ytInfo?.title:file?.name}</div>
            <div style={{fontSize:10,color:muted}}>{inputMode==="youtube"?"유튜브":"업로드 파일"}</div>
          </div>
          <button onClick={()=>setStep(1)} style={{fontSize:11,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>변경</button>
        </div>

        {/* 길이 */}
        <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"14px",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:9}}>⏱ 쇼츠 길이</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {LENGTHS.map(l=>{const s=lenId===l.id;return(
              <button key={l.id} onClick={()=>setLenId(l.id)} style={{padding:"9px 4px",borderRadius:9,border:`2px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:10,fontWeight:800,color:s?ACC:text}}>{l.label}</div>
              </button>
            );})}
          </div>
        </div>

        {/* 자막 스타일 */}
        <div style={{borderRadius:12,border:`2px solid ${ACC}40`,background:card,padding:"14px",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:10}}>📺 자막 스타일</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:muted,marginBottom:4}}>글꼴</div>
              <select value={capStyle.font} onChange={e=>setCapStyle(p=>({...p,font:e.target.value}))} style={{...inp,padding:"7px 9px",fontSize:11}}>
                {["Noto Sans KR","나눔고딕","나눔스퀘어","Pretendard","Arial"].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:muted,marginBottom:4}}>위치</div>
              <div style={{display:"flex",gap:4}}>
                {[["top","상단"],["center","중앙"],["bottom","하단"]].map(([v,l])=>{const s=capStyle.pos===v;return(
                  <button key={v} onClick={()=>setCapStyle(p=>({...p,pos:v}))} style={{flex:1,padding:"7px 2px",borderRadius:7,border:`1.5px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",color:s?ACC:muted,fontSize:9,cursor:"pointer"}}>{l}</button>
                );})}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,color:muted,marginBottom:4}}>색상</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="color" value={capStyle.color} onChange={e=>setCapStyle(p=>({...p,color:e.target.value}))} style={{width:34,height:28,borderRadius:5,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                <span style={{fontSize:9,color:muted}}>기본</span>
                <input type="color" value={capStyle.hl} onChange={e=>setCapStyle(p=>({...p,hl:e.target.value}))} style={{width:34,height:28,borderRadius:5,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                <span style={{fontSize:9,color:muted}}>강조</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:10,color:muted,marginBottom:4}}>크기 {capStyle.size}pt</div>
              <input type="range" min={14} max={32} value={capStyle.size} onChange={e=>setCapStyle(p=>({...p,size:Number(e.target.value)}))} style={{width:"100%",accentColor:ACC}}/>
            </div>
          </div>
          {/* 미리보기 */}
          <div style={{borderRadius:8,background:"#000",height:64,display:"flex",alignItems:capStyle.pos==="top"?"flex-start":capStyle.pos==="center"?"center":"flex-end",justifyContent:"center",padding:"7px"}}>
            <div style={{fontFamily:capStyle.font,fontSize:capStyle.size-5,fontWeight:900,color:capStyle.color,textShadow:"2px 2px 6px rgba(0,0,0,0.9)",background:`rgba(0,0,0,${capStyle.bgOp})`,padding:"2px 8px",borderRadius:4}}>
              <span>자막이 </span><span style={{color:capStyle.hl}}>이렇게</span><span> 보여요</span>
            </div>
          </div>
        </div>

        {/* 구간 + 개수 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{fontSize:11,fontWeight:700,color:text}}>✂️ 구간</span>
              <span style={{fontSize:10,color:ACC}}>00:00~{toMMSS(rangeEnd)}</span>
            </div>
            <input type="range" min={0} max={totalDur} value={rangeEnd} onChange={e=>setRangeEnd(Number(e.target.value))} style={{width:"100%",accentColor:ACC}}/>
          </div>
          <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <span style={{fontSize:11,fontWeight:700,color:text}}>생성 수</span>
              <span style={{fontSize:15,fontWeight:900,color:ACC}}>{count}개</span>
            </div>
            <input type="range" min={1} max={10} value={count} onChange={e=>setCount(Number(e.target.value))} style={{width:"100%",accentColor:ACC}}/>
          </div>
        </div>

        {err&&<div style={{padding:"9px 12px",borderRadius:9,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:11,marginBottom:12}}>⚠️ {err}</div>}
        <button onClick={generate} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:900}}>
          ✂️ 숏폼 {count}개 AI 분석 생성 →
        </button>
      </div>
    </div>
  );

  // ══ STEP 3: 생성중 ══
  if(step===3)return(
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"30px 20px"}}>
      <div style={{maxWidth:500,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{position:"relative",width:76,height:76,margin:"0 auto 12px"}}>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(168,85,247,0.15)"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:ACC,animation:"spin 1s linear infinite"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>✂️</div>
          </div>
          <div style={{fontSize:16,fontWeight:900,color:text,marginBottom:4}}>{progMsg||"AI가 분석하고 있어요"}</div>
          <div style={{height:6,borderRadius:3,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden",margin:"10px 0 5px"}}>
            <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#a855f7,#ec4899)",width:`${prog}%`,transition:"width 0.5s"}}/>
          </div>
          <div style={{fontSize:10,color:muted}}>{prog}% · {clips.length}개 완료</div>
        </div>
        {clips.length>0&&<div style={{display:"flex",flexDirection:"column",gap:4}}>
          {clips.map((c,i)=>(
            <div key={i} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.06)`,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:22,height:22,borderRadius:6,background:`rgba(168,85,247,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:ACC,flexShrink:0}}>#{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:700,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title_a}</div>
                <div style={{fontSize:8,color:muted}}>{c.startTime}~{c.endTime}</div>
              </div>
              <span style={{fontSize:11}}>✅</span>
            </div>
          ))}
        </div>}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ══ STEP 4: 결과 ══
  const TABS=[{id:"clips",l:"✂️ 숏폼"},{id:"archive",l:`🗂 보관함(${archive.length})`}];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* 탭 바 */}
      <div style={{display:"flex",borderBottom:`1px solid ${bdr}`,background:card,flexShrink:0,alignItems:"center"}}>
        <button onClick={()=>setStep(2)} style={{padding:"10px 12px",border:"none",background:"transparent",color:muted,fontSize:11,cursor:"pointer",borderRight:`1px solid ${bdr}`,whiteSpace:"nowrap"}}>← 재설정</button>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t.id?800:500,color:tab===t.id?ACC:muted,background:"transparent",borderBottom:tab===t.id?`2px solid ${ACC}`:"2px solid transparent",whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {archMsg&&<div style={{fontSize:10,color:"#4ade80",padding:"0 8px",fontWeight:700}}>{archMsg}</div>}
        <button onClick={saveAll} style={{margin:"0 6px",padding:"4px 10px",borderRadius:7,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.1)`,color:ACC,fontSize:10,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>🗂 전체저장</button>
        <div style={{padding:"0 8px",fontSize:10,color:muted,whiteSpace:"nowrap"}}>{clips.length}개</div>
      </div>

      {/* 보관함 */}
      {tab==="archive"&&(
        <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
          <div style={{fontSize:14,fontWeight:900,color:text,marginBottom:14}}>🗂 숏폼 보관함</div>
          {archive.length===0
            ?<div style={{textAlign:"center",padding:"40px",color:muted,fontSize:13}}>저장된 숏폼이 없어요</div>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:9}}>
              {archive.map((item,i)=>(
                <div key={i} style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,overflow:"hidden"}}>
                  <div style={{aspectRatio:"9/16",background:"#0f0f0f",maxHeight:130,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                    {item.thumb?<img src={item.thumb} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{fontSize:20}}>🎬</div>}
                    {item.thumbnail_text&&<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"3px 5px",background:"linear-gradient(transparent,rgba(0,0,0,0.8))",fontSize:9,fontWeight:900,color:"#fff",textAlign:"center"}}>{item.thumbnail_text}</div>}
                  </div>
                  <div style={{padding:"7px 9px"}}>
                    <div style={{fontSize:9,fontWeight:800,color:text,lineHeight:1.4,marginBottom:3}}>{item.title_a}</div>
                    <div style={{fontSize:7,color:muted,marginBottom:5}}>{item.savedAt}</div>
                    <div style={{display:"flex",gap:3}}>
                      <button onClick={()=>cp(item.script||"","a"+i)} style={{flex:1,padding:"3px",borderRadius:4,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:7,cursor:"pointer"}}>{copied==="a"+i?"✅":"스크립트"}</button>
                      <button onClick={()=>{const u=[...archive];u.splice(i,1);setArchive(u);localStorage.setItem("snsmakeit_shorts_v3",JSON.stringify(u));}} style={{padding:"3px 5px",borderRadius:4,border:"1px solid rgba(239,68,68,0.2)",background:"transparent",color:"#f87171",fontSize:7,cursor:"pointer"}}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      )}

      {/* 메인 레이아웃 */}
      {tab==="clips"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* 왼쪽: 목록 */}
          <div style={{width:175,borderRight:`1px solid ${bdr}`,overflowY:"auto",flexShrink:0}}>
            {clips.map((clip,i)=>{
              const hc=clip.hook_score>=80?"#4ade80":clip.hook_score>=60?"#f59e0b":"#f87171";
              const ex=extracted[clip.index??i];
              return(
                <div key={i} onClick={()=>setSelIdx(i)}
                  style={{padding:"8px 9px",borderBottom:`1px solid ${bdr}`,cursor:"pointer",
                    background:selIdx===i?`rgba(168,85,247,0.1)`:"transparent",
                    borderLeft:selIdx===i?`3px solid ${ACC}`:"3px solid transparent"}}>
                  <div style={{position:"relative",borderRadius:6,overflow:"hidden",marginBottom:5,background:"#0f0f0f",aspectRatio:"9/16",maxHeight:105}}>
                    {inputMode==="youtube"&&ytInfo?.thumbnail?<img src={ytInfo.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎬</div>}
                    {clip.hook&&<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"2px 3px",background:"linear-gradient(transparent,rgba(0,0,0,0.8))",fontFamily:capStyle.font,fontSize:6,fontWeight:900,color:capStyle.color,textAlign:"center"}}><span style={{color:capStyle.hl}}>{clip.hook?.slice(0,20)}</span></div>}
                    <div style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.8)",padding:"1px 3px",borderRadius:3,fontSize:6,color:"#fff"}}>{clip.duration}s</div>
                    {ex&&<div style={{position:"absolute",top:2,left:2,background:"#4ade80",borderRadius:3,padding:"1px 4px",fontSize:6,fontWeight:700,color:"#000"}}>완료</div>}
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:selIdx===i?ACC:text,lineHeight:1.3,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.title_a}</div>
                  <div style={{display:"flex",gap:2,marginBottom:4}}>
                    <span style={{fontSize:6,padding:"1px 4px",borderRadius:3,background:`${hc}18`,color:hc,fontWeight:700}}>후킹{clip.hook_score}</span>
                    <span style={{fontSize:6,padding:"1px 4px",borderRadius:3,background:"rgba(6,182,212,0.15)",color:"#06b6d4",fontWeight:700}}>바이럴{clip.viral_score}</span>
                  </div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={e=>{e.stopPropagation();saveOne(clip);}} style={{flex:1,padding:"2px",borderRadius:4,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.08)`,color:ACC,fontSize:6,cursor:"pointer"}}>🗂</button>
                    <button onClick={e=>{e.stopPropagation();setSelIdx(i);ex?downloadClip(clip):extract(clip);}} disabled={rec}
                      style={{flex:2,padding:"2px",borderRadius:4,border:`1px solid ${ex?"rgba(74,222,128,0.3)":`${ACC}30`}`,background:ex?"rgba(74,222,128,0.08)":`rgba(168,85,247,0.08)`,color:ex?"#4ade80":ACC,fontSize:6,cursor:"pointer",fontWeight:700,opacity:rec?0.5:1}}>
                      {ex?"↓다운":"✂️추출"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 가운데: 9:16 플레이어 */}
          <div style={{width:230,borderRight:`1px solid ${bdr}`,display:"flex",flexDirection:"column",flexShrink:0,background:"#080808"}}>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px"}}>
              <div style={{position:"relative",width:"100%",aspectRatio:"9/16",background:"#111",borderRadius:12,overflow:"hidden",boxShadow:"0 6px 28px rgba(0,0,0,0.7)"}}>
                {(()=>{
                  const k=cur.index??selIdx;
                  const ex=extracted[k];

                  // 추출 완료된 세로 영상
                  if(ex)return<video key={ex.url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",background:"#000"}} controls autoPlay loop src={ex.url}/>;

                  // 파일 원본 (구간 미리보기)
                  if(inputMode==="file"&&file)return(
                    <video key={`f-${selIdx}`}
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block",background:"#000"}}
                      controls
                      onLoadedMetadata={e=>{e.target.currentTime=curStart;}}
                      onTimeUpdate={e=>{if(e.target.currentTime>=curEnd&&curEnd>curStart)e.target.currentTime=curStart;}}
                      src={fileObjUrl.current||""}/>
                  );

                  // 유튜브 썸네일 + 자막 오버레이
                  if(inputMode==="youtube"&&ytInfo)return(
                    <div style={{width:"100%",height:"100%",position:"relative"}}>
                      <img src={ytInfo.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 35%,rgba(0,0,0,0.65))"}}/>
                      <div style={{position:"absolute",[capStyle.pos==="top"?"top":"bottom"]:12,left:8,right:8,textAlign:"center",
                        fontFamily:capStyle.font,fontSize:capStyle.size-4,fontWeight:900,color:capStyle.color,
                        textShadow:"2px 2px 8px rgba(0,0,0,0.9)",background:`rgba(0,0,0,${capStyle.bgOp})`,
                        padding:"4px 6px",borderRadius:5,lineHeight:1.4}}>
                        <span>{cur.hook?.split(" ").slice(0,4).join(" ")||"미리보기"}</span>
                        {cur.hook?.split(" ").length>4&&<><br/><span style={{color:capStyle.hl}}>{cur.hook?.split(" ").slice(4,8).join(" ")}</span></>}
                      </div>
                      <div style={{position:"absolute",top:7,left:7,background:"rgba(0,0,0,0.75)",padding:"2px 7px",borderRadius:5,fontSize:9,color:"#fff",fontWeight:700}}>
                        {cur.startTime}~{cur.endTime}
                      </div>
                    </div>
                  );

                  return<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:muted,fontSize:11}}>미리보기 없음</div>;
                })()}

                {/* 추출 중 오버레이 */}
                {rec&&(
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:"12px"}}>
                    <div style={{position:"relative",width:46,height:46}}>
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${ACC}30`}}/>
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:ACC,animation:"spin 1s linear infinite"}}/>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✂️</div>
                    </div>
                    <div style={{fontSize:10,color:ACC,fontWeight:700,textAlign:"center",lineHeight:1.5,padding:"0 4px"}}>{recMsg}</div>
                    <div style={{width:110,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:2,background:ACC,width:`${recPct}%`,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:9,color:ACC}}>{recPct}%</div>
                  </div>
                )}
              </div>
            </div>
            {/* 버튼 */}
            <div style={{padding:"9px",borderTop:`1px solid rgba(255,255,255,0.06)`,display:"flex",flexDirection:"column",gap:5}}>
              {(()=>{
                const k=cur.index??selIdx;
                const ex=extracted[k];
                return<>
                  {!ex&&(
                    <button onClick={()=>extract(cur)} disabled={rec}
                      style={{width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:rec?"not-allowed":"pointer",
                        background:rec?"rgba(168,85,247,0.2)":`linear-gradient(135deg,${ACC},#ec4899)`,
                        color:"#fff",fontSize:11,fontWeight:800,opacity:rec?0.6:1}}>
                      {rec?`✂️ 편집 중 ${recPct}%`:"✂️ 세로영상 추출 & 재생"}
                    </button>
                  )}
                  {ex&&(<>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>downloadClip(cur)} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#000",fontSize:11,cursor:"pointer",fontWeight:800}}>↓ MP4 다운로드</button>
                      <button onClick={()=>extract(cur)} disabled={rec} style={{padding:"8px 9px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:10,cursor:"pointer"}} title="재추출">🔄</button>
                    </div>
                  </>)}
                  <div style={{fontSize:8,color:muted,textAlign:"center"}}>{cur.startTime}~{cur.endTime} · {cur.duration}초 · 1080×1920{ex&&<span style={{color:"#4ade80",marginLeft:4}}>✓</span>}</div>
                  <button onClick={()=>saveOne(cur)} style={{width:"100%",padding:"6px",borderRadius:7,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.08)`,color:ACC,fontSize:9,cursor:"pointer",fontWeight:700}}>🗂 보관함 저장</button>
                </>;
              })()}
            </div>
          </div>

          {/* 오른쪽: 상세 */}
          <div style={{flex:1,overflowY:"auto",minWidth:0,padding:"14px"}}>
            <div style={{maxWidth:680}}>
              {/* 후킹 제목 3버전 */}
              <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"13px",marginBottom:11}}>
                <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:9}}>🎯 후킹 제목 3버전</div>
                {[["A","충격·후킹",cur.title_a,"#ef4444"],["B","감성·공감",cur.title_b,"#f59e0b"],["C","정보·궁금증",cur.title_c,"#06b6d4"]].map(([v,typ,t,col])=>(
                  <div key={v} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,border:`1px solid ${col}30`,background:`${col}08`,marginBottom:5}}>
                    <div style={{width:18,height:18,borderRadius:5,background:`${col}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:col,flexShrink:0}}>{v}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:8,color:col,fontWeight:700,marginBottom:1}}>{typ}</div>
                      <div style={{fontSize:11,fontWeight:700,color:text,lineHeight:1.3}}>{t}</div>
                    </div>
                    <button onClick={()=>cp(t||"","t"+v)} style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${col}30`,background:"transparent",color:col,fontSize:8,cursor:"pointer"}}>{copied==="t"+v?"✅":"복사"}</button>
                  </div>
                ))}
              </div>
              {/* 점수 + 썸네일 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
                <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"11px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:muted,marginBottom:7}}>🔥 AI 예측 점수</div>
                  {[["후킹",cur.hook_score],["바이럴",cur.viral_score]].map(([l,v])=>{
                    const c=v>=80?"#4ade80":v>=60?"#f59e0b":"#f87171";
                    return<div key={l} style={{marginBottom:7}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:10,color:muted}}>{l}</span><span style={{fontSize:12,fontWeight:900,color:c}}>{v}</span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:2,background:c,width:`${v||0}%`}}/>
                      </div>
                    </div>;
                  })}
                </div>
                <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"11px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:muted,marginBottom:6}}>🖼 썸네일 멘트</div>
                  <div style={{padding:"7px",borderRadius:6,background:"#0f0f0f",textAlign:"center",marginBottom:5,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontFamily:capStyle.font,fontSize:13,fontWeight:900,color:"#fff",textShadow:"2px 2px 6px rgba(0,0,0,0.9)"}}>{cur.thumbnail_text||"-"}</div>
                  </div>
                  <button onClick={()=>cp(cur.thumbnail_text||"","th")} style={{width:"100%",padding:"3px",borderRadius:5,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:8,cursor:"pointer"}}>{copied==="th"?"✅":"복사"}</button>
                </div>
              </div>
              {/* 스크립트 */}
              <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"11px",marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:800,color:text}}>📝 자막 스크립트</div>
                  <button onClick={()=>cp(cur.script||"","sc")} style={{fontSize:9,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="sc"?"✅":"복사"}</button>
                </div>
                {cur.hook&&<div style={{padding:"5px 9px",borderRadius:6,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:5,fontSize:10,color:"#f87171",fontWeight:600}}>🎯 첫 3초: "{cur.hook}"</div>}
                <div style={{padding:"8px 10px",borderRadius:7,background:ibg,fontSize:11,color:text,lineHeight:1.85,whiteSpace:"pre-wrap",maxHeight:150,overflowY:"auto"}}>{cur.script}</div>
              </div>
              {/* 해시태그 */}
              {cur.hashtags?.length>0&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:muted}}>#️⃣ 해시태그</div>
                    <button onClick={()=>cp(cur.hashtags.join(" "),"ht")} style={{fontSize:9,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="ht"?"✅":"전체복사"}</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {cur.hashtags.map((tag,j)=>(
                      <span key={j} onClick={()=>cp(tag,"tg"+j)} style={{padding:"3px 8px",borderRadius:9,background:`rgba(168,85,247,0.12)`,color:ACC,fontSize:10,fontWeight:600,cursor:"pointer",border:`1px solid rgba(168,85,247,0.25)`}}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
