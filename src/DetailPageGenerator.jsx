import { useState, useRef } from "react";
import { changePoints } from "./storage";

/* ══════════════════════════════════════════════════════════════
   상세페이지 만들기 v7
   ✅ Nano Banana (gemini-2.5-flash-image) API로 전체 이미지 생성
   ✅ Canvas 완전 제거
   ✅ 한국어 프롬프트로 한국어 텍스트 이미지에 직접 렌더
   ✅ 참고 이미지 스타일 분석 → 동일 스타일 생성
   ✅ 상품 이미지 업로드 → 프롬프트에 설명 반영
   ✅ 최대 20장 / ZIP 저장
══════════════════════════════════════════════════════════════ */

const CLAUDE_KEY = "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";

// ── 스타일 템플릿 10종 ───────────────────────────────────────
const STYLE_TEMPLATES = [
  {
    id: "dark_luxury",
    label: "다크 럭셔리",
    desc: "어두운 배경, 골드 포인트",
    // 미리보기 CSS
    preview: {
      bg: "linear-gradient(135deg,#1a1208,#0d0d0d)",
      accent: "#c9a84c",
      textColor: "#fff",
      subColor: "rgba(201,168,76,0.7)",
      pattern: "diagonal",
    },
    prompt: "프리미엄 럭셔리 브랜드 스타일. 깊고 어두운 배경(#0d0d0d ~ #1a1208 그라데이션), 골드(#c9a84c) 포인트 컬러, 굵고 세련된 세리프 타이포그래피, 드라마틱한 스팟 조명, 고급 소재 질감, 샴페인 골드 라인과 장식 요소. 럭셔리 명품 브랜드 상세페이지 느낌.",
  },
  {
    id: "minimal_white",
    label: "미니멀 화이트",
    desc: "깔끔한 여백, 에디토리얼",
    preview: {
      bg: "#ffffff",
      accent: "#1a1a1a",
      textColor: "#1a1a1a",
      subColor: "#888",
      pattern: "clean",
    },
    prompt: "극도로 미니멀한 에디토리얼 디자인. 순백색 배경, 검정 타이포그래피, 넓은 여백, 얇은 라인 사용, 모노크롬 팔레트, 산세리프 볼드 폰트, 여백이 디자인 요소가 되는 스타일. 하이엔드 패션 매거진 레이아웃.",
  },
  {
    id: "warm_beige",
    label: "감성 내추럴",
    desc: "베이지/크림, 따뜻한 감성",
    preview: {
      bg: "linear-gradient(135deg,#f5ede0,#ede3d5)",
      accent: "#8b6f4e",
      textColor: "#3d2b1f",
      subColor: "#9e8070",
      pattern: "organic",
    },
    prompt: "따뜻하고 감성적인 내추럴 라이프스타일 스타일. 크림/베이지 배경(#f5ede0), 따뜻한 갈색 계열 타이포, 자연광 느낌의 포근한 조명, 린넨 질감, 식물이나 나무 소품 요소, 핸드라이팅 폰트 믹스. 핸드메이드/홈리빙 브랜드 감성.",
  },
  {
    id: "bold_graphic",
    label: "트렌디 그래픽",
    desc: "굵은 타이포, 강렬한 컬러",
    preview: {
      bg: "linear-gradient(135deg,#ff2d55,#ff6b35)",
      accent: "#fff200",
      textColor: "#ffffff",
      subColor: "rgba(255,255,255,0.85)",
      pattern: "bold",
    },
    prompt: "대담하고 트렌디한 그래픽 디자인. 강렬한 오렌지/레드 그라데이션 배경, 노란색 포인트, 초대형 볼드 타이포그래피, 기하학적 도형 요소, 팝아트 느낌, 비대칭 레이아웃, 겹치는 텍스트와 이미지. 밀레니얼/Z세대 타겟 브랜드.",
  },
  {
    id: "food_warm",
    label: "식욕자극 푸드",
    desc: "따뜻한 앰버, 클로즈업 질감",
    preview: {
      bg: "linear-gradient(135deg,#3d1500,#6b2e00)",
      accent: "#ff8c00",
      textColor: "#fff8f0",
      subColor: "rgba(255,200,100,0.8)",
      pattern: "texture",
    },
    prompt: "식욕을 강하게 자극하는 푸드 사진 스타일. 어두운 앰버/브라운 배경, 따뜻한 오렌지 조명, 증기와 질감이 살아있는 클로즈업 사진, 레스토랑 분위기 조명, 식재료의 신선한 색감 강조, 컴포트 푸드 감성. 미쉐린 레스토랑 수준의 푸드 포토그래피.",
  },
  {
    id: "clean_health",
    label: "클린 헬스케어",
    desc: "화이트/그린, 신뢰감 있는",
    preview: {
      bg: "linear-gradient(135deg,#f0faf5,#e6f7ee)",
      accent: "#00875a",
      textColor: "#1a3a28",
      subColor: "#4d8c6f",
      pattern: "grid",
    },
    prompt: "깔끔하고 신뢰감 있는 헬스케어/건강 브랜드 스타일. 순백에 가까운 그린 틴트 배경, 에메랄드 그린 포인트, 의료/과학적 신뢰감, 격자 패턴, 깔끔한 산세리프 폰트, 자연 성분 이미지(식물/허브), 데이터 인포그래픽 요소.",
  },
  {
    id: "pastel_soft",
    label: "파스텔 소프트",
    desc: "연한 파스텔, 귀엽고 사랑스러운",
    preview: {
      bg: "linear-gradient(135deg,#fce4ec,#f8bbd0)",
      accent: "#e91e8c",
      textColor: "#4a1528",
      subColor: "#c2185b",
      pattern: "dots",
    },
    prompt: "부드럽고 사랑스러운 파스텔 스타일. 연한 핑크/라벤더 파스텔 배경, 귀여운 일러스트 요소, 둥글고 부드러운 폰트, 작은 하트/별/꽃 장식 요소, 보케 효과, 소녀감성 뷰티/라이프스타일. 화사하고 밝은 컬러 팔레트.",
  },
  {
    id: "tech_dark",
    label: "테크 다크",
    desc: "다크 배경, 블루 글로우",
    preview: {
      bg: "linear-gradient(135deg,#050d1a,#0a1f3d)",
      accent: "#00d4ff",
      textColor: "#e8f4f8",
      subColor: "rgba(0,212,255,0.7)",
      pattern: "circuit",
    },
    prompt: "미래지향적인 테크/IT 브랜드 스타일. 딥 네이비 블랙 배경(#050d1a), 시안/블루 글로우 조명, 회로 패턴이나 그리드 요소, 홀로그래픽 느낌, 날카롭고 각진 레이아웃, 데이터 시각화 요소, SF 느낌의 미래적 디자인.",
  },
  {
    id: "vintage_retro",
    label: "빈티지 레트로",
    desc: "크라프트지, 복고풍 감성",
    preview: {
      bg: "linear-gradient(135deg,#f5e6c8,#e8d5a3)",
      accent: "#8b2500",
      textColor: "#3d1a00",
      subColor: "#6b4226",
      pattern: "noise",
    },
    prompt: "빈티지/레트로 크라프트 스타일. 크라프트지 질감 배경(#f5e6c8), 빈티지 레드/번트 오렌지 포인트, 복고풍 세리프 타이포그래피, 오래된 사진 필터(세피아 틴트), 배지/스탬프/씰 디자인 요소, 수작업 느낌의 테두리와 라인. 아르티장/로컬 브랜드 감성.",
  },
  {
    id: "premium_black",
    label: "프리미엄 블랙",
    desc: "순수 블랙, 하이 콘트라스트",
    preview: {
      bg: "#000000",
      accent: "#ffffff",
      textColor: "#ffffff",
      subColor: "rgba(255,255,255,0.6)",
      pattern: "minimal_dark",
    },
    prompt: "극한의 프리미엄 블랙 스타일. 순수 검정 배경, 흰색과 회색만 사용한 모노크롬, 제품이 유일한 컬러 요소, 초강렬 명암 대비, 미니멀한 텍스트, 고급 스포츠카 브랜드 느낌의 광택 질감, 절제된 럭셔리. 애플/포르쉐 수준의 프리미엄 브랜드.",
  },
];

// ── 사이즈 프리셋 ────────────────────────────────────────────
const SIZE_PRESETS = [
  { label: "세로형",    w: 860,  h: 1100, icon: "📱", desc: "쇼핑몰 상세 세로형" },
  { label: "정사각형",  w: 1000, h: 1000, icon: "⬜", desc: "SNS / 인스타그램" },
  { label: "가로형",    w: 1200, h: 628,  icon: "🖥", desc: "배너 / 블로그" },
  { label: "세로 9:16", w: 1080, h: 1920, icon: "📲", desc: "쇼츠 / 릴스" },
  { label: "직접 입력", w: null, h: null, icon: "✏️", desc: "직접 설정" },
];

