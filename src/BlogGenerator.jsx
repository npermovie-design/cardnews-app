import { useState, useEffect, useRef } from "react";
import { changePoints, getAiUsage, setAiUsage } from "./storage";

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


/* ── 마크다운 → JSX 렌더러 ── */
function renderMarkdown(text, isDark, textColor, mutedColor, accentColor) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
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
    else if(raw.startsWith("`")) parts.push(<code key={m.index} style={{background:"rgba(99,102,241,0.12)",color:accentColor,padding:"1px 6px",borderRadius:4,fontSize:"0.9em",fontFamily:"monospace"}}>{raw.slice(1,-1)}</code>);
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
export default function BlogGenerator({ initialType, embedded, menuLabel, theme, user }) {
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
  const [titleSugg,  setTitleSugg]  = useState([]);
  const [seoKeys,    setSeoKeys]    = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [seoLoading,   setSeoLoading]   = useState(false);

  // 이탈 방지
  useEffect(() => {
    const handler = (e) => {
      if (loading) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [loading]);

  // 다시 생성하기 확인
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const handleGenerateClick = () => {
    if (result && !loading) {
      setShowRegenConfirm(true);
    } else {
      generate();
    }
  };

  const handleSubtype = id => { setSubtype(id); setFields({}); setResult(""); setHtmlResult(""); setError(""); };
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

  const suggestTitle = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setTitleLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5", max_tokens:300,
          messages:[{role:"user",content:`키워드: ${fields.keyword}\nSEO 최적화 블로그 제목 3개만 번호 목록으로 답하세요.`}]})
      });
      const data = await res.json();
      const txt = (data.content||[]).map(function(b){return b.text||"";}).join("");
      const ls = txt.split("\n").map(function(l){return l.replace(/^\d+\.?\s*/,"").trim();}).filter(function(l){return l.length>2;}).slice(0,3);
      setTitleSugg(ls);
    } catch(e) {}
    finally { setTitleLoading(false); }
  };

  const suggestSeo = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setSeoLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5", max_tokens:150,
          messages:[{role:"user",content:`메인 키워드: ${fields.keyword}\n연관 SEO 키워드 7개를 쉼표로만 나열하세요.`}]})
      });
      const data = await res.json();
      const txt = (data.content||[]).map(function(b){return b.text||"";}).join("").trim();
      const ks = txt.split(/[,，]/).map(function(k){return k.trim();}).filter(function(k){return k.length>0;}).slice(0,7);
      setSeoKeys(ks);
    } catch(e) {}
    finally { setSeoLoading(false); }
  };

  const generate = async () => {
    if (!fields.keyword?.trim()) { setError("키워드 / 주제를 입력해주세요."); return; }
    // 사용 횟수 체크 (비회원 5회, 회원 20회)
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiLimit = user ? 20 : 5;
    const _aiPoints = user ? (user.points || 0) : 0;
    if (_aiUsed >= _aiLimit && _aiPoints < 10) {
      setError(user ? "무료 횟수(20회)를 모두 사용했어요. 포인트를 충전해주세요." : "비회원 무료 횟수(5회)를 모두 사용했어요. 회원가입 후 계속 이용하세요.");
      return;
    }
    setError(""); setLoading(true); setResult(""); setHtmlResult(""); setCopied(false);
    const prompt = cfg.buildPrompt(subtype, fields, tone, wordCount);
    var _savedFull = "";
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
            try { const p=JSON.parse(d); if(p.type==="content_block_delta"&&p.delta?.text){full+=p.delta.text;_savedFull=full;setResult(full);} } catch{}
          }
        }
      }
      if (isTistory) setHtmlResult(mdToHtml(full));
    } catch(e) { setError("생성 중 오류가 발생했습니다."); }
    finally {
      setLoading(false);
      var _u2 = getAiUsage();
      var _k2 = user ? ("member_" + (user.uid || "u")) : "guest";
      var _newU2 = Object.assign({}, _u2);
      _newU2[_k2] = (_u2[_k2] || 0) + 1;
      setAiUsage(_newU2);
      if (user && user.uid) { changePoints(user.uid, -10, "블로그 글 생성").catch(function(e) {}); }
      // 보관함 자동저장
      if (_savedFull && _savedFull.length > 50) {
        try {
          var _saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
          var _title = fields.keyword || "제목 없음";
          var _newSave = { id: Date.now().toString(), type: subtype, title: _title,
            content: cleanText(_savedFull), date: new Date().toLocaleDateString("ko-KR") };
          _saves.unshift(_newSave);
          localStorage.setItem("sns_blog_saves_v1", JSON.stringify(_saves.slice(0, 100)));
        } catch(e) {}
      }
    }
  };

  const cleanText = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  const cleanForCopy = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  const handleCopy = content => {
    const cleaned = cleanForCopy(content);
    navigator.clipboard.writeText(cleaned);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  // ── 결과 패널 ──
  const renderResult = () => {
    // 풀스크린 로딩 오버레이
    if (loading) {
      return (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",padding:"40px 24px",textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:16,display:"inline-block",animation:"bl-float 3s ease-in-out infinite",filter:"drop-shadow(0 8px 20px rgba(99,102,241,0.4))"}}>✍️✨</div>
          <div style={{fontSize:20,fontWeight:900,color:text,marginBottom:8,letterSpacing:"-0.5px"}}>AI가 글을 작성하고 있어요</div>
          <div style={{fontSize:13,color:muted,marginBottom:24}}>{fields.keyword} · {cfg.title}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"left",maxWidth:260,margin:"0 auto 20px"}}>
            {[{l:"주제 분석 중...",d:true},{l:"구조 기획 중...",d:true},{l:"본문 작성 중...",a:true},{l:"마무리 다듬는 중..."}].map(function(s,i){
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:s.d||s.a?1:0.3}}>
                  <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,
                    background:s.d?"rgba(74,222,128,0.15)":s.a?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.05)",
                    border:s.d?"2px solid #4ade80":s.a?"2px solid #6366f1":"2px solid rgba(255,255,255,0.1)"}}>
                    {s.d?<span style={{color:"#4ade80"}}>✓</span>:s.a?<div style={{width:8,height:8,borderRadius:"50%",border:"2px solid #6366f1",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>:null}
                  </div>
                  <span style={{fontSize:13,color:s.d?"#4ade80":s.a?text:muted,fontWeight:s.a?700:400}}>{s.l}</span>
                </div>
              );
            })}
          </div>
          <div style={{height:4,borderRadius:4,background:"rgba(255,255,255,0.08)",overflow:"hidden",maxWidth:260,margin:"0 auto 10px"}}>
            <div style={{height:"100%",borderRadius:4,background:"linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",animation:"bl-progress 12s ease-out forwards"}}/>
          </div>
          <div style={{fontSize:12,color:muted}}>보통 20~60초 소요</div>
        </div>
      );
    }
    if (!result && !loading) {
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
        <div style={{height:46,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:`1px solid ${border}`,background:headerBg}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {isTistory && result && ["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:viewMode===mode?700:400,cursor:"pointer"}}>
                {mode==="text"?"원문":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
            {!isTistory&&result&&<span style={{fontSize:12,fontWeight:700,color:text}}>생성 결과</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {result&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,
                background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                border:`1px solid ${border}`}}>
                <span style={{fontSize:10,color:muted}}>전체</span>
                <span style={{fontSize:12,fontWeight:700,color:text}}>{result.length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>공백제외</span>
                <span style={{fontSize:12,fontWeight:700,color:accent}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>공백포함</span>
                <span style={{fontSize:12,fontWeight:700,color:muted}}>{result.replace(/\s/g," ").length.toLocaleString()}</span>
              </div>
            )}
            {result&&(
              <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result)}
                style={{padding:"5px 14px",borderRadius:7,border:`1px solid ${copied?"rgba(74,222,128,0.4)":border}`,
                  background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                  color:copied?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                {copied?"✓ 복사됨":"📋 복사"}
              </button>
            )}
            {result&&isTistory&&["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)}
                style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${viewMode===mode?accentRaw:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {mode==="text"?"텍스트":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {(viewMode==="text"||!isTistory)&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"22px 24px",fontSize:15,color:text,minHeight:120,lineHeight:1.9}}>
            {renderMarkdown(result, isDark, text, muted, accentRaw)}
            {loading&&<span style={{display:"inline-block",width:2,height:14,background:accent,marginLeft:2,animation:"blink 1s infinite"}}/>}
          </div>}
          {isTistory&&viewMode==="html"&&htmlResult&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"18px 20px"}}><pre style={{fontSize:12,color:isDark?"#a5b4fc":"#4f46e5",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"'Consolas','Monaco',monospace",margin:0}}>{htmlResult}</pre></div>}
          {isTistory&&viewMode==="preview"&&htmlResult&&<div style={{background:"#fff",border:"1px solid #e9ecef",borderRadius:12,padding:"24px 28px"}} dangerouslySetInnerHTML={{__html:htmlResult}}/>}
        </div>
      </div>
    );
  };

  const [mobileTab, setMobileTab] = useState("input"); // "input" | "result"

  const content = (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column"}}>
      {/* 다시 생성 확인 모달 */}
      {showRegenConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:isDark?"rgba(18,16,58,0.98)":"#fff",border:"1px solid rgba(124,106,255,0.25)",borderRadius:20,padding:"36px 32px",maxWidth:380,width:"90%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:44,marginBottom:14}}>🔄</div>
            <div style={{fontSize:18,fontWeight:900,color:text,marginBottom:8}}>다시 생성하시겠습니까?</div>
            <div style={{fontSize:13,color:muted,lineHeight:1.8,marginBottom:24}}>현재 생성된 글이 사라지고<br/>처음부터 다시 시작합니다.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowRegenConfirm(false)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                취소
              </button>
              <button onClick={()=>{ setShowRegenConfirm(false); setResult(""); setHtmlResult(""); generate(); }}
                style={{flex:1,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                다시 생성
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes bl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes bl-progress{from{width:0%}to{width:100%}}
        @keyframes bl-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bl-popin{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
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
                  :<input type="text" value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} onKeyDown={e=>e.key==="Enter"&&fk==="keyword"&&generate()} placeholder={fl.placeholder} style={{...IS,borderColor:(error&&fk==="keyword")?"#ef4444":inputBdr}}/>
                }
                {fk==="keyword" && fields.keyword && fields.keyword.trim() && (
                  <div style={{marginTop:6,display:"flex",gap:5}}>
                    <button onClick={suggestTitle} disabled={titleLoading} style={{flex:1,padding:"6px 8px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {titleLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>추천 중...</>:"⭐ AI 제목 추천"}
                    </button>
                    <button onClick={suggestSeo} disabled={seoLoading} style={{flex:1,padding:"6px 8px",borderRadius:8,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.08)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {seoLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid #10b981",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>조회 중...</>:"🔍 SEO 키워드"}
                    </button>
                  </div>
                )}
                {fk==="keyword" && titleSugg.length>0 && (
                  <div style={{marginTop:8,background:isDark?"rgba(99,102,241,0.08)":"#f0f0ff",borderRadius:9,padding:"10px 12px",border:"1px solid rgba(99,102,241,0.15)"}}>
                    <div style={{fontSize:11,color:accent,fontWeight:700,marginBottom:6}}>⭐ 추천 제목 (클릭 시 적용)</div>
                    {titleSugg.map(function(t,i){return(
                      <div key={i} onClick={function(){setField("keyword",t);setTitleSugg([]);}} style={{fontSize:12,color:text,padding:"4px 0",cursor:"pointer",borderBottom:i<titleSugg.length-1?"1px solid "+border:"none",lineHeight:1.6}}>{t}</div>
                    );})}
                  </div>
                )}
                {fk==="keyword" && seoKeys.length>0 && (
                  <div style={{marginTop:8,background:isDark?"rgba(16,185,129,0.06)":"#f0fdf9",borderRadius:9,padding:"10px 12px",border:"1px solid rgba(16,185,129,0.15)"}}>
                    <div style={{fontSize:11,color:"#10b981",fontWeight:700,marginBottom:7}}>🔍 SEO 연관 키워드</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {seoKeys.map(function(k,i){return(
                        <span key={i} onClick={function(){setField("extra",(fields.extra?fields.extra+", ":"")+k);}} style={{fontSize:11,padding:"3px 9px",borderRadius:12,background:"rgba(16,185,129,0.12)",color:"#10b981",cursor:"pointer",border:"1px solid rgba(16,185,129,0.2)"}}>{k}</span>
                      );})}
                    </div>
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
            <button onClick={handleGenerateClick} disabled={loading||!fields.keyword?.trim()} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",background:fields.keyword?.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),color:fields.keyword?.trim()?"#fff":muted,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              {loading?(<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>):(<span>✨ 글 생성하기 <span style={{fontSize:11,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 6px",borderRadius:8}}>💎 10P</span></span>)}
            </button>
          </div>
        </div>
        {/* 우: 결과 */}
        <div className={"blog-panel-right" + (mobileTab==="input" ? " blog-hide-mobile" : "")}
          style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:resultBg}}>
          {renderResult()}
        </div>

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
