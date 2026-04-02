// api/tts.js — Gemini TTS API (텍스트 → WAV 음성)
// POST { text, voice }
// 응답: audio/wav 바이너리

// PCM raw 데이터에 WAV 헤더를 붙이는 함수
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);                          // ChunkID
  header.writeUInt32LE(36 + dataSize, 4);            // ChunkSize
  header.write("WAVE", 8);                           // Format
  header.write("fmt ", 12);                          // Subchunk1ID
  header.writeUInt32LE(16, 16);                      // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20);                       // AudioFormat (PCM=1)
  header.writeUInt16LE(numChannels, 22);             // NumChannels
  header.writeUInt32LE(sampleRate, 24);              // SampleRate
  header.writeUInt32LE(byteRate, 28);                // ByteRate
  header.writeUInt16LE(blockAlign, 32);              // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);           // BitsPerSample
  header.write("data", 36);                          // Subchunk2ID
  header.writeUInt32LE(dataSize, 40);                // Subchunk2Size

  return Buffer.concat([header, pcmBuffer]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { text, voice = "Kore" } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
    if (text.length > 5000) return res.status(400).json({ error: "text max 5000 chars" });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 필요합니다" });

    const ttsRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: { voice_name: voice },
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
    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      return res.status(500).json({ error: "음성 생성 실패: 오디오 데이터 없음" });
    }

    const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType || "";

    // Gemini는 audio/L16 (raw PCM) 포맷으로 반환 → WAV 헤더 필요
    // rate 파싱: "audio/L16;codec=pcm;rate=24000" → 24000
    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch) sampleRate = parseInt(rateMatch[1]);

    const wavBuffer = pcmToWav(pcmBuffer, sampleRate, 1, 16);

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", wavBuffer.byteLength);
    res.status(200).send(wavBuffer);
  } catch (e) {
    return res.status(500).json({ error: "TTS 처리 실패: " + (e.message || "").slice(0, 200) });
  }
}
