import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchGifs, trendingGifs,
  searchStickers, trendingStickers,
  searchClips, trendingClips,
  searchMemes, trendingMemes,
  searchEmojis, trendingEmojis,
  getMediaUrl, getVideoUrl, getPreviewUrl,
} from "./klipyClient";

/* ═══════════════════════════════════════════════════════════
   KlipyPicker – GIF/스티커/클립/밈/이모지 검색·선택 패널

   Props:
     onSelect(item)  – 미디어 선택 시 콜백 (item.url, item.videoUrl, item.raw)
     isDark           – 다크모드
     defaultTab       – 기본 탭 ("gif"|"sticker"|"clip"|"meme"|"emoji")
     compact          – true면 작은 사이즈
     onClose          – 닫기 콜백 (모달형)
     style            – 컨테이너 추가 스타일
═══════════════════════════════════════════════════════════ */

const TABS = [
  { id: "gif",     label: "GIF",    search: searchGifs,     trending: trendingGifs },
  { id: "sticker", label: "스티커",  search: searchStickers, trending: trendingStickers },
  { id: "clip",    label: "클립",    search: searchClips,    trending: trendingClips },
  { id: "meme",    label: "밈",      search: searchMemes,    trending: trendingMemes },
  { id: "emoji",   label: "이모지",  search: searchEmojis,   trending: trendingEmojis },
];

