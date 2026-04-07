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
    { id: "blog_naver", label: "네이버 블로그", icon: "/icon-naver-blog.png" },
    { id: "blog_cafe", label: "네이버 카페", icon: "/icon-naver-cafe.webp" },
    { id: "blog_tistory", label: "티스토리", icon: "/icon-tistory.png" },
    { id: "blog_insta", label: "인스타그램", icon: "/icon-instagram.webp" },
    { id: "blog_thread", label: "스레드", icon: "/icon-threads.png" },
    { id: "blog_youtube", label: "유튜브", icon: "/icon-youtube.png" },
    { id: "blog_link", label: "유튜브 → 블로그 변환", icon: "/icon-youtube.png" },
    { id: "blog_news", label: "뉴스 → 블로그 변환", icon: "/icons3d/news.png" },
  ];
  const [platformId, setPlatformId] = useState(initialType || "blog_naver");
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
  // unmount 시: 로딩 중이면 sessionStorage 유지, 아니면 정리
  const loadingForCleanup = useRef(false);
  useEffect(() => {
    return () => {
      try {
        if (!loadingForCleanup.current) {
          sessionStorage.removeItem(_ssKey);
        }
      } catch(e) {}
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

    // 단일 키워드 이미지 검색 (Unsplash → Pexels → Pixabay → Picsum)
    const searchOne = async (kw, idx) => {
      const q = encodeURIComponent(kw.trim());
      // 1) Unsplash
      try {
        const r = await fetch(`/api/proxy-unsplash?query=${q}&per_page=5&orientation=landscape`);
        if (r.ok) { const d = await r.json(); if (d.results?.length) return d.results[idx % d.results.length].urls.regular; }
      } catch {}
      // 2) Pexels
      try {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${q}&per_page=5&orientation=landscape`);
        if (r.ok) { const d = await r.json(); if (d.photos?.length) return d.photos[idx % d.photos.length].src.large; }
      } catch {}
      // 3) Pixabay
      try {
        const r = await fetch(`/api/proxy-pixabay?q=${q}&per_page=5&safesearch=true&image_type=photo`);
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
                reader.onload = ev => {
                  const img = document.createElement("img");
                  img.src = ev.target.result;
                  img.style.maxWidth = "100%";
                  img.style.borderRadius = "12px";
                  img.style.margin = "12px 0";
                  img.style.display = "block";
                  // 드롭 위치에 이미지 삽입
                  const sel = window.getSelection();
                  if (sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    range.insertNode(img);
                    range.collapse(false);
                  } else {
                    e.currentTarget.appendChild(img);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            onPaste={e => {
              // 모바일/PC 이미지 붙여넣기 지원
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const img = document.createElement("img");
                      img.src = ev.target.result;
                      img.style.maxWidth = "100%";
                      img.style.borderRadius = "12px";
                      img.style.margin = "12px 0";
                      img.style.display = "block";
                      const sel = window.getSelection();
                      if (sel.rangeCount) {
                        const range = sel.getRangeAt(0);
                        range.insertNode(img);
                        range.collapse(false);
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
  const wizStep = (loading || (genStep > 0 && genStep < 5)) ? 2 : result ? 3 : 1;
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
            {/* StepBar 제거됨 */}

            {/* URL 불러오기 */}
            <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("urlImportLabel")}</div>
              <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.6}}>뉴스 기사, 유튜브 링크를 붙여넣으면 주제를 자동으로 채워줘요</div>
              <div style={{display:"flex",gap:8}}>
                <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")fetchFromUrl();}}
                  placeholder="https://... URL 붙여넣기"
                  style={{flex:1,padding:"11px 14px",borderRadius:12,border:`1.5px solid ${inputBdr}`,background:inputBg,color:text,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
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
                    <div style={{fontSize:11,color:muted,marginTop:1}}>{urlResult.type==="youtube"?"유튜브":urlResult.type==="news"?"뉴스":"웹페이지"} · 주제에 자동 입력됐어요</div>
                  </div>
                </div>
              )}
            </div>

            {/* 파일 업로드 분석 */}
            <div style={{marginBottom:18,padding:"14px 16px",borderRadius:12,background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{t("fileImport")}</div>
              <div style={{fontSize:11,color:muted,marginBottom:8,lineHeight:1.6}}>{t("fileImportDesc")}</div>
              {/* 첨부된 파일 목록 */}
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
                <span style={{fontSize:11,color:muted}}>여러 파일 선택 가능 · 10MB 이하</span>
              </div>
            </div>

            {/* 글 타입 */}
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

            {/* 예시 */}
            {examples.length>0&&<div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>{t("exampleTopics")}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {examples.map(ex=><button key={ex} onClick={()=>setField("keyword",ex)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${border}`,background:fields.keyword===ex?accentBg:"transparent",color:fields.keyword===ex?accent:muted,fontSize:12,cursor:"pointer"}}>{ex}</button>)}
              </div>
            </div>}

            {/* 동적 필드 */}
            {currentFields.map(fk=>{
              const fl=FIELD_LABELS[fk]; if(!fl) return null;
              return <div key={fk} style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>{fl.label}{fl.required&&<span style={{color:"#ef4444"}}> *</span>}</div>
                {fl.textarea
                  ?<textarea value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} rows={3} placeholder={fl.placeholder} style={{...IS,resize:"none",lineHeight:1.6}}/>
                  :<input type="text" value={fields[fk]||""} onChange={e=>setField(fk,e.target.value)} onKeyDown={e=>e.key==="Enter"&&fk==="keyword"&&generate()} placeholder={fl.placeholder} style={{...IS,borderColor:(error&&fk==="keyword")?"#ef4444":inputBdr}}/>
                }
                {fk==="keyword" && !fields.keyword?.trim() && (
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:muted,marginBottom:8}}>이런 주제는 어때요?</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {["AI 콘텐츠 자동화의 미래","SaaS 성장 전략 가이드","스타트업 마케팅 실전 노하우","개인 브랜딩으로 커리어 성장하기","원격 근무 생산성 높이는 법","2026 SEO 완벽 가이드"].map(chip => (
                        <button key={chip} onClick={() => setField("keyword", chip)}
                          style={{
                            padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:500,cursor:"pointer",
                            border:`1px solid ${isDark ? "rgba(124,106,255,0.3)" : "rgba(124,106,255,0.25)"}`,
                            background: isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)",
                            color: isDark ? "#c4b5fd" : "#7c6aff",
                            transition:"all 0.15s ease",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(124,106,255,0.18)" : "rgba(124,106,255,0.12)"; e.currentTarget.style.borderColor = "#7c6aff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)"; e.currentTarget.style.borderColor = isDark ? "rgba(124,106,255,0.3)" : "rgba(124,106,255,0.25)"; }}
                        >{chip}</button>
                      ))}
                    </div>
                  </div>
                )}
                {fk==="keyword" && fields.keyword && fields.keyword.trim() && (
                  <div style={{marginTop:8,display:"flex",gap:6}}>
                    <button onClick={suggestTitle} disabled={titleLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {titleLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>추천 중...</>:"⭐ AI 제목 추천"}
                    </button>
                    <button onClick={suggestSeo} disabled={seoLoading} style={{flex:1,padding:"7px 10px",borderRadius:12,border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.08)",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      {seoLoading?<><div style={{width:10,height:10,borderRadius:"50%",border:"2px solid #10b981",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>조회 중...</>:"SEO 키워드"}
                    </button>
                  </div>
                )}
                {fk==="keyword" && titleSugg.length>0 && (
                  <div style={{marginTop:10,background:isDark?"rgba(99,102,241,0.08)":"#f0f0ff",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(99,102,241,0.15)"}}>
                    <div style={{fontSize:12,color:accent,fontWeight:700,marginBottom:8}}>⭐ 추천 제목 (클릭 시 적용)</div>
                    {titleSugg.map(function(t,i){return(
                      <div key={i} onClick={function(){setField("keyword",t);setTitleSugg([]);}} style={{fontSize:13,color:text,padding:"5px 0",cursor:"pointer",borderBottom:i<titleSugg.length-1?"1px solid "+border:"none",lineHeight:1.6}}>{t}</div>
                    );})}
                  </div>
                )}
                {fk==="keyword" && seoKeys.length>0 && (
                  <div style={{marginTop:10,background:isDark?"rgba(16,185,129,0.06)":"#f0fdf9",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(16,185,129,0.15)"}}>
                    <div style={{fontSize:12,color:"#10b981",fontWeight:700,marginBottom:8}}>SEO 연관 키워드</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {seoKeys.map(function(k,i){return(
                        <span key={i} onClick={function(){setField("extra",(fields.extra?fields.extra+", ":"")+k);}} style={{fontSize:12,padding:"4px 11px",borderRadius:12,background:"rgba(16,185,129,0.12)",color:"#10b981",cursor:"pointer",border:"1px solid rgba(16,185,129,0.2)"}}>{k}</span>
                      );})}
                    </div>
                  </div>
                )}
                {fk==="keyword"&&<KeywordInsightPanel keyword={fields.keyword} isDark={isDark} onKeywordSelect={(kw)=>setField("keyword",kw)}/>}
              </div>;
            })}
            {error&&<div style={{fontSize:12,color:"#ef4444",marginBottom:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>{error}
              {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                <button onClick={()=>window.location.hash="#pricing"} style={{padding:"4px 12px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>
              )}
            </div>}

            {/* 글 톤 */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>{t("selectTone")}</div>
              <div className="bl-tone-group" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {cfg.tones.map(t=>{const isA=tone===t.id;return<button key={t.id} onClick={()=>setTone(t.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:12,fontWeight:isA?700:400,cursor:"pointer"}}>{t.label}</button>;})}
              </div>
            </div>

            {/* 말투 선택 */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.6,marginBottom:8}}>말투 선택</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {SPEECH_STYLES.map(s=>{const isA=speechStyle===s.id;return<button key={s.id} onClick={()=>setSpeechStyle(s.id)} title={s.desc} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:muted,fontSize:12,fontWeight:isA?700:400,cursor:"pointer"}}>{s.label}</button>;})}
              </div>
            </div>

            {/* 분량 */}
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
                      <span style={{fontSize:13,fontWeight:isA?800:500,color:isA?"#FF0000":text}}>⏱ {w.label}</span>
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

            {/* ── 세부 설정 (Expandable) ── */}
            <div style={{marginBottom:20}}>
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  display:"flex",alignItems:"center",gap:8,width:"100%",padding:"12px 16px",borderRadius:12,cursor:"pointer",
                  border:`1px solid ${showAdvanced ? (isDark ? "rgba(124,106,255,0.3)" : "rgba(124,106,255,0.25)") : border}`,
                  background: showAdvanced ? (isDark ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.04)") : "transparent",
                  color: showAdvanced ? (isDark ? "#c4b5fd" : "#7c6aff") : muted,
                  fontSize:13,fontWeight:700,textAlign:"left",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                세부 설정
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{marginLeft:"auto",transform:showAdvanced?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s ease"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showAdvanced && (
                <div style={{
                  marginTop:8,padding:"18px 16px",borderRadius:12,
                  border:`1px solid ${isDark ? "rgba(124,106,255,0.2)" : "rgba(124,106,255,0.15)"}`,
                  background: isDark ? "rgba(124,106,255,0.04)" : "rgba(124,106,255,0.02)",
                  display:"flex",flexDirection:"column",gap:16,
                }}>
                  {/* 글 분위기 */}
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>글 분위기</div>
                    <select value={advTone} onChange={e => setAdvTone(e.target.value)}
                      style={{...IS,cursor:"pointer",appearance:"auto"}}>
                      <option value="">선택 안함</option>
                      <option value="전문적">전문적</option>
                      <option value="친근한">친근한</option>
                      <option value="캐주얼">캐주얼</option>
                      <option value="격식있는">격식있는</option>
                      <option value="유머러스">유머러스</option>
                    </select>
                  </div>
                  {/* 대상 독자 */}
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>대상 독자</div>
                    <input type="text" value={advAudience} onChange={e => setAdvAudience(e.target.value)}
                      placeholder="어떤 독자를 위한 글인지 입력하세요 (선택)"
                      style={IS}/>
                  </div>
                  {/* 추가 지시사항 */}
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:muted,letterSpacing:0.5,marginBottom:6}}>추가 지시사항</div>
                    <textarea value={advExtra} onChange={e => setAdvExtra(e.target.value)} rows={3}
                      placeholder="꼭 다뤄야 할 내용, 피해야 할 내용 등 (선택)"
                      style={{...IS,resize:"none",lineHeight:1.6}}/>
                  </div>
                </div>
              )}
            </div>

            {/* 생성 버튼 */}
            <button className="bl-gen-btn" onClick={handleGenerateClick} disabled={loading||!fields.keyword?.trim()} style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),color:fields.keyword?.trim()?"#fff":muted,fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading||!fields.keyword?.trim()?0.5:1,transition:"opacity 0.15s",minHeight:48}}>
              {loading ? (<><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중...</>) : user ? (<span>✨ 글 생성하기 <span style={{fontSize:12,opacity:0.8,fontWeight:600,marginLeft:4,background:"rgba(255,255,255,0.15)",padding:"1px 8px",borderRadius:8}}>10P</span></span>) : (<span>✦ 1회 생성해보기</span>)}
            </button>
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
          {/* SNS 플랫폼 선택 */}
          <div className="bl-sns-platform-group" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {id:"blog_naver",label:"네이버 블로그",icon:"/icon-naver-blog.png"},
              {id:"blog_cafe",label:"네이버 카페",icon:"/icon-naver-cafe.webp"},
              {id:"blog_tistory",label:"티스토리",icon:"/icon-tistory.png"},
              {id:"blog_insta",label:"인스타그램",icon:"/icon-instagram.webp"},
              {id:"blog_thread",label:"스레드",icon:"/icon-threads.png"},
              {id:"blog_youtube",label:"유튜브",icon:"/icon-youtube.png"},
              {id:"blog_link",label:"유튜브→블로그",icon:"/icon-youtube.png"},
              {id:"blog_news",label:"뉴스→블로그",icon:"/icons3d/news.png"},
            ].map(p => (
              <button key={p.id} onClick={() => setPlatformId(p.id)}
                style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.1)":"#e5e7eb")}`,background:platformId===p.id?(isDark?"rgba(124,106,255,0.12)":"#f8f7ff"):"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:platformId===p.id?700:500,color:platformId===p.id?"#7c6aff":(isDark?"rgba(255,255,255,0.5)":"#888"),transition:"all 0.15s"}}>
                <img src={p.icon} alt="" style={{width:16,height:16,borderRadius:3,objectFit:"contain"}} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* 기존 select 제거 — 위 버튼으로 대체 */}
      <div style={{display:"none"}}>
        <select value={platformId} onChange={e => setPlatformId(e.target.value)}>
          <optgroup label="직접 작성">
            <option value="blog_naver">네이버 블로그</option>
            <option value="blog_cafe">네이버 카페</option>
            <option value="blog_tistory">티스토리</option>
            <option value="blog_insta">인스타그램</option>
            <option value="blog_thread">스레드</option>
            <option value="blog_youtube">유튜브</option>
          </optgroup>
          <optgroup label="해외 SNS">
            <option value="blog_insta">Instagram</option>
            <option value="blog_thread">Threads</option>
          </optgroup>
          <optgroup label="링크 변환">
            <option value="blog_link">유튜브 → 블로그</option>
            <option value="blog_news">뉴스 → 블로그</option>
          </optgroup>
        </select>
      </div>
      <div style={{height:"calc(100vh - 80px)",display:"flex"}}>{content}</div>
    </div>
  );
}
