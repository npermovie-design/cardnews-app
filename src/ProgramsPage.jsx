import React, { useState, useEffect } from "react";
import { supabase } from "./storage";
import { createClient } from "@supabase/supabase-js";

// 관리자용 supabase 클라이언트 (programs 테이블 RLS 우회)
const ADMIN_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDg1NywiZXhwIjoyMDg5NDg2ODU3fQ.gfWezarKfomCrT74eiH0CGoYfg8Ow6RGlR3_svdfstE";
const adminSupabase = createClient(import.meta.env.VITE_SUPABASE_URL, ADMIN_SB_KEY);

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

const BRAND = "#6d5dfc";
const BRAND2 = "#f45aa2";
const ACCENT = "#16bfa3";
const INK = "#15172f";
const GRAD = "linear-gradient(135deg, #6d5dfc 0%, #8b6dff 48%, #f45aa2 100%)";

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
  fileName: "메이킷 SNS자동화 Setup 0.1.8.exe",
  url: "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/public-assets/programs/files/SNS_Setup_0.1.8.exe",
  size: "314MB",
  version: "v0.1.8",
};
const AUTOMATION_DOWNLOAD_READY = Boolean(AUTOMATION_DOWNLOAD.url);

const AUTOMATION_SECTIONS = [
  {
    title: "블로그 발행 자동화",
    desc: "주제 입력부터 글 구성, 본문 작성, 이미지 삽입, 네이버 블로그 발행 흐름까지 반복 업무를 줄입니다.",
    points: ["AI 글 초안 생성", "카테고리 선택 보조", "발행 작업 자동화"],
  },
  {
    title: "SNS 운영 자료",
    desc: "콘텐츠 제작에 바로 활용할 수 있는 디자인 소스와 영상 효과 자료를 운영 목적별로 정리했습니다.",
    points: ["썸네일/아이콘 소스", "그린스크린 효과", "상세페이지/카드뉴스 참고"],
  },
  {
    title: "실무형 템플릿",
    desc: "반복 제작이 많은 운영자를 위해 자주 쓰는 구성과 소재를 빠르게 찾을 수 있게 묶었습니다.",
    points: ["자동화", "디자인", "마케팅", "유틸리티"],
  },
];

const NAVERBOT_SCREENSHOTS = [
  {
    src: "/screenshots/naverbot/dashboard.png",
    label: "홈 대시보드",
    title: "발행 현황과 자동 운영 상태를 한 화면에서 확인",
    desc: "메이킷 계정, 구독 플랜, 이번 주 발행 수, 성공률, 전체 발행 수, 자동 운영 상태와 최근 발행 글을 대시보드에서 바로 확인합니다.",
  },
  {
    src: "/screenshots/naverbot/quick-start.png",
    label: "빠른 시작",
    title: "테마와 카테고리만 넣고 1개 바로 발행",
    desc: "블로그 품질 안내 후 빠른 시작 영역에서 테마, 카테고리, 직접 제목, 템플릿 이름을 입력하고 즉시 발행을 시작할 수 있습니다.",
  },
  {
    src: "/screenshots/naverbot/blog-modes.png",
    label: "발행 방식",
    title: "빠른 발행, 자동 운영, 원하는 사진 자동 운영으로 분리",
    desc: "간단한 1회 발행과 상세 자동 운영을 분리하고, 구글 드라이브 자료와 사진을 쓰는 자동 운영 카드를 별도로 배치했습니다.",
  },
  {
    src: "/screenshots/naverbot/drive-setup.png",
    label: "드라이브 연동",
    title: "구글 드라이브 폴더 링크를 글감과 이미지 소스로 사용",
    desc: "구글 드라이브 자료 폴더 링크를 넣으면 폴더 안의 문서/텍스트 파일은 글감으로 쓰고, 이미지 파일은 본문 중간에 함께 삽입하는 흐름입니다.",
  },
];

