import { useState, useEffect, useRef } from "react";
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

/* VideoPlayer – 유튜브 / 드라이브 / 직접영상 자체 재생 */
function getDirectDownloadUrl(url) {
  if (!url) return url;
  // 구글 드라이브 → 직접 다운로드 URL로 변환
  const m = url.match(/[/]file[/]d[/]([a-zA-Z0-9_-]+)/);
  if (m) return "https://drive.google.com/uc?export=download&id=" + m[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return "https://drive.google.com/uc?export=download&id=" + m2[1];
  return url; // 드라이브 아니면 원본 URL 그대로
}

function getDriveFileId(url) {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

function VideoPlayer({ url, autoPlay }) {
  const ytId    = extractYtId(url);
  const driveId = getDriveFileId(url);
  const s = { width:"100%", aspectRatio:"16/9", border:"none", display:"block", background:"#000" };

  if (ytId) return (
    <iframe
      src={"https://www.youtube.com/embed/"+ytId+"?autoplay="+(autoPlay?1:0)+"&rel=0"}
      style={s} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen />
  );

  if (driveId) {
    const src = "https://drive.google.com/file/d/"+driveId+"/preview";
    return (
      <div style={{ position:"relative", background:"#000" }}>
        <iframe src={src} style={s} allow="autoplay" allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.55))", padding:"20px 12px 8px", pointerEvents:"none" }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Google Drive 플레이어</span>
        </div>
      </div>
    );
  }

  return <video src={url} controls autoPlay={autoPlay} style={{ ...s }} />;
}

