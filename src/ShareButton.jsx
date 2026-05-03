import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   ShareButton – SNS 공유 버튼 (텍스트·이미지·URL 공유)

   Props:
     title       – 공유 제목
     text        – 공유 텍스트 (본문)
     url         – 공유 URL
     imageUrl    – 이미지 URL (다운로드 or 공유용)
     imageBlob   – Blob 객체 (Web Share API Files용)
     videoUrl    – 비디오 URL
     hashtags    – 해시태그 배열 ["태그1","태그2"]
     isDark      – 다크모드
     compact     – 작은 사이즈
     style       – 추가 스타일
═══════════════════════════════════════════════════════════ */

const PLATFORMS = [
  { id:"native",   label:"공유하기",    icon:"📤", color:"#3b82f6", hasNative:true },
  { id:"x",        label:"X (트위터)",  icon:"𝕏",  color:"#000000" },
  { id:"facebook",  label:"페이스북",   icon:"f",  color:"#1877F2" },
  { id:"threads",   label:"스레드",     icon:"@",  color:"#000000" },
  { id:"kakao",     label:"카카오톡",   icon:"💬", color:"#FEE500", textColor:"#3C1E1E" },
  { id:"line",      label:"라인",       icon:"💚", color:"#06C755" },
  { id:"linkedin",  label:"링크드인",   icon:"in", color:"#0A66C2" },
  { id:"band",      label:"네이버 밴드", icon:"B", color:"#06CF9C" },
  { id:"copy",      label:"링크 복사",  icon:"📋", color:"#888888" },
];

