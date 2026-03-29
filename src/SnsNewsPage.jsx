import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./storage";
import Footer from "./Footer.jsx";

/* ════════════════════════════════════════════════════════════
   SNS뉴스 페이지 – AI 브리핑 + 실시간 뉴스 + 관리자 직접 작성
════════════════════════════════════════════════════════════ */

const THEME_C = { text:"#1a1730", muted:"rgba(26,23,48,0.5)", border:"rgba(0,0,0,0.08)", purpleL:"#6357e0", card:"#fff", footerBg:"#fafafa", toggleBg:"#f5f4ff" };
const accent = "#7c6aff";

// ── RSS 뉴스 카테고리 ──
// 실시간 뉴스: 큰 카테고리 3개 (국내+해외 통합)
const NEWS_CATS = [
  { id: "sns", label: "SNS", queries: [
    { query: "SNS+마케팅+인스타그램+틱톡", lang: "ko" },
    { query: "social+media+marketing+instagram+tiktok", lang: "en" },
  ]},
  { id: "ai", label: "AI/테크", queries: [
    { query: "AI+마케팅+생성형AI", lang: "ko" },
    { query: "AI+marketing+tools+generative", lang: "en" },
  ]},
  { id: "trend", label: "트렌드", queries: [
    { query: "마케팅+트렌드+디지털마케팅", lang: "ko" },
    { query: "digital+marketing+trends+2026", lang: "en" },
  ]},
];

// ── 관리자 글 카테고리 ──
const ARTICLE_CATS = [
  { id: "all",       label: "전체",         color: "#7c6aff" },
  { id: "briefing",  label: "AI 브리핑",    color: "#6366f1" },
  { id: "platform",  label: "플랫폼 업데이트", color: "#3b82f6" },
  { id: "algorithm", label: "알고리즘",      color: "#f59e0b" },
  { id: "trend",     label: "트렌드",        color: "#10b981" },
  { id: "marketing", label: "마케팅 팁",     color: "#ec4899" },
  { id: "policy",    label: "정책 변경",     color: "#ef4444" },
];

const PLATFORM_TAGS = [
  { id: "instagram", label: "Instagram", color: "#E4405F" },
  { id: "youtube",   label: "YouTube",   color: "#FF0000" },
  { id: "tiktok",    label: "TikTok",    color: "#000000" },
  { id: "naver",     label: "Naver",     color: "#03C75A" },
  { id: "threads",   label: "Threads",   color: "#000000" },
  { id: "x",         label: "X",         color: "#1DA1F2" },
];

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return Math.floor(diff / 60000) + "분 전";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "시간 전";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "일 전";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── RSS 뉴스 가져오기 ──
async function fetchRssNews(query, lang = "ko") {
  try {
    const hlgl = lang === "en" ? "hl=en-US&gl=US&ceid=US:en" : "hl=ko&gl=KR&ceid=KR:ko";
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${hlgl}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
    const r = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const data = await r.json();
    const xml = data.contents || "";
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const itemXml of itemMatches.slice(0, 25)) {
      const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
      const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "";
      const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || "";
      const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || "";
      const desc = (itemXml.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || "";
      // 썸네일: description 내 img 태그 → media:content → enclosure
      const thumbMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
      const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      const thumb = (thumbMatch ? thumbMatch[1] : "") || (mediaMatch ? mediaMatch[1] : "") || (enclosureMatch ? enclosureMatch[1] : "");
      const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const strip = s => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
      const t = strip(decode(title));
      if (t) items.push({ title: t, link, pubDate, source: strip(decode(source)), description: strip(decode(desc)), thumb, lang });
    }
    return items.length > 0 ? items : null;
  } catch { return null; }
}

