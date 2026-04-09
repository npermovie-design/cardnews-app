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
  const [fields,     setFields]     = useState({});
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
  const [formStep, setFormStep] = useState(1); // 1~4 wizard steps
  const [sourceType, setSourceType] = useState(null); // "link" | "file" | "topic"
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
  const setField = (k,v) => setFields(p=>({...p,[k]:v}));
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
    if (!fields.keyword?.trim()) { setError("키워드 / 주제를 입력해주세요."); return; }
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
  const fetchInlineImages = async (blogText) => {
    if (!blogText) return;
    const imgTags = blogText.match(/\[(?:이미지|image):\s*([^\]]+)\]/g);
    if (!imgTags || imgTags.length === 0) return;
    const keywords = imgTags.map(tag => tag.replace(/\[(?:이미지|image):\s*/, "").replace(/\]$/, "").trim());
    const uniqueKeywords = [...new Set(keywords)];

    // 단일 키워드 이미지 검색 (Pexels → Unsplash → Pixabay → Picsum)
    const searchOne = async (kw, idx) => {
      const q = encodeURIComponent(kw.trim());
      // 1) Pexels (영문 검색 정확도 높음)
      try {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${q}&per_page=8&orientation=landscape`);
        if (r.ok) { const d = await r.json(); if (d.photos?.length) return d.photos[idx % d.photos.length].src.large; }
      } catch {}
      // 2) Unsplash
      try {
        const r = await fetch(`/api/proxy-unsplash?query=${q}&per_page=5&orientation=landscape`);
        if (r.ok) { const d = await r.json(); if (d.results?.length) return d.results[idx % d.results.length].urls.regular; }
      } catch {}
      // 3) Pixabay (영문)
      try {
        const r = await fetch(`/api/proxy-pixabay?q=${q}&per_page=8&safesearch=true&image_type=photo&lang=en`);
        if (r.ok) { const d = await r.json(); if (d.hits?.length) return d.hits[idx % d.hits.length].webformatURL; }
      } catch {}
      // 4) Picsum 최종 폴백
      return `https://picsum.photos/seed/${encodeURIComponent(kw.slice(0, 20))}/800/450`;
    };

    // 병렬로 모든 키워드 검색
    const results = await Promise.all(uniqueKeywords.map((kw, i) => searchOne(kw, i)));
    const imgMap = {};
    uniqueKeywords.forEach((kw, i) => { imgMap[kw] = results[i]; });
    setInlineImages(imgMap);
  };

  /* ── 픽사베이·픽셀스 이미지 자동 추천 ── */
  const fetchImages = async (keyword) => {
    if (!keyword) return;
    setImgSearching(true); setSuggestedImages([]);
    const imgs = [];
    try {
      {
        const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(keyword)}&per_page=10&safesearch=true&image_type=photo&lang=ko`);
        const d = await r.json();
        (d.hits||[]).forEach(h => imgs.push({ id:"px"+h.id, preview:h.webformatURL, url:h.largeImageURL||h.webformatURL, src:"Pixabay" }));
      }
      {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(keyword)}&per_page=10`);
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

  const handleCopy = async (content, withImages) => {
    const cleaned = cleanForCopy(content);
    if (withImages && Object.keys(inlineImages).length > 0) {
      setCopyLoading(true);
      try {
        // 이미지 태그에서 키워드 추출
        const imgTags = cleaned.match(/\[(?:이미지|image):\s*([^\]]+)\]/g) || [];
        const descs = imgTags.map(tag => tag.replace(/\[(?:이미지|image):\s*/, "").replace(/\]$/, "").trim());
        const uniqueDescs = [...new Set(descs)];

        // 모든 이미지를 병렬로 base64 변환
        const base64Map = {};
        const conversionResults = await Promise.allSettled(
          uniqueDescs.map(async (desc) => {
            const url = inlineImages[desc];
            if (!url) return { desc, data: null };
            const data = await imageUrlToBase64(url);
            return { desc, data };
          })
        );
        conversionResults.forEach(r => {
          if (r.status === "fulfilled" && r.value?.data) {
            base64Map[r.value.desc] = r.value.data;
          }
        });

        let html = cleaned;
        const hasAnyImage = Object.keys(base64Map).length > 0;
        html = html.replace(/\[(?:이미지|image):\s*([^\]]+)\]/g, (match, desc) => {
          const trimmed = desc.trim();
          const dataUri = base64Map[trimmed];
          if (dataUri) {
            return `<br/><img src="${dataUri}" alt="${trimmed}" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;" /><br/>`;
          }
          // base64 변환 실패 시 원본 URL로 폴백
          const url = inlineImages[trimmed];
          if (url) return `<br/><img src="${url}" alt="${trimmed}" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;" /><br/>`;
          return match;
        });
        html = html.replace(/\n/g, "<br/>");

        try {
          if (navigator.clipboard?.write) {
            await navigator.clipboard.write([new ClipboardItem({
              "text/html": new Blob([html], {type: "text/html"}),
              "text/plain": new Blob([cleaned], {type: "text/plain"})
            })]);
          } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(cleaned);
          } else { fallbackCopy(cleaned); }
        } catch { fallbackCopy(cleaned); }
      } catch {
        // 전체 실패 시 텍스트만 복사
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
          <LoadingAnimation featureType={initialType || "blog_write"} title="AI가 글을 작성하고 있어요" subtitle={`${fields.keyword} · ${cfg.title}`} isDark={isDark} />
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
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 18px",borderBottom:`1px solid ${border}`,background:headerBg,flexWrap:"wrap",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {isTistory && result && ["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"4px 10px",borderRadius:12,border:`1px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:viewMode===mode?700:400,cursor:"pointer"}}>
                {mode==="text"?"원문":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
            {!isTistory&&result&&<span style={{fontSize:12,fontWeight:700,color:text}}>{t("genResult")}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {result&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:12,
                background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                border:`1px solid ${border}`}}>
                <span style={{fontSize:10,color:muted}}>{t("charTotal")}</span>
                <span style={{fontSize:12,fontWeight:700,color:text}}>{result.length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>{t("charNoSpace")}</span>
                <span style={{fontSize:12,fontWeight:700,color:accent}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
                <span style={{width:1,height:10,background:border,display:"inline-block"}}/>
                <span style={{fontSize:10,color:muted}}>{t("charWithSpace")}</span>
                <span style={{fontSize:12,fontWeight:700,color:muted}}>{result.replace(/\s/g," ").length.toLocaleString()}</span>
              </div>
            )}
            {result&&(
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result, true)}
                  disabled={copyLoading}
                  style={{padding:"5px 14px",borderRadius:12,border:`1px solid ${copied?"rgba(74,222,128,0.4)":border}`,
                    background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                    color:copied?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:copyLoading?"wait":"pointer",
                    display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",opacity:copyLoading?0.6:1}}>
                  {copyLoading?"⏳ 이미지 변환 중...":copied?"✓ 복사됨":"📋 복사 (이미지 포함)"}
                </button>
              </div>
            )}
            {result&&<button onClick={handleAiImage} disabled={aiImgLoading}
              style={{padding:"5px 12px",borderRadius:12,border:`1px solid ${aiImgUrl?"rgba(74,222,128,0.4)":border}`,
                background:aiImgUrl?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):"transparent",
                color:aiImgUrl?"#4ade80":accent,fontSize:12,fontWeight:700,cursor:aiImgLoading?"wait":"pointer",whiteSpace:"nowrap"}}>
              {aiImgLoading?"⏳ 생성 중...":aiImgUrl?"✓ 이미지 생성됨":"🎨 AI 이미지"}
            </button>}
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
                    style={{ padding:"7px 14px", borderRadius:10, border:`1.5px solid ${done ? "rgba(74,222,128,0.5)" : b.c+"50"}`,
                      background: done ? (isDark ? "rgba(74,222,128,0.12)" : "#f0fdf4") : (isDark ? b.c+"15" : b.c+"08"),
                      color: done ? "#4ade80" : (isDark ? "#fff" : b.c),
                      fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", opacity: isPub || b.soon ? 0.5 : 1 }}>
                    {isPub
                      ? <div style={{ width:12, height:12, borderRadius:"50%", border:`2px solid ${b.c}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />
                      : <img src={b.i} alt="" style={{ width:18, height:18, objectFit:"contain", borderRadius:3 }} />
                    }
                    {isPub ? "발행 중..." : done ? (publishResult?.clipboard ? "복사 완료" : "발행 완료") : b.soon ? "준비중" : b.l}
                  </button>
                );
              });
            })()}
            {result && initialType === "blog_thread" && (
              <button onClick={()=>setShowSchedule(!showSchedule)}
                style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${showSchedule?"#7c6aff50":isDark?"rgba(255,255,255,0.1)":"#ddd"}`,
                  background:showSchedule?(isDark?"#7c6aff15":"#7c6aff08"):"transparent",color:showSchedule?"#7c6aff":(isDark?"rgba(255,255,255,0.5)":"#888"),
                  fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                예약 발행
              </button>
            )}
            {result&&isTistory&&["text","html","preview"].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)}
                style={{padding:"4px 10px",borderRadius:12,border:`1px solid ${viewMode===mode?accentRaw:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:muted,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {mode==="text"?"텍스트":mode==="html"?"HTML":"미리보기"}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {/* AI 생성 이미지 */}
          {aiImgUrl && (
            <div style={{marginBottom:16,borderRadius:14,overflow:"hidden",border:`1px solid ${border}`,position:"relative"}}>
              <img src={aiImgUrl} alt="AI 생성 이미지" style={{width:"100%",maxHeight:300,objectFit:"cover",display:"block"}}/>
              <div style={{position:"absolute",top:8,right:8,display:"flex",gap:6}}>
                <button onClick={()=>{const a=document.createElement("a");a.href=aiImgUrl;a.download="ai-image.png";a.click();}}
                  style={{padding:"4px 10px",borderRadius:8,border:"none",background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:700}}>⬇ 다운로드</button>
                <button onClick={()=>setAiImgUrl(null)}
                  style={{padding:"4px 8px",borderRadius:8,border:"none",background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:13,cursor:"pointer"}}>✕</button>
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
            style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"22px 24px",fontSize:15,color:text,minHeight:120,lineHeight:1.9,cursor:"text",outline:"none",transition:"outline 0.15s"}}>
            {renderMarkdown(result, isDark, text, muted, accentRaw, inlineImages)}
            {loading&&<span style={{display:"inline-block",width:2,height:14,background:accent,marginLeft:2,animation:"blink 1s infinite"}}/>}
          </div>}
          {isTistory&&viewMode==="html"&&htmlResult&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"18px 20px"}}><pre style={{fontSize:12,color:isDark?"#a5b4fc":"#4f46e5",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"'Consolas','Monaco',monospace",margin:0}}>{htmlResult}</pre></div>}
          {isTistory&&viewMode==="preview"&&htmlResult&&<div style={{background:"#fff",border:"1px solid #e9ecef",borderRadius:12,padding:"24px 28px"}} dangerouslySetInnerHTML={{__html:htmlResult}}/>}

          {publishResult&&<div style={{marginTop:12,padding:"12px 16px",borderRadius:12,display:"flex",alignItems:"center",gap:10,background:publishResult.success?(isDark?"rgba(74,222,128,0.08)":"#f0fdf4"):(isDark?"rgba(245,158,11,0.08)":"#fffbeb"),border:`1px solid ${publishResult.success?"rgba(74,222,128,0.2)":"rgba(245,158,11,0.2)"}`}}><span style={{fontSize:16}}>{publishResult.success?"✓":publishResult.clipboard?"📋":"✗"}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:publishResult.success?"#4ade80":publishResult.clipboard?"#f59e0b":"#f87171"}}>{publishResult.success?"발행 성공!":publishResult.clipboard?"클립보드에 복사됨":"발행 실패"}</div>{publishResult.postUrl&&<a href={publishResult.postUrl} target="_blank" rel="noopener" style={{fontSize:11,color:accent}}>게시글 확인 →</a>}{publishResult.message&&<div style={{fontSize:11,color:muted}}>{publishResult.message}</div>}{publishResult.error&&<div style={{fontSize:11,color:"#f87171"}}>{publishResult.error}</div>}</div><button onClick={()=>setPublishResult(null)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:14}}>✕</button></div>}
          {/* 예약 발행 UI */}
          {showSchedule && result && (
            <div style={{marginTop:12,padding:"16px",borderRadius:12,background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)",border:`1px solid ${isDark?"rgba(124,106,255,0.2)":"rgba(124,106,255,0.1)"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:text}}>스레드 예약 발행</span>
                <button onClick={()=>setShowSchedule(false)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:14}}>✕</button>
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
          .bl-sns-platform-group button{padding:6px 10px!important;font-size:11px!important}
        }
        @media(max-width:480px){
          .bl-form-wrap{padding:12px 10px 20px!important}
          .bl-form-wrap input,.bl-form-wrap textarea,.bl-form-wrap select{font-size:16px!important}
          .bl-tone-group{gap:4px!important}
          .bl-tone-group button{padding:5px 10px!important;font-size:11px!important;min-height:36px!important}
          .bl-gen-btn{font-size:14px!important;padding:14px!important}
          .bl-sns-platform-group{gap:4px!important}
          .bl-sns-platform-group button{padding:5px 8px!important;font-size:10px!important}
        }
      `}</style>
      {/* 단계 없음 - 자동 전환 */}
      {/* 본문 */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* 단계 1: 입력 폼 */}
        {wizStep===1 && (
          <div className="bl-form-wrap" style={{maxWidth:900,margin:"0 auto",padding:"24px 20px 24px"}}>
            {/* ── Progress Bar ── */}
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                {[1,2,3,4].map(step => (
                  <div key={step} style={{display:"flex",alignItems:"center",gap:6,cursor:step<formStep?"pointer":"default"}} onClick={()=>{if(step<formStep)setFormStep(step);}}>
                    <div style={{
                      width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:700,
                      background:formStep===step?accent:formStep>step?accent:(isDark?"rgba(255,255,255,0.08)":"#e9ecef"),
                      color:formStep>=step?"#fff":muted,
                      transition:"all 0.2s ease",
                    }}>{formStep>step?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:step}</div>
                    <span style={{fontSize:11,fontWeight:formStep===step?700:400,color:formStep===step?accent:muted,display:window.innerWidth<480&&step!==formStep?"none":"inline"}}>
                      {step===1?"소스 선택":step===2?"플랫폼":step===3?"글타입":"스타일"}
                    </span>
                    {step<4&&<div style={{width:window.innerWidth<600?16:40,height:2,background:formStep>step?accent:(isDark?"rgba(255,255,255,0.1)":"#e0e0e0"),borderRadius:1,transition:"background 0.2s"}}/>}
                  </div>
                ))}
              </div>
              <div style={{height:3,borderRadius:2,background:isDark?"rgba(255,255,255,0.06)":"#e9ecef",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${accent},#8b5cf6)`,width:`${(formStep/4)*100}%`,transition:"width 0.3s ease"}}/>
              </div>
            </div>

            {/* ══════ Step 1: Source Selection ══════ */}
            {formStep===1 && (
              <div>
                <div style={{fontSize:16,fontWeight:800,color:text,marginBottom:4,textAlign:"center"}}>글 작성 방식을 선택하세요</div>
                <div style={{fontSize:12,color:muted,marginBottom:18,lineHeight:1.6,textAlign:"center"}}>소스를 선택하면 해당 입력창이 나타납니다</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
                  {[
                    {id:"link",title:"링크로 작성",desc:"뉴스 기사, 유튜브 링크를 넣으면 주제를 자동으로 채워드려요",iconSvg:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sourceType==="link"?accent:muted} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>},
                    {id:"file",title:"파일로 작성",desc:"이미지, PDF, 문서 파일을 분석해서 글의 소재로 활용합니다",iconSvg:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sourceType==="file"?accent:muted} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
                    {id:"topic",title:"주제 직접 입력",desc:"키워드나 주제를 직접 입력해서 글을 작성합니다",iconSvg:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sourceType==="topic"?accent:muted} strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>},
                  ].map(src => {
                    const isA=sourceType===src.id;
                    return (
                      <button key={src.id} onClick={()=>setSourceType(src.id)}
                        style={{
                          padding:"20px 18px",borderRadius:14,textAlign:"left",cursor:"pointer",
                          border:isA?`2px solid ${accent}`:`2px solid ${border}`,
                          background:isA?accentBg:inputBg,
                          transition:"all 0.15s ease",display:"flex",flexDirection:"column",gap:8,
                        }}>
                        <div>{src.iconSvg}</div>
                        <div style={{fontSize:14,fontWeight:700,color:isA?accent:text}}>{src.title}</div>
                        <div style={{fontSize:11,color:muted,lineHeight:1.5}}>{src.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Inline: Link input */}
                {sourceType==="link" && (
                  <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("urlImportLabel")}</div>
                    <div style={{display:"flex",gap:8}}>
                      <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")fetchFromUrl();}}
                        placeholder="https://... URL 붙여넣기"
                        style={{flex:1,padding:"11px 14px",borderRadius:12,border:`1.5px solid ${inputBdr}`,background:inputBg,color:text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                      <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                        style={{padding:"8px 16px",borderRadius:12,border:"none",cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer",background:"rgba(99,102,241,0.18)",color:"#a5b4fc",fontSize:12,fontWeight:800,opacity:urlLoading||!urlInput.trim()?0.5:1,flexShrink:0,whiteSpace:"nowrap"}}>
                        {urlLoading?"불러오는 중...":"불러오기"}
                      </button>
                    </div>
                    {urlResult && (
                      <div style={{marginTop:10,padding:"8px 12px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.2)",display:"flex",gap:10,alignItems:"center"}}>
                        {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{width:40,height:28,objectFit:"cover",borderRadius:12,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{urlResult.title}</div>
                          <div style={{fontSize:11,color:muted,marginTop:1}}>{urlResult.type==="youtube"?"유튜브":urlResult.type==="news"?"뉴스":"웹페이지"} -- 주제에 자동 입력됐어요</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline: File upload */}
                {sourceType==="file" && (
                  <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("fileImport")}</div>
                    <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.6}}>{t("fileImportDesc")}</div>
                    {fields._files && fields._files.length > 0 && (
                      <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:4}}>
                        {fields._files.map((f,i) => (
                          <span key={i} style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.1)",color:accent,display:"inline-flex",alignItems:"center",gap:4}}>
                            {f.name}
                            <button onClick={()=>{const nf=[...fields._files];nf.splice(i,1);setField("_files",nf);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:12,padding:0,lineHeight:1}}>x</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
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
                        style={{padding:"8px 16px",borderRadius:12,border:"none",cursor:"pointer",background:"rgba(99,102,241,0.18)",color:"#a5b4fc",fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>
                        {t("fileSelect")}
                      </button>
                      <span style={{fontSize:11,color:muted}}>여러 파일 선택 가능 -- 10MB 이하</span>
                    </div>
                  </div>
                )}

                {/* Inline: Topic/keyword input */}
                {sourceType==="topic" && (
                  <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>주제 / 키워드 입력</div>
                    <input type="text" value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}
                      placeholder="글의 주제나 키워드를 입력하세요"
                      style={{...IS,borderColor:(error&&!fields.keyword?.trim())?"#ef4444":inputBdr}}/>
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
                )}

                {/* Next button */}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <button onClick={()=>setFormStep(2)} disabled={!sourceType}
                    style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:!sourceType?"not-allowed":"pointer",
                      background:sourceType?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                      color:sourceType?"#fff":muted,fontSize:14,fontWeight:700,opacity:sourceType?1:0.5,transition:"opacity 0.15s",minHeight:44}}>
                    다음
                  </button>
                </div>
              </div>
            )}

            {/* ══════ Step 2: Platform Selection ══════ */}
            {formStep===2 && (
              <div>
                <div style={{fontSize:16,fontWeight:800,color:text,marginBottom:4,textAlign:"center"}}>게시할 플랫폼을 선택하세요</div>
                <div style={{fontSize:12,color:muted,marginBottom:18,lineHeight:1.6,textAlign:"center"}}>글을 게시할 SNS 플랫폼을 선택해주세요</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
                  {SNS_OPTIONS.map(p => {
                    const isA=platformId===p.id;
                    return (
                      <button key={p.id} onClick={()=>setPlatformId(p.id)}
                        style={{
                          padding:"16px 14px",borderRadius:14,cursor:"pointer",textAlign:"center",
                          border:isA?`2px solid ${accent}`:`2px solid ${border}`,
                          background:isA?accentBg:inputBg,
                          transition:"all 0.15s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                        }}>
                        <div style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:p.color||muted}}>
                          {p.svg ? p.svg : <img src={p.icon} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} onError={e=>{e.target.style.display="none"}}/>}
                        </div>
                        <div style={{fontSize:12,fontWeight:isA?700:500,color:isA?accent:text}}>{p.label}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                  <button onClick={()=>setFormStep(1)}
                    style={{padding:"12px 24px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",
                      color:muted,fontSize:14,fontWeight:700,cursor:"pointer",minHeight:44}}>
                    이전
                  </button>
                  <button onClick={()=>setFormStep(3)}
                    style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:"pointer",
                      background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,minHeight:44}}>
                    다음
                  </button>
                </div>
              </div>
            )}

            {/* ══════ Step 3: Content Type + Prompt ══════ */}
            {formStep===3 && (
              <div>
                <div style={{fontSize:16,fontWeight:800,color:text,marginBottom:4,textAlign:"center"}}>글타입과 내용을 설정하세요</div>
                <div style={{fontSize:12,color:muted,marginBottom:18,lineHeight:1.6,textAlign:"center"}}>원하는 글의 유형을 선택하고 주제를 입력해주세요</div>

                {/* Article type */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:10}}>{t("selectType")}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                    {cfg.subtypes.map(s=>{
                      const isA=subtype===s.id;
                      return <button key={s.id} onClick={()=>handleSubtype(s.id)} style={{padding:"12px",borderRadius:12,textAlign:"left",cursor:"pointer",border:isA?`2px solid ${accent}`:`2px solid ${border}`,background:isA?accentBg:inputBg}}>
                        <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                        <div style={{fontSize:13,fontWeight:700,color:isA?accent:text}}>{s.label}</div>
                        <div style={{fontSize:11,color:muted,marginTop:2}}>{s.desc}</div>
                      </button>;
                    })}
                  </div>
                </div>

                {/* Keyword input */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>
                    {FIELD_LABELS.keyword?.label || "키워드 / 주제"}<span style={{color:"#ef4444"}}> *</span>
                  </div>
                  <input type="text" value={fields.keyword||""} onChange={e=>setField("keyword",e.target.value)}
                    placeholder={FIELD_LABELS.keyword?.placeholder || "글의 주제나 키워드를 입력하세요"}
                    style={{...IS,borderColor:(error&&!fields.keyword?.trim())?"#ef4444":inputBdr}}/>
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
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>프롬프트 (선택)</div>
                  <textarea value={fields.extra||""} onChange={e=>setField("extra",e.target.value)} rows={3}
                    placeholder="AI에게 전달할 추가 지시사항을 입력하세요. 예) 초보자도 이해할 수 있게 / 사례 중심으로 / 전문적인 톤으로"
                    style={{...IS,resize:"none",lineHeight:1.6}}/>
                </div>

                {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{error}
                  {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                    <button onClick={()=>window.location.hash="#pricing"} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>
                  )}
                </div>}

                <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                  <button onClick={()=>setFormStep(2)}
                    style={{padding:"12px 24px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",
                      color:muted,fontSize:14,fontWeight:700,cursor:"pointer",minHeight:44}}>
                    이전
                  </button>
                  <button onClick={()=>{if(!fields.keyword?.trim()){setError("키워드 / 주제를 입력해주세요.");return;}setError("");setFormStep(4);}} disabled={!fields.keyword?.trim()}
                    style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:!fields.keyword?.trim()?"not-allowed":"pointer",
                      background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                      color:fields.keyword?.trim()?"#fff":muted,fontSize:14,fontWeight:700,opacity:fields.keyword?.trim()?1:0.5,minHeight:44}}>
                    다음
                  </button>
                </div>
              </div>
            )}

            {/* ══════ Step 4: Style Settings ══════ */}
            {formStep===4 && (
              <div>
                <div style={{fontSize:16,fontWeight:800,color:text,marginBottom:4,textAlign:"center"}}>스타일을 선택하세요</div>
                <div style={{fontSize:12,color:muted,marginBottom:18,lineHeight:1.6,textAlign:"center"}}>글의 톤, 말투, 분량을 설정합니다</div>

                {/* Tone */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>{t("selectTone")}</div>
                  <div className="bl-tone-group" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {cfg.tones.map(t=>{const isA=tone===t.id;return<button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:12,fontWeight:isA?700:400,cursor:"pointer"}}>{t.label}</button>;})}
                  </div>
                </div>

                {/* Speech style */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>말투 선택</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {SPEECH_STYLES.map(s=>{const isA=speechStyle===s.id;return<button key={s.id} onClick={()=>setSpeechStyle(s.id)} title={s.desc} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:12,fontWeight:isA?700:400,cursor:"pointer"}}>{s.label}</button>;})}
                  </div>
                </div>

                {/* Word count / Length */}
                <div style={{marginBottom:24}}>
                  <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>
                    {t("selectLength")}
                  </div>
                  {initialType==="blog_insta" && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {cfg.wordCounts.map(w=>{
                        const isA=wordCount===w.id;
                        return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 14px",borderRadius:12,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:64}}>
                          <span style={{fontSize:16,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                          <span style={{fontSize:10,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                        </button>;
                      })}
                    </div>
                  )}
                  {initialType==="blog_youtube" && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {cfg.wordCounts.map(w=>{
                        const isA=wordCount===w.id;
                        return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"7px 16px",borderRadius:20,cursor:"pointer",border:`2px solid ${isA?"#FF0000":border}`,background:isA?"rgba(255,0,0,0.1)":"transparent",whiteSpace:"nowrap"}}>
                          <span style={{fontSize:13,fontWeight:isA?800:500,color:isA?"#FF0000":text}}>{w.label}</span>
                        </button>;
                      })}
                    </div>
                  )}
                  {initialType==="blog_thread" && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {cfg.wordCounts.map(w=>{
                        const isA=wordCount===w.id;
                        return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 13px",borderRadius:12,cursor:"pointer",border:`2px solid ${isA?accentRaw:border}`,background:isA?accentBg:"transparent",minWidth:64}}>
                          <span style={{fontSize:14,fontWeight:800,color:isA?accent:text,lineHeight:1}}>{w.label}</span>
                          <span style={{fontSize:10,color:muted,marginTop:3,whiteSpace:"nowrap"}}>{w.desc}</span>
                        </button>;
                      })}
                    </div>
                  )}
                  {initialType!=="blog_insta" && initialType!=="blog_youtube" && initialType!=="blog_thread" && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {cfg.wordCounts.map(w=>{
                        const isA=wordCount===w.id;
                        return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"7px 12px",borderRadius:12,cursor:"pointer",textAlign:"center",border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent"}}>
                          <div style={{fontSize:13,fontWeight:isA?700:400,color:isA?accent:text}}>{w.label}</div>
                          <div style={{fontSize:10,color:muted,marginTop:2}}>{w.desc}</div>
                        </button>;
                      })}
                    </div>
                  )}
                </div>

                {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{error}
                  {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                    <button onClick={()=>window.location.hash="#pricing"} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>
                  )}
                </div>}

                <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                  <button onClick={()=>setFormStep(3)}
                    style={{padding:"12px 24px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",
                      color:muted,fontSize:14,fontWeight:700,cursor:"pointer",minHeight:44}}>
                    이전
                  </button>
                  <button className="bl-gen-btn" onClick={handleGenerateClick} disabled={loading||!fields.keyword?.trim()}
                    style={{padding:"12px 32px",borderRadius:12,border:"none",cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",
                      background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                      color:fields.keyword?.trim()?"#fff":muted,fontSize:15,fontWeight:800,
                      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      opacity:loading||!fields.keyword?.trim()?0.5:1,transition:"opacity 0.15s",minHeight:48}}>
                    {loading ? (<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>) : user ? (<span>글 생성하기 <span style={{fontSize:12,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 8px",borderRadius:8}}>10P</span></span>) : (<span>1회 생성해보기</span>)}
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
          <div style={{fontSize:13,color:isDark?"rgba(255,255,255,0.5)":"#999",marginBottom:16}}>원하는 SNS 플랫폼을 선택하고, 주제와 스타일을 정해주세요.</div>
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
              padding:"5px 12px",borderRadius:16,border:"none",
              background:active?(isDark?"rgba(124,106,255,0.15)":"#7c6aff"):"transparent",
              color:active?"#fff":(isDark?"rgba(255,255,255,0.45)":"#888"),
              fontSize:11,fontWeight:active?700:500,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",
            });
            return (
              <>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                  {SNS_CATS.map(c => (
                    <button key={c.id} onClick={() => setSnsCat(c.id)} style={tabStyle(snsCat===c.id)}>{c.label}</button>
                  ))}
                </div>
                <div className="bl-sns-platform-group" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {filtered.map(p => (
                    <button key={p.id} onClick={() => setPlatformId(p.id)}
                      style={{padding:"7px 12px",borderRadius:10,border:`1.5px solid ${platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.1)":"#e5e7eb")}`,background:platformId===p.id?(isDark?"rgba(124,106,255,0.12)":"#f8f7ff"):"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:platformId===p.id?700:500,color:platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.5)":"#888"),transition:"all 0.15s"}}>
                      <img src={p.icon} alt="" style={{width:14,height:14,borderRadius:3,objectFit:"contain"}} />
                      {p.label}
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
