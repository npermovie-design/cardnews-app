// api/analyze-creator.js — SNS 크리에이터 공개 데이터 수집
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { platform, username } = req.body || {};
  if (!platform || !username) return res.status(400).json({ error: "platform, username 필요" });

  const clean = username.replace(/^@/, "").trim();
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  try {
    if (platform === "instagram") {
      // Instagram 프로필 공개 데이터
      const profileUrl = `https://www.instagram.com/${clean}/`;
      const r = await fetch(profileUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR,ko;q=0.9" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "인스타그램 프로필을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
          || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
        return m?.[1] || "";
      };

      const ogTitle = getMeta("og:title");
      const ogDesc = getMeta("og:description");
      const ogImage = getMeta("og:image");

      // 팔로워/게시물 수 추출 시도
      const followersMatch = ogDesc.match(/([\d,.]+[KMkm]?)\s*Followers/i) || ogDesc.match(/팔로워\s*([\d,.]+[만천]?)/);
      const postsMatch = ogDesc.match(/([\d,.]+)\s*Posts/i) || ogDesc.match(/게시물\s*([\d,.]+)/);

      return res.json({
        platform: "instagram",
        username: clean,
        displayName: ogTitle?.replace(/ \(@.*/, "").replace(/ • Instagram.*/, "") || clean,
        bio: ogDesc || "",
        profilePic: ogImage || "",
        followers: followersMatch?.[1] || "",
        posts: postsMatch?.[1] || "",
        profileUrl,
      });
    }

    if (platform === "youtube") {
      // YouTube 채널
      const searchUrl = `https://www.youtube.com/@${clean}`;
      const r = await fetch(searchUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "유튜브 채널을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
        return m?.[1] || "";
      };

      const ogTitle = getMeta("og:title") || getMeta("title");
      const ogDesc = getMeta("og:description") || getMeta("description");
      const ogImage = getMeta("og:image");

      // 구독자 수 추출 시도
      const subsMatch = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/);

      return res.json({
        platform: "youtube",
        username: clean,
        displayName: ogTitle?.replace(/ - YouTube$/, "") || clean,
        bio: ogDesc || "",
        profilePic: ogImage || "",
        subscribers: subsMatch?.[1] || "",
        channelUrl: searchUrl,
      });
    }

    if (platform === "tiktok") {
      const profileUrl = `https://www.tiktok.com/@${clean}`;
      const r = await fetch(profileUrl, {
        headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR" },
        signal: AbortSignal.timeout(10000), redirect: "follow",
      });
      if (!r.ok) return res.status(400).json({ error: "틱톡 프로필을 불러올 수 없습니다" });
      const html = await r.text();

      const getMeta = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
        return m?.[1] || "";
      };

      return res.json({
        platform: "tiktok",
        username: clean,
        displayName: getMeta("og:title")?.replace(/ \(@.*/, "").replace(/ \| TikTok/, "") || clean,
        bio: getMeta("og:description") || getMeta("description") || "",
        profilePic: getMeta("og:image") || "",
        profileUrl,
      });
    }

    return res.status(400).json({ error: "지원하지 않는 플랫폼" });
  } catch (e) {
    return res.status(500).json({ error: "데이터 수집 실패: " + e.message?.slice(0, 100) });
  }
}

export const config = { maxDuration: 20 };
