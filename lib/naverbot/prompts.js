// 네이버 블로그 글 생성 프롬프트 빌더
// 메이킷 src/BlogUtils.jsx의 PLATFORMS.blog_naver 패턴 이식

const WORD_COUNTS = {
  short: "1,000~1,500자",
  medium: "2,000~3,000자",
  long: "4,000자 이상",
};

const TONES = {
  friendly: "친근하고 유용한 정보 전달체",
  diary: "일기처럼 자연스럽고 솔직한",
  review: "객관적이고 구체적인 리뷰체",
  professional: "전문적이고 신뢰감 있는",
};

const SPEECH_STYLES = {
  polite_yo: "해요체(~요, ~이에요, ~했어요)로 작성",
  formal: "합니다체(~입니다, ~했습니다, ~됩니다)로 작성",
  casual: "반말(~야, ~거든, ~했어, ~인데)로 작성. 자연스러운 구어체",
  mixed: "상황에 맞게 존댓말과 반말을 자연스럽게 섞어서 작성",
};

const VALID_SUBTYPES = ["info", "visit", "travel", "product", "column", "article"];

// 글타입별 필수/선택 필드
const SUBTYPE_FIELDS = {
  info: ["target", "extra"],
  visit: ["location", "visitDate", "rating", "extra"],
  travel: ["location", "duration", "budget", "extra"],
  product: ["productName", "price", "pros", "cons", "extra"],
  column: ["mainPoint", "extra"],
  article: ["extra"],
};

// 글 구조 패턴 — 랜덤으로 선택하여 매번 다른 형태
const STRUCTURE_PATTERNS = [
  // 패턴 A: 표준형 (소제목 + 본문 반복)
  `[글 구조]
도입부 2~3문장으로 시작.
이후 [SUBTITLE] → 본문(3~5문장) → [image:] 순서를 4~5회 반복.
마지막 섹션은 짧은 마무리 문장으로 자연스럽게 종결.`,

  // 패턴 B: 넘버링형 (숫자 포함 소제목)
  `[글 구조]
도입부에서 "N가지 방법/팁/비결" 형태로 예고.
각 섹션 소제목에 번호를 포함 (예: "1. 첫 번째 핵심", "2. 두 번째 비결").
[SUBTITLE] 1. 소제목 → 본문(2~4문장) → [image:] 순서로 5~7개 항목.
중간에 한 번은 이미지 2장 연속 배치 (다양성).`,

  // 패턴 C: 문제-해결형
  `[글 구조]
도입부에서 독자의 고민/문제를 공감하며 시작 (질문형).
[SUBTITLE] "왜 ~할까?" 형태의 문제 제기 → 본문에서 원인 분석.
[SUBTITLE] "해결법: ~" 형태 → 구체적 솔루션 제시.
[image:]는 해결법 섹션 뒤에 배치.
총 4~5섹션, 마지막은 실천 체크리스트나 요약.`,

  // 패턴 D: 스토리텔링형
  `[글 구조]
도입부에서 실제 경험담이나 에피소드로 시작 (시간/장소 구체적으로).
본문 중간에 "그때 깨달은 것은..." 같은 전환 포인트.
[SUBTITLE]은 시간 흐름이나 깨달음 순서로 구성.
[image:]는 각 에피소드 앞에 분위기 사진.
총 3~4섹션, 개인적 톤이지만 교훈은 보편적으로.`,

  // 패턴 E: 비교분석형
  `[글 구조]
도입부에서 "A vs B" 또는 "전 vs 후" 프레임 제시.
[SUBTITLE]별로 비교 항목을 나눠 분석 (가격/품질/사용성 등).
[image:]는 비교 대상의 시각적 이미지.
총 4~5섹션, 마지막에 "결론: 이런 사람에게 추천" 형태.`,
];

function getRandomStructure() {
  return STRUCTURE_PATTERNS[Math.floor(Math.random() * STRUCTURE_PATTERNS.length)];
}

