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
  const userReplacedRef = React.useRef(false);

  // 부모에서 새 src가 오면 업데이트 (사용자가 직접 교체한 건 유지)
  React.useEffect(() => {
    if (src && !userReplacedRef.current) setImgSrc(src);
  }, [src]);

  const replaceWithFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    userReplacedRef.current = true;
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
      {/* 교체 메뉴 */}
      {showMenu && (
        <div style={{position:"absolute",top:8,right:8,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",padding:4,zIndex:10,minWidth:140}}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { fileRef.current?.click(); setShowMenu(false); }}
            style={{width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"#333",textAlign:"left",borderRadius:6,display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            📁 PC에서 교체
          </button>
          <button onClick={() => { const url = prompt("이미지 URL을 입력하세요:"); if(url) { userReplacedRef.current=true; setImgSrc(url); } setShowMenu(false); }}
            style={{width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"#333",textAlign:"left",borderRadius:6,display:"flex",alignItems:"center",gap:6}}
            onMouseEnter={e=>e.currentTarget.style.background="#f5f5f5"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            🔗 URL로 교체
          </button>
          <button onClick={() => { userReplacedRef.current=true; setImgSrc(`https://picsum.photos/seed/${Date.now()}/800/450`); setShowMenu(false); }}
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

/* ── 일반 텍스트 + 이미지 렌더러 ── */
// 6번째 인자: suggestedImages 배열 [{url, preview}, ...] 직접 전달
function renderMarkdown(text, isDark, textColor, mutedColor, accentColor, imagePool) {
  if (!text) return null;
  // imagePool: suggestedImages 배열 — {url, preview, keyword?} 형태
  const pool = Array.isArray(imagePool) ? imagePool : [];
  const imgUrls = pool.map(img => img?.url || img?.preview).filter(Boolean);
  // keyword → url 매핑 (fetchInlineImages가 채워주는 경우)
  const imgByKeyword = {};
  pool.forEach(img => { if (img?.keyword && (img.url || img.preview)) imgByKeyword[img.keyword.toLowerCase()] = img.url || img.preview; });

  // 마크다운 기호 제거 — [image:] 태그는 별도 처리할 것이므로 여기선 유지
  const cleaned = text
    .replace(/^#{1,6}\s*/gm, "")                    // # 헤딩 기호 제거
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")        // **볼드**, *이탤릭* 제거
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")           // __밑줄__ 제거
    .replace(/~~([^~]+)~~/g, "$1")                   // ~~취소선~~ 제거
    .replace(/`([^`]+)`/g, "$1")                     // `코드` 제거
    .replace(/^>\s+/gm, "")                          // > 인용 제거
    .replace(/^[-*]{3,}$/gm, "")                     // --- 구분선 제거
    .replace(/^[-*+]\s+/gm, "- ")                    // 리스트 기호 통일
    .replace(/!\[.*?\]\(.*?\)/g, "");                // ![image]() 제거

  const lines = cleaned.split("\n");
  const elements = [];
  let imgIdx = 0;

  // AI가 [image:] 태그를 만들었는지 체크 — 만들었으면 태그 위치 기반, 아니면 소제목 뒤
  const hasInlineTags = /\[(?:image|이미지):\s*[^\]]+\]/i.test(text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={i} style={{height:8}}/>);
      continue;
    }

    // [image: keyword] 태그 라인 감지 → 해당 위치에 이미지 삽입
    const imgTagMatch = trimmed.match(/^\[(?:image|이미지):\s*([^\]]+)\]$/i);
    if (imgTagMatch) {
      const kw = imgTagMatch[1].trim();
      // 1) 정확한 keyword 매칭 우선
      let src = imgByKeyword[kw.toLowerCase()];
      // 2) 없으면 풀에서 순서대로
      if (!src && imgIdx < imgUrls.length) { src = imgUrls[imgIdx]; imgIdx++; }
      if (src) {
        elements.push(<ReplaceableImage key={`img${i}`} src={src} desc={kw} isDark={isDark} mutedColor={mutedColor} fallbackSeed={encodeURIComponent(kw.slice(0,20))} />);
      }
      continue; // 태그 라인은 텍스트로 출력 안 함
    }

    // 소제목 감지: 짧은 줄(3~50자) + 앞에 빈 줄
    const prevEmpty = i === 0 || !lines[i-1]?.trim();
    const isHeading = trimmed.length >= 3 && trimmed.length <= 50 && prevEmpty && !trimmed.startsWith("-") && !trimmed.startsWith("#") && !/^\d+\./.test(trimmed);

    if (isHeading) {
      elements.push(<div key={`br${i}`} style={{height:20}}/>);
      elements.push(<p key={i} style={{margin:"0 0 8px",fontSize:16,fontWeight:800,color:textColor,lineHeight:1.5}}>{trimmed}</p>);
      // [image:] 태그가 글에 없으면 (예전 스타일) 소제목 뒤에 순서대로 삽입 (폴백)
      if (!hasInlineTags && imgUrls.length > 0 && imgIdx < imgUrls.length) {
        elements.push(<ReplaceableImage key={`img${i}`} src={imgUrls[imgIdx]} desc={trimmed} isDark={isDark} mutedColor={mutedColor} fallbackSeed={encodeURIComponent(trimmed.slice(0,20))} />);
        imgIdx++;
      }
    } else {
      elements.push(<p key={i} style={{margin:"4px 0",lineHeight:1.95,color:textColor}}>{trimmed}</p>);
    }
  }
  return elements;
}
function inlineFormat(text, accentColor) {
  return text; // 마크다운 포맷 제거 — 일반 텍스트 반환
}
function _inlineFormat_legacy(text, accentColor) {
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
      const imgRule = `\n\n[글 구조 필수 규칙]\n1. 큰 소제목 → [image: 영문 키워드] → 본문 설명 순서로 반복\n2. [image: keyword] 형태로 각 소제목마다 1개씩 이미지 삽입\n3. 키워드는 반드시 영문 2~3단어로, 사진 검색 시 정확히 해당 사물/장면이 나올 만큼 구체적으로 작성\n   좋은 예시: [image: glucose meter finger], [image: vegetable salad plate], [image: morning jogging park], [image: cafe latte art], [image: laptop home desk]\n   나쁜 예시: [image: health], [image: food], [image: nature], [image: technology]\n4. 해당 문단에서 설명하는 구체적 사물, 음식, 장소, 행동을 영어로 묘사할 것\n5. 소제목은 3~5개 정도`;
      const speechRule = speech ? `\n\n[말투/문체] ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const noEnding = `\n\n[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 사용 금지. 마지막 문단도 자연스럽게 본문처럼 이어서 끝낼 것`;
      const noSpecial = `\n\n[절대 금지] ##, **, ~~, *, -, 이모티콘, 이모지, 특수기호(★●■▶♥☆→), 마크다운 문법 일체 사용 금지. 순수 한글 문장만 작성. 소제목은 그냥 굵은 텍스트처럼 별도 줄에 작성.\n\n[필수 규칙]\n1. 이미지 삽입용 [image: english keyword] 태그 사용: 각 소제목 바로 아래에 [image: 구체적 영어 키워드 2~3단어] 형식으로 1줄씩 삽입. 예) [image: puppy playing park]\n2. 글 마지막에는 반드시 # 기호로 시작하는 해시태그 10개를 작성. 예) #강아지키우기 #반려견관리 #강아지건강 (띄어쓰기로 구분, 한 줄 또는 두 줄로)\n3. 본문 중간에는 # 기호를 사용하지 마세요. 해시태그는 오직 글 맨 마지막에만.`;
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
      const imgRule = `\n\n[이미지 필수] 소제목마다 [image: 영문 2~3단어] 1개. 해당 문단의 구체적 사물/장면을 영어로 (예: laptop typing hands, korean street food, morning coffee desk). 추상적 단어(nature, life, beauty) 금지`;
      const tail = sp + noEnd + noSp;
      if(sub==="info")    return `티스토리 SEO 최적화 정보성 글 (${w}, ${t})\n키워드: ${f.keyword} / 대상: ${f.target||"일반"}\n${f.extra||""}${imgRule}\n\n- 소제목은 일반 텍스트로 (마크다운 ## 사용 금지)\n- 키워드 제목·소제목에 자연스럽게 포함\n- 결론에 CTA 포함, 관련 키워드 녹임${tail}`;
      if(sub==="review")  return `티스토리 제품·서비스 리뷰 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}${imgRule}\n\n- 상세 스펙·실사용 경험·객관적 평가\n- 구매 가이드 제공${tail}`;
      if(sub==="howto")   return `티스토리 How-to 가이드 (${w}, ${t})\n주제: ${f.keyword} / 단계: ${f.steps||""}\n${f.extra||""}${imgRule}\n\n- 번호 매긴 단계별 설명 (숫자 목록은 허용)\n- 각 단계 팁·주의사항, FAQ 포함${tail}`;
      if(sub==="opinion") return `티스토리 칼럼/의견 (${w}, ${t})\n주제: ${f.keyword} / 핵심 주장: ${f.mainPoint||""}\n${f.extra||""}${imgRule}\n\n- 주장→근거→반론→결론 구조\n- 데이터·사례 언급, 독자 공감 유도${tail}`;
      if(sub==="column")  return `티스토리 전문 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}${imgRule}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (SEO 키워드 포함 제목)\n부제목: (핵심 한 줄 요약)\n\n- 주장→근거→반론→결론\n- 데이터·사례·통계 인용${tail}`;
      if(sub==="article") return `티스토리 기사 방식 글 (${w}, 보도 형식)\n주제: ${f.keyword}\n${f.extra||""}${imgRule}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 역피라미드 구조\n- 5W1H, 객관적 사실 기반${tail}`;
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
      const imgRule = wc !== "short" ? `\n\n[이미지] 문단마다 [image: 영문 2~3단어] 1개. 해당 내용의 구체적 사물/장면 (예: fresh fruit basket, cozy reading corner). 추상적 단어 금지` : "";
      const tail = sp + noEnd + noSp;
      if(sub==="info")     return `네이버 카페 정보 게시글 (${w}, ${t})\n주제: ${f.keyword}\n대상: ${f.target||"카페 회원"}\n${f.extra||""}${imgRule}\n\n- 핵심 정보를 친근하게 전달\n- 소제목 없이 자연스러운 문단 구성${tail}`;
      if(sub==="review")   return `네이버 카페 후기 게시글 (${w}, ${t})\n대상: ${f.keyword} / 제품명: ${f.productName||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 구매/방문 동기부터 솔직 후기까지\n- 장단점 균형 있게\n- 추천 대상 언급${tail}`;
      if(sub==="question") return `네이버 카페 질문 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 상황 설명 후 궁금한 점 명확히\n- 카페 회원들에게 도움 요청하는 자연스러운 글${tail}`;
      if(sub==="free")     return `네이버 카페 자유 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 가볍고 친근한 일상 공유\n- 카페 분위기에 맞는 짧고 자연스러운 글${tail}`;
      if(sub==="column")  return `네이버 카페 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (카페에 적합한 전문 제목)\n부제목: (핵심 한 줄)\n\n- 주장→근거→결론 구조\n- 카페 회원 눈높이에 맞춘 전문 글${tail}\n글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="article") return `네이버 카페 기사 스타일 글 (${w}, 객관적 정리체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 팩트 기반 정리, 수치/통계 활용\n- 카페 회원이 이해하기 쉬운 언어${tail}\n글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      return "";
    },
  },
  // ── X (트위터) ──
  blog_x: {
    title: "X (트위터) 게시물 작성",
    accentColor: "#000000",
    subtypes: [
      {id:"opinion",  icon:"", label:"의견·인사이트", desc:"생각·관점 공유"},
      {id:"story",    icon:"", label:"이야기·경험",   desc:"경험담 스토리"},
      {id:"tip",      icon:"", label:"꿀팁·정보",     desc:"유용한 팁 공유"},
      {id:"question", icon:"", label:"질문·토론",     desc:"커뮤니티 참여 유도"},
      {id:"thread",   icon:"", label:"스레드 (연작)", desc:"연결 트윗 시리즈"},
    ],
    tones: [{id:"casual",label:"일상 대화체"},{id:"witty",label:"위트있는"},{id:"professional",label:"전문적"},{id:"provocative",label:"도발적"}],
    wordCounts: [{id:"single",label:"한 줄",desc:"1~2문장"},{id:"short",label:"짧게",desc:"3~5문장"},{id:"thread",label:"스레드",desc:"5~10개 트윗"}],
    fields: { opinion:["keyword","stance","extra"], story:["keyword","extra"], tip:["keyword","extra"], question:["keyword","extra"], thread:["keyword","mainPoint","extra"] },
    examples: { opinion:["AI가 바꾸는 일자리 지형","SNS 마케팅의 진짜 핵심"], story:["1인 창업 첫 달 매출 공개","퇴사 후 프리랜서 현실"], tip:["생산성 올리는 3가지 습관","무료 AI 툴 추천"], question:["여러분은 어떤 SNS가 주력인가요?","재택 vs 출근 어느 쪽?"], thread:["AI 시대 생존 전략 총정리","콘텐츠 마케팅 A to Z"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={casual:"친근한 대화체",witty:"위트있고 재치있는",professional:"전문적이고 신뢰감 있는",provocative:"강렬하고 도발적인"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const cnt = wc==="thread" ? "X 스레드 형식 (1/ 2/ ... 번호 붙여서 5~10개 트윗, 각 280자 이내)" : wc==="single" ? "1~2문장 (280자 이내)" : "3~5문장 (280자 이내)";
      return `X (트위터) 게시물 (${t})\n유형: ${sub}\n주제: ${f.keyword}\n${f.stance||f.mainPoint?`핵심: ${f.stance||f.mainPoint}`:""}\n${f.extra||""}\n\n[필수]\n- ${cnt}\n- 마크다운·이모지 금지\n- 해시태그 3~5개 포함${sp}`;
    },
  },

  // ── 페이스북 ──
  blog_facebook: {
    title: "페이스북 게시물 작성",
    accentColor: "#1877F2",
    subtypes: [
      {id:"daily",   icon:"", label:"일상 공유",     desc:"일상·감성 포스트"},
      {id:"info",    icon:"", label:"정보·뉴스",     desc:"유용한 정보 공유"},
      {id:"product", icon:"", label:"제품·비즈니스", desc:"제품·서비스 홍보"},
      {id:"event",   icon:"", label:"이벤트·공지",   desc:"행사·모임 안내"},
    ],
    tones: [{id:"friendly",label:"친근한"},{id:"professional",label:"전문적"},{id:"emotional",label:"감성적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"300~500자"},{id:"long",label:"길게",desc:"600자 이상"}],
    fields: { daily:["keyword","extra"], info:["keyword","extra"], product:["keyword","productName","extra"], event:["keyword","eventDate","extra"] },
    examples: { daily:["주말 나들이 후기","새해 다짐 공유"], info:["재테크 초보 가이드","건강 관리 팁"], product:["신규 서비스 런칭 안내","할인 이벤트 소식"], event:["오프라인 모임 공지","웨비나 안내"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"100~200자",medium:"300~500자",long:"600자 이상"}[wc];
      const t={friendly:"친근하고 자연스러운",professional:"전문적이고 신뢰감 있는",emotional:"감성적이고 공감 가는"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      return `페이스북 게시물 (${w}, ${t})\n유형: ${sub}\n주제: ${f.keyword}\n${f.productName?`제품: ${f.productName}`:""}\n${f.extra||""}\n\n[필수] 이모지 금지, 자연스러운 문장${sp}`;
    },
  },

  // ── 링크드인 ──
  blog_linkedin: {
    title: "링크드인 게시물 작성",
    accentColor: "#0A66C2",
    subtypes: [
      {id:"insight",  icon:"", label:"인사이트·의견", desc:"업계 전문 인사이트"},
      {id:"career",   icon:"", label:"커리어·경험",   desc:"커리어 스토리"},
      {id:"article",  icon:"", label:"아티클",        desc:"심층 전문 글"},
      {id:"announce", icon:"", label:"소식·공지",     desc:"회사·프로젝트 소식"},
    ],
    tones: [{id:"professional",label:"전문적"},{id:"inspiring",label:"영감을 주는"},{id:"storytelling",label:"스토리텔링"}],
    wordCounts: [{id:"short",label:"짧게",desc:"200~400자"},{id:"medium",label:"보통",desc:"500~800자"},{id:"long",label:"길게",desc:"1,000자 이상"}],
    fields: { insight:["keyword","stance","extra"], career:["keyword","extra"], article:["keyword","mainPoint","extra"], announce:["keyword","extra"] },
    examples: { insight:["AI가 HR에 미치는 영향","스타트업 성공의 핵심 요소"], career:["이직 후 6개월 회고","주니어에서 시니어로 성장기"], article:["SaaS 시장 2026 전망","리더십에 대한 새로운 관점"], announce:["신규 프로젝트 런칭","팀 채용 공고"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"200~400자",medium:"500~800자",long:"1,000자 이상"}[wc];
      const t={professional:"전문적이고 신뢰감 있는",inspiring:"영감을 주는 동기부여",storytelling:"스토리텔링 방식의"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      return `링크드인 게시물 (${w}, ${t})\n유형: ${sub}\n주제: ${f.keyword}\n${f.stance||f.mainPoint?`핵심: ${f.stance||f.mainPoint}`:""}\n${f.extra||""}\n\n[필수]\n- 전문적이고 비즈니스에 적합한 톤\n- 이모지 금지\n- 해시태그 5~8개 포함${sp}`;
    },
  },

  // ── 틱톡 ──
  blog_tiktok: {
    title: "틱톡 대본 & 캡션 생성",
    accentColor: "#010101",
    subtypes: [
      {id:"script", icon:"", label:"영상 대본",  desc:"15~60초 숏폼 대본"},
      {id:"caption",icon:"", label:"캡션",       desc:"영상 설명 캡션"},
      {id:"trend",  icon:"", label:"트렌드 참여", desc:"챌린지·밈 활용"},
    ],
    tones: [{id:"energetic",label:"에너지틱"},{id:"casual",label:"캐주얼"},{id:"educational",label:"교육적"},{id:"funny",label:"웃긴"}],
    wordCounts: [{id:"15s",label:"15초",desc:"~80자"},{id:"30s",label:"30초",desc:"~150자"},{id:"60s",label:"60초",desc:"~300자"}],
    fields: { script:["keyword","hook","extra"], caption:["keyword","extra"], trend:["keyword","extra"] },
    examples: { script:["3초 안에 시선 잡는 법","이것 모르면 손해 시리즈"], caption:["일상 브이로그 캡션","먹방 영상 설명"], trend:["챌린지 참여 대본","밈 활용 콘텐츠"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={energetic:"에너지틱하고 빠른",casual:"캐주얼하고 자연스러운",educational:"교육적이고 핵심 전달",funny:"웃기고 가벼운"}[tone];
      const dur={"15s":"15초(~80자)","30s":"30초(~150자)","60s":"60초(~300자)"}[wc];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      return `틱톡 ${sub==="script"?"영상 대본":sub==="caption"?"캡션":"트렌드 콘텐츠"} (${dur}, ${t})\n주제: ${f.keyword}\n${f.hook?`훅: ${f.hook}`:""}\n${f.extra||""}\n\n[필수]\n- 첫 1~3초 강력한 훅\n- 짧고 임팩트 있는 문장\n- 이모지 금지\n- 해시태그 5~10개${sp}`;
    },
  },

  // ── 브런치 ──
  blog_brunch: {
    title: "브런치 에세이 작성",
    accentColor: "#333333",
    subtypes: [
      {id:"essay",   icon:"", label:"에세이",     desc:"감성 에세이"},
      {id:"column",  icon:"", label:"칼럼",       desc:"전문 칼럼", autoTitle:true},
      {id:"review",  icon:"", label:"리뷰",       desc:"도서·공간·작품 리뷰"},
      {id:"story",   icon:"", label:"경험 스토리", desc:"개인 경험담"},
    ],
    tones: [{id:"literary",label:"문학적"},{id:"reflective",label:"성찰적"},{id:"casual",label:"편안한"}],
    wordCounts: [{id:"short",label:"보통",desc:"1,500~2,500자"},{id:"medium",label:"길게",desc:"3,000~4,000자"},{id:"long",label:"심층",desc:"5,000자 이상"}],
    fields: { essay:["keyword","mood","extra"], column:["keyword","mainPoint","extra"], review:["keyword","extra"], story:["keyword","extra"] },
    examples: { essay:["비 오는 날의 카페","나만의 속도로 살기"], column:["콘텐츠 크리에이터의 번아웃","읽기의 가치와 의미"], review:["올해 읽은 최고의 책","혼자 떠난 제주 한 달 살기"], story:["퇴사 후 글쓰기를 시작한 이유","30대에 배운 것들"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"1,500~2,500자",medium:"3,000~4,000자",long:"5,000자 이상"}[wc];
      const t={literary:"문학적이고 서정적인",reflective:"성찰적이고 깊이 있는",casual:"편안하고 자연스러운"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const imgRule = `\n\n[이미지 필수] 소제목마다 [image: 영문 2~3단어] 1개. 해당 문단의 구체적 사물/장면을 영어로 (예: coffee latte art, sunset beach walk, fresh vegetable basket). 추상적 단어(nature, beauty, life) 절대 금지`;
      return `브런치 ${sub} (${w}, ${t})\n주제: ${f.keyword}\n${f.mood?`분위기: ${f.mood}`:""}\n${f.mainPoint?`핵심: ${f.mainPoint}`:""}\n${f.extra||""}\n\n[필수] 글 첫줄에 추천 제목\n- 브런치 특유의 감성적이고 깊이 있는 문체\n- 이모지·마크다운 금지${imgRule}${sp}`;
    },
  },

  // ── 핀터레스트 ──
  blog_pinterest: {
    title: "핀터레스트 핀 설명 작성",
    accentColor: "#E60023",
    subtypes: [{id:"pin",icon:"",label:"핀 설명",desc:"핀 이미지 설명 + SEO"}],
    tones: [{id:"inspiring",label:"영감을 주는"},{id:"practical",label:"실용적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"50~100자"},{id:"medium",label:"보통",desc:"100~200자"}],
    fields: { pin:["keyword","extra"] },
    examples: { pin:["미니멀 인테리어 아이디어","가을 패션 코디 추천","건강 레시피 모음"] },
    buildPrompt(sub, f, tone, wc, speech) {
      return `핀터레스트 핀 설명 (SEO 최적화)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 100~200자 이내, 검색 키워드 자연스럽게 포함, 이모지 금지, 해시태그 5개`;
    },
  },

  // ── 레딧 ──
  blog_reddit: {
    title: "레딧 게시물 작성",
    accentColor: "#FF4500",
    subtypes: [{id:"post",icon:"",label:"게시물",desc:"서브레딧 게시글"},{id:"comment",icon:"",label:"댓글",desc:"토론 참여 댓글"}],
    tones: [{id:"casual",label:"캐주얼"},{id:"informative",label:"정보 전달"},{id:"humorous",label:"유머러스"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~300자"},{id:"medium",label:"보통",desc:"300~600자"},{id:"long",label:"길게",desc:"600자 이상"}],
    fields: { post:["keyword","extra"], comment:["keyword","extra"] },
    examples: { post:["AI 활용 생산성 팁 공유","한국 여행 추천 코스"], comment:["기술 토론 참여","경험 기반 조언"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={casual:"캐주얼하고 자연스러운",informative:"정보 전달 위주의",humorous:"유머러스하고 가벼운"}[tone];
      return `레딧 ${sub==="post"?"게시물":"댓글"} (${t}, 영어)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 영어로 작성, 레딧 커뮤니티 문화에 맞게, 마크다운 허용`;
    },
  },

  // ── 카카오스토리 ──
  blog_kakaostory: {
    title: "카카오스토리 글쓰기",
    accentColor: "#FFCD00",
    subtypes: [{id:"daily",icon:"",label:"일상",desc:"일상 공유"},{id:"info",icon:"",label:"정보",desc:"유용한 정보"}],
    tones: [{id:"friendly",label:"친근한"},{id:"emotional",label:"감성적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"200~400자"}],
    fields: { daily:["keyword","extra"], info:["keyword","extra"] },
    examples: { daily:["오늘의 소소한 행복","주말 나들이"], info:["건강 관리 팁","절약 노하우"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={friendly:"친근하고 자연스러운",emotional:"감성적이고 따뜻한"}[tone];
      return `카카오스토리 게시물 (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 짧고 친근한 문체, 이모지 금지`;
    },
  },

  // ── 네이버 밴드 ──
  blog_band: {
    title: "네이버 밴드 글쓰기",
    accentColor: "#06C755",
    subtypes: [{id:"notice",icon:"",label:"공지",desc:"모임 공지"},{id:"free",icon:"",label:"자유글",desc:"일상·소통"},{id:"info",icon:"",label:"정보 공유",desc:"유용한 정보"}],
    tones: [{id:"friendly",label:"친근한"},{id:"formal",label:"격식있는"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~300자"},{id:"medium",label:"보통",desc:"300~600자"}],
    fields: { notice:["keyword","extra"], free:["keyword","extra"], info:["keyword","extra"] },
    examples: { notice:["이번 주 모임 일정 안내","회비 납부 공지"], free:["주말 후기 공유","추천 맛집 리스트"], info:["운동 초보 가이드","건강 식단 팁"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={friendly:"친근하고 자연스러운",formal:"격식 있고 정돈된"}[tone];
      return `네이버 밴드 ${sub==="notice"?"공지":"게시글"} (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, 밴드 그룹에 적합한 문체`;
    },
  },

  // ── Bluesky ──
  blog_bluesky: {
    title: "Bluesky 게시물 작성",
    accentColor: "#0085FF",
    subtypes: [{id:"post",icon:"",label:"게시물",desc:"짧은 텍스트 포스트"},{id:"thread",icon:"",label:"스레드",desc:"연결 포스트"}],
    tones: [{id:"casual",label:"캐주얼"},{id:"thoughtful",label:"사려깊은"},{id:"witty",label:"위트있는"}],
    wordCounts: [{id:"single",label:"짧게",desc:"1~3문장"},{id:"medium",label:"보통",desc:"200~300자"}],
    fields: { post:["keyword","extra"], thread:["keyword","extra"] },
    examples: { post:["오늘의 인사이트","테크 뉴스 한 줄 코멘트"], thread:["AI 윤리에 대한 생각","오픈소스의 미래"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={casual:"캐주얼한",thoughtful:"사려깊은",witty:"위트있는"}[tone];
      return `Bluesky 게시물 (${t}, 300자 이내)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, 자연스러운 대화체`;
    },
  },

  // ── Mastodon ──
  blog_mastodon: {
    title: "Mastodon 게시물 작성",
    accentColor: "#6364FF",
    subtypes: [{id:"post",icon:"",label:"게시물",desc:"툿 작성"},{id:"thread",icon:"",label:"스레드",desc:"연결 툿"}],
    tones: [{id:"casual",label:"캐주얼"},{id:"technical",label:"기술적"},{id:"thoughtful",label:"사려깊은"}],
    wordCounts: [{id:"short",label:"짧게",desc:"200자 이내"},{id:"medium",label:"보통",desc:"300~500자"}],
    fields: { post:["keyword","extra"], thread:["keyword","extra"] },
    examples: { post:["오픈소스 프로젝트 소개","프라이버시 관련 생각"], thread:["탈중앙화 SNS의 의미","기술 트렌드 분석"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={casual:"캐주얼한",technical:"기술적이고 전문적인",thoughtful:"사려깊은"}[tone];
      return `Mastodon 게시물 (${t}, 500자 이내)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, 해시태그 3~5개`;
    },
  },

  // ── 위버스 (Weverse) ──
  blog_weverse: {
    title: "위버스 게시물 작성",
    accentColor: "#B8EB50",
    subtypes: [{id:"fan",icon:"",label:"팬 게시물",desc:"팬 커뮤니티 글"},{id:"review",icon:"",label:"콘텐츠 후기",desc:"공연·앨범 후기"}],
    tones: [{id:"excited",label:"설레는"},{id:"emotional",label:"감성적"},{id:"casual",label:"일상적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"200~500자"}],
    fields: { fan:["keyword","extra"], review:["keyword","extra"] },
    examples: { fan:["컴백 축하 메시지","오늘 콘서트 후기"], review:["새 앨범 감상 리뷰","팬미팅 현장 후기"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={excited:"설레고 열정적인",emotional:"감성적이고 진심 어린",casual:"가볍고 일상적인"}[tone];
      return `위버스 ${sub==="fan"?"팬 게시물":"콘텐츠 후기"} (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, 팬 커뮤니티에 적합한 따뜻한 문체`;
    },
  },

  // ── 네이버 포스트 ──
  blog_naverpost: {
    title: "네이버 포스트 글쓰기",
    accentColor: "#03C75A",
    subtypes: [
      {id:"info",   icon:"", label:"정보성 글",   desc:"카드뉴스형 정보"},
      {id:"review", icon:"", label:"후기·리뷰",   desc:"제품·장소 후기"},
      {id:"column", icon:"", label:"칼럼",        desc:"전문 칼럼", autoTitle:true},
    ],
    tones: [{id:"professional",label:"전문적"},{id:"friendly",label:"친근한"}],
    wordCounts: [{id:"short",label:"보통",desc:"800~1,200자"},{id:"medium",label:"길게",desc:"1,500~2,500자"}],
    fields: { info:["keyword","target","extra"], review:["keyword","productName","extra"], column:["keyword","mainPoint","extra"] },
    examples: { info:["2026년 트렌드 총정리","초보자를 위한 재테크 가이드"], review:["신상 카페 방문기","신제품 솔직 후기"], column:["콘텐츠 마케팅 전략","브랜딩의 핵심 요소"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"800~1,200자",medium:"1,500~2,500자"}[wc];
      const t={professional:"전문적이고 깔끔한",friendly:"친근하고 읽기 쉬운"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const imgRule = `\n\n[이미지 필수] 소제목마다 [image: 영문 2~3단어] 1개. 해당 문단의 구체적 사물/장면을 영어로 (예: laptop coding screen, yoga mat stretching, korean bbq grill). 추상적 단어 금지`;
      return `네이버 포스트 ${sub} (${w}, ${t})\n주제: ${f.keyword}\n${f.target?`대상: ${f.target}`:""}\n${f.mainPoint?`핵심: ${f.mainPoint}`:""}\n${f.extra||""}\n\n[필수] 이모지 금지, 카드뉴스형 구조${imgRule}${sp}`;
    },
  },

  // ── 텔레그램 ──
  blog_telegram: {
    title: "텔레그램 채널 글쓰기",
    accentColor: "#26A5E4",
    subtypes: [{id:"news",icon:"",label:"뉴스·속보",desc:"빠른 정보 전달"},{id:"tip",icon:"",label:"꿀팁·정보",desc:"유용한 팁"},{id:"opinion",icon:"",label:"의견",desc:"분석·코멘트"}],
    tones: [{id:"concise",label:"간결한"},{id:"analytical",label:"분석적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"200~500자"}],
    fields: { news:["keyword","extra"], tip:["keyword","extra"], opinion:["keyword","extra"] },
    examples: { news:["AI 업계 주요 뉴스","시장 동향 속보"], tip:["생산성 도구 추천","투자 팁"], opinion:["최신 이슈 분석","트렌드 코멘트"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={concise:"간결하고 핵심 전달",analytical:"분석적이고 깊이 있는"}[tone];
      return `텔레그램 채널 게시물 (${t})\n유형: ${sub}\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 짧고 명확하게, 이모지 금지, 링크 형태 안내 포함`;
    },
  },

  // ── 미디엄 (Medium) ──
  blog_medium: {
    title: "미디엄 아티클 작성",
    accentColor: "#000000",
    subtypes: [
      {id:"article", icon:"", label:"아티클",     desc:"심층 영문 아티클"},
      {id:"howto",   icon:"", label:"How-to",    desc:"가이드·튜토리얼"},
      {id:"opinion", icon:"", label:"오피니언",   desc:"의견·에세이"},
    ],
    tones: [{id:"professional",label:"전문적"},{id:"conversational",label:"대화체"},{id:"analytical",label:"분석적"}],
    wordCounts: [{id:"short",label:"보통",desc:"1,000~2,000자"},{id:"medium",label:"길게",desc:"2,500~4,000자"},{id:"long",label:"심층",desc:"5,000자 이상"}],
    fields: { article:["keyword","mainPoint","extra"], howto:["keyword","extra"], opinion:["keyword","stance","extra"] },
    examples: { article:["The Future of AI in Marketing","Building a Personal Brand in 2026"], howto:["How to Start a Newsletter","Guide to Remote Work Productivity"], opinion:["Why Content is Still King","The Problem with Social Media Metrics"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"1,000~2,000 words",medium:"2,500~4,000 words",long:"5,000+ words"}[wc];
      const t={professional:"professional and authoritative",conversational:"conversational and engaging",analytical:"analytical and data-driven"}[tone];
      return `Medium article in English (${w}, ${t})\nTopic: ${f.keyword}\n${f.mainPoint?`Key point: ${f.mainPoint}`:""}\n${f.stance?`Stance: ${f.stance}`:""}\n${f.extra||""}\n\n[REQUIRED]\n- Include a compelling title and subtitle\n- Use subheadings for structure\n- No emojis\n- Include [image: keyword] tags for each section`;
    },
  },

  // ── Substack ──
  blog_substack: {
    title: "Substack 뉴스레터 작성",
    accentColor: "#FF6719",
    subtypes: [{id:"newsletter",icon:"",label:"뉴스레터",desc:"구독자 뉴스레터"},{id:"essay",icon:"",label:"에세이",desc:"개인 에세이"}],
    tones: [{id:"personal",label:"개인적"},{id:"analytical",label:"분석적"},{id:"conversational",label:"대화체"}],
    wordCounts: [{id:"short",label:"보통",desc:"1,000~2,000자"},{id:"medium",label:"길게",desc:"2,500~4,000자"}],
    fields: { newsletter:["keyword","mainPoint","extra"], essay:["keyword","extra"] },
    examples: { newsletter:["이번 주 AI 뉴스 정리","마케팅 인사이트 위클리"], essay:["창작과 AI의 경계","글쓰기의 의미"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={personal:"개인적이고 진솔한",analytical:"분석적이고 깊이 있는",conversational:"대화하듯 편안한"}[tone];
      return `Substack 뉴스레터 (${t})\n주제: ${f.keyword}\n${f.mainPoint?`핵심: ${f.mainPoint}`:""}\n${f.extra||""}\n\n[필수] 구독자에게 보내는 편지 형식, 이모지 금지`;
    },
  },

  // ── 홈페이지/웹사이트 ──
  blog_homepage: {
    title: "홈페이지/웹사이트 글쓰기",
    accentColor: "#4A90D9",
    subtypes: [
      {id:"about",   icon:"", label:"회사/서비스 소개", desc:"About 페이지"},
      {id:"landing", icon:"", label:"랜딩페이지",      desc:"전환 유도 페이지"},
      {id:"blog",    icon:"", label:"블로그/매거진",    desc:"웹사이트 블로그 글"},
      {id:"faq",     icon:"", label:"FAQ",             desc:"자주 묻는 질문"},
      {id:"product", icon:"", label:"제품/서비스 설명", desc:"상세 설명 카피"},
    ],
    tones: [{id:"professional",label:"전문적"},{id:"friendly",label:"친근한"},{id:"luxurious",label:"프리미엄"}],
    wordCounts: [{id:"short",label:"보통",desc:"500~1,000자"},{id:"medium",label:"길게",desc:"1,500~2,500자"},{id:"long",label:"심층",desc:"3,000자 이상"}],
    fields: { about:["keyword","extra"], landing:["keyword","productName","extra"], blog:["keyword","target","extra"], faq:["keyword","extra"], product:["keyword","productName","price","extra"] },
    examples: { about:["스타트업 회사 소개 페이지","디자인 에이전시 소개"], landing:["SaaS 서비스 랜딩페이지","온라인 강의 판매 페이지"], blog:["SEO 최적화 가이드","업계 트렌드 분석"], faq:["서비스 이용 FAQ","배송/결제 FAQ"], product:["AI 솔루션 상세 설명","구독 서비스 요금 안내"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const w={short:"500~1,000자",medium:"1,500~2,500자",long:"3,000자 이상"}[wc];
      const t={professional:"전문적이고 신뢰감 있는",friendly:"친근하고 읽기 쉬운",luxurious:"프리미엄하고 세련된"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      const imgRule = `\n\n[이미지 필수] 섹션마다 [image: 영문 2~3단어] 1개. 해당 섹션의 구체적 사물/장면을 영어로. 추상적 단어 금지`;
      if(sub==="about")   return `홈페이지 회사/서비스 소개 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 비전/미션, 핵심 가치, 팀 소개 구조\n- 신뢰감 있는 웹 카피라이팅${imgRule}${sp}`;
      if(sub==="landing") return `랜딩페이지 카피 (${w}, ${t})\n서비스: ${f.productName||f.keyword}\n${f.extra||""}\n\n- 헤드라인 → 문제 제기 → 해결책 → 혜택 → CTA 구조\n- 전환율 높은 카피라이팅${imgRule}${sp}`;
      if(sub==="blog")    return `웹사이트 블로그 글 (${w}, ${t})\n주제: ${f.keyword}\n대상: ${f.target||"일반 방문자"}\n${f.extra||""}\n\n- SEO 최적화 구조\n- 소제목 활용한 체계적 구성${imgRule}${sp}`;
      if(sub==="faq")     return `FAQ 페이지 (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- Q&A 형식 10~15개\n- 명확하고 친절한 답변${sp}`;
      if(sub==="product") return `제품/서비스 설명 카피 (${w}, ${t})\n제품: ${f.productName||f.keyword}\n가격: ${f.price||""}\n${f.extra||""}\n\n- 특장점, 사용법, 가격, CTA 구조${imgRule}${sp}`;
      return "";
    },
  },

  // ── 당근마켓 ──
  blog_daangn: {
    title: "당근마켓 게시글 작성",
    accentColor: "#FF6F0F",
    subtypes: [
      {id:"sell",     icon:"", label:"중고 판매글",   desc:"물건 판매 게시글"},
      {id:"local",    icon:"", label:"동네 홍보",     desc:"가게/서비스 홍보"},
      {id:"together", icon:"", label:"같이해요",      desc:"동네 모임/활동"},
      {id:"life",     icon:"", label:"동네생활",      desc:"동네 소식/질문"},
    ],
    tones: [{id:"friendly",label:"친근한"},{id:"concise",label:"간결한"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"200~400자"}],
    fields: { sell:["keyword","productName","price","extra"], local:["keyword","extra"], together:["keyword","extra"], life:["keyword","extra"] },
    examples: { sell:["아이패드 프로 판매합니다","유아용 자전거 거의 새것"], local:["동네 카페 오픈 안내","네일샵 할인 이벤트"], together:["주말 배드민턴 같이 하실 분","독서 모임 멤버 모집"], life:["이 동네 맛집 추천해주세요","분리수거 요일 알려주세요"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={friendly:"친근하고 동네 이웃 같은",concise:"간결하고 핵심만"}[tone];
      const sp = speech ? `\n- 말투: ${(SPEECH_STYLES.find(s=>s.id===speech)||{}).prompt||""}` : "";
      if(sub==="sell") return `당근마켓 중고 판매글 (${t})\n물건: ${f.productName||f.keyword}\n가격: ${f.price||"가격 제안"}\n${f.extra||""}\n\n[필수]\n- 상품 상태, 구매 시기, 사용감 명시\n- 거래 방식(직거래/택배) 안내\n- 이모지 금지, 자연스러운 문체${sp}`;
      if(sub==="local") return `당근마켓 동네 홍보글 (${t})\n업체/서비스: ${f.keyword}\n${f.extra||""}\n\n[필수] 위치, 영업시간, 혜택 포함. 이모지 금지${sp}`;
      if(sub==="together") return `당근마켓 같이해요 게시글 (${t})\n활동: ${f.keyword}\n${f.extra||""}\n\n[필수] 일시, 장소, 참여 방법 포함. 이모지 금지${sp}`;
      if(sub==="life") return `당근마켓 동네생활 게시글 (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 동네 이웃에게 묻는 자연스러운 문체. 이모지 금지${sp}`;
      return "";
    },
  },

  // ── 번장 ──
  blog_bunjang: {
    title: "번개장터 판매글 작성",
    accentColor: "#D4213D",
    subtypes: [{id:"sell",icon:"",label:"판매글",desc:"중고 물건 판매"}],
    tones: [{id:"concise",label:"간결한"},{id:"friendly",label:"친근한"}],
    wordCounts: [{id:"short",label:"짧게",desc:"100~200자"},{id:"medium",label:"보통",desc:"200~400자"}],
    fields: { sell:["keyword","productName","price","extra"] },
    examples: { sell:["나이키 에어맥스 270 판매","갤럭시 S24 울트라 풀박스"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={concise:"간결하고 핵심만",friendly:"친근하고 정직한"}[tone];
      return `번개장터 판매글 (${t})\n물건: ${f.productName||f.keyword}\n가격: ${f.price||""}\n${f.extra||""}\n\n[필수]\n- 상품명, 상태(S/A/B급), 구매시기, 가격, 거래방법\n- 이모지 금지, 간결하고 신뢰감 있게`;
    },
  },

  // ── 쿠팡 상품설명 ──
  blog_coupang: {
    title: "쿠팡 상품설명 작성",
    accentColor: "#E52528",
    subtypes: [
      {id:"title",icon:"",label:"상품명 최적화",desc:"검색 노출 상품명"},
      {id:"desc",icon:"",label:"상품 상세설명",desc:"구매 전환 상세 카피"},
      {id:"bullet",icon:"",label:"주요 특징",desc:"불릿 포인트 특징"},
    ],
    tones: [{id:"persuasive",label:"설득력 있는"},{id:"informative",label:"정보 전달"}],
    wordCounts: [{id:"short",label:"보통",desc:"300~600자"},{id:"medium",label:"길게",desc:"600~1,200자"}],
    fields: { title:["keyword","productName","extra"], desc:["keyword","productName","price","pros","extra"], bullet:["keyword","productName","extra"] },
    examples: { title:["무선 청소기 상품명 최적화","유기농 간식 검색 노출 제목"], desc:["공기청정기 상세 설명","보조배터리 상품 카피"], bullet:["운동화 핵심 특징 5가지","스킨케어 세트 셀링포인트"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={persuasive:"설득력 있고 구매 전환 유도",informative:"정보 전달 위주의 명확한"}[tone];
      if(sub==="title") return `쿠팡 상품명 최적화 (SEO)\n제품: ${f.productName||f.keyword}\n${f.extra||""}\n\n[필수] 검색 키워드 포함, 60자 이내, 핵심 스펙+혜택, 5가지 변형 제안`;
      if(sub==="desc") return `쿠팡 상품 상세설명 (${t})\n제품: ${f.productName||f.keyword}\n가격: ${f.price||""}\n장점: ${f.pros||""}\n${f.extra||""}\n\n[필수]\n- 문제 → 해결 → 특장점 → 사용법 → 구매 유도 구조\n- 이모지 금지`;
      if(sub==="bullet") return `쿠팡 상품 주요 특징 불릿 (${t})\n제품: ${f.productName||f.keyword}\n${f.extra||""}\n\n[필수] 5~7개 핵심 특징, 각 1~2줄, 혜택 중심 서술`;
      return "";
    },
  },

  // ── 스마트스토어 ──
  blog_smartstore: {
    title: "스마트스토어 상품 글쓰기",
    accentColor: "#03C75A",
    subtypes: [
      {id:"title",icon:"",label:"상품명",desc:"검색 최적화 상품명"},
      {id:"desc",icon:"",label:"상품 상세",desc:"상세페이지 텍스트"},
      {id:"review_reply",icon:"",label:"리뷰 답글",desc:"고객 리뷰 답변"},
    ],
    tones: [{id:"professional",label:"전문적"},{id:"friendly",label:"친근한"}],
    wordCounts: [{id:"short",label:"보통",desc:"300~600자"},{id:"medium",label:"길게",desc:"600~1,200자"}],
    fields: { title:["keyword","productName","extra"], desc:["keyword","productName","price","pros","extra"], review_reply:["keyword","extra"] },
    examples: { title:["핸드크림 상품명 최적화","LED 조명 검색 노출 제목"], desc:["텀블러 상세 설명 카피","아로마 디퓨저 상품 소개"], review_reply:["긍정 리뷰 감사 답글","불만 리뷰 정중한 답변"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={professional:"전문적이고 신뢰감 있는",friendly:"친근하고 따뜻한"}[tone];
      if(sub==="title") return `네이버 스마트스토어 상품명 최적화 (SEO)\n제품: ${f.productName||f.keyword}\n${f.extra||""}\n\n[필수] 네이버 검색 키워드 포함, 핵심 스펙+혜택, 5가지 변형`;
      if(sub==="desc") return `스마트스토어 상품 상세설명 (${t})\n제품: ${f.productName||f.keyword}\n가격: ${f.price||""}\n장점: ${f.pros||""}\n${f.extra||""}\n\n[필수] 특장점 → 사용법 → 후기 유도 → 구매 안내 구조. 이모지 금지`;
      if(sub==="review_reply") return `스마트스토어 리뷰 답글 (${t})\n상황: ${f.keyword}\n${f.extra||""}\n\n[필수] 감사 인사, 구체적 언급, 재구매 유도. 이모지 금지. 3가지 변형`;
      return "";
    },
  },

  // ── WordPress ──
  blog_wordpress: {
    title: "WordPress 블로그 작성",
    accentColor: "#21759B",
    subtypes: [
      {id:"info",icon:"",label:"정보성 글",desc:"가이드/노하우"},
      {id:"review",icon:"",label:"리뷰",desc:"제품/서비스 리뷰"},
      {id:"tutorial",icon:"",label:"튜토리얼",desc:"단계별 설명"},
      {id:"opinion",icon:"",label:"칼럼/의견",desc:"전문 의견"},
    ],
    tones: [{id:"info",label:"친근/정보형"},{id:"diary",label:"일기형"},{id:"review",label:"리뷰형"},{id:"expert",label:"전문형"}],
    wordCounts: [{id:"medium",label:"보통",desc:"1,000~1,500자"},{id:"long",label:"길게",desc:"2,000~3,000자"},{id:"xlong",label:"아주 길게",desc:"4,000자 이상"}],
    fields: { info:["keyword","extra"], review:["keyword","extra"], tutorial:["keyword","extra"], opinion:["keyword","extra"] },
    examples: { info:["워드프레스 속도 최적화 가이드"], review:["최신 노트북 비교 리뷰"], tutorial:["초보자를 위한 SEO 설정"], opinion:["AI 시대의 콘텐츠 전략"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={info:"친근하고 정보를 전달하는",diary:"일상적이고 따뜻한",review:"객관적이고 분석적인",expert:"전문적이고 깊이 있는"}[tone];
      const w={medium:"1,000~1,500자",long:"2,000~3,000자",xlong:"4,000자 이상"}[wc]||"2,000자";
      return `WordPress 블로그 글 (${t}, ${w})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수]\n- SEO 친화적 H2/H3 소제목 사용\n- 이모지 금지\n- [image: 키워드] 태그로 각 섹션에 이미지 삽입\n- 메타 디스크립션(150자) 포함\n- 핵심 키워드 자연스럽게 반복`;
    },
  },

  // ── Tumblr ──
  blog_tumblr: {
    title: "Tumblr 게시물 작성",
    accentColor: "#36465D",
    subtypes: [{id:"text",icon:"",label:"텍스트 포스트",desc:"일반 글"},{id:"essay",icon:"",label:"에세이",desc:"장문 글"}],
    tones: [{id:"casual",label:"캐주얼"},{id:"aesthetic",label:"감성적"},{id:"analytical",label:"분석적"}],
    wordCounts: [{id:"short",label:"짧게",desc:"200~500자"},{id:"medium",label:"보통",desc:"500~1,500자"}],
    fields: { text:["keyword","extra"], essay:["keyword","extra"] },
    examples: { text:["오늘의 영감 한 줄","음악 추천"], essay:["창작자의 번아웃에 대하여","인터넷 문화 변천사"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={casual:"가볍고 캐주얼한",aesthetic:"감성적이고 시적인",analytical:"분석적이고 깊이 있는"}[tone];
      return `Tumblr ${sub==="essay"?"에세이":"게시물"} (${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, Tumblr 특유의 자유로운 문체, 태그 5~10개`;
    },
  },

  // ── Quora ──
  blog_quora: {
    title: "Quora 답변 작성",
    accentColor: "#B92B27",
    subtypes: [{id:"answer",icon:"",label:"답변",desc:"질문에 대한 답변"},{id:"expert",icon:"",label:"전문 답변",desc:"전문가 관점 답변"}],
    tones: [{id:"helpful",label:"도움이 되는"},{id:"expert",label:"전문적"},{id:"personal",label:"경험 기반"}],
    wordCounts: [{id:"short",label:"보통",desc:"500~1,000자"},{id:"medium",label:"길게",desc:"1,000~2,000자"}],
    fields: { answer:["keyword","extra"], expert:["keyword","extra"] },
    examples: { answer:["프로그래밍 어떻게 시작하나요?","마케팅 전략 추천"], expert:["AI가 일자리를 대체할까요?","창업 초기 가장 중요한 것"] },
    buildPrompt(sub, f, tone, wc, speech) {
      const t={helpful:"도움이 되는 친절한",expert:"전문적이고 권위 있는",personal:"개인 경험 기반의"}[tone];
      return `Quora 답변 (${t})\n질문/주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 이모지 금지, 구체적 사례 포함, 읽기 쉬운 구조 (번호/불릿), 신뢰감 있는 전문가 톤`;
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
            { icon:"🔥", title:"Deluxe 플랜", desc:"$19.90 / 9,500P" },
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
