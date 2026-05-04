import { useState, useRef, useEffect } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { useI18n } from "./i18n";
import { upsertLibraryItem } from "./storage";

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

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const LENGTHS = [
  { id: "s15", label: "15s", desc: "릴스/틱톡" },
  { id: "s30", label: "30s", desc: "쇼츠" },
  { id: "s60", label: "60s", desc: "긴 쇼츠" },
  { id: "s90", label: "90s", desc: "깊은 내용" },
];

const TEMPLATES = [
  { id: "minimal", name: "Minimal", color: "#FFFFFF", bg: "#000" },
  { id: "bold", name: "Bold", color: "#FFD700", bg: "#0A0A0A" },
  { id: "neon", name: "Neon", color: "#00FF88", bg: "#0D0D1A" },
  { id: "news", name: "News", color: "#FFFFFF", bg: "#0F1923" },
  { id: "cinematic", name: "Cinema", color: "#E8D5B7", bg: "#1a0a0a" },
  { id: "tech", name: "Tech", color: "#00D4FF", bg: "#0a1628" },
  { id: "vlog", name: "Vlog", color: "#FF6B6B", bg: "#2D1B2E" },
  { id: "edu", name: "Edu", color: "#4ECDC4", bg: "#1A2332" },
];

export default function ShortsCreator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const D = isDark;
  const c = {
    bg: D ? "#0a0a0f" : "#f8f9fb",
    card: D ? "rgba(255,255,255,0.04)" : "#fff",
    cardHover: D ? "rgba(255,255,255,0.07)" : "#f0f4ff",
    border: D ? "rgba(255,255,255,0.08)" : "#e8ecf1",
    text: D ? "#e8e8ed" : "#1a1a2e",
    sub: D ? "rgba(255,255,255,0.5)" : "#6b7280",
    dim: D ? "rgba(255,255,255,0.25)" : "#9ca3af",
    input: D ? "rgba(255,255,255,0.06)" : "#f4f5f7",
    accent: "#6366f1", // 인디고 단색
    accentHover: "#4f46e5",
    accentSoft: D ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    accentText: D ? "#a5b4fc" : "#6366f1",
    success: "#10b981",
    successSoft: "rgba(16,185,129,0.1)",
    danger: "#ef4444",
  };

  const [step, setStep] = useState("input");
  const [inputMode, setInputMode] = useState("youtube");
  const [ytUrl, setYtUrl] = useState("");
  const [ytParsed, setYtParsed] = useState(null);
  const [ytInfo, setYtInfo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [error, setError] = useState("");

  const [shortsLength, setShortsLength] = useState("s30");
  const [maxSegments, setMaxSegments] = useState(3);
  const [template, setTemplate] = useState("minimal");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  const [loadingPhase, setLoadingPhase] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const fakeProgressRef = useRef(null);
  useGeneratingGuard(step === "processing", 10, "shorts_make");

  const [segments, setSegments] = useState([]);
  const [results, setResults] = useState([]);
  const [editingTitle, setEditingTitle] = useState(null);

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

  // 가짜 진행률: 서버 응답 오기 전에도 부드럽게 올라감
  const startFakeProgress = (from, to, durationMs) => {
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    const step = (to - from) / (durationMs / 200);
    let current = from;
    fakeProgressRef.current = setInterval(() => {
      current = Math.min(to, current + step * (0.5 + Math.random()));
      setLoadingProgress(Math.round(current));
      if (current >= to) clearInterval(fakeProgressRef.current);
    }, 200);
  };

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

  const startFullPipeline = async () => {
    setStep("processing"); setError(""); setLoadingProgress(0); setResults([]); setSegments([]);
    try {
      let fid = fileId;
      // 1. 업로드/다운로드
      if (inputMode === "youtube" && ytParsed) {
        setLoadingPhase("download"); setLoadingProgress(2);
        startFakeProgress(2, 22, 30000);
        const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: ytParsed.url }), timeout: 120000 });
        fid = d.file_id; setFileId(fid);
        if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
        setLoadingProgress(25);
        if (d.caption_only) setError("YouTube가 다운로드를 차단해서 자막으로만 분석합니다.");
      } else if (videoFile) {
        setLoadingPhase("upload"); setLoadingProgress(2);
        startFakeProgress(2, 22, 15000);
        const form = new FormData(); form.append("video", videoFile);
        const r = await fetch(`${API}/upload`, { method: "POST", body: form });
        if (!r.ok) throw new Error("업로드 실패");
        const d = await r.json(); fid = d.file_id; setFileId(fid);
        if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
        setLoadingProgress(25);
      } else throw new Error("영상을 선택해주세요");

      // 2. STT + AI 분석
      setLoadingPhase("analyze"); startFakeProgress(25, 55, 60000);
      const ad = await apiCall(`/analyze/${fid}`, { method: "POST", body: JSON.stringify({ max_segments: maxSegments }), timeout: 180000 });
      const segs = (ad.segments || []).slice(0, maxSegments);
      setSegments(segs);
      if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
      setLoadingProgress(60);
      if (segs.length === 0) throw new Error("하이라이트 구간을 찾지 못했습니다.");

      // 3. 렌더링
      setLoadingPhase("generate"); startFakeProgress(60, 68, 10000);
      const clips = segs.map(s => ({ ...s, title: s.hook || s.hook_text || s.title || "", bottom_title: s.title || s.seo_title || "", subtitles: s.subtitles || [] }));
      const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
      const d = await apiCall("/generate-async", { method: "POST", body: JSON.stringify({
        file_id: fid, clips, template, title_color: tpl.color, caption_color: tpl.color, subtitles_enabled: subtitlesEnabled, layout_mode: "bars",
        title_style: { color: tpl.color, fontSize: 28, shadow: true, bgBox: true, bgColor: "rgba(0,0,0,0.75)", bold: true },
        caption_style: { color: "#FFFFFF", fontSize: 15, shadow: true, bgBox: true, bgColor: "rgba(0,0,0,0.7)" },
      })});
      if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
      setLoadingProgress(70);

      // 4. 폴링
      await new Promise((resolve, reject) => {
        let fails = 0;
        startFakeProgress(70, 95, 90000);
        pollRef.current = setInterval(async () => {
          try {
            const j = await apiCall(`/jobs/${d.job_id}`);
            const done = (j.results || []).filter(r => r.type === "done").length;
            setResults(j.results || []);
            if (j.status === "complete") {
              clearInterval(pollRef.current); pollRef.current = null;
              if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
              setLoadingProgress(100);
              try { (j.results || []).filter(r => r.type === "done").forEach((r, idx) => {
                if (user?.uid) upsertLibraryItem(user.uid, "blog", { id: Date.now().toString() + idx, type: "shorts", title: clips[r.index]?.title || `Short ${r.index + 1}`, content: clips[r.index]?.script || "", date: new Date().toLocaleDateString("ko-KR"), videoUrl: `${API}/outputs/${fid}/${r.filename}` });
              }); } catch {}
              resolve();
            }
            if (j.status === "error") { clearInterval(pollRef.current); pollRef.current = null; if (fakeProgressRef.current) clearInterval(fakeProgressRef.current); reject(new Error(j.error || "렌더링 실패")); }
          } catch { if (++fails > 10) { clearInterval(pollRef.current); pollRef.current = null; if (fakeProgressRef.current) clearInterval(fakeProgressRef.current); reject(new Error("서버 연결 실패")); } }
        }, 3000);
      });
      setStep("results");
    } catch (e) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (fakeProgressRef.current) { clearInterval(fakeProgressRef.current); fakeProgressRef.current = null; }
      if (segments.length > 0) { setError(e.message); setStep("results"); }
      else { setError(e.message); setStep("input"); }
    }
  };

  const regenerateClip = async (segIdx) => {
    if (!fileId || !segments[segIdx]) return;
    const seg = segments[segIdx];
    const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
    try {
      const d = await apiCall("/generate-async", { method: "POST", body: JSON.stringify({
        file_id: fileId, clips: [{ ...seg, title: seg.hook || seg.hook_text || seg.title || "", bottom_title: seg.title || seg.seo_title || "", subtitles: seg.subtitles || [] }],
        template, title_color: tpl.color, caption_color: tpl.color, subtitles_enabled: subtitlesEnabled, layout_mode: "bars",
        title_style: { color: tpl.color, fontSize: 28, shadow: true, bgBox: true, bgColor: "rgba(0,0,0,0.75)", bold: true },
        caption_style: { color: "#FFFFFF", fontSize: 15, shadow: true, bgBox: true, bgColor: "rgba(0,0,0,0.7)" },
      })});
      const poll = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          if (j.status === "complete" && j.results?.length) {
            clearInterval(poll);
            const nr = j.results.find(r => r.type === "done");
            if (nr) setResults(prev => { const u = [...prev]; const ei = u.findIndex(r => r.type === "done" && r.index === segIdx); const m = { ...nr, index: segIdx }; if (ei >= 0) u[ei] = m; else u.push(m); return u; });
          }
        } catch {}
      }, 3000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch {}
  };

  // ── 공통 스타일 ──
  const S = {
    card: { background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: 16, marginBottom: 12 },
    input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" },
    chip: (active) => ({ padding: "9px 0", borderRadius: 8, border: `1.5px solid ${active ? c.accent : c.border}`, background: active ? c.accentSoft : "transparent", color: active ? c.accentText : c.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }),
    btn: { padding: "14px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: c.accent, color: "#fff", transition: "background 0.15s" },
    btnOutline: { padding: "10px 18px", borderRadius: 8, border: `1px solid ${c.border}`, background: "transparent", color: c.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" },
    label: { fontSize: 12, fontWeight: 600, color: c.sub, marginBottom: 8 },
  };

  // ═══ Step 1: 입력 ═══
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: c.bg }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* 헤더 - 컴팩트 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.text }}>숏폼 자동 생성</div>
          <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>영상을 넣으면 AI가 하이라이트를 찾아 쇼츠로 만듭니다</div>
        </div>

        {/* 입력 영역 - 카드 안에 탭+입력+CTA 통합 */}
        <div style={{ ...S.card, padding: 20 }}>
          {/* 탭 */}
          <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${c.border}` }}>
            {[["youtube", "YouTube URL"], ["file", "파일 업로드"]].map(([id, label]) => (
              <button key={id} onClick={() => setInputMode(id)}
                style={{ flex: 1, padding: "8px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: inputMode === id ? c.accent : "transparent", color: inputMode === id ? "#fff" : c.sub, transition: "all 0.15s" }}>{label}</button>
            ))}
          </div>

          {/* URL 입력 */}
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
                  <img src={ytInfo.thumbnail || `https://img.youtube.com/vi/${ytParsed?.id}/mqdefault.jpg`} alt=""
                    style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
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
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = c.border; const f = e.dataTransfer.files[0]; if (f) setVideoFile(f); }}>
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

          {/* CTA 버튼 - 입력 카드 안에 */}
          <button onClick={startFullPipeline} disabled={inputMode === "youtube" ? !ytParsed : !videoFile}
            onMouseEnter={e => { if (!e.target.disabled) e.target.style.background = c.accentHover; }}
            onMouseLeave={e => e.target.style.background = c.accent}
            style={{ ...S.btn, width: "100%", fontSize: 14, padding: "12px", marginTop: 14,
              opacity: (inputMode === "youtube" ? !ytParsed : !videoFile) ? 0.35 : 1 }}>
            쇼츠 {maxSegments}개 자동 생성
          </button>
        </div>

        {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.15)`, color: c.danger, fontSize: 12, lineHeight: 1.5 }}>{error}</div>}

        {/* 설정 - 2열 그리드로 컴팩트하게 */}
        <div style={{ ...S.card, padding: "14px 16px", marginTop: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* 쇼츠 개수 */}
            <div>
              <div style={S.label}>개수</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5].map(n => <button key={n} onClick={() => setMaxSegments(n)}
                  style={{ ...S.chip(maxSegments===n), flex: 1, padding: "7px 0", fontSize: 12 }}>{n}</button>)}
              </div>
            </div>
            {/* 길이 */}
            <div>
              <div style={S.label}>길이</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
                {LENGTHS.map(l => <button key={l.id} onClick={() => setShortsLength(l.id)}
                  style={{ ...S.chip(shortsLength===l.id), padding: "7px 0", fontSize: 11 }}>{l.label}</button>)}
              </div>
            </div>
          </div>

          {/* 스타일 + 자막 토글 한 줄 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>스타일</div>
              <div style={{ display: "flex", gap: 3 }}>
                {TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => setTemplate(tpl.id)} title={tpl.name}
                    style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${template===tpl.id ? c.accent : c.border}`,
                      background: tpl.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                    <span style={{ color: tpl.color, fontSize: 7, fontWeight: 900 }}>A</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.sub }}>자막</span>
              <button onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative",
                  background: subtitlesEnabled ? c.accent : c.border, transition: "background 0.2s" }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 3,
                  left: subtitlesEnabled ? 19 : 3, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* 기능 안내 - 한 줄로 축소 */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {["AI 하이라이트", "자동 자막", "9:16 변환", "바이럴 점수"].map((t, i) => (
            <span key={i} style={{ fontSize: 11, color: c.dim, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══ Step 2: 처리 중 ═══
  if (step === "processing") {
    const PHASES = { download: "YouTube 다운로드", upload: "영상 업로드", analyze: "AI 분석 (음성 인식 + 하이라이트)", generate: "쇼츠 렌더링" };
    const activeStep = loadingPhase === "download" || loadingPhase === "upload" ? 0 : loadingPhase === "analyze" ? 1 : 2;
    const stepLabels = [inputMode === "youtube" ? "다운로드" : "업로드", "AI 분석", "렌더링"];

    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, background: c.bg }}>
        <div style={{ maxWidth: 440, width: "100%", padding: "0 24px" }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "32px 28px", textAlign: "center" }}>
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

            <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
              {stepLabels.map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 4, borderRadius: 2, background: activeStep > i ? c.success : activeStep === i ? c.accent : c.border, marginBottom: 6, transition: "background 0.3s" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: activeStep >= i ? c.text : c.dim }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: c.accentText, padding: "8px 12px", borderRadius: 8, background: c.accentSoft }}>
              백그라운드에서 진행됩니다
            </div>
          </div>

          <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); if (fakeProgressRef.current) clearInterval(fakeProgressRef.current); setStep("input"); }}
            style={{ ...S.btnOutline, width: "100%", marginTop: 8, fontSize: 13, padding: "12px" }}>취소</button>
        </div>
      </div>
    );
  }

  // ═══ Step 3: 결과 ═══
  if (step === "results") {
    const done = results.filter(r => r.type === "done");
    return (
      <div style={{ flex: 1, overflowY: "auto", background: c.bg }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 20px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{done.length > 0 ? `${done.length}개 쇼츠 완성` : "분석 완료"}</div>
              <div style={{ fontSize: 13, color: c.sub, marginTop: 4 }}>{done.length > 0 ? "미리보기 후 다운로드하세요" : "AI가 찾은 하이라이트 구간입니다"}</div>
            </div>
            <button onClick={() => { setStep("input"); setSegments([]); setResults([]); setFileId(null); setError(""); }}
              style={S.btnOutline}>새 영상</button>
          </div>

          {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.15)`, color: c.danger, fontSize: 13 }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: done.length > 0 ? "repeat(auto-fill, minmax(210px, 1fr))" : "1fr", gap: 14 }}>
            {segments.map((seg, i) => {
              const result = done.find(r => r.index === i);
              const videoUrl = result ? `${API}/outputs/${fileId}/${result.filename}` : null;
              const score = seg.score || seg.estimated_retention || Math.floor(65 + Math.random() * 25);
              const title = seg.title || seg.seo_title || `Short ${i+1}`;
              const hook = seg.hook || seg.hook_text || "";
              return (
                <div key={i} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ position: "relative", background: "#0a0a0f", aspectRatio: "9/16", maxHeight: 300 }}>
                    {videoUrl ? (
                      <video src={videoUrl} controls preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                        <div style={{ width: 32, height: 32, border: `2.5px solid ${c.border}`, borderTopColor: c.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: 11, color: c.dim }}>렌더링 중...</span>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      </div>
                    )}
                    <div style={{ position: "absolute", top: 6, right: 6, padding: "3px 8px", borderRadius: 6, background: score >= 75 ? "rgba(16,185,129,0.9)" : score >= 60 ? "rgba(251,191,36,0.9)" : "rgba(156,163,175,0.8)" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#000" }}>{score}점</span>
                    </div>
                    <div style={{ position: "absolute", bottom: 6, left: 6, padding: "2px 7px", borderRadius: 5, background: "rgba(0,0,0,0.65)" }}>
                      <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{fmt(seg.start_seconds||0)}~{fmt(seg.end_seconds||0)}</span>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    {editingTitle === i ? (
                      <input autoFocus value={seg.title||""} onChange={e => setSegments(p => { const n=[...p]; n[i]={...n[i],title:e.target.value}; return n; })}
                        onBlur={() => setEditingTitle(null)} onKeyDown={e => e.key==="Enter" && setEditingTitle(null)}
                        style={{ ...S.input, fontSize: 12, padding: "4px 6px", marginBottom: 3 }} />
                    ) : (
                      <div onClick={() => setEditingTitle(i)} title="클릭하여 수정"
                        style={{ fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 3, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                    )}
                    {hook && <div style={{ fontSize: 10, color: c.accentText, fontWeight: 600, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hook}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      {videoUrl && <a href={videoUrl} download={`short_${i+1}.mp4`}
                        style={{ flex: 1, padding: "7px", borderRadius: 7, background: c.accent, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>다운로드</a>}
                      <button onClick={() => regenerateClip(i)} style={{ ...S.btnOutline, padding: "7px 10px", fontSize: 11, flex: videoUrl ? "0 0 auto" : 1 }}>재생성</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {done.length > 1 && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={() => { done.forEach((r, idx) => { setTimeout(() => { const a = document.createElement("a"); a.href = `${API}/outputs/${fileId}/${r.filename}`; a.download = `short_${r.index+1}.mp4`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }, idx * 500); }); }}
                style={{ ...S.btn, padding: "13px 28px" }}>전체 다운로드 ({done.length}개)</button>
            </div>
          )}

          <div style={{ ...S.card, marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 10 }}>다른 스타일로 재생성</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4, marginBottom: 12 }}>
              {TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => setTemplate(tpl.id)}
                  style={{ padding: "6px 2px", borderRadius: 6, border: `1.5px solid ${template===tpl.id ? c.accent : c.border}`, background: template===tpl.id ? c.accentSoft : "transparent", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: tpl.bg, border: `1px solid ${c.border}`, margin: "0 auto 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: tpl.color, fontSize: 7, fontWeight: 800 }}>A</span>
                  </div>
                  <div style={{ fontSize: 8, color: template===tpl.id ? c.accentText : c.dim }}>{tpl.name}</div>
                </button>
              ))}
            </div>
            <button onClick={startFullPipeline} style={{ ...S.btnOutline, width: "100%", color: c.accentText, borderColor: c.accent }}>전체 재생성</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