export default function KlipyPicker({ onSelect, isDark = true, defaultTab = "gif", compact = false, onClose, style }) {
  const D = isDark;
  const accent = "#168EEA";
  const text  = D ? "#fff" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.45)" : "#888";
  const bdr   = D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const bg    = D ? "rgba(15,12,41,0.95)" : "rgba(255,255,255,0.97)";
  const cardBg= D ? "rgba(255,255,255,0.06)" : "#f5f5f5";

  const [tab, setTab]         = useState(defaultTab);
  const [query, setQuery]     = useState("");
  const [items, setItems]     = useState([]);
  const [page, setPage]       = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const inputRef = useRef(null);
  const debounce = useRef(null);

  const tabInfo = TABS.find(t => t.id === tab) || TABS[0];

  const fetchItems = useCallback(async (q, p, append = false) => {
    setLoading(true);
    try {
      const result = q.trim()
        ? await tabInfo.search(q.trim(), p)
        : await tabInfo.trending(p);
      const list = result?.data || result || [];
      setItems(prev => append ? [...prev, ...list] : list);
      setHasNext(result?.has_next || false);
    } catch (e) {
      console.error("Klipy fetch error:", e);
      if (!append) setItems([]);
    }
    setLoading(false);
  }, [tabInfo]);

  // 탭 변경 or 검색어 변경 시 리셋
  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchItems(query, 1);
  }, [tab, query, fetchItems]);

  const loadMore = () => {
    if (loading || !hasNext) return;
    const next = page + 1;
    setPage(next);
    fetchItems(query, next, true);
  };

  const handleSearch = (val) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(val), 350);
  };

  const handleSelect = (item) => {
    const url = getMediaUrl(item, "hd") || getMediaUrl(item);
    const videoUrl = getVideoUrl(item, "hd") || getVideoUrl(item);
    const previewUrl = getPreviewUrl(item);
    if (onSelect) onSelect({ url, videoUrl, previewUrl, title: item.title, type: item.type, raw: item });
  };

  const gridCols = compact ? "repeat(auto-fill,minmax(80px,1fr))" : "repeat(auto-fill,minmax(120px,1fr))";

  return (
    <div style={{
      background: bg, borderRadius: 16, border: `1px solid ${bdr}`,
      overflow: "hidden", display: "flex", flexDirection: "column",
      backdropFilter: "blur(20px)",
      boxShadow: D ? "0 12px 40px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.1)",
      maxHeight: compact ? 360 : 480, ...style,
    }}>
      {/* 헤더 */}
      <div style={{ padding: compact ? "10px 12px 8px" : "14px 16px 10px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: compact ? 13 : 15, fontWeight: 900, color: text }}>KLIPY</span>
            <span style={{ fontSize: 10, color: accent, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${accent}15` }}>MEDIA</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: muted, padding: "2px 6px" }}>×</button>
          )}
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 2, marginBottom: 10, background: D ? "rgba(255,255,255,0.05)" : "#e9e9ef", borderRadius: 8, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: compact ? "5px 4px" : "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: compact ? 10 : 11, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? (D ? "rgba(0,0,0,0.06)" : "#fff") : "transparent",
                color: tab === t.id ? (D ? "#fff" : accent) : muted,
                boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div style={{ position: "relative" }}>
          <input ref={inputRef}
            placeholder="Search KLIPY"
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: "100%", padding: compact ? "8px 12px 8px 32px" : "10px 14px 10px 36px",
              borderRadius: 10, border: `1px solid ${bdr}`, background: cardBg,
              color: text, fontSize: compact ? 12 : 13, outline: "none", boxSizing: "border-box",
            }} />
          <span style={{ position: "absolute", left: compact ? 10 : 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: muted }}>🔍</span>
        </div>
      </div>

      {/* 그리드 */}
      <div style={{ flex: 1, overflowY: "auto", padding: compact ? "8px" : "12px" }}
        onScroll={e => {
          const el = e.target;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) loadMore();
        }}>
        {items.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "32px 16px", color: muted, fontSize: 13 }}>
            {query ? "검색 결과가 없어요" : "로딩 중..."}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: compact ? 4 : 6 }}>
          {items.map((item, i) => {
            const previewUrl = getPreviewUrl(item) || getMediaUrl(item, "sm");
            const isVideo = item.type === "clip" || (!previewUrl && getVideoUrl(item));
            const videoSrc = getVideoUrl(item, "sm") || getVideoUrl(item);
            const isHover = hoverId === (item.id || i);
            return (
              <div key={item.id || i}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHoverId(item.id || i)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  borderRadius: compact ? 6 : 8, overflow: "hidden", cursor: "pointer",
                  aspectRatio: tab === "emoji" ? "1" : "auto",
                  background: cardBg, position: "relative",
                  transform: isHover ? "scale(1.04)" : "none",
                  boxShadow: isHover ? `0 4px 16px ${accent}30` : "none",
                  transition: "all 0.15s",
                  border: isHover ? `2px solid ${accent}` : `2px solid transparent`,
                }}>
                {isVideo && videoSrc ? (
                  <video src={videoSrc} autoPlay loop muted playsInline
                    style={{ width: "100%", display: "block", minHeight: compact ? 60 : 80 }} />
                ) : previewUrl ? (
                  <img src={previewUrl} alt={item.title || ""}
                    loading="lazy"
                    style={{ width: "100%", display: "block", minHeight: compact ? 60 : 80, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", minHeight: compact ? 60 : 80, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 10 }}>
                    {item.title || "미디어"}
                  </div>
                )}
                {isHover && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: compact ? 18 : 24, color: "#fff",
                  }}>
                    +
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {loading && (
          <div style={{ textAlign: "center", padding: "16px", color: accent }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${accent}30`, borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
            <span style={{ fontSize: 11 }}>불러오는 중...</span>
          </div>
        )}
        {hasNext && !loading && (
          <button onClick={loadMore}
            style={{ display: "block", margin: "12px auto", padding: "8px 20px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            더 보기
          </button>
        )}
      </div>

      {/* 워터마크 */}
      <div style={{ padding: "6px 12px", borderTop: `1px solid ${bdr}`, textAlign: "center", fontSize: 9, color: muted, flexShrink: 0 }}>
        Powered by <span style={{ fontWeight: 700, color: accent }}>KLIPY</span>
      </div>
    </div>
  );
}

/* ── KlipyButton: 인라인 토글 버튼 ── */
export function KlipyButton({ onSelect, isDark, compact, style, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      <button onClick={() => setOpen(p => !p)}
        style={{
          padding: compact ? "6px 10px" : "8px 14px", borderRadius: 8,
          border: `1px solid ${isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)"}`,
          background: open ? `${isDark ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.06)"}` : "transparent",
          color: "#168EEA", fontSize: compact ? 11 : 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          ...buttonStyle,
        }}>
        🎬 GIF
      </button>
      {open && (
        <div style={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 9999, width: Math.min(compact ? 300 : 400, typeof window!=="undefined" ? window.innerWidth - 20 : 380) }}>
          <KlipyPicker isDark={isDark} compact={compact}
            onSelect={(item) => { onSelect(item); setOpen(false); }}
            onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
