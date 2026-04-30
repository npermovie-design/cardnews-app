import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";

const API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// ── 유튜브 URL 파싱 ──
function parseYoutubeUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return { id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  }
  return null;
}

// ── 자막 애니메이션 프리셋 ──
const CAPTION_ANIMATIONS = [
  { id: "none", name: "없음", desc: "정적 자막" },
  { id: "fade", name: "페이드", desc: "부드러운 등장/퇴장" },
  { id: "typewriter", name: "타이핑", desc: "한 글자씩 타이핑" },
  { id: "highlight", name: "하이라이트", desc: "단어별 강조 효과" },
  { id: "bounce", name: "바운스", desc: "통통 튀는 등장" },
  { id: "slide", name: "슬라이드", desc: "아래에서 올라옴" },
  { id: "karaoke", name: "가라오케", desc: "발음에 맞춰 색상 변경" },
  { id: "glow", name: "글로우", desc: "빛나는 텍스트 효과" },
  { id: "pop", name: "팝", desc: "톡 튀어나오는 효과" },
  { id: "wave", name: "웨이브", desc: "글자가 물결처럼" },
  { id: "shake", name: "쉐이크", desc: "흔들림 강조" },
  { id: "blur_in", name: "블러 인", desc: "흐림에서 선명하게" },
  { id: "color_cycle", name: "컬러 사이클", desc: "색상이 변하는 효과" },
];

// ── 반복 단어 감지 ──
function detectRepeatedPhrases(subtitles, threshold = 2) {
  if (!subtitles || subtitles.length < 3) return [];
  const results = [];
  for (let i = 1; i < subtitles.length; i++) {
    const prev = (subtitles[i - 1].text || "").trim().toLowerCase();
    const curr = (subtitles[i].text || "").trim().toLowerCase();
    if (!prev || !curr) continue;
    // 연속 동일 텍스트
    if (prev === curr) {
      results.push({ type: "exact", indices: [i - 1, i], text: curr });
      continue;
    }
    // 말더듬 감지 (앞 1~3글자 반복)
    const words = curr.split(/\s+/);
    if (words.length >= 2) {
      const first = words[0];
      let stutter = 0;
      for (let w = 1; w < words.length && w < 4; w++) {
        if (words[w] === first) stutter++;
      }
      if (stutter >= threshold - 1) {
        results.push({ type: "stutter", indices: [i], text: curr, word: first });
      }
    }
    // 이전 자막의 마지막 단어가 현재 자막의 첫 단어와 같으면 (말 겹침)
    const prevWords = prev.split(/\s+/);
    if (prevWords.length > 0 && words.length > 0 && prevWords[prevWords.length - 1] === words[0]) {
      results.push({ type: "overlap", indices: [i - 1, i], text: words[0] });
    }
  }
  return results;
}

// ── 시간 포맷 ──
const fmt = s => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };
const fmtLong = s => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`; };

// ── 서버 응답에서 영상 전체를 커버하는 자막 추출 ──
function extractFullSubtitles(sttResult, videoDuration) {
  const dur = videoDuration || 60;
  let subs = [];
  const segments = (sttResult.segments || []).slice().sort((a, b) => (a.start_seconds || 0) - (b.start_seconds || 0));

  // 1) all_subs 또는 full_transcript (서버가 전체 자막을 반환하는 경우)
  const fullSubs = sttResult.all_subs || sttResult.full_transcript;
  if (fullSubs && Array.isArray(fullSubs) && fullSubs.length > 0) {
    subs = [...fullSubs];
  }

  // 2) 모든 세그먼트에서 subtitles + script 수집
  if (subs.length === 0) {
    for (const seg of segments) {
      if (seg.subtitles && seg.subtitles.length > 0) {
        subs.push(...seg.subtitles);
      } else if (seg.script) {
        const segStart = seg.start_seconds || 0;
        const segEnd = seg.end_seconds || dur;
        const chunks = seg.script.match(/.{1,18}/g) || [];
        const chunkDur = (segEnd - segStart) / Math.max(1, chunks.length);
        chunks.forEach((text, i) => {
          subs.push({ start: Math.round((segStart + i * chunkDur) * 100) / 100, end: Math.round((segStart + (i + 1) * chunkDur) * 100) / 100, text: text.trim() });
        });
      }
    }
  }

  // 정렬 + 중복 제거
  subs.sort((a, b) => a.start - b.start);
  subs = subs.filter((s, i) => i === 0 || Math.abs(s.start - subs[i - 1].start) > 0.5);

  // 3) 빈 구간(gap) 찾기
  const gaps = [];
  if (subs.length === 0) {
    gaps.push({ from: 0, to: dur });
  } else {
    if (subs[0].start > 3) gaps.push({ from: 0, to: subs[0].start });
    for (let i = 0; i < subs.length - 1; i++) {
      const gapStart = subs[i].end || subs[i].start + 3;
      const gapEnd = subs[i + 1].start;
      if (gapEnd - gapStart > 3) gaps.push({ from: gapStart, to: gapEnd });
    }
    const lastEnd = subs[subs.length - 1].end || subs[subs.length - 1].start + 3;
    if (dur - lastEnd > 3) gaps.push({ from: lastEnd, to: dur });
  }

  // 4) gap 메꾸기 — segment script로 시도, 없으면 전체 script에서 비율 분배
  if (gaps.length > 0) {
    // 전체 script 합치기 (최종 fallback용)
    const fullScript = segments.map(s => s.script || "").join(" ").trim();
    const totalSegTime = segments.reduce((acc, s) => acc + ((s.end_seconds || dur) - (s.start_seconds || 0)), 0) || dur;

    for (const gap of gaps) {
      const gapDur = gap.to - gap.from;
      if (gapDur < 2) continue;

      // 먼저 이 gap과 겹치는 segment의 script 찾기
      let filled = false;
      for (const seg of segments) {
        const ss = seg.start_seconds || 0;
        const se = seg.end_seconds || dur;
        if (se > gap.from && ss < gap.to && seg.script) {
          const overlapStart = Math.max(gap.from, ss);
          const overlapEnd = Math.min(gap.to, se);
          if (overlapEnd - overlapStart < 2) continue;
          const segDur = se - ss;
          const ratio = segDur > 0 ? (overlapEnd - overlapStart) / segDur : 1;
          const scriptLen = Math.ceil(seg.script.length * ratio);
          const scriptOff = Math.floor(seg.script.length * ((overlapStart - ss) / Math.max(1, segDur)));
          const partial = seg.script.substring(scriptOff, scriptOff + scriptLen).trim();
          if (!partial) continue;
          const chunks = partial.match(/.{1,18}/g) || [];
          const cd = (overlapEnd - overlapStart) / Math.max(1, chunks.length);
          chunks.forEach((text, i) => {
            const st = Math.round((overlapStart + i * cd) * 100) / 100;
            if (!subs.some(s => Math.abs(s.start - st) < 1.5)) {
              subs.push({ start: st, end: Math.round((overlapStart + (i + 1) * cd) * 100) / 100, text: text.trim() });
            }
          });
          filled = true;
        }
      }

      // segment가 없는 gap → 전체 script에서 시간 비율로 추출
      if (!filled && fullScript.length > 10) {
        const ratio = gapDur / dur;
        const charCount = Math.max(10, Math.round(fullScript.length * ratio));
        const offset = Math.round(fullScript.length * (gap.from / dur));
        const partial = fullScript.substring(offset, offset + charCount).trim();
        if (partial.length > 3) {
          const chunks = partial.match(/.{1,18}/g) || [];
          const cd = gapDur / Math.max(1, chunks.length);
          chunks.forEach((text, i) => {
            const st = Math.round((gap.from + i * cd) * 100) / 100;
            if (!subs.some(s => Math.abs(s.start - st) < 1.5)) {
              subs.push({ start: st, end: Math.round((gap.from + (i + 1) * cd) * 100) / 100, text: text.trim() });
            }
          });
        }
      }
    }

    subs.sort((a, b) => a.start - b.start);
  }

  console.log(`[LongFormEditor] 자막 ${subs.length}개 (영상 ${dur.toFixed(0)}s)`);
  return subs;
}

export default function LongFormEditor({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const acc = "#7c6aff";

  // ── 상태 ──
  const [step, setStep] = useState("upload"); // upload | loading | edit | generate | result
  const [inputMode, setInputMode] = useState("file");
  const [ytUrl, setYtUrl] = useState("");
  const [ytParsed, setYtParsed] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [downloadHelper, setDownloadHelper] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  useGeneratingGuard(step === "loading", 10, "longform_make");

  // 편집
  const [videoSegs, setVideoSegs] = useState([]); // [{start, end, muted}]
  const [selectedSegIdx, setSelectedSegIdx] = useState(-1);
  const [subtitles, setSubtitles] = useState([]); // [{start, end, text, words:[{word,start,end}]}]
  const [selectedSubIdx, setSelectedSubIdx] = useState(-1);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [captionAnimation, setCaptionAnimation] = useState("highlight");
  const [captionStyle, setCaptionStyle] = useState({
    color: "#FFFFFF", fontSize: 18, shadow: true, border: false, borderColor: "#000",
    bgBox: true, bgColor: "rgba(0,0,0,0.7)", opacity: 100, font: "default", align: "center",
    highlightColor: "#FFD700", position: "bottom", // bottom | center | top
  });

  // 번역 자막 (이중 자막)
  const [dualSubEnabled, setDualSubEnabled] = useState(false);
  const [dualSubLang, setDualSubLang] = useState("en");
  const [dualSubs, setDualSubs] = useState([]);
  const [translating, setTranslating] = useState(false);
  const SUB_LANGS = [["ko","한국어"],["en","English"],["ja","日本語"],["zh","中文"],["es","Español"],["vi","Tiếng Việt"],["th","ไทย"],["id","Bahasa"]];

  const translateSubtitles = async (targetLang) => {
    if (subtitles.length === 0) return;
    setTranslating(true);
    try {
      const texts = subtitles.map(s => s.text).join("\n---\n");
      const langName = SUB_LANGS.find(l => l[0] === targetLang)?.[1] || targetLang;
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          messages: [{ role: "user", content: `Translate the following subtitles to ${langName}. Keep the same format, separated by ---. Only output the translations, nothing else.\n\n${texts}` }],
          max_tokens: 4000,
        }),
      });
      const data = await res.json();
      const translated = (data.content?.[0]?.text || data.text || "").split(/\n---\n/);
      setDualSubs(subtitles.map((s, i) => ({ start: s.start, end: s.end, text: (translated[i] || "").trim() })));
      setDualSubEnabled(true);
      setDualSubLang(targetLang);
    } catch (e) { console.error("Translation failed:", e); }
    setTranslating(false);
  };

  // 무음 감지/제거
  const [silenceThreshold, setSilenceThreshold] = useState(-40); // dB (더 보수적)
  const [silenceMinDuration, setSilenceMinDuration] = useState(0.8); // 초 (짧은 쉼은 유지)
  const [silenceGap, setSilenceGap] = useState(0.25); // 무음 제거 후 남길 간격 (자연스러운 전환)
  const [silenceRegions, setSilenceRegions] = useState([]); // [{start, end}]
  const [silenceRemoved, setSilenceRemoved] = useState(false);
  const [waveformData, setWaveformData] = useState(null); // Float32Array (다운샘플된 파형)

  // 반복 단어
  const [repeatedPhrases, setRepeatedPhrases] = useState([]);
  const [showRepeated, setShowRepeated] = useState(false);

  // AI 자동 미디어 삽입
  const [autoMediaLoading, setAutoMediaLoading] = useState(false);

  const autoInsertMedia = async () => {
    if (subtitles.length === 0) return;
    setAutoMediaLoading(true);
    try {
      const subTexts = subtitles.slice(0, 60).map((s, i) => `[${i}] ${s.text}`).join("\n");
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          messages: [{ role: "user", content: `다음 자막에서 시각적으로 보여주면 효과적인 구간 5~8개를 골라주세요.
각 구간에 어울리는 영어 검색 키워드 1~2개를 추출해주세요.
반응/감정 표현이면 GIF, 풍경/장소/물체면 video를 추천하세요.

