import { useState, useEffect, useRef } from "react";
import { db, uploadFileToStorage, deleteFileFromStorage } from "./storage";
import { ref, get, set, push, remove, update } from "firebase/database";

/* ═══════════════════════════════════════════════════════════
   Firebase 자료실 헬퍼
═══════════════════════════════════════════════════════════ */
const DB_PATH = "archive/files";

async function fetchFiles() {
  const snap = await get(ref(db, DB_PATH));
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}
async function addFile(data) {
  const newRef = push(ref(db, DB_PATH));
  await set(newRef, { ...data, createdAt: Date.now() });
}
async function deleteFileRecord(key) {
  await remove(ref(db, `${DB_PATH}/${key}`));
}
async function updateFileRecord(key, data) {
  await update(ref(db, `${DB_PATH}/${key}`), data);
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
  video: { icon: "🎬", label: "영상",   color: "#ef4444" },
  image: { icon: "🖼",  label: "이미지", color: "#10b981" },
  pdf:   { icon: "📄", label: "PDF",    color: "#f59e0b" },
  other: { icon: "📦", label: "파일",   color: "#6366f1" },
};

/* ─── 카테고리 ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",   label: "전체",   icon: "📂" },
  { id: "video", label: "영상",   icon: "🎬" },
  { id: "image", label: "이미지", icon: "🖼"  },
  { id: "pdf",   label: "PDF",   icon: "📄" },
  { id: "other", label: "기타",   icon: "📦" },
];

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
   파일 카드
═══════════════════════════════════════════════════════════ */
function FileCard({ item, isDark, bdr, onDelete, isAdmin, onEdit, onView }) {
  const [hovered, setHovered] = useState(false);
  const typeInfo = FILE_TYPE_INFO[item.fileType] || FILE_TYPE_INFO.other;
  const ytId     = extractYtId(item.fileUrl);
  const driveId  = getDriveFileId(item.fileUrl);
  const thumb    = item.thumbnail
    || (ytId    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`                       : null)
    || (driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w640-h360-c`        : null);

  const text   = isDark ? "#fff"                   : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(item)}
      style={{
        background: cardBg,
        border: "1px solid " + (hovered ? "rgba(99,102,241,0.4)" : bdr),
        borderRadius: 14, overflow: "hidden",
        display: "flex", flexDirection: "column", cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 10px 32px rgba(99,102,241,0.2)" : "none",
      }}
    >
      {/* 썸네일 */}
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#111", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {thumb
            ? <img src={thumb} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hovered ? "scale(1.04)" : "scale(1)" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", fontSize: 48 }}>{typeInfo.icon}</div>
          }
          {/* 오버레이 */}
          <div style={{ position: "absolute", inset: 0, background: hovered ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)", transition: "background 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: hovered ? "#fff" : "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transform: hovered ? "scale(1.1)" : "scale(1)", transition: "all 0.2s", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              {item.fileType === "video" ? "▶" : item.fileType === "image" ? "🔍" : item.fileType === "pdf" ? "📄" : "⬇️"}
            </div>
          </div>
          {/* 타입 뱃지 */}
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
            {typeInfo.icon} {typeInfo.label}
          </div>
          {/* 파일 크기 */}
          {item.fileSize > 0 && (
            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.55)", borderRadius: 5, padding: "3px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
              {formatBytes(item.fileSize)}
            </div>
          )}
          {/* 관리자 버튼 */}
          {isAdmin && hovered && (
            <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 5 }}>
              <button onClick={e => { e.stopPropagation(); onEdit(item); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.92)", color: "#6366f1", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏️</button>
              <button onClick={e => { e.stopPropagation(); onDelete(item.key, item.storagePath); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.92)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑</button>
            </div>
          )}
        </div>
      </div>
      {/* 카드 하단 */}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 5, background: cardBg }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: text, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.title}</div>
        {item.description && (
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{item.description}</div>
        )}
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
    category:    editItem?.category    || "video",
    thumbnail:   editItem?.thumbnail   || "",
    fileUrl:     editItem?.fileUrl     || "",
    fileType:    editItem?.fileType    || "video",
    fileSize:    editItem?.fileSize    || 0,
    storagePath: editItem?.storagePath || "",
    isFree:      editItem?.isFree      !== false,
  });
  const [file,      setFile]      = useState(null);
  const [progress,  setProgress]  = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef();

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
      if (mode === "file" && file) {
        setUploading(true);
        const path = `archive/${Date.now()}_${file.name}`;
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

        {/* 썸네일 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>썸네일 URL <span style={{ fontWeight: 400 }}>(선택)</span></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={form.thumbnail} onChange={e => setForm(p => ({ ...p, thumbnail: e.target.value }))} placeholder="https://... (비워두면 자동)" style={{ ...inp }} />
            {form.thumbnail && <img src={form.thumbnail} alt="thumb" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: `1px solid ${bdr}` }} />}
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

  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [editItem, setEditItem] = useState(null);
  const [viewing,  setViewing]  = useState(null);

  const load = async () => {
    setLoading(true);
    try { setFiles(await fetchFiles()); } catch(e) { setFiles([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (key, storagePath) => {
    if (!window.confirm("이 파일을 삭제할까요?")) return;
    await deleteFileRecord(key);
    if (storagePath) await deleteFileFromStorage(storagePath);
    load();
  };

  const filtered = files.filter(v => {
    const matchCat    = cat === "all" || v.category === cat || v.fileType === cat;
    const matchSearch = !search.trim() || v.title.toLowerCase().includes(search.toLowerCase()) || (v.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
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
              <div style={{ fontSize: 11, color: muted }}>{files.filter(v => v.category === c.id || v.fileType === c.id).length}개</div>
            </div>
          ))}
        </div>
        {files.length > 0 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 16 }}>🆕 최신 업로드</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
              {files.slice(0, 4).map(v => (
                <FileCard key={v.key} item={v} isDark={isDark} bdr={bdr}
                  onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} onView={setViewing} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 파일 목록 */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      {viewing && <FileViewer item={viewing} onClose={() => setViewing(null)} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 3 }}>
            {CATEGORIES.find(c => c.id === cat)?.icon} {CATEGORIES.find(c => c.id === cat)?.label || "전체"} 자료실
          </div>
          <div style={{ fontSize: 12, color: muted }}>{filtered.length}개 파일</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", border: `1px solid ${bdr}`, borderRadius: 9, overflow: "hidden", background: isDark ? "rgba(255,255,255,0.04)" : "#fff" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일 검색..."
              style={{ padding: "8px 14px", border: "none", background: "transparent", color: text, fontSize: 13, outline: "none", width: 150 }} />
            {search && <button onClick={() => setSearch("")} style={{ padding: "8px 10px", border: "none", background: "transparent", color: muted, cursor: "pointer" }}>✕</button>}
          </div>
          {isAdmin && (
            <button onClick={() => setMenu("upload")} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬆️ 업로드</button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{
            padding: "6px 14px", borderRadius: 20, border: `1px solid ${cat === c.id ? "#6366f1" : bdr}`,
            background: cat === c.id ? "rgba(99,102,241,0.15)" : "transparent",
            color: cat === c.id ? "#a5b4fc" : muted, fontSize: 12, fontWeight: cat === c.id ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>{c.icon} {c.label}</button>
        ))}
      </div>
      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</div>
          <div style={{ fontSize: 14 }}>불러오는 중...</div>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>
            {search ? `"${search}" 검색 결과가 없어요` : "아직 파일이 없어요"}
          </div>
          {isAdmin && !search && (
            <button onClick={() => setMenu("upload")} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬆️ 첫 파일 업로드하기</button>
          )}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {filtered.map(v => (
            <FileCard key={v.key} item={v} isDark={isDark} bdr={bdr}
              onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} onView={setViewing} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ArchivePage (메인 export)
═══════════════════════════════════════════════════════════ */
export default function ArchivePage({ user, C, theme }) {
  const [menu,     setMenu]     = useState("home");
  const [cat,      setCat]      = useState("all");
  const [sideOpen, setSideOpen] = useState(false);

  const isDark = theme === "dark";
  const topBdr = isDark ? "rgba(255,255,255,0.07)"  : "#e5e3f5";
  const topBg  = isDark ? "rgba(0,0,0,0.25)"        : "rgba(255,255,255,0.9)";
  const topClr = isDark ? "rgba(255,255,255,0.35)"  : "#aaa";

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: isDark ? "linear-gradient(160deg,#0f0c29,#1a1740,#0f0c29)" : "#f4f4f8",
      color: isDark ? "#fff" : "#1a1a2e",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.3);border-radius:4px}
        button{font-family:inherit}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        .arch-sidebar-desktop{display:flex}
        .arch-sidebar-mobile{display:none}
        @media(max-width:768px){
          .arch-sidebar-desktop{display:none!important}
          .arch-sidebar-mobile{display:flex!important}
        }
      `}</style>
      <div className="arch-sidebar-desktop">
        <ArchiveSidebar menu={menu} setMenu={setMenu} cat={cat} setCat={setCat} theme={theme} user={user} />
      </div>
      {sideOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setSideOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 240, animation: "slideIn 0.2s ease", zIndex: 51 }}>
            <ArchiveSidebar menu={menu} setMenu={m => { setMenu(m); setSideOpen(false); }}
              cat={cat} setCat={c => { setCat(c); setSideOpen(false); }} theme={theme} user={user} />
          </div>
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid " + topBdr, background: topBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="arch-sidebar-mobile" onClick={() => setSideOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: isDark ? "#fff" : "#333", padding: "4px 6px", display: "none" }}>☰</button>
            <span style={{ fontSize: 12, color: topClr, fontWeight: 600 }}>📂 자료실</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <ArchiveContent menu={menu} setMenu={setMenu} cat={cat} setCat={setCat} user={user} theme={theme} />
        </div>
      </div>
    </div>
  );
}
