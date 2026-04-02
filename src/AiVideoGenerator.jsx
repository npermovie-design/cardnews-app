import { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const SHORTS_API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// ════════════════════════════════════════
// Remotion 컴포지션
// ════════════════════════════════════════
function SceneComposition({ scenes, audioUrl, style, captions }) {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: style?.bg || "#000" }}>
      {scenes.map((sc, i) => {
        const from = Math.round(sc._startFrame || 0);
        const dur = Math.round(sc._durFrames || (durationInFrames / scenes.length));
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SceneSlide scene={sc} style={style} />
          </Sequence>
        );
      })}
      {/* 자막 오버레이 */}
      {captions && captions.length > 0 && <CaptionOverlay captions={captions} style={style} />}
      {audioUrl && <Audio src={audioUrl} volume={1} />}
    </AbsoluteFill>
  );
}

function SceneSlide({ scene, style }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.75))" }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: scene.bgColor || style?.bg || "#1a1a2e" }} />
      )}
      {/* 씬 제목 */}
      {scene.title && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8%" }}>
          <div style={{ fontSize: style?.titleSize || 42, fontWeight: 900, color: style?.titleColor || "#fff", textAlign: "center", lineHeight: 1.2, textShadow: "0 4px 20px rgba(0,0,0,0.9)", wordBreak: "keep-all" }}>{scene.title}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

function CaptionOverlay({ captions, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const current = captions.find(c => currentMs >= c.startMs && currentMs < c.endMs);
  if (!current) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 6% 10%" }}>
      <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: 12, padding: "10px 20px", maxWidth: "90%" }}>
        <div style={{ fontSize: style?.captionSize || 24, fontWeight: 700, color: style?.captionColor || "#fff", textAlign: "center", lineHeight: 1.4, wordBreak: "keep-all" }}>{current.text}</div>
      </div>
    </AbsoluteFill>
  );
}

// ════════════════════════════════════════
// 상수
// ════════════════════════════════════════
const SIZES = [
  { id: "9:16", label: "9:16", desc: "쇼츠/릴스", w: 1080, h: 1920 },
  { id: "16:9", label: "16:9", desc: "유튜브", w: 1920, h: 1080 },
  { id: "1:1", label: "1:1", desc: "인스타 피드", w: 1080, h: 1080 },
];

const VIDEO_STYLES = [
  { id: "motion", name: "모션그래픽", desc: "역동적인 텍스트 + 그래픽", icon: "🎨", bg: "#0a0a1a", titleColor: "#00d4ff", captionColor: "#fff", titleSize: 44, captionSize: 24, textColor: "#a5b4fc", imageKeyword: "abstract gradient" },
  { id: "animation", name: "애니메이션", desc: "만화/일러스트 느낌", icon: "✏️", bg: "#1a1030", titleColor: "#ff6b9d", captionColor: "#ffeead", titleSize: 40, captionSize: 22, textColor: "#ffeead", imageKeyword: "illustration colorful" },
  { id: "realfilm", name: "실사 홍보영상", desc: "기업/제품 홍보 스타일", icon: "🎬", bg: "#000", titleColor: "#fff", captionColor: "#e0e0e0", titleSize: 42, captionSize: 24, textColor: "#ccc", imageKeyword: "professional business" },
  { id: "cinematic", name: "시네마틱", desc: "영화 같은 무드", icon: "🎞️", bg: "#000", titleColor: "#ffd700", captionColor: "#fff", titleSize: 44, captionSize: 24, textColor: "rgba(255,255,255,0.8)", imageKeyword: "cinematic dark" },
  { id: "minimal", name: "미니멀", desc: "깔끔한 텍스트 중심", icon: "◻️", bg: "#f5f5f5", titleColor: "#1a1a2e", captionColor: "#333", titleSize: 40, captionSize: 22, textColor: "#555", imageKeyword: "minimal clean white" },
  { id: "bold", name: "임팩트", desc: "강렬한 임팩트", icon: "💥", bg: "#000", titleColor: "#ff3b3b", captionColor: "#fff", titleSize: 48, captionSize: 26, textColor: "#fff", imageKeyword: "bold dramatic" },
];

const FPS = 30;

