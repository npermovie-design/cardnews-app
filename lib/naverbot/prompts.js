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

  // 패턴 B: 핵심 정리형
  `[글 구조]
도입부에서 "핵심 포인트를 정리했다" 형태로 예고.
각 섹션 소제목은 핵심 키워드 중심 (번호 없이, 예: "가장 먼저 할 일", "놓치기 쉬운 포인트").
[SUBTITLE] 소제목 → 본문(2~4문장) → [image:] 순서로 4~6개 항목.`,

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
3. 전체 글에서 [image:] 4~8개 배치. 자동 발행 안정성을 위해 불필요하게 많이 만들지 말 것.
4. 모든 섹션은 반드시 [SUBTITLE]로 시작.
5. 첫 번째 섹션 전에 도입부 문단(2~3문장)을 넣어 자연스럽게 시작.`;

const NO_ENDING_RULE = `
[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 사용 금지. 마지막 문단도 자연스럽게 본문처럼 이어서 끝낼 것`;

const NO_SPECIAL_RULE = `
[절대 금지] #, ##, **, ~~, *, -, 이모티콘, 이모지, 특수기호(★●■▶♥☆→), 마크다운 문법 일체 사용 금지.
소제목 앞에 "1.", "2.", "★", "▶" 같은 번호나 기호 절대 붙이지 말 것.
순수 한글 문장만 작성. 소제목은 [SUBTITLE] 마커로만 표시.`;

const TITLE_RULE = `
[제목 작성 규칙]
- 핵심 키워드를 자연스럽게 포함하되 같은 단어를 억지로 반복하지 말 것
- 30~40자 기준. 과장, 느낌표, 물음표, 광고성 표현 금지
- 경험 기반이면 방문/사용/확인 시점을 자연스럽게 반영
- 시의성이 중요한 주제는 현재 연월을 넣되, 오래된 연도를 임의로 쓰지 말 것`;

const AEO_QUESTION_TYPES = [
  ["정의형", "방법형", "가격·비교·이유형"],
  ["정의형", "비교형"],
  ["방법형", "주의사항형", "비용형", "추천형"],
  ["정의형", "장단점형", "대안형"],
  ["원인형", "해결책형", "비교형"],
];

function getAeoBlockRule() {
  const count = 2 + Math.floor(Math.random() * 3); // 2~4개
  const types = AEO_QUESTION_TYPES[Math.floor(Math.random() * AEO_QUESTION_TYPES.length)];
  const typeList = Array.from({ length: count }, (_, i) => `Q${i + 1}은 ${types[i % types.length]}`).join(", ");
  return `AEO 질문-답변 ${count}개를 넣으세요.
   형식은 반드시 "Q. 질문" 다음 줄에 "A. 답변"입니다. Q와 A는 각각 독립된 줄에 작성하세요.
   "FAQ", "자주 묻는 질문"이라는 라벨은 절대 쓰지 마세요.
   ${typeList}으로 구성하세요.
   답변은 60~120자, 첫 문장에 결론을 작성하세요.`;
}

const TABLE_BLOCK_RULE = `AEO 블록 다음에 핵심 정보 박스를 넣으세요.
   [TABLE] 마커를 한 줄에 단독으로 넣고, 바로 아래 줄부터 "항목: 값" 형식으로 5~7개 항목을 한 줄씩 작성하세요.
   예시:
   [TABLE]
   대상: 만 19세 이상 근로자
   한도: 연 2,000만 원
   금리: 연 3.5~4.2%
   신청 기한: 2026년 6월 30일까지
   주의사항: 중도 해지 시 세제 혜택 환수`;

const AEO_POSITION_LABEL = {
  top: "도입부 직후에",
  middle: "본문 중간 (3번째 소제목 뒤)에",
  bottom: "마지막 소제목 바로 앞에",
};

function buildQualityRule(aeoPosition = "top") {

  let aeoRule = "";
  if (aeoPosition && aeoPosition !== "none") {
    aeoRule = `
1. ${AEO_POSITION_LABEL[aeoPosition] || positionLabel.top} ${getAeoBlockRule()}
2. ${TABLE_BLOCK_RULE}`;
  }

  return `
[네이버 블로그 품질 구조]${aeoRule}
${aeoPosition !== "none" ? "3" : "1"}. 본문은 [SUBTITLE] 5~7개로 구성하고, 각 섹션은 250~400자 안팎으로 작성하세요.
${aeoPosition !== "none" ? "4" : "2"}. 마지막에는 솔직 평가를 넣으세요. 반드시 아래 형식으로 작성하세요:
   장점: (장점 3가지를 쉼표로 구분)
   단점: (단점 2가지를 쉼표로 구분)
   경제·사회 이슈는 "긍정:" / "우려:" 로 바꿔도 됩니다.
${aeoPosition !== "none" ? "5" : "3"}. 결론에는 반드시 아래 형식으로 작성하세요:
   추천 대상: (구체적 대상)
   비추천 대상: (구체적 대상)
${aeoPosition !== "none" ? "6" : "4"}. 핵심 키워드는 본문 전체에서 5회 이내로 자연스럽게만 반복하세요.
${aeoPosition !== "none" ? "7" : "5"}. 출처가 없는 수치, 기관명, 통계, 금리, 세율, 인용문은 만들지 마세요.
   제공 자료가 부족하면 "상황에 따라 달라질 수 있다"처럼 범위를 제한하세요.`;
}

const CATEGORY_INPUT_RULE = `
[카테고리별 정보 반영]
- 여행/방문: 위치, 방문 시기, 교통, 비용, 추천 대상, 비추천 대상을 우선 반영.
- 쇼핑/제품: 제품명, 가격, 구매처, 사용 기간, 비교 대상, 장단점을 우선 반영.
- 경제: 제도·상품·이슈, 적용 대상, 한도, 금리·수익률·세율, 신청 기한, 주의점을 우선 반영.
- 사회/뉴스: 발생 시점, 관련 주체, 핵심 쟁점, 공식 발표 또는 언론 출처 범위를 구분.
- IT/건강/기타: 핵심 수치, 적용 조건, 주의사항, 출처가 확인된 정보와 일반 설명을 구분.`;

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
    aeoPosition = "top",
  } = params;

  const sub = VALID_SUBTYPES.includes(subtype) ? subtype : "info";
  const w = WORD_COUNTS[wordCount] || WORD_COUNTS.medium;
  const t = TONES[tone] || TONES.friendly;
  const speechRule = SPEECH_STYLES[speech]
    ? `\n\n[말투/문체] ${SPEECH_STYLES[speech]}`
    : "";

  const f = fields || {};
  const keyword = f.keyword || "";
  // extra와 userPrompt 모두 포함 (둘 다 있으면 합침)
  const extraParts = [];
  if (f.extra) extraParts.push(f.extra);
  if (userPrompt) extraParts.push(userPrompt);
  const customExtra = extraParts.length > 0 ? `\n\n[사용자 맞춤 요청] ${extraParts.join("\n\n")}` : "";

  // 참고 글 스타일 지시가 있는지 감지 (userPrompt에 "참고 글" 포함 시)
  const hasRefStyle = userPrompt && userPrompt.includes("--- 참고 글 ---");

  // 현재 날짜 (글타입/제목에 시의성 반영)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dateStr = `${year}년 ${month}월`;
  const dateRule = `\n\n[시의성] 오늘은 ${dateStr}입니다. 제목과 본문에 "${year}", "${year}년", "${dateStr}" 등 현재 시점을 자연스럽게 반영하세요. "2024년", "올해" 같은 모호한 표현 대신 정확한 연월을 사용하세요.`;

  // 참고 글이 있으면 랜덤 구조 패턴 생략 (참고 글 패턴이 우선)
  const structurePattern = hasRefStyle ? "" : getRandomStructure();
  const imageRule = structurePattern + IMAGE_RULE_BASE;

  const qualityRule = buildQualityRule(aeoPosition);
  const tail = speechRule + qualityRule + CATEGORY_INPUT_RULE + NO_ENDING_RULE + NO_SPECIAL_RULE + TITLE_RULE + dateRule + (trendsText || "");

  let body;
  if (sub === "info") {
    body = `네이버 블로그 정보성 글 (${w}, ${t})
키워드: ${keyword}
대상: ${f.target || "일반 독자"}${customExtra}${imageRule}
- 검색 최적화 제목 (키워드 자연 포함, 과장 없는 정보형 제목)
- 실용적 팁/정보 위주, 독자가 바로 실행할 수 있는 구체적 액션 포함
- 도입부에서 독자의 고민/궁금증을 공감하며 시작
- 각 섹션마다 핵심 정보 1가지씩 깊이 있게 다루기 (나열식 피하기)
- 실제 사례, 수치, 비교 등 구체적 근거 포함
- 마무리는 추천 대상/비추천 대상까지 포함 (진부한 마무리 금지)${tail}`;
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
- 5W1H 포함 (누가, 언제, 어디서, 무엇을, 왜, 어떻게)
- 객관적 사실 기반, 구체적 수치/통계/출처 인용
- 도입부 2~3줄에 핵심 결론을 먼저 제시
- 관련 배경 정보와 전문가 의견 포함
- 독자에게 실질적 영향이나 시사점 제시${tail}`;
  }

  // 참고 글이 있으면 system 프롬프트를 참고 글 모방 모드로 전환
  const system = hasRefStyle
    ? `당신은 네이버 블로그 글 작성 전문가입니다.
사용자가 제공한 "참고 글"의 스타일을 완벽하게 모방하여 새 글을 작성합니다.

[최우선 규칙] 참고 글의 다음 요소를 100% 동일하게 따르세요:
- 문장 끝 처리 (~요/~다/~거든요 등)
- 단락 길이와 문장 수
- 도입부 시작 방식
- 소제목과 인용구 사용 패턴 (참고 글이 인용구를 소제목처럼 쓰면 [QUOTE]를 [SUBTITLE] 대신 사용)
- 이미지 배치 패턴 (참고 글이 이미지를 연속 2~3장 넣으면 동일하게)
- 전체적인 분위기, 톤, 감성

출력 형식 (반드시 준수):
[TITLE]
(30~40자 호기심 후킹 제목)

도입부...

[QUOTE] 또는 [SUBTITLE] (참고 글 패턴에 따라 선택)
본문 단락...
[image: english keyword]

(참고 글의 구성 패턴을 따라 섹션 반복)

[TAGS]
태그1, 태그2, 태그3, 태그4, 태그5 (5~10개, # 없이 쉼표 구분)

== 핵심 규칙 ==
- [TITLE] 다음 줄부터 바로 본문 시작. [BODY] 같은 마커 사용 금지.
- 참고 글이 [QUOTE]를 소제목으로 쓰면 [SUBTITLE] 대신 [QUOTE]만 사용.
- 참고 글이 [SUBTITLE]을 쓰면 [SUBTITLE] 사용.
- [image:]는 참고 글의 이미지 배치 패턴과 동일하게.
- [TAGS] 절대 빠뜨리지 마세요.
- 참고 글의 문체와 구조를 따르되, 내용은 새 주제에 맞게 독창적으로 작성.
- 절대 [[bold]], [[font-size:fs19]], [[underline]], [[color]], HTML, CSS 같은 내부 편집 마커를 출력하지 마세요.

[참고 글 모드에서 추가 구조]
${aeoPosition !== "none" ? `- 참고 글에 Q/A나 핵심 정보 박스가 없더라도, ${AEO_POSITION_LABEL[aeoPosition] || "도입부 직후에"} AEO Q/A를 추가하세요.
- AEO 블록 다음에 [TABLE] 마커와 5~7개 핵심 항목을 "항목: 값" 형식으로 넣으세요.` : "- Q/A(AEO) 블록은 넣지 마세요."}
- 마지막에는 장점/단점, 추천 대상/비추천 대상을 포함하세요.
- 이 구조는 참고 글 스타일보다 우선하지 않고, 참고 글 흐름 안에서 자연스럽게 삽입하세요.`
    : `당신은 네이버 블로그 글 작성 + SEO 카피라이팅 전문가입니다.
사용자의 글쓰기 스타일을 정확히 따르며, 다음 출력 형식을 엄격히 준수합니다.

출력 형식 (반드시 준수):
[TITLE]
(30~40자 호기심 후킹 제목. 숫자, 감정 트리거, 반전 활용.)

도입부 2~3문장...

[image: english keyword]
[SUBTITLE] 소제목
[QUOTE] 핵심 한 문장 (소제목 내용을 강렬하게 요약)
본문 단락...

(사용자가 지정한 글 구조 패턴에 따라 섹션 반복)
[QUOTE]는 각 [SUBTITLE] 바로 아래에 반드시 1줄 작성. 인용구 박스로 표시됩니다.

[TAGS]
태그1, 태그2, 태그3, 태그4, 태그5 (반드시 5~10개, # 없이 쉼표 구분)

== 핵심 규칙 ==
- [TITLE] 다음 줄부터 바로 본문 시작. [BODY] 같은 마커 사용 금지.
- 모든 섹션은 반드시 [SUBTITLE]로 시작. 소제목 없이 본문만 나오면 안 됨.
- [image:]는 섹션 사이에 자연스럽게 배치.
- 첫 줄에 제목 반복 금지.
- [TAGS] 절대 빠뜨리지 마세요. 태그는 네이버 검색 노출 핵심.
- 매번 동일한 구조가 아닌, 주제와 글타입에 맞는 독창적 구성으로 작성.
- 소제목 스타일도 다양하게: 질문형, 선언형, 숫자형, 감탄형 등 섞어서 사용.
- 절대 [[bold]], [[font-size:fs19]], [[underline]], [[color]], HTML, CSS 같은 내부 편집 마커를 출력하지 마세요.`;

  return { system, user: body };
}

// 본문에서 [image: ...], [SUBTITLE] ..., [QUOTE] ..., [gif: ...] 마커 모두 분할
// 반환: [{type:"text"|"image"|"subtitle"|"quote"|"gif", ...}, ...]
export function splitBodyByImageMarkers(body) {
  const blocks = [];
  body = String(body || "")
    .replace(/\[\[(?:\/|bold|underline|italic|strike|font-size:[^\]]+|font:[^\]]+|color:[^\]]+|bg:[^\]]+|background:[^\]]+|highlight:[^\]]+)\]\]/gi, "")
    .replace(/\[(?:\/|underline|font-size|color|bg|background|highlight)(?::[^\]]*)?\]/gi, "");
  // [TABLE], [표: ...] 마커는 일반 텍스트로 유지 (자동발행에서 안전하게 표시)
  body = body.replace(/^\[(?:TABLE|표)\].*$/gm, (m) => m.replace(/\[(?:TABLE|표)\]\s*/, ""));
  body = body.replace(/^\[표:\s*([^\]]+)\]$/gm, "$1");
  // Q./A. 마커는 자동발행 시 일반 텍스트로 유지 (접두어만 정리)
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
