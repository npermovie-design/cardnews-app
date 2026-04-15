// AI 파이프라인 - 상세페이지 V2
import { callAI, callAIStream } from "../aiClient";
import { getAuthToken } from "../storage";
import { TEMPLATES } from "./templates";

const NO_EMOJI = "이모지(emoji), 이모티콘, 특수문자 아이콘을 절대 사용하지 마세요. 순수 텍스트만 사용하세요.";

function cleanJSON(text) {
  return text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
}

function safeParseJSON(text) {
  try { return JSON.parse(cleanJSON(text)); }
  catch { return null; }
}

// 1. 이미지 분석 → 카테고리, 특징, 셀링포인트, 색상
export async function analyzeProductImage(imageBase64) {
  const prompt = `이 제품 이미지를 분석해주세요. ${NO_EMOJI}

다음 JSON 형식으로만 응답하세요:
{
  "category": "food|beauty|fashion|tech|health|home|pet|kids|sports|general 중 하나",
  "features": ["제품의 시각적 특징 3개"],
  "sellingPoints": ["판매 포인트 5개 (각 8자 이내, 한국어)"],
  "dominantColors": ["#hex 색상 3개"],
  "mood": "제품의 전체적인 분위기 한 줄"
}
JSON만 출력하세요.`;

  const messages = [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64.replace(/^data:image\/\w+;base64,/, "") } },
      { type: "text", text: prompt }
    ]
  }];

  const result = await callAI("claude-haiku-4-5", messages, 1000);
  return safeParseJSON(result) || {
    category: "general",
    features: ["제품 이미지"],
    sellingPoints: ["고품질 소재", "세련된 디자인", "뛰어난 내구성", "합리적 가격", "편리한 사용"],
    dominantColors: ["#333333", "#666666", "#999999"],
    mood: "깔끔하고 모던한 느낌"
  };
}

// 2. 셀링포인트 생성
export async function generateSellingPoints(productName, imageAnalysis) {
  const prompt = `제품명: "${productName}"
카테고리: ${imageAnalysis.category}
시각적 특징: ${imageAnalysis.features.join(", ")}

이 제품의 핵심 판매 포인트 5개를 생성하세요.
각 포인트는 8자 이내의 간결한 한국어로 작성하세요.
${NO_EMOJI}

["포인트1", "포인트2", "포인트3", "포인트4", "포인트5"] 형식의 JSON 배열만 출력하세요.`;

  const result = await callAI("claude-haiku-4-5", [{ role: "user", content: prompt }], 500);
  return safeParseJSON(result) || imageAnalysis.sellingPoints;
}

// 3. 불일치 감지
export async function detectMismatch(productName, sellingPoints) {
  const prompt = `제품명: "${productName}"
판매 포인트: ${sellingPoints.join(", ")}

제품명과 판매 포인트 사이에 논리적 불일치가 있는지 확인하세요.
예: 화장품인데 "강철소재" 같은 포인트가 있으면 불일치입니다.

다음 JSON만 출력하세요:
{"hasMismatch": true/false, "suggestion": "불일치가 있으면 수정 제안, 없으면 빈 문자열"}`;

  const result = await callAI("claude-haiku-4-5", [{ role: "user", content: prompt }], 300);
  return safeParseJSON(result) || { hasMismatch: false, suggestion: "" };
}

