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
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);

  // 비디오 전체 길이
  const [videoDuration, setVideoDuration] = useState(0);

  // 생성
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  // 속성 패널 탭
  const [propTab, setPropTab] = useState("silence"); // silence | caption | style

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
  }, [playhead, step, videoSegs]);

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

  // ── 볼륨 동기화 ──
  useEffect(() => { const v = videoRef.current; if (v) v.volume = volume / 100; }, [volume]);

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
  }, [silenceThreshold, silenceMinDuration]);

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

      // 3. STT (음성인식) - 전체 영상 자막 생성
      setLoadingMsg("음성 인식 중... (전체 자막 생성, 긴 영상은 시간이 걸릴 수 있습니다)");
      const sttResult = await apiCall(`/analyze/${d.file_id}`, {
        method: "POST",
        body: JSON.stringify({ max_segments: 1, longform: true, full_subtitles: true }),
        timeout: 600000, // 10분 타임아웃 (긴 영상 대응)
      });

      // 자막 추출 - 모든 세그먼트의 자막 합침
      const allSubs = [];
      for (const seg of (sttResult.segments || [])) {
        if (seg.subtitles) allSubs.push(...seg.subtitles);
      }
      // 자막이 없으면 스크립트에서 추출 시도
      if (allSubs.length === 0 && sttResult.segments?.[0]?.script) {
        const script = sttResult.segments[0].script;
        const chunks = script.match(/.{1,40}/g) || [];
        const segDur = (sttResult.segments[0].end_seconds || 60) / Math.max(1, chunks.length);
        chunks.forEach((text, i) => {
          allSubs.push({ start: Math.round(i * segDur * 100) / 100, end: Math.round((i + 1) * segDur * 100) / 100, text: text.trim() });
        });
      }
      setSubtitles(allSubs);

      // 비디오 세그먼트 (전체 영상)
      const seg = sttResult.segments?.[0];
      const dur = audioResult?.duration || (seg?.end_seconds || 60);
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
    setStep("loading"); setLoadingMsg("영상 다운로드 중..."); setError("");
    try {
      const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: parsed.url }), timeout: 120000 });
      setFileId(d.file_id);
      setLoadingMsg("음성 인식 중... (전체 자막 생성)");
      const sttResult = await apiCall(`/analyze/${d.file_id}`, {
        method: "POST", body: JSON.stringify({ max_segments: 1, longform: true, full_subtitles: true }), timeout: 600000,
      });
      const allSubs = [];
      for (const s of (sttResult.segments || [])) { if (s.subtitles) allSubs.push(...s.subtitles); }
      if (allSubs.length === 0 && sttResult.segments?.[0]?.script) {
        const script = sttResult.segments[0].script;
        const chunks = script.match(/.{1,40}/g) || [];
        const segDur = (sttResult.segments[0].end_seconds || 60) / Math.max(1, chunks.length);
        chunks.forEach((t, i) => { allSubs.push({ start: Math.round(i * segDur * 100) / 100, end: Math.round((i + 1) * segDur * 100) / 100, text: t.trim() }); });
      }
      setSubtitles(allSubs);
      const seg = sttResult.segments?.[0];
      const dur = seg?.end_seconds || 60;
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
      const poll = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          setJobStatus(j);
          window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
            detail: { action: "update", task: { id: "longform_gen", message: `편집 중... ${j.progress || 0}%`, progress: j.progress || 0 } }
          }));
          if (j.status === "complete") {
            clearInterval(poll);
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
            <button onClick={handleYoutube} style={{ ...btnStyle, opacity: !ytParsed ? 0.4 : 1 }} disabled={!ytParsed}>롱폼 편집 시작</button>
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
              롱폼 편집 시작
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
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: D ? "transparent" : "#f4f4f8" }}>
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
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: D ? "transparent" : "#f4f4f8" }}>
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
        <style>{`
          @keyframes lf-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        `}</style>

        {/* ── TOP: Preview + Right Panel ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* CENTER: 16:9 Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0, overflow: "hidden" }}>
            <div style={{ width: "min(100%, 800px)", maxHeight: "calc(100% - 60px)", aspectRatio: "16/9", borderRadius: 8, background: "#000", border: "2px solid #2a2a4a", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", position: "relative", flexShrink: 0 }}>
              <video ref={videoRef} src={sourceUrl || undefined}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                preload="metadata" playsInline
                onLoadedMetadata={e => { if (!videoDuration) setVideoDuration(e.target.duration); }}
              />

              {/* 자막 표시 */}
              {subtitlesEnabled && currentSub && (
                <div style={{
                  position: "absolute",
                  left: "50%", transform: "translateX(-50%)",
                  ...(captionStyle.position === "top" ? { top: "8%" } : captionStyle.position === "center" ? { top: "45%" } : { bottom: "8%" }),
                  maxWidth: "90%", textAlign: "center", zIndex: 10,
                  pointerEvents: "none",
                }}>
                  {renderAnimatedCaption(currentSub)}
                </div>
              )}
            </div>

            {/* 재생 컨트롤 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, width: "100%", maxWidth: 800 }}>
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
          <div style={{ width: rightPanelWidth, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 탭 */}
            <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
              {[["silence", "무음"], ["caption", "자막"], ["style", "스타일"]].map(([id, label]) => (
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
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
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
            </div>

            {/* 내보내기 버튼 */}
            <div style={{ padding: "12px", borderTop: "1px solid #2a2a4a" }}>
              <button onClick={handleExport}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer" }}>
                내보내기
              </button>
              <button onClick={() => { setStep("upload"); setVideoSegs([]); setSubtitles([]); setSilenceRegions([]); setWaveformData(null); }}
                style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#666", fontSize: 11, cursor: "pointer" }}>
                처음으로
              </button>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Timeline ── */}
        <div style={{ height: bottomPanelHeight, flexShrink: 0, background: "#12122a", borderTop: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          {/* 타임라인 컨트롤 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid #1a1a30", fontSize: 10 }}>
            <button onClick={splitAtPlayhead} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #2a2a4a", background: "transparent", color: "#888", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              분할 (S)
            </button>
            <button onClick={() => { if (selectedSegIdx >= 0 && videoSegs.length > 1) deleteSegment(selectedSegIdx); }}
              style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #2a2a4a", background: "transparent", color: selectedSegIdx >= 0 ? "#f87171" : "#444", cursor: selectedSegIdx >= 0 ? "pointer" : "default", fontSize: 10, fontWeight: 600 }}>
              삭제 (Del)
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ color: "#666" }}>줌</span>
            <input type="range" min={0.25} max={8} step={0.25} value={timelineZoom} onChange={e => setTimelineZoom(+e.target.value)}
              style={{ width: 80, accentColor: acc }} />
            <span style={{ color: "#888", fontFamily: "monospace" }}>{timelineZoom.toFixed(1)}x</span>
          </div>

          {/* 타임라인 트랙 */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative" }}
            onMouseDown={e => {
              // 타임라인 아무 곳 클릭/드래그로 플레이헤드 이동 (세그먼트/자막 클릭 제외)
              const rect = timelineRef.current.getBoundingClientRect();
              const calcPh = (ev) => {
                const x = ev.clientX - rect.left + timelineRef.current.scrollLeft - 30; // 30px = 트랙 라벨 너비
                return Math.max(0, Math.min(clipDuration, x / pxPerSec));
              };
              setPlayhead(calcPh(e));
              const onMove = (ev) => { setPlayhead(calcPh(ev)); };
              const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}>
            <div style={{ width: tlWidth, minHeight: "100%", position: "relative" }}>
              {/* Ruler */}
              <div data-ruler="true" style={{ height: 22, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => {
                  const isMajor = i % 5 === 0;
                  return (
                    <div key={i} style={{ position: "absolute", left: i * pxPerSec, top: 0, height: "100%", borderLeft: `1px solid ${isMajor ? "#333" : "#1a1a30"}` }}>
                      {isMajor && <span style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: "#555", fontFamily: "monospace" }}>{fmtLong(i)}</span>}
                    </div>
                  );
                })}
              </div>

              {/* V1: Video segments */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 28, height: "100%", background: "#12122a", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: "#4a9eff", fontWeight: 700 }}>V1</span>
                </div>
                {(() => {
                  let accum = 0;
                  return videoSegs.map((seg, i) => {
                    const segLen = seg.end - seg.start;
                    const left = accum * pxPerSec;
                    const width = segLen * pxPerSec;
                    accum += segLen;
                    return (
                      <div key={i} onClick={e => { e.stopPropagation(); setSelectedSegIdx(i); }}
                        style={{
                          position: "absolute", left: left + 30, top: 2, height: TRACK_H - 4, width: Math.max(width - 1, 4),
                          background: selectedSegIdx === i ? "rgba(74,158,255,0.35)" : seg.muted ? "rgba(255,100,100,0.15)" : "rgba(74,158,255,0.18)",
                          border: `1px solid ${selectedSegIdx === i ? "#4a9eff" : seg.muted ? "#ff6464" : "rgba(74,158,255,0.3)"}`,
                          borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                        }}>
                        <span style={{ fontSize: 9, color: "#4a9eff", fontFamily: "monospace", opacity: 0.7 }}>{fmt(seg.start)}~{fmt(seg.end)}</span>
                        {seg.muted && <span style={{ fontSize: 9, color: "#ff6464", marginLeft: 4 }}>M</span>}
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
                      position: "absolute", left: left + 30, top: 0, height: TRACK_H, width: Math.max(width, 2),
                      background: "rgba(239,68,68,0.2)", borderLeft: "1px solid rgba(239,68,68,0.4)", borderRight: "1px solid rgba(239,68,68,0.4)",
                      pointerEvents: "none", zIndex: 1,
                    }} />
                  );
                })}
              </div>

              {/* A1: Waveform */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 28, height: "100%", background: "#12122a", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 700 }}>A1</span>
                </div>
                {/* 실제 파형 또는 장식용 파형 */}
                <svg style={{ position: "absolute", left: 30, top: 0, width: tlWidth, height: TRACK_H }} preserveAspectRatio="none">
                  {waveformData ? (
                    // 실제 파형 데이터
                    Array.from({ length: Math.min(waveformData.length, Math.floor(tlWidth / 2)) }, (_, i) => {
                      const idx = Math.floor(i * waveformData.length / Math.floor(tlWidth / 2));
                      const amp = Math.min(1, waveformData[idx] * 8);
                      const h = Math.max(2, amp * (TRACK_H - 4));
                      return <rect key={i} x={i * 2} y={(TRACK_H - h) / 2} width={1.5} height={h} fill="#4ade80" opacity={0.5} />;
                    })
                  ) : (
                    // 장식용
                    Array.from({ length: 80 }, (_, i) => {
                      const h = 3 + Math.abs(Math.sin(i * 0.4)) * 12;
                      return <rect key={i} x={i * (tlWidth / 80)} y={(TRACK_H - h) / 2} width={Math.max(1, tlWidth / 160)} height={h} fill="#4ade80" opacity={0.3} />;
                    })
                  )}
                </svg>
              </div>

              {/* S1: Subtitles */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 28, height: "100%", background: "#12122a", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>S1</span>
                </div>
                {subtitles.map((sub, i) => {
                  const relStart = absoluteToPlayhead(sub.start);
                  const relEnd = absoluteToPlayhead(sub.end || sub.start + 3);
                  const left = relStart * pxPerSec;
                  const width = Math.max((relEnd - relStart) * pxPerSec, 4);
                  return (
                    <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setPlayhead(relStart); }}
                      style={{
                        position: "absolute", left: left + 30, top: 3, height: TRACK_H - 6, width,
                        background: selectedSubIdx === i ? `${subColors[i % subColors.length]}40` : `${subColors[i % subColors.length]}20`,
                        border: `1px solid ${selectedSubIdx === i ? subColors[i % subColors.length] : subColors[i % subColors.length] + "50"}`,
                        borderRadius: 3, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 4,
                      }}>
                      <span style={{ fontSize: 8, color: subColors[i % subColors.length], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Playhead */}
              <div style={{ position: "absolute", left: playhead * pxPerSec + 30, top: 0, bottom: 0, width: 2, background: "#ef4444", zIndex: 20, pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: -1, left: -5, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #ef4444" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
