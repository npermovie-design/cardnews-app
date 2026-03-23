import { useState, useRef } from "react";
import { callClaude } from "./aiClient";

const ACC = "#3F72AF";

function toMMSS(sec){const m=Math.floor(sec/60),s=Math.floor(sec%60);return`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function parseTimeToSec(t){if(!t)return 0;const p=String(t).match(/(\d+):(\d+)/);return p?parseInt(p[1])*60+parseInt(p[2]):0;}
function extractYtId(url){const m=url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);return m?m[1]:null;}

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

const LENGTHS=[
  {id:"s15",label:"15~30초",min:15,max:30},
  {id:"s30",label:"30~60초",min:30,max:60},
  {id:"s60",label:"60~90초",min:60,max:90},
  {id:"s90",label:"90~120초",min:90,max:120}
];

// ── 레이아웃 목록 ───────────────────────────────────────────────────────────
const LAYOUTS = [
  {
    id:"split", label:"얼굴+제목+자막",
    desc:"상단 후킹 제목 + 얼굴 자동 크롭 + 하단 자막\n가장 인기있는 숏폼 포맷",
    icon:"🎬",
    preview: (topColor,botColor)=>(
      <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#111"}}>
        <div style={{flex:"0 0 22%",background:"linear-gradient(rgba(0,0,0,0.9),rgba(0,0,0,0.1))",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px"}}>
          <span style={{fontSize:9,fontWeight:900,color:topColor||"#fff",textAlign:"center"}}>후킹 제목 텍스트</span>
        </div>
        <div style={{flex:1,background:"#2a2a3a",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <div style={{width:40,height:48,borderRadius:"50% 50% 40% 40%",background:"rgba(168,85,247,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
          <span style={{position:"absolute",bottom:4,right:4,fontSize:7,color:"rgba(255,255,255,0.4)"}}>얼굴 자동크롭</span>
        </div>
        <div style={{flex:"0 0 22%",background:"linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.9))",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px"}}>
          <span style={{fontSize:9,fontWeight:700,color:botColor||"#ffff00",textAlign:"center"}}>첫 3초 자막</span>
        </div>
      </div>
    )
  },
  {
    id:"full_bot", label:"풀화면+하단자막",
    desc:"영상 전체 노출 + 하단 그라데이션 자막\n인물·풍경 영상에 최적",
    icon:"📱",
    preview: (topColor,botColor)=>(
      <div style={{width:"100%",height:"100%",background:"#1a1a2e",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:22,opacity:0.4}}>🎥</span>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"30%",background:"linear-gradient(transparent,rgba(0,0,0,0.92))",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"8px 4px"}}>
          <span style={{fontSize:9,fontWeight:900,color:botColor||"#ffff00",textAlign:"center"}}>하단 자막 텍스트</span>
        </div>
      </div>
    )
  },
  {
    id:"full_top", label:"풀화면+상단자막",
    desc:"영상 전체 + 상단 그라데이션 제목\n클릭율 높은 레이아웃",
    icon:"📌",
    preview: (topColor)=>(
      <div style={{width:"100%",height:"100%",background:"#1a1a2e",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:22,opacity:0.4}}>🎥</span>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"28%",background:"linear-gradient(rgba(0,0,0,0.92),transparent)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"8px 4px"}}>
          <span style={{fontSize:9,fontWeight:900,color:topColor||"#fff",textAlign:"center"}}>상단 제목 텍스트</span>
        </div>
      </div>
    )
  },
  {
    id:"full_center", label:"풀화면+중앙자막",
    desc:"영상 전체 + 가운데 자막 박스\n강렬한 임팩트 연출",
    icon:"🎯",
    preview: (topColor,botColor)=>(
      <div style={{width:"100%",height:"100%",background:"#1a1a2e",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:22,opacity:0.4}}>🎥</span>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"rgba(0,0,0,0.75)",borderRadius:4,padding:"5px 8px",maxWidth:"85%",textAlign:"center"}}>
            <span style={{fontSize:9,fontWeight:900,color:botColor||"#ffff00"}}>중앙 자막 박스</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id:"top_text", label:"상단 텍스트형",
    desc:"상단 35% 제목 영역 + 하단 65% 영상\n제목 강조가 필요할 때",
    icon:"📝",
    preview: (topColor)=>(
      <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#111"}}>
        <div style={{flex:"0 0 35%",background:"linear-gradient(135deg,#1a1a2e,#0f0f1f)",display:"flex",alignItems:"center",justifyContent:"center",padding:"6px"}}>
          <span style={{fontSize:9,fontWeight:900,color:topColor||"#fff",textAlign:"center",lineHeight:1.4}}>강렬한<br/>제목 텍스트</span>
        </div>
        <div style={{flex:1,background:"#2a2a3a",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:18,opacity:0.5}}>🎥</span>
        </div>
      </div>
    )
  },
  {
    id:"bot_text", label:"하단 텍스트형",
    desc:"상단 65% 영상 + 하단 35% 텍스트 박스\n정보전달형 숏폼에 최적",
    icon:"💬",
    preview: (topColor,botColor)=>(
      <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#111"}}>
        <div style={{flex:1,background:"#2a2a3a",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:18,opacity:0.5}}>🎥</span>
        </div>
        <div style={{flex:"0 0 35%",background:"linear-gradient(135deg,#0f0f1f,#1a1a2e)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px",gap:3}}>
          <span style={{fontSize:8,fontWeight:900,color:topColor||"#fff",textAlign:"center"}}>소제목</span>
          <span style={{fontSize:9,fontWeight:700,color:botColor||"#ffff00",textAlign:"center",lineHeight:1.4}}>하단 자막 텍스트</span>
        </div>
      </div>
    )
  },
];

// ── 자막 스타일 프리셋 ──────────────────────────────────────────────────────
const CAP_PRESETS = [
  {id:"classic",  label:"클래식",  topColor:"#ffffff", botColor:"#ffff00", bgOp:0.55, font:"Noto Sans KR"},
  {id:"redhot",   label:"레드핫",  topColor:"#ff4444", botColor:"#ffffff", bgOp:0.65, font:"Noto Sans KR"},
  {id:"blue",     label:"블루",    topColor:"#60a5fa", botColor:"#ffffff", bgOp:0.60, font:"Noto Sans KR"},
  {id:"neon",     label:"네온",    topColor:"#3F72AF", botColor:"#112D4E", bgOp:0.45, font:"Noto Sans KR"},
  {id:"minimal",  label:"미니멀",  topColor:"#ffffff", botColor:"#ffffff", bgOp:0.00, font:"Noto Sans KR"},
  {id:"dark",     label:"다크",    topColor:"#4ade80", botColor:"#facc15", bgOp:0.80, font:"Noto Sans KR"},
];

export default function ShortformEditor({isDark}){
  const D=isDark;
  const text  =D?"#fff":"#1a1a2e";
  const muted =D?"rgba(255,255,255,0.45)":"#888";
  const card  =D?"rgba(255,255,255,0.05)":"#fff";
  const bdr   =D?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)";
  const ibg   =D?"rgba(255,255,255,0.07)":"#f8f8f8";

  // ── 스텝: 0인트로 1입력 2설정 3레이아웃 4생성중 5결과
  const [step,setStep]         = useState(0);
  const [tab,setTab]           = useState("clips");
  const [inputMode,setInputMode]= useState("file");

  // 입력
  const [ytUrl,setYtUrl]       = useState("");
  const [ytInfo,setYtInfo]     = useState(null);
  const [ytLoading,setYtLoading]= useState(false);
  const [file,setFile]         = useState(null);
  const [fileDur,setFileDur]   = useState(0);
  const fileRef  = useRef(null);
  const fileObjUrl= useRef(null);

  // 기본 설정
  const [lenId,setLenId]       = useState("s30");
  const [count,setCount]       = useState(3);
  const [totalDur,setTotalDur] = useState(1200);
  const [rangeEnd,setRangeEnd] = useState(1200);

  // 레이아웃 & 스타일
  const [layoutType,setLayoutType] = useState("split");
  const [presetId,setPresetId]     = useState("classic");
  const [capStyle,setCapStyle]     = useState({font:"Noto Sans KR",color:"#ffffff",hl:"#ffff00",size:20,pos:"bottom",bgOp:0.55,topColor:"#ffffff",botColor:"#ffff00"});

  // 결과
  const [clips,setClips]       = useState([]);
  const [selIdx,setSelIdx]     = useState(0);
  const [prog,setProg]         = useState(0);
  const [progMsg,setProgMsg]   = useState("");
  const [extracted,setExtracted]= useState({});
  const [rec,setRec]           = useState(false);
  const [recPct,setRecPct]     = useState(0);
  const [recMsg,setRecMsg]     = useState("");
  const [autoMode,setAutoMode] = useState(false);
  const [autoIdx,setAutoIdx]   = useState(0);
  const [topText, setTopText]  = useState("");
  const [botText, setBotText]  = useState("");
  const cachedSrcUrl           = useRef(null);
  const [err,setErr]           = useState("");
  const [copied,setCopied]     = useState(null);
  const [archive,setArchive]   = useState(()=>{try{return JSON.parse(localStorage.getItem("snsmakeit_shorts_v3")||"[]");}catch{return[];}});
  const [archMsg,setArchMsg]   = useState("");

  // 프리셋 적용
  const applyPreset = (pid) => {
    const p = CAP_PRESETS.find(x=>x.id===pid)||CAP_PRESETS[0];
    setPresetId(pid);
    setCapStyle(prev=>({...prev, color:p.topColor, hl:p.botColor, bgOp:p.bgOp, font:p.font, topColor:p.topColor, botColor:p.botColor}));
  };

  const cp=(t,k)=>{navigator.clipboard.writeText(t);setCopied(k);setTimeout(()=>setCopied(null),2000);};
  const inp={width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:ibg,color:text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};

  // ── 유튜브 정보 조회
  const fetchYt=async(url)=>{
    const id=extractYtId(url);
    if(!id){setYtInfo({id:"",title:"링크를 확인해주세요",error:true});return;}
    setYtLoading(true);
    try{
      const endpoints=["/api/yt-dl","/api/youtube-info"];
      for(const ep of endpoints){
        try{
          const r=await fetch(`${ep}?url=${encodeURIComponent(url)}`);
          if(r.ok){
            const d=await r.json();
            if(!d.error){
              setYtInfo({id,title:d.title,thumbnail:d.thumbnail,duration:d.duration,ok:true});
              if(d.duration){setTotalDur(d.duration);setRangeEnd(d.duration);}
              setYtLoading(false);return;
            }
          }
        }catch{}
      }
    }catch{}
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

  // ── 얼굴 위치 감지
  const detectFace=async(video,sampleTime)=>{
    try{
      const t=Math.min(sampleTime+1,(video.duration||sampleTime+5)-0.1);
      video.currentTime=t;
      await new Promise(res=>{video.onseeked=res;setTimeout(res,3000);});
      if("FaceDetector" in window){
        const c=document.createElement("canvas");c.width=640;c.height=360;
        c.getContext("2d").drawImage(video,0,0,640,360);
        const det=new window.FaceDetector({maxDetectedFaces:2,fastMode:true});
        const faces=await det.detect(c);
        if(faces.length>0){
          const f=faces.reduce((a,b)=>a.boundingBox.width>b.boundingBox.width?a:b).boundingBox;
          return{cx:(f.x+f.width/2)/640,cy:(f.y+f.height/2)/360,detected:true};
        }
      }
    }catch{}
    return{cx:0.5,cy:0.32,detected:false};
  };

  // ── 레이아웃별 캔버스 렌더
  const drawFrame=(ctx,video,facePos,tTop,tBot,ltype,cs)=>{
    const W=1080,H=1920;
    const vw=video.videoWidth||1920,vh=video.videoHeight||1080;
    const {cx=0.5,cy=0.32}=facePos||{};
    const topC=cs.topColor||"#fff";
    const botC=cs.botColor||"#ffff00";
    const bgOp=cs.bgOp||0.55;

    const drawFullVideo=(scaleUp=1)=>{
      const scale=Math.max(W/vw,H/vh)*scaleUp;
      const sw=vw*scale,sh=vh*scale;
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
      ctx.drawImage(video,(W-sw)/2,(H-sh)/2,sw,sh);
    };

    const drawText=(text,x,y,maxW,fs,color,align="center")=>{
      if(!text)return;
      ctx.save();ctx.textAlign=align;ctx.fillStyle=color;
      ctx.font=`900 ${fs}px sans-serif`;
      ctx.shadowColor="#000";ctx.shadowBlur=16;
      const lw=Math.max(1,Math.floor(maxW/(fs*0.55)));
      const ls=[];for(let i=0;i<text.length;i+=lw)ls.push(text.slice(i,i+lw));
      const lh=fs+14,tot=ls.length*lh;
      ls.forEach((l,i)=>ctx.fillText(l,x,y-tot/2+lh*(i+0.85)));
      ctx.restore();
    };

    if(ltype==="split"){
      const TOP=280,BOT=280,MID=H-TOP-BOT;
      const scale=Math.max(W/vw,MID/vh)*1.05;
      const sw=vw*scale,sh=vh*scale;
      const dx=W/2-cx*sw,dy=TOP+MID*0.38-cy*sh;
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
      ctx.save();ctx.beginPath();ctx.rect(0,TOP,W,MID);ctx.clip();
      ctx.drawImage(video,dx,dy,sw,sh);ctx.restore();
      const tg=ctx.createLinearGradient(0,0,0,TOP);
      tg.addColorStop(0,"rgba(0,0,0,0.95)");tg.addColorStop(1,"rgba(0,0,0,0.05)");
      ctx.fillStyle=tg;ctx.fillRect(0,0,W,TOP);
      if(tTop){
        const fs=Math.max(40,Math.min(64,Math.floor(920/Math.max(tTop.length,1))));
        drawText(tTop,W/2,TOP/2+10,940,fs,topC);
      }
      const bg2=ctx.createLinearGradient(0,H-BOT,0,H);
      bg2.addColorStop(0,"rgba(0,0,0,0.05)");bg2.addColorStop(1,"rgba(0,0,0,0.95)");
      ctx.fillStyle=bg2;ctx.fillRect(0,H-BOT,W,BOT);
      if(tBot){
        const fs2=Math.max(34,Math.min(52,Math.floor(840/Math.max(tBot.length,1))));
        drawText(tBot,W/2,H-BOT/2+10,940,fs2,botC);
      }
    } else if(ltype==="full_bot"){
      drawFullVideo();
      const BOTH=360;
      const bg2=ctx.createLinearGradient(0,H-BOTH,0,H);
      bg2.addColorStop(0,"rgba(0,0,0,0)");bg2.addColorStop(0.4,"rgba(0,0,0,0.8)");bg2.addColorStop(1,"rgba(0,0,0,0.95)");
      ctx.fillStyle=bg2;ctx.fillRect(0,H-BOTH,W,BOTH);
      if(tBot){
        const fs=Math.max(36,Math.min(56,Math.floor(860/Math.max(tBot.length,1))));
        drawText(tBot,W/2,H-100,940,fs,botC);
      }
    } else if(ltype==="full_top"){
      drawFullVideo();
      const TOPH=340;
      const tg=ctx.createLinearGradient(0,0,0,TOPH);
      tg.addColorStop(0,"rgba(0,0,0,0.95)");tg.addColorStop(0.6,"rgba(0,0,0,0.7)");tg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=tg;ctx.fillRect(0,0,W,TOPH);
      if(tTop){
        const fs=Math.max(40,Math.min(66,Math.floor(920/Math.max(tTop.length,1))));
        drawText(tTop,W/2,140,940,fs,topC);
      }
    } else if(ltype==="full_center"){
      drawFullVideo();
      if(tBot){
        const fs=Math.max(38,Math.min(60,Math.floor(880/Math.max(tBot.length,1))));
        const lw=Math.max(1,Math.floor(900/(fs*0.55)));
        const ls=[];for(let i=0;i<tBot.length;i+=lw)ls.push(tBot.slice(i,i+lw));
        const lh=fs+16,tot=ls.length*lh;
        const pw=Math.min(W*0.88,940),ph=tot+48;
        ctx.save();
        ctx.fillStyle=`rgba(0,0,0,${Math.max(bgOp,0.65)})`;
        const rx=W/2-pw/2,ry=H/2-ph/2;
        ctx.beginPath();ctx.roundRect(rx,ry,pw,ph,24);ctx.fill();
        ctx.restore();
        drawText(tBot,W/2,H/2,940,fs,botC);
      }
    } else if(ltype==="top_text"){
      const TEXTH=Math.round(H*0.35);
      ctx.fillStyle="#0f0f1f";ctx.fillRect(0,0,W,TEXTH);
      const scale=Math.max(W/vw,(H-TEXTH)/vh);
      const sw=vw*scale,sh=vh*scale;
      ctx.fillStyle="#000";ctx.fillRect(0,TEXTH,W,H-TEXTH);
      ctx.save();ctx.beginPath();ctx.rect(0,TEXTH,W,H-TEXTH);ctx.clip();
      ctx.drawImage(video,(W-sw)/2,TEXTH+(H-TEXTH-sh)/2,sw,sh);ctx.restore();
      if(tTop){
        const fs=Math.max(42,Math.min(68,Math.floor(880/Math.max(tTop.length,1))));
        drawText(tTop,W/2,TEXTH/2,920,fs,topC);
      }
    } else if(ltype==="bot_text"){
      const TEXTH=Math.round(H*0.35);
      const VIDH=H-TEXTH;
      const scale=Math.max(W/vw,VIDH/vh);
      const sw=vw*scale,sh=vh*scale;
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,VIDH);
      ctx.save();ctx.beginPath();ctx.rect(0,0,W,VIDH);ctx.clip();
      ctx.drawImage(video,(W-sw)/2,(VIDH-sh)/2,sw,sh);ctx.restore();
      ctx.fillStyle="#0f0f1f";ctx.fillRect(0,VIDH,W,TEXTH);
      const tg2=ctx.createLinearGradient(0,VIDH-60,0,VIDH);
      tg2.addColorStop(0,"rgba(15,15,31,0)");tg2.addColorStop(1,"rgba(15,15,31,1)");
      ctx.fillStyle=tg2;ctx.fillRect(0,VIDH-60,W,60);
      if(tTop){
        const fs=Math.max(30,Math.min(44,Math.floor(800/Math.max(tTop.length,1))));
        drawText(tTop,W/2,VIDH+TEXTH*0.35,920,fs,topC);
      }
      if(tBot){
        const fs=Math.max(34,Math.min(52,Math.floor(840/Math.max(tBot.length,1))));
        drawText(tBot,W/2,VIDH+TEXTH*0.72,920,fs,botC);
      }
    }
  };

  // ── Canvas + MediaRecorder로 추출
  const extract=async(clip,doDownload=false,overrideSrc=null,overrideTop=null,overrideBot=null)=>{
    if(rec)return;
    const startSec=parseTimeToSec(clip.startTime);
    const endSec  =parseTimeToSec(clip.endTime);
    setRec(true);setRecPct(0);setRecMsg("영상 준비 중...");
    try{
      let srcUrl=overrideSrc;
      if(!srcUrl){
        if(inputMode==="file"&&file){
          srcUrl=fileObjUrl.current||URL.createObjectURL(file);
        } else if(inputMode==="youtube"){
          setRecMsg("유튜브 영상 다운로드 중...");
          const r=await fetch(`/api/youtube-stream?url=${encodeURIComponent(ytUrl)}`);
          if(!r.ok){const e=await r.json().catch(()=>({error:"서버 오류"}));throw new Error(e.error||`서버 오류 (${r.status})`);}
          const blob=await r.blob();
          srcUrl=URL.createObjectURL(blob);
          cachedSrcUrl.current=srcUrl;
        } else throw new Error("소스 없음");
      }
      setRecPct(10);setRecMsg("비디오 로드 중...");
      const video=document.createElement("video");
      video.src=srcUrl;video.muted=false;video.crossOrigin="anonymous";
      await new Promise((res,rej)=>{
        video.onloadedmetadata=res;video.onerror=()=>rej(new Error("영상 로드 실패"));setTimeout(res,5000);
      });
      const actualEnd=Math.min(endSec,video.duration||endSec);
      const actualDur=Math.max(actualEnd-startSec,1);
      setRecMsg("얼굴 위치 감지 중...");setRecPct(15);
      const facePos=await detectFace(video,startSec);
      const canvas=document.createElement("canvas");
      canvas.width=1080;canvas.height=1920;
      const ctx=canvas.getContext("2d");
      let finalStream=canvas.captureStream(30);
      try{
        const aCtx=new (window.AudioContext||window.webkitAudioContext)();
        const src2=aCtx.createMediaElementSource(video);
        const dest=aCtx.createMediaStreamDestination();
        src2.connect(dest);src2.connect(aCtx.destination);
        finalStream=new MediaStream([...canvas.captureStream(30).getTracks(),...dest.stream.getTracks()]);
      }catch{}
      const mimeType=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
        .find(t=>MediaRecorder.isTypeSupported(t))||"video/webm";
      const recorder=new MediaRecorder(finalStream,{mimeType,videoBitsPerSecond:5000000});
      const chunks=[];
      recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
      setRecMsg("구간 탐색 중...");setRecPct(20);
      video.currentTime=startSec;
      await new Promise(r=>{video.onseeked=r;setTimeout(r,4000);});
      if(Math.abs(video.currentTime-startSec)>1){
        video.currentTime=startSec;
        await new Promise(r=>{video.onseeked=r;setTimeout(r,3000);});
      }
      await video.play().catch(()=>{});
      recorder.start(100);
      const tTop=overrideTop!==null?overrideTop:(clip.title_a||"");
      const tBot=overrideBot!==null?overrideBot:(clip.hook||"");
      setRecMsg(`변환 중... (${actualDur}초)`);
      await new Promise(resolve=>{
        const draw=()=>{
          const vt=video.currentTime;
          const elapsed=Math.max(0,vt-startSec);
          setRecPct(20+Math.min(Math.round((elapsed/actualDur)*78),78));
          drawFrame(ctx,video,facePos,tTop,tBot,layoutType,capStyle);
          if(vt>=actualEnd-0.08||elapsed>=actualDur+0.3){resolve();return;}
          requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
      });
      video.pause();recorder.stop();
      await new Promise(r=>{recorder.onstop=r;});
      setRecPct(100);setRecMsg("완료!");
      const blob=new Blob(chunks,{type:mimeType});
      const blobUrl=URL.createObjectURL(blob);
      const k=clip.index??selIdx;
      setExtracted(p=>({...p,[k]:{url:blobUrl,blob,title:clip.title_a||"shortform",mimeType}}));
      if(doDownload)dlVideo(clip,blobUrl,blob,mimeType);
    }catch(e){
      console.error(e);setErr("추출 실패: "+e.message);
    }
    setTimeout(()=>{setRec(false);setRecPct(0);setRecMsg("");},600);
  };

  const dlVideo=(clip,url,blob,mimeType)=>{
    const ext=(mimeType||"video/webm").includes("mp4")?"mp4":"webm";
    const name=`shortform_${(clip.title_a||"clip").replace(/[^가-힣a-zA-Z0-9]/g,"_").slice(0,25)}.${ext}`;
    const a=document.createElement("a");a.href=url;a.download=name;a.click();
  };
  const downloadClip=clip=>{
    const k=clip.index??selIdx;const ex=extracted[k];
    if(ex)dlVideo(clip,ex.url,ex.blob,ex.mimeType);else extract(clip,true);
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
    setStep(4);setErr("");setClips([]);setProg(5);
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
      setStep(5);setTab("clips");
      setTimeout(saveAll,500);
      // 자동 편집 바로 시작 (확인창 없이)
      if(all.length>0) setTimeout(()=>autoExtractAll(all),800);
    }catch(e){setErr("생성 실패: "+e.message);setStep(3);}
  };

  // ── 전체 자동 편집
  const autoExtractAll=async(clipList)=>{
    if(rec||autoMode)return;
    setAutoMode(true);setAutoIdx(0);setErr("");
    try{
      let srcUrl=cachedSrcUrl.current;
      if(!srcUrl){
        if(inputMode==="youtube"){
          setRecMsg("유튜브 영상 다운로드 중... (1회만)");setRec(true);setRecPct(5);
          const r=await fetch(`/api/youtube-stream?url=${encodeURIComponent(ytUrl)}`);
          if(!r.ok){const e=await r.json().catch(()=>({error:"서버 오류"}));throw new Error(e.error||`서버 오류 ${r.status}`);}
          const blob=await r.blob();
          srcUrl=URL.createObjectURL(blob);cachedSrcUrl.current=srcUrl;
          setRec(false);setRecPct(0);setRecMsg("");
        } else if(inputMode==="file"&&file){
          srcUrl=fileObjUrl.current||URL.createObjectURL(file);
          cachedSrcUrl.current=srcUrl;
        } else throw new Error("소스 없음");
      }
      for(let i=0;i<clipList.length;i++){
        const clip=clipList[i];setAutoIdx(i+1);
        await extract(clip,true,srcUrl);
        await new Promise(r=>setTimeout(r,500));
      }
    }catch(e){setErr("자동 편집 실패: "+e.message);}
    finally{setAutoMode(false);setAutoIdx(0);setRec(false);setRecPct(0);setRecMsg("");}
  };

  const cur=clips[selIdx]||{};
  const curStart=parseTimeToSec(cur.startTime);
  const curEnd  =parseTimeToSec(cur.endTime);

  // ══ STEP 0: 인트로 ══
  if(step===0)return(
    <div style={{flex:1,overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{maxWidth:560,width:"100%",textAlign:"center"}}>
        <div style={{display:"inline-flex",gap:6,padding:"5px 16px",borderRadius:20,background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",fontSize:11,fontWeight:700,color:ACC,marginBottom:16}}>
          ✂️ AI 숏폼 자동 편집기
        </div>
        <div style={{fontSize:26,fontWeight:900,color:text,lineHeight:1.35,marginBottom:12}}>
          긴 영상 한 편으로<br/>
          <span style={{background:"linear-gradient(135deg,#3F72AF,#112D4E)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>재생 가능한 세로 숏폼을</span>
        </div>
        <div style={{fontSize:13,color:muted,lineHeight:1.9,marginBottom:20}}>
          영상 파일 업로드 → AI가 핵심 구간 자동 선정<br/>
          6가지 레이아웃 · 자막 스타일 커스텀<br/>
          1080×1920 세로 영상 자동 추출 · 다운로드
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
          {[["📁","파일 업로드","MP4·MOV·WEBM"],["🤖","AI 분석","핵심 구간 자동 선정"],["✂️","자동 추출","9:16 세로 변환"]].map(([ic,t,d])=>(
            <div key={t} style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:6}}>{ic}</div>
              <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:2}}>{t}</div>
              <div style={{fontSize:10,color:muted}}>{d}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setStep(1)} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#3F72AF,#112D4E)",color:"#fff",fontSize:15,fontWeight:900,boxShadow:"0 8px 28px rgba(168,85,247,0.3)"}}>
          ✂️ 숏폼 만들기 →
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ══ STEP 1: 영상 입력 ══
  if(step===1)return(
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:720,margin:"0 auto",padding:"28px 18px 80px"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:19,fontWeight:900,color:text,marginBottom:3}}>영상을 불러와주세요</div>
          <div style={{fontSize:12,color:muted}}>파일 업로드 또는 유튜브 URL (제목 분석용)</div>
        </div>

        <div style={{display:"flex",borderRadius:12,overflow:"hidden",border:`1px solid ${bdr}`,marginBottom:14}}>
          {[["file","📁 파일 업로드 (권장)"],["youtube","🔗 유튜브 분석"]].map(([v,l])=>(
            <button key={v} onClick={()=>setInputMode(v)}
              style={{flex:1,padding:"12px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                background:inputMode===v?`linear-gradient(135deg,${ACC},#112D4E)`:"transparent",color:inputMode===v?"#fff":muted}}>
              {l}
            </button>
          ))}
        </div>

        {inputMode==="file"&&<>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          {!file
            ?<div onClick={()=>fileRef.current?.click()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}
                style={{border:`2px dashed ${bdr}`,borderRadius:14,padding:"48px 20px",textAlign:"center",cursor:"pointer",background:card}}>
                <div style={{fontSize:44,marginBottom:12}}>📁</div>
                <div style={{fontSize:15,fontWeight:800,color:text,marginBottom:6}}>드래그하거나 클릭해서 파일 선택</div>
                <div style={{fontSize:12,color:muted}}>MP4, MOV, WEBM, MKV · 브라우저에서 직접 처리</div>
              </div>
            :<div style={{borderRadius:12,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.06)`,overflow:"hidden"}}>
                <video controls preload="metadata" style={{width:"100%",maxHeight:240,background:"#000",display:"block"}} src={fileObjUrl.current}/>
                <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:text}}>{file.name}</div>
                    <div style={{fontSize:11,color:muted}}>{(file.size/1024/1024).toFixed(1)}MB{fileDur?` · ${toMMSS(fileDur)}`:""}</div>
                  </div>
                  <button onClick={()=>{setFile(null);setFileDur(0);}} style={{padding:"5px 12px",borderRadius:7,border:"1px solid rgba(239,68,68,0.3)",background:"transparent",color:"#f87171",fontSize:12,cursor:"pointer"}}>제거</button>
                </div>
              </div>}
        </>}

        {inputMode==="youtube"&&<>
          <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",marginBottom:12,fontSize:11,color:"#fbbf24",lineHeight:1.7}}>
            ⚠️ <b>유튜브 모드는 제목·썸네일 분석 + AI 구간 기획 전용입니다.</b><br/>
            실제 영상 편집·추출은 파일을 직접 다운로드 후 <b>"파일 업로드"</b>로 진행해주세요.<br/>
            <span style={{opacity:0.7}}>유튜브 다운로더 앱(예: 4K Video Downloader) 사용 권장</span>
          </div>
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
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"rgba(74,222,128,0.15)",color:"#4ade80",fontWeight:700}}>✓ 제목 확인됨 · AI 기획 가능</span>
              </div>
            </div>
          </div>}
          {ytInfo?.error&&<div style={{fontSize:12,color:"#f87171",padding:"6px 0"}}>⚠️ {ytInfo.title}</div>}
        </>}

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={()=>setStep(0)} style={{padding:"12px 20px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer"}}>← 처음으로</button>
          <button onClick={()=>setStep(2)} disabled={inputMode==="youtube"?!ytInfo||ytInfo.error:!file}
            style={{flex:1,padding:"13px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#3F72AF,#112D4E)",color:"#fff",fontSize:14,fontWeight:900,
              opacity:(inputMode==="youtube"?!ytInfo||ytInfo.error:!file)?0.4:1}}>
            다음 → 기본 설정
          </button>
        </div>
      </div>
    </div>
  );

  // ══ STEP 2: 기본 설정 ══
  if(step===2)return(
    <div style={{flex:1,overflowY:"auto"}}>
      <div style={{maxWidth:740,margin:"0 auto",padding:"22px 18px 80px"}}>
        {/* 소스 요약 */}
        <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          {inputMode==="youtube"&&ytInfo?.thumbnail&&<img src={ytInfo.thumbnail} alt="" style={{width:68,height:42,objectFit:"cover",borderRadius:6,flexShrink:0}}/>}
          {inputMode==="file"&&<div style={{width:68,height:42,background:"#1a1a2e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🎬</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inputMode==="youtube"?ytInfo?.title:file?.name}</div>
            <div style={{fontSize:10,color:muted}}>{inputMode==="youtube"?"유튜브":"업로드 파일"}{(fileDur||ytInfo?.duration)?` · ${toMMSS(fileDur||ytInfo?.duration)}`:""}  </div>
          </div>
          <button onClick={()=>setStep(1)} style={{fontSize:11,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>변경</button>
        </div>

        {/* 쇼츠 길이 */}
        <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"14px",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:9}}>⏱ 쇼츠 길이</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {LENGTHS.map(l=>{const s=lenId===l.id;return(
              <button key={l.id} onClick={()=>setLenId(l.id)} style={{padding:"10px 4px",borderRadius:9,border:`2px solid ${s?ACC:bdr}`,background:s?`rgba(168,85,247,0.15)`:"transparent",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:800,color:s?ACC:text}}>{l.label}</div>
              </button>
            );})}
          </div>
        </div>

        {/* 구간 + 개수 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:text}}>✂️ 분석 구간</span>
              <span style={{fontSize:11,color:ACC,fontWeight:700}}>00:00 ~ {toMMSS(rangeEnd)}</span>
            </div>
            <input type="range" min={0} max={totalDur} value={rangeEnd} onChange={e=>setRangeEnd(Number(e.target.value))} style={{width:"100%",accentColor:ACC}}/>
            <div style={{fontSize:10,color:muted,marginTop:4}}>전체 {toMMSS(totalDur)} 중 앞부분 분석</div>
          </div>
          <div style={{borderRadius:11,border:`1px solid ${bdr}`,background:card,padding:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:text}}>생성 수</span>
              <span style={{fontSize:18,fontWeight:900,color:ACC}}>{count}개</span>
            </div>
            <input type="range" min={1} max={10} value={count} onChange={e=>setCount(Number(e.target.value))} style={{width:"100%",accentColor:ACC}}/>
            <div style={{fontSize:10,color:muted,marginTop:4}}>숏폼 클립 {count}개 생성</div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={()=>setStep(1)} style={{padding:"12px 20px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer"}}>← 이전</button>
          <button onClick={()=>setStep(3)}
            style={{flex:1,padding:"13px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#3F72AF,#112D4E)",color:"#fff",fontSize:14,fontWeight:900}}>
            다음 → 레이아웃 선택
          </button>
        </div>
      </div>
    </div>
  );

  // ══ STEP 3: 레이아웃 & 스타일 선택 ══
  if(step===3){
    const curLayout=LAYOUTS.find(l=>l.id===layoutType)||LAYOUTS[0];
    const curPreset=CAP_PRESETS.find(p=>p.id===presetId)||CAP_PRESETS[0];
    return(
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{maxWidth:860,margin:"0 auto",padding:"22px 18px 80px"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:19,fontWeight:900,color:text,marginBottom:3}}>화면 레이아웃 & 자막 스타일</div>
            <div style={{fontSize:12,color:muted}}>원하는 화면 구성과 자막 스타일을 선택하세요</div>
          </div>

          {/* ── 레이아웃 선택 ── */}
          <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:card,padding:"16px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:14}}>🎬 화면 레이아웃 선택</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {LAYOUTS.map(lay=>{
                const sel=layoutType===lay.id;
                return(
                  <button key={lay.id} onClick={()=>setLayoutType(lay.id)}
                    style={{padding:0,border:`2px solid ${sel?ACC:bdr}`,borderRadius:14,background:sel?`rgba(168,85,247,0.1)`:"transparent",cursor:"pointer",overflow:"hidden",textAlign:"left",
                      boxShadow:sel?`0 0 0 2px ${ACC}40`:"none",transition:"all 0.15s"}}>
                    {/* 레이아웃 프리뷰 */}
                    <div style={{aspectRatio:"9/16",width:"100%",background:"#111",overflow:"hidden",maxHeight:160,position:"relative"}}>
                      {lay.preview(capStyle.topColor,capStyle.botColor)}
                      {sel&&<div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:ACC,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:900}}>✓</div>}
                    </div>
                    <div style={{padding:"8px 10px",borderTop:`1px solid ${sel?ACC+"40":bdr}`}}>
                      <div style={{fontSize:11,fontWeight:800,color:sel?ACC:text,marginBottom:2}}>{lay.label}</div>
                      <div style={{fontSize:9,color:muted,lineHeight:1.5,whiteSpace:"pre-line"}}>{lay.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 자막 스타일 프리셋 ── */}
          <div style={{borderRadius:14,border:`1px solid ${bdr}`,background:card,padding:"16px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>✨ 자막 스타일 프리셋</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
              {CAP_PRESETS.map(p=>{
                const sel=presetId===p.id;
                return(
                  <button key={p.id} onClick={()=>applyPreset(p.id)}
                    style={{padding:"10px 8px",borderRadius:10,border:`2px solid ${sel?ACC:bdr}`,background:sel?`rgba(168,85,247,0.1)`:"transparent",cursor:"pointer",
                      display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    {/* 미니 색상 미리보기 */}
                    <div style={{width:"100%",height:36,borderRadius:6,background:"#111",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"4px"}}>
                      <div style={{fontSize:7,fontWeight:900,color:p.topColor,textShadow:"1px 1px 3px #000",lineHeight:1,textAlign:"center"}}>제목 텍스트</div>
                      <div style={{fontSize:7,fontWeight:900,color:p.botColor,textShadow:"1px 1px 3px #000",lineHeight:1,textAlign:"center"}}>자막 텍스트</div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:sel?ACC:text}}>{p.label}</div>
                  </button>
                );
              })}
            </div>

            {/* 커스텀 색상 */}
            <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:ibg,padding:"12px"}}>
              <div style={{fontSize:11,fontWeight:700,color:text,marginBottom:10}}>🎨 색상 직접 설정</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <div style={{fontSize:10,color:muted,marginBottom:6}}>상단 제목 색상</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="color" value={capStyle.topColor||"#ffffff"} onChange={e=>setCapStyle(p=>({...p,topColor:e.target.value,color:e.target.value}))}
                      style={{width:40,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                    <span style={{fontSize:13,fontWeight:900,color:capStyle.topColor,textShadow:"1px 1px 4px rgba(0,0,0,0.8)"}}>Aa</span>
                    <span style={{fontSize:11,color:muted}}>{capStyle.topColor}</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:muted,marginBottom:6}}>하단 자막 색상</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="color" value={capStyle.botColor||"#ffff00"} onChange={e=>setCapStyle(p=>({...p,botColor:e.target.value,hl:e.target.value}))}
                      style={{width:40,height:32,borderRadius:6,border:`1px solid ${bdr}`,cursor:"pointer",padding:2}}/>
                    <span style={{fontSize:13,fontWeight:900,color:capStyle.botColor,textShadow:"1px 1px 4px rgba(0,0,0,0.8)"}}>Aa</span>
                    <span style={{fontSize:11,color:muted}}>{capStyle.botColor}</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,color:muted,marginBottom:6}}>글꼴</div>
                  <select value={capStyle.font} onChange={e=>setCapStyle(p=>({...p,font:e.target.value}))}
                    style={{...inp,padding:"7px 10px",fontSize:11}}>
                    {["Noto Sans KR","나눔고딕","나눔스퀘어","Pretendard","Arial","Impact"].map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:10,color:muted,marginBottom:6}}>배경 투명도 {Math.round(capStyle.bgOp*100)}%</div>
                  <input type="range" min={0} max={100} value={Math.round(capStyle.bgOp*100)} onChange={e=>setCapStyle(p=>({...p,bgOp:Number(e.target.value)/100}))} style={{width:"100%",accentColor:ACC,marginTop:6}}/>
                </div>
              </div>
            </div>

            {/* 실제 미리보기 */}
            <div style={{marginTop:12,borderRadius:10,background:"#000",padding:"14px",display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
              <div style={{width:72,aspectRatio:"9/16",borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)"}}>
                {curLayout.preview(capStyle.topColor,capStyle.botColor)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:muted,marginBottom:6}}>미리보기</div>
                <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                  <div style={{fontFamily:capStyle.font,fontSize:13,fontWeight:900,color:capStyle.topColor,textShadow:"2px 2px 6px rgba(0,0,0,0.9)",marginBottom:4}}>후킹 제목 텍스트</div>
                  <div style={{fontFamily:capStyle.font,fontSize:12,fontWeight:700,color:capStyle.botColor,textShadow:"2px 2px 6px rgba(0,0,0,0.9)"}}>첫 3초 자막</div>
                </div>
                <div style={{fontSize:10,color:muted}}>{curLayout.label} · {curPreset.label} 스타일</div>
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{padding:"12px 20px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:13,cursor:"pointer"}}>← 이전</button>
            <button onClick={generate}
              style={{flex:1,padding:"14px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#3F72AF,#112D4E)",color:"#fff",fontSize:14,fontWeight:900}}>
              🤖 AI 분석 시작 → 숏폼 {count}개 생성
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══ STEP 4: 생성중 ══
  if(step===4)return(
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
            <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#3F72AF,#112D4E)",width:`${prog}%`,transition:"width 0.5s"}}/>
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  // ══ STEP 5: 결과 ══
  const TABS=[{id:"clips",l:"✂️ 숏폼"},{id:"archive",l:`🗂 보관함(${archive.length})`}];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* 탭 바 */}
      <div style={{display:"flex",borderBottom:`1px solid ${bdr}`,background:card,flexShrink:0,alignItems:"center"}}>
        <button onClick={()=>setStep(3)} style={{padding:"10px 12px",border:"none",background:"transparent",color:muted,fontSize:11,cursor:"pointer",borderRight:`1px solid ${bdr}`,whiteSpace:"nowrap"}}>← 재설정</button>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 12px",border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t.id?800:500,color:tab===t.id?ACC:muted,background:"transparent",borderBottom:tab===t.id?`2px solid ${ACC}`:"2px solid transparent",whiteSpace:"nowrap"}}>
            {t.l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {archMsg&&<div style={{fontSize:10,color:"#4ade80",padding:"0 8px",fontWeight:700}}>{archMsg}</div>}
        {err&&<div style={{fontSize:10,color:"#f87171",padding:"0 6px"}}>{err}</div>}
        {autoMode&&<div style={{fontSize:10,color:ACC,padding:"0 6px",fontWeight:700,animation:"pulse 1s ease-in-out infinite"}}>⚡ 자동편집 {autoIdx}/{clips.length}</div>}
        <button onClick={()=>autoExtractAll(clips)} disabled={autoMode||rec}
          style={{margin:"0 4px",padding:"4px 10px",borderRadius:7,border:`1px solid ${ACC}`,background:`rgba(168,85,247,0.15)`,color:ACC,fontSize:10,cursor:autoMode||rec?"not-allowed":"pointer",fontWeight:700,whiteSpace:"nowrap",opacity:autoMode||rec?0.5:1}}>
          ⚡ 전체자동편집
        </button>
        <button onClick={saveAll} style={{margin:"0 4px",padding:"4px 10px",borderRadius:7,border:`1px solid ${ACC}40`,background:`rgba(168,85,247,0.1)`,color:ACC,fontSize:10,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>🗂 전체저장</button>
        <div style={{padding:"0 8px",fontSize:10,color:muted,whiteSpace:"nowrap"}}>{clips.length}개</div>
      </div>

      {/* 보관함 탭 */}
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

      {/* 결과 메인 */}
      {tab==="clips"&&(
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* 왼쪽: 클립 목록 */}
          <div style={{width:220,borderRight:`1px solid ${bdr}`,overflowY:"auto",flexShrink:0}}>
            {clips.map((clip,i)=>{
              const hc=clip.hook_score>=80?"#4ade80":clip.hook_score>=60?"#f59e0b":"#f87171";
              const vc=clip.viral_score>=80?"#4ade80":clip.viral_score>=60?"#f59e0b":"#f87171";
              const ex=extracted[clip.index??i];
              return(
                <div key={i} onClick={()=>{setSelIdx(i);setTopText(clip.title_a||"");setBotText(clip.hook||"");}}
                  style={{padding:"10px 11px",borderBottom:`1px solid ${bdr}`,cursor:"pointer",
                    background:selIdx===i?`rgba(168,85,247,0.12)`:"transparent",
                    borderLeft:selIdx===i?`3px solid ${ACC}`:"3px solid transparent"}}>
                  <div style={{position:"relative",borderRadius:8,overflow:"hidden",marginBottom:7,background:"#0f0f0f",aspectRatio:"9/16",maxHeight:140}}>
                    {ex
                      ? <video src={ex.url} style={{width:"100%",height:"100%",objectFit:"cover"}} muted playsInline loop autoPlay/>
                      : inputMode==="youtube"&&ytInfo?.thumbnail
                        ? <img src={ytInfo.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🎬</div>}
                    {!ex&&<div style={{position:"absolute",bottom:0,left:0,right:0,padding:"3px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.85))",fontFamily:capStyle.font,fontSize:7,fontWeight:900,color:capStyle.botColor,textAlign:"center"}}>{clip.hook?.slice(0,22)}</div>}
                    <div style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,0.8)",padding:"1px 4px",borderRadius:3,fontSize:8,color:"#fff"}}>{clip.duration}s</div>
                    {ex&&<div style={{position:"absolute",top:3,left:3,background:"#4ade80",borderRadius:4,padding:"1px 5px",fontSize:7,fontWeight:700,color:"#000"}}>✓완료</div>}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:selIdx===i?ACC:text,lineHeight:1.4,marginBottom:5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{clip.title_a}</div>
                  <div style={{display:"flex",gap:4,marginBottom:5}}>
                    <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:`${hc}18`,color:hc,fontWeight:700}}>후킹 {clip.hook_score}</span>
                    <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:`${vc}18`,color:vc,fontWeight:700}}>바이럴 {clip.viral_score}</span>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={e=>{e.stopPropagation();saveOne(clip);}} style={{flex:1,padding:"4px",borderRadius:5,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.08)`,color:ACC,fontSize:9,cursor:"pointer"}}>🗂 저장</button>
                    <button onClick={e=>{e.stopPropagation();setSelIdx(i);ex?downloadClip(clip):extract(clip);}} disabled={rec}
                      style={{flex:2,padding:"4px",borderRadius:5,border:`1px solid ${ex?"rgba(74,222,128,0.3)":`${ACC}30`}`,
                        background:ex?"rgba(74,222,128,0.1)":`rgba(168,85,247,0.08)`,
                        color:ex?"#4ade80":ACC,fontSize:9,cursor:"pointer",fontWeight:700,opacity:rec?0.5:1}}>
                      {ex?"↓ 다운로드":"✂️ 추출"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 가운데: 9:16 플레이어 */}
          <div style={{flexShrink:0,display:"flex",flexDirection:"column",background:"#060606",borderRight:`1px solid ${bdr}`,
            width:"calc((100vh - 130px) * 9 / 16 + 20px)",minWidth:240,maxWidth:360}}>
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px"}}>
              <div style={{position:"relative",height:"calc(100vh - 170px)",maxHeight:"80vh",aspectRatio:"9/16",
                background:"#111",borderRadius:14,overflow:"hidden",boxShadow:"0 8px 36px rgba(0,0,0,0.8)"}}>
                {(()=>{
                  const k=cur.index??selIdx;
                  const ex=extracted[k];
                  if(ex)return<video key={ex.url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} controls loop src={ex.url}/>;
                  if(inputMode==="file"&&file)return(
                    <video key={`f-${selIdx}`} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} controls
                      onLoadedMetadata={e=>{e.target.currentTime=curStart;}}
                      onTimeUpdate={e=>{if(e.target.currentTime>=curEnd&&curEnd>curStart)e.target.currentTime=curStart;}}
                      src={fileObjUrl.current||""}/>
                  );
                  if(inputMode==="youtube"&&ytInfo)return(
                    <div style={{width:"100%",height:"100%",position:"relative"}}>
                      <img src={ytInfo.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 40%,rgba(0,0,0,0.75))"}}/>
                      <div style={{position:"absolute",bottom:12,left:8,right:8,textAlign:"center",
                        fontFamily:capStyle.font,fontSize:13,fontWeight:900,color:capStyle.botColor,
                        textShadow:"2px 2px 8px rgba(0,0,0,0.9)",padding:"4px 8px",borderRadius:5,lineHeight:1.4}}>
                        {cur.hook||"미리보기"}
                      </div>
                      <div style={{position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.75)",padding:"2px 8px",borderRadius:5,fontSize:10,color:"#fff",fontWeight:700}}>{cur.startTime} ~ {cur.endTime}</div>
                      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                        width:52,height:52,borderRadius:"50%",background:"rgba(168,85,247,0.75)",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer"}}
                        onClick={()=>extract(cur)}>▶</div>
                    </div>
                  );
                  return<div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:muted,fontSize:12,gap:8}}>
                    <div>✂️ 추출 버튼을 눌러주세요</div>
                    <div style={{fontSize:10,opacity:0.6}}>{cur.startTime} ~ {cur.endTime}</div>
                  </div>;
                })()}
                {rec&&(
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:"12px"}}>
                    <div style={{position:"relative",width:50,height:50}}>
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${ACC}25`}}/>
                      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:ACC,animation:"spin 1s linear infinite"}}/>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>✂️</div>
                    </div>
                    <div style={{fontSize:10,color:ACC,fontWeight:700,textAlign:"center",lineHeight:1.5,padding:"0 6px"}}>{recMsg}</div>
                    <div style={{width:120,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:2,background:ACC,width:`${recPct}%`,transition:"width 0.3s"}}/>
                    </div>
                    <div style={{fontSize:9,color:ACC}}>{recPct}%</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:"8px 10px",borderTop:`1px solid rgba(255,255,255,0.06)`,display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
              {(()=>{
                const k=cur.index??selIdx;const ex=extracted[k];
                return<>
                  {!ex?(
                    <button onClick={()=>extract(cur)} disabled={rec}
                      style={{width:"100%",padding:"10px",borderRadius:10,border:"none",cursor:rec?"not-allowed":"pointer",
                        background:rec?"rgba(168,85,247,0.2)":`linear-gradient(135deg,${ACC},#112D4E)`,
                        color:"#fff",fontSize:12,fontWeight:800,opacity:rec?0.6:1}}>
                      {rec?`✂️ ${recPct}%`:"✂️ 세로영상 추출 & 재생"}
                    </button>
                  ):(
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>downloadClip(cur)} style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#4ade80,#22c55e)",color:"#000",fontSize:12,cursor:"pointer",fontWeight:800}}>↓ MP4 다운로드</button>
                      <button onClick={()=>extract(cur)} disabled={rec} style={{padding:"9px 11px",borderRadius:9,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer"}} title="재추출">🔄</button>
                    </div>
                  )}
                  <div style={{fontSize:9,color:muted,textAlign:"center"}}>{cur.startTime}~{cur.endTime} · {cur.duration}초 · 1080×1920{ex&&<span style={{color:"#4ade80",marginLeft:4}}>✓ 완료</span>}</div>
                  <button onClick={()=>saveOne(cur)} style={{width:"100%",padding:"6px",borderRadius:8,border:`1px solid ${ACC}30`,background:`rgba(168,85,247,0.08)`,color:ACC,fontSize:10,cursor:"pointer",fontWeight:700}}>🗂 보관함 저장</button>
                </>;
              })()}
            </div>
          </div>

          {/* 오른쪽: 상세 정보 */}
          <div style={{flex:1,minWidth:0,overflowY:"auto"}}>
            <div style={{padding:"16px 18px"}}>
              {/* 자막 직접 편집 */}
              <div style={{borderRadius:12,border:`2px solid ${ACC}40`,background:card,padding:"13px",marginBottom:11}}>
                <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:9}}>✏️ 자막 직접 편집</div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:muted,marginBottom:4}}>상단 제목</div>
                  <input value={topText} onChange={e=>setTopText(e.target.value)} style={{...inp,fontSize:12,padding:"8px 11px"}} placeholder="상단 제목 텍스트"/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:muted,marginBottom:4}}>하단 자막</div>
                  <input value={botText} onChange={e=>setBotText(e.target.value)} style={{...inp,fontSize:12,padding:"8px 11px"}} placeholder="하단 자막 텍스트"/>
                </div>
                <button onClick={()=>extract({...cur,title_a:topText,hook:botText},false,null,topText,botText)} disabled={rec}
                  style={{width:"100%",padding:"8px",borderRadius:8,border:"none",cursor:rec?"not-allowed":"pointer",background:`linear-gradient(135deg,${ACC},#112D4E)`,color:"#fff",fontSize:11,fontWeight:800,opacity:rec?0.5:1}}>
                  ✂️ 커스텀 자막으로 재추출
                </button>
              </div>

              {/* 후킹 제목 3버전 */}
              <div style={{borderRadius:12,border:`1px solid ${bdr}`,background:card,padding:"13px",marginBottom:11}}>
                <div style={{fontSize:12,fontWeight:800,color:text,marginBottom:9}}>🎯 후킹 제목 3버전</div>
                {[["A","충격·후킹",cur.title_a,"#ef4444"],["B","감성·공감",cur.title_b,"#f59e0b"],["C","정보·궁금증",cur.title_c,"#06b6d4"]].map(([v,typ,t,col])=>(
                  <div key={v} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${col}25`,background:`${col}06`,marginBottom:5}}>
                    <div style={{width:18,height:18,borderRadius:5,background:`${col}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:col,flexShrink:0}}>{v}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:8,color:col,fontWeight:700,marginBottom:1}}>{typ}</div>
                      <div style={{fontSize:12,fontWeight:700,color:text,lineHeight:1.3}}>{t}</div>
                    </div>
                    <button onClick={()=>{cp(t||"","t"+v);setTopText(t||"");}} style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${col}25`,background:"transparent",color:col,fontSize:9,cursor:"pointer",flexShrink:0}}>{copied==="t"+v?"✅":"사용"}</button>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
                <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:8}}>🔥 AI 예측 점수</div>
                  {[["후킹",cur.hook_score],["바이럴",cur.viral_score]].map(([l,v])=>{
                    const c=v>=80?"#4ade80":v>=60?"#f59e0b":"#f87171";
                    return<div key={l} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:11,color:muted}}>{l}</span><span style={{fontSize:14,fontWeight:900,color:c}}>{v}</span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:D?"rgba(255,255,255,0.08)":"#e5e7eb",overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:3,background:c,width:`${v||0}%`,transition:"width 0.5s"}}/>
                      </div>
                    </div>;
                  })}
                </div>
                <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:muted,marginBottom:6}}>🖼 썸네일 멘트</div>
                  <div style={{padding:"8px",borderRadius:7,background:"#0f0f0f",textAlign:"center",marginBottom:6,minHeight:42,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontFamily:capStyle.font,fontSize:13,fontWeight:900,color:"#fff",textShadow:"2px 2px 6px rgba(0,0,0,0.9)"}}>{cur.thumbnail_text||"-"}</div>
                  </div>
                  <button onClick={()=>cp(cur.thumbnail_text||"","th")} style={{width:"100%",padding:"4px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:9,cursor:"pointer"}}>{copied==="th"?"✅":"복사"}</button>
                </div>
              </div>

              <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"13px",marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <div style={{fontSize:12,fontWeight:800,color:text}}>📝 자막 스크립트</div>
                  <button onClick={()=>cp(cur.script||"","sc")} style={{fontSize:10,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="sc"?"✅":"전체 복사"}</button>
                </div>
                {cur.hook&&<div style={{padding:"6px 10px",borderRadius:7,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:7,fontSize:11,color:"#f87171",fontWeight:600}}>첫 3초: "{cur.hook}"</div>}
                <div style={{padding:"9px 11px",borderRadius:8,background:ibg,fontSize:12,color:text,lineHeight:1.9,whiteSpace:"pre-wrap",maxHeight:180,overflowY:"auto"}}>{cur.script}</div>
              </div>

              {cur.hashtags?.length>0&&(
                <div style={{borderRadius:10,border:`1px solid ${bdr}`,background:card,padding:"12px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <div style={{fontSize:11,fontWeight:700,color:text}}>#️⃣ 해시태그</div>
                    <button onClick={()=>cp(cur.hashtags.join(" "),"ht")} style={{fontSize:10,color:ACC,background:"transparent",border:"none",cursor:"pointer"}}>{copied==="ht"?"✅":"전체 복사"}</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {cur.hashtags.map((tag,j)=>(
                      <span key={j} onClick={()=>cp(tag,"tg"+j)} style={{padding:"3px 9px",borderRadius:9,background:`rgba(168,85,247,0.12)`,color:ACC,fontSize:11,fontWeight:600,cursor:"pointer",border:`1px solid rgba(168,85,247,0.25)`}}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {cur.reason&&(
                <div style={{padding:"10px 12px",borderRadius:9,background:`rgba(168,85,247,0.06)`,border:`1px solid ${ACC}20`,fontSize:11,color:muted,lineHeight:1.7}}>
                  💡 {cur.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
