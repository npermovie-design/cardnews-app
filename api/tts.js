// api/tts.js — Gemini TTS API (텍스트 → 고품질 음성 WAV)
// POST { text, voice, speed }
// 응답: audio/wav 바이너리

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { text, voice = "Kore", speed = 1.0 } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
    if (text.length > 5000) return res.status(400).json({ error: "text max 5000 chars" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 필요합니다" });

    // Gemini TTS 모델로 음성 생성
    const ttsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: text }],
          }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: voice,
                },
              },
            },
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(ttsRes.status).json({ error: `Gemini TTS 실패: ${errText.slice(0, 300)}` });
    }

    const data = await ttsRes.json();

    // Gemini 응답에서 오디오 데이터 추출
    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      return res.status(500).json({ error: "음성 생성 실패: 오디오 데이터 없음" });
    }

    const audioBuffer = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType || "audio/wav";

    // WAV를 그대로 전송 (브라우저에서 재생 가능)
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", audioBuffer.byteLength);
    res.status(200).send(audioBuffer);
  } catch (e) {
    return res.status(500).json({ error: "TTS 처리 실패: " + (e.message || "").slice(0, 200) });
  }
}
