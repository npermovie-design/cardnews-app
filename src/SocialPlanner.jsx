import { useState, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════
   Social Planner – SNS 업로드 일정 관리 캘린더
   - localStorage 기반 플랜 CRUD
   - 월간 캘린더 뷰 (스티커 장식)
   - Google Calendar / 네이버 캘린더 / .ics 내보내기
   - 브라우저 Notification + TTS 알림
════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "sns_planner_v1";
const STICKER_KEY = "sns_planner_stickers_v1";

const PLATFORMS = [
  { id: "instagram",    label: "인스타그램",    color: "#E1306C", icon: "/icon-instagram.webp" },
  { id: "youtube",      label: "유튜브",        color: "#FF0000", icon: "/icon-youtube.png" },
  { id: "naverblog",    label: "네이버블로그",  color: "#03C75A", icon: "/icon-naver-blog.png" },
  { id: "navercafe",    label: "네이버카페",    color: "#03C75A", icon: "/icon-naver-cafe.webp" },
  { id: "tiktok",       label: "틱톡",          color: "#010101", icon: null },
  { id: "threads",      label: "스레드",        color: "#000000", icon: "/icon-threads.png" },
  { id: "tistory",      label: "티스토리",      color: "#F97316", icon: "/icon-tistory.png" },
  { id: "twitter",      label: "X (트위터)",    color: "#1DA1F2", icon: null },
  { id: "facebook",     label: "페이스북",      color: "#1877F2", icon: null },
  { id: "linkedin",     label: "링크드인",      color: "#0A66C2", icon: null },
  { id: "pinterest",    label: "핀터레스트",    color: "#E60023", icon: null },
  { id: "kakao",        label: "카카오채널",    color: "#FEE500", icon: null },
  { id: "band",         label: "네이버밴드",    color: "#06CF58", icon: null },
  { id: "brunch",       label: "브런치",        color: "#333333", icon: null },
  { id: "other",        label: "기타",          color: "#888888", icon: null },
];

const STICKERS = [
  "🎯","🔥","💡","⭐","❤️","🎉","🚀","📌","✅","💎",
  "📸","🎬","✍️","🎨","🏆","💪","🌟","📢","🎁","💰",
  "🌈","🌸","🍀","🐱","🐶","🦋","🌺","☀️","🌙","⚡",
  "💜","💙","💚","🧡","💛","🩷","🤍","🖤","❄️","🎵",
];

const REPEAT_OPTIONS = [
  { id: "none",    label: "없음" },
  { id: "daily",   label: "매일" },
  { id: "weekly",  label: "매주" },
  { id: "monthly", label: "매월" },
];

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/* ── helpers ── */
function loadPlans() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function savePlans(plans) { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); }
function loadStickers() { try { return JSON.parse(localStorage.getItem(STICKER_KEY)) || {}; } catch { return {}; } }
function saveStickers(s) { localStorage.setItem(STICKER_KEY, JSON.stringify(s)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function toISOLocal(dateStr, timeStr) { return `${dateStr}T${timeStr || "09:00"}:00`; }
function formatGCalDate(dateStr, timeStr) {
  const d = new Date(toISOLocal(dateStr, timeStr));
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function generateICS(plan) {
  const start = formatGCalDate(plan.date, plan.time);
  const endD = new Date(new Date(toISOLocal(plan.date, plan.time)).getTime() + 3600000);
  const endStr = `${endD.getFullYear()}${pad(endD.getMonth()+1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
  const pLabel = PLATFORMS.find(p => p.id === plan.platform)?.label || plan.platform;
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SNSMakeIt//SocialPlanner//KO",
    "BEGIN:VEVENT",`DTSTART:${start}`,`DTEND:${endStr}`,
    `SUMMARY:[${pLabel}] ${plan.title}`,`DESCRIPTION:${plan.memo || ""}\\n플랫폼: ${pLabel}`,
    `UID:${plan.id}@snsmakeitplanner`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function downloadICS(plan) {
  const blob = new Blob([generateICS(plan)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `sns-plan-${plan.date}.ics`; a.click(); URL.revokeObjectURL(a.href);
}
function openGoogleCal(plan) {
  const pLabel = PLATFORMS.find(p => p.id === plan.platform)?.label || plan.platform;
  const start = formatGCalDate(plan.date, plan.time);
  const endD = new Date(new Date(toISOLocal(plan.date, plan.time)).getTime() + 3600000);
  const end = `${endD.getFullYear()}${pad(endD.getMonth()+1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[${pLabel}] ${plan.title}`)}&dates=${start}/${end}&details=${encodeURIComponent(plan.memo||"")}`, "_blank");
}
function openNaverCal(plan) {
  const pLabel = PLATFORMS.find(p => p.id === plan.platform)?.label || plan.platform;
  const d = new Date(toISOLocal(plan.date, plan.time));
  const endD = new Date(d.getTime() + 3600000);
  // 네이버 캘린더 일정 추가 URL
  const title = encodeURIComponent(`[${pLabel}] ${plan.title}`);
  const sY = d.getFullYear(), sM = pad(d.getMonth()+1), sD = pad(d.getDate()), sH = pad(d.getHours()), sMi = pad(d.getMinutes());
  const eY = endD.getFullYear(), eM = pad(endD.getMonth()+1), eD = pad(endD.getDate()), eH = pad(endD.getHours()), eMi = pad(endD.getMinutes());
  window.open(`https://calendar.naver.com/calendar/scheduleEntry?title=${title}&startDate=${sY}${sM}${sD}&startTime=${sH}${sMi}&endDate=${eY}${eM}${eD}&endTime=${eH}${eMi}`, "_blank");
}

/* ── Notification & TTS ── */
function requestNotifPermission() { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }
function sendNotification(title, body) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/favicon.ico" }); }
function speakTTS(text) { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(text); u.lang = "ko-KR"; u.rate = 1; u.pitch = 1; speechSynthesis.speak(u); } }
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100, 1320].forEach((freq, i) => {
      setTimeout(() => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = freq; g.gain.value = 0.25; o.start(); o.stop(ctx.currentTime + 0.2); }, i * 250);
    });
  } catch {}
}