// 이미지를 원하는 크기로 Canvas 리사이즈
async function resizeImage(base64DataUrl, targetW, targetH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      // cover 방식으로 크롭 없이 letterbox (배경 흰색)
      const scale = Math.min(targetW / img.width, targetH / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      const ox = (targetW - sw) / 2, oy = (targetH - sh) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, ox, oy, sw, sh);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64DataUrl); // 실패 시 원본 반환
    img.src = base64DataUrl;
  });
}

// ── 카테고리 ──────────────────────────────────────────────────
const CATEGORIES = [
  { key:"food",      label:"식품/음료",     accent:"#c0392b", styleHint:"따뜻하고 식욕을 자극하는 음식 사진 스타일, 어두운 우드 테이블, 드라마틱한 조명, 고급 레스토랑 감성" },
  { key:"fashion",   label:"패션/의류",     accent:"#1a1a1a", styleHint:"미니멀하고 세련된 패션 룩북 스타일, 깔끔한 화이트 스튜디오, 에디토리얼 감성" },
  { key:"beauty",    label:"뷰티/화장품",   accent:"#9b5a7a", styleHint:"럭셔리 화장품 브랜드 비주얼, 소프트 핑크 마블, 장미꽃잎, 골든 아워 빛, 고급스러운 분위기" },
  { key:"tech",      label:"전자/디지털",   accent:"#1a56db", styleHint:"세련된 IT 제품 사진, 다크 배경, 블루 글로우 조명, 미래지향적이고 테크 감성" },
  { key:"interior",  label:"인테리어/가구", accent:"#7c5c3a", styleHint:"아늑한 인테리어 라이프스타일, 따뜻한 원목 질감, 자연광, 스칸디나비아 감성" },
  { key:"health",    label:"건강/헬스",     accent:"#2e7d32", styleHint:"깔끔하고 신뢰감 있는 건강 제품, 신선한 그린 컬러, 화이트 배경, 아침 햇살 느낌" },
  { key:"pet",       label:"반려동물",      accent:"#d4820a", styleHint:"따뜻하고 귀여운 펫 라이프스타일, 보케 효과, 골든아워, 행복한 분위기" },
  { key:"service",   label:"서비스/교육",   accent:"#5e35b1", styleHint:"전문적이고 신뢰감 있는 서비스 비주얼, 깔끔한 그라데이션, 모던 오피스 감성" },
];

// ── 슬라이드 타입 20종 ────────────────────────────────────────
const SLIDE_TYPES = [
  { id:"hero",       label:"메인 히어로"    },
  { id:"intro",      label:"브랜드 소개"    },
  { id:"feature",    label:"핵심 특징"      },
  { id:"detail1",    label:"상세 설명 1"    },
  { id:"detail2",    label:"상세 설명 2"    },
  { id:"comparison", label:"비교/장점"      },
  { id:"howto",      label:"사용 방법"      },
  { id:"ingredient", label:"구성/성분"      },
  { id:"quality",    label:"품질 인증"      },
  { id:"review",     label:"고객 후기"      },
  { id:"trust",      label:"신뢰 지표"      },
  { id:"faq",        label:"자주 묻는 질문" },
  { id:"gallery",    label:"상품 갤러리"    },
  { id:"package",    label:"구성품 안내"    },
  { id:"delivery",   label:"배송 안내"      },
  { id:"event",      label:"이벤트/혜택"    },
  { id:"size",       label:"사이즈 가이드"  },
  { id:"story",      label:"브랜드 스토리"  },
  { id:"warning",    label:"주의사항"       },
  { id:"cta",        label:"구매 유도"      },
];

// ══════════════════════════════════════════════════════════════
// Nano Banana 프롬프트 빌더 (슬라이드 타입별 한국어)
// ══════════════════════════════════════════════════════════════
function buildPrompt(slide, cat, productName, refStyle, imgW = 1000, imgH = 1000, styleTemplateId = null) {
  const h    = slide.headline    || "";
  const sub  = slide.subheadline || "";
  const body = slide.body        || "";
  const badge = slide.badge      || "";
  const cta  = slide.cta         || "지금 구매하기";

  // 공통 스타일 지시
  const hasProductImg = false; // 이미지는 API 레벨에서 전달됨
  // 스타일 템플릿 적용
  const styleTemplate = styleTemplateId
    ? STYLE_TEMPLATES.find(t => t.id === styleTemplateId)
    : null;

  const base = [
    `한국 프리미엄 온라인 쇼핑몰 상세페이지 이미지를 생성해주세요.`,
    styleTemplate
      ? `디자인 스타일: ${styleTemplate.prompt}`
      : `카테고리: ${cat.label}. 디자인 스타일: ${cat.styleHint}.`,
    !styleTemplate && refStyle ? `참고 이미지 스타일: ${refStyle}` : "",
    `상품명: ${productName}. 첨부된 참조 이미지의 실제 제품을 최대한 반영해주세요.`,
    `출력 비율: ${imgW}x${imgH} (${imgW > imgH ? "가로형 landscape" : imgW < imgH ? "세로형 portrait" : "정사각형 square"}).`,
    `[필수 품질] 실제 상업 사진과 전문 그래픽 디자인 합성 스타일. 고해상도 사진 퀄리티. 워터마크 없음.`,
    `[절대 사용 금지] 클립아트, 이모지, 아이콘, 벡터 일러스트, 만화, 카툰, 플랫 디자인 아이콘, 뱃지, 메달 그래픽, 체크마크 아이콘, 온도계 일러스트, 핸드셰이크 일러스트, 돋보기 아이콘, 트럭 클립아트 등 어떠한 일러스트/아이콘 요소도 절대 포함하지 마세요. 실제 사진이 아닌 일러스트는 모두 금지.`,
    `[스타일 강제] 실제 프로 포토그래퍼가 촬영한 상업 사진, 실제 제품 사진, 실제 사람/음식/공간 사진만 사용. 텍스트는 디자인된 폰트 레이아웃으로만.`,
  ].filter(Boolean).join(" ");

  // 슬라이드별 레이아웃 지시
  const layouts = {
    hero: `풀블리드 히어로 이미지. ${productName} 제품이 화면을 가득 채우는 드라마틱한 사진. 하단에 어두운 그라데이션 오버레이. 하단에 굵고 큰 한국어 제목 "${h}". 그 아래 부제목 "${sub}". ${badge ? `좌상단 배지: "${badge}".` : ""} 강렬하고 임팩트 있는 첫 인상.`,

    intro: `브랜드 소개 레이아웃. 좌측 55%는 흰 배경의 텍스트 영역, 우측 45%는 ${productName} 라이프스타일 사진. 좌측 상단에 작은 영문 섹션 라벨, 그 아래 한국어 큰 제목 "${h}", 본문 "${body}". 좌측 상단에 얇은 가로선 포인트.`,

    feature: `핵심 특징 레이아웃. 상단에 섹션 라벨과 한국어 제목 "${h}". 하단에 3개의 카드가 나란히: 각 카드에 번호(01, 02, 03), 굵은 제목, 설명 텍스트. 각 카드 배경에 제품 관련 실제 사진(클로즈업 디테일 샷) 부드럽게 처리.`,

    detail1: `상세 설명 레이아웃. 상단 50%: ${productName} 클로즈업 고퀄리티 사진. 하단 50%: 흰 배경에 섹션 라벨, 한국어 제목 "${h}", 본문 텍스트 "${body}". 깔끔한 타이포그래피.`,

    detail2: `스펙 정보 레이아웃. 좌측 45%: 섹션 라벨, 한국어 제목 "${h}", 스펙 리스트(항목명: 값 형식으로). 우측 55%: ${productName} 제품 사진. 신뢰감 있고 정보가 명확한 레이아웃.`,

    comparison: `비교 레이아웃. 상단에 제목 "${h}". 중앙에 좌우로 나뉜 카드: 왼쪽 "BEFORE"(회색 배경, 기존 문제점), 오른쪽 "AFTER"(${cat.accent} 강조색 배경, 흰 텍스트, 해결책). 하단에 차별점 목록.`,

    howto: `사용 방법 레이아웃. 상단에 제목 "${h}". 단계별 리스트: 큰 번호(01, 02, 03)와 각 단계 제목, 설명. ${productName} 실제 사용 장면 사진. 직관적이고 따라하기 쉬운 느낌.`,

    ingredient: `구성/성분 레이아웃. 좌측에 성분 리스트(각 항목: 왼쪽 포인트 라인 + 성분명 + 설명). 우측에 ${productName} 제품 사진. 상단에 제목 "${h}". 신뢰감 있는 디자인.`,

    quality: `품질 인증 레이아웃. 배경에 ${productName} 품질을 보여주는 사진. 오버레이. 상단에 섹션 라벨과 제목 "${h}". 신뢰감 있는 고품질 배경 사진. 본문 "${body}". 신뢰와 고급스러움. 어떠한 배지나 아이콘 없이 타이포와 사진으로만 구성.`,

    review: `고객 후기 레이아웃. 상단에 제목 "${h}". 3개의 후기 카드: 각각 별점(★★★★★), 이탤릭체 후기 텍스트, 구매자 닉네임. 따뜻하고 신뢰감 있는 디자인.`,

    trust: `신뢰 지표 레이아웃. 상단에 제목 "${h}". 3개의 수치 카드: 큰 볼드 숫자 + 설명 텍스트. 하단에 인증/보증 문구. ${productName} 브랜드 사진. 데이터 기반 신뢰감. 숫자와 텍스트 중심 디자인.`,

    faq: `FAQ 레이아웃. 상단에 제목 "${h}". 3~4개의 질문-답변 항목이 세로로 나열. 각 항목: 강조색 "Q" + 질문, "A" + 답변. 깔끔하고 읽기 쉬운 타이포그래피.`,

    gallery: `갤러리 레이아웃. 상단에 제목 "${h}". ${productName} 제품을 다양한 각도와 스타일로 촬영한 사진들이 그리드(2x2)로 배치. 고품질 제품 사진. 시각적으로 풍성한 구성.`,

    package: `구성품 안내 레이아웃. 상단에 제목 "${h}". ${productName} 구성품들이 배치된 플랫레이(flat lay) 사진. 각 구성품에 선과 텍스트로 설명. 깔끔한 화이트 배경.`,

    delivery: `배송 안내 레이아웃. 상단에 제목 "${h}". 배송/물류 관련 실제 사진(포장 장면 등)을 배경으로, 단계별 텍스트 레이아웃. 각 단계별 설명 텍스트. 안심되고 신뢰감 있는 디자인.`,

    event: `이벤트/혜택 레이아웃. 강렬한 배경(${cat.accent} 계열 색). 중앙에 큰 제목 "${h}". 할인율/혜택을 강조하는 흰색 배지나 박스. 긴박감을 주는 문구. 시선을 끄는 임팩트.`,

    size: `사이즈 가이드 레이아웃. 상단에 제목 "${h}". 사이즈 표나 측정 가이드 일러스트. 측정 방법 설명. 깔끔하고 실용적인 정보 전달.`,

    story: `브랜드 스토리 레이아웃. 감성적인 배경 사진에 어두운 오버레이. 중앙에 큰 제목 "${h}". 아래에 스토리 본문 "${body}". 진정성 있고 따뜻한 브랜드 감성.`,

    warning: `주의사항 레이아웃. 밝은 배경. 상단에 제목 "${h}". 주의사항 목록: 각 항목에 경고 아이콘과 텍스트. 부드럽지만 명확하게 전달하는 디자인.`,

    cta: `구매 유도 레이아웃. ${productName} 감성 사진이 배경, 어두운 오버레이. 중앙 정렬. 상단에 섹션 라벨. 큰 제목 "${h}". 가격 정보(취소선 원가 + 큰 폰트 현재가). 흰색 CTA 버튼 박스에 "${cta}" 텍스트. 긴박감 문구.`,
  };

  const layout = layouts[slide.id] || `${slide.label} 레이아웃. 제목 "${h}". 본문 "${body}". 전문적인 디자인.`;
  return `${base} ${layout}`;
}

