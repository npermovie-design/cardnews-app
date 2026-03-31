import React from "react";

/* ════════════════════════════════════════════════════════════
   BlogGenerator 유틸/상수 - 마크다운 렌더링, 플랫폼 설정
════════════════════════════════════════════════════════════ */

function cleanBlogText(text) {
  if (!text) return text;
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}\u{200D}\u{FE0F}]/gu, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/[★☆●○■□▶▷◀◁♥♡→←↑↓⇒⇔☑☐✓✗✘※◎▪▫◆◇♦♧♣♠♤✦✧⊙⊕⊖△▲▽▼◐◑☀☁☂☃♨♪♬♩✿❀❁❂❃❈❊❋✡✪✫✬✭✮✯✰⭐💡💎🔥🚀📌📍📎✅❌⭕🔗📢📣🎯🎁💰💳🏆🎉🎊👍👉👇👆💪🙏❤️💜💙💚🤔😊😍🥳]/gu, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]{3,}$/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, (m) => m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mdToHtml(md) {
  let html = md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/^[-*] (.+)$/gm,"<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm,"<li>$2</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g,m=>`<ul>${m}</ul>`)
    .replace(/<\/ul>\s*<ul>/g,"")
    .replace(/\n{2,}/g,"</p><p>");
  return `<div class="tistory-content">\n<p>${html}</p>\n</div>`;
}


