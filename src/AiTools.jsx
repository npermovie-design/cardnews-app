import { useState, useEffect, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import BlogGenerator from "./BlogGenerator";
import NewsBlogGenerator from "./NewsBlogGenerator";
import YtBlogGenerator from "./YtBlogGenerator";
import SnsConnectionManager from "./SnsConnectionManager";
import { InstaAutoReply, InstaAutoDM, TabHeader } from "./AiInstagram.jsx";
import { getAiUsage, setAiUsage, getAiLeft, FREE_MEMBER, FREE_GUEST, changePoints } from "./storage";

/* ════════════════════════════════════════════════════════════
   AI 도구 모듈: RepurposePage, MarketingHub, FileTranscriber,
   UnifiedBlogWriter, LinkBlogCombined
════════════════════════════════════════════════════════════ */

function RepurposePage({ isDark, user, onLoginRequest, onUserUpdate, showPointConfirm }) {
  const [sourceType, setSourceType] = useState("text"); // "text" | "url"
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [formats, setFormats] = useState({
    insta: true, thread: true, cardnews: true, naver: false, shorts: false,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { insta, thread, cardnews, naver, shorts }
  const [activeTab, setActiveTab] = useState("insta");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  const FORMAT_LIST = [
    { id: "insta",    label: "인스타그램 캡션", desc: "해시태그 포함" },
    { id: "thread",   label: "스레드 포스트", desc: "280자 이내" },
    { id: "cardnews", label: "카드뉴스 슬라이드 기획", desc: "5-7장" },
    { id: "naver",    label: "네이버 블로그", desc: "SEO 최적화" },
    { id: "shorts",   label: "유튜브 숏폼 대본", desc: "60초 이내" },
  ];

  const selectedCount = Object.values(formats).filter(Boolean).length;

  // URL에서 콘텐츠 가져오기
  const fetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setFetchingUrl(true); setError("");
    try {
      const res = await fetch(`/api/content?action=fetch-url-content&url=${encodeURIComponent(sourceUrl.trim())}`);
      if (!res.ok) throw new Error("URL에서 콘텐츠를 가져올 수 없습니다.");
      const data = await res.json();
      setSourceText(data.content || data.text || "");
      setSourceType("text");
    } catch (e) {
      setError(e.message || "URL 가져오기 실패");
    } finally {
      setFetchingUrl(false);
    }
  };

  // AI 변환 실행
  const handleGenerate = async () => {
    if (!sourceText.trim()) { setError("원본 콘텐츠를 입력해주세요."); return; }
    if (selectedCount === 0) { setError("최소 1개 이상의 형식을 선택해주세요."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (!(await showPointConfirm(35))) return;

    setError(""); setLoading(true); setResults(null);

    try {
      // 포인트 차감 (35P - AI_SONNET)
      const info = getAiLeft(user);
      const freeLimit = user ? FREE_MEMBER : FREE_GUEST;
      if (info.used >= freeLimit) {
        const { changePoints } = await import("./storage");
        const newPts = await changePoints(user.uid, -35, "콘텐츠 리퍼포징");
        if (onUserUpdate) onUserUpdate({ ...user, points: newPts });
      }

      const selectedFormats = FORMAT_LIST.filter(f => formats[f.id]);
      const formatInstructions = selectedFormats.map(f => {
        if (f.id === "insta") return `[인스타그램 캡션]\n- 감성적이고 읽기 쉬운 캡션 작성\n- 관련 해시태그 15-20개 포함\n- 줄바꿈 활용하여 가독성 높이기`;
        if (f.id === "thread") return `[스레드 포스트]\n- 280자 이내로 핵심만 전달\n- 임팩트 있는 한 줄 또는 짧은 문단\n- 대화체, 반말 OK`;
        if (f.id === "cardnews") return `[카드뉴스 슬라이드 기획]\n- 5~7장 슬라이드 구성\n- 각 슬라이드별 제목(14자 이내)과 본문(50자 이내) 작성\n- 표지 + 핵심 내용 + 마무리 구조`;
        if (f.id === "naver") return `[네이버 블로그]\n- SEO 키워드 자연스럽게 포함\n- 서론/본론/결론 구조\n- 1500~2000자 분량\n- 소제목(##) 활용`;
        if (f.id === "shorts") return `[유튜브 숏폼 대본]\n- 60초 이내 분량\n- 훅(첫 3초) → 핵심 내용 → CTA 구조\n- 구어체, 직접 말하는 톤`;
        return "";
      }).join("\n\n");

      const prompt = `당신은 콘텐츠 리퍼포징 전문가입니다. 아래 원본 콘텐츠를 각 플랫폼에 맞게 변환해주세요.

## 원본 콘텐츠
${sourceText.trim()}

## 변환할 형식과 지침
${formatInstructions}

## 출력 형식
각 형식을 아래와 같이 구분하여 작성해주세요:
${selectedFormats.map(f => `====${f.id}====\n(${f.label} 내용)`).join("\n\n")}

중요: 각 형식의 시작은 반드시 ===={형식id}==== 로 시작하세요. 자연스럽고 한국어로 작성해주세요.`;

      const { callAI } = await import("./aiClient");
      const aiResult = await callAI(
        "claude-sonnet-4-5",
        [{ role: "user", content: prompt }],
        6000
      );

      // 결과 파싱
      const parsed = {};
      selectedFormats.forEach(f => {
        const regex = new RegExp(`====${f.id}====\\s*([\\s\\S]*?)(?=====\\w+====|$)`);
        const match = aiResult.match(regex);
        parsed[f.id] = match ? match[1].trim() : "";
      });

      setResults(parsed);
      // 첫 번째 결과 탭으로 이동
      const firstKey = selectedFormats[0]?.id;
      if (firstKey) setActiveTab(firstKey);

      // 사용량 기록
      const usage = getAiUsage();
      const key = user ? "member_" + user.uid : "guest";
      setAiUsage({ ...usage, [key]: (usage[key] || 0) + 1 });
    } catch (e) {
      setError(e.message || "변환 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id) => {
    if (!results?.[id]) return;
    navigator.clipboard.writeText(results[id]).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ flexShrink: 0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: text, marginBottom: 3 }}>콘텐츠 리퍼포징</div>
            <div style={{ fontSize: 12, color: muted }}>하나의 콘텐츠를 여러 플랫폼에 맞게 자동 변환합니다 (35P)</div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 60px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* 소스 입력 영역 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>원본 콘텐츠</div>

            {/* 탭: 직접 입력 / URL */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { id: "text", label: "직접 입력" },
                { id: "url", label: "URL에서 가져오기" },
              ].map(t => (
                <button key={t.id} onClick={() => setSourceType(t.id)}
                  style={{
                    padding: "7px 16px", borderRadius: 8, border: `1px solid ${sourceType === t.id ? accent : bdr}`,
                    background: sourceType === t.id ? (isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.08)") : "transparent",
                    color: sourceType === t.id ? accent : muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {sourceType === "url" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://blog.naver.com/... 또는 유튜브, 뉴스 URL"
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`,
                    background: isDark ? "rgba(255,255,255,0.06)" : "#fff", color: text, fontSize: 13, outline: "none",
                  }} />
                <button onClick={fetchUrl} disabled={fetchingUrl}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: accent, color: "#fff", fontSize: 12, fontWeight: 700, opacity: fetchingUrl ? 0.6 : 1, whiteSpace: "nowrap",
                  }}>
                  {fetchingUrl ? "가져오는 중..." : "가져오기"}
                </button>
              </div>
            )}

            <textarea value={sourceText} onChange={e => setSourceText(e.target.value)}
              placeholder="블로그 글, 기사, SNS 포스트 등 원본 콘텐츠를 붙여넣으세요..."
              style={{
                width: "100%", minHeight: 180, padding: "14px 16px", borderRadius: 12,
                border: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                color: text, fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none",
                fontFamily: "inherit",
              }} />
            <div style={{ fontSize: 11, color: muted, marginTop: 4, textAlign: "right" }}>
              {sourceText.length.toLocaleString()}자
            </div>
          </div>

          {/* 형식 선택 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 10 }}>변환 형식 선택</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {FORMAT_LIST.map(f => {
                const checked = formats[f.id];
                return (
                  <label key={f.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      borderRadius: 10, border: `1px solid ${checked ? accent + "60" : bdr}`,
                      background: checked ? (isDark ? "rgba(124,106,255,0.1)" : "rgba(124,106,255,0.04)") : cardBg,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => setFormats(p => ({ ...p, [f.id]: !p[f.id] }))}
                      style={{ accentColor: accent, width: 16, height: 16, cursor: "pointer" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: muted }}>{f.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>{selectedCount}개 형식 선택됨</div>
          </div>

          {/* 에러 */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* 생성 버튼 */}
          <button onClick={handleGenerate} disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "default" : "pointer",
              background: loading ? (isDark ? "rgba(124,106,255,0.3)" : "rgba(124,106,255,0.4)") : `linear-gradient(135deg,${accent},#8b5cf6)`,
              color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 28,
              boxShadow: loading ? "none" : `0 6px 24px ${accent}40`,
              opacity: loading ? 0.7 : 1, transition: "all 0.2s",
            }}>
            {loading ? "변환 중..." : `한 번에 변환하기 (${selectedCount}개 형식 · 35P)`}
          </button>

          {/* 결과 영역 */}
          {results && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 12 }}>변환 결과</div>

              {/* 탭 */}
              <div style={{ display: "flex", gap: 2, marginBottom: 16, overflowX: "auto", borderBottom: `1px solid ${bdr}` }}>
                {FORMAT_LIST.filter(f => results[f.id] !== undefined).map(f => {
                  const active = activeTab === f.id;
                  return (
                    <button key={f.id} onClick={() => setActiveTab(f.id)}
                      style={{
                        padding: "9px 16px", border: "none", cursor: "pointer", background: "transparent",
                        color: active ? accent : muted, fontSize: 13, fontWeight: active ? 700 : 400,
                        borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                        marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.15s",
                      }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* 결과 내용 */}
              {FORMAT_LIST.filter(f => f.id === activeTab && results[f.id]).map(f => (
                <div key={f.id} style={{ borderRadius: 12, border: `1px solid ${bdr}`, background: cardBg, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${bdr}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{f.label}</span>
                    <button onClick={() => handleCopy(f.id)}
                      style={{
                        padding: "5px 14px", borderRadius: 7, border: `1px solid ${copied === f.id ? "#4ade8060" : bdr}`,
                        background: copied === f.id ? "rgba(74,222,128,0.1)" : "transparent",
                        color: copied === f.id ? "#4ade80" : muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>
                      {copied === f.id ? "복사 완료" : "복사"}
                    </button>
                  </div>
                  <div style={{ padding: "16px", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: text }}>
                    {results[f.id]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MENU_LABELS = {
  home: "AI 생성기", library: "내 보관함",
  blog_write: "글쓰기",
  blog_naver_intro: "글쓰기", blog_naver: "글쓰기",
  blog_tistory_intro: "글쓰기", blog_tistory: "글쓰기",
  blog_insta_intro: "글쓰기", blog_insta: "글쓰기",
  blog_youtube_intro: "글쓰기", blog_youtube: "글쓰기",
  blog_thread_intro: "글쓰기", blog_thread: "글쓰기",
  blog_cafe_intro: "글쓰기", blog_cafe: "글쓰기",
  blog_yt_blog_intro: "글쓰기", blog_yt_blog: "글쓰기",
  blog_news_intro: "글쓰기", blog_news: "글쓰기",
  blog_link_intro: "글쓰기", blog_link: "글쓰기",
  cardnews_simple: "카드뉴스", cardnews_simple_make: "카드뉴스",
  detail_simple: "상세페이지", detail_simple_make: "상세페이지", detail_simple_open: "상세페이지",
  thumbnail_gen: "썸네일 생성", thumbnail_gen_make: "썸네일 생성",
  seo_home: "실시간 분석", seo_blog: "블로그 분석", seo_youtube: "유튜브 분석", seo_tistory: "티스토리 분석",
  logo_gen: "로고 생성", mockup_gen: "목업 생성", product_shot: "제품컷 생성",
  blog_cafe_make: "네이버 카페",
  model_gen: "모델 생성", model_gen_make: "모델 생성",
  skin_retouch: "피부 보정", skin_retouch_make: "피부 보정",
  face_swap: "얼굴 교체", face_swap_make: "얼굴 교체",
  outfit_swap: "의상 교체", outfit_swap_make: "의상 교체",
  outpaint: "여백 늘리기", outpaint_make: "여백 늘리기",
  shorts: "숏폼편집",
  content_create: "콘텐츠 제작",
  image_create: "이미지 생성",
  image_edit: "이미지 수정",
  hot_keyword: "SNS 뉴스",
  prompt_studio: "비즈니스 문서",
  ppt_gen: "PPT 제작",
  marketing: "마케팅",
  insta_auto_dm: "마케팅",
  insta_auto_reply: "마케팅",
  sns_analysis: "마케팅",
  analysis_insta: "마케팅",
  analysis_tiktok: "마케팅",
  analysis_youtube: "마케팅",
  repurpose: "원소스 멀티유즈",
};

/* ── 통합 글쓰기 (플랫폼 선택 탭) ── */
const WRITE_PLATFORMS = [
  { id: "blog_naver",   label: "네이버 블로그", type: "blog_naver",  icon: "/icon-naver-blog.png" },
  { id: "blog_cafe",    label: "네이버 카페",  type: "blog_cafe",    icon: "/icon-naver-cafe.webp" },
  { id: "blog_tistory", label: "티스토리",     type: "blog_tistory", icon: "/icon-tistory.png" },
  { id: "blog_insta",   label: "인스타그램",   type: "blog_insta",   icon: "/icon-instagram.webp" },
  { id: "blog_thread",  label: "스레드",       type: "blog_thread",  icon: "/icon-threads.png" },
  { id: "_sep_link", separator: true, label: "링크에서 변환" },
  { id: "link_youtube", label: "유튜브",   link: true, linkTab: "youtube", icon: "/icon-youtube.png" },
  { id: "link_news",    label: "뉴스 기사", link: true, linkTab: "news" },
  { id: "link_blog",    label: "블로그",   link: true, linkTab: "blog", icon: "/icon-naver-blog.png" },
  { id: "link_sns",     label: "SNS",      link: true, linkTab: "sns",  icon: "/icon-instagram.webp" },
];

/* ── 통합 탭 헤더 (글쓰기 / 링크 글쓰기 공용) ── */

/* MARKETING_TABS - insta_auto_reply, insta_auto_dm 숨김 처리 (미구현) */
const MARKETING_TABS = [
  { id: "sns_analysis",  label: "SNS 분석",      icon: "/icon-instagram.webp" },
  // { id: "insta_auto_reply", label: "스레드 자동댓글",  icon: "/icon-threads.png" },  // 미구현 - 숨김
  // { id: "insta_auto_dm", label: "인스타 자동DM", icon: "/icon-threads.png" },        // 미구현 - 숨김
];

function MarketingHub({ theme, isDark, user, C, navigate, onUserUpdate, defaultTab }) {
  /* SNS 분석만 남아있으므로 탭 없이 직접 렌더링 */
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", padding:"16px 24px 12px", textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:3 }}>마케팅</div>
        <div style={{ fontSize:12, color:muted }}>경쟁사 SNS 분석 도구를 활용해보세요</div>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        <ViralityAnalyzer isDark={isDark} />
      </div>
    </div>
  );
}

/* ── 파일 받아쓰기 컴포넌트 ── */
const FILE_TEMPLATES = [
  { id:"info",    icon:"📋", label:"정보성 글",     desc:"정보/노하우/가이드" },
  { id:"visit",   icon:"📍", label:"체험/방문후기", desc:"장소/매장 방문 후기" },
  { id:"travel",  icon:"✈️",  label:"여행 후기",     desc:"국내외 여행 기록" },
  { id:"product", icon:"📦", label:"제품 후기",     desc:"제품/서비스 리뷰" },
  { id:"column",  icon:"📰", label:"칼럼",         desc:"전문 의견/분석 글" },
  { id:"article", icon:"🗞️",  label:"기사 방식",     desc:"뉴스 기사 스타일" },
];

function FileTranscriber({ isDark, user, onLoginRequest, onUserUpdate, showPointConfirm }) {
  const D = isDark;
  const text = D ? "#e8eaed" : "#1a1a2e";
  const muted = D ? "rgba(255,255,255,0.5)" : "#888";
  const bdr = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const accent = "#7c6aff";
  const ibg = D ? "rgba(255,255,255,0.06)" : "#f9f9fc";
  const card = D ? "rgba(255,255,255,0.05)" : "#fff";
  const accentBg = D ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)";

  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [audioMode, setAudioMode] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [manualText, setManualText] = useState("");
  const fileRef = useRef(null);

  const cardStyle = { background: card, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, marginBottom: 12 };
  const inputStyle = { width:"100%", padding:"11px 14px", borderRadius:10, border:`1px solid ${bdr}`, background:ibg, color:text, fontSize:13, outline:"none" };
  const btnStyle = { padding:"14px", borderRadius:12, border:"none", cursor:"pointer", fontSize:15, fontWeight:900, width:"100%", background:`linear-gradient(135deg,${accent},#8b5cf6)`, color:"#fff" };

  // 파일 업로드 처리
  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("파일은 10MB 이하만 가능합니다."); return; }
    setFile(f);
    setError("");
    setAnalyzing(true);
    setFileContent("");
    setResult("");
    setSelectedTemplate(null);
    try {
      const { callAI } = await import("./aiClient");
      if (f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i.test(f.name)) {
        // 음성 파일 → 브라우저 재생 + SpeechRecognition으로 자동 전사
        const audioUrl = URL.createObjectURL(f);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setFileContent("🎤 음성 파일: " + f.name + "\n\n이 브라우저에서는 음성 인식이 지원되지 않습니다.\n크롬 브라우저에서 다시 시도해주세요.\n\n또는 아래에 음성 내용을 직접 입력해주세요:");
          setAudioMode(true);
          URL.revokeObjectURL(audioUrl);
        } else {
          setFileContent("🎤 음성 파일 인식 준비 완료: " + f.name + "\n\n아래 '음성 인식 시작' 버튼을 눌러 재생하면 자동으로 텍스트로 변환됩니다.\n또는 직접 내용을 입력할 수도 있습니다.");
          setAudioUrl(audioUrl);
          setAudioMode(true);
        }
      } else if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[
          {type:"image",source:{type:"base64",media_type:f.type,data:base64.split(",")[1]}},
          {type:"text",text:"이 이미지의 내용을 한국어로 상세히 설명해주세요. 텍스트가 있다면 모두 추출하고, 이미지의 주제와 내용을 자세히 기술해주세요."}
        ]}], 1500);
        setFileContent(txt);
      } else {
        const rawText = await f.text();
        const content = rawText.slice(0, 5000);
        setFileContent(content);
      }
    } catch (err) {
      setError("파일 분석 중 오류: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 템플릿 선택 후 글 생성
  const generateFromTemplate = async (tmpl) => {
    if (!fileContent.trim()) { setError("파일 내용이 없습니다."); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (showPointConfirm && !(await showPointConfirm(10))) return;
    setSelectedTemplate(tmpl);
    setGenerating(true);
    setResult("");
    setError("");
    try {
      const { callAIStream } = await import("./aiClient");
      const templatePrompts = {
        info: "정보성 블로그 글 (유용한 정보/노하우/가이드 형식, 검색 최적화 제목 포함, 소제목으로 구분된 체계적 구성)",
        visit: "체험/방문후기 형식 글 (방문 전 기대 → 방문 과정 → 솔직 총평, 장단점 명확, 재방문 의사 포함)",
        travel: "여행 후기 형식 글 (일정별 구조화, 맛집/명소/교통 정보, 실제 여행자 감성, 예산 팁 포함)",
        product: "제품 후기 형식 글 (구매 전 고민 → 언박싱 → 실사용기, 장단점 비교, 추천 대상/가성비 총평)",
        column: "전문 칼럼 형식 글 (주장 → 근거 → 반론 → 결론, 데이터/사례/통계 인용, 논리적 전개)",
        article: "뉴스 기사 방식 글 (역피라미드 구조, 5W1H 포함, 객관적 사실 기반, 보도 형식)",
      };
      const prompt = `다음 파일 내용을 기반으로 ${templatePrompts[tmpl] || "블로그 글"}로 변환해주세요.

[파일 내용]
${fileContent.slice(0, 4000)}

[작성 규칙]
- 2,000~3,000자 분량
- 한국어로 작성
- 소제목 3~5개로 구조화
- 자연스러운 문체
- 글 맨 앞에 SEO 최적화 제목 포함
- 마지막에 해시태그 10개 추가
- 이모티콘/이모지/마크다운 사용 금지, 순수 텍스트만`;

      await callAIStream("claude-haiku-4-5", [{role:"user",content:prompt}], 4000, (accumulated) => {
        setResult(accumulated);
      });
    } catch (err) {
      setError("글 생성 중 오류: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // 다운로드 기능
  const downloadTxt = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.txt"; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadDoc = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>글 받아쓰기</title></head><body style="font-family:'맑은 고딕',sans-serif;font-size:12pt;line-height:1.8;">${result.split("\n").map(l => l.trim() ? `<p>${l}</p>` : "<br>").join("")}</body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.doc"; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPdf = () => {
    const lines = result.split("\n");
    let y = 50;
    const pageW = 595, pageH = 842, margin = 50, lineH = 18, maxW = pageW - margin * 2;
    let pages = [[]];
    let curPage = 0;
    for (const line of lines) {
      if (y + lineH > pageH - margin) { pages.push([]); curPage++; y = margin; }
      // 한 줄이 길면 줄바꿈 (약 40자 단위)
      const chunks = [];
      if (line.length > 40) {
        for (let i = 0; i < line.length; i += 40) chunks.push(line.slice(i, i + 40));
      } else {
        chunks.push(line || " ");
      }
      for (const chunk of chunks) {
        if (y + lineH > pageH - margin) { pages.push([]); curPage++; y = margin; }
        pages[curPage].push({ text: chunk, y });
        y += lineH;
      }
    }
    // 간단한 PDF 생성 (텍스트 전용)
    let pdf = "%PDF-1.4\n";
    const objs = [];
    const addObj = (content) => { objs.push({ offset: pdf.length, content }); pdf += `${objs.length} 0 obj\n${content}\nendobj\n`; };
    // 1: Catalog
    addObj(`<< /Type /Catalog /Pages 2 0 R >>`);
    // 2: Pages
    const pageRefs = pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ");
    addObj(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
    // 3: Font
    addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    // Pages + Contents
    for (let p = 0; p < pages.length; p++) {
      const contentIdx = 4 + p * 2 + 1;
      const pageIdx = 4 + p * 2;
      // 텍스트를 ASCII로 변환 (한글은 ?로 대체 - 기본 PDF 폰트 제한)
      const streamLines = [`BT /F1 11 Tf`];
      for (const item of pages[p]) {
        const safe = item.text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
        streamLines.push(`${margin} ${pageH - item.y} Td (${safe}) Tj`);
        streamLines.push(`${-margin} ${-(pageH - item.y)} Td`);
      }
      streamLines.push("ET");
      const stream = streamLines.join("\n");
      addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentIdx} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
      addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    }
    const xrefOff = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of objs) pdf += `${String(o.offset).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "글_받아쓰기.pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex:1, overflowY:"auto", background: D ? "transparent" : "#f4f4f8" }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 20px 60px" }}>

        {/* 파일 업로드 영역 */}
        {!result && (
          <div style={cardStyle}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:8 }}>파일 업로드</div>
            <div style={{ fontSize:12, color:muted, marginBottom:12, lineHeight:1.6 }}>
              이미지, PDF, TXT, 음성 파일을 업로드하면 AI가 내용을 분석하고 원하는 형식의 글로 변환해줘요
            </div>
            <div onClick={() => fileRef.current?.click()}
              style={{ border:`2px dashed ${bdr}`, borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", background:ibg, transition:"border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = bdr}>
              <div style={{ width:56, height:56, borderRadius:16, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <span style={{ fontSize:24 }}>📄</span>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:text }}>클릭하여 파일을 선택하세요</div>
              <div style={{ fontSize:12, color:muted, marginTop:4 }}>이미지 (JPG, PNG), PDF, TXT, 음성 (MP3, WAV, M4A) (최대 10MB)</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx,audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac" style={{ display:"none" }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; handleFile(f); }} />
            {file && (
              <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:accentBg, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14 }}>📎</span>
                <span style={{ fontSize:13, fontWeight:700, color:accent, flex:1 }}>{file.name}</span>
                <span style={{ fontSize:11, color:muted }}>{(file.size / 1024).toFixed(0)}KB</span>
              </div>
            )}
          </div>
        )}

        {/* 분석 중 */}
        {analyzing && (
          <div style={{ ...cardStyle, textAlign:"center", padding:32 }}>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:8 }}>파일 분석 중...</div>
            <div style={{ fontSize:13, color:muted }}>AI가 파일 내용을 읽고 있어요</div>
          </div>
        )}

        {/* 음성 파일 모드 → 재생+인식 또는 직접 입력 */}
        {audioMode && !result && !analyzing && (
          <div style={cardStyle}>
            <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12 }}>🎤 음성 내용 입력</div>
            {audioUrl && (
              <div style={{ marginBottom:12 }}>
                <audio src={audioUrl} controls style={{ width:"100%", borderRadius:10 }} />
                <button onClick={async () => {
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) { setError("크롬 브라우저에서 시도해주세요."); return; }
                  setTranscribing(true);
                  const recognition = new SR();
                  recognition.lang = "ko-KR"; recognition.continuous = true; recognition.interimResults = true;
                  let finalText = "";
                  recognition.onresult = (e) => {
                    let t = "";
                    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
                    finalText = t;
                    setManualText(t);
                  };
                  recognition.onerror = () => { setTranscribing(false); setError("음성 인식 중 오류가 발생했습니다."); };
                  recognition.onend = () => { setTranscribing(false); if (finalText) setFileContent(finalText); };
                  recognition.start();
                  // 오디오 재생
                  const audioEl = document.querySelector("audio");
                  if (audioEl) { audioEl.currentTime = 0; audioEl.play(); }
                  // 60초 후 자동 정지
                  setTimeout(() => { try { recognition.stop(); } catch {} }, 60000);
                }} disabled={transcribing}
                  style={{ ...btnStyle, marginTop:8, background: transcribing ? "#888" : `linear-gradient(135deg,#22c55e,#16a34a)`, opacity: transcribing ? 0.7 : 1 }}>
                  {transcribing ? "🎧 인식 중... (재생하며 인식합니다)" : "🎙️ 음성 인식 시작 (재생하며 자동 변환)"}
                </button>
              </div>
            )}
            <div style={{ fontSize:12, color:muted, marginBottom:6 }}>또는 음성 내용을 직접 입력/붙여넣기:</div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)}
              placeholder="음성 파일의 내용을 여기에 입력해주세요..."
              style={{ ...inputStyle, minHeight:120, resize:"vertical", lineHeight:1.7 }} />
            <button onClick={() => { if (manualText.trim()) { setFileContent(manualText); setAudioMode(false); } else { setError("내용을 입력해주세요."); } }}
              style={{ ...btnStyle, marginTop:10 }}>
              ✓ 내용 확인 → 템플릿 선택
            </button>
          </div>
        )}

        {/* 파일 분석 완료 → 템플릿 선택 */}
        {fileContent && !audioMode && !result && !analyzing && (
          <>
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:6 }}>분석된 내용 미리보기</div>
              <div style={{ fontSize:12, color:muted, lineHeight:1.8, maxHeight:150, overflowY:"auto", padding:"10px 12px", borderRadius:10, background:ibg, border:`1px solid ${bdr}`, whiteSpace:"pre-wrap" }}>
                {fileContent.slice(0, 500)}{fileContent.length > 500 ? "..." : ""}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:6 }}>글 형식 선택</div>
              <div style={{ fontSize:12, color:muted, marginBottom:12 }}>어떤 형식으로 글을 변환할까요?</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8 }}>
                {FILE_TEMPLATES.map(t => {
                  const isA = selectedTemplate === t.id;
                  return (
                    <button key={t.id} onClick={() => generateFromTemplate(t.id)}
                      disabled={generating}
                      style={{ padding:"14px", borderRadius:12, textAlign:"left", cursor: generating ? "not-allowed" : "pointer",
                        border: isA ? `2px solid ${accent}` : `2px solid ${bdr}`,
                        background: isA ? accentBg : ibg, opacity: generating && !isA ? 0.5 : 1, transition:"all 0.15s" }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>{t.icon}</div>
                      <div style={{ fontSize:13, fontWeight:700, color: isA ? accent : text }}>{t.label}</div>
                      <div style={{ fontSize:11, color:muted, marginTop:2 }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 생성 중 */}
        {generating && !result && (
          <div style={{ ...cardStyle, textAlign:"center", padding:32 }}>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:8 }}>글 생성 중...</div>
            <div style={{ fontSize:13, color:muted }}>선택한 형식에 맞게 변환하고 있어요</div>
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <>
            <div style={cardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:800, color:text }}>변환 결과</div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => { navigator.clipboard.writeText(result); }}
                    style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    복사
                  </button>
                </div>
              </div>
              <div style={{ fontSize:13, color:text, lineHeight:2, maxHeight:500, overflowY:"auto", padding:"14px 16px", borderRadius:10, background:ibg, border:`1px solid ${bdr}`, whiteSpace:"pre-wrap" }}>
                {result}
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <div style={cardStyle}>
              <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:10 }}>다운로드</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                <button onClick={downloadTxt} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📝</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>TXT</div>
                  <div style={{ fontSize:10, color:muted }}>텍스트 파일</div>
                </button>
                <button onClick={downloadDoc} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📄</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>DOCX</div>
                  <div style={{ fontSize:10, color:muted }}>워드 문서</div>
                </button>
                <button onClick={downloadPdf} style={{ padding:"12px 8px", borderRadius:10, border:`1.5px solid ${bdr}`, background:ibg, cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>📕</div>
                  <div style={{ fontSize:12, fontWeight:700, color:text }}>PDF</div>
                  <div style={{ fontSize:10, color:muted }}>PDF 문서</div>
                </button>
              </div>
            </div>

            {/* 다시 하기 */}
            <button onClick={() => { setFile(null); setFileContent(""); setResult(""); setSelectedTemplate(null); setError(""); }}
              style={{ ...btnStyle, background:"transparent", border:`1.5px solid ${bdr}`, color:muted, marginTop:8 }}>
              다른 파일로 다시 하기
            </button>
          </>
        )}

        {error && <div style={{ marginTop:12, padding:14, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}>{error}</div>}
      </div>
    </div>
  );
}

function UnifiedBlogWriter({ theme, isDark, user, onLoginRequest, onUserUpdate, showPointConfirm, defaultPlatform }) {
  const defaultIsLink = defaultPlatform && WRITE_PLATFORMS.find(p => p.id === defaultPlatform)?.link;
  const [category, setCategory] = useState(defaultIsLink ? "link" : defaultPlatform === "file" ? "file" : "direct");
  const [platform, setPlatform] = useState(defaultPlatform || "blog_naver");
  const info = WRITE_PLATFORMS.find(p => p.id === platform) || WRITE_PLATFORMS[0];
  const isLink = info && info.link;

  const _text = isDark ? "#e8eaed" : "#1a1a2e";
  const _muted = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const _bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const _accent = "#7c6aff";

  const allOptions = [
    { group: "직접 작성", items: WRITE_PLATFORMS.filter(p => !p.link && !p.separator) },
    { group: "링크에서 변환", items: WRITE_PLATFORMS.filter(p => p.link) },
    { group: "파일", items: [{ id: "_file", label: "파일 받아쓰기" }] },
  ];

  const handleSelect = (id) => {
    if (id === "_file") { setCategory("file"); return; }
    const found = WRITE_PLATFORMS.find(p => p.id === id);
    if (found?.link) { setCategory("link"); setPlatform(id); }
    else { setCategory("direct"); setPlatform(id); }
  };

  const currentLabel = category === "file" ? "파일 받아쓰기" : (info?.label || "네이버 블로그");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flexShrink:0, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(249,250,251,0.6)", borderBottom:`1px solid ${_bdr}` }}>
        <div style={{ maxWidth:720, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:_text }}>글쓰기</div>
            <div style={{ fontSize:11, color:_muted }}>AI가 블로그 글을 작성해드려요</div>
          </div>
          <select value={category === "file" ? "_file" : platform}
            onChange={e => handleSelect(e.target.value)}
            style={{
              padding:"8px 14px", borderRadius:10, border:`1.5px solid ${_bdr}`,
              background: isDark ? "rgba(255,255,255,0.08)" : "#fff",
              color: _text, fontSize:13, fontWeight:600, cursor:"pointer", outline:"none",
              minWidth:140,
            }}>
            {allOptions.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {category === "file" ? (
          <FileTranscriber isDark={isDark} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        ) : isLink ? (
          info.linkTab === "youtube" ? (
            <YtBlogGenerator key={platform} theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
          ) : (
            <NewsBlogGenerator key={platform} theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate}
              linkMode={info.linkTab === "blog" ? "blog" : info.linkTab === "sns" ? "sns" : "news"} showPointConfirm={showPointConfirm} />
          )
        ) : (
          <BlogGenerator key={platform} initialType={info.type} menuLabel={info.label} embedded theme={theme} user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        )}
      </div>
    </div>
  );
}

/* ── 링크 글쓰기 통합 컴포넌트 ── */
function LinkBlogCombined({ theme, user, onLoginRequest, onUserUpdate, showPointConfirm, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || "youtube");
  const isDark = theme === "dark";
  const tabs = [
    { id: "youtube", label: "유튜브",   icon: "/icon-youtube.png" },
    { id: "news",    label: "뉴스 기사" },
    { id: "blog",    label: "블로그",   icon: "/icon-naver-blog.png" },
    { id: "sns",     label: "SNS",      icon: "/icon-instagram.webp" },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <TabHeader title="링크 글쓰기" subtitle="URL을 입력하면 AI가 블로그 글로 변환해줘요"
        tabs={tabs} activeTab={tab} onTabChange={setTab} isDark={isDark} />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {tab === "youtube" ? (
          <YtBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate} showPointConfirm={showPointConfirm} />
        ) : (
          <NewsBlogGenerator theme={theme} embedded user={user} onLoginRequest={onLoginRequest} onUserUpdate={onUserUpdate}
            linkMode={tab === "blog" ? "blog" : tab === "sns" ? "sns" : "news"} showPointConfirm={showPointConfirm} />
        )}
      </div>
    </div>
  );
}


export { RepurposePage, MENU_LABELS, MARKETING_TABS, MarketingHub, FileTranscriber, UnifiedBlogWriter, LinkBlogCombined };