const IMAGE_RULE_BASE = `
[이미지 규칙]
1. [image: keyword]는 영문 2~3단어로, 해당 내용과 직접 관련된 구체적 장면/사물.
   좋은 예: [image: glucose meter finger], [image: korean office desk]
   나쁜 예: [image: health], [image: technology]
2. [image:]는 섹션 사이에 자연스럽게 배치. 연속 2장도 가능.
3. 전체 글에서 [image:] 4~6개 배치.
4. 모든 섹션은 반드시 [SUBTITLE]로 시작.
5. 첫 번째 섹션 전에 도입부 문단(2~3문장)을 넣어 자연스럽게 시작.`;

const NO_ENDING_RULE = `
[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 사용 금지. 마지막 문단도 자연스럽게 본문처럼 이어서 끝낼 것`;

const NO_SPECIAL_RULE = `
[절대 금지] #, ##, **, ~~, *, -, 이모티콘, 이모지, 특수기호(★●■▶♥☆→), 마크다운 문법 일체 사용 금지. 순수 한글 문장만 작성. 소제목은 [SUBTITLE] 마커로만 표시.`;

const TITLE_RULE = `
[제목 작성 규칙]
- 절대 키워드/주제를 그대로 반복하지 말 것
- 30~40자, 호기심 자극 후킹형
- 숫자/감정 트리거/궁금증 활용
- 예시: "월 50만원 아끼는 사장님 비밀, 모르면 손해보는 절세 팁 5가지"`;

/**
 * 사용자 입력으로 Claude에 보낼 system + user 프롬프트 생성
 * @param {object} params
 * @param {string} params.subtype - info|visit|travel|product|column|article
 * @param {string} params.tone - friendly|diary|review|professional
 * @param {string} params.speech - polite_yo|formal|casual|mixed
 * @param {string} params.wordCount - short|medium|long
 * @param {object} params.fields - { keyword, target, location, ... }
 * @param {string} params.userPrompt - (선택) 사용자 자유 프롬프트 (extra 대신/추가로)
 * @param {string} params.trendsText - (선택) trendsToPromptText() 결과 (시의성 주입)
 * @param {boolean} params.useGif - (선택) GIF 짤 삽입 여부
 */
