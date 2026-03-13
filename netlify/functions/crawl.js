exports.handler = async function(event) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  try {
    var body = JSON.parse(event.body || "{}");
    var url = body.url;
    if (!url) { return { statusCode: 400, headers, body: JSON.stringify({error:"URL이 없어요"}) }; }

    var res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9"
      },
      redirect: "follow"
    });

    var html = await res.text();

    // Remove scripts, styles, nav, footer
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    html = html.replace(/<header[\s\S]*?<\/header>/gi, "");

    // Extract text
    var text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // Limit to 3000 chars
    if (text.length > 3000) { text = text.substring(0, 3000) + "..."; }

    return { statusCode: 200, headers, body: JSON.stringify({text}) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({error: e.message}) };
  }
};
