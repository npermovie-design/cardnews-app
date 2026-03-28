import { useState, useEffect } from "react";
import { changePoints, getAiUsage, setAiUsage, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import StepBar from "./StepBar.jsx";
import LoadingAnimation from "./LoadingAnimation.jsx";
import { callAIStream } from "./aiClient";


/* ── 마크다운 → JSX 렌더러 (이미지 태그 자동 삽입 지원) ── */
function renderMarkdown(text, isDark, textColor, mutedColor, accentColor, inlineImages) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // [이미지: 설명] 태그를 실제 이미지로 렌더링
    const imgMatch = line.match(/^\[(?:이미지|image):\s*([^\]]+)\]$/);
    if (imgMatch) {
      const desc = imgMatch[1].trim();
      const imgUrl = inlineImages && inlineImages[desc];
      const fallbackSeed = encodeURIComponent(desc.slice(0, 20));
      const fallbackUrl = `https://picsum.photos/seed/${fallbackSeed}/800/450`;
      elements.push(
        <div key={i} style={{margin:"20px 0",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
          <img src={imgUrl || fallbackUrl} alt={desc} loading="lazy"
            onError={e => { e.target.onerror = null; e.target.src = fallbackUrl; }}
            style={{width:"100%",display:"block",height:320,objectFit:"cover"}} />
          <div style={{padding:"10px 16px",fontSize:11,color:mutedColor,background:isDark?"rgba(0,0,0,0.4)":"#f8f8fb",display:"flex",alignItems:"center",gap:6}}>
            <span style={{opacity:0.5}}>&#128247;</span> {desc}
          </div>
        </div>
      );
    }
    // ## 제목
    else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{fontSize:16,fontWeight:800,color:textColor,margin:"20px 0 8px",letterSpacing:-0.3}}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{fontSize:19,fontWeight:900,color:textColor,margin:"28px 0 10px",letterSpacing:-0.5,borderBottom:`2px solid ${accentColor}`,paddingBottom:6}}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{fontSize:22,fontWeight:900,color:textColor,margin:"32px 0 12px",letterSpacing:-0.8}}>{line.slice(2)}</h1>);
    }
    // --- 구분선
    else if (line.match(/^[-*]{3,}$/)) {
      elements.push(<hr key={i} style={{border:"none",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e9ecef"}`,margin:"20px 0"}}/>);
    }
    // - 또는 * 리스트
    else if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} style={{marginBottom:5,lineHeight:1.8,color:textColor}}>{inlineFormat(lines[i].slice(2), accentColor)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{paddingLeft:20,margin:"8px 0 12px",listStyle:"disc"}}>{items}</ul>);
      continue;
    }
    // 번호 리스트
    else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const content = lines[i].replace(/^\d+\. /, "");
        items.push(<li key={i} style={{marginBottom:5,lineHeight:1.8,color:textColor}}>{inlineFormat(content, accentColor)}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} style={{paddingLeft:22,margin:"8px 0 12px"}}>{items}</ol>);
      continue;
    }
    // > 인용문
    else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} style={{borderLeft:`4px solid ${accentColor}`,paddingLeft:14,margin:"12px 0",color:mutedColor,fontStyle:"italic",lineHeight:1.8}}>
          {inlineFormat(line.slice(2), accentColor)}
        </blockquote>
      );
    }
    // 빈 줄
    else if (line.trim() === "") {
      elements.push(<div key={i} style={{height:8}}/>);
    }
    // 해시태그 줄
    else if (line.trim().startsWith("#") && line.includes(" #")) {
      elements.push(
        <p key={i} style={{margin:"4px 0",lineHeight:1.9,fontSize:14,color:accentColor}}>
          {line}
        </p>
      );
    }
    // 일반 문단
    else if (line.trim()) {
      elements.push(
        <p key={i} style={{margin:"4px 0",lineHeight:1.95,color:textColor}}>
          {inlineFormat(line, accentColor)}
        </p>
      );
    }

    i++;
  }
  return elements;
}

