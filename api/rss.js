// api/rss.js — RSS 2.0 피드 (네이버/구글 뉴스 등 수집용)
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const SITE = "https://www.snsmakeit.com";

  let items = "";
  try {
    const sb = createClient(
      process.env.VITE_SUPABASE_URL || "https://ckzjnpzadeovrasucjmu.supabase.co",
      process.env.VITE_SUPABASE_ANON_KEY || ""
    );
    const { data: posts } = await sb.from("posts").select("id,title,body,subCat,nick,date,images").order("id", { ascending: false }).limit(50);

    if (posts) {
      items = posts.map(p => {
        const plainBody = (p.body || "").replace(/<[^>]*>/g, "").slice(0, 300);
        const cat = p.subCat || "info";
        const link = `${SITE}/community/${cat}/post-${p.id}`;
        const pubDate = p.date ? new Date(p.date).toUTCString() : new Date().toUTCString();
        const image = p.images?.[0] ? `<enclosure url="${p.images[0]}" type="image/jpeg"/>` : "";
        return `    <item>
      <title><![CDATA[${p.title || "제목 없음"}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${plainBody}]]></description>
      <author>${p.nick || "SNS메이킷"}</author>
      <pubDate>${pubDate}</pubDate>
      <category>${cat}</category>
      ${image}
    </item>`;
      }).join("\n");
    }
  } catch {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SNS메이킷 커뮤니티</title>
    <link>${SITE}/community</link>
    <description>SNS메이킷 커뮤니티 - 정보공유, 질문답변, 자료실</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/og-image.png</url>
      <title>SNS메이킷</title>
      <link>${SITE}</link>
    </image>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=1800");
  res.status(200).send(xml);
}
