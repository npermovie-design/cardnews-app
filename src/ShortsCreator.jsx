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
  const [titleColor, setTitleColor] = useState("#FFFFFF");
  const [captionColor, setCaptionColor] = useState("#FFFFFF");
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
  const [fontSize, setFontSize] = useState(14);

  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const playIntervalRef = useRef(null);
  const timelineRef = useRef(null);

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
  if (step === "edit") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
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

        {/* CENTER: Preview */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#12122a", padding: 16, minWidth: 0 }}>
          {/* 9:16 preview */}
          <div style={{ width: 220, height: 391, borderRadius: 16, background: TEMPLATES.find(t => t.id === template)?.bg || "#000", border: "2px solid #2a2a4a", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", flexShrink: 0 }}>
            {/* Title area */}
            <div style={{ flex: "0 0 18%", background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <span style={{ fontSize: fontSize > 14 ? 14 : 12, fontWeight: 900, color: titleColor, textAlign: "center", lineHeight: 1.3 }}>{curClip.title || "제목을 입력하세요"}</span>
            </div>
            {/* Video area */}
            <div style={{ flex: 1, background: "rgba(128,128,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.2"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
              {/* Time overlay */}
              <div style={{ position: "absolute", top: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{fmt(playhead)}</div>
            </div>
            {/* Subtitle area */}
            <div style={{ flex: "0 0 14%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 10px" }}>
              <span style={{ fontSize: Math.min(fontSize, 13), color: captionColor, textAlign: "center", lineHeight: 1.3, fontWeight: 600 }}>
                {currentSub ? currentSub.text : (curClip.subtitle_text || "자막 영역")}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#7c6aff,#8b5cf6)", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(124,106,255,0.4)" }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => { setPlayhead(clipDuration); setIsPlaying(false); }} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏭</button>
            <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace", marginLeft: 4 }}>{fmt(playhead)} / {fmt(clipDuration)}</span>
          </div>
        </div>

        {/* RIGHT: Properties panel */}
        <div style={{ width: 280, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "14px 14px 8px", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>속성</div>
          <div style={{ flex: 1, padding: "0 14px 14px", overflowY: "auto" }}>

            {/* Title editing */}
            <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>제목 / 부제</div>
              <input value={curClip.title || ""} onChange={e => updateClip("title", e.target.value)} placeholder="쇼츠 제목" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              <input value={curClip.subtitle_text || ""} onChange={e => updateClip("subtitle_text", e.target.value)} placeholder="부제목 (선택)" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Selected subtitle editing */}
            {selectedSubIdx >= 0 && (curClip.subtitles || [])[selectedSubIdx] && (
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #7c6aff40" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c6aff", marginBottom: 8 }}>자막 #{selectedSubIdx + 1} 편집</div>
                <textarea value={(curClip.subtitles || [])[selectedSubIdx]?.text || ""} onChange={e => {
                  const subs = [...(curClip.subtitles || [])];
                  subs[selectedSubIdx] = { ...subs[selectedSubIdx], text: e.target.value };
                  updateClip("subtitles", subs);
                }} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                    <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.start || 0} onChange={e => {
                      const subs = [...(curClip.subtitles || [])];
                      subs[selectedSubIdx] = { ...subs[selectedSubIdx], start: parseFloat(e.target.value) || 0 };
                      updateClip("subtitles", subs);
                    }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                    <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.end || 0} onChange={e => {
                      const subs = [...(curClip.subtitles || [])];
                      subs[selectedSubIdx] = { ...subs[selectedSubIdx], end: parseFloat(e.target.value) || 0 };
                      updateClip("subtitles", subs);
                    }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Template */}
            <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>템플릿</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 10 }}>
                {TEMPLATES.map(t => (
                  <div key={t.id} onClick={() => { setTemplate(t.id); setTitleColor(t.titleColor); setCaptionColor(t.captionColor); }}
                    style={{ border: `2px solid ${template === t.id ? "#7c6aff" : "#2a2a4a"}`, borderRadius: 8, padding: 3, cursor: "pointer", textAlign: "center", background: template === t.id ? "rgba(124,106,255,0.12)" : "transparent" }}>
                    <div style={{ height: 36, borderRadius: 5, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <span style={{ fontSize: 6, fontWeight: 900, color: t.titleColor }}>제목</span>
                      <span style={{ fontSize: 5, color: t.captionColor }}>자막</span>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: template === t.id ? "#7c6aff" : "#666", marginTop: 3 }}>{t.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>제목 색상</div>
                  <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} style={{ width: "100%", height: 28, borderRadius: 6, cursor: "pointer", border: "1px solid #2a2a4a", background: "#12122a" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>자막 색상</div>
                  <input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)} style={{ width: "100%", height: 28, borderRadius: 6, cursor: "pointer", border: "1px solid #2a2a4a", background: "#12122a" }} />
                </div>
              </div>
            </div>

            {/* Font size */}
            <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc" }}>글자 크기</div>
                <span style={{ fontSize: 11, color: "#7c6aff", fontWeight: 700 }}>{fontSize}px</span>
              </div>
              <input type="range" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ width: "100%", accentColor: "#7c6aff" }} />
            </div>

            {/* Subtitle list */}
            <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc" }}>자막 ({(curClip.subtitles || []).length})</div>
                <button onClick={() => {
                  const subs = [...(curClip.subtitles || [])];
                  const lastEnd = subs.length > 0 ? (subs[subs.length - 1].end || subs[subs.length - 1].start + 3) : 0;
                  subs.push({ start: lastEnd, end: lastEnd + 3, text: "" });
                  updateClip("subtitles", subs);
                }} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: "1px solid #2a2a4a", background: "transparent", color: "#7c6aff", cursor: "pointer", fontWeight: 700 }}>+ 추가</button>
              </div>
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {(curClip.subtitles || []).map((s, i) => (
                  <div key={i} onClick={() => { setSelectedSubIdx(i); setPlayhead(s.start); }}
                    style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, padding: "4px 6px", borderRadius: 5, cursor: "pointer", background: selectedSubIdx === i ? "rgba(124,106,255,0.15)" : "transparent" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: subColors[i % subColors.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#666", flexShrink: 0, width: 36, fontFamily: "monospace" }}>{fmt(s.start)}</span>
                    <span style={{ fontSize: 11, color: selectedSubIdx === i ? "#e0e0e0" : "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text || "(빈 자막)"}</span>
                    <button onClick={e => { e.stopPropagation(); const subs = [...(curClip.subtitles || [])]; subs.splice(i, 1); updateClip("subtitles", subs); if (selectedSubIdx === i) setSelectedSubIdx(-1); }}
                      style={{ fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} style={{ ...btnStyle, marginTop: 4 }}>영상 생성하기 →</button>
          </div>
        </div>
      </div>

      {/* BOTTOM: Timeline panel */}
      <div style={{ height: 160, flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
        {/* Timeline toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", borderBottom: "1px solid #1a1a30" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>타임라인</span>
            <span style={{ fontSize: 11, color: "#7c6aff", fontFamily: "monospace", fontWeight: 600 }}>{fmt(playhead)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ fontSize: 10, color: "#666", minWidth: 36, textAlign: "center" }}>{Math.round(timelineZoom * 100)}%</span>
            <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>

        {/* Timeline content */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "pointer" }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
            const pxPerSec = 20 * timelineZoom;
            const newTime = Math.max(0, Math.min(clipDuration, x / pxPerSec));
            setPlayhead(newTime);
          }}>
          <div style={{ width: Math.max(clipDuration * 20 * timelineZoom, 600), height: "100%", position: "relative" }}>

            {/* Time ruler */}
            <div style={{ height: 24, position: "relative", borderBottom: "1px solid #1a1a30" }}>
              {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => i).filter(i => {
                if (timelineZoom >= 2) return true;
                if (timelineZoom >= 1) return i % 2 === 0;
                return i % 5 === 0;
              }).map(sec => (
                <div key={sec} style={{ position: "absolute", left: sec * 20 * timelineZoom, top: 0, height: "100%" }}>
                  <div style={{ width: 1, height: sec % 5 === 0 ? 10 : 6, background: sec % 5 === 0 ? "#444" : "#2a2a4a" }} />
                  {(sec % 5 === 0 || timelineZoom >= 2) && <span style={{ fontSize: 9, color: "#555", position: "absolute", left: 3, top: 8, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(sec)}</span>}
                </div>
              ))}
            </div>

            {/* Subtitle track */}
            <div style={{ position: "relative", height: "calc(100% - 24px)", padding: "8px 0" }}>
              {/* Track label */}
              <div style={{ position: "absolute", left: 4, top: 8, fontSize: 9, color: "#444", fontWeight: 600, zIndex: 2, pointerEvents: "none" }}>자막</div>

              {/* Subtitle blocks */}
              {(curClip.subtitles || []).map((s, i) => {
                const pxPerSec = 20 * timelineZoom;
                const left = s.start * pxPerSec;
                const width = Math.max(((s.end || s.start + 3) - s.start) * pxPerSec, 20);
                const color = subColors[i % subColors.length];
                const isSelected = selectedSubIdx === i;
                return (
                  <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setPlayhead(s.start); }}
                    style={{ position: "absolute", left, top: 10, width, height: 44, background: isSelected ? `${color}50` : `${color}30`, border: `1.5px solid ${isSelected ? color : `${color}60`}`, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden", transition: "border-color 0.15s, background 0.15s", zIndex: isSelected ? 5 : 1 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, color: "#e0e0e0", fontWeight: isSelected ? 700 : 400 }}>{s.text || `자막 ${i + 1}`}</div>
                    {/* Resize handles */}
                    <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize", background: isSelected ? `${color}80` : "transparent", borderRadius: "6px 0 0 6px" }}
                      onMouseDown={e => {
                        e.stopPropagation(); e.preventDefault();
                        const startX = e.clientX; const origStart = s.start;
                        const onMove = ev => { const dx = ev.clientX - startX; const dt = dx / (20 * timelineZoom); const newStart = Math.max(0, Math.round((origStart + dt) * 10) / 10); const subs = [...(curClip.subtitles || [])]; subs[i] = { ...subs[i], start: Math.min(newStart, (s.end || s.start + 3) - 0.5) }; updateClip("subtitles", subs); };
                        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                        window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
                      }} />
                    <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize", background: isSelected ? `${color}80` : "transparent", borderRadius: "0 6px 6px 0" }}
                      onMouseDown={e => {
                        e.stopPropagation(); e.preventDefault();
                        const startX = e.clientX; const origEnd = s.end || s.start + 3;
                        const onMove = ev => { const dx = ev.clientX - startX; const dt = dx / (20 * timelineZoom); const newEnd = Math.max(s.start + 0.5, Math.round((origEnd + dt) * 10) / 10); const subs = [...(curClip.subtitles || [])]; subs[i] = { ...subs[i], end: newEnd }; updateClip("subtitles", subs); };
                        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                        window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
                      }} />
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <div style={{ position: "absolute", left: playhead * 20 * timelineZoom, top: 0, width: 2, height: "100%", background: "#ff3b3b", zIndex: 10, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 12, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
            </div>
          </div>
        </div>
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
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 20px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, borderRightColor: acc, animation: "shorts-ring-spin 1.5s linear infinite" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: "shorts-icon-bounce 2s ease-in-out infinite" }}>
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8" />
                    <polygon points="10,8 17,12 10,16" fill={acc} />
                  </svg>
                </div>
              </div>
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
