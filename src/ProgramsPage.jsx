import React, { useState, useEffect } from "react";
import { getAuthToken, supabase } from "./storage";

async function adminProgramApi(subAction, payload = {}) {
  const token = await getAuthToken();
  const res = await fetch(`/api/sns?action=admin&sub_action=${subAction}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "관리자 요청 실패");
  return data;
}

function updateMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function slugifyKo(input, fallback = "program") {
  const slug = String(input || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  return slug || fallback;
}

function programPath(product) {
  return `/programs/${product.id}/${slugifyKo(product.title, "program")}`;
}

const BRAND = "#3b82f6";
const BRAND2 = "#34C759";
const ACCENT = "#3b82f6";
const INK = "#1A1A2E";
const GRAD = "#3b82f6";

function AutomationIcon({ type, color = BRAND, size = 28 }) {
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  const paths = {
    clock: (
      <>
        <circle cx="12" cy="12" r="8" {...common} />
        <path d="M12 8v4l3 2" {...common} />
      </>
    ),
    repeat: (
      <>
        <path d="M17 2l3 3-3 3" {...common} />
        <path d="M4 11V9a4 4 0 014-4h12" {...common} />
        <path d="M7 22l-3-3 3-3" {...common} />
        <path d="M20 13v2a4 4 0 01-4 4H4" {...common} />
      </>
    ),
    folder: (
      <>
        <path d="M3 6.5A2.5 2.5 0 015.5 4H10l2 2h6.5A2.5 2.5 0 0121 8.5v7A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5v-9z" {...common} />
        <path d="M7 13h10" {...common} />
      </>
    ),
    write: (
      <>
        <path d="M5 19l4.5-1 9-9a2.1 2.1 0 00-3-3l-9 9L5 19z" {...common} />
        <path d="M13.5 7.5l3 3" {...common} />
      </>
    ),
    image: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
        <circle cx="9" cy="10" r="1.5" {...common} />
        <path d="M6.5 17l4.5-4 3 2.5 2-2.5 3.5 4" {...common} />
      </>
    ),
    publish: (
      <>
        <path d="M12 19V5" {...common} />
        <path d="M7 10l5-5 5 5" {...common} />
        <path d="M5 19h14" {...common} />
      </>
    ),
    chart: (
      <>
        <path d="M5 19V5" {...common} />
        <path d="M5 19h14" {...common} />
        <path d="M8 15l3-4 3 2 4-6" {...common} />
      </>
    ),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.write}</svg>;
}

const CATEGORIES = [
  { id: "automation", label: "자동화" },
  { id: "design", label: "디자인" },
  { id: "marketing", label: "마케팅" },
  { id: "utility", label: "유틸리티" },
  { id: "template", label: "템플릿" },
  { id: "free_photo", label: "무료사진", special: true },
  { id: "free_video", label: "무료영상", special: true },
];

const AUTOMATION_DOWNLOAD = {
  fileName: "SNSMakeIt-Setup-0.2.5.zip",
  url: "https://github.com/npermovie-design/cardnews-app/releases/download/app-v0.2.5/SNSMakeIt-Setup-0.2.5.zip",
  size: "452MB",
  version: "v0.2.5",
};
const AUTOMATION_DOWNLOAD_READY = Boolean(AUTOMATION_DOWNLOAD.url);

const AUTOMATION_SECTIONS = [
  {
    title: "SNS 자동 발행",
    desc: "주제 입력부터 AI 글 작성, 이미지/인용구/스티커 배치, 네이버 블로그 발행까지 전 과정을 자동화합니다.",
    points: ["AI SEO 글 생성", "URL 참고 글 탐색", "수동 글쓰기", "다중 계정 순환 발행"],
  },
  {
    title: "콘텐츠 제작 도구",
    desc: "글쓰기 외에도 카드뉴스, 영상 편집, 자료 관리 기능을 하나의 프로그램에서 사용할 수 있습니다.",
    points: ["카드뉴스 제작", "숏폼 영상 편집", "드라이브 자료 연동", "커뮤니티 게시판"],
  },
  {
    title: "운영 관리",
    desc: "발행 현황, 성공률, 자동 운영 상태를 대시보드에서 한눈에 확인하고 프리셋으로 설정을 재사용합니다.",
    points: ["실시간 대시보드", "발행 로그", "프리셋 저장", "자동 업데이트"],
  },
];

const NAVERBOT_SCREENSHOTS = [
  {
    src: "/screenshots/naverbot/capture-home.png",
    label: "프로그램 메인",
    title: "한눈에 보이는 전체 기능 구성",
    desc: "왼쪽 사이드바에서 글쓰기, 카드뉴스, 영상 편집, 자료실, 운영 메뉴를 바로 이동합니다. 로그인 후 구독 플랜에 따라 기능이 활성화됩니다.",
  },
  {
    src: "/screenshots/naverbot/dashboard.png",
    label: "대시보드",
    title: "발행 현황과 자동 운영 상태를 한 화면에서 확인",
    desc: "이번 주 발행 수, 성공률, 전체 발행 수, 자동 운영 테마/카테고리, 최근 발행 글 목록까지 한 화면에서 운영 상태를 파악합니다.",
  },
  {
    src: "/screenshots/naverbot/quick-start.png",
    label: "빠른 시작",
    title: "테마와 카테고리만 넣고 1개 바로 발행",
    desc: "복잡한 설정 없이 테마와 카테고리만 입력하면 AI가 글 구조, 본문, 이미지까지 자동 생성하고 네이버 블로그에 즉시 발행합니다.",
  },
  {
    src: "/screenshots/naverbot/blog-modes.png",
    label: "발행 방식",
    title: "빠른 발행 / 자동 운영 / 사진 자동 운영 3가지 모드",
    desc: "1회 빠른 발행, 매일 자동 발행하는 상세 운영, 구글 드라이브 사진을 활용한 자동 운영까지 목적에 맞는 방식을 선택합니다.",
  },
  {
    src: "/screenshots/naverbot/drive-setup.png",
    label: "드라이브 연동",
    title: "내 사진과 자료로 블로그 글 자동 완성",
    desc: "구글 드라이브 폴더 링크를 넣으면 이미지는 본문에 삽입하고, 텍스트 파일은 글감으로 활용해 나만의 콘텐츠를 자동 생성합니다.",
  },
];

const FEATURE_VISUALS = [
  {
    src: "/screenshots/naverbot/feature-quick-publish.png",
    label: "1분 발행",
    title: "테마와 카테고리만 입력하면 1분 안에 블로그 글 완성",
  },
  {
    src: "/screenshots/naverbot/feature-blog-main.png",
    label: "3가지 모드",
    title: "빠른 발행, 자동 운영, 사진 기반 운영을 한 화면에서 선택",
  },
  {
    src: "/screenshots/naverbot/feature-drive-complete.png",
    label: "드라이브 연동",
    title: "내 사진과 글감을 연결하면 인용구, 스티커까지 자동 배치",
  },
  {
    src: "/screenshots/naverbot/feature-account-setup.png",
    label: "계정 관리",
    title: "네이버 계정 연결부터 다중 계정 순환 발행까지 지원",
  },
  {
    src: "/screenshots/naverbot/feature-topic-drive.png",
    label: "주제 + 자료",
    title: "글 방향, 테마, 드라이브 폴더를 한 번에 설정",
  },
  {
    src: "/screenshots/naverbot/feature-drive-folder.png",
    label: "사진 자동 삽입",
    title: "폴더 속 이미지를 불러와 본문에 자동 배치하고 글 완성",
  },
  {
    src: "/screenshots/naverbot/setup-4-steps.png",
    label: "4단계 시작",
    title: "설치부터 첫 발행까지 4단계로 바로 시작",
  },
  {
    src: "/screenshots/naverbot/pricing-policy.png",
    label: "가격 정책",
    title: "현재 무료 초기 배포 단계, 안정화 후 월 구독형 전환 예정",
  },
];

const LANDING_FEATURES = [
  {
    title: "빠른 시작",
    desc: "테마와 카테고리만 입력하면 AI가 제목, 본문, 소제목, 이미지 배치까지 자동으로 구성해 1개 글을 바로 발행합니다. 네이버 블로그 템플릿 이름을 입력하면 기존 템플릿 스타일도 반영됩니다.",
  },
  {
    title: "수동 글쓰기",
    desc: "AI가 초안을 작성하면 미리보기에서 직접 수정하고 발행합니다. URL을 넣으면 해당 페이지의 텍스트와 이미지를 자동으로 가져와 글감으로 활용할 수 있고, 이미지 호버 미리보기로 원하는 사진만 골라 삽입합니다.",
  },
  {
    title: "상세 자동 운영",
    desc: "주제, 스타일, 발행 설정을 단계별로 진행합니다. 다중 테마 순환, 인용구 6종, 키워드 강조 색상, 카테고리 순환, 시간대 분산 발행 같은 세부 조건을 한 흐름으로 묶어 매일 자동으로 발행합니다.",
  },
  {
    title: "구글 드라이브 자료 기반 발행",
    desc: "드라이브 폴더 링크를 넣으면 이미지는 본문에 자동 삽입하고, 텍스트 파일은 글감으로 활용합니다. 직접 촬영한 사진이나 정리된 자료가 많은 운영자에게 적합합니다.",
  },
  {
    title: "URL 참고 글 탐색",
    desc: "참고할 URL을 입력하면 Playwright 브라우저가 해당 페이지를 탐색해 텍스트와 이미지를 추출합니다. 추출된 내용을 기반으로 AI가 새로운 글을 작성하고, 원본 이미지도 선택해서 삽입할 수 있습니다.",
  },
  {
    title: "운영 대시보드",
    desc: "이번 주 발행 수, 성공률, 전체 발행 수, 현재 자동 운영 상태, 최근 발행 글 목록을 대시보드에서 한눈에 확인합니다. 발행된 글 URL을 바로 열어 결과를 검토할 수 있습니다.",
  },
];

const INTERACTIVE_FLOW = [
  {
    label: "설치",
    title: "Windows 파일 설치",
    desc: "설치 파일을 다운로드하고 실행하면 Python, Playwright, 브라우저가 모두 내장되어 별도 설정 없이 바로 사용할 수 있습니다.",
  },
  {
    label: "로그인",
    title: "메이킷 계정 연결",
    desc: "메이킷 계정으로 로그인하면 구독 플랜에 따라 기능이 활성화됩니다. Google 계정으로도 간편 로그인이 가능합니다.",
  },
  {
    label: "계정 설정",
    title: "네이버 계정 연결",
    desc: "네이버 블로그에 발행할 계정을 등록합니다. 여러 계정을 등록하면 글마다 순환 발행할 수 있습니다.",
  },
  {
    label: "발행",
    title: "테마 입력 후 자동 발행",
    desc: "빠른 시작으로 1개 바로 발행하거나, 상세 설정으로 매일 자동 운영합니다. 대시보드에서 발행 현황과 결과를 실시간 확인합니다.",
  },
];

/*
  detailContent 구조:
  - { type: "text", value: "직접 작성한 설명 텍스트..." }
  - { type: "image", value: "이미지 URL", alt: "설명" }
  - { type: "heading", value: "소제목" }
  - { type: "divider" }

  나중에 관리자 페이지에서 이 배열을 편집/저장하는 방식으로 확장
*/

const DEMO_PRODUCTS = [
  {
    id: 1, title: "SNS메이킷 프로그램 v0.2.5",
    desc: "테마만 입력하면 AI가 네이버 블로그 글을 자동 생성하고, 카테고리 선택부터 이미지 삽입, 발행까지 한 번에 처리합니다. 빠른 시작 모드로 1분 안에 첫 발행이 가능합니다.",
    category: "automation", price: 0, priceLabel: "무료",
    version: "v0.2.5", platform: "Windows 10/11",
    fileSize: "430MB", downloadCount: 180, viewCount: 420,
    tags: ["자동화", "블로그", "네이버", "글쓰기", "SEO", "영상편집"],
    downloadUrl: "https://github.com/npermovie-design/cardnews-app/releases/download/app-v0.2.5/SNSMakeIt-Setup-0.2.5.exe",
    thumbnail: "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/uploads/automation-thumb.png",
    detailContent: [
      { type: "heading", value: "SNS메이킷 프로그램이란?" },
      { type: "text", value: "반복적인 SNS 콘텐츠 운영을 자동화하는 데스크톱 프로그램입니다.\n주제를 입력하면 AI가 글 구조를 잡고 본문을 작성한 뒤, 인용구, 소제목, 이미지, 스티커를 포함해 발행 가능한 형태로 정리합니다.\n매일 비슷한 작업을 반복하는 운영자, 마케터, 1인 사업자에게 적합합니다." },
      { type: "image", value: "/screenshots/naverbot/setup-4-steps.png", alt: "설치부터 첫 발행까지 4단계" },
      { type: "divider" },

      { type: "heading", value: "SNS 자동 발행" },
      { type: "text", value: "테마와 카테고리만 입력하면 AI가 SEO 최적화된 블로그 글을 자동 생성하고 네이버 블로그에 발행합니다." },
      { type: "image", value: "/screenshots/naverbot/feature-quick-publish.png", alt: "1분 만에 블로그 글 완성" },
      { type: "text", value: "- 빠른 시작: 테마 + 카테고리만 입력하면 1개 바로 발행\n- AI 글 자동 생성: 최신 뉴스/트렌드 분석 후 SEO 최적화 본문 작성\n- 다중 테마 순환: 쉼표로 여러 테마 입력 시 순환하며 발행\n- 카테고리 자동 선택: 네이버 블로그 카테고리 정확 매칭" },
      { type: "divider" },

      { type: "heading", value: "수동 글쓰기 + URL 탐색" },
      { type: "text", value: "AI 초안을 미리보기에서 직접 수정하고 발행하는 수동 모드를 지원합니다.\n참고 URL을 입력하면 Playwright 브라우저가 해당 페이지의 텍스트와 이미지를 자동 추출합니다." },
      { type: "text", value: "- URL 입력 시 텍스트/이미지 자동 크롤링 (Playwright 로컬 탐색)\n- 이미지 호버 미리보기로 원본 확인 후 선택 삽입\n- 글 톤, 말투, 분량, 키워드 강조 설정\n- short/medium/long 분량별 4,000~16,000 토큰 지원\n- [image:] 마커 6~10개 자동 삽입" },
      { type: "divider" },

      { type: "heading", value: "상세 자동 운영" },
      { type: "image", value: "/screenshots/naverbot/feature-blog-main.png", alt: "3가지 발행 모드" },
      { type: "text", value: "주제, 스타일, 발행 설정을 단계별로 진행하는 상세 자동 운영 모드입니다." },
      { type: "text", value: "- 테마 순환 + 카테고리 순환 발행\n- 인용구 스타일 6종 (따옴표, 버티컬 라인, 말풍선, 포스트잇, 프레임)\n- 키워드 포인트 글색 자동 적용 (글색/배경색/둘다)\n- 발행 시간 분산 (아침/점심/저녁, 오전/오후)\n- 발행 실패 자동 재시도\n- 프리셋 저장/불러오기" },
      { type: "divider" },

      { type: "heading", value: "구글 드라이브 자료 기반 발행" },
      { type: "image", value: "/screenshots/naverbot/feature-drive-complete.png", alt: "드라이브만 연결하면 사진, 글, 인용구, 스티커까지 자동 구성" },
      { type: "text", value: "드라이브 폴더 링크를 넣으면 이미지는 본문에 자동 삽입, 텍스트는 글감으로 활용합니다.\n하위 폴더 포함 옵션으로 폴더 구조까지 활용할 수 있습니다." },
      { type: "image", value: "/screenshots/naverbot/feature-drive-folder.png", alt: "폴더 속 사진과 텍스트를 자동으로 가져와 블로그 글 완성" },
      { type: "divider" },

      { type: "heading", value: "계정 관리 + 대시보드" },
      { type: "image", value: "/screenshots/naverbot/feature-account-setup.png", alt: "네이버 계정 연결 화면" },
      { type: "text", value: "- 네이버 다중 계정 등록 및 순환 발행\n- 홈 대시보드: 발행 통계, 최근 발행 글, 자동 운영 상태\n- 5단계 진행 프로그레스바 (계정 확인 > 글 생성 > 에디터 > 본문 입력 > 발행)\n- 발행된 글 URL 바로 열기\n- Windows 데스크톱 알림" },
      { type: "divider" },

      { type: "heading", value: "추가 기능" },
      { type: "text", value: "- 카드뉴스 제작: 템플릿 기반 SNS 카드 이미지 생성\n- 영상 편집: 숏폼 편집기 (자막, 트랜지션, OpusClip 방식 하이라이트)\n- 커뮤니티: 홈페이지와 동기화되는 게시판\n- 챌린지: 미션 참여 및 진행 현황 확인\n- 자동 업데이트: 새 버전 출시 시 알림 팝업" },
      { type: "divider" },

      { type: "heading", value: "가격 정책" },
      { type: "image", value: "/screenshots/naverbot/pricing-policy.png", alt: "가격 정책 안내" },
      { type: "text", value: "현재 초기 배포 단계로 무료 제공 중입니다.\n기능 안정화와 사용량 기준이 확정되면 월 구독형으로 전환될 예정입니다." },
      { type: "divider" },

      { type: "heading", value: "시스템 요구사항" },
      { type: "text", value: "- Windows 10/11 (64-bit)\n- 8GB RAM 이상 권장\n- 인터넷 연결 필수\n- 네이버 계정 필요\n- Python/Playwright 별도 설치 불필요 (내장)" },
    ],
  },
  {
    id: 2, title: "상세페이지 템플릿 팩 Vol.1",
    desc: "쇼핑몰 상세페이지 제작 시간을 줄여주는 PSD/Figma 템플릿 팩입니다. 식품, 뷰티, 패션, 전자제품 등 주요 카테고리에 맞춰 섹션 구성이 준비되어 있습니다.",
    category: "template", price: 9900, priceLabel: "9,900원",
    version: "v1.0", platform: "PSD / Figma",
    fileSize: "320MB", downloadCount: 56, viewCount: 189,
    tags: ["템플릿", "상세페이지", "디자인"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "heading", value: "바로 편집 가능한 상세페이지 템플릿" },
      { type: "text", value: "상품 소개, 핵심 장점, 사용 장면, 구매 유도 섹션까지 기본 구조가 잡혀 있는 상세페이지 템플릿 10종입니다.\nPSD와 Figma 파일을 함께 제공해 디자이너와 운영자가 각자의 작업 방식에 맞게 수정할 수 있습니다." },
      { type: "divider" },
      { type: "text", value: "- 10종 카테고리별 템플릿 (식품, 뷰티, 패션, 전자제품, 생활용품)\n- PSD + Figma 동시 제공\n- 모바일 최적화 세로형 레이아웃\n- 폰트/컬러 가이드 포함" },
    ],
  },
  {
    id: 3, title: "키워드 분석 리포트 생성기",
    desc: "네이버/구글 키워드의 검색량, 경쟁도, 확장 키워드를 정리해 콘텐츠 기획용 리포트로 만들어주는 분석 도구입니다. 결과는 엑셀로 내보낼 수 있습니다.",
    category: "marketing", price: 19900, priceLabel: "19,900원",
    version: "v2.1", platform: "Windows / Mac",
    fileSize: "28MB", downloadCount: 89, viewCount: 245,
    tags: ["마케팅", "키워드", "SEO"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "heading", value: "콘텐츠 기획을 위한 키워드 리포트" },
      { type: "text", value: "키워드별 검색량과 경쟁도를 확인하고, 함께 다루기 좋은 연관 키워드와 롱테일 키워드를 정리합니다.\n블로그 글감 선정, 광고 소재 기획, 상세페이지 문구 작성 전에 참고할 수 있는 리포트를 빠르게 만들 수 있습니다." },
    ],
  },
  {
    id: 4, title: "이미지 일괄 리사이즈 툴",
    desc: "여러 장의 이미지를 지정한 규격으로 한 번에 변환하는 유틸리티입니다. 리사이즈, 워터마크, 포맷 변환, 압축 설정을 일괄 적용할 수 있습니다.",
    category: "utility", price: 0, priceLabel: "무료",
    version: "v1.3", platform: "Windows",
    fileSize: "12MB", downloadCount: 203, viewCount: 478,
    tags: ["유틸리티", "이미지", "일괄처리"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "text", value: "쇼핑몰, 블로그, SNS 운영자를 위한 이미지 일괄 처리 도구입니다.\n드래그 앤 드롭으로 여러 이미지를 추가한 뒤 원하는 크기와 포맷을 지정하면, 업로드용 이미지 세트를 빠르게 만들 수 있습니다. 워터마크와 압축률도 함께 설정할 수 있습니다." },
    ],
  },
];

/* ── 관리자 프로그램 등록/수정 모달 ── */
function ProgramUploadModal({ C, onClose, onSave, editItem, isMobile }) {
  const [form, setForm] = useState(editItem || {
    title: "", desc: "", category: "automation", price: 0,
    version: "v1.0", platform: "Windows", fileSize: "",
    tags: "", downloadUrl: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(editItem?.thumbnail || null);
  const [programFile, setProgramFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [detailBlocks, setDetailBlocks] = useState(editItem?.detailContent || []);

  const handleThumbnail = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnailFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleProgramFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProgramFile(f);
    const sizeMB = (f.size / 1024 / 1024).toFixed(1);
    setForm(prev => ({ ...prev, fileSize: sizeMB + "MB" }));
  };

  const handleDetailImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDetailBlocks(prev => [...prev, { type: "image", value: ev.target.result, alt: f.name, _file: f }]);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const addDetailBlock = (type) => {
    if (type === "text") setDetailBlocks(prev => [...prev, { type: "text", value: "" }]);
    if (type === "heading") setDetailBlocks(prev => [...prev, { type: "heading", value: "" }]);
    if (type === "divider") setDetailBlocks(prev => [...prev, { type: "divider" }]);
  };

  const updateDetailBlock = (idx, key, val) => {
    setDetailBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  const removeDetailBlock = (idx) => {
    setDetailBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveDetailBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= detailBlocks.length) return;
    setDetailBlocks(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
    return (bytes / 1024 / 1024).toFixed(1) + "MB";
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("프로그램 이름을 입력하세요."); return; }
    if (!form.desc.trim()) { setError("설명을 입력하세요."); return; }
    setUploading(true); setError("");

    try {
      const ts = Date.now();
      let thumbnailUrl = editItem?.thumbnail || null;
      let downloadUrl = form.downloadUrl || editItem?.downloadUrl || null;

      // 썸네일 업로드
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split(".").pop();
        const path = `programs/thumbnails/${ts}.${ext}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, thumbnailFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }

      // 프로그램 파일 업로드
      if (programFile) {
        const safeName = programFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `programs/files/${ts}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, programFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        downloadUrl = urlData.publicUrl;
      }

      // 상세 이미지 업로드
      const finalBlocks = [];
      for (const block of detailBlocks) {
        if (block.type === "image" && block._file) {
          const ext = block._file.name.split(".").pop();
          const imgPath = `programs/detail/${ts}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: imgErr } = await supabase.storage.from("public-assets").upload(imgPath, block._file, { upsert: true });
          if (imgErr) throw imgErr;
          const { data: imgUrl } = supabase.storage.from("public-assets").getPublicUrl(imgPath);
          finalBlocks.push({ type: "image", value: imgUrl.publicUrl, alt: block.alt || "" });
        } else {
          const { _file, ...clean } = block;
          finalBlocks.push(clean);
        }
      }

      const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const price = Number(form.price) || 0;

      const productData = {
        title: form.title.trim(),
        desc: form.desc.trim(),
        category: form.category,
        price,
        price_label: price === 0 ? "무료" : price.toLocaleString("ko-KR") + "원",
        version: form.version || "v1.0",
        platform: form.platform || "Windows",
        file_size: form.fileSize || "",
        tags,
        thumbnail: thumbnailUrl,
        download_url: downloadUrl,
        download_count: editItem?.downloadCount || 0,
        view_count: editItem?.viewCount || 0,
        detail_content: finalBlocks,
      };

      if (editItem?.dbId) {
        await adminProgramApi("program_update", { id: editItem.dbId, productData });
      } else {
        await adminProgramApi("program_create", { productData });
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError("업로드 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
    background: "#f9fafb", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
        background: "#fff", color: "#111",
        borderRadius: 20, padding: isMobile ? "24px 20px" : "36px 32px",
        border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111" }}>
            {editItem ? "프로그램 수정" : "프로그램 등록"}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
            background: "transparent", cursor: "pointer", fontSize: 16, color: "#9ca3af",
          }}>x</button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 썸네일 */}
          <div>
            <label style={labelStyle}>썸네일 이미지</label>
            {thumbnailPreview && (
              <div style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <img src={thumbnailPreview} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleThumbnail} />
          </div>

          {/* 프로그램명 */}
          <div>
            <label style={labelStyle}>프로그램명 *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="예: SNS 자동화 봇 v1.0" style={inputStyle} />
          </div>

          {/* 설명 */}
          <div>
            <label style={labelStyle}>간단 설명 *</label>
            <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              placeholder="프로그램에 대한 간단한 설명을 입력하세요." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>

          {/* 카테고리 + 가격 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>카테고리</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="automation">자동화</option>
                <option value="design">디자인</option>
                <option value="marketing">마케팅</option>
                <option value="utility">유틸리티</option>
                <option value="template">템플릿</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>가격 (0 = 무료)</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0" style={inputStyle} />
            </div>
          </div>

          {/* 버전 + 플랫폼 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>버전</label>
              <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                placeholder="v1.0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>플랫폼</label>
              <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="Windows">Windows</option>
                <option value="Mac">Mac</option>
                <option value="Windows / Mac">Windows / Mac</option>
                <option value="Web">Web</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
                <option value="PSD / Figma">PSD / Figma</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label style={labelStyle}>태그 (쉼표로 구분)</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="자동화, 블로그, 네이버" style={inputStyle} />
          </div>

          {/* 프로그램 파일 업로드 */}
          <div>
            <label style={labelStyle}>프로그램 파일 (ZIP, EXE 등)</label>
            {programFile && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>{programFile.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{formatFileSize(programFile.size)}</div>
              </div>
            )}
            <input type="file" onChange={handleProgramFile} />
          </div>

          {/* 외부 링크 (선택) */}
          <div>
            <label style={labelStyle}>또는 외부 다운로드 링크</label>
            <input value={form.downloadUrl} onChange={e => setForm(p => ({ ...p, downloadUrl: e.target.value }))}
              placeholder="https://..." style={inputStyle} />
          </div>

          {/* 상세 설명 편집 */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20, marginTop: 4 }}>
            <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>상세 설명 (이미지 / 텍스트)</label>

            {detailBlocks.map((block, idx) => (
              <div key={idx} style={{
                marginBottom: 10, padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fafafa",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                    {block.type === "text" ? "텍스트" : block.type === "heading" ? "소제목" : block.type === "image" ? "이미지" : "구분선"}
                  </span>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => moveDetailBlock(idx, -1)} disabled={idx === 0} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d1d5db", background: "#fff",
                      cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "#6b7280", opacity: idx === 0 ? 0.3 : 1,
                    }}>&#9650;</button>
                    <button onClick={() => moveDetailBlock(idx, 1)} disabled={idx === detailBlocks.length - 1} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d1d5db", background: "#fff",
                      cursor: idx === detailBlocks.length - 1 ? "default" : "pointer", fontSize: 10, color: "#6b7280",
                      opacity: idx === detailBlocks.length - 1 ? 0.3 : 1,
                    }}>&#9660;</button>
                    <button onClick={() => removeDetailBlock(idx)} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #fca5a5", background: "#fef2f2",
                      cursor: "pointer", fontSize: 12, color: "#ef4444",
                    }}>x</button>
                  </div>
                </div>
                {block.type === "heading" && (
                  <input value={block.value} onChange={e => updateDetailBlock(idx, "value", e.target.value)}
                    placeholder="소제목 입력..." style={{ ...inputStyle, fontWeight: 700 }} />
                )}
                {block.type === "text" && (
                  <textarea value={block.value} onChange={e => updateDetailBlock(idx, "value", e.target.value)}
                    placeholder="설명 텍스트..." rows={3}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                )}
                {block.type === "image" && (
                  <img src={block.value} alt={block.alt || ""} style={{ maxWidth: "100%", borderRadius: 8 }} />
                )}
                {block.type === "divider" && (
                  <hr style={{ border: "none", borderTop: "1px dashed #d1d5db", margin: "4px 0" }} />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>+ 이미지:</span>
                <input type="file" accept="image/*" onChange={handleDetailImage} style={{ fontSize: 12 }} />
              </div>
              {[
                { label: "+ 텍스트", action: () => addDetailBlock("text") },
                { label: "+ 소제목", action: () => addDetailBlock("heading") },
                { label: "+ 구분선", action: () => addDetailBlock("divider") },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{
                  padding: "6px 14px", borderRadius: 8, border: "1px dashed #c4b5fd",
                  background: "#f5f3ff", color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>{btn.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "12px 28px", borderRadius: 12, border: "1px solid #e5e7eb",
            background: "transparent", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={uploading} style={{
            padding: "12px 28px", borderRadius: 12, border: "none",
            background: uploading ? "#a0a0a0" : GRAD,
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: uploading ? "default" : "pointer",
          }}>
            {uploading ? "업로드 중..." : (editItem ? "수정 완료" : "등록하기")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 상세 콘텐츠 블록 렌더러 ── */
function DetailContentRenderer({ blocks, C }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} style={{
              fontSize: 22, fontWeight: 700, marginBottom: 14, marginTop: i === 0 ? 0 : 36,
              paddingBottom: 12, borderBottom: `2px solid ${BRAND}20`, color: C.text,
            }}>
              {block.value}
            </h2>
          );
        }
        if (block.type === "text") {
          return (
            <div key={i} style={{ fontSize: 15, color: C.text, lineHeight: 2, marginBottom: 16, whiteSpace: "pre-wrap" }}>
              {block.value}
            </div>
          );
        }
        if (block.type === "image") {
          return (
            <div key={i} style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden" }}>
              <img src={block.value} alt={block.alt || ""} style={{ width: "100%", display: "block", borderRadius: 12 }} />
              {block.alt && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 }}>{block.alt}</div>}
            </div>
          );
        }
        if (block.type === "video") {
          const ytMatch = block.value && block.value.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) {
            return (
              <div key={i} style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          }
          return null;
        }
        if (block.type === "divider") {
          return <hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "28px 0" }} />;
        }
        return null;
      })}
    </div>
  );
}