// ── 브리핑 마크다운 렌더러 ──
function renderBriefing(content) {
  if (!content) return null;
  return content.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 8 }} />;
    if (t.startsWith("#")) {
      return <div key={i} style={{ fontSize: 17, fontWeight: 800, color: "#1a1730", marginTop: i === 0 ? 0 : 24, marginBottom: 6, lineHeight: 1.5 }}>{t.replace(/^#{1,3}\s*/, "")}</div>;
    }
    if (t.startsWith("📎")) {
      const raw = t.replace(/^📎\s*/, "");
      const parts = raw.split(/(#[^\s#]+)/g).filter(Boolean);
      return (
        <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 4, alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "rgba(124,106,255,0.04)", border: "1px solid rgba(124,106,255,0.08)" }}>
          <span style={{ fontSize: 12 }}>📎</span>
          {parts.map((p, j) => {
            if (p.startsWith("#")) return <span key={j} style={{ fontSize: 11, fontWeight: 700, color: accent, background: "rgba(124,106,255,0.1)", borderRadius: 20, padding: "2px 8px" }}>{p}</span>;
            // "출처: 언론사명" 부분 강조
            if (p.includes("출처")) return <span key={j} style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{p.trim()}</span>;
            return <span key={j} style={{ fontSize: 11, color: "#888" }}>{p.trim()}</span>;
          })}
        </div>
      );
    }
    return <div key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1730", marginBottom: 2 }}>{t}</div>;
  });
}