// ══════════════════════════════════════════════════════════════
// API 호출들
// ══════════════════════════════════════════════════════════════

// Nano Banana (gemini-2.5-flash-image) 이미지 생성
async function generateSlideImage(prompt, productDataUrl = null) {
  let productImageB64 = null, productImageMime = null;
  if (productDataUrl) {
    productImageMime = productDataUrl.split(":")[1]?.split(";")[0] || "image/jpeg";
    productImageB64  = productDataUrl.split(",")[1] || null;
  }
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, productImageB64, productImageMime }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.image;
}

// Claude로 슬라이드 텍스트 콘텐츠 생성
async function generateSlideTexts({ category, productName, features, price, cta, target, extra, pageCount, refStyle }) {
  const cat   = CATEGORIES.find(c => c.key === category);
  const types = SLIDE_TYPES.slice(0, pageCount);

  const prompt = `한국 프리미엄 쇼핑몰 상세페이지 카피라이터입니다.
상품명: ${productName} / 카테고리: ${cat.label}
특징: ${features} / 가격: ${price || "미정"} / 타겟: ${target || "일반"} / CTA: ${cta || "지금 구매하기"}
추가정보: ${extra || "없음"}
${refStyle ? `참고 스타일: ${refStyle}` : ""}

슬라이드 ${pageCount}장의 텍스트를 작성해주세요.
각 슬라이드: headline(14자 이내), subheadline(20자, 선택), body(50자, 선택), badge(8자, 선택), cta(10자, 선택)

JSON만 응답:
{"slides":[${types.map(t => `{"id":"${t.id}","label":"${t.label}","headline":"","subheadline":"","body":"","badge":"","cta":""}`).join(",")}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  const clean = txt.replace(/```json\n?/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

// 참고 이미지 분석
async function analyzeRefImage(b64, mime) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: "이 상세페이지 이미지의 디자인 스타일을 100자 이내로 설명해주세요. 색감, 배경 스타일, 조명, 레이아웃 분위기 위주로. 한국어로." }
        ]
      }]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// AI 문구 추천
