import { useState, useRef, useEffect, useMemo } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

// ── Remotion 컴포지션: 씬 기반 영상 ──
function SceneComposition({ scenes, audioUrl, style }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const totalSec = durationInFrames / fps;

  // 현재 프레임에 해당하는 씬 찾기
  const sceneDur = totalSec / Math.max(scenes.length, 1);
  const sceneFrames = Math.round(sceneDur * fps);

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

// 개별 씬 슬라이드
function SceneSlide({ scene, style }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 페이드인 효과
  const opacity = interpolate(frame, [0, Math.min(15, durationInFrames)], [0, 1], { extrapolateRight: "clamp" });
  // 줌 효과
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.08], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 배경 이미지 */}
      {scene.imageUrl && (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 40%, rgba(0,0,0,0.7))" }} />
        </AbsoluteFill>
      )}
      {!scene.imageUrl && (
        <AbsoluteFill style={{ background: scene.bgColor || style?.bg || "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "80%", height: "80%", borderRadius: 20, background: "linear-gradient(135deg, rgba(124,106,255,0.2), rgba(236,72,153,0.1))" }} />
        </AbsoluteFill>
      )}
      {/* 텍스트 오버레이 */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 32px 60px" }}>
        {scene.title && (
          <div style={{ fontSize: style?.titleSize || 36, fontWeight: 900, color: style?.titleColor || "#fff", lineHeight: 1.2, marginBottom: 12, textShadow: "0 2px 12px rgba(0,0,0,0.8)", wordBreak: "keep-all" }}>
            {scene.title}
          </div>
        )}
        {scene.text && (
          <div style={{ fontSize: style?.textSize || 20, fontWeight: 600, color: style?.textColor || "rgba(255,255,255,0.85)", lineHeight: 1.5, textShadow: "0 1px 8px rgba(0,0,0,0.6)", wordBreak: "keep-all" }}>
            {scene.text}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── 스타일 프리셋 ──
const STYLES = [
  { id: "dark", name: "다크", bg: "#0a0a0a", titleColor: "#fff", textColor: "rgba(255,255,255,0.8)", titleSize: 36, textSize: 20 },
  { id: "neon", name: "네온", bg: "#0d0d1a", titleColor: "#00ff88", textColor: "#a5b4fc", titleSize: 38, textSize: 18 },
  { id: "warm", name: "따뜻한", bg: "#1a0f0a", titleColor: "#ffd700", textColor: "#ffeead", titleSize: 36, textSize: 20 },
  { id: "clean", name: "깔끔", bg: "#f5f5f5", titleColor: "#1a1a2e", textColor: "#555", titleSize: 34, textSize: 18 },
  { id: "bold", name: "강렬", bg: "#000", titleColor: "#ff3b3b", textColor: "#fff", titleSize: 42, textSize: 22 },
];

const DURATIONS = [
  { id: 15, label: "15초" },
  { id: 30, label: "30초" },
  { id: 60, label: "60초" },
  { id: 90, label: "90초" },
];

const FPS = 30;

export default function AiVideoGenerator({ isDark, user, showPointConfirm, onUserUpdate }) {
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const acc = "#7c6aff";

  const [step, setStep] = useState("input"); // input | generating | preview
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [styleId, setStyleId] = useState("dark");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingScene, setEditingScene] = useState(-1);
  const audioRef = useRef(null);

  const currentStyle = STYLES.find(s => s.id === styleId) || STYLES[0];
  const durationInFrames = duration * FPS;

  // 오디오 파일 → URL
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      // 오디오 길이 감지
      const audio = new window.Audio(url);
      audio.onloadedmetadata = () => {
        const dur = Math.ceil(audio.duration);
        if (dur > 5) setDuration(Math.min(120, dur));
      };
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioFile]);

  // AI 씬 생성
  const generateScenes = async () => {
    if (!prompt.trim()) { setError("영상 주제를 입력해주세요"); return; }
    if (showPointConfirm && user && !(await showPointConfirm(50))) return;

    setLoading(true); setError(""); setStep("generating");
    try {
      const sceneCount = Math.max(3, Math.ceil(duration / 8));
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `너는 AI 영상 제작 전문가야. 사용자의 프롬프트를 기반으로 쇼츠/릴스용 영상 씬을 JSON으로 생성해.
각 씬은 {"title":"짧은 제목 (10자 이내)","text":"설명 텍스트 (30자 이내)","imagePrompt":"Unsplash 검색용 영어 키워드 2-3단어","bgColor":"#hex 배경색"} 형식이야.
정확히 ${sceneCount}개의 씬을 생성해. JSON 배열만 반환해.`
          }, {
            role: "user",
            content: `다음 주제로 ${duration}초짜리 세로 영상(9:16)의 씬 ${sceneCount}개를 만들어줘:\n${prompt}`
          }],
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.content || "";
      // JSON 파싱
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("씬 생성 실패");
      const parsed = JSON.parse(jsonMatch[0]);

      // Unsplash에서 이미지 검색
      const scenesWithImages = await Promise.all(parsed.map(async (scene) => {
        if (scene.imagePrompt) {
          try {
            const imgRes = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(scene.imagePrompt)}&per_page=1&orientation=portrait`);
            const imgData = await imgRes.json();
            const imgUrl = imgData.results?.[0]?.urls?.regular;
            return { ...scene, imageUrl: imgUrl || null };
          } catch { return scene; }
        }
        return scene;
      }));

      setScenes(scenesWithImages);
      setStep("preview");
    } catch (e) {
      setError("씬 생성 실패: " + e.message);
      setStep("input");
    }
    setLoading(false);
  };

  // 씬 이미지 교체
  const replaceSceneImage = async (idx, query) => {
    try {
      const res = await fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`);
      const data = await res.json();
      const urls = (data.results || []).map(r => r.urls?.regular).filter(Boolean);
      if (urls.length > 0) {
        setScenes(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: urls[Math.floor(Math.random() * urls.length)] } : s));
      }
    } catch {}
  };

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: D ? "rgba(255,255,255,0.06)" : "#f9f9fc", color: text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  // ════════════════════════════════
  // Step: 입력
  // ════════════════════════════════
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text, letterSpacing: -0.5 }}>AI 영상 생성</div>
        <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>프롬프트를 입력하면 AI가 씬별 영상을 자동 생성합니다</div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 프롬프트 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>영상 주제 *</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="예: 2026년 AI 트렌드 5가지를 소개하는 쇼츠 영상&#10;예: 아침 루틴 브이로그 느낌의 릴스 영상&#10;예: 맛집 추천 TOP 5 리스트 영상"
            style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} />
        </div>

        {/* 음성 파일 (선택) */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 4 }}>음성/나레이션 파일 <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>(선택)</span></div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 10, lineHeight: 1.5 }}>음성 파일을 업로드하면 해당 길이에 맞춰 영상이 생성됩니다</div>
          {audioFile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${acc}10`, border: `1px solid ${acc}30` }}>
              <span style={{ fontSize: 16 }}>🎵</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: acc }}>{audioFile.name}</div>
                <div style={{ fontSize: 11, color: muted }}>{(audioFile.size / 1024 / 1024).toFixed(1)}MB · {duration}초</div>
              </div>
              <button onClick={() => { setAudioFile(null); setDuration(30); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => audioRef.current?.click()} style={{ padding: "10px 16px", borderRadius: 10, border: `1px dashed ${bdr}`, background: "transparent", color: muted, cursor: "pointer", fontSize: 12, width: "100%" }}>
              🎤 음성 파일 선택 (MP3, WAV, M4A)
            </button>
          )}
          <input ref={audioRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setAudioFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {/* 영상 길이 */}
        {!audioFile && (
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>영상 길이</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {DURATIONS.map(d => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  style={{ padding: "10px", borderRadius: 10, border: `1.5px solid ${duration === d.id ? acc : bdr}`, background: duration === d.id ? `${acc}15` : "transparent", color: duration === d.id ? acc : muted, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {d.label}
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

        <button onClick={generateScenes}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" }}>
          AI 영상 생성하기 <span style={{ opacity: 0.7, fontSize: 12 }}>(50P)</span>
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════
  // Step: 생성 중
  // ════════════════════════════════
  if (step === "generating") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 8 }}>AI가 영상 씬을 생성하고 있어요</div>
        <div style={{ fontSize: 13, color: muted }}>프롬프트를 분석하고 이미지를 검색하는 중...</div>
      </div>
    </div>
  );

  // ════════════════════════════════
  // Step: 미리보기 + 편집
  // ════════════════════════════════
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: D ? "#1a1a2e" : "#f4f4f8" }}>
      {/* 좌측: 씬 리스트 */}
      <div style={{ width: 280, flexShrink: 0, background: D ? "#16162a" : "#fff", borderRight: `1px solid ${bdr}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: text }}>씬 ({scenes.length})</div>
          <button onClick={() => setScenes(prev => [...prev, { title: "새 씬", text: "", imagePrompt: "", bgColor: currentStyle.bg }])}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: "transparent", color: acc, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ 추가</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {scenes.map((scene, i) => (
            <div key={i} onClick={() => setEditingScene(i)}
              style={{ padding: 10, borderRadius: 10, marginBottom: 4, cursor: "pointer", border: `1.5px solid ${editingScene === i ? acc : "transparent"}`, background: editingScene === i ? `${acc}10` : "transparent" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} alt="" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 64, borderRadius: 6, background: scene.bgColor || "#1a1a2e", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scene.title || `씬 ${i + 1}`}</div>
                  <div style={{ fontSize: 10, color: muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scene.text || "텍스트 없음"}</div>
                  <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{Math.round(duration / scenes.length)}초</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 8, borderTop: `1px solid ${bdr}`, display: "flex", gap: 6 }}>
          <button onClick={() => { setStep("input"); setScenes([]); }} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>← 다시 입력</button>
        </div>
      </div>

      {/* 중앙: 프리뷰 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.3)", border: `2px solid ${bdr}` }}>
          <Player
            component={SceneComposition}
            inputProps={{ scenes, audioUrl, style: currentStyle }}
            durationInFrames={durationInFrames}
            fps={FPS}
            compositionWidth={1080}
            compositionHeight={1920}
            style={{ width: 270, height: 480 }}
            controls
            autoPlay={false}
          />
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: muted }}>{duration}초 · {scenes.length}개 씬 · {currentStyle.name} 스타일</div>
      </div>

      {/* 우측: 씬 편집 */}
      <div style={{ width: 300, flexShrink: 0, background: D ? "#16162a" : "#fff", borderLeft: `1px solid ${bdr}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {editingScene >= 0 && scenes[editingScene] ? (() => {
          const sc = scenes[editingScene];
          const upd = (k, v) => setScenes(prev => prev.map((s, i) => i === editingScene ? { ...s, [k]: v } : s));
          return (
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: acc, marginBottom: 12 }}>씬 {editingScene + 1} 편집</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>제목</div>
                <input value={sc.title || ""} onChange={e => upd("title", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>텍스트</div>
                <textarea value={sc.text || ""} onChange={e => upd("text", e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>이미지 검색어</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input value={sc.imagePrompt || ""} onChange={e => upd("imagePrompt", e.target.value)} placeholder="영어 키워드" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => replaceSceneImage(editingScene, sc.imagePrompt)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: `${acc}10`, color: acc, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>검색</button>
                </div>
              </div>
              {sc.imageUrl && <img src={sc.imageUrl} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>배경색 (이미지 없을 때)</div>
                <input type="color" value={sc.bgColor || "#1a1a2e"} onChange={e => upd("bgColor", e.target.value)} style={{ width: "100%", height: 28, borderRadius: 6, cursor: "pointer", border: `1px solid ${bdr}` }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { if (scenes.length > 1) { setScenes(prev => prev.filter((_, j) => j !== editingScene)); setEditingScene(Math.max(0, editingScene - 1)); } }}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>삭제</button>
              </div>
            </div>
          );
        })() : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ textAlign: "center", color: muted, fontSize: 12 }}>좌측에서 씬을 선택하면<br/>여기서 편집할 수 있어요</div>
          </div>
        )}
      </div>
    </div>
  );
}
