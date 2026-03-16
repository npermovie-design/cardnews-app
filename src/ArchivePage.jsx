import { useState, useEffect } from "react";
import { db } from "./storage";
import { ref, get, set, push, remove, update } from "firebase/database";

/* ═══════════════════════════════════════════════════════════
   Firebase 영상 자료실 헬퍼
═══════════════════════════════════════════════════════════ */
const DB_PATH = "archive/videos";

async function fetchVideos() {
  const snap = await get(ref(db, DB_PATH));
  if (!snap.exists()) return [];
  const obj = snap.val();
  return Object.entries(obj)
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function addVideo(data) {
  const newRef = push(ref(db, DB_PATH));
  await set(newRef, { ...data, createdAt: Date.now() });
}

async function deleteVideo(key) {
  await remove(ref(db, `${DB_PATH}/${key}`));
}

async function updateVideo(key, data) {
  await update(ref(db, `${DB_PATH}/${key}`), data);
}

/* ─── 카테고리 ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",     label: "전체",          icon: "📂" },
  { id: "tutorial",label: "강의/튜토리얼", icon: "🎓" },
  { id: "sns",     label: "SNS 활용",      icon: "📱" },
  { id: "ai",      label: "AI 도구",       icon: "🤖" },
  { id: "marketing",label: "마케팅",       icon: "📣" },
  { id: "etc",     label: "기타",          icon: "📁" },
];

/* ─── 유틸: 유튜브 썸네일 추출 ───────────────────────── */
function extractYtId(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\\w-]+)/);
  return m ? m[1] : null;
}
function ytThumb(url) {
  const id = extractYtId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/* ═══════════════════════════════════════════════════════════
   사이드바
═══════════════════════════════════════════════════════════ */
function ArchiveSidebar({ menu, setMenu, cat, setCat, theme, user }) {
  const isDark   = theme === "dark";
  const sideBg   = isDark ? "rgba(0,0,0,0.45)"       : "#f0f0f8";
  const sideBdr  = isDark ? "rgba(255,255,255,0.07)"  : "#e5e3f5";
  const menuLabel= isDark ? "rgba(255,255,255,0.2)"   : "rgba(99,102,241,0.4)";
  const itemText = isDark ? "rgba(255,255,255,0.5)"   : "#6c757d";
  const itemActive     = isDark ? "#a5b4fc"           : "#4f46e5";
  const itemActiveBg   = isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.1)";
  const brandText= isDark ? "#fff"                    : "#1a1a2e";

  const Item = ({ id, label, icon, isCat, catId }) => {
    const active = isCat ? (menu === "video" && cat === catId) : menu === id;
    const handleClick = () => { if (isCat) { setMenu("video"); setCat(catId); } else setMenu(id); };
    return (
      <button onClick={handleClick} style={{
        width: "100%", padding: isCat ? "8px 12px 8px 28px" : "10px 12px",
        borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
        background: active ? itemActiveBg : "transparent",
        color: active ? itemActive : itemText,
        fontSize: isCat ? 13 : 14, fontWeight: active ? 700 : 400,
        borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
        display: "flex", alignItems: "center", gap: 7, marginBottom: 2,
      }}>
        <span style={{ fontSize: isCat ? 13 : 14 }}>{icon}</span>{label}
      </button>
    );
  };

  const [videoOpen, setVideoOpen] = useState(true);

  return (
    <div style={{
      width: 210, flexShrink: 0, background: sideBg,
      borderRight: `1px solid ${sideBdr}`,
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      {/* 브랜드 */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${sideBdr}` }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: brandText }}>SNS메이킷</div>
        <div style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(99,102,241,0.5)", marginTop: 1 }}>자료실</div>
      </div>

      {/* 메뉴 */}
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>MENU</div>
        <Item id="home"  label="홈"     icon="🏠" />

        {/* 영상자료실 그룹 */}
        <button onClick={() => setVideoOpen(p => !p)} style={{
          width: "100%", padding: "7px 10px", borderRadius: 8, border: "none",
          cursor: "pointer", textAlign: "left",
          background: menu === "video" ? itemActiveBg : "transparent",
          color: menu === "video" ? itemActive : brandText,
          fontSize: 14, fontWeight: 800, marginBottom: 2,
          borderLeft: "3px solid transparent",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>🎬 영상자료실</span>
          <span style={{ fontSize: 9, opacity: 0.5, display: "inline-block", transform: videoOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </button>
        {videoOpen && CATEGORIES.map(c => (
          <Item key={c.id} icon={c.icon} label={c.label} isCat catId={c.id} />
        ))}

        {/* 관리자만 업로드 */}
        {user?.role === "admin" && (
          <div style={{ borderTop: `1px solid ${sideBdr}`, marginTop: 8, paddingTop: 8 }}>
            <div style={{ fontSize: 9, color: menuLabel, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", marginBottom: 3 }}>ADMIN</div>
            <Item id="upload" label="영상 업로드" icon="⬆️" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   영상 카드
═══════════════════════════════════════════════════════════ */
function VideoCard({ v, isDark, bdr, onDelete, isAdmin, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const thumb = v.thumbnail || ytThumb(v.videoUrl) || null;
  const catInfo = CATEGORIES.find(c => c.id === v.category) || CATEGORIES[CATEGORIES.length - 1];
  const text  = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";

  return (
    <>
      {previewOpen && (
        <div onClick={() => setPreviewOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 800, borderRadius: 16, overflow: "hidden",
            background: "#000", boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
          }}>
            {extractYtId(v.videoUrl) ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYtId(v.videoUrl)}?autoplay=1`}
                style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
                allowFullScreen allow="autoplay"
              />
            ) : (
              <video src={v.videoUrl} controls autoPlay
                style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }} />
            )}
            <div style={{ padding: "16px 20px", background: isDark ? "#1a1730" : "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>{v.title}</div>
              {v.description && <div style={{ fontSize: 13, color: muted, lineHeight: 1.7 }}>{v.description}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                {v.downloadUrl && (
                  <a href={v.downloadUrl} download target="_blank" rel="noopener noreferrer"
                    style={{ padding: "9px 20px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                    ⬇️ 다운로드
                  </a>
                )}
                <button onClick={() => setPreviewOpen(false)}
                  style={{ padding: "9px 16px", borderRadius: 9, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer" }}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: cardBg, border: `1px solid ${bdr}`, borderRadius: 14,
          overflow: "hidden", display: "flex", flexDirection: "column",
          transition: "transform 0.15s, box-shadow 0.15s",
          transform: hovered ? "translateY(-3px)" : "none",
          boxShadow: hovered ? "0 8px 28px rgba(99,102,241,0.18)" : "none",
          cursor: "pointer",
        }}
      >
        {/* 썸네일 */}
        <div onClick={() => setPreviewOpen(true)} style={{ position: "relative", aspectRatio: "16/9", background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", overflow: "hidden" }}>
          {thumb ? (
            <img src={thumb} alt={v.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎬</div>
          )}
          {/* 재생 버튼 오버레이 */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: hovered ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.25)", transition: "background 0.15s",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, paddingLeft: 3,
              transform: hovered ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s",
            }}>▶</div>
          </div>
          {/* 카테고리 뱃지 */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
            borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            {catInfo.icon} {catInfo.label}
          </div>
          {v.isFree === false && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "linear-gradient(135deg,#f59e0b,#fbbf24)",
              borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800, color: "#fff",
            }}>👑 멤버 전용</div>
          )}
        </div>

        {/* 정보 */}
        <div style={{ padding: "14px 14px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 5, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {v.title}
          </div>
          {v.description && (
            <div style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {v.description}
            </div>
          )}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreviewOpen(true)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ▶ 미리보기
              </button>
              {v.downloadUrl && (
                <a href={v.downloadUrl} download target="_blank" rel="noopener noreferrer"
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: isDark ? "#a5b4fc" : "#6366f1", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  ⬇️ 다운로드
                </a>
              )}
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={e => { e.stopPropagation(); onEdit(v); }}
                  style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 11, cursor: "pointer" }}>수정</button>
                <button onClick={e => { e.stopPropagation(); onDelete(v.key); }}
                  style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>삭제</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   관리자 업로드 폼
═══════════════════════════════════════════════════════════ */
function UploadForm({ isDark, bdr, onSaved, editItem, onCancel }) {
  const [form, setForm] = useState({
    title: editItem?.title || "",
    description: editItem?.description || "",
    category: editItem?.category || "tutorial",
    videoUrl: editItem?.videoUrl || "",
    thumbnail: editItem?.thumbnail || "",
    downloadUrl: editItem?.downloadUrl || "",
    isFree: editItem?.isFree !== false,
  });
  const [saving, setSaving] = useState(false);
  const text  = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.4)" : "#888";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";

  const inp = { padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  const save = async () => {
    if (!form.title.trim() || !form.videoUrl.trim()) { alert("제목과 영상 URL은 필수입니다."); return; }
    setSaving(true);
    try {
      if (editItem?.key) {
        await updateVideo(editItem.key, form);
      } else {
        await addVideo(form);
      }
      onSaved();
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640, padding: "28px 0 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {editItem && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>←</button>}
        <h2 style={{ fontSize: 20, fontWeight: 900, color: text, margin: 0 }}>
          {editItem ? "영상 수정" : "⬆️ 영상 업로드"}
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>제목 *</div>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="영상 제목을 입력하세요" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>카테고리</div>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>영상 URL * (유튜브 or 직접 링크)</div>
          <input value={form.videoUrl} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=... 또는 직접 영상 URL" style={inp} />
          {extractYtId(form.videoUrl) && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#4ade80" }}>✅ 유튜브 영상 인식됨 · 썸네일 자동 적용</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>썸네일 URL (선택 · 유튜브는 자동)</div>
          <input value={form.thumbnail} onChange={e => setForm(p => ({ ...p, thumbnail: e.target.value }))}
            placeholder="https://... (빈칸이면 유튜브 자동 썸네일)" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>다운로드 URL (선택 · 구글드라이브 등)</div>
          <input value={form.downloadUrl} onChange={e => setForm(p => ({ ...p, downloadUrl: e.target.value }))}
            placeholder="https://drive.google.com/... 또는 파일 직접 링크" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>설명 (선택)</div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="영상에 대한 설명을 입력하세요" rows={3}
            style={{ ...inp, resize: "vertical" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={form.isFree} onChange={e => setForm(p => ({ ...p, isFree: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
          <span style={{ fontSize: 13, color: text, fontWeight: 600 }}>무료 공개 (체크 해제 시 멤버 전용 표시)</span>
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {editItem && <button onClick={onCancel} style={{ padding: "11px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>취소</button>}
          <button onClick={save} disabled={saving}
            style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "저장 중..." : editItem ? "✅ 수정 완료" : "⬆️ 업로드"}
          </button>
        </div>
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

  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    setLoading(true);
    const list = await fetchVideos();
    setVideos(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (key) => {
    if (!window.confirm("이 영상을 삭제할까요?")) return;
    await deleteVideo(key);
    load();
  };

  const filtered = videos.filter(v => {
    const matchCat  = cat === "all" || v.category === cat;
    const matchSearch = !search.trim() || v.title.toLowerCase().includes(search.toLowerCase()) || (v.description || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  /* 관리자 업로드 화면 */
  if (menu === "upload" || editItem) {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
        <UploadForm isDark={isDark} bdr={bdr}
          editItem={editItem}
          onCancel={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); if (menu === "upload") setMenu("video"); load(); }} />
      </div>
    );
  }

  /* 홈 화면 */
  if (menu === "home") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, marginBottom: 5, color: text }}>📂 자료실에 오신 걸 환영해요! 👋</div>
          <div style={{ fontSize: 13, color: muted }}>왼쪽 메뉴에서 원하는 카테고리를 선택하거나, 아래 바로가기를 눌러주세요</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
          {CATEGORIES.filter(c => c.id !== "all").map(c => (
            <div key={c.id} onClick={() => { setMenu("video"); setCat(c.id); }}
              style={{
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)",
                border: `1px solid ${bdr}`, borderRadius: 12, padding: "18px 14px",
                cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: muted }}>{videos.filter(v => v.category === c.id).length}개 영상</div>
            </div>
          ))}
        </div>

        {/* 최신 영상 미리보기 */}
        {videos.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 16 }}>🆕 최신 업로드</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {videos.slice(0, 4).map(v => (
                <VideoCard key={v.key} v={v} isDark={isDark} bdr={bdr}
                  onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 영상자료실 */
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 60px", background: isDark ? "transparent" : "#f4f4f8" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: text, letterSpacing: -0.5, marginBottom: 3 }}>
            {CATEGORIES.find(c => c.id === cat)?.icon} {CATEGORIES.find(c => c.id === cat)?.label || "전체"} 자료실
          </div>
          <div style={{ fontSize: 12, color: muted }}>{filtered.length}개 영상</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", border: `1px solid ${bdr}`, borderRadius: 9, overflow: "hidden", background: isDark ? "rgba(255,255,255,0.04)" : "#fff" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="영상 검색..."
              style={{ padding: "8px 14px", border: "none", background: "transparent", color: text, fontSize: 13, outline: "none", width: 180 }} />
            {search && <button onClick={() => setSearch("")} style={{ padding: "8px 10px", border: "none", background: "transparent", color: muted, cursor: "pointer" }}>✕</button>}
          </div>
          {isAdmin && (
            <button onClick={() => setMenu("upload")}
              style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + 업로드
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 필터 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: `1px solid ${cat === c.id ? "#6366f1" : bdr}`,
              background: cat === c.id ? "rgba(99,102,241,0.15)" : "transparent",
              color: cat === c.id ? "#a5b4fc" : muted, fontSize: 12, fontWeight: cat === c.id ? 700 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* 비어있음 */}
      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</div>
          <div style={{ fontSize: 14 }}>불러오는 중...</div>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>
            {search ? `"${search}" 검색 결과가 없어요` : "아직 업로드된 영상이 없어요"}
          </div>
          {isAdmin && !search && (
            <button onClick={() => setMenu("upload")}
              style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ⬆️ 첫 영상 업로드하기
            </button>
          )}
        </div>
      )}

      {/* 영상 그리드 */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {filtered.map(v => (
            <VideoCard key={v.key} v={v} isDark={isDark} bdr={bdr}
              onDelete={handleDelete} isAdmin={isAdmin} onEdit={setEditItem} />
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
  const [menu, setMenu] = useState("home");
  const [cat,  setCat]  = useState("all");
  const [sideOpen, setSideOpen] = useState(false);

  const isDark  = theme === "dark";
  const topBdr  = isDark ? "rgba(255,255,255,0.07)"  : "#e5e3f5";
  const topBg   = isDark ? "rgba(0,0,0,0.25)"        : "rgba(255,255,255,0.9)";
  const topClr  = isDark ? "rgba(255,255,255,0.35)"  : "#aaa";

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

      {/* 데스크톱 사이드바 */}
      <div className="arch-sidebar-desktop">
        <ArchiveSidebar menu={menu} setMenu={setMenu} cat={cat} setCat={setCat} theme={theme} user={user} />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {sideOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setSideOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 240, animation: "slideIn 0.2s ease", zIndex: 51 }}>
            <ArchiveSidebar menu={menu} setMenu={m => { setMenu(m); setSideOpen(false); }} cat={cat} setCat={c => { setCat(c); setSideOpen(false); }} theme={theme} user={user} />
          </div>
        </div>
      )}

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* 상단 바 */}
        <div style={{
          height: 44, flexShrink: 0, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 12px",
          borderBottom: "1px solid " + topBdr, background: topBg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="arch-sidebar-mobile" onClick={() => setSideOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: isDark ? "#fff" : "#333", padding: "4px 6px", display: "none" }}>
              ☰
            </button>
            <span style={{ fontSize: 12, color: topClr, fontWeight: 600 }}>📂 자료실</span>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <ArchiveContent menu={menu} setMenu={setMenu} cat={cat} setCat={setCat} user={user} theme={theme} />
        </div>
      </div>
    </div>
  );
}
