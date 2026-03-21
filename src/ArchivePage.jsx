import { useState, useEffect, useRef } from "react";
import { supabase, uploadFileToStorage, deleteFileFromStorage } from "./storage";

const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_KEY || "";

/* ─── 카테고리별 Pixabay 검색어 매핑 ── */
const PIXABAY_QUERY = {
  graphic:  { type: "video", q: "motion+background" },
  filmed:   { type: "video", q: "cinematic" },
  music:    { type: "video", q: "" }, // 음악은 미지원
  image:    { type: "photo", q: "background+texture" },
  pdf:      { type: "photo", q: "" },
  other:    { type: "photo", q: "abstract" },
  all:      { type: "video", q: "background" },
};

async function fetchPixabay(cat = "all", page = 1) {
  if (!PIXABAY_KEY) return [];
  const cfg = PIXABAY_QUERY[cat] || PIXABAY_QUERY.all;
  if (!cfg.q) return [];
  const isVideo = cfg.type === "video";
  const base = isVideo
    ? "https://pixabay.com/api/videos/"
    : "https://pixabay.com/api/";
  const url = `${base}?key=${PIXABAY_KEY}&q=${cfg.q}&per_page=20&page=${page}&safesearch=true`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.hits || []).map(h => ({
      key:         `pbay_${h.id}`,
      id:          `pbay_${h.id}`,
      title:       (h.tags || "Pixabay").split(",")[0].trim(),
      description: h.tags || "",
      category:    cat === "all" ? (isVideo ? "graphic" : "image") : cat,
      fileType:    isVideo ? "video" : "image",
      fileUrl:     isVideo ? (h.videos?.medium?.url || h.videos?.small?.url || "") : (h.largeImageURL || h.webformatURL || ""),
      thumbnail:   isVideo ? (h.videos?.tiny?.thumbnail || h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg` : "") : (h.previewURL || h.webformatURL || ""),
      fileSize:    0,
      storagePath: "",
      isFree:      true,
      source:      "pixabay",
      sourceUrl:   h.pageURL || "https://pixabay.com",
      pixabayUser: h.user || "",
      created_at:  new Date().toISOString(),
    }));
  } catch { return []; }
}

/* ═══════════════════════════════════════════════════════════
   Supabase 자료실 헬퍼
═══════════════════════════════════════════════════════════ */
async function fetchFiles() {
  const { data } = await supabase.from("archive_files").select("*").order("created_at", { ascending: false });
  return (data || []).map(v => ({ ...v, key: v.id, source: "upload" }));
}
async function addFile(data) {
  const { error } = await supabase.from("archive_files").insert({ ...data, created_at: new Date().toISOString() });
  if (error) throw new Error(error.message || "DB 저장 실패");
}
async function deleteFileRecord(key) {
  await supabase.from("archive_files").delete().eq("id", key);
}
async function updateFileRecord(key, data) {
  await supabase.from("archive_files").update(data).eq("id", key);
}

/* ─── 파일 타입 감지 ─────────────────────────────────────── */
function detectFileType(file) {
  if (!file) return "other";
  const mime = file.type || "";
  const name = (file.name || "").toLowerCase();
  if (mime.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/.test(name)) return "video";
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "other";
}
function detectTypeFromUrl(url) {
  if (!url) return "other";
  const u = url.toLowerCase();
  if (/\.(mp4|mov|avi|webm|mkv)/.test(u)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp|svg)/.test(u)) return "image";
  if (/\.pdf/.test(u)) return "pdf";
  if (extractYtId(url)) return "video";
  if (u.includes("drive.google.com")) return "video";
  return "other";
}

const FILE_TYPE_INFO = {
  video:   { icon: "🎬", label: "영상",    color: "#ef4444" },
  graphic: { icon: "🎬", label: "그래픽영상", color: "#ef4444" },
  filmed:  { icon: "📹", label: "촬영영상", color: "#f97316" },
  music:   { icon: "🎵", label: "음악",    color: "#8b5cf6" },
  image:   { icon: "🖼",  label: "이미지",  color: "#10b981" },
  pdf:     { icon: "📄", label: "PDF",    color: "#f59e0b" },
  other:   { icon: "📦", label: "파일",   color: "#6366f1" },
};

/* ─── 카테고리 ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",     label: "전체",    icon: "📂" },
  { id: "graphic", label: "그래픽영상", icon: "🎬" },
  { id: "filmed",  label: "촬영영상", icon: "📹" },
  { id: "music",   label: "음악",    icon: "🎵" },
  { id: "image",   label: "이미지",  icon: "🖼"  },
  { id: "pdf",     label: "PDF",    icon: "📄" },
  { id: "other",   label: "기타",    icon: "📦" },
];

/* 공지 배너 - 전체 카테고리에 표시 */
const VIDEO_NOTICE = "이 자료들은 직접 제작한 자료입니다. 상업적으로 사용하셔도 전혀 문제가 없습니다. 😊";

/* ─── 유틸 ──────────────────────────────────────────────── */
function extractYtId(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? m[1] : null;
}
function getDriveFileId(url) {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}
function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

/* ═══════════════════════════════════════════════════════════
   파일 뷰어 (모달)
═══════════════════════════════════════════════════════════ */
function FileViewer({ item, onClose }) {
  const { fileUrl, fileType, title } = item;
  const ytId    = extractYtId(fileUrl);
  const driveId = getDriveFileId(fileUrl);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "90vw", maxWidth: 900, position: "relative" }}>
        <button onClick={onClose} style={{
          position: "absolute", top: -40, right: 0, background: "none",
          border: "none", color: "#fff", fontSize: 24, cursor: "pointer",
        }}>✕</button>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>{title}</div>

        {fileType === "video" && (
          ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
              style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 12 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen />
          ) : driveId ? (
            <iframe src={`https://drive.google.com/file/d/${driveId}/preview`}
              style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 12 }}
              allow="autoplay" allowFullScreen />
          ) : (
            <video src={fileUrl} controls autoPlay
              style={{ width: "100%", borderRadius: 12, maxHeight: "75vh" }} />
          )
        )}
        {fileType === "image" && (
          <img src={fileUrl} alt={title}
            style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }} />
        )}
        {fileType === "pdf" && (
          <iframe src={fileUrl} title={title}
            style={{ width: "100%", height: "75vh", border: "none", borderRadius: 12, background: "#fff" }} />
        )}
        {fileType === "other" && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
            <div style={{ color: "#fff", fontSize: 16, marginBottom: 20 }}>{title}</div>
            <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
              style={{ padding: "12px 32px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              ⬇️ 다운로드
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   파일 카드 (인라인 재생 + 다운로드)
═══════════════════════════════════════════════════════════ */
function FileCard({ item, isDark, bdr, onDelete, isAdmin, onEdit }) {
  const [hovered,  setHovered]  = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!item.fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(item.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.title || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.fileUrl, "_blank");
    }
    setDownloading(false);
  };
  const typeInfo = FILE_TYPE_INFO[item.fileType] || FILE_TYPE_INFO.other;
  const ytId     = extractYtId(item.fileUrl);
  const driveId  = getDriveFileId(item.fileUrl);
  const thumb    = item.thumbnail
    || (ytId    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`                  : null)
    || (driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w640-h360-c`  : null);

  const text   = isDark ? "#fff"                   : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  /* 인라인 플레이어 src */
  const playerSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`
    : driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: cardBg,
        border: "1px solid " + (hovered ? "rgba(99,102,241,0.4)" : bdr),
        borderRadius: 14, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        transform: !playing && hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 10px 32px rgba(99,102,241,0.2)" : "none",
      }}
    >
      {/* ── 영상/미디어 영역 ── */}
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>

          {playing ? (
            /* 인라인 플레이어 */
            <>
              {playerSrc ? (
                <iframe src={playerSrc}
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation" />
              ) : (
                <video src={item.fileUrl} controls autoPlay
                  onEnded={() => setPlaying(false)}
                  style={{ width: "100%", height: "100%", display: "block", background: "#000" }} />
              )}
              {/* 닫기 버튼 */}
              <button onClick={() => setPlaying(false)} style={{
                position: "absolute", top: 8, right: 8, zIndex: 10,
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(0,0,0,0.7)", border: "none",
                color: "#fff", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
            </>
          ) : item.fileType === "image" ? (
            /* 이미지 미리보기 */
            <img src={item.fileUrl} alt={item.title}
              onClick={() => window.open(item.fileUrl, "_blank")}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in",
                transition: "transform 0.3s", transform: hovered ? "scale(1.04)" : "scale(1)" }} />
          ) : (
            /* 썸네일 + 재생 버튼 */
            <div onClick={() => item.fileType === "video" ? setPlaying(true) : window.open(item.fileUrl, "_blank")}
              style={{ position: "absolute", inset: 0, cursor: "pointer" }}>
              {thumb
                ? <img src={thumb} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hovered ? "scale(1.04)" : "scale(1)" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", fontSize: 48 }}>{typeInfo.icon}</div>
              }
              {/* 오버레이 */}
              <div style={{ position: "absolute", inset: 0, background: hovered ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.15)",
                transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: hovered ? "#fff" : "rgba(255,255,255,0.85)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, paddingLeft: item.fileType === "video" ? 4 : 0,
                  transform: hovered ? "scale(1.12)" : "scale(1)", transition: "all 0.2s",
                  boxShadow: hovered ? "0 6px 24px rgba(99,102,241,0.5)" : "0 2px 10px rgba(0,0,0,0.3)",
                }}>
                  {item.fileType === "video" ? "▶" : item.fileType === "pdf" ? "📄" : "🔍"}
                </div>
              </div>
            </div>
          )}

          {/* 타입 뱃지 */}
          {!playing && (
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#fff", zIndex: 2 }}>
              {typeInfo.icon} {typeInfo.label}
            </div>
          )}
          {/* 파일 크기 */}
          {item.fileSize > 0 && !playing && (
            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "3px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)", zIndex: 2 }}>
              {formatBytes(item.fileSize)}
            </div>
          )}
          {/* 관리자 버튼 */}
          {isAdmin && hovered && !playing && (
            <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 5, zIndex: 5 }}>
              <button onClick={e => { e.stopPropagation(); onEdit(item); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.92)", color: "#6366f1", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️</button>
              <button onClick={e => { e.stopPropagation(); onDelete(item.key, item.storagePath); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.92)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑</button>
            </div>
          )}
        </div>
      </div>

      {/* ── 카드 하단 ── */}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, background: cardBg }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: text, lineHeight: 1.4,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.5,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
            {item.description}
          </div>
        )}
        {/* 다운로드 버튼 */}
        <button onClick={handleDownload}
          disabled={downloading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            cursor: downloading ? "wait" : "pointer",
            padding: "8px 0", borderRadius: 8, marginTop: 2,
            border: "1px solid " + bdr, background: "transparent",
            color: isDark ? "#a5b4fc" : "#6366f1",
            fontSize: 12, fontWeight: 700, textDecoration: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.07)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {downloading ? "⏳ 다운로드 중..." : "⬇️ 다운로드"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   파일 리스트 행 (리스트 뷰)
═══════════════════════════════════════════════════════════ */
function FileListRow({ item, isDark, bdr, text, muted, onDelete, isAdmin, onEdit }) {
  const [downloading, setDownloading] = useState(false);
  const typeInfo = FILE_TYPE_INFO[item.fileType] || FILE_TYPE_INFO.other;
  const ytId = extractYtId(item.fileUrl);
  const thumb = item.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!item.fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(item.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = item.title || "download";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { window.open(item.fileUrl, "_blank"); }
    setDownloading(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 10,
      border: `1px solid ${bdr}`, background: cardBg,
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
      {/* 썸네일 */}
      <div style={{ width: 72, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 22 }}>{typeInfo.icon}</span>}
      </div>
      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: (typeInfo.color || "#6366f1") + "22", color: typeInfo.color || "#6366f1", fontWeight: 700 }}>{typeInfo.label}</span>
          {item.fileSize > 0 && <span style={{ fontSize: 11, color: muted }}>{formatBytes(item.fileSize)}</span>}
          {item.description && <span style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{item.description}</span>}
        </div>
      </div>
      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={handleDownload} disabled={downloading} style={{
          padding: "6px 14px", borderRadius: 7, border: `1px solid ${bdr}`,
          background: "transparent", color: isDark ? "#a5b4fc" : "#6366f1",
          fontSize: 12, fontWeight: 700, cursor: downloading ? "wait" : "pointer",
        }}>{downloading ? "⏳" : "⬇️ 다운로드"}</button>
        {isAdmin && <>
          <button onClick={e => { e.stopPropagation(); onEdit(item); }} style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>✏️</button>
          <button onClick={e => { e.stopPropagation(); onDelete(item.key, item.storagePath); }} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}>🗑</button>
        </>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   업로드 폼
═══════════════════════════════════════════════════════════ */
function UploadForm({ isDark, bdr, onSaved, editItem, onCancel }) {
  const [mode,      setMode]      = useState("file");
  const [form,      setForm]      = useState({
    title:       editItem?.title       || "",
    description: editItem?.description || "",
    category:    editItem?.category    || "graphic",
    thumbnail:   editItem?.thumbnail   || "",
    fileUrl:     editItem?.fileUrl     || "",
    fileType:    editItem?.fileType    || "graphic",
    fileSize:    editItem?.fileSize    || 0,
    storagePath: editItem?.storagePath || "",
    isFree:      editItem?.isFree      !== false,
  });
  const [file,      setFile]      = useState(null);
  const [thumbFile, setThumbFile] = useState(null);   // 썸네일 이미지 파일
  const [thumbPreview, setThumbPreview] = useState(editItem?.thumbnail || "");
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef  = useRef();
  const thumbRef = useRef();

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const cardBg  = isDark ? "rgba(255,255,255,0.03)" : "#f8f8fb";
  const inp = { padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const ft = detectFileType(f);
    setForm(p => ({ ...p, fileType: ft, category: ft, fileSize: f.size, title: p.title || f.name.replace(/\.[^/.]+$/, "") }));
  };

  const handleUrlChange = (url) => {
    const ft = detectTypeFromUrl(url);
    setForm(p => ({ ...p, fileUrl: url, fileType: ft, category: ft }));
  };

  const save = async () => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    setSaving(true);
    try {
      let finalForm = { ...form };
      // 썸네일 이미지 파일 업로드
      const safeName = (n) => n.replace(/[^a-zA-Z0-9._-]/g, "_");
      if (thumbFile) {
        setUploading(true);
        const tPath = `archive/thumbs/${Date.now()}_${safeName(thumbFile.name)}`;
        const tUrl  = await uploadFileToStorage(thumbFile, tPath, () => {});
        finalForm.thumbnail = tUrl;
        setUploading(false);
      }
      if (mode === "file" && file) {
        setUploading(true);
        const path = `archive/${Date.now()}_${safeName(file.name)}`;
        const url  = await uploadFileToStorage(file, path, setProgress);
        finalForm.fileUrl     = url;
        finalForm.storagePath = path;
        finalForm.fileType    = detectFileType(file);
        setUploading(false);
      } else if (mode === "url") {
        if (!form.fileUrl.trim()) { alert("URL을 입력해주세요."); setSaving(false); return; }
        const ytId    = extractYtId(form.fileUrl);
        const driveId = getDriveFileId(form.fileUrl);
        if (ytId    && !finalForm.thumbnail) finalForm.thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        if (driveId && !finalForm.thumbnail) finalForm.thumbnail = `https://drive.google.com/thumbnail?id=${driveId}&sz=w640-h360-c`;
      }
      if (editItem?.key) { await updateFileRecord(editItem.key, finalForm); }
      else               { await addFile(finalForm); }
      onSaved();
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false); setUploading(false);
  };

  const typeInfo = FILE_TYPE_INFO[form.fileType] || FILE_TYPE_INFO.other;

  return (
    <div style={{ maxWidth: 660, padding: "28px 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {editItem && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>←</button>}
        <h2 style={{ fontSize: 20, fontWeight: 900, color: text, margin: 0 }}>{editItem ? "✏️ 파일 수정" : "⬆️ 파일 등록"}</h2>
      </div>

      {/* 모드 선택 */}
      {!editItem && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["file","📁 파일 직접 업로드"],["url","🔗 URL로 등록"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "12px", borderRadius: 10,
              border: `2px solid ${mode === m ? "#6366f1" : bdr}`,
              background: mode === m ? "rgba(99,102,241,0.1)" : "transparent",
              color: mode === m ? "#a5b4fc" : muted,
              fontSize: 13, fontWeight: mode === m ? 800 : 500, cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 파일 드롭존 */}
        {mode === "file" && !editItem && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#6366f1" : bdr}`,
              borderRadius: 14, padding: "32px 20px", textAlign: "center",
              background: dragOver ? "rgba(99,102,241,0.08)" : cardBg,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <input ref={fileRef} type="file"
              accept="video/*,image/*,.pdf,application/pdf,.zip,.rar,.pptx,.xlsx,.docx,.hwp"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{typeInfo.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: muted }}>{formatBytes(file.size)} · {typeInfo.label}</div>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  style={{ marginTop: 10, padding: "5px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>파일 제거</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 40, marginBottom: 10 }}>☁️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 6 }}>파일을 드래그하거나 클릭해서 선택</div>
                <div style={{ fontSize: 12, color: muted, lineHeight: 1.8 }}>
                  영상(mp4, mov), 이미지(jpg, png), PDF<br/>ZIP, PPT, Excel, 한글 등 모든 파일
                </div>
              </div>
            )}
          </div>
        )}

        {/* 업로드 진행률 */}
        {uploading && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: text, marginBottom: 8, fontWeight: 700 }}>
              <span>⬆️ 업로드 중...</span>
              <span style={{ color: "#a5b4fc" }}>{progress}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, width: progress + "%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* URL 입력 */}
        {(mode === "url" || editItem) && (
          <div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>
              파일 URL * <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 6 }}>(유튜브, 구글 드라이브, 직접 링크)</span>
            </div>
            <input value={form.fileUrl} onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://youtu.be/... 또는 https://drive.google.com/..." style={inp} />
            {form.fileType && form.fileUrl && (
              <div style={{ marginTop: 5, fontSize: 11, color: FILE_TYPE_INFO[form.fileType]?.color, fontWeight: 600 }}>
                ✅ {FILE_TYPE_INFO[form.fileType]?.label} 인식됨
              </div>
            )}
          </div>
        )}

        {/* 제목 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>제목 *</div>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="파일 제목" style={inp} />
        </div>

        {/* 설명 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>설명 <span style={{ fontWeight: 400 }}>(선택)</span></div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="파일에 대한 설명" rows={2} style={{ ...inp, resize: "vertical" }} />
        </div>

        {/* 카테고리 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>카테고리</div>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        {/* 썸네일 이미지 업로드 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>
            🖼 썸네일 이미지 <span style={{ fontWeight: 400 }}>(선택 · jpg, png 권장)</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* 업로드 버튼 */}
            <button type="button" onClick={() => thumbRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10,
              border: `1px dashed ${thumbPreview ? "#6366f1" : bdr}`,
              background: thumbPreview ? "rgba(99,102,241,0.08)" : inputBg,
              color: thumbPreview ? "#a5b4fc" : muted,
              fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              {thumbPreview ? "🔄 변경" : "📁 이미지 선택"}
            </button>
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files[0];
                if (!f) return;
                setThumbFile(f);
                const reader = new FileReader();
                reader.onload = ev => setThumbPreview(ev.target.result);
                reader.readAsDataURL(f);
              }} />
            {/* 미리보기 */}
            {thumbPreview ? (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={thumbPreview} alt="thumb"
                  style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, border: `1px solid ${bdr}`, display: "block" }} />
                <button onClick={() => { setThumbFile(null); setThumbPreview(""); setForm(p => ({ ...p, thumbnail: "" })); }}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#ef4444", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ) : (
              <div style={{ width: 120, height: 68, borderRadius: 8, border: `1px dashed ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: muted }}>
                미리보기
              </div>
            )}
          </div>
        </div>

        {/* 공개 설정 */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, background: cardBg, border: `1px solid ${bdr}` }}>
          <input type="checkbox" checked={form.isFree} onChange={e => setForm(p => ({ ...p, isFree: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
          <div>
            <div style={{ fontSize: 13, color: text, fontWeight: 700 }}>무료 공개</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>체크 해제 시 👑 멤버 전용으로 표시됩니다</div>
          </div>
        </label>

        {/* 저장 버튼 */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {editItem && <button onClick={onCancel} style={{ padding: "11px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>취소</button>}
          <button onClick={save} disabled={saving || uploading} style={{
            padding: "11px 28px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", fontSize: 14, fontWeight: 800, minWidth: 120,
            cursor: (saving || uploading) ? "not-allowed" : "pointer",
            opacity: (saving || uploading) ? 0.7 : 1,
          }}>
            {uploading ? `업로드 중 ${progress}%` : saving ? "저장 중..." : editItem ? "✅ 수정 완료" : "✅ 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   사이드바
═══════════════════════════════════════════════════════════ */
function ArchiveSidebar({ menu, setMenu, cat, setCat, theme }) {
  const isDark      = theme === "dark";
  const sideBg      = isDark ? "rgba(0,0,0,0.45)"       : "#f0f0f8";
  const sideBdr     = isDark ? "rgba(255,255,255,0.07)"  : "#e5e3f5";
  const menuLabel   = isDark ? "rgba(255,255,255,0.2)"   : "rgba(99,102,241,0.4)";
  const itemText    = isDark ? "rgba(255,255,255,0.5)"   : "#6c757d";
  const itemActive  = isDark ? "#a5b4fc"                 : "#4f46e5";
  const itemActiveBg= isDark ? "rgba(99,102,241,0.22)"  : "rgba(99,102,241,0.1)";
  const brandText   = isDark ? "#fff"                    : "#1a1a2e";
  const [open, setOpen] = useState(true);

  const Item = ({ id, label, icon, isCat, catId }) => {
    const active = isCat ? (menu === "files" && cat === catId) : menu === id;
    return (
      <button onClick={() => isCat ? (setMenu("files"), setCat(catId)) : setMenu(id)} style={{
        width: "100%", padding: isCat ? "8px 12px 8px 28px" : "10px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: isCat ? 13 : 14, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: 7, marginBottom: 2,
      }}>
        <span>{icon}</span>{label}
      </button>
    );
  };

  return (
    <div style={{ width: 210, flexShrink: 0, background: sideBg, borderRight: `1px solid ${sideBdr}`, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${sideBdr}` }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: brandText }}>SNS메이킷</div>
        <div style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(99,102,241,0.5)", marginTop: 1 }}>자료실</div>
      </div>
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home" label="홈" icon="🏠" />
        <button onClick={() => setOpen(p => !p)} style={{
          width: "100%", padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
          background: menu === "files" ? itemActiveBg : "transparent",
          color: menu === "files" ? itemActive : brandText,
          fontSize: 14, fontWeight: 800, marginBottom: 2, borderLeft: "3px solid transparent",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>📂 자료실</span>
          <span style={{ fontSize: 9, opacity: 0.5, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </button>
        {open && CATEGORIES.map(c => (
          <Item key={c.id} icon={c.icon} label={c.label} isCat catId={c.id} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   메인 콘텐츠
═══════════════════════════════════════════════════════════ */
function ArchiveContent({ menu, setMenu, cat, setCat, user, theme }) {
  const isDark  = theme === "dark";
  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const bdr     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const isAdmin = user?.role === "admin";

  const [files,      setFiles]      = useState([]);
  const [pbFiles,    setPbFiles]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pbLoading,  setPbLoading]  = useState(false);
  const [search,     setSearch]     = useState("");
  const [editItem,   setEditItem]   = useState(null);
  const [viewMode,   setViewMode]   = useState("grid-lg");
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "upload" | "pixabay"

  const load = async () => {
    setLoading(true);
    try { setFiles(await fetchFiles()); } catch(e) { setFiles([]); }
    setLoading(false);
  };

  const loadPixabay = async (catId) => {
    if (!PIXABAY_KEY) return;
    setPbLoading(true);
    try { setPbFiles(await fetchPixabay(catId)); } catch { setPbFiles([]); }
    setPbLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadPixabay(cat); }, [cat]);

  const handleDelete = async (key, storagePath) => {
    if (!window.confirm("이 파일을 삭제할까요?")) return;
    await deleteFileRecord(key);
    if (storagePath) await deleteFileFromStorage(storagePath);
    load();
  };

  const allFiles = [
    ...files,
    ...(PIXABAY_KEY ? pbFiles : []),
  ];

  const filtered = allFiles.filter(v => {
    const vCat = v.category || v.fileType || "";
    const matchCat = cat === "all"
      || vCat === cat
      || (cat === "graphic" && (vCat === "video" || vCat === "synth"));
    const matchSearch = !search.trim()
      || v.title.toLowerCase().includes(search.toLowerCase())
      || (v.description || "").toLowerCase().includes(search.toLowerCase());
    const matchSource = sourceFilter === "all"
      || v.source === sourceFilter
      || (sourceFilter === "upload" && !v.source);
    return matchCat && matchSearch && matchSource;
  });

  /* 업로드 / 수정 */
  if (menu === "upload" || editItem) {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
        <UploadForm isDark={isDark} bdr={bdr} editItem={editItem}
          onSaved={() => { setEditItem(null); setMenu("files"); load(); }}
          onCancel={() => { setEditItem(null); setMenu("files"); }} />
      </div>
    );
  }

  /* 홈 */
  if (menu === "home") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: text, marginBottom: 6 }}>📂 자료실</div>
          <div style={{ fontSize: 13, color: muted }}>총 {files.length}개 파일</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 32 }}>
          {CATEGORIES.filter(c => c.id !== "all").map(c => (
            <div key={c.id} onClick={() => { setMenu("files"); setCat(c.id); }}
              style={{ borderRadius: 12, padding: "18px 14px", cursor: "pointer", textAlign: "center",
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", border: `1px solid ${bdr}`, transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: muted }}>{files.filter(v => {
                const vCat = v.category || v.fileType || "";
                return c.id === "graphic"
                  ? (vCat === "graphic" || vCat === "video" || vCat === "synth")
                  : vCat === c.id;
              }).length}개</div>
            </div>
          ))}
        </div>
        {files.length > 0 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 16 }}>🆕 최신 업로드</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
              {files.slice(0, 4).map(v => (
                <FileCard key={v.key} item={v} isDark={isDark} bdr={bdr}
                  onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 파일 목록 — BoardPage 스타일 */
  const catInfo = CATEGORIES.find(c => c.id === cat);
  return (
    <div style={{ overflowY: "auto", padding: "0 0 60px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        {/* 상단 툴바 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: text }}>
            {catInfo?.icon} {catInfo?.label || "전체"} 자료실
            <span style={{ fontSize: 12, fontWeight: 400, color: muted, marginLeft: 8 }}>총 {filtered.length}개</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* 검색 */}
            <div style={{ display: "flex", border: `1px solid ${bdr}`, borderRadius: 9, overflow: "hidden", background: isDark ? "rgba(255,255,255,0.04)" : "#fff" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일 검색..."
                style={{ padding: "7px 12px", border: "none", background: "transparent", color: text, fontSize: 13, outline: "none", width: 130 }} />
              {search && <button onClick={() => setSearch("")} style={{ padding: "7px 8px", border: "none", background: "transparent", color: muted, cursor: "pointer" }}>✕</button>}
            </div>
            {/* 뷰 모드 */}
            <div style={{ display: "flex", border: `1px solid ${bdr}`, borderRadius: 8, overflow: "hidden" }}>
              {[{ id:"list",icon:"☰" },{ id:"grid-sm",icon:"⊟" },{ id:"grid-lg",icon:"⊞" }].map(m => (
                <button key={m.id} onClick={() => setViewMode(m.id)} title={m.id} style={{
                  padding: "7px 10px", border: "none", cursor: "pointer", fontSize: 14,
                  background: viewMode === m.id ? (isDark?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.12)") : "transparent",
                  color: viewMode === m.id ? "#a5b4fc" : muted,
                }}>{m.icon}</button>
              ))}
            </div>
            {isAdmin && (
              <button onClick={() => setMenu("upload")} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬆️ 업로드</button>
            )}
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
            <div style={{ fontSize: 32, marginBottom: 10, display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</div>
            <div style={{ fontSize: 13 }}>불러오는 중...</div>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 6 }}>
              {search ? `"${search}" 검색 결과가 없어요` : "아직 파일이 없어요"}
            </div>
            {isAdmin && !search && (
              <button onClick={() => setMenu("upload")} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬆️ 첫 파일 업로드하기</button>
            )}
          </div>
        )}

        {/* 리스트 뷰 — BoardPage 테이블 스타일 */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div style={{ border: `1px solid ${bdr}`, borderRadius: 10, overflow: "hidden" }}>
            {/* 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "44px 56px 1fr 80px 70px 110px", padding: "8px 12px",
              background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", borderBottom: `1px solid ${bdr}` }}>
              {["번호","","제목","분류","크기","다운로드"].map(h => (
                <span key={h} style={{ fontSize: 11, color: muted, fontWeight: 700, textAlign: h==="번호"?"center":"left" }}>{h}</span>
              ))}
            </div>
            {filtered.map((v, idx) => {
              const ti = FILE_TYPE_INFO[v.fileType] || FILE_TYPE_INFO.other;
              const ytId = extractYtId(v.fileUrl);
              const thumb = v.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
              return (
                <div key={v.key} style={{ display: "grid", gridTemplateColumns: "44px 56px 1fr 80px 70px 110px",
                  padding: "8px 12px", borderBottom: `1px solid ${bdr}`, alignItems: "center",
                  transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ textAlign: "center", fontSize: 12, color: muted }}>{filtered.length - idx}</span>
                  <div style={{ width: 44, height: 32, borderRadius: 5, overflow: "hidden", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                           : <span style={{ fontSize: 16 }}>{ti.icon}</span>}
                  </div>
                  <div style={{ paddingLeft: 8, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                    {v.description && <div style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.description}</div>}
                  </div>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: (ti.color||"#6366f1")+"22", color: ti.color||"#6366f1", fontWeight: 700, whiteSpace: "nowrap" }}>{ti.label}</span>
                  <span style={{ fontSize: 11, color: muted }}>{v.fileSize ? formatBytes(v.fileSize) : "-"}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <DownloadBtn item={v} isDark={isDark} bdr={bdr} muted={muted} compact />
                    {isAdmin && <>
                      <button onClick={() => setEditItem(v)} style={{ padding: "4px 7px", borderRadius: 5, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => handleDelete(v.key, v.storagePath)} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>🗑</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 그리드 뷰 */}
        {!loading && filtered.length > 0 && viewMode !== "list" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            {filtered.map(v => (
              <div key={v.key} style={{ width: viewMode === "grid-sm" ? 180 : 240, flexShrink: 0 }}>
                <FileCard item={v} isDark={isDark} bdr={bdr} onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ArchivePage (메인 export)
═══════════════════════════════════════════════════════════ */
export default function ArchivePage({ user, C, theme }) {
  const [cat, setCat] = useState("all");
  const [menu, setMenu] = useState("files");
  const isDark = theme === "dark";

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      background: isDark ? "linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)" : "#f4f4f8",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif",
    }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}button{font-family:inherit}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}
      </style>
      {/* 카테고리 탭 — BoardPage와 동일 스타일 */}
      <div style={{ borderBottom: `1px solid ${isDark?"rgba(255,255,255,0.07)":"#e5e3f5"}`, background: isDark?"rgba(0,0,0,0.2)":"rgba(255,255,255,0.7)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => { setCat(c.id); setMenu("files"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "13px 18px", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: cat === c.id ? 700 : 500, whiteSpace: "nowrap", background: "transparent",
                color: cat === c.id ? (c.color || "#6366f1") : (isDark ? "rgba(255,255,255,0.45)" : "#888"),
                borderBottom: cat === c.id ? `2px solid ${c.color || "#6366f1"}` : "2px solid transparent",
              }}>
              {c.icon} {c.label}
              <span style={{ fontSize: 11, opacity: 0.65 }}>({0})</span>
            </button>
          ))}
        </div>
      </div>
      <ArchiveContent menu={menu} setMenu={setMenu} cat={cat} setCat={setCat} user={user} theme={theme} />
    </div>
  );
}