export function buildBlogPrompt(params) {
  const {
    subtype = "info",
    tone = "friendly",
    speech = "polite_yo",
    wordCount = "medium",
    fields = {},
    userPrompt = "",
    trendsText = "",
    useGif = false,
  } = params;

  const sub = VALID_SUBTYPES.includes(subtype) ? subtype : "info";
  const w = WORD_COUNTS[wordCount] || WORD_COUNTS.medium;
  const t = TONES[tone] || TONES.friendly;
  const speechRule = SPEECH_STYLES[speech]
    ? `\n\n[말투/문체] ${SPEECH_STYLES[speech]}`
    : "";

  const f = fields || {};
  const keyword = f.keyword || "";
  const customExtra = (f.extra || userPrompt) ? `\n\n[사용자 맞춤 요청] ${f.extra || userPrompt}` : "";

  // 랜덤 글 구조 선택
  const structurePattern = getRandomStructure();
  const imageRule = structurePattern + IMAGE_RULE_BASE;

  const tail = speechRule + NO_ENDING_RULE + NO_SPECIAL_RULE + TITLE_RULE + (trendsText || "");

  let body;
  if (sub === "info") {
    body = `네이버 블로그 정보성 글 (${w}, ${t})
키워드: ${keyword}
대상: ${f.target || "일반 독자"}${customExtra}${imageRule}
- 검색 최적화 제목
- 실용적 팁/정보 위주${tail}`;
  } else if (sub === "visit") {
    body = `네이버 블로그 체험·방문후기 (${w}, ${t})
장소: ${keyword} / 위치: ${f.location || ""} / 날짜: ${f.visitDate || "최근"} / 평점: ${f.rating || "4.5"}/5${customExtra}${imageRule}
- 방문 전 기대→방문 과정→솔직 총평
- 장단점 명확히, 재방문 의사 포함${tail}`;
  } else if (sub === "travel") {
    body = `네이버 블로그 여행후기 (${w}, ${t})
여행지: ${keyword} / 장소: ${f.location || ""} / 기간: ${f.duration || "당일"} / 예산: ${f.budget || ""}${customExtra}${imageRule}
- 일정별 구조화, 맛집/명소/교통 포함
- 실제 여행자 감성, 예산 팁 포함${tail}`;
  } else if (sub === "product") {
    body = `네이버 블로그 제품후기 (${w}, ${t})
제품: ${f.productName || keyword} / 가격: ${f.price || ""}
장점: ${f.pros || ""} / 단점: ${f.cons || ""}${customExtra}${imageRule}
- 구매 전 고민→언박싱→실사용 구조
- 추천 대상·가성비 총평 포함${tail}`;
  } else if (sub === "column") {
    body = `네이버 블로그 칼럼 (${w}, 전문적이고 논리적인 칼럼체)
주제: ${keyword}
핵심 주장: ${f.mainPoint || ""}${customExtra}${imageRule}
- 주장→근거→반론→결론 구조
- 데이터·사례·통계 인용${tail}`;
  } else {
    // article
    body = `네이버 블로그 기사 방식 글 (${w}, 객관적이고 보도 형식의)
주제: ${keyword}${customExtra}${imageRule}
- 역피라미드 구조 (핵심→세부→배경)
- 5W1H 포함
- 객관적 사실 기반${tail}`;
  }

  const system = `당신은 네이버 블로그 글 작성 + SEO 카피라이팅 전문가입니다.
사용자의 글쓰기 스타일을 정확히 따르며, 다음 출력 형식을 엄격히 준수합니다.

출력 형식 (반드시 준수):
[TITLE]
(30~40자 호기심 후킹 제목. 숫자, 감정 트리거, 반전 활용.)

도입부 2~3문장...

[image: english keyword]
[SUBTITLE] 소제목
본문 단락...

(사용자가 지정한 글 구조 패턴에 따라 섹션 반복)

[TAGS]
태그1, 태그2, 태그3, 태그4, 태그5 (반드시 5~10개, # 없이 쉼표 구분)

== 핵심 규칙 ==
- [TITLE] 다음 줄부터 바로 본문 시작. [BODY] 같은 마커 사용 금지.
- 모든 섹션은 반드시 [SUBTITLE]로 시작. 소제목 없이 본문만 나오면 안 됨.
- [image:]는 섹션 사이에 자연스럽게 배치.
- 첫 줄에 제목 반복 금지.
- [TAGS] 절대 빠뜨리지 마세요. 태그는 네이버 검색 노출 핵심.
- 매번 동일한 구조가 아닌, 주제와 글타입에 맞는 독창적 구성으로 작성.
- 소제목 스타일도 다양하게: 질문형, 선언형, 숫자형, 감탄형 등 섞어서 사용.`;

  return { system, user: body };
}

// 본문에서 [image: ...], [SUBTITLE] ..., [QUOTE] ..., [gif: ...] 마커 모두 분할
// 반환: [{type:"text"|"image"|"subtitle"|"quote"|"gif", ...}, ...]
export function splitBodyByImageMarkers(body) {
  const blocks = [];
  // 통합 정규식: [image: xx], [SUBTITLE] xx, [QUOTE] xx, [gif: xx] 한 줄
  const regex = /\[image:\s*([^\]]+)\]|\[SUBTITLE\]\s*([^\n]+)|\[QUOTE\]\s*([^\n]+)|\[gif:\s*([^\]]+)\]/gi;
  let lastIdx = 0;
  let m;

  while ((m = regex.exec(body)) !== null) {
    const before = body.slice(lastIdx, m.index).trim();
    if (before) blocks.push({ type: "text", content: before });

    if (m[1]) {
      blocks.push({ type: "image", keyword: m[1].trim() });
    } else if (m[2]) {
      blocks.push({ type: "subtitle", content: m[2].trim() });
    } else if (m[3]) {
      blocks.push({ type: "quote", content: m[3].trim() });
    } else if (m[4]) {
      blocks.push({ type: "gif", keyword: m[4].trim() });
    }
    lastIdx = m.index + m[0].length;
  }

  const after = body.slice(lastIdx).trim();
  if (after) blocks.push({ type: "text", content: after });

  return blocks;
}
