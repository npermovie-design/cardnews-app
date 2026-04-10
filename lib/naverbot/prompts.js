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

const IMAGE_RULE = `
[글 구조 필수 규칙]
1. 큰 소제목 → [image: 영문 키워드] → 본문 설명 순서로 반복
2. [image: keyword] 형태로 각 소제목마다 1개씩 이미지 삽입 (총 3~5개)
3. 키워드는 반드시 영문 2~3단어로, 사진 검색 시 정확히 해당 사물/장면이 나올 만큼 구체적으로 작성
   좋은 예시: [image: glucose meter finger], [image: vegetable salad plate], [image: morning jogging park], [image: cafe latte art], [image: laptop home desk]
   나쁜 예시: [image: health], [image: food], [image: nature], [image: technology]
4. 해당 문단에서 설명하는 구체적 사물, 음식, 장소, 행동을 영어로 묘사
5. 소제목은 3~5개 정도`;

const NO_ENDING_RULE = `
[마무리 금지] "마치며", "끝으로", "마무리하며", "글을 마치며", "정리하면" 같은 진부한 마무리 표현 절대 사용 금지. 마지막 문단도 자연스럽게 본문처럼 이어서 끝낼 것`;

const NO_SPECIAL_RULE = `
[절대 금지] #, ##, **, ~~, *, -, 이모티콘, 이모지, 특수기호(★●■▶♥☆→), 마크다운 문법 일체 사용 금지. 순수 한글 문장만 작성. 소제목은 그냥 별도 줄에 일반 텍스트로 작성.`;

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
 */
export function buildBlogPrompt(params) {
  const {
    subtype = "info",
    tone = "friendly",
    speech = "polite_yo",
    wordCount = "medium",
    fields = {},
    userPrompt = "",
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
  const tail = speechRule + NO_ENDING_RULE + NO_SPECIAL_RULE + TITLE_RULE;

  let body;
  if (sub === "info") {
    body = `네이버 블로그 정보성 글 (${w}, ${t})
키워드: ${keyword}
대상: ${f.target || "일반 독자"}${customExtra}${IMAGE_RULE}
- 검색 최적화 제목
- 실용적 팁/정보 위주${tail}`;
  } else if (sub === "visit") {
    body = `네이버 블로그 체험·방문후기 (${w}, ${t})
장소: ${keyword} / 위치: ${f.location || ""} / 날짜: ${f.visitDate || "최근"} / 평점: ${f.rating || "4.5"}/5${customExtra}${IMAGE_RULE}
- 방문 전 기대→방문 과정→솔직 총평
- 장단점 명확히, 재방문 의사 포함${tail}`;
  } else if (sub === "travel") {
    body = `네이버 블로그 여행후기 (${w}, ${t})
여행지: ${keyword} / 장소: ${f.location || ""} / 기간: ${f.duration || "당일"} / 예산: ${f.budget || ""}${customExtra}${IMAGE_RULE}
- 일정별 구조화, 맛집/명소/교통 포함
- 실제 여행자 감성, 예산 팁 포함${tail}`;
  } else if (sub === "product") {
    body = `네이버 블로그 제품후기 (${w}, ${t})
제품: ${f.productName || keyword} / 가격: ${f.price || ""}
장점: ${f.pros || ""} / 단점: ${f.cons || ""}${customExtra}${IMAGE_RULE}
- 구매 전 고민→언박싱→실사용 구조
- 추천 대상·가성비 총평 포함${tail}`;
  } else if (sub === "column") {
    body = `네이버 블로그 칼럼 (${w}, 전문적이고 논리적인 칼럼체)
주제: ${keyword}
핵심 주장: ${f.mainPoint || ""}${customExtra}${IMAGE_RULE}
- 주장→근거→반론→결론 구조
- 데이터·사례·통계 인용${tail}`;
  } else {
    // article
    body = `네이버 블로그 기사 방식 글 (${w}, 객관적이고 보도 형식의)
주제: ${keyword}${customExtra}${IMAGE_RULE}
- 역피라미드 구조 (핵심→세부→배경)
- 5W1H 포함
- 객관적 사실 기반${tail}`;
  }

  const system = `당신은 네이버 블로그 글 작성 + SEO 카피라이팅 전문가입니다.
사용자의 글쓰기 스타일을 정확히 따르며, 다음 출력 형식을 엄격히 준수합니다.

출력 형식 (반드시 준수):
[TITLE]
제목 한 줄 (30~40자, 호기심 후킹형, 키워드 그대로 반복 금지)

[BODY]
본문 시작
... (본문에 [image: english keyword] 마커가 자연스럽게 삽입되어 있어야 함)
... 본문 끝

[TAGS]
태그1, 태그2, 태그3 (5~10개, # 없이 쉼표 구분)`;

  return { system, user: body };
}

// 본문에서 [image: keyword] 마커 추출 + 마커 위치 보존한 분할
// 반환: [{type:"text", content:"..."}, {type:"image", keyword:"..."}, ...]
export function splitBodyByImageMarkers(body) {
  const blocks = [];
  const regex = /\[image:\s*([^\]]+)\]/gi;
  let lastIdx = 0;
  let m;

  while ((m = regex.exec(body)) !== null) {
    const before = body.slice(lastIdx, m.index).trim();
    if (before) blocks.push({ type: "text", content: before });
    blocks.push({ type: "image", keyword: m[1].trim() });
    lastIdx = m.index + m[0].length;
  }

  const after = body.slice(lastIdx).trim();
  if (after) blocks.push({ type: "text", content: after });

  return blocks;
}
