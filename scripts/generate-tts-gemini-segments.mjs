/**
 * SNS메이킷 — Gemini TTS 세그먼트별 개별 생성 + 전체 병합
 * 각 세그먼트를 개별 호출하여 정확한 타이밍 확보
 * 전체를 이어붙여 끊김 없는 단일 WAV 생성
 *
 * 사용법: node scripts/generate-tts-gemini-segments.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "tts", "ko");

const GEMINI_KEY = "AIzaSyAPLOa_yi3-9t17p9GBgkyC9AnLfWKcWrY";
const VOICE = "Kore";

// 세그먼트 간 묵음 (0.6초)
const GAP_SEC = 0.6;

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
  const numChannels = 1, bitsPerSample = 16;
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

function makeSilence(seconds, sampleRate = 24000) {
  const samples = Math.round(seconds * sampleRate);
  return Buffer.alloc(samples * 2); // 16bit = 2 bytes per sample, filled with 0
}

async function generateSegmentTts(text) {
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
            voice_config: { prebuilt_voice_config: { voice_name: VOICE } },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("No audio data");
  const pcm = Buffer.from(part.inlineData.data, "base64");
  const mime = part.inlineData.mimeType || "";
  let sr = 24000;
  const m = mime.match(/rate=(\d+)/);
  if (m) sr = parseInt(m[1]);
  return { pcm, sampleRate: sr };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Gemini TTS 세그먼트별 생성 시작 (${VOICE})\n`);

  const segmentPcms = [];
  const durations = {};
  const SAMPLE_RATE = 24000;

  for (let i = 0; i < NARRATION.length; i++) {
    const seg = NARRATION[i];
    console.log(`[${i + 1}/${NARRATION.length}] ${seg.id}: "${seg.text.slice(0, 35)}..."`);

    try {
      const { pcm, sampleRate } = await generateSegmentTts(seg.text);
      const audioDur = pcm.length / (sampleRate * 2);
      console.log(`  → ${audioDur.toFixed(2)}s`);

      segmentPcms.push(pcm);
      durations[seg.id] = parseFloat(audioDur.toFixed(2));

      // API rate limit 방지
      if (i < NARRATION.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      // 빈 오디오로 대체
      const fallback = makeSilence(3, SAMPLE_RATE);
      segmentPcms.push(fallback);
      durations[seg.id] = 3;
    }
  }

  // ── 전체 WAV 병합 (세그먼트 사이에 GAP_SEC 묵음 삽입) ──
  const gap = makeSilence(GAP_SEC, SAMPLE_RATE);
  const allParts = [];
  const timestamps = {}; // 각 세그먼트의 전체 WAV 내 시작/끝 위치

  let cursor = 0;
  for (let i = 0; i < segmentPcms.length; i++) {
    const pcm = segmentPcms[i];
    const segDur = pcm.length / (SAMPLE_RATE * 2);
    const seg = NARRATION[i];

    timestamps[seg.id] = {
      start: parseFloat(cursor.toFixed(2)),
      end: parseFloat((cursor + segDur).toFixed(2)),
      dur: parseFloat(segDur.toFixed(2)),
    };

    allParts.push(pcm);
    cursor += segDur;

    // 마지막 세그먼트가 아니면 묵음 삽입
    if (i < segmentPcms.length - 1) {
      allParts.push(gap);
      cursor += GAP_SEC;
    }
  }

  const fullPcm = Buffer.concat(allParts);
  const fullWav = pcmToWav(fullPcm, SAMPLE_RATE);
  const fullPath = path.join(OUTPUT_DIR, "narration_full_ko.wav");
  fs.writeFileSync(fullPath, fullWav);

  const totalDur = fullPcm.length / (SAMPLE_RATE * 2);
  console.log(`\n전체 WAV: ${totalDur.toFixed(1)}s → ${fullPath}`);

  // ── 타임스탬프 저장 ──
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "gemini-durations.json"),
    JSON.stringify(durations, null, 2), "utf-8"
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "gemini-timestamps.json"),
    JSON.stringify(timestamps, null, 2), "utf-8"
  );

  // ── narration-data.js용 출력 ──
  console.log("\n// ── SEGMENT_AUDIO_DURATIONS ──");
  for (const [k, v] of Object.entries(timestamps)) {
    console.log(`  "${k}": ${v.dur},`);
  }

  const sceneMap = {
    s01: ["s01-01","s01-02"], s02: ["s02-01","s02-02"],
    s03: ["s03-01","s03-02","s03-03"], s04: ["s04-01","s04-02"],
    s05: ["s05-01","s05-02","s05-03"], s06: ["s06-01","s06-02"],
    s07: ["s07-01","s07-02","s07-03"], s08: ["s08-01","s08-02","s08-03"],
    s09: ["s09-01"], s10: ["s10-01","s10-02","s10-03"],
  };

  console.log("\n// ── SCENE_TIMINGS ──");
  for (const [sid, ids] of Object.entries(sceneMap)) {
    const frm = timestamps[ids[0]].start;
    const end = timestamps[ids[ids.length - 1]].end;
    const dur = parseFloat((end - frm).toFixed(1));
    console.log(`  { id: "${sid}", from: ${frm}, dur: ${dur} },`);
  }
  console.log(`\nTOTAL_DURATION = ${Math.ceil(totalDur) + 2}`);

  // ── buildNarration용 절대 타임스탬프 ──
  console.log("\n// ── Absolute timestamps (for buildNarration) ──");
  for (const [k, v] of Object.entries(timestamps)) {
    console.log(`  "${k}": { start: ${v.start}, end: ${v.end} },`);
  }

  console.log("\n완료!");
}

main();