function buildShareUrl(platform, { title, text, url, hashtags }) {
  const t = encodeURIComponent(title || "");
  const txt = encodeURIComponent(text?.slice(0, 280) || title || "");
  const u = encodeURIComponent(url || window.location.href);
  const tags = (hashtags || []).map(h => h.replace(/^#/, "")).join(",");

  switch (platform) {
    case "x":
      return `https://x.com/intent/tweet?text=${txt}&url=${u}${tags ? `&hashtags=${encodeURIComponent(tags)}` : ""}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${txt}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${txt}%20${u}`;
    case "kakao":
      return `https://story.kakao.com/share?url=${u}`;
    case "line":
      return `https://social-plugins.line.me/lineit/share?url=${u}&text=${txt}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "band":
      return `https://band.us/plugin/share?body=${txt}%20${u}&route=${u}`;
    default:
      return null;
  }
}

async function shareNative({ title, text, url, imageBlob }) {
  if (!navigator.share) return false;
  const data = { title, text: text?.slice(0, 500) || title };
  if (url) data.url = url;
  // 이미지/비디오 파일 공유 시도
  if (imageBlob && navigator.canShare) {
    const file = new File([imageBlob], "share.png", { type: imageBlob.type || "image/png" });
    if (navigator.canShare({ files: [file] })) {
      data.files = [file];
    }
  }
  try { await navigator.share(data); return true; }
  catch { return false; }
}

export default function ShareButton({ title, text, url, imageUrl, imageBlob, videoUrl, hashtags, isDark, compact, style }) {
  const D = isDark;
  const accent = "#3b82f6";
  const bdr = D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const bg = D ? "rgba(15,12,41,0.97)" : "rgba(255,255,255,0.97)";
  const textC = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const shareUrl = url || window.location.href;

  const handleShare = async (pid) => {
    if (pid === "native") {
      const blob = imageBlob || (imageUrl ? await fetch(imageUrl).then(r => r.blob()).catch(() => null) : null);
      const ok = await shareNative({ title, text, url: shareUrl, imageBlob: blob });
      if (ok) { setShared("native"); setTimeout(() => setShared(null), 2000); setOpen(false); }
      return;
    }
    if (pid === "copy") {
      const copyText = text ? `${title || ""}\n\n${text.slice(0, 500)}\n\n${shareUrl}` : shareUrl;
      try { await navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      catch { /* fallback */ const ta = document.createElement("textarea"); ta.value = copyText; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      return;
    }
    const link = buildShareUrl(pid, { title, text, url: shareUrl, hashtags });
    if (link) {
      window.open(link, "_blank", "width=600,height=500,scrollbars=yes");
      setShared(pid); setTimeout(() => setShared(null), 2000);
    }
  };

  const hasNative = typeof navigator !== "undefined" && !!navigator.share;
  const platforms = hasNative ? PLATFORMS : PLATFORMS.filter(p => p.id !== "native");

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      <button onClick={() => setOpen(p => !p)}
        style={{
          padding: compact ? "6px 12px" : "9px 16px", borderRadius: 10,
          border: `1px solid ${open ? accent : bdr}`,
          background: open ? (D ? `${accent}20` : `${accent}08`) : "transparent",
          color: accent, fontSize: compact ? 11 : 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
        }}>
        <svg width={compact?14:16} height={compact?14:16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        {compact ? "공유" : "SNS 공유"}
        {shared && <span style={{ fontSize: 10, color: "#4ade80" }}>✓</span>}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 60, right: 10, zIndex: 9999,
          width: Math.min(240, typeof window!=="undefined" ? window.innerWidth - 20 : 240), background: bg, borderRadius: 16, border: `1px solid ${bdr}`,
          boxShadow: D ? "0 12px 40px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.12)",
          backdropFilter: "blur(20px)", overflow: "hidden",
        }}>
          {/* 헤더 */}
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${bdr}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textC, marginBottom: 2 }}>SNS 공유</div>
            <div style={{ fontSize: 11, color: muted }}>{title?.slice(0, 30) || "콘텐츠를 공유하세요"}</div>
          </div>

          {/* 플랫폼 목록 */}
          <div style={{ padding: "8px", maxHeight: 320, overflowY: "auto" }}>
            {platforms.map(p => (
              <button key={p.id} onClick={() => handleShare(p.id)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: shared === p.id ? (D ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.06)") : "transparent",
                  color: shared === p.id ? "#4ade80" : textC,
                  display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                  transition: "background 0.12s", fontSize: 13,
                }}
                onMouseEnter={e => { if (shared !== p.id) e.currentTarget.style.background = D ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"; }}
                onMouseLeave={e => { if (shared !== p.id) e.currentTarget.style.background = "transparent"; }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: p.id === "copy" ? (D ? "rgba(255,255,255,0.06)" : "#f0f0f0") : `${p.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: p.icon.length > 1 ? 14 : 13, fontWeight: 900,
                  color: p.textColor || p.color,
                }}>
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.id === "copy" && copied ? "✅ 복사됨!" : shared === p.id ? `✅ ${p.label}` : p.label}
                  </div>
                </div>
                {p.id === "native" && <span style={{ fontSize: 10, color: accent, fontWeight: 700 }}>추천</span>}
              </button>
            ))}
          </div>

          {/* 푸터 */}
          {(imageUrl || videoUrl) && (
            <div style={{ padding: "8px 16px 12px", borderTop: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 10, color: muted, marginBottom: 6 }}>미디어 포함</div>
              <div style={{ display: "flex", gap: 6 }}>
                {imageUrl && (
                  <a href={imageUrl} download="share.png" style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${bdr}`,
                    background: "transparent", color: accent, fontSize: 10, fontWeight: 700,
                    textDecoration: "none", cursor: "pointer",
                  }}>📥 이미지 저장</a>
                )}
                {videoUrl && (
                  <a href={videoUrl} download="share.mp4" style={{
                    padding: "5px 10px", borderRadius: 6, border: `1px solid ${bdr}`,
                    background: "transparent", color: accent, fontSize: 10, fontWeight: 700,
                    textDecoration: "none", cursor: "pointer",
                  }}>📥 영상 저장</a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ShareRow: 인라인 아이콘 행 (간단한 공유) ── */
export function ShareRow({ title, text, url, hashtags, isDark, compact }) {
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const shareUrl = url || window.location.href;
  const [copied, setCopied] = useState(false);

  const quickPlatforms = [
    { id:"x",       icon:"𝕏", color:"#000" },
    { id:"facebook", icon:"f", color:"#1877F2" },
    { id:"kakao",    icon:"💬",color:"#FEE500" },
    { id:"line",     icon:"💚",color:"#06C755" },
    { id:"threads",  icon:"@", color:"#000" },
  ];

  const share = (pid) => {
    if (pid === "copy") {
      navigator.clipboard.writeText(text ? `${title}\n${text.slice(0, 300)}\n${shareUrl}` : shareUrl);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
      return;
    }
    const link = buildShareUrl(pid, { title, text, url: shareUrl, hashtags });
    if (link) window.open(link, "_blank", "width=600,height=500");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 6, flexWrap: "wrap" }}>
      {quickPlatforms.map(p => (
        <button key={p.id} onClick={() => share(p.id)} title={p.id}
          style={{
            width: compact ? 28 : 32, height: compact ? 28 : 32, borderRadius: 8, border: `1px solid ${bdr}`,
            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: compact ? 12 : 13, fontWeight: 900, color: isDark ? "#fff" : p.color, transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${p.color}18`; e.currentTarget.style.borderColor = p.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = bdr; }}>
          {p.icon}
        </button>
      ))}
      <button onClick={() => share("copy")} title="링크 복사"
        style={{
          width: compact ? 28 : 32, height: compact ? 28 : 32, borderRadius: 8, border: `1px solid ${bdr}`,
          background: copied ? "rgba(74,222,128,0.1)" : "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: compact ? 12 : 13, color: copied ? "#4ade80" : muted, transition: "all 0.12s",
        }}>
        {copied ? "✓" : "📋"}
      </button>
    </div>
  );
}