async function getAiSuggestions(catLabel, form) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: `카테고리:${catLabel} 상품:"${form.productName}" 특징:"${form.features}"\nJSON만:\n{"productNames":["추천1","추천2","추천3"],"ctas":["CTA1","CTA2","CTA3"],"targets":["타겟1","타겟2"],"extras":["추가1","추가2"]}` }]
    }),
  });
  const data = await res.json();
  const txt = data.content?.[0]?.text || "";
  return JSON.parse(txt.replace(/```json\n?/g, "").replace(/```/g, "").trim());
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트 - 3단계 위저드
// ══════════════════════════════════════════════════════════════
export default function DetailPageGenerator({ isDark, user }) {
  // ── 위저드 단계 ─────────────────────────────────────────────
  const [wizStep, setWizStep] = useState(1); // 1:상품입력 2:슬라이드기획 3:디자인 4:생성결과

  // ── Step 1: 상품 입력 ───────────────────────────────────────
  const [selCat,     setSelCat]     = useState(null);
  const [form,       setForm]       = useState({ productName:"", features:"", price:"", cta:"지금 구매하기", target:"", extra:"" });
  const [productImages, setProductImages] = useState([]);
  const [aiSugg,     setAiSugg]     = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [slideContents, setSlideContents] = useState([]); // [{id, label, headline, body, keyword, aiLoading}]
  const [planGenLoading, setPlanGenLoading] = useState(false);
  const [pageCount,  setPageCount]  = useState(5);
  const productFileRef = useRef(null);

  // ── Step 2: 디자인 선택 ─────────────────────────────────────
  const [selStyle,  setSelStyle]  = useState(null);
  const [selSize,   setSelSize]   = useState(0);
  const [customW,   setCustomW]   = useState(860);
  const [customH,   setCustomH]   = useState(1100);
  const [refImg,    setRefImg]    = useState(null);
  const [refStyle,  setRefStyle]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const refFileRef = useRef(null);

  // ── Step 3: 생성 결과 ───────────────────────────────────────
  const [slides,    setSlides]    = useState([]);
  const [rendered,  setRendered]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState({ msg:"", cur:0, total:0 });
  const [err,       setErr]       = useState("");
  const [curIdx,    setCurIdx]    = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [regenIdx,  setRegenIdx]  = useState(null);  // 개별 재생성 중인 슬라이드 인덱스
  const [slotSaveMsg, setSlotSaveMsg] = useState({});  // {idx: "✅"} 슬라이드별 저장 메시지
  const [saveMsg,   setSaveMsg]   = useState("");

  // ── 공통 ────────────────────────────────────────────────────
  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.65)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f8f8f8";
  const cat     = CATEGORIES.find(c => c.key === selCat) || CATEGORIES[0];
  const preset  = SIZE_PRESETS[selSize] || SIZE_PRESETS[0];
  const imgW    = preset.w != null ? preset.w : (parseInt(customW) || 860);
  const imgH    = preset.h != null ? preset.h : (parseInt(customH) || 1100);
  const imgRatio = imgW / imgH;
  const accentColor = selCat ? cat.accent : "#6366f1";

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:inputBg, color: isDark?"#fff":"#1a1a2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  // ── 핸들러 ──────────────────────────────────────────────────
  const handleProductImages = (files) => {
    Promise.all(Array.from(files).slice(0,10).map(f => new Promise(res => {
      const r = new FileReader(); r.onload = e => res({ name:f.name, dataUrl:e.target.result }); r.readAsDataURL(f);
    }))).then(imgs => setProductImages(p => [...p,...imgs].slice(0,10)));
  };

  const handleRef = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
      setRefImg(e.target.result); setAnalyzing(true);
      try {
        const b64 = e.target.result.split(",")[1], mime = e.target.result.split(":")[1].split(";")[0];
        setRefStyle(await analyzeRefImage(b64, mime));
      } catch { setRefStyle(""); }
      setAnalyzing(false);
    };
    r.readAsDataURL(file);
  };

  const getSugg = async () => {
    if (!selCat || !form.productName) return;
    setSuggesting(true); setAiSugg(null);
    try { setAiSugg(await getAiSuggestions(cat.label, form)); }
    catch(e) { console.error(e); }
    setSuggesting(false);
  };

  // 보관함 저장
  const DETAIL_SAVES_KEY = "nper_detail_saves_v1";
  const saveToLibrary = (images) => {
    try {
      const saves = JSON.parse(localStorage.getItem(DETAIL_SAVES_KEY) || "[]");
      saves.unshift({ id:Date.now().toString(), productName:form.productName, catLabel:cat.label, date:new Date().toLocaleDateString("ko-KR"), count:images.filter(Boolean).length, thumbnail:images.find(Boolean)||null, images:images.filter(Boolean) });
      localStorage.setItem(DETAIL_SAVES_KEY, JSON.stringify(saves.slice(0,50)));
      return true;
    } catch(e) { return false; }
  };
  // 현재 슬라이드 한 장만 보관함에 저장
  const saveOneToLibrary = (idx) => {
    const png = rendered[idx];
    const slide = slides[idx];
    if (!png || !slide) return false;
    try {
      const saves = JSON.parse(localStorage.getItem(DETAIL_SAVES_KEY) || "[]");
      saves.unshift({ id:Date.now().toString(), productName:`${form.productName} — ${slide.label}`, catLabel:cat.label, date:new Date().toLocaleDateString("ko-KR"), count:1, thumbnail:png, images:[png] });
      localStorage.setItem(DETAIL_SAVES_KEY, JSON.stringify(saves.slice(0,50)));
      return true;
    } catch(e) { return false; }
  };

  // 생성 실행
  const generate = async () => {
    setErr(""); setLoading(true); setSlides([]); setRendered([]); setSaveMsg("");
    const beforeUnload = (e) => { e.preventDefault(); e.returnValue="이미지 생성 중입니다."; };
    window.addEventListener("beforeunload", beforeUnload);
    try {
      setProgress({ msg:"슬라이드 텍스트 구성 중...", cur:0, total:pageCount });
      let slidesData;
      // 사용자가 슬라이드 기획을 입력한 경우 반영
      if (slideContents.length > 0) {
        slidesData = slideContents.map(sc => ({
          id: sc.id, label: sc.label,
          headline: sc.headline || "",
          subheadline: sc.subheadline || "",
          body: sc.body || "",
          badge: sc.badge || "",
          cta: form.cta || "지금 구매하기",
        }));
        // 비어있는 슬라이드는 AI로 채우기
        const emptySlides = slidesData.filter(s => !s.headline);
        if (emptySlides.length > 0) {
          try {
            const fillData = await generateSlideTexts({ category:selCat, ...form, pageCount, refStyle });
            fillData.slides?.forEach(fs => {
              const idx = slidesData.findIndex(s => s.id === fs.id && !s.headline);
              if (idx >= 0) slidesData[idx] = { ...slidesData[idx], ...fs };
            });
          } catch(e) {}
        }
      } else {
        const textData = await generateSlideTexts({ category:selCat, ...form, pageCount, refStyle });
        slidesData = textData.slides || [];
      }
      setSlides(slidesData);

      const NEGATIVE = " CRITICAL: NO clipart, NO icons, NO emoji, NO cartoon illustrations, NO vector graphics, NO badge graphics, NO medal icons, NO flat design icons. Only real commercial photography and professional graphic design typography.";
      const results = new Array(slidesData.length).fill(null);
      for (let i = 0; i < slidesData.length; i++) {
        const s = slidesData[i];
        setProgress({ msg:`이미지 생성 중... (${i+1}/${slidesData.length}) — ${s.label}`, cur:i+1, total:slidesData.length });
        try {
          const prompt = buildPrompt(s, cat, form.productName, refStyle, imgW, imgH, selStyle) + NEGATIVE;
          const prodImg = productImages.length > 0 ? productImages[i % productImages.length]?.dataUrl : null;
          let raw = await generateSlideImage(prompt, prodImg);
          if (raw && (imgW !== 1000 || imgH !== 1000)) raw = await resizeImage(raw, imgW, imgH);
          results[i] = raw;
          // 이미지 생성 성공 시 30 크레딧 차감
          if (raw && user?.uid) {
            changePoints(user.uid, -30, `상세페이지 이미지 생성 (${s.label})`).catch(()=>{});
          }
        } catch(e) { results[i] = null; }
        setRendered([...results]);
        await new Promise(r => setTimeout(r, 50));
      }
      saveToLibrary(results);
      setSaveMsg("✅ 보관함에 저장됐어요!");
      setWizStep(4); setCurIdx(0);
    } catch(e) { setErr("생성 실패: " + e.message); }
    finally { setLoading(false); window.removeEventListener("beforeunload", beforeUnload); }
  };

  const regenerateOne = async (idx) => {
    if (!slides[idx] || regenIdx !== null) return;
    setRegenIdx(idx);
    const NEGATIVE = " CRITICAL: NO clipart, NO icons, NO emoji, NO cartoon illustrations, NO vector graphics. Only real commercial photography and professional graphic design typography.";
    try {
      const prodImg = productImages.length > 0 ? productImages[idx % productImages.length]?.dataUrl : null;
      const prompt = buildPrompt(slides[idx], cat, form.productName, refStyle, imgW, imgH, selStyle) + NEGATIVE;
      let img = await generateSlideImage(prompt, prodImg);
      if (img && (imgW !== 1000 || imgH !== 1000)) img = await resizeImage(img, imgW, imgH);
      setRendered(prev => { const r=[...prev]; r[idx]=img; return r; });
      if (img && user?.uid) {
        changePoints(user.uid, -30, `상세페이지 재생성 (${slides[idx]?.label})`).catch(()=>{});
      }
    } catch(e) { setErr("재생성 실패: " + e.message); }
    setRegenIdx(null);
  };

  const saveCurrent = () => {
    const png = rendered[curIdx]; if(!png) return;
    const a = document.createElement("a");
    a.href=png; a.download=`${form.productName||"slide"}_${String(curIdx+1).padStart(2,"0")}_${slides[curIdx]?.label||"slide"}.png`; a.click();
  };
  const saveAll = async () => {
    if(!rendered.some(Boolean)) return; setSaving(true);
    if(!window.JSZip) await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    const zip = new window.JSZip();
    rendered.forEach((png,i)=>{ if(!png) return; const arr=Uint8Array.from(atob(png.split(",")[1]),c=>c.charCodeAt(0)); zip.file(`${String(i+1).padStart(2,"0")}_${slides[i]?.label||"slide"}.png`,arr); });
    const blob = await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${form.productName||"detail"}_slides.zip`; a.click();
    setSaving(false);
  };

  const resetAll = () => {
    setWizStep(1); setSelCat(null); setForm({productName:"",features:"",price:"",cta:"지금 구매하기",target:"",extra:""});
    setProductImages([]); setSelStyle(null); setSelSize(0); setCustomW(860); setCustomH(1100);
    setRefImg(null); setRefStyle(""); setSlides([]); setRendered([]); setSaveMsg(""); setErr(""); setAiSugg(null); setSlideContents([]);
  };

  // ── 위저드 진행 바 ──────────────────────────────────────────
  const WizHeader = () => (
    <div style={{ padding:"20px 28px 0", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {[["1","상품 입력"],["2","슬라이드 기획"],["3","디자인 선택"],["4","AI 생성"]].map(([n, label], i) => {
          const step = parseInt(n);
          const done = wizStep > step;
          const active = wizStep === step;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", flex: i<2?1:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor: done?"pointer":"default" }}
                onClick={() => { if(done && step < wizStep) setWizStep(step); }}>
                <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900,
                  background: done ? accentColor : active ? accentColor : isDark?"rgba(255,255,255,0.1)":"#e5e5e5",
                  color: done||active ? "#fff" : muted, transition:"all 0.2s", flexShrink:0 }}>
                  {done ? "✓" : n}
                </div>
                <span style={{ fontSize:13, fontWeight: active?800:500, color: active?text:muted, whiteSpace:"nowrap" }}>{label}</span>
              </div>
              {i < 3 && <div style={{ flex:1, height:2, background: done?accentColor:isDark?"rgba(255,255,255,0.1)":"#e5e5e5", margin:"0 12px", transition:"all 0.3s", minWidth:16 }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // STEP 1: 상품 입력
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 1) {
    const canNext = selCat && form.productName.trim() && form.features.trim();
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:800, margin:"0 auto", padding:"0 28px 80px" }}>

          {/* 페이지 제목 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>상품 정보를 입력하세요</div>
            <div style={{ fontSize:13, color:muted }}>입력한 내용을 바탕으로 AI가 상세페이지 슬라이드를 구성해요</div>
          </div>

          {/* 카테고리 선택 */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:10 }}>카테고리 *</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8 }}>
              {CATEGORIES.map(c=>(
                <button key={c.key} onClick={()=>setSelCat(c.key)}
                  style={{ padding:"12px 10px", borderRadius:10, border:`1.5px solid ${selCat===c.key?c.accent:bdr}`, background: selCat===c.key?`${c.accent}15`:cardBg, cursor:"pointer", textAlign:"center", transition:"all 0.12s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=c.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=selCat===c.key?c.accent:bdr}>
                  <div style={{ fontSize:11, fontWeight:800, color:selCat===c.key?c.accent:text, letterSpacing:1 }}>{c.label.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 슬라이드 수 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>슬라이드 수</div>
              <div style={{ fontSize:22, fontWeight:900, color:accentColor }}>{pageCount}장</div>
            </div>
            <input type="range" min={3} max={20} value={pageCount} onChange={e=>setPageCount(Number(e.target.value))} style={{ width:"100%", accentColor }}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginTop:4 }}>
              <span>3장</span><span>20장</span>
            </div>
            <div style={{ fontSize:11, color:muted, marginTop:6, lineHeight:1.5 }}>
              {SLIDE_TYPES.slice(0,pageCount).map(t=>t.label).join(" · ")}
            </div>
          </div>

          {/* 상품 이미지 */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>
              상품 이미지 <span style={{ color:muted, fontWeight:400 }}>(선택 — 최대 10장, AI가 참고해서 생성)</span>
            </div>
            <div onClick={()=>productFileRef.current?.click()}
              onDrop={e=>{e.preventDefault();handleProductImages(e.dataTransfer.files);}}
              onDragOver={e=>e.preventDefault()}
              style={{ border:`1.5px dashed ${productImages.length?accentColor:bdr}`, borderRadius:12, padding:productImages.length?"14px":"24px", cursor:"pointer", background:productImages.length?`${accentColor}06`:cardBg, transition:"all 0.12s" }}>
              {productImages.length ? (
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  {productImages.map((img,i)=>(
                    <div key={i} style={{ position:"relative" }}>
                      <img src={img.dataUrl} alt="" style={{ width:64,height:64,objectFit:"cover",borderRadius:8,display:"block" }}/>
                      <button onClick={e=>{e.stopPropagation();setProductImages(p=>p.filter((_,j)=>j!==i));}}
                        style={{ position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                    </div>
                  ))}
                  {productImages.length<10 && <div style={{ width:64,height:64,borderRadius:8,border:`1.5px dashed ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:muted }}>+</div>}
                </div>
              ) : (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:text,marginBottom:3 }}>제품/서비스 이미지 클릭 또는 드래그</div>
                  <div style={{ fontSize:11,color:muted }}>JPG, PNG (최대 10장)</div>
                </div>
              )}
            </div>
            <input ref={productFileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handleProductImages(e.target.files);e.target.value="";}}/>
          </div>

          {/* 텍스트 입력 */}
          {[
            { key:"productName", label:"상품명 *",    ph:"예: 프리미엄 한우 1++ 등심 선물 세트" },
            { key:"features",    label:"핵심 특징 *", ph:"예: 1++ 등급, 냉장 당일 배송, 고급 포장", ta:true },
            { key:"price",       label:"가격",         ph:"예: 89,000원 (2인 세트)" },
            { key:"cta",         label:"CTA 문구",     ph:"예: 지금 주문하기" },
            { key:"target",      label:"타겟 고객",    ph:"예: 레스토랑 퀄리티를 집에서 즐기고 싶은 3040" },
            { key:"extra",       label:"추가 정보",    ph:"예: 드라이에이징 30일, 인증 등급", ta:true },
          ].map(({ key, label, ph, ta })=>(
            <div key={key} style={{ marginBottom:14 }}>
              <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:6 }}>{label}</div>
              {ta ? <textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{ ...inputStyle,resize:"vertical",lineHeight:1.7 }}/>
                  : <input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={inputStyle}/>}
            </div>
          ))}

          {/* AI 추천 */}
          <div style={{ padding:"14px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:aiSugg?14:0 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:text }}>AI 문구 추천</div>
                <div style={{ fontSize:11,color:muted,marginTop:2 }}>입력 내용 기반으로 자동 추천</div>
              </div>
              <button onClick={getSugg} disabled={suggesting||!selCat}
                style={{ padding:"8px 16px",borderRadius:8,border:"none",cursor:suggesting||!selCat?"not-allowed":"pointer",background:`${accentColor}18`,color:accentColor,fontSize:12,fontWeight:800,opacity:suggesting||!selCat?0.5:1 }}>
                {suggesting?"추천 중...":"AI 추천"}
              </button>
            </div>
            {aiSugg && (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {[{key:"productName",items:aiSugg.productNames,label:"상품명"},{key:"cta",items:aiSugg.ctas,label:"CTA"},{key:"target",items:aiSugg.targets,label:"타겟"},{key:"extra",items:aiSugg.extras,label:"추가정보"}]
                  .filter(r=>r.items?.length>0).map(({ key,items,label })=>(
                  <div key={key}>
                    <div style={{ fontSize:10,fontWeight:700,color:muted,letterSpacing:1,marginBottom:5 }}>{label}</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                      {items.map((v,i)=>(<button key={i} onClick={()=>setForm(p=>({...p,[key]:v}))} style={{ padding:"5px 12px",borderRadius:6,border:`1px solid ${accentColor}35`,background:`${accentColor}08`,color:text,fontSize:12,cursor:"pointer" }}>{v}</button>))}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:10,color:muted }}>클릭하면 입력란에 바로 적용</div>
              </div>
            )}
          </div>

          {/* 다음 버튼 */}
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button onClick={() => {
              if (!canNext) return;
              // slideContents 초기화 (슬라이드 수 변경 반영)
              setSlideContents(SLIDE_TYPES.slice(0, pageCount).map(t => ({
                id: t.id, label: t.label, headline:"", subheadline:"", body:"", keyword:"", aiLoading:false
              })));
              setWizStep(2);
            }} disabled={!canNext}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:canNext?"pointer":"not-allowed", background:canNext?accentColor:`${accentColor}40`, color:"#fff", fontSize:15, fontWeight:900, transition:"all 0.15s", display:"flex",alignItems:"center",gap:8 }}>
              다음 → <span style={{ fontSize:12,opacity:0.8 }}>슬라이드 기획</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── AI 슬라이드별 추천 함수 ──────────────────────────────────
  const suggestSlide = async (idx) => {
    const sc = slideContents[idx];
    if (!sc || !selCat) return;
    setSlideContents(prev => prev.map((s,i) => i===idx ? {...s, aiLoading:true} : s));
    try {
      const cat_ = CATEGORIES.find(c => c.key === selCat);
      const kw = sc.keyword ? `키워드: ${sc.keyword}` : "";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":CLAUDE_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:400,
          messages:[{role:"user", content:`쇼핑몰 상세페이지 카피라이터.
상품: ${form.productName} (${cat_?.label}) / 특징: ${form.features} / 가격: ${form.price||"미정"}
슬라이드: ${sc.label} (${sc.id})
${kw}
이 슬라이드의 카피를 작성해주세요. JSON만 응답:
{"headline":"헤드라인(14자 이내)","subheadline":"서브헤드라인(22자 이내, 없으면 빈 문자열)","body":"본문(50자 이내, 없으면 빈 문자열)","badge":"배지텍스트(8자 이내, 없으면 빈 문자열)"}`}]
        }),
      });
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json\n?/g,"").replace(/```/g,"").trim());
      setSlideContents(prev => prev.map((s,i) => i===idx ? {...s, ...parsed, aiLoading:false} : s));
    } catch(e) {
      setSlideContents(prev => prev.map((s,i) => i===idx ? {...s, aiLoading:false} : s));
    }
  };

  const suggestAllSlides = async () => {
    setPlanGenLoading(true);
    for (let i = 0; i < slideContents.length; i++) {
      await suggestSlide(i);
      await new Promise(r => setTimeout(r, 300));
    }
    setPlanGenLoading(false);
  };

  // STEP 2: 슬라이드 기획
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 2) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 28px 80px" }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>슬라이드 내용을 기획하세요</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7 }}>
              각 슬라이드의 문구를 직접 입력하거나, AI 추천을 받아 수정해보세요.<br/>
              비워두면 AI가 자동으로 채워줘요.
            </div>
          </div>

          {/* 전체 AI 추천 버튼 */}
          <div style={{ display:"flex", gap:8, marginBottom:20, padding:"12px 16px", borderRadius:12, background:cardBg, border:`1px solid ${bdr}`, alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:text }}>전체 AI 추천</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>모든 슬라이드 내용을 AI가 한 번에 추천해드려요</div>
            </div>
            <button onClick={suggestAllSlides} disabled={planGenLoading}
              style={{ padding:"9px 20px", borderRadius:9, border:"none", cursor:planGenLoading?"wait":"pointer", background:accentColor, color:"#fff", fontSize:13, fontWeight:800, opacity:planGenLoading?0.6:1, flexShrink:0, whiteSpace:"nowrap" }}>
              {planGenLoading ? "추천 중..." : "✨ 전체 자동 추천"}
            </button>
          </div>

          {/* 슬라이드별 입력 */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {slideContents.map((sc, i) => (
              <div key={i} style={{ borderRadius:14, border:`1.5px solid ${bdr}`, background:cardBg, overflow:"hidden", transition:"border-color 0.15s" }}>
                {/* 슬라이드 헤더 */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderBottom:`1px solid ${bdr}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:`${accentColor}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:accentColor }}>
                      {i+1}
                    </div>
                    <div>
                      <span style={{ fontSize:13, fontWeight:800, color:text }}>{sc.label}</span>
                      {sc.headline && <span style={{ marginLeft:8, fontSize:11, color:accentColor, fontWeight:600 }}>✓ 입력됨</span>}
                    </div>
                  </div>
                  <button onClick={()=>suggestSlide(i)} disabled={sc.aiLoading||planGenLoading}
                    style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${accentColor}40`, background:`${accentColor}10`, color:accentColor, fontSize:11, fontWeight:700, cursor:sc.aiLoading||planGenLoading?"wait":"pointer", opacity:sc.aiLoading||planGenLoading?0.5:1, display:"flex", alignItems:"center", gap:5 }}>
                    {sc.aiLoading
                      ? <><div style={{ width:10,height:10,borderRadius:"50%",border:`1.5px solid ${accentColor}50`,borderTopColor:accentColor,animation:"spin 0.8s linear infinite" }}/> 추천 중</>
                      : "✦ AI 추천"}
                  </button>
                </div>

                {/* 입력 폼 */}
                <div style={{ padding:"14px 16px", display:"grid", gap:10 }}>
                  {/* 키워드 */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5, letterSpacing:0.5 }}>키워드 (AI 추천 시 반영)</div>
                    <input
                      value={sc.keyword||""}
                      onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,keyword:e.target.value}:s))}
                      placeholder={`예: ${i===0?"강렬한 첫인상, 신뢰감":i===slideContents.length-1?"할인, 긴박감, CTA":"특징 강조, 차별점"}`}
                      style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:12, outline:"none", boxSizing:"border-box" }}
                    />
                  </div>
                  {/* 헤드라인 */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5, letterSpacing:0.5 }}>헤드라인 <span style={{ fontWeight:400 }}>(14자 이내)</span></div>
                    <input
                      value={sc.headline||""}
                      onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,headline:e.target.value}:s))}
                      placeholder="비워두면 AI가 자동으로 채워줘요"
                      style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid ${sc.headline?`${accentColor}50`:bdr}`, background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" }}
                    />
                  </div>
                  {/* 본문 - 간략히 */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:5, letterSpacing:0.5 }}>본문 <span style={{ fontWeight:400 }}>(50자 이내, 선택)</span></div>
                    <input
                      value={sc.body||""}
                      onChange={e=>setSlideContents(prev=>prev.map((s,j)=>j===i?{...s,body:e.target.value}:s))}
                      placeholder="비워두면 AI가 자동으로 채워줘요"
                      style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid ${bdr}`, background:isDark?"rgba(255,255,255,0.05)":"#f5f5f5", color:text, fontSize:12, outline:"none", boxSizing:"border-box" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 이전/다음 버튼 */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:24 }}>
            <button onClick={()=>setWizStep(1)}
              style={{ padding:"12px 28px", borderRadius:12, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              ← 이전
            </button>
            <button onClick={()=>setWizStep(3)}
              style={{ padding:"14px 40px", borderRadius:12, border:"none", cursor:"pointer", background:accentColor, color:"#fff", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              다음 → <span style={{ fontSize:12, opacity:0.8 }}>디자인 선택</span>
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // STEP 3: 디자인 선택
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 3) {
    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 28px 80px" }}>

          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:22, fontWeight:900, color:text, letterSpacing:-0.5, marginBottom:4 }}>디자인 스타일을 선택하세요</div>
            <div style={{ fontSize:13, color:muted }}>선택 안 해도 카테고리 기본 스타일로 생성돼요</div>
          </div>

          {/* 스타일 템플릿 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:text }}>스타일 템플릿 <span style={{ fontSize:12, color:muted, fontWeight:400 }}>— 선택 시 해당 스타일로 생성</span></div>
              {selStyle && <button onClick={()=>setSelStyle(null)} style={{ fontSize:11,color:muted,background:"transparent",border:`1px solid ${bdr}`,borderRadius:6,padding:"4px 10px",cursor:"pointer" }}>선택 해제</button>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
              {STYLE_TEMPLATES.map(t=>{
                const isSelected = selStyle===t.id;
                const prev = t.preview;
                return (
                  <button key={t.id} onClick={()=>setSelStyle(isSelected?null:t.id)}
                    style={{ border:`2px solid ${isSelected?accentColor:"transparent"}`, borderRadius:14, overflow:"hidden", cursor:"pointer", background:"transparent", padding:0, transition:"all 0.15s", boxShadow: isSelected?`0 0 0 3px ${accentColor}40`:`0 2px 8px rgba(0,0,0,0.15)` }}>
                    {/* 미리보기 */}
                    <div style={{ width:"100%", paddingBottom:"130%", position:"relative", background:prev.bg }}>
                      {prev.pattern==="diagonal" && <div style={{ position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(45deg,${prev.accent}10 0,${prev.accent}10 1px,transparent 0,transparent 50%)`,backgroundSize:"8px 8px" }}/>}
                      {prev.pattern==="dots"     && <div style={{ position:"absolute",inset:0,backgroundImage:`radial-gradient(circle,${prev.accent}20 1px,transparent 1px)`,backgroundSize:"8px 8px" }}/>}
                      {prev.pattern==="circuit"  && <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(${prev.accent}15 1px,transparent 1px),linear-gradient(90deg,${prev.accent}15 1px,transparent 1px)`,backgroundSize:"10px 10px" }}/>}
                      <div style={{ position:"absolute",inset:0,padding:"8px 7px",display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
                        <div style={{ flex:1,borderRadius:4,background:`${prev.accent}18`,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <div style={{ width:"60%",height:"70%",borderRadius:3,background:`${prev.accent}25` }}/>
                        </div>
                        <div style={{ height:4,borderRadius:2,background:prev.accent,width:"50%",marginBottom:4 }}/>
                        <div style={{ height:3,borderRadius:1,background:prev.textColor,width:"80%",opacity:0.7,marginBottom:2 }}/>
                        <div style={{ height:2,borderRadius:1,background:prev.subColor,width:"60%",marginBottom:4 }}/>
                        <div style={{ height:8,borderRadius:3,background:prev.accent,width:"100%" }}/>
                      </div>
                      {isSelected && <div style={{ position:"absolute",top:6,right:6,width:20,height:20,borderRadius:"50%",background:accentColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:900 }}>✓</div>}
                    </div>
                    <div style={{ padding:"7px 6px", background:isDark?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.95)" }}>
                      <div style={{ fontSize:11,fontWeight:isSelected?800:600,color:isSelected?accentColor:text }}>{t.label}</div>
                      <div style={{ fontSize:9,color:muted,marginTop:1 }}>{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selStyle && (() => {
              const st = STYLE_TEMPLATES.find(t=>t.id===selStyle);
              return st ? (
                <div style={{ marginTop:12,padding:"10px 14px",borderRadius:9,background:`${accentColor}10`,border:`1px solid ${accentColor}30` }}>
                  <div style={{ fontSize:12,fontWeight:700,color:accentColor,marginBottom:3 }}>✓ {st.label} 스타일 선택됨</div>
                  <div style={{ fontSize:11,color:muted,lineHeight:1.6 }}>{st.desc} 느낌으로 이미지를 생성해요</div>
                </div>
              ) : null;
            })()}
          </div>

          {/* 이미지 크기 */}
          <div style={{ padding:"16px 18px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:700,color:text }}>이미지 크기</div>
              <div style={{ fontSize:14,fontWeight:900,color:accentColor }}>{imgW} × {imgH} px</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
              {SIZE_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setSelSize(i)}
                  style={{ padding:"8px 4px",borderRadius:9,border:`1.5px solid ${selSize===i?accentColor:bdr}`,background:selSize===i?`${accentColor}15`:"transparent",color:selSize===i?accentColor:isDark?"rgba(255,255,255,0.65)":"#555",fontSize:11,fontWeight:selSize===i?800:500,cursor:"pointer",transition:"all 0.12s",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span>{p.label}</span>
                  {p.w!=null && <span style={{ fontSize:9,opacity:0.7 }}>{p.w}×{p.h}</span>}
                </button>
              ))}
            </div>
            {preset.w==null ? (
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>가로 (px)</div>
                  <input type="number" value={customW} onChange={e=>setCustomW(Number(e.target.value))} min={100} max={4000} step={10} style={{ ...inputStyle,textAlign:"center",fontWeight:700 }}/>
                </div>
                <div style={{ fontSize:18,color:muted,paddingTop:18 }}>×</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,color:muted,marginBottom:4 }}>세로 (px)</div>
                  <input type="number" value={customH} onChange={e=>setCustomH(Number(e.target.value))} min={100} max={4000} step={10} style={{ ...inputStyle,textAlign:"center",fontWeight:700 }}/>
                </div>
              </div>
            ) : (
              <div style={{ fontSize:11,color:muted,textAlign:"center" }}>{preset.desc} · {preset.w}×{preset.h}px</div>
            )}
            {/* 비율 미리보기 */}
            <div style={{ marginTop:12,display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:10,color:muted }}>비율</div>
              <div style={{ width:Math.min(56,56*imgRatio),height:Math.min(56,56/imgRatio),background:`${accentColor}25`,border:`1.5px solid ${accentColor}50`,borderRadius:3 }}/>
              <div style={{ fontSize:11,color:muted }}>{imgW>imgH?"가로형":imgW<imgH?"세로형":"정사각형"} · {(imgW/imgH).toFixed(2)}:1</div>
            </div>
          </div>

          {/* 참고 이미지 */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:13,fontWeight:700,color:text,marginBottom:4 }}>
              참고 이미지 <span style={{ color:muted,fontWeight:400 }}>(선택 — 이 스타일로 생성)</span>
            </div>
            <div style={{ fontSize:11,color:muted,marginBottom:8,lineHeight:1.6 }}>마음에 드는 상세페이지를 올리면 AI가 색감·분위기를 분석해서 비슷하게 만들어요</div>
            <div onClick={()=>refFileRef.current?.click()}
              style={{ border:`1.5px dashed ${refImg?accentColor:bdr}`,borderRadius:12,padding:"14px 18px",cursor:"pointer",display:"flex",gap:14,alignItems:"center",background:cardBg,transition:"all 0.12s" }}>
              {refImg ? (
                <>
                  <img src={refImg} alt="" style={{ width:68,height:68,objectFit:"cover",borderRadius:9,flexShrink:0 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    {analyzing ? <div style={{ fontSize:12,color:muted }}>분석 중...</div>
                      : refStyle ? <><div style={{ fontSize:11,fontWeight:700,color:accentColor,marginBottom:3 }}>✓ 스타일 분석 완료</div><div style={{ fontSize:11,color:muted,lineHeight:1.55,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{refStyle}</div></> : null}
                  </div>
                  <button onClick={e=>{e.stopPropagation();setRefImg(null);setRefStyle("");}} style={{ padding:"5px 10px",borderRadius:6,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:11,cursor:"pointer",flexShrink:0 }}>제거</button>
                </>
              ) : <div style={{ textAlign:"center",width:"100%",padding:"6px 0" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:text,marginBottom:3 }}>참고 이미지 업로드</div>
                  <div style={{ fontSize:11,color:muted }}>이 스타일과 비슷하게 만들어드려요</div>
                </div>}
            </div>
            <input ref={refFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{handleRef(e.target.files[0]);e.target.value="";}}/>
          </div>

          {/* 이전/생성 버튼 */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={()=>setWizStep(2)}
              style={{ padding:"12px 28px",borderRadius:12,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer" }}>
              ← 이전
            </button>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, color:muted, marginBottom:6 }}>
                예상 차감: <b style={{ color:accentColor }}>{pageCount * 30} 크레딧</b>
                {user && <span style={{ marginLeft:8, color:muted }}>· 보유 {(user.points||0).toLocaleString()} cr</span>}
              </div>
              <button onClick={()=>{ setWizStep(4); generate(); }}
                style={{ padding:"14px 44px",borderRadius:12,border:"none",cursor:"pointer",background:accentColor,color:"#fff",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",gap:8,marginLeft:"auto" }}>
                이미지 {pageCount}장 생성하기 →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 4: 생성 + 결과
  // ══════════════════════════════════════════════════════════════
  if (wizStep === 4) {
    const slideTypes = SLIDE_TYPES.slice(0, slides?.length || 0);
    const currentPng = rendered[curIdx];

    return (
      <div style={{ flex:1, overflowY:"auto" }}>
        <WizHeader />
        <div style={{ maxWidth:1080, margin:"0 auto", padding:"0 20px 60px" }}>

          {/* 생성 중 오버레이 */}
          {loading && progress.total > 0 && (
            <div style={{ borderRadius:16,overflow:"hidden",border:`1px solid ${accentColor}40`,background:isDark?"rgba(0,0,0,0.7)":"rgba(255,255,255,0.97)",marginBottom:20 }}>
              <div style={{ background:`linear-gradient(135deg,${accentColor}22,${accentColor}08)`,padding:"24px 24px 20px",textAlign:"center",borderBottom:`1px solid ${accentColor}20` }}>
                <div style={{ position:"relative",width:72,height:72,margin:"0 auto 16px" }}>
                  <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${accentColor}20` }}/>
                  <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`3px solid transparent`,borderTopColor:accentColor,animation:"spin 1s linear infinite" }}/>
                  <div style={{ position:"absolute",inset:8,borderRadius:"50%",border:`2px solid transparent`,borderTopColor:`${accentColor}60`,animation:"spin 1.5s linear infinite reverse" }}/>
                  <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>🎨</div>
                </div>
                <div style={{ fontSize:16,fontWeight:800,color:text,marginBottom:6 }}>상세페이지 이미지 생성 중</div>
                <div style={{ fontSize:12,color:muted }}>{progress.msg}</div>
              </div>
              <div style={{ padding:"16px 24px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8 }}>
                  <span style={{ color:muted }}>{progress.cur} / {progress.total} 완료</span>
                  <span style={{ fontWeight:800,color:accentColor }}>{Math.round((progress.cur/progress.total)*100)}%</span>
                </div>
                <div style={{ height:8,borderRadius:4,background:isDark?"rgba(255,255,255,0.08)":"#e8e8e8",overflow:"hidden" }}>
                  <div style={{ height:"100%",borderRadius:4,background:`linear-gradient(90deg,${accentColor},${accentColor}bb)`,width:`${(progress.cur/progress.total)*100}%`,transition:"width 0.5s ease",position:"relative",overflow:"hidden" }}>
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"shimmer 1.5s ease-in-out infinite" }}/>
                  </div>
                </div>
                <div style={{ display:"flex",gap:5,marginTop:12,justifyContent:"center",flexWrap:"wrap" }}>
                  {Array.from({length:progress.total}).map((_,i)=>(
                    <div key={i} style={{ width:9,height:9,borderRadius:"50%",background:i<progress.cur?accentColor:i===progress.cur?`${accentColor}50`:isDark?"rgba(255,255,255,0.1)":"#ddd",transition:"all 0.3s",boxShadow:i<progress.cur?`0 0 5px ${accentColor}80`:"none" }}/>
                  ))}
                </div>
                <div style={{ fontSize:11,color:isDark?"rgba(255,255,255,0.35)":"#bbb",marginTop:10,textAlign:"center" }}>페이지를 벗어나면 생성이 중단됩니다</div>
              </div>
            </div>
          )}

          {/* 상단 바 */}
          {!loading && (
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 }}>
              {saveMsg && <div style={{ width:"100%",padding:"9px 14px",borderRadius:9,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",fontSize:13,color:"#4ade80",fontWeight:600 }}>{saveMsg}</div>}
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={()=>setWizStep(3)} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>← 디자인 수정</button>
                <button onClick={resetAll} style={{ padding:"7px 12px",borderRadius:8,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>처음부터</button>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                <button onClick={()=>setCurIdx(Math.max(0,curIdx-1))} disabled={curIdx===0} style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===0?"not-allowed":"pointer",opacity:curIdx===0?0.3:1,fontSize:18 }}>‹</button>
                <span style={{ fontSize:12,color:muted,minWidth:44,textAlign:"center" }}>{curIdx+1} / {slides.length||0}</span>
                <button onClick={()=>setCurIdx(Math.min(slides.length-1,curIdx+1))} disabled={curIdx===slides.length-1} style={{ width:30,height:30,borderRadius:7,border:`1px solid ${bdr}`,background:cardBg,color:text,cursor:curIdx===slides.length-1?"not-allowed":"pointer",opacity:curIdx===slides.length-1?0.3:1,fontSize:18 }}>›</button>
              </div>
            </div>
          )}

          {slides.length > 0 && (
            <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              {/* 메인 */}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:10,fontWeight:800,color:accentColor,letterSpacing:2,marginBottom:8 }}>{slideTypes[curIdx]?.label?.toUpperCase()}</div>
                <div style={{ width:"100%",aspectRatio:`${imgW}/${imgH}`,borderRadius:16,overflow:"hidden",boxShadow:"0 16px 56px rgba(0,0,0,0.28)",background:isDark?"#111":"#eee",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {currentPng
                    ? <img src={currentPng} alt="slide" style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }}/>
                    : <div style={{ textAlign:"center" }}>
                        {!loading && <><div style={{ fontSize:13,color:muted,marginBottom:8 }}>이미지 생성 실패</div>
                        <button onClick={()=>regenerateOne(curIdx)} style={{ padding:"8px 18px",borderRadius:8,border:"none",background:accentColor,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>다시 생성</button></>}
                      </div>}
                </div>
                {/* AI 이미지 글 깨짐 안내 */}
                <div style={{ marginTop:10, padding:"9px 13px", borderRadius:9, background:isDark?"rgba(255,200,0,0.07)":"rgba(180,120,0,0.06)", border:`1px solid ${isDark?"rgba(255,200,0,0.2)":"rgba(180,120,0,0.15)"}`, display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{ fontSize:13, flexShrink:0 }}>💡</span>
                  <div style={{ fontSize:11, color:isDark?"rgba(255,220,80,0.85)":"rgba(100,70,0,0.8)", lineHeight:1.65 }}>
                    AI가 직접 생성한 이미지이므로 <b>이미지 내 텍스트가 깨지거나 어색하게 표시될 수 있어요.</b> 결과가 마음에 들지 않으면 재생성해보세요.
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,marginTop:8 }}>
                  {/* PNG 다운로드 */}
                  <button onClick={saveCurrent} disabled={!currentPng}
                    style={{ flex:1,padding:"11px",borderRadius:10,border:"none",cursor:currentPng?"pointer":"not-allowed",background:accentColor,color:"#fff",fontSize:13,fontWeight:800,opacity:currentPng?1:0.4 }}>
                    PNG 저장
                  </button>
                  {/* 보관함 저장 */}
                  <button onClick={()=>{
                    if (saveOneToLibrary(curIdx)) {
                      setSlotSaveMsg(p=>({...p,[curIdx]:"✅ 보관함 저장!"}));
                      setTimeout(()=>setSlotSaveMsg(p=>({...p,[curIdx]:""})), 2500);
                    }
                  }} disabled={!currentPng}
                    style={{ flex:1,padding:"11px",borderRadius:10,border:`1px solid ${accentColor}`,background:`${accentColor}15`,color:accentColor,fontSize:13,fontWeight:800,cursor:currentPng?"pointer":"not-allowed",opacity:currentPng?1:0.4 }}>
                    {slotSaveMsg[curIdx] || "📁 보관함"}
                  </button>
                  {currentPng && !loading && (
                    <button onClick={()=>regenerateOne(curIdx)}
                      style={{ padding:"11px 14px",borderRadius:10,border:`1px solid ${bdr}`,background:"transparent",color:muted,fontSize:12,cursor:"pointer" }}>🔄</button>
                  )}
                  <button onClick={saveAll} disabled={!rendered.some(Boolean)||saving}
                    style={{ flex:1,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:isDark?"rgba(255,255,255,0.1)":"#2c2c2c",color:"#fff",fontSize:13,fontWeight:800,opacity:rendered.some(Boolean)&&!saving?1:0.4 }}>
                    {saving?"ZIP 저장 중...":"전체 ZIP"}
                  </button>
                </div>
              </div>
              {/* 섬네일 + 슬라이드별 재생성 */}
              <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0, width:110 }}>
                {slides.map((s, i) => {
                  const isRegen = regenIdx === i;
                  const isActive = curIdx === i;
                  const hasImg = !!rendered[i];
                  return (
                    <div key={i} style={{ borderRadius:10, overflow:"hidden", border:`2px solid ${isActive ? accentColor : "transparent"}`, transition:"all 0.12s", background: isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)" }}>
                      {/* 썸네일 이미지 클릭 → 선택 */}
                      <div onClick={()=>setCurIdx(i)} style={{ cursor:"pointer", position:"relative" }}>
                        {hasImg && !isRegen
                          ? <img src={rendered[i]} alt="" style={{ width:"100%", height:Math.round(110*imgH/imgW), display:"block", objectFit:"cover" }}/>
                          : <div style={{ width:"100%", height:Math.round(110*imgH/imgW), background:isDark?"rgba(255,255,255,0.06)":"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {isRegen
                                ? <div style={{ textAlign:"center" }}>
                                    <div style={{ width:20,height:20,borderRadius:"50%",border:`2px solid ${accentColor}50`,borderTopColor:accentColor,animation:"spin 1s linear infinite",margin:"0 auto 4px" }}/>
                                    <div style={{ fontSize:9,color:accentColor,fontWeight:700 }}>생성중</div>
                                  </div>
                                : <div style={{ width:16,height:16,borderRadius:"50%",border:`2px solid ${accentColor}40`,borderTopColor:accentColor,animation:"spin 1s linear infinite" }}/>
                              }
                            </div>}
                        {/* 슬라이드 번호 배지 */}
                        <div style={{ position:"absolute",top:4,left:4,width:18,height:18,borderRadius:5,background:isActive?accentColor:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff" }}>
                          {i+1}
                        </div>
                      </div>
                      {/* 슬라이드명 + 재생성 버튼 */}
                      <div style={{ padding:"4px 5px 5px", background:isDark?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.95)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:2 }}>
                        <div style={{ fontSize:9, color:isActive?accentColor:muted, fontWeight:isActive?800:500, lineHeight:1.2, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {slotSaveMsg[i] ? <span style={{ color:"#4ade80", fontSize:8 }}>{slotSaveMsg[i]}</span> : s.label}
                        </div>
                        {/* 보관함 저장 버튼 */}
                        <button
                          onClick={e => { e.stopPropagation(); if(hasImg && !isRegen) { saveOneToLibrary(i); setSlotSaveMsg(p=>({...p,[i]:"✅"})); setTimeout(()=>setSlotSaveMsg(p=>({...p,[i]:""})), 2500); } }}
                          disabled={!hasImg || isRegen}
                          title={`${s.label} 보관함 저장`}
                          style={{ flexShrink:0, width:20, height:20, borderRadius:5, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:hasImg&&!isRegen?"pointer":"not-allowed", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", opacity:hasImg&&!isRegen?1:0.3, padding:0 }}>
                          📁
                        </button>
                        {/* 재생성 버튼 */}
                        <button
                          onClick={e => { e.stopPropagation(); regenerateOne(i); }}
                          disabled={isRegen || regenIdx !== null || loading}
                          title={`${s.label} 재생성`}
                          style={{ flexShrink:0, width:20, height:20, borderRadius:5, border:`1px solid ${isActive?accentColor:bdr}`, background:"transparent", color:isActive?accentColor:muted, cursor:isRegen||regenIdx!==null||loading?"not-allowed":"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", opacity:isRegen||regenIdx!==null||loading?0.4:1, transition:"all 0.12s", padding:0 }}>
                          {isRegen ? "⟳" : "↺"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {err && <div style={{ marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",fontSize:12,color:"#f87171" }}>{err}</div>}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      </div>
    );
  }

  return null;
}
