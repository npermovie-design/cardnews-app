import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./storage";

/* ══════════════════════════════════════════════════════════════
   SnsPublisher — SNS 다중 플랫폼 콘텐츠 발행
   Spread 스타일 UI: 콘텐츠 유형 선택 → 파일 업로드 → 정보 입력 → 플랫폼 선택 → 발행
   ══════════════════════════════════════════════════════════════ */

const CONTENT_TYPE_ICONS = {
  video: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="3" /><polygon points="10,8 17,12 10,16" /></svg>,
  image: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  text: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
};

const CONTENT_TYPES = [
  { id: "video", label: "영상" },
  { id: "image", label: "이미지" },
  { id: "text", label: "텍스트" },
];

const PLATFORMS = [
  { id: "youtube", label: "YouTube", color: "#FF0000", icon: "/icon-youtube.png", accepts: ["video"], fields: ["description", "tags", "visibility"] },
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: "/icon-instagram.webp", accepts: ["video", "image"], fields: ["description", "tags"] },
  { id: "threads", label: "Threads", color: "#000", icon: "/icon-threads.png", accepts: ["video", "image", "text"], fields: ["description"] },
  { id: "tiktok", label: "TikTok", color: "#010101", icon: null, svgIcon: true, accepts: ["video"], fields: ["description", "tags", "visibility"] },
];

function TikTokIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.54a8.27 8.27 0 0 0 4.76 1.5V6.69h-1z"/>
    </svg>
  );
}

function PlatformIcon({ platform, size = 24 }) {
  if (platform.svgIcon && platform.id === "tiktok") return <TikTokIcon size={size} />;
  if (platform.icon) return <img src={platform.icon} alt={platform.label} style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }} />;
  return null;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "공개" },
  { value: "unlisted", label: "미등록" },
  { value: "private", label: "비공개" },
];