자막:
${subTexts}

JSON 배열로만 응답 (다른 텍스트 없이):
[{"idx":0,"keyword":"term","type":"gif"}]` }],
          max_tokens: 600,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || data.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { setAutoMediaLoading(false); return; }
      const picks = JSON.parse(jsonMatch[0]);

      const newOverlays = [];
      for (const pick of picks.slice(0, 8)) {
        const sub = subtitles[pick.idx];
        if (!sub) continue;
        const q = encodeURIComponent(pick.keyword);
        let mediaUrl = null;

        if (pick.type === "gif") {
          try {
            const r = await fetch(`/api/proxy?action=klipy&path=gifs/search&q=${q}&limit=5`).then(r => r.json());
            const gifs = r.data || r.results || [];
            const g = gifs[Math.floor(Math.random() * Math.min(3, gifs.length))];
            if (g) mediaUrl = g.images?.fixed_width?.url || g.images?.original?.url || g.url || g.media_url;
          } catch {}
        }
        if (!mediaUrl) {
          try {
            const r = await fetch(`/api/proxy?action=pixabay&q=${q}&per_page=5&image_type=photo`).then(r => r.json());
            if (r.hits?.[0]) mediaUrl = r.hits[0].webformatURL;
          } catch {}
        }
        if (mediaUrl) {
          newOverlays.push({
            id: "auto_" + Date.now() + "_" + pick.idx,
            type: "image", src: mediaUrl,
            x: 50, y: 40, w: 30, h: 30,
            start: sub.start, end: sub.end || sub.start + 3,
          });
        }
      }
      if (newOverlays.length > 0) {
        pushUndo();
        setOverlays(prev => [...prev, ...newOverlays]);
      }
    } catch (e) { console.error("Auto media failed:", e); }
    setAutoMediaLoading(false);
  };

  // 타임라인
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [volume, setVolume] = useState(100);

  // 오버레이
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlay, setSelectedOverlay] = useState(null);

  // 패널 크기
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220);

  // 비디오 전체 길이
  const [videoDuration, setVideoDuration] = useState(0);

  // 생성
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  // 속성 패널 탭
  const [propTab, setPropTab] = useState("silence"); // silence | caption | style | overlay
  const [editingSubOnCanvas, setEditingSubOnCanvas] = useState(false);
  // 소스 탭 - 무료 소스 검색 상태
  const [srcSearchQuery, setSrcSearchQuery] = useState("");
  const [srcSearchItems, setSrcSearchItems] = useState([]);
  const [srcSearchLoading, setSrcSearchLoading] = useState(false);
  const [srcSearchCat, setSrcSearchCat] = useState("photo");
  const overlayFileRef = useRef(null);

  // Undo/Redo
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const pushUndo = () => {
    undoStack.current.push(JSON.stringify({ videoSegs, subtitles, overlays }));
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  };
  const doUndo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(JSON.stringify({ videoSegs, subtitles, overlays }));
    const prev = JSON.parse(undoStack.current.pop());
    setVideoSegs(prev.videoSegs); setSubtitles(prev.subtitles); setOverlays(prev.overlays);
  };
  const doRedo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(JSON.stringify({ videoSegs, subtitles, overlays }));
    const next = JSON.parse(redoStack.current.pop());
    setVideoSegs(next.videoSegs); setSubtitles(next.subtitles); setOverlays(next.overlays);
  };

  // Refs
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const pollRef = useRef(null);

  // ── 폴링 인터벌 정리 (언마운트 시) ──
  useEffect(() => {
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []);

  // ── 세그먼트 총 재생 길이 ──
  const totalSegsDuration = useMemo(() => videoSegs.reduce((a, s) => a + (s.end - s.start), 0), [videoSegs]);
  const clipDuration = totalSegsDuration || videoDuration || 1;

  // ── YouTube URL 파싱 ──
  useEffect(() => { setYtParsed(parseYoutubeUrl(ytUrl)); }, [ytUrl]);

  // ── 상태 변경 알림 ──
  useEffect(() => { if (onStatusChange) onStatusChange(step); }, [step]);

  // ── 타이머 ──
  useEffect(() => {
    if (step === "loading") {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // ── playhead → 절대 시간 변환 ──
  const playheadToAbsolute = useCallback((ph) => {
    let accum = 0;
    for (const seg of videoSegs) {
      const segLen = seg.end - seg.start;
      if (ph < accum + segLen) return seg.start + (ph - accum);
      accum += segLen;
    }
    return videoSegs.length > 0 ? videoSegs[videoSegs.length - 1].end : ph;
  }, [videoSegs]);

  // ── 절대 시간 → playhead 변환 ──
  const absoluteToPlayhead = useCallback((abs) => {
    let accum = 0;
    for (const seg of videoSegs) {
      if (abs >= seg.start && abs <= seg.end) return accum + (abs - seg.start);
      accum += (seg.end - seg.start);
    }
    return accum;
  }, [videoSegs]);

  // ── 비디오 seek ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit" || isPlaying) return;
    const target = playheadToAbsolute(playhead);
    if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target;
  }, [playhead, step, videoSegs, isPlaying]);

  // ── play/pause ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit") return;
    if (isPlaying) { v.currentTime = playheadToAbsolute(playhead); v.play().catch(() => {}); }
    else v.pause();
  }, [isPlaying, step]);

  // ── 재생 중 playhead 업데이트 ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isPlaying) return;
    let raf;
    const tick = () => {
      if (!isPlaying) return;
      const curTime = v.currentTime;
      let accum = 0, found = false;
      for (let i = 0; i < videoSegs.length; i++) {
        const seg = videoSegs[i];
        if (curTime >= seg.start - 0.05 && curTime <= seg.end + 0.15) {
          setPlayhead(Math.max(0, accum + Math.min(curTime - seg.start, seg.end - seg.start)));
          found = true; break;
        }
        accum += (seg.end - seg.start);
      }
      if (!found) {
        let jumped = false;
        for (let i = 0; i < videoSegs.length; i++) {
          if (curTime < videoSegs[i].start) { v.currentTime = videoSegs[i].start; jumped = true; break; }
        }
        if (!jumped) { setIsPlaying(false); setPlayhead(clipDuration); return; }
      }
      if (v.ended) { setIsPlaying(false); setPlayhead(clipDuration); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isPlaying, videoSegs, clipDuration]);

  // ── 볼륨 동기화 (200%까지 부스트 — Web Audio GainNode) ──
  const gainNodeRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (volume <= 100) {
      v.volume = volume / 100;
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
    } else {
      v.volume = 1;
      if (!audioCtxRef.current) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const source = ctx.createMediaElementSource(v);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          audioCtxRef.current = ctx;
          gainNodeRef.current = gain;
        } catch (e) { console.warn("AudioContext failed:", e); }
      }
      if (gainNodeRef.current) gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // ── Web Audio API 파형 분석 ──
  const analyzeAudio = useCallback(async (file) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const raw = audioBuf.getChannelData(0);
      const sampleRate = audioBuf.sampleRate;
      const duration = audioBuf.duration;

      // 다운샘플링 (1px당 약 0.01초 = 100 samples/sec)
      const targetRate = 100;
      const step = Math.floor(sampleRate / targetRate);
      const downsampled = new Float32Array(Math.ceil(raw.length / step));
      for (let i = 0; i < downsampled.length; i++) {
        let sum = 0, count = 0;
        for (let j = i * step; j < Math.min((i + 1) * step, raw.length); j++) {
          sum += Math.abs(raw[j]); count++;
        }
        downsampled[i] = count > 0 ? sum / count : 0;
      }
      setWaveformData(downsampled);

      // 무음 구간 감지
      const silenceDb = silenceThreshold;
      const minDur = silenceMinDuration;
      const silences = [];
      let silStart = -1;
      const windowSize = Math.floor(targetRate * 0.05); // 50ms 윈도우

      for (let i = 0; i < downsampled.length; i++) {
        // RMS over window
        let rms = 0;
        for (let j = Math.max(0, i - windowSize); j <= Math.min(downsampled.length - 1, i + windowSize); j++) {
          rms += downsampled[j] * downsampled[j];
        }
        rms = Math.sqrt(rms / (windowSize * 2 + 1));
        const db = rms > 0 ? 20 * Math.log10(rms) : -100;

        if (db < silenceDb) {
          if (silStart < 0) silStart = i / targetRate;
        } else {
          if (silStart >= 0) {
            const silEnd = i / targetRate;
            if (silEnd - silStart >= minDur) {
              silences.push({ start: Math.round(silStart * 100) / 100, end: Math.round(silEnd * 100) / 100 });
            }
            silStart = -1;
          }
        }
      }
      if (silStart >= 0 && duration - silStart >= minDur) {
        silences.push({ start: Math.round(silStart * 100) / 100, end: Math.round(duration * 100) / 100 });
      }

      setSilenceRegions(silences);
      setVideoDuration(duration);
      ctx.close();
      return { duration, silences, waveform: downsampled };
    } catch (e) {
      console.error("Audio analysis failed:", e);
      return null;
    }
  }, []);

  // ── 슬라이더 변경 시 무음 구간 실시간 재계산 (파형 데이터 기반) ──
  useEffect(() => {
    if (!waveformData || waveformData.length === 0 || videoDuration === 0) return;
    const targetRate = 100;
    const windowSize = Math.floor(targetRate * 0.05);
    const silences = [];
    let silStart = -1;
    for (let i = 0; i < waveformData.length; i++) {
      let rms = 0;
      for (let j = Math.max(0, i - windowSize); j <= Math.min(waveformData.length - 1, i + windowSize); j++) {
        rms += waveformData[j] * waveformData[j];
      }
      rms = Math.sqrt(rms / (windowSize * 2 + 1));
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      if (db < silenceThreshold) {
        if (silStart < 0) silStart = i / targetRate;
      } else {
        if (silStart >= 0) {
          const silEnd = i / targetRate;
          if (silEnd - silStart >= silenceMinDuration) {
            silences.push({ start: Math.round(silStart * 100) / 100, end: Math.round(silEnd * 100) / 100 });
          }
          silStart = -1;
        }
      }
    }
    if (silStart >= 0 && videoDuration - silStart >= silenceMinDuration) {
      silences.push({ start: Math.round(silStart * 100) / 100, end: Math.round(videoDuration * 100) / 100 });
    }
    setSilenceRegions(silences);
    setSilenceRemoved(false);
  }, [silenceThreshold, silenceMinDuration, waveformData, videoDuration]);

  // ── 무음 구간 제거 → videoSegs 업데이트 ──
  const applySilenceRemoval = useCallback(() => {
    if (silenceRegions.length === 0 || videoDuration === 0) return;
    pushUndo();
    const gap = silenceGap;
    const newSegs = [];
    let cursor = 0;

    for (const sil of silenceRegions) {
      if (sil.start > cursor + 0.1) {
        newSegs.push({ start: cursor, end: Math.min(sil.start + gap, sil.end) });
      }
      cursor = Math.max(cursor, sil.end - gap);
    }
    if (cursor < videoDuration - 0.1) {
      newSegs.push({ start: cursor, end: videoDuration });
    }
    if (newSegs.length === 0) newSegs.push({ start: 0, end: videoDuration });
    setVideoSegs(newSegs);
    setSilenceRemoved(true);
  }, [silenceRegions, videoDuration, silenceGap]);

  // ── 무음 제거 복원 ──
  const restoreFullVideo = useCallback(() => {
    pushUndo();
    setVideoSegs([{ start: 0, end: videoDuration }]);
    setSilenceRemoved(false);
  }, [videoDuration]);

  // ── 반복 단어 감지 ──
  useEffect(() => {
    if (subtitles.length > 0) {
      setRepeatedPhrases(detectRepeatedPhrases(subtitles));
    }
  }, [subtitles]);

  // ── 반복 자막 제거 ──
  const removeRepeatedAt = useCallback((indices) => {
    pushUndo();
    setSubtitles(prev => prev.filter((_, i) => !indices.includes(i)));
  }, []);

  // ── 분할 ──
  const splitAtPlayhead = useCallback(() => {
    if (videoSegs.length === 0) return;
    pushUndo();
    let accum = 0;
    for (let i = 0; i < videoSegs.length; i++) {
      const seg = videoSegs[i];
      const segLen = seg.end - seg.start;
      if (playhead >= accum && playhead < accum + segLen) {
        const splitPoint = seg.start + (playhead - accum);
        if (splitPoint - seg.start < 0.3 || seg.end - splitPoint < 0.3) return;
        const newSegs = [...videoSegs];
        newSegs.splice(i, 1, { start: seg.start, end: Math.round(splitPoint * 100) / 100 }, { start: Math.round(splitPoint * 100) / 100, end: seg.end });
        setVideoSegs(newSegs);
        return;
      }
      accum += segLen;
    }
  }, [videoSegs, playhead]);

  // ── 세그먼트 삭제 ──
  const deleteSegment = useCallback((idx) => {
    if (videoSegs.length <= 1) return;
    pushUndo();
    setVideoSegs(prev => prev.filter((_, i) => i !== idx));
    setSelectedSegIdx(-1); setPlayhead(0);
  }, [videoSegs]);

  // ── 자막 삭제 ──
  const deleteSubtitle = useCallback((idx) => {
    pushUndo();
    setSubtitles(prev => prev.filter((_, i) => i !== idx));
    if (selectedSubIdx === idx) setSelectedSubIdx(-1);
  }, [selectedSubIdx]);

  // ── 키보드 단축키 ──
  useEffect(() => {
    if (step !== "edit") return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedSubIdx >= 0) { deleteSubtitle(selectedSubIdx); return; }
        if (selectedSegIdx >= 0 && videoSegs.length > 1) { deleteSegment(selectedSegIdx); return; }
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); setPlayhead(p => Math.max(0, p - (e.shiftKey ? 5 : 1))); }
      if (e.key === "ArrowRight") { e.preventDefault(); setPlayhead(p => Math.min(clipDuration, p + (e.shiftKey ? 5 : 1))); }
      if (e.key === "Home") { e.preventDefault(); setPlayhead(0); }
      if (e.key === "End") { e.preventDefault(); setPlayhead(clipDuration); }
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) splitAtPlayhead();
      if (e.key === "m" && !e.ctrlKey && selectedSegIdx >= 0) {
        setVideoSegs(prev => { const n = [...prev]; n[selectedSegIdx] = { ...n[selectedSegIdx], muted: !n[selectedSegIdx].muted }; return n; });
      }
      if (e.key === "[") { e.preventDefault(); setTimelineZoom(z => Math.max(0.25, z - 0.25)); }
      if (e.key === "]") { e.preventDefault(); setTimelineZoom(z => Math.min(8, z + 0.25)); }
      if (e.key === "Escape") { setSelectedSubIdx(-1); setSelectedSegIdx(-1); setSelectedOverlay(null); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); doUndo(); }
      if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); doRedo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, selectedSubIdx, selectedSegIdx, videoSegs, clipDuration, playhead]);

  // ── API ──
  const apiCall = async (path, opts = {}) => {
    const timeout = opts.timeout || 60000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch(`${API}${path}`, { ...opts, signal: controller.signal, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
      clearTimeout(timer);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `요청 실패 (${r.status})`); }
      return r.json();
    } catch (err) { clearTimeout(timer); throw err; }
  };

  // ── 파일 업로드 + 분석 ──
  const handleUpload = async () => {
    if (!videoFile) return;
    if (showPointConfirm && user && !(await showPointConfirm(35))) return;
    setStep("loading"); setLoadingMsg("업로드 중..."); setError("");
    try {
      // 1. 오디오 파형 분석 (로컬)
      setLoadingMsg("오디오 파형 분석 중...");
      const audioResult = await analyzeAudio(videoFile);

      // 2. 서버 업로드
      setLoadingMsg("서버에 업로드 중...");
      const form = new FormData();
      form.append("video", videoFile);
      const r = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `업로드 실패 (${r.status})`); }
      const d = await r.json();
      setFileId(d.file_id);

      // 3. STT (음성인식) - 전체 영상 자막 생성 (max_segments 높게 → 전체 커버)
      setLoadingMsg("음성 인식 중... (전체 자막 생성, 긴 영상은 시간이 걸릴 수 있습니다)");
      const sttResult = await apiCall(`/analyze/${d.file_id}`, {
        method: "POST",
        body: JSON.stringify({ max_segments: 3, longform: true, full_subtitles: true }),
        timeout: 300000,
      });

      // 서버 응답 구조 로깅 (디버그)
      console.log("[LongFormEditor] STT 응답:", JSON.stringify({
        keys: Object.keys(sttResult),
        segCount: (sttResult.segments||[]).length,
        segments: (sttResult.segments||[]).map(s => ({
          start: s.start_seconds, end: s.end_seconds,
          subCount: (s.subtitles||[]).length,
          scriptLen: (s.script||"").length,
          hasWords: !!(s.words || s.word_timestamps),
          keys: Object.keys(s).filter(k => !["script","subtitles","hook","hook_text","title","reason","seo_title"].includes(k)),
        })),
        hasFullTranscript: !!sttResult.full_transcript,
        hasTranscript: !!sttResult.transcript,
        topKeys: Object.keys(sttResult).filter(k => k !== "segments"),
      }));
      // 자막 추출 (전체 영상 빈틈 없이 커버)
      const dur = audioResult?.duration || (sttResult.segments?.[0]?.end_seconds || 60);
      const allSubs = extractFullSubtitles(sttResult, dur);
      setSubtitles(allSubs);

      // 비디오 세그먼트 (전체 영상)
      setVideoDuration(dur);
      setVideoSegs([{ start: 0, end: dur }]);

      // 무음 구간이 있으면 표시
      if (audioResult?.silences?.length > 0) {
        setSilenceRegions(audioResult.silences);
      }

      setStep("edit");
    } catch (e) {
      setError(e.message || "업로드 실패");
      setStep("upload");
    }
  };

  // ── YouTube ──
  const handleYoutube = async () => {
    const parsed = parseYoutubeUrl(ytUrl);
    if (!parsed) { setError("올바른 유튜브 링크를 입력해주세요"); return; }
    if (showPointConfirm && user && !(await showPointConfirm(35))) return;
    setStep("loading"); setLoadingMsg("영상 다운로드 중..."); setError("");
    try {
      const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: parsed.url }), timeout: 120000 });
      setFileId(d.file_id);
      setLoadingMsg("음성 인식 중... (전체 자막 생성)");
      const sttResult = await apiCall(`/analyze/${d.file_id}`, {
        method: "POST", body: JSON.stringify({ max_segments: 3, longform: true, full_subtitles: true }), timeout: 300000,
      });
      const seg = sttResult.segments?.[0];
      const dur = sttResult.segments?.[(sttResult.segments?.length || 1) - 1]?.end_seconds || seg?.end_seconds || 60;
      const allSubs = extractFullSubtitles(sttResult, dur);
      setSubtitles(allSubs);
      setVideoDuration(dur);
      setVideoSegs([{ start: 0, end: dur }]);
      setStep("edit");
    } catch (e) {
      setDownloadHelper({ id: parsed.id, url: parsed.url, title: `YouTube (${parsed.id})`, thumbnail: `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg` });
      setInputMode("file"); setError(""); setStep("upload");
    }
  };

  // ── 생성 (내보내기) ──
  const handleExport = async () => {
    if (showPointConfirm && user && !(await showPointConfirm(200))) return;
    setStep("generate"); setResultUrl(null);
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
      detail: { action: "register", task: { id: "longform_gen", type: "longform_make", message: "롱폼 영상 편집 중..." } }
    }));
    try {
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({
          file_id: fileId,
          clips: [{ start_seconds: 0, end_seconds: videoDuration, title: "", subtitles }],
          video_segments: videoSegs,
          remove_silence: silenceRemoved,
          silence_regions: silenceRemoved ? silenceRegions : [],
          silence_gap: silenceGap,
          subtitles_enabled: subtitlesEnabled,
          caption_animation: captionAnimation,
          caption_style: captionStyle,
          longform: true,
        }),
      });
      setJobId(d.job_id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          setJobStatus(j);
          window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
            detail: { action: "update", task: { id: "longform_gen", message: `편집 중... ${j.progress || 0}%`, progress: j.progress || 0 } }
          }));
          if (j.status === "complete") {
            clearInterval(pollRef.current); pollRef.current = null;
            const done = (j.results || []).find(r => r.type === "done");
            if (done) setResultUrl(`${API}/outputs/${fileId}/${done.filename}`);
            window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
              detail: { action: "complete", task: { id: "longform_gen", message: "롱폼 편집 완료!" } }
            }));
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError("생성 실패: " + e.message);
      window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
        detail: { action: "complete", task: { id: "longform_gen", message: "생성 실패" } }
      }));
    }
  };

  // ── 현재 자막 (애니메이션 포함) ──
  const currentSub = useMemo(() => {
    const absTime = playheadToAbsolute(playhead);
    return subtitles.find(s => absTime >= s.start && absTime < (s.end || s.start + 3));
  }, [playhead, subtitles, playheadToAbsolute]);

  // ── 자막 애니메이션 렌더 ──
  const renderAnimatedCaption = (sub) => {
    if (!sub) return null;
    const absTime = playheadToAbsolute(playhead);
    const elapsed = absTime - sub.start;
    const duration = (sub.end || sub.start + 3) - sub.start;
    const progress = Math.min(1, elapsed / duration);
    const t = sub.text || "";
    const style = {
      fontSize: captionStyle.fontSize, fontWeight: 700, color: captionStyle.color,
      lineHeight: 1.5, wordBreak: "keep-all", textAlign: captionStyle.align || "center",
      textShadow: captionStyle.shadow ? "0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.5)" : "none",
      WebkitTextStroke: captionStyle.border ? `1px ${captionStyle.borderColor}` : "none",
      background: captionStyle.bgBox ? captionStyle.bgColor : "transparent",
      padding: captionStyle.bgBox ? "6px 16px" : 0, borderRadius: captionStyle.bgBox ? 8 : 0,
      opacity: captionStyle.opacity / 100, display: "inline-block",
    };

    switch (captionAnimation) {
      case "fade": {
        const fadeIn = Math.min(1, elapsed / 0.3);
        const fadeOut = Math.min(1, (duration - elapsed) / 0.3);
        return <span style={{ ...style, opacity: Math.min(fadeIn, fadeOut) * (captionStyle.opacity / 100) }}>{t}</span>;
      }
      case "typewriter": {
        const chars = Math.floor(t.length * Math.min(1, elapsed / Math.max(0.5, duration * 0.6)));
        return <span style={style}>{t.slice(0, chars)}<span style={{ opacity: elapsed % 0.6 < 0.3 ? 1 : 0 }}>|</span></span>;
      }
      case "highlight": {
        const words = t.split(/(\s+)/);
        const wordProgress = elapsed / Math.max(0.5, duration * 0.8);
        return (
          <span style={style}>
            {words.map((w, i) => {
              const wordIdx = words.slice(0, i).filter(x => x.trim()).length;
              const totalWords = words.filter(x => x.trim()).length;
              const isHighlighted = wordIdx / totalWords <= wordProgress;
              return (
                <span key={i} style={{
                  color: w.trim() ? (isHighlighted ? (captionStyle.highlightColor || "#FFD700") : `${captionStyle.color}80`) : undefined,
                  transition: "color 0.15s",
                  fontWeight: isHighlighted ? 900 : 500,
                }}>{w}</span>
              );
            })}
          </span>
        );
      }
      case "bounce": {
        const scale = elapsed < 0.2 ? 0.5 + elapsed * 2.5 : elapsed < 0.35 ? 1.1 - (elapsed - 0.2) * 0.67 : 1;
        return <span style={{ ...style, transform: `scale(${scale})`, display: "inline-block" }}>{t}</span>;
      }
      case "slide": {
        const y = elapsed < 0.25 ? 20 * (1 - elapsed / 0.25) : 0;
        const o = elapsed < 0.25 ? elapsed / 0.25 : 1;
        return <span style={{ ...style, transform: `translateY(${y}px)`, opacity: o * (captionStyle.opacity / 100) }}>{t}</span>;
      }
      case "karaoke": {
        const pct = Math.min(100, progress * 120);
        return (
          <span style={{ ...style, background: `linear-gradient(90deg, ${captionStyle.highlightColor || "#FFD700"} ${pct}%, ${captionStyle.color} ${pct}%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {t}
          </span>
        );
      }
      case "glow": {
        const glow = Math.sin(elapsed * 4) * 0.5 + 0.5;
        return <span style={{ ...style, textShadow: `0 0 ${8 + glow * 12}px ${captionStyle.highlightColor || "#FFD700"}, 0 0 ${4 + glow * 6}px ${captionStyle.color}` }}>{t}</span>;
      }
      case "pop": {
        const chars = t.split("");
        return (
          <span style={style}>
            {chars.map((ch, ci) => {
              const delay = ci * 0.04;
              const charElapsed = Math.max(0, elapsed - delay);
              const s = charElapsed < 0.15 ? 0.3 + charElapsed / 0.15 * 1.2 : charElapsed < 0.25 ? 1.5 - (charElapsed - 0.15) / 0.1 * 0.5 : 1;
              return <span key={ci} style={{ display: "inline-block", transform: `scale(${s})`, opacity: charElapsed > 0 ? 1 : 0 }}>{ch}</span>;
            })}
          </span>
        );
      }
      case "wave": {
        const chars = t.split("");
        return (
          <span style={style}>
            {chars.map((ch, ci) => {
              const y = Math.sin(elapsed * 5 - ci * 0.5) * 4;
              return <span key={ci} style={{ display: "inline-block", transform: `translateY(${y}px)`, transition: "none" }}>{ch}</span>;
            })}
          </span>
        );
      }
      case "shake": {
        const intensity = elapsed < 0.3 ? 3 : 0;
        const x = intensity ? (Math.random() - 0.5) * intensity * 2 : 0;
        const y = intensity ? (Math.random() - 0.5) * intensity * 2 : 0;
        return <span style={{ ...style, transform: `translate(${x}px, ${y}px)`, display: "inline-block" }}>{t}</span>;
      }
      case "blur_in": {
        const blur = elapsed < 0.4 ? (1 - elapsed / 0.4) * 8 : 0;
        const o = elapsed < 0.4 ? elapsed / 0.4 : 1;
        return <span style={{ ...style, filter: `blur(${blur}px)`, opacity: o * (captionStyle.opacity / 100) }}>{t}</span>;
      }
      case "color_cycle": {
        const hue = (elapsed * 120) % 360;
        return <span style={{ ...style, color: `hsl(${hue}, 80%, 65%)` }}>{t}</span>;
      }
      default:
        return <span style={style}>{t}</span>;
    }
  };

  // 공통 스타일
  const btnStyle = { padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, width: "100%", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" };
  const cardStyle = { background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 13, outline: "none" };
  const tabBtn = (active) => ({ flex: 1, padding: "12px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, borderRadius: 0, background: active ? `linear-gradient(135deg,${acc},#8b5cf6)` : "transparent", color: active ? "#fff" : muted });

  // ═══════════════════════════════════
  // Step: 업로드
  // ═══════════════════════════════════
  if (step === "upload") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: `${acc}15`, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: acc }}>LONGFORM EDITOR</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: text }}>롱폼 영상 편집기</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6, lineHeight: 1.6 }}>
            무음 자동 제거 / 반복 단어 삭제 / 자동 자막 / 자막 애니메이션
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 24, border: `1px solid ${bdr}` }}>
          <button onClick={() => setInputMode("file")} style={tabBtn(inputMode === "file")}>파일 업로드</button>
          <button onClick={() => { setInputMode("youtube"); setDownloadHelper(null); }} style={tabBtn(inputMode === "youtube")}>유튜브 링크</button>
        </div>

        {inputMode === "youtube" ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>유튜브 영상 URL *</div>
            <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."
              style={{ ...inputStyle, marginBottom: 12 }} />
            {ytParsed && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                <img src={`https://img.youtube.com/vi/${ytParsed.id}/mqdefault.jpg`} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
                <div><div style={{ fontSize: 12, fontWeight: 700, color: acc }}>영상 감지됨</div><div style={{ fontSize: 11, color: muted }}>ID: {ytParsed.id}</div></div>
              </div>
            )}
            <button onClick={handleYoutube} style={{ ...btnStyle, opacity: !ytParsed ? 0.4 : 1 }} disabled={!ytParsed}>롱폼 편집 시작 <span style={{ opacity: 0.7, fontSize: 12 }}>(35P)</span></button>
          </div>
        ) : (
          <div>
            {downloadHelper && (
              <div style={{ ...cardStyle, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)", border: `1px solid ${acc}30` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <img src={downloadHelper.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{downloadHelper.title}</div>
                </div>
                <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8 }}>서버 다운로드 실패 - 직접 다운로드 후 업로드해주세요</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`https://ssyoutube.com/watch?v=${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>ssyoutube.com</a>
                  <a href={`https://www.y2mate.com/youtube/${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>y2mate.com</a>
                </div>
              </div>
            )}
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${bdr}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: ibg }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${acc}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>영상 파일을 선택하세요</div>
              <div style={{ fontSize: 12, color: muted }}>MP4, MOV, AVI (최대 2시간 영상 지원)</div>
              <input ref={fileRef} type="file" accept=".mp4,.mkv,.avi,.mov" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} />
            </div>
            {videoFile && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: acc, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${acc}15` }}>{videoFile.name}</span>
                <span style={{ fontSize: 11, color: muted }}>{(videoFile.size / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            )}
            <button onClick={handleUpload} style={{ ...btnStyle, opacity: !videoFile ? 0.4 : 1 }} disabled={!videoFile}>
              롱폼 편집 시작 <span style={{ opacity: 0.7, fontSize: 12 }}>(35P)</span>
            </button>
          </div>
        )}

        {/* 기능 안내 */}
        <div style={{ ...cardStyle, marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>주요 기능</div>
          {[
            ["무음 자동 감지/제거", "AI가 무음 구간을 자동으로 감지하고 제거합니다. 텀 조정도 가능합니다."],
            ["반복 단어 감지/삭제", "말더듬, 연속 반복, 말 겹침을 자동으로 찾아 제거할 수 있습니다."],
            ["자동 자막 삽입", "Whisper AI가 음성을 인식해 자동으로 자막을 생성합니다."],
            ["자막 애니메이션", "하이라이트, 타이핑, 페이드, 가라오케 등 7가지 애니메이션을 제공합니다."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: ibg }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${acc}15`, color: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{title}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 로딩
  // ═══════════════════════════════════
  if (step === "loading") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: D ? "transparent" : "#f4f4f8" }}>
      <style>{`
        @keyframes lf-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes lf-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
      `}</style>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 20px" }}>
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "lf-spin 1.5s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M8 4v16M16 4v16"/></svg>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8 }}>영상 분석 중</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 20, animation: "lf-pulse 2s ease-in-out infinite" }}>{loadingMsg}</div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: muted }}>경과 시간: {Math.floor(elapsed / 60)}분 {elapsed % 60}초</div>
          <div style={{ fontSize: 11, color: acc, fontWeight: 600, marginTop: 6 }}>다른 메뉴로 이동해도 분석이 계속됩니다</div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 생성 / 결과
  // ═══════════════════════════════════
  if (step === "generate" || step === "result") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: "0 20px" }}>
        {!resultUrl ? (
          <>
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 20px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "lf-spin 1.5s linear infinite" }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 8 }}>영상 생성 중...</div>
            <div style={{ fontSize: 13, color: muted }}>{jobStatus?.progress ? `${jobStatus.progress}%` : "처리 대기 중"}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 12 }}>편집 완료!</div>
            <video src={resultUrl} controls style={{ width: "100%", maxWidth: 480, borderRadius: 12, marginBottom: 16 }} />
            <a href={resultUrl} download style={{ ...btnStyle, textDecoration: "none", display: "block", textAlign: "center" }}>다운로드</a>
            <button onClick={() => setStep("edit")} style={{ marginTop: 12, padding: "12px 24px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>편집으로 돌아가기</button>
          </>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 편집
  // ═══════════════════════════════════
  if (step === "edit") {
    const pxPerSec = 15 * timelineZoom;
    const tlWidth = Math.max(clipDuration * pxPerSec, 800);
    const TRACK_H = 36;
    const sourceUrl = fileId ? `${API}/source/${fileId}` : null;
    const subColors = ["#7c6aff", "#ff6a8a", "#6affb2", "#ffd76a", "#6ac4ff", "#ff9f6a", "#c46aff", "#6afff0"];

    // 모바일 안내
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="1.5" style={{ margin: "0 auto 16px", display: "block", opacity: 0.4 }}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>PC에서 편집해주세요</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>롱폼 편집기는 데스크탑 환경에서 최적으로 작동합니다.</div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0", height: "calc(100vh - 100px)", maxHeight: "calc(100vh - 100px)", minHeight: 0 }}>
        <style>{`
          @keyframes lf-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        `}</style>

        {/* ── TOP: Preview + Right Panel ── */}
        <div style={{ flex: "1 1 0%", display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* CENTER: 16:9 Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 8, minWidth: 0, overflow: "hidden" }}>
            <div style={{ width: "100%", maxHeight: "calc(100vh - 480px)", aspectRatio: "16/9", borderRadius: 8, background: "#000", border: "2px solid #2a2a4a", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", position: "relative", flexShrink: 1 }}>
              <video ref={videoRef} src={sourceUrl || undefined}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                preload="metadata" playsInline
                onLoadedMetadata={e => { if (!videoDuration) setVideoDuration(e.target.duration); }}
              />

              {/* 오버레이 (이미지/텍스트) 표시 */}
              {overlays.filter(o => { const absTime = playheadToAbsolute(playhead); return absTime >= o.start && absTime <= o.end; }).map(o => (
                <div key={o.id}
                  onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); setPropTab("overlay"); }}
                  onMouseDown={e => {
                    e.preventDefault(); e.stopPropagation();
                    setSelectedOverlay(o.id);
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    const onMove = ev => {
                      const x = Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100));
                      const y = Math.max(5, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100));
                      setOverlays(prev => prev.map(ol => ol.id === o.id ? { ...ol, x, y } : ol));
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
                  }}
                  style={{ position: "absolute", left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 15, border: selectedOverlay === o.id ? `2px solid ${acc}` : "2px solid transparent", borderRadius: 4, userSelect: "none" }}>
                  {o.type === "text" ? (
                    <span style={{ fontSize: o.fontSize || 24, fontWeight: 700, color: o.color || "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}>{o.text}</span>
                  ) : (
                    <img src={o.src} alt="" style={{ width: `${o.w * 3}px`, height: "auto", maxHeight: `${o.h * 4}px`, objectFit: "contain", borderRadius: 4 }} draggable={false} />
                  )}
                </div>
              ))}

              {/* 자막 표시 (더블클릭으로 편집) */}
              {subtitlesEnabled && currentSub && (
                <div
                  onDoubleClick={e => { e.stopPropagation(); setEditingSubOnCanvas(true); setIsPlaying(false); const idx = subtitles.findIndex(s => s.start === currentSub.start); if (idx >= 0) setSelectedSubIdx(idx); }}
                  style={{
                  position: "absolute",
                  left: "50%", transform: "translateX(-50%)",
                  ...(captionStyle.position === "top" ? { top: "8%" } : captionStyle.position === "center" ? { top: "45%" } : { bottom: "8%" }),
                  maxWidth: "90%", textAlign: "center", zIndex: 10,
                  cursor: editingSubOnCanvas ? "text" : "pointer",
                }}>
                  {editingSubOnCanvas ? (
                    <input
                      autoFocus
                      value={currentSub.text}
                      onChange={e => {
                        const idx = subtitles.findIndex(s => s.start === currentSub.start);
                        if (idx >= 0) { const subs = [...subtitles]; subs[idx] = { ...subs[idx], text: e.target.value }; setSubtitles(subs); }
                      }}
                      onBlur={() => setEditingSubOnCanvas(false)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setEditingSubOnCanvas(false); } }}
                      style={{
                        fontSize: captionStyle.fontSize || 18, color: captionStyle.color || "#fff", fontWeight: 800,
                        background: captionStyle.bgBox ? captionStyle.bgColor : "rgba(0,0,0,0.6)",
                        padding: "5px 14px", borderRadius: 6, border: "2px solid #22d3ee",
                        textShadow: captionStyle.shadow ? "0 2px 8px rgba(0,0,0,0.9)" : "none",
                        outline: "none", textAlign: "center", width: "100%", minWidth: 150,
                      }}
                    />
                  ) : renderAnimatedCaption(currentSub)}
                  {/* 번역 자막 */}
                  {dualSubEnabled && (() => {
                    const abs = playheadToAbsolute(playhead);
                    const ds = dualSubs.find(d => abs >= d.start && abs < d.end);
                    return ds ? <div style={{ marginTop: 4 }}><span style={{
                      fontSize: Math.max((captionStyle.fontSize || 18) - 3, 12), color: "rgba(255,255,255,0.85)", fontWeight: 600,
                      lineHeight: 1.3, display: "inline-block",
                      textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                      background: "rgba(0,0,0,0.5)", padding: "3px 10px", borderRadius: 4,
                    }}>{ds.text}</span></div> : null;
                  })()}
                </div>
              )}
            </div>

            {/* 재생 컨트롤 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, width: "100%", maxWidth: 800, flexShrink: 0 }}>
              <button onClick={() => setIsPlaying(p => !p)}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: acc, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                )}
              </button>
              <span style={{ fontSize: 12, color: "#aaa", fontFamily: "monospace", minWidth: 100 }}>
                {fmtLong(playheadToAbsolute(playhead))} / {fmtLong(videoDuration)}
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)}
                  style={{ width: 60, accentColor: acc }} />
              </div>
            </div>
          </div>

          {/* RIGHT: Properties Panel */}
          <div style={{ width: rightPanelWidth, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {/* 리사이즈 핸들 */}
            <div style={{ position: "absolute", left: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 10 }}
              onMouseDown={e => { e.preventDefault(); const startX = e.clientX; const startW = rightPanelWidth; const onMove = ev => setRightPanelWidth(Math.max(220, Math.min(500, startW - (ev.clientX - startX)))); const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }}
            />
            {/* 탭 */}
            <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
              {[["silence", "무음"], ["caption", "자막"], ["style", "스타일"], ["overlay", "소스"]].map(([id, label]) => (
                <button key={id} onClick={() => setPropTab(id)}
                  style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: propTab === id ? "rgba(124,106,255,0.15)" : "transparent", color: propTab === id ? "#a5b4fc" : "#666", borderBottom: propTab === id ? `2px solid ${acc}` : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {/* 무음 탭 */}
              {propTab === "silence" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0", marginBottom: 12 }}>무음 감지 설정</div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>감지 임계값</span>
                      <span style={{ fontSize: 11, color: acc }}>{silenceThreshold}dB</span>
                    </div>
                    <input type="range" min={-60} max={-10} value={silenceThreshold} onChange={e => setSilenceThreshold(+e.target.value)}
                      style={{ width: "100%", accentColor: acc }} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>최소 무음 길이</span>
                      <span style={{ fontSize: 11, color: acc }}>{silenceMinDuration}초</span>
                    </div>
                    <input type="range" min={0.1} max={3} step={0.1} value={silenceMinDuration} onChange={e => setSilenceMinDuration(+e.target.value)}
                      style={{ width: "100%", accentColor: acc }} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>무음 제거 후 남길 간격</span>
                      <span style={{ fontSize: 11, color: acc }}>{silenceGap}초</span>
                    </div>
                    <input type="range" min={0} max={0.5} step={0.05} value={silenceGap} onChange={e => setSilenceGap(+e.target.value)}
                      style={{ width: "100%", accentColor: acc }} />
                  </div>

                  {silenceRegions.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(124,106,255,0.08)", border: "1px solid rgba(124,106,255,0.2)", marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700 }}>
                        {silenceRegions.length}개 무음 구간 감지됨
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        총 {(silenceRegions.reduce((a, s) => a + (s.end - s.start), 0)).toFixed(1)}초 제거 가능
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={applySilenceRemoval}
                      style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: silenceRemoved ? "rgba(239,68,68,0.2)" : `linear-gradient(135deg,${acc},#8b5cf6)`, color: silenceRemoved ? "#f87171" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {silenceRemoved ? "다시 적용" : "무음 제거 적용"}
                    </button>
                    {silenceRemoved && (
                      <button onClick={restoreFullVideo}
                        style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        복원
                      </button>
                    )}
                  </div>

                  {/* 반복 단어 섹션 */}
                  <div style={{ marginTop: 24, borderTop: "1px solid #2a2a4a", paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0", marginBottom: 8 }}>반복 단어 감지</div>
                    {repeatedPhrases.length > 0 ? (
                      <>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
                          {repeatedPhrases.length}개 반복 감지됨
                        </div>
                        {repeatedPhrases.slice(0, 10).map((rp, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)", marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b6b" }}>
                                {rp.type === "exact" ? "연속 반복" : rp.type === "stutter" ? "말더듬" : "말 겹침"}
                              </div>
                              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>"{rp.text?.slice(0, 30)}"</div>
                            </div>
                            <button onClick={() => removeRepeatedAt(rp.indices.slice(1))}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(255,107,107,0.15)", color: "#ff6b6b", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              제거
                            </button>
                          </div>
                        ))}
                        <button onClick={() => {
                          const allIndices = new Set();
                          repeatedPhrases.forEach(rp => rp.indices.slice(1).forEach(i => allIndices.add(i)));
                          removeRepeatedAt([...allIndices]);
                        }}
                          style={{ width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "rgba(255,107,107,0.1)", color: "#ff6b6b", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
                          모두 제거
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: "#666", padding: "12px", textAlign: "center" }}>반복 단어가 없습니다</div>
                    )}
                  </div>
                </div>
              )}

              {/* 자막 탭 */}
              {propTab === "caption" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0" }}>자동 자막</div>
                    <button onClick={() => setSubtitlesEnabled(p => !p)}
                      style={{ padding: "4px 12px", borderRadius: 20, border: "none", background: subtitlesEnabled ? acc : "#2a2a4a", color: subtitlesEnabled ? "#fff" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {subtitlesEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>애니메이션</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                    {CAPTION_ANIMATIONS.map(a => (
                      <button key={a.id} onClick={() => setCaptionAnimation(a.id)}
                        style={{ padding: "8px", borderRadius: 8, border: `1.5px solid ${captionAnimation === a.id ? acc : "#2a2a4a"}`, background: captionAnimation === a.id ? "rgba(124,106,255,0.12)" : "transparent", color: captionAnimation === a.id ? "#a5b4fc" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                        <div>{a.name}</div>
                        <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{a.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>자막 위치</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    {[["top","상단"],["center","중앙"],["bottom","하단"]].map(([k,l]) => (
                      <button key={k} onClick={() => setCaptionStyle(p => ({...p, position: k}))}
                        style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${captionStyle.position === k ? acc : "#2a2a4a"}`, background: captionStyle.position === k ? "rgba(124,106,255,0.12)" : "transparent", color: captionStyle.position === k ? "#a5b4fc" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* 자막 목록 */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>
                    자막 목록 ({subtitles.length}개)
                  </div>
                  <div style={{ overflowY: "auto" }}>
                    {subtitles.map((s, i) => (
                      <div key={i} onClick={() => { setSelectedSubIdx(i); setPlayhead(absoluteToPlayhead(s.start)); }}
                        style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: selectedSubIdx === i ? "rgba(124,106,255,0.15)" : "transparent", border: `1px solid ${selectedSubIdx === i ? acc : "transparent"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{fmtLong(s.start)}</span>
                          {selectedSubIdx === i && (
                            <button onClick={e => { e.stopPropagation(); deleteSubtitle(i); }}
                              style={{ padding: "2px 8px", borderRadius: 4, border: "none", background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 10, cursor: "pointer" }}>삭제</button>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#ddd", marginTop: 2, lineHeight: 1.4 }}>{s.text}</div>
                      </div>
                    ))}
                  </div>

                  {/* 선택된 자막 편집 */}
                  {selectedSubIdx >= 0 && subtitles[selectedSubIdx] && (
                    <div style={{ marginTop: 12, padding: "12px", borderRadius: 10, background: "rgba(124,106,255,0.06)", border: "1px solid rgba(124,106,255,0.15)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 8 }}>자막 편집</div>
                      <textarea value={subtitles[selectedSubIdx].text}
                        onChange={e => { const n = [...subtitles]; n[selectedSubIdx] = { ...n[selectedSubIdx], text: e.target.value }; setSubtitles(n); }}
                        rows={2} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e0e0e0", fontSize: 12, resize: "none", outline: "none" }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>시작</div>
                          <input type="number" step={0.1} value={subtitles[selectedSubIdx].start}
                            onChange={e => { const n = [...subtitles]; n[selectedSubIdx] = { ...n[selectedSubIdx], start: +e.target.value }; setSubtitles(n); }}
                            style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e0e0e0", fontSize: 11, outline: "none" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>끝</div>
                          <input type="number" step={0.1} value={subtitles[selectedSubIdx].end}
                            onChange={e => { const n = [...subtitles]; n[selectedSubIdx] = { ...n[selectedSubIdx], end: +e.target.value }; setSubtitles(n); }}
                            style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e0e0e0", fontSize: 11, outline: "none" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 스타일 탭 */}
              {propTab === "style" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0", marginBottom: 12 }}>자막 스타일</div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>글자 크기: {captionStyle.fontSize}px</div>
                    <input type="range" min={12} max={36} value={captionStyle.fontSize} onChange={e => setCaptionStyle(p => ({...p, fontSize: +e.target.value}))}
                      style={{ width: "100%", accentColor: acc }} />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>글자색</div>
                      <input type="color" value={captionStyle.color} onChange={e => setCaptionStyle(p => ({...p, color: e.target.value}))}
                        style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid #2a2a4a", cursor: "pointer" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>강조색</div>
                      <input type="color" value={captionStyle.highlightColor || "#FFD700"} onChange={e => setCaptionStyle(p => ({...p, highlightColor: e.target.value}))}
                        style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid #2a2a4a", cursor: "pointer" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    {[["shadow","그림자"],["border","테두리"],["bgBox","배경박스"]].map(([k,l]) => (
                      <button key={k} onClick={() => setCaptionStyle(p => ({...p, [k]: !p[k]}))}
                        style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${captionStyle[k] ? acc : "#2a2a4a"}`, background: captionStyle[k] ? "rgba(124,106,255,0.12)" : "transparent", color: captionStyle[k] ? "#a5b4fc" : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {l} {captionStyle[k] ? "ON" : "OFF"}
                      </button>
                    ))}
                  </div>

                  {captionStyle.bgBox && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>배경색</div>
                      <input type="color" value={captionStyle.bgColor?.replace(/rgba?\([^)]+\)/, "#000000") || "#000000"}
                        onChange={e => setCaptionStyle(p => ({...p, bgColor: e.target.value + "b3"}))}
                        style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid #2a2a4a", cursor: "pointer" }} />
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>투명도: {captionStyle.opacity}%</div>
                    <input type="range" min={20} max={100} value={captionStyle.opacity} onChange={e => setCaptionStyle(p => ({...p, opacity: +e.target.value}))}
                      style={{ width: "100%", accentColor: acc }} />
                  </div>
                </div>
              )}

              {/* 소스(오버레이) 탭 */}
              {propTab === "overlay" && (
                <div>
                  <input ref={overlayFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = ev => { const id = "ol_" + Date.now(); const isVid = f.type.startsWith("video"); setOverlays(prev => [...prev, { id, type: isVid ? "video" : "image", src: ev.target.result, x: 50, y: 50, w: 30, h: 30, start: playheadToAbsolute(playhead), end: Math.min(playheadToAbsolute(playhead) + 5, videoDuration) }]); setSelectedOverlay(id); }; reader.readAsDataURL(f); e.target.value = ""; }} />

                  <div style={{ fontSize: 13, fontWeight: 800, color: "#e0e0e0", marginBottom: 12 }}>소스 삽입</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                    <button onClick={() => overlayFileRef.current?.click()}
                      style={{ padding: "14px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>+</div>이미지/영상
                    </button>
                    <button onClick={() => { const id = "ol_" + Date.now(); setOverlays(prev => [...prev, { id, type: "text", text: "텍스트", fontSize: 24, color: "#fff", x: 50, y: 50, w: 20, h: 10, start: playheadToAbsolute(playhead), end: Math.min(playheadToAbsolute(playhead) + 5, videoDuration) }]); setSelectedOverlay(id); }}
                      style={{ padding: "14px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>Aa</div>텍스트
                    </button>
                    <button onClick={() => { const url = prompt("이미지/GIF URL을 입력하세요"); if (url) { const id = "ol_" + Date.now(); setOverlays(prev => [...prev, { id, type: "image", src: url, x: 50, y: 50, w: 30, h: 30, start: playheadToAbsolute(playhead), end: Math.min(playheadToAbsolute(playhead) + 5, videoDuration) }]); setSelectedOverlay(id); } }}
                      style={{ padding: "14px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>URL</div>링크
                    </button>
                  </div>

                  {/* 무료 이미지 검색 */}
                  {(() => {
                    const doSearch = async () => {
                      if (!srcSearchQuery.trim()) return;
                      setSrcSearchLoading(true); setSrcSearchItems([]);
                      try {
                        const all = [];
                        if (srcSearchCat === "photo") {
                          const [px, us] = await Promise.allSettled([
                            fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(srcSearchQuery)}&per_page=12&image_type=photo`).then(r => r.json()),
                            fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(srcSearchQuery)}&per_page=12`).then(r => r.json()),
                          ]);
                          if (px.status === "fulfilled" && px.value.hits) all.push(...px.value.hits.map(h => ({ url: h.webformatURL, title: h.tags || "", src: "Pixabay" })));
                          if (us.status === "fulfilled" && us.value.results) all.push(...us.value.results.map(h => ({ url: h.urls?.small, title: h.alt_description || "", src: "Unsplash" })));
                        } else if (srcSearchCat === "gif") {
                          const r = await fetch(`/api/proxy?action=klipy&path=gifs/search&q=${encodeURIComponent(srcSearchQuery)}&limit=18`).then(r => r.json());
                          (r.data || r.results || []).forEach(g => all.push({ url: g.images?.fixed_width?.url || g.images?.original?.url || g.url || g.media_url, title: g.title || "", src: "GIF" }));
                        } else if (srcSearchCat === "video") {
                          const px = await fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(srcSearchQuery)}&per_page=12&video=true`).then(r => r.json()).catch(() => ({}));
                          if (px.hits) all.push(...px.hits.map(h => ({ url: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`, title: h.tags || "", src: "Pixabay", videoUrl: h.videos?.tiny?.url })));
                        }
                        setSrcSearchItems(all);
                      } catch {}
                      setSrcSearchLoading(false);
                    };
                    return (
                      <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>무료 소스 검색</div>
                        <div style={{ display: "flex", gap: 0, marginBottom: 8, borderRadius: 6, overflow: "hidden", border: "1px solid #2a2a4a" }}>
                          {[["photo","사진"],["gif","GIF"],["video","영상"]].map(([k,l]) => (
                            <button key={k} onClick={() => setSrcSearchCat(k)}
                              style={{ flex: 1, padding: "5px 4px", border: "none", background: srcSearchCat === k ? "#7c6aff" : "#12122a", color: srcSearchCat === k ? "#fff" : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{l}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                          <input value={srcSearchQuery} onChange={e => setSrcSearchQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
                            placeholder="영어로 검색 (예: nature, fire)"
                            style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none" }} />
                          <button onClick={doSearch} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>검색</button>
                        </div>
                        {srcSearchLoading ? <div style={{ textAlign: "center", padding: 12, color: "#666", fontSize: 11 }}>검색 중...</div>
                          : srcSearchItems.length === 0 ? <div style={{ textAlign: "center", padding: 12, color: "#555", fontSize: 11 }}>검색어를 입력하고 Enter</div>
                          : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                            {srcSearchItems.slice(0, 24).map((it, i) => (
                              <div key={i} onClick={() => { const id = "ol_" + Date.now(); setOverlays(prev => [...prev, { id, type: "image", src: it.videoUrl || it.url, x: 50, y: 50, w: 30, h: 30, start: playheadToAbsolute(playhead), end: Math.min(playheadToAbsolute(playhead) + 5, videoDuration) }]); setSelectedOverlay(id); }}
                                style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", border: "1px solid #2a2a4a", height: 60, position: "relative", background: "#12122a" }}
                                title={`[${it.src}] ${it.title}`}>
                                <img src={it.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.8))", padding: "4px 3px 1px", fontSize: 7, color: "#ddd" }}>
                                  <span style={{ color: "#7c6aff", marginRight: 2 }}>{it.src}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 오버레이 목록 */}
                  {overlays.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>삽입된 소스 ({overlays.length})</div>
                      {overlays.map(o => (
                        <div key={o.id} onClick={() => setSelectedOverlay(o.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 3, background: selectedOverlay === o.id ? "rgba(124,106,255,0.15)" : "transparent", border: selectedOverlay === o.id ? `1px solid ${acc}40` : "1px solid transparent" }}>
                          {o.type === "text" ? <span style={{ fontSize: 14 }}>Aa</span> : <img src={o.src} alt="" style={{ width: 28, height: 20, objectFit: "cover", borderRadius: 3 }} />}
                          <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{o.type === "text" ? o.text : o.type}</span>
                          <span style={{ fontSize: 9, color: "#666", fontFamily: "monospace" }}>{fmtLong(o.start)}~{fmtLong(o.end)}</span>
                          <button onClick={e => { e.stopPropagation(); setOverlays(prev => prev.filter(x => x.id !== o.id)); if (selectedOverlay === o.id) setSelectedOverlay(null); }}
                            style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>X</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 선택된 오버레이 속성 */}
                  {selectedOverlay && overlays.find(o => o.id === selectedOverlay) && (() => {
                    const o = overlays.find(x => x.id === selectedOverlay);
                    const upd = (k, v) => setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, [k]: v } : x));
                    return (
                      <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, border: `1px solid ${acc}30` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: acc, marginBottom: 8 }}>속성</div>
                        {o.type === "text" && <>
                          <input value={o.text || ""} onChange={e => upd("text", e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                            <div><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>크기</div><input type="number" value={o.fontSize || 24} onChange={e => upd("fontSize", +e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} /></div>
                            <div><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>색상</div><input type="color" value={o.color || "#ffffff"} onChange={e => upd("color", e.target.value)} style={{ width: "100%", height: 28, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} /></div>
                          </div>
                        </>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <div><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>시작 (초)</div><input type="number" step={0.1} value={o.start} onChange={e => upd("start", +e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} /></div>
                          <div><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>끝 (초)</div><input type="number" step={0.1} value={o.end} onChange={e => upd("end", +e.target.value)} style={{ width: "100%", padding: "6px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} /></div>
                        </div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 프리뷰에서 드래그하여 위치 이동 가능</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 내보내기 버튼 */}
            <div style={{ padding: "12px", borderTop: "1px solid #2a2a4a" }}>
              <button onClick={handleExport}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
                내보내기 <span style={{ opacity: 0.7, fontSize: 12 }}>(200P)</span>
              </button>
              {subtitles.length > 0 && (
                <button onClick={() => {
                  const pad = n => String(Math.floor(n)).padStart(2,"0");
                  const fmtSrt = s => { const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=Math.floor(s%60); const ms=Math.round((s%1)*1000); return `${pad(h)}:${pad(m)}:${pad(sec)},${String(ms).padStart(3,"0")}`; };
                  const srt = subtitles.map((s,i) => `${i+1}\n${fmtSrt(s.start)} --> ${fmtSrt(s.end)}\n${s.text}\n`).join("\n");
                  const blob = new Blob([srt], {type:"text/plain;charset=utf-8"});
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "subtitles.srt"; a.click(); URL.revokeObjectURL(a.href);
                }}
                  style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "rgba(124,106,255,0.08)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  자막 다운로드 (SRT)
                </button>
              )}
              <button onClick={() => { setStep("upload"); setVideoSegs([]); setSubtitles([]); setSilenceRegions([]); setWaveformData(null); }}
                style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#666", fontSize: 11, cursor: "pointer" }}>
                처음으로
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Timeline (숏폼과 동일한 구조) ── */}
        <div style={{ flexShrink: 0, minHeight: 180, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", display: "flex", flexDirection: "column", position: "relative" }}>
          {/* 높이 조절 핸들 */}
          <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseDown={e => { e.preventDefault(); const startY = e.clientY; const startH = bottomPanelHeight; const onMove = ev => setBottomPanelHeight(Math.max(120, Math.min(400, startH - (ev.clientY - startY)))); const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: "#3a3a5a" }} />
          </div>

          {/* 툴바 (숏폼과 통일) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", borderBottom: "1px solid #1a1a30", flexShrink: 0, background: "#12122a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={splitAtPlayhead} title="현재 위치에서 영상 분할 (S)" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#f59e0b", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                분할 (S)
              </button>
              <button onClick={() => {
                pushUndo();
                const newSub = { start: playheadToAbsolute(playhead), end: playheadToAbsolute(playhead) + 3, text: "새 자막" };
                const subs = [...subtitles, newSub].sort((a, b) => a.start - b.start);
                setSubtitles(subs);
                setSelectedSubIdx(subs.findIndex(s => s.start === newSub.start));
              }} title="현재 위치에 자막 추가" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#a5b4fc", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                + 자막
              </button>
              {selectedSegIdx >= 0 && videoSegs.length > 1 && (
                <button onClick={() => deleteSegment(selectedSegIdx)} title="선택 구간 삭제" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  구간삭제
                </button>
              )}
              {selectedSubIdx >= 0 && (
                <button onClick={() => deleteSubtitle(selectedSubIdx)} title="선택 자막 삭제" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  자막삭제
                </button>
              )}
              <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 2px" }} />
              <span style={{ fontSize: 10, color: "#888" }}>볼륨</span>
              <input type="range" min={0} max={200} value={volume} onChange={e => setVolume(+e.target.value)} style={{ width: 60, accentColor: volume > 100 ? "#f59e0b" : "#4ade80" }} title={`볼륨 ${volume}%`} /><span style={{ fontSize: 10, color: volume > 100 ? "#f59e0b" : "#888", fontWeight: 700, minWidth: 30 }}>{volume}%</span>
              <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 2px" }} />
              <button onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                style={{ padding: "5px 10px", borderRadius: 6, border: subtitlesEnabled ? "1px solid #f59e0b" : "1px solid #2a2a4a", background: subtitlesEnabled ? "rgba(245,158,11,0.1)" : "#1a1a30", color: subtitlesEnabled ? "#f59e0b" : "#555", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                자막 {subtitlesEnabled ? "ON" : "OFF"}
              </button>
              {subtitlesEnabled && (
                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  <button onClick={() => setDualSubEnabled(!dualSubEnabled)} style={{ padding: "5px 8px", borderRadius: "6px 0 0 6px", border: dualSubEnabled ? "1px solid #22d3ee" : "1px solid #2a2a4a", borderRight: "none", background: dualSubEnabled ? "rgba(34,211,238,0.1)" : "#1a1a30", color: dualSubEnabled ? "#22d3ee" : "#555", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                    {dualSubEnabled ? "2" : "+"}번역
                  </button>
                  <select value={dualSubLang} onChange={e => { setDualSubLang(e.target.value); translateSubtitles(e.target.value); }}
                    style={{ padding: "5px 6px", borderRadius: "0 6px 6px 0", border: dualSubEnabled ? "1px solid #22d3ee" : "1px solid #2a2a4a", background: dualSubEnabled ? "rgba(34,211,238,0.08)" : "#1a1a30", color: dualSubEnabled ? "#22d3ee" : "#888", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
                    {SUB_LANGS.map(l => <option key={l[0]} value={l[0]}>{l[1]}</option>)}
                  </select>
                  {translating && <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", animation: "spin 0.8s linear infinite", marginLeft: 4 }} />}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {subtitles.length > 0 && (
                <button onClick={autoInsertMedia} disabled={autoMediaLoading}
                  style={{ padding: "5px 10px", borderRadius: 6, border: autoMediaLoading ? "1px solid #7c6aff40" : "1px solid #c084fc40", background: autoMediaLoading ? "rgba(124,106,255,0.1)" : "linear-gradient(135deg,rgba(124,106,255,0.1),rgba(236,72,153,0.08))", color: autoMediaLoading ? "#7c6aff" : "#c084fc", cursor: autoMediaLoading ? "wait" : "pointer", fontSize: 11, fontWeight: 700 }}>
                  {autoMediaLoading ? "AI 삽입중..." : "AI 미디어"}
                </button>
              )}
              <button onClick={doUndo} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: undoStack.current.length ? "#7c6aff" : "#444", cursor: "pointer", fontSize: 13 }} title="되돌리기 (Ctrl+Z)">↩</button>
              <button onClick={doRedo} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: redoStack.current.length ? "#7c6aff" : "#444", cursor: "pointer", fontSize: 13 }} title="다시실행 (Ctrl+Y)">↪</button>
              <div style={{ width: 1, height: 16, background: "#2a2a4a" }} />
              <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                처음
              </button>
              <span style={{ fontSize: 11, color: "#7c6aff", fontFamily: "monospace", fontWeight: 600 }}>{fmtLong(playheadToAbsolute(playhead))} | {fmtLong(videoDuration)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <button onClick={() => setTimelineZoom(z => Math.max(0.25, z - 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                <input type="range" min={25} max={800} value={timelineZoom * 100} onChange={e => setTimelineZoom(+e.target.value / 100)} style={{ width: 60, accentColor: "#7c6aff" }} />
                <button onClick={() => setTimelineZoom(z => Math.min(8, z + 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            </div>
          </div>

          {/* 타임라인 트랙 영역 (트랙 라벨 + 스크롤 트랙) */}
          <div style={{ height: Math.max(22 + TRACK_H * (3 + overlays.length) + 4, bottomPanelHeight - 40), display: "flex", overflow: "hidden" }}>
            {/* 트랙 라벨 (좌측 고정) */}
            <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
              <div style={{ height: 22 }} />
              {[...overlays.map((_,i) => [`V${i+2}`,"#ec4899"]), ["V1","#4a9eff"],["A1","#4ade80"],["S1","#f59e0b"]].map(([label,color]) => (
                <div key={label} style={{ height: TRACK_H, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1a1a25" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color }}>{label}</span>
                </div>
              ))}
            </div>

            {/* 스크롤 가능한 트랙 */}
            <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "default" }}
              onMouseDown={e => {
                const rect = timelineRef.current.getBoundingClientRect();
                const calcPh = (ev) => {
                  const x = ev.clientX - rect.left + timelineRef.current.scrollLeft;
                  return Math.max(0, Math.min(clipDuration, x / pxPerSec));
                };
                setPlayhead(calcPh(e));
                const onMove = (ev) => { setPlayhead(calcPh(ev)); };
                const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}>
              <div style={{ width: tlWidth, height: "100%", position: "relative" }}>
                {/* Ruler */}
                <div style={{ height: 22, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                  {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => i).filter(i => timelineZoom >= 2 ? true : timelineZoom >= 1 ? i % 2 === 0 : i % 5 === 0).map(sec => (
                    <div key={sec} style={{ position: "absolute", left: sec * pxPerSec, top: 0, height: "100%" }}>
                      <div style={{ width: 1, height: sec % 5 === 0 ? 8 : 4, background: sec % 5 === 0 ? "#444" : "#2a2a4a" }} />
                      {(sec % 5 === 0 || timelineZoom >= 2) && <span style={{ fontSize: 8, color: "#444", position: "absolute", left: 3, top: 7, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmtLong(sec)}</span>}
                    </div>
                  ))}
                </div>

                {/* 오버레이 트랙 (V2, V3...) */}
                {overlays.map((o, oi) => {
                  const left = o.start * pxPerSec;
                  const width = Math.max((o.end - o.start) * pxPerSec, 16);
                  const sel = selectedOverlay === o.id;
                  return (
                    <div key={o.id} style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                      <div
                        onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); setPropTab("overlay"); }}
                        onMouseDown={e => {
                          if (e.target.dataset?.handle) return;
                          e.stopPropagation(); e.preventDefault();
                          setSelectedOverlay(o.id);
                          const sx = e.clientX; const origStart = o.start; const dur2 = o.end - o.start;
                          const mv = ev => { const dt = (ev.clientX - sx) / pxPerSec; const ns = Math.max(0, Math.round((origStart + dt) * 10) / 10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: ns, end: ns + dur2 } : x)); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }}
                        style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: sel ? "rgba(236,72,153,0.4)" : "rgba(236,72,153,0.2)", border: `1.5px solid ${sel ? "#ec4899" : "rgba(236,72,153,0.4)"}`, borderRadius: 4, cursor: "grab", display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden", zIndex: sel ? 5 : 1 }}>
                        <span style={{ fontSize: 8, color: "#f9a8d4", fontWeight: 600, pointerEvents: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.type === "text" ? o.text : "Img"}</span>
                        <div data-handle="left" style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: sel ? "#ec4899" : "transparent", borderRadius: "4px 0 0 4px", opacity: 0.7 }}
                          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx2 = e.clientX; const os = o.start;
                            const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx2) / pxPerSec) * 10) / 10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: Math.min(ns, o.end - 0.5) } : x)); };
                            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                          }} />
                        <div data-handle="right" style={{ position: "absolute", right: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: sel ? "#ec4899" : "transparent", borderRadius: "0 4px 4px 0", opacity: 0.7 }}
                          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx2 = e.clientX; const oe = o.end;
                            const mv = ev => { const ne = Math.max(o.start + 0.5, Math.round((oe + (ev.clientX - sx2) / pxPerSec) * 10) / 10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, end: ne } : x)); };
                            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                          }} />
                      </div>
                    </div>
                  );
                })}

                {/* V1: Video segments (트림 핸들 추가) */}
                <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  {(() => {
                    let accum = 0;
                    return videoSegs.map((seg, i) => {
                      const segLen = seg.end - seg.start;
                      const left = accum * pxPerSec;
                      const width = segLen * pxPerSec;
                      accum += segLen;
                      const isSel = selectedSegIdx === i;
                      return (
                        <div key={i} onClick={e => { e.stopPropagation(); setSelectedSegIdx(i); setSelectedSubIdx(-1); }}
                          style={{
                            position: "absolute", left, top: 3, width, height: TRACK_H - 6,
                            background: isSel ? "linear-gradient(90deg,#4a9eff55,#4a9eff40)" : seg.muted ? "rgba(255,100,100,0.15)" : "linear-gradient(90deg,#4a9eff30,#4a9eff20)",
                            border: `1.5px solid ${isSel ? "#4a9eff" : seg.muted ? "#ff6464" : "#4a9eff50"}`,
                            borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                          }}>
                          <span style={{ fontSize: 8, color: "#4a9eff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(seg.start)}~{fmt(seg.end)}</span>
                          {seg.muted && <span style={{ fontSize: 9, color: "#ff6464", marginLeft: 4 }}>M</span>}
                          {/* 좌측 트림 */}
                          <div style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: isSel ? "#4a9eff" : "transparent", borderRadius: "4px 0 0 4px", opacity: 0.6 }}
                            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = seg.start;
                              const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx) / pxPerSec) * 10) / 10); setVideoSegs(prev => { const n = [...prev]; n[i] = { ...n[i], start: Math.min(ns, seg.end - 0.5) }; return n; }); };
                              const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                              window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                            }} />
                          {/* 우측 트림 */}
                          <div style={{ position: "absolute", right: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: isSel ? "#4a9eff" : "transparent", borderRadius: "0 4px 4px 0", opacity: 0.6 }}
                            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = seg.end;
                              const mv = ev => { const ne = Math.max(seg.start + 0.5, Math.round((oe + (ev.clientX - sx) / pxPerSec) * 10) / 10); setVideoSegs(prev => { const n = [...prev]; n[i] = { ...n[i], end: ne }; return n; }); };
                              const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                              window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                            }} />
                        </div>
                      );
                    });
                  })()}

                  {/* 무음 구간 표시 (반투명 빨간색) */}
                  {!silenceRemoved && silenceRegions.map((sil, i) => {
                    const left = absoluteToPlayhead(sil.start) * pxPerSec;
                    const width = (sil.end - sil.start) * pxPerSec;
                    return (
                      <div key={`sil-${i}`} style={{
                        position: "absolute", left, top: 0, height: TRACK_H, width: Math.max(width, 2),
                        background: "rgba(239,68,68,0.2)", borderLeft: "1px solid rgba(239,68,68,0.4)", borderRight: "1px solid rgba(239,68,68,0.4)",
                        pointerEvents: "none", zIndex: 1,
                      }} />
                    );
                  })}
                </div>

                {/* A1: Waveform */}
                <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  <svg style={{ position: "absolute", left: 0, top: 0, width: tlWidth, height: TRACK_H }} preserveAspectRatio="none">
                    {waveformData ? (
                      Array.from({ length: Math.min(waveformData.length, Math.floor(tlWidth / 2)) }, (_, i) => {
                        const idx = Math.floor(i * waveformData.length / Math.floor(tlWidth / 2));
                        const amp = Math.min(1, waveformData[idx] * 8);
                        const h = Math.max(2, amp * (TRACK_H - 4));
                        return <rect key={i} x={i * 2} y={(TRACK_H - h) / 2} width={1.5} height={h} fill="#4ade80" opacity={0.5} />;
                      })
                    ) : (
                      Array.from({ length: 80 }, (_, i) => {
                        const h = 3 + Math.abs(Math.sin(i * 0.4)) * 12;
                        return <rect key={i} x={i * (tlWidth / 80)} y={(TRACK_H - h) / 2} width={Math.max(1, tlWidth / 160)} height={h} fill="#4ade80" opacity={0.3} />;
                      })
                    )}
                  </svg>
                </div>

                {/* S1: Subtitles (트림 핸들 추가) */}
                <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  {subtitles.map((sub, i) => {
                    const relStart = absoluteToPlayhead(sub.start);
                    const relEnd = absoluteToPlayhead(sub.end || sub.start + 3);
                    const left = relStart * pxPerSec;
                    const nextSub = subtitles[i + 1];
                    let maxRight = relEnd * pxPerSec;
                    if (nextSub) {
                      const nextStart = absoluteToPlayhead(nextSub.start) * pxPerSec;
                      if (maxRight > nextStart) maxRight = nextStart - 1;
                    }
                    const width = Math.max(maxRight - left, 14);
                    const color = subColors[i % subColors.length];
                    const sel = selectedSubIdx === i;
                    return (
                      <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setSelectedSegIdx(-1); setPlayhead(relStart); }}
                        style={{
                          position: "absolute", left, top: 3, width, height: TRACK_H - 6,
                          background: sel ? `${color}50` : `${color}25`,
                          border: `1.5px solid ${sel ? color : `${color}50`}`,
                          borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden", zIndex: sel ? 5 : 1,
                        }}>
                        <span style={{ fontSize: 8, color: "#ddd", fontWeight: sel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{sub.text || `#${i + 1}`}</span>
                        {/* 좌측 트림 */}
                        <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = sub.start;
                            const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx) / pxPerSec) * 10) / 10); const n = [...subtitles]; n[i] = { ...n[i], start: Math.min(ns, (sub.end || sub.start + 3) - 0.5) }; setSubtitles(n); };
                            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                          }} />
                        {/* 우측 트림 */}
                        <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = sub.end || sub.start + 3;
                            const mv = ev => { const ne = Math.max(sub.start + 0.5, Math.round((oe + (ev.clientX - sx) / pxPerSec) * 10) / 10); const n = [...subtitles]; n[i] = { ...n[i], end: ne }; setSubtitles(n); };
                            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                          }} />
                      </div>
                    );
                  })}
                </div>

                {/* Playhead */}
                <div style={{ position: "absolute", left: playhead * pxPerSec, top: 0, bottom: 0, width: 2, background: "#ff3b3b", zIndex: 20, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 10, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
