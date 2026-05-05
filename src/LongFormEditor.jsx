import { useState, useRef, useEffect, useCallback } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";

const API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

function parseYoutubeUrl(url) {
  if (!url) return null;
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.trim().match(p); if (m) return { id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` }; }
  return null;
}

const fmt = s => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`; };
const fmtMs = s => { const m = Math.floor(s/60); const sec = Math.floor(s%60); const ms = Math.floor((s%1)*100); return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${String(ms).padStart(2,"0")}`; };

function extractFullSubtitles(sttResult, videoDuration) {
  const dur = videoDuration || 60;
  let subs = [];
  const segments = (sttResult.segments || []).slice().sort((a, b) => (a.start_seconds || 0) - (b.start_seconds || 0));
  const fullSubs = sttResult.all_subs || sttResult.full_transcript;
  if (fullSubs && Array.isArray(fullSubs) && fullSubs.length > 0) subs = [...fullSubs];
  if (subs.length === 0) {
    for (const seg of segments) {
      if (seg.subtitles && seg.subtitles.length > 0) subs.push(...seg.subtitles);
      else if (seg.script) {
        const ss = seg.start_seconds || 0, se = seg.end_seconds || dur;
        const chunks = seg.script.match(/.{1,18}/g) || [];
        const cd = (se - ss) / Math.max(1, chunks.length);
        chunks.forEach((text, i) => subs.push({ start: Math.round((ss + i * cd) * 100) / 100, end: Math.round((ss + (i + 1) * cd) * 100) / 100, text: text.trim() }));
      }
    }
  }
  subs.sort((a, b) => a.start - b.start);
  subs = subs.filter((s, i) => i === 0 || Math.abs(s.start - subs[i - 1].start) > 0.5);
  return subs;
}

const CAPTION_STYLES = [
  { id: "default", name: "Default", color: "#FFFFFF", bg: "rgba(0,0,0,0.7)", preview: { bg: "#000", fg: "#fff" } },
  { id: "highlight", name: "Highlight", color: "#FFD700", bg: "rgba(0,0,0,0.7)", preview: { bg: "#000", fg: "#FFD700" } },
  { id: "minimal", name: "Minimal", color: "#FFFFFF", bg: "transparent", preview: { bg: "transparent", fg: "#fff" } },
  { id: "news", name: "News", color: "#FFFFFF", bg: "rgba(200,0,0,0.8)", preview: { bg: "#c00", fg: "#fff" } },
];

/* ── Colors ── */
const C = {
  bg: "#1a1a2e", panel: "#16162a", surface: "#1e1e3a", surfaceHover: "#252545",
  border: "rgba(255,255,255,0.06)", borderLight: "rgba(255,255,255,0.1)",
  text: "#e4e4ef", sub: "rgba(255,255,255,0.5)", dim: "rgba(255,255,255,0.25)",
  accent: "#6366f1", accentHover: "#4f46e5", accentSoft: "rgba(99,102,241,0.15)",
  accentText: "#a5b4fc", success: "#10b981", danger: "#ef4444",
  timeline: "#12122a", trackBg: "rgba(99,102,241,0.2)", trackClip: "#6366f1",
};

export default function LongFormEditor({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const [step, setStep] = useState("input");
  const [inputMode, setInputMode] = useState("youtube");
  const [ytUrl, setYtUrl] = useState("");
  const [ytParsed, setYtParsed] = useState(null);
  const [ytInfo, setYtInfo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [error, setError] = useState("");

  const [captionStyleId, setCaptionStyleId] = useState("default");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [removeSilence, setRemoveSilence] = useState(false);

  const [loadingPhase, setLoadingPhase] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const fakeProgressRef = useRef(null);
  useGeneratingGuard(step === "processing", 10, "longform_make");

  const [subtitles, setSubtitles] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [resultUrl, setResultUrl] = useState(null);

  const [activeSub, setActiveSub] = useState(-1);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
  }, []);
  useEffect(() => { setYtParsed(parseYoutubeUrl(ytUrl)); }, [ytUrl]);
  useEffect(() => {
    if (!ytParsed) { setYtInfo(null); return; }
    let cancel = false;
    fetch(`${API}/api/youtube-info?url=${encodeURIComponent(ytParsed.url)}`).then(r => r.ok ? r.json() : null).then(d => { if (!cancel && d) setYtInfo(d); }).catch(() => {});
    return () => { cancel = true; };
  }, [ytParsed?.id]);
  useEffect(() => {
    if (step === "processing") {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); setElapsed(0); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);
  useEffect(() => { if (onStatusChange) onStatusChange(step); }, [step]);

  // Video time sync
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => {
      setPlayhead(v.currentTime);
      const idx = subtitles.findIndex(s => v.currentTime >= s.start && v.currentTime < s.end);
      if (idx !== -1) setActiveSub(idx);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); };
  }, [subtitles, step]);

  const seekTo = useCallback((t) => { if (videoRef.current) { videoRef.current.currentTime = t; setPlayhead(t); } }, []);

  const startFakeProgress = (from, to, durationMs) => {
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    const s = (to - from) / (durationMs / 200);
    let cur = from;
    fakeProgressRef.current = setInterval(() => {
      cur = Math.min(to, cur + s * (0.5 + Math.random()));
      setLoadingProgress(Math.round(cur));
      if (cur >= to) clearInterval(fakeProgressRef.current);
    }, 200);
  };
  const stopFake = () => { if (fakeProgressRef.current) { clearInterval(fakeProgressRef.current); fakeProgressRef.current = null; } };

  const apiCall = async (path, opts = {}) => {
    const timeout = opts.timeout || 60000;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(`${API}${path}`, { ...opts, signal: ctrl.signal, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
      clearTimeout(t);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Server error (${r.status})`); }
      return r.json();
    } catch (err) { clearTimeout(t); throw err; }
  };

  const startFullPipeline = async () => {
    setStep("processing"); setError(""); setLoadingProgress(0); setResultUrl(null); setSubtitles([]);
    try {
      let fid = fileId;
      if (inputMode === "youtube" && ytParsed) {
        setLoadingPhase("download"); setLoadingProgress(2); startFakeProgress(2, 20, 30000);
        const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: ytParsed.url }), timeout: 120000 });
        fid = d.file_id; setFileId(fid); stopFake(); setLoadingProgress(22);
        if (d.caption_only) setError("YouTube download blocked - analyzing captions only.");
      } else if (videoFile) {
        setLoadingPhase("upload"); setLoadingProgress(2); startFakeProgress(2, 20, 15000);
        const form = new FormData(); form.append("video", videoFile);
        const r = await fetch(`${API}/upload`, { method: "POST", body: form });
        if (!r.ok) throw new Error("Upload failed");
        const d = await r.json(); fid = d.file_id; setFileId(fid); stopFake(); setLoadingProgress(22);
      } else throw new Error("Select a video first");

      setLoadingPhase("stt"); startFakeProgress(22, 55, 90000);
      const sttResult = await apiCall(`/analyze/${fid}`, { method: "POST", body: JSON.stringify({ max_segments: 3, longform: true, full_subtitles: true }), timeout: 300000 });
      const seg = sttResult.segments?.[0];
      const dur = sttResult.segments?.[(sttResult.segments?.length || 1) - 1]?.end_seconds || seg?.end_seconds || 60;
      const allSubs = extractFullSubtitles(sttResult, dur);
      setSubtitles(allSubs); setVideoDuration(dur); stopFake(); setLoadingProgress(58);
      if (allSubs.length === 0) throw new Error("No subtitles generated. Check if the video has audio.");

      setLoadingPhase("render"); startFakeProgress(58, 68, 10000);
      const capStyle = CAPTION_STYLES.find(s => s.id === captionStyleId) || CAPTION_STYLES[0];
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({ file_id: fid, clips: [{ start_seconds: 0, end_seconds: dur, title: "", subtitles: allSubs }], video_segments: [{ start: 0, end: dur }], subtitles_enabled: subtitlesEnabled, caption_animation: "highlight", caption_style: { color: capStyle.color, fontSize: 18, shadow: true, bgBox: capStyle.bg !== "transparent", bgColor: capStyle.bg, position: "bottom" }, longform: true, remove_silence: removeSilence }),
        timeout: 90000,
      });
      stopFake(); setLoadingProgress(70);
      if (!d?.job_id) throw new Error("Server response error");

      await new Promise((resolve, reject) => {
        let fails = 0;
        startFakeProgress(70, 96, 180000);
        pollRef.current = setInterval(async () => {
          try {
            const j = await apiCall(`/jobs/${d.job_id}`, { timeout: 15000 });
            if (j.progress) setLoadingProgress(Math.max(loadingProgress, 70 + Math.round(j.progress * 0.28)));
            if (j.status === "complete") {
              clearInterval(pollRef.current); pollRef.current = null; stopFake();
              const done = (j.results || []).find(r => r.type === "done");
              const errResult = (j.results || []).find(r => r.type === "error");
              if (done) { setResultUrl(`${API}/outputs/${fid}/${done.filename}`); setLoadingProgress(100); resolve(); }
              else if (errResult) reject(new Error(errResult.message || "Render failed"));
              else reject(new Error("Result file not found"));
            }
            if (j.status === "error" || j.status === "failed") { clearInterval(pollRef.current); pollRef.current = null; stopFake(); reject(new Error(j.error || "Render failed")); }
            fails = 0;
          } catch (e) { if (++fails > 20) { clearInterval(pollRef.current); pollRef.current = null; stopFake(); reject(new Error("Connection lost")); } }
        }, 3000);
        setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; stopFake(); reject(new Error("10min timeout")); } }, 600000);
      });
      setStep("result");
    } catch (e) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      stopFake();
      if (resultUrl) { setError(e.message); setStep("result"); }
      else { setError(e.message); setStep("input"); }
    }
  };

  const dur = videoDuration || 1;
  const pxPerSec = (timelineZoom * 80) / Math.max(1, dur > 300 ? 10 : dur > 60 ? 5 : 1);
  const timelineWidth = dur * pxPerSec;

  /* ═══════════════════════════════════════════════
     INPUT - Import Dialog over dark workspace
     ═══════════════════════════════════════════════ */
  if (step === "input") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, minHeight: 0 }}>
      {/* Top bar */}
      <div style={{ height: 42, background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Longform Editor</span>
        <span style={{ fontSize: 11, color: C.dim }}>AI Subtitle Burn-in</span>
      </div>

      {/* Workspace with centered import */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at center, ${C.surface} 0%, ${C.bg} 70%)` }}>
        <div style={{ width: 480, background: C.panel, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          {/* Import header */}
          <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Import Media</div>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 16 }}>AI가 자동으로 자막을 생성하고 영상에 번인합니다</div>
            <div style={{ display: "flex", gap: 0 }}>
              {[["youtube", "YouTube"], ["file", "Local File"]].map(([id, label]) => (
                <button key={id} onClick={() => setInputMode(id)}
                  style={{ padding: "8px 20px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent",
                    color: inputMode === id ? C.accent : C.sub, borderBottom: `2px solid ${inputMode === id ? C.accent : "transparent"}`, transition: "all 0.15s" }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Import body */}
          <div style={{ padding: 24 }}>
            {inputMode === "youtube" ? (
              <div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                    onPaste={e => { const p = e.clipboardData.getData("text"); if (parseYoutubeUrl(p)) { e.preventDefault(); setYtUrl(p.trim()); } }}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                </div>
                {ytUrl.trim() && !ytParsed && <div style={{ fontSize: 11, color: C.danger, marginTop: 6 }}>Invalid YouTube URL</div>}
                {ytInfo && (
                  <div style={{ display: "flex", gap: 10, padding: 10, marginTop: 10, borderRadius: 8, background: C.surface, alignItems: "center" }}>
                    <img src={ytInfo.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ytInfo.title}</div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{ytInfo.channel}{ytInfo.duration ? ` | ${fmt(ytInfo.duration)}` : ""}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div onClick={() => fileRef.current?.click()}
                  style={{ border: `1.5px dashed ${C.borderLight}`, borderRadius: 10, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: C.surface, transition: "border-color 0.15s" }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.accent; }}
                  onDragLeave={e => e.currentTarget.style.borderColor = C.borderLight}
                  onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.borderLight; if (e.dataTransfer.files[0]) setVideoFile(e.dataTransfer.files[0]); }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>Drop file or click to browse</div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>MP4, MOV, MKV, AVI (max 500MB)</div>
                  <input ref={fileRef} type="file" accept=".mp4,.mkv,.avi,.mov,.webm" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setVideoFile(e.target.files[0]); }} />
                </div>
                {videoFile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", borderRadius: 8, background: C.accentSoft }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>
                    <span style={{ fontSize: 12, color: C.accentText, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{videoFile.name}</span>
                    <span style={{ fontSize: 10, color: C.dim }}>{(videoFile.size / 1e6).toFixed(1)}MB</span>
                    <button onClick={() => setVideoFile(null)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>X</button>
                  </div>
                )}
              </div>
            )}

            {/* Options row */}
            <div style={{ display: "flex", gap: 12, marginTop: 18, padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Caption Style</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {CAPTION_STYLES.map(s => (
                    <button key={s.id} onClick={() => setCaptionStyleId(s.id)}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: `1.5px solid ${captionStyleId === s.id ? C.accent : C.border}`, background: captionStyleId === s.id ? C.accentSoft : "transparent", color: captionStyleId === s.id ? C.accentText : C.dim, fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{s.name}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 100 }}>
                {[["Subtitles", subtitlesEnabled, () => setSubtitlesEnabled(!subtitlesEnabled)], ["Remove Silence", removeSilence, () => setRemoveSilence(!removeSilence)]].map(([label, on, fn]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.sub }}>{label}</span>
                    <button onClick={fn} style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", position: "relative", background: on ? C.accent : C.border, transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 6, background: "#fff", position: "absolute", top: 3, left: on ? 17 : 3, transition: "left 0.2s" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, color: C.danger, fontSize: 11 }}>{error}</div>}

            <button onClick={startFullPipeline} disabled={inputMode === "youtube" ? !ytParsed : !videoFile}
              onMouseEnter={e => { if (!e.target.disabled) e.target.style.background = C.accentHover; }}
              onMouseLeave={e => e.target.style.background = C.accent}
              style={{ width: "100%", padding: "12px", marginTop: 14, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: C.accent, color: "#fff", transition: "background 0.15s", opacity: (inputMode === "youtube" ? !ytParsed : !videoFile) ? 0.35 : 1 }}>
              Start Processing
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar - mimics timeline area */}
      <div style={{ height: 120, background: C.timeline, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ textAlign: "center", color: C.dim, fontSize: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 6px", display: "block", opacity: 0.4 }}><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>
          Import media to start editing
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     PROCESSING
     ═══════════════════════════════════════════════ */
  if (step === "processing") {
    const PHASES = { download: "Downloading from YouTube", upload: "Uploading video", stt: "AI Speech Recognition", render: "Rendering subtitles" };
    const activePhase = loadingPhase === "download" || loadingPhase === "upload" ? 0 : loadingPhase === "stt" ? 1 : 2;
    const phaseLabels = [inputMode === "youtube" ? "Download" : "Upload", "STT Analysis", "Render"];

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, minHeight: 0 }}>
        <div style={{ height: 42, background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Longform Editor</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: C.accentText, fontWeight: 600 }}>Processing...</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 420, background: C.panel, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: "36px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* Progress ring */}
            <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 24px" }}>
              <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="55" cy="55" r="46" fill="none" stroke={C.border} strokeWidth="4" />
                <circle cx="55" cy="55" r="46" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*46}`} strokeDashoffset={`${2*Math.PI*46*(1-loadingProgress/100)}`}
                  style={{ transition: "stroke-dashoffset 0.4s ease", filter: `drop-shadow(0 0 6px ${C.accent})` }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: C.text, fontVariantNumeric: "tabular-nums" }}>{loadingProgress}<span style={{ fontSize: 12, color: C.dim }}>%</span></span>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{PHASES[loadingPhase] || "Preparing..."}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")} elapsed</div>
            </div>

            {/* Phase steps */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {phaseLabels.map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 3, borderRadius: 2, background: activePhase > i ? C.success : activePhase === i ? C.accent : C.border, marginBottom: 6, transition: "background 0.3s" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: activePhase >= i ? C.text : C.dim }}>{label}</span>
                </div>
              ))}
            </div>

            <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); stopFake(); setStep("input"); }}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>

        <div style={{ height: 120, background: C.timeline, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 24, color: C.dim, fontSize: 11 }}>
            {phaseLabels.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: activePhase > i ? C.success : activePhase === i ? C.accent : C.border, boxShadow: activePhase === i ? `0 0 8px ${C.accent}` : "none" }} />
                <span style={{ color: activePhase >= i ? C.text : C.dim }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RESULT - Full NLE Layout
     ═══════════════════════════════════════════════ */
  if (step === "result") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, minHeight: 0, overflow: "hidden" }}>
      {/* ── Top Toolbar ── */}
      <div style={{ height: 42, background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="m10 8 6 4-6 4z"/></svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Longform Editor</span>
        <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
        <span style={{ fontSize: 11, color: C.dim }}>{subtitles.length} subtitles | {fmt(videoDuration)}</span>
        <div style={{ flex: 1 }} />

        {error && <span style={{ fontSize: 10, color: C.danger, marginRight: 8 }}>{error}</span>}

        <button onClick={() => { setStep("input"); setResultUrl(null); setSubtitles([]); setFileId(null); setError(""); }}
          style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>New</button>

        {resultUrl && fileId && (
          <button onClick={startFullPipeline}
            style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.accentText, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Re-render</button>
        )}

        {resultUrl && (
          <a href={resultUrl} download="longform_subtitled.mp4"
            style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>
            Export
          </a>
        )}
      </div>

      {/* ── Main Area: Preview + Subtitle Panel ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* Video Preview */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", minWidth: 0, position: "relative" }}>
          {resultUrl ? (
            <video ref={videoRef} src={resultUrl} controls preload="metadata"
              style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
              onLoadedMetadata={e => { if (!videoDuration) setVideoDuration(e.target.duration); }} />
          ) : (
            <div style={{ color: C.dim, fontSize: 14 }}>Render failed</div>
          )}
          {/* Current subtitle overlay info */}
          {activeSub >= 0 && subtitles[activeSub] && (
            <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", padding: "4px 14px", borderRadius: 6, pointerEvents: "none" }}>
              <span style={{ fontSize: 10, color: C.accentText, fontVariantNumeric: "tabular-nums" }}>{fmtMs(subtitles[activeSub].start)}</span>
            </div>
          )}
        </div>

        {/* Subtitle List Panel */}
        <div style={{ width: 300, background: C.panel, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subtitles</span>
            <span style={{ fontSize: 10, color: C.dim }}>{subtitles.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {subtitles.map((sub, i) => (
              <div key={i} onClick={() => seekTo(sub.start)}
                style={{ display: "flex", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                  background: activeSub === i ? C.accentSoft : "transparent", transition: "background 0.1s" }}
                onMouseEnter={e => { if (activeSub !== i) e.currentTarget.style.background = C.surfaceHover; }}
                onMouseLeave={e => { if (activeSub !== i) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ flexShrink: 0, width: 52, textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: activeSub === i ? C.accentText : C.dim, fontVariantNumeric: "tabular-nums" }}>{fmtMs(sub.start)}</div>
                  <div style={{ fontSize: 9, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{fmtMs(sub.end)}</div>
                </div>
                <div style={{ fontSize: 11, color: activeSub === i ? C.text : C.sub, lineHeight: 1.5, flex: 1 }}>{sub.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ height: 140, background: C.timeline, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Timeline toolbar */}
        <div style={{ height: 28, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeline</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{fmt(playhead)} / {fmt(dur)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <button onClick={() => setTimelineZoom(z => Math.max(0.25, z / 1.5))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 4px" }}>-</button>
            <span style={{ fontSize: 10, color: C.dim, width: 32, textAlign: "center" }}>{Math.round(timelineZoom*100)}%</span>
            <button onClick={() => setTimelineZoom(z => Math.min(8, z * 1.5))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "0 4px" }}>+</button>
          </div>
        </div>

        {/* Timeline tracks */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "pointer" }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const scrollLeft = e.currentTarget.scrollLeft;
            const x = e.clientX - rect.left + scrollLeft;
            const t = x / pxPerSec;
            if (t >= 0 && t <= dur) seekTo(t);
          }}>
          <div style={{ width: Math.max(timelineWidth, "100%"), height: "100%", position: "relative" }}>
            {/* Time ruler */}
            <div style={{ height: 20, position: "relative", borderBottom: `1px solid ${C.border}` }}>
              {Array.from({ length: Math.ceil(dur / (dur > 300 ? 30 : dur > 60 ? 10 : 5)) + 1 }, (_, i) => {
                const interval = dur > 300 ? 30 : dur > 60 ? 10 : 5;
                const t = i * interval;
                if (t > dur) return null;
                return (
                  <div key={i} style={{ position: "absolute", left: t * pxPerSec, top: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ width: 1, height: 8, background: C.borderLight }} />
                    <span style={{ fontSize: 9, color: C.dim, marginLeft: 2, fontVariantNumeric: "tabular-nums" }}>{fmt(t)}</span>
                  </div>
                );
              })}
            </div>

            {/* Subtitle track */}
            <div style={{ height: 30, position: "relative", margin: "6px 0", padding: "0 0" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: 2, background: C.trackBg, borderRadius: 1 }} />
              {subtitles.map((sub, i) => {
                const left = sub.start * pxPerSec;
                const w = Math.max(2, (sub.end - sub.start) * pxPerSec);
                return (
                  <div key={i} onClick={e => { e.stopPropagation(); seekTo(sub.start); setActiveSub(i); }}
                    title={sub.text}
                    style={{ position: "absolute", left, width: w, top: 2, height: 26, borderRadius: 3,
                      background: activeSub === i ? C.accent : "rgba(99,102,241,0.5)", border: activeSub === i ? `1px solid ${C.accentText}` : `1px solid transparent`,
                      cursor: "pointer", transition: "background 0.1s", overflow: "hidden" }}>
                    {w > 30 && <span style={{ fontSize: 8, color: "#fff", padding: "0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", lineHeight: "26px" }}>{sub.text}</span>}
                  </div>
                );
              })}
            </div>

            {/* Audio waveform placeholder */}
            <div style={{ height: 28, position: "relative", margin: "0", opacity: 0.3 }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: 1, background: C.borderLight }} />
              {Array.from({ length: Math.min(200, Math.floor(dur * 2)) }, (_, i) => {
                const h = 4 + Math.random() * 20;
                return <div key={i} style={{ position: "absolute", left: (i / Math.min(200, Math.floor(dur * 2))) * timelineWidth, width: Math.max(1, timelineWidth / Math.min(200, dur * 2) - 1), height: h, background: C.accent, bottom: (28 - h) / 2, borderRadius: 1, opacity: 0.4 }} />;
              })}
            </div>

            {/* Playhead */}
            <div style={{ position: "absolute", left: playhead * pxPerSec, top: 0, bottom: 0, width: 1, background: "#ff4444", zIndex: 10, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: -2, left: -4, width: 9, height: 9, background: "#ff4444", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}