/* ── 교체 가능한 이미지 컴포넌트 (우클릭/드래그앤드롭) ── */
function ReplaceableImage({ src, desc, isDark, mutedColor, fallbackSeed }) {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [showMenu, setShowMenu] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef(null);

  const replaceWithFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setImgSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{margin:"20px 0",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",position:"relative",
      outline: dragOver ? "3px dashed #7c6aff" : "none", transition:"outline 0.15s"}}
      onContextMenu={e => { e.preventDefault(); setShowMenu(!showMenu); }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); replaceWithFile(e.dataTransfer?.files?.[0]); }}>
      <img src={imgSrc} alt={desc} loading="lazy"
        onError={e => { e.target.onerror=null; e.target.src=`https://picsum.photos/seed/${fallbackSeed}/800/450`; }}
        style={{width:"100%",display:"block",height:320,objectFit:"cover",cursor:"pointer"}}
        onClick={() => setShowMenu(!showMenu)} />
      <div style={{padding:"10px 16px",fontSize:11,color:mutedColor,background:isDark?"rgba(0,0,0,0.4)":"#f8f8fb",display:"flex",alignItems:"center",gap:6}}>
        <span style={{opacity:0.5}}>&#128247;</span> {desc}
        <span style={{marginLeft:"auto",fontSize:10,opacity:0.5}}>클릭 또는 드래그로 교체</span>
      </div>
      {/* 교체 메뉴 */}
      {showMenu && (
        <div style={{position:"absolute",top:8,right:8,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",padding:4,zIndex:10,minWidth:140}}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { fileRef.current?.click(); setShowMenu(false); }}
            style={{width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"#333",textAlign:"left",borderRadius:6,display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            📁 PC에서 교체
          </button>
          <button onClick={() => { const url = prompt("이미지 URL을 입력하세요:"); if(url) setImgSrc(url); setShowMenu(false); }}
            style={{width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"#333",textAlign:"left",borderRadius:6,display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            🔗 URL로 교체
          </button>
          <button onClick={() => { setImgSrc(`https://picsum.photos/seed/${Date.now()}/800/450`); setShowMenu(false); }}
            style={{width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"#333",textAlign:"left",borderRadius:6,display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            🎲 랜덤 이미지
          </button>
          <div style={{height:1,background:"#eee",margin:"2px 0"}}/>
          <button onClick={() => setShowMenu(false)}
            style={{width:"100%",padding:"6px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:11,color:"#999",textAlign:"center",borderRadius:6}}>
            닫기
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
        onChange={e => { replaceWithFile(e.target.files?.[0]); e.target.value=""; }} />
    </div>
  );
}

/* ── 마크다운 → JSX 렌더러 ── */
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
      const src = imgUrl || `https://picsum.photos/seed/${fallbackSeed}/800/450`;
      elements.push(
        <ReplaceableImage key={i} src={src} desc={desc} isDark={isDark} mutedColor={mutedColor} fallbackSeed={fallbackSeed} />
      );
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{fontSize:16,fontWeight:800,color:textColor,margin:"20px 0 8px",letterSpacing:-0.3}}>{inlineFormat(line.slice(4),accentColor)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{fontSize:19,fontWeight:900,color:textColor,margin:"28px 0 10px",letterSpacing:-0.5,borderBottom:`2px solid ${accentColor}`,paddingBottom:6}}>{inlineFormat(line.slice(3),accentColor)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{fontSize:22,fontWeight:900,color:textColor,margin:"32px 0 12px",letterSpacing:-0.8}}>{inlineFormat(line.slice(2),accentColor)}</h1>);
    } else if (line.match(/^[-*]{3,}$/)) {
      elements.push(<hr key={i} style={{border:"none",borderTop:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e9ecef"}`,margin:"20px 0"}}/>);
    } else if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} style={{marginBottom:5,lineHeight:1.8,color:textColor}}>{inlineFormat(lines[i].slice(2),accentColor)}</li>);
        i++;
      }
      elements.push(<ul key={"ul"+i} style={{paddingLeft:20,margin:"8px 0 12px",listStyle:"disc"}}>{items}</ul>);
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} style={{marginBottom:5,lineHeight:1.8,color:textColor}}>{inlineFormat(lines[i].replace(/^\d+\. /,""),accentColor)}</li>);
        i++;
      }
      elements.push(<ol key={"ol"+i} style={{paddingLeft:22,margin:"8px 0 12px"}}>{items}</ol>);
      continue;
    } else if (line.startsWith("> ")) {
      elements.push(<blockquote key={i} style={{borderLeft:`4px solid ${accentColor}`,paddingLeft:14,margin:"12px 0",color:mutedColor,fontStyle:"italic",lineHeight:1.8}}>{inlineFormat(line.slice(2),accentColor)}</blockquote>);
    } else if (line.trim()==="") {
      elements.push(<div key={i} style={{height:8}}/>);
    } else if (line.trim().startsWith("#")&&line.includes(" #")) {
      elements.push(<p key={i} style={{margin:"4px 0",lineHeight:1.9,fontSize:14,color:accentColor}}>{line}</p>);
    } else if (line.trim()) {
      elements.push(<p key={i} style={{margin:"4px 0",lineHeight:1.95,color:textColor}}>{inlineFormat(line,accentColor)}</p>);
    }
    i++;
  }
  return elements;
}
function inlineFormat(text, accentColor) {
  const parts=[]; const re=/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last=0,m;
  while((m=re.exec(text))!==null){
    if(m.index>last) parts.push(text.slice(last,m.index));
    const raw=m[0];
    if(raw.startsWith("**")) parts.push(<strong key={m.index} style={{fontWeight:800}}>{raw.slice(2,-2)}</strong>);
    else if(raw.startsWith("*")) parts.push(<em key={m.index} style={{fontStyle:"italic"}}>{raw.slice(1,-1)}</em>);
    else if(raw.startsWith("`")) parts.push(<code key={m.index} style={{background:"rgba(99,102,241,0.12)",color:accentColor,padding:"1px 6px",borderRadius:6,fontSize:"0.9em",fontFamily:"monospace"}}>{raw.slice(1,-1)}</code>);
    last=m.index+raw.length;
  }
  if(last<text.length) parts.push(text.slice(last));
  return parts.length?parts:text;
}

// ── 플랫폼별 전체 설정 ──────────────────────────────────────────────────────
const PLATFORMS = {

  blog_naver: {
    title: "네이버 블로그 글쓰기",
    accentColor: "#03C75A",
    subtypes: [
      { id:"info",    icon:"", label:"정보성 글",     desc:"정보·노하우·가이드" },
      { id:"visit",   icon:"", label:"체험·방문후기", desc:"장소·매장 방문 후기" },
      { id:"travel",  icon:"", label:"여행 후기",     desc:"국내외 여행 기록" },
      { id:"product", icon:"", label:"제품 후기",     desc:"제품·서비스 리뷰" },
      { id:"column",  icon:"", label:"칼럼",         desc:"전문 의견·분석 글", autoTitle:true },
      { id:"article", icon:"", label:"기사 방식",     desc:"뉴스 기사 스타일 글", autoTitle:true },
    ],
    tones: [
      {id:"friendly",     label:"친근·정보형"},
      {id:"diary",        label:"일기형"},
      {id:"review",       label:"리뷰형"},
      {id:"professional", label:"전문형"},
    ],
    wordCounts: [
      {id:"short",  label:"보통",      desc:"1,000~1,500자"},
      {id:"medium", label:"길게",      desc:"2,000~3,000자"},
      {id:"long",   label:"아주 길게", desc:"4,000자 이상"},
    ],
    fields: {
      info:    ["keyword","target","extra"],
      visit:   ["keyword","location","visitDate","rating","extra"],
      travel:  ["keyword","location","duration","budget","extra"],
      product: ["keyword","productName","price","pros","cons","extra"],
      column:  ["keyword","mainPoint","extra"],
      article: ["keyword","extra"],
    },
    examples: {
      info:    ["혈당 스파이크 예방하는 식사 순서","강아지 슬개골 탈구 예방 운동법","재테크 초보를 위한 ETF 투자 가이드"],
      visit:   ["홍대 수제버거 맛집 방문후기","강남 네일아트샵 솔직 후기","이케아 광명점 쇼핑 방문기"],
      travel:  ["제주도 3박4일 혼자 여행 코스","오사카 2박3일 맛집 투어","강원도 속초 당일치기 여행"],
      product: ["다이슨 에어랩 3개월 사용 솔직 후기","맥북에어 M3 학생 추천 이유","무신사 패딩 실제 착용 리뷰"],
      column:  ["AI 시대 블로거의 생존 전략","MZ세대 소비 트렌드 변화 분석","1인 미디어가 바꾸는 마케팅 판도"],
      article: ["네이버 블로그 수익화 가이드 총정리","2026년 부동산 시장 전망 분석","프리랜서 세금 신고 완벽 가이드"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"1,000~1,500자",medium:"2,000~3,000자",long:"4,000자 이상"}[wc];
      const t={friendly:"친근하고 유용한 정보 전달체",diary:"일기처럼 자연스럽고 솔직한",review:"객관적이고 구체적인 리뷰체",professional:"전문적이고 신뢰감 있는"}[tone];
      const imgRule = `\n\n[글 구조 필수 규칙]\n1. 큰 소제목 → [image: 해당 단락 내용을 구체적으로 묘사하는 영문 키워드] → 본문 설명 순서로 반복\n2. [image: keyword] 형태로 각 소제목마다 1개씩 이미지 삽입 (반드시 해당 단락의 실제 내용과 직결되는 영문 2~4단어)\n   예시: 혈당 관련 글이면 [image: blood sugar monitor], 카페 후기면 [image: cozy cafe latte art], 여행이면 [image: jeju island ocean view]\n3. 절대 추상적/일반적 키워드 금지 (technology, business, nature 같은 단어 금지). 글의 구체적 소재를 반영할 것\n4. 소제목은 3~5개 정도`;
      const speechRule = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const noEnding = `\n\n[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 사용 금지. 마지막 문단도 자연스럽게 본문처럼 이어서 끝낼 것`;
      const noSpecial = `\n\n[절대 금지] #, ##, **, ~~, *, -, 이모티콘, 이모지, 특수기호(★●■▶♥☆→), 마크다운 문법 일체 사용 금지. 순수 한글 문장만 작성. 소제목은 그냥 굵은 텍스트처럼 별도 줄에 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 (띄어쓰기 구분)`;
      const custom = f.extra ? `\n\n[사용자 맞춤 요청] ${f.extra}` : "";
      const tail = speechRule + noEnding + noSpecial;
      if(sub==="info")    return `네이버 블로그 정보성 글 (${w}, ${t})\n키워드: ${f.keyword}\n대상: ${f.target||"일반 독자"}${custom}${imgRule}\n- 검색 최적화 제목\n- 실용적 팁/정보 위주${tail}`;
      if(sub==="visit")   return `네이버 블로그 체험·방문후기 (${w}, ${t})\n장소: ${f.keyword} / 위치: ${f.location||""} / 날짜: ${f.visitDate||"최근"} / 평점: ${f.rating||"4.5"}/5${custom}${imgRule}\n- 방문 전 기대→방문 과정→솔직 총평\n- 장단점 명확히, 재방문 의사 포함${tail}`;
      if(sub==="travel")  return `네이버 블로그 여행후기 (${w}, ${t})\n여행지: ${f.keyword} / 장소: ${f.location||""} / 기간: ${f.duration||"당일"} / 예산: ${f.budget||""}\n${custom}${imgRule}\n- 일정별 구조화, 맛집/명소/교통 포함\n- 실제 여행자 감성, 예산 팁 포함${tail}`;
      if(sub==="product") return `네이버 블로그 제품후기 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}${custom}${imgRule}\n- 구매 전 고민→언박싱→실사용 구조\n- 추천 대상·가성비 총평 포함${tail}`;
      if(sub==="column")  return `네이버 블로그 칼럼 (${w}, 전문적이고 논리적인 칼럼체)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}${custom}\n\n글 맨 처음에 제목과 부제목 추천:\n제목: (SEO 최적화된 제목)\n부제목: (핵심 내용 요약)${imgRule}\n- 주장→근거→반론→결론 구조\n- 데이터·사례·통계 인용${tail}`;
      if(sub==="article") return `네이버 블로그 기사 방식 글 (${w}, 객관적이고 보도 형식의)\n주제: ${f.keyword}${custom}\n\n글 맨 처음에 제목과 부제목 추천:\n제목: (뉴스 기사 스타일 제목)\n부제목: (핵심 내용 한 줄 요약)${imgRule}\n- 역피라미드 구조 (핵심→세부→배경)\n- 5W1H 포함\n- 객관적 사실 기반${tail}`;
      return "";
    },
  },

  blog_tistory: {
    title: "티스토리 블로그 글쓰기",
    accentColor: "#FF6B35",
    htmlOutput: true,
    subtypes: [
      {id:"info",    icon:"", label:"정보성 글",       desc:"SEO 최적화 정보글"},
      {id:"review",  icon:"", label:"제품·서비스 리뷰", desc:"구체적 사용 후기"},
      {id:"howto",   icon:"", label:"How-to 가이드",   desc:"단계별 방법 안내"},
      {id:"opinion", icon:"", label:"칼럼·의견",        desc:"전문 의견·분석"},
      {id:"column",  icon:"", label:"칼럼",            desc:"전문 칼럼 글", autoTitle:true},
      {id:"article", icon:"", label:"기사 방식",        desc:"뉴스 기사 스타일", autoTitle:true},
    ],
    tones: [
      {id:"professional", label:"전문적"},
      {id:"friendly",     label:"친근한"},
      {id:"analytical",   label:"분석적"},
    ],
    wordCounts: [
      {id:"short",  label:"보통", desc:"1,500~2,000자"},
      {id:"medium", label:"길게", desc:"2,500~3,500자"},
      {id:"long",   label:"심층", desc:"4,000자 이상"},
    ],
    fields: {
      info:    ["keyword","target","extra"],
      review:  ["keyword","productName","pros","cons","extra"],
      howto:   ["keyword","steps","extra"],
      opinion: ["keyword","mainPoint","extra"],
      column:  ["keyword","mainPoint","extra"],
      article: ["keyword","extra"],
    },
    examples: {
      info:    ["파이썬 독학 완전 정복 가이드","구글 애드센스 승인받는 방법","ChatGPT 활용 업무 자동화"],
      review:  ["아이패드 프로 M4 실사용 리뷰","클로드 vs ChatGPT 비교 분석","노션 프리미엄 6개월 사용기"],
      howto:   ["워드프레스 블로그 개설하는 법","인스타그램 팔로워 늘리는 7가지 방법","유튜브 채널 수익화 조건 달성법"],
      opinion: ["AI가 바꾸는 콘텐츠 마케팅의 미래","2024년 재테크 전략 분석","SNS 마케팅 현실적인 이야기"],
      column:  ["생성형 AI가 SEO를 바꾸는 방식","구독 경제의 성장과 한계","1인 창업 시대의 마케팅 전략"],
      article: ["구글 AI 검색 업데이트 분석","국내 SaaS 시장 현황 리포트","2026년 디지털 마케팅 트렌드"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"1,500~2,000자",medium:"2,500~3,500자",long:"4,000자 이상"}[wc];
      const t={professional:"전문적이고 신뢰감 있는",friendly:"친근하고 쉬운",analytical:"분석적이고 논리적인"}[tone];
      const sp = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const noEnd = `\n\n[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 금지. 자연스럽게 끝낼 것`;
      const noSp = `\n\n[필수] 이모티콘·이모지·특수기호(★●■)·마크다운(##·###·**·~~) 절대 사용 금지. 순수 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      const tail = sp + noEnd + noSp;
      if(sub==="info")    return `티스토리 SEO 최적화 정보성 글 (${w}, ${t})\n키워드: ${f.keyword} / 대상: ${f.target||"일반"}\n${f.extra||""}\n\n- 소제목은 일반 텍스트로 (마크다운 ## 사용 금지)\n- 키워드 제목·소제목에 자연스럽게 포함\n- 결론에 CTA 포함, 관련 키워드 녹임${tail}`;
      if(sub==="review")  return `티스토리 제품·서비스 리뷰 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 상세 스펙·실사용 경험·객관적 평가\n- 구매 가이드 제공${tail}`;
      if(sub==="howto")   return `티스토리 How-to 가이드 (${w}, ${t})\n주제: ${f.keyword} / 단계: ${f.steps||""}\n${f.extra||""}\n\n- 번호 매긴 단계별 설명 (숫자 목록은 허용)\n- 각 단계 팁·주의사항, FAQ 포함${tail}`;
      if(sub==="opinion") return `티스토리 칼럼/의견 (${w}, ${t})\n주제: ${f.keyword} / 핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n- 주장→근거→반론→결론 구조\n- 데이터·사례 언급, 독자 공감 유도${tail}`;
      if(sub==="column")  return `티스토리 전문 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (SEO 키워드 포함 제목)\n부제목: (핵심 한 줄 요약)\n\n- 주장→근거→반론→결론\n- 데이터·사례·통계 인용${tail}`;
      if(sub==="article") return `티스토리 기사 방식 글 (${w}, 보도 형식)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 역피라미드 구조\n- 5W1H, 객관적 사실 기반${tail}`;
      return "";
    },
  },

  blog_insta: {
    title: "인스타그램 캡션 생성",
    accentColor: "#E1306C",
    subtypes: [
      {id:"daily",   icon:"", label:"일상 피드",   desc:"감성·일상 공유"},
      {id:"product", icon:"", label:"제품 홍보",   desc:"상품·브랜드 소개"},
      {id:"info",    icon:"", label:"정보 카드",   desc:"유용한 정보 공유"},
      {id:"event",   icon:"", label:"이벤트·공지", desc:"행사·프로모션 안내"},
      {id:"column",  icon:"", label:"칼럼",       desc:"전문 인사이트 공유", autoTitle:true},
      {id:"article", icon:"", label:"기사 방식",   desc:"뉴스 정리 캡션", autoTitle:true},
    ],
    tones: [
      {id:"emotional",  label:"감성적"},
      {id:"friendly",   label:"친근·활발"},
      {id:"trendy",     label:"트렌디"},
      {id:"luxurious",  label:"고급스러운"},
    ],
    // 인스타는 글자수/줄수 기준
    wordCounts: [
      {id:"micro",  label:"미니",  desc:"2~3줄 (50자)"},
      {id:"short",  label:"짧게",  desc:"5~6줄 (120자)"},
      {id:"medium", label:"보통",  desc:"10줄 (250자)"},
      {id:"long",   label:"길게",  desc:"15줄+ (400자)"},
    ],
    fields: {
      daily:   ["keyword","mood","extra"],
      product: ["keyword","productName","price","extra"],
      info:    ["keyword","points","extra"],
      event:   ["keyword","eventDate","extra"],
      column:  ["keyword","mainPoint","extra"],
      article: ["keyword","extra"],
    },
    examples: {
      daily:   ["오늘의 카페 일상","주말 브런치 피드","가을 감성 일상"],
      product: ["신상 뷰티 제품 소개","수제 케이크 홍보","핸드메이드 액세서리"],
      info:    ["피부 관리 꿀팁 5가지","절약 생활 노하우","다이어트 식단 구성법"],
      event:   ["플리마켓 오픈 안내","할인 이벤트 공지","신메뉴 출시 알림"],
      column:  ["브랜딩에 대한 오해와 진실","콘텐츠 마케팅 실전 인사이트","크리에이터 수익 구조 분석"],
      article: ["인스타 알고리즘 변경 요약","Z세대 소비 트렌드 분석","2026 SNS 마케팅 핵심 정리"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={micro:"50자 이내 2~3줄",short:"120자 내외 5~6줄",medium:"250자 내외 10줄",long:"400자 내외 15줄 이상"}[wc];
      const t={emotional:"감성적이고 시적인",friendly:"친근하고 활발한",trendy:"트렌디하고 세련된",luxurious:"고급스럽고 우아한"}[tone];
      const sp = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const htag="줄바꿈 후 관련 해시태그 15~20개";
      if(sub==="daily")   return `인스타그램 일상 피드 캡션 (${w}, ${t})\n상황: ${f.keyword} / 분위기: ${f.mood||""}\n${f.extra||""}\n\n- 첫 줄 강력한 훅 (이모지 없이 텍스트로)\n- 줄바꿈으로 가독성 확보\n- ${htag}${sp}\n\n[필수] 이모티콘·이모지·특수기호 절대 사용 금지. 해시태그만 허용`;
      if(sub==="product") return `인스타그램 제품 홍보 캡션 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n${f.extra||""}\n\n- 제품 매력 훅, 핵심 특징 3가지 이내\n- 구매 유도 CTA 포함\n- ${htag}${sp}`;
      if(sub==="info")    return `인스타그램 정보 피드 캡션 (${w}, ${t})\n주제: ${f.keyword} / 포인트: ${f.points||""}\n${f.extra||""}\n\n- "저장 필수" 유도 첫 문장\n- 번호 매긴 핵심 포인트\n- ${htag}${sp}`;
      if(sub==="event")   return `인스타그램 이벤트/공지 캡션 (${w}, ${t})\n이벤트: ${f.keyword} / 날짜: ${f.eventDate||""}\n${f.extra||""}\n\n- 강렬한 첫 줄 (이모지 없이 텍스트로), 참여 방법 명확히\n- ${htag}${sp}\n\n[필수] 이모티콘·이모지·특수기호 절대 사용 금지. 해시태그만 허용`;
      if(sub==="column")  return `인스타그램 칼럼 캡션 (${w}, 전문적이고 통찰력 있는)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 첫 줄에 추천 제목을 넣어주세요.\n\n- 전문 인사이트 공유, 깊이 있는 분석\n- 저장 유도 첫 문장\n- ${htag}${sp}`;
      if(sub==="article") return `인스타그램 기사 정리 캡션 (${w}, 객관적 보도체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 첫 줄에 추천 제목을 넣어주세요.\n\n- 핵심 뉴스/정보를 짧고 명확하게 정리\n- 팩트 중심, 출처 언급 형식\n- ${htag}${sp}`;
      return "";
    },
  },

  blog_youtube: {
    title: "유튜브 대본 & 설명 생성",
    accentColor: "#FF0000",
    subtypes: [
      {id:"script", icon:"", label:"영상 대본",   desc:"인트로~아웃트로 완성"},
      {id:"desc",   icon:"", label:"영상 설명란", desc:"설명 + 타임스탬프 + 태그"},
      {id:"shorts", icon:"", label:"쇼츠 대본",   desc:"60초 임팩트 대본"},
      {id:"title",  icon:"", label:"제목·썸네일", desc:"클릭률 높은 제목 5개"},
      {id:"column",  icon:"", label:"칼럼 대본",   desc:"전문 분석 영상 대본", autoTitle:true},
      {id:"article", icon:"", label:"뉴스 리뷰 대본", desc:"기사/뉴스 분석 대본", autoTitle:true},
    ],
    tones: [
      {id:"energetic",    label:"에너지틱"},
      {id:"calm",         label:"차분·진지"},
      {id:"educational",  label:"교육적"},
      {id:"entertaining", label:"예능·재미"},
    ],
    // 유튜브는 시간 기준
    wordCounts: [
      {id:"30s", label:"30초",  desc:"~150자"},
      {id:"1m",  label:"1분",   desc:"~300자"},
      {id:"5m",  label:"5분",   desc:"~700자"},
      {id:"10m", label:"10분",  desc:"~1,500자"},
      {id:"20m", label:"20분",  desc:"~3,000자"},
      {id:"1h",  label:"1시간", desc:"섹션별 요약"},
    ],
    fields: {
      script: ["keyword","target","mainPoints","extra"],
      desc:   ["keyword","duration","extra"],
      shorts: ["keyword","hook","extra"],
      title:  ["keyword","angle","extra"],
      column:  ["keyword","mainPoint","extra"],
      article: ["keyword","extra"],
    },
    examples: {
      script: ["유튜브 알고리즘 완전 정복","매일 30분 운동으로 바뀐 몸","월 100만원 아끼는 절약법"],
      desc:   ["요리 레시피 영상","재테크 공부 브이로그","PC 조립 튜토리얼"],
      shorts: ["아무도 알려주지 않는 생산성 꿀팁","10초만에 기억력 올리는 법","직장인 필수 앱 3가지"],
      title:  ["다이어트 식단 정보 영상","파이썬 독학 과정 영상","여행 브이로그"],
      column:  ["AI가 미래 직업에 미치는 영향","콘텐츠 시장의 구조적 변화","크리에이터 이코노미 심층 분석"],
      article: ["최신 테크 뉴스 리뷰","시장 동향 분석 영상","주요 업계 이슈 정리"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={"30s":"30초 분량(~150자)","1m":"1분 분량(~300자)","5m":"5분 분량(~700자)","10m":"10분 분량(~1,500자)","20m":"20분 분량(~3,000자)","1h":"1시간 분량(~9,000자, 섹션별)"}[wc];
      const t={energetic:"에너지틱하고 빠른 템포",calm:"차분하고 신뢰감 있는",educational:"교육적이고 체계적인",entertaining:"재미있고 친근한"}[tone];
      const sp = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      if(sub==="script") return `유튜브 영상 대본 (${w}, ${t})\n주제: ${f.keyword} / 타깃: ${f.target||"일반 시청자"}\n핵심 내용: ${f.mainPoints||""}\n${f.extra||""}\n\n[인트로-훅+예고] → [본론-핵심 단계별] → [아웃트로-구독유도]\n자연스러운 구어체, 화면 지시 포함${sp}`;
      if(sub==="desc")   return `유튜브 영상 설명란\n영상: ${f.keyword} / 길이: ${f.duration||"10분"}\n${f.extra||""}\n\n- 요약 2~3문장\n- 타임스탬프 (예시 시간 포함)\n- 관련 링크 섹션\n- 해시태그 10개\n- 채널 소개 문구${sp}`;
      if(sub==="shorts") return `유튜브 쇼츠 대본 (60초, ${t})\n주제: ${f.keyword} / 훅 아이디어: ${f.hook||""}\n${f.extra||""}\n\n[0~3초: 강력한 훅] → [3~50초: 핵심 임팩트] → [50~60초: 마무리·구독유도]\n짧고 강한 문장, 자막 가능하도록${sp}`;
      if(sub==="title")  return `유튜브 제목 5가지 + 썸네일 문구 제안\n영상 주제: ${f.keyword} / 각도: ${f.angle||""}\n\n- 클릭률 높은 제목 5가지 (숫자/궁금증/혜택 활용)\n- 각 제목별 썸네일 메인 문구\n- SEO 태그 10개${sp}`;
      if(sub==="column")  return `유튜브 칼럼 영상 대본 (${w}, 전문적이고 분석적인)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 대본 맨 처음에 추천 영상 제목과 부제목:\n제목: (클릭률 높은 칼럼 제목)\n부제목: (핵심 한 줄)\n\n[인트로-문제제기] → [본론-분석·근거] → [아웃트로-결론·구독유도]${sp}`;
      if(sub==="article") return `유튜브 뉴스 리뷰 대본 (${w}, 객관적 보도체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 대본 맨 처음에 추천 영상 제목과 부제목:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n[인트로-이슈 소개] → [본론-팩트 정리] → [아웃트로-시사점·구독유도]${sp}`;
      return "";
    },
  },

  blog_thread: {
    title: "스레드 게시물 작성",
    accentColor: "#000000",
    subtypes: [
      {id:"opinion",  icon:"", label:"의견·인사이트", desc:"생각·관점 공유"},
      {id:"story",    icon:"", label:"이야기·경험",   desc:"경험담 스토리"},
      {id:"tip",      icon:"", label:"꿀팁·정보",     desc:"유용한 팁 공유"},
      {id:"question", icon:"", label:"질문·토론",     desc:"커뮤니티 참여 유도"},
      {id:"column",   icon:"", label:"칼럼",          desc:"전문 분석 스레드", autoTitle:true},
      {id:"article",  icon:"", label:"기사 정리",      desc:"뉴스 요약 스레드", autoTitle:true},
    ],
    tones: [
      {id:"casual",      label:"일상 대화체"},
      {id:"thoughtful",  label:"사려깊은"},
      {id:"provocative", label:"도발적·강렬한"},
      {id:"humorous",    label:"유머러스"},
    ],
    // 스레드는 개수 기준
    wordCounts: [
      {id:"single", label:"짧게",  desc:"1~3문장"},
      {id:"medium", label:"보통",  desc:"적당한 길이"},
      {id:"long",   label:"길게",  desc:"깊이 있게"},
    ],
    fields: {
      opinion:  ["keyword","stance","extra"],
      story:    ["keyword","lesson","extra"],
      tip:      ["keyword","points","extra"],
      question: ["keyword","angle","extra"],
      column:   ["keyword","mainPoint","extra"],
      article:  ["keyword","extra"],
    },
    examples: {
      opinion:  ["AI 시대 크리에이터의 생존법","직장 다니며 부업하는 현실","SNS 팔로워보다 중요한 것"],
      story:    ["퇴사하고 1년 후 솔직한 이야기","첫 해외여행 혼자 간 경험","실패한 창업에서 배운 것"],
      tip:      ["아침 루틴 바꾸고 달라진 것들","시간 낭비 줄이는 앱 추천","돈 모으기 시작하는 첫 3단계"],
      question: ["재택근무 선호 vs 출근 선호?","SNS 끊어본 적 있나요?","지금 가장 배우고 싶은 것은?"],
      column:   ["퍼스널 브랜딩의 진짜 의미","콘텐츠 시장의 미래","디지털 노마드 현실"],
      article:  ["AI 업계 주요 뉴스 정리","SNS 알고리즘 변경 요약","2026 마케팅 트렌드"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const cnt={single:"짧게 (1~3문장)",medium:"보통 (200~400자)",long:"길게 (400~500자)"}[wc];
      const t={casual:"친근한 일상 대화체",thoughtful:"사려 깊고 진지한",provocative:"강렬하고 도발적인",humorous:"유머러스하고 가볍게"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const fmt=`\n\n[필수]\n- 스레드 1개 게시물용 텍스트만 작성 (500자 이내)\n- [1/3] 같은 번호 절대 금지\n- 제목 없이 바로 본문 시작\n- 마크다운·이모지 금지\n- 줄바꿈으로 문단 구분\n- 마지막에 질문이나 공감 유도\n- 분량: ${cnt}${sp}`;
      if(sub==="opinion")  return `스레드 의견·인사이트 (${t})\n주제: ${f.keyword} / 입장: ${f.stance||""}\n${f.extra||""}${fmt}`;
      if(sub==="story")    return `스레드 경험 이야기 (${t})\n경험: ${f.keyword} / 교훈: ${f.lesson||""}\n${f.extra||""}${fmt}`;
      if(sub==="tip")      return `스레드 꿀팁 공유 (${t})\n주제: ${f.keyword} / 포인트: ${f.points||""}\n${f.extra||""}${fmt}`;
      if(sub==="question") return `스레드 질문·토론 (${t})\n주제: ${f.keyword} / 각도: ${f.angle||""}\n${f.extra||""}${fmt}`;
      if(sub==="column")  return `스레드 전문 칼럼 (사려 깊고 전문적인)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 첫 글에 추천 제목을 넣어주세요.${fmt}`;
      if(sub==="article") return `스레드 뉴스 정리 (객관적 보도체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 첫 글에 추천 제목을 넣어주세요.${fmt}`;
      return "";
    },
  },
  blog_cafe: {
    title: "네이버 카페 글쓰기",
    accentColor: "#03C75A",
    subtypes: [
      { id:"info",    icon:"", label:"정보·꿀팁",   desc:"유용한 정보 공유" },
      { id:"review",  icon:"", label:"후기·리뷰",   desc:"제품·장소 솔직 후기" },
      { id:"question",icon:"", label:"질문·도움",   desc:"카페 회원에게 질문" },
      { id:"free",    icon:"", label:"자유 게시글", desc:"일상·공지·이야기" },
      { id:"column",  icon:"", label:"칼럼",       desc:"전문 의견·분석 글", autoTitle:true },
      { id:"article", icon:"", label:"기사 방식",   desc:"뉴스 스타일 정리", autoTitle:true },
    ],
    tones: [
      {id:"friendly",  label:"친근·일상체"},
      {id:"informative",label:"정보·유익"},
      {id:"review",    label:"솔직 후기체"},
    ],
    wordCounts: [
      {id:"short",  label:"짧게",  desc:"300~500자"},
      {id:"medium", label:"보통",  desc:"600~900자"},
      {id:"long",   label:"길게",  desc:"1,000자 이상"},
    ],
    fields: {
      info:     ["keyword","target","extra"],
      review:   ["keyword","productName","pros","cons","extra"],
      question: ["keyword","extra"],
      free:     ["keyword","extra"],
      column:   ["keyword","mainPoint","extra"],
      article:  ["keyword","extra"],
    },
    examples: {
      info:     ["자취 생활비 절약 꿀팁 모음","주말 등산 초보 준비물 리스트","다이어트 식단 실패 없이 유지하는 법"],
      review:   ["다이소 신상 청소용품 써봤어요","홍대 핫플 카페 솔직 후기","아이허브 단백질 쉐이크 비교 후기"],
      question: ["카페 오픈런 어떻게 하나요","운동 초보 헬스장 선택 기준","이 제품 써보신 분 계세요"],
      free:     ["오늘 날씨 너무 좋다","이번 주 모임 공지입니다","공구 마감 임박 안내"],
      column:   ["자취생 절약의 기술과 철학","운동을 습관으로 만드는 과학적 방법","소비 습관이 인생을 바꾸는 이유"],
      article:  ["올해 인기 가전제품 총정리","건강 트렌드 변화 분석","카페 창업 시장 현황 리포트"],
    },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"300~500자",medium:"600~900자",long:"1,000자 이상"}[wc];
      const t={friendly:"친근하고 자연스러운 일상체",informative:"유익하고 친절한",review:"솔직하고 공감 가는 후기체"}[tone];
      const sp = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const noEnd = `\n\n[마무리 금지] "마치며", "끝으로", "마무리하며" 같은 진부한 마무리 표현 금지. 자연스럽게 끝낼 것`;
      const noSp = `\n\n[필수] 이모티콘·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만`;
      const tail = sp + noEnd + noSp;
      if(sub==="info")     return `네이버 카페 정보 게시글 (${w}, ${t})\n주제: ${f.keyword}\n대상: ${f.target||"카페 회원"}\n${f.extra||""}\n\n- 핵심 정보를 친근하게 전달\n- 소제목 없이 자연스러운 문단 구성${tail}`;
      if(sub==="review")   return `네이버 카페 후기 게시글 (${w}, ${t})\n대상: ${f.keyword} / 제품명: ${f.productName||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 구매/방문 동기부터 솔직 후기까지\n- 장단점 균형 있게\n- 추천 대상 언급${tail}`;
      if(sub==="question") return `네이버 카페 질문 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 상황 설명 후 궁금한 점 명확히\n- 카페 회원들에게 도움 요청하는 자연스러운 글${tail}`;
      if(sub==="free")     return `네이버 카페 자유 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 가볍고 친근한 일상 공유\n- 카페 분위기에 맞는 짧고 자연스러운 글${tail}`;
      if(sub==="column")  return `네이버 카페 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (카페에 적합한 전문 제목)\n부제목: (핵심 한 줄)\n\n- 주장→근거→결론 구조\n- 카페 회원 눈높이에 맞춘 전문 글${tail}\n글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="article") return `네이버 카페 기사 스타일 글 (${w}, 객관적 정리체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 팩트 기반 정리, 수치/통계 활용\n- 카페 회원이 이해하기 쉬운 언어${tail}\n글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      return "";
    },
  },
};

// ── 말투(문체) 옵션 — 모든 플랫폼 공통 ──
const SPEECH_STYLES = [
  { id:"polite_yo",  label:"~요 체", desc:"해요체 (친근한 존댓말)", prompt:"해요체(~요, ~이에요, ~했어요)로 작성" },
  { id:"formal",     label:"~합니다 체", desc:"합니다체 (격식 존댓말)", prompt:"합니다체(~입니다, ~했습니다, ~됩니다)로 작성" },
  { id:"casual",     label:"반말 체", desc:"반말 (친구 대화체)", prompt:"반말(~야, ~거든, ~했어, ~인데)로 작성. 자연스러운 구어체" },
  { id:"mixed",      label:"혼합 체", desc:"상황에 맞게 자유롭게", prompt:"상황에 맞게 존댓말과 반말을 자연스럽게 섞어서 작성" },
];

const FIELD_LABELS = {
  keyword:     {label:"키워드 / 주제",        placeholder:"핵심 키워드를 입력하세요", required:true},
  target:      {label:"대상 독자 (선택)",      placeholder:"예: 20-30대 직장인, 초보자"},
  location:    {label:"위치 / 지역 (선택)",    placeholder:"예: 서울 홍대, 제주도"},
  visitDate:   {label:"방문 날짜 (선택)",      placeholder:"예: 2024년 11월"},
  rating:      {label:"평점 (선택)",           placeholder:"예: 4.5/5"},
  duration:    {label:"기간 (선택)",           placeholder:"예: 2박3일, 당일치기"},
  budget:      {label:"예산 (선택)",           placeholder:"예: 1인 30만원"},
  productName: {label:"제품명 (선택)",         placeholder:"정확한 제품명 입력"},
  price:       {label:"가격 (선택)",           placeholder:"예: 3만원, 무료"},
  pros:        {label:"장점 (선택)",           placeholder:"예: 가성비 좋음, 빠른 배송"},
  cons:        {label:"단점 (선택)",           placeholder:"예: 배터리 짧음, 무거움"},
  mainPoints:  {label:"핵심 내용 힌트 (선택)", placeholder:"예: 알고리즘 원리, 수익화 방법", textarea:true},
  hook:        {label:"훅 아이디어 (선택)",    placeholder:"예: 충격적인 사실, 반전"},
  angle:       {label:"각도/방향 (선택)",      placeholder:"예: 비교형, 경험담, 튜토리얼"},
  stance:      {label:"나의 입장 (선택)",      placeholder:"예: 찬성, 반대, 중립"},
  lesson:      {label:"교훈/메시지 (선택)",    placeholder:"예: 실패에서 배운 것"},
  points:      {label:"핵심 포인트 (선택)",    placeholder:"예: 3가지 핵심 팁"},
  mood:        {label:"분위기 (선택)",         placeholder:"예: 설레는, 여유로운, 그리운"},
  eventDate:   {label:"날짜/기간 (선택)",      placeholder:"예: 11월 30일까지"},
  steps:       {label:"단계 힌트 (선택)",      placeholder:"예: 계정생성 → 설정 → 포스팅", textarea:true},
  mainPoint:   {label:"핵심 주장 (선택)",      placeholder:"예: AI가 창작의 도구가 되어야 한다"},
  extra:       {label:"맞춤 요청 (선택)",      placeholder:"예: 20대 여성 타겟, 존댓말, 경험 기반으로 써줘 / 전문가 느낌으로 / 초보자도 이해하기 쉽게 등", textarea:true},
};

// ── 메인 ──────────────────────────────────────────────────────────────────

// ── 크레딧 소진 화면 ──────────────────────────────────────────────────────────

function PointsExhausted({ isDark, isGuest, title, onLogin }) {
  const bg = isDark ? "linear-gradient(160deg,#0f0c29,#1a1740)" : "#f4f4f8";
  const card = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e9ecef";
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"40px 24px", textAlign:"center", background: bg }}>
      <div style={{ maxWidth:420, width:"100%" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>💎</div>
        <div style={{ fontSize:22, fontWeight:900, color:text, marginBottom:8, letterSpacing:"-0.5px" }}>
          {isGuest ? "무료 이용권을 모두 사용했어요" : "포인트가 모두 소진됐어요"}
        </div>
        <div style={{ fontSize:14, color:muted, lineHeight:2, marginBottom:28 }}>
          {isGuest
            ? <><b style={{color:text}}>비회원 무료 5회</b>를 모두 사용하셨어요.<br/>회원가입 후 <b style={{color:"#a5b4fc"}}>10회 추가 무료</b> + 포인트 적립 혜택을 받으세요!</>
            : <><b style={{color:text}}>{title}</b> 생성에 포인트가 필요해요.<br/>포인트를 충전하거나 관리자에게 문의해주세요.</>
          }
        </div>
        {/* 혜택 카드 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {(isGuest ? [
            { icon:"🎁", title:"회원가입 혜택", desc:"가입 즉시 100P 지급" },
            { icon:"P", title:"게시글 적립", desc:"작성할 때마다 1P" },
            { icon:"🔄", title:"일일 로그인", desc:"매일 3P 적립" },
            { icon:"♾️", title:"AI 무제한", desc:"포인트 충전으로" },
          ] : [
            { icon:"💳", title:"포인트 충전" },
            { icon:"🔥", title:"Deluxe 플랜", desc:"₩19,900 / 9,500P" },
            { icon:"P", title:"무료 적립", desc:"게시글 작성 1P" },
            { icon:"💬", title:"관리자 문의", desc:"포인트 문의" },
          ]).map((item, i) => (
            <div key={i} style={{ background:card, border:`1px solid ${bdr}`, borderRadius:12, padding:"14px 12px" }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{item.icon}</div>
              <div style={{ fontSize:12, fontWeight:700, color:text, marginBottom:3 }}>{item.title}</div>
              <div style={{ fontSize:11, color:muted }}>{item.desc}</div>
            </div>
          ))}
        </div>
        {/* 버튼들 */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {isGuest ? (
            <button onClick={() => { if(onLogin) onLogin(); }}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#ec4899)", color:"#fff", fontSize:15, fontWeight:800,
                boxShadow:"0 8px 24px rgba(124,106,255,0.35)" }}>
              🚀 회원가입 / 로그인하기
            </button>
          ) : (
            <button onClick={() => window.location.hash = "#pricing"}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:800,
                boxShadow:"0 8px 24px rgba(99,102,241,0.35)" }}>
              💎 포인트 충전하기
            </button>
          )}
          <button onClick={() => { window.location.hash = "#contact"; }}
            style={{ width:"100%", padding:"12px", borderRadius:12,
              border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            💬 관리자에게 문의하기
          </button>
        </div>
      </div>
    </div>
  );
}


export { cleanBlogText, mdToHtml, renderMarkdown, inlineFormat, PLATFORMS, PointsExhausted, FIELD_LABELS, SPEECH_STYLES };
