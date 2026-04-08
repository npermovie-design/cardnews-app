import React, { useState, useRef } from "react";

const SNS_PLATFORMS = [
  { id: "instagram", label: "인스타그램", placeholder: "https://www.instagram.com/username", color: "#E1306C", match: /instagram\.com/ },
  { id: "youtube", label: "유튜브", placeholder: "https://www.youtube.com/@channel", color: "#FF0000", match: /youtube\.com|youtu\.be/ },
  { id: "tiktok", label: "틱톡", placeholder: "https://www.tiktok.com/@username", color: "#010101", match: /tiktok\.com/ },
  { id: "naver_blog", label: "네이버 블로그", placeholder: "https://blog.naver.com/username", color: "#03C75A", match: /blog\.naver\.com/ },
  { id: "threads", label: "스레드", placeholder: "https://www.threads.net/@username", color: "#000000", match: /threads\.net/ },
  { id: "x", label: "X", placeholder: "https://x.com/username", color: "#000000", match: /x\.com|twitter\.com/ },
  { id: "facebook", label: "페이스북", placeholder: "https://www.facebook.com/page", color: "#1877F2", match: /facebook\.com/ },
  { id: "tistory", label: "티스토리", placeholder: "https://example.tistory.com", color: "#FF6B35", match: /tistory\.com/ },
  { id: "other", label: "기타", placeholder: "https://...", color: "#888", match: null },
];
function detectPlatform(url) { for (const p of SNS_PLATFORMS) { if (p.match && p.match.test(url)) return p; } return SNS_PLATFORMS[SNS_PLATFORMS.length - 1]; }
function fmtNum(n) { if (!n && n !== 0) return "-"; const num = typeof n === "string" ? parseInt(n.replace(/[^0-9]/g, "")) : n; if (isNaN(num)) return "-"; if (num >= 100000000) return (num / 100000000).toFixed(1) + "억"; if (num >= 10000) return (num / 10000).toFixed(1) + "만"; if (num >= 1000) return (num / 1000).toFixed(1) + "천"; return num.toLocaleString(); }
function fmtDate(d) { if (!d) return ""; const dt = new Date(d); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; }
function parseDuration(iso) { if (!iso) return ""; const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (!m) return ""; const h = parseInt(m[1]||"0"), mi = parseInt(m[2]||"0"), s = parseInt(m[3]||"0"); return h > 0 ? `${h}:${String(mi).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${mi}:${String(s).padStart(2,"0")}`; }

