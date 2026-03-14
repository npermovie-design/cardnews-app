import { useState } from "react";

const API_KEY = "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";

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


// ── stripMarkdown 헬퍼 ──────────────────────────────────────────────────────
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6} /gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*] /gm, "• ")
    .replace(/^\d+\. /gm, "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27FF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── RichResultView JSX ──────────────────────────────────────────────────────
function RichResultView({ result, loading, isDark, cardBg, border, text, accent, keyword }) {
  if (!result && !loading) return null;

  const lines = result.split("\n");
  const sections = [];
  let current = { heading: null, level: 0, body: [] };

  lines.forEach(line => {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2 || h3) {
      if (current.body.length > 0 || current.heading) sections.push(current);
      const raw = (h2 || h3)[1];
      const clean = raw
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"")
        .replace(/[\u2600-\u27FF]/g,"")
        .replace(/\*\*(.+?)\*\*/g,"$1")
        .trim();
      current = { heading: clean, level: h2 ? 2 : 3, body: [] };
    } else {
      current.body.push(line);
    }
  });
  if (current.body.length > 0 || current.heading) sections.push(current);

  const getImgUrl = (heading) => {
    // loremflickr: 키워드 기반 무료 이미지 API (Unsplash source 대체)
    const q = encodeURIComponent((heading || keyword || "nature").slice(0, 30));
    const seed = (heading||"x").split("").reduce((a,ch)=>a+ch.charCodeAt(0),0);
    return `https://loremflickr.com/800/400/${q}?lock=${seed}`;
  };

  const renderLine = (line, i) => {
    const cleaned = line
      .replace(/\*\*(.+?)\*\*/g,"$1")
      .replace(/\*(.+?)\*/g,"$1")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"")
      .replace(/[\u2600-\u27FF]/g,"");
    if (!cleaned.trim()) return <div key={i} style={{height:8}}/>;
    const isBullet = /^[\-*•] /.test(cleaned.trim());
    if (isBullet) return (
      <div key={i} style={{display:"flex",gap:8,marginBottom:5}}>
        <span style={{color:accent,flexShrink:0,marginTop:2}}>•</span>
        <span style={{fontSize:14,lineHeight:1.85}}>{cleaned.replace(/^[\-*•] /,"")}</span>
      </div>
    );
    return <p key={i} style={{margin:"0 0 7px",fontSize:14,lineHeight:1.85,color:text}}>{cleaned}</p>;
  };

  return (
    <div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,overflow:"hidden",minHeight:120}}>
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.heading && (
            <div style={{position:"relative",overflow:"hidden"}}>
              <img src={getImgUrl(sec.heading)} alt={sec.heading}
                style={{width:"100%",height:sec.level===2?200:150,objectFit:"cover",display:"block"}}
                onError={e=>e.target.style.display="none"}/>
              <div style={{
                position:"absolute",bottom:0,left:0,right:0,
                background:"linear-gradient(transparent,rgba(0,0,0,0.76))",
                padding:sec.level===2?"28px 22px 16px":"20px 22px 12px",
              }}>
                <div style={{
                  fontSize:sec.level===2?20:16,
                  fontWeight:sec.level===2?900:700,
                  color:"#fff",
                  textShadow:"0 2px 8px rgba(0,0,0,0.5)",
                  letterSpacing:-0.3,
                }}>{sec.heading}</div>
              </div>
            </div>
          )}
          {sec.body.length > 0 && (
            <div style={{padding:"14px 22px 10px",color:text}}>
              {sec.body.map((line,li) => renderLine(line,li))}
            </div>
          )}
          {si < sections.length-1 && sec.heading && (
            <div style={{height:1,background:border,margin:"0 22px"}}/>
          )}
        </div>
      ))}
      {loading && (
        <div style={{padding:"12px 22px"}}>
          <span style={{display:"inline-block",width:2,height:14,background:accent,animation:"blink 1s infinite"}}/>
        </div>
      )}
    </div>
  );
}


