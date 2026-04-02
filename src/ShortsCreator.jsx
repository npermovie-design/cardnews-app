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

// ── 통합 자료실 (내 자료 + 무료사진 + 무료영상 + GIF 통합 검색) ──
function ArchiveGallery({ onSelect }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState("photo"); // archive | photo | video | gif
  const CATS = [["archive","내 자료"],["photo","무료사진"],["video","무료영상"],["gif","GIF"]];

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
          parsed.forEach(url => { if (typeof url === "string" && url.startsWith("http")) imgs.push({ url, title: p.title, src: "내 자료" }); });
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>자료실</div>
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
          placeholder={cat === "archive" ? "자료실 필터..." : cat === "gif" ? "GIF 검색 (영어 추천)" : cat === "video" ? "영상 검색 (영어 추천)" : "사진 검색 (영어 추천)"}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none" }} />
        {cat !== "archive" && <button onClick={() => doSearch()} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>검색</button>}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 16, color: "#666", fontSize: 11 }}>로딩 중...</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: 16, color: "#555", fontSize: 11 }}>
          {cat === "archive" ? "자료실에 이미지가 없습니다" : "검색어를 입력하고 Enter"}
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
  // 제목 스타일
  const [titleStyle, setTitleStyle] = useState({ color: "#FFFFFF", fontSize: 20, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.75)", opacity: 100 });
  // 자막 스타일
  const [captionStyle, setCaptionStyle] = useState({ color: "#FFFFFF", fontSize: 15, shadow: true, border: false, borderColor: "#000", bgBox: true, bgColor: "rgba(0,0,0,0.7)", opacity: 100 });
  // 호환성
  const titleColor = titleStyle.color;
  const captionColor = captionStyle.color;
  const fontSize = titleStyle.fontSize;
  const [removeSilence, setRemoveSilence] = useState(false);
  const [maxChars, setMaxChars] = useState(0);
  const [shortsLength, setShortsLength] = useState("s30");
  const [userPrompt, setUserPrompt] = useState("");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true); // 자동자막 켜기/끄기
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
  const [captionPos, setCaptionPos] = useState({ x: 50, y: 88 }); // % 기준
  const [dragging, setDragging] = useState(null); // 'title' | 'caption' | overlay id | null
  // 속성 패널 탭
  const [propTab, setPropTab] = useState("style"); // style | overlay
  // 레이아웃 모드: full(전체화면) | bars(검은바+중앙영상)
  const [layoutMode, setLayoutMode] = useState("bars");
  // 스냅 가이드 표시
  const [snapGuide, setSnapGuide] = useState(null);
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

  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const playIntervalRef = useRef(null);
  const timelineRef = useRef(null);
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const overlayFileRef = useRef(null);

  // ── 현재 클립 (타임라인 등에서 사용) ────────────
  const curClip = editClips[editIdx] || {};
  const updateClip = (key, val) => {
    setEditClips(prev => { const n = [...prev]; n[editIdx] = { ...n[editIdx], [key]: val }; return n; });
  };

  // 세그먼트 총 재생 길이 (키보드 단축키보다 먼저 선언)
  const totalSegsDuration = videoSegs.reduce((acc, s) => acc + (s.end - s.start), 0);
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
      if (e.key === "ArrowLeft") { e.preventDefault(); setPlayhead(prev => Math.max(0, prev - (e.shiftKey ? 5 : 1))); }
      if (e.key === "ArrowRight") { e.preventDefault(); setPlayhead(prev => Math.min(clipDuration, prev + (e.shiftKey ? 5 : 1))); }
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

  // seek: 재생 중이 아닐 때만 currentTime 설정
  useEffect(() => {
    const v = videoRef.current;
    if (!v || step !== "edit" || isPlaying) return;
    const target = playheadToAbsolute(playhead);
    if (Math.abs(v.currentTime - target) > 0.3) {
      seekingRef.current = true;
      v.currentTime = target;
    }
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
    if (type === "text") { base.text = "텍스트"; base.fontSize = 16; base.color = "#fff"; }
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
    const subs = [...(curClip.subtitles || [])];
    subs.splice(idx, 1);
    updateClip("subtitles", subs);
    if (selectedSubIdx === idx) setSelectedSubIdx(-1);
  };

  // ── 볼륨 동기화 ─────
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const a = bgmRef.current;
    if (a) { a.volume = bgmVolume / 100; a.loop = true; }
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

  // ── 프로젝트 저장/불러오기 ─────────────────
  const PROJECTS_KEY = "shorts_projects_v1";

  const saveProject = () => {
    const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    const proj = {
      id: projectId || ("sp_" + Date.now()),
      title: curClip.title || editClips[0]?.title || "제목 없음",
      fileId, editClips, videoSegs, overlays, template,
      titleStyle, captionStyle, titlePos, captionPos,
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
    setCaptionStyle(proj.captionStyle || captionStyle);
    setTitlePos(proj.titlePos || { x: 50, y: 8 });
    setCaptionPos(proj.captionPos || { x: 50, y: 88 });
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

        {/* 저장된 프로젝트 */}
        {(() => {
          const projs = getSavedProjects();
          if (projs.length === 0) return null;
          return (
            <div style={{ marginTop: 28, padding: "20px 0" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span>이어서 편집하기</span>
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
                    <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{p.editClips?.length || 0}개 클립 · {p.videoSegs?.length || 0}개 세그먼트</div>
                    <button onClick={e => { e.stopPropagation(); const projs2 = getSavedProjects().filter(x => x.id !== p.id); localStorage.setItem(PROJECTS_KEY, JSON.stringify(projs2)); }}
                      style={{ marginTop: 6, fontSize: 10, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0 }}>삭제</button>
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
  if (step === "edit") {
  const pxPerSec = 20 * timelineZoom;
  const tlWidth = Math.max(clipDuration * pxPerSec, 800);
  const TRACK_H = 32;
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
  const sourceUrl = fileId ? `${API}/source/${fileId}` : null;
  const visibleOverlays = overlays.filter(o => playhead >= o.start && playhead <= o.end);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1a1a2e", color: "#e0e0e0" }}>
      {/* 숨겨진 inputs */}
      <input ref={overlayFileRef} type="file" accept="image/*" style={{ display: "none" }} />
      {bgmFile && <audio ref={bgmRef} src={bgmFile.url} loop preload="auto" style={{ display: "none" }} />}

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
          <div style={{ padding: "14px 12px 8px", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>클립 목록</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {editClips.map((c, i) => (
              <div key={i} onClick={() => { setEditIdx(i); setSelectedSubIdx(-1); setPlayhead(0); setIsPlaying(false); }}
                style={{ padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: editIdx === i ? "rgba(124,106,255,0.18)" : "transparent", borderLeft: `3px solid ${editIdx === i ? "#7c6aff" : "transparent"}`, transition: "all 0.15s" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: editIdx === i ? "#7c6aff" : "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || c.hook || c.subtitle_text || `Short ${i + 1}`}</div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{fmt(c.start_seconds)} ~ {fmt(c.end_seconds)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px", borderTop: "1px solid #2a2a4a" }}>
            <button onClick={() => setStep("analysis")} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #2a2a4a", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer" }}>← 구간 선택</button>
          </div>
        </div>

        {/* CENTER: Preview (검은바 레이아웃 + 드래그 가능 오버레이) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0c0c1a", padding: 12, minWidth: 0 }}>
          {/* 레이아웃 전환 */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {[["bars","검은바"],["full","전체화면"]].map(([k,l]) => (
              <button key={k} onClick={() => setLayoutMode(k)}
                style={{ padding: "4px 12px", borderRadius: 6, border: layoutMode===k ? "1px solid #7c6aff" : "1px solid #2a2a4a", background: layoutMode===k ? "rgba(124,106,255,0.15)" : "#1a1a30", color: layoutMode===k ? "#a5b4fc" : "#666", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{l}</button>
            ))}
          </div>

          {/* 9:16 프리뷰 (화면에 맞게 자동 크기) */}
          <div ref={previewRef} style={{ width: "min(420px, 45vh * 9 / 16)", height: "min(746px, 80vh)", aspectRatio: "9/16", borderRadius: 8, background: "#000", border: "2px solid #2a2a4a", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", flexShrink: 0, position: "relative", userSelect: "none" }}>

            {layoutMode === "bars" ? (<>
              {/* 검은바 레이아웃: 상단바 + 영상 + 하단바 */}
              {/* 상단 검은바 (제목 — 가운데 정렬 고정, Y축만 드래그) */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "22%", background: "#000", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onMouseDown={e => handlePreviewMouseDown("title", e)}
                  style={{ width: "90%", textAlign: "center", cursor: "move", border: dragging === "title" ? "2px dashed #7c6aff" : "2px solid transparent", borderRadius: 4, padding: "4px 8px", opacity: titleStyle.opacity / 100 }}>
                  <span style={{
                    fontSize: Math.min(titleStyle.fontSize + 2, 28), fontWeight: 900, color: titleStyle.color,
                    lineHeight: 1.3, wordBreak: "keep-all", display: "inline-block", textAlign: "center",
                    textShadow: titleStyle.shadow ? "0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)" : "none",
                    WebkitTextStroke: titleStyle.border ? `1px ${titleStyle.borderColor}` : "none",
                    background: titleStyle.bgBox ? titleStyle.bgColor : "transparent",
                    padding: titleStyle.bgBox ? "4px 12px" : 0, borderRadius: titleStyle.bgBox ? 6 : 0,
                  }}>{curClip.title || "제목을 입력하세요"}</span>
                </div>
              </div>

              {/* 중앙 영상 (원본 비율 유지) */}
              <div style={{ position: "absolute", top: "22%", left: 0, right: 0, bottom: "22%", overflow: "hidden", background: "#000" }}>
                <video ref={videoRef} src={sourceUrl || undefined}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                  preload="metadata" playsInline />
                {!sourceUrl && (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.5)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.3"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                  </div>
                )}
              </div>

              {/* 하단 검은바 (자막 — 가운데 정렬 고정) */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "22%", background: "#000", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onMouseDown={e => handlePreviewMouseDown("caption", e)}
                  style={{ width: "90%", textAlign: "center", cursor: "move", border: dragging === "caption" ? "2px dashed #f59e0b" : "2px solid transparent", borderRadius: 4, padding: "4px 8px", opacity: captionStyle.opacity / 100 }}>
                  <span style={{
                    fontSize: Math.min(captionStyle.fontSize, 22), color: captionStyle.color, fontWeight: 700,
                    lineHeight: 1.4, wordBreak: "keep-all", display: "inline-block", textAlign: "center",
                    textShadow: captionStyle.shadow ? "0 2px 6px rgba(0,0,0,0.8)" : "none",
                    WebkitTextStroke: captionStyle.border ? `1px ${captionStyle.borderColor}` : "none",
                    background: captionStyle.bgBox ? captionStyle.bgColor : "transparent",
                    padding: captionStyle.bgBox ? "4px 12px" : 0, borderRadius: captionStyle.bgBox ? 6 : 0,
                  }}>
                    {subtitlesEnabled ? (currentSub ? currentSub.text : (curClip.subtitle_text || "자막 영역")) : ""}
                  </span>
                </div>
              </div>
            </>) : (<>
              {/* 전체화면 레이아웃 */}
              <video ref={videoRef} src={sourceUrl || undefined}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: sourceUrl ? "block" : "none", transform: `scale(${videoScale/100})`, transformOrigin: "center center" }}
                preload="metadata" playsInline />
              {!sourceUrl && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(40,40,60,0.3)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.2"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#fff" strokeWidth="1.5"/><polygon points="10,8 17,12 10,16" fill="#fff"/></svg>
                </div>
              )}
              {/* 제목 (드래그 가능) */}
              <div onMouseDown={e => handlePreviewMouseDown("title", e)}
                style={{ position: "absolute", left: `${titlePos.x}%`, top: `${titlePos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 10, padding: "8px 18px", borderRadius: 8, background: "rgba(0,0,0,0.75)", border: dragging === "title" ? "2px solid #7c6aff" : "2px solid transparent", maxWidth: "85%", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(fontSize + 2, 20), fontWeight: 900, color: titleColor, lineHeight: 1.3 }}>{curClip.title || "제목"}</span>
              </div>
              {/* 자막 (드래그 가능) */}
              <div onMouseDown={e => handlePreviewMouseDown("caption", e)}
                style={{ position: "absolute", left: `${captionPos.x}%`, top: `${captionPos.y}%`, transform: "translate(-50%,-50%)", cursor: "move", zIndex: 10, padding: "6px 16px", borderRadius: 6, background: "rgba(0,0,0,0.7)", border: dragging === "caption" ? "2px solid #f59e0b" : "2px solid transparent", maxWidth: "90%", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(fontSize, 16), color: captionColor, fontWeight: 600, lineHeight: 1.4 }}>
                  {subtitlesEnabled ? (currentSub ? currentSub.text : (curClip.subtitle_text || "자막")) : ""}
                </span>
              </div>
            </>)}

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
            {[["style","스타일"],["overlay","오버레이"]].map(([k,l]) => (
              <button key={k} onClick={() => setPropTab(k)}
                style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: propTab === k ? "#1e1e3a" : "transparent", color: propTab === k ? "#7c6aff" : "#666", borderBottom: propTab === k ? "2px solid #7c6aff" : "2px solid transparent" }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, padding: "10px 14px 14px", overflowY: "auto" }}>
            {propTab === "style" ? (<>
              {/* 영상 속성 (V1 선택 시) */}
              {selectedTrack === "V1" && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #4a9eff30" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4a9eff", marginBottom: 10 }}>영상 속성</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#888" }}>영상 확대/축소</span>
                      <span style={{ fontSize: 11, color: "#4a9eff", fontWeight: 700 }}>{videoScale}%</span>
                    </div>
                    <input type="range" min="50" max="200" value={videoScale} onChange={e => setVideoScale(Number(e.target.value))} style={{ width: "100%", accentColor: "#4a9eff" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                      <input type="number" step="0.1" value={curClip.start_seconds || 0} onChange={e => updateClip("start_seconds", Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                      <input type="number" step="0.1" value={curClip.end_seconds || 0} onChange={e => updateClip("end_seconds", parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 타임라인에서 좌우 핸들 드래그로도 조절 가능</div>
                </div>
              )}

              {/* 제목 편집 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>제목 / 부제</div>
                <input value={curClip.title || ""} onChange={e => updateClip("title", e.target.value)} placeholder="쇼츠 제목" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                <input value={curClip.subtitle_text || ""} onChange={e => updateClip("subtitle_text", e.target.value)} placeholder="부제목 (선택)" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 프리뷰에서 드래그하여 위치 변경</div>
              </div>

              {/* 선택된 자막 편집 */}
              {selectedSubIdx >= 0 && (curClip.subtitles || [])[selectedSubIdx] && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid #7c6aff40" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c6aff", marginBottom: 8 }}>자막 #{selectedSubIdx + 1}</div>
                  <textarea value={(curClip.subtitles || [])[selectedSubIdx]?.text || ""} onChange={e => {
                    const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], text: e.target.value }; updateClip("subtitles", subs);
                  }} rows={2} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.start || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], start: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                      <input type="number" step="0.1" value={(curClip.subtitles || [])[selectedSubIdx]?.end || 0} onChange={e => {
                        const subs = [...(curClip.subtitles || [])]; subs[selectedSubIdx] = { ...subs[selectedSubIdx], end: parseFloat(e.target.value) || 0 }; updateClip("subtitles", subs);
                      }} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* 템플릿 + 색상 */}
              {/* 텍스트 스타일 편집기 (공용) */}
              {[["title","상단 제목",titleStyle,setTitleStyle,"#7c6aff"],["caption","하단 자막",captionStyle,setCaptionStyle,"#f59e0b"]].map(([key,label,st,setSt,ac]) => (
                <div key={key} style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${ac}25` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>글자색</div>
                      <input type="color" value={st.color} onChange={e => setSt(p=>({...p,color:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>크기 <span style={{ color: ac }}>{st.fontSize}px</span></div>
                      <input type="range" min="10" max="32" value={st.fontSize} onChange={e => setSt(p=>({...p,fontSize:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.shadow} onChange={e => setSt(p=>({...p,shadow:e.target.checked}))} style={{ accentColor: ac }} /> 그림자
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.border} onChange={e => setSt(p=>({...p,border:e.target.checked}))} style={{ accentColor: ac }} /> 테두리
                    </label>
                  </div>
                  {st.border && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>테두리색</div>
                      <input type="color" value={st.borderColor} onChange={e => setSt(p=>({...p,borderColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", cursor: "pointer" }}>
                      <input type="checkbox" checked={st.bgBox} onChange={e => setSt(p=>({...p,bgBox:e.target.checked}))} style={{ accentColor: ac }} /> 배경 박스
                    </label>
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>투명도 {st.opacity}%</div>
                      <input type="range" min="0" max="100" value={st.opacity} onChange={e => setSt(p=>({...p,opacity:Number(e.target.value)}))} style={{ width: "100%", accentColor: ac }} />
                    </div>
                  </div>
                  {st.bgBox && (
                    <div>
                      <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>박스 배경색</div>
                      <input type="color" value={st.bgColor?.startsWith("rgba") ? "#000000" : (st.bgColor || "#000000")} onChange={e => setSt(p=>({...p,bgColor:e.target.value}))} style={{ width: "100%", height: 22, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                    </div>
                  )}
                </div>
              ))}

              {/* 템플릿 프리셋 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 8 }}>템플릿 프리셋</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4 }}>
                  {TEMPLATES.map(t => (
                    <div key={t.id} onClick={() => { setTemplate(t.id); setTitleStyle(p=>({...p,color:t.titleColor})); setCaptionStyle(p=>({...p,color:t.captionColor})); }}
                      style={{ border: `2px solid ${template === t.id ? "#7c6aff" : "#2a2a4a"}`, borderRadius: 6, padding: 2, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ height: 24, borderRadius: 4, background: t.bg }} />
                      <div style={{ fontSize: 7, fontWeight: 700, color: template === t.id ? "#7c6aff" : "#555", marginTop: 2 }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleGenerate} style={{ ...btnStyle, marginTop: 4 }}>영상 생성하기 →</button>
            </>) : (<>
              {/* 오버레이 탭 */}
              <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 10 }}>요소 추가</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("image"); overlayFileRef.current.click(); }}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>🖼</span>이미지
                  </button>
                  <button onClick={() => { overlayFileRef.current.onchange = handleOverlayFile("logo"); overlayFileRef.current.click(); }}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>💎</span>로고
                  </button>
                  <button onClick={() => addOverlay("text")}
                    style={{ padding: "10px 6px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: "#ccc", cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 16 }}>Aa</span>텍스트
                  </button>
                </div>
              </div>

              {/* 자료실 연동 갤러리 */}
              <ArchiveGallery onSelect={(url) => addOverlay("image", { src: url })} />

              {/* 오버레이 리스트 */}
              {overlays.length > 0 && (
                <div style={{ background: "#1e1e3a", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", marginBottom: 8 }}>오버레이 ({overlays.length})</div>
                  {overlays.map(o => (
                    <div key={o.id} onClick={() => setSelectedOverlay(o.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 3, background: selectedOverlay === o.id ? "rgba(236,72,153,0.15)" : "transparent", border: selectedOverlay === o.id ? "1px solid rgba(236,72,153,0.3)" : "1px solid transparent" }}>
                      <span style={{ fontSize: 14 }}>{o.type === "text" ? "Aa" : o.type === "logo" ? "💎" : "🖼"}</span>
                      <span style={{ fontSize: 11, color: "#ccc", flex: 1 }}>{o.type === "text" ? o.text : o.type === "logo" ? "로고" : "이미지"}</span>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ec4899", marginBottom: 8 }}>속성</div>
                    {o.type === "text" && <>
                      <input value={o.text || ""} onChange={e => upd("text", e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 12, outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>글자 크기</div>
                          <input type="number" value={o.fontSize || 16} onChange={e => upd("fontSize", Number(e.target.value))} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>색상</div>
                          <input type="color" value={o.color || "#ffffff"} onChange={e => upd("color", e.target.value)} style={{ width: "100%", height: 28, borderRadius: 4, cursor: "pointer", border: "1px solid #2a2a4a" }} />
                        </div>
                      </div>
                    </>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>시작 (초)</div>
                        <input type="number" step="0.1" value={o.start} onChange={e => upd("start", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>종료 (초)</div>
                        <input type="number" step="0.1" value={o.end} onChange={e => upd("end", parseFloat(e.target.value) || 0)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#12122a", color: "#e0e0e0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>* 프리뷰에서 드래그하여 위치 이동</div>
                  </div>
                );
              })()}
            </>)}
          </div>
        </div>
      </div>

      {/* BOTTOM: AlphaCut 스타일 하단 (툴바 + 타임라인) — 높이 조절 가능 */}
      <div style={{ flexShrink: 0, background: "#0f0f1a", borderTop: "2px solid #2a2a4a", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* 높이 조절 핸들 */}
        <div style={{ position: "absolute", top: -4, left: 0, right: 0, height: 8, cursor: "ns-resize", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={e => { e.preventDefault(); const sy = e.clientY; const oh = bottomPanelHeight;
            const mv = ev => setBottomPanelHeight(Math.max(120, Math.min(400, oh - (ev.clientY - sy))));
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
          }}>
          <div style={{ width: 40, height: 3, borderRadius: 2, background: "#3a3a5a" }} />
        </div>
        {/* 툴바 (AlphaCut 스타일) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", borderBottom: "1px solid #1a1a30", flexShrink: 0, background: "#12122a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={splitAtPlayhead} title="현재 위치에서 영상 분할" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#f59e0b", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              ✂ 분할
            </button>
            {selectedSegIdx >= 0 && videoSegs.length > 1 && (
              <button onClick={() => deleteSegment(selectedSegIdx)} title="선택 구간 삭제" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                🗑 구간삭제
              </button>
            )}
            {selectedSubIdx >= 0 && (
              <button onClick={() => deleteSubtitle(selectedSubIdx)} title="선택 자막 삭제" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f8717140", background: "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                🗑 자막삭제
              </button>
            )}
            <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 2px" }} />
            <button onClick={() => { setRemoveSilence(!removeSilence); }} style={{ padding: "5px 10px", borderRadius: 6, border: removeSilence ? "1px solid #4ade80" : "1px solid #2a2a4a", background: removeSilence ? "rgba(74,222,128,0.12)" : "#1a1a30", color: removeSilence ? "#4ade80" : "#888", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              무음삭제 {removeSilence ? "ON" : ""}
            </button>
            <div style={{ width: 1, height: 20, background: "#2a2a4a", margin: "0 2px" }} />
            {/* 볼륨 */}
            <span style={{ fontSize: 10, color: "#888" }}>🔊</span>
            <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: 50, accentColor: "#4ade80" }} title={`볼륨 ${volume}%`} />
            {/* BGM */}
            <button onClick={() => bgmFileRef.current?.click()} style={{ padding: "5px 10px", borderRadius: 6, border: bgmFile ? "1px solid #ec4899" : "1px solid #2a2a4a", background: bgmFile ? "rgba(236,72,153,0.1)" : "#1a1a30", color: bgmFile ? "#ec4899" : "#888", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              🎵 {bgmFile ? bgmFile.name.slice(0,8) : "배경음"}
            </button>
            {bgmFile && <input type="range" min="0" max="100" value={bgmVolume} onChange={e => setBgmVolume(Number(e.target.value))} style={{ width: 40, accentColor: "#ec4899" }} title={`배경음 ${bgmVolume}%`} />}
            <input ref={bgmFileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setBgmFile({ name: f.name, url: URL.createObjectURL(f) }); e.target.value = ""; }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* 자막 토글 */}
            <button onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              style={{ padding: "5px 10px", borderRadius: 6, border: subtitlesEnabled ? "1px solid #f59e0b" : "1px solid #2a2a4a", background: subtitlesEnabled ? "rgba(245,158,11,0.1)" : "#1a1a30", color: subtitlesEnabled ? "#f59e0b" : "#555", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              자막 {subtitlesEnabled ? "ON" : "OFF"}
            </button>
            {/* 저장 */}
            <button onClick={() => { saveProject(); alert("프로젝트가 저장되었습니다!"); }}
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #4ade8040", background: "rgba(74,222,128,0.08)", color: "#4ade80", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              💾 저장
            </button>
            <div style={{ width: 1, height: 16, background: "#2a2a4a" }} />
            <button onClick={() => { setPlayhead(0); setIsPlaying(false); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#7c6aff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              ⏮ 처음
            </button>
            <span style={{ fontSize: 11, color: "#7c6aff", fontFamily: "monospace", fontWeight: 600 }}>{fmt(playhead)} | {fmt(clipDuration)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button onClick={() => setTimelineZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
              <input type="range" min="50" max="400" value={timelineZoom * 100} onChange={e => setTimelineZoom(Number(e.target.value)/100)} style={{ width: 60, accentColor: "#7c6aff" }} />
              <button onClick={() => setTimelineZoom(z => Math.min(4, z + 0.25))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #2a2a4a", background: "#1a1a30", color: "#aaa", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        </div>

        {/* 타임라인 트랙 영역 */}
        <div style={{ height: Math.max(20 + TRACK_H * allTracks.length + 4, bottomPanelHeight - 40), display: "flex", overflow: "hidden" }}>
          {/* 트랙 라벨 (좌측 고정) */}
          <div style={{ width: 44, flexShrink: 0, background: "#0a0a18", borderRight: "1px solid #1a1a30" }}>
            <div style={{ height: 20 }} />
            {allTracks.map(tr => (
              <div key={tr.id} style={{ height: TRACK_H, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #1a1a25" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: tr.color }}>{tr.label}</span>
              </div>
            ))}
          </div>

          {/* 스크롤 가능한 트랙 — 클릭: playhead 이동, 드래그: 범위 선택 (모든 트랙) */}
          <div ref={timelineRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", cursor: "default" }}
            onMouseDown={e => {
              if (e.button !== 0) return;
              const scrollEl = e.currentTarget;
              const rect = scrollEl.getBoundingClientRect();
              const initScroll = scrollEl.scrollLeft;
              const x = e.clientX - rect.left + initScroll;
              const startPh = Math.max(0, Math.min(clipDuration, x / pxPerSec));
              setPlayhead(startPh);
              setRangeSelecting({ startPh, endPh: startPh });
              const onMove = ev => {
                const mx = ev.clientX - rect.left + scrollEl.scrollLeft;
                const endPh = Math.max(0, Math.min(clipDuration, mx / pxPerSec));
                setRangeSelecting(prev => prev ? { ...prev, endPh } : null);
              };
              const onUp = ev => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                const mx = ev.clientX - rect.left + scrollEl.scrollLeft;
                const endPh = Math.max(0, Math.min(clipDuration, mx / pxPerSec));
                const lo = Math.min(startPh, endPh), hi = Math.max(startPh, endPh);
                if (hi - lo < 0.3) { setRangeSelecting(null); return; }
                // 범위 내 모든 요소 선택: 세그먼트(V1) — 겹치면 선택
                let accSeg = 0;
                for (let si = 0; si < videoSegs.length; si++) {
                  const segLen = videoSegs[si].end - videoSegs[si].start;
                  const segStart = accSeg, segEnd = accSeg + segLen;
                  if (segEnd > lo && segStart < hi) { setSelectedSegIdx(si); setSelectedTrack("V1"); break; }
                  accSeg += segLen;
                }
                // 범위와 겹치는 자막(S1) — 범위와 조금이라도 겹치면 선택
                const subIdx = (curClip.subtitles || []).findIndex(s => {
                  const rs = s.start - clipStart, re = (s.end || s.start + 3) - clipStart;
                  return re > lo && rs < hi; // 겹침 판정 (완전포함이 아닌 overlap)
                });
                if (subIdx >= 0) setSelectedSubIdx(subIdx);
                // 범위와 겹치는 오버레이
                const olHit = overlays.find(o => o.end > lo && o.start < hi);
                if (olHit) { setSelectedOverlay(olHit.id); setPropTab("overlay"); }
                setRangeSelecting(null);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}>
            <div style={{ width: tlWidth, height: "100%", position: "relative" }}>

              {/* 룰러 */}
              <div style={{ height: 20, position: "relative", borderBottom: "1px solid #1a1a30" }}>
                {Array.from({ length: Math.ceil(clipDuration) + 1 }, (_, i) => i).filter(i => timelineZoom >= 2 ? true : timelineZoom >= 1 ? i % 2 === 0 : i % 5 === 0).map(sec => (
                  <div key={sec} style={{ position: "absolute", left: sec * pxPerSec, top: 0, height: "100%" }}>
                    <div style={{ width: 1, height: sec % 5 === 0 ? 8 : 4, background: sec % 5 === 0 ? "#444" : "#2a2a4a" }} />
                    {(sec % 5 === 0 || timelineZoom >= 2) && <span style={{ fontSize: 8, color: "#444", position: "absolute", left: 3, top: 7, fontFamily: "monospace", whiteSpace: "nowrap" }}>{fmt(sec)}</span>}
                  </div>
                ))}
              </div>

              {/* 오버레이 트랙 V2, V3... (V1 위에 배치, 드래그+트림 가능) */}
              {overlayTracks.map(tr => {
                const o = tr.overlay;
                const left = o.start * pxPerSec;
                const width = Math.max((o.end - o.start) * pxPerSec, 16);
                const sel = selectedOverlay === o.id;
                return (
                  <div key={tr.id} style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                    <div
                      onClick={e => { e.stopPropagation(); setSelectedOverlay(o.id); setPropTab("overlay"); setSelectedSubIdx(-1); setSelectedSegIdx(-1); }}
                      onMouseDown={e => {
                        if (e.target.dataset.handle) return;
                        e.stopPropagation(); e.preventDefault();
                        setSelectedOverlay(o.id);
                        const sx = e.clientX; const origStart = o.start; const dur = o.end - o.start;
                        const mv = ev => {
                          const dt = (ev.clientX - sx) / pxPerSec;
                          const ns = Math.max(0, Math.round((origStart + dt) * 10) / 10);
                          setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: ns, end: ns + dur } : x));
                        };
                        const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                        window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                      }}
                      style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: sel ? "rgba(236,72,153,0.4)" : "rgba(236,72,153,0.2)", border: `1.5px solid ${sel ? "#ec4899" : "rgba(236,72,153,0.4)"}`, borderRadius: 4, cursor: "grab", display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden", zIndex: sel ? 5 : 1 }}>
                      <span style={{ fontSize: 8, color: "#f9a8d4", fontWeight: 600, pointerEvents: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.type === "text" ? o.text : o.type === "logo" ? "Logo" : "Img"}</span>
                      {/* 좌측 트림 */}
                      <div data-handle="left" style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: sel ? "#ec4899" : "transparent", borderRadius: "4px 0 0 4px", opacity: 0.7 }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = o.start;
                          const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx)/pxPerSec)*10)/10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, start: Math.min(ns, o.end - 0.5) } : x)); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }} />
                      {/* 우측 트림 */}
                      <div data-handle="right" style={{ position: "absolute", right: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: sel ? "#ec4899" : "transparent", borderRadius: "0 4px 4px 0", opacity: 0.7 }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = o.end;
                          const mv = ev => { const ne = Math.max(o.start + 0.5, Math.round((oe + (ev.clientX - sx)/pxPerSec)*10)/10); setOverlays(prev => prev.map(x => x.id === o.id ? { ...x, end: ne } : x)); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }} />
                    </div>
                  </div>
                );
              })}

              {/* V1 비디오 (세그먼트별 블록 + 트림 핸들) */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {videoSegs.map((seg, si) => {
                  // 이전 세그먼트까지의 누적 시간 = 타임라인상 위치
                  let accLeft = 0;
                  for (let j = 0; j < si; j++) accLeft += (videoSegs[j].end - videoSegs[j].start);
                  const segLen = seg.end - seg.start;
                  const left = accLeft * pxPerSec;
                  const width = segLen * pxPerSec;
                  const isSel = selectedSegIdx === si;
                  return (
                    <div key={si} onClick={e => { e.stopPropagation(); setSelectedSegIdx(si); setSelectedTrack("V1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                      style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: isSel ? "linear-gradient(90deg,#4a9eff55,#4a9eff40)" : "linear-gradient(90deg,#4a9eff30,#4a9eff20)", border: `1.5px solid ${isSel ? "#4a9eff" : "#4a9eff50"}`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 6px", overflow: "hidden", cursor: "pointer" }}>
                      <span style={{ fontSize: 8, color: "#4a9eff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(seg.start)}~{fmt(seg.end)}</span>
                      {/* 좌측 트림 */}
                      <div style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: isSel ? "#4a9eff" : "transparent", borderRadius: "4px 0 0 4px", opacity: 0.6 }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const os = seg.start;
                          const mv = ev => { const ns = Math.max(0, Math.round((os + (ev.clientX - sx)/pxPerSec)*10)/10); setVideoSegs(prev => { const n=[...prev]; n[si]={...n[si], start: Math.min(ns, seg.end-0.5)}; return n; }); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }} />
                      {/* 우측 트림 */}
                      <div style={{ position: "absolute", right: 0, top: 0, width: 5, height: "100%", cursor: "ew-resize", background: isSel ? "#4a9eff" : "transparent", borderRadius: "0 4px 4px 0", opacity: 0.6 }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx = e.clientX; const oe = seg.end;
                          const mv = ev => { const ne = Math.max(seg.start+0.5, Math.round((oe + (ev.clientX - sx)/pxPerSec)*10)/10); setVideoSegs(prev => { const n=[...prev]; n[si]={...n[si], end: ne}; return n; }); };
                          const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                          window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                        }} />
                    </div>
                  );
                })}
              </div>

              {/* A1 오디오 (클릭 선택) */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                <div onClick={e => { e.stopPropagation(); setSelectedTrack("A1"); setSelectedSubIdx(-1); setSelectedOverlay(null); }}
                  style={{ position: "absolute", left: 0, top: 3, width: clipDuration * pxPerSec, height: TRACK_H - 6, background: selectedTrack === "A1" ? "linear-gradient(90deg,#4ade8045,#4ade8030)" : "linear-gradient(90deg,#4ade8025,#4ade8015)", border: `1.5px solid ${selectedTrack === "A1" ? "#4ade80" : "#4ade8040"}`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", overflow: "hidden", cursor: "pointer" }}>
                  <svg width="100%" height="100%" viewBox="0 0 200 20" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
                    {Array.from({ length: 80 }, (_, i) => <rect key={i} x={i*2.5} y={10-(3+Math.abs(Math.sin(i*0.4))*12)/2} width={1.5} height={3+Math.abs(Math.sin(i*0.4))*12} fill="#4ade80" rx={0.5} />)}
                  </svg>
                </div>
              </div>

              {/* S1 자막 (절대→상대 시간 변환) */}
              <div style={{ height: TRACK_H, position: "relative", borderBottom: "1px solid #1a1a25" }}>
                {(curClip.subtitles || []).map((s, i) => {
                  const relStart = Math.max(0, s.start - clipStart);
                  const relEnd = Math.max(relStart + 0.5, (s.end || s.start + 3) - clipStart);
                  const left = relStart * pxPerSec;
                  const width = Math.max((relEnd - relStart) * pxPerSec, 16);
                  const color = subColors[i % subColors.length];
                  const sel = selectedSubIdx === i;
                  return (
                    <div key={i} onClick={e => { e.stopPropagation(); setSelectedSubIdx(i); setSelectedSegIdx(-1); setSelectedOverlay(null); setPlayhead(relStart); }}
                      onMouseDown={e => {
                        if (e.target.style.cursor === "ew-resize") return;
                        e.stopPropagation(); e.preventDefault();
                        setSelectedSubIdx(i);
                        const sx = e.clientX; const origStart = s.start; const origEnd = s.end || s.start + 3; const dur = origEnd - origStart;
                        const mv = ev => {
                          const dt = (ev.clientX - sx) / pxPerSec;
                          const ns = Math.max(clipStart, Math.round((origStart + dt) * 10) / 10);
                          const subs = [...(curClip.subtitles || [])];
                          subs[i] = { ...subs[i], start: ns, end: ns + dur };
                          updateClip("subtitles", subs);
                        };
                        const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
                        window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
                      }}
                      style={{ position: "absolute", left, top: 3, width, height: TRACK_H - 6, background: sel ? `${color}50` : `${color}25`, border: `1.5px solid ${sel ? color : `${color}50`}`, borderRadius: 4, cursor: "grab", display: "flex", alignItems: "center", padding: "0 4px", overflow: "hidden", zIndex: sel ? 5 : 1 }}>
                      <span style={{ fontSize: 8, color: "#ddd", fontWeight: sel ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{s.text || `#${i+1}`}</span>
                      <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const os=s.start;
                          const mv=ev=>{const ns=Math.max(0,Math.round((os+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],start:Math.min(ns,(s.end||s.start+3)-0.5)};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }} />
                      <div style={{ position: "absolute", right: 0, top: 0, width: 4, height: "100%", cursor: "ew-resize" }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); const sx=e.clientX; const oe=s.end||s.start+3;
                          const mv=ev=>{const ne=Math.max(s.start+0.5,Math.round((oe+(ev.clientX-sx)/pxPerSec)*10)/10);const subs=[...(curClip.subtitles||[])];subs[i]={...subs[i],end:ne};updateClip("subtitles",subs);};
                          const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                          window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                        }} />
                    </div>
                  );
                })}
              </div>

              {/* 범위 선택 하이라이트 */}
              {rangeSelecting && Math.abs(rangeSelecting.endPh - rangeSelecting.startPh) > 0.1 && (
                <div style={{ position: "absolute", left: Math.min(rangeSelecting.startPh, rangeSelecting.endPh) * pxPerSec, top: 0, width: Math.abs(rangeSelecting.endPh - rangeSelecting.startPh) * pxPerSec, height: "100%", background: "rgba(124,106,255,0.15)", border: "1px solid rgba(124,106,255,0.4)", zIndex: 18, pointerEvents: "none", borderRadius: 2 }} />
              )}

              {/* 재생 헤드 */}
              <div style={{ position: "absolute", left: playhead * pxPerSec, top: 0, width: 2, height: "100%", background: "#ff3b3b", zIndex: 20, pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: -1, left: -5, width: 12, height: 10, background: "#ff3b3b", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{c.title || c.hook || c.subtitle_text || `Short ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color: muted }}>{r?.type === "done" ? "완료" : r?.type === "error" ? "실패" : "생성 중..."}</div>
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
                  {editClips[previewIdx]?.subtitle_text && <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{editClips[previewIdx].subtitle_text}</div>}
                </div>
              </div>

              {/* 다운로드 */}
              <div style={{ marginTop: 20, textAlign: "center", width: "100%", maxWidth: 480 }}>
                <a href={`${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}`}
                  download={doneResults.find(r => r.index === previewIdx)?.filename || doneResults[0]?.filename}
                  style={{ display: "block", padding: "14px 24px", borderRadius: 14, background: `linear-gradient(135deg,${acc},#8b5cf6)`, color: "#fff", fontSize: 15, fontWeight: 800, textDecoration: "none", textAlign: "center", boxShadow: `0 4px 20px ${acc}40` }}>
                  다운로드
                </a>
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

              {/* 공유 & 연계 */}
              <div style={{ marginTop: 16, width: "100%", maxWidth: 480 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, textAlign: "center" }}>다른 기능과 연계</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                  <button onClick={() => linkTo("blog_write", previewIdx)}
                    style={{ padding: "12px", borderRadius: 12, border: `1px solid ${bdr}`, background: card, color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>&#x1F4DD;</span> 블로그 글쓰기
                  </button>
                  <button onClick={() => linkTo("content_create", previewIdx)}
                    style={{ padding: "12px", borderRadius: 12, border: `1px solid ${bdr}`, background: card, color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>&#x1F3A8;</span> 카드뉴스 제작
                  </button>
                  <button onClick={() => linkTo("sns_post", previewIdx)}
                    style={{ padding: "12px", borderRadius: 12, border: `1px solid ${bdr}`, background: card, color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>&#x1F4F1;</span> SNS 발행
                  </button>
                  <button onClick={() => {
                    const url = `${API}/outputs/${fileId}/${doneResults.find(r => r.index === previewIdx)?.filename}`;
                    if (navigator.share) navigator.share({ title: editClips[previewIdx]?.title || "쇼츠 영상", url }).catch(() => {});
                    else { navigator.clipboard.writeText(url).then(() => alert("링크가 복사되었습니다!")); }
                  }}
                    style={{ padding: "12px", borderRadius: 12, border: `1px solid ${bdr}`, background: card, color: text, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>&#x1F517;</span> 공유하기
                  </button>
                </div>
              </div>

              {isComplete && (
                <button onClick={() => { setStep("upload"); setFileId(null); setSegments([]); setResults([]); setError(""); }}
                  style={{ marginTop: 16, padding: "10px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                  새로운 영상 만들기
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

              <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 8 }}>영상을 만들고 있어요</div>
              <div style={{ fontSize: 14, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                AI가 영상을 분석하고 편집 중입니다<br/>
                페이지를 이동해도 백그라운드에서 계속 생성됩니다
              </div>

              {/* 진행률 바 */}
              <div style={{ background: "rgba(128,128,128,0.15)", borderRadius: 10, height: 8, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", borderRadius: 10, background: `linear-gradient(90deg,${acc},#8b5cf6)`, width: `${total > 0 ? (completed / total) * 100 : 0}%`, transition: "width 0.5s ease" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: acc }}>{completed} / {total}개 완료</span>
                <span style={{ fontSize: 12, color: muted }}>예상 {Math.max(1, (total - completed) * 2)}~{Math.max(2, (total - completed) * 4)}분 남음</span>
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
                        <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>{isDone ? "완료" : isErr ? "실패" : isCurrent ? "생성 중..." : "대기"}</span>
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
