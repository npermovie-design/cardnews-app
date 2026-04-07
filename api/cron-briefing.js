// api/cron-briefing.js — 매일 뉴스레터 발송 (Vercel Cron)
// 스케줄: 매일 22:00 UTC (한국시간 07:00)
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Vercel Cron 인증
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    // CRON_SECRET이 없으면 누구나 호출 가능 (테스트용)
    if (process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || "https://ckzjnpzadeovrasucjmu.supabase.co",
    process.env.SUPABASE_SERVICE_KEY || ""
  );

  try {
    // 1. 구독자 목록 가져오기
    const { data: subscribers, error: subError } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .order("subscribed_at", { ascending: false });

    if (subError) throw subError;
    if (!subscribers || subscribers.length === 0) {
      return res.status(200).json({ message: "구독자 없음", count: 0 });
    }

    // 2. 오늘의 SNS 뉴스 생성 (Gemini)
    const apiKey = process.env.GEMINI_API_KEY;
    let newsContent = "";

    if (apiKey) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const prompt = `오늘(${today}) SNS 마케팅 관련 최신 뉴스와 트렌드를 5개 정리해줘.
각 항목은:
- 제목 (한 줄)
- 요약 (2~3줄)
- 마케터에게 주는 팁 (한 줄)

형식: HTML (이메일용, 인라인 스타일). 깔끔하고 모던한 디자인.
전체를 <div> 태그로 감싸고, 각 뉴스를 카드 형태로.
색상: 메인 #7c6aff, 텍스트 #1a1a1a, 서브 #888.
한국어로 작성.`;

        const gemRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4000 },
            }),
          }
        );
        const gemData = await gemRes.json();
        newsContent = gemData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // HTML 코드블록 제거
        newsContent = newsContent.replace(/```html?\n?/g, "").replace(/```/g, "").trim();
      } catch (e) {
        console.error("Gemini news generation error:", e);
        newsContent = `<div style="padding:20px;"><h2>오늘의 SNS 마케팅 브리핑</h2><p>뉴스 생성 중 오류가 발생했습니다. 내일 다시 시도합니다.</p></div>`;
      }
    }

    // 3. 이메일 발송 (Supabase Edge Function 또는 직접 SMTP)
    // 현재는 뉴스 콘텐츠를 Supabase에 저장 (나중에 이메일 발송 연동)
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("newsletter_logs").upsert({
      date: today,
      content: newsContent,
      subscriber_count: subscribers.length,
      sent_at: new Date().toISOString(),
    }, { onConflict: "date" });

    // 4. Gemini로 생성된 뉴스를 SnsNews 테이블에도 저장 (사이트에서 표시용)
    // (선택사항 - 이미 SnsNewsFeed가 별도로 동작할 수 있음)

    return res.status(200).json({
      message: "뉴스레터 생성 완료",
      date: today,
      subscribers: subscribers.length,
      contentLength: newsContent.length,
    });
  } catch (e) {
    console.error("Cron briefing error:", e);
    return res.status(500).json({ error: e.message });
  }
}