// ── 토글 스위치 ──
function Toggle({ on, onChange, color = "#168EEA" }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
      background: on ? color : "rgba(0,0,0,0.15)", position: "relative", transition: "background 0.2s",
      flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: "#fff",
        position: "absolute", top: 3, left: on ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── 파일 드롭존 ──
function FileDropZone({ file, onFileSelect, onRemove, contentType, isDark }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const acc = "#168EEA";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";

  const accept = contentType === "video" ? "video/*" : contentType === "image" ? "image/*" : undefined;

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onFileSelect(f);
  }, [onFileSelect]);

  if (file) {
    const isVideo = file.type?.startsWith("video");
    const isImage = file.type?.startsWith("image");
    return (
      <div style={{
        padding: "16px 20px", borderRadius: 12,
        border: `1.5px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.04)" : "#fafafa",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {isImage && file._preview && (
          <img src={file._preview} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
        )}
        {isVideo && (
          <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="2"><polygon points="5 3 19 12 5 21" /></svg>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
          <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.4)" : "#999", marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
        </div>
        <button onClick={onRemove} style={{
          padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, fontWeight: 600,
        }}>삭제</button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        padding: "40px 20px", borderRadius: 12, cursor: "pointer",
        border: `2px dashed ${dragOver ? acc : bdr}`,
        background: dragOver ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : (isDark ? "rgba(255,255,255,0.02)" : "#fafafa"),
        textAlign: "center", transition: "all 0.2s",
      }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={isDark ? "rgba(255,255,255,0.3)" : "#ccc"} strokeWidth="1.5" style={{ marginBottom: 10 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.5)" : "#888" }}>
        파일을 드래그하거나 클릭하여 업로드
      </div>
      <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.3)" : "#bbb", marginTop: 4 }}>
        {contentType === "video" ? "MP4, MOV, AVI (최대 500MB)" : contentType === "image" ? "JPG, PNG, WEBP (최대 20MB)" : "파일 없이 텍스트만 발행"}
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (f.type?.startsWith("image")) {
              f._preview = URL.createObjectURL(f);
            }
            onFileSelect(f);
          }
        }} />
    </div>
  );
}

// ── 플랫폼 설정 카드 ──
function PlatformCard({ platform, enabled, onToggle, settings, onSettingsChange, isDark }) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";

  return (
    <div style={{
      borderRadius: 14, border: `1.5px solid ${enabled ? platform.color + "40" : bdr}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
      overflow: "hidden", transition: "border-color 0.2s",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: enabled ? `1px solid ${bdr}` : "none",
      }}>
        <PlatformIcon platform={platform} size={24} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: text }}>{platform.label}</span>
        <Toggle on={enabled} onChange={onToggle} color={platform.color} />
      </div>

      {/* 설정 영역 */}
      {enabled && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {platform.fields.includes("description") && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>플랫폼별 설명 (선택)</label>
              <textarea
                value={settings.description || ""}
                onChange={(e) => onSettingsChange({ ...settings, description: e.target.value })}
                placeholder="이 플랫폼에만 다른 설명을 넣고 싶다면 입력하세요"
                rows={2}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, resize: "vertical",
                  border: `1.5px solid ${bdr}`, background: inputBg, color: text,
                  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>
          )}
          {platform.fields.includes("tags") && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>해시태그</label>
              <input
                value={settings.tags || ""}
                onChange={(e) => onSettingsChange({ ...settings, tags: e.target.value })}
                placeholder="#마케팅 #콘텐츠"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${bdr}`, background: inputBg, color: text,
                  fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>
          )}
          {platform.fields.includes("visibility") && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>공개 상태</label>
              <select
                value={settings.visibility || "public"}
                onChange={(e) => onSettingsChange({ ...settings, visibility: e.target.value })}
                style={{
                  padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${bdr}`,
                  background: inputBg, color: text, fontSize: 13, outline: "none",
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {VISIBILITY_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 미리보기 패널 ──
function PreviewPanel({ contentType, file, title, description, enabledPlatforms, isDark }) {
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const [previewTab, setPreviewTab] = useState(null);
  const acc = "#168EEA";

  const tabs = enabledPlatforms.length > 0 ? enabledPlatforms : [];

  useEffect(() => {
    if (tabs.length > 0 && (!previewTab || !tabs.find(t => t.id === previewTab))) {
      setPreviewTab(tabs[0].id);
    }
    if (tabs.length === 0) setPreviewTab(null);
  }, [tabs.length]);

  if (tabs.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100%", color: muted, gap: 12, padding: 40,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <div style={{ fontSize: 13, textAlign: "center" }}>플랫폼을 선택하면<br />미리보기가 표시됩니다</div>
      </div>
    );
  }

  const currentPlatform = PLATFORMS.find(p => p.id === previewTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, padding: "0 0 12px", flexWrap: "wrap" }}>
        {tabs.map(p => (
          <button key={p.id} onClick={() => setPreviewTab(p.id)} style={{
            padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            background: previewTab === p.id ? "rgba(0,0,0,0.06)" : "transparent",
            color: previewTab === p.id ? acc : muted,
            fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}>
            <PlatformIcon platform={p} size={16} />
            {p.label}
          </button>
        ))}
      </div>

      {/* 미리보기 카드 */}
      <div style={{
        flex: 1, borderRadius: 12, border: `1px solid ${bdr}`,
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* 썸네일/미디어 */}
        {(contentType === "video" || contentType === "image") && (
          <div style={{
            aspectRatio: previewTab === "youtube" ? "16/9" : "1/1",
            maxHeight: 240, background: "#000", display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {file?._preview ? (
              <img src={file._preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : file && contentType === "video" ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21" />
              </svg>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>미디어 없음</div>
            )}
          </div>
        )}

        {/* 콘텐츠 정보 */}
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 6 }}>
            {title || "제목 없음"}
          </div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
            {description || "설명이 입력되지 않았습니다."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 발행 히스토리 ──
const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "완료", label: "성공" },
  { value: "실패", label: "실패" },
  { value: "발행 중", label: "발행 중" },
];

function PublishHistory({ history, isDark, onRefresh }) {
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDays, setFilterDays] = useState("all");

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const acc = "#168EEA";
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const chipActiveBg = isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)";

  // 필터 적용
  const filtered = history.filter(item => {
    if (filterPlatform !== "all" && !item.platforms?.includes(filterPlatform)) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterDays !== "all") {
      const days = parseInt(filterDays);
      const itemDate = new Date(item.date);
      if (isNaN(itemDate)) return true;
      if (Date.now() - itemDate.getTime() > days * 86400000) return false;
    }
    return true;
  });

  // 칩 스타일
  const chipStyle = (active) => ({
    padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? chipActiveBg : chipBg,
    color: active ? acc : muted,
    fontSize: 12, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 필터 바 */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* 플랫폼 필터 */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 4, fontWeight: 600 }}>플랫폼</span>
          <button onClick={() => setFilterPlatform("all")} style={chipStyle(filterPlatform === "all")}>전체</button>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setFilterPlatform(p.id)} style={{
              ...chipStyle(filterPlatform === p.id),
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <PlatformIcon platform={p} size={14} />
              {p.label}
            </button>
          ))}
        </div>

        {/* 상태 필터 */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 4, fontWeight: 600 }}>상태</span>
          {STATUS_FILTERS.map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)} style={chipStyle(filterStatus === s.value)}>{s.label}</button>
          ))}
        </div>

        {/* 기간 필터 */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: muted, marginRight: 4, fontWeight: 600 }}>기간</span>
          {[
            { value: "all", label: "전체" },
            { value: "1", label: "오늘" },
            { value: "7", label: "7일" },
            { value: "30", label: "30일" },
          ].map(d => (
            <button key={d.value} onClick={() => setFilterDays(d.value)} style={chipStyle(filterDays === d.value)}>{d.label}</button>
          ))}
        </div>
      </div>

      {/* 결과 카운트 */}
      <div style={{ fontSize: 12, color: muted }}>
        {filtered.length === history.length
          ? `총 ${history.length}건`
          : `${history.length}건 중 ${filtered.length}건`}
      </div>

      {/* 히스토리 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: muted }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <div style={{ fontSize: 13 }}>
            {history.length === 0 ? "발행 히스토리가 없습니다" : "필터 조건에 맞는 항목이 없습니다"}
          </div>
        </div>
      ) : (
        filtered.map((item, i) => (
          <div key={i} style={{
            padding: "14px 18px", borderRadius: 12,
            border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            {/* 플랫폼 아이콘 */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {item.platforms?.map(p => {
                const plat = PLATFORMS.find(x => x.id === p);
                return plat ? <span key={p} title={plat.label}><PlatformIcon platform={plat} size={22} /></span> : null;
              })}
            </div>

            {/* 콘텐츠 정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
              <div style={{ fontSize: 11, color: muted }}>{item.date}</div>
              {item.error && (
                <div style={{ fontSize: 10, color: "#ef4444", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.error}
                </div>
              )}
            </div>

            {/* 상태 뱃지 */}
            <div style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
              background: item.status === "완료" ? "rgba(16,185,129,0.1)" : item.status === "발행 중" ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
              color: item.status === "완료" ? "#10b981" : item.status === "발행 중" ? "#3b82f6" : "#ef4444",
            }}>{item.status}</div>

            {/* 링크 버튼 */}
            {item.postUrl && item.status === "완료" && !item.postUrl.startsWith("clipboard") && (
              <a href={item.postUrl} target="_blank" rel="noopener noreferrer" style={{
                padding: "4px 8px", borderRadius: 6, border: `1px solid ${bdr}`,
                color: acc, fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0,
              }}>
                보기
              </a>
            )}
          </div>
        ))
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function SnsPublisher({ isDark, user, onLoginRequest }) {
  const [tab, setTab] = useState("publish"); // "publish" | "history"
  const [contentType, setContentType] = useState("video");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [platformStates, setPlatformStates] = useState(() => {
    const init = {};
    PLATFORMS.forEach(p => { init[p.id] = { enabled: false, description: "", tags: "", visibility: "public" }; });
    return init;
  });
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState([]);
  const [connections, setConnections] = useState([]);

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.09)" : "#e5e5f0";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const acc = "#168EEA";

  // SNS 연결 상태 조회
  useEffect(() => {
    if (!user?.uid) return;
    fetch(`/api/sns-connections?uid=${user.uid}`)
      .then(r => r.json())
      .then(d => setConnections(d.connections || []))
      .catch(() => {});
  }, [user?.uid]);

  // 발행 히스토리 조회
  useEffect(() => {
    if (!user?.uid) return;
    fetch(`/api/sns-publish-history?uid=${user.uid}`)
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => {});
  }, [user?.uid, tab]);

  const enabledPlatforms = PLATFORMS.filter(p =>
    platformStates[p.id]?.enabled && p.accepts.includes(contentType)
  );

  const availablePlatforms = PLATFORMS.filter(p => p.accepts.includes(contentType));

  const isConnected = (platformId) => connections.some(c => c.platform === platformId && c.status === "connected");

  // 발행
  const handlePublish = async () => {
    if (!user) { onLoginRequest?.(); return; }
    if (!title.trim()) { alert("제목을 입력하세요"); return; }
    if (enabledPlatforms.length === 0) { alert("발행할 플랫폼을 선택하세요"); return; }
    if (contentType !== "text" && !file) { alert("파일을 업로드하세요"); return; }

    setPublishing(true);
    try {
      // 파일이 있으면 Supabase Storage에 먼저 업로드
      let fileUrl = null;
      if (file && contentType !== "text") {
        const ext = file.name.split(".").pop() || "bin";
        const path = `sns-publish/${user.uid}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
        if (upErr) { alert("파일 업로드 실패: " + upErr.message); setPublishing(false); return; }
        const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
        fileUrl = urlData?.publicUrl;
      }

      const res = await fetch("/api/sns-multi-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          title,
          description,
          firstComment,
          contentType,
          fileUrl,
          platforms: enabledPlatforms.map(p => ({
            id: p.id,
            ...platformStates[p.id],
          })),
        }),
      });
      const data = await res.json();

      if (data.success) {
        const { summary } = data;
        const msg = summary
          ? `발행 완료: ${summary.success}개 성공` + (summary.failed > 0 ? `, ${summary.failed}개 실패` : "")
          : `${enabledPlatforms.length}개 플랫폼에 발행을 시작했습니다!`;
        alert(msg);
        setTab("history");
        fetch(`/api/sns-publish-history?uid=${user.uid}`)
          .then(r => r.json())
          .then(d => setHistory(d.history || []))
          .catch(() => {});
      } else {
        alert("발행 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch (e) {
      console.error("발행 오류:", e);
      alert("발행 중 오류가 발생했습니다.");
    }
    setPublishing(false);
  };

  const isAdmin = user?.role === "admin";

  // 로그인 필요
  if (!user) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isDark ? "transparent" : "#f4f4f8", gap: 16, padding: 40,
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="1.5">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <div style={{ fontSize: 16, fontWeight: 700, color: text }}>SNS 다중 발행</div>
        <div style={{ fontSize: 13, color: muted, textAlign: "center" }}>로그인 후 여러 플랫폼에 콘텐츠를 한 번에 발행하세요.</div>
        <button onClick={onLoginRequest} style={{
          padding: "12px 32px", borderRadius: 10, border: "none", cursor: "pointer",
          background: acc, color: "#fff", fontSize: 14, fontWeight: 700,
        }}>로그인</button>
      </div>
    );
  }

  // 관리자가 아닌 경우 — 개발중 안내
  if (!isAdmin) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: isDark ? "transparent" : "#f4f4f8", gap: 16, padding: 40,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: "linear-gradient(135deg, rgba(56,189,248,0.1), rgba(0,0,0,0.06))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={acc} strokeWidth="1.5" strokeLinecap="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: text }}>SNS 다중 발행</div>
        <div style={{
          padding: "6px 14px", borderRadius: 20,
          background: "rgba(249,115,22,0.1)", color: "#f97316",
          fontSize: 12, fontWeight: 700,
        }}>개발중</div>
        <div style={{ fontSize: 14, color: muted, textAlign: "center", lineHeight: 1.8, maxWidth: 400 }}>
          YouTube, Instagram, Threads, TikTok에<br />
          콘텐츠를 한 번에 발행하는 기능을 준비하고 있습니다.<br />
          곧 만나보실 수 있어요!
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: isDark ? "transparent" : "#f4f4f8",
    }}>
      {/* 상단 헤더 */}
      <div style={{ flexShrink: 0, padding: "28px 32px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div>
              <h1 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: text, margin: 0, letterSpacing: -0.5 }}>
                새 콘텐츠 발행
              </h1>
              <p style={{ fontSize: 13, color: muted, margin: "6px 0 0" }}>여러 플랫폼에 한 번에 콘텐츠를 올려보세요</p>
            </div>
            {/* 탭 */}
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
              {[
                { id: "publish", label: "콘텐츠 발행", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
                { id: "history", label: "발행 히스토리", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: tab === t.id ? acc : "transparent",
                  color: tab === t.id ? "#fff" : muted,
                  fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}>{t.icon} {t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {tab === "history" ? (
            /* ── 히스토리 탭 ── */
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: text }}>발행 히스토리</div>
                <button onClick={() => {
                  fetch(`/api/sns-publish-history?uid=${user.uid}`)
                    .then(r => r.json())
                    .then(d => setHistory(d.history || []))
                    .catch(() => {});
                }} style={{
                  padding: "8px 16px", borderRadius: 8, border: `1px solid ${bdr}`,
                  background: "transparent", color: muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                  새로고침
                </button>
              </div>
              <PublishHistory history={history} isDark={isDark} />
            </div>
          ) : (
            /* ── 발행 탭 ── */
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* 왼쪽: 입력 폼 */}
              <div style={{ flex: "1 1 500px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

                {/* 콘텐츠 유형 */}
                <div style={{ padding: "24px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>콘텐츠 유형</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {CONTENT_TYPES.map(ct => (
                      <button key={ct.id} onClick={() => { setContentType(ct.id); setFile(null); }} style={{
                        flex: 1, padding: "18px 16px", borderRadius: 12, cursor: "pointer",
                        border: `2px solid ${contentType === ct.id ? acc : bdr}`,
                        background: contentType === ct.id ? (isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)") : "transparent",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                        transition: "all 0.2s", color: contentType === ct.id ? acc : muted,
                      }}>
                        {CONTENT_TYPE_ICONS[ct.id]}
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{ct.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 파일 업로드 (텍스트가 아닌 경우) */}
                {contentType !== "text" && (
                  <div style={{ padding: "24px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>파일 업로드</div>
                    <FileDropZone
                      file={file}
                      onFileSelect={setFile}
                      onRemove={() => setFile(null)}
                      contentType={contentType}
                      isDark={isDark}
                    />
                  </div>
                )}

                {/* 콘텐츠 정보 */}
                <div style={{ padding: "24px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 14 }}>콘텐츠 정보</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>제목</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="콘텐츠 제목을 입력하세요"
                        style={{
                          width: "100%", padding: "12px 16px", borderRadius: 10,
                          border: `1.5px solid ${bdr}`, background: inputBg, color: text,
                          fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                        }}
                        onFocus={(e) => e.target.style.borderColor = acc}
                        onBlur={(e) => e.target.style.borderColor = bdr}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>설명</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="콘텐츠 설명을 입력하세요"
                        rows={3}
                        style={{
                          width: "100%", padding: "12px 16px", borderRadius: 10, resize: "vertical",
                          border: `1.5px solid ${bdr}`, background: inputBg, color: text,
                          fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                        }}
                        onFocus={(e) => e.target.style.borderColor = acc}
                        onBlur={(e) => e.target.style.borderColor = bdr}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, display: "block" }}>첫댓글 (선택)</label>
                      <textarea
                        value={firstComment}
                        onChange={(e) => setFirstComment(e.target.value)}
                        placeholder="업로드 후 자동으로 달릴 첫 번째 댓글을 입력하세요"
                        rows={2}
                        style={{
                          width: "100%", padding: "12px 16px", borderRadius: 10, resize: "vertical",
                          border: `1.5px solid ${bdr}`, background: inputBg, color: text,
                          fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                        }}
                        onFocus={(e) => e.target.style.borderColor = acc}
                        onBlur={(e) => e.target.style.borderColor = bdr}
                      />
                    </div>
                  </div>
                </div>

                {/* 발행 플랫폼 선택 */}
                <div style={{ padding: "24px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: text }}>발행 플랫폼 선택</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>콘텐츠를 올릴 플랫폼과 계정을 선택하세요</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {availablePlatforms.map(p => {
                      const connected = isConnected(p.id);
                      return (
                        <div key={p.id}>
                          <PlatformCard
                            platform={p}
                            enabled={platformStates[p.id]?.enabled || false}
                            onToggle={(val) => {
                              if (val && !connected) {
                                alert(`${p.label} 계정을 먼저 연결해주세요.\nSNS 계정 연결 메뉴에서 연결할 수 있습니다.`);
                                return;
                              }
                              setPlatformStates(prev => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], enabled: val },
                              }));
                            }}
                            settings={platformStates[p.id] || {}}
                            onSettingsChange={(s) => setPlatformStates(prev => ({ ...prev, [p.id]: s }))}
                            isDark={isDark}
                          />
                          {!connected && (
                            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4, marginLeft: 8, fontWeight: 600 }}>
                              ⚠ 계정 미연결 — SNS 계정 연결에서 먼저 연결하세요
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 발행 버튼 */}
                <button
                  onClick={handlePublish}
                  disabled={publishing || enabledPlatforms.length === 0}
                  style={{
                    width: "100%", padding: "16px", borderRadius: 12, border: "none",
                    cursor: publishing || enabledPlatforms.length === 0 ? "not-allowed" : "pointer",
                    background: enabledPlatforms.length === 0 ? (isDark ? "rgba(255,255,255,0.06)" : "#e5e5e5") : "#168EEA",
                    color: enabledPlatforms.length === 0 ? muted : "#fff",
                    fontSize: 16, fontWeight: 800, letterSpacing: -0.3,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: publishing ? 0.7 : 1, transition: "all 0.2s",
                  }}
                >
                  {publishing ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      발행 중...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      {enabledPlatforms.length > 0 ? `${enabledPlatforms.length}개 플랫폼에 발행하기` : "플랫폼을 선택하세요"}
                    </>
                  )}
                </button>
              </div>

              {/* 오른쪽: 미리보기 */}
              <div style={{
                flex: "0 0 300px", position: "sticky", top: 20,
                padding: "20px", borderRadius: 14, border: `1px solid ${bdr}`, background: cardBg,
                minHeight: 300,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 14 }}>미리보기</div>
                <PreviewPanel
                  contentType={contentType}
                  file={file}
                  title={title}
                  description={description}
                  enabledPlatforms={enabledPlatforms}
                  isDark={isDark}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* spin 애니메이션 */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
