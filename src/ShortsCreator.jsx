import { useState, useRef, useEffect, useMemo } from "react";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { useI18n } from "./i18n";
import { upsertLibraryItem } from "./storage";

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

// ── 통합 자료실 (내 자료 + 무료사진 + 무료영상 + GIF 통합 검색) ──
function ArchiveGallery({ onSelect }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState("photo"); // archive | photo | video | gif
  const CATS = [["archive",t("sc_archive_my")],["photo",t("sc_archive_photo")],["video",t("sc_archive_video")],["gif","GIF"]];

  // 내 자료실 로드
  useEffect(() => {
    if (cat !== "archive") return;
    (async () => {
      setLoading(true);
      try {
        const { supabase } = await import("./storage");
        const { data } = await supabase.from("posts").select("id,title,images").eq("cat", "archive").not("images", "is", null).order("id", { ascending: false }).limit(50);
        const imgs = [];
        (data || []).forEach(p => {
          const parsed = typeof p.images === "string" ? JSON.parse(p.images || "[]") : (p.images || []);
          parsed.forEach(url => { if (typeof url === "string" && url.startsWith("http")) imgs.push({ url, title: p.title, src: t("sc_archive_my") }); });
        });
        setItems(imgs);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [cat]);

  // 통합 검색 (Pixabay + Unsplash + Klipy를 카테고리에 따라 합산)
  const doSearch = async (query) => {
    const q = (query || search).trim();
    if (!q && cat !== "archive") { loadTrending(); return; }
    if (!q) return;
    setLoading(true); setItems([]);
    const all = [];
    try {
      if (cat === "photo") {
        // Pixabay 사진 + Unsplash 동시 검색
        const [px, us] = await Promise.allSettled([
          fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(q)}&per_page=12&image_type=photo`).then(r => r.json()),
          fetch(`/api/proxy?action=unsplash&query=${encodeURIComponent(q)}&per_page=12&orientation=portrait`).then(r => r.json()),
        ]);
        if (px.status === "fulfilled" && px.value.hits) all.push(...px.value.hits.map(h => ({ url: h.webformatURL, title: h.tags || "", src: "Pixabay" })));
        if (us.status === "fulfilled" && us.value.results) all.push(...us.value.results.map(h => ({ url: h.urls?.small, title: h.alt_description || "", src: "Unsplash" })));
      } else if (cat === "video") {
        // Pixabay 영상 + Pexels 영상
        const [px, pe] = await Promise.allSettled([
          fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(q)}&per_page=12&video=true`).then(r => r.json()),
          fetch(`/api/proxy?action=pexels&path=videos/search&query=${encodeURIComponent(q)}&per_page=12`).then(r => r.json()),
        ]);
        if (px.status === "fulfilled" && px.value.hits) all.push(...px.value.hits.map(h => ({ url: h.videos?.tiny?.url || h.videos?.small?.url || `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`, title: h.tags || "", src: "Pixabay", thumb: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`, isVideo: true, videoUrl: h.videos?.tiny?.url || h.videos?.small?.url })));
        if (pe.status === "fulfilled" && pe.value.videos) all.push(...pe.value.videos.map(v => ({ url: v.image || v.video_pictures?.[0]?.picture, title: v.url || "", src: "Pexels", isVideo: true, videoUrl: v.video_files?.find(f => f.quality === "sd")?.link || v.video_files?.[0]?.link })));
      } else if (cat === "gif") {
        // Klipy GIF
        const r = await fetch(`/api/proxy?action=klipy&path=gifs/search&q=${encodeURIComponent(q)}&limit=24`).then(r => r.json());
        const data = r.data || r.results || [];
        all.push(...data.map(g => ({ url: g.images?.fixed_width?.url || g.images?.original?.url || g.url || g.media_url, title: g.title || "", src: "Klipy" })));
      } else if (cat === "archive") {
        setItems(prev => prev.filter(it => it.title?.toLowerCase().includes(q.toLowerCase())));
        setLoading(false); return;
      }
    } catch (e) { console.error(e); }
    setItems(all);
    setLoading(false);
  };

  // 트렌딩 로드 (카테고리 전환 시)
  const loadTrending = async () => {
    if (cat === "archive") return;
    setLoading(true); setItems([]);
    const all = [];
    try {
      if (cat === "photo") {
        const [px, us] = await Promise.allSettled([
          fetch(`/api/proxy?action=pixabay&q=background&per_page=9&image_type=photo&editors_choice=true`).then(r => r.json()),
          fetch(`/api/proxy?action=unsplash&query=abstract&per_page=9&orientation=portrait`).then(r => r.json()),
        ]);
        if (px.status === "fulfilled" && px.value.hits) all.push(...px.value.hits.map(h => ({ url: h.webformatURL, title: h.tags || "", src: "Pixabay" })));
        if (us.status === "fulfilled" && us.value.results) all.push(...us.value.results.map(h => ({ url: h.urls?.small, title: h.alt_description || "", src: "Unsplash" })));
      } else if (cat === "video") {
        const px = await fetch(`/api/proxy?action=pixabay&q=nature&per_page=12&video=true`).then(r => r.json()).catch(() => ({}));
        if (px.hits) all.push(...px.hits.map(h => ({ url: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`, title: h.tags || "", src: "Pixabay", isVideo: true, videoUrl: h.videos?.tiny?.url })));
      } else if (cat === "gif") {
        const r = await fetch(`/api/proxy?action=klipy&path=gifs/trending&limit=18`).then(r => r.json()).catch(() => ({}));
        const data = r.data || r.results || [];
        all.push(...data.map(g => ({ url: g.images?.fixed_width?.url || g.images?.original?.url || g.url || g.media_url, title: g.title || "", src: "Klipy" })));
      }
    } catch {}
    setItems(all);
    setLoading(false);
  };

  useEffect(() => { if (cat !== "archive") loadTrending(); }, [cat]);

  const filteredItems = cat === "archive" && search ? items.filter(it => it.title?.toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>{t("sc_archive")}</div>
      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 8, borderRadius: 6, overflow: "hidden", border: "1px solid #2a2a4a" }}>
        {CATS.map(([k,l]) => (
          <button key={k} onClick={() => { setCat(k); setSearch(""); }}
            style={{ flex: 1, padding: "5px 4px", border: "none", background: cat === k ? "#7c6aff" : "#12122a", color: cat === k ? "#fff" : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700, transition: "all .15s" }}>{l}</button>
        ))}
      </div>
      {/* 검색창 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
          placeholder={cat === "archive" ? t("sc_archive_filter") : cat === "gif" ? t("sc_gif_search") : cat === "video" ? t("sc_video_search") : t("sc_photo_search")}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none" }} />
        {cat !== "archive" && <button onClick={() => doSearch()} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{t("sc_search_btn")}</button>}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 16, color: "#666", fontSize: 11 }}>{t("sc_archive_loading")}</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: 16, color: "#555", fontSize: 11 }}>
          {cat === "archive" ? t("sc_archive_no_images") : t("sc_archive_enter_search")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, maxHeight: 260, overflowY: "auto", padding: 2 }}>
          {filteredItems.slice(0, 30).map((it, i) => (
            <div key={i} onClick={() => onSelect(it.videoUrl || it.url)}
              style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", border: "1px solid #2a2a4a", width: "100%", height: 70, position: "relative", background: "#12122a" }}
              title={`[${it.src}] ${it.title}`}>
              <img src={it.url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} draggable={false} />
              {it.isVideo && <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", borderRadius: 3, padding: "1px 4px", fontSize: 8, color: "#4ade80", fontWeight: 700 }}>VIDEO</div>}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.85))", padding: "8px 4px 2px", fontSize: 8, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ color: cat === "gif" ? "#ec4899" : cat === "video" ? "#4ade80" : "#7c6aff", marginRight: 3, fontSize: 7 }}>{it.src}</span>
                {it.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TEMPLATES = [
  { id: "minimal", nameKey: "sc_tpl_minimal", titleColor: "#FFFFFF", captionColor: "#FFFFFF", bg: "#000" },
  { id: "bold", nameKey: "sc_tpl_bold", titleColor: "#FFD700", captionColor: "#FFD700", bg: "#0A0A0A" },
  { id: "neon", nameKey: "sc_tpl_neon", titleColor: "#00FF88", captionColor: "#00FF88", bg: "#0D0D1A" },
  { id: "pastel", nameKey: "sc_tpl_pastel", titleColor: "#FFB6C1", captionColor: "#FFB6C1", bg: "#1A1A2E" },
  { id: "news", nameKey: "sc_tpl_news", titleColor: "#FFFFFF", captionColor: "#FFFFFF", bg: "#0F1923" },
  { id: "cinematic", nameKey: "sc_tpl_cinematic", titleColor: "#E8D5B7", captionColor: "#E8D5B7", bg: "#1a0a0a" },
  { id: "tech", nameKey: "sc_tpl_tech", titleColor: "#00D4FF", captionColor: "#00D4FF", bg: "#0a1628" },
  { id: "luxury", nameKey: "sc_tpl_luxury", titleColor: "#D4AF37", captionColor: "#D4AF37", bg: "#121212" },
  { id: "vlog", nameKey: "sc_tpl_vlog", titleColor: "#FF6B6B", captionColor: "#FF6B6B", bg: "#2D1B2E" },
  { id: "edu", nameKey: "sc_tpl_edu", titleColor: "#4ECDC4", captionColor: "#4ECDC4", bg: "#1A2332" },
];

const LENGTHS = [
  { id: "s15", labelKey: "sc_len_15", descKey: "sc_len_15_desc" },
  { id: "s30", labelKey: "sc_len_30", descKey: "sc_len_30_desc" },
  { id: "s60", labelKey: "sc_len_60", descKey: "sc_len_60_desc" },
  { id: "s90", labelKey: "sc_len_90", descKey: "sc_len_90_desc" },
];

export default function ShortsCreator({ isDark, user, onUserUpdate, onLoginRequest, setAiMenu, onStatusChange, showPointConfirm }) {
  const { t, lang } = useI18n();
  const D = isDark;
  const text = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const acc = "#7c6aff";

  // 프로 전환 예정 안내 (세션당 1회)
  const [showProNotice, setShowProNotice] = useState(() => !sessionStorage.getItem("shorts_pro_notice_seen"));

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
  // 상단 제목 스타일
  const [titleStyle, setTitleStyle] = useState({ color: "#FFFFFF", fontSize: 28, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.75)", opacity: 100, font: "default", align: "center", bold: true, highlightColor: "#FFD700" });
  // 하단 제목 스타일
  const [bottomTitleStyle, setBottomTitleStyle] = useState({ color: "#FFFFFF", fontSize: 22, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.7)", opacity: 100, font: "default", align: "center", bold: false, highlightColor: "#7c6aff" });
  // 자막 스타일
  const [captionStyle, setCaptionStyle] = useState({ color: "#FFFFFF", fontSize: 15, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.7)", opacity: 100, font: "default", align: "center" });
  // 호환성
  const titleColor = titleStyle.color;
  const captionColor = captionStyle.color;
  const fontSize = titleStyle.fontSize;
  const [removeSilence, setRemoveSilence] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(-35); // dB
  const [silenceMinGap, setSilenceMinGap] = useState(0.5); // 초
  const [showSilenceSettings, setShowSilenceSettings] = useState(false);
  const [maxChars, setMaxChars] = useState(0);
  const [shortsLength, setShortsLength] = useState("s30");
  const [userPrompt, setUserPrompt] = useState("");
  const [maxSegments, setMaxSegments] = useState(3); // 쇼츠 생성 개수 (1~5)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false); // 자동자막 기본 OFF
  const [editingSubOnCanvas, setEditingSubOnCanvas] = useState(false); // 캔버스 자막 인라인 편집 중
  const [captionAnimation, setCaptionAnimation] = useState("none"); // 자막 애니메이션
  const CAPTION_ANIMS = [
    { id: "none", name: "없음" }, { id: "fade", name: "페이드" }, { id: "typewriter", name: "타이핑" },
    { id: "highlight", name: "하이라이트" }, { id: "bounce", name: "바운스" }, { id: "slide", name: "슬라이드" },
    { id: "karaoke", name: "가라오케" }, { id: "glow", name: "글로우" }, { id: "pop", name: "팝" },
    { id: "wave", name: "웨이브" }, { id: "blur_in", name: "블러 인" }, { id: "color_cycle", name: "컬러" },
  ];
  const [subLang, setSubLang] = useState("ko"); // 주 자막 언어
  const [dualSubEnabled, setDualSubEnabled] = useState(false); // 이중 자막 ON/OFF
  const [dualSubLang, setDualSubLang] = useState("en"); // 보조 자막 언어
  const [dualSubs, setDualSubs] = useState([]); // [{start, end, text}] 번역된 자막
  const [translating, setTranslating] = useState(false);
  const SUB_LANGS = [["ko","한국어"],["en","English"],["ja","日本語"],["zh","中文"],["es","Español"],["vi","Tiếng Việt"],["th","ไทย"],["id","Bahasa"]];
  const [projectId, setProjectId] = useState(null); // 저장된 프로젝트 ID

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
  // 비디오 세그먼트 (분할/삭제용) — [{start, end, muted}]
  const [videoSegs, setVideoSegs] = useState([]);
  const [selectedSegIdx, setSelectedSegIdx] = useState(-1);
  // 볼륨 + 배경음
  const [volume, setVolume] = useState(100);
  const [bgmFile, setBgmFile] = useState(null); // { name, url }
  const [bgmVolume, setBgmVolume] = useState(50);
  const bgmRef = useRef(null);
  const bgmFileRef = useRef(null);

  // 오버레이 (이미지/로고/텍스트)
  const [overlays, setOverlays] = useState([]); // { id, type:'image'|'text'|'logo', src, text, x, y, w, h, start, end }
  const [selectedOverlay, setSelectedOverlay] = useState(null);
  // 자막/제목 위치 (드래그 가능)
  const [titlePos, setTitlePos] = useState({ x: 50, y: 8 }); // % 기준
  const [bottomTitlePos, setBottomTitlePos] = useState({ x: 50, y: 88 }); // % 기준
  const [captionPos, setCaptionPos] = useState({ x: 50, y: 92 }); // % 기준
  const [dragging, setDragging] = useState(null); // 'title' | 'bottomTitle' | 'caption' | overlay id | null
  // 속성 패널 탭
  const [propTab, setPropTab] = useState("style"); // style | overlay
  // 레이아웃 모드: full(전체화면) | bars(검은바+중앙영상)
  const [layoutMode, setLayoutModeRaw] = useState("bars");
  const setLayoutMode = (mode) => {
    setLayoutModeRaw(mode);
    if (mode === "bars") {
      // bars 모드에서 자막은 반드시 하단 검은바 영역(78% 이하)에 위치
      setCaptionPos(prev => ({ ...prev, y: Math.max(prev.y, 85) }));
      setTitlePos(prev => ({ ...prev, y: Math.min(prev.y, 12) }));
    }
  };
  // 스냅 가이드 표시
  const [snapGuide, setSnapGuide] = useState(null);
  // 단축키 가이드 모달
  const [showShortcuts, setShowShortcuts] = useState(false);
  // 영상 스케일 (%)
  const [videoScale, setVideoScale] = useState(100);
  // 선택된 트랙 요소
  const [selectedTrack, setSelectedTrack] = useState(null); // "V1" | "A1" | null
  // 패널 크기 (드래그 조절)
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [leftPanelWidth, setLeftPanelWidth] = useState(180);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(180);
  // 타임라인 범위 선택
  const [rangeSelecting, setRangeSelecting] = useState(null); // {startPh, endPh}

  // Undo/Redo 히스토리
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const pushUndo = () => {
    undoStack.current.push(JSON.stringify({ editClips, videoSegs, overlays, editIdx }));
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  };
  const doUndo = () => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push(JSON.stringify({ editClips, videoSegs, overlays, editIdx }));
    const prev = JSON.parse(undoStack.current.pop());
    setEditClips(prev.editClips);
    setVideoSegs(prev.videoSegs);
    setOverlays(prev.overlays);
    setEditIdx(prev.editIdx);
  };
  const doRedo = () => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push(JSON.stringify({ editClips, videoSegs, overlays, editIdx }));
    const next = JSON.parse(redoStack.current.pop());
    setEditClips(next.editClips);
    setVideoSegs(next.videoSegs);
    setOverlays(next.overlays);
    setEditIdx(next.editIdx);
  };

  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const playIntervalRef = useRef(null);
  const timelineRef = useRef(null);
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const overlayFileRef = useRef(null);
  const pollRef = useRef(null);

  // ── 폴링 인터벌 정리 (언마운트 시) ──
  useEffect(() => {
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []);

  // ── 현재 클립 (타임라인 등에서 사용) ────────────
  const curClip = editClips[editIdx] || {};
  const updateClip = (key, val) => {
    setEditClips(prev => { const n = [...prev]; n[editIdx] = { ...n[editIdx], [key]: val }; return n; });
  };

  // 세그먼트 총 재생 길이 (키보드 단축키보다 먼저 선언)
  const totalSegsDuration = useMemo(() => videoSegs.reduce((acc, s) => acc + (s.end - s.start), 0), [videoSegs]);
  const clipDuration = totalSegsDuration || Math.max(1, (curClip.end_seconds || 30) - (curClip.start_seconds || 0));

  // ── 키보드 단축키 ──
  // Space: 재생/정지, S: 분할, Delete: 선택 삭제
  // ← →: playhead 1초 이동, Shift+← →: 5초 이동
  // Home/End: 처음/끝으로 이동
  // M: 선택 세그먼트 음소거 토글
  // Ctrl+A: 전체 선택, Escape: 선택 해제
  // [ ]: 줌 축소/확대, Ctrl+Z: 실행취소(구간선택해제)
  // Ctrl+D: 선택 오버레이 복제
  useEffect(() => {
    if (step !== "edit") return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      // Space: 재생/정지
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
      // Delete/Backspace: 선택 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedSubIdx >= 0) { deleteSubtitle(selectedSubIdx); return; }
        if (selectedSegIdx >= 0 && videoSegs.length > 1) { deleteSegment(selectedSegIdx); return; }
        if (selectedOverlay) { setOverlays(prev => prev.filter(o => o.id !== selectedOverlay)); setSelectedOverlay(null); }
      }
      // ← →: playhead 이동 (Shift: 5초)
      if (e.key === "ArrowLeft") { e.preventDefault(); userSeekRef.current = true; setPlayhead(prev => Math.max(0, prev - (e.shiftKey ? 5 : 1))); }
      if (e.key === "ArrowRight") { e.preventDefault(); userSeekRef.current = true; setPlayhead(prev => Math.min(clipDuration, prev + (e.shiftKey ? 5 : 1))); }
      // Home/End: 처음/끝
      if (e.key === "Home") { e.preventDefault(); setPlayhead(0); }
      if (e.key === "End") { e.preventDefault(); setPlayhead(clipDuration); }
      // S: 분할
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) { splitAtPlayhead(); }
      // M: 선택 세그먼트 음소거 토글
      if (e.key === "m" && !e.ctrlKey && selectedSegIdx >= 0) {
        setVideoSegs(prev => { const n = [...prev]; n[selectedSegIdx] = { ...n[selectedSegIdx], muted: !n[selectedSegIdx].muted }; return n; });
      }
      // [ ]: 줌 축소/확대
      if (e.key === "[") { e.preventDefault(); setTimelineZoom(z => Math.max(0.5, z - 0.25)); }
      if (e.key === "]") { e.preventDefault(); setTimelineZoom(z => Math.min(4, z + 0.25)); }
      // Escape: 선택 해제
      if (e.key === "Escape") {
        setSelectedSubIdx(-1); setSelectedSegIdx(-1); setSelectedOverlay(null); setSelectedTrack(null); setRangeSelecting(null);
      }
      // Ctrl+A: 전체 선택 (세그먼트 + 자막)
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (videoSegs.length > 0) setSelectedSegIdx(0);
        if ((curClip.subtitles || []).length > 0) setSelectedSubIdx(0);
        setSelectedTrack("V1");
      }
      // Ctrl+Z: Undo
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); doRedo(); return; }
      // Ctrl+D: 오버레이 복제
      if (e.key === "d" && (e.ctrlKey || e.metaKey) && selectedOverlay) {
        e.preventDefault();
        const orig = overlays.find(o => o.id === selectedOverlay);
        if (orig) {
          const newId = "ol_" + Date.now();
          setOverlays(prev => [...prev, { ...orig, id: newId, y: Math.min(95, orig.y + 5) }]);
          setSelectedOverlay(newId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, selectedSubIdx, selectedSegIdx, selectedOverlay, videoSegs, clipDuration, overlays]);

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

  // ── 비디오 ↔ playhead 동기화 (버벅임 방지) ──────────────
  const seekingRef = useRef(false);

  // playhead(상대) → 절대 시간 변환 (세그먼트 기반)
  const playheadToAbsolute = (ph) => {
    let accum = 0;
    for (const seg of videoSegs) {
      const segLen = seg.end - seg.start;
      if (ph < accum + segLen) return seg.start + (ph - accum);
      accum += segLen;
    }
    return videoSegs.length > 0 ? videoSegs[videoSegs.length - 1].end : ph;
  };

  // seek: playhead 변경 시 비디오 currentTime 동기화 (재생 중에도 가능)
  const userSeekRef = useRef(false); // 사용자 직접 seek 플래그
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit") return;
    // 재생 중에는 사용자 직접 seek만 허용 (자동 tick 업데이트는 무시)
    if (isPlaying && !userSeekRef.current) return;
    const target = playheadToAbsolute(playhead);
    if (Math.abs(v.currentTime - target) > 0.3) {
      seekingRef.current = true;
      v.currentTime = target;
    }
    userSeekRef.current = false;
  }, [playhead, editIdx, step, videoSegs]);

  // play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit") return;
    if (isPlaying) {
      v.currentTime = playheadToAbsolute(playhead);
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, step]);

  // 재생 중 playhead 업데이트 (세그먼트 스킵 포함)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isPlaying) return;
    let raf;
    const tick = () => {
      if (!isPlaying) return;
      const curTime = v.currentTime;
      // 현재 세그먼트 찾기 (0.15초 허용오차로 끝부분 누락 방지)
      let accum = 0;
      let found = false;
      for (let i = 0; i < videoSegs.length; i++) {
        const seg = videoSegs[i];
        if (curTime >= seg.start - 0.05 && curTime <= seg.end + 0.15) {
          const ph = accum + Math.min(curTime - seg.start, seg.end - seg.start);
          setPlayhead(Math.max(0, ph));
          found = true;
          break;
        }
        accum += (seg.end - seg.start);
      }
      if (!found) {
        // 세그먼트 사이의 갭 → 다음 세그먼트로 점프
        let jumped = false;
        for (let i = 0; i < videoSegs.length; i++) {
          if (curTime < videoSegs[i].start) {
            v.currentTime = videoSegs[i].start;
            jumped = true;
            break;
          }
        }
        if (!jumped) {
          // 끝까지 재생됨
          setIsPlaying(false);
          setPlayhead(clipDuration);
          return;
        }
      }
      // 영상이 자연 종료된 경우에도 처리
      if (v.ended) {
        setIsPlaying(false);
        setPlayhead(clipDuration);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [isPlaying, videoSegs]);

  // {강조텍스트} 문법 파싱 → 부분 색상 렌더링
  const renderHighlightText = (text, highlightColor) => {
    if (!text) return null;
    const parts = text.split(/(\{[^}]+\})/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      const m = part.match(/^\{(.+)\}$/);
      if (m) return <span key={i} style={{ color: highlightColor }}>{m[1]}</span>;
      return <span key={i}>{part}</span>;
    });
  };

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
      else if (target === "bottomTitle") setBottomTitlePos({ x, y });
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
    if (type === "text") { base.text = t("sc_text_label"); base.fontSize = 16; base.color = "#fff"; }
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

  // ── 세그먼트 초기화 (클립 변경 시) ─────────────────
  useEffect(() => {
    if (editClips.length > 0 && videoSegs.length === 0) {
      const c = editClips[editIdx];
      if (c) setVideoSegs([{ start: c.start_seconds || 0, end: c.end_seconds || 30 }]);
    }
  }, [editClips, editIdx]);

  // 클립 변경 시 세그먼트 리셋
  useEffect(() => {
    const c = editClips[editIdx];
    if (c) setVideoSegs([{ start: c.start_seconds || 0, end: c.end_seconds || 30 }]);
    setSelectedSegIdx(-1);
  }, [editIdx]);

  // totalSegsDuration는 상단에서 선언됨

  // ── 분할: 현재 playhead 위치에서 영상 자르기 ─────
  const splitAtPlayhead = () => {
    if (videoSegs.length === 0) return;
    pushUndo();
    // playhead를 절대 시간으로 변환
    let accum = 0;
    for (let i = 0; i < videoSegs.length; i++) {
      const seg = videoSegs[i];
      const segLen = seg.end - seg.start;
      if (playhead >= accum && playhead < accum + segLen) {
        const splitPoint = seg.start + (playhead - accum);
        if (splitPoint - seg.start < 0.5 || seg.end - splitPoint < 0.5) return; // 너무 짧으면 무시
        const newSegs = [...videoSegs];
        newSegs.splice(i, 1, { start: seg.start, end: Math.round(splitPoint * 10) / 10 }, { start: Math.round(splitPoint * 10) / 10, end: seg.end });
        setVideoSegs(newSegs);
        return;
      }
      accum += segLen;
    }
  };

  // ── 세그먼트 삭제: 삭제하면 나머지가 합쳐져서 재생 ─────
  const deleteSegment = (idx) => {
    if (videoSegs.length <= 1) return;
    pushUndo();
    const seg = videoSegs[idx];
    // 해당 구간의 자막도 같이 삭제
    if (seg) {
      const subs = (curClip.subtitles || []).filter(s => !(s.start >= seg.start && (s.end || s.start + 3) <= seg.end));
      updateClip("subtitles", subs);
    }
    setVideoSegs(prev => prev.filter((_, i) => i !== idx));
    setSelectedSegIdx(-1);
    setPlayhead(0);
  };

  // ── 자막 삭제 ─────
  const deleteSubtitle = (idx) => {
    pushUndo();
    const subs = [...(curClip.subtitles || [])];
    subs.splice(idx, 1);
    updateClip("subtitles", subs);
    if (selectedSubIdx === idx) setSelectedSubIdx(-1);
  };

  // ── 볼륨 동기화 (200%까지 부스트 지원 — Web Audio GainNode) ─────
  const gainNodeRef = useRef(null);
  const audioCtxRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (volume <= 100) {
      v.volume = volume / 100;
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
    } else {
      v.volume = 1;
      // Web Audio API로 100% 이상 부스트
      if (!audioCtxRef.current) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const source = ctx.createMediaElementSource(v);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          audioCtxRef.current = ctx;
          gainNodeRef.current = gain;
        } catch (e) { console.warn("AudioContext failed:", e); }
      }
      if (gainNodeRef.current) gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    const a = bgmRef.current;
    if (a) { a.volume = Math.min(bgmVolume / 100, 1); a.loop = true; }
  }, [bgmVolume]);

  // BGM 재생/정지 연동
  useEffect(() => {
    const a = bgmRef.current;
    if (!a) return;
    if (isPlaying) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying]);

  // ── 타임라인 재생 ─────────────────────
  // clipDuration은 상단에서 선언됨

  // 자막은 클립 시작 기준 상대 시간으로 표시
  const clipStart = curClip.start_seconds || 0;
  const currentSub = (curClip.subtitles || []).find(s => {
    const relStart = s.start - clipStart;
    const relEnd = (s.end || s.start + 3) - clipStart;
    return playhead >= relStart && playhead < relEnd;
  });

  const subColors = ["#7c6aff", "#ff6a8a", "#6affb2", "#ffd76a", "#6ac4ff", "#ff9f6a", "#c46aff", "#6afff0"];

  // ── 자막 애니메이션 렌더러 ──
  const renderAnimatedCaption = (sub) => {
    if (!sub || captionAnimation === "none") return sub?.text || "";
    const elapsed = playhead - Math.max(0, sub.start - clipStart);
    const duration = (sub.end || sub.start + 3) - sub.start;
    const progress = Math.min(1, elapsed / duration);
    const t = sub.text || "";
    const hlColor = captionStyle.highlightColor || "#FFD700";
    switch (captionAnimation) {
      case "fade": {
        const fi = Math.min(1, elapsed / 0.3), fo = Math.min(1, (duration - elapsed) / 0.3);
        return <span style={{ opacity: Math.min(fi, fo) }}>{t}</span>;
      }
      case "typewriter": {
        const chars = Math.floor(t.length * Math.min(1, elapsed / Math.max(0.5, duration * 0.6)));
        return <>{t.slice(0, chars)}<span style={{ opacity: elapsed % 0.6 < 0.3 ? 1 : 0 }}>|</span></>;
      }
      case "highlight": {
        const words = t.split(/(\s+)/);
        const wp = elapsed / Math.max(0.5, duration * 0.8);
        return words.map((w, i) => {
          const wi = words.slice(0, i).filter(x => x.trim()).length;
          const total = words.filter(x => x.trim()).length;
          const hl = wi / total <= wp;
          return <span key={i} style={{ color: w.trim() ? (hl ? hlColor : `${captionStyle.color}60`) : undefined, fontWeight: hl ? 900 : 500, transition: "color 0.15s" }}>{w}</span>;
        });
      }
      case "bounce": {
        const s = elapsed < 0.2 ? 0.5 + elapsed * 2.5 : elapsed < 0.35 ? 1.1 - (elapsed - 0.2) * 0.67 : 1;
        return <span style={{ display: "inline-block", transform: `scale(${s})` }}>{t}</span>;
      }
      case "slide": {
        const y = elapsed < 0.25 ? 20 * (1 - elapsed / 0.25) : 0;
        return <span style={{ display: "inline-block", transform: `translateY(${y}px)`, opacity: elapsed < 0.25 ? elapsed / 0.25 : 1 }}>{t}</span>;
      }
      case "karaoke": {
        const pct = Math.min(100, progress * 120);
        return <span style={{ background: `linear-gradient(90deg, ${hlColor} ${pct}%, ${captionStyle.color} ${pct}%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t}</span>;
      }
      case "glow": {
        const g = Math.sin(elapsed * 4) * 0.5 + 0.5;
        return <span style={{ textShadow: `0 0 ${8 + g * 12}px ${hlColor}, 0 0 ${4 + g * 6}px ${captionStyle.color}` }}>{t}</span>;
      }
      case "pop":
        return t.split("").map((ch, ci) => {
          const ce = Math.max(0, elapsed - ci * 0.04);
          const s = ce < 0.15 ? 0.3 + ce / 0.15 * 1.2 : ce < 0.25 ? 1.5 - (ce - 0.15) / 0.1 * 0.5 : 1;
          return <span key={ci} style={{ display: "inline-block", transform: `scale(${s})`, opacity: ce > 0 ? 1 : 0 }}>{ch}</span>;
        });
      case "wave":
        return t.split("").map((ch, ci) => {
          const y = Math.sin(elapsed * 5 - ci * 0.5) * 4;
          return <span key={ci} style={{ display: "inline-block", transform: `translateY(${y}px)` }}>{ch}</span>;
        });
      case "blur_in": {
        const blur = elapsed < 0.4 ? (1 - elapsed / 0.4) * 8 : 0;
        return <span style={{ filter: `blur(${blur}px)`, opacity: elapsed < 0.4 ? elapsed / 0.4 : 1 }}>{t}</span>;
      }
      case "color_cycle": {
        const hue = (elapsed * 120) % 360;
        return <span style={{ color: `hsl(${hue}, 80%, 65%)` }}>{t}</span>;
      }
      default: return t;
    }
  };

  // ── 자막 번역 (AI) ─────────────────
  const translateSubtitles = async (targetLang) => {
    const subs = curClip?.subtitles || [];
    if (subs.length === 0) return;
    setTranslating(true);
    try {
      const texts = subs.map(s => s.text).join("\n---\n");
      const langName = SUB_LANGS.find(l => l[0] === targetLang)?.[1] || targetLang;
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          messages: [{ role: "user", content: `Translate the following subtitles to ${langName}. Keep the same format, separated by ---. Only output the translations, nothing else.\n\n${texts}` }],
          max_tokens: 4000,
        }),
      });
      const data = await res.json();
      const translated = (data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.text || "").split(/\n---\n/);
      const dualArr = subs.map((s, i) => ({
        start: s.start, end: s.end,
        text: (translated[i] || "").trim(),
      }));
      setDualSubs(dualArr);
      setDualSubEnabled(true);
      setDualSubLang(targetLang);
    } catch (e) { console.error("Translation failed:", e); }
    setTranslating(false);
  };

  // ── AI 자동 미디어 삽입 (자막 분석 → GIF/영상 자동 배치) ─────────────────
  const [autoMediaLoading, setAutoMediaLoading] = useState(false);
  const [autoMediaResults, setAutoMediaResults] = useState([]);
  const autoMediaTriggered = useRef(false);

  const autoInsertMedia = async () => {
    const subs = curClip?.subtitles || [];
    if (subs.length === 0) return;
    setAutoMediaLoading(true);
    try {
      // 1) AI로 핵심 자막 구간 + 영어 검색 키워드 추출
      const subTexts = subs.map((s, i) => `[${i}] ${s.text}`).join("\n");
      const res = await fetch("/api/ai-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          messages: [{ role: "user", content: `다음 자막에서 시각적으로 보여주면 효과적인 구간 3~5개를 골라주세요.
각 구간에 어울리는 영어 검색 키워드 1~2개를 추출해주세요.
반응/감정 표현이 있으면 GIF를, 풍경/장소/물체면 video를 추천해주세요.

자막:
${subTexts}

JSON 배열로만 응답하세요 (다른 텍스트 없이):
[{"idx":0,"keyword":"search term","type":"gif"},{"idx":3,"keyword":"search term","type":"video"}]` }],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { setAutoMediaLoading(false); return; }
      const picks = JSON.parse(jsonMatch[0]);

      // 2) 각 키워드로 GIF/영상 검색 후 오버레이 자동 생성
      const results = [];
      const newOverlays = [];
      for (const pick of picks.slice(0, 5)) {
        const sub = subs[pick.idx];
        if (!sub) continue;
        const q = encodeURIComponent(pick.keyword);
        let mediaUrl = null;
        let mediaType = "image";

        if (pick.type === "gif" || pick.type === "reaction") {
          try {
            const r = await fetch(`/api/proxy?action=klipy&path=gifs/search&q=${q}&limit=5`).then(r => r.json());
            const gifs = r.data || r.results || [];
            const g = gifs[Math.floor(Math.random() * Math.min(3, gifs.length))];
            if (g) { mediaUrl = g.images?.fixed_width?.url || g.images?.original?.url || g.url || g.media_url; mediaType = "image"; }
          } catch {}
        }
        if (!mediaUrl && (pick.type === "video" || pick.type === "gif")) {
          try {
            const r = await fetch(`/api/proxy?action=pixabay&q=${q}&per_page=5&video=true`).then(r => r.json());
            const v = (r.hits || [])[Math.floor(Math.random() * Math.min(3, (r.hits || []).length))];
            if (v?.videos?.tiny?.url) { mediaUrl = v.videos.tiny.url; mediaType = "video"; }
          } catch {}
        }
        if (!mediaUrl) {
          try {
            const r = await fetch(`/api/proxy?action=pixabay&q=${q}&per_page=5&image_type=photo`).then(r => r.json());
            const img = (r.hits || [])[0];
            if (img) { mediaUrl = img.webformatURL; mediaType = "image"; }
          } catch {}
        }

        if (mediaUrl) {
          const relStart = sub.start - clipStart;
          const relEnd = (sub.end || sub.start + 3) - clipStart;
          const id = "auto_" + Date.now() + "_" + pick.idx;
          newOverlays.push({
            id, type: mediaType === "video" ? "video" : "image",
            src: mediaUrl, x: 50, y: 40, w: 35, h: 35,
            start: relStart, end: relEnd,
            _autoInserted: true, _keyword: pick.keyword,
          });
          results.push({ subIdx: pick.idx, keyword: pick.keyword, url: mediaUrl, type: mediaType, start: relStart, end: relEnd });
        }
      }
      if (newOverlays.length > 0) {
        pushUndo();
        setOverlays(prev => [...prev, ...newOverlays]);
      }
      setAutoMediaResults(results);
    } catch (e) { console.error("Auto media insert failed:", e); }
    setAutoMediaLoading(false);
  };

  // 편집 진입 시 자막이 있으면 자동 삽입 실행
  useEffect(() => {
    if (step !== "edit" || autoMediaTriggered.current || autoMediaLoading) return;
    const subs = curClip?.subtitles || [];
    if (subs.length > 0 && overlays.length === 0) {
      autoMediaTriggered.current = true;
      setSubtitlesEnabled(true);
      setTimeout(() => autoInsertMedia(), 500);
    }
  }, [step, editIdx]);

  // ── 프로젝트 저장/불러오기 ─────────────────
  const PROJECTS_KEY = "shorts_projects_v1";

  const saveProject = () => {
    const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    const proj = {
      id: projectId || ("sp_" + Date.now()),
      title: curClip.title || editClips[0]?.title || t("sc_no_title"),
      fileId, editClips, videoSegs, overlays, template,
      titleStyle, bottomTitleStyle, captionStyle, titlePos, bottomTitlePos, captionPos,
      layoutMode, videoScale, volume, subtitlesEnabled,
      date: new Date().toLocaleDateString("ko-KR"),
      updatedAt: Date.now(),
    };
    const idx = projects.findIndex(p => p.id === proj.id);
    if (idx >= 0) projects[idx] = proj; else projects.unshift(proj);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 50)));
    setProjectId(proj.id);
    return proj;
  };

  const loadProject = (proj) => {
    setProjectId(proj.id);
    setFileId(proj.fileId);
    setEditClips(proj.editClips || []);
    setVideoSegs(proj.videoSegs || []);
    setOverlays(proj.overlays || []);
    setTemplate(proj.template || "minimal");
    setTitleStyle(proj.titleStyle || titleStyle);
    setBottomTitleStyle(proj.bottomTitleStyle || bottomTitleStyle);
    setCaptionStyle(proj.captionStyle || captionStyle);
    setTitlePos(proj.titlePos || { x: 50, y: 8 });
    setBottomTitlePos(proj.bottomTitlePos || { x: 50, y: 88 });
    setCaptionPos(proj.captionPos || { x: 50, y: 92 });
    setLayoutMode(proj.layoutMode || "bars");
    setVideoScale(proj.videoScale || 100);
    setVolume(proj.volume || 100);
    setSubtitlesEnabled(proj.subtitlesEnabled !== false);
    setEditIdx(0);
    setStep("edit");
  };

  const getSavedProjects = () => {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]"); } catch { return []; }
  };

  // 자동 저장 (편집 중 30초마다)
  useEffect(() => {
    if (step !== "edit" || editClips.length === 0) return;
    const timer = setInterval(() => { try { saveProject(); } catch {} }, 30000);
    return () => clearInterval(timer);
  }, [step, editClips, videoSegs, overlays, titleStyle, captionStyle]);

  // ── API 호출 ────────────────────────
  const apiCall = async (path, opts = {}) => {
    const timeout = opts.timeout || 60000;
    const maxRetries = path.includes("/analyze") ? 2 : 0;
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const r = await fetch(`${API}${path}`, { ...opts, signal: controller.signal, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          const msg = e.detail || `${t("sc_request_fail")} (${r.status})`;
          // 500 에러: 서버 API 키 문제일 가능성
          if (r.status === 500 && attempt < maxRetries) {
            clearTimeout(timer);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw new Error(r.status === 500 ? t("sc_server_error") : msg);
        }
        clearTimeout(timer);
        return r.json();
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        if (attempt < maxRetries && !err.message.includes("abort")) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
    }
    throw lastErr;
  };

  // 유튜브 링크 분석
  const handleYoutube = async () => {
    const parsed = parseYoutubeUrl(ytUrl);
    if (!parsed) { setError(t("sc_error_invalid_yt")); return; }
    setStep("loading"); setLoadingMsg(t("sc_downloading")); setError("");

    // 분석 실행 함수
    const doAnalyzeAfterDownload = async (fileId) => {
      setFileId(fileId);
      setLoadingMsg(t("sc_stt_analyzing"));
      const analyzeBody = { max_chars: maxChars, max_segments: maxSegments };
      if (userPrompt.trim()) analyzeBody.user_prompt = userPrompt.trim();
      const ad = await apiCall(`/analyze/${fileId}`, { method: "POST", body: JSON.stringify(analyzeBody), timeout: 180000 });
      const segs = (ad.segments || []).slice(0, maxSegments);
      setSegments(segs);
      setSelectedSegs(segs.map((_, i) => i));
      setStep("analysis");
    };

    try {
      // 1차 시도: Render 서버 직접 다운로드 (60초 제한)
      setLoadingMsg(t("sc_downloading"));
      const downloadBody = { url: parsed.url };
      const d = await apiCall("/youtube-download", { method: "POST", body: JSON.stringify(downloadBody), timeout: 65000 });
      await doAnalyzeAfterDownload(d.file_id);
    } catch (e1) {
      // 서버 실패 → 다운로드 도우미로 전환 (사용자가 직접 업로드)
      let ytTitle = "";
      try {
        const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(parsed.url)}`);
        if (oembed.ok) { const data = await oembed.json(); ytTitle = data.title || ""; }
      } catch {}

      // 바로 도우미 화면 전환 (사용자가 기다리지 않게)
      setDownloadHelper({
        id: parsed.id, url: parsed.url,
        title: ytTitle || `${t("sc_yt_video")} (${parsed.id})`,
        thumbnail: `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`,
      });
      setInputMode("file");
      setError("");
      setStep("upload");
    }
  };

  // 파일 업로드
  const handleUpload = async () => {
    if (!videoFile) return;
    setStep("loading"); setLoadingMsg(t("sc_uploading")); setError("");
    try {
      const form = new FormData();
      form.append("video", videoFile);
      if (subFile) form.append("subtitle", subFile);
      if (logoFile) form.append("logo", logoFile);
      if (fontFile) form.append("custom_font", fontFile);
      const r = await fetch(`${API}/upload`, { method: "POST", body: form }).catch(() => null);
      if (!r) throw new Error(t("sc_connect_fail"));
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.detail || `${t("sc_upload_fail")} (${r.status})`);
      }
      const d = await r.json();
      setFileId(d.file_id);
      setLoadingMsg(t("sc_stt_analyzing"));
      await doAnalyze(d.file_id);
    } catch (e) { setError(e.message); setStep("upload"); }
  };

  // 분석
  const doAnalyze = async (fid) => {
    setLoadingMsg(t("sc_ai_analyzing"));
    try {
      const analyzeBody = { max_chars: maxChars, max_segments: maxSegments };
      if (userPrompt.trim()) analyzeBody.user_prompt = userPrompt.trim();
      const d = await apiCall(`/analyze/${fid}`, { method: "POST", body: JSON.stringify(analyzeBody) });
      const segs2 = (d.segments || []).slice(0, maxSegments);
      setSegments(segs2);
      setSelectedSegs(segs2.map((_, i) => i));
      setStep("analysis");
    } catch (e) { setError(t("sc_analysis_fail") + e.message); setStep("upload"); }
  };

  // 편집으로 이동
  const goToEdit = () => {
    const clips = selectedSegs.map(i => {
      const s = segments[i];
      const mainTitle = s.hook || s.hook_text || s.title || "";
      const sub = s.title || s.seo_title || "";
      return {
        ...s,
        title: mainTitle,
        bottom_title: (sub && sub !== mainTitle && !mainTitle.includes(sub) && !sub.includes(mainTitle) && _similarity(mainTitle, sub) < 0.5) ? sub : "",
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
    if (showPointConfirm && user && !(await showPointConfirm(100))) return;
    setStep("generate"); setResults([]); setPreviewIdx(0);

    // 백그라운드 인디케이터 등록
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
      detail: { action: "register", task: { id: "shorts_gen", type: "shorts_make", message: t("sc_generating") + " (0/" + editClips.length + ")" } }
    }));

    try {
      const d = await apiCall("/generate-async", {
        method: "POST",
        body: JSON.stringify({ file_id: fileId, clips: editClips, remove_silence: removeSilence, silence_threshold: silenceThreshold, silence_min_gap: silenceMinGap, template, title_color: titleColor, caption_color: captionColor, subtitles_enabled: subtitlesEnabled, layout_mode: layoutMode, title_pos: titlePos, bottom_title_pos: bottomTitlePos, caption_pos: captionPos, title_style: titleStyle, bottom_title_style: bottomTitleStyle, caption_style: captionStyle }),
      });
      setJobId(d.job_id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const j = await apiCall(`/jobs/${d.job_id}`);
          setJobStatus(j);
          setResults(j.results || []);
          const done = (j.results || []).filter(r => r.type === "done").length;
          const total = editClips.length;

          // 백그라운드 인디케이터 업데이트
          window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
            detail: { action: "update", task: { id: "shorts_gen", message: `${t("sc_generating")} (${done}/${total})`, progress: Math.round(done / total * 100) } }
          }));

          if (j.status === "complete") {
            clearInterval(pollRef.current); pollRef.current = null;
            // 완료 알림
            window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
              detail: { action: "complete", task: { id: "shorts_gen", message: `${done}${t("sc_n_completed")}!` } }
            }));
            // 보관함에 저장
            try {
              const saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
              (j.results || []).filter(r => r.type === "done").forEach((r, idx) => {
                const savedItem = {
                  id: Date.now().toString() + idx,
                  type: "shorts",
                  title: editClips[r.index]?.title || `Short ${r.index + 1}`,
                  content: `[${t("sc_shorts_video")}] ${editClips[r.index]?.bottom_title || ""}\n${(editClips[r.index]?.subtitles || []).map(s => s.text).join("\n")}`,
                  date: new Date().toLocaleDateString("ko-KR"),
                  videoUrl: `${API}/outputs/${fileId}/${r.filename}`,
                };
                saves.unshift(savedItem);
                if (user?.uid) upsertLibraryItem(user.uid, "blog", savedItem);
              });
              localStorage.setItem("sns_blog_saves_v1", JSON.stringify(saves.slice(0, 100)));
            } catch {}
          }
        } catch {}
      }, 3000);
    } catch (e) {
      setError(t("sc_gen_fail") + e.message);
      window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
        detail: { action: "complete", task: { id: "shorts_gen", message: t("sc_failed") } }
      }));
    }
  };

  // SRT 자막 파일 다운로드 헬퍼
  const downloadSrt = (clip) => {
    if (!clip || !(clip.subtitles || []).length) return;
    const fmtSrt = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
    };
    let srt = "";
    (clip.subtitles || []).forEach((sub, idx) => {
      const start = sub.start || 0;
      const end = sub.end || (start + 3);
      srt += `${idx + 1}\n${fmtSrt(start)} --> ${fmtSrt(end)}\n${sub.text || ""}\n\n`;
    });
    const blob = new Blob([srt], { type: "text/srt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(clip.title || "subtitles").replace(/[^가-힣a-zA-Z0-9_-]/g, "_")}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 연계
  const linkTo = (target, idx) => {
    const clip = editClips[idx] || editClips[0];
    const content = (clip?.subtitles || []).map(s => s.text).join(" ");
    try { localStorage.setItem("shorts_linked_data", JSON.stringify({ title: clip?.title || "", content, hook: clip?.hook_text || "" })); } catch {}
    setAiMenu(target);
  };

  const fmt = s => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; };

  // 제목/부제 유사도 비교 (단어 기반 Jaccard)
  const _similarity = (a, b) => {
    if (!a || !b) return 0;
    const wa = new Set(a.replace(/[^가-힣a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean));
    const wb = new Set(b.replace(/[^가-힣a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean));
    if (wa.size === 0 || wb.size === 0) return 0;
    let inter = 0; wa.forEach(w => { if (wb.has(w)) inter++; });
    return inter / Math.max(wa.size, wb.size);
  };

  const btnStyle = { padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 900, width: "100%", background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff" };
  const cardStyle = { background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: ibg, color: text, fontSize: 13, outline: "none" };
  const tabBtn = (active) => ({ flex: 1, padding: "12px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, borderRadius: 0, background: active ? `linear-gradient(135deg,${acc},#8b5cf6)` : "transparent", color: active ? "#fff" : muted });

  // ═══════════════════════════════════
  // Step: 업로드
  // ═══════════════════════════════════
  if (step === "upload") return (
    <div style={{ flex: 1, overflowY: "auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: `${acc}15`, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: acc }}>SHORTS EDITOR</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: text }}>{t("sc_title")}</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6, lineHeight: 1.6 }}>
            {t("sc_desc")}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 24, border: `1px solid ${bdr}` }}>
          <button onClick={() => { setInputMode("youtube"); setDownloadHelper(null); }} style={tabBtn(inputMode === "youtube")}>{t("sc_youtube_tab")}</button>
          <button onClick={() => setInputMode("file")} style={tabBtn(inputMode === "file")}>{t("sc_file_tab")}</button>
        </div>

        {inputMode === "youtube" ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>{t("sc_youtube_url")}</div>
            <input value={ytUrl}
              onChange={e => setYtUrl(e.target.value)}
              onPaste={e => { const pasted = e.clipboardData.getData("text"); if (pasted && parseYoutubeUrl(pasted)) { e.preventDefault(); setYtUrl(pasted.trim()); } }}
              placeholder={t("sc_youtube_placeholder")}
              style={{ ...inputStyle, marginBottom: 12 }} />
            {ytUrl.trim() && !ytParsed && (
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8, paddingLeft: 4 }}>{t("sc_invalid_url")}</div>
            )}
            {ytParsed && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, padding: 12, marginBottom: 12 }}>
                <img src={`https://img.youtube.com/vi/${ytParsed.id}/mqdefault.jpg`} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
                <div><div style={{ fontSize: 12, fontWeight: 700, color: acc }}>{t("sc_video_detected")}</div><div style={{ fontSize: 11, color: muted }}>ID: {ytParsed.id}</div></div>
              </div>
            )}
            <button onClick={handleYoutube} style={{ ...btnStyle, opacity: !ytParsed ? 0.4 : 1 }} disabled={!ytParsed}>{t("sc_convert_btn")} <span style={{ opacity: 0.7, fontSize: 12 }}>(35P)</span></button>
          </div>
        ) : (
          <div>
            {downloadHelper && (
              <div style={{ ...cardStyle, background: D ? "rgba(124,106,255,0.06)" : "rgba(124,106,255,0.03)", border: `1px solid ${acc}30`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <img src={downloadHelper.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8 }} onError={e => e.target.style.display = "none"} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{downloadHelper.title}</div>
                </div>
                <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8 }}>{t("sc_download_fail")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`https://ssyoutube.com/watch?v=${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>ssyoutube.com</a>
                  <a href={`https://www.y2mate.com/youtube/${downloadHelper.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>y2mate.com</a>
                </div>
              </div>
            )}
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${bdr}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: ibg }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${acc}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{t("sc_select_file")}</div>
              <div style={{ fontSize: 12, color: muted }}>{t("sc_file_formats")}</div>
              <input ref={fileRef} type="file" accept=".mp4,.mkv,.avi,.mov,.srt,.txt" multiple style={{ display: "none" }}
                onChange={e => { for (const f of e.target.files) { const ext = f.name.split(".").pop().toLowerCase(); if (["mp4", "mkv", "avi", "mov"].includes(ext)) setVideoFile(f); else if (["srt", "txt"].includes(ext)) setSubFile(f); } }} />
            </div>
            {videoFile && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: acc, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${acc}15` }}>{videoFile.name}</span>
                {subFile && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.1)" }}>{subFile.name}</span>}
                {!subFile && <span style={{ fontSize: 11, color: muted }}>{t("sc_no_subtitle")}</span>}
              </div>
            )}
            <button onClick={handleUpload} style={{ ...btnStyle, opacity: !videoFile ? 0.4 : 1 }} disabled={!videoFile}>{t("sc_create_btn")} <span style={{ opacity: 0.7, fontSize: 12 }}>(35P)</span></button>
          </div>
        )}

        {/* 분석 요청 프롬프트 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 6 }}>{t("sc_analysis_request")}</div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, lineHeight: 1.5 }}>{t("sc_analysis_desc")}</div>
          <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
            placeholder={t("sc_analysis_placeholder")}
            rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }} />
        </div>

        {/* 설정 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>{t("sc_settings")}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t("sc_shorts_length")}</div>
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 480 ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
            {LENGTHS.map(l => (
              <button key={l.id} onClick={() => setShortsLength(l.id)}
                style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${shortsLength === l.id ? acc : bdr}`, background: shortsLength === l.id ? `${acc}15` : "transparent", color: shortsLength === l.id ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                <div>{t(l.labelKey)}</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>{t(l.descKey)}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t("sc_subtitle_chars")}</div>
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 480 ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
            {[[0,t("sc_auto")],[8,"8"+t("sc_chars_suffix")],[15,"15"+t("sc_chars_suffix")],[25,"25"+t("sc_chars_suffix")]].map(([v,l]) => (
              <button key={v} onClick={() => setMaxChars(v)}
                style={{ padding: "8px", borderRadius: 8, border: `1.5px solid ${maxChars === v ? acc : bdr}`, background: maxChars === v ? `${acc}15` : "transparent", color: maxChars === v ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t("sc_shorts_count")}</div>
          <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 480 ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setMaxSegments(n)}
                style={{ padding: "8px", borderRadius: 8, border: `1.5px solid ${maxSegments === n ? acc : bdr}`, background: maxSegments === n ? `${acc}15` : "transparent", color: maxSegments === n ? acc : muted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{n}{t("sc_count_suffix")}</button>
            ))}
          </div>
        </div>

        {/* 주요 기능 안내 */}
        <div style={{ ...cardStyle, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>{t("sc_features_title")}</div>
          {[
            [t("sc_feature_highlight"), t("sc_feature_highlight_desc")],
            [t("sc_feature_vertical"), t("sc_feature_vertical_desc")],
            [t("sc_feature_subtitle"), t("sc_feature_subtitle_desc")],
            [t("sc_feature_pro"), t("sc_feature_pro_desc")],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: ibg }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${acc}15`, color: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{title}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>{error}</div>}

        {/* 저장된 프로젝트 */}
        {(() => {
          const projs = getSavedProjects();
          if (projs.length === 0) return null;
          return (
            <div style={{ marginTop: 28, padding: "20px 0" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{t("sc_continue_edit")}</span>
                <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>({projs.length})</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                {projs.slice(0, 8).map(p => (
                  <div key={p.id} onClick={() => loadProject(p)}
                    style={{ padding: "14px", borderRadius: 12, border: `1px solid ${bdr}`, background: card, cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = acc}
                    onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: muted }}>{p.date}</div>
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{p.editClips?.length || 0}{t("sc_clips_info")} · {p.videoSegs?.length || 0}{t("sc_segs_info")}</div>
                    <button onClick={e => { e.stopPropagation(); const projs2 = getSavedProjects().filter(x => x.id !== p.id); localStorage.setItem(PROJECTS_KEY, JSON.stringify(projs2)); }}
                      style={{ marginTop: 6, fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{t("delete")}</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 로딩
  // ═══════════════════════════════════
  if (step === "loading") return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: D ? "transparent" : "#f4f4f8" }}>
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
        <div style={{ fontSize: 20, fontWeight: 900, color: text, marginBottom: 8 }}>{t("sc_loading_title")}</div>
        <div style={{ fontSize: 14, color: muted, marginBottom: 20, animation: "shorts-pulse 2s ease-in-out infinite" }}>{loadingMsg}</div>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: muted }}>⏱ {t("sc_elapsed_time")}: {Math.floor(elapsed / 60)}{t("sc_min_unit")} {elapsed % 60}{t("sc_sec_unit")}</div>
          <div style={{ fontSize: 11, color: acc, fontWeight: 600, marginTop: 6 }}>{t("sc_bg_continue")}</div>
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
            <span style={{ fontSize: 12, fontWeight: 700, color: acc }}>{t("sc_ai_found_prefix")} {segments.length}{t("sc_ai_found_segments")}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: text }}>{t("sc_recommended_clips")}</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 6 }}>{t("sc_prompt_based")}</div>
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
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{s.score}{t("sc_score_suffix")}</span>
                </div>}
              </div>
              {hook && <div style={{ fontSize: 13, fontWeight: 600, color: acc, marginBottom: 6, padding: "6px 10px", borderRadius: 8, background: `${acc}08`, borderLeft: `3px solid ${acc}` }}>🎬 {hook}</div>}
              {script && <div style={{ fontSize: 12, color: text, lineHeight: 1.7, marginBottom: 6, opacity: 0.85 }}>{script.slice(0, 200)}{script.length > 200 ? "..." : ""}</div>}
              {reason && reason !== script && <div style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>💡 {reason.slice(0, 120)}</div>}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={() => { setStep("upload"); setSegments([]); }} style={{ flex: "0 0 auto", padding: "14px 20px", borderRadius: 12, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t("sc_reanalyze")}</button>
          <button onClick={goToEdit} disabled={selectedSegs.length === 0} style={{ ...btnStyle, flex: 1, opacity: selectedSegs.length === 0 ? 0.4 : 1 }}>
            {selectedSegs.length}{t("sc_edit_segments_btn")}
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════
  // Step: 편집 (프로 비디오 에디터)
  // ═══════════════════════════════════
  if (step === "edit") {
  const pxPerSec = 24 * timelineZoom;
  const tlWidth = Math.max(clipDuration * pxPerSec, 800);
  const TRACK_H = 44;
  const TRIM_W = 14;
  // 동적 트랙: 오버레이(V2,V3...) → V1 → A1 → S1 (오버레이가 V1 위에)
  const overlayTracks = overlays.map((o, i) => ({
    id: o.id, label: `V${i+2}`,
    color: "#ec4899", overlay: o,
  }));
  const baseTracks = [
    { id: "V1", label: "V1", color: "#4a9eff" },
    { id: "A1", label: "A1", color: "#4ade80" },
    { id: "S1", label: "S1", color: "#f59e0b" },
  ];
  const allTracks = [...overlayTracks, ...baseTracks];
  // 컨텍스트 액션: 선택된 요소에 따라 다른 버튼 표시
  const hasSelection = selectedSegIdx >= 0 || selectedSubIdx >= 0 || selectedOverlay;
  const sourceUrl = fileId ? `${API}/source/${fileId}` : null;
  const visibleOverlays = overlays.filter(o => playhead >= o.start && playhead <= o.end);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0", minHeight: 0, maxHeight: "100vh", height: "100%" }}>
      {/* 숨겨진 inputs */}
      <input ref={overlayFileRef} type="file" accept="image/*" style={{ display: "none" }} />
      {bgmFile && <audio ref={bgmRef} src={bgmFile.url} loop preload="auto" style={{ display: "none" }} />}

      {/* 단축키 가이드 모달 */}
      {showShortcuts && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setShowShortcuts(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#16162a", border: "1px solid #2a2a4a", borderRadius: 16, padding: "24px 28px", maxWidth: 420, width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#e0e0e0" }}>{t("sc_shortcut_guide")}</div>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {[
              [t("sc_shortcut_play"), [["Space",t("sc_shortcut_play_pause")],["Home",t("sc_shortcut_to_start")],["End",t("sc_shortcut_to_end")]]],
              [t("sc_shortcut_move"), [["← →",t("sc_shortcut_1sec")],["Shift + ← →",t("sc_shortcut_5sec")]]],
              [t("sc_shortcut_edit"), [["S",t("sc_shortcut_split")],["Delete",t("sc_shortcut_delete")],["M",t("sc_shortcut_mute")],["Ctrl+D",t("sc_shortcut_duplicate")],["Ctrl+Z",t("sc_shortcut_undo")],["Ctrl+Y",t("sc_shortcut_redo")]]],
              [t("sc_shortcut_select"), [["Drag",t("sc_shortcut_drag")],["Click",t("sc_shortcut_click")],["Escape",t("sc_shortcut_deselect")],["Ctrl+A",t("sc_shortcut_select_all")]]],
              [t("sc_shortcut_zoom"), [["[  ]",t("sc_shortcut_zoom_inout")],["Slider",t("sc_shortcut_zoom_slider")]]],
            ].map(([group, items]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c6aff", marginBottom: 6, textTransform: "uppercase" }}>{group}</div>
                {items.map(([key, desc]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1a1a30" }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{desc}</span>
                    <kbd style={{ padding: "2px 8px", borderRadius: 4, background: "#0f0f1a", border: "1px solid #2a2a4a", color: "#7c6aff", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>{key}</kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 모바일 안내 */}
      {typeof window !== "undefined" && window.innerWidth < 768 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{t("sc_pc_only")}</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>{t("sc_pc_only_desc")}</div>
          </div>
        </div>
      ) : (<>

      {/* Top 3-panel area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Clip list */}
        <div style={{ width: leftPanelWidth, flexShrink: 0, background: "#16162a", borderRight: "1px solid #2a2a4a", display: "flex", flexDirection: "column", position: "relative" }}>
          {/* 리사이즈 핸들 */}
          <div style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 5 }}
            onMouseDown={e => { e.preventDefault(); const sx = e.clientX; const ow = leftPanelWidth;
              const mv = ev => setLeftPanelWidth(Math.max(120, Math.min(300, ow + ev.clientX - sx)));
              const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
              window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
            }} />
          <div style={{ padding: "14px 12px 8px", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{t("sc_clip_list")}</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {editClips.map((c, i) => (
              <div key={i} onClick={() => { setEditIdx(i); setSelectedSubIdx(-1); setPlayhead(0); setIsPlaying(false); }}
                style={{ padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: editIdx === i ? "rgba(124,106,255,0.18)" : "transparent", borderLeft: `3px solid ${editIdx === i ? "#7c6aff" : "transparent"}`, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: editIdx === i ? "#7c6aff" : "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || c.hook || c.bottom_title || `Short ${i + 1}`}</div>
                  <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{fmt(c.start_seconds)} ~ {fmt(c.end_seconds)}</div>
                </div>
                {editClips.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); pushUndo(); setEditClips(prev => prev.filter((_, idx) => idx !== i)); if (editIdx >= i && editIdx > 0) setEditIdx(editIdx - 1); }}
                    title={t("sc_clip_delete")}
                    style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: "none", background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, transition: "opacity 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>X</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: "8px", borderTop: "1px solid #2a2a4a" }}>
            <button onClick={() => setStep("analysis")} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer" }}>{t("sc_back_segments")}</button>
          </div>
        </div>

        {/* CENTER: Preview (검은바 레이아웃 + 드래그 가능 오버레이) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0, overflow: "hidden" }}>
          {/* 레이아웃 전환 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexShrink: 0 }}>
            {[["bars",t("sc_bars")],["full",t("sc_fullscreen")]].map(([k,l]) => (
              <button key={k} onClick={() => setLayoutMode(k)}
                style={{ padding: "4px 12px", borderRadius: 6, border: layoutMode===k ? "1px solid #7c6aff" : "1px solid #2a2a4a", background: layoutMode===k ? "rgba(124,106,255,0.15)" : "#1a1a30", color: layoutMode===k ? "#a5b4fc" : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{l}</button>
            ))}
          </div>

          {/* 9:16 프리뷰 (고정 비율, 크기 안정화) */}
          <div ref={previewRef} style={{ width: 360, maxWidth: "100%", aspectRatio: "9/16", maxHeight: "calc(100% - 40px)", borderRadius: 8, background: "#000", border: "2px solid #2a2a4a", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", flexShrink: 0, flexGrow: 0, position: "relative", userSelect: "none" }}>

            {/* 공통: 영상 배경 */}
            {layoutMode === "bars" ? (
              <div style={{ position: "absolute", top: "15%", left: 0, right: 0, bottom: "15%", overflow: "hidden", background: "#000" }}>
                <video ref={videoRef} src={sourceUrl || undefined}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                  preload="metadata" playsInline />
                {!sourceUrl && (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.5)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.3"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                  </div>
                )}
              </div>
            ) : (<>
              <video ref={videoRef} src={sourceUrl || undefined}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                preload="metadata" playsInline />
              {!sourceUrl && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.3)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.2"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                </div>
              )}
            </>)}

            {/* 상단 제목 (드래그 가능) */}
            <div onMouseDown={e => handlePreviewMouseDown("title", e)}
              style={{ position: "absolute", left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 12, maxWidth: "90%", textAlign: titleStyle.align || "center", opacity: titleStyle.opacity / 100, border: dragging === "title" ? "2px solid #7c6aff" : "2px solid transparent", borderRadius: 8, padding: "2px" }}>
              <span style={{
                fontSize: titleStyle.fontSize, fontWeight: titleStyle.bold ? 900 : 400, color: titleStyle.color,
                fontFamily: titleStyle.font === "default" ? "inherit" : titleStyle.font,
                lineHeight: 1.2, wordBreak: "keep-all", display: "inline-block",
                textShadow: titleStyle.shadow ? "0 2px 6px rgba(0,0,0,0.7)" : "none",
                WebkitTextStroke: titleStyle.border ? `1px ${titleStyle.borderColor}` : "none",
                background: titleStyle.bgBox ? titleStyle.bgColor : "transparent",
                padding: titleStyle.bgBox ? "6px 16px" : 0, borderRadius: titleStyle.bgBox ? 6 : 0,
              }}>{renderHighlightText(curClip.title || t("sc_enter_title"), titleStyle.highlightColor)}</span>
            </div>

            {/* 하단 제목 (드래그 가능) */}
            {curClip.bottom_title && (
              <div onMouseDown={e => handlePreviewMouseDown("bottomTitle", e)}
                style={{ position: "absolute", left: `${bottomTitlePos.x}%`, top: `${bottomTitlePos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 12, maxWidth: "90%", textAlign: bottomTitleStyle.align || "center", opacity: bottomTitleStyle.opacity / 100, border: dragging === "bottomTitle" ? "2px solid #f59e0b" : "2px solid transparent", borderRadius: 8, padding: "2px" }}>
                <span style={{
                  fontSize: bottomTitleStyle.fontSize, fontWeight: bottomTitleStyle.bold ? 900 : 400, color: bottomTitleStyle.color,
                  fontFamily: bottomTitleStyle.font === "default" ? "inherit" : bottomTitleStyle.font,
                  lineHeight: 1.3, wordBreak: "keep-all", display: "inline-block",
                  textShadow: bottomTitleStyle.shadow ? "0 2px 6px rgba(0,0,0,0.7)" : "none",
                  WebkitTextStroke: bottomTitleStyle.border ? `1px ${bottomTitleStyle.borderColor}` : "none",
                  background: bottomTitleStyle.bgBox ? bottomTitleStyle.bgColor : "transparent",
                  padding: bottomTitleStyle.bgBox ? "5px 14px" : 0, borderRadius: bottomTitleStyle.bgBox ? 6 : 0,
                }}>{renderHighlightText(curClip.bottom_title, bottomTitleStyle.highlightColor)}</span>
              </div>
            )}

            {/* 자막 (시간별, 드래그 가능, 더블클릭으로 편집) */}
            {subtitlesEnabled && currentSub && (
              <div onMouseDown={e => { if (!editingSubOnCanvas) handlePreviewMouseDown("caption", e); }}
                onDoubleClick={e => { e.stopPropagation(); setEditingSubOnCanvas(true); setIsPlaying(false); const idx = (curClip.subtitles || []).findIndex(s => s.start === currentSub.start); if (idx >= 0) setSelectedSubIdx(idx); }}
                style={{ position: "absolute", left: `${captionPos.x}%`, top: `${captionPos.y}%`, transform: "translate(-50%,-50%)", cursor: editingSubOnCanvas ? "text" : "move", zIndex: 11, maxWidth: "90%", textAlign: captionStyle.align || "center", opacity: captionStyle.opacity / 100, border: editingSubOnCanvas ? "2px solid #22d3ee" : dragging === "caption" ? "2px solid #22d3ee" : "2px solid transparent", borderRadius: 6, padding: "2px" }}>
                {editingSubOnCanvas ? (
                  <input
                    autoFocus
                    value={currentSub.text}
                    onChange={e => {
                      const idx = (curClip.subtitles || []).findIndex(s => s.start === currentSub.start);
                      if (idx >= 0) { const subs = [...(curClip.subtitles || [])]; subs[idx] = { ...subs[idx], text: e.target.value }; updateClip("subtitles", subs); }
                    }}
                    onBlur={() => setEditingSubOnCanvas(false)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); setEditingSubOnCanvas(false); } }}
                    style={{
                      fontSize: captionStyle.fontSize, color: captionStyle.color, fontWeight: 800,
                      fontFamily: captionStyle.font === "default" ? "inherit" : captionStyle.font,
                      lineHeight: 1.4, background: captionStyle.bgBox ? captionStyle.bgColor : "rgba(0,0,0,0.6)",
                      padding: "5px 14px", borderRadius: 6, border: "2px solid #22d3ee",
                      textShadow: captionStyle.shadow ? "0 2px 8px rgba(0,0,0,0.9)" : "none",
                      outline: "none", textAlign: "center", width: "100%", minWidth: 120,
                    }}
                  />
                ) : (
                <span style={{
                  fontSize: captionStyle.fontSize, color: captionStyle.color, fontWeight: 800,
                  fontFamily: captionStyle.font === "default" ? "inherit" : captionStyle.font,
                  lineHeight: 1.4, wordBreak: "keep-all", display: "inline-block",
                  textShadow: captionStyle.shadow ? "0 2px 8px rgba(0,0,0,0.9)" : "none",
                  WebkitTextStroke: captionStyle.border ? `1px ${captionStyle.borderColor}` : "none",
                  background: captionStyle.bgBox ? captionStyle.bgColor : "transparent",
                  padding: captionStyle.bgBox ? "5px 14px" : 0, borderRadius: captionStyle.bgBox ? 6 : 0,
                }}>{renderAnimatedCaption(currentSub)}</span>
                )}
                {/* 번역 자막 (이중 자막) */}
                {dualSubEnabled && (() => {
                  const ds = dualSubs.find(d => playhead >= (d.start - clipStart) && playhead < (d.end - clipStart));
                  return ds ? <div style={{ marginTop: 4 }}><span style={{
                    fontSize: Math.max(captionStyle.fontSize - 3, 11), color: "rgba(255,255,255,0.85)", fontWeight: 600,
                    lineHeight: 1.3, display: "inline-block",
                    textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                    background: "rgba(0,0,0,0.5)", padding: "3px 10px", borderRadius: 4,
                  }}>{ds.text}</span></div> : null;
                })()}
              </div>
            )}

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
        <div style={{ width: rightPanelWidth, flexShrink: 0, background: "#16162a", borderLeft: "1px solid #2a2a4a", display: "flex", flexDirection: "column", position: "relative" }}>
          {/* 리사이즈 핸들 */}
          <div style={{ position: "absolute", left: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 5 }}
            onMouseDown={e => { e.preventDefault(); const sx = e.clientX; const ow = rightPanelWidth;
              const mv = ev => setRightPanelWidth(Math.max(200, Math.min(450, ow - (ev.clientX - sx))));
              const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
              window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
            }} />
          {/* 탭 */}
          <div style={{ display: "flex", borderBottom: "1px solid #2a2a4a" }}>
            {[["style",t("sc_style_tab")],["overlay",t("sc_overlay_tab")]].map(([k,l]) => (
              <button key={k} onClick={() => setPropTab(k)}
                style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: propTab === k ? "#1e1e3a" : "transparent", color: propTab === k ? "#7c6aff" : "#666", borderBottom: propTab === k ? "2px solid #7c6aff" : "2px solid transparent" }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, padding: "10px 14px 14px", overflowY: "auto" }}>
            {propTab === "style" ? (<>
              {/* 영상 속성 (V1 선택 시) */}
              {selectedTrack === "V1" && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #4a9eff30" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4a9eff", marginBottom: 10 }}>{t("sc_video_props")}</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>{t("sc_zoom_scale")}</span>
                      <span style={{ fontSize: 11, color: "#4a9eff", fontWeight: 700 }}>{videoScale}%</span>
                    </div>
                    <input type="range" min="50" max="200" value={videoScale} onChange={e => setVideoScale(Number(e.target.value))} style={{ width: "100%", accentColor: "#4a9eff" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_start_sec")}</div>
                      <input type="number" step="0.1" value={curClip.start_seconds || 0} onChange={e => updateClip("start_seconds", Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_end_sec")}</div>
                      <input type="number" step="0.1" value={curClip.end_seconds || 0} onChange={e => updateClip("end_seconds", parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>{t("sc_timeline_drag_note")}</div>
                </div>
              )}

              {/* 제목 편집 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>상단 제목 / 하단 제목</div>
                <input value={curClip.title || ""} onChange={e => updateClip("title", e.target.value)} placeholder="상단 제목 입력..." style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                <input value={curClip.bottom_title || ""} onChange={e => updateClip("bottom_title", e.target.value)} placeholder="하단 제목 입력..." style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>프리뷰에서 제목을 드래그하여 위치를 변경할 수 있습니다. {"{"}강조 텍스트{"}"} 로 부분 색상 적용</div>
              </div>

              {/* 선택된 자막 편집 */}
              {selectedSubIdx >= 0 && (curClip.subtitles || [])[selectedSubIdx] && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #7c6aff40" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c6aff", marginBottom: 8 }}>{t("sc_subtitle_on")} #{selectedSubIdx + 1}</div>
                  <textarea value={(curClip.subtitles || [])[selectedSubIdx]?.text || ""} onChange={e => {
                    const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], text: e.target.value }; updateClip("subtitles", subs);
                  }} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_start_sec")}</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.start || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], start: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_end_sec")}</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.end || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], end: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* 텍스트 스타일 편집기 (상단제목 / 하단제목 / 자막) */}
              {[["title","상단 제목 스타일",titleStyle,setTitleStyle,"#7c6aff"],["bottomTitle","하단 제목 스타일",bottomTitleStyle,setBottomTitleStyle,"#f59e0b"],["caption",t("sc_lower_caption"),captionStyle,setCaptionStyle,"#22d3ee"]].map(([key,label,st,setSt,ac]) => (
                <div key={key} style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${ac}25` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 8 }}>{label}</div>
                  {/* 폰트 선택 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_font")}</div>
                    <select value={st.font || "default"} onChange={e => setSt(p=>({...p,font:e.target.value}))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", fontFamily: st.font === "default" ? "inherit" : st.font }}>
                      <option value="default">{t("sc_font_default")}</option>
                      <option value="'Noto Sans KR', sans-serif" style={{ fontFamily: "'Noto Sans KR'" }}>Noto Sans KR</option>
                      <option value="'Nanum Gothic', sans-serif" style={{ fontFamily: "'Nanum Gothic'" }}>{t("sc_font_nanumgothic")}</option>
                      <option value="'Nanum Myeongjo', serif" style={{ fontFamily: "'Nanum Myeongjo'" }}>{t("sc_font_nanummyeongjo")}</option>
                      <option value="'Black Han Sans', sans-serif" style={{ fontFamily: "'Black Han Sans'" }}>{t("sc_font_blackhansans")}</option>
                      <option value="'Jua', sans-serif" style={{ fontFamily: "'Jua'" }}>{t("sc_font_jua")}</option>
                      <option value="'Do Hyeon', sans-serif" style={{ fontFamily: "'Do Hyeon'" }}>{t("sc_font_dohyeon")}</option>
                      <option value="'Gothic A1', sans-serif" style={{ fontFamily: "'Gothic A1'" }}>Gothic A1</option>
                      <option value="Impact, sans-serif">Impact</option>
                      <option value="Georgia, serif">Georgia</option>
                    </select>
                  </div>
                  {/* 정렬 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_position")}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[["left",t("sc_align_left")],["center",t("sc_align_center")],["right",t("sc_align_right")]].map(([v,l]) => (
                        <button key={v} onClick={() => setSt(p=>({...p,align:v}))}
                          style={{ flex: 1, padding: "4px", borderRadius: 4, border: `1px solid ${(st.align||"center")===v ? ac : "#2a2a4a"}`, background: (st.align||"center")===v ? `${ac}20` : "#12122a", color: (st.align||"center")===v ? ac : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {/* 색상 + 크기 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_text_color")}</div>
                      <input type="color" value={st.color} onChange={e => setSt(p=>({...p,color:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>크기 <span style={{ color: ac }}>{st.fontSize}px</span></div>
                      <input type="range" min="10" max="48" value={st.fontSize} onChange={e => setSt(p=>({...p,fontSize:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  {/* 굵기 + 그림자 + 테두리 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                    {key !== "caption" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                        <input type="checkbox" checked={st.bold !== false} onChange={e => setSt(p=>({...p,bold:e.target.checked}))} style={{ accentColor: ac }} /> <b>B</b> 굵기
                      </label>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.shadow} onChange={e => setSt(p=>({...p,shadow:e.target.checked}))} style={{ accentColor: ac }} /> {t("sc_shadow_label")}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.border} onChange={e => setSt(p=>({...p,border:e.target.checked}))} style={{ accentColor: ac }} /> {t("sc_border_label")}
                    </label>
                  </div>
                  {st.border && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_border_color")}</div>
                      <input type="color" value={st.borderColor} onChange={e => setSt(p=>({...p,borderColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                  {/* 강조색 (부분 글씨 색상) */}
                  {key !== "caption" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>강조 색상 <span style={{ color: st.highlightColor, fontWeight: 700 }}>{"{"}텍스트{"}"}</span></div>
                        <input type="color" value={st.highlightColor || "#FFD700"} onChange={e => setSt(p=>({...p,highlightColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "end", paddingBottom: 2 }}>
                        <span style={{ fontSize: 9, color: "#555", lineHeight: 1.3 }}>제목에 {"{"}강조할 텍스트{"}"} 입력 시 해당 부분만 색상 적용</span>
                      </div>
                    </div>
                  )}
                  {/* 배경박스 + 투명도 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.bgBox} onChange={e => setSt(p=>({...p,bgBox:e.target.checked}))} style={{ accentColor: ac }} /> {t("sc_bgbox_label")}
                    </label>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_opacity_label")} {st.opacity}%</div>
                      <input type="range" min="0" max="100" value={st.opacity} onChange={e => setSt(p=>({...p,opacity:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  {st.bgBox && (
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_box_bg_color")}</div>
                      <input type="color" value={st.bgColor?.startsWith("rgba") ? "#000000" : (st.bgColor || "#000000")} onChange={e => setSt(p=>({...p,bgColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                </div>
              ))}

              {/* 템플릿 프리셋 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8 }}>{t("sc_template_preset")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
                  {TEMPLATES.map(tpl => (
                    <div key={tpl.id} onClick={() => { setTemplate(tpl.id); setTitleStyle(p=>({...p,color:tpl.titleColor})); setCaptionStyle(p=>({...p,color:tpl.captionColor})); }}
                      style={{ border: `2px solid ${template === tpl.id ? "#7c6aff" : "#2a2a4a"}`, borderRadius: 6, padding: 2, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ height: 24, borderRadius: 4, background: tpl.bg }} />
                      <div style={{ fontSize: 7, fontWeight: 700, color: template === tpl.id ? "#7c6aff" : "#555", marginTop: 2 }}>{t(tpl.nameKey)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} style={{ ...btnStyle, marginTop: 4 }}>{t("sc_generate_video")} <span style={{ opacity: 0.7, fontSize: 12 }}>(100P)</span></button>
            </>) : (<>
              {/* 오버레이 탭 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>{t("sc_add_element")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("image"); overlayFileRef.current.click(); }}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>🖼</span>{t("sc_image")}
                  </button>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("logo"); overlayFileRef.current.click(); }}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>💎</span>{t("sc_logo")}
                  </button>
                  <button onClick={() => addOverlay("text")}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>Aa</span>{t("sc_text_label")}
                  </button>
                </div>
              </div>

              {/* 자료실 연동 갤러리 */}
              <ArchiveGallery onSelect={(url) => addOverlay("image", { src: url })} />

              {/* 오버레이 리스트 */}
              {overlays.length > 0 && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>{t("sc_overlay_count")} ({overlays.length})</div>
                  {overlays.map(o => (
                    <div key={o.id} onClick={() => setSelectedOverlay(o.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 3, background: selectedOverlay === o.id ? "rgba(236,72,153,0.15)" : "transparent", border: selectedOverlay === o.id ? "1px solid rgba(236,72,153,0.3)" : "1px solid transparent" }}>
                      <span style={{ fontSize: 14 }}>{o.type === "text" ? "Aa" : o.type === "logo" ? "💎" : "🖼"}</span>
                      <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{o.type === "text" ? o.text : o.type === "logo" ? t("sc_logo") : t("sc_image")}</span>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ec4899", marginBottom: 8 }}>{t("sc_props")}</div>
                    {o.type === "text" && <>
                      <input value={o.text || ""} onChange={e => upd("text", e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_font_size")}</div>
                          <input type="number" value={o.fontSize || 16} onChange={e => upd("fontSize", Number(e.target.value))} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_color")}</div>
                          <input type="color" value={o.color || "#ffffff"} onChange={e => upd("color", e.target.value)} style={{ width: "100%", height: 28, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                        </div>
                      </div>
                    </>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_start_sec")}</div>
                        <input type="number" step="0.1" value={o.start} onChange={e => upd("start", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>{t("sc_end_sec")}</div>
                        <input type="number" step="0.1" value={o.end} onChange={e => upd("end", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>{t("sc_overlay_drag_note")}</div>
                  </div>
                );
              })()}
            </>)}
          </div>
        </div>
      </div>

      {/* BOTTOM: CapCut 스타일 하단 (컨트롤바 + 타임라인) */}
      <div style={{ flexShrink: 0, background: "#111120", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* 높이 조절 핸들 */}
        <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={e => { e.preventDefault(); const sy = e.clientY; const oh = bottomPanelHeight;
            const mv = ev => setBottomPanelHeight(Math.max(140, Math.min(400, oh - (ev.clientY - sy))));
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
          }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* 중앙 컨트롤바: 재생 + 시간 + 줌 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px", gap: 16, flexShrink: 0 }}>
          {/* 좌측: 되돌리기 */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={doUndo} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: undoStack.current.length ? "rgba(255,255,255,0.08)" : "transparent", color: undoStack.current.length ? "#ccc" : "#444", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }} title={t("sc_shortcut_undo")}>↩</button>
            <button onClick={doRedo} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: redoStack.current.length ? "rgba(255,255,255,0.08)" : "transparent", color: redoStack.current.length ? "#ccc" : "#444", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }} title={t("sc_shortcut_redo")}>↪</button>
          </div>

          {/* 중앙: 재생 컨트롤 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "#aaa", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: isPlaying ? "rgba(255,255,255,0.12)" : "#7c6aff", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isPlaying ? "none" : "0 2px 12px rgba(124,106,255,0.4)" }}>
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <span style={{ fontSize: 13, color: "#fff", fontFamily: "monospace", fontWeight: 600, minWidth: 100, textAlign: "center" }}>{fmt(playhead)} <span style={{ color: "#555" }}>/</span> {fmt(clipDuration)}</span>
          </div>

          {/* 우측: 줌 + 저장 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "4px 8px" }}>
              <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <input type="range" min="50" max="400" value={timelineZoom * 100} onChange={e => setTimelineZoom(Number(e.target.value)/100)} style={{ width: 60, accentColor: "#7c6aff", height: 3 }} />
              <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
            <button onClick={() => { saveProject(); alert(t("sc_project_saved")); }} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(74,222,128,0.1)", color: "#4ade80", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }} title={t("sc_save_label")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
          </div>
        </div>

        {/* 컨텍스트 액션바: 선택 상태에 따라 표시 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 16px 8px", flexShrink: 0, minHeight: 36 }}>
          {/* 항상 표시: 분할, 자막추가 */}
          <button onClick={splitAtPlayhead} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(245,158,11,0.12)", color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="2" x2="12" y2="22"/><polyline points="8 6 12 2 16 6"/><polyline points="8 18 12 22 16 18"/></svg>
            {t("sc_split")}
          </button>
          <button onClick={() => {
            const subs = [...(curClip.subtitles || [])];
            const newStart = clipStart + playhead;
            subs.push({ start: newStart, end: newStart + 3, text: t("sc_new_sub_text") });
            subs.sort((a, b) => a.start - b.start);
            updateClip("subtitles", subs);
            setSelectedSubIdx(subs.findIndex(s => s.start === newStart));
          }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(165,180,252,0.12)", color: "#a5b4fc", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("sc_subtitle_on")}
          </button>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

          {/* 무음 제거 */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setRemoveSilence(!removeSilence)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: removeSilence ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)", color: removeSilence ? "#4ade80" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/>{removeSilence ? <path d="M23 9l-6 6m0-6l6 6" stroke="#4ade80"/> : <path d="M15.54 8.46a5 5 0 010 7.07"/>}</svg>
              {t("sc_silence_remove")}
            </button>
            {removeSilence && (
              <button onClick={() => setShowSilenceSettings(!showSilenceSettings)} style={{ position: "absolute", top: -2, right: -6, width: 16, height: 16, borderRadius: 8, border: "none", background: "#4ade80", color: "#111", cursor: "pointer", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                {showSilenceSettings ? "x" : "..."}
              </button>
            )}
            {showSilenceSettings && (
              <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: 240, background: "#1a1a30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, zIndex: 100, boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", marginBottom: 14 }}>{t("sc_silence_settings")}</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#999" }}>{t("sc_threshold_db")}</span>
                    <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{silenceThreshold} dB</span>
                  </div>
                  <input type="range" min="-60" max="-10" value={silenceThreshold} onChange={e => setSilenceThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "#4ade80" }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#999" }}>{t("sc_min_silence_len")}</span>
                    <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{silenceMinGap}s</span>
                  </div>
                  <input type="range" min="0.1" max="3" step="0.1" value={silenceMinGap} onChange={e => setSilenceMinGap(Number(e.target.value))} style={{ width: "100%", accentColor: "#4ade80" }} />
                </div>
              </div>
            )}
          </div>

          {/* 볼륨 (200%까지 부스트) */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "4px 10px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={volume > 100 ? "#f59e0b" : "#888"} strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
            <input type="range" min="0" max="200" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: 60, accentColor: volume > 100 ? "#f59e0b" : "#7c6aff", height: 3 }} />
            <span style={{ fontSize: 10, color: volume > 100 ? "#f59e0b" : "#666", fontWeight: 700, minWidth: 30 }}>{volume}%</span>
          </div>

          {/* BGM */}
          <button onClick={() => bgmFileRef.current?.click()} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: bgmFile ? "rgba(236,72,153,0.12)" : "rgba(255,255,255,0.05)", color: bgmFile ? "#ec4899" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            {bgmFile ? bgmFile.name.slice(0, 10) : t("sc_bgm")}
          </button>
          {bgmFile && <input type="range" min="0" max="100" value={bgmVolume} onChange={e => setBgmVolume(Number(e.target.value))} style={{ width: 40, accentColor: "#ec4899", height: 3 }} />}
          <input ref={bgmFileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setBgmFile({ name: f.name, url: URL.createObjectURL(f) }); e.target.value = ""; }} />

          {/* AI 자동 미디어 삽입 */}
          {subtitlesEnabled && (curClip?.subtitles || []).length > 0 && (
            <button onClick={autoInsertMedia} disabled={autoMediaLoading}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: autoMediaLoading ? "rgba(124,106,255,0.2)" : "linear-gradient(135deg,rgba(124,106,255,0.15),rgba(236,72,153,0.12))", color: autoMediaLoading ? "#7c6aff" : "#c084fc", cursor: autoMediaLoading ? "wait" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              {autoMediaLoading
                ? <><div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(124,106,255,0.2)", borderTopColor: "#7c6aff", animation: "spin 0.8s linear infinite" }} /> AI 삽입 중...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> AI 미디어 자동삽입</>}
            </button>
          )}

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

          {/* 자막 토글 */}
          <button onClick={() => setSubtitlesEnabled(!subtitlesEnabled)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: subtitlesEnabled ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)", color: subtitlesEnabled ? "#f59e0b" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            CC {subtitlesEnabled ? "ON" : "OFF"}
          </button>

          {/* 자막 애니메이션 */}
          {subtitlesEnabled && (
            <select value={captionAnimation} onChange={e => setCaptionAnimation(e.target.value)}
              style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: captionAnimation !== "none" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)", color: captionAnimation !== "none" ? "#f59e0b" : "#666", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              {CAPTION_ANIMS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          {/* 번역 자막 */}
          {subtitlesEnabled && (
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <button onClick={() => setDualSubEnabled(!dualSubEnabled)} style={{ padding: "6px 12px", borderRadius: "8px 0 0 8px", border: "none", background: dualSubEnabled ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.05)", color: dualSubEnabled ? "#22d3ee" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {dualSubEnabled ? "2" : "+"}{lang === "ko" ? "번역" : "Trans"}
              </button>
              <select value={dualSubLang} onChange={e => { setDualSubLang(e.target.value); translateSubtitles(e.target.value); }}
                style={{ padding: "6px 8px", borderRadius: "0 8px 8px 0", border: "none", borderLeft: "1px solid rgba(255,255,255,0.06)", background: dualSubEnabled ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.03)", color: dualSubEnabled ? "#22d3ee" : "#888", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                {SUB_LANGS.filter(l => l[0] !== subLang).map(l => <option key={l[0]} value={l[0]}>{l[1]}</option>)}
              </select>
              {translating && <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", animation: "spin 0.8s linear infinite", marginLeft: 6 }} />}
            </div>
          )}

          {/* 선택 요소 삭제 (컨텍스트) */}
          {selectedSegIdx >= 0 && videoSegs.length > 1 && (
            <button onClick={() => deleteSegment(selectedSegIdx)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              {t("sc_del_segment")}
            </button>
          )}
          {selectedSubIdx >= 0 && (
            <button onClick={() => deleteSubtitle(selectedSubIdx)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              {t("sc_del_subtitle")}
            </button>
          )}
        </div>

        {/* 타임라인 트랙 영역 */}
        <div style={{ height: Math.max(24 + TRACK_H * allTracks.length + 8, bottomPanelHeight - 90), display: "flex", overflow: "hidden" }}>
          {/* 트랙 라벨 (좌측 고정) — 아이콘 기반 */}
          <div style={{ width: 40, flexShrink: 0, background: "#0d0d1a", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ height: 24 }} />
            {allTracks.map(tr => (
              <div key={tr.id} style={{ height: TRACK_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tr.id === "V1" ? <svg width="14" height="14" viewBox="0 0 24 24" fill={tr.color} opacity="0.6"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
                  : tr.id === "A1" ? <svg width="14" height="14" viewBox="0 0 24 24" fill={tr.color} opacity="0.6"><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg>
                  : tr.id === "S1" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tr.color} strokeWidth="2" opacity="0.6"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 12h4m-2-2v4m4-2h4"/></svg>
                  : <span style={{ fontSize: 9, fontWeight: 800, color: tr.color, opacity: 0.6 }}>{tr.label}</span>}
              </div>
            ))}
          </div>

          {/* 스크롤 가능한 트랙 */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "default" }}
            onMouseDownCapture={e => {
              if (e.button !== 0) return;
              const scrollEl = timelineRef.current;
              if (!scrollEl) return;
              const rect = scrollEl.getBoundingClientRect();
              const x = e.clientX - rect.left + scrollEl.scrollLeft;
              const startPh = Math.max(0, Math.min(clipDuration, x / pxPerSec));
              let moved = false;
              const onMove = ev => {
                const mx = ev.clientX - rect.left + scrollEl.scrollLeft;
                const curPh = Math.max(0, Math.min(clipDuration, mx / pxPerSec));
                if (!moved && Math.abs(curPh - startPh) > 0.2) moved = true;
                if (moved) setRangeSelecting({ startPh, endPh: curPh });
              };
              const onUp = ev => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                if (!moved) { userSeekRef.current = true; setPlayhead(startPh); setRangeSelecting(null); return; }
                const mx = ev.clientX - rect.left + scrollEl.scrollLeft;
                const endPh = Math.max(0, Math.min(clipDuration, mx / pxPerSec));
                const lo = Math.min(startPh, endPh), hi = Math.max(startPh, endPh);
                setPlayhead(lo);
                let accSeg = 0;
                for (let si = 0; si < videoSegs.length; si++) {
                  const segLen = videoSegs[si].end - videoSegs[si].start;
                  if (accSeg + segLen > lo && accSeg < hi) { setSelectedSegIdx(si); setSelectedTrack("V1"); break; }
                  accSeg += segLen;
                }
                const subs = curClip.subtitles || [];
                for (let si = 0; si < subs.length; si++) {
                  const rs = Math.max(0, subs[si].start - clipStart);
                  const re = Math.max(rs + 0.5, (subs[si].end || subs[si].start + 3) - clipStart);
                  if (re > lo && rs < hi) { setSelectedSubIdx(si); break; }
                }
                const olHit = overlays.find(o => o.end > lo && o.start < hi);
                if (olHit) { setSelectedOverlay(olHit.id); setPropTab("overlay"); }
                setRangeSelecting(null);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>

              {/* 룰러 */}
              <div style={{ height: 24, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => i).filter(i => timelineZoom >= 2 ? true : timelineZoom >= 1 ? i % 2 === 0 : i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * pxPerSec, top: 0, height: "100%" }}>
                    <div style={{ width: 1, height: sec % 5 === 0 ? 10 : 5, background: sec % 5 === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)", marginTop: 14 }} />
                    {(sec % 5 === 0 || timelineZoom >= 2) && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", position: "absolute", left: 4, top: 2, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(sec)}</span>}
                  </div>
                ))}
              </div>

              {/* 오버레이 트랙 */}
              {overlayTracks.map(tr => {
                const o = tr.overlay;
                const left = o.start * pxPerSec;
                const width = Math.max((o.end - o.start) * pxPerSec, 20);
                const sel = selectedOverlay === o.id;
                return (
                  <div key={tr.id} style={{ height: TRACK_H, position: "relative" }}>
                    <div
                      onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); setPropTab("overlay"); setSelectedSubIdx(-1); setSelectedSegIdx(-1); }}
                      onMouseDown={e => {
                        if (e.target.dataset.handle) return;
                        e.stopPropagation(); e.preventDefault();
                        setSelectedOverlay(o.id);
                        const sx = e.clientX; const origStart = o.start; const dur = o.end - o.start;
                        const mv = ev => { const dt = (ev.clientX - sx) / pxPerSec; const ns = Math.max(0, Math.round((origStart + dt) * 10) / 10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: ns, end: ns + dur } : x)); };
                        const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                        window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                      }}
                      style={{ position: "absolute", left, top: 4, width, height: TRACK_H - 8, background: sel ? "linear-gradient(135deg,rgba(236,72,153,0.35),rgba(236,72,153,0.2))" : "linear-gradient(135deg,rgba(236,72,153,0.18),rgba(236,72,153,0.08))", border: sel ? "2px solid #ec4899" : "1px solid rgba(236,72,153,0.25)", borderRadius: 8, cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: sel ? 5 : 1, transition: "border 0.15s" }}>
                      <span style={{ fontSize: 10, color: sel ? "#fff" : "#f9a8d4", fontWeight: 600, pointerEvents: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 16px" }}>{o.type === "text" ? o.text : o.type === "logo" ? "Logo" : "Img"}</span>
                      <div data-handle="left" style={{ position: "absolute", left: 0, top: 0, width: TRIM_W, height: "100%", cursor: "ew-resize", background: sel ? "rgba(236,72,153,0.6)" : "rgba(236,72,153,0.2)", borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = o.start;
                          const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx)/pxPerSec)*10)/10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: Math.min(ns, o.end - 0.5) } : x)); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: "rgba(255,255,255,0.4)" }} />
                      </div>
                      <div data-handle="right" style={{ position: "absolute", right: 0, top: 0, width: TRIM_W, height: "100%", cursor: "ew-resize", background: sel ? "rgba(236,72,153,0.6)" : "rgba(236,72,153,0.2)", borderRadius: "0 8px 8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = o.end;
                          const mv = ev => { const ne = Math.max(o.start + 0.5, Math.round((oe + (ev.clientX - sx)/pxPerSec)*10)/10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, end: ne } : x)); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: "rgba(255,255,255,0.4)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* V1 비디오 트랙 */}
              <div style={{ height: TRACK_H, position: "relative" }}>
                {videoSegs.map((seg, si) => {
                  let accLeft = 0;
                  for (let j = 0; j < si; j++) accLeft += (videoSegs[j].end - videoSegs[j].start);
                  const segLen = seg.end - seg.start;
                  const left = accLeft * pxPerSec;
                  const width = segLen * pxPerSec;
                  const isSel = selectedSegIdx === si;
                  return (
                    <div key={si} onClick={e => { e.stopPropagation(); setSelectedSegIdx(si); setSelectedTrack("V1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                      style={{ position: "absolute", left, top: 4, width, height: TRACK_H - 8, background: isSel ? "linear-gradient(135deg,rgba(74,158,255,0.3),rgba(74,158,255,0.15))" : "linear-gradient(135deg,rgba(74,158,255,0.15),rgba(74,158,255,0.06))", border: isSel ? "2px solid #4a9eff" : "1px solid rgba(74,158,255,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", transition: "border 0.15s" }}>
                      <span style={{ fontSize: 10, color: isSel ? "#fff" : "rgba(74,158,255,0.8)", fontWeight: 600, whiteSpace: "nowrap", padding: "0 16px" }}>{fmt(seg.start)} - {fmt(seg.end)}</span>
                      <div style={{ position: "absolute", left: 0, top: 0, width: TRIM_W, height: "100%", cursor: "ew-resize", background: isSel ? "rgba(74,158,255,0.5)" : "rgba(74,158,255,0.15)", borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = seg.start;
                          const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx)/pxPerSec)*10)/10); setVideoSegs(prev => { const n=[...prev]; n[si]={...n[si], start: Math.min(ns, seg.end-0.5)}; return n; }); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }}>
                        <div style={{ width: 3, height: 16, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
                      </div>
                      <div style={{ position: "absolute", right: 0, top: 0, width: TRIM_W, height: "100%", cursor: "ew-resize", background: isSel ? "rgba(74,158,255,0.5)" : "rgba(74,158,255,0.15)", borderRadius: "0 8px 8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = seg.end;
                          const mv = ev => { const ne = Math.max(seg.start+0.5, Math.round((oe + (ev.clientX - sx)/pxPerSec)*10)/10); setVideoSegs(prev => { const n=[...prev]; n[si]={...n[si], end: ne}; return n; }); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }}>
                        <div style={{ width: 3, height: 16, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* A1 오디오 트랙 */}
              <div style={{ height: TRACK_H, position: "relative" }}>
                <div onClick={e => { e.stopPropagation(); setSelectedTrack("A1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                  style={{ position: "absolute", left: 0, top: 4, width: clipDuration * pxPerSec, height: TRACK_H - 8, background: selectedTrack === "A1" ? "linear-gradient(135deg,rgba(74,222,128,0.2),rgba(74,222,128,0.1))" : "linear-gradient(135deg,rgba(74,222,128,0.1),rgba(74,222,128,0.04))", border: selectedTrack === "A1" ? "2px solid #4ade80" : "1px solid rgba(74,222,128,0.15)", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 8px", overflow: "hidden", cursor: "pointer", transition: "border 0.15s" }}>
                  <svg width="100%" height="100%" viewBox="0 0 200 24" preserveAspectRatio="none" style={{ opacity: 0.4 }}>
                    {Array.from({ length: 100 }, (_, i) => <rect key={i} x={i*2} y={12-(2+Math.abs(Math.sin(i*0.3+Math.cos(i*0.7)))*14)/2} width={1.2} height={2+Math.abs(Math.sin(i*0.3+Math.cos(i*0.7)))*14} fill="#4ade80" rx={0.6} />)}
                  </svg>
                </div>
              </div>

              {/* S1 자막 트랙 */}
              <div style={{ height: TRACK_H, position: "relative" }}>
                {(curClip.subtitles || []).map((s, i) => {
                  const relStart = Math.max(0, s.start - clipStart);
                  const relEnd = Math.max(relStart + 0.5, (s.end || s.start + 3) - clipStart);
                  const left = relStart * pxPerSec;
                  const nextSub = (curClip.subtitles || [])[i + 1];
                  let maxRight = relEnd * pxPerSec;
                  if (nextSub) { const nextStart = Math.max(0, nextSub.start - clipStart) * pxPerSec; if (maxRight > nextStart) maxRight = nextStart - 2; }
                  const width = Math.max(maxRight - left, 20);
                  const color = subColors[i % subColors.length];
                  const sel = selectedSubIdx === i;
                  return (
                    <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setSelectedSegIdx(-1); setSelectedOverlay(null); setPlayhead(relStart); }}
                      style={{ position: "absolute", left, top: 4, width, height: TRACK_H - 8, background: sel ? `${color}35` : `${color}15`, border: sel ? `2px solid ${color}` : `1px solid ${color}30`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: sel ? 5 : 1, transition: "border 0.15s" }}>
                      <span style={{ fontSize: 10, color: sel ? "#fff" : "#ccc", fontWeight: sel ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none", padding: "0 16px" }}>{s.text || `#${i+1}`}</span>
                      <div style={{ position: "absolute", left: 0, top: 0, width: TRIM_W - 2, height: "100%", cursor: "ew-resize", background: sel ? `${color}60` : `${color}20`, borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const os=s.start;
                          const mv=ev=>{const ns=Math.max(0,Math.round((os+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],start:Math.min(ns,(s.end||s.start+3)-0.5)};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }}>
                        <div style={{ width: 2, height: 12, borderRadius: 1, background: "rgba(255,255,255,0.3)" }} />
                      </div>
                      <div style={{ position: "absolute", right: 0, top: 0, width: TRIM_W - 2, height: "100%", cursor: "ew-resize", background: sel ? `${color}60` : `${color}20`, borderRadius: "0 8px 8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const oe=s.end||s.start+3;
                          const mv=ev=>{const ne=Math.max(s.start+0.5,Math.round((oe+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],end:ne};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }}>
                        <div style={{ width: 2, height: 12, borderRadius: 1, background: "rgba(255,255,255,0.3)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 범위 선택 하이라이트 */}
              {rangeSelecting && Math.abs(rangeSelecting.endPh - rangeSelecting.startPh) > 0.1 && (
                <div style={{ position: "absolute", left: Math.min(rangeSelecting.startPh, rangeSelecting.endPh) * pxPerSec, top: 0, width: Math.abs(rangeSelecting.endPh - rangeSelecting.startPh) * pxPerSec, height: "100%", background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.3)", zIndex: 18, pointerEvents: "none", borderRadius: 4 }} />
              )}

              {/* 재생 헤드 */}
              <div style={{ position: "absolute", left: playhead * pxPerSec, top: 0, width: 2, height: "100%", background: "#fff", zIndex: 20, pointerEvents: "none", boxShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                <div style={{ position: "absolute", top: 0, left: -6, width: 14, height: 14, background: "#fff", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>)}
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
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: "60vh", background: D ? "transparent" : "#f4f4f8" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        {/* 좌측: 생성된 쇼츠 리스트 */}
        <div style={{ width: 240, flexShrink: 0, padding: "18px", overflowY: "auto", borderRight: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>
            {isComplete ? `${t("sc_generated_shorts_title")} (${doneResults.length})` : `${t("sc_generating_progress")} (${completed}/${total})`}
          </div>
          {editClips.map((c, i) => {
            const r = results.find(x => x.index === i);
            return (
              <div key={i} onClick={() => r?.type === "done" && setPreviewIdx(i)}
                style={{ padding: "10px 12px", borderRadius: 10, cursor: r?.type === "done" ? "pointer" : "default", marginBottom: 6, borderLeft: `3px solid ${previewIdx === i && r?.type === "done" ? acc : "transparent"}`, background: previewIdx === i && r?.type === "done" ? `${acc}10` : card, border: `1px solid ${bdr}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {r?.type === "done" ? <span style={{ color: "#4ade80", fontSize: 14 }}>✓</span> : r?.type === "error" ? <span style={{ color: "#f87171", fontSize: 14 }}>✗</span> : <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${bdr}`, borderTopColor: acc, animation: "spin 1s linear infinite" }} />}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{c.title || c.hook || c.bottom_title || `Short ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color: muted }}>{r?.type === "done" ? t("sc_done") : r?.type === "error" ? t("sc_failed") : t("sc_generating")}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측: 미리보기 + 다운로드 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 32px", overflowY: "auto" }}>
          {doneResults.length > 0 ? (
            <>
              {/* 영상 미리보기 */}
              <div style={{ ...cardStyle, width: "100%", maxWidth: 480, padding: 0, overflow: "hidden", borderRadius: 16 }}>
                <div style={{ background: "#000", textAlign: "center" }}>
                  <video id="shorts-preview-video" controls playsinline
                    src={`${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}`}
                    style={{ maxHeight: "60vh", width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }} />
                </div>
                {/* 클립 제목 표시 */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${bdr}` }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{editClips[previewIdx]?.title || `Short ${previewIdx + 1}`}</div>
                  {editClips[previewIdx]?.bottom_title && <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{editClips[previewIdx].bottom_title}</div>}
                </div>
              </div>

              {/* 다운로드 */}
              <div style={{ marginTop: 20, textAlign: "center", width: "100%", maxWidth: 480 }}>
                <button onClick={() => {
                    // 영상 다운로드
                    const videoA = document.createElement("a");
                    videoA.href = `${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}`;
                    videoA.download = doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename;
                    document.body.appendChild(videoA); videoA.click(); document.body.removeChild(videoA);
                    // 자막이 있으면 SRT도 함께 다운로드
                    const clip = editClips[previewIdx];
                    if (clip && (clip.subtitles || []).length > 0) {
                      setTimeout(() => downloadSrt(clip), 500);
                    }
                  }}
                  style={{ display: "block", width: "100%", padding: "14px 24px", borderRadius: 14, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 15, fontWeight: 800, textDecoration: "none", textAlign: "center", boxShadow: `0 4px 20px ${acc}40`, border: "none", cursor: "pointer" }}>
                  {t("sc_download_btn")}
                </button>
                {doneResults.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    {doneResults.filter(r => r.index !== previewIdx).map(r => (
                      <a key={r.index} href={`${API}/outputs/${fileId}/${r.filename}`} download={r.filename}
                        style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${bdr}`, background: card, color: text, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        {editClips[r.index]?.title || `Short ${r.index + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>


              {isComplete && (
                <button onClick={() => { setStep("upload"); setFileId(null); setSegments([]); setResults([]); setError(""); }}
                  style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                  {t("sc_new_video_btn")}
                </button>
              )}
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

              <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>{t("sc_creating_video")}</div>
              <div style={{ fontSize: 14, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                {t("sc_creating_desc_line1")}<br/>
                {t("sc_creating_desc_line2")}
              </div>

              {/* 진행률 바 */}
              <div style={{ background: "rgba(128,128,128,0.15)", borderRadius: 10, height: 8, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", borderRadius: 10, background: `linear-gradient(90deg,${acc},#8b5cf6)`, width: `${total > 0 ? (completed / total) * 100 : 0}%`, transition: "width 0.5s ease" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: acc }}>{completed} / {total}{t("sc_n_completed")}</span>
                <span style={{ fontSize: 12, color: muted }}>{t("sc_estimated")} {Math.max(1, (total - completed) * 2)}~{Math.max(2, (total - completed) * 4)}{t("sc_min_remaining")}</span>
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
                        <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>{isDone ? t("sc_done") : isErr ? t("sc_failed") : isCurrent ? t("sc_generating") : t("sc_waiting")}</span>
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