// ── 플랫폼별 전체 설정 ──────────────────────────────────────────────────────
const PLATFORMS = {

  blog_naver: {
    title: "네이버 블로그 글쓰기",
    accentColor: "#03C75A",
    subtypes: [
      { id:"info",    icon:"📋", label:"정보성 글",     desc:"정보·노하우·가이드" },
      { id:"visit",   icon:"🏪", label:"체험·방문후기", desc:"장소·매장 방문 후기" },
      { id:"travel",  icon:"✈️", label:"여행 후기",     desc:"국내외 여행 기록" },
      { id:"product", icon:"📦", label:"제품 후기",     desc:"제품·서비스 리뷰" },
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
    },
    examples: {
      info:    ["혈당 스파이크 예방하는 식사 순서","강아지 슬개골 탈구 예방 운동법","재테크 초보를 위한 ETF 투자 가이드"],
      visit:   ["홍대 수제버거 맛집 방문후기","강남 네일아트샵 솔직 후기","이케아 광명점 쇼핑 방문기"],
      travel:  ["제주도 3박4일 혼자 여행 코스","오사카 2박3일 맛집 투어","강원도 속초 당일치기 여행"],
      product: ["다이슨 에어랩 3개월 사용 솔직 후기","맥북에어 M3 학생 추천 이유","무신사 패딩 실제 착용 리뷰"],
    },
    buildPrompt(sub, f, tone, wc) {
      const w={short:"1,000~1,500자",medium:"2,000~3,000자",long:"4,000자 이상"}[wc];
      const t={friendly:"친근하고 유용한 정보 전달체",diary:"일기처럼 자연스럽고 솔직한",review:"객관적이고 구체적인 리뷰체",professional:"전문적이고 신뢰감 있는"}[tone];
      if(sub==="info")    return `네이버 블로그 정보성 글 (${w}, ${t})\n키워드: ${f.keyword}\n대상: ${f.target||"일반 독자"}\n${f.extra||""}\n\n- 검색 최적화 제목\n- 소제목으로 구조화\n- 실용적 팁/정보 위주\n- 마무리 단락 포함`;
      if(sub==="visit")   return `네이버 블로그 체험·방문후기 (${w}, ${t})\n장소: ${f.keyword} / 위치: ${f.location||""} / 날짜: ${f.visitDate||"최근"} / 평점: ${f.rating||"4.5"}/5\n${f.extra||""}\n\n- 방문 전 기대→방문 과정→솔직 총평\n- 장단점 명확히, 재방문 의사 포함`;
      if(sub==="travel")  return `네이버 블로그 여행후기 (${w}, ${t})\n여행지: ${f.keyword} / 장소: ${f.location||""} / 기간: ${f.duration||"당일"} / 예산: ${f.budget||""}\n${f.extra||""}\n\n- 일정별 구조화, 맛집/명소/교통 포함\n- 실제 여행자 감성, 예산 팁 포함`;
      if(sub==="product") return `네이버 블로그 제품후기 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 구매 전 고민→언박싱→실사용 구조\n- 추천 대상·가성비 총평 포함`;
      return "";
    },
  },

  blog_tistory: {
    title: "티스토리 블로그 글쓰기",
    accentColor: "#FF6B35",
    htmlOutput: true,
    subtypes: [
      {id:"info",    icon:"📋", label:"정보성 글",       desc:"SEO 최적화 정보글"},
      {id:"review",  icon:"⭐", label:"제품·서비스 리뷰", desc:"구체적 사용 후기"},
      {id:"howto",   icon:"🛠️", label:"How-to 가이드",   desc:"단계별 방법 안내"},
      {id:"opinion", icon:"💡", label:"칼럼·의견",        desc:"전문 의견·분석"},
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
    },
    examples: {
      info:    ["파이썬 독학 완전 정복 가이드","구글 애드센스 승인받는 방법","ChatGPT 활용 업무 자동화"],
      review:  ["아이패드 프로 M4 실사용 리뷰","클로드 vs ChatGPT 비교 분석","노션 프리미엄 6개월 사용기"],
      howto:   ["워드프레스 블로그 개설하는 법","인스타그램 팔로워 늘리는 7가지 방법","유튜브 채널 수익화 조건 달성법"],
      opinion: ["AI가 바꾸는 콘텐츠 마케팅의 미래","2024년 재테크 전략 분석","SNS 마케팅 현실적인 이야기"],
    },
    buildPrompt(sub, f, tone, wc) {
      const w={short:"1,500~2,000자",medium:"2,500~3,500자",long:"4,000자 이상"}[wc];
      const t={professional:"전문적이고 신뢰감 있는",friendly:"친근하고 쉬운",analytical:"분석적이고 논리적인"}[tone];
      if(sub==="info")    return `티스토리 SEO 최적화 정보성 글 (${w}, ${t})\n키워드: ${f.keyword} / 대상: ${f.target||"일반"}\n${f.extra||""}\n\n마크다운 형식(## H2, ### H3)으로 작성\n- 키워드 제목·소제목에 자연스럽게 포함\n- 결론에 CTA 포함, 관련 키워드 녹임`;
      if(sub==="review")  return `티스토리 제품·서비스 리뷰 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n마크다운 형식으로 작성\n- 상세 스펙·실사용 경험·객관적 평가\n- 별점 형식 포함, 구매 가이드 제공`;
      if(sub==="howto")   return `티스토리 How-to 가이드 (${w}, ${t})\n주제: ${f.keyword} / 단계: ${f.steps||""}\n${f.extra||""}\n\n마크다운 형식으로 작성\n- 번호 매긴 단계별 설명\n- 각 단계 팁·주의사항, FAQ 포함`;
      if(sub==="opinion") return `티스토리 칼럼/의견 (${w}, ${t})\n주제: ${f.keyword} / 핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n마크다운 형식으로 작성\n- 주장→근거→반론→결론 구조\n- 데이터·사례 언급, 독자 공감 유도`;
      return "";
    },
  },

  blog_insta: {
    title: "인스타그램 캡션 생성",
    accentColor: "#E1306C",
    subtypes: [
      {id:"daily",   icon:"☀️", label:"일상 피드",   desc:"감성·일상 공유"},
      {id:"product", icon:"🛍️", label:"제품 홍보",   desc:"상품·브랜드 소개"},
      {id:"info",    icon:"📊", label:"정보 카드",   desc:"유용한 정보 공유"},
      {id:"event",   icon:"🎉", label:"이벤트·공지", desc:"행사·프로모션 안내"},
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
    },
    examples: {
      daily:   ["오늘의 카페 일상","주말 브런치 피드","가을 감성 일상"],
      product: ["신상 뷰티 제품 소개","수제 케이크 홍보","핸드메이드 액세서리"],
      info:    ["피부 관리 꿀팁 5가지","절약 생활 노하우","다이어트 식단 구성법"],
      event:   ["플리마켓 오픈 안내","할인 이벤트 공지","신메뉴 출시 알림"],
    },
    buildPrompt(sub, f, tone, wc) {
      const w={micro:"50자 이내 2~3줄",short:"120자 내외 5~6줄",medium:"250자 내외 10줄",long:"400자 내외 15줄 이상"}[wc];
      const t={emotional:"감성적이고 시적인",friendly:"친근하고 활발한",trendy:"트렌디하고 세련된",luxurious:"고급스럽고 우아한"}[tone];
      const htag="줄바꿈 후 관련 해시태그 15~20개";
      if(sub==="daily")   return `인스타그램 일상 피드 캡션 (${w}, ${t})\n상황: ${f.keyword} / 분위기: ${f.mood||""}\n${f.extra||""}\n\n- 첫 줄 강력한 훅, 이모지 자연스럽게\n- 줄바꿈으로 가독성 확보\n- ${htag}`;
      if(sub==="product") return `인스타그램 제품 홍보 캡션 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n${f.extra||""}\n\n- 제품 매력 훅, 핵심 특징 3가지 이내\n- 구매 유도 CTA 포함\n- ${htag}`;
      if(sub==="info")    return `인스타그램 정보 피드 캡션 (${w}, ${t})\n주제: ${f.keyword} / 포인트: ${f.points||""}\n${f.extra||""}\n\n- "저장 필수" 유도 첫 문장\n- 번호 매긴 핵심 포인트\n- ${htag}`;
      if(sub==="event")   return `인스타그램 이벤트/공지 캡션 (${w}, ${t})\n이벤트: ${f.keyword} / 날짜: ${f.eventDate||""}\n${f.extra||""}\n\n- 강렬한 첫 줄(이모지), 참여 방법 명확히\n- ${htag}`;
      return "";
    },
  },

  blog_youtube: {
    title: "유튜브 대본 & 설명 생성",
    accentColor: "#FF0000",
    subtypes: [
      {id:"script", icon:"🎬", label:"영상 대본",   desc:"인트로~아웃트로 완성"},
      {id:"desc",   icon:"📝", label:"영상 설명란", desc:"설명 + 타임스탬프 + 태그"},
      {id:"shorts", icon:"⚡", label:"쇼츠 대본",   desc:"60초 임팩트 대본"},
      {id:"title",  icon:"🏷️", label:"제목·썸네일", desc:"클릭률 높은 제목 5개"},
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
    },
    examples: {
      script: ["유튜브 알고리즘 완전 정복","매일 30분 운동으로 바뀐 몸","월 100만원 아끼는 절약법"],
      desc:   ["요리 레시피 영상","재테크 공부 브이로그","PC 조립 튜토리얼"],
      shorts: ["아무도 알려주지 않는 생산성 꿀팁","10초만에 기억력 올리는 법","직장인 필수 앱 3가지"],
      title:  ["다이어트 식단 정보 영상","파이썬 독학 과정 영상","여행 브이로그"],
    },
    buildPrompt(sub, f, tone, wc) {
      const w={"30s":"30초 분량(~150자)","1m":"1분 분량(~300자)","5m":"5분 분량(~700자)","10m":"10분 분량(~1,500자)","20m":"20분 분량(~3,000자)","1h":"1시간 분량(~9,000자, 섹션별)"}[wc];
      const t={energetic:"에너지틱하고 빠른 템포",calm:"차분하고 신뢰감 있는",educational:"교육적이고 체계적인",entertaining:"재미있고 친근한"}[tone];
      if(sub==="script") return `유튜브 영상 대본 (${w}, ${t})\n주제: ${f.keyword} / 타깃: ${f.target||"일반 시청자"}\n핵심 내용: ${f.mainPoints||""}\n${f.extra||""}\n\n[인트로-훅+예고] → [본론-핵심 단계별] → [아웃트로-구독유도]\n자연스러운 구어체, 화면 지시 포함`;
      if(sub==="desc")   return `유튜브 영상 설명란\n영상: ${f.keyword} / 길이: ${f.duration||"10분"}\n${f.extra||""}\n\n- 요약 2~3문장\n- 타임스탬프 (예시 시간 포함)\n- 관련 링크 섹션\n- 해시태그 10개\n- 채널 소개 문구`;
      if(sub==="shorts") return `유튜브 쇼츠 대본 (60초, ${t})\n주제: ${f.keyword} / 훅 아이디어: ${f.hook||""}\n${f.extra||""}\n\n[0~3초: 강력한 훅] → [3~50초: 핵심 임팩트] → [50~60초: 마무리·구독유도]\n짧고 강한 문장, 자막 가능하도록`;
      if(sub==="title")  return `유튜브 제목 5가지 + 썸네일 문구 제안\n영상 주제: ${f.keyword} / 각도: ${f.angle||""}\n\n- 클릭률 높은 제목 5가지 (숫자/궁금증/혜택 활용)\n- 각 제목별 썸네일 메인 문구\n- SEO 태그 10개`;
      return "";
    },
  },

  blog_thread: {
    title: "스레드 게시물 작성",
    accentColor: "#000000",
    subtypes: [
      {id:"opinion",  icon:"💬", label:"의견·인사이트", desc:"생각·관점 공유"},
      {id:"story",    icon:"📖", label:"이야기·경험",   desc:"경험담 스토리"},
      {id:"tip",      icon:"💡", label:"꿀팁·정보",     desc:"유용한 팁 공유"},
      {id:"question", icon:"❓", label:"질문·토론",     desc:"커뮤니티 참여 유도"},
    ],
    tones: [
      {id:"casual",      label:"일상 대화체"},
      {id:"thoughtful",  label:"사려깊은"},
      {id:"provocative", label:"도발적·강렬한"},
      {id:"humorous",    label:"유머러스"},
    ],
    // 스레드는 개수 기준
    wordCounts: [
      {id:"single", label:"단문 1개",   desc:"1~3문장"},
      {id:"medium", label:"스레드 3개", desc:"3개 연속글"},
      {id:"long",   label:"스레드 7개", desc:"7개 연속글"},
      {id:"mega",   label:"롱스레드",   desc:"10개+ 연속글"},
    ],
    fields: {
      opinion:  ["keyword","stance","extra"],
      story:    ["keyword","lesson","extra"],
      tip:      ["keyword","points","extra"],
      question: ["keyword","angle","extra"],
    },
    examples: {
      opinion:  ["AI 시대 크리에이터의 생존법","직장 다니며 부업하는 현실","SNS 팔로워보다 중요한 것"],
      story:    ["퇴사하고 1년 후 솔직한 이야기","첫 해외여행 혼자 간 경험","실패한 창업에서 배운 것"],
      tip:      ["아침 루틴 바꾸고 달라진 것들","시간 낭비 줄이는 앱 추천","돈 모으기 시작하는 첫 3단계"],
      question: ["재택근무 선호 vs 출근 선호?","SNS 끊어본 적 있나요?","지금 가장 배우고 싶은 것은?"],
    },
    buildPrompt(sub, f, tone, wc) {
      const cnt={single:"1개 (1~3문장)",medium:"3개 연속글",long:"7개 연속글",mega:"10개 이상 연속글"}[wc];
      const t={casual:"친근한 일상 대화체",thoughtful:"사려 깊고 진지한",provocative:"강렬하고 도발적인",humorous:"유머러스하고 가볍게"}[tone];
      const fmt=wc!=="single"?`\n\n스레드 형식 (${cnt})\n- 각 글은 1~4문장\n- 첫 글에 강력한 훅\n- 마지막 글에 질문/CTA\n- 각 글 앞에 [1/n] 번호 표시`:"\n- 단문 1개, 3문장 이내, 강렬하게";
      if(sub==="opinion")  return `스레드 의견·인사이트 (${t})\n주제: ${f.keyword} / 입장: ${f.stance||""}\n${f.extra||""}${fmt}`;
      if(sub==="story")    return `스레드 경험 이야기 (${t})\n경험: ${f.keyword} / 교훈: ${f.lesson||""}\n${f.extra||""}${fmt}`;
      if(sub==="tip")      return `스레드 꿀팁 공유 (${t})\n주제: ${f.keyword} / 포인트: ${f.points||""}\n${f.extra||""}${fmt}`;
      if(sub==="question") return `스레드 질문·토론 (${t})\n주제: ${f.keyword} / 각도: ${f.angle||""}\n${f.extra||""}${fmt}`;
      return "";
    },
  },
};

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
  extra:       {label:"추가 요청 (선택)",      placeholder:"특별히 강조할 내용, 피할 내용 등", textarea:true},
};

