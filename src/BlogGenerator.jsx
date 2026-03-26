import { useState, useEffect, useRef } from "react";
import { changePoints, getAiUsage, setAiUsage, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { useI18n } from "./i18n.jsx";

import { callAI, callAIStream } from "./aiClient";
import { isDarkTheme } from "./theme";
import ShareButton from "./ShareButton";
import LoadingAnimation from "./LoadingAnimation";
import KeywordInsightPanel from "./KeywordInsightPanel";

/* ── 블로그 결과 클린업 (이모지·마크다운 제거) ── */
function cleanBlogText(text) {
  if (!text) return text;
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}]/gu, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/[★☆●○■□▶▷◀◁♥♡→←↑↓⇒⇔☑☐✓✗✘※◎]/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]{3,}$/gm, '')
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
    buildPrompt(sub, f, tone, wc) {
      const w={short:"1,000~1,500자",medium:"2,000~3,000자",long:"4,000자 이상"}[wc];
      const t={friendly:"친근하고 유용한 정보 전달체",diary:"일기처럼 자연스럽고 솔직한",review:"객관적이고 구체적인 리뷰체",professional:"전문적이고 신뢰감 있는"}[tone];
      if(sub==="info")    return `네이버 블로그 정보성 글 (${w}, ${t})\n키워드: ${f.keyword}\n대상: ${f.target||"일반 독자"}\n${f.extra||""}\n\n- 검색 최적화 제목\n- 소제목은 일반 텍스트로 구조화\n- 실용적 팁/정보 위주\n- 마무리 단락 포함\n\n[필수] 이모티콘·이모지·특수기호(★●■▶♥)·마크다운(##·**·~~) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="visit")   return `네이버 블로그 체험·방문후기 (${w}, ${t})\n장소: ${f.keyword} / 위치: ${f.location||""} / 날짜: ${f.visitDate||"최근"} / 평점: ${f.rating||"4.5"}/5\n${f.extra||""}\n\n- 방문 전 기대→방문 과정→솔직 총평\n- 장단점 명확히, 재방문 의사 포함\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="travel")  return `네이버 블로그 여행후기 (${w}, ${t})\n여행지: ${f.keyword} / 장소: ${f.location||""} / 기간: ${f.duration||"당일"} / 예산: ${f.budget||""}\n${f.extra||""}\n\n- 일정별 구조화, 맛집/명소/교통 포함\n- 실제 여행자 감성, 예산 팁 포함\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="product") return `네이버 블로그 제품후기 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 구매 전 고민→언박싱→실사용 구조\n- 추천 대상·가성비 총평 포함\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="column")  return `네이버 블로그 칼럼 (${w}, 전문적이고 논리적인 칼럼체)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천해주세요:\n제목: (SEO 최적화된 제목)\n부제목: (핵심 내용 요약)\n\n- 주장→근거→반론→결론 구조\n- 데이터·사례·통계 인용\n- 전문가적 시각으로 깊이 있는 분석\n- 독자에게 시사점 제시\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="article") return `네이버 블로그 기사 방식 글 (${w}, 객관적이고 보도 형식의)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천해주세요:\n제목: (뉴스 기사 스타일 제목)\n부제목: (핵심 내용 한 줄 요약)\n\n- 역피라미드 구조 (핵심→세부→배경)\n- 5W1H (누가, 무엇을, 언제, 어디서, 왜, 어떻게) 포함\n- 객관적 사실 기반, 인용·출처 형식 활용\n- 전문 용어 병기, 수치/통계 활용\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
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
    buildPrompt(sub, f, tone, wc) {
      const w={short:"1,500~2,000자",medium:"2,500~3,500자",long:"4,000자 이상"}[wc];
      const t={professional:"전문적이고 신뢰감 있는",friendly:"친근하고 쉬운",analytical:"분석적이고 논리적인"}[tone];
      if(sub==="info")    return `티스토리 SEO 최적화 정보성 글 (${w}, ${t})\n키워드: ${f.keyword} / 대상: ${f.target||"일반"}\n${f.extra||""}\n\n- 소제목은 일반 텍스트로 (마크다운 ## 사용 금지)\n- 키워드 제목·소제목에 자연스럽게 포함\n- 결론에 CTA 포함, 관련 키워드 녹임\n\n[필수] 이모티콘·이모지·특수기호(★●■)·마크다운(##·###·**·~~) 절대 사용 금지. 순수 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="review")  return `티스토리 제품·서비스 리뷰 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 상세 스펙·실사용 경험·객관적 평가\n- 구매 가이드 제공\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="howto")   return `티스토리 How-to 가이드 (${w}, ${t})\n주제: ${f.keyword} / 단계: ${f.steps||""}\n${f.extra||""}\n\n- 번호 매긴 단계별 설명 (숫자 목록은 허용)\n- 각 단계 팁·주의사항, FAQ 포함\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="opinion") return `티스토리 칼럼/의견 (${w}, ${t})\n주제: ${f.keyword} / 핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n- 주장→근거→반론→결론 구조\n- 데이터·사례 언급, 독자 공감 유도\n\n[필수] 이모티콘·이모지·특수기호·마크다운(##·**) 절대 사용 금지. 순수 문장만 작성. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="column")  return `티스토리 전문 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (SEO 키워드 포함 제목)\n부제목: (핵심 한 줄 요약)\n\n- 주장→근거→반론→결론\n- 데이터·사례·통계 인용\n\n[필수] 이모티콘·특수기호·마크다운 금지. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="article") return `티스토리 기사 방식 글 (${w}, 보도 형식)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 역피라미드 구조\n- 5W1H, 객관적 사실 기반\n\n[필수] 이모티콘·특수기호·마크다운 금지. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
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
    buildPrompt(sub, f, tone, wc) {
      const w={micro:"50자 이내 2~3줄",short:"120자 내외 5~6줄",medium:"250자 내외 10줄",long:"400자 내외 15줄 이상"}[wc];
      const t={emotional:"감성적이고 시적인",friendly:"친근하고 활발한",trendy:"트렌디하고 세련된",luxurious:"고급스럽고 우아한"}[tone];
      const htag="줄바꿈 후 관련 해시태그 15~20개";
      if(sub==="daily")   return `인스타그램 일상 피드 캡션 (${w}, ${t})\n상황: ${f.keyword} / 분위기: ${f.mood||""}\n${f.extra||""}\n\n- 첫 줄 강력한 훅 (이모지 없이 텍스트로)\n- 줄바꿈으로 가독성 확보\n- ${htag}\n\n[필수] 이모티콘·이모지·특수기호 절대 사용 금지. 해시태그만 허용`;
      if(sub==="product") return `인스타그램 제품 홍보 캡션 (${w}, ${t})\n제품: ${f.productName||f.keyword} / 가격: ${f.price||""}\n${f.extra||""}\n\n- 제품 매력 훅, 핵심 특징 3가지 이내\n- 구매 유도 CTA 포함\n- ${htag}`;
      if(sub==="info")    return `인스타그램 정보 피드 캡션 (${w}, ${t})\n주제: ${f.keyword} / 포인트: ${f.points||""}\n${f.extra||""}\n\n- "저장 필수" 유도 첫 문장\n- 번호 매긴 핵심 포인트\n- ${htag}`;
      if(sub==="event")   return `인스타그램 이벤트/공지 캡션 (${w}, ${t})\n이벤트: ${f.keyword} / 날짜: ${f.eventDate||""}\n${f.extra||""}\n\n- 강렬한 첫 줄 (이모지 없이 텍스트로), 참여 방법 명확히\n- ${htag}\n\n[필수] 이모티콘·이모지·특수기호 절대 사용 금지. 해시태그만 허용`;
      if(sub==="column")  return `인스타그램 칼럼 캡션 (${w}, 전문적이고 통찰력 있는)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 첫 줄에 추천 제목을 넣어주세요.\n\n- 전문 인사이트 공유, 깊이 있는 분석\n- 저장 유도 첫 문장\n- ${htag}`;
      if(sub==="article") return `인스타그램 기사 정리 캡션 (${w}, 객관적 보도체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 첫 줄에 추천 제목을 넣어주세요.\n\n- 핵심 뉴스/정보를 짧고 명확하게 정리\n- 팩트 중심, 출처 언급 형식\n- ${htag}`;
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
    buildPrompt(sub, f, tone, wc) {
      const w={"30s":"30초 분량(~150자)","1m":"1분 분량(~300자)","5m":"5분 분량(~700자)","10m":"10분 분량(~1,500자)","20m":"20분 분량(~3,000자)","1h":"1시간 분량(~9,000자, 섹션별)"}[wc];
      const t={energetic:"에너지틱하고 빠른 템포",calm:"차분하고 신뢰감 있는",educational:"교육적이고 체계적인",entertaining:"재미있고 친근한"}[tone];
      if(sub==="script") return `유튜브 영상 대본 (${w}, ${t})\n주제: ${f.keyword} / 타깃: ${f.target||"일반 시청자"}\n핵심 내용: ${f.mainPoints||""}\n${f.extra||""}\n\n[인트로-훅+예고] → [본론-핵심 단계별] → [아웃트로-구독유도]\n자연스러운 구어체, 화면 지시 포함`;
      if(sub==="desc")   return `유튜브 영상 설명란\n영상: ${f.keyword} / 길이: ${f.duration||"10분"}\n${f.extra||""}\n\n- 요약 2~3문장\n- 타임스탬프 (예시 시간 포함)\n- 관련 링크 섹션\n- 해시태그 10개\n- 채널 소개 문구`;
      if(sub==="shorts") return `유튜브 쇼츠 대본 (60초, ${t})\n주제: ${f.keyword} / 훅 아이디어: ${f.hook||""}\n${f.extra||""}\n\n[0~3초: 강력한 훅] → [3~50초: 핵심 임팩트] → [50~60초: 마무리·구독유도]\n짧고 강한 문장, 자막 가능하도록`;
      if(sub==="title")  return `유튜브 제목 5가지 + 썸네일 문구 제안\n영상 주제: ${f.keyword} / 각도: ${f.angle||""}\n\n- 클릭률 높은 제목 5가지 (숫자/궁금증/혜택 활용)\n- 각 제목별 썸네일 메인 문구\n- SEO 태그 10개`;
      if(sub==="column")  return `유튜브 칼럼 영상 대본 (${w}, 전문적이고 분석적인)\n주제: ${f.keyword}\n핵심 주장: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 대본 맨 처음에 추천 영상 제목과 부제목:\n제목: (클릭률 높은 칼럼 제목)\n부제목: (핵심 한 줄)\n\n[인트로-문제제기] → [본론-분석·근거] → [아웃트로-결론·구독유도]`;
      if(sub==="article") return `유튜브 뉴스 리뷰 대본 (${w}, 객관적 보도체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 대본 맨 처음에 추천 영상 제목과 부제목:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n[인트로-이슈 소개] → [본론-팩트 정리] → [아웃트로-시사점·구독유도]`;
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
    buildPrompt(sub, f, tone, wc) {
      const cnt={single:"1개 (1~3문장)",medium:"3개 연속글",long:"7개 연속글",mega:"10개 이상 연속글"}[wc];
      const t={casual:"친근한 일상 대화체",thoughtful:"사려 깊고 진지한",provocative:"강렬하고 도발적인",humorous:"유머러스하고 가볍게"}[tone];
      const fmt=`\n\n[필수]\n- 스레드 1개 게시물용 텍스트만 작성 (500자 이내)\n- [1/3] 같은 번호 절대 금지\n- 제목 없이 바로 본문 시작\n- 마크다운·이모지 금지\n- 줄바꿈으로 문단 구분\n- 마지막에 질문이나 공감 유도\n- 분량: ${cnt}`;
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
    buildPrompt(sub, f, tone, wc) {
      const w={short:"300~500자",medium:"600~900자",long:"1,000자 이상"}[wc];
      const t={friendly:"친근하고 자연스러운 일상체",informative:"유익하고 친절한",review:"솔직하고 공감 가는 후기체"}[tone];
      if(sub==="info")     return `네이버 카페 정보 게시글 (${w}, ${t})\n주제: ${f.keyword}\n대상: ${f.target||"카페 회원"}\n${f.extra||""}\n\n- 핵심 정보를 친근하게 전달\n- 소제목 없이 자연스러운 문단 구성\n- 마무리에 "도움이 됐으면 해요" 류 인사\n\n[필수] 이모티콘·특수기호·마크다운(##·**) 절대 사용 금지. 순수 한글 문장만`;
      if(sub==="review")   return `네이버 카페 후기 게시글 (${w}, ${t})\n대상: ${f.keyword} / 제품명: ${f.productName||""}\n장점: ${f.pros||""} / 단점: ${f.cons||""}\n${f.extra||""}\n\n- 구매/방문 동기부터 솔직 후기까지\n- 장단점 균형 있게\n- 추천 대상 언급으로 마무리\n\n[필수] 이모티콘·마크다운 절대 사용 금지. 순수 한글 문장만`;
      if(sub==="question") return `네이버 카페 질문 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 상황 설명 후 궁금한 점 명확히\n- 카페 회원들에게 도움 요청하는 자연스러운 글\n- 마지막에 감사 인사\n\n[필수] 이모티콘·마크다운 절대 사용 금지. 순수 한글 문장만`;
      if(sub==="free")     return `네이버 카페 자유 게시글 (${w}, ${t})\n주제: ${f.keyword}\n${f.extra||""}\n\n- 가볍고 친근한 일상 공유\n- 카페 분위기에 맞는 짧고 자연스러운 글\n\n[필수] 이모티콘·마크다운 절대 사용 금지. 순수 한글 문장만`;
      if(sub==="column")  return `네이버 카페 칼럼 (${w}, 전문적이고 논리적인)\n주제: ${f.keyword}\n핵심: ${f.mainPoint||""}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (카페에 적합한 전문 제목)\n부제목: (핵심 한 줄)\n\n- 주장→근거→결론 구조\n- 카페 회원 눈높이에 맞춘 전문 글\n\n[필수] 이모티콘·마크다운 금지. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
      if(sub==="article") return `네이버 카페 기사 스타일 글 (${w}, 객관적 정리체)\n주제: ${f.keyword}\n${f.extra||""}\n\n[필수] 글 맨 처음에 제목과 부제목을 추천:\n제목: (뉴스 스타일 제목)\n부제목: (핵심 한 줄)\n\n- 팩트 기반 정리, 수치/통계 활용\n- 카페 회원이 이해하기 쉬운 언어\n\n[필수] 이모티콘·마크다운 금지. 글 마지막에 줄바꿈 후 관련 해시태그 10개 추가`;
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
            ? <><b style={{color:text}}>비회원 무료 10회</b>를 모두 사용하셨어요.<br/>회원가입 후 <b style={{color:"#a5b4fc"}}>20회 추가 무료</b> + 포인트 적립 혜택을 받으세요!</>
            : <><b style={{color:text}}>{title}</b> 생성에 포인트가 필요해요.<br/>포인트를 충전하거나 관리자에게 문의해주세요.</>
          }
        </div>
        {/* 혜택 카드 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {(isGuest ? [
            { icon:"🎁", title:"회원가입 혜택", desc:"가입 즉시 200P 지급" },
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

export default function BlogGenerator({ initialType, embedded, menuLabel, theme, user, onLoginRequest, onUserUpdate }) {
  const cfg = PLATFORMS[initialType] || PLATFORMS.blog_naver;
  const isDark = isDarkTheme(theme) || (!theme && !!embedded);
  const { t } = useI18n();

  const [subtype,    setSubtype]    = useState(cfg.subtypes[0].id);
  const [fields,     setFields]     = useState({});
  const [tone,       setTone]       = useState(cfg.tones[0].id);
  const [wordCount,  setWordCount]  = useState(cfg.wordCounts[1]?.id || cfg.wordCounts[0].id);
  const [result,     setResult]     = useState("");
  const [htmlResult, setHtmlResult] = useState("");
  const [viewMode,   setViewMode]   = useState("text");
  const [loading,    setLoading]    = useState(false);
  useGeneratingGuard(loading, 10, initialType || "blog_write"); // 생성 중 이탈 방지
  const [copied,     setCopied]     = useState(false);
  const [snsConns,setSnsConns]=useState([]);const [publishing,setPublishing]=useState(null);const [publishResult,setPublishResult]=useState(null);
  const [error,      setError]      = useState("");
  const [titleSugg,  setTitleSugg]  = useState([]);
  const [seoKeys,    setSeoKeys]    = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [seoLoading,   setSeoLoading]   = useState(false);
  const [urlInput,   setUrlInput]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult,  setUrlResult]  = useState(null);
  const [suggestedImages, setSuggestedImages] = useState([]);
  const [imgSearching,    setImgSearching]    = useState(false);
  const [imgCopied,       setImgCopied]       = useState(null);
  const [imgInput,        setImgInput]        = useState("");

  useEffect(()=>{if(user?.uid)fetch(`/api/sns-connections?uid=${user.uid}`).then(r=>r.json()).then(d=>setSnsConns(d.connections||[])).catch(()=>{});},[user?.uid]);
  const handlePublish=async(platform)=>{if(!user?.uid||!result)return;setPublishing(platform);setPublishResult(null);try{const tags=result.match(/#[\wㄱ-ㅎ가-힣]+/g)?.join(",")||"";const r=await fetch("/api/sns-publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:user.uid,platform,title:fields.keyword||"",content:result,tags})});const data=await r.json();setPublishResult({platform,...data});}catch(e){setPublishResult({platform,success:false,error:e.message});}setPublishing(null);};

  // 숏폼 연계 데이터 자동 입력
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shorts_linked_data');
      if (raw) {
        const linked = JSON.parse(raw);
        if (linked.title || linked.content) {
          setFields(prev => ({ ...prev, keyword: linked.title || prev.keyword || "" }));
          if (linked.content) {
            setUrlResult({ title: linked.title || "", content: linked.content, type: "shorts" });
          }
          localStorage.removeItem('shorts_linked_data');
        }
      }
    } catch(e) {}
  }, []);

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
  // 크레딧/횟수 상태 (렌더 시 체크)
  const _getUsageState = () => {
    const _u = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _k = user ? ("member_" + (user.uid || "u")) : "guest";
    const _used = _u[_k] || 0;
    const _lim = user ? 20 : 5;
    const _pts = user ? (user.points || 0) : 0;
    const isGuest = !user;
    // 비회원: 5회 초과 시 차단 / 회원: 무료횟수 소진 + 포인트 부족 시 차단
    const exhausted = isGuest ? (_used >= _lim) : (_pts < 10 && _used >= _lim);
    return { used: _used, limit: _lim, points: _pts, exhausted, isGuest };
  };
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
  const accentRaw = cfg.accentColor || "#7c6aff";

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

  const IS = {width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box"};

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true); setUrlResult(null);
    try {
      const r = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await r.json();
      if (data.error) { alert(data.error); setUrlLoading(false); return; }
      setUrlResult(data);
      // keyword = title, extra = description + content
      if (data.title) setField("keyword", data.title.slice(0, 80));
      const desc = [data.description, data.content].filter(Boolean).join(" ").slice(0, 200);
      if (desc) setField("extra", (fields.extra ? fields.extra + "\n" : "") + "참고 내용: " + desc);
    } catch(e) { alert("URL 불러오기 실패: " + e.message); }
    setUrlLoading(false);
  };

  const suggestTitle = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setTitleLoading(true);
    try {
      const txt = await callAI("claude-haiku-4-5", [{role:"user",content:`키워드: ${fields.keyword}\nSEO 최적화 블로그 제목 3개만 번호 목록으로 답하세요.`}], 300);
      const ls = txt.split("\n").map(function(l){return l.replace(/^\d+\.?\s*/,"").trim();}).filter(function(l){return l.length>2;}).slice(0,3);
      setTitleSugg(ls);
    } catch(e) {}
    finally { setTitleLoading(false); }
  };

  const suggestSeo = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setSeoLoading(true);
    try {
      const txt = (await callAI("claude-haiku-4-5", [{role:"user",content:`메인 키워드: ${fields.keyword}\n연관 SEO 키워드 7개를 쉼표로만 나열하세요.`}], 150)).trim();
      const ks = txt.split(/[,，]/).map(function(k){return k.trim();}).filter(function(k){return k.length>0;}).slice(0,7);
      setSeoKeys(ks);
    } catch(e) {}
    finally { setSeoLoading(false); }
  };

  const generate = async () => {
    if (!fields.keyword?.trim()) { setError("키워드 / 주제를 입력해주세요."); return; }
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage(); // 비회원: 즉시 사용 횟수 차감
    // 사용 횟수 체크 (비회원 5회, 회원 20회)
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiLimit = user ? 20 : 5;
    const _aiPoints = user ? (user.points || 0) : 0;
    // 회원: 무료 횟수 소진 + 포인트 부족 → 차단
    if (user && _aiUsed >= _aiLimit && _aiPoints < 10) {
      setError("무료 횟수를 모두 사용했어요. 포인트를 충전해주세요.");
      return;
    }
    // 회원: 무료 횟수 남아있어도 포인트가 0이면 차단
    if (user && _aiPoints <= 0 && _aiUsed >= _aiLimit) {
      setError("포인트가 부족합니다. 충전 후 이용해주세요.");
      return;
    }
    setError(""); setLoading(true); setResult(""); setHtmlResult(""); setCopied(false);

    // 포인트 즉시 차감 (무료 횟수 소진 후에만)
    if (user && user.uid && _aiUsed >= _aiLimit) {
      changePoints(user.uid, -10, "블로그 글 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }

    const prompt = cfg.buildPrompt(subtype, fields, tone, wordCount);
    var _savedFull = "";
    try {
      const full = await callAIStream("claude-haiku-4-5", [{role:"user",content:prompt}], 4000, (accumulated) => {
        _savedFull = accumulated;
        setResult(cleanBlogText(accumulated));
      });
      if (isTistory) setHtmlResult(mdToHtml(full));
    } catch(e) { setError("생성 중 오류가 발생했습니다."); }
    finally {
      setLoading(false);
      if (user) { // 회원만 finally에서 횟수 증가 (비회원은 generate 시작 시점에 이미 처리)
        var _u2 = getAiUsage();
        var _k2 = "member_" + (user.uid || "u");
        var _newU2 = Object.assign({}, _u2);
        _newU2[_k2] = (_u2[_k2] || 0) + 1;
        setAiUsage(_newU2);
      }
      // 포인트 차감은 생성 시작 시점에 처리됨
      // 이미지 자동 추천
      if (_savedFull && fields.keyword) fetchImages(fields.keyword);
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

  /* ── 픽사베이·픽셀스 이미지 자동 추천 ── */
  const fetchImages = async (keyword) => {
    if (!keyword) return;
    setImgSearching(true); setSuggestedImages([]);
    const imgs = [];
    try {
      {
        const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(keyword)}&per_page=10&safesearch=true&image_type=photo&lang=ko`);
        const d = await r.json();
        (d.hits||[]).forEach(h => imgs.push({ id:"px"+h.id, preview:h.webformatURL, url:h.largeImageURL||h.webformatURL, src:"Pixabay" }));
      }
      {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(keyword)}&per_page=10`);
        const d = await r.json();
        (d.photos||[]).forEach(p => imgs.push({ id:"pe"+p.id, preview:p.src.medium, url:p.src.large2x||p.src.large, src:"Pexels" }));
      }
    } catch(e) {}
    setSuggestedImages(imgs);
    setImgSearching(false);
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
    // 크레딧/횟수 소진 체크
    const _us = _getUsageState();
    if (!loading && !result && _us.exhausted) {
      return <PointsExhausted isDark={isDark} isGuest={_us.isGuest} title="블로그 글"
        onLogin={() => { if(onLoginRequest) onLoginRequest(); }} />;
    }
    // 풀스크린 로딩 오버레이
    if (loading) {
      return <LoadingAnimation featureType={initialType || "blog_write"} title="AI가 글을 작성하고 있어요" subtitle={`${fields.keyword} · ${cfg.title}`} isDark={isDark} />;
    }
    if (!result && !loading) {
      const sub = cfg.subtypes.find(s=>s.id===subtype);
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40,textAlign:"center",maxWidth:900,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:16,fontWeight:800,color:text}}>{sub?.label}</div>
          <div style={{fontSize:13,color:muted,lineHeight:1.8,whiteSpace:"pre-line"}}>{t("introGuide")}</div>
          {examples.length>0&&<div style={{fontSize:11,color:muted,opacity:0.6}}>{t("example")}: {examples[0]}</div>}
        </div>
      );
    }
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:900,margin:"0 auto",width:"100%"}}>
        <div style={{height:46,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:`1px solid ${border}`,background:headerBg}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {isTistory && result && ["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"4px 10px",borderRadius:12,border:`1px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:viewMode===mode?700:400,cursor:"pointer"}}>
                {mode==="text"?"원문":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
            {!isTistory&&result&&<span style={{fontSize:12,fontWeight:700,color:text}}>{t("genResult")}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {result&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:12,
                background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                border:`1px solid ${border}`}}>
                <span style={{fontSize:10,color:muted}}>{t("charTotal")}</span>
                <span style={{fontSize:12,fontWeight:700,color:text}}>{result.length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>{t("charNoSpace")}</span>
                <span style={{fontSize:12,fontWeight:700,color:accent}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>{t("charWithSpace")}</span>
                <span style={{fontSize:12,fontWeight:700,color:muted}}>{result.replace(/\s/g," ").length.toLocaleString()}</span>
              </div>
            )}
            {result&&(
              <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result)}
                style={{padding:"5px 14px",borderRadius:12,border:`1px solid ${copied?"rgba(74,222,128,0.4)":border}`,
                  background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                  color:copied?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                {copied?("✓ "+t("copyDone")):("📋 "+t("copyBtn"))}
              </button>
            )}
            {result&&<ShareButton title={fields?.topic||"블로그 글"} text={result?.slice(0,300)} isDark={isDark} compact />}
            {result&&[{p:"naver_blog",l:"네이버",i:"/icon-naver-blog.png",c:"#03C75A",u:"https://blog.naver.com/PostWriteForm.naver"},{p:"tistory",l:"티스토리",i:"/icon-tistory.png",c:"#FF6B35",u:"https://www.tistory.com/auth/login?redirectUrl=https%3A%2F%2Fwww.tistory.com%2Fm%2Fentry%2Fwrite"},...snsConns.filter(c=>c.platform==="threads").map(c=>({p:"threads",l:c.platform_username||"스레드",i:"/icon-threads.png",c:"#000"}))].map(b=>{const isPub=publishing===b.p,done=publishResult?.platform===b.p;return<button key={b.p} onClick={async()=>{if(b.u){try{await navigator.clipboard.writeText(result)}catch{}window.open(b.u,"_blank");setPublishResult({platform:b.p,clipboard:true,message:`${b.l} 에디터에서 붙여넣기하세요`})}else handlePublish(b.p)}} disabled={isPub} style={{padding:"5px 12px",borderRadius:12,border:`1px solid ${done?"rgba(74,222,128,0.4)":b.c+"40"}`,background:done?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",color:done?"#4ade80":(isDark&&b.c==="#000"?"#fff":b.c),fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",opacity:isPub?0.6:1}}>{isPub?<div style={{width:10,height:10,borderRadius:"50%",border:`2px solid ${b.c}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>:<img src={b.i} alt="" style={{width:14,height:14,objectFit:"contain",borderRadius:2}}/>}{isPub?"발행 중...":done?(publishResult?.clipboard?"복사됨!":"발행!"):`${b.l}`}</button>})}
            {result&&isTistory&&["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)}
                style={{padding:"4px 10px",borderRadius:12,border:`1px solid ${viewMode===mode?accentRaw:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
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

          {publishResult&&<div style={{marginTop:12,padding:"12px 16px",borderRadius:12,display:"flex",alignItems:"center",gap:10,background:publishResult.success?(isDark?"rgba(74,222,128,0.08)":"#f0fdf4"):(isDark?"rgba(245,158,11,0.08)":"#fffbeb"),border:`1px solid ${publishResult.success?"rgba(74,222,128,0.2)":"rgba(245,158,11,0.2)"}`}}><span style={{fontSize:16}}>{publishResult.success?"✓":publishResult.clipboard?"📋":"✗"}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:publishResult.success?"#4ade80":publishResult.clipboard?"#f59e0b":"#f87171"}}>{publishResult.success?"발행 성공!":publishResult.clipboard?"클립보드에 복사됨":"발행 실패"}</div>{publishResult.postUrl&&<a href={publishResult.postUrl} target="_blank" rel="noopener" style={{fontSize:11,color:accent}}>게시글 확인 →</a>}{publishResult.message&&<div style={{fontSize:11,color:muted}}>{publishResult.message}</div>}{publishResult.error&&<div style={{fontSize:11,color:"#f87171"}}>{publishResult.error}</div>}</div><button onClick={()=>setPublishResult(null)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:14}}>✕</button></div>}
          {/* 연관 이미지 추천 */}
          {(imgSearching || suggestedImages.length > 0) && (
            <div style={{marginTop:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:800,color:text}}>📷 {t("relatedImages")}</span>
                <span style={{fontSize:11,color:muted,flex:1}}>Pixabay · Pexels</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={imgInput} onChange={e=>setImgInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&fetchImages(imgInput||fields.keyword)}
                    placeholder={t("searchKw")}
                    style={{padding:"5px 10px",borderRadius:12,border:`1px solid ${border}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:text,fontSize:12,outline:"none",width:150}}/>
                  <button onClick={()=>fetchImages(imgInput||fields.keyword)} disabled={imgSearching}
                    style={{padding:"5px 12px",borderRadius:12,border:"none",background:accent,color:"#fff",fontSize:12,fontWeight:700,cursor:imgSearching?"not-allowed":"pointer",opacity:imgSearching?0.6:1,whiteSpace:"nowrap"}}>
                    {imgSearching?"검색중...":"검색"}
                  </button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,paddingBottom:8}}>
                {imgSearching && Array.from({length:6}).map((_,i)=>(
                  <div key={i} style={{aspectRatio:"4/3",borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f6",border:`1px solid ${border}`,animation:"pulse 1.5s ease-in-out infinite"}}/>
                ))}
                {suggestedImages.map(img=>(
                  <div key={img.id} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${border}`,position:"relative",cursor:"pointer",aspectRatio:"4/3"}}
                    title="클릭: URL 복사 / ⬇: 다운로드">
                    <img src={img.preview} alt="" loading="lazy"
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                      onError={e=>e.target.parentElement.style.display="none"}/>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.5)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
                      <div style={{position:"absolute",top:4,right:4,display:"flex",gap:3}}>
                        <button onClick={(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(img.url); setImgCopied(img.id); setTimeout(()=>setImgCopied(null),2000); }}
                          style={{padding:"3px 7px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.9)",color:"#333",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                          {imgCopied===img.id?"✓":"📋"}
                        </button>
                        <button onClick={(e)=>{ e.stopPropagation();
                          fetch(img.url).then(r=>r.blob()).then(b=>{
                            const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="image.jpg";
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
                          }).catch(()=>window.open(img.url,"_blank"));
                        }}
                          style={{padding:"3px 7px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.9)",color:"#333",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                          ⬇
                        </button>
                      </div>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px"}}>
                        <span style={{fontSize:9,background:"rgba(0,0,0,0.6)",color:"#fff",padding:"1px 5px",borderRadius:12}}>{img.src}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,padding:"10px 14px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:`1px solid ${isDark?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.15)"}`}}>
                <div style={{fontSize:12,fontWeight:700,color:accent,marginBottom:6}}>💡 복사한 이미지 URL 활용법</div>
                <div style={{fontSize:11,color:muted,lineHeight:1.8}}>
                  <b style={{color:text}}>① 네이버 블로그</b> → 글쓰기 → 사진 → URL로 삽입 → 붙여넣기<br/>
                  <b style={{color:text}}>② 인스타그램</b> → 복사한 URL을 브라우저에서 열어 이미지 저장 후 업로드<br/>
                  <b style={{color:text}}>③ 티스토리</b> → 글쓰기 → 이미지 → URL 삽입 → 붙여넣기<br/>
                  <b style={{color:text}}>④ 직접 저장</b> → 이미지에 우클릭 → "이미지를 다른 이름으로 저장"
                </div>
                <div style={{fontSize:10,color:muted,marginTop:6,opacity:0.7}}>상업적 이용 시 Pixabay·Pexels 라이선스를 확인하세요. (대부분 무료 상업 이용 가능)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // eslint-disable-next-line no-unused-vars
  const [mobileTab, setMobileTab] = useState("input");
  // 현재 단계: 1=입력, 2=생성중, 3=결과
  const wizStep = loading ? 2 : result ? 3 : 1;
  const WSTEPS = [
    {n:1, label:t("inputStep")},
    {n:2, label:t("genStep")},
    {n:3, label:t("resultStep")},
  ];

  const content = (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column"}}>
      {/* 다시 생성 확인 모달 */}
      {showRegenConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:isDark?"rgba(18,16,58,0.98)":"#fff",border:"1px solid rgba(124,106,255,0.25)",borderRadius:20,padding:"36px 32px",maxWidth:380,width:"90%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(99,102,241,0.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </div>
            <div style={{fontSize:18,fontWeight:900,color:text,marginBottom:8}}>{t("regenTitle")}</div>
            <div style={{fontSize:13,color:muted,lineHeight:1.8,marginBottom:24,whiteSpace:"pre-line"}}>{t("regenDesc")}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowRegenConfirm(false)}
                style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                취소
              </button>
              <button onClick={()=>{ setShowRegenConfirm(false); setResult(""); setHtmlResult(""); generate(); }}
                style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {t("regenBtn")}
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
      `}</style>
      {/* 단계 없음 - 자동 전환 */}
      {/* 본문 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* 단계 1: 입력 폼 */}
        {wizStep===1 && (
          <div style={{maxWidth:720,margin:"0 auto",padding:"40px 20px 24px"}}>
            {/* URL 불러오기 */}
            <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("urlImportLabel")}</div>
              <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.6}}>뉴스 기사, 유튜브 링크를 붙여넣으면 주제를 자동으로 채워줘요</div>
              <div style={{display:"flex",gap:8}}>
                <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")fetchFromUrl();}}
                  placeholder="https://... URL 붙여넣기"
                  style={{flex:1,padding:"11px 14px",borderRadius:12,border:`1.5px solid ${inputBdr}`,background:inputBg,color:text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                  style={{padding:"8px 16px",borderRadius:12,border:"none",cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer",background:"rgba(99,102,241,0.18)",color:"#a5b4fc",fontSize:12,fontWeight:800,opacity:urlLoading||!urlInput.trim()?0.5:1,flexShrink:0,whiteSpace:"nowrap"}}>
                  {urlLoading?"불러오는 중...":"불러오기"}
                </button>
              </div>
              {urlResult && (
                <div style={{marginTop:10,padding:"8px 12px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.2)",display:"flex",gap:10,alignItems:"center"}}>
                  {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{width:40,height:28,objectFit:"cover",borderRadius:12,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{urlResult.title}</div>
                    <div style={{fontSize:11,color:muted,marginTop:1}}>{urlResult.type==="youtube"?"유튜브":urlResult.type==="news"?"뉴스":"웹페이지"} · 주제에 자동 입력됐어요</div>
                  </div>
                </div>
              )}
            </div>

            {/* 파일 업로드 분석 */}
            <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("fileImport")}</div>
              <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.6}}>{t("fileImportDesc")}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="file" accept="image/*,.pdf,.txt,.doc,.docx" style={{display:"none"}} id="blog-file-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = "";
                    if (file.size > 10 * 1024 * 1024) { alert("파일은 10MB 이하만 가능합니다."); return; }
                    setField("extra", (fields.extra ? fields.extra + "\n" : "") + "파일 분석 중...");
                    try {
                      if (file.type.startsWith("image/")) {
                        // 이미지: base64로 변환 후 AI 분석
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result;
                          const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:base64.split(",")[1]}},{type:"text",text:"이 이미지의 내용을 한국어로 상세히 설명해주세요. 블로그 글 주제로 사용할 수 있게 핵심 키워드와 설명을 제공해주세요."}]}], 500);
                          setField("keyword", txt.split("\n")[0]?.slice(0,80) || file.name);
                          setField("extra", (fields.extra?.replace("파일 분석 중...", "") || "") + "이미지 분석 결과:" + txt.slice(0, 200));
                        };
                        reader.readAsDataURL(file);
                      } else {
                        // 텍스트/PDF: 텍스트 추출
                        const text2 = await file.text();
                        const summary = text2.slice(0, 2000);
                        setField("keyword", summary.split("\n").find(l => l.trim().length > 5)?.trim()?.slice(0,80) || file.name);
                        setField("extra", (fields.extra?.replace("파일 분석 중...", "") || "") + "파일 내용:" + summary.slice(0, 300));
                      }
                    } catch(err) {
                      setField("extra", (fields.extra?.replace("파일 분석 중...", "") || "") + "파일 분석 실패:" + err.message);
                    }
                  }}/>
                <button onClick={() => document.getElementById("blog-file-input")?.click()}
                  style={{padding:"8px 16px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(99,102,241,0.18)",color:"#a5b4fc",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>
                  {t("fileSelect")}
                </button>
                <span style={{fontSize:11,color:muted}}>{t("fileLimit")}</span>
              </div>
            </div>

            {/* 글 타입 */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:10}}>{t("selectType")}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                {cfg.subtypes.map(s=>{
                  const isA=subtype===s.id;
                  return <button key={s.id} onClick={()=>handleSubtype(s.id)} style={{padding:"12px",borderRadius:12,textAlign:"left",cursor:"pointer",border:isA?`2px solid ${accent}`:`2px solid ${border}`,background:isA?accentBg:inputBg}}>
                    <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontSize:13,fontWeight:700,color:isA?accent:text}}>{s.label}</div>
                    <div style={{fontSize:11,color:muted,marginTop:2}}>{s.desc}</div>
                  </button>;
                })}
              </div>
            </div>

            {/* 예시 */}
            {examples.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>{t("exampleTopics")}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {examples.map(ex=><button key={ex} onClick={()=>setField("keyword",ex)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${border}`,background:fields.keyword===ex?accentBg:"transparent",color:fields.keyword===ex?accent:muted,fontSize:12,cursor:"pointer"}}>{ex}</button>)}
              </div>
            </div>}

            {/* 동적 필드 */}
            {currentFields.map(fk=>{
              const fl=FIELD_LABELS[fk]; if(!fl) return null;
              return <div key={fk} style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{fl.label}{fl.required&&<span style={{color:"#ef4444"}}> *</span>}</div>
                {fl.textarea
                  ?<textarea value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} rows={3} placeholder={fl.placeholder} style={{...IS,resize:"none",lineHeight:1.6}}/>
                  :<input type="text" value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} onKeyDown={e=>e.key==="Enter"&&fk==="keyword"&&generate()} placeholder={fl.placeholder} style={{...IS,borderColor:(error&&fk==="keyword")?"#ef4444":inputBdr}}/>
                }
                {fk==="keyword" && fields.keyword && fields.keyword.trim() && (
                  <div style={{marginTop:8,display:"flex",gap:6}}>
                    <button onClick={suggestTitle} disabled={titleLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {titleLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>추천 중...</>:"⭐ AI 제목 추천"}
                    </button>
                    <button onClick={suggestSeo} disabled={seoLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.08)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {seoLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid #10b981",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>조회 중...</>:"SEO 키워드"}
                    </button>
                  </div>
                )}
                {fk==="keyword" && titleSugg.length>0 && (
                  <div style={{marginTop:10,background:isDark?"rgba(99,102,241,0.08)":"#f0f0ff",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(99,102,241,0.15)"}}>
                    <div style={{fontSize:12,color:accent,fontWeight:700,marginBottom:8}}>⭐ 추천 제목 (클릭 시 적용)</div>
                    {titleSugg.map(function(t,i){return(
                      <div key={i} onClick={function(){setField("keyword",t);setTitleSugg([]);}} style={{fontSize:13,color:text,padding:"5px 0",cursor:"pointer",borderBottom:i<titleSugg.length-1?"1px solid "+border:"none",lineHeight:1.6}}>{t}</div>
                    );})}
                  </div>
                )}
                {fk==="keyword" && seoKeys.length>0 && (
                  <div style={{marginTop:10,background:isDark?"rgba(16,185,129,0.06)":"#f0fdf9",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(16,185,129,0.15)"}}>
                    <div style={{fontSize:12,color:"#10b981",fontWeight:700,marginBottom:8}}>SEO 연관 키워드</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {seoKeys.map(function(k,i){return(
                        <span key={i} onClick={function(){setField("extra",(fields.extra?fields.extra+", ":"")+k);}} style={{fontSize:12,padding:"4px 11px",borderRadius:12,background:"rgba(16,185,129,0.12)",color:"#10b981",cursor:"pointer",border:"1px solid rgba(16,185,129,0.2)"}}>{k}</span>
                      );})}
                    </div>
                  </div>
                )}
                {fk==="keyword"&&<KeywordInsightPanel keyword={fields.keyword} isDark={isDark} onKeywordSelect={(kw)=>setField("keyword",kw)}/>}
              </div>;
            })}
            {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10}}>{error}</div>}

            {/* 글 톤 */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>{t("selectTone")}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {cfg.tones.map(t=>{const isA=tone===t.id;return<button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:12,fontWeight:isA?700:400,cursor:"pointer"}}>{t.label}</button>;})}
              </div>
            </div>

            {/* 분량 */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>
                {t("selectLength")}
              </div>
              {initialType==="blog_insta" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 14px",borderRadius:12,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:64}}>
                      <span style={{fontSize:16,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                      <span style={{fontSize:10,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                    </button>;
                  })}
                </div>
              )}
              {initialType==="blog_youtube" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"7px 16px",borderRadius:20,cursor:"pointer",border:`2px solid ${isA?"#FF0000":border}`,background:isA?"rgba(255,0,0,0.1)":"transparent",whiteSpace:"nowrap"}}>
                      <span style={{fontSize:13,fontWeight:isA?800:500,color:isA?"#FF0000":text}}>⏱ {w.label}</span>
                    </button>;
                  })}
                </div>
              )}
              {initialType==="blog_thread" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 13px",borderRadius:12,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:64}}>
                      <span style={{fontSize:14,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                      <span style={{fontSize:10,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                    </button>;
                  })}
                </div>
              )}
              {initialType!=="blog_insta" && initialType!=="blog_youtube" && initialType!=="blog_thread" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cfg.wordCounts.map(w=>{
                    const isA=wordCount===w.id;
                    return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"7px 12px",borderRadius:12,cursor:"pointer",textAlign:"center",border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent"}}>
                      <div style={{fontSize:13,fontWeight:isA?700:400,color:isA?accent:text}}>{w.label}</div>
                      <div style={{fontSize:10,color:muted,marginTop:2}}>{w.desc}</div>
                    </button>;
                  })}
                </div>
              )}
            </div>

            {/* 생성 버튼 */}
            <button onClick={handleGenerateClick} disabled={loading||!fields.keyword?.trim()} style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),color:fields.keyword?.trim()?"#fff":muted,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading ? (<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>) : user ? (<span>✨ 글 생성하기 <span style={{fontSize:12,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 8px",borderRadius:8}}>10P</span></span>) : (<span>✦ 1회 생성해보기</span>)}
            </button>
          </div>
        )}
        {/* 단계 2~3: 결과 */}
        {wizStep>=2 && renderResult()}
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
