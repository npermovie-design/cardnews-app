import { useState, useRef, useEffect } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";

const API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// YouTube URL 정규화 및 검증
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

const TEMPLATES = [
  { id: "minimal", name: "미니멀", titleColor: "#FFFFFF", captionColor: "#FFFFFF", bg: "#000" },
  { id: "bold", name: "볼드", titleColor: "#FFD700", captionColor: "#FFD700", bg: "#0A0A0A" },
  { id: "neon", name: "네온", titleColor: "#00FF88", captionColor: "#00FF88", bg: "#0D0D1A" },
  { id: "pastel", name: "파스텔", titleColor: "#FFB6C1", captionColor: "#FFB6C1", bg: "#1A1A2E" },
  { id: "news", name: "뉴스", titleColor: "#FFFFFF", captionColor: "#FFFFFF", bg: "#0F1923" },
];

const LENGTHS = [
  { id: "s15", label: "15~30초", desc: "짧고 임팩트 있게" },
  { id: "s30", label: "30~60초", desc: "적당한 길이로" },
  { id: "s60", label: "60~90초", desc: "충분한 내용으로" },
  { id: "s90", label: "90~120초", desc: "아주 길게" },
];

export default function ShortsCreator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const acc = "#7c6aff";

  // ── 상태 ─────────────────────────
  const [step, setStep] = useState("upload"); // upload, loading, analysis, edit, generate, result
  const [inputMode, setInputMode] = useState("youtube"); // youtube, file
  const [ytUrl, setYtUrl] = useState("");
  const [ytParsed, setYtParsed] = useState(null); // { id, url } or null
  const [videoFile, setVideoFile] = useState(null);
  const [downloadHelper, setDownloadHelper] = useState(null); // { id, url, title, thumbnail } when Render download fails
  const [subFile, setSubFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [fontFile, setFontFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  useGeneratingGuard(step === "loading", 10, "shorts_make");

  // 분석 결과
  const [segments, setSegments] = useState([]);
  const [selectedSegs, setSelectedSegs] = useState([]);

  // 편집
  const [editClips, setEditClips] = useState([]);
  const [editIdx, setEditIdx] = useState(0);
  const [template, setTemplate] = useState("minimal");
  // 제목 스타일
  const [titleStyle, setTitleStyle] = useState({ color: "#FFFFFF", fontSize: 20, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.75)", opacity: 100 });
  // 자막 스타일
  const [captionStyle, setCaptionStyle] = useState({ color: "#FFFFFF", fontSize: 15, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.7)", opacity: 100 });
  // 호환성
  const titleColor = titleStyle.color;
  const captionColor = captionStyle.color;
  const fontSize = titleStyle.fontSize;
  const [removeSilence, setRemoveSilence] = useState(false);
  const [maxChars, setMaxChars] = useState(0);
  const [shortsLength, setShortsLength] = useState("s30");
  const [userPrompt, setUserPrompt] = useState(""); // 사용자 분석 요청 프롬프트

  // 생성
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // 타임라인 에디터
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [selectedSubIdx, setSelectedSubIdx] = useState(-1);

  // 오버레이 (이미지/로고/텍스트)
  const [overlays, setOverlays] = useState([]); // { id, type:'image'|'text'|'logo', src, text, x, y, w, h, start, end }
  const [selectedOverlay, setSelectedOverlay] = useState(null);
  // 자막/제목 위치 (드래그 가능)
  const [titlePos, setTitlePos] = useState({ x: 50, y: 8 }); // % 기준
  const [captionPos, setCaptionPos] = useState({ x: 50, y: 88 }); // % 기준
  const [dragging, setDragging] = useState(null); // 'title' | 'caption' | overlay id | null
  // 속성 패널 탭
  const [propTab, setPropTab] = useState("style"); // style | overlay
  // 레이아웃 모드: full(전체화면) | bars(검은바+중앙영상)
  const [layoutMode, setLayoutMode] = useState("bars");
  // 스냅 가이드 표시
  const [snapGuide, setSnapGuide] = useState(null);
  // 영상 스케일 (%)
  const [videoScale, setVideoScale] = useState(100);
  // 선택된 트랙 요소
  const [selectedTrack, setSelectedTrack] = useState(null); // "V1" | "A1" | null

  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const playIntervalRef = useRef(null);
  const timelineRef = useRef(null);
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const overlayFileRef = useRef(null);

  // ── YouTube URL 파싱 ─────────────────────
  useEffect(() => {
    setYtParsed(parseYoutubeUrl(ytUrl));
  }, [ytUrl]);

  // ── 상태 변경 알림 ─────────────────────
  useEffect(() => {
    if (onStatusChange) onStatusChange(step);
  }, [step]);

  // ── 타이머 ─────────────────────────
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

  // ── 현재 클립 (타임라인 등에서 사용) ────────────
  const curClip = editClips[editIdx] || {};
  const updateClip = (key, val) => {
    setEditClips(prev => { const n = [...prev]; n[editIdx] = { ...n[editIdx], [key]: val }; return n; });
  };

  // ── 비디오 ↔ playhead 동기화 (버벅임 방지) ──────────────
  const seekingRef = useRef(false);

  // seek: 재생 중이 아닐 때만 currentTime 설정 (재생 중엔 video가 자체 관리)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit" || isPlaying) return;
    const clip = editClips[editIdx];
    if (!clip) return;
    const target = (clip.start_seconds || 0) + playhead;
    if (Math.abs(v.currentTime - target) > 0.3) {
      seekingRef.current = true;
      v.currentTime = target;
    }
  }, [playhead, editIdx, step]);

  // play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit") return;
    if (isPlaying) {
      const clip = editClips[editIdx];
      if (clip) v.currentTime = (clip.start_seconds || 0) + playhead;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, step]);

  // video timeupdate → playhead (재생 중에만, requestAnimationFrame 사용)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf;
    const tick = () => {
      if (!isPlaying) return;
      const clip = editClips[editIdx];
      if (clip) {
        const rel = v.currentTime - (clip.start_seconds || 0);
        const dur = (clip.end_seconds || 30) - (clip.start_seconds || 0);
        if (rel >= dur) { setIsPlaying(false); setPlayhead(dur); return; }
        setPlayhead(Math.max(0, rel));
      }
      raf = requestAnimationFrame(tick);
    };
    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isPlaying, editIdx]);

  // 드래그 핸들러 (자막/제목 위치) + 스냅 가이드
  const SNAP_THRESHOLD = 4; // px 기준 스냅 범위
  const SNAP_POINTS = { x: [10, 25, 50, 75, 90], y: [8, 15, 25, 50, 75, 85, 92] }; // %
  const handlePreviewMouseDown = (target, e) => {
    e.preventDefault();
    setDragging(target);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const onMove = (ev) => {
      let cx = ((ev.clientX - rect.left) / rect.width) * 100;
      let cy = ((ev.clientY - rect.top) / rect.height) * 100;
      let x = Math.max(5, Math.min(95, cx));
      let y = Math.max(3, Math.min(97, cy));
      // 스냅
      let guide = null;
      for (const sp of SNAP_POINTS.x) {
        if (Math.abs(x - sp) < SNAP_THRESHOLD) { x = sp; guide = { axis: "x", pos: sp }; break; }
      }
      for (const sp of SNAP_POINTS.y) {
        if (Math.abs(y - sp) < SNAP_THRESHOLD) { y = sp; guide = guide ? { ...guide, y: sp, axis: "both" } : { axis: "y", pos: sp }; break; }
      }
      setSnapGuide(guide);
      if (target === "title") setTitlePos({ x, y });
      else if (target === "caption") setCaptionPos({ x, y });
      else setOverlays(prev => prev.map(o => o.id === target ? { ...o, x, y } : o));
    };
    const onUp = () => { setDragging(null); setSnapGuide(null); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // 오버레이 추가
  const addOverlay = (type, data = {}) => {
    const id = "ol_" + Date.now();
    const base = { id, type, x: 50, y: 50, w: 20, h: 20, start: 0, end: clipDuration, ...data };
    if (type === "text") { base.text = "텍스트"; base.fontSize = 16; base.color = "#fff"; }
    if (type === "logo") { base.w = 15; base.h = 15; base.x = 85; base.y = 10; }
    setOverlays(prev => [...prev, base]);
    setSelectedOverlay(id);
  };

  // 이미지/로고 파일 선택
  const handleOverlayFile = (type) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addOverlay(type, { src: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── 타임라인 재생 ─────────────────────
  const clipDuration = (() => {
    const subs = curClip.subtitles || [];
    if (subs.length === 0) return 30;
    const maxEnd = Math.max(...subs.map(s => s.end || s.start + 3));
    return Math.max(maxEnd, 10);
  })();

  const currentSub = (curClip.subtitles || []).find(s => playhead >= s.start && playhead < (s.end || s.start + 3));

  const subColors = ["#7c6aff", "#ff6a8a", "#6affb2", "#ffd76a", "#6ac4ff", "#ff9f6a", "#c46aff", "#6afff0"];

  useEffect(() => {
    if (isPlaying && step === "edit") {
      playIntervalRef.current = setInterval(() => {
        setPlayhead(prev => {
          if (prev >= clipDuration) { setIsPlaying(false); return 0; }
          return Math.min(prev + 0.1, clipDuration);
        });
      }, 100);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, step, clipDuration]);

  // ── API 호출 ────────────────────────
  const apiCall = async (path, opts = {}) => {
    const timeout = opts.timeout || 60000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch(`${API}${path}`, { ...opts, signal: controller.signal, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `요청 실패 (${r.status})`); }
      return r.json();
    } finally { clearTimeout(timer); }
  };

  // 유튜브 링크 분석 (Vercel API 활용 — shorts-factory 불필요)
  const handleYoutube = async () => {
    const parsed = parseYoutubeUrl(ytUrl);
    if (!parsed) { setError("올바른 유튜브 링크를 입력해주세요"); return; }
    setStep("loading"); setLoadingMsg("영상 다운로드 중..."); setError("");
    try {
      // Render 서버로 다운로드 (Residential 프록시 사용)
      setLoadingMsg("영상 다운로드 중... (최대 2분 소요)");
      const downloadBody = { url: parsed.url };
      const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify(downloadBody), timeout: 180000 });
      setFileId(d.file_id);
      setLoadingMsg("음성 인식 + AI 분석 중...");
      const analyzeBody = { max_chars: maxChars };
      if (userPrompt.trim()) analyzeBody.user_prompt = userPrompt.trim();
      const ad = await apiCall(`/analyze/${d.file_id}`, { method: "POST", body: JSON.stringify(analyzeBody), timeout: 180000 });
      setSegments(ad.segments || []);
      setSelectedSegs(ad.segments?.map((_, i) => i) || []);
      setStep("analysis");
    } catch (e) {
      // Render 서버 다운로드 실패 → 다운로드 도우미 모드로 전환
      const parsed = parseYoutubeUrl(ytUrl);
      if (parsed) {
        // oEmbed로 영상 제목 가져오기 시도
        let ytTitle = "";
        try {
          const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(parsed.url)}`);
          if (oembed.ok) {
            const data = await oembed.json();
            ytTitle = data.title || "";
          }
        } catch {}
        setDownloadHelper({
          id: parsed.id,
          url: parsed.url,
          title: ytTitle || `YouTube 영상 (${parsed.id})`,
          thumbnail: `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`,
        });
        setInputMode("file");
        setError("");
      } else {
        setError(e.message);
      }
      setStep("upload");
    }
  };

  // 파일 업로드
  const handleUpload = async () => {
    if (!videoFile) return;
    setStep("loading"); setLoadingMsg("업로드 중..."); setError("");
    try {
      const form = new FormData();
      form.append("video", videoFile);
      if (subFile) form.append("subtitle", subFile);
      if (logoFile) form.append("logo", logoFile);
      if (fontFile) form.append("custom_font", fontFile);
      const r = await fetch(`${API}/upload`, { method: "POST", body: form }).catch(() => null);
      if (!r) throw new Error("숏츠 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.detail || `업로드 실패 (${r.status})`);
      }
      const d = await r.json();
      setFileId(d.file_id);
      setLoadingMsg("음성 인식 + AI 분석 중...");
      await doAnalyze(d.file_id);
    } catch (e) { setError(e.message); setStep("upload"); }
  };

  // 분석
  const doAnalyze = async (fid) => {
    setLoadingMsg("AI가 영상을 분석하고 있어요...");
    try {
      const analyzeBody = { max_chars: maxChars };
      if (userPrompt.trim()) analyzeBody.user_prompt = userPrompt.trim();
      const d = await apiCall(`/analyze/${fid}`, { method: "POST", body: JSON.stringify(analyzeBody) });
      setSegments(d.segments || []);
      setSelectedSegs(d.segments?.map((_, i) => i) || []);
      setStep("analysis");
    } catch (e) { setError("분석 실패: " + e.message); setStep("upload"); }
  };

  // 편집으로 이동
  const goToEdit = () => {
    const clips = selectedSegs.map(i => {
      const s = segments[i];
      return {
        ...s,
        title: s.hook || s.hook_text || s.title || "",
        subtitle_text: s.title || s.seo_title || "",
        script: s.script || "",
        subtitles: s.subtitles || (s.script ? s.script.match(/.{1,30}/g)?.map((t, j) => ({ start: j * 3, end: (j + 1) * 3, text: t })) || [] : []),
      };
    });
    setEditClips(clips);
    setEditIdx(0);
    setStep("edit");
  };

  // 생성
  const handleGenerate = async () => {
    if (showPointConfirm && user && !(await showPointConfirm(80))) return;
    setStep("generate"); setResults([]); setPreviewIdx(0);

    // 백그라운드 인디케이터 등록
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
      detail: { action: "register", task: { id: "shorts_gen", type: "shorts_make", message: "영상 생성 중... (0/" + editClips.length + ")" } }
    }));

    try {
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({ file_id: fileId, clips: editClips, remove_silence: removeSilence, template, title_color: titleColor, caption_color: captionColor }),
      });
      setJobId(d.job_id);
      const poll = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          setJobStatus(j);
          setResults(j.results || []);
          const done = (j.results || []).filter(r => r.type === "done").length;
          const total = editClips.length;

          // 백그라운드 인디케이터 업데이트
          window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
            detail: { action: "update", task: { id: "shorts_gen", message: `영상 생성 중... (${done}/${total})`, progress: Math.round(done / total * 100) } }
          }));

          if (j.status === "complete") {
            clearInterval(poll);
            // 완료 알림
            window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
              detail: { action: "complete", task: { id: "shorts_gen", message: `쇼츠 ${done}개 생성 완료!` } }
            }));
            // 보관함에 저장
            try {
              const saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
              (j.results || []).filter(r => r.type === "done").forEach((r, idx) => {
                saves.unshift({
                  id: Date.now().toString() + idx,
                  type: "shorts",
                  title: editClips[r.index]?.title || `Short ${r.index + 1}`,
                  content: `[쇼츠 영상] ${editClips[r.index]?.subtitle_text || ""}\n${(editClips[r.index]?.subtitles || []).map(s => s.text).join("\n")}`,
                  date: new Date().toLocaleDateString("ko-KR"),
                  videoUrl: `${API}/outputs/${fileId}/${r.filename}`,
                });
              });
              localStorage.setItem("sns_blog_saves_v1", JSON.stringify(saves.slice(0, 100)));
            } catch {}
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError("생성 실패: " + e.message);
      window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
        detail: { action: "complete", task: { id: "shorts_gen", message: "생성 실패" } }
      }));
    }
  };

  // 연계
  const linkTo = (target, idx) => {
    const clip = editClips[idx] || editClips[0];
    const content = (clip?.subtitles || []).map(s => s.text).join(" ");
    try { localStorage.setItem("shorts_linked_data", JSON.stringify({ title: clip?.title || "", content, hook: clip?.hook_text || "" })); } catch {}
    setAiMenu(target);
  };

  const fmt = s => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };

  const btnStyle = { padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, width: "100%", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" };
  const cardStyle = { background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 13, outline: "none" };
  const tabBtn = (active) => ({ flex: 1, padding: "12px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, borderRadius: 0, background: active ? `linear-gradient(135deg,${acc},#8b5cf6)` : "transparent", color: active ? "#fff" : muted });

  // ═══════════════════════════════════
  // Step: 업로드
  // ═══════════════════════════════════
  if (step === "upload") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      {/* 헤더 - 글쓰기 스타일 */}
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, letterSpacing: -0.5 }}>영상 제작</div>
        <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>유튜브 링크 또는 영상 파일로 AI가 쇼츠를 자동 제작해요</div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 24, border: `1px solid ${bdr}` }}>
          <button onClick={() => { setInputMode("youtube"); setDownloadHelper(null); }} style={{ ...tabBtn(inputMode === "youtube"), display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><img src="/icon-youtube.png" alt="" style={{ width:18, height:13, objectFit:"contain" }} /> 유튜브 링크</button>
          <button onClick={() => setInputMode("file")} style={tabBtn(inputMode === "file")}>📁 파일 업로드</button>
        </div>

        {inputMode === "youtube" ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>유튜브 영상 URL *</div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔗</span>
              <input value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                onPaste={e => {
                  const pasted = e.clipboardData.getData("text");
                  if (pasted && parseYoutubeUrl(pasted)) {
                    e.preventDefault();
                    setYtUrl(pasted.trim());
                  }
                }}
                placeholder="https://www.youtube.com/watch?v=... 또는 youtu.be/..."
                style={{ ...inputStyle, paddingLeft: 38, paddingRight: ytParsed ? 38 : 14 }} />
              {ytParsed && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#4ade80" }}>✓</span>}
            </div>
            {ytUrl.trim() && !ytParsed && (
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8, paddingLeft: 4 }}>
                올바른 유튜브 링크 형식이 아닙니다 (youtube.com/watch?v=... 또는 youtu.be/...)
              </div>
            )}
            {ytParsed && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: 12 }}>
                <img src={`https://img.youtube.com/vi/${ytParsed.id}/mqdefault.jpg`} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: acc }}>유튜브 영상 감지됨</div>
                  <div style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ID: {ytParsed.id}</div>
                </div>
              </div>
            )}
            <button onClick={handleYoutube} style={{ ...btnStyle, opacity: !ytParsed ? 0.4 : 1 }} disabled={!ytParsed}>쇼츠로 변환하기 →</button>
          </div>
        ) : (
          <div>
            {/* 다운로드 도우미 (Render 서버 실패 시 표시) */}
            {downloadHelper && (
              <div style={{ ...cardStyle, marginBottom: 16, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)", border: `1px solid ${acc}30` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <img src={downloadHelper.thumbnail} alt="" style={{ width: 100, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: text, lineHeight: 1.4, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{downloadHelper.title}</div>
                    <div style={{ fontSize: 11, color: muted }}>ID: {downloadHelper.id}</div>
                  </div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: D ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${bdr}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15 }}>&#9888;&#65039;</span> 서버 다운로드 실패 - 직접 다운로드가 필요합니다
                  </div>
                  <div style={{ fontSize: 12, color: text, lineHeight: 1.8, opacity: 0.85 }}>
                    <div style={{ marginBottom: 6 }}>아래 단계를 따라주세요:</div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: `${acc}20`, color: acc, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                      <span>아래 다운로드 사이트에서 영상을 <b>MP4</b>로 다운로드하세요</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: `${acc}20`, color: acc, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                      <span>다운로드된 파일을 아래 업로드 영역에 선택하세요</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: `${acc}20`, color: acc, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
                      <span>&quot;쇼츠 생성해보기&quot; 버튼을 클릭하면 AI가 분석을 시작합니다</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`https://ssyoutube.com/watch?v=${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 10, background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                    ssyoutube.com
                  </a>
                  <a href={`https://www.y2mate.com/youtube/${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                    y2mate.com
                  </a>
                  <a href={`https://en.savefrom.net/1-youtube-video-downloader-${downloadHelper.id}/`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 10, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                    savefrom.net
                  </a>
                </div>
                <button onClick={() => setDownloadHelper(null)} style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>닫기</button>
              </div>
            )}

            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${bdr}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: ibg }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${acc}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <span style={{ fontSize: 24 }}>⬆️</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{downloadHelper ? "다운로드한 영상 파일을 선택하세요" : "영상 파일을 클릭하여 선택하세요"}</div>
              <div style={{ fontSize: 12, color: muted }}>MP4, MOV, AVI (+ SRT 자막 선택)</div>
              <input ref={fileRef} type="file" accept=".mp4,.mkv,.avi,.mov,.srt,.txt" multiple style={{ display: "none" }}
                onChange={e => { for (const f of e.target.files) { const ext = f.name.split(".").pop().toLowerCase(); if (["mp4", "mkv", "avi", "mov"].includes(ext)) setVideoFile(f); else if (["srt", "txt"].includes(ext)) setSubFile(f); } }} />
            </div>
            {videoFile && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: acc, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${acc}15` }}>{videoFile.name}</span>
                {subFile && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.1)" }}>{subFile.name}</span>}
                {!subFile && <span style={{ fontSize: 11, color: muted }}>자막 없음 · AI 음성인식</span>}
              </div>
            )}
            <button onClick={handleUpload} style={btnStyle} disabled={!videoFile}>쇼츠 생성해보기 →</button>
          </div>
        )}

        {/* 분석 요청 프롬프트 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 6 }}>분석 요청 (선택)</div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, lineHeight: 1.5 }}>원하는 부분만 추출하고 싶을 때 AI에게 요청해보세요</div>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="원하는 부분을 설명해주세요 (예: 가장 재미있는 부분만, 핵심 요약만, 특정 주제 관련 부분만)"
            rows={3}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }}
          />
        </div>

        {/* 설정 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>세부 설정</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>⏱ 쇼츠 길이</div>
          <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
            {LENGTHS.map(l => (
              <button key={l.id} onClick={() => setShortsLength(l.id)}
                style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${shortsLength === l.id ? acc : bdr}`, background: shortsLength === l.id ? `${acc}15` : "transparent", color: shortsLength === l.id ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                <div>{l.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>📝 자막 글자수</div>
          <div className="ai-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {[[0, "자동"], [8, "8자"], [15, "15자"], [25, "25자"]].map(([v, l]) => (
              <button key={v} onClick={() => setMaxChars(v)}
                style={{ padding: "8px", borderRadius: 8, border: `1.5px solid ${maxChars === v ? acc : bdr}`, background: maxChars === v ? `${acc}15` : "transparent", color: maxChars === v ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>
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
        @keyframes shorts-icon-bounce{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-8px) rotate(-5deg)}50%{transform:translateY(0) rotate(0deg)}75%{transform:translateY(-4px) rotate(5deg)}}
        @keyframes shorts-ring-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shorts-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
      `}</style>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 20px" }}>
        {/* 애니메이션 아이콘 */}
        <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, borderRightColor: acc, animation: "shorts-ring-spin 1.5s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: "shorts-icon-bounce 2s ease-in-out infinite" }}>
              <rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8" />
              <polygon points="10,8 17,12 10,16" fill={acc} />
            </svg>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8 }}>AI가 영상을 분석하고 있어요</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 20, animation: "shorts-pulse 2s ease-in-out infinite" }}>{loadingMsg}</div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: muted }}>⏱ 경과 시간: {Math.floor(elapsed / 60)}분 {elapsed % 60}초</div>
          <div style={{ fontSize: 11, color: acc, fontWeight: 600, marginTop: 6 }}>다른 메뉴로 이동해도 분석이 계속됩니다</div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 분석 결과 (Opus.pro 스타일)
  // ═══════════════════════════════════
  if (step === "analysis") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: `${acc}15`, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: acc }}>AI가 {segments.length}개 쇼츠 구간을 찾았어요</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: text }}>추천 쇼츠 클립</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>프롬프트 기반으로 분석된 최적의 구간입니다</div>
        </div>
        {segments.map((s, i) => {
          const selected = selectedSegs.includes(i);
          const title = s.title || s.hook_text || `Short ${i+1}`;
          const script = s.script || s.reason || "";
          const hook = s.hook || s.hook_text || "";
          const reason = s.reason || "";
          const hasTime = s.start_seconds != null;
          return (
            <div key={i} onClick={() => setSelectedSegs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
              style={{ ...cardStyle, cursor: "pointer", borderColor: selected ? acc : bdr, background: selected ? (D ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)") : card, transition: "all 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${selected ? acc : bdr}`, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? acc : "transparent", flexShrink: 0 }}>
                    {selected ? <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span> : <span style={{ color: muted, fontSize: 12 }}>{i+1}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: text }}>{title}</div>
                    {hasTime && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${acc}12`, color: acc, fontWeight: 600 }}>{fmt(s.start_seconds)} ~ {fmt(s.end_seconds)}</span>}
                  </div>
                </div>
                {s.score && <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{s.score}점</span>
                </div>}
              </div>
              {hook && <div style={{ fontSize: 13, fontWeight: 600, color: acc, marginBottom: 6, padding: "6px 10px", borderRadius: 8, background: `${acc}08`, borderLeft: `3px solid ${acc}` }}>🎬 {hook}</div>}
              {script && <div style={{ fontSize: 12, color: text, lineHeight: 1.7, marginBottom: 6, opacity: 0.85 }}>{script.slice(0, 200)}{script.length > 200 ? "..." : ""}</div>}
              {reason && reason !== script && <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>💡 {reason.slice(0, 120)}</div>}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={() => { setStep("upload"); setSegments([]); }} style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>← 다시 분석</button>
          <button onClick={goToEdit} disabled={selectedSegs.length === 0} style={{ ...btnStyle, flex: 1, opacity: selectedSegs.length === 0 ? 0.4 : 1 }}>
            {selectedSegs.length}개 구간 편집하기 →
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 편집 (프로 비디오 에디터)
  // ═══════════════════════════════════
  if (step === "edit") {
  const pxPerSec = 20 * timelineZoom;
  const tlWidth = Math.max(clipDuration * pxPerSec, 800);
  const TRACK_H = 32;
  // 동적 트랙: 기본 V1/A1/S1 + 오버레이마다 트랙 추가
  const baseTracks = [
    { id: "V1", label: "V1", color: "#4a9eff" },
    { id: "A1", label: "A1", color: "#4ade80" },
    { id: "S1", label: "S1", color: "#f59e0b" },
  ];
  const overlayTracks = overlays.map((o, i) => ({
    id: o.id, label: o.type === "text" ? `T${i+1}` : o.type === "logo" ? `L${i+1}` : `I${i+1}`,
    color: "#ec4899", overlay: o,
  }));
  const allTracks = [...baseTracks, ...overlayTracks];
  const sourceUrl = fileId ? `${API}/source/${fileId}` : null;
  const visibleOverlays = overlays.filter(o => playhead >= o.start && playhead <= o.end);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
      {/* 숨겨진 오버레이 파일 input */}
      <input ref={overlayFileRef} type="file" accept="image/*" style={{ display: "none" }} />

      {/* Top 3-panel area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Clip list */}
        <div style={{ width: 180, flexShrink: 0, background: "#16162a", borderRight: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 12px 8px", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>클립 목록</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {editClips.map((c, i) => (
              <div key={i} onClick={() => { setEditIdx(i); setSelectedSubIdx(-1); setPlayhead(0); setIsPlaying(false); }}
                style={{ padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: editIdx === i ? "rgba(124,106,255,0.18)" : "transparent", borderLeft: `3px solid ${editIdx === i ? "#7c6aff" : "transparent"}`, transition: "all 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: editIdx === i ? "#7c6aff" : "#ccc" }}>Short {i + 1}</div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{fmt(c.start_seconds)} ~ {fmt(c.end_seconds)}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "제목 없음"}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px", borderTop: "1px solid #2a2a4a" }}>
            <button onClick={() => setStep("analysis")} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer" }}>← 구간 선택</button>
          </div>
        </div>

        {/* CENTER: Preview (검은바 레이아웃 + 드래그 가능 오버레이) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          {/* 레이아웃 전환 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[["bars","검은바"],["full","전체화면"]].map(([k,l]) => (
              <button key={k} onClick={() => setLayoutMode(k)}
                style={{ padding: "4px 12px", borderRadius: 6, border: layoutMode===k ? "1px solid #7c6aff" : "1px solid #2a2a4a", background: layoutMode===k ? "rgba(124,106,255,0.15)" : "#1a1a30", color: layoutMode===k ? "#a5b4fc" : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{l}</button>
            ))}
          </div>

          {/* 9:16 프리뷰 (대형) */}
          <div ref={previewRef} style={{ width: 360, height: 640, borderRadius: 8, background: "#000", border: "2px solid #2a2a4a", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", flexShrink: 0, position: "relative", userSelect: "none" }}>

            {layoutMode === "bars" ? (<>
              {/* 검은바 레이아웃: 상단바 + 영상 + 하단바 */}
              {/* 상단 검은바 (제목) */}
              <div onMouseDown={e => handlePreviewMouseDown("title", e)}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: "22%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", zIndex: 10, cursor: "move", border: dragging === "title" ? "2px solid #7c6aff" : "2px solid transparent", opacity: titleStyle.opacity / 100 }}>
                <span style={{
                  fontSize: Math.min(titleStyle.fontSize + 2, 28), fontWeight: 900, color: titleStyle.color,
                  textAlign: "center", lineHeight: 1.3, maxWidth: "90%", wordBreak: "keep-all",
                  textShadow: titleStyle.shadow ? "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)" : "none",
                  WebkitTextStroke: titleStyle.border ? `1px ${titleStyle.borderColor}` : "none",
                  background: titleStyle.bgBox ? titleStyle.bgColor : "transparent",
                  padding: titleStyle.bgBox ? "4px 12px" : 0, borderRadius: titleStyle.bgBox ? 6 : 0,
                }}>{curClip.title || "제목을 입력하세요"}</span>
              </div>

              {/* 중앙 영상 (원본 비율 유지) */}
              <div style={{ position: "absolute", top: "22%", left: 0, right: 0, bottom: "22%", overflow: "hidden", background: "#000" }}>
                <video ref={videoRef} src={sourceUrl || undefined}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                  preload="metadata" playsInline />
                {!sourceUrl && (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.5)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.3"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                  </div>
                )}
              </div>

              {/* 하단 검은바 (자막) */}
              <div onMouseDown={e => handlePreviewMouseDown("caption", e)}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "22%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", zIndex: 10, cursor: "move", border: dragging === "caption" ? "2px solid #f59e0b" : "2px solid transparent", opacity: captionStyle.opacity / 100 }}>
                <span style={{
                  fontSize: Math.min(captionStyle.fontSize, 22), color: captionStyle.color, fontWeight: 700,
                  textAlign: "center", lineHeight: 1.4, maxWidth: "90%", wordBreak: "keep-all",
                  textShadow: captionStyle.shadow ? "0 2px 6px rgba(0,0,0,0.8)" : "none",
                  WebkitTextStroke: captionStyle.border ? `1px ${captionStyle.borderColor}` : "none",
                  background: captionStyle.bgBox ? captionStyle.bgColor : "transparent",
                  padding: captionStyle.bgBox ? "4px 12px" : 0, borderRadius: captionStyle.bgBox ? 6 : 0,
                }}>
                  {currentSub ? currentSub.text : (curClip.subtitle_text || "자막 영역")}
                </span>
              </div>
            </>) : (<>
              {/* 전체화면 레이아웃 */}
              <video ref={videoRef} src={sourceUrl || undefined}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                preload="metadata" playsInline />
              {!sourceUrl && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.3)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.2"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                </div>
              )}
              {/* 제목 (드래그 가능) */}
              <div onMouseDown={e => handlePreviewMouseDown("title", e)}
                style={{ position: "absolute", left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 10, padding: "8px 18px", borderRadius: 8, background: "rgba(0,0,0,0.75)", border: dragging === "title" ? "2px solid #7c6aff" : "2px solid transparent", maxWidth: "85%", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(fontSize + 2, 20), fontWeight: 900, color: titleColor, lineHeight: 1.3 }}>{curClip.title || "제목"}</span>
              </div>
              {/* 자막 (드래그 가능) */}
              <div onMouseDown={e => handlePreviewMouseDown("caption", e)}
                style={{ position: "absolute", left: `${captionPos.x}%`, top: `${captionPos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 10, padding: "6px 16px", borderRadius: 6, background: "rgba(0,0,0,0.7)", border: dragging === "caption" ? "2px solid #f59e0b" : "2px solid transparent", maxWidth: "90%", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(fontSize, 16), color: captionColor, fontWeight: 600, lineHeight: 1.4 }}>
                  {currentSub ? currentSub.text : (curClip.subtitle_text || "자막")}
                </span>
              </div>
            </>)}

            {/* 이미지/로고/텍스트 오버레이 (공통) */}
            {visibleOverlays.map(o => (
              <div key={o.id} onMouseDown={e => handlePreviewMouseDown(o.id, e)}
                onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); }}
                style={{ position: "absolute", left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 15, border: selectedOverlay === o.id ? "2px solid #ec4899" : "2px solid transparent", borderRadius: 4 }}>
                {o.type === "text" ? (
                  <span style={{ fontSize: o.fontSize || 16, fontWeight: 700, color: o.color || "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}>{o.text}</span>
                ) : (
                  <img src={o.src} alt="" style={{ width: `${o.w * 3.6}px`, height: "auto", maxHeight: `${o.h * 6.4}px`, objectFit: "contain", borderRadius: 4 }} draggable={false} />
                )}
              </div>
            ))}

            {/* 스냅 가이드라인 */}
            {snapGuide && (<>
              {(snapGuide.axis === "x" || snapGuide.axis === "both") && <div style={{ position: "absolute", left: `${snapGuide.pos || 50}%`, top: 0, width: 1, height: "100%", background: "#7c6aff80", zIndex: 30, pointerEvents: "none" }} />}
              {(snapGuide.axis === "y" || snapGuide.axis === "both") && <div style={{ position: "absolute", top: `${snapGuide.y || snapGuide.pos}%`, left: 0, width: "100%", height: 1, background: "#7c6aff80", zIndex: 30, pointerEvents: "none" }} />}
            </>)}

            {/* 시간 표시 */}
            <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4, zIndex: 20 }}>{fmt(playhead)} / {fmt(clipDuration)}</div>
          </div>

          {/* 재생 컨트롤 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(124,106,255,0.4)" }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => { setPlayhead(clipDuration); setIsPlaying(false); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏭</button>
          </div>
        </div>

        {/* RIGHT: 속성 패널 (탭: 스타일 / 오버레이) */}
        <div style={{ width: 280, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          {/* 탭 */}
          <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
            {[["style","스타일"],["overlay","오버레이"]].map(([k,l]) => (
              <button key={k} onClick={() => setPropTab(k)}
                style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: propTab === k ? "#1e1e3a" : "transparent", color: propTab === k ? "#7c6aff" : "#666", borderBottom: propTab === k ? "2px solid #7c6aff" : "2px solid transparent" }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, padding: "10px 14px 14px", overflowY: "auto" }}>
            {propTab === "style" ? (<>
              {/* 영상 속성 (V1 선택 시) */}
              {selectedTrack === "V1" && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #4a9eff30" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4a9eff", marginBottom: 10 }}>영상 속성</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>영상 확대/축소</span>
                      <span style={{ fontSize: 11, color: "#4a9eff", fontWeight: 700 }}>{videoScale}%</span>
                    </div>
                    <input type="range" min="50" max="200" value={videoScale} onChange={e => setVideoScale(Number(e.target.value))} style={{ width: "100%", accentColor: "#4a9eff" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                      <input type="number" step="0.1" value={curClip.start_seconds || 0} onChange={e => updateClip("start_seconds", Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                      <input type="number" step="0.1" value={curClip.end_seconds || 0} onChange={e => updateClip("end_seconds", parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 타임라인에서 좌우 핸들 드래그로도 조절 가능</div>
                </div>
              )}

              {/* 제목 편집 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>제목 / 부제</div>
                <input value={curClip.title || ""} onChange={e => updateClip("title", e.target.value)} placeholder="쇼츠 제목" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                <input value={curClip.subtitle_text || ""} onChange={e => updateClip("subtitle_text", e.target.value)} placeholder="부제목 (선택)" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 프리뷰에서 드래그하여 위치 변경</div>
              </div>

              {/* 선택된 자막 편집 */}
              {selectedSubIdx >= 0 && (curClip.subtitles || [])[selectedSubIdx] && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #7c6aff40" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c6aff", marginBottom: 8 }}>자막 #{selectedSubIdx + 1}</div>
                  <textarea value={(curClip.subtitles || [])[selectedSubIdx]?.text || ""} onChange={e => {
                    const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], text: e.target.value }; updateClip("subtitles", subs);
                  }} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.start || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], start: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.end || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], end: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* 템플릿 + 색상 */}
              {/* 텍스트 스타일 편집기 (공용) */}
              {[["title","상단 제목",titleStyle,setTitleStyle,"#7c6aff"],["caption","하단 자막",captionStyle,setCaptionStyle,"#f59e0b"]].map(([key,label,st,setSt,ac]) => (
                <div key={key} style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${ac}25` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>글자색</div>
                      <input type="color" value={st.color} onChange={e => setSt(p=>({...p,color:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>크기 <span style={{ color: ac }}>{st.fontSize}px</span></div>
                      <input type="range" min="10" max="32" value={st.fontSize} onChange={e => setSt(p=>({...p,fontSize:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.shadow} onChange={e => setSt(p=>({...p,shadow:e.target.checked}))} style={{ accentColor: ac }} /> 그림자
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.border} onChange={e => setSt(p=>({...p,border:e.target.checked}))} style={{ accentColor: ac }} /> 테두리
                    </label>
                  </div>
                  {st.border && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>테두리색</div>
                      <input type="color" value={st.borderColor} onChange={e => setSt(p=>({...p,borderColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.bgBox} onChange={e => setSt(p=>({...p,bgBox:e.target.checked}))} style={{ accentColor: ac }} /> 배경 박스
                    </label>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>투명도 {st.opacity}%</div>
                      <input type="range" min="0" max="100" value={st.opacity} onChange={e => setSt(p=>({...p,opacity:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  {st.bgBox && (
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>박스 배경색</div>
                      <input type="color" value={st.bgColor?.startsWith("rgba") ? "#000000" : (st.bgColor || "#000000")} onChange={e => setSt(p=>({...p,bgColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                </div>
              ))}

              {/* 템플릿 프리셋 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8 }}>템플릿 프리셋</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
                  {TEMPLATES.map(t => (
                    <div key={t.id} onClick={() => { setTemplate(t.id); setTitleStyle(p=>({...p,color:t.titleColor})); setCaptionStyle(p=>({...p,color:t.captionColor})); }}
                      style={{ border: `2px solid ${template === t.id ? "#7c6aff" : "#2a2a4a"}`, borderRadius: 6, padding: 2, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ height: 24, borderRadius: 4, background: t.bg }} />
                      <div style={{ fontSize: 7, fontWeight: 700, color: template === t.id ? "#7c6aff" : "#555", marginTop: 2 }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} style={{ ...btnStyle, marginTop: 4 }}>영상 생성하기 →</button>
            </>) : (<>
              {/* 오버레이 탭 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>요소 추가</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("image"); overlayFileRef.current.click(); }}
                    style={{ padding: "12px 8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 18 }}>🖼</span>이미지
                  </button>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("logo"); overlayFileRef.current.click(); }}
                    style={{ padding: "12px 8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 18 }}>💎</span>로고
                  </button>
                  <button onClick={() => addOverlay("text")}
                    style={{ padding: "12px 8px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 18 }}>Aa</span>텍스트
                  </button>
                </div>
              </div>

              {/* 오버레이 리스트 */}
              {overlays.length > 0 && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>오버레이 ({overlays.length})</div>
                  {overlays.map(o => (
                    <div key={o.id} onClick={() => setSelectedOverlay(o.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 3, background: selectedOverlay === o.id ? "rgba(236,72,153,0.15)" : "transparent", border: selectedOverlay === o.id ? "1px solid rgba(236,72,153,0.3)" : "1px solid transparent" }}>
                      <span style={{ fontSize: 14 }}>{o.type === "text" ? "Aa" : o.type === "logo" ? "💎" : "🖼"}</span>
                      <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{o.type === "text" ? o.text : o.type === "logo" ? "로고" : "이미지"}</span>
                      <button onClick={e => { e.stopPropagation(); setOverlays(prev => prev.filter(x => x.id !== o.id)); if (selectedOverlay === o.id) setSelectedOverlay(null); }}
                        style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* 선택된 오버레이 속성 */}
              {selectedOverlay && overlays.find(o => o.id === selectedOverlay) && (() => {
                const o = overlays.find(x => x.id === selectedOverlay);
                const upd = (k, v) => setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, [k]: v } : x));
                return (
                  <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid rgba(236,72,153,0.2)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ec4899", marginBottom: 8 }}>속성</div>
                    {o.type === "text" && <>
                      <input value={o.text || ""} onChange={e => upd("text", e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>글자 크기</div>
                          <input type="number" value={o.fontSize || 16} onChange={e => upd("fontSize", Number(e.target.value))} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>색상</div>
                          <input type="color" value={o.color || "#ffffff"} onChange={e => upd("color", e.target.value)} style={{ width: "100%", height: 28, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                        </div>
                      </div>
                    </>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                        <input type="number" step="0.1" value={o.start} onChange={e => upd("start", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                        <input type="number" step="0.1" value={o.end} onChange={e => upd("end", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 프리뷰에서 드래그하여 위치 이동</div>
                  </div>
                );
              })()}
            </>)}
          </div>
        </div>
      </div>

      {/* BOTTOM: AlphaCut 스타일 하단 (툴바 + 타임라인) */}
      <div style={{ flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
        {/* 툴바 (AlphaCut 스타일) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", borderBottom: "1px solid #1a1a30", flexShrink: 0, background: "#12122a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setPropTab("style")} style={{ padding: "5px 12px", borderRadius: 6, border: propTab==="style" ? "1px solid #7c6aff" : "1px solid #2a2a4a", background: propTab==="style" ? "rgba(124,106,255,0.15)" : "#1a1a30", color: propTab==="style" ? "#a5b4fc" : "#888", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13 }}>✨</span> 소츠 편집
            </button>
            <button onClick={() => { setRemoveSilence(!removeSilence); }} style={{ padding: "5px 12px", borderRadius: 6, border: removeSilence ? "1px solid #4ade80" : "1px solid #2a2a4a", background: removeSilence ? "rgba(74,222,128,0.12)" : "#1a1a30", color: removeSilence ? "#4ade80" : "#888", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13 }}>✂</span> 무음 구간 삭제 {removeSilence && "ON"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              시작 지점으로 이동
            </button>
            <span style={{ fontSize: 11, color: "#7c6aff", fontFamily: "monospace", fontWeight: 600 }}>{fmt(playhead)} | {fmt(clipDuration)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <input type="range" min="50" max="400" value={timelineZoom * 100} onChange={e => setTimelineZoom(Number(e.target.value)/100)} style={{ width: 60, accentColor: "#7c6aff" }} />
              <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        {/* 타임라인 트랙 영역 */}
        <div style={{ height: 20 + TRACK_H * allTracks.length + 4, display: "flex", overflow: "hidden" }}>
          {/* 트랙 라벨 (좌측 고정) */}
          <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
            <div style={{ height: 20 }} />
            {allTracks.map(tr => (
              <div key={tr.id} style={{ height: TRACK_H, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1a1a25" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: tr.color }}>{tr.label}</span>
              </div>
            ))}
          </div>

          {/* 스크롤 가능한 트랙 */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "pointer" }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              setPlayhead(Math.max(0, Math.min(clipDuration, x / pxPerSec)));
            }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>

              {/* 룰러 */}
              <div style={{ height: 20, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => i).filter(i => timelineZoom >= 2 ? true : timelineZoom >= 1 ? i % 2 === 0 : i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * pxPerSec, top: 0, height: "100%" }}>
                    <div style={{ width: 1, height: sec % 5 === 0 ? 8 : 4, background: sec % 5 === 0 ? "#444" : "#2a2a4a" }} />
                    {(sec % 5 === 0 || timelineZoom >= 2) && <span style={{ fontSize: 8, color: "#444", position: "absolute", left: 3, top: 7, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(sec)}</span>}
                  </div>
                ))}
              </div>

              {/* V1 비디오 (클릭 선택 + 좌우 트림 핸들) */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                <div onClick={e => { e.stopPropagation(); setSelectedTrack("V1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                  style={{ position: "absolute", left: 0, top: 3, width: clipDuration * pxPerSec, height: TRACK_H - 6, background: selectedTrack === "V1" ? "linear-gradient(90deg,#4a9eff50,#4a9eff35)" : "linear-gradient(90deg,#4a9eff30,#4a9eff20)", border: `1.5px solid ${selectedTrack === "V1" ? "#4a9eff" : "#4a9eff50"}`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", overflow: "hidden", cursor: "pointer" }}>
                  <span style={{ fontSize: 9, color: "#4a9eff", fontWeight: 600, whiteSpace: "nowrap" }}>{curClip.title || "Video"} ({fmt(curClip.start_seconds||0)}~{fmt(curClip.end_seconds||0)})</span>
                  {/* 좌측 트림 핸들 */}
                  <div style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", background: selectedTrack === "V1" ? "#4a9eff80" : "transparent", borderRadius: "4px 0 0 4px" }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = curClip.start_seconds || 0;
                      const mv = ev => { const dt = (ev.clientX - sx) / pxPerSec; const ns = Math.max(0, Math.round((os + dt) * 10) / 10); updateClip("start_seconds", Math.min(ns, (curClip.end_seconds || 30) - 1)); };
                      const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                      window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                    }} />
                  {/* 우측 트림 핸들 */}
                  <div style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", background: selectedTrack === "V1" ? "#4a9eff80" : "transparent", borderRadius: "0 4px 4px 0" }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = curClip.end_seconds || 30;
                      const mv = ev => { const dt = (ev.clientX - sx) / pxPerSec; const ne = Math.max((curClip.start_seconds || 0) + 1, Math.round((oe + dt) * 10) / 10); updateClip("end_seconds", ne); };
                      const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                      window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                    }} />
                </div>
              </div>

              {/* A1 오디오 (클릭 선택) */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                <div onClick={e => { e.stopPropagation(); setSelectedTrack("A1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                  style={{ position: "absolute", left: 0, top: 3, width: clipDuration * pxPerSec, height: TRACK_H - 6, background: selectedTrack === "A1" ? "linear-gradient(90deg,#4ade8045,#4ade8030)" : "linear-gradient(90deg,#4ade8025,#4ade8015)", border: `1.5px solid ${selectedTrack === "A1" ? "#4ade80" : "#4ade8040"}`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", overflow: "hidden", cursor: "pointer" }}>
                  <svg width="100%" height="100%" viewBox="0 0 200 20" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
                    {Array.from({ length: 80 }, (_, i) => <rect key={i} x={i*2.5} y={10-(3+Math.abs(Math.sin(i*0.4))*12)/2} width={1.5} height={3+Math.abs(Math.sin(i*0.4))*12} fill="#4ade80" rx={0.5} />)}
                  </svg>
                </div>
              </div>

              {/* S1 자막 */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {(curClip.subtitles || []).map((s, i) => {
                  const left = s.start * pxPerSec;
                  const width = Math.max(((s.end || s.start + 3) - s.start) * pxPerSec, 16);
                  const color = subColors[i % subColors.length];
                  const sel = selectedSubIdx === i;
                  return (
                    <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setPlayhead(s.start); }}
                      style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: sel ? `${color}50` : `${color}25`, border: `1.5px solid ${sel ? color : `${color}50`}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden", zIndex: sel ? 5 : 1 }}>
                      <span style={{ fontSize: 8, color: "#ddd", fontWeight: sel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text || `#${i+1}`}</span>
                      <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const os=s.start;
                          const mv=ev=>{const ns=Math.max(0,Math.round((os+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],start:Math.min(ns,(s.end||s.start+3)-0.5)};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }} />
                      <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const oe=s.end||s.start+3;
                          const mv=ev=>{const ne=Math.max(s.start+0.5,Math.round((oe+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],end:ne};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }} />
                    </div>
                  );
                })}
              </div>

              {/* 동적 오버레이 트랙 (각 오버레이마다 별도 트랙) */}
              {overlayTracks.map(tr => {
                const o = tr.overlay;
                const left = o.start * pxPerSec;
                const width = Math.max((o.end - o.start) * pxPerSec, 16);
                const sel = selectedOverlay === o.id;
                return (
                  <div key={tr.id} style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                    <div onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); setPropTab("overlay"); }}
                      style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: sel ? "rgba(236,72,153,0.4)" : "rgba(236,72,153,0.2)", border: `1.5px solid ${sel ? "#ec4899" : "rgba(236,72,153,0.4)"}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden" }}>
                      <span style={{ fontSize: 8, color: "#f9a8d4", fontWeight: 600 }}>{o.type === "text" ? o.text : o.type === "logo" ? "Logo" : "Img"}</span>
                    </div>
                  </div>
                );
              })}

              {/* 재생 헤드 */}
              <div style={{ position: "absolute", left: playhead * pxPerSec, top: 0, width: 2, height: "100%", background: "#ff3b3b", zIndex: 20, pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 10, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }

  // ═══════════════════════════════════
  // Step: 생성 중 / 결과
  // ═══════════════════════════════════
  if (step === "generate") {
    const isComplete = jobStatus?.status === "complete";
    const completed = jobStatus?.completed || 0;
    const total = jobStatus?.total || editClips.length;
    const doneResults = results.filter(r => r.type === "done");

    return (
      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: D ? "transparent" : "#f4f4f8" }}>
        {/* 좌측: 생성된 쇼츠 리스트 */}
        <div style={{ width: 240, flexShrink: 0, padding: "18px", overflowY: "auto", borderRight: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>
            {isComplete ? `생성된 쇼츠 (${doneResults.length})` : `생성 중... (${completed}/${total})`}
          </div>
          {editClips.map((c, i) => {
            const r = results.find(x => x.index === i);
            return (
              <div key={i} onClick={() => r?.type === "done" && setPreviewIdx(i)}
                style={{ padding: "10px 12px", borderRadius: 10, cursor: r?.type === "done" ? "pointer" : "default", marginBottom: 6, borderLeft: `3px solid ${previewIdx === i && r?.type === "done" ? acc : "transparent"}`, background: previewIdx === i && r?.type === "done" ? `${acc}10` : card, border: `1px solid ${bdr}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {r?.type === "done" ? <span style={{ color: "#4ade80", fontSize: 14 }}>✓</span> : r?.type === "error" ? <span style={{ color: "#f87171", fontSize: 14 }}>✗</span> : <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite" }} />}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>Short {i + 1}</div>
                    <div style={{ fontSize: 10, color: muted }}>{r?.type === "done" ? "완료" : r?.type === "error" ? "실패" : "생성 중..."}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {isComplete && <button onClick={() => { setStep("upload"); setFileId(null); setSegments([]); setResults([]); setError(""); }}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", marginTop: 12 }}>새로운 영상 만들기</button>}
        </div>

        {/* 우측: 미리보기 + 다운로드 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 32px", overflowY: "auto" }}>
          {doneResults.length > 0 ? (
            <>
              {/* 영상 미리보기 + 편집기 */}
              <div style={{ ...cardStyle, width: "100%", maxWidth: 760, padding: 0, overflow: "hidden" }}>
                {/* 비디오 플레이어 */}
                <div style={{ background: "#000", textAlign: "center", position: "relative" }}>
                  <video id="shorts-preview-video" controls playsinline
                    src={`${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}`}
                    style={{ maxHeight: "50vh", width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }} />
                </div>

                {/* 편집 도구 */}
                <div style={{ padding: "16px 20px" }}>
                  {/* 트림 구간 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>✂️ 트림 (시작/끝 조절)</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: muted }}>시작</span>
                      <input type="range" min="0" max="100" defaultValue="0" style={{ flex: 1, accentColor: acc }}
                        onChange={e => { const v = document.getElementById("shorts-preview-video"); if (v) { v.currentTime = (v.duration || 60) * e.target.value / 100; } }} />
                      <span style={{ fontSize: 11, color: muted }}>끝</span>
                      <input type="range" min="0" max="100" defaultValue="100" style={{ flex: 1, accentColor: acc }} />
                    </div>
                  </div>

                  {/* 상단 제목/부제 편집 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>🎬 제목 · 부제 수정</div>
                    <input value={editClips[previewIdx]?.title || ""} onChange={e => {
                      const clips = [...editClips]; clips[previewIdx] = { ...clips[previewIdx], title: e.target.value }; setEditClips(clips);
                    }} placeholder="상단 제목" style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                    <input value={editClips[previewIdx]?.subtitle_text || ""} onChange={e => {
                      const clips = [...editClips]; clips[previewIdx] = { ...clips[previewIdx], subtitle_text: e.target.value }; setEditClips(clips);
                    }} placeholder="하단 부제" style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>

                  {/* 자막 편집 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text }}>📝 자막 수정</div>
                      <button onClick={() => {
                        const clips = [...editClips];
                        const subs = [...(clips[previewIdx]?.subtitles || [])];
                        const lastEnd = subs.length > 0 ? (subs[subs.length - 1].end || subs[subs.length - 1].start + 3) : 0;
                        subs.push({ start: lastEnd, end: lastEnd + 3, text: "" });
                        clips[previewIdx] = { ...clips[previewIdx], subtitles: subs };
                        setEditClips(clips);
                      }} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: acc, cursor: "pointer", fontWeight: 700 }}>+ 자막 추가</button>
                    </div>
                    <div style={{ maxHeight: 150, overflowY: "auto" }}>
                      {(editClips[previewIdx]?.subtitles || []).map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: muted, flexShrink: 0, width: 36 }}>{fmt(s.start)}</span>
                          <input value={s.text} onChange={e => {
                            const clips = [...editClips];
                            const subs = [...(clips[previewIdx]?.subtitles || [])];
                            subs[i] = { ...subs[i], text: e.target.value };
                            clips[previewIdx] = { ...clips[previewIdx], subtitles: subs };
                            setEditClips(clips);
                          }} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 11, outline: "none" }} />
                          <button onClick={() => {
                            const clips = [...editClips];
                            const subs = [...(clips[previewIdx]?.subtitles || [])];
                            subs.splice(i, 1);
                            clips[previewIdx] = { ...clips[previewIdx], subtitles: subs };
                            setEditClips(clips);
                          }} style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 속도 조절 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>⚡ 재생 속도</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(spd => (
                        <button key={spd} onClick={() => { const v = document.getElementById("shorts-preview-video"); if (v) v.playbackRate = spd; }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: text, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 편집 완료 → 다운로드 */}
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 10 }}>편집이 완료되면 다운로드하세요</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {doneResults.map(r => (
                    <a key={r.index} href={`${API}/outputs/${fileId}/${r.filename}`} download={r.filename}
                      style={{ padding: "12px 24px", borderRadius: 12, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      ⬇ Short {r.index + 1} 다운로드
                    </a>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center" }}>
                  <button onClick={() => linkTo("blog_write", previewIdx)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>📝 글쓰기 연계</button>
                  <button onClick={() => linkTo("content_create", previewIdx)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>🎨 콘텐츠 제작</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
              {/* 애니메이션 아이콘 */}
              <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 24px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, borderRightColor: acc, animation: "spin 1.5s linear infinite" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8" />
                    <polygon points="10,8 17,12 10,16" fill={acc} />
                  </svg>
                </div>
              </div>

              <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>영상을 만들고 있어요</div>
              <div style={{ fontSize: 14, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                AI가 영상을 분석하고 편집 중입니다<br/>
                페이지를 이동해도 백그라운드에서 계속 생성됩니다
              </div>

              {/* 진행률 바 */}
              <div style={{ background: "rgba(128,128,128,0.15)", borderRadius: 10, height: 8, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", borderRadius: 10, background: `linear-gradient(90deg,${acc},#8b5cf6)`, width: `${total > 0 ? (completed / total) * 100 : 0}%`, transition: "width 0.5s ease" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: acc }}>{completed} / {total}개 완료</span>
                <span style={{ fontSize: 12, color: muted }}>예상 {Math.max(1, (total - completed) * 2)}~{Math.max(2, (total - completed) * 4)}분 남음</span>
              </div>

              {/* 단계별 상태 */}
              <div style={{ textAlign: "left" }}>
                {editClips.map((c, i) => {
                  const r = results.find(x => x.index === i);
                  const isDone = r?.type === "done";
                  const isErr = r?.type === "error";
                  const isCurrent = !isDone && !isErr && i <= completed;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, marginBottom: 4, background: isDone ? "rgba(74,222,128,0.06)" : isCurrent ? `${acc}08` : "transparent" }}>
                      {isDone ? <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span>
                        : isErr ? <span style={{ color: "#f87171", fontSize: 16 }}>✗</span>
                        : isCurrent ? <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${acc}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                        : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${bdr}` }} />}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? "#4ade80" : isErr ? "#f87171" : text }}>{c.title || `Short ${i+1}`}</span>
                        <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>{isDone ? "완료" : isErr ? "실패" : isCurrent ? "생성 중..." : "대기"}</span>
                      </div>
                      <span style={{ fontSize: 11, color: muted }}>{fmt(c.start_seconds||0)}~{fmt(c.end_seconds||0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