export default function AiVideoGenerator({ isDark, user, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const acc = "#7c6aff";

  // step: input → analyzing → suggest → editing
  const [step, setStep] = useState("input");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [sizeId, setSizeId] = useState("9:16");
  const [styleId, setStyleId] = useState("cinematic");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [captions, setCaptions] = useState([]); // {text, startMs, endMs}
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [editingScene, setEditingScene] = useState(0);
  const [suggestions, setSuggestions] = useState([]); // AI 스타일 제안
  const [transcript, setTranscript] = useState("");
  // 패널
  const [propTab, setPropTab] = useState("scene"); // scene | style | caption
  const [leftW, setLeftW] = useState(200);
  const [rightW, setRightW] = useState(280);
  const [bottomH, setBottomH] = useState(140);

  const audioInputRef = useRef(null);
  const playerRef = useRef(null);

  const currentStyle = VIDEO_STYLES.find(s => s.id === styleId) || VIDEO_STYLES[0];
  const currentSize = SIZES.find(s => s.id === sizeId) || SIZES[0];
  const durationInFrames = Math.max(1, Math.round(duration * FPS));
  const previewScale = sizeId === "9:16" ? { w: 340, h: 604 } : sizeId === "1:1" ? { w: 480, h: 480 } : { w: 600, h: 338 };

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.06)" : "#f9f9fc", color: text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  // 오디오 파일 처리
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      const audio = new window.Audio(url);
      audio.onloadedmetadata = () => { if (audio.duration > 3) setDuration(Math.min(300, Math.ceil(audio.duration))); };
      return () => URL.revokeObjectURL(url);
    }
    setAudioUrl(null);
  }, [audioFile]);

  // ── 1단계: 음성 분석 + AI 씬 생성 ──
  const startGeneration = async () => {
    if (!prompt.trim() && !audioFile) { setError("영상 주제 또는 음성 파일을 입력해주세요"); return; }
    if (showPointConfirm && user && !(await showPointConfirm(50))) return;

    setLoading(true); setError("");

    let fullText = prompt;
    let captionData = [];

    // 음성 파일이 있으면 shorts-factory 서버로 업로드 + 분석 (ShortsCreator와 동일 방식)
    if (audioFile) {
      setLoadingMsg("음성 파일 업로드 중..."); setStep("analyzing");
      try {
        // 1) 파일 업로드
        const uploadForm = new FormData();
        uploadForm.append("video", audioFile); // shorts-factory는 "video" 필드명 사용
        const uploadRes = await fetch(`${SHORTS_API}/upload`, { method: "POST", body: uploadForm });
        if (!uploadRes.ok) throw new Error("서버 업로드 실패");
        const uploadData = await uploadRes.json();
        const fileId = uploadData.file_id;

        // 2) AI 분석 (음성인식 + 세그먼트 추출)
        setLoadingMsg("AI가 음성을 인식하고 있어요...");
        const analyzeRes = await fetch(`${SHORTS_API}/analyze/${fileId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ max_chars: 0 }),
          signal: AbortSignal.timeout(180000),
        });
        if (!analyzeRes.ok) throw new Error("분석 실패");
        const analyzeData = await analyzeRes.json();

        // 분석 결과에서 텍스트 + 자막 추출
        const segments = analyzeData.segments || [];
        fullText = segments.map(s => s.script || s.title || "").join("\n");
        if (!fullText.trim() && analyzeData.transcript) fullText = analyzeData.transcript;
        setTranscript(fullText);

        // 각 세그먼트의 자막 합산
        for (const seg of segments) {
          if (seg.subtitles) {
            captionData.push(...seg.subtitles
              .filter(s => s.text && s.text.trim().length > 0 && (s.end - s.start) > 0.3)
              .map(s => ({ text: s.text.trim(), startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000) }))
            );
          }
        }
        setCaptions(captionData);

        if (!fullText.trim()) { setError("음성에서 텍스트를 인식하지 못했습니다"); setStep("input"); setLoading(false); return; }
        if (!prompt.trim()) setPrompt(fullText.slice(0, 300));
      } catch (e) {
        setError("음성 분석 실패: " + e.message);
        setStep("input"); setLoading(false); return;
      }
    }

    // AI가 스타일 제안 + 씬 생성
    setLoadingMsg("AI가 영상 구성을 설계하고 있어요...");
    setStep("analyzing");
    try {
      const sceneCount = Math.max(3, Math.ceil(duration / 10));
      const ratio = sizeId === "16:9" ? "가로(16:9)" : sizeId === "1:1" ? "정사각(1:1)" : "세로(9:16)";
      const styleDesc = currentStyle.name + " (" + currentStyle.desc + ")";

      const aiRes = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `AI 영상 제작 전문가. 영상 스타일: ${styleDesc}. 사용자 텍스트를 분석하여:
"scenes": ${ratio} 영상의 씬 ${sceneCount}개를 JSON 배열로 생성.
각 씬: {"title":"음성 내용의 핵심 문구(15자)","text":"보조설명(30자)","imagePrompt":"${currentStyle.imageKeyword || ""} + 씬 관련 Unsplash 영어키워드","startSec":시작초,"endSec":종료초}
규칙:
- 음성/텍스트의 실제 내용에서 핵심 키워드를 뽑아 제목으로 사용
- 말하는 내용의 순서대로 씬을 배치
- 각 씬의 시작/종료 시간은 전체 ${duration}초를 균등 분배
- 쉬는 구간이나 의미 없는 부분은 건너뛰기
JSON 형식: {"scenes":[...]}`
          }, {
            role: "user",
            content: `${duration}초 ${ratio} 영상:\n${fullText.slice(0, 1500)}`
          }],
        }),
      });
      const aiData = await aiRes.json();
      const aiContent = aiData.choices?.[0]?.message?.content || aiData.content || "";
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI 응답 파싱 실패");
      const parsed = JSON.parse(jsonMatch[0]);

      // suggestions는 더 이상 사용하지 않음 (입력 단계에서 스타일 선택)

      // 이미지 검색
      const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
      const scenesWithImages = await Promise.all((parsed.scenes || []).map(async (sc, i) => {
        const startSec = sc.startSec ?? (i * duration / sceneCount);
        const endSec = sc.endSec ?? ((i + 1) * duration / sceneCount);
        let imageUrl = null;
        if (sc.imagePrompt) {
          try {
            const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(sc.imagePrompt)}&per_page=1&orientation=${orient}`);
            const d = await r.json();
            imageUrl = d.results?.[0]?.urls?.regular || null;
          } catch {}
        }
        return {
          ...sc, imageUrl,
          _startSec: startSec,
          _endSec: endSec,
          _startFrame: Math.round(startSec * FPS),
          _durFrames: Math.round((endSec - startSec) * FPS),
        };
      }));

      setScenes(scenesWithImages);
      setEditingScene(0);
      setStep("editing"); // 바로 편집 화면으로
    } catch (e) {
      setError("씬 생성 실패: " + e.message);
      setStep("input");
    }
    setLoading(false);
  };

  const replaceSceneImage = async (idx, query) => {
    const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
    try {
      const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(query)}&per_page=5&orientation=${orient}`);
      const d = await r.json();
      const urls = (d.results || []).map(r => r.urls?.regular).filter(Boolean);
      if (urls.length) setScenes(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: urls[Math.floor(Math.random() * urls.length)] } : s));
    } catch {}
  };

  const pxPerSec = 16;

  // ════════ Step: 입력 ════════
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text }}>AI 영상 생성</div>
        <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>프롬프트 또는 음성 파일로 AI가 영상을 자동 생성합니다</div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 영상 사이즈 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 사이즈</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {SIZES.map(s => (
              <button key={s.id} onClick={() => setSizeId(s.id)}
                style={{ padding: "14px 8px", borderRadius: 12, border: `2px solid ${sizeId === s.id ? acc : bdr}`, background: sizeId === s.id ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                <div style={{ width: s.id === "9:16" ? 28 : s.id === "1:1" ? 36 : 48, height: s.id === "9:16" ? 48 : s.id === "1:1" ? 36 : 28, borderRadius: 4, border: `2px solid ${sizeId === s.id ? acc : muted}`, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: sizeId === s.id ? acc : text }}>{s.label}</div>
                <div style={{ fontSize: 10, color: muted }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 영상 스타일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 스타일 *</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)}
                style={{ padding: "14px 8px", borderRadius: 12, border: `2px solid ${styleId === s.id ? acc : bdr}`, background: styleId === s.id ? `${acc}10` : "transparent", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: styleId === s.id ? acc : text }}>{s.name}</div>
                <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 음성 파일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>음성/나레이션 파일 <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(선택)</span></div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 10 }}>음성을 AI가 분석하여 내용에 맞는 씬과 자막을 자동 생성합니다</div>
          {audioFile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${acc}08`, border: `1px solid ${acc}25` }}>
              <span style={{ fontSize: 16 }}>🎵</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: acc }}>{audioFile.name}</div>
                <div style={{ fontSize: 11, color: muted }}>{(audioFile.size / 1024 / 1024).toFixed(1)}MB · {duration}초</div>
              </div>
              <button onClick={() => { setAudioFile(null); setAudioUrl(null); setDuration(30); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => audioInputRef.current?.click()} style={{ padding: "14px", borderRadius: 10, border: `2px dashed ${bdr}`, background: "transparent", color: muted, cursor: "pointer", fontSize: 12, width: "100%", fontWeight: 600 }}>
              🎤 음성 파일 선택 (MP3, WAV, M4A)
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setAudioFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {/* 프롬프트 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>영상 주제 {!audioFile && <span style={{ color: "#f87171" }}>*</span>}</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder={audioFile ? "음성 내용 외 추가 지시사항 (선택)" : "영상 주제를 입력하세요"}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} />
        </div>

        {/* 영상 길이 */}
        {!audioFile && (
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 길이</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[15, 30, 60, 90].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  style={{ padding: "10px", borderRadius: 10, border: `1.5px solid ${duration === d ? acc : bdr}`, background: duration === d ? `${acc}15` : "transparent", color: duration === d ? acc : muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{d}초</button>
              ))}
            </div>
          </div>
        )}

        {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12 }}>{error}</div>}

        <button onClick={startGeneration} disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {audioFile ? "음성 분석 + 영상 생성" : "AI 영상 생성하기"} <span style={{ opacity: 0.7, fontSize: 12 }}>(50P)</span>
        </button>
      </div>
    </div>
  );

  // ════════ Step: 분석 중 ════════
  if (step === "analyzing") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 8 }}>{loadingMsg}</div>
        {transcript && <div style={{ fontSize: 11, color: muted, marginTop: 12, padding: "10px 14px", borderRadius: 8, background: `${acc}08`, maxHeight: 100, overflow: "auto", textAlign: "left", lineHeight: 1.6 }}>인식된 텍스트: {transcript.slice(0, 200)}...</div>}
      </div>
    </div>
  );

  // ════════ Step: 스타일 제안 ════════
  if (step === "suggest") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>AI가 추천하는 영상 스타일</div>
          <div style={{ fontSize: 13, color: muted }}>내용을 분석하여 어울리는 스타일을 제안합니다. 선택 후 편집할 수 있어요.</div>
        </div>

        {/* AI 추천 */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: acc, marginBottom: 10 }}>AI 추천</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {suggestions.map((sg, i) => {
                const matched = VIDEO_STYLES.find(vs => vs.id === sg.id || vs.name === sg.name);
                const sId = matched?.id || VIDEO_STYLES[i % VIDEO_STYLES.length].id;
                const sty = matched || VIDEO_STYLES[i % VIDEO_STYLES.length];
                return (
                  <div key={i} onClick={() => setStyleId(sId)}
                    style={{ padding: 16, borderRadius: 14, border: `2px solid ${styleId === sId ? acc : bdr}`, background: styleId === sId ? `${acc}10` : card, cursor: "pointer", transition: "all .15s" }}>
                    <div style={{ width: "100%", height: 40, borderRadius: 8, background: sty.bg, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: sty.titleColor }}>Aa</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{sg.name || sty.name}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sg.reason}</div>
                    {styleId === sId && <div style={{ fontSize: 10, color: acc, fontWeight: 700, marginTop: 6 }}>선택됨</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 전체 스타일 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10 }}>전체 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)}
                style={{ padding: "8px", borderRadius: 10, border: `2px solid ${styleId === s.id ? acc : bdr}`, cursor: "pointer", textAlign: "center", background: "transparent" }}>
                <div style={{ width: "100%", height: 28, borderRadius: 6, background: s.bg, marginBottom: 4, border: "1px solid rgba(128,128,128,0.2)" }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: styleId === s.id ? acc : muted }}>{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setStep("editing")}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" }}>
          이 스타일로 편집하기 →
        </button>
      </div>
    </div>
  );

  // ════════ Step: 편집 (ShortsCreator 스타일 3패널) ════════
  const sceneDurSec = scenes.length > 0 ? scenes.map(s => (s._endSec || 0) - (s._startSec || 0)) : [duration];
  const tlWidth = Math.max(duration * pxPerSec, 600);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
      {/* 상단 3패널 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* 좌측: 씬 리스트 */}
        <div style={{ width: leftW, flexShrink: 0, background: "#16162a", borderRight: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>씬 ({scenes.length})</span>
            <button onClick={() => { const last = scenes[scenes.length - 1]; setScenes(prev => [...prev, { title: "새 씬", text: "", imagePrompt: "", bgColor: currentStyle.bg, _startSec: last?._endSec || duration, _endSec: (last?._endSec || duration) + 5, _startFrame: Math.round((last?._endSec || duration) * FPS), _durFrames: 5 * FPS }]); }}
              style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #2a2a4a", background: "transparent", color: acc, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
            {scenes.map((sc, i) => (
              <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(sc._startFrame || 0); }}
                style={{ padding: "8px", borderRadius: 8, marginBottom: 2, cursor: "pointer", borderLeft: `3px solid ${editingScene === i ? acc : "transparent"}`, background: editingScene === i ? "rgba(124,106,255,0.15)" : "transparent" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: editingScene === i ? acc : "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `씬 ${i+1}`}</div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{fmt(sc._startSec || 0)} ~ {fmt(sc._endSec || 0)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 6, borderTop: "1px solid #2a2a4a", display: "flex", gap: 4 }}>
            <button onClick={() => setStep("suggest")} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer" }}>← 스타일</button>
            <button onClick={() => { setStep("input"); setScenes([]); setCaptions([]); }} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 10, cursor: "pointer" }}>처음</button>
          </div>
        </div>

        {/* 중앙: 프리뷰 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "2px solid #2a2a4a" }}>
            <Player
              ref={playerRef}
              component={SceneComposition}
              inputProps={{ scenes, audioUrl, style: currentStyle, captions }}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={currentSize.w}
              compositionHeight={currentSize.h}
              style={{ width: previewScale.w, height: previewScale.h }}
              controls
              autoPlay={false}
              clickToPlay
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>{currentSize.label} · {duration}초 · {currentStyle.name}</div>
        </div>

        {/* 우측: 속성 패널 */}
        <div style={{ width: rightW, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
            {[["scene","씬"],["style","스타일"],["caption","자막"]].map(([k,l]) => (
              <button key={k} onClick={() => setPropTab(k)}
                style={{ flex: 1, padding: "9px 0", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: propTab === k ? "#1e1e3a" : "transparent", color: propTab === k ? acc : "#666", borderBottom: propTab === k ? `2px solid ${acc}` : "2px solid transparent" }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {propTab === "scene" && editingScene >= 0 && scenes[editingScene] ? (() => {
              const sc = scenes[editingScene];
              const upd = (k, v) => setScenes(prev => prev.map((s, i) => i === editingScene ? { ...s, [k]: v } : s));
              return <>
                <div style={{ fontSize: 12, fontWeight: 700, color: acc, marginBottom: 10 }}>씬 {editingScene + 1}</div>
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>제목</div><input value={sc.title || ""} onChange={e => upd("title", e.target.value)} style={inputStyle} /></div>
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>텍스트</div><textarea value={sc.text || ""} onChange={e => upd("text", e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>이미지</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={sc.imagePrompt || ""} onChange={e => upd("imagePrompt", e.target.value)} placeholder="영어 키워드" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => replaceSceneImage(editingScene, sc.imagePrompt)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: `${acc}10`, color: acc, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>교체</button>
                  </div>
                </div>
                {sc.imageUrl && <img src={sc.imageUrl} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />}
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>배경색</div><input type="color" value={sc.bgColor || "#1a1a2e"} onChange={e => upd("bgColor", e.target.value)} style={{ width: "100%", height: 24, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} /></div>
                {scenes.length > 1 && <button onClick={() => { setScenes(prev => prev.filter((_, j) => j !== editingScene)); setEditingScene(Math.max(0, editingScene - 1)); }}
                  style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)", color: "#f87171", fontSize: 10, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>씬 삭제</button>}
              </>;
            })() : propTab === "style" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>영상 스타일</div>
                {VIDEO_STYLES.map(s => (
                  <div key={s.id} onClick={() => setStyleId(s.id)}
                    style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", border: `1.5px solid ${styleId === s.id ? acc : "transparent"}`, background: styleId === s.id ? `${acc}10` : "transparent", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: s.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(128,128,128,0.3)" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: s.titleColor }}>Aa</span>
                    </div>
                    <div><div style={{ fontSize: 12, fontWeight: 700, color: styleId === s.id ? acc : "#ccc" }}>{s.name}</div><div style={{ fontSize: 9, color: "#666" }}>{s.desc}</div></div>
                  </div>
                ))}
              </div>
            ) : propTab === "caption" ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>자막 ({captions.length})</div>
                {captions.length === 0 ? <div style={{ fontSize: 11, color: "#555", textAlign: "center", padding: 20 }}>음성 파일을 업로드하면<br/>자막이 자동 생성됩니다</div> : (
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {captions.map((c, i) => (
                      <div key={i} style={{ padding: "6px 8px", borderRadius: 6, marginBottom: 3, background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a30" }}>
                        <div style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>{fmt(c.startMs / 1000)} ~ {fmt(c.endMs / 1000)}</div>
                        <input value={c.text} onChange={e => { const nc = [...captions]; nc[i] = { ...nc[i], text: e.target.value }; setCaptions(nc); }}
                          style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 하단: 타임라인 */}
      <div style={{ flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", position: "relative" }}>
        {/* 높이 조절 핸들 */}
        <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
          onMouseDown={e => { e.preventDefault(); const sy = e.clientY; const oh = bottomH;
            const mv = ev => setBottomH(Math.max(80, Math.min(300, oh - (ev.clientY - sy))));
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
          }}><div style={{ width: 40, height: 3, borderRadius: 2, background: "#3a3a5a" }} /></div>

        <div style={{ display: "flex", height: bottomH, overflow: "hidden" }}>
          {/* 트랙 라벨 */}
          <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
            <div style={{ height: 18 }} />
            <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4a9eff" }}>V</div>
            {captions.length > 0 && <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#f59e0b" }}>S</div>}
            {audioUrl && <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4ade80" }}>A</div>}
          </div>
          {/* 트랙 영역 */}
          <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative" }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>
              {/* 룰러 */}
              <div style={{ height: 18, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i).filter(i => i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * pxPerSec }}><div style={{ width: 1, height: 6, background: "#444" }} /><span style={{ fontSize: 7, color: "#444", position: "absolute", left: 2, top: 6, fontFamily: "monospace" }}>{fmt(sec)}</span></div>
                ))}
              </div>
              {/* 비디오 씬 블록 */}
              <div style={{ height: 28, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {scenes.map((sc, i) => {
                  const left = (sc._startSec || 0) * pxPerSec;
                  const width = Math.max(((sc._endSec || 0) - (sc._startSec || 0)) * pxPerSec - 1, 16);
                  const colors = ["#7c6aff", "#ec4899", "#4ade80", "#f59e0b", "#4a9eff", "#ef4444"];
                  const c = colors[i % colors.length];
                  return (
                    <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(sc._startFrame || 0); }}
                      style={{ position: "absolute", left, top: 3, width, height: 22, background: editingScene === i ? `${c}50` : `${c}25`, border: `1.5px solid ${editingScene === i ? c : `${c}50`}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden" }}>
                      <span style={{ fontSize: 8, color: "#ddd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `#${i+1}`}</span>
                    </div>
                  );
                })}
              </div>
              {/* 자막 트랙 */}
              {captions.length > 0 && (
                <div style={{ height: 24, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  {captions.map((c, i) => {
                    const left = (c.startMs / 1000) * pxPerSec;
                    const width = Math.max(((c.endMs - c.startMs) / 1000) * pxPerSec, 8);
                    return <div key={i} style={{ position: "absolute", left, top: 3, width, height: 18, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 3, overflow: "hidden", display: "flex", alignItems: "center", padding: "0 2px" }}>
                      <span style={{ fontSize: 7, color: "#f59e0b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</span>
                    </div>;
                  })}
                </div>
              )}
              {/* 오디오 트랙 */}
              {audioUrl && (
                <div style={{ height: 20, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  <div style={{ position: "absolute", left: 0, top: 4, width: duration * pxPerSec, height: 12, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 3, display: "flex", alignItems: "center", padding: "0 4px" }}>
                    <span style={{ fontSize: 7, color: "#4ade80" }}>Audio</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