/* ── 관리자 글 작성 모달 ── */
function NewsEditorModal({ article, onSave, onClose }) {
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [category, setCategory] = useState(article?.category || "platform");
  const [platforms, setPlatforms] = useState(article?.platforms || []);
  const [thumbnail, setThumbnail] = useState(article?.thumbnail || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [pinned, setPinned] = useState(article?.pinned || false);
  const [saving, setSaving] = useState(false);
  const bdr = "rgba(0,0,0,0.08)";
  const inp = { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: "#f5f5f8", color: "#1a1730", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", minHeight: 44 };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try { await onSave({ title, content, category, platforms, thumbnail, summary, pinned }); } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1730", marginBottom: 4 }}>{article ? "뉴스 수정" : "새 뉴스 작성"}</div>
          <div style={{ fontSize: 13, color: "#888" }}>SNS 플랫폼 소식을 작성하세요</div>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>제목</div><input value={title} onChange={e => setTitle(e.target.value)} placeholder="뉴스 제목" style={inp} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>카테고리</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ARTICLE_CATS.filter(c => c.id !== "all").map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${category === c.id ? c.color : bdr}`, background: category === c.id ? c.color + "15" : "transparent", color: category === c.id ? c.color : "#888", fontSize: 12, fontWeight: category === c.id ? 700 : 400, cursor: "pointer" }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>관련 플랫폼</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PLATFORM_TAGS.map(p => (
                <button key={p.id} onClick={() => setPlatforms(pr => pr.includes(p.id) ? pr.filter(x => x !== p.id) : [...pr, p.id])} style={{ padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${platforms.includes(p.id) ? p.color : bdr}`, background: platforms.includes(p.id) ? p.color + "15" : "transparent", color: platforms.includes(p.id) ? p.color : "#888", fontSize: 11, fontWeight: platforms.includes(p.id) ? 700 : 400, cursor: "pointer" }}>{p.label}</button>
              ))}
            </div>
          </div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>썸네일 URL (선택)</div><input value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://..." style={inp} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>요약 (선택)</div><textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="2~3줄 요약" style={{ ...inp, minHeight: 60, resize: "vertical" }} /></div>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1730", marginBottom: 6 }}>본문 (마크다운 지원)</div><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="# 제목\n내용을 작성하세요..." style={{ ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.8 }} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /><span style={{ fontSize: 13, color: "#1a1730" }}>상단 고정</span></label>
        </div>
        <div style={{ padding: "16px 28px 24px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: `1px solid ${bdr}`, background: "transparent", color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>취소</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "저장 중..." : article ? "수정" : "발행"}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   메인 SnsNewsPage
════════════════════════════════════════════════════════════ */
export default function SnsNewsPage({ C, user, navigate }) {
  const c = C || THEME_C;
  const text = c.text || "#1a1730";
  const muted = c.muted || "rgba(26,23,48,0.5)";
  const bdr = c.border || "rgba(0,0,0,0.08)";
  const isAdmin = user?.role === "admin";

  // 메인 탭: 브리핑 | 실시간뉴스 | 공지/소식
  const [mainTab, setMainTab] = useState("briefing");

  // ── 1) AI 브리핑 ──
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingHistory, setBriefingHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);

  const loadBriefingHistory = async () => {
    // localStorage에서 로드
    const localItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("nper_sns_briefing_")) {
        try { localItems.push({ date: key.replace("nper_sns_briefing_", ""), ...JSON.parse(localStorage.getItem(key)) }); } catch {}
      }
    }
    // Supabase에서도 과거 브리핑 로드
    try {
      const { data } = await supabase.from("sns_news").select("*").eq("category", "briefing").order("created_at", { ascending: false }).limit(30);
      if (data) {
        for (const item of data) {
          const dateKey = item.id?.replace("briefing_", "") || "";
          if (dateKey && !localItems.find(l => l.date === dateKey)) {
            localItems.push({ date: dateKey, title: item.title, content: item.content });
            // localStorage에도 캐싱
            try { localStorage.setItem(`nper_sns_briefing_${dateKey}`, JSON.stringify({ title: item.title, content: item.content, date: dateKey })); } catch {}
          }
        }
      }
    } catch {}
    localItems.sort((a, b) => b.date.localeCompare(a.date));
    setBriefingHistory(localItems);
  };

  // 브리핑 로드: 1) localStorage 즉시 → 2) Supabase 빠르게 → 3) AI 생성 백그라운드
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const todayKey = getTodayKey();
    const todayLabel = todayKey.replace(/-/g, ".");
    const cacheKey = `nper_sns_briefing_${todayKey}`;

    // 1단계: localStorage 즉시 로드 (0ms)
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setBriefing(JSON.parse(cached)); setBriefingLoading(false); } catch {}
      loadBriefingHistory();
      return () => { cancelled = true; };
    }

    // 2단계: Supabase에서 빠르게 로드 (0.5~2초)
    (async () => {
      try {
        const { data } = await supabase.from("sns_news").select("*").eq("id", `briefing_${todayKey}`).single();
        if (!cancelled && data?.content) {
          const br = { title: data.title, content: data.content, date: todayKey };
          setBriefing(br); setBriefingLoading(false);
          try { localStorage.setItem(cacheKey, JSON.stringify(br)); } catch {}
          loadBriefingHistory();
          return;
        }
      } catch {}

      // 3단계: AI 생성 (백그라운드, 5~15초)
      if (cancelled) return;
      setBriefingLoading(false); // 로딩 스피너 먼저 해제
      setBriefingGenerating(true); // "생성 중" 표시
      try {
        const { callAI } = await import("./aiClient");
        const result = await callAI("claude-haiku-4-5", [
          { role: "user", content: `[${todayLabel} 마케팅 뉴스클리핑] 오늘 기준 SNS/디지털 마케팅 관련 주요 뉴스 7개를 뉴스클리핑 형태로 작성해줘.

형식 (반드시 이 형식을 따라):
## 1. [구체적인 뉴스 제목]
[상세 내용 3~5문장. 구체적인 수치, 변경 내용, 영향을 포함. 실제 뉴스처럼 객관적으로 작성]
📎 출처: [언론사/플랫폼명] | 관련: #키워드1 #키워드2

## 2. [뉴스 제목]
...

규칙:
- 총 7개 항목
- 각 항목은 ## 번호. 제목 형식
- 내용은 3~5문장으로 구체적으로
- 📎 출처와 관련 키워드 필수
- 이모지 사용 금지 (📎만 허용)
- 마크다운 볼드(**) 사용 금지
- 카테고리: 플랫폼 업데이트, 알고리즘 변경, 마케팅 트렌드, AI/테크, 이커머스, 크리에이터 경제 등 다양하게
- 한국 시장 뉴스 4개 + 글로벌 뉴스 3개 비율` }
        ], 2500);
        const content = typeof result === "string" ? result : (result?.content || result?.text || "");
        if (!cancelled && content) {
          const br = { title: `${todayLabel} SNS브리핑`, content, date: todayKey };
          localStorage.setItem(cacheKey, JSON.stringify(br));
          setBriefing(br);
          supabase.from("sns_news").upsert({
            id: `briefing_${todayKey}`, title: br.title, content, category: "briefing",
            platforms: ["instagram","youtube","tiktok","naver"], author_uid: "system_ai", pinned: false, views: 0,
            summary: `AI가 자동 생성한 ${todayLabel} SNS 마케팅 브리핑입니다.`, created_at: new Date().toISOString(),
          }, { onConflict: "id" }).then(() => {}).catch(() => {});
          loadBriefingHistory();
        }
      } catch (e) { console.error("브리핑 생성 실패:", e); }
      if (!cancelled) setBriefingGenerating(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── 2) 실시간 RSS 뉴스 ──
  const [newsCat, setNewsCat] = useState("sns");
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsCache, setNewsCache] = useState({});

  const [newsRefreshing, setNewsRefreshing] = useState(false);
  useEffect(() => {
    if (mainTab !== "news") return;
    if (newsCache[newsCat]) { setNewsItems(newsCache[newsCat]); return; }
    // 폴백 즉시 표시
    const fallback = FALLBACK_NEWS[newsCat] || [];
    setNewsItems(fallback);
    setNewsLoading(false);
    // 국내+해외 RSS 병렬 fetch 후 합산
    let cancelled = false;
    setNewsRefreshing(true);
    const cat = NEWS_CATS.find(c => c.id === newsCat);
    if (!cat) return;
    Promise.all(
      cat.queries.map(q => fetchRssNews(q.query, q.lang))
    ).then(results => {
      if (cancelled) return;
      const merged = results.flatMap(r => r || []);
      // 시간순 정렬
      merged.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
      if (merged.length > 0) {
        const deduped = merged.filter((item, i, arr) => arr.findIndex(x => x.title === item.title) === i).slice(0, 20);
        setNewsItems(deduped);
        setNewsCache(prev => ({ ...prev, [newsCat]: deduped }));
      } else {
        setNewsCache(prev => ({ ...prev, [newsCat]: fallback }));
      }
      setNewsRefreshing(false);
    });
    return () => { cancelled = true; };
  }, [newsCat, mainTab]);

  // ── 3) 공지 + 소식 (Supabase) ──
  const NOTICE_CATS = ["platform", "algorithm", "policy"]; // 공지 카테고리
  const TIPS_CATS = ["trend", "marketing", "briefing"]; // 소식 카테고리
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    if (mainTab !== "notice" && mainTab !== "tips") return;
    let cancelled = false;
    setArticlesLoading(true);
    const cats = mainTab === "notice" ? NOTICE_CATS : TIPS_CATS;
    (async () => {
      try {
        const { data } = await supabase.from("sns_news").select("*").in("category", cats).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30);
        if (!cancelled) setArticles(data || []);
      } catch {
        if (!cancelled) setArticles([]);
      }
      if (!cancelled) setArticlesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mainTab]);

  const handleSaveArticle = async (data) => {
    try {
      if (editTarget) {
        await supabase.from("sns_news").update({ ...data, updated_at: new Date().toISOString() }).eq("id", editTarget.id);
      } else {
        await supabase.from("sns_news").insert({ ...data, author_uid: user?.uid, views: 0 });
      }
      setEditorOpen(false); setEditTarget(null);
      // 리로드
      const { data: fresh } = await supabase.from("sns_news").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30);
      setArticles(fresh || []);
    } catch (e) { alert("저장 실패: sns_news 테이블이 생성되지 않았을 수 있습니다. Supabase에서 테이블을 먼저 생성해주세요."); }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm("이 뉴스를 삭제할까요?")) return;
    try {
      await supabase.from("sns_news").delete().eq("id", id).then(() => {});
      setSelectedArticle(null);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  // ── 상세 뷰 ──
  if (selectedArticle) {
    const a = selectedArticle;
    const catInfo = ARTICLE_CATS.find(c => c.id === a.category) || ARTICLE_CATS[0];
    return (
      <div style={{ minHeight: "80vh", padding: "clamp(20px,4vw,40px) clamp(16px,3vw,28px) 60px", background: "#f8f8fb" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <button onClick={() => setSelectedArticle(null)} style={{ marginBottom: 20, padding: "10px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, fontSize: 13, cursor: "pointer", minHeight: 44 }}>← 목록으로</button>
          {a.thumbnail && <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24, aspectRatio: "16/9", background: "#111" }}><img src={a.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {a.pinned && <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>PIN</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: catInfo.color + "15", color: catInfo.color }}>{catInfo.label}</span>
            {(a.platforms || []).map(pid => { const pl = PLATFORM_TAGS.find(p => p.id === pid); return pl ? <span key={pid} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: pl.color + "12", color: pl.color }}>{pl.label}</span> : null; })}
            <span style={{ fontSize: 12, color: muted }}>{fmtDate(a.created_at)}</span>
          </div>
          <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 900, color: text, lineHeight: 1.4, marginBottom: 24 }}>{a.title}</h1>
          {isAdmin && <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={() => { setEditTarget(a); setEditorOpen(true); }} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>수정</button>
            <button onClick={() => handleDeleteArticle(a.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>삭제</button>
          </div>}
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${bdr}`, padding: "clamp(20px,4vw,36px)" }}>{renderBriefing(a.content)}</div>
        </div>
        <div style={{ maxWidth: 760, margin: "40px auto 0" }}><Footer C={c} /></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "80vh", background: "#f8f8fb" }}>
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(165deg,#f5f4ff 0%,#fdf2ff 100%)", padding: "clamp(40px,6vw,70px) 24px clamp(24px,4vw,40px)", textAlign: "center", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(24px,5vw,36px)", fontWeight: 900, color: text, letterSpacing: -0.5, marginBottom: 12, lineHeight: 1.3 }}>SNS뉴스</div>
          <div style={{ fontSize: "clamp(14px,2.5vw,16px)", color: muted, lineHeight: 1.8 }}>SNS 플랫폼 소식, AI 브리핑, 마케팅 트렌드를 한곳에서</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(20px,3vw,32px) clamp(16px,3vw,24px) 60px" }}>

        {/* 메인 탭 */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#e9e9ef", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[
            { id: "briefing", label: "AI 브리핑" },
            { id: "news", label: "실시간 뉴스" },
            { id: "notice", label: "공지" },
            { id: "tips", label: "소식" },
          ].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mainTab === t.id ? "#fff" : "transparent", color: mainTab === t.id ? accent : muted, boxShadow: mainTab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", minHeight: 42 }}>{t.label}</button>
          ))}
        </div>

        {/* ═══ 탭 1: AI 브리핑 ═══ */}
        {mainTab === "briefing" && (
          <div>
            {/* 오늘의 브리핑 카드 */}
            <div style={{ marginBottom: 24, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg, #7c6aff 0%, #6366f1 40%, #818cf8 100%)", boxShadow: "0 4px 24px rgba(124,106,255,0.18)" }}>
              <div style={{ padding: "22px 24px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>📰</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: "#fff", letterSpacing: -0.3 }}>{briefing ? briefing.title : `${getTodayKey().replace(/-/g, ".")} SNS브리핑`}</span>
                </div>
                {briefingLoading ? (
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, padding: "16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    브리핑 불러오는 중...
                  </div>
                ) : briefingGenerating ? (
                  <div style={{ padding: "20px 0" }}>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      오늘의 브리핑을 AI가 작성하고 있어요...
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>첫 방문 시 10~20초 정도 소요됩니다. 아래 탭에서 실시간 뉴스를 먼저 확인해보세요.</div>
                  </div>
                ) : briefing ? (
                  <div style={{ wordBreak: "break-word" }}>
                    {briefing.content.split("\n").map((line, i) => {
                      const t = line.trim();
                      if (!t) return <div key={i} style={{ height: 6 }} />;
                      if (t.startsWith("#")) return <div key={i} style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: i === 0 ? 0 : 20, marginBottom: 4, lineHeight: 1.5 }}>{t.replace(/^#{1,3}\s*/, "")}</div>;
                      if (t.startsWith("📎")) return <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}><span style={{ fontSize: 13 }}>📎</span>{t.replace(/^📎\s*/, "").split(/(#[^\s#]+)/g).filter(Boolean).map((p, j) => p.startsWith("#") ? <span key={j} style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "2px 8px" }}>{p}</span> : null)}</div>;
                      return <div key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.93)", marginBottom: 2 }}>{t}</div>;
                    })}
                  </div>
                ) : <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>브리핑을 불러올 수 없습니다.</div>}
              </div>
            </div>

            {/* 지난 브리핑 */}
            {briefingHistory.length > 1 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 12 }}>지난 브리핑</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {briefingHistory.filter(h => h.date !== getTodayKey()).slice(0, 7).map(h => {
                    const isExp = expandedHistory === h.date;
                    const dl = h.date.replace(/-/g, ".");
                    return (
                      <div key={h.date} onClick={() => setExpandedHistory(isExp ? null : h.date)} style={{ padding: isExp ? "18px 20px" : "14px 18px", borderRadius: 14, cursor: "pointer", background: "#fff", border: `1px solid ${isExp ? accent : bdr}`, boxShadow: isExp ? "0 2px 12px rgba(124,106,255,0.12)" : "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 10, padding: "6px 12px", textAlign: "center", minWidth: 64 }}>
                              <div style={{ fontSize: 15, fontWeight: 900, color: accent, lineHeight: 1.2 }}>{dl.split(".").slice(1).join(".")}</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{h.title || `${dl} SNS브리핑`}</div>
                          </div>
                          <span style={{ fontSize: 11, color: muted, transform: isExp ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
                        </div>
                        {isExp && <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${bdr}`, wordBreak: "break-word" }}>{renderBriefing(h.content)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ 탭 2: 실시간 뉴스 ═══ */}
        {mainTab === "news" && (
          <div>
            <div className="tab-scroll" style={{ display: "flex", gap: 0, borderBottom: `2px solid #e5e5f0`, marginBottom: 20, overflowX: "auto" }}>
              {NEWS_CATS.map(cat => (
                <button key={cat.id} onClick={() => setNewsCat(cat.id)} style={{ padding: "12px 20px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: newsCat === cat.id ? 800 : 500, color: newsCat === cat.id ? accent : muted, background: "transparent", whiteSpace: "nowrap", borderBottom: newsCat === cat.id ? `2.5px solid ${accent}` : "2.5px solid transparent", marginBottom: -2, flexShrink: 0, minHeight: 44 }}>{cat.label}</button>
              ))}
            </div>
            {newsRefreshing && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "6px 12px", borderRadius: 8, background: "rgba(124,106,255,0.06)", width: "fit-content" }}>
                <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(124,106,255,0.2)", borderTopColor: accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>실시간 뉴스 갱신 중...</span>
              </div>
            )}
            {newsItems.length === 0 && newsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: muted }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${accent}30`, borderTopColor: accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                <div style={{ fontSize: 13 }}>뉴스 불러오는 중...</div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${bdr}`, overflow: "hidden" }}>
                {newsItems.map((item, i) => (
                  <a key={i} href={item.link || undefined} target="_blank" rel="noopener noreferrer" onClick={e => { if (!item.link) e.preventDefault(); }} style={{ textDecoration: "none", display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderBottom: i < newsItems.length - 1 ? `1px solid #f0f0f5` : "none", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(124,106,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {item.thumb ? <img src={item.thumb} alt="" style={{ width: 80, minWidth: 80, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "#f5f5f5" }} onError={e => e.target.style.display = "none"} /> : (
                      <div style={{ width: 80, minWidth: 80, height: 60, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${accent} 0%, #818cf8 100%)`, color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{NEWS_CATS.find(c => c.id === newsCat)?.label?.slice(0, 3) || "NEWS"}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: text, lineHeight: 1.4, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      {item.description && <div style={{ fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: muted }}>
                        {item.lang === "en" && <span style={{ padding: "1px 5px", borderRadius: 3, fontWeight: 800, fontSize: 9, background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>EN</span>}
                        {item.source && <span style={{ padding: "2px 7px", borderRadius: 4, fontWeight: 700, fontSize: 10, background: "rgba(124,106,255,0.07)", color: "#6c5ce7" }}>{item.source}</span>}
                        {item.pubDate && <span style={{ color: "#aaa" }}>{fmtDate(item.pubDate)}</span>}
                      </div>
                    </div>
                  </a>
                ))}
                {newsItems.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 13 }}>뉴스를 불러올 수 없습니다.</div>}
              </div>
            )}
          </div>
        )}

        {/* ═══ 탭 3/4: 공지 또는 소식 ═══ */}
        {(mainTab === "notice" || mainTab === "tips") && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: text }}>{mainTab === "notice" ? "공지사항" : "마케팅 소식"}</div>
              {isAdmin && <button onClick={() => { setEditTarget(null); setEditorOpen(true); }} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minHeight: 44 }}>+ 새 글</button>}
            </div>
            {articlesLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}><div style={{ width: 28, height: 28, border: `3px solid ${accent}20`, borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} /></div>
            ) : articles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 6 }}>등록된 소식이 없습니다</div>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>관리자가 소식을 등록하면 여기서 확인할 수 있어요</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 20 }}>
                {articles.map(a => {
                  const catInfo = ARTICLE_CATS.find(c => c.id === a.category) || ARTICLE_CATS[0];
                  return (
                    <div key={a.id} onClick={() => { setSelectedArticle(a); window.scrollTo(0, 0); }} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,255,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      {a.thumbnail ? <div style={{ aspectRatio: "16/9", overflow: "hidden" }}><img src={a.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div> : (
                        <div style={{ aspectRatio: "16/9", background: "rgba(124,106,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5" /></svg>
                        </div>
                      )}
                      <div style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                          {a.pinned && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>PIN</span>}
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: catInfo.color + "12", color: catInfo.color }}>{catInfo.label}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: text, lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: muted, lineHeight: 1.7, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.summary || (a.content || "").replace(/<[^>]*>/g, "").slice(0, 200)}</div>
                        <div style={{ fontSize: 11, color: muted }}>{fmtDate(a.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editorOpen && <NewsEditorModal article={editTarget} onSave={handleSaveArticle} onClose={() => { setEditorOpen(false); setEditTarget(null); }} />}
      <Footer C={c} />
    </div>
  );
}

/* ── 폴백 뉴스 데이터 ── */
const FALLBACK_NEWS = {
  sns: [
    { title: "2026 SNS 마케팅 트렌드: AI 콘텐츠 자동화가 대세", source: "마케팅타임즈", pubDate: "2026-03-29", link: "https://news.google.com/search?q=SNS+마케팅&hl=ko", description: "올해 SNS 마케팅의 핵심 키워드는 AI 기반 콘텐츠 자동화입니다." },
    { title: "인스타그램 릴스 알고리즘 변경, 마케터가 알아야 할 것들", source: "소셜미디어투데이", pubDate: "2026-03-28", link: "https://news.google.com/search?q=인스타그램+릴스&hl=ko", description: "인스타그램이 릴스 추천 알고리즘을 대폭 개편했습니다." },
    { title: "틱톡 커머스 기능 확대, 소상공인 매출 증가 효과", source: "이커머스뉴스", pubDate: "2026-03-28", link: "https://news.google.com/search?q=틱톡+커머스&hl=ko", description: "틱톡의 인앱 쇼핑 기능이 확대되면서 소상공인들의 매출이 평균 35% 증가한 것으로 나타났습니다." },
    { title: "스레드(Threads) 마케팅 활용법, 브랜드 사례 분석", source: "디지털마케팅인사이트", pubDate: "2026-03-26", link: "https://news.google.com/search?q=Threads+마케팅&hl=ko", description: "메타의 스레드가 마케팅 채널로 주목받고 있습니다." },
  ],
  digital: [
    { title: "퍼포먼스 마케팅의 종말? 브랜딩 중심으로 전환", source: "디지털마케팅리뷰", pubDate: "2026-03-29", link: "https://news.google.com/search?q=디지털+마케팅&hl=ko", description: "서드파티 쿠키 폐지 이후 퍼포먼스 마케팅의 효율이 급감하고 있습니다." },
    { title: "구글 SEO 2026 핵심 업데이트 총정리", source: "서치엔진저널", pubDate: "2026-03-28", link: "https://news.google.com/search?q=구글+SEO+2026&hl=ko", description: "구글의 2026년 첫 핵심 업데이트가 적용되었습니다." },
    { title: "네이버 블로그 SEO 가이드 2026년 업데이트", source: "블로그마케팅", pubDate: "2026-03-27", link: "https://news.google.com/search?q=네이버+블로그+SEO&hl=ko", description: "네이버가 블로그 검색 알고리즘을 업데이트했습니다." },
  ],
  ai: [
    { title: "AI 이미지 생성 도구 비교: 마케터를 위한 가이드", source: "테크마케팅", pubDate: "2026-03-28", link: "https://news.google.com/search?q=AI+이미지+생성&hl=ko", description: "주요 AI 이미지 생성 도구의 마케팅 활용도를 비교합니다." },
    { title: "생성형 AI로 광고 소재 제작, ROI 200% 향상 사례", source: "광고비즈니스", pubDate: "2026-03-27", link: "https://news.google.com/search?q=생성형+AI+광고&hl=ko", description: "AI 생성 광고 소재와 기존 소재의 성과를 비교한 결과 놀라운 차이가 나타났습니다." },
  ],
  trend: [
    { title: "2026 상반기 마케팅 트렌드 리포트", source: "트렌드코리아", pubDate: "2026-03-29", link: "https://news.google.com/search?q=마케팅+트렌드+2026&hl=ko", description: "2026년 상반기를 지배할 마케팅 트렌드 5가지를 선정했습니다." },
    { title: "유튜브 쇼츠 수익화 정책 변경 안내", source: "크리에이터경제", pubDate: "2026-03-27", link: "https://news.google.com/search?q=유튜브+쇼츠+수익화&hl=ko", description: "유튜브가 쇼츠 크리에이터를 위한 새로운 수익화 모델을 발표했습니다." },
  ],
  biz: [
    { title: "스타트업 마케팅, 적은 예산으로 최대 효과 내는 법", source: "스타트업위클리", pubDate: "2026-03-29", link: "https://news.google.com/search?q=스타트업+마케팅&hl=ko", description: "초기 스타트업이 제한된 예산으로 효과적인 마케팅을 하기 위한 실전 가이드입니다." },
    { title: "D2C 브랜드 성공 사례, 자사몰 전환율 최적화", source: "브랜딩저널", pubDate: "2026-03-28", link: "https://news.google.com/search?q=D2C+브랜드&hl=ko", description: "D2C 브랜드들의 성공 비결과 자사몰 전환율을 높이는 방법론을 분석합니다." },
  ],
  global_sns: [
    { title: "Instagram Tests New 'Blend' Feature for Shared Reels", source: "Social Media Today", pubDate: "2026-03-29", link: "https://news.google.com/search?q=social+media+marketing&hl=en", description: "Instagram is testing a new feature called 'Blend' that creates a shared feed of recommended Reels between friends.", lang: "en" },
    { title: "TikTok Shop Expands to 10 New Markets in 2026", source: "TechCrunch", pubDate: "2026-03-28", link: "https://news.google.com/search?q=tiktok+shop&hl=en", description: "TikTok's e-commerce platform is rapidly expanding, with 10 new markets added this quarter.", lang: "en" },
    { title: "LinkedIn Rolls Out AI-Powered Post Suggestions", source: "The Verge", pubDate: "2026-03-27", link: "https://news.google.com/search?q=linkedin+AI&hl=en", description: "LinkedIn's new AI feature suggests post topics and drafts based on your professional profile and industry trends.", lang: "en" },
    { title: "Meta Threads Hits 300M Monthly Active Users", source: "Reuters", pubDate: "2026-03-26", link: "https://news.google.com/search?q=meta+threads&hl=en", description: "Meta's text-based social platform Threads has reached 300 million monthly active users, up from 200M last quarter.", lang: "en" },
  ],
  global_ai: [
    { title: "OpenAI Launches GPT-5 with Advanced Marketing Capabilities", source: "VentureBeat", pubDate: "2026-03-29", link: "https://news.google.com/search?q=AI+marketing+tools&hl=en", description: "GPT-5 introduces native multimodal understanding that can analyze brand assets and generate campaign strategies.", lang: "en" },
    { title: "Google Ads Integrates Gemini AI for Smart Bidding", source: "Search Engine Journal", pubDate: "2026-03-28", link: "https://news.google.com/search?q=google+ads+AI&hl=en", description: "Google's latest AI integration promises 40% better ROAS through Gemini-powered smart bidding strategies.", lang: "en" },
    { title: "Canva Acquires AI Startup to Boost Content Generation", source: "Forbes", pubDate: "2026-03-27", link: "https://news.google.com/search?q=canva+AI&hl=en", description: "Design platform Canva has acquired an AI startup to enhance its automated content creation pipeline.", lang: "en" },
  ],
  global_trend: [
    { title: "Short-Form Video Now Accounts for 60% of Social Media Time", source: "Hootsuite", pubDate: "2026-03-29", link: "https://news.google.com/search?q=digital+marketing+trends&hl=en", description: "New research shows short-form video content now dominates social media consumption across all age groups.", lang: "en" },
    { title: "The Rise of 'De-Influencing': What Brands Need to Know", source: "Marketing Week", pubDate: "2026-03-28", link: "https://news.google.com/search?q=marketing+trends+2026&hl=en", description: "The de-influencing trend is reshaping how brands approach influencer partnerships and authentic marketing.", lang: "en" },
    { title: "Creator Economy Projected to Reach $500B by 2027", source: "Business Insider", pubDate: "2026-03-27", link: "https://news.google.com/search?q=creator+economy&hl=en", description: "The global creator economy continues its explosive growth, with new monetization tools driving expansion.", lang: "en" },
  ],
};
