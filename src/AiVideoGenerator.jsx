import { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// ── Remotion 컴포지션: 씬 기반 영상 ──
function SceneComposition({ scenes, audioUrl, style }) {
  const { fps, durationInFrames } = useVideoConfig();
  const sceneDur = durationInFrames / Math.max(scenes.length, 1);
  const sceneFrames = Math.round(sceneDur);
  return (
    <AbsoluteFill style={{ background: style?.bg || "#000" }}>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={i * sceneFrames} durationInFrames={sceneFrames}>
          <SceneSlide scene={scene} style={style} />
        </Sequence>
      ))}
      {audioUrl && <Audio src={audioUrl} volume={1} />}
    </AbsoluteFill>
  );
}

function SceneSlide({ scene, style }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.min(12, durationInFrames)], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.06], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity }}>
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, rgba(0,0,0,0.75))" }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: scene.bgColor || style?.bg || "#1a1a2e" }} />
      )}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 5% 8%" }}>
        {scene.title && <div style={{ fontSize: style?.titleSize || 36, fontWeight: 900, color: style?.titleColor || "#fff", lineHeight: 1.2, marginBottom: 12, textShadow: "0 2px 12px rgba(0,0,0,0.8)", wordBreak: "keep-all" }}>{scene.title}</div>}
        {scene.text && <div style={{ fontSize: style?.textSize || 20, fontWeight: 600, color: style?.textColor || "rgba(255,255,255,0.85)", lineHeight: 1.5, textShadow: "0 1px 8px rgba(0,0,0,0.6)", wordBreak: "keep-all" }}>{scene.text}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const STYLES = [
  { id: "dark", name: "다크", bg: "#0a0a0a", titleColor: "#fff", textColor: "rgba(255,255,255,0.8)", titleSize: 36, textSize: 20 },
  { id: "neon", name: "네온", bg: "#0d0d1a", titleColor: "#00ff88", textColor: "#a5b4fc", titleSize: 38, textSize: 18 },
  { id: "warm", name: "따뜻한", bg: "#1a0f0a", titleColor: "#ffd700", textColor: "#ffeead", titleSize: 36, textSize: 20 },
  { id: "clean", name: "깔끔", bg: "#f5f5f5", titleColor: "#1a1a2e", textColor: "#555", titleSize: 34, textSize: 18 },
  { id: "bold", name: "강렬", bg: "#000", titleColor: "#ff3b3b", textColor: "#fff", titleSize: 42, textSize: 22 },
];

const DURATIONS = [15, 30, 60, 90];
const SIZES = [
  { id: "9:16", label: "9:16", desc: "쇼츠/릴스", w: 1080, h: 1920 },
  { id: "16:9", label: "16:9", desc: "유튜브", w: 1920, h: 1080 },
  { id: "1:1", label: "1:1", desc: "인스타 피드", w: 1080, h: 1080 },
];
const FPS = 30;

export default function AiVideoGenerator({ isDark, user, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const acc = "#7c6aff";

  const [step, setStep] = useState("input");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [sizeId, setSizeId] = useState("9:16");
  const [styleId, setStyleId] = useState("dark");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingScene, setEditingScene] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const audioInputRef = useRef(null);
  const playerRef = useRef(null);

  const currentStyle = STYLES.find(s => s.id === styleId) || STYLES[0];
  const currentSize = SIZES.find(s => s.id === sizeId) || SIZES[0];
  const durationInFrames = Math.max(1, duration * FPS);

  // 프리뷰 크기 계산 (화면에 맞게)
  const previewScale = sizeId === "9:16" ? { w: 360, h: 640 } : sizeId === "1:1" ? { w: 500, h: 500 } : { w: 640, h: 360 };

  // 오디오 파일 처리
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      const audio = new window.Audio(url);
      audio.onloadedmetadata = () => {
        const dur = Math.ceil(audio.duration);
        if (dur > 3) setDuration(Math.min(180, dur));
      };
      return () => URL.revokeObjectURL(url);
    }
    setAudioUrl(null);
  }, [audioFile]);

  // 음성 분석 → 제목/내용 자동 생성
  const analyzeAudio = async () => {
    if (!audioFile) return;
    setAnalyzing(true);
    try {
      // Whisper API로 음성 → 텍스트 변환
      const form = new FormData();
      form.append("file", audioFile);
      form.append("model", "whisper-1");
      form.append("language", "ko");
      const transcribeRes = await fetch("/api/ai-proxy", {
        method: "POST",
        body: form,
      }).catch(() => null);

      let transcript = "";
      if (transcribeRes?.ok) {
        const td = await transcribeRes.json();
        transcript = td.text || td.transcript || "";
      }

      if (!transcript) {
        // Whisper 실패 시 파일명에서 힌트
        transcript = audioFile.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      }

      // AI로 제목/씬 생성
      setPrompt(transcript.slice(0, 500));
      // 자동으로 씬 생성 시작
      await generateScenesFromText(transcript.slice(0, 500));
    } catch (e) {
      setError("음성 분석 실패: " + e.message);
    }
    setAnalyzing(false);
  };

  const generateScenesFromText = async (inputText) => {
    const txt = inputText || prompt;
    if (!txt.trim()) { setError("영상 주제를 입력해주세요"); return; }
    if (showPointConfirm && user && !(await showPointConfirm(50))) return;

    setLoading(true); setError(""); setStep("generating");
    try {
      const sceneCount = Math.max(3, Math.ceil(duration / 8));
      const ratio = sizeId === "16:9" ? "가로(16:9)" : sizeId === "1:1" ? "정사각형(1:1)" : "세로(9:16)";
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `AI 영상 제작 전문가. ${ratio} 영상의 씬을 JSON으로 생성.
각 씬: {"title":"제목(15자이내)","text":"설명(40자이내)","imagePrompt":"Unsplash영어키워드 2-3개","bgColor":"#hex"}
정확히 ${sceneCount}개. JSON 배열만 반환.`
          }, {
            role: "user",
            content: `${duration}초 ${ratio} 영상 씬 ${sceneCount}개:\n${txt}`
          }],
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("씬 생성 실패");
      const parsed = JSON.parse(jsonMatch[0]);

      // 이미지 검색 (orientation을 사이즈에 맞게)
      const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
      const withImages = await Promise.all(parsed.map(async (scene) => {
        if (scene.imagePrompt) {
          try {
            const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(scene.imagePrompt)}&per_page=1&orientation=${orient}`);
            const d = await r.json();
            return { ...scene, imageUrl: d.results?.[0]?.urls?.regular || null };
          } catch { return scene; }
        }
        return scene;
      }));

      setScenes(withImages);
      setEditingScene(0);
      setStep("preview");
    } catch (e) {
      setError("씬 생성 실패: " + e.message);
      setStep("input");
    }
    setLoading(false);
  };

  const generateScenes = () => generateScenesFromText(prompt);

  const replaceSceneImage = async (idx, query) => {
    const orient = sizeId === "16:9" ? "landscape" : sizeId === "1:1" ? "squarish" : "portrait";
    try {
      const r = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(query)}&per_page=5&orientation=${orient}`);
      const d = await r.json();
      const urls = (d.results || []).map(r => r.urls?.regular).filter(Boolean);
      if (urls.length) setScenes(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: urls[Math.floor(Math.random() * urls.length)] } : s));
    } catch {}
  };

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.06)" : "#f9f9fc", color: text, fontSize: 13, outline: "none", boxSizing: "border-box" };

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
                <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>영상 주제 *</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="예: 2026년 AI 트렌드 5가지 소개&#10;예: 아침 루틴 브이로그 릴스&#10;예: 맛집 TOP 5 리스트"
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} />
        </div>

        {/* 음성 파일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text }}>음성/나레이션 <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(선택)</span></div>
            {audioFile && !analyzing && (
              <button onClick={analyzeAudio} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${acc}40`, background: `${acc}10`, color: acc, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                AI 분석
              </button>
            )}
          </div>
          {analyzing && <div style={{ padding: 12, textAlign: "center", color: acc, fontSize: 12 }}>음성을 분석하고 있어요...</div>}
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
            <button onClick={() => audioInputRef.current?.click()} style={{ padding: "12px", borderRadius: 10, border: `1px dashed ${bdr}`, background: "transparent", color: muted, cursor: "pointer", fontSize: 12, width: "100%" }}>
              🎤 음성 파일 선택 (MP3, WAV, M4A)
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setAudioFile(e.target.files[0]); e.target.value = ""; }} />
          {audioFile && <div style={{ fontSize: 10, color: muted, marginTop: 6 }}>"AI 분석" 버튼을 누르면 음성 내용을 인식해서 제목과 씬을 자동 생성합니다</div>}
        </div>

        {/* 영상 길이 */}
        {!audioFile && (
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 길이</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  style={{ padding: "10px", borderRadius: 10, border: `1.5px solid ${duration === d ? acc : bdr}`, background: duration === d ? `${acc}15` : "transparent", color: duration === d ? acc : muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {d}초
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 스타일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)}
                style={{ padding: "8px 4px", borderRadius: 10, border: `2px solid ${styleId === s.id ? acc : bdr}`, cursor: "pointer", textAlign: "center", background: "transparent" }}>
                <div style={{ width: "100%", height: 32, borderRadius: 6, background: s.bg, marginBottom: 4, border: "1px solid rgba(128,128,128,0.2)" }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: styleId === s.id ? acc : muted }}>{s.name}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12 }}>{error}</div>}

        <button onClick={generateScenes} disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", opacity: loading ? 0.6 : 1 }}>
          AI 영상 생성하기 <span style={{ opacity: 0.7, fontSize: 12 }}>(50P)</span>
        </button>
      </div>
    </div>
  );

  // ════════ Step: 생성 중 ════════
  if (step === "generating") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 8 }}>AI가 영상 씬을 생성하고 있어요</div>
        <div style={{ fontSize: 13, color: muted }}>프롬프트 분석 + 이미지 검색 중...</div>
      </div>
    </div>
  );

  // ════════ Step: 미리보기 + 편집 + 타임라인 ════════
  const sceneDurSec = duration / Math.max(scenes.length, 1);
  const pxPerSec = 20;
  const tlWidth = Math.max(duration * pxPerSec, 600);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: D ? "#1a1a2e" : "#f4f4f8" }}>
      {/* 상단: 3패널 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* 좌측: 씬 리스트 */}
        <div style={{ width: 240, flexShrink: 0, background: D ? "#16162a" : "#fff", borderRight: `1px solid ${bdr}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: text }}>씬 ({scenes.length})</span>
            <button onClick={() => { setScenes(prev => [...prev, { title: "새 씬", text: "", imagePrompt: "", bgColor: currentStyle.bg }]); setEditingScene(scenes.length); }}
              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: acc, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {scenes.map((sc, i) => (
              <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(i * sceneDurSec * FPS); }}
                style={{ padding: 8, borderRadius: 8, marginBottom: 3, cursor: "pointer", border: `1.5px solid ${editingScene === i ? acc : "transparent"}`, background: editingScene === i ? `${acc}10` : "transparent", display: "flex", gap: 8, alignItems: "center" }}>
                {sc.imageUrl ? <img src={sc.imageUrl} alt="" style={{ width: 40, height: sizeId === "16:9" ? 23 : sizeId === "1:1" ? 40 : 56, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  : <div style={{ width: 40, height: sizeId === "16:9" ? 23 : sizeId === "1:1" ? 40 : 56, borderRadius: 4, background: sc.bgColor || "#1a1a2e", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `씬 ${i+1}`}</div>
                  <div style={{ fontSize: 9, color: muted }}>{fmt(i * sceneDurSec)}~{fmt((i+1) * sceneDurSec)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 6, borderTop: `1px solid ${bdr}` }}>
            <button onClick={() => { setStep("input"); setScenes([]); }} style={{ width: "100%", padding: 7, borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>← 다시 입력</button>
          </div>
        </div>

        {/* 중앙: 프리뷰 (대형) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, minWidth: 0, overflow: "hidden" }}>
          <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.4)", border: `2px solid ${bdr}` }}>
            <Player
              ref={playerRef}
              component={SceneComposition}
              inputProps={{ scenes, audioUrl, style: currentStyle }}
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
          <div style={{ marginTop: 10, fontSize: 12, color: muted, display: "flex", gap: 12, alignItems: "center" }}>
            <span>{currentSize.label} · {duration}초 · {scenes.length}씬</span>
          </div>
        </div>

        {/* 우측: 씬 편집 */}
        <div style={{ width: 280, flexShrink: 0, background: D ? "#16162a" : "#fff", borderLeft: `1px solid ${bdr}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {editingScene >= 0 && scenes[editingScene] ? (() => {
            const sc = scenes[editingScene];
            const upd = (k, v) => setScenes(prev => prev.map((s, i) => i === editingScene ? { ...s, [k]: v } : s));
            return (
              <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: acc, marginBottom: 10 }}>씬 {editingScene + 1}</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>제목</div>
                  <input value={sc.title || ""} onChange={e => upd("title", e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>텍스트</div>
                  <textarea value={sc.text || ""} onChange={e => upd("text", e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>이미지</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={sc.imagePrompt || ""} onChange={e => upd("imagePrompt", e.target.value)} placeholder="영어 키워드" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => replaceSceneImage(editingScene, sc.imagePrompt)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: `${acc}10`, color: acc, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>검색</button>
                  </div>
                </div>
                {sc.imageUrl && <img src={sc.imageUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 3 }}>배경색</div>
                  <input type="color" value={sc.bgColor || "#1a1a2e"} onChange={e => upd("bgColor", e.target.value)} style={{ width: "100%", height: 24, borderRadius: 4, cursor: "pointer", border: `1px solid ${bdr}` }} />
                </div>
                {scenes.length > 1 && (
                  <button onClick={() => { setScenes(prev => prev.filter((_, j) => j !== editingScene)); setEditingScene(Math.max(0, editingScene - 1)); }}
                    style={{ width: "100%", padding: 7, borderRadius: 6, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>씬 삭제</button>
                )}
              </div>
            );
          })() : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 12, padding: 20, textAlign: "center" }}>씬을 선택하세요</div>
          )}
        </div>
      </div>

      {/* 하단: 타임라인 */}
      <div style={{ flexShrink: 0, background: D ? "#0f0f1a" : "#eee", borderTop: `2px solid ${bdr}` }}>
        <div style={{ display: "flex", overflowX: "auto", padding: "8px 12px", gap: 0 }}>
          <div style={{ width: tlWidth, position: "relative", height: 56 }}>
            {/* 룰러 */}
            <div style={{ height: 16, position: "relative" }}>
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i).filter(i => i % 5 === 0).map(sec => (
                <div key={sec} style={{ position: "absolute", left: sec * pxPerSec }}>
                  <div style={{ width: 1, height: 6, background: "#444" }} />
                  <span style={{ fontSize: 8, color: "#555", position: "absolute", left: 2, top: 6, fontFamily: "monospace" }}>{fmt(sec)}</span>
                </div>
              ))}
            </div>
            {/* 씬 블록 */}
            <div style={{ height: 28, position: "relative", marginTop: 4 }}>
              {scenes.map((sc, i) => {
                const left = i * sceneDurSec * pxPerSec;
                const width = Math.max(sceneDurSec * pxPerSec - 2, 20);
                const colors = ["#7c6aff", "#ec4899", "#4ade80", "#f59e0b", "#4a9eff", "#ef4444", "#8b5cf6"];
                const c = colors[i % colors.length];
                return (
                  <div key={i} onClick={() => { setEditingScene(i); playerRef.current?.seekTo(i * sceneDurSec * FPS); }}
                    style={{ position: "absolute", left, width, height: 26, background: editingScene === i ? `${c}50` : `${c}25`, border: `1.5px solid ${editingScene === i ? c : `${c}50`}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden" }}>
                    <span style={{ fontSize: 8, color: "#ddd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title || `#${i+1}`}</span>
                  </div>
                );
              })}
            </div>
            {/* 오디오 트랙 */}
            {audioUrl && (
              <div style={{ position: "absolute", bottom: 0, left: 0, width: duration * pxPerSec, height: 6, background: "rgba(74,222,128,0.3)", borderRadius: 3 }}>
                <div style={{ fontSize: 7, color: "#4ade80", position: "absolute", left: 4, top: -10 }}>Audio</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