/* ════════════════════════════════════════════════════════════ */
export default function SocialPlanner({ isDark, user, theme }) {
  const [plans, setPlans] = useState(loadPlans);
  const [stickers, setStickers] = useState(loadStickers); // { "2026-04-01": ["🎯","🔥"], ... }
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(null); // dateKey or null
  const [editingId, setEditingId] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null); // id of plan being rescheduled
  const [rescheduleDate, setRescheduleDate] = useState("");
  const notifiedRef = useRef(new Set());

  // form state
  const [fDate, setFDate] = useState(dateKey(new Date()));
  const [fTime, setFTime] = useState("09:00");
  const [fPlatform, setFPlatform] = useState("instagram");
  const [fTitle, setFTitle] = useState("");
  const [fMemo, setFMemo] = useState("");
  const [fRepeat, setFRepeat] = useState("none");

  const accent = "#7c6aff";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.10)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "#f3f4f6";

  useEffect(() => { savePlans(plans); }, [plans]);
  useEffect(() => { saveStickers(stickers); }, [stickers]);
  useEffect(() => { requestNotifPermission(); }, []);

  // alarm checker
  useEffect(() => {
    function checkAlarms() {
      const now = new Date();
      const nowMin = Math.floor(now.getTime() / 60000);
      plans.forEach(p => {
        const pTime = new Date(toISOLocal(p.date, p.time));
        const pMin = Math.floor(pTime.getTime() / 60000);
        const diff = pMin - nowMin;
        const pLabel = PLATFORMS.find(x => x.id === p.platform)?.label || p.platform;
        if (diff === 5 && !notifiedRef.current.has(p.id+"_pre")) {
          notifiedRef.current.add(p.id+"_pre");
          sendNotification("⏰ 5분 후 업로드 예정", `[${pLabel}] ${p.title}`);
          playAlarmSound();
        }
        if (diff === 0 && !notifiedRef.current.has(p.id+"_now")) {
          notifiedRef.current.add(p.id+"_now");
          sendNotification("🚀 지금 업로드할 시간!", `[${pLabel}] ${p.title}`);
          playAlarmSound();
          speakTTS(`${pLabel}에 게시물을 업로드할 시간입니다. ${p.title}`);
        }
      });
    }
    checkAlarms();
    const iv = setInterval(checkAlarms, 60000);
    return () => clearInterval(iv);
  }, [plans]);

  /* ── calendar math ── */
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    if (i < firstDay) {
      const d = prevMonthDays - firstDay + 1 + i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: d, cur: false, key: `${y}-${pad(m+1)}-${pad(d)}` });
    } else if (i - firstDay < daysInMonth) {
      const d = i - firstDay + 1;
      cells.push({ day: d, cur: true, key: `${viewYear}-${pad(viewMonth+1)}-${pad(d)}` });
    } else {
      const d = i - firstDay - daysInMonth + 1;
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, cur: false, key: `${y}-${pad(m+1)}-${pad(d)}` });
    }
  }

  const plansByDate = {};
  plans.forEach(p => { if (!plansByDate[p.date]) plansByDate[p.date] = []; plansByDate[p.date].push(p); });
  const selectedPlans = (plansByDate[selectedDate] || []).sort((a, b) => (a.time||"").localeCompare(b.time||""));
  const todayKey = dateKey(new Date());

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  /* ── CRUD ── */
  const resetForm = () => { setFDate(selectedDate); setFTime("09:00"); setFPlatform("instagram"); setFTitle(""); setFMemo(""); setFRepeat("none"); setEditingId(null); };
  const openNew = () => { resetForm(); setFDate(selectedDate); setShowForm(true); };
  const openEdit = (plan) => { setFDate(plan.date); setFTime(plan.time); setFPlatform(plan.platform); setFTitle(plan.title); setFMemo(plan.memo||""); setFRepeat(plan.repeat||"none"); setEditingId(plan.id); setShowForm(true); };

  const handleSave = () => {
    if (!fTitle.trim()) return;
    if (editingId) {
      setPlans(prev => prev.map(p => p.id === editingId ? { ...p, date: fDate, time: fTime, platform: fPlatform, title: fTitle.trim(), memo: fMemo.trim(), repeat: fRepeat } : p));
    } else {
      const newPlan = { id: uid(), date: fDate, time: fTime, platform: fPlatform, title: fTitle.trim(), memo: fMemo.trim(), repeat: fRepeat, completed: false };
      const batch = [newPlan];
      if (fRepeat !== "none") {
        let base = new Date(toISOLocal(fDate, fTime));
        for (let i = 1; i <= 12; i++) {
          let next;
          if (fRepeat === "daily") next = new Date(base.getTime() + i * 86400000);
          else if (fRepeat === "weekly") next = new Date(base.getTime() + i * 7 * 86400000);
          else { next = new Date(base); next.setMonth(next.getMonth() + i); }
          batch.push({ id: uid(), date: dateKey(next), time: fTime, platform: fPlatform, title: fTitle.trim(), memo: fMemo.trim(), repeat: fRepeat, completed: false, parentId: newPlan.id });
        }
      }
      setPlans(prev => [...prev, ...batch]);
    }
    setShowForm(false); resetForm();
  };
  const handleDelete = (id) => setPlans(prev => prev.filter(p => p.id !== id && p.parentId !== id));

  /* ── completion toggle ── */
  const toggleCompleted = (id) => setPlans(prev => prev.map(p => p.id === id ? { ...p, completed: !p.completed } : p));

  /* ── reschedule ── */
  const handleReschedule = (id, newDate) => {
    if (!newDate) return;
    setPlans(prev => prev.map(p => p.id === id ? { ...p, date: newDate } : p));
    setRescheduleId(null);
    setRescheduleDate("");
  };

  /* ── AI recommended plan ── */
  const AI_TEMPLATES = [
    { dayOfWeek: 1, platform: "instagram", title: "인스타그램 릴스 - 제품/서비스 소개", time: "12:00" },
    { dayOfWeek: 2, platform: "naverblog", title: "네이버블로그 - SEO 키워드 글", time: "10:00" },
    { dayOfWeek: 3, platform: "threads",   title: "스레드 - 짧은 인사이트 공유", time: "18:00" },
    { dayOfWeek: 4, platform: "youtube",   title: "유튜브 쇼츠 - 팁/노하우 영상", time: "14:00" },
    { dayOfWeek: 5, platform: "instagram", title: "인스타그램 피드 - 고객 후기 공유", time: "11:00" },
    { dayOfWeek: 6, platform: "tiktok",    title: "틱톡 - 트렌드 챌린지", time: "15:00" },
    { dayOfWeek: 0, platform: "naverblog", title: "네이버블로그 - 주간 정리", time: "17:00" },
  ];
  const handleAIRecommend = () => {
    if (!window.confirm("7개 플랜이 추가됩니다")) return;
    const today = new Date();
    // Find next Monday
    const dayNow = today.getDay(); // 0=Sun
    const daysUntilMon = dayNow === 0 ? 1 : dayNow === 1 ? 7 : (8 - dayNow);
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + daysUntilMon);
    nextMon.setHours(0, 0, 0, 0);

    const newPlans = AI_TEMPLATES.map(t => {
      // Calculate date offset from Monday
      const offset = t.dayOfWeek === 0 ? 6 : t.dayOfWeek - 1; // Mon=0 ... Sun=6
      const d = new Date(nextMon);
      d.setDate(nextMon.getDate() + offset);
      return { id: uid(), date: dateKey(d), time: t.time, platform: t.platform, title: t.title, memo: "", repeat: "none", completed: false };
    });
    setPlans(prev => [...prev, ...newPlans]);
  };

  /* ── sticker ── */
  const addSticker = (dateK, emoji) => {
    setStickers(prev => {
      const arr = prev[dateK] || [];
      if (arr.length >= 3) return prev; // 날짜당 최대 3개
      return { ...prev, [dateK]: [...arr, emoji] };
    });
    setShowStickerPicker(null);
  };
  const removeSticker = (dateK, idx) => {
    setStickers(prev => {
      const arr = [...(prev[dateK] || [])];
      arr.splice(idx, 1);
      const next = { ...prev };
      if (arr.length === 0) delete next[dateK]; else next[dateK] = arr;
      return next;
    });
  };

  /* ── styles ── */
  const btnStyle = (bg = accent, fg = "#fff") => ({ padding: "8px 16px", borderRadius: 10, border: "none", background: bg, color: fg, fontSize: 13, fontWeight: 700, cursor: "pointer" });
  const smallBtn = (bg) => ({ padding: "5px 10px", borderRadius: 8, border: "none", background: bg || inputBg, color: bg ? "#fff" : text, fontSize: 11, fontWeight: 600, cursor: "pointer" });
  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflowY: "auto", color: text, fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
      <style>{`
        @media(max-width:768px){
          .sp-wrap{padding:16px 12px 60px!important}
          .sp-calendar-cell{padding:4px 2px!important;min-height:60px!important}
          .sp-calendar-cell span{width:24px!important;height:24px!important;font-size:12px!important}
          .sp-modal-inner{max-width:100%!important;width:100%!important;max-height:100%!important;height:100%!important;border-radius:0!important;padding:20px 16px!important}
          .sp-modal-overlay{padding:0!important}
          .sp-platform-grid{grid-template-columns:repeat(2,1fr)!important}
          .sp-platform-grid button{min-height:44px!important;padding:8px!important}
          .sp-modal-inner input,.sp-modal-inner textarea,.sp-modal-inner select{font-size:16px!important}
          .sp-plan-btns{gap:4px!important}
          .sp-plan-btns button{min-height:36px!important;padding:5px 8px!important;font-size:10px!important}
          .sp-day-header{font-size:11px!important;padding:8px 0!important}
          .sp-sticker-grid{gap:4px!important}
          .sp-sticker-grid button{font-size:18px!important;min-width:36px!important;min-height:36px!important}
          .sp-header h2{font-size:20px!important}
        }
        @media(max-width:480px){
          .sp-wrap{padding:12px 8px 60px!important}
          .sp-calendar-cell{min-height:50px!important;padding:3px 1px!important}
          .sp-calendar-cell span{width:22px!important;height:22px!important;font-size:11px!important}
          .sp-month-nav{gap:10px!important}
          .sp-month-nav span{font-size:16px!important;min-width:120px!important}
          .sp-modal-inner{padding:16px 12px!important}
          .sp-header h2{font-size:18px!important}
          .sp-header p{font-size:12px!important}
        }
      `}</style>
      <div className="sp-wrap" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* Header */}
        <div className="sp-header" style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            📅 <span style={{ color: accent }}>SNS</span> 소셜 플래너
          </h2>
          <p style={{ fontSize: 13, color: muted, margin: "8px 0 0" }}>업로드 일정을 계획하고 캘린더에 연동하세요 · 스티커로 꾸며보세요!</p>
          <button onClick={handleAIRecommend}
            style={{ marginTop: 14, padding: "10px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c6aff 0%, #a78bfa 100%)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,106,255,0.3)", transition: "transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            🤖 AI 추천 플랜 (1주일)
          </button>
        </div>

        {/* Month Nav */}
        <div className="sp-month-nav" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ ...btnStyle("transparent", text), fontSize: 22, padding: "6px 14px", border: `1px solid ${bdr}`, borderRadius: 12 }}>‹</button>
          <span style={{ fontSize: 20, fontWeight: 900, minWidth: 160, textAlign: "center" }}>{viewYear}년 {viewMonth + 1}월</span>
          <button onClick={nextMonth} style={{ ...btnStyle("transparent", text), fontSize: 22, padding: "6px 14px", border: `1px solid ${bdr}`, borderRadius: 12 }}>›</button>
        </div>

        {/* Calendar */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${bdr}`, overflow: "hidden", marginBottom: 24 }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="sp-day-header" style={{ textAlign: "center", padding: "12px 0", fontSize: 13, fontWeight: 800, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : muted, borderBottom: `1px solid ${bdr}` }}>{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((cell, idx) => {
              const isSel = cell.key === selectedDate;
              const isToday = cell.key === todayKey;
              const dayPlans = plansByDate[cell.key] || [];
              const dayStickers = stickers[cell.key] || [];
              const dayIdx = idx % 7;
              return (
                <div key={idx} className="sp-calendar-cell" onClick={() => setSelectedDate(cell.key)}
                  style={{
                    padding: "6px 4px", minHeight: 80, textAlign: "center", cursor: "pointer",
                    borderBottom: idx < 35 ? `1px solid ${bdr}` : "none",
                    borderRight: dayIdx < 6 ? `1px solid ${bdr}` : "none",
                    background: isSel ? (isDark ? "rgba(124,106,255,0.12)" : "rgba(124,106,255,0.06)") : "transparent",
                    position: "relative",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: "50%", fontSize: 14, fontWeight: isToday || isSel ? 800 : 500,
                      color: !cell.cur ? (isDark ? "rgba(255,255,255,0.2)" : "#ccc")
                        : isToday ? "#fff" : dayIdx === 0 ? "#ef4444" : dayIdx === 6 ? "#3b82f6" : text,
                      background: isToday ? accent : "transparent",
                    }}>{cell.day}</span>
                  </div>
                  {/* stickers */}
                  {dayStickers.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 1, marginTop: 2 }}>
                      {dayStickers.map((s, si) => (
                        <span key={si} style={{ fontSize: 14, cursor: "pointer" }}
                          onClick={e => { e.stopPropagation(); removeSticker(cell.key, si); }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {/* plan dots */}
                  {dayPlans.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                      {dayPlans.slice(0, 5).map((p, pi) => {
                        const pl = PLATFORMS.find(x => x.id === p.platform);
                        return <div key={pi} style={{ width: 7, height: 7, borderRadius: "50%", background: pl?.color || accent }} />;
                      })}
                      {dayPlans.length > 5 && <span style={{ fontSize: 8, color: muted }}>+{dayPlans.length - 5}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>
              {selectedDate.replace(/-/g, ". ")}
              {selectedPlans.length > 0 && (
                <span style={{ color: accent, marginLeft: 6, fontSize: 14 }}>
                  ({selectedPlans.filter(p => p.completed).length}/{selectedPlans.length} 완료)
                </span>
              )}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowStickerPicker(showStickerPicker === selectedDate ? null : selectedDate)}
                style={{ ...btnStyle(isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", text), fontSize: 16, padding: "6px 12px" }}>
                🎨 스티커
              </button>
              <button onClick={openNew} style={btnStyle()}>+ 새 플랜</button>
            </div>
          </div>

          {/* Sticker picker */}
          {showStickerPicker === selectedDate && (
            <div style={{ background: cardBg, border: `1px solid ${bdr}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>스티커 선택 (날짜당 최대 3개)</div>
              <div className="sp-sticker-grid" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STICKERS.map((s, i) => (
                  <button key={i} onClick={() => addSticker(selectedDate, s)}
                    style={{ fontSize: 22, background: "transparent", border: "none", cursor: "pointer", padding: "4px", borderRadius: 8, transition: "transform 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Plans list */}
          {selectedPlans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 14 }}>
              📭 등록된 플랜이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedPlans.map(plan => {
                const pl = PLATFORMS.find(x => x.id === plan.platform);
                const done = !!plan.completed;
                return (
                  <div key={plan.id} style={{ background: cardBg, border: `1px solid ${bdr}`, borderRadius: 14, padding: 16, borderLeft: `4px solid ${pl?.color || accent}`, opacity: done ? 0.6 : 1, transition: "opacity 0.3s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      {/* Completion checkbox */}
                      <input type="checkbox" checked={done} onChange={() => toggleCompleted(plan.id)}
                        style={{ width: 20, height: 20, accentColor: accent, cursor: "pointer", flexShrink: 0 }} />
                      {pl?.icon ? <img src={pl.icon} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "contain" }} />
                        : <div style={{ width: 24, height: 24, borderRadius: 6, background: pl?.color || "#888", display: "flex", alignItems: "center", justifyContent: "center", color: pl?.id === "kakao" ? "#000" : "#fff", fontSize: 10, fontWeight: 800 }}>{pl?.label?.[0] || "?"}</div>}
                      <span style={{ fontSize: 12, fontWeight: 700, color: pl?.color || accent }}>{pl?.label}</span>
                      <span style={{ fontSize: 12, color: muted }}>{plan.time}</span>
                      {plan.repeat && plan.repeat !== "none" && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: isDark ? "rgba(124,106,255,0.15)" : "rgba(124,106,255,0.08)", color: accent, fontWeight: 700 }}>
                          {REPEAT_OPTIONS.find(r => r.id === plan.repeat)?.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: plan.memo ? 4 : 10, textDecoration: done ? "line-through" : "none", color: done ? muted : text }}>{plan.title}</div>
                    {plan.memo && <div style={{ fontSize: 12, color: muted, marginBottom: 10, lineHeight: 1.5 }}>{plan.memo}</div>}
                    <div className="sp-plan-btns" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => openGoogleCal(plan)} style={smallBtn("#4285F4")}>G캘린더</button>
                      <button onClick={() => openNaverCal(plan)} style={smallBtn("#03C75A")}>N캘린더</button>
                      <button onClick={() => downloadICS(plan)} style={smallBtn()}>.ics</button>
                      <button onClick={() => { setRescheduleId(rescheduleId === plan.id ? null : plan.id); setRescheduleDate(plan.date); }} style={smallBtn()}>📅 날짜 변경</button>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => openEdit(plan)} style={smallBtn()}>수정</button>
                      <button onClick={() => handleDelete(plan.id)} style={{ ...smallBtn(), color: "#ef4444" }}>삭제</button>
                    </div>
                    {/* Inline date picker for reschedule */}
                    {rescheduleId === plan.id && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "10px 12px", background: inputBg, borderRadius: 10, border: `1px solid ${bdr}` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: muted, whiteSpace: "nowrap" }}>새 날짜:</span>
                        <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={{ ...inputStyle, width: "auto", flex: 1 }} />
                        <button onClick={() => handleReschedule(plan.id, rescheduleDate)} style={smallBtn(accent)}>이동</button>
                        <button onClick={() => setRescheduleId(null)} style={smallBtn()}>취소</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tip */}
        <div style={{ textAlign: "center", padding: "8px 0", fontSize: 11, color: muted, lineHeight: 1.6 }}>
          💡 브라우저 알림을 허용하면 업로드 시간에 음성 알림을 받을 수 있어요
        </div>
      </div>

      {/* ── Modal: Plan Form ── */}
      {showForm && (
        <div className="sp-modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
          <div className="sp-modal-inner" style={{ background: isDark ? "#1a1a2e" : "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${bdr}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 20px" }}>{editingId ? "✏️ 플랜 수정" : "📝 새 플랜 만들기"}</h3>

            {/* Date & Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 4, display: "block" }}>날짜</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inputStyle} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 4, display: "block" }}>시간</label><input type="time" value={fTime} onChange={e => setFTime(e.target.value)} style={inputStyle} /></div>
            </div>

            {/* Platform */}
            <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, display: "block" }}>플랫폼</label>
            <div className="sp-platform-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6, marginBottom: 14 }}>
              {PLATFORMS.map(pl => (
                <button key={pl.id} onClick={() => setFPlatform(pl.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
                    borderRadius: 10, border: `2px solid ${fPlatform === pl.id ? pl.color : bdr}`,
                    background: fPlatform === pl.id ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(124,106,255,0.04)") : "transparent",
                    cursor: "pointer",
                  }}>
                  {pl.icon ? <img src={pl.icon} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: "contain" }} />
                    : <div style={{ width: 16, height: 16, borderRadius: 3, background: pl.color, display: "flex", alignItems: "center", justifyContent: "center", color: pl.id === "kakao" ? "#000" : "#fff", fontSize: 7, fontWeight: 800 }}>{pl.label[0]}</div>}
                  <span style={{ fontSize: 11, fontWeight: fPlatform === pl.id ? 700 : 500, color: fPlatform === pl.id ? text : muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.label}</span>
                </button>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 4, display: "block" }}>콘텐츠 제목</label>
            <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="예: 제품 리뷰 릴스 업로드" style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 4, display: "block" }}>메모 (선택)</label>
            <textarea value={fMemo} onChange={e => setFMemo(e.target.value)} placeholder="해시태그, 링크, 참고사항 등" rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, display: "block" }}>반복 설정</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {REPEAT_OPTIONS.map(r => (
                <button key={r.id} onClick={() => setFRepeat(r.id)} style={{ ...smallBtn(fRepeat === r.id ? accent : undefined), padding: "6px 14px", fontSize: 12 }}>{r.label}</button>
              ))}
            </div>
            {fRepeat !== "none" && !editingId && <p style={{ fontSize: 11, color: muted, margin: "-12px 0 16px" }}>향후 12회분이 자동 생성됩니다</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ ...btnStyle("transparent", text), flex: 1, border: `1px solid ${bdr}` }}>취소</button>
              <button onClick={handleSave} disabled={!fTitle.trim()} style={{ ...btnStyle(), flex: 1, opacity: fTitle.trim() ? 1 : 0.4 }}>{editingId ? "수정 완료" : "플랜 저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
