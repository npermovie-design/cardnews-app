import { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Img, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const SHORTS_API = import.meta.env.VITE_SHORTS_FACTORY_URL || "https://shorts-factory-r33o.onrender.com";

// ════════════════════════════════════════
// Remotion 컴포지션 (스킬 기반 — spring, 스타일별 모션)
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
            <SceneSlide scene={sc} style={style} sceneIndex={i} totalScenes={scenes.length} />
          </Sequence>
        );
      })}
      {captions && captions.length > 0 && <CaptionOverlay captions={captions} style={style} />}
      {audioUrl && <Audio src={audioUrl} volume={1} />}
    </AbsoluteFill>
  );
}

// ── 스타일별 씬 슬라이드 (spring 애니메이션 + 고유 모션) ──
function SceneSlide({ scene, style, sceneIndex, totalScenes }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const styleId = style?.id || "cinematic";

  // spring 기반 입장 애니메이션 (스킬: timing.md)
  const enterSpring = spring({ frame, fps, config: { damping: 200 } }); // smooth, no bounce
  const bounceSpring = spring({ frame, fps, config: { damping: 8 } }); // bouncy
  const snappySpring = spring({ frame, fps, config: { damping: 20, stiffness: 200 } }); // snappy

  // 퇴장 페이드아웃
  const exitStart = Math.max(0, durationInFrames - 8);
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Ken Burns 효과 (이미지 줌/팬)
  const kenBurnsScale = interpolate(frame, [0, durationInFrames], [1, 1.12], { extrapolateRight: "clamp" });
  const kenBurnsPanX = interpolate(frame, [0, durationInFrames], [sceneIndex % 2 === 0 ? -2 : 2, sceneIndex % 2 === 0 ? 2 : -2], { extrapolateRight: "clamp" });

  // 스타일별 배경 효과
  const bgGradient = {
    motion: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,106,255,0.1))",
    animation: "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(255,238,173,0.1))",
    realfilm: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8))",
    cinematic: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.85) 100%)",
    minimal: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05))",
    bold: "linear-gradient(180deg, rgba(255,0,0,0.05), rgba(0,0,0,0.8))",
  }[styleId] || "linear-gradient(transparent, rgba(0,0,0,0.6))";

  // 스타일별 제목 모션
  const titleMotion = {
    motion: { // 좌측에서 슬라이드 인
      transform: `translateX(${interpolate(enterSpring, [0, 1], [-80, 0])}px)`,
      opacity: enterSpring,
    },
    animation: { // 바운스 스케일 인
      transform: `scale(${interpolate(bounceSpring, [0, 1], [0.3, 1])})`,
      opacity: bounceSpring,
    },
    realfilm: { // 페이드 업
      transform: `translateY(${interpolate(enterSpring, [0, 1], [30, 0])}px)`,
      opacity: enterSpring,
    },
    cinematic: { // 서서히 등장 + 글로우
      opacity: interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" }),
      textShadow: `0 0 ${interpolate(frame, [0, fps], [0, 30])}px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.9)`,
    },
    minimal: { // 스냅 페이드인
      opacity: snappySpring,
      transform: `translateY(${interpolate(snappySpring, [0, 1], [10, 0])}px)`,
    },
    bold: { // 줌인 + 쉐이크
      transform: `scale(${interpolate(bounceSpring, [0, 1], [1.8, 1])})`,
      opacity: bounceSpring,
    },
  }[styleId] || { opacity: enterSpring };

  // 스타일별 서브텍스트 모션 (제목보다 늦게)
  const delayedSpring = spring({ frame, fps, delay: 8, config: { damping: 200 } });
  const textMotion = {
    opacity: delayedSpring,
    transform: `translateY(${interpolate(delayedSpring, [0, 1], [15, 0])}px)`,
  };

  // 스타일별 제목 위치
  const titlePosition = {
    motion: { top: "15%", left: "8%", right: "8%", textAlign: "left" },
    animation: { top: "50%", left: "8%", right: "8%", transform: "translateY(-50%)", textAlign: "center" },
    realfilm: { bottom: "25%", left: "8%", right: "8%", textAlign: "left" },
    cinematic: { bottom: "20%", left: "8%", right: "8%", textAlign: "center" },
    minimal: { top: "50%", left: "10%", right: "10%", transform: "translateY(-50%)", textAlign: "center" },
    bold: { top: "50%", left: "5%", right: "5%", transform: "translateY(-50%)", textAlign: "center" },
  }[styleId] || { bottom: "20%", left: "8%", right: "8%" };

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      {/* 배경 이미지 (Ken Burns 효과) */}
      {scene.imageUrl ? (
        <AbsoluteFill>
          <Img src={scene.imageUrl} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${kenBurnsScale}) translateX(${kenBurnsPanX}%)`,
          }} />
          <div style={{ position: "absolute", inset: 0, background: bgGradient }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: scene.bgColor || style?.bg || "#1a1a2e" }}>
          {/* 모션그래픽 배경: 움직이는 그래디언트 */}
          {styleId === "motion" && (
            <div style={{
              position: "absolute", inset: "-20%",
              background: `radial-gradient(circle at ${30 + interpolate(frame, [0, durationInFrames], [0, 40])}% ${40 + interpolate(frame, [0, durationInFrames], [0, 20])}%, rgba(0,212,255,0.3), transparent 60%)`,
            }} />
          )}
          {/* 애니메이션 배경: 떠다니는 원 */}
          {styleId === "animation" && Array.from({ length: 5 }).map((_, j) => (
            <div key={j} style={{
              position: "absolute",
              width: 60 + j * 30, height: 60 + j * 30, borderRadius: "50%",
              background: `rgba(${255 - j * 40}, ${107 + j * 30}, ${157 + j * 20}, 0.12)`,
              left: `${10 + j * 18}%`,
              top: `${20 + Math.sin(frame / fps + j) * 15}%`,
            }} />
          ))}
        </AbsoluteFill>
      )}

      {/* 모션그래픽: 데코 라인 */}
      {styleId === "motion" && (
        <div style={{
          position: "absolute", left: "8%", top: "12%",
          width: interpolate(enterSpring, [0, 1], [0, 60]), height: 4,
          background: style?.titleColor || "#00d4ff", borderRadius: 2,
        }} />
      )}

      {/* 씬 번호 인디케이터 */}
      {(styleId === "motion" || styleId === "realfilm") && (
        <div style={{
          position: "absolute", top: "8%", right: "8%",
          fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)",
          opacity: enterSpring,
        }}>{String(sceneIndex + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}</div>
      )}

      {/* 제목 */}
      {scene.title && (
        <div style={{ position: "absolute", ...titlePosition }}>
          <div style={{
            fontSize: style?.titleSize || 42, fontWeight: 900,
            color: style?.titleColor || "#fff",
            lineHeight: 1.15, wordBreak: "keep-all",
            textShadow: styleId === "cinematic" ? undefined : "0 3px 16px rgba(0,0,0,0.8)",
            letterSpacing: styleId === "bold" ? -2 : styleId === "minimal" ? -1 : 0,
            ...titleMotion,
          }}>{scene.title}</div>
          {/* 서브텍스트 */}
          {scene.text && (
            <div style={{
              fontSize: (style?.titleSize || 42) * 0.45,
              fontWeight: 500, color: style?.textColor || "rgba(255,255,255,0.7)",
              lineHeight: 1.5, marginTop: 12, wordBreak: "keep-all",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              ...textMotion,
            }}>{scene.text}</div>
          )}
        </div>
      )}

      {/* 하단 바 (realfilm/cinematic) */}
      {(styleId === "realfilm" || styleId === "cinematic") && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: style?.titleColor || "#fff",
          transform: `scaleX(${interpolate(frame, [0, durationInFrames], [0, 1])})`,
          transformOrigin: "left",
        }} />
      )}
    </AbsoluteFill>
  );
}

// ── 자막 오버레이 (TikTok 스타일 — 단어 하이라이트) ──
function CaptionOverlay({ captions, style }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const current = captions.find(c => currentMs >= c.startMs && currentMs < c.endMs);
  if (!current) return null;

  const styleId = style?.id || "cinematic";
  const progress = interpolate(currentMs, [current.startMs, current.endMs], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const popIn = spring({ frame: Math.round((currentMs - current.startMs) / 1000 * fps), fps, config: { damping: 15, stiffness: 200 } });

  const captionBg = {
    motion: "rgba(0,20,40,0.85)",
    animation: "rgba(30,10,50,0.85)",
    realfilm: "rgba(0,0,0,0.75)",
    cinematic: "rgba(0,0,0,0.0)",
    minimal: "rgba(255,255,255,0.9)",
    bold: "rgba(200,0,0,0.85)",
  }[styleId] || "rgba(0,0,0,0.7)";

  const captionTextColor = styleId === "minimal" ? "#1a1a2e" : (style?.captionColor || "#fff");

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 5% 8%" }}>
      <div style={{
        background: captionBg, borderRadius: styleId === "cinematic" ? 0 : 10,
        padding: styleId === "cinematic" ? "0" : "8px 18px",
        maxWidth: "92%",
        transform: `scale(${interpolate(popIn, [0, 1], [0.9, 1])})`,
        opacity: popIn,
        borderLeft: styleId === "cinematic" ? `3px solid ${style?.titleColor || "#ffd700"}` : "none",
        paddingLeft: styleId === "cinematic" ? 14 : undefined,
      }}>
        <div style={{
          fontSize: style?.captionSize || 24, fontWeight: 700,
          color: captionTextColor,
          textAlign: styleId === "cinematic" ? "left" : "center",
          lineHeight: 1.4, wordBreak: "keep-all",
          textShadow: styleId === "minimal" ? "none" : "0 2px 8px rgba(0,0,0,0.5)",
        }}>{current.text}</div>
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

  // step: input → analyzing → editing
  const [step, setStep] = useState("input");
  const [inputMode, setInputMode] = useState("script"); // script | audio
  const [prompt, setPrompt] = useState(""); // 대본 텍스트
  const [duration, setDuration] = useState(30);
  const [sizeId, setSizeId] = useState("9:16");
  const [styleId, setStyleId] = useState("motion");
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsUrl, setTtsUrl] = useState(null); // TTS 생성된 음성 URL
  const [scenes, setScenes] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [editingScene, setEditingScene] = useState(0);
  const [transcript, setTranscript] = useState("");
  // 에디터 상태 (ShortsCreator 동일)
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSubIdx, setSelectedSubIdx] = useState(-1);
  const [volume, setVolume] = useState(100);
  // 패널
  const [propTab, setPropTab] = useState("scene");
  const [leftW, setLeftW] = useState(200);
  const [rightW, setRightW] = useState(280);
  const [bottomH, setBottomH] = useState(160);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const timelineRef = useRef(null);

  const audioInputRef = useRef(null);
  const playerRef = useRef(null);

  const currentStyle = VIDEO_STYLES.find(s => s.id === styleId) || VIDEO_STYLES[0];
  const currentSize = SIZES.find(s => s.id === sizeId) || SIZES[0];
  const durationInFrames = Math.max(1, Math.round(duration * FPS));
  // 프리뷰: 화면에 맞게 크게
  const previewScale = sizeId === "9:16" ? { w: "min(400px, 45vh * 9 / 16)", h: "min(710px, 78vh)" } : sizeId === "1:1" ? { w: "min(560px, 70vh)", h: "min(560px, 70vh)" } : { w: "min(720px, 90vw)", h: "min(405px, 50vh)" };

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

    // 음성 파일이 있으면 shorts-factory로 업로드+분석 시도
    if (audioFile) {
      setLoadingMsg("음성 파일 분석 중..."); setStep("analyzing");
      let audioAnalyzed = false;
      // 50MB 이하만 서버 업로드 시도 (WAV 등 대용량은 건너뜀)
      if (audioFile.size <= 50 * 1024 * 1024) {
        try {
          const uploadForm = new FormData();
          uploadForm.append("video", audioFile);
          const uploadRes = await fetch(`${SHORTS_API}/upload`, { method: "POST", body: uploadForm }).catch(() => null);
          if (uploadRes?.ok) {
            const uploadData = await uploadRes.json();
            setLoadingMsg("AI가 음성을 인식하고 있어요...");
            const analyzeRes = await fetch(`${SHORTS_API}/analyze/${uploadData.file_id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ max_chars: 0 }),
            }).catch(() => null);
            if (analyzeRes?.ok) {
              const ad = await analyzeRes.json();
              const segs = ad.segments || [];
              const allSubs = [];
              let analyzedText = "";
              for (const seg of segs) {
                if (seg.subtitles) allSubs.push(...seg.subtitles);
                if (seg.script) analyzedText += seg.script + "\n";
                else if (seg.title) analyzedText += seg.title + "\n";
              }
              if (!analyzedText.trim()) analyzedText = ad.transcript || ad.text || segs.map(s => s.hook || s.title || s.script || "").join("\n");
              if (analyzedText.trim()) {
                fullText = analyzedText;
                audioAnalyzed = true;
              }
              captionData = allSubs
                .filter(s => s.text?.trim() && (s.end - s.start) > 0.3)
                .map(s => ({ text: s.text.trim(), startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000) }));
            }
          }
        } catch (e) { console.warn("음성 분석 실패 (서버):", e); }
      }

      if (audioAnalyzed) {
        setTranscript(fullText);
        setCaptions(captionData);
        if (!prompt.trim()) setPrompt(fullText.slice(0, 300));
      } else {
        // 음성 분석 실패 → 프롬프트로 진행 (음성은 배경음으로만 사용)
        console.warn("음성 분석 실패 — 프롬프트 기반으로 진행합니다");
        if (!fullText.trim()) {
          setError("파일이 너무 크거나 음성 인식에 실패했습니다.\n영상 주제를 입력하면 프롬프트 기반으로 영상을 생성합니다.\n음성은 배경 오디오로 사용됩니다.");
          setStep("input"); setLoading(false); return;
        }
      }
    }

    // AI가 스타일 제안 + 씬 생성
    setLoadingMsg("AI가 영상 구성을 설계하고 있어요...");
    setStep("analyzing");
    try {
      const sceneCount = Math.max(3, Math.ceil(duration / 10));
      const ratio = sizeId === "16:9" ? "가로(16:9)" : sizeId === "1:1" ? "정사각(1:1)" : "세로(9:16)";
      const styleDesc = currentStyle.name + " (" + currentStyle.desc + ")";

      // 대본을 문단별로 분할하여 씬에 직접 매핑
      const paragraphs = fullText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 2);
      const useDirectMapping = paragraphs.length >= 3 && paragraphs.length <= 15;
      const actualSceneCount = useDirectMapping ? Math.min(paragraphs.length, 10) : sceneCount;
      const secPerScene = duration / actualSceneCount;

      const aiRes = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: `AI 영상 씬 제작. 반드시 JSON만 출력. 스타일: ${styleDesc}.
사용자의 대본/텍스트를 ${actualSceneCount}개 씬으로 분할.

각 씬 형식:
{"title":"대본에서 가장 핵심적인 한 줄(최대 15자)","text":"대본 원문 요약(최대 40자)","imagePrompt":"${currentStyle.imageKeyword} 관련 영어 2-3단어","startSec":N,"endSec":N}

중요 규칙:
1. title은 반드시 대본에 있는 실제 문장/키워드에서 추출
2. text는 대본의 해당 부분을 그대로 요약
3. 씬 순서 = 대본 순서 (절대 섞지 마)
4. startSec/endSec: 0초부터 ${duration}초까지 균등 분배
5. imagePrompt: "${currentStyle.imageKeyword}" + 대본 내용 관련 영어 키워드

출력: {"scenes":[...]}`
          }, {
            role: "user",
            content: `대본 전문 (${duration}초 ${ratio} 영상):\n\n${fullText.slice(0, 3000)}`
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

      // TTS 생성 (브라우저 Web Speech API 기반)
      if (ttsEnabled && fullText.trim() && window.speechSynthesis) {
        setLoadingMsg("AI 나레이션 음성을 생성하고 있어요...");
        try {
          // Web Speech API로는 파일을 직접 못 만들지만 재생은 가능
          // 실시간 TTS는 편집기에서 재생 시 처리
          // 대신 자막을 대본 기반으로 자동 생성
          if (captionData.length === 0) {
            const wordsPerSec = 3; // 한국어 평균
            let accSec = 0;
            captionData = scenesWithImages.map(sc => {
              const txt = sc.title + (sc.text ? " " + sc.text : "");
              const dur = Math.max(2, txt.length / wordsPerSec);
              const cap = { text: txt, startMs: Math.round(accSec * 1000), endMs: Math.round((accSec + dur) * 1000) };
              accSec += dur + 0.5;
              return cap;
            });
            setCaptions(captionData);
          }
        } catch {}
      }

      setStep("editing");
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

  const basePxPerSec = 16;

  // ════════ Step: 입력 (대본/음성 탭) ════════
  if (step === "input") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: text }}>AI 영상 생성</div>
        <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>대본이나 음성을 넣으면 AI가 자동으로 영상을 구성합니다</div>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 입력 모드 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 20, border: `1px solid ${bdr}` }}>
          {[["script","대본 입력"],["audio","음성 파일"]].map(([k,l]) => (
            <button key={k} onClick={() => setInputMode(k)} style={{ flex: 1, padding: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, background: inputMode === k ? `linear-gradient(135deg,${acc},#8b5cf6)` : "transparent", color: inputMode === k ? "#fff" : muted }}>{l}</button>
          ))}
        </div>

        {inputMode === "script" ? (<>
          {/* 대본 입력 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>대본 / 스크립트 *</div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={8}
              placeholder={"대본을 붙여넣거나 직접 작성하세요.\n\nAI가 대본을 분석해서 씬별로 분할하고\n각 씬에 어울리는 이미지를 자동 매칭합니다.\n\n예시:\n안녕하세요, 오늘은 AI로 영상 만드는 방법입니다.\n첫 번째, 대본을 준비합니다.\n두 번째, 스타일을 선택합니다..."}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", minHeight: 160 }} />
          </div>
          {/* TTS */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={ttsEnabled} onChange={e => setTtsEnabled(e.target.checked)} style={{ accentColor: acc, width: 18, height: 18 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: text }}>AI 음성 (TTS) 나레이션</div>
                <div style={{ fontSize: 11, color: muted }}>대본을 AI가 읽어주는 음성을 자동 생성합니다</div>
              </div>
            </label>
          </div>
        </>) : (<>
          {/* 음성 파일 */}
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 8 }}>음성/나레이션 파일 *</div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>AI가 음성을 분석하여 씬과 자막을 자동 생성합니다. 무음 구간은 자동 제외됩니다.</div>
            {audioFile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: `${acc}08`, border: `1px solid ${acc}25` }}>
                <span style={{ fontSize: 18 }}>🎵</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: acc }}>{audioFile.name}</div>
                  <div style={{ fontSize: 11, color: muted }}>{(audioFile.size / 1024 / 1024).toFixed(1)}MB · {duration}초</div>
                </div>
                <button onClick={() => { setAudioFile(null); setAudioUrl(null); setDuration(30); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            ) : (
              <div onClick={() => audioInputRef.current?.click()} style={{ padding: "36px 20px", borderRadius: 12, border: `2px dashed ${bdr}`, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎤</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>음성 파일 선택</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>MP3, WAV, M4A (최대 50MB)</div>
              </div>
            )}
            <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setAudioFile(e.target.files[0]); e.target.value = ""; }} />
          </div>
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>추가 지시사항 <span style={{ fontSize: 10, color: muted, fontWeight: 400 }}>(선택)</span></div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} placeholder="예: 밝은 분위기로, 자연 이미지 위주로"
              style={{ ...inputStyle, resize: "none", lineHeight: 1.5, fontFamily: "inherit" }} />
          </div>
        </>)}

        {/* 영상 사이즈 + 길이 + 스타일 */}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>영상 사이즈</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setSizeId(s.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${sizeId === s.id ? acc : bdr}`, background: sizeId === s.id ? `${acc}12` : "transparent", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sizeId === s.id ? acc : text }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: muted }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {!audioFile && (
            <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 8 }}>영상 길이</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[15, 30, 60, 90].map(d => (
                  <button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${duration === d ? acc : bdr}`, background: duration === d ? `${acc}12` : "transparent", color: duration === d ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{d}s</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 영상 스타일 */}
        <div style={{ background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 10 }}>영상 디자인 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {VIDEO_STYLES.map(s => (
              <button key={s.id} onClick={() => setStyleId(s.id)} style={{ padding: "10px 6px", borderRadius: 10, border: `2px solid ${styleId === s.id ? acc : bdr}`, background: styleId === s.id ? `${acc}10` : "transparent", cursor: "pointer", textAlign: "center" }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: styleId === s.id ? acc : text, marginTop: 4 }}>{s.name}</div>
                <div style={{ fontSize: 9, color: muted }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12 }}>{error}</div>}

        <button onClick={startGeneration} disabled={loading}
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {inputMode === "audio" && audioFile ? "음성 분석 + 영상 생성" : ttsEnabled ? "AI 영상 + TTS 생성" : "AI 영상 생성하기"} <span style={{ opacity: 0.7, fontSize: 12 }}>(50P)</span>
        </button>
      </div>
    </div>
  );

  // ════════ Step: 분석 중 ════════
  if (step === "analyzing") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes iconBounce2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 20px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: acc, animation: "spin 1.5s linear infinite" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: "iconBounce2 2s ease-in-out infinite" }}><rect x="2" y="4" width="20" height="16" rx="3" stroke={acc} strokeWidth="1.8"/><polygon points="10,8 17,12 10,16" fill={acc}/></svg>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 8 }}>{loadingMsg || "AI가 영상을 구성하고 있어요"}</div>
        <div style={{ fontSize: 13, color: muted }}>대본을 분석하고 씬을 배치하는 중...</div>
        {transcript && <div style={{ fontSize: 11, color: muted, marginTop: 14, padding: "10px 14px", borderRadius: 8, background: `${acc}06`, maxHeight: 80, overflow: "auto", textAlign: "left", lineHeight: 1.5 }}>{transcript.slice(0, 200)}...</div>}
      </div>
    </div>
  );

  // suggest 단계 제거 (입력 단계에서 스타일 선택)
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

  // ════════ Step: 편집 (ShortsCreator 동일 구성) ════════
  const tlPxPerSec = basePxPerSec * timelineZoom;
  const tlWidth = Math.max(duration * tlPxPerSec, 600);

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

        {/* 중앙: 프리뷰 + 재생 컨트롤 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "2px solid #2a2a4a", position: "relative" }}>
            <Player
              acknowledgeRemotionLicense
              ref={playerRef}
              component={SceneComposition}
              inputProps={{ scenes, audioUrl: ttsUrl || audioUrl, style: currentStyle, captions }}
              durationInFrames={durationInFrames}
              fps={FPS}
              compositionWidth={currentSize.w}
              compositionHeight={currentSize.h}
              style={{ width: previewScale.w, height: previewScale.h }}
              controls={false}
              autoPlay={false}
              clickToPlay
            />
            {/* 시간 표시 */}
            <div style={{ position: "absolute", top: 8, right: 10, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>{fmt(playhead)} / {fmt(duration)}</div>
          </div>
          {/* 재생 컨트롤 (ShortsCreator 동일) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button onClick={() => { setPlayhead(0); playerRef.current?.seekTo(0); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏮</button>
            <button onClick={() => {
              if (isPlaying) {
                playerRef.current?.pause();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setIsPlaying(false);
              } else {
                playerRef.current?.play();
                setIsPlaying(true);
                // TTS 재생 (대본이 있고 TTS 활성화 시)
                if (ttsEnabled && prompt.trim() && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                  const utt = new SpeechSynthesisUtterance(prompt.slice(0, 2000));
                  utt.lang = "ko-KR";
                  utt.rate = 1.0;
                  utt.onend = () => {};
                  window.speechSynthesis.speak(utt);
                }
              }
            }} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 12px ${acc}40` }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => { setPlayhead(duration); playerRef.current?.seekTo(durationInFrames); }} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #2a2a4a", background: "#1e1e3a", color: "#aaa", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⏭</button>
          </div>
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

      {/* 하단: 툴바 + 타임라인 (ShortsCreator 동일) */}
      <div style={{ flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", position: "relative" }}>
        {/* 높이 조절 핸들 */}
        <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
          onMouseDown={e => { e.preventDefault(); const sy = e.clientY; const oh = bottomH;
            const mv = ev => setBottomH(Math.max(80, Math.min(300, oh - (ev.clientY - sy))));
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
          }}><div style={{ width: 40, height: 3, borderRadius: 2, background: "#3a3a5a" }} /></div>

        {/* 툴바 (ShortsCreator 동일) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", borderBottom: "1px solid #1a1a30", background: "#12122a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => { const last = scenes[scenes.length-1]; setScenes(prev => [...prev, { title:"새 씬", text:"", imagePrompt:"", bgColor: currentStyle.bg, _startSec: last?._endSec||duration, _endSec:(last?._endSec||duration)+5, _startFrame: Math.round((last?._endSec||duration)*FPS), _durFrames: 5*FPS }]); }}
              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: acc, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ 씬</button>
            {scenes.length > 1 && editingScene >= 0 && (
              <button onClick={() => { setScenes(prev => prev.filter((_,j)=>j!==editingScene)); setEditingScene(Math.max(0,editingScene-1)); }}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>씬 삭제</button>
            )}
            <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 4px" }} />
            <span style={{ fontSize: 10, color: "#888" }}>🔊</span>
            <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: 50, accentColor: "#4ade80" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => { setPlayhead(0); playerRef.current?.seekTo(0); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: acc, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>⏮ 처음</button>
            <span style={{ fontSize: 11, color: acc, fontFamily: "monospace", fontWeight: 600 }}>{fmt(playhead)} | {fmt(duration)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <input type="range" min="50" max="400" value={timelineZoom * 100} onChange={e => setTimelineZoom(Number(e.target.value)/100)} style={{ width: 60, accentColor: acc }} />
              <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: bottomH, overflow: "hidden" }}>
          {/* 트랙 라벨 */}
          <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
            <div style={{ height: 20 }} />
            <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4a9eff" }}>V</div>
            {captions.length > 0 && <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#f59e0b" }}>S</div>}
            {audioUrl && <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#4ade80" }}>A</div>}
          </div>
          {/* 트랙 영역 — 클릭으로 playhead 이동 */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "default" }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const sec = Math.max(0, Math.min(duration, x / tlPxPerSec));
              setPlayhead(sec);
              playerRef.current?.seekTo(Math.round(sec * FPS));
              // 클릭한 위치의 씬 선택
              for (let i = 0; i < scenes.length; i++) {
                if (sec >= (scenes[i]._startSec || 0) && sec < (scenes[i]._endSec || 0)) { setEditingScene(i); break; }
              }
            }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>
              {/* 룰러 */}
              <div style={{ height: 18, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i).filter(i => i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * tlPxPerSec }}><div style={{ width: 1, height: 6, background: "#444" }} /><span style={{ fontSize: 7, color: "#444", position: "absolute", left: 2, top: 6, fontFamily: "monospace" }}>{fmt(sec)}</span></div>
                ))}
              </div>
              {/* 비디오 씬 블록 */}
              <div style={{ height: 28, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {scenes.map((sc, i) => {
                  const left = (sc._startSec || 0) * tlPxPerSec;
                  const width = Math.max(((sc._endSec || 0) - (sc._startSec || 0)) * tlPxPerSec - 1, 16);
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
                    const left = (c.startMs / 1000) * tlPxPerSec;
                    const width = Math.max(((c.endMs - c.startMs) / 1000) * tlPxPerSec, 8);
                    return <div key={i} style={{ position: "absolute", left, top: 3, width, height: 18, background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 3, overflow: "hidden", display: "flex", alignItems: "center", padding: "0 2px" }}>
                      <span style={{ fontSize: 7, color: "#f59e0b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</span>
                    </div>;
                  })}
                </div>
              )}
              {/* 오디오 트랙 */}
              {audioUrl && (
                <div style={{ height: 20, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                  <div style={{ position: "absolute", left: 0, top: 4, width: duration * tlPxPerSec, height: 12, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 3, display: "flex", alignItems: "center", padding: "0 4px" }}>
                    <span style={{ fontSize: 7, color: "#4ade80" }}>Audio</span>
                  </div>
                </div>
              )}
              {/* 재생 헤드 */}
              <div style={{ position: "absolute", left: playhead * tlPxPerSec, top: 0, width: 2, height: "100%", background: "#ff3b3b", zIndex: 20, pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 10, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
