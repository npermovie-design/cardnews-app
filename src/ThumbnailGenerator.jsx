import { useState, useRef, useCallback, useEffect } from "react";
import SimpleThumbnailEditor from "./SimpleThumbnailEditor";

/* ── Google Fonts 로더 ── */
const _loaded = new Set();
function loadFont(f) {
  if (!f || f==="sans-serif" || f==="serif" || f==="monospace" || _loaded.has(f)) return;
  _loaded.add(f);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

const FONT_LIST = [
  { name:"Noto Sans KR", label:"노토 산스" },
  { name:"Nanum Gothic", label:"나눔 고딕" },
  { name:"Nanum Myeongjo", label:"나눔 명조" },
  { name:"Black Han Sans", label:"검은 한산스" },
  { name:"Do Hyeon", label:"도현체" },
  { name:"Jua", label:"주아체" },
  { name:"Gugi", label:"구기체" },
  { name:"Gamja Flower", label:"감자꽃" },
  { name:"Nanum Pen Script", label:"나눔 손글씨" },
  { name:"Gothic A1", label:"고딕 A1" },
  { name:"Gowun Dodum", label:"고운 돋움" },
  { name:"Gowun Batang", label:"고운 바탕" },
  { name:"Sunflower", label:"해바라기" },
  { name:"IBM Plex Sans KR", label:"IBM 플렉스" },
  { name:"Montserrat", label:"Montserrat" },
  { name:"Playfair Display", label:"Playfair" },
  { name:"Oswald", label:"Oswald" },
  { name:"Bebas Neue", label:"Bebas Neue" },
];

/* ── 디자인 프리셋 (스타일+색상+배경) ── */
const DESIGN_PRESETS = [
  { id:"d1", label:"유튜브 레드", bgColor:"#1a1a2e", overlay:"rgba(0,0,0,0.3)", border:{color:"#ff0000",width:6}, gradient:"linear-gradient(135deg,rgba(255,0,0,0.3),transparent)",
    texts:[{text:"충격적인 진실",size:64,bold:true,color:"#ffffff",stroke:"#ff0000",strokeW:5,shadow:"4px 4px 12px rgba(0,0,0,0.8)",font:"Black Han Sans",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"조회수 폭발 비법",size:28,bold:true,color:"#ffdd00",stroke:"#000000",strokeW:2,shadow:"2px 2px 8px rgba(0,0,0,0.8)",font:"Do Hyeon",x:50,y:70,align:"center",bg:"",bgPad:0}]},
  { id:"d2", label:"미니멀 화이트", bgColor:"#ffffff", overlay:"", border:{color:"#e5e7eb",width:1}, gradient:"",
    texts:[{text:"깔끔한 제목",size:52,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"설명을 입력하세요",size:20,bold:false,color:"#666666",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:65,align:"center",bg:"",bgPad:0}]},
  { id:"d3", label:"네온 글로우", bgColor:"#0a0a1a", overlay:"", border:{color:"#00ffff",width:3}, gradient:"radial-gradient(circle at 30% 50%,rgba(99,102,241,0.15),transparent 60%)",
    texts:[{text:"NEON STYLE",size:60,bold:true,color:"#00ffff",stroke:"",strokeW:0,shadow:"0 0 20px #00ffff, 0 0 40px #00ffff",font:"Bebas Neue",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"감성 제목",size:24,bold:false,color:"#ff69b4",stroke:"",strokeW:0,shadow:"0 0 10px #ff69b4",font:"Nanum Pen Script",x:50,y:68,align:"center",bg:"",bgPad:0}]},
  { id:"d4", label:"그라데이션 블루", bgColor:"#667eea", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(135deg,#667eea,#764ba2)",
    texts:[{text:"트렌드 분석",size:56,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 15px rgba(0,0,0,0.4)",font:"Montserrat",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"2026 최신 트렌드",size:22,bold:false,color:"rgba(255,255,255,0.85)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:68,align:"center",bg:"",bgPad:0}]},
  { id:"d5", label:"다크 골드", bgColor:"#1a1a1a", overlay:"", border:{color:"#c8a84e",width:4}, gradient:"linear-gradient(180deg,rgba(200,168,78,0.1),transparent 40%,transparent 60%,rgba(200,168,78,0.1))",
    texts:[{text:"프리미엄 콘텐츠",size:52,bold:true,color:"#c8a84e",stroke:"",strokeW:0,shadow:"2px 2px 10px rgba(200,168,78,0.4)",font:"Nanum Myeongjo",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"PREMIUM",size:18,bold:true,color:"rgba(200,168,78,0.7)",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:65,align:"center",bg:"",bgPad:0}]},
  { id:"d6", label:"팝 컬러풀", bgColor:"#ff6b6b", overlay:"", border:{color:"#ffffff",width:5}, gradient:"linear-gradient(135deg,#ff6b6b,#ffa502,#ff6348)",
    texts:[{text:"꿀팁 대방출!",size:60,bold:true,color:"#ffffff",stroke:"#000000",strokeW:4,shadow:"4px 4px 0px #000000",font:"Jua",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"지금 바로 확인",size:24,bold:true,color:"#ffdd00",stroke:"#000000",strokeW:2,shadow:"2px 2px 0px #000000",font:"Do Hyeon",x:50,y:70,align:"center",bg:"",bgPad:0}]},
  { id:"d7", label:"뉴스 스타일", bgColor:"#1c2333", overlay:"", border:{color:"",width:0}, gradient:"",
    texts:[{text:"속보",size:28,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:15,y:18,align:"center",bg:"#dc2626",bgPad:12},
           {text:"오늘의 핵심 뉴스",size:48,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"2px 2px 8px rgba(0,0,0,0.5)",font:"Black Han Sans",x:50,y:55,align:"center",bg:"",bgPad:0}]},
  { id:"d8", label:"인스타 감성", bgColor:"#fdf6e3", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(180deg,#fdf6e3,#f5e6d3)",
    texts:[{text:"오늘의 기록",size:44,bold:true,color:"#2d3436",stroke:"",strokeW:0,shadow:"",font:"Gowun Batang",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"@username",size:18,bold:false,color:"#636e72",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:68,align:"center",bg:"",bgPad:0}]},
  { id:"d9", label:"게임/테크", bgColor:"#0d1117", overlay:"", border:{color:"#58a6ff",width:2}, gradient:"radial-gradient(ellipse at 80% 20%,rgba(88,166,255,0.12),transparent 50%)",
    texts:[{text:"최신 기술 리뷰",size:52,bold:true,color:"#58a6ff",stroke:"",strokeW:0,shadow:"0 0 15px rgba(88,166,255,0.5)",font:"Gothic A1",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"TECH REVIEW 2026",size:18,bold:true,color:"rgba(88,166,255,0.6)",stroke:"",strokeW:0,shadow:"",font:"Oswald",x:50,y:68,align:"center",bg:"",bgPad:0}]},
  { id:"d10", label:"요리/푸드", bgColor:"#2d1f0e", overlay:"rgba(0,0,0,0.2)", border:{color:"",width:0}, gradient:"radial-gradient(circle at 50% 50%,rgba(255,165,0,0.08),transparent 70%)",
    texts:[{text:"집밥 레시피",size:56,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 12px rgba(0,0,0,0.6)",font:"Jua",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"초간단 10분 완성",size:22,bold:true,color:"#ffa502",stroke:"",strokeW:0,shadow:"",font:"Do Hyeon",x:50,y:68,align:"center",bg:"rgba(0,0,0,0.5)",bgPad:10}]},
  // ── 좌측 정렬 ──
  { id:"d11", label:"좌측 볼드", bgColor:"#111827", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(90deg,rgba(99,102,241,0.15),transparent 60%)",
    texts:[{text:"당신이 몰랐던",size:26,bold:false,color:"rgba(255,255,255,0.6)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:8,y:35,align:"left",bg:"",bgPad:0},
           {text:"마케팅의 비밀",size:58,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 15px rgba(0,0,0,0.5)",font:"Black Han Sans",x:8,y:55,align:"left",bg:"",bgPad:0},
           {text:"TOP 5 전략 공개",size:20,bold:true,color:"#818cf8",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:8,y:75,align:"left",bg:"",bgPad:0}]},
  { id:"d12", label:"좌측 감성", bgColor:"#fefce8", overlay:"", border:{color:"",width:0}, gradient:"",
    texts:[{text:"오늘 하루도",size:20,bold:false,color:"#92400e",stroke:"",strokeW:0,shadow:"",font:"Gowun Batang",x:10,y:30,align:"left",bg:"",bgPad:0},
           {text:"수고했어",size:52,bold:true,color:"#78350f",stroke:"",strokeW:0,shadow:"",font:"Nanum Myeongjo",x:10,y:50,align:"left",bg:"",bgPad:0},
           {text:"내일은 더 좋은 날이 될 거야",size:16,bold:false,color:"#a16207",stroke:"",strokeW:0,shadow:"",font:"Gowun Batang",x:10,y:70,align:"left",bg:"",bgPad:0}]},
  // ── 우측 정렬 ──
  { id:"d13", label:"우측 임팩트", bgColor:"#18181b", overlay:"", border:{color:"#ef4444",width:0}, gradient:"linear-gradient(270deg,rgba(239,68,68,0.2),transparent 50%)",
    texts:[{text:"절대 놓치지 마세요",size:22,bold:false,color:"rgba(255,255,255,0.5)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:92,y:35,align:"right",bg:"",bgPad:0},
           {text:"역대급 할인",size:56,bold:true,color:"#ef4444",stroke:"",strokeW:0,shadow:"3px 3px 12px rgba(239,68,68,0.4)",font:"Black Han Sans",x:92,y:55,align:"right",bg:"",bgPad:0},
           {text:"최대 80% OFF",size:28,bold:true,color:"#ffffff",stroke:"#ef4444",strokeW:3,shadow:"",font:"Bebas Neue",x:92,y:75,align:"right",bg:"",bgPad:0}]},
  // ── 상단 배치 ──
  { id:"d14", label:"상단 강조", bgColor:"#0f172a", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(180deg,rgba(59,130,246,0.2),transparent 40%)",
    texts:[{text:"NEW",size:18,bold:true,color:"#3b82f6",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:50,y:15,align:"center",bg:"rgba(59,130,246,0.15)",bgPad:10},
           {text:"완전 정복 가이드",size:54,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 15px rgba(0,0,0,0.5)",font:"Black Han Sans",x:50,y:38,align:"center",bg:"",bgPad:0},
           {text:"초보부터 고급까지 A to Z",size:20,bold:false,color:"rgba(255,255,255,0.6)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:58,align:"center",bg:"",bgPad:0}]},
  // ── 하단 배치 ──
  { id:"d15", label:"하단 자막형", bgColor:"#000000", overlay:"linear-gradient(0deg,rgba(0,0,0,0.9) 30%,transparent 70%)", border:{color:"",width:0}, gradient:"",
    texts:[{text:"여행 브이로그",size:48,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"2px 2px 8px rgba(0,0,0,0.8)",font:"Jua",x:50,y:75,align:"center",bg:"",bgPad:0},
           {text:"제주도 3박 4일",size:22,bold:false,color:"rgba(255,255,255,0.7)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:90,align:"center",bg:"",bgPad:0}]},
  // ── 대각선/비대칭 ──
  { id:"d16", label:"대각선 분할", bgColor:"#1e293b", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(135deg,#6366f1 0%,#6366f1 48%,#ec4899 52%,#ec4899 100%)",
    texts:[{text:"VS",size:72,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"0 0 20px rgba(255,255,255,0.3)",font:"Bebas Neue",x:50,y:50,align:"center",bg:"",bgPad:0},
           {text:"A안",size:28,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:25,y:30,align:"center",bg:"",bgPad:0},
           {text:"B안",size:28,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:75,y:70,align:"center",bg:"",bgPad:0}]},
  // ── 매거진 스타일 ──
  { id:"d17", label:"매거진", bgColor:"#faf5f0", overlay:"", border:{color:"#1a1a2e",width:8}, gradient:"",
    texts:[{text:"ISSUE",size:14,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:12,align:"center",bg:"",bgPad:0},
           {text:"트렌드 리포트",size:46,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Playfair Display",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"2026 SPRING",size:16,bold:true,color:"#8b5cf6",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:65,align:"center",bg:"",bgPad:0}]},
  // ── 숫자 강조 ──
  { id:"d18", label:"숫자 강조", bgColor:"#0c0a09", overlay:"", border:{color:"",width:0}, gradient:"radial-gradient(circle at 50% 40%,rgba(234,179,8,0.08),transparent 50%)",
    texts:[{text:"TOP",size:20,bold:true,color:"#eab308",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:50,y:25,align:"center",bg:"",bgPad:0},
           {text:"10",size:120,bold:true,color:"#eab308",stroke:"",strokeW:0,shadow:"0 0 30px rgba(234,179,8,0.3)",font:"Bebas Neue",x:50,y:52,align:"center",bg:"",bgPad:0},
           {text:"꼭 알아야 할 것들",size:22,bold:false,color:"rgba(255,255,255,0.6)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:80,align:"center",bg:"",bgPad:0}]},
  // ── 교육/강의 ──
  { id:"d19", label:"강의/교육", bgColor:"#1e3a5f", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(135deg,#1e3a5f,#2d5a87)",
    texts:[{text:"무료 특강",size:20,bold:true,color:"#fbbf24",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:20,align:"center",bg:"rgba(251,191,36,0.15)",bgPad:10},
           {text:"파이썬 입문",size:52,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"2px 2px 10px rgba(0,0,0,0.4)",font:"Gothic A1",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"비전공자도 쉽게 따라하는",size:18,bold:false,color:"rgba(255,255,255,0.7)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:65,align:"center",bg:"",bgPad:0},
           {text:"지금 바로 시작하기 →",size:16,bold:true,color:"#fbbf24",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:85,align:"center",bg:"rgba(251,191,36,0.2)",bgPad:10}]},
  // ── 패션/뷰티 ──
  { id:"d20", label:"패션/뷰티", bgColor:"#fdf2f8", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(180deg,#fdf2f8,#fce7f3)",
    texts:[{text:"BEAUTY",size:14,bold:true,color:"#be185d",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:18,align:"center",bg:"",bgPad:0},
           {text:"봄 메이크업",size:48,bold:true,color:"#831843",stroke:"",strokeW:0,shadow:"",font:"Nanum Myeongjo",x:50,y:42,align:"center",bg:"",bgPad:0},
           {text:"트렌드 컬러 5가지",size:20,bold:false,color:"#9d174d",stroke:"",strokeW:0,shadow:"",font:"Gowun Batang",x:50,y:62,align:"center",bg:"",bgPad:0}]},
  // ── 추가 디자인 ──
  { id:"d21", label:"스플릿 좌우", bgColor:"#0f172a", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(90deg,#1e40af 0%,#1e40af 50%,#0f172a 50%,#0f172a 100%)",
    texts:[{text:"BEFORE",size:20,bold:true,color:"rgba(255,255,255,0.5)",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:25,y:25,align:"center",bg:"",bgPad:0},
           {text:"AFTER",size:20,bold:true,color:"rgba(255,255,255,0.5)",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:75,y:25,align:"center",bg:"",bgPad:0},
           {text:"변화의 순간",size:48,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 15px rgba(0,0,0,0.5)",font:"Black Han Sans",x:50,y:55,align:"center",bg:"",bgPad:0}]},
  { id:"d22", label:"그린 자연", bgColor:"#14532d", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(180deg,#14532d,#166534,#15803d)",
    texts:[{text:"건강한 라이프",size:52,bold:true,color:"#bbf7d0",stroke:"",strokeW:0,shadow:"2px 2px 10px rgba(0,0,0,0.4)",font:"Jua",x:50,y:42,align:"center",bg:"",bgPad:0},
           {text:"내 몸이 달라지는 습관",size:20,bold:false,color:"rgba(187,247,208,0.7)",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:65,align:"center",bg:"",bgPad:0}]},
  { id:"d23", label:"레트로 팝", bgColor:"#fbbf24", overlay:"", border:{color:"#1a1a2e",width:6}, gradient:"",
    texts:[{text:"HOT",size:24,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:50,y:18,align:"center",bg:"#ef4444",bgPad:12},
           {text:"지금 안 보면 후회",size:48,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Do Hyeon",x:50,y:48,align:"center",bg:"",bgPad:0},
           {text:"역대급 꿀팁 모음",size:22,bold:true,color:"#7c2d12",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:72,align:"center",bg:"",bgPad:0}]},
  { id:"d24", label:"시네마틱", bgColor:"#000000", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(180deg,transparent,rgba(0,0,0,0.8))",
    texts:[{text:"",size:2,bold:false,color:"transparent",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:50,y:8,align:"center",bg:"",bgPad:0},
           {text:"cinematic",size:14,bold:true,color:"rgba(255,255,255,0.3)",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:30,align:"center",bg:"",bgPad:0},
           {text:"감성 영상 브이로그",size:52,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"0 4px 20px rgba(0,0,0,0.8)",font:"Nanum Myeongjo",x:50,y:55,align:"center",bg:"",bgPad:0}]},
  { id:"d25", label:"코딩/개발", bgColor:"#0d1117", overlay:"", border:{color:"#30363d",width:1}, gradient:"",
    texts:[{text:"> console.log",size:16,bold:false,color:"#7ee787",stroke:"",strokeW:0,shadow:"",font:"monospace",x:8,y:22,align:"left",bg:"",bgPad:0},
           {text:"개발자 필수 스킬",size:48,bold:true,color:"#c9d1d9",stroke:"",strokeW:0,shadow:"",font:"Gothic A1",x:8,y:50,align:"left",bg:"",bgPad:0},
           {text:"#코딩 #프로그래밍 #IT",size:16,bold:false,color:"#58a6ff",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:8,y:75,align:"left",bg:"",bgPad:0}]},
  { id:"d26", label:"럭셔리 블랙", bgColor:"#000000", overlay:"", border:{color:"#d4af37",width:2}, gradient:"radial-gradient(ellipse at 50% 50%,rgba(212,175,55,0.06),transparent 70%)",
    texts:[{text:"LUXURY",size:16,bold:true,color:"#d4af37",stroke:"",strokeW:0,shadow:"",font:"Playfair Display",x:50,y:22,align:"center",bg:"",bgPad:0},
           {text:"특별한 경험",size:52,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"",font:"Nanum Myeongjo",x:50,y:48,align:"center",bg:"",bgPad:0},
           {text:"LIMITED EDITION",size:14,bold:true,color:"#d4af37",stroke:"",strokeW:0,shadow:"",font:"Montserrat",x:50,y:70,align:"center",bg:"rgba(212,175,55,0.1)",bgPad:10}]},
  { id:"d27", label:"스포츠 에너지", bgColor:"#18181b", overlay:"", border:{color:"",width:0}, gradient:"linear-gradient(135deg,#ef4444,#f97316)",
    texts:[{text:"ENERGY",size:18,bold:true,color:"rgba(255,255,255,0.4)",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:50,y:20,align:"center",bg:"",bgPad:0},
           {text:"운동 루틴 공개",size:56,bold:true,color:"#ffffff",stroke:"#000",strokeW:4,shadow:"4px 4px 0px #000000",font:"Black Han Sans",x:50,y:50,align:"center",bg:"",bgPad:0},
           {text:"매일 30분이면 충분",size:22,bold:true,color:"#fef08a",stroke:"#000",strokeW:2,shadow:"",font:"Do Hyeon",x:50,y:75,align:"center",bg:"",bgPad:0}]},
  { id:"d28", label:"질문형", bgColor:"#312e81", overlay:"", border:{color:"",width:0}, gradient:"radial-gradient(circle at 50% 40%,rgba(129,140,248,0.15),transparent 60%)",
    texts:[{text:"?",size:100,bold:true,color:"rgba(129,140,248,0.2)",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:80,y:40,align:"center",bg:"",bgPad:0},
           {text:"이거 진짜예요?",size:52,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"3px 3px 15px rgba(0,0,0,0.4)",font:"Jua",x:40,y:45,align:"left",bg:"",bgPad:0},
           {text:"직접 확인해보세요",size:20,bold:false,color:"#a5b4fc",stroke:"",strokeW:0,shadow:"",font:"Noto Sans KR",x:40,y:70,align:"left",bg:"",bgPad:0}]},
  { id:"d29", label:"캘리그라피", bgColor:"#fef9ef", overlay:"", border:{color:"",width:0}, gradient:"",
    texts:[{text:"오늘도 힘내자",size:56,bold:true,color:"#1a1a2e",stroke:"",strokeW:0,shadow:"",font:"Nanum Pen Script",x:50,y:45,align:"center",bg:"",bgPad:0},
           {text:"당신은 충분히 잘하고 있어요",size:18,bold:false,color:"#6b7280",stroke:"",strokeW:0,shadow:"",font:"Gowun Batang",x:50,y:68,align:"center",bg:"",bgPad:0}]},
  { id:"d30", label:"3단 정보형", bgColor:"#1e293b", overlay:"", border:{color:"",width:0}, gradient:"",
    texts:[{text:"01",size:40,bold:true,color:"#3b82f6",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:20,y:40,align:"center",bg:"",bgPad:0},
           {text:"02",size:40,bold:true,color:"#8b5cf6",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:50,y:40,align:"center",bg:"",bgPad:0},
           {text:"03",size:40,bold:true,color:"#ec4899",stroke:"",strokeW:0,shadow:"",font:"Bebas Neue",x:80,y:40,align:"center",bg:"",bgPad:0},
           {text:"핵심 3가지 포인트",size:44,bold:true,color:"#ffffff",stroke:"",strokeW:0,shadow:"2px 2px 10px rgba(0,0,0,0.4)",font:"Black Han Sans",x:50,y:70,align:"center",bg:"",bgPad:0}]},
];

/* ── 사이즈 프리셋 ── */
const SIZE_PRESETS = [
  { id:"yt", label:"유튜브", w:1280, h:720 },
  { id:"ig_sq", label:"인스타 정사각", w:1080, h:1080 },
  { id:"ig_v", label:"인스타 세로", w:1080, h:1350 },
  { id:"ig_s", label:"인스타 스토리", w:1080, h:1920 },
  { id:"blog", label:"블로그 OG", w:1200, h:630 },
  { id:"fb", label:"페이스북 커버", w:1640, h:624 },
  { id:"tw", label:"트위터 헤더", w:1500, h:500 },
  { id:"custom", label:"커스텀", w:1280, h:720 },
];

const COLORS = ["#ffffff","#000000","#ff0000","#ffdd00","#00ff00","#00bfff","#ff69b4","#ff6600","#8b5cf6","#10b981","#1a1a2e","#c8a84e","#dc2626","#059669"];

const defaultText = () => ({
  id:"t"+Date.now(), x:50, y:50, w:60, h:15,
  text:"새 텍스트", size:32, bold:true, italic:false, color:"#ffffff",
  stroke:"#000000", strokeW:3, align:"center", valign:"middle",
  font:"Noto Sans KR", shadow:"2px 2px 8px rgba(0,0,0,0.5)",
  bg:"", bgPad:12, bgRadius:8, letterSpacing:0, lineHeight:1.3,
  rotate:0, opacity:1,
});

export default function ThumbnailGenerator({ isDark, user, onUserUpdate }) {
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = D ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = D ? "rgba(255,255,255,0.06)" : "#f5f5f5";

  const [sizePreset, setSizePreset] = useState("yt");
  const [canvasW, setCanvasW] = useState(1280);
  const [canvasH, setCanvasH] = useState(720);
  const [bgImg, setBgImg] = useState(null);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [overlay, setOverlay] = useState("rgba(0,0,0,0.3)");
  const [borderColor, setBorderColor] = useState("");
  const [borderWidth, setBorderWidth] = useState(0);
  const [gradient, setGradient] = useState("");
  const [texts, setTexts] = useState(DESIGN_PRESETS[0].texts.map(t=>({...defaultText(),...t})));
  const [selText, setSelText] = useState(0);
  const [customFonts, setCustomFonts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nper_custom_fonts")||"[]").map(f=>f.name); } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("design"); // design | bg | text
  const [editMode, setEditMode] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState(null);
  const canvasRef = useRef(null);
  const bgInputRef = useRef(null);
  const fontFileRef = useRef(null);

  // 디자인 프리셋 적용
  const applyDesign = (d) => {
    setBgColor(d.bgColor);
    setOverlay(d.overlay);
    setBorderColor(d.border?.color || "");
    setBorderWidth(d.border?.width || 0);
    setGradient(d.gradient || "");
    setTexts(d.texts.map(t => ({ ...defaultText(), ...t })));
    setSelText(0);
    d.texts.forEach(t => t.font && loadFont(t.font));
  };

  // 사이즈 변경
  const changeSize = (id) => {
    setSizePreset(id);
    const s = SIZE_PRESETS.find(p=>p.id===id);
    if (s && id !== "custom") { setCanvasW(s.w); setCanvasH(s.h); }
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImg(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updText = (idx, key, val) => setTexts(prev => prev.map((t,i) => i===idx ? {...t,[key]:val} : t));
  const addText = () => { setTexts(prev => [...prev, defaultText()]); setSelText(texts.length); };
  const delText = (idx) => { if (texts.length<=1) return; setTexts(prev=>prev.filter((_,i)=>i!==idx)); setSelText(Math.max(0,selText-1)); };
  const dupText = (idx) => { const c = {...texts[idx], id:"t"+Date.now(), y:Math.min(95,texts[idx].y+5)}; setTexts(prev=>[...prev,c]); setSelText(texts.length); };

  // Canvas 렌더링
  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvasW; canvas.height = canvasH;

    // 배경색
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const drawAfterBg = () => {
      // 그라데이션 오버레이 (CSS gradient를 canvas로 변환)
      if (gradient) {
        if (gradient.includes("linear-gradient")) {
          const grd = ctx.createLinearGradient(0, 0, canvasW, canvasH);
          // 간단한 2색 그라데이션 파싱
          const colors = gradient.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+|transparent/g) || [];
          if (colors.length >= 2) { grd.addColorStop(0, colors[0]); grd.addColorStop(1, colors[1]); }
          else if (colors.length === 1) { grd.addColorStop(0, colors[0]); grd.addColorStop(1, "transparent"); }
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (gradient.includes("radial-gradient")) {
          const grd = ctx.createRadialGradient(canvasW*0.5, canvasH*0.5, 0, canvasW*0.5, canvasH*0.5, Math.max(canvasW,canvasH)*0.6);
          const colors = gradient.match(/rgba?\([^)]+\)|#[0-9a-fA-F]+|transparent/g) || [];
          if (colors.length >= 2) { grd.addColorStop(0, colors[0]); grd.addColorStop(1, colors[1]); }
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, canvasW, canvasH);
        }
      }

      // 오버레이
      if (overlay) {
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      // 텍스트 렌더링
      texts.forEach(t => {
        const px = (t.x / 100) * canvasW;
        const py = (t.y / 100) * canvasH;

        ctx.save();
        if (t.rotate) { ctx.translate(px, py); ctx.rotate(t.rotate * Math.PI / 180); ctx.translate(-px, -py); }
        ctx.globalAlpha = t.opacity ?? 1;

        const fontStr = `${t.italic?"italic ":""}${t.bold?"bold ":""}${t.size}px "${t.font||"Noto Sans KR"}", sans-serif`;
        ctx.font = fontStr;
        ctx.textAlign = t.align || "center";
        ctx.textBaseline = "middle";
        if (t.letterSpacing) ctx.letterSpacing = `${t.letterSpacing}px`;

        const lines = t.text.split("\n");
        const lineH = t.size * (t.lineHeight || 1.3);
        const totalH = lines.length * lineH;

        // 배경 박스
        if (t.bg) {
          const maxW = lines.reduce((m,l) => Math.max(m, ctx.measureText(l).width), 0);
          const pad = t.bgPad || 12;
          const rad = t.bgRadius || 8;
          const bx = t.align==="center" ? px-maxW/2-pad : t.align==="right" ? px-maxW-pad : px-pad;
          const by = py - totalH/2 - pad;
          const bw = maxW + pad*2;
          const bh = totalH + pad*2;
          ctx.fillStyle = t.bg;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, rad);
          ctx.fill();
        }

        // 그림자
        if (t.shadow) {
          const m = t.shadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(rgba?\([^)]+\)|#[0-9a-fA-F]+)/);
          if (m) { ctx.shadowOffsetX=+m[1]; ctx.shadowOffsetY=+m[2]; ctx.shadowBlur=+m[3]; ctx.shadowColor=m[4]; }
          // 네온 글로우 (여러 그림자)
          const glows = t.shadow.split(",").map(s=>s.trim());
          if (glows.length > 1) {
            const g = glows[0].match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(rgba?\([^)]+\)|#[0-9a-fA-F]+)/);
            if (g) { ctx.shadowOffsetX=+g[1]; ctx.shadowOffsetY=+g[2]; ctx.shadowBlur=+g[3]; ctx.shadowColor=g[4]; }
          }
        }

        const startY = py - (totalH - lineH) / 2;
        lines.forEach((line, li) => {
          const ly = startY + li * lineH;
          if (t.stroke && t.strokeW > 0) {
            ctx.strokeStyle = t.stroke;
            ctx.lineWidth = t.strokeW;
            ctx.lineJoin = "round";
            ctx.shadowColor = "transparent"; // 외곽선에는 그림자 제거
            ctx.strokeText(line, px, ly);
            // 그림자 복원
            if (t.shadow) {
              const m = t.shadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(rgba?\([^)]+\)|#[0-9a-fA-F]+)/);
              if (m) { ctx.shadowOffsetX=+m[1]; ctx.shadowOffsetY=+m[2]; ctx.shadowBlur=+m[3]; ctx.shadowColor=m[4]; }
            }
          }
          ctx.fillStyle = t.color;
          ctx.fillText(line, px, ly);
        });

        ctx.restore();
      });

      // 전체 테두리
      if (borderColor && borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(borderWidth/2, borderWidth/2, canvasW-borderWidth, canvasH-borderWidth);
      }
    };

    if (bgImg) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const imgR = img.width/img.height, canR = canvasW/canvasH;
        let sw,sh,sx,sy;
        if (imgR>canR) { sh=img.height; sw=sh*canR; sx=(img.width-sw)/2; sy=0; }
        else { sw=img.width; sh=sw/canR; sx=0; sy=(img.height-sh)/2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
        drawAfterBg();
      };
      img.src = bgImg;
    } else {
      drawAfterBg();
    }
  }, [canvasW, canvasH, bgImg, bgColor, overlay, gradient, borderColor, borderWidth, texts]);

  useEffect(() => { render(); }, [render]);

  // 커스텀 폰트 복원
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("nper_custom_fonts")||"[]");
      stored.forEach(cf => {
        if (cf.data && !document.fonts.check(`12px "${cf.name}"`)) {
          try {
            const buf = Uint8Array.from(atob(cf.data), c=>c.charCodeAt(0)).buffer;
            const ff = new FontFace(cf.name, buf);
            ff.load().then(f => document.fonts.add(f)).catch(()=>{});
          } catch {}
        }
      });
      setCustomFonts(stored.map(f=>f.name));
    } catch {}
  }, []);

  const download = () => {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `thumbnail_${canvasW}x${canvasH}.png`;
    a.click();
  };

  const openEditor = () => {
    const c = canvasRef.current; if (!c) return;
    setEditImageUrl(c.toDataURL("image/png"));
    setEditMode(true);
  };

  const cur = texts[selText];
  const tabBtn = (id, label) => (
    <button onClick={()=>setActiveTab(id)}
      style={{ flex:1, padding:"8px", borderRadius:8, border:"none", fontSize:12, fontWeight:activeTab===id?700:500,
        background:activeTab===id?(D?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.12)"):"transparent",
        color:activeTab===id?"#a5b4fc":muted, cursor:"pointer" }}>
      {label}
    </button>
  );

  const sliderRow = (label, val, min, max, step, onChange, suffix="") => (
    <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:6 }}>
      <span style={{ fontSize:11, color:muted, minWidth:45 }}>{label}</span>
      <input type="range" min={min} max={max} step={step||1} value={val} onChange={e=>onChange(+e.target.value)} style={{ flex:1 }}/>
      <span style={{ fontSize:11, color:text, minWidth:35, textAlign:"right" }}>{val}{suffix}</span>
    </div>
  );

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:22, fontWeight:900, color:text }}>썸네일 생성기</div>
          <div style={{ fontSize:13, color:muted, marginTop:4 }}>유튜브·인스타·블로그 썸네일을 직접 디자인하세요</div>
        </div>

        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* 왼쪽: 미리보기 */}
          <div style={{ flex:1, minWidth:320 }}>
            <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}`, boxShadow:"0 8px 32px rgba(0,0,0,0.2)", marginBottom:12 }}>
              <canvas ref={canvasRef} style={{ width:"100%", height:"auto", display:"block" }}/>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={download} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c6aff,#8b5cf6)", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer" }}>PNG 다운로드</button>
              <button onClick={openEditor}
                style={{ padding:"12px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer" }}>편집</button>
              <button onClick={()=>{try{const d=canvasRef.current?.toDataURL("image/png");if(d){navigator.clipboard.write([new ClipboardItem({"image/png":fetch(d).then(r=>r.blob())})]);}}catch{}alert("복사됨!");}}
                style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${bdr}`, background:"transparent", color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>복사</button>
            </div>

            {/* 사이즈 프리셋 */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
              {SIZE_PRESETS.map(s => (
                <button key={s.id} onClick={()=>changeSize(s.id)}
                  style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${sizePreset===s.id?"#7c6aff":bdr}`,
                    background:sizePreset===s.id?"rgba(99,102,241,0.12)":"transparent",
                    color:sizePreset===s.id?"#a5b4fc":muted, fontSize:10, fontWeight:sizePreset===s.id?700:500, cursor:"pointer" }}>
                  {s.label}<span style={{fontSize:9,opacity:0.6,marginLeft:3}}>{s.w}x{s.h}</span>
                </button>
              ))}
            </div>
            {sizePreset==="custom" && (
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <input type="number" value={canvasW} onChange={e=>setCanvasW(+e.target.value)} placeholder="가로"
                  style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}/>
                <span style={{ color:muted, alignSelf:"center" }}>x</span>
                <input type="number" value={canvasH} onChange={e=>setCanvasH(+e.target.value)} placeholder="세로"
                  style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}/>
              </div>
            )}
          </div>

          {/* 오른쪽: 설정 패널 */}
          <div style={{ width:360, flexShrink:0 }}>
            {/* 탭 전환 */}
            <div style={{ display:"flex", gap:4, marginBottom:12, background:D?"rgba(255,255,255,0.05)":"#f0f0f0", borderRadius:10, padding:4 }}>
              {tabBtn("design","디자인")}
              {tabBtn("bg","배경")}
              {tabBtn("text","텍스트")}
            </div>

            {/* ═══ 디자인 프리셋 탭 ═══ */}
            {activeTab==="design" && (
              <div style={{ maxHeight:500, overflowY:"auto", paddingRight:4 }}>
                <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>디자인 프리셋</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {DESIGN_PRESETS.map(d => (
                    <button key={d.id} onClick={()=>applyDesign(d)}
                      style={{ padding:"12px 10px", borderRadius:10, border:`1px solid ${bdr}`,
                        background:d.gradient||d.bgColor, color:d.texts[0]?.color||"#fff",
                        fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center",
                        textShadow:d.texts[0]?.shadow||"1px 1px 3px rgba(0,0,0,0.5)",
                        ...(d.border?.color?{borderColor:d.border.color,borderWidth:d.border.width}:{}) }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ 배경 탭 ═══ */}
            {activeTab==="bg" && (
              <div style={{ maxHeight:500, overflowY:"auto", paddingRight:4 }}>
                {/* 배경 이미지 */}
                <div style={{ marginBottom:14, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:cardBg }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>배경 이미지</div>
                  <button onClick={()=>bgInputRef.current?.click()}
                    style={{ width:"100%", padding:"10px", borderRadius:8, border:`1.5px dashed ${bdr}`, background:"transparent", color:text, fontSize:12, cursor:"pointer" }}>
                    {bgImg?"이미지 변경":"이미지 업로드"}
                  </button>
                  <input ref={bgInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleBgUpload}/>
                  {bgImg && <button onClick={()=>setBgImg(null)} style={{ fontSize:11, color:"#f87171", background:"transparent", border:"none", cursor:"pointer", marginTop:4 }}>제거</button>}
                </div>

                {/* 배경색 */}
                <div style={{ marginBottom:14, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:cardBg }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>배경색</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {["#1a1a2e","#0a0a1a","#0d1117","#1c2333","#2d1f0e","#ffffff","#fdf6e3","#667eea","#ff6b6b","#1a1a1a"].map(c => (
                      <div key={c} onClick={()=>setBgColor(c)} style={{ width:24, height:24, borderRadius:6, background:c, cursor:"pointer", border:bgColor===c?"2px solid #7c6aff":`1px solid ${bdr}` }}/>
                    ))}
                    <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:24, height:24, border:"none", cursor:"pointer" }}/>
                  </div>
                </div>

                {/* 오버레이 */}
                <div style={{ marginBottom:14, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:cardBg }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>오버레이</div>
                  <select value={overlay} onChange={e=>setOverlay(e.target.value)}
                    style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}>
                    <option value="">없음</option>
                    <option value="rgba(0,0,0,0.2)">어둡게 20%</option>
                    <option value="rgba(0,0,0,0.4)">어둡게 40%</option>
                    <option value="rgba(0,0,0,0.6)">어둡게 60%</option>
                    <option value="rgba(0,0,0,0.8)">어둡게 80%</option>
                    <option value="rgba(255,255,255,0.2)">밝게 20%</option>
                    <option value="rgba(255,255,255,0.4)">밝게 40%</option>
                  </select>
                </div>

                {/* 전체 테두리 */}
                <div style={{ marginBottom:14, padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:cardBg }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>전체 테두리</div>
                  {sliderRow("두께", borderWidth, 0, 20, 1, v=>setBorderWidth(v), "px")}
                  {borderWidth > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                      {COLORS.slice(0,10).map(c => (
                        <div key={c} onClick={()=>setBorderColor(c)} style={{ width:22, height:22, borderRadius:5, background:c, cursor:"pointer", border:borderColor===c?"2px solid #7c6aff":`1px solid ${bdr}` }}/>
                      ))}
                      <input type="color" value={borderColor||"#ffffff"} onChange={e=>setBorderColor(e.target.value)} style={{ width:22, height:22, border:"none", cursor:"pointer" }}/>
                    </div>
                  )}
                </div>

                {/* 그라데이션 */}
                <div style={{ padding:"12px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:cardBg }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>그라데이션</div>
                  <select value={gradient} onChange={e=>setGradient(e.target.value)}
                    style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none" }}>
                    <option value="">없음</option>
                    <option value="linear-gradient(135deg,rgba(99,102,241,0.3),transparent)">보라 대각선</option>
                    <option value="linear-gradient(135deg,rgba(255,0,0,0.3),transparent)">레드 대각선</option>
                    <option value="linear-gradient(135deg,#667eea,#764ba2)">블루-퍼플</option>
                    <option value="linear-gradient(135deg,#ff6b6b,#ffa502,#ff6348)">선셋</option>
                    <option value="linear-gradient(180deg,transparent,rgba(0,0,0,0.8))">하단 페이드</option>
                    <option value="linear-gradient(0deg,transparent,rgba(0,0,0,0.6))">상단 페이드</option>
                    <option value="radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)">보라 원형</option>
                    <option value="radial-gradient(circle,rgba(255,165,0,0.1),transparent 70%)">오렌지 원형</option>
                    <option value="linear-gradient(135deg,#0f0c29,#302b63,#24243e)">다크 퍼플</option>
                    <option value="linear-gradient(135deg,#11998e,#38ef7d)">민트 그린</option>
                  </select>
                </div>
              </div>
            )}

            {/* ═══ 텍스트 탭 ═══ */}
            {activeTab==="text" && (
              <div style={{ maxHeight:600, overflowY:"auto", paddingRight:4 }}>
                {/* 레이어 목록 */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:muted }}>텍스트 레이어</span>
                  <button onClick={addText} style={{ fontSize:11, padding:"3px 10px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:"#7c6aff", cursor:"pointer", fontWeight:700 }}>+ 추가</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:12 }}>
                  {texts.map((t, i) => (
                    <div key={i} onClick={()=>setSelText(i)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", borderRadius:8,
                        border:`1px solid ${selText===i?"#7c6aff":bdr}`,
                        background:selText===i?"rgba(99,102,241,0.1)":"transparent", cursor:"pointer" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:selText===i?"#a5b4fc":muted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {t.text.slice(0,20)||"텍스트"}
                      </span>
                      <button onClick={e=>{e.stopPropagation();dupText(i);}} style={{ fontSize:10, color:"#7c6aff", background:"transparent", border:"none", cursor:"pointer" }}>복제</button>
                      {texts.length>1 && <button onClick={e=>{e.stopPropagation();delText(i);}} style={{ fontSize:10, color:"#f87171", background:"transparent", border:"none", cursor:"pointer" }}>✕</button>}
                    </div>
                  ))}
                </div>

                {/* 선택된 텍스트 편집 */}
                {cur && (
                  <div style={{ padding:"14px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg }}>
                    {/* 텍스트 내용 */}
                    <textarea value={cur.text} onChange={e=>updText(selText,"text",e.target.value)} rows={2}
                      placeholder="텍스트 (줄바꿈 가능)"
                      style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:cur.font||"inherit", lineHeight:1.5 }}/>

                    {/* 폰트 */}
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontSize:10, color:muted, marginBottom:3 }}>폰트</div>
                      <select value={cur.font||"Noto Sans KR"} onChange={e=>{loadFont(e.target.value);updText(selText,"font",e.target.value);}}
                        style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:12, outline:"none", fontFamily:cur.font }}>
                        {FONT_LIST.map(f => <option key={f.name} value={f.name} style={{fontFamily:f.name}}>{f.label}</option>)}
                        {customFonts.map(f => <option key={f} value={f}>{f} (업로드)</option>)}
                      </select>
                      <button onClick={()=>fontFileRef.current?.click()}
                        style={{ width:"100%", marginTop:4, padding:"5px", borderRadius:6, border:`1px dashed ${bdr}`, background:"transparent", color:muted, fontSize:10, cursor:"pointer" }}>
                        + 내 폰트 업로드 (.otf .ttf .woff2)
                      </button>
                      <input ref={fontFileRef} type="file" accept=".otf,.ttf,.woff,.woff2" style={{display:"none"}} onChange={async e=>{
                        const file=e.target.files?.[0]; if(!file) return;
                        const name=file.name.replace(/\.[^.]+$/,"");
                        try { const ff=new FontFace(name,await file.arrayBuffer()); await ff.load(); document.fonts.add(ff);
                          setCustomFonts(p=>[...p.filter(n=>n!==name),name]); updText(selText,"font",name); } catch(err){ alert("폰트 로드 실패: "+err.message); }
                        e.target.value="";
                      }}/>
                    </div>

                    {/* 크기 / 위치 */}
                    {sliderRow("크기", cur.size, 12, 120, 1, v=>updText(selText,"size",v), "px")}
                    {sliderRow("X 위치", cur.x, 0, 100, 1, v=>updText(selText,"x",v), "%")}
                    {sliderRow("Y 위치", cur.y, 0, 100, 1, v=>updText(selText,"y",v), "%")}
                    {sliderRow("자간", cur.letterSpacing||0, -5, 20, 1, v=>updText(selText,"letterSpacing",v), "px")}
                    {sliderRow("행간", Math.round((cur.lineHeight||1.3)*10)/10, 0.8, 2.5, 0.1, v=>updText(selText,"lineHeight",v), "")}
                    {sliderRow("회전", cur.rotate||0, -180, 180, 1, v=>updText(selText,"rotate",v), "°")}
                    {sliderRow("투명도", Math.round((cur.opacity??1)*100), 0, 100, 5, v=>updText(selText,"opacity",v/100), "%")}

                    {/* 스타일 버튼 */}
                    <div style={{ display:"flex", gap:4, marginTop:10, flexWrap:"wrap" }}>
                      <button onClick={()=>updText(selText,"bold",!cur.bold)}
                        style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${cur.bold?"#7c6aff":bdr}`, background:cur.bold?"rgba(99,102,241,0.15)":"transparent", color:cur.bold?"#a5b4fc":muted, fontSize:12, fontWeight:900, cursor:"pointer" }}>B 굵게</button>
                      <button onClick={()=>updText(selText,"italic",!cur.italic)}
                        style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${cur.italic?"#7c6aff":bdr}`, background:cur.italic?"rgba(99,102,241,0.15)":"transparent", color:cur.italic?"#a5b4fc":muted, fontSize:12, fontStyle:"italic", cursor:"pointer" }}>I 기울임</button>
                      {[["left","← 좌측"],["center","가운데"],["right","우측 →"]].map(([a,label]) => (
                        <button key={a} onClick={()=>updText(selText,"align",a)}
                          style={{ padding:"5px 8px", borderRadius:6, border:`1px solid ${cur.align===a?"#7c6aff":bdr}`, background:cur.align===a?"rgba(99,102,241,0.15)":"transparent", color:cur.align===a?"#a5b4fc":muted, fontSize:11, cursor:"pointer" }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* 글자색 */}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:10, color:muted, marginBottom:3 }}>글자색</div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {COLORS.map(c => <div key={c} onClick={()=>updText(selText,"color",c)} style={{ width:20, height:20, borderRadius:5, background:c, cursor:"pointer", border:cur.color===c?"2px solid #7c6aff":`1px solid ${bdr}` }}/>)}
                        <input type="color" value={cur.color} onChange={e=>updText(selText,"color",e.target.value)} style={{ width:20, height:20, border:"none", cursor:"pointer" }}/>
                      </div>
                    </div>

                    {/* 외곽선 */}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:10, color:muted, marginBottom:3 }}>외곽선</div>
                      {sliderRow("두께", cur.strokeW||0, 0, 12, 1, v=>updText(selText,"strokeW",v), "px")}
                      {(cur.strokeW||0)>0 && (
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:4 }}>
                          {COLORS.slice(0,8).map(c => <div key={c} onClick={()=>updText(selText,"stroke",c)} style={{ width:18, height:18, borderRadius:4, background:c, cursor:"pointer", border:cur.stroke===c?"2px solid #7c6aff":`1px solid ${bdr}` }}/>)}
                        </div>
                      )}
                    </div>

                    {/* 그림자 */}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:10, color:muted, marginBottom:3 }}>그림자</div>
                      <select value={cur.shadow||""} onChange={e=>updText(selText,"shadow",e.target.value)}
                        style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:11, outline:"none" }}>
                        <option value="">없음</option>
                        <option value="2px 2px 4px rgba(0,0,0,0.5)">기본</option>
                        <option value="3px 3px 10px rgba(0,0,0,0.7)">중간</option>
                        <option value="4px 4px 16px rgba(0,0,0,0.8)">강한</option>
                        <option value="4px 4px 0px #000000">하드 (각진)</option>
                        <option value="0 0 15px #00ffff, 0 0 30px #00ffff">네온 시안</option>
                        <option value="0 0 15px #ff69b4, 0 0 30px #ff69b4">네온 핑크</option>
                        <option value="0 0 15px #ffdd00, 0 0 30px #ffdd00">네온 옐로우</option>
                        <option value="0 0 20px rgba(99,102,241,0.6)">보라 글로우</option>
                        <option value="0 0 20px rgba(239,68,68,0.6)">레드 글로우</option>
                      </select>
                    </div>

                    {/* 텍스트 배경 박스 */}
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:10, color:muted, marginBottom:3 }}>배경 박스</div>
                      <select value={cur.bg||""} onChange={e=>updText(selText,"bg",e.target.value)}
                        style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:`1px solid ${bdr}`, background:inputBg, color:text, fontSize:11, outline:"none" }}>
                        <option value="">없음</option>
                        <option value="rgba(0,0,0,0.5)">검정 50%</option>
                        <option value="rgba(0,0,0,0.7)">검정 70%</option>
                        <option value="rgba(0,0,0,0.9)">검정 90%</option>
                        <option value="rgba(255,255,255,0.3)">흰색 30%</option>
                        <option value="rgba(255,255,255,0.7)">흰색 70%</option>
                        <option value="rgba(99,102,241,0.7)">보라</option>
                        <option value="#dc2626">빨강</option>
                        <option value="#059669">초록</option>
                        <option value="#f59e0b">노랑</option>
                        <option value="rgba(0,0,0,0.4)">반투명</option>
                      </select>
                      {cur.bg && <>
                        {sliderRow("패딩", cur.bgPad||12, 0, 40, 2, v=>updText(selText,"bgPad",v), "px")}
                        {sliderRow("둥글기", cur.bgRadius||8, 0, 30, 2, v=>updText(selText,"bgRadius",v), "px")}
                      </>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* fabric.js 라이브 편집 모달 */}
      {editMode && editImageUrl && (
        <SimpleThumbnailEditor
          imageDataUrl={editImageUrl}
          width={canvasW}
          height={canvasH}
          isDark={D}
          onClose={() => setEditMode(false)}
          onSave={(dataUrl) => {
            // 저장된 이미지를 배경으로 설정
            setBgImg(dataUrl);
            setEditMode(false);
          }}
        />
      )}
    </div>
  );
}
