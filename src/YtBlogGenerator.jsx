import { useState, useRef, useEffect } from "react";
import { changePoints, getAiUsage, setAiUsage, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import StepBar from "./StepBar.jsx";
import LoadingAnimation from "./LoadingAnimation.jsx";
import { callAIStream } from "./aiClient";

/* ── 유튜브 ID 추출 ── */
function extractYtId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/* ── 자막 파싱 (XML → 텍스트) ── */
function parseXmlTranscript(xml) {
  const items = [];
  const re = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const start = parseFloat(m[1]);
    const text = m[2]
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
      .replace(/<[^>]+>/g,"").trim();
    if (text) items.push({ start, text });
  }
  return items;
}

/* ── 초 → 타임스탬프 ── */
function toTime(sec) {
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

/* ── 자막 전체 텍스트 (1000자 단위 요약용) ── */
function transcriptToText(items) {
  return items.map(i=>i.text).join(" ");
}

/* ══════════════════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════════════════ */

// ── 포인트 소진 화면 ──────────────────────────────────────────────────────────
function PointsExhausted({ isDark, isGuest, title }) {
  const bg = isDark ? "linear-gradient(160deg,#0f0c29,#1a1740)" : "#f4f4f8";
  const card = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e9ecef";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"40px 24px", textAlign:"center", background:bg }}>
      <div style={{ maxWidth:420, width:"100%" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>💎</div>
        <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:8 }}>
          {isGuest ? "무료 이용권을 모두 사용했어요" : "포인트가 모두 소진됐어요"}
        </div>
        <div style={{ fontSize:14, color:muted, lineHeight:2, marginBottom:28 }}>
          {isGuest
            ? <><b style={{color:text}}>비회원 무료 10회</b>를 모두 사용하셨어요.<br/>회원가입 후 <b style={{color:"#a5b4fc"}}>20회 추가 무료</b>를 받으세요!</>
            : <><b style={{color:text}}>{title}</b> 생성에 포인트가 필요해요.<br/>포인트를 충전하거나 관리자에게 문의해주세요.</>
          }
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {isGuest ? (
            <button onClick={() => { if(typeof window.__onLoginRequest==="function") window.__onLoginRequest(); else window.location.hash="#home"; }}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:15, fontWeight:800 }}>
              🚀 회원가입 / 로그인하기
            </button>
          ) : (
            <button onClick={() => { window.location.hash = "#pricing"; }}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:800 }}>
              💎 포인트 충전하기
            </button>
          )}
          <button onClick={() => window.open("https://open.kakao.com/o/gIw9vTFg", "_blank")}
            style={{ width:"100%", padding:"12px", borderRadius:12,
              border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:14, cursor:"pointer" }}>
            💬 관리자에게 문의하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function YtBlogGenerator({ theme, embedded, user , onUserUpdate}) {
  const isDark = theme === "dark" || (!theme && !!embedded);

  /* 색상 */
  const text    = isDark ? "#fff"                    : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)"  : "#6c757d";
  const border  = isDark ? "rgba(255,255,255,0.10)"  : "#e9ecef";
  const panelBg = isDark ? "rgba(0,0,0,0.30)"        : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)"  : "#fff";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)"  : "#e9ecef";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)"  : "#f8f9fa";
  const resultBg= isDark ? "rgba(0,0,0,0.15)"        : "#f8f9fa";
  const accent  = isDark ? "#a5b4fc"                 : "#4f46e5";
  const accentRaw= "#7c6aff";
  const headerBg= isDark ? "rgba(0,0,0,0.20)"        : "#fff";

  /* 상태 */
  const [url,         setUrl]         = useState("");
  const [vtId,        setVtId]        = useState("");
  const [videoInfo,   setVideoInfo]   = useState(null);   // {title, author, thumb}
  const [transcript,  setTranscript]  = useState([]);     // [{start, text}]
  const [fetchStatus, setFetchStatus] = useState("");     // 로딩 메시지
  const [fetchErr,    setFetchErr]    = useState("");
  const [blogType,    setBlogType]    = useState("naver");
  const [tone,        setTone]        = useState("info");
  const [length,      setLength]      = useState("medium");
  const [extra,       setExtra]       = useState("");
  const [result,      setResult]      = useState("");
  const [generating,  setGenerating]  = useState(false);
  useGeneratingGuard(generating, 10, "video_create");
  const wizStep = generating ? 2 : result ? 3 : 1;
  const STEPS = [{n:1,label:"내용 입력"},{n:2,label:"AI 생성중"},{n:3,label:"결과 확인"}];
  const [genErr,      setGenErr]      = useState("");
  const [copied,      setCopied]      = useState(false);
  const transcriptRef = useRef(null);

  /* ── 유튜브 정보 + 자막 가져오기 ── */
  /* ═══════════════════════════════════════════════════
     자막 추출 - Vercel 서버리스 함수 호출
     /api/transcript?videoId=xxx → 서버에서 YouTube 직접 파싱
  ═══════════════════════════════════════════════════ */
  const fetchTranscript = async (ytId) => {
    try {
      setFetchStatus("자막 추출 중...");

      // Vercel API 엔드포인트 호출
      const apiUrl = `/api/transcript?videoId=${ytId}`;
      console.log("자막 API 호출:", apiUrl);

      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(30000),
      });

      console.log("API 응답 상태:", res.status, res.ok);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("API 오류:", res.status, errText);
        setFetchErr(`⚠️ API 오류 (${res.status}): /api/transcript 경로 확인 필요`);
        return null;
      }

      const data = await res.json();
      console.log("API 데이터:", data.method, "items:", data.items?.length, "msg:", data.message);

      if (data.items && data.items.length > 3) {
        return {
          items: data.items,
          lang: data.lang,
          method: data.method,
          description: data.description,
          source: "vercel",
        };
      }

      // 자막 없지만 설명란 있음
      if (data.description) {
        return {
          items: [],
          description: data.description,
          method: "description-only",
          source: "vercel",
        };
      }

      return null;
    } catch (e) {
      console.error("transcript API 예외:", e);
      // API 자체가 없는 경우 - api/transcript.js 미배포
      if (e.message.includes("Failed to fetch") || e.message.includes("404")) {
        setFetchErr("⚠️ /api/transcript 파일이 배포되지 않았어요. api/transcript.js를 확인해주세요.");
      }
      return null;
    }
  };

    const fetchVideo = async (inputUrl) => {
    const ytId = extractYtId(inputUrl);
    if (!ytId) { setFetchErr("올바른 유튜브 URL을 입력해주세요."); return; }

    setFetchErr(""); setFetchStatus("영상 정보 불러오는 중...");
    setVideoInfo(null); setTranscript([]); setResult(""); setVtId(ytId);

    try {
      /* 1. 영상 제목/채널 (oEmbed) */
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${ytId}&format=json`
      ).then(r => r.ok ? r.json() : null).catch(() => null);

      setVideoInfo({
        title:  oembed?.title       || "유튜브 영상",
        author: oembed?.author_name || "",
        thumb:  `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
      });

      /* 2. 자막 추출 */
      const result = await fetchTranscript(ytId);
      setFetchStatus("");

      if (result && result.items.length > 0) {
        setTranscript(result.items);
        const langInfo = (result.lang || "").startsWith("en") ? "영어" : "한국어";
        const methodLabel = result.method === "auto-caption" ? " · 자동생성 자막"
                          : result.method === "manual-caption" ? " · 수동 자막" : "";
        setFetchErr(`✅ ${langInfo} 자막 ${result.items.length}개 로드 성공${methodLabel}`);
        setTimeout(() => setFetchErr(""), 4000);
      } else if (result && result.description) {
        // 자막 없지만 영상 설명란 있음
        setTranscript([{ start: 0, text: result.description }]);
        setFetchErr("ℹ️ 자막 없음 - 영상 설명란으로 글 작성합니다");
        setTimeout(() => setFetchErr(""), 4000);
      } else {
        setTranscript([]);
        setFetchErr("⚠️ 자막과 설명란 모두 없어요. 영상 제목으로만 작성합니다.");
      }

    } catch (e) {
      setFetchStatus("");
      setFetchErr("영상 정보를 불러오는 중 오류가 발생했어요.");
    }
  };

    /* ── 블로그 글 생성 ── */
  const generate = async () => {
    if (!videoInfo) { setGenErr("먼저 유튜브 URL을 입력해주세요."); return; }
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiLimit = user ? 20 : 5;
    const _aiPoints = user ? (user.points || 0) : 0;
    // 비회원: 5회 초과 시 차단 / 회원: 20회 초과 + 포인트 확실히 0일 때만 차단
    // 로그인 회원 차단 없음, 비회원만 5회 초과 차단
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage();
    setGenErr(""); setGenerating(true); setResult(""); setCopied(false);
    // 포인트 즉시 차감
    if (user && user.uid) {
      changePoints(user.uid, -10, "유튜브 블로그 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }
    var _nfFull = "";

    const transcriptText = transcript.length > 0
      ? transcriptToText(transcript).slice(0, 6000)
      : "";

    const typeLabel = {naver:"네이버 블로그",tistory:"티스토리",summary:"영상 요약",sns:"SNS 콘텐츠",column:"칼럼",article:"기사 방식"}[blogType];
    const toneLabel = {info:"정보성·SEO 최적화",casual:"친근하고 읽기 쉬운",pro:"전문적이고 신뢰감 있는",engaging:"흥미롭고 공감가는"}[tone];
    const lenLabel  = {short:"800자 내외",medium:"2,000자 내외",long:"4,000자 내외"}[length];

    const transcriptSection = transcriptText
      ? `\n\n[유튜브 영상 자막 내용]\n${transcriptText}`
      : `\n\n[영상 정보만 제공됨 - 제목 기반으로 작성]`;

    const prompts = {
      naver: `유튜브 영상을 바탕으로 네이버 블로그 글을 작성해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
영상 URL: https://youtube.com/watch?v=${vtId}
스타일: ${toneLabel} / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

작성 형식:
- SEO 최적화된 블로그 제목
- 도입부 (영상 소개 + 핵심 미리보기)
- 본론 (소제목 포함, 단계별 상세 설명)
- 마무리 (요약 + 독자 행동 유도)
- 관련 해시태그 5~8개`,

      tistory: `유튜브 영상을 바탕으로 티스토리 블로그 글을 작성해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
스타일: ${toneLabel} / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

## h2 소제목 적극 활용, **강조 텍스트** 사용, 리스트 구조화
SEO 최적화, 출처: ${videoInfo.author} 유튜브 채널`,

      summary: `유튜브 영상의 핵심 내용을 요약 정리해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

- 핵심 포인트 3~7가지 (번호 목록)
- 각 포인트 2~3줄 상세 설명
- 전체 요약 1문단
- 인상적인 핵심 문장이나 인용구`,

      sns: `유튜브 영상 내용으로 SNS 게시물 3종을 작성해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
스타일: ${toneLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

① 인스타그램 캡션 (해시태그 포함)
② 스레드 연속 포스팅 3~4개
③ X(트위터) 스타일 핵심 인사이트 3개`,

      column: `유튜브 영상을 바탕으로 전문 칼럼을 작성해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
영상 URL: https://youtube.com/watch?v=${vtId}
스타일: 전문적이고 논리적인 / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호 일절 사용 금지
- 마크다운 기호(##, **, -, *) 사용 금지
- 순수 한국어 문장으로만 작성

[필수] 글 맨 처음에 제목과 부제목을 추천:
제목: (SEO 키워드 포함 전문 칼럼 제목)
부제목: (핵심 한 줄 요약)

작성 구조:
- 주장 제시 (영상의 핵심 논점)
- 근거 제시 (데이터, 사례, 통계 인용)
- 반론 검토 (다른 시각 언급)
- 결론 (독자에게 시사점)
- 출처: ${videoInfo.author} 유튜브 채널`,

      article: `유튜브 영상을 바탕으로 기사 방식의 글을 작성해주세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.author}
영상 URL: https://youtube.com/watch?v=${vtId}
스타일: 객관적 보도체 / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}${transcriptSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호 일절 사용 금지
- 마크다운 기호(##, **, -, *) 사용 금지
- 순수 한국어 문장으로만 작성

[필수] 글 맨 처음에 제목과 부제목을 추천:
제목: (뉴스 스타일 제목)
부제목: (핵심 한 줄)

작성 구조:
- 역피라미드 구조 (가장 중요한 정보 먼저)
- 5W1H 원칙, 객관적 사실 기반
- 인용문/수치 적극 활용
- 출처: ${videoInfo.author} 유튜브 채널`,
    };

    try {
      await callAIStream("claude-haiku-4-5", [{role:"user", content: prompts[blogType]}], 4000, (accumulated) => {
        _nfFull = accumulated;
        setResult(accumulated);
      });
    } catch(e) { setGenErr("생성 중 오류가 발생했습니다."); }
    finally {
      setGenerating(false);
      if (user) {
        var _u = getAiUsage();
        var _k = "member_" + (user.uid || "u");
        var _nu = Object.assign({}, _u);
        _nu[_k] = (_u[_k] || 0) + 1;
        setAiUsage(_nu);
      }
      // 포인트 차감은 생성 시작 시점에 처리됨
      // 보관함 자동저장
      if (typeof _nfFull !== "undefined" && _nfFull && _nfFull.length > 50) {
        try {
          var _sv = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
          _sv.unshift({ id: Date.now().toString(), type: "blog_yt_blog",
            title: typeof ytInfo !== "undefined" && ytInfo?.title ? ytInfo.title : "유튜브 블로그",
            content: _nfFull, date: new Date().toLocaleDateString("ko-KR") });
          localStorage.setItem("sns_blog_saves_v1", JSON.stringify(_sv.slice(0, 100)));
        } catch(e) {}
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  const IS = {
    width:"100%", padding:"13px 16px", borderRadius:10,
    border:`1.5px solid ${inputBdr}`, background:inputBg,
    color:text, fontSize:15, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box",
  };

  const BLOG_TYPES = [
    {id:"naver",   icon:"", label:"네이버 블로그",   desc:"SEO 최적화 정보성 글"},
    {id:"tistory", icon:"", label:"티스토리",        desc:"HTML 구조 블로그"},
    {id:"column",  icon:"", label:"칼럼",           desc:"전문 분석·인사이트 글", autoTitle:true},
    {id:"article", icon:"", label:"기사 방식",       desc:"뉴스 리뷰 스타일 글", autoTitle:true},
    {id:"summary", icon:"", label:"핵심 요약",       desc:"핵심 내용 정리"},
    {id:"sns",     icon:"", label:"SNS 3종",         desc:"인스타·스레드·X"},
  ];

  return (
    <div style={{
      display:"flex", flex:1, height:"100%", overflow:"hidden", flexDirection:"column",
      fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      <style>{`
        @keyframes yt-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes yt-blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes yt-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .yt-input:focus{border-color:${accentRaw}!important;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
        .yt-type-card:hover{border-color:${accentRaw}!important;transform:translateY(-2px)}
      `}</style>

      {/* 스텝 바 */}
      <StepBar steps={STEPS} current={wizStep} isDark={isDark} />

      {/* 본문 */}
      <div style={{flex:1,overflowY:"auto"}}>
      {wizStep===1 && (
        <div style={{maxWidth:720,margin:"0 auto",padding:"40px 20px 24px"}}>

          {/* URL 입력 */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>
              유튜브 URL <span style={{color:"#ef4444"}}>*</span>
            </div>
            <div style={{display:"flex", gap:8}}>
              <div style={{position:"relative", flex:1}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>▶</span>
                <input
                  className="yt-input"
                  value={url}
                  onChange={e=>{ setUrl(e.target.value); setFetchErr(""); }}
                  onKeyDown={e=>e.key==="Enter"&&url.trim()&&fetchVideo(url)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{...IS, paddingLeft:42, transition:"border-color 0.2s,box-shadow 0.2s"}}
                />
              </div>
              <button
                onClick={()=>url.trim()&&fetchVideo(url)}
                disabled={!url.trim() || !!fetchStatus}
                style={{
                  padding:"0 20px", borderRadius:10, border:"none", flexShrink:0,
                  background:url.trim()?"#FF0000":"rgba(255,0,0,0.2)",
                  color:"#fff", fontSize:14, fontWeight:700, cursor:url.trim()?"pointer":"not-allowed",
                  whiteSpace:"nowrap",
                }}>
                {fetchStatus ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"yt-spin 0.8s linear infinite"}}/> : "불러오기"}
              </button>
            </div>
            {fetchErr && (
              <div style={{marginTop:8,fontSize:12,lineHeight:1.6,
                color: fetchErr.startsWith("✅") ? "#10b981"
                     : fetchErr.startsWith("⚠️") ? "rgba(251,191,36,0.9)"
                     : "rgba(255,100,100,0.9)"
              }}>
                {fetchErr}
              </div>
            )}
          </div>

          {/* 영상 미리보기 */}
          {videoInfo && (
            <div style={{marginBottom:20, animation:"yt-fadein 0.4s ease"}}>
              <div style={{borderRadius:14, overflow:"hidden", border:`1px solid ${border}`, background:cardBg}}>
                {/* 썸네일 */}
                <div style={{position:"relative", paddingBottom:"56.25%", background:"#000"}}>
                  <iframe
                    src={`https://www.youtube.com/embed/${vtId}`}
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
                    allowFullScreen title="유튜브 미리보기"/>
                </div>
                {/* 영상 정보 */}
                <div style={{padding:"12px 16px"}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,lineHeight:1.5,marginBottom:4}}>{videoInfo.title}</div>
                  {videoInfo.author && <div style={{fontSize:12,color:muted}}>{videoInfo.author}</div>}
                  {transcript.length > 0 && (
                    <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(16,185,129,0.1)",borderRadius:20,padding:"3px 10px"}}>
                      <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>✓ 자막 {transcript.length}개 로드됨</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 자막 표시 */}
          {transcript.length > 0 && (
            <div style={{marginBottom:20, animation:"yt-fadein 0.4s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>
                📜 스크립트 <span style={{fontSize:11,fontWeight:400}}>({transcript.length}개 세그먼트)</span>
              </div>
              <div ref={transcriptRef} style={{
                background:cardBg, border:`1px solid ${border}`, borderRadius:12,
                padding:"14px 16px", maxHeight:200, overflowY:"auto",
                fontSize:13, lineHeight:1.8, color:text,
              }}>
                {transcript.map((item,i)=>(
                  <div key={i} style={{marginBottom:6, display:"flex", gap:10}}>
                    <span style={{
                      fontSize:11, color:accentRaw, fontWeight:700, flexShrink:0,
                      marginTop:2, minWidth:36, fontFamily:"monospace",
                    }}>{toTime(item.start)}</span>
                    <span style={{color:text, opacity:0.85}}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 글 타입 선택 */}
          {videoInfo && (
            <div style={{marginBottom:18, animation:"yt-fadein 0.5s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:10}}>글 타입 선택</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {BLOG_TYPES.map(bt=>{
                  const isA = blogType===bt.id;
                  return (
                    <button key={bt.id} className="yt-type-card"
                      onClick={()=>setBlogType(bt.id)}
                      style={{
                        padding:"14px 12px", borderRadius:12, border:`2px solid ${isA?accentRaw:border}`,
                        background:isA?"rgba(99,102,241,0.12)":inputBg,
                        cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                      }}>
                      <div style={{fontSize:22,marginBottom:6}}>{bt.icon}</div>
                      <div style={{fontSize:13,fontWeight:700,color:isA?accent:text}}>{bt.label}</div>
                      <div style={{fontSize:11,color:muted,marginTop:2}}>{bt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 글 톤 */}
          {videoInfo && (
            <div style={{marginBottom:14, animation:"yt-fadein 0.6s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>글 톤</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{id:"info",label:"정보성"},{id:"casual",label:"친근한"},{id:"pro",label:"전문적"},{id:"engaging",label:"흥미로운"}].map(t=>{
                  const isA=tone===t.id;
                  return <button key={t.id} onClick={()=>setTone(t.id)}
                    style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${isA?accentRaw:border}`,background:isA?"rgba(99,102,241,0.12)":"transparent",color:isA?accent:muted,fontSize:13,fontWeight:isA?700:400,cursor:"pointer",transition:"all 0.15s"}}>
                    {t.label}
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* 분량 */}
          {videoInfo && (
            <div style={{marginBottom:14, animation:"yt-fadein 0.65s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>분량</div>
              <div style={{display:"flex",gap:6}}>
                {[{id:"short",label:"짧게",desc:"~800자"},{id:"medium",label:"보통",desc:"~2,000자"},{id:"long",label:"길게",desc:"~4,000자"}].map(l=>{
                  const isA=length===l.id;
                  return <button key={l.id} onClick={()=>setLength(l.id)}
                    style={{flex:1,padding:"10px 8px",borderRadius:10,border:`1.5px solid ${isA?accentRaw:border}`,background:isA?"rgba(99,102,241,0.12)":"transparent",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                    <div style={{fontSize:14,fontWeight:isA?700:500,color:isA?accent:text}}>{l.label}</div>
                    <div style={{fontSize:10,color:muted,marginTop:2}}>{l.desc}</div>
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* 추가 요청 */}
          {videoInfo && (
            <div style={{marginBottom:8, animation:"yt-fadein 0.7s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>추가 요청 (선택)</div>
              <textarea value={extra} onChange={e=>setExtra(e.target.value)} rows={3}
                placeholder="예: 전문 용어 쉽게 설명, 결론 먼저, 표 형식 포함..."
                style={{...IS,resize:"none",lineHeight:1.7,fontSize:14}}/>
            </div>
          )}

          {/* 생성 버튼 */}
          {videoInfo && (
            <button onClick={generate} disabled={generating}
              style={{
                width:"100%", padding:"15px", borderRadius:12, border:"none", marginTop:16,
                cursor:generating?"not-allowed":"pointer",
                background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",
                color:"#fff", fontSize:15, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>
              {generating
                ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"yt-spin 0.8s linear infinite"}}/>생성 중...</>
                : user ? <span>✨ 글 생성하기 <span style={{fontSize:12,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 8px",borderRadius:8}}>10P</span></span> : <span>✦ 1회 생성해보기</span>
              }
            </button>
          )}
          {genErr && <div style={{marginTop:8,fontSize:12,color:"rgba(255,100,100,0.9)",textAlign:"center"}}>{genErr}</div>}
        </div>
      )}

      {/* 결과 영역 */}
      {wizStep>=2 && (
        <div style={{maxWidth:900,margin:"0 auto",width:"100%"}}>
        {(() => {
          const _u3 = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
          const _k3 = user ? ("member_" + (user.uid || "u")) : "guest";
          const _ex3 = (_u3[_k3]||0) >= (user?20:5) && (user?(user.points||0):0) < 10;
          if (_ex3 && !generating && !result) return <PointsExhausted isDark={isDark} isGuest={!user} title="유튜브 블로그" />;
          return null;
        })()}
        {/* 결과 헤더 */}
        {result && (
          <div style={{height:56,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",borderBottom:`1px solid ${border}`,background:headerBg}}>
            <span style={{fontSize:15,fontWeight:800,color:text}}>📄 작성 결과</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleCopy}
                style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${border}`,background:copied?"rgba(74,222,128,0.12)":"transparent",color:copied?"#4ade80":accent,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {copied?"✓ 복사됨":"📋 복사"}
              </button>
              <button onClick={()=>{
                const b=new Blob([result],{type:"text/plain;charset=utf-8"});
                const u=URL.createObjectURL(b);
                const a=document.createElement("a");
                a.href=u;a.download="유튜브블로그.txt";a.click();URL.revokeObjectURL(u);
              }} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>📄 저장</button>
            </div>
          </div>
        )}

        {/* 결과 본문 */}
        <div style={{flex:1,overflowY:"auto",padding:result?"28px 32px":"0"}}>
          {!result && !generating && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16,padding:"48px 32px",textAlign:"center"}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:text,marginBottom:8,opacity:0.6}}>유튜브 URL을 입력해주세요</div>
                <div style={{fontSize:14,color:muted,lineHeight:1.9,maxWidth:320}}>
                  왼쪽에 유튜브 링크를 입력하면<br/>
                  <span style={{color:"#FF0000",fontWeight:700}}>자막을 자동으로 분석</span>해서<br/>
                  블로그 글을 작성해드려요
                </div>
              </div>
            </div>
          )}

          {generating && !result && (
            <LoadingAnimation featureType="video_create" title="AI가 블로그 글을 작성하고 있어요" subtitle={videoInfo?.title||""} isDark={isDark} />
          )}

          {result && (
            <div style={{background:isDark?"rgba(255,255,255,0.04)":"#fff",border:`1px solid ${border}`,borderRadius:14,padding:"28px 32px",whiteSpace:"pre-wrap",lineHeight:2.1,fontSize:16,color:text,fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",animation:"yt-fadein 0.4s ease"}}>
              {result}
              {generating && <span style={{display:"inline-block",width:2,height:16,background:"#FF0000",marginLeft:2,animation:"yt-blink 1s infinite"}}/>}
            </div>
          )}
        </div>
        </div>
      )}
      </div>
    </div>
  );
}