/* ─── 카테고리 ─────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",     label: "전체",    icon: "📂" },
  { id: "synth",   label: "합성영상", icon: "🎬" },
];

/* ─── 유틸: 유튜브 썸네일 추출 ───────────────────────── */
function extractYtId(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\\w-]+)/);
  return m ? m[1] : null;
}
function ytThumb(url) {
  const id = extractYtId(url);
  // 2.jpg = 영상 중간지점 썸네일, maxresdefault = 고화질 16:9
  // maxresdefault가 없는 경우 대비해 img 태그에서 오류시 2.jpg로 폴백
  return id ? "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg" : null;
}
function ytThumbMid(id) {
  // 영상 중간 지점 (2.jpg = ~50% 지점, 소형 120x90)
  return "https://img.youtube.com/vi/" + id + "/2.jpg";
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


      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   영상 카드
═══════════════════════════════════════════════════════════ */
function VideoCard({ v, isDark, bdr, onDelete, isAdmin, onEdit }) {
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  const thumb   = v.thumbnail || ytThumb(v.videoUrl) || null;
  const catInfo = CATEGORIES.find(c => c.id === v.category) || CATEGORIES[CATEGORIES.length - 1];
  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const ytId    = extractYtId(v.videoUrl);
  const driveId = getDriveFileId(v.videoUrl);

  // 플레이어 src (클릭 시 바로 세팅)
  const playerSrc = ytId
    ? "https://www.youtube.com/embed/" + ytId + "?autoplay=1&rel=0"
    : driveId
      ? "https://drive.google.com/file/d/" + driveId + "/preview"
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
        transform: hovered && !playing ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 10px 32px rgba(99,102,241,0.2)" : "none",
      }}
    >
      {/* ── 영상 영역 (2배 크기: paddingTop 112.5% = 16:9 × 2) ── */}
      <div style={{ position:"relative", width:"100%", paddingTop:"56.25%", background:"#000", borderRadius:"14px 14px 0 0", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0 }}>

          {playing ? (
            /* ── 플레이어 ── */
            <div style={{ position:"absolute", inset:0, zIndex:2 }}>
              {playerSrc ? (
                <iframe
                  src={playerSrc}
                  style={{ width:"100%", height:"100%", border:"none", display:"block" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                />
              ) : (
                /* 직접 mp4 */
                <video
                  src={v.videoUrl} controls autoPlay
                  onEnded={() => setPlaying(false)}
                  style={{ width:"100%", height:"100%", display:"block", background:"#000" }}
                />
              )}
              {/* 닫기 */}
              <button onClick={() => setPlaying(false)} style={{
                position:"absolute", top:10, right:10, zIndex:10,
                width:32, height:32, borderRadius:"50%",
                background:"rgba(0,0,0,0.7)", border:"none",
                color:"#fff", fontSize:14, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                backdropFilter:"blur(4px)",
              }}>✕</button>
            </div>
          ) : (
            /* ── 썸네일 (클릭 → 바로 플레이어) ── */
            <div
              onClick={() => setPlaying(true)}
              style={{ position:"absolute", inset:0, cursor:"pointer" }}
            >
              {thumb
                ? <img
                    src={thumb}
                    alt={v.title}
                    onError={e => {
                      // maxresdefault 없으면 중간지점(2.jpg) → hqdefault 순으로 폴백
                      const ytId2 = extractYtId(v.videoUrl);
                      if (ytId2 && e.target.src.includes("maxresdefault")) {
                        e.target.src = "https://img.youtube.com/vi/" + ytId2 + "/hqdefault.jpg";
                      }
                    }}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.3s", transform: hovered ? "scale(1.04)" : "scale(1)" }} />
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", fontSize:52 }}>🎬</div>
              }
              {/* 오버레이 */}
              <div style={{ position:"absolute", inset:0, background: hovered ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.15)", transition:"background 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{
                  width:64, height:64, borderRadius:"50%",
                  background: hovered ? "#fff" : "rgba(255,255,255,0.85)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, paddingLeft:5,
                  transform: hovered ? "scale(1.1)" : "scale(1)",
                  transition:"all 0.2s",
                  boxShadow: hovered ? "0 6px 24px rgba(99,102,241,0.55)" : "0 2px 10px rgba(0,0,0,0.3)",
                }}>▶</div>
              </div>
              {/* 카테고리 뱃지 */}
              <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", borderRadius:6, padding:"4px 10px", fontSize:12, fontWeight:700, color:"#fff" }}>
                {catInfo.icon} {catInfo.label}
              </div>
              {v.isFree === false && (
                <div style={{ position:"absolute", top:10, right:10, background:"linear-gradient(135deg,#f59e0b,#fbbf24)", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:800, color:"#fff" }}>
                  👑 멤버 전용
                </div>
              )}
              {/* 관리자 버튼 */}
              {isAdmin && hovered && (
                <div style={{ position:"absolute", bottom:10, right:10, display:"flex", gap:5 }}>
                  <button onClick={e => { e.stopPropagation(); onEdit(v); }}
                    style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"rgba(255,255,255,0.92)", color:"#6366f1", fontSize:12, fontWeight:700, cursor:"pointer" }}>✏️</button>
                  <button onClick={e => { e.stopPropagation(); onDelete(v.key); }}
                    style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"rgba(239,68,68,0.92)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🗑</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── 카드 하단 ── */}
      <div style={{ padding:"12px 14px 14px", display:"flex", flexDirection:"column", gap:6, background:cardBg }}>
        <div style={{ fontSize:14, fontWeight:800, color:text, lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
          {v.title}
        </div>
        {v.description && (
          <div style={{ fontSize:12, color:muted, lineHeight:1.6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical" }}>
            {v.description}
          </div>
        )}
        {v.downloadUrl && (
          <a href={getDirectDownloadUrl(v.downloadUrl)} download target="_blank" rel="noopener noreferrer"
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:5,
              padding:"8px 0", borderRadius:8,
              border:"1px solid " + bdr, background:"transparent",
              color: isDark ? "#a5b4fc" : "#6366f1",
              fontSize:12, fontWeight:700, textDecoration:"none",
            }}>
            ⬇️ 다운로드
          </a>
        )}
      </div>
    </div>
  );
}

function UploadForm({ isDark, bdr, onSaved, editItem, onCancel }) {
  const [saving, setSaving] = useState(false);

  const text    = isDark ? "#fff"                   : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.4)"  : "#888";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const cardBg  = isDark ? "rgba(255,255,255,0.03)" : "#f8f8fb";
  const accent  = "#6366f1";

  const inp = {
    padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`,
    background: inputBg, color: text, fontSize: 13, outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };

  /* 구글 드라이브 공유 링크 → 직접 재생 가능한 URL로 변환 */
  const convertDriveUrl = (url) => {
    if (!url) return url;
    // https://drive.google.com/file/d/FILE_ID/view → embed URL
    const m = url.match(/\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    return url;
  };

  /* 구글 드라이브 썸네일 자동 추출 */
  const getDriveThumb = (url) => {
    if (!url) return null;
    const m = url.match(/\/file\/d\/([^/]+)/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w640-h360-c";
    return null;
  };

  const isDriveUrl = (url) => url && url.includes("drive.google.com");

  const save = async () => {
    if (!form.title.trim())    { alert("제목을 입력해주세요."); return; }
    if (!form.videoUrl.trim()) { alert("영상 URL을 입력해주세요."); return; }
    setSaving(true);
    try {
      const finalForm = { ...form };
      // 구글 드라이브 링크면 embed URL로 변환
      if (isDriveUrl(form.videoUrl)) {
        finalForm.videoUrl = convertDriveUrl(form.videoUrl);
        // 썸네일 없으면 자동 설정
        if (!finalForm.thumbnail) {
          finalForm.thumbnail = getDriveThumb(form.videoUrl) || "";
        }
      }
      if (editItem?.key) {
        await updateVideo(editItem.key, finalForm);
      } else {
        await addVideo(finalForm);
      }
      onSaved();
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const videoType = extractYtId(form.videoUrl) ? "youtube"
    : isDriveUrl(form.videoUrl) ? "drive" : form.videoUrl ? "direct" : null;

  const typeColors = { youtube: "#ef4444", drive: "#4285f4", direct: "#10b981" };
  const typeLabels = {
    youtube: "✅ 유튜브 영상 인식됨 · 썸네일 자동 적용",
    drive:   "✅ 구글 드라이브 링크 인식됨 · 썸네일 자동 적용",
    direct:  "✅ 직접 링크 입력됨",
  };

  return (
    <div style={{ maxWidth: 640, padding: "28px 0 60px" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {editItem && (
          <button onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>←</button>
        )}
        <h2 style={{ fontSize: 20, fontWeight: 900, color: text, margin: 0 }}>
          {editItem ? "✏️ 영상 수정" : "⬆️ 영상 등록"}
        </h2>
      </div>

      {/* 업로드 가이드 배너 */}
      {!editItem && (
        <div style={{
          background: isDark ? "rgba(66,133,244,0.08)" : "rgba(66,133,244,0.05)",
          border: "1px solid rgba(66,133,244,0.2)",
          borderRadius: 12, padding: "14px 16px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#4285f4", marginBottom: 8 }}>
            📁 구글 드라이브 업로드 방법
          </div>
          <ol style={{ fontSize: 12, color: muted, lineHeight: 2.1, margin: 0, paddingLeft: 18 }}>
            <li>구글 드라이브에 영상 파일 업로드</li>
            <li>파일 우클릭 → <b style={{ color: text }}>공유</b> → <b style={{ color: text }}>링크 복사</b></li>
            <li>일반 액세스를 <b style={{ color: "#4285f4" }}>링크가 있는 모든 사용자</b>로 변경</li>
            <li>복사한 링크를 아래 <b style={{ color: text }}>영상 URL</b>에 붙여넣기</li>
          </ol>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 제목 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>제목 *</div>
          <input value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="영상 제목을 입력하세요" style={inp} />
        </div>

        {/* 영상 URL */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>
            영상 URL *
            <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 6 }}>
              (유튜브 링크 또는 구글 드라이브 공유 링크)
            </span>
          </div>
          <input value={form.videoUrl}
            onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
            placeholder="https://drive.google.com/file/d/... 또는 https://youtu.be/..."
            style={inp} />
          {videoType && (
            <div style={{ marginTop: 6, fontSize: 11, color: typeColors[videoType], fontWeight: 600 }}>
              {typeLabels[videoType]}
            </div>
          )}
        </div>

        {/* 다운로드 URL */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>
            다운로드 URL
            <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 6 }}>(선택 · 구글 드라이브 공유 링크 그대로 붙여넣기)</span>
          </div>
          <input value={form.downloadUrl}
            onChange={e => setForm(p => ({ ...p, downloadUrl: e.target.value }))}
            placeholder="https://drive.google.com/file/d/... (비워두면 다운로드 버튼 미표시)"
            style={inp} />
        </div>

        {/* 썸네일 URL */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>
            썸네일 URL
            <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 6 }}>(선택 · 유튜브·드라이브는 자동 적용)</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input value={form.thumbnail}
              onChange={e => setForm(p => ({ ...p, thumbnail: e.target.value }))}
              placeholder="https://... (비워두면 자동 썸네일)" style={{ ...inp }} />
            {form.thumbnail && (
              <img src={form.thumbnail} alt="thumb"
                style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: `1px solid ${bdr}` }} />
            )}
          </div>
        </div>

        {/* 카테고리 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>카테고리</div>
          <select value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>

        {/* 설명 */}
        <div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 5 }}>설명 <span style={{ fontWeight: 400 }}>(선택)</span></div>
          <textarea value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="영상에 대한 설명을 입력하세요" rows={3}
            style={{ ...inp, resize: "vertical" }} />
        </div>

        {/* 공개 설정 */}
        <label style={{
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          padding: "12px 14px", borderRadius: 10, background: cardBg, border: `1px solid ${bdr}`,
        }}>
          <input type="checkbox" checked={form.isFree}
            onChange={e => setForm(p => ({ ...p, isFree: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: accent }} />
          <div>
            <div style={{ fontSize: 13, color: text, fontWeight: 700 }}>무료 공개</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>체크 해제 시 👑 멤버 전용으로 표시됩니다</div>
          </div>
        </label>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {editItem && (
            <button onClick={onCancel}
              style={{ padding: "11px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 14, cursor: "pointer" }}>
              취소
            </button>
          )}
          <button onClick={save} disabled={saving}
            style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, minWidth: 120 }}>
            {saving ? "저장 중..." : editItem ? "✅ 수정 완료" : "✅ 등록하기"}
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
