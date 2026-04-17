// 매일 오전 7시 자동 실행 - AI뉴스 + 마케팅뉴스 자동 게시
// Windows Task Scheduler: node "D:\홈페이지\SNS메이킷\scripts\auto-daily-post.mjs"

const SB_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDg1NywiZXhwIjoyMDg5NDg2ODU3fQ.gfWezarKfomCrT74eiH0CGoYfg8Ow6RGlR3_svdfstE";
const ANTHROPIC_KEY = "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";

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal", ...opts.headers },
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
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function todayLabel() {
  const d = new Date();
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}

const UNSPLASH_IMAGES = {
  ai: [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
    "https://images.unsplash.com/photo-1684369175833-4b445ad6bfb5?w=1200&q=80",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80",
    "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=1200&q=80",
    "https://images.unsplash.com/photo-1681412332858-1b30b2f5e78f?w=1200&q=80",
  ],
  marketing: [
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80",
    "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1200&q=80",
    "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&q=80",
  ],
};

function pickImage(type) {
  const imgs = UNSPLASH_IMAGES[type];
  return imgs[Math.floor(Math.random() * imgs.length)];
}

function buildHtml(imageUrl, items, altText) {
  const itemsHtml = items.map((it, i) =>
    `<div style="margin-bottom:28px;padding:20px 24px;border-radius:14px;background:rgba(124,106,255,0.03);border:1px solid rgba(124,106,255,0.08)">
<h3 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#1a1730">${i+1}. ${it.title}</h3>
<p style="margin:0 0 10px;font-size:14px;line-height:1.85;color:#333">${it.desc}</p>
<p style="margin:0;font-size:12px;color:#999">출처: ${it.source}</p>
</div>`
  ).join("\n");

  return `<div style="margin-bottom:28px"><img src="${imageUrl}" alt="${altText}" style="width:100%;max-width:800px;border-radius:14px;display:block"></div>
${itemsHtml}`;
}

async function generatePost(type) {
  const label = todayLabel();
  const typeLabel = type === "ai" ? "AI" : "마케팅";
  const typeTag = type === "ai" ? "AI" : "마케팅";

  const prompt = type === "ai"
    ? `당신은 AI/테크 전문 에디터입니다. 오늘(${label}) 기준 최신 AI 뉴스 브리핑 10개를 작성하세요.

주제 범위: AI 모델 업데이트, AI 서비스 출시, AI 규제/정책, AI 활용 사례, 생성형AI 트렌드, AI 스타트업, AI와 일자리, AI 윤리, AI 도구/앱, 빅테크 AI 전략

각 항목은 다음 JSON 형식으로 작성:
[
  {"title": "뉴스 제목 (30자 내외)", "desc": "상세 설명 (200~300자, 구체적 수치와 맥락 포함)", "source": "출처 (매체명 2~3개)"}
]

규칙:
- 반드시 유효한 JSON 배열만 출력
- 실제 존재할법한 최신 트렌드와 이슈 기반
- 각 항목의 desc는 200자 이상 필수
- 한국 시장 관점 포함
- 마크다운이나 코드블록 없이 순수 JSON만 출력`
    : `당신은 디지털 마케팅 전문 에디터입니다. 오늘(${label}) 기준 최신 소셜미디어/마케팅 뉴스 브리핑 10개를 작성하세요.

주제 범위: SNS 알고리즘 변경, 인플루언서 마케팅, 이커머스 트렌드, 광고 플랫폼 업데이트, 숏폼 콘텐츠, 라이브커머스, SEO/GEO, 크리에이터 경제, 리테일미디어, 브랜드 마케팅 전략

각 항목은 다음 JSON 형식으로 작성:
[
  {"title": "뉴스 제목 (30자 내외)", "desc": "상세 설명 (200~300자, 구체적 수치와 맥락 포함)", "source": "출처 (매체명 2~3개)"}
]

규칙:
- 반드시 유효한 JSON 배열만 출력
- 실제 존재할법한 최신 트렌드와 이슈 기반
- 각 항목의 desc는 200자 이상 필수
- 한국 시장 관점 포함
- 마크다운이나 코드블록 없이 순수 JSON만 출력`;

  const raw = await askClaude(prompt);

  // JSON 파싱 (코드블록 제거)
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const items = JSON.parse(cleaned);

  const image = pickImage(type);
  const titlePrefix = type === "ai" ? `[${label} AI뉴스]` : `[${label} 소셜클리핑]`;
  const mainTitle = `${titlePrefix} ${items[0].title} 외`;
  const body = buildHtml(image, items, type === "ai" ? "AI뉴스" : "소셜클리핑");

  const row = {
    id: String(Date.now() + (type === "ai" ? 0 : 1000)),
    title: mainTitle,
    content: body,
    cat: "info",
    subCat: "info",
    tag: typeTag,
    author: "관리자",
    author_uid: "admin",
    views: 0,
    likes: 0,
    images: [image],
    comments: [],
    created_at: new Date().toISOString(),
  };

  await sbFetch("posts", { method: "POST", body: JSON.stringify(row) });
  console.log(`[OK] ${typeLabel} 게시글 등록: ${mainTitle}`);
}

async function main() {
  const today = todayStr();
  console.log(`[${new Date().toLocaleString("ko-KR")}] 자동 포스팅 시작 (${today})`);

  try {
    await generatePost("marketing");
    console.log("[1/2] 마케팅 뉴스 완료");
  } catch (e) {
    console.error("[ERROR] 마케팅 뉴스 실패:", e.message);
  }

  // 2초 간격
  await new Promise(r => setTimeout(r, 2000));

  try {
    await generatePost("ai");
    console.log("[2/2] AI 뉴스 완료");
  } catch (e) {
    console.error("[ERROR] AI 뉴스 실패:", e.message);
  }

  console.log(`[${new Date().toLocaleString("ko-KR")}] 자동 포스팅 완료`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
