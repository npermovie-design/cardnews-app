// 키워드 실시간 검색량 분석 API
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { keyword, category } = req.body || {};
  if (!keyword) return res.status(400).json({ error: "keyword 필수" });

  const result = { keyword, naver: {}, google: {}, related: [], categoryRanking: [] };

  // ── 1. 네이버 플랫폼별 검색량 (병렬) ──
  const naverTypes = ["blog", "news", "cafearticle", "shop", "kin", "webkr"];
  const naverLabels = { blog: "블로그", news: "뉴스", cafearticle: "카페", shop: "쇼핑", kin: "지식iN", webkr: "웹문서" };
  try {
    const results = await Promise.all(naverTypes.map(t => fetchNaverSearch(t, keyword)));
    result.naver.platforms = {};
    naverTypes.forEach((t, i) => {
      result.naver.platforms[t] = {
        label: naverLabels[t],
        total: results[i].total || 0,
        items: (results[i].items || []).slice(0, 5).map(simplify),
      };
    });
  } catch (e) {
    console.error("Naver error:", e.message);
  }

  // ── 2. 네이버 연관 검색어 (자동완성) ──
  try {
    const acRes = await fetch(
      `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8`,
    );
    if (acRes.ok) {
      const acData = await acRes.json();
      const raw = acData?.items || [];
      const parsed = [];
      for (const group of raw) {
        if (Array.isArray(group)) {
          for (const item of group) {
            const kw = Array.isArray(item) ? item[0] : item;
            if (typeof kw === "string" && kw.trim()) parsed.push(kw.trim());
          }
        }
      }
      result.related = [...new Set(parsed)].slice(0, 20);
    }
  } catch {}

  // ── 3. 구글 트렌드 (비공식 - 관련 쿼리 + 관심도) ──
  try {
    // 관련 토픽
    const gtAutoRes = await fetch(
      `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(keyword)}?hl=ko`,
    );
    if (gtAutoRes.ok) {
      const text = await gtAutoRes.text();
      const jsonStart = text.indexOf("{");
      if (jsonStart >= 0) {
        const json = JSON.parse(text.slice(jsonStart));
        result.google.topics = (json?.default?.topics || []).map(t => ({
          title: t.title,
          type: t.type,
        })).slice(0, 10);
      }
    }
  } catch {
    result.google.topics = [];
  }

  try {
    // 실시간 관심도 (Google Trends 일별 데이터)
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const gtRes = await fetch(
      `https://trends.google.com/trends/api/widgetdata/multiline?hl=ko&tz=-540&req=${encodeURIComponent(JSON.stringify({
        time: `${fmt(past)} ${fmt(now)}`,
        resolution: "DAY",
        locale: "ko",
        comparisonItem: [{ keyword, geo: "KR", time: `${fmt(past)} ${fmt(now)}` }],
        requestOptions: { property: "", backend: "IZG", category: 0 },
      }))}&token=unused`
    );
    if (gtRes.ok) {
      const text = await gtRes.text();
      const jsonStart = text.indexOf("{");
      if (jsonStart >= 0) {
        const json = JSON.parse(text.slice(jsonStart));
        const timeline = json?.default?.timelineData || [];
        result.google.trend = timeline.slice(-14).map(d => ({
          date: d.formattedTime,
          value: d.value?.[0] ?? 0,
        }));
      }
    }
  } catch {
    result.google.trend = [];
  }

  // ── 4. 구글 검색결과 수 추정 ──
  try {
    const gRes = await fetch(
      `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=kr&num=5`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (gRes.ok) {
      const html = await gRes.text();
      const match = html.match(/약 ([\d,]+)개/);
      if (match) result.google.totalResults = parseInt(match[1].replace(/,/g, ""), 10);
    }
  } catch {}

  // ── 5. 카테고리별 인기 키워드 ──
  if (category && category !== "all") {
    try {
      const catKeywords = getCategoryKeywords(category);
      const catResults = await Promise.all(
        catKeywords.map(async kw => {
          const r = await fetchNaverSearch("blog", kw);
          return { keyword: kw, blogTotal: r.total || 0 };
        })
      );
      result.categoryRanking = catResults.sort((a, b) => b.blogTotal - a.blogTotal);
    } catch {}
  }

  return res.status(200).json({ ok: true, ...result });
}

async function fetchNaverSearch(type, query) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return { total: 0, items: [] };
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=5&sort=sim`;
  const r = await fetch(url, {
    headers: { "X-Naver-Client-Id": NAVER_CLIENT_ID, "X-Naver-Client-Secret": NAVER_CLIENT_SECRET },
  });
  if (!r.ok) return { total: 0, items: [] };
  return r.json();
}

function simplify(item) {
  return {
    title: (item.title || "").replace(/<\/?b>/gi, "").replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, ""),
    link: item.link || item.bloggerlink || "",
    date: item.postdate || item.pubDate || "",
  };
}

function getCategoryKeywords(category) {
  const map = {
    beauty: ["스킨케어 루틴", "여드름 관리", "선크림 추천", "파운데이션 추천", "뷰티 트렌드", "화장품 리뷰", "피부과 시술", "헤어 관리", "네일아트", "향수 추천"],
    food: ["맛집 추천", "레시피", "밀키트 추천", "카페 추천", "배달 맛집", "건강 식단", "다이어트 식단", "홈베이킹", "편의점 신상", "술안주"],
    travel: ["국내 여행", "해외 여행", "제주도 맛집", "호텔 추천", "항공권 특가", "캠핑장 추천", "온천 여행", "여행 코스", "숙소 추천", "액티비티"],
    it: ["아이폰 리뷰", "갤럭시 비교", "노트북 추천", "AI 활용법", "앱 추천", "블로그 수익화", "유튜브 장비", "코딩 독학", "태블릿 추천", "스마트홈"],
    health: ["다이어트 방법", "운동 루틴", "영양제 추천", "수면 건강", "스트레칭", "헬스장 추천", "요가", "단백질 보충제", "정신건강", "건강검진"],
    finance: ["재테크", "주식 투자", "부동산 전망", "적금 추천", "신용카드 추천", "보험 비교", "연말정산", "가계부", "코인 투자", "절약 팁"],
    parenting: ["육아 팁", "이유식 레시피", "유아 장난감", "키즈카페", "임신 준비", "출산 준비물", "아기 옷", "돌잔치", "어린이집", "태교"],
    pet: ["강아지 사료", "고양이 사료", "반려동물 보험", "강아지 훈련", "고양이 화장실", "펫 호텔", "동물병원", "강아지 산책", "고양이 장난감", "반려동물 용품"],
  };
  return map[category] || map.beauty;
}