// 4. 메인 콘텐츠 생성
export async function generatePageContent(productData, onProgress) {
  const { productName, sellingPoints, designMood, template, images, language = "ko", qaAnswers = {} } = productData;

  const sectionOrder = template?.sectionOrder || ["hero", "brand", "key_features", "product_info", "target", "gallery", "usage", "notices", "cta"];
  const colorScheme = template?.colorScheme || { primary: "#1a1a2e", secondary: "#555", background: "#ffffff", text: "#111", accent: "#7c6aff" };

  onProgress?.(0, "고전환 제목 구상 중...", 10);

  const sectionsPrompt = sectionOrder.map((type, i) => `  "${type}": 섹션 ${i + 1}`).join("\n");

  const prompt = `당신은 전문 이커머스 상세페이지 기획자입니다.

제품명: "${productName}"
판매 포인트: ${sellingPoints.join(", ")}
디자인 무드: ${designMood || "clean"}
색상 테마: primary=${colorScheme.primary}, accent=${colorScheme.accent}
언어: ${language === "ko" ? "한국어" : language}
${qaAnswers.targetAge ? `타겟 고객: ${qaAnswers.targetAge}` : ""}
${qaAnswers.emphasis ? `강조 포인트: ${qaAnswers.emphasis}` : ""}

아래 섹션 순서대로 상세페이지 콘텐츠를 생성하세요:
${sectionsPrompt}

${NO_EMOJI}

다음 JSON 형식으로 출력하세요:
{
  "sections": [
    {
      "type": "hero",
      "title": "메인 타이틀 (20자 이내)",
      "subtitle": "서브 카피 (30자 이내)",
      "body": "본문 설명 (필요시)"
    },
    {
      "type": "brand",
      "brandName": "브랜드명 (영문 대문자)",
      "tagline": "브랜드 태그라인",
      "body": "브랜드 소개 2-3줄"
    },
    {
      "type": "key_features",
      "title": "섹션 제목",
      "features": [
        {"title": "특장점 제목", "desc": "설명 1-2줄"},
        {"title": "특장점 제목", "desc": "설명 1-2줄"},
        {"title": "특장점 제목", "desc": "설명 1-2줄"}
      ]
    },
    {
      "type": "product_info",
      "title": "제품 상세 정보",
      "rows": [
        {"label": "제품명", "value": "값"},
        {"label": "용량/크기", "value": "값"},
        {"label": "재질/성분", "value": "값"},
        {"label": "사용기한", "value": "값"}
      ]
    },
    {
      "type": "target",
      "title": "이런 분께 추천합니다",
      "items": ["대상1", "대상2", "대상3"]
    },
    {
      "type": "clinical",
      "title": "테스트 결과",
      "rows": [
        {"test": "테스트 항목", "subjects": "대상", "period": "기간", "result": "결과"}
      ]
    },
    {
      "type": "texture",
      "title": "감성 카피",
      "subtitle": "서브 카피",
      "body": "질감/텍스처 설명"
    },
    {
      "type": "gallery",
      "title": "제품 상세"
    },
    {
      "type": "usage",
      "title": "사용 방법",
      "steps": [
        {"step": 1, "title": "단계 제목", "desc": "설명"}
      ]
    },
    {
      "type": "lifestyle",
      "title": "라이프스타일 카피",
      "body": "시나리오 설명"
    },
    {
      "type": "notices",
      "title": "고객 유의사항",
      "items": ["유의사항1", "유의사항2", "유의사항3"]
    },
    {
      "type": "cta",
      "title": "구매 유도 카피",
      "buttonText": "지금 구매하기",
      "body": "추가 설명"
    }
  ]
}

주의:
- 각 섹션의 type은 반드시 위에 지정된 순서대로 사용하세요
- 현재 필요한 섹션 타입만 포함하세요: ${sectionOrder.join(", ")}
- 모든 텍스트는 ${language === "ko" ? "한국어" : language}로 작성하세요
- JSON만 출력하세요`;

  onProgress?.(1, "설득력 있는 제품 설명 작성 중...", 30);

  let fullText = "";
  try {
    fullText = await callAIStream(
      "claude-sonnet-4-5",
      [{ role: "user", content: prompt }],
      4000,
      (chunk) => {
        fullText += chunk;
        if (fullText.length > 200) onProgress?.(2, "핵심 판매 포인트 추출 중...", 50);
        if (fullText.length > 600) onProgress?.(3, "섹션 디자인 배치 중...", 70);
      },
      null,
      120000
    );
  } catch (e) {
    console.error("generatePageContent error:", e);
    return getDefaultSections(productName, sellingPoints, sectionOrder);
  }

  onProgress?.(4, "최종 점검 중...", 90);

  const parsed = safeParseJSON(fullText);
  if (!parsed?.sections) return getDefaultSections(productName, sellingPoints, sectionOrder);

  const sections = parsed.sections.map((sec, i) => ({
    id: `sec_${Date.now()}_${i}`,
    type: sec.type,
    data: sec,
    order: i,
  }));

  onProgress?.(5, "완료", 100);
  return sections;
}

