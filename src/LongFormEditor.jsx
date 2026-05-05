import { useState, useRef, useEffect } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { supabase } from "./storage";

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
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return { id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` };
  }
  return null;
}

const fmt = s => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = Math.floor(s%60); return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`; };

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
  { id: "default", name: "기본", color: "#FFFFFF", bg: "rgba(0,0,0,0.7)" },
  { id: "highlight", name: "하이라이트", color: "#FFD700", bg: "rgba(0,0,0,0.7)" },
  { id: "minimal", name: "미니멀", color: "#FFFFFF", bg: "transparent" },
  { id: "news", name: "뉴스", color: "#FFFFFF", bg: "rgba(200,0,0,0.8)" },
];

export default function LongFormEditor({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const D = isDark;
  const c = {
    bg: D ? "#0a0a0f" : "#f8f9fb",
    card: D ? "rgba(255,255,255,0.04)" : "#fff",
    border: D ? "rgba(255,255,255,0.08)" : "#e8ecf1",
    text: D ? "#e8e8ed" : "#1a1a2e",
    sub: D ? "rgba(255,255,255,0.5)" : "#6b7280",
    dim: D ? "rgba(255,255,255,0.25)" : "#9ca3af",
    input: D ? "rgba(255,255,255,0.06)" : "#f4f5f7",
    accent: "#6366f1",
    accentHover: "#4f46e5",
    accentSoft: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    accentText: D ? "#a5b4fc" : "#6366f1",
    success: "#10b981",
    danger: "#ef4444",
  };

  const [step, setStep] = useState("input"); // input | processing | result
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
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `서버 오류 (${r.status})`); }
      return r.json();
    } catch (err) { clearTimeout(t); throw err; }
  };

  // 전체 자동 파이프라인: 업로드 → STT → 자막 번인 렌더링
  const startFullPipeline = async () => {
    setStep("processing"); setError(""); setLoadingProgress(0); setResultUrl(null); setSubtitles([]);
    try {
      let fid = fileId;

      // 1. 업로드/다운로드
      if (inputMode === "youtube" && ytParsed) {
        setLoadingPhase("download"); setLoadingProgress(2); startFakeProgress(2, 20, 30000);
        const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: ytParsed.url }), timeout: 120000 });
        fid = d.file_id; setFileId(fid); stopFake(); setLoadingProgress(22);
        if (d.caption_only) setError("YouTube 다운로드 차단 - 자막으로만 분석합니다. MP4 업로드 시 영상 렌더링 가능.");
      } else if (videoFile) {
        setLoadingPhase("upload"); setLoadingProgress(2); startFakeProgress(2, 20, 15000);
        const form = new FormData(); form.append("video", videoFile);
        const r = await fetch(`${API}/upload`, { method: "POST", body: form });
        if (!r.ok) throw new Error("업로드 실패");
        const d = await r.json(); fid = d.file_id; setFileId(fid); stopFake(); setLoadingProgress(22);
      } else throw new Error("영상을 선택해주세요");

      // 2. STT + 전체 자막 생성
      setLoadingPhase("stt"); startFakeProgress(22, 55, 90000);
      const sttResult = await apiCall(`/analyze/${fid}`, {
        method: "POST",
        body: JSON.stringify({ max_segments: 3, longform: true, full_subtitles: true }),
        timeout: 300000,
      });
      const seg = sttResult.segments?.[0];
      const dur = sttResult.segments?.[(sttResult.segments?.length || 1) - 1]?.end_seconds || seg?.end_seconds || 60;
      const allSubs = extractFullSubtitles(sttResult, dur);
      setSubtitles(allSubs);
      setVideoDuration(dur);
      stopFake(); setLoadingProgress(58);

      if (allSubs.length === 0) throw new Error("자막을 생성하지 못했습니다. 음성이 포함된 영상인지 확인해주세요.");

      // 3. 렌더링
      setLoadingPhase("render"); startFakeProgress(58, 68, 10000);
      const capStyle = CAPTION_STYLES.find(s => s.id === captionStyleId) || CAPTION_STYLES[0];
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({
          file_id: fid,
          clips: [{ start_seconds: 0, end_seconds: dur, title: "", subtitles: allSubs }],
          video_segments: [{ start: 0, end: dur }],
          subtitles_enabled: subtitlesEnabled,
          caption_animation: "highlight",
          caption_style: { color: capStyle.color, fontSize: 18, shadow: true, bgBox: capStyle.bg !== "transparent", bgColor: capStyle.bg, position: "bottom" },
          longform: true,
          remove_silence: removeSilence,
        }),
        timeout: 90000,
      });
      stopFake(); setLoadingProgress(70);

      if (!d?.job_id) throw new Error("서버 응답 오류");

      // 4. 폴링
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
              else if (errResult) reject(new Error(errResult.message || "렌더링 실패"));
              else reject(new Error("결과 파일을 찾을 수 없습니다"));
            }
            if (j.status === "error" || j.status === "failed") {
              clearInterval(pollRef.current); pollRef.current = null; stopFake();
              reject(new Error(j.error || "렌더링 실패"));
            }
            fails = 0;
          } catch (e) {
            if (++fails > 20) { clearInterval(pollRef.current); pollRef.current = null; stopFake(); reject(new Error("서버 연결 끊김")); }
          }
        }, 3000);
        // 10분 타임아웃
        setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; stopFake(); reject(new Error("10분 타임아웃. 영상이 너무 길 수 있습니다.")); } }, 600000);
      });

      setStep("result");
    } catch (e) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      stopFake();
      // 렌더링 실패했지만 결과 URL이 있으면 결과 화면
      if (resultUrl) { setError(e.message); setStep("result"); }
      else { setError(e.message); setStep("input"); }
    }
  };

  const S = {
    card: { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, marginBottom: 12 },
    input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" },
    chip: (active) => ({ padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${active ? c.accent : c.border}`, background: active ? c.accentSoft : "transparent", color: active ? c.accentText : c.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }),
    btn: { padding: "14px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: c.accent, color: "#fff", transition: "background 0.15s" },
    btnOutline: { padding: "10px 18px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.sub, fontSize: 13, fontWeight: 600, cursor: "pointer" },
    label: { fontSize: 12, fontWeight: 600, color: c.sub, marginBottom: 8 },
    toggle: (on) => ({ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: on ? c.accent : c.border, transition: "background 0.2s" }),
    toggleDot: (on) => ({ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }),
  };

  // ═══ 입력 ═══
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: c.bg }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* 헤더 - 컴팩트 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.text }}>롱폼 자막 편집</div>
          <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>영상을 넣으면 AI가 자막을 생성하고 번인합니다</div>
        </div>

        {/* 입력 카드 */}
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${c.border}` }}>
            {[["youtube", "YouTube URL"], ["file", "파일 업로드"]].map(([id, label]) => (
              <button key={id} onClick={() => setInputMode(id)}
                style={{ flex: 1, padding: "8px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: inputMode === id ? c.accent : "transparent", color: inputMode === id ? "#fff" : c.sub, transition: "all 0.15s" }}>{label}</button>
            ))}
          </div>

          {inputMode === "youtube" ? (
            <div>
              <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                onPaste={e => { const p = e.clipboardData.getData("text"); if (parseYoutubeUrl(p)) { e.preventDefault(); setYtUrl(p.trim()); } }}
                placeholder="YouTube 영상 링크를 붙여넣으세요"
                onFocus={e => e.target.style.borderColor = c.accent} onBlur={e => e.target.style.borderColor = c.border}
                style={{ ...S.input, fontSize: 14, padding: "12px 14px" }} />
              {ytUrl.trim() && !ytParsed && <div style={{ fontSize: 11, color: c.danger, marginTop: 5 }}>유효한 YouTube URL이 아닙니다</div>}
              {ytInfo && (
                <div style={{ display: "flex", gap: 10, padding: "8px 0", marginTop: 8, alignItems: "center" }}>
                  <img src={ytInfo.thumbnail} alt="" style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ytInfo.title}</div>
                    <div style={{ fontSize: 10, color: c.dim, marginTop: 2 }}>{ytInfo.channel}{ytInfo.duration ? ` · ${fmt(ytInfo.duration)}` : ""}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: `1.5px dashed ${c.border}`, borderRadius: 10, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: c.input, transition: "border-color 0.15s" }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = c.accent; }}
                onDragLeave={e => e.currentTarget.style.borderColor = c.border}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = c.border; if (e.dataTransfer.files[0]) setVideoFile(e.dataTransfer.files[0]); }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.sub }}>클릭 또는 드래그하여 업로드</div>
                <div style={{ fontSize: 11, color: c.dim, marginTop: 3 }}>MP4, MOV, MKV, AVI</div>
                <input ref={fileRef} type="file" accept=".mp4,.mkv,.avi,.mov,.webm" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setVideoFile(e.target.files[0]); }} />
              </div>
              {videoFile && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", borderRadius: 6, background: c.accentSoft }}>
                  <span style={{ fontSize: 11, color: c.accentText, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{videoFile.name}</span>
                  <span style={{ fontSize: 10, color: c.dim }}>{(videoFile.size / 1e6).toFixed(1)}MB</span>
                  <button onClick={() => setVideoFile(null)} style={{ background: "none", border: "none", color: c.danger, cursor: "pointer", fontSize: 10 }}>X</button>
                </div>
              )}
            </div>
          )}

          <button onClick={startFullPipeline} disabled={inputMode === "youtube" ? !ytParsed : !videoFile}
            onMouseEnter={e => { if (!e.target.disabled) e.target.style.background = c.accentHover; }}
            onMouseLeave={e => e.target.style.background = c.accent}
            style={{ ...S.btn, width: "100%", fontSize: 14, padding: "12px", marginTop: 14,
              opacity: (inputMode === "youtube" ? !ytParsed : !videoFile) ? 0.35 : 1 }}>
            자막 입히기
          </button>
        </div>

        {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.15)`, color: c.danger, fontSize: 12, lineHeight: 1.5 }}>{error}</div>}

        {/* 설정 - 컴팩트 */}
        <div style={{ ...S.card, padding: "14px 16px", marginTop: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
            <div>
              <div style={S.label}>자막 스타일</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {CAPTION_STYLES.map(s => (
                  <button key={s.id} onClick={() => setCaptionStyleId(s.id)}
                    style={{ ...S.chip(captionStyleId === s.id), padding: "7px 0", fontSize: 11 }}>{s.name}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.sub }}>자동 자막</span>
                <button onClick={() => setSubtitlesEnabled(!subtitlesEnabled)} style={S.toggle(subtitlesEnabled)}><div style={S.toggleDot(subtitlesEnabled)} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.sub }}>무음 제거</span>
                <button onClick={() => setRemoveSilence(!removeSilence)} style={S.toggle(removeSilence)}><div style={S.toggleDot(removeSilence)} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* 기능 안내 - 한 줄 */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {["AI 음성 인식", "하이라이트 자막", "무음 제거", "16:9 유지"].map((t, i) => (
            <span key={i} style={{ fontSize: 11, color: c.dim, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══ 처리 중 ═══
  if (step === "processing") {
    const PHASES = { download: "YouTube 다운로드", upload: "영상 업로드", stt: "AI 음성 인식 (전체 자막 생성)", render: "자막 번인 렌더링" };
    const activeStep = loadingPhase === "download" || loadingPhase === "upload" ? 0 : loadingPhase === "stt" ? 1 : 2;
    const stepLabels = [inputMode === "youtube" ? "다운로드" : "업로드", "음성 인식", "렌더링"];

    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, background: c.bg }}>
        <div style={{ maxWidth: 440, width: "100%", padding: "0 24px" }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "32px 28px", textAlign: "center" }}>
            {/* 프로그레스 링 */}
            <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 20px" }}>
              <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke={c.border} strokeWidth="5" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={c.accent} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*42}`} strokeDashoffset={`${2*Math.PI*42*(1-loadingProgress/100)}`}
                  style={{ transition: "stroke-dashoffset 0.4s ease" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: c.text }}>{loadingProgress}<span style={{ fontSize: 12, color: c.dim }}>%</span></span>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 4 }}>{PHASES[loadingPhase] || "준비 중"}</div>
            <div style={{ fontSize: 12, color: c.dim, marginBottom: 20 }}>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")} 경과</div>

            {/* 단계 바 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {stepLabels.map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 4, borderRadius: 2, background: activeStep > i ? c.success : activeStep === i ? c.accent : c.border, marginBottom: 6, transition: "background 0.3s" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: activeStep >= i ? c.text : c.dim }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: c.accentText, padding: "8px 12px", borderRadius: 8, background: c.accentSoft }}>
              롱폼은 시간이 걸릴 수 있습니다. 백그라운드에서 진행됩니다.
            </div>
          </div>

          <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); stopFake(); setStep("input"); }}
            style={{ ...S.btnOutline, width: "100%", marginTop: 8, fontSize: 13, padding: "12px" }}>취소</button>
        </div>
      </div>
    );
  }

  // ═══ 결과 ═══
  if (step === "result") return (
    <div style={{ flex: 1, overflowY: "auto", background: c.bg }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>편집 완료</div>
          <div style={{ fontSize: 13, color: c.sub, marginTop: 6 }}>자막이 입혀진 영상이 준비되었습니다</div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.15)`, color: c.danger, fontSize: 13 }}>{error}</div>}

        {resultUrl ? (
          <>
            <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
              <video src={resultUrl} controls preload="metadata" style={{ width: "100%", borderRadius: "12px 12px 0 0", display: "block", maxHeight: 400 }} />
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{subtitles.length}개 자막 생성됨</div>
                  <div style={{ fontSize: 11, color: c.dim, marginTop: 2 }}>영상 길이: {fmt(videoDuration)}</div>
                </div>
                <a href={resultUrl} download="longform_subtitled.mp4"
                  style={{ padding: "10px 20px", borderRadius: 8, background: c.accent, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  다운로드
                </a>
              </div>
            </div>

            {/* 자막 목록 (접이식) */}
            {subtitles.length > 0 && (
              <details style={{ ...S.card }}>
                <summary style={{ fontSize: 14, fontWeight: 700, color: c.text, cursor: "pointer", userSelect: "none" }}>
                  생성된 자막 ({subtitles.length}개)
                </summary>
                <div style={{ marginTop: 12, maxHeight: 300, overflowY: "auto" }}>
                  {subtitles.map((sub, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${c.border}`, alignItems: "baseline" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.accentText, flexShrink: 0, width: 50, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(sub.start)}</span>
                      <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{sub.text}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 14, color: c.sub }}>렌더링에 실패했습니다. 다시 시도해주세요.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => { setStep("input"); setResultUrl(null); setSubtitles([]); setFileId(null); setError(""); }}
            style={{ ...S.btnOutline, flex: 1 }}>새 영상</button>
          {resultUrl && fileId && (
            <button onClick={startFullPipeline} style={{ ...S.btnOutline, flex: 1, color: c.accentText, borderColor: c.accent }}>재생성</button>
          )}
        </div>
      </div>
    </div>
  );

  return null;
}