const FEATURE_VISUALS = [
  {
    src: "/screenshots/naverbot/feature-drive-complete.png",
    label: "드라이브 자동 완성",
    title: "드라이브만 연결하면 사진, 글, 인용구, 스티커까지 자동 구성",
  },
  {
    src: "/screenshots/naverbot/feature-account-setup.png",
    label: "계정 설정",
    title: "네이버 계정 연결과 로그인 안내를 한 화면에서 확인",
  },
  {
    src: "/screenshots/naverbot/feature-quick-publish.png",
    label: "빠른 시작",
    title: "테마와 카테고리만 입력해 1개 글을 바로 발행",
  },
  {
    src: "/screenshots/naverbot/feature-blog-main.png",
    label: "발행 화면",
    title: "빠른 시작, 자동 운영, 원하는 사진 운영을 분리",
  },
  {
    src: "/screenshots/naverbot/feature-topic-drive.png",
    label: "주제 설정",
    title: "주제 방향과 구글 드라이브 폴더를 함께 설정",
  },
  {
    src: "/screenshots/naverbot/feature-drive-folder.png",
    label: "사진 자동 삽입",
    title: "폴더 속 이미지와 텍스트를 불러와 블로그 글로 완성",
  },
];

const LANDING_FEATURES = [
  {
    title: "빠른 시작",
    desc: "매번 복잡한 설정을 열지 않아도 테마와 카테고리만 입력하면 1개 글을 바로 발행할 수 있습니다. 직접 제목을 넣지 않으면 AI가 제목을 생성하고, 네이버 블로그 템플릿 이름을 입력하면 기존 템플릿 흐름까지 맞춰 사용할 수 있게 구성되어 있습니다.",
  },
  {
    title: "상세 자동 운영",
    desc: "자동 운영 모드는 주제 설정, 스타일 설정, 발행 설정으로 나누어 운영자가 원하는 방식으로 글을 만들 수 있게 구성했습니다. 테마 순환, 원하는 글 방향, 분량, 인용구 스타일, 카테고리 순환, 발행 간격 같은 세부 조건을 한 흐름으로 묶습니다.",
  },
  {
    title: "구글 드라이브 자료 기반 발행",
    desc: "사용자가 공유한 구글 드라이브 폴더 링크를 입력하면 폴더 안 문서와 텍스트 파일을 글감으로 쓰고, 이미지 파일은 본문에 함께 넣습니다. 폴더별 자료를 운영 주제로 바꾸는 방식이라, 직접 촬영한 사진이나 정리된 자료가 많은 사용자에게 특히 맞습니다.",
  },
  {
    title: "운영 현황 대시보드",
    desc: "자동화 프로그램을 실행한 뒤에는 이번 주 발행 수, 성공률, 전체 발행 수, 자동 운영 상태, 최근 발행 글을 확인할 수 있습니다. 단순히 글을 발행하는 것에서 끝나는 것이 아니라 운영 결과를 계속 볼 수 있는 관리 화면까지 포함합니다.",
  },
];

