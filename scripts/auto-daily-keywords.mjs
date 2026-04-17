// 매일 오전 7시 자동 실행 - 카테고리별 20개씩 추천 키워드 생성
// Windows Task Scheduler: node "D:\홈페이지\SNS메이킷\scripts\auto-daily-keywords.mjs"

const SB_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDg1NywiZXhwIjoyMDg5NDg2ODU3fQ.gfWezarKfomCrT74eiH0CGoYfg8Ow6RGlR3_svdfstE";
const ANTHROPIC_KEY = "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";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal,resolution=merge-duplicates", ...opts.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res;
}

async function askClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}

const CATEGORIES = [
  { id: "AI 도구", desc: "ChatGPT, Claude, 미드저니, 노션AI, 캔바AI 등 AI 도구 활용법과 비교 리뷰" },
  { id: "AI 트렌드", desc: "AI 모델 업데이트, AI 규제, AI 산업 동향, 생성형AI 뉴스, 빅테크 AI 전략" },
  { id: "블로그", desc: "네이버 블로그 상위노출, 블로그 수익화, SEO, 키워드 분석, 체험단, 블로그 운영 팁" },
  { id: "유튜브", desc: "유튜브 알고리즘, 쇼츠 전략, 썸네일, 구독자 성장, 수익화, 편집 팁" },
  { id: "인스타", desc: "릴스 알고리즘, 팔로워 전략, 인스타 쇼핑, 해시태그, 스토리 활용, 피드 디자인" },
  { id: "틱톡", desc: "틱톡 바이럴 전략, 숏폼 콘텐츠 제작, 틱톡샵, 챌린지 기획, 틱톡 광고" },
  { id: "마케팅", desc: "콘텐츠 마케팅, 브랜드 전략, 인플루언서 협업, SNS 마케팅, CRM" },
  { id: "광고", desc: "퍼포먼스 광고, 메타 광고, 구글 광고, 네이버 검색광고, ROAS 최적화" },
  { id: "이커머스", desc: "스마트스토어, 쿠팡, 라이브커머스, 셀러 전략, 상품 소싱, 쇼핑몰 창업" },
  { id: "부업/수익화", desc: "부업 아이템, 프리랜서 수익, 제휴마케팅, 전자책, 온라인 강의, 디지털노마드" },
  { id: "트렌드", desc: "MZ세대 소비, 핫플레이스, 시즌 이슈, 문화/엔터, 식음료 트렌드" },
  { id: "뷰티", desc: "스킨케어, 메이크업, 뷰티 제품 리뷰, 성분 분석, 셀프케어 루틴" },
  { id: "건강/운동", desc: "다이어트, 홈트레이닝, 건강식품, 러닝, 필라테스, 웰니스 라이프" },
  { id: "여행/맛집", desc: "국내 여행지, 해외 여행, 맛집 추천, 카페 투어, 호텔 리뷰, 여행 팁" },
  { id: "재테크", desc: "주식, 부동산, 코인, 적금, ETF, 경제 뉴스, 절약 팁, 재무 설계" },
  { id: "자기계발", desc: "독서, 생산성, 시간관리, 습관, 커리어 성장, 자격증, 공부법" },
];

async function generateCategoryKeywords(category, label) {
  const prompt = `당신은 SNS 콘텐츠 전략 전문가입니다. 오늘(${label}) 기준으로 "${category.id}" 분야에서 블로그/유튜브/SNS 콘텐츠 소재로 활용할 수 있는 추천 키워드 20개를 선정해주세요.

분야 범위: ${category.desc}

기준:
- 네이버, 구글, 다음 등에서 실시간 검색 관심도가 높은 키워드
- 시의성 있고, 글/영상 소재로 바로 활용 가능한 것
- 구체적이고 검색 가능한 롱테일 키워드 위주 (너무 포괄적인 단어 금지)

JSON 형식:
[
  {
    "keyword": "구체적인 키워드명",
    "reason": "추천 이유 (80~120자, 왜 지금 관심도가 높은지 + 어떤 콘텐츠를 만들면 좋은지)",
    "platforms": ["추천 플랫폼 2~3개 (네이버블로그, 유튜브, 인스타, 틱톡, 스레드 중)"]
  }
]

규칙:
- 유효한 JSON 배열만 출력 (마크다운/코드블록 없이)
- 정확히 20개
- 한국 시장 기준
- reason은 80자 이상`;

  const raw = await askClaude(prompt);
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const items = JSON.parse(cleaned);
  // category 필드 추가
  return items.map(kw => ({ ...kw, category: category.id }));
}

async function main() {
  const today = todayStr();
  const label = todayLabel();
  console.log(`[${new Date().toLocaleString("ko-KR")}] 카테고리별 키워드 생성 시작 (${today})`);

  const allKeywords = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    try {
      console.log(`[${i+1}/${CATEGORIES.length}] ${cat.id} 생성 중...`);
      const items = await generateCategoryKeywords(cat, label);
      allKeywords.push(...items);
      console.log(`  -> ${items.length}개 완료 (${items[0]?.keyword}, ${items[1]?.keyword}, ...)`);
    } catch (e) {
      console.error(`  [ERROR] ${cat.id} 실패:`, e.message);
    }
    // API 속도 제한 방지
    if (i < CATEGORIES.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`[OK] 총 ${allKeywords.length}개 키워드 생성 완료`);

  // Supabase에 저장 (upsert)
  const row = {
    date: today,
    keywords: JSON.stringify(allKeywords),
    created_at: new Date().toISOString(),
  };

  await sbFetch("daily_keywords", {
    method: "POST",
    body: JSON.stringify(row),
  });

  // 카테고리별 요약
  const summary = {};
  allKeywords.forEach(kw => { summary[kw.category] = (summary[kw.category] || 0) + 1; });
  console.log(`[OK] Supabase 저장 완료`);
  Object.entries(summary).forEach(([cat, cnt]) => console.log(`  ${cat}: ${cnt}개`));
  console.log(`[${new Date().toLocaleString("ko-KR")}] 완료`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