/* ── 상세 페이지 ── */
function ProductDetail({ p, C, user, onLogin, onBack, isMobile, isAdmin, onUpdateDetail, onDownload, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editBlocks, setEditBlocks] = useState(p.detailContent || []);

  const addBlock = (type) => {
    if (type === "text") setEditBlocks(prev => [...prev, { type: "text", value: "" }]);
    if (type === "heading") setEditBlocks(prev => [...prev, { type: "heading", value: "" }]);
    if (type === "divider") setEditBlocks(prev => [...prev, { type: "divider" }]);
  };

  const addImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditBlocks(prev => [...prev, { type: "image", value: ev.target.result, alt: file.name }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateBlock = (idx, key, val) => {
    setEditBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  const removeBlock = (idx) => {
    setEditBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editBlocks.length) return;
    setEditBlocks(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const saveEdit = () => {
    if (onUpdateDetail) onUpdateDetail(p.id, editBlocks);
    setEditing(false);
  };

  const displayBlocks = editing ? editBlocks : (p.detailContent || []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* 뒤로가기 + 관리자 액션 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.muted, cursor: "pointer",
          fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
        }}
        onMouseEnter={e => e.currentTarget.style.color = BRAND}
        onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          프로그램 목록
        </button>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit && onEdit(p)} style={{
              padding: "7px 16px", borderRadius: 8, border: `1px solid ${BRAND}40`,
              background: `${BRAND}08`, color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>수정</button>
            <button onClick={() => onDelete && onDelete(p.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid #ef444440",
              background: "#ef444408", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>삭제</button>
          </div>
        )}
      </div>

      {/* 상단: 상품 요약 정보 */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 24 : 48,
          padding: isMobile ? "24px 20px" : "40px 44px", borderRadius: 24,
          background: C.bg === "#fff"
            ? "linear-gradient(135deg, #f8f6ff 0%, #fdf2f8 50%, #f0f9ff 100%)"
            : "linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(236,72,153,0.06) 50%, rgba(59,130,246,0.04) 100%)",
          border: `1px solid ${C.border}`,
        }}>
          {/* 썸네일 */}
          <div style={{
            background: C.bg === "#fff" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)",
            borderRadius: 20, aspectRatio: isMobile ? "16/10" : "4/3",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.bg === "#fff" ? "rgba(0,0,0,0.06)" : C.border}`,
            position: "relative", overflow: "hidden",
          }}>
            {p.thumbnail ? (
              <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} />
            ) : (
              <div style={{ textAlign: "center", padding: 40 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.15, marginBottom: 12 }}>
                  <rect x="8" y="12" width="48" height="40" rx="4" stroke={C.text} strokeWidth="2.5"/>
                  <path d="M8 20h48M20 12v8" stroke={C.text} strokeWidth="2.5"/>
                  <circle cx="24" cy="32" r="4" stroke={C.text} strokeWidth="2"/>
                  <path d="M36 28l8 8-4 4" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>프로그램 미리보기</div>
              </div>
            )}
            <div style={{
              position: "absolute", top: 16, right: 16,
              padding: "6px 16px", borderRadius: 20,
              background: p.price === 0 ? "#10b981" : GRAD,
              color: "#fff", fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              {p.priceLabel}
            </div>
          </div>

          {/* 우측 정보 */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {p.tags.map(t => (
                <span key={t} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: C.bg === "#fff" ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)",
                  color: BRAND,
                }}>{t}</span>
              ))}
            </div>
            <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.25, letterSpacing: -0.5 }}>
              {p.title}
            </h1>
            <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, marginBottom: 24 }}>{p.desc}</div>

            {/* 메타 정보 */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, marginBottom: 28,
              borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`,
              background: C.bg === "#fff" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.04)",
            }}>
              {[
                { label: "버전", value: p.version },
                { label: "플랫폼", value: p.platform },
                { label: "용량", value: p.fileSize },
                { label: "조회", value: `${(p.viewCount || 0).toLocaleString()}` },
                { label: "다운로드", value: `${(p.downloadCount || 0).toLocaleString()}` },
              ].map((m, i) => (
                <div key={m.label} style={{
                  padding: isMobile ? "12px 6px" : "16px", textAlign: "center",
                  borderRight: i < 4 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</div>
                  <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* CTA - 바로 다운로드 */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {p.downloadUrl ? (
                <a href={p.downloadUrl} download style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "15px 40px", borderRadius: 14, background: GRAD, color: "#fff",
                  fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer", textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)", flex: isMobile ? 1 : "unset",
                }} onClick={() => { if (onDownload) onDownload(p.id); }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {p.price === 0 ? "무료 다운로드" : "구매하기"}
                </a>
              ) : (
                <button style={{
                  padding: "15px 40px", borderRadius: 14,
                  background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.08)",
                  color: C.muted, fontWeight: 700, fontSize: 16, border: "none", cursor: "default",
                  flex: isMobile ? 1 : "unset",
                }}>준비중</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 상세 설명 영역 */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>
        {/* 관리자: 편집 토글 */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
            {editing ? (
              <>
                <button onClick={() => { setEditBlocks(p.detailContent || []); setEditing(false); }} style={{
                  padding: "8px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>취소</button>
                <button onClick={saveEdit} style={{
                  padding: "8px 20px", borderRadius: 10, border: "none",
                  background: GRAD, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>저장</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                padding: "8px 20px", borderRadius: 10, border: `1px solid ${BRAND}40`,
                background: `${BRAND}08`, color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>상세 설명 편집</button>
            )}
          </div>
        )}

        {/* 구분선 + 제목 */}
        <div style={{
          padding: "20px 0 24px", marginBottom: 8,
          borderTop: `1px solid ${C.border}`,
          fontSize: 18, fontWeight: 700, color: C.text,
        }}>
          상세 설명
        </div>

        {/* 편집 모드 */}
        {editing ? (
          <div>
            {editBlocks.map((block, idx) => (
              <div key={idx} style={{
                marginBottom: 12, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.bg === "#fff" ? "#fafafa" : "rgba(255,255,255,0.03)",
              }}>
                {/* 블록 컨트롤 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>
                    {block.type === "text" ? "텍스트" : block.type === "heading" ? "소제목" : block.type === "image" ? "이미지" : "구분선"}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent",
                      cursor: idx === 0 ? "default" : "pointer", fontSize: 12, color: C.muted, opacity: idx === 0 ? 0.3 : 1,
                    }}>&#9650;</button>
                    <button onClick={() => moveBlock(idx, 1)} disabled={idx === editBlocks.length - 1} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent",
                      cursor: idx === editBlocks.length - 1 ? "default" : "pointer", fontSize: 12, color: C.muted,
                      opacity: idx === editBlocks.length - 1 ? 0.3 : 1,
                    }}>&#9660;</button>
                    <button onClick={() => removeBlock(idx)} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid #ef444440`, background: "#ef444410",
                      cursor: "pointer", fontSize: 14, color: "#ef4444",
                    }}>x</button>
                  </div>
                </div>

                {/* 블록 에디터 */}
                {block.type === "heading" && (
                  <input value={block.value} onChange={e => updateBlock(idx, "value", e.target.value)}
                    placeholder="소제목 입력..."
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.text, fontSize: 16, fontWeight: 700, outline: "none",
                      boxSizing: "border-box",
                    }} />
                )}
                {block.type === "text" && (
                  <textarea value={block.value} onChange={e => updateBlock(idx, "value", e.target.value)}
                    placeholder="설명 텍스트를 입력하세요..."
                    rows={5}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.text, fontSize: 14, lineHeight: 1.8, outline: "none",
                      resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                    }} />
                )}
                {block.type === "image" && (
                  <div>
                    <img src={block.value} alt={block.alt || ""} style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />
                    <input value={block.alt || ""} onChange={e => updateBlock(idx, "alt", e.target.value)}
                      placeholder="이미지 설명 (선택)"
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                        background: "transparent", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
                      }} />
                  </div>
                )}
                {block.type === "divider" && (
                  <hr style={{ border: "none", borderTop: `1px dashed ${C.border}`, margin: "8px 0" }} />
                )}
              </div>
            ))}

            {/* 블록 추가 버튼들 */}
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", padding: "20px 0",
              borderTop: `1px dashed ${C.border}`, marginTop: 12,
            }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, alignSelf: "center", marginRight: 4 }}>블록 추가:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>+ 이미지:</span>
                <input type="file" accept="image/*" onChange={addImage} style={{ fontSize: 12 }} />
              </div>
              {[
                { label: "텍스트", action: () => addBlock("text") },
                { label: "소제목", action: () => addBlock("heading") },
                { label: "구분선", action: () => addBlock("divider") },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{
                  padding: "6px 16px", borderRadius: 8, border: `1px dashed ${BRAND}40`,
                  background: `${BRAND}06`, color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  + {btn.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 뷰 모드 */
          displayBlocks.length > 0 ? (
            <DetailContentRenderer blocks={displayBlocks} C={C} />
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.2, marginBottom: 12 }}>
                <rect x="6" y="8" width="36" height="32" rx="3" stroke={C.muted} strokeWidth="2"/>
                <path d="M14 18h20M14 24h16M14 30h10" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 500 }}>상세 설명이 아직 등록되지 않았습니다.</div>
              {isAdmin && (
                <button onClick={() => setEditing(true)} style={{
                  marginTop: 16, padding: "8px 24px", borderRadius: 10, border: `1px solid ${BRAND}40`,
                  background: `${BRAND}08`, color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>상세 설명 작성하기</button>
              )}
            </div>
          )
        )}
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 90px" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: BRAND, marginBottom: 8 }}>Download</div>
          <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, margin: 0, lineHeight: 1.25 }}>운영 환경에 맞게 설치하세요</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={{
            borderRadius: 18, border: `1px solid ${BRAND}30`,
            background: C.bg === "#fff" ? "linear-gradient(135deg,#f8f6ff,#ffffff)" : "rgba(0,0,0,0.06)",
            padding: isMobile ? 22 : 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Windows용</div>
                <div style={{ fontSize: 13, color: C.muted }}>Windows 10/11 설치 파일</div>
              </div>
              <span style={{ padding: "7px 12px", borderRadius: 999, background: "#10b98115", color: "#10b981", fontSize: 12, fontWeight: 800 }}>다운로드 가능</span>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13, color: C.muted, marginBottom: 20 }}>
              <div>파일명: {AUTOMATION_DOWNLOAD.fileName}</div>
              <div>버전: {AUTOMATION_DOWNLOAD.version} · 용량: {AUTOMATION_DOWNLOAD.size}</div>
            </div>
            <a
              href={AUTOMATION_DOWNLOAD.url}
              download={AUTOMATION_DOWNLOAD.fileName}
              onClick={() => onDownload && onDownload(p.id)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "14px 22px", borderRadius: 12, background: GRAD, color: "#fff",
                fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Windows 파일 받기
            </a>
          </div>

          <div style={{
            borderRadius: 18, border: `1px solid ${C.border}`,
            background: C.bg === "#fff" ? "#f8fafc" : "rgba(255,255,255,0.04)",
            padding: isMobile ? 22 : 28,
            opacity: 0.9,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Mac용</div>
                <div style={{ fontSize: 13, color: C.muted }}>macOS 버전은 준비 중입니다</div>
              </div>
              <span style={{ padding: "7px 12px", borderRadius: 999, background: `${BRAND}12`, color: BRAND, fontSize: 12, fontWeight: 800 }}>개발중</span>
            </div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>
              Mac 환경에서도 동일한 자동화 흐름을 사용할 수 있도록 별도 빌드를 개발하고 있습니다.
            </div>
            <button disabled style={{
              padding: "14px 22px", borderRadius: 12, border: `1px solid ${C.border}`,
              background: C.bg === "#fff" ? "#eef2f7" : "rgba(255,255,255,0.06)",
              color: C.muted, fontSize: 15, fontWeight: 800, cursor: "not-allowed",
            }}>
              개발중
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── 메인 목록 페이지 ── */
export default function ProgramsPage({ C, navigate }) {
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const isMobile = winW < 768;
  const isTablet = winW >= 768 && winW < 1100;

  useEffect(() => {
    document.title = "제품 및 서비스 - SNS메이킷";
    updateMeta("og:title", "제품 및 서비스 - SNS메이킷");
    updateMeta("og:description", "SNS 자동 발행 프로그램과 AI 글쓰기. SNS 운영에 필요한 모든 도구를 만나보세요.");
    updateMeta("og:url", "https://snsmakeit.com/programs");
    updateMeta("og:image", "https://snsmakeit.com/og-default.png");
    updateMeta("og:type", "website");
  }, []);

  const isDark = C.bg?.includes("0a") || C.bg?.includes("#10") || C.bg?.includes("242");
  const BG = isDark ? C.bg : "#fff";
  const BG2 = isDark ? "rgba(255,255,255,0.02)" : "#f8fafc";
  const BDR = C.border;
  const SUB = C.muted;
  const B = BRAND;

  /* 섹션 공통 스타일 */
  const sectionHead = (title, desc) => (
    <div style={{ textAlign:"center", marginBottom:isMobile?32:56 }}>
      <h2 style={{ fontSize:isMobile?26:40, fontWeight:800, margin:0, color:INK, lineHeight:1.25, letterSpacing:-0.5 }}>{title}</h2>
      {desc && <p style={{ fontSize:isMobile?15:17, color:SUB, marginTop:12, lineHeight:1.7, maxWidth:640, marginLeft:"auto", marginRight:"auto" }}>{desc}</p>}
    </div>
  );

  const imgBox = (src, alt) => (
    <div style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${BDR}`, boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
      <img src={src} alt={alt} loading="lazy" style={{ width:"100%", display:"block" }} />
    </div>
  );

  const checkItem = (text) => (
    <div key={text} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:14, color:INK, lineHeight:1.6 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={B} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:3 }}><polyline points="20 6 9 17 4 12"/></svg>
      {text}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:BG, color:C.text, fontFamily:"'Pretendard Variable','Pretendard',-apple-system,system-ui,sans-serif" }}>
      <style>{`
        .pg-faq summary::-webkit-details-marker{display:none}.pg-faq summary{list-style:none}
        .pg-row{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        @media(max-width:900px){.pg-row{grid-template-columns:1fr !important;gap:28px !important}}
        .pg-nav-link{padding:10px 20px;border-radius:99px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;border:none;background:transparent;transition:all .15s}
        .pg-nav-link:hover{background:${B}08}
        .pg-nav-active{background:${B} !important;color:#fff !important}
      `}</style>

      {/* ══════ HERO ══════ */}
      <section style={{ padding:isMobile?"100px 20px 48px":"140px 24px 72px", textAlign:"center", background:isDark?"linear-gradient(180deg,#0f0d1f,#1a1830)":"linear-gradient(180deg,#f0f5ff 0%,#f8faff 50%,#fff 100%)" }}>
        <div style={{ maxWidth:780, margin:"0 auto" }}>
          <h1 style={{ fontSize:isMobile?30:52, lineHeight:1.15, letterSpacing:-1, margin:"0 0 18px", fontWeight:800 }}>
            SNS 운영을 위한{isMobile?<br/>:" "}모든 도구
          </h1>
          <p style={{ maxWidth:560, margin:"0 auto 32px", fontSize:isMobile?15:17, color:SUB, lineHeight:1.7 }}>
            네이버 블로그부터 인스타, 유튜브까지.{!isMobile&&<br/>}AI가 글을 쓰고 자동으로 발행합니다.
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap", marginBottom:16 }}>
            <a href={AUTOMATION_DOWNLOAD.url} download={AUTOMATION_DOWNLOAD.fileName}
              style={{ padding:"14px 32px", borderRadius:99, background:B, color:"#fff", fontSize:15, fontWeight:600, textDecoration:"none", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/><polyline points="7 11 12 16 17 11"/><line x1="12" y1="4" x2="12" y2="16"/></svg>
              프로그램 다운받기 (Windows)
            </a>
            <button onClick={() => navigate?.("pricing")} style={{ padding:"14px 32px", borderRadius:99, border:`1px solid ${isDark?"rgba(255,255,255,0.15)":"#d1d5db"}`, background:"transparent", color:C.text, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              요금 보기
            </button>
          </div>
          <div style={{ fontSize:12, color:SUB, opacity:0.7 }}>{AUTOMATION_DOWNLOAD.version} / {AUTOMATION_DOWNLOAD.size} · Mac 버전 개발 중</div>
        </div>
      </section>


      {/* ══════ 1. SNS 자동 발행 ══════ */}
      <section id="blog" style={{ padding:isMobile?"64px 20px":"100px 24px" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          {sectionHead(
            "SNS 자동 발행",
            "키워드만 입력하면 AI가 글을 작성하고 네이버 블로그에 자동 발행합니다. 주제 → 스타일 → 발행, 3단계로 완성합니다."
          )}

          {/* 메인 스크린샷 */}
          <div style={{ marginBottom:isMobile?48:80 }}>
            {imgBox("/screenshots/service/2.png", "블로그 자동 운영과 수동 글쓰기")}
          </div>

          {/* 주제 설정 */}
          <div className="pg-row" style={{ marginBottom:isMobile?48:80 }}>
            <div>{imgBox("/screenshots/service/3.png", "주제 설정")}</div>
            <div>
              <h3 style={{ fontSize:isMobile?20:26, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.3 }}>주제 설정</h3>
              <p style={{ fontSize:15, color:SUB, lineHeight:1.7, margin:"0 0 20px" }}>키워드를 입력하면 AI가 최신 트렌드를 분석해 글감을 생성합니다. 글 방향, 드라이브 자료 연동까지 한 화면에서 설정합니다.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["키워드 순환 발행 (쉼표로 구분)","글 방향 자유 설정","구글 드라이브 사진/자료 연동"].map(checkItem)}
              </div>
            </div>
          </div>

          {/* 스타일 설정 */}
          <div className="pg-row" style={{ marginBottom:isMobile?48:80, direction:isMobile?"ltr":"rtl" }}>
            <div style={{ direction:"ltr" }}>{imgBox("/screenshots/service/4.png", "스타일 설정")}</div>
            <div style={{ direction:"ltr" }}>
              <h3 style={{ fontSize:isMobile?20:26, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.3 }}>스타일 설정</h3>
              <p style={{ fontSize:15, color:SUB, lineHeight:1.7, margin:"0 0 20px" }}>6가지 글 타입, 4가지 톤, 4가지 말투, 3단계 분량을 조합해 원하는 스타일로 글을 생성합니다.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["글 타입 6종 (정보성, 체험, 여행, 제품, 칼럼, 기사)","글 톤 4종 + 말투 4종 조합","분량: 1~1.5K / 2~3K / 4K+"].map(checkItem)}
              </div>
            </div>
          </div>

          {/* 꾸미기 + 글 구조 */}
          <div className="pg-row" style={{ marginBottom:isMobile?48:80 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {imgBox("/screenshots/service/5.png", "꾸미기")}
              {imgBox("/screenshots/service/6.png", "글 구조")}
            </div>
            <div>
              <h3 style={{ fontSize:isMobile?20:26, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.3 }}>꾸미기 + 글 구조</h3>
              <p style={{ fontSize:15, color:SUB, lineHeight:1.7, margin:"0 0 20px" }}>인용구, 키워드 강조, 소제목 밑줄, 스티커/짤 삽입, Q&A(AEO) 구조까지 세부 설정을 조정합니다.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["인용구 6종 + 키워드 강조색 5종","글색/배경색/둘다 강조 방식","Q&A(AEO) 위치 + 장단점/추천 구조"].map(checkItem)}
              </div>
            </div>
          </div>

          {/* 발행 설정 */}
          <div className="pg-row" style={{ marginBottom:isMobile?48:80, direction:isMobile?"ltr":"rtl" }}>
            <div style={{ direction:"ltr" }}>{imgBox("/screenshots/service/7.png", "발행 설정")}</div>
            <div style={{ direction:"ltr" }}>
              <h3 style={{ fontSize:isMobile?20:26, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.3 }}>발행 설정</h3>
              <p style={{ fontSize:15, color:SUB, lineHeight:1.7, margin:"0 0 20px" }}>발행 글 수, 글 간격(8종), 예약 발행, 네이버 블로그 템플릿, 메뉴 순환, 프리셋 저장까지.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["랜덤~시간 분산 8가지 글 간격","네이버 블로그 템플릿 연동","프리셋으로 설정 저장/재사용"].map(checkItem)}
              </div>
            </div>
          </div>

          {/* 계정 설정 */}
          <div className="pg-row">
            <div>{imgBox("/screenshots/service/1.png", "네이버 계정 설정")}</div>
            <div>
              <h3 style={{ fontSize:isMobile?20:26, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.3 }}>네이버 계정 연결</h3>
              <p style={{ fontSize:15, color:SUB, lineHeight:1.7, margin:"0 0 20px" }}>네이버 ID로 로그인하면 세션이 저장되어 이후 자동 발행됩니다. 여러 계정을 등록하면 순환 발행도 가능합니다.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["로그인 한 번이면 세션 자동 유지","다중 계정 등록 + 순환 발행","초기화 후 재설정 지원"].map(checkItem)}
              </div>
            </div>
          </div>

        </div>
      </section>

      <hr style={{ border:"none", borderTop:`1px solid ${BDR}`, margin:0 }} />

      {/* ══════ FAQ ══════ */}
      <section style={{ padding:isMobile?"64px 20px":"100px 24px" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          {sectionHead("자주 묻는 질문")}
          <div style={{ display:"grid", gap:8 }}>
            {[
              ["SNS메이킷은 어떤 서비스인가요?","AI가 글을 작성하고 네이버 블로그에 자동 발행하는 SNS 콘텐츠 자동화 플랫폼입니다."],
              ["무료로 사용할 수 있나요?","회원가입 시 5회 무료 체험이 제공됩니다. 데스크톱 프로그램도 무료로 다운로드할 수 있으며, 이후 월 $9.9부터 시작하는 플랜으로 업그레이드 가능합니다."],
              ["웹 도구와 프로그램의 차이가 뭔가요?","웹에서는 브라우저로 AI 글쓰기, 영상 제작이 가능합니다. 데스크톱 프로그램은 네이버 SNS 자동 발행, 드라이브 연동 등 자동화 기능에 특화되어 있습니다."],
              ["어떤 SNS 플랫폼을 지원하나요?","데스크톱 프로그램은 네이버 SNS 자동 발행을 지원합니다. 웹에서는 인스타그램, 스레드, 유튜브용 콘텐츠를 생성할 수 있습니다."],
              ["상업적으로 사용 가능한가요?","네, 생성된 모든 콘텐츠는 상업적으로 자유롭게 사용할 수 있습니다."],
            ].map(([q,a],i) => (
              <details key={q} className="pg-faq" open={i===0} style={{ borderRadius:12, border:`1px solid ${BDR}`, background:BG, overflow:"hidden" }}>
                <summary style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, cursor:"pointer", padding:isMobile?"16px 18px":"18px 22px", color:INK, fontSize:isMobile?15:16, fontWeight:700 }}>
                  <span>{q}</span>
                  <svg width="18" height="18" viewBox="0 0 20 20" style={{ flexShrink:0 }}><path d="M5 7.5L10 12.5L15 7.5" stroke={SUB} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                </summary>
                <div style={{ padding:isMobile?"0 18px 16px":"0 22px 20px", color:SUB, fontSize:14, lineHeight:1.8 }}>{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 최종 CTA ══════ */}
      <section style={{ background:BG2, padding:isMobile?"64px 20px 80px":"100px 24px 120px" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ fontSize:isMobile?26:38, fontWeight:800, color:INK, margin:"0 0 14px", lineHeight:1.2 }}>지금 바로 시작하세요</h2>
          <p style={{ fontSize:15, color:SUB, marginBottom:28, lineHeight:1.6 }}>
            무료 체험으로 먼저 확인해보세요.
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
            <button onClick={() => navigate?.("pricing")} style={{ padding:"14px 32px", borderRadius:99, background:B, color:"#fff", border:"none", fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              요금 보기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