/* 인라인 포맷: **bold**, *italic*, `code` */
function inlineFormat(text, accentColor) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0];
    if (raw.startsWith("**")) {
      parts.push(<strong key={m.index} style={{fontWeight:800}}>{raw.slice(2,-2)}</strong>);
    } else if (raw.startsWith("*")) {
      parts.push(<em key={m.index} style={{fontStyle:"italic"}}>{raw.slice(1,-1)}</em>);
    } else if (raw.startsWith("`")) {
      parts.push(<code key={m.index} style={{background:"rgba(99,102,241,0.12)",color:accentColor,padding:"1px 6px",borderRadius:4,fontSize:"0.9em",fontFamily:"monospace"}}>{raw.slice(1,-1)}</code>);
    }
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

/* ── 블로그 결과 클린업 (이모지·마크다운 제거) ── */
function cleanBlogText(text) {
  if (!text) return text;
  return text
    // 이모지/이모티콘 제거 (유니코드 이모지 범위)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}]/gu, '')
    // 마크다운 헤더 ## ### # → 텍스트만 남김
    .replace(/^#{1,6}\s+/gm, '')
    // 마크다운 굵기/기울임 **text** *text* __text__
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    // 마크다운 취소선 ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // 인용문 > 제거
    .replace(/^>\s+/gm, '')
    // 특수 기호 제거 (★, ●, ■, ▶, ♥, →, ☑, ✓, ✅ 등)
    .replace(/[★☆●○■□▶▷◀◁♥♡→←↑↓⇒⇔☑☐✓✗✘※◎]/g, '')
    // 코드블록 ` ` 제거
    .replace(/`([^`]+)`/g, '$1')
    // 수평선 --- *** 제거
    .replace(/^[-*]{3,}$/gm, '')
    // 연속 공백·줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}



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
            ? <><b style={{color:text}}>비회원 무료 5회</b>를 모두 사용하셨어요.<br/>회원가입 후 <b style={{color:"#a5b4fc"}}>10회 추가 무료</b>를 받으세요!</>
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

export default function NewsBlogGenerator({ theme, embedded, user, onLoginRequest, onUserUpdate, initialType, linkMode }) {
  const isDark = theme === "dark" || (!theme && !!embedded);
  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#6c757d";
  const border  = isDark ? "rgba(255,255,255,0.10)" : "#e9ecef";
  const panelBg = isDark ? "rgba(0,0,0,0.30)"       : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)" : "#e9ecef";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#f8f9fa";
  const resultBg= isDark ? "rgba(0,0,0,0.15)"       : "#f8f9fa";
  const accent  = isDark ? "#a5b4fc"                : "#4f46e5";
  const accentRaw="#7c6aff";
  const headerBg= isDark ? "rgba(0,0,0,0.20)"       : "#fff";

  const [url,        setUrl]        = useState("");
  const [newsInfo,   setNewsInfo]   = useState(null);  // {title, content, image, siteName}
  const [fetchStatus,setFetchStatus]= useState("");
  const [fetchErr,   setFetchErr]   = useState("");
  const [blogType,   setBlogType]   = useState(initialType || "naver");
  const [tone,       setTone]       = useState("info");
  const [length,     setLength]     = useState("medium");
  const [extra,      setExtra]      = useState("");
  const [result,     setResult]     = useState("");
  const [inlineImages, setInlineImages] = useState({});
  const [generating, setGenerating] = useState(false);
  useGeneratingGuard(generating, 10, "blog_write"); // 생성 중 이탈 방지
  const [genErr,     setGenErr]     = useState("");
  const [copied,     setCopied]     = useState(false);
  const [loadStep,   setLoadStep]  = useState(0);
  const wizStep = generating ? 2 : result ? 3 : 1;
  const STEPS = [{n:1,label:"내용 입력"},{n:2,label:"AI 생성중"},{n:3,label:"결과 확인"}];

  const IS = {
    width:"100%", padding:"13px 16px", borderRadius:10,
    border:`1.5px solid ${inputBdr}`, background:inputBg,
    color:text, fontSize:15, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box",
  };

  /* ── 기사 가져오기 ── */
  const fetchNews = async () => {
    if (!url.trim()) return;
    setFetchErr(""); setFetchStatus("기사 내용 불러오는 중...");
    setNewsInfo(null); setResult("");
    try {
      const res = await fetch(`/api/news?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`오류: ${res.status}`);
      const data = await res.json();
      if (data.error || data.method === "none") {
        setFetchErr("⚠️ " + (data.error || "기사를 불러오지 못했어요."));
        setFetchStatus("");
        return;
      }
      setNewsInfo(data);
      setFetchStatus("");
      if (data.contentLength < 200) {
        setFetchErr("ℹ️ 일부 내용만 가져왔어요. 그래도 글 작성은 가능해요.");
      }
    } catch (e) {
      setFetchStatus("");
      setFetchErr("⚠️ 기사 불러오기 실패: " + e.message);
    }
  };

  /* ── [image: ...] / [이미지: ...] 태그 자동 이미지 검색 ── */
  const fetchInlineImages = async (blogText) => {
    if (!blogText) return;
    const imgTags = blogText.match(/\[(?:이미지|image):\s*([^\]]+)\]/g);
    if (!imgTags || imgTags.length === 0) return;
    const keywords = imgTags.map(tag => tag.replace(/\[(?:이미지|image):\s*/, "").replace(/\]$/, "").trim());
    const uniqueKeywords = [...new Set(keywords)];
    const searchOne = async (kw, idx) => {
      const q = encodeURIComponent(kw.trim());
      try { const r = await fetch(`/api/proxy-unsplash?query=${q}&per_page=5&orientation=landscape`); if (r.ok) { const d = await r.json(); if (d.results?.length) return d.results[idx % d.results.length].urls.regular; } } catch {}
      try { const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${q}&per_page=5&orientation=landscape`); if (r.ok) { const d = await r.json(); if (d.photos?.length) return d.photos[idx % d.photos.length].src.large; } } catch {}
      try { const r = await fetch(`/api/proxy-pixabay?q=${q}&per_page=5&safesearch=true&image_type=photo`); if (r.ok) { const d = await r.json(); if (d.hits?.length) return d.hits[idx % d.hits.length].webformatURL; } } catch {}
      return `https://picsum.photos/seed/${encodeURIComponent(kw.slice(0, 20))}/800/450`;
    };
    const results = await Promise.all(uniqueKeywords.map((kw, i) => searchOne(kw, i)));
    const imgMap = {};
    uniqueKeywords.forEach((kw, i) => { imgMap[kw] = results[i]; });
    setInlineImages(imgMap);
  };

  /* ── 블로그 글 생성 ── */
  const generate = async () => {
    if (!newsInfo) { setGenErr("먼저 기사 URL을 입력해주세요."); return; }
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiLimit = user ? 20 : 5;
    const _aiPoints = user ? (user.points || 0) : 0;
    // 비회원: 5회 초과 시 차단 / 회원: 20회 초과 + 포인트 확실히 0일 때만 차단
    // 로그인 회원 차단 없음, 비회원만 5회 초과 차단
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage();
    setGenErr(""); setGenerating(true); setResult(""); setCopied(false); setLoadStep(1);
    // 포인트 즉시 차감
    if (user && user.uid) {
      changePoints(user.uid, -10, "뉴스 블로그 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }
    var _nfFull = "";

    const toneLabel = {info:"정보성·SEO 최적화",casual:"친근하고 읽기 쉬운",pro:"전문적이고 신뢰감 있는",engaging:"흥미롭고 공감가는"}[tone];
    const lenLabel  = {short:"800자 내외",medium:"2,000자 내외",long:"4,000자 내외"}[length];
    const typeLabel = {naver:"네이버 블로그",tistory:"티스토리",summary:"핵심 요약",sns:"SNS 콘텐츠",cafe:"네이버 카페",column:"칼럼",article:"기사 방식"}[blogType];

    const articleSection = `
[뉴스 기사 정보]
제목: ${newsInfo.title}
출처: ${newsInfo.siteName}
URL: ${url}

[기사 본문]
${newsInfo.content.slice(0, 6000)}`;

    const prompts = {
      naver: `다음 뉴스 기사를 바탕으로 네이버 블로그 글을 작성해주세요.
스타일: ${toneLabel} / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호(#, ★, ●, ■, ▶, ♥ 등) 일절 사용 금지
- 마크다운 기호(##, ###, **, __, ~~, >, - , *) 사용 금지
- 제목·소제목은 꺾쇠 없이 줄글로 자연스럽게 표현
- 순수 한국어 문장으로만 작성

[글 구조 필수 규칙]
1. 큰 소제목 → [image: 해당 단락 내용의 구체적 영문 키워드] → 본문 설명 순서로 반복
2. [image: keyword] 형태로 각 소제목마다 1개씩 이미지 삽입 (해당 단락 실제 내용과 직결되는 영문 2~4단어)
3. 추상적 키워드 금지 (technology, business 같은 단어 금지). 기사의 구체적 소재 반영
4. 소제목은 3~5개 정도

작성 형식:
- SEO 최적화된 블로그 제목 (한 줄)
- 빈 줄 구분으로 도입부 (기사 핵심 내용 소개)
- 본론 (소제목은 일반 텍스트로, 상세 설명)
- 마무리 (요약 + 독자 시사점)
- 관련 해시태그 5~8개 (맨 아래 별도 줄에 #태그 형식으로만)
- 출처: ${newsInfo.siteName}`,

      tistory: `다음 뉴스 기사를 바탕으로 티스토리 블로그 글을 작성해주세요.
스타일: ${toneLabel} / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호(★, ●, ■, ▶, ♥ 등) 일절 사용 금지
- 마크다운 기호(##, ###, **, __, ~~, >, *) 사용 금지
- 소제목은 줄바꿈 후 일반 텍스트로 자연스럽게 표현
- 순수 한국어 문장으로만 작성

[글 구조 필수 규칙]
1. 큰 소제목 → [image: 해당 단락 내용의 구체적 영문 키워드] → 본문 설명 순서로 반복
2. [image: keyword] 형태로 각 소제목마다 1개씩 (해당 단락 실제 내용과 직결되는 영문 2~4단어, 추상적 단어 금지)

SEO 최적화된 제목, 소제목으로 구조화, 출처 명시`,

      summary: `다음 뉴스 기사의 핵심 내용을 요약 정리해주세요.
분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호 일절 사용 금지
- 마크다운 기호(##, **, -, *) 사용 금지
- 번호(1. 2. 3.)는 허용, 나머지는 순수 문장으로 작성

- 핵심 포인트 3~5가지 (번호 목록)
- 각 포인트 상세 설명
- 전체 요약 1문단
- 이 기사가 중요한 이유`,

      sns: `다음 뉴스 기사로 SNS 게시물 3종을 작성해주세요.
스타일: ${toneLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호(★, ●, ■ 등) 일절 사용 금지
- 인스타그램 캡션도 이모지 없이 텍스트만으로 작성
- 해시태그는 맨 아래에만 (#태그 형식으로만)

① 인스타그램 캡션 (해시태그 포함, 이모지 없이)
② 스레드 연속 포스팅 3~4개
③ X(트위터) 스타일 핵심 인사이트 3개`,

      cafe: `다음 뉴스 기사를 바탕으로 네이버 카페 게시글을 작성해주세요.
스타일: ${toneLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[네이버 카페 글쓰기 규칙]
- 이모티콘, 이모지, 특수 기호(★, ●, ■, ▶, ♥ 등) 일절 사용 금지
- 마크다운 기호(##, ###, **, __, ~~, >, -, *) 사용 금지
- 카페 회원들이 쉽게 읽을 수 있는 짧고 핵심적인 글 (800자 내외)
- 지나치게 길지 않게, 핵심만 전달
- 순수 한국어 문장으로만 작성

작성 형식:
- 제목 (카페 게시글용, 한 줄, 20자 내외)
- 빈 줄
- 도입 한두 문장 (이 기사의 핵심 내용)
- 본론 (3~5개 포인트, 번호 목록 허용)
- 마무리 한 문장 (의견 또는 시사점)
- 출처: ${newsInfo?.siteName || ""} ${url}`,

      column: `다음 뉴스 기사를 바탕으로 전문 칼럼을 작성해주세요.
스타일: 전문적이고 논리적인 / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

[필수 작성 규칙]
- 이모티콘, 이모지, 특수 기호 일절 사용 금지
- 마크다운 기호(##, **, -, *) 사용 금지
- 순수 한국어 문장으로만 작성

[필수] 글 맨 처음에 제목과 부제목을 추천:
제목: (SEO 키워드 포함 전문 칼럼 제목)
부제목: (핵심 한 줄 요약)

작성 구조:
- 주장 제시 (핵심 논점 명확히)
- 근거 제시 (데이터, 사례, 통계 인용)
- 반론 검토 (다른 시각 언급)
- 결론 (독자에게 시사점)
- 출처: ${newsInfo?.siteName || ""} ${url}`,

      article: `다음 뉴스 기사를 바탕으로 기사 방식의 글을 작성해주세요.
스타일: 객관적 보도체 / 분량: ${lenLabel}
${extra ? `추가 요청: ${extra}` : ""}
${articleSection}

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
- 출처: ${newsInfo?.siteName || ""} ${url}`,
    };

    await new Promise(r=>setTimeout(r,600)); setLoadStep(2);
    await new Promise(r=>setTimeout(r,700)); setLoadStep(3);
    try {
      await callAIStream("claude-haiku-4-5", [{role:"user", content: prompts[blogType]}], 4000, (accumulated) => {
        _nfFull = accumulated;
        if (accumulated.length > 30) setLoadStep(4);
      });
    } catch { setGenErr("생성 중 오류가 발생했습니다."); }
    finally {
      if (_nfFull) {
        setResult(cleanBlogText(_nfFull));
        fetchInlineImages(_nfFull);
      }
      setGenerating(false); setLoadStep(0);
      if (user) {
        var _u = getAiUsage();
        var _k = "member_" + (user.uid || "u");
        var _nu = Object.assign({}, _u);
        _nu[_k] = (_u[_k] || 0) + 1;
        setAiUsage(_nu);
      }
      // 포인트 차감은 생성 시작 시점에 처리됨
      // 보관함 자동저장
      if (_nfFull && _nfFull.length > 50) {
        try {
          var _sv = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
          _sv.unshift({ id: Date.now().toString(), type: "blog_news", title: newsInfo?.title || "뉴스 블로그",
            content: _nfFull, date: new Date().toLocaleDateString("ko-KR") });
          localStorage.setItem("sns_blog_saves_v1", JSON.stringify(_sv.slice(0, 100)));
        } catch(e) {}
      }
    }
  };

  const BLOG_TYPES = [
    {id:"naver",   icon:"", label:"네이버 블로그",  desc:"SEO 최적화 정보성 글"},
    {id:"cafe",    icon:"", label:"네이버 카페",    desc:"짧고 핵심적인 카페 글"},
    {id:"tistory", icon:"", label:"티스토리",       desc:"HTML 구조 블로그"},
    {id:"column",  icon:"", label:"칼럼",          desc:"전문 의견·분석 글", autoTitle:true},
    {id:"article", icon:"", label:"기사 방식",      desc:"뉴스 기사 스타일 글", autoTitle:true},
    {id:"summary", icon:"", label:"핵심 요약",      desc:"핵심 내용 정리"},
    {id:"sns",     icon:"", label:"SNS 3종",        desc:"인스타·스레드·X"},
  ];

  return (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column",fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      <style>{`
        @keyframes ns-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ns-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes ns-progress{from{width:0%}to{width:92%}}
        @keyframes ns-blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes ns-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ns-input:focus{border-color:${accentRaw}!important;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
        .ns-type:hover{border-color:${accentRaw}!important;transform:translateY(-2px)}
      `}</style>

      <StepBar steps={STEPS} current={wizStep} isDark={isDark} />

      <div style={{flex:1,overflowY:"auto"}}>
      {wizStep===1 && (
        <div style={{maxWidth:720,margin:"0 auto",padding:"40px 20px 24px"}}>
        {/* 헤더 - linkMode에 따라 동적 */}
        {!linkMode && (
          <div style={{marginBottom:18, textAlign:"center"}}>
            <div style={{fontSize:19,fontWeight:900,color:text,letterSpacing:-0.5}}>
              {linkMode === "blog" ? "블로그 글로 변환" : linkMode === "sns" ? "SNS 글로 변환" : "뉴스로 블로그 글쓰기"}
            </div>
            <div style={{fontSize:13,color:muted,marginTop:4}}>
              {linkMode === "blog" ? "블로그 URL을 입력하면 AI가 새 글로 변환해요" : linkMode === "sns" ? "SNS 게시물 URL을 입력하면 블로그 글로 변환해요" : "뉴스 기사 URL만 넣으면 AI가 블로그 글을 자동 작성해요"}
            </div>
          </div>
        )}

        {/* 스크롤 영역 */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>

          {/* URL 입력 */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>
              {linkMode === "blog" ? "블로그 URL" : linkMode === "sns" ? "SNS URL" : "뉴스 기사 URL"} <span style={{color:"#ef4444"}}>*</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{position:"relative",flex:1}}>
                <input className="ns-input" value={url}
                  onChange={e=>{setUrl(e.target.value);setFetchErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&url.trim()&&fetchNews()}
                  placeholder={linkMode === "blog" ? "https://blog.naver.com/..." : linkMode === "sns" ? "https://www.instagram.com/p/..." : "https://n.news.naver.com/article/..."}
                  style={{...IS,transition:"border-color 0.2s,box-shadow 0.2s"}}/>
              </div>
              <button onClick={fetchNews} disabled={!url.trim()||!!fetchStatus}
                style={{padding:"0 20px",borderRadius:10,border:"none",flexShrink:0,
                  background:url.trim()?"linear-gradient(135deg,#ef4444,#dc2626)":"rgba(239,68,68,0.2)",
                  color:"#fff",fontSize:14,fontWeight:700,cursor:url.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
                {fetchStatus
                  ? <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"ns-spin 0.8s linear infinite"}}/>
                  : "불러오기"}
              </button>
            </div>
            {fetchErr && (
              <div style={{marginTop:8,fontSize:12,lineHeight:1.6,
                color: fetchErr.startsWith("✅")||fetchErr.startsWith("ℹ️") ? (fetchErr.startsWith("✅") ? "#10b981" : "rgba(251,191,36,0.9)") : "rgba(255,100,100,0.9)"}}>
                {fetchErr}
              </div>
            )}
          </div>

          {/* 기사 미리보기 */}
          {newsInfo && (
            <div style={{marginBottom:20,animation:"ns-fadein 0.4s ease"}}>
              <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${border}`,background:cardBg}}>
                {newsInfo.image && (
                  <div style={{position:"relative",paddingBottom:"52%",background:"#111"}}>
                    <img src={newsInfo.image} alt="" onError={e=>e.target.parentElement.style.display="none"}
                      style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                )}
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:11,color:"#ef4444",fontWeight:700,marginBottom:6}}>{newsInfo.siteName}</div>
                  <div style={{fontSize:14,fontWeight:700,color:text,lineHeight:1.5,marginBottom:6}}>{newsInfo.title}</div>
                  {newsInfo.content && (
                    <div style={{fontSize:12,color:muted,lineHeight:1.7,maxHeight:80,overflow:"hidden"}}>
                      {newsInfo.content.slice(0,200)}...
                    </div>
                  )}
                  <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(16,185,129,0.1)",borderRadius:20,padding:"3px 10px"}}>
                    <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>✓ {newsInfo.contentLength > 500 ? "기사 전체 내용 로드됨" : "일부 내용 로드됨"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 지원 소스 안내 */}
          {!newsInfo && (
            <div style={{marginBottom:20,padding:"14px 16px",background:cardBg,borderRadius:12,border:`1px solid ${border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,marginBottom:8}}>지원 소스</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {(linkMode === "blog"
                  ? ["네이버 블로그","티스토리","브런치","벨로그","미디엄","워드프레스"]
                  : linkMode === "sns"
                  ? ["인스타그램","X(트위터)","스레드","페이스북","링크드인"]
                  : ["네이버뉴스","다음뉴스","조선일보","중앙일보","동아일보","한겨레","연합뉴스","KBS","MBC","SBS","매일경제","한국경제"]
                ).map(n=>(
                  <span key={n} style={{fontSize:11,padding:"3px 9px",borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.06)",color:muted}}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 글 타입 */}
          {newsInfo && (
            <div style={{marginBottom:18,animation:"ns-fadein 0.5s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:10}}>글 타입 선택</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {BLOG_TYPES.map(bt=>{
                  const isA=blogType===bt.id;
                  return (
                    <button key={bt.id} className="ns-type" onClick={()=>setBlogType(bt.id)}
                      style={{padding:"14px 12px",borderRadius:12,border:`2px solid ${isA?accentRaw:border}`,
                        background:isA?"rgba(99,102,241,0.12)":inputBg,cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
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
          {newsInfo && (
            <div style={{marginBottom:14,animation:"ns-fadein 0.6s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>글 톤</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{id:"info",label:"정보성"},{id:"casual",label:"친근한"},{id:"pro",label:"전문적"},{id:"engaging",label:"흥미로운"}].map(t=>{
                  const isA=tone===t.id;
                  return <button key={t.id} onClick={()=>setTone(t.id)}
                    style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${isA?accentRaw:border}`,
                      background:isA?"rgba(99,102,241,0.12)":"transparent",color:isA?accent:muted,
                      fontSize:13,fontWeight:isA?700:400,cursor:"pointer",transition:"all 0.15s"}}>
                    {t.label}
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* 분량 */}
          {newsInfo && (
            <div style={{marginBottom:14,animation:"ns-fadein 0.65s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>분량</div>
              <div style={{display:"flex",gap:6}}>
                {[{id:"short",label:"짧게",desc:"~800자"},{id:"medium",label:"보통",desc:"~2,000자"},{id:"long",label:"길게",desc:"~4,000자"}].map(l=>{
                  const isA=length===l.id;
                  return <button key={l.id} onClick={()=>setLength(l.id)}
                    style={{flex:1,padding:"10px 8px",borderRadius:10,
                      border:`1.5px solid ${isA?accentRaw:border}`,
                      background:isA?"rgba(99,102,241,0.12)":"transparent",
                      cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                    <div style={{fontSize:14,fontWeight:isA?700:500,color:isA?accent:text}}>{l.label}</div>
                    <div style={{fontSize:10,color:muted,marginTop:2}}>{l.desc}</div>
                  </button>;
                })}
              </div>
            </div>
          )}

          {/* 추가 요청 */}
          {newsInfo && (
            <div style={{marginBottom:8,animation:"ns-fadein 0.7s ease"}}>
              <div style={{fontSize:14,fontWeight:700,color:muted,marginBottom:8}}>추가 요청 (선택)</div>
              <textarea value={extra} onChange={e=>setExtra(e.target.value)} rows={3}
                placeholder="예: 독자 관점에서 쉽게, 전문 용어 설명 포함..."
                style={{...IS,resize:"none",lineHeight:1.7,fontSize:14}}/>
            </div>
          )}
        </div>

          {/* 생성 버튼 */}
          {newsInfo && (
            <button onClick={generate} disabled={generating}
              style={{width:"100%",padding:"15px",borderRadius:12,border:"none",marginTop:16,
                cursor:generating?"not-allowed":"pointer",
                background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",
                color:"#fff",fontSize:15,fontWeight:800,
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {generating
                ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"ns-spin 0.8s linear infinite"}}/>생성 중...</>
                : user ? (<span>✨ 글 생성하기 <span style={{fontSize:12,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 8px",borderRadius:8}}>10P</span></span>) : (<span>✦ 1회 생성해보기</span>)}
            </button>
          )}
          {genErr && <div style={{marginTop:8,fontSize:12,color:"rgba(255,100,100,0.9)",textAlign:"center"}}>{genErr}</div>}
        </div>
      )}

      {/* 결과 영역 */}
      {wizStep>=2 && (
      <div style={{maxWidth:900,margin:"0 auto",width:"100%"}}>

        {/* 크레딧 소진 */}
        {(() => {
          const _u2 = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
          const _k2 = user ? ("member_" + (user.uid || "u")) : "guest";
          const _ex = (_u2[_k2]||0) >= (user?20:5) && (user?(user.points||0):0) < 10;
          if (_ex && !generating && !result) return <PointsExhausted isDark={isDark} isGuest={!user} title="뉴스 블로그" />;
          return null;
        })()}

        {/* 로딩 화면 - 생성 중 */}
        {generating && (
          <LoadingAnimation featureType="blog_write" title="AI가 글을 작성하고 있어요" subtitle={newsInfo?.title?.slice(0,40)||"뉴스 블로그"} isDark={isDark} />
        )}

        {/* 초기 안내 화면 */}
        {!generating && !result && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40,textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:text}}>뉴스로 블로그 글쓰기</div>
            <div style={{fontSize:13,color:muted,lineHeight:1.9,maxWidth:320}}>
              왼쪽에 기사 링크를 입력하면<br/>
              <span style={{color:"#ef4444",fontWeight:700}}>기사 내용을 자동 분석</span>해서<br/>
              블로그 글을 작성해드려요
            </div>
          </div>
        )}

        {/* 결과 화면 */}
        {!generating && result && (
          <>
            <div style={{height:46,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:`1px solid ${border}`,background:headerBg}}>
              <span style={{fontSize:12,fontWeight:700,color:text}}>생성 결과</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,
                  background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",border:`1px solid ${border}`}}>
                  <span style={{fontSize:10,color:muted}}>글자수</span>
                  <span style={{fontSize:12,fontWeight:700,color:text}}>{result.length.toLocaleString()}</span>
                  <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                  <span style={{fontSize:10,color:muted}}>공백제외</span>
                  <span style={{fontSize:12,fontWeight:700,color:accent}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
                </div>
                <button onClick={async()=>{
                  let html = result;
                  if (Object.keys(inlineImages).length > 0) {
                    html = html.replace(/\[(?:이미지|image):\s*([^\]]+)\]/g, (m, desc) => {
                      const url = inlineImages[desc.trim()];
                      return url ? `<br/><img src="${url}" alt="${desc.trim()}" style="max-width:100%;border-radius:8px;margin:12px 0;" /><br/>` : m;
                    });
                    html = html.replace(/\n/g, "<br/>");
                    try { await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([html],{type:"text/html"}),"text/plain":new Blob([result],{type:"text/plain"})})]); } catch { navigator.clipboard.writeText(result); }
                  } else { navigator.clipboard.writeText(result); }
                  setCopied(true);setTimeout(()=>setCopied(false),2000);
                }}
                  style={{padding:"5px 14px",borderRadius:7,border:`1px solid ${copied?"rgba(74,222,128,0.4)":border}`,
                    background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                    color:copied?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  {copied?"✓ 복사됨":"📋 복사 (이미지 포함)"}
                </button>
                <button onClick={()=>{
                  const b=new Blob([result],{type:"text/plain;charset=utf-8"});
                  const u=URL.createObjectURL(b);
                  const a=document.createElement("a");
                  a.href=u;a.download="뉴스블로그.txt";a.click();URL.revokeObjectURL(u);
                }} style={{padding:"5px 14px",borderRadius:7,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  📄 저장
                </button>
              </div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
              <div style={{background:isDark?"rgba(255,255,255,0.04)":"#fff",border:`1px solid ${border}`,borderRadius:14,padding:"28px 32px",fontSize:15,color:text,animation:"ns-fadein 0.4s ease",lineHeight:1.9}}>
                {renderMarkdown(result, isDark, text, muted, accent, inlineImages)}
              </div>
            </div>
          </>
        )}
      </div>
      )}
      </div>
    </div>
  );
}