const INTERACTIVE_FLOW = [
  {
    label: "빠른 시작",
    title: "테마와 카테고리 입력",
    desc: "가볍게 시작할 때는 테마와 카테고리만 입력합니다. 직접 제목이나 네이버 블로그 템플릿 이름은 선택 입력으로 두어 초보자도 바로 실행할 수 있게 했습니다.",
  },
  {
    label: "자료 연결",
    title: "구글 드라이브 폴더 링크",
    desc: "원하는 사진으로 자동 운영을 선택하면 드라이브 폴더 링크 입력칸이 열립니다. 하위 폴더 포함 옵션으로 폴더 구조까지 글감으로 활용할 수 있습니다.",
  },
  {
    label: "자동 운영",
    title: "세부 설정 후 발행",
    desc: "주제 설정, 스타일 설정, 발행 설정을 순서대로 진행합니다. 계정이 여러 개라면 글마다 순환 발행하고, 카테고리도 여러 개를 순환하도록 구성할 수 있습니다.",
  },
  {
    label: "현황 확인",
    title: "대시보드에서 결과 확인",
    desc: "발행 후에는 발행 현황과 최근 발행 목록을 확인합니다. 운영 중인 자동화 정보가 남기 때문에 현재 어떤 테마와 카테고리로 돌아가는지 바로 볼 수 있습니다.",
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
    id: 1, title: "SNS 자동화 봇 v0.1.8",
    desc: "테마만 입력하면 AI가 네이버 블로그 글을 자동 생성하고, 카테고리 선택부터 이미지 삽입, 발행까지 한 번에 처리합니다. 빠른 시작 모드로 1분 안에 첫 발행이 가능합니다.",
    category: "automation", price: 0, priceLabel: "무료",
    version: "v0.1.8", platform: "Windows 10/11",
    fileSize: "314MB", downloadCount: 180, viewCount: 420,
    tags: ["자동화", "블로그", "네이버", "SEO", "AEO"],
    downloadUrl: "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/public-assets/programs/files/SNS_Setup_0.1.8.exe",
    thumbnail: "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/uploads/automation-thumb.png",
    detailContent: [
      { type: "heading", value: "SNS 자동화 봇이란?" },
      { type: "text", value: "반복적인 네이버 블로그 운영을 자동화하는 데스크톱 프로그램입니다.\n주제를 입력하면 AI가 글 구조를 잡고 본문을 작성한 뒤, 인용구, 소제목, 이미지, 스티커를 포함해 발행 가능한 형태로 정리합니다.\n매일 비슷한 작업을 반복하는 운영자, 마케터, 1인 사업자에게 적합합니다." },
      { type: "divider" },
      { type: "heading", value: "v0.1.8 주요 기능" },
      { type: "text", value: "- 빠른 시작 모드: 테마와 카테고리만 입력하면 1개 바로 발행\n- AI 글 자동 생성: 최신 뉴스/트렌드 분석 후 SEO 최적화 본문 작성\n- 다중 테마 순환: 쉼표로 여러 테마 입력 시 순환하며 발행\n- 키워드 포인트 글색: 주제 키워드에 강조 색상 자동 적용 (글색/배경색/둘다 선택)\n- 카테고리 자동 선택: 네이버 블로그 카테고리 정확 매칭 후 발행\n- 참고 글 분석: URL을 분석해 구성, 인용구, 색상, 이미지 흐름 반영\n- 인용구 스타일 6종: 따옴표, 버티컬 라인, 말풍선, 포스트잇, 프레임 등\n- GIF/이미지/스티커 삽입: 본문 흐름에 맞춘 미디어 배치\n- 발행 시간 분산: 아침/점심/저녁 또는 오전/오후 시간대 분산 옵션\n- 발행 실패 자동 재시도: 실패한 글을 1회 자동 재시도\n- 홈 대시보드: 발행 통계, 최근 발행 글, 자동 운영 상태 한눈에\n- 진행 프로그레스바: 5단계 시각화 (계정 확인 > 글 생성 > 에디터 > 본문 입력 > 발행)\n- 데스크톱 알림: 발행 성공/실패 시 Windows 알림\n- 로그 URL 클릭: 발행된 글 URL을 로그에서 바로 열기\n- 네이버 계정 선택: 다중 계정 중 발행할 계정 선택\n- 글 제목 직접 입력: AI 제목 대신 원하는 제목으로 발행\n- 프리셋 저장: 자주 쓰는 설정 저장/불러오기" },
      { type: "divider" },
      { type: "heading", value: "v0.1.8 변경 내역" },
      { type: "text", value: "신규 기능:\n- 빠른 시작 모드 (테마+카테고리만 입력, 1개 바로 발행)\n- 홈 대시보드 (발행 통계 + 최근 글 + 운영 상태)\n- 진행 프로그레스바 (5단계 시각화)\n- 키워드 포인트 글색 + 강조 방식 선택 (글색/배경색/둘다)\n- 다중 테마 순환 발행 (쉼표 구분)\n- 발행 시간 분산 (아침/점심/저녁 또는 오전/오후)\n- 발행 실패 자동 재시도 (1회)\n- 데스크톱 알림 (성공/실패)\n- 로그 URL 클릭 가능\n- 에러 메시지 사용자 친화적 변환\n- 달력 숫자 뱃지 (성공/실패 표시)\n- 네이버 세션 만료 사전 감지\n- 글 제목 직접 입력 옵션\n- 네이버 계정 선택 발행\n- 발행 히스토리 500개로 확장\n\n버그 수정:\n- 카테고리 선택: Playwright 네이티브 방식으로 안정화\n- GIF 업로드: file_chooser 미발생 시 폴백 추가\n- 단건 발행 실패 (is_cafe 미정의) 수정\n- 발행 버튼 DOM detached 시 재탐색\n- 참고글 분석 무한 스크롤 방지\n- 네이버 로그인 버튼 예외 시 복구\n- Python pyc 캐시 방지 (PYTHONDONTWRITEBYTECODE)" },
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
        // 수정
        const { error: dbErr } = await adminSupabase.from("programs").update(productData).eq("id", editItem.dbId);
        if (dbErr) throw dbErr;
      } else {
        // 신규 등록
        const { error: dbErr } = await adminSupabase.from("programs").insert(productData);
        if (dbErr) throw dbErr;
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
            : "linear-gradient(135deg, rgba(124,106,255,0.08) 0%, rgba(236,72,153,0.06) 50%, rgba(59,130,246,0.04) 100%)",
          border: `1px solid ${C.border}`,
        }}>
          {/* 썸네일 */}
          <div style={{
            background: C.bg === "#fff" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)",
            borderRadius: 20, aspectRatio: isMobile ? "16/10" : "4/3",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.bg === "#fff" ? "rgba(124,106,255,0.1)" : C.border}`,
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
                  background: C.bg === "#fff" ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.15)",
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

            {/* CTA - 회원 전용 다운로드 */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {p.downloadUrl ? (
                <button onClick={() => { if (!user) { onLogin(); return; } if (onDownload) onDownload(p.id); window.open(p.downloadUrl, "_blank"); }} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "15px 40px", borderRadius: 14, background: GRAD, color: "#fff",
                  fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,106,255,0.3)", flex: isMobile ? 1 : "unset",
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {p.price === 0 ? "무료 다운로드" : "구매하기"}
                </button>
              ) : (
                <button style={{
                  padding: "15px 40px", borderRadius: 14,
                  background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.08)",
                  color: C.muted, fontWeight: 700, fontSize: 16, border: "none", cursor: "default",
                  flex: isMobile ? 1 : "unset",
                }}>준비중</button>
              )}
            </div>
            {!user && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
                * 다운로드는 회원 로그인 후 이용 가능합니다.
              </div>
            )}
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
            background: C.bg === "#fff" ? "linear-gradient(135deg,#f8f6ff,#ffffff)" : "rgba(124,106,255,0.08)",
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
                fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(124,106,255,0.24)",
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
export default function ProgramsPage({ C }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    document.title = "SNS 자동화봇 - SNS메이킷";
    updateMeta("og:title", "SNS 자동화봇 - SNS메이킷");
    updateMeta("og:description", "네이버 블로그 글 생성, 에디터 입력, 이미지 삽입, 카테고리 선택, 발행 설정까지 반복 운영 업무를 줄이는 Windows용 자동화 프로그램입니다.");
    updateMeta("og:url", "https://snsmakeit.com/programs");
    updateMeta("og:image", "https://snsmakeit.com/og-default.png");
    updateMeta("og:type", "website");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{`
        .makeit-focus-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .makeit-focus-card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(124,106,255,.12); border-color: rgba(124,106,255,.35) !important; }
        .makeit-tab { transition: background .18s ease, color .18s ease, border-color .18s ease; }
        .makeit-icon-node { transition: transform .18s ease, box-shadow .18s ease; }
        .makeit-icon-node:hover { transform: translateY(-2px); box-shadow: 0 16px 32px rgba(21,23,47,.10); }
        .makeit-faq summary::-webkit-details-marker { display: none; }
        .makeit-faq summary { list-style: none; }
        @keyframes makeitBannerSlide { 0%, 26% { transform: translateX(0); } 33%, 59% { transform: translateX(-33.333%); } 66%, 92% { transform: translateX(-66.666%); } 100% { transform: translateX(0); } }
        @keyframes makeitProgress { 0% { width: 0%; } 26% { width: 33%; } 33% { width: 33%; } 59% { width: 66%; } 66% { width: 66%; } 92% { width: 100%; } 100% { width: 0%; } }
      `}</style>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "70px 20px 56px" : "110px 24px 72px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", padding: "7px 14px", borderRadius: 999, background: `${BRAND}10`, border: `1px solid ${BRAND}24`, color: BRAND, fontSize: 13, fontWeight: 900, marginBottom: 20 }}>
          SNS메이킷 자동화
        </div>
        <h1 style={{ fontSize: isMobile ? 36 : 56, lineHeight: 1.15, letterSpacing: -1, margin: "0 auto 22px", fontWeight: 900, maxWidth: 760 }}>
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>블로그 운영,</span><br/>
          <span style={{ color: INK }}>반복 업무를 줄이세요</span>
        </h1>
        <p style={{ maxWidth: 640, margin: "0 auto", fontSize: isMobile ? 16 : 19, color: C.muted, lineHeight: 1.8, fontWeight: 600 }}>
          글감 정리, 사진 삽입, 발행 준비까지 — 매일 반복되는 블로그 운영 과정을<br className="hide-mobile" />
          하나의 흐름으로 자동화하는 Windows 프로그램입니다.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32 }}>
          <a href={AUTOMATION_DOWNLOAD.url} download={AUTOMATION_DOWNLOAD.fileName}
            style={{ padding: "14px 28px", borderRadius: 14, background: GRAD, color: "#fff", fontSize: 16, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 20px rgba(124,106,255,0.25)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            무료 다운로드
          </a>
        </div>
      </section>

      {/* 운영 흐름 — 심플 5단계 */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "0 24px 80px" : "0 24px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>운영 흐름</div>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, margin: 0, color: INK, lineHeight: 1.3 }}>5단계로 블로그 발행이 완료됩니다</h2>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", justifyContent: "center", gap: isMobile ? 12 : 0 }}>
          {[
            ["folder", "자료 입력", BRAND],
            ["write", "글 생성", BRAND],
            ["image", "사진 삽입", ACCENT],
            ["publish", "자동 발행", BRAND2],
            ["chart", "현황 확인", BRAND],
          ].map(([icon, title, color], idx) => (
            <div key={title} style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", flexDirection: isMobile ? "row" : "column", gap: isMobile ? 14 : 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AutomationIcon type={icon} color={color} size={26} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: INK, textAlign: isMobile ? "left" : "center" }}>{title}</div>
              </div>
              {!isMobile && idx < 4 && <div style={{ width: 48, height: 2, background: `${BRAND}20`, margin: "28px 8px 0" }} />}
              {isMobile && idx < 4 && <div style={{ width: 2, height: 20, background: `${BRAND}15`, margin: "0 0 0 27px" }} />}
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 가치 — 3포인트 */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "0 24px 80px" : "0 24px 120px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? 16 : 28 }}>
          {[
            ["clock", "시간 절약", "글감 찾기, 제목 작성, 이미지 정리에\n들어가는 반복 시간을 줄입니다.", BRAND],
            ["repeat", "꾸준한 운영", "자동화 설정으로 일정한\n발행 흐름을 유지합니다.", BRAND2],
            ["folder", "자료 활용", "구글 드라이브의 사진과 문서를\n블로그 본문에 바로 연결합니다.", ACCENT],
          ].map(([icon, title, desc, color]) => (
            <div key={title} style={{ textAlign: "center", padding: isMobile ? "24px 20px" : "40px 24px", borderRadius: 24, border: `1px solid ${C.border}`, background: "#fff" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <AutomationIcon type={icon} color={color} size={30} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: INK, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, whiteSpace: "pre-line" }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 대시보드 스크린샷 — imweb 스타일 (이미지 + 텍스트 설명) */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "0 24px 80px" : "0 24px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>주요 화면</div>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, margin: 0, color: INK, lineHeight: 1.3 }}>한 화면에서 모든 운영을 관리합니다</h2>
        </div>
        <div style={{ display: "grid", gap: isMobile ? 48 : 80 }}>
          {NAVERBOT_SCREENSHOTS.map((shot, idx) => (
            <div key={shot.src} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : idx % 2 === 0 ? "1.1fr 0.9fr" : "0.9fr 1.1fr", gap: isMobile ? 24 : 48, alignItems: "center" }}>
              <div style={{ order: isMobile ? 0 : idx % 2 === 0 ? 0 : 1 }}>
                <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, boxShadow: "0 12px 40px rgba(21,23,47,0.08)" }}>
                  <img src={shot.src} alt={shot.title} style={{ width: "100%", display: "block", background: "#fbfaff" }} />
                  <div style={{ position: "absolute", top: 14, left: 14 }}>
                    <span style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", fontSize: 11, fontWeight: 800, color: BRAND }}>{shot.label}</span>
                  </div>
                </div>
              </div>
              <div style={{ order: isMobile ? 1 : idx % 2 === 0 ? 1 : 0 }}>
                <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: INK, lineHeight: 1.4, marginBottom: 14 }}>{shot.title}</div>
                <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.85 }}>{shot.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "0 24px 86px" : "0 24px 112px" }}>
        <div style={{ marginBottom: 22, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>시작 안내</div>
          <h2 style={{ fontSize: isMobile ? 28 : 38, lineHeight: 1.25, margin: "0 0 10px", fontWeight: 900, color: INK }}>처음 시작은 4단계면 충분합니다</h2>
          <p style={{ maxWidth: 700, margin: "0 auto", fontSize: 15, color: C.muted, lineHeight: 1.8 }}>
            설치, 로그인, 네이버 계정 연결, 첫 발행까지 필요한 과정만 간단하게 정리했습니다.
          </p>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["publish", "1단계", "Windows 파일 설치", "설치 파일을 내려받고 프로그램을 실행합니다.", BRAND],
              ["write", "2단계", "메이킷 로그인", "메이킷 계정으로 로그인하고 사용 환경을 불러옵니다.", BRAND2],
              ["folder", "3단계", "네이버 계정 연결", "네이버 로그인 후 블로그 발행 세션을 저장합니다.", ACCENT],
              ["repeat", "4단계", "첫 블로그 발행", "테마와 카테고리를 입력하고 1개 글을 바로 발행합니다.", BRAND2],
            ].map(([icon, step, title, desc, color]) => (
              <div key={step} style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 14, alignItems: "center", borderRadius: 18, border: `1px solid ${C.border}`, background: "#fff", padding: 16 }}>
                <div style={{ width: 58, height: 58, borderRadius: 18, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AutomationIcon type={icon} color={color} size={28} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color, marginBottom: 4 }}>{step}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: INK, marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: C.muted }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: 26, border: `1px solid ${C.border}`, background: "#fff", padding: 14, overflow: "hidden", boxShadow: C.bg === "#fff" ? "0 18px 46px rgba(21,23,47,0.08)" : "none" }}>
            <img src="/screenshots/naverbot/setup-4-steps.png" alt="설치 후 4단계 시작 안내" style={{ width: "100%", display: "block", borderRadius: 20, aspectRatio: "3/2", objectFit: "contain", background: "#fff" }} />
          </div>
        )}
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "0 24px 86px" : "0 24px 112px" }}>
        <div style={{ marginBottom: 22, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>핵심 기능</div>
          <h2 style={{ fontSize: isMobile ? 28 : 38, lineHeight: 1.25, margin: "0 0 10px", fontWeight: 900, color: INK }}>기능은 3가지만 기억하면 됩니다</h2>
          <p style={{ maxWidth: 700, margin: "0 auto", fontSize: 15, color: C.muted, lineHeight: 1.8 }}>
            빠르게 발행하고, 드라이브 자료를 활용하고, 네이버 계정을 연결해 반복 운영을 줄입니다.
          </p>
        </div>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["write", "빠른 발행", "테마와 카테고리만 입력해 1개 글을 바로 발행합니다.", BRAND],
              ["folder", "드라이브 자동 완성", "사진, 글감, 인용구를 자료 폴더에서 불러와 구성합니다.", ACCENT],
              ["clock", "계정 설정", "네이버 로그인 세션을 저장해 다음 운영을 더 빠르게 시작합니다.", BRAND2],
            ].map(([icon, title, desc, color]) => (
              <div key={title} className="makeit-icon-node" style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 14, alignItems: "center", borderRadius: 18, border: `1px solid ${C.border}`, background: "#fff", padding: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AutomationIcon type={icon} color={color} size={28} />
                </div>
                <div>
                  <div style={{ fontSize: 17, color: INK, fontWeight: 900, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {[FEATURE_VISUALS[2], FEATURE_VISUALS[0], FEATURE_VISUALS[1]].map((visual) => (
              <div key={visual.src} className="makeit-focus-card" style={{ borderRadius: 22, border: `1px solid ${C.border}`, background: "#fff", overflow: "hidden" }}>
                <div style={{ position: "relative", padding: 12, paddingBottom: 0 }}>
                  <img src={visual.src} alt={visual.title} style={{ width: "100%", display: "block", aspectRatio: "3/2", objectFit: "contain", borderRadius: 16, background: "#fbfaff" }} />
                  <div style={{ position: "absolute", top: 22, left: 22 }}>
                    <span style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", fontSize: 11, fontWeight: 800, color: BRAND }}>{visual.label}</span>
                  </div>
                </div>
                <div style={{ padding: "18px 18px 20px" }}>
                  <div style={{ fontSize: 17, color: INK, fontWeight: 900, lineHeight: 1.45 }}>{visual.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "0 24px 86px" : "0 24px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 40 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>자주 묻는 질문</div>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, margin: 0, lineHeight: 1.3, color: INK }}>
            궁금한 점을 먼저 정리했습니다
          </h2>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
            {[
              [
                "이 프로그램을 쓰면 네이버 노출이 보장되나요?",
                "검색 노출이나 상위 노출을 보장하지는 않습니다. 다만 글감 정리, 본문 작성, 사진 삽입, 발행 준비에 들어가는 시간을 줄여 꾸준한 운영을 돕습니다. 실제 노출은 키워드 경쟁도, 콘텐츠 품질, 블로그 상태, 운영 이력에 따라 달라집니다.",
              ],
              [
                "계정 운영에 문제가 생기지 않나요?",
                "프로그램은 반복 운영을 줄이기 위한 도구이며, 무리한 대량 발행이나 동일한 문구 반복 사용은 권장하지 않습니다. 블로그 품질 유지를 위해 하루 발행량과 발행 간격을 보수적으로 잡고, 직접 검수 후 운영하는 방식이 좋습니다.",
              ],
              [
                "추가비용이 발생하나요?",
                "현재는 Windows 설치 파일을 먼저 제공하는 단계입니다. 정식 운영 방식과 비용이 확정되면 홈페이지를 통해 별도로 안내하며, 다계정 운영이나 맞춤 자동화가 필요한 경우에는 운영 범위에 따라 별도 안내가 필요할 수 있습니다.",
              ],
              [
                "구글 드라이브 자료를 꼭 써야 하나요?",
                "필수는 아닙니다. 간단히 테마와 카테고리만 입력해 빠른 발행을 시작할 수 있고, 사진이나 문서 자료가 많은 경우 구글 드라이브 폴더를 연결해 더 효율적으로 운영할 수 있습니다.",
              ],
              [
                "완전히 자동으로만 운영해도 되나요?",
                "가능한 영역은 자동화하되, 최종 발행 전 제목, 본문, 사진, 업종 표현은 확인하는 것을 권장합니다. 특히 병원, 금융, 법률, 부동산처럼 표현 리스크가 있는 업종은 운영자가 직접 검수해야 합니다.",
              ],
              [
                "여러 블로그 계정도 운영할 수 있나요?",
                "다계정 운영은 프로그램 구조상 확장 가능한 영역이지만, 계정 수와 운영 방식에 따라 설정과 안정화 범위가 달라질 수 있습니다. 여러 브랜드나 대행 목적의 운영은 별도 협의 항목으로 안내합니다.",
              ],
            ].map(([question, answer], idx) => (
              <details key={question} className="makeit-faq" open={idx === 0} style={{
                borderRadius: 16,
                border: `1px solid ${idx === 0 ? `${BRAND}35` : C.border}`,
                background: C.bg === "#fff" ? "#fff" : "rgba(255,255,255,0.04)",
                overflow: "hidden",
              }}>
                <summary style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                  padding: isMobile ? "17px 18px" : "18px 20px",
                  color: INK,
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: 900,
                }}>
                  <span>{question}</span>
                  <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: `${BRAND}10`, color: BRAND, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>+</span>
                </summary>
                <div style={{ padding: isMobile ? "0 18px 18px" : "0 20px 20px", color: C.muted, fontSize: 14, lineHeight: 1.85 }}>
                  {answer}
                </div>
              </details>
            ))}
          </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "0 24px 108px" : "0 24px 136px" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: BRAND, marginBottom: 8 }}>다운로드</div>
          <h2 style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, margin: 0, lineHeight: 1.25 }}>다운로드</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={{ borderRadius: 18, border: `1px solid ${BRAND}30`, background: C.bg === "#fff" ? "linear-gradient(135deg,#f8f6ff,#ffffff)" : "rgba(124,106,255,0.08)", padding: isMobile ? 22 : 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Windows용</div>
                <div style={{ fontSize: 13, color: C.muted }}>Windows 10/11 설치 파일</div>
              </div>
              <span style={{ padding: "7px 12px", borderRadius: 999, background: AUTOMATION_DOWNLOAD_READY ? "#10b98115" : `${BRAND}12`, color: AUTOMATION_DOWNLOAD_READY ? "#10b981" : BRAND, fontSize: 12, fontWeight: 900 }}>
                {AUTOMATION_DOWNLOAD_READY ? "파일 등록됨" : "링크 준비중"}
              </span>
            </div>
            <div style={{ display: "grid", gap: 8, fontSize: 13, color: C.muted, marginBottom: 20 }}>
              <div>파일명: {AUTOMATION_DOWNLOAD.fileName}</div>
              <div>버전: {AUTOMATION_DOWNLOAD.version} · 용량: {AUTOMATION_DOWNLOAD.size}</div>
            </div>
            {AUTOMATION_DOWNLOAD_READY ? (
              <a href={AUTOMATION_DOWNLOAD.url} download={AUTOMATION_DOWNLOAD.fileName} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 22px", borderRadius: 12, background: GRAD, color: "#fff", fontSize: 15, fontWeight: 900, textDecoration: "none", boxShadow: "0 4px 16px rgba(124,106,255,0.24)" }}>
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Windows 파일 받기
              </a>
            ) : (
              <button disabled style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 22px", borderRadius: 12, border: "none", background: "#eef2f7", color: C.muted, fontSize: 15, fontWeight: 900, cursor: "not-allowed" }}>
                외부 다운로드 링크 준비중
              </button>
            )}
          </div>

          <div style={{ borderRadius: 18, border: `1px solid ${C.border}`, background: C.bg === "#fff" ? "#f8fafc" : "rgba(255,255,255,0.04)", padding: isMobile ? 22 : 28, opacity: 0.92 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Mac용</div>
                <div style={{ fontSize: 13, color: C.muted }}>macOS 버전은 준비 중입니다</div>
              </div>
              <span style={{ padding: "7px 12px", borderRadius: 999, background: `${BRAND}12`, color: BRAND, fontSize: 12, fontWeight: 900 }}>개발중</span>
            </div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>
              현재 배포 파일은 Windows용으로만 제공됩니다. Mac용은 Electron 빌드 타깃과 자동화 실행 안정화 작업이 끝난 뒤 이 영역에 별도로 등록됩니다.
            </div>
            <button disabled style={{ padding: "14px 22px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bg === "#fff" ? "#eef2f7" : "rgba(255,255,255,0.06)", color: C.muted, fontSize: 15, fontWeight: 900, cursor: "not-allowed" }}>
              개발중
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
