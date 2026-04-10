// 네이버 검색 API로 최근 1주일 트렌드/이슈 수집
// 글 생성 시 시의성 있는 제목/도입부 만들기 위함

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const NEWS_URL = "https://openapi.naver.com/v1/search/news.json";

// HTML 태그/엔티티 제거
function cleanText(s) {
  if (!s) return "";
  return s
    .replace(/<\/?b>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
}

// 1주일 이내인지 체크
function isWithinDays(pubDateStr, days = 7) {
  try {
    const d = new Date(pubDateStr);
    if (Number.isNaN(d.getTime())) return false;
    const now = Date.now();
    return now - d.getTime() <= days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * 키워드로 네이버 뉴스 검색 → 최근 N일 + 정제 + dedup
 * @returns {Array<{title:string, description:string, pubDate:string, link:string}>}
 */
export async function fetchRecentTrends(keyword, { days = 7, limit = 10 } = {}) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET || !keyword) return [];

  try {
    const url = `${NEWS_URL}?query=${encodeURIComponent(keyword)}&display=30&sort=date`;
    const r = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    });
    if (!r.ok) {
      console.error("[naverbot] Naver news API:", r.status);
      return [];
    }
    const data = await r.json();
    const items = data?.items || [];

    const seen = new Set();
    const result = [];
    for (const it of items) {
      if (!isWithinDays(it.pubDate, days)) continue;
      const title = cleanText(it.title);
      if (!title || seen.has(title)) continue;
      seen.add(title);
      result.push({
        title,
        description: cleanText(it.description).slice(0, 200),
        pubDate: it.pubDate,
        link: it.link || it.originallink || "",
      });
      if (result.length >= limit) break;
    }
    return result;
  } catch (e) {
    console.error("[naverbot] fetchRecentTrends:", e.message);
    return [];
  }
}

/**
 * 트렌드 배열을 프롬프트 삽입용 텍스트로 정리
 * 트렌드 없으면 빈 문자열 반환 (조건부 삽입)
 */
export function trendsToPromptText(trends) {
  if (!trends || trends.length === 0) return "";

  const lines = trends
    .slice(0, 8)
    .map((t, i) => `${i + 1}. ${t.title}`)
    .join("\n");

  return `

[최근 1주일 관련 이슈/트렌드 (네이버 뉴스 기준)]
${lines}

== 트렌드 활용 규칙 (매우 중요) ==
- 위 트렌드 중 글 주제와 자연스럽게 연결되는 1~2개를 골라 도입부 또는 제목에 녹여줄 것
- 시의성 있는 글로 보이게 만들어 검색 노출과 클릭률을 높이는 것이 목표
- 단, 거짓 정보 만들지 말 것 — 트렌드 제목을 그대로 인용하거나 "최근 ~한 이슈가 있는데" 같은 자연스러운 도입 사용
- 트렌드와 글 주제의 연관성이 약하면 무리해서 끼워넣지 말 것 (자연스러움이 우선)`;
}