// ── 메인 ──────────────────────────────────────────────────────────────────
export default function BlogGenerator({ initialType, embedded, menuLabel, theme }) {
  const cfg = PLATFORMS[initialType] || PLATFORMS.blog_naver;
  const isDark = theme === "dark" || (!theme && !!embedded); // theme prop 우선, 없으면 embedded 기준

  const [subtype,    setSubtype]    = useState(cfg.subtypes[0].id);
  const [fields,     setFields]     = useState({});
  const [tone,       setTone]       = useState(cfg.tones[0].id);
  const [wordCount,  setWordCount]  = useState(cfg.wordCounts[1]?.id || cfg.wordCounts[0].id);
  const [result,     setResult]     = useState("");
  const [htmlResult, setHtmlResult] = useState("");
  const [viewMode,   setViewMode]   = useState("text");
  const [loading,    setLoading]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [error,      setError]      = useState("");

  // ── AI 추천 기능 ──
  const [step,          setStep]          = useState(1);
  const [outline,       setOutline]       = useState([]);
  const [loadingOutline,setLoadingOutline]= useState(false);
  const [dragIdx,       setDragIdx]       = useState(null);
  const [dragOver,      setDragOver]      = useState(null);
  const [titleSuggs,    setTitleSuggs]    = useState([]);
  const [loadingTitle,  setLoadingTitle]  = useState(false);
  const [seoKws,        setSeoKws]        = useState([]);
  const [loadingSeo,    setLoadingSeo]    = useState(false);
  const [showTitleBox,  setShowTitleBox]  = useState(false);
  const [showSeoBox,    setShowSeoBox]    = useState(false);

  const handleSubtype = id => { setSubtype(id); setFields({}); setResult(""); setHtmlResult(""); setError(""); setStep(1); setOutline([]); };
  const setField = (k,v) => setFields(p=>({...p,[k]:v}));
  const currentFields = cfg.fields[subtype] || ["keyword","extra"];
  const examples = cfg.examples?.[subtype] || [];
  const isTistory = initialType === "blog_tistory";
  const accentRaw = cfg.accentColor || "#6366f1";

  // ── 테마 변수 ──
  const text    = isDark ? "#fff"                      : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)"    : "#6c757d";
  const border  = isDark ? "rgba(255,255,255,0.10)"    : "#e9ecef";
  const accent  = isDark ? "#a5b4fc"                   : "#4f46e5";
  const accentBg= isDark ? "rgba(99,102,241,0.25)"     : "#f0f0ff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)"    : "#fff";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)"    : "#e9ecef";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)"    : "#fff";
  const panelBg = isDark ? "rgba(0,0,0,0.30)"          : "#fff";
  const resultBg= isDark ? "rgba(0,0,0,0.15)"          : "#f8f9fa";
  const headerBg= isDark ? "rgba(0,0,0,0.20)"          : "#fff";

  const IS = {width:"100%", padding:"10px 12px", borderRadius:9, border:`1.5px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box"};

  const generate = async () => {
    if (!fields.keyword?.trim()) { setError("키워드 / 주제를 입력해주세요."); return; }
    setError(""); setLoading(true); setResult(""); setHtmlResult(""); setCopied(false);
    const prompt = cfg.buildPrompt(subtype, fields, tone, wordCount);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5", max_tokens:4000, stream:true, messages:[{role:"user",content:prompt}]}),
      });
      if (!res.ok) throw new Error("API 오류");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf=""; let full="";
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        buf += decoder.decode(value,{stream:true});
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6).trim();
            if (d==="[DONE]") continue;
            try { const p=JSON.parse(d); if(p.type==="content_block_delta"&&p.delta?.text){full+=p.delta.text;setResult(full);} } catch{}
          }
        }
      }
      if (isTistory) setHtmlResult(mdToHtml(full));
    } catch { setError("생성 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  const handleCopy = content => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  // ── AI 제목 추천 ──
  const suggestTitles = async () => {
    if (!fields.keyword?.trim()) return;
    setLoadingTitle(true); setShowTitleBox(true); setTitleSuggs([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:400,messages:[{role:"user",content:`블로그 제목 5개 추천. 주제: "${fields.keyword}". 번호 없이 제목만 줄바꿈으로`}]}),
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").trim();
      setTitleSuggs(text.split("\n").filter(t=>t.trim()).slice(0,5));
    } catch {}
    setLoadingTitle(false);
  };

  // ── SEO 키워드 추천 ──
  const suggestSeo = async () => {
    if (!fields.keyword?.trim()) return;
    setLoadingSeo(true); setShowSeoBox(true); setSeoKws([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:200,messages:[{role:"user",content:`SEO 키워드 10개. 주제: "${fields.keyword}". 키워드만 쉼표 구분`}]}),
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").trim();
      setSeoKws(text.split(/[,，]/).map(k=>k.trim()).filter(k=>k).slice(0,10));
    } catch {}
    setLoadingSeo(false);
  };

  // ── 목차 생성 ──
  const generateOutline = async () => {
    if (!fields.keyword?.trim()) { setError("키워드 / 주제를 입력해주세요."); return; }
    setError(""); setLoadingOutline(true); setStep(2); setOutline([]);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,messages:[{role:"user",content:`블로그 목차. 주제:"${fields.keyword}". JSON만 반환:[{"title":"소제목"},...] 6~8개`}]}),
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").trim();
      const match = text.match(/\[.*\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setOutline(parsed.map((o,i)=>({id:i,title:typeof o==="string"?o:o.title||""})));
      }
    } catch { setOutline([{id:0,title:"도입"},{id:1,title:"본론1"},{id:2,title:"본론2"},{id:3,title:"정리"}]); }
    setLoadingOutline(false);
  };

  // ── 목차 포함 최종 생성 ──
  const generateWithOutline = async () => {
    setError(""); setLoading(true); setResult(""); setHtmlResult(""); setCopied(false); setStep(3);
    const outlineText = outline.length > 0 ? "\n\n목차:\n" + outline.map((o,i)=>`${i+1}. ${o.title}`).join("\n") : "";
    const prompt = cfg.buildPrompt(subtype, fields, tone, wordCount) + outlineText;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:4000,stream:true,messages:[{role:"user",content:prompt}]}),
      });
      if (!res.ok) throw new Error("API 오류");
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buf=""; let full="";
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        buf += decoder.decode(value,{stream:true});
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const d = line.slice(6).trim(); if (d==="[DONE]") continue;
            try { const p=JSON.parse(d); if(p.type==="content_block_delta"&&p.delta?.text){full+=p.delta.text;setResult(full);} } catch{}
          }
        }
      }
      if (isTistory) setHtmlResult(mdToHtml(full));
    } catch { setError("생성 중 오류가 발생했습니다."); setStep(2); }
    finally { setLoading(false); }
  };

  // ── 글자수 통계 ──
  const charStats = result ? { total:result.length, noSpace:result.replace(/\s/g,"").length, bytes:new Blob([result]).size } : null;

  // ── 결과 패널 ──
  const renderResult = () => {
    if (loading) {
      const wc = cfg.wordCounts.find(w=>w.id===wordCount);
      const estSec = wordCount==="short"?8:wordCount==="medium"?14:22;
      const steps = ["주제 분석 중...", "글 구조 기획...", "문장 생성 중...", "마무리 다듬는 중..."];
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center",animation:"fadeInUp 0.4s ease"}}>
          {/* 떠다니는 문서 아이콘 */}
          <div style={{position:"relative",marginBottom:28}}>
            {["✍️","📝","✨"].map((em,i)=>(
              <span key={i} style={{fontSize:36,position:i===0?"relative":"absolute",
                top:i===0?0:[-15,15][i-1]+"px", left:i===0?0:[-20,20][i-1]+"px",
                animation:"floatCard 2s ease-in-out infinite",
                animationDelay:(i*0.4)+"s", display:"inline-block"}}>{em}</span>
            ))}
          </div>
          <div style={{fontSize:17,fontWeight:900,color:text,marginBottom:8}}>AI가 글을 쓰고 있어요</div>
          <div style={{fontSize:12,color:muted,marginBottom:20,lineHeight:1.7}}>
            {fields.keyword} · {wc?.desc || "생성 중"}<br/>
            <span style={{fontSize:11,opacity:0.7}}>약 {estSec}~{estSec+8}초 소요</span>
          </div>
          {/* 단계 */}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,width:"100%",maxWidth:260,textAlign:"left"}}>
            {steps.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,
                color:i<2?"rgba(99,102,241,0.7)":i===2?text:muted, fontWeight:i===2?700:400}}>
                {i<2
                  ? <span style={{color:"#4ade80",fontSize:13}}>✓</span>
                  : i===2
                    ? <div style={{width:13,height:13,borderRadius:"50%",border:"2px solid "+accent,borderTop:"2px solid transparent",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
                    : <div style={{width:13,height:13,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.1)",flexShrink:0}}/>
                }
                {s}
              </div>
            ))}
          </div>
          {/* 프로그레스 바 */}
          <div style={{width:"100%",maxWidth:280,height:4,background:isDark?"rgba(255,255,255,0.06)":"#e9ecef",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,"+accentRaw+",#8b5cf6)",borderRadius:4,
              animation:"progressGrow "+estSec+"s ease-out forwards"}}/>
          </div>
          <div style={{fontSize:10,color:muted,marginTop:6}}>생성이 완료되면 자동으로 결과가 표시됩니다</div>
        </div>
      );
    }
    if (!result) {
      const sub = cfg.subtypes.find(s=>s.id===subtype);
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:52}}>{sub?.icon||"✍️"}</div>
          <div style={{fontSize:16,fontWeight:800,color:text}}>{sub?.label}</div>
          <div style={{fontSize:13,color:muted,lineHeight:1.8}}>왼쪽에서 정보를 입력하고<br/>글 생성하기 버튼을 눌러주세요</div>
          {examples.length>0&&<div style={{fontSize:11,color:muted,opacity:0.6}}>예시: {examples[0]}</div>}
        </div>
      );
    }
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* 글자수 통계 */}
        {result && (
          <div style={{flexShrink:0,padding:"6px 14px",borderBottom:`1px solid ${border}`,background:headerBg,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:text}}>📊</span>
            <span style={{fontSize:11,background:isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)",color:accent,borderRadius:6,padding:"2px 8px",fontWeight:700}}>공백 포함 {result.length.toLocaleString()}자</span>
            <span style={{fontSize:11,background:isDark?"rgba(16,185,129,0.1)":"rgba(16,185,129,0.07)",color:"#10b981",borderRadius:6,padding:"2px 8px",fontWeight:700}}>공백 제외 {result.replace(/\s/g,"").length.toLocaleString()}자</span>
            <span style={{fontSize:11,color:muted}}>{new Blob([result]).size.toLocaleString()} byte</span>
            <div style={{marginLeft:"auto",display:"flex",gap:4}}>
              <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:stripMarkdown(result))}
                style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${border}`,background:copied?accentBg:"transparent",color:copied?"#4ade80":accent,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {copied?"✓ 복사됨":"📋 복사"}
              </button>
              <button onClick={()=>{const b=new Blob([result],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="생성결과.txt";a.click();URL.revokeObjectURL(u);}}
                style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>📄 TXT</button>
              <button onClick={()=>{const html=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>생성결과</title><style>body{font-family:'Noto Sans KR',sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8}</style></head><body><pre style="white-space:pre-wrap">${result}</pre></body></html>`;const b=new Blob([html],{type:"text/html;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="생성결과.html";a.click();URL.revokeObjectURL(u);}}
                style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>🌐 HTML</button>
              <button onClick={()=>{const w=window.open("","_blank");w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Noto Sans KR',sans-serif;padding:30px;line-height:1.8}@media print{body{padding:0}}</style></head><body><pre style="white-space:pre-wrap">${result}</pre><script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);w.document.close();}}
                style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>🖨️ PDF</button>
            </div>
          </div>
        )}
        <div style={{height:40,flexShrink:0,display:"flex",alignItems:"center",padding:"0 14px",borderBottom:`1px solid ${border}`,background:headerBg}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {isTistory && result && ["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:viewMode===mode?700:400,cursor:"pointer"}}>
                {mode==="text"?"원문":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
            {!isTistory&&result&&<span style={{fontSize:12,fontWeight:700,color:text}}>생성 결과</span>}
            {!result&&<span style={{fontSize:12,color:muted}}>글 생성 전</span>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {(viewMode==="text"||!isTistory)&&(
            <RichResultView result={result} loading={loading} isDark={isDark} cardBg={cardBg} border={border} text={text} accent={accent} keyword={fields.keyword||""}/>
          )}
          {isTistory&&viewMode==="html"&&htmlResult&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"18px 20px"}}><pre style={{fontSize:12,color:isDark?"#a5b4fc":"#4f46e5",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"'Consolas','Monaco',monospace",margin:0}}>{htmlResult}</pre></div>}
          {isTistory&&viewMode==="preview"&&htmlResult&&<div style={{background:"#fff",border:"1px solid #e9ecef",borderRadius:12,padding:"24px 28px"}} dangerouslySetInnerHTML={{__html:htmlResult}}/>}
        </div>
      </div>
    );
  };

  const [mobileTab, setMobileTab] = useState("input"); // "input" | "result"

  const content = (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column"}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes floatCard{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes progressGrow{from{width:0%}to{width:100%}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .tistory-content h1,.tistory-content h2{font-size:20px;font-weight:700;margin:20px 0 10px}
        .tistory-content h3{font-size:16px;font-weight:700;margin:14px 0 8px}
        .tistory-content p{margin:8px 0;line-height:1.8}
        .tistory-content ul{padding-left:20px;margin:8px 0}
        .tistory-content li{margin:4px 0}
        .blog-mobile-tabs{display:none}
        .blog-panel-left{width:380px;flex-shrink:0}
        .blog-panel-right{flex:1}
        @media(max-width:768px){
          .blog-mobile-tabs{display:flex!important}
          .blog-panel-left{width:100%!important;flex-shrink:unset}
          .blog-panel-right{flex:1;width:100%!important}
          .blog-desktop-split{flex-direction:column!important}
          .blog-hide-mobile{display:none!important}
        }
      `}</style>
      {/* 모바일 탭 */}
      <div className="blog-mobile-tabs" style={{display:"none",borderBottom:`1px solid ${border}`,background:panelBg,flexShrink:0}}>
        {[["input","✏️ 입력"],["result","📄 결과"]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setMobileTab(tab)}
            style={{flex:1,padding:"10px",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
              background:mobileTab===tab?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",
              color:mobileTab===tab?"#fff":muted,
              borderBottom:mobileTab===tab?"2px solid #6366f1":"2px solid transparent"}}>
            {label}{tab==="result"&&result&&<span style={{marginLeft:4,fontSize:10,background:"#6366f1",color:"#fff",borderRadius:8,padding:"1px 5px"}}>완료</span>}
          </button>
        ))}
      </div>
      <div className="blog-desktop-split" style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* 좌: 입력 */}
        <div className={"blog-panel-left" + (mobileTab==="result" ? " blog-hide-mobile" : "")}
          style={{background:panelBg,borderRight:`1px solid ${border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${border}`,flexShrink:0}}>
            <div style={{fontSize:14,fontWeight:800,color:text}}>{menuLabel||cfg.title}</div>
            <div style={{fontSize:11,color:muted,marginTop:2}}>글 타입과 정보를 입력하면 AI가 자동으로 작성해드려요</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
            {/* 글 타입 */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>글 타입 선택</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {cfg.subtypes.map(s=>{
                  const isA=subtype===s.id;
                  return <button key={s.id} onClick={()=>handleSubtype(s.id)} style={{padding:"10px",borderRadius:9,textAlign:"left",cursor:"pointer",border:isA?`2px solid ${accent}`:`2px solid ${border}`,background:isA?accentBg:inputBg}}>
                    <div style={{fontSize:16,marginBottom:3}}>{s.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:isA?accent:text}}>{s.label}</div>
                    <div style={{fontSize:10,color:muted,marginTop:1}}>{s.desc}</div>
                  </button>;
                })}
              </div>
            </div>
            {/* 예시 */}
            {examples.length>0&&<div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:6}}>예시 글감</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {examples.map(ex=><button key={ex} onClick={()=>setField("keyword",ex)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${border}`,background:fields.keyword===ex?accentBg:"transparent",color:fields.keyword===ex?accent:muted,fontSize:11,cursor:"pointer"}}>{ex}</button>)}
              </div>
            </div>}
            {/* 동적 필드 */}
            {currentFields.map(fk=>{
              const fl=FIELD_LABELS[fk]; if(!fl) return null;
              return <div key={fk} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:5}}>{fl.label}{fl.required&&<span style={{color:"#ef4444"}}> *</span>}</div>
                {fl.textarea
                  ?<textarea value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} rows={3} placeholder={fl.placeholder} style={{...IS,resize:"none",lineHeight:1.6}}/>
                  :<input type="text" value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} onKeyDown={e=>e.key==="Enter"&&fk==="keyword"&&generateOutline()} placeholder={fl.placeholder} style={{...IS,borderColor:(error&&fk==="keyword")?"#ef4444":inputBdr}}/>
                }
              {/* keyword 아래 AI 추천 버튼 */}
              {fk==="keyword" && fields.keyword?.trim() && (
                <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
                  <button onClick={suggestTitles} disabled={loadingTitle}
                    style={{flex:1,padding:"7px 8px",borderRadius:8,border:`1px solid ${border}`,background:isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.07)",color:accent,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    {loadingTitle?"⏳ 로딩...":"🤖 AI 제목 추천"}
                  </button>
                  <button onClick={suggestSeo} disabled={loadingSeo}
                    style={{flex:1,padding:"7px 8px",borderRadius:8,border:`1px solid ${border}`,background:isDark?"rgba(16,185,129,0.1)":"rgba(16,185,129,0.06)",color:"#10b981",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    {loadingSeo?"⏳ 로딩...":"🔍 SEO 키워드"}
                  </button>
                </div>
              )}
              {/* AI 제목 추천 결과 */}
              {fk==="keyword" && showTitleBox && titleSuggs.length>0 && (
                <div style={{marginTop:6,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:`1px solid ${isDark?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.2)"}`,borderRadius:9,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:muted,marginBottom:5,fontWeight:700}}>💡 클릭하면 키워드로 적용</div>
                  {titleSuggs.map((t,i)=>(
                    <div key={i} onClick={()=>setField("keyword",t)} style={{fontSize:12,color:text,padding:"5px 8px",borderRadius:6,cursor:"pointer",marginBottom:2}}
                      onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.07)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {t}
                    </div>
                  ))}
                  <button onClick={()=>setShowTitleBox(false)} style={{fontSize:10,color:muted,background:"none",border:"none",cursor:"pointer",marginTop:2}}>닫기</button>
                </div>
              )}
              {/* SEO 키워드 추천 결과 */}
              {fk==="keyword" && showSeoBox && seoKws.length>0 && (
                <div style={{marginTop:6,background:isDark?"rgba(16,185,129,0.06)":"rgba(16,185,129,0.04)",border:`1px solid rgba(16,185,129,0.2)`,borderRadius:9,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:"#10b981",marginBottom:5,fontWeight:700}}>🔍 SEO 추천 키워드 (클릭 복사)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {seoKws.map((k,i)=>(
                      <span key={i} onClick={()=>navigator.clipboard?.writeText(k)} style={{fontSize:11,padding:"3px 9px",borderRadius:12,background:isDark?"rgba(16,185,129,0.15)":"rgba(16,185,129,0.1)",color:"#10b981",cursor:"pointer",fontWeight:600}}>#{k}</span>
                    ))}
                  </div>
                  <button onClick={()=>setShowSeoBox(false)} style={{fontSize:10,color:muted,background:"none",border:"none",cursor:"pointer",marginTop:4}}>닫기</button>
                </div>
              )}
              </div>;
            })}
            {error&&<div style={{fontSize:11,color:"#ef4444",marginBottom:8}}>{error}</div>}
            {/* 글 톤 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:6}}>글 톤</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {cfg.tones.map(t=>{const isA=tone===t.id;return<button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:11,fontWeight:isA?700:400,cursor:"pointer"}}>{t.label}</button>;})}
              </div>
            </div>
            {/* 분량 버튼 - 플랫폼별 스타일 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:7}}>
                {initialType==="blog_youtube"?"영상 길이":initialType==="blog_thread"?"글 개수":initialType==="blog_insta"?"글자 분량":"분량"}
              </div>
              {/* 인스타: 글자수 강조 배지 */}
              {initialType==="blog_insta" && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 12px",borderRadius:10,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:60}}>
                      <span style={{fontSize:15,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                      <span style={{fontSize:9,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                    </button>;
                  })}
                </div>
              )}
              {/* 유튜브: 시간 캡슐 버튼 */}
              {initialType==="blog_youtube" && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",border:`2px solid ${isA?"#FF0000":border}`,background:isA?"rgba(255,0,0,0.1)":"transparent",whiteSpace:"nowrap"}}>
                      <span style={{fontSize:13,fontWeight:isA?800:500,color:isA?"#FF0000":text}}>⏱ {w.label}</span>
                    </button>;
                  })}
                </div>
              )}
              {/* 스레드: 개수 배지 */}
              {initialType==="blog_thread" && (
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"7px 11px",borderRadius:10,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:62}}>
                      <span style={{fontSize:13,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                      <span style={{fontSize:9,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                    </button>;
                  })}
                </div>
              )}
              {/* 나머지 플랫폼: 기본 박스형 */}
              {initialType!=="blog_insta" && initialType!=="blog_youtube" && initialType!=="blog_thread" && (
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",textAlign:"center",border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent"}}>
                      <div style={{fontSize:12,fontWeight:isA?700:400,color:isA?accent:text}}>{w.label}</div>
                      <div style={{fontSize:9,color:muted,marginTop:1}}>{w.desc}</div>
                    </button>;
                  })}
                </div>
              )}
            </div>
          </div>
          {/* 생성 버튼 */}
          <div style={{padding:"10px 18px 14px",flexShrink:0}}>
            {/* Step 인디케이터 */}
            <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:10,justifyContent:"center"}}>
              {[{n:1,l:"입력"},{n:2,l:"목차"},{n:3,l:"결과"}].map((s,i)=>(
                <div key={s.n} style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:step>=s.n?"linear-gradient(135deg,#6366f1,#8b5cf6)":(isDark?"rgba(255,255,255,0.08)":"#e9ecef"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:step>=s.n?"#fff":muted}}>{s.n}</div>
                    <span style={{fontSize:10,color:step===s.n?accent:muted,fontWeight:step===s.n?700:400}}>{s.l}</span>
                  </div>
                  {i<2&&<div style={{width:14,height:1,background:isDark?"rgba(255,255,255,0.1)":"#e9ecef",margin:"0 3px"}}/>}
                </div>
              ))}
            </div>
            {step===1 && (
              <button onClick={generateOutline} disabled={loadingOutline||!fields.keyword?.trim()}
                style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:loadingOutline||!fields.keyword?.trim()?"not-allowed":"pointer",
                  background:fields.keyword?.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                  color:fields.keyword?.trim()?"#fff":muted,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                {loadingOutline?(<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>목차 구성 중...</>):(<><span>다음: 목차 구성 →</span><span style={{fontSize:10,background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"2px 7px"}}>✨ 10P</span></>)}
              </button>
            )}
            {step===2 && (
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setStep(1);setOutline([]);}}
                  style={{padding:"11px 16px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>← 이전</button>
                <button onClick={generateWithOutline} disabled={loading}
                  style={{flex:1,padding:"13px",borderRadius:10,border:"none",cursor:loading?"not-allowed":"pointer",
                    background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  {loading?(<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>):(<><span>✨ 글 생성하기</span><span style={{fontSize:10,background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"2px 7px"}}>10P</span></>)}
                </button>
              </div>
            )}
            {step===3 && (
              <button onClick={()=>{setStep(1);setResult("");setOutline([]);setHtmlResult("");}}
                style={{width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>↺ 새로 작성하기</button>
            )}
          </div>
        </div>
        {/* 우: Step2 목차편집 or 결과 */}
        <div className={"blog-panel-right" + (mobileTab==="input" ? " blog-hide-mobile" : "")}
          style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:resultBg}}>
          {step===2 ? (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${border}`,background:headerBg,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:text}}>📋 목차 편집</div>
                  <div style={{fontSize:11,color:muted,marginTop:1}}>☰ 드래그로 순서 변경 · − 삭제 · 클릭하여 수정</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
                {loadingOutline ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,flexDirection:"column",gap:10}}>
                    <div style={{width:22,height:22,border:`3px solid ${border}`,borderTop:`3px solid ${accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                    <div style={{fontSize:13,color:muted}}>목차 생성 중...</div>
                  </div>
                ) : (<>
                  {outline.map((item,i)=>(
                    <div key={item.id} draggable
                      onDragStart={()=>setDragIdx(i)} onDragOver={e=>{e.preventDefault();setDragOver(i);}}
                      onDragEnd={()=>{
                        if(dragIdx!==null&&dragOver!==null&&dragIdx!==dragOver){
                          const n=[...outline]; const [m]=n.splice(dragIdx,1); n.splice(dragOver,0,m); setOutline(n);
                        }
                        setDragIdx(null); setDragOver(null);
                      }}
                      style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                        background:dragOver===i?(isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.06)"):(isDark?"rgba(255,255,255,0.03)":"#fff"),
                        border:`1px solid ${dragOver===i?"rgba(99,102,241,0.4)":border}`,
                        borderRadius:10,padding:"10px 12px",cursor:"grab",opacity:dragIdx===i?0.4:1,transition:"all 0.1s"}}>
                      <span style={{color:muted,fontSize:13,userSelect:"none"}}>☰</span>
                      <span style={{width:21,height:21,borderRadius:6,background:isDark?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:accent,flexShrink:0}}>{i+1}</span>
                      <input value={item.title} onChange={e=>{const n=[...outline];n[i]={...n[i],title:e.target.value};setOutline(n);}}
                        onClick={e=>e.stopPropagation()}
                        style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:13,color:text,fontFamily:"inherit",cursor:"text"}}/>
                      <button onClick={e=>{e.stopPropagation();setOutline(outline.filter((_,j)=>j!==i));}}
                        style={{width:21,height:21,borderRadius:5,border:`1px solid rgba(229,62,62,0.3)`,background:"transparent",color:"#e53e3e",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>−</button>
                    </div>
                  ))}
                  <button onClick={()=>setOutline([...outline,{id:Date.now(),title:"새 섹션"}])}
                    style={{width:"100%",padding:"9px",borderRadius:9,border:`2px dashed ${border}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer",fontWeight:600,marginTop:4}}>
                    + 섹션 추가
                  </button>
                </>)}
              </div>
            </div>
          ) : renderResult()}
        </div>
        {/* 플로팅 액션 버튼 - 결과 있을 때만 */}
        {result && (
          <div style={{padding:"12px 16px",borderTop:`1px solid ${border}`,background:panelBg,display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
            <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result)}
              style={{flex:1,minWidth:70,padding:"9px 8px",borderRadius:9,border:`1px solid ${border}`,background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",color:copied?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {copied?"✓ 복사됨":"📋 복사"}
            </button>
            <button onClick={()=>{
              const blob=new Blob([result],{type:"text/plain;charset=utf-8"});
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");
              a.href=url;a.download="생성결과.txt";a.click();URL.revokeObjectURL(url);
            }} style={{flex:1,minWidth:70,padding:"9px 8px",borderRadius:9,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              📄 TXT
            </button>
            <button onClick={()=>{
              const htmlContent=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>생성결과</title><style>body{font-family:'Noto Sans KR',sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#333}h1,h2,h3{color:#1a1a2e}</style></head><body><pre style="white-space:pre-wrap">${result}</pre></body></html>`;
              const blob=new Blob([htmlContent],{type:"text/html;charset=utf-8"});
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");
              a.href=url;a.download="생성결과.html";a.click();URL.revokeObjectURL(url);
            }} style={{flex:1,minWidth:70,padding:"9px 8px",borderRadius:9,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              🌐 HTML
            </button>
            <button onClick={()=>{
              const printWin=window.open("","_blank");
              printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>생성결과</title><style>body{font-family:'Noto Sans KR',sans-serif;padding:30px;line-height:1.8;color:#000}@media print{body{padding:0}}</style></head><body><pre style="white-space:pre-wrap">${result}</pre><script>window.onload=function(){window.print();window.close()}<\/script></body></html>`);
              printWin.document.close();
            }} style={{flex:1,minWidth:70,padding:"9px 8px",borderRadius:9,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              🖨️ PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return <div style={{flex:1,display:"flex",overflow:"hidden",fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",background:isDark?"transparent":"#f4f4f8",color:text}}>{content}</div>;
  return (
    <div style={{minHeight:"100vh",background:isDark?"#0f0c29":"#f8f9fa",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      <div style={{background:isDark?"rgba(255,255,255,0.05)":"#fff",borderBottom:`1px solid ${border}`,padding:"16px 24px"}}>
        <div style={{fontSize:20,fontWeight:800,color:text}}>✍️ {cfg.title}</div>
      </div>
      <div style={{height:"calc(100vh - 80px)",display:"flex"}}>{content}</div>
    </div>
  );
}
