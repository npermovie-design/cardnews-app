import { useState, useEffect, useRef } from "react";
import { changePoints, getAiUsage, setAiUsage, guestLimitExceeded, incrementGuestUsage } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { useI18n } from "./i18n.jsx";

import { callAI, callAIStream } from "./aiClient";
import { isDarkTheme } from "./theme";
import ShareButton from "./ShareButton";
import LoadingAnimation from "./LoadingAnimation";
import KeywordInsightPanel from "./KeywordInsightPanel";
import { cleanBlogText, mdToHtml, renderMarkdown, inlineFormat, PLATFORMS, PointsExhausted, FIELD_LABELS, SPEECH_STYLES } from "./BlogUtils.jsx";

export default function BlogGenerator({ initialType, embedded, menuLabel, theme, user, onLoginRequest, onUserUpdate, showPointConfirm }) {
  // SNS 플랫폼 드롭다운 (폼 내에서 선택)
  const SNS_OPTIONS = [
    { id: "blog_naver", label: "네이버 블로그", icon: "/icon-naver-blog.png", color: "#03C75A" },
    { id: "blog_cafe", label: "네이버 카페", icon: "/icon-naver-cafe.webp", color: "#03C75A" },
    { id: "blog_tistory", label: "티스토리", icon: "/icon-tistory.png", color: "#FF6B35" },
    { id: "blog_insta", label: "인스타그램", icon: "/icon-instagram.webp", color: "#E1306C" },
    { id: "blog_thread", label: "스레드", icon: "/icon-threads.png", color: "#000000" },
    { id: "blog_youtube", label: "유튜브", icon: "/icon-youtube.png", color: "#FF0000" },
    { id: "blog_x", label: "X (Twitter)", color: "#000000", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { id: "blog_facebook", label: "페이스북", color: "#1877F2", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { id: "blog_linkedin", label: "LinkedIn", color: "#0A66C2", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
    { id: "blog_medium", label: "Medium", color: "#000000", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg> },
    { id: "blog_reddit", label: "Reddit", color: "#FF4500", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z"/></svg> },
    { id: "blog_pinterest", label: "Pinterest", color: "#E60023", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg> },
    { id: "blog_tiktok", label: "TikTok", color: "#010101", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
    { id: "blog_brunch", label: "브런치", color: "#333333", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 3C4.015 3 2 5.015 2 7.5c0 1.556.79 2.93 1.99 3.74L2 22l4.5-3 4.5 3-1.99-10.76A4.49 4.49 0 0011 7.5C11 5.015 8.985 3 6.5 3zm11 0C15.015 3 13 5.015 13 7.5c0 1.556.79 2.93 1.99 3.74L13 22l4.5-3 4.5 3-1.99-10.76A4.49 4.49 0 0022 7.5C22 5.015 19.985 3 17.5 3z"/></svg> },
    { id: "blog_wordpress", label: "WordPress", color: "#21759B", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.539.82-2.771.82-3.864 0-.397-.026-.766-.07-1.109m-7.981.105c.647-.034 1.233-.1 1.233-.1.58-.068.512-.921-.068-.889 0 0-1.744.137-2.87.137-1.057 0-2.834-.137-2.834-.137-.58-.032-.648.855-.068.889 0 0 .555.066 1.133.1l1.683 4.613-2.366 7.088L5.643 6.93c.649-.034 1.234-.1 1.234-.1.58-.068.511-.921-.069-.889 0 0-1.744.137-2.869.137-.202 0-.44-.005-.693-.014A10.864 10.864 0 0112 2.18c2.928 0 5.594 1.17 7.488 3.056M1.213 12c0-1.792.441-3.48 1.22-4.963l3.362 9.213A10.876 10.876 0 011.213 12m5.498 10.597l2.834-8.228 2.903 7.95c.019.046.04.09.063.132a10.855 10.855 0 01-5.8.146M12 22.055C6.465 22.055 1.946 17.535 1.946 12 1.946 6.465 6.465 1.946 12 1.946S22.055 6.465 22.055 12c0 5.535-4.52 10.055-10.055 10.055M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0"/></svg> },
    { id: "blog_substack", label: "Substack", color: "#FF6719", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg> },
    { id: "blog_bluesky", label: "Bluesky", color: "#0085FF", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.172 3.158-3.753.555-6.696 2.118-3.941 6.816 3.27 4.482 5.862-1.133 6.87-3.785.147-.387.22-.58.275-.58.055 0 .128.193.276.58 1.006 2.652 3.599 8.268 6.869 3.785 2.755-4.698-.188-6.26-3.941-6.816 2.572.318 5.387-.531 6.172-3.158C19.622 9.418 20 4.458 20 3.768c0-.69-.139-1.861-.902-2.203-.659-.299-1.664-.621-4.3 1.24C12.046 4.747 9.087 8.686 8 10.8h4z"/></svg> },
    { id: "blog_quora", label: "Quora", color: "#B92B27", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.738 17.5c-.87-1.743-1.91-3.266-3.742-3.266-.476 0-.946.125-1.178.362l-.777-1.524c.709-.636 1.755-1.004 2.937-1.004 2.393 0 3.802 1.364 4.85 3.134.396-1.023.6-2.285.6-3.827 0-5.283-2.005-8.625-5.428-8.625-3.414 0-5.426 3.342-5.426 8.625 0 5.25 2.012 8.541 5.426 8.541.896 0 1.696-.209 2.388-.588l.35.172zM10 24c5.523 0 10-4.477 10-10S15.523 4 10 4 0 8.477 0 14s4.477 10 10 10zm0-2c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/></svg> },
    { id: "blog_tumblr", label: "Tumblr", color: "#36465D", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.109 9.849 0 9.974 0h3.887v6.15h4.005v3.597h-4.022v7.377c.011 1.143.427 2.716 2.591 2.716h.098c.74-.016 1.733-.258 2.251-.454L20 23.076s-1.665.775-4.599.921h-.838z"/></svg> },
  ];
  const [platformId, setPlatformId] = useState(initialType || "blog_naver");
  const [snsCat, setSnsCat] = useState("all");
  const cfg = PLATFORMS[platformId] || PLATFORMS.blog_naver;
  const isDark = isDarkTheme(theme) || (!theme && !!embedded);
  const { t } = useI18n();

  const [subtype,    setSubtype]    = useState(cfg.subtypes[0].id);
  // fields는 sessionStorage에서 lazy init — _ssFieldsKey는 아래에 정의되므로 직접 키 문자열 사용
  const [fields,     setFields]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("_bg_fields_" + (initialType || "blog")) || "{}"); } catch { return {}; }
  });
  const [tone,       setTone]       = useState(cfg.tones[0].id);
  const [speechStyle, setSpeechStyle] = useState("polite_yo");
  const [wordCount,  setWordCount]  = useState(cfg.wordCounts[1]?.id || cfg.wordCounts[0].id);
  // 플랫폼 변경 시 설정 리셋
  useEffect(() => {
    const newCfg = PLATFORMS[platformId] || PLATFORMS.blog_naver;
    setSubtype(newCfg.subtypes[0].id);
    setTone(newCfg.tones[0].id);
    setWordCount(newCfg.wordCounts[1]?.id || newCfg.wordCounts[0].id);
    setFields({});
  }, [platformId]);
  // ── remount 복원: 부모 리렌더로 unmount/remount 시 전체 상태 유지 ──
  const _ssKey = useRef("_bg_res_" + (initialType || "blog")).current;
  const _ssLoadKey = useRef("_bg_loading_" + (initialType || "blog")).current;
  const [result, setResult_raw] = useState(() => {
    try { return sessionStorage.getItem(_ssKey) || ""; } catch(e) { return ""; }
  });
  const setResult = (v) => {
    setResult_raw(v);
    try { if (v && v.length > 10) sessionStorage.setItem(_ssKey, v); } catch(e) {}
  };
  // unmount 시: sessionStorage 유지 (다른 메뉴 갔다 돌아와도 결과 보존)
  const loadingForCleanup = useRef(false);
  useEffect(() => {
    return () => {
      // sessionStorage 삭제하지 않음 — 결과 보존
    };
  }, []);
  const [htmlResult, setHtmlResult] = useState("");
  const [viewMode,   setViewMode]   = useState("text");
  // loading + genStep도 sessionStorage로 복원 (unmount 시 로딩 화면 유지)
  const [loading, setLoading_raw] = useState(() => {
    try { return sessionStorage.getItem(_ssLoadKey) === "1"; } catch { return false; }
  });
  const setLoading = (v) => {
    setLoading_raw(v);
    try { if (v) sessionStorage.setItem(_ssLoadKey, "1"); else sessionStorage.removeItem(_ssLoadKey); } catch {}
  };
  useGeneratingGuard(loading, 10, initialType || "blog_write"); // 생성 중 이탈 방지
  const [copied,     setCopied]     = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [snsConns,setSnsConns]=useState([]);const [publishing,setPublishing]=useState(null);const [publishResult,setPublishResult]=useState(null);const [showSchedule,setShowSchedule]=useState(false);const [scheduleTime,setScheduleTime]=useState("");
  const [error,      setError]      = useState("");
  const [titleSugg,  setTitleSugg]  = useState([]);
  const [seoKeys,    setSeoKeys]    = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [seoLoading,   setSeoLoading]   = useState(false);
  const [urlInput,   setUrlInput]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult,  setUrlResult]  = useState(null);
  const [suggestedImages, setSuggestedImages] = useState([]);
  const [imgSearching,    setImgSearching]    = useState(false);
  const [imgCopied,       setImgCopied]       = useState(null);
  const [imgInput,        setImgInput]        = useState("");
  const [inlineImages,    setInlineImages]    = useState({}); // { "키워드": imageUrl }
  const [aiImgLoading,    setAiImgLoading]    = useState(false);
  const [aiImgUrl,        setAiImgUrl]        = useState(null);
  // AI 이미지 생성
  const handleAiImage = async () => {
    if (!result || aiImgLoading) return;
    setAiImgLoading(true); setAiImgUrl(null);
    try {
      const topic = fields?.keyword || fields?.topic || result.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 50) || "블로그 대표 이미지";
      const prompt = `${topic} - 블로그/SNS 대표 이미지, 깔끔하고 모던한 디자인, 고품질, 텍스트 없이 이미지만`;
      const r = await fetch("/api/image?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "16:9" }),
      });
      const d = await r.json();
      if (d.imageUrl || d.url) {
        setAiImgUrl(d.imageUrl || d.url);
      } else if (d.base64) {
        setAiImgUrl(`data:image/png;base64,${d.base64}`);
      } else {
        alert("이미지 생성 실패");
      }
    } catch (e) { alert("이미지 생성 실패: " + e.message); }
    setAiImgLoading(false);
  };

  const abortRef = useRef(false);
  const handleCancelGenerate = () => {
    abortRef.current = true;
    setLoading(false);
    setGenStep(0);
  };

  // ── 세부 설정 상태 ──
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [advTone,      setAdvTone]      = useState(""); // 글 분위기
  const [advAudience,  setAdvAudience]  = useState(""); // 대상 독자
  const [advWordCount, setAdvWordCount] = useState(2000); // 원하는 분량
  const [advExtra,     setAdvExtra]     = useState(""); // 추가 지시사항

  // ── 진행 단계 상태 (Mirra-style) ──
  const _ssStepKey = useRef("_bg_step_" + (initialType || "blog")).current;
  const _ssStartTimeKey = useRef("_bg_startTime_" + (initialType || "blog")).current;
  const _ssSavedFullKey = useRef("_bg_savedFull_" + (initialType || "blog")).current;
  const [genStep, setGenStep_raw] = useState(() => {
    try { const v = parseInt(sessionStorage.getItem(_ssStepKey) || "0"); return isNaN(v) ? 0 : v; } catch { return 0; }
  });
  const setGenStep = (v) => {
    setGenStep_raw(v);
    try { if (v > 0) sessionStorage.setItem(_ssStepKey, String(v)); else sessionStorage.removeItem(_ssStepKey); } catch {}
  };
  const genStartTimeRef = useRef((() => {
    try { return parseInt(sessionStorage.getItem(_ssStartTimeKey) || "0") || 0; } catch { return 0; }
  })());

  // ── 탭 전환 대응: elapsed-time 기반 step progression ──
  useEffect(() => {
    if (!loading) return;
    const stepThresholds = [
      { step: 2, ms: 2000 },
      { step: 3, ms: 5000 },
      { step: 4, ms: 9000 },
    ];
    const interval = setInterval(() => {
      const startTime = genStartTimeRef.current;
      if (!startTime) return;
      const elapsed = Date.now() - startTime;
      for (let i = stepThresholds.length - 1; i >= 0; i--) {
        if (elapsed >= stepThresholds[i].ms) {
          const targetStep = stepThresholds[i].step;
          setGenStep_raw(prev => {
            const next = Math.max(prev, targetStep);
            try { if (next > 0) sessionStorage.setItem(_ssStepKey, String(next)); } catch {}
            return next;
          });
          break;
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // ── loading ref (visibilitychange에서 최신 값 참조) ──
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  loadingForCleanup.current = loading;

  // ── 탭 복귀 시 visibilitychange 감지 → 상태 복원 ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const wasLoading = sessionStorage.getItem(_ssLoadKey) === "1";
        const savedFull = sessionStorage.getItem(_ssSavedFullKey) || "";
        const savedResult = sessionStorage.getItem(_ssKey) || "";
        const curLoading = loadingRef.current;

        // 생성이 진행 중이었는데 loading state가 꺼져 있다면 (스트리밍 끊김)
        if (wasLoading && !curLoading) {
          if (savedResult && savedResult.length > 50) {
            setResult(savedResult);
            setGenStep(5);
            setLoading(false);
            return;
          }
          if (savedFull && savedFull.length > 50) {
            setResult(cleanBlogText(savedFull));
            setGenStep(5);
            setLoading(false);
            return;
          }
        }

        // loading 중이면 step을 elapsed time 기반으로 보정
        if (curLoading) {
          const startTime = genStartTimeRef.current;
          if (startTime) {
            const elapsed = Date.now() - startTime;
            let correctStep = 1;
            if (elapsed >= 9000) correctStep = 4;
            else if (elapsed >= 5000) correctStep = 3;
            else if (elapsed >= 2000) correctStep = 2;
            setGenStep_raw(prev => {
              const next = Math.max(prev, correctStep);
              try { if (next > 0) sessionStorage.setItem(_ssStepKey, String(next)); } catch {}
              return next;
            });
          }
        }
      } catch(e) {}
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(()=>{if(user?.uid)fetch(`/api/sns-connections?uid=${user.uid}`).then(r=>r.json()).then(d=>setSnsConns(d.connections||[])).catch(()=>{});},[user?.uid]);
  const handlePublish=async(platform,scheduledTime)=>{if(!user?.uid||!result)return;setPublishing(platform);setPublishResult(null);try{const tags=result.match(/#[\wㄱ-ㅎ가-힣]+/g)?.join(",")||"";const body={uid:user.uid,platform,title:fields.keyword||"",content:result,tags};if(scheduledTime)body.scheduledTime=scheduledTime;const r=await fetch("/api/sns-publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json();setPublishResult({platform,...data});if(scheduledTime&&data.success)setShowSchedule(false);}catch(e){setPublishResult({platform,success:false,error:e.message});}setPublishing(null);};
  // 숏폼 연계 데이터 자동 입력
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shorts_linked_data');
      if (raw) {
        const linked = JSON.parse(raw);
        if (linked.title || linked.content) {
          setFields(prev => ({ ...prev, keyword: linked.title || prev.keyword || "" }));
          if (linked.content) {
            setUrlResult({ title: linked.title || "", content: linked.content, type: "shorts" });
          }
          localStorage.removeItem('shorts_linked_data');
        }
      }
    } catch(e) {}
  }, []);

  // 트렌드 키워드에서 진입 시 키워드 자동 입력
  useEffect(() => {
    try {
      const trendKw = sessionStorage.getItem('nper_trend_keyword');
      if (trendKw) {
        setFields(prev => ({ ...prev, keyword: trendKw }));
        sessionStorage.removeItem('nper_trend_keyword');
      }
    } catch(e) {}
  }, []);

  // 이탈 방지
  useEffect(() => {
    const handler = (e) => {
      if (loading) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [loading]);

  // 다시 생성하기 확인
  // ── sessionStorage 키 ──
  const _ssFormStepKey = useRef("_bg_formStep_" + (initialType || "blog")).current;
  const _ssSourceTypeKey = useRef("_bg_sourceType_" + (initialType || "blog")).current;
  const _ssFieldsKey = useRef("_bg_fields_" + (initialType || "blog")).current;
  const _ssPlatformKey = useRef("_bg_platform_" + (initialType || "blog")).current;
  const _ssSubtypeKey = useRef("_bg_subtype_" + (initialType || "blog")).current;
  const _ssUrlInputKey = useRef("_bg_urlInput_" + (initialType || "blog")).current;

  const [formStep, setFormStep_raw] = useState(() => {
    try { return parseInt(sessionStorage.getItem(_ssFormStepKey) || "1") || 1; } catch { return 1; }
  }); // 1~4 wizard steps
  const setFormStep = (v) => {
    setFormStep_raw(v);
    try { sessionStorage.setItem(_ssFormStepKey, String(v)); } catch {}
  };
  const [sourceType, setSourceType_raw] = useState(() => {
    try { return sessionStorage.getItem(_ssSourceTypeKey) || "topic"; } catch { return "topic"; }
  }); // "link" | "file" | "topic"
  const setSourceType = (v) => {
    setSourceType_raw(v);
    try { sessionStorage.setItem(_ssSourceTypeKey, v); } catch {}
  };
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  // 크레딧/횟수 상태 (렌더 시 체크)
  const _getUsageState = () => {
    const _u = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _k = user ? ("member_" + (user.uid || "u")) : "guest";
    const _used = _u[_k] || 0;
    const _lim = user ? 20 : 5;
    const _pts = user ? (user.points || 0) : 0;
    const isGuest = !user;
    // 비회원: 5회 초과 시 차단 / 회원: 무료횟수 소진 + 포인트 부족 시 차단
    const exhausted = isGuest ? (_used >= _lim) : (_pts < 10 && _used >= _lim);
    return { used: _used, limit: _lim, points: _pts, exhausted, isGuest };
  };
  const handleGenerateClick = () => {
    if (result && !loading) {
      setShowRegenConfirm(true);
    } else {
      generate();
    }
  };

  const handleSubtype = id => { setSubtype(id); setFields({}); setResult(""); setHtmlResult(""); setError(""); };
  const setField = (k,v) => setFields(p => {
    const next = {...p, [k]: v};
    try { sessionStorage.setItem(_ssFieldsKey, JSON.stringify(next)); } catch {}
    return next;
  });
  const currentFields = cfg.fields[subtype] || ["keyword","extra"];
  const examples = cfg.examples?.[subtype] || [];
  const isTistory = initialType === "blog_tistory";
  const accentRaw = cfg.accentColor || "#7c6aff";

  // ── 테마 변수 ──
  const text    = isDark ? "#fff"                      : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)"    : "#6c757d";
  const border  = isDark ? "rgba(255,255,255,0.10)"    : "#e9ecef";
  const accent  = isDark ? "#a5b4fc"                   : "#4f46e5";
  const accentBg= isDark ? "rgba(99,102,241,0.25)"     : "#f0f0ff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)"    : "#fff";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)"    : "#e9ecef";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)"    : "#fff";
  const panelBg = isDark ? "rgba(0,0,0,0.30)"          : "#fff";
  const resultBg= isDark ? "rgba(0,0,0,0.15)"          : "#f8f9fa";
  const headerBg= isDark ? "rgba(0,0,0,0.20)"          : "#fff";

  const IS = {width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box"};

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true); setUrlResult(null);
    try {
      const r = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await r.json();
      if (data.error) { alert(data.error); setUrlLoading(false); return; }
      setUrlResult(data);
      // keyword = title, extra = description + content
      if (data.title) setField("keyword", data.title.slice(0, 80));
      const desc = [data.description, data.content].filter(Boolean).join(" ").slice(0, 200);
      if (desc) setField("extra", (fields.extra ? fields.extra + "\n" : "") + "참고 내용: " + desc);
    } catch(e) { alert("URL 불러오기 실패: " + e.message); }
    setUrlLoading(false);
  };

  const suggestTitle = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setTitleLoading(true);
    try {
      const txt = await callAI("claude-haiku-4-5", [{role:"user",content:`키워드: ${fields.keyword}\nSEO 최적화 블로그 제목 3개만 번호 목록으로 답하세요.`}], 300);
      const ls = txt.split("\n").map(function(l){return l.replace(/^\d+\.?\s*/,"").trim();}).filter(function(l){return l.length>2;}).slice(0,3);
      setTitleSugg(ls);
    } catch(e) {}
    finally { setTitleLoading(false); }
  };

  const suggestSeo = async () => {
    if (!fields.keyword || !fields.keyword.trim()) { return; }
    setSeoLoading(true);
    try {
      const txt = (await callAI("claude-haiku-4-5", [{role:"user",content:`메인 키워드: ${fields.keyword}\n연관 SEO 키워드 7개를 쉼표로만 나열하세요.`}], 150)).trim();
      const ks = txt.split(/[,，]/).map(function(k){return k.trim();}).filter(function(k){return k.length>0;}).slice(0,7);
      setSeoKeys(ks);
    } catch(e) {}
    finally { setSeoLoading(false); }
  };

  const generate = async () => {
    // 주제 자동 폴백: 링크면 urlResult.title, 파일이면 첫 파일명으로
    if (!fields.keyword?.trim()) {
      if (sourceType === "link" && urlResult?.title) {
        setField("keyword", urlResult.title.slice(0, 80));
        fields.keyword = urlResult.title.slice(0, 80);
      } else if (sourceType === "file" && fields._files?.length) {
        const fallback = fields._files[0].name?.replace(/\.[^.]+$/, "").slice(0, 60) || "";
        setField("keyword", fallback);
        fields.keyword = fallback;
      } else {
        setError("주제를 입력해주세요."); return;
      }
    }
    if (!user && guestLimitExceeded()) return;
    if (showPointConfirm && user && !(await showPointConfirm(10))) return;
    if (!user) incrementGuestUsage(); // 비회원: 즉시 사용 횟수 차감
    // 사용 횟수 체크 (비회원 5회, 회원 20회)
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiLimit = user ? 20 : 5;
    const _aiPoints = user ? (user.points || 0) : 0;
    // 회원: 무료 횟수 소진 + 포인트 부족 → 차단
    if (user && _aiUsed >= _aiLimit && _aiPoints < 10) {
      setError("무료 횟수를 모두 사용했어요. 포인트를 충전해주세요.");
      return;
    }
    // 회원: 무료 횟수 남아있어도 포인트가 0이면 차단
    if (user && _aiPoints <= 0 && _aiUsed >= _aiLimit) {
      setError("포인트가 부족합니다. 충전 후 이용해주세요.");
      return;
    }
    setError(""); setLoading(true); setResult_raw(""); try{sessionStorage.removeItem(_ssKey);sessionStorage.removeItem(_ssSavedFullKey);}catch(e){} setHtmlResult(""); setCopied(false);
    abortRef.current = false;
    // elapsed-time 기반 step progression을 위해 시작 시각 기록
    const _startTime = Date.now();
    genStartTimeRef.current = _startTime;
    try { sessionStorage.setItem(_ssStartTimeKey, String(_startTime)); } catch {}
    setGenStep(1); // 자료 조사
    // 백그라운드 작업 표시기 등록 (메뉴 이동 시 진행 상태 표시)
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "blog_gen_" + (initialType || "blog"), type: initialType || "blog_write", message: "글 작성 중..." } } }));

    // 포인트 즉시 차감 (무료 횟수 소진 후에만)
    if (user && user.uid && _aiUsed >= _aiLimit) {
      changePoints(user.uid, -10, "블로그 글 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }

    // step progression은 useEffect의 interval이 elapsed time 기반으로 처리함 (setTimeout 미사용)

    // 세부 설정을 프롬프트에 반영
    let advPromptExtra = "";
    if (advTone) advPromptExtra += `\n[글 분위기] ${advTone}`;
    if (advAudience) advPromptExtra += `\n[대상 독자] ${advAudience}`;
    if (advWordCount !== 2000) advPromptExtra += `\n[원하는 분량] 약 ${advWordCount}자`;
    if (advExtra) advPromptExtra += `\n[추가 지시사항] ${advExtra}`;

    const basePrompt = cfg.buildPrompt(subtype, fields, tone, wordCount, speechStyle);
    const prompt = advPromptExtra ? basePrompt + advPromptExtra : basePrompt;
    // 분량에 따른 max_tokens 설정
    const tokenMap = { short: 2000, medium: 4000, long: 6000, xlong: 8000 };
    const maxTok = tokenMap[wordCount] || 4000;
    let _savedFull = "";
    // 최대 2회 시도 (실패 시 재시도)
    let lastErr = null;
    try {
    // 글 생성 (부족하면 이어쓰기)
    _savedFull = "";
    try {
      let fullText = await callAIStream("claude-haiku-4-5", [{role:"user",content:prompt}], maxTok, (acc) => { _savedFull = acc; try { if (acc.length > 20) sessionStorage.setItem(_ssSavedFullKey, acc); } catch {} });

      // 글이 짧거나 해시태그 없으면 이어쓰기 시도
      const minLen = wordCount === "short" ? 800 : wordCount === "long" ? 2500 : wordCount === "xlong" ? 3500 : 1500;
      if (fullText && fullText.length < minLen && fullText.length > 50) {
        try {
          const contPrompt = `아래 글을 이어서 완성해주세요. 해시태그 10개로 마무리하세요.\n\n${fullText.slice(-500)}`;
          const cont = await callAIStream("claude-haiku-4-5", [{role:"user",content:contPrompt}], 2000, (acc) => { _savedFull = fullText + acc; try { sessionStorage.setItem(_ssSavedFullKey, _savedFull); } catch {} });
          if (cont) fullText = fullText + "\n" + cont;
        } catch {}
      }

      if (fullText && fullText.length > 50) {
        setGenStep(5);
        setResult(cleanBlogText(fullText));
        if (isTistory) setHtmlResult(mdToHtml(fullText));
      } else {
        setError("글 생성에 실패했습니다. 다시 시도해주세요.");
      }
    } catch(e) {
      if (_savedFull && _savedFull.length > 50) {
        setGenStep(5);
        setResult(cleanBlogText(_savedFull));
        if (isTistory) setHtmlResult(mdToHtml(_savedFull));
      } else {
        setError((e.message || "생성 중 오류") + " 다시 시도해주세요.");
      }
    }
    } finally {
      genStartTimeRef.current = 0;
      try { sessionStorage.removeItem(_ssStartTimeKey); sessionStorage.removeItem(_ssSavedFullKey); } catch {}
      setGenStep(5); // all completed
      setLoading(false);
      // 백그라운드 작업 표시기 완료
      window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "blog_gen_" + (initialType || "blog"), type: initialType || "blog_write", message: "글 작성 완료!" } } }));
      if (user) { // 회원만 finally에서 횟수 증가 (비회원은 generate 시작 시점에 이미 처리)
        const _u2 = getAiUsage();
        const _k2 = "member_" + (user.uid || "u");
        const _newU2 = { ..._u2 };
        _newU2[_k2] = (_u2[_k2] || 0) + 1;
        setAiUsage(_newU2);
      }
      // 포인트 차감은 생성 시작 시점에 처리됨
      // 본문 내 [이미지: ...] 태그에 실제 이미지 자동 삽입
      if (_savedFull) fetchInlineImages(_savedFull);
      // 하단 이미지 추천
      if (_savedFull && fields.keyword) fetchImages(fields.keyword);
      // 보관함 자동저장
      if (_savedFull && _savedFull.length > 50) {
        try {
          let _saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
          let _title = fields.keyword || "제목 없음";
          let _newSave = { id: Date.now().toString(), type: subtype, title: _title,
            content: cleanText(_savedFull), date: new Date().toLocaleDateString("ko-KR") };
          _saves.unshift(_newSave);
          localStorage.setItem("sns_blog_saves_v1", JSON.stringify(_saves.slice(0, 100)));
        } catch(e) {}
      }
    }
  };

  /* ── [image: ...] / [이미지: ...] 태그를 실제 이미지로 자동 교체 ── */
  const fetchInlineImages = async () => { /* suggestedImages useEffect에서 처리 */ };

  // suggestedImages를 renderMarkdown에 직접 전달 — 별도 매핑 불필요

  /* ── 픽사베이·픽셀스 이미지 자동 추천 ── */
  const fetchImages = async (keyword) => {
    if (!keyword) return;
    setImgSearching(true); setSuggestedImages([]);
    // 한국어 keyword → 영어 이미지 검색어 변환 (Pixabay/Pexels는 영어 매칭이 훨씬 정확)
    let enQuery = keyword;
    const hasKorean = /[가-힣]/.test(keyword);
    if (hasKorean) {
      try {
        const txt = await callAI("claude-haiku-4-5", [{
          role: "user",
          content: `다음 한국어 주제를 이미지 검색에 쓸 영어 키워드 2~3개로 바꿔주세요. 핵심 명사 위주로. 답변은 영어 단어만, 공백으로 구분, 다른 설명 없이:\n"${keyword}"`
        }], 60);
        const clean = (txt || "").trim().split("\n")[0].replace(/["'.,]/g, "").trim();
        if (clean && clean.length > 0 && clean.length < 80 && /^[A-Za-z ]+$/.test(clean)) {
          enQuery = clean;
        }
      } catch {}
    }
    const imgs = [];
    try {
      {
        const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(enQuery)}&per_page=12&safesearch=true&image_type=photo&orientation=horizontal`);
        const d = await r.json();
        (d.hits||[]).forEach(h => imgs.push({ id:"px"+h.id, preview:h.webformatURL, url:h.largeImageURL||h.webformatURL, src:"Pixabay" }));
      }
      {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(enQuery)}&per_page=12&orientation=landscape`);
        const d = await r.json();
        (d.photos||[]).forEach(p => imgs.push({ id:"pe"+p.id, preview:p.src.medium, url:p.src.large2x||p.src.large, src:"Pexels" }));
      }
    } catch(e) {}
    setSuggestedImages(imgs);
    setImgSearching(false);
  };

  const cleanText = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  const cleanForCopy = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  // 모바일 호환 복사 (clipboard API fallback)
  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
  };
  // 이미지 URL → base64 data URI 변환 (CORS 우회를 위해 프록시 경유)
  const imageUrlToBase64 = async (url) => {
    try {
      // 프록시를 통해 이미지를 가져와 CORS 문제 회피
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error("proxy failed");
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // 프록시 실패 시 직접 fetch 시도 (같은 origin이거나 CORS 허용된 경우)
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error("direct fetch failed");
        const blob = await resp.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null; // 변환 실패 시 null 반환
      }
    }
  };

  const blogContentRef = useRef(null);
  const handleCopy = async (content, withImages) => {
    const cleaned = cleanForCopy(content);
    if (withImages && blogContentRef.current) {
      setCopyLoading(true);
      try {
        // HTML 복제본 생성
        const el = blogContentRef.current;
        const clone = el.cloneNode(true);
        // 버튼/입력 제거
        clone.querySelectorAll("button, input").forEach(n => n.remove());
        clone.querySelectorAll("img").forEach(img => {
          const wrapper = img.parentElement;
          if (wrapper && wrapper.tagName === "DIV") {
            Array.from(wrapper.children).forEach(child => {
              if (child.tagName !== "IMG") child.remove();
            });
          }
        });

        // ★ 이미지 CDN URL → base64 data URI 변환 (모든 에디터 호환)
        const imgEls = Array.from(clone.querySelectorAll("img"));
        await Promise.all(imgEls.map(async (img) => {
          const src = img.src;
          if (!src || src.startsWith("data:")) return;
          try {
            const b64 = await imageUrlToBase64(src);
            if (b64) {
              img.src = b64;
              img.removeAttribute("srcset");
              img.removeAttribute("crossorigin");
              img.style.maxWidth = "100%";
              img.style.height = "auto";
            }
          } catch {}
        }));

        // 소제목(fontWeight:800) 앞에 빈 줄 추가
        clone.querySelectorAll("p").forEach(p => {
          if (p.style.fontWeight === "800") {
            const br = document.createElement("br");
            p.parentElement.insertBefore(br, p);
          }
        });

        const html = clone.innerHTML;
        try {
          await navigator.clipboard.write([new ClipboardItem({
            "text/html": new Blob([html], {type: "text/html"}),
            "text/plain": new Blob([cleaned], {type: "text/plain"})
          })]);
        } catch {
          // ClipboardItem 실패 시 DOM 선택 복사
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand("copy");
          sel.removeAllRanges();
        }
      } catch {
        try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(cleaned); } else { fallbackCopy(cleaned); } }
        catch { fallbackCopy(cleaned); }
      } finally {
        setCopyLoading(false);
      }
    } else {
      try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(cleaned); } else { fallbackCopy(cleaned); } }
      catch { fallbackCopy(cleaned); }
    }
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  // ── 결과 패널 ──
  const renderResult = () => {
    // 크레딧/횟수 소진 체크
    const _us = _getUsageState();
    if (!loading && !result && _us.exhausted) {
      return <PointsExhausted isDark={isDark} isGuest={_us.isGuest} title="블로그 글"
        onLogin={() => { if(onLoginRequest) onLoginRequest(); }} />;
    }
    // 풀스크린 로딩 오버레이
    if (loading) {
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <LoadingAnimation featureType={initialType || "blog_write"} title="AI가 글을 작성하고 있어요" subtitle={`${fields.keyword} · ${cfg.title}`} isDark={isDark} startTime={genStartTimeRef.current || 0} expectedMs={wordCount==="xlong"?60000:wordCount==="long"?45000:30000} />
          <button onClick={handleCancelGenerate}
            style={{position:"fixed",bottom:40,left:"50%",transform:"translateX(-50%)",zIndex:10000,padding:"12px 32px",borderRadius:12,border:`1px solid ${isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)"}`,background:isDark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.9)",color:isDark?"#fff":"#333",fontSize:14,fontWeight:700,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
            취소
          </button>
        </div>
      );
    }
    if (!result && !loading) {
      const sub = cfg.subtypes.find(s=>s.id===subtype);
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40,textAlign:"center",maxWidth:900,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:16,fontWeight:800,color:text}}>{sub?.label}</div>
          <div style={{fontSize:13,color:muted,lineHeight:1.8,whiteSpace:"pre-line"}}>{t("introGuide")}</div>
          {examples.length>0&&<div style={{fontSize:11,color:muted,opacity:0.6}}>{t("example")}: {examples[0]}</div>}
        </div>
      );
    }
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:900,margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,padding:"16px 20px",marginTop:16,borderBottom:`1px solid ${border}`,background:headerBg,borderRadius:"14px 14px 0 0"}}>
          {/* 상단 행: 결과 라벨 + 글자수 통계 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {isTistory && result && ["text","html","preview"].map(mode=>(
                <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:text,fontSize:13,fontWeight:viewMode===mode?800:600,cursor:"pointer",minHeight:36}}>
                  {mode==="text"?"원문":mode==="html"?"HTML":"미리보기"}
                </button>
              ))}
              {!isTistory&&result&&<span style={{fontSize:15,fontWeight:800,color:text,letterSpacing:-0.3}}>{t("genResult")}</span>}
            </div>
            {result&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderRadius:12,
                background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                border:`1px solid ${border}`}}>
                <span style={{fontSize:12,color:muted,fontWeight:600}}>총</span>
                <span style={{fontSize:14,fontWeight:800,color:accent}}>{result.length.toLocaleString()}</span>
                <span style={{fontSize:12,color:muted}}>자</span>
                <span style={{width:1,height:14,background:border,display:"inline-block"}}/>
                <span style={{fontSize:12,color:muted,fontWeight:600}}>공백 제외</span>
                <span style={{fontSize:14,fontWeight:800,color:text}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
              </div>
            )}
          </div>
          {/* 하단 행: 액션 버튼들 */}
          {result && (
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>{
                setResult_raw("");setHtmlResult("");setGenStep(0);setFormStep(1);setSourceType("topic");
                setError("");setSuggestedImages([]);setInlineImages({});setCopied(false);
                setTitleSugg([]);setSeoKeys([]);setFields({});setUrlInput("");setUrlResult(null);
                try{
                  sessionStorage.removeItem(_ssKey);sessionStorage.removeItem(_ssLoadKey);sessionStorage.removeItem(_ssStepKey);sessionStorage.removeItem(_ssSavedFullKey);
                  sessionStorage.removeItem(_ssFormStepKey);sessionStorage.removeItem(_ssSourceTypeKey);sessionStorage.removeItem(_ssFieldsKey);
                  sessionStorage.removeItem(_ssPlatformKey);sessionStorage.removeItem(_ssSubtypeKey);sessionStorage.removeItem(_ssUrlInputKey);
                }catch{}
              }}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${border}`,
                  background:"transparent",color:text,fontSize:13,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",minHeight:42,fontFamily:"inherit"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></svg>
                새로 쓰기
              </button>
              <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result, true)}
                disabled={copyLoading}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${copied?"rgba(74,222,128,0.5)":accent+"60"}`,
                  background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):accentBg,
                  color:copied?"#22c55e":accent,fontSize:13,fontWeight:800,cursor:copyLoading?"wait":"pointer",
                  display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",opacity:copyLoading?0.6:1,minHeight:42,fontFamily:"inherit"}}>
                {copied
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                {copyLoading?"이미지 변환 중":copied?"복사됨":"복사 (이미지 포함)"}
              </button>
              <button onClick={handleAiImage} disabled={aiImgLoading}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${aiImgUrl?"rgba(74,222,128,0.5)":border}`,
                  background:aiImgUrl?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                  color:aiImgUrl?"#22c55e":text,fontSize:13,fontWeight:700,cursor:aiImgLoading?"wait":"pointer",whiteSpace:"nowrap",minHeight:42,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
                {aiImgLoading
                  ? <><div style={{width:13,height:13,border:`2px solid ${accent}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중</>
                  : aiImgUrl
                    ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>이미지 생성됨</>
                    : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>AI 대표 이미지</>}
              </button>
              {result&&<ShareButton title={fields?.topic||"블로그 글"} text={result?.slice(0,300)} isDark={isDark} compact />}
              {result && (() => {
              const isThread = initialType === "blog_thread";
              const isInsta = initialType === "blog_insta";
              const threadConn = snsConns.find(c => c.platform === "threads");
              const btns = [];
              // 스레드 탭: 스레드만
              if (isThread) {
                btns.push({ p:"threads", l: threadConn ? "스레드 발행" : "스레드 연동하기", i:"/icon-threads.png", c:"#7c6aff", connected:!!threadConn, needLogin:!user });
              }
              // 인스타 탭: 인스타만 (준비중)
              else if (isInsta) {
                const instaConn = snsConns.find(c => c.platform === "instagram");
                btns.push({ p:"instagram", l: instaConn ? "인스타그램 발행" : "인스타그램 연동하기", i:"/icon-instagram.webp", c:"#E1306C", connected:!!instaConn, needLogin:!user });
              }
              // 네이버 블로그 탭
              else if (initialType === "blog_naver") {
                btns.push({ p:"naver_blog", l:"네이버 블로그", i:"/icon-naver-blog.png", c:"#03C75A", u:"https://blog.naver.com/PostList.naver" });
              }
              // 티스토리 탭
              else if (initialType === "blog_tistory") {
                btns.push({ p:"tistory", l:"티스토리", i:"/icon-tistory.png", c:"#FF6B35", u:"https://www.tistory.com/m/entry/write" });
              }
              // 네이버 카페 탭
              else if (initialType === "blog_cafe") {
                btns.push({ p:"naver_cafe", l:"네이버 카페", i:"/icon-naver-cafe.webp", c:"#03C75A", u:"https://cafe.naver.com" });
              }
              // 나머지(유튜브 등): 스레드만
              else {
                if (threadConn) btns.push({ p:"threads", l:"스레드", i:"/icon-threads.png", c:"#7c6aff" });
              }
              return btns.map(b => {
                const isPub = publishing === b.p, done = publishResult?.platform === b.p;
                return (
                  <button key={b.p} onClick={async () => {
                    if (b.soon) return;
                    if (b.needLogin) { if (onLoginRequest) onLoginRequest(); return; }
                    if (b.connected === false && !b.u) { try { window.location.href = "/mypage"; } catch {} return; }
                    if (b.u) {
                      window.open(b.u, "_blank");
                      try { await navigator.clipboard.writeText(result); } catch {}
                      setPublishResult({ platform: b.p, clipboard: true, message: `${b.l} 에디터에서 붙여넣기(Ctrl+V)하세요` });
                      setTimeout(() => setPublishResult(null), 3000);
                    } else { handlePublish(b.p); }
                  }} disabled={isPub || b.soon}
                    style={{ padding:"10px 18px", borderRadius:11, border:`1.5px solid ${done ? "rgba(74,222,128,0.5)" : b.c+"60"}`,
                      background: done ? (isDark ? "rgba(74,222,128,0.12)" : "#f0fdf4") : (isDark ? b.c+"15" : b.c+"0a"),
                      color: done ? "#22c55e" : (isDark ? "#fff" : b.c),
                      fontSize:13, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap", opacity: isPub || b.soon ? 0.5 : 1, minHeight:42, fontFamily:"inherit" }}>
                    {isPub
                      ? <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${b.c}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />
                      : <img src={b.i} alt="" style={{ width:20, height:20, objectFit:"contain", borderRadius:4 }} />
                    }
                    {isPub ? "발행 중" : done ? (publishResult?.clipboard ? "복사 완료" : "발행 완료") : b.soon ? "준비중" : b.l}
                  </button>
                );
              });
            })()}
              {result && initialType === "blog_thread" && (
                <button onClick={()=>setShowSchedule(!showSchedule)}
                  style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${showSchedule?"#7c6aff60":border}`,
                    background:showSchedule?(isDark?"#7c6aff15":"#7c6aff0a"):"transparent",color:showSchedule?accent:text,
                    fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",minHeight:42,fontFamily:"inherit"}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  예약 발행
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {/* AI 생성 이미지 */}
          {aiImgUrl && (
            <div style={{marginBottom:18,borderRadius:14,overflow:"hidden",border:`1px solid ${border}`,position:"relative"}}>
              <img src={aiImgUrl} alt="AI 생성 이미지" style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
              <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6}}>
                <button onClick={()=>{const a=document.createElement("a");a.href=aiImgUrl;a.download="ai-image.png";a.click();}}
                  style={{padding:"8px 14px",borderRadius:10,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:6,minHeight:38,fontFamily:"inherit"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  다운로드
                </button>
                <button onClick={()=>setAiImgUrl(null)}
                  style={{padding:"8px 10px",borderRadius:10,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minHeight:38,minWidth:38}} aria-label="닫기">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )}
          {(viewMode==="text"||!isTistory)&&<div
            contentEditable
            suppressContentEditableWarning
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = "2px dashed #7c6aff"; }}
            onDragLeave={e => { e.currentTarget.style.outline = "none"; }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.outline = "none";
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const dataUri = ev.target.result;
                  const placeholder = `![uploading...](${dataUri})`;
                  setResult(prev => prev + `\n\n${placeholder}\n\n`);
                  try {
                    const { uploadFileToStorage } = await import("./storage");
                    const ext = file.name?.split(".").pop() || "png";
                    const path = `blog-images/${Date.now()}.${ext}`;
                    const publicUrl = await uploadFileToStorage(file, path);
                    setResult(prev => prev.replace(placeholder, `![image](${publicUrl})`));
                  } catch {
                    setResult(prev => prev.replace("![uploading...]", "![image]"));
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            onPaste={e => {
              // 모바일/PC 이미지 붙여넣기 → Supabase 업로드 후 URL 삽입
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) break;
                    // 즉시 base64로 미리보기 표시
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUri = ev.target.result;
                      const placeholder = `![uploading...](${dataUri})`;
                      setResult(prev => prev + `\n\n${placeholder}\n\n`);
                      // Supabase 업로드 시도 → 공개 URL로 교체
                      try {
                        const { uploadFileToStorage } = await import("./storage");
                        const ext = blob.type.split("/")[1] || "png";
                        const path = `blog-images/${Date.now()}.${ext}`;
                        const publicUrl = await uploadFileToStorage(blob, path);
                        setResult(prev => prev.replace(placeholder, `![image](${publicUrl})`));
                      } catch {
                        // 업로드 실패 시 base64 유지
                        setResult(prev => prev.replace("![uploading...]", "![image]"));
                      }
                    };
                    reader.readAsDataURL(blob);
                    break;
                  }
                }
              }
            }}
            style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"26px 28px",fontSize:16,color:text,minHeight:140,lineHeight:1.95,cursor:"text",outline:"none",transition:"outline 0.15s"}}>
            <div ref={blogContentRef}>{renderMarkdown(result, isDark, text, muted, accentRaw, suggestedImages)}</div>
            {loading&&<span style={{display:"inline-block",width:2,height:14,background:accent,marginLeft:2,animation:"blink 1s infinite"}}/>}
          </div>}
          {isTistory&&viewMode==="html"&&htmlResult&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"18px 20px"}}><pre style={{fontSize:12,color:isDark?"#a5b4fc":"#4f46e5",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"'Consolas','Monaco',monospace",margin:0}}>{htmlResult}</pre></div>}
          {isTistory&&viewMode==="preview"&&htmlResult&&<div style={{background:"#fff",border:"1px solid #e9ecef",borderRadius:12,padding:"24px 28px"}} dangerouslySetInnerHTML={{__html:htmlResult}}/>}

          {publishResult&&<div style={{marginTop:14,padding:"16px 18px",borderRadius:14,display:"flex",alignItems:"center",gap:14,background:publishResult.success?(isDark?"rgba(74,222,128,0.08)":"#f0fdf4"):(isDark?"rgba(245,158,11,0.08)":"#fffbeb"),border:`1px solid ${publishResult.success?"rgba(74,222,128,0.25)":"rgba(245,158,11,0.25)"}`}}>
            <div style={{width:36,height:36,borderRadius:10,background:publishResult.success?"rgba(34,197,94,0.15)":publishResult.clipboard?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)",color:publishResult.success?"#22c55e":publishResult.clipboard?"#f59e0b":"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {publishResult.success
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : publishResult.clipboard
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:publishResult.success?"#22c55e":publishResult.clipboard?"#f59e0b":"#ef4444"}}>{publishResult.success?"발행 성공!":publishResult.clipboard?"클립보드에 복사됨":"발행 실패"}</div>
              {publishResult.postUrl&&<a href={publishResult.postUrl} target="_blank" rel="noopener" style={{fontSize:13,color:accent,fontWeight:600}}>게시글 확인 →</a>}
              {publishResult.message&&<div style={{fontSize:13,color:muted,marginTop:2}}>{publishResult.message}</div>}
              {publishResult.error&&<div style={{fontSize:13,color:"#ef4444",marginTop:2}}>{publishResult.error}</div>}
            </div>
            <button onClick={()=>setPublishResult(null)} style={{background:"none",border:"none",color:muted,cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:36,minWidth:36,borderRadius:8}} aria-label="닫기">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>}
          {/* 예약 발행 UI */}
          {showSchedule && result && (
            <div style={{marginTop:12,padding:"16px",borderRadius:12,background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)",border:`1px solid ${isDark?"rgba(124,106,255,0.2)":"rgba(124,106,255,0.1)"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontSize:15,fontWeight:800,color:text}}>스레드 예약 발행</span>
                <button onClick={()=>setShowSchedule(false)} style={{background:"none",border:"none",color:muted,cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:36,minWidth:36,borderRadius:8}} aria-label="닫기">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {!snsConns.some(c=>c.platform==="threads") ? (
                <div style={{textAlign:"center",padding:"12px 0"}}>
                  <div style={{fontSize:13,color:muted,marginBottom:10}}>스레드 계정을 먼저 연동해주세요</div>
                  <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest()}else{try{window.location.href="/mypage"}catch{}}}}
                    style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {user?"계정 연동하러 가기":"로그인 후 연동"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
                      min={new Date(Date.now()+600000).toISOString().slice(0,16)}
                      style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#ddd"}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:text,fontSize:13,minWidth:180}} />
                    <button onClick={()=>handlePublish("threads",scheduleTime)} disabled={!scheduleTime||publishing}
                      style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:!scheduleTime||publishing?0.5:1,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                      <img src="/icon-threads.png" alt="" style={{width:14,height:14,objectFit:"contain",borderRadius:2,filter:"brightness(10)"}} />
                      {publishing?"예약 중...":"예약 발행하기"}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:muted,marginTop:6}}>최소 10분 후 ~ 최대 75일 후 예약 가능</div>
                </>
              )}
            </div>
          )}
          {/* 연관 이미지 추천 */}
          {(imgSearching || suggestedImages.length > 0) && (
            <div style={{marginTop:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:800,color:text}}>📷 {t("relatedImages")}</span>
                <span style={{fontSize:11,color:muted,flex:1}}>Pixabay · Pexels</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={imgInput} onChange={e=>setImgInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&fetchImages(imgInput||fields.keyword)}
                    placeholder={t("searchKw")}
                    style={{padding:"5px 10px",borderRadius:12,border:`1px solid ${border}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:text,fontSize:12,outline:"none",width:150}}/>
                  <button onClick={()=>fetchImages(imgInput||fields.keyword)} disabled={imgSearching}
                    style={{padding:"5px 12px",borderRadius:12,border:"none",background:accent,color:"#fff",fontSize:12,fontWeight:700,cursor:imgSearching?"not-allowed":"pointer",opacity:imgSearching?0.6:1,whiteSpace:"nowrap"}}>
                    {imgSearching?"검색중...":"검색"}
                  </button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,paddingBottom:8}}>
                {imgSearching && Array.from({length:6}).map((_,i)=>(
                  <div key={i} style={{aspectRatio:"4/3",borderRadius:12,background:isDark?"rgba(255,255,255,0.06)":"#f0f0f6",border:`1px solid ${border}`,animation:"pulse 1.5s ease-in-out infinite"}}/>
                ))}
                {suggestedImages.map(img=>(
                  <div key={img.id} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${border}`,position:"relative",cursor:"pointer",aspectRatio:"4/3"}}
                    title="클릭: URL 복사 / ⬇: 다운로드">
                    <img src={img.preview} alt="" loading="lazy"
                      style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                      onError={e=>e.target.parentElement.style.display="none"}/>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.5)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
                      <div style={{position:"absolute",top:4,right:4,display:"flex",gap:3}}>
                        <button onClick={(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(img.url); setImgCopied(img.id); setTimeout(()=>setImgCopied(null),2000); }}
                          style={{padding:"3px 7px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.9)",color:"#333",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                          {imgCopied===img.id?"✓":"📋"}
                        </button>
                        <button onClick={(e)=>{ e.stopPropagation();
                          fetch(img.url).then(r=>r.blob()).then(b=>{
                            const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="image.jpg";
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
                          }).catch(()=>window.open(img.url,"_blank"));
                        }}
                          style={{padding:"3px 7px",borderRadius:12,border:"none",background:"rgba(255,255,255,0.9)",color:"#333",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                          ⬇
                        </button>
                      </div>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px"}}>
                        <span style={{fontSize:9,background:"rgba(0,0,0,0.6)",color:"#fff",padding:"1px 5px",borderRadius:12}}>{img.src}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,padding:"10px 14px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:`1px solid ${isDark?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.15)"}`}}>
                <div style={{fontSize:12,fontWeight:700,color:accent,marginBottom:6}}>💡 복사한 이미지 URL 활용법</div>
                <div style={{fontSize:11,color:muted,lineHeight:1.8}}>
                  <b style={{color:text}}>① 네이버 블로그</b> → 글쓰기 → 사진 → URL로 삽입 → 붙여넣기<br/>
                  <b style={{color:text}}>② 인스타그램</b> → 복사한 URL을 브라우저에서 열어 이미지 저장 후 업로드<br/>
                  <b style={{color:text}}>③ 티스토리</b> → 글쓰기 → 이미지 → URL 삽입 → 붙여넣기<br/>
                  <b style={{color:text}}>④ 직접 저장</b> → 이미지에 우클릭 → "이미지를 다른 이름으로 저장"
                </div>
                <div style={{fontSize:10,color:muted,marginTop:6,opacity:0.7}}>상업적 이용 시 Pixabay·Pexels 라이선스를 확인하세요. (대부분 무료 상업 이용 가능)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // eslint-disable-next-line no-unused-vars
  const [mobileTab, setMobileTab] = useState("input");
  // 현재 단계: 1=입력, 2=생성중, 3=결과
  // genStep: 0=시작전, 1~4=생성중, 5=완료
  // loading 또는 genStep이 1~4이면 생성중 화면 유지
  const wizStep = (loading || (genStep > 0 && genStep < 5)) ? 2 : (!loading && genStep === 5 && result) ? 3 : 1;
  const WSTEPS = [
    {n:1, label:t("inputStep")},
    {n:2, label:t("genStep")},
    {n:3, label:t("resultStep")},
  ];

  const content = (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column"}}>
      {/* 다시 생성 확인 모달 */}
      {showRegenConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:isDark?"rgba(18,16,58,0.98)":"#fff",border:"1px solid rgba(124,106,255,0.25)",borderRadius:20,padding:"36px 32px",maxWidth:380,width:"90%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(99,102,241,0.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </div>
            <div style={{fontSize:18,fontWeight:900,color:text,marginBottom:8}}>{t("regenTitle")}</div>
            <div style={{fontSize:13,color:muted,lineHeight:1.8,marginBottom:24,whiteSpace:"pre-line"}}>{t("regenDesc")}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowRegenConfirm(false)}
                style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                취소
              </button>
              <button onClick={()=>{ setShowRegenConfirm(false); setResult(""); setHtmlResult(""); generate(); }}
                style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {t("regenBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bl-step-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes bl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes bl-progress{from{width:0%}to{width:100%}}
        @keyframes bl-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bl-popin{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        .tistory-content h1,.tistory-content h2{font-size:20px;font-weight:700;margin:20px 0 10px}
        .tistory-content h3{font-size:16px;font-weight:700;margin:14px 0 8px}
        .tistory-content p{margin:8px 0;line-height:1.8}
        .tistory-content ul{padding-left:20px;margin:8px 0}
        .tistory-content li{margin:4px 0}
        @media(max-width:768px){
          .bl-form-wrap{padding:16px 14px 24px!important;max-width:100%!important}
          .bl-form-wrap input,.bl-form-wrap textarea,.bl-form-wrap select{font-size:16px!important;padding:12px 14px!important}
          .bl-form-wrap button{min-height:44px!important}
          .bl-gen-btn{position:sticky!important;bottom:0!important;z-index:10!important;margin:0 -14px!important;padding:16px 14px!important;border-radius:0!important;background:linear-gradient(135deg,#7c6aff,#8b5cf6)!important}
          .bl-result-header{padding:6px 12px!important;gap:4px!important}
          .bl-result-header>div{flex-wrap:wrap!important}
          .bl-sns-platform-group{gap:6px!important}
          .bl-sns-platform-group button{padding:11px 13px!important;font-size:13px!important}
        }
        @media(max-width:480px){
          .bl-form-wrap{padding:14px 12px 24px!important}
          .bl-form-wrap input,.bl-form-wrap textarea,.bl-form-wrap select{font-size:16px!important}
          .bl-tone-group{gap:6px!important}
          .bl-tone-group button{padding:11px 18px!important;font-size:13px!important;min-height:44px!important}
          .bl-gen-btn{font-size:16px!important;padding:16px!important}
          .bl-sns-platform-group{gap:6px!important}
          .bl-sns-platform-group button{padding:10px 12px!important;font-size:12px!important;min-height:46px!important}
        }
      `}</style>
      {/* 단계 없음 - 자동 전환 */}
      {/* 본문 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* 단계 1: 입력 폼 */}
        {wizStep===1 && (
          <div className="bl-form-wrap" style={{maxWidth:900,margin:"0 auto",padding:"24px 20px 24px"}}>
            {/* ── Progress Bar (큼지막한 노년층 친화 버전) ── */}
            <div style={{marginBottom:32}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                {[1,2,3,4].map(step => (
                  <div key={step} style={{display:"flex",alignItems:"center",gap:10,cursor:step<formStep?"pointer":"default",flex:step<4?1:"none"}} onClick={()=>{if(step<formStep)setFormStep(step);}}>
                    <div style={{
                      width:40,height:40,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:16,fontWeight:800,flexShrink:0,
                      background:formStep===step?accent:formStep>step?accent:(isDark?"rgba(255,255,255,0.08)":"#e9ecef"),
                      color:formStep>=step?"#fff":muted,
                      transition:"all 0.2s ease",
                      boxShadow:formStep===step?`0 0 0 4px ${accent}25`:"none",
                    }}>{formStep>step?<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:step}</div>
                    <span style={{fontSize:14,fontWeight:formStep===step?800:600,color:formStep===step?accent:(formStep>step?text:muted),display:window.innerWidth<480&&step!==formStep?"none":"inline",whiteSpace:"nowrap"}}>
                      {step===1?"소스":step===2?"플랫폼":step===3?"글타입":"스타일"}
                    </span>
                    {step<4&&<div style={{flex:1,height:3,background:formStep>step?accent:(isDark?"rgba(255,255,255,0.1)":"#e0e0e0"),borderRadius:2,transition:"background 0.2s",minWidth:8}}/>}
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,color:muted,textAlign:"center",fontWeight:600}}>{formStep} / 4 단계</div>
            </div>

            {/* ══════ Step 1: Source Selection — 클릭 즉시 Step 2로 ══════ */}
            {formStep===1 && (
              <div>
                <div style={{fontSize:22,fontWeight:900,color:text,marginBottom:6,textAlign:"center",letterSpacing:-0.5}}>어떻게 시작할까요?</div>
                <div style={{fontSize:14,color:muted,marginBottom:28,lineHeight:1.6,textAlign:"center"}}>원하는 방식을 고르면 바로 다음 단계로 넘어갑니다</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(220px,100%),1fr))",gap:14}}>
                  {[
                    {id:"link",title:"링크로 작성",desc:"뉴스 기사나 유튜브 링크 기반으로 작성",color:"#7c6aff",iconSvg:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>},
                    {id:"file",title:"파일로 작성",desc:"이미지·PDF·문서 파일을 분석해서 작성",color:"#ec4899",iconSvg:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
                    {id:"topic",title:"주제 직접 입력",desc:"키워드나 주제를 직접 입력해서 작성",color:"#22c55e",iconSvg:<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>},
                  ].map(src => (
                    <button key={src.id} onClick={()=>{setSourceType(src.id);setFormStep(2);}}
                      style={{
                        padding:"28px 22px",borderRadius:16,textAlign:"left",cursor:"pointer",
                        border:`2px solid ${border}`,
                        background:inputBg,
                        transition:"all 0.15s ease",display:"flex",flexDirection:"column",gap:12,
                        minHeight:180, fontFamily:"inherit",
                      }}
                      onMouseEnter={e=>{
                        e.currentTarget.style.borderColor=src.color;
                        e.currentTarget.style.background=`${src.color}0d`;
                        e.currentTarget.style.transform="translateY(-3px)";
                        e.currentTarget.style.boxShadow=`0 10px 28px ${src.color}22`;
                      }}
                      onMouseLeave={e=>{
                        e.currentTarget.style.borderColor=border;
                        e.currentTarget.style.background=inputBg;
                        e.currentTarget.style.transform="none";
                        e.currentTarget.style.boxShadow="none";
                      }}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{width:60,height:60,borderRadius:15,background:`${src.color}15`,color:src.color,display:"flex",alignItems:"center",justifyContent:"center"}}>{src.iconSvg}</div>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.5}}><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                      <div style={{fontSize:18,fontWeight:800,color:text,letterSpacing:-0.3,marginTop:2}}>{src.title}</div>
                      <div style={{fontSize:13,color:muted,lineHeight:1.6}}>{src.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══════ Step 2: Platform Selection ══════ */}
            {formStep===2 && (
              <div>
                <div style={{fontSize:22,fontWeight:900,color:text,marginBottom:6,textAlign:"center",letterSpacing:-0.5}}>어디에 올릴까요?</div>
                <div style={{fontSize:14,color:muted,marginBottom:24,lineHeight:1.6,textAlign:"center"}}>글을 게시할 플랫폼을 선택해주세요</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(140px,100%),1fr))",gap:12,marginBottom:22}}>
                  {SNS_OPTIONS.map(p => {
                    const isA=platformId===p.id;
                    return (
                      <button key={p.id} onClick={()=>setPlatformId(p.id)}
                        style={{
                          padding:"22px 16px",borderRadius:14,cursor:"pointer",textAlign:"center",
                          border:isA?`2.5px solid ${p.color||accent}`:`2px solid ${border}`,
                          background:isA?(`${p.color||"#7c6aff"}0d`):inputBg,
                          transition:"all 0.15s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                          minHeight:108,fontFamily:"inherit",
                          boxShadow:isA?`0 4px 14px ${p.color||"#7c6aff"}22`:"none",
                        }}>
                        <div style={{width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",color:p.color||muted}}>
                          {p.svg ? p.svg : <img src={p.icon} alt="" style={{width:40,height:40,borderRadius:8,objectFit:"contain"}} onError={e=>{e.target.style.display="none"}}/>}
                        </div>
                        <div style={{fontSize:14,fontWeight:isA?800:600,color:isA?(p.color||accent):text,letterSpacing:-0.2}}>{p.label}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:16,gap:12}}>
                  <button onClick={()=>setFormStep(1)}
                    style={{padding:"16px 28px",borderRadius:14,border:`2px solid ${border}`,background:"transparent",
                      color:text,fontSize:15,fontWeight:700,cursor:"pointer",minHeight:52,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    이전
                  </button>
                  <button onClick={()=>setFormStep(3)}
                    style={{padding:"16px 40px",borderRadius:14,border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:16,fontWeight:800,minHeight:52,display:"flex",alignItems:"center",gap:8}}>
                    다음 단계 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ══════ Step 3: Content Type + Prompt ══════ */}
            {formStep===3 && (
              <div>
                <div style={{fontSize:22,fontWeight:900,color:text,marginBottom:6,textAlign:"center",letterSpacing:-0.5}}>어떤 글을 쓸까요?</div>
                <div style={{fontSize:14,color:muted,marginBottom:24,lineHeight:1.6,textAlign:"center"}}>글의 유형을 고르고 주제를 입력해주세요</div>

                {/* Article type */}
                <div style={{marginBottom:22}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:12}}>{t("selectType")}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(170px,100%),1fr))",gap:10}}>
                    {cfg.subtypes.map(s=>{
                      const isA=subtype===s.id;
                      return <button key={s.id} onClick={()=>handleSubtype(s.id)} style={{padding:"18px 16px",borderRadius:14,textAlign:"left",cursor:"pointer",border:isA?`2.5px solid ${accent}`:`2px solid ${border}`,background:isA?accentBg:inputBg,fontFamily:"inherit",minHeight:96,display:"flex",flexDirection:"column",gap:6,boxShadow:isA?`0 4px 14px ${accent}22`:"none"}}>
                        <div style={{fontSize:22,marginBottom:4,lineHeight:1}}>{s.icon}</div>
                        <div style={{fontSize:15,fontWeight:800,color:isA?accent:text,letterSpacing:-0.3}}>{s.label}</div>
                        <div style={{fontSize:12,color:muted,lineHeight:1.5}}>{s.desc}</div>
                      </button>;
                    })}
                  </div>
                </div>

                {/* ── sourceType별 입력 블록 ── */}
                {sourceType==="link" && (
                  <div style={{marginBottom:22,padding:"22px 24px",borderRadius:14,background:isDark?"rgba(124,106,255,0.06)":"rgba(124,106,255,0.04)",border:`1.5px solid ${accent}33`}}>
                    <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                      링크 붙여넣기
                    </div>
                    <div style={{fontSize:12,color:muted,marginBottom:12}}>뉴스 기사나 유튜브 주소를 넣으면 제목·본문을 자동으로 가져와요</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")fetchFromUrl();}}
                        placeholder="https:// 로 시작하는 주소를 붙여넣기"
                        style={{flex:1,minWidth:200,padding:"14px 16px",borderRadius:12,border:`1.5px solid ${inputBdr}`,background:inputBg,color:text,fontSize:15,fontFamily:"inherit",outline:"none",minHeight:50}}/>
                      <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                        style={{padding:"14px 26px",borderRadius:12,border:"none",cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer",background:accent,color:"#fff",fontSize:15,fontWeight:800,opacity:urlLoading||!urlInput.trim()?0.5:1,flexShrink:0,whiteSpace:"nowrap",minHeight:50,fontFamily:"inherit"}}>
                        {urlLoading?"불러오는 중...":"불러오기"}
                      </button>
                    </div>
                    {urlResult && (
                      <div style={{marginTop:12,padding:"12px 14px",borderRadius:12,background:isDark?"rgba(255,255,255,0.04)":"#fff",border:`1px solid ${border}`,display:"flex",gap:12,alignItems:"center"}}>
                        {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{width:56,height:42,objectFit:"cover",borderRadius:8,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:800,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{urlResult.title}</div>
                          <div style={{fontSize:12,color:"#22c55e",marginTop:3,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {urlResult.type==="youtube"?"유튜브":urlResult.type==="news"?"뉴스":"웹페이지"} · 주제 자동 입력됨
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sourceType==="file" && (
                  <div style={{marginBottom:22,padding:"22px 24px",borderRadius:14,background:isDark?"rgba(236,72,153,0.06)":"rgba(236,72,153,0.04)",border:`1.5px solid rgba(236,72,153,0.3)`}}>
                    <div style={{fontSize:14,fontWeight:800,color:text,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      파일 업로드
                    </div>
                    <div style={{fontSize:12,color:muted,marginBottom:12}}>이미지·PDF·문서 파일을 올리면 내용을 분석해서 글의 소재로 사용해요 (10MB 이하, 여러 개 가능)</div>
                    {fields._files && fields._files.length > 0 && (
                      <div style={{marginBottom:12,display:"flex",flexWrap:"wrap",gap:6}}>
                        {fields._files.map((f,i) => (
                          <span key={i} style={{fontSize:13,padding:"8px 14px",borderRadius:10,background:isDark?"rgba(236,72,153,0.15)":"rgba(236,72,153,0.1)",color:"#ec4899",display:"inline-flex",alignItems:"center",gap:8,fontWeight:700}}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            {f.name}
                            <button onClick={()=>{const nf=[...fields._files];nf.splice(i,1);setField("_files",nf);}} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,display:"flex",alignItems:"center",opacity:0.7}} aria-label="제거">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input type="file" accept="image/*,.pdf,.txt,.doc,.docx,.csv,.xlsx,.pptx,.hwp" multiple style={{display:"none"}} id="blog-file-input"
                      onChange={async (e) => {
                        const fileList = Array.from(e.target.files || []);
                        if (!fileList.length) return;
                        e.target.value = "";
                        const maxSize = 10 * 1024 * 1024;
                        const valid = fileList.filter(f => f.size <= maxSize);
                        if (valid.length < fileList.length) alert(`${fileList.length - valid.length}개 파일이 10MB 초과로 제외되었습니다.`);
                        if (!valid.length) return;
                        setField("extra", (fields.extra ? fields.extra + "\n" : "") + `${valid.length}개 파일 분석 중...`);
                        const prevFiles = fields._files || [];
                        const newFiles = [...prevFiles];
                        let allResults = "";
                        for (const file of valid) {
                          try {
                            if (file.type.startsWith("image/")) {
                              const base64 = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
                              const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:base64.split(",")[1]}},{type:"text",text:"이 이미지의 내용을 한국어로 상세히 설명해주세요. 블로그 글 주제로 사용할 수 있게 핵심 키워드와 설명을 제공해주세요."}]}], 500);
                              allResults += `\n[${file.name}] 이미지: ${txt.slice(0, 200)}`;
                              newFiles.push({ name: file.name, type: "image", summary: txt.slice(0, 200) });
                            } else {
                              const text2 = await file.text().catch(() => "");
                              const summary = text2.slice(0, 2000);
                              allResults += `\n[${file.name}] ${summary.slice(0, 300)}`;
                              newFiles.push({ name: file.name, type: "text", summary: summary.slice(0, 300) });
                            }
                          } catch(err) {
                            allResults += `\n[${file.name}] 분석 실패: ${err.message}`;
                          }
                        }
                        if (!fields.keyword && allResults) {
                          const firstLine = allResults.split("\n").find(l => l.trim().length > 10)?.trim()?.slice(0,80);
                          if (firstLine) setField("keyword", firstLine);
                        }
                        setField("extra", (fields.extra?.replace(/\d+개 파일 분석 중\.\.\./, "").replace("파일 분석 중...", "") || "") + "참고 파일:" + allResults);
                        setField("_files", newFiles);
                      }}/>
                    <button onClick={() => document.getElementById("blog-file-input")?.click()}
                      style={{width:"100%",padding:"16px",borderRadius:12,border:`2px dashed rgba(236,72,153,0.4)`,background:"transparent",color:"#ec4899",fontSize:14,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",minHeight:56,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      {fields._files?.length ? "파일 더 추가하기" : "파일 선택 또는 드래그"}
                    </button>
                  </div>
                )}

                {/* Keyword input (topic 모드일 땐 메인 입력, 링크/파일 모드일 땐 자동 채워진 주제 확인·편집) */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:8}}>
                    {sourceType==="topic" ? (FIELD_LABELS.keyword?.label || "주제 / 키워드") : "주제 (자동 입력 · 수정 가능)"}<span style={{color:"#ef4444"}}> *</span>
                  </div>
                  <input type="text" value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}
                    placeholder={sourceType==="link" ? "링크를 불러오면 자동으로 채워집니다" : sourceType==="file" ? "파일을 업로드하면 자동으로 채워집니다" : (FIELD_LABELS.keyword?.placeholder || "예) 봄철 캠핑 준비물 추천")}
                    style={{...IS,fontSize:15,padding:"14px 16px",minHeight:48,borderColor:(error&&!fields.keyword?.trim())?"#ef4444":inputBdr}}/>
                  {fields.keyword && fields.keyword.trim() && (
                    <div style={{marginTop:8,display:"flex",gap:6}}>
                      <button onClick={suggestTitle} disabled={titleLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        {titleLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>추천 중...</>:"AI 제목 추천"}
                      </button>
                      <button onClick={suggestSeo} disabled={seoLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.08)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        {seoLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid #10b981",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>조회 중...</>:"SEO 키워드"}
                      </button>
                    </div>
                  )}
                  {titleSugg.length>0 && (
                    <div style={{marginTop:10,background:isDark?"rgba(99,102,241,0.08)":"#f0f0ff",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(99,102,241,0.15)"}}>
                      <div style={{fontSize:12,color:accent,fontWeight:700,marginBottom:8}}>추천 제목 (클릭 시 적용)</div>
                      {titleSugg.map(function(t,i){return(
                        <div key={i} onClick={function(){setField("keyword",t);setTitleSugg([]);}} style={{fontSize:13,color:text,padding:"5px 0",cursor:"pointer",borderBottom:i<titleSugg.length-1?"1px solid "+border:"none",lineHeight:1.6}}>{t}</div>
                      );})}
                    </div>
                  )}
                  {seoKeys.length>0 && (
                    <div style={{marginTop:10,background:isDark?"rgba(16,185,129,0.06)":"#f0fdf9",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(16,185,129,0.15)"}}>
                      <div style={{fontSize:12,color:"#10b981",fontWeight:700,marginBottom:8}}>SEO 연관 키워드</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {seoKeys.map(function(k,i){return(
                          <span key={i} onClick={function(){setField("extra",(fields.extra?fields.extra+", ":"")+k);}} style={{fontSize:12,padding:"4px 11px",borderRadius:12,background:"rgba(16,185,129,0.12)",color:"#10b981",cursor:"pointer",border:"1px solid rgba(16,185,129,0.2)"}}>{k}</span>
                        );})}
                      </div>
                    </div>
                  )}
                  <KeywordInsightPanel keyword={fields.keyword} isDark={isDark} onKeywordSelect={(kw)=>setField("keyword",kw)}/>
                </div>

                {/* Custom prompt (extra) */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:8}}>추가 지시사항 <span style={{fontSize:12,fontWeight:500,color:muted}}>(선택)</span></div>
                  <textarea value={fields.extra||""} onChange={e=>setField("extra",e.target.value)} rows={3}
                    placeholder="AI에게 전달할 내용을 자유롭게 적어주세요. 예) 초보자도 이해할 수 있게, 사례 중심으로"
                    style={{...IS,fontSize:15,padding:"14px 16px",resize:"none",lineHeight:1.6}}/>
                </div>

                {error&&<div style={{fontSize:14,color:"#ef4444",marginBottom:12,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"12px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>{error}
                  {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                    <button onClick={()=>window.location.hash="#pricing"} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",minHeight:40}}>충전하기</button>
                  )}
                </div>}

                <div style={{display:"flex",justifyContent:"space-between",marginTop:16,gap:12}}>
                  <button onClick={()=>setFormStep(2)}
                    style={{padding:"16px 28px",borderRadius:14,border:`2px solid ${border}`,background:"transparent",
                      color:text,fontSize:15,fontWeight:700,cursor:"pointer",minHeight:52,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    이전
                  </button>
                  <button onClick={async ()=>{
                    // 링크 모드: URL 입력만 해두고 불러오기 안 눌렀으면 자동 실행
                    if (sourceType==="link" && urlInput.trim() && !urlResult) {
                      await fetchFromUrl();
                    }
                    // 파일 모드: 파일은 있는데 keyword가 비어있으면 첫 파일명으로 폴백
                    if (sourceType==="file" && !fields.keyword?.trim() && fields._files?.length) {
                      const fallback = fields._files[0].name?.replace(/\.[^.]+$/, "").slice(0, 60);
                      if (fallback) setField("keyword", fallback);
                    }
                    if (!fields.keyword?.trim()) {
                      setError(sourceType==="link" ? "링크를 먼저 불러와주세요." : sourceType==="file" ? "파일을 먼저 업로드해주세요." : "주제를 입력해주세요.");
                      return;
                    }
                    setError("");
                    setFormStep(4);
                  }} disabled={urlLoading}
                    style={{padding:"16px 40px",borderRadius:14,border:"none",cursor:urlLoading?"not-allowed":"pointer",
                      background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",
                      color:"#fff",fontSize:16,fontWeight:800,opacity:urlLoading?0.5:1,minHeight:52,display:"flex",alignItems:"center",gap:8}}>
                    {urlLoading ? "링크 불러오는 중..." : <>다음 단계 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></>}
                  </button>
                </div>
              </div>
            )}

            {/* ══════ Step 4: Style Settings ══════ */}
            {formStep===4 && (
              <div>
                <div style={{fontSize:22,fontWeight:900,color:text,marginBottom:6,textAlign:"center",letterSpacing:-0.5}}>마지막! 스타일을 골라주세요</div>
                <div style={{fontSize:14,color:muted,marginBottom:24,lineHeight:1.6,textAlign:"center"}}>글의 톤, 말투, 분량을 정해주세요</div>

                {/* Tone */}
                <div style={{marginBottom:22}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:10}}>{t("selectTone")}</div>
                  <div className="bl-tone-group" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {cfg.tones.map(t=>{const isA=tone===t.id;return<button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"12px 22px",borderRadius:24,border:`2px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:14,fontWeight:isA?800:600,cursor:"pointer",minHeight:44,fontFamily:"inherit"}}>{t.label}</button>;})}
                  </div>
                </div>

                {/* Speech style */}
                <div style={{marginBottom:22}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:10}}>말투</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {SPEECH_STYLES.map(s=>{const isA=speechStyle===s.id;return<button key={s.id} onClick={()=>setSpeechStyle(s.id)} title={s.desc} style={{padding:"12px 22px",borderRadius:24,border:`2px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:14,fontWeight:isA?800:600,cursor:"pointer",minHeight:44,fontFamily:"inherit"}}>{s.label}</button>;})}
                  </div>
                </div>

                {/* Word count / Length */}
                <div style={{marginBottom:28}}>
                  <div style={{fontSize:14,fontWeight:700,color:text,marginBottom:10}}>
                    {t("selectLength")}
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {cfg.wordCounts.map(w=>{
                      const isA=wordCount===w.id;
                      return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"14px 22px",borderRadius:14,cursor:"pointer",textAlign:"left",border:`2px solid ${isA?accent:border}`,background:isA?accentBg:inputBg,minHeight:64,minWidth:120,fontFamily:"inherit",display:"flex",flexDirection:"column",justifyContent:"center",gap:3}}>
                        <div style={{fontSize:15,fontWeight:800,color:isA?accent:text,letterSpacing:-0.2}}>{w.label}</div>
                        {w.desc && <div style={{fontSize:12,color:muted}}>{w.desc}</div>}
                      </button>;
                    })}
                  </div>
                </div>

                {error&&<div style={{fontSize:14,color:"#ef4444",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"12px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>{error}
                  {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                    <button onClick={()=>window.location.hash="#pricing"} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",minHeight:40}}>충전하기</button>
                  )}
                </div>}

                <div style={{display:"flex",justifyContent:"space-between",marginTop:16,gap:12}}>
                  <button onClick={()=>setFormStep(3)}
                    style={{padding:"16px 28px",borderRadius:14,border:`2px solid ${border}`,background:"transparent",
                      color:text,fontSize:15,fontWeight:700,cursor:"pointer",minHeight:56,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    이전
                  </button>
                  <button className="bl-gen-btn" onClick={handleGenerateClick} disabled={loading||!fields.keyword?.trim()}
                    style={{padding:"16px 36px",borderRadius:14,border:"none",cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",
                      background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                      color:fields.keyword?.trim()?"#fff":muted,fontSize:17,fontWeight:800,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                      opacity:loading||!fields.keyword?.trim()?0.5:1,transition:"opacity 0.15s",minHeight:56,
                      boxShadow:fields.keyword?.trim()?"0 8px 24px rgba(124,106,255,0.35)":"none"}}>
                    {loading ? (<><div style={{width:20,height:20,border:"2.5px solid rgba(255,255,255,0.3)",borderTop:"2.5px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>) : user ? (<><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>글 생성하기 <span style={{fontSize:13,opacity:0.85,fontWeight:700,marginLeft:2,background:"rgba(255,255,255,0.18)",padding:"3px 10px",borderRadius:10}}>20P</span></>) : (<>1회 생성해보기</>)}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* 단계 2~3: 결과 */}
        {wizStep>=2 && renderResult()}
      </div>
    </div>
  );

  if (embedded) return <div style={{flex:1,display:"flex",overflow:"hidden",fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",background:isDark?"transparent":"#f4f4f8",color:text}}>{content}</div>;
  return (
    <div style={{minHeight:"100vh",background:isDark?"#0f0c29":"#f8f9fa",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      <div style={{background:isDark?"rgba(255,255,255,0.02)":"#fff",padding:"32px 24px 24px"}}>
        <div style={{maxWidth:620,margin:"0 auto"}}>
          <div style={{display:"inline-block",padding:"4px 12px",borderRadius:16,background:"rgba(124,106,255,0.1)",fontSize:11,fontWeight:700,color:"#7c6aff",marginBottom:12}}>AI 글쓰기</div>
          <div style={{fontSize:22,fontWeight:900,color:text,lineHeight:1.3,marginBottom:6}}>주제를 입력하면<br/>AI가 글을 작성해드려요</div>
          <div style={{fontSize:13,color:isDark?"rgba(255,255,255,0.5)":"#999",marginBottom:28}}>원하는 SNS 플랫폼을 선택하고, 주제와 스타일을 정해주세요.</div>
          {/* SNS 플랫폼 선택 — 카테고리 탭 + 버튼 */}
          {(() => {
            const SNS_CATS = [
              {id:"all",label:"전체"},
              {id:"korea_blog",label:"블로그"},
              {id:"korea_sns",label:"한국 SNS"},
              {id:"global_sns",label:"글로벌 SNS"},
              {id:"video",label:"영상"},
              {id:"commerce",label:"커머스"},
              {id:"newsletter",label:"뉴스레터"},
              {id:"convert",label:"변환"},
            ];
            const SNS_LIST = [
              // 블로그
              {id:"blog_naver",label:"네이버 블로그",icon:"/icon-naver-blog.png",cat:"korea_blog"},
              {id:"blog_cafe",label:"네이버 카페",icon:"/icon-naver-cafe.webp",cat:"korea_blog"},
              {id:"blog_naverpost",label:"네이버 포스트",icon:"/icon-naver-blog.png",cat:"korea_blog"},
              {id:"blog_tistory",label:"티스토리",icon:"/icon-tistory.png",cat:"korea_blog"},
              {id:"blog_brunch",label:"브런치",icon:"/icon-tistory.png",cat:"korea_blog"},
              {id:"blog_homepage",label:"홈페이지/웹사이트",icon:"/icon-tistory.png",cat:"korea_blog"},
              // 한국 SNS
              {id:"blog_insta",label:"인스타그램",icon:"/icon-instagram.webp",cat:"korea_sns"},
              {id:"blog_thread",label:"스레드",icon:"/icon-threads.png",cat:"korea_sns"},
              {id:"blog_kakaostory",label:"카카오스토리",icon:"/icon-naver-cafe.webp",cat:"korea_sns"},
              {id:"blog_band",label:"네이버 밴드",icon:"/icon-naver-cafe.webp",cat:"korea_sns"},
              {id:"blog_weverse",label:"위버스",icon:"/icon-threads.png",cat:"korea_sns"},
              // 글로벌 SNS
              {id:"blog_x",label:"X (트위터)",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_facebook",label:"페이스북",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_linkedin",label:"링크드인",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_bluesky",label:"Bluesky",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_mastodon",label:"Mastodon",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_pinterest",label:"핀터레스트",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_reddit",label:"레딧",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_medium",label:"Medium",icon:"/icon-threads.png",cat:"global_sns"},
              {id:"blog_telegram",label:"텔레그램",icon:"/icon-threads.png",cat:"global_sns"},
              // 영상
              {id:"blog_youtube",label:"유튜브",icon:"/icon-youtube.png",cat:"video"},
              {id:"blog_tiktok",label:"틱톡",icon:"/icon-youtube.png",cat:"video"},
              // 커머스
              {id:"blog_daangn",label:"당근마켓",icon:"/icon-naver-cafe.webp",cat:"commerce"},
              {id:"blog_bunjang",label:"번장",icon:"/icon-naver-cafe.webp",cat:"commerce"},
              {id:"blog_coupang",label:"쿠팡 상품설명",icon:"/icon-naver-cafe.webp",cat:"commerce"},
              {id:"blog_smartstore",label:"스마트스토어",icon:"/icon-naver-blog.png",cat:"commerce"},
              // 뉴스레터
              {id:"blog_substack",label:"Substack",icon:"/icons3d/news.png",cat:"newsletter"},
              // 변환
              {id:"blog_link",label:"유튜브 > 블로그",icon:"/icon-youtube.png",cat:"convert"},
              {id:"blog_news",label:"뉴스 > 블로그",icon:"/icons3d/news.png",cat:"convert"},
            ];
            const filtered = snsCat === "all" ? SNS_LIST : SNS_LIST.filter(p => p.cat === snsCat);
            const tabStyle = (active) => ({
              padding:"10px 18px",borderRadius:24,border:"none",
              background:active?(isDark?"rgba(124,106,255,0.2)":"#7c6aff"):"transparent",
              color:active?"#fff":(isDark?"rgba(255,255,255,0.55)":"#666"),
              fontSize:13,fontWeight:active?800:600,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",
              minHeight:40,
            });
            return (
              <>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  {SNS_CATS.map(c => (
                    <button key={c.id} onClick={() => setSnsCat(c.id)} style={tabStyle(snsCat===c.id)}>{c.label}</button>
                  ))}
                </div>
                <div className="bl-sns-platform-group" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(120px,100%),1fr))",gap:8}}>
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => setPlatformId(p.id)}
                      style={{padding:"12px 14px",borderRadius:12,border:`2px solid ${platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.1)":"#e5e7eb")}`,background:platformId===p.id?(isDark?"rgba(124,106,255,0.12)":"#f8f7ff"):(isDark?"rgba(255,255,255,0.03)":"#fff"),cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:platformId===p.id?800:600,color:platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.75)":"#444"),transition:"all 0.15s",minHeight:48,fontFamily:"inherit"}}>
                      <img src={p.icon} alt="" style={{width:22,height:22,borderRadius:5,objectFit:"contain",flexShrink:0}} onError={e=>{e.target.style.display="none"}}/>
                      <span style={{textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
      {/* 기존 select 제거됨 — 위 카테고리 탭 + 버튼으로 대체 */}
      <div style={{height:"calc(100vh - 80px)",display:"flex"}}>{content}</div>
    </div>
  );
}