// 5. 섹션 이미지 생성
export async function generateSectionImage(sectionType, productName, imageBase64) {
  const prompts = {
    hero: `Professional product photography of ${productName}, hero banner style, clean background, studio lighting`,
    texture: `Macro close-up texture shot of ${productName}, showing surface detail and quality`,
    lifestyle: `Lifestyle photography featuring ${productName} in a modern, aspirational setting`,
    gallery: `Product detail shot of ${productName}, multiple angles, white background`,
    target: `Person using ${productName}, natural and candid style`,
  };
  const prompt = prompts[sectionType] || `Product photography of ${productName}, ${sectionType} style`;

  try {
    const token = await getAuthToken();
    const res = await fetch("/api/image?action=generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ prompt, size: "1024x1024" }),
    });
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

// 6. 템플릿 자동 추천
export async function recommendTemplate(imageAnalysis) {
  const nonAutoTemplates = TEMPLATES.filter(t => !t.isAuto);
  const categoryMatch = nonAutoTemplates.filter(t => t.category === imageAnalysis.category);
  if (categoryMatch.length > 0) return categoryMatch[0].id;

  const moodMap = {
    food: "natural",
    beauty: "clean",
    fashion: "premium",
    tech: "premium",
    health: "trendy",
  };
  const targetMood = moodMap[imageAnalysis.category] || "clean";
  const moodMatch = nonAutoTemplates.filter(t => t.designMood === targetMood);
  return moodMatch.length > 0 ? moodMatch[0].id : "clean_white";
}

// 폴백 기본 섹션 (제품명 기반 고품질 콘텐츠)
function getDefaultSections(productName, sellingPoints, sectionOrder) {
  const name = productName || "프리미엄 제품";
  const sp = sellingPoints.length >= 3 ? sellingPoints : ["프리미엄 품질", "전문가 설계", "뛰어난 효과", "안심 성분", "간편한 사용"];

  const defaults = {
    hero: {
      type: "hero",
      title: name,
      subtitle: "PREMIUM QUALITY",
      body: `${name}만의 차별화된 기술력으로 한 차원 높은 결과를 경험하세요. 꼼꼼하게 설계된 포뮬러가 당신의 기대를 넘어섭니다.`,
      quickPoints: sp.slice(0, 3),
    },
    brand: {
      type: "brand",
      brandName: name.replace(/[0-9a-zA-Z\s]/g, "").slice(0, 6).toUpperCase() || "BRAND",
      tagline: `${name}, 차이를 만드는 선택`,
      body: `엄격한 품질 기준과 끊임없는 연구개발을 통해 탄생한 ${name}. 고객의 일상에 진정한 가치를 더하는 것이 우리의 목표입니다. 한 번 사용하면 알 수 있는, 확실한 차이를 경험해 보세요.`,
    },
    key_features: {
      type: "key_features",
      title: `${name}을 선택해야 하는 이유`,
      features: [
        { title: sp[0], desc: `${name}만의 핵심 기술력이 집약된 포인트입니다. 차별화된 원료 선정과 제조 공정을 통해 최상의 결과를 보장합니다.` },
        { title: sp[1], desc: `사용자의 실제 니즈를 반영한 설계로, 처음 사용하는 순간부터 만족감을 느낄 수 있습니다.` },
        { title: sp[2], desc: `꾸준한 사용을 통해 눈에 띄는 변화를 확인하세요. 수많은 사용자가 이미 그 효과를 경험했습니다.` },
      ],
    },
    product_info: {
      type: "product_info",
      title: "제품 상세 정보",
      rows: [
        { label: "제품명", value: name },
        { label: "용량/규격", value: "상세 페이지 참조" },
        { label: "주요 특징", value: sp.slice(0, 3).join(" / ") },
        { label: "사용기한", value: "제조일로부터 24개월" },
        { label: "제조국", value: "대한민국" },
      ],
    },
    target: {
      type: "target",
      title: "이런 분께 추천합니다",
      items: [
        `${sp[0]}이(가) 필요한 분`,
        "기존 제품에 만족하지 못한 분",
        "전문가가 추천하는 제품을 찾는 분",
      ],
    },
    clinical: {
      type: "clinical",
      title: "사용자 만족도 조사 결과",
      rows: [
        { test: "전체 만족도", subjects: "사용자 200명", period: "4주", result: "97%" },
        { test: "재구매 의향", subjects: "사용자 200명", period: "4주", result: "94%" },
        { test: "주변 추천 의향", subjects: "사용자 200명", period: "4주", result: "92%" },
      ],
    },
    texture: {
      type: "texture",
      title: "직접 느껴보는\n확실한 차이",
      subtitle: "PREMIUM TEXTURE",
      body: `${name}의 섬세한 디테일과 완성도 높은 마감을 직접 확인해 보세요. 사진으로는 전할 수 없는, 손끝에서 느껴지는 프리미엄 품질.`,
    },
    gallery: {
      type: "gallery",
      title: "제품 상세 이미지",
    },
    usage: {
      type: "usage",
      title: "사용 방법",
      steps: [
        { step: 1, title: "준비", desc: "사용 전 제품 상태를 확인하고, 동봉된 설명서를 읽어주세요." },
        { step: 2, title: "적용", desc: "적정량을 취해 사용 부위에 골고루 적용합니다." },
        { step: 3, title: "마무리", desc: "사용 후 제품을 깨끗이 정리하고 서늘한 곳에 보관하세요." },
      ],
    },
    lifestyle: {
      type: "lifestyle",
      title: "일상이 달라지는 순간",
      body: `${name}과 함께라면 매일의 루틴이 특별해집니다. 바쁜 일상 속에서도 나만의 프리미엄 시간을 만들어 보세요.`,
    },
    notices: {
      type: "notices",
      title: "고객 유의사항",
      items: [
        "사용 중 이상이 있는 경우 즉시 사용을 중단하고 전문가와 상담하세요.",
        "직사광선을 피하고 서늘한 곳에 보관해 주세요.",
        "어린이의 손이 닿지 않는 곳에 보관해 주세요.",
        "제품 개봉 후에는 가급적 빠른 시일 내에 사용해 주세요.",
      ],
    },
    cta: {
      type: "cta",
      title: `${name},\n지금 바로 만나보세요`,
      buttonText: "구매하기",
      body: "한정 수량 특별가로 만나보실 수 있습니다",
    },
  };

  return sectionOrder.map((type, i) => ({
    id: `sec_${Date.now()}_${i}`,
    type,
    data: defaults[type] || defaults.hero,
    order: i,
  }));
}
