import { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_SHORTS_FACTORY_URL || (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://shorts-factory-r33o.onrender.com");

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

export default function ShortsCreator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu }) {
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
  const [videoFile, setVideoFile] = useState(null);
  const [subFile, setSubFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [fontFile, setFontFile] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  // 분석 결과
  const [segments, setSegments] = useState([]);
  const [selectedSegs, setSelectedSegs] = useState([]);

  // 편집
  const [editClips, setEditClips] = useState([]);
  const [editIdx, setEditIdx] = useState(0);
  const [template, setTemplate] = useState("minimal");
  const [titleColor, setTitleColor] = useState("#FFFFFF");
  const [captionColor, setCaptionColor] = useState("#FFFFFF");
  const [removeSilence, setRemoveSilence] = useState(false);
  const [maxChars, setMaxChars] = useState(0);
  const [shortsLength, setShortsLength] = useState("s30");

  // 생성
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  const fileRef = useRef(null);
  const timerRef = useRef(null);

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

  // ── API 호출 ────────────────────────
  const apiCall = async (path, opts = {}) => {
    const r = await fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `요청 실패 (${r.status})`); }
    return r.json();
  };

  // 유튜브 다운로드
  const handleYoutube = async () => {
    if (!ytUrl.trim()) return;
    setStep("loading"); setLoadingMsg("영상 다운로드 중..."); setError("");
    try {
      const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify({ url: ytUrl }) });
      setFileId(d.file_id);
      if (d.caption_only) setLoadingMsg("자막으로 분석 중... (영상 생성 시 MP4 업로드 필요)");
      else setLoadingMsg("음성 인식 + AI 분석 중...");
      await doAnalyze(d.file_id);
    } catch (e) { setError(e.message); setStep("upload"); }
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
      const r = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!r.ok) throw new Error("업로드 실패");
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
      const d = await apiCall(`/analyze/${fid}`, { method: "POST", body: JSON.stringify({ max_chars: maxChars }) });
      setSegments(d.segments || []);
      setSelectedSegs(d.segments?.map((_, i) => i) || []);
      setStep("analysis");
    } catch (e) { setError("분석 실패: " + e.message); setStep("upload"); }
  };

  // 편집으로 이동
  const goToEdit = () => {
    const clips = selectedSegs.map(i => {
      const s = segments[i];
      return { ...s, title: s.hook_text || "", subtitle_text: s.seo_title || "", subtitles: s.subtitles || [] };
    });
    setEditClips(clips);
    setEditIdx(0);
    setStep("edit");
  };

  // 생성
  const handleGenerate = async () => {
    setStep("generate"); setResults([]); setPreviewIdx(0);
    try {
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({ file_id: fileId, clips: editClips, remove_silence: removeSilence, template, title_color: titleColor, caption_color: captionColor }),
      });
      setJobId(d.job_id);
      // 폴링
      const poll = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          setJobStatus(j);
          setResults(j.results || []);
          if (j.status === "complete") clearInterval(poll);
        } catch {}
      }, 3000);
    } catch (e) { setError("생성 실패: " + e.message); }
  };

  // 연계
  const linkTo = (target, idx) => {
    const clip = editClips[idx] || editClips[0];
    const content = (clip?.subtitles || []).map(s => s.text).join(" ");
    try { localStorage.setItem("shorts_linked_data", JSON.stringify({ title: clip?.title || "", content, hook: clip?.hook_text || "" })); } catch {}
    setAiMenu(target);
  };

  const curClip = editClips[editIdx] || {};
  const updateClip = (key, val) => {
    setEditClips(prev => { const n = [...prev]; n[editIdx] = { ...n[editIdx], [key]: val }; return n; });
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
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 24, border: `1px solid ${bdr}` }}>
          <button onClick={() => setInputMode("youtube")} style={tabBtn(inputMode === "youtube")}>🔗 유튜브 링크</button>
          <button onClick={() => setInputMode("file")} style={tabBtn(inputMode === "file")}>📁 파일 업로드</button>
        </div>

        {inputMode === "youtube" ? (
          <div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.5 }}>🔗</span>
              <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="유튜브 영상 링크를 입력하세요" style={{ ...inputStyle, paddingLeft: 38 }} />
            </div>
            <button onClick={handleYoutube} style={btnStyle} disabled={!ytUrl.trim()}>쇼츠로 변환하기 →</button>
          </div>
        ) : (
          <div>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${bdr}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: ibg }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${acc}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <span style={{ fontSize: 24 }}>⬆️</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>영상 파일을 클릭하여 선택하세요</div>
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

        {/* 설정 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>세부 설정</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>⏱ 쇼츠 길이</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
            {LENGTHS.map(l => (
              <button key={l.id} onClick={() => setShortsLength(l.id)}
                style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${shortsLength === l.id ? acc : bdr}`, background: shortsLength === l.id ? `${acc}15` : "transparent", color: shortsLength === l.id ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                <div>{l.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>{l.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>📝 자막 글자수</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
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
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
        <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8 }}>AI가 영상을 분석하고 있어요</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 20 }}>{loadingMsg}</div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: muted }}>⏱ 경과 시간: {Math.floor(elapsed / 60)}분 {elapsed % 60}초</div>
          <div style={{ fontSize: 11, color: acc, fontWeight: 600, marginTop: 6 }}>다른 메뉴로 이동해도 분석이 계속됩니다</div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 분석 결과
  // ═══════════════════════════════════
  if (step === "analysis") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: text }}>AI 추천 구간</div>
          <div style={{ fontSize: 13, color: muted }}>조회수가 높을 것으로 예상되는 {segments.length}개 구간을 찾았어요</div>
        </div>
        {segments.map((s, i) => (
          <div key={i} onClick={() => setSelectedSegs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
            style={{ ...cardStyle, cursor: "pointer", borderColor: selectedSegs.includes(i) ? acc : bdr, background: selectedSegs.includes(i) ? `${acc}08` : card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${selectedSegs.includes(i) ? acc : bdr}`, display: "flex", alignItems: "center", justifyContent: "center", background: selectedSegs.includes(i) ? acc : "transparent" }}>
                  {selectedSegs.includes(i) && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: text }}>Short {i + 1}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: `${acc}15`, color: acc, fontWeight: 700 }}>{fmt(s.start_seconds)} ~ {fmt(s.end_seconds)}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: acc }}>{s.score}점</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 4 }}>{s.hook_text}</div>
            <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{s.reason?.slice(0, 100)}...</div>
          </div>
        ))}
        <button onClick={goToEdit} disabled={selectedSegs.length === 0} style={{ ...btnStyle, opacity: selectedSegs.length === 0 ? 0.4 : 1 }}>
          {selectedSegs.length}개 구간 편집하기 →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 편집 (알파컷 스타일)
  // ═══════════════════════════════════
  if (step === "edit") return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: D ? "transparent" : "#f4f4f8" }}>
      {/* 좌측: 클립 리스트 */}
      <div style={{ width: 180, flexShrink: 0, padding: "16px 12px", overflowY: "auto", borderRight: `1px solid ${bdr}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>클립 ({editClips.length})</div>
        {editClips.map((c, i) => (
          <div key={i} onClick={() => setEditIdx(i)}
            style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, borderLeft: `3px solid ${editIdx === i ? acc : "transparent"}`, background: editIdx === i ? `${acc}10` : "transparent" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: editIdx === i ? acc : text }}>Short {i + 1}</div>
            <div style={{ fontSize: 10, color: muted }}>{fmt(c.start_seconds)} ~ {fmt(c.end_seconds)}</div>
          </div>
        ))}
        <button onClick={() => setStep("analysis")} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer", marginTop: 8 }}>← 구간 선택</button>
      </div>

      {/* 중앙: 미리보기 */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: 200, height: 356, borderRadius: 20, background: TEMPLATES.find(t => t.id === template)?.bg || "#000", border: `2px solid ${bdr}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: "0 0 20%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: titleColor, textAlign: "center", lineHeight: 1.3 }}>{curClip.title || "제목을 입력하세요"}</span>
          </div>
          <div style={{ flex: 1, background: "rgba(128,128,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>🎬</span>
          </div>
          <div style={{ flex: "0 0 12%", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
            <span style={{ fontSize: 8, color: captionColor, textAlign: "center" }}>자막 영역</span>
          </div>
        </div>
      </div>

      {/* 우측: 편집 패널 */}
      <div style={{ width: 300, flexShrink: 0, padding: "16px", overflowY: "auto", borderLeft: `1px solid ${bdr}` }}>
        {/* 제목 */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 8 }}>제목</div>
          <input value={curClip.title || ""} onChange={e => updateClip("title", e.target.value)} placeholder="쇼츠 제목" style={{ ...inputStyle, marginBottom: 8 }} />
          <input value={curClip.subtitle_text || ""} onChange={e => updateClip("subtitle_text", e.target.value)} placeholder="부제목 (선택)" style={inputStyle} />
        </div>

        {/* 템플릿 */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 8 }}>템플릿</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => { setTemplate(t.id); setTitleColor(t.titleColor); setCaptionColor(t.captionColor); }}
                style={{ border: `2px solid ${template === t.id ? acc : bdr}`, borderRadius: 10, padding: 4, cursor: "pointer", textAlign: "center", background: template === t.id ? `${acc}10` : "transparent" }}>
                <div style={{ height: 48, borderRadius: 6, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <span style={{ fontSize: 7, fontWeight: 900, color: t.titleColor }}>제목</span>
                  <span style={{ fontSize: 6, color: t.captionColor }}>자막</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: template === t.id ? acc : muted, marginTop: 4 }}>{t.name}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>제목 색상</div>
              <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} style={{ width: "100%", height: 32, borderRadius: 8, cursor: "pointer", border: `1px solid ${bdr}` }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>자막 색상</div>
              <input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)} style={{ width: "100%", height: 32, borderRadius: 8, cursor: "pointer", border: `1px solid ${bdr}` }} />
            </div>
          </div>
        </div>

        {/* 자막 */}
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 8 }}>자막 ({(curClip.subtitles || []).length}개)</div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {(curClip.subtitles || []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: muted, flexShrink: 0, width: 40 }}>{fmt(s.start)}</span>
                <input value={s.text} onChange={e => {
                  const subs = [...(curClip.subtitles || [])];
                  subs[i] = { ...subs[i], text: e.target.value };
                  updateClip("subtitles", subs);
                }} style={{ ...inputStyle, padding: "6px 10px", fontSize: 11 }} />
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} style={btnStyle}>영상 생성하기 →</button>
      </div>
    </div>
  );

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
        <div style={{ width: 220, flexShrink: 0, padding: "16px", overflowY: "auto", borderRight: `1px solid ${bdr}` }}>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {doneResults.length > 0 ? (
            <>
              <div style={{ ...cardStyle, width: "100%", maxWidth: 500, textAlign: "center" }}>
                <video controls playsinline src={`${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}`}
                  style={{ maxHeight: 400, maxWidth: "100%", borderRadius: 12 }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {doneResults.map(r => (
                  <a key={r.index} href={`${API}/outputs/${fileId}/${r.filename}`} download={r.filename}
                    style={{ padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    Short {r.index + 1} 다운로드
                  </a>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => linkTo("blog_write", previewIdx)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>글쓰기 연계</button>
                <button onClick={() => linkTo("content_create", previewIdx)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>콘텐츠 제작</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", border: `4px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 18, fontWeight: 900, color: text }}>영상 생성 중...</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>{completed}/{total}개 완료 · 페이지를 이동해도 계속 생성됩니다</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
