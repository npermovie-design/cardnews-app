/**
 * SNS메이킷 소개 영상 TTS — Gemini TTS (Charon 음성)
 * "이게경제냐" 프로젝트와 동일한 목소리
 *
 * 사용법: node scripts/generate-tts-gemini.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const GEMINI_KEY = "AIzaSyAPLOa_yi3-9t17p9GBgkyC9AnLfWKcWrY";
const VOICE = "Kore";        // 밝고 경쾌한 여성 목소리
const SEG_PAUSE = "\n...\n";  // 짧은 쉼 (끊김 방지)

const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "tts", "ko");

// 나레이션 세그먼트
const NARRATION = [
  { id: "s01-01", text: "SNS 콘텐츠 만들 때마다 뭐 올려야 할지 막막했던 적 있으시죠." },
  { id: "s01-02", text: "릴스 하나 만들려고 제목 고민하고, 문구 고민하고, 자막 넣고, 썸네일까지 만들다 보면 어느새 한두 시간이 훌쩍 지나가곤 합니다." },
  { id: "s02-01", text: "그런데 이제는 그런 시간을 훨씬 줄일 수 있는 방법이 있습니다." },
  { id: "s02-02", text: "바로 SNS메이킷입니다." },
  { id: "s03-01", text: "SNS메이킷은 콘텐츠 제작에 필요한 모든 과정을 한곳에 모아둔 플랫폼입니다." },
  { id: "s03-02", text: "처음 사이트에 들어오면 가장 먼저 보이는 건, 많은 분들이 실제로 겪는 고민입니다." },
  { id: "s03-03", text: "무슨 콘텐츠를 만들어야 할지 모르겠고, 시간이 너무 오래 걸리고, 결과는 기대만큼 나오지 않는 문제들이죠." },
  { id: "s04-01", text: "이 사이트는 바로 그 고민을 해결하는 구조로 만들어져 있습니다." },
  { id: "s04-02", text: "처음부터 성장까지 이어지는 흐름으로, 초보자도 쉽게 따라갈 수 있도록 설계되어 있습니다." },
  { id: "s05-01", text: "예를 들어 콘텐츠를 만들 때 가장 어려운 부분은 아이디어입니다." },
  { id: "s05-02", text: "무슨 주제로 올려야 사람들이 반응할지 고민하게 되는데, 여기서는 AI 도구와 실전 자료를 통해 그 부분을 빠르게 해결할 수 있습니다." },
  { id: "s05-03", text: "릴스 문구, 광고 카피, 블로그 제목, 유튜브 아이디어처럼 바로 활용할 수 있는 예시들이 정리되어 있어서, 처음 시작하는 분들도 훨씬 쉽게 접근할 수 있습니다." },
  { id: "s06-01", text: "특히 제작 시간을 크게 줄여준다는 점이 가장 큰 장점입니다." },
  { id: "s06-02", text: "기존에는 하나의 콘텐츠를 만드는 데 두 시간 이상 걸렸다면, 이제는 필요한 자료와 구조가 이미 정리되어 있어서 훨씬 빠르게 작업할 수 있습니다." },
  { id: "s07-01", text: "그리고 단순히 메인 기능만 있는 것이 아니라, 커뮤니티 구조도 굉장히 잘 되어 있습니다." },
  { id: "s07-02", text: "정보공유 게시판에서는 최신 AI 툴 정보, 유튜브 성장 팁, SNS 마케팅 자료, 실전 프롬프트 같은 정보들을 빠르게 확인할 수 있습니다." },
  { id: "s07-03", text: "혼자서 하나하나 검색해서 찾기 어려운 자료들을 커뮤니티 안에서 바로 확인할 수 있다는 점이 정말 큰 장점입니다." },
  { id: "s08-01", text: "또 자료실도 굉장히 실용적으로 구성되어 있습니다." },
  { id: "s08-02", text: "프리미어 프로 자동 자막 프로그램, 디자인 템플릿, 영상 효과 자료처럼 실제로 바로 다운로드해서 사용할 수 있는 자료들이 정리되어 있습니다." },
  { id: "s08-03", text: "그래서 단순히 정보를 보는 사이트가 아니라, 바로 실행할 수 있는 실전형 플랫폼이라는 느낌이 강합니다." },
  { id: "s09-01", text: "콘텐츠를 처음 시작하는 분들부터 이미 운영 중인 분들까지 모두 활용하기 좋은 구조로 만들어져 있어서, 시간을 줄이고 성과를 높이고 싶은 분들에게 특히 도움이 될 수 있습니다." },
  { id: "s10-01", text: "결국 중요한 건 더 빠르게 만들고, 더 꾸준히 올리는 것입니다." },
  { id: "s10-02", text: "SNS메이킷은 그 과정을 훨씬 쉽게 만들어주는 플랫폼이라고 볼 수 있습니다." },
  { id: "s10-03", text: "콘텐츠 제작이 어렵게 느껴졌다면, 이제는 더 빠르고 쉽게 시작해보시면 좋겠습니다." },
];

function pcmToWav(pcmBuffer, sampleRate = 24000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function splitPcm(pcm, splitPoints) {
  const chunks = [];
  let prevByte = 0;
  for (const sp of splitPoints) {
    const bytePos = sp * 2;
    chunks.push(pcm.subarray(prevByte, bytePos));
    prevByte = bytePos;
  }
  chunks.push(pcm.subarray(prevByte));
  return chunks;
}

async function generateFullTts(text) {
  console.log(`\nGemini TTS 생성 중... (${text.length}자, 음성: ${VOICE})\n`);

  const res = await fetch(
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
              prebuilt_voice_config: { voice_name: VOICE },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`TTS API 에러 ${res.status}: ${err.slice(0, 500)}`);
    return null;
  }

  const data = await res.json();
  const audioPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!audioPart?.inlineData?.data) {
    console.error("오디오 데이터 없음");
    return null;
  }

  const pcm = Buffer.from(audioPart.inlineData.data, "base64");
  const mime = audioPart.inlineData.mimeType || "";
  let sampleRate = 24000;
  const m = mime.match(/rate=(\d+)/);
  if (m) sampleRate = parseInt(m[1]);

  console.log(`전체 PCM: ${(pcm.length / (sampleRate * 2)).toFixed(1)}초 (${sampleRate}Hz)`);
  return { pcm, sampleRate };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 전체 나레이션을 구분자로 연결
  const narrations = NARRATION.map((n) => n.text);
  const fullText = narrations.join(SEG_PAUSE);

  const result = await generateFullTts(fullText);
  if (!result) {
    console.error("TTS 생성 실패");
    process.exit(1);
  }

  const { pcm, sampleRate } = result;
  const totalSamples = pcm.length / 2;

  // ── 전체 나레이션 WAV 저장 (끊김 없는 단일 트랙) ──
  const fullWav = pcmToWav(pcm, sampleRate);
  const fullWavPath = path.join(OUTPUT_DIR, "narration_full_ko.wav");
  fs.writeFileSync(fullWavPath, fullWav);
  const fullDur = pcm.length / (sampleRate * 2);
  console.log(`\n전체 WAV 저장: ${fullDur.toFixed(1)}초 → ${fullWavPath}\n`);

  // 글자수 비율로 분할점 계산 + 묵음 스냅
  const totalChars = narrations.reduce((s, n) => s + n.length, 0);
  const splitPoints = [];
  let cumChars = 0;

  for (let i = 0; i < narrations.length - 1; i++) {
    cumChars += narrations[i].length;
    const pauseChars = SEG_PAUSE.length;
    const effectiveTotal = totalChars + pauseChars * (narrations.length - 1);
    const effectiveCum = cumChars + pauseChars * (i + 1);
    const samplePos = Math.floor(totalSamples * (effectiveCum / effectiveTotal));

    // 묵음 근처로 스냅 (±0.5초)
    const searchRange = Math.floor(sampleRate * 0.5);
    let bestPos = samplePos;
    let bestQuiet = Infinity;
    for (let j = Math.max(0, samplePos - searchRange); j < Math.min(totalSamples, samplePos + searchRange); j++) {
      let sum = 0;
      const window = 200;
      for (let k = Math.max(0, j - window); k < Math.min(totalSamples, j + window); k++) {
        sum += Math.abs(pcm.readInt16LE(k * 2));
      }
      const avg = sum / (window * 2);
      if (avg < bestQuiet) {
        bestQuiet = avg;
        bestPos = j;
      }
    }
    splitPoints.push(bestPos);
  }

  const pcmChunks = splitPcm(pcm, splitPoints);
  console.log(`\n${pcmChunks.length}개 세그먼트로 분할 완료\n`);

  // 기존 edge-tts 파일 백업 & 새 파일 저장
  const durations = {};

  for (let i = 0; i < pcmChunks.length; i++) {
    const chunk = pcmChunks[i];
    const seg = NARRATION[i];
    if (!seg) continue;

    const wav = pcmToWav(chunk, sampleRate);

    // WAV로 저장 (Remotion은 wav 지원)
    const wavPath = path.join(OUTPUT_DIR, `${seg.id}_ko.wav`);
    fs.writeFileSync(wavPath, wav);

    // mp3도 유지 (기존 호환)
    const mp3Path = path.join(OUTPUT_DIR, `${seg.id}_ko.mp3`);
    // mp3 변환은 ffmpeg 필요하므로 wav 우선 사용

    const audioDur = chunk.length / (sampleRate * 2);
    durations[seg.id] = parseFloat(audioDur.toFixed(2));

    console.log(`[${i + 1}/${pcmChunks.length}] ${seg.id} → ${audioDur.toFixed(1)}초  "${seg.text.slice(0, 30)}..."`);
  }

  // 듀레이션 정보 저장
  const metaPath = path.join(OUTPUT_DIR, "gemini-durations.json");
  fs.writeFileSync(metaPath, JSON.stringify(durations, null, 2), "utf-8");

  console.log(`\n완료! Gemini Charon 음성 ${pcmChunks.length}개 생성`);
  console.log(`출력: ${OUTPUT_DIR}`);
  console.log(`듀레이션: ${metaPath}`);
  console.log(`\n※ InfographicVideo.jsx에서 .mp3 → .wav로 확장자 변경 필요`);
}

main();