export default function SocialAnalyzer({ isDark }) {
  const [links, setLinks] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [channels, setChannels] = useState([]); // 수집 데이터
  const [report, setReport] = useState(null); // AI 리포트 (플랫폼별 분리)
  const [activeTab, setActiveTab] = useState("overview"); // 탭

  const acc = "#7c6aff"; const text = isDark ? "#fff" : "#1a1a1a"; const muted = isDark ? "rgba(255,255,255,0.45)" : "#999";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff"; const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const validLinks = links.filter(l => l.trim());
  const addLink = () => { if (links.length < 10) setLinks([...links, ""]); };
  const removeLink = (i) => { if (links.length > 1) setLinks(links.filter((_, j) => j !== i)); };
  const updateLink = (i, v) => { const n = [...links]; n[i] = v; setLinks(n); };

  // ── 유튜브 채널 데이터 ──
  const fetchYoutube = async (url) => {
    try {
      const h = url.match(/@([a-zA-Z0-9_.-]+)/); const cid = url.match(/channel\/([a-zA-Z0-9_-]+)/);
      let info = null;
      if (h) { const r = await fetch(`/api/youtube-search?action=channel-detail&forHandle=${h[1]}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } }
      if (!info && cid) { const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${cid[1]}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } }
      if (!info && h) { const sr = await fetch(`/api/youtube-search?action=channel-search&q=${encodeURIComponent("@"+h[1])}`); if (sr.ok) { const sd = await sr.json(); const id = sd?.items?.[0]?.channelId; if (id) { const r = await fetch(`/api/youtube-search?action=channel-detail&channelId=${id}`); if (r.ok) { const d = await r.json(); if (d?.items?.[0]) info = d.items[0]; } } } }
      if (!info) return null;
      const s = info.statistics || {}; const sn = info.snippet || {};
      const subs = parseInt(s.subscriberCount)||0, views = parseInt(s.viewCount)||0, vids = parseInt(s.videoCount)||0;
      let recent = [];
      if (info.id) { const vr = await fetch(`/api/youtube-search?action=channel-videos&channelId=${info.id}&maxResults=10`); if (vr.ok) { const vd = await vr.json(); recent = vd.videos || []; } }
      const avgRecent = recent.length > 0 ? Math.round(recent.reduce((a,v)=>a+v.viewCount,0)/recent.length) : 0;
      const engage = recent.length > 0 ? (recent.reduce((a,v)=>a+v.likeCount+v.commentCount,0) / Math.max(1, recent.reduce((a,v)=>a+v.viewCount,0)) * 100).toFixed(2) : "0";
      return { type:"youtube", name: sn.title||"", thumb: sn.thumbnails?.medium?.url||"", subs, views, vids, avgViews: vids>0?Math.round(views/vids):0, avgRecent, engage, desc: (sn.description||"").slice(0,500), created: sn.publishedAt||"", recent };
    } catch { return null; }
  };

  // ── SNS 프로필 크롤링 ──
  const fetchProfile = async (url) => {
    try {
      const r = await fetch("/api/content?action=sns-profile", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({url}) });
      if (!r.ok) return null; return await r.json();
    } catch { return null; }
  };

  // ── 분석 ──
  const analyze = async () => {
    if (!validLinks.length) return;
    setLoading(true); setError(null); setChannels([]); setReport(null); setActiveTab("overview");
    try {
      const collected = [];
      for (let i = 0; i < validLinks.length; i++) {
        const url = validLinks[i]; const plat = detectPlatform(url);
        setProgress(`${plat?.label} 데이터 수집 중... (${i+1}/${validLinks.length})`);
        if (plat?.id === "youtube") { collected.push({ url, plat, yt: await fetchYoutube(url) }); }
        else { collected.push({ url, plat, profile: await fetchProfile(url) }); }
      }
      setChannels(collected);
      setProgress("AI 분석 리포트 생성 중...");

      // AI 프롬프트
      const info = collected.map((c,i) => {
        let t = `[계정${i+1}] ${c.plat?.label} | ${c.url}`;
        if (c.yt) { const d=c.yt; t+=`\n채널명:${d.name}\n구독자:${d.subs}\n총조회수:${d.views}\n영상수:${d.vids}\n평균조회수:${d.avgViews}\n최근평균:${d.avgRecent}\n참여율:${d.engage}%\n설명:${d.desc}`; if(d.recent?.length){t+="\n최근영상:"; d.recent.forEach((v,vi)=>{t+=`\n${vi+1}."${v.title}"|조회${v.viewCount}|좋아요${v.likeCount}|댓글${v.commentCount}|${fmtDate(v.publishedAt)}`;});} }
        if (c.profile) { const m=c.profile.meta||{}; if(m["og:title"])t+=`\n이름:${m["og:title"]}`; if(m["og:description"])t+=`\n설명:${m["og:description"]}`; if(m._visitors)t+=`\n방문자:${m._visitors}`; if(m._postCount)t+=`\n게시글:${m._postCount}`; if(c.profile.texts?.length)t+=`\n콘텐츠:${c.profile.texts.slice(0,15).join(" | ")}`; }
        return t;
      }).join("\n---\n");

      const prompt = `SNS 전문 분석가로서 실제 수집 데이터를 분석하세요.
[핵심] 채널명/URL이 아닌 영상 제목, 크롤링 텍스트 등 실제 콘텐츠 기반으로 판단하세요.

${info}

한국어. 이모지/특수기호 금지. 마크다운 테이블 적극 사용.

## 종합 진단
각 계정을 아래 표로:
| 항목 | 결과 |
|---|---|
| 카테고리 | (실제 콘텐츠 기반) |
| 등급 | (S/A/B/C/D) |
| 강점 | (3가지) |
| 약점 | (3가지) |

## 경쟁 채널
| 채널명 | 플랫폼 | 규모 | URL | 참고 포인트 |
|---|---|---|---|---|
5개 이상. 실제 존재하는 채널.

## 액션 플랜
| 순위 | 액션 | 효과 | 난이도 | 기간 |
|---|---|---|---|---|
10개. 우선순위순.

## 콘텐츠 아이디어
| 번호 | 제목 | 형식 | 예상반응 |
|---|---|---|---|
10개.

## 키워드 전략
핵심 5개, 롱테일 5개, 해시태그 10개

## 업로드 전략
| 항목 | 추천 |
|---|---|
최적 요일/시간/빈도/썸네일/제목 전략`;

      const r = await fetch("/api/gemini-generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({prompt, maxTokens:4000}) });
      if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error || "AI 실패");
      const rd = await r.json();
      setReport(rd?.text || "");
      setProgress("");
      setActiveTab(collected.length > 0 ? "ch0" : "overview");
    } catch (e) { setError(e.message); setProgress(""); } finally { setLoading(false); }
  };

  // ════════════════════════════════
  //  컴포넌트
  // ════════════════════════════════
  const Card = ({children, style:s}) => <div style={{background:cardBg, borderRadius:14, border:`1px solid ${bdr}`, padding:"20px 18px", ...s}}>{children}</div>;
  const Stat = ({label,value,sub,color}) => (
    <div style={{textAlign:"center",flex:1,minWidth:80}}>
      <div style={{fontSize:10,fontWeight:600,color:muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:color||text,letterSpacing:-0.5}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:muted,marginTop:2}}>{sub}</div>}
    </div>
  );
  const Grade = ({g}) => { const c={S:"#7c6aff",A:"#22c55e",B:"#3b82f6",C:"#f59e0b",D:"#ef4444"}[g]||muted; return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:10,background:`${c}15`,border:`2px solid ${c}40`,fontSize:18,fontWeight:900,color:c}}>{g}</span>; };
  const Bar = ({value,max,color,label}) => { const pct=max>0?Math.min(100,value/max*100):0; return (
    <div style={{marginBottom:6}}>
      {label&&<div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:isDark?"rgba(255,255,255,0.6)":"#666",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{label}</span><span style={{color:color||acc,fontWeight:700,flexShrink:0}}>{fmtNum(value)}</span></div>}
      <div style={{height:6,borderRadius:3,background:isDark?"rgba(255,255,255,0.06)":"#eee",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:3,background:color||acc,transition:"width 0.6s"}}/></div>
    </div>
  );};

  // ── 유튜브 탭 ──
  const YtTab = ({d}) => { const mx = Math.max(...d.recent.map(v=>v.viewCount),1); return (
    <div>
      {/* 상단: 프로필 + 핵심 지표 */}
      <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:20}}>
        {d.thumb&&<img src={d.thumb} alt="" style={{width:56,height:56,borderRadius:14,objectFit:"cover",border:"2px solid #FF000020"}}/>}
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:text}}>{d.name}</div>
          <div style={{fontSize:11,color:muted}}>개설일 {fmtDate(d.created)}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",background:isDark?"rgba(255,255,255,0.02)":"#f8f9fb",borderRadius:12,padding:"16px 12px",border:`1px solid ${bdr}`}}>
        <Stat label="구독자" value={fmtNum(d.subs)} color="#FF0000"/>
        <Stat label="총 조회수" value={fmtNum(d.views)} color="#FF4444"/>
        <Stat label="영상 수" value={fmtNum(d.vids)}/>
        <Stat label="최근 평균" value={fmtNum(d.avgRecent)} sub="최근10개"/>
        <Stat label="참여율" value={`${d.engage}%`} sub="좋아요+댓글"/>
      </div>
      {/* 2열: 조회수 차트 + 최근 영상 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card><div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>영상별 조회수</div>
          {d.recent.slice(0,6).map((v,i)=><Bar key={i} value={v.viewCount} max={mx} color="#FF0000" label={v.title.length>25?v.title.slice(0,25)+"...":v.title}/>)}
        </Card>
        <Card><div style={{fontSize:13,fontWeight:800,color:text,marginBottom:12}}>최근 업로드</div>
          {d.recent.slice(0,4).map((v,i)=>(
            <a key={i} href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" style={{display:"flex",gap:10,marginBottom:10,textDecoration:"none",color:"inherit"}}>
              <img src={v.thumbnail} alt="" style={{width:80,height:45,borderRadius:6,objectFit:"cover",flexShrink:0}}/>
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:11,fontWeight:700,color:text,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</div>
                <div style={{fontSize:9,color:muted,marginTop:3}}>조회 {fmtNum(v.viewCount)} | {fmtDate(v.publishedAt)}</div>
              </div>
            </a>
          ))}
        </Card>
      </div>
    </div>
  );};

  // ── 프로필 탭 (비유튜브) ──
  const ProfileTab = ({c}) => { const m = c.profile?.meta||{}; const ogT=m["og:title"]||m._title||""; const ogD=m["og:description"]||m.description||""; const ogI=m["og:image"]||""; return (
    <div>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
        {ogI?<img src={ogI} alt="" style={{width:56,height:56,borderRadius:14,objectFit:"cover",border:`2px solid ${c.plat?.color||acc}20`}} onError={e=>{e.target.style.display="none"}}/>:
          <div style={{width:56,height:56,borderRadius:14,background:`${c.plat?.color||acc}12`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:22,fontWeight:900,color:c.plat?.color||acc}}>{c.plat?.label?.[0]}</span></div>}
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:text}}>{ogT||c.url.replace(/https?:\/\/(www\.)?/,"").split("/").slice(0,2).join("/")}</div>
          {ogD&&<div style={{fontSize:12,color:muted,marginTop:4,lineHeight:1.5}}>{ogD.slice(0,120)}{ogD.length>120?"...":""}</div>}
        </div>
      </div>
      {(m._visitors||m._neighbors||m._postCount)&&(
        <div style={{display:"flex",gap:8,marginBottom:16,background:isDark?"rgba(255,255,255,0.02)":"#f8f9fb",borderRadius:12,padding:"16px 12px",border:`1px solid ${bdr}`}}>
          {m._visitors&&<Stat label="방문자" value={m._visitors} color={c.plat?.color}/>}
          {m._neighbors&&<Stat label="이웃" value={m._neighbors} color={c.plat?.color}/>}
          {m._postCount&&<Stat label="게시글" value={m._postCount} color={c.plat?.color}/>}
        </div>
      )}
      {c.profile?.texts?.length>0&&(
        <Card><div style={{fontSize:12,fontWeight:700,color:text,marginBottom:10}}>수집된 콘텐츠 ({c.profile.texts.length}개)</div>
          {c.profile.texts.slice(0,8).map((t,i)=><div key={i} style={{fontSize:11,color:isDark?"rgba(255,255,255,0.6)":"#666",lineHeight:1.6,marginBottom:4,paddingLeft:8,borderLeft:`2px solid ${c.plat?.color||acc}30`}}>{t.slice(0,100)}</div>)}
        </Card>
      )}
      {!c.profile?.texts?.length&&!m._visitors&&!ogD&&(
        <Card style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>데이터 수집 제한</div>
          <div style={{fontSize:12,color:muted,lineHeight:1.6}}>이 플랫폼은 서버 크롤링이 제한되어 수집 가능한 데이터가 적습니다.<br/>AI가 URL과 플랫폼 특성을 기반으로 분석합니다.</div>
        </Card>
      )}
    </div>
  );};

  // ── 리포트 렌더 ──
  const renderReport = (md) => {
    if (!md) return null;
    const sections = md.split(/^## /m).filter(Boolean);
    const sColors = ["#7c6aff","#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
    return sections.map((sec,si) => {
      const lines = sec.split("\n"); const title = lines[0]?.replace(/\*\*/g,"").trim();
      const body = lines.slice(1); const elements = []; let tbl = []; let k = 0;
      const flush = () => { if (tbl.length>=2) { const rows=tbl.map(l=>l.split("|").map(c=>c.trim()).filter(Boolean)); const hdr=rows[0]; const data=rows.filter((_,i)=>i>0&&!rows[i].every(c=>/^[-:]+$/.test(c)));
        elements.push(<div key={`t${k++}`} style={{overflowX:"auto",marginBottom:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{hdr.map((h,i)=><th key={i} style={{padding:"8px 12px",background:isDark?`${sColors[si%7]}10`:`${sColors[si%7]}08`,borderBottom:`2px solid ${sColors[si%7]}25`,textAlign:"left",fontWeight:800,color:text,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{data.map((row,ri)=><tr key={ri} style={{background:ri%2?isDark?"rgba(255,255,255,0.01)":"rgba(0,0,0,0.01)":"transparent"}}>{row.map((cell,ci)=>{const gm=cell.match(/^([SABCD])등급?$/i); const dm=cell.match(/^(상|중|하)$/); return <td key={ci} style={{padding:"8px 12px",borderBottom:`1px solid ${bdr}`,color:isDark?"rgba(255,255,255,0.8)":"#444",lineHeight:1.5,verticalAlign:"top"}}>{gm?<Grade g={gm[1]}/>:dm?<span style={{padding:"2px 8px",borderRadius:4,background:dm[1]==="하"?"#22c55e15":dm[1]==="중"?"#f59e0b15":"#ef444415",color:dm[1]==="하"?"#22c55e":dm[1]==="중"?"#f59e0b":"#ef4444",fontSize:10,fontWeight:700}}>{cell}</span>:linkify(cell)}</td>;})}</tr>)}</tbody></table></div>);
      } tbl=[]; };
      const linkify = (s) => { if (!s) return s; return s.split(/(https?:\/\/[^\s|)]+)/g).map((p,i)=>/^https?:\/\//.test(p)?<a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{color:acc,fontWeight:700,textDecoration:"underline"}}>{p.replace(/https?:\/\/(www\.)?/,"").slice(0,35)}</a>:p.split(/(\*\*[^*]+\*\*)/g).map((q,j)=>q.startsWith("**")&&q.endsWith("**")?<strong key={j} style={{fontWeight:800,color:text}}>{q.slice(2,-2)}</strong>:q)); };
      body.forEach(line => { const t=line.trim(); if(t.startsWith("|")&&t.endsWith("|")){tbl.push(t);return;} if(tbl.length)flush();
        if(!t){elements.push(<div key={`s${k++}`} style={{height:4}}/>);return;}
        if(t.startsWith("### ")){elements.push(<div key={`h${k++}`} style={{fontSize:13,fontWeight:800,color:text,marginTop:14,marginBottom:6}}>{t.replace(/^###\s*/,"").replace(/\*\*/g,"")}</div>);return;}
        if(t.startsWith("- ")||t.startsWith("* ")){elements.push(<div key={`l${k++}`} style={{display:"flex",gap:6,marginBottom:4,paddingLeft:4}}><span style={{color:sColors[si%7],fontSize:6,marginTop:6}}>●</span><span style={{fontSize:12,color:isDark?"rgba(255,255,255,0.8)":"#444",lineHeight:1.6}}>{linkify(t.replace(/^[-*]\s*/,""))}</span></div>);return;}
        if(/^\d+[\.\)]/.test(t)){const n=t.match(/^(\d+)/)[1];elements.push(<div key={`n${k++}`} style={{display:"flex",gap:8,marginBottom:6,padding:"8px 10px",borderRadius:8,background:isDark?"rgba(255,255,255,0.02)":"#f9fafb",border:`1px solid ${bdr}`}}><span style={{width:22,height:22,borderRadius:6,background:`${sColors[si%7]}12`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:sColors[si%7],flexShrink:0}}>{n}</span><span style={{fontSize:12,color:isDark?"rgba(255,255,255,0.8)":"#444",lineHeight:1.6}}>{linkify(t.replace(/^\d+[\.\)]\s*/,""))}</span></div>);return;}
        elements.push(<div key={`p${k++}`} style={{fontSize:12,color:isDark?"rgba(255,255,255,0.7)":"#555",lineHeight:1.7,marginBottom:2}}>{linkify(t)}</div>);
      }); if(tbl.length)flush();
      return <Card key={si} style={{marginBottom:14}}><div style={{fontSize:15,fontWeight:900,color:text,marginBottom:14,paddingBottom:10,borderBottom:`2px solid ${sColors[si%7]}25`,display:"flex",alignItems:"center",gap:8}}><div style={{width:3,height:18,borderRadius:2,background:sColors[si%7]}}/>{title}</div>{elements}</Card>;
    });
  };

  // ════════════════════════════════
  //  메인 렌더
  // ════════════════════════════════
  const hasData = channels.length > 0;

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px 60px"}}>
      {/* 헤더 */}
      <div style={{marginBottom:24}}>
        <span style={{padding:"4px 12px",borderRadius:16,background:`${acc}12`,fontSize:11,fontWeight:700,color:acc}}>소셜분석기</span>
        <div style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:900,color:text,lineHeight:1.3,marginTop:10}}>SNS 계정 분석 + 성장 전략</div>
      </div>

      {/* 입력 */}
      {!hasData && (
        <Card style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:14}}>SNS 링크 입력</div>
          {links.map((l,i) => { const d=l.trim()?detectPlatform(l):null; return (
            <div key={i} style={{display:"flex",gap:6,marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:d?`${d.color}12`:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1.5px solid ${d?d.color+"30":bdr}`}}><span style={{fontSize:9,fontWeight:800,color:d?.color||muted}}>{d?d.label.slice(0,2):i+1}</span></div>
              <input value={l} onChange={e=>updateLink(i,e.target.value)} placeholder="SNS 프로필 URL" style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${d?d.color+"30":bdr}`,background:inputBg,color:text,fontSize:12,outline:"none"}}/>
              {links.length>1&&<button onClick={()=>removeLink(i)} style={{width:28,height:28,borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer"}}>x</button>}
            </div>
          );})}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            {links.length<10&&<button onClick={addLink} style={{padding:"8px 16px",borderRadius:8,border:`1.5px dashed ${bdr}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ 추가</button>}
            <button onClick={analyze} disabled={loading||!validLinks.length} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:validLinks.length?`linear-gradient(135deg,${acc},#8b5cf6)`:"#e5e7eb",color:validLinks.length?"#fff":muted,fontSize:13,fontWeight:800,cursor:validLinks.length?"pointer":"default"}}>
              {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}/>{progress}</span>:`분석 시작 (${validLinks.length}개)`}
            </button>
          </div>
          {error&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:"1px solid #fca5a520",fontSize:12,color:"#dc2626",fontWeight:600}}>{error}</div>}
        </Card>
      )}

      {/* 탭 네비게이션 */}
      {hasData && (
        <>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16,padding:"4px",background:isDark?"rgba(255,255,255,0.03)":"#f3f4f6",borderRadius:12}}>
            {channels.map((c,i) => {
              const isActive = activeTab === `ch${i}`;
              return <button key={i} onClick={()=>setActiveTab(`ch${i}`)} style={{padding:"8px 16px",borderRadius:10,border:"none",background:isActive?cardBg:"transparent",color:isActive?c.plat?.color||acc:muted,fontSize:12,fontWeight:isActive?800:500,cursor:"pointer",boxShadow:isActive?(isDark?"none":"0 1px 4px rgba(0,0,0,0.08)"):"none",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                <span style={{width:8,height:8,borderRadius:4,background:c.plat?.color||acc,opacity:isActive?1:0.3}}/>
                {c.plat?.label}
              </button>;
            })}
            {report && <button onClick={()=>setActiveTab("report")} style={{padding:"8px 16px",borderRadius:10,border:"none",background:activeTab==="report"?cardBg:"transparent",color:activeTab==="report"?acc:muted,fontSize:12,fontWeight:activeTab==="report"?800:500,cursor:"pointer",boxShadow:activeTab==="report"?(isDark?"none":"0 1px 4px rgba(0,0,0,0.08)"):"none"}}>AI 리포트</button>}
            <button onClick={()=>{setChannels([]);setReport(null);setActiveTab("overview");}} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>다시 분석</button>
          </div>

          {/* 탭 콘텐츠 */}
          {channels.map((c,i) => activeTab===`ch${i}` && (
            <div key={i}>{c.yt ? <YtTab d={c.yt}/> : <ProfileTab c={c}/>}</div>
          ))}
          {activeTab==="report" && report && <div>{renderReport(report)}</div>}
        </>
      )}
    </div>
  );
}
