exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
    || process.env.VITE_API_KEY
    || "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";

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { topic, slideCount, systemPrompt } = body;
  if (!topic) return { statusCode: 400, body: JSON.stringify({ error: "topic required" }) };

  const sysPrompt = systemPrompt || `당신은 인스타그램 카드뉴스 전문 디자인 카피라이터입니다.
사용자가 입력한 주제로 인스타그램에 최적화된 카드뉴스 슬라이드 콘텐츠를 기획하고 작성합니다.
슬라이드 수: ${slideCount||6}장. 첫 장=강력한 훅, 중간=핵심정보(1장1메시지), 마지막=CTA
카피 원칙: 짧고 강하게, MZ감성, 저장 유도
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이.
{"topic":"주제명","slides":[{"index":1,"title":"제목(15자이내)","subtitle":"부제목(20자이내)","body":"본문","highlight":"핵심문구(10자이내)","bgStyle":"gradient-warm"}]}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system: sysPrompt,
        messages: [{ role: "user", content: "주제: " + topic + "\n슬라이드 수: " + (slideCount||6) + "장" }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("API error:", res.status, errText);
      return { statusCode: res.status, body: JSON.stringify({ error: "API 오류 " + res.status + ": " + errText }) };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch(err) {
    console.error("Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
