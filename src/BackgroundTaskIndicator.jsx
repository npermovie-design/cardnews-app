import { useState, useEffect } from "react";

/* ══════════════════════════════════════════════════════
   BackgroundTaskIndicator
   - 모든 AI 기능의 백그라운드 작업 상태를 오른쪽 하단에 표시
   - 회원/비회원 모두 지원
   - 클릭하면 해당 기능 메뉴로 이동
   ══════════════════════════════════════════════════════ */

// 기능별 설정
const TASK_CONFIG = {
  blog_write:    { label: "글 작성", color: "#3b82f6", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  blog_naver:    { label: "네이버 블로그", color: "#03C75A", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  blog_tistory:  { label: "티스토리", color: "#FF6B35", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  blog_insta:    { label: "인스타그램", color: "#E1306C", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="2"/></svg> },
  ppt_gen:       { label: "PPT 제작", color: "#3b82f6", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke={c} strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  product_shot:  { label: "이미지 생성", color: "#f59e0b", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2"/><circle cx="8.5" cy="8.5" r="1.5" fill={c}/></svg> },
  logo_gen:      { label: "로고 생성", color: "#ec4899", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke={c} strokeWidth="2"/></svg> },
  mockup_gen:    { label: "목업 생성", color: "#06b6d4", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke={c} strokeWidth="2"/></svg> },
  video_create:  { label: "영상 제작", color: "#ef4444", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke={c} strokeWidth="2"/><polygon points="10,8 17,12 10,16" fill={c}/></svg> },
  shorts_make:   { label: "쇼츠 제작", color: "#ef4444", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke={c} strokeWidth="2"/><polygon points="10,8 17,12 10,16" fill={c}/></svg> },
  card_news:     { label: "카드뉴스", color: "#8b5cf6", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={c} strokeWidth="2"/><path d="M3 9h18M9 21V9" stroke={c} strokeWidth="2"/></svg> },
  default:       { label: "AI 작업", color: "#3b82f6", icon: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={c} strokeWidth="2"/></svg> },
};

export default function BackgroundTaskIndicator({ isDark, currentMenu, onNavigate }) {
  const [tasks, setTasks] = useState([]); // [{ id, type, status, message, progress }]
  const [minimized, setMinimized] = useState(false);

  // 전역 이벤트로 백그라운드 작업 등록/업데이트/완료
  useEffect(() => {
    const handleTaskEvent = (e) => {
      const { action, task } = e.detail || {};
      if (action === "register") {
        setTasks(prev => {
          const exists = prev.find(t => t.id === task.id);
          if (exists) return prev.map(t => t.id === task.id ? { ...t, ...task } : t);
          return [...prev, { ...task, status: "processing" }];
        });
      }
      if (action === "update") {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
      }
      if (action === "complete") {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "complete", ...task } : t));
        // 5초 후 자동 제거
        setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== task.id));
        }, 8000);
      }
      if (action === "remove") {
        setTasks(prev => prev.filter(t => t.id !== task.id));
      }
    };
    window.addEventListener("bgTaskUpdate", handleTaskEvent);
    return () => window.removeEventListener("bgTaskUpdate", handleTaskEvent);
  }, []);

  // 기존 __isGenerating 플래그와 연동
  useEffect(() => {
    const handler = (e) => {
      const { generating } = e.detail || {};
      if (generating && currentMenu) {
        // 현재 메뉴의 작업을 등록
        window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
          detail: {
            action: "register",
            task: { id: `gen_${currentMenu}`, type: currentMenu, message: "생성 중..." }
          }
        }));
      }
    };
    window.addEventListener("aiGeneratingChange", handler);
    return () => window.removeEventListener("aiGeneratingChange", handler);
  }, [currentMenu]);

  // 표시할 작업이 없으면 렌더링 안 함
  const visibleTasks = tasks.filter(t => {
    // 현재 보고있는 메뉴의 작업은 숨기기 (해당 화면에서 직접 표시하므로)
    if (t.type === currentMenu) return false;
    return true;
  });

  if (visibleTasks.length === 0) return null;

  const text = isDark ? "#fff" : "#1a1a2e";

  return (
    <>
      <style>{`
        @keyframes bti-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bti-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bti-pulse{0%,100%{box-shadow:0 4px 20px rgba(0,0,0,0.3)}50%{box-shadow:0 4px 30px rgba(0,0,0,0.06)}}
      `}</style>
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        animation: "bti-fadein 0.3s ease",
        maxWidth: 320,
      }}>
        {visibleTasks.map(task => {
          const cfg = TASK_CONFIG[task.type] || TASK_CONFIG.default;
          const isComplete = task.status === "complete";

          return (
            <div key={task.id}
              onClick={() => {
                if (onNavigate && task.type) onNavigate(task.type);
                if (isComplete) setTasks(prev => prev.filter(t => t.id !== task.id));
              }}
              style={{
                background: isComplete
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : isDark ? "rgba(20,16,50,0.95)" : "rgba(255,255,255,0.97)",
                border: isComplete ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 16, padding: "12px 16px", cursor: "pointer",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: 12,
                minWidth: 220,
                animation: isComplete ? "none" : "bti-pulse 3s ease-in-out infinite",
              }}>
              {/* 아이콘 + 스피너 */}
              <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                {!isComplete && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                    borderTopColor: cfg.color, borderRightColor: cfg.color,
                    animation: "bti-spin 1.2s linear infinite",
                  }} />
                )}
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isComplete
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : cfg.icon(cfg.color)
                  }
                </div>
              </div>
              {/* 텍스트 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: isComplete ? "#fff" : text }}>
                  {isComplete ? `${cfg.label} 완료!` : `${cfg.label} 진행 중...`}
                </div>
                <div style={{ fontSize: 11, color: isComplete ? "rgba(255,255,255,0.7)" : isDark ? "rgba(255,255,255,0.5)" : "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isComplete ? "클릭하여 결과 확인" : (task.message || "클릭하여 확인")}
                </div>
              </div>
              {/* 닫기 */}
              {isComplete && (
                <div onClick={(e) => { e.stopPropagation(); setTasks(prev => prev.filter(t => t.id !== task.id)); }}
                  style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
                  ✕
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// 유틸리티: 어디서든 호출 가능한 백그라운드 작업 등록/업데이트 함수
export function registerBgTask(id, type, message) {
  window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
    detail: { action: "register", task: { id, type, message } }
  }));
}
export function updateBgTask(id, updates) {
  window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
    detail: { action: "update", task: { id, ...updates } }
  }));
}
export function completeBgTask(id, updates = {}) {
  window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
    detail: { action: "complete", task: { id, ...updates } }
  }));
}
export function removeBgTask(id) {
  window.dispatchEvent(new CustomEvent("bgTaskUpdate", {
    detail: { action: "remove", task: { id } }
  }));
}
